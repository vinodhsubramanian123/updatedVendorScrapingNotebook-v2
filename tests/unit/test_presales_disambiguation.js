'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'test-presales-disambig-'));
const fixtures = ['DL380_Gen11', 'DL380_Gen12'].map(id => {
  const catalogDir = path.join(fixtureRoot, id);
  fs.mkdirSync(path.join(catalogDir, 'history'), { recursive: true });
  const catalogJsonPath = path.join(catalogDir, `${id}_Catalog.json`);
  fs.writeFileSync(catalogJsonPath, JSON.stringify({
    metadata: { chassis: id, baseSku: id === 'DL380_Gen12' ? 'P52534-B21' : 'P52532-B21' },
    entries: [{ skus: [{ 'Product #': id === 'DL380_Gen12' ? 'P52534-B21' : 'P52532-B21' }] }]
  }));
  return { id, chassis: id, catalogDir, catalogJsonPath };
});

const discovery = require('../../scripts/lib/catalog/catalog_discovery.js');
discovery.listAllCatalogs = () => fixtures;

test.after(() => {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
});

const {
  formatDisambiguationPrompt,
  parseDisambiguationChoice,
  recordDisambiguationDecision,
  runDisambiguationLoopTest,
  getBaseChassisSku
} = require('../../scripts/lib/boq/presales_disambiguation.js');
const { executeRoutedQuery } = require('../../scripts/evaluators/route_query.js');

test('Presales Disambiguation — Formats ask_question prompt from ambiguous response', async () => {
  const ambiguousRes = await executeRoutedQuery('Size a DL380 server with 128GB RAM', { offlineMode: true });

  assert.strictEqual(ambiguousRes.hitlRequired, true);
  const prompt = formatDisambiguationPrompt(ambiguousRes, 'Size a DL380 server with 128GB RAM');

  assert.ok(prompt, 'Disambiguation prompt must be generated');
  assert.strictEqual(typeof prompt.question, 'string');
  assert.ok(prompt.question.includes('Ambiguity detected'));
  assert.ok(Array.isArray(prompt.options));
  assert.ok(prompt.options.length >= 2);
  assert.ok(prompt.options.some(opt => opt.includes('DL380 Gen12')));
  assert.ok(prompt.options.some(opt => opt.includes('DL380 Gen11')));
  assert.strictEqual(prompt.is_multi_select, false);
});

test('Presales Disambiguation — Parses user selection to canonical chassis ID', () => {
  const candidates = ['DL380_Gen12', 'DL380_Gen11'];

  const choice1 = parseDisambiguationChoice('(Recommended) HPE ProLiant DL380 Gen12', candidates);
  assert.strictEqual(choice1, 'DL380_Gen12');

  const choice2 = parseDisambiguationChoice('HPE ProLiant DL380 Gen11', candidates);
  assert.strictEqual(choice2, 'DL380_Gen11');

  const choiceFallback = parseDisambiguationChoice('Unknown selection', candidates);
  assert.strictEqual(choiceFallback, null);
});

test('Presales Disambiguation — Ingests decision into feedback loop and certifies activation', () => {
  const target12 = fixtures.find(f => f.id === 'DL380_Gen12').catalogDir;
  const recorded = recordDisambiguationDecision(
    'Size a DL380 server',
    'DL380_Gen12',
    {
      targetDir: target12,
      reviewer: 'TEST_ARCHITECT',
      reasoning: 'Architect selected Gen12 as company standard'
    }
  );

  assert.strictEqual(recorded.success, true);
  assert.strictEqual(recorded.chassis, 'DL380_Gen12');
  assert.strictEqual(recorded.delta.governanceStatus, 'LOCAL_USER_PREFERENCE');
  assert.strictEqual(recorded.delta.evidenceSource, 'USER_CHOICE');
});

test('Presales Disambiguation — Closed-loop verification re-runs query to achieve autonomous confidence', async () => {
  const query = 'Size a DL380 server with 128GB RAM';
  const resolvedChassis = 'DL380_Gen12';
  const target12 = fixtures.find(f => f.id === 'DL380_Gen12').catalogDir;

  // Record the user choice first into the isolated catalog
  recordDisambiguationDecision(query, resolvedChassis, {
    targetDir: target12,
    reviewer: 'TEST_ARCHITECT',
    reasoning: 'Architect selected Gen12'
  });

  // Run the loop test WITHOUT forced chassisName context
  const loopResult = await runDisambiguationLoopTest(query, resolvedChassis, { offlineMode: true });

  assert.strictEqual(loopResult.verified, true, 'Loop test must verify query resolution');
  assert.strictEqual(loopResult.hitlRequired, false, 'Resolved query must not require further HITL prompts');
  assert.strictEqual(loopResult.targetChassis, 'DL380_Gen12');
  assert.strictEqual(loopResult.usedPreferenceIds.length, 1);
  assert.ok(loopResult.result);
});

test('Presales Disambiguation — All 5 helper exports stay and getBaseChassisSku resolves correctly', () => {
  assert.strictEqual(typeof formatDisambiguationPrompt, 'function');
  assert.strictEqual(typeof parseDisambiguationChoice, 'function');
  assert.strictEqual(typeof recordDisambiguationDecision, 'function');
  assert.strictEqual(typeof runDisambiguationLoopTest, 'function');
  assert.strictEqual(typeof getBaseChassisSku, 'function');
  assert.strictEqual(getBaseChassisSku('DL380_Gen12'), 'P52534-B21');
  assert.strictEqual(getBaseChassisSku('DL380_Gen11'), 'P52532-B21');
});
