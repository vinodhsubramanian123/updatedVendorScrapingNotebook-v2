'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const xlsx = require('xlsx-js-style');

const {
  isSmartChoiceOrBtoSku,
  classifyCommercialFulfillmentMode,
  classifySkuValidation
} = require('../../scripts/lib/catalog/sku.js');
const { validateConflictGraph } = require('../../scripts/lib/conflict/conflict_graph.js');
const {
  classifyClicRowSeverity,
  parseClicAdviceExcel
} = require('../../scripts/scrapers/parse_clic_modal.js');
const {
  isCdpTransportError,
  sanitizeNlmCliError,
  execNlmReadWithFallback
} = require('../../scripts/lib/notebook/nlm_transport.js');
const {
  reconcileRebuiltCaptureReceipt
} = require('../../scripts/lib/catalog/catalog_capture_receipt.js');
const {
  validateKnowledgeDelta,
  pruneInvalidQuarantinedDeltas,
  getQuarantineFilePath,
  setQuarantineFilePath
} = require('../../scripts/lib/feedback/quarantined_deltas.js');

test('Component 1: Smart Choice BTO (-xx5) vs CTO (-B21) classification and Level 1 conflict graph enforcement', () => {
  assert.equal(isSmartChoiceOrBtoSku('P71674-425'), true);
  assert.equal(isSmartChoiceOrBtoSku('P71674-005'), true);
  assert.equal(isSmartChoiceOrBtoSku('P73282-B21'), false);
  // 6-digit numeric cable/interconnect SKUs ending in -B25 or -715 must not be misclassified as server BTO
  assert.equal(isSmartChoiceOrBtoSku('834972-B25', 'HPE Synergy 100GbE 5m AOC'), false);
  assert.equal(isSmartChoiceOrBtoSku('469776-715', 'HPE MSL Redundant Power Supply Kit'), false);

  const btoMeta = classifyCommercialFulfillmentMode('P71674-425', 'HPE ProLiant DL380 Gen11 Smart Choice');
  assert.equal(btoMeta.fulfillmentMode, 'SMART_CHOICE_BTO');
  assert.equal(btoMeta.isSmartChoiceBto, true);
  assert.deepEqual(btoMeta.clicRuleIds, ['81016667', '81400509']);

  const skuVal = classifySkuValidation('P71674-425', 'HPE ProLiant DL380 Gen11 Smart Choice');
  assert.equal(skuVal.isSmartChoiceBto, true);
  assert.equal(skuVal.optionType, 'BTO');

  const conflictRes = validateConflictGraph(
    [
      { sku: 'P71674-425', description: 'HPE ProLiant DL380 Gen11 4510 Smart Choice Server', qty: 1 },
      { sku: 'P52536-B21', description: 'Intel Xeon-Gold 6430 2.1GHz 32-core Processor for HPE', qty: 1 },
      { sku: 'P50311-B21', description: 'HPE 64GB 2Rx4 PC5-4800B-R Smart Kit', qty: 2 }
    ],
    [],
    'outputs/ProLiant/Gen11/DL380_Gen11',
    'DL380_Gen11',
    { skipSynthesis: true }
  );

  assert.equal(conflictRes.isWholeSolutionValid, false);
  const btoConflict = conflictRes.conflicts.find(c => c.type === 'BTO_CTO_MODE_MISMATCH');
  assert.ok(btoConflict, 'Expected BTO_CTO_MODE_MISMATCH conflict');
  assert.deepEqual(btoConflict.clicRuleIds, ['81016667', '81400509']);
  assert.equal(btoConflict.referenceDocId, 'a50009219enw');
  assert.ok(btoConflict.recommendedCtoBaseSku);
  const sub = conflictRes.learnedSubstitutions.find(s => s.affectedSku === 'P71674-425');
  assert.equal(sub?.requiredSku, btoConflict.recommendedCtoBaseSku);
});

test('Component 2: CLIC 4-tier severity triage (Unbuildable, P+ Process Control, Error, Warning) and multi-sheet audit', () => {
  const unbuildable = classifyClicRowSeverity('Unbuildable', 'Rule 81016667: Configuration is unbuildable.');
  assert.equal(unbuildable.severityTier, 'UNBUILDABLE');
  assert.equal(unbuildable.isUnbuildable, true);

  const processControl = classifyClicRowSeverity('P+', 'Rule 90011052: Base Warranty Service Icon is missing.');
  assert.equal(processControl.severityTier, 'PROCESS_CONTROL');
  assert.equal(processControl.isProcessControl, true);
  assert.equal(processControl.isUnbuildable, false);

  const plainError = classifyClicRowSeverity('Error', 'Rule 81000001: Quantity check alert.');
  assert.equal(plainError.severityTier, 'ERROR');
  assert.equal(plainError.isError, true);
  assert.equal(plainError.isUnbuildable, false);

  const pduWarning = classifyClicRowSeverity(
    'Warning',
    'Rule 80500462: Selected power supply requires C13-C14 or C19-C20 jumper cord verification.'
  );
  assert.equal(pduWarning.severityTier, 'WARNING');
  assert.equal(pduWarning.isPhysicalDeploymentWarning, true);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clic-audit-test-'));
  const filePath = path.join(tmpDir, 'clic_advice_test.xlsx');
  const origQuarantinePath = getQuarantineFilePath();
  setQuarantineFilePath(path.join(tmpDir, 'quarantined_deltas.json'));
  try {
    const wb = xlsx.utils.book_new();
    const infoSheet = xlsx.utils.aoa_to_sheet([
      ['Metric', 'Count'],
      ['Unbuildable', 1],
      ['Process Control', 1],
      ['Warning', 0]
    ]);
    const adviceSheet = xlsx.utils.aoa_to_sheet([
      ['Severity', 'Rule#', 'Product#', 'Description', 'Quantity', 'Advice Text'],
      ['Unbuildable', '81016667', 'P71674-425', 'DL380 Gen11 Smart Choice', 1, 'Rule 81016667: Configuration is unbuildable.'],
      ['P+', '90011052', 'HU4B2A3', 'HPE Tech Care Basic', 1, 'Rule 90011052: Base Warranty Service Icon is required.'],
      ['Warning', '80500462', 'P38997-B21', '1600W PSU', 2, 'Rule 80500462: Verify C13/C19 power cord and PDU connector.']
    ]);
    const bomSheet = xlsx.utils.aoa_to_sheet([
      ['Item #', 'Part Number', 'Description', 'Quantity'],
      ['1', 'P73282-B21', 'HPE ProLiant DL380 Gen12 8SFF NC CTO Server', 1],
      ['2', 'P69727-B21', 'Intel Xeon 6740E Processor', 2]
    ]);

    xlsx.utils.book_append_sheet(wb, infoSheet, 'Information');
    xlsx.utils.book_append_sheet(wb, adviceSheet, 'Advice_Text');
    xlsx.utils.book_append_sheet(wb, bomSheet, 'BOM');
    xlsx.writeFile(wb, filePath);

    const parsed = parseClicAdviceExcel(filePath, tmpDir);
    assert.equal(parsed.unbuildableErrors.length, 1);
    assert.equal(parsed.processControlBlockers.length, 1);
    assert.equal(parsed.warnings.length, 1);
    assert.equal(parsed.physicalDeploymentWarnings.length, 1);
    assert.equal(parsed.informationSheetSummary.present, true);
    assert.equal(parsed.informationSheetSummary.warningCountDiscrepancy, true);
    assert.equal(parsed.bomSheetSummary.present, true);
    assert.equal(parsed.bomSheetSummary.omitsIconLevelServices, true);
  } finally {
    setQuarantineFilePath(origQuarantinePath);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Component 3: NotebookLM read transport failover (cdp -> httpx) and error sanitization', () => {
  const rawTraceback = [
    'Traceback (most recent call last):',
    '  File "C:\\Python313\\site-packages\\notebooklm_tools\\rpc.py", line 88, in call',
    'notebooklm_tools.core.errors.CdpTransportError: Failed to connect to browser CDP endpoint'
  ].join('\n');
  const cdpErr = Object.assign(new Error('Command failed'), { stderr: rawTraceback });

  assert.equal(isCdpTransportError(cdpErr), true);
  const sanitized = sanitizeNlmCliError(cdpErr);
  assert.ok(!sanitized.includes('Traceback (most recent call last)'), 'Expected traceback header stripped');
  assert.ok(sanitized.includes('CdpTransportError'), 'Expected root cause preserved');

  const seenTransports = [];
  const mockExecFileSync = (_bin, _args, opts) => {
    seenTransports.push(opts.env.NOTEBOOKLM_RPC_TRANSPORT);
    if (seenTransports.length === 1) {
      throw cdpErr;
    }
    return '[{"id":"source-123","title":"DL380_Gen12"}]';
  };

  const out = execNlmReadWithFallback(mockExecFileSync, ['source', 'list', 'nb-1', '--json'], {}, process.env.PATH);
  assert.equal(seenTransports.length, 2);
  assert.equal(seenTransports[1], 'httpx');
  assert.ok(out.includes('source-123'));
});

test('Component 4: Deterministic capture receipt hash reconciliation when raw_data SHA-256 matches', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'capture-receipt-test-'));
  try {
    const product = 'DL380a_Gen12';
    const rawDir = path.join(tmpDir, 'raw_data');
    fs.mkdirSync(rawDir, { recursive: true });

    const ts = '2026-11-12T00:00:00.000Z';
    const rawFile = path.join(rawDir, 'oca_raw_data_full.json');
    const rawContent = JSON.stringify({ timestamp: ts, items: [{ sku: 'P72683-B21' }] });
    fs.writeFileSync(rawFile, rawContent);
    const rawSha256 = crypto.createHash('sha256').update(Buffer.from(rawContent)).digest('hex');

    const catalogPath = path.join(tmpDir, `${product}_Catalog.json`);
    const servicesPath = path.join(tmpDir, `${product}_Services.json`);
    const rulesPath = path.join(tmpDir, `${product}_Catalog_Rules.json`);
    const xlsxPath = path.join(tmpDir, `${product}_OCA_Catalog.xlsx`);

    fs.writeFileSync(catalogPath, JSON.stringify({
      metadata: { scrapeTimestamp: ts, totalUniqueSKUs: 1 },
      entries: [{ parentCategory: 'Base_Chassis', skus: [{ sku: 'P72683-B21', 'Product #': 'P72683-B21' }] }]
    }));
    fs.writeFileSync(servicesPath, JSON.stringify({ entries: [] }));
    fs.writeFileSync(rulesPath, JSON.stringify({ rules: [{ ruleId: 'R1' }] }));

    const wb = xlsx.utils.book_new();
    const sheet = xlsx.utils.aoa_to_sheet([
      ['Product #', 'Description'],
      ['P72683-B21', 'HPE ProLiant DL380a Gen12 CTO Server']
    ]);
    xlsx.utils.book_append_sheet(wb, sheet, 'Base_Chassis');
    xlsx.writeFile(wb, xlsxPath);

    const receiptPath = path.join(tmpDir, 'capture_receipt.json');
    fs.writeFileSync(receiptPath, JSON.stringify({
      schemaVersion: 1,
      product,
      status: 'LOCAL_PROMOTED',
      rawSha256,
      hashes: {
        'Catalog.json': 'stale-hash',
        'Services.json': 'stale-hash',
        'Catalog_Rules.json': 'stale-hash',
        'OCA_Catalog.xlsx': 'stale-hash'
      },
      counts: { hardware: 1, services: 0, rules: 1 }
    }, null, 2));

    const updatedReceipt = reconcileRebuiltCaptureReceipt(tmpDir, product);
    assert.ok(updatedReceipt, 'Expected reconciled receipt');
    assert.notEqual(updatedReceipt.hashes['Catalog.json'], 'stale-hash');
    assert.ok(updatedReceipt.rebuiltAt);

    // Mutate rawSha256 to verify reconciliation refuses when raw vendor evidence changed
    fs.writeFileSync(rawFile, JSON.stringify({ timestamp: ts, items: [{ sku: 'P99999-B21' }] }));
    const rejectedReceipt = reconcileRebuiltCaptureReceipt(tmpDir, product);
    assert.equal(rejectedReceipt, null);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Component 5: INV-230 semantic extraction integrity and pruneInvalidQuarantinedDeltas', () => {
  const invertedDiscontinued = validateKnowledgeDelta({
    deltaId: 'D1',
    affectedSku: 'R7A11A',
    requiredDependencySku: '512485-B21',
    ruleType: 'DEPENDENCY_CHAIN',
    rawMessage: 'Legacy standalone iLO Advanced licenses (512485-B21) are discontinued and blocked; use R7A11A.'
  });
  assert.equal(invertedDiscontinued.valid, false);
  assert.equal(invertedDiscontinued.status, 'REJECTED');

  const slashPair = validateKnowledgeDelta({
    deltaId: 'D2',
    affectedSku: 'P69727-B21',
    requiredDependencySku: 'P69727-F21',
    ruleType: 'DEPENDENCY_CHAIN',
    rawMessage: 'Processor kit P69727-B21 / P69727-F21 supports DDR5 6400MT/s.'
  });
  assert.equal(slashPair.valid, false);
  assert.equal(slashPair.status, 'REJECTED');

  const corruptedQty = validateKnowledgeDelta({
    deltaId: 'D3',
    affectedSku: '455883-B21',
    ruleType: 'ENABLEMENT_KIT',
    rawMessage: 'Unverified manifest diff observation: portal configuration added SKU 455883-B21 (Qty 455883).'
  });
  assert.equal(corruptedQty.valid, false);
  assert.equal(corruptedQty.status, 'REJECTED');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quarantine-prune-test-'));
  try {
    const qFile = path.join(tmpDir, 'quarantined_deltas.json');
    fs.writeFileSync(qFile, JSON.stringify([
      {
        quarantineId: 'Q_BAD',
        deltaId: 'D_BAD',
        affectedSku: 'P69727-B21',
        requiredDependencySku: 'P69727-F21',
        ruleType: 'DEPENDENCY_CHAIN',
        rawMessage: 'Processor kit P69727-B21 / P69727-F21 supports DDR5.'
      },
      {
        quarantineId: 'Q_GOOD',
        deltaId: 'D_GOOD',
        affectedSku: 'P69727-B21',
        requiredDependencySku: 'P71104-B21',
        ruleType: 'DEPENDENCY_CHAIN',
        rawMessage: 'Selecting P69727-B21 requires heatsink P71104-B21.',
        confidenceScore: 0.75
      }
    ], null, 2));

    const res = pruneInvalidQuarantinedDeltas({ filePath: qFile });
    assert.equal(res.prunedCount, 1);
    assert.equal(res.remainingCount, 1);
    assert.deepEqual(res.prunedIds, ['Q_BAD']);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
