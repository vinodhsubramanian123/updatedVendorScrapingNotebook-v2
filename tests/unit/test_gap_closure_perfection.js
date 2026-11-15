'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { classifyLifecycleState, buildCatalogSkuIndex } = require('../../scripts/lib/catalog/sku.js');
const { formatDualTrackClearanceRemarks } = require('../../scripts/lib/boq/commercial_remarks.js');
const {
  extractComponentAttributes,
  scoreReplacementCandidate,
  isActiveCatalogOption,
  findBestAlternativeForDiscontinuedSku,
  identifyTroublesomeSkus
} = require('../../scripts/lib/conflict/least_delta_combinator.js');
const {
  computeArchitecturalDelta,
  computeCapabilityDowngradePenalty,
  synthesizeFastShipAlternative,
  _runPhysicalAspectsValidationLoop
} = require('../../scripts/lib/conflict/strategy_synthesizer.js');
const { evalMemoryChannel } = require('../../scripts/lib/aspects/memory_channel.js');
const { extractWorkloadDna } = require('../../scripts/lib/conflict/workload_dna.js');
const { analyzeDealValueEngineering } = require('../../scripts/lib/boq/deal_optimizer.js');
const { evalSupportServices } = require('../../scripts/lib/aspects/support_services.js');
const { classifyQueryIntent, executeRoutedQuery } = require('../../scripts/evaluators/route_query.js');
const { executeToolRequest } = require('../../scripts/services/mcp_server.js');
const { evalStorageTriMode } = require('../../scripts/lib/aspects/storage_tri_mode.js');
const {
  classifyDriveCageTopology,
  getCategoryDependencyMatrix,
  analyzeCategoryDependencies,
  queryLocalGraphifyNeighborhood
} = require('../../scripts/lib/catalog/category_dependencies.js');

// ---------------------------------------------------------------------------
// 1. Lifecycle normalization & discontinued_skus.json status fidelity
// ---------------------------------------------------------------------------
test('1. classifyLifecycleState normalizes all lifecycle strings and badges', () => {
  const ob = classifyLifecycleState('Obsolete (OB)');
  assert.strictEqual(ob.canonicalStatus, 'OBSOLETE');
  assert.strictEqual(ob.isObsolete, true);
  assert.strictEqual(ob.isBlockedForProduction, true);

  const eol = classifyLifecycleState('End of Life (EOL)');
  assert.strictEqual(eol.canonicalStatus, 'EOL');
  assert.strictEqual(eol.isHardEol, true);
  assert.strictEqual(eol.isBlockedForProduction, true);

  const disc = classifyLifecycleState('DISCONTINUED');
  assert.strictEqual(disc.canonicalStatus, 'DISCONTINUED');
  assert.strictEqual(disc.isDiscontinued, true);
  assert.strictEqual(disc.isBlockedForProduction, true);

  const rem = classifyLifecycleState('', 'REMOVED');
  assert.strictEqual(rem.canonicalStatus, 'DISCONTINUED');
  assert.strictEqual(rem.isDiscontinued, true);
  assert.strictEqual(rem.isBlockedForProduction, true);

  const warn90 = classifyLifecycleState('90-Day EOL Warning');
  assert.strictEqual(warn90.canonicalStatus, '90_DAY_WARNING');
  assert.strictEqual(warn90.is90DayWarning, true);
  assert.strictEqual(warn90.isBlockedForProduction, false);
  assert.strictEqual(warn90.isClearanceOrRestricted, true);

  const ds = classifyLifecycleState('Direct Ship (DS)');
  assert.strictEqual(ds.canonicalStatus, 'DIRECT_SHIP');
  assert.strictEqual(ds.isDirectShip, true);
  assert.strictEqual(ds.isBlockedForProduction, false);
  assert.strictEqual(ds.isClearanceOrRestricted, true);

  const active = classifyLifecycleState('Active');
  assert.strictEqual(active.canonicalStatus, 'ACTIVE');
  assert.strictEqual(active.isNonActive, false);
  assert.strictEqual(active.isBlockedForProduction, false);
});

test('1b. evalSupportServices blocks DISCONTINUED entries and allows REINSTATED entries', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'disc-reinstated-'));
  try {
    const historyDir = path.join(tmpDir, 'history');
    fs.mkdirSync(historyDir, { recursive: true });
    fs.writeFileSync(path.join(historyDir, 'discontinued_skus.json'), JSON.stringify([
      { productNumber: 'P64707-B21', status: 'REINSTATED' },
      { productNumber: 'P11111-B21', status: 'DISCONTINUED' }
    ]), 'utf8');

    const res = evalSupportServices(
      [
        { sku: 'P64707-B21', description: 'HPE 64GB DDR5 Memory', quantity: 2 },
        { sku: 'P11111-B21', description: 'Legacy Controller', quantity: 1 }
      ],
      null,
      { chassisDir: tmpDir }
    );
    assert.strictEqual(res.hasObsoleteRisk, true);
    assert.strictEqual(res.obsoleteSkus.some(s => s.cleanSku === 'P11111-B21'), true);
    assert.strictEqual(res.obsoleteSkus.some(s => s.cleanSku === 'P64707-B21'), false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// 2. Non-drive active replacement & rule-graph troublemaker attribution
// ---------------------------------------------------------------------------
test('2. least_delta_combinator replaces non-drive obsolete SKUs within category boundaries', () => {
  const catalogData = {
    entries: [
      {
        parentCategory: 'Processors',
        subCategory: 'Intel Xeon',
        skus: [
          { 'Product #': 'P67080-B21', Description: 'Intel Xeon-G 6530 32C 2.1GHz 270W Processor', 'Lifecycle Status': 'Obsolete (OB)', Price: '3500' },
          { 'Product #': 'P67082-B21', Description: 'Intel Xeon-G 6548Y+ 32C 2.5GHz 250W Processor', 'Lifecycle Status': 'Active', Price: '3700', leadTimeDays: 5 }
        ]
      },
      {
        parentCategory: 'Memory',
        subCategory: 'DDR5 DIMM',
        skus: [
          { 'Product #': 'P64708-B21', Description: 'HPE 64GB 2Rx4 PC5-5600B-R Smart Kit', 'Lifecycle Status': 'Active', Price: '950' }
        ]
      }
    ]
  };
  const idx = buildCatalogSkuIndex(catalogData);
  assert.strictEqual(isActiveCatalogOption(idx.get('P67080-B21')), false);
  assert.strictEqual(isActiveCatalogOption(idx.get('P67082-B21')), true);

  const cpuAttrs = extractComponentAttributes('Intel Xeon-G 6530 32C 2.1GHz 270W Processor', 'P67080-B21', 'Processors');
  assert.strictEqual(cpuAttrs.componentCategory, 'CPU');
  const crossCatScore = scoreReplacementCandidate({ sku: 'P64708-B21', description: 'HPE 64GB 2Rx4 PC5-5600B-R Smart Kit', price: 950 }, cpuAttrs, 3500);
  assert.ok(crossCatScore <= 0, 'Cross-category Memory candidate must not match CPU attributes');

  const alt = findBestAlternativeForDiscontinuedSku('P67080-B21', 'Intel Xeon-G 6530 32C 2.1GHz 270W Processor', catalogData, {});
  assert.ok(alt, 'Must find an active CPU replacement');
  assert.strictEqual(alt.sku, 'P67082-B21');
});

test('2b. identifyTroublesomeSkus attributes cascading troublemakers from rule/error graph', () => {
  const items = [
    { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 1 },
    { sku: 'P47779-B21', description: 'HPE MR408i-o Gen11 OCP3 Storage Controller', quantity: 1 }
  ];
  const evalResults = {
    aspects: {
      storage: { isInvalidControllerConfiguration: false },
      network: { hasSlotConflict: false },
      compute: {},
      support: {}
    },
    missingDependencies: [
      { sku: 'P48835-B21', sourceSku: 'P47779-B21', reason: 'Cascading expander required by P47779-B21', quantity: 1 },
      { sku: 'P48832-B21', triggerSku: 'P47779-B21', reason: 'Cable required by P47779-B21', quantity: 1 }
    ],
    warnings: []
  };
  const found = identifyTroublesomeSkus(items, evalResults, null, {});
  const hit = found.find(t => t.originalSku === 'P47779-B21');
  assert.ok(hit, 'Rule graph should attribute P47779-B21 as cascading troublemaker');
  assert.strictEqual(hit.type, 'RULE_GRAPH_DEPENDENCY_CASCADE');
});

// ---------------------------------------------------------------------------
// 3. Ranking delta credit, downgrade penalties, fast-ship & bounded repair loop
// ---------------------------------------------------------------------------
test('3. strategy_synthesizer credits equivalent replacements, penalizes GPU downgrade, and handles bounded loop', () => {
  const reqQty = new Map([['P64708-B21', 8]]);
  const equivQty = new Map([['P64709-B21', 8]]);
  const unMatchedQty = new Map([['P99999-B21', 8]]);
  const catMap = new Map([['P64708-B21', 'Memory'], ['P64709-B21', 'Memory'], ['P99999-B21', 'Memory']]);
  const origInfo = new Map([['P64708-B21', { description: 'HPE 64GB 2Rx4 PC5-5600B-R DDR5 Smart Memory', category: 'Memory', unitPriceUsd: 900 }]]);
  const eqInfo = new Map([['P64709-B21', { description: 'HPE 64GB 2Rx4 PC5-5600B-R Smart Memory', category: 'Memory', unitPriceUsd: 920 }]]);
  const diffInfo = new Map([['P99999-B21', { description: 'NVIDIA L4 24GB PCIe Accelerator', category: 'GPU', unitPriceUsd: 2500 }]]);

  const eqDelta = computeArchitecturalDelta(reqQty, equivQty, catMap, origInfo, eqInfo);
  const rawDelta = computeArchitecturalDelta(reqQty, unMatchedQty, catMap, origInfo, diffInfo);
  assert.ok(eqDelta < rawDelta, `Equivalent swap delta (${eqDelta}) must be strictly smaller than non-equivalent swap (${rawDelta})`);

  const downgradePenalty = computeCapabilityDowngradePenalty(
    { skuPartsList: [{ sku: 'S2L70C', description: 'NVIDIA L40S 48GB PCIe Accelerator' }] },
    [{ sku: 'S3U30C', description: 'NVIDIA H200 NVL 141GB PCIe Accelerator' }]
  );
  assert.ok(downgradePenalty >= 8, `GPU VRAM downgrade should trigger substantial penalty (got ${downgradePenalty})`);

  // Fast-ship: 4d and 7d items -> returns null
  const noFast = synthesizeFastShipAlternative(
    [
      { sku: 'P73282-B21', description: 'DL380 Gen12 CTO', quantity: 1, leadTimeDays: 4 },
      { sku: 'P64707-B21', description: '32GB DDR5-5600', quantity: 4, leadTimeDays: 7 }
    ],
    { maxLeadTimeDays: 7, unknownLeadTimeCount: 0, leadTimeOutliers: [] },
    { entries: [] },
    {},
    () => 100,
    parts => ({ parts, totalCost: 500, physicalMathClean: true, aspectErrors: [], injectedFixes: [] }),
    it => ({ leadTimeDays: it.leadTimeDays ?? 5 })
  );
  assert.strictEqual(noFast, null);

  // Fast-ship across CPU category: 25d -> 4d (>= 21d baseline & >= 14d saved)
  const fastCat = {
    entries: [{
      parentCategory: 'Processors',
      subCategory: 'Intel Xeon',
      skus: [
        { 'Product #': 'P67080-B21', Description: 'Intel Xeon-G 6530 32C 2.1GHz 270W Processor', 'Lifecycle Status': 'Active', Price: '3500', leadTimeDays: 25 },
        { 'Product #': 'P67082-B21', Description: 'Intel Xeon-G 6530 32C 2.2GHz 270W Processor', 'Lifecycle Status': 'Active', Price: '3550', leadTimeDays: 4 }
      ]
    }]
  };
  const fastAlt = synthesizeFastShipAlternative(
    [{ sku: 'P67080-B21', description: 'Intel Xeon-G 6530 32C 2.1GHz 270W Processor', category: 'Processors', quantity: 2, leadTimeDays: 25 }],
    { maxLeadTimeDays: 25, unknownLeadTimeCount: 0, leadTimeOutliers: [] },
    fastCat,
    {},
    sku => (sku === 'P67082-B21' ? 3550 : 3500),
    parts => ({ parts, totalCost: 7100, physicalMathClean: true, aspectErrors: [], injectedFixes: [] }),
    it => ({ leadTimeDays: it.sku === 'P67082-B21' ? 4 : 25 })
  );
  assert.ok(fastAlt, 'Fast-ship should synthesize alternative for 25d -> 4d across categories');
  assert.strictEqual(fastAlt.deliveryDaysSaved, 21);

  // Multi-pass loop supporting REMOVE, SUBSTITUTE, ADJUST_QTY, plus cycle/oscillation guard
  let callCount = 0;
  const loopParts = [
    { sku: '339778-B21', description: 'RAID 1 Setting', quantity: 1, unitPriceUsd: 0 },
    { sku: 'P47779-B21', description: 'MR408i-o OCP Controller', quantity: 1, unitPriceUsd: 500 },
    { sku: 'P64707-B21', description: '32GB DDR5-5600 DIMM', quantity: 2, unitPriceUsd: 400 }
  ];
  const loopRes = _runPhysicalAspectsValidationLoop(
    loopParts,
    new Set(loopParts.map(p => p.sku)),
    null,
    '',
    parts => {
      callCount++;
      if (callCount === 1) {
        return {
          isMathClean: false,
          errors: ['Pass 1 issues'],
          missingDependencies: [
            { action: 'REMOVE', originalSku: '339778-B21', sku: '339778-B21', reason: 'Prune redundant RAID1' },
            { action: 'SUBSTITUTE', originalSku: 'P47779-B21', sku: 'P47777-B21', description: 'MR416i-p PCIe Controller', quantity: 1, reason: 'Free OCP slot' },
            { action: 'ADJUST_QTY', sku: 'P64707-B21', quantity: 4, reason: 'Minimum 4 DIMMs per 2P' }
          ]
        };
      }
      return { isMathClean: true, errors: [], missingDependencies: [] };
    },
    () => 450,
    []
  );
  assert.strictEqual(loopRes.isClean, true);
  assert.strictEqual(loopParts.some(p => p.sku === '339778-B21'), false);
  assert.strictEqual(loopParts.some(p => p.sku === 'P47777-B21'), true);
  assert.strictEqual(loopParts.find(p => p.sku === 'P64707-B21')?.quantity, 4);

  // Oscillation guard test
  let toggle = 0;
  const oscParts = [{ sku: 'A11111-B21', description: 'Part A', quantity: 1, unitPriceUsd: 10 }];
  const oscRes = _runPhysicalAspectsValidationLoop(
    oscParts,
    new Set(['A11111-B21']),
    null,
    '',
    () => {
      toggle++;
      return toggle % 2 === 1
        ? { isMathClean: false, errors: ['Swap A->B'], missingDependencies: [{ action: 'SUBSTITUTE', originalSku: 'A11111-B21', sku: 'B22222-B21', quantity: 1 }] }
        : { isMathClean: false, errors: ['Swap B->A'], missingDependencies: [{ action: 'SUBSTITUTE', originalSku: 'B22222-B21', sku: 'A11111-B21', quantity: 1 }] };
    },
    () => 10,
    []
  );
  assert.strictEqual(oscRes.isClean, false);
  assert.ok(oscRes.aspectErrors.some(e => e.toLowerCase().includes('oscillation')));
});

// ---------------------------------------------------------------------------
// 4. Memory speeds/ranks/NUMA & GPU Workload DNA enrichment
// ---------------------------------------------------------------------------
test('4. memory_channel and workload_dna extract MT/s speeds, ranks, 2DPC derating, NUMA and GPU telemetry', () => {
  const mem = evalMemoryChannel(
    [
      { sku: 'P64707-B21', description: 'HPE 32GB 2Rx8 PC5-5600B-R Smart Kit', quantity: 16 },
      { sku: 'P69727-F21', description: 'HPE 64GB 2Rx4 DDR5-6400 Smart Memory', quantity: 16 }
    ],
    2,
    null,
    true,
    8
  );
  assert.deepStrictEqual(mem.speedsMts, [5600, 6400]);
  assert.deepStrictEqual(mem.ranks, ['2rx4', '2rx8']);
  assert.strictEqual(mem.hasMixedSpeeds, true);
  assert.strictEqual(mem.hasMixedRanks, true);
  assert.strictEqual(mem.is2DpcSpeedDerated, true);
  assert.ok(mem.numaTopology, 'numaTopology must be attached on memory metrics');

  const dna = extractWorkloadDna([
    { sku: 'S3U30C', description: 'NVIDIA H200 NVL 141GB 600W PCIe Accelerator', quantity: 4 },
    { sku: 'P64707-B21', description: 'HPE 32GB 2Rx8 PC5-5600B-R Smart Kit', quantity: 8 }
  ]);
  assert.strictEqual(dna.hasGpu, true);
  assert.strictEqual(dna.gpuTotalVramGb, 564);
  assert.strictEqual(dna.gpuEstimatedPowerWatts, 2400);
  assert.strictEqual(dna.gpuHasNvlink, true);
});

// ---------------------------------------------------------------------------
// 5. Deal Optimizer cross-category availability lead-time opportunities
// ---------------------------------------------------------------------------
test('5. deal_optimizer surfaces general availability lead-time improvement opportunities (>= 21d, saves >= 14d)', () => {
  const catalogData = {
    entries: [{
      parentCategory: 'Networking',
      subCategory: 'OCP Adapters',
      skus: [
        { 'Product #': 'P10115-B21', Description: 'HPE Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter', 'Lifecycle Status': 'Active', Price: '600', leadTimeDays: 28 },
        { 'Product #': 'P41614-B21', Description: 'Broadcom Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter', 'Lifecycle Status': 'Active', Price: '520', leadTimeDays: 4 }
      ]
    }]
  };
  const ve = analyzeDealValueEngineering(
    [{ sku: 'P10115-B21', description: 'HPE Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter', category: 'Networking', quantity: 2, unitListPrice: 600, leadTimeDays: 28 }],
    { aspects: { compute: {}, power: {}, support: {} } },
    catalogData,
    null
  );
  const availOpp = ve.opportunities.find(o => o.id === 'VE-OPT-LEADTIME-P10115-B21');
  assert.ok(availOpp, 'Should surface general availability opportunity for 28d -> 4d adapter');
  assert.strictEqual(availOpp.leadTimeSavedDays, 24);
  assert.strictEqual(availOpp.estimatedSavingsUsd, 160);
});

// ---------------------------------------------------------------------------
// 6. PRESALES_CLEARANCE_STRATEGY routing & dual-track remarks
// ---------------------------------------------------------------------------
test('6. route_query classifies & executes PRESALES_CLEARANCE_STRATEGY with dual-track commercial remarks', async () => {
  const cls = classifyQueryIntent('Provide 90-day clearance options vs active production baseline for P64707-B21 on DL380 Gen12');
  assert.strictEqual(cls.intent, 'PRESALES_CLEARANCE_STRATEGY');

  const res = await executeRoutedQuery('Provide 90-day clearance options vs active production baseline for DL380 Gen12', { offline: true });
  assert.strictEqual(res.classification.intent, 'PRESALES_CLEARANCE_STRATEGY');
  assert.ok(res.result?.commercialRemarks?.productionRemark);
  assert.ok(res.result?.commercialRemarks?.clearanceRemark);

  const formatted = formatDualTrackClearanceRemarks({
    clearanceSku: 'P49639-B21',
    productionSku: 'P64707-B21',
    deliveryRiskNote: '35-day lead time'
  });
  assert.ok(formatted.productionRemark.includes('RECOMMENDED PRODUCTION BASELINE'));
  assert.ok(formatted.clearanceRemark.includes('FAST-TRACK / CLEARANCE OPTION'));
  assert.ok(formatted.deliveryRiskRemark.includes('DELIVERY RISK WARNING'));
});

// ---------------------------------------------------------------------------
// 7. MCP server aspect handlers accept optional chassis_id & forward catalog/memory options
// ---------------------------------------------------------------------------
test('7. mcp_server aspect handlers resolve catalog context when chassis_id is provided and forward memory params', async () => {
  const memResp = await executeToolRequest(
    {
      params: {
        name: 'evaluate_aspect_memory',
        arguments: {
          chassis_id: 'DL380_Gen12',
          cpu_count: 2,
          is_cto: true,
          channel_width: 8,
          items_json: JSON.stringify([{ sku: 'P64707-B21', description: '32GB 2Rx8 DDR5-5600 DIMM', quantity: 4 }])
        }
      }
    },
    { signal: new AbortController().signal }
  );
  assert.strictEqual(memResp.isError, undefined);
  const parsedMem = JSON.parse(memResp.content[0].text);
  assert.strictEqual(parsedMem.channelWidth, 8);
  assert.strictEqual(parsedMem.cpuCount, 2);

  const thermalResp = await executeToolRequest(
    {
      params: {
        name: 'evaluate_aspect_thermal',
        arguments: {
          chassis_id: 'DL380_Gen12',
          items_json: JSON.stringify([{ sku: 'P73282-B21', description: 'DL380 Gen12 CTO', quantity: 1 }])
        }
      }
    },
    { signal: new AbortController().signal }
  );
  assert.strictEqual(thermalResp.isError, undefined);
  const parsedThermal = JSON.parse(thermalResp.content[0].text);
  assert.ok(parsedThermal.cpuCount !== undefined && parsedThermal.thermalEquationFormula !== undefined);
});

// ---------------------------------------------------------------------------
// 8. Drive Cage Topology -> Storage Controller vs Direct-Connect vs No-Drive
// ---------------------------------------------------------------------------
test('8. Drive cage topology (not bare drives) governs Storage Controller requirement across cages/direct-connect/no-drive', () => {
  // Case A: Bare NVMe drives without a controller-routed front cage -> controller NOT flagged by cage rule
  const bareDrives = evalStorageTriMode([
    { sku: 'P63829-B21', description: 'HPE 1.92TB NVMe Gen4 High Performance Read Intensive SFF SSD', quantity: 4 }
  ]);
  assert.strictEqual(bareDrives.needsStorageControllerForCage, false);

  // Case B: No-Drive FIO kit -> controller NOT required
  const noDriveRes = evalStorageTriMode([
    { sku: 'P73282-B21', description: 'HPE ProLiant Compute DL380 Gen12 CTO Server', quantity: 1 },
    { sku: '873763-B21', description: 'HPE ProLiant Compute No Drive Configuration FIO Kit', quantity: 1 }
  ]);
  assert.strictEqual(noDriveRes.needsStorageControllerForCage, false);
  assert.strictEqual(classifyDriveCageTopology([
    { sku: '873763-B21', description: 'HPE ProLiant Compute No Drive Configuration FIO Kit', quantity: 1 }
  ]).topology, 'NO_DRIVE_KIT');

  // Case C: Direct-Attach NVMe front drive cage -> controller NOT required
  const directCageItems = [
    { sku: 'P73282-B21', description: 'HPE ProLiant Compute DL380 Gen12 CTO Server', quantity: 1 },
    { sku: 'P75742-B21', description: 'HPE ProLiant Compute DL380 Gen12 8SFF NVMe Direct Attach Drive Cage Kit', quantity: 1 }
  ];
  const directRes = evalStorageTriMode(directCageItems);
  assert.strictEqual(directRes.hasDirectConnectCage, true);
  assert.strictEqual(directRes.needsStorageControllerForCage, false);
  assert.strictEqual(classifyDriveCageTopology(directCageItems).controllerRequiredByCage, false);

  // Case D: Controller-routed Tri-Mode U.3 front drive cage WITHOUT controller -> mandates controller
  const routedCageItems = [
    { sku: 'P73282-B21', description: 'HPE ProLiant Compute DL380 Gen12 CTO Server', quantity: 1 },
    { sku: 'P75741-B21', description: 'HPE ProLiant Compute DL3XX Gen12 8SFF x4 U.3 Tri-Mode Drive Cage Kit', quantity: 1 }
  ];
  const routedMissingCtrl = evalStorageTriMode(routedCageItems);
  assert.strictEqual(routedMissingCtrl.hasControllerRoutedCage, true);
  assert.strictEqual(routedMissingCtrl.needsStorageControllerForCage, true);
  assert.strictEqual(classifyDriveCageTopology(routedCageItems).controllerRequiredByCage, true);

  // Case E: Controller-routed front drive cage WITH MR416i-p -> satisfied
  const routedWithCtrl = evalStorageTriMode([
    ...routedCageItems,
    { sku: 'P47777-B21', description: 'HPE MR416i-p Gen11 x16 Lanes 8GB Cache PCI SPDM Storage Controller', quantity: 1 }
  ]);
  assert.strictEqual(routedWithCtrl.needsStorageControllerForCage, false);
});

// ---------------------------------------------------------------------------
// 9. Cross-category dependency matrix, Graphify/NotebookLM/Web escalation & MCP tool
// ---------------------------------------------------------------------------
test('9. category_dependencies & mcp inspect_category_dependencies provide matrix, ambiguity detection and escalation hints', async () => {
  const matrix = getCategoryDependencyMatrix('Drive Cage');
  assert.ok(matrix.length >= 1 && matrix[0].category === 'Drive Cage / Backplane');
  assert.ok(matrix[0].dictatedBy.includes('NOT bare drives alone'));

  const bom = [
    { sku: 'P73282-B21', description: 'HPE ProLiant Compute DL380 Gen12 CTO Server', quantity: 1 },
    { sku: 'P75741-B21', description: 'HPE ProLiant Compute DL3XX Gen12 8SFF x4 U.3 Tri-Mode Drive Cage Kit', quantity: 1 },
    { sku: 'S3U30C', description: 'NVIDIA H200 NVL 141GB 600W PCIe Accelerator', quantity: 2 }
  ];
  const depAnalysis = analyzeCategoryDependencies(bom, null, { chassisId: 'DL380_Gen12' });
  assert.ok(depAnalysis.activeCategories.includes('Drive Cage / Backplane'));
  assert.ok(depAnalysis.activeCategories.includes('GPU / Accelerator'));
  assert.strictEqual(depAnalysis.unresolvedAmbiguities.length, 1);
  assert.ok(depAnalysis.escalationGuidance.trustedWebQueryHints.some(q => q.includes('site:hpe.com')));
  assert.ok(depAnalysis.escalationGuidance.notebookQueryHints.length >= 2);
  assert.ok(depAnalysis.escalationGuidance.graphifySymbols.includes('evalStorageTriMode'));

  const graphRes = queryLocalGraphifyNeighborhood('evalStorageTriMode');
  assert.strictEqual(typeof graphRes.available, 'boolean');

  const mcpResp = await executeToolRequest(
    {
      params: {
        name: 'inspect_category_dependencies',
        arguments: {
          chassis_id: 'DL380_Gen12',
          category_filter: 'Drive Cage',
          items_json: JSON.stringify(bom)
        }
      }
    },
    { signal: new AbortController().signal }
  );
  assert.strictEqual(mcpResp.isError, undefined);
  const parsed = JSON.parse(mcpResp.content[0].text);
  assert.ok(parsed.matrix.length >= 1 && parsed.matrix[0].category === 'Drive Cage / Backplane');
  assert.strictEqual(parsed.analysis.storageTopology.topology, 'CONTROLLER_ROUTED_CAGE');
});
