'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const { projectBoqArtifacts, projectLedger, projectDecisionHistory, projectTelemetry, verifiedBytes } = require('../../scripts/maintenance/skill_workflow/golden_boq_artifacts.js');
const { projectBoqResponse, marker } = require('../../scripts/maintenance/skill_workflow/golden_boq_runtime.js');
const { semanticProjection, compareGolden } = require('../../scripts/maintenance/skill_workflow/golden_projection.js');
const { safeWriteJsonAtomic } = require('../../scripts/lib/system/fs_compat.js');
const authorRoot = path.resolve(__dirname, '../..'), sha = value => crypto.createHash('sha256').update(value).digest('hex');
const date = '2026-10-05T06:23:40.911Z', later = '2026-10-05T06:27:09.673Z', trace = 'TRC-1791181407656-698FB0';
function amendReport(fixture, text) {
  fixture.sources.set(fixture.reportPath, text);
  fixture.ledger.artifacts[0].sha256 = sha(text);
  fixture.ledger.artifacts[0].sizeBytes = Buffer.byteLength(text);
}
function fixture(t, number = 1, mutate = () => {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'boq-projection-test-'));
  t.after(() => { const actual = fs.realpathSync(root), temp = fs.realpathSync(os.tmpdir()); assert.ok(actual.startsWith(temp + path.sep)); assert.match(path.basename(actual), /^boq-projection-test-/); fs.rmSync(actual, { recursive: true, force: true }); });
  const timestamp = number === 1 ? date : later, decisionId = `DEC-17911814${number}4813-abcd`;
  const dir = 'outputs/Vendor/Gen1/Product', reportPath = `${dir}/reports/BOQ_Evaluation_sample.md`, ledgerPath = `${dir}/reports/evidence/evidence_log_${trace}.json`;
  const summaryPath = `${dir}/reports/evidence/evidence_summary_${trace}.md`, payloadPath = `${dir}/notebook_sync_payload_Product.md`;
  const decision = { decisionId, timestamp, selectedAlternative: { id: 'SKU-1', capExDeltaUsd: 50 }, confidence: 0.75 };
  const status = { latencyMs: number * 12, timeTaken: `0m 0s (${number * 12}ms)`, source: 'LOCAL_RAG_FALLBACK', citationsCount: 2 };
  const graph = { auditLog: [{ timestamp, skuTarget: 'SKU-1', status: 'FAILED', details: 'physical violation' }], rankedSolutions: [{ decisionTrace: [decision], finalValidation: { checkedAt: timestamp, status: 'ACTION_REQUIRED', graph: { auditLog: [{ timestamp, ruleText: 'preserve rule' }] } } }] };
  const parsed = { response: { traceId: trace, result: { conflictGraph: graph, notebookLmStatus: status } }, envelopes: [{ data: { traceId: trace, chassisDir: path.join(root, dir), chassisPrefix: 'Product', outputReportPath: path.join(root, reportPath), evidenceLogPath: path.join(root, ledgerPath), evidenceSummaryPath: path.join(root, summaryPath), notebookLmStatus: status, conflictGraph: graph } }] };
  const ledger = { version: '2.0.0', traceId: trace, chassis: 'Product', execution: {}, health: {}, customerInput: {}, sharedState: {},
    startedAt: timestamp, completedAt: timestamp, totalDurationMs: number * 12, events: [{ timestamp, event: 'ACTION_REQUIRED' }], phases: { phase_3: { phaseNumber: 3, phaseName: 'Math', startedAt: timestamp, completedAt: timestamp, durationMs: number * 12, status: 'ACTION_REQUIRED', checks: [] } },
    candidateAttempts: [{ timestamp, candidateGate: { candidateResults: [{ validation: { checkedAt: timestamp, graph: { auditLog: [{ timestamp, skuTarget: 'SKU-1', status: 'FAILED' }] } } }] } }],
    activeRulesReached: [], phaseResolutions: [], workflowFailures: [], arbitrationDecisions: [], modernizationDecisions: [], skuAuditLedger: [], notebookLmTraces: [], artifacts: [] };
  const sources = new Map([[reportPath, `# Report\n**Evaluation Date**: ${timestamp}  \n**Quantity**: 2\n> ⏱️ **Synthesis Time Taken**: \`${status.timeTaken}\`\n`],
    [payloadPath, `# Payload\n**Sync Timestamp**: ${timestamp}\n| SKU-1 | 2 | 50 |\n`],
    ['outputs/history/master_universal_knowledge_charter.md', `# Charter\n**Document Version**: \`2.0.0\` | **Generated**: \`${timestamp}\`\nRule from 2026-10-01 preserved\n`]]);
  const reportBytes = Buffer.from(sources.get(reportPath));
  ledger.artifacts.push({ role: 'ANALYSIS_REPORT', filePath: path.join(root, reportPath), exists: true, sizeBytes: reportBytes.length, sha256: sha(reportBytes), recordedAt: timestamp });
  const currentDecision = { sessionId: `SESSION-179118140765${number}`, savedAt: timestamp, decisions: [decision], decisionsCount: 1 };
  const telemetry = { version: '1.2.0', lastUpdated: timestamp, history: [{ id: trace, traceId: trace, timestamp, durationMs: number * 12, memoryUsage: { rssMb: 20 + number, heapUsedMb: 10 + number, heapTotalMb: 15 + number }, stageBreakdown: { stage1ParsingMs: number * 2 }, confidenceScore: 0.7 }, { id: 'TRC-HISTORIC', timestamp: date, durationMs: 33 }] };
  const registry = { registryVersion: '2.0.0', generatedAt: timestamp, lastUpdated: timestamp, universalRules: [{ timestamp: '2026-10-01T00:00:00Z', sku: 'SKU-1' }] };
  const json = new Map([[ledgerPath, ledger], ['outputs/history/decision_traces.json', [currentDecision, { sessionId: 'SESSION-HISTORIC', savedAt: date, decisions: [] }]], ['outputs/history/pipeline_telemetry.json', telemetry], ['outputs/history/master_knowledge_registry.json', registry]]);
  mutate({ parsed, ledger, sources, json, reportPath, ledgerPath, summaryPath, telemetry, currentDecision, registry });
  const { EvidenceLedger } = require(path.join(authorRoot, 'scripts/lib/system/evidence_ledger.js')), instance = Object.create(EvidenceLedger.prototype); Object.assign(instance, ledger);
  sources.set(summaryPath, EvidenceLedger.prototype._renderMarkdownSummary.call(instance));
  const artifacts = [], records = [];
  for (const [relative, content] of [...sources, ...json]) {
    const file = path.join(root, relative); fs.mkdirSync(path.dirname(file), { recursive: true });
    if (typeof content === 'string') fs.writeFileSync(file, content); else safeWriteJsonAtomic(file, content);
    const bytes = fs.readFileSync(file), record = { path: relative, bytes: bytes.length, sha256: sha(bytes) }; records.push(record);
    artifacts.push(typeof content === 'string' ? { ...record, state: 'EXACT_BYTES' } : { path: relative, state: 'PARSED_JSON', content });
  }
  const options = { records, rendererRoot: authorRoot }, result = projectBoqArtifacts(artifacts, parsed, root, options);
  return { root, parsed, ledger, artifacts, records, options, result, reportPath, ledgerPath, summaryPath, semantic: semanticProjection({ ...parsed, artifacts: result.artifacts }, { root }) };
}
test('runtime pair compares equal with raw SHA proof, full report content and exact summary reproduction', t => {
  const first = fixture(t, 1), second = fixture(t, 2);
  assert.equal(compareGolden(first.semantic, second.semantic).equal, true);
  assert.equal(first.result.proof.find(p => p.role === 'ANALYSIS_REPORT').semanticSha256, second.result.proof.find(p => p.role === 'ANALYSIS_REPORT').semanticSha256);
  assert.equal(first.result.artifacts.find(a => a.path === first.summaryPath).state, 'VERIFIED_CANONICAL_BOQ_LEDGER_SUMMARY');
  assert.equal(first.ledger.artifacts[0].sha256, first.records.find(r => r.path === first.reportPath).sha256);
});
for (const [label, mutate] of [
  ['report quantity', f => amendReport(f, f.sources.get(f.reportPath).replace('**Quantity**: 2', '**Quantity**: 3'))],
  ['nonruntime Markdown', f => amendReport(f, f.sources.get(f.reportPath) + 'source date 2026-10-02\n')],
  ['graph status', f => f.parsed.response.result.conflictGraph.auditLog[0].status = 'PASSED'],
  ['graph SKU', f => f.parsed.response.result.conflictGraph.auditLog[0].skuTarget = 'SKU-2'],
  ['decision price', f => f.currentDecision.decisions[0].selectedAlternative.capExDeltaUsd = 0],
  ['citation count', f => f.parsed.response.result.notebookLmStatus.citationsCount = 0],
  ['source date', f => f.registry.universalRules[0].timestamp = later],
  ['historical telemetry timing', f => f.telemetry.history[1].durationMs = 99],
  ['ledger role', f => f.ledger.artifacts[0].role = 'CATALOG'],
  ['unknown phase', f => f.ledger.phases.phase_10 = { startedAt: later, durationMs: 77 }]
]) test(`${label} remains a difference`, t => { const first = fixture(t), second = fixture(t, 2, mutate); assert.equal(compareGolden(first.semantic, second.semantic).equal, false); });
for (const [label, mutate] of [
  ['raw hash', f => f.ledger.artifacts[0].sha256 = '0'.repeat(64)],
  ['raw size', f => f.ledger.artifacts[0].sizeBytes++],
  ['foreign path', f => f.ledger.artifacts[0].filePath += '.foreign']
]) test(`canonical analysis report ${label} rejects capture even if both passes contain the same corruption`, t => {
  assert.throws(() => fixture(t, 1, mutate), /BOQ_ANALYSIS_REPORT_INTEGRITY_MISMATCH/);
  assert.throws(() => fixture(t, 2, mutate), /BOQ_ANALYSIS_REPORT_INTEGRITY_MISMATCH/);
});
for (const invalid of [null, true, '12', -1, Infinity, NaN, {}, []]) test(`invalid timing remains observable: ${String(invalid)}`, () => {
  const before = { response: { result: { stageBreakdown: { stage1ParsingMs: 12 } } } }, after = { response: { result: { stageBreakdown: { stage1ParsingMs: invalid } } } };
  assert.equal(compareGolden(projectBoqResponse(before), projectBoqResponse(after)).equal, false);
});
for (const invalid of [null, true, 1, '2026-02-30T00:00:00Z', '2026-10-05', 'invalid']) test(`invalid timestamp remains observable: ${String(invalid)}`, () => {
  assert.equal(projectLedger({ startedAt: invalid }).startedAt, invalid);
});
test('unknown paths, source dates, absent fields and order are not runtime fields', () => {
  const input = { response: { result: { arbitrary: { checkedAt: date }, stageBreakdown: { unknownMs: 2 }, sourceDate: date } } };
  assert.deepEqual(projectBoqResponse(input), input);
  assert.deepEqual(projectLedger({ sourceDate: date, phases: { phase_10: { durationMs: 12 } } }), { sourceDate: date, phases: { phase_10: { durationMs: 12 } } });
  assert.equal(compareGolden(projectBoqResponse(input), projectBoqResponse({ response: { result: {} } })).equal, false);
});
test('exact formatted latency required; invalid, inconsistent and alternate strings stay facts', () => {
  for (const value of ['0m 0s (13ms)', '12ms', 'UNKNOWN', null]) {
    const input = { response: { result: { notebookLmStatus: { latencyMs: 12, timeTaken: value } } } };
    assert.equal(projectBoqResponse(input).response.result.notebookLmStatus.timeTaken, value);
  }
  assert.equal(projectBoqResponse({ response: { result: { notebookLmStatus: { latencyMs: 12, timeTaken: '0m 0s (12ms)' } } } }).response.result.notebookLmStatus.timeTaken, marker);
});
test('unobserved response provenance and direct-envelope candidate locations remain facts', () => {
  const value = { response: { result: { provenanceTrace: { timestamp: date, grounding: { latencyMs: 12 } } } }, envelopes: [{ data: { adversarialGateResult: { candidateResults: [{ validation: { checkedAt: date } }] } } }] };
  assert.deepEqual(projectBoqResponse(value), value);
});
test('archive stale metadata, tampered bytes, foreign path, size and duplicate records fail closed', t => {
  const sample = fixture(t), baseline = structuredClone(sample.records);
  for (const mutation of [records => records.find(r => r.path === sample.reportPath).sha256 = '0'.repeat(64), records => records.find(r => r.path === sample.reportPath).bytes++, records => records.push(structuredClone(records.find(r => r.path === sample.reportPath))), records => records.find(r => r.path === sample.reportPath).path += '.foreign']) {
    const records = structuredClone(baseline); mutation(records);
    assert.throws(() => projectBoqArtifacts(sample.artifacts, sample.parsed, sample.root, { ...sample.options, records }), /BOQ_ANALYSIS_REPORT_INTEGRITY_MISMATCH/);
  }
  fs.appendFileSync(path.join(sample.root, sample.reportPath), 'tampered');
  assert.throws(() => projectBoqArtifacts(sample.artifacts, sample.parsed, sample.root, sample.options), /BOQ_ANALYSIS_REPORT_INTEGRITY_MISMATCH/);
});
test('raw JSON content tampering and foreign returned references do not gain artifact normalization', t => {
  const sample = fixture(t), changed = structuredClone(sample.artifacts); changed.find(a => a.path === sample.ledgerPath).content.startedAt = later;
  assert.throws(() => projectBoqArtifacts(changed, sample.parsed, sample.root, sample.options), /BOQ_ARTIFACT_INTEGRITY_MISMATCH/);
  const foreign = structuredClone(sample.parsed); foreign.envelopes[0].data.evidenceLogPath += '.foreign';
  assert.equal(projectBoqArtifacts(sample.artifacts, foreign, sample.root, sample.options).artifacts.find(a => a.path === sample.ledgerPath).content.startedAt, date);
});
test('generic Markdown and JSON remain exact; malformed or duplicate runtime header is not normalized', t => {
  const sample = fixture(t), generics = [{ path: 'outputs/generic.md', state: 'EXACT_BYTES', bytes: 1, sha256: 'unknown' }, { path: 'outputs/generic.json', state: 'PARSED_JSON', content: { timestamp: date } }];
  assert.deepEqual(projectBoqArtifacts(generics, sample.parsed, sample.root).artifacts, generics);
  for (const bad of ['**Evaluation Date**: invalid  \n', `**Evaluation Date**: ${date}  \n**Evaluation Date**: ${later}  \n`]) {
    const file = path.join(sample.root, sample.reportPath); fs.writeFileSync(file, bad);
    const record = { path: sample.reportPath, sha256: sha(bad), bytes: Buffer.byteLength(bad) }, artifact = { ...record, state: 'EXACT_BYTES' };
    assert.deepEqual(projectBoqArtifacts([artifact], sample.parsed, sample.root, { records: [record] }).artifacts, [artifact]);
  }
});
test('historical decisions and telemetry remain unmodified and foreign current ids stay facts', () => {
  const decisions = [{ sessionId: 'SESSION-1791181407656', savedAt: date, decisions: [{ decisionId: 'DEC-1791181407656-abcd', timestamp: date }] }];
  assert.deepEqual(projectDecisionHistory(decisions, {}), decisions);
  const telemetry = { lastUpdated: date, history: [{ id: trace, traceId: 'TRC-FOREIGN', timestamp: date, durationMs: 22 }] };
  assert.deepEqual(projectTelemetry(telemetry, { response: { traceId: trace } }), telemetry);
});
test('duplicate current decision or telemetry identities remain visible rather than normalizing ambiguous histories', t => {
  const sample = fixture(t), decisions = sample.artifacts.find(a => a.path === 'outputs/history/decision_traces.json').content;
  const duplicate = structuredClone(decisions); duplicate.push(structuredClone(duplicate[0]));
  assert.throws(() => projectDecisionHistory(duplicate, sample.parsed), /BOQ_CURRENT_DECISION_HISTORY_AMBIGUOUS/);
  const telemetry = sample.artifacts.find(a => a.path === 'outputs/history/pipeline_telemetry.json').content, duplicateTelemetry = structuredClone(telemetry);
  duplicateTelemetry.history.push(structuredClone(duplicateTelemetry.history[0]));
  assert.throws(() => projectTelemetry(duplicateTelemetry, sample.parsed), /BOQ_CURRENT_TELEMETRY_HISTORY_AMBIGUOUS/);
});
test('historical rows bypass generic trace/root substitutions and retain every raw field', () => {
  const root = 'C:/copied-root', historical = { id: 'OLD', note: trace, oldPath: root + '/old.json', timestamp: date, invalid: undefined };
  const value = { response: { traceId: trace }, artifacts: [{ path: 'outputs/history/pipeline_telemetry.json', state: 'PARSED_JSON', content: { history: [{ id: trace }, historical] } }, { path: 'outputs/history/decision_traces.json', state: 'PARSED_JSON', content: [{ sessionId: 'CURRENT' }, historical] }] };
  const result = semanticProjection(value, { root });
  assert.deepEqual(result.artifacts[0].content.history[1], historical);
  assert.deepEqual(result.artifacts[1].content[1], historical);
});
test('summary byte tampering and missing renderer fail canonical reproduction', t => {
  const sample = fixture(t), summary = sample.artifacts.find(a => a.path === sample.summaryPath), file = path.join(sample.root, summary.path);
  fs.appendFileSync(file, 'changed rule'); const bytes = fs.readFileSync(file), record = sample.records.find(r => r.path === summary.path);
  record.sha256 = sha(bytes); record.bytes = bytes.length; summary.sha256 = record.sha256; summary.bytes = record.bytes;
  assert.equal(projectBoqArtifacts(sample.artifacts, sample.parsed, sample.root, sample.options).artifacts.find(a => a.path === summary.path).state, 'EXACT_BYTES');
  assert.equal(projectBoqArtifacts(sample.artifacts, sample.parsed, sample.root, { records: sample.records, rendererRoot: sample.root }).artifacts.find(a => a.path === summary.path).state, 'EXACT_BYTES');
});
test('native junction archive alias cannot prove regular enclosed artifact bytes', t => {
  const sample = fixture(t), original = sample.artifacts.find(a => a.path === sample.reportPath), target = path.join(sample.root, 'archive-target'), alias = path.join(sample.root, 'archive-alias');
  fs.mkdirSync(target); fs.copyFileSync(path.join(sample.root, sample.reportPath), path.join(target, 'report.md'));
  fs.symlinkSync(target, alias, 'junction');
  const record = { ...sample.records.find(r => r.path === sample.reportPath), archivePath: 'report.md' };
  assert.equal(verifiedBytes(original, sample.root, { records: [record], artifactBase: alias }), null);
});
test('canonical capturePass retains raw logs and an unqualified error for a corrupt recorded analysis hash', t => {
  const sample = fixture(t), harness = require('../../scripts/maintenance/capture_skill_workflow_goldens.js'), { RESULT_MARKER } = require('../../scripts/maintenance/skill_workflow/golden_worker.js');
  const scenario = { id: 'S03-proof-test', family: 'BOQ', intent: 'BOQ_EVALUATION', query: 'fixture' }, archive = path.join(sample.root, 'capture-archive'); fs.mkdirSync(archive);
  sample.ledger.artifacts[0].sha256 = '0'.repeat(64); safeWriteJsonAtomic(path.join(sample.root, sample.ledgerPath), sample.ledger);
  const manifest = { files: [], inputTreeFingerprint: 'test-input', sourceAccountedFingerprint: 'test-source', sourceProtectedFingerprint: 'test-protected', protectedFingerprint: 'test-copy-protected' };
  const infrastructure = {
    createIsolation: () => ({ root: sample.root, ownerToken: 'test-owner', manifest, dependencies: [] }),
    executeIsolated: request => {
      const runDir = path.join(sample.root, 'runlogs'); fs.mkdirSync(runDir);
      const worker = { schemaVersion: 1, scenarioId: scenario.id, family: scenario.family, labeledIntent: scenario.intent, mode: 'CANONICAL_ROUTER', outcome: 'RETURNED', response: sample.parsed.response };
      fs.writeFileSync(path.join(runDir, 'stdout.log'), `__EVAL_RESULT_JSON__${JSON.stringify(sample.parsed.envelopes[0])}__EVAL_RESULT_JSON__${RESULT_MARKER}${JSON.stringify(worker)}${RESULT_MARKER}`);
      fs.writeFileSync(path.join(runDir, 'stderr.log'), 'raw diagnostic retained');
      return { runDir, snapshotRoot: sample.root, inputTreeFingerprint: manifest.inputTreeFingerprint, script: request.script, args: request.args, exitCode: 0, sourceUnchanged: true, sourceProtectedUnchanged: true, deniedAttempts: [] };
    }
  };
  const result = harness.capturePass(sample.root, scenario, 1, archive, infrastructure);
  assert.equal(result.qualification.qualified, false); assert.match(result.captureError.message, /BOQ_ANALYSIS_REPORT_INTEGRITY_MISMATCH/);
  assert.equal(fs.readFileSync(path.join(archive, scenario.id, 'pass-1/stderr.log'), 'utf8'), 'raw diagnostic retained');
  assert.equal(JSON.parse(fs.readFileSync(path.join(archive, scenario.id, 'pass-1/capture.json'))).qualification.qualified, false);
  assert.ok(fs.existsSync(path.join(archive, scenario.id, 'pass-1/artifacts', sample.reportPath)));
});
