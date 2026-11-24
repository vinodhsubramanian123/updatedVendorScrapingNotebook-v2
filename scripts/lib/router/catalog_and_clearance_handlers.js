'use strict';
/**
 * scripts/lib/router/catalog_and_clearance_handlers.js
 * Handlers for FREEFORM_QA, OCR_QUOTE_INGESTION, CATALOG_INTELLIGENCE, and PRESALES_CLEARANCE_STRATEGY.
 */

const fs = require('fs');
const path = require('path');
const { queryLocalKnowledgeBase } = require('../rag/local_rag_search.js');
const {
  cleanBaseSKU,
  isValidHpeSKU,
  isSmartChoiceOrBtoSku,
  classifyCommercialFulfillmentMode,
  buildCatalogSkuIndex
} = require('../catalog/sku.js');
const { parsePriceDriftQuery, findCatalogPriceDrifts } = require('../catalog/catalog_price_drifts.js');
const logger = require('../system/pipeline_logger.js');
const {
  getChassisMap,
  listAllCatalogs,
  getBaseChassisSku,
  getChassisCatalog,
  _resolveContextPolicy
} = require('./platform_catalog_resolver.js');

function _buildFreeformFeasibilityCheck(queryText, chassisInfo, answerText) {
  const combined = `${queryText || ''} ${answerText || ''}`;
  const skuMatches = Array.from(new Set(
    (combined.match(/\b([A-Z0-9]{3,8}-[A-Z0-9]{3,4}|[A-Z0-9]{6}|[A-Z0-9]{5,8}AAE|[HURS][A-Z0-9]{4,11})\b/g) || [])
      .filter(isValidHpeSKU)
      .map(cleanBaseSKU)
  ));
  const isBuildabilityQuery = /\b(?:can\s+i\s+(?:install|mix|combine|use|fit)|compatible|compatibility|support(?:ed)?\s+with|buildable|requires?\s+what\s+cables?|enablement\s+kit)\b/i.test(queryText || '');
  if (!chassisInfo?.catalogData || (skuMatches.length === 0 && !isBuildabilityQuery)) {
    return { evaluated: false, buildabilityRelevant: isBuildabilityQuery, verifiedSkus: [], absentSkus: [] };
  }
  const catalogSkus = new Set();
  for (const entry of (chassisInfo.catalogData.entries || [])) {
    for (const s of (entry.skus || [])) {
      const code = cleanBaseSKU(s.sku || s['Product #'] || '');
      if (code) catalogSkus.add(code);
    }
  }
  const verifiedSkus = skuMatches.filter(s => catalogSkus.has(s));
  const absentSkus = skuMatches.filter(s => !catalogSkus.has(s));
  const smartChoiceBtoSkus = absentSkus.filter(s => isSmartChoiceOrBtoSku(s));
  const commercialFulfillmentNotes = smartChoiceBtoSkus.map(s => classifyCommercialFulfillmentMode(s).guidance);
  let activeRulesCount = 0;
  if (chassisInfo.catalogDir) {
    try {
      const { loadActiveKnowledgeRules } = require('../catalog/active_knowledge_router.js');
      const chassisVariant = chassisInfo.chassisKey || path.basename(chassisInfo.catalogDir);
      const categorized = loadActiveKnowledgeRules(chassisVariant, chassisInfo.catalogDir);
      activeRulesCount = Array.isArray(categorized?.allRules) ? categorized.allRules.length : 0;
    } catch { /* ignore */ }
  }
  return {
    evaluated: true,
    buildabilityRelevant: isBuildabilityQuery || skuMatches.length > 1,
    verifiedSkus,
    absentSkus,
    smartChoiceBtoSkus,
    commercialFulfillmentNotes,
    activeRulesCount,
    requiresFullBoqEvaluation: isBuildabilityQuery && skuMatches.length >= 2
  };
}

async function _handleFreeformQa(queryText, context) {
  const chassisInfo = getChassisCatalog(queryText, context);
  const chassisName = context.chassisName || context.model || chassisInfo.chassisKey;
  let ragResult = null;
  let isCloudGrounded = false;
  let cloudSource = null;

  const policy = _resolveContextPolicy(context, { defaultOffline: false, includeRagOnly: true });
  const ragTimeoutMs = parseInt(process.env.RAG_TIMEOUT_MS || '120000', 10);
  if (!policy.offline && chassisName && chassisName !== 'UNKNOWN_PRODUCT') {
    try {
      const { resolveProductNotebookId } = require('../sync/nlm_solution_source_validator.js');
      const { executeNotebookQuery } = require('../notebook/notebook_query_utils.js');
      const notebookId = resolveProductNotebookId(chassisName);
      if (notebookId) {
        const queryRes = await executeNotebookQuery(notebookId, queryText, {
          context: { chassis: chassisName },
          timeout: ragTimeoutMs,
          offline: false,
          offlineMode: false,
          effectivePolicy: policy
        });
        if (queryRes && queryRes.answer && !queryRes.isFallback) {
          ragResult = queryRes;
          isCloudGrounded = queryRes.isCloudGrounded;
          cloudSource = queryRes.source;
        }
      }
    } catch (err) {
      logger.debug('ROUTE_QUERY', `Notebook query failed for ${chassisName}, falling back to local RAG: ${err?.message}`);
    }
  }

  if (!ragResult) {
    ragResult = queryLocalKnowledgeBase(queryText, chassisName);
  }

  const { analyzeCategoryDependencies, getCategoryDependencyMatrix } = require('../catalog/category_dependencies.js');
  const categoryMatrixHits = getCategoryDependencyMatrix(queryText.replace(/\?/g, '').trim()).slice(0, 4);
  const itemsForDeps = Array.isArray(context.items) ? context.items : [];
  const categoryDependencies = (itemsForDeps.length > 0 || categoryMatrixHits.length > 0)
    ? {
        analysis: itemsForDeps.length > 0 ? analyzeCategoryDependencies(itemsForDeps, chassisInfo.catalogData, { chassisId: chassisName }) : null,
        relevantRules: categoryMatrixHits,
        trustedWebEscalation: `site:hpe.com ${chassisName && chassisName !== 'UNKNOWN_PRODUCT' ? chassisName.replace(/_/g, ' ') + ' ' : ''}QuickSpecs ${queryText.slice(0, 80).trim()}`
      }
    : null;

  const qaPayload = {
    chassis: chassisName,
    catalogDir: chassisInfo.catalogDir,
    catalogAudit: chassisInfo.catalogAudit || null,
    answer: ragResult.answer,
    citations: ragResult.citations || [],
    source: cloudSource || 'Local RAG Dual-Layer Search & Master Knowledge Registry',
    isCloudGrounded: Boolean(isCloudGrounded),
    effectivePolicy: policy,
    feasibilityCheck: _buildFreeformFeasibilityCheck(queryText, chassisInfo, ragResult.answer),
    ...(categoryDependencies ? { categoryDependencies } : {})
  };
  if (chassisInfo.catalogData) {
    Object.defineProperty(qaPayload, 'catalogData', {
      value: chassisInfo.catalogData,
      enumerable: false,
      configurable: true
    });
  }
  return qaPayload;
}

async function _runOcrExtraction(queryText, context, imgPath, policy, continueDownstream) {
  const { performGeminiOcr } = require('../ocr/ocr_service.js');
  const { parseSkuLines } = require('../boq/boq_parser.js');
  const ocrResult = await performGeminiOcr(imgPath, {
    offline: policy.offline,
    offlineMode: policy.offline,
    effectivePolicy: policy
  });
  if (!ocrResult || !ocrResult.isOcrProcessed || ocrResult.ocrStatus !== 'SUCCESS') {
    return {
      intent: 'OCR_QUOTE_INGESTION',
      filePath: imgPath,
      skillTarget: 'ocr-quote-ingestion-skill',
      status: ocrResult?.ocrStatus === 'OFFLINE_BLOCKED' ? 'OFFLINE_INPUT_REQUIRED' : 'OCR_EXTRACTION_FAILED',
      error: ocrResult?.rawError || ocrResult?.text || 'OCR processing failed',
      remediationAction: ocrResult?.remediationAction || 'Check image clarity or provide structured text BOM.',
      effectivePolicy: policy
    };
  }
  const lines = ocrResult.text.split(/\r?\n/).filter(l => l.trim().length > 0);
  const parsed = parseSkuLines(lines);
  if (!parsed.items.length) {
    return {
      intent: 'OCR_QUOTE_INGESTION',
      filePath: imgPath,
      skillTarget: 'ocr-quote-ingestion-skill',
      status: 'EMPTY_OR_AMBIGUOUS_OCR',
      lineCount: ocrResult.lineCount,
      detectedSkus: ocrResult.detectedSkus,
      message: 'OCR extracted document text but identified zero valid enterprise hardware part numbers.'
    };
  }
  const downstreamResult = continueDownstream ? await continueDownstream(queryText, context, parsed.items) : null;
  return {
    intent: 'OCR_QUOTE_INGESTION',
    filePath: imgPath,
    skillTarget: 'ocr-quote-ingestion-skill',
    status: 'OCR_EXTRACTION_SUCCESS',
    provenance: {
      sourceDocument: path.resolve(imgPath),
      sourceFilename: path.basename(imgPath),
      modelUsed: ocrResult.modelUsed,
      lineCount: ocrResult.lineCount,
      rawSkuMatches: ocrResult.detectedSkus
    },
    itemCount: parsed.items.length,
    items: parsed.items,
    ...(downstreamResult ? { downstreamResult } : {}),
    effectivePolicy: policy,
    message: `Successfully extracted ${parsed.items.length} hardware BOM item(s) from ${path.basename(imgPath)} via Gemini Vision OCR.`
  };
}

async function handleOcrQuoteIngestion(queryText, context, continueDownstream = null) {
  const imgPath = context.filePath || (queryText.match(/[\w\-./\\]+\.(?:png|jpg|jpeg|webp|tiff|bmp|pdf)/i)?.[0] || '');
  const policy = _resolveContextPolicy(context, { defaultOffline: false });
  const fileExists = Boolean(imgPath && fs.existsSync(imgPath));

  if ((context.executeOcr && imgPath) || (fileExists && policy.offline)) {
    if (!fileExists) {
      return {
        intent: 'OCR_QUOTE_INGESTION',
        filePath: imgPath,
        skillTarget: 'ocr-quote-ingestion-skill',
        status: 'FILE_NOT_FOUND',
        error: `Target image file not found: ${imgPath}`,
        effectivePolicy: policy
      };
    }
    if (policy.offline) {
      return {
        intent: 'OCR_QUOTE_INGESTION',
        filePath: imgPath,
        skillTarget: 'ocr-quote-ingestion-skill',
        status: 'OFFLINE_INPUT_REQUIRED',
        error: 'Local-only execution is active. Image and scanned PDF OCR require cloud processing. Please provide pasted text or a supported tabular file (CSV/XLSX).',
        remediationAction: 'Provide pasted text or a supported tabular file (CSV/XLSX).',
        isOcrProcessed: false,
        effectivePolicy: policy
      };
    }
    return _runOcrExtraction(queryText, context, imgPath, policy, continueDownstream);
  }
  return {
    intent: 'OCR_QUOTE_INGESTION',
    filePath: imgPath,
    skillTarget: 'ocr-quote-ingestion-skill',
    status: 'READY_FOR_OCR',
    effectivePolicy: policy,
    message: `Input document identified (${path.basename(imgPath || 'quote')}). Routed to multimodal Gemini Vision OCR pipeline.`
  };
}

function _readSkuPriceHistory(catalogDir, targetSku) {
  if (!catalogDir) return null;
  const historyFile = path.join(catalogDir, 'history', 'price_history.json');
  if (!fs.existsSync(historyFile)) return null;
  try {
    const hist = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
    return targetSku ? (hist[targetSku] || null) : hist;
  } catch (e) {
    logger.warn('ROUTE_QUERY', `Failed reading price history file at ${historyFile}: ${e?.message}`);
    return null;
  }
}

function _mapCatalogSkuDetail({ entry, row: found, observations, source, price: priceParsed }) {
  const { buildAvailabilityContract } = require('../catalog/field_parsers.js');
  const leadTime = require('../taxonomy/sku_resolver.js').extractCatalogItemLeadTime(found);
  const availContract = buildAvailabilityContract({ skuRow: found, conditionalEntry: observations, capturedAt: source?.capturedAt });
  return {
    sku: found.sku || found['Product #'],
    description: found.Description || found.description,
    category: entry.parentCategory || entry.subCategory || found.category || 'General Option',
    subCategory: entry.subCategory || null,
    lifecycleStatus: availContract.lifecycleCanonical,
    effectiveStartDate: found['Start Date'] || found.effectiveStartDate || null,
    discontinuedDate: found['Discontinued Date'] || found.discontinuedDate || null,
    currentPriceUsd: priceParsed.priceUsd,
    priceState: priceParsed.priceState,
    priceStatus: priceParsed.priceStatus,
    priceConflicts: priceParsed.conflicts,
    evidence: source,
    conditionalObservations: observations,
    selectability: availContract.selectability,
    priceHistoryTrail: found['Price History Trail'] || null,
    availability: found.Availability || availContract.availability,
    availabilityStatus: availContract.availability,
    visibility: availContract.visibility,
    compatibility: availContract.compatibility,
    conditionSummary: availContract.conditionSummary,
    estimatedLeadTimeDays: leadTime.days,
    leadTimeRaw: leadTime.raw,
    leadTimeUnit: leadTime.unit,
    etaDate: leadTime.etaDate,
    speedTier: leadTime.speedTier,
    leadTimeSource: leadTime.isPublished ? (found['Lead Time Source'] || 'OCA Catalog') : null
  };
}

function _selectPriceDriftCatalogs(queryText, context, request) {
  const { resolveCatalogQueryScope, selectCatalogsForScope } = require('../catalog/catalog_query_engine.js');
  const catalogs = Array.isArray(context.availableCatalogs) ? context.availableCatalogs : listAllCatalogs();
  const scope = resolveCatalogQueryScope(queryText, catalogs);
  if (scope.unresolvedProducts.length || scope.products.length || scope.generations.length) {
    return selectCatalogsForScope(catalogs, scope);
  }
  if (/\b(?:across\s+(?:all\s+)?catalogs|(?:the\s+)?entire\s+portfolio|portfolio-wide)\b/i.test(queryText)) return catalogs;
  const earlierCatalogs = request.referencesEarlier ? context.previousPriceDriftScope?.catalogIds : null;
  return Array.isArray(earlierCatalogs) ? catalogs.filter(catalog => earlierCatalogs.includes(catalog.id)) : catalogs;
}

function _handleCatalogPriceDrifts(queryText, context, request) {
  if (request.needsScope) {
    return {
      status: 'ACTION_REQUIRED',
      code: 'PRICE_DRIFT_SCOPE_REQUIRED',
      requiresHumanClarification: true,
      message: 'Which components or SKUs should I use for the price history?'
    };
  }
  const catalogs = _selectPriceDriftCatalogs(queryText, context, request);
  const priceDrifts = findCatalogPriceDrifts(catalogs, request);
  const { snapshotsRead, trailConflictCount, issues } = priceDrifts.coverage;
  const hasChanges = priceDrifts.groups.some(group => group.totalChanges > 0);
  const status = snapshotsRead === 0 ? 'ACTION_REQUIRED' : (issues.length || trailConflictCount) ? 'PARTIAL' : 'SUCCESS';
  const message = snapshotsRead === 0 ? 'No readable dated catalog snapshots matched this scope.'
    : hasChanges ? 'Observed USD list-price changes from dated catalogs.'
      : 'No list-price changes could be established from the available snapshots for this scope.';
  return {
    status,
    priceDrifts,
    priceDriftScope: {
      categories: request.categories,
      skus: request.skus,
      catalogIds: catalogs.map(catalog => catalog.id)
    },
    message
  };
}

function _executeCatalogSearchResponse(searchRequest, context) {
  const { executeCatalogSearch } = require('../catalog/catalog_query_engine.js');
  const catalogSearch = executeCatalogSearch(searchRequest, {
    catalogs: context.availableCatalogs,
    traceId: context.traceId,
    recordMiss: process.env.NODE_ENV !== 'test' && context.recordCatalogMiss !== false
  });
  const { returnedCount, productsSearched, incompleteCatalogCoverage } = catalogSearch.summary;
  const chassis = productsSearched.length === 1 ? productsSearched[0] : null;
  const status = incompleteCatalogCoverage ? (returnedCount ? 'PARTIAL' : 'ACTION_REQUIRED') : (returnedCount ? 'SUCCESS' : 'NO_MATCHES');
  const message = returnedCount ? 'Matched ' + returnedCount + ' catalog option(s) across ' + productsSearched.join(', ') + '.'
    : incompleteCatalogCoverage ? 'Catalog evidence is incomplete for the requested scope or fields.'
      : 'No catalog options matched the specified filters.';
  return { intent: 'CATALOG_INTELLIGENCE', ...(chassis ? { chassis } : {}), status, catalogSearch, message };
}

function _catalogSkuScope(queryText, context) {
  const { resolveCatalogQueryScope, selectCatalogsForScope } = require('../catalog/catalog_query_engine.js');
  const catalogs = Array.isArray(context.availableCatalogs) ? context.availableCatalogs : listAllCatalogs();
  const scope = resolveCatalogQueryScope(queryText, catalogs, context.chassisName || context.model);
  const applicable = selectCatalogsForScope(catalogs, scope);
  return { ...scope, catalogs: applicable, singleCatalog: applicable.length === 1 ? applicable[0] : null };
}

function _historicalSkuResponse(queryText, scope, sku) {
  const dateText = queryText.match(/\b(?:as\s+of|on|in)\s+(\d{4}-\d{2}(?:-\d{2})?|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+20\d{2})\b/i)?.[1];
  if (!dateText && !/\bas\s+of\b/i.test(queryText)) return null;
  const catalog = scope.singleCatalog;
  if (!dateText || !catalog) return {
    status: 'ACTION_REQUIRED', code: 'CATALOG_QUERY_SCOPE_REQUIRED',
    requiresHumanClarification: true, message: 'Specify one catalog and a date or month for historical pricing.'
  };
  const { getHistoricalSkuPrice } = require('../catalog/sku_versioning.js');
  const historicalPricing = getHistoricalSkuPrice(sku, dateText, catalog.catalogDir);
  return {
    status: historicalPricing.isResolved ? 'SUCCESS' : 'ACTION_REQUIRED',
    targetSku: sku,
    chassis: catalog.id,
    historicalPricing,
    message: historicalPricing.isResolved ? 'Historical catalog observation retrieved.' : 'No verified price was available on or before the requested date.'
  };
}

function _handleCatalogIntelligence(queryText, context) {
  const driftRequest = parsePriceDriftQuery(queryText, context.previousPriceDriftScope);
  if (driftRequest) return _handleCatalogPriceDrifts(queryText, context, driftRequest);

  const searchRequest = context.catalogSearchRequest;
  if (searchRequest) return _executeCatalogSearchResponse(searchRequest, context);

  const skuCandidates = (queryText.match(/\b([A-Z0-9]{3,8}-[A-Z0-9]{3,4}|[A-Z0-9]{6}|[A-Z0-9]{5,8}AAE|[HURS][A-Z0-9]{4,11})\b/gi) || []).filter(isValidHpeSKU);
  const skuCodes = skuCandidates.map(cleanBaseSKU);
  if (skuCodes.length === 0) {
    return {
      status: 'ACTION_REQUIRED',
      code: 'CATALOG_QUERY_SCOPE_REQUIRED',
      requiresHumanClarification: true,
      targetSku: null,
      pricingTrail: null,
      liveDetails: null,
      message: 'Specify an HPE SKU or filtered catalog criteria (product, component, capacity, price ceiling, or lead time) for catalog intelligence.'
    };
  }

  const scope = _catalogSkuScope(queryText, context);
  if (scope.unresolvedProducts.length || !scope.catalogs.length) {
    return {
      status: 'ACTION_REQUIRED',
      code: 'CATALOG_QUERY_SCOPE_REQUIRED',
      requiresHumanClarification: true,
      message: 'The requested product or generation has no matching catalog.'
    };
  }
  const chassisInfo = scope.singleCatalog ? getChassisCatalog('', { ...context, model: null, chassisName: scope.singleCatalog.id }) : {};
  const baseSku = getBaseChassisSku(chassisInfo.chassisKey);
  const targetSku = skuCodes.find(sku => sku !== baseSku) || skuCodes[0] || null;
  const historical = _historicalSkuResponse(queryText, scope, targetSku);
  if (historical) return historical;
  const skuHistory = _readSkuPriceHistory(chassisInfo.catalogDir, targetSku);
  const { lookupCatalogSku } = require('../catalog/catalog_query_engine.js');
  const match = lookupCatalogSku({
    id: chassisInfo.chassisKey, catalogJsonPath: chassisInfo.catalogPath, catalogDir: chassisInfo.catalogDir
  }, targetSku);
  const liveSkuDetails = match ? _mapCatalogSkuDetail(match) : null;
  const freshness = liveSkuDetails && require('../catalog/catalog_freshness_guard.js')
    .auditCatalogFreshness(chassisInfo.catalogData, { staleWarningDays: 3, criticalOutdatedDays: 30 });
  const platform = getChassisMap()[chassisInfo.chassisKey];
  const commercialFulfillment = targetSku ? classifyCommercialFulfillmentMode(targetSku, liveSkuDetails?.description || '') : null;
  let crossSolutionComparison = null;
  let timelineComparison = null;
  if (targetSku) {
    try {
      const { compareSkuAcrossSolutions } = require('../catalog/cross_solution_pricing.js');
      crossSolutionComparison = compareSkuAcrossSolutions(targetSku, {
        catalogs: scope.catalogs,
        includeRelatedVariants: /\b(?:related|suffix|fio|bto)\s+variants?\b/i.test(queryText)
      });
    } catch { /* non-blocking if cross-solution catalogs absent */ }
    if (/\b(?:compare|timeline|across\s+(?:dates|solutions|products|catalogs))\b/i.test(queryText)) {
      try {
        const { compareSkuTimelines } = require('../catalog/catalog_price_drifts.js');
        timelineComparison = compareSkuTimelines(scope.catalogs, { skus: skuCodes });
      } catch { /* non-blocking */ }
    }
  }

  return {
    targetSku,
    ...(chassisInfo.catalogData && {
      chassis: chassisInfo.chassisKey,
      productType: chassisInfo.catalogData.metadata?.pillar,
      chassisInfo: { gen: platform?.gen, formFactor: platform?.formFactor }
    }),
    pricingTrail: skuHistory,
    commercialFulfillment,
    crossSolutionComparison,
    ...(timelineComparison ? { timelineComparison } : {}),
    liveDetails: liveSkuDetails ? {
      description: liveSkuDetails.description,
      category: liveSkuDetails.category,
      subCategory: liveSkuDetails.subCategory,
      lifecycleStatus: liveSkuDetails.lifecycleStatus,
      effectiveStartDate: liveSkuDetails.effectiveStartDate,
      discontinuedDate: liveSkuDetails.discontinuedDate,
      currentPriceUsd: liveSkuDetails.currentPriceUsd,
      priceState: liveSkuDetails.priceState,
      priceStatus: liveSkuDetails.priceStatus,
      ...(liveSkuDetails.priceConflicts ? { priceConflicts: liveSkuDetails.priceConflicts } : {}),
      priceHistoryTrail: liveSkuDetails.priceHistoryTrail,
      availability: liveSkuDetails.availability,
      availabilityStatus: liveSkuDetails.availabilityStatus,
      visibility: liveSkuDetails.visibility,
      compatibility: liveSkuDetails.compatibility,
      conditionSummary: liveSkuDetails.conditionSummary,
      selectability: liveSkuDetails.selectability,
      conditionalObservations: liveSkuDetails.conditionalObservations,
      evidence: liveSkuDetails.evidence,
      estimatedLeadTimeDays: liveSkuDetails.estimatedLeadTimeDays,
      leadTimeRaw: liveSkuDetails.leadTimeRaw,
      leadTimeUnit: liveSkuDetails.leadTimeUnit,
      etaDate: liveSkuDetails.etaDate,
      speedTier: liveSkuDetails.speedTier,
      leadTimeSource: liveSkuDetails.leadTimeSource,
      capturedAt: freshness.normalizedMetadata.scrapeTimestamp,
      freshnessStatus: freshness.freshnessStatus,
      source: 'OCA_CATALOG_SNAPSHOT'
    } : null,
    message: targetSku
      ? (commercialFulfillment?.isSmartChoiceBto && !liveSkuDetails
        ? `Catalog Intelligence for ${targetSku}: ${commercialFulfillment.guidance}`
        : `Catalog Intelligence retrieved for SKU ${targetSku}${liveSkuDetails ? ` (Status: ${liveSkuDetails.lifecycleStatus || 'Active'})` : ''}.`)
      : 'Catalog Intelligence retrieved across tracked portfolio.'
  };
}

function _buildClearanceAdvisoryForSku(sku, catalogIndex, chassisInfo, generatePresalesLifecycleAdvisories) {
  const { getLifecycleRecommendation } = require('../conflict/resolution_matrix.js');
  const { isActiveLifecycleCandidate } = require('../conflict/least_delta_combinator.js');
  const { extractCatalogItemLeadTime } = require('../taxonomy/sku_resolver.js');
  const item = catalogIndex.get(sku);
  const versionAdvisory = chassisInfo.catalogDir
    ? generatePresalesLifecycleAdvisories([{ sku, lifecycleStatus: item?.lifecycleStatus }], chassisInfo.catalogDir).find(advisory => advisory.lifecycleStatus) || null
    : null;
  const description = item?.skuData?.Description || item?.skuData?.description || versionAdvisory?.description || '';
  const recommendation = getLifecycleRecommendation({
    sku, description, lifecycleStatus: !item ? versionAdvisory?.lifecycleStatus : undefined,
    discontinuedDate: !item ? versionAdvisory?.discontinuationDate : undefined
  }, catalogIndex);
  const lc = item?.lifecycleState;
  const productionEligible = !recommendation && isActiveLifecycleCandidate(item);
  const leadTimeDays = extractCatalogItemLeadTime(item?.skuData)?.days ?? null;
  const productionRemark = recommendation?.commercialRemarks.production ||
    (productionEligible ? `${sku} has no recorded lifecycle warning in the scoped catalog.` : 'No production baseline was established.');
  const clearanceRemark = recommendation?.commercialRemarks.original || 'No clearance flag was found for this SKU.';
  return {
    sku,
    description,
    lifecycleState: recommendation?.lifecycleStatus || lc?.canonicalStatus || 'UNKNOWN',
    clearanceEligible: Boolean(recommendation && ['DIRECT_SHIP', '90_DAY_WARNING'].includes(recommendation.lifecycleStatus)),
    productionEligible,
    leadTimeDays,
    recommendedProductionSku: recommendation?.replacement?.sku || null,
    versionAdvisory,
    recommendation,
    commercialRemarks: { productionRemark, clearanceRemark, deliveryRiskRemark: null, summary: [productionRemark, clearanceRemark] }
  };
}

function _handlePresalesClearanceStrategy(queryText, context) {
  const { generatePresalesLifecycleAdvisories } = require('../catalog/sku_versioning.js');
  const chassisInfo = getChassisCatalog(queryText, context);
  const skuCandidates = (queryText.match(/\b([A-Z0-9]{3,8}-[A-Z0-9]{3,4}|[A-Z0-9]{6}|[A-Z0-9]{5,8}AAE|[HURS][A-Z0-9]{4,11})\b/gi) || [])
    .filter(isValidHpeSKU)
    .map(cleanBaseSKU);
  const baseSku = getBaseChassisSku(chassisInfo.chassisKey);
  const targetSku = skuCandidates.find(sku => sku !== baseSku) || skuCandidates[0] || null;
  const catalogIndex = chassisInfo.catalogData ? buildCatalogSkuIndex(chassisInfo.catalogData) : new Map();

  const inspectedSkus = [...skuCandidates];
  if (inspectedSkus.length === 0) {
    for (const [k, item] of catalogIndex.entries()) {
      if (item.lifecycleState.isClearanceOrRestricted) {
        inspectedSkus.push(k);
        if (inspectedSkus.length >= 10) break;
      }
    }
  }

  const advisories = inspectedSkus.map(sku =>
    _buildClearanceAdvisoryForSku(sku, catalogIndex, chassisInfo, generatePresalesLifecycleAdvisories)
  );
  const primary = advisories[0] || null;
  return {
    chassis: chassisInfo.chassisKey,
    targetSku,
    clearanceTrack: advisories.filter(a => a.clearanceEligible),
    productionTrack: advisories.filter(a => a.productionEligible || a.recommendedProductionSku),
    advisories,
    lifecycleRecommendations: advisories.map(advisory => advisory.recommendation).filter(Boolean),
    commercialRemarks: primary?.commercialRemarks || {
      productionRemark: 'No production baseline was established.',
      clearanceRemark: 'No lifecycle warnings were found in scope.',
      deliveryRiskRemark: null,
      summary: []
    },
    message: advisories.length > 0
      ? `Dual-track 90-day clearance & active production baseline evaluated for ${advisories.length} SKU(s) on ${chassisInfo.chassisKey}.`
      : `No active 90-day clearance/Direct-Ship warnings identified on ${chassisInfo.chassisKey}.`
  };
}

module.exports = {
  _buildFreeformFeasibilityCheck,
  _handleFreeformQa,
  handleOcrQuoteIngestion,
  _handleCatalogIntelligence,
  _handlePresalesClearanceStrategy
};
