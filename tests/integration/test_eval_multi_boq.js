'use strict';
/**
 * tests/integration/test_eval_multi_boq.js
 *
 * Tests for scripts/evaluators/eval_multi_boq.js:
 * - Validates CLI argument checks (missing file returns non-zero error)
 * - Validates non-Excel single file fallback execution in --json mode
 */

const test = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const MULTI_EVAL_SCRIPT = path.join(__dirname, '../../scripts/evaluators/eval_multi_boq.js');

test('eval_multi_boq exits with error when input file is missing', () => {
  let failed = false;
  try {
    execSync(`node "${MULTI_EVAL_SCRIPT}" /path/to/nonexistent/file.xlsx --json`, { stdio: 'pipe' });
  } catch (err) {
    failed = true;
    assert.strictEqual(err.status, 1);
  }
  assert.strictEqual(failed, true, 'Should fail when file does not exist');
});

test('eval_multi_boq executes single text configuration in JSON mode', () => {
  const tmpFile = path.join(os.tmpdir(), `test_single_config_${Date.now()}.json`);
  const boqPayload = [
    { sku: 'P52559-B21', qty: 1, description: 'HPE ProLiant DL380 Gen12 8SFF NC CTO Server' },
    { sku: 'P49610-B21', qty: 2, description: 'Intel Xeon-Gold 6430 2.1GHz 32-core 270W Processor' }
  ];
  fs.writeFileSync(tmpFile, JSON.stringify(boqPayload, null, 2));

  try {
    const output = execSync(`node "${MULTI_EVAL_SCRIPT}" "${tmpFile}" --json`, {
      encoding: 'utf-8',
      env: { ...process.env, STRUCTURED_PROGRESS: '0', LOCAL_EVAL_ONLY: '1' }
    });

    const parsed = JSON.parse(output.trim());
    assert.ok(Array.isArray(parsed), 'Output must be an array');
    assert.strictEqual(parsed.length, 1);
    assert.strictEqual(parsed[0].sheetName, 'Default');
    assert.ok(parsed[0].status === 'SUCCESS' || parsed[0].status === 'ERROR');
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
});
