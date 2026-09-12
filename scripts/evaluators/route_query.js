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

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

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

  // 3. RFP Sizing keywords
  const hasSizingKeywords =
    text.includes('size a server') ||
    text.includes('sizing') ||
    text.includes('build a bom') ||
    text.includes('generate a bom') ||
    text.includes('create a configuration') ||
    (text.includes('need') && (text.includes('cores') || text.includes('ram') || text.includes('tb storage')));

  if (hasSizingKeywords) {
    return {
      intent: 'RFP_SIZING_TO_BOM',
      confidence: 0.92,
      skillTarget: 'rfp-sizing-synthesizer',
      rationale: 'Query specifies workload sizing capacity parameters (cores, memory, storage) requiring BOM synthesis.'
    };
  }

  // 4. Catalog Intelligence keywords
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
      const chassisName = context.chassisName || context.model || 'DL380 Gen12';
      const ragResult = queryLocalKnowledgeBase(queryText, chassisName);
      responseData = {
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

    case 'RFP_SIZING_TO_BOM':
    case 'BOM_RECONCILIATION':
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

module.exports = {
  classifyQueryIntent,
  executeRoutedQuery
};
