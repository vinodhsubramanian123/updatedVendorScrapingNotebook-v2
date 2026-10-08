'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const root = path.resolve(__dirname, '../..');
process.env.SKILL_ISOLATION_ROOT = process.env.SKILL_ISOLATION_ROOT || root;
process.env.SKILL_ISOLATION_CONTROL = process.env.SKILL_ISOLATION_CONTROL || '1';
const { localFixture, exporterCandidate, EXPORT_FIXTURE } = require('../fixtures/skill_workflow_characterization.js');
const { runScenario } = require('../../scripts/maintenance/skill_workflow/golden_worker.js');
const capture = require('../../scripts/maintenance/capture_skill_workflow_goldens.js');
const { scenarios, families } = require('../../scripts/maintenance/skill_workflow/golden_scenarios.js');
const { runExportContract } = require('../../scripts/maintenance/skill_workflow/golden_export_contract.js');
const { semanticProjection, compareGolden } = require('../../scripts/maintenance/skill_workflow/golden_projection.js');
const byId = id => scenarios.find(scenario => scenario.id === id);

test('new local CSV reproduces exact active catalog rows and declared quantities', () => {
  const fixture = localFixture(root);
  assert.equal(fs.readFileSync(path.join(root, 'tests/fixtures/cp0_locally_valid_dl380_gen12.csv'), 'utf8'), fixture.csv);
  assert.equal(fixture.rows.length, 10); assert.equal(fixture.rows[0].quantity, 1);
  assert.equal(fixture.rows.filter(row => row.visibilityState === 'PORTAL_CONDITIONAL').length, 9);
  assert.equal(fixture.rows.filter(row => row.prerequisiteRuleId).length, 3);
});
test('canonical physical helper and whole graph actually pass the local candidate', () => {
  const { evaluateBOQMultiAspect } = require('../../scripts/lib/boq/boq_evaluator.js');
  const fixture = localFixture(root), targetDir = path.join(root, 'outputs/ProLiant/Gen12/DL380_Gen12');
  const result = evaluateBOQMultiAspect(fixture.csv, { catalogData: JSON.parse(fs.readFileSync(path.join(root, fixture.catalog.path))),
    targetDir, filePath: path.join(root, 'tests/fixtures/cp0_locally_valid_dl380_gen12.csv') });
  console.log('LOCAL_FIXTURE_OBSERVATION ' + JSON.stringify({ isMathClean: result.isMathClean, isWholeSolutionValid: result.conflictGraph?.isWholeSolutionValid,
    missingDependencies: result.missingDependencies, mathDeductions: result.mathDeductions,
    graphConflicts: result.conflictGraph?.conflicts, rulesSource: result.conflictGraph?.rulesSource }));
  assert.equal(result.isMathClean, true); assert.equal(result.conflictGraph.isWholeSolutionValid, true); assert.equal(result.missingDependencies.length, 0);
});
test('canonical ingestion rejects real malformed workbook instead of a missing descriptor', async () => {
  const { ingestAndConsolidateBoq } = require('../../scripts/evaluators/eval_boq.js');
  const inputFile = path.join(root, 'tests/fixtures/cp0_corrupt_workbook.xlsx');
  assert.equal(fs.existsSync(inputFile), true);
  await assert.rejects(ingestAndConsolidateBoq({ inputFile, OFFLINE_MODE: true, JSON_MODE: true, chassisDir: 'DL380_Gen12' }),
    error => { console.log('CORRUPT_FIXTURE_OBSERVATION ' + error.message); return !/not found/i.test(error.message); });
});
test('actual canonical router returns local physical and graph PASS while offline acceptance stays pending', async () => {
  const record = await runScenario(byId('S03-locally-valid-boq'), root);
  const result = record.response?.result;
  console.log('CANONICAL_VALID_OBSERVATION ' + JSON.stringify({ outcome: record.outcome, status: result?.status,
    isMathClean: result?.isMathClean, isWholeSolutionValid: result?.conflictGraph?.isWholeSolutionValid,
    customerDisposition: result?.customerDisposition, acceptanceGate: result?.acceptanceGate }));
  assert.equal(record.outcome, 'RETURNED'); assert.equal(result.isMathClean, true);
  assert.equal(result.conflictGraph.isWholeSolutionValid, true); assert.notEqual(result.acceptanceGate?.isValid, true);
  assert.equal(result.customerDisposition, 'ACTION_REQUIRED');
  assert.equal(result.acceptanceGate.blockers.find(row => row.id === 'U3').status, 'FAILED');
  assert.equal(result.acceptanceGate.blockers.find(row => row.id === 'B1').status, 'ACTION_REQUIRED');
  assert.equal(result.acceptanceGate.blockers.find(row => row.id === 'B13').status, 'ACTION_REQUIRED');
  assert.equal(result.deliveryAuthorization == null, true);
});
test('actual canonical router reports malformed workbook fatal diagnostic', async () => {
  const record = await runScenario(byId('S03-corrupt-workbook'), root);
  const result = record.response?.result;
  console.log('CANONICAL_CORRUPT_OBSERVATION ' + JSON.stringify(result));
  assert.equal(record.outcome, 'RETURNED'); assert.equal(result.status, 'ERROR');
  assert.match(result.error, /Unsupported ZIP file/);
});
test('missing learned prerequisites and unbalanced DIMMs fail actual canonical checks', () => {
  const { evaluatePhysicalMath } = require('../../scripts/lib/boq/boq_evaluator.js');
  const fixture = localFixture(root), catalog = JSON.parse(fs.readFileSync(path.join(root, fixture.catalog.path)));
  const targetDir = path.join(root, 'outputs/ProLiant/Gen12/DL380_Gen12');
  const missing = evaluatePhysicalMath(fixture.rows.filter(row => !row.prerequisiteRuleId), catalog, targetDir);
  assert.equal(missing.isMathClean, true); assert.equal(missing.conflictGraph.isWholeSolutionValid, false);
  assert.equal(missing.conflictGraph.conflicts.filter(row => row.type === 'LEARNED_DEPENDENCY').length, 3);
  const mutated = structuredClone(fixture.rows); mutated.find(row => row.sku === 'P69728-F21').quantity = 15;
  const unbalanced = evaluatePhysicalMath(mutated, catalog, targetDir);
  assert.equal(unbalanced.isMathClean, false);
});
test('original router call and its real clock remain unchanged', async () => {
  const RealDate = Date, observed = [];
  const response = { status: 'original' };
  const record = await runScenario(byId('S03-locally-valid-boq'), root, { executeRoutedQuery: async (...args) => { observed.push(args); return response; } });
  assert.equal(record.mode, 'CANONICAL_ROUTER'); assert.equal(record.response, response); assert.equal(observed.length, 1); assert.equal(Date, RealDate);
  assert.equal(observed[0][1].filePath, path.join(root, 'tests/fixtures/cp0_locally_valid_dl380_gen12.csv'));
});
test('unknown mode cannot execute router', async () => {
  let called = false; await assert.rejects(runScenario({ id: 'bad', query: 'bad', mode: 'UNKNOWN' }, root,
    { executeRoutedQuery() { called = true; } }), /Unknown.*mode/); assert.equal(called, false);
});
test('controlled export cannot be mixed with classification or injected router', async () => {
  const descriptor = byId('S17-authorized-export-contract');
  await assert.rejects(runScenario({ ...descriptor, execute: false }, root), /cannot use classification/);
  await assert.rejects(runScenario(descriptor, root, {}), /injected router/);
});
test('unknown controlled export id and unqualified environment fail closed', () => {
  assert.throws(() => runExportContract({ id: 'other', mode: 'CONTROLLED_EXPORT_CONTRACT' }, root), /Invalid.*descriptor/);
  const original = process.env.SKILL_ISOLATION_ROOT;
  try { process.env.SKILL_ISOLATION_ROOT = path.dirname(root); assert.throws(() => runExportContract(byId('S17-authorized-export-contract'), root), /qualified isolated/); }
  finally { process.env.SKILL_ISOLATION_ROOT = original || root; }
});
test('worker binding includes controlled mode and rejects mode laundering', () => {
  const descriptor = byId('S17-authorized-export-contract');
  const record = { family: descriptor.family, labeledIntent: descriptor.intent, mode: descriptor.mode, outcome: 'RETURNED' };
  assert.doesNotThrow(() => capture.requireWorkerBinding(record, descriptor));
  assert.throws(() => capture.requireWorkerBinding({ ...record, mode: 'CANONICAL_ROUTER' }, descriptor), /mode mismatch/);
});
test('coverage never awards synthetic exporter family acceptance or runtime routing', () => {
  const descriptor = byId('S17-authorized-export-contract');
  const coverage = capture.coverageRegister([descriptor], [{ id: descriptor.id, family: descriptor.family, mode: descriptor.mode, qualified: true, reproducible: true }]);
  const family = coverage.find(row => row.id === 'S17');
  assert.deepEqual(family.controlledExportContractsCaptured, [descriptor.id]); assert.deepEqual(family.runtimeScenariosCaptured, []);
  assert.equal(family.correctedAcceptance, 'PENDING_CHECKPOINT_BEHAVIOR_VERIFICATION'); assert.equal(families.length, 19);
  assert.equal(family.characterization, 'CONTROLLED_EXPORT_CONTRACT_BASELINE');
});
for (const id of ['S17-diagnostic-export-contract', 'S17-authorized-export-contract']) test(id + ' deterministic signed raw response and complete workbook semantics', () => {
  const first = runExportContract(byId(id), root);
  const workbookFields = ['portalWorkbookPath','proposalWorkbookPath','multiRankWorkbookPath'];
  const firstBooks = workbookFields.map(field => capture.workbookProjection(first[field], root));
  const firstCsv = fs.readFileSync(first.multiRankCsvPath, 'utf8');
  const second = runExportContract(byId(id), root);
  assert.deepEqual(first.authorization, second.authorization); assert.deepEqual(first.candidate, second.candidate);
  assert.deepEqual(firstBooks, workbookFields.map(field => capture.workbookProjection(second[field], root)));
  assert.equal(firstCsv, fs.readFileSync(second.multiRankCsvPath, 'utf8'));
  assert.equal(compareGolden(semanticProjection({ response: first }, { root }), semanticProjection({ response: second }, { root })).equal, true);
});
test('controlled worker delegates actual exports and retains exact bound mode', async () => {
  const descriptor = byId('S17-authorized-export-contract');
  const record = await runScenario(descriptor, root);
  assert.equal(record.outcome, 'RETURNED'); assert.equal(record.mode, 'CONTROLLED_EXPORT_CONTRACT');
  capture.requireWorkerBinding(record, descriptor); assert.equal(record.response.hardwareAccepted, false);
});
for (const id of ['S17-diagnostic-export-contract', 'S17-authorized-export-contract']) test(id + ' four actual exporters and cryptographic negative controls', () => {
  const realDate = Date, previousKey = process.env.DELIVERY_AUTH_SECRET;
  const result = runExportContract(byId(id), root);
  assert.equal(Date, realDate); assert.equal(process.env.DELIVERY_AUTH_SECRET, previousKey);
  assert.equal(result.hardwareAccepted, false); assert.equal(result.vendorAccepted, false);
  assert.deepEqual(result.controls, { missingAuthorizationBlocked: 4, tamperedSignatureBlocked: 4, changedQuantityBlocked: 4 });
  assert.equal(result.fixtureClock, EXPORT_FIXTURE.clock); assert.equal(result.authorization.issuedAt, EXPORT_FIXTURE.clock);
  assert.equal(result.authorizationVerified, true); assert.equal(result.authorization.signature.length, 64);
  for (const field of ['portalWorkbookPath','proposalWorkbookPath','multiRankWorkbookPath','multiRankCsvPath']) assert.equal(fs.statSync(result[field]).size > 0, true);
  const projected = semanticProjection({ response: result }, { root });
  assert.equal(projected.response.authorization.signature, result.authorization.signature);
  const altered = structuredClone(projected); altered.response.authorization.signature = 'a'.repeat(64);
  assert.equal(compareGolden(projected, altered).equal, false);
  const quantity = structuredClone(projected); quantity.response.candidate.items[0].quantity++;
  assert.equal(compareGolden(projected, quantity).equal, false);
  console.log('EXPORT_CONTRACT_OBSERVATION ' + JSON.stringify(result));
});
test('exporter fixture candidate has separate mutable representations', () => {
  const a = exporterCandidate(), b = exporterCandidate(); a.items[0].quantity = 20;
  assert.equal(b.items[0].quantity, 2); assert.equal(a.rankedSolutions[0].skuPartsList[0].quantity, 2);
});
