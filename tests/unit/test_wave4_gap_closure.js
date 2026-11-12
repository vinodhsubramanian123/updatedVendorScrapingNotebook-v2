'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const { auditEvidenceDirectory } = require('../../scripts/maintenance/audit_evidence_health.js');
const { safeParseEvalResult } = require('../../scripts/lib/system/schemas.js');

test('Wave 4 Gap Closure — G9.1 Transport & IPC Result Envelope', async (t) => {
  await t.test('G9.1 (Positive): Versioned EVAL_RESULT_PAYLOAD envelope conforms to schema', () => {
    const mockPayload = {
      type: 'EVAL_RESULT_PAYLOAD',
      version: '1.0.0',
      traceId: 'TRC-TEST-123456',
      status: 'SUCCESS',
      data: {
        traceId: 'TRC-TEST-123456',
        customerDisposition: 'DELIVERY_AUTHORIZED',
        itemCount: 2,
        items: [
          { sku: 'P73282-B21', quantity: 1, description: 'Chassis' },
          { sku: 'P49607-B21', quantity: 2, description: 'Processor' }
        ],
        aspectChecks: [
          { name: 'Compute / Thermal', status: 'PASS' }
        ],
        conflictGraph: {
          isWholeSolutionValid: true
        }
      }
    };

    assert.strictEqual(mockPayload.type, 'EVAL_RESULT_PAYLOAD');
    assert.strictEqual(mockPayload.version, '1.0.0');
    assert.strictEqual(mockPayload.status, 'SUCCESS');

    // Schema validation succeeds
    const validated = safeParseEvalResult(mockPayload.data);
    assert.strictEqual(validated.success, true);
    assert.strictEqual(validated.data.customerDisposition, 'DELIVERY_AUTHORIZED');
  });

  await t.test('G9.1 (Fallback): Framed __EVAL_RESULT_JSON__ is parsed when IPC is absent', () => {
    const markerTag = '__EVAL_RESULT_JSON__';
    const jsonBody = JSON.stringify({
      status: 'ACTION_REQUIRED',
      data: {
        traceId: 'TRC-STDOUT-FALLBACK',
        customerDisposition: 'DELIVERY_BLOCKED_UNBUILDABLE',
        items: [{ sku: 'P73282-B21', quantity: 1 }],
        aspectChecks: []
      }
    });

    const mockStdoutBuffer = `[INFO] Evaluating BOQ...\n${markerTag}${jsonBody}${markerTag}\n[INFO] Done.`;
    const firstMarker = mockStdoutBuffer.indexOf(markerTag);
    const lastMarker = mockStdoutBuffer.lastIndexOf(markerTag);
    assert.ok(firstMarker !== -1 && lastMarker > firstMarker);

    const parsed = JSON.parse(mockStdoutBuffer.substring(firstMarker + markerTag.length, lastMarker).trim());
    assert.strictEqual(parsed.status, 'ACTION_REQUIRED');
    assert.strictEqual(parsed.data.traceId, 'TRC-STDOUT-FALLBACK');
  });
});

test('Wave 4 Gap Closure — G11 Evidence Health Governance', async (t) => {
  await t.test('G11 (Positive): All persistent evidence records are 100% healthy with 0 unhealthy', () => {
    const report = auditEvidenceDirectory();
    assert.ok(report.total > 0, 'Evidence records found');
    assert.strictEqual(report.unhealthy, 0, 'Zero unhealthy evidence records');
    assert.strictEqual(report.healthy, report.total, 'All records are healthy');
  });

  await t.test('G11.1 (Regression): Phase 1 abort exempts INPUT_FINGERPRINT_MISSING while healthy Phase 1 requires skuDecisions', () => {
    const { EvidenceLedger } = require('../../scripts/lib/system/evidence_ledger.js');
    const aborted = new EvidenceLedger({ traceId: 'TRC-G11-PHASE1-ABORT', chassis: 'UNKNOWN_CHASSIS', filePath: 'RAW_INPUT' });
    aborted.startPhase(1, 'BOQ Intake', {});
    aborted.completePhase(1, 'FAILED', { error: 'EISDIR: illegal operation on a directory' });
    for (let p = 2; p <= 9; p++) {
      aborted.startPhase(p, `Phase ${p}`, {});
      aborted.completePhase(p, 'NOT_REACHED', {});
    }
    assert.strictEqual(aborted.getHealth().healthy, true, 'Phase 1 abort without inputSha256 or skuDecisions must remain healthy');

    const nonAbortedMissing = new EvidenceLedger({ traceId: 'TRC-G11-PHASE1-PASS-EMPTY', chassis: 'DL380_Gen12', filePath: 'RAW_INPUT' });
    nonAbortedMissing.recordInlineArtifact('CUSTOMER_INPUT', 'sample');
    nonAbortedMissing.startPhase(1, 'BOQ Intake', {});
    nonAbortedMissing.completePhase(1, 'PASSED', {});
    for (let p = 2; p <= 9; p++) {
      nonAbortedMissing.startPhase(p, `Phase ${p}`, {});
      nonAbortedMissing.completePhase(p, 'PASSED', {});
    }
    const health = nonAbortedMissing.getHealth();
    assert.strictEqual(health.healthy, false);
    assert.ok(health.gaps.includes('SKU_DECISIONS_MISSING'));
  });

  await t.test('G11.2 (Regression): RFP sizing records SKU audit decisions in a healthy evidence ledger', async () => {
    const { executeRoutedQuery } = require('../../scripts/evaluators/route_query.js');
    const out = await executeRoutedQuery('Size 2 nodes of DL380 Gen12 with quantum flux widget', {
      chassisName: 'DL380_Gen12',
      offline: true,
      offlineMode: true
    });
    const logPath = out?.result?.evidenceLogPath;
    assert.ok(logPath && fs.existsSync(logPath), 'Evidence log path must be persisted');
    try {
      const logJson = JSON.parse(fs.readFileSync(logPath, 'utf8'));
      const mdPath = logPath.replace(/\.json$/i, '.md');
      assert.strictEqual(logJson.health?.healthy, true, `Expected healthy ledger, got ${JSON.stringify(logJson.health)}`);
      assert.ok(
        Array.isArray(logJson.skuAuditLedger) && logJson.skuAuditLedger.length > 0,
        'Expected non-empty skuAuditLedger in sizing evidence log'
      );
      if (fs.existsSync(mdPath)) fs.unlinkSync(mdPath);
    } finally {
      if (fs.existsSync(logPath)) fs.unlinkSync(logPath);
    }
  });
});
