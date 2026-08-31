'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const julesTaskManager = require('../../scripts/services/jules_task_manager.js');

test('Jules Task Manager — Exported Contract Verification', () => {
  assert.strictEqual(typeof julesTaskManager.listSessions, 'function', 'listSessions should be exported');
  assert.strictEqual(typeof julesTaskManager.createSession, 'function', 'createSession should be exported');
  assert.strictEqual(typeof julesTaskManager.sendMessageToSession, 'function', 'sendMessageToSession should be exported');
  assert.strictEqual(typeof julesTaskManager.approveSession, 'function', 'approveSession should be exported');
  assert.strictEqual(typeof julesTaskManager.resumeSession, 'function', 'resumeSession should be exported');
  assert.strictEqual(typeof julesTaskManager.autoUnblockSessions, 'function', 'autoUnblockSessions should be exported');
  assert.strictEqual(typeof julesTaskManager.auditSession, 'function', 'auditSession should be exported');
  assert.strictEqual(typeof julesTaskManager.archiveSession, 'function', 'archiveSession should be exported');
  assert.strictEqual(typeof julesTaskManager.listPullRequests, 'function', 'listPullRequests should be exported');
  assert.strictEqual(typeof julesTaskManager.closePullRequest, 'function', 'closePullRequest should be exported');
  assert.strictEqual(typeof julesTaskManager.pruneMergedBranches, 'function', 'pruneMergedBranches should be exported');
});

test('Jules Task Manager — Resolved Headers & Token Contract', () => {
  const headers = julesTaskManager.getResolvedHeaders();
  assert.ok(headers && typeof headers === 'object', 'Headers object should be returned');
  assert.strictEqual(headers['User-Agent'], 'Antigravity-Agent');
});

test('Jules Task Manager — List Sessions and Live Integration Contract', async () => {
  if (!process.env.JULES_API_KEY) {
    console.log('Skipping live Jules API call (JULES_API_KEY not present)');
    return;
  }
  const sessions = await julesTaskManager.listSessions();
  assert.ok(Array.isArray(sessions), 'Sessions should be an array');
  sessions.forEach(s => {
    assert.ok(s.id, 'Session should have an id');
    assert.ok(s.state, 'Session should have a state');
  });
});

test('Jules Task Manager — Auto-Unblock Scan Contract', async () => {
  if (!process.env.JULES_API_KEY) {
    console.log('Skipping live Jules API call (JULES_API_KEY not present)');
    return;
  }
  const unblocked = await julesTaskManager.autoUnblockSessions();
  assert.ok(Array.isArray(unblocked), 'autoUnblockSessions should return an array');
});
