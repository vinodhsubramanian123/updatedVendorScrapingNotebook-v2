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

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

function getBaseChassisSku(chassisKey = '') {
  const map = {
    'DL380_Gen12': 'P73282-B21',
    'DL380_Gen11': 'P52534-B21',
    'DL360_Gen11': 'P52499-B21',
    'DL380a_Gen12': 'P76706-B21',
    'DL145_Gen11': 'P71964-B21',
    'DL580_Gen12': 'P73282-B21',
    'SY480_Gen12': '864273-B21',
    'MSL3040_Tape': 'Q6Q67A'
  };
  return map[chassisKey] || 'P73282-B21';
}

function getChassisCatalog(queryText = '', context = {}) {
  const text = (queryText + ' ' + (context.chassisName || context.model || '')).toLowerCase();

  let relDir = 'ProLiant/Gen12/DL380_Gen12';
  let chassisKey = 'DL380_Gen12';
  let catalogName = 'DL380_Gen12_Catalog.json';

  if (/\bdl\s*380\s*a\b/i.test(text) || text.includes('dl380a')) {
    relDir = 'ProLiant/Gen12/DL380a_Gen12';
    chassisKey = 'DL380a_Gen12';
    catalogName = 'DL380a_Gen12_Catalog.json';
  } else if ((text.includes('dl380') || text.includes('dl 380')) && (text.includes('gen11') || text.includes('gen 11'))) {
    relDir = 'ProLiant/Gen11/DL380_Gen11';
    chassisKey = 'DL380_Gen11';
    catalogName = 'DL380_Gen11_Catalog.json';
  } else if (text.includes('dl360') || text.includes('dl 360')) {
    relDir = 'ProLiant/Gen11/DL360_Gen11';
    chassisKey = 'DL360_Gen11';
    catalogName = 'DL360_Gen11_Catalog.json';
  } else if (/\bdl\s*145\b/i.test(text) || text.includes('dl145')) {
    relDir = 'ProLiant/Gen11/DL145_Gen11';
    chassisKey = 'DL145_Gen11';
    catalogName = 'DL145_Gen11_Catalog.json';
  } else if (/\bdl\s*580\b/i.test(text) || text.includes('dl580')) {
    relDir = 'ProLiant/Gen12/DL580_Gen12';
    chassisKey = 'DL580_Gen12';
    catalogName = 'DL580_Gen12_Catalog.json';
  } else if (text.includes('synergy') || text.includes('sy480') || text.includes('sy 480')) {
    relDir = 'Synergy/Gen12/SY480_Gen12';
    chassisKey = 'SY480_Gen12';
    catalogName = 'SY480_Gen12_Catalog.json';
  } else if (text.includes('msl3040') || text.includes('msl 3040') || text.includes('tape')) {
    relDir = 'StoreEver/Gen1/MSL3040_Tape';
    chassisKey = 'MSL3040_Tape';
    catalogName = 'MSL3040_Tape_Catalog.json';
  } else if (text.includes('alletra') || text.includes('b10000')) {
    relDir = 'Alletra/Storage/Alletra_Storage_System';
    chassisKey = 'Alletra_Storage_System';
    catalogName = 'Alletra_Storage_System_Catalog.json';
  } else if (text.includes('cray') || text.includes('gx5000') || text.includes('gx 5000')) {
    relDir = 'Cray/Gen1/GX5000_General_RACK';
    chassisKey = 'GX5000_General_RACK';
    catalogName = 'GX5000_General_RACK_Catalog.json';
  }

  const catalogDir = path.join(PROJECT_ROOT, 'outputs', relDir);
  const catalogPath = path.join(catalogDir, catalogName);
  let catalogData = null;
  if (fs.existsSync(catalogPath)) {
    try {
      catalogData = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
    } catch (_) {}
  }

  return { chassisKey, catalogDir, catalogPath, catalogData };
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

  // 1. File-based detection
  if (filePath) {
    const ext = path.extname(filePath).toLowerCase();
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

  // 4. Interrogative Questions & Knowledge Architecture (FREEFORM_QA)
  const isQuestion =
    /^(?:can\s+i|what\s+(?:is|are|options|can|do|does)|how\s+|why\s+|does\s+|is\s+(?:it|there))\b/i.test(text) ||
    (text.includes('?') && !/\b(?:size\s+a|sizing|build\s+a\s+bom|generate\s+a\s+bom)\b/i.test(text));

  if (isQuestion) {
    return {
      intent: 'FREEFORM_QA',
      confidence: 0.92,
      skillTarget: 'presales-query-router',
      rationale: 'Freeform conversational inquiry regarding HPE server architecture, rules, or QuickSpecs.'
    };
  }

  // 5. RFP Sizing & Presales Sizing Specifications
  const serverModelPattern = /\b(?:dl\s*380a?|dl\s*145|dl\s*580|sy\s*480|synergy|alletra|cray|computescale|tensorscale|proliant)\b/i;
  const specPattern = /\b(?:processor|cpu|cores?|memory|ram|dimm|gpus?|accelerators?|h200|h100|l40s|drive|drives|storage|nvme|ssd|1gbe|10gbe|25gbe|sfp|base-t|nodes?|units?|no\s+local\s+drive|basic\s+processor|minimum\s+memory)\b/i;
  const hasSpecTokens = /\b(?:\d+x|\d+\s*(?:gb|tb|cores?|units?|nodes?)|with|plus|and)\b/i.test(text);
  const isPresalesSpecification = (serverModelPattern.test(text) && specPattern.test(text) && hasSpecTokens) ||
    /\b(?:tensorscale|computescale)\b/i.test(text);

  const hasSizingKeywords =
    isPresalesSpecification ||
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

  // 5. BOQ Evaluation text check
  const hasSkuTokens = (text.match(/[A-Z0-9]{5,7}-[A-Z0-9]{3,4}/gi) || []).length >= 2;
  const hasBoqKeywords = text.includes('evaluate boq') || text.includes('verify bom') || text.includes('check buildability') || text.includes('validate boq');

  if (hasSkuTokens || hasBoqKeywords) {
    return {
      intent: 'BOQ_EVALUATION',
      confidence: 0.90,
      skillTarget: 'boq-eval-skill',
      rationale: 'Query contains specific SKU strings or requests physical validation of a drafted configuration.'
    };
  }

  // 6. Default to Freeform Q&A
  return {
    intent: 'FREEFORM_QA',
    confidence: 0.88,
    skillTarget: 'presales-query-router',
    rationale: 'Freeform conversational inquiry regarding HPE server architecture, rules, or QuickSpecs.'
  };
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
    case 'FREEFORM_QA': {
      const chassisInfo = getChassisCatalog(queryText, context);
      const chassisName = context.chassisName || context.model || chassisInfo.chassisKey;
      const ragResult = queryLocalKnowledgeBase(queryText, chassisName);
      responseData = {
        chassis: chassisName,
        catalogDir: chassisInfo.catalogDir,
        answer: ragResult.answer,
        citations: ragResult.citations,
        source: 'Local RAG Dual-Layer Search & Master Knowledge Registry'
      };
      break;
    }

    case 'BOQ_EVALUATION': {
      if (context.filePath && fs.existsSync(context.filePath)) {
        responseData = evaluateBOQMultiAspect(context.filePath);
      } else if (context.items && Array.isArray(context.items)) {
        responseData = evaluateBOQMultiAspect(context.items);
      } else {
        responseData = {
          message: 'BOQ evaluation requested. Please upload or specify a BOQ file path or item list.',
          suggestedAction: 'UPLOAD_BOQ_SPREADSHEET'
        };
      }
      break;
    }

    case 'CATALOG_INTELLIGENCE': {
      const skuMatch = queryText.match(/[A-Z0-9]{5,7}-[A-Z0-9]{3,4}/i);
      const targetSku = skuMatch ? cleanBaseSKU(skuMatch[0]) : null;
      const historyFile = path.join(PROJECT_ROOT, 'outputs', 'history', 'price_history.json');
      let skuHistory = null;
      if (fs.existsSync(historyFile)) {
        try {
          const hist = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
          skuHistory = targetSku ? (hist[targetSku] || null) : hist;
        } catch (e) {}
      }

      responseData = {
        targetSku,
        pricingTrail: skuHistory,
        message: targetSku
          ? `Catalog Intelligence retrieved for SKU ${targetSku}.`
          : 'Catalog Intelligence retrieved across tracked portfolio.'
      };
      break;
    }

    case 'RFP_SIZING_TO_BOM': {
      const chassisInfo = getChassisCatalog(queryText, context);
      let rawLines = queryText.split(/[\r\n;]+/).map(l => l.trim()).filter(Boolean);
      if (rawLines.length === 1) {
        const clauses = queryText.split(/\s+(?:with|and|plus|,)\s+/i).map(c => c.trim()).filter(Boolean);
        if (clauses.length > 1) rawLines = clauses;
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

        // Inject base chassis SKU if available
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

        // Run multi-aspect evaluation across all 7 physical aspects to synthesize Rank 1 - 5 matrix
        if (candidateItems.length > 0) {
          try {
            evaluation = evaluateBOQMultiAspect(candidateItems, { chassis: chassisInfo.chassisKey });
          } catch (evalErr) {
            evaluation = { error: evalErr.message };
          }
        }
      }

      responseData = {
        intent: 'RFP_SIZING_TO_BOM',
        chassis: chassisInfo.chassisKey,
        sizingRequirements: sizingResult?.intent || null,
        categoryCoverage: sizingResult?.categoryCoverage || null,
        resolutions: sizingResult?.resolutions || [],
        constructionPlan: sizingResult?.constructionPlan || [],
        requiresHumanClarification: sizingResult?.requiresHumanClarification ?? true,
        candidateBOM: candidateItems,
        evaluation,
        status: sizingResult?.requiresHumanClarification ? 'REQUIRES_HUMAN_CLARIFICATION' : 'SIZING_SYNTHESIZED_AND_EVALUATED'
      };
      break;
    }

    case 'BOM_RECONCILIATION': {
      const chassisInfo = getChassisCatalog(queryText, context);
      const vendorFile = context.vendorFilePath || context.secondaryFilePath || (context.filePath?.toLowerCase().includes('vendor') ? context.filePath : null);
      const customerFile = context.customerFilePath || (context.secondaryFilePath ? context.filePath : null);

      if (vendorFile && fs.existsSync(vendorFile)) {
        let proposedSolution = null;
        if (customerFile && fs.existsSync(customerFile)) {
          const evalRes = evaluateBOQMultiAspect(customerFile);
          proposedSolution = evalRes.matrix?.rank1 || {
            rank: 1,
            name: 'Rank 1: Baseline Intent Preserved',
            skuList: evalRes.parsedItems || []
          };
        } else if (context.proposedSolution) {
          proposedSolution = context.proposedSolution;
        } else {
          proposedSolution = { rank: 1, name: 'Baseline Evaluation', skuList: [] };
        }

        const auditReport = verifyVendorBOM(path.resolve(vendorFile), proposedSolution, chassisInfo.catalogDir);
        responseData = {
          intent: 'BOM_RECONCILIATION',
          auditReport,
          message: auditReport.is100PercentMatch
            ? 'Vendor quote perfectly matches proposed configuration.'
            : `Reconciliation identified ${auditReport.discrepancies.addedByVendor.length} added, ${auditReport.discrepancies.removedByVendor.length} removed, and ${auditReport.discrepancies.uncatalogedSkus.length} uncataloged SKUs.`
        };
      } else if (context.filePath && fs.existsSync(context.filePath)) {
        const auditReport = verifyVendorBOM(path.resolve(context.filePath), { rank: 1, skuList: [] }, chassisInfo.catalogDir);
        responseData = {
          intent: 'BOM_RECONCILIATION',
          auditReport,
          message: `Single-file audit completed against catalog ${chassisInfo.chassisKey}.`
        };
      } else {
        responseData = {
          intent: 'BOM_RECONCILIATION',
          message: 'BOM Reconciliation requires a vendor quote file (--vendor) and optional customer tender file (--customer).',
          suggestedAction: 'UPLOAD_VENDOR_AND_CUSTOMER_SPREADSHEETS'
        };
      }
      break;
    }

    default: {
      responseData = {
        intent: classification.intent,
        skillTarget: classification.skillTarget,
        instructions: `Engage ${classification.skillTarget} to process: ${classification.rationale}`,
        promptContext: queryText
      };
      break;
    }
  }

  return {
    query: queryText,
    classification,
    result: responseData,
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
    } else if (args[i] === '--json') {
      jsonOutput = true;
    } else if (!args[i].startsWith('--')) {
      queryText = queryText ? `${queryText} ${args[i]}` : args[i];
    }
  }

  if (!queryText && !context.filePath && !context.vendorFilePath) {
    console.log('Usage: node scripts/evaluators/route_query.js "<query_text>" [--file <path>] [--secondary-file <path>] [--vendor <path>] [--customer <path>] [--chassis <name>] [--json]');
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
  executeRoutedQuery
};
