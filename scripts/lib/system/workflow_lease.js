'use strict';
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const BUSY_CODES = new Set(['EEXIST', 'EPERM', 'EBUSY', 'EACCES']);
const CLEANUP_ATTEMPTS = 3;

function isPidAlive(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return true;
  try { process.kill(pid, 0); return true; }
  catch (error) { return error.code !== 'ESRCH'; }
}

function busy(name, file, cause) {
  return new Error(`WORKFLOW_BUSY: ${name}; acquisition transaction at ${file}; workflow lease busy`, { cause });
}

function retryCleanup(operation) {
  let last;
  for (let attempt = 0; attempt < CLEANUP_ATTEMPTS; attempt += 1) {
    try { operation(); return; }
    catch (error) { if (error.code === 'ENOENT') return; last = error; }
  }
  throw last;
}

function sameFile(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.birthtimeMs === right.birthtimeMs;
}

function removeOwned(handle) {
  // The open handle identifies even a partially initialized marker. Readback
  // prevents cleanup from removing a replacement left by another owner.
  if (!handle.identity) throw new Error(`WORKFLOW_RECOVERY_REQUIRED: marker identity unavailable at ${handle.file}`);
  retryCleanup(() => {
    const current = fs.statSync(handle.file);
    if (!sameFile(handle.identity, current)) return;
    if (handle.initialized && fs.readFileSync(handle.file, 'utf8') !== handle.token) return;
    fs.unlinkSync(handle.file);
  });
}

function cleanupHandle(handle) {
  if (!handle) return [];
  const failures = [];
  if (handle.fd !== undefined) {
    if (!handle.identity) {
      try { handle.identity = fs.fstatSync(handle.fd); }
      catch (error) { failures.push(error); }
    }
    try { retryCleanup(() => fs.closeSync(handle.fd)); handle.fd = undefined; }
    catch (error) { failures.push(error); }
  }
  try { removeOwned(handle); }
  catch (error) { failures.push(error); }
  return failures;
}

function cleanupError(failures) {
  const error = new AggregateError(failures, 'WORKFLOW_CLEANUP_FAILED: owned lease markers could not be cleaned');
  error.code = 'WORKFLOW_CLEANUP_FAILED';
  return error;
}

function initializeHandle(file, holder) {
  const fd = fs.openSync(file, 'wx');
  const handle = { file, fd, token: `${process.pid}\n${new Date().toISOString()}\n${randomUUID()}\n`, initialized: false };
  holder.handle = handle; // Cleanup covers fstat/write failures, not just later work.
  handle.identity = fs.fstatSync(fd);
  fs.writeFileSync(fd, handle.token);
  handle.initialized = true;
  return handle;
}

function readDeadClaim(file) {
  const identity = fs.statSync(file);
  const token = fs.readFileSync(file, 'utf8');
  const lines = token.trimEnd().split('\n');
  const pid = /^\d+$/.test(lines[0]) ? Number(lines[0]) : NaN;
  const timestamp = lines[1];
  if (!timestamp || (!Number.isFinite(Number(timestamp)) && !Number.isFinite(Date.parse(timestamp)))) return null;
  if (Date.now() - identity.mtimeMs <= 10000 || isPidAlive(pid)) return null;
  return { file, identity, token, initialized: true };
}

function guardBusy(name, file, cause) {
  const error = busy(name, file, cause);
  error.message += '; WORKFLOW_RECOVERY_REQUIRED for abandoned guards: verify ownership, never reclaim by age';
  return error;
}

function initializeClaim(name, file, holder) {
  const handle = initializeHandle(file, holder);
  if (fs.existsSync(`${file}.reclaim`)) throw guardBusy(name, `${file}.reclaim`);
  return handle;
}

function reclaimDeadClaim(name, claimFile) {
  // Serialize all reclaimers. An orphaned or malformed recovery guard is
  // deliberately recovery-required: guessing its ownership can steal a live
  // acquisition. No automatic age-only reclamation of this guard is allowed.
  const guardFile = `${claimFile}.reclaim`;
  const holder = {};
  let primary;
  try {
    try { initializeHandle(guardFile, holder); }
    catch (error) { if (BUSY_CODES.has(error.code)) throw guardBusy(name, guardFile, error); throw error; }
    const candidate = readDeadClaim(claimFile);
    if (!candidate) throw busy(name, claimFile);
    removeOwned(candidate);
  } catch (error) { primary = error; }
  const failures = cleanupHandle(holder.handle);
  if (primary) { if (failures.length) primary.cleanupErrors = failures; throw primary; }
  if (failures.length) throw cleanupError(failures);
}

function acquireClaim(name, claimFile, holder) {
  try { return initializeClaim(name, claimFile, holder); }
  catch (error) {
    // Once our exclusive open succeeded, initialization errors are ours to
    // clean up; they must never enter stale-owner reclamation.
    if (holder.handle || !BUSY_CODES.has(error.code)) throw error;
    if (error.code !== 'EEXIST') throw busy(name, claimFile, error);
    try { reclaimDeadClaim(name, claimFile); }
    catch (recoveryError) {
      if (recoveryError.code === 'WORKFLOW_CLEANUP_FAILED' || recoveryError.cleanupErrors) throw recoveryError;
      if (recoveryError.message.startsWith('WORKFLOW_BUSY')) throw recoveryError;
      if (BUSY_CODES.has(recoveryError.code) || recoveryError.code === 'ENOENT') throw busy(name, claimFile, recoveryError);
      throw recoveryError;
    }
    try { return initializeClaim(name, claimFile, holder); }
    catch (retryError) {
      if (!holder.handle && BUSY_CODES.has(retryError.code)) throw busy(name, claimFile, retryError);
      throw retryError;
    }
  }
}

function removeDeadLease(name, file) {
  let content;
  try { content = fs.readFileSync(file, 'utf8'); }
  catch (error) {
    if (error.code === 'ENOENT') return;
    if (BUSY_CODES.has(error.code)) throw busy(name, file, error);
    throw error;
  }
  const pidText = content.split('\n')[0].trim();
  if (!/^\d+$/.test(pidText) || isPidAlive(Number(pidText))) throw busy(name, file);
  // Claim ownership serializes cooperating writers, including stale-lock cleanup.
  const candidate = { file, identity: fs.statSync(file), token: content, initialized: true };
  removeOwned(candidate);
}

function acquireWorkflowLease(name, root = path.resolve(__dirname, '../../../outputs/history/locks')) {
  if (!/^[a-z0-9_-]+$/i.test(name)) throw new Error('Invalid workflow lease name');
  fs.mkdirSync(root, { recursive: true });
  const file = path.join(root, `${name}.lock`);
  const claimHolder = {};
  const leaseHolder = {};
  let primary;
  try {
    acquireClaim(name, `${file}.claim`, claimHolder);
    removeDeadLease(name, file);
    try { initializeHandle(file, leaseHolder); }
    catch (error) {
      if (!leaseHolder.handle && BUSY_CODES.has(error.code)) throw busy(name, file, error);
      throw error;
    }
  } catch (error) { primary = error; }
  const failures = cleanupHandle(claimHolder.handle);
  if (primary || failures.length) {
    failures.push(...cleanupHandle(leaseHolder.handle));
    if (primary) { if (failures.length) primary.cleanupErrors = failures; throw primary; }
    throw cleanupError(failures);
  }
  let released = false;
  const release = () => {
    if (released) return;
    const releaseFailures = cleanupHandle(leaseHolder.handle);
    if (releaseFailures.length) throw cleanupError(releaseFailures);
    released = true;
    process.removeListener('exit', exitRelease);
  };
  // Exit cleanup cannot report to the caller; explicit release above does.
  const exitRelease = () => { try { release(); } catch (error) { process.stderr.write(`${error.message}\n`); } };
  process.once('exit', exitRelease);
  return release;
}
module.exports = { acquireWorkflowLease };
