'use strict';
/**
 * tests/unit/test_bom_verifier.js — Unit Tests for 14-Point Pre-Presentation Acceptance Gate
 *
 * Verifies strict adherence to:
 * - INV-105: Zero-Default Success Guard (missing data evaluates to UNKNOWN or FAILED, never PASS)
 * - INV-104: Non-Repudiation on Disk
 * - INV-0: Four-Tier Epistemic Discipline (syntax != catalog validity != live portal acceptance)
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const {
  verifyPrePresentationAcceptance,
  validateUniversalCriteria,
  validateBoqEvaluationCriteria,
  validateRfpSizingCriteria,
  validateBomReconciliationCriteria,
  validateFreeformQaCriteria
} = require('../../scripts/lib/boq/bom_verifier.js');

describe('Pre-Presentation Acceptance Gate (bom_verifier.js)', () => {

  test('U1: Fails empty or undefined output payload', () => {
    const res = verifyPrePresentationAcceptance(null, 'BOQ_EVALUATION');
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.status, 'FAILED');
    const u1 = res.checks.find(c => c.id === 'U1');
    assert.ok(u1, 'U1 check must be present');
    assert.strictEqual(u1.status, 'FAILED');
    assert.strictEqual(u1.passed, false);
  });

  test('U3: Evaluates to UNKNOWN when SKUs have valid syntax but catalogData is missing', () => {
    const output = {
      items: [{ sku: 'P73282-B21', quantity: 1, unitPriceUsd: 1500 }]
    };
    // No catalogData in context or output
    const checks = validateUniversalCriteria(output, {});
    const u3 = checks.find(c => c.id === 'U3');
    assert.ok(u3, 'U3 check must be present');
    assert.strictEqual(u3.status, 'UNKNOWN', 'INV-105: Syntax match without catalog presence must be UNKNOWN');
    assert.strictEqual(u3.passed, false, 'Incomplete catalog verification cannot pass');
  });

  test('U3: Evaluates to PASSED when SKUs are confirmed present in supplied catalogData', () => {
    const mockCatalog = {
      entries: [
        {
          parentCategory: 'Server',
          skus: [{ 'Product #': 'P73282-B21', Description: 'HPE DL380 Gen12 8SFF CTO Server' }]
        }
      ]
    };
    const output = {
      items: [{ sku: 'P73282-B21', quantity: 1, unitPriceUsd: 1500 }]
    };
    const checks = validateUniversalCriteria(output, { catalogData: mockCatalog });
    const u3 = checks.find(c => c.id === 'U3');
    assert.strictEqual(u3.status, 'PASSED');
    assert.strictEqual(u3.passed, true);
  });

  test('U3: Evaluates to FAILED when SKUs are absent from supplied catalogData', () => {
    const mockCatalog = {
      entries: [
        {
          parentCategory: 'Server',
          skus: [{ 'Product #': 'P73282-B21', Description: 'HPE DL380 Gen12 8SFF CTO Server' }]
        }
      ]
    };
    const output = {
      items: [{ sku: 'P99999-B21', quantity: 1, unitPriceUsd: 500 }]
    };
    const checks = validateUniversalCriteria(output, { catalogData: mockCatalog });
    const u3 = checks.find(c => c.id === 'U3');
    assert.strictEqual(u3.status, 'FAILED');
    assert.strictEqual(u3.passed, false);
    assert.ok(u3.detail.includes('absent from scoped catalog'));
  });

  test('B1: Evaluates to UNKNOWN when physical aspect checks were never run', () => {
    const output = { items: [{ sku: 'P73282-B21', quantity: 1 }] };
    const checks = validateBoqEvaluationCriteria(output, {});
    const b1 = checks.find(c => c.id === 'B1');
    assert.strictEqual(b1.status, 'UNKNOWN', 'INV-105: Missing aspect checks must evaluate to UNKNOWN');
    assert.strictEqual(b1.passed, false);
  });

  test('B1: Evaluates to FAILED when fewer than 7 aspect checks are returned', () => {
    const output = {
      aspectChecks: [
        { id: 'aspect_1', name: 'Compute', status: 'PASS' },
        { id: 'aspect_2', name: 'Memory', status: 'PASS' }
      ]
    };
    const checks = validateBoqEvaluationCriteria(output, {});
    const b1 = checks.find(c => c.id === 'B1');
    assert.strictEqual(b1.status, 'FAILED', 'Incomplete aspect coverage (<7) must fail');
    assert.strictEqual(b1.passed, false);
  });

  test('B1: Evaluates to ACTION_REQUIRED when an aspect check has UNKNOWN status', () => {
    const output = {
      aspectChecks: [
        { id: 'aspect_1', name: 'Compute', status: 'PASS' },
        { id: 'aspect_2', name: 'Memory', status: 'PASS' },
        { id: 'aspect_3', name: 'Storage', status: 'PASS' },
        { id: 'aspect_4', name: 'Power', status: 'PASS' },
        { id: 'aspect_5', name: 'Networking', status: 'UNKNOWN' },
        { id: 'aspect_6', name: 'PCIe', status: 'PASS' },
        { id: 'aspect_7', name: 'Support', status: 'PASS' }
      ]
    };
    const checks = validateBoqEvaluationCriteria(output, {});
    const b1 = checks.find(c => c.id === 'B1');
    assert.strictEqual(b1.status, 'ACTION_REQUIRED');
    assert.strictEqual(b1.passed, false);
  });

  test('B6: Fails unpriced items if hasUnresolvedPrices flag is missing (INV-33)', () => {
    const output = {
      items: [
        { sku: 'P73282-B21', quantity: 1, unitPriceUsd: 1500 },
        { sku: 'P49619-B21', quantity: 2, unitPriceUsd: 0 } // Unpriced!
      ]
    };
    const checks = validateBoqEvaluationCriteria(output, {});
    const b6 = checks.find(c => c.id === 'B6');
    assert.strictEqual(b6.status, 'FAILED', 'Unflagged zero price items must fail INV-33 check');
    assert.strictEqual(b6.passed, false);
  });

  test('B6: Passes unpriced items when explicitly tagged with hasUnresolvedPrices per INV-33', () => {
    const output = {
      hasUnresolvedPrices: true,
      unresolvedPriceSkus: ['P49619-B21'],
      items: [
        { sku: 'P73282-B21', quantity: 1, unitPriceUsd: 1500 },
        { sku: 'P49619-B21', quantity: 2, unitPriceUsd: 0 }
      ]
    };
    const checks = validateBoqEvaluationCriteria(output, {});
    const b6 = checks.find(c => c.id === 'B6');
    assert.strictEqual(b6.status, 'PASSED');
    assert.strictEqual(b6.passed, true);
  });

  test('Gate: Status is INCOMPLETE and isValid is false when blockers are UNKNOWN and none FAILED', () => {
    const output = {
      chassis: 'DL380_Gen12',
      rankedSolutions: [
        { rank: 1, skuPartsList: [{ sku: 'P73282-B21', quantity: 1, unitPriceUsd: 1500 }] }
      ]
      // No aspectChecks, so B1 evaluates to UNKNOWN (severity: BLOCK)
      // No catalogData, so U3 evaluates to UNKNOWN (severity: BLOCK)
    };
    const res = verifyPrePresentationAcceptance(output, 'BOQ_EVALUATION', {});
    assert.strictEqual(res.isValid, false, 'Gate must NOT pass when blocker is UNKNOWN');
    assert.strictEqual(res.status, 'INCOMPLETE', 'Gate status must be INCOMPLETE when blockers are UNKNOWN and none FAILED');
    assert.ok(res.blockersCount > 0);
  });
});
