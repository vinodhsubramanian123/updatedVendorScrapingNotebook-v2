'use strict';
const { describe, it, before, after } = require('node:test');
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { validateKnowledgeDelta, setQuarantineFilePath } = require('../../scripts/lib/feedback/quarantined_deltas.js');
const { calculateConfidenceScore } = require('../../scripts/lib/feedback/feedback_loop.js');

const TEMP_DIR = path.join(__dirname, '..', '..', 'temp', `test_guardrail_${Date.now()}`);

describe('Continuous Learning & Guardrail Autonomy (Phase F Fixes)', () => {
  before(() => {
    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
    setQuarantineFilePath(path.join(TEMP_DIR, 'quarantined_deltas.json'));
  });

  after(() => {
    if (fs.existsSync(TEMP_DIR)) fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  });

  it('F-1: Agentic Guardrail rule bypasses quarantine when provided with NotebookLM citations', () => {
    const delta = {
      affectedSku: 'P12345-B21',
      requiredDependencySku: 'P98765-B21',
      ruleUpdate: 'NotebookLM confirmed dependency',
      sourceAgent: 'AGENTIC_GUARDRAIL',
      source: 'AGENTIC_GUARDRAIL',
      citations: ['NotebookLM: HPE ProLiant DL380 Gen11 QuickSpecs, page 23'],
      preConfidenceScore: 0.70,
      confidenceScore: 0.95,
      scopeTaxonomy: 'CHASSIS_SPECIFIC'
    };

    const result = validateKnowledgeDelta(delta, { catalogData: { parsedRules: [] } });
    
    // Without the F-1 fix, this would be QUARANTINED because !isHuman
    assert.strictEqual(result.valid, true, 'Delta should be valid');
    assert.strictEqual(result.status, 'PROMOTED', 'Delta with automated source + citations must be PROMOTED directly');
  });

  it('F-1: Agentic Guardrail rule is quarantined if NO citations are provided', () => {
    const delta = {
      affectedSku: 'P12345-B21',
      requiredDependencySku: 'P98765-B21',
      ruleUpdate: 'I think this requires that',
      sourceAgent: 'AGENTIC_GUARDRAIL',
      source: 'AGENTIC_GUARDRAIL',
      citations: [], // Missing citations
      preConfidenceScore: 0.70,
      confidenceScore: 0.70,
      scopeTaxonomy: 'CHASSIS_SPECIFIC'
    };

    const result = validateKnowledgeDelta(delta, { catalogData: { parsedRules: [] } });
    
    assert.strictEqual(result.valid, true, 'Delta should be valid (not rejected)');
    assert.strictEqual(result.status, 'QUARANTINED', 'Delta without citations MUST be quarantined');
  });

  it('F-3: BOQ Evaluator Confidence is penalized for relevant pending quarantined rules', () => {
    // 1. Manually write a quarantined delta for P11111-B21
    const qFile = path.join(TEMP_DIR, 'quarantined_deltas.json');
    fs.writeFileSync(qFile, JSON.stringify([{
      quarantineId: 'Q-123',
      affectedSku: 'P11111-B21',
      requiredDependencySku: 'P22222-B21',
      status: 'IN_QUARANTINE'
    }]));

    // 2. BOQ contains P11111-B21
    const boqItems = [{ sku: 'P11111-B21', qty: 1 }];
    const evalResults = { errors: [], warnings: [], rulesUnevaluated: 0 };
    
    const confidence = calculateConfidenceScore(boqItems, evalResults);
    
    // Base 1.0, penalty 0.30 for relevant quarantined rule -> 0.70
    assert.strictEqual(confidence.score, 0.70, 'Confidence should be 0.70 due to quarantine penalty');
    assert.strictEqual(confidence.isHitlTriggered, true, 'HITL should be triggered');
    assert.ok(confidence.deductions.some(d => d.includes('Pending quarantined rules target SKUs in this BOQ')), 'Should include specific deduction string');
  });

  it('F-3: BOQ Evaluator Confidence is NOT penalized if quarantined rules are irrelevant', () => {
    // 1. Manually write a quarantined delta for P11111-B21
    const qFile = path.join(TEMP_DIR, 'quarantined_deltas.json');
    fs.writeFileSync(qFile, JSON.stringify([{
      quarantineId: 'Q-123',
      affectedSku: 'P11111-B21',
      requiredDependencySku: 'P22222-B21',
      status: 'IN_QUARANTINE'
    }]));

    // 2. BOQ does NOT contain P11111-B21 or P22222-B21
    const boqItems = [{ sku: 'P99999-B21', qty: 1 }];
    const evalResults = { errors: [], warnings: [], rulesUnevaluated: 0 };
    
    const confidence = calculateConfidenceScore(boqItems, evalResults);
    
    // Base 1.0, no penalty
    assert.strictEqual(confidence.score, 1.0, 'Confidence should be 1.0');
    assert.strictEqual(confidence.isHitlTriggered, false, 'HITL should not be triggered');
  });
});
