'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const harness = require('../../scripts/maintenance/capture_skill_workflow_goldens.js');
const { RESULT_MARKER } = require('../../scripts/maintenance/skill_workflow/golden_worker.js');

for (const id of ['S17-diagnostic-export-contract', 'S17-authorized-export-contract']) {
  test('independent real controller retains controlled mode for ' + id, () => {
    const source = fs.mkdtempSync(path.join(os.tmpdir(), 'cp0-controller-mode-review-'));
    const copies = [];
    const infrastructure = {
      createIsolation() {
        const root = path.join(source, 'copies', 'copy-' + copies.length);
        const control = path.join(root, 'control'); fs.mkdirSync(control, { recursive: true }); copies.push(root);
        return { root, control, ownerToken: 'review-fixture-owner', dependencies: [], manifest: { files: [],
          inputTreeFingerprint: 'review-same-inputs', sourceAccountedFingerprint: 'review-accounted',
          sourceProtectedFingerprint: 'review-protected', protectedFingerprint: 'review-copied-protected',
          head: 'fixture-head', branch: 'fixture-branch', status: 'fixture-state' } };
      },
      executeIsolated(request) {
        const descriptor = JSON.parse(request.args[0]);
        const runDir = path.join(request.root, 'control');
        const record = { schemaVersion: 1, scenarioId: descriptor.id, family: descriptor.family, labeledIntent: descriptor.intent,
          mode: 'CONTROLLED_EXPORT_CONTRACT', outcome: 'RETURNED', response: { status: 'TEST_DOUBLE_CONTROLLER_ONLY', hardwareAccepted: false, vendorAccepted: false }, error: null };
        fs.writeFileSync(path.join(runDir, 'stdout.log'), RESULT_MARKER + JSON.stringify(record) + RESULT_MARKER);
        fs.writeFileSync(path.join(runDir, 'stderr.log'), '');
        require('../../scripts/lib/system/fs_compat.js').safeWriteJsonAtomic(path.join(runDir, 'receipt.json'), { mode: 'INDEPENDENT_CONTROLLER_TEST_DOUBLE' });
        return { runDir, snapshotRoot: request.root, inputTreeFingerprint: 'review-same-inputs', script: request.script, args: request.args,
          exitCode: 0, error: null, sourceUnchanged: true, sourceProtectedUnchanged: true, deniedAttempts: [] };
      }
    };
    const summary = harness.captureGoldens({ source, scenarioIds: [id] }, infrastructure);
    assert.equal(summary.records[0].qualified, true); assert.equal(summary.records[0].reproducible, true);
    assert.equal(summary.records[0].mode, 'CONTROLLED_EXPORT_CONTRACT');
    const row = summary.coverage.find(item => item.id === 'S17');
    assert.deepEqual(row.runtimeScenariosCaptured, []); assert.deepEqual(row.controlledExportContractsCaptured, [id]);
  });
}
