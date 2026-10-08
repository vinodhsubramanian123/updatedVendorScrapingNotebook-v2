'use strict';
// V4: normalization requires current producer facts and verified pre-execution bytes.
const fs = require('fs');
const path = require('path');
const { isDeepStrictEqual } = require('util');
const { createHash } = require('crypto');
const { validIso } = require('./golden_ledger_artifacts.js');
const { verifiedBytes, relativeReference } = require('./golden_boq_artifacts.js');
const { rfpEvaluation } = require('./golden_rfp_scope.js');
const { currentDecisions, marker } = require('./golden_boq_runtime.js');
const TELEMETRY = 'outputs/history/pipeline_telemetry.json';
const DECISIONS = 'outputs/history/decision_traces.json';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const integer = value => Number.isSafeInteger(value) && value >= 0;
const currentExecutionPolicy = Object.freeze({
  baseline: 'PRE_EXECUTION_REGULAR_BYTES_MATCH_COPIED_MANIFEST_SHA_AND_SIZE_ARCHIVED_BEFORE_WORKER',
  reconciliation: 'EXACT_TWO_BASELINE_AUDIT_TIMESTAMP_FULL_PRODUCER_ROW_UNIQUE_NEW_ID_COUNTER_PLUS_ONE_100_ROW_BOUND',
  nestedEvaluation: 'TYPED_ROUTER_RFP_DRAFT_ONLY',
  freshness: 'SOURCE_CATALOG_CAPTURE_AND_CURRENT_EXECUTION_INTERVAL_EXACT_TYPED_ONE_DECIMAL_AGE_AND_REASON_STATUS_THRESHOLD_PRESERVED',
  decisionHistory: 'RAW_VERIFIED_UNIQUE_NEW_INDEX_ZERO_COMPLETE_RETURNED_DECISION_FACTS_100_ROW_BOUND',
  driftPayload: 'EXACT_INSPECTED_KNOWLEDGE_SYNC_RETURNED_PATH_PRODUCT_RAW_SHA_SIZE_AND_PRODUCER_NORMALIZED_CHECKSUM_UNIQUE_ISO_SYNC_LINE_ONLY',
  quarantine: 'TYPED_TWO_BASELINE_AUDIT_RAW_VERIFIED_BASELINE_EXACT_APPEND_RETURNED_IDS_AND_FINGERPRINT_FACTS_CURRENT_INTERVAL_ONLY',
  historicalRows: 'EXACT_BYTES_TO_PARSED_VALUES_ALL_FIELDS_PRESERVED', replay: 'DIAGNOSTIC_ONLY_NO_QUALIFICATION_PROMOTION'
});

function isScopedQuarantine(file, scope) {
  return typeof scope === 'string' && file.endsWith('/' + scope + '/history/quarantined_deltas.json')
    && /^outputs\/[^/]+\/[^/]+\/[^/]+\/history\/quarantined_deltas\.json$/.test(file);
}
function shouldCaptureProjectionInput(file, scope, wanted) {
  return wanted.includes(file) || isScopedQuarantine(file, scope)
    || (typeof scope === 'string' && path.posix.basename(file) === `${scope}_Catalog.json`);
}
function captureProjectionInputs(receipt, archive, scenario) {
  const wanted = [TELEMETRY, DECISIONS];
  const scope = scenario.scope;
  const inputs = { base: archive, artifacts: [], records: [], startedAt: new Date().toISOString() };
  for (const record of receipt.manifest.files) {
    if (!shouldCaptureProjectionInput(record.path, scope, wanted)) continue;
    const file = path.resolve(receipt.root, record.path);
    if (relativeReference(receipt.root, file) !== record.path || fs.realpathSync(file) !== file || !fs.lstatSync(file).isFile()) throw new Error('CP0_BASELINE_PATH_MISMATCH');
    const bytes = fs.readFileSync(file);
    if (bytes.length !== record.bytes || sha(bytes) !== record.sha256) throw new Error('CP0_BASELINE_MANIFEST_MISMATCH');
    const archivePath = 'projection-inputs/' + record.path, target = path.resolve(archive, archivePath);
    if (relativeReference(archive, target) !== archivePath) throw new Error('CP0_BASELINE_ARCHIVE_PATH_MISMATCH');
    fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes, { flag: 'wx' });
    if (!fs.readFileSync(target).equals(bytes)) throw new Error('CP0_BASELINE_ARCHIVE_READBACK_MISMATCH');
    inputs.records.push({ ...record, archivePath });
    inputs.artifacts.push({ path: record.path, state: 'PARSED_JSON', content: JSON.parse(bytes.toString('utf8')) });
  }
  return inputs;
}

function baselineInput(options, file, root) {
  const inputs = options.projectionInputs;
  const matches = (inputs?.artifacts || []).filter(item => item.path === file);
  if (matches.length !== 1) throw new Error('CP0_CURRENT_BASELINE_MISSING_OR_AMBIGUOUS: ' + file);
  const artifact = matches[0], raw = verifiedBytes(artifact, root, { records: inputs.records, artifactBase: inputs.base });
  if (!raw) throw new Error('CP0_CURRENT_BASELINE_RAW_MISMATCH: ' + file);
  return { content: artifact.content, record: raw.record };
}

function returnedTwoBaselineAudit(parsed) {
  const result = parsed?.response?.result, audit = result?.auditReport;
  return parsed?.response?.classification?.intent === 'BOM_RECONCILIATION' && result?.intent === 'BOM_RECONCILIATION'
    && result.isTwoBaselineComparison === true && audit?.isTwoBaselineComparison === true && audit.isSingleFileAudit === false
    && validIso(audit.verificationTimestamp) ? audit : null;
}

function expectedReconciliationFacts(audit) {
  const arrays = ['addedByVendor', 'removedByVendor', 'priceDeltas', 'uncatalogedSkus'];
  if (typeof audit.chassisModel !== 'string' || !audit.chassisModel || !integer(audit.proposedRank) || audit.proposedRank === 0
    || !integer(audit.totalVendorSkus) || !integer(audit.totalProposedSkus) || typeof audit.is100PercentMatch !== 'boolean'
    || typeof audit.requiresFreshScrape !== 'boolean' || arrays.some(key => !Array.isArray(audit.discrepancies?.[key]))) return null;
  return { chassisModel: audit.chassisModel, proposedRank: audit.proposedRank, totalVendorSkus: audit.totalVendorSkus,
    totalProposedSkus: audit.totalProposedSkus, is100PercentMatch: audit.is100PercentMatch, requiresFreshScrape: audit.requiresFreshScrape,
    addedCount: audit.discrepancies.addedByVendor.length, removedCount: audit.discrepancies.removedByVendor.length,
    priceDeltaCount: audit.discrepancies.priceDeltas.length, uncatalogedCount: audit.discrepancies.uncatalogedSkus.length };
}

function reconciliationTelemetry(artifact, parsed, root, options) {
  const audit = returnedTwoBaselineAudit(parsed), facts = audit && expectedReconciliationFacts(audit);
  if (!facts || artifact.path !== TELEMETRY) return null;
  const raw = verifiedBytes(artifact, root, options);
  if (!raw) throw new Error('CP0_CURRENT_RECONCILIATION_RAW_MISMATCH');
  const content = artifact.content, current = content?.reconciliationHistory?.[0];
  if (!current || !/^RECON-\d{13}$/.test(current.id) || current.timestamp !== audit.verificationTimestamp || !validIso(content.lastUpdated))
    throw new Error('CP0_CURRENT_RECONCILIATION_BINDING_MISMATCH');
  const epoch = Number(current.id.slice(6));
  if (epoch < Date.parse(current.timestamp) || epoch > Date.parse(content.lastUpdated)
    || !isDeepStrictEqual(current, { id: current.id, timestamp: current.timestamp, ...facts })) throw new Error('CP0_CURRENT_RECONCILIATION_FACT_MISMATCH');
  const baseline = baselineInput(options, TELEMETRY, root), prior = baseline.content;
  if (!Array.isArray(prior.reconciliationHistory) || prior.reconciliationHistory.length > 100 || !integer(prior.totalReconciliations)
    || content.reconciliationHistory.filter(row => row?.id === current.id || row?.timestamp === current.timestamp).length !== 1
    || prior.reconciliationHistory.some(row => row?.id === current.id || row?.timestamp === current.timestamp)) throw new Error('CP0_CURRENT_RECONCILIATION_AMBIGUOUS');
  const expected = { ...prior, lastUpdated: content.lastUpdated, totalReconciliations: prior.totalReconciliations + 1,
    reconciliationHistory: [current, ...prior.reconciliationHistory].slice(0, 100) };
  if (!isDeepStrictEqual(content, expected)) throw new Error('CP0_CURRENT_RECONCILIATION_BASELINE_DELTA_MISMATCH');
  const projected = structuredClone(content); projected.lastUpdated = marker;
  projected.reconciliationHistory[0].id = '<GENERATED_CURRENT_RECONCILIATION_ID>'; projected.reconciliationHistory[0].timestamp = marker;
  return { artifact: { ...artifact, content: projected }, proof: { path: artifact.path, rawSha256: raw.record.sha256, rawBytes: raw.record.bytes,
    baselineSha256: baseline.record.sha256, normalized: ['lastUpdated', 'reconciliationHistory[0].id', 'reconciliationHistory[0].timestamp'],
    retainedHistoricalRows: projected.reconciliationHistory.length - 1, droppedOldTailRows: Math.max(0, prior.reconciliationHistory.length - 99) } };
}

function validateRfpDecisionHistory(artifacts, parsed, root, options) {
  const evaluation = rfpEvaluation(parsed);
  if (!evaluation) return null;
  const histories = artifacts.filter(item => item.path === DECISIONS);
  if (histories.length !== 1) throw new Error('CP0_CURRENT_RFP_HISTORY_MISSING_OR_AMBIGUOUS');
  const artifact = histories[0], raw = verifiedBytes(artifact, root, options);
  if (!raw) throw new Error('CP0_CURRENT_RFP_HISTORY_RAW_MISMATCH');
  const current = artifact.content?.[0], ids = currentDecisions(parsed);
  const decisions = evaluation.conflictGraph.rankedSolutions.flatMap(rank => Array.isArray(rank.decisionTrace) ? rank.decisionTrace : []);
  if (!Array.isArray(artifact.content) || !/^SESSION-\d{13}$/.test(current?.sessionId) || !validIso(current.savedAt)
    || !Array.isArray(current.decisions) || !current.decisions.length || current.decisionsCount !== current.decisions.length
    || current.decisions.some(d => !ids.includes(d?.decisionId) || !decisions.some(actual => isDeepStrictEqual(actual, d)))) throw new Error('CP0_CURRENT_RFP_HISTORY_FACT_MISMATCH');
  const currentIds = current.decisions.map(d => d.decisionId);
  if (new Set(currentIds).size !== currentIds.length || artifact.content.filter(row => row?.sessionId === current.sessionId
    || row?.decisions?.some(d => currentIds.includes(d?.decisionId))).length !== 1) throw new Error('CP0_CURRENT_RFP_HISTORY_AMBIGUOUS');
  const baseline = baselineInput(options, DECISIONS, root), prior = baseline.content;
  if (!Array.isArray(prior) || prior.length > 100 || prior.some(row => row?.sessionId === current.sessionId || row?.decisions?.some(d => currentIds.includes(d?.decisionId)))
    || !isDeepStrictEqual(artifact.content, [current, ...prior].slice(0, 100))) throw new Error('CP0_CURRENT_RFP_HISTORY_BASELINE_DELTA_MISMATCH');
  return { path: DECISIONS, rawSha256: raw.record.sha256, rawBytes: raw.record.bytes, baselineSha256: baseline.record.sha256,
    retainedHistoricalRows: artifact.content.length - 1, droppedOldTailRows: Math.max(0, prior.length - 99) };
}

function projectRfpGeneratedFields(parsed, root, options) {
  const evaluation = rfpEvaluation(parsed), inputs = options.projectionInputs;
  const start = inputs?.startedAt, end = parsed?.response?.timestamp;
  if (!evaluation || !validIso(start) || !validIso(end) || Date.parse(start) > Date.parse(end)) return { response: parsed.response, proof: [] };
  const result = structuredClone(parsed.response), projected = result.result.evaluation, proof = [];
  const generatedAt = evaluation.valueEngineering?.generatedAt;
  if (validIso(generatedAt) && Date.parse(generatedAt) >= Date.parse(start) && Date.parse(generatedAt) <= Date.parse(end)) {
    projected.valueEngineering.generatedAt = marker; proof.push({ field: 'response.result.evaluation.valueEngineering.generatedAt', producer: 'scripts/lib/boq/deal_optimizer.js' });
  }
  const freshness = evaluation.catalogFreshness, relative = relativeReference(root, freshness?.catalogDir);
  if (!relative || !/^outputs\/[^/]+\/[^/]+\/[^/]+$/.test(relative) || path.posix.basename(relative) !== parsed.response.result.chassis) return { response: result, proof };
  const baseline = baselineInput(options, relative + '/' + path.posix.basename(relative) + '_Catalog.json', root);
  const capture = baseline.content?.metadata?.scrapeTimestamp;
  if (!validIso(capture) || freshness.captureTimestamp !== new Date(capture).toISOString() || freshness.thresholdHours !== 72
    || !['FRESH', 'STALE'].includes(freshness.status) || freshness.isFresh !== (freshness.status === 'FRESH')
    || typeof freshness.ageHours !== 'number' || !Number.isFinite(freshness.ageHours) || freshness.ageHours < 0
    || Number(freshness.ageHours.toFixed(1)) !== freshness.ageHours) return { response: result, proof };
  const lower = (Date.parse(start) - Date.parse(capture)) / 3600000, upper = (Date.parse(end) - Date.parse(capture)) / 3600000;
  const isFresh = freshness.status === 'FRESH';
  if (lower < 0 || (isFresh ? upper > 72 : lower <= 72)
    || freshness.ageHours < Number(lower.toFixed(1)) || freshness.ageHours > Number(upper.toFixed(1))
    || freshness.reason !== `Catalog is ${isFresh ? 'fresh' : 'stale'} (${freshness.ageHours} hours old, threshold: 72 hours).`) return { response: result, proof };
  projected.catalogFreshness.ageHours = marker;
  projected.catalogFreshness.reason = `Catalog is ${isFresh ? 'fresh' : 'stale'} (${marker} hours old, threshold: 72 hours).`;
  proof.push({ field: 'response.result.evaluation.catalogFreshness', baselinePath: baseline.record.path, baselineSha256: baseline.record.sha256,
    normalized: ['ageHours', 'reason.derivedAgeOnly'], preserved: ['captureTimestamp', 'status', 'isFresh', 'thresholdHours'] });
  return { response: result, proof };
}

function driftPayloadProjection(artifact, parsed, root, options) {
  const result = parsed?.response?.result, drift = result?.drift, chassis = result?.chassis;
  if (parsed?.response?.classification?.intent !== 'KNOWLEDGE_SYNC' || result?.intent !== 'KNOWLEDGE_SYNC'
    || result.status !== 'INSPECTED' || typeof chassis !== 'string' || !/^[A-Za-z0-9_-]+$/.test(chassis)
    || drift?.chassisName !== chassis || relativeReference(root, drift.payloadPath) !== artifact.path
    || !new RegExp(`^outputs/[^/]+/[^/]+/${chassis}/notebook_sync_payload_${chassis}\\.md$`).test(artifact.path)
    || artifact.state !== 'EXACT_BYTES' || !/^[a-f0-9]{64}$/.test(drift.payloadChecksum)) return null;
  const raw = verifiedBytes(artifact, root, options);
  if (!raw) throw new Error('CP0_CURRENT_DRIFT_PAYLOAD_RAW_MISMATCH');
  const text = raw.bytes.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(raw.bytes)) return null;
  const lines = text.split('\n'), indexes = lines.map((line, i) => line.startsWith('**Sync Timestamp**: ') ? i : -1).filter(i => i >= 0);
  if (indexes.length !== 1 || !validIso(lines[indexes[0]].slice('**Sync Timestamp**: '.length))) return null;
  const writer = require('../../lib/sync/google_sheets_writer.js');
  if (sha(writer.normalizeLearningText(text)) !== drift.payloadChecksum) throw new Error('CP0_CURRENT_DRIFT_PAYLOAD_CHECKSUM_MISMATCH');
  lines[indexes[0]] = '**Sync Timestamp**: ' + marker;
  return { artifact: { path: artifact.path, state: 'VERIFIED_INSPECTED_DRIFT_PAYLOAD', content: lines.join('\n') },
    proof: { path: artifact.path, rawSha256: raw.record.sha256, rawBytes: raw.record.bytes, returnedPayloadChecksum: drift.payloadChecksum,
      normalized: ['unique **Sync Timestamp** producer line'], producerNormalizer: 'scripts/lib/sync/google_sheets_writer.js#normalizeLearningText' } };
}

function assertQuarantineRowIdentity(row, id, { prior, added, rows, dates, withinRun, fail }) {
  if (row.quarantineId !== id || prior.some(old => old.quarantineId === id || old.knowledgeFingerprint === row.knowledgeFingerprint)
      || added.filter(other => other.quarantineId === id).length !== 1 || !/^DELTA-\d{13}-[a-z0-9]{1,5}$/.test(row.deltaId)
      || rows.filter(other => other.deltaId === row.deltaId).length !== 1
      || !dates.every(key => withinRun(row[key])) || !withinRun(new Date(Number(row.deltaId.split('-')[1])).toISOString())
      || row.firstSeenAt !== row.lastSeenAt || row.firstSeenAt !== row.quarantinedAt) fail('FACT_OR_ID_MISMATCH');
}
function assertQuarantineRowFacts(row, id, { audit, buildKnowledgeFingerprint, fail }) {
  if (row.chassis !== audit.chassisModel || row.observationCount !== 1 || row.status !== 'IN_QUARANTINE' || row.governanceStatus !== 'QUARANTINED'
      || row.knowledgeFingerprint !== buildKnowledgeFingerprint(row) || id !== `QUARANTINE_${row.knowledgeFingerprint.slice(0, 16)}`
      || row.sourceAgent !== 'PORTAL_OBSERVATION' || row.source !== 'OFFICIAL_VENDOR_PORTAL_OBSERVATION'
      || !Array.isArray(row.citations) || row.citations.length || row.ruleUpdate !== row.rawMessage
      || !audit.discrepancies.addedByVendor.some(line => row.affectedSku === line.sku
        && row.rawMessage === `Unverified vendor observation: SKU ${line.sku} (Qty ${line.quantity}) is absent from the proposed scoped manifest: ${line.description}`)) fail('FACT_OR_ID_MISMATCH');
}
function quarantineProjection(artifact, parsed, root, options) {
  const audit = returnedTwoBaselineAudit(parsed);
  if (!audit || artifact.state !== 'PARSED_JSON' || typeof audit.chassisModel !== 'string'
    || !/^[A-Za-z0-9_-]+$/.test(audit.chassisModel)
    || !new RegExp(`^outputs/[^/]+/[^/]+/${audit.chassisModel}/history/quarantined_deltas\\.json$`).test(artifact.path)) return null;
  const ids = audit.quarantinedObservationIds;
  if (!Array.isArray(ids) || !ids.length) return null;
  const fail = suffix => { throw new Error('CP0_CURRENT_QUARANTINE_' + suffix); };
  const raw = verifiedBytes(artifact, root, options);
  if (!raw) fail('RAW_MISMATCH');
  const baseline = baselineInput(options, artifact.path, root), prior = baseline.content, rows = artifact.content;
  const start = options.projectionInputs?.startedAt, end = parsed.response.timestamp;
  if (!validIso(start) || !validIso(end) || Date.parse(start) > Date.parse(end)) fail('INTERVAL_MISMATCH');
  if (!Array.isArray(rows) || !Array.isArray(prior) || !isDeepStrictEqual(rows.slice(0, prior.length), prior)
    || ids.length !== audit.quarantinedObservationCount || new Set(ids).size !== ids.length
    || rows.length !== prior.length + ids.length || !Array.isArray(audit.discrepancies?.addedByVendor)) fail('APPEND_MISMATCH');
  const added = rows.slice(prior.length), { buildKnowledgeFingerprint } = require('../../lib/feedback/quarantined_deltas.js');
  const dates = ['timestamp', 'validatedAt', 'firstSeenAt', 'lastSeenAt', 'quarantinedAt'];
  const withinRun = value => validIso(value) && Date.parse(value) >= Date.parse(start) && Date.parse(value) <= Date.parse(end);
  const projected = structuredClone(rows);
  added.forEach((row, index) => {
    const id = ids[index];
    assertQuarantineRowIdentity(row, id, { prior, added, rows, dates, withinRun, fail });
    assertQuarantineRowFacts(row, id, { audit, buildKnowledgeFingerprint, fail });
    const target = projected[prior.length + index];
    target.deltaId = `<GENERATED_CURRENT_QUARANTINE_DELTA:${id}>`;
    dates.forEach(key => { target[key] = marker; });
  });
  return { artifact: { ...artifact, content: projected }, proof: { path: artifact.path, rawSha256: raw.record.sha256,
    rawBytes: raw.record.bytes, baselineSha256: baseline.record.sha256, retainedHistoricalRows: prior.length,
    currentQuarantineIds: ids, normalized: ['deltaId', ...dates], preserved: 'ALL_OTHER_FACTS_AND_HISTORICAL_ROWS' } };
}

function projectKnownCurrentArtifact(artifact, parsed, root, options) {
  return quarantineProjection(artifact, parsed, root, options) || reconciliationTelemetry(artifact, parsed, root, options) || driftPayloadProjection(artifact, parsed, root, options);
}
function projectCurrentExecution(artifacts, parsed, root, options = {}) {
  const historyProof = validateRfpDecisionHistory(artifacts, parsed, root, options), generated = projectRfpGeneratedFields(parsed, root, options);
  const proof = [...generated.proof]; if (historyProof) proof.push(historyProof);
  const projected = artifacts.map(artifact => {
    const current = projectKnownCurrentArtifact(artifact, parsed, root, options);
    if (!current) return artifact;
    proof.push(current.proof); return current.artifact;
  });
  return { artifacts: projected, response: generated.response, proof };
}
module.exports = { currentExecutionPolicy, captureProjectionInputs, baselineInput, returnedTwoBaselineAudit, expectedReconciliationFacts,
  quarantineProjection, reconciliationTelemetry, validateRfpDecisionHistory, projectRfpGeneratedFields, driftPayloadProjection, projectCurrentExecution };
