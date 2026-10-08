'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('node:child_process');
const { acquireWorkflowLease } = require('../../scripts/lib/system/workflow_lease.js');
const moduleFile = require.resolve('../../scripts/lib/system/workflow_lease.js');

function withRoot(work) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cp6r-case-'));
  const cleanup = () => {
    const relative = path.relative(fs.realpathSync(os.tmpdir()), fs.realpathSync(root));
    assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
    fs.rmSync(root, { recursive: true, force: true });
  };
  let result;
  try { result = work(root); }
  catch (error) { cleanup(); throw error; }
  if (result && typeof result.then === 'function') return result.finally(cleanup);
  cleanup();
}

function fault(method, predicate, code, times, work) {
  const original = fs[method];
  let count = 0;
  const injected = Object.assign(new Error(`injected ${method} ${code}`), { code });
  fs[method] = (...args) => {
    if (predicate(...args) && count < times) { count += 1; throw injected; }
    return original(...args);
  };
  try { work(injected, () => count); }
  finally { fs[method] = original; }
  return count;
}

function oldClaim(root, contents = '999999\n100\n') {
  assert.throws(() => process.kill(999999, 0), { code: 'ESRCH' });
  const file = path.join(root, 'job.lock.claim');
  fs.writeFileSync(file, contents);
  const old = new Date(Date.now() - 20000);
  fs.utimesSync(file, old, old);
  return file;
}

for (const code of ['EBUSY', 'EPERM', 'EACCES']) {
  test(`real ${code} claim-open fault is WORKFLOW_BUSY with original cause`, () => withRoot(root => {
    const count = fault('openSync', file => file.endsWith('.claim'), code, 1, injected => {
      assert.throws(() => acquireWorkflowLease('job', root), error => error.message.startsWith('WORKFLOW_BUSY') && /lease|active|running|owned/i.test(error.message) && error.cause === injected);
    });
    assert.equal(count, 1);
    assert.deepEqual(fs.readdirSync(root), []);
  }));
}

test('claim write failure preserves primary error and closes/removes partially initialized claim', () => withRoot(root => {
  fault('writeFileSync', file => typeof file === 'number', 'ENOSPC', 1, injected => {
    assert.throws(() => acquireWorkflowLease('job', root), error => error === injected);
  });
  assert.deepEqual(fs.readdirSync(root), []);
  acquireWorkflowLease('job', root)();
}));

test('lease write failure removes both claim and incomplete lock', () => withRoot(root => {
  let writes = 0;
  fault('writeFileSync', file => typeof file === 'number' && ++writes === 2, 'ENOSPC', 1, injected => {
    assert.throws(() => acquireWorkflowLease('job', root), error => error === injected);
  });
  assert.deepEqual(fs.readdirSync(root), []);
  acquireWorkflowLease('job', root)();
}));

test('fstat initialization failure retains original error and recovers identity for cleanup', () => withRoot(root => {
  fault('fstatSync', () => true, 'EIO', 1, injected => {
    assert.throws(() => acquireWorkflowLease('job', root), error => error === injected);
  });
  assert.deepEqual(fs.readdirSync(root), []);
}));

test('reclamation guard write failure removes incomplete guard and retains stale claim', () => withRoot(root => {
  const file = oldClaim(root);
  fault('writeFileSync', target => typeof target === 'number', 'ENOSPC', 1, primary => {
    assert.throws(() => acquireWorkflowLease('job', root), error => error === primary);
  });
  assert.ok(!fs.existsSync(`${file}.reclaim`));
  assert.equal(fs.readFileSync(file, 'utf8'), '999999\n100\n');
  acquireWorkflowLease('job', root)();
}));

test('reclamation guard cleanup failure is visible and no lock is returned', () => withRoot(root => {
  const file = oldClaim(root);
  const count = fault('unlinkSync', target => target.endsWith('.reclaim'), 'EBUSY', Infinity, () => {
    assert.throws(() => acquireWorkflowLease('job', root), error => error.code === 'WORKFLOW_CLEANUP_FAILED');
    assert.ok(!fs.existsSync(path.join(root, 'job.lock')));
  });
  assert.equal(count, 3);
  assert.ok(fs.existsSync(`${file}.reclaim`));
  // The guard must be checked even when its stale claim was already removed.
  assert.throws(() => acquireWorkflowLease('job', root), /WORKFLOW_BUSY/);
}));

test('guard replacement between reclaim cleanup and claimant reopen cannot bypass recovery state', () => withRoot(root => {
  const file = oldClaim(root);
  const guard = `${file}.reclaim`;
  const unlink = fs.unlinkSync;
  let replaced = false;
  fs.unlinkSync = target => {
    const result = unlink(target);
    if (target === guard && !replaced) { replaced = true; fs.writeFileSync(guard, 'successor-guard'); }
    return result;
  };
  try {
    assert.throws(() => acquireWorkflowLease('job', root), /WORKFLOW_BUSY.*WORKFLOW_RECOVERY_REQUIRED/);
  } finally { fs.unlinkSync = unlink; }
  assert.equal(fs.readFileSync(guard, 'utf8'), 'successor-guard');
  assert.ok(!fs.existsSync(path.join(root, 'job.lock')));
  assert.ok(!fs.existsSync(file));
}));

test('permanent claim close failure is visible, rolled back and bounded', () => withRoot(root => {
  let firstFd;
  const open = fs.openSync;
  fs.openSync = (...args) => { const fd = open(...args); if (String(args[0]).endsWith('.claim')) firstFd = fd; return fd; };
  try {
    const count = fault('closeSync', fd => fd === firstFd, 'EIO', Infinity, injected => {
      assert.throws(() => acquireWorkflowLease('job', root), error => error.code === 'WORKFLOW_CLEANUP_FAILED' && error.errors.includes(injected));
    });
    assert.equal(count, 3);
    assert.ok(!fs.existsSync(path.join(root, 'job.lock')));
  } finally {
    fs.openSync = open;
    if (firstFd !== undefined) { try { fs.closeSync(firstFd); } catch (error) { assert.equal(error.code, 'EBADF'); } }
  }
}));

for (const method of ['closeSync', 'unlinkSync']) {
  test(`transient ${method} claim cleanup uses bounded retries and remains restartable`, () => withRoot(root => {
    const count = fault(method, file => method === 'closeSync' || file.endsWith('.claim'), 'EBUSY', 2, () => {
      acquireWorkflowLease('job', root)();
    });
    assert.equal(count, 2);
    assert.deepEqual(fs.readdirSync(root), []);
    acquireWorkflowLease('job', root)();
  }));
}

test('permanent claim unlink failure rejects acquisition and rolls back lock', () => withRoot(root => {
  const count = fault('unlinkSync', file => file.endsWith('.claim'), 'EACCES', Infinity, injected => {
    assert.throws(() => acquireWorkflowLease('job', root), error => error.code === 'WORKFLOW_CLEANUP_FAILED' && error.errors.includes(injected));
    assert.ok(!fs.existsSync(path.join(root, 'job.lock')));
  });
  assert.equal(count, 3);
  assert.ok(fs.existsSync(path.join(root, 'job.lock.claim')));
  // Live residual owner is retained, never stolen just because a retry occurs.
  assert.throws(() => acquireWorkflowLease('job', root), /WORKFLOW_BUSY/);
  fs.unlinkSync(path.join(root, 'job.lock.claim'));
  acquireWorkflowLease('job', root)();
}));

test('primary initialization failure is retained alongside bounded cleanup failures', () => withRoot(root => {
  fault('unlinkSync', file => file.endsWith('.claim'), 'EACCES', Infinity, cleanupFailure => {
    fault('writeFileSync', file => typeof file === 'number', 'ENOSPC', 1, primary => {
      assert.throws(() => acquireWorkflowLease('job', root), error => error === primary && error.cleanupErrors.includes(cleanupFailure));
    });
  });
  assert.ok(!fs.existsSync(path.join(root, 'job.lock')));
}));

for (const content of ['', 'not-a-pid\n100\n', '0\n100\n', '999999\nnot-a-time\n', `${process.pid}\n100\n`]) {
  test(`ambiguous/live old claim retained: ${JSON.stringify(content)}`, () => withRoot(root => {
    const file = oldClaim(root, content);
    assert.throws(() => acquireWorkflowLease('job', root), /WORKFLOW_BUSY/);
    assert.equal(fs.readFileSync(file, 'utf8'), content);
    assert.ok(!fs.existsSync(`${file}.reclaim`));
  }));
}

test('ambiguous claim read error does not become dead-owner evidence', () => withRoot(root => {
  const file = oldClaim(root);
  fault('readFileSync', target => target === file, 'EACCES', 1, () => {
    assert.throws(() => acquireWorkflowLease('job', root), /WORKFLOW_BUSY/);
  });
  assert.equal(fs.readFileSync(file, 'utf8'), '999999\n100\n');
}));

test('orphan/malformed reclaimer marker fails closed without age-only theft', () => withRoot(root => {
  const file = oldClaim(root);
  fs.writeFileSync(`${file}.reclaim`, '');
  const old = new Date(Date.now() - 20000);
  fs.utimesSync(`${file}.reclaim`, old, old);
  assert.throws(() => acquireWorkflowLease('job', root), /WORKFLOW_BUSY/);
  assert.equal(fs.readFileSync(`${file}.reclaim`, 'utf8'), '');
  assert.equal(fs.readFileSync(file, 'utf8'), '999999\n100\n');
}));

test('former owner never removes replacement lock and release is idempotent', () => withRoot(root => {
  const release = acquireWorkflowLease('job', root);
  const file = path.join(root, 'job.lock');
  const successor = `${process.pid}\nreplacement\nnew-token\n`;
  fs.writeFileSync(file, successor);
  release();
  release();
  assert.equal(fs.readFileSync(file, 'utf8'), successor);
}));

test('explicit release cleanup failure is visible and can be retried', () => withRoot(root => {
  const release = acquireWorkflowLease('job', root);
  fault('unlinkSync', file => file.endsWith('.lock'), 'EBUSY', Infinity, () => {
    assert.throws(release, error => error.code === 'WORKFLOW_CLEANUP_FAILED');
  });
  release();
  assert.deepEqual(fs.readdirSync(root), []);
}));

function worker(root, mode) {
  const source = `
    const fs = require('fs');
    const { acquireWorkflowLease } = require(process.argv[1]);
    const root = process.argv[2], mode = process.argv[3];
    if (mode === 'paused') {
      const read = fs.readFileSync;
      fs.readFileSync = (...args) => {
        const result = read(...args);
        if (String(args[0]).endsWith('.lock.claim')) {
          process.send({ event: 'guard-held' });
          const signal = require('path').join(root, 'continue');
          const deadline = Date.now() + 10000;
          while (!fs.existsSync(signal)) {
            if (Date.now() > deadline) throw Error('coordination timeout');
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5);
          }
        }
        return result;
      };
    }
    let release;
    process.on('message', message => {
      if (message === 'start') {
        try { release = acquireWorkflowLease('job', root); process.send({ event: 'acquired' }); }
        catch(error) { process.send({ event: 'busy', message: error.message }); }
      }
      if (message === 'release') { if (release) release(); process.exit(0); }
    });
    process.send({ event: 'ready' });
  `;
  const child = spawn(process.execPath, ['-e', source, moduleFile, root, mode], { stdio: ['ignore', 'pipe', 'pipe', 'ipc'], windowsHide: true });
  const events = [];
  child.on('message', value => events.push(value));
  child.waitFor = event => new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      const found = events.find(value => value.event === event);
      if (found) { clearInterval(timer); clearTimeout(deadline); resolve(found); }
    }, 5);
    const deadline = setTimeout(() => { clearInterval(timer); reject(new Error(`worker ${event} timeout ${JSON.stringify(events)}`)); }, 10000);
  });
  return child;
}

test('coordinated stale reclaimers serialize and cannot delete successor ownership', { timeout: 20000 }, () => withRoot(async root => {
  oldClaim(root);
  const first = worker(root, 'paused');
  const second = worker(root, 'normal');
  try {
    await Promise.all([first.waitFor('ready'), second.waitFor('ready')]);
    first.send('start');
    await first.waitFor('guard-held');
    second.send('start');
    const blocked = await second.waitFor('busy');
    assert.match(blocked.message, /WORKFLOW_BUSY/);
    fs.writeFileSync(path.join(root, 'continue'), 'go');
    await first.waitFor('acquired');
    const token = fs.readFileSync(path.join(root, 'job.lock'), 'utf8');
    assert.equal(Number(token.split('\n')[0]), first.pid);
    assert.ok(!fs.existsSync(path.join(root, 'job.lock.claim.reclaim')));
    assert.equal(fs.readFileSync(path.join(root, 'job.lock'), 'utf8'), token);
  } finally {
    for (const child of [first, second]) {
      if (child.connected) child.send('release');
      await new Promise(resolve => { if (child.exitCode !== null) resolve(); else child.once('exit', resolve); });
    }
  }
  assert.ok(!fs.existsSync(path.join(root, 'job.lock')));
}));

test('crashed claim owner is recovered on restart only with provably dead PID', { timeout: 15000 }, () => withRoot(async root => {
  const child = spawn(process.execPath, ['-e', `const fs=require('fs');fs.writeFileSync(process.argv[1],process.pid+'\\n'+Date.now()+'\\n');`, path.join(root, 'job.lock.claim')], { windowsHide: true });
  await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', code => code === 0 ? resolve() : reject(new Error('child failed'))); });
  const file = path.join(root, 'job.lock.claim');
  const old = new Date(Date.now() - 20000);
  fs.utimesSync(file, old, old);
  acquireWorkflowLease('job', root)();
  assert.deepEqual(fs.readdirSync(root), []);
}));
