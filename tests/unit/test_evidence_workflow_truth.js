'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { EvidenceLedger } = require('../../scripts/lib/system/evidence_ledger');
const { parseRankVerdicts } = require('../../scripts/lib/sync/nlm_solution_source_validator');
const { validateGroundingCitations } = require('../../scripts/lib/notebook/query_diagnostics');
const { _buildSummaryData, _getRankedSolutions, generatePartnerPortalReadyWorkbook } = require('../../scripts/lib/boq/generate_boq_xlsx');
const XLSX = require('xlsx-js-style');
const { solutionFingerprint, candidateReviewCurrent } = require('../../scripts/lib/boq/solution_evidence');
const { refreshSharedKnowledgeSources } = require('../../scripts/lib/sync/shared_knowledge_refresh');
const { generateUniversalCharterMarkdown } = require('../../scripts/services/running_knowledge_sync');

test('saved ledger preserves terminal failures, full query and content fingerprints', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'evidence-truth-'));
  try {
    const input = path.join(dir, 'customer.csv');
    fs.writeFileSync(input, 'SKU,Qty\nP12345-B21,2');
    const ledger = new EvidenceLedger({ filePath: input, chassis: 'DL360_Gen11' });
    ledger.recordArtifact('CUSTOMER_INPUT', input);
    ledger.recordSkuAudit('P12345-B21', 'NORMALIZED_INPUT', 'Customer requested two', null, 'Memory', { quantity: 2 });
    for (let n = 1; n <= 9; n++) {
      ledger.startPhase(n, `Phase ${n}`);
      ledger.completePhase(n, n === 8 ? 'FAILED' : 'PASSED');
    }
    const query = 'whole solution '.repeat(100);
    ledger.recordNotebookLmTrace(query, { isCloudGrounded: false }, [{ source_id: 'vendor' }]);
    const result = ledger.finalizeAndExport(dir);
    const saved = JSON.parse(fs.readFileSync(result.jsonPath, 'utf8'));
    assert.equal(saved.health.healthy, true, 'a fully recorded failure is healthy evidence, not a successful workflow');
    assert.equal(saved.health.workflowStatus, 'FAILED');
    assert.equal(saved.phases.phase_8.status, 'FAILED');
    assert.equal(saved.sharedState.dualBrainVerified, false);
    assert.equal(saved.notebookLmTraces[0].queryPayload, query);
    assert.match(saved.artifacts[0].sha256, /^[a-f0-9]{64}$/);
    assert.equal(saved.events.length, 18);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('partial ledger never claims healthy completion', () => {
  const ledger = new EvidenceLedger();
  ledger.startPhase(9, 'Export');
  assert.equal(ledger.getHealth().healthy, false);
  assert.ok(ledger.getHealth().gaps.includes('PHASE_9_UNFINISHED'));
});

test('every candidate requires exactly one explicit cited verdict', () => {
  const evaluation = { conflictGraph: { rankedSolutions: [{ rank: 1 }, { rank: 2 }] } };
  const pass = { rank: 1, verdict: 'PASS', intentPreserved: true, mandatoryChangesOnly: true, issues: [], citations: ['vendor:page4'] };
  assert.deepEqual(parseRankVerdicts(JSON.stringify({ ranks: [pass] }), evaluation).map(r => r.verdict), ['PASS', 'UNKNOWN']);
  assert.equal(parseRankVerdicts(JSON.stringify({ ranks: [pass, pass] }), evaluation)[0].verdict, 'UNKNOWN');
  assert.equal(parseRankVerdicts('Everything is buildable', evaluation)[0].verdict, 'UNKNOWN');
  assert.equal(parseRankVerdicts(JSON.stringify({ ranks: [{ ...pass, issues: ['missing cable'] }] }), evaluation)[0].verdict, 'UNKNOWN');
});

test('quantity or SKU changes invalidate the candidate review receipt', () => {
  const evaluation = { conflictGraph: { rankedSolutions: [{ rank: 1, skuPartsList: [{ sku: 'A', quantity: 2 }] }] } };
  evaluation.ephemeralSourceValidation = { success: true, manifestSha256: solutionFingerprint(evaluation) };
  assert.equal(candidateReviewCurrent(evaluation), true);
  evaluation.conflictGraph.rankedSolutions[0].skuPartsList[0].quantity = 3;
  assert.equal(candidateReviewCurrent(evaluation), false);
});

test('candidate source and anonymous citations cannot certify vendor grounding', () => {
  const ctx = { authoritativeSourceIds: ['official'] };
  assert.equal(validateGroundingCitations({ citations: [{ source_id: 'candidate', title: 'QuickSpecs' }] }, ctx).isCloudGrounded, false);
  assert.equal(validateGroundingCitations({ citations: [{}] }, ctx).isCloudGrounded, false);
  assert.equal(validateGroundingCitations({ citations: [{ source_id: 'official' }] }, ctx).isCloudGrounded, true);
});

test('unknown evaluation stays draft and portal schema preserves quantities across clusters', () => {
  assert.equal(_getRankedSolutions({ items: [] })[0].isDraft, true);
  assert.doesNotMatch(JSON.stringify(_buildSummaryData({})), /100% BUILDABLE|100% PASS/);
  const wb = generatePartnerPortalReadyWorkbook([{ nodeCount: 2, items: [{ sku: 'A', quantity: 3 }] }, { nodeCount: 4, items: [{ sku: 'B', quantity: 5 }] }]);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
  for (const row of rows.filter(r => r[0] === 'Part No')) assert.deepEqual(row, ['Part No', 'Qty', 'Set', ' Description', 'Unit List Price (USD)', 'Extended Price (USD)', 'Portal / CLIC Status']);
  assert.deepEqual(rows.find(r => r[0] === 'A').slice(0, 3), ['A', 3, 2]);
  assert.deepEqual(rows.find(r => r[0] === 'B').slice(0, 3), ['B', 5, 4]);
  assert.doesNotMatch(JSON.stringify(rows), /100% Validated & Certified/);
});

test('shared charter excludes product thresholds and SKU-specific or pending learning', () => {
  const text = generateUniversalCharterMarkdown([{ scopeTaxonomy: 'CHASSIS_SPECIFIC', status: 'ACTIVE', affectedSku: 'P11111-B21', ruleUpdate: 'DO_NOT_PROPAGATE' }, { scopeTaxonomy: 'UNIVERSAL', status: 'PENDING', ruleUpdate: 'PENDING_RULE' }]);
  assert.doesNotMatch(text, /DO_NOT_PROPAGATE|PENDING_RULE|185W|240W|P35876-B21/);
});

test('shared source is trusted only after exact revision readback', async () => {
  const config = { notebooks: { A: { notebookId: 'notebook', queryEnabled: true } } };
  const calls = [];
  const run = async args => {
    calls.push(args);
    if (args[1] === 'list') return '[]';
    if (args[1] === 'add') return '{"id":"new-source"}';
    return '{"content":"Shared knowledge revision: revision-123"}';
  };
  const result = await refreshSharedKnowledgeSources(config, 'shared-document', 'revision-123', { run });
  assert.equal(result.verified, true);
  assert.equal(config.notebooks.A.runningKnowledgeSourceId, 'new-source');
  assert.ok(config.notebooks.A.trustedSourceIds.includes('new-source'));
  assert.ok(calls.some(args => args[1] === 'content'));
  const bad = { notebooks: { B: { notebookId: 'notebook' } } };
  const rejected = await refreshSharedKnowledgeSources(bad, 'shared-document', 'different-revision', { run });
  assert.equal(rejected.verified, false);
  assert.equal(bad.notebooks.B.trustedSourceIds, undefined);
});
