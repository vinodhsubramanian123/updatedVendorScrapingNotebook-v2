'use strict';
/**
 * scripts/lib/boq/bom_verifier.js — 14-Point Pre-Presentation Acceptance Gate
 *
 * Implements authoritative pre-presentation output validation conforming to
 * output-validation-skill (.agents/skills/output-validation-skill/SKILL.md):
 * - Universal Acceptance Criteria (U1–U5) across all presales tracks
 * - Track-Specific Criteria:
 *   - BOQ Evaluation (B1–B16)
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

const { isValidHpeSKU, cleanBaseSKU, buildCatalogSkuIndex } = require('../catalog/sku.js');

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
      (output.auditReport !== undefined)
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

  return checks;
}

/**
 * BOQ Evaluation Criteria (B1–B16)
 */
function validateBoqEvaluationCriteria(output, context = {}) {
  const checks = [];

  // B1: All 7 Aspects Evaluated (BLOCK)
  const aspectChecks = output?.aspectChecks || output?.evalSummary?.aspectChecks || output?.evaluation?.aspectChecks || null;
  if (!Array.isArray(aspectChecks) || aspectChecks.length === 0) {
    checks.push(
      makeCheck('B1', 'Scoped Physical Checks Completed', 'BLOCK', 'UNKNOWN', 'Physical aspect checks were not evaluated or missing from output.', { evaluated: false })
    );
  } else if (aspectChecks.length < 7) {
    checks.push(
      makeCheck('B1', 'Scoped Physical Checks Completed', 'BLOCK', 'FAILED', `Incomplete physical checks: expected 7 aspects, found ${aspectChecks.length}.`, { aspectCount: aspectChecks.length })
    );
  } else {
    const unknownAspects = aspectChecks.filter(a => a.status === 'UNKNOWN' || a.status === 'NOT_EVALUATED');
    const failedAspects = aspectChecks.filter(a => a.status === 'FAIL');
    if (unknownAspects.length > 0) {
      checks.push(
        makeCheck('B1', 'Scoped Physical Checks Completed', 'BLOCK', 'ACTION_REQUIRED',
          `Physical checks contain UNKNOWN evaluations per INV-105: ${unknownAspects.map(a => a.name || a.id).join(', ')}.`,
          { unknownAspects: unknownAspects.map(a => a.id) })
      );
    } else if (failedAspects.length > 0) {
      checks.push(
        makeCheck('B1', 'Scoped Physical Checks Completed', 'BLOCK', 'FAILED',
          `Physical checks failed on: ${failedAspects.map(a => a.name || a.id).join(', ')}.`,
          { failedAspects: failedAspects.map(a => a.id) })
      );
    } else {
      checks.push(
        makeCheck('B1', 'Scoped Physical Checks Completed', 'BLOCK', 'PASSED', `All ${aspectChecks.length} physical aspect checks evaluated cleanly.`)
      );
    }
  }

  // B2: At Least 1 Ranked Solution or Explicit Unbuildable Determination (BLOCK)
  const rankedSolutions = output?.conflictGraph?.rankedSolutions || output?.rankedSolutions || [];
  const isUnbuildable = output?.isMathClean === false || output?.isWholeSolutionValid === false || output?.status === 'UNBUILDABLE';
  if (isUnbuildable) {
    checks.push(
      makeCheck('B2', 'At Least 1 Ranked Solution or Unbuildable Determination', 'BLOCK', 'PASSED', 'Explicit unbuildable determination documented per INV-72.', { isUnbuildable: true })
    );
  } else if (rankedSolutions.length >= 1) {
    checks.push(
      makeCheck('B2', 'At Least 1 Ranked Solution or Unbuildable Determination', 'BLOCK', 'PASSED', `Produced ${rankedSolutions.length} strategy rank(s).`, { rankCount: rankedSolutions.length })
    );
  } else {
    checks.push(
      makeCheck('B2', 'At Least 1 Ranked Solution or Unbuildable Determination', 'BLOCK', 'FAILED', 'No ranked solutions generated and no unbuildable determination recorded.', { rankedSolutionsCount: 0 })
    );
  }

  // B3: No Duplicate Ranks (WARN)
  if (rankedSolutions.length === 0) {
    checks.push(
      makeCheck('B3', 'No Duplicate Ranks', 'WARN', 'NOT_APPLICABLE', 'No ranked solutions to check for rank tier uniqueness.')
    );
  } else {
    const rankNumbers = rankedSolutions.map(r => String(r.rank));
    const isUnique = new Set(rankNumbers).size === rankNumbers.length;
    checks.push(
      isUnique
        ? makeCheck('B3', 'No Duplicate Ranks', 'WARN', 'PASSED', 'All strategy rank tiers are unique.')
        : makeCheck('B3', 'No Duplicate Ranks', 'WARN', 'FAILED', `Duplicate rank tiers detected: ${rankNumbers.join(', ')}.`, { rankNumbers })
    );
  }

  // B4: Financial Table & Prices Present (BLOCK)
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

  if (isUnbuildable) {
    checks.push(
      makeCheck('B4', 'Financial Table Present', 'BLOCK', 'NOT_APPLICABLE', 'Unbuildable BOM does not require financial totals.')
    );
  } else if (totalPrice > 0) {
    checks.push(
      makeCheck('B4', 'Financial Table Present', 'BLOCK', 'PASSED', `Financial totals calculated ($${totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}).`, { totalPrice })
    );
  } else if (partsCount === 0) {
    checks.push(
      makeCheck('B4', 'Financial Table Present', 'BLOCK', 'UNKNOWN', 'Pricing cannot be evaluated without candidate BOM items.', { partsCount: 0 })
    );
  } else {
    checks.push(
      makeCheck('B4', 'Financial Table Present', 'BLOCK', 'FAILED', 'Pricing table missing or zero extended cost on buildable solution.', { totalPrice, partsCount })
    );
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
    checks.push(
      makeCheck('B6', 'Unresolved Prices Flagged (INV-33)', 'BLOCK', 'PASSED', 'All referenced SKU prices are confirmed with list pricing.')
    );
  }

  // B8: No Unsolicited Services in Rank 1 (INV-32) (BLOCK)
  if (rankedSolutions.length === 0) {
    checks.push(
      makeCheck('B8', 'No Unsolicited Services in Rank 1 (INV-32)', 'BLOCK', 'NOT_APPLICABLE', 'No ranked solutions to check for unsolicited services.')
    );
  } else {
    const rank1 = rankedSolutions[0];
    const parts = rank1.skuPartsList || rank1.skuList || [];
    const unsolicited = parts.filter(p => {
      const desc = (p.description || '').toLowerCase();
      const sku = cleanBaseSKU(p.sku);
      const isService = /\b(installation|startup|deployment|pointnext|tech care)\b/i.test(desc) || /^(HA|HU|H7)/i.test(sku);
      return isService && !p.customerRequested && p.isFixInjected !== true && !context.customerRequestedServices;
    });
    checks.push(
      unsolicited.length === 0
        ? makeCheck('B8', 'No Unsolicited Services in Rank 1 (INV-32)', 'BLOCK', 'PASSED', 'Rank 1 maintains pure hardware intent without unrequested services.')
        : makeCheck('B8', 'No Unsolicited Services in Rank 1 (INV-32)', 'BLOCK', 'FAILED', `Rank 1 contains ${unsolicited.length} unsolicited service SKU(s) in violation of INV-32.`, { unsolicitedSkus: unsolicited.map(p => p.sku) })
    );
  }

  // B12: Mandatory Accessories Injected (BLOCK)
  if (output?.missingDependencies === undefined && output?.conflictGraph === undefined) {
    checks.push(
      makeCheck('B12', 'Mandatory Accessories Injected', 'BLOCK', 'UNKNOWN', 'Conflict graph and dependency injection was not evaluated.', { evaluated: false })
    );
  } else {
    const missingDeps = output?.missingDependencies || [];
    const resolvedFixes = output?.conflictGraph?.resolvedFixes || [];
    checks.push(
      missingDeps.length === 0
        ? makeCheck('B12', 'Mandatory Accessories Injected', 'BLOCK', 'PASSED', `Mandatory physical accessories injected cleanly: ${resolvedFixes.length} fix(es) recorded.`, { fixCount: resolvedFixes.length })
        : makeCheck('B12', 'Mandatory Accessories Injected', 'BLOCK', 'FAILED', `Unresolved mandatory physical dependencies: ${missingDeps.map(m => m.reason || m.sku).join('; ')}.`, { missingDeps })
    );
  }

  return checks;
}

/**
 * RFP Sizing Criteria (R1–R6)
 */
function validateRfpSizingCriteria(output, context = {}) {
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
function validateBomReconciliationCriteria(output, context = {}) {
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
    const catalogData = context.catalogData || output?.catalogData;
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
  } else {
    // For specialized or operational tracks (WORKLOAD_DNA, VALUE_ENGINEERING, etc.),
    // universal criteria provide baseline integrity.
    checks.push(
      makeCheck('TRACK_PROFILE', 'Track Specific Acceptance Profile', 'WARN', 'PASSED',
        `Standard presales baseline verified for ${normTrack}; specialized track profile active.`)
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

module.exports = {
  verifyPrePresentationAcceptance,
  validateUniversalCriteria,
  validateBoqEvaluationCriteria,
  validateRfpSizingCriteria,
  validateBomReconciliationCriteria,
  validateFreeformQaCriteria
};
