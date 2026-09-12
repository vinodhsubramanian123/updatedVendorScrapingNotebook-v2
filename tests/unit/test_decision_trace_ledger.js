'use strict';

const test = require('node:test');
const assert = require('node:assert');
const {
  DecisionTraceLedger,
  createDecisionTraceLedger
} = require('../../scripts/lib/conflict/decision_trace.js');

// ═══════════════════════════════════════════════════════════════════════════════
// Construction & Session ID
// ═══════════════════════════════════════════════════════════════════════════════

test('DecisionTrace — Constructor assigns session ID', () => {
  const ledger = new DecisionTraceLedger('TEST-SESSION-42');
  assert.strictEqual(ledger.sessionId, 'TEST-SESSION-42');
  assert.ok(Array.isArray(ledger.decisions));
  assert.strictEqual(ledger.decisions.length, 0);
});

test('DecisionTrace — Auto-generates session ID when none provided', () => {
  const ledger = createDecisionTraceLedger();
  assert.ok(ledger.sessionId.startsWith('SESSION-'));
});

// ═══════════════════════════════════════════════════════════════════════════════
// recordDecision
// ═══════════════════════════════════════════════════════════════════════════════

test('DecisionTrace — Records a decision with all fields', () => {
  const ledger = createDecisionTraceLedger('UNIT-TEST');
  const entry = ledger.recordDecision({
    decisionPoint: 'PIVOT_STORAGE_CONTROLLER_TO_PCIE',
    trigger: 'Contested OCP Slot 1: dual OCP NICs + OCP RAID',
    alternativesEvaluated: [
      {
        id: 'KEEP_OCP_CONTROLLER',
        description: 'Keep OCP RAID controller, drop one OCP NIC',
        pros: ['Preserves storage form factor'],
        cons: ['Loses 25GbE NIC requested by customer'],
        capExDeltaUsd: -350,
        status: 'REJECTED',
        rejectionReason: 'Customer explicitly requested dual 25GbE NICs'
      },
      {
        id: 'PIVOT_TO_PCIE_STANDUP',
        description: 'Swap OCP RAID to PCIe MR416i-p standup',
        pros: ['Preserves both OCP NICs', '100% buildable'],
        cons: ['Uses PCIe slot'],
        capExDeltaUsd: 50,
        status: 'SELECTED'
      }
    ],
    selectedAlternative: {
      id: 'PIVOT_TO_PCIE_STANDUP',
      description: 'Swap OCP RAID to PCIe standup',
      capExDeltaUsd: 50,
      selectionRationale: 'Preserves customer 25GbE NIC requirement with no functional loss'
    },
    downstreamImpact: ['P48918-B21', 'P56073-B21'],
    confidence: 0.95
  });

  assert.ok(entry.decisionId.startsWith('DEC-'));
  assert.ok(entry.timestamp);
  assert.strictEqual(entry.decisionPoint, 'PIVOT_STORAGE_CONTROLLER_TO_PCIE');
  assert.strictEqual(entry.alternativesCount, 2);
  assert.strictEqual(entry.alternativesEvaluated[0].status, 'REJECTED');
  assert.strictEqual(entry.alternativesEvaluated[1].status, 'SELECTED');
  assert.strictEqual(entry.selectedAlternative.id, 'PIVOT_TO_PCIE_STANDUP');
  assert.deepStrictEqual(entry.downstreamImpact, ['P48918-B21', 'P56073-B21']);
  assert.strictEqual(entry.confidence, 0.95);
});

test('DecisionTrace — Accumulates multiple decisions', () => {
  const ledger = createDecisionTraceLedger();
  ledger.recordDecision({ decisionPoint: 'DECISION_A', trigger: 'Trigger A' });
  ledger.recordDecision({ decisionPoint: 'DECISION_B', trigger: 'Trigger B' });
  ledger.recordDecision({ decisionPoint: 'DECISION_C', trigger: 'Trigger C' });

  const all = ledger.getDecisions();
  assert.strictEqual(all.length, 3);
  assert.strictEqual(all[0].decisionPoint, 'DECISION_A');
  assert.strictEqual(all[2].decisionPoint, 'DECISION_C');
});

test('DecisionTrace — Handles empty alternatives gracefully', () => {
  const ledger = createDecisionTraceLedger();
  const entry = ledger.recordDecision({
    decisionPoint: 'SIMPLE_FIX',
    trigger: 'Missing cable kit'
  });

  assert.strictEqual(entry.alternativesCount, 0);
  assert.deepStrictEqual(entry.alternativesEvaluated, []);
  assert.strictEqual(entry.selectedAlternative, null);
  assert.deepStrictEqual(entry.downstreamImpact, []);
  assert.strictEqual(entry.confidence, 1.0);
});

test('DecisionTrace — Defaults string fields for null inputs', () => {
  const ledger = createDecisionTraceLedger();
  const entry = ledger.recordDecision({
    decisionPoint: null,
    trigger: undefined
  });

  assert.strictEqual(entry.decisionPoint, 'GENERAL_RESOLUTION');
  assert.strictEqual(entry.trigger, 'Aspect check conflict');
});

// ═══════════════════════════════════════════════════════════════════════════════
// toMarkdownSummary
// ═══════════════════════════════════════════════════════════════════════════════

test('DecisionTrace — Markdown summary for zero decisions', () => {
  const ledger = createDecisionTraceLedger();
  const md = ledger.toMarkdownSummary();
  assert.ok(md.includes('No alternative substitutions'), 'Should say no substitutions');
});

test('DecisionTrace — Markdown summary includes decision point and trigger', () => {
  const ledger = createDecisionTraceLedger();
  ledger.recordDecision({
    decisionPoint: 'THERMAL_HEATSINK_UPGRADE',
    trigger: 'TDP >= 300W requires P48818-B21',
    alternativesEvaluated: [
      { id: 'STANDARD_HEATSINK', description: 'Default heatsink', status: 'REJECTED', rejectionReason: 'Cannot dissipate 300W TDP' },
      { id: 'HIGH_PERF_HEATSINK', description: 'P48818-B21', status: 'SELECTED' }
    ],
    selectedAlternative: { id: 'HIGH_PERF_HEATSINK', description: 'P48818-B21' },
    downstreamImpact: ['P48820-B21']
  });

  const md = ledger.toMarkdownSummary();
  assert.ok(md.includes('THERMAL_HEATSINK_UPGRADE'), 'Must mention decision point');
  assert.ok(md.includes('TDP >= 300W'), 'Must mention trigger');
  assert.ok(md.includes('STANDARD_HEATSINK'), 'Must mention rejected alternative');
  assert.ok(md.includes('P48820-B21'), 'Must mention downstream impact');
});

test('DecisionTrace — Persist ledger and loadHistoricalDecisionTraces', () => {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const { loadHistoricalDecisionTraces } = require('../../scripts/lib/conflict/decision_trace.js');

  const tmpDir = path.join(os.tmpdir(), `test_traces_${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  const ledger = createDecisionTraceLedger('TRACE-PERSIST-TEST');
  ledger.recordDecision({
    decisionPoint: 'TEST_PERSIST_POINT',
    trigger: 'Unit test execution',
    selectedAlternative: { id: 'ALT_1', description: 'Selected option' }
  });

  const targetPath = path.join(tmpDir, 'decision_traces.json');
  const saved = ledger.persistLedger(targetPath);
  assert.strictEqual(saved, targetPath);
  assert.ok(fs.existsSync(targetPath));

  const loaded = loadHistoricalDecisionTraces(tmpDir);
  assert.ok(Array.isArray(loaded));
  assert.strictEqual(loaded.length, 1);
  assert.strictEqual(loaded[0].sessionId, 'TRACE-PERSIST-TEST');
  assert.strictEqual(loaded[0].decisions.length, 1);

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
