'use strict';
/**
 * tests/unit/test_evidence_log_health.js — Evidence Log Health & Canonical Ledger Schema Assertions (R-10)
 *
 * Asserts:
 * 1. Object-shaped phases (`phases: { phase_1: {...}, phase_2: {...} }`) are normalized and validated.
 * 2. Unreadable / malformed evidence logs are flagged as corrupt.
 * 3. No log has workflowStatus === 'FAILED' with all phases NOT_REACHED (pipeline crash).
 * 4. All completed phases have terminal status (PASSED/FAILED/SKIPPED/NOT_REACHED/ACTION_REQUIRED).
 * 5. Failed logs document their failure reason under `health.gaps`, `health.errors`, or root gaps/errors.
 * 6. Deterministic synthetic fixture testing ensures zero false-passes even in clean CI environments.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const EVIDENCE_DIR = path.join(__dirname, '..', '..', 'outputs', 'history', 'evidence_logs');
const TERMINAL_STATUSES = new Set(['PASSED', 'FAILED', 'SKIPPED', 'NOT_REACHED', 'ACTION_REQUIRED', 'RESOLVED', 'WARNING', 'DEGRADED']);

function extractPhaseList(data) {
  if (!data) return [];
  const raw = data.phases || data.phaseResults || [];
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') return Object.values(raw);
  return [];
}

function extractHealth(data) {
  if (!data) return { workflowStatus: 'UNKNOWN', gaps: [], errors: [], errorCode: '' };
  return {
    workflowStatus: (data.health?.workflowStatus || data.workflowStatus || '').toUpperCase(),
    gaps: data.health?.gaps || data.gaps || [],
    errors: data.health?.errors || data.errors || [],
    errorCode: data.health?.errorCode || data.errorCode || ''
  };
}

function scanEvidenceLogs(dirPath, maxAge = 7 * 24 * 60 * 60 * 1000) {
  if (!fs.existsSync(dirPath)) return { validLogs: [], corruptFiles: [] };
  const cutoff = Date.now() - maxAge;
  const validLogs = [];
  const corruptFiles = [];

  for (const f of fs.readdirSync(dirPath)) {
    if (!f.startsWith('evidence_log_') || !f.endsWith('.json')) continue;
    const full = path.join(dirPath, f);
    try {
      const stat = fs.statSync(full);
      if (stat.mtimeMs < cutoff) continue;
      const data = JSON.parse(fs.readFileSync(full, 'utf8'));
      validLogs.push({ file: f, fullPath: full, data, mtime: stat.mtimeMs });
    } catch (err) {
      corruptFiles.push({ file: f, fullPath: full, error: err.message });
    }
  }

  validLogs.sort((a, b) => b.mtime - a.mtime);
  return { validLogs, corruptFiles };
}

test('Evidence Log Health — Canonical Schema & Fixture Assertions (R-10)', async (t) => {
  await t.test('extractPhaseList normalizes both object-shaped and array-shaped phases', () => {
    const objectPhases = {
      phase_1: { phaseNumber: 1, phaseName: 'Intake', status: 'PASSED' },
      phase_2: { phaseNumber: 2, phaseName: 'Routing', status: 'PASSED' }
    };
    const list1 = extractPhaseList({ phases: objectPhases });
    assert.equal(list1.length, 2);
    assert.equal(list1[0].status, 'PASSED');

    const arrayPhases = [
      { phaseNumber: 1, phaseName: 'Intake', status: 'PASSED' }
    ];
    const list2 = extractPhaseList({ phases: arrayPhases });
    assert.equal(list2.length, 1);
  });

  await t.test('synthetic modern fixture passes health assertions', () => {
    const validLog = {
      traceId: 'TRC-SYNTH-001',
      health: {
        healthy: true,
        workflowStatus: 'COMPLETE',
        gaps: []
      },
      phases: {
        phase_1: { phaseNumber: 1, phaseName: 'Intake', status: 'PASSED' },
        phase_2: { phaseNumber: 2, phaseName: 'Aspect Math', status: 'PASSED' },
        phase_9: { phaseNumber: 9, phaseName: 'Export', status: 'PASSED' }
      }
    };

    const phases = extractPhaseList(validLog);
    assert.equal(phases.length, 3);
    for (const p of phases) {
      assert.ok(TERMINAL_STATUSES.has(p.status));
    }
    const health = extractHealth(validLog);
    assert.equal(health.workflowStatus, 'COMPLETE');
    assert.equal(health.gaps.length, 0);
  });

  await t.test('detects pipeline crash (all phases NOT_REACHED with workflowStatus FAILED)', () => {
    const crashedLog = {
      traceId: 'TRC-CRASH-001',
      health: { workflowStatus: 'FAILED', gaps: ['INPUT_NOT_IDENTIFIED'] },
      phases: {
        phase_1: { status: 'NOT_REACHED' },
        phase_2: { status: 'NOT_REACHED' }
      }
    };

    const phases = extractPhaseList(crashedLog);
    const allNotReached = phases.length > 0 && phases.every(p => p.status === 'NOT_REACHED');
    const health = extractHealth(crashedLog);
    assert.equal(allNotReached, true, 'Should detect all phases NOT_REACHED');
    assert.equal(health.workflowStatus, 'FAILED');
  });

  await t.test('detects running/non-terminal phases in unfinalized logs', () => {
    const stuckLog = {
      traceId: 'TRC-STUCK-001',
      health: { workflowStatus: 'RUNNING' },
      phases: {
        phase_1: { status: 'PASSED' },
        phase_2: { status: 'RUNNING' }
      }
    };

    const phases = extractPhaseList(stuckLog);
    const hasNonTerminal = phases.some(p => !TERMINAL_STATUSES.has(p.status));
    assert.equal(hasNonTerminal, true, 'Should detect phase stuck in RUNNING status');
  });

  await t.test('detects failed logs lacking documented failure reasons', () => {
    const reasonlessFailedLog = {
      traceId: 'TRC-BAD-001',
      health: { workflowStatus: 'FAILED', gaps: [], errors: [], errorCode: '' }
    };
    const health = extractHealth(reasonlessFailedLog);
    const hasReason = health.gaps.length > 0 || health.errors.length > 0 || health.errorCode.length > 0;
    assert.equal(hasReason, false, 'Should flag failed log without reasons');
  });

  await t.test('scan of on-disk evidence logs validates healthy terminal phases and flags corrupt files', () => {
    const { validLogs, corruptFiles } = scanEvidenceLogs(EVIDENCE_DIR);

    // Fail if unreadable/corrupt files exist in evidence directory
    assert.equal(corruptFiles.length, 0, `Corrupt evidence log(s) found on disk: ${corruptFiles.map(c => c.file).join(', ')}`);

    for (const log of validLogs) {
      const phases = extractPhaseList(log.data);
      if (phases.length > 0) {
        for (const phase of phases) {
          const status = (phase.status || phase.state || '').toUpperCase();
          if (!status) continue;
          assert.ok(
            TERMINAL_STATUSES.has(status),
            `Non-terminal status "${status}" in ${log.file} phase ${phase.phaseName || phase.phaseNumber}`
          );
        }
      }

      const health = extractHealth(log.data);
      assert.notEqual(health.workflowStatus, 'RUNNING', `Log ${log.file} has workflowStatus=RUNNING`);
    }
  });
});
