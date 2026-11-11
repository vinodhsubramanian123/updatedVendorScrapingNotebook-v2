'use strict';
const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const http = require('http');
const express = require('express');
const XLSX = require('xlsx-js-style');

const tmpRunsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'export-auth-runs-'));
const previousRunsDir = process.env.DASHBOARD_RUNS_DIR;
const previousSecret = process.env.DELIVERY_AUTH_SECRET;
process.env.DASHBOARD_RUNS_DIR = tmpRunsDir;
if (!process.env.DELIVERY_AUTH_SECRET) {
  process.env.DELIVERY_AUTH_SECRET = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
}

const {
  generateProfessionalBOQ,
  generateRankedPortalWorkbook,
  generateMultiRankSolutionWorkbook,
  generateMultiRankSolutionCsv,
  _parseStrictRankTier
} = require('../../scripts/lib/boq/generate_boq_xlsx.js');
const { deliveryFingerprint } = require('../../scripts/lib/boq/solution_evidence.js');
const { issueDeliveryAuthorization } = require('../../scripts/lib/contracts/workflow_contract.js');
const runState = require('../../dashboard/services/runState.cjs');
const evaluationRouter = require('../../dashboard/routes/evaluation.cjs');
const catalogsRouter = require('../../dashboard/routes/catalogs.cjs');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUTS_DIR = path.join(PROJECT_ROOT, 'outputs');
const createdArtifacts = [];

function trackArtifact(filePath) {
  if (filePath) createdArtifacts.push(filePath);
}

function makeCandidateEval(options = {}) {
  const baseEval = {
    chassis: options.chassis || 'DL380_Gen12',
    isMathClean: options.isMathClean !== undefined ? options.isMathClean : true,
    customerDisposition: options.customerDisposition || 'VALIDATION_REQUIRED',
    portalValidationStatus: 'PORTAL_VALIDATION_PENDING',
    ephemeralSourceValidation: {
      success: true,
      isCloudGrounded: true,
      doubleCheckVerdict: 'VERIFIED'
    },
    acceptanceGate: options.acceptanceGate || {
      isValid: true,
      blockersCount: 0,
      blockers: []
    },
    conflictGraph: {
      chassisInfo: { id: options.chassis || 'DL380_Gen12', model: options.chassis || 'DL380 Gen12' },
      rankedSolutions: options.rankedSolutions || [
        {
          rank: 1,
          name: 'Rank 1 Baseline',
          estimatedCostUsd: 12500,
          pricingComplete: true,
          physicalMathClean: true,
          skuPartsList: [
            { sku: 'P73282-B21', quantity: 1, category: 'Chassis Base', unitPriceUsd: 4500, description: 'DL380 Gen12 CTO Server' },
            { sku: 'P52560-B21', quantity: 2, category: 'Processor', unitPriceUsd: 4000, description: 'Intel Xeon Gold 6526Y' }
          ]
        },
        {
          rank: 2,
          name: 'Rank 2 Performance',
          estimatedCostUsd: 15500,
          pricingComplete: true,
          physicalMathClean: true,
          skuPartsList: [
            { sku: 'P73282-B21', quantity: 1, category: 'Chassis Base', unitPriceUsd: 4500, description: 'DL380 Gen12 CTO Server' },
            { sku: 'P74845-B21', quantity: 2, category: 'Processor', unitPriceUsd: 5500, description: 'Intel Xeon Gold 6530' }
          ]
        }
      ]
    },
    items: [
      { sku: 'RAW-SKU-1', quantity: 10, description: 'Raw Input Item' }
    ]
  };

  if (options.omitAuth) return baseEval;
  const fingerprint = deliveryFingerprint(baseEval);
  let deliveryAuthorization = issueDeliveryAuthorization({
    manifestFingerprint: fingerprint,
    chassisKey: baseEval.chassis,
    acceptanceDecision: { isApproved: true, profile: 'BOQ_EVALUATION' }
  });
  if (options.expiredAuth) {
    deliveryAuthorization = {
      ...deliveryAuthorization,
      issuedAt: new Date(Date.now() - 7200 * 1000).toISOString(),
      expiresAt: new Date(Date.now() - 3600 * 1000).toISOString()
    };
  }
  if (options.tamperAuthSignature) {
    deliveryAuthorization = {
      ...deliveryAuthorization,
      signature: 'a'.repeat(64),
      token: `DELIV-AUTH-${'a'.repeat(64)}`
    };
  }
  return {
    ...baseEval,
    manifestFingerprint: fingerprint,
    deliveryAuthorization
  };
}

function seedServerRun(runId, evalObj, product = 'DL380_Gen12') {
  runState.captureEvent({ type: 'TASK_STARTED', task: 'EVAL_BOQ', runId, product });
  runState.captureEvent({
    type: 'EVAL_RESULT',
    runId,
    data: {
      status: evalObj.customerDisposition === 'DELIVERY_BLOCKED_UNBUILDABLE' ? 'ACTION_REQUIRED' : 'SUCCESS',
      chassisPrefix: product,
      evalResults: evalObj
    }
  });
  runState.captureEvent({ type: 'TASK_COMPLETED', task: 'EVAL_BOQ', runId, code: 0, durationMs: 25 });
}

function startEphemeralRouterServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use('/artifacts', express.static(OUTPUTS_DIR));
  app.use('/api', evaluationRouter);
  app.use('/api', catalogsRouter);
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port });
    });
  });
}

async function postJson(port, urlPath, body) {
  const res = await fetch(`http://127.0.0.1:${port}${urlPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  return { status: res.status, data };
}

after(() => {
  for (const fp of createdArtifacts) {
    try { if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch (_) {}
  }
  if (previousRunsDir === undefined) delete process.env.DASHBOARD_RUNS_DIR;
  else process.env.DASHBOARD_RUNS_DIR = previousRunsDir;
  if (previousSecret === undefined) delete process.env.DELIVERY_AUTH_SECRET;
  else process.env.DELIVERY_AUTH_SECRET = previousSecret;
  try { fs.rmSync(tmpRunsDir, { recursive: true, force: true }); } catch (_) {}
});

describe('P0 · Export Candidate & Authorization Enforcement', () => {
  it('1. Rejects nonexistent & invalid ranks across strict parser and customer/diagnostic writers without raw BOM fallback', () => {
    const authorizedEval = makeCandidateEval();
    assert.throws(() => _parseStrictRankTier(0), /positive integer/i);
    assert.throws(() => _parseStrictRankTier(-2), /positive integer/i);
    assert.throws(() => _parseStrictRankTier(1.5), /positive integer/i);
    assert.throws(() => _parseStrictRankTier(true), /positive integer/i);
    assert.throws(() => _parseStrictRankTier('abc'), /positive integer/i);
    assert.equal(_parseStrictRankTier(undefined), 1);
    assert.equal(_parseStrictRankTier('2'), 2);

    for (const diagnostic of [true, false]) {
      assert.throws(
        () => generateProfessionalBOQ(authorizedEval, null, 'DL380_Gen12', 999, { diagnostic }),
        err => /Strategy Rank 999 does not exist|not found/i.test(err.message)
      );
    }

    const emptyCandidateEval = makeCandidateEval({
      rankedSolutions: [{ rank: 1, name: 'Empty Candidate', skuPartsList: [] }]
    });
    assert.throws(
      () => generateRankedPortalWorkbook(emptyCandidateEval, null, { diagnostic: false }),
      err => /without validated candidate BOM items/i.test(err.message)
    );
    assert.throws(
      () => generateMultiRankSolutionWorkbook(emptyCandidateEval, null, 'DL380_Gen12', { diagnostic: false }),
      err => /without validated candidate solutions/i.test(err.message)
    );
    assert.throws(
      () => generateMultiRankSolutionCsv(emptyCandidateEval, null, { diagnostic: false }),
      err => /without validated candidate CSV|without validated candidate solutions/i.test(err.message)
    );
  });

  it('2. Rejects customer export when acceptanceGate fails or DeliveryAuthorization is invalid', () => {
    const invalidEval = makeCandidateEval({
      omitAuth: true,
      acceptanceGate: { isValid: false, blockersCount: 2 }
    });
    assert.throws(
      () => generateProfessionalBOQ(invalidEval, null, 'DL380_Gen12', 1, { diagnostic: false }),
      err => /Pre-presentation acceptance failed/i.test(err.message)
    );
  });

  it('3. Internal diagnostic workbook is visibly marked with [INTERNAL DIAGNOSTIC] across summary and BOM sheets', () => {
    const authorizedEval = makeCandidateEval();
    const tmpPath = path.join(os.tmpdir(), `temp_diagnostic_test_${Date.now()}.xlsx`);
    trackArtifact(tmpPath);
    generateProfessionalBOQ(authorizedEval, tmpPath, 'DL380_Gen12', 1, { diagnostic: true });
    assert.ok(fs.existsSync(tmpPath));

    const wb = XLSX.readFile(tmpPath);
    assert.ok(wb.Sheets['Summary']);
    const cellA1 = String(wb.Sheets['Summary']['A1']?.v || '');
    assert.ok(cellA1.includes('[INTERNAL DIAGNOSTIC]'), `A1 should contain [INTERNAL DIAGNOSTIC], got: ${cellA1}`);
    const baseSheet = wb.Sheets['Base BOM'];
    assert.ok(baseSheet, 'Expected Base BOM sheet');
    const roleCell = String(baseSheet['G2']?.v || '');
    assert.ok(roleCell.includes('INTERNAL DIAGNOSTIC'), `Base BOM G2 should indicate INTERNAL DIAGNOSTIC, got: ${roleCell}`);
  });

  it('4. Customer export HTTP routes reject diagnostic overrides, bad/missing ranks, missing runs, invalid/expired auth, item/product tampering, and blocked candidates with zero files or history entries', async () => {
    const { server, port } = await startEphemeralRouterServer();
    try {
      const exportsDir = path.join(OUTPUTS_DIR, 'temp', 'exports');
      const histDir = path.join(OUTPUTS_DIR, 'history', 'exports');
      const beforeExports = fs.existsSync(exportsDir) ? new Set(fs.readdirSync(exportsDir)) : new Set();
      const beforeHist = fs.existsSync(histDir) ? new Set(fs.readdirSync(histDir)) : new Set();

      const validEval = makeCandidateEval();
      const validRunId = `run_auth_valid_${Date.now()}`;
      seedServerRun(validRunId, validEval, 'DL380_Gen12');

      const blockedEval = makeCandidateEval({
        omitAuth: true,
        isMathClean: false,
        customerDisposition: 'DELIVERY_BLOCKED_UNBUILDABLE',
        acceptanceGate: { isValid: false, blockersCount: 1, blockers: [{ id: 'B1', detail: 'Missing High Perf Fans' }] }
      });
      const blockedRunId = `run_blocked_${Date.now()}`;
      seedServerRun(blockedRunId, blockedEval, 'DL380_Gen12');

      const expiredEval = makeCandidateEval({ expiredAuth: true });
      const expiredRunId = `run_expired_${Date.now()}`;
      seedServerRun(expiredRunId, expiredEval, 'DL380_Gen12');

      const tamperedEval = makeCandidateEval({ tamperAuthSignature: true });
      const tamperedRunId = `run_tampered_${Date.now()}`;
      seedServerRun(tamperedRunId, tamperedEval, 'DL380_Gen12');

      // Diagnostic overrides prohibited on customer export routes
      const diagOverride = await postJson(port, '/api/export-boq', { runId: validRunId, chassisId: 'DL380_Gen12', rankTier: 1, diagnostic: true });
      assert.equal(diagOverride.status, 400);
      assert.equal(diagOverride.data.code, 'DIAGNOSTIC_OVERRIDE_REJECTED');

      const diagOverrideXlsx = await postJson(port, '/api/export-boq-xlsx', { runId: validRunId, chassisId: 'DL380_Gen12', rankTier: 1, isDiagnostic: true });
      assert.equal(diagOverrideXlsx.status, 400);
      assert.equal(diagOverrideXlsx.data.code, 'DIAGNOSTIC_OVERRIDE_REJECTED');

      // Invalid & nonexistent ranks rejected
      const zeroRank = await postJson(port, '/api/export-boq', { runId: validRunId, chassisId: 'DL380_Gen12', rankTier: 0 });
      assert.equal(zeroRank.status, 422);
      assert.equal(zeroRank.data.code, 'INVALID_RANK');

      const missingRank = await postJson(port, '/api/export-boq-xlsx', { runId: validRunId, chassisId: 'DL380_Gen12', rankTier: 999 });
      assert.equal(missingRank.status, 422);
      assert.equal(missingRank.data.code, 'UNSUPPORTED_RANK');

      // Unknown runId rejected
      const unknownRun = await postJson(port, '/api/export-boq', { runId: 'run_does_not_exist', chassisId: 'DL380_Gen12', rankTier: 1 });
      assert.equal(unknownRun.status, 404);
      assert.equal(unknownRun.data.code, 'RUN_NOT_FOUND');

      // Product mismatch rejected
      const prodMismatch = await postJson(port, '/api/export-boq', { runId: validRunId, chassisId: 'Alletra_9000', rankTier: 1 });
      assert.equal(prodMismatch.status, 409);
      assert.equal(prodMismatch.data.code, 'PRODUCT_MISMATCH');

      // Quantity / item tampering rejected
      const qtyTamper = await postJson(port, '/api/export-boq-xlsx', {
        runId: validRunId,
        chassisId: 'DL380_Gen12',
        rankTier: 1,
        items: [{ sku: 'P73282-B21', quantity: 99 }, { sku: 'P52560-B21', quantity: 2 }]
      });
      assert.equal(qtyTamper.status, 409);
      assert.equal(qtyTamper.data.code, 'CANDIDATE_MISMATCH');

      // Blocked, expired, and tampered authorization runs rejected
      const blockedRes = await postJson(port, '/api/export-boq', { runId: blockedRunId, chassisId: 'DL380_Gen12', rankTier: 1 });
      assert.equal(blockedRes.status, 422);
      assert.equal(blockedRes.data.code, 'CANDIDATE_BLOCKED');

      const expiredRes = await postJson(port, '/api/export-boq', { runId: expiredRunId, chassisId: 'DL380_Gen12', rankTier: 1 });
      assert.equal(expiredRes.status, 403);
      assert.equal(expiredRes.data.code, 'DELIVERY_NOT_AUTHORIZED');

      const tamperedRes = await postJson(port, '/api/export-boq', { runId: tamperedRunId, chassisId: 'DL380_Gen12', rankTier: 1 });
      assert.equal(tamperedRes.status, 403);
      assert.equal(tamperedRes.data.code, 'DELIVERY_NOT_AUTHORIZED');

      // Verify zero customer files or history entries created by rejected requests
      const afterExports = fs.existsSync(exportsDir) ? fs.readdirSync(exportsDir) : [];
      const afterHist = fs.existsSync(histDir) ? fs.readdirSync(histDir) : [];
      assert.deepEqual(afterExports.filter(f => !beforeExports.has(f)), []);
      assert.deepEqual(afterHist.filter(f => !beforeHist.has(f)), []);
    } finally {
      server.close();
    }
  });

  it('5. Authorized customer export generates server-bound workbook, verifies artifact bytes/cells/digests/history, and isolates diagnostic exports from customer history', async () => {
    const { server, port } = await startEphemeralRouterServer();
    try {
      const validEval = makeCandidateEval();
      const runId = `run_authorized_download_${Date.now()}`;
      seedServerRun(runId, validEval, 'DL380_Gen12');

      const expRes = await postJson(port, '/api/export-boq-xlsx', {
        runId,
        chassisId: 'DL380_Gen12',
        rankTier: 2,
        items: [
          { sku: 'P73282-B21', quantity: 1 },
          { sku: 'P74845-B21', quantity: 2 }
        ]
      });
      assert.equal(expRes.status, 200, JSON.stringify(expRes.data));
      assert.equal(expRes.data.success, true);
      assert.equal(expRes.data.runId, runId);
      assert.equal(expRes.data.rank, 2);
      assert.match(expRes.data.candidateSha256, /^[a-f0-9]{64}$/);
      assert.match(expRes.data.workbookSha256, /^[a-f0-9]{64}$/);
      assert.equal(expRes.data.evidenceState.vendorAcceptance, 'PORTAL_VALIDATION_PENDING');
      assert.equal(expRes.data.evidenceState.deliveryAuthorization, 'AUTHORIZED');

      const exportedFile = path.join(OUTPUTS_DIR, 'temp', 'exports', expRes.data.filename);
      trackArtifact(exportedFile);
      const histDir = path.join(OUTPUTS_DIR, 'history', 'exports');
      const histFile = fs.readdirSync(histDir)
        .filter(f => f.endsWith('.json'))
        .find(f => {
          const parsed = JSON.parse(fs.readFileSync(path.join(histDir, f), 'utf8'));
          return parsed.runId === runId && parsed.filename === expRes.data.filename;
        });
      assert.ok(histFile, 'Export metadata JSON must exist in history/exports');
      trackArtifact(path.join(histDir, histFile));

      // Download bytes over HTTP /artifacts and compare SHA-256 and workbook cells against Rank 2
      const dlRes = await fetch(`http://127.0.0.1:${port}${expRes.data.downloadPath}`);
      assert.equal(dlRes.status, 200);
      const buf = Buffer.from(await dlRes.arrayBuffer());
      const actualHash = crypto.createHash('sha256').update(buf).digest('hex');
      assert.equal(actualHash, expRes.data.workbookSha256);

      const wb = XLSX.read(buf, { type: 'buffer' });
      const summaryA1 = String(wb.Sheets['Summary']?.['A1']?.v || '');
      assert.ok(summaryA1.includes('STRATEGY RANK 2'), `Expected Rank 2 summary title, got: ${summaryA1}`);
      assert.ok(!summaryA1.includes('INTERNAL DIAGNOSTIC'));
      const baseBomSheet = wb.Sheets['Base BOM'];
      assert.ok(baseBomSheet, 'Workbook must contain Base BOM sheet');
      const rows = XLSX.utils.sheet_to_json(baseBomSheet, { header: 1 });
      const rowPairs = rows.map(r => [r[0], r[1]]);
      assert.ok(rowPairs.some(([sku, qty]) => sku === 'P73282-B21' && qty === 1), 'Must preserve P73282-B21 qty 1');
      assert.ok(rowPairs.some(([sku, qty]) => sku === 'P74845-B21' && qty === 2), 'Must preserve P74845-B21 qty 2');
      assert.ok(!rowPairs.some(([sku]) => sku === 'RAW-SKU-1'), 'Must not include raw unvalidated items');

      // Generate isolated internal diagnostic workbook and assert exclusion from customer history
      const diagRes = await postJson(port, '/api/export-boq-diagnostic', { runId, chassisId: 'DL380_Gen12', rankTier: 1 });
      assert.equal(diagRes.status, 200);
      assert.equal(diagRes.data.diagnostic, true);
      assert.ok(diagRes.data.filename.includes('INTERNAL_DIAGNOSTIC'));
      const diagFile = path.join(OUTPUTS_DIR, 'temp', 'diagnostic_exports', diagRes.data.filename);
      trackArtifact(diagFile);

      const diagDl = await fetch(`http://127.0.0.1:${port}${diagRes.data.downloadPath}`);
      const diagWb = XLSX.read(Buffer.from(await diagDl.arrayBuffer()), { type: 'buffer' });
      assert.ok(String(diagWb.Sheets['Summary']?.['A1']?.v || '').includes('[INTERNAL DIAGNOSTIC]'));

      const historyRes = await fetch(`http://127.0.0.1:${port}/api/history/exports?limit=25`).then(r => r.json());
      assert.ok(historyRes.some(h => h.runId === runId && h.workbookSha256 === expRes.data.workbookSha256));
      assert.ok(!historyRes.some(h => String(h.filename || '').includes('INTERNAL_DIAGNOSTIC') || h.isDiagnostic === true));
    } finally {
      server.close();
    }
  });
});
