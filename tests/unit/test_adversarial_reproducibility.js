'use strict';
/**
 * tests/unit/test_adversarial_reproducibility.js — Reproducible Adversarial Injection Tests
 *
 * Validates R-12 requirements:
 * - Deterministic, reproducible adversarial test cases
 * - Specific expected detector matching (e.g. thermal fan, memory generation, DC power terminal)
 *   rather than generic "caught any issue" assertion.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  REPRODUCIBLE_ADVERSARIAL_SUITES,
  evaluateAdversarialInjection
} = require('../../scripts/evaluators/adversarial_agent.js');

test('Adversarial Agent — reproducible suites define expected detectors (R-12)', () => {
  assert.ok(Array.isArray(REPRODUCIBLE_ADVERSARIAL_SUITES));
  assert.ok(REPRODUCIBLE_ADVERSARIAL_SUITES.length >= 3, 'Must define at least 3 reproducible adversarial suites');

  for (const suite of REPRODUCIBLE_ADVERSARIAL_SUITES) {
    assert.ok(suite.id, 'Suite must have an ID');
    assert.ok(suite.name, 'Suite must have a name');
    assert.ok(suite.chassis, 'Suite must specify target chassis');
    assert.ok(suite.expectedAspectId || suite.expectedDetectorKeywords, 'Suite must declare expected detector');
    assert.ok(Array.isArray(suite.items) && suite.items.length > 0, 'Suite must have test items');
  }
});

test('Adversarial Agent — evaluates injections and asserts expected detector matches specifically (R-12)', () => {
  for (const suite of REPRODUCIBLE_ADVERSARIAL_SUITES) {
    const result = evaluateAdversarialInjection(suite);
    assert.equal(result.isCaught, true, `Adversarial suite ${suite.id} must be caught by evaluator`);
    assert.equal(
      result.detectorMatched,
      true,
      `Adversarial suite ${suite.id} must specifically trigger expected detector (${suite.expectedAspectId || suite.expectedDetectorKeywords})`
    );
  }
});
