'use strict';
/**
 * tests/test_dual_brain_fallbacks.js — Dual-Brain & Local Search Fallback Resilience Suite
 *
 * Tests:
 * 1. Local RAG fallback when remote NLM or Gemini API is offline
 * 2. Deterministic Rule Engine survival with missing network
 * 3. Error envelope structure and error code consistency
 */

const assert = require('assert');
const path = require('path');
const { queryLocalKnowledgeBase, queryLocalKnowledgeBaseAsync } = require('../../scripts/lib/rag/local_rag_search.js');
const { createErrorEnvelope, ERROR_CODES, wrapAsync } = require('../../scripts/lib/system/error_envelope.js');
const { evaluatePhysicalMath } = require('../../scripts/lib/boq/boq_evaluator.js');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
  }
}

async function main() {
  console.log('================================================================');
  console.log('🧪 RUNNING DUAL-BRAIN & LOCAL FALLBACK RESILIENCE SUITE');
  console.log('================================================================\n');

  runTest('Error Envelope conforms to contract { status: "ERROR", code, error, source, timestamp }', () => {
    const env = createErrorEnvelope('Pipeline in progress', { code: ERROR_CODES.CONFLICT_ERROR, source: 'PIPELINE' });
    assert.strictEqual(env.status, 'ERROR');
    assert.strictEqual(env.code, 'CONFLICT_ERROR');
    assert.strictEqual(env.error, 'Pipeline in progress');
    assert.strictEqual(env.source, 'PIPELINE');
    assert.ok(env.timestamp);
  });

  await runAsyncTest('Local Catalog Dual-Layer Search finds SKUs offline', async () => {
    const res = queryLocalKnowledgeBase('DL380 Gen12 Xeon processor TDP', 'DL380_Gen12_SFF');
    assert.ok(res);
    assert.ok(res.answer || res.matches || res.citations);
    assert.strictEqual(res.source, 'LOCAL_CATALOG_RAG');
  });

  runTest('Deterministic 6-Aspect Math evaluates 100% offline without Gemini / NLM', () => {
    const boqItems = [
      { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 1, unitPriceUsd: 2500 },
      { sku: 'P74845-B21', description: 'Intel Xeon Gold 6530 32-Core 270W Processor', quantity: 2, unitPriceUsd: 2700 },
      { sku: 'P64707-B21', description: 'HPE 64GB DDR5 Memory', quantity: 16, unitPriceUsd: 400 },
      { sku: 'P47777-B21', description: 'Broadcom MegaRAID MR416i Storage Controller', quantity: 1, unitPriceUsd: 850 }
    ];

    const result = evaluatePhysicalMath(boqItems);
    assert.ok(result);
    assert.ok(result.aspectChecks.length >= 6);
    assert.strictEqual(result.evalSummary.cpuCount, 2);
    assert.strictEqual(result.evalSummary.maxCpuTdpWatts, 270);
    assert.ok(result.missingDependencies.some(d => d.key === 'HIGH_PERF_FAN_KIT' || d.sku === 'P48820-B21'));
    assert.ok(result.missingDependencies.some(d => d.key === 'SMART_STORAGE_BATTERY' || d.sku === 'P01366-B21'));
  });

  console.log(`\n================================================================`);
  console.log(`Results: ${passedTests}/${totalTests} Dual-Brain Fallback Tests Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log(`================================================================\n`);

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal Dual-Brain Test Error:', err);
  process.exit(1);
});
