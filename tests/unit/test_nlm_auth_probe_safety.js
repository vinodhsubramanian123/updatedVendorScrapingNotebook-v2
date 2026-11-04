'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { EventEmitter } = require('events');

function loadMaintenance(name, overrides) {
  const filename = path.resolve(__dirname, '../../scripts/maintenance', name);
  const sandbox = {
    require: (id) => Object.hasOwn(overrides, id) ? overrides[id] : require(id),
    module: { exports: {} }, __dirname: path.dirname(filename),
    process, console, setTimeout
  };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), sandbox, { filename });
  return sandbox.module.exports;
}

test('health check is read-only and checks the same default profile used by healing', () => {
  const calls = [];
  const api = loadMaintenance('check_nlm_auth.js', {
    fs: { existsSync: () => false, unlinkSync: () => assert.fail('Must not remove locks') },
    child_process: { execFileSync: (file, args) => {
      calls.push({ file, args: Array.from(args) });
      assert.equal(file, 'nlm', 'Must not invoke process cleanup');
      return 'Authentication valid\nAccount: example@example.com';
    } }
  });
  assert.equal(api.checkAuthHealth().valid, true);
  assert.deepEqual(calls, [{ file: 'nlm', args: ['login', '--profile', 'default', '--check'] }]);
});

test('invalid successful CLI output still triggers requested healing with adequate timeout', () => {
  let calls = 0;
  const api = loadMaintenance('check_nlm_auth.js', {
    fs: { existsSync: () => false },
    child_process: { execFileSync: (file, args, options) => {
      calls++;
      if (calls === 1) return 'Authentication expired';
      assert.equal(file, process.execPath);
      assert.ok(options.timeout >= 115000);
      return JSON.stringify({ ok: true, valid: true });
    } }
  });
  assert.equal(api.checkAuthHealth({ autoHeal: true }).status, 'HEALED');
  assert.equal(calls, 2);
});

test('asynchronous browser spawn errors return a failure without deleting profile locks', async () => {
  const api = loadMaintenance('nlm_interactive_auth.js', {
    fs: { existsSync: () => true, unlinkSync: () => assert.fail('Must preserve locks') },
    http: { get: () => {
      const req = new EventEmitter();
      req.setTimeout = () => {};
      process.nextTick(() => req.emit('error', new Error('ECONNREFUSED')));
      return req;
    } },
    child_process: { spawn: () => {
      const child = new EventEmitter();
      child.unref = () => {};
      process.nextTick(() => child.emit('error', new Error('spawn ENOENT')));
      return child;
    } }
  });
  const result = await api.ensureNlmChromeRunning({ timeoutMs: 2000 });
  assert.equal(result.ok, false);
  assert.match(result.error, /ENOENT/);
});

test('custom profile option is respected during check and heal', () => {
  const calls = [];
  const api = loadMaintenance('check_nlm_auth.js', {
    fs: { existsSync: () => false },
    child_process: { execFileSync: (file, args) => {
      calls.push({ file, args: Array.from(args) });
      if (calls.length === 1) return 'Authentication expired';
      return JSON.stringify({ ok: true, valid: true, account: 'custom@example.com' });
    } }
  });
  const res = api.checkAuthHealth({ profile: 'work', autoHeal: true });
  assert.equal(res.status, 'HEALED');
  assert.deepEqual(calls[0].args, ['login', '--profile', 'work', '--check']);
  assert.ok(calls[1].args.includes('--profile') && calls[1].args.includes('work'));
});

test('invalid check without autoHeal returns remediationCommand', () => {
  const api = loadMaintenance('check_nlm_auth.js', {
    fs: { existsSync: () => false },
    child_process: { execFileSync: () => 'Authentication expired' }
  });
  const res = api.checkAuthHealth({ autoHeal: false });
  assert.equal(res.valid, false);
  assert.equal(res.status, 'INVALID');
  assert.equal(res.remediationCommand, 'npm run auth:nlm:heal');
});
