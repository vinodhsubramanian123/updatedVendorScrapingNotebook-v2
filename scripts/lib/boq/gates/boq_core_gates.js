'use strict';
/**
 * scripts/lib/boq/gates/boq_core_gates.js — Core BOQ Evaluation Gates (B1–B18)
 */

const { cleanBaseSKU, isSmartChoiceOrBtoSku, classifyCommercialFulfillmentMode } = require('../../catalog/sku.js');
const { candidateReviewCurrent } = require('../solution_evidence.js');
const { analyzeDeliveryPacing } = require('../delivery_pacing_analyzer.js');
const { getRegisteredAspectsForDomain } = require('../../aspects/aspect_registry.js');
const { isCtoServerItem } = require('../../aspects/support_manufacturing.js');
const { makeCheck } = require('./gate_check_builder.js');
const { _resolveProcessControlOverride } = require('./portal_receipt_gates.js');

const CANONICAL_ASPECT_MAP = {
  COMPUTE_THERMAL: ['COMPUTE_THERMAL', 'ASPECT_1', 'COMPUTE & THERMAL ASPECT', 'COMPUTE THERMAL', 'COMPUTE', 'THERMAL'],
  MEMORY_CHANNEL: ['MEMORY_CHANNEL', 'ASPECT_2', 'MEMORY CHANNEL & INTERLEAVING ASPECT', 'MEMORY CHANNEL', 'MEMORY'],
  STORAGE_TRI_MODE: ['STORAGE_TRI_MODE', 'ASPECT_3', 'STORAGE CONTROLLER & TRI-MODE ASPECT', 'DRIVE CAGE & STORAGE ENCLOSURE ASPECT', 'STORAGE TRI-MODE', 'STORAGE'],
  PCIE_RISER: ['PCIE_RISER', 'ASPECT_4', 'PCIE SLOT & RISER ASPECT', 'SXM / PCIE HIGH-POWER GPU BUS ASPECT', 'PCIE RISER', 'PCIE'],
  NETWORKING_OCP: ['NETWORKING_OCP', 'ASPECT_5', 'NETWORKING & OCP ADAPTER ASPECT', 'IB / ROCE HIGH-SPEED FABRIC ASPECT', 'INFINIBAND / ROCE HIGH-SPEED FABRIC ASPECT', 'NETWORKING OCP', 'NETWORKING'],
  POWER_ENVIRONMENT: ['POWER_ENVIRONMENT', 'ASPECT_6', 'POWER SUPPLY & ENVIRONMENTAL ASPECT', 'STORAGE ENCLOSURE POWER & ENVIRONMENTAL ASPECT', 'SWITCH REDUNDANT POWER & AIRFLOW ASPECT', 'HIGH-WATTAGE POWER ENVELOPE & BUSBAR ASPECT', 'POWER ENVIRONMENT', 'POWER'],
  SUPPORT_MANUFACTURING: ['SUPPORT_MANUFACTURING', 'ASPECT_7', 'VENDOR SUPPORT TAXONOMY & LICENSING', 'SUPPORT TAXONOMY', 'VENDOR SUPPORT', 'FACTORY INTEGRATION & MANUFACTURING ASPECT', 'FACTORY INTEGRATION & MANUFACTURING', 'SUPPORT MANUFACTURING', 'MANUFACTURING'],
  SUPPORT_SERVICES: ['SUPPORT_SERVICES', 'ASPECT_8', 'SUPPORT & DEPLOYMENT SERVICES ASPECT', 'POINTNEXT & STORAGE SUPPORT SERVICES ASPECT', 'NETWORK TECH CARE & SUPPORT SERVICES ASPECT', 'MISSION-CRITICAL AI CLUSTER SUPPORT SERVICES ASPECT', 'SUPPORT SERVICES', 'SERVICES'],
  STORAGE_CONTROLLER_PAIR: ['STORAGE_CONTROLLER_PAIR', 'STORAGE ARRAY ACTIVE-ACTIVE CONTROLLER PAIR', 'CONTROLLER_PAIR', 'CONTROLLER_NODE', 'STORAGE CONTROLLER PAIR'],
  SWITCH_FABRIC_PORTS: ['SWITCH_FABRIC_PORTS', 'SWITCH FABRIC & PORT PROTOCOL ALIGNMENT', 'FABRIC_PORTS', 'SWITCH_PORTS', 'SWITCH FABRIC'],
  SAN_LICENSED_PORTS: ['SAN_LICENSED_PORTS', 'SAN LICENSED PORT CAPACITY', 'SAN_PORTS'],
  BUNDLED_OPTICS_BILLING: ['BUNDLED_OPTICS_BILLING', 'BUNDLED OPTICS BILLING', 'BUNDLED_OPTICS'],
  CATALOG_SERVICE_COVERAGE: ['CATALOG_SERVICE_COVERAGE', 'CATALOG AND SERVICE COVERAGE'],
  SERVER_RULES_NOT_APPLICABLE: ['SERVER_RULES_NOT_APPLICABLE', 'SERVER COMPONENT RULES'],
  FRAME_FABRIC_MEZZANINE: ['FRAME_FABRIC_MEZZANINE', 'SYNERGY MEZZANINE & INTERCONNECT FABRIC ASPECT', 'MEZZANINE_FABRIC', 'FABRIC_MEZZANINE', 'MEZZANINE'],
  FRAME_SHARED_POWER: ['FRAME_SHARED_POWER', 'SYNERGY FRAME SHARED POWER & COOLING ASPECT', 'FRAME_POWER', 'SHARED_POWER'],
  ARCHIVE_COLD_STORAGE: ['ARCHIVE_COLD_STORAGE', 'TAPE LIBRARY & ARCHIVE DRIVE VALIDATION', 'COLD_STORAGE', 'TAPE_VALIDATION']
};

const ASPECT_NAME_MATCHERS = [
  [['MEZZANINE', 'FABRIC MEZZANINE'], 'FRAME_FABRIC_MEZZANINE'],
  [['FRAME SHARED POWER', 'SHARED POWER'], 'FRAME_SHARED_POWER'],
  [['COLD STORAGE', 'TAPE LIBRARY', 'ARCHIVE DRIVE'], 'ARCHIVE_COLD_STORAGE'],
  [['COMPUTE', 'THERMAL'], 'COMPUTE_THERMAL'],
  [['MEMORY', 'INTERLEAVING'], 'MEMORY_CHANNEL'],
  [['CONTROLLER PAIR', 'STORAGE CONTROLLER'], 'STORAGE_CONTROLLER_PAIR'],
  [['TRI-MODE', 'DRIVE CAGE', 'STORAGE'], 'STORAGE_TRI_MODE'],
  [['PCIE', 'RISER', 'BUS'], 'PCIE_RISER'],
  [['SWITCH', 'PORT PROTOCOL', 'FABRIC'], 'SWITCH_FABRIC_PORTS'],
  [['OCP', 'NETWORKING'], 'NETWORKING_OCP'],
  [['POWER', 'ENVIRONMENT', 'AIRFLOW', 'BUSBAR'], 'POWER_ENVIRONMENT'],
  [['MANUFACTURING', 'FACTORY', 'TAXONOMY', 'LICENSING'], 'SUPPORT_MANUFACTURING'],
  [['TECH CARE', 'POINTNEXT', 'SERVICES', 'DEPLOYMENT'], 'SUPPORT_SERVICES'],
  [['LICENSED PORT', 'SAN LICENSED'], 'SAN_LICENSED_PORTS'],
  [['BUNDLED OPTICS'], 'BUNDLED_OPTICS_BILLING'],
  [['CATALOG AND SERVICE', 'SERVICE COVERAGE'], 'CATALOG_SERVICE_COVERAGE'],
  [['SERVER COMPONENT RULES', 'FIXED SAN'], 'SERVER_RULES_NOT_APPLICABLE']
];

function _resolveCanonicalAspectId(check) {
  if (!check || typeof check !== 'object') return null;
  const rawId = String(check.id || check.code || '').trim().toUpperCase();
  const rawName = String(check.name || '').trim().toUpperCase();
  if (CANONICAL_ASPECT_MAP[rawId]) return rawId;
  if (rawName === 'SUPPORT') return 'SUPPORT_MANUFACTURING';
  for (const [keywords, aspectId] of ASPECT_NAME_MATCHERS) {
    if (keywords.some(k => rawName.includes(k))) return aspectId;
  }
  for (const [canonicalId, aliases] of Object.entries(CANONICAL_ASPECT_MAP)) {
    if (aliases.some(alias => rawId === alias || rawName === alias)) return canonicalId;
  }
  const strippedId = rawId.replace(/^(ASPECT_|SWITCH_|STORAGE_|SUPPORT_|FRAME_|ARCHIVE_)/, '');
  for (const [canonicalId, aliases] of Object.entries(CANONICAL_ASPECT_MAP)) {
    if (strippedId === canonicalId || aliases.includes(strippedId)) return canonicalId;
  }
  return rawId || rawName || null;
}

function _detectTargetDomain(output) {
  const rawDomain = String(output?.solutionTopology?.domain || output?.productType || output?.chassisInfo?.family || '').toLowerCase();
  const chassisName = String(output?.chassis || output?.targetChassis || output?.detectedChassis?.model || '').toLowerCase();

  const isExplicitSan = rawDomain === 'san' || rawDomain === 'san_switch';
  const isChassisSan = !rawDomain && (/sn3600b/i.test(chassisName) || /\b(?:brocade|fibre\s*channel\s*switch)\b/i.test(chassisName));
  if (isExplicitSan || isChassisSan) return 'san_switch';

  if (rawDomain === 'networking' || (!rawDomain && /switch|fabric/i.test(chassisName))) return 'networking';
  if (rawDomain === 'storage' || (!rawDomain && /alletra|nimble|storeonce/i.test(chassisName))) return 'storage';
  if (rawDomain === 'archive' || rawDomain === 'archive_tape' || (!rawDomain && /msl|storeever|tape/i.test(chassisName))) return 'archive';
  if (rawDomain === 'synergy_compute' || rawDomain === 'synergy' || (!rawDomain && /synergy|sy480|sy660/i.test(chassisName))) return 'synergy_compute';
  if (rawDomain === 'ai_cluster') return 'ai_cluster';
  return 'server';
}

function _resolveRequiredAspects(targetDomain, registeredPhysical) {
  const registeredAspects = getRegisteredAspectsForDomain(targetDomain);
  const requiredAspectIds = targetDomain === 'server' ? registeredPhysical : registeredAspects.map(a => a.id.toUpperCase());
  const minRequiredAspects = Math.min(
    requiredAspectIds.length,
    targetDomain === 'san_switch' ? 4 : (targetDomain === 'networking' || targetDomain === 'storage' ? 3 : (targetDomain === 'synergy_compute' ? 6 : (targetDomain === 'archive' ? 1 : 7)))
  );
  return { requiredAspectIds, minRequiredAspects, requiresFullServerAspects: targetDomain === 'server' };
}

function _evaluateAspectStatusBreakdown(aspectChecks) {
  const failedAspects = aspectChecks.filter(a => a.status === 'FAIL' || a.status === 'FAILED');
  const unknownAspects = aspectChecks.filter(a => a.status === 'UNKNOWN' || a.status === 'NOT_EVALUATED');
  const actionRequiredAspects = aspectChecks.filter(a => a.status === 'ACTION_REQUIRED' || (!['PASS', 'PASSED', 'NOT_APPLICABLE', 'SKIPPED'].includes(a.status) && !failedAspects.includes(a) && !unknownAspects.includes(a)));

  if (failedAspects.length > 0) {
    return makeCheck('B1', 'Scoped Physical Checks Completed', 'BLOCK', 'FAILED',
      `Physical checks failed on: ${failedAspects.map(a => a.name || a.id).join(', ')}.`,
      { failedAspects: failedAspects.map(a => a.id) });
  }
  if (unknownAspects.length > 0) {
    return makeCheck('B1', 'Scoped Physical Checks Completed', 'BLOCK', 'ACTION_REQUIRED',
      `Physical checks contain UNKNOWN evaluations per INV-105: ${unknownAspects.map(a => a.name || a.id).join(', ')}.`,
      { unknownAspects: unknownAspects.map(a => a.id) });
  }
  if (actionRequiredAspects.length > 0) {
    return makeCheck('B1', 'Scoped Physical Checks Completed', 'BLOCK', 'ACTION_REQUIRED',
      `Physical checks require action on: ${actionRequiredAspects.map(a => a.name || a.id).join(', ')}.`,
      { actionRequiredAspects: actionRequiredAspects.map(a => a.id) });
  }
  return null;
}

function _checkPhysicalAspects(output) {
  const aspectChecks = output?.aspectChecks || output?.evalSummary?.aspectChecks || output?.evaluation?.aspectChecks || null;
  if (!Array.isArray(aspectChecks) || aspectChecks.length === 0) {
    return makeCheck('B1', 'Scoped Physical Checks Completed', 'BLOCK', 'UNKNOWN', 'Physical aspect checks were not evaluated or missing from output.', { evaluated: false });
  }

  const registeredPhysical = ['COMPUTE_THERMAL', 'MEMORY_CHANNEL', 'STORAGE_TRI_MODE', 'PCIE_RISER', 'NETWORKING_OCP', 'POWER_ENVIRONMENT', 'SUPPORT_MANUFACTURING'];
  const targetDomain = _detectTargetDomain(output);
  const { requiredAspectIds, minRequiredAspects, requiresFullServerAspects } = _resolveRequiredAspects(targetDomain, registeredPhysical);

  const resolvedPresentIds = new Set();
  for (const a of aspectChecks) {
    const cId = _resolveCanonicalAspectId(a);
    if (cId) resolvedPresentIds.add(cId);
  }

  const missingDomainAspects = requiredAspectIds.filter(id => !resolvedPresentIds.has(id));
  if (aspectChecks.length < minRequiredAspects || resolvedPresentIds.size < minRequiredAspects || missingDomainAspects.length > 0) {
    const reason = missingDomainAspects.length > 0
      ? `Missing required ${targetDomain} domain aspect(s): ${missingDomainAspects.join(', ')} (${resolvedPresentIds.size} distinct identities verified).`
      : `Incomplete physical checks: expected at least ${minRequiredAspects} registered ${requiresFullServerAspects ? 'server physical' : targetDomain} aspects, found ${aspectChecks.length} checks (${resolvedPresentIds.size} distinct identities).`;
    return makeCheck('B1', 'Scoped Physical Checks Completed', 'BLOCK', 'FAILED',
      reason,
      { aspectCount: aspectChecks.length, uniqueCount: resolvedPresentIds.size, targetDomain, missingDomainAspects, requiredAspects: requiredAspectIds });
  }

  const statusError = _evaluateAspectStatusBreakdown(aspectChecks);
  if (statusError) return statusError;

  return makeCheck('B1', 'Scoped Physical Checks Completed', 'BLOCK', 'PASSED', `All ${aspectChecks.length} physical aspect checks evaluated cleanly.`);
}

function _checkRankedSolutions(output) {
  const checks = [];
  const rankedSolutions = output?.conflictGraph?.rankedSolutions || output?.rankedSolutions || [];
  const isUnbuildable = output?.isMathClean === false || output?.isWholeSolutionValid === false || output?.status === 'UNBUILDABLE';

  if (isUnbuildable) {
    checks.push(makeCheck('B2', 'At Least 1 Ranked Solution or Unbuildable Determination', 'BLOCK', 'PASSED', 'Explicit unbuildable determination documented per INV-72.', { isUnbuildable: true }));
  } else if (rankedSolutions.length >= 1) {
    checks.push(makeCheck('B2', 'At Least 1 Ranked Solution or Unbuildable Determination', 'BLOCK', 'PASSED', `Produced ${rankedSolutions.length} strategy rank(s).`, { rankCount: rankedSolutions.length }));
  } else {
    checks.push(makeCheck('B2', 'At Least 1 Ranked Solution or Unbuildable Determination', 'BLOCK', 'FAILED', 'No ranked solutions generated and no unbuildable determination recorded.', { rankedSolutionsCount: 0 }));
  }

  if (rankedSolutions.length === 0) {
    checks.push(makeCheck('B3', 'No Duplicate Ranks', 'WARN', 'NOT_APPLICABLE', 'No ranked solutions to check for rank tier uniqueness.'));
  } else {
    const rankNumbers = rankedSolutions.map(r => String(r.rank));
    const isUnique = new Set(rankNumbers).size === rankNumbers.length;
    checks.push(
      isUnique
        ? makeCheck('B3', 'No Duplicate Ranks', 'WARN', 'PASSED', 'All strategy rank tiers are unique.')
        : makeCheck('B3', 'No Duplicate Ranks', 'WARN', 'FAILED', `Duplicate rank tiers detected: ${rankNumbers.join(', ')}.`, { rankNumbers })
    );
  }
  return checks;
}

function _calculateTotalBOMPrice(rankedSolutions, output) {
  let totalPrice = 0;
  let partsCount = 0;
  if (rankedSolutions.length > 0) {
    const rank1 = rankedSolutions[0];
    const parts = rank1.skuPartsList || rank1.skuList || [];
    partsCount = parts.length;
    if (parts.length > 0) {
      totalPrice = parts.reduce((sum, p) => sum + (p.extendedPriceUsd || (p.quantity || 1) * (p.unitPriceUsd || 0)), 0);
    }
  } else if (Array.isArray(output?.items) && output.items.length > 0) {
    partsCount = output.items.length;
    totalPrice = output.items.reduce((sum, p) => sum + (p.extendedPriceUsd || (p.quantity || 1) * (p.unitPriceUsd || 0)), 0);
  }
  const partsToCheck = (rankedSolutions.length > 0 ? (rankedSolutions[0].skuPartsList || rankedSolutions[0].skuList || []) : output?.items) || [];
  return { totalPrice, partsCount, partsToCheck };
}

function _verifyFinancialTotalsCheck(isUnbuildable, totalPrice, partsCount) {
  if (isUnbuildable) return makeCheck('B4', 'Financial Table Present', 'BLOCK', 'NOT_APPLICABLE', 'Unbuildable BOM does not require financial totals.');
  if (totalPrice > 0) return makeCheck('B4', 'Financial Table Present', 'BLOCK', 'PASSED', `Financial totals calculated ($${totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}).`, { totalPrice });
  if (partsCount === 0) return makeCheck('B4', 'Financial Table Present', 'BLOCK', 'UNKNOWN', 'Pricing cannot be evaluated without candidate BOM items.', { partsCount: 0 });
  return makeCheck('B4', 'Financial Table Present', 'BLOCK', 'FAILED', 'Pricing table missing or zero extended cost on buildable solution.', { totalPrice, partsCount });
}

function _verifyUnresolvedPricesCheck(output, partsToCheck) {
  const zeroPriceParts = partsToCheck.filter(p => p && (!p.unitPriceUsd || p.unitPriceUsd === 0) && (!p.listPrice || p.listPrice === 0));
  if (zeroPriceParts.length > 0) {
    const isExplicitlyFlagged = Boolean(output?.hasUnresolvedPrices) && Array.isArray(output?.unresolvedPriceSkus) && output.unresolvedPriceSkus.length > 0;
    return isExplicitlyFlagged
      ? makeCheck('B6', 'Unresolved Prices Flagged (INV-33)', 'BLOCK', 'PASSED', `Unresolved prices present for ${zeroPriceParts.length} SKU(s) and explicitly tagged per INV-33.`, { unpricedCount: zeroPriceParts.length })
      : makeCheck('B6', 'Unresolved Prices Flagged (INV-33)', 'BLOCK', 'FAILED', `${zeroPriceParts.length} SKU(s) have zero/missing price without mandatory INV-33 incomplete pricing notice.`, { zeroPriceSkus: zeroPriceParts.map(p => p.sku || p['Product #']) });
  }
  return makeCheck('B6', 'Unresolved Prices Flagged (INV-33)', 'BLOCK', 'PASSED', 'All referenced SKU prices are confirmed with list pricing.');
}

function _checkFinancialPricing(output) {
  const rankedSolutions = output?.conflictGraph?.rankedSolutions || output?.rankedSolutions || [];
  const isUnbuildable = output?.isMathClean === false || output?.isWholeSolutionValid === false || output?.status === 'UNBUILDABLE';
  const { totalPrice, partsCount, partsToCheck } = _calculateTotalBOMPrice(rankedSolutions, output);
  return [_verifyFinancialTotalsCheck(isUnbuildable, totalPrice, partsCount), _verifyUnresolvedPricesCheck(output, partsToCheck)];
}

function _checkUnsolicitedServices(output, context = {}) {
  const rankedSolutions = output?.conflictGraph?.rankedSolutions || output?.rankedSolutions || [];
  if (rankedSolutions.length === 0) {
    return makeCheck('B8', 'No Unsolicited Services in Rank 1 (INV-32)', 'BLOCK', 'NOT_APPLICABLE', 'No ranked solutions to check for unsolicited services.');
  }
  const parts = rankedSolutions[0].skuPartsList || rankedSolutions[0].skuList || [];
  const requestedSkus = new Set(
    [...(context?.items || []), ...(output?.items || [])]
      .map(item => cleanBaseSKU(item?.sku || item?.['Product #']))
      .filter(Boolean)
  );
  const unsolicited = parts.filter(p => {
    const desc = (p.description || '').toLowerCase();
    const sku = cleanBaseSKU(p.sku);
    const shortSku = cleanBaseSKU(String(p.sku || '').split(/\s+/)[0]);
    const isService = /\b(installation|startup|deployment|pointnext|tech care)\b/i.test(desc) || /^(HA|HU|H7)/i.test(sku);
    const isOriginCustomerItem = Boolean(
      p.customerRequested ||
      (!p.isFixInjected && !p.isStrategyAddon && (requestedSkus.has(sku) || requestedSkus.has(shortSku)))
    );
    return isService && !isOriginCustomerItem && !context.customerRequestedServices;
  });
  return unsolicited.length === 0
    ? makeCheck('B8', 'No Unsolicited Services in Rank 1 (INV-32)', 'BLOCK', 'PASSED', 'Rank 1 maintains pure hardware intent without unrequested services.')
    : makeCheck('B8', 'No Unsolicited Services in Rank 1 (INV-32)', 'BLOCK', 'FAILED', `Rank 1 contains ${unsolicited.length} unsolicited service SKU(s) in violation of INV-32.`, { unsolicitedSkus: unsolicited.map(p => p.sku) });
}

function _checkMandatoryAccessories(output) {
  if (output?.missingDependencies === undefined && output?.conflictGraph === undefined) {
    return makeCheck('B12', 'Mandatory Accessories Injected', 'BLOCK', 'UNKNOWN', 'Conflict graph and dependency injection was not evaluated.', { evaluated: false });
  }
  const missingDeps = output?.missingDependencies || [];
  const resolvedFixes = output?.conflictGraph?.resolvedFixes || [];
  return missingDeps.length === 0
    ? makeCheck('B12', 'Mandatory Accessories Injected', 'BLOCK', 'PASSED', `Mandatory physical accessories injected cleanly: ${resolvedFixes.length} fix(es) recorded.`, { fixCount: resolvedFixes.length })
    : makeCheck('B12', 'Mandatory Accessories Injected', 'BLOCK', 'FAILED', `Unresolved mandatory physical dependencies: ${missingDeps.map(m => m.reason || m.sku).join('; ')}.`, { missingDeps });
}

function _isGroundingRejected(solutionDoubleCheck) {
  if (!solutionDoubleCheck) return false;
  return solutionDoubleCheck.doubleCheckVerdict === 'DOUBLE_CHECK_REJECTED' ||
    solutionDoubleCheck.verdict === 'DOUBLE_CHECK_REJECTED' ||
    solutionDoubleCheck.status === 'DOUBLE_CHECK_REJECTED' ||
    (Array.isArray(solutionDoubleCheck.rankVerdicts) && solutionDoubleCheck.rankVerdicts.some(row => row?.verdict === 'FAIL'));
}

function _isOfflineEvaluation(output, context) {
  return Boolean(
    output?.offlineMode || context?.offlineMode || context?.OFFLINE_MODE ||
    process.env.OFFLINE_MODE === '1' || process.env.LOCAL_EVAL_ONLY === '1'
  );
}

function _checkNotebookGrounding(output, context = {}) {
  const notebookHealth = output?.notebookHealth || context?.notebookHealth || null;
  const solutionDoubleCheck = output?.ephemeralSourceValidation || output?.solutionDoubleCheck || null;
  const agenticReview = output?.agenticReview || context?.agenticReview || null;
  const notebookLmStatus = output?.notebookLmStatus || null;
  const isOffline = _isOfflineEvaluation(output, context);

  if (notebookHealth && notebookHealth.isHealthy === false) {
    return makeCheck('B13', 'NotebookLM Grounding & Degraded State', 'BLOCK', 'ACTION_REQUIRED',
      `Product notebook is degraded (${output.notebookDegradedMode || notebookHealth.degradationMode || 'DEGRADED_UNGROUNDED'}). Presentation cannot claim fully grounded certification.`,
      { degradationMode: notebookHealth.degradationMode || output.notebookDegradedMode });
  }
  if (_isGroundingRejected(solutionDoubleCheck)) {
    return makeCheck('B13', 'NotebookLM Grounding & Degraded State', 'BLOCK', 'FAILED',
      'NotebookLM ephemeral source validation rejected candidate strategy ranks.',
      { verdict: solutionDoubleCheck.doubleCheckVerdict || solutionDoubleCheck.verdict || solutionDoubleCheck.status });
  }
  if (!isOffline && candidateReviewCurrent(output)) {
    return makeCheck('B13', 'NotebookLM Grounding & Degraded State', 'BLOCK', 'PASSED',
      'NotebookLM grounding verified with affirmative cloud candidate validation.',
      { citationsCount: solutionDoubleCheck?.citations?.length || 0, isCloudGrounded: Boolean(solutionDoubleCheck?.isCloudGrounded) });
  }
  if (isOffline) {
    return makeCheck('B13', 'NotebookLM Grounding & Degraded State', 'BLOCK', 'ACTION_REQUIRED',
      'Grounding unverified in OFFLINE_MODE. Presentation cannot claim cloud-grounded certification.', { offline: true });
  }
  if (!solutionDoubleCheck && !notebookHealth && !agenticReview && !notebookLmStatus) {
    return makeCheck('B13', 'NotebookLM Grounding & Degraded State', 'BLOCK', 'ACTION_REQUIRED',
      'Grounding evidence is absent. Presentation delivery requires a current candidate review with native authoritative citations.', { missingEvidence: true });
  }
  return makeCheck('B13', 'NotebookLM Grounding & Degraded State', 'BLOCK', 'ACTION_REQUIRED',
    'NotebookLM grounding lacked affirmative cloud verification; presentation cannot claim grounded certification.', { status: 'UNVERIFIED_GROUNDING' });
}

const QUALIFYING_COM_ONEVIEW_SKUS = new Set([
  'R7A11AAE', 'R7A12AAE', 'S2E10AAE', 'S5E59AAE', 'S5E60AAE', 'S5E61AAE',
  'E5Y43A', 'P8B31A', 'E5Y35AAE', 'P8B25A', 'E5Y36A', 'E5Y44A'
]);

function _countQualifyingComAndChassis(parts, output) {
  let hasQualifyingComOrOneView = false;
  let qualifyingComQty = 0;
  let chassisQty = 0;
  for (const p of (parts || [])) {
    const sku = cleanBaseSKU(p.sku || p['Product #']);
    const desc = (p.description || p.Description || '').toLowerCase();
    const qty = Number(p.quantity ?? p.qty ?? 1) || 1;
    const isMgmt = QUALIFYING_COM_ONEVIEW_SKUS.has(sku) || desc.includes('compute ops management') || (desc.includes('oneview') && !desc.includes('without oneview'));
    if (isMgmt) {
      hasQualifyingComOrOneView = true;
      qualifyingComQty += qty;
    }
    if (isCtoServerItem({ sku, description: p.description || p.Description || '', category: p.category || '' })) chassisQty += qty;
  }
  const declaredServers = Number(output?.serverCount || output?.nodeCount || 0);
  if (declaredServers > chassisQty) chassisQty = declaredServers;
  return { hasQualifyingComOrOneView, qualifyingComQty, chassisQty };
}

function _checkMandatoryComPolicy(output, _context = {}) {
  const chassis = String(output?.chassis || output?.targetChassis || output?.detectedChassis?.model || '').toLowerCase();
  if (!(/gen11|gen12/i.test(chassis) && /dl|ml/i.test(chassis))) {
    return makeCheck('B14', 'Mandatory COM / OneView Policy (Rule 81322276)', 'WARN', 'NOT_APPLICABLE', 'Not an NPI ProLiant Gen11/Gen12 CTO server; COM attach policy not mandated.');
  }
  const isUnbuildable = output?.isMathClean === false || output?.isWholeSolutionValid === false || output?.status === 'UNBUILDABLE';
  if (isUnbuildable) {
    return makeCheck('B14', 'Mandatory COM / OneView Policy (Rule 81322276)', 'WARN', 'NOT_APPLICABLE', 'Unbuildable BOM does not require policy compliance check.');
  }
  const rankedSolutions = output?.conflictGraph?.rankedSolutions || output?.rankedSolutions || [];
  const parts = rankedSolutions.length > 0 ? (rankedSolutions[0].skuPartsList || rankedSolutions[0].skuList || []) : (output?.items || []);
  if (parts.length === 0) {
    return makeCheck('B14', 'Mandatory COM / OneView Policy (Rule 81322276)', 'WARN', 'UNKNOWN', 'Cannot verify COM policy compliance without candidate BOM items.');
  }

  const { hasQualifyingComOrOneView, qualifyingComQty, chassisQty } = _countQualifyingComAndChassis(parts, output);
  const { smartFormExceptionId, processControlOverrideApproved: hasApprovedPcException } =
    _resolveProcessControlOverride(output?.liveClicValidation || _context?.liveClicValidation, output, _context, 1);

  if (hasQualifyingComOrOneView && !hasApprovedPcException && chassisQty > 1 && qualifyingComQty < chassisQty) {
    return makeCheck('B14', 'Mandatory COM / OneView Policy (Rule 81322276)', 'WARN', 'ACTION_REQUIRED',
      `ProLiant Gen11/Gen12 CTO configuration has under-provisioned COM/OneView licenses (${qualifyingComQty} license(s) for ${chassisQty} servers) per CLIC Rule 81322276 / INV-179.`,
      { ruleId: '81322276', targetChassis: chassis, qualifyingComQty, requiredServers: chassisQty });
  }
  if (hasQualifyingComOrOneView) {
    return makeCheck('B14', 'Mandatory COM / OneView Policy (Rule 81322276)', 'WARN', 'PASSED', 'Mandatory COM or OneView management software policy satisfied per CLIC Rule 81322276.');
  }
  if (hasApprovedPcException) {
    return makeCheck('B14', 'Mandatory COM / OneView Policy (Rule 81322276)', 'WARN', 'PASSED',
      `COM/OneView omission covered by approved CLIC SmartForm exception (${smartFormExceptionId}) for Process Control Rule 81322276.`,
      { ruleId: '81322276', targetChassis: chassis, smartFormExceptionId });
  }
  return makeCheck('B14', 'Mandatory COM / OneView Policy (Rule 81322276)', 'WARN', 'ACTION_REQUIRED',
    'ProLiant Gen11/Gen12 CTO configuration lacks mandatory HPE GreenLake for Compute Ops Management (COM) or OneView license (CLIC Rule 81322276). Add R7A11AAE (or approved replacement E5Y35AAE/E5Y43A) or submit an exception via https://solutionsdeliveryhpe.com/clicsmartform to avoid CLIC Process Control block.',
    { ruleId: '81322276', targetChassis: chassis });
}

function _checkDeliveryFeasibility(output, context = {}) {
  const rankedSolutions = output?.conflictGraph?.rankedSolutions || output?.rankedSolutions || [];
  const parts = rankedSolutions.length > 0 ? (rankedSolutions[0].skuPartsList || rankedSolutions[0].skuList || []) : (output?.items || []);
  if (!Array.isArray(parts) || parts.length === 0) {
    return makeCheck('B15', 'Pacing Item & Delivery Bottleneck Feasibility (INV-177 / INV-180)', 'WARN', 'NOT_APPLICABLE', 'No BOM parts available to assess delivery pacing.');
  }
  const catalogData = context.catalogData || output?.catalogData || output?.chassisInfo?.catalogData || null;
  const pacing = analyzeDeliveryPacing(parts, { catalogData });
  if (pacing.hasReleaseWaveGap) {
    return makeCheck('B15', 'Pacing Item & Delivery Bottleneck Feasibility (INV-177 / INV-180)', 'WARN', 'ACTION_REQUIRED',
      `Configuration mixes components across different General Availability waves (${pacing.releaseWaveGapDays}-day gap: ${pacing.earliestStartDate} vs ${pacing.latestStartDate}). Pacing items: ${pacing.wavePacingItems.map(w => w.sku).join(', ')}. Recommend partitioning into separate UCIDs to avoid factory assembly hold.`,
      { pacing });
  }
  if (pacing.leadTimeBottleneckItem && pacing.maxLeadTimeDays >= 21) {
    return makeCheck('B15', 'Pacing Item & Delivery Bottleneck Feasibility (INV-177 / INV-180)', 'WARN', 'ACTION_REQUIRED',
      `Configuration is paced by ${pacing.leadTimeBottleneckItem.sku} with a factory lead time of ${pacing.maxLeadTimeDays} days, governing the entire solution delivery envelope.`,
      { pacing });
  }
  return makeCheck('B15', 'Pacing Item & Delivery Bottleneck Feasibility (INV-177 / INV-180)', 'WARN', 'PASSED',
    `Delivery timeline feasible. No major release wave gaps or pacing item bottlenecks detected (max lead time: ${pacing.maxLeadTimeDays || 'standard'} days).`,
    { pacing });
}

function _collectUnmatchedSkus(output, context = {}) {
  const rawList = [];
  if (Array.isArray(output?.unmatchedSkus)) rawList.push(...output.unmatchedSkus);
  else if (output?.unmatchedSkus) rawList.push(output.unmatchedSkus);
  if (Array.isArray(context?.unmatchedSkus)) rawList.push(...context.unmatchedSkus);
  else if (context?.unmatchedSkus) rawList.push(context.unmatchedSkus);

  const seen = new Set();
  const normalized = [];
  for (const item of rawList) {
    if (!item) continue;
    const sku = typeof item === 'string' ? item.trim() : (item.rawSku || item.sku || '');
    const line = typeof item === 'object' && item.rawLine ? item.rawLine.trim() : '';
    const key = `${sku}:${line}`;
    if (key !== ':' && !seen.has(key)) {
      seen.add(key);
      normalized.push(typeof item === 'object' ? item : { rawSku: sku, reason: 'NO_CATALOG_MATCH' });
    }
  }
  return normalized;
}

function _checkUnmatchedSkus(output, context = {}) {
  const unmatched = _collectUnmatchedSkus(output, context);
  if (unmatched.length > 0) {
    const skuNames = unmatched.map(u => !u ? 'UNKNOWN_SKU' : (typeof u === 'string' ? u : (u.rawSku || u.sku || u.rawLine || JSON.stringify(u))));
    const smartChoiceNotes = skuNames.filter(s => isSmartChoiceOrBtoSku(s)).map(s => classifyCommercialFulfillmentMode(s).guidance);
    const smartChoiceSuffix = smartChoiceNotes.length > 0 ? ` ${smartChoiceNotes.join(' ')}` : '';
    return makeCheck('B16', 'Zero Unmatched Customer SKUs (FP-1)', 'BLOCK', 'FAILED',
      `Unmatched customer SKU(s) failed parsing/catalog validation: ${skuNames.join(', ')}. Delivery blocked per INV-105/FP-1.${smartChoiceSuffix}`,
      { unmatchedCount: unmatched.length, unmatchedSkus: unmatched, smartChoiceBtoDetected: smartChoiceNotes.length > 0 });
  }
  const hasIntakeEvidence = Array.isArray(output?.items) || Array.isArray(output?.rawItems) ||
    Array.isArray(context?.items) || Array.isArray(context?.rawItems) ||
    output?.unmatchedSkus !== undefined || context?.unmatchedSkus !== undefined;
  if (!hasIntakeEvidence) {
    return makeCheck('B16', 'Zero Unmatched Customer SKUs (FP-1)', 'BLOCK', 'ACTION_REQUIRED',
      'Intake SKU validation data missing from output and context; affirmative catalog coverage unverified.',
      { unmatchedCount: 0, intakeVerified: false });
  }
  return makeCheck('B16', 'Zero Unmatched Customer SKUs (FP-1)', 'BLOCK', 'PASSED', 'All customer SKU-like tokens affirmatively matched in catalog or cleanly resolved.', { unmatchedCount: 0 });
}

function _checkUnresolvedRequirements(output, context = {}) {
  const rawList = [];
  if (Array.isArray(output?.unresolvedRequirements)) rawList.push(...output.unresolvedRequirements);
  else if (output?.unresolvedRequirements) rawList.push(output.unresolvedRequirements);
  if (Array.isArray(context?.unresolvedRequirements)) rawList.push(...context.unresolvedRequirements);
  else if (context?.unresolvedRequirements) rawList.push(context.unresolvedRequirements);

  const seen = new Set();
  const unresolved = [];
  for (const item of rawList) {
    if (!item) continue;
    const text = typeof item === 'string' ? item.trim() : (item.line || item.requirement || item.description || JSON.stringify(item));
    if (text && !seen.has(text)) {
      seen.add(text);
      unresolved.push(item);
    }
  }
  if (unresolved.length > 0) {
    const formatted = unresolved.map(u => !u ? 'UNKNOWN_REQUIREMENT' : (typeof u === 'string' ? u : (u.line || u.requirement || u.description || JSON.stringify(u)))).join('; ');
    return makeCheck('B17', 'Zero Unresolved Customer Requirements', 'BLOCK', 'FAILED',
      `Customer tender contains ${unresolved.length} unresolved requirement(s) lacking physical SKU mapping: ${formatted}. Delivery blocked per INV-105/INV-194.`,
      { unresolvedCount: unresolved.length, unresolvedRequirements: unresolved });
  }
  return makeCheck('B17', 'Zero Unresolved Customer Requirements', 'BLOCK', 'PASSED', 'All customer descriptive requirements affirmatively resolved into validated hardware components or services.', { unresolvedCount: 0 });
}

function _checkQuantityConservation(output, context = {}) {
  const qc = output?.quantityConservation || context?.quantityConservation || null;
  if (!qc) {
    const isMultiNodeCluster = Number(output?.serverCount || 1) > 1 || Boolean(output?.isMultiCluster);
    if (isMultiNodeCluster) {
      return makeCheck('B18', 'Tender Quantity Conservation (INV-192)', 'BLOCK', 'FAILED',
        'Multi-node / cluster tender is missing mandatory quantity conservation ledger (INV-192).', { evaluated: false });
    }
    return makeCheck('B18', 'Tender Quantity Conservation (INV-192)', 'BLOCK', 'NOT_APPLICABLE',
      'Quantity conservation check not applicable to single-item or non-partitioned evaluations.', { evaluated: false });
  }
  if (qc.error) {
    return makeCheck('B18', 'Tender Quantity Conservation (INV-192)', 'BLOCK', 'FAILED',
      `Quantity conservation ledger error: ${qc.error}.`, { error: qc.error });
  }
  if (qc.isFullyConserved === false && (qc.deficitCount > 0 || qc.totalDiscrepancies > 0)) {
    if ((qc.deficitCount || 0) > 0 || (qc.unrequestedAdditionsCount || 0) > 0 || (qc.surplusCount || 0) > 0) {
      return makeCheck('B18', 'Tender Quantity Conservation (INV-192)', 'BLOCK', 'FAILED',
        `Tender quantity conservation failed: ${qc.totalDiscrepancies} discrepancy/discrepancies found (${qc.deficitCount || 0} deficit, ${qc.surplusCount || 0} surplus, ${qc.unrequestedAdditionsCount || 0} unrequested). Delivery blocked per INV-192.`,
        { quantityConservation: qc });
    }
  }
  return makeCheck('B18', 'Tender Quantity Conservation (INV-192)', 'BLOCK', 'PASSED',
    `All ${qc.summary?.totalRequestedUnits || 0} requested tender units mathematically conserved (${qc.exactConservedCount || 0} conserved exact, ${qc.policyAdditionsCount || 0} approved policy additions).`,
    { quantityConservation: qc });
}

module.exports = {
  _checkPhysicalAspects,
  _checkRankedSolutions,
  _checkFinancialPricing,
  _checkUnsolicitedServices,
  _checkMandatoryAccessories,
  _checkNotebookGrounding,
  _checkMandatoryComPolicy,
  _checkDeliveryFeasibility,
  _checkUnmatchedSkus,
  _checkUnresolvedRequirements,
  _checkQuantityConservation
};
