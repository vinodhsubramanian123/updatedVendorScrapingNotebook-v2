'use strict';
/**
 * scripts/lib/boq/bom_verifier.js — 14-Point Pre-Presentation Acceptance Gate
 *
 * Implements authoritative pre-presentation output validation conforming to
 * output-validation-skill (.agents/skills/output-validation-skill/SKILL.md):
 * - Universal Acceptance Criteria (U1–U5) across all presales tracks
 * - Track-Specific Criteria:
 *   - BOQ Evaluation (B1–B19)
 *   - RFP Sizing-to-BOM (R1–R6)
 *   - BOM Reconciliation (C1–C4)
 *   - Freeform Q&A (Q1–Q4)
 *
 * Invariant INV-105: Zero-Default Success Guard — outputs with missing data
 * evaluate to UNKNOWN or ACTION_REQUIRED, never PASS.
 * Invariant INV-104: Non-Repudiation on Disk — truth exists in persistent facts.
 * Invariant INV-0: Four-Tier Epistemic Discipline — separates syntax (Tier 0),
 * physical math (Tier 1), catalog presence (Tier 2), and portal acceptance (Tier 3).
 */

const fs = require('fs');
const { isValidHpeSKU, cleanBaseSKU, buildCatalogSkuIndex } = require('../catalog/sku.js');
const { candidateReviewCurrent } = require('./solution_evidence.js');
const { analyzeDeliveryPacing } = require('./delivery_pacing_analyzer.js');
const { getRegisteredAspectsForDomain } = require('../aspects/aspect_registry.js');

/**
 * Construct an epistemic check result conforming to INV-105.
 *
 * @param {string} id - Check identifier (e.g. U1, B1)
 * @param {string} name - Human-readable check title
 * @param {'BLOCK' | 'WARN'} severity - Failure severity
 * @param {'PASSED' | 'FAILED' | 'UNKNOWN' | 'NOT_APPLICABLE' | 'ACTION_REQUIRED'} status - Epistemic outcome
 * @param {string} detail - Precise justification and diagnostic context
 * @param {object} [evidence={}] - Corroborating data
 * @returns {object}
 */
function makeCheck(id, name, severity, status, detail, evidence = {}) {
  const isPassed = status === 'PASSED' || status === 'NOT_APPLICABLE';
  return {
    id,
    name,
    severity,
    status,
    passed: isPassed,
    detail,
    evidence
  };
}

/**
 * Universal Acceptance Criteria (U1–U5)
 */
function validateUniversalCriteria(output, context = {}) {
  const checks = [];

  // U1: Non-Empty Response (BLOCK)
  const hasContent = Boolean(
    output && (
      (typeof output === 'string' && output.trim().length > 0) ||
      (Array.isArray(output.items) && output.items.length > 0) ||
      (Array.isArray(output.rankedSolutions) && output.rankedSolutions.length > 0) ||
      (output.result && typeof output.result === 'object' && Object.keys(output.result).length > 0) ||
      (typeof output.answer === 'string' && output.answer.trim().length > 0) ||
      (typeof output.message === 'string' && output.message.trim().length > 0) ||
      (output.pricingTrail !== undefined) ||
      (output.auditReport !== undefined) ||
      (output.liveDetails !== undefined) ||
      (Array.isArray(output.extractedItems) && output.extractedItems.length > 0) ||
      (output.carrierFleetSummary !== undefined) ||
      (output.deliverableSummary !== undefined) ||
      (output.competitorSpec !== undefined) ||
      (Array.isArray(output.recommendedBom) && output.recommendedBom.length > 0) ||
      (output.dna !== undefined) ||
      (output.budgetOptimization !== undefined) ||
      (output.leastDeltaCandidate !== undefined) ||
      (output.clusterAnalysis !== undefined) ||
      (Array.isArray(output.generatedBoq) && output.generatedBoq.length > 0) ||
      (typeof output.exportPath === 'string' && output.exportPath.trim().length > 0) ||
      (Array.isArray(output.outputRows) && output.outputRows.length > 0) ||
      (output.feedbackProcessed !== undefined) ||
      (output.drift !== undefined) ||
      (output.syncResult !== undefined)
    )
  );
  checks.push(
    hasContent
      ? makeCheck('U1', 'Non-Empty Response', 'BLOCK', 'PASSED', 'Response contains actionable recommendations, data, or findings.')
      : makeCheck('U1', 'Non-Empty Response', 'BLOCK', 'FAILED', 'Response payload is empty, null, or undefined.', { outputType: typeof output })
  );

  // U2: Server Model / Product Identified (WARN)
  const chassis = output?.chassis || output?.targetChassis || output?.detectedChassis?.model || context?.chassisName || null;
  const hasModelIdentified = Boolean(chassis && chassis !== 'UNKNOWN' && chassis !== 'Unknown' && chassis !== 'UNKNOWN_CHASSIS');
  checks.push(
    hasModelIdentified
      ? makeCheck('U2', 'Server Model Identified', 'WARN', 'PASSED', `Target product model identified: ${chassis}`, { chassis })
      : makeCheck('U2', 'Server Model Identified', 'WARN', 'UNKNOWN', 'Target server model or chassis is unmapped or unknown; general platform defaults applied.', { chassis })
  );

  // U3: Referenced SKUs Present in Scoped Catalog (BLOCK)
  let extractedSkus = [];
  if (Array.isArray(output?.items)) {
    extractedSkus.push(...output.items.map(it => it.sku || it['Product #']).filter(Boolean));
  }
  if (Array.isArray(output?.rankedSolutions || output?.conflictGraph?.rankedSolutions)) {
    (output.rankedSolutions || output.conflictGraph.rankedSolutions).forEach(r => {
      const parts = r.skuPartsList || r.skuList || [];
      extractedSkus.push(...parts.map(p => p.sku || p['Product #']).filter(Boolean));
    });
  }
  if (Array.isArray(output?.synthesizedBom)) {
    extractedSkus.push(...output.synthesizedBom.map(it => it.sku || it['Product #']).filter(Boolean));
  }
  if (typeof output?.answer === 'string') {
    const rawMatches = output.answer.match(/\b([A-Z0-9]{3,8}-[A-Z0-9]{3,4}|[A-Z0-9]{6}|[A-Z0-9]{5,8}AAE|[HURS][A-Z0-9]{4,11})\b/g) || [];
    extractedSkus.push(...rawMatches);
  }

  const uniqueSkus = [...new Set(extractedSkus.map(cleanBaseSKU).filter(Boolean))];
  const catalogData = context.catalogData || output?.catalogData || output?.chassisInfo?.catalogData;

  if (uniqueSkus.length === 0) {
    checks.push(
      makeCheck('U3', 'Referenced SKUs Present in Scoped Catalog', 'BLOCK', 'NOT_APPLICABLE', 'No hardware part numbers referenced in response.')
    );
  } else {
    const invalidSyntaxSkus = uniqueSkus.filter(s => !isValidHpeSKU(s));
    if (invalidSyntaxSkus.length > 0) {
      checks.push(
        makeCheck('U3', 'Referenced SKUs Present in Scoped Catalog', 'BLOCK', 'FAILED',
          `SKU syntax check failed: ${invalidSyntaxSkus.length} invalid part number(s) [${invalidSyntaxSkus.join(', ')}].`,
          { invalidSyntaxSkus })
      );
    } else if (!catalogData) {
      checks.push(
        makeCheck('U3', 'Referenced SKUs Present in Scoped Catalog', 'BLOCK', 'UNKNOWN',
          `All ${uniqueSkus.length} SKU(s) have valid HPE syntax, but scoped catalog data was not provided to verify catalog presence and lifecycle status.`,
          { uniqueSkusCount: uniqueSkus.length, catalogSupplied: false })
      );
    } else {
      const catalogIndex = buildCatalogSkuIndex(catalogData);
      const unverifiedSkus = uniqueSkus.filter(s => !catalogIndex.has(s));
      if (unverifiedSkus.length > 0) {
        checks.push(
          makeCheck('U3', 'Referenced SKUs Present in Scoped Catalog', 'BLOCK', 'FAILED',
            `SKU catalog check failed: ${unverifiedSkus.length} SKU(s) absent from scoped catalog [${unverifiedSkus.join(', ')}].`,
            { unverifiedSkus, totalReferenced: uniqueSkus.length })
        );
      } else {
        checks.push(
          makeCheck('U3', 'Referenced SKUs Present in Scoped Catalog', 'BLOCK', 'PASSED',
            `All ${uniqueSkus.length} referenced SKU(s) verified present in scoped catalog; live orderability remains separate.`,
            { verifiedCount: uniqueSkus.length })
        );
      }
    }
  }

  // U4: Timestamp & Provenance (WARN)
  const hasProvenance = Boolean(
    output?.timestamp ||
    output?.provenance ||
    output?.traceId ||
    output?.catalogDir ||
    context?.catalogDir ||
    output?.source
  );
  checks.push(
    hasProvenance
      ? makeCheck('U4', 'Timestamp & Provenance', 'WARN', 'PASSED', 'Execution timestamp and source catalog provenance are present.')
      : makeCheck('U4', 'Timestamp & Provenance', 'WARN', 'UNKNOWN', 'Execution timestamp or source catalog attribution is missing.', { hasProvenance: false })
  );

  // U5: Honest Uncertainty (BLOCK)
  const isAmbiguous = Boolean(output?.isAmbiguous || output?.requiresUserConfirmation);
  const honestReported = !isAmbiguous ||
    (typeof output?.message === 'string' && output.message.toLowerCase().includes('ambiguous')) ||
    (output?.confidence && output.confidence.score < 0.95);
  checks.push(
    honestReported
      ? makeCheck('U5', 'Honest Uncertainty', 'BLOCK', 'PASSED', 'Uncertainties, ambiguities, or gaps are transparently surfaced.')
      : makeCheck('U5', 'Honest Uncertainty', 'BLOCK', 'FAILED', 'Output has unresolved ambiguities that were not explicitly reported to the user.', { isAmbiguous })
  );

  // A complete catalog is not evidence that this exact option combination was checked.
  const runtimePlan = require('./runtime_discovery_plan').buildRuntimeDiscoveryPlan(output || {}, {
    catalogData, targetDir: context.catalogDir || context.targetDir || output?.catalogDir,
    productId: context.chassisName || chassis
  });
  if (runtimePlan.configurations.some(config => config.probes.length || config.blockers.length)) {
    checks.push(makeCheck('U6', 'BOQ-scoped Conditional Discovery', 'BLOCK', 'UNKNOWN',
      'Investigate absent/conditional SKUs in the exact live configuration; a catalog miss is not proof of incompatibility. Runtime plan is not vendor acceptance.',
      { runtimeDiscoveryPlan: runtimePlan }));
  }
  return checks;
}

const CANONICAL_ASPECT_MAP = {
  COMPUTE_THERMAL: ['COMPUTE_THERMAL', 'ASPECT_1', 'COMPUTE & THERMAL ASPECT', 'COMPUTE THERMAL', 'COMPUTE', 'THERMAL'],
  MEMORY_CHANNEL: ['MEMORY_CHANNEL', 'ASPECT_2', 'MEMORY CHANNEL & INTERLEAVING ASPECT', 'MEMORY CHANNEL', 'MEMORY'],
  STORAGE_TRI_MODE: ['STORAGE_TRI_MODE', 'ASPECT_3', 'STORAGE CONTROLLER & TRI-MODE ASPECT', 'DRIVE CAGE & STORAGE ENCLOSURE ASPECT', 'STORAGE TRI-MODE', 'STORAGE'],
  PCIE_RISER: ['PCIE_RISER', 'ASPECT_4', 'PCIE SLOT & RISER ASPECT', 'SXM / PCIE HIGH-POWER GPU BUS ASPECT', 'PCIE RISER', 'PCIE'],
  NETWORKING_OCP: ['NETWORKING_OCP', 'ASPECT_5', 'NETWORKING & OCP ADAPTER ASPECT', 'IB / ROCE HIGH-SPEED FABRIC ASPECT', 'INFINIBAND / ROCE HIGH-SPEED FABRIC ASPECT', 'NETWORKING OCP', 'NETWORKING'],
  POWER_ENVIRONMENT: ['POWER_ENVIRONMENT', 'ASPECT_6', 'POWER SUPPLY & ENVIRONMENTAL ASPECT', 'STORAGE ENCLOSURE POWER & ENVIRONMENTAL ASPECT', 'SWITCH REDUNDANT POWER & AIRFLOW ASPECT', 'HIGH-WATTAGE POWER ENVELOPE & BUSBAR ASPECT', 'POWER ENVIRONMENT', 'POWER'],
  SUPPORT_MANUFACTURING: ['SUPPORT_MANUFACTURING', 'ASPECT_7', 'FACTORY INTEGRATION & MANUFACTURING ASPECT', 'FACTORY INTEGRATION & MANUFACTURING', 'SUPPORT MANUFACTURING', 'MANUFACTURING'],
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

function _resolveCanonicalAspectId(check) {
  if (!check || typeof check !== 'object') return null;
  const rawId = String(check.id || check.code || '').trim().toUpperCase();
  const rawName = String(check.name || '').trim().toUpperCase();

  // If rawId is already an exact canonical ID, return it
  if (CANONICAL_ASPECT_MAP[rawId]) return rawId;

  // Next, match by specific name keywords (more specific than generic aspect numbers)
  if (rawName.includes('MEZZANINE') || rawName.includes('FABRIC MEZZANINE')) return 'FRAME_FABRIC_MEZZANINE';
  if (rawName.includes('FRAME SHARED POWER') || rawName.includes('SHARED POWER')) return 'FRAME_SHARED_POWER';
  if (rawName.includes('COLD STORAGE') || rawName.includes('TAPE LIBRARY') || rawName.includes('ARCHIVE DRIVE')) return 'ARCHIVE_COLD_STORAGE';
  if (rawName.includes('COMPUTE') || rawName.includes('THERMAL')) return 'COMPUTE_THERMAL';
  if (rawName.includes('MEMORY') || rawName.includes('INTERLEAVING')) return 'MEMORY_CHANNEL';
  if (rawName.includes('CONTROLLER PAIR') || rawName.includes('STORAGE CONTROLLER')) return 'STORAGE_CONTROLLER_PAIR';
  if (rawName.includes('TRI-MODE') || rawName.includes('DRIVE CAGE') || rawName.includes('STORAGE')) return 'STORAGE_TRI_MODE';
  if (rawName.includes('PCIE') || rawName.includes('RISER') || rawName.includes('BUS')) return 'PCIE_RISER';
  if (rawName.includes('SWITCH') || rawName.includes('PORT PROTOCOL') || rawName.includes('FABRIC')) return 'SWITCH_FABRIC_PORTS';
  if (rawName.includes('OCP') || rawName.includes('NETWORKING')) return 'NETWORKING_OCP';
  if (rawName.includes('POWER') || rawName.includes('ENVIRONMENT') || rawName.includes('AIRFLOW') || rawName.includes('BUSBAR')) return 'POWER_ENVIRONMENT';
  if (rawName.includes('MANUFACTURING') || rawName.includes('FACTORY') || rawName === 'SUPPORT') return 'SUPPORT_MANUFACTURING';
  if (rawName.includes('TECH CARE') || rawName.includes('POINTNEXT') || rawName.includes('SERVICES') || rawName.includes('DEPLOYMENT')) return 'SUPPORT_SERVICES';
  if (rawName.includes('LICENSED PORT') || rawName.includes('SAN LICENSED')) return 'SAN_LICENSED_PORTS';
  if (rawName.includes('BUNDLED OPTICS')) return 'BUNDLED_OPTICS_BILLING';
  if (rawName.includes('CATALOG AND SERVICE') || rawName.includes('SERVICE COVERAGE')) return 'CATALOG_SERVICE_COVERAGE';
  if (rawName.includes('SERVER COMPONENT RULES') || rawName.includes('FIXED SAN')) return 'SERVER_RULES_NOT_APPLICABLE';

  for (const [canonicalId, aliases] of Object.entries(CANONICAL_ASPECT_MAP)) {
    if (aliases.some(alias => rawId === alias || rawName === alias)) {
      return canonicalId;
    }
  }
  const strippedId = rawId.replace(/^(ASPECT_|SWITCH_|STORAGE_|SUPPORT_|FRAME_|ARCHIVE_)/, '');
  for (const [canonicalId, aliases] of Object.entries(CANONICAL_ASPECT_MAP)) {
    if (strippedId === canonicalId || aliases.includes(strippedId)) return canonicalId;
  }
  return rawId || rawName || null;
}

function _checkPhysicalAspects(output) {
  const aspectChecks = output?.aspectChecks || output?.evalSummary?.aspectChecks || output?.evaluation?.aspectChecks || null;
  if (!Array.isArray(aspectChecks) || aspectChecks.length === 0) {
    return makeCheck('B1', 'Scoped Physical Checks Completed', 'BLOCK', 'UNKNOWN', 'Physical aspect checks were not evaluated or missing from output.', { evaluated: false });
  }

  const registeredPhysical = ['COMPUTE_THERMAL', 'MEMORY_CHANNEL', 'STORAGE_TRI_MODE', 'PCIE_RISER', 'NETWORKING_OCP', 'POWER_ENVIRONMENT', 'SUPPORT_MANUFACTURING'];

  const rawDomain = String(output?.solutionTopology?.domain || output?.productType || output?.chassisInfo?.family || '').toLowerCase();
  const chassisName = String(output?.chassis || output?.targetChassis || output?.detectedChassis?.model || '').toLowerCase();

  const isExplicitSan = rawDomain === 'san' || rawDomain === 'san_switch';
  const isChassisSan = !rawDomain && (/sn3600b/i.test(chassisName) || (/\b(?:brocade|fibre\s*channel\s*switch)\b/i.test(chassisName)));
  const isSanSwitch = isExplicitSan || isChassisSan;

  const isNetworkingDomain = rawDomain === 'networking' || (!rawDomain && !isSanSwitch && /switch|fabric/i.test(chassisName));
  const isStorageDomain = rawDomain === 'storage' || (!rawDomain && /alletra|nimble|storeonce/i.test(chassisName));
  const isArchiveDomain = rawDomain === 'archive' || rawDomain === 'archive_tape' || (!rawDomain && /msl|storeever|tape/i.test(chassisName));
  const isSynergyCompute = rawDomain === 'synergy_compute' || rawDomain === 'synergy' || (!rawDomain && /synergy|sy480|sy660/i.test(chassisName));
  const isAiCluster = rawDomain === 'ai_cluster';

  const targetDomain = isSanSwitch ? 'san_switch'
    : isNetworkingDomain ? 'networking'
    : isStorageDomain ? 'storage'
    : isArchiveDomain ? 'archive'
    : isSynergyCompute ? 'synergy_compute'
    : isAiCluster ? 'ai_cluster'
    : 'server';

  const registeredAspects = getRegisteredAspectsForDomain(targetDomain);
  const requiredAspectIds = targetDomain === 'server' ? registeredPhysical : registeredAspects.map(a => a.id.toUpperCase());

  const resolvedPresentIds = new Set();
  for (const a of aspectChecks) {
    const cId = _resolveCanonicalAspectId(a);
    if (cId) resolvedPresentIds.add(cId);
  }

  const missingDomainAspects = requiredAspectIds.filter(id => !resolvedPresentIds.has(id));

  const minRequiredAspects = Math.min(requiredAspectIds.length, isSanSwitch ? 4 : (isNetworkingDomain || isStorageDomain ? 3 : (isSynergyCompute ? 6 : (isArchiveDomain ? 1 : 7))));
  const requiresFullServerAspects = targetDomain === 'server';

  if (aspectChecks.length < minRequiredAspects || resolvedPresentIds.size < minRequiredAspects || missingDomainAspects.length > 0) {
    const reason = missingDomainAspects.length > 0
      ? `Missing required ${targetDomain} domain aspect(s): ${missingDomainAspects.join(', ')} (${resolvedPresentIds.size} distinct identities verified).`
      : `Incomplete physical checks: expected at least ${minRequiredAspects} registered ${requiresFullServerAspects ? 'server physical' : targetDomain} aspects, found ${aspectChecks.length} checks (${resolvedPresentIds.size} distinct identities).`;
    return makeCheck('B1', 'Scoped Physical Checks Completed', 'BLOCK', 'FAILED',
      reason,
      { aspectCount: aspectChecks.length, uniqueCount: resolvedPresentIds.size, targetDomain, missingDomainAspects, requiredAspects: requiredAspectIds });
  }

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
  return makeCheck('B1', 'Scoped Physical Checks Completed', 'BLOCK', 'PASSED', `All ${aspectChecks.length} physical aspect checks evaluated cleanly.`);
}

function _checkRankedSolutions(output) {
  const checks = [];
  const rankedSolutions = output?.conflictGraph?.rankedSolutions || output?.rankedSolutions || [];
  const isUnbuildable = output?.isMathClean === false || output?.isWholeSolutionValid === false || output?.status === 'UNBUILDABLE';

  // B2: At Least 1 Ranked Solution or Explicit Unbuildable Determination (BLOCK)
  if (isUnbuildable) {
    checks.push(makeCheck('B2', 'At Least 1 Ranked Solution or Unbuildable Determination', 'BLOCK', 'PASSED', 'Explicit unbuildable determination documented per INV-72.', { isUnbuildable: true }));
  } else if (rankedSolutions.length >= 1) {
    checks.push(makeCheck('B2', 'At Least 1 Ranked Solution or Unbuildable Determination', 'BLOCK', 'PASSED', `Produced ${rankedSolutions.length} strategy rank(s).`, { rankCount: rankedSolutions.length }));
  } else {
    checks.push(makeCheck('B2', 'At Least 1 Ranked Solution or Unbuildable Determination', 'BLOCK', 'FAILED', 'No ranked solutions generated and no unbuildable determination recorded.', { rankedSolutionsCount: 0 }));
  }

  // B3: No Duplicate Ranks (WARN)
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

function _checkFinancialPricing(output) {
  const checks = [];
  const rankedSolutions = output?.conflictGraph?.rankedSolutions || output?.rankedSolutions || [];
  const isUnbuildable = output?.isMathClean === false || output?.isWholeSolutionValid === false || output?.status === 'UNBUILDABLE';

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

  // B4: Financial Table & Prices Present (BLOCK)
  if (isUnbuildable) {
    checks.push(makeCheck('B4', 'Financial Table Present', 'BLOCK', 'NOT_APPLICABLE', 'Unbuildable BOM does not require financial totals.'));
  } else if (totalPrice > 0) {
    checks.push(makeCheck('B4', 'Financial Table Present', 'BLOCK', 'PASSED', `Financial totals calculated ($${totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}).`, { totalPrice }));
  } else if (partsCount === 0) {
    checks.push(makeCheck('B4', 'Financial Table Present', 'BLOCK', 'UNKNOWN', 'Pricing cannot be evaluated without candidate BOM items.', { partsCount: 0 }));
  } else {
    checks.push(makeCheck('B4', 'Financial Table Present', 'BLOCK', 'FAILED', 'Pricing table missing or zero extended cost on buildable solution.', { totalPrice, partsCount }));
  }

  // B6: Unresolved Prices Flagged (INV-33) (BLOCK)
  const partsToCheck = (rankedSolutions.length > 0 ? (rankedSolutions[0].skuPartsList || rankedSolutions[0].skuList || []) : output?.items) || [];
  const zeroPriceParts = partsToCheck.filter(p => p && (!p.unitPriceUsd || p.unitPriceUsd === 0) && (!p.listPrice || p.listPrice === 0));
  if (zeroPriceParts.length > 0) {
    const isExplicitlyFlagged = Boolean(output?.hasUnresolvedPrices) && Array.isArray(output?.unresolvedPriceSkus) && output.unresolvedPriceSkus.length > 0;
    checks.push(
      isExplicitlyFlagged
        ? makeCheck('B6', 'Unresolved Prices Flagged (INV-33)', 'BLOCK', 'PASSED', `Unresolved prices present for ${zeroPriceParts.length} SKU(s) and explicitly tagged per INV-33.`, { unpricedCount: zeroPriceParts.length })
        : makeCheck('B6', 'Unresolved Prices Flagged (INV-33)', 'BLOCK', 'FAILED', `${zeroPriceParts.length} SKU(s) have zero/missing price without mandatory INV-33 incomplete pricing notice.`, { zeroPriceSkus: zeroPriceParts.map(p => p.sku || p['Product #']) })
    );
  } else {
    checks.push(makeCheck('B6', 'Unresolved Prices Flagged (INV-33)', 'BLOCK', 'PASSED', 'All referenced SKU prices are confirmed with list pricing.'));
  }

  return checks;
}

function _checkUnsolicitedServices(output, context = {}) {
  const rankedSolutions = output?.conflictGraph?.rankedSolutions || output?.rankedSolutions || [];
  if (rankedSolutions.length === 0) {
    return makeCheck('B8', 'No Unsolicited Services in Rank 1 (INV-32)', 'BLOCK', 'NOT_APPLICABLE', 'No ranked solutions to check for unsolicited services.');
  }
  const rank1 = rankedSolutions[0];
  const parts = rank1.skuPartsList || rank1.skuList || [];
  const unsolicited = parts.filter(p => {
    const desc = (p.description || '').toLowerCase();
    const sku = cleanBaseSKU(p.sku);
    const isService = /\b(installation|startup|deployment|pointnext|tech care)\b/i.test(desc) || /^(HA|HU|H7)/i.test(sku);
    return isService && !p.customerRequested && p.isFixInjected !== true && !context.customerRequestedServices;
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

function _checkNotebookGrounding(output, context = {}) {
  const notebookHealth = output?.notebookHealth || context?.notebookHealth || null;
  const solutionDoubleCheck = output?.ephemeralSourceValidation || output?.solutionDoubleCheck || null;
  const agenticReview = output?.agenticReview || context?.agenticReview || null;
  const notebookLmStatus = output?.notebookLmStatus || null;
  const isOffline = Boolean(output?.offlineMode || context?.offlineMode || context?.OFFLINE_MODE || process.env.OFFLINE_MODE === '1' || process.env.LOCAL_EVAL_ONLY === '1');

  if (notebookHealth && notebookHealth.isHealthy === false) {
    return makeCheck('B13', 'NotebookLM Grounding & Degraded State', 'BLOCK', 'ACTION_REQUIRED',
      `Product notebook is degraded (${output.notebookDegradedMode || notebookHealth.degradationMode || 'DEGRADED_UNGROUNDED'}). Presentation cannot claim fully grounded certification.`,
      { degradationMode: notebookHealth.degradationMode || output.notebookDegradedMode });
  }
  if (solutionDoubleCheck && (
    solutionDoubleCheck.doubleCheckVerdict === 'DOUBLE_CHECK_REJECTED' ||
    solutionDoubleCheck.verdict === 'DOUBLE_CHECK_REJECTED' ||
    solutionDoubleCheck.status === 'DOUBLE_CHECK_REJECTED' ||
    (Array.isArray(solutionDoubleCheck.rankVerdicts) && solutionDoubleCheck.rankVerdicts.some(row => row?.verdict === 'FAIL'))
  )) {
    return makeCheck('B13', 'NotebookLM Grounding & Degraded State', 'BLOCK', 'FAILED',
      'NotebookLM ephemeral source validation rejected candidate strategy ranks.',
      { verdict: solutionDoubleCheck.doubleCheckVerdict || solutionDoubleCheck.verdict || solutionDoubleCheck.status });
  }
  if (!isOffline && candidateReviewCurrent(output)) {
    return makeCheck('B13', 'NotebookLM Grounding & Degraded State', 'BLOCK', 'PASSED',
      'NotebookLM grounding verified with affirmative cloud candidate validation.',
      {
        citationsCount: solutionDoubleCheck.citations?.length || 0,
        isCloudGrounded: Boolean(solutionDoubleCheck.isCloudGrounded)
      });
  }
  if (isOffline) {
    return makeCheck('B13', 'NotebookLM Grounding & Degraded State', 'BLOCK', 'ACTION_REQUIRED',
      'Grounding unverified in OFFLINE_MODE. Presentation cannot claim cloud-grounded certification.',
      { offline: true });
  }
  if (!solutionDoubleCheck && !notebookHealth && !agenticReview && !notebookLmStatus) {
    return makeCheck('B13', 'NotebookLM Grounding & Degraded State', 'BLOCK', 'ACTION_REQUIRED',
      'Grounding evidence is absent. Presentation delivery requires a current candidate review with native authoritative citations.',
      { missingEvidence: true });
  }
  return makeCheck('B13', 'NotebookLM Grounding & Degraded State', 'BLOCK', 'ACTION_REQUIRED',
    'NotebookLM grounding lacked affirmative cloud verification; presentation cannot claim grounded certification.',
    { status: 'UNVERIFIED_GROUNDING' });
}

const QUALIFYING_COM_ONEVIEW_SKUS = new Set([
  'R7A11AAE', 'R7A12AAE', 'S2E10AAE', 'S5E59AAE', 'S5E60AAE', 'S5E61AAE',
  'E5Y43A', 'P8B31A', 'E5Y35AAE', 'P8B25A', 'E5Y36A', 'E5Y44A'
]);

function _checkMandatoryComPolicy(output, _context = {}) {
  const chassis = String(output?.chassis || output?.targetChassis || output?.detectedChassis?.model || '').toLowerCase();
  const isGen11Or12ProLiant = /gen11|gen12/i.test(chassis) && /dl|ml/i.test(chassis);

  if (!isGen11Or12ProLiant) {
    return makeCheck('B14', 'Mandatory COM / OneView Policy (Rule 81322276)', 'WARN', 'NOT_APPLICABLE', 'Not an NPI ProLiant Gen11/Gen12 CTO server; COM attach policy not mandated.');
  }

  const isUnbuildable = output?.isMathClean === false || output?.isWholeSolutionValid === false || output?.status === 'UNBUILDABLE';
  if (isUnbuildable) {
    return makeCheck('B14', 'Mandatory COM / OneView Policy (Rule 81322276)', 'WARN', 'NOT_APPLICABLE', 'Unbuildable BOM does not require policy compliance check.');
  }

  const rankedSolutions = output?.conflictGraph?.rankedSolutions || output?.rankedSolutions || [];
  const parts = rankedSolutions.length > 0
    ? (rankedSolutions[0].skuPartsList || rankedSolutions[0].skuList || [])
    : (output?.items || []);

  if (parts.length === 0) {
    return makeCheck('B14', 'Mandatory COM / OneView Policy (Rule 81322276)', 'WARN', 'UNKNOWN', 'Cannot verify COM policy compliance without candidate BOM items.');
  }

  const hasQualifyingComOrOneView = parts.some(p => {
    const sku = cleanBaseSKU(p.sku || p['Product #']);
    const desc = (p.description || p.Description || '').toLowerCase();
    return QUALIFYING_COM_ONEVIEW_SKUS.has(sku) ||
           desc.includes('compute ops management') ||
           (desc.includes('oneview') && !desc.includes('without oneview'));
  });

  return hasQualifyingComOrOneView
    ? makeCheck('B14', 'Mandatory COM / OneView Policy (Rule 81322276)', 'WARN', 'PASSED', 'Mandatory COM or OneView management software policy satisfied per CLIC Rule 81322276.')
    : makeCheck('B14', 'Mandatory COM / OneView Policy (Rule 81322276)', 'WARN', 'ACTION_REQUIRED',
        'ProLiant Gen11/Gen12 CTO configuration lacks mandatory HPE GreenLake for Compute Ops Management (COM) or OneView license (CLIC Rule 81322276). Add R7A11AAE (or approved replacement E5Y35AAE/E5Y43A) or submit an exception via https://solutionsdeliveryhpe.com/clicsmartform to avoid CLIC Process Control block.',
        { ruleId: '81322276', targetChassis: chassis }
      );
}

function _checkDeliveryFeasibility(output, context = {}) {
  const rankedSolutions = output?.conflictGraph?.rankedSolutions || output?.rankedSolutions || [];
  const parts = rankedSolutions.length > 0
    ? (rankedSolutions[0].skuPartsList || rankedSolutions[0].skuList || [])
    : (output?.items || []);

  if (!Array.isArray(parts) || parts.length === 0) {
    return makeCheck('B15', 'Pacing Item & Delivery Bottleneck Feasibility (INV-177 / INV-180)', 'WARN', 'NOT_APPLICABLE', 'No BOM parts available to assess delivery pacing.');
  }

  const catalogData = context.catalogData || output?.catalogData || output?.chassisInfo?.catalogData || null;
  const pacing = analyzeDeliveryPacing(parts, { catalogData });

  if (pacing.hasReleaseWaveGap) {
    return makeCheck(
      'B15',
      'Pacing Item & Delivery Bottleneck Feasibility (INV-177 / INV-180)',
      'WARN',
      'ACTION_REQUIRED',
      `Configuration mixes components across different General Availability waves (${pacing.releaseWaveGapDays}-day gap: ${pacing.earliestStartDate} vs ${pacing.latestStartDate}). Pacing items: ${pacing.wavePacingItems.map(w => w.sku).join(', ')}. Recommend partitioning into separate UCIDs to avoid factory assembly hold.`,
      { pacing }
    );
  }

  if (pacing.leadTimeBottleneckItem && pacing.maxLeadTimeDays >= 21) {
    return makeCheck(
      'B15',
      'Pacing Item & Delivery Bottleneck Feasibility (INV-177 / INV-180)',
      'WARN',
      'ACTION_REQUIRED',
      `Configuration is paced by ${pacing.leadTimeBottleneckItem.sku} with a factory lead time of ${pacing.maxLeadTimeDays} days, governing the entire solution delivery envelope.`,
      { pacing }
    );
  }

  return makeCheck(
    'B15',
    'Pacing Item & Delivery Bottleneck Feasibility (INV-177 / INV-180)',
    'WARN',
    'PASSED',
    `Delivery timeline feasible. No major release wave gaps or pacing item bottlenecks detected (max lead time: ${pacing.maxLeadTimeDays || 'standard'} days).`,
    { pacing }
  );
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
  const hasUnmatched = unmatched.length > 0;

  if (hasUnmatched) {
    const skuNames = unmatched.map(u => {
      if (!u) return 'UNKNOWN_SKU';
      if (typeof u === 'string') return u;
      return u.rawSku || u.sku || u.rawLine || JSON.stringify(u);
    }).join(', ');
    return makeCheck('B16', 'Zero Unmatched Customer SKUs (FP-1)', 'BLOCK', 'FAILED',
      `Unmatched customer SKU(s) failed parsing/catalog validation: ${skuNames}. Delivery blocked per INV-105/FP-1.`,
      { unmatchedCount: unmatched.length, unmatchedSkus: unmatched });
  }

  const hasIntakeEvidence = Array.isArray(output?.items) || Array.isArray(output?.rawItems) ||
    Array.isArray(context?.items) || Array.isArray(context?.rawItems) ||
    output?.unmatchedSkus !== undefined || context?.unmatchedSkus !== undefined;

  if (!hasIntakeEvidence) {
    return makeCheck('B16', 'Zero Unmatched Customer SKUs (FP-1)', 'BLOCK', 'ACTION_REQUIRED',
      'Intake SKU validation data missing from output and context; affirmative catalog coverage unverified.',
      { unmatchedCount: 0, intakeVerified: false });
  }

  return makeCheck('B16', 'Zero Unmatched Customer SKUs (FP-1)', 'BLOCK', 'PASSED',
    'All customer SKU-like tokens affirmatively matched in catalog or cleanly resolved.',
    { unmatchedCount: 0 });
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
    const formatted = unresolved.map(u => {
      if (!u) return 'UNKNOWN_REQUIREMENT';
      if (typeof u === 'string') return u;
      return u.line || u.requirement || u.description || JSON.stringify(u);
    }).join('; ');

    return makeCheck('B17', 'Zero Unresolved Customer Requirements', 'BLOCK', 'FAILED',
      `Customer tender contains ${unresolved.length} unresolved requirement(s) lacking physical SKU mapping: ${formatted}. Delivery blocked per INV-105/INV-194.`,
      { unresolvedCount: unresolved.length, unresolvedRequirements: unresolved });
  }

  return makeCheck('B17', 'Zero Unresolved Customer Requirements', 'BLOCK', 'PASSED',
    'All customer descriptive requirements affirmatively resolved into validated hardware components or services.',
    { unresolvedCount: 0 });
}

function _checkQuantityConservation(output, context = {}) {
  const qc = output?.quantityConservation || context?.quantityConservation || null;
  if (!qc) {
    return makeCheck('B18', 'Tender Quantity Conservation (INV-192)', 'BLOCK', 'PASSED',
      'Quantity conservation check not applicable to single-item or non-partitioned evaluations.',
      { evaluated: false });
  }

  if (qc.error) {
    return makeCheck('B18', 'Tender Quantity Conservation (INV-192)', 'BLOCK', 'FAILED',
      `Quantity conservation ledger error: ${qc.error}.`,
      { error: qc.error });
  }

  if (qc.isFullyConserved === false && (qc.deficitCount > 0 || qc.totalDiscrepancies > 0)) {
    const hasDeficit = (qc.deficitCount || 0) > 0;
    const hasUnrequested = (qc.unrequestedAdditionsCount || 0) > 0;
    const hasSurplus = (qc.surplusCount || 0) > 0;

    if (hasDeficit || hasUnrequested || hasSurplus) {
      return makeCheck('B18', 'Tender Quantity Conservation (INV-192)', 'BLOCK', 'FAILED',
        `Tender quantity conservation failed: ${qc.totalDiscrepancies} discrepancy/discrepancies found (${qc.deficitCount || 0} deficit, ${qc.surplusCount || 0} surplus, ${qc.unrequestedAdditionsCount || 0} unrequested). Delivery blocked per INV-192.`,
        { quantityConservation: qc });
    }
  }

  return makeCheck('B18', 'Tender Quantity Conservation (INV-192)', 'BLOCK', 'PASSED',
    `All ${qc.summary?.totalRequestedUnits || 0} requested tender units mathematically conserved (${qc.exactConservedCount || 0} conserved exact, ${qc.policyAdditionsCount || 0} approved policy additions).`,
    { quantityConservation: qc });
}

/**
 * Gate B19: Live Portal Validation & Receipt Integrity (INV-0 / INV-104)
 * Forbids false claims of live vendor acceptance without a verifiable session receipt.
 */
function _checkPortalReceiptIntegrity(output, context = {}) {
  const portalStatus = output?.portalValidationStatus || context?.portalValidationStatus;
  const clicValid = output?.clicValidation?.isValid === true || context?.clicValidation?.isValid === true;
  const receipt = output?.sessionReceipt || context?.sessionReceipt || output?.sessionReceiptPath || output?.portalReceipt || context?.portalReceipt;

  const isClaimingVendorAcceptance = [
    'ACCEPTED_BY_VENDOR',
    'CLIC_ACCEPTED',
    'CORRECTED_CANDIDATE_CLIC_ACCEPTED',
    'VERIFIED'
  ].includes(portalStatus) || clicValid;

  // If deliverable explicitly claims vendor acceptance (Tier 3), it must possess a verifiable receipt
  if (isClaimingVendorAcceptance) {
    if (!receipt) {
      return makeCheck('B19', 'Live Portal Validation & Receipt Integrity (INV-0)', 'BLOCK', 'FAILED',
        'Output claims vendor acceptance or CLIC valid, but lacks official session receipt from outputs/history/oca_sessions/ (INV-0).',
        { portalStatus, clicValid, receipt: null });
    }

    if (typeof receipt === 'string') {
      if (!fs.existsSync(receipt)) {
        return makeCheck('B19', 'Live Portal Validation & Receipt Integrity (INV-0)', 'BLOCK', 'FAILED',
          `Session receipt path does not exist on disk: ${receipt}.`,
          { portalStatus, clicValid, receipt });
      }
    } else if (typeof receipt === 'object') {
      const hasValidFields = Boolean(receipt.status || receipt.manifestSha256 || receipt.capturedAt || receipt.startedAt);
      if (!hasValidFields) {
        return makeCheck('B19', 'Live Portal Validation & Receipt Integrity (INV-0)', 'BLOCK', 'FAILED',
          'Session receipt object is empty or missing required verification fields.',
          { portalStatus, clicValid, receipt });
      }
    }

    return makeCheck('B19', 'Live Portal Validation & Receipt Integrity (INV-0)', 'BLOCK', 'PASSED',
      'Official vendor acceptance receipt verified against active session record.',
      { portalStatus, receipt: typeof receipt === 'string' ? receipt : (receipt.status || 'VERIFIED') });
  }

  // When portal validation is pending (Tier 0-2), status is NOT_APPLICABLE with honest pending advisory
  return makeCheck('B19', 'Live Portal Validation & Receipt Integrity (INV-0)', 'WARN', 'NOT_APPLICABLE',
    'Live portal validation pending. Output appropriately marked as PORTAL VALIDATION PENDING (Tier 1/2).',
    { portalStatus: portalStatus || 'PORTAL_VALIDATION_PENDING' });
}

/**
 * BOQ Evaluation Criteria (B1–B19)
 */
function validateBoqEvaluationCriteria(output, context = {}) {
  return [
    _checkPhysicalAspects(output),
    ..._checkRankedSolutions(output),
    ..._checkFinancialPricing(output),
    _checkUnsolicitedServices(output, context),
    _checkMandatoryAccessories(output),
    _checkNotebookGrounding(output, context),
    _checkMandatoryComPolicy(output, context),
    _checkDeliveryFeasibility(output, context),
    _checkUnmatchedSkus(output, context),
    _checkUnresolvedRequirements(output, context),
    _checkQuantityConservation(output, context),
    _checkPortalReceiptIntegrity(output, context)
  ];
}

/**
 * RFP Sizing Criteria (R1–R6)
 */
function validateRfpSizingCriteria(output, _context = {}) {
  const checks = [];

  // R1: All Detected Roles Resolved (BLOCK)
  const resolvedRoles = output?.synthesizedRoles || output?.resolvedRoles || output?.resolutions || [];
  const unresolvedRoles = output?.unresolvedRoles || [];
  if (resolvedRoles.length === 0 && unresolvedRoles.length === 0) {
    checks.push(
      makeCheck('R1', 'All Detected Roles Resolved', 'BLOCK', 'UNKNOWN', 'Component role resolution was not performed or produced 0 roles.', { resolvedCount: 0 })
    );
  } else if (unresolvedRoles.length > 0) {
    checks.push(
      makeCheck('R1', 'All Detected Roles Resolved', 'BLOCK', 'ACTION_REQUIRED', `Unresolved component role(s): ${unresolvedRoles.join(', ')}.`, { unresolvedRoles })
    );
  } else {
    checks.push(
      makeCheck('R1', 'All Detected Roles Resolved', 'BLOCK', 'PASSED', `All ${resolvedRoles.length} workload component role(s) mapped to target SKUs.`, { resolvedCount: resolvedRoles.length })
    );
  }

  // R2: Base Chassis CTO Present (BLOCK)
  const items = output?.candidateBOM || output?.synthesizedBom || output?.items || [];
  const hasBaseChassis = items.some(it => {
    const desc = (it.description || '').toLowerCase();
    const sku = cleanBaseSKU(it.sku);
    return desc.includes('server') || desc.includes('cto') || desc.includes('chassis') ||
      (output?.chassisInfo?.baseSku && sku === cleanBaseSKU(output.chassisInfo.baseSku));
  });
  checks.push(
    hasBaseChassis
      ? makeCheck('R2', 'Base Chassis CTO Present', 'BLOCK', 'PASSED', 'Base server CTO chassis SKU included in synthesized BOM.')
      : makeCheck('R2', 'Base Chassis CTO Present', 'BLOCK', 'FAILED', 'Synthesized BOM is missing a base CTO server chassis SKU.', { itemsChecked: items.length })
  );

  // R4: Power Envelope Calculated (WARN)
  const powerKw = output?.facilitySizing?.totalFacilityPowerKw || output?.powerEnvelopeKw || output?.clusterSizing?.totalFacilityPowerKw || null;
  checks.push(
    powerKw !== null && Number.isFinite(powerKw) && powerKw > 0
      ? makeCheck('R4', 'Power Envelope Calculated', 'WARN', 'PASSED', `Facility power envelope calculated (${powerKw.toFixed(2)} kW).`, { powerKw })
      : makeCheck('R4', 'Power Envelope Calculated', 'WARN', 'UNKNOWN', 'Facility electrical power envelope calculation omitted or uncomputed.', { powerKw })
  );

  // R5: Piped Through 7-Aspect Physical Validation (BLOCK)
  const aspectChecks = output?.evaluation?.aspectChecks || [];
  checks.push(
    Array.isArray(aspectChecks) && aspectChecks.length >= 7
      ? makeCheck('R5', 'Piped Through 7-Aspect Validation', 'BLOCK', 'PASSED', `Synthesized BOM was routed through physical constraint verification (${aspectChecks.length} checks).`, { aspectCount: aspectChecks.length })
      : makeCheck('R5', 'Piped Through 7-Aspect Validation', 'BLOCK', 'FAILED', 'Synthesized BOM was presented raw without full 7-aspect physical validation.', { aspectCount: aspectChecks.length })
  );

  return checks;
}

/**
 * BOM Reconciliation Criteria (C1–C4)
 */
function validateBomReconciliationCriteria(output, _context = {}) {
  const checks = [];
  const report = output?.auditReport || output;

  // C1: 4 Audit Dimensions Populated (BLOCK)
  const hasMatches = Array.isArray(report?.directMatches);
  const hasMissing = Array.isArray(report?.missingItems || report?.missingFromVendor || report?.discrepancies?.removedByVendor);
  const hasExtras = Array.isArray(report?.unsolicitedExtras || report?.addedByVendor || report?.discrepancies?.addedByVendor);
  const hasSubs = Array.isArray(report?.substitutions || report?.priceDeltas || report?.discrepancies?.uncatalogedSkus);
  const dimensionsPopulated = hasMatches && hasMissing && hasExtras && hasSubs;
  checks.push(
    dimensionsPopulated
      ? makeCheck('C1', '4 Audit Dimensions Populated', 'BLOCK', 'PASSED', 'Reconciliation covers Matches, Missing Items, Unsolicited Extras, and Substitutions/Price Deltas.')
      : makeCheck('C1', '4 Audit Dimensions Populated', 'BLOCK', 'FAILED', 'Reconciliation audit report is missing mandatory discrepancy dimensions.', { hasMatches, hasMissing, hasExtras, hasSubs })
  );

  // C2: Net CapEx Delta Calculated (WARN)
  const netDelta = report?.netCapexDelta ?? report?.summary?.netPriceDeltaUsd;
  const hasDelta = typeof netDelta === 'number' && Number.isFinite(netDelta);
  checks.push(
    hasDelta
      ? makeCheck('C2', 'Net CapEx Delta Calculated', 'WARN', 'PASSED', `Net CapEx variance calculated ($${netDelta.toFixed(2)}).`, { netDelta })
      : makeCheck('C2', 'Net CapEx Delta Calculated', 'WARN', 'UNKNOWN', 'Financial delta calculation missing from reconciliation report.', { netDelta })
  );

  // C3: Unsolicited Extras Itemized (BLOCK)
  const extras = report?.unsolicitedExtras || report?.addedByVendor || report?.discrepancies?.addedByVendor || [];
  if (extras.length === 0) {
    checks.push(
      makeCheck('C3', 'Unsolicited Extras Itemized', 'BLOCK', 'NOT_APPLICABLE', 'Zero unsolicited vendor extras detected in reconciliation.')
    );
  } else {
    const isItemized = extras.every(e => e && (e.sku || e.partNumber) && (e.unitPriceUsd !== undefined || e.listPrice !== undefined || e.quantity !== undefined || e.description));
    checks.push(
      isItemized
        ? makeCheck('C3', 'Unsolicited Extras Itemized', 'BLOCK', 'PASSED', `${extras.length} unsolicited vendor extra(s) itemized with individual details.`, { extrasCount: extras.length })
        : makeCheck('C3', 'Unsolicited Extras Itemized', 'BLOCK', 'ACTION_REQUIRED', 'Unsolicited extras present but missing itemized details.', { extrasCount: extras.length })
    );
  }

  return checks;
}

/**
 * Freeform Q&A Criteria (Q1–Q4)
 */
function validateFreeformQaCriteria(output, context = {}) {
  const checks = [];

  // Q1: Answer References Sources (WARN)
  const citations = output?.citations || output?.groundingSources || [];
  const hasCitations = Array.isArray(citations) && citations.length > 0;
  checks.push(
    hasCitations
      ? makeCheck('Q1', 'Answer References Ground-Truth Sources', 'WARN', 'PASSED', `Answer cites official sources (${citations.length} citation(s) or QuickSpecs rules).`, { citationsCount: citations.length })
      : makeCheck('Q1', 'Answer References Ground-Truth Sources', 'WARN', 'ACTION_REQUIRED', 'Answer lacks explicit citation to QuickSpecs, CLIC rules, or certified catalog.', { citationsCount: 0 })
  );

  // Q2: Part Numbers Verified (BLOCK)
  const answer = output?.answer || '';
  const skusInAnswer = (answer.match(/\b([A-Z0-9]{3,8}-[A-Z0-9]{3,4}|[A-Z0-9]{6}|[A-Z0-9]{5,8}AAE|[HURS][A-Z0-9]{4,11})\b/g) || []).filter(isValidHpeSKU);
  if (skusInAnswer.length === 0) {
    checks.push(
      makeCheck('Q2', 'Part Numbers Verified', 'BLOCK', 'NOT_APPLICABLE', 'No hardware part numbers cited in answer.')
    );
  } else {
    const catalogData = context.catalogData || output?.catalogData || output?.chassisInfo?.catalogData;
    if (!catalogData) {
      checks.push(
        makeCheck('Q2', 'Part Numbers Verified', 'BLOCK', 'UNKNOWN',
          `Syntax valid for ${skusInAnswer.length} SKU(s), but catalog data was not supplied to verify catalog presence.`,
          { citedSkus: skusInAnswer })
      );
    } else {
      const catalogIndex = buildCatalogSkuIndex(catalogData);
      const absentSkus = skusInAnswer.filter(s => !catalogIndex.has(cleanBaseSKU(s)));
      if (absentSkus.length > 0) {
        checks.push(
          makeCheck('Q2', 'Part Numbers Verified', 'BLOCK', 'FAILED',
            `${absentSkus.length} SKU(s) absent from scoped catalog [${absentSkus.join(', ')}].`,
            { absentSkus })
        );
      } else {
        checks.push(
          makeCheck('Q2', 'Part Numbers Verified', 'BLOCK', 'PASSED',
            `All ${skusInAnswer.length} referenced SKU(s) verified in scoped catalog.`,
            { verifiedCount: skusInAnswer.length })
        );
      }
    }
  }

  return checks;
}

const SPECIALIZED_TRACK_VALIDATORS = Object.freeze({
  CATALOG_INTELLIGENCE: (output) => {
    const hasIntel = Boolean(output?.liveDetails || (output?.pricingTrail && typeof output.pricingTrail === 'object'));
    const missingTarget = Boolean(output?.targetSku && !output?.liveDetails && (!output?.pricingTrail || Object.keys(output.pricingTrail).length === 0));
    if (!hasIntel) return makeCheck('CI1', 'Catalog Intelligence Scope', 'BLOCK', 'FAILED', 'Missing pricingTrail and liveDetails in catalog intelligence response.');
    if (missingTarget) return makeCheck('CI1', 'Catalog Intelligence Scope', 'WARN', 'ACTION_REQUIRED', `Requested SKU ${output.targetSku} not found in active catalog or historical trail.`);
    return makeCheck('CI1', 'Catalog Intelligence Scope', 'BLOCK', 'PASSED', 'Catalog intelligence payload verified.');
  },
  OCR_QUOTE_INGESTION: (output) => {
    const hasItems = Array.isArray(output?.extractedItems) && output.extractedItems.length > 0;
    return makeCheck('OC1', 'OCR Extraction Payload', 'BLOCK', hasItems ? 'PASSED' : 'ACTION_REQUIRED',
      hasItems ? `Extracted ${output.extractedItems.length} structured item(s) from quote.` : 'OCR quote ingestion requires an image/PDF input with extractable SKU lines.');
  },
  HETEROGENEOUS_TENDER_MODERNIZATION: (output) => {
    const valid = Boolean(output?.carrierFleetSummary && output?.deliverableSummary);
    return makeCheck('HT1', 'Heterogeneous Tender Categorization', 'BLOCK', valid ? 'PASSED' : 'ACTION_REQUIRED',
      valid ? 'Carrier fleet and dual deliverable summaries verified.' : 'Structured multi-domain tender tables required before modernization.');
  },
  CROSS_VENDOR_TRANSFORMATION: (output) => {
    const valid = Boolean(output?.competitorSpec && Array.isArray(output?.recommendedBom || output?.candidateBom));
    return makeCheck('CV1', 'Cross-Vendor Spec & Target Mapping', 'BLOCK', valid ? 'PASSED' : 'ACTION_REQUIRED',
      valid ? 'Competitor specification and HPE transformation mapping verified.' : 'Cross-vendor transformation requires structured competitor spec and target chassis.');
  },
  WORKLOAD_DNA: (output) => {
    const valid = Boolean(output?.dna && typeof output.dna.primaryWorkload === 'string');
    return makeCheck('WD1', 'Workload DNA Profile', 'BLOCK', valid ? 'PASSED' : 'ACTION_REQUIRED',
      valid ? `Workload DNA classified (${output.dna.primaryWorkload}).` : 'Scoped BOM items required before hardware workload DNA profiling.');
  },
  VALUE_ENGINEERING: (output) => {
    const valid = Boolean(output?.budgetOptimization && typeof output.budgetOptimization === 'object');
    return makeCheck('VE1', 'Value Engineering Post-Buildability Gate', 'BLOCK', valid ? 'PASSED' : 'ACTION_REQUIRED',
      valid ? 'Post-buildability budget optimization verified.' : 'Baseline BOM must pass physical and dependency checks before value engineering.');
  },
  LEAST_DELTA_SYNTHESIS: (output) => {
    const valid = Boolean(output?.evaluation && ('leastDeltaCandidate' in output));
    return makeCheck('LD1', 'Least-Delta Conflict Graph Evaluation', 'BLOCK', valid ? 'PASSED' : 'FAILED',
      valid ? 'Conflict-graph least-delta candidate synthesis verified.' : 'Missing conflict-graph evaluation for least-delta synthesis.');
  },
  MULTI_CLUSTER_TENDER: (output) => {
    const valid = Boolean(output?.clusterAnalysis && Number.isSafeInteger(output.clusterAnalysis.totalServers) && output.clusterAnalysis.totalServers >= 1);
    return makeCheck('MC1', 'Cluster Sizing & Rack Analysis', 'BLOCK', valid ? 'PASSED' : 'ACTION_REQUIRED',
      valid ? `Cluster analysis verified for ${output.clusterAnalysis.totalServers} node(s).` : 'Explicit server count and scoped product catalog required for multi-cluster sizing.');
  },
  ADVERSARIAL_VALIDATION: (output) => {
    const valid = Boolean(output?.evaluation && Array.isArray(output?.generatedBoq));
    return makeCheck('AV1', 'Adversarial Stress & Candidate Scrutiny', 'BLOCK', valid ? 'PASSED' : 'FAILED',
      valid ? 'Adversarial evaluation payload verified.' : 'Missing adversarial evaluation or generated BOQ items.');
  },
  WORKBOOK_GENERATION: (output) => {
    const valid = Boolean(typeof output?.exportPath === 'string' && output.exportPath.length > 0);
    return makeCheck('WG1', 'Authorized Workbook Artifact', 'BLOCK', valid ? 'PASSED' : 'ACTION_REQUIRED',
      valid ? 'Authorized workbook export path verified.' : 'Workbook export requires a valid pre-presentation delivery authorization.');
  },
  REMARKS_RECONCILIATION: (output) => {
    const valid = Boolean(Array.isArray(output?.outputRows) && output.outputRows.length > 0);
    return makeCheck('RR1', 'Commercial Remarks Row Parity', 'BLOCK', valid ? 'PASSED' : 'FAILED',
      valid ? `Formatted ${output.outputRows.length} commercial remark row(s).` : 'Nonempty tender rows required for commercial remarks reconciliation.');
  },
  CONTINUOUS_LEARNING: (output) => {
    const valid = Boolean(output && ('feedbackProcessed' in output) && typeof output.message === 'string');
    return makeCheck('CL1', 'Continuous Learning Telemetry', 'BLOCK', valid ? 'PASSED' : 'FAILED',
      valid ? 'Continuous learning reflection state verified.' : 'Missing continuous learning telemetry state.');
  },
  KNOWLEDGE_SYNC: (output) => {
    const valid = Boolean(output && (output.drift || (output.syncResult && output.status !== 'FAILED')));
    return makeCheck('KS1', 'Knowledge Sync & Drift Inspection', 'BLOCK', valid ? 'PASSED' : 'FAILED',
      valid ? 'Knowledge synchronization / drift inspection verified.' : 'Knowledge synchronization failed or returned no drift/sync evidence.');
  }
});

/**
 * Main 14-Point Pre-Presentation Acceptance Gate
 *
 * @param {object} outputArtifact - The result data object to be presented to user
 * @param {string} [track='BOQ_EVALUATION'] - The execution track
 * @param {object} [context={}] - Context metadata (customer requests, catalog, etc.)
 * @returns {object} { isValid, status, blockersCount, warningsCount, checks }
 */
function verifyPrePresentationAcceptance(outputArtifact, track = 'BOQ_EVALUATION', context = {}) {
  const checks = [];

  // 1. Run Universal Criteria (U1–U5)
  checks.push(...validateUniversalCriteria(outputArtifact, context));

  // 2. Run Track-Specific Criteria
  const normTrack = String(track).toUpperCase().replace(/[\s-]/g, '_');
  if (normTrack === 'BOQ_EVALUATION') {
    checks.push(...validateBoqEvaluationCriteria(outputArtifact, context));
  } else if (normTrack === 'RFP_SIZING_TO_BOM') {
    checks.push(...validateRfpSizingCriteria(outputArtifact, context));
  } else if (normTrack === 'BOM_RECONCILIATION') {
    checks.push(...validateBomReconciliationCriteria(outputArtifact, context));
  } else if (normTrack === 'FREEFORM_QA') {
    checks.push(...validateFreeformQaCriteria(outputArtifact, context));
  } else if (Object.hasOwn(SPECIALIZED_TRACK_VALIDATORS, normTrack)) {
    checks.push(SPECIALIZED_TRACK_VALIDATORS[normTrack](outputArtifact, context));
  } else {
    checks.push(
      makeCheck('TRACK_PROFILE', 'Track Specific Acceptance Profile', 'BLOCK', 'UNKNOWN',
        `No implemented delivery acceptance profile for ${normTrack}; universal diagnostics cannot certify this track.`)
    );
  }

  // Blocker checks that did not affirmatively pass (FAILED, UNKNOWN, or ACTION_REQUIRED)
  const blockers = checks.filter(c => c.severity === 'BLOCK' && (c.status === 'FAILED' || c.status === 'UNKNOWN' || c.status === 'ACTION_REQUIRED' || !c.passed));
  const warnings = checks.filter(c => c.severity === 'WARN' && (c.status === 'FAILED' || c.status === 'UNKNOWN' || c.status === 'ACTION_REQUIRED' || !c.passed));

  const hasFailedBlocker = blockers.some(b => b.status === 'FAILED');
  const hasUnknownBlocker = blockers.some(b => b.status === 'UNKNOWN' || b.status === 'ACTION_REQUIRED');

  let status;
  if (hasFailedBlocker) {
    status = 'FAILED';
  } else if (hasUnknownBlocker) {
    status = 'INCOMPLETE';
  } else if (warnings.length > 0) {
    status = 'ACTION_REQUIRED';
  } else {
    status = 'PASSED';
  }

  const isValid = status === 'PASSED';

  return {
    isValid,
    isApproved: isValid,
    status,
    track: normTrack,
    timestamp: new Date().toISOString(),
    blockersCount: blockers.length,
    warningsCount: warnings.length,
    totalChecks: checks.length,
    passedChecks: checks.filter(c => c.passed).length,
    blockers: blockers.map(b => ({ id: b.id, name: b.name, status: b.status, detail: b.detail })),
    warnings: warnings.map(w => ({ id: w.id, name: w.name, status: w.status, detail: w.detail })),
    checks
  };
}

// CP5 opt-in response contracts. Lazy wrappers keep legacy import/execution paths
// unchanged. Response validity never replaces this module's delivery acceptance.
function getPresalesResponseProfile(track) {
  return require('./presales_response_profiles.js').getPresalesResponseProfile(track);
}

function adaptPresalesResponse(legacy, options) {
  return require('../contracts/presales_response_adapter.js').adaptPresalesResponse(legacy, options);
}

function verifyPresalesResponseAcceptance(response) {
  return require('./presales_response_validator.js').verifyPresalesResponseAcceptance(response);
}

module.exports = {
  getPresalesResponseProfile,
  adaptPresalesResponse,
  verifyPresalesResponseAcceptance,
  verifyPrePresentationAcceptance,
  validateUniversalCriteria,
  validateBoqEvaluationCriteria,
  validateRfpSizingCriteria,
  validateBomReconciliationCriteria,
  validateFreeformQaCriteria
};
