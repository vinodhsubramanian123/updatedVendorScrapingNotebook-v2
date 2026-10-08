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
const { spawn } = require('child_process');

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
  return new Promise((resolve) => {
    const evalScript = path.join(__dirname, 'eval_boq.js');
    const childArgs = [evalScript, filePath, '--json', '--sheet', sheetName];
    if (options.chassisDir) childArgs.push('--chassis', options.chassisDir);
    if (options.offline) childArgs.push('--offline');

    const child = spawn('node', childArgs, {
      env: { ...process.env, STRUCTURED_PROGRESS: '0' } // Suppress progress spam in parallel
    });

    let stdoutData = '';
    let stderrData = '';

    child.stdout.on('data', data => stdoutData += data.toString());
    child.stderr.on('data', data => stderrData += data.toString());

    child.on('close', (_code) => {
      try {
        let parsedResult = null;
        
        // 1. Primary: Extract between __EVAL_RESULT_JSON__ markers
        const marker = '__EVAL_RESULT_JSON__';
        if (stdoutData.includes(marker)) {
          const parts = stdoutData.split(marker);
          if (parts.length >= 3) {
            try {
              parsedResult = JSON.parse(parts[1]);
            } catch {}
          }
        }

        // 2. Fallback: Search for outer JSON block
        if (!parsedResult) {
          const startIdx = stdoutData.indexOf('{');
          const lastIdx = stdoutData.lastIndexOf('}');
          if (startIdx !== -1 && lastIdx !== -1 && lastIdx > startIdx) {
            try {
              parsedResult = JSON.parse(stdoutData.substring(startIdx, lastIdx + 1));
            } catch {}
          }
        }
        
        if (parsedResult && parsedResult.status !== 'ERROR') {
          resolve({ sheetName: displayLabel || sheetName, status: 'SUCCESS', result: parsedResult });
        } else if (parsedResult && parsedResult.status === 'ERROR') {
          resolve({ sheetName: displayLabel || sheetName, status: 'ERROR', error: parsedResult.error || 'Evaluation error', stderr: stderrData });
        } else {
          resolve({ sheetName: displayLabel || sheetName, status: 'ERROR', error: 'No JSON payload returned', stderr: stderrData });
        }
      } catch (err) {
        resolve({ sheetName: displayLabel || sheetName, status: 'ERROR', error: err.message, stderr: stderrData });
      }
    });
  });
}

/**
 * Importable CP8a facade. Preserves legacy target/result behavior; does not repair
 * split order multipliers or add facility/canonical continuation (CP8b).
 * @returns {Promise<Array<object>>} Existing per-target result envelopes.
 */
async function evaluateMultiBoq(inputFile, options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) throw new TypeError('Multi evaluation options must be an object.');
  for (const key of ['offline', 'jsonMode', 'emitOutput']) {
    if (options[key] !== undefined && typeof options[key] !== 'boolean') throw new TypeError(`${key} must be a boolean.`);
  }
  if (options.chassisDir != null && typeof options.chassisDir !== 'string') throw new TypeError('chassisDir must be a string.');
  if (!inputFile || !fs.existsSync(inputFile)) throw new Error('Please provide a valid BOQ file path.');
  return evaluateTargets(inputFile, options);
}

async function evaluateTargets(inputFile, options) {
  const JSON_MODE = options.jsonMode === true;
  const EMIT_OUTPUT = options.emitOutput === true;
  const OFFLINE_MODE = options.offline === true || process.env.LOCAL_EVAL_ONLY === '1';
  const chassisFlag = options.chassisDir || null;
  const childOptions = { chassisDir: chassisFlag, offline: OFFLINE_MODE };
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
  let sheetNames = workbook.SheetNames.filter(name => !require('../lib/boq/boq_parser.js').isNonBomSheet(name));
  if (!sheetNames.length) throw new Error('No BOQ sheets found');
  
  // Check for Single-Sheet Multi-Cluster Tenders (e.g. GID-RFQS-HPE-2026-006.xlsx)
  const { extractRawItemsFromWorkbook, analyzeAndPartitionClusters, splitAndWriteClusterWorkbooks } = require('../lib/boq/multi_cluster_splitter.js');
  let targetEvaluationFiles = [];

  if (sheetNames.length === 1) {
    const rawItems = extractRawItemsFromWorkbook(inputFile);
    const partitionResult = analyzeAndPartitionClusters(rawItems);

    if (partitionResult.isMultiCluster) {
      if (EMIT_OUTPUT && !JSON_MODE) {
        console.log(`\n🧩 Multi-Cluster Tender Detected! Total Nodes: ${partitionResult.totalChassis}`);
        console.log(`⚡ Auto-partitioning into ${partitionResult.clusters.length} distinct server clusters...`);
      }
      const splitResult = splitAndWriteClusterWorkbooks(inputFile, path.join(PROJECT_ROOT, 'outputs', 'temp', 'split_clusters'));
      targetEvaluationFiles = splitResult.workbooks.map(wb => ({
        filePath: wb.filePath,
        sheetName: `${wb.clusterName} (${wb.multiplier}x)`,
        multiplier: wb.multiplier,
        clusterName: wb.clusterName
      }));
    }
  }

  if (targetEvaluationFiles.length === 0) {
    targetEvaluationFiles = sheetNames.map(sheet => ({
      filePath: inputFile,
      sheetName: sheet,
      multiplier: 1,
      clusterName: sheet
    }));
  }

  if (EMIT_OUTPUT && !JSON_MODE) {
    console.log(`📑 Evaluating ${targetEvaluationFiles.length} cluster target(s)...`);
    targetEvaluationFiles.forEach(t => console.log(`   • ${t.sheetName} -> ${path.basename(t.filePath)}`));
    console.log(`⚡ Spawning parallel physical aspect evaluators...`);
  }

  const startTime = Date.now();
  
  // Spawn parallel evaluations
  const results = [];
  // Bound expensive evaluator/cloud work; all products have already been refreshed once.
  const concurrency = OFFLINE_MODE ? 2 : 1;
  for (let offset = 0; offset < targetEvaluationFiles.length; offset += concurrency) {
    results.push(...await Promise.all(targetEvaluationFiles.slice(offset, offset + concurrency)
      .map(t => evaluateSheetParallel(t.filePath, t.sheetName, t.clusterName, childOptions))));
  }

  const durationMs = Date.now() - startTime;

  if (EMIT_OUTPUT && JSON_MODE) {
    process.stdout.write(JSON.stringify(results));
  } else if (EMIT_OUTPUT) {
    renderEvaluationSummary(results, durationMs);
  }
  return results;
}

/** Render the existing CLI result summary without changing evaluation behavior. */
function renderEvaluationSummary(results, durationMs) {
  console.log(`\n================================================================`);
  console.log(`🎉 MULTI-CLUSTER EVALUATION COMPLETE in ${(durationMs / 1000).toFixed(2)}s`);
  console.log(`================================================================`);
  
  results.forEach(r => {
    if (r.status === 'SUCCESS') {
      const chassis = r.result.data?.chassisDetection?.chassisDir?.split('/').pop() || 'DL380_Gen11';
      const rank1 = r.result.data?.conflictGraph?.rankedSolutions?.[0];
      const conflicts = r.result.data?.conflictSummary?.totalConflicts || 0;
      console.log(`✅ Cluster: [${r.sheetName}] -> Chassis: ${chassis}`);
      console.log(`     • Physical Conflicts: ${conflicts} (Status: ${conflicts === 0 ? '100% BUILDABLE' : 'ACTION REQUIRED'})`);
      if (rank1) {
        console.log(`     • Workload Intent Alignment: ${rank1.tradeoffMetrics?.intentAlignment || '100%'}`);
      }
      const wbPath = r.result.data?.multiRankWorkbookPath || r.result.multiRankWorkbookPath;
      if (wbPath) console.log(`     • Multi-Rank Deliverable: file://${wbPath}`);
      const logPath = r.result.data?.evidenceLogPath || r.result.evidenceLogPath;
      if (logPath) console.log(`     • Evidence Shared State: file://${logPath}`);
      const sumPath = r.result.data?.evidenceSummaryPath || r.result.evidenceSummaryPath;
      if (sumPath) console.log(`     • Evidence Summary: file://${sumPath}`);
    } else {
      console.log(`❌ Cluster: [${r.sheetName}] -> FAILED: ${r.error}`);
    }
  });
  console.log(`\n`);
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
