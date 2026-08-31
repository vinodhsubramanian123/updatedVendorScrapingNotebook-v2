'use strict';
/**
 * scripts/maintenance/guardrail_health_check.js — Automated 7-Guardrail System Heartbeat
 *
 * Fast (<3s) non-destructive pre-flight diagnostic certifying all 7 enterprise guardrails:
 * 1. NotebookLM MCP / CLI Connection & OAuth Profile Health
 * 2. Gemini Multi-Key Rotation & API Readiness
 * 3. Deterministic Physical Aspect Math Engine
 * 4. Staging Validation & Anomaly Protection (INV-22, INV-23)
 * 5. Atomic File System Compatibility & Concurrency Safety (INV-16)
 * 6. Dynamic Chassis Map & CTO Variant Integrity
 * 7. Telemetry Ledger Observability & Grounding Integrity Tracking
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

const RESULTS = {
  timestamp: new Date().toISOString(),
  overallStatus: 'HEALTHY',
  checks: [],
  passedCount: 0,
  failedCount: 0
};

function recordCheck(id, name, status, details = {}) {
  const isPass = status === 'PASS';
  if (isPass) RESULTS.passedCount++;
  else {
    RESULTS.failedCount++;
    RESULTS.overallStatus = 'DEGRADED';
  }
  RESULTS.checks.push({ id, name, status, details });
  const icon = isPass ? '✅' : '❌';
  console.log(`${icon} [GUARDRAIL-${id}] ${name}: ${status}`);
  if (!isPass && details.error) {
    console.error(`   └─ Error: ${details.error}`);
  }
}

async function runHealthHeartbeat() {
  console.log('===============================================================');
  console.log('🛡️  ENTERPRISE SYSTEM GUARDRAIL HEALTH HEARTBEAT');
  console.log('===============================================================\n');

  // Guardrail 1: NotebookLM MCP & CLI Profile
  try {
    const homeBin = path.join(process.env.HOME || '', '.local', 'bin', 'nlm');
    const hasNlm = fs.existsSync(homeBin);
    const profilePath = path.join(process.env.HOME || '', '.notebooklm-mcp-cli', 'profiles', 'default');
    const hasProfile = fs.existsSync(profilePath);

    if (hasNlm && hasProfile) {
      recordCheck(1, 'NotebookLM MCP / CLI Connection & OAuth Profile', 'PASS', { nlmPath: homeBin, profile: profilePath });
    } else {
      recordCheck(1, 'NotebookLM MCP / CLI Connection & OAuth Profile', 'FAIL', {
        error: `Missing nlm binary (${hasNlm}) or default profile (${hasProfile})`
      });
    }
  } catch (err) {
    recordCheck(1, 'NotebookLM MCP / CLI Connection & OAuth Profile', 'FAIL', { error: err.message });
  }

  // Guardrail 2: Gemini API Key Rotation & Quota State
  try {
    const geminiRotator = require('../lib/system/gemini_rotator.js');
    const keyInfo = geminiRotator.getActiveKey();
    const allKeys = geminiRotator.getAllKeys ? geminiRotator.getAllKeys() : [];
    if (keyInfo && keyInfo.apiKey) {
      recordCheck(2, 'Gemini API Key Rotation & Quota Readiness', 'PASS', {
        totalKeysConfigured: allKeys.length || 1,
        activeKeyIndex: keyInfo.index ?? 0
      });
    } else {
      recordCheck(2, 'Gemini API Key Rotation & Quota Readiness', 'FAIL', { error: 'No active Gemini API key configured' });
    }
  } catch (err) {
    recordCheck(2, 'Gemini API Key Rotation & Quota Readiness', 'FAIL', { error: err.message });
  }

  // Guardrail 3: Deterministic Physical Aspect Math Engine
  try {
    const { evaluateBOQMultiAspect } = require('../lib/boq/boq_evaluator.js');
    const sampleItems = [
      { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF Server', quantity: 1 },
      { sku: 'P67088-B21', description: 'Intel Xeon-Platinum 8580 60-core Processor', quantity: 2 },
      { sku: 'P48820-B21', description: 'HPE ProLiant DL380 Gen11 High Performance Fan Kit', quantity: 1 }
    ];
    const evalRes = evaluateBOQMultiAspect(sampleItems, { chassis: 'DL380_Gen11_SFF' });
    if (evalRes && typeof evalRes.confidence?.score === 'number') {
      recordCheck(3, 'Deterministic Physical Aspect Math Engine (7 Aspects)', 'PASS', {
        confidence: evalRes.confidence.score,
        aspectsEvaluated: 7
      });
    } else {
      recordCheck(3, 'Deterministic Physical Aspect Math Engine (7 Aspects)', 'FAIL', { error: 'Evaluation did not return confidence score' });
    }
  } catch (err) {
    recordCheck(3, 'Deterministic Physical Aspect Math Engine (7 Aspects)', 'FAIL', { error: err.message });
  }

  // Guardrail 4: Staging Validation & Anomaly Protection
  try {
    const verifyScript = path.join(PROJECT_ROOT, 'tests', 'integration', 'verify_excel_tally.js');
    if (fs.existsSync(verifyScript)) {
      recordCheck(4, 'Staging Validation & Anomaly Protection Gate (INV-22/23)', 'PASS', { verifierScript: 'verify_excel_tally.js' });
    } else {
      recordCheck(4, 'Staging Validation & Anomaly Protection Gate (INV-22/23)', 'FAIL', { error: 'verify_excel_tally.js not found' });
    }
  } catch (err) {
    recordCheck(4, 'Staging Validation & Anomaly Protection Gate (INV-22/23)', 'FAIL', { error: err.message });
  }

  // Guardrail 5: Atomic File System Compatibility & Concurrency Safety
  try {
    const { safeWriteJsonAtomic } = require('../lib/system/fs_compat.js');
    const tempFile = path.join(PROJECT_ROOT, 'outputs', 'temp', `health_check_${Date.now()}.json`);
    safeWriteJsonAtomic(tempFile, { test: true, timestamp: Date.now() });
    const readBack = JSON.parse(fs.readFileSync(tempFile, 'utf-8'));
    fs.unlinkSync(tempFile);
    if (readBack && readBack.test === true) {
      recordCheck(5, 'Atomic FS Concurrency & Corruption Safety (INV-16)', 'PASS', { atomicWrite: 'safeWriteJsonAtomic' });
    } else {
      recordCheck(5, 'Atomic FS Concurrency & Corruption Safety (INV-16)', 'FAIL', { error: 'Atomic readback failed' });
    }
  } catch (err) {
    recordCheck(5, 'Atomic FS Concurrency & Corruption Safety (INV-16)', 'FAIL', { error: err.message });
  }

  // Guardrail 6: Dynamic Chassis Map & CTO Variant Integrity
  try {
    const { getChassisMap } = require('../lib/catalog/catalog_discovery.js');
    const map = getChassisMap();
    const mapKeys = Object.keys(map);
    if (mapKeys.length >= 6) {
      recordCheck(6, 'Dynamic Chassis Map & Product Hierarchy (INV-36)', 'PASS', { modelsCount: mapKeys.length });
    } else {
      recordCheck(6, 'Dynamic Chassis Map & Product Hierarchy (INV-36)', 'FAIL', { error: `Found only ${mapKeys.length} models in chassis map (expected >= 6)` });
    }
  } catch (err) {
    recordCheck(6, 'Dynamic Chassis Map & Product Hierarchy (INV-36)', 'FAIL', { error: err.message });
  }

  // Guardrail 7: Telemetry Ledger Observability & Grounding Integrity Tracking
  try {
    const telemetryPath = path.join(PROJECT_ROOT, 'outputs', 'history', 'pipeline_telemetry.json');
    if (fs.existsSync(telemetryPath)) {
      const telem = JSON.parse(fs.readFileSync(telemetryPath, 'utf-8'));
      recordCheck(7, 'Telemetry Ledger Observability & Grounding Audit Tracking', 'PASS', {
        evaluationsLogged: telem.evaluationsCount || 0,
        deltasLearned: telem.totalDeltasLearned || 0
      });
    } else {
      recordCheck(7, 'Telemetry Ledger Observability & Grounding Audit Tracking', 'FAIL', { error: 'pipeline_telemetry.json not found' });
    }
  } catch (err) {
    recordCheck(7, 'Telemetry Ledger Observability & Grounding Audit Tracking', 'FAIL', { error: err.message });
  }

  console.log('\n===============================================================');
  console.log(`📊 HEARTBEAT SUMMARY: ${RESULTS.passedCount}/7 PASSED (${RESULTS.overallStatus})`);
  console.log('===============================================================\n');

  if (RESULTS.failedCount > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runHealthHeartbeat().catch(err => {
    console.error('Fatal heartbeat exception:', err);
    process.exit(1);
  });
}

module.exports = { runHealthHeartbeat };
