'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

const {
  formatDisambiguationPrompt,
  parseDisambiguationChoice,
  recordDisambiguationDecision,
  runDisambiguationLoopTest
} = require('../../scripts/lib/boq/presales_disambiguation.js');
const { executeRoutedQuery } = require('../../scripts/evaluators/route_query.js');

test('Presales Disambiguation — Formats ask_question prompt from ambiguous response', async () => {
  const ambiguousRes = await executeRoutedQuery('Size a DL380 server with 128GB RAM');

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
  assert.strictEqual(choiceFallback, 'DL380_Gen12');
});

test('Presales Disambiguation — Ingests decision into feedback loop and certifies activation', () => {
  const tmpDir = path.join(os.tmpdir(), `test_disambig_feedback_${Date.now()}`);
  const historyDir = path.join(tmpDir, 'history');
  fs.mkdirSync(historyDir, { recursive: true });

  fs.writeFileSync(path.join(tmpDir, `${path.basename(tmpDir)}_Catalog.json`), JSON.stringify({
    entries: [{ skus: [{ 'Product #': 'P52534-B21' }] }]
  }));

  try {
    const recorded = recordDisambiguationDecision(
      'Size a DL380 server',
      'DL380_Gen12',
      {
        targetDir: tmpDir,
        reviewer: 'TEST_ARCHITECT',
        reasoning: 'Architect selected Gen12 as company standard'
      }
    );

    assert.strictEqual(recorded.success, true);
    assert.strictEqual(recorded.chassis, 'DL380_Gen12');
    assert.strictEqual(recorded.delta.governanceStatus, 'ACTIVE');
    assert.strictEqual(recorded.delta.scopeTaxonomy, 'CHASSIS_SPECIFIC');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Presales Disambiguation — Closed-loop verification re-runs query to achieve autonomous confidence', async () => {
  const query = 'Size a DL380 server with 128GB RAM';
  const resolvedChassis = 'DL380_Gen12';

  const loopResult = await runDisambiguationLoopTest(query, resolvedChassis);

  assert.strictEqual(loopResult.verified, true, 'Loop test must verify query resolution');
  assert.strictEqual(loopResult.hitlRequired, false, 'Resolved query must not require further HITL prompts');
  assert.strictEqual(loopResult.confidence, 1.0, 'Resolved query must have confidence >= 0.95');
  assert.strictEqual(loopResult.targetChassis, 'DL380_Gen12');
  assert.ok(loopResult.result);
});
