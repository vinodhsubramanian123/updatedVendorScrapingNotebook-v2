'use strict';
/**
 * scripts/lib/router/intent_classifier.js
 * Deterministic presales intent classification and confidence derivation.
 */

const path = require('path');
const { isValidHpeSKU } = require('../catalog/sku.js');
const catalogDiscovery = require('../catalog/catalog_discovery.js');
const { parsePriceDriftQuery } = require('../catalog/catalog_price_drifts.js');
const { ALLETRA_MP_CATALOGS, _compileCatalogSearch } = require('./platform_catalog_resolver.js');

const HETEROGENEOUS_KEYWORD_RE = /(?:heterogeneous|mixed[\s-]domain|carrier\s+(?:fleet|nodes?)|ad-hoc\s+absorption|dummy\s+server|tender\s+modernization|dirty\s+boq|unbuildable\s+ad-hoc|loose\s+memory|spare\s+parts\s+absorption)/i;
const CROSS_VENDOR_DIRECT_RE = /(?:dell\s+to\s+hpe|cisco\s+to\s+hpe|lenovo\s+to\s+hpe|cross\s+vendor|transpile|competitor\s+quote)/i;
const RECONCILE_KEYWORD_RE = /(?:reconcile|compare\s+bom|tender\s+vs\s+quote|ghost\s+sku|quote\s+comparison)/i;
const CATALOG_KEYWORD_RE = /(?:price\s+trend|pricing\s+history|is\s+obsolete|lifecycle|direct\s+ship|gpl\s+price|list\s+price\s+of|options\s+added|\blead[ -]+time\b)/i;
const SIZING_TEXT_KEYWORD_RE = /(?:\bsize\s+\d+\s+(?:nodes?|servers?|arrays?)\b|size\s+a\s+server|sizing|build\s+a\s+bom|generate\s+a\s+bom|create\s+a\s+configuration)/i;
const BOQ_TEXT_KEYWORD_RE = /(?:evaluate\s+(?:(?:this|the|customer)\s+)?boq|verify\s+(?:(?:this|the|customer)\s+)?bom|check\s+buildability|validate\s+(?:(?:this|the|customer)\s+)?boq)/i;

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
    TURNKEY_RACKING_CABLING: 'turnkey-racking-cabling-skill',
    SOLUTION_COMPARISON: 'presales-query-router',
    HARDWARE_ENVELOPE_ANALYTICS: 'catalog-intelligence-skill'
  };
  if (context.intent && explicitTracks[context.intent]) {
    return {
      intent: context.intent, confidence: 1, skillTarget: explicitTracks[context.intent], rationale: 'Explicit requested execution track.'
    };
  }
  if (filePath) {
    const operation = classifyQueryIntent(text, { ...context, filePath: '', file: '' });
    if (!['FREEFORM_QA', 'BOQ_EVALUATION', 'OCR_QUOTE_INGESTION'].includes(operation.intent)) return operation;
  }
  if (context.intent === 'RFP_SIZING_TO_BOM') {
    return {
      intent: context.intent, confidence: 1, skillTarget: 'rfp-sizing-synthesizer',
      rationale: 'Explicit scoped sizing handoff.'
    };
  }
  return null;
}

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
    const { detectVendor } = require('../taxonomy/vendor_agnostic_schema.js');
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
    try {
      const { readBoqLines } = require('../boq/boq_evaluator.js');
      const lines = readBoqLines(detectedPath);
      if (Array.isArray(lines) && lines.length > 0) {
        const { sniffDomainComposition } = require('../boq/boq_preprocessor.js');
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
    } catch { /* non-blocking sniff fallback */ }

    return {
      intent: 'BOQ_EVALUATION',
      confidence: 0.98,
      skillTarget: 'boq-eval-skill',
      rationale: 'Input contains a single customer BOQ/BOM file for physical buildability evaluation.'
    };
  }
  return null;
}

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
  if (BOQ_TEXT_KEYWORD_RE.test(text)) return null;
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

  if (!filePath && /\b(?:size|sizing|configure|build\s+(?:a\s+)?bom|generate\s+(?:a\s+)?bom)\b/i.test(text) &&
      (catalogDiscovery.matchAlletraMpProducts(text).length || ALLETRA_MP_CATALOGS.has(context.chassisName || context.model))) {
    return {
      intent: 'RFP_SIZING_TO_BOM',
      confidence: 0.95,
      skillTarget: 'rfp-sizing-synthesizer',
      rationale: 'Alletra MP storage sizing requires the HPE Ninja Online handoff.'
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
    const { inferWorkloadDnaFromText } = require('../conflict/workload_dna.js');
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

  return {
    intent: 'FREEFORM_QA',
    confidence: isQuestion ? 0.92 : 0.88,
    skillTarget: isQuestion ? 'presales-query-router' : 'nlm-skill',
    rationale: 'Freeform conversational inquiry regarding HPE server architecture, rules, or QuickSpecs.'
  };
}

function _classifySolutionComparison(text, queryText, context, filePath) {
  if (filePath || RECONCILE_KEYWORD_RE.test(text)) return null;
  if (/\b(?:price\s+(?:history|trend|drift|change)|pricing\s+history|list\s+(?:all\s+)?(?:skus?|dimms?|gpus?|cpus?|drives?|psus?)|sort(?:ed)?\s+by\s+(?:price|lead\s*time))\b/i.test(text)) {
    return null;
  }
  const hasComparisonCue = /\b(?:compare|comparison|vs\.?|versus|side[\s-]by[\s-]side)\b/i.test(text);
  if (!hasComparisonCue) return null;
  const detectedSkus = (String(queryText || '').match(/\b([A-Z0-9]{3,8}-[A-Z0-9]{3,4}|[A-Z0-9]{6}|[A-Z0-9]{5,8}AAE|[HURS][A-Z0-9]{4,11})\b/g) || []).filter(isValidHpeSKU);
  if (detectedSkus.length > 0 && !/\b(?:cores?|ram|memory|\d+\s*(?:gb|tb)|raid|nodes?)\b/i.test(text)) {
    return null;
  }
  const hasPlatformTarget = /\b(?:dl\s*\d{2,5}[a-z]?|ml\s*\d{2,5}|rl\s*\d{2,5}|sy\s*\d{2,5}|alletra|[bx]10\d{3}|proliant|gen\s*\d+|servers?|platforms?|solutions?|1u|2u)\b/i.test(text);
  if (!hasPlatformTarget) return null;
  const isConceptualArchTopic = /\b(?:pcie\s+(?:slot\s+)?lanes?|pcie\s+bifurcation|slot\s+layout|airflow\s+diagram)\b/i.test(text);
  const hasSizingOrWorkloadSpec = /\b(?:cores?|ram|memory|\d+(?:\.\d+)?\s*(?:gb|tb|pb)|raid|vsan|\d+\s*nodes?|n\+1|\b2n\b|throughput|iops|drives?|vmware|sap\s*hana|vdi|sql\s*server|ai\s*inference|capex|tco|pareto|side[\s-]by[\s-]side|sizing|size\s+for)\b/i.test(text);
  if ((isConceptualArchTopic && !hasSizingOrWorkloadSpec) || !hasSizingOrWorkloadSpec) return null;
  return {
    intent: 'SOLUTION_COMPARISON',
    confidence: 0.96,
    skillTarget: 'presales-query-router',
    rationale: 'Query requests a side-by-side multi-platform solution comparison across sizing, scaling, and Pareto trade-offs.'
  };
}

function classifyQueryIntent(queryText = '', context = {}, searchRequest = undefined) {
  const text = String(queryText || '').trim().toLowerCase();
  const filePath = context.filePath || context.file || '';

  const explicit = _classifyExplicitTrack(text, context, filePath);
  if (explicit) return explicit;

  const heterogeneousOrCompetitor = _classifyHeterogeneousAndCompetitor(text, context);
  if (heterogeneousOrCompetitor) return heterogeneousOrCompetitor;

  const fileIntent = _classifyFileBased(text, filePath, context);
  if (fileIntent) return fileIntent;

  const comparisonIntent = _classifySolutionComparison(text, queryText, context, filePath);
  if (comparisonIntent) return comparisonIntent;

  const detectedPath = filePath || (text.match(/[\w\-./\\]+\.(?:png|jpg|jpeg|webp|tiff|bmp|pdf|xlsx|xls|csv|tsv)/i)?.[0] || '');
  const isHardwareEnvelopeQuery =
    /\b(?:max(?:imum)?|min(?:imum)?|bounds?|limits?|envelope|how\s+many)\b.*\b(?:pcie|ocp|risers?|gpus?|cpus?|sockets?|dimms?|channels?|drives?|bays?|slots?|psus?)\b/i.test(text) &&
    !/\b(?:size\s+(?:a|an|for)|quote\s+me|evaluate\s+(?:this\s+)?boq|validate\s+(?:this\s+)?boq)\b/i.test(text);
  if (!detectedPath && (isHardwareEnvelopeQuery || context.intent === 'HARDWARE_ENVELOPE_ANALYTICS')) {
    return {
      intent: 'HARDWARE_ENVELOPE_ANALYTICS',
      confidence: 0.96,
      skillTarget: 'catalog-intelligence-skill',
      rationale: 'Query asks for deterministic min/max hardware capability bounds, riser/OCP/PCIe slot combinations, or expansion limits.'
    };
  }
  const plannedSearch = searchRequest === undefined && !detectedPath ? _compileCatalogSearch(queryText, context) : searchRequest;
  if (!detectedPath && (parsePriceDriftQuery(text, context.previousPriceDriftScope) || plannedSearch)) {
    return {
      intent: 'CATALOG_INTELLIGENCE',
      confidence: 0.95,
      skillTarget: 'catalog-intelligence-skill',
      rationale: 'Query requests filtered catalog search, SKU/timeline comparison, availability, or dated price changes.'
    };
  }
  const advancedIntent = _classifyAdvancedPresalesTracks(text, context, detectedPath);
  if (advancedIntent) return advancedIntent;

  return _classifyCatalogSizingOrQa(text, filePath, context);
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

module.exports = {
  classifyQueryIntent,
  _deriveClassificationConfidence
};
