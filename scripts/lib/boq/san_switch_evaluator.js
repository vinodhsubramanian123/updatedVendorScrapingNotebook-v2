'use strict';

const path = require('path');
const fs = require('fs');
const { cleanBaseSKU } = require('../catalog/sku');
const { evaluateBundleComposition } = require('./bundle_composition');
const { readPortalReceipt, receiptMatches, normalizeSku } = require('./portal_receipt');

// Selected BOM rows prove the service parent/suffix association, not ordering
// availability or acceptance of this customer's proposed configuration.
function selectedServiceEvidence(targetDir, baseSku) {
  const normalize = sku => String(sku || '').trim().replace(/\s+/g, '#').toUpperCase();
  const selected = new Set();
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(targetDir, 'raw_data', 'oca_raw_data_full.json'), 'utf8'));
    for (const table of raw.tables || []) {
      const header = table.rows?.[0] || [];
      const pn = header.indexOf('Product #');
      if (!header.includes('Hierarchy') || pn < 0 || !table.rows.some(row => row[pn] === baseSku)) continue;
      for (const row of table.rows.slice(1)) if (/^H[A-Z0-9]+(?:\s+[A-Z0-9]+)?$/.test(row[pn] || '')) selected.add(normalize(row[pn]));
    }
  } catch (_) { /* Missing capture remains unresolved. */ }
  return { selected, normalize };
}

/** Fixed SAN appliances do not have customer-populated server CPU, DIMM,
 * drive-cage or PCIe dependencies. Preserve missing evidence as unresolved. */
function evaluateSanSwitch(items, catalogData, targetDir, chassisInfo, rules, options = {}) {
  const productId = chassisInfo.productId || path.basename(targetDir);
  const receipt = readPortalReceipt(targetDir);
  const bundles = evaluateBundleComposition(items, rules, productId);
  const errors = [];
  const warnings = bundles.flatMap(bundle => bundle.warnings);
  if (!bundles.length) warnings.push('SAN composition evidence is unavailable; port and bundle checks remain unverified.');
  for (const bundle of bundles) {
    if (bundle.activePorts > bundle.physicalPorts) errors.push(`Licensed ports ${bundle.activePorts} exceed physical capacity ${bundle.physicalPorts}.`);
  }
  const index = new Map((catalogData?.entries || []).flatMap(entry => (entry.skus || []).map(sku => [cleanBaseSKU(sku.sku || sku['Product #']), sku])));
  const services = selectedServiceEvidence(targetDir, chassisInfo.baseSku || bundles[0]?.baseSku);
  const unknownSkus = items.filter(item => !index.has(cleanBaseSKU(item.sku)) && !services.selected.has(services.normalize(item.sku)) && !receipt?.rows.some(row => row.sku === normalizeSku(item.sku))).map(item => item.sku);
  if (unknownSkus.length) warnings.push(`Exact catalog/service qualification remains pending for: ${unknownSkus.join(', ')}. Service base codes and product-specific suffixes must remain linked.`);
  const bundle = bundles[0];
  const aspectChecks = [
    { id: 1, name: 'SAN Licensed Port Capacity', status: !bundle ? 'UNVERIFIED' : errors.length ? 'FAIL' : 'PASS', detail: bundle ? `${bundle.activePorts} licensed ports / ${bundle.physicalPorts} physical ports.` : 'No verified composition rule.' },
    { id: 2, name: 'Bundled Optics Billing', status: !bundle ? 'UNVERIFIED' : bundle.excessOptics ? 'WARN' : 'PASS', detail: bundle ? `${bundle.bundledOptics} included optics + ${bundle.separatelyOrderedOptics} separately ordered optics; ${bundle.excessOptics} beyond switch port demand. Spares and remote endpoints require separate allocation.` : 'No verified bundle evidence.' },
    { id: 3, name: 'Catalog and Service Coverage', status: unknownSkus.length ? 'UNVERIFIED' : 'PASS', detail: unknownSkus.length ? unknownSkus.join(', ') : 'Hardware in scoped catalog; service parent/suffix associations observed in selected OCA BOM. Exact proposed service acceptance remains pending.' },
    { id: 4, name: 'Server Component Rules', status: 'NOT_APPLICABLE', detail: 'Fixed SAN switch: no server CPU, DIMM, diskless kit, PCIe riser or redundant server PSU additions.' }
  ];
  const excluded = new Set();
  if (bundle) {
    aspectChecks[0].formula = 'activePorts <= physicalPorts';
    aspectChecks[0].operands = { activePorts: bundle.activePorts, physicalPorts: bundle.physicalPorts };
    aspectChecks[1].formula = 'max(0, bundledOptics + separatelyOrderedOptics - min(activePorts, physicalPorts)) = excessOptics';
    aspectChecks[1].operands = { bundledOptics: bundle.bundledOptics, separatelyOrderedOptics: bundle.separatelyOrderedOptics, activePorts: bundle.activePorts, physicalPorts: bundle.physicalPorts, excessOptics: bundle.excessOptics };
  }
  for (const b of bundles) {
    if (b.bundledOptics >= b.activePorts && b.activePorts <= b.physicalPorts) {
      for (const item of b.standalone) if (item.switchPortAllocation && !item.spare && !item.remote) excluded.add(item.sku);
    }
  }
  const retained = items.filter(item => !excluded.has(cleanBaseSKU(item.sku)));
  const portalAccepted = receiptMatches(receipt, retained);
  if (portalAccepted) aspectChecks[2].detail = 'Scoped hardware and product-qualified services verified; corrected candidate matches the complete live CLIC receipt.';
  const parts = retained.map(item => {
    const record = index.get(cleanBaseSKU(item.sku));
    const acceptedRow = portalAccepted ? receipt.rows.find(row => row.sku === normalizeSku(item.sku)) : null;
    const price = acceptedRow ? acceptedRow.unitPriceUsd : Number(record?.listPrice || record?.['Unit Price (USD)']);
    const resolved = Number.isFinite(price) && (price > 0 || Boolean(acceptedRow));
    return { ...item, inputUnitPriceUsd: item.inputUnitPriceUsd ?? item.unitPriceUsd ?? null,
      unitPriceUsd: resolved ? price : null, extendedPriceUsd: resolved ? price * item.quantity : null,
      isConfirmedZeroPrice: Boolean(acceptedRow) && price === 0,
      portalStatus: portalAccepted ? 'CLIC_ACCEPTED_EXACT_MANIFEST' : 'PORTAL VALIDATION PENDING',
      priceStatus: resolved ? 'OCA_CAPTURED' : 'UNRESOLVED', priceSource: acceptedRow ? `Live OCA BOM ${receipt.capturedAt}` : resolved ? 'Scoped OCA catalog' : 'OCA price unavailable or zero; not assumed free' };
  });
  const unresolved = parts.filter(item => item.priceStatus === 'UNRESOLVED').map(item => item.sku);
  const subtotal = parts.reduce((sum, item) => sum + (item.extendedPriceUsd || 0), 0);
  const candidate = {
    rank: 1, name: 'SAN bundle reconciliation', tierTitle: 'SAN bundle reconciliation',
    skuPartsList: parts, estimatedCostUsd: unresolved.length ? null : subtotal,
    pricingComplete: unresolved.length === 0, unresolvedPriceSkus: unresolved,
    priceUnavailableSkus: unresolved,
    knownPriceSubtotalUsd: subtotal, changesCount: excluded.size,
    removedSkus: [...excluded], physicalMathClean: Boolean(bundle) && errors.length === 0,
    isMathClean: Boolean(bundle) && errors.length === 0,
    reasoning: excluded.size ? 'Remove standalone optics only where allocated to ports already supplied by base/upgrade bundles. Retain documented spares and remote-endpoint optics. Preserve the requested 24-port expansion.' : 'Preserve requested switch topology; no server-style upgrades apply.',
    advisoryStatus: portalAccepted ? 'CLIC_ACCEPTED' : 'PORTAL_VALIDATION_PENDING', portalValidationStatus: portalAccepted ? 'CLIC_ACCEPTED' : 'PENDING',
    portalReceipt: portalAccepted ? receipt : null,
    budgetBreakdown: { totalBudgetUsd: unresolved.length ? null : subtotal, unresolvedPriceSkus: unresolved },
    aspectErrors: errors, injectedCascadingFixes: [], score: 0.74
  };
  return {
    items,
    supportPolicy: require('./support_policy').resolveSupportPolicy(items),
    productType: 'SAN', isMathClean: Boolean(bundle) && errors.length === 0,
    portalValidationStatus: portalAccepted ? 'CORRECTED_CANDIDATE_CLIC_ACCEPTED' : 'PENDING',
    isGraphClean: portalAccepted, criticalViolationsCount: errors.length, errors, warnings,
    missingDependencies: [], mathDeductions: [], aspectChecks, bundleComposition: bundles,
    evalSummary: { bundleComposition: bundles, errors, warnings, missingDependencies: [], aspectChecks },
    confidence: { score: 0.74, isHitlTriggered: !portalAccepted, confidenceReasons: [...errors, ...warnings, portalAccepted ? 'Exact corrected manifest accepted by captured live CLIC; model confidence is not a certification score.' : 'Live vendor acceptance and complete pricing remain pending.'] },
    conflictGraph: { chassisInfo, rulesSource: 'VERIFIED_PRODUCT_COMPOSITION', isFallbackSource: false,
      totalRulesEvaluated: bundles.length, isWholeSolutionValid: portalAccepted && !errors.length, conflicts: [],
      resolvedFixes: [], unresolvedConflicts: [], rankedSolutions: options.skipSynthesis ? [] : [candidate] }
  };
}

module.exports = { evaluateSanSwitch };
