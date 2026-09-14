'use strict';
/**
 * tests/chaos/test_agentic_learning_and_evidence_trace.js — Adversarial Stress & Verification Suite
 *
 * Validates:
 * 1. Shared state continuity across all 9 execution phases via EvidenceLedger.
 * 2. Complete evidence log generation (JSON and Markdown summary).
 * 3. Active Knowledge Router categorization and Generation Firewall isolation.
 * 4. Closed-loop continuous learning: injecting a lesson and certifying that it is actively
 *    reachable in downstream conflict and strategy evaluation.
 */

const { describe, test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { createEvidenceLedger } = require('../../scripts/lib/system/evidence_ledger.js');
const { loadActiveKnowledgeRules } = require('../../scripts/lib/catalog/active_knowledge_router.js');
const { verifyKnowledgeRuleReachability, recordAndCertifyLearnedRule } = require('../../scripts/lib/feedback/continuous_learning_verifier.js');

describe('Agentic Learning, Evidence Trace & Reachability Chaos Suite', () => {
  const tempTestDir = path.join(__dirname, '..', '..', 'outputs', 'temp', `test_chaos_learning_${Date.now()}`);

  after(() => {
    if (fs.existsSync(tempTestDir)) {
      fs.rmSync(tempTestDir, { recursive: true, force: true });
    }
  });

  test('1. Shared state and phase transitions maintain unbroken continuity across all 9 phases', () => {
    const ledger = createEvidenceLedger({
      chassis: 'DL380_Gen11',
      serverCount: 8,
      formFactor: '12LFF'
    });

    for (let i = 1; i <= 9; i++) {
      ledger.startPhase(i, `Phase ${i} Execution`, { step: i });
      ledger.completePhase(i, 'PASSED', { result: `Phase ${i} complete` }, [{ check: 'Invariant hold', passed: true }]);
    }

    assert.strictEqual(Object.keys(ledger.phases).length, 9, 'All 9 phases must be recorded');
    Object.values(ledger.phases).forEach(p => {
      assert.strictEqual(p.status, 'PASSED');
      assert.ok(p.durationMs >= 0);
      assert.ok(p.completedAt);
    });
  });

  test('2. EvidenceLedger accurately exports machine-readable JSON and Markdown summary', () => {
    const ledger = createEvidenceLedger({ chassis: 'DL380_Gen11' });
    ledger.startPhase(1, 'Phase 1', {});
    ledger.completePhase(1, 'PASSED', {});
    ledger.recordSkuAudit('P49619-B21', 'RETAINED_BASELINE', 'Customer intent preserved', 'RULE_INTENT', 'Processor');
    ledger.recordActiveRuleReached({
      ruleId: 'DELTA_TEST_REACH',
      ruleType: 'GENERATIONAL_MODERNIZATION',
      affectedSku: 'P49619-B21',
      requiredDependencySku: 'P67082-B21',
      reasoning: 'Emerald Rapids 5th Gen upgrade'
    });

    const { jsonPath, mdPath, payload } = ledger.finalizeAndExport(tempTestDir);

    assert.ok(fs.existsSync(jsonPath), 'JSON log file must exist');
    assert.ok(fs.existsSync(mdPath), 'Markdown summary file must exist');
    assert.strictEqual(payload.activeRulesReached.length, 1);
    assert.strictEqual(payload.skuAuditLedger.length, 1);

    const jsonContent = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    assert.strictEqual(jsonContent.activeRulesReached[0].ruleId, 'DELTA_TEST_REACH');

    const mdContent = fs.readFileSync(mdPath, 'utf-8');
    assert.ok(mdContent.includes('DELTA_TEST_REACH'));
    assert.ok(mdContent.includes('P49619-B21'));
  });

  test('3. ActiveKnowledgeRouter guarantees Generation Firewall isolation across multi-generational queries', () => {
    const gen11Rules = loadActiveKnowledgeRules('DL380_Gen11');
    const gen12Rules = loadActiveKnowledgeRules('DL380_Gen12');

    assert.ok(gen11Rules.allRules.length > 0, 'Gen11 rules must be loaded');
    assert.ok(gen12Rules.allRules.length > 0, 'Gen12 rules must be loaded');

    // Gen11 rules must not include Gen12-specific rules unless UNIVERSAL
    const gen11Leaked = gen11Rules.allRules.filter(r => {
      const c = String(r.chassis || '').toLowerCase();
      return (c.includes('gen12') || c.includes('g12')) && r.scopeTaxonomy !== 'UNIVERSAL_VENDOR' && r.scopeTaxonomy !== 'UNIVERSAL';
    });
    assert.strictEqual(gen11Leaked.length, 0, 'Gen12 rules must not leak into Gen11 scope');

    // Gen12 rules must not include Gen11-specific rules unless UNIVERSAL
    const gen12Leaked = gen12Rules.allRules.filter(r => {
      const c = String(r.chassis || '').toLowerCase();
      return (c.includes('gen11') || c.includes('g11')) && r.scopeTaxonomy !== 'UNIVERSAL_VENDOR' && r.scopeTaxonomy !== 'UNIVERSAL';
    });
    assert.strictEqual(gen12Leaked.length, 0, 'Gen11 rules must not leak into Gen12 scope');
  });

  test('4. Closed-loop learning verifier successfully certifies newly recorded rules as reachable', () => {
    const mockChassisDir = path.join(tempTestDir, 'DL380_Gen11_Test');
    fs.mkdirSync(mockChassisDir, { recursive: true });

    const newDelta = {
      deltaId: 'DELTA_CHAOS_TEST_001',
      affectedSku: 'P49619-B21',
      requiredDependencySku: 'P67082-B21',
      ruleType: 'GENERATIONAL_MODERNIZATION',
      scopeTaxonomy: 'CHASSIS_SPECIFIC',
      reasoning: 'Test generational modernization rule for 5th Gen Emerald Rapids'
    };

    const testBom = [
      { sku: 'P52533-B21', quantity: 1, description: 'HPE ProLiant DL380 Gen11 12LFF Server' },
      { sku: 'P49619-B21', quantity: 1, description: 'Intel Xeon-Gold 6414U Processor' }
    ];

    const result = recordAndCertifyLearnedRule(newDelta, mockChassisDir, testBom);

    assert.strictEqual(result.persisted, true, 'Delta must be persisted');
    assert.ok(result.certification, 'Certification result must be returned');
    assert.strictEqual(result.certification.reachable, true, 'Rule must be actively reachable');
    assert.strictEqual(result.certification.ruleId, 'DELTA_CHAOS_TEST_001');
    assert.strictEqual(result.certification.targetSku, 'P67082-B21');
  });
});
