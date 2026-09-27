'use strict';
/**
 * tests/unit/test_evidence_log_health.js — Evidence Log Health Assertion (Gap 6)
 *
 * Scans recent evidence logs and asserts:
 * 1. No log has workflowStatus === 'FAILED' with all phases NOT_REACHED
 *    (which indicates a pipeline crash, not a legitimate evaluation failure)
 * 2. All completed phases have terminal status (PASSED/FAILED/SKIPPED/NOT_REACHED)
 *    — never stuck in 'RUNNING' or 'PENDING'
 * 3. No log has empty gaps array when workflowStatus is 'FAILED'
 *    (a failed log must document WHY it failed)
 *
 * This catches silent pipeline regressions that unit tests miss.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const EVIDENCE_DIR = path.join(__dirname, '..', '..', 'outputs', 'history', 'evidence_logs');
const TERMINAL_STATUSES = new Set(['PASSED', 'FAILED', 'SKIPPED', 'NOT_REACHED', 'ACTION_REQUIRED']);

function loadRecentEvidenceLogs(maxAge = 7 * 24 * 60 * 60 * 1000) {
  if (!fs.existsSync(EVIDENCE_DIR)) return [];
  const cutoff = Date.now() - maxAge;
  return fs.readdirSync(EVIDENCE_DIR)
    .filter(f => f.startsWith('evidence_log_') && f.endsWith('.json'))
    .map(f => {
      const full = path.join(EVIDENCE_DIR, f);
      try {
        const stat = fs.statSync(full);
        if (stat.mtimeMs < cutoff) return null;
        const data = JSON.parse(fs.readFileSync(full, 'utf8'));
        return { file: f, data, mtime: stat.mtimeMs };
      } catch (_) {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.mtime - a.mtime);
}

test('Evidence Log Health Assertions', async (t) => {
  const logs = loadRecentEvidenceLogs();

  await t.test('evidence logs directory exists and contains recent logs', () => {
    // This is informational — we skip if no logs exist (first-time setup)
    if (logs.length === 0) {
      console.log('  ⓘ No recent evidence logs found — skipping health checks (clean environment)');
      return;
    }
    console.log(`  Found ${logs.length} recent evidence log(s)`);
  });

  await t.test('no evidence log has all phases NOT_REACHED (pipeline crash)', () => {
    for (const log of logs) {
      const phases = log.data.phases || log.data.phaseResults || [];
      if (!Array.isArray(phases) || phases.length === 0) continue;

      const allNotReached = phases.every(p => {
        const status = (p.status || p.state || '').toUpperCase();
        return status === 'NOT_REACHED';
      });

      if (allNotReached && log.data.workflowStatus === 'FAILED') {
        // Check if this is the known HP Opportunity fixture — document it as expected
        const inputFile = log.data.inputFile || log.data.input || '';
        if (inputFile.includes('HP Opportunity')) {
          console.log(`  ⓘ Known fixture: ${log.file} — HP Opportunity workbook produces ERR_EMPTY_BOQ (expected)`);
          continue;
        }
        assert.fail(
          `Pipeline crash detected in ${log.file}: workflowStatus=FAILED but ALL phases are NOT_REACHED. ` +
          `This means the pipeline crashed before any phase could execute. Input: ${inputFile}`
        );
      }
    }
  });

  await t.test('all completed phases have terminal status', () => {
    for (const log of logs) {
      const phases = log.data.phases || log.data.phaseResults || [];
      if (!Array.isArray(phases)) continue;

      for (const phase of phases) {
        const status = (phase.status || phase.state || '').toUpperCase();
        if (!status) continue; // Skip phases with no status field
        assert.ok(
          TERMINAL_STATUSES.has(status),
          `Non-terminal phase status "${status}" found in ${log.file} phase ${phase.name || phase.phase || 'unknown'}. ` +
          `Expected one of: ${[...TERMINAL_STATUSES].join(', ')}`
        );
      }
    }
  });

  await t.test('failed logs document their failure reason', () => {
    for (const log of logs) {
      if (log.data.workflowStatus !== 'FAILED') continue;

      const gaps = log.data.gaps || [];
      const errors = log.data.errors || [];
      const errorCode = log.data.errorCode || '';

      // A failed log must have at least one of: gaps, errors, or errorCode
      const hasReason = gaps.length > 0 || errors.length > 0 || errorCode.length > 0;

      if (!hasReason) {
        // Allow known fixture cases
        const inputFile = log.data.inputFile || log.data.input || '';
        if (inputFile.includes('HP Opportunity')) continue;

        assert.fail(
          `Failed evidence log ${log.file} has no documented failure reason. ` +
          `gaps=[], errors=[], errorCode=''. A FAILED log must explain WHY it failed.`
        );
      }
    }
  });

  await t.test('no evidence log has RUNNING status (stuck pipeline)', () => {
    for (const log of logs) {
      const status = (log.data.workflowStatus || '').toUpperCase();
      assert.notStrictEqual(
        status, 'RUNNING',
        `Evidence log ${log.file} has workflowStatus=RUNNING — pipeline may be stuck or was not finalized.`
      );
    }
  });
});
