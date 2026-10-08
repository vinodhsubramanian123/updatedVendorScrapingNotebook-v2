'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { safeWriteJsonAtomic } = require('../../scripts/lib/system/fs_compat.js');
const harness = require('../../scripts/maintenance/capture_skill_workflow_goldens.js');
const { RESULT_MARKER, requestContext, runScenario } = require('../../scripts/maintenance/skill_workflow/golden_worker.js');
const { scenarios } = require('../../scripts/maintenance/skill_workflow/golden_scenarios.js');
function temporary(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'golden-capture-test-'));
  t.after(() => {
    const rel = path.relative(fs.realpathSync(os.tmpdir()), fs.realpathSync(root));
    assert.ok(rel && !rel.startsWith('..') && !path.isAbsolute(rel));
    fs.rmSync(root, { recursive: true, force: true });
  });
  return root;
}
function workerRecord(id, overrides = {}) {
  return { schemaVersion: 1, scenarioId: id, mode: 'CANONICAL_ROUTER', outcome: 'RETURNED', response: { result: { status: 'ACTION_REQUIRED', quantity: 2 } }, error: null, ...overrides };
}
function framed(record) { return `${RESULT_MARKER}${JSON.stringify(record)}${RESULT_MARKER}`; }

test('worker framing preserves canonical envelopes and diagnostic result fields', () => {
  const stdout = 'logs\n__EVAL_RESULT_JSON__{"status":"ACTION_REQUIRED","data":{"items":[]}}__EVAL_RESULT_JSON__\n' + framed(workerRecord('S03'));
  const parsed = harness.parseWorkerOutput(stdout, 'S03');
  assert.equal(parsed.envelopes[0].status, 'ACTION_REQUIRED');
  assert.equal(parsed.response.result.quantity, 2);
});
test('worker rejects absent, duplicate, mismatched and invalid JSON markers', () => {
  for (const stdout of ['', framed(workerRecord('wrong')), framed(workerRecord('id')) + framed(workerRecord('id')), RESULT_MARKER + '{}', RESULT_MARKER + 'not json' + RESULT_MARKER]) {
    assert.throws(() => harness.parseWorkerOutput(stdout, 'id'));
  }
});
test('worker thrown errors must retain actual error evidence', () => {
  assert.throws(() => harness.parseWorkerOutput(framed(workerRecord('id', { outcome: 'THROWN_ERROR', error: null })), 'id'));
  const parsed = harness.parseWorkerOutput(framed(workerRecord('id', { outcome: 'THROWN_ERROR', error: { message: 'missing file', code: 'ENOENT' }, response: null })), 'id');
  assert.equal(parsed.error.code, 'ENOENT');
});
test('Git-only command denial remains explicit provenance limitation', () => {
  const run = { exitCode: 0, error: null, sourceUnchanged: true, sourceProtectedUnchanged: true,
    deniedAttempts: [{ category: 'NON_NODE_SUBPROCESS', command: 'git.exe' }] };
  const result = harness.qualifyRun(run);
  assert.equal(result.qualified, true);
  assert.equal(result.provenanceLimitations.length, 1);
  assert.equal(result.observedDenials.length, 1);
});
test('unknown/native/cloud denials and source changes never qualify as captured success', () => {
  const run = { exitCode: 0, sourceUnchanged: true, sourceProtectedUnchanged: true };
  for (const denial of [{ category: 'NON_NODE_SUBPROCESS' }, { category: 'NON_NODE_SUBPROCESS', command: 'nlm' }, { category: 'OUTSIDE_COPY_WRITE' }, { category: 'NETWORK_FETCH' }]) {
    assert.equal(harness.qualifyRun({ ...run, deniedAttempts: [denial] }).qualified, false);
  }
  assert.equal(harness.qualifyRun({ ...run, sourceUnchanged: false }).qualified, false);
  assert.equal(harness.qualifyRun({ ...run, exitCode: null, error: 'timeout' }).qualified, false);
});
test('scenario selection rejects misspelled and duplicated coverage controls', () => {
  assert.throws(() => harness.selectScenarios(['wrong']), /Unknown/);
  assert.throws(() => harness.selectScenarios([scenarios[0].id, scenarios[0].id]), /Duplicated/);
  assert.equal(harness.selectScenarios([scenarios[0].id]).length, 1);
});
test('nineteen-family coverage retains pending corrected acceptance and classification limits', () => {
  const selected = harness.selectScenarios();
  const coverage = harness.coverageRegister(selected, [{ family: 'S11', qualified: true, reproducible: true }]);
  assert.equal(coverage.length, 19);
  assert.equal(coverage.find(row => row.id === 'S11').correctedAcceptance, 'PENDING_CHECKPOINT_BEHAVIOR_VERIFICATION');
  assert.ok(coverage.find(row => row.id === 'S11').executionLimits.some(limit => /offline/.test(limit)));
  assert.equal(coverage.find(row => row.id === 'S13').characterization, 'PENDING');
  assert.equal(coverage.find(row => row.id === 'S11').characterization, 'CLASSIFICATION_ONLY_BASELINE');
});
test('classification-only records do not count as executed family baselines', () => {
  const coverage = harness.coverageRegister(harness.selectScenarios(), [{ id: 'S11-adversarial-classification', family: 'S11', qualified: true, reproducible: true, mode: 'CLASSIFICATION_ONLY_NOT_EXECUTED' }]);
  assert.equal(coverage.find(row => row.id === 'S11').characterization, 'CLASSIFICATION_ONLY_BASELINE');
  assert.deepEqual(coverage.find(row => row.id === 'S11').runtimeScenariosCaptured, []);
});
test('context maps only declared scope and validates file enclosure', () => {
  const root = path.resolve(os.tmpdir(), 'fake-copy');
  assert.equal(requestContext({ scope: 'DL380_Gen12', files: { filePath: 'tests/a.csv' } }, root).chassisName, 'DL380_Gen12');
  assert.equal(Object.hasOwn(requestContext({}, root), 'chassisName'), false);
  for (const files of [{ filePath: '../outside.csv' }, { filePath: root }, { unsupportedFile: 'a.csv' }]) assert.throws(() => requestContext({ files }, root));
});
test('classification-only adversarial worker never invokes execution', async () => {
  let executed = false;
  const record = await runScenario({ id: 'S11', family: 'S11', intent: 'ADVERSARIAL_VALIDATION', query: 'Run chaos', execute: false }, os.tmpdir(), {
    classifyQueryIntent: () => ({ intent: 'ADVERSARIAL_VALIDATION' }), executeRoutedQuery: () => { executed = true; }
  });
  assert.equal(executed, false);
  assert.equal(record.mode, 'CLASSIFICATION_ONLY_NOT_EXECUTED');
  assert.equal(record.outcome, 'CLASSIFICATION_CHARACTERIZED');
});
test('canonical worker dispatches once and retains fatal original fields without fabricated success', async () => {
  let calls = 0;
  const record = await runScenario({ id: 'S03', family: 'S03', query: 'Evaluate' }, os.tmpdir(), {
    executeRoutedQuery: async () => { calls += 1; throw Object.assign(new Error('engine failed'), { traceId: 'TRC-test', evidenceLogPath: 'partial.json' }); }
  });
  assert.equal(calls, 1);
  assert.equal(record.outcome, 'THROWN_ERROR');
  assert.equal(record.error.message, 'engine failed');
  assert.equal(record.error.traceId, 'TRC-test');
  assert.equal(record.response, null);
});
test('artifact capture retains bytes/hash, missing references and workbook semantic values', t => {
  const root = temporary(t), archive = path.join(root, 'archive');
  fs.mkdirSync(path.join(root, 'outputs'), { recursive: true });
  fs.mkdirSync(archive);
  const workbook = path.join(root, 'outputs', 'report.xlsx');
  fs.writeFileSync(workbook, 'actual fixture bytes');
  const receipt = { root, manifest: { files: [] } };
  const captured = harness.captureArtifacts(receipt, { response: { result: { exportPath: workbook, evidenceLogPath: path.join(root, 'outputs', 'missing.json') } } }, archive,
    () => ({ sheetNames: ['Quote'], sheets: { Quote: { A1: { type: 'n', value: 2, formula: '1+1', numberFormat: '0' } } } }));
  const archivedWorkbook = captured.artifacts.find(record => record.path === 'outputs/report.xlsx');
  assert.equal(archivedWorkbook.sha256.length, 64);
  assert.equal(fs.readFileSync(path.join(archive, archivedWorkbook.archivePath), 'utf8'), 'actual fixture bytes');
  assert.ok(captured.artifacts.some(record => record.state === 'MISSING_REFERENCE'));
  assert.equal(captured.workbooks[0].content.sheets.Quote.A1.formula, '1+1');
});
test('artifact references cannot escape copied outputs', t => {
  const root = temporary(t);
  assert.throws(() => harness.captureArtifacts({ root, manifest: { files: [] } }, { evidenceLogPath: path.join(root, 'scripts', 'x.json') }, path.join(root, 'archive')), /outside copied outputs/);
});
test('real workbook projection preserves sheet order, cell values, formulas and formats', t => {
  const root = temporary(t), XLSX = require('xlsx-js-style'), file = path.join(root, 'actual.xlsx');
  const book = XLSX.utils.book_new();
  const first = { A1: { t: 's', v: 'SKU-EXACT', s: { fill: { patternType: 'solid', fgColor: { rgb: 'FF0000' } } } }, B1: { t: 'n', v: 2 }, C1: { t: 'n', v: 0, f: 'B1*3', z: '0.00' }, '!ref': 'A1:C1' };
  XLSX.utils.book_append_sheet(book, first, 'Requirements');
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['Keep spare', 9]]), 'Spare Ownership');
  XLSX.writeFile(book, file);
  const projection = harness.workbookProjection(file, path.resolve(__dirname, '../..'));
  assert.deepEqual(projection.sheetNames, ['Requirements', 'Spare Ownership']);
  assert.equal(projection.sheets.Requirements.A1.value, 'SKU-EXACT');
  assert.equal(projection.sheets.Requirements.B1.value, 2);
  assert.equal(projection.sheets.Requirements.C1.formula, 'B1*3');
  assert.equal(projection.sheets.Requirements.C1.numberFormat, '0.00');
  assert.equal(projection.sheets['Spare Ownership'].B1.value, 9);
  assert.ok(Object.hasOwn(projection.sheets.Requirements.C1, 'style'));
  assert.equal(projection.sheets.Requirements.A1.style.fgColor.rgb, 'FF0000');
  assert.ok(projection.styleParts['xl/styles.xml'].includes('FF0000'));
  assert.ok(projection.styleParts['xl/worksheets/sheet1.xml'].includes('SKU-EXACT'));
});

test('workbook font/border or style-linkage drift cannot hide behind equal cell values', t => {
  const root = temporary(t), XLSX = require('xlsx-js-style'), projections = [];
  for (const color of ['FF0000', '00FF00']) {
    const book = XLSX.utils.book_new(), file = path.join(root, color + '.xlsx');
    XLSX.utils.book_append_sheet(book, { A1: { t: 's', v: 'Same value', s: { font: { bold: true, color: { rgb: color } },
      border: { top: { style: 'thin', color: { rgb: color } } } } }, '!ref': 'A1' }, 'Quote');
    XLSX.writeFile(book, file);
    projections.push(harness.workbookProjection(file, path.resolve(__dirname, '../..')));
  }
  assert.equal(projections[0].sheets.Quote.A1.value, projections[1].sheets.Quote.A1.value);
  assert.notEqual(projections[0].styleParts['xl/styles.xml'], projections[1].styleParts['xl/styles.xml']);
});
function fakeInfrastructure(t, source, mutateSecond = false) {
  const roots = [], requests = [];
  return {
    roots, requests,
    createIsolation: () => {
      const root = path.join(source, 'copies', `copy-${roots.length}`), runDir = path.join(root, 'control');
      fs.mkdirSync(runDir, { recursive: true });
      roots.push(root);
      return { root, control: runDir, ownerToken: `owner-${roots.length}`, dependencies: [], manifest: { files: [], inputTreeFingerprint: 'same-accepted-inputs',
        sourceAccountedFingerprint: 'same-accounted', sourceProtectedFingerprint: 'same-protected', protectedFingerprint: 'same-copied-protected',
        head: 'accepted-head', branch: 'accepted-branch', status: 'accepted-dirty-tree' } };
    },
    executeIsolated: request => {
      requests.push(request);
      const scenario = JSON.parse(request.args[0]), runDir = path.join(request.root, 'control');
      const record = workerRecord(scenario.id, { family: scenario.family, labeledIntent: scenario.intent });
      if (mutateSecond && requests.length === 2) record.response.result.quantity = 9;
      fs.writeFileSync(path.join(runDir, 'stdout.log'), framed(record));
      fs.writeFileSync(path.join(runDir, 'stderr.log'), 'retained logs');
      safeWriteJsonAtomic(path.join(runDir, 'receipt.json'), { command: 'fake-test-double' });
      return { runDir, snapshotRoot: request.root, inputTreeFingerprint: 'same-accepted-inputs', script: request.script, args: request.args,
        exitCode: 0, error: null, sourceUnchanged: true, sourceProtectedUnchanged: true, deniedAttempts: [] };
    }
  };
}
test('capture controller requires two fresh owner-bound copies and archives reproducible raw results', t => {
  const root = temporary(t), infrastructure = fakeInfrastructure(t, root);
  const summary = harness.captureGoldens({ source: root, scenarioIds: [scenarios[0].id] }, infrastructure);
  assert.equal(infrastructure.roots.length, 2);
  assert.notEqual(infrastructure.roots[0], infrastructure.roots[1]);
  assert.equal(infrastructure.requests[0].script, 'scripts/maintenance/skill_workflow/golden_worker.js');
  assert.equal(summary.state, 'CAPTURED_REPRODUCIBLE');
  assert.ok(summary.archive.startsWith(path.join(root, harness.ARCHIVE_BASE)));
  assert.ok(fs.existsSync(path.join(summary.archive, scenarios[0].id, 'pass-1', 'stdout.log')));
  assert.ok(fs.existsSync(path.join(summary.archive, scenarios[0].id, 'pass-2', 'capture.json')));
});
test('quantity differences cannot be hidden by capture controller', t => {
  const root = temporary(t), infrastructure = fakeInfrastructure(t, root, true);
  const summary = harness.captureGoldens({ source: root, scenarioIds: [scenarios[0].id] }, infrastructure);
  assert.equal(summary.state, 'REVIEW_REQUIRED');
  assert.ok(summary.records[0].comparison.differences.some(diff => diff.path.includes('quantity')));
});

test('first unequal pair stops before the next selected family and retains both raw passes', t => {
  const root = temporary(t), infrastructure = fakeInfrastructure(t, root, true);
  const first = scenarios[0], second = scenarios.find(scenario => scenario.family === 'S02');
  const summary = harness.captureGoldens({ source: root, scenarioIds: [first.id, second.id] }, infrastructure);
  assert.equal(infrastructure.requests.length, 2);
  assert.equal(infrastructure.roots.length, 2);
  assert.equal(summary.state, 'REVIEW_REQUIRED');
  assert.deepEqual(summary.selectedScenarioIds, [first.id, second.id]);
  assert.deepEqual(summary.capturedScenarioIds, [first.id]);
  assert.deepEqual(summary.unexecutedScenarioIds, [second.id]);
  assert.equal(summary.fullSelectedCapture, false);
  assert.equal(summary.stoppedReason.scenarioId, first.id);
  assert.ok(summary.stoppedReason.codes.includes('GOLDEN_COMPARISON_FAILED'));
  assert.equal(summary.records[0].passes.length, 2);
  assert.equal(fs.existsSync(path.join(summary.archive, second.id)), false);
  for (const pass of [1, 2]) assert.ok(fs.existsSync(path.join(summary.archive, first.id, `pass-${pass}`, 'stdout.log')));
  assert.equal(summary.coverage.find(family => family.id === second.family).characterization, 'PENDING');
  assert.deepEqual(summary.coverage.find(family => family.id === second.family).runtimeScenariosCaptured, []);
});

test('equal but unqualified pair also stops rather than capturing further selected scenarios', t => {
  const root = temporary(t), infrastructure = fakeInfrastructure(t, root), execute = infrastructure.executeIsolated;
  infrastructure.executeIsolated = request => ({ ...execute(request), deniedAttempts: [{ category: 'NETWORK_FETCH' }] });
  const selected = [scenarios[0], scenarios.find(scenario => scenario.family === 'S02')];
  const summary = harness.captureGoldens({ source: root, scenarioIds: selected.map(scenario => scenario.id) }, infrastructure);
  assert.equal(infrastructure.requests.length, 2);
  assert.equal(summary.records[0].reproducible, true);
  assert.equal(summary.records[0].qualified, false);
  assert.deepEqual(summary.stoppedReason.codes, ['UNQUALIFIED_PASS']);
  assert.deepEqual(summary.stoppedReason.unqualifiedPasses, [1, 2]);
  assert.deepEqual(summary.unexecutedScenarioIds, [selected[1].id]);
});
test('source changes between scenario pairs prevent a mixed-tree complete receipt', t => {
  const root = temporary(t), infrastructure = fakeInfrastructure(t, root);
  const create = infrastructure.createIsolation;
  infrastructure.createIsolation = () => {
    const receipt = create();
    if (infrastructure.roots.length > 2) receipt.manifest.sourceAccountedFingerprint = 'different-accepted-tree';
    return receipt;
  };
  const summary = harness.captureGoldens({ source: root, scenarioIds: [scenarios[0].id, scenarios[1].id] }, infrastructure);
  assert.equal(summary.state, 'REVIEW_REQUIRED');
  assert.equal(summary.records[0].qualified, true);
  assert.equal(summary.records[1].sameInputs, false);
  assert.equal(summary.records[1].qualified, false);
});

test('artifact JSON facts and opaque outcomes enter semantic comparison and retain archived bytes', t => {
  const root = temporary(t), archive = path.join(root, 'archive');
  fs.mkdirSync(path.join(root, 'outputs')); fs.mkdirSync(archive);
  const valid = '{"status":"ACTION_REQUIRED","sourceDate":"2026-10-01","quantity":2}';
  fs.writeFileSync(path.join(root, 'outputs', 'valid.json'), valid);
  fs.writeFileSync(path.join(root, 'outputs', 'invalid.json'), '{incomplete');
  const captured = harness.captureArtifacts({ root, manifest: { files: [] } }, {}, archive);
  const parsed = captured.artifactSemantics.find(item => item.path === 'outputs/valid.json');
  assert.equal(parsed.state, 'PARSED_JSON');
  assert.deepEqual(parsed.content, JSON.parse(valid));
  const opaque = captured.artifactSemantics.find(item => item.path === 'outputs/invalid.json');
  assert.equal(opaque.state, 'OPAQUE_JSON');
  assert.equal(opaque.parseError.name, 'SyntaxError');
  assert.equal(opaque.sha256.length, 64);
  assert.equal(fs.readFileSync(path.join(archive, 'artifacts/outputs/invalid.json'), 'utf8'), '{incomplete');
});

test('exact artifact bytes and parsed JSON quantity drift fail the two-pass controller', t => {
  for (const [name, first, second] of [['artifact.csv', 'SKU,2', 'SKU,9'], ['artifact.json', '{"quantity":2}', '{"quantity":9}']]) {
    const root = temporary(t), infrastructure = fakeInfrastructure(t, root), execute = infrastructure.executeIsolated;
    infrastructure.executeIsolated = request => {
      const run = execute(request);
      fs.mkdirSync(path.join(request.root, 'outputs'));
      fs.writeFileSync(path.join(request.root, 'outputs', name), infrastructure.requests.length === 1 ? first : second);
      return run;
    };
    const summary = harness.captureGoldens({ source: root, scenarioIds: [scenarios[0].id], passes: 2 }, infrastructure);
    assert.equal(summary.state, 'REVIEW_REQUIRED');
    assert.ok(summary.records[0].comparison.differences.some(item => item.path.includes('artifacts')));
  }
});

test('strict --passes 2 rejects one-pass capture before creating an archive', t => {
  const root = temporary(t);
  for (const passes of [1, 3, NaN, '2']) assert.throws(() => harness.captureGoldens({ source: root, passes }), /exactly --passes 2/);
  assert.equal(fs.existsSync(path.join(root, harness.ARCHIVE_BASE)), false);
});

test('worker metadata cannot misrepresent selected family, intent or execution mode', () => {
  const scenario = scenarios[0], worker = workerRecord(scenario.id, { family: scenario.family, labeledIntent: scenario.intent });
  harness.requireWorkerBinding(worker, scenario);
  for (const field of ['family', 'labeledIntent', 'mode', 'outcome']) assert.throws(() => harness.requireWorkerBinding({ ...worker, [field]: 'different' }, scenario), /mismatch/);
});

test('copied configuration mutations retain before/after hashes, deltas and raw bytes', t => {
  const root = temporary(t), archive = path.join(root, 'archive'), config = path.join(root, 'scripts/config');
  fs.mkdirSync(config, { recursive: true }); fs.mkdirSync(archive);
  const file = path.join(config, 'notebooks.json');
  fs.writeFileSync(file, '{"cloudSyncState":"VERIFIED","lastSyncAttemptAt":"2026-10-01"}');
  const before = harness.scopedRecords(root, 'scripts/config');
  const afterBytes = '{"cloudSyncState":"FAILED","lastSyncAttemptAt":"2026-10-05"}';
  fs.writeFileSync(file, afterBytes);
  fs.writeFileSync(path.join(config, 'created.json'), '{"quantity":2}');
  const sideEffects = harness.captureConfigSideEffects({ root, manifest: { files: before } }, archive);
  assert.equal(sideEffects.disposition, 'OBSERVED_ISOLATED_CONFIG_SIDE_EFFECTS_NOT_ACCEPTANCE');
  assert.equal(sideEffects.changed.length, 2);
  assert.notEqual(sideEffects.before[0].sha256, sideEffects.after.find(item => item.path === before[0].path).sha256);
  assert.equal(sideEffects.semantics.find(item => item.path.endsWith('notebooks.json')).content.cloudSyncState, 'FAILED');
  assert.equal(fs.readFileSync(path.join(archive, 'isolated-config/scripts/config/notebooks.json'), 'utf8'), afterBytes);
});

test('copied configuration removals remain visible rather than being silently dropped', t => {
  const root = temporary(t), config = path.join(root, 'scripts/config');
  fs.mkdirSync(config, { recursive: true });
  fs.writeFileSync(path.join(config, 'removed.json'), '{"quantity":2}');
  const before = harness.scopedRecords(root, 'scripts/config');
  fs.unlinkSync(path.join(config, 'removed.json'));
  const sideEffects = harness.captureConfigSideEffects({ root, manifest: { files: before } }, path.join(root, 'archive'));
  assert.equal(sideEffects.removed.length, 1);
  assert.equal(sideEffects.removed[0].sha256, before[0].sha256);
  assert.equal(sideEffects.disposition, 'OBSERVED_ISOLATED_CONFIG_SIDE_EFFECTS_NOT_ACCEPTANCE');
});

test('dependency and protected-tree identity changes cannot qualify a complete receipt', t => {
  for (const field of ['sourceProtectedFingerprint', 'protectedFingerprint', 'dependency']) {
    const root = temporary(t), infrastructure = fakeInfrastructure(t, root), create = infrastructure.createIsolation;
    infrastructure.createIsolation = () => {
      const receipt = create();
      if (infrastructure.roots.length === 2) {
        if (field === 'dependency') receipt.dependencies = [{ path: 'node_modules', metadataFingerprint: 'different-installation' }];
        else receipt.manifest[field] = 'different-protected-tree';
      }
      return receipt;
    };
    const summary = harness.captureGoldens({ source: root, scenarioIds: [scenarios[0].id] }, infrastructure);
    assert.equal(summary.records[0].sameInputs, false);
    assert.equal(summary.state, 'REVIEW_REQUIRED');
  }
});

test('missing source identity and forged execution binding fail capture with retained logs', t => {
  for (const fault of ['missing-source', 'foreign-copy', 'wrong-script', 'different-request']) {
    const root = temporary(t), infrastructure = fakeInfrastructure(t, root);
    if (fault === 'missing-source') {
      const create = infrastructure.createIsolation;
      infrastructure.createIsolation = () => { const receipt = create(); delete receipt.manifest.sourceAccountedFingerprint; return receipt; };
    } else {
      const execute = infrastructure.executeIsolated;
      infrastructure.executeIsolated = request => {
        const run = execute(request);
        if (fault === 'foreign-copy') run.snapshotRoot = root;
        else if (fault === 'wrong-script') run.script = 'other.js';
        else run.args = ['{}'];
        return run;
      };
    }
    const summary = harness.captureGoldens({ source: root, scenarioIds: [scenarios[0].id] }, infrastructure);
    assert.equal(summary.state, 'REVIEW_REQUIRED');
    assert.ok(summary.records[0].passes.every(pass => pass.captureError));
    if (fault !== 'missing-source') assert.ok(fs.existsSync(path.join(summary.archive, scenarios[0].id, 'pass-1', 'stdout.log')));
  }
});
test('copy failures are archived as failures rather than disappearing from family coverage', t => {
  const root = temporary(t);
  const summary = harness.captureGoldens({ source: root, scenarioIds: [scenarios[0].id] }, { createIsolation: () => { throw new Error('copy changed'); } });
  assert.equal(summary.state, 'REVIEW_REQUIRED');
  assert.equal(summary.records[0].passes.length, 2);
  assert.equal(summary.records[0].passes[0].captureError.message, 'copy changed');
});

test('execution binding accepts native platform separators and canonical worker path', () => {
  const scenario = scenarios[0], receipt = { root: 'owned-copy', manifest: { inputTreeFingerprint: 'owned-input' } };
  const run = { snapshotRoot: receipt.root, inputTreeFingerprint: 'owned-input', script: 'scripts/maintenance/skill_workflow/golden_worker.js', args: [JSON.stringify(scenario)] };
  harness.requireRunBinding(receipt, run, scenario);
  harness.requireRunBinding(receipt, { ...run, script: run.script.split('/').join(path.sep) }, scenario);
});

test('native worker path normalization preserves every exact run binding rejection', () => {
  const scenario = scenarios[0], receipt = { root: 'owned-copy', manifest: { inputTreeFingerprint: 'owned-input' } };
  const run = { snapshotRoot: receipt.root, inputTreeFingerprint: 'owned-input', script: 'scripts/maintenance/skill_workflow/golden_worker.js'.split('/').join(path.sep), args: [JSON.stringify(scenario)] };
  for (const script of [undefined, null, [], {}, 0, '', 'golden_worker.js', './scripts/maintenance/skill_workflow/golden_worker.js', 'scripts/maintenance/../maintenance/skill_workflow/golden_worker.js', path.resolve(run.script), run.script + '.other']) {
    assert.throws(() => harness.requireRunBinding(receipt, { ...run, script }, scenario), /does not bind/);
  }
  for (const fault of [{ snapshotRoot: 'foreign-copy' }, { inputTreeFingerprint: 'foreign-input' }, { args: [] }, { args: ['{}'] }, { args: [JSON.stringify(scenario), 'extra'] }]) {
    assert.throws(() => harness.requireRunBinding(receipt, { ...run, ...fault }, scenario), /does not bind/);
  }
});

test('POSIX platform simulation preserves strict backslash rejection without blanket replacement', () => {
  const vm = require('vm'), { createRequire } = require('module');
  const file = require.resolve('../../scripts/maintenance/capture_skill_workflow_goldens.js'), requireAtFile = createRequire(file);
  const moduleRecord = { exports: {} };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), { module: moduleRecord, exports: moduleRecord.exports,
    require: name => name === 'path' ? { ...path, sep: '/' } : requireAtFile(name), __dirname: path.dirname(file), __filename: file, process, console }, { filename: file });
  const scenario = scenarios[0], receipt = { root: 'owned-copy', manifest: { inputTreeFingerprint: 'owned-input' } };
  const run = { snapshotRoot: receipt.root, inputTreeFingerprint: 'owned-input', script: 'scripts/maintenance/skill_workflow/golden_worker.js', args: [JSON.stringify(scenario)] };
  moduleRecord.exports.requireRunBinding(receipt, run, scenario);
  assert.throws(() => moduleRecord.exports.requireRunBinding(receipt, { ...run, script: run.script.split('/').join('\\') }, scenario), /does not bind/);
});
