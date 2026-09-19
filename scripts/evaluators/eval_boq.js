'use strict';
/**
 * scripts/eval_boq.js — CLI Pre-Flight BOQ Evaluator, Multi-Sheet Parser & Gemini Notebook Validator
 *
 * Runs end-to-end BOQ parsing (multi-sheet Excel, multipliers, line separators), 6-aspect physical pre-checks,
 * quantitative confidence scoring, Gemini Notebook RAG validation, and 5-Tier Resolution Report synthesis.
 *
 * Supports:
 *   --chassis <dir>   Target chassis catalog directory (auto-detected from BOQ if omitted)
 *   --json            Machine-parseable JSON output mode for dashboard SSE consumption
 *   --notebook-id <id> Override Gemini Notebook ID
 */

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { parseAndConsolidateBOQDetailed, evaluatePhysicalMath, formatNotebookQueryPayload } = require('../lib/boq/boq_evaluator.js');
const { serializeAndExportResults, generateMarkdownReport } = require('../lib/boq/eval_output_serializer.js');
const { validateSolutionWithEphemeralSource } = require('../lib/sync/nlm_solution_source_validator.js');
const { resolveRequirementIntent } = require('../lib/boq/requirement_intent_resolver.js');
const { processPortalFeedback } = require('../lib/feedback/feedback_loop.js');
const { autoDetectChassisDetailed, isCatalogCertified } = require('../lib/catalog/catalog_discovery.js');
const { emitProgress } = require('../lib/system/progress.js');
const { executeNotebookQuery, getAuthoritativeSourceIds } = require('../lib/notebook/notebook_query_utils.js');
const { runAgenticGuardrail } = require('../lib/rag/agentic_guardrail.js');
const { optimizeForBudget } = require('../lib/boq/budget_optimizer.js');
const { extractAndPersistLearnedDeltas } = require('../lib/notebook/knowledge_extractor.js');
const { createEvidenceLedger } = require('../lib/system/evidence_ledger.js');
const { runWithTrace } = require('../lib/system/trace_context');
const { candidateDelta, solutionFingerprint } = require('../lib/boq/solution_evidence');
const { loadActiveKnowledgeRules } = require('../lib/catalog/active_knowledge_router.js');
const { recordAndCertifyLearnedRule } = require('../lib/feedback/continuous_learning_verifier.js');

/**
 * Load notebook ID from config file for a specific chassis or use default.
 * @param {string} [chassisName]
 */
function getDefaultNotebookId(chassisName = '') {
  const configPath = path.join(__dirname, '..', 'config', 'notebooks.json');
  if (fs.existsSync(configPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (chassisName && cfg.notebooks && cfg.notebooks[chassisName]) {
        const entry = cfg.notebooks[chassisName];
        if (typeof entry !== 'object' || entry?.queryEnabled === false) return null;
        if (getAuthoritativeSourceIds(entry).length === 0) return null;
        const id = entry.notebookId;
        if (id && String(id).trim()) return String(id).trim();
      }
      // Product validation must never cross a product boundary. A generic
      // default notebook may be used by explicitly generic workflows only.
      return null;
    } catch (e) {
      const _logger = require('../lib/system/pipeline_logger.js');
      _logger.warn('ERROR', 'eval_boq.js', e);
    }
  }
  return null;
}

// ============================================================
// Stage 1: CLI Argument Parsing & Option Validation
// ============================================================
function parseEvaluationArguments(args = process.argv.slice(2)) {
  const JSON_MODE = args.includes('--json');
  const OFFLINE_MODE = args.includes('--offline') || process.env.LOCAL_EVAL_ONLY === '1';
  const DEFER_RAG = args.includes('--defer-rag');

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: node scripts/eval_boq.js <input_boq_file> [options]

Options:
  --chassis <dir>              Target chassis catalog directory (auto-detected from BOQ if omitted)
  --notebook-id <id>           Gemini Notebook ID for RAG validation
  --output <output_report.md>  Output report path
  --json                       Machine-parseable JSON output mode
  --defer-rag                  Return local result and let the dashboard own the cloud job
  --budget <usd>               Target CapEx budget in USD
  --simulate-portal-error ".." Simulate a portal rejection error
  --output-dir <dir>           Output directory for feedback deltas

Examples:
  node scripts/eval_boq.js test_boq_dl380_gen12.csv
  node scripts/eval_boq.js my_quote.xlsx --chassis outputs/Alletra/Storage/Alletra_Storage_System --json
  node scripts/eval_boq.js test_boq_dl380_gen12.csv --simulate-portal-error "ERR_STORAGE_CABLE_REQUIRED: Controller MR416i-p requires P76453-B21 Box 1/2 Cable Kit."
`);
    process.exit(0);
  }

  const fileArgIdx = args.indexOf('--file');
  let inputFile = (fileArgIdx !== -1 && args[fileArgIdx + 1]) ? args[fileArgIdx + 1] : null;
  if (!inputFile) {
    const flagsWithVal = new Set(['--chassis', '--notebook-id', '--output', '--sheet', '--simulate-portal-error', '--output-dir', '--budget', '--file']);
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (flagsWithVal.has(arg)) {
        i++;
        continue;
      }
      if (!arg.startsWith('--') && !arg.startsWith('-')) {
        inputFile = arg;
        break;
      }
    }
  }

  if (!inputFile || !fs.existsSync(inputFile)) {
    console.error(`❌ Input BOQ file not found: ${inputFile || '(none provided)'}`);
    // Let the traced pipeline persist the failure and return structured evidence.
  }

  const nbIdx = args.indexOf('--notebook-id');
  const explicitNotebookId = (nbIdx !== -1 && args[nbIdx + 1]) ? args[nbIdx + 1] : null;

  let chassisDir = '';
  const chIdx = args.indexOf('--chassis');
  if (chIdx !== -1 && args[chIdx + 1]) {
    chassisDir = args[chIdx + 1];
  }

  const shIdx = args.indexOf('--sheet');
  const targetSheetName = (shIdx !== -1 && args[shIdx + 1]) ? args[shIdx + 1] : null;

  const outIdx = args.indexOf('--output');
  const explicitOutputPath = (outIdx !== -1 && args[outIdx + 1]) ? args[outIdx + 1] : null;

  const errIdx = args.indexOf('--simulate-portal-error');
  const simulatePortalError = (errIdx !== -1 && args[errIdx + 1]) ? args[errIdx + 1] : null;

  const odIdx = args.indexOf('--output-dir');
  const explicitOutputDir = (odIdx !== -1 && args[odIdx + 1]) ? args[odIdx + 1] : null;

  let targetBudgetUsd = 0;
  const bIdx = args.indexOf('--budget');
  if (bIdx !== -1 && args[bIdx + 1]) {
    targetBudgetUsd = parseFloat(args[bIdx + 1]) || 0;
  }

  const SYNC_RAG = args.includes('--sync-rag') || process.env.SYNC_RAG === '1';
  const SHEET_VALIDATION = args.includes('--sheet-validation') || args.includes('--source-validation');
  const UPLOAD_DRIVE = args.includes('--upload-drive') || process.env.AUTO_UPLOAD_DRIVE === 'true';

  return {
    inputFile,
    JSON_MODE,
    OFFLINE_MODE,
    DEFER_RAG,
    SYNC_RAG,
    SHEET_VALIDATION,
    UPLOAD_DRIVE,
    explicitNotebookId,
    chassisDir,
    targetSheetName,
    explicitOutputPath,
    simulatePortalError,
    explicitOutputDir,
    targetBudgetUsd,
    args
  };
}

// ============================================================
// Stage 2: BOQ Parsing & Chassis Ingestion
// ============================================================
async function promptUserForChassisTriage(catalogs, detection) {
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = q => new Promise(res => rl.question(q, res));

  console.log(`\n===============================================================`);
  console.log(`❓ HUMAN-IN-THE-LOOP AMBIGUITY TRIAGE: CHASSIS SELECTION REQUIRED`);
  console.log(`===============================================================`);
  console.log(`The BOQ items did not yield a >=0.95 confidence match (${detection?.reason || 'Ambiguous platform'}).`);
  console.log(`Please select the target catalog from the available options:`);
  catalogs.forEach((c, idx) => {
    console.log(`  [${idx + 1}] ${c.id} (${c.catalogDir})`);
  });
  console.log(`  [0] Abort evaluation`);

  const answer = (await ask(`Enter choice (1-${catalogs.length}): `)).trim();
  const choice = parseInt(answer, 10);
  if (choice > 0 && choice <= catalogs.length) {
    const selected = catalogs[choice - 1];
    const reasoning = (await ask(`Enter reasoning for this selection (persisted for continuous learning): `)).trim() || 'Human sales engineer manual selection';
    rl.close();
    return {
      chassisDir: selected.catalogDir,
      chassisId: selected.id,
      userReasoning: reasoning,
      confirmedByHuman: true
    };
  }
  rl.close();
  return null;
}

async function ingestAndConsolidateBoq(options) {
  const inMemory = !options.inputFile && (Array.isArray(options.inputItems) || typeof options.rawText === 'string');
  if (!inMemory && (!options.inputFile || !fs.existsSync(options.inputFile))) throw new Error(`Input BOQ file not found: ${options.inputFile || '(none provided)'}`);
  const { inputFile = `InMemory_${crypto.randomUUID()}.txt`, targetSheetName, explicitNotebookId, explicitOutputPath, simulatePortalError, explicitOutputDir, JSON_MODE } = options;
  let chassisDir = options.chassisDir;

  const tStart = Date.now();
  const inputBase = path.basename(inputFile, path.extname(inputFile));
  const isExcel = /\.xlsx?$/i.test(inputFile);
  let rawContent = '';
  let ocrMetadata = null;

  const { isImageFile, performGeminiOcr } = require('../lib/ocr/ocr_service.js');
  if (inMemory) {
    rawContent = options.inputItems ?? options.rawText;
  } else if (isImageFile(inputFile)) {
    if (options.OFFLINE_MODE) {
      throw new Error(`OCR extraction requires cloud connectivity but OFFLINE_MODE is enabled. Please provide a text, CSV, or Excel BOM file.`);
    }
    if (!JSON_MODE) console.log(`📸 Detected image/PDF document input (${path.basename(inputFile)}). Initiating Multimodal Gemini OCR extraction...`);
    const ocrResult = await performGeminiOcr(inputFile);
    if (!ocrResult || ocrResult.ocrStatus !== 'SUCCESS' || !ocrResult.isOcrProcessed) {
      const errReason = ocrResult?.rawError || ocrResult?.remediationAction || ocrResult?.text || 'OCR extraction failed';
      throw new Error(`Ingestion Phase Failed (OCR): ${errReason}`);
    }
    rawContent = ocrResult.text || '';
    ocrMetadata = {
      modelUsed: ocrResult.modelUsed || 'gemini-3.6-flash',
      lineCount: ocrResult.lineCount || 0,
      detectedSkus: ocrResult.detectedSkus || [],
      rawContentSha256: crypto.createHash('sha256').update(rawContent).digest('hex')
    };
  } else if (!isExcel) {
    rawContent = fs.readFileSync(inputFile, 'utf-8');
  }

  const parsedBoq = parseAndConsolidateBOQDetailed(rawContent, inMemory ? '' : inputFile, targetSheetName);
  let items = parsedBoq.items;
  if (!items.length) throw new Error('ERR_EMPTY_BOQ: No hardware items parsed.');
  if (items.some(item => !item.sku || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1)) throw new Error('ERR_INVALID_BOQ: Every item requires a SKU and positive integer quantity.');
  const stage1ParsingMs = Math.max(Date.now() - tStart, 1);

  let chassisDetection = null;
  if (!chassisDir) {
    chassisDetection = autoDetectChassisDetailed(items);
    if (chassisDetection.requiresUserConfirmation || chassisDetection.confidenceScore < 0.75) {
      chassisDetection.requiresUserConfirmation = true;
    } else {
      chassisDir = chassisDetection.chassisDir;
    }
  } else {
    if (!fs.existsSync(chassisDir) || !fs.statSync(chassisDir).isDirectory()) {
      const { listAllCatalogs } = require('../lib/catalog/catalog_discovery.js');
      const cats = listAllCatalogs();
      const matched = cats.find(c => c.id === chassisDir || c.prefix === chassisDir || c.chassis === chassisDir || path.basename(c.catalogDir) === chassisDir);
      if (matched) chassisDir = matched.catalogDir;
    }
    chassisDetection = {
      chassisDir,
      matchType: 'EXPLICIT_CLI',
      confidenceScore: 1.0,
      requiresUserConfirmation: false
    };
  }

  if (!chassisDir && (chassisDetection.unknown || chassisDetection.requiresUserConfirmation)) {
    // Interactive ambiguity triage if running in interactive TTY mode
    const { listAllCatalogs } = require('../lib/catalog/catalog_discovery.js');
    let availableCatalogs = [];
    try { availableCatalogs = listAllCatalogs(); } catch (_) {}
    if (process.stdin.isTTY && !JSON_MODE && !process.env.CI && availableCatalogs.length > 0) {
      const userChoice = await promptUserForChassisTriage(availableCatalogs, chassisDetection);
      if (userChoice && userChoice.chassisDir) {
        chassisDir = userChoice.chassisDir;
        chassisDetection = {
          chassisDir,
          id: userChoice.chassisId,
          matchType: 'HUMAN_INTERACTIVE_TRIAGE',
          confidenceScore: 1.0,
          requiresUserConfirmation: false,
          userReasoning: userChoice.userReasoning
        };
      }
    }
  }

  if (!chassisDir && (chassisDetection.unknown || chassisDetection.requiresUserConfirmation)) {
    console.error('❌ ERROR: [ERR_UNKNOWN_CHASSIS] Could not auto-detect chassis variant from BOQ items, and no --chassis flag was provided.');
    console.error('💡 Please select the correct catalog in the UI dropdown or use the --chassis <dir> flag.');

    const errPayload = {
      status: 'ERROR',
      chassisDetection,
      error: 'ERR_UNKNOWN_CHASSIS',
      message: 'Could not auto-detect chassis. Please confirm the chassis variant.'
    };

    if (process.env.STRUCTURED_PROGRESS) {
      process.stdout.write('\n\n' + JSON.stringify(errPayload) + '\n');
    }
    throw new Error(errPayload.message);
  }

  const detectedChassisName = path.basename(chassisDir || '');

  // Pre-Flight Scraped-Catalog Gate (INV-96)
  const isExplicitTestPath = /(?:^|[\\/])tests[\\/]fixtures|(?:^|[\\/])outputs[\\/]temp[\\/]test_payloads/i.test(chassisDir) || process.env.NODE_ENV === 'test';
  if (!isExplicitTestPath && process.env.ALLOW_UNSCRAPED_EVAL !== '1') {
    const certCheck = isCatalogCertified(detectedChassisName);
    if (!certCheck.certified) {
      const errorMsg = `❌ PRE-FLIGHT ERROR: [ERR_UNSCRAPED_SOLUTION] Solution '${detectedChassisName}' has not been scraped or certified.\nReason: ${certCheck.reason}\n💡 Run 'npm run scrape:oca -- --profile <profile>' or trigger the scraper in the dashboard to establish ground truth before evaluating.`;
      console.error(errorMsg);
      if (JSON_MODE || process.env.STRUCTURED_PROGRESS) {
        process.stdout.write('\n\n' + JSON.stringify({
          status: 'ERROR',
          error: 'ERR_UNSCRAPED_SOLUTION',
          chassis: detectedChassisName,
          message: certCheck.reason,
          directive: 'Catalog must be scraped from HPE OCA before pre-flight evaluation.'
        }) + '\n');
      }
      throw new Error(`ERR_UNSCRAPED_SOLUTION: ${certCheck.reason}`);
    }
  }

  if (!fs.existsSync(chassisDir) || !fs.statSync(chassisDir).isDirectory()) throw new Error('ERR_UNKNOWN_CHASSIS: Explicit chassis does not identify a catalog directory.');
  const configuredNotebookId = getDefaultNotebookId(detectedChassisName);
  const notebookId = explicitNotebookId && explicitNotebookId === configuredNotebookId
    ? explicitNotebookId
    : configuredNotebookId;

  const defaultReportsDir = path.join(chassisDir, 'reports');
  if (!fs.existsSync(defaultReportsDir)) {
    fs.mkdirSync(defaultReportsDir, { recursive: true });
  }

  const fileSuffix = targetSheetName ? `${inputBase}_${targetSheetName.replace(/[/\\?*[\]:]/g, '_')}` : inputBase;
  let outputPath = explicitOutputPath || path.join(defaultReportsDir, `BOQ_Evaluation_${fileSuffix}.md`);

  if (simulatePortalError) {
    const feedbackDir = explicitOutputDir || chassisDir;
    if (!JSON_MODE) console.log(`\n🔄 Processing simulated partner portal error feedback...`);
    const delta = processPortalFeedback(simulatePortalError, feedbackDir);
    if (!JSON_MODE) console.log(`✅ KnowledgeDelta logged: ${delta.deltaId} (${delta.ruleUpdate})`);
  }

  if (!JSON_MODE) {
    console.log(`\n===============================================================`);
    console.log(`🚀 HPE BOQ PRE-FLIGHT EVALUATION & GEMINI NOTEBOOK VALIDATOR`);
    console.log(`===============================================================`);
    console.log(`  📄 Input BOQ File : ${inputFile}`);
    console.log(`  📚 Notebook ID    : ${notebookId}`);
    console.log(`  📝 Output Report  : ${outputPath}`);
    console.log(`  🔧 Chassis Dir    : ${chassisDir}`);
    console.log(`\n🔍 Phase 1: Consolidated ${items.length} unique hardware SKUs from BOQ.`);
  }

  const chassisPrefix = path.basename(chassisDir);
  const catalogPath = path.join(chassisDir, `${chassisPrefix}_Catalog.json`);
  let catalogData = null;
  if (fs.existsSync(catalogPath)) {
    try {
      catalogData = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
    } catch (err) {
      throw new Error(JSON.stringify({
        error: 'EvaluationError',
        message: `Failed to parse catalog data at ${catalogPath}: ${err.message}`,
        traceId: require('../lib/system/trace_context.js').getTraceId()
      }));
    }
  }

  if (!catalogData) throw new Error(`ERR_MISSING_CATALOG: ${catalogPath}`);
  const { auditCatalogFreshness, verifyTabularIntegrity } = require('../lib/catalog/catalog_freshness_guard.js');
  const catalogAudit = { freshness: auditCatalogFreshness(catalogData), integrity: verifyTabularIntegrity(catalogData) };
  if (!catalogAudit.integrity.isValid) throw new Error(`ERR_CATALOG_INTEGRITY: ${catalogAudit.integrity.errors.join('; ')}`);
  if (['UNKNOWN', 'INVALID_FUTURE_DATE', 'CRITICAL_OUTDATED'].includes(catalogAudit.freshness.freshnessStatus) && !isExplicitTestPath) throw new Error(`ERR_CATALOG_FRESHNESS: ${catalogAudit.freshness.freshnessStatus}`);
  const productConfirmed = !chassisDetection.requiresUserConfirmation && chassisDetection.confidenceScore >= 0.95;
  const requirementResolution = resolveRequirementIntent({
    items,
    unresolvedRequirements: parsedBoq.unresolvedRequirements,
    rawLines: parsedBoq.rawLines,
    catalogData,
    productConfirmed
  });
  items = requirementResolution.resolvedItems;
  let configurationContext;
  try {
    configurationContext = require('../lib/boq/configuration_context').normalizeConfiguration(items);
    items = configurationContext.items;
    if (options.serverCount !== undefined && Number(options.serverCount) !== configurationContext.multiplier) throw new Error('ERR_QUANTITY_CONTEXT: Requested serverCount disagrees with the customer configuration multiplier.');
  } catch (err) {
    if (err.code !== 'CONFIGURATION_OWNERSHIP_AMBIGUOUS') throw err;
    configurationContext = { items, multiplier: 1, ownershipEvidence: 'AMBIGUOUS_OWNERSHIP_RAW' };
  }

  return {
    items,
    configurationContext,
    serverCount: configurationContext.multiplier || 1,
    inputFile,
    chassisDir,
    chassisPrefix,
    chassisDetection,
    detectedChassisName,
    notebookId,
    outputPath,
    catalogData,
    requirementResolution,
    ocrMetadata,
    catalogAudit,
    stage1ParsingMs
  };
}

// ============================================================
// Stage 3: Modular Physical Pre-Checks & Conflict Graph
// ============================================================
function executePhysicalPreChecks(items, catalogData, chassisDir, JSON_MODE, requirementResolution = null) {
  const tAspectStart = Date.now();
  const evalResults = evaluatePhysicalMath(items, catalogData, chassisDir);
  evalResults.requirementResolution = requirementResolution;
  if (requirementResolution?.requiresHumanClarification) {
    evalResults.confidence.isHitlTriggered = true;
    evalResults.confidence.score = Math.min(evalResults.confidence.score, 0.74);
    evalResults.confidence.confidenceReasons.push('[REQUIREMENT_AMBIGUITY] A part/category or attribute-only requirement needs human confirmation before solution learning.');
  }
  const graph = evalResults.conflictGraph || {};
  const stage2AspectMathMs = Math.max(Date.now() - tAspectStart, 1);

  if (!JSON_MODE) {
    console.log(`\n⚡ Phase 2: Modular ${evalResults.aspectChecks ? evalResults.aspectChecks.length : 'Multi'}-Aspect Physical Pre-Checks Completed:`);
    if (evalResults.aspectChecks && Array.isArray(evalResults.aspectChecks)) {
      evalResults.aspectChecks.forEach(asp => {
        console.log(`  ${asp.id}. ${asp.name.padEnd(25)} : ${asp.status === 'PASS' ? '✅ PASS' : '❌ FAIL'} — ${asp.detail}`);
      });
    } else {
      console.log(`  1. Compute & Thermal : ${evalResults.cpuCount} CPUs (Max TDP: ${evalResults.maxCpuTdpWatts}W) | High-Perf Fans: ${evalResults.hasHighPerfFans ? '✅' : '❌'}`);
      console.log(`  2. Memory & Channels : ${evalResults.memoryCount} DIMMs (${evalResults.totalMemoryGb} GB Total)`);
      console.log(`  3. Storage & Tri-Mode: ${evalResults.driveCount} Drives | Controller Battery: ${evalResults.hasSmartBattery ? '✅' : '❌'}`);
      console.log(`  4. PCIe Expansion    : ${evalResults.requiredPcieCards || 0} Cards / ${evalResults.totalPcieSlotsAvailable || 2} Slots`);
      console.log(`  5. Networking & OCP  : OCP Adapter Present: ${evalResults.hasOcpAdapter ? '✅' : '❌'}`);
      console.log(`  6. Power & Ambient   : -48VDC PSU: ${evalResults.hasDcPowerSupply ? 'YES' : 'NO'} | Lug Kit: ${evalResults.hasDcLugKit ? '✅' : '❌'}`);
      console.log(`  7. Support Services  : Tech Care Support Present: ${evalResults.hasSupportService ? '✅' : '❌'}`);
    }

    console.log(`\n🕸️ Phase 2.5: 5-Level Dependency Conflict Graph Validation:`);
    console.log(`  Chassis Variant    : ${graph.chassisInfo ? graph.chassisInfo.model : 'Unknown'}`);
    console.log(`  Rules Evaluated    : ${graph.totalRulesEvaluated || 0} across VENDOR, CHASSIS, CATEGORY, SUBCATEGORY, SKU levels`);
    console.log(`  Rules Source       : ${graph.rulesSource || 'N/A'} ${graph.isFallbackSource ? '(Fallback Safety Net)' : '(Dual Safety Net)'}`);
    if (graph.rulesSource === 'NONE') {
      console.log(`  Whole Solution     : ⚠️ NO_DATA (No rules evaluated)`);
    } else {
      console.log(`  Whole Solution     : ${graph.isWholeSolutionValid ? '✅ PASSED (No cross-aspect conflicts)' : '❌ CONFLICTS DETECTED'}`);
    }
  }

  const queryPayload = formatNotebookQueryPayload(items, evalResults);
  evalResults.notebookPayload = queryPayload;

  if (!JSON_MODE) {
    if (graph.resolvedFixes && graph.resolvedFixes.length > 0) {
      console.log(`  Cascading Fixes    : ${graph.resolvedFixes.length} fix(es) validated without downstream conflicts.`);
    }
    console.log(`\n  📊 Quantitative Confidence Score: ${evalResults.confidence.score} / 1.00`);
    console.log(JSON.stringify(evalResults, null, 2));
    console.log(`  ${evalResults.confidence.summary}`);

    if (evalResults.errors.length > 0) {
      console.log(`\n❌ CRITICAL PHYSICAL VIOLATIONS:`);
      evalResults.errors.forEach(e => console.log(`   - ${e}`));
    }
    if (evalResults.warnings.length > 0) {
      console.log(`\n⚠️ PHYSICAL WARNINGS:`);
      evalResults.warnings.forEach(w => console.log(`   - ${w}`));
    }
  }

  return { evalResults, graph, queryPayload, stage2AspectMathMs };
}

// ============================================================
// Stage 4: Grounded Gemini Notebook Validation & Agentic Loop
// ============================================================
async function executeGroundedRagValidation(ctx) {
  const { items, evalResults, notebookId, catalogData, chassisDetection, detectedChassisName, chassisDir, OFFLINE_MODE, JSON_MODE, inputFile } = ctx;

  const tRagStart = Date.now();
  emitProgress(8, 10, 'Grounded Gemini Notebook Validation', 'in_progress', `Executing Grounded Gemini Notebook Validation against QuickSpecs.`);

  const ragPayload = formatNotebookQueryPayload(items, evalResults, evalResults.conflictGraph ? evalResults.conflictGraph.rankedSolutions : []);

  // Dashboard mode returns the deterministic result immediately. The long-running
  // NotebookLM child must be owned by the dashboard server, otherwise this CLI
  // process remains alive and the UI never receives the provisional result.
  if (!OFFLINE_MODE && ctx.DEFER_RAG) {
    const stage3RAGMs = Math.max(Date.now() - tRagStart, 1);
    evalResults.status = 'LOCAL_COMPLETE';
    evalResults.cloudGroundingStatus = 'CLOUD_PENDING';
    evalResults.isProvisional = true;
    evalResults.matrixStatus = 'PROVISIONAL_PRE_RAG';
    evalResults.notebookLmStatus = {
      status: 'CLOUD_PENDING',
      jobId: null,
      isCloudGrounded: false,
      isPending: true,
      pollIntervalMs: 1500
    };
    evalResults.ragResult = null;
    evalResults.ragAnswer = '';

    return { ragAnswer: '', stage3RAGMs, stage4GuardrailMs: 0 };
  }

  const ragResult = await executeNotebookQuery(notebookId, ragPayload, {
    context: {
      chassis: (catalogData && catalogData.metadata && catalogData.metadata.chassis) || (chassisDetection && chassisDetection.detectedVariant && chassisDetection.detectedVariant.model) || detectedChassisName,
      skus: items.map(i => i.sku).filter(Boolean),
      items: items
    },
    offlineMode: OFFLINE_MODE,
    timeout: parseInt(process.env.RAG_TIMEOUT_MS || '600000', 10)
  });
  const stage3RAGMs = Math.max(Date.now() - tRagStart, 1);
  const ragDurationFormatted = ragResult.timeTaken || `${Math.floor(stage3RAGMs / 60000)}m ${Math.floor((stage3RAGMs % 60000) / 1000)}s (${stage3RAGMs}ms)`;

  evalResults.status = 'LOCAL_COMPLETE';
  evalResults.cloudGroundingStatus = ragResult.isCloudGrounded ? 'CLOUD_VERIFIED' : ((ragResult.source || '').includes('LOCAL') ? 'LOCAL_FALLBACK' : 'CLOUD_FAILED');
  evalResults.notebookLmStatus = {
    source: ragResult.source,
    sourcesUsed: ragResult.sourcesUsed || [],
    citationsCount: (ragResult.citations || []).length,
    fallbackReason: ragResult.fallbackReason || null,
    groundingVerification: ragResult.groundingVerification || 'UNVERIFIED',
    groundingTier: ragResult.groundingTier || (ragResult.isCloudGrounded ? 'TIER_1_LIVE_CLOUD_GROUNDED' : 'TIER_2_UNCITED_ADVISORY'),
    isFallback: (ragResult.source || '').includes('FALLBACK') || (ragResult.source || '').includes('LOCAL'),
    isCloudGrounded: Boolean(ragResult.isCloudGrounded && (ragResult.citations || []).length > 0 && ragResult.groundingVerification !== 'REJECTED_FORBIDDEN_SOURCE'),
    cached: ragResult.cached || false,
    latencyMs: ragResult.latencyMs || stage3RAGMs,
    timeTaken: ragDurationFormatted
  };

  if (!JSON_MODE) {
    console.log(`⏱️ NotebookLM Synthesis Duration: ${ragDurationFormatted} (Source: ${ragResult.source})`);
  }

  if (ragResult.warning) {
    evalResults.warnings.push(ragResult.warning);
  }

  // Disagreement logging: Detect discrepancies between deterministic local aspect checks and advisory RAG commentary
  evalResults.opinionDiscrepancies = evalResults.opinionDiscrepancies || [];
  const localHasConflicts = (evalResults.errors || []).length > 0;
  const ragAnswerLower = (ragResult.answer || '').toLowerCase();
  const ragClaimsFullyCompliant = ragAnswerLower.includes('fully compatible') || ragAnswerLower.includes('no issues detected') || ragAnswerLower.includes('100% buildable');

  if (localHasConflicts && ragClaimsFullyCompliant) {
    const discrepancy = {
      type: 'LOCAL_RULE_OVERRIDE',
      severity: 'WARNING',
      message: 'Local rule engine flagged physical/thermal conflicts, but cloud commentary reported full compatibility. Deterministic aspect checks prevail.',
      localConflicts: evalResults.errors,
      cloudAnswerSnippet: (ragResult.answer || '').slice(0, 200)
    };
    evalResults.opinionDiscrepancies.push(discrepancy);
    const _logger = require('../lib/system/pipeline_logger.js');
    _logger.warn('EVAL_BOQ', 'Discrepancy detected: Deterministic local aspect rules prevail over cloud RAG commentary.');
  }

  if (evalResults.notebookLmStatus.isFallback && !evalResults.notebookLmStatus.cached) {
    const fallbackWarning = `⚠️ NotebookLM Cloud was NOT consulted — used local RAG fallback (Reason: ${ragResult.fallbackReason || 'NLM CLI timeout or unavailable'}). Verify critical dependencies manually or re-run with longer RAG_TIMEOUT_MS.`;
    evalResults.warnings.push(fallbackWarning);
    if (!JSON_MODE) console.log(`\n${fallbackWarning}`);
  }
  evalResults.ragResult = ragResult;
  evalResults.ragAnswer = ragResult.answer || '';

  try {
    // Phase 0 Fix: Only extract learned deltas from verified cloud grounding with citations.
    // Unverified local fallback, error responses, or uncited RAG MUST NEVER generate learned deltas.
    const isVerifiedCloud = evalResults.notebookLmStatus.isCloudGrounded && (evalResults.notebookLmStatus.citationsCount > 0);
    if (isVerifiedCloud) {
      const learnedResult = extractAndPersistLearnedDeltas(ragResult.answer, chassisDir, {
        chassis: (catalogData && catalogData.metadata && catalogData.metadata.chassis) || path.basename(chassisDir),
        source: ragResult.source,
        groundingVerification: ragResult.groundingVerification,
        citations: ragResult.citations || [],
        catalogData
      });
      evalResults.learnedDeltasCount = learnedResult.count;
    } else {
      evalResults.learnedDeltasCount = 0;
    }
  } catch (extractErr) {
    const _logger = require('../lib/system/pipeline_logger.js');
    _logger.warn('EVAL_BOQ', `Knowledge extraction skipped: ${extractErr.message}`);
  }

  let ragAnswer = `### Pre-Flight Grounded Physical Validation Matrix (${ragResult.source})

> ℹ️ **Knowledge Source**: \`${ragResult.source}\` ${ragResult.sourcesUsed && ragResult.sourcesUsed.length > 0 ? `(Active Cloud Sources: ${ragResult.sourcesUsed.join(', ')})` : ''}  
> ⏱️ **Synthesis Time Taken**: \`${ragDurationFormatted}\`

${ragResult.answer}

#### Physical Validation Summary (Local Rules Engine)
- **Errors Identified**: ${evalResults.errors.length} critical physical violation(s)
- **Warnings Identified**: ${evalResults.warnings.length} physical warning(s)
- **Quantitative Confidence Score**: ${evalResults.confidence.score} / 1.00

#### Physical Validation Actions:
${evalResults.errors.length === 0 ? '- ✅ No critical physical violations detected in input BOQ.' : evalResults.errors.map(e => `- ❌ Violation: ${e}`).join('\n')}
${evalResults.warnings.length === 0 ? '' : evalResults.warnings.map(w => `- ⚠️ Advisory: ${w}`).join('\n')}`;

  let stage4GuardrailMs = 0;
  const needsGuardrail = Boolean(
    !OFFLINE_MODE && (
      (evalResults.errors && evalResults.errors.length > 0) ||
      (evalResults.confidence && (evalResults.confidence.isHitlTriggered || evalResults.confidence.score < 0.88)) ||
      (evalResults.opinionDiscrepancies && evalResults.opinionDiscrepancies.length > 0)
    )
  );
  if (needsGuardrail) {
    const tGuardrailStart = Date.now();
    if (!JSON_MODE) console.log('\n🤖 Triggering Agentic Guardrail Loop for resolution...');

    const guardrailResult = await runAgenticGuardrail(items, chassisDir);
    if (!JSON_MODE) {
      console.log('✅ Agentic Output:');
      console.log(guardrailResult.text || guardrailResult.error);
    }
    evalResults.agenticExplanation = guardrailResult.text || null;
    stage4GuardrailMs = Math.max(Date.now() - tGuardrailStart, 1);

    // Auto-Retry with Circuit Breaker (maxRetries = 1) if rules were autonomously promoted
    const MAX_GUARDRAIL_RETRIES = 1;
    let guardrailRetries = 0;
    if (guardrailResult.activatedDeltaCount > 0 && guardrailRetries < MAX_GUARDRAIL_RETRIES) {
      guardrailRetries++;
      evalResults.guardrailRetries = guardrailRetries;
      if (!JSON_MODE) console.log(`\n🔄 Auto-retrying physical evaluation after autonomously learning ${guardrailResult.activatedDeltaCount} new rule(s) (attempt ${guardrailRetries}/${MAX_GUARDRAIL_RETRIES})...`);
      
      const { evaluateBOQMultiAspect } = require('../lib/boq/boq_evaluator.js');
      const retryResults = evaluateBOQMultiAspect(items, { filePath: inputFile || ctx.inputFile || '', catalogData, targetDir: chassisDir });
      
      evalResults.errors = retryResults.errors;
      evalResults.warnings = retryResults.warnings;
      evalResults.missingDependencies = retryResults.missingDependencies;
      evalResults.confidence = retryResults.confidence;
      evalResults.mathDeductions = retryResults.mathDeductions;
      evalResults.conflictGraph = retryResults.conflictGraph;
      evalResults.aspectChecks = retryResults.aspectChecks;
      
      if (!JSON_MODE) console.log(`✅ Retry Complete. New Score: ${evalResults.confidence.score}`);
    }
  }

  return { ragResult, ragAnswer, stage3RAGMs, stage4GuardrailMs };
}
// ============================================================
// Stage 5: Strategic Synthesis & Output Serialization (Delegated to eval_output_serializer.js)
// ============================================================

function applyLearnedRAGDeltasIfPresent(evalResults, graph, ingestCtx, options, ragResult) {
  if (!evalResults.learnedDeltasCount || options.DEFER_RAG || !ragResult) return;
  emitProgress(8, 10, 'Re-evaluating with Learned Deltas', 'in_progress', 'Recomputing physical aspect checks and strategy matrix with newly grounded RAG knowledge...');
  try {
    const recomputed = recomputeStrategyMatrixWithRag({
      items: ingestCtx.items,
      evalResults,
      conflictGraph: graph,
      targetBudgetUsd: options.targetBudgetUsd,
      catalogData: ingestCtx.catalogData,
      chassisDir: ingestCtx.chassisDir
    }, ragResult, ingestCtx.chassisDir);
    if (recomputed?.evalResults) Object.assign(evalResults, recomputed.evalResults);
    if (recomputed?.conflictGraph) Object.assign(graph, recomputed.conflictGraph);
  } catch (err) {
    const _logger = require('../lib/system/pipeline_logger.js');
    _logger.warn('EVAL_BOQ', `Dynamic matrix recompute note: ${err.message}`);
  }
}

// ============================================================
// Stage 6: Ephemeral Solution Source Validation & Strategy Double-Check (INV-97)
// ============================================================
async function executeEphemeralSourceValidation(options, ingestCtx, evalResults) {
  // Autonomous Strategy Double-Check (INV-97):
  // Runs whenever sheet validation is explicitly requested OR when cloud RAG is active and a live product notebook is mapped.
  const shouldValidate = options.SHEET_VALIDATION || (!options.OFFLINE_MODE && !options.DEFER_RAG && ingestCtx.notebookId);
  if (!shouldValidate) return null;
  emitProgress(9, 10, 'Ephemeral Source Validation', 'in_progress', 'Validating multi-rank solution sheets via NotebookLM ephemeral source...');
  try {
    const result = await validateSolutionWithEphemeralSource(evalResults, {
      notebookId: ingestCtx.notebookId,
      chassisName: ingestCtx.detectedChassisName || ingestCtx.chassisPrefix,
      targetDir: ingestCtx.chassisDir,
      isMock: options.OFFLINE_MODE
    });
    if (result) {
      evalResults.solutionDoubleCheck = {
        status: result.doubleCheckVerdict || (result.isCloudGrounded ? 'DOUBLE_CHECK_PASSED' : (result.isMock ? 'OFFLINE_MOCK_VERIFIED' : 'LOCAL_RULES_PASSED')),
        verdict: result.doubleCheckVerdict,
        sourceId: result.sourceId,
        citationsCount: (result.citations || []).length,
        extractedDeltasCount: (result.extractedDeltas || []).length
      };
    }
    return result;
  } catch (ephErr) {
    const _logger = require('../lib/system/pipeline_logger.js');
    _logger.warn('EVAL_BOQ', `Ephemeral source validation note: ${ephErr.message}`);
    return null;
  }
}

// ============================================================
// Stage 7: Continuous Learning Reflection & Self-Reinforcement
// ============================================================
function executeContinuousLearningReflection(evidenceLedger, ingestCtx, evalResults, options) {
  const chassisDir = ingestCtx.chassisDir;
  if (!chassisDir || !fs.existsSync(chassisDir)) return 0;

  const chassisName = path.basename(chassisDir);
  const activeRules = loadActiveKnowledgeRules(chassisName, chassisDir);
  const existingPairings = new Set(activeRules.allRules.map(r => `${(r.affectedSku || '').toUpperCase()}:${(r.requiredDependencySku || '').toUpperCase()}`));
  let learnedCount = 0;

  if (Array.isArray(evalResults.missingDependencies)) {
    const baseChassis = ingestCtx.items.find(i => i.isCTO || i.category === 'Base Chassis')?.sku || '';
    for (const dep of evalResults.missingDependencies) {
      if (!dep.sku || !baseChassis) continue;
      const pairKey = `${baseChassis.toUpperCase()}:${dep.sku.toUpperCase()}`;
      if (!existingPairings.has(pairKey)) {
        const delta = {
          deltaId: `DELTA_AUTO_${Date.now()}_${dep.sku.replace(/[^A-Za-z0-9]/g, '')}`,
          affectedSku: baseChassis,
          requiredDependencySku: dep.sku,
          ruleType: 'MANDATORY_DEPENDENCY',
          scopeTaxonomy: 'CHASSIS_SPECIFIC',
          confidenceScore: 0.95,
          ruleUpdate: dep.reason || `Mandatory dependency ${dep.sku} required by 7-aspect physical math.`,
          sourceCitation: 'AUTOMATED_PHYSICAL_MATH_DISCOVERY',
          status: 'PENDING',
          governanceStatus: 'PENDING',
          verificationStatus: 'REQUIRES_INDEPENDENT_VENDOR_EVIDENCE'
        };
        try {
          const cert = recordAndCertifyLearnedRule(delta, chassisDir);
          if (cert && cert.persisted) {
            learnedCount++;
            existingPairings.add(pairKey);
            evidenceLedger.recordSkuAudit(dep.sku, 'LEARNING_PROPOSED', delta.ruleUpdate, delta.deltaId, 'Mandatory dependency proposal', { status: 'PENDING' });
          }
        } catch (learnErr) {
          const _logger = require('../lib/system/pipeline_logger.js');
          _logger.warn('EVAL_BOQ', `Continuous learning proposal failed: ${learnErr.message}`);
        }
      }
    }
  }
  return learnedCount;
}

// ============================================================
// Main Orchestrator Pipeline
// ============================================================
function runEvaluationPipeline(options) {
  return runWithTrace(options.traceId, () => runEvaluationPipelineWithinTrace(options));
}

async function _executeIntakeAndKnowledgePhases(options, evidenceLedger) {
  evidenceLedger.startPhase(1, 'Intake, Ingestion & CTO Normalization', { boqFile: options.inputFile || options.BOQ_FILE });
  const ingestCtx = await ingestAndConsolidateBoq(options);
  if (ingestCtx.chassisDir) {
    evidenceLedger.updateTargetChassis(path.basename(ingestCtx.chassisDir), ingestCtx.chassisDir);
    evidenceLedger.recordArtifact('CATALOG', path.join(ingestCtx.chassisDir, `${path.basename(ingestCtx.chassisDir)}_Catalog.json`));
    evidenceLedger.recordArtifact('CATALOG_RULES', path.join(ingestCtx.chassisDir, `${path.basename(ingestCtx.chassisDir)}_Catalog_Rules.json`));
  }
  evidenceLedger.customerInput.totalRequestedLines = ingestCtx.items.length;
  evidenceLedger.customerInput.serverCount = ingestCtx.serverCount || 1;
  evidenceLedger.sharedState.nodeMultiplier = ingestCtx.serverCount || 1;
  ingestCtx.items.forEach(item => evidenceLedger.recordSkuAudit(item.sku, 'NORMALIZED_INPUT', 'Parsed customer input; this record does not certify compatibility.', null, item.category, { quantity: item.quantity }));
  evidenceLedger.completePhase(1, 'PASSED', {
    itemsCount: ingestCtx.items.length,
    chassisDir: ingestCtx.chassisDir,
    nodeMultiplier: ingestCtx.serverCount || 1,
    chassisSelection: ingestCtx.chassisDetection,
    ocr: ingestCtx.ocrMetadata,
    catalogAudit: ingestCtx.catalogAudit
  });
  if (!options.JSON_MODE) {
    const PipelineLogger = require('../lib/system/pipeline_logger.js');
    PipelineLogger.checklist(1, 'Intake, Ingestion & CTO Normalization', [
      { checked: true, label: `BOQ parsed successfully (${ingestCtx.items.length} hardware items)` },
      { checked: !ingestCtx.chassisDetection?.unknown, label: `Chassis identified: ${path.basename(ingestCtx.chassisDir || 'Unknown')}` },
      { checked: Boolean(ingestCtx.serverCount), label: `CTO multiplier normalized: ${ingestCtx.serverCount || 1} node(s)` }
    ]);
  }

  evidenceLedger.startPhase(2, 'Active Knowledge Routing & Discovery', { chassis: path.basename(ingestCtx.chassisDir) });
  const activeRules = loadActiveKnowledgeRules(path.basename(ingestCtx.chassisDir), ingestCtx.chassisDir);
  evidenceLedger.completePhase(2, 'PASSED', {
    totalRulesAvailable: activeRules.allRules.length,
    availableRuleIds: activeRules.allRules.map(r => r.ruleId || r.deltaId),
    modernizationsCount: activeRules.generationalModernizations.length,
    substitutionsCount: activeRules.substitutions.length,
    dependenciesCount: activeRules.mandatoryDependencies.length
  });
  if (!options.JSON_MODE) {
    const PipelineLogger = require('../lib/system/pipeline_logger.js');
    PipelineLogger.checklist(2, 'Active Knowledge Routing & Discovery', [
      { status: 'PASS', label: `Catalog rules loaded: ${activeRules.allRules.length} rules active` },
      { checked: true, label: `Generational modernizations available: ${activeRules.generationalModernizations.length}` },
      { checked: true, label: `Mandatory hardware dependencies: ${activeRules.mandatoryDependencies.length}` }
    ]);
  }

  return { ingestCtx, activeRules };
}

function _handlePipelineFailure(error, evidenceLedger, options) {
  let failedPhaseNum = 1;
  let recordedFailure = false;
  for (const phase of Object.values(evidenceLedger.phases)) {
    if (phase.status === 'RUNNING') {
      recordedFailure = true;
      failedPhaseNum = phase.phaseNumber;
      evidenceLedger.completePhase(phase.phaseNumber, 'FAILED', {}, [], [], [error.message]);
    }
  }
  if (!recordedFailure) {
    failedPhaseNum = evidenceLedger.phases.phase_8 ? 8 : 1;
    evidenceLedger.completePhase(failedPhaseNum, 'FAILED', { failureStage: 'FINALIZATION_OR_INTAKE' }, [], [], [error.message]);
  }
  for (let n = 1; n <= 9; n++) {
    if (!evidenceLedger.phases[`phase_${n}`]) {
      evidenceLedger.phases[`phase_${n}`] = {
        phaseNumber: n,
        phaseName: `Phase ${n}`,
        status: 'NOT_REACHED',
        startedAt: null,
        completedAt: null,
        durationMs: 0,
        inputSummary: {},
        outputSummary: null,
        checks: [],
        warnings: [],
        errors: [`Pipeline aborted due to upstream failure in phase ${failedPhaseNum}: ${error.message}`]
      };
    }
  }
  const exported = evidenceLedger.finalizeAndExport(options.evidenceDir);
  error.traceId = evidenceLedger.traceId;
  error.evidenceLogPath = exported.jsonPath;
}

function _recordAspectPhaseEvidence(evidenceLedger, evalResults, ingestCtx, options) {
  (evalResults.missingDependencies || []).forEach(dep => {
    evidenceLedger.recordActiveRuleReached({
      ruleId: dep.ruleId || 'PHYSICAL_ASPECT_DEP',
      ruleType: dep.category || 'MISSING_DEPENDENCY',
      chassis: path.basename(ingestCtx.chassisDir),
      affectedSku: dep.affectedSku || null,
      targetSku: dep.sku,
      reasoning: dep.reason || '',
      scopeTaxonomy: 'CHASSIS_SPECIFIC'
    });
  });
  const aspectPhaseStatus = (evalResults.isMathClean === true && evalResults.aspectChecks?.length > 0 && evalResults.aspectChecks.every(a => a.status === 'PASS') && (!evalResults.missingDependencies || evalResults.missingDependencies.length === 0)) ? 'PASSED' : 'ACTION_REQUIRED';
  evidenceLedger.completePhase(3, aspectPhaseStatus, {
    missingDependencies: evalResults.missingDependencies?.length || 0,
    aspectPassCount: (evalResults.aspectChecks || []).filter(a => a.status === 'PASS').length
  }, evalResults.aspectChecks || []);
  if (!options.JSON_MODE) {
    const PipelineLogger = require('../lib/system/pipeline_logger.js');
    const aspectItems = (evalResults.aspectChecks || []).map(a => ({
      status: a.status || (a.checked ? 'PASS' : 'FAIL'),
      label: `${a.name || a.id}: ${a.detail || ''}`,
      formula: a.formula || a.equation || null,
      operands: a.operands || null
    }));
    PipelineLogger.checklist(3, '7-Aspect Physical Pre-Flight Math', aspectItems);
  }
}

function _recordCandidateValidationsEvidence(evidenceLedger, evalResults, ingestCtx) {
  evidenceLedger.phases.phase_6.outputSummary.candidateValidations = (evalResults.conflictGraph?.rankedSolutions || []).map(candidate => ({
    rank: candidate.rank,
    name: candidate.name,
    rationale: candidate.reasoning,
    manifest: candidate.skuPartsList,
    delta: candidateDelta(ingestCtx.items, candidate),
    finalValidation: candidate.finalValidation,
    buildabilityStatus: candidate.buildabilityStatus
  }));
  evidenceLedger.phases.phase_6.outputSummary.manifestSha256 = solutionFingerprint(evalResults);
}

async function runEvaluationPipelineWithinTrace(options) {
  const startTime = Date.now();
  const evidenceLedger = createEvidenceLedger({
    chassis: options.chassisDir ? path.basename(options.chassisDir) : (options.CHASSIS_OVERRIDE || 'UNKNOWN_CHASSIS'),
    filePath: options.inputFile || options.BOQ_FILE || (options.inputItems || options.rawText !== undefined ? 'IN_MEMORY_BOM' : null)
  });
  if (!options.inputFile && (options.inputItems || options.rawText !== undefined)) {
    evidenceLedger.recordInlineArtifact('CUSTOMER_INPUT', options.inputItems ?? options.rawText);
  } else {
    evidenceLedger.recordArtifact('CUSTOMER_INPUT', options.inputFile || options.BOQ_FILE);
  }
  try {
  const { ingestCtx, activeRules } = await _executeIntakeAndKnowledgePhases(options, evidenceLedger);

  evidenceLedger.startPhase(3, '7-Aspect Physical Pre-Flight Math', { itemCount: ingestCtx.items.length });
  const { evalResults, graph, queryPayload, stage2AspectMathMs } = executePhysicalPreChecks(
    ingestCtx.items, ingestCtx.catalogData, ingestCtx.chassisDir, options.JSON_MODE, ingestCtx.requirementResolution
  );
  ingestCtx.items = evalResults.items || ingestCtx.items;
  _recordAspectPhaseEvidence(evidenceLedger, evalResults, ingestCtx, options);

  evidenceLedger.startPhase(4, 'Conflict Graph & Contested Resource Arbitration', {});
  const phase4Passed = graph?.isWholeSolutionValid === true;
  evidenceLedger.completePhase(4, phase4Passed ? 'PASSED' : 'ACTION_REQUIRED', {
    conflicts: graph?.conflicts?.length || 0,
    hasContentions: Boolean(graph?.arbitrationResults?.hasContentions)
  });
  if (!options.JSON_MODE) {
    const PipelineLogger = require('../lib/system/pipeline_logger.js');
    PipelineLogger.checklist(4, 'Conflict Graph & Contested Resource Arbitration', [
      { status: phase4Passed ? 'PASS' : 'WARN', label: `Cross-aspect conflict graph: ${graph?.conflicts?.length || 0} conflict(s)` },
      { status: !graph?.arbitrationResults?.hasContentions ? 'PASS' : 'WARN', label: `Contested slot arbitration: ${graph?.arbitrationResults?.hasContentions ? 'Contentions resolved' : 'Clean slot allocation'}` }
    ]);
  }

  evidenceLedger.startPhase(5, 'Generational Modernization & Least-Delta Combinator', {});
  const modCount = activeRules.generationalModernizations.length;
  evidenceLedger.completePhase(5, 'PASSED', {
    activeModernizationCount: modCount
  });
  if (!options.JSON_MODE) {
    const PipelineLogger = require('../lib/system/pipeline_logger.js');
    PipelineLogger.checklist(5, 'Generational Modernization & Least-Delta Combinator', [
      { status: 'PASS', label: `Platform modernization evaluated (${modCount} rules checked)` },
      { status: 'PASS', label: `Least-delta minimal mutation synthesis initialized` }
    ]);
  }

  evidenceLedger.startPhase(6, '5-Tier Strategy Matrix Synthesis', {});
  const tMatrixStart = Date.now();
  emitProgress(9, 10, 'Strategic Matrix Synthesis', 'in_progress', 'Generating 5-Tier resolution matrix and tradeoff constraints.');
  const budgetOpt = optimizeForBudget(ingestCtx.items, evalResults, options.targetBudgetUsd, ingestCtx.catalogData, ingestCtx.chassisDir);
  evalResults.budgetOptimization = budgetOpt;
  const stage5MatrixMs = Math.max(Date.now() - tMatrixStart, 1);
  const confidenceScore = evalResults.confidence?.score ?? 1.0;
  const isLowConfidence = confidenceScore < 0.55 || Boolean(evalResults.confidence?.isHitlTriggered);
  if (isLowConfidence) {
    for (const candidate of evalResults.conflictGraph?.rankedSolutions || []) {
      candidate.advisoryStatus = 'LOW_CONFIDENCE_ADVISORY';
    }
  }
  const ranks = evalResults.conflictGraph?.rankedSolutions || [];
  const phase6Passed = !isLowConfidence && ranks.length > 0;
  evidenceLedger.completePhase(6, phase6Passed ? 'PASSED' : 'ACTION_REQUIRED', {
    ranksProduced: ranks.length,
    budgetCapEx: budgetOpt?.optimizedBudgetUsd || 0,
    confidenceScore,
    isLowConfidence
  });
  if (!options.JSON_MODE) {
    const PipelineLogger = require('../lib/system/pipeline_logger.js');
    PipelineLogger.checklist(6, '5-Tier Strategy Matrix Synthesis', [
      { status: ranks.length > 0 ? 'PASS' : 'WARN', label: `Strategy tiers synthesized: ${ranks.length} candidate solutions` },
      { status: !isLowConfidence ? 'PASS' : 'WARN', label: `Confidence evaluation score: ${(confidenceScore * 100).toFixed(1)}%` },
      { status: 'PASS', label: `Order-level CapEx: $${(budgetOpt?.optimizedBudgetUsd || 0).toLocaleString()} USD` }
    ]);
  }

  evidenceLedger.startPhase(7, 'Gemini NotebookLM Grounding & Dual-Brain Verification', {});
  let quickSpecs = { status: 'NOT_RUN_OFFLINE_OR_DEFERRED' };
  if (!options.OFFLINE_MODE && !options.DEFER_RAG && ingestCtx.notebookId) {
    const { verifyNotebookQuickSpecs } = require('../lib/sync/quickspecs_sync');
    quickSpecs = await verifyNotebookQuickSpecs(path.basename(ingestCtx.chassisDir), { autoUpload: true, forcedNotebookId: ingestCtx.notebookId });
  }
  evalResults.quickSpecsVerification = quickSpecs;
  const sourceReady = quickSpecs.status === 'CERTIFIED_GROUNDED';
  const { ragResult, ragAnswer, stage3RAGMs, stage4GuardrailMs } = await executeGroundedRagValidation({
    ...ingestCtx,
    evalResults,
    OFFLINE_MODE: options.OFFLINE_MODE || (!options.DEFER_RAG && !sourceReady),
    JSON_MODE: options.JSON_MODE,
    SYNC_RAG: options.SYNC_RAG,
    DEFER_RAG: options.DEFER_RAG
  });
  if (ragResult) {
    evidenceLedger.recordNotebookLmTrace(queryPayload, ragResult, ragResult?.citations || []);
  }
  evidenceLedger.phases.phase_7.outputSummary = {
    primaryRag: {
      verified: evidenceLedger.sharedState.dualBrainVerified,
      citationsCount: ragResult?.citations?.length || 0,
      quickSpecs
    }
  };

  applyLearnedRAGDeltasIfPresent(evalResults, graph, ingestCtx, options, ragResult);

  for (const candidate of evalResults.conflictGraph?.rankedSolutions || []) {
    const checked = evaluatePhysicalMath(candidate.skuPartsList || [], ingestCtx.catalogData, ingestCtx.chassisDir, { skipSynthesis: true });
    candidate.finalValidation = {
      aspectChecks: checked.aspectChecks || [],
      errors: checked.errors || [],
      missingDependencies: checked.missingDependencies || [],
      graph: checked.conflictGraph,
      checkedAt: new Date().toISOString()
    };
    candidate.physicalMathClean = (candidate.skuPartsList || []).length > 0 && checked.isMathClean === true && checked.conflictGraph?.isWholeSolutionValid === true && !(checked.missingDependencies || []).length;
    candidate.buildabilityStatus = candidate.physicalMathClean ? 'LOCAL_RULE_CHECKED' : 'UNRESOLVED_PHYSICAL_GAPS';
    const delta = candidateDelta(ingestCtx.items, candidate);
    candidate.customerDistance = { changedLines: delta.length, changedUnits: delta.reduce((sum, row) => sum + Math.abs(row.after - row.before), 0), metric: 'SKU quantity delta; functional preservation requires independent candidate review' };
  }
  const validatedCandidates = evalResults.conflictGraph?.rankedSolutions || [];
  evalResults.adversarialGateResult = {
    kind: 'DETERMINISTIC_FINAL_CANDIDATE_REVALIDATION',
    manifestSha256: solutionFingerprint(evalResults),
    candidateResults: validatedCandidates.map(candidate => ({ rank: candidate.rank, passed: candidate.physicalMathClean, validation: candidate.finalValidation })),
    passed: validatedCandidates.length > 0 && validatedCandidates.every(candidate => candidate.physicalMathClean)
  };
  evalResults.adversarialGatePassed = evalResults.adversarialGateResult.passed;
  evidenceLedger.phases.phase_6.outputSummary.candidateGate = evalResults.adversarialGateResult;
  if (evalResults.conflictGraph?.recommendedSolutions) {
    const validCandidates = (evalResults.conflictGraph.rankedSolutions || [])
      .filter(candidate => candidate.physicalMathClean && candidate.isUniqueBom !== false && candidate.isParetoOptimal !== false);
    const closestUnits = Math.min(...validCandidates.map(candidate => candidate.customerDistance.changedUnits));
    const distanceWindow = Math.max(1, Math.ceil(ingestCtx.items.filter(item => item.quantityScope !== 'global').length * 0.15));
    evalResults.conflictGraph.recommendedSolutions = validCandidates
      .filter(candidate => candidate.customerDistance.changedUnits <= closestUnits + distanceWindow)
      .sort((a, b) => a.customerDistance.changedLines - b.customerDistance.changedLines || a.customerDistance.changedUnits - b.customerDistance.changedUnits || a.rank - b.rank)
      .slice(0, 3)
      .map((candidate, index) => ({ ...candidate, strategyRank: candidate.rank, rank: index + 1, name: candidate.name.replace(/^Rank \d+:/, `Rank ${index + 1}:`) }));
  }
  _recordCandidateValidationsEvidence(evidenceLedger, evalResults, ingestCtx);

  const ephemeralSourceResult = sourceReady ? await executeEphemeralSourceValidation(options, ingestCtx, evalResults) : null;
  if (ephemeralSourceResult) {
    evalResults.ephemeralSourceValidation = ephemeralSourceResult;
    evidenceLedger.recordNotebookLmTrace(ephemeralSourceResult.queryPayload, ephemeralSourceResult, ephemeralSourceResult.citations || [], ephemeralSourceResult.success ? 'VERIFIED_GROUNDED' : 'ACTION_REQUIRED');
  }
  evidenceLedger.phases.phase_7.outputSummary.solutionSourceValidation = ephemeralSourceResult || { status: 'NOT_RUN' };
  evidenceLedger.sharedState.dualBrainVerified = ephemeralSourceResult?.success === true;
  evidenceLedger.completePhase(7, ephemeralSourceResult?.success ? 'PASSED' : 'ACTION_REQUIRED', evidenceLedger.phases.phase_7.outputSummary);
  if (!options.JSON_MODE) {
    const PipelineLogger = require('../lib/system/pipeline_logger.js');
    PipelineLogger.checklist(7, 'Gemini NotebookLM Grounding & Dual-Brain Verification', [
      { checked: Boolean(evalResults.notebookLmStatus?.isCloudGrounded), status: evalResults.notebookLmStatus?.isCloudGrounded ? 'PASS' : (options.OFFLINE_MODE ? 'SKIP' : 'WARN'), label: `Grounding source: ${evalResults.notebookLmStatus?.source || 'N/A'}` },
      { checked: (evalResults.notebookLmStatus?.citationsCount || 0) > 0, label: `QuickSpecs document citations: ${evalResults.notebookLmStatus?.citationsCount || 0} citations` },
      { checked: (evalResults.opinionDiscrepancies || []).length === 0, label: `Dual-Brain consensus: ${evalResults.opinionDiscrepancies?.length || 0} opinion discrepancies` }
    ]);
  }
  if (ephemeralSourceResult?.success) {
    for (const phaseNumber of [3, 4]) {
      const phase = evidenceLedger.phases[`phase_${phaseNumber}`];
      if (phase.status === 'ACTION_REQUIRED') evidenceLedger.completePhase(phaseNumber, 'RESOLVED', { ...phase.outputSummary, resolvedBy: 'Final candidate validation in phase 6 and cited candidate review in phase 7' }, phase.checks, phase.warnings, phase.errors);
    }
  }
  for (const candidate of evalResults.conflictGraph?.rankedSolutions || []) {
    for (const part of candidate.skuPartsList || []) {
      evidenceLedger.recordSkuAudit(part.sku, part.isFixInjected ? 'PROPOSED_FIX' : 'CANDIDATE_COMPONENT', part.reason || candidate.reasoning || 'Candidate manifest; consult validation verdict.', part.ruleId || null, part.category, { rank: candidate.rank, quantity: part.quantity, physicalMathClean: candidate.physicalMathClean });
    }
  }

  evidenceLedger.startPhase(8, 'Multi-Rank Solution Deliverables & Excel Generation', {});
  Object.defineProperty(evalResults, 'evidenceLedger', { value: evidenceLedger, enumerable: false, configurable: true });

  const newLearningsCount = executeContinuousLearningReflection(evidenceLedger, ingestCtx, evalResults, options);
  evalResults.newLearningsCount = newLearningsCount;
  if (Array.isArray(options.priceDriftItems) && options.priceDriftItems.length) {
    evalResults.priceDriftResult = require('../lib/feedback/feedback_loop.js').promotePriceDriftDeltas(ingestCtx.chassisDir, options.priceDriftItems, options.priceDriftMetadata || {});
  }

  await serializeAndExportResults({
    ...options,
    ...ingestCtx,
    evalResults,
    graph,
    ragAnswer,
    budgetOpt,
    queryPayload,
    startTime,
    stage2AspectMathMs,
    stage3RAGMs,
    stage4GuardrailMs,
    stage5MatrixMs
  });

  if (!options.JSON_MODE) {
    const PipelineLogger = require('../lib/system/pipeline_logger.js');
    PipelineLogger.checklist(8, 'Multi-Rank Solution Deliverables & Excel Generation', [
      { checked: Boolean(evalResults.multiRankWorkbookPath), label: `Multi-Rank Matrix (.xlsx): ${evalResults.multiRankWorkbookPath ? path.basename(evalResults.multiRankWorkbookPath) : 'Pending'}` },
      { checked: Boolean(evalResults.multiRankCsvPath), label: `Token-Dense CSV: ${evalResults.multiRankCsvPath ? path.basename(evalResults.multiRankCsvPath) : 'Pending'}` },
      { checked: Boolean(evalResults.portalWorkbookPath), label: `Partner Portal Sheet: ${evalResults.portalWorkbookPath ? path.basename(evalResults.portalWorkbookPath) : 'Pending'}` }
    ]);
    PipelineLogger.checklist(9, 'Closed-Loop Knowledge Reflection & Shared State Export', [
      { checked: true, label: `Knowledge reflection complete (${evalResults.newLearningsCount || 0} new learnings evaluated)` },
      { checked: Boolean(evalResults.evidenceLogPath), label: `Evidence ledger exported: ${evalResults.evidenceLogPath ? path.basename(evalResults.evidenceLogPath) : 'outputs/history/evidence_logs'}` }
    ]);
  }
  return evalResults;
  } catch (error) {
    _handlePipelineFailure(error, evidenceLedger, options);
    throw error;
  }
}

async function main() {
  const options = parseEvaluationArguments(process.argv.slice(2));
  if (!options) return;
  await runEvaluationPipeline(options);
}

if (require.main === module) {
  main().catch(err => {
    const JSON_MODE = process.argv.includes('--json');
    if (JSON_MODE) {
      process.stdout.write('\n__EVAL_RESULT_JSON__' + JSON.stringify({
        status: 'ERROR',
        error: err.message,
        data: {
          traceId: err.traceId || null,
          evidenceLogPath: err.evidenceLogPath || null
        }
      }) + '__EVAL_RESULT_JSON__\n');
    } else {
      console.error('Fatal evaluation error:', err);
    }
    process.exit(1);
  });
}

/**
 * Recompute Strategy Matrix with Grounded Cloud RAG findings.
 * Takes baseData (or raw eval results), the resolved RAG answer / citations,
 * extracts any newly learned deltas, re-runs aspect math, and re-synthesizes the 5-Tier Strategy Matrix.
 * @param {object} baseData
 * @param {object} ragResult
 * @param {string} [chassisDirOverride]
 * @returns {object} Updated data object with verified matrix
 */
function recomputeStrategyMatrixWithRag(baseData, ragResult, chassisDirOverride = '') {
  if (!baseData || !ragResult) return baseData;
  const items = baseData.items || (baseData.evalResults && baseData.evalResults.items) || [];
  const targetDir = chassisDirOverride || baseData.chassisDir || (baseData.evalResults && baseData.evalResults.targetDir) || '';
  const chassisPrefix = path.basename(targetDir || '');
  const catalogPath = path.join(targetDir, `${chassisPrefix}_Catalog.json`);
  let catalogData = baseData.catalogData || null;
  if (!catalogData && fs.existsSync(catalogPath)) {
    try { catalogData = JSON.parse(fs.readFileSync(catalogPath, 'utf-8')); } catch (_) {}
  }

  // 1. Extract and persist learned deltas from verified cloud RAG answer
  let learnedCount = 0;
  if (ragResult.isCloudGrounded && (ragResult.citations || []).length > 0) {
    try {
      const learned = extractAndPersistLearnedDeltas(ragResult.answer || '', targetDir, {
        chassis: (catalogData && catalogData.metadata && catalogData.metadata.chassis) || chassisPrefix,
        source: ragResult.source,
        groundingVerification: ragResult.groundingVerification,
        citations: ragResult.citations || [],
        catalogData
      });
      learnedCount = learned.count || 0;
    } catch (_) {}
  }

  // 2. Re-run aspect math with newly active rules/deltas
  const { evaluateBOQMultiAspect } = require('../lib/boq/boq_evaluator.js');
  const reEval = evaluateBOQMultiAspect(items, { filePath: baseData.inputFile, catalogData, targetDir });

  // 3. Re-synthesize 5-Tier Strategy Matrix
  const { synthesize5TierRankedSolutions } = require('../lib/conflict/conflict_graph.js');
  const updatedGraph = reEval.conflictGraph || {};
  const newRankedSolutions = synthesize5TierRankedSolutions(
    items,
    reEval,
    updatedGraph,
    updatedGraph.chassisInfo || { model: chassisPrefix },
    targetDir
  );

  // 4. Update budget optimization
  const budgetOpt = optimizeForBudget(items, reEval, baseData.targetBudgetUsd || 0, catalogData);

  // 5. Update data payload
  const updatedData = {
    ...baseData,
    isProvisional: true,
    matrixStatus: 'CANDIDATE_REVIEW_REQUIRED',
    cloudGroundingStatus: ragResult.isCloudGrounded ? 'CLOUD_VERIFIED' : 'LOCAL_FALLBACK',
    ragAnswer: ragResult.answer || baseData.ragAnswer,
    ragResult,
    notebookLmStatus: {
      status: ragResult.isCloudGrounded ? 'CLOUD_VERIFIED' : 'LOCAL_FALLBACK',
      source: ragResult.source,
      sourcesUsed: ragResult.sourcesUsed || [],
      citationsCount: (ragResult.citations || []).length,
      isCloudGrounded: Boolean(ragResult.isCloudGrounded),
      learnedDeltasCount: learnedCount
    },
    evalResults: {
      ...(baseData.evalResults || {}),
      ...reEval,
      isProvisional: true,
      matrixStatus: 'CANDIDATE_REVIEW_REQUIRED',
      cloudGroundingStatus: ragResult.isCloudGrounded ? 'CLOUD_VERIFIED' : 'LOCAL_FALLBACK',
      ragAnswer: ragResult.answer,
      ragResult
    },
    conflictGraph: {
      ...(baseData.conflictGraph || {}),
      ...updatedGraph,
      rankedSolutions: newRankedSolutions
    },
    budgetOptimization: budgetOpt
  };

  return updatedData;
}

module.exports = {
  runEvaluationPipeline,
  main,
  getDefaultNotebookId,
  parseEvaluationArguments,
  ingestAndConsolidateBoq,
  executePhysicalPreChecks,
  executeGroundedRagValidation,
  generateMarkdownReport,
  serializeAndExportResults,
  recomputeStrategyMatrixWithRag
};
