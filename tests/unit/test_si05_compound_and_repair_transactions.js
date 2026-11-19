'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { planPresalesQuery } = require('../../scripts/lib/boq/presales_query_planner.js');
const { executeWithQueryShadow, SHADOW_CONTRACT } = require('../../scripts/lib/boq/presales_query_shadow.js');
const {
  CORE_OBJECTIVE_PATHS,
  qualifyObjectivePath,
  buildCompoundExecutionPlan,
  executeCompoundWorkflow
} = require('../../scripts/lib/boq/compound_execution.js');
const {
  applyManifestDelta,
  computeManifestSha256,
  executeVerifiedRepairTransaction,
  executeRepairSession,
  reconcileBlockers
} = require('../../scripts/lib/conflict/repair_transactions.js');
const counterfactualRepair = require('../../scripts/lib/system/counterfactual_repair.js');
const { verifyDeliveryAuthorization } = require('../../scripts/lib/contracts/workflow_contract.js');
const { verifyCurrentPortalReceipt } = require('../../scripts/lib/boq/portal_receipt.js');
const { candidateReviewCurrent } = require('../../scripts/lib/boq/solution_evidence.js');
const { executeRoutedQuery } = require('../../scripts/evaluators/route_query.js');
const { extractRequirementRecords } = require('../../scripts/lib/boq/requirements/requirement_records.js');

function deepFreeze(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  Object.freeze(obj);
  for (const val of Object.values(obj)) {
    if (val && typeof val === 'object' && !Object.isFrozen(val)) deepFreeze(val);
  }
  return obj;
}

test('repair transactions roll back when candidate validation is missing or empty', async () => {
  const baseline = deepFreeze({ items: [{ sku: 'CPU', quantity: 1 }], errors: [] });
  for (const validateFn of [undefined, () => null, () => undefined, () => ({}), () => false, () => ({ isValid: null, errors: null })]) {
    const tx = await executeVerifiedRepairTransaction(baseline, { action: 'REMOVE', sku: 'CPU' }, { validateFn });
    assert.equal(tx.outcome, 'ROLLED_BACK');
    assert.match(tx.rollbackReason, /VALIDATION_(?:REQUIRED|RESULT_REQUIRED)/);
    assert.equal(tx.state.items[0].quantity, 1);
    assert.equal(tx.validation, null);
  }
});

test('repair sessions without baseline validation cannot declare an unchecked baseline solved', async () => {
  const baseline = { items: [{ sku: 'CPU', quantity: 1 }] };
  for (const validateFn of [undefined, () => null, () => ({}), () => { throw new Error('validation unavailable'); }]) {
    const session = await executeRepairSession({ baseline, proposals: [], validateFn });
    assert.equal(session.outcome, 'SEARCH_EXHAUSTED');
    assert.equal(session.iterationsRun, 0);
  }
  const checked = await executeRepairSession({ baseline, proposals: [], validateFn: () => ({ errors: [], isValid: true }) });
  assert.equal(checked.outcome, 'ACCEPTED');
});

test('packed repair arguments invoke the supplied validator and apply the requested delta', async () => {
  const baseline = deepFreeze({ items: [{ sku: 'CPU', quantity: 1 }] });
  let calls = 0;
  const tx = await executeVerifiedRepairTransaction({
    baseline,
    delta: { action: 'ADD', sku: 'RAM', quantity: 2 },
    validateFn: candidate => {
      calls++;
      assert.equal(candidate.items.find(p => p.sku === 'RAM').quantity, 2);
      return { errors: [], isValid: true };
    }
  });
  assert.equal(calls, 1);
  assert.equal(tx.outcome, 'ACCEPTED');
  assert.equal(tx.manifestChanged, true);
  assert.equal(baseline.items.length, 1);
});

test('SET_QUANTITY retains the owner and quantity scope when creating a part', () => {
  const baseline = { items: [{ sku: 'RAM', owner: 'node-a', quantity: 1 }] };
  const first = applyManifestDelta(baseline, {
    action: 'SET_QUANTITY', sku: 'RAM', owner: 'node-b', quantityScope: 'PER_NODE', quantity: 2
  });
  assert.deepEqual(first.candidate.items[1], { sku: 'RAM', owner: 'node-b', quantityScope: 'PER_NODE', quantity: 2 });
  const next = applyManifestDelta(first.candidate, { action: 'SET_QUANTITY', sku: 'RAM', owner: 'node-b', quantity: 3 });
  assert.equal(next.candidate.items.length, 2);
  assert.equal(next.candidate.items[1].quantity, 3);
  assert.equal(next.candidate.items[0].quantity, 1);
});

// 1. Compound ingest + reconcile + export with real second baseline & missing baseline block
test('SI-05 Case 1: compound ingest + reconcile + export orders steps, passes second baseline, and blocks missing baseline', async () => {
  const plan = buildCompoundExecutionPlan(
    'Ingest scanned quote, reconcile with baseline, and export Excel workbook',
    { filePath: 'scan.pdf', secondaryFilePath: 'baseline.xlsx', executeOcr: true }
  );

  assert.equal(plan.blocked, false);
  assert.equal(plan.dispatchReady, true);
  assert.deepEqual(
    plan.steps.map(s => s.operation),
    ['OCR_QUOTE_INGESTION', 'BOM_RECONCILIATION', 'WORKBOOK_GENERATION']
  );
  assert.equal(plan.pathQualifications.BOM_RECONCILIATION.mode, 'TWO_BASELINE_COMPARISON');

  // Verify each of the 6 core objective paths is qualified separately
  for (const objPath of CORE_OBJECTIVE_PATHS) {
    assert.ok(plan.pathQualifications[objPath], `Missing qualification for ${objPath}`);
  }
  assert.equal(qualifyObjectivePath('CROSS_VENDOR_TRANSFORMATION', {}, { source: { queryText: 'Evaluate BOQ' } }).blocked, true);
  assert.equal(qualifyObjectivePath('HETEROGENEOUS_TENDER_MODERNIZATION', {}).blocked, true);
  assert.equal(qualifyObjectivePath('RFP_SIZING_TO_BOM', {}, { source: { queryText: 'Size 64 cores' } }).blocked, false);
  assert.equal(qualifyObjectivePath('BOQ_EVALUATION', { items: [{ sku: 'P38997-B21', quantity: 2 }] }).blocked, false);

  const trace = [];
  const exec = await executeCompoundWorkflow(plan, { filePath: 'scan.pdf', secondaryFilePath: 'baseline.xlsx' }, {
    handlers: {
      OCR_QUOTE_INGESTION: async () => {
        trace.push('OCR');
        return { items: [{ sku: 'P38997-B21', quantity: 2 }] };
      },
      BOM_RECONCILIATION: async (_step, ctx) => {
        trace.push(`RECONCILE:${ctx.items.length}`);
        return { auditReport: { is100PercentMatch: true } };
      },
      WORKBOOK_GENERATION: async (_step, ctx) => {
        trace.push(`EXPORT:${ctx.auditReport.is100PercentMatch}`);
        return { portalWorkbookPath: 'portal.xlsx' };
      }
    }
  });
  assert.equal(exec.status, 'COMPLETED');
  assert.deepEqual(trace, ['OCR', 'RECONCILE:1', 'EXPORT:true']);

  // Missing secondary baseline without explicit SINGLE_FILE_AUDIT must block BOM_RECONCILIATION
  const missingBaselinePlan = buildCompoundExecutionPlan(
    'Reconcile quote',
    { filePath: 'quote.xlsx' }
  );
  assert.equal(missingBaselinePlan.blocked, true);
  assert.equal(missingBaselinePlan.dispatchReady, false);
  assert.equal(missingBaselinePlan.blockingReasons[0].blockerCode, 'RECONCILIATION_BASELINE_UNCONFIRMED');

  let reconcileInvoked = 0;
  const blockedExec = await executeCompoundWorkflow(missingBaselinePlan, { filePath: 'quote.xlsx' }, {
    handlers: {
      BOM_RECONCILIATION: () => { reconcileInvoked++; return {}; }
    }
  });
  assert.equal(blockedExec.status, 'BLOCKED');
  assert.equal(reconcileInvoked, 0);
  assert.equal(blockedExec.invocationLedger[missingBaselinePlan.steps[0].stepId].invocations, 0);

  // Explicit SINGLE_FILE_AUDIT is allowed separately
  const singleAuditPlan = buildCompoundExecutionPlan('Reconcile quote', {
    filePath: 'quote.xlsx',
    reconciliationMode: 'SINGLE_FILE_AUDIT'
  });
  assert.equal(singleAuditPlan.blocked, false);
  assert.equal(singleAuditPlan.pathQualifications.BOM_RECONCILIATION.mode, 'SINGLE_FILE_AUDIT');
});

// 2. Negative operation exclusions & requirementAccounting adaptation
test('SI-05 Case 2: negative operation exclusions and requirementAccounting preserve revision, order, and block excluded steps', async () => {
  const accounting = extractRequirementRecords([
    'Evaluate BOQ for DL380 Gen12',
    'Do not export Excel workbook',
    'Without cloud sync'
  ]);
  const query = 'Evaluate BOQ, reconcile with baseline, do not export Excel workbook, without cloud sync';
  const context = Object.freeze({
    filePath: 'quote.xlsx',
    secondaryFilePath: 'baseline.xlsx',
    requirementAccounting: accounting
  });

  const plannerOut = planPresalesQuery(query, context);
  assert.equal(plannerOut.requirementRevisionSha256, accounting.inputRevisionSha256);
  assert.ok(plannerOut.exclusions.some(e => e.operation === 'WORKBOOK_GENERATION'));
  assert.ok(plannerOut.exclusions.some(e => e.operation === 'KNOWLEDGE_SYNC'));
  assert.deepEqual(plannerOut.orderedOperations.map(o => o.operation), ['BOQ_EVALUATION', 'BOM_RECONCILIATION']);

  const compoundPlan = buildCompoundExecutionPlan(plannerOut, context);
  assert.ok(compoundPlan.excludedOperations.includes('WORKBOOK_GENERATION'));
  assert.ok(compoundPlan.excludedOperations.includes('KNOWLEDGE_SYNC'));
  assert.deepEqual(compoundPlan.steps.map(s => s.operation), ['BOQ_EVALUATION', 'BOM_RECONCILIATION']);

  const ran = [];
  const res = await executeCompoundWorkflow(compoundPlan, context, {
    handlers: {
      BOQ_EVALUATION: () => { ran.push('BOQ_EVALUATION'); return { isMathClean: true }; },
      BOM_RECONCILIATION: () => { ran.push('BOM_RECONCILIATION'); return { auditReport: {} }; },
      WORKBOOK_GENERATION: () => { ran.push('WORKBOOK_GENERATION'); return {}; },
      KNOWLEDGE_SYNC: () => { ran.push('KNOWLEDGE_SYNC'); return {}; }
    }
  });
  assert.equal(res.status, 'COMPLETED');
  assert.deepEqual(ran, ['BOQ_EVALUATION', 'BOM_RECONCILIATION']);

  // Direct requirementAccounting exclusions (without query-text negatives) cover reconcil/convert/optimiz/evaluat
  const directAccounting = {
    inputRevisionSha256: 'e'.repeat(64),
    records: [
      { id: 'REQ-EX-1', hardness: 'EXCLUSION', rawText: 'Do not reconcile quote' },
      { id: 'REQ-EX-2', hardness: 'EXCLUSION', rawText: 'Exclude budget optimization' },
      { id: 'REQ-EX-3', hardness: 'EXCLUSION', rawText: 'Without vendor conversion' }
    ]
  };
  const directPlan = buildCompoundExecutionPlan(
    { objective: 'BOQ_EVALUATION', transforms: ['VALUE_ENGINEERING'], requestedCapabilities: ['BOQ_EVALUATION', 'BOM_RECONCILIATION', 'VALUE_ENGINEERING', 'CROSS_VENDOR_TRANSFORMATION'] },
    { items: [{ sku: 'P38997-B21', quantity: 2 }], requirementAccounting: directAccounting },
    { requirementAccounting: directAccounting }
  );
  assert.ok(directPlan.excludedOperations.includes('BOM_RECONCILIATION'));
  assert.ok(directPlan.excludedOperations.includes('VALUE_ENGINEERING'));
  assert.ok(directPlan.excludedOperations.includes('CROSS_VENDOR_TRANSFORMATION'));
  assert.deepEqual(directPlan.steps.map(s => s.operation), ['BOQ_EVALUATION']);

  // Empty/unresolved objective with 0 steps and 0 exclusions returns BLOCKED (UNRESOLVED_NO_STEPS)
  const emptyExec = await executeCompoundWorkflow('', {});
  assert.equal(emptyExec.status, 'BLOCKED');
  assert.equal(emptyExec.blockerCode, 'UNRESOLVED_NO_STEPS');
});

// 3. Exact once-only invocation even when observer/reflection fails
test('SI-05 Case 3: once-only invocation enforced across workflow and shadow even when observer/reflection/sink fail', async () => {
  const plan = buildCompoundExecutionPlan('Evaluate BOQ and reconcile with baseline', {
    items: [{ sku: 'P38997-B21', quantity: 2 }],
    secondaryFilePath: 'baseline.xlsx'
  });

  const counts = { BOQ_EVALUATION: 0, BOM_RECONCILIATION: 0 };
  const res = await executeCompoundWorkflow(plan, { items: [{ sku: 'P38997-B21', quantity: 2 }] }, {
    handlers: {
      BOQ_EVALUATION: () => { counts.BOQ_EVALUATION++; return { isMathClean: true }; },
      BOM_RECONCILIATION: () => { counts.BOM_RECONCILIATION++; return { auditReport: {} }; }
    },
    onObserve: () => { throw new Error('observer crashed'); },
    onReflect: async () => { throw new Error('reflection crashed'); },
    onReport: () => { throw new Error('reporter crashed'); }
  });

  assert.equal(res.status, 'COMPLETED');
  assert.equal(counts.BOQ_EVALUATION, 1);
  assert.equal(counts.BOM_RECONCILIATION, 1);
  assert.equal(res.singleInvocationEnforced, true);
  assert.equal(res.observerErrors.length, 3);
  for (const step of plan.steps) {
    assert.equal(res.invocationLedger[step.stepId].invocations, 1);
  }

  // Reusing an exhausted invocationLedger rejects duplicate execution
  const dupRes = await executeCompoundWorkflow(plan, {}, {
    invocationLedger: res.invocationLedger,
    handlers: {
      BOQ_EVALUATION: () => { counts.BOQ_EVALUATION++; return {}; },
      BOM_RECONCILIATION: () => { counts.BOM_RECONCILIATION++; return {}; }
    }
  });
  assert.equal(dupRes.status, 'FAILED');
  assert.equal(dupRes.originalError.code, 'DUPLICATE_STEP_INVOCATION_BLOCKED');
  assert.equal(counts.BOQ_EVALUATION, 1);

  // CP7b shadow explicit singleInvocationEnforced contract
  assert.equal(SHADOW_CONTRACT.singleInvocationEnforced, true);
  assert.equal(executeWithQueryShadow.singleInvocationEnforced, true);
  let shadowCalls = 0;
  const shadowReports = [];
  await executeWithQueryShadow('Evaluate BOQ', {}, () => {
    shadowCalls++;
    return { classification: { intent: 'BOQ_EVALUATION' } };
  }, {
    sink: report => {
      shadowReports.push(report);
      throw new Error('sink failed after capturing report');
    }
  });
  assert.equal(shadowCalls, 1);
  assert.equal(shadowReports[0].singleInvocationEnforced, true);
});

// 4. Changed-candidate receipt invalidation
test('SI-05 Case 4: changed-candidate manifest invalidates ephemeralSourceValidation, portalReceipt, and deliveryAuthorization', async () => {
  const baseline = deepFreeze({
    chassis: 'DL380_Gen12',
    serverCount: 1,
    items: [{ sku: 'P38997-B21', quantity: 1, description: '1600W PSU' }],
    ephemeralSourceValidation: {
      success: true,
      isCloudGrounded: true,
      sourceDetached: true,
      doubleCheckVerdict: 'DOUBLE_CHECK_PASSED',
      manifestSha256: 'a'.repeat(64)
    },
    portalReceipt: {
      status: 'CLIC_ACCEPTED',
      manifestSha256: 'b'.repeat(64),
      bomPath: 'nonexistent/evidence/clic_corrected_bom.json'
    },
    portalValidationStatus: 'ACCEPTED_BY_VENDOR',
    deliveryAuthorization: {
      token: 'DELIV-AUTH-' + 'c'.repeat(64),
      signature: 'c'.repeat(64),
      manifestFingerprint: 'd'.repeat(64),
      chassisKey: 'DL380_Gen12',
      profile: 'BOQ_EVALUATION',
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 600000).toISOString()
    },
    deliveryAuthorized: true,
    evidenceStates: { documentGrounding: { status: 'GROUNDED' }, liveVendorAcceptance: { status: 'VERIFIED' } },
    acceptanceGate: { status: 'PASSED', isValid: true, blockersCount: 0 }
  });

  const tx = await executeVerifiedRepairTransaction(
    baseline,
    { action: 'ADD', sku: 'P38997-B21', quantity: 1 },
    { validateFn: () => ({ errors: [], isValid: true }) }
  );

  assert.equal(tx.outcome, 'ACCEPTED');
  assert.notEqual(tx.resultingManifestSha256, tx.parentManifestSha256);
  assert.equal(tx.receiptInvalidated, true);
  assert.equal(tx.candidate.ephemeralSourceValidation, null);
  assert.equal(tx.candidate.portalReceipt, null);
  assert.equal(tx.candidate.deliveryAuthorization, null);
  assert.equal(tx.candidate.evidenceStates, null);
  assert.equal(tx.candidate.acceptanceGate, null);
  assert.ok(tx.invalidatedReceipts.includes('evidenceStates'));
  assert.ok(tx.invalidatedReceipts.includes('acceptanceGate'));
  assert.equal(tx.candidate.portalValidationStatus, 'PORTAL VALIDATION PENDING');
  assert.equal(tx.candidate.deliveryAuthorized, false);
  assert.equal(candidateReviewCurrent(tx.candidate), false);
  assert.equal(verifyCurrentPortalReceipt(tx.candidate), null);
  assert.equal(verifyDeliveryAuthorization(tx.candidate.deliveryAuthorization, tx.resultingManifestSha256), false);

  // Baseline remains strictly untouched
  assert.equal(baseline.items[0].quantity, 1);
  assert.equal(baseline.portalValidationStatus, 'ACCEPTED_BY_VENDOR');
  assert.equal(baseline.deliveryAuthorized, true);

  // Unchanged manifest must NOT set receiptInvalidated
  const noChange = await executeVerifiedRepairTransaction(
    baseline,
    { action: 'SET_QUANTITY', sku: 'P38997-B21', quantity: 1 },
    { validateFn: () => ({ errors: [], isValid: true }) }
  );
  assert.equal(noChange.resultingManifestSha256, noChange.parentManifestSha256);
  assert.equal(noChange.receiptInvalidated, false);
  assert.ok(noChange.candidate.portalReceipt !== null);
});

// 5. Simultaneous hardware + evidence + operational blocker reconciliation
test('SI-05 Case 5: reconcileBlockers preserves and classifies simultaneous hardware, evidence, and operational blockers', () => {
  const blockers = [
    { id: 'BLK-HW-1', detail: '1600W PSU wattage deficit under peak GPU load' },
    { id: 'BLK-EV-1', detail: 'NotebookLM citation grounding missing and portal receipt stale' },
    { id: 'BLK-OP-1', detail: 'Knowledge sync failed during offline air-gap execution' },
    { id: 'BLK-HW-2', detail: 'Heatsink kit resolved', resolved: true },
    { id: 'BLK-RB-1', detail: 'Memory substitution regressed and rolled back', status: 'ROLLED_BACK' }
  ];

  const reconciled = reconcileBlockers(blockers);
  assert.equal(reconciled.counts.total, 5);
  assert.equal(reconciled.byClass.HARDWARE.length, 3);
  assert.equal(reconciled.byClass.EVIDENCE.length, 1);
  assert.equal(reconciled.byClass.OPERATIONAL.length, 1);
  assert.equal(reconciled.counts.unresolvedHardware, 1);
  assert.equal(reconciled.counts.unresolvedEvidence, 1);
  assert.equal(reconciled.counts.unresolvedOperational, 1);
  assert.equal(reconciled.counts.resolved, 1);
  assert.equal(reconciled.counts.rolledBack, 1);
  assert.equal(reconciled.allResolved, false);
  assert.equal(reconciled.overallOutcome, 'MULTI_CLASS_UNRESOLVED');
  assert.ok(reconciled.outcomesPresent.includes('UNRESOLVED_HARDWARE'));
  assert.ok(reconciled.outcomesPresent.includes('UNRESOLVED_EVIDENCE'));
  assert.ok(reconciled.outcomesPresent.includes('UNRESOLVED_OPERATIONAL'));
  assert.ok(reconciled.outcomesPresent.includes('RESOLVED'));
  assert.ok(reconciled.outcomesPresent.includes('ROLLED_BACK'));

  // Re-export & additive wiring on counterfactual_repair.js works without altering generateCounterfactualRepairProofs
  assert.equal(typeof counterfactualRepair.executeVerifiedRepairTransaction, 'function');
  assert.equal(typeof counterfactualRepair.executeRepairSession, 'function');
  assert.equal(typeof counterfactualRepair.reconcileBlockers, 'function');
  const combined = counterfactualRepair.reconcileProofsAndBlockers({
    acceptanceGate: {
      blockers: [
        { id: 'GROUNDING_MISSING', detail: 'QuickSpecs citation unverified' },
        { id: 'BUDGET_OVER', detail: 'Exceeds budget constraint' }
      ]
    }
  });
  assert.equal(combined.proofs.length, 2);
  assert.equal(combined.reconciliation.counts.total, 4);
});

// 6. Repair regression rollback leaving baseline unmutated
test('SI-05 Case 6: repair regression rollback detects higher critical errors or newly violated hard requirements without mutating baseline', async () => {
  const baseline = deepFreeze({
    chassis: 'DL380_Gen12',
    items: [
      { sku: 'P38997-B21', quantity: 2, description: '1600W PSU' },
      { sku: 'P64707-B21', quantity: 4, description: '64GB DDR5 RDIMM' }
    ],
    errors: ['MINOR_CABLE_NOTE'],
    requirementCoverage: {
      dispositions: [{ requirementId: 'REQ-MEM-256', hardness: 'HARD_CONSTRAINT', disposition: 'SATISFIED' }]
    }
  });
  const baselineSha = computeManifestSha256(baseline);

  // Higher critical error count triggers rollback
  const txHigherErrors = await executeVerifiedRepairTransaction(
    baseline,
    { action: 'REMOVE', sku: 'P38997-B21', quantity: 1 },
    { validateFn: () => ({ errors: ['ERR_SINGLE_PSU', 'ERR_WATTAGE_DEFICIT'], isValid: false }) }
  );
  assert.equal(txHigherErrors.outcome, 'ROLLED_BACK');
  assert.equal(txHigherErrors.regressionDetected, true);
  assert.equal(computeManifestSha256(txHigherErrors.state), baselineSha);
  assert.equal(txHigherErrors.state.items[0].quantity, 2);

  // Same critical error count (0 <= 1) BUT newly violated hard requirement triggers rollback
  const txNewReqViolation = await executeVerifiedRepairTransaction(
    baseline,
    { action: 'SUBSTITUTE', fromSku: 'P64707-B21', toSku: 'P64705-B21', quantity: 2 },
    {
      validateFn: () => ({
        errors: [],
        requirementCoverage: {
          dispositions: [{ requirementId: 'REQ-MEM-256', hardness: 'HARD_CONSTRAINT', disposition: 'VIOLATED' }]
        }
      })
    }
  );
  assert.equal(txNewReqViolation.outcome, 'ROLLED_BACK');
  assert.equal(txNewReqViolation.regressionDetected, true);
  assert.match(txNewReqViolation.rollbackReason, /NEW_HARD_REQUIREMENT_VIOLATION:REQ-MEM-256/);
  assert.equal(computeManifestSha256(txNewReqViolation.state), baselineSha);
  assert.equal(baseline.items[1].sku, 'P64707-B21');

  // Valid baseline (isValid: true, isMathClean: true) regresses to { isValid: false, isMathClean: false, errors: [] } -> ROLLED_BACK
  const cleanBaseline = deepFreeze({
    chassis: 'DL380_Gen12',
    isValid: true,
    isMathClean: true,
    items: [{ sku: 'P38997-B21', quantity: 2 }],
    errors: []
  });
  const txValidityRegressed = await executeVerifiedRepairTransaction(
    cleanBaseline,
    { action: 'REMOVE', sku: 'P38997-B21', quantity: 1 },
    { validateFn: () => ({ isValid: false, isMathClean: false, errors: [] }) }
  );
  assert.equal(txValidityRegressed.outcome, 'ROLLED_BACK');
  assert.equal(txValidityRegressed.regressionDetected, true);
  assert.match(txValidityRegressed.rollbackReason, /CANDIDATE_VALIDITY_REGRESSED/);
  assert.equal(txValidityRegressed.state.items[0].quantity, 2);
});

// 7. AbortSignal / timeout cancellation + cycle detection
test('SI-05 Case 7: AbortSignal cancellation and visited-manifest cycle detection behave deterministically', async () => {
  const baseline = deepFreeze({
    chassis: 'DL380_Gen12',
    items: [{ sku: 'P38997-B21', quantity: 1 }],
    errors: ['MISSING_REDUNDANT_PSU', 'WATTAGE_DEFICIT']
  });

  // Cycle detection: A -> B -> A returns CYCLE_DETECTED_REJECTED and keeps bestValidatedState
  const cycleSession = await executeRepairSession({
    baseline,
    proposals: [
      { action: 'ADD', sku: 'P44712-B21', quantity: 1 },
      { action: 'REMOVE', sku: 'P44712-B21', quantity: 1 }
    ],
    validateFn: candidate => (candidate.items.some(i => i.sku === 'P44712-B21')
      ? { errors: ['STILL_UNSOLVED'], isValid: false }
      : { errors: ['MISSING_REDUNDANT_PSU', 'WATTAGE_DEFICIT'], isValid: false })
  });
  assert.equal(cycleSession.outcome, 'CYCLE_DETECTED_REJECTED');
  assert.equal(cycleSession.cycleDetected, true);
  assert.equal(cycleSession.attempts[0].outcome, 'ACCEPTED');
  assert.equal(cycleSession.attempts[1].outcome, 'CYCLE_DETECTED_REJECTED');
  assert.ok(cycleSession.bestValidatedState.items.some(i => i.sku === 'P44712-B21'));

  // AbortSignal cancellation mid-session
  const controller = new AbortController();
  const abortSession = await executeRepairSession({
    baseline,
    signal: controller.signal,
    proposals: [
      { action: 'ADD', sku: 'P44712-B21', quantity: 1 },
      { action: 'ADD', sku: 'P74794-B21', quantity: 1 }
    ],
    validateFn: () => {
      controller.abort(new Error('operator cancelled'));
      return { errors: ['STILL_1'], isValid: false };
    }
  });
  assert.equal(abortSession.outcome, 'CANCELLED');
  assert.equal(abortSession.cancelled, true);
  assert.equal(abortSession.attempts.length, 1);
  assert.equal(abortSession.attempts[0].outcome, 'CANCELLED');
  assert.equal(computeManifestSha256(abortSession.bestValidatedState), computeManifestSha256(baseline));

  // AbortSignal in executeCompoundWorkflow cancels remaining steps cleanly
  const wfController = new AbortController();
  const compoundPlan = buildCompoundExecutionPlan('Evaluate BOQ and reconcile with baseline', {
    items: [{ sku: 'P38997-B21', quantity: 2 }],
    secondaryFilePath: 'baseline.xlsx'
  });
  let secondStepCalled = false;
  const wfCancelled = await executeCompoundWorkflow(compoundPlan, {}, {
    signal: wfController.signal,
    handlers: {
      BOQ_EVALUATION: () => { wfController.abort(); return { ok: true }; },
      BOM_RECONCILIATION: () => { secondStepCalled = true; return {}; }
    }
  });
  assert.equal(wfCancelled.status, 'CANCELLED');
  assert.equal(wfCancelled.cancelled, true);
  assert.equal(secondStepCalled, false);
  assert.equal(wfCancelled.invocationLedger[compoundPlan.steps[1].stepId].invocations, 0);
});

// 8. Budget exhaustion returning bestValidatedState + originalError preservation + router integration
test('SI-05 Case 8: search exhaustion returns bestValidatedState, originalError preserved across workflow & shadow, and route_query attaches compoundExecutionPlan', async () => {
  const baseline = deepFreeze({
    chassis: 'DL380_Gen12',
    items: [{ sku: 'SKU-0', quantity: 1 }],
    errors: ['E1', 'E2', 'E3']
  });

  // Step 1 improves from 3 errors to 1 error; Step 2 regresses to 4 errors (rolled back); Step 3 hits maxIterations=2
  const exhausted = await executeRepairSession({
    baseline,
    maxIterations: 2,
    proposals: [
      { action: 'ADD', sku: 'SKU-GOOD', quantity: 1 },
      { action: 'ADD', sku: 'SKU-BAD', quantity: 1 },
      { action: 'ADD', sku: 'SKU-NEVER-RUN', quantity: 1 }
    ],
    validateFn: candidate => {
      const skus = candidate.items.map(i => i.sku);
      if (skus.includes('SKU-BAD')) return { errors: ['E1', 'E2', 'E3', 'E4'], isValid: false };
      if (skus.includes('SKU-GOOD')) return { errors: ['E1'], isValid: false };
      return { errors: ['E1', 'E2', 'E3'], isValid: false };
    }
  });
  assert.equal(exhausted.outcome, 'SEARCH_EXHAUSTED');
  assert.equal(exhausted.exhaustedReason, 'MAX_ITERATIONS');
  assert.equal(exhausted.attempts.length, 2);
  assert.equal(exhausted.attempts[0].outcome, 'ACCEPTED');
  assert.equal(exhausted.attempts[1].outcome, 'ROLLED_BACK');
  assert.ok(exhausted.bestValidatedState.items.some(i => i.sku === 'SKU-GOOD'));
  assert.ok(!exhausted.bestValidatedState.items.some(i => i.sku === 'SKU-BAD'));
  assert.ok(!exhausted.bestValidatedState.items.some(i => i.sku === 'SKU-NEVER-RUN'));

  // Elapsed time budget exhaustion
  const timeExhausted = await executeRepairSession({
    baseline,
    maxElapsedMs: 15,
    proposals: [
      { action: 'ADD', sku: 'SKU-GOOD', quantity: 1 },
      { action: 'ADD', sku: 'SKU-LATE', quantity: 1 }
    ],
    validateFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 25));
      return { errors: ['E1'], isValid: false };
    }
  });
  assert.equal(timeExhausted.outcome, 'SEARCH_EXHAUSTED');
  assert.equal(timeExhausted.exhaustedReason, 'MAX_ELAPSED_MS');
  assert.equal(timeExhausted.attempts.length, 1);

  // originalError preservation in executeCompoundWorkflow when step + hooks fail
  const wfPlan = buildCompoundExecutionPlan('Evaluate BOQ', { items: [{ sku: 'P38997-B21', quantity: 2 }] });
  const primaryStepErr = Object.assign(new Error('Primary hardware evaluator fault'), { code: 'EVAL_FAULT' });
  const failedWf = await executeCompoundWorkflow(wfPlan, {}, {
    handlers: { BOQ_EVALUATION: () => { throw primaryStepErr; } },
    onObserve: () => { throw new Error('observer hook failed'); },
    onReflect: () => { throw new Error('reflection hook failed'); }
  });
  assert.equal(failedWf.status, 'FAILED');
  assert.equal(failedWf.originalError.message, 'Primary hardware evaluator fault');
  assert.equal(failedWf.originalError.code, 'EVAL_FAULT');
  assert.equal(failedWf.observerErrors.length, 2);
  assert.equal(failedWf.invocationLedger[wfPlan.steps[0].stepId].invocations, 1);

  // originalError preservation in presales_query_shadow when sink throws/rejects
  const secretPrimary = Object.assign(new Error('private customer fault payload'), { code: 'SHADOW_PRIMARY' });
  let capturedReport = null;
  let caughtErr = null;
  try {
    await executeWithQueryShadow('Evaluate BOQ', {}, () => { throw secretPrimary; }, {
      sink: async report => {
        capturedReport = report;
        throw new Error('sink persistence crashed');
      }
    });
  } catch (err) {
    caughtErr = err;
  }
  assert.strictEqual(caughtErr, secretPrimary);
  assert.equal(caughtErr.originalError.code, 'SHADOW_PRIMARY');
  assert.equal(caughtErr.originalError.message, 'private customer fault payload');
  assert.equal(caughtErr.observerErrors.length, 1);
  assert.equal(caughtErr.singleInvocationEnforced, true);
  assert.ok(!JSON.stringify(capturedReport).includes('private customer fault payload'));

  // route_query.js additive attachment of compoundExecutionPlan while preserving legacy envelope shape
  const routed = await executeRoutedQuery(
    'What is the maximum memory capacity of DL380 Gen12?',
    { chassisName: 'DL380_Gen12', offlineMode: true }
  );
  assert.equal(routed.classification.intent, 'FREEFORM_QA');
  assert.ok(routed.queryPlan);
  assert.ok(routed.queryPlan.compoundExecutionPlan);
  assert.equal(routed.queryPlan.compoundExecutionPlan.objective, 'FREEFORM_QA');
  assert.equal(Object.keys(routed).includes('queryPlan'), false);
});
