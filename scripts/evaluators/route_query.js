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
const path = require('path');
const { queryLocalKnowledgeBase } = require('../lib/rag/local_rag_search.js');
const { evaluateBOQMultiAspect } = require('../lib/boq/boq_evaluator.js');
const { cleanBaseSKU, isValidHpeSKU } = require('../lib/catalog/sku.js');
const { resolveRequirementIntent } = require('../lib/boq/requirement_intent_resolver.js');
const { verifyVendorBOM } = require('../lib/boq/vendor_bom_verifier.js');
const { getChassisMap, listAllCatalogs } = require('../lib/catalog/catalog_discovery.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

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
  } catch (_) {}
  try {
    const catalogs = listAllCatalogs();
    const found = catalogs.find(c => c.id.toLowerCase() === chassisKey.toLowerCase() || c.chassis?.toLowerCase() === chassisKey.toLowerCase());
    if (found?.baseSku) return found.baseSku;
  } catch (_) {}
  return null;
}

function getChassisCatalog(queryText = '', context = {}) {
  const text = (queryText + ' ' + (context.chassisName || context.model || '')).toLowerCase().replace(/_/g, ' ');

  // 1. Discover all available catalogs dynamically
  let catalogs = [];
  try {
    catalogs = listAllCatalogs();
  } catch (_) {}

  // 2. Explicit unsupported check derived dynamically from portfolio presence
  if ((text.includes('dl360') || text.includes('dl 360')) && (text.includes('gen12') || text.includes('gen 12'))) {
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

  // 3. Match against dynamic catalogs
  let matchedCatalog = null;

  // Direct ID check if chassisName or model was passed
  if (context.chassisName || context.model) {
    const target = (context.chassisName || context.model).toLowerCase().trim();
    matchedCatalog = catalogs.find(c => c.id.toLowerCase() === target || c.chassis?.toLowerCase() === target);
  }

  // Model/Platform definition table with explicit tokens, boundary patterns, and catalog prefixes
  const PLATFORM_SIGNATURES = [
    { key: 'dl380a', pattern: /\b(?:dl\s*380a|dl380a)\b/i, prefix: 'dl380a_' },
    { key: 'dl380', pattern: /\b(?:dl\s*380|dl380)\b(?!a\b)/i, prefix: 'dl380_' },
    { key: 'dl360', pattern: /\b(?:dl\s*360|dl360)\b/i, prefix: 'dl360_' },
    { key: 'dl145', pattern: /\b(?:dl\s*145|dl145)\b/i, prefix: 'dl145_' },
    { key: 'dl580', pattern: /\b(?:dl\s*580|dl580)\b/i, prefix: 'dl580_' },
    { key: 'sy480', pattern: /\b(?:sy\s*480|sy480|synergy\s*480|synergy\s*compute)\b/i, prefix: 'sy480_' },
    { key: 'sy100gb', pattern: /\b(?:sy\s*100gb|sy100gb|f32\s*module|f32|synergy\s*100gb|synergy\s*fabric|synergy\s*switch)\b/i, prefix: 'sy100gb' },
    { key: 'alletra', pattern: /\b(?:alletra|alletra\s*9000|alletra\s*storage|alletra\s*mp)\b/i, prefix: 'alletra' },
    { key: 'msl3040', pattern: /\b(?:msl\s*3040|msl3040|storeever|tape\s*library|tape\s*automation)\b/i, prefix: 'msl3040' },
    { key: 'gx5000', pattern: /\b(?:gx\s*5000|gx5000|cray\s*rack|gx\s*general)\b/i, prefix: 'gx5000' },
    { key: 'sn3600b', pattern: /\bsn\s*3600b\b/i, prefix: 'sn3600b' }
  ];

  // Dynamically augment PLATFORM_SIGNATURES with any newly discovered catalogs
  for (const c of catalogs) {
    const baseId = c.id.split('_')[0].toLowerCase();
    if (!PLATFORM_SIGNATURES.some(p => p.key === baseId || c.id.toLowerCase().startsWith(p.prefix || p.key))) {
      PLATFORM_SIGNATURES.push({
        key: baseId,
        pattern: new RegExp(`\\b${baseId}\\b`, 'i'),
        prefix: baseId
      });
    }
  }

  // Parse explicit generation from text (e.g. Gen11, Gen 11, Gen12, Gen 12)
  const explicitGenMatch = text.match(/\bgen\s*(\d+)\b/i);
  const explicitGen = explicitGenMatch ? `Gen${explicitGenMatch[1]}` : null;

  if (matchedCatalog && explicitGen && !matchedCatalog.id.toLowerCase().includes(explicitGen.toLowerCase())) {
    return { chassisKey: 'GENERATION_MISMATCH', catalogDir: null, catalogPath: null, catalogData: null, isAmbiguous: true, error: 'Explicit product and requested generation disagree.' };
  }
  const requestedGenerations = new Set([...text.matchAll(/\bgen\s*(\d+)\b/gi)].map(match => match[1]));
  if (requestedGenerations.size > 1) return { chassisKey: 'AMBIGUOUS_QUERY', catalogDir: null, catalogPath: null, catalogData: null, isAmbiguous: true, error: 'Multiple generations require separate configurations.' };

  if (!matchedCatalog) {
    const matchedPlatforms = PLATFORM_SIGNATURES.filter(p => p.pattern.test(text));

    if (matchedPlatforms.length === 1) {
      const platform = matchedPlatforms[0];
      const prefix = platform.prefix || (platform.key.includes('_') ? platform.key : `${platform.key}_`);
      const candidates = catalogs.filter(c => {
        const idLower = c.id.toLowerCase();
        return idLower.startsWith(prefix);
      });

      if (candidates.length === 1) {
        const cand = candidates[0];
        if (explicitGen && !cand.id.includes(explicitGen)) {
          return {
            chassisKey: `${platform.key.toUpperCase()}_${explicitGen}_UNSUPPORTED`,
            catalogDir: null,
            catalogPath: null,
            catalogData: null,
            isAmbiguous: true,
            error: `${platform.key.toUpperCase()} ${explicitGen} is not available in portfolio.`
          };
        }
        matchedCatalog = cand;
      } else if (candidates.length > 1) {
        if (explicitGen) {
          matchedCatalog = candidates.find(c => c.id.includes(explicitGen));
          if (!matchedCatalog) {
            return {
              chassisKey: `${platform.key.toUpperCase()}_${explicitGen}_UNSUPPORTED`,
              catalogDir: null,
              catalogPath: null,
              catalogData: null,
              isAmbiguous: true,
              error: `${platform.key.toUpperCase()} ${explicitGen} is not available in portfolio.`
            };
          }
        } else {
          return { chassisKey: 'AMBIGUOUS_PRODUCT', catalogDir: null, catalogPath: null,
            catalogData: null, isAmbiguous: true, candidates: candidates.map(c => c.id),
            error: 'Multiple product generations match; specify the exact target generation.' };
        }
      }
    } else if (matchedPlatforms.length > 1) {
      return {
        chassisKey: 'AMBIGUOUS_QUERY',
        catalogDir: null,
        catalogPath: null,
        catalogData: null,
        isAmbiguous: true,
        error: `Multiple hardware platforms matched query text: ${matchedPlatforms.map(p => p.key.toUpperCase()).join(', ')}. Please specify a single target model.`,
        availableCatalogs: catalogs.map(c => c.id)
      };
    }
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

  let catalogData = null;
  if (fs.existsSync(matchedCatalog.catalogJsonPath)) {
    try {
      catalogData = JSON.parse(fs.readFileSync(matchedCatalog.catalogJsonPath, 'utf-8'));
    } catch (_) {}
  }

  return {
    chassisKey: matchedCatalog.id,
    catalogDir: matchedCatalog.catalogDir,
    catalogPath: matchedCatalog.catalogJsonPath,
    catalogData,
    isAmbiguous: false
  };
}

/**
 * Classify incoming query text and file metadata into one of the 5 presales tracks
 * @param {string} queryText 
 * @param {object} context 
 * @returns {object} Intent classification
 */
function classifyQueryIntent(queryText = '', context = {}) {
  const text = String(queryText || '').trim().toLowerCase();
  const filePath = context.filePath || context.file || '';
  const explicitTracks = {
    WORKLOAD_DNA: 'workload-dna-skill', VALUE_ENGINEERING: 'value-engineering-skill',
    LEAST_DELTA_SYNTHESIS: 'least-delta-combinator-skill', WORKBOOK_GENERATION: 'workbook-generator-skill',
    REMARKS_RECONCILIATION: 'boq-remarks-reconciliation-skill', MULTI_CLUSTER_TENDER: 'multi-cluster-tender-skill',
    ADVERSARIAL_VALIDATION: 'adversarial-validation-skill', CONTINUOUS_LEARNING: 'continuous-learning-skill',
    KNOWLEDGE_SYNC: 'knowledge-sync-skill', CROSS_VENDOR_TRANSFORMATION: 'cross-vendor-transformation-skill',
    HETEROGENEOUS_TENDER_MODERNIZATION: 'heterogeneous-tender-modernizer', BOQ_EVALUATION: 'boq-eval-skill',
    BOM_RECONCILIATION: 'bom-reconciliation-skill', FREEFORM_QA: 'nlm-skill',
    RFP_SIZING_TO_BOM: 'rfp-sizing-synthesizer', CATALOG_INTELLIGENCE: 'catalog-intelligence-skill'
  };
  if (context.intent && explicitTracks[context.intent]) return {
    intent: context.intent, confidence: 1, skillTarget: explicitTracks[context.intent], rationale: 'Explicit requested execution track.'
  };
  // A file is input to an explicit requested operation, not an overriding intent.
  if (filePath) {
    const operation = classifyQueryIntent(text, { ...context, filePath: '', file: '' });
    if (!['FREEFORM_QA', 'BOQ_EVALUATION', 'OCR_QUOTE_INGESTION'].includes(operation.intent)) return operation;
  }


  // Explicit canonical handoffs must not loop back into competitor detection.
  if (context.intent === 'RFP_SIZING_TO_BOM') return {
    intent: context.intent, confidence: 1, skillTarget: 'rfp-sizing-synthesizer',
    rationale: 'Explicit scoped sizing handoff.'
  };

  // 0. Heterogeneous Tender Modernization & Carrier Fleet Synthesis keywords
  const isHeterogeneous =
    text.includes('heterogeneous') ||
    text.includes('mixed domain') ||
    text.includes('carrier fleet') ||
    text.includes('ad-hoc absorption') ||
    text.includes('dummy server') ||
    text.includes('tender modernization') ||
    text.includes('dirty boq') ||
    text.includes('unbuildable ad-hoc') ||
    text.includes('loose memory') ||
    text.includes('spare parts absorption') ||
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

  // 0b. Cross-Vendor Architectural Transformation keywords
  const isCrossVendorQuestion =
    /^(?:is\s+|can\s+|what\s+|how\s+|does\s+)/i.test(text) &&
    text.includes('?') &&
    !/\b(?:convert|transpile|transform|migrate)\b/i.test(text);

  const isCrossVendor = !isCrossVendorQuestion && (
    text.includes('dell to hpe') ||
    text.includes('cisco to hpe') ||
    text.includes('lenovo to hpe') ||
    text.includes('cross vendor') ||
    text.includes('transpile') ||
    text.includes('competitor quote') ||
    (/convert|map|transform|migrate/i.test(text) && /dell|cisco|lenovo|supermicro/i.test(text)) ||
    Boolean(context.crossVendor) ||
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

  // 1. File-based detection
  const detectedPath = filePath || (text.match(/[\w\-./\\]+\.(?:png|jpg|jpeg|webp|tiff|bmp|pdf|xlsx|xls|csv|tsv)/i)?.[0] || '');
  if (detectedPath) {
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
      if (text.includes('reconcile') || text.includes('compare') || text.includes('quote vs tender') || context.secondaryFilePath) {
        return {
          intent: 'BOM_RECONCILIATION',
          confidence: 0.96,
          skillTarget: 'bom-reconciliation-skill',
          rationale: 'Input contains spreadsheet files designated for multi-workbook reconciliation.'
        };
      }
      return {
        intent: 'BOQ_EVALUATION',
        confidence: 0.98,
        skillTarget: 'boq-eval-skill',
        rationale: 'Input contains a single customer BOQ/BOM file for physical buildability evaluation.'
      };
    }
  }

  // 2. Reconciliation keywords
  if (
    text.includes('reconcile') ||
    text.includes('compare bom') ||
    text.includes('tender vs quote') ||
    text.includes('ghost sku') ||
    text.includes('quote comparison')
  ) {
    return {
      intent: 'BOM_RECONCILIATION',
      confidence: 0.94,
      skillTarget: 'bom-reconciliation-skill',
      rationale: 'Query requests direct reconciliation between customer requirements and partner quotation.'
    };
  }

  // 2a. Workload DNA & Application Profiling keywords
  const isWorkloadDna =
    /\b(?:sap\s*hana|vmware|vcf|vsphere|vdi|ai\s*inference|llm\s*inference|machine\s*learning|hft|high[\s-]frequency\s*trading|oltp|sql\s*server|big\s*data|database\s*in[\s-]memory|workload\s*dna|numa\s*balanc|contested\s*resource|resource\s*arbitrat)\b/i.test(text) ||
    context.intent === 'WORKLOAD_DNA';

  if (isWorkloadDna && !text.includes('reconcile') && !isHeterogeneous && !isCrossVendor) {
    return {
      intent: 'WORKLOAD_DNA',
      confidence: 0.95,
      skillTarget: 'workload-dna-skill',
      rationale: 'Query targets application-specific workload profiling, NUMA memory balance, or contested resource arbitration.'
    };
  }

  // 2b. Value Engineering & Deal CapEx/OpEx Optimization keywords
  const isValueEngineering =
    /\b(?:value\s*engineering|budget\s*optimi[sz]|optimize.*budget|budget.*optimi[sz]|for\s*budget|reduce\s*capex|cost\s*reduction|surplus\s*budget|deal\s*capex|downsize\s*cpu|right[\s-]size\s*cpu)\b/i.test(text) ||
    Boolean(context.budget) ||
    context.intent === 'VALUE_ENGINEERING';

  if (isValueEngineering && !text.includes('reconcile')) {
    return {
      intent: 'VALUE_ENGINEERING',
      confidence: 0.94,
      skillTarget: 'value-engineering-skill',
      rationale: 'Query requests post-buildability CapEx/OpEx value engineering, CPU right-sizing, or budget optimization.'
    };
  }

  // 2c. Least-Delta Solution Combinator keywords
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

  // 2d. Commercial Remarks Reconciliation keywords
  const isRemarksReconciliation =
    /\b(?:commercial\s*remarks|reconciliation\s*remarks|append\s*remarks|engineering\s*remarks|commercial\s*action)\b/i.test(text) ||
    context.intent === 'REMARKS_RECONCILIATION';

  if (isRemarksReconciliation) {
    return {
      intent: 'REMARKS_RECONCILIATION',
      confidence: 0.94,
      skillTarget: 'boq-remarks-reconciliation-skill',
      rationale: 'Query requests appending auditable commercial remarks and quantity bridges to customer BOQ reconciliation rows.'
    };
  }

  // 2e. Professional Workbook & Portal Upload Generator keywords
  const isWorkbookGen =
    /\b(?:generate\s*(?:an?\s*)?(?:excel|workbook|spreadsheet|\.xlsx)|create\s*(?:an?\s*)?(?:excel|workbook|spreadsheet|\.xlsx)|export\s*(?:to\s*)?(?:excel|workbook|spreadsheet|\.xlsx)|portal\s*upload\s*sheet|7[\s-]column\s*portal|standardized\s*7[\s-]column)\b/i.test(text) ||
    context.intent === 'WORKBOOK_GENERATION';

  if (isWorkbookGen && !text.includes('reconcile')) {
    return {
      intent: 'WORKBOOK_GENERATION',
      confidence: 0.95,
      skillTarget: 'workbook-generator-skill',
      rationale: 'Query requests physical Excel workbook export, standardized 7-column portal sheet, or executive multi-rank deliverable.'
    };
  }

  // 2f. Multi-Node Cluster Tender Sizing (Text-only without files)
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

  // 2g. Adversarial Validation & Chaos Red-Teaming keywords (GAP-26)
  const isAdversarial =
    /\b(?:adversarial|red[\s-]team|stress[\s-]test|boundary[\s-]fuzz|chaos[\s-]test|fuzz\s*validation)\b/i.test(text) ||
    context.intent === 'ADVERSARIAL_VALIDATION';

  if (isAdversarial) {
    return {
      intent: 'ADVERSARIAL_VALIDATION',
      confidence: 0.95,
      skillTarget: 'adversarial-validation-skill',
      rationale: 'Query requests automated adversarial red-teaming, boundary fuzzing, and physical constraint stress-testing.'
    };
  }

  // 2h. Continuous Learning Feedback & Quarantine keywords (GAP-29)
  const isContinuousLearning =
    /\b(?:continuous[\s-]learning|record\s*feedback|quarantine\s*(?:delta|rule)|learning\s*reachability|feedback\s*loop)\b/i.test(text) ||
    context.intent === 'CONTINUOUS_LEARNING';

  if (isContinuousLearning) {
    return {
      intent: 'CONTINUOUS_LEARNING',
      confidence: 0.94,
      skillTarget: 'continuous-learning-skill',
      rationale: 'Query requests recording continuous learning feedback, delta rule reflection, or reachability verification.'
    };
  }

  // 2i. Knowledge Sync & Drift Guard keywords (GAP-32)
  const isKnowledgeSync =
    /\b(?:knowledge[\s-]sync|sync\s*deltas?|sync\s*catalog|inspect\s*drift|knowledge\s*drift|post[\s-]flow\s*sync)\b/i.test(text) ||
    context.intent === 'KNOWLEDGE_SYNC';

  if (isKnowledgeSync) {
    return {
      intent: 'KNOWLEDGE_SYNC',
      confidence: 0.94,
      skillTarget: 'knowledge-sync-skill',
      rationale: 'Query requests bi-directional knowledge synchronization or catalog drift inspection against Gemini NotebookLM.'
    };
  }

  // 3. Catalog Intelligence keywords
  const hasCatalogKeywords =
    text.includes('price trend') ||
    text.includes('pricing history') ||
    text.includes('is obsolete') ||
    text.includes('lifecycle') ||
    text.includes('direct ship') ||
    text.includes('gpl price') ||
    text.includes('list price of') ||
    text.includes('options added');

  if (hasCatalogKeywords) {
    return {
      intent: 'CATALOG_INTELLIGENCE',
      confidence: 0.95,
      skillTarget: 'catalog-intelligence-skill',
      rationale: 'Query targets pricing history, SKU lifecycle status, or option catalog metadata.'
    };
  }

  // 4. RFP Sizing & Presales Sizing Specifications (Evaluated before generic question trigger)
  const serverModelPattern = /\b(?:dl\s*380a?|dl\s*145|dl\s*580|sy\s*480|synergy|alletra|cray|sn\s*3600b?|computescale|tensorscale|proliant)\b/i;
  const specPattern = /\b(?:processor|cpu|cores?|memory|ram|dimm|gpus?|accelerators?|h200|h100|l40s|drive|drives|storage|nvme|ssd|1gbe|10gbe|25gbe|sfp|base-t|nodes?|units?|no\s+local\s+drive|basic\s+processor|minimum\s+memory)\b/i;
  const hasSpecTokens = /\b(?:\d+x|\d+\s*(?:gb|tb|cores?|units?|nodes?)|with|plus|and)\b/i.test(text);
  const isPresalesSpecification = (serverModelPattern.test(text) && specPattern.test(text) && hasSpecTokens) ||
    /\b(?:tensorscale|computescale)\b/i.test(text);

  const hasExplicitSizingVerb = /\b(?:size\s+a|sizing|build\s+a\s+bom|generate\s+a\s+bom|create\s+a\s+configuration|quote\s+me|configure|can\s+(?:i|we)\s+(?:get|order|configure|quote|have|build))\b/i.test(text);

  const hasSizingKeywords =
    (isPresalesSpecification && (!text.includes('?') || hasExplicitSizingVerb)) ||
    text.includes('size a server') ||
    text.includes('sizing') ||
    text.includes('build a bom') ||
    text.includes('generate a bom') ||
    text.includes('create a configuration') ||
    (text.includes('need') && (text.includes('cores') || text.includes('ram') || text.includes('tb storage')));

  if (hasSizingKeywords) {
    return {
      intent: 'RFP_SIZING_TO_BOM',
      confidence: 0.95,
      skillTarget: 'rfp-sizing-synthesizer',
      rationale: 'Query specifies workload sizing capacity parameters (cores, memory, storage, accelerators) requiring BOM synthesis.'
    };
  }

  // 5. Interrogative Questions & Knowledge Architecture (FREEFORM_QA)
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

  // 6. BOQ Evaluation text check (Broadened regex matching 6-char, AAE, and service SKUs per GAP-31)
  const detectedSkuTokens = (text.match(/\b([A-Z0-9]{3,8}-[A-Z0-9]{3,4}|[A-Z0-9]{6}|[A-Z0-9]{5,8}AAE|[HURS][A-Z0-9]{4,11})\b/gi) || []).filter(isValidHpeSKU);
  const hasSkuTokens = detectedSkuTokens.length >= 2;
  const hasBoqKeywords = text.includes('evaluate boq') || text.includes('verify bom') || text.includes('check buildability') || text.includes('validate boq');

  if (hasSkuTokens || hasBoqKeywords) {
    return {
      intent: 'BOQ_EVALUATION',
      confidence: 0.90,
      skillTarget: 'boq-eval-skill',
      rationale: 'Query contains specific SKU strings or requests physical validation of a drafted configuration.'
    };
  }

  // 7. Default to Freeform Q&A Grounded via NotebookLM
  return {
    intent: 'FREEFORM_QA',
    confidence: 0.88,
    skillTarget: 'nlm-skill',
    rationale: 'Freeform conversational inquiry regarding HPE server architecture, rules, or QuickSpecs.'
  };
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

  const isOffline = Boolean(context.offlineMode || process.env.OFFLINE_MODE === 'true');
  if (!isOffline && chassisName && chassisName !== 'UNKNOWN_PRODUCT') {
    try {
      const { resolveProductNotebookId } = require('../lib/sync/nlm_solution_source_validator.js');
      const { executeNotebookQuery } = require('../lib/notebook/notebook_query_utils.js');
      const notebookId = resolveProductNotebookId(chassisName);
      if (notebookId) {
        const queryRes = await executeNotebookQuery(notebookId, queryText, {
          context: { chassis: chassisName },
          timeout: 15000
        });
        if (queryRes && queryRes.answer && !queryRes.isFallback) {
          ragResult = queryRes;
          isCloudGrounded = queryRes.isCloudGrounded;
          cloudSource = queryRes.source;
        }
      }
    } catch (_) {}
  }

  if (!ragResult) {
    ragResult = queryLocalKnowledgeBase(queryText, chassisName);
  }

  return {
    chassis: chassisName,
    catalogDir: chassisInfo.catalogDir,
    answer: ragResult.answer,
    citations: ragResult.citations || [],
    source: cloudSource || 'Local RAG Dual-Layer Search & Master Knowledge Registry',
    isCloudGrounded: Boolean(isCloudGrounded)
  };
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
        JSON_MODE: true,
        OFFLINE_MODE: Boolean(context.offlineMode || process.env.OFFLINE_MODE === 'true')
      });
    } catch (pipeErr) {
      return { status: 'ERROR', error: pipeErr.message, traceId: pipeErr.traceId || null, evidenceLogPath: pipeErr.evidenceLogPath || null };
    }
  } else if (context.items && Array.isArray(context.items)) {
    return evaluateBOQMultiAspect(context.items, {
      targetDir: chassisInfo.catalogDir || '',
      catalogData: chassisInfo.catalogData,
      productConfirmed: !chassisInfo.isAmbiguous
    });
  } else {
    return {
      message: 'BOQ evaluation requested. Please upload or specify a BOQ file path or item list.',
      suggestedAction: 'UPLOAD_BOQ_SPREADSHEET'
    };
  }
}

function _handleOcrQuoteIngestion(queryText, context) {
  const imgPath = context.filePath || (queryText.match(/[\w\-./\\]+\.(?:png|jpg|jpeg|webp|tiff|bmp|pdf)/i)?.[0] || '');
  return {
    intent: 'OCR_QUOTE_INGESTION',
    filePath: imgPath,
    skillTarget: 'ocr-quote-ingestion-skill',
    status: 'READY_FOR_OCR',
    message: `Input document identified (${path.basename(imgPath || 'quote')}). Routed to multimodal Gemini Vision OCR pipeline.`
  };
}

function _handleCatalogIntelligence(queryText, context) {
  const skuCandidates = (queryText.match(/\b([A-Z0-9]{3,8}-[A-Z0-9]{3,4}|[A-Z0-9]{6}|[A-Z0-9]{5,8}AAE|[HURS][A-Z0-9]{4,11})\b/gi) || []).filter(isValidHpeSKU);
  const targetSku = skuCandidates.length > 0 ? cleanBaseSKU(skuCandidates[0]) : null;
  const chassisInfo = getChassisCatalog(queryText, context);
  const historyFile = chassisInfo.catalogDir ? path.join(chassisInfo.catalogDir, 'history', 'price_history.json') : null;
  let skuHistory = null;
  if (historyFile && fs.existsSync(historyFile)) {
    try {
      const hist = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
      skuHistory = targetSku ? (hist[targetSku] || null) : hist;
    } catch (e) {}
  }

  let liveSkuDetails = null;
  if (targetSku && chassisInfo.catalogData?.entries) {
    for (const entry of chassisInfo.catalogData.entries) {
      if (Array.isArray(entry.skus)) {
        const found = entry.skus.find(it => cleanBaseSKU(it.sku || it['Product #']) === targetSku);
        if (found) {
          liveSkuDetails = {
            sku: found.sku || found['Product #'],
            description: found.Description || found.description,
            category: entry.parentCategory || entry.subCategory || found.category || 'General Option',
            subCategory: entry.subCategory || null,
            lifecycleStatus: found.lifecycleStatus || found['Lifecycle Status'] || found['CLIC Status'] || 'Active',
            effectiveStartDate: found['Start Date'] || found.effectiveStartDate || null,
            discontinuedDate: found['Discontinued Date'] || found.discontinuedDate || null,
            currentPriceUsd: found.listPrice || (found['Unit Price (USD)'] ? parseFloat(found['Unit Price (USD)']) : null),
            priceHistoryTrail: found['Price History Trail'] || null,
            availability: found.Availability || null
          };
          break;
        }
      }
    }
  }

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

async function _handleRfpSizing(queryText, context) {
  const chassisInfo = getChassisCatalog(queryText, context);
  const nodeMatch = queryText.match(/\b(\d+)\s*(?:nodes?|servers?|units?|appliances?|clusters?)\b/i);
  const serverCount = nodeMatch ? parseInt(nodeMatch[1], 10) : (context.serverCount || 1);

  let rawLines = queryText.split(/[\r\n;]+/).map(l => l.trim()).filter(Boolean);
  if (rawLines.length === 1) {
    const clauses = queryText.split(/\s+(?:with|and|plus|,)\s+/i).map(c => c.trim()).filter(Boolean);
    if (clauses.length > 1) rawLines = clauses;
  }
  // Filter out leading chassis declaration clause if it doesn't contain component specs
  if (rawLines.length > 1) {
    const first = rawLines[0];
    const hasSpec = /\b(?:processor|cpu|cores?|memory|ram|dimm|gpus?|accelerators?|h200|h100|drive|drives|storage|nvme|ssd|nic|adapter|power)\b/i.test(first);
    if (!hasSpec && /\b(?:dl\s*\d{3}|sy\s*\d{3}|alletra|cray|sn\s*\d{4}|proliant|size\s+a|build\s+a|need\s+a)\b/i.test(first)) {
      rawLines.shift();
    }
  }
  const unresolvedRequirements = rawLines.map(line => ({ line }));

  let sizingResult = null;
  let candidateItems = [];
  let evaluation = null;

  if (chassisInfo.catalogData) {
    sizingResult = resolveRequirementIntent({
      rawLines,
      unresolvedRequirements,
      catalogData: chassisInfo.catalogData,
      productConfirmed: true
    });

    const baseSku = getBaseChassisSku(chassisInfo.chassisKey);
    if (baseSku) {
      candidateItems.push({
        sku: baseSku,
        quantity: 1,
        description: `${chassisInfo.chassisKey} CTO Base Chassis`
      });
    }

    (sizingResult.resolutions || []).forEach(r => {
      const sku = r.appliedSku || r.candidates?.[0]?.sku;
      if (sku && isValidHpeSKU(sku)) {
        let qty = 1;
        const qtyMatch = r.input.match(/\b(\d+)\s*(?:x|units?|pcs?|processors?|cpus?|dimms?|drives?|ssds?|psus?)\b/i);
        if (qtyMatch) {
          qty = parseInt(qtyMatch[1], 10) || 1;
        } else if (r.expectedRole === 'Processor' && r.input.toLowerCase().includes('dual')) {
          qty = 2;
        }
        candidateItems.push({
          sku,
          quantity: qty,
          description: r.candidates?.[0]?.description || r.input,
          role: r.expectedRole,
          confidence: r.confidence
        });
      }
    });

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
  }

  let traceId = null;
  let evidenceLogPath = null;
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
    traceId = ledger.traceId;
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
    candidateItems.forEach(item => {
      ledger.recordSkuAudit(
        item.sku,
        'SIZED_CANDIDATE_SKU',
        item.description || 'Synthesized from natural language sizing specification',
        null,
        item.role || item.category || 'Candidate Component',
        { quantity: item.quantity, serverCount }
      );
    });
    ledger.completePhase(3, evaluation && !evaluation.error && evaluation.mathFrameworkPass === true && !evaluation.errors?.length ? 'PASSED' : 'ACTION_REQUIRED', {
      errors: evaluation?.errors?.length || 0,
      confidenceScore: evaluation?.confidence?.score || null
    });

    ledger.startPhase(4, 'Workload DNA & Construction Plan Analysis', { constructionPlan: sizingResult?.constructionPlan || [] });
    ledger.completePhase(4, sizingResult && !sizingResult.requiresHumanClarification ? 'PASSED' : 'ACTION_REQUIRED', { resolutionsCount: sizingResult?.resolutions?.length || 0 });

    ledger.startPhase(5, 'Strategy Synthesis & Multi-Node Cluster Sizing', { serverCount });
    ledger.completePhase(5, 'ACTION_REQUIRED', { clusterSizing: evaluation?.clusterSizing || null, reason: 'Sized candidates require full pipeline validation before ranking or delivery.' });

    ledger.startPhase(6, 'Confidence Floor & Presales Clarification Scoring', { requiresClarification: sizingResult?.requiresHumanClarification });
    ledger.completePhase(6, !sizingResult || sizingResult.requiresHumanClarification ? 'ACTION_REQUIRED' : 'PASSED', {
      requiresHumanClarification: sizingResult?.requiresHumanClarification
    });

    ledger.startPhase(7, 'QuickSpecs & Dynamic Catalog Verification', { chassisKey: chassisInfo.chassisKey });
    ledger.completePhase(7, 'ACTION_REQUIRED', { catalogAvailable: Boolean(chassisInfo.catalogData), reason: 'QuickSpecs and whole-candidate NotebookLM review have not run in the sizing path.' });

    ledger.startPhase(8, 'Presales Candidate BOM Generation', { itemCount: candidateItems.length });
    ledger.completePhase(8, 'ACTION_REQUIRED', { candidateBOM: candidateItems, reason: 'Draft sizing output only; no validated portal workbook or Google Sheet delivery.' });

    ledger.startPhase(9, 'Presales Evidence Trace Finalization', {});
    ledger.completePhase(9, 'ACTION_REQUIRED', { status: 'SIZING_DRAFT', reason: 'Knowledge synchronization has not run in the sizing path.' });

    const exported = ledger.finalizeAndExport();
    evidenceLogPath = exported.jsonPath;
  } catch (err) {
    const _logger = require('../lib/system/pipeline_logger.js');
    _logger.warn('ROUTE_QUERY', 'Failed to finalize RFP sizing evidence ledger', err);
  }

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
    evaluation,
    traceId,
    evidenceLogPath,
    status: !sizingResult || sizingResult.requiresHumanClarification ? 'REQUIRES_HUMAN_CLARIFICATION' : 'SIZING_DRAFT'
  };
}

function _handleBomReconciliation(queryText, context) {
  const chassisInfo = getChassisCatalog(queryText, context);
  const vendorFile = context.vendorFilePath || context.secondaryFilePath || (context.filePath?.toLowerCase().includes('vendor') ? context.filePath : null);
  const customerFile = context.customerFilePath || (context.secondaryFilePath ? context.filePath : null);

  if (vendorFile && fs.existsSync(vendorFile)) {
    let proposedSolution = null;
    if (customerFile && fs.existsSync(customerFile)) {
      const customerItems = readRoutedItems({ filePath: customerFile, targetSheet: context.targetSheet });
      proposedSolution = { rank: 1, name: 'Original customer baseline', skuList: customerItems };
    } else if (context.proposedSolution) {
      proposedSolution = context.proposedSolution;
    } else {
      proposedSolution = { rank: 1, name: 'Baseline Evaluation', skuList: [] };
    }

    const auditReport = verifyVendorBOM(path.resolve(vendorFile), proposedSolution, chassisInfo.catalogDir);
    if (auditReport?.discrepancies?.uncatalogedSkus?.length) {
      auditReport.discrepancies.uncatalogedSkus = auditReport.discrepancies.uncatalogedSkus.map(sku => ({
        sku,
        isValidFormat: isValidHpeSKU(sku),
        note: isValidHpeSKU(sku)
          ? 'Valid HPE SKU format; uncataloged in current scraped snapshot (check latest QuickSpecs or regional catalog).'
          : 'Unrecognized SKU format; potential typo or non-HPE part number.'
      }));
    }
    return {
      intent: 'BOM_RECONCILIATION',
      auditReport,
      message: auditReport.is100PercentMatch
        ? 'Vendor quote perfectly matches proposed configuration.'
        : `Reconciliation identified ${auditReport.discrepancies.addedByVendor.length} added, ${auditReport.discrepancies.removedByVendor.length} removed, and ${auditReport.discrepancies.uncatalogedSkus.length} uncataloged SKUs.`
    };
  } else if (context.filePath && fs.existsSync(context.filePath)) {
    const auditReport = verifyVendorBOM(path.resolve(context.filePath), { rank: 1, skuList: [] }, chassisInfo.catalogDir);
    if (auditReport?.discrepancies?.uncatalogedSkus?.length) {
      auditReport.discrepancies.uncatalogedSkus = auditReport.discrepancies.uncatalogedSkus.map(sku => ({
        sku,
        isValidFormat: isValidHpeSKU(sku),
        note: isValidHpeSKU(sku)
          ? 'Valid HPE SKU format; uncataloged in current scraped snapshot (check latest QuickSpecs or regional catalog).'
          : 'Unrecognized SKU format; potential typo or non-HPE part number.'
      }));
    }
    return {
      intent: 'BOM_RECONCILIATION',
      auditReport,
      message: `Single-file audit completed against catalog ${chassisInfo.chassisKey}.`
    };
  } else {
    return {
      intent: 'BOM_RECONCILIATION',
      message: 'BOM Reconciliation requires a vendor quote file (--vendor) and optional customer tender file (--customer).',
      suggestedAction: 'UPLOAD_VENDOR_AND_CUSTOMER_SPREADSHEETS'
    };
  }
}

async function _handleHeterogeneousTenderModernization(queryText, context) {
  const { HeterogeneousTenderModernizer } = require('../lib/boq/heterogeneous_tender_modernizer.js');
  const modernizer = new HeterogeneousTenderModernizer({
    defaultServerPlatform: context.targetPlatform || context.chassisName,
    strictZeroJargon: true
  });

  let parsedTables = context.tables;
  if (!parsedTables && context.filePath && path.extname(context.filePath).toLowerCase() === '.json') {
    const data = JSON.parse(fs.readFileSync(context.filePath, 'utf8'));
    parsedTables = data.tables || data;
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

async function _handleCrossVendorTransformation(queryText, context) {
  const { transformCompetitorQuote } = require('../lib/boq/cross_vendor_transformer.js');
  const targetChassis = context.targetHpeChassis || context.chassisName || null;
  const qLower = (typeof queryText === 'string' ? queryText : '').toLowerCase();
  const sourceVendor = context.sourceVendor || ['cisco', 'lenovo', 'supermicro', 'dell'].find(vendor => qLower.includes(vendor))?.toUpperCase() || null;
  const nodeCount = context.nodeMultiplier ?? context.nodes ?? 1;

  let inputData = context.competitorSpec || queryText;
  if (context.filePath) {
    const extension = path.extname(context.filePath).toLowerCase();
    if (!['.txt', '.md', '.json'].includes(extension)) return {
      intent: 'CROSS_VENDOR_TRANSFORMATION', status: 'STRUCTURED_TENDER_REQUIRED',
      message: 'Ingest spreadsheets and scanned quotes before transformation; binary files cannot be read as tender text.'
    };
    const contents = fs.readFileSync(context.filePath, 'utf8');
    inputData = extension === '.json' ? JSON.parse(contents) : contents;
  }

  const transformResult = transformCompetitorQuote(inputData, sourceVendor, targetChassis, {
    nodeMultiplier: nodeCount, targetBom: context.targetBom
  });

  return {
    intent: 'CROSS_VENDOR_TRANSFORMATION',
    skillTarget: 'cross-vendor-transformation-skill',
    ...transformResult,
    sourceVendor,
    targetChassis,
    competitorSpec: transformResult.competitorSpec,
    auditReport: transformResult.auditReport,
    strategyMatrix: transformResult.strategyMatrix,
    recommendedBom: transformResult.recommendedBom
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
  if (!context.items && !context.filePath) return {
    intent: 'WORKLOAD_DNA', status: 'SCOPED_SIZING_REQUIRED', requestedWorkload: queryText,
    message: 'Preserve the requested workload and size an exact product candidate before hardware profiling.'
  };
  const items = readRoutedItems(context);
  return { intent: 'WORKLOAD_DNA', status: 'ADVISORY', requestedWorkload: queryText,
    dna: extractWorkloadDna(items), items, arbitrationAvailable: false,
    message: 'Hardware profile extracted. Application suitability, NUMA placement and resource arbitration require scoped evaluation.' };
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
    goldenRuleCompliant: result.hasBudgetConstraint && !result.isBudgetExceeded && !result.hasZeroPriceSkus,
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
  const { generateAdversarialBOQ } = require('./adversarial_agent.js');
  const chassisInfo = getChassisCatalog(queryText, context);
  const targetChassis = context.chassisName || chassisInfo.chassisKey;

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
    chassis: targetChassis,
    generatedBoq: fakeBoq,
    evaluation: {
      isCaught: totalIssuesCaught > 0,
      totalIssuesCaught,
      errors,
      missingDependencies: missing.map(m => m.reason || m.sku || m.key)
    },
    message: totalIssuesCaught > 0
      ? `Adversarial stress-testing successful: physical constraint checkers caught ${totalIssuesCaught} anomaly(ies).`
      : 'Adversarial advisory: Evaluator did not flag violations on the generated test configuration.'
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
  const evaluation = evaluateBOQMultiAspect(items, { catalogData: scope.catalogData, targetDir: scope.catalogDir });
  const acceptance = require('../lib/boq/bom_verifier').verifyPrePresentationAcceptance(evaluation, 'BOQ_EVALUATION', { ...context, catalogData: scope.catalogData });
  if (!acceptance.isValid) return { intent: 'WORKBOOK_GENERATION', status: 'VALIDATION_REQUIRED',
    evaluation, acceptanceGate: acceptance, message: 'Workbook export blocked by pre-presentation checks.' };
  const name = 'Portal_Draft_' + new Date().toISOString().replace(/[:.]/g, '-') + '.xlsx';
  const exportPath = path.join(scope.catalogDir, 'deliverables', name);
  require('../lib/boq/generate_boq_xlsx').generateRankedPortalWorkbook(evaluation, exportPath);
  if (!fs.existsSync(exportPath)) throw new Error('Workbook writer did not create the artifact.');
  return { intent: 'WORKBOOK_GENERATION', status: 'GENERATED_DRAFT', chassis: scope.chassisKey,
    exportPath, fileName: name, acceptanceGate: acceptance,
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

async function _handleMultiClusterTender(queryText, context) {
  const scope = requireScopedCatalog(queryText, context);
  const profile = getChassisMap()[scope.chassisKey];
  const counts = [...queryText.matchAll(/\b(\d+)\s*(?:nodes?|servers?|units?)\b/gi)].map(match => Number(match[1]));
  const count = context.serverCount ?? (counts.length === 1 ? counts[0] : null);
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
      powerEnvelopeKw: watts != null ? count * watts / 1000 : null },
    message: 'Rack and power estimates use explicit product height and supplied site/power inputs. Blade enclosure and multi-tier relationships require separate sizing.' };
}

/**
 * Execute routed presales query based on classified intent
 * @param {string} queryText 
 * @param {object} context 
 * @returns {Promise<object>} Execution result
 */
async function executeRoutedQuery(queryText = '', context = {}) {
  const classification = classifyQueryIntent(queryText, context);
  const startTime = Date.now();

  let responseData = null;

  switch (classification.intent) {
    case 'CROSS_VENDOR_TRANSFORMATION':
      responseData = await _handleCrossVendorTransformation(queryText, context);
      break;

    case 'HETEROGENEOUS_TENDER_MODERNIZATION':
      responseData = await _handleHeterogeneousTenderModernization(queryText, context);
      break;

    case 'FREEFORM_QA':
      responseData = await _handleFreeformQa(queryText, context);
      break;

    case 'BOQ_EVALUATION':
      responseData = await _handleBoqEvaluation(queryText, context);
      break;

    case 'OCR_QUOTE_INGESTION':
      responseData = _handleOcrQuoteIngestion(queryText, context);
      break;

    case 'CATALOG_INTELLIGENCE':
      responseData = _handleCatalogIntelligence(queryText, context);
      break;

    case 'RFP_SIZING_TO_BOM':
      responseData = await _handleRfpSizing(queryText, context);
      break;

    case 'BOM_RECONCILIATION':
      responseData = _handleBomReconciliation(queryText, context);
      break;

    case 'WORKLOAD_DNA':
      responseData = await _handleWorkloadDna(queryText, context);
      break;

    case 'VALUE_ENGINEERING':
      responseData = await _handleValueEngineering(queryText, context);
      break;

    case 'LEAST_DELTA_SYNTHESIS':
      responseData = await _handleLeastDeltaSynthesis(queryText, context);
      break;

    case 'WORKBOOK_GENERATION':
      responseData = await _handleWorkbookGeneration(queryText, context);
      break;

    case 'REMARKS_RECONCILIATION':
      responseData = await _handleRemarksReconciliation(queryText, context);
      break;

    case 'MULTI_CLUSTER_TENDER':
      responseData = await _handleMultiClusterTender(queryText, context);
      break;

    case 'ADVERSARIAL_VALIDATION':
      responseData = await _handleAdversarialValidation(queryText, context);
      break;

    case 'CONTINUOUS_LEARNING':
      responseData = await _handleContinuousLearning(queryText, context);
      break;

    case 'KNOWLEDGE_SYNC':
      responseData = await _handleKnowledgeSync(queryText, context);
      break;

    default:
      responseData = {
        intent: classification.intent,
        skillTarget: classification.skillTarget,
        instructions: `Engage ${classification.skillTarget} to process: ${classification.rationale}`,
        promptContext: queryText
      };
      break;
  }

  // Ensure universal trace ID & execution provenance across all routed tracks (GAP-33 / INV-111)
  const crypto = require('crypto');
  let traceId = responseData?.traceId;
  let evidenceLogPath = responseData?.evidenceLogPath || null;

  if (!traceId) {
    traceId = `TRC-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    if (responseData && typeof responseData === 'object') {
      responseData.traceId = traceId;
    }
  }

  // Persist evidence ledger if requested or if candidate BOM was evaluated without prior ledger
  if (context.persistLedger && !evidenceLogPath && responseData && typeof responseData === 'object') {
    try {
      const { createEvidenceLedger } = require('../lib/system/evidence_ledger.js');
      const ledger = createEvidenceLedger({
        traceId,
        chassis: responseData.chassis || context.chassisName || 'SCOPED_ROUTER_QUERY',
        filePath: context.filePath || 'ROUTER_QUERY_INPUT'
      });
      ledger.startPhase(1, 'Presales Query Intake', { query: queryText, intent: classification.intent });
      ledger.completePhase(1, 'PASSED', { intent: classification.intent });
      ledger.startPhase(2, 'Router Dispatch & Execution', { skillTarget: classification.skillTarget });
      ledger.completePhase(2, 'PASSED', { status: responseData.status || 'COMPLETED' });
      const exported = ledger.finalizeAndExport();
      evidenceLogPath = exported.jsonPath;
      responseData.evidenceLogPath = evidenceLogPath;
      responseData.traceStatus = 'PERSISTED_EVIDENCE_LEDGER';
    } catch (e) {
      responseData.traceStatus = 'CORRELATION_ONLY_NO_PERSISTED_LEDGER';
    }
  } else if (responseData && typeof responseData === 'object' && !responseData.traceStatus) {
    responseData.traceStatus = evidenceLogPath ? 'PERSISTED_EVIDENCE_LEDGER' : 'CORRELATION_ONLY_NO_PERSISTED_LEDGER';
  }

  // 14-Point Pre-Presentation Acceptance Gate (GAP-24, GAP-36, output-validation-skill)
  try {
    const { verifyPrePresentationAcceptance } = require('../lib/boq/bom_verifier.js');
    const evalContext = {
      ...context,
      catalogData: context.catalogData || responseData?.catalogData || responseData?.chassisInfo?.catalogData,
      catalogDir: context.catalogDir || responseData?.catalogDir || responseData?.chassisInfo?.catalogDir
    };
    const acceptance = responseData?.acceptanceGate || verifyPrePresentationAcceptance(responseData, classification.intent, evalContext);
    if (responseData && typeof responseData === 'object') {
      responseData.acceptanceGate = {
        status: acceptance.status,
        isValid: acceptance.isValid,
        blockersCount: acceptance.blockersCount,
        warningsCount: acceptance.warningsCount,
        blockers: acceptance.blockers,
        warnings: acceptance.warnings
      };
    }
  } catch (error) {
    if (responseData && typeof responseData === 'object') responseData.acceptanceGate = {
      status: 'ERROR', isValid: false, blockersCount: 1, warningsCount: 0,
      blockers: [{ id: 'ACCEPTANCE_ERROR', detail: error.message }]
    };
  }

  return {
    query: queryText,
    classification,
    result: responseData,
    traceId,
    executionTimeMs: Date.now() - startTime,
    timestamp: new Date().toISOString()
  };
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
