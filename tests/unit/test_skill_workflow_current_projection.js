'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const { captureProjectionInputs, reconciliationTelemetry, validateRfpDecisionHistory, projectRfpGeneratedFields, driftPayloadProjection } = require('../../scripts/maintenance/skill_workflow/golden_current_execution.js');
const { projectBoqResponse, marker } = require('../../scripts/maintenance/skill_workflow/golden_boq_runtime.js');
const { semanticProjection, compareGolden } = require('../../scripts/maintenance/skill_workflow/golden_projection.js');
const { normalizeLearningText } = require('../../scripts/lib/sync/google_sheets_writer.js');
const { safeWriteJsonAtomic } = require('../../scripts/lib/system/fs_compat.js');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const DATE = '2026-10-05T16:09:38.870Z', UPDATED = '2026-10-05T16:09:38.879Z';
const telemetryPath = 'outputs/history/pipeline_telemetry.json', decisionPath = 'outputs/history/decision_traces.json';
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cp0-v4-fixture-'));
  t.after(() => { const actual = fs.realpathSync(root), temp = fs.realpathSync(os.tmpdir()); assert.ok(actual.startsWith(temp + path.sep)); assert.match(path.basename(actual), /^cp0-v4-fixture-/); fs.rmSync(actual, { recursive: true, force: true }); });
  const records = [], artifacts = [], baselineRecords = [], baselines = [];
  function write(file, content, baseline = false) {
    const relative = (baseline ? 'projection-inputs/' : 'artifacts/') + file, target = path.join(root, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (typeof content === 'string') fs.writeFileSync(target, content); else safeWriteJsonAtomic(target, content);
    const bytes = fs.readFileSync(target), record = { path: file, archivePath: relative, bytes: bytes.length, sha256: sha(bytes) };
    const artifact = typeof content === 'string' ? { path: file, state: 'EXACT_BYTES', bytes: record.bytes, sha256: record.sha256 } : { path: file, state: 'PARSED_JSON', content };
    (baseline ? baselineRecords : records).push(record); (baseline ? baselines : artifacts).push(artifact); return artifact;
  }
  return { root, records, artifacts, write, options: { records, artifactBase: root, projectionInputs: { base: root, artifacts: baselines, records: baselineRecords, startedAt: '2026-10-05T16:09:00.000Z' } } };
}
function reconciliation(t, mutate = () => {}, baselineMutate = () => {}) {
  const f = fixture(t), audit = { verificationTimestamp: DATE, isTwoBaselineComparison: true, isSingleFileAudit: false, chassisModel: 'Product', proposedRank: 1,
    totalVendorSkus: 2, totalProposedSkus: 2, is100PercentMatch: true, requiresFreshScrape: false,
    discrepancies: { addedByVendor: [], removedByVendor: [], priceDeltas: [], uncatalogedSkus: [], quantityDeltas: [], pricingGaps: [] } };
  const parsed = { response: { classification: { intent: 'BOM_RECONCILIATION' }, result: { intent: 'BOM_RECONCILIATION', isTwoBaselineComparison: true, auditReport: audit } } };
  const prior = { version: '1.2.0', lastUpdated: '2026-10-01T00:00:00.000Z', totalReconciliations: 2,
    history: [{ id: 'OLD', timestamp: DATE, durationMs: 5 }], reconciliationHistory: [{ id: 'OLD-RECON', timestamp: '2026-10-01T00:00:00.000Z', sku: 'SKU-1', price: 12, quantity: 2 }] };
  const current = { id: 'RECON-1791216578879', timestamp: DATE, chassisModel: 'Product', proposedRank: 1, totalVendorSkus: 2, totalProposedSkus: 2,
    is100PercentMatch: true, requiresFreshScrape: false, addedCount: 0, removedCount: 0, priceDeltaCount: 0, uncatalogedCount: 0 };
  const content = { ...structuredClone(prior), lastUpdated: UPDATED, totalReconciliations: 3, reconciliationHistory: [current, ...structuredClone(prior.reconciliationHistory)] };
  baselineMutate(prior); mutate({ parsed, current, content, prior });
  f.write(telemetryPath, prior, true); const artifact = f.write(telemetryPath, content);
  return { ...f, parsed, artifact, current, prior };
}
test('V4 normalizes only unique current reconciliation metadata and preserves exact historical rows/counters', t => {
  const f = reconciliation(t), p = reconciliationTelemetry(f.artifact, f.parsed, f.root, f.options);
  assert.equal(p.artifact.content.lastUpdated, marker); assert.equal(p.artifact.content.reconciliationHistory[0].timestamp, marker);
  assert.equal(p.artifact.content.totalReconciliations, 3); assert.deepEqual(p.artifact.content.reconciliationHistory[1], f.prior.reconciliationHistory[0]);
  assert.deepEqual(p.artifact.content.history, f.prior.history); assert.equal(p.proof.normalized.length, 3);
});
for (const [name, mutation] of [
  ['duplicate current row', f => f.content.reconciliationHistory.push(structuredClone(f.current))],
  ['wrong timestamp binding', f => f.current.timestamp = '2026-10-05T16:09:38.871Z'],
  ['non-generated id', f => f.current.id = 'recon-customer'],
  ['id outside producer time', f => f.current.id = 'RECON-1791216578899'],
  ['row count', f => f.current.totalVendorSkus++], ['counter', f => f.content.totalReconciliations++],
  ['historical quantity', f => f.content.reconciliationHistory[1].quantity++], ['historical price', f => f.content.reconciliationHistory[1].price++],
  ['historical SKU', f => f.content.reconciliationHistory[1].sku = 'SKU-2'], ['history order', f => f.content.reconciliationHistory.reverse()],
  ['extra historical timestamp', f => f.content.history[0].timestamp = UPDATED], ['invalid lastUpdated', f => f.content.lastUpdated = '2026-02-30T00:00:00Z']
]) test(`V4 reconciliation rejects ${name}`, t => { const f = reconciliation(t, mutation); assert.throws(() => reconciliationTelemetry(f.artifact, f.parsed, f.root, f.options), /CP0_CURRENT_RECONCILIATION/); });
test('V4 reconciliation rejects a current ID already present before execution', t => {
  const f = reconciliation(t, () => {}, prior => prior.reconciliationHistory[0].id = 'RECON-1791216578879');
  assert.throws(() => reconciliationTelemetry(f.artifact, f.parsed, f.root, f.options), /AMBIGUOUS/);
});
for (const mutate of [f => f.parsed.response.classification.intent = 'OTHER', f => f.parsed.response.result.isTwoBaselineComparison = false,
  f => f.parsed.response.result.auditReport.isSingleFileAudit = true, f => f.parsed.response.result.auditReport.verificationTimestamp = 1]) {
  test('V4 reconciliation wrong mode/type remains unprojected', t => { const f = reconciliation(t, mutate); assert.equal(reconciliationTelemetry(f.artifact, f.parsed, f.root, f.options), null); });
}
test('V4 reconciliation raw corruption, baseline corruption and duplicate record reject projection', t => {
  const f = reconciliation(t); fs.appendFileSync(path.join(f.root, f.records[0].archivePath), ' ');
  assert.throws(() => reconciliationTelemetry(f.artifact, f.parsed, f.root, f.options), /RAW_MISMATCH/);
  const second = reconciliation(t); second.options.projectionInputs.records[0].sha256 = '0'.repeat(64);
  assert.throws(() => reconciliationTelemetry(second.artifact, second.parsed, second.root, second.options), /BASELINE_RAW_MISMATCH/);
  const third = reconciliation(t); third.records.push(structuredClone(third.records[0]));
  assert.throws(() => reconciliationTelemetry(third.artifact, third.parsed, third.root, third.options), /RAW_MISMATCH/);
});
function rfp(t, mutate = () => {}) {
  const f = fixture(t), id = 'DEC-1791216578879-abcd', decision = { decisionId: id, timestamp: DATE, selectedAlternative: { sku: 'SKU-1', quantity: 2, price: 12 }, confidence: 0.7 };
  const catalogDir = path.join(f.root, 'outputs/Vendor/Gen1/Product'), capture = '2026-09-30T18:45:29.474Z';
  const parsed = { response: { timestamp: '2026-10-05T16:12:00.000Z', classification: { intent: 'RFP_SIZING_TO_BOM' }, result: { intent: 'RFP_SIZING_TO_BOM',
    status: 'SIZING_DRAFT', requiresHumanClarification: false, chassis: 'Product', candidateBOM: [{ sku: 'SKU-1', quantity: 2, price: 12 }],
    evaluation: { conflictGraph: { auditLog: [{ timestamp: DATE, status: 'FAILED', skuTarget: 'SKU-1' }], rankedSolutions: [{ decisionTrace: [decision] }] },
      catalogFreshness: { catalogDir, captureTimestamp: capture, ageHours: 117.4, status: 'STALE', isFresh: false, thresholdHours: 72,
        reason: 'Catalog is stale (117.4 hours old, threshold: 72 hours).' }, valueEngineering: { generatedAt: DATE, price: 12, status: 'ADVISORY' } } } } };
  const prior = [{ sessionId: 'OLD', savedAt: '2026-10-01T00:00:00Z', decisionsCount: 1, decisions: [{ sku: 'OLD', quantity: 5, timestamp: DATE }] }];
  const current = { sessionId: 'SESSION-1791216578879', savedAt: DATE, decisionsCount: 1, decisions: [structuredClone(decision)] };
  const history = [current, ...structuredClone(prior)]; mutate({ parsed, decision, current, history, prior });
  f.write(decisionPath, prior, true); f.write('outputs/Vendor/Gen1/Product/Product_Catalog.json', { metadata: { scrapeTimestamp: capture }, entries: [{ sku: 'SKU-1', price: 12 }] }, true);
  f.write(decisionPath, history); return { ...f, parsed, current, history };
}
test('V4 typed RFP nested graph and verified generated fields normalize while source date/status/threshold stay facts', t => {
  const f = rfp(t); assert.ok(validateRfpDecisionHistory(f.artifacts, f.parsed, f.root, f.options));
  const current = projectRfpGeneratedFields(f.parsed, f.root, f.options), response = projectBoqResponse({ response: current.response });
  assert.equal(response.response.result.evaluation.conflictGraph.auditLog[0].timestamp, marker);
  assert.equal(response.response.result.evaluation.valueEngineering.generatedAt, marker);
  assert.equal(response.response.result.evaluation.catalogFreshness.ageHours, marker);
  assert.equal(response.response.result.evaluation.catalogFreshness.captureTimestamp, '2026-09-30T18:45:29.474Z');
  assert.equal(response.response.result.evaluation.catalogFreshness.status, 'STALE'); assert.equal(response.response.result.evaluation.catalogFreshness.thresholdHours, 72);
  assert.equal(response.response.result.candidateBOM[0].quantity, 2);
});
for (const [name, mutate] of [
  ['duplicate decision', f => { f.current.decisions.push(structuredClone(f.current.decisions[0])); f.current.decisionsCount++; }],
  ['changed returned price', f => f.decision.selectedAlternative.price++], ['changed returned quantity', f => f.decision.selectedAlternative.quantity++],
  ['changed returned SKU', f => f.decision.selectedAlternative.sku = 'OTHER'], ['history count', f => f.current.decisionsCount++],
  ['historical date', f => f.history[1].savedAt = DATE], ['historical quantity', f => f.history[1].decisions[0].quantity++],
  ['duplicate current session', f => f.history.push(structuredClone(f.current))]
]) test(`V4 RFP current decision proof rejects ${name}`, t => { const f = rfp(t, mutate); assert.throws(() => validateRfpDecisionHistory(f.artifacts, f.parsed, f.root, f.options), /CP0_CURRENT_RFP_HISTORY/); });
for (const [name, mutate] of [
  ['wrong intent', f => f.parsed.response.classification.intent = 'BOQ_EVALUATION'], ['wrong result intent', f => f.parsed.response.result.intent = 'OTHER'],
  ['wrong draft status', f => f.parsed.response.result.status = 'SUCCESS'], ['untyped draft', f => f.parsed.response.result.requiresHumanClarification = 0]
]) test(`V4 unknown nested evaluation ${name} stays untouched`, t => { const f = rfp(t, mutate); assert.deepEqual(projectBoqResponse(f.parsed), f.parsed); });
for (const [name, mutate] of [
  ['source date', f => f.captureTimestamp = '2026-09-30T18:45:30.474Z'], ['status', f => f.status = 'FRESH'], ['freshness boolean', f => f.isFresh = true],
  ['threshold', f => f.thresholdHours = 71], ['coerced age', f => f.ageHours = '117.4'], ['negative age', f => f.ageHours = -1],
  ['nonfinite age', f => f.ageHours = Infinity], ['wrong age', f => f.ageHours = 999], ['wrong reason', f => f.reason += 'changed']
]) test(`V4 freshness ${name} remains factual`, t => {
  const f = rfp(t, x => mutate(x.parsed.response.result.evaluation.catalogFreshness)), raw = f.parsed.response.result.evaluation.catalogFreshness;
  const projected = projectRfpGeneratedFields(f.parsed, f.root, f.options).response.result.evaluation.catalogFreshness;
  assert.deepEqual(projected, raw);
});
test('V4 catalog threshold crossing cannot normalize age or conceal freshness state', t => {
  const f = rfp(t); f.options.projectionInputs.startedAt = '2026-10-03T18:45:00.000Z';
  const raw = f.parsed.response.result.evaluation.catalogFreshness;
  assert.deepEqual(projectRfpGeneratedFields(f.parsed, f.root, f.options).response.result.evaluation.catalogFreshness, raw);
});
function drift(t, mutate = () => {}) {
  const f = fixture(t), file = 'outputs/Vendor/Gen1/Product/notebook_sync_payload_Product.md';
  const text = '# Product\n**Sync Timestamp**: ' + DATE + '\nSource date: 2026-09-30T18:45:29.474Z\n| SKU-1 | 2 | 12 |\n';
  const parsed = { response: { classification: { intent: 'KNOWLEDGE_SYNC' }, result: { intent: 'KNOWLEDGE_SYNC', status: 'INSPECTED', chassis: 'Product',
    drift: { chassisName: 'Product', payloadPath: path.join(f.root, file), payloadChecksum: sha(normalizeLearningText(text)), sourceDate: DATE } } } };
  const subject = { text, parsed }; mutate(subject); const artifact = f.write(file, subject.text); return { ...f, parsed, artifact, text: subject.text };
}
test('V4 drift payload normalizes one producer line and preserves full source/quantity/price content and checksum', t => {
  const f = drift(t), projected = driftPayloadProjection(f.artifact, f.parsed, f.root, f.options);
  assert.equal(projected.artifact.content, f.text.replace(DATE, marker)); assert.equal(projected.proof.returnedPayloadChecksum, f.parsed.response.result.drift.payloadChecksum);
  assert.ok(projected.artifact.content.includes('Source date: 2026-09-30T18:45:29.474Z')); assert.ok(projected.artifact.content.includes('| SKU-1 | 2 | 12 |'));
});
for (const [name, mutate] of [
  ['wrong intent', f => f.parsed.response.classification.intent = 'OTHER'], ['wrong status', f => f.parsed.response.result.status = 'SYNCED'],
  ['wrong product', f => f.parsed.response.result.drift.chassisName = 'Other'], ['wrong path', f => f.parsed.response.result.drift.payloadPath += '.foreign'],
  ['nonhex checksum', f => f.parsed.response.result.drift.payloadChecksum = 'x'.repeat(64)], ['missing checksum', f => delete f.parsed.response.result.drift.payloadChecksum],
  ['duplicate timestamp', f => f.text += '**Sync Timestamp**: ' + DATE + '\n'], ['invalid timestamp', f => f.text = f.text.replace(DATE, '2026-02-30T00:00:00Z')],
  ['missing timestamp', f => f.text = f.text.replace('**Sync Timestamp**: ', 'Source Timestamp: ')]
]) test(`V4 drift ${name} stays unprojected`, t => { const f = drift(t, mutate); assert.equal(driftPayloadProjection(f.artifact, f.parsed, f.root, f.options), null); });
for (const [name, mutate] of [['quantity', f => f.text = f.text.replace('| 2 |', '| 3 |')], ['SKU', f => f.text = f.text.replace('SKU-1', 'SKU-2')],
  ['price', f => f.text = f.text.replace('| 12 |', '| 13 |')], ['source date', f => f.text = f.text.replace('2026-09-30T18:45:29.474Z', DATE)],
  ['checksum', f => f.parsed.response.result.drift.payloadChecksum = '0'.repeat(64)]]) {
  test(`V4 drift ${name} tampering fails checksum proof`, t => { const f = drift(t, mutate); assert.throws(() => driftPayloadProjection(f.artifact, f.parsed, f.root, f.options), /CHECKSUM_MISMATCH/); });
}
test('V4 historical reconciliation rows bypass generic runtime substitutions; statuses/auth and unknown dates remain differences', () => {
  const root = 'C:/copied', trace = 'TRC-123', historical = { id: 'OLD', note: trace, sourcePath: root + '/catalog', timestamp: DATE, status: 'FAILED', authorized: false };
  const raw = { response: { traceId: trace }, artifacts: [{ path: telemetryPath, state: 'PARSED_JSON', content: { reconciliationHistory: [{ id: 'CURRENT' }, historical] } }] };
  const projected = semanticProjection(raw, { root }); assert.deepEqual(projected.artifacts[0].content.reconciliationHistory[1], historical);
  const altered = structuredClone(projected); altered.artifacts[0].content.reconciliationHistory[1].authorized = true;
  assert.equal(compareGolden(projected, altered).equal, false);
});
for (const [name, mutate] of [
  ['status', f => f.parsed.response.result.evaluation.conflictGraph.auditLog[0].status = 'PASSED'],
  ['authorization', f => f.parsed.response.result.evaluation.deliveryAuthorization = { authorized: true }],
  ['source date', f => f.parsed.response.result.evaluation.sourceDate = DATE],
  ['candidate quantity', f => f.parsed.response.result.candidateBOM[0].quantity++],
  ['candidate price', f => f.parsed.response.result.candidateBOM[0].price++],
  ['candidate SKU', f => f.parsed.response.result.candidateBOM[0].sku = 'OTHER']
]) test(`V4 nested RFP ${name} remains a semantic difference`, t => {
  const first = rfp(t), second = structuredClone(first.parsed); mutate({ parsed: second });
  assert.equal(compareGolden(projectBoqResponse(first.parsed), projectBoqResponse(second)).equal, false);
});
test('V4 drift raw byte/hash/size corruption and ambiguous records fail closed', t => {
  for (const mutate of [f => fs.appendFileSync(path.join(f.root, f.records[0].archivePath), ' '), f => f.records[0].bytes++,
    f => f.records[0].sha256 = '0'.repeat(64), f => f.records.push(structuredClone(f.records[0]))]) {
    const f = drift(t); mutate(f); assert.throws(() => driftPayloadProjection(f.artifact, f.parsed, f.root, f.options), /RAW_MISMATCH/);
  }
});
test('V4 captures baseline before worker with exact manifest hash and rejects pre-copy tampering', t => {
  const f = fixture(t), file = path.join(f.root, telemetryPath); fs.mkdirSync(path.dirname(file), { recursive: true }); safeWriteJsonAtomic(file, { history: [] });
  const bytes = fs.readFileSync(file), record = { path: telemetryPath, bytes: bytes.length, sha256: sha(bytes) }, receipt = { root: f.root, manifest: { files: [record] } };
  const archive = path.join(f.root, 'archive'); fs.mkdirSync(archive);
  const inputs = captureProjectionInputs(receipt, archive, { scope: 'Product' }); assert.equal(inputs.records[0].sha256, record.sha256);
  assert.ok(fs.readFileSync(path.join(inputs.base, inputs.records[0].archivePath)).equals(bytes));
  fs.appendFileSync(file, ' '); assert.throws(() => captureProjectionInputs(receipt, path.join(f.root, 'second'), {}), /MANIFEST_MISMATCH/);
});
