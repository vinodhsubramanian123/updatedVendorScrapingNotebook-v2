'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { scenarios, families } = require('../../scripts/maintenance/skill_workflow/golden_scenarios.js');
const { semanticProjection, compareGolden } = require('../../scripts/maintenance/skill_workflow/golden_projection.js');

test('CP0 scenario declarations retain all 19 families and 17 route intents', () => {
  assert.equal(new Set(families.map(f => f.id)).size, 19);
  assert.equal(new Set(scenarios.map(f => f.intent)).size, 17);
  assert.equal(new Set(scenarios.map(f => f.id)).size, scenarios.length);
  assert.deepEqual(scenarios.filter(f => f.execute === false).map(f => f.intent), ['ADVERSARIAL_VALIDATION']);
  for (const scenario of scenarios) assert.ok(families.some(f => f.id === scenario.family));
});
test('CP0 projector preserves domain truths while normalizing declared runtime values', () => {
  const make = (root, id, time) => ({ response: { traceId: id, timestamp: time, executionTimeMs: 123,
    result: { traceId: id, status: 'ACTION_REQUIRED', catalogCapturedAt: '2026-09-01', quantity: 9,
      manifestSha256: 'fact-hash', price: 0, owner: 'server-A', sku: 'CUSTOM-A', citations: ['source-1'], report: root + '/evidence_' + id + '.json' } } });
  assert.deepEqual(semanticProjection(make('C:/copy-a', 'TRC-100-ABC', '2026-10-04T10:00:00.123Z'), { root: 'C:/copy-a' }),
    semanticProjection(make('C:/copy-b', 'TRC-200-DEF', '2026-10-04T11:00:00.234Z'), { root: 'C:/copy-b' }));
});
for (const [field, before, after] of [
  ['status', 'PASSED', 'FAILED'], ['quantity', 1, 2], ['sku', 'A', 'B'], ['owner', 'server', 'shared'],
  ['price', null, 0], ['manifestSha256', 'A', 'B'], ['catalogCapturedAt', '2026-09-01', '2026-10-01']
]) {
  test(`CP0 comparison refuses to hide ${field} differences`, () => {
    const left = semanticProjection({ response: { result: { [field]: before } } });
    const right = semanticProjection({ response: { result: { [field]: after } } });
    const comparison = compareGolden(left, right);
    assert.equal(comparison.equal, false);
    assert.ok(comparison.differences.some(d => d.path.endsWith(`.${field}`)));
  });
}
test('CP0 comparison preserves array order, missing fields and unlisted timestamps', () => {
  assert.equal(compareGolden([1, 2], [2, 1]).equal, false);
  assert.equal(compareGolden({}, { quantity: null }).equal, false);
  const a = semanticProjection({ response: { result: { timestamp: 'vendor-observation-A' } } });
  const b = semanticProjection({ response: { result: { timestamp: 'vendor-observation-B' } } });
  assert.equal(compareGolden(a, b).equal, false);
});
test('CP0 projection preserves null observations and non-generated caller trace identity', () => {
  const projected = semanticProjection({ response: { traceId: 'CALLER_FIXED', timestamp: null, result: { reference: 'CALLER_FIXED' } } });
  assert.equal(projected.response.traceId, 'CALLER_FIXED');
  assert.equal(projected.response.timestamp, null);
  assert.equal(projected.response.result.reference, 'CALLER_FIXED');
});
test('CP0 projection does not disguise invalid or unknown elapsed measurement', () => {
  const invalid = semanticProjection({ response: { executionTimeMs: -1 } });
  const observed = semanticProjection({ response: { executionTimeMs: 0 } });
  const unknown = semanticProjection({ response: { executionTimeMs: null } });
  assert.equal(compareGolden(invalid, observed).equal, false);
  assert.equal(compareGolden(unknown, observed).equal, false);
});
test('CP0 projection retains malformed timestamps and nonnumeric durations', () => {
  for (const value of ['UNKNOWN', {}, [], true]) {
    assert.deepEqual(semanticProjection({ response: { executionTimeMs: value } }).response.executionTimeMs, value);
  }
  for (const value of ['bad-date', '2026-02-30T12:00:00Z', {}, 123]) {
    assert.deepEqual(semanticProjection({ response: { timestamp: value } }).response.timestamp, value);
  }
});
