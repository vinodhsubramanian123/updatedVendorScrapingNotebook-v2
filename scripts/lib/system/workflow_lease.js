'use strict';
const fs = require('fs');
const path = require('path');

function isPidAlive(pid) {
  if (!pid || isNaN(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}

// Exclusive local-process lease, shared by agents using the canonical entrypoint.
// Never steal a lease merely because a long scrape has exceeded a time estimate.
function acquireWorkflowLease(name, root = path.resolve(__dirname, '../../../outputs/history/locks')) {
  if (!/^[a-z0-9_-]+$/i.test(name)) throw new Error('Invalid workflow lease name');
  fs.mkdirSync(root, { recursive: true });
  const file = path.join(root, `${name}.lock`);
  let fd;
  try {
    fd = fs.openSync(file, 'wx');
  } catch (error) {
    if (error.code === 'EEXIST') {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lockPid = parseInt(content.split('\n')[0].trim(), 10);
        if (lockPid && !isPidAlive(lockPid)) {
          try { fs.unlinkSync(file); } catch (_) {}
          try {
            fd = fs.openSync(file, 'wx');
          } catch (retryErr) {
            if (retryErr.code === 'EEXIST') {
              throw new Error(`WORKFLOW_BUSY: ${name}; existing lease at ${file}. Do not close or reuse another workflow's portal session.`);
            }
            throw retryErr;
          }
        } else {
          throw new Error(`WORKFLOW_BUSY: ${name}; existing lease at ${file}. Do not close or reuse another workflow's portal session.`);
        }
      } catch (readErr) {
        if (readErr.message && readErr.message.startsWith('WORKFLOW_BUSY')) throw readErr;
        throw new Error(`WORKFLOW_BUSY: ${name}; existing lease at ${file}. Do not close or reuse another workflow's portal session.`);
      }
    } else {
      throw error;
    }
  }
  fs.writeFileSync(fd, `${process.pid}\n${new Date().toISOString()}\n`);
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    try { fs.closeSync(fd); } catch (_) {}
    try { fs.unlinkSync(file); } catch (_) {}
    process.removeListener('exit', release);
  };
  process.once('exit', release);
  return release;
}
module.exports = { acquireWorkflowLease };
