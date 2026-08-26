'use strict';
/**
 * tests/unit/test_notebook_job_and_diagnostics.js
 *
 * Comprehensive unit tests for:
 * 1. scripts/lib/notebook/job_manager.js
 * 2. scripts/lib/notebook/query_diagnostics.js
 * 3. scripts/lib/sync/drift_inspector.js
 * 4. scripts/lib/preprocessor/feedback_persister.js
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { startAsyncNotebookQueryJob, getAsyncNotebookQueryJobStatus } = require('../../scripts/lib/notebook/job_manager.js');
const { postProcessNotebookResult, diagnoseNotebookFailure } = require('../../scripts/lib/notebook/query_diagnostics.js');
const { inspectKnowledgeDrift } = require('../../scripts/lib/sync/drift_inspector.js');
const { savePreprocessingRuleFeedback } = require('../../scripts/lib/preprocessor/feedback_persister.js');

test('Notebook Job Manager, Diagnostics, Drift & Feedback Tests', async (t) => {

  await t.test('1. Query Diagnostics — postProcessNotebookResult', () => {
    // Empty input fallback
    const emptyRes = postProcessNotebookResult('', 'Test Query');
    assert.strictEqual(emptyRes.source, 'LOCAL_RAG_FALLBACK');
    assert.strictEqual(emptyRes.fallbackReason, 'Empty response from NotebookLM');

    // JSON stdout with answer & citations
    const jsonStdout = JSON.stringify({
      answer: 'DL380 Gen12 supports up to 385W TDP.',
      citations: { '1': 'src_123' },
      references: [{ source_id: 'src_123', cited_text: 'QuickSpecs 2026' }],
      sources_used: ['src_123']
    });
    const parsedRes = postProcessNotebookResult(jsonStdout, 'What is the TDP?');
    assert.strictEqual(parsedRes.answer, 'DL380 Gen12 supports up to 385W TDP.');
    assert.strictEqual(parsedRes.citations.length, 1);
    assert.strictEqual(parsedRes.citations[0].sourceId, 'src_123');
    assert.strictEqual(parsedRes.citations[0].title, 'QuickSpecs 2026');

    // Object input directly
    const objRes = postProcessNotebookResult({ answer: 'Direct object answer', citations: [] });
    assert.strictEqual(objRes.answer, 'Direct object answer');
  });

  await t.test('2. Query Diagnostics — diagnoseNotebookFailure root cause classifier', () => {
    const enoentErr = diagnoseNotebookFailure('nb-1', new Error('spawn nlm ENOENT'));
    assert.strictEqual(enoentErr.errorType, 'CLI_NOT_INSTALLED');

    const authErr = diagnoseNotebookFailure('nb-1', new Error('HTTP 401 UNAUTHENTICATED: OAuth expired'));
    assert.strictEqual(authErr.errorType, 'AUTH_EXPIRED');

    const timeoutErr = diagnoseNotebookFailure('nb-1', new Error('Request ETIMEDOUT after 120000ms'));
    assert.strictEqual(timeoutErr.errorType, 'QUERY_TIMEOUT');

    const notFoundErr = diagnoseNotebookFailure('nb-1', new Error('Notebook NOT_FOUND 404'));
    assert.strictEqual(notFoundErr.errorType, 'INVALID_NOTEBOOK_ID');

    const unknownErr = diagnoseNotebookFailure('nb-1', new Error('Unrecognized network glitch'));
    assert.strictEqual(unknownErr.errorType, 'UNKNOWN_FAILURE');
  });

  await t.test('3. Async Notebook Query Job Manager lifecycle', async () => {
    let executionCalled = false;
    const mockExecuteFn = async (notebookId, payload, options) => {
      executionCalled = true;
      return {
        answer: 'Async answer for DL380 Gen12',
        citations: [{ index: '1', sourceId: 'src_abc' }],
        source: 'NOTEBOOK_LM_CLOUD'
      };
    };

    const initialJob = startAsyncNotebookQueryJob('nb-test-123', 'What are the rules for MR416i-p?', { context: { chassis: 'DL380_Gen12_SFF' } }, mockExecuteFn);
    assert.ok(initialJob.jobId.startsWith('JOB_NLM_'));
    assert.strictEqual(initialJob.status, 'PROCESSING');
    assert.strictEqual(initialJob.chassis, 'DL380_Gen12_SFF');

    // Wait for setImmediate execution
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.strictEqual(executionCalled, true);

    const completedStatus = getAsyncNotebookQueryJobStatus(initialJob.jobId);
    assert.strictEqual(completedStatus.status, 'COMPLETED');
    assert.strictEqual(completedStatus.answer, 'Async answer for DL380 Gen12');
    assert.strictEqual(completedStatus.citations.length, 1);

    // Job should be purged after reading completed state
    const purgedStatus = getAsyncNotebookQueryJobStatus(initialJob.jobId);
    assert.strictEqual(purgedStatus, null);
  });

  await t.test('4. Drift Inspector metrics calculation', () => {
    const mockRegistry = {
      totalLearnedRules: 5,
      chassisSpecificRules: [
        { chassis: 'DL380_Gen12_SFF', rule: 'rule1', scopeTaxonomy: 'CHASSIS_SPECIFIC' },
        { chassis: 'DL380_Gen12_SFF', rule: 'rule2', scopeTaxonomy: 'CHASSIS_SPECIFIC' }
      ],
      familyGenRules: [
        { chassis: 'DL380_Gen12_SFF', rule: 'rule3', scopeTaxonomy: 'FAMILY_GEN' }
      ],
      universalRules: []
    };

    const mockCfg = {
      notebooks: {
        'DL380_Gen12_SFF': {
          notebookId: 'nb-gen12-sff',
          lastSyncDeltaCount: 2,
          lastSyncedAt: '2026-08-20T10:00:00.000Z'
        }
      }
    };

    const drift = inspectKnowledgeDrift('DL380_Gen12_SFF', mockRegistry, mockCfg, () => ({ payloadPath: '/path/to/payload.md' }));
    assert.strictEqual(drift.chassisRuleCount, 3);
    assert.strictEqual(drift.lastSyncedRulesCount, 2);
    assert.strictEqual(drift.unSyncedDeltasCount, 1);
    assert.strictEqual(drift.status, 'DRIFT_DETECTED');
    assert.strictEqual(drift.payloadPath, '/path/to/payload.md');

    // Synchronized chassis
    const syncCfg = {
      notebooks: {
        'DL380_Gen12_SFF': {
          notebookId: 'nb-gen12-sff',
          lastSyncDeltaCount: 3,
          lastSyncedAt: '2026-08-22T10:00:00.000Z'
        }
      }
    };
    const syncDrift = inspectKnowledgeDrift('DL380_Gen12_SFF', mockRegistry, syncCfg, () => ({ payloadPath: null }));
    assert.strictEqual(syncDrift.unSyncedDeltasCount, 0);
    assert.strictEqual(syncDrift.status, 'SYNCHRONIZED');
  });

  await t.test('5. Preprocessing Feedback Persister', () => {
    const tempDir = path.join(__dirname, '..', '..', 'outputs', 'temp', 'test_payloads', 'temp_feedback_test');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const feedbackData = {
      configId: 'CFG-001',
      splitReason: 'Customer requested separation of storage expansion chassis',
      notes: 'Verified against PO #998234'
    };

    const record = savePreprocessingRuleFeedback(feedbackData, tempDir);
    assert.ok(record.feedbackId.startsWith('PREPROC-'));
    assert.strictEqual(record.configId, 'CFG-001');
    assert.strictEqual(record.status, 'CONFIRMED');

    const historyFile = path.join(tempDir, 'history', 'preprocessing_rules_history.json');
    assert.strictEqual(fs.existsSync(historyFile), true);
    const history = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
    assert.strictEqual(history.length, 1);
    assert.strictEqual(history[0].configId, 'CFG-001');

    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

});
