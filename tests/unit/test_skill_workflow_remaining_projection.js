'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const { quarantineProjection, captureProjectionInputs } = require('../../scripts/maintenance/skill_workflow/golden_current_execution.js');
const { projectBoqResponse, marker } = require('../../scripts/maintenance/skill_workflow/golden_boq_runtime.js');
const { buildKnowledgeFingerprint } = require('../../scripts/lib/feedback/quarantined_deltas.js');
const { safeWriteJsonAtomic } = require('../../scripts/lib/system/fs_compat.js');
const DATE = '2026-10-06T07:00:00.000Z', FILE = 'outputs/ProLiant/Gen12/Product/history/quarantined_deltas.json';
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
function fixture(t, mutate = () => {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cp0-v5-fixture-'));
  t.after(() => { const actual = fs.realpathSync(root); assert.ok(actual.startsWith(fs.realpathSync(os.tmpdir()) + path.sep)); assert.match(path.basename(actual), /^cp0-v5-fixture-/); fs.rmSync(actual, { recursive: true, force: true }); });
  const line = { sku: 'P69728-F21', quantity: 352, description: 'Memory' };
  const message = `Unverified vendor observation: SKU ${line.sku} (Qty ${line.quantity}) is absent from the proposed scoped manifest: ${line.description}`;
  const row = { deltaId: `DELTA-${Date.parse(DATE)}-abcde`, timestamp: DATE, validatedAt: DATE, firstSeenAt: DATE, lastSeenAt: DATE, quarantinedAt: DATE,
    chassis: 'Product', affectedSku: line.sku, scopeTaxonomy: 'CHASSIS_SPECIFIC', errorType: 'PERMANENT_PHYSICAL_DEPENDENCY', rawMessage: message, ruleUpdate: message,
    sourceAgent: 'PORTAL_OBSERVATION', source: 'OFFICIAL_VENDOR_PORTAL_OBSERVATION', citations: [], observationCount: 1, status: 'IN_QUARANTINE', governanceStatus: 'QUARANTINED' };
  row.knowledgeFingerprint = buildKnowledgeFingerprint(row); row.quarantineId = `QUARANTINE_${row.knowledgeFingerprint.slice(0, 16)}`;
  const prior = [{ quarantineId: 'OLD', timestamp: 'literal prior date', ruleUpdate: 'Do not lose literal rules', observationCount: 4 }], rows = [...structuredClone(prior), row];
  const audit = { chassisModel: 'Product', verificationTimestamp: DATE, isTwoBaselineComparison: true, isSingleFileAudit: false,
    quarantinedObservationCount: 1, quarantinedObservationIds: [row.quarantineId], discrepancies: { addedByVendor: [line] } };
  const parsed = { response: { timestamp: '2026-10-06T07:01:00.000Z', classification: { intent: 'BOM_RECONCILIATION' }, result: { intent: 'BOM_RECONCILIATION', isTwoBaselineComparison: true, auditReport: audit } } };
  mutate({ row, rows, prior, audit, parsed, line });
  function write(prefix, content) {
    const archivePath = prefix + '/' + FILE, file = path.join(root, archivePath); fs.mkdirSync(path.dirname(file), { recursive: true }); safeWriteJsonAtomic(file, content);
    const bytes = fs.readFileSync(file); return { path: FILE, archivePath, bytes: bytes.length, sha256: sha(bytes) };
  }
  const record = write('artifacts', rows), baseline = write('projection-inputs', prior);
  const artifact = { path: FILE, state: 'PARSED_JSON', content: rows };
  const options = { records: [record], artifactBase: root, projectionInputs: { base: root, startedAt: '2026-10-06T06:59:00.000Z', records: [baseline], artifacts: [{ path: FILE, state: 'PARSED_JSON', content: prior }] } };
  return { root, artifact, options, parsed, prior, row };
}
test('V5 current quarantine append projects only six generated fields and preserves historical/factual content', t => {
  const f = fixture(t), projected = quarantineProjection(f.artifact, f.parsed, f.root, f.options);
  assert.deepEqual(projected.artifact.content[0], f.prior[0]);
  const current = projected.artifact.content[1]; assert.equal(current.timestamp, marker); assert.equal(current.ruleUpdate, f.row.ruleUpdate);
  assert.equal(current.knowledgeFingerprint, f.row.knowledgeFingerprint); assert.equal(projected.proof.normalized.length, 6);
  assert.equal(f.artifact.content[1].timestamp, DATE);
});
for (const [name, mutate] of [
  ['history mutation', f => f.rows[0].ruleUpdate = 'changed'], ['history date mutation', f => f.rows[0].timestamp = DATE],
  ['quantity mismatch', f => f.line.quantity++], ['rule mutation', f => f.row.ruleUpdate = 'different rule'],
  ['scope', f => f.row.chassis = 'Other'], ['promoted status', f => f.row.governanceStatus = 'PROMOTED'],
  ['counter', f => f.row.observationCount++], ['old date', f => f.row.validatedAt = '2026-10-05T07:00:00.000Z'],
  ['ID reference', f => f.audit.quarantinedObservationIds[0] = 'QUARANTINE_other'],
  ['extra row', f => f.rows.push(structuredClone(f.row))], ['preexisting ID', f => f.prior[0].quarantineId = f.row.quarantineId],
  ['fingerprint', f => f.row.knowledgeFingerprint = 'bad'], ['literal ID', f => f.row.deltaId = 'customer-literal'],
  ['invalid date', f => f.row.timestamp = 'not-a-date']
]) test(`V5 rejects quarantine ${name}`, t => { const f = fixture(t, mutate); assert.throws(() => quarantineProjection(f.artifact, f.parsed, f.root, f.options), /CP0_CURRENT_QUARANTINE/); });
test('V5 quarantine refuses missing baseline and corrupted raw bytes', t => {
  const f = fixture(t); f.options.projectionInputs.artifacts = []; assert.throws(() => quarantineProjection(f.artifact, f.parsed, f.root, f.options), /BASELINE_MISSING/);
  const g = fixture(t); fs.appendFileSync(path.join(g.root, g.options.records[0].archivePath), ' '); assert.throws(() => quarantineProjection(g.artifact, g.parsed, g.root, g.options), /RAW_MISMATCH/);
});
test('V5 quarantine wrong route remains literal', t => { const f = fixture(t); f.parsed.response.classification.intent = 'OTHER'; assert.equal(quarantineProjection(f.artifact, f.parsed, f.root, f.options), null); });
test('V5 capture archives exact product quarantine baseline', t => {
  const f = fixture(t), file = path.join(f.root, FILE); fs.mkdirSync(path.dirname(file), { recursive: true }); safeWriteJsonAtomic(file, f.prior);
  const bytes = fs.readFileSync(file); const inputs = captureProjectionInputs({ root: f.root, manifest: { files: [{ path: FILE, bytes: bytes.length, sha256: sha(bytes) }] } }, path.join(f.root, 'new-archive'), { scope: 'Product' });
  assert.deepEqual(inputs.artifacts[0].content, f.prior);
});
function recommendation() {
  const validation = { checkedAt: DATE, status: 'ACTION_REQUIRED', graph: { auditLog: [{ timestamp: DATE, status: 'FAILED', skuTarget: 'SKU1', ruleText: 'Literal rule' }] } };
  return { response: { result: { conflictGraph: { rankedSolutions: [{ rank: 4, finalValidation: structuredClone(validation) }], recommendedSolutions: [{ rank: 1, strategyRank: 4, finalValidation: structuredClone(validation) }] } } } };
}
test('V5 recommendation generated fields bind to exact source candidate validation', () => {
  const value = recommendation(), result = projectBoqResponse(value).response.result.conflictGraph.recommendedSolutions[0];
  assert.equal(result.finalValidation.checkedAt, marker); assert.equal(result.finalValidation.graph.auditLog[0].timestamp, marker);
  assert.equal(result.finalValidation.status, 'ACTION_REQUIRED'); assert.equal(result.finalValidation.graph.auditLog[0].ruleText, 'Literal rule');
});
for (const [name, mutate] of [
  ['wrong strategy', g => g.recommendedSolutions[0].strategyRank = 99], ['status fact', g => g.recommendedSolutions[0].finalValidation.status = 'PASSED'],
  ['rule fact', g => g.recommendedSolutions[0].finalValidation.graph.auditLog[0].ruleText = 'changed'], ['duplicate rank', g => g.rankedSolutions.push(structuredClone(g.rankedSolutions[0]))]
]) test(`V5 unbound recommendation ${name} remains literal`, () => { const value = recommendation(); mutate(value.response.result.conflictGraph); assert.equal(projectBoqResponse(value).response.result.conflictGraph.recommendedSolutions[0].finalValidation.checkedAt, DATE); });
