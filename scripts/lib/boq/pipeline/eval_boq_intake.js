'use strict';
/**
 * scripts/lib/boq/pipeline/eval_boq_intake.js — BOQ Argument Parsing & Chassis Ingestion
 */

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { parseAndConsolidateBOQDetailed } = require('../boq_evaluator.js');
const { resolveRequirementIntent } = require('../requirement_intent_resolver.js');
const { processPortalFeedback } = require('../../feedback/feedback_loop.js');
const { autoDetectChassisDetailed, isCatalogCertified, listAllCatalogs } = require('../../catalog/catalog_discovery.js');
const { getAuthoritativeSourceIds } = require('../../notebook/notebook_query_utils.js');
const { captureCatalogEvidence } = require('../solution_evidence');
const { assertNotebookHealth, loadNotebookConfig } = require('../../sync/knowledge_sync.js');
const logger = require('../../system/pipeline_logger.js');

const PROJECT_CONFIG_DIR = path.join(__dirname, '..', '..', '..', 'config');

/**
 * Load notebook ID from config file for a specific chassis or use default.
 * @param {string} [chassisName]
 */
function getDefaultNotebookId(chassisName = '') {
  const configPath = path.join(PROJECT_CONFIG_DIR, 'notebooks.json');
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
      logger.warn('ERROR', 'eval_boq_intake.js', e);
    }
  }
  return null;
}

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

  const { numericCliOption } = require('../../system/execution_budget.js');
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
  const { isImageFile, performGeminiOcr } = require('../../ocr/ocr_service.js');

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
  const cats = listAllCatalogs();
  const matched = cats.find(c => c.id === chassisDir || c.prefix === chassisDir || c.chassis === chassisDir || path.basename(c.catalogDir) === chassisDir);
  return matched ? matched.catalogDir : chassisDir;
}

function _throwUnknownChassisError(items, chassisDetection, availableCatalogs) {
  const { detectVendor } = require('../../taxonomy/vendor_agnostic_schema.js');
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
    const { buildRefreshPlan, executeRefreshPlan } = require('../../catalog/catalog_refresh_plan.js');
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
      const refreshed = require('../../catalog/product_metadata_manager.js').getProductGenerationMetadata(detectedChassisName);
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
  let catalogEvidence = null;
  if (fs.existsSync(catalogPath)) {
    try {
      const bytes = fs.readFileSync(catalogPath);
      catalogData = JSON.parse(bytes.toString('utf8'));
      catalogEvidence = captureCatalogEvidence(chassisDir, bytes);
      const { attachCompanionServices } = require('../../catalog/sku.js');
      attachCompanionServices(catalogData, catalogPath);
    } catch (err) {
      throw new Error(JSON.stringify({
        error: 'EvaluationError',
        message: `Failed to parse catalog data at ${catalogPath}: ${err.message}`,
        traceId: require('../../system/trace_context.js').getTraceId()
      }));
    }
  }

  if (!catalogData) throw new Error(`ERR_MISSING_CATALOG: ${catalogPath}`);
  const { auditCatalogFreshness, verifyTabularIntegrity } = require('../../catalog/catalog_freshness_guard.js');
  const catalogAudit = { freshness: auditCatalogFreshness(catalogData), integrity: verifyTabularIntegrity(catalogData) };
  if (!catalogAudit.integrity.isValid) throw new Error(`ERR_CATALOG_INTEGRITY: ${catalogAudit.integrity.errors.join('; ')}`);
  if (['UNKNOWN', 'INVALID_FUTURE_DATE', 'CRITICAL_OUTDATED'].includes(catalogAudit.freshness.freshnessStatus) && !isExplicitTestPath) {
    throw new Error(`ERR_CATALOG_FRESHNESS: ${catalogAudit.freshness.freshnessStatus}`);
  }

  return { catalogData, catalogAudit, chassisPrefix, catalogEvidence };
}

function _applyPolicyAndConfiguration(rawItems, options, chassisDir, catalogData, parsedBoq, chassisDetection) {
  let items = rawItems;
  const productConfirmed = !chassisDetection.requiresUserConfirmation && chassisDetection.confidenceScore >= 0.95;
  let supportPolicyChange = null;
  if (options.applySupportDefault) {
    supportPolicyChange = require('../support_policy').applyRequestedDefaultSupport(items, chassisDir);
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
    configurationContext = require('../configuration_context').normalizeConfiguration(items, { serverCount: requestedServerCount });
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

function _validateParsedBoqItems(items) {
  if (!items.length) throw new Error('ERR_EMPTY_BOQ: No hardware items parsed.');
  const invalid = items.some(item => !item.sku || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1);
  if (invalid) throw new Error('ERR_INVALID_BOQ: Every item requires a SKU and positive integer quantity.');
}

function _resolveNotebookBinding(detectedChassisName, explicitNotebookId) {
  const configuredNotebookId = getDefaultNotebookId(detectedChassisName);
  const notebookId = explicitNotebookId === configuredNotebookId ? explicitNotebookId : configuredNotebookId;
  const { notebookHealth, notebookDegradedMode } = _probeNotebookHealthSafe(detectedChassisName);
  return { notebookId, notebookHealth, notebookDegradedMode };
}

function _prepareEvaluationOutputPath(chassisDir, inputBase, targetSheetName, explicitOutputPath) {
  const defaultReportsDir = path.join(chassisDir, 'reports');
  if (!fs.existsSync(defaultReportsDir)) fs.mkdirSync(defaultReportsDir, { recursive: true });
  const fileSuffix = targetSheetName ? `${inputBase}_${targetSheetName.replace(/[/\\?*[\]:]/g, '_')}` : inputBase;
  return explicitOutputPath || path.join(defaultReportsDir, `BOQ_Evaluation_${fileSuffix}.md`);
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
  _validateParsedBoqItems(items);
  const stage1ParsingMs = Math.max(Date.now() - tStart, 1);

  let { chassisDir, chassisDetection } = await _resolveChassisSelection(items, _resolveEffectiveExplicitChassis(options, parsedBoq), JSON_MODE);
  const detectedChassisName = path.basename(chassisDir || '');
  const isExplicitTestPath = /(?:^|[\\/])tests[\\/]fixtures|(?:^|[\\/])outputs[\\/]temp[\\/]test_payloads/i.test(chassisDir) || process.env.NODE_ENV === 'test';
  chassisDir = _preflightCatalogFreshness(detectedChassisName, chassisDir, options, isExplicitTestPath, JSON_MODE, chassisDetection);

  const { notebookId, notebookHealth, notebookDegradedMode } = _resolveNotebookBinding(detectedChassisName, explicitNotebookId);
  const outputPath = _prepareEvaluationOutputPath(chassisDir, inputBase, targetSheetName, explicitOutputPath);
  _applySimulatedErrorAndPrintBanner(options, chassisDir, inputFile, notebookId, outputPath, items.length);

  const { catalogData, catalogAudit, chassisPrefix, catalogEvidence } = _loadAndAuditCatalogData(chassisDir, isExplicitTestPath);
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
    ocrMetadata, catalogAudit, catalogEvidence, stage1ParsingMs
  };
}

module.exports = {
  getDefaultNotebookId,
  parseEvaluationArguments,
  promptUserForChassisTriage,
  ingestAndConsolidateBoq
};
