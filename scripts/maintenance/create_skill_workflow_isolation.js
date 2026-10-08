#!/usr/bin/env node
'use strict';
// Accepted dirty-tree snapshots. Never refresh an old copy or remove any tree.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { randomUUID } = require('crypto');
const { spawnSync } = require('child_process');
const { safeWriteJsonAtomic } = require('../lib/system/fs_compat.js');
const { isWithin, readFileRecord, fingerprint } = require('./skill_workflow/io.js');
const { acceptedManifest, verifyFiles } = require('./skill_workflow/isolation_manifest.js');

const RECEIPT = 'owner.json';
function guardedParent(parent, source) {
  const resolved = fs.realpathSync(parent), temp = fs.realpathSync(os.tmpdir());
  if (!isWithin(temp, resolved) || isWithin(source, resolved)) throw new Error('Snapshot parent must be an OS-temp directory outside the source');
  return resolved;
}
function attachDependencies(source, copy, receipt) {
  for (const relative of ['node_modules', 'dashboard/node_modules']) {
    const original = path.join(source, relative);
    if (!fs.existsSync(original)) continue;
    const real = fs.realpathSync(original), destination = path.join(copy, relative);
    if (!fs.statSync(real).isDirectory()) throw new Error(`Dependency path is not a directory: ${relative}`);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.symlinkSync(real, destination, process.platform === 'win32' ? 'junction' : 'dir');
    if (fs.realpathSync(destination) !== real) throw new Error(`Dependency alias mismatch: ${relative}`);
    const metadata = ['.package-lock.json', 'package.json'].filter(file => fs.existsSync(path.join(real, file))).map(file => readFileRecord(real, file));
    receipt.dependencies.push({ path: relative, realpath: real, metadata, metadataFingerprint: fingerprint(metadata),
      scope: 'Dependency installation metadata hashed; full dependency bytes not snapshotted', mode: 'READ_ONLY_BY_RUNNER_GUARD_NOT_OS_PERMISSION' });
  }
}
function createIsolation(options) {
  const source = fs.realpathSync(options.source), parent = guardedParent(options.parent || os.tmpdir(), source);
  const manifest = acceptedManifest(source), container = fs.mkdtempSync(path.join(parent, 'skill-workflow-isolation-'));
  const root = path.join(container, 'project'), control = path.join(container, 'control');
  fs.mkdirSync(root); fs.mkdirSync(control);
  const receipt = { schemaVersion: 1, ownerToken: randomUUID(), ownerPid: process.pid, root, container, control,
    source, checkpoint: options.checkpoint || 'UNSPECIFIED', createdAt: new Date().toISOString(),
    state: 'COPYING', manifest, dependencies: [], runtimeVersions: process.versions, network: 'BLOCKED_BY_GUARDED_NODE_RUNNER',
    executionQualification: 'Application-level Node guard; no OS sandbox. Native addons or guard bypass are outside qualification. Only audited deterministic/mock workflows may execute.' };
  safeWriteJsonAtomic(path.join(control, RECEIPT), receipt);
  try {
    for (const record of manifest.files) {
      const target = path.join(root, record.path);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(source, record.path), target, fs.constants.COPYFILE_EXCL);
    }
    receipt.copyVerification = verifyFiles(root, manifest);
    const after = acceptedManifest(source);
    if (after.inputTreeFingerprint !== manifest.inputTreeFingerprint || after.sourceAccountedFingerprint !== manifest.sourceAccountedFingerprint) throw new Error('Source tree changed during copy; create a fresh snapshot');
    receipt.sourceVerification = { inputTreeFingerprint: after.inputTreeFingerprint, unchanged: true };
    if (options.dependencies) attachDependencies(source, root, receipt);
    fs.mkdirSync(path.join(control, 'temp'));
    fs.mkdirSync(path.join(control, 'runs'));
    receipt.state = 'READY';
  } catch (error) {
    receipt.state = 'FAILED_COPY_RETAINED'; receipt.error = error.message;
    safeWriteJsonAtomic(path.join(control, RECEIPT), receipt);
    throw new Error(`${error.message}; retained copy: ${root}`);
  }
  safeWriteJsonAtomic(path.join(control, RECEIPT), receipt);
  return receipt;
}
function readOwnedCopy(root, token) {
  const lexical = path.resolve(root), real = fs.realpathSync(lexical);
  if (real !== lexical || !isWithin(fs.realpathSync(os.tmpdir()), real) || path.basename(real) !== 'project' || !path.basename(path.dirname(real)).startsWith('skill-workflow-isolation-')) throw new Error('Invalid or aliased snapshot root');
  const file = path.join(path.dirname(real), 'control', RECEIPT);
  if (fs.lstatSync(file).isSymbolicLink()) throw new Error('Aliased owner receipt');
  const receipt = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (receipt.schemaVersion !== 1 || receipt.root !== real || receipt.ownerToken !== token || receipt.state !== 'READY') throw new Error('Snapshot owner/state mismatch');
  if (receipt.container !== path.dirname(real) || receipt.control !== path.join(receipt.container, 'control') || fs.realpathSync(receipt.control) !== receipt.control) throw new Error('Invalid snapshot control directory');
  if (isWithin(receipt.source, real) || isWithin(real, receipt.source)) throw new Error('Snapshot overlaps its source');
  for (const item of receipt.dependencies) {
    if (fs.realpathSync(path.join(real, item.path)) !== item.realpath) throw new Error(`Dependency changed: ${item.path}`);
    if (fingerprint(item.metadata.map(record => readFileRecord(item.realpath, record.path))) !== item.metadataFingerprint) throw new Error(`Dependency metadata changed: ${item.path}`);
  }
  return receipt;
}
function executeIsolated(options) {
  const receipt = readOwnedCopy(options.root, options.ownerToken);
  const marker = path.join(receipt.control, 'execution.lock'), token = `${process.pid}\n${randomUUID()}\n`;
  const descriptor = fs.openSync(marker, 'wx');
  let result, failure;
  try {
    fs.writeFileSync(descriptor, token);
    result = executeSnapshot(receipt, options);
  } catch (error) { failure = error; }
  try {
    fs.closeSync(descriptor);
    if (fs.readFileSync(marker, 'utf8') !== token) throw new Error('Execution owner marker changed; retained for review');
    fs.unlinkSync(marker);
  } catch (error) {
    if (failure) failure.cleanupError = error.message;
    else failure = error;
  }
  if (failure) throw failure;
  return result;
}
function executeSnapshot(receipt, options) {
  // A run consumes one pristine snapshot. Capture a fresh copy for another run.
  verifyFiles(receipt.root, receipt.manifest);
  const script = path.resolve(receipt.root, options.script);
  if (!isWithin(receipt.root, script) || script === receipt.root) throw new Error('Node script must be inside snapshot');
  const relative = path.relative(receipt.root, script);
  if (!receipt.manifest.files.some(record => record.path === relative.split(path.sep).join('/'))) throw new Error('Script must be an accepted manifest input');
  const guard = path.join(__dirname, 'skill_workflow/isolation_guard.js');
  const sourceBefore = acceptedManifest(receipt.source);
  if (sourceBefore.inputTreeFingerprint !== receipt.manifest.inputTreeFingerprint || sourceBefore.sourceAccountedFingerprint !== receipt.manifest.sourceAccountedFingerprint) throw new Error('Source tree changed since snapshot');
  const runDir = fs.mkdtempSync(path.join(receipt.control, 'runs/run-'));
  const temp = path.join(receipt.control, 'temp');
  const env = { ...process.env, NODE_OPTIONS: `--require=${JSON.stringify(guard)}`,
    SKILL_ISOLATION_ROOT: receipt.root, SKILL_ISOLATION_SOURCE: receipt.source,
    SKILL_ISOLATION_CONTROL: receipt.control, SKILL_ISOLATION_GUARD_LOG: path.join(runDir, 'denied.jsonl'),
    TEMP: temp, TMP: temp, TMPDIR: temp, HOME: temp, USERPROFILE: temp,
    OFFLINE_MODE: 'true', LOCAL_EVAL_ONLY: '1', CI: '1', AUTO_UPLOAD_DRIVE: 'false',
    AUTO_UPLOAD_NLM: '0', AUTO_RETIRE_STALE_SOURCES: '0', SYNC_RAG: '0' };
  delete env.ALLOW_UNSCRAPED_EVAL;
  delete env.ALLOW_E2E_SKIP;
  if (env.NODE_ENV === 'test') delete env.NODE_ENV;
  // Do not inherit API tokens/credentials; configuration files were omitted.
  for (const key of Object.keys(env)) if (/TOKEN|SECRET|API_KEY|CREDENTIAL|PASSWORD/i.test(key)) delete env[key];
  const started = Date.now();
  const result = spawnSync(process.execPath, [script, ...(options.args || [])], {
    cwd: receipt.root, env, timeout: options.timeoutMs || 120000, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  fs.writeFileSync(path.join(runDir, 'stdout.log'), result.stdout || '');
  fs.writeFileSync(path.join(runDir, 'stderr.log'), result.stderr || '');
  const sourceAfter = acceptedManifest(receipt.source);
  const deniedPath = path.join(runDir, 'denied.jsonl');
  const deniedAttempts = fs.existsSync(deniedPath) ? fs.readFileSync(deniedPath, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)) : [];
  const record = { schemaVersion: 1, checkpoint: receipt.checkpoint, snapshotRoot: receipt.root,
    inputTreeFingerprint: receipt.manifest.inputTreeFingerprint, script: relative, args: options.args || [],
    elapsedMs: Date.now() - started, exitCode: result.status, signal: result.signal,
    error: result.error?.message || null, sourceUnchanged: sourceAfter.sourceAccountedFingerprint === sourceBefore.sourceAccountedFingerprint && sourceAfter.inputTreeFingerprint === sourceBefore.inputTreeFingerprint,
    sourceProtectedUnchanged: sourceAfter.sourceProtectedFingerprint === sourceBefore.sourceProtectedFingerprint,
    deniedAttempts,
    guard: readFileRecord(path.dirname(guard), path.basename(guard)),
    outcome: result.status === 0 && !result.error ? (deniedAttempts.length ? 'COMMAND_EXIT_ZERO_WITH_DENIED_ATTEMPTS' : 'COMMAND_EXIT_ZERO_NOT_AUTOMATIC_TEST_PASS') : 'COMMAND_FAILED',
    externalEvidence: 'No live vendor/cloud acceptance; Node network blocked; guard qualification in owner receipt' };
  record.receiptFingerprint = fingerprint([record.guard]);
  safeWriteJsonAtomic(path.join(runDir, 'receipt.json'), record);
  if (!record.sourceUnchanged) throw new Error(`Source changed during isolated run; inspect ${runDir}`);
  return { ...record, runDir };
}
function main(args) {
  const options = {}, values = new Set(['--source', '--parent', '--checkpoint', '--root', '--owner-token', '--run', '--timeout']);
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--') { options.args = args.slice(index + 1); break; }
    if (arg === '--dependencies') { options.dependencies = true; continue; }
    if (arg === '--help') { console.log('Create: --source <accepted-tree> [--parent <OS-temp>] [--checkpoint CP0] [--dependencies]\nRun: --root <copy> --owner-token <token> --run <canonical-node-script> [--timeout ms] -- <script args>\nFresh snapshots only; no cleanup or in-place refresh. Runs block Node network/native subprocesses and out-of-copy writes; not an OS sandbox.'); return; }
    if (!values.has(arg) || !args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`Unknown/missing option: ${arg}`);
    options[arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = args[++index];
  }
  const result = options.run ? executeIsolated({ ...options, script: options.run, timeoutMs: Number(options.timeout || 120000) }) : createIsolation({ ...options, source: options.source || path.resolve(__dirname, '../..') });
  console.log(JSON.stringify(options.run ? result : { root: result.root, ownerToken: result.ownerToken, state: result.state, files: result.manifest.files.length, inputTreeFingerprint: result.manifest.inputTreeFingerprint, qualification: result.executionQualification }, null, 2));
  if (options.run && result.exitCode !== 0) process.exitCode = 1;
}
if (require.main === module) { try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; } }
module.exports = { createIsolation, executeIsolated, readOwnedCopy, main };
