'use strict';
/**
 * scripts/observability_status.js — Unified HPE OCA Pipeline Observability Dashboard
 * Usage: node scripts/observability_status.js [--json] (or npm run status)
 *
 * Provides a single-terminal status overview of:
 * 1. CDP Port 9222 browser connection & active tabs
 * 2. Scraped Catalog Portfolio (SKUs, PDF size, MD5 fingerprint, sheet counts)
 * 3. Learned KnowledgeDeltas & HITL feedback logs from vendor rejections
 * 4. Script registry & package.json target wiring health
 *
 * Supports --json flag for machine-parseable output (dashboard server.js consumption).
 */

const fs     = require('fs');
const path   = require('path');

const { checkCdpHealth, listAllCatalogs, collectKnowledgeDeltas } = require('../lib/catalog/catalog_discovery.js');

const PROJECT_ROOT  = path.resolve(__dirname, '..', '..');
const OUTPUTS_ROOT  = path.join(PROJECT_ROOT, 'outputs');
const PACKAGE_JSON  = path.join(PROJECT_ROOT, 'package.json');
const JSON_MODE     = process.argv.includes('--json');

function _buildJsonResult(cdpState, catalogs, totalSkusInPortfolio, deltas, knowledgeSyncState, telemetryData, scripts) {
  return {
    status: 'SUCCESS',
    data: {
      cdp: cdpState,
      catalogs: catalogs.map(c => ({
        id: c.id,
        chassis: c.chassis,
        skuCount: c.skuCount,
        scrapeDate: c.scrapeDate,
        relativeDir: c.relativeDir,
        hasExcel: c.hasExcel,
        pdf: c.pdf,
        cloudQuickSpecsCount: c.cloudQuickSpecsCount || 0,
        hasDiffHistory: c.hasDiffHistory
      })),
      totalSkusInPortfolio,
      deltas,
      knowledgeSync: knowledgeSyncState ? {
        totalLearnedRules: knowledgeSyncState.totalLearnedRules,
        counts: knowledgeSyncState.counts,
        lastSyncedAt: knowledgeSyncState.lastSyncedAt
      } : null,
      telemetry: telemetryData ? {
        evaluationsCount: telemetryData.evaluationsCount,
        totalDeltasLearned: telemetryData.totalDeltasLearned,
        avgConfidenceScore: telemetryData.avgConfidenceScore,
        lastRun: telemetryData.history && telemetryData.history[0] ? telemetryData.history[0] : null
      } : null,
      scripts
    }
  };
}

function _formatQuickSpecsStatus(cat) {
  if (cat.pdf) return `✅ ${cat.pdf.sizeMb} MB (MD5: ${cat.pdf.md5Prefix}...)`;
  if (cat.cloudQuickSpecsCount > 0) return `☁️  Cloud QuickSpecs Attached (${cat.cloudQuickSpecsCount} source(s))`;
  return '⚠️ Advisory (No PDF)';
}

function _printKnowledgeAndTelemetry(deltas, knowledgeSyncState, telemetryData) {
  console.log('\n--- 3. Learned KnowledgeDeltas & Vendor Feedback History ---');
  if (deltas.length > 0) {
    console.log(`Discovered ${deltas.length} KnowledgeDelta(s) logged from portal rejections:`);
    deltas.slice(0, 15).forEach(d => {
      console.log(`  • [${d.deltaId}] Chassis: ${d.chassis} | Type: ${d.errorType || d.ruleType}`);
      console.log(`    Rule: ${d.ruleUpdate || d.rawMessage}`);
    });
    if (deltas.length > 15) {
      console.log(`  ... and ${deltas.length - 15} additional KnowledgeDelta(s) across the portfolio.`);
    }
  } else {
    console.log('  ℹ️  No KnowledgeDeltas recorded yet. (Simulate rejections via eval_boq --simulate-portal-error)');
  }

  if (knowledgeSyncState) {
    let cloudSynced = false;
    let pendingCount = 0;
    try {
      const nbCfgPath = path.join(PROJECT_ROOT, 'scripts', 'config', 'notebooks.json');
      if (fs.existsSync(nbCfgPath)) {
        const nbCfg = JSON.parse(fs.readFileSync(nbCfgPath, 'utf8'));
        const entries = Object.values(nbCfg.notebooks || {});
        const verified = entries.filter(e => e.lastSyncedAt && e.cloudSyncState !== 'FAILED');
        pendingCount = entries.length - verified.length;
        cloudSynced = entries.length > 0 && pendingCount === 0;
      }
    } catch (_) {}

    if (cloudSynced) {
      console.log(`\n  🧠 Knowledge Sync Engine : ✅ CLOUD & LOCAL SYNCHRONIZED (${knowledgeSyncState.totalLearnedRules} Rules Categorized: ${knowledgeSyncState.counts.universal} Universal, ${knowledgeSyncState.counts.familyGen} Family/Gen, ${knowledgeSyncState.counts.chassisSpecific} Chassis)`);
    } else {
      console.log(`\n  🧠 Knowledge Sync Engine : ℹ️ LOCAL REGISTRY VERIFIED (${knowledgeSyncState.totalLearnedRules} Rules Categorized; ${pendingCount} cloud notebook(s) unverified/pending)`);
    }
  }

  console.log('\n--- 3.5 Telemetry & Observability Metrics ---');
  if (telemetryData) {
    console.log(`  📊 Total Evaluations Run  : ${telemetryData.evaluationsCount}`);
    console.log(`  📊 Total Deltas Learned    : ${telemetryData.totalDeltasLearned}`);
    console.log(`  📊 Average Confidence Score: ${telemetryData.avgConfidenceScore} / 1.00`);
    if (telemetryData.history && telemetryData.history.length > 0) {
      const last = telemetryData.history[0];
      console.log(`  ⏱️ Last BOQ Run (${last.boqFile}): ${last.chassisModel} | Score: ${last.confidenceScore} | Rules: ${last.graphRulesEvaluated} | Duration: ${last.durationMs}ms`);
    }
  } else {
    console.log('  ℹ️  Telemetry log baseline initialized.');
  }
}

async function main() {
  const cdpState = await checkCdpHealth(9222);
  const catalogs = listAllCatalogs(OUTPUTS_ROOT);
  const totalSkusInPortfolio = catalogs.reduce((acc, c) => acc + c.skuCount, 0);
  const deltas = collectKnowledgeDeltas(OUTPUTS_ROOT);

  let knowledgeSyncState = null;
  try {
    const { buildMasterKnowledgeRegistry } = require('../lib/sync/knowledge_sync.js');
    knowledgeSyncState = buildMasterKnowledgeRegistry({ persist: false });
  } catch (_) { const _logger = require('../lib/system/pipeline_logger.js'); _logger.warn('ERROR', 'observability_status.js', _); }

  let telemetryData = null;
  try {
    const { loadTelemetry } = require('../lib/system/telemetry.js');
    telemetryData = loadTelemetry();
  } catch (_) { const _logger = require('../lib/system/pipeline_logger.js'); _logger.warn('ERROR', 'observability_status.js', _); }

  let scripts = {};
  if (fs.existsSync(PACKAGE_JSON)) {
    const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf-8'));
    scripts = pkg.scripts || {};
  }

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify(_buildJsonResult(cdpState, catalogs, totalSkusInPortfolio, deltas, knowledgeSyncState, telemetryData, scripts)));
    return;
  }

  console.log('================================================================');
  console.log('📊 HPE OCA PIPELINE OBSERVABILITY & HEALTH DASHBOARD');
  console.log('================================================================\n');

  console.log('--- 1. CDP Browser Debugging Status (Port 9222) ---');
  if (cdpState.ok) {
    console.log('  🟢 CDP Connection: ACTIVE (http://localhost:9222)');
    console.log(`  Open Browser Tabs (${cdpState.pages.length}):`);
    cdpState.pages.forEach(p => {
      const isOca = (p.url || '').includes('oca.ext.hpe.com');
      console.log(`    - ${isOca ? '⭐ [ACTIVE OCA]' : '🌐'} ${p.title || 'Untitled'} (${p.url})`);
    });
  } else {
    console.log('  🟡 CDP Connection: INACTIVE / NOT LISTENING on Port 9222');
    console.log('  💡 Launch Chrome with --remote-debugging-port=9222 before running live scrapers.');
  }

  console.log('\n--- 2. Portfolio Intelligence & Output Catalogs ---');
  console.log(`Found ${catalogs.length} scraped catalog directory(ies) in outputs/\n`);

  catalogs.forEach((cat, idx) => {
    console.log(`  [${idx + 1}] ${cat.chassis}`);
    console.log(`      Path:       ${cat.relativeDir}/`);
    console.log(`      SKUs:       ${cat.skuCount.toLocaleString()} unique hardware & service SKUs`);
    console.log(`      Excel:      ${cat.hasExcel ? '✅ Present' : '❌ Missing'}`);
    console.log(`      QuickSpecs: ${_formatQuickSpecsStatus(cat)}`);
    console.log(`      Snapshots:  ${cat.hasDiffHistory ? '✅ Diff History Active' : 'Baseline'}\n`);
  });

  console.log(`  📈 Total Portfolio Intelligence: ${totalSkusInPortfolio.toLocaleString()} unique SKUs across ${catalogs.length} product lines.`);

  _printKnowledgeAndTelemetry(deltas, knowledgeSyncState, telemetryData);

  console.log('\n--- 4. Script Registry & package.json Wiring Audit ---');
  console.log(`Registered npm target commands (${Object.keys(scripts).length}):`);
  Object.entries(scripts).forEach(([target, cmd]) => {
    console.log(`  • npm run ${target.padEnd(16)} -> ${cmd}`);
  });

  console.log('\n================================================================');
  const isHealthy = catalogs.length > 0 && telemetryData !== null;
  const isCdpConnected = cdpState && cdpState.ok;
  if (catalogs.length === 0) {
    console.log('⚠️ NO DATA: 0 product catalogs found. Pipeline evaluation not applicable.');
  } else if (!isHealthy) {
    console.log('⚠️ OBSERVABILITY WARNING: Catalog portfolio present, but telemetry log is uninitialized or degraded.');
  } else {
    console.log(`🎉 OBSERVABILITY DASHBOARD COMPLETE — PIPELINE ${isCdpConnected ? '100% HEALTHY (CDP ACTIVE)' : 'READY (OFFLINE / BACKEND READY)'}`);
  }
  console.log('================================================================\n');
}

main();
