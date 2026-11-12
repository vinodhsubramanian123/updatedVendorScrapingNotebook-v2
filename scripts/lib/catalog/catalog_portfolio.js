'use strict';

const fs = require('fs');
const path = require('path');
const { calculateFileSha256, discoverAllProductCatalogs } = require('./product_metadata_manager.js');
const { auditCatalogFreshness } = require('./catalog_freshness_guard.js');

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

function inspectCapture(product, artifact, { baseSku, parentBaseSku, verifyHashes }) {
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
    const sameCapture = Number.isFinite(Date.parse(dates.capturedAt)) &&
      Date.parse(receipt.capturedAt) === Date.parse(dates.capturedAt);
    const exactScope = receipt.product === product && Boolean(receipt.provenance?.ownerConfiguration) &&
      (!baseSku || receipt.provenance?.baseSku === baseSku) &&
      (!parentBaseSku || receipt.provenance?.parentBaseSku === parentBaseSku);
    const sameArtifacts = !verifyHashes || receiptMatchesArtifacts(receipt, artifact, product);
    const verified = sameCapture && exactScope && sameArtifacts && receipt.status === 'LOCAL_PROMOTED' &&
      receipt.coverage?.policy?.valid === true;
    return { ...dates, captureStatus: verified ? 'VERIFIED' : 'RECEIPT_MISMATCH',
      artifactHashes: verified ? receipt.hashes : null };
  } catch {
    return { ...dates, captureStatus: 'RECEIPT_UNREADABLE' };
  }
}

function summarizeProduct(product, registration, profile, expectedScope, matches, { parentBaseSku, verifyHashes }) {
  const baseSku = registration?.baseSku || profile?.baseSku || expectedScope?.baseSku || null;
  const { artifactHashes, ...capture } = inspectCapture(product, matches[0], { baseSku, parentBaseSku, verifyHashes });
  const coverageIssues = [
    !registration && 'PRODUCT_UNREGISTERED',
    matches.length > 1 && 'DUPLICATE_CATALOGS',
    capture.captureStatus !== 'VERIFIED' && capture.captureStatus
  ].filter(Boolean);
  return {
    product,
    name: profile?.product || expectedScope?.name || product.replace(/_/g, ' '),
    family: registration?.family || profile?.family || expectedScope?.family || null,
    generation: registration?.gen || registration?.generation || profile?.generation || expectedScope?.generation || null,
    baseSku,
    parentProductId: registration?.parentProductId || expectedScope?.parentProductId || null,
    hasCatalog: matches.length > 0,
    ...capture,
    coverageIssues,
    publishedAt: registration?.lastSyncedAt || null,
    publishedCaptureMatches: artifactHashes && registration?.lastArtifactHashes
      ? captureArtifacts.every(suffix => artifactHashes[suffix] === registration.lastArtifactHashes[suffix]) : null,
    cloudSyncStatus: registration?.cloudSyncState || 'UNSYNCED'
  };
}

function getOwnedCatalogScopes(chassisGroups) {
  const scopes = new Map();
  for (const group of Object.values(chassisGroups || {})) {
    for (const child of group.ownedCatalogs || []) {
      scopes.set(child.productId, { ...child, family: group.family, generation: group.gen, parentProductId: group.catalogProductId });
    }
  }
  return scopes;
}

function getCatalogPortfolioCoverage({
  notebooks = readJson(path.join(configDir, 'notebooks.json')).notebooks,
  profiles = readJson(path.join(configDir, 'catalog_coverage_profiles.json')).profiles,
  chassisGroups = readJson(path.join(configDir, 'chassis_map.json')).chassis_base_skus_by_family_gen,
  artifacts = discoverAllProductCatalogs(), verifyHashes = true
} = {}) {
  const owned = getOwnedCatalogScopes(chassisGroups);
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
    const parentBaseSku = registration?.captureViaParent ? notebooks[registration.parentProductId]?.baseSku : null;
    const summary = summarizeProduct(product, registration, profiles[product], owned.get(product), byProduct.get(product) || [], { parentBaseSku, verifyHashes });
    if (summary.parentProductId && !notebooks[summary.parentProductId]) {
      summary.coverageIssues.push('PARENT_UNREGISTERED');
    }
    return summary;
  });
}

module.exports = { getCatalogPortfolioCoverage };
