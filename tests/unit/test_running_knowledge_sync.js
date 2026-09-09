'use strict';
/**
 * tests/unit/test_running_knowledge_sync.js
 *
 * Unit test suite for the Master Running Knowledge & Learnings Synchronization Service.
 * Validates:
 * 1. Rule composite key normalization (INV-13).
 * 2. Non-destructive deduplication and provenance merging.
 * 3. Markdown rule parsing across chassis profiles.
 * 4. Comprehensive running charter markdown generation.
 * 5. Dry-run synchronization execution.
 */

const test = require('node:test');
const assert = require('node:assert');
const {
  computeRuleCompositeKey,
  deduplicateRules,
  parseRulesFromMarkdown,
  generateRunningKnowledgeCharterMarkdown,
  syncRunningKnowledge
} = require('../../scripts/services/running_knowledge_sync.js');

test('Master Running Knowledge Synchronization Unit Suite', async (t) => {

  await t.test('computeRuleCompositeKey creates normalized deterministic keys (INV-13)', () => {
    const rule1 = {
      scopeTaxonomy: 'CHASSIS_SPECIFIC',
      chassis: 'DL380_Gen12',
      ruleType: 'STORAGE_OVERRIDE',
      affectedSku: '873763-B21',
      requiredDependencySku: null,
      ruleUpdate: 'No Drive FIO kit clears unbuildable chassis block'
    };

    const rule2 = {
      scopeTaxonomy: 'chassis_specific',
      chassis: 'dl380_gen12',
      category: 'storage_override',
      affectedSku: '873763-b21',
      requiredDependencySku: '',
      ruleUpdate: 'No Drive FIO kit clears unbuildable chassis block.'
    };

    const key1 = computeRuleCompositeKey(rule1);
    const key2 = computeRuleCompositeKey(rule2);

    assert.strictEqual(key1, key2, 'Keys with equivalent semantic content must normalize to the exact same composite key');
  });

  await t.test('deduplicateRules preserves all unique rules and merges duplicates without deletion (INV-13)', () => {
    const existingDeltas = [
      {
        deltaId: 'DELTA_1',
        chassis: 'DL380_Gen12',
        affectedSku: '873763-B21',
        ruleType: 'STORAGE_OVERRIDE',
        ruleUpdate: 'Storage override for bare chassis',
        rawMessage: 'Storage override for bare chassis',
        scopeTaxonomy: 'CHASSIS_SPECIFIC',
        timestamp: '2026-09-01T10:00:00.000Z'
      },
      {
        deltaId: 'DELTA_2',
        chassis: 'DL380a_Gen12',
        affectedSku: 'P76706-B21',
        ruleType: 'BASE_CHASSIS',
        ruleUpdate: 'DL380a iLO 7 base chassis mandatory for Xeon 6 P-Cores',
        rawMessage: 'DL380a iLO 7 base chassis mandatory for Xeon 6 P-Cores',
        scopeTaxonomy: 'CHASSIS_SPECIFIC',
        timestamp: '2026-09-01T10:00:00.000Z'
      }
    ];

    const importedRules = [
      // Duplicate of DELTA_1 with richer details
      {
        chassis: 'DL380_Gen12',
        affectedSku: '873763-B21',
        ruleType: 'STORAGE_OVERRIDE',
        ruleUpdate: 'Storage override for bare chassis',
        rawMessage: 'Storage override for bare chassis. Physical logic: blanks front bays to clear unbuildable block.',
        sourceFilename: 'ComputeScale-DL380-Gen12-Bare-Min-Validation-Learnings-v2.md',
        timestamp: '2026-09-08T12:00:00.000Z'
      },
      // New rule from imported guide
      {
        chassis: 'DL380_Gen12',
        affectedSku: 'P35876-B21',
        ruleType: 'POWER_ENVIRONMENT',
        ruleUpdate: 'CE Mark Removal FIO Enablement Kit bypasses ErP Lot 9 for non-EU',
        rawMessage: 'P35876-B21 removes CE mark to bypass Lot 9 Titanium requirements outside Europe',
        sourceFilename: 'ComputeScale-DL380-Gen12-Bare-Min-Validation-Learnings-v2.md',
        timestamp: '2026-09-08T12:00:00.000Z'
      }
    ];

    const deduplicated = deduplicateRules(existingDeltas, importedRules);

    // Total should be 3 unique rules (DELTA_1 merged, DELTA_2 kept, P35876 added)
    assert.strictEqual(deduplicated.length, 3, 'Must contain exactly 3 deduplicated rules');

    // Check that DELTA_1 was merged non-destructively
    const rule873763 = deduplicated.find(r => r.affectedSku === '873763-B21');
    assert.ok(rule873763, '873763-B21 must exist in deduplicated set');
    assert.strictEqual(rule873763.verificationCount, 2, 'Verification count must increment to 2');
    assert.ok(rule873763.provenanceSources.includes('ComputeScale-DL380-Gen12-Bare-Min-Validation-Learnings-v2.md'));
    assert.ok(rule873763.rawMessage.includes('blanks front bays'));

    // Check that DELTA_2 was preserved intact
    const ruleP76706 = deduplicated.find(r => r.affectedSku === 'P76706-B21');
    assert.ok(ruleP76706, 'P76706-B21 must be preserved intact without blind deletion');
    assert.strictEqual(ruleP76706.verificationCount, 1);
  });

  await t.test('parseRulesFromMarkdown identifies validation rules and SKUs from markdown text', () => {
    const sampleMarkdown = `
# HPE ProLiant DL380a Gen12 Rules

1. GPU Mode Flag:
Rule 81016813 mandates that the base chassis requires at least Minimum 1 and Maximum 1 GPU Mode SKU.
The Mode SKU P75002-B21 (HPE DL380a Gen12 4 Double Wide FIO Configuration) must be selected.

2. Front Riser Envelope:
Selecting P75002-B21 strictly mandates selection of P74685-B21 (2DW Captive Riser FIO Kit) at Quantity 2.
    `;

    const extracted = parseRulesFromMarkdown(sampleMarkdown, 'dl380a-guide.md');
    assert.ok(extracted.length >= 2, 'Must extract at least 2 rules');
    assert.strictEqual(extracted[0].chassis, 'DL380a_Gen12');
    assert.ok(extracted.some(r => r.affectedSku === 'P75002-B21'));
    assert.ok(extracted.some(r => r.affectedSku === 'P74685-B21' || r.requiredDependencySku === 'P74685-B21'));
  });

  await t.test('generateRunningKnowledgeCharterMarkdown produces complete, structured charter', () => {
    const rules = [
      {
        scopeTaxonomy: 'UNIVERSAL_VENDOR',
        chassis: 'GLOBAL',
        ruleType: 'OPTION_PLACEMENT',
        affectedSku: '#0D1',
        ruleUpdate: 'CTO components must carry #0D1 FIO tags',
        rawMessage: 'CTO containers mandate FIO options',
        verificationCount: 3
      },
      {
        scopeTaxonomy: 'CHASSIS_SPECIFIC',
        chassis: 'DL380_Gen12',
        ruleType: 'STORAGE_OVERRIDE',
        affectedSku: '873763-B21',
        ruleUpdate: 'No Drive FIO kit overrides bare-chassis block',
        rawMessage: 'Storage override bypass',
        verificationCount: 2
      }
    ];

    const markdown = generateRunningKnowledgeCharterMarkdown(rules);
    assert.ok(markdown.includes('HPE AI Studio — Master Running Knowledge & Learnings Charter'));
    assert.ok(markdown.includes('Table of Contents'));
    assert.ok(markdown.includes('Executive Summary & Architectural Philosophy'));
    assert.ok(markdown.includes('Universal Cross-Platform Hardware Laws & Invariants'));
    assert.ok(markdown.includes('HPE ProLiant Compute DL380 Gen12'));
    assert.ok(markdown.includes('HPE ProLiant Compute DL380a Gen12'));
    assert.ok(markdown.includes('Catalog Vendor Solution Architecture Blueprint'));
    assert.ok(markdown.includes('Deduplicated Learned Rule Ledger'));
    assert.ok(markdown.includes('873763-B21'));
    assert.ok(markdown.includes('#0D1'));
  });

  await t.test('syncRunningKnowledge executes cleanly in dryRun mode', async () => {
    const result = await syncRunningKnowledge({ dryRun: true });
    assert.strictEqual(result.success, true);
    assert.ok(result.totalRules > 50, 'Total rules should exceed baseline deltas');
    assert.ok(result.charterPath);
    assert.ok(result.registryPath);
  });
});
