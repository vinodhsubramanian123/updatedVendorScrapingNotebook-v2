'use strict';
// Application-level boundary for audited Node fixtures, not an OS sandbox.
// Install before importing canonical workflows and inherit into Node children.
const fs = require('fs');
const path = require('path');
const { fileURLToPath } = require('url');
const child = require('child_process');
const root = fs.realpathSync(process.env.SKILL_ISOLATION_ROOT || ''),
  control = fs.realpathSync(process.env.SKILL_ISOLATION_CONTROL || '');
const fixtureTemp = fs.realpathSync(path.join(control, 'temp'));
const originalAppend = fs.appendFileSync.bind(fs), originalRealpath = fs.realpathSync.bind(fs);
const log = process.env.SKILL_ISOLATION_GUARD_LOG;
const within = (base, target) => { const rel = path.relative(base, target); return rel === '' || (!path.isAbsolute(rel) && rel !== '..' && !rel.startsWith('..' + path.sep)); };
function deny(category, metadata = {}) {
  if (log) originalAppend(log, JSON.stringify({ category, ...metadata, pid: process.pid, timestamp: new Date().toISOString() }) + '\n');
  throw Object.assign(new Error(`ISOLATION_BOUNDARY_DENIED: ${category}`), { code: 'ISOLATION_BOUNDARY_DENIED' });
}
function commandName(command, shell = false) {
  if (typeof command !== 'string') return '<unresolved>';
  const candidate = shell ? command.match(/^\s*([A-Za-z0-9_.-]+)(?:\s|$)/)?.[1] : command.split(/[\\/]/).pop();
  return candidate && /^[A-Za-z0-9_.-]{1,80}$/.test(candidate) ? candidate.toLowerCase().replace(/\.exe$/, '') : '<unresolved>';
}
function writable(input) {
  if (typeof input === 'number') { if (input === 1 || input === 2 || descriptors.has(input)) return; return deny('UNKNOWN_WRITE_DESCRIPTOR'); }
  const file = input instanceof URL ? fileURLToPath(input) : Buffer.isBuffer(input) ? input.toString() : input;
  if (typeof file !== 'string') return deny('UNRESOLVED_WRITE_PATH');
  const target = path.resolve(file);
  if (!within(root, target) && !within(control, target)) return deny('OUTSIDE_COPY_WRITE');
  // Every existing ancestor must resolve within allowed roots. Dependency
  // junctions thus stay read-only even though lexically under the project.
  for (let current = target; ; current = path.dirname(current)) {
    if (fs.existsSync(current)) {
      let real;
      try { real = originalRealpath(current); }
      catch (error) {
        // A concurrent lease owner may remove a checked claim before realpath.
        // Still inspect every enclosing parent; a vanished boundary is not safe.
        if (error.code !== 'ENOENT' || current === root || current === control) throw error;
        continue;
      }
      if (!within(root, real) && !within(control, real)) return deny('ALIASED_OUTSIDE_COPY_WRITE');
    }
    if (current === root || current === control) break;
  }
}
const descriptors = new Set();
const writeOpen = flags => typeof flags === 'number' ? Boolean(flags & (fs.constants.O_WRONLY | fs.constants.O_RDWR | fs.constants.O_CREAT | fs.constants.O_TRUNC | fs.constants.O_APPEND)) : /[wa+]/.test(flags || 'r');
for (const method of ['writeFile', 'appendFile', 'truncate', 'unlink', 'mkdir', 'rmdir', 'rm', 'chmod', 'chown', 'utimes', 'lchmod', 'lchown', 'lutimes', 'mkdtemp', 'createWriteStream']) {
  for (const name of [method, method + 'Sync']) if (typeof fs[name] === 'function') {
    const original = fs[name]; fs[name] = function (...args) { writable(args[0]); return original.apply(this, args); };
  }
  if (typeof fs.promises[method] === 'function') {
    const original = fs.promises[method]; fs.promises[method] = function (...args) { writable(args[0]); return original.apply(this, args); };
  }
}
for (const method of ['rename', 'copyFile', 'cp']) {
  for (const name of [method, method + 'Sync']) if (typeof fs[name] === 'function') {
    const original = fs[name]; fs[name] = function (...args) { if (method === 'rename') writable(args[0]); writable(args[1]); return original.apply(this, args); };
  }
  if (typeof fs.promises[method] === 'function') {
    const original = fs.promises[method]; fs.promises[method] = function (...args) { if (method === 'rename') writable(args[0]); writable(args[1]); return original.apply(this, args); };
  }
}
for (const method of ['symlink', 'link']) for (const object of [fs, fs.promises]) {
  for (const name of [method, method + 'Sync']) if (typeof object[name] === 'function') object[name] = () => deny('CREATE_ALIAS');
}
const openSync = fs.openSync; fs.openSync = function (file, flags, ...rest) {
  if (writeOpen(flags)) writable(file);
  const fd = openSync.call(this, file, flags, ...rest); if (writeOpen(flags)) descriptors.add(fd); return fd;
};
const open = fs.open; fs.open = function (file, flags, ...rest) {
  const writes = writeOpen(flags); if (writes) writable(file);
  const callback = rest.pop();
  return open.call(this, file, flags, ...rest, (error, fd) => { if (!error && writes) descriptors.add(fd); callback(error, fd); });
};
const promiseOpen = fs.promises.open; fs.promises.open = async function (file, flags, ...rest) {
  if (writeOpen(flags)) writable(file);
  return promiseOpen.call(this, file, flags, ...rest);
};
for (const name of ['write', 'writeSync', 'writev', 'writevSync', 'ftruncate', 'ftruncateSync', 'fchmod', 'fchmodSync', 'fchown', 'fchownSync', 'futimes', 'futimesSync']) {
  if (typeof fs[name] !== 'function') continue;
  const original = fs[name]; fs[name] = function (...args) { writable(args[0]); return original.apply(this, args); };
}
const close = fs.close, closeSync = fs.closeSync;
fs.close = function (fd, callback) { return close.call(this, fd, error => { if (!error) descriptors.delete(fd); callback?.(error); }); };
fs.closeSync = function (fd) { const result = closeSync.call(this, fd); descriptors.delete(fd); return result; };
function nodeOptions(options = {}) {
  if (options.shell || options.detached) deny('SHELL_OR_DETACHED_PROCESS');
  const cwd = path.resolve(options.cwd || process.cwd());
  const realCwd = originalRealpath(cwd);
  if (!within(root, realCwd) && !within(fixtureTemp, realCwd)) deny('CHILD_CWD_OUTSIDE_COPY');
  return { ...options, cwd, env: { ...(options.env || process.env),
    NODE_OPTIONS: process.env.NODE_OPTIONS, SKILL_ISOLATION_ROOT: root, SKILL_ISOLATION_CONTROL: control,
    SKILL_ISOLATION_SOURCE: process.env.SKILL_ISOLATION_SOURCE, SKILL_ISOLATION_GUARD_LOG: log } };
}
function nodeCommand(command, args) {
  const metadata = { command: commandName(command) };
  let real;
  try { real = originalRealpath(command); } catch { return deny('NON_NODE_SUBPROCESS', metadata); }
  if (real !== originalRealpath(process.execPath)) deny('NON_NODE_SUBPROCESS', metadata);
  if ((args || []).some(arg => /^--(?:require|import|experimental-loader|loader)(?:=|$)/.test(arg) || arg.startsWith('--no-'))) deny('CHILD_PRELOAD_OVERRIDE');
}
for (const method of ['spawn', 'spawnSync', 'execFile', 'execFileSync']) {
  const original = child[method];
  child[method] = function (command, args = [], options = {}, ...rest) {
    if (!Array.isArray(args)) {
      if (typeof args === 'function') { rest.unshift(args); options = {}; }
      else { if (typeof options === 'function') rest.unshift(options); options = args || {}; }
      args = [];
    } else if (typeof options === 'function') { rest.unshift(options); options = {}; }
    nodeCommand(command, args); return original.call(this, command, args, nodeOptions(options), ...rest);
  };
}
const fork = child.fork; child.fork = function (script, args = [], options = {}) {
  if (!Array.isArray(args)) { options = args; args = []; }
  const file = originalRealpath(path.resolve(script)); if (!within(root, file)) deny('CHILD_SCRIPT_OUTSIDE_COPY');
  nodeCommand(options.execPath || process.execPath, options.execArgv || process.execArgv);
  return fork.call(this, script, args, nodeOptions(options));
};
child.exec = child.execSync = command => deny('SHELL_SUBPROCESS', { command: commandName(command, true) });
require('worker_threads').Worker = class { constructor() { deny('WORKER_WITHOUT_GUARD'); } };
for (const [name, methods] of [['net', ['connect', 'createConnection', 'createServer']], ['http', ['request', 'get', 'createServer']], ['https', ['request', 'get', 'createServer']], ['tls', ['connect', 'createServer']], ['dgram', ['createSocket']], ['http2', ['connect', 'createServer', 'createSecureServer']], ['dns', ['lookup', 'resolve', 'resolve4', 'resolve6']]]) {
  const api = require(name); for (const method of methods) if (typeof api[method] === 'function') api[method] = () => deny('NETWORK_' + name.toUpperCase());
  if (api.promises) for (const method of methods) if (typeof api.promises[method] === 'function') api.promises[method] = () => deny('NETWORK_' + name.toUpperCase());
}
require('net').Socket.prototype.connect = () => deny('NETWORK_SOCKET');
globalThis.fetch = () => deny('NETWORK_FETCH');
if (globalThis.WebSocket) globalThis.WebSocket = class { constructor() { deny('NETWORK_WEBSOCKET'); } };
// ESM named imports receive the patched builtin export values too.
require('module').syncBuiltinESMExports();
