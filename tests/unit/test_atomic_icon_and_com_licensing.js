'use strict';
/**
 * tests/unit/test_atomic_icon_and_com_licensing.js
 *
 * Verifies INV-179: Atomic Icon Principle & CLIC Rule 81322276
 * 1. Proportional and atomic allocation of COM / OneView licenses in multi_cluster_splitter.js.
 * 2. Injection of mandatory Base COM SKU R7A11AAE when Gen11/Gen12 ProLiant cluster has 0 licenses.
 * 3. Recognition of OneView E5Y35AAE / E5Y43A as qualifying alternatives.
 * 4. Pre-presentation acceptance gate B14 verification in bom_verifier.js.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  applyClusterManagementAndSupportPolicy,
  QUALIFYING_COM_ONEVIEW_SKUS
} = require('../../scripts/lib/boq/multi_cluster_splitter.js');
const { validateBoqEvaluationCriteria } = require('../../scripts/lib/boq/bom_verifier.js');

describe('INV-179: Atomic Icon Principle & CLIC Rule 81322276 Suite', () => {

  it('1. QUALIFYING_COM_ONEVIEW_SKUS contains all required COM and OneView SKUs per Rule 81322276', () => {
    assert.ok(QUALIFYING_COM_ONEVIEW_SKUS.has('R7A11AAE'), 'Must include Base COM R7A11AAE');
    assert.ok(QUALIFYING_COM_ONEVIEW_SKUS.has('R7A12AAE'), 'Must include 5-Year COM R7A12AAE');
    assert.ok(QUALIFYING_COM_ONEVIEW_SKUS.has('S2E10AAE'), 'Must include 7-Year COM S2E10AAE');
    assert.ok(QUALIFYING_COM_ONEVIEW_SKUS.has('S5E59AAE'), 'Must include COM Adv 3yr S5E59AAE');
    assert.ok(QUALIFYING_COM_ONEVIEW_SKUS.has('E5Y43A'), 'Must include OneView Adv FIO E5Y43A');
    assert.ok(QUALIFYING_COM_ONEVIEW_SKUS.has('P8B31A'), 'Must include OneView Adv w/o iLO P8B31A');
    assert.ok(QUALIFYING_COM_ONEVIEW_SKUS.has('E5Y35AAE'), 'Must include OneView Flexible E5Y35AAE');
    assert.ok(QUALIFYING_COM_ONEVIEW_SKUS.has('P8B25A'), 'Must include OneView Track P8B25A');
  });

  it('2. applyClusterManagementAndSupportPolicy injects mandatory R7A11AAE (1 per server) into Gen12 ProLiant cluster missing COM/OneView', () => {
    const cluster = {
      name: 'DL380_Cluster',
      multiplier: 20,
      items: [
        { sku: 'P73282-B21', quantity: 1, totalQuantity: 20, category: 'Base Chassis' },
        { sku: 'P74579-B21', quantity: 2, totalQuantity: 40, category: 'Processor' },
        { sku: 'BD505A', quantity: 1, totalQuantity: 20, category: 'Software & Licenses' } // iLO Advanced (does NOT satisfy COM)
      ]
    };
    const detectedChassis = { model: 'DL380 Gen12', gen: 'Gen12' };

    applyClusterManagementAndSupportPolicy(cluster, 20, [], detectedChassis);

    const comItem = cluster.items.find(i => i.sku === 'R7A11AAE');
    assert.ok(comItem, 'R7A11AAE must be injected into cluster');
    assert.equal(comItem.quantity, 1, 'Quantity per server must be 1');
    assert.equal(comItem.totalQuantity, 20, 'Total quantity must equal multiplier (20)');
    assert.equal(comItem.ruleId, '81322276');
    assert.ok(cluster.policyAdvisories.some(a => a.includes('81322276')), 'Policy advisory must be logged');
  });

  it('3. applyClusterManagementAndSupportPolicy does NOT inject duplicate COM when qualifying OneView E5Y35AAE is already present', () => {
    const cluster = {
      name: 'DL380_Cluster_OneView',
      multiplier: 20,
      items: [
        { sku: 'P73282-B21', quantity: 1, totalQuantity: 20, category: 'Base Chassis' },
        { sku: 'E5Y35AAE', quantity: 1, totalQuantity: 20, category: 'Software & Licenses', description: 'HPE OneView including 3yr 24x7 Support Flexible Quantity E-LTU' }
      ]
    };
    const detectedChassis = { model: 'DL380 Gen12', gen: 'Gen12' };

    applyClusterManagementAndSupportPolicy(cluster, 20, [], detectedChassis);

    const comItem = cluster.items.find(i => i.sku === 'R7A11AAE');
    assert.equal(comItem, undefined, 'Must not inject redundant R7A11AAE when E5Y35AAE is already present');
  });

  it('4. bom_verifier.js B14 check emits ACTION_REQUIRED on DL380 Gen12 BOM lacking COM/OneView (Rule 81322276)', () => {
    const outputWithoutCom = {
      chassis: 'DL380_Gen12',
      status: 'BUILDABLE',
      isMathClean: true,
      isWholeSolutionValid: true,
      items: [
        { sku: 'P73282-B21', quantity: 20, unitPriceUsd: 5584 },
        { sku: 'P74579-B21', quantity: 40, unitPriceUsd: 13124 },
        { sku: 'BD505A', quantity: 20, unitPriceUsd: 469 } // iLO Advanced only
      ]
    };

    const checks = validateBoqEvaluationCriteria(outputWithoutCom, {});
    const b14 = checks.find(c => c.id === 'B14');
    assert.ok(b14, 'B14 check must be present');
    assert.equal(b14.status, 'ACTION_REQUIRED', 'Missing COM on Gen12 must trigger ACTION_REQUIRED');
    assert.ok(b14.detail.includes('81322276'), 'Detail must reference Rule 81322276');
  });

  it('5. bom_verifier.js B14 check passes when qualifying OneView or COM license is present', () => {
    const outputWithCom = {
      chassis: 'DL380_Gen12',
      status: 'BUILDABLE',
      isMathClean: true,
      isWholeSolutionValid: true,
      items: [
        { sku: 'P73282-B21', quantity: 20, unitPriceUsd: 5584 },
        { sku: 'E5Y35AAE', quantity: 20, unitPriceUsd: 999 } // OneView license
      ]
    };

    const checks = validateBoqEvaluationCriteria(outputWithCom, {});
    const b14 = checks.find(c => c.id === 'B14');
    assert.ok(b14, 'B14 check must be present');
    assert.equal(b14.status, 'PASSED', 'B14 must pass when OneView/COM is present');
  });
});
