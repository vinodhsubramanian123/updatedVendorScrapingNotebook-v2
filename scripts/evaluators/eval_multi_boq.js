'use strict';
/**
 * scripts/eval_multi_boq.js — Scalable Multi-Config Parallel Evaluation Engine
 * 
 * Capable of discovering multiple independent configurations within a single BOQ 
 * (e.g. multiple Excel sheets) and spawning parallel evaluation child processes.
 * Ensures zero rigidity and maximum scalability.
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
let workbookDependency;

function loadWorkbookDependency() {
  if (workbookDependency) return workbookDependency;
  try { workbookDependency = require('xlsx-js-style'); } catch {
    try { workbookDependency = require('xlsx'); } catch {
      const error = new Error('❌ ERROR: Missing required dependency "xlsx-js-style" or "xlsx". Run: npm install xlsx-js-style');
      error.code = 'MULTI_XLSX_DEPENDENCY_MISSING';
      throw error;
    }
  }
  return workbookDependency;
}

async function evaluateSheetParallel(filePath, sheetName, displayLabel = sheetName, options = {}) {
  return require('../lib/boq/multi_child_evaluation.js').executeGroupChild({ filePath, sheetName, displayLabel }, options);
}

/**
 * Importable grouped facade. Retains CLI flags and array envelopes; CP8b carries
 * owned order quantities, truthful child outcomes and explicit facility unknowns.
 * @returns {Promise<Array<object>>} Per-group envelopes with source/evidence bridges.
 */
async function evaluateMultiBoq(inputFile, options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) throw new TypeError('Multi evaluation options must be an object.');
  for (const key of ['offline', 'jsonMode', 'emitOutput']) {
    if (options[key] !== undefined && typeof options[key] !== 'boolean') throw new TypeError(`${key} must be a boolean.`);
  }
  if (options.chassisDir != null && typeof options.chassisDir !== 'string') throw new TypeError('chassisDir must be a string.');
  validateChildLimits(options);
  require('../lib/system/execution_budget.js').assertCallerActive(options, Date.now());
  if (options.signal !== undefined) {
    if (!options.signal || typeof options.signal !== 'object' || typeof options.signal.aborted !== 'boolean' || typeof options.signal.addEventListener !== 'function') {
      throw new TypeError('signal must be an AbortSignal.');
    }
  }
  if (!inputFile || !fs.existsSync(inputFile)) throw new Error('Please provide a valid BOQ file path.');
  return evaluateTargets(inputFile, options);
}

function validateChildLimits(options) {
  for (const key of ['timeoutMs', 'childTimeoutMs', 'queryTimeoutMs', 'deadlineAt', 'maxOutputBytes', 'graceMs', 'confirmationMs']) {
    if (options[key] !== undefined && (!Number.isSafeInteger(options[key]) || options[key] <= 0)) throw new TypeError(`${key} must be a positive safe integer.`);
  }
}

async function evaluateTargets(inputFile, options) {
  const JSON_MODE = options.jsonMode === true;
  const EMIT_OUTPUT = options.emitOutput === true;
  const OFFLINE_MODE = options.offline === true || process.env.LOCAL_EVAL_ONLY === '1';
  const chassisFlag = options.chassisDir || null;
  const childOptions = {
    chassisDir: chassisFlag,
    offline: OFFLINE_MODE,
    timeoutMs: options.timeoutMs,
    childTimeoutMs: options.childTimeoutMs,
    queryTimeoutMs: options.queryTimeoutMs,
    deadlineAt: options.deadlineAt,
    maxOutputBytes: options.maxOutputBytes,
    signal: options.signal
  };
  if (options.graceMs !== undefined) childOptions.graceMs = options.graceMs;
  if (options.confirmationMs !== undefined) childOptions.confirmationMs = options.confirmationMs;
  if (EMIT_OUTPUT && !JSON_MODE) {
    console.log(`\n================================================================`);
    console.log(`🚀 HPE OCA MULTI-CONFIG PARALLEL EVALUATION ENGINE`);
    console.log(`================================================================`);
    console.log(`📄 Analyzing BOQ: ${path.basename(inputFile)}`);
  }

  const ext = path.extname(inputFile).toLowerCase();
  if (!OFFLINE_MODE && !process.env.CI && /\.xlsx?$/i.test(ext)) {
    const { buildRefreshPlan, executeRefreshPlan } = require('../lib/catalog/catalog_refresh_plan.js');
    const plan = buildRefreshPlan({ filePath: inputFile, products: chassisFlag ? [path.basename(chassisFlag)] : [] });
    if (!plan.ready) throw new Error(`Catalog preflight unresolved: ${JSON.stringify(plan.unresolved)}`);
    const refresh = executeRefreshPlan(plan);
    if (!refresh.success) throw new Error(`Catalog preflight incomplete: ${JSON.stringify(refresh.results)}`);
  }
  
  if (!['.xlsx', '.xls'].includes(ext)) {
    // If not Excel, it's just a single config text/json file. Run normally.
    if (EMIT_OUTPUT && !JSON_MODE) console.log(`⏩ Not a multi-sheet workbook. Spawning single evaluation...`);
    const res = await evaluateSheetParallel(inputFile, 'Default', 'Default', childOptions);
    if (EMIT_OUTPUT && JSON_MODE) {
      process.stdout.write(JSON.stringify([res]));
    } else if (EMIT_OUTPUT) {
      console.log(`✅ Evaluation complete. Status: ${res.status}`);
    }
    return [res];
  }

  // Parse Excel to find sheets
  const workbook = loadWorkbookDependency().readFile(inputFile);
  const targetEvaluationFiles = require('../lib/boq/multi_group_plan.js').planWorkbookGroups(inputFile, workbook, loadWorkbookDependency(), PROJECT_ROOT);

  if (EMIT_OUTPUT && !JSON_MODE) {
    console.log(`📑 Evaluating ${targetEvaluationFiles.length} cluster target(s)...`);
    targetEvaluationFiles.forEach(t => console.log(`   • ${t.displayLabel} -> ${t.blocked ? 'ownership/quantity clarification required' : path.basename(t.filePath)}`));
    console.log(`⚡ Spawning parallel physical aspect evaluators...`);
  }

  const startTime = Date.now();
  
  // Spawn parallel evaluations
  const results = [];
  // Bound expensive evaluator/cloud work; all products have already been refreshed once.
  const concurrency = OFFLINE_MODE ? 2 : 1;
  for (let offset = 0; offset < targetEvaluationFiles.length; offset += concurrency) {
    results.push(...await Promise.all(targetEvaluationFiles.slice(offset, offset + concurrency)
      .map(t => executePlannedGroup(t, childOptions))));
  }

  const durationMs = Date.now() - startTime;

  const envelopes = require('../lib/boq/multi_facility_summary.js').attachGroupEvidence(targetEvaluationFiles, results);
  if (EMIT_OUTPUT && JSON_MODE) {
    process.stdout.write(JSON.stringify(envelopes));
  } else if (EMIT_OUTPUT) {
    renderEvaluationSummary(envelopes, durationMs);
  }
  return envelopes;
}

function executePlannedGroup(group, options) {
  if (group.blocked) return Promise.resolve({ sheetName: group.displayLabel, ...group.blocked });
  return evaluateSheetParallel(group.filePath, group.sheetName, group.displayLabel, options);
}

/** Render the existing CLI result summary without changing evaluation behavior. */
function renderEvaluationSummary(results, durationMs) {
  console.log(`\n================================================================`);
  console.log(`🎉 MULTI-CLUSTER EVALUATION COMPLETE in ${(durationMs / 1000).toFixed(2)}s`);
  console.log(`================================================================`);
  
  results.forEach(renderGroupSummary);
  console.log(`\n`);
}

function renderGroupSummary(group) {
  console.log(`Cluster: [${group.sheetName}] -> ${group.status}`);
  if (group.error) console.log(`     • Diagnostic: ${group.error}`);
  const data = group.result?.data || group.result;
  if (!data) return;
  console.log(`     • Customer Disposition: ${data.customerDisposition || 'UNKNOWN'}`);
  if (data.evidenceLogPath) console.log(`     • Evidence Shared State: file://${data.evidenceLogPath}`);
  if (data.evidenceSummaryPath) console.log(`     • Evidence Summary: file://${data.evidenceSummaryPath}`);
  if (data.multiRankWorkbookPath) console.log(`     • Multi-Rank Deliverable: file://${data.multiRankWorkbookPath}`);
}

/** CLI boundary retains legacy dependency-before-input validation precedence. */
async function runCli(args = process.argv.slice(2)) {
  try { loadWorkbookDependency(); } catch (error) {
    console.error(error.message);
    return 1;
  }
  const inputFile = args.find(a => !a.startsWith('--'));
  const JSON_MODE = args.includes('--json');
  const chIdx = args.indexOf('--chassis');
  const chassisFlag = chIdx !== -1 && args[chIdx + 1] ? args[chIdx + 1] : null;
  if (!inputFile || !fs.existsSync(inputFile)) {
    console.error('❌ ERROR: Please provide a valid BOQ file path.');
    console.log('Usage: npm run eval:multi <path/to/boq.xlsx> [--chassis <dir>] [--json] [--offline]');
    return 1;
  }
  try {
    await evaluateTargets(inputFile, { chassisDir: chassisFlag, jsonMode: JSON_MODE,
      offline: args.includes('--offline'), emitOutput: true });
    return 0;
  } catch (err) {
    if (JSON_MODE) process.stdout.write(JSON.stringify([{ status: 'FATAL_ERROR', error: err.message }]));
    else console.error('Fatal multi-eval error:', err);
    return 1;
  }
}

if (require.main === module) runCli().then(code => { if (code !== 0) process.exit(code); });
module.exports = { evaluateMultiBoq, runCli };
