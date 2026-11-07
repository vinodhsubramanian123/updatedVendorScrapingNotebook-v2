'use strict';
/**
 * scripts/evaluators/route_query.js — Presales Unified Intent Router & Pipeline Dispatcher
 *
 * Implements automated classification and dispatching of incoming presales queries,
 * tender wishlists, BOQ spreadsheets, and catalog intelligence inquiries across the 5 canonical tracks:
 * 1. FREEFORM_QA         — Architecture, compatibility, or QuickSpecs queries -> RAG Search
 * 2. RFP_SIZING_TO_BOM   — Natural language sizing specifications -> Initial 100% buildable BOM
 * 3. BOQ_EVALUATION      — Customer BOM / BOQ spreadsheet -> 7 Physical Aspects & 5-Tier Strategy Matrix
 * 4. BOM_RECONCILIATION  — Customer tender BOM vs Vendor quote -> Discrepancy & ghost SKU analysis
 * 5. CATALOG_INTELLIGENCE— SKU lifecycle, pricing history, and option discovery
 */

const fs = require('fs');
const { observeRouterEntry, observeActualInvocation, resolveEntryTraceId } = require('../lib/system/execution_trace_runtime.js');
const path = require('path');
const { queryLocalKnowledgeBase } = require('../lib/rag/local_rag_search.js');
const { evaluateBOQMultiAspect } = require('../lib/boq/boq_evaluator.js');
const { cleanBaseSKU, isValidHpeSKU } = require('../lib/catalog/sku.js');
const { resolveRequirementIntent } = require('../lib/boq/requirement_intent_resolver.js');
const { verifyVendorBOM, auditSingleVendorBOM } = require('../lib/boq/vendor_bom_verifier.js');
const { getChassisMap, listAllCatalogs } = require('../lib/catalog/catalog_discovery.js');
const logger = require('../lib/system/pipeline_logger.js');

function getBaseChassisSku(chassisKey = '') {
  try {
    const cmap = getChassisMap();
    if (cmap[chassisKey]?.baseSku) return cmap[chassisKey].baseSku;
    if (cmap[chassisKey]?.sku) return cmap[chassisKey].sku;
    for (const [k, v] of Object.entries(cmap)) {
      if (v.model === chassisKey || k.toLowerCase() === chassisKey.toLowerCase()) {
        if (v.baseSku) return v.baseSku;
      }
    }
  } catch (err) {
    logger.debug('ROUTE_QUERY', `Unable to resolve chassis map for ${chassisKey}: ${err?.message}`);
  }
  try {
    const catalogs = listAllCatalogs();
    const found = catalogs.find(c => c.id.toLowerCase() === chassisKey.toLowerCase() || c.chassis?.toLowerCase() === chassisKey.toLowerCase());
    if (found?.baseSku) return found.baseSku;
  } catch (err) {
    logger.debug('ROUTE_QUERY', `Unable to find catalog base SKU for ${chassisKey}: ${err?.message}`);
  }
  return null;
}

const BASE_PLATFORM_SIGNATURES = [
  { key: 'dl380a', pattern: /\b(?:dl\s*380a|dl380a|380a\s*g\d+|380ag\d+|dl380a[-_]?(?:gen|g)\d+)\b/i, prefix: 'dl380a_' },
  { key: 'dl380', pattern: /\b(?:dl\s*380|dl380|380\s*g\d+|380g\d+|dl380[-_]?(?:gen|g)\d+)\b(?!a\b)/i, prefix: 'dl380_' },
  { key: 'dl385', pattern: /\b(?:dl\s*385|dl385|385\s*g\d+|385g\d+|dl385[-_]?(?:gen|g)\d+)\b/i, prefix: 'dl385_' },
  { key: 'dl360', pattern: /\b(?:dl\s*360|dl360|360\s*g\d+|360g\d+|dl360[-_]?(?:gen|g)\d+)\b/i, prefix: 'dl360_' },
  { key: 'dl145', pattern: /\b(?:dl\s*145|dl145|145\s*g\d+|145g\d+|dl145[-_]?(?:gen|g)\d+)\b/i, prefix: 'dl145_' },
  { key: 'dl580', pattern: /\b(?:dl\s*580|dl580|580\s*g\d+|580g\d+|dl580[-_]?(?:gen|g)\d+)\b/i, prefix: 'dl580_' },
  { key: 'sy480', pattern: /\b(?:sy\s*480|sy480|synergy\s*480|synergy\s*compute|480\s*g\d+|480g\d+|sy480[-_]?(?:gen|g)\d+)\b/i, prefix: 'sy480_' },
  { key: 'sy100gb', pattern: /\b(?:sy\s*100gb|sy100gb|f32\s*module|f32|synergy\s*100gb|synergy\s*fabric|synergy\s*switch)\b/i, prefix: 'sy100gb' },
  { key: 'alletra', pattern: /\b(?:alletra|alletra\s*9000|alletra\s*storage|alletra\s*mp)\b/i, prefix: 'alletra' },
  { key: 'msl3040', pattern: /\b(?:msl\s*3040|msl3040|storeever|tape\s*library|tape\s*automation)\b/i, prefix: 'msl3040' },
  { key: 'gx5000', pattern: /\b(?:gx\s*5000|gx5000|cray\s*rack|gx\s*general)\b/i, prefix: 'gx5000' },
  { key: 'sn3600b', pattern: /\bsn\s*3600b\b/i, prefix: 'sn3600b' }
];

function _buildPlatformSignatures(catalogs) {
  const signatures = [...BASE_PLATFORM_SIGNATURES];
  for (const c of catalogs) {
    const baseId = c.id.split('_')[0].toLowerCase();
    if (!signatures.some(p => p.key === baseId || c.id.toLowerCase().startsWith(p.prefix || p.key))) {
      signatures.push({
        key: baseId,
        pattern: new RegExp(`\\b${baseId}\\b`, 'i'),
        prefix: baseId
      });
    }
  }
  return signatures;
}

function _parseGenerationHints(text, context) {
  const migrationMatch = text.match(/\b(?:migrate|modernize|upgrade|transition|move|replace|from)\b.*?\bgen\s*(\d+)\b.*?\b(?:to|into|->|with|target)\b.*?\bgen\s*(\d+)\b/i) ||
                         text.match(/\bgen\s*(\d+)\b\s*(?:to|->)\s*.*?\bgen\s*(\d+)\b/i);

  let targetGen = null;
  if (migrationMatch) {
    const sourceGen = `Gen${migrationMatch[1]}`;
    targetGen = `Gen${migrationMatch[2]}`;
    if (context && typeof context === 'object') {
      context.migrationSourceGen = sourceGen;
      context.migrationTargetGen = targetGen;
    }
  }

  const explicitGenMatch = targetGen ? null : (
    text.match(/\bgen\s*(\d+)\b/i) ||
    text.match(/(?:dl\s*\d+[a-z]?|sy\s*\d+|\b\d{3}[a-z]?)[-_]?(?:gen|g)(\d+)\b/i) ||
    text.match(/\bg(\d+)\b/i)
  );
  const explicitGen = targetGen || (explicitGenMatch ? `Gen${explicitGenMatch[1]}` : null);
  const requestedGenerations = new Set([
    ...[...text.matchAll(/\bgen\s*(\d+)\b/gi)].map(match => match[1]),
    ...[...text.matchAll(/(?:dl\s*\d+[a-z]?|sy\s*\d+|\b\d{3}[a-z]?)[-_]?(?:gen|g)(\d+)\b/gi)].map(match => match[1]),
    ...[...text.matchAll(/\bg(\d+)\b/gi)].map(match => match[1])
  ]);
  return { targetGen, explicitGen, requestedGenerations };
}

function _resolveSinglePlatformCandidate(platform, candidates, explicitGen) {
  const unsupportedResult = {
    chassisKey: `${platform.key.toUpperCase()}_${explicitGen}_UNSUPPORTED`,
    catalogDir: null,
    catalogPath: null,
    catalogData: null,
    isAmbiguous: true,
    error: `${platform.key.toUpperCase()} ${explicitGen} is not available in portfolio.`
  };
  if (candidates.length === 1) {
    const cand = candidates[0];
    if (explicitGen && !cand.id.includes(explicitGen)) return { earlyReturn: unsupportedResult };
    return { matchedCatalog: cand };
  }
  if (candidates.length > 1) {
    if (!explicitGen) {
      return {
        earlyReturn: {
          chassisKey: 'AMBIGUOUS_PRODUCT',
          catalogDir: null,
          catalogPath: null,
          catalogData: null,
          isAmbiguous: true,
          candidates: candidates.map(c => c.id),
          error: 'Multiple product generations match; specify the exact target generation.'
        }
      };
    }
    const matchedCatalog = candidates.find(c => c.id.includes(explicitGen));
    if (!matchedCatalog) return { earlyReturn: unsupportedResult };
    return { matchedCatalog };
  }
  return { matchedCatalog: null };
}

function _matchPlatformCandidates(text, catalogs, platformSignatures, explicitGen) {
  const matchedPlatforms = platformSignatures.filter(p => p.pattern.test(text));
  if (matchedPlatforms.length === 1) {
    const platform = matchedPlatforms[0];
    const prefix = platform.prefix || (platform.key.includes('_') ? platform.key : `${platform.key}_`);
    const candidates = catalogs.filter(c => c.id.toLowerCase().startsWith(prefix));
    return _resolveSinglePlatformCandidate(platform, candidates, explicitGen);
  }
  if (matchedPlatforms.length > 1) {
    return {
      earlyReturn: {
        chassisKey: 'AMBIGUOUS_QUERY',
        catalogDir: null,
        catalogPath: null,
        catalogData: null,
        isAmbiguous: true,
        candidates: catalogs.filter(c => matchedPlatforms.some(p => c.id.toLowerCase().startsWith(p.prefix))).map(c => c.id),
        error: `Multiple hardware platforms matched query text: ${matchedPlatforms.map(p => p.key.toUpperCase()).join(', ')}. Please specify a single target model.`,
        availableCatalogs: catalogs.map(c => c.id)
      }
    };
  }
  return { matchedCatalog: null };
}

function _loadCatalogDataSafe(catalogJsonPath) {
  if (!catalogJsonPath || !fs.existsSync(catalogJsonPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(catalogJsonPath, 'utf-8'));
  } catch (err) {
    logger.warn('ROUTE_QUERY', `Error parsing catalog JSON at ${catalogJsonPath}: ${err?.message}`);
    return null;
  }
}

function getChassisCatalog(queryText = '', context = {}) {
  const text = (queryText + ' ' + (context.chassisName || context.model || '')).toLowerCase().replace(/_/g, ' ');

  let catalogs = [];
  try {
    catalogs = listAllCatalogs();
  } catch (err) {
    logger.debug('ROUTE_QUERY', `Dynamic catalog discovery note: ${err?.message}`);
  }

  if (/\b(?:dl\s*360|dl360|360\s*g|360g)\b/i.test(text) && /\b(?:gen\s*12|gen12|g12)\b/i.test(text)) {
    const hasDl360Gen12 = catalogs.some(c => c.id.toLowerCase().includes('dl360') && c.id.toLowerCase().includes('gen12'));
    if (!hasDl360Gen12) {
      return {
        chassisKey: 'DL360_Gen12_UNSUPPORTED',
        catalogDir: null,
        catalogPath: null,
        catalogData: null,
        isAmbiguous: true,
        error: 'DL360 Gen12 is not currently available in portfolio (DL360 Gen11 is available)'
      };
    }
  }

  const target = String(context.chassisName || context.model || '').toLowerCase().trim();
  let matchedCatalog = target
    ? catalogs.find(c => c.id.toLowerCase() === target || c.chassis?.toLowerCase() === target)
    : null;

  const platformSignatures = _buildPlatformSignatures(catalogs);
  const { targetGen, explicitGen, requestedGenerations } = _parseGenerationHints(text, context);

  if (matchedCatalog && explicitGen && !matchedCatalog.id.toLowerCase().includes(explicitGen.toLowerCase())) {
    return { chassisKey: 'GENERATION_MISMATCH', catalogDir: null, catalogPath: null, catalogData: null, isAmbiguous: true, error: 'Explicit product and requested generation disagree.' };
  }
  if (!targetGen && requestedGenerations.size > 1) {
    return { chassisKey: 'AMBIGUOUS_QUERY', catalogDir: null, catalogPath: null, catalogData: null, isAmbiguous: true, error: 'Multiple generations require separate configurations.' };
  }

  if (!matchedCatalog) {
    const resolved = _matchPlatformCandidates(text, catalogs, platformSignatures, explicitGen);
    if (resolved.earlyReturn) return resolved.earlyReturn;
    matchedCatalog = resolved.matchedCatalog;
  }

  if (!matchedCatalog) {
    return {
      chassisKey: 'UNKNOWN_PRODUCT',
      catalogDir: null,
      catalogPath: null,
      catalogData: null,
      isAmbiguous: true,
      error: 'Product platform and generation could not be resolved from input.',
      availableCatalogs: catalogs.map(c => c.id)
    };
  }

  const catalogData = _loadCatalogDataSafe(matchedCatalog.catalogJsonPath);
  return {
    chassisKey: matchedCatalog.id,
    catalogDir: matchedCatalog.catalogDir,
    catalogPath: matchedCatalog.catalogJsonPath,
    catalogData,
    catalogAudit: _auditCatalogHealth(catalogData),
    isAmbiguous: false
  };
}

function _auditCatalogHealth(catalogData) {
  if (!catalogData || !Array.isArray(catalogData.entries)) return null;
  try {
    const { auditCatalogFreshness, verifyTabularIntegrity } = require('../lib/catalog/catalog_freshness_guard.js');
    if (typeof auditCatalogFreshness !== 'function') return null;
    const freshness = auditCatalogFreshness(catalogData);
    const integrity = typeof verifyTabularIntegrity === 'function' ? verifyTabularIntegrity(catalogData) : null;
    return {
      isFresh: freshness.isFresh,
      ageHours: freshness.ageHours,
      reason: freshness.reason,
      tabularIntegrityValid: integrity ? integrity.isValid : null,
      totalPriceableSkus: integrity ? integrity.totalPriceableSkus : null
    };
  } catch {
    return null;
  }
}

/**
 * Classify incoming query text and file metadata into one of the 5 presales tracks
 * @param {string} queryText 
 * @param {object} context 
 * @returns {object} Intent classification
 */
function _classifyExplicitTrack(text, context, filePath) {
  const explicitTracks = {
    WORKLOAD_DNA: 'workload-dna-skill', VALUE_ENGINEERING: 'value-engineering-skill',
    LEAST_DELTA_SYNTHESIS: 'least-delta-combinator-skill', WORKBOOK_GENERATION: 'workbook-generator-skill',
    REMARKS_RECONCILIATION: 'boq-remarks-reconciliation-skill', MULTI_CLUSTER_TENDER: 'multi-cluster-tender-skill',
    ADVERSARIAL_VALIDATION: 'adversarial-validation-skill', CONTINUOUS_LEARNING: 'continuous-learning-skill',
    KNOWLEDGE_SYNC: 'knowledge-sync-skill', CROSS_VENDOR_TRANSFORMATION: 'cross-vendor-transformation-skill',
    HETEROGENEOUS_TENDER_MODERNIZATION: 'heterogeneous-tender-modernizer', BOQ_EVALUATION: 'boq-eval-skill',
    BOM_RECONCILIATION: 'bom-reconciliation-skill', FREEFORM_QA: 'nlm-skill',
    RFP_SIZING_TO_BOM: 'rfp-sizing-synthesizer', CATALOG_INTELLIGENCE: 'catalog-intelligence-skill',
    CODE_QUALITY_GATE: 'code-quality-gate-skill',
    SELF_CORRECTION_COUNTERFACTUAL: 'self-correction-counterfactual-skill',
    PRESALES_CLEARANCE_STRATEGY: 'presales-clearance-strategy-skill',
    TURNKEY_RACKING_CABLING: 'turnkey-racking-cabling-skill'
  };
  if (context.intent && explicitTracks[context.intent]) {
    return {
      intent: context.intent, confidence: 1, skillTarget: explicitTracks[context.intent], rationale: 'Explicit requested execution track.'
    };
  }
  // A file is input to an explicit requested operation, not an overriding intent.
  if (filePath) {
    const operation = classifyQueryIntent(text, { ...context, filePath: '', file: '' });
    if (!['FREEFORM_QA', 'BOQ_EVALUATION', 'OCR_QUOTE_INGESTION'].includes(operation.intent)) return operation;
  }
  // Explicit canonical handoffs must not loop back into competitor detection.
  if (context.intent === 'RFP_SIZING_TO_BOM') {
    return {
      intent: context.intent, confidence: 1, skillTarget: 'rfp-sizing-synthesizer',
      rationale: 'Explicit scoped sizing handoff.'
    };
  }
  return null;
}

const HETEROGENEOUS_KEYWORD_RE = /(?:heterogeneous|mixed[\s-]domain|carrier\s+(?:fleet|nodes?)|ad-hoc\s+absorption|dummy\s+server|tender\s+modernization|dirty\s+boq|unbuildable\s+ad-hoc|loose\s+memory|spare\s+parts\s+absorption)/i;
const CROSS_VENDOR_DIRECT_RE = /(?:dell\s+to\s+hpe|cisco\s+to\s+hpe|lenovo\s+to\s+hpe|cross\s+vendor|transpile|competitor\s+quote)/i;

function _classifyHeterogeneousAndCompetitor(text, context) {
  const isHeterogeneous =
    HETEROGENEOUS_KEYWORD_RE.test(text) ||
    Boolean(context.heterogeneous) ||
    context.intent === 'HETEROGENEOUS_TENDER_MODERNIZATION';

  if (isHeterogeneous) {
    return {
      intent: 'HETEROGENEOUS_TENDER_MODERNIZATION',
      confidence: 0.98,
      skillTarget: 'heterogeneous-tender-modernizer',
      rationale: 'Input requests multi-domain tender modernization, carrier fleet bin-packing, and unbuildable ad-hoc absorption.'
    };
  }

  const isCrossVendorQuestion =
    /^(?:is\s+|can\s+|what\s+|how\s+|does\s+)/i.test(text) &&
    text.includes('?') &&
    !/\b(?:convert|transpile|transform|migrate|translate)\b/i.test(text);

  const hasVendorTransformVerb = /convert|map|transform|migrate|translate/i.test(text) && /dell|cisco|lenovo|supermicro/i.test(text);
  const isCrossVendor = !isCrossVendorQuestion && (
    CROSS_VENDOR_DIRECT_RE.test(text) ||
    hasVendorTransformVerb ||
    Boolean(context.crossVendor || context.sourceVendor) ||
    context.intent === 'CROSS_VENDOR_TRANSFORMATION'
  );

  if (isCrossVendor) {
    return {
      intent: 'CROSS_VENDOR_TRANSFORMATION',
      confidence: 0.98,
      skillTarget: 'cross-vendor-transformation-skill',
      rationale: 'Input requests cross-vendor architectural transformation and physical parity audit from competitor to target vendor.'
    };
  }
  return null;
}

function _classifyFileBased(text, filePath, context) {
  const detectedPath = filePath || (text.match(/[\w\-./\\]+\.(?:png|jpg|jpeg|webp|tiff|bmp|pdf|xlsx|xls|csv|tsv)/i)?.[0] || '');
  if (!detectedPath) return null;

  const ext = path.extname(detectedPath).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.webp', '.tiff', '.bmp', '.pdf'].includes(ext)) {
    return {
      intent: 'OCR_QUOTE_INGESTION',
      confidence: 0.98,
      skillTarget: 'ocr-quote-ingestion-skill',
      rationale: 'Input contains an image file or scanned quote document designated for OCR ingestion.'
    };
  }
  if (['.csv', '.xlsx', '.xls', '.tsv'].includes(ext)) {
    if (text.includes('reconcile') || text.includes('compare bom') || text.includes('quote vs tender') || context.secondaryFilePath || text.includes('tender vs quote')) {
      return {
        intent: 'BOM_RECONCILIATION',
        confidence: 0.96,
        skillTarget: 'bom-reconciliation-skill',
        rationale: 'Input contains spreadsheet files designated for multi-workbook reconciliation.'
      };
    }
    const { detectVendor } = require('../lib/taxonomy/vendor_agnostic_schema.js');
    const detectedVendor = detectVendor(text + ' ' + detectedPath, '', context);
    if (detectedVendor !== 'HPE' && detectedVendor !== 'Generic') {
      return {
        intent: 'CROSS_VENDOR_TRANSFORMATION',
        confidence: 0.95,
        skillTarget: 'cross-vendor-transformation-skill',
        sourceVendor: detectedVendor,
        rationale: `Input file '${path.basename(detectedPath)}' contains ${detectedVendor} competitor hardware designated for cross-vendor architectural transformation.`
      };
    }
    // Check for mixed-domain tender composition (G-STR-03)
    try {
      const { readBoqLines } = require('../lib/boq/boq_evaluator.js');
      const lines = readBoqLines(detectedPath);
      if (Array.isArray(lines) && lines.length > 0) {
        const { sniffDomainComposition } = require('../lib/boq/boq_preprocessor.js');
        const sniff = sniffDomainComposition(lines);
        if (sniff && sniff.isMixedDomain) {
          return {
            intent: 'HETEROGENEOUS_TENDER_MODERNIZATION',
            confidence: 0.96,
            skillTarget: 'heterogeneous-tender-modernizer',
            domainSniff: sniff,
            rationale: `Input file '${path.basename(detectedPath)}' contains mixed domains (${sniff.activeDomains.join(', ')}), automatically routing to heterogeneous tender modernizer.`
          };
        }
      }
    } catch {
      // Non-blocking sniff fallback
    }

    return {
      intent: 'BOQ_EVALUATION',
      confidence: 0.98,
      skillTarget: 'boq-eval-skill',
      rationale: 'Input contains a single customer BOQ/BOM file for physical buildability evaluation.'
    };
  }
  return null;
}

const RECONCILE_KEYWORD_RE = /(?:reconcile|compare\s+bom|tender\s+vs\s+quote|ghost\s+sku|quote\s+comparison)/i;
const CATALOG_KEYWORD_RE = /(?:price\s+trend|pricing\s+history|is\s+obsolete|lifecycle|direct\s+ship|gpl\s+price|list\s+price\s+of|options\s+added)/i;
const SIZING_TEXT_KEYWORD_RE = /(?:size\s+a\s+server|sizing|build\s+a\s+bom|generate\s+a\s+bom|create\s+a\s+configuration)/i;
const BOQ_TEXT_KEYWORD_RE = /(?:evaluate\s+(?:(?:this|the|customer)\s+)?boq|verify\s+(?:(?:this|the|customer)\s+)?bom|check\s+buildability|validate\s+(?:(?:this|the|customer)\s+)?boq)/i;

function _classifyOptimizationTracks(text, context) {
  if (RECONCILE_KEYWORD_RE.test(text)) {
    return {
      intent: 'BOM_RECONCILIATION',
      confidence: 0.94,
      skillTarget: 'bom-reconciliation-skill',
      rationale: 'Query requests direct reconciliation between customer requirements and partner quotation.'
    };
  }

  const isWorkloadDna =
    (/\b(?:workload\s*dna|numa\s*balanc|contested\s*resource|resource\s*arbitrat)\b/i.test(text) ||
     (/\b(?:sap\s*hana|vmware|vcf|vsphere|vdi|ai\s*inference|llm\s*inference|machine\s*learning|hft|high[\s-]frequency\s*trading|oltp|sql\s*server|big\s*data|database\s*in[\s-]memory)\b/i.test(text) &&
      !/\b(?:size|sizing|configure|config|build|quote|cluster|nodes?|need|ram|tb|gb|cores?)\b/i.test(text))) ||
    context.intent === 'WORKLOAD_DNA';

  if (isWorkloadDna) {
    return {
      intent: 'WORKLOAD_DNA',
      confidence: 0.95,
      skillTarget: 'workload-dna-skill',
      rationale: 'Query targets application-specific workload profiling, NUMA memory balance, or contested resource arbitration.'
    };
  }

  const isValueEngineering =
    /\b(?:value\s*engineering|budget\s*optimi[sz]|optimize.*budget|budget.*optimi[sz]|for\s*budget|reduce\s*capex|cost\s*reduction|surplus\s*budget|deal\s*capex|downsize\s*cpu|right[\s-]size\s*cpu)\b/i.test(text) ||
    Boolean(context.budget) ||
    context.intent === 'VALUE_ENGINEERING';

  if (isValueEngineering) {
    return {
      intent: 'VALUE_ENGINEERING',
      confidence: 0.94,
      skillTarget: 'value-engineering-skill',
      rationale: 'Query requests post-buildability CapEx/OpEx value engineering, CPU right-sizing, or budget optimization.'
    };
  }

  const isLeastDelta =
    /\b(?:least[\s-]delta|minimal[\s-]mutation|minimum[\s-]change|least[\s-]change|prune\s*troublesome|troublesome\s*sku|rank\s*1l|alternative\s*topology)\b/i.test(text) ||
    context.intent === 'LEAST_DELTA_SYNTHESIS';

  if (isLeastDelta) {
    return {
      intent: 'LEAST_DELTA_SYNTHESIS',
      confidence: 0.94,
      skillTarget: 'least-delta-combinator-skill',
      rationale: 'Query requests minimal-mutation alternative topology synthesis to prune troublesome SKUs and dependency bloat.'
    };
  }
  return null;
}

function _classifyLifecycleAndClusterTracks(text, context, detectedPath) {
  if (/\b(?:commercial\s*remarks|reconciliation\s*remarks|append\s*remarks|engineering\s*remarks|commercial\s*action)\b/i.test(text) || context.intent === 'REMARKS_RECONCILIATION') {
    return {
      intent: 'REMARKS_RECONCILIATION',
      confidence: 0.94,
      skillTarget: 'boq-remarks-reconciliation-skill',
      rationale: 'Query requests appending auditable commercial remarks and quantity bridges to customer BOQ reconciliation rows.'
    };
  }

  if (/\b(?:generate.*(?:excel|workbook|spreadsheet|\.xlsx)|create.*(?:excel|workbook|spreadsheet|\.xlsx)|export.*(?:excel|workbook|spreadsheet|\.xlsx)|portal\s*upload|partner\s*portal|7[\s-]column\s*portal|standardized\s*7[\s-]column)\b/i.test(text) || context.intent === 'WORKBOOK_GENERATION') {
    return {
      intent: 'WORKBOOK_GENERATION',
      confidence: 0.95,
      skillTarget: 'workbook-generator-skill',
      rationale: 'Query requests physical Excel workbook export, standardized 7-column portal sheet, or executive multi-rank deliverable.'
    };
  }

  const isMultiClusterTender =
    (/\b(?:\d{2,}\s*(?:nodes?|servers?)|multi[\s-]cluster|3[\s-]tier|web[\s/]app[\s/]db|datacenter\s*rack\s*layout|42u\s*rack|power\s*envelope\s*kw)\b/i.test(text) &&
    /\b(?:tender|cluster|rack|facility|layout|sizing|nodes?)\b/i.test(text)) ||
    context.intent === 'MULTI_CLUSTER_TENDER';

  if (isMultiClusterTender && !detectedPath) {
    return {
      intent: 'MULTI_CLUSTER_TENDER',
      confidence: 0.93,
      skillTarget: 'multi-cluster-tender-skill',
      rationale: 'Text query specifies aggregated multi-node or multi-tier datacenter cluster requiring cluster decomposition, 42U rack sizing, and power envelope calculation.'
    };
  }

  if (/\b(?:adversarial|red[\s-]team|stress[\s-]test|boundary[\s-]fuzz|chaos[\s-]test|fuzz\s*validation)\b/i.test(text) || context.intent === 'ADVERSARIAL_VALIDATION') {
    return {
      intent: 'ADVERSARIAL_VALIDATION',
      confidence: 0.95,
      skillTarget: 'adversarial-validation-skill',
      rationale: 'Query requests automated adversarial red-teaming, boundary fuzzing, and physical constraint stress-testing.'
    };
  }

  if (/\b(?:continuous[\s-]learning|record\s*feedback|reflect.*(?:feedback|error)|register\s*learned|quarantine\s*(?:delta|rule)|learning\s*reachability|feedback\s*loop)\b/i.test(text) || context.intent === 'CONTINUOUS_LEARNING') {
    return {
      intent: 'CONTINUOUS_LEARNING',
      confidence: 0.94,
      skillTarget: 'continuous-learning-skill',
      rationale: 'Query requests recording continuous learning feedback, delta rule reflection, or reachability verification.'
    };
  }

  if (/\b(?:knowledge[\s-]sync|synchroniz(?:e|ation)\s*knowledge|sync\s*deltas?|sync\s*catalog|inspect\s*drift|knowledge\s*drift|post[\s-]flow\s*sync)\b/i.test(text) || context.intent === 'KNOWLEDGE_SYNC') {
    return {
      intent: 'KNOWLEDGE_SYNC',
      confidence: 0.94,
      skillTarget: 'knowledge-sync-skill',
      rationale: 'Query requests bi-directional knowledge synchronization or catalog drift inspection against Gemini NotebookLM.'
    };
  }

  return null;
}

function _classifyArchitecturalQualityTracks(text, context) {
  if (/\b(?:code\s*quality|complexity\s*ceiling|cyclomatic\s*complexity|oxlint|lint\s*check|clean\s*dag|quality\s*gate)\b/i.test(text) || context.intent === 'CODE_QUALITY_GATE') {
    return {
      intent: 'CODE_QUALITY_GATE',
      confidence: 0.95,
      skillTarget: 'code-quality-gate-skill',
      rationale: 'Query requests code quality audit, cyclomatic complexity ceiling verification, or linter check.'
    };
  }
  if (/\b(?:counterfactual|self[\s-]correction|backtracking\s*trail|minimum\s*mutation|phase\s*9\s*narrative)\b/i.test(text) || context.intent === 'SELF_CORRECTION_COUNTERFACTUAL') {
    return {
      intent: 'SELF_CORRECTION_COUNTERFACTUAL',
      confidence: 0.94,
      skillTarget: 'self-correction-counterfactual-skill',
      rationale: 'Query requests counterfactual self-correction backtracking or Phase 9 reasoning narrative derivation.'
    };
  }
  if (BOQ_TEXT_KEYWORD_RE.test(text)) {
    return null;
  }
  if (/\b(?:clearance\s*hardware|90[\s-]day\s*clearance|clearance\s*strategy|dual[\s-]track\s*baseline|factory\s*excess)\b/i.test(text) || context.intent === 'PRESALES_CLEARANCE_STRATEGY') {
    return {
      intent: 'PRESALES_CLEARANCE_STRATEGY',
      confidence: 0.94,
      skillTarget: 'presales-clearance-strategy-skill',
      rationale: 'Query requests 90-day clearance hardware evaluation or dual-track baseline comparison.'
    };
  }
  if (/\b(?:turnkey|rack\s*and\s*stack|rail\s*kits?|cabling\s*completeness|factory\s*raid\s*transpilation)\b/i.test(text) || context.intent === 'TURNKEY_RACKING_CABLING') {
    return {
      intent: 'TURNKEY_RACKING_CABLING',
      confidence: 0.94,
      skillTarget: 'turnkey-racking-cabling-skill',
      rationale: 'Query requests turnkey physical racking, rail kits, transceivers, or factory RAID transpilation.'
    };
  }
  return null;
}

function _classifyAdvancedPresalesTracks(text, context, detectedPath) {
  return _classifyOptimizationTracks(text, context) ||
         _classifyLifecycleAndClusterTracks(text, context, detectedPath) ||
         _classifyArchitecturalQualityTracks(text, context);
}

function _isSingleSkuCatalogQuery(text, filePath, context, detectedSkus) {
  if (detectedSkus.length !== 1 || filePath) return false;
  if (Array.isArray(context.items) && context.items.length > 1) return false;
  return (
    /\b(?:price|pricing|cost|rate|gpl|list\s*price|trend|history|obsolete|eol|lifecycle|direct\s*ship|status|availability|available|details?|lookup|check\s+(?:sku|part|price|status)?)\b/i.test(text) ||
    !text.includes(' ') ||
    /^(?:check|show|get|find|lookup|inspect|price\s+of|cost\s+of|status\s+of)?\s*[a-z0-9-]+$/i.test(text)
  );
}

function _hasSizingSpecificationKeywords(text) {
  const serverModelPattern = /\b(?:dl\s*380a?|dl\s*145|dl\s*580|sy\s*480|synergy|alletra|cray|sn\s*3600b?|computescale|tensorscale|proliant)\b/i;
  const specPattern = /\b(?:processor|cpu|cores?|memory|ram|dimm|gpus?|accelerators?|h200|h100|l40s|drive|drives|storage|nvme|ssd|1gbe|10gbe|25gbe|sfp|base-t|nodes?|units?|no\s+local\s+drive|basic\s+processor|minimum\s+memory)\b/i;
  const hasSpecTokens = /\b(?:\d+x|\d+\s*(?:gb|tb|cores?|units?|nodes?)|with|plus|and)\b/i.test(text);
  const isPresalesSpecification = (serverModelPattern.test(text) && specPattern.test(text) && hasSpecTokens) ||
    /\b(?:tensorscale|computescale)\b/i.test(text);
  const hasExplicitSizingVerb = /\b(?:size\s+a|sizing|build\s+a\s+bom|generate\s+a\s+bom|create\s+a\s+configuration|quote\s+me|configure|can\s+(?:i|we)\s+(?:get|order|configure|quote|have|build))\b/i.test(text);
  const hasNeedSpec = text.includes('need') && /\b(?:cores|ram|tb\s+storage)\b/i.test(text);

  return (isPresalesSpecification && (!text.includes('?') || hasExplicitSizingVerb)) ||
    SIZING_TEXT_KEYWORD_RE.test(text) ||
    hasNeedSpec;
}

function _classifyCatalogSizingOrQa(text, filePath, context) {
  const detectedSkus = (text.match(/\b([A-Z0-9]{3,8}-[A-Z0-9]{3,4}|[A-Z0-9]{6}|[A-Z0-9]{5,8}AAE|[HURS][A-Z0-9]{4,11})\b/gi) || []).filter(isValidHpeSKU);
  const isSingleSkuPricingOrLifecycle = _isSingleSkuCatalogQuery(text, filePath, context, detectedSkus);

  if (isSingleSkuPricingOrLifecycle || CATALOG_KEYWORD_RE.test(text)) {
    return {
      intent: 'CATALOG_INTELLIGENCE',
      confidence: 0.95,
      skillTarget: 'catalog-intelligence-skill',
      rationale: isSingleSkuPricingOrLifecycle
        ? `Single SKU inquiry for ${detectedSkus[0]} directed to catalog intelligence to avoid monolithic server evaluation.`
        : 'Query targets pricing history, SKU lifecycle status, or option catalog metadata.'
    };
  }

  if (detectedSkus.length >= 2 || BOQ_TEXT_KEYWORD_RE.test(text)) {
    return {
      intent: 'BOQ_EVALUATION',
      confidence: 0.90,
      skillTarget: 'boq-eval-skill',
      rationale: 'Query contains specific SKU strings or requests physical validation of a drafted configuration.'
    };
  }

  let workloadDna = null;
  try {
    const { inferWorkloadDnaFromText } = require('../lib/conflict/workload_dna.js');
    workloadDna = inferWorkloadDnaFromText(text);
  } catch {
    workloadDna = null;
  }

  if (workloadDna && workloadDna.confidence >= 0.70 && detectedSkus.length === 0) {
    const workloadLabel = workloadDna.primaryWorkload || workloadDna.workloadType;
    return {
      intent: 'RFP_SIZING_TO_BOM',
      confidence: 0.95,
      skillTarget: 'rfp-sizing-synthesizer',
      workloadProfile: workloadDna,
      rationale: `Query exhibits strong Workload DNA signature for ${workloadLabel} (Confidence: ${workloadDna.confidence}), requiring workload-optimized BOM synthesis.`
    };
  }

  if (_hasSizingSpecificationKeywords(text)) {
    return {
      intent: 'RFP_SIZING_TO_BOM',
      confidence: 0.95,
      skillTarget: 'rfp-sizing-synthesizer',
      rationale: 'Query specifies workload sizing capacity parameters (cores, memory, storage, accelerators) requiring BOM synthesis.'
    };
  }

  const isQuestion =
    /^(?:can\s+i|what\s+(?:is|are|options|can|do|does)|how\s+|why\s+|does\s+|is\s+(?:it|there))\b/i.test(text) ||
    text.includes('?');

  if (isQuestion) {
    return {
      intent: 'FREEFORM_QA',
      confidence: 0.92,
      skillTarget: 'presales-query-router',
      rationale: 'Freeform conversational inquiry regarding HPE server architecture, rules, or QuickSpecs.'
    };
  }

  return {
    intent: 'FREEFORM_QA',
    confidence: 0.88,
    skillTarget: 'nlm-skill',
    rationale: 'Freeform conversational inquiry regarding HPE server architecture, rules, or QuickSpecs.'
  };
}

function classifyQueryIntent(queryText = '', context = {}) {
  const text = String(queryText || '').trim().toLowerCase();
  const filePath = context.filePath || context.file || '';

  const explicit = _classifyExplicitTrack(text, context, filePath);
  if (explicit) return explicit;

  const heterogeneousOrCompetitor = _classifyHeterogeneousAndCompetitor(text, context);
  if (heterogeneousOrCompetitor) return heterogeneousOrCompetitor;

  const fileIntent = _classifyFileBased(text, filePath, context);
  if (fileIntent) return fileIntent;

  const detectedPath = filePath || (text.match(/[\w\-./\\]+\.(?:png|jpg|jpeg|webp|tiff|bmp|pdf|xlsx|xls|csv|tsv)/i)?.[0] || '');
  const advancedIntent = _classifyAdvancedPresalesTracks(text, context, detectedPath);
  if (advancedIntent) return advancedIntent;

  return _classifyCatalogSizingOrQa(text, filePath, context);
}

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
  let activeRulesCount = 0;
  if (chassisInfo.catalogDir) {
    try {
      const { loadActiveKnowledgeRules } = require('../lib/feedback/feedback_loop.js');
      if (typeof loadActiveKnowledgeRules === 'function') {
        activeRulesCount = loadActiveKnowledgeRules(chassisInfo.catalogDir).length;
      }
    } catch { /* ignore */ }
  }
  return {
    evaluated: true,
    buildabilityRelevant: isBuildabilityQuery || skuMatches.length > 1,
    verifiedSkus,
    absentSkus,
    activeRulesCount,
    requiresFullBoqEvaluation: isBuildabilityQuery && skuMatches.length >= 2
  };
}

function _isOfflineContext(context = {}) {
  if (context.offlineMode !== undefined) {
    if (typeof context.offlineMode === 'boolean') return context.offlineMode;
    const str = String(context.offlineMode).trim().toLowerCase();
    if (['true', '1'].includes(str)) return true;
    if (['false', '0'].includes(str)) return false;
  }
  return [process.env.OFFLINE_MODE, process.env.LOCAL_EVAL_ONLY]
    .some(value => ['true', '1'].includes(String(value || '').trim().toLowerCase()));
}

/**
 * Modular Handlers for Presales Query Tracks
 */
async function _handleFreeformQa(queryText, context) {
  const chassisInfo = getChassisCatalog(queryText, context);
  const chassisName = context.chassisName || context.model || chassisInfo.chassisKey;
  let ragResult = null;
  let isCloudGrounded = false;
  let cloudSource = null;

  const isOffline = _isOfflineContext(context);
  const ragTimeoutMs = parseInt(process.env.RAG_TIMEOUT_MS || '120000', 10);
  if (!isOffline && chassisName && chassisName !== 'UNKNOWN_PRODUCT') {
    try {
      const { resolveProductNotebookId } = require('../lib/sync/nlm_solution_source_validator.js');
      const { executeNotebookQuery } = require('../lib/notebook/notebook_query_utils.js');
      const notebookId = resolveProductNotebookId(chassisName);
      if (notebookId) {
        const queryRes = await executeNotebookQuery(notebookId, queryText, {
          context: { chassis: chassisName },
          timeout: ragTimeoutMs
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

  const qaPayload = {
    chassis: chassisName,
    catalogDir: chassisInfo.catalogDir,
    catalogAudit: chassisInfo.catalogAudit || null,
    answer: ragResult.answer,
    citations: ragResult.citations || [],
    source: cloudSource || 'Local RAG Dual-Layer Search & Master Knowledge Registry',
    isCloudGrounded: Boolean(isCloudGrounded),
    feasibilityCheck: _buildFreeformFeasibilityCheck(queryText, chassisInfo, ragResult.answer)
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

function _boqPipelineFailure(error, context) {
  const cancelled = context.signal?.aborted && Object.is(error, context.signal.reason);
  return { status: cancelled ? 'CANCELLED' : 'ERROR',
    error: cancelled ? 'BOQ evaluation cancelled' : (error?.message ?? String(error)),
    traceId: error?.traceId || null, evidenceLogPath: error?.evidenceLogPath || null };
}

function _resolveBoqOfflineMode(context = {}) {
  if (typeof _isOfflineContext === 'function') {
    return _isOfflineContext(context);
  }
  if (context.offlineMode !== undefined) {
    return Boolean(context.offlineMode);
  }
  return [process.env.OFFLINE_MODE, process.env.LOCAL_EVAL_ONLY]
    .some(value => ['true', '1'].includes(String(value || '').trim().toLowerCase()));
}

async function _handleBoqEvaluation(queryText, context) {
  const chassisInfo = getChassisCatalog(queryText, context);
  if (context.filePath && fs.existsSync(context.filePath)) {
    try {
      const { runEvaluationPipeline } = require('./eval_boq.js');
      return await runEvaluationPipeline({
        inputFile: context.filePath,
        chassisDir: context.chassisDir || (chassisInfo?.catalogDir || undefined),
        targetSheetName: context.targetSheet || undefined,
        signal: context.signal,
        traceId: context.traceId,
        JSON_MODE: true,
        OFFLINE_MODE: _resolveBoqOfflineMode(context)
      });
    } catch (pipeErr) {
      return _boqPipelineFailure(pipeErr, context);
    }
  } else if (context.items && Array.isArray(context.items)) {
    try {
      const { runEvaluationPipeline } = require('./eval_boq.js');
      return await runEvaluationPipeline({
        inputItems: context.items,
        chassisDir: context.chassisDir || (chassisInfo?.catalogDir || undefined),
        targetSheetName: context.targetSheet || undefined,
        signal: context.signal,
        traceId: context.traceId,
        JSON_MODE: true,
        OFFLINE_MODE: _resolveBoqOfflineMode(context)
      });
    } catch (pipeErr) {
      return _boqPipelineFailure(pipeErr, context);
    }
  } else {
    return {
      message: 'BOQ evaluation requested. Please upload or specify a BOQ file path or item list.',
      suggestedAction: 'UPLOAD_BOQ_SPREADSHEET'
    };
  }
}

async function _handleOcrQuoteIngestion(queryText, context) {
  const imgPath = context.filePath || (queryText.match(/[\w\-./\\]+\.(?:png|jpg|jpeg|webp|tiff|bmp|pdf)/i)?.[0] || '');
  if (context.executeOcr && imgPath) {
    const { performGeminiOcr } = require('../lib/ocr/ocr_service.js');
    const { parseSkuLines } = require('../lib/boq/boq_parser.js');
    if (!fs.existsSync(imgPath)) {
      return {
        intent: 'OCR_QUOTE_INGESTION',
        filePath: imgPath,
        skillTarget: 'ocr-quote-ingestion-skill',
        status: 'FILE_NOT_FOUND',
        error: `Target image file not found: ${imgPath}`
      };
    }
    const ocrResult = await performGeminiOcr(imgPath);
    if (!ocrResult || !ocrResult.isOcrProcessed || ocrResult.ocrStatus !== 'SUCCESS') {
      return {
        intent: 'OCR_QUOTE_INGESTION',
        filePath: imgPath,
        skillTarget: 'ocr-quote-ingestion-skill',
        status: 'OCR_EXTRACTION_FAILED',
        error: ocrResult?.rawError || ocrResult?.text || 'OCR processing failed',
        remediationAction: ocrResult?.remediationAction || 'Check image clarity or provide structured text BOM.'
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
      message: `Successfully extracted ${parsed.items.length} hardware BOM item(s) from ${path.basename(imgPath)} via Gemini Vision OCR.`
    };
  }
  return {
    intent: 'OCR_QUOTE_INGESTION',
    filePath: imgPath,
    skillTarget: 'ocr-quote-ingestion-skill',
    status: 'READY_FOR_OCR',
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

function _mapCatalogSkuDetail(entry, found) {
  const unitPriceRaw = found['Unit Price (USD)'];
  return {
    sku: found.sku || found['Product #'],
    description: found.Description || found.description,
    category: entry.parentCategory || entry.subCategory || found.category || 'General Option',
    subCategory: entry.subCategory || null,
    lifecycleStatus: found.lifecycleStatus || found['Lifecycle Status'] || found['CLIC Status'] || 'Active',
    effectiveStartDate: found['Start Date'] || found.effectiveStartDate || null,
    discontinuedDate: found['Discontinued Date'] || found.discontinuedDate || null,
    currentPriceUsd: found.listPrice || (unitPriceRaw ? parseFloat(unitPriceRaw) : null),
    priceHistoryTrail: found['Price History Trail'] || null,
    availability: found.Availability || null
  };
}

function _findLiveSkuDetails(catalogData, targetSku) {
  if (!targetSku || !catalogData?.entries) return null;
  for (const entry of catalogData.entries) {
    if (!Array.isArray(entry.skus)) continue;
    const found = entry.skus.find(it => cleanBaseSKU(it.sku || it['Product #']) === targetSku);
    if (found) return _mapCatalogSkuDetail(entry, found);
  }
  return null;
}

function _handleCatalogIntelligence(queryText, context) {
  const skuCandidates = (queryText.match(/\b([A-Z0-9]{3,8}-[A-Z0-9]{3,4}|[A-Z0-9]{6}|[A-Z0-9]{5,8}AAE|[HURS][A-Z0-9]{4,11})\b/gi) || []).filter(isValidHpeSKU);
  const targetSku = skuCandidates.length > 0 ? cleanBaseSKU(skuCandidates[0]) : null;
  const chassisInfo = getChassisCatalog(queryText, context);
  const skuHistory = _readSkuPriceHistory(chassisInfo.catalogDir, targetSku);
  const liveSkuDetails = _findLiveSkuDetails(chassisInfo.catalogData, targetSku);

  return {
    targetSku,
    pricingTrail: skuHistory,
    liveDetails: liveSkuDetails ? {
      description: liveSkuDetails.description,
      category: liveSkuDetails.category,
      subCategory: liveSkuDetails.subCategory,
      lifecycleStatus: liveSkuDetails.lifecycleStatus,
      effectiveStartDate: liveSkuDetails.effectiveStartDate,
      discontinuedDate: liveSkuDetails.discontinuedDate,
      currentPriceUsd: liveSkuDetails.currentPriceUsd,
      priceHistoryTrail: liveSkuDetails.priceHistoryTrail,
      availability: liveSkuDetails.availability
    } : null,
    message: targetSku
      ? `Catalog Intelligence retrieved for SKU ${targetSku}${liveSkuDetails ? ` (Status: ${liveSkuDetails.lifecycleStatus || 'Active'})` : ''}.`
      : 'Catalog Intelligence retrieved across tracked portfolio.'
  };
}

function _parseRfpRawLines(queryText) {
  let rawLines = queryText.split(/[\r\n;]+/).map(l => l.trim()).filter(Boolean);
  if (rawLines.length === 1) {
    const clauses = queryText.split(/\s+(?:with|and|plus|,)\s+/i).map(c => c.trim()).filter(Boolean);
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

  const candidateItems = [];
  const baseSku = getBaseChassisSku(chassisInfo.chassisKey);
  if (baseSku) {
    candidateItems.push({
      sku: baseSku,
      quantity: 1,
      description: `${chassisInfo.chassisKey} CTO Base Chassis`
    });
  }

  for (const r of (sizingResult.resolutions || [])) {
    const sku = r.appliedSku || r.candidates?.[0]?.sku;
    if (sku && isValidHpeSKU(sku)) {
      candidateItems.push({
        sku,
        quantity: _inferResolutionQuantity(r),
        description: r.candidates?.[0]?.description || r.input,
        role: r.expectedRole,
        confidence: r.confidence
      });
    }
  }

  let evaluation = null;
  if (candidateItems.length > 0) {
    try {
      evaluation = evaluateBOQMultiAspect(candidateItems, {
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
  return { sizingResult, candidateItems, evaluation };
}

function _recordRfpSizingLedger(queryText, context, chassisInfo, serverCount, rawLines, candidateItems, sizingResult, evaluation) {
  try {
    const { createEvidenceLedger } = require('../lib/system/evidence_ledger.js');
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
    for (const item of candidateItems) {
      ledger.recordSkuAudit(
        item.sku,
        'SIZED_CANDIDATE_SKU',
        item.description || 'Synthesized from natural language sizing specification',
        null,
        item.role || item.category || 'Candidate Component',
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

async function _continueRfpEvaluationIfRequested(context, candidateItems, chassisInfo, serverCount, traceId) {
  const shouldContinue = Boolean(context.continueEvaluation || context.evaluateImmediately || context.evaluate);
  if (!shouldContinue || candidateItems.length === 0) return null;
  try {
    const { runEvaluationPipeline } = require('./eval_boq.js');
    return await runEvaluationPipeline({
      inputItems: candidateItems,
      chassisDir: chassisInfo.catalogDir,
      serverCount,
      OFFLINE_MODE: context.offlineMode !== false && !context.enableCloudValidation,
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

async function _handleRfpSizing(queryText, context) {
  const chassisInfo = getChassisCatalog(queryText, context);
  const nodeMatch = queryText.match(/\b(\d+)\s*(?:nodes?|servers?|units?|appliances?|clusters?)\b/i);
  const serverCount = nodeMatch ? parseInt(nodeMatch[1], 10) : (context.serverCount || 1);
  const rawLines = _parseRfpRawLines(queryText);

  const { sizingResult, candidateItems, evaluation } = _buildRfpCandidateItems(chassisInfo, rawLines, serverCount);
  const { traceId, evidenceLogPath } = _recordRfpSizingLedger(
    queryText, context, chassisInfo, serverCount, rawLines, candidateItems, sizingResult, evaluation
  );
  const evaluatedSolution = await _continueRfpEvaluationIfRequested(context, candidateItems, chassisInfo, serverCount, traceId);

  const status = candidateItems.length === 0
    ? 'REQUIRES_HUMAN_CLARIFICATION'
    : (evaluatedSolution ? (evaluatedSolution.status || 'EVALUATION_COMPLETE') : 'SIZING_DRAFT');

  return {
    intent: 'RFP_SIZING_TO_BOM',
    chassis: chassisInfo.chassisKey,
    serverCount,
    clusterSizing: evaluation?.clusterSizing || null,
    sizingRequirements: sizingResult?.intent || null,
    categoryCoverage: sizingResult?.categoryCoverage || null,
    resolutions: sizingResult?.resolutions || [],
    constructionPlan: sizingResult?.constructionPlan || [],
    requiresHumanClarification: sizingResult?.requiresHumanClarification ?? true,
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
    return {
      ...(typeof entry === 'object' ? entry : {}),
      sku: skuCode,
      isValidFormat: valid,
      note: valid
        ? 'Valid HPE SKU format; uncataloged in current scraped snapshot (check latest QuickSpecs or regional catalog).'
        : 'Unrecognized SKU format; potential typo or non-HPE part number.'
    };
  });
}

function _resolveReconciliationBaseline(customerFile, context) {
  if (customerFile && fs.existsSync(customerFile)) {
    const customerItems = readRoutedItems({ filePath: customerFile, targetSheet: context.targetSheet });
    if (Array.isArray(customerItems) && customerItems.length > 0) {
      return {
        proposedSolution: { rank: 1, name: 'Original customer baseline', skuList: customerItems },
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
    const auditReport = isTwoBaseline
      ? verifyVendorBOM(path.resolve(vendorFile), proposedSolution, chassisInfo.catalogDir)
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
  const { HeterogeneousTenderModernizer } = require('../lib/boq/heterogeneous_tender_modernizer.js');
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
        const { parseSkuLines } = require('../lib/boq/boq_parser.js');
        parsedTables = workbook.SheetNames.map(name => {
          const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '' });
          const flatLines = rows.map(r => (Array.isArray(r) ? r.join(' ') : String(r))).filter(l => l.trim().length > 0);
          const parsed = parseSkuLines(flatLines);
          return {
            title: name,
            items: parsed.items || []
          };
        }).filter(table => table.items.length > 0);
      } catch (fileErr) {
        logger.warn('HETEROGENEOUS_TENDER', `Failed to parse workbook ${context.filePath}: ${fileErr.message}`);
      }
    }
  }

  if (!parsedTables || (Array.isArray(parsedTables) && !parsedTables.length)) return {
    intent: 'HETEROGENEOUS_TENDER_MODERNIZATION', status: 'STRUCTURED_TENDER_REQUIRED',
    message: 'Supply nonempty parsed tables with owned items and quantity multipliers. Ingest spreadsheet/PDF files before modernization.'
  };
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

const COMPETITOR_VENDORS = ['cisco', 'lenovo', 'supermicro', 'dell'];
const OCR_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.tiff', '.bmp', '.pdf'];

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
      return {
        earlyReturn: {
          intent: 'CROSS_VENDOR_TRANSFORMATION',
          status: 'FILE_NOT_FOUND',
          error: `Target image file not found: ${context.filePath}`
        }
      };
    }
    const { performGeminiOcr } = require('../lib/ocr/ocr_service.js');
    const ocrResult = await performGeminiOcr(context.filePath, context);
    if (!ocrResult || !ocrResult.isOcrProcessed || ocrResult.ocrStatus !== 'SUCCESS' || !ocrResult.text) {
      return {
        earlyReturn: {
          intent: 'CROSS_VENDOR_TRANSFORMATION',
          status: 'OCR_EXTRACTION_FAILED',
          error: ocrResult?.rawError || ocrResult?.text || 'OCR processing failed for competitor image quote.',
          remediationAction: ocrResult?.remediationAction || 'Check image clarity or provide structured text/JSON quote.'
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
    const sourceVendor = currentSourceVendor || _detectVendorFromText(inputData);
    return { inputData, ocrProvenance, sourceVendor };
  }
  if (!['.txt', '.md', '.json'].includes(extension)) {
    return {
      earlyReturn: {
        intent: 'CROSS_VENDOR_TRANSFORMATION', status: 'STRUCTURED_TENDER_REQUIRED',
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
    const candidateCores = cpuItems.reduce((acc, it) => {
      const cores = Number(it.description?.match(/(\d+)[\s-]*(?:cores?|c\b)/i)?.[1] || 0);
      return acc + (cores * (it.quantity || 1));
    }, 0);
    if (candidateCores < spec.compute.totalCores) {
      parityGaps.push({
        subsystem: 'COMPUTE_PROCESSORS',
        status: 'GAP_IDENTIFIED',
        requested: spec.compute.totalCores,
        candidate: candidateCores,
        reason: 'Candidate cores below requested specification.'
      });
    }
  }
  if (spec?.memory?.totalMemoryGb != null) {
    const memItems = candidateBom.filter(it => /\b(rdimm|dimm|memory)\b/i.test(it.description || ''));
    const candidateMem = memItems.reduce((acc, it) => {
      const cap = Number(it.description?.match(/(\d+)\s*gb/i)?.[1] || 0);
      return acc + (cap * (it.quantity || 1));
    }, 0);
    if (candidateMem < spec.memory.totalMemoryGb) {
      parityGaps.push({
        subsystem: 'MEMORY_TOPOLOGY',
        status: 'GAP_IDENTIFIED',
        requested: spec.memory.totalMemoryGb,
        candidate: candidateMem,
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
  return evaluatedSolution.errors?.length > 0
    ? 'CANDIDATE_VIOLATIONS_DETECTED'
    : 'CANDIDATE_EVALUATION_COMPLETE';
}

async function _handleCrossVendorTransformation(queryText, context) {
  const { transformCompetitorQuote } = require('../lib/boq/cross_vendor_transformer.js');
  const targetChassis = context.targetHpeChassis || context.chassisName || null;
  let sourceVendor = context.sourceVendor || _detectVendorFromText(queryText);
  const nodeCount = context.nodeMultiplier ?? context.nodes ?? 1;

  const fileIngest = await _ingestCompetitorFileInput(context, sourceVendor);
  if (fileIngest.earlyReturn) return fileIngest.earlyReturn;
  const inputData = fileIngest.inputData || queryText;
  const ocrProvenance = fileIngest.ocrProvenance;
  sourceVendor = fileIngest.sourceVendor;

  const candidateItems = context.targetBom || (Array.isArray(context.items) ? context.items : null);
  const transformResult = transformCompetitorQuote(inputData, sourceVendor, targetChassis, {
    nodeMultiplier: nodeCount, targetBom: candidateItems || []
  });

  let evaluatedSolution = null;
  let parityGaps = [];
  if (targetChassis && transformResult.candidateBom.length > 0) {
    parityGaps = _computeCompetitorParityGaps(transformResult.competitorSpec, transformResult.candidateBom);
    if (context.continueEvaluation) {
      try {
        const chassisInfo = getChassisCatalog(targetChassis, context);
        evaluatedSolution = evaluateBOQMultiAspect(transformResult.candidateBom, {
          chassis: targetChassis,
          targetDir: chassisInfo.catalogDir || '',
          catalogData: chassisInfo.catalogData
        });
      } catch (evalErr) {
        evaluatedSolution = { status: 'ERROR', error: evalErr.message };
      }
    }
  }

  return {
    intent: 'CROSS_VENDOR_TRANSFORMATION',
    skillTarget: 'cross-vendor-transformation-skill',
    ...transformResult,
    status: _deriveCrossVendorStatus(targetChassis, transformResult.candidateBom, evaluatedSolution),
    sourceVendor,
    targetChassis,
    competitorSpec: transformResult.competitorSpec,
    auditReport: transformResult.auditReport,
    parityGaps,
    evaluatedSolution,
    strategyMatrix: transformResult.strategyMatrix,
    recommendedBom: transformResult.recommendedBom,
    ...(ocrProvenance ? { ocrProvenance } : {})
  };
}


function readRoutedItems(context) {
  let input = context.items;
  const inputPath = context.filePath || context.file;
  if (!input && inputPath) {
    const ext = path.extname(inputPath).toLowerCase();
    if (ext === '.json') {
      const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
      input = Array.isArray(data) ? data : data.items || data.parsedItems;
    } else {
      if (!['.xlsx', '.xls', '.csv', '.tsv', '.txt'].includes(ext)) throw new Error('Ingest this document through OCR before this operation.');
      if (['.xlsx', '.xls'].includes(ext) && !context.targetSheet) {
        const workbook = require('xlsx-js-style').readFile(inputPath);
        if (workbook.SheetNames.length > 1) throw new Error('Select targetSheet or supply owned groups for a multi-sheet workbook.');
      }
      input = require('../lib/boq/boq_evaluator').parseAndConsolidateBOQ('', inputPath, context.targetSheet);
    }
  }
  if (!Array.isArray(input) || !input.length) throw new Error('Nonempty structured BOM items are required.');
  return input.map(item => {
    const quantity = Number(item.quantity ?? item.qty);
    const sku = item.sku || item.pn || item.partNumber;
    if (!sku || !Number.isSafeInteger(quantity) || quantity < 1) throw new Error('Each BOM item needs a SKU and positive integer quantity.');
    return { ...item, sku, quantity };
  });
}

function requireScopedCatalog(queryText, context) {
  const scope = getChassisCatalog(queryText, context);
  if (scope.isAmbiguous || !scope.catalogDir || !scope.catalogData) throw new Error(scope.error || 'Exact product catalog required.');
  return scope;
}

async function _handleWorkloadDna(queryText, context) {
  const { extractWorkloadDna } = require('../lib/conflict/workload_dna');
  const { arbitrateContestedResources } = require('../lib/conflict/resource_arbitrator');
  if (!context.items && !context.filePath) return {
    intent: 'WORKLOAD_DNA', status: 'SCOPED_SIZING_REQUIRED', requestedWorkload: queryText,
    message: 'Preserve the requested workload and size an exact product candidate before hardware profiling.'
  };
  const items = readRoutedItems(context);
  const dna = extractWorkloadDna(items);
  const chassisInfo = getChassisCatalog(queryText, context);
  const arbitration = arbitrateContestedResources(items, chassisInfo.chassisKey);

  let evaluatedBranches = [];
  if (arbitration.hasContentions && chassisInfo.catalogData) {
    evaluatedBranches = arbitration.branches.map(branch => {
      let pivotedItems = structuredClone(items);
      (branch.substitutions || []).forEach(sub => {
        if (sub.action && (sub.action.includes('PIVOT_STORAGE_CONTROLLER') || sub.action.includes('PIVOT_BOOT_DEVICE')) && sub.originalSku && sub.injectedSku) {
          pivotedItems = pivotedItems.map(it => {
            if (cleanBaseSKU(it.sku) === cleanBaseSKU(sub.originalSku)) {
              return { ...it, sku: sub.injectedSku, description: sub.injectedDesc };
            }
            return it;
          });
        }
      });
      let branchEval = null;
      try {
        branchEval = evaluateBOQMultiAspect(pivotedItems, {
          chassis: chassisInfo.chassisKey,
          catalogData: chassisInfo.catalogData,
          targetDir: chassisInfo.catalogDir
        });
      } catch (err) {
        branchEval = { error: err.message };
      }
      return {
        ...branch,
        evaluation: branchEval
      };
    });
  }

  return {
    intent: 'WORKLOAD_DNA',
    status: arbitration.hasContentions ? 'CONTENTION_ARBITRATED' : 'ADVISORY',
    requestedWorkload: queryText,
    chassis: chassisInfo.chassisKey,
    dna,
    items,
    arbitrationAvailable: true,
    hasContentions: arbitration.hasContentions,
    contentionsCount: arbitration.contentionsCount,
    contentions: arbitration.contentions,
    selfCorrectionTrail: arbitration.selfCorrectionTrail || [],
    arbitrationBranches: evaluatedBranches.length > 0 ? evaluatedBranches : arbitration.branches,
    message: arbitration.hasContentions
      ? `Workload DNA analyzed (${dna.primaryWorkload}). Detected ${arbitration.contentionsCount} physical resource contention(s); synthesized ${arbitration.branchesCount} arbitration branch(es) with 7-aspect evaluation.`
      : `Workload DNA analyzed (${dna.primaryWorkload}). Zero resource collisions detected across solution slots.`
  };
}

async function _handleValueEngineering(queryText, context) {
  const scope = requireScopedCatalog(queryText, context);
  const items = readRoutedItems(context);
  const budgetMatch = queryText.match(/(?:\$|USD\s*|budget\s*(?:of|:|=)?\s*)([\d,]+(?:\.\d+)?)/i)
    || queryText.match(/([\d,]+(?:\.\d+)?)\s*(?:USD|dollars?)\b/i);
  const budget = context.budget ?? (budgetMatch ? Number(budgetMatch[1].replace(/,/g, '')) : 0);
  if (!Number.isFinite(Number(budget)) || Number(budget) < 0) throw new Error('Budget must be a nonnegative USD amount.');
  const evaluation = evaluateBOQMultiAspect(items, { catalogData: scope.catalogData, targetDir: scope.catalogDir });
  if (evaluation.isMathClean !== true || evaluation.isGraphClean !== true) return {
    intent: 'VALUE_ENGINEERING', status: 'BASELINE_VALIDATION_REQUIRED', evaluation,
    message: 'Resolve physical and dependency gaps before optimization.'
  };
  const result = require('../lib/boq/budget_optimizer').optimizeForBudget(items, evaluation, Number(budget), scope.catalogData, scope.catalogDir);
  return { intent: 'VALUE_ENGINEERING', status: 'ADVISORY', chassis: scope.chassisKey,
    budgetOptimization: result, targetBudgetUsd: Number(budget),
    goldenRuleCompliant: result.hasBudgetConstraint && result.budgetAssessmentComplete === true && result.isBudgetExceeded === false && !result.hasZeroPriceSkus,
    message: result.goldenRuleSummary };
}

async function _handleLeastDeltaSynthesis(queryText, context) {
  const scope = requireScopedCatalog(queryText, context);
  const items = readRoutedItems(context);
  const evaluation = evaluateBOQMultiAspect(items, { catalogData: scope.catalogData, targetDir: scope.catalogDir });
  const candidates = evaluation.conflictGraph?.rankedSolutions || [];
  const candidate = candidates.find(rank => /1L/i.test(String(rank.rank)) || /least.delta/i.test(rank.name || '')) || null;
  return { intent: 'LEAST_DELTA_SYNTHESIS', chassis: scope.chassisKey,
    status: candidate ? 'CANDIDATE_REVIEW_REQUIRED' : 'NO_LEAST_DELTA_CANDIDATE',
    leastDeltaCandidate: candidate, evaluation, portalValidationStatus: 'PORTAL VALIDATION PENDING',
    message: 'Returned the canonical conflict-graph result; no separate unpriced candidate was fabricated.' };
}

async function _handleAdversarialValidation(queryText, context) {
  const { generateAdversarialBOQ, scrutinizeCandidateBOM } = require('./adversarial_agent.js');
  const chassisInfo = getChassisCatalog(queryText, context);
  const targetChassis = context.chassisName || chassisInfo.chassisKey;

  const hasSuppliedCandidate = Boolean(context.items || context.filePath);
  if (hasSuppliedCandidate) {
    const candidateItems = readRoutedItems(context);
    const scrutinyResult = scrutinizeCandidateBOM(candidateItems, {
      chassis: targetChassis,
      targetDir: chassisInfo.catalogDir || '',
      catalogData: chassisInfo.catalogData
    });
    return {
      intent: 'ADVERSARIAL_VALIDATION',
      skillTarget: 'adversarial-validation-skill',
      mode: 'CANDIDATE_SCRUTINY',
      isSyntheticTest: false,
      chassis: targetChassis,
      generatedBoq: candidateItems,
      candidateBoq: candidateItems,
      evaluation: {
        isCaught: scrutinyResult.totalIssuesCaught > 0,
        totalIssuesCaught: scrutinyResult.totalIssuesCaught,
        errors: scrutinyResult.errors,
        missingDependencies: scrutinyResult.missingDependencies.map(m => m.reason || m.sku || m.key)
      },
      scrutiny: scrutinyResult,
      status: scrutinyResult.status,
      message: scrutinyResult.message
    };
  }

  const fakeBoq = await generateAdversarialBOQ(targetChassis);
  const evalResult = evaluateBOQMultiAspect(fakeBoq, {
    chassis: targetChassis,
    targetDir: chassisInfo.catalogDir || '',
    catalogData: chassisInfo.catalogData
  });

  const errors = evalResult.errors || [];
  const missing = evalResult.missingDependencies || [];
  const totalIssuesCaught = errors.length + missing.length;

  return {
    intent: 'ADVERSARIAL_VALIDATION',
    skillTarget: 'adversarial-validation-skill',
    mode: 'SYNTHETIC_CHAOS',
    isSyntheticTest: true,
    customerDisposition: 'NOT_FOR_CUSTOMER_DELIVERY',
    syntheticPassNeverCertifiesCandidate: true,
    chassis: targetChassis,
    generatedBoq: fakeBoq,
    evaluation: {
      isCaught: totalIssuesCaught > 0,
      totalIssuesCaught,
      errors,
      missingDependencies: missing.map(m => m.reason || m.sku || m.key)
    },
    status: totalIssuesCaught > 0 ? 'SYNTHETIC_STRESS_PASSED' : 'SYNTHETIC_STRESS_ANOMALY_MISSED',
    message: totalIssuesCaught > 0
      ? `Adversarial stress-testing successful: physical constraint checkers caught ${totalIssuesCaught} anomaly(ies) in synthetic test (never certifies customer deliverables).`
      : 'Adversarial advisory: Evaluator did not flag violations on the generated synthetic test configuration.'
  };
}

async function _handleContinuousLearning(queryText, context) {
  const { processPortalFeedback } = require('../lib/feedback/feedback_loop.js');
  const chassisInfo = getChassisCatalog(queryText, context);
  const targetChassis = context.chassisName || chassisInfo.chassisKey;

  let feedbackResult = null;
  if (context.feedbackMessage || context.errorMessage) {
    feedbackResult = processPortalFeedback(context.feedbackMessage || context.errorMessage, requireScopedCatalog(queryText, context).catalogDir, {
      source: 'USER_SUPPLIED_PORTAL_FEEDBACK', citations: context.citations || []
    });
  }

  return {
    intent: 'CONTINUOUS_LEARNING',
    skillTarget: 'continuous-learning-skill',
    chassis: targetChassis,
    feedbackProcessed: feedbackResult,
    message: feedbackResult
      ? `Continuous learning feedback processed for ${targetChassis}: ${feedbackResult.message || 'Delta registered'}`
      : `Continuous learning subsystem ready for reflection and quarantine on ${targetChassis}.`
  };
}

async function _handleKnowledgeSync(queryText, context) {
  const scope = requireScopedCatalog(queryText, context);
  const { inspectKnowledgeDrift } = require('../lib/sync/knowledge_sync');
  if (/\binspect\b/i.test(queryText) && !/\b(?:sync|synchronize|upload|publish)\b/i.test(queryText)) return {
    intent: 'KNOWLEDGE_SYNC', chassis: scope.chassisKey, status: 'INSPECTED',
    drift: inspectKnowledgeDrift(scope.chassisKey), message: 'Read-only drift inspection completed.'
  };
  const result = await require('../lib/sync/post_flow_sync').triggerPostFlowSyncAsync(scope.chassisKey, 'ROUTED_QUERY_SYNC', {
    targetDir: scope.catalogDir, autoUploadNLM: context.autoUploadNLM === true
  });
  return { intent: 'KNOWLEDGE_SYNC', chassis: scope.chassisKey,
    status: result.success === false ? 'FAILED' : result.syncStatus || 'UNKNOWN', syncResult: result,
    message: result.error || 'Synchronization result retained with its actual local/cloud evidence status.' };
}

async function _handleWorkbookGeneration(queryText, context) {
  const scope = requireScopedCatalog(queryText, context);
  const input = { ...context, items: context.items || context.evalResults?.items || context.evalResults?.parsedItems };
  const items = readRoutedItems(input);
  const evaluation = await _handleBoqEvaluation(queryText, {
    ...context, items, filePath: undefined, chassisDir: scope.catalogDir
  });
  if (evaluation.status === 'ERROR') return { ...evaluation, intent: 'WORKBOOK_GENERATION' };
  const { deliveryFingerprint } = require('../lib/boq/solution_evidence');
  const { verifyDeliveryAuthorization } = require('../lib/contracts/workflow_contract');
  const authorized = evaluation.acceptanceGate?.isValid === true &&
    verifyDeliveryAuthorization(evaluation.deliveryAuthorization, deliveryFingerprint(evaluation), {
      chassisKey: scope.chassisKey, profile: 'BOQ_EVALUATION'
    });
  const exportPath = evaluation.portalWorkbookPath;
  if (!authorized || evaluation.deliveryError || !exportPath || !fs.existsSync(exportPath)) return {
    intent: 'WORKBOOK_GENERATION', status: 'VALIDATION_REQUIRED', evaluation,
    acceptanceGate: evaluation.acceptanceGate,
    message: evaluation.deliveryError || 'Canonical evaluation did not produce an authorized portal workbook.'
  };
  return { intent: 'WORKBOOK_GENERATION', status: 'GENERATED_DRAFT', chassis: scope.chassisKey,
    exportPath, fileName: path.basename(exportPath), evaluation, acceptanceGate: evaluation.acceptanceGate,
    portalValidationStatus: 'PORTAL VALIDATION PENDING',
    schema: '7-column Partner Portal reconciliation workbook', message: 'Draft workbook exported from evaluated candidate data.' };
}

async function _handleRemarksReconciliation(queryText, context) {
  const { appendCommercialRemarks } = require('../lib/boq/commercial_remarks');
  if (!Array.isArray(context.rows) || !context.rows.length) throw new Error('Tender rows are required.');
  const result = appendCommercialRemarks(context.rows, context.remarksByRow || {}, context.headerIndex ?? 0);
  return { intent: 'REMARKS_RECONCILIATION', status: 'FORMATTED', rowsCount: result.rows.length,
    outputRows: result.rows, columns: result.columns,
    message: 'Remarks formatted; row parity and allocation evidence remain caller responsibilities.' };
}

function _extractClusterPartition(context) {
  if (context.filePath && fs.existsSync(context.filePath)) {
    try {
      const { analyzeAndPartitionClusters, extractRawItemsFromWorkbook } = require('../lib/boq/multi_cluster_splitter.js');
      const rawItems = extractRawItemsFromWorkbook(context.filePath);
      return analyzeAndPartitionClusters(rawItems, path.basename(context.filePath));
    } catch (err) {
      logger.debug('ROUTE_QUERY', `Failed extracting cluster partition from ${context.filePath}: ${err?.message}`);
      return null;
    }
  }
  if (Array.isArray(context.items) && context.items.length > 0) {
    try {
      const { analyzeAndPartitionClusters } = require('../lib/boq/multi_cluster_splitter.js');
      return analyzeAndPartitionClusters(context.items, 'tender_items');
    } catch (err) {
      logger.debug('ROUTE_QUERY', `Failed analyzing cluster partition from context items: ${err?.message}`);
      return null;
    }
  }
  return null;
}

async function _handleMultiClusterTender(queryText, context) {
  const scope = requireScopedCatalog(queryText, context);
  const profile = getChassisMap()[scope.chassisKey];
  const partitionResult = _extractClusterPartition(context);

  const counts = [...queryText.matchAll(/\b(\d+)\s*(?:nodes?|servers?|units?)\b/gi)].map(match => Number(match[1]));
  const count = context.serverCount ?? (partitionResult?.totalChassis || (counts.length === 1 ? counts[0] : null));
  if (!Number.isSafeInteger(count) || count < 1) throw new Error('Supply an explicit serverCount or decompose multiple groups before rack sizing.');
  const rackUnits = context.usableRackUnits;
  const watts = context.nodePowerWatts;
  if (rackUnits != null && (!Number.isFinite(rackUnits) || rackUnits <= 0)) throw new Error('usableRackUnits must be positive.');
  if (watts != null && (!Number.isFinite(watts) || watts <= 0)) throw new Error('nodePowerWatts must be positive.');
  const uHeight = profile?.uHeight;
  const totalRackUnits = Number.isFinite(uHeight) && uHeight > 0 ? count * uHeight : null;
  return { intent: 'MULTI_CLUSTER_TENDER', status: 'DRAFT_VALIDATION_REQUIRED', chassis: scope.chassisKey,
    clusterAnalysis: { totalServers: count, totalRackUnits,
      rackCount: totalRackUnits != null && rackUnits != null ? Math.ceil(totalRackUnits / rackUnits) : null,
      powerEnvelopeKw: watts != null ? count * watts / 1000 : null,
      discoveredClusters: partitionResult?.clusters || null,
      clusterCount: partitionResult?.clusters?.length || 1,
      quantityConservation: partitionResult?.quantityConservation || null },
    message: 'Rack and power estimates use explicit product height and supplied site/power inputs. Blade enclosure and multi-tier relationships require separate sizing.' };
}

function _deriveClassificationConfidence(queryText, context, classification, chassisInfoForConf) {
  if (context.chassisName && chassisInfoForConf && !chassisInfoForConf.isAmbiguous) {
    return { confidence: 1.0, classificationBasis: 'CHASSIS_EXPLICIT_ID_MATCH' };
  }
  if (classification.intent === 'BOQ_EVALUATION') {
    const hasFile = Boolean(context.filePath || context.file);
    return {
      confidence: hasFile ? 0.95 : 0.90,
      classificationBasis: hasFile ? 'BOQ_EVALUATION_WITH_FILE' : 'BOQ_EVALUATION_KEYWORD'
    };
  }
  if (classification.workloadProfile) {
    return {
      confidence: Math.max(classification.confidence || 0.90, classification.workloadProfile.confidence || 0.90),
      classificationBasis: `WORKLOAD_DNA_${classification.workloadProfile.primaryWorkload || classification.workloadProfile.workloadType}`
    };
  }
  if (classification.intent === 'RFP_SIZING_TO_BOM') {
    const sizingKeywords = ['sizing', 'size a', 'build a bom', 'generate a bom', 'cores', 'ram', 'tb storage', 'need', 'memory', 'processor'];
    const kwCount = sizingKeywords.filter(kw => (queryText || '').toLowerCase().includes(kw)).length;
    return {
      confidence: kwCount >= 3 ? 0.90 : 0.75,
      classificationBasis: `RFP_SIZING_KEYWORD_COUNT_${kwCount}`
    };
  }
  if (classification.intent === 'FREEFORM_QA') {
    return { confidence: 0.80, classificationBasis: 'FREEFORM_QA_DEFAULT' };
  }
  if (chassisInfoForConf && !chassisInfoForConf.isAmbiguous) {
    return { confidence: 0.90, classificationBasis: 'CHASSIS_PLATFORM_SIGNATURE_SINGLE_MATCH' };
  }
  return {
    confidence: classification.confidence || 0.80,
    classificationBasis: 'CLASSIFIER_SCORE'
  };
}

async function _dispatchIntentHandler(classification, queryText, context) {
  switch (classification.intent) {
    case 'CROSS_VENDOR_TRANSFORMATION':
      return await observeActualInvocation('_handleCrossVendorTransformation', __filename, () => _handleCrossVendorTransformation(queryText, context));

    case 'HETEROGENEOUS_TENDER_MODERNIZATION':
      return await observeActualInvocation('_handleHeterogeneousTenderModernization', __filename, () => _handleHeterogeneousTenderModernization(queryText, context));

    case 'FREEFORM_QA':
      return await observeActualInvocation('_handleFreeformQa', __filename, () => _handleFreeformQa(queryText, context));

    case 'BOQ_EVALUATION':
      return await observeActualInvocation('_handleBoqEvaluation', __filename, () => _handleBoqEvaluation(queryText, context));

    case 'OCR_QUOTE_INGESTION':
      return await observeActualInvocation('_handleOcrQuoteIngestion', __filename, () => _handleOcrQuoteIngestion(queryText, context));

    case 'CATALOG_INTELLIGENCE':
      return observeActualInvocation('_handleCatalogIntelligence', __filename, () => _handleCatalogIntelligence(queryText, context));

    case 'RFP_SIZING_TO_BOM':
      return await observeActualInvocation('_handleRfpSizing', __filename, () => _handleRfpSizing(queryText, context));

    case 'BOM_RECONCILIATION':
      return observeActualInvocation('_handleBomReconciliation', __filename, () => _handleBomReconciliation(queryText, context));

    case 'WORKLOAD_DNA':
      return await observeActualInvocation('_handleWorkloadDna', __filename, () => _handleWorkloadDna(queryText, context));

    case 'VALUE_ENGINEERING':
      return await observeActualInvocation('_handleValueEngineering', __filename, () => _handleValueEngineering(queryText, context));

    case 'LEAST_DELTA_SYNTHESIS':
      return await observeActualInvocation('_handleLeastDeltaSynthesis', __filename, () => _handleLeastDeltaSynthesis(queryText, context));

    case 'WORKBOOK_GENERATION':
      return await observeActualInvocation('_handleWorkbookGeneration', __filename, () => _handleWorkbookGeneration(queryText, context));

    case 'REMARKS_RECONCILIATION':
      return await observeActualInvocation('_handleRemarksReconciliation', __filename, () => _handleRemarksReconciliation(queryText, context));

    case 'MULTI_CLUSTER_TENDER':
      return await observeActualInvocation('_handleMultiClusterTender', __filename, () => _handleMultiClusterTender(queryText, context));

    case 'ADVERSARIAL_VALIDATION':
      return await observeActualInvocation('_handleAdversarialValidation', __filename, () => _handleAdversarialValidation(queryText, context));

    case 'CONTINUOUS_LEARNING':
      return await observeActualInvocation('_handleContinuousLearning', __filename, () => _handleContinuousLearning(queryText, context));

    case 'KNOWLEDGE_SYNC':
      return await observeActualInvocation('_handleKnowledgeSync', __filename, () => _handleKnowledgeSync(queryText, context));

    default:
      return {
        intent: classification.intent,
        skillTarget: classification.skillTarget,
        instructions: `Engage ${classification.skillTarget} to process: ${classification.rationale}`,
        promptContext: queryText
      };
  }
}

// CP7b report-only proposal. Disabled until independently verified CP0/CP6r parity.
async function executeRoutedQuery(queryText = '', context = {}) {
  return observeRouterEntry(__filename, queryText, () => _executeRoutedQueryWithShadow(queryText, context));
}

async function _executeRoutedQueryWithShadow(queryText = '', context = {}) {
  if (process.env.PRESALES_QUERY_SHADOW !== '1') return _executeLegacyRoutedQuery(queryText, context);
  let observe;
  try { observe = require('../lib/boq/presales_query_shadow.js').executeWithQueryShadow; }
  catch { return _executeLegacyRoutedQuery(queryText, context); }
  if (typeof observe !== 'function') return _executeLegacyRoutedQuery(queryText, context);
  return observe(queryText, context, _executeLegacyRoutedQuery);
}

function _resolvePlatformSelectionMemory(queryText, initialPlatform, context) {
  const platformSelectionMemory = { retrievedIds: [], usedIds: [], status: 'NOT_APPLICABLE' };
  let updatedContext = context;
  if (initialPlatform.isAmbiguous && initialPlatform.candidates?.length > 1) {
    try {
      const { retrievePlatformSelection } = require('../lib/boq/user_platform_selection_store.js');
      const memory = retrievePlatformSelection(queryText, initialPlatform.candidates, listAllCatalogs(), context);
      platformSelectionMemory.retrievedIds = memory.retrievedIds;
      platformSelectionMemory.status = memory.reason;
      if (memory.selected) {
        const selectedContext = { ...context, chassisName: memory.selected.selectedPlatform };
        const resolved = getChassisCatalog(queryText, selectedContext);
        if (!resolved.isAmbiguous && resolved.chassisKey === memory.selected.selectedPlatform) {
          updatedContext = selectedContext;
          platformSelectionMemory.usedIds = [memory.selected.id];
        }
      }
    } catch (error) {
      platformSelectionMemory.status = 'PREFERENCE_READ_FAILED';
      platformSelectionMemory.error = error.message;
    }
  }
  return { platformSelectionMemory, updatedContext };
}

function _buildAmbiguityResponse(queryText, classification, chassisInfoForConf, traceId) {
  const ambiguityDetails = {
    error: chassisInfoForConf?.error,
    candidates: chassisInfoForConf?.candidates || [],
    chassisKey: chassisInfoForConf?.chassisKey
  };
  const interimResponse = {
    query: queryText,
    classification,
    hitlRequired: true,
    ambiguityDetails
  };
  const question = require('../lib/boq/platform_disambiguation_prompt.js').formatDisambiguationPrompt(interimResponse, queryText);
  const reasonText = chassisInfoForConf?.error || 'Ambiguous platform target requiring human clarification';
  return {
    status: 'ACTION_REQUIRED',
    code: 'PLATFORM_CLARIFICATION_REQUIRED',
    reason: reasonText,
    message: reasonText,
    nextAction: 'PRESENT_DISAMBIGUATION_CHOICE_TO_USER',
    question,
    traceId
  };
}

function _buildDispatchErrorResponse(dispatchErr, context, classification, traceId) {
  const cancelled = context.signal?.aborted && Object.is(dispatchErr, context.signal.reason);
  return {
    status: cancelled || dispatchErr.name === 'AbortError' ? 'CANCELLED' : 'FAILED',
    error: {
      code: dispatchErr.code || 'HANDLER_EXECUTION_FAILED',
      message: dispatchErr.message,
      stack: process.env.NODE_ENV === 'test' ? undefined : dispatchErr.stack
    },
    message: `Intent handler failed: ${dispatchErr.message}`,
    classification,
    customerDisposition: 'DELIVERY_BLOCKED_UNBUILDABLE',
    traceId
  };
}

function _attachAcceptanceGate(responseData, classification, context, chassisInfoForConf) {
  if (!responseData || typeof responseData !== 'object') return;
  try {
    const { verifyPrePresentationAcceptance } = require('../lib/boq/bom_verifier.js');
    const evalContext = {
      ...context,
      catalogData: context.catalogData || responseData.catalogData || responseData.chassisInfo?.catalogData || chassisInfoForConf?.catalogData,
      catalogDir: context.catalogDir || responseData.catalogDir || responseData.chassisInfo?.catalogDir || chassisInfoForConf?.catalogDir
    };
    const acceptance = responseData.acceptanceGate || verifyPrePresentationAcceptance(responseData, classification.intent, evalContext);
    responseData.acceptanceGate = {
      status: acceptance.status,
      isValid: acceptance.isValid,
      blockersCount: acceptance.blockersCount,
      warningsCount: acceptance.warningsCount,
      blockers: acceptance.blockers,
      warnings: acceptance.warnings
    };
  } catch (error) {
    responseData.acceptanceGate = {
      status: 'ERROR', isValid: false, blockersCount: 1, warningsCount: 0,
      blockers: [{ id: 'ACCEPTANCE_ERROR', detail: error.message }]
    };
  }
}

function _attachQueryPlanIfAvailable(envelope, queryText, context) {
  try {
    const { planPresalesQuery } = require('../lib/boq/presales_query_planner.js');
    if (typeof planPresalesQuery === 'function') {
      const plan = planPresalesQuery(queryText, context);
      Object.defineProperty(envelope, 'queryPlan', {
        value: plan,
        enumerable: Boolean(context.includeQueryPlan),
        configurable: true
      });
    }
  } catch { /* ignore planner errors on malformed inputs */ }
}

/**
 * Execute routed presales query based on classified intent
 * @param {string} queryText 
 * @param {object} context 
 * @returns {Promise<object>} Execution result
 */
async function _executeLegacyRoutedQuery(queryText = '', context = {}) {
  context = { ...context };
  const classification = classifyQueryIntent(queryText, context);
  const startTime = Date.now();
  const initialPlatform = getChassisCatalog(queryText, context);
  const { platformSelectionMemory, updatedContext } = _resolvePlatformSelectionMemory(queryText, initialPlatform, context);
  context = updatedContext;

  let chassisInfoForConf = null;
  try { chassisInfoForConf = getChassisCatalog(queryText, context); } catch { chassisInfoForConf = null; }

  const unresolvedAmbiguity = ['AMBIGUOUS_QUERY', 'AMBIGUOUS_PRODUCT', 'GENERATION_MISMATCH'].includes(chassisInfoForConf?.chassisKey) || classification.intent === 'AMBIGUOUS_QUERY';
  const crypto = require('crypto');
  let traceId = context.traceId || resolveEntryTraceId(() => `TRC-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`);
  context.traceId = traceId;

  let confidence = 0.40;
  let classificationBasis = 'AMBIGUOUS_QUERY';
  let responseData = null;

  if (unresolvedAmbiguity) {
    responseData = _buildAmbiguityResponse(queryText, classification, chassisInfoForConf, traceId);
  } else {
    const scored = _deriveClassificationConfidence(queryText, context, classification, chassisInfoForConf);
    confidence = scored.confidence;
    classificationBasis = scored.classificationBasis;
    try {
      responseData = await _dispatchIntentHandler(classification, queryText, context);
    } catch (dispatchErr) {
      responseData = _buildDispatchErrorResponse(dispatchErr, context, classification, traceId);
    }
  }

  traceId = responseData?.traceId || traceId;
  if (responseData && typeof responseData === 'object' && !responseData.traceId) {
    responseData.traceId = traceId;
  }

  _attachAcceptanceGate(responseData, classification, context, chassisInfoForConf);

  const executionTimeMs = Date.now() - startTime;
  let reasoningAnalysis = null;
  try {
    const { performReasoningPostAnalysis } = require('../lib/system/reasoning_post_analyzer.js');
    reasoningAnalysis = performReasoningPostAnalysis({
      queryText,
      context: { ...context, persistLedger: Boolean(context.persistLedger) },
      classification,
      responseData,
      traceId,
      executionTimeMs
    });
  } catch {
    if (responseData && typeof responseData === 'object' && !responseData.traceStatus) {
      responseData.traceStatus = responseData.evidenceLogPath ? 'PERSISTED_EVIDENCE_LEDGER' : 'CORRELATION_ONLY_NO_PERSISTED_LEDGER';
    }
  }

  const isAmbiguous = Boolean(chassisInfoForConf?.isAmbiguous) || unresolvedAmbiguity;
  const envelope = {
    query: queryText,
    classification,
    result: responseData,
    reasoningAnalysis,
    traceId,
    executionTimeMs,
    classificationConfidence: confidence,
    hitlRequired: isAmbiguous || confidence < 0.75,
    platformSelectionMemory,
    resolvedPlatform: chassisInfoForConf && !chassisInfoForConf.isAmbiguous ? chassisInfoForConf.chassisKey : null,
    ambiguityDetails: isAmbiguous ? {
      error: chassisInfoForConf?.error,
      candidates: chassisInfoForConf?.candidates || chassisInfoForConf?.availableCatalogs || [],
      chassisKey: chassisInfoForConf?.chassisKey
    } : null,
    classificationBasis
  };

  _attachQueryPlanIfAvailable(envelope, queryText, context);
  return envelope;
}

// ── CLI Runner ─────────────────────────────────────────────────────────────
if (require.main === module) {
  const args = process.argv.slice(2);
  let queryText = '';
  const context = {};
  let jsonOutput = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) {
      context.filePath = path.resolve(args[++i]);
    } else if (args[i] === '--secondary-file' && args[i + 1]) {
      context.secondaryFilePath = path.resolve(args[++i]);
    } else if (args[i] === '--vendor' && args[i + 1]) {
      context.vendorFilePath = path.resolve(args[++i]);
    } else if (args[i] === '--customer' && args[i + 1]) {
      context.customerFilePath = path.resolve(args[++i]);
    } else if (args[i] === '--chassis' && args[i + 1]) {
      context.chassisName = args[++i];
    } else if ((args[i] === '--nodes' || args[i] === '--multiplier') && args[i + 1]) {
      context.nodeMultiplier = parseInt(args[++i], 10);
      context.nodes = context.nodeMultiplier;
    } else if ((args[i] === '--platform' || args[i] === '--target-platform') && args[i + 1]) {
      context.targetPlatform = args[++i];
    } else if (args[i] === '--json') {
      jsonOutput = true;
    } else if (!args[i].startsWith('--')) {
      queryText = queryText ? `${queryText} ${args[i]}` : args[i];
    }
  }

  if (!queryText && !context.filePath && !context.vendorFilePath) {
    console.log('Usage: node scripts/evaluators/route_query.js "<query_text>" [--file <path>] [--secondary-file <path>] [--vendor <path>] [--customer <path>] [--chassis <name>] [--platform <name>] [--nodes <n>] [--json]');
    process.exit(0);
  }

  executeRoutedQuery(queryText, context)
    .then(res => {
      if (jsonOutput) {
        console.log(JSON.stringify(res, null, 2));
      } else {
        console.log('\n===============================================================');
        console.log(`🎯 PRESALES QUERY ROUTER: [${res.classification.intent}] (Confidence: ${(res.classification.confidence * 100).toFixed(1)}%)`);
        console.log(`📌 Target Skill: ${res.classification.skillTarget}`);
        console.log(`💡 Rationale: ${res.classification.rationale}`);
        console.log(`⏱️ Execution Time: ${res.executionTimeMs}ms`);
        console.log('---------------------------------------------------------------');
        console.log('RESULT SUMMARY:');
        console.dir(res.result, { depth: 3, colors: true });
        console.log('===============================================================\n');
      }
    })
    .catch(err => {
      console.error(`Execution error: ${err.message}`);
      process.exit(1);
    });
}

module.exports = {
  classifyQueryIntent,
  executeRoutedQuery,
  getChassisCatalog
};
