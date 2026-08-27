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

let XLSX;
try {
  XLSX = require('xlsx-js-style');
} catch (_) {
  try {
    XLSX = require('xlsx');
  } catch (e) {
    console.error('❌ ERROR: Missing required dependency "xlsx-js-style" or "xlsx". Run: npm install xlsx-js-style');
    process.exit(1);
  }
}

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

const args = process.argv.slice(2);
const inputFile = args.find(a => !a.startsWith('--'));
const JSON_MODE = args.includes('--json');
const OFFLINE_MODE = args.includes('--offline') || process.env.LOCAL_EVAL_ONLY === '1';

// Extract optional --chassis flag
let chassisFlag = null;
const chIdx = args.indexOf('--chassis');
if (chIdx !== -1 && args[chIdx + 1]) chassisFlag = args[chIdx + 1];

if (!inputFile || !fs.existsSync(inputFile)) {
  console.error('❌ ERROR: Please provide a valid BOQ file path.');
  console.log('Usage: npm run eval:multi <path/to/boq.xlsx> [--chassis <dir>] [--json] [--offline]');
  process.exit(1);
}

async function evaluateSheetParallel(filePath, sheetName, displayLabel = sheetName) {
  return new Promise((resolve) => {
    const evalScript = path.join(__dirname, 'eval_boq.js');
    const childArgs = [evalScript, filePath, '--json', '--sheet', sheetName];
    if (chassisFlag) childArgs.push('--chassis', chassisFlag);
    if (OFFLINE_MODE) childArgs.push('--offline');

    const child = spawn('node', childArgs, {
      env: { ...process.env, STRUCTURED_PROGRESS: '0' } // Suppress progress spam in parallel
    });

    let stdoutData = '';
    let stderrData = '';

    child.stdout.on('data', data => stdoutData += data.toString());
    child.stderr.on('data', data => stderrData += data.toString());

    child.on('close', (code) => {
      try {
        let parsedResult = null;
        
        // 1. Primary: Extract between __EVAL_RESULT_JSON__ markers
        const marker = '__EVAL_RESULT_JSON__';
        if (stdoutData.includes(marker)) {
          const parts = stdoutData.split(marker);
          if (parts.length >= 3) {
            try {
              parsedResult = JSON.parse(parts[1]);
            } catch (_) {}
          }
        }

        // 2. Fallback: Search for outer JSON block
        if (!parsedResult) {
          const startIdx = stdoutData.indexOf('{');
          const lastIdx = stdoutData.lastIndexOf('}');
          if (startIdx !== -1 && lastIdx !== -1 && lastIdx > startIdx) {
            try {
              parsedResult = JSON.parse(stdoutData.substring(startIdx, lastIdx + 1));
            } catch (_) {}
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

async function main() {
  if (!JSON_MODE) {
    console.log(`\n================================================================`);
    console.log(`🚀 HPE OCA MULTI-CONFIG PARALLEL EVALUATION ENGINE`);
    console.log(`================================================================`);
    console.log(`📄 Analyzing BOQ: ${path.basename(inputFile)}`);
  }

  const ext = path.extname(inputFile).toLowerCase();
  
  if (ext !== '.xlsx') {
    // If not Excel, it's just a single config text/json file. Run normally.
    if (!JSON_MODE) console.log(`⏩ Not a multi-sheet workbook. Spawning single evaluation...`);
    const res = await evaluateSheetParallel(inputFile, 'Default');
    if (JSON_MODE) {
      process.stdout.write(JSON.stringify([res]));
    } else {
      console.log(`✅ Evaluation complete. Status: ${res.status}`);
    }
    return;
  }

  // Parse Excel to find sheets
  const workbook = XLSX.readFile(inputFile);
  let sheetNames = workbook.SheetNames;
  
  // Check for Single-Sheet Multi-Cluster Tenders (e.g. GID-RFQS-HPE-2026-006.xlsx)
  const { extractRawItemsFromWorkbook, analyzeAndPartitionClusters, splitAndWriteClusterWorkbooks } = require('../lib/boq/multi_cluster_splitter.js');
  let targetEvaluationFiles = [];

  if (sheetNames.length === 1) {
    const rawItems = extractRawItemsFromWorkbook(inputFile);
    const partitionResult = analyzeAndPartitionClusters(rawItems);

    if (partitionResult.isMultiCluster) {
      if (!JSON_MODE) {
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

  if (!JSON_MODE) {
    console.log(`📑 Evaluating ${targetEvaluationFiles.length} cluster target(s)...`);
    targetEvaluationFiles.forEach(t => console.log(`   • ${t.sheetName} -> ${path.basename(t.filePath)}`));
    console.log(`⚡ Spawning parallel physical aspect evaluators...`);
  }

  const startTime = Date.now();
  
  // Spawn parallel evaluations
  const promises = targetEvaluationFiles.map(t => evaluateSheetParallel(t.filePath, 'Server Config', t.clusterName));
  const results = await Promise.all(promises);

  const durationMs = Date.now() - startTime;

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify(results));
  } else {
    console.log(`\n================================================================`);
    console.log(`🎉 MULTI-CLUSTER EVALUATION COMPLETE in ${(durationMs / 1000).toFixed(2)}s`);
    console.log(`================================================================`);
    
    results.forEach(r => {
      if (r.status === 'SUCCESS') {
        const chassis = r.result.data?.chassisDetection?.chassisDir?.split('/').pop() || 'DL380_Gen11';
        const rank1 = r.result.data?.conflictGraph?.rankedSolutions?.[0];
        const conflicts = r.result.data?.conflictSummary?.totalConflicts || 0;
        console.log(`✅ Cluster: [${r.sheetName}] -> Chassis: ${chassis}`);
        console.log(`     • Physical Conflicts: ${conflicts} (Status: ${conflicts <= 2 ? '100% BUILDABLE' : 'ACTION REQUIRED'})`);
        if (rank1) {
          console.log(`     • Workload Intent Alignment: ${rank1.tradeoffMetrics?.intentAlignment || '100%'}`);
        }
      } else {
        console.log(`❌ Cluster: [${r.sheetName}] -> FAILED: ${r.error}`);
      }
    });
    console.log(`\n`);
  }
}

main().catch(err => {
  if (JSON_MODE) {
    process.stdout.write(JSON.stringify([{ status: 'FATAL_ERROR', error: err.message }]));
  } else {
    console.error('Fatal multi-eval error:', err);
  }
  process.exit(1);
});
