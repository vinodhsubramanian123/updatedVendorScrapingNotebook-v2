'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { LifecycleEngine, CANONICAL_BOQ_PHASES } = require('../../scripts/lib/lifecycle/lifecycle_engine.js');

test('LifecycleEngine — Registers and retrieves canonical pipeline phases', () => {
  const engine = new LifecycleEngine();
  const phases = engine.getPhases();

  assert.strictEqual(phases.length, 10);
  assert.strictEqual(phases[0].id, 'INGESTION');
  assert.strictEqual(phases[1].id, 'FINGERPRINTING');
  assert.strictEqual(phases[9].id, 'DELIVERABLES_FINALIZATION');
});

test('LifecycleEngine — Executes phases, logs checklists, and evaluates health', () => {
  const engine = new LifecycleEngine();

  // Start & Complete Phase 1
  engine.startPhase('INGESTION', { file: 'test.csv' });
  engine.completePhase('INGESTION', 'PASSED', { rows: 5 }, [
    { label: 'CSV Ingestion', status: 'PASS', details: '5 items' }
  ]);

  // Start & Complete Phase 2
  engine.startPhase('FINGERPRINTING', { sha256: 'abc123' });
  engine.completePhase('FINGERPRINTING', 'PASSED', { sha256: 'abc123' }, [
    { label: 'Hash Verification', status: 'PASS', details: 'SHA-256 match' }
  ]);

  const summary = engine.exportSummary();
  assert.strictEqual(summary.phase_1.status, 'PASSED');
  assert.strictEqual(summary.phase_2.status, 'PASSED');
  assert.strictEqual(summary.phase_1.checklistItems.length, 1);

  // Health: should report missing remaining mandatory phases
  const healthIncomplete = engine.getHealth();
  assert.strictEqual(healthIncomplete.healthy, false);
  assert.ok(healthIncomplete.gaps.includes('PHASE_DOMAIN_ASPECTS_MISSING'));
});

test('LifecycleEngine — Custom pipeline execution with 100% health', () => {
  const customPhases = [
    { id: 'PARSE', phaseNum: 1, name: 'Parse Input', mandatory: true, dependsOn: [] },
    { id: 'EVALUATE', phaseNum: 2, name: 'Evaluate Constraints', mandatory: true, dependsOn: ['PARSE'] }
  ];

  const engine = new LifecycleEngine('custom_test', customPhases);
  engine.startPhase('PARSE');
  engine.completePhase('PARSE', 'PASSED');

  engine.startPhase('EVALUATE');
  engine.completePhase('EVALUATE', 'PASSED');

  const health = engine.getHealth();
  assert.strictEqual(health.healthy, true);
  assert.strictEqual(health.workflowStatus, 'COMPLETE');
  assert.strictEqual(health.gaps.length, 0);
});

test('LifecycleEngine — F08: Checklist FAIL degrades requested PASSED to FAILED', () => {
  const customPhases = [
    { id: 'PHASE_A', phaseNum: 1, name: 'Phase A', mandatory: true, dependsOn: [] }
  ];
  const engine = new LifecycleEngine('negative_checklist_test', customPhases);
  engine.startPhase('PHASE_A');

  // Caller attempts to pass 'PASSED', but checklist contains a FAIL
  const record = engine.completePhase('PHASE_A', 'PASSED', {}, [
    { label: 'Check 1', status: 'PASS' },
    { label: 'Check 2', status: 'FAIL', details: 'Missing mandatory power cord' }
  ]);

  assert.strictEqual(record.status, 'FAILED');

  const health = engine.getHealth();
  assert.strictEqual(health.healthy, false);
  assert.strictEqual(health.workflowStatus, 'FAILED');
  assert.ok(health.failures.includes('PHASE_PHASE_A_FAILED'));
});

test('LifecycleEngine — F08: Errors degrade requested PASSED to FAILED', () => {
  const customPhases = [
    { id: 'PHASE_B', phaseNum: 1, name: 'Phase B', mandatory: true, dependsOn: [] }
  ];
  const engine = new LifecycleEngine('negative_error_test', customPhases);
  engine.startPhase('PHASE_B');

  // Caller attempts to pass 'PASSED', but explicit errors are provided
  const record = engine.completePhase('PHASE_B', 'PASSED', {}, [], [], ['Severe schema corruption']);

  assert.strictEqual(record.status, 'FAILED');

  const health = engine.getHealth();
  assert.strictEqual(health.healthy, false);
  assert.strictEqual(health.workflowStatus, 'FAILED');
  assert.ok(health.failures.includes('PHASE_PHASE_B_FAILED'));
});

test('LifecycleEngine — F08: Prerequisite failure blocks dependent phase start', () => {
  const customPhases = [
    { id: 'STEP_1', phaseNum: 1, name: 'Step 1', mandatory: true, dependsOn: [] },
    { id: 'STEP_2', phaseNum: 2, name: 'Step 2', mandatory: true, dependsOn: ['STEP_1'] }
  ];
  const engine = new LifecycleEngine('prereq_test', customPhases);

  // Step 1 fails
  engine.startPhase('STEP_1');
  engine.completePhase('STEP_1', 'FAILED');

  // Step 2 started after prerequisite failure is blocked
  assert.throws(() => engine.startPhase('STEP_2'), /blocked by STEP_1/);
});

test('LifecycleEngine — F08: Dynamic phase registration tracks extensions in health', () => {
  const engine = new LifecycleEngine('dynamic_test', [
    { id: 'CORE_1', phaseNum: 1, name: 'Core 1', mandatory: true, dependsOn: [] }
  ]);

  // Register extension phase explicitly
  engine.registerPhase({ id: 'OCR_FALLBACK_EXT', phaseNum: 2, name: 'OCR Fallback Extension', mandatory: false, dependsOn: [] });
  assert.strictEqual(engine.getPhases().length, 2);
  const extPhase = engine.getPhases().find(p => p.id === 'OCR_FALLBACK_EXT');
  assert.ok(extPhase);
  assert.strictEqual(extPhase.name, 'OCR Fallback Extension');

  engine.startPhase('OCR_FALLBACK_EXT');
  engine.completePhase('OCR_FALLBACK_EXT', 'PASSED');
  const summary = engine.exportSummary();
  assert.ok(summary.phase_2);
  assert.strictEqual(summary.phase_2.status, 'PASSED');
});
