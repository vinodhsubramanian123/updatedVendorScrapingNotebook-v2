'use strict';
/**
 * tests/unit/test_evidence_ledger.js — Unit tests for EvidenceLedger & Shared State
 */

const { describe, test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createEvidenceLedger } = require('../../scripts/lib/system/evidence_ledger.js');

describe('Evidence Ledger & Shared State Suite', () => {
  const tempDir = path.join(__dirname, '..', '..', 'outputs', 'temp', `test_ledger_${Date.now()}`);

  after(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('1. Initializes with unique trace ID and tracks customer input and shared state', () => {
    const ledger = createEvidenceLedger({
      chassis: 'DL380_Gen11',
      serverCount: 4,
      formFactor: '12LFF'
    });

    assert.ok(ledger.traceId.startsWith('TRC-'), 'Expected trace ID to start with TRC-');
    assert.strictEqual(ledger.chassis, 'DL380_Gen11');
    assert.strictEqual(ledger.sharedState.nodeMultiplier, 4);
    assert.strictEqual(ledger.sharedState.detectedFormFactor, '12LFF');
  });

  test('2. Records phases, duration, status, checks, and warnings', () => {
    const ledger = createEvidenceLedger({ chassis: 'DL380_Gen11' });

    ledger.startPhase(1, 'Intake & CTO Normalization', { lineCount: 15 });
    ledger.completePhase(1, 'PASSED', { normalizedItems: 15 }, [
      { check: 'All lines valid HPE SKUs', passed: true }
    ]);

    const p1 = ledger.phases['phase_1'];
    assert.ok(p1, 'Phase 1 record must exist');
    assert.strictEqual(p1.phaseName, 'Intake & CTO Normalization');
    assert.strictEqual(p1.status, 'PASSED');
    assert.strictEqual(p1.checks.length, 1);
    assert.ok(p1.durationMs >= 0);
  });

  test('3. Records SKU audit decisions and active knowledge rules reached', () => {
    const ledger = createEvidenceLedger({ chassis: 'DL380_Gen11' });

    ledger.recordSkuAudit('P49619-B21', 'RETAINED_BASELINE', 'Preserved in Rank 1', 'RULE_INTENT_PRESERVED', 'Processor');
    ledger.recordSkuAudit('P67082-B21', 'MODERNIZED_PLATFORM', '5th Gen Emerald Rapids upgrade', 'RULE_81354490', 'Modernized Platform Hardware');

    assert.strictEqual(ledger.skuAuditLedger.length, 2);
    assert.strictEqual(ledger.skuAuditLedger[0].sku, 'P49619-B21');
    assert.strictEqual(ledger.skuAuditLedger[1].action, 'MODERNIZED_PLATFORM');

    ledger.recordActiveRuleReached({
      ruleId: 'DELTA_GEN5_MODERNIZE',
      ruleType: 'GENERATIONAL_MODERNIZATION',
      affectedSku: 'P49619-B21',
      requiredDependencySku: 'P67082-B21',
      reasoning: 'Emerald Rapids modernization'
    });

    assert.strictEqual(ledger.activeRulesReached.length, 1);
    assert.strictEqual(ledger.sharedState.activeDeltaCount, 1);
  });

  test('4. Finalizes and exports JSON evidence log and Markdown summary', () => {
    const ledger = createEvidenceLedger({ chassis: 'DL380_Gen11', serverCount: 2 });
    ledger.startPhase(1, 'Test Phase', {});
    ledger.completePhase(1, 'PASSED', { ok: true });

    const { jsonPath, mdPath, payload } = ledger.finalizeAndExport(tempDir);

    assert.ok(fs.existsSync(jsonPath), 'JSON evidence log must exist on disk');
    assert.ok(fs.existsSync(mdPath), 'Markdown summary must exist on disk');
    assert.strictEqual(payload.chassis, 'DL380_Gen11');

    const contentJson = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    assert.strictEqual(contentJson.traceId, ledger.traceId);

    const contentMd = fs.readFileSync(mdPath, 'utf-8');
    assert.ok(contentMd.includes('Antigravity Execution Trace & Shared State Evidence Log'));
  });
});
