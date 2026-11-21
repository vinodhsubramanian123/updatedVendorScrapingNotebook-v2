'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('node:assert');
const { test } = require('node:test');
const XLSX = require('xlsx-js-style');

const {
  parseAndConsolidateBOQDetailed,
  evaluatePhysicalMath,
  evaluateBOQMultiAspect
} = require('../../scripts/lib/boq/boq_evaluator.js');
const { normalizeConfiguration } = require('../../scripts/lib/boq/configuration_context.js');
const { executeRoutedQuery } = require('../../scripts/evaluators/route_query.js');
const { verifyPrePresentationAcceptance } = require('../../scripts/lib/boq/bom_verifier.js');
const { applyConditionalDiscovery } = require('../../scripts/lib/catalog/conditional_discovery.js');
const { extractComponentAttributes, scoreReplacementCandidate } = require('../../scripts/lib/conflict/least_delta_combinator.js');
const { probeBackplaneSelectorSkus, _rankBackplaneCandidates } = require('../../scripts/lib/scraper/drive_cage_selector_probe.js');

const CHASSIS_DIR = path.resolve(__dirname, '../../outputs/ProLiant/Gen12/DL360_Gen12');
const CATALOG_PATH = path.join(CHASSIS_DIR, 'DL360_Gen12_Catalog.json');
const RECEIPT_PATH = path.join(CHASSIS_DIR, 'capture_receipt.json');

function writeTempBoqWorkbook(filePath, rows) {
  const wb = XLSX.utils.book_new();
  const sheetRows = rows.map(r => ({
    'Line #': r.line ?? '',
    'Product #': r.sku,
    'Description': r.description,
    'Qty': r.qty,
    'Unit Price (USD) ': r.unitPrice,
    'Extended List Price (USD)': r.extPrice
  }));
  const ws = XLSX.utils.json_to_sheet(sheetRows);
  XLSX.utils.book_append_sheet(wb, ws, 'BOM');
  XLSX.writeFile(wb, filePath);
}

function buildDxbRfq1NodeRows() {
  return [
    { line: 1, sku: 'P72176-B21 AKM', description: 'HPE DL360 G12 10SFF/20EDSFF Hyb Configure-to-order Server', qty: 1, unitPrice: 1200, extPrice: 1200 },
    { line: 2, sku: 'P74576-B21 AKM', description: 'Intel Xeon 6737P 2.9GHz 32-core 270W Processor for HPE', qty: 2, unitPrice: 8500, extPrice: 17000 },
    { line: 3, sku: 'P69728-F21', description: 'HPE 64GB (1x64GB) Dual Rank x4 DDR5-6400 CAS-52-52-52 EC8 Registered Smart FIO Memory Kit', qty: 8, unitPrice: 28532, extPrice: 228256 },
    { line: 4, sku: 'P72223-B21 AKM', description: 'HPE ProLiant Compute DL3XX Gen12 1U 2SFF x4 Tri-Mode U.3 Stacking Backplane Kit', qty: 1, unitPrice: 170, extPrice: 170 },
    { line: 5, sku: 'P40497-B21 AKM', description: 'HPE 480GB SATA 6G Read Intensive SFF BC Multi Vendor SSD', qty: 2, unitPrice: 4411, extPrice: 8822 },
    { line: 6, sku: 'P72598-B21 AKM', description: 'HPE ProLiant Compute DL360 Gen12 x16 Full Height Riser Kit', qty: 1, unitPrice: 150, extPrice: 150 },
    { line: 7, sku: 'P74775-B21 AKM', description: 'HPE MR408i-p Gen11 x8 Lanes 4GB Cache PCI SPDM Plug-in Storage Controller', qty: 1, unitPrice: 5779, extPrice: 5779 },
    { line: 8, sku: 'R2E09A', description: 'HPE SN1610Q 32Gb 2-port Fibre Channel Host Bus Adapter', qty: 1, unitPrice: 5899, extPrice: 5899 },
    { line: 9, sku: 'P01366-B21 AKM', description: 'HPE 96W Smart Storage Lithium-ion Battery with 145mm Cable Kit', qty: 1, unitPrice: 268, extPrice: 268 },
    { line: 10, sku: 'P48918-B21 AKM', description: 'HPE ProLiant Storage Controller Enablement Cable Kit', qty: 1, unitPrice: 45, extPrice: 45 },
    { line: 11, sku: 'P26256-B21 AKM', description: 'Broadcom BCM57412 Ethernet 10Gb 2-port SFP+ OCP3 Adapter for HPE', qty: 1, unitPrice: 689, extPrice: 689 },
    { line: 12, sku: '455883-B21 AKM', description: 'HPE BladeSystem c-Class 10Gb SFP+ SR Transceiver', qty: 2, unitPrice: 399, extPrice: 798 },
    { line: 13, sku: 'P48908-B21 AKM', description: 'HPE ProLiant DL3X0 Gen11 1U High Performance Fan Kit', qty: 1, unitPrice: 460, extPrice: 460 },
    { line: 14, sku: 'P38997-B21 AKM', description: 'HPE 1600W Flex Slot Platinum Hot Plug Low Halogen Power Supply Kit', qty: 2, unitPrice: 1082, extPrice: 2164 },
    { line: 15, sku: 'P78145-B21 AKM', description: 'HPE C13 - C14 250V 10Amp 2m FIO Power Cord', qty: 2, unitPrice: 22, extPrice: 44 },
    { line: 16, sku: '512485-B21', description: 'HPE iLO Advanced 1-server License with 1yr Support on iLO Licensed Features', qty: 1, unitPrice: 525, extPrice: 525 },
    { line: 17, sku: 'P72604-B21 AKM', description: 'HPE ProLiant Compute DL360 Gen12 2SFF Stacking x2 Box1 Box2 PCIe Slot1 Controller Cable Kit', qty: 1, unitPrice: 99, extPrice: 99 },
    { line: 18, sku: 'P07818-B21 AKM', description: 'HPE DDR4 DIMM Blank Kit', qty: 1, unitPrice: 129, extPrice: 129 },
    { line: 19, sku: 'P35876-B21 AKM', description: 'HPE CE Mark Removal FIO Enablement Kit', qty: 1, unitPrice: 1, extPrice: 1 },
    { line: 20, sku: 'P52343-B21 AKM', description: 'HPE Easy Install Rail 5 Kit', qty: 1, unitPrice: 279, extPrice: 279 },
    { line: 21, sku: 'P72209-B21 AKM', description: 'HPE ProLiant Compute DL360 Gen12 10SFF/20EDSFF Hybrid Backplane Power Cable Kit', qty: 1, unitPrice: 45, extPrice: 45 },
    { line: 22, sku: 'P73325-B21 AKM', description: 'HPE ProLiant Compute Localization FIO Kit', qty: 1, unitPrice: 1, extPrice: 1 },
    { line: 23, sku: 'P74787-B21 AKM', description: 'HPE ProLiant Compute DL3XX Gen12 High Performance Heat Sink Kit', qty: 2, unitPrice: 293, extPrice: 586 },
    { line: 24, sku: 'P79564-B21 AKM', description: 'HPE ProLiant Compute 20C Maximum Recommended Ambient Temperature FIO Tracking', qty: 1, unitPrice: 1, extPrice: 1 },
    { line: 25, sku: 'P79633-B21 AKM', description: 'HPE ProLiant Compute DAC ACC Networking Cable Operating Configuration Tracking', qty: 1, unitPrice: 1, extPrice: 1 },
    { line: 26, sku: 'HA113A1', description: 'HPE Installation Service', qty: 1, unitPrice: 0, extPrice: 0 },
    { line: 27, sku: 'HA113A1 5A6', description: 'HPE ProLiant DL/ML Install SVC', qty: 1, unitPrice: 400, extPrice: 400 },
    { line: 28, sku: 'HU4A6A5', description: 'HPE 5Y Tech Care Essential Service', qty: 1, unitPrice: 0, extPrice: 0 },
    { line: 29, sku: 'HU4A6A5 7X4', description: 'HPE iLO AdvPack NonBL Support', qty: 1, unitPrice: 149, extPrice: 149 },
    { line: 30, sku: 'HU4A6A50C4U', description: 'HPE DL360 Gen12 Support', qty: 1, unitPrice: 3250, extPrice: 3250 }
  ];
}

function build10NodeOcaRows({ useOcp = true } = {}) {
  const base = buildDxbRfq1NodeRows().map(r => {
    const clean = r.sku.replace(/\s+(?:AKM|B19|0D1)$/i, '');
    const isHeader = clean === 'HA113A1' || clean === 'HU4A6A5';
    const qty = isHeader ? 1 : r.qty * 10;
    let unitPrice = r.unitPrice;
    if (clean === 'HU4A6A50C4U') unitPrice = 11386;
    return {
      ...r,
      sku: clean === r.sku ? clean : `${clean} B19`,
      qty,
      unitPrice,
      extPrice: unitPrice * qty
    };
  });

  if (useOcp) {
    const ctrlIdx = base.findIndex(r => r.sku.startsWith('P74775-B21'));
    base[ctrlIdx] = { ...base[ctrlIdx], sku: 'P58335-B21 B19', description: 'HPE MR408i-o Gen11 x8 Lanes 4GB Cache OCP SPDM Storage Controller', unitPrice: 5679, extPrice: 56790 };
    const cableIdx = base.findIndex(r => r.sku.startsWith('P72604-B21'));
    base[cableIdx] = { ...base[cableIdx], sku: 'P72600-B21 B19', description: 'HPE ProLiant Compute DL360 Gen12 2SFF Stacking x2 Box1 Box2 Rear OCP SlotA Controller Cable Kit', unitPrice: 86, extPrice: 860 };
    base.splice(20, 0, { line: 21, sku: 'P72203-B21 B19', description: 'HPE ProLiant Compute DL360 Gen12 CPU1 to Rear OCP SlotB x8 Cable Kit', qty: 10, unitPrice: 77, extPrice: 770 });
  }
  base.push({ line: 32, sku: 'R7A12AAE', description: 'HPE Compute Ops Management Enhanced 5-year Upfront ProLiant SaaS', qty: 10, unitPrice: 750, extPrice: 7500 });
  // Companion $0 factory-integrated modifier rows like OCA exports
  base.push({ line: '', sku: 'P74576-B21 0D1', description: 'Factory Integrated', qty: 20, unitPrice: 0, extPrice: 0 });
  base.push({ line: '', sku: 'P58335-B21 0D1', description: 'Factory Integrated', qty: 10, unitPrice: 0, extPrice: 0 });
  // Keep sum aligned with live OCA totals ($3,073,670 OCP vs $3,074,030 PCIe => delta $360)
  const currentTotal = base.reduce((s, r) => s + r.extPrice, 0);
  const targetTotal = useOcp ? 3073670 : 3074030;
  const chassisRow = base.find(r => r.sku.startsWith('P72176-B21'));
  const deltaPerChassis = Math.round((targetTotal - currentTotal) / 10);
  chassisRow.unitPrice += deltaPerChassis;
  chassisRow.extPrice = chassisRow.unitPrice * chassisRow.qty;
  return base;
}

test('Area C1/C2: Parser separates Unit vs Extended Price, merges 0D1/B19 modifiers, reproduces 10-node totals, and treats qty-1 service headers as global', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dxb-dl360-c-'));
  try {
    const ocpFile = path.join(tmpDir, 'ocp_10q.xlsx');
    const pcieFile = path.join(tmpDir, 'pcie_10q.xlsx');
    writeTempBoqWorkbook(ocpFile, build10NodeOcaRows({ useOcp: true }));
    writeTempBoqWorkbook(pcieFile, build10NodeOcaRows({ useOcp: false }));

    const parsedOcp = parseAndConsolidateBOQDetailed('', ocpFile);
    const parsedPcie = parseAndConsolidateBOQDetailed('', pcieFile);
    const sumOcp = parsedOcp.items.reduce((s, i) => s + (i.extendedPriceUsd || 0), 0);
    const sumPcie = parsedPcie.items.reduce((s, i) => s + (i.extendedPriceUsd || 0), 0);

    assert.strictEqual(sumOcp, 3073670);
    assert.strictEqual(sumPcie, 3074030);

    const memItem = parsedOcp.items.find(i => i.sku === 'P69728-F21');
    assert.strictEqual(memItem.unitPriceUsd, 28532, 'Unit Price must never be overwritten by Extended List Price ($2,282,560)');
    assert.strictEqual(memItem.extendedPriceUsd, 2282560);

    const norm = normalizeConfiguration(parsedOcp.items);
    assert.strictEqual(norm.multiplier, 10);
    const techHeader = norm.items.find(i => i.sku === 'HU4A6A5');
    assert.strictEqual(techHeader.quantityScope, 'global');
    assert.strictEqual(techHeader.quantity, 1);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Area C3: Reconciles 30-line 1-node RFQ across 10 nodes with _Services.json lookup and preserves customer-originated services in B8', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dxb-dl360-recon-'));
  try {
    const rfqFile = path.join(tmpDir, 'rfq_1q.xlsx');
    const ocpFile = path.join(tmpDir, 'ocp_10q.xlsx');
    writeTempBoqWorkbook(rfqFile, buildDxbRfq1NodeRows());
    writeTempBoqWorkbook(ocpFile, build10NodeOcaRows({ useOcp: true }));

    const res = await executeRoutedQuery('reconcile customer tender with vendor BOM', {
      customerFilePath: rfqFile,
      vendorFilePath: ocpFile,
      chassisName: 'DL360_Gen12',
      chassisDir: CHASSIS_DIR,
      nodeMultiplier: 10,
      nodes: 10,
      skipQuarantine: true,
      offline: true
    });

    const report = res.result?.auditReport;
    assert.strictEqual(res.result?.isTwoBaselineComparison, true);
    assert.strictEqual(report.totalProposedSkus, 30);
    assert.strictEqual(report.discrepancies.quantityDeltas.length, 0);
    assert.deepStrictEqual(report.discrepancies.removedByVendor.map(x => `${x.sku}(${x.quantity})`).sort(), ['P72604-B21(10)', 'P74775-B21(10)']);
    assert.deepStrictEqual(report.discrepancies.addedByVendor.map(x => `${x.sku}(${x.quantity})`).sort(), ['P58335-B21(10)', 'P72203-B21(10)', 'P72600-B21(10)', 'R7A12AAE(10)']);
    assert.ok(!report.discrepancies.uncatalogedSkus.some(x => x.sku === 'R7A12AAE'), 'R7A12AAE must resolve against _Services.json');

    const evalRes = await evaluateBOQMultiAspect(rfqFile, { chassisDir: CHASSIS_DIR, offline: true, enableCloudValidation: false });
    const bCheckPass = verifyPrePresentationAcceptance(evalRes, 'BOQ_EVALUATION', { chassisDir: CHASSIS_DIR, items: evalRes.items });
    assert.strictEqual(bCheckPass.checks.find(c => c.id === 'B8')?.status, 'PASSED');

    const injectedUnsolicited = {
      ...evalRes,
      conflictGraph: {
        ...evalRes.conflictGraph,
        rankedSolutions: evalRes.conflictGraph.rankedSolutions.map((r, idx) => idx === 0
          ? { ...r, skuPartsList: [...r.skuPartsList, { sku: 'HA114A1', description: 'HPE Installation and Startup Service', quantity: 1 }] }
          : r)
      }
    };
    const bCheckFail = verifyPrePresentationAcceptance(injectedUnsolicited, 'BOQ_EVALUATION', { chassisDir: CHASSIS_DIR, items: evalRes.items });
    assert.strictEqual(bCheckFail.checks.find(c => c.id === 'B8')?.status, 'FAILED');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Area C4: Rejects 10-node OCP build independently when P72203-B21, P72600-B21, or P48918-B21 is missing or wrong PCIe cable is used', () => {
  const catalogData = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  const intact = build10NodeOcaRows({ useOcp: true })
    .filter(r => !r.sku.endsWith('0D1'))
    .map(r => ({ sku: r.sku.replace(/\s+(?:AKM|B19)$/i, ''), description: r.description, quantity: r.qty, unitPriceUsd: r.unitPrice }));

  const passRes = evaluatePhysicalMath(intact, catalogData, CHASSIS_DIR, { offline: true, skipSynthesis: true });
  assert.strictEqual(passRes.isMathClean, true);
  assert.strictEqual(passRes.configurationContext?.multiplier, 10);
  const perNodeOcp = passRes.aspectChecks.find(a => a.id === 5)?.operands?.ocpAdapterCount;
  assert.strictEqual(perNodeOcp, 2);
  assert.strictEqual(perNodeOcp * passRes.configurationContext.multiplier, 20);

  const noSlotB = intact.filter(p => p.sku !== 'P72203-B21');
  assert.strictEqual(evaluatePhysicalMath(noSlotB, catalogData, CHASSIS_DIR, { offline: true, skipSynthesis: true }).isMathClean, false);

  const noSlotASignal = intact.filter(p => p.sku !== 'P72600-B21');
  assert.strictEqual(evaluatePhysicalMath(noSlotASignal, catalogData, CHASSIS_DIR, { offline: true, skipSynthesis: true }).isMathClean, false);

  const wrongPcieCable = intact.map(p => (p.sku === 'P72600-B21' ? { ...p, sku: 'P72604-B21', description: 'HPE DL360 Gen12 PCIe Slot1 Controller Cable Kit' } : p));
  assert.strictEqual(evaluatePhysicalMath(wrongPcieCable, catalogData, CHASSIS_DIR, { offline: true, skipSynthesis: true }).isMathClean, false);

  const noSideband = intact.filter(p => p.sku !== 'P48918-B21');
  assert.strictEqual(evaluatePhysicalMath(noSideband, catalogData, CHASSIS_DIR, { offline: true, skipSynthesis: true }).isMathClean, false);
});

test('Area A: Selector-revealed P40497-B21 behind P72223-B21 materializes cleanly and matches catalog + receipt provenance', () => {
  const entries = [];
  const rules = applyConditionalDiscovery(entries, [{
    sku: 'P40497-B21',
    description: 'HPE 480GB SATA 6G Read Intensive SFF BC Multi Vendor SSD',
    listPrice: '4,411.00',
    leadTime: '3',
    startDate: '04/05/2021',
    discontinuedDate: '06/30/2027',
    obsoleteDate: '07/31/2027',
    preferred: true,
    parentCategory: 'Drive Enclosures / Drives',
    subCategory: 'Hot Plug SFF Drives (2SFF Stacking Backplane)',
    conditionType: 'SELECTOR_STATE_CONDITIONAL',
    conditionKey: 'backplaneSelector',
    selectorTriggerSku: 'P72223-B21',
    ruleContext: 'Revealed on P72176-B21 when P72223-B21 = 1; restored to 0',
    observedInPortal: true
  }], entries);

  assert.strictEqual(rules.length, 1);
  assert.strictEqual(entries.length, 1);
  assert.strictEqual(entries[0].skuCount, 1);
  assert.strictEqual(entries[0].skus[0].visibilityState, 'PORTAL_CONDITIONAL');
  assert.strictEqual(entries[0].skus[0].listPrice, 4411);
  assert.strictEqual(entries[0].skus[0].selectorTriggerSku, 'P72223-B21');

  const rangeEntries = [];
  applyConditionalDiscovery(rangeEntries, [{
    sku: 'P40497-B21',
    description: 'HPE 480GB SATA SSD',
    conditionType: 'SELECTOR_STATE_CONDITIONAL',
    selectorTriggerSku: 'P72223-B21',
    observedInPortal: true,
    listPrice: '4,411 pending',
    leadTime: '3-5 days'
  }]);
  assert.equal(rangeEntries[0].skus[0]['Lead Time'], '3-5 days');
  assert.equal(rangeEntries[0].skus[0].leadTimeDays, 4);
  assert.equal(rangeEntries[0].skus[0].listPrice, null);

  const catalogData = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  const liveRow = catalogData.entries.flatMap(e => e.skus || []).find(s => (s.sku || s['Product #']) === 'P40497-B21');
  assert.ok(liveRow, 'DL360_Gen12_Catalog.json must contain P40497-B21');
  assert.strictEqual(liveRow.listPrice, 4411);
  assert.strictEqual(liveRow.leadTimeDays, 3);
  assert.strictEqual(liveRow['Discontinued Date'], '06/30/2027');
  assert.strictEqual(liveRow.selectorTriggerSku, 'P72223-B21');

  const receipt = JSON.parse(fs.readFileSync(RECEIPT_PATH, 'utf8'));
  assert.strictEqual(receipt.provenance?.baseSku, 'P72176-B21');
  assert.ok(receipt.coverage?.observedSelectors?.some(s => s.sku === 'P72223-B21' && s.value === 'SET_1_CAPTURED_AND_RESTORED_0'));
});

test('Area B: Synthesizes topology-aware Rank 2 OCP fast-ship candidate with strict category matching, separated EDT labels, and B19 CLIC warnings', async () => {
  const psuAttrs = extractComponentAttributes('HPE 1600W Flex Slot Platinum Hot Plug Power Supply Kit', 'P38997-B21');
  assert.strictEqual(scoreReplacementCandidate({ sku: 'P22173-B21', description: 'HPE 1600W -48VDC 600V 3.5m Power Cable Kit', price: 100, leadTimeDays: 3 }, psuAttrs, 1082), -1);

  const ctrlAttrs = extractComponentAttributes('HPE MR408i-p Gen11 x8 Lanes 4GB Cache PCI SPDM Plug-in Storage Controller', 'P74775-B21');
  assert.strictEqual(scoreReplacementCandidate({ sku: 'P77097-B21', description: 'Microsoft Windows Server 2025 16-core Datacenter FIO', price: 1000, leadTimeDays: 3 }, ctrlAttrs, 5779), -1);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dxb-dl360-b-'));
  try {
    const rfqFile = path.join(tmpDir, 'rfq_1q.xlsx');
    writeTempBoqWorkbook(rfqFile, buildDxbRfq1NodeRows());

    const options = {
      chassisDir: CHASSIS_DIR,
      offline: true,
      enableCloudValidation: false,
      prioritizeFastShipAsRank2: true
    };
    const unboundClic = { ucid: '5158389518-01', unbuildables: 0, errors: 0, warnings: 10, warningRuleIds: ['81302926', '81031845'] };
    const pending = await evaluateBOQMultiAspect(rfqFile, { ...options, prioritizeFastShipAsRank2: false, liveClicValidation: unboundClic });
    const pendingRank2 = pending.conflictGraph?.recommendedSolutions?.find(candidate => candidate.availabilityPreference === 'CLOSEST_MATCH');
    assert.ok(pendingRank2, 'A lead time over 30 days automatically adds the closest availability option');
    assert.strictEqual(pendingRank2.portalValidationStatus, 'PORTAL VALIDATION PENDING');

    const liveClic = { ...unboundClic, bomFingerprint: pendingRank2.bomFingerprint };
    const evalRes = await evaluateBOQMultiAspect(rfqFile, {
      ...options,
      liveSolutionEdt: {
        candidateBomFingerprint: pendingRank2.bomFingerprint,
        fastShipRange: '43–54 days',
        baselineRange: '73–91 days',
        startWindowDaysSaved: 30,
        endWindowDaysSaved: 37,
        longestComponentEstimate: { sku: 'R2E09A', days: 30 }
      },
      liveClicValidation: liveClic
    });

    const rank2 = evalRes.conflictGraph?.rankedSolutions?.[1];
    assert.strictEqual(rank2.strategyId, 'STRATEGY_FAST_SHIP_RANK2');
    assert.strictEqual(rank2.isMathClean, true);
    assert.strictEqual(rank2.portalValidationStatus, 'PORTAL_VALIDATED_WITH_WARNINGS');
    assert.ok(rank2.skuPartsList.some(p => p.sku === 'P58335-B21'));
    assert.ok(rank2.skuPartsList.some(p => p.sku === 'P72600-B21'));
    assert.ok(rank2.skuPartsList.some(p => p.sku === 'P72203-B21'));
    assert.ok(!rank2.skuPartsList.some(p => p.sku === 'P74775-B21'));
    assert.ok(!rank2.skuPartsList.some(p => p.sku === 'P72604-B21'));
    assert.ok(rank2.skuPartsList.some(p => p.sku === 'P26256-B21'));
    assert.ok(rank2.skuPartsList.some(p => p.sku === 'P40497-B21'));
    assert.ok(rank2.skuPartsList.some(p => p.sku === 'R2E09A'));
    assert.ok(rank2.skuPartsList.some(p => p.sku.startsWith('HU4A6A5')));
    assert.strictEqual(rank2.componentLeadTimeEstimate.originalMaxComponentDays, 60);
    assert.strictEqual(rank2.componentLeadTimeEstimate.fastShipMaxComponentDays, 30);
    assert.strictEqual(rank2.componentLeadTimeEstimate.complete, false);
    assert.ok(rank2.supplyMetrics.pacingItems.some(part => part.sku === 'R2E09A'));
    assert.strictEqual(rank2.liveSolutionEdt.fastShipRange, '43–54 days');
    assert.strictEqual(rank2.liveSolutionEdt.baselineRange, '73–91 days');

    const bRes = verifyPrePresentationAcceptance(evalRes, 'BOQ_EVALUATION', {
      chassisDir: CHASSIS_DIR,
      items: evalRes.items,
      liveClicValidation: liveClic
    });
    const b19 = bRes.checks.find(c => c.id === 'B19');
    assert.strictEqual(b19.status, 'PASSED');
    assert.strictEqual(b19.severity, 'WARN');
    assert.ok(b19.detail.includes('10 warning(s)'));
    assert.ok(b19.detail.includes('0 unbuildables'));
    assert.ok(b19.detail.includes('no unbuildable errors'));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Area A2: probeBackplaneSelectorSkus captures P40497-B21 when hot-plug drives are hidden, restores qty 0, and fails loudly if restore fails', async () => {
  assert.equal(_rankBackplaneCandidates([
    { sku: 'P72221-B21', description: '1U 4EDSFF NVMe Stacking Backplane Kit' },
    { sku: 'P72223-B21', description: '1U 2SFF x4 Tri-Mode U.3 Stacking Backplane Kit' }
  ])[0].sku, 'P72223-B21');
  const noopSleep = async () => {};
  let currentQty = '0';
  let expandCalls = 0;

  const makeMockSendCommand = ({ failRestore = false, loseReadback = false, failActivation = false } = {}) => async (_ws, method, params) => {
    assert.strictEqual(method, 'Runtime.evaluate');
    const expr = String(params?.expression || '');
    if (expr.includes('hasVisibleHotPlug')) {
      return {
        result: {
          value: {
            hasVisibleHotPlug: false,
            visibleHotPlugCount: 0,
            candidates: [
              { id: 'item_tr_P72223-B21_smartChassisSection_smartChassisDriveCage', badge: '', sku: 'P72223-B21', description: 'HPE DL360 Gen12 2SFF Tri-Mode U.3 BC Stacking Drive Backplane Kit', qtyText: '0' }
            ]
          }
        }
      };
    }
    if (expr.includes('qtyEl.dispatchEvent')) {
      return { result: { value: true } };
    }
    if (expr.includes('ul.popup-menu-body')) {
      if (expr.includes('name=\\"1\\"') && !failActivation) {
        currentQty = '1';
      } else if (expr.includes('name=\\"0\\"') && !failRestore) {
        currentQty = loseReadback ? null : '0';
      }
      return { result: { value: true } };
    }
    if (expr.includes('hotPlugCount:')) {
      return { result: { value: { present: currentQty !== null, qtyText: currentQty, hotPlugCount: currentQty === '1' ? 115 : 0 } } };
    }
    if (expr.includes('tr.item_tr[id*="HotPlugSFFChoice"], tr.item_tr[id*="HotPlugLFFChoice"], tr.item_tr[id*="EDSFFChoice"]')) {
      const headers = ['Product #', 'Description', '', 'Price (USD)', '', '', '', 'Est. Lead Time', 'Start', 'Discontinued', 'Obsolete'];
      const rows = currentQty === '1'
        ? [
          {
            id: 'item_tr_P40497-B21_storage_HotPlugSFFChoice',
            className: 'item_tr hpe-preferred',
            inUnavail: false,
            visible: true,
            headers,
            cells: ['P40497-B21', 'HPE 480GB SATA 6G Read Intensive SFF BC Multi Vendor SSD', '', '$4,411.00', '', '', '', '3', '04/05/2021', '06/30/2027', '07/31/2027']
          },
          {
            id: 'item_tr_BASE01-B21_storage_HotPlugSFFChoice',
            className: 'item_tr',
            inUnavail: false,
            visible: true,
            headers,
            cells: ['BASE01-B21', 'Already in baseline', '', '$999.00', '', '', '', '5', '01/01/2024', '', '']
          }
        ]
        : [];
      return { result: { value: rows } };
    }
    throw new Error(`Unexpected Runtime.evaluate expression: ${expr.slice(0, 120)}`);
  };

  const out = await probeBackplaneSelectorSkus({}, makeMockSendCommand({ failRestore: false }), {
    selectorSkus: ['P72223-B21'],
    baselineSkus: new Set(['BASE01-B21']),
    expandSections: async () => { expandCalls += 1; },
    sleep: noopSleep
  });

  assert.strictEqual(out.skipped, false);
  assert.strictEqual(out.reason, 'BACKPLANE_SELECTOR_PROBED_AND_RESTORED');
  assert.strictEqual(expandCalls, 1);
  assert.strictEqual(currentQty, '0');
  assert.strictEqual(out.conditionalSkus.length, 1);
  assert.strictEqual(out.conditionalSkus[0].sku, 'P40497-B21');
  assert.strictEqual(out.conditionalSkus[0].numericListPrice, 4411);
  assert.strictEqual(out.conditionalSkus[0].conditionType, 'SELECTOR_STATE_CONDITIONAL');
  assert.strictEqual(out.conditionalSkus[0].selectorTriggerSku, 'P72223-B21');
  assert.strictEqual(out.observedSelectors.length, 1);
  assert.strictEqual(out.observedSelectors[0].value, 'SET_1_CAPTURED_AND_RESTORED_0');
  assert.strictEqual(out.observedSelectors[0].restoredCountAfter, 0);

  currentQty = '0';
  await assert.rejects(
    () => probeBackplaneSelectorSkus({}, makeMockSendCommand({ failRestore: true }), {
      baselineSkus: new Set(),
      expandSections: async () => {},
      sleep: noopSleep
    }),
    /BACKPLANE_SELECTOR_RESTORE_FAILED: P72223-B21 remained at qty=1/
  );

  currentQty = '0';
  await assert.rejects(
    () => probeBackplaneSelectorSkus({}, makeMockSendCommand({ loseReadback: true }), { sleep: noopSleep }),
    /BACKPLANE_SELECTOR_RESTORE_FAILED: P72223-B21 quantity readback unavailable/
  );

  currentQty = '0';
  const unverified = await probeBackplaneSelectorSkus({}, makeMockSendCommand({ failActivation: true }), { sleep: noopSleep });
  assert.equal(unverified.reason, 'NO_BACKPLANE_SELECTOR_ACTIVATION_VERIFIED');
  assert.deepEqual(unverified.observedSelectors, []);
  assert.deepEqual(unverified.conditionalSkus, []);

  const unmatched = await probeBackplaneSelectorSkus({}, makeMockSendCommand(), {
    selectorSkus: ['P72221-B21'],
    sleep: noopSleep
  });
  assert.equal(unmatched.reason, 'REQUESTED_BACKPLANE_SELECTOR_UNAVAILABLE');
  assert.deepEqual(unmatched.observedSelectors, []);

  const { _parseRevealedDriveRow } = require('../../scripts/lib/scraper/drive_cage_selector_probe.js');
  const parsedWithLeadingBlank = _parseRevealedDriveRow({
    id: 'item_tr_P49031-B21_storage_HotPlugSFFChoice',
    className: 'item_tr',
    inUnavail: false,
    visible: true,
    headers: ['', 'Product #', 'Description', 'Quantity', 'Price (USD)', 'Est. Lead Time', 'Start', 'Discontinued', 'Obsolete'],
    cells: ['', 'P49031-B21', 'HPE 15.36TB NVMe RI SFF Drive', '0', '21,580.00', '14', '01/01/2025', '12/31/2029', '']
  }, new Set(), new Set(), 'P72223-B21', '2SFF Backplane');
  assert.strictEqual(parsedWithLeadingBlank.sku, 'P49031-B21');
  assert.strictEqual(parsedWithLeadingBlank.numericListPrice, 21580);
  assert.strictEqual(parsedWithLeadingBlank.leadTime, '14');
});

test('Area C5: BOM CLIC Status Warning with zero unbuildables/errors proves portal validation; Unbuildable/spoofed claims fail closed', () => {
  const bomText = [
    'UCID: 5158389518-01  ( Solution Level )',
    'Line #\tProduct #\tDescription\tQty\tUnit Price (USD)\tCLIC Status',
    '1\tP72176-B21\tHPE ProLiant Compute DL360 Gen12 10SFF/20EDSFF Hybrid NC CTO Server\t10\t5022\tWarning',
    '2\tP58335-B21\tHPE MR408i-o Gen11 Storage Controller\t10\t5679\t',
    '3\t512485-B21\tHPE iLO Advanced 1-server License\t10\t525\tWarning'
  ].join('\n');

  const parsed = parseAndConsolidateBOQDetailed(bomText);
  assert.strictEqual(parsed.clicStatusSummary.hasClicStatusColumn, true);
  assert.strictEqual(parsed.clicStatusSummary.ucid, '5158389518-01');
  assert.strictEqual(parsed.clicStatusSummary.unbuildableCount, 0);
  assert.strictEqual(parsed.clicStatusSummary.errorCount, 0);
  assert.strictEqual(parsed.clicStatusSummary.warningCount, 2);
  assert.strictEqual(parsed.clicStatusSummary.portalValidatedFromBom, true);
  assert.strictEqual(parsed.clicStatusSummary.status, 'PORTAL_VALIDATED_WITH_WARNINGS');

  const verifiedPass = verifyPrePresentationAcceptance(
    { portalValidationStatus: parsed.clicStatusSummary.status, clicStatusSummary: parsed.clicStatusSummary, items: parsed.items },
    'BOQ_EVALUATION',
    { chassisDir: CHASSIS_DIR, items: parsed.items }
  );
  const b19Pass = verifiedPass.checks.find(c => c.id === 'B19');
  assert.strictEqual(b19Pass.status, 'PASSED');
  assert.strictEqual(b19Pass.severity, 'WARN');

  const badBom = [
    'UCID: 5158389518-99',
    'Line #\tProduct #\tDescription\tQty\tCLIC Status',
    '1\tP72176-B21\tHPE ProLiant Compute DL360 Gen12 CTO Server\t1\tUnbuildable'
  ].join('\n');
  const parsedBad = parseAndConsolidateBOQDetailed(badBom);
  assert.strictEqual(parsedBad.clicStatusSummary.portalValidatedFromBom, false);
  assert.strictEqual(parsedBad.clicStatusSummary.status, 'PORTAL_VALIDATION_FAILED');
  const verifiedBad = verifyPrePresentationAcceptance(
    { portalValidationStatus: 'PORTAL VALIDATION PENDING', clicStatusSummary: parsedBad.clicStatusSummary, items: parsedBad.items },
    'BOQ_EVALUATION',
    { chassisDir: CHASSIS_DIR, items: parsedBad.items }
  );
  assert.strictEqual(verifiedBad.checks.find(c => c.id === 'B19').status, 'FAILED');

  const spoofed = verifyPrePresentationAcceptance(
    { portalValidationStatus: 'PORTAL_VALIDATED_WITH_WARNINGS', items: parsed.items },
    'BOQ_EVALUATION',
    { chassisDir: CHASSIS_DIR, items: parsed.items }
  );
  assert.strictEqual(spoofed.checks.find(c => c.id === 'B19').status, 'FAILED');
});
