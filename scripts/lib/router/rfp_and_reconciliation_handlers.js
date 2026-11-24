'use strict';
/**
 * scripts/lib/router/rfp_and_reconciliation_handlers.js
 * Handlers for RFP_SIZING_TO_BOM, BOM_RECONCILIATION, HETEROGENEOUS_TENDER_MODERNIZATION, and CROSS_VENDOR_TRANSFORMATION.
 */

const fs = require('fs');
const path = require('path');
const { evaluateBOQMultiAspect } = require('../boq/boq_evaluator.js');
const { isValidHpeSKU, classifyCommercialFulfillmentMode } = require('../catalog/sku.js');
const { resolveRequirementIntent } = require('../boq/requirement_intent_resolver.js');
const { verifyVendorBOM, auditSingleVendorBOM } = require('../boq/vendor_bom_verifier.js');
const logger = require('../system/pipeline_logger.js');
const {
  ALLETRA_MP_CATALOGS,
  COMPETITOR_VENDORS,
  OCR_IMAGE_EXTENSIONS,
  getChassisMap,
  getBaseChassisSku,
  getChassisCatalog,
  _resolveContextPolicy,
  readRoutedItems
} = require('./platform_catalog_resolver.js');

function _parseRfpRawLines(queryText) {
  let rawLines = queryText.split(/[\r\n;]+/).map(l => l.trim()).filter(Boolean);
  if (rawLines.length === 1) {
    const clauses = queryText.split(/(?:\s+(?:with|and|plus)\s+|,\s*)/i).map(c => c.replace(/^(?:and|with|plus)\s+/i, '').trim()).filter(Boolean);
    if (clauses.length > 1) rawLines = clauses;
  }
  if (rawLines.length > 1) {
    const first = rawLines[0];
    const hasSpec = /\b(?:processor|cpu|cores?|memory|ram|dimm|gpus?|accelerators?|h200|h100|drive|drives|storage|nvme|ssd|nic|adapter|power)\b/i.test(first);
    if (!hasSpec && /\b(?:dl\s*\d{3}|sy\s*\d{3}|alletra|cray|sn\s*\d{4}|proliant|size\s+a|build\s+a|need\s+a)\b/i.test(first)) {
      rawLines.shift();
    }
  }
  return rawLines;
}

function _inferResolutionQuantity(r) {
  const qtyMatch = r.input.match(/\b(\d+)\s*(?:x|units?|pcs?|processors?|cpus?|dimms?|drives?|ssds?|psus?)\b/i);
  if (qtyMatch) return parseInt(qtyMatch[1], 10) || 1;
  if (r.expectedRole === 'Processor' && r.input.toLowerCase().includes('dual')) return 2;
  return 1;
}

function _scaleCandidateItemForCluster(item, count, isBase = false) {
  const { isGlobalItem } = require('../boq/configuration_context.js');
  const perNode = item.quantity ?? 1;
  const globalItem = !isBase && isGlobalItem(item, count);
  const totalQty = globalItem ? perNode : perNode * count;
  return {
    ...item,
    quantity: totalQty,
    perNodeQuantity: globalItem ? null : perNode,
    clusterQuantity: totalQty,
    quantityScope: globalItem ? 'global' : 'configuration',
    configurationId: globalItem ? null : 'configuration-1',
    configurationMultiplier: globalItem ? 1 : count,
    quantityBasis: count > 1 || globalItem ? 'total' : 'base'
  };
}

function _buildRfpCandidateItems(chassisInfo, rawLines, serverCount) {
  const unresolvedRequirements = rawLines.map(line => ({ line }));
  if (!chassisInfo.catalogData) {
    return { sizingResult: null, candidateItems: [], evaluation: null };
  }

  const sizingResult = resolveRequirementIntent({
    rawLines,
    unresolvedRequirements,
    catalogData: chassisInfo.catalogData,
    productConfirmed: true
  });

  const singleNodeItems = [];
  const baseSku = getBaseChassisSku(chassisInfo.chassisKey);
  if (baseSku) {
    singleNodeItems.push({
      sku: baseSku,
      quantity: 1,
      description: `${chassisInfo.chassisKey} CTO Base Chassis`
    });
  }

  for (const r of (sizingResult.resolutions || [])) {
    const sku = r.appliedSku || r.candidates?.[0]?.sku;
    if (sku && isValidHpeSKU(sku)) {
      singleNodeItems.push({
        sku,
        quantity: _inferResolutionQuantity(r),
        description: r.candidates?.[0]?.description || r.input,
        role: r.expectedRole,
        confidence: r.confidence
      });
    }
  }

  let evaluation = null;
  if (singleNodeItems.length > 0) {
    try {
      evaluation = evaluateBOQMultiAspect(singleNodeItems, {
        chassis: chassisInfo.chassisKey,
        targetDir: chassisInfo.catalogDir || '',
        catalogData: chassisInfo.catalogData,
        productConfirmed: !chassisInfo.isAmbiguous,
        serverCount
      });
    } catch (evalErr) {
      evaluation = { error: evalErr.message };
    }
  }

  const count = (typeof serverCount === 'number' && serverCount > 0) ? serverCount : 1;
  const candidateItems = singleNodeItems.map((item, idx) =>
    _scaleCandidateItemForCluster(item, count, idx === 0 && Boolean(baseSku))
  );
  return { sizingResult, candidateItems, evaluation };
}

function _recordRfpSizingLedger(queryText, context, chassisInfo, serverCount, rawLines, candidateItems, sizingResult, evaluation) {
  try {
    const { createEvidenceLedger } = require('../system/evidence_ledger.js');
    const crypto = require('crypto');
    const ledger = createEvidenceLedger({
      chassis: chassisInfo.chassisKey,
      serverCount,
      totalRequestedLines: rawLines.length,
      query: queryText,
      filePath: context.filePath || null
    });
    const traceId = ledger.traceId;
    ledger.customerInput.filePath = context.filePath || 'QUERY_INPUT_SIZING';
    ledger.customerInput.queryText = queryText;
    ledger.recordArtifact('CUSTOMER_INPUT', null, {
      queryText,
      sha256: crypto.createHash('sha256').update(queryText).digest('hex'),
      exists: true
    });

    ledger.startPhase(1, 'Presales Sizing Intake & Parsing', { query: queryText, serverCount });
    ledger.completePhase(1, 'PASSED', { rawLineCount: rawLines.length, serverCount });

    ledger.startPhase(2, 'Dynamic Catalog Resolution', { chassis: chassisInfo.chassisKey });
    ledger.completePhase(2, chassisInfo.catalogData ? 'PASSED' : 'ACTION_REQUIRED', { chassisKey: chassisInfo.chassisKey });

    ledger.startPhase(3, '7-Aspect Physical Evaluation of Sized Candidate BOM', { candidateItemCount: candidateItems.length });
    if (candidateItems.length === 0) {
      ledger.recordSkuAudit(
        'UNRESOLVED_TARGET', 'UNRESOLVED_SIZING_TARGET',
        chassisInfo.error || 'No candidate SKUs synthesized because target product catalog could not be resolved.',
        null, 'Unresolved Sizing Target',
        { chassisKey: chassisInfo.chassisKey, rawLineCount: rawLines.length, serverCount }
      );
    }
    for (const item of candidateItems) {
      ledger.recordSkuAudit(
        item.sku, 'SIZED_CANDIDATE_SKU',
        item.description || 'Synthesized from natural language sizing specification',
        null, item.role || item.category || 'Candidate Component',
        { quantity: item.quantity, serverCount }
      );
    }
    const phase3Pass = Boolean(evaluation && !evaluation.error && evaluation.mathFrameworkPass === true && !evaluation.errors?.length);
    ledger.completePhase(3, phase3Pass ? 'PASSED' : 'ACTION_REQUIRED', {
      errors: evaluation?.errors?.length || 0,
      confidenceScore: evaluation?.confidence?.score || null
    });

    const isClarificationFree = Boolean(sizingResult && !sizingResult.requiresHumanClarification);
    ledger.startPhase(4, 'Workload DNA & Construction Plan Analysis', { constructionPlan: sizingResult?.constructionPlan || [] });
    ledger.completePhase(4, isClarificationFree ? 'PASSED' : 'ACTION_REQUIRED', { resolutionsCount: sizingResult?.resolutions?.length || 0 });

    ledger.startPhase(5, 'Strategy Synthesis & Multi-Node Cluster Sizing', { serverCount });
    ledger.completePhase(5, 'ACTION_REQUIRED', { clusterSizing: evaluation?.clusterSizing || null, reason: 'Sized candidates require full pipeline validation before ranking or delivery.' });

    ledger.startPhase(6, 'Confidence Floor & Presales Clarification Scoring', { requiresClarification: sizingResult?.requiresHumanClarification });
    ledger.completePhase(6, isClarificationFree ? 'PASSED' : 'ACTION_REQUIRED', {
      requiresHumanClarification: sizingResult?.requiresHumanClarification
    });

    ledger.startPhase(7, 'QuickSpecs & Dynamic Catalog Verification', { chassisKey: chassisInfo.chassisKey });
    ledger.completePhase(7, 'ACTION_REQUIRED', { catalogAvailable: Boolean(chassisInfo.catalogData), reason: 'QuickSpecs and whole-candidate NotebookLM review have not run in the sizing path.' });

    ledger.startPhase(8, 'Presales Candidate BOM Generation', { itemCount: candidateItems.length });
    ledger.completePhase(8, 'ACTION_REQUIRED', { candidateBOM: candidateItems, reason: 'Draft sizing output only; no validated portal workbook or Google Sheet delivery.' });

    ledger.startPhase(9, 'Presales Evidence Trace Finalization', {});
    ledger.completePhase(9, 'ACTION_REQUIRED', { status: 'SIZING_DRAFT', reason: 'Knowledge synchronization has not run in the sizing path.' });

    const exported = ledger.finalizeAndExport();
    return { traceId, evidenceLogPath: exported.jsonPath };
  } catch (err) {
    logger.warn('ROUTE_QUERY', 'Failed to finalize RFP sizing evidence ledger', err);
    return { traceId: null, evidenceLogPath: null };
  }
}

async function _continueRfpEvaluationIfRequested(context, candidateItems, chassisInfo, serverCount, traceId, runEvaluationPipeline) {
  const shouldContinue = Boolean(context.continueEvaluation || context.evaluateImmediately || context.evaluate);
  if (!shouldContinue || candidateItems.length === 0 || typeof runEvaluationPipeline !== 'function') return null;
  try {
    const inheritedDefaultCloud = context.effectivePolicy?.source === 'DEFAULT_CLOUD_PERMITTED' && context.enableCloudValidation !== true;
    const evalPolicy = _resolveContextPolicy(
      inheritedDefaultCloud ? { ...context, offline: undefined, offlineMode: undefined, effectivePolicy: null } : context,
      { defaultOffline: true }
    );
    return await runEvaluationPipeline({
      inputItems: candidateItems,
      chassisDir: chassisInfo.catalogDir,
      serverCount,
      OFFLINE_MODE: evalPolicy.offline,
      effectivePolicy: evalPolicy,
      JSON_MODE: true,
      traceId,
      deadline: context.deadline || null,
      cancellationToken: context.cancellationToken || null,
      options: context.options || {}
    });
  } catch (evalErr) {
    return { status: 'ERROR', error: evalErr.message };
  }
}

function _buildRfpMissingRequirements(chassisInfo, candidateItems) {
  const coveredRoles = new Set(candidateItems.map(it => it.role).filter(Boolean));
  const hasCatalog = Boolean(chassisInfo?.catalogData && chassisInfo?.chassisKey && chassisInfo.chassisKey !== 'UNKNOWN_PRODUCT');
  const missing = [];
  if (!hasCatalog) missing.push('Target Product Catalog');
  for (const role of ['Processor', 'Memory', 'Drive Cage / Drive']) {
    if (!coveredRoles.has(role)) missing.push(role);
  }
  return { missingRequirements: missing, requiresClarification: missing.length > 0 || candidateItems.length < 3 || Boolean(chassisInfo.isAmbiguous) };
}

function _buildRfpCandidateReference(context, chassisInfo, candidateItems, serverCount, traceId, effectivePolicy, missingRequirements, requiresClarification) {
  const crypto = require('crypto');
  const digest = crypto.createHash('sha256').update(JSON.stringify(candidateItems.map(it => ({ sku: it.sku, quantity: it.quantity, quantityScope: it.quantityScope })))).digest('hex');
  return {
    parentRunId: context.runId || traceId,
    product: chassisInfo.chassisKey,
    chassisDir: chassisInfo.catalogDir || null,
    serverCount,
    nodeCount: serverCount,
    quantityBasis: serverCount > 1 ? 'CLUSTER_MULTIPLIED' : 'SINGLE_NODE',
    items: candidateItems,
    digest,
    missingRequirements,
    requiresHumanClarification: requiresClarification,
    offlineMode: effectivePolicy.offline,
    effectivePolicy
  };
}

function _buildAlletraMpSizingHandoff(queryText, chassisInfo) {
  const chassis = chassisInfo.chassisKey;
  const isBlock = chassis === 'Alletra_MP_B10000';
  const product = getChassisMap()[chassis];
  const switchless = isBlock && /\b(?:b101(?:00|20|30|40)|s0b84a|switchless)\b/i.test(queryText);
  const switched = isBlock && /\b(?:b102(?:00|30|40)|s1r06a|switched)\b/i.test(queryText);
  const hasConflictingTopologies = switchless && switched;
  const topology = hasConflictingTopologies ? null : switchless
    ? { type: 'SWITCHLESS', baseSku: product.switchlessBaseSku }
    : switched ? { type: 'SWITCHED', baseSku: product.switchedBaseSku } : null;
  const nextStep = 'Size the array in HPE Ninja Online and export the OCA JSON. Import it into HPE OCA to complete optics, cabling, support and CLIC validation.';
  const message = hasConflictingTopologies
    ? 'B10100 switchless and B10200 switched require separate arrays. Specify one topology per array. ' + nextStep
    : nextStep;

  let ninjaEnvelope = null;
  try {
    const { interpolateAlletraMpEnvelope } = require('../conflict/sizing/scaling_interpolator.js');
    const drivesMatch = String(queryText || '').match(/\b(\d+)\s*(?:nvme|sas|ssd)?\s*drives?\b/i);
    const pbMatch = String(queryText || '').match(/\b(\d+(?:\.\d+)?)\s*PB\b/i);
    const tbMatch = String(queryText || '').match(/\b(\d+(?:\.\d+)?)\s*TB\b/i);
    const targetUsableTb = pbMatch ? Number(pbMatch[1]) * 1000 : (tbMatch ? Number(tbMatch[1]) : null);
    const telemetryPath = chassisInfo.catalogDir
      ? path.join(chassisInfo.catalogDir, 'raw_data', 'ninja_online_sizing_catalog.json')
      : null;
    ninjaEnvelope = interpolateAlletraMpEnvelope({
      product: chassis,
      targetDriveCount: drivesMatch ? Number(drivesMatch[1]) : null,
      targetUsableTb,
      preferredTopology: topology?.type || null,
      ...(telemetryPath ? { telemetryPath } : {})
    });
  } catch {
    ninjaEnvelope = null;
  }

  return {
    intent: 'RFP_SIZING_TO_BOM',
    chassis,
    chassisDir: chassisInfo.catalogDir,
    productType: 'storage',
    chassisInfo: { model: product.model, gen: product.gen, family: product.family, formFactor: product.formFactor },
    status: 'ACTION_REQUIRED',
    code: 'NINJA_ONLINE_SIZING_REQUIRED',
    message,
    storageSizingHandoff: {
      product: chassis,
      topology,
      hasConflictingTopologies,
      ...(ninjaEnvelope ? {
        telemetryPresent: ninjaEnvelope.telemetryPresent,
        telemetrySource: ninjaEnvelope.telemetrySource,
        capturedAt: ninjaEnvelope.capturedAt,
        ...(isBlock
          ? {
              crossoverAnalysis: ninjaEnvelope.switchlessToSwitchedCrossover,
              driveAndJbofLimits: {
                estimatedDriveCount: ninjaEnvelope.estimatedDriveCount,
                recommendedTopology: ninjaEnvelope.recommendedTopology,
                recommendedBaseSku: ninjaEnvelope.recommendedBaseSku,
                internalChassisDrives: ninjaEnvelope.internalChassisDrives,
                requiredJbofs: ninjaEnvelope.requiredJbofs,
                availableDriveCapacitiesTb: ninjaEnvelope.availableDriveCapacitiesTb
              },
              topologyEnvelopes: ninjaEnvelope.nodeEnvelopes
            }
          : {
              maxBounds: ninjaEnvelope.maxBounds,
              topologyEnvelopes: ninjaEnvelope.mediaEnvelopes,
              tlcVsQlcComparison: ninjaEnvelope.tlcVsQlcComparison
            })
      } : {})
    },
    missingRequirements: ['HPE Ninja Online sizing and OCA JSON export'],
    requiresHumanClarification: true,
    portalValidationStatus: 'PORTAL_VALIDATION_PENDING',
    items: [],
    candidateBOM: []
  };
}

async function _handleRfpSizing(queryText, context, chassisInfo = getChassisCatalog(queryText, context), runEvaluationPipeline = null) {
  if (ALLETRA_MP_CATALOGS.has(chassisInfo.chassisKey)) {
    return _buildAlletraMpSizingHandoff(queryText, chassisInfo);
  }
  const nodeMatch = queryText.match(/\b(\d+)\s*(?:nodes?|servers?|units?|appliances?|clusters?)\b/i);
  const serverCount = nodeMatch ? parseInt(nodeMatch[1], 10) : (context.serverCount || 1);
  const rawLines = _parseRfpRawLines(queryText);

  const { sizingResult, candidateItems, evaluation } = _buildRfpCandidateItems(chassisInfo, rawLines, serverCount);
  const { traceId, evidenceLogPath } = _recordRfpSizingLedger(
    queryText, context, chassisInfo, serverCount, rawLines, candidateItems, sizingResult, evaluation
  );
  const evaluatedSolution = await _continueRfpEvaluationIfRequested(context, candidateItems, chassisInfo, serverCount, traceId, runEvaluationPipeline);
  const status = candidateItems.length === 0 ? 'REQUIRES_HUMAN_CLARIFICATION' : (evaluatedSolution?.status || (evaluatedSolution ? 'EVALUATION_COMPLETE' : 'SIZING_DRAFT'));
  const effectivePolicy = _resolveContextPolicy(context, { defaultOffline: false, includeRagOnly: false });
  const { missingRequirements, requiresClarification } = _buildRfpMissingRequirements(chassisInfo, candidateItems);
  const { rankClarificationsByValueOfInformation, collectScopedIntakeTrapAdvisories } = require('../conflict/sizing/voi_clarification_ranker.js');
  const { prioritizedClarifications } = rankClarificationsByValueOfInformation(missingRequirements, { serverCount });
  const scopedIntakeTraps = collectScopedIntakeTrapAdvisories(chassisInfo?.chassisKey, { chassisDir: chassisInfo?.catalogDir });
  const candidateReference = _buildRfpCandidateReference(context, chassisInfo, candidateItems, serverCount, traceId, effectivePolicy, missingRequirements, requiresClarification);

  return {
    intent: 'RFP_SIZING_TO_BOM',
    chassis: chassisInfo.chassisKey,
    chassisDir: candidateReference.chassisDir,
    serverCount,
    nodeCount: serverCount,
    quantityBasis: candidateReference.quantityBasis,
    effectivePolicy,
    candidateReference,
    items: candidateItems,
    clusterSizing: evaluation?.clusterSizing || null,
    sizingRequirements: sizingResult?.intent || null,
    categoryCoverage: sizingResult?.categoryCoverage || null,
    resolutions: sizingResult?.resolutions || [],
    constructionPlan: sizingResult?.constructionPlan || [],
    requiresHumanClarification: requiresClarification,
    missingRequirements,
    prioritizedClarifications,
    scopedIntakeTraps,
    candidateBOM: candidateItems,
    isStartingBomDraft: !evaluatedSolution,
    isEvaluationComplete: Boolean(evaluatedSolution),
    evaluation,
    evaluatedSolution,
    traceId,
    evidenceLogPath,
    status
  };
}

function _formatReconciliationMessage(auditReport, actuallyTwoBaseline, singleFileNote, chassisKey) {
  if (actuallyTwoBaseline) {
    if (auditReport.is100PercentMatch) {
      return 'Vendor quote perfectly matches proposed configuration.';
    }
    const disc = auditReport.discrepancies || {};
    const parts = [];
    if (disc.addedByVendor?.length) parts.push(`${disc.addedByVendor.length} added`);
    if (disc.removedByVendor?.length) parts.push(`${disc.removedByVendor.length} removed`);
    if (disc.quantityDeltas?.length) parts.push(`${disc.quantityDeltas.length} quantity delta(s)`);
    if (disc.priceDeltas?.length) parts.push(`${disc.priceDeltas.length} price delta(s)`);
    if (disc.pricingGaps?.length) parts.push(`${disc.pricingGaps.length} pricing gap(s)`);
    if (disc.uncatalogedSkus?.length) parts.push(`${disc.uncatalogedSkus.length} uncataloged SKU(s)`);
    const detail = parts.length > 0 ? parts.join(', ') : 'discrepancies';
    return `Reconciliation identified ${detail}.`;
  }
  const pricingGapsCount = auditReport.discrepancies?.pricingGaps?.length || 0;
  const uncatCount = auditReport.uncatalogedSkus?.length || 0;
  if (auditReport.isCatalogClean && pricingGapsCount === 0) {
    return `Single-file vendor quote cleanly matched against catalog ${chassisKey}. ${singleFileNote}`;
  }
  const issues = [];
  if (uncatCount > 0) issues.push(`${uncatCount} uncataloged SKU(s)`);
  if (pricingGapsCount > 0) issues.push(`${pricingGapsCount} pricing gap(s)`);
  const issueText = issues.length > 0 ? ` (${issues.join(', ')} identified)` : '';
  return `Single-file vendor quote audited against catalog ${chassisKey}${issueText}. ${singleFileNote}`;
}

function _normalizeUncatalogedSkus(skus = []) {
  return skus.map(entry => {
    const skuCode = typeof entry === 'string' ? entry : (entry?.sku || '');
    const valid = isValidHpeSKU(skuCode);
    const fulfillment = valid ? classifyCommercialFulfillmentMode(skuCode) : null;
    return {
      ...(typeof entry === 'object' ? entry : {}),
      sku: skuCode,
      isValidFormat: valid,
      isSmartChoiceBto: Boolean(fulfillment?.isSmartChoiceBto),
      note: fulfillment?.isSmartChoiceBto
        ? fulfillment.guidance
        : (valid
          ? 'Valid HPE SKU format; uncataloged in current scraped snapshot (check latest QuickSpecs or regional catalog).'
          : 'Unrecognized SKU format; potential typo or non-HPE part number.')
    };
  });
}

function _resolveReconciliationBaseline(customerFile, context) {
  if (customerFile && fs.existsSync(customerFile)) {
    const parsedDetailed = require('../boq/boq_evaluator').parseAndConsolidateBOQDetailed('', customerFile, context.targetSheet);
    const baseItems = parsedDetailed?.items?.length ? parsedDetailed.items : readRoutedItems({ filePath: customerFile, targetSheet: context.targetSheet });
    if (Array.isArray(baseItems) && baseItems.length > 0) {
      const nodeMult = Number(context.nodeMultiplier || context.nodes || 1);
      const { isGlobalItem } = require('../boq/configuration_context');
      const scaledItems = Number.isInteger(nodeMult) && nodeMult > 1
        ? baseItems.map(it => (isGlobalItem(it, 1) ? { ...it, quantityScope: 'global' } : { ...it, quantity: (it.quantity || 1) * nodeMult }))
        : baseItems;
      return {
        proposedSolution: { rank: 1, name: 'Original customer baseline', skuList: scaledItems },
        isTwoBaseline: true,
        customerFileEmpty: false
      };
    }
    return { proposedSolution: null, isTwoBaseline: false, customerFileEmpty: true };
  }
  if (context.proposedSolution) {
    const pItems = context.proposedSolution.skuList || context.proposedSolution.skuPartsList || [];
    if (Array.isArray(pItems) && pItems.length > 0) {
      return { proposedSolution: context.proposedSolution, isTwoBaseline: true, customerFileEmpty: false };
    }
  }
  return { proposedSolution: null, isTwoBaseline: false, customerFileEmpty: false };
}

function _handleBomReconciliation(queryText, context) {
  const chassisInfo = getChassisCatalog(queryText, context);
  const vendorFile = context.vendorFilePath || context.secondaryFilePath || (context.filePath?.toLowerCase().includes('vendor') ? context.filePath : null);
  const customerFile = context.customerFilePath || (context.secondaryFilePath ? context.filePath : null);

  if (vendorFile && fs.existsSync(vendorFile)) {
    const { proposedSolution, isTwoBaseline, customerFileEmpty } = _resolveReconciliationBaseline(customerFile, context);
    const skipQuarantine = context.skipQuarantine === true || process.env.NODE_ENV === 'test';
    const auditReport = isTwoBaseline
      ? verifyVendorBOM(path.resolve(vendorFile), proposedSolution, chassisInfo.catalogDir, { skipQuarantine })
      : auditSingleVendorBOM(path.resolve(vendorFile), chassisInfo.catalogDir);

    const actuallyTwoBaseline = isTwoBaseline && Boolean(auditReport?.isTwoBaselineComparison);
    if (auditReport?.discrepancies?.uncatalogedSkus?.length) {
      auditReport.discrepancies.uncatalogedSkus = _normalizeUncatalogedSkus(auditReport.discrepancies.uncatalogedSkus);
    }
    const singleFileNote = customerFileEmpty
      ? 'Note: Customer tender was provided but contained no recognizable items; comparison requires both valid files.'
      : 'Note: Customer tender was not provided; comparison requires both files.';

    return {
      intent: 'BOM_RECONCILIATION',
      status: actuallyTwoBaseline ? 'RECONCILIATION_COMPLETE' : 'SINGLE_FILE_AUDIT',
      isTwoBaselineComparison: actuallyTwoBaseline,
      auditReport,
      message: _formatReconciliationMessage(auditReport, actuallyTwoBaseline, singleFileNote, chassisInfo.chassisKey),
      suggestedAction: actuallyTwoBaseline ? null : 'SUPPLY_CUSTOMER_TENDER_FOR_FULL_RECONCILIATION'
    };
  }
  if (context.filePath && fs.existsSync(context.filePath)) {
    const auditReport = auditSingleVendorBOM(path.resolve(context.filePath), chassisInfo.catalogDir);
    if (auditReport?.discrepancies?.uncatalogedSkus?.length) {
      auditReport.discrepancies.uncatalogedSkus = _normalizeUncatalogedSkus(auditReport.discrepancies.uncatalogedSkus);
    }
    return {
      intent: 'BOM_RECONCILIATION',
      status: 'SINGLE_FILE_AUDIT',
      isTwoBaselineComparison: false,
      auditReport,
      message: _formatReconciliationMessage(auditReport, false, 'Note: Customer tender was not provided; comparison requires both files.', chassisInfo.chassisKey),
      suggestedAction: 'SUPPLY_CUSTOMER_TENDER_FOR_FULL_RECONCILIATION'
    };
  }
  return {
    intent: 'BOM_RECONCILIATION',
    status: 'INPUT_REQUIRED',
    isTwoBaselineComparison: false,
    message: 'BOM Reconciliation requires a vendor quote file (--vendor) and customer tender file (--customer).',
    suggestedAction: 'UPLOAD_VENDOR_AND_CUSTOMER_SPREADSHEETS'
  };
}

async function _handleHeterogeneousTenderModernization(queryText, context) {
  const { HeterogeneousTenderModernizer } = require('../boq/heterogeneous_tender_modernizer.js');
  const modernizer = new HeterogeneousTenderModernizer({
    defaultServerPlatform: context.targetPlatform || context.chassisName,
    strictZeroJargon: true
  });

  let parsedTables = context.tables || context.sheets;
  if (!parsedTables && Array.isArray(context.items) && context.items.length > 0) {
    parsedTables = [{ title: context.title || 'Tender Items', items: context.items, multiplier: context.multiplier || 1 }];
  }
  if (!parsedTables && context.filePath) {
    const ext = path.extname(context.filePath).toLowerCase();
    if (ext === '.json') {
      const data = JSON.parse(fs.readFileSync(context.filePath, 'utf8'));
      parsedTables = data.tables || data.sheets || (Array.isArray(data) ? data : data.items ? [{ items: data.items }] : null);
    } else if (['.xlsx', '.xls', '.csv'].includes(ext)) {
      try {
        const XLSX = require('xlsx-js-style');
        const workbook = XLSX.readFile(context.filePath);
        const { parseSkuLines } = require('../boq/boq_parser.js');
        parsedTables = workbook.SheetNames.map(name => {
          const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '' });
          const flatLines = rows.map(r => (Array.isArray(r) ? r.join(' ') : String(r))).filter(l => l.trim().length > 0);
          const parsed = parseSkuLines(flatLines);
          return { title: name, items: parsed.items || [] };
        }).filter(table => table.items.length > 0);
      } catch (fileErr) {
        logger.warn('HETEROGENEOUS_TENDER', `Failed to parse workbook ${context.filePath}: ${fileErr.message}`);
      }
    }
  }

  if (!parsedTables || (Array.isArray(parsedTables) && !parsedTables.length)) {
    return {
      intent: 'HETEROGENEOUS_TENDER_MODERNIZATION',
      status: 'STRUCTURED_TENDER_REQUIRED',
      message: 'Supply nonempty parsed tables with owned items and quantity multipliers. Ingest spreadsheet/PDF files before modernization.'
    };
  }
  const categorized = modernizer.categorizeTenderItems(parsedTables);
  const carrierFleet = modernizer.synthesizeCarrierFleet(categorized.unbuildableAdHoc);
  const deliverables = modernizer.buildDualDeliverables(categorized, carrierFleet);

  return {
    intent: 'HETEROGENEOUS_TENDER_MODERNIZATION',
    skillTarget: 'heterogeneous-tender-modernizer',
    status: 'DRAFT_VALIDATION_REQUIRED',
    portalValidationStatus: 'PORTAL VALIDATION PENDING',
    carrierFleetStatus: carrierFleet.status,
    unresolvedItems: carrierFleet.unresolvedItems,
    unresolvedTables: categorized.unresolved,
    carrierFleetSummary: {
      totalPools: carrierFleet.carrierPools.length,
      pools: carrierFleet.carrierPools.map(p => ({
        poolId: p.poolId,
        chassisCount: p.chassisCount,
        targetMemory: p.targetMemoryCapacity,
        totalDimms: p.totalDimms,
        absorbedRequirement: p.absorbedRequirement,
        nicsProvisioned: p.nics?.totalProvisioned || 0
      }))
    },
    deliverables,
    deliverableSummary: {
      productionSystemsCount: categorized.servers.length + categorized.storage.length + categorized.sanFabric.length + categorized.tapeBackup.length,
      carrierNodesCount: carrierFleet.carrierPools.reduce((sum, p) => sum + p.chassisCount, 0),
      rulesEnforced: deliverables.clientMatrix.rulesEnforced
    },
    evidenceLedgerCount: modernizer.evidenceLedger.length
  };
}

function _detectVendorFromText(str) {
  const lower = typeof str === 'string' ? str.toLowerCase() : '';
  return COMPETITOR_VENDORS.find(vendor => lower.includes(vendor))?.toUpperCase() || null;
}

async function _ingestCompetitorFileInput(context, currentSourceVendor) {
  if (!context.filePath) {
    return { inputData: context.competitorSpec, ocrProvenance: null, sourceVendor: currentSourceVendor };
  }
  const extension = path.extname(context.filePath).toLowerCase();
  if (OCR_IMAGE_EXTENSIONS.includes(extension)) {
    if (!fs.existsSync(context.filePath)) {
      return { earlyReturn: { intent: 'CROSS_VENDOR_TRANSFORMATION', status: 'FILE_NOT_FOUND', error: `Target image file not found: ${context.filePath}` } };
    }
    const policy = _resolveContextPolicy(context, { defaultOffline: false });
    if (policy.offline) {
      return {
        earlyReturn: {
          intent: 'CROSS_VENDOR_TRANSFORMATION',
          status: 'OFFLINE_INPUT_REQUIRED',
          error: 'Local-only execution is active. Image and scanned PDF OCR require cloud processing. Please provide tabular text (CSV/XLSX) or paste quote text.',
          remediationAction: 'Provide pasted text or a supported tabular file (CSV/XLSX).',
          isOcrProcessed: false,
          effectivePolicy: policy
        }
      };
    }
    const { performGeminiOcr } = require('../ocr/ocr_service.js');
    const ocrResult = await performGeminiOcr(context.filePath, {
      ...context, offline: policy.offline, offlineMode: policy.offline, effectivePolicy: policy
    });
    if (!ocrResult || !ocrResult.isOcrProcessed || ocrResult.ocrStatus !== 'SUCCESS' || !ocrResult.text) {
      return {
        earlyReturn: {
          intent: 'CROSS_VENDOR_TRANSFORMATION',
          status: ocrResult?.ocrStatus === 'OFFLINE_BLOCKED' ? 'OFFLINE_INPUT_REQUIRED' : 'OCR_EXTRACTION_FAILED',
          error: ocrResult?.rawError || ocrResult?.text || 'OCR processing failed for competitor image quote.',
          remediationAction: ocrResult?.remediationAction || 'Check image clarity or provide structured text/JSON quote.',
          isOcrProcessed: false,
          effectivePolicy: policy
        }
      };
    }
    const inputData = ocrResult.text;
    const ocrProvenance = {
      sourceDocument: path.resolve(context.filePath),
      modelUsed: ocrResult.modelUsed,
      lineCount: ocrResult.lineCount,
      detectedSkus: ocrResult.detectedSkus
    };
    return { inputData, ocrProvenance, sourceVendor: currentSourceVendor || _detectVendorFromText(inputData) };
  }
  if (!['.txt', '.md', '.json'].includes(extension)) {
    return {
      earlyReturn: {
        intent: 'CROSS_VENDOR_TRANSFORMATION',
        status: 'STRUCTURED_TENDER_REQUIRED',
        message: 'Ingest spreadsheets and scanned quotes before transformation; binary files cannot be read as tender text.'
      }
    };
  }
  const contents = fs.readFileSync(context.filePath, 'utf8');
  return {
    inputData: extension === '.json' ? JSON.parse(contents) : contents,
    ocrProvenance: null,
    sourceVendor: currentSourceVendor
  };
}

function _computeCompetitorParityGaps(spec, candidateBom) {
  const parityGaps = [];
  if (spec?.compute?.totalCores != null) {
    const cpuItems = candidateBom.filter(it => /\b(xeon|epyc|processor|cpu)\b/i.test(it.description || ''));
    const candidateCores = cpuItems.reduce((acc, it) => acc + (Number(it.description?.match(/(\d+)[\s-]*(?:cores?|c\b)/i)?.[1] || 0) * (it.quantity || 1)), 0);
    if (candidateCores < spec.compute.totalCores) {
      parityGaps.push({
        subsystem: 'COMPUTE_PROCESSORS', status: 'GAP_IDENTIFIED',
        requested: spec.compute.totalCores, candidate: candidateCores,
        reason: 'Candidate cores below requested specification.'
      });
    }
  }
  if (spec?.memory?.totalMemoryGb != null) {
    const memItems = candidateBom.filter(it => /\b(rdimm|dimm|memory)\b/i.test(it.description || ''));
    const candidateMem = memItems.reduce((acc, it) => acc + (Number(it.description?.match(/(\d+)\s*gb/i)?.[1] || 0) * (it.quantity || 1)), 0);
    if (candidateMem < spec.memory.totalMemoryGb) {
      parityGaps.push({
        subsystem: 'MEMORY_TOPOLOGY', status: 'GAP_IDENTIFIED',
        requested: spec.memory.totalMemoryGb, candidate: candidateMem,
        reason: 'Candidate memory capacity below requested specification.'
      });
    }
  }
  return parityGaps;
}

function _deriveCrossVendorStatus(targetChassis, candidateBom, evaluatedSolution) {
  if (!targetChassis) return 'TARGET_PRODUCT_REQUIRED';
  if (!candidateBom.length) return 'SCOPED_SIZING_REQUIRED';
  if (!evaluatedSolution) return 'CANDIDATE_EVALUATION_REQUIRED';
  return evaluatedSolution.errors?.length > 0 ? 'CANDIDATE_VIOLATIONS_DETECTED' : 'CANDIDATE_EVALUATION_COMPLETE';
}

function _buildCrossVendorCandidateRef(context, targetChassis, chassisInfo, nodeCount, candidateBom, effectivePolicy) {
  const crypto = require('crypto');
  const digest = crypto.createHash('sha256').update(JSON.stringify(candidateBom.map(it => ({ sku: it.sku, quantity: it.quantity, quantityScope: it.quantityScope })))).digest('hex');
  const missingRequirements = [];
  if (!targetChassis || !chassisInfo?.catalogData) missingRequirements.push('Target Product Catalog');
  if (candidateBom.length === 0) missingRequirements.push('Candidate BOM Items');
  const requiresClarification = missingRequirements.length > 0;
  return {
    missingRequirements,
    requiresClarification,
    candidateReference: {
      parentRunId: context.runId || null,
      product: targetChassis || chassisInfo?.chassisKey || null,
      chassisDir: chassisInfo?.catalogDir || null,
      serverCount: nodeCount,
      nodeCount,
      quantityBasis: nodeCount > 1 ? 'CLUSTER_MULTIPLIED' : 'SINGLE_NODE',
      items: candidateBom,
      digest,
      missingRequirements,
      requiresHumanClarification: requiresClarification,
      offlineMode: effectivePolicy.offline,
      effectivePolicy
    }
  };
}

function _evaluateCrossVendorBomIfRequested(targetChassis, chassisInfo, transformResult, context) {
  if (!targetChassis || !transformResult.candidateBom.length) return { parityGaps: [], evaluatedSolution: null };
  const parityGaps = _computeCompetitorParityGaps(transformResult.competitorSpec, transformResult.candidateBom);
  if (!context.continueEvaluation) return { parityGaps, evaluatedSolution: null };
  try {
    return {
      parityGaps,
      evaluatedSolution: evaluateBOQMultiAspect(transformResult.candidateBom, {
        chassis: targetChassis,
        targetDir: chassisInfo?.catalogDir || '',
        catalogData: chassisInfo?.catalogData
      })
    };
  } catch (evalErr) {
    return { parityGaps, evaluatedSolution: { status: 'ERROR', error: evalErr.message } };
  }
}

async function _handleCrossVendorTransformation(queryText, context) {
  const { transformCompetitorQuote } = require('../boq/cross_vendor_transformer.js');
  const targetChassis = context.targetHpeChassis || context.chassisName || null;
  const nodeCount = context.nodeMultiplier ?? context.nodes ?? 1;

  const fileIngest = await _ingestCompetitorFileInput(context, context.sourceVendor || _detectVendorFromText(queryText));
  if (fileIngest.earlyReturn) return fileIngest.earlyReturn;
  const candidateItems = context.targetBom || (Array.isArray(context.items) ? context.items : null);
  const chassisInfo = targetChassis ? getChassisCatalog(targetChassis, context) : null;
  const transformResult = transformCompetitorQuote(fileIngest.inputData || queryText, fileIngest.sourceVendor, targetChassis, {
    nodeMultiplier: nodeCount,
    targetBom: candidateItems || [],
    sourceItems: Array.isArray(context.sourceItems) ? context.sourceItems : (Array.isArray(fileIngest.parsedItems) ? fileIngest.parsedItems : []),
    targetCatalogData: chassisInfo?.catalogData || null
  });

  const { parityGaps, evaluatedSolution } = _evaluateCrossVendorBomIfRequested(targetChassis, chassisInfo, transformResult, context);
  const effectivePolicy = _resolveContextPolicy(context, { defaultOffline: false, includeRagOnly: false });
  const candidateBom = transformResult.candidateBom || [];
  const refBundle = _buildCrossVendorCandidateRef(context, targetChassis, chassisInfo, nodeCount, candidateBom, effectivePolicy);

  return {
    intent: 'CROSS_VENDOR_TRANSFORMATION',
    skillTarget: 'cross-vendor-transformation-skill',
    ...transformResult,
    chassisDir: refBundle.candidateReference.chassisDir,
    serverCount: nodeCount,
    nodeCount,
    quantityBasis: refBundle.candidateReference.quantityBasis,
    effectivePolicy,
    missingRequirements: refBundle.missingRequirements,
    requiresHumanClarification: refBundle.requiresClarification,
    candidateReference: refBundle.candidateReference,
    items: candidateBom,
    candidateBOM: candidateBom,
    status: _deriveCrossVendorStatus(targetChassis, transformResult.candidateBom, evaluatedSolution),
    sourceVendor: fileIngest.sourceVendor,
    targetChassis,
    competitorSpec: transformResult.competitorSpec,
    auditReport: transformResult.auditReport,
    parityGaps,
    evaluatedSolution,
    strategyMatrix: transformResult.strategyMatrix,
    recommendedBom: transformResult.recommendedBom,
    ...(fileIngest.ocrProvenance ? { ocrProvenance: fileIngest.ocrProvenance } : {})
  };
}

module.exports = {
  _handleRfpSizing,
  _handleBomReconciliation,
  _handleHeterogeneousTenderModernization,
  _handleCrossVendorTransformation
};
