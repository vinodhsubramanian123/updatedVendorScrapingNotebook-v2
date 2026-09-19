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

  // 1. Explicit unsupported check
  if ((text.includes('dl360') || text.includes('dl 360')) && (text.includes('gen12') || text.includes('gen 12'))) {
    return {
      chassisKey: 'DL360_Gen12_UNSUPPORTED',
      catalogDir: null,
      catalogPath: null,
      catalogData: null,
      isAmbiguous: true,
      error: 'DL360 Gen12 is not currently available in portfolio (DL360 Gen11 is available)'
    };
  }

  // 2. Discover all available catalogs dynamically
  let catalogs = [];
  try {
    catalogs = listAllCatalogs();
  } catch (_) {}

  // 3. Match against dynamic catalogs
  let matchedCatalog = null;

  // Direct ID check if chassisName or model was passed
  if (context.chassisName || context.model) {
    const target = (context.chassisName || context.model).toLowerCase().trim();
    matchedCatalog = catalogs.find(c => c.id.toLowerCase() === target || c.chassis?.toLowerCase() === target);
  }

  // Model/Platform definition table with explicit tokens and boundary patterns
  const PLATFORM_SIGNATURES = [
    { key: 'dl380a', pattern: /\b(?:dl\s*380a|dl380a)\b/i },
    { key: 'dl380', pattern: /\b(?:dl\s*380|dl380)\b(?!a\b)/i },
    { key: 'dl360', pattern: /\b(?:dl\s*360|dl360)\b/i },
    { key: 'dl145', pattern: /\b(?:dl\s*145|dl145)\b/i },
    { key: 'dl580', pattern: /\b(?:dl\s*580|dl580)\b/i },
    { key: 'sy480', pattern: /\b(?:sy\s*480|sy480|synergy\s*480|synergy\s*compute)\b/i },
    { key: 'sy100gb', pattern: /\b(?:sy\s*100gb|sy100gb|f32\s*module|f32|synergy\s*100gb|synergy\s*fabric|synergy\s*switch)\b/i },
    { key: 'alletra', pattern: /\b(?:alletra|alletra\s*9000|alletra\s*storage|alletra\s*mp)\b/i },
    { key: 'msl3040', pattern: /\b(?:msl\s*3040|msl3040|storeever|tape\s*library|tape\s*automation)\b/i },
    { key: 'gx5000', pattern: /\b(?:gx\s*5000|gx5000|cray\s*rack|gx\s*general)\b/i }
  ];

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
      const candidates = catalogs.filter(c => {
        const idLower = c.id.toLowerCase();
        if (platform.key === 'dl380') return idLower.startsWith('dl380_');
        if (platform.key === 'dl380a') return idLower.startsWith('dl380a_');
        if (platform.key === 'dl360') return idLower.startsWith('dl360_');
        if (platform.key === 'dl145') return idLower.startsWith('dl145_');
        if (platform.key === 'dl580') return idLower.startsWith('dl580_');
        if (platform.key === 'sy480') return idLower.startsWith('sy480_');
        if (platform.key === 'sy100gb') return idLower.startsWith('sy100gb');
        if (platform.key === 'alletra') return idLower.startsWith('alletra');
        if (platform.key === 'msl3040') return idLower.startsWith('msl3040');
        if (platform.key === 'gx5000') return idLower.startsWith('gx5000');
        return false;
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
          // Documented default policy: when generation is absent after model identification, prefer Gen12
          const preferred = candidates.filter(c => c.id.includes('Gen12'));
          matchedCatalog = preferred.length === 1 ? preferred[0] : null;
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

  // 1. File-based detection
  const detectedPath = filePath || (text.match(/[\w\-./\\]+\.(?:png|jpg|jpeg|webp|tiff|bmp|pdf|xlsx|xls|csv|tsv)/i)?.[0] || '');
  if (detectedPath) {
    const ext = path.extname(detectedPath).toLowerCase();
    if (['.png', '.jpg', '.jpeg', '.webp', '.tiff', '.bmp'].includes(ext)) {
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
  const imgPath = context.filePath || (queryText.match(/[\w\-./\\]+\.(?:png|jpg|jpeg|webp|tiff|bmp)/i)?.[0] || '');
  return {
    intent: 'OCR_QUOTE_INGESTION',
    filePath: imgPath,
    skillTarget: 'ocr-quote-ingestion-skill',
    status: 'READY_FOR_OCR',
    message: `Image input identified (${path.basename(imgPath || 'quote')}). Routed to multimodal Gemini Vision OCR pipeline.`
  };
}

function _handleCatalogIntelligence(queryText, context) {
  const skuMatch = queryText.match(/[A-Z0-9]{5,7}-[A-Z0-9]{3,4}/i);
  const targetSku = skuMatch ? cleanBaseSKU(skuMatch[0]) : null;
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

    default:
      responseData = {
        intent: classification.intent,
        skillTarget: classification.skillTarget,
        instructions: `Engage ${classification.skillTarget} to process: ${classification.rationale}`,
        promptContext: queryText
      };
      break;
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
  executeRoutedQuery,
  getChassisCatalog
};
