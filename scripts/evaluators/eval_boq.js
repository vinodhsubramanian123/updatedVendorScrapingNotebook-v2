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
const terminalOwner = require('../lib/lifecycle/canonical_terminal_owner.js');
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
const { observeActualInvocation, associateCanonicalTrace } = require('../lib/system/execution_trace_runtime.js');
const { candidateDelta, solutionFingerprint } = require('../lib/boq/solution_evidence');
const { loadActiveKnowledgeRules } = require('../lib/catalog/active_knowledge_router.js');
const { recordAndCertifyLearnedRule } = require('../lib/feedback/continuous_learning_verifier.js');
const { assertNotebookHealth, loadNotebookConfig } = require('../lib/sync/knowledge_sync.js');
const { LifecycleEngine } = require('../lib/lifecycle/lifecycle_engine.js');
const logger = require('../lib/system/pipeline_logger.js');

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
function _printEvalBoqHelpAndExit() {
  console.log(`
Usage: node scripts/eval_boq.js <input_boq_file> [options]

Options:
  --chassis <dir>              Target chassis catalog directory (auto-detected from BOQ if omitted)
  --notebook-id <id>           Gemini Notebook ID for RAG validation
  --output <output_report.md>  Output report path
  --json                       Machine-parseable JSON output mode
  --defer-rag                  Return local result and let the dashboard own the cloud job
  --query-timeout-ms <ms>      Total budget per logical Notebook query (default600000)
  --deadline-at <epoch-ms>     Shared absolute caller deadline
  --budget <usd>               Target CapEx budget in USD
  --support-default            Apply owner standard 3-year Basic using an exact live product-qualified receipt
  --simulate-portal-error ".." Simulate a portal rejection error
  --output-dir <dir>           Output directory for feedback deltas

Examples:
  node scripts/eval_boq.js test_boq_dl380_gen12.csv
  node scripts/eval_boq.js my_quote.xlsx --chassis outputs/Alletra/Storage/Alletra_Storage_System --json
  node scripts/eval_boq.js test_boq_dl380_gen12.csv --simulate-portal-error "ERR_STORAGE_CABLE_REQUIRED: Controller MR416i-p requires P76453-B21 Box 1/2 Cable Kit."
`);
  process.exit(0);
}

function _getFlagValue(args, flagName, defaultValue = null) {
  const idx = args.indexOf(flagName);
  return (idx !== -1 && args[idx + 1]) ? args[idx + 1] : defaultValue;
}

const FLAGS_WITH_VALUE = new Set([
  '--chassis', '--notebook-id', '--output', '--sheet',
  '--simulate-portal-error', '--output-dir', '--budget',
  '--file', '--query-timeout-ms', '--deadline-at',
  '--server-count', '--multiplier', '--parent-run-id', '--candidate-digest', '--candidate-ref'
]);

function _findPositionalInputFile(args) {
  const explicitFile = _getFlagValue(args, '--file');
  if (explicitFile) return explicitFile;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (FLAGS_WITH_VALUE.has(arg)) {
      i++;
      continue;
    }
    if (!arg.startsWith('-')) return arg;
  }
  return null;
}

function parseEvaluationArguments(args = process.argv.slice(2)) {
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    _printEvalBoqHelpAndExit();
  }

  const JSON_MODE = args.includes('--json');
  const OFFLINE_MODE = args.includes('--offline') ||
    ['1', 'true'].includes(String(process.env.OFFLINE_MODE || '').trim().toLowerCase()) ||
    ['1', 'true'].includes(String(process.env.LOCAL_EVAL_ONLY || '').trim().toLowerCase());
  const DEFER_RAG = args.includes('--defer-rag');
  const inputFile = _findPositionalInputFile(args);

  if (!inputFile || !fs.existsSync(inputFile)) {
    console.error(`❌ Input BOQ file not found: ${inputFile || '(none provided)'}`);
  }

  const explicitNotebookId = _getFlagValue(args, '--notebook-id');
  const chassisDir = _getFlagValue(args, '--chassis', '');
  const targetSheetName = _getFlagValue(args, '--sheet');
  const explicitOutputPath = _getFlagValue(args, '--output');
  const simulatePortalError = _getFlagValue(args, '--simulate-portal-error');
  const explicitOutputDir = _getFlagValue(args, '--output-dir');
  const budgetStr = _getFlagValue(args, '--budget');
  const targetBudgetUsd = budgetStr ? (parseFloat(budgetStr) || 0) : 0;

  const SYNC_RAG = args.includes('--sync-rag') || process.env.SYNC_RAG === '1';
  const SHEET_VALIDATION = args.includes('--sheet-validation') || args.includes('--source-validation');
  const UPLOAD_DRIVE = args.includes('--upload-drive') || process.env.AUTO_UPLOAD_DRIVE === 'true';

  const { numericCliOption } = require('../lib/system/execution_budget.js');
  const queryTimeoutMs = numericCliOption(args, '--query-timeout-ms');
  const deadlineAt = numericCliOption(args, '--deadline-at');
  const serverCountVal = _getFlagValue(args, '--server-count') || _getFlagValue(args, '--multiplier');
  const serverCount = serverCountVal ? parseInt(serverCountVal, 10) : undefined;
  const parentRunId = _getFlagValue(args, '--parent-run-id');
  const candidateDigest = _getFlagValue(args, '--candidate-digest');

  return {
    ...(queryTimeoutMs === undefined ? {} : { queryTimeoutMs }),
    ...(deadlineAt === undefined ? {} : { deadlineAt }),
    ...(serverCount !== undefined ? { serverCount } : {}),
    ...(parentRunId ? { parentRunId } : {}),
    ...(candidateDigest ? { candidateDigest } : {}),
    inputFile,
    JSON_MODE,
    OFFLINE_MODE,
    DEFER_RAG,
    SYNC_RAG,
    SHEET_VALIDATION,
    UPLOAD_DRIVE,
    applySupportDefault: args.includes('--support-default'),
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

async function _extractRawBoqPayload(inputFile, options, inMemory, isExcel, JSON_MODE) {
  let rawContent = '';
  let ocrMetadata = null;
  const { isImageFile, performGeminiOcr } = require('../lib/ocr/ocr_service.js');

  if (inMemory) {
    rawContent = options.inputItems ?? options.rawText;
  } else if (isImageFile(inputFile)) {
    const isOffline = Boolean(options.OFFLINE_MODE || options.effectivePolicy?.offline);
    if (isOffline) {
      const err = new Error('Local-only execution is active (OFFLINE_MODE is enabled). Image/PDF OCR requires cloud processing. Please provide pasted text, CSV, or Excel BOM file.');
      err.code = 'OFFLINE_INPUT_REQUIRED';
      throw err;
    }
    if (!JSON_MODE) console.log(`📸 Detected image/PDF document input (${path.basename(inputFile)}). Initiating Multimodal Gemini OCR extraction...`);
    const ocrResult = await performGeminiOcr(inputFile, {
      offline: false,
      offlineMode: false,
      effectivePolicy: options.effectivePolicy || null
    });
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

  return { rawContent, ocrMetadata };
}

function _lookupChassisDirById(chassisDir) {
  if (fs.existsSync(chassisDir) && fs.statSync(chassisDir).isDirectory()) return chassisDir;
  const { listAllCatalogs } = require('../lib/catalog/catalog_discovery.js');
  const cats = listAllCatalogs();
  const matched = cats.find(c => c.id === chassisDir || c.prefix === chassisDir || c.chassis === chassisDir || path.basename(c.catalogDir) === chassisDir);
  return matched ? matched.catalogDir : chassisDir;
}

function _throwUnknownChassisError(items, chassisDetection, availableCatalogs) {
  const { detectVendor } = require('../lib/taxonomy/vendor_agnostic_schema.js');
  const sampleText = (items || []).slice(0, 10).map(i => `${i.sku || ''} ${i.description || ''}`).join(' ');
  const detectedVendor = detectVendor(sampleText, items?.[0]?.sku || '', {});
  const isCompetitor = detectedVendor !== 'HPE' && detectedVendor !== 'Generic';

  console.error('❌ ERROR: [ERR_UNKNOWN_CHASSIS] Could not auto-detect chassis variant from BOQ items, and no --chassis flag was provided.');
  if (isCompetitor) {
    console.error(`💡 Detected ${detectedVendor} competitor BOM items. Customer BOQ evaluation requires HPE catalogs.`);
    console.error(`💡 To transform this ${detectedVendor} quote into an equivalent HPE BOM, run: npm run route -- "Convert this ${detectedVendor} quote to HPE" --file <path>`);
  } else {
    console.error('💡 Please select the correct catalog in the UI dropdown or use the --chassis <dir> flag.');
  }

  const errPayload = {
    status: 'ERROR',
    code: isCompetitor ? 'COMPETITOR_BOM_TRANSFORMATION_REQUIRED' : 'PLATFORM_CLARIFICATION_REQUIRED',
    detectedVendor: isCompetitor ? detectedVendor : null,
    suggestedCommand: isCompetitor ? `npm run route -- "Convert this ${detectedVendor} quote to HPE" --file <path>` : null,
    chassisDetection,
    candidates: Array.isArray(availableCatalogs) ? availableCatalogs.map(c => c.id) : [],
    error: 'ERR_UNKNOWN_CHASSIS',
    message: isCompetitor
      ? `Could not auto-detect HPE chassis. Detected ${detectedVendor} competitor hardware. Use the Cross-Vendor Transpiler to transform to HPE.`
      : 'Could not auto-detect chassis. Please confirm the chassis variant.'
  };

  if (process.env.STRUCTURED_PROGRESS) {
    process.stdout.write('\n\n' + JSON.stringify(errPayload) + '\n');
  }
  const err = new Error(errPayload.message);
  err.code = 'ERR_UNKNOWN_CHASSIS';
  err.payload = errPayload;
  throw err;
}

async function _resolveChassisSelection(items, explicitChassisDir, JSON_MODE) {
  let chassisDir = explicitChassisDir;
  let chassisDetection = null;

  if (!chassisDir) {
    chassisDetection = autoDetectChassisDetailed(items);
    if (chassisDetection.requiresUserConfirmation || chassisDetection.confidenceScore < 0.75) {
      chassisDetection.requiresUserConfirmation = true;
    } else {
      chassisDir = chassisDetection.chassisDir;
    }
  } else {
    chassisDir = _lookupChassisDirById(chassisDir);
    chassisDetection = {
      chassisDir,
      matchType: 'EXPLICIT_CLI',
      confidenceScore: 1.0,
      requiresUserConfirmation: false
    };
  }

  if (!chassisDir && (chassisDetection.unknown || chassisDetection.requiresUserConfirmation)) {
    const { listAllCatalogs } = require('../lib/catalog/catalog_discovery.js');
    let availableCatalogs = [];
    try { availableCatalogs = listAllCatalogs(); } catch { /* ignore */ }
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

    if (!chassisDir) {
      _throwUnknownChassisError(items, chassisDetection, availableCatalogs);
    }
  }

  return { chassisDir, chassisDetection };
}

function _preflightCatalogFreshness(detectedChassisName, chassisDir, options, isExplicitTestPath, JSON_MODE, chassisDetection) {
  let resolvedChassisDir = chassisDir;
  if (!isExplicitTestPath && !options.OFFLINE_MODE && !process.env.CI) {
    const { buildRefreshPlan, executeRefreshPlan } = require('../lib/catalog/catalog_refresh_plan.js');
    const plan = buildRefreshPlan({ products: [detectedChassisName] });
    const refresh = executeRefreshPlan(plan);
    if (!refresh.success) {
      const certCheck = isCatalogCertified(detectedChassisName);
      if (certCheck.certified) {
        console.warn(`⚠️ [DEGRADED_MODE] Online catalog refresh was not completed for '${detectedChassisName}'. Proceeding in Degraded Mode with local certified catalog on disk.`);
        chassisDetection.degradedMode = true;
      } else {
        throw new Error(`ERR_CATALOG_REFRESH: ${JSON.stringify(refresh.results)}`);
      }
    } else {
      const refreshed = require('../lib/catalog/product_metadata_manager.js').getProductGenerationMetadata(detectedChassisName);
      resolvedChassisDir = refreshed.outputDir;
      chassisDetection.chassisDir = resolvedChassisDir;
    }
  }
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

  if (!fs.existsSync(resolvedChassisDir) || !fs.statSync(resolvedChassisDir).isDirectory()) {
    throw new Error('ERR_UNKNOWN_CHASSIS: Explicit chassis does not identify a catalog directory.');
  }

  return resolvedChassisDir;
}

function _loadAndAuditCatalogData(chassisDir, isExplicitTestPath) {
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
  if (['UNKNOWN', 'INVALID_FUTURE_DATE', 'CRITICAL_OUTDATED'].includes(catalogAudit.freshness.freshnessStatus) && !isExplicitTestPath) {
    throw new Error(`ERR_CATALOG_FRESHNESS: ${catalogAudit.freshness.freshnessStatus}`);
  }

  return { catalogData, catalogAudit, chassisPrefix };
}

function _applyPolicyAndConfiguration(rawItems, options, chassisDir, catalogData, parsedBoq, chassisDetection) {
  let items = rawItems;
  const productConfirmed = !chassisDetection.requiresUserConfirmation && chassisDetection.confidenceScore >= 0.95;
  let supportPolicyChange = null;
  if (options.applySupportDefault) {
    supportPolicyChange = require('../lib/boq/support_policy').applyRequestedDefaultSupport(items, chassisDir);
    items = supportPolicyChange.items;
  }
  const requirementResolution = resolveRequirementIntent({
    items,
    unresolvedRequirements: parsedBoq.unresolvedRequirements,
    rawLines: parsedBoq.rawLines,
    catalogData,
    productConfirmed,
    vendorQualifiedServices: supportPolicyChange?.items.filter(row => row.supportPolicySource === 'EXPLICIT_STANDARD_DEFAULT') || []
  });
  if (supportPolicyChange) requirementResolution.supportPolicyChange = supportPolicyChange;
  items = requirementResolution.resolvedItems;
  let configurationContext;
  try {
    const requestedServerCount = options.serverCount ?? parsedBoq?.candidateReference?.serverCount ?? parsedBoq?.candidateReference?.nodeCount;
    configurationContext = require('../lib/boq/configuration_context').normalizeConfiguration(items, { serverCount: requestedServerCount });
    items = configurationContext.items;
    if (requestedServerCount !== undefined && Number(requestedServerCount) !== configurationContext.multiplier) {
      throw new Error('ERR_QUANTITY_CONTEXT: Requested serverCount disagrees with the customer configuration multiplier.');
    }
  } catch (err) {
    if (err.code !== 'CONFIGURATION_OWNERSHIP_AMBIGUOUS') throw err;
    configurationContext = { items, multiplier: 1, ownershipEvidence: 'AMBIGUOUS_OWNERSHIP_RAW' };
  }

  return { items, requirementResolution, configurationContext };
}

function _resolveEffectiveExplicitChassis(options, parsedBoq) {
  return options.chassisDir
    || parsedBoq.chassisDir
    || options.candidateReference?.chassisDir
    || parsedBoq.candidateReference?.product
    || options.candidateReference?.product
    || '';
}

function _probeNotebookHealthSafe(detectedChassisName) {
  try {
    const nbCfg = loadNotebookConfig();
    const notebookHealth = assertNotebookHealth(nbCfg, detectedChassisName, logger);
    return { notebookHealth, notebookDegradedMode: notebookHealth.degradationMode };
  } catch {
    return { notebookHealth: null, notebookDegradedMode: null };
  }
}

function _applySimulatedErrorAndPrintBanner(options, chassisDir, inputFile, notebookId, outputPath, itemCount) {
  if (options.simulatePortalError) {
    if (!options.JSON_MODE) console.log(`\n🔄 Processing simulated partner portal error feedback...`);
    const delta = processPortalFeedback(options.simulatePortalError, options.explicitOutputDir || chassisDir);
    if (!options.JSON_MODE) console.log(`✅ KnowledgeDelta logged: ${delta.deltaId} (${delta.ruleUpdate})`);
  }
  if (options.JSON_MODE) return;
  console.log(`\n===============================================================\n🚀 HPE BOQ PRE-FLIGHT EVALUATION & GEMINI NOTEBOOK VALIDATOR\n===============================================================`);
  console.log(`  📄 Input BOQ File : ${inputFile}\n  📚 Notebook ID    : ${notebookId}\n  📝 Output Report  : ${outputPath}\n  🔧 Chassis Dir    : ${chassisDir}`);
  console.log(`\n🔍 Phase 1: Consolidated ${itemCount} unique hardware SKUs from BOQ.`);
}

async function ingestAndConsolidateBoq(options) {
  const inMemory = !options.inputFile && (Array.isArray(options.inputItems) || typeof options.rawText === 'string');
  if (!inMemory && (!options.inputFile || !fs.existsSync(options.inputFile))) {
    throw new Error(`Input BOQ file not found: ${options.inputFile || '(none provided)'}`);
  }
  const { inputFile = `InMemory_${crypto.randomUUID()}.txt`, targetSheetName, explicitNotebookId, explicitOutputPath, JSON_MODE } = options;

  const tStart = Date.now();
  const inputBase = path.basename(inputFile, path.extname(inputFile));
  const { rawContent, ocrMetadata } = await _extractRawBoqPayload(inputFile, options, inMemory, /\.xlsx?$/i.test(inputFile), JSON_MODE);

  const parsedBoq = parseAndConsolidateBOQDetailed(rawContent, inMemory ? '' : inputFile, targetSheetName);
  let items = parsedBoq.items;
  if (!items.length) throw new Error('ERR_EMPTY_BOQ: No hardware items parsed.');
  if (items.some(item => !item.sku || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1)) {
    throw new Error('ERR_INVALID_BOQ: Every item requires a SKU and positive integer quantity.');
  }
  const stage1ParsingMs = Math.max(Date.now() - tStart, 1);

  let { chassisDir, chassisDetection } = await _resolveChassisSelection(items, _resolveEffectiveExplicitChassis(options, parsedBoq), JSON_MODE);
  const detectedChassisName = path.basename(chassisDir || '');
  const isExplicitTestPath = /(?:^|[\\/])tests[\\/]fixtures|(?:^|[\\/])outputs[\\/]temp[\\/]test_payloads/i.test(chassisDir) || process.env.NODE_ENV === 'test';
  chassisDir = _preflightCatalogFreshness(detectedChassisName, chassisDir, options, isExplicitTestPath, JSON_MODE, chassisDetection);

  const configuredNotebookId = getDefaultNotebookId(detectedChassisName);
  const notebookId = explicitNotebookId === configuredNotebookId ? explicitNotebookId : configuredNotebookId;
  const { notebookHealth, notebookDegradedMode } = _probeNotebookHealthSafe(detectedChassisName);

  const defaultReportsDir = path.join(chassisDir, 'reports');
  if (!fs.existsSync(defaultReportsDir)) fs.mkdirSync(defaultReportsDir, { recursive: true });
  const fileSuffix = targetSheetName ? `${inputBase}_${targetSheetName.replace(/[/\\?*[\]:]/g, '_')}` : inputBase;
  const outputPath = explicitOutputPath || path.join(defaultReportsDir, `BOQ_Evaluation_${fileSuffix}.md`);
  _applySimulatedErrorAndPrintBanner(options, chassisDir, inputFile, notebookId, outputPath, items.length);

  const { catalogData, catalogAudit, chassisPrefix } = _loadAndAuditCatalogData(chassisDir, isExplicitTestPath);
  const policyResult = _applyPolicyAndConfiguration(items, options, chassisDir, catalogData, parsedBoq, chassisDetection);
  items = policyResult.items;
  const { requirementResolution, configurationContext } = policyResult;
  const serverCount = configurationContext.multiplier || options.serverCount || 1;
  const candidateReference = options.candidateReference || parsedBoq.candidateReference || null;

  return {
    items, configurationContext, serverCount, nodeCount: serverCount,
    quantityBasis: candidateReference?.quantityBasis || (serverCount > 1 ? 'CLUSTER_MULTIPLIED' : 'SINGLE_NODE'),
    parentRunId: options.parentRunId || parsedBoq.parentRunId || null,
    candidateDigest: options.candidateDigest || parsedBoq.candidateDigest || null,
    candidateReference, inputFile, chassisDir, chassisPrefix, chassisDetection, detectedChassisName,
    notebookId, notebookDegradedMode, notebookHealth, outputPath, catalogData, requirementResolution,
    unmatchedSkus: parsedBoq.unmatchedSkus || [], unresolvedRequirements: parsedBoq.unresolvedRequirements || [],
    ocrMetadata, catalogAudit, stage1ParsingMs
  };
}

// ============================================================
// Stage 3: Modular Physical Pre-Checks & Conflict Graph
// ============================================================
// Ingest has already validated ownership and normalized quantities. Evaluate only
// its base configuration, then restore order scope through the shared contract.
function evaluateIngestedPhysicalContext(items, catalogData, chassisDir, configurationContext) {
  if (!configurationContext || configurationContext.ownershipEvidence === 'AMBIGUOUS_OWNERSHIP_RAW') {
    return evaluatePhysicalMath(items, catalogData, chassisDir);
  }
  const { applyConfigurationContext } = require('../lib/boq/configuration_context');
  const baseItems = configurationContext.items.filter(item => item.quantityScope !== 'global');
  const result = evaluatePhysicalMath(baseItems, catalogData, chassisDir, { baseConfigurationOnly: true });
  return applyConfigurationContext(result, configurationContext);
}

function _attachPresalesLifecycleAdvisories(evalResults, items, chassisDir) {
  try {
    const { generatePresalesLifecycleAdvisories } = require('../lib/catalog/sku_versioning.js');
    const advisories = generatePresalesLifecycleAdvisories(items, chassisDir);
    evalResults.presalesLifecycleAdvisories = advisories;
    if (advisories && advisories.length > 0) {
      for (const adv of advisories) {
        evalResults.warnings.push(`[PRESALES_ADVISORY] ${adv.message}`);
      }
    }
  } catch {
    // Non-blocking presales advisory audit
  }
}

function _logAspectSummaryLines(evalResults) {
  console.log(`\n⚡ Phase 2: Modular ${evalResults.aspectChecks ? evalResults.aspectChecks.length : 'Multi'}-Aspect Physical Pre-Checks Completed:`);
  if (evalResults.aspectChecks && Array.isArray(evalResults.aspectChecks)) {
    evalResults.aspectChecks.forEach(asp => {
      const icon = asp.status === 'PASS' ? '✅ PASS' : (asp.status === 'FAIL' ? '❌ FAIL' : asp.status);
      console.log(`  ${asp.id}. ${asp.name.padEnd(25)} : ${icon} — ${asp.detail}`);
    });
    return;
  }
  console.log(`  1. Compute & Thermal : ${evalResults.cpuCount} CPUs (Max TDP: ${evalResults.maxCpuTdpWatts}W) | High-Perf Fans: ${evalResults.hasHighPerfFans ? '✅' : '❌'}`);
  console.log(`  2. Memory & Channels : ${evalResults.memoryCount} DIMMs (${evalResults.totalMemoryGb} GB Total)`);
  console.log(`  3. Storage & Tri-Mode: ${evalResults.driveCount} Drives | Controller Battery: ${evalResults.hasSmartBattery ? '✅' : '❌'}`);
  console.log(`  4. PCIe Expansion    : ${evalResults.requiredPcieCards || 0} Cards / ${evalResults.totalPcieSlotsAvailable || 2} Slots`);
  console.log(`  5. Networking & OCP  : OCP Adapter Present: ${evalResults.hasOcpAdapter ? '✅' : '❌'}`);
  console.log(`  6. Power & Ambient   : -48VDC PSU: ${evalResults.hasDcPowerSupply ? 'YES' : 'NO'} | Lug Kit: ${evalResults.hasDcLugKit ? '✅' : '❌'}`);
  console.log(`  7. Support Services  : Tech Care Support Present: ${evalResults.hasSupportService ? '✅' : '❌'}`);
}

function _logConflictGraphAndDiagnostics(evalResults, graph) {
  console.log(`\n🕸️ Phase 2.5: 5-Level Dependency Conflict Graph Validation:`);
  console.log(`  Chassis Variant    : ${graph.chassisInfo ? graph.chassisInfo.model : 'Unknown'}`);
  console.log(`  Rules Evaluated    : ${graph.totalRulesEvaluated || 0} across VENDOR, CHASSIS, CATEGORY, SUBCATEGORY, SKU levels`);
  console.log(`  Rules Source       : ${graph.rulesSource || 'N/A'} ${graph.isFallbackSource ? '(Fallback Safety Net)' : '(Dual Safety Net)'}`);
  if (graph.rulesSource === 'NONE') {
    console.log(`  Whole Solution     : ⚠️ NO_DATA (No rules evaluated)`);
  } else {
    console.log(`  Whole Solution     : ${graph.isWholeSolutionValid ? '✅ PASSED (No cross-aspect conflicts)' : '❌ CONFLICTS DETECTED'}`);
  }
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
  if (graph.conflicts && graph.conflicts.length > 0) {
    const hints = graph.conflicts.filter(c => c.diagnosticHint).map(c => c.diagnosticHint);
    if (hints.length > 0) {
      evalResults.diagnosticHints = hints;
      console.log(`\n💡 HISTORICAL DIAGNOSTIC REFERENCES (${hints.length} known pattern(s) identified):`);
      hints.forEach(h => console.log(`   - ${h.referenceNotice || h.rule}`));
    }
  }
}

function executePhysicalPreChecks(items, catalogData, chassisDir, JSON_MODE, requirementResolution = null, configurationContext = null) {
  const tAspectStart = Date.now();
  const evalResults = evaluateIngestedPhysicalContext(items, catalogData, chassisDir, configurationContext);
  evalResults.catalogData = catalogData;
  const rulesPath = path.join(chassisDir, `${path.basename(chassisDir)}_Catalog_Rules.json`);
  evalResults.catalogRules = fs.existsSync(rulesPath) ? JSON.parse(fs.readFileSync(rulesPath, 'utf8')) : null;
  evalResults.requirementResolution = requirementResolution;
  if (requirementResolution?.requiresHumanClarification) {
    evalResults.confidence.isHitlTriggered = true;
    evalResults.confidence.score = Math.min(evalResults.confidence.score, 0.74);
    evalResults.confidence.confidenceReasons.push('[REQUIREMENT_AMBIGUITY] A part/category or attribute-only requirement needs human confirmation before solution learning.');
  }

  _attachPresalesLifecycleAdvisories(evalResults, items, chassisDir);

  const graph = evalResults.conflictGraph || {};
  const stage2AspectMathMs = Math.max(Date.now() - tAspectStart, 1);

  if (!JSON_MODE) {
    _logAspectSummaryLines(evalResults);
  }

  const queryPayload = formatNotebookQueryPayload(items, evalResults);
  evalResults.notebookPayload = queryPayload;

  if (!JSON_MODE) {
    _logConflictGraphAndDiagnostics(evalResults, graph);
  }

  return { evalResults, graph, queryPayload, stage2AspectMathMs };
}

function _detectOpinionDiscrepancy(evalResults, ragResult) {
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
}

function _evaluateRagGroundingAndViolations(evalResults, ragResult) {
  evalResults.ragVerified = false;
  evalResults.ragViolationDetected = null;

  const isCloudGroundedWithCitations = evalResults.notebookLmStatus.isCloudGrounded &&
    (evalResults.notebookLmStatus.citationsCount > 0);

  if (isCloudGroundedWithCitations) {
    const answerLc = (ragResult.answer || '').toLowerCase();
    const violationSignals = [
      'incompatible', 'not supported', 'conflict detected', 'violation', 'cannot be used',
      'not compatible', 'requires', 'missing mandatory', 'will not work', 'mismatch'
    ];
    const ragFlagsViolation = violationSignals.some(sig => answerLc.includes(sig));
    const hasLocalOverrideDiscrepancy = (evalResults.opinionDiscrepancies || [])
      .some(d => d.type === 'LOCAL_RULE_OVERRIDE');

    if (hasLocalOverrideDiscrepancy) {
      evalResults.ragViolationDetected =
        'NotebookLM answered "fully compatible" but local rule engine found critical physical errors. ' +
        'Deterministic aspect checks prevail. Manual review required.';
    } else if (ragFlagsViolation && (evalResults.errors || []).length === 0) {
      const snippet = (ragResult.answer || '').slice(0, 300).replace(/\n/g, ' ');
      evalResults.ragViolationDetected =
        `NotebookLM flagged a potential violation not caught by local rules: "${snippet}..."`;
    } else if (!ragFlagsViolation) {
      evalResults.ragVerified = true;
    }
  }

  // Per-Rank Grounded Micro-Grounding & Citations (G-RSN-02)
  const rankedSolutions = evalResults.conflictGraph?.rankedSolutions || [];
  for (const sol of rankedSolutions) {
    sol.nlmVerified = Boolean(evalResults.ragVerified);
    sol.groundingTier = evalResults.notebookLmStatus?.groundingTier || 'TIER_1_LOCAL_DETERMINISTIC';
    sol.quickSpecsCitations = (ragResult?.citations || []).slice(0, 5);
  }
}

function _extractVerifiedKnowledgeDeltas(evalResults, ragResult, chassisDir, catalogData) {
  try {
    const isVerifiedCloud = evalResults.notebookLmStatus.isCloudGrounded && (evalResults.notebookLmStatus.citationsCount > 0);
    if (isVerifiedCloud) {
      const learnedResult = extractAndPersistLearnedDeltas(ragResult.answer, chassisDir, {
        chassis: (catalogData && catalogData.metadata && catalogData.metadata.chassis) || path.basename(chassisDir),
        source: ragResult.source,
        groundingVerification: ragResult.groundingVerification,
        citations: ragResult.citations || [],
        confidenceScore: ragResult.groundingVerification === 'VERIFIED_GROUNDED' ? 0.90 : 0.70,
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
}

function _formatRagAnswerText(ragResult, ragDurationFormatted, evalResults) {
  return `### Pre-Flight Grounded Physical Validation Matrix (${ragResult.source})

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
}

async function _executeAgenticGuardrailReview(items, chassisDir, inputFile, evalResults, OFFLINE_MODE, JSON_MODE, catalogData) {
  let stage4GuardrailMs = 0;
  const needsGuardrail = Boolean(
    !OFFLINE_MODE && (
      (evalResults.errors && evalResults.errors.length > 0) ||
      (evalResults.confidence && (evalResults.confidence.isHitlTriggered || evalResults.confidence.score < 0.88)) ||
      (evalResults.opinionDiscrepancies && evalResults.opinionDiscrepancies.length > 0)
    )
  );

  if (!needsGuardrail) return stage4GuardrailMs;

  const tGuardrailStart = Date.now();
  if (!JSON_MODE) console.log('\n🤖 Triggering Agentic Guardrail Loop for resolution...');

  const guardrailResult = await runAgenticGuardrail(items, chassisDir, {
    offline: OFFLINE_MODE,
    offlineMode: OFFLINE_MODE,
    effectivePolicy: evalResults.effectivePolicy || null
  });
  evalResults.agenticReviewStatus = guardrailResult.success === true && !guardrailResult.error ? 'ADVISORY_RETURNED' : 'UNAVAILABLE';
  evalResults.agenticReview = {
    status: evalResults.agenticReviewStatus,
    model: guardrailResult.model || null,
    recoveryEvents: guardrailResult.recoveryEvents || [],
    error: guardrailResult.error || null,
    durationMs: guardrailResult.durationMs || Date.now() - tGuardrailStart,
    executedToolCalls: guardrailResult.executedToolCalls || []
  };
  if (!JSON_MODE) {
    console.log('Agentic review response (inspect for errors; response is not a verification badge):');
    console.log(guardrailResult.text || guardrailResult.error);
  }
  evalResults.agenticExplanation = guardrailResult.text || null;
  stage4GuardrailMs = Math.max(Date.now() - tGuardrailStart, 1);

  const MAX_GUARDRAIL_RETRIES = 1;
  let guardrailRetries = 0;
  const hasNewGuardrailRules = guardrailResult.activatedDeltaCount > 0
    || (Array.isArray(guardrailResult.proposedSubstitutions) && guardrailResult.proposedSubstitutions.length > 0);
  if (hasNewGuardrailRules && guardrailRetries < MAX_GUARDRAIL_RETRIES) {
    guardrailRetries++;
    evalResults.guardrailRetries = guardrailRetries;
    if (!JSON_MODE) console.log(`\n🔄 Auto-retrying physical evaluation after autonomously learning ${guardrailResult.activatedDeltaCount || 0} new rule(s) (attempt ${guardrailRetries}/${MAX_GUARDRAIL_RETRIES})...`);

    const { evaluateBOQMultiAspect } = require('../lib/boq/boq_evaluator.js');
    const retryResults = evaluateBOQMultiAspect(items, { filePath: inputFile || '', catalogData, targetDir: chassisDir });

    evalResults.errors = retryResults.errors;
    evalResults.warnings = retryResults.warnings;
    evalResults.missingDependencies = retryResults.missingDependencies;
    evalResults.confidence = retryResults.confidence;
    evalResults.mathDeductions = retryResults.mathDeductions;
    evalResults.conflictGraph = retryResults.conflictGraph;
    evalResults.aspectChecks = retryResults.aspectChecks;

    if (!JSON_MODE) console.log(`✅ Retry Complete. New Score: ${evalResults.confidence.score}`);
  }

  return stage4GuardrailMs;
}

// ============================================================
// Stage 4: Grounded Gemini Notebook Validation & Agentic Loop
// ============================================================
function _buildDeferredRagStatus(evalResults, tRagStart) {
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

function _buildNotebookLmStatus(ragResult, stage3RAGMs, ragDurationFormatted) {
  const src = ragResult.source || '';
  const citations = ragResult.citations || [];
  return {
    source: ragResult.source,
    sourcesUsed: ragResult.sourcesUsed || [],
    citationsCount: citations.length,
    fallbackReason: ragResult.fallbackReason || null,
    groundingVerification: ragResult.groundingVerification || 'UNVERIFIED',
    groundingTier: ragResult.groundingTier || (ragResult.isCloudGrounded ? 'TIER_1_LIVE_CLOUD_GROUNDED' : 'TIER_2_UNCITED_ADVISORY'),
    isFallback: src.includes('FALLBACK') || src.includes('LOCAL'),
    isCloudGrounded: Boolean(ragResult.isCloudGrounded && citations.length > 0 && ragResult.groundingVerification !== 'REJECTED_FORBIDDEN_SOURCE'),
    cached: ragResult.cached || false,
    latencyMs: ragResult.latencyMs || stage3RAGMs,
    timeTaken: ragDurationFormatted
  };
}

function _resolveRagChassisLabel(catalogData, chassisDetection, detectedChassisName) {
  return catalogData?.metadata?.chassis || chassisDetection?.detectedVariant?.model || detectedChassisName;
}

async function executeGroundedRagValidation(ctx) {
  const { items, evalResults, notebookId, catalogData, chassisDetection, detectedChassisName, chassisDir, OFFLINE_MODE, JSON_MODE, inputFile } = ctx;

  const tRagStart = Date.now();
  emitProgress(8, 10, 'Preparing evidence review', 'in_progress', 'Preparing the validation evidence.', { stage: 'POST_VERIFICATION' });

  const ragPayload = formatNotebookQueryPayload(items, evalResults, evalResults.conflictGraph ? evalResults.conflictGraph.rankedSolutions : []);
  const isOffline = Boolean(OFFLINE_MODE || ctx.effectivePolicy?.offline || evalResults.effectivePolicy?.offline);

  if (!isOffline && ctx.DEFER_RAG) {
    return _buildDeferredRagStatus(evalResults, tRagStart);
  }

  emitProgress(9, 10, isOffline ? 'Reviewing local evidence' : 'Reviewing QuickSpecs in NotebookLM',
    'in_progress', '', { stage: 'POST_VERIFICATION' });
  let ragResult;
  if (isOffline) {
    const { queryLocalKnowledgeBase } = require('../lib/rag/local_rag_search.js');
    const localRes = queryLocalKnowledgeBase(ragPayload, _resolveRagChassisLabel(catalogData, chassisDetection, detectedChassisName));
    const policyReason = ctx.effectivePolicy?.serverEnforced || evalResults.effectivePolicy?.serverEnforced
      ? 'Local evaluation mode enforced by server (OFFLINE_MODE/LOCAL_EVAL_ONLY/USE_LOCAL_RAG_ONLY)'
      : 'Offline evaluation mode requested in options';
    ragResult = {
      ...localRes,
      source: 'LOCAL_RAG_FALLBACK',
      isCloudGrounded: false,
      groundingVerification: 'UNVERIFIED',
      groundingTier: 'TIER_2_VERIFIED_LOCAL_SAFETY_NET',
      fallbackReason: policyReason
    };
  } else {
    ragResult = await executeNotebookQuery(notebookId, ragPayload, {
      context: {
        chassis: _resolveRagChassisLabel(catalogData, chassisDetection, detectedChassisName),
        skus: items.map(i => i.sku).filter(Boolean),
        items: items
      },
      onAttempt: attempt => { evalResults.notebookQueryRecovery = attempt; ctx.onQueryAttempt?.(attempt); },
      offline: false,
      offlineMode: false,
      effectivePolicy: ctx.effectivePolicy || evalResults.effectivePolicy || null,
      timeout: parseInt(process.env.RAG_TIMEOUT_MS || '600000', 10),
      queryTimeoutMs: ctx.queryTimeoutMs,
      deadlineAt: ctx.deadlineAt,
      signal: ctx.signal
    });
  }
  delete evalResults.notebookQueryRecovery;
  if (ragResult.queryAttempt) evalResults.notebookQueryAttempt = ragResult.queryAttempt;
  const stage3RAGMs = Math.max(Date.now() - tRagStart, 1);
  const ragDurationFormatted = ragResult.timeTaken || `${Math.floor(stage3RAGMs / 60000)}m ${Math.floor((stage3RAGMs % 60000) / 1000)}s (${stage3RAGMs}ms)`;

  evalResults.status = 'LOCAL_COMPLETE';
  evalResults.cloudGroundingStatus = ragResult.isCloudGrounded ? 'CLOUD_VERIFIED' : ((ragResult.source || '').includes('LOCAL') ? 'LOCAL_FALLBACK' : 'CLOUD_FAILED');
  evalResults.notebookLmStatus = _buildNotebookLmStatus(ragResult, stage3RAGMs, ragDurationFormatted);

  if (!JSON_MODE) {
    console.log(`⏱️ NotebookLM Synthesis Duration: ${ragDurationFormatted} (Source: ${ragResult.source})`);
  }

  if (ragResult.warning) {
    evalResults.warnings.push(ragResult.warning);
  }

  _detectOpinionDiscrepancy(evalResults, ragResult);

  if (evalResults.notebookLmStatus.isFallback && !evalResults.notebookLmStatus.cached) {
    const fallbackWarning = `⚠️ NotebookLM Cloud was NOT consulted — used local RAG fallback (Reason: ${ragResult.fallbackReason || 'NLM CLI timeout or unavailable'}). Verify critical dependencies manually or re-run with longer RAG_TIMEOUT_MS.`;
    evalResults.warnings.push(fallbackWarning);
    if (!JSON_MODE) console.log(`\n${fallbackWarning}`);
  }
  evalResults.ragResult = ragResult;
  evalResults.ragAnswer = ragResult.answer || '';

  _evaluateRagGroundingAndViolations(evalResults, ragResult);
  _extractVerifiedKnowledgeDeltas(evalResults, ragResult, chassisDir, catalogData);

  const ragAnswer = _formatRagAnswerText(ragResult, ragDurationFormatted, evalResults);
  const stage4GuardrailMs = await _executeAgenticGuardrailReview(items, chassisDir, inputFile || ctx.inputFile, evalResults, isOffline, JSON_MODE, catalogData);

  return { ragResult, ragAnswer, stage3RAGMs, stage4GuardrailMs };
}
// ============================================================
// Stage 5: Strategic Synthesis & Output Serialization (Delegated to eval_output_serializer.js)
// ============================================================

function applyLearnedRAGDeltasIfPresent(evalResults, graph, ingestCtx, options, ragResult) {
  if (!evalResults.learnedDeltasCount || options.DEFER_RAG || !ragResult) return;
  emitProgress(9, 10, 'Rechecking with grounded evidence', 'in_progress', 'Recomputing hardware checks and candidate rankings.', { stage: 'POST_VERIFICATION' });
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
  emitProgress(9, 10, 'Checking candidate evidence', 'in_progress', 'Validating the ranked solution sheets.', { stage: 'POST_VERIFICATION' });
  try {
    const result = await validateSolutionWithEphemeralSource(evalResults, {
      notebookId: ingestCtx.notebookId,
      chassisName: ingestCtx.detectedChassisName || ingestCtx.chassisPrefix,
      targetDir: ingestCtx.chassisDir,
      isMock: options.OFFLINE_MODE,
      signal: options.signal,
      timeoutMs: options.timeoutMs ?? options.queryTimeoutMs,
      queryTimeoutMs: options.queryTimeoutMs ?? options.timeoutMs,
      deadlineAt: options.deadlineAt
    });
    if (result) {
      evalResults.solutionDoubleCheck = {
        status: result.doubleCheckVerdict || (result.isCloudGrounded ? 'DOUBLE_CHECK_PASSED' : (result.isMock ? 'OFFLINE_MOCK_VERIFIED' : 'LOCAL_RULES_PASSED')),
        verdict: result.doubleCheckVerdict,
        sourceId: result.sourceId,
        citationsCount: (result.citations || []).length,
        extractedDeltasCount: (result.extractedDeltas || []).length,
        ...(result.queryRecovery ? { queryRecovery: result.queryRecovery } : {})
      };
    }
    return result;
  } catch (ephErr) {
    const recovery = require('../lib/notebook/query_attempt_record.js').getNotebookQueryRecovery?.(ephErr, options.signal);
    if (recovery) { evalResults.notebookQueryRecovery = recovery; throw ephErr; }
    if ((options.signal?.aborted && Object.is(ephErr, options.signal.reason)) || ephErr?.code === 'NOTEBOOK_QUERY_DEADLINE_EXCEEDED') throw ephErr;
    const _logger = require('../lib/system/pipeline_logger.js');
    _logger.warn('EVAL_BOQ', `Ephemeral source validation note: ${ephErr.message}`);
    return null;
  }
}

// ============================================================
// Stage 7: Continuous Learning Reflection & Self-Reinforcement
// ============================================================
function executeContinuousLearningReflection(evidenceLedger, ingestCtx, evalResults, _options) {
  const chassisDir = ingestCtx.chassisDir;
  terminalOwner.recordReflectionTarget(evidenceLedger, chassisDir);
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
          terminalOwner.recordReflectionProposal(evidenceLedger, cert);
          if (cert && cert.persisted) {
            learnedCount++;
            existingPairings.add(pairKey);
            evidenceLedger.recordSkuAudit(dep.sku, 'LEARNING_PROPOSED', delta.ruleUpdate, delta.deltaId, 'Mandatory dependency proposal', { status: 'PENDING' });
          }
        } catch (learnErr) {
          terminalOwner.recordReflectionFailure(evidenceLedger);
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
  require('../lib/system/execution_budget.js').assertCallerActive(options, Date.now());
  return observeActualInvocation('runEvaluationPipeline', __filename, () => runWithTrace(options.traceId, () => {
    associateCanonicalTrace();
    return runEvaluationPipelineWithinTrace(options);
  }));
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
  evidenceLedger.customerInput.serverCount = options.serverCount !== undefined ? options.serverCount : (ingestCtx.serverCount || 1);
  evidenceLedger.sharedState.nodeMultiplier = options.serverCount !== undefined ? options.serverCount : (ingestCtx.serverCount || 1);
  if (options.parentRunId) evidenceLedger.sharedState.parentRunId = options.parentRunId;
  if (options.candidateDigest) evidenceLedger.sharedState.candidateDigest = options.candidateDigest;
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
    evidenceLedger.recordWorkflowFailure(error);
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

function _findClicCorrectedCandidate(evalResults) {
  return evalResults.conflictGraph?.rankedSolutions?.find(
    candidate => candidate.portalValidationStatus === 'CLIC_ACCEPTED' && candidate.portalReceipt && candidate.physicalMathClean && candidate.removedSkus?.length
  ) || null;
}

function _isApplicableAspectPassing(aspect, correctedCandidate) {
  if (aspect.status === 'PASS' || aspect.status === 'NOT_APPLICABLE') return true;
  return Boolean(correctedCandidate && aspect.name === 'Bundled Optics Billing' && aspect.status === 'WARN');
}

function _logAspectPhaseChecklist(evalResults) {
  const PipelineLogger = require('../lib/system/pipeline_logger.js');
  const aspectItems = (evalResults.aspectChecks || []).map(a => ({
    status: a.status || (a.checked ? 'PASS' : 'FAIL'),
    label: `${a.name || a.id}: ${a.detail || ''}`,
    formula: a.formula || a.equation || null,
    operands: a.operands || null
  }));
  PipelineLogger.checklist(3, '7-Aspect Physical Pre-Flight Math', aspectItems);
}

function _recordAspectPhaseEvidence(evidenceLedger, evalResults, ingestCtx, options) {
  for (const dep of (evalResults.missingDependencies || [])) {
    evidenceLedger.recordActiveRuleReached({
      ruleId: dep.ruleId || 'PHYSICAL_ASPECT_DEP',
      ruleType: dep.category || 'MISSING_DEPENDENCY',
      chassis: path.basename(ingestCtx.chassisDir),
      affectedSku: dep.affectedSku || null,
      targetSku: dep.sku,
      reasoning: dep.reason || '',
      scopeTaxonomy: 'CHASSIS_SPECIFIC'
    });
  }
  const correctedCandidate = _findClicCorrectedCandidate(evalResults);
  const aspects = evalResults.aspectChecks || [];
  const applicableAspectsPassed = aspects.length > 0 && aspects.every(a => _isApplicableAspectPassing(a, correctedCandidate));
  const noMissingDeps = !evalResults.missingDependencies || evalResults.missingDependencies.length === 0;
  const aspectPhaseStatus = (evalResults.isMathClean === true && applicableAspectsPassed && noMissingDeps) ? 'PASSED' : 'ACTION_REQUIRED';

  evidenceLedger.completePhase(3, aspectPhaseStatus, {
    missingDependencies: evalResults.missingDependencies?.length || 0,
    aspectPassCount: aspects.filter(a => a.status === 'PASS').length,
    baselineWarningsResolvedByCandidate: correctedCandidate ? {
      rank: correctedCandidate.rank,
      removedSkus: correctedCandidate.removedSkus,
      receiptAt: correctedCandidate.portalReceipt.capturedAt
    } : null
  }, aspects);

  if (!options.JSON_MODE) {
    _logAspectPhaseChecklist(evalResults);
  }
}

function _recordCandidateValidationsEvidence(evidenceLedger, evalResults, ingestCtx) {
  const candidateValidations = (evalResults.conflictGraph?.rankedSolutions || []).map(candidate => ({
    rank: candidate.rank,
    name: candidate.name,
    rationale: candidate.reasoning,
    manifest: candidate.skuPartsList,
    delta: candidateDelta(ingestCtx.items, candidate),
    finalValidation: candidate.finalValidation,
    buildabilityStatus: candidate.buildabilityStatus
  }));
  evidenceLedger.recordCandidateAttempt({ candidateValidations, manifestSha256: solutionFingerprint(evalResults),
    candidateGate: evalResults.adversarialGateResult });
}

function _executePhase4And5(options, evidenceLedger, graph, activeRules) {
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
  const modCount = activeRules.generationalModernizations ? activeRules.generationalModernizations.length : 0;
  const hasModernizations = Array.isArray(graph?.modernizations) && graph.modernizations.length > 0;
  const hasLeastDelta = Boolean(graph?.leastDeltaCandidate || graph?.tradeoffMatrix?.trigger);
  const phase5Status = (modCount > 0 || hasModernizations || hasLeastDelta) ? 'PASSED' : 'SKIPPED';
  const phase5Summary = {
    activeModernizationCount: modCount,
    hasModernizations,
    hasLeastDelta
  };
  if (phase5Status === 'SKIPPED') {
    phase5Summary.skipReason = 'No generational modernizations or least-delta alternatives required for this clean BOM';
    phase5Summary.policyCode = 'INV-105_NO_MODERNIZATION_REQUIRED';
  }
  evidenceLedger.completePhase(5, phase5Status, phase5Summary);
  if (!options.JSON_MODE) {
    const PipelineLogger = require('../lib/system/pipeline_logger.js');
    PipelineLogger.checklist(5, 'Generational Modernization & Least-Delta Combinator', [
      { status: phase5Status === 'PASSED' ? 'PASS' : 'SKIP', label: `Platform modernization evaluated (${modCount} rules checked)` },
      { status: hasLeastDelta ? 'PASS' : 'SKIP', label: hasLeastDelta ? 'Least-delta minimal mutation alternative synthesized' : 'No troublesome SKU mutations needed' }
    ]);
  }
}

function _revalidateAndRankCandidates(evalResults, ingestCtx, evidenceLedger) {
  for (const candidate of evalResults.conflictGraph?.rankedSolutions || []) {
    const perNodeParts = (candidate.skuPartsList || []).filter(item => item.quantityScope !== 'global');
    const checked = evaluatePhysicalMath(perNodeParts, ingestCtx.catalogData, ingestCtx.chassisDir, { skipSynthesis: true });
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
  if (typeof evidenceLedger.recordCandidateAttempt === 'function') {
    evidenceLedger.recordCandidateAttempt({
      kind: 'DETERMINISTIC_FINAL_CANDIDATE_REVALIDATION',
      manifestSha256: solutionFingerprint(evalResults),
      passed: evalResults.adversarialGateResult.passed
    });
  }
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
}

async function _handleBoqIngestionPhase(ctx, options, evidenceLedger) {
  emitProgress(1, 10, 'Reading the BOQ', 'in_progress', 'Parsing intake and workload requirements.', { stage: 'LOAD' });
  evidenceLedger.startPhase(1, 'Intake, Ingestion & CTO Normalization', { boqFile: options.inputFile || options.BOQ_FILE });
  const ingestCtx = await ingestAndConsolidateBoq(options);
  emitProgress(2, 10, 'Resolving the platform', 'in_progress', `Identified platform: ${path.basename(ingestCtx.chassisDir || 'Unknown')} (${ingestCtx.items.length} items parsed)`, { stage: 'CLEANING' });
  if (ingestCtx.chassisDir) {
    evidenceLedger.updateTargetChassis(path.basename(ingestCtx.chassisDir), ingestCtx.chassisDir);
    evidenceLedger.recordArtifact('CATALOG', path.join(ingestCtx.chassisDir, `${path.basename(ingestCtx.chassisDir)}_Catalog.json`));
    evidenceLedger.recordArtifact('CATALOG_RULES', path.join(ingestCtx.chassisDir, `${path.basename(ingestCtx.chassisDir)}_Catalog_Rules.json`));
  }
  evidenceLedger.customerInput.totalRequestedLines = ingestCtx.items.length;
  evidenceLedger.customerInput.serverCount = options.serverCount !== undefined ? options.serverCount : (ingestCtx.serverCount || 1);
  evidenceLedger.sharedState.nodeMultiplier = options.serverCount !== undefined ? options.serverCount : (ingestCtx.serverCount || 1);
  if (options.parentRunId) evidenceLedger.sharedState.parentRunId = options.parentRunId;
  if (options.candidateDigest) evidenceLedger.sharedState.candidateDigest = options.candidateDigest;
  ingestCtx.items.forEach(item => evidenceLedger.recordSkuAudit(item.sku, 'NORMALIZED_INPUT', 'Parsed customer input; this record does not certify compatibility.', null, item.category, { quantity: item.quantity }));
  evidenceLedger.completePhase(1, 'PASSED', {
    itemsCount: ingestCtx.items.length,
    chassisDir: ingestCtx.chassisDir,
    nodeMultiplier: ingestCtx.serverCount || 1,
    chassisSelection: ingestCtx.chassisDetection,
    ocr: ingestCtx.ocrMetadata,
    catalogAudit: ingestCtx.catalogAudit
  });
  ctx.ingestCtx = ingestCtx;
  return {
    status: 'PASSED',
    summary: { itemsCount: ingestCtx.items.length, chassisDir: ingestCtx.chassisDir },
    checks: [
      { status: 'PASS', label: `BOQ parsed successfully (${ingestCtx.items.length} hardware items)` },
      { status: !ingestCtx.chassisDetection?.unknown ? 'PASS' : 'WARN', label: `Chassis identified: ${path.basename(ingestCtx.chassisDir || 'Unknown')}` },
      { status: 'PASS', label: `CTO multiplier normalized: ${ingestCtx.serverCount || 1} node(s)` }
    ]
  };
}

async function _handleBoqFingerprintingPhase(ctx, options, evidenceLedger) {
  emitProgress(3, 10, 'Loading catalog rules', 'in_progress', 'Loading hardware constraints for the selected product.', { stage: 'VALIDATION' });
  evidenceLedger.startPhase(2, 'Active Knowledge Routing & Discovery', { chassis: path.basename(ctx.ingestCtx.chassisDir) });
  const activeRules = loadActiveKnowledgeRules(path.basename(ctx.ingestCtx.chassisDir), ctx.ingestCtx.chassisDir);
  evidenceLedger.completePhase(2, 'PASSED', {
    totalRulesAvailable: activeRules.allRules.length,
    availableRuleIds: activeRules.allRules.map(r => r.ruleId || r.deltaId),
    modernizationsCount: activeRules.generationalModernizations.length,
    substitutionsCount: activeRules.substitutions.length,
    dependenciesCount: activeRules.mandatoryDependencies.length
  });
  ctx.activeRules = activeRules;
  return {
    status: 'PASSED',
    summary: { totalRulesAvailable: activeRules.allRules.length },
    checks: [
      { status: 'PASS', label: `Catalog rules loaded: ${activeRules.allRules.length} rules active` },
      { status: 'PASS', label: `Generational modernizations available: ${activeRules.generationalModernizations.length}` },
      { status: 'PASS', label: `Mandatory hardware dependencies: ${activeRules.mandatoryDependencies.length}` }
    ]
  };
}

async function _handleBoqDomainAspectsPhase(ctx, options, evidenceLedger) {
  emitProgress(4, 10, 'Checking hardware constraints', 'in_progress', '', { stage: 'VALIDATION' });
  evidenceLedger.startPhase(3, '7-Aspect Physical Pre-Flight Math', { itemCount: ctx.ingestCtx.items.length });
  const { evalResults, graph, queryPayload, stage2AspectMathMs } = executePhysicalPreChecks(
    ctx.ingestCtx.items, ctx.ingestCtx.catalogData, ctx.ingestCtx.chassisDir, options.JSON_MODE, ctx.ingestCtx.requirementResolution, ctx.ingestCtx.configurationContext
  );
  evalResults.offlineMode = Boolean(options.OFFLINE_MODE || options.effectivePolicy?.offline);
  if (options.effectivePolicy) evalResults.effectivePolicy = options.effectivePolicy;
  ctx.ingestCtx.items = evalResults.items || ctx.ingestCtx.items;
  ctx.evalResults = evalResults;
  ctx.graph = graph;
  ctx.queryPayload = queryPayload;
  ctx.stage2AspectMathMs = stage2AspectMathMs;
  _recordAspectPhaseEvidence(evidenceLedger, evalResults, ctx.ingestCtx, options);
  const aspectPhaseStatus = terminalOwner.requestedPhaseStatus(evidenceLedger, 3,
    evidenceLedger.phases?.phase_3?.status || (evalResults.isMathClean ? 'PASSED' : 'ACTION_REQUIRED'));
  return {
    status: aspectPhaseStatus,
    summary: { missingDependencies: evalResults.missingDependencies?.length || 0 },
    checks: (evalResults.aspectChecks || []).map(a => ({ status: a.status || (a.checked ? 'PASS' : 'FAIL'), label: `${a.name || a.id}: ${a.detail || ''}` }))
  };
}

async function _handleBoqConflictGraphPhase(ctx, options, evidenceLedger) {
  emitProgress(5, 10, 'Checking component conflicts', 'in_progress', '', { stage: 'VALIDATION' });
  evidenceLedger.startPhase(4, 'Conflict Graph & Contested Resource Arbitration', {});
  const phase4Passed = ctx.graph?.isWholeSolutionValid === true;
  evidenceLedger.completePhase(4, phase4Passed ? 'PASSED' : 'ACTION_REQUIRED', {
    conflicts: ctx.graph?.conflicts?.length || 0,
    hasContentions: Boolean(ctx.graph?.arbitrationResults?.hasContentions)
  });
  return {
    status: phase4Passed ? 'PASSED' : 'ACTION_REQUIRED',
    summary: { conflicts: ctx.graph?.conflicts?.length || 0 },
    checks: [
      { status: phase4Passed ? 'PASS' : 'WARN', label: `Cross-aspect conflict graph: ${ctx.graph?.conflicts?.length || 0} conflict(s)` },
      { status: !ctx.graph?.arbitrationResults?.hasContentions ? 'PASS' : 'WARN', label: `Contested slot arbitration: ${ctx.graph?.arbitrationResults?.hasContentions ? 'Contentions resolved' : 'Clean slot allocation'}` }
    ]
  };
}

async function _handleBoqModernizationPhase(ctx, options, evidenceLedger) {
  emitProgress(6, 10, 'Reviewing alternative configurations', 'in_progress', '', { stage: 'RANKING' });
  evidenceLedger.startPhase(5, 'Generational Modernization & Least-Delta Combinator', {});
  const modCount = ctx.activeRules?.generationalModernizations ? ctx.activeRules.generationalModernizations.length : 0;
  const hasModernizations = Array.isArray(ctx.graph?.modernizations) && ctx.graph.modernizations.length > 0;
  const hasLeastDelta = Boolean(ctx.graph?.leastDeltaCandidate || ctx.graph?.tradeoffMatrix?.trigger);
  const phase5Status = (modCount > 0 || hasModernizations || hasLeastDelta) ? 'PASSED' : 'SKIPPED';
  const phase5Summary = {
    activeModernizationCount: modCount,
    hasModernizations,
    hasLeastDelta,
    skipReason: phase5Status === 'SKIPPED' ? 'No generational modernizations or least-delta alternatives required for this clean BOM' : undefined,
    policyCode: phase5Status === 'SKIPPED' ? 'INV-105_NO_MODERNIZATION_REQUIRED' : undefined
  };
  evidenceLedger.completePhase(5, phase5Status, phase5Summary);
  return {
    status: phase5Status,
    summary: phase5Summary,
    checks: [
      { status: phase5Status === 'PASSED' ? 'PASS' : 'SKIP', label: `Platform modernization evaluated (${modCount} rules checked)` },
      { status: hasLeastDelta ? 'PASS' : 'SKIP', label: hasLeastDelta ? 'Least-delta minimal mutation alternative synthesized' : 'No troublesome SKU mutations needed' }
    ]
  };
}

async function _handleBoqStrategySynthesisPhase(ctx, options, evidenceLedger) {
  evidenceLedger.startPhase(6, '5-Tier Strategy Matrix Synthesis', {});
  const tMatrixStart = Date.now();
  emitProgress(7, 10, 'Checking budget and pricing', 'in_progress', 'Evaluating cost tradeoffs and price availability.', { stage: 'RANKING' });
  const budgetOpt = optimizeForBudget(ctx.ingestCtx.items, ctx.evalResults, options.targetBudgetUsd, ctx.ingestCtx.catalogData, ctx.ingestCtx.chassisDir);
  ctx.evalResults.budgetOptimization = budgetOpt;
  ctx.budgetOpt = budgetOpt;
  ctx.stage5MatrixMs = Math.max(Date.now() - tMatrixStart, 1);
  const confidenceScore = ctx.evalResults.confidence?.score ?? 1.0;
  const isLowConfidence = confidenceScore < 0.55 || Boolean(ctx.evalResults.confidence?.isHitlTriggered);
  if (isLowConfidence) {
    for (const candidate of ctx.evalResults.conflictGraph?.rankedSolutions || []) {
      candidate.advisoryStatus = 'LOW_CONFIDENCE_ADVISORY';
    }
  }
  const ranks = ctx.evalResults.conflictGraph?.rankedSolutions || [];
  const phase6Passed = !isLowConfidence && ranks.length > 0;
  evidenceLedger.completePhase(6, phase6Passed ? 'PASSED' : 'ACTION_REQUIRED', {
    ranksProduced: ranks.length,
    budgetCapEx: budgetOpt?.hasZeroPriceSkus ? null : budgetOpt?.mandatoryBomCostUsd ?? null,
    confidenceScore,
    isLowConfidence
  });
  return {
    status: phase6Passed ? 'PASSED' : 'ACTION_REQUIRED',
    summary: { ranksProduced: ranks.length, isLowConfidence },
    checks: [
      { status: ranks.length > 0 ? 'PASS' : 'WARN', label: `Strategy tiers synthesized: ${ranks.length} candidate solutions` },
      { status: !isLowConfidence ? 'PASS' : 'WARN', label: `Confidence evaluation score: ${(confidenceScore * 100).toFixed(1)}%` },
      { status: budgetOpt?.hasZeroPriceSkus ? 'WARN' : 'PASS', label: `Order-level ${budgetOpt?.hasZeroPriceSkus ? 'known-price subtotal (INCOMPLETE)' : 'CapEx'}: ${(budgetOpt?.mandatoryBomCostUsd || 0).toLocaleString()} USD` }
    ]
  };
}

function _recordPhase7ResolutionsAndAudits(ctx, evidenceLedger, ephemeralSourceResult) {
  if (ephemeralSourceResult?.success) {
    for (const phaseNumber of [3, 4]) {
      const phase = evidenceLedger.phases[`phase_${phaseNumber}`];
      if (phase.status === 'ACTION_REQUIRED' && ctx.evalResults.adversarialGatePassed === true) {
        evidenceLedger.recordPhaseResolution(phaseNumber, {
          manifestSha256: solutionFingerprint(ctx.evalResults),
          candidateGatePassed: true,
          documentReviewVerified: true,
          resolvedBy: 'Final physical candidate validation and cited candidate review in phase 7'
        });
      }
    }
  }
  for (const candidate of ctx.evalResults.conflictGraph?.rankedSolutions || []) {
    for (const part of candidate.skuPartsList || []) {
      const actionType = part.isFixInjected ? 'PROPOSED_FIX' : 'CANDIDATE_COMPONENT';
      const detail = part.reason || candidate.reasoning || 'Candidate manifest; consult validation verdict.';
      evidenceLedger.recordSkuAudit(part.sku, actionType, detail, part.ruleId || null, part.category, {
        rank: candidate.rank,
        quantity: part.quantity,
        physicalMathClean: candidate.physicalMathClean
      });
    }
  }
}

function _buildRagGroundingPhaseChecks(ctx, options) {
  const nlmStatus = ctx.evalResults.notebookLmStatus || {};
  const groundingCheckStatus = nlmStatus.isCloudGrounded ? 'PASS' : (options.OFFLINE_MODE ? 'SKIP' : 'WARN');
  const citationsCount = nlmStatus.citationsCount || 0;
  const discrepanciesCount = (ctx.evalResults.opinionDiscrepancies || []).length;
  return [
    { status: groundingCheckStatus, label: `Grounding source: ${nlmStatus.source || 'N/A'}` },
    { status: citationsCount > 0 ? 'PASS' : 'WARN', label: `QuickSpecs document citations: ${citationsCount} citations` },
    { status: discrepanciesCount === 0 ? 'PASS' : 'WARN', label: `Dual-Brain consensus: ${discrepanciesCount} opinion discrepancies` }
  ];
}

async function _handleBoqRagGroundingPhase(ctx, options, evidenceLedger) {
  evidenceLedger.startPhase(7, 'Gemini NotebookLM Grounding & Dual-Brain Verification', {});
  let quickSpecs = { status: 'NOT_RUN_OFFLINE_OR_DEFERRED' };
  if (!options.OFFLINE_MODE && !options.DEFER_RAG && ctx.ingestCtx.notebookId) {
    const { verifyNotebookQuickSpecs } = require('../lib/sync/quickspecs_sync');
    quickSpecs = await verifyNotebookQuickSpecs(path.basename(ctx.ingestCtx.chassisDir), { autoUpload: true, forcedNotebookId: ctx.ingestCtx.notebookId });
  }
  ctx.evalResults.quickSpecsVerification = quickSpecs;
  const sourceReady = quickSpecs.status === 'CERTIFIED_GROUNDED';
  const { ragResult, ragAnswer, stage3RAGMs, stage4GuardrailMs } = await executeGroundedRagValidation({
    ...ctx.ingestCtx,
    evalResults: ctx.evalResults,
    OFFLINE_MODE: options.OFFLINE_MODE || (!options.DEFER_RAG && !sourceReady),
    effectivePolicy: options.effectivePolicy || ctx.evalResults.effectivePolicy || null,
    JSON_MODE: options.JSON_MODE,
    SYNC_RAG: options.SYNC_RAG,
    DEFER_RAG: options.DEFER_RAG,
    queryTimeoutMs: options.queryTimeoutMs,
    deadlineAt: options.deadlineAt,
    signal: options.signal,
    onQueryAttempt: attempt => {
      const phase = evidenceLedger.phases.phase_7;
      phase.outputSummary = { ...phase.outputSummary, queryAttempt: attempt };
    }
  });
  ctx.ragResult = ragResult;
  ctx.ragAnswer = ragAnswer;
  ctx.stage3RAGMs = stage3RAGMs;
  ctx.stage4GuardrailMs = stage4GuardrailMs;
  if (ragResult) {
    evidenceLedger.recordNotebookLmTrace(ctx.queryPayload, ragResult, ragResult?.citations || []);
  }
  evidenceLedger.phases.phase_7.outputSummary = {
    primaryRag: {
      verified: evidenceLedger.sharedState.dualBrainVerified,
      citationsCount: ragResult?.citations?.length || 0,
      quickSpecs
    }
  };

  applyLearnedRAGDeltasIfPresent(ctx.evalResults, ctx.graph, ctx.ingestCtx, options, ragResult);
  _revalidateAndRankCandidates(ctx.evalResults, ctx.ingestCtx, evidenceLedger);

  const ephemeralSourceResult = sourceReady ? await executeEphemeralSourceValidation(options, ctx.ingestCtx, ctx.evalResults) : null;
  if (ephemeralSourceResult) {
    ctx.evalResults.ephemeralSourceValidation = ephemeralSourceResult;
    const ephVerdict = ephemeralSourceResult.success ? 'VERIFIED_GROUNDED' : 'ACTION_REQUIRED';
    evidenceLedger.recordNotebookLmTrace(ephemeralSourceResult.queryPayload, ephemeralSourceResult, ephemeralSourceResult.citations || [], ephVerdict);
  }
  evidenceLedger.phases.phase_7.outputSummary.solutionSourceValidation = ephemeralSourceResult || { status: 'NOT_RUN' };
  evidenceLedger.phases.phase_7.outputSummary.agenticReview = ctx.evalResults.agenticReview || { status: 'NOT_RUN' };
  evidenceLedger.sharedState.dualBrainVerified = ephemeralSourceResult?.success === true;
  const phase7Status = ephemeralSourceResult?.success ? 'PASSED' : 'ACTION_REQUIRED';
  evidenceLedger.completePhase(7, phase7Status, evidenceLedger.phases.phase_7.outputSummary);
  _recordPhase7ResolutionsAndAudits(ctx, evidenceLedger, ephemeralSourceResult);

  return {
    status: phase7Status,
    summary: evidenceLedger.phases.phase_7.outputSummary,
    checks: _buildRagGroundingPhaseChecks(ctx, options)
  };
}

function _prepareNotebookDeliveryHealth(ctx) {
  ctx.evalResults.notebookHealth = ctx.ingestCtx.notebookHealth || null;
  ctx.evalResults.notebookDegradedMode = ctx.ingestCtx.notebookDegradedMode || null;
  if (ctx.ingestCtx.notebookHealth && !ctx.ingestCtx.notebookHealth.isHealthy) {
    if (!ctx.evalResults.warnings) ctx.evalResults.warnings = [];
    ctx.evalResults.warnings.push(`[DEGRADED_NOTEBOOK] Notebook for "${ctx.ingestCtx.detectedChassisName}" is degraded (${ctx.ingestCtx.notebookDegradedMode}). Confidence: ${ctx.ingestCtx.notebookHealth.confidenceLabel}.`);
  }
}

function _promoteTerminalPriceDrift(ctx, options) {
  if (Array.isArray(options.priceDriftItems) && options.priceDriftItems.length) {
    ctx.evalResults.priceDriftResult = require('../lib/feedback/feedback_loop.js').promotePriceDriftDeltas(ctx.ingestCtx.chassisDir, options.priceDriftItems, options.priceDriftMetadata || {});
  }

}

function _runLegacyDeliverablesPrelude(ctx, options, evidenceLedger) {
  const newLearningsCount = executeContinuousLearningReflection(evidenceLedger, ctx.ingestCtx, ctx.evalResults, options);
  ctx.evalResults.newLearningsCount = newLearningsCount;
  _prepareNotebookDeliveryHealth(ctx);
  _promoteTerminalPriceDrift(ctx, options);
}

function _assignDeliverablesScope(ctx, options) {
  const dirBase = ctx.ingestCtx.chassisDir ? path.basename(ctx.ingestCtx.chassisDir) : '';
  const targetChassis = ctx.ingestCtx.chassisPrefix || dirBase || ctx.evalResults.chassis || ctx.ingestCtx.detectedChassisName || 'PROLIANT_SERVER';
  const resolvedServerCount = ctx.ingestCtx.serverCount || options.serverCount || ctx.evalResults.configurationContext?.multiplier || 1;
  ctx.evalResults.chassis = targetChassis;
  ctx.evalResults.serverCount = resolvedServerCount;
  ctx.evalResults.nodeCount = ctx.ingestCtx.nodeCount || resolvedServerCount;
  ctx.evalResults.quantityBasis = ctx.ingestCtx.quantityBasis || (resolvedServerCount > 1 ? 'CLUSTER_MULTIPLIED' : 'SINGLE_NODE');
  if (ctx.ingestCtx.parentRunId || options.parentRunId) ctx.evalResults.parentRunId = ctx.ingestCtx.parentRunId || options.parentRunId;
  if (ctx.ingestCtx.candidateDigest || options.candidateDigest) ctx.evalResults.candidateDigest = ctx.ingestCtx.candidateDigest || options.candidateDigest;
  if (ctx.ingestCtx.candidateReference || options.candidateReference) ctx.evalResults.candidateReference = ctx.ingestCtx.candidateReference || options.candidateReference;
  return targetChassis;
}

function _applyAcceptanceDeliveryState(ctx, options, acceptance, targetChassis) {
  if (acceptance.isValid) {
    const { deliveryFingerprint } = require('../lib/boq/solution_evidence.js');
    const { issueDeliveryAuthorization } = require('../lib/contracts/workflow_contract.js');
    const rawFingerprint = deliveryFingerprint(ctx.evalResults);
    ctx.evalResults.manifestFingerprint = rawFingerprint;
    try {
      ctx.evalResults.deliveryAuthorization = issueDeliveryAuthorization({
        manifestFingerprint: rawFingerprint,
        chassisKey: targetChassis,
        acceptanceDecision: {
          isApproved: true,
          profile: 'BOQ_EVALUATION',
          evaluatedChecksCount: acceptance.totalChecks,
          passedChecks: acceptance.checks.filter(c => c.passed).map(c => c.id),
          failedChecks: acceptance.blockers.map(b => b.id),
          blockingErrors: acceptance.blockers.map(b => b.detail),
          warnings: acceptance.warnings.map(w => w.detail)
        }
      });
    } catch (authErr) {
      ctx.evalResults.deliveryAuthError = authErr.message;
      require('../lib/system/pipeline_logger.js').warn('EVAL_BOQ', `Delivery authorization issuance deferred: ${authErr.message}`);
    }
    ctx.evalResults.customerDisposition = 'VALIDATION_REQUIRED';
    return;
  }

  ctx.evalResults.customerDisposition = ctx.evalResults.isMathClean === false ? 'DELIVERY_BLOCKED_UNBUILDABLE' : 'VALIDATION_REQUIRED';
  if (!ctx.evalResults.deliveryAuthError && acceptance.blockersCount > 0) {
    ctx.evalResults.deliveryAuthError = `Pre-presentation acceptance failed with ${acceptance.blockersCount} blocker(s): ${acceptance.blockers.map(b => b.name || b.id).join(', ')}`;
  }
  if (ctx.evalResults.customerDisposition !== 'DELIVERY_BLOCKED_UNBUILDABLE') return;
  try {
    const { generateCounterfactualRepairProofs } = require('../lib/system/counterfactual_repair.js');
    ctx.evalResults.counterfactualRepairProofs = generateCounterfactualRepairProofs(ctx.evalResults, { ...options, ...ctx.ingestCtx });
  } catch (cfErr) {
    ctx.evalResults.counterfactualRepairProofs = [{
      issueType: 'REPAIR_EXECUTION_ERROR',
      rootCause: cfErr.message,
      requiredHardwareDeltas: [],
      requiredAction: { action: 'RESOLVE_SCOPED_CONSTRAINT', category: 'ENGINEERING_DIAGNOSTIC' },
      mathematicalProof: `Counterfactual repair engine encountered an execution error: ${cfErr.message}`,
      resultingStatus: 'ACTION_REQUIRED'
    }];
  }
}

async function _handleBoqDeliverablesPhase(ctx, options, evidenceLedger, startTime) {
  emitProgress(10, 10, 'Finalizing results and audit', 'in_progress', 'Recording the evaluation outcome and delivery eligibility.', { stage: 'SOLUTION_PRESENTATION' });
  evidenceLedger.startPhase(8, 'Multi-Rank Solution Deliverables & Excel Generation', {});
  Object.defineProperty(ctx.evalResults, 'evidenceLedger', { value: evidenceLedger, enumerable: false, configurable: true });

  terminalOwner.prepareDeliverables(ctx,
    () => _runLegacyDeliverablesPrelude(ctx, options, evidenceLedger),
    () => _prepareNotebookDeliveryHealth(ctx));

  const { verifyPrePresentationAcceptance } = require('../lib/boq/bom_verifier.js');
  const acceptance = verifyPrePresentationAcceptance(ctx.evalResults, 'BOQ_EVALUATION', {
    ...options,
    ...ctx.ingestCtx,
    catalogData: ctx.ingestCtx.catalogData || options.catalogData
  });
  ctx.evalResults.acceptanceGate = acceptance;
  const targetChassis = _assignDeliverablesScope(ctx, options);
  _applyAcceptanceDeliveryState(ctx, options, acceptance, targetChassis);

  await serializeAndExportResults(terminalOwner.serializerContext(ctx, {
    ...options,
    ...ctx.ingestCtx,
    evalResults: ctx.evalResults,
    graph: ctx.graph,
    ragAnswer: ctx.ragAnswer,
    budgetOpt: ctx.budgetOpt,
    queryPayload: ctx.queryPayload,
    startTime,
    stage2AspectMathMs: ctx.stage2AspectMathMs,
    stage3RAGMs: ctx.stage3RAGMs,
    stage4GuardrailMs: ctx.stage4GuardrailMs,
    stage5MatrixMs: ctx.stage5MatrixMs
  }));

  const exportOk = Boolean(ctx.evalResults.multiRankWorkbookPath && !ctx.evalResults.deliveryError);
  return terminalOwner.phase8Outcome(ctx, {
    status: exportOk ? 'PASSED' : 'ACTION_REQUIRED',
    summary: { multiRankWorkbookPath: ctx.evalResults.multiRankWorkbookPath, deliveryError: ctx.evalResults.deliveryError || null },
    checks: [
      { status: ctx.evalResults.multiRankWorkbookPath ? 'PASS' : 'WARN', label: `Multi-Rank Matrix (.xlsx): ${ctx.evalResults.multiRankWorkbookPath ? path.basename(ctx.evalResults.multiRankWorkbookPath) : 'Pending'}` },
      { status: ctx.evalResults.multiRankCsvPath ? 'PASS' : 'WARN', label: `Token-Dense CSV: ${ctx.evalResults.multiRankCsvPath ? path.basename(ctx.evalResults.multiRankCsvPath) : 'Pending'}` },
      { status: ctx.evalResults.portalWorkbookPath ? 'PASS' : 'WARN', label: `Partner Portal Sheet: ${ctx.evalResults.portalWorkbookPath ? path.basename(ctx.evalResults.portalWorkbookPath) : 'Pending'}` }
    ]
  });
}

async function _handleBoqReflectionPhase(ctx) {
  let reasoningAnalysis = null;
  let reflectionError = null;
  try {
    const { performReasoningPostAnalysis } = require('../lib/system/reasoning_post_analyzer.js');
    reasoningAnalysis = performReasoningPostAnalysis({
      queryText: ctx.options.inputFile || ctx.options.BOQ_FILE || 'BOQ_EVALUATION',
      context: ctx.options,
      classification: { intent: 'BOQ_EVALUATION', confidence: 1.0, rationale: 'Canonical Multi-Rank BOQ Evaluation' },
      responseData: ctx.evalResults,
      traceId: ctx.evalResults.traceId || ctx.evidenceLedger?.traceId,
      executionTimeMs: Date.now() - ctx.startTime,
      evidenceLedger: ctx.evidenceLedger
    });
    ctx.evalResults.reasoningAnalysis = reasoningAnalysis;
  } catch (err) {
    reflectionError = err;
    ctx.evalResults.reflectionError = err.message;
    if (typeof logger.warn === 'function') {
      logger.warn('EVAL_BOQ', `Post-evaluation reasoning analysis failed (INV-231): ${err?.message || err}`);
    }
  }

  if (reflectionError) {
    return {
      status: 'ACTION_REQUIRED',
      summary: {
        newLearningsCount: 0,
        evidenceLogPath: ctx.evalResults.evidenceLogPath || null,
        epistemicTier: 'UNKNOWN',
        error: reflectionError.message
      },
      checks: [
        { status: 'FAIL', label: `Knowledge reflection failed: ${reflectionError.message}` },
        { status: ctx.evalResults.evidenceLogPath ? 'PASS' : 'WARN', label: `Evidence ledger exported: ${ctx.evalResults.evidenceLogPath ? path.basename(ctx.evalResults.evidenceLogPath) : 'Pending'}` }
      ]
    };
  }

  return {
    status: 'PASSED',
    summary: {
      newLearningsCount: ctx.evalResults.newLearningsCount || 0,
      evidenceLogPath: ctx.evalResults.evidenceLogPath || null,
      epistemicTier: reasoningAnalysis?.epistemicIntegrity?.tier || 'TIER_1_PHYSICAL_SANITY'
    },
    checks: [
      { status: 'PASS', label: `Knowledge reflection complete (${ctx.evalResults.newLearningsCount || 0} new learnings evaluated)` },
      { status: ctx.evalResults.evidenceLogPath ? 'PASS' : 'WARN', label: `Evidence ledger exported: ${ctx.evalResults.evidenceLogPath ? path.basename(ctx.evalResults.evidenceLogPath) : 'Pending'}` }
    ]
  };
}

async function _runLegacyEvaluationPipelineWithinTrace(options) {
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
    const lifecycleEngine = new LifecycleEngine('canonical_boq_eval');
    const dagContext = {
      options,
      evidenceLedger,
      startTime,
      ingestCtx: null,
      activeRules: null,
      evalResults: null,
      graph: null,
      queryPayload: null,
      stage2AspectMathMs: 0,
      stage3RAGMs: 0,
      stage4GuardrailMs: 0,
      stage5MatrixMs: 0,
      budgetOpt: null,
      ragResult: null,
      ragAnswer: null
    };

    const phaseHandlers = {
      INGESTION: ctx => _handleBoqIngestionPhase(ctx, options, evidenceLedger),
      FINGERPRINTING: ctx => _handleBoqFingerprintingPhase(ctx, options, evidenceLedger),
      DOMAIN_ASPECTS: ctx => _handleBoqDomainAspectsPhase(ctx, options, evidenceLedger),
      CONFLICT_GRAPH: ctx => _handleBoqConflictGraphPhase(ctx, options, evidenceLedger),
      MODERNIZATION_LEAST_DELTA: ctx => _handleBoqModernizationPhase(ctx, options, evidenceLedger),
      STRATEGY_SYNTHESIS: ctx => _handleBoqStrategySynthesisPhase(ctx, options, evidenceLedger),
      RAG_GROUNDING: ctx => _handleBoqRagGroundingPhase(ctx, options, evidenceLedger),
      DELIVERABLES_FINALIZATION: ctx => _handleBoqDeliverablesPhase(ctx, options, evidenceLedger, startTime),
      REFLECTION_LEARNING: ctx => _handleBoqReflectionPhase(ctx)
    };

    const lifecycleHealth = await lifecycleEngine.executePipelineDAG(dagContext, phaseHandlers);
    dagContext.evalResults.lifecycleEngine = lifecycleEngine;
    dagContext.evalResults.lifecycleHealth = lifecycleHealth;
    return dagContext.evalResults;
  } catch (error) {
    _handlePipelineFailure(error, evidenceLedger, options);
    throw error;
  }
}

function _createOwnedEvaluationLedger(options) {
  const evidenceLedger = createEvidenceLedger({
    chassis: options.chassisDir ? path.basename(options.chassisDir) : (options.CHASSIS_OVERRIDE || 'UNKNOWN_CHASSIS'),
    filePath: options.inputFile || options.BOQ_FILE || (options.inputItems || options.rawText !== undefined ? 'IN_MEMORY_BOM' : null)
  });
  if (!options.inputFile && (options.inputItems || options.rawText !== undefined)) {
    evidenceLedger.recordInlineArtifact('CUSTOMER_INPUT', options.inputItems ?? options.rawText);
  } else {
    evidenceLedger.recordArtifact('CUSTOMER_INPUT', options.inputFile || options.BOQ_FILE);
  }
  return evidenceLedger;
}

function _createOwnedDagContext(options, evidenceLedger, startTime) {
  return {
      options,
      evidenceLedger,
      startTime,
      ingestCtx: null,
      activeRules: null,
      evalResults: null,
      graph: null,
      queryPayload: null,
      stage2AspectMathMs: 0,
      stage3RAGMs: 0,
      stage4GuardrailMs: 0,
      stage5MatrixMs: 0,
      budgetOpt: null,
      ragResult: null,
      ragAnswer: null
  };
}

function _createOwnedPhaseHandlers(options, evidenceLedger, startTime) {
  return {
      INGESTION: ctx => _handleBoqIngestionPhase(ctx, options, evidenceLedger),
      FINGERPRINTING: ctx => _handleBoqFingerprintingPhase(ctx, options, evidenceLedger),
      DOMAIN_ASPECTS: ctx => _handleBoqDomainAspectsPhase(ctx, options, evidenceLedger),
      CONFLICT_GRAPH: ctx => _handleBoqConflictGraphPhase(ctx, options, evidenceLedger),
      MODERNIZATION_LEAST_DELTA: ctx => _handleBoqModernizationPhase(ctx, options, evidenceLedger),
      STRATEGY_SYNTHESIS: ctx => _handleBoqStrategySynthesisPhase(ctx, options, evidenceLedger),
      RAG_GROUNDING: ctx => _handleBoqRagGroundingPhase(ctx, options, evidenceLedger),
      DELIVERABLES_FINALIZATION: ctx => _handleBoqDeliverablesPhase(ctx, options, evidenceLedger, startTime),
      REFLECTION_LEARNING: ctx => terminalOwner.runReflection(ctx,
        () => executeContinuousLearningReflection(evidenceLedger, ctx.ingestCtx, ctx.evalResults, options),
        () => _promoteTerminalPriceDrift(ctx, options))
  };
}

function _resolvePipelineEffectivePolicy(options) {
  const { resolveEffectivePolicy } = require('../lib/system/policy_resolver.js');
  let inheritedPolicy = options.effectivePolicy || null;
  if (!inheritedPolicy && process.env.DASHBOARD_EFFECTIVE_POLICY) {
    try { inheritedPolicy = JSON.parse(process.env.DASHBOARD_EFFECTIVE_POLICY); } catch {}
  }
  const policy = resolveEffectivePolicy({
    clientOffline: options.OFFLINE_MODE !== undefined ? options.OFFLINE_MODE : options.offline,
    clientOfflineMode: options.offlineMode,
    enableCloudValidation: options.enableCloudValidation,
    inheritedPolicy,
    defaultOffline: false,
    lockInheritedOffline: true
  });
  options.OFFLINE_MODE = policy.offline;
  options.effectivePolicy = policy;
  return policy;
}

function runEvaluationPipelineWithinTrace(options) {
  _resolvePipelineEffectivePolicy(options);
  return terminalOwner.selectPipeline(
    () => _runLegacyEvaluationPipelineWithinTrace(options),
    () => {
      const startTime = Date.now();
      return terminalOwner.executeOwnedPipeline({ options,
        createLedger: () => _createOwnedEvaluationLedger(options),
        createEngine: () => new LifecycleEngine('canonical_boq_eval'),
        createContext: ledger => _createOwnedDagContext(options, ledger, startTime),
        createHandlers: ledger => _createOwnedPhaseHandlers(options, ledger, startTime)
      });
    });
}

async function main() {
  const options = parseEvaluationArguments(process.argv.slice(2));
  if (!options) return;
  await require('../lib/lifecycle/canonical_cli_cancellation.js').runCliPipeline(options, runEvaluationPipeline);
}

if (require.main === module) {
  main().catch(err => {
    const JSON_MODE = process.argv.includes('--json');
    if (process.send && process.connected) {
      try {
        process.send({
          type: 'EVAL_RESULT_PAYLOAD',
          version: '1.0.0',
          status: 'ERROR',
          error: err.message,
          data: {
            traceId: err.traceId || null,
            evidenceLogPath: err.evidenceLogPath || null
          }
        });
      } catch (_) {}
    }
    terminalOwner.reportCliFailure(err, JSON_MODE, () => {
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
    });
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
function _resolveRecomputeContext(baseData, chassisDirOverride) {
  const items = baseData.items || baseData.evalResults?.items || [];
  const targetDir = chassisDirOverride || baseData.chassisDir || baseData.evalResults?.targetDir || '';
  const chassisPrefix = path.basename(targetDir || '');
  const catalogPath = path.join(targetDir, `${chassisPrefix}_Catalog.json`);
  let catalogData = baseData.catalogData || null;
  if (!catalogData && fs.existsSync(catalogPath)) {
    try { catalogData = JSON.parse(fs.readFileSync(catalogPath, 'utf-8')); } catch {}
  }
  return { items, targetDir, chassisPrefix, catalogData };
}

function _extractRagDeltasForRecompute(ragResult, targetDir, catalogData, chassisPrefix) {
  if (!ragResult.isCloudGrounded || !(ragResult.citations || []).length) return 0;
  try {
    const learned = extractAndPersistLearnedDeltas(ragResult.answer || '', targetDir, {
      chassis: catalogData?.metadata?.chassis || chassisPrefix,
      source: ragResult.source,
      groundingVerification: ragResult.groundingVerification,
      citations: ragResult.citations || [],
      catalogData
    });
    return learned.count || 0;
  } catch {
    return 0;
  }
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
function _resolveRecomputeScopeFields(baseData, configContext) {
  const prevEval = baseData.evalResults || {};
  const serverCount = baseData.serverCount || configContext?.multiplier || prevEval.serverCount || 1;
  const effectivePolicy = baseData.effectivePolicy || prevEval.effectivePolicy || null;
  return {
    serverCount,
    nodeCount: baseData.nodeCount || prevEval.nodeCount || serverCount,
    quantityBasis: baseData.quantityBasis || prevEval.quantityBasis || (serverCount > 1 ? 'CLUSTER_MULTIPLIED' : 'SINGLE_NODE'),
    parentRunId: baseData.parentRunId || prevEval.parentRunId || null,
    candidateDigest: baseData.candidateDigest || prevEval.candidateDigest || null,
    candidateReference: baseData.candidateReference || prevEval.candidateReference || null,
    effectivePolicy,
    offlineMode: baseData.offlineMode ?? effectivePolicy?.offline ?? prevEval.offlineMode ?? false
  };
}

function recomputeStrategyMatrixWithRag(baseData, ragResult, chassisDirOverride = '') {
  if (!baseData || !ragResult) return baseData;
  const { items, targetDir, chassisPrefix, catalogData } = _resolveRecomputeContext(baseData, chassisDirOverride);
  const learnedCount = _extractRagDeltasForRecompute(ragResult, targetDir, catalogData, chassisPrefix);
  const configContext = baseData.configurationContext || baseData.evalResults?.configurationContext || null;

  const { evaluateBOQMultiAspect } = require('../lib/boq/boq_evaluator.js');
  const { applyConfigurationContext } = require('../lib/boq/configuration_context.js');
  const { synthesize5TierRankedSolutions } = require('../lib/conflict/conflict_graph.js');
  const hasUnambiguousScope = configContext && configContext.ownershipEvidence !== 'AMBIGUOUS_OWNERSHIP_RAW';
  const perNodeItems = hasUnambiguousScope ? items.filter(it => it.quantityScope !== 'global') : items;
  const rawReEval = evaluateBOQMultiAspect(perNodeItems, { filePath: baseData.inputFile, catalogData, targetDir });

  const updatedGraph = rawReEval.conflictGraph || {};
  const combinedGraph = {
    ...baseData.conflictGraph,
    ...updatedGraph,
    rankedSolutions: synthesize5TierRankedSolutions(
      perNodeItems, rawReEval, updatedGraph, updatedGraph.chassisInfo || { model: chassisPrefix }, targetDir
    )
  };
  const reEval = hasUnambiguousScope
    ? applyConfigurationContext({ ...rawReEval, conflictGraph: combinedGraph }, configContext)
    : { ...rawReEval, conflictGraph: combinedGraph };

  const budgetOpt = optimizeForBudget(perNodeItems, reEval, baseData.targetBudgetUsd || 0, catalogData);
  const cloudStatus = ragResult.isCloudGrounded ? 'CLOUD_VERIFIED' : 'LOCAL_FALLBACK';
  const scopeFields = _resolveRecomputeScopeFields(baseData, configContext);

  return {
    ...baseData,
    ...scopeFields,
    configurationContext: reEval.configurationContext || configContext,
    isProvisional: true,
    matrixStatus: 'CANDIDATE_REVIEW_REQUIRED',
    cloudGroundingStatus: cloudStatus,
    ragAnswer: ragResult.answer || baseData.ragAnswer,
    ragResult,
    notebookLmStatus: {
      status: cloudStatus,
      source: ragResult.source,
      sourcesUsed: ragResult.sourcesUsed || [],
      citationsCount: (ragResult.citations || []).length,
      isCloudGrounded: Boolean(ragResult.isCloudGrounded),
      learnedDeltasCount: learnedCount
    },
    evalResults: {
      ...baseData.evalResults,
      ...reEval,
      ...scopeFields,
      configurationContext: reEval.configurationContext || configContext,
      isProvisional: true,
      matrixStatus: 'CANDIDATE_REVIEW_REQUIRED',
      cloudGroundingStatus: cloudStatus,
      ragAnswer: ragResult.answer,
      ragResult
    },
    conflictGraph: reEval.conflictGraph || combinedGraph,
    budgetOptimization: budgetOpt
  };
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
  recomputeStrategyMatrixWithRag,
  _handleBoqReflectionPhase
};
