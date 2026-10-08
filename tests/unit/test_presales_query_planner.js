'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { planPresalesQuery } = require('../../scripts/lib/boq/presales_query_planner.js');
const cases = require('../fixtures/presales_query_plan_cases.js');

for (const fixture of cases) {
  test(`CP7a labeled proposal — ${fixture.id}`, () => {
    const plan = planPresalesQuery(fixture.query, fixture.context || {});
    assert.equal(plan.objective, fixture.objective);
    assert.deepEqual(plan.ambiguities.map(i => i.code), fixture.issues || []);
    assert.equal(plan.status, fixture.issues?.length ? 'CLARIFICATION_REQUIRED' : 'PLANNED');
    if (fixture.transforms) assert.deepEqual(plan.transforms, fixture.transforms);
    if (fixture.nodes) assert.deepEqual(plan.scope.nodeCounts, fixture.nodes);
    if (fixture.modality) assert.equal(plan.inputModality.kind, fixture.modality);
    if (fixture.scope) assert.equal(plan.scope.kind, fixture.scope);
    for (const requested of fixture.requested || []) assert.ok(plan.requestedCapabilities.includes(requested));
    assert.equal(plan.activation, 'UNUSED');
    assert.equal(plan.dispatchAllowed, false);
    assert.equal(plan.deliveryAuthorized, false);
    assert.equal(plan.confidenceScore, null);
    assert.equal(plan.execution.state, 'NOT_EXECUTED');
    assert.equal(plan.inputModality.formatSupport, 'NOT_VERIFIED');
  });
}

// Independent hand-labeled list of the 16 existing early context.intent overrides.
const legacyOverrides = [
  'FREEFORM_QA', 'BOQ_EVALUATION', 'RFP_SIZING_TO_BOM', 'BOM_RECONCILIATION',
  'CATALOG_INTELLIGENCE', 'HETEROGENEOUS_TENDER_MODERNIZATION', 'CROSS_VENDOR_TRANSFORMATION',
  'WORKLOAD_DNA', 'VALUE_ENGINEERING', 'LEAST_DELTA_SYNTHESIS', 'MULTI_CLUSTER_TENDER',
  'ADVERSARIAL_VALIDATION', 'WORKBOOK_GENERATION', 'REMARKS_RECONCILIATION',
  'CONTINUOUS_LEARNING', 'KNOWLEDGE_SYNC'
];
for (const intent of legacyOverrides) {
  test(`CP7a explicit legacy override — ${intent}`, () => {
    const plan = planPresalesQuery('Size a server for VMware and export Excel', {
      intent, filePath: 'scan.pdf', secondaryFilePath: 'baseline.xlsx'
    });
    assert.equal(plan.objective, intent);
    assert.equal(plan.legacyExplicitOverride, true);
    assert.equal(plan.classificationBasis, 'LEGACY_CONTEXT_INTENT');
    assert.ok(plan.requestedCapabilities.includes('RFP_SIZING_TO_BOM'));
    assert.ok(plan.requestedCapabilities.includes('WORKLOAD_DNA'));
    assert.ok(plan.requestedCapabilities.includes('WORKBOOK_GENERATION'));
    assert.equal(plan.inputModality.kind, 'PDF_REQUIRING_INSPECTION');
    assert.equal(plan.dispatchAllowed, false);
  });
}

test('CP7a retains frozen original requirements, spares, rows and source hints', () => {
  const items = Object.freeze([Object.freeze({ sku: 'VENDOR-UNKNOWN', quantity: 9, row: 7, spare: true })]);
  const context = Object.freeze({ chassisName: 'Vendor X Model Z', vendor: 'Vendor X', items, unparsedRows: Object.freeze(['retain me']) });
  const query = '  Size a server with customer-owned spares  ';
  const plan = planPresalesQuery(query, context);
  assert.equal(plan.source.queryText, query);
  assert.equal(plan.source.context, context);
  assert.equal(plan.source.context.items, items);
  assert.equal(plan.scope.chassisHint, 'Vendor X Model Z');
  assert.equal(plan.scope.vendorHint, 'Vendor X');
  assert.equal(plan.scope.resolutionState, 'NOT_VALIDATED');
});

test('CP7a deterministic calls have no time/confidence/product defaults', () => {
  assert.deepEqual(planPresalesQuery('Evaluate BOQ'), planPresalesQuery('Evaluate BOQ'));
  const plan = planPresalesQuery('Evaluate BOQ');
  assert.equal(plan.scope.chassisHint, null);
  assert.equal(plan.scope.vendorHint, null);
  assert.equal(plan.confidenceMeaning, 'UNKNOWN_UNCALIBRATED');
  assert.equal(Object.hasOwn(plan, 'timestamp'), false);
});

test('CP7a importing/planning cannot load a CLI/service, create I/O, exit or fabricate clock data', () => {
  const plannerPath = path.resolve(__dirname, '../../scripts/lib/boq/presales_query_planner.js');
  const rulesPath = path.resolve(__dirname, '../../scripts/lib/boq/presales_query_plan_rules.js');
  const program = `
    const Module = require('node:module');
    const assert = require('node:assert/strict');
    const allowed = new Set([${JSON.stringify(plannerPath)}, ${JSON.stringify(rulesPath)}]);
    const originalLoad = Module._load;
    Module._load = function(request, parent, isMain) {
      const resolved = Module._resolveFilename(request, parent, isMain);
      if (!allowed.has(resolved)) throw new Error('Unexpected planner dependency: ' + request);
      return originalLoad.apply(this, arguments);
    };
    process.exit = () => { throw new Error('Unexpected process.exit'); };
    Date.now = () => { throw new Error('Unexpected clock'); };
    Math.random = () => { throw new Error('Unexpected randomness'); };
    const { planPresalesQuery } = require(${JSON.stringify(plannerPath)});
    const result = planPresalesQuery('Size a server with 9 nodes and export Excel');
    assert.equal(result.dispatchAllowed, false);
    assert.equal(result.confidenceScore, null);
    process.stdout.write('CP7A_PURE_IMPORT_OK');
  `;
  const child = spawnSync(process.execPath, ['-e', program], { encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024 });
  assert.equal(child.error, undefined);
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stdout, 'CP7A_PURE_IMPORT_OK');
});

test('CP7a does not invent context.explicitTrack alias behavior', () => {
  const plan = planPresalesQuery('Size a server', { explicitTrack: 'FREEFORM_QA' });
  assert.equal(plan.objective, 'RFP_SIZING_TO_BOM');
  assert.equal(plan.legacyExplicitOverride, false);
  assert.equal(plan.source.context.explicitTrack, 'FREEFORM_QA');
});

test('CP7a OCR context.intent is an intake hint, not a legacy objective override', () => {
  const plan = planPresalesQuery('', { intent: 'OCR_QUOTE_INGESTION', filePath: 'scan.pdf' });
  assert.equal(plan.objective, null);
  assert.equal(plan.legacyExplicitOverride, false);
  assert.equal(plan.inputModality.requestedOcr, true);
  assert.deepEqual(plan.ambiguities.map(i => i.code), ['OBJECTIVE_REQUIRED']);
});

test('CP7a unknown text and unsupported formats stay honest', () => {
  const plan = planPresalesQuery('', { filePath: 'quote.custom' });
  assert.equal(plan.objective, null);
  assert.equal(plan.status, 'CLARIFICATION_REQUIRED');
  assert.equal(plan.inputModality.kind, 'FILE_REQUIRING_INSPECTION');
  assert.equal(plan.inputModality.inspectionRequired, true);
});

test('CP7a rejects malformed API inputs without coercing them to valid queries', () => {
  for (const query of [null, false, 17, {}]) assert.throws(() => planPresalesQuery(query), TypeError);
  for (const context of [null, false, [], 'intent']) assert.throws(() => planPresalesQuery('', context), TypeError);
});

test('CP7a explanatory numbers and single-node requests do not invent multi-group quantity', () => {
  assert.deepEqual(planPresalesQuery('How many cores do 9 servers have?').scope.nodeCounts, []);
  const single = planPresalesQuery('Size a server for 1 node');
  assert.deepEqual(single.scope.nodeCounts, [1]);
  assert.equal(single.transforms.includes('MULTI_CLUSTER_TENDER'), false);
});
