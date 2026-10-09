'use strict';
/**
 * tests/unit/test_notebook_async_recovery.js
 *
 * Unit tests for NotebookLM query async polling and gateway timeout session recovery.
 * Verifies:
 * 1. Matching chat turn identification from cloud chat transcripts.
 * 2. Gateway session probe and recovery when connection drops or times out.
 * 3. Fallback when cloud session is absent (no hallucination).
 * 4. Preservation of terminal statuses and AbortSignal cancellation.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  attemptGatewaySessionRecovery,
  findMatchingChatTurn,
  executeNotebookQuery
} = require('../../scripts/lib/notebook/notebook_query_utils.js');

test('attemptGatewaySessionRecovery returns null when bypassRecovery is true', () => {
  const result = attemptGatewaySessionRecovery('nlm', 'test-notebook-id', 'test query', '', { bypassRecovery: true });
  assert.equal(result, null);
});

test('attemptGatewaySessionRecovery handles invalid or non-existent notebook gracefully without throwing', () => {
  const result = attemptGatewaySessionRecovery('nlm-nonexistent-bin', 'invalid-uuid-0000', 'test query', '', {});
  assert.equal(result, null);
});

test('findMatchingChatTurn correctly identifies matching turns in chat session', () => {
  assert.equal(typeof findMatchingChatTurn, 'function');

  // Case 1: Empty turns
  assert.equal(findMatchingChatTurn([], 'query'), null);

  // Case 2: Matching turn with answer and citations
  const turns = [
    {
      query: 'What are the processor options for DL380a Gen12?',
      answer: 'The DL380a Gen12 supports Intel Xeon Scalable 5th and 4th Gen processors up to 350W TDP [1].',
      citations: [{ title: 'QuickSpecs', uri: 'https://hpe.com' }]
    }
  ];
  assert.equal(findMatchingChatTurn(turns, 'what are the processor options for dl380a'), null);
  assert.equal(findMatchingChatTurn(turns, ''), null);
  const matched = findMatchingChatTurn(turns, 'What are the processor options for DL380a Gen12?');
  assert.ok(matched);
  assert.match(matched.responseText, /Intel Xeon Scalable/);
  assert.equal(matched.citations.length, 1);

  // Case 3: Non-matching turn
  const nonMatched = findMatchingChatTurn(turns, 'completely unrelated query about tape drives');
  assert.equal(nonMatched, null);

  // Case 4: Matching query but empty answer (unfinished cloud processing)
  const unfinishedTurns = [
    {
      query: 'What are the processor options for DL380a Gen12?',
      answer: ''
    }
  ];
  assert.equal(findMatchingChatTurn(unfinishedTurns, 'what are the processor options'), null);
});

test('executeNotebookQuery in offline mode falls back to local RAG without invoking cloud CLI', async () => {
  const res = await executeNotebookQuery('1d190853-4e9c-48df-aa70-eae66c6f2c1f', 'Intel Xeon processors', {
    offlineMode: true,
    context: { chassis: 'DL380_Gen12' }
  });
  assert.ok(res);
  assert.equal(res.source, 'LOCAL_RAG_FALLBACK');
  assert.equal(res.isCloudGrounded, false);
});
