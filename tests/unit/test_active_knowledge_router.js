'use strict';
/**
 * tests/unit/test_active_knowledge_router.js — Unit test suite for Active Knowledge Router
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { loadActiveKnowledgeRules } = require('../../scripts/lib/catalog/active_knowledge_router.js');

describe('Active Knowledge Router & Reachability Suite', () => {
  test('1. Loads and categorizes active rules for DL380 Gen11', () => {
    const rules = loadActiveKnowledgeRules('DL380_Gen11');
    assert.ok(Array.isArray(rules.allRules), 'Expected allRules array');
    assert.ok(Array.isArray(rules.mandatoryDependencies), 'Expected mandatoryDependencies array');
    assert.ok(Array.isArray(rules.substitutions), 'Expected substitutions array');
    assert.ok(Array.isArray(rules.generationalModernizations), 'Expected generationalModernizations array');
    assert.ok(rules.skuLookupMap instanceof Map, 'Expected skuLookupMap to be a Map');
  });

  test('2. Enforces Generation Isolation Firewall (Gen11 target ignores Gen12-only rules)', () => {
    const rulesGen11 = loadActiveKnowledgeRules('DL380_Gen11');
    // None of the rules loaded for Gen11 should have a Gen12 chassis unless UNIVERSAL
    const leakedGen12 = rulesGen11.allRules.find(r => {
      const c = String(r.chassis || '').toLowerCase();
      return (c.includes('gen12') || c.includes('g12')) && r.scopeTaxonomy !== 'UNIVERSAL_VENDOR' && r.scopeTaxonomy !== 'UNIVERSAL';
    });
    assert.strictEqual(leakedGen12, undefined, 'Gen12-only rules must not leak into Gen11 target');
  });

  test('3. Correctly indexes rules by affected SKU', () => {
    const rules = loadActiveKnowledgeRules('DL380_Gen11');
    if (rules.allRules.length > 0) {
      const firstRule = rules.allRules.find(r => r.affectedSku);
      if (firstRule) {
        const indexed = rules.skuLookupMap.get(firstRule.affectedSku);
        assert.ok(Array.isArray(indexed), 'Expected array for affected SKU in map');
        assert.ok(indexed.some(r => r.ruleId === firstRule.ruleId));
      }
    }
  });
});
