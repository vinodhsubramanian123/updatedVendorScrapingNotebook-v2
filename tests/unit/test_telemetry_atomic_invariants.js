'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const { loadTelemetry, recordEvaluationTelemetry, recordGuardrailTelemetry } = require('../../scripts/lib/system/telemetry');
const { safeWriteJsonAtomic } = require('../../scripts/lib/system/fs_compat');

test('Telemetry Invariants — Atomic Write Safety', () => {
  const tempLedger = path.resolve('outputs', 'temp', 'test_telemetry_atomic_tmp.json');
  const payload = { testRunId: 'test-' + Date.now(), status: 'SUCCESS', verified: true };
  
  const writeRes = safeWriteJsonAtomic(tempLedger, payload);
  assert.strictEqual(writeRes.success, true, 'safeWriteJsonAtomic should return success=true');
  assert.ok(fs.existsSync(tempLedger), 'Temp ledger file must exist');

  const readBack = JSON.parse(fs.readFileSync(tempLedger, 'utf8'));
  assert.strictEqual(readBack.testRunId, payload.testRunId);
  assert.strictEqual(readBack.verified, true);

  // Clean up
  try { fs.unlinkSync(tempLedger); } catch (_) {}
});

test('Telemetry Invariants — Load Telemetry Payload Schema', () => {
  const data = loadTelemetry();
  assert.ok(data, 'Telemetry object must load');
  assert.ok(data.version, 'Version must be defined');
  assert.ok(Array.isArray(data.history), 'History must be an array');
});

test('Telemetry Invariants — Record Guardrail Telemetry', () => {
  const mockGuardrail = {
    chassisId: 'DL380_Gen12',
    turns: 2,
    success: true,
    toolCallCounts: { query_catalog_db: 1, simulate_build: 1 },
    durationMs: 450
  };

  const entry = recordGuardrailTelemetry(mockGuardrail, 'DL380_Gen12', 0.8, 1.0);
  assert.ok(entry, 'Guardrail telemetry entry should be returned');
  assert.strictEqual(entry.id.startsWith('GUARD-'), true);
  assert.strictEqual(entry.success, true);
  assert.strictEqual(entry.confidenceLift, 0.2);
});
