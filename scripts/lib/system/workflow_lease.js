'use strict';
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

function isPidAlive(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return true;
  try { process.kill(pid, 0); return true; }
  catch (error) { return error.code !== 'ESRCH'; }
}

// All acquisition/reclamation goes through this short exclusive transaction.
// A stale transaction marker fails closed; never race another reclaimer.
function acquireWorkflowLease(name, root = path.resolve(__dirname, '../../../outputs/history/locks')) {
  if (!/^[a-z0-9_-]+$/i.test(name)) throw new Error('Invalid workflow lease name');
  fs.mkdirSync(root, { recursive: true });
  const file = path.join(root, `${name}.lock`);
  const claimFile = `${file}.claim`;
  let claim;
  try { claim = fs.openSync(claimFile, 'wx'); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    throw new Error(`WORKFLOW_BUSY: ${name}; acquisition transaction at ${claimFile}`);
  }
  const token = `${process.pid}\n${new Date().toISOString()}\n${randomUUID()}\n`;
  let fd;
  try {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      const pidText = content.split('\n')[0].trim();
      if (!/^\d+$/.test(pidText) || isPidAlive(Number(pidText))) {
        throw new Error(`WORKFLOW_BUSY: ${name}; existing lease at ${file}. Do not reuse another workflow's portal session.`);
      }
      fs.unlinkSync(file);
    }
    fd = fs.openSync(file, 'wx');
    fs.writeFileSync(fd, token);
  } finally {
    fs.closeSync(claim);
    fs.unlinkSync(claimFile);
  }
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    try { fs.closeSync(fd); } catch (_) {}
    // A replaced lease must never be deleted by the former owner.
    try { if (fs.readFileSync(file, 'utf8') === token) fs.unlinkSync(file); } catch (_) {}
    process.removeListener('exit', release);
  };
  process.once('exit', release);
  return release;
}
module.exports = { acquireWorkflowLease };
