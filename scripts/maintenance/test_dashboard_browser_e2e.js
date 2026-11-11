'use strict';
/**
 * scripts/maintenance/test_dashboard_browser_e2e.js
 *
 * Order 5 Isolated Offline Browser Release Gate:
 * - Spawns dashboard/server.cjs --production on an ephemeral port with isolated
 *   DASHBOARD_RUNS_DIR, OFFLINE_MODE=1, LOCAL_EVAL_ONLY=1, and shared DELIVERY_AUTH_SECRET.
 * - Blocks ALL external non-loopback network requests across every Playwright context.
 * - Exercises real Order 1–5 user journeys, downloads/parses .xlsx artifacts, validates
 *   two-tab recovery/cancel/restart/reopen, non-DL380 evaluated topology, accessibility,
 *   mobile responsiveness, and writes machine-readable release evidence JSON.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');
const http = require('http');
const crypto = require('crypto');
const assert = require('assert');
const { spawn, execSync, execFileSync } = require('child_process');
const { chromium } = require('playwright');
const XLSX = require('xlsx-js-style');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const OUTPUTS_DIR = path.join(PROJECT_ROOT, 'outputs');
const TEMP_DIR = path.join(OUTPUTS_DIR, 'temp');
const DIAG_EXPORT_DIR = path.join(TEMP_DIR, 'diagnostic_exports');
const EXPORTS_DIR = path.join(OUTPUTS_DIR, 'history', 'exports');
const RELEASE_EVIDENCE_PATH = path.join(OUTPUTS_DIR, 'history', 'dashboard_release_evidence.json');

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

function getGitCommitSha() {
  try {
    return execSync('git rev-parse HEAD', { cwd: PROJECT_ROOT, encoding: 'utf8' }).trim();
  } catch {
    return 'UNKNOWN';
  }
}

function listFilesSnapshot(dirPath) {
  const found = new Set();
  if (!fs.existsSync(dirPath)) return found;
  const walk = (cur) => {
    for (const entry of fs.readdirSync(cur, { withFileTypes: true })) {
      const full = path.join(cur, entry.name);
      if (entry.isDirectory()) walk(full);
      else found.add(full);
    }
  };
  walk(dirPath);
  return found;
}

function cleanupNewFiles(dirPath, baseline) {
  if (!fs.existsSync(dirPath)) return;
  for (const full of listFilesSnapshot(dirPath)) {
    if (!baseline.has(full)) {
      try { fs.rmSync(full, { force: true }); } catch { /* ignore */ }
    }
  }
}

async function waitForHealth(baseUrl, timeoutMs = 25000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await apiJson(`${baseUrl}/api/health`);
      if (res.ok) return res.body;
    } catch { /* retrying */ }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error(`Dashboard server did not become healthy at ${baseUrl}`);
}

async function startIsolatedServer({ port, runsDir, authSecret, extraEnv = {} }) {
  const proc = spawn(process.execPath, ['dashboard/server.cjs', '--production'], {
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
      DASHBOARD_RUNS_DIR: runsDir,
      OFFLINE_MODE: '1',
      LOCAL_EVAL_ONLY: '1',
      DELIVERY_AUTH_SECRET: authSecret,
      ...extraEnv
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let logs = '';
  proc.stdout.on('data', d => { logs += d.toString(); });
  proc.stderr.on('data', d => { logs += d.toString(); });
  try {
    await waitForHealth(`http://127.0.0.1:${port}`);
    return { proc, getLogs: () => logs };
  } catch (err) {
    await stopServer(proc);
    throw new Error(`${err.message}\nServer logs:\n${logs}`);
  }
}

async function stopServer(proc) {
  if (!proc || proc.exitCode !== null) return;
  const exited = new Promise(resolve => {
    const t = setTimeout(resolve, 3000);
    proc.once('exit', () => { clearTimeout(t); resolve(); });
  });
  if (process.platform === 'win32' && proc.pid) {
    try {
      execFileSync('taskkill', ['/PID', String(proc.pid), '/T', '/F'], { stdio: 'ignore' });
      await exited;
      await new Promise(r => setTimeout(r, 200));
      return;
    } catch { /* fall through */ }
  }
  proc.kill('SIGTERM');
  await exited;
}

function isAllowedLocalUrl(rawUrl) {
  if (/^(?:data:|blob:|about:)/i.test(rawUrl)) return true;
  try {
    const parsed = new URL(rawUrl);
    return ['127.0.0.1', 'localhost'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function isExpectedNegativeResourceError(msgText) {
  return /Failed to load resource: the server responded with a status of (?:403|404|409|410|422)/i.test(msgText || '');
}

function isExpectedRestartNetworkError(msgText) {
  return /Failed to load resource: net::ERR_CONNECTION_(?:RESET|REFUSED|ABORTED)/i.test(msgText || '');
}

async function createGuardedContext(browser, telemetry) {
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 920 } });
  await context.route('**/*', route => {
    const url = route.request().url();
    if (isAllowedLocalUrl(url)) return route.continue();
    telemetry.externalAttempts.push(url);
    return route.abort('blockedbyclient');
  });
  return context;
}

function attachPageMonitors(page, telemetry) {
  page.on('pageerror', err => telemetry.pageErrors.push(err.message));
  page.on('console', msg => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (isExpectedNegativeResourceError(text)) return;
    if (telemetry.allowRestartDisconnect && isExpectedRestartNetworkError(text)) return;
    telemetry.consoleErrors.push(text);
  });
  page.on('response', res => {
    if (res.status() >= 500) telemetry.server5xx.push(`${res.status()} ${res.url()}`);
  });
}

async function selectHeaderChassis(page, searchText) {
  const trigger = page.locator('button', { hasText: /Chassis Context/i }).first();
  await trigger.click();
  const input = page.locator('input[aria-label="Search products"]');
  await input.fill(searchText);
  const optionBtn = page.locator('div.max-h-56 button', { hasText: new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }).first();
  await optionBtn.click();
}

function apiJson(rawUrl, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(rawUrl);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: `${parsed.pathname}${parsed.search}`,
      method: options.method || 'GET',
      headers: options.headers ? { Connection: 'close', ...options.headers } : { Connection: 'close' },
      agent: false
    }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        let body = {};
        try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }
        resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, body });
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function pollRunCompletion(baseUrl, runId, timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;
  let lastRun = null;
  while (Date.now() < deadline) {
    const res = await apiJson(`${baseUrl}/api/run/${encodeURIComponent(runId)}`);
    const run = res.body?.run || res.body;
    if (run) lastRun = run;
    if (run && ['COMPLETED', 'FAILED', 'CANCELLED', 'INTERRUPTED', 'ACTION_REQUIRED'].includes(run.status)) {
      if (run.result || run.evalResult || run.queryResult || run.status !== 'COMPLETED') return run;
    }
    await new Promise(r => setTimeout(r, 350));
  }
  throw new Error(`Timed out waiting for run ${runId} to finish (lastStatus=${lastRun?.status})`);
}

function buildMinimalPngBuffer() {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64'
  );
}

async function uploadFixtureViaApi(baseUrl, filename, contentBuffer, mimeType) {
  const form = new FormData();
  form.append('boqFile', new Blob([contentBuffer], { type: mimeType }), filename);
  const res = await fetch(`${baseUrl}/api/upload-boq`, { method: 'POST', body: form });
  assert.strictEqual(res.status, 200, `Upload failed for ${filename}`);
  return res.json();
}

async function openBoqUploaderModal(page) {
  const existingInput = page.locator('#boq-file-input');
  if (await existingInput.count() > 0 && await page.getByRole('dialog').isVisible().catch(() => false)) {
    return page.getByRole('dialog');
  }
  await page.getByRole('button', { name: /Load \/ Evaluate BOQ|Load BOQ & Evaluate/i }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ timeout: 5000 });
  return dialog;
}

async function verifyOrder1OfflinePolicy(page, baseUrl, telemetry) {
  const uploaderDialog = await openBoqUploaderModal(page);
  const localCheckbox = uploaderDialog.getByRole('checkbox', { name: /Use local catalog only/i }).first();
  assert.strictEqual(await localCheckbox.isChecked(), true, 'Local-only must default to enabled under OFFLINE_MODE');

  // UI alert on PDF selection under local-only mode
  await page.locator('#boq-file-input').setInputFiles({
    name: 'release_gate_quote.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n')
  });
  await page.getByRole('alert').filter({ hasText: /PDF and image files cannot be sent to cloud OCR/i }).waitFor({ timeout: 5000 });
  await page.keyboard.press('Escape');
  await uploaderDialog.waitFor({ state: 'detached', timeout: 5000 });

  // Server-side enforcement with conflicting offlineMode=false on both PDF and PNG
  const pdfUpload = await uploadFixtureViaApi(baseUrl, 'gate.pdf', Buffer.from('%PDF-1.4\n%%EOF'), 'application/pdf');
  const pngUpload = await uploadFixtureViaApi(baseUrl, 'gate.png', buildMinimalPngBuffer(), 'image/png');

  for (const endpoint of ['/api/preprocess-boq', '/api/eval-boq']) {
    for (const fileInfo of [pdfUpload, pngUpload]) {
      const resp = await apiJson(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filepath: fileInfo.filepath, offline: false, offlineMode: false, enableCloudValidation: true })
      });
      assert.strictEqual(resp.status, 422, `${endpoint} must return 422 offline block for ${fileInfo.filename}`);
      assert.strictEqual(resp.body.effectivePolicy?.offline, true);
    }
  }

  const routePng = await apiJson(`${baseUrl}/api/query/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'Convert this scanned quote PDF',
      context: { filePath: pngUpload.filepath, offline: false, offlineMode: false }
    })
  });
  assert.strictEqual(routePng.status, 422, '/api/query/route must block image OCR when offline policy is active');
  assert.strictEqual(telemetry.externalAttempts.length, 0, 'Order 1 must trigger zero external calls');
}

async function verifyOrder4SizingAndMatrixHandoff(page, baseUrl) {
  await selectHeaderChassis(page, 'DL380 Gen12');
  await page.getByRole('button', { name: /Sizing \(4x DL380\)/i }).click();
  await page.getByRole('button', { name: /Identify workflow/i }).click();
  await page.getByRole('button', { name: /Run workflow/i }).waitFor({ timeout: 10000 });

  // Switch header product before running workflow & before clicking Evaluate in 5-Tier Matrix
  await selectHeaderChassis(page, 'DL360 Gen11');
  await page.getByRole('button', { name: /Run workflow/i }).click();

  const summary = page.getByTestId('candidate-reference-summary');
  await summary.waitFor({ timeout: 30000 });
  const summaryText = await summary.textContent();
  assert(summaryText.includes('DL380_Gen12') || summaryText.includes('DL380 Gen12'), `Expected originating DL380 product, got: ${summaryText}`);
  assert(summaryText.includes('CLUSTER_MULTIPLIED'), `Expected CLUSTER_MULTIPLIED scope, got: ${summaryText}`);

  const evalReqPromise = page.waitForResponse(r => r.url().includes('/api/eval-boq') && r.request().method() === 'POST');
  await page.getByRole('button', { name: /Evaluate in 5-Tier Matrix/i }).click();
  const evalHttpRes = await evalReqPromise;
  const acceptedBody = await evalHttpRes.json();
  assert.strictEqual(evalHttpRes.status(), 202);
  assert.strictEqual(acceptedBody.product, 'DL380_Gen12', 'Server must evaluate originating DL380_Gen12, not switched DL360_Gen11');

  const completedRun = await pollRunCompletion(baseUrl, acceptedBody.runId);
  await page.locator('[data-tab="matrix"]').click();
  const clusterBanner = page.getByTestId('cluster-sizing-banner');
  await clusterBanner.waitFor({ timeout: 15000 });
  assert((await clusterBanner.textContent()).includes('4x Nodes'), 'Matrix must show 4x Nodes cluster sizing banner');

  const deliveryBanner = page.getByTestId('delivery-auth-banner');
  await deliveryBanner.waitFor({ timeout: 10000 });
  assert(/EXPORT_BLOCKED|DELIVERY_BLOCKED/i.test(await deliveryBanner.textContent()), 'Offline eval run must remain blocked from customer XLSX export');
  const exportBtn = page.getByRole('button', { name: /Export XLSX/i }).first();
  assert.strictEqual(await exportBtn.isDisabled(), true, 'Export XLSX button must be disabled when Delivery Authorization is blocked');

  // Verify incomplete sizing requires clarification & omits one-click Matrix handoff
  await page.locator('[data-tab="orchestrator"]').click();
  const textarea = page.getByPlaceholder(/Size 4 nodes/i);
  await textarea.fill('Size 2 nodes of DL380 Gen12 with 64 cores');
  await page.getByRole('button', { name: /Identify workflow/i }).click();
  await page.getByRole('button', { name: /Run workflow/i }).waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: /Run workflow/i }).click();
  const clarifyAlert = page.getByRole('alert').filter({ hasText: /Human Clarification Required/i });
  await clarifyAlert.waitFor({ timeout: 25000 });
  assert(/Memory|Drive Cage/i.test(await clarifyAlert.textContent()), 'Incomplete sizing must name missing requirements');
  assert.strictEqual(await page.getByRole('button', { name: /Evaluate in 5-Tier Matrix/i }).count(), 0);

  return completedRun.runId;
}

function seedAuthorizedMultiNodeRun(runsDir, authSecret) {
  const { deliveryFingerprint } = require(path.join(PROJECT_ROOT, 'scripts/lib/boq/solution_evidence.js'));
  const { issueDeliveryAuthorization } = require(path.join(PROJECT_ROOT, 'scripts/lib/contracts/workflow_contract.js'));

  const previousSecret = process.env.DELIVERY_AUTH_SECRET;
  process.env.DELIVERY_AUTH_SECRET = authSecret;
  try {
    const runId = 'run_auth_e2e_release';
    const parts = [
      { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', category: 'Chassis', quantity: 1, configurationMultiplier: 4, totalQuantity: 4, perNodeQuantity: 1, unitPriceUsd: 2500, quantityScope: 'configuration' },
      { sku: 'P74845-B21', description: 'Intel Xeon Gold 6530 Processor', category: 'Processors', quantity: 2, configurationMultiplier: 4, totalQuantity: 8, perNodeQuantity: 2, unitPriceUsd: 3000, quantityScope: 'configuration' },
      { sku: 'HU4B2A3', description: 'HPE 3Y Tech Care Basic Service', category: 'Services', quantity: 1, configurationMultiplier: 1, totalQuantity: 1, unitPriceUsd: 1200, quantityScope: 'global' }
    ];
    const rank1 = {
      rank: 1,
      name: 'Rank 1: Intent-Preserving Solution',
      score: 0.96,
      estimatedCostUsd: 35200,
      knownOrderSubtotalUsd: 35200,
      totalOrderCostUsd: 35200,
      pricingComplete: true,
      skuPartsList: parts,
      skuList: parts
    };
    const coreEval = {
      chassis: 'DL380_Gen12',
      chassisDir: path.join(OUTPUTS_DIR, 'ProLiant', 'Gen12', 'DL380_Gen12'),
      serverCount: 4,
      nodeCount: 4,
      quantityBasis: 'CLUSTER_MULTIPLIED',
      status: 'SUCCESS',
      isMathClean: true,
      items: parts,
      acceptanceGate: { isValid: true, status: 'PASSED', blockersCount: 0, blockers: [], warnings: [] },
      conflictGraph: { isWholeSolutionValid: true, rankedSolutions: [rank1], resolvedFixes: [] },
      confidence: { score: 0.96, deductions: [], isHitlTriggered: false },
      clusterSizing: {
        totalServers: 4,
        totalRackUnits: 8,
        standard42uRacksRequired: 1,
        totalFacilityPowerKw: 6.4,
        needsHighLine220v: true,
        railKitCoverage: { isCompliant: true }
      }
    };
    const manifestFingerprint = deliveryFingerprint(coreEval);
    const deliveryAuthorization = issueDeliveryAuthorization({
      manifestFingerprint,
      chassisKey: 'DL380_Gen12',
      acceptanceDecision: {
        isApproved: true,
        profile: 'BOQ_EVALUATION',
        evaluatedChecksCount: 18,
        passedChecks: ['B1', 'B19'],
        failedChecks: [],
        blockingErrors: [],
        warnings: []
      }
    });
    const fullData = {
      ...coreEval,
      runId,
      manifestFingerprint,
      deliveryAuthorization,
      customerDisposition: 'DELIVERY_AUTHORIZED',
      portalValidationStatus: 'PORTAL_VALIDATION_PENDING',
      evalResults: { ...coreEval, manifestFingerprint, deliveryAuthorization }
    };
    fs.writeFileSync(path.join(runsDir, `${runId}.json`), JSON.stringify({
      runId,
      task: 'EVAL_BOQ',
      product: 'DL380_Gen12',
      startTime: Date.now() - 5000,
      updatedAt: Date.now(),
      durationMs: 2500,
      status: 'COMPLETED',
      exitCode: 0,
      result: { type: 'EVAL_RESULT', runId, data: fullData }
    }, null, 2));
    return { runId, rank1, manifestFingerprint };
  } finally {
    if (previousSecret === undefined) delete process.env.DELIVERY_AUTH_SECRET;
    else process.env.DELIVERY_AUTH_SECRET = previousSecret;
  }
}

function readWorkbookSheetText(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const textBySheet = {};
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' });
    textBySheet[name] = rows.map(r => r.join(' | ')).join('\n');
  }
  return { sheetNames: wb.SheetNames, textBySheet, combinedText: Object.values(textBySheet).join('\n') };
}

async function verifyOrder2Exports(page, baseUrl, offlineRunId, runsDir, authSecret) {
  // 1. Offline run must reject customer export & diagnostic override / unknown rank
  const blockedRes = await apiJson(`${baseUrl}/api/export-boq`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId: offlineRunId, rank: 1, chassisId: 'DL380_Gen12' })
  });
  assert(
    [403, 422].includes(blockedRes.status),
    `Offline blocked run must fail /api/export-boq with 403 or 422, got ${blockedRes.status}`
  );

  const overrideRes = await apiJson(`${baseUrl}/api/export-boq`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId: offlineRunId, rank: 1, diagnostic: true, allowDiagnostic: true, chassisId: 'DL380_Gen12' })
  });
  assert.strictEqual(overrideRes.status, 400, 'Diagnostic override on customer /api/export-boq must be rejected with 400');
  assert.strictEqual(overrideRes.body.code, 'DIAGNOSTIC_OVERRIDE_REJECTED');

  const unknownRankRes = await apiJson(`${baseUrl}/api/export-boq`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId: offlineRunId, rank: 99, chassisId: 'DL380_Gen12' })
  });
  assert.strictEqual(unknownRankRes.status, 422, 'Unknown rank must return 422');
  assert.strictEqual(unknownRankRes.body.code, 'UNSUPPORTED_RANK');

  // 2. Diagnostic export produces marked workbook & stays out of customer export history
  const diagRes = await apiJson(`${baseUrl}/api/export-boq-diagnostic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId: offlineRunId, rank: 1, chassisId: 'DL380_Gen12' })
  });
  assert.strictEqual(diagRes.status, 200, 'Diagnostic export endpoint must succeed');
  const diagDownload = await page.request.get(`${baseUrl}${diagRes.body.downloadPath}`);
  const diagBuf = await diagDownload.body();
  assert.strictEqual(diagBuf.subarray(0, 2).toString('utf8'), 'PK', 'Diagnostic export must be a valid .xlsx zip');
  const parsedDiag = readWorkbookSheetText(diagBuf);
  assert(parsedDiag.combinedText.includes('[INTERNAL DIAGNOSTIC]'), 'Diagnostic workbook must show [INTERNAL DIAGNOSTIC]');

  const histBefore = await apiJson(`${baseUrl}/api/history/exports`);
  assert(!JSON.stringify(histBefore.body).includes(diagRes.body.filename), 'Customer export history must exclude diagnostic workbooks');

  // 3. Reopen isolated signed run in Pipeline Ops & click real UI Export XLSX
  const seeded = seedAuthorizedMultiNodeRun(runsDir, authSecret);
  const histRunsCheck = await apiJson(`${baseUrl}/api/history/runs`);
  const seededSummary = Array.isArray(histRunsCheck.body)
    ? histRunsCheck.body.find(r => r.runId === seeded.runId)
    : null;
  assert(seededSummary, `/api/history/runs must expose seeded run ${seeded.runId}, got ${JSON.stringify(histRunsCheck.body?.slice?.(0, 3))}`);
  assert.strictEqual(seededSummary.hasRecoverableResult, true, `Seeded run summary must have hasRecoverableResult=true: ${JSON.stringify(seededSummary)}`);

  await page.locator('[data-tab="pipeline"]').click();
  await page.getByPlaceholder(/Search run ID/i).fill(seeded.runId);
  const seededRow = page.locator('tr', { hasText: seeded.runId });
  if (await seededRow.count() === 0) {
    const refreshBtn = page.getByRole('button', { name: /Refresh/i }).first();
    if (await refreshBtn.isVisible().catch(() => false)) await refreshBtn.click();
  }
  await seededRow.waitFor({ timeout: 10000 });
  const reopenBtn = seededRow.getByRole('button', { name: /Reopen/i });
  await reopenBtn.waitFor({ timeout: 5000 });
  const reopenRespPromise = page.waitForResponse(r => r.url().includes(`/api/run/${seeded.runId}`) && r.request().method() === 'GET');
  await reopenBtn.click();
  const reopenHttpRes = await reopenRespPromise;
  assert.strictEqual(reopenHttpRes.status(), 200, `Reopen fetch /api/run/${seeded.runId} must return 200`);
  const reopenPayload = await reopenHttpRes.json().catch(() => ({}));
  assert(reopenPayload?.result || reopenPayload?.run?.result, `Reopen payload missing result: ${JSON.stringify(Object.keys(reopenPayload || {}))}`);

  const banner = page.getByTestId('delivery-auth-banner');
  await banner.waitFor({ timeout: 10000 });
  const bannerText = await banner.textContent();
  assert(/DELIVERY_AUTHORIZED/i.test(bannerText || ''), `Expected DELIVERY_AUTHORIZED banner after reopen, got: "${bannerText}" | alerts: "${await page.locator('[role="alert"]').allTextContents()}"`);
  const exportBtn = page.getByRole('button', { name: /Export XLSX/i }).first();
  assert.strictEqual(await exportBtn.isDisabled(), false, 'Authorized reopened run must enable Export XLSX');

  const exportRespPromise = page.waitForResponse(r => r.url().includes('/api/export-boq') && r.request().method() === 'POST');
  const popupPromise = page.waitForEvent('popup').catch(() => null);
  await exportBtn.click();
  const exportHttpRes = await exportRespPromise;
  const exportJson = await exportHttpRes.json();
  assert.strictEqual(exportHttpRes.status(), 200, `Customer export must succeed, got ${JSON.stringify(exportJson)}`);
  const popup = await popupPromise;
  if (popup) await popup.close().catch(() => {});

  const customerDownload = await page.request.get(`${baseUrl}${exportJson.downloadPath}`);
  assert.strictEqual(customerDownload.status(), 200);
  const custBuf = await customerDownload.body();
  assert.strictEqual(custBuf.subarray(0, 2).toString('utf8'), 'PK');
  const custSha = crypto.createHash('sha256').update(custBuf).digest('hex');

  const parsedCust = readWorkbookSheetText(custBuf);
  assert(!parsedCust.combinedText.includes('[INTERNAL DIAGNOSTIC]'), 'Authorized customer workbook must NEVER contain [INTERNAL DIAGNOSTIC]');
  for (const part of seeded.rank1.skuPartsList) {
    assert(parsedCust.combinedText.includes(part.sku), `Customer workbook missing candidate SKU ${part.sku}`);
  }

  await page.locator('[data-tab="artifacts"]').click();
  await page.locator(`a[download="${exportJson.filename}"]`).waitFor({ timeout: 10000 });
  await page.locator('text=' + seeded.runId).first().waitFor({ timeout: 10000 });
  const histAfter = await apiJson(`${baseUrl}/api/history/exports`);
  assert(JSON.stringify(histAfter.body).includes(exportJson.filename), 'Customer export must appear in /api/history/exports');

  return { customerWorkbookSha256: custSha, customerWorkbookFilename: exportJson.filename };
}

async function verifyOrder3LifecycleAndRestart(browser, port, serverRef, runsDir, authSecret, telemetry) {
  const baseUrl = `http://127.0.0.1:${port}`;
  const ctxA = await createGuardedContext(browser, telemetry);
  const ctxB = await createGuardedContext(browser, telemetry);
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();
  attachPageMonitors(pageA, telemetry);
  attachPageMonitors(pageB, telemetry);

  try {
    await pageA.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await pageB.goto(baseUrl, { waitUntil: 'domcontentloaded' });

    const boqCsv = fs.readFileSync(path.join(PROJECT_ROOT, 'tests/fixtures/cp0_locally_valid_dl380_gen12.csv'), 'utf8');
    const evalStart = await apiJson(`${baseUrl}/api/eval-boq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawText: boqCsv,
        chassisDir: path.join(OUTPUTS_DIR, 'ProLiant/Gen12/DL380_Gen12'),
        offline: true
      })
    });
    assert.strictEqual(evalStart.status, 202);
    const activeRunId = evalStart.body.runId;

    // Stale tab B attempting to cancel wrong runId must get 409 without stopping active run
    const staleKill = await apiJson(`${baseUrl}/api/kill-task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId: 'stale_wrong_run_id' })
    });
    assert.strictEqual(staleKill.status, 409, 'Mismatched runId kill must return 409');

    // Active tab A cancelling matching runId succeeds
    const activeKill = await apiJson(`${baseUrl}/api/kill-task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId: activeRunId })
    });
    assert.strictEqual(activeKill.status, 200, 'Matching active runId cancel must return 200');
    const cancelledRun = await pollRunCompletion(baseUrl, activeRunId);
    assert.strictEqual(cancelledRun.status, 'CANCELLED');

    // Seed an in-flight RUNNING run & an uploaded intake file that will expire across restart
    const inflightId = 'run_mid_restart_e2e';
    fs.writeFileSync(path.join(runsDir, `${inflightId}.json`), JSON.stringify({
      runId: inflightId,
      task: 'EVAL_BOQ',
      product: 'DL380_Gen12',
      startTime: Date.now() - 4000,
      updatedAt: Date.now() - 1000,
      status: 'RUNNING',
      logs: [{ text: 'Executing stage 2 prechecks' }]
    }));

    const ambigContent = '1x UNKNOWN-AMBIG-999 Unlisted Custom Box\n';
    const ambigSha256 = crypto.createHash('sha256').update(ambigContent).digest('hex');
    const ambigUpload = await uploadFixtureViaApi(
      baseUrl,
      'ambig_restart.csv',
      Buffer.from(ambigContent),
      'text/csv'
    );
    const staleTime = new Date(Date.now() - 60000);
    fs.utimesSync(ambigUpload.filepath, staleTime, staleTime);

    telemetry.allowRestartDisconnect = true;
    try {
      await stopServer(serverRef.current.proc);
      serverRef.current = await startIsolatedServer({
        port,
        runsDir,
        authSecret,
        extraEnv: { INTAKE_RETENTION_MS: '1000' }
      });

      await pageA.reload({ waitUntil: 'domcontentloaded' });
      await pageB.reload({ waitUntil: 'domcontentloaded' });
    } finally {
      telemetry.allowRestartDisconnect = false;
    }
    const recoveredInflight = await apiJson(`${baseUrl}/api/run/${inflightId}`);
    assert.strictEqual(recoveredInflight.body.run?.status, 'INTERRUPTED', 'In-flight run across restart must become INTERRUPTED');

    // Expired intake confirm on restarted server must return 410 REUPLOAD_REQUIRED
    const confirmExpired = await apiJson(`${baseUrl}/api/eval-boq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filepath: ambigUpload.filepath,
        inputSha256: ambigSha256,
        chassisDir: path.join(OUTPUTS_DIR, 'ProLiant/Gen12/DL380_Gen12'),
        offline: true
      })
    });
    assert.strictEqual(confirmExpired.status, 410);
    assert.strictEqual(confirmExpired.body.remediationAction, 'REUPLOAD_REQUIRED');
  } finally {
    await ctxA.close().catch(() => {});
    await ctxB.close().catch(() => {});
  }
}

async function verifyReconcileTopologyAndA11y(page, baseUrl) {
  await page.locator('[data-tab="orchestrator"]').click();
  await selectHeaderChassis(page, 'DL385 Gen11');
  await openBoqUploaderModal(page);
  const textarea = page.getByPlaceholder(/Paste quote lines/i);
  await textarea.fill('1x P53921-B21 HPE ProLiant DL385 Gen11 8SFF Configure-to-order Server\n1x P58540-B21 AMD EPYC 9224 2.5GHz 24-core 200W Processor for HPE');

  const evalPromise = page.waitForResponse(r => r.url().includes('/api/eval-boq') && r.request().method() === 'POST');
  await page.getByRole('button', { name: /Run 7-Aspect Evaluation/i }).click();
  const evalRes = await (await evalPromise).json();
  await pollRunCompletion(baseUrl, evalRes.runId);

  // Partner quote reconciliation modal
  const recBtn = page.getByRole('button', { name: /Reconcile with Partner Quote/i });
  await recBtn.waitFor({ timeout: 10000 });
  await recBtn.click();
  await page.getByRole('dialog').waitFor({ timeout: 5000 });
  const quoteBox = page.getByPlaceholder(/P47777-B21/i);
  await quoteBox.fill('P53921-B21, 1, HPE ProLiant DL385 Gen11 8SFF Configure-to-order Server');
  await page.getByRole('button', { name: /Execute Reconciliation/i }).click();
  await page.locator('text=/Match|Direct|Reconciliation/i').first().waitFor({ timeout: 10000 });
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 5000 });

  // Open non-DL380 evaluated topology + test keyboard Tab trapping & Escape close
  await page.locator('[data-tab="matrix"]').click();
  await page.getByRole('button', { name: /Visual BOQ Topology/i }).click();
  const topoDialog = page.getByRole('dialog', { name: /Topology/i });
  await topoDialog.waitFor({ timeout: 5000 });
  const topoText = await topoDialog.textContent();
  assert(topoText.includes('P53921-B21'), `Topology must show evaluated DL385 SKU P53921-B21, got: ${topoText}`);
  assert(!topoText.includes('P73282-B21'), 'Non-DL380 topology must NOT leak hardcoded P73282-B21');
  assert(!/DL380 Gen12/i.test(topoText), 'Non-DL380 topology must NOT leak hardcoded DL380 Gen12');

  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const insideDialog = await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')));
  assert.strictEqual(insideDialog, true, 'Keyboard focus must remain inside open modal');
  await page.keyboard.press('Escape');
  await topoDialog.waitFor({ state: 'detached', timeout: 5000 });

  // Mobile 390x844 layout overflow check
  await page.setViewportSize({ width: 390, height: 844 });
  for (const tabId of ['orchestrator', 'matrix', 'pipeline']) {
    await page.locator(`[data-tab="${tabId}"]`).click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(overflow <= 2, `Mobile 390px horizontal overflow on tab ${tabId}: ${overflow}px`);
  }
}

async function runBrowserReleaseGate() {
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const runsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-gate-runs-'));
  const authSecret = crypto.randomBytes(32).toString('hex');

  const tempSnapshot = listFilesSnapshot(TEMP_DIR);
  const exportSnapshot = listFilesSnapshot(EXPORTS_DIR);
  const serverRef = { current: null };
  const telemetry = { externalAttempts: [], pageErrors: [], consoleErrors: [], server5xx: [] };
  let browser = null;

  try {
    serverRef.current = await startIsolatedServer({ port, runsDir, authSecret });
    browser = await chromium.launch({ headless: true });
    const context = await createGuardedContext(browser, telemetry);
    const page = await context.newPage();
    attachPageMonitors(page, telemetry);
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

    console.log('▶ Order 1: Offline policy & OCR blocking...');
    await verifyOrder1OfflinePolicy(page, baseUrl, telemetry);
    console.log('▶ Order 4: Sizing & matrix handoff scope...');
    const offlineRunId = await verifyOrder4SizingAndMatrixHandoff(page, baseUrl);
    console.log('▶ Order 2: Export authorization & workbook binding...');
    const exportMeta = await verifyOrder2Exports(page, baseUrl, offlineRunId, runsDir, authSecret);
    console.log('▶ Order 5: Reconciliation, DL385 topology, a11y & mobile...');
    await verifyReconcileTopologyAndA11y(page, baseUrl);
    await context.close();

    console.log('▶ Order 3: Run recovery, stale cancel, restart & expired intake...');
    await verifyOrder3LifecycleAndRestart(browser, port, serverRef, runsDir, authSecret, telemetry);

    assert.strictEqual(telemetry.externalAttempts.length, 0, `External requests attempted: ${telemetry.externalAttempts.join(', ')}`);
    assert.strictEqual(telemetry.pageErrors.length, 0, `Uncaught page errors: ${telemetry.pageErrors.join(' | ')}`);
    assert.strictEqual(telemetry.consoleErrors.length, 0, `Console errors: ${telemetry.consoleErrors.join(' | ')}`);
    assert.strictEqual(telemetry.server5xx.length, 0, `Server 5xx errors: ${telemetry.server5xx.join(' | ')}`);

    const evidence = {
      status: 'PASSED',
      executedAt: new Date().toISOString(),
      commitSha: getGitCommitSha(),
      mode: 'ISOLATED_OFFLINE_PRODUCTION_RELEASE_GATE',
      policy: { OFFLINE_MODE: true, LOCAL_EVAL_ONLY: true, externalTrafficBlocked: true },
      ordersVerified: {
        order1OfflineOcrBlock: 'PASSED',
        order2ExportAuthorizationAndWorkbookBinding: 'PASSED',
        order3RunRecoveryCancelAndRestart: 'PASSED',
        order4SizingMatrixScopeAndProductPreservation: 'PASSED',
        order5NonDl380TopologyReconcileA11yAndMobile: 'PASSED'
      },
      artifacts: exportMeta,
      externalAttemptsCount: 0,
      liveServices: {
        liveClicPortalAcceptance: 'NOT_RUN',
        liveNotebookLmCloudGrounding: 'NOT_RUN',
        liveGoogleWorkspaceReadback: 'NOT_RUN'
      }
    };
    fs.mkdirSync(path.dirname(RELEASE_EVIDENCE_PATH), { recursive: true });
    fs.writeFileSync(RELEASE_EVIDENCE_PATH, JSON.stringify(evidence, null, 2));
    console.log(`✅ Browser Release Gate PASSED cleanly. Evidence: ${RELEASE_EVIDENCE_PATH}`);
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (serverRef.current?.proc) await stopServer(serverRef.current.proc);
    cleanupNewFiles(DIAG_EXPORT_DIR, tempSnapshot);
    cleanupNewFiles(TEMP_DIR, tempSnapshot);
    cleanupNewFiles(EXPORTS_DIR, exportSnapshot);
    fs.rmSync(runsDir, { recursive: true, force: true });
  }
}

runBrowserReleaseGate().catch(err => {
  console.error('❌ Browser Release Gate FAILED:', err);
  process.exit(1);
});
