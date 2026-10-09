'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { EventEmitter } = require('node:events');
const XLSX = require('xlsx-js-style');
const root = path.resolve(__dirname, '../..');
const { localFixture } = require('../fixtures/skill_workflow_characterization.js');
const { normalizeConfiguration, outputQuantities } = require('../../scripts/lib/boq/configuration_context.js');
const { parseAndConsolidateBOQDetailed } = require('../../scripts/lib/boq/boq_evaluator.js');
const { planWorkbookGroups, planSheetGroups, ownedGroup } = require('../../scripts/lib/boq/multi_group_plan.js');
const { childOutcome } = require('../../scripts/lib/boq/multi_child_evaluation.js');
const { aggregateFacility } = require('../../scripts/lib/boq/multi_facility_summary.js');
const facade = require('../../scripts/evaluators/eval_multi_boq.js');
function temporary(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cp8b-group-test-'));
  t.after(() => { const relative = path.relative(fs.realpathSync(os.tmpdir()), fs.realpathSync(directory)); assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative)); fs.rmSync(directory, { recursive: true, force: true }); });
  return directory;
}
function sourceWorkbook(directory, sheets) {
  const workbook = XLSX.utils.book_new();
  for (const [name, items] of sheets) {
    const rows = [['Part Number', 'Qty', 'Description', 'Configuration ID', 'Quantity Scope', 'Quantity Basis', 'Unit Price']];
    items.forEach(item => rows.push([item.sku, item.quantity, item.description, item.configurationId || '', item.quantityScope || '', item.quantityBasis || 'total', item.unitPriceUsd || 0]));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), name);
  }
  const file = path.join(directory, 'source.xlsx'); XLSX.writeFile(workbook, file); return file;
}
function totalRows(count, owner) {
  return localFixture(root).rows.map(row => ({ ...row, quantity: row.quantity * count, configurationId: owner,
    quantityScope: 'configuration', quantityBasis: 'total' }));
}
function metadata() { return { groupId: 'declared-group', sourceSha256: 'fixture-source-hash', sourceSheet: 'Compute', displayLabel: 'Compute' }; }
function loadChildRunner(spawn) {
  const file = path.join(root, 'scripts/lib/boq/multi_child_evaluation.js'), module = { exports: {} }, requireAtFile = createRequire(file);
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), { module, exports: module.exports, require: name => name === 'child_process' ? { spawn } : requireAtFile(name),
    __dirname: path.dirname(file), __filename: file, process, Buffer, setTimeout, clearTimeout }, { filename: file });
  return module.exports;
}
function fakeChild() {
  const child = new EventEmitter(); child.stdout = new EventEmitter(); child.stderr = new EventEmitter(); child.kills = [];
  child.kill = signal => { child.kills.push(signal); return true; }; return child;
}
function framed(result) { return '__EVAL_RESULT_JSON__' + JSON.stringify(result) + '__EVAL_RESULT_JSON__'; }
function loadPreimage(spawn) {
  const originalFile = path.join(root, 'scripts/evaluators/eval_multi_boq.js'), module = { exports: {} }, requireAtFile = createRequire(originalFile);
  const source = fs.readFileSync(path.join(root, 'tests/fixtures/cp8b_legacy/eval_multi_boq.preimage.js'), 'utf8') + '\nmodule.exports.reviewChild = evaluateSheetParallel;';
  vm.runInNewContext(source, { module, exports: module.exports, require: name => name === 'child_process' ? { spawn } : requireAtFile(name),
    __dirname: path.dirname(originalFile), __filename: originalFile, process, console, Buffer, setTimeout, clearTimeout }, { filename: originalFile });
  return module.exports;
}
test('frozen CP8a characterizes child ACTION_REQUIRED/nonzero mislabel and absent error completion', async () => {
  const child = fakeChild(), api = loadPreimage(() => child);
  const promise = api.reviewChild('source.xlsx', 'Cluster (9x)', 'Cluster', { offline: true });
  assert.equal(child.listenerCount('error'), 0);
  child.stdout.emit('data', framed({ status: 'ACTION_REQUIRED', data: { acceptanceGate: { isValid: false } } })); child.emit('close', 7);
  const result = await promise; assert.equal(result.status, 'SUCCESS'); assert.equal(result.result.status, 'ACTION_REQUIRED');
  const original = fs.readFileSync(path.join(root, 'tests/fixtures/cp8b_legacy/eval_multi_boq.preimage.js'), 'utf8');
  assert.match(original, /sheetName: `\$\{wb\.clusterName\} \(\$\{wb\.multiplier\}x\)`/);
  assert.match(original, /evaluateSheetParallel\(t\.filePath, t\.sheetName, t\.clusterName, childOptions\)/);
});
for (const count of [2, 9, 20]) test(count + ' nodes conserve order totals through actual parser/context exactly once', t => {
  const directory = temporary(t), rows = totalRows(count), file = sourceWorkbook(directory, [['Compute', rows]]);
  const groups = planWorkbookGroups(file, XLSX.readFile(file), XLSX, root); assert.equal(groups.length, 1);
  const group = groups[0]; assert.equal(group.multiplier, count); assert.equal(group.sheetName, 'Server Config');
  assert.deepEqual(group.quantityBridge.map(item => item.totalQty), rows.map(item => item.quantity));
  const parsed = parseAndConsolidateBOQDetailed(group.filePath, group.filePath, group.sheetName), context = normalizeConfiguration(parsed.items);
  assert.equal(context.multiplier, count); assert.equal(context.configurationId, group.groupId);
  assert.deepEqual(context.items.map(item => outputQuantities(item, count).totalQty), rows.map(item => item.quantity));
  assert.deepEqual(context.items.map(item => item.quantity), localFixture(root).rows.map(item => item.quantity));
  assert.equal(parsed.items.every(item => item.quantityBasis === 'total'), true);
  assert.equal(parsed.items.every(item => item.unitPriceUsd === null), true);
  assert.equal(group.sourceRows.length, rows.length); assert.equal(group.inputQuantityBasis, 'ORDER_TOTAL_CANONICAL_CONTEXT_NORMALIZES_ONCE');
});
test('distinct explicit configurations inside one sheet retain every owner and source item index', t => {
  const directory = temporary(t), file = sourceWorkbook(directory, [['Compute', [...totalRows(2, 'owner-a'), ...totalRows(9, 'owner-b')]]]);
  const groups = planWorkbookGroups(file, XLSX.readFile(file), XLSX, root);
  assert.deepEqual(groups.map(group => group.multiplier), [2, 9]); assert.deepEqual(groups.map(group => group.sourceOwner), ['owner-a', 'owner-b']);
  assert.notEqual(groups[0].groupId, groups[1].groupId); assert.notEqual(groups[0].filePath, groups[1].filePath);
  assert.deepEqual(groups[1].sourceRows.map(row => row.sourceItemIndex), Array.from({ length: 10 }, (_, index) => index + 10));
});
test('global order rows stay once while configured rows scale', t => {
  const directory = temporary(t), rows = totalRows(9); rows.push({ sku: 'P52341-B21', description: 'HPE spare rack rail kit', quantity: 3, quantityScope: 'global', quantityBasis: 'total' });
  const file = sourceWorkbook(directory, [['Compute', rows]]), group = planWorkbookGroups(file, XLSX.readFile(file), XLSX, root)[0];
  const global = group.quantityBridge.find(item => item.sku === 'P52341-B21'); assert.equal(global.totalQty, 3); assert.equal(global.nodeMult, 1);
  const context = normalizeConfiguration(parseAndConsolidateBOQDetailed(group.filePath, group.filePath, group.sheetName).items);
  assert.equal(context.items.find(item => item.sku === 'P52341-B21').totalQuantity, 3);
});
for (const mutate of [items => { items[0].configurationId = 'owner-a'; items[1].configurationId = 'owner-b'; }, items => { items[1].parentId = 'unknown-frame'; }, items => { items[1].quantity = 17; }]) test('ambiguous/nested/nondivisible group fails closed without guessed multiplier', () => {
  const rows = totalRows(9); mutate(rows); const group = ownedGroup(rows, metadata()); assert.equal(group.blocked.status, 'ACTION_REQUIRED'); assert.equal(group.multiplier, null); assert.equal(group.sourceRows.length, 10);
});
test('invalid and unresolved source rows are accounted diagnostic without executing splitter', () => {
  let calls = 0; const splitter = { analyzeAndPartitionClusters() { calls++; throw new Error('unreachable'); } };
  for (const parsed of [{ items: [] }, { items: totalRows(2), unresolvedRequirements: [{ line: 'missing' }] }, { items: totalRows(2), unmatchedSkus: [{ rawSku: 'unknown' }] }]) {
    const groups = planSheetGroups(parsed, metadata(), splitter); assert.equal(groups[0].blocked.status, 'ACTION_REQUIRED');
  } assert.equal(calls, 0);
});
test('existing allocation conservation permits exact split and rejects additions/rounding', () => {
  const rows = totalRows(2); rows.push({ ...rows[1], sku: 'P87303-B21', quantity: 2, description: 'Second processor profile' }); rows[1].quantity = 2;
  const exact = { analyzeAndPartitionClusters() { return { clusters: [0, 1].map(index => ({ name: 'Cluster_' + index, multiplier: 1,
    items: rows.filter(item => !/processor/i.test(item.description) || item.sku === (index ? 'P87303-B21' : 'P87302-B21')).map(item => ({ ...item, quantity: /processor/i.test(item.description) ? item.quantity : item.quantity / 2, totalQuantity: /processor/i.test(item.description) ? item.quantity : item.quantity / 2 })) })) }; } };
  const groups = planSheetGroups({ items: rows }, metadata(), exact); assert.equal(groups.length, 2); assert.equal(groups.every(group => !group.blocked), true);
  const drift = { analyzeAndPartitionClusters(items) { const result = exact.analyzeAndPartitionClusters(items); result.clusters[0].items[1].totalQuantity++; return result; } };
  assert.match(planSheetGroups({ items: rows }, metadata(), drift)[0].blocked.error, /changed source SKU quantities/);
});
for (const status of ['ACTION_REQUIRED','CANCELLED','NOT_EVALUATED']) test('child preserves truthful ' + status + ' and literal evidence', () => {
  const payload = { status, data: { evidenceLogPath: 'literal-owned-ledger', deliveryAuthorization: null, acceptanceGate: { isValid: false } } };
  const result = childOutcome({ sheetName: 'Real', displayLabel: 'Shown' }, framed(payload), 'warning', 0, null);
  assert.equal(result.status, status); assert.deepEqual(result.result, payload); assert.equal(result.stderr, 'warning');
});
test('nonzero/signal/malformed/duplicate/missing/unknown payloads never report SUCCESS', () => {
  const group = { sheetName: 'Real' }, payload = framed({ status: 'SUCCESS', data: { accepted: true } });
  for (const [stdout, code, signal] of [[payload, 7, null], [payload, null, 'SIGKILL'], ['nothing', 0, null], [payload + payload, 0, null], ['__EVAL_RESULT_JSON__{broken}__EVAL_RESULT_JSON__', 0, null], [framed({ status: 'UNDECLARED' }), 0, null], [framed(null), 0, null]]) {
    assert.equal(childOutcome(group, stdout, '', code, signal).status, 'ERROR');
  }
  assert.equal(childOutcome(group, JSON.stringify({ status: 'LOCAL_COMPLETE' }), '', 0, null).status, 'SUCCESS');
});
test('child actual args bind worksheet and same Node binary with existing flags', async () => {
  const child = fakeChild(); let call;
  const runner = loadChildRunner((...args) => { call = args; return child; });
  const promise = runner.executeGroupChild({ filePath: 'owned.xlsx', sheetName: 'Server Config', displayLabel: '9x cluster' }, { chassisDir: 'catalog', offline: true });
  assert.equal(call[0], process.execPath); assert.deepEqual(Array.from(call[1]).slice(1), ['owned.xlsx','--json','--sheet','Server Config','--chassis','catalog','--offline']);
  assert.equal(call[2].env.STRUCTURED_PROGRESS, '0'); child.stdout.emit('data', framed({ status: 'SUCCESS' })); child.emit('close', 0, null);
  assert.equal((await promise).sheetName, '9x cluster');
});
test('async spawn error and subsequent close settle once', async () => {
  const child = fakeChild(), runner = loadChildRunner(() => child), promise = runner.executeGroupChild({ filePath: 'owned.xlsx', sheetName: 'Server Config' });
  child.emit('error', new Error('ENOENT controlled')); child.stdout.emit('data', framed({ status: 'SUCCESS' })); child.emit('close', 0, null);
  const result = await promise; assert.equal(result.status, 'ERROR'); assert.equal(result.code, 'MULTI_CHILD_SPAWN_ERROR');
});
test('synchronous spawn throw produces bounded per-group error', async () => {
  const runner = loadChildRunner(() => { throw new Error('spawn failed'); });
  const result = await runner.executeGroupChild({ filePath: 'owned.xlsx', sheetName: 'Server Config' }); assert.equal(result.code, 'MULTI_CHILD_SPAWN_ERROR');
});
test('hung child retains ownership after timeout until actual close', async () => {
  const child = fakeChild(), runner = loadChildRunner(() => child);
  let settled = false;
  const promise = runner.executeGroupChild({ filePath: 'owned.xlsx', sheetName: 'Server Config' },
    { timeoutMs: 5, graceMs: 5, confirmationMs: 10 }).then(result => { settled = true; return result; });
  await new Promise(resolve => setTimeout(resolve, 80));
  assert.equal(settled, false);
  assert.deepEqual(child.kills, ['SIGTERM', 'SIGKILL']);
  child.emit('close', null, 'SIGKILL');
  const result = await promise;
  assert.equal(result.code, 'MULTI_CHILD_TIMEOUT'); assert.equal(result.process.signal, 'SIGKILL');
  assert.equal(result.receipt.state, 'EXIT_UNCONFIRMED');
});
for (const stream of ['stdout','stderr']) test(stream + ' output limit requests termination without accepting partial payload', async () => {
  const child = fakeChild(), runner = loadChildRunner(() => child), promise = runner.executeGroupChild({ filePath: 'owned.xlsx', sheetName: 'Server Config' }, { maxOutputBytes: 4 });
  child[stream].emit('data', Buffer.from('oversized')); child.emit('close', 0, null); const result = await promise;
  assert.equal(result.code, 'MULTI_CHILD_OUTPUT_LIMIT'); assert.deepEqual(child.kills, ['SIGTERM']);
});
test('facility aggregation sums canonical quantities while every site/power unknown remains null', () => {
  const groups = [2, 9, 20].map((multiplier, index) => ({ groupId: 'g' + index, multiplier }));
  const outcomes = groups.map(group => ({ status: 'ACTION_REQUIRED', result: { data: { clusterSizing: { serverCount: group.multiplier, totalRackUnits: group.multiplier * 2,
    estimatedDrawKw: 999, railKitCoverage: { required: group.multiplier, providedCount: group.multiplier } } } } }));
  const result = aggregateFacility(groups, outcomes); assert.equal(result.totalNodes, 31); assert.equal(result.totalRackUnits, 62); assert.equal(result.standard42uRacksRequired, 2);
  for (const field of ['usable42uRacksRequired','totalFacilityPowerKw','peakFacilityFeedKw','actualDrawKw','installedPsuNameplateKw','nominalRedundantCapacityKw','utilityVoltage']) assert.equal(result[field], null);
  assert.equal(result.railKitCoverage.providedCount, 31); assert.equal(result.scope.includes('not measured'), true);
  outcomes[1].result.data.clusterSizing.serverCount = 1; assert.equal(aggregateFacility(groups, outcomes).totalRackUnits, null);
  outcomes[1].status = 'ERROR'; assert.equal(aggregateFacility(groups, outcomes).railKitCoverage.providedCount, null);
});
test('facade limits fail before child work and import remains lazy', async () => {
  for (const key of ['timeoutMs','maxOutputBytes']) for (const value of [0, -1, 1.5, true, '9', [], Number.MAX_SAFE_INTEGER + 1]) await assert.rejects(facade.evaluateMultiBoq(__filename, { [key]: value }), /positive safe integer/);
  assert.deepEqual(Object.keys(facade), ['evaluateMultiBoq','runCli']);
});
for (const count of [2, 9, 20]) test(count + ' actual offline canonical child returns exact owned order and pending delivery', async t => {
  const directory = temporary(t), rows = totalRows(count), file = sourceWorkbook(directory, [['Compute', rows]]);
  const outcomes = await facade.evaluateMultiBoq(file, { offline: true, chassisDir: path.join(root, 'outputs/ProLiant/Gen12/DL380_Gen12'), timeoutMs: 45000 });
  const result = outcomes[0]; assert.equal(outcomes.length, 1); assert.equal(result.status, 'ACTION_REQUIRED', result.error);
  assert.equal(result.group.multiplier, count); assert.equal(result.group.inputSheet, 'Server Config');
  const data = result.result.data; assert.equal(data.buildStatus, 'LOCAL_RULE_CHECKED'); assert.equal(data.clusterSizing.serverCount, count);
  assert.equal(data.items.find(item => item.sku === 'P73282-B21').configurationMultiplier, count);
  assert.equal(data.items.find(item => item.sku === 'P69728-F21').quantity, 16);
  assert.equal(data.evalResults.evalSummary.cpuCount, 2);
  assert.equal(data.evalResults.evalSummary.memoryCount, 16);
  assert.equal(data.evalResults.evalSummary.totalMemoryGb, 1024);
  assert.equal(data.evalResults.baseConfigurationSizing.serverCount, 1);
  assert.equal(data.evalResults.baseConfigurationSizing.totalRackUnits, 2);
  assert.equal(data.items.find(item => item.sku === 'P69728-F21').totalQuantity, 16 * count);
  assert.equal(data.items.every(item => item.configurationId === result.group.groupId), true);
  assert.notEqual(data.acceptanceGate?.isValid, true); assert.equal(data.deliveryAuthorization == null, true);
  assert.equal(result.facilitySummary.totalNodes, count); assert.equal(result.facilitySummary.totalFacilityPowerKw, null);
  assert.ok(data.evidenceLogPath); assert.equal(fs.existsSync(data.evidenceLogPath), true);
  console.log('CP8B_REAL_CANONICAL_OBSERVATION ' + JSON.stringify({ nodes: count, outerStatus: result.status, buildStatus: data.buildStatus,
    totalRackUnits: data.clusterSizing.totalRackUnits, acceptance: data.acceptanceGate?.status || null, groupId: result.group.groupId, evidenceLogPath: data.evidenceLogPath }));
});
test('mixed sheets account independent groups and keep blocked ownership separate', async t => {
  const directory = temporary(t), file = sourceWorkbook(directory, [['Compute', totalRows(2)], ['Unowned Components', [{ sku: 'P69728-F21', quantity: 16, description: localFixture(root).rows[2].description }]], ['Summary', []]]);
  const results = await facade.evaluateMultiBoq(file, { offline: true, chassisDir: path.join(root, 'outputs/ProLiant/Gen12/DL380_Gen12'), timeoutMs: 45000 });
  assert.equal(results.length, 2); assert.equal(results[0].status, 'ACTION_REQUIRED'); assert.equal(results[1].status, 'ACTION_REQUIRED');
  assert.ok(results[0].result.data.evidenceLogPath); assert.equal(results[1].result, undefined); assert.match(results[1].error, /no owned CTO anchor/);
  assert.notEqual(results[0].group.groupId, results[1].group.groupId); assert.equal(results[1].group.multiplier, null);
  assert.equal(results[0].facilitySummary.totalNodes, null); assert.equal(results[0].facilitySummary.totalRackUnits, null);
});
test('single explicit owner with unowned anchor uses canonical ownership inference', () => {
  const rows = totalRows(9); rows[1].configurationId = 'only-owner';
  const canonical = normalizeConfiguration(rows);
  const group = ownedGroup(rows, metadata());
  assert.equal(group.blocked, undefined);
  assert.equal(group.multiplier, canonical.multiplier);
  assert.equal(group.multiplier, 9);
  assert.deepEqual(group.quantityBridge.map(item => item.totalQty), canonical.items.map(item => outputQuantities(item, canonical.multiplier).totalQty));
});
