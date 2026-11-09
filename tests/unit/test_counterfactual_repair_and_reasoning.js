'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { safeWriteJsonAtomic } = require('../../scripts/lib/system/fs_compat');
const { generateCounterfactualRepairProofs: repair } = require('../../scripts/lib/system/counterfactual_repair');
const { determineEpistemicTier, performReasoningPostAnalysis } = require('../../scripts/lib/system/reasoning_post_analyzer');
const { retractPromotedDelta, supersedeKnowledgeDelta } = require('../../scripts/lib/feedback/quarantined_deltas');
const { filterDeltaRules } = require('../../scripts/lib/catalog/active_knowledge_router');
const { collectAllDeltas } = require('../../scripts/lib/sync/knowledge_sync');
const { _handleBoqReflectionPhase } = require('../../scripts/evaluators/eval_boq');
const catalog = { metadata: { model: 'DL380_Gen12' }, entries: [{ parentCategory: 'Power Supplies', skus: [
  { sku: 'P38997-B21', Description: '1600W Power Supply' }, { sku: 'P44712-B21', Description: '2200W Power Supply' }
] }] };
const evaluation = power => ({ chassis: 'DL380_Gen12', catalogData: catalog, evalSummary: { power } });

test('Electrically excluded PSUs cannot create false or negative wattage deficits', () => {
  for (const description of ['2200W -48VDC Power Supply', '2200W -48V DC Power Supply', '2200W DC Power Supply']) {
    const result = evaluation({ hasZeroPsus: true, requiredWattageWithHeadroom: 1000, installedPsuType: 'AC' });
    result.catalogData = { metadata: catalog.metadata, entries: [{ parentCategory: 'Power Supplies', skus: [
      { sku: 'P44712-B21', description }
    ] }] };
    const proof = repair(result)[0];
    assert.equal(proof.resultingStatus, 'ACTION_REQUIRED');
    assert.deepEqual(proof.requiredHardwareDeltas, []);
    assert.match(proof.mathematicalProof, /No electrically compatible/);
    assert.doesNotMatch(proof.mathematicalProof, /-1200W/);
    result.evalSummary.power.installedPsuType = '-48VDC';
    assert.equal(repair(result)[0].resultingStatus, 'PROPOSED_UNVALIDATED');
  }
});

test('Both missing and underpowered PSUs enforce actual catalog ceiling; proposals are never certification', () => {
  for (const missing of [true, false]) {
    const proof = repair(evaluation({ hasZeroPsus: missing, hasPsuWattageDeficit: !missing, psuCount: missing ? 0 : 2, requiredWattageWithHeadroom: 3000 }))[0];
    assert.equal(proof.resultingStatus, 'REPAIR_INFEASIBLE');
    assert.deepEqual(proof.requiredHardwareDeltas, []);
  }
  const proof = repair(evaluation({ hasZeroPsus: true, estimatedNodeWattage: 850 }), { serverCount: 3 })[0];
  assert.equal(proof.resultingStatus, 'PROPOSED_UNVALIDATED');
  assert.equal(proof.requiredHardwareDeltas[0].quantity, 6);
  assert.equal(proof.requiredHardwareDeltas[0].sku, 'P38997-B21');
});

test('Unknown, mismatched and absent catalogs never select generic parts; invalid counts stay unresolved', () => {
  for (const overrides of [{ chassis: undefined }, { chassis: 'DL360_Gen12' }, { catalogData: null }]) {
    const proof = repair({ ...evaluation({ hasZeroPsus: true, estimatedNodeWattage: 850 }), ...overrides })[0];
    assert.equal(proof.resultingStatus, 'ACTION_REQUIRED');
    assert.deepEqual(proof.requiredHardwareDeltas, []);
  }
  for (const serverCount of [0, -1, NaN, 1.5]) assert.deepEqual(repair(evaluation({ hasZeroPsus: true, estimatedNodeWattage: 850 }), { serverCount })[0].requiredHardwareDeltas, []);
});

test('Thermal proposals require explicit rating and packaging; service selection respects SLA and duration', () => {
  const data = structuredClone(catalog);
  data.entries.push({ parentCategory: 'Thermal', skus: [{ sku: 'P74794-B21', Description: 'Heat Sink', thermalRatingWatts: 350, socketsPerKit: 2 }] });
  data.entries.push({ parentCategory: 'Services', skus: [
    { sku: 'HU4B1A3', Description: '3 Year Tech Care Basic' }, { sku: 'HU4B3A3', Description: '3 Year Tech Care Critical' }
  ] });
  const result = { chassis: 'DL380_Gen12', catalogData: data, compute: { needsHeatsink: true, cpuCount: 2, maxCpuTdpWatts: 300 }, support: { hasSupportService: false } };
  const proofs = repair(result, { customerRequirements: { supportLevel: 'Critical' } });
  assert.equal(proofs[0].requiredHardwareDeltas[0].quantity, 1);
  assert.equal(proofs[1].requiredHardwareDeltas[0].sku, 'HU4B3A3');
  assert.equal(repair(result, { customerRequirements: { supportYears: 5 } })[1].resultingStatus, 'ACTION_REQUIRED');
  data.entries[1].skus[0].thermalRatingWatts = undefined;
  assert.deepEqual(repair(result)[0].requiredHardwareDeltas, []);
});

test('Every blocker survives, including duplicate IDs and no IDs; SKU prose never authorizes additions', () => {
  const blockers = [{ id: 'BUDGET', detail: 'Over budget' }, { id: 'BUDGET', detail: 'Second constraint' },
    { detail: 'P69770-B21 is prohibited' }, { id: 'GROUNDING', detail: 'Missing citations' }];
  const proofs = repair({ acceptanceGate: { blockers, blockersCount: 5 } });
  assert.equal(proofs.length, 5);
  assert.equal(new Set(proofs.map(p => p.issueType)).size, 5);
  assert.ok(proofs.every(p => p.requiredHardwareDeltas.length === 0));
  assert.equal(proofs[3].resultingStatus, 'ACTION_REQUIRED_EVIDENCE_PROBE');
  assert.equal(proofs[4].issueType, 'BLOCKER_DETAILS_MISSING');
});

test('Bare receipt IDs, flags and fabricated receipt hashes never establish Tier 3', () => {
  for (const result of [{ portalValidationStatus: 'ACCEPTED_BY_VENDOR' }, { clicValidation: { isValid: true } },
    { clicReceipt: { receiptId: 'fake', status: 'ACCEPTED_BY_VENDOR' } }, { portalReceipt: { receiptSha256: 'fake' } }]) {
    assert.equal(determineEpistemicTier(result).vendorAcceptancePending, true);
  }
});

test('Missing, attempted and rejected correction states are not counted as resolved', () => {
  const responseData = { selfCorrectionTrail: [{}, { status: 'REJECTED', verifiedBuildable: true }, { status: 'RESOLVED', verifiedBuildable: false }] };
  const analysis = performReasoningPostAnalysis({ responseData, context: { persistLedger: false } });
  assert.match(analysis.reasoningNarrative.join(' '), /Resolved 0 physical/);
  assert.match(analysis.reasoningNarrative.join(' '), /UNVERIFIED/);
});

test('Retraction survives fresh reads and registry rebuild; all registry shapes are deactivated', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'reasoning-retraction-'));
  try {
    const chassisDir = path.join(dir, 'DL380_Gen12');
    const history = path.join(chassisDir, 'history'); fs.mkdirSync(history, { recursive: true });
    const delta = { deltaId: 'BAD', chassis: 'DL380_Gen12', affectedSku: 'P38997-B21', requiredDependencySku: 'P44712-B21', ruleType: 'PREREQUISITE', status: 'ACTIVE', governanceStatus: 'ACTIVE', rawMessage: 'Bad rule' };
    const masterRegistryPath = path.join(dir, 'master.json');
    safeWriteJsonAtomic(masterRegistryPath, { universalRules: [delta], familyGenRules: [delta], chassisSpecificRules: [delta], deltas: [delta] });
    safeWriteJsonAtomic(path.join(history, 'catalog_deltas.json'), [delta]);
    const options = { masterRegistryPath, globalDeltasPath: path.join(dir, 'global.json'), chassisDir, filePath: path.join(history, 'quarantined_deltas.json') };
    assert.equal(retractPromotedDelta('BAD', 'Incorrect constraint', options), true);
    const master = JSON.parse(fs.readFileSync(masterRegistryPath));
    assert.ok(Object.values(master).every(list => list[0].active === false));
    const saved = JSON.parse(fs.readFileSync(path.join(history, 'catalog_deltas.json')));
    const filtered = filterDeltaRules(saved, 'DL380_Gen12', chassisDir);
    assert.ok(Object.values(filtered).filter(Array.isArray).every(list => list.length === 0));
    assert.deepEqual(collectAllDeltas(dir), []);
    // An old source copy also remains inactive through the persistent decision ledger.
    safeWriteJsonAtomic(path.join(history, 'catalog_deltas.json'), [delta]);
    assert.deepEqual(collectAllDeltas(dir), []);
    const fresh = require('child_process').spawnSync(process.execPath, ['-e',
      "const {collectAllDeltas}=require('./scripts/lib/sync/knowledge_sync'); if(collectAllDeltas(process.argv[1]).length) process.exit(1);", dir],
      { cwd: path.resolve(__dirname, '../..'), encoding: 'utf8' });
    assert.equal(fresh.status, 0, fresh.stderr);
    supersedeKnowledgeDelta('BAD', 'GOOD', 'Replacement', options);
    assert.equal(JSON.parse(fs.readFileSync(masterRegistryPath)).chassisSpecificRules[0].status, 'SUPERSEDED');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('Reflection errors remain ACTION_REQUIRED', async () => {
  const phase = await _handleBoqReflectionPhase({ options: {}, startTime: Date.now(), evalResults: { get aspectChecks() { throw new Error('broken analyzer'); } } });
  assert.equal(phase.status, 'ACTION_REQUIRED');
  assert.equal(phase.summary.epistemicTier, 'UNKNOWN');
});
