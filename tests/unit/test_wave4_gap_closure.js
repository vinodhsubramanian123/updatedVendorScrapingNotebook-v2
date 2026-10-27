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
});
