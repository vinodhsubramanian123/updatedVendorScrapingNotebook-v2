'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { acquireWorkflowLease } = require('../../scripts/lib/system/workflow_lease.js');

function removeTestRoot(testRoot) {
  const relative = path.relative(fs.realpathSync(os.tmpdir()), fs.realpathSync(testRoot));
  assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
  fs.rmSync(testRoot, { recursive: true, force: true });
}

test('workflow_lease: basic acquire, double-acquire contention, and release', () => {
  const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-lease-test-'));
  try {
    const release1 = acquireWorkflowLease('test-job', testRoot);
    assert.strictEqual(typeof release1, 'function');
    assert.ok(fs.existsSync(path.join(testRoot, 'test-job.lock')));

    // Contention from current active process
    assert.throws(
      () => acquireWorkflowLease('test-job', testRoot),
      /WORKFLOW_BUSY: test-job/
    );

    release1();
    assert.ok(!fs.existsSync(path.join(testRoot, 'test-job.lock')));

    // After release, should acquire cleanly again
    const release2 = acquireWorkflowLease('test-job', testRoot);
    assert.strictEqual(typeof release2, 'function');
    release2();
  } finally {
    removeTestRoot(testRoot);
  }
});

test('workflow_lease: invalid lease name validation', () => {
  assert.throws(() => acquireWorkflowLease('invalid name with spaces'), /Invalid workflow lease name/);
  assert.throws(() => acquireWorkflowLease('name/with/slashes'), /Invalid workflow lease name/);
  assert.throws(() => acquireWorkflowLease('name$special'), /Invalid workflow lease name/);
});

test('workflow_lease (CP6r-L1): existing recent claim is WORKFLOW_BUSY', () => {
  const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-lease-test-'));
  try {
    // Manually create an active claim file
    const claimFile = path.join(testRoot, 'test-ebusy.lock.claim');
    fs.writeFileSync(claimFile, `${process.pid}\n${Date.now()}\n`);

    // Should throw WORKFLOW_BUSY when claim exists and is recent
    assert.throws(
      () => acquireWorkflowLease('test-ebusy', testRoot),
      /WORKFLOW_BUSY: test-ebusy; acquisition transaction at/
    );
  } finally {
    removeTestRoot(testRoot);
  }
});

test('workflow_lease (CP6r-L2): stale claim file from dead PID is broken and recovered', () => {
  const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-lease-test-'));
  try {
    const claimFile = path.join(testRoot, 'test-stale-claim.lock.claim');
    // Stale claim: dead PID 999999 and mtime 20 seconds ago
    const deadPid = 999999;
    assert.throws(() => process.kill(deadPid, 0), { code: 'ESRCH' });
    fs.writeFileSync(claimFile, `${deadPid}\n${Date.now() - 20000}\n`);
    const staleTime = new Date(Date.now() - 20000);
    fs.utimesSync(claimFile, staleTime, staleTime);

    // acquireWorkflowLease should detect stale claim, unlink it, and acquire successfully
    const release = acquireWorkflowLease('test-stale-claim', testRoot);
    assert.strictEqual(typeof release, 'function');
    assert.ok(fs.existsSync(path.join(testRoot, 'test-stale-claim.lock')));
    release();
    assert.ok(!fs.existsSync(path.join(testRoot, 'test-stale-claim.lock')));
  } finally {
    removeTestRoot(testRoot);
  }
});

test('workflow_lease: orphaned lock file from dead PID is reclaimed', () => {
  const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-lease-test-'));
  try {
    const lockFile = path.join(testRoot, 'test-orphaned.lock');
    const deadPid = 999999;
    assert.throws(() => process.kill(deadPid, 0), { code: 'ESRCH' });
    fs.writeFileSync(lockFile, `${deadPid}\n${new Date().toISOString()}\norphaned-uuid\n`);

    // Dead PID lock should be reclaimed
    const release = acquireWorkflowLease('test-orphaned', testRoot);
    assert.strictEqual(typeof release, 'function');
    release();
  } finally {
    removeTestRoot(testRoot);
  }
});
