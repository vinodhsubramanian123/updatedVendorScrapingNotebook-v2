'use strict';
/**
 * tests/unit/test_conditional_visibility_and_ambient_gates.js
 *
 * Validates Phase 1 & Phase 2 conditional SKU visibility and ambient gate logic:
 * 1. classifyRule() recognizes AMBIENT_GATE and TDP_GATE rules
 * 2. computeSkuHash() includes visibilityState in hash payload
 * 3. isSkuVisibleAtDefaultAmbient() detects gated SKUs from conditional_skus.json
 * 4. DOM extraction functions exist and export correctly
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { classifyRule } = require('../../scripts/lib/catalog/catalog_rules.js');
const { computeSkuHash } = require('../../scripts/lib/catalog/checksum_diff.js');
const { isSkuVisibleAtDefaultAmbient } = require('../../scripts/lib/conflict/least_delta_combinator.js');
const { extractHiddenElements, probeConditionalSkuVisibility } = require('../../scripts/lib/scraper/dom_extract.js');

console.log('🧪 Starting test_conditional_visibility_and_ambient_gates...');

// Test 1: Ambient Temperature Gate Classification
{
  const ruleText = 'Supported with ambient temperature of 27°C or below.';
  const rule = classifyRule(ruleText, 'Accelerators', 'NVIDIA GPUs');
  assert.strictEqual(rule.ruleType, 'CONDITIONAL_VISIBILITY', 'Should classify as CONDITIONAL_VISIBILITY');
  assert.strictEqual(rule.conditionType, 'AMBIENT_GATE', 'Should be AMBIENT_GATE');
  assert.strictEqual(rule.conditionKey, 'ambientTempC');
  assert.strictEqual(rule.conditionOperator, 'lte', 'Should detect <= or below as lte');
  assert.strictEqual(rule.thresholdValue, 27, 'Should parse 27 deg C');
  assert.strictEqual(rule.portalVerificationRequired, true);
  console.log('  ✅ Test 1 Passed: Ambient Temperature Gate classified accurately (27°C lte)');
}

// Test 2: TDP Gate Classification
{
  const ruleText = 'Requires High Performance Fan Kit when CPU TDP > 240W.';
  const rule = classifyRule(ruleText, 'Processor Options', 'Intel Xeon');
  assert.strictEqual(rule.ruleType, 'CONDITIONAL_VISIBILITY', 'Should classify as CONDITIONAL_VISIBILITY');
  assert.strictEqual(rule.conditionType, 'TDP_GATE', 'Should be TDP_GATE');
  assert.strictEqual(rule.conditionKey, 'cpuTdpWatts');
  assert.strictEqual(rule.conditionOperator, 'gte');
  assert.strictEqual(rule.thresholdValue, 240, 'Should parse 240W');
  console.log('  ✅ Test 2 Passed: TDP Gate classified accurately (240W gte)');
}

// Test 3: computeSkuHash includes visibilityState
{
  const skuVisible = {
    'Product #': 'P47824-B21',
    Description: 'NVIDIA H200 NVL 141GB GPU',
    'List Price (USD)': 35000,
    'Option Type': 'CTO',
    visibilityState: 'VISIBLE'
  };
  const skuHidden = {
    ...skuVisible,
    visibilityState: 'HIDDEN_IN_DEFAULT_DOM_STATE',
    conditionType: 'AMBIENT_GATE'
  };
  const hash1 = computeSkuHash(skuVisible);
  const hash2 = computeSkuHash(skuHidden);
  assert.notStrictEqual(hash1, hash2, 'Hash must differ when visibilityState changes');
  console.log('  ✅ Test 3 Passed: computeSkuHash is visibility-state sensitive');
}

// Test 4: isSkuVisibleAtDefaultAmbient detection
{
  // Test with non-existent catalogDir (should fail open safely)
  const safeRes = isSkuVisibleAtDefaultAmbient('P47824-B21', '/non/existent/dir');
  assert.strictEqual(safeRes.isVisible, true, 'Should fail open to true when file absent');

  // Test with mock directory and conditional_skus.json
  const tmpDir = path.join(__dirname, '..', 'fixtures', 'mock_catalog_conditional');
  const rawDir = path.join(tmpDir, 'raw_data');
  fs.mkdirSync(rawDir, { recursive: true });
  const mockConditional = {
    timestamp: new Date().toISOString(),
    totalConditionalSkus: 1,
    skus: [
      {
        sku: 'P47824-B21',
        conditionType: 'AMBIENT_GATE',
        operator: 'lte',
        thresholdDegC: 27,
        evidence: 'Requires ambient <= 27C'
      }
    ]
  };
  fs.writeFileSync(path.join(rawDir, 'conditional_skus.json'), JSON.stringify(mockConditional));

  const gatedRes = isSkuVisibleAtDefaultAmbient('P47824-B21', tmpDir);
  assert.strictEqual(gatedRes.isVisible, false, 'Gated SKU must return isVisible: false');
  assert.strictEqual(gatedRes.conditionType, 'AMBIENT_GATE');
  assert.strictEqual(gatedRes.thresholdDegC, 27);

  const ungatedRes = isSkuVisibleAtDefaultAmbient('P48820-B21', tmpDir);
  assert.strictEqual(ungatedRes.isVisible, true, 'Unlisted SKU must return isVisible: true');

  // Cleanup mock
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('  ✅ Test 4 Passed: isSkuVisibleAtDefaultAmbient correctly detects gated SKUs');
}

// Test 5: DOM extraction functions are exported
{
  assert.strictEqual(typeof extractHiddenElements, 'function', 'extractHiddenElements must be a function');
  assert.strictEqual(typeof probeConditionalSkuVisibility, 'function', 'probeConditionalSkuVisibility must be a function');
  console.log('  ✅ Test 5 Passed: DOM extraction functions export cleanly');
}

console.log('🎉 All test_conditional_visibility_and_ambient_gates tests passed successfully!\n');
process.exit(0);
