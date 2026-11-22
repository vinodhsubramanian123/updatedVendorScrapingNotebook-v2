const test = require('node:test');
const assert = require('node:assert/strict');
const { performReasoningPostAnalysis: analyze } = require('../../scripts/lib/system/reasoning_post_analyzer');
function report(responseData, context = {}) {
  return analyze({ responseData, context: { persistLedger: false, ...context } });
}

test('PCIe explanation uses the same cluster scope on both sides and preserves missing operands', () => {
  const explain = pcie => report({ evalSummary: { pcie } }).reasoningNarrative[2];
  const pcie = { requiredPcieCards: 8, activeSlotsAvailable: 2, slotLayout: { clusterTotals: {
    serverCount: 4, pcieCardDemand: 8, electricallyActiveSlotCapacity: 8, mechanicalSlotCapacity: 12
  } } };
  assert.match(explain(pcie), /8 card\(s\).*8 slot\(s\).*4 servers/);
  assert.doesNotMatch(explain(pcie), /Deficit|100% PCIe coverage/);
  assert.match(explain({ requiredPcieCards: 2 }), /UNKNOWN/);
  assert.match(explain({ activeSlotsAvailable: 2 }), /UNKNOWN/);
  assert.match(explain({ requiredPcieCards: 2, activeSlotsAvailable: 0 }), /Deficit: -2/);
});

test('routing success cannot supply an acceptance decision or prove clean physical checks', () => {
  for (const status of ['UNKNOWN', 'FAIL', 'NOT_APPLICABLE']) {
    const result = report({ status: 'PASSED', aspectChecksCompleted: true, aspectChecks: [{ status }] });
    assert.equal(result.acceptanceGate.status, 'NOT_EVALUATED');
    assert.equal(result.acceptanceGate.isValid, null);
    assert.equal(result.epistemicIntegrity.isMathClean, status === 'FAIL' ? false : null);
  }
  assert.equal(report({ isMathClean: null }).epistemicIntegrity.isMathClean, null);
  assert.equal(report({ aspectChecksCompleted: true }).transparencyAudit.physicalChecksEvaluated, true);
  const skipped = report({ aspectChecks: [null, { status: 'NOT_APPLICABLE' }] });
  assert.equal(skipped.epistemicIntegrity.tier, 'TIER_0_UNTRUSTED_CLAIM');
  assert.equal(skipped.transparencyAudit.physicalChecksEvaluated, false);
  assert.equal(skipped.acceptanceGate.blockersCount, null);
  assert.equal(report({ isMathClean: true, aspectChecks: [{ status: 'FAIL' }] }).epistemicIntegrity.isMathClean, false);
});

test('memory population flags remain independent of count divisibility and actual slot placement', () => {
  const explain = memory => report({ evalSummary: { memory } }).reasoningNarrative[2];
  const memory = { cpuCount: 2, channelWidth: 8, memoryCount: 32 };
  assert.match(explain(memory), /2 DIMM\(s\) per channel/);
  assert.doesNotMatch(explain(memory), /32\/16 channels populated/);
  const invalid = explain({ ...memory, isInvalidChannelConfiguration: true });
  assert.match(invalid, /invalid population/);
  assert.doesNotMatch(invalid, /0 != 0|asymmetric NUMA/);
});

test('feedback reports governance receipts and preserves completed observations on partial failure', t => {
  const feedback = require('../../scripts/lib/feedback/feedback_loop');
  const outcomes = [{ governanceStatus: 'WORKFLOW_ADVISORY_ONLY' }, { governanceStatus: 'REJECTED' }, { governanceStatus: 'QUARANTINED' }];
  t.mock.method(feedback, 'processPortalFeedback', () => {
    if (outcomes.length) return outcomes.shift();
    throw new Error('simulated write failure');
  });
  const original = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  t.after(() => { if (original === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = original; });
  const hook = report({ missingDependencies: ['a', 'b', 'c', 'd'] }, { enableFeedback: true, chassisDir: __dirname }).continuousLearningHook;
  assert.equal(hook.hookStatus, 'HOOK_ERROR');
  assert.equal(hook.quarantinedCount, 1);
  assert.equal(hook.rejectedCount, 1);
  assert.equal(hook.advisoryCount, 1);
});
