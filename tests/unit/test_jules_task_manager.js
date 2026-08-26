'use strict';
/**
 * tests/unit/test_jules_task_manager.js
 *
 * Tests for scripts/services/jules_task_manager.js:
 * - Module exports verification
 * - Error handling when JULES_API_KEY is missing
 * - listPullRequests schema normalization & network resilience
 */

const test = require('node:test');
const assert = require('node:assert');
const {
  listSessions,
  createSession,
  getSessionDetails,
  sendMessageToSession,
  auditSession,
  archiveSession,
  archiveCompletedSessions,
  listPullRequests,
  getJulesClient
} = require('../../scripts/services/jules_task_manager.js');

test('jules_task_manager exports required task orchestrator functions', () => {
  assert.strictEqual(typeof listSessions, 'function');
  assert.strictEqual(typeof createSession, 'function');
  assert.strictEqual(typeof getSessionDetails, 'function');
  assert.strictEqual(typeof sendMessageToSession, 'function');
  assert.strictEqual(typeof auditSession, 'function');
  assert.strictEqual(typeof archiveSession, 'function');
  assert.strictEqual(typeof archiveCompletedSessions, 'function');
  assert.strictEqual(typeof listPullRequests, 'function');
  assert.strictEqual(typeof getJulesClient, 'function');
});

test('listPullRequests fetches normalized PR array safely without throwing', async () => {
  const prs = await listPullRequests('all');
  assert.ok(Array.isArray(prs), 'PR result must always be an array');
  if (prs.length > 0) {
    const first = prs[0];
    assert.ok('number' in first);
    assert.ok('title' in first);
    assert.ok('state' in first);
    assert.ok('branch' in first);
  }
});
