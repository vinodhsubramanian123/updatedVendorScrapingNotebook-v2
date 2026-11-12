'use strict';

const fs = require('fs');
const path = require('path');
const { calculateFileSha256, discoverAllProductCatalogs } = require('./product_metadata_manager.js');
const { auditCatalogFreshness } = require('./catalog_freshness_guard.js');
const { resolveOwnedCatalogPath, matchesOwnedCatalogPath, collectDeclaredCatalogScopes } = require('./catalog_hierarchy');

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const configDir = path.resolve(__dirname, '../../config');
const captureArtifacts = ['Catalog.json', 'Services.json', 'Catalog_Rules.json', 'OCA_Catalog.xlsx'];

function receiptMatchesArtifacts(receipt, artifact, product) {
  return captureArtifacts.every(suffix => {
    const expected = receipt.hashes?.[suffix];
    return Boolean(expected) && expected === calculateFileSha256(path.join(artifact.outputDir, `${product}_${suffix}`));
  }) && Boolean(receipt.rawSha256) &&
    receipt.rawSha256 === calculateFileSha256(path.join(artifact.outputDir, 'raw_data', 'oca_raw_data_full.json'));
}

function inspectCapture(product, artifact, { baseSku, scopePath, verifyHashes }) {
  if (!artifact) return { captureStatus: 'CATALOG_MISSING', capturedAt: null, freshnessStatus: 'UNKNOWN' };
  let catalog;
  try { catalog = readJson(artifact.catalogPath); }
  catch { return { captureStatus: 'CATALOG_UNREADABLE', capturedAt: null, freshnessStatus: 'UNKNOWN' }; }

  const freshness = auditCatalogFreshness(catalog, { staleWarningDays: 3, criticalOutdatedDays: 30 });
  const dates = { capturedAt: freshness.normalizedMetadata.scrapeTimestamp, freshnessStatus: freshness.freshnessStatus };
  const receiptPath = path.join(artifact.outputDir, 'capture_receipt.json');
  if (!fs.existsSync(receiptPath)) return { ...dates, captureStatus: 'RECEIPT_MISSING' };

  try {
    const receipt = readJson(receiptPath);
    const provenance = receipt.provenance || {};
    const parentBaseSku = scopePath?.at(-2)?.baseSku;
    const validPath = !scopePath || (provenance.scopePath
      ? matchesOwnedCatalogPath(scopePath, provenance.scopePath) && provenance.scopePath.at(-1).ownerConfiguration === provenance.ownerConfiguration &&
        provenance.scopePath.at(-2).ownerConfiguration === provenance.parentConfiguration : scopePath.length === 2);
    const sameCapture = Number.isFinite(Date.parse(dates.capturedAt)) &&
      Date.parse(receipt.capturedAt) === Date.parse(dates.capturedAt);
    const exactScope = receipt.product === product && Boolean(provenance.ownerConfiguration) && validPath &&
      (!baseSku || provenance.baseSku === baseSku) && (!parentBaseSku || provenance.parentBaseSku === parentBaseSku);
    const sameArtifacts = !verifyHashes || receiptMatchesArtifacts(receipt, artifact, product);
    const verified = sameCapture && exactScope && sameArtifacts && receipt.status === 'LOCAL_PROMOTED' &&
      receipt.coverage?.policy?.valid === true;
    return { ...dates, captureStatus: verified ? 'VERIFIED' : 'RECEIPT_MISMATCH',
      artifactHashes: verified ? receipt.hashes : null, ownedMenuDiscovery: verified ? receipt.coverage?.ownedMenuDiscovery : null };
  } catch {
    return { ...dates, captureStatus: 'RECEIPT_UNREADABLE' };
  }
}

function catalogCoverageIssues(registration, expectedScope, matches, captureStatus) {
  return [
    !registration && 'PRODUCT_UNREGISTERED',
    matches.length > 1 && 'DUPLICATE_CATALOGS',
    captureStatus !== 'VERIFIED' && captureStatus,
    expectedScope?.declarationIssue,
    registration && expectedScope && (registration.parentProductId !== expectedScope.parentProductId || registration.baseSku !== expectedScope.baseSku) && 'OWNED_SCOPE_REGISTRY_MISMATCH'
  ].filter(Boolean);
}

function summarizeProduct(product, registration, profile, expectedScope, matches, { scopePath, verifyHashes }) {
  const baseSku = registration?.baseSku || profile?.baseSku || expectedScope?.baseSku || null;
  const { artifactHashes, ...capture } = inspectCapture(product, matches[0], { baseSku, scopePath, verifyHashes });
  return {
    product,
    name: profile?.product || expectedScope?.name || product.replace(/_/g, ' '),
    family: registration?.family || profile?.family || expectedScope?.family || null,
    generation: registration?.gen || registration?.generation || profile?.generation || expectedScope?.generation || null,
    baseSku,
    parentProductId: registration?.parentProductId || expectedScope?.parentProductId || null,
    ownershipPath: scopePath?.map(({ productId, baseSku }) => ({ productId, baseSku })) || null,
    hasCatalog: matches.length > 0,
    ...capture,
    coverageIssues: catalogCoverageIssues(registration, expectedScope, matches, capture.captureStatus),
    publishedAt: registration?.lastSyncedAt || null,
    publishedCaptureMatches: artifactHashes && registration?.lastArtifactHashes
      ? captureArtifacts.every(suffix => artifactHashes[suffix] === registration.lastArtifactHashes[suffix]) : null,
    cloudSyncStatus: registration?.cloudSyncState || 'UNSYNCED'
  };
}

function getCatalogPortfolioCoverage({
  notebooks = readJson(path.join(configDir, 'notebooks.json')).notebooks,
  profiles = readJson(path.join(configDir, 'catalog_coverage_profiles.json')).profiles,
  chassisGroups = readJson(path.join(configDir, 'chassis_map.json')).chassis_base_skus_by_family_gen,
  artifacts = discoverAllProductCatalogs(), verifyHashes = true
} = {}) {
  const owned = collectDeclaredCatalogScopes(chassisGroups);
  const expected = new Set([...Object.keys(notebooks), ...Object.keys(profiles), ...owned.keys()]);
  for (const group of Object.values(chassisGroups || {})) {
    if (group.catalogProductId) expected.add(group.catalogProductId);
  }
  for (const definition of Object.values(notebooks)) {
    if (definition.parentProductId) expected.add(definition.parentProductId);
  }

  const byProduct = new Map();
  for (const artifact of artifacts) {
    const product = path.basename(artifact.catalogPath, '_Catalog.json');
    const siblings = byProduct.get(product) || [];
    siblings.push(artifact);
    byProduct.set(product, siblings);
  }

  return [...new Set([...expected, ...byProduct.keys()])].map(product => {
    const registration = notebooks[product];
    let scopePath = null;
    let ownershipIssue = null;
    try { if (registration?.captureViaParent) scopePath = resolveOwnedCatalogPath(product, notebooks); }
    catch (error) { ownershipIssue = error.message; }
    const summary = summarizeProduct(product, registration, profiles[product], owned.get(product), byProduct.get(product) || [], { scopePath, verifyHashes });
    if (ownershipIssue) summary.coverageIssues.push(ownershipIssue);
    if (summary.parentProductId && !notebooks[summary.parentProductId]) {
      summary.coverageIssues.push('PARENT_UNREGISTERED');
    }
    const hasOwnedScopes = Object.values(notebooks).some(entry => entry?.parentProductId === product && entry.captureViaParent);
    if (hasOwnedScopes && summary.ownedMenuDiscovery && summary.ownedMenuDiscovery.status !== 'OBSERVED_CONFIGURED_CHILD_MENUS') {
      summary.coverageIssues.push(`OWNED_MENU_INVENTORY_UNVERIFIED: ${summary.ownedMenuDiscovery.status}`);
    }
    for (const baseSku of new Set((summary.ownedMenuDiscovery?.children || []).map(child => child.baseSku))) {
      const mappings = Object.values(notebooks).filter(entry => entry?.parentProductId === product && entry.baseSku === baseSku);
      if (!baseSku) summary.coverageIssues.push('OBSERVED_MENU_WITHOUT_BASE_SKU');
      else if (mappings.length !== 1) summary.coverageIssues.push(`${mappings.length ? 'AMBIGUOUS' : 'UNREGISTERED'}_OBSERVED_OWNED_SKU: ${baseSku}`);
    }
    return summary;
  });
}

module.exports = { getCatalogPortfolioCoverage };
