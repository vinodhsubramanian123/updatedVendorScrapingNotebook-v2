'use strict';

const test = require('node:test');
const assert = require('node:assert');
const {
  identifyTroublesomeSkus,
  buildLeastDeltaCandidate
} = require('../../scripts/lib/conflict/least_delta_combinator.js');

// ── Helpers ──────────────────────────────────────────────────────────────────
function mkItem(sku, description = '', quantity = 1) {
  return { sku, description, quantity, unitListPrice: 100 };
}

function mkEval(overrides = {}) {
  return {
    missingDependencies: [],
    errors: [],
    warnings: [],
    aspects: {
      storage: { driveCount: 0, controllerDirectCapacity: 0 },
      network: { isExceedingOcpSlots: false },
      compute: { cpuCount: 2, maxCpuTdpWatts: 205 },
      support: { unsolicitedOptionalItems: null }
    },
    ...overrides
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// identifyTroublesomeSkus
// ═══════════════════════════════════════════════════════════════════════════════

test('Least-Delta — Empty inputs produce zero troublesome SKUs', () => {
  const result = identifyTroublesomeSkus([], {}, null, {});
  assert.ok(Array.isArray(result));
  assert.strictEqual(result.length, 0);
});

test('Least-Delta — Detects STORAGE_EXPANDER_CASCADE when SAS expander is mandated', () => {
  const items = [
    mkItem('P408i-o', 'HPE MR408i-o 8-port Tri-Mode RAID controller'),
    mkItem('P64707-B21', 'HPE 1.92TB SAS SSD', 16)
  ];
  const evalResults = mkEval({
    missingDependencies: [{ key: 'SAS_EXPANDER_CARD', sku: 'P48835-B21' }],
    aspects: {
      storage: { driveCount: 16, controllerDirectCapacity: 8 },
      network: {},
      compute: { cpuCount: 2, maxCpuTdpWatts: 205 },
      support: {}
    }
  });

  const result = identifyTroublesomeSkus(items, evalResults, null, { model: 'DL380_Gen12', gen: 'Gen12' });

  assert.ok(result.length >= 1, 'Should detect at least 1 troublesome SKU');
  const cascade = result.find(t => t.type === 'STORAGE_EXPANDER_CASCADE');
  assert.ok(cascade, 'Must find STORAGE_EXPANDER_CASCADE type');
  assert.strictEqual(cascade.action, 'SUBSTITUTE_CONTROLLER_DIRECT_ATTACH');
  assert.ok(cascade.cascadingSkusEliminated.includes('P48835-B21'), 'Expander card should be in elimination list');
  assert.ok(cascade.presalesValuePitch.length > 20, 'Must have substantive presales pitch');
});

test('Least-Delta — Detects CONTESTED_OCP_SLOT_COLLISION', () => {
  const items = [
    mkItem('MR408i-o', 'HPE MR408i-o OCP Storage Controller'),
    mkItem('P41614-B21', 'HPE 25GbE OCP NIC Adapter', 2)
  ];
  const evalResults = mkEval({
    aspects: {
      storage: {},
      network: { isExceedingOcpSlots: true },
      compute: { cpuCount: 2, maxCpuTdpWatts: 205 },
      support: {}
    }
  });

  const result = identifyTroublesomeSkus(items, evalResults, null, { model: 'DL380_Gen12' });
  const collision = result.find(t => t.type === 'CONTESTED_OCP_SLOT_COLLISION');
  assert.ok(collision, 'Must detect OCP slot collision');
  assert.strictEqual(collision.action, 'PIVOT_FORM_FACTOR_TO_PCIE');
});

test('Least-Delta — Detects UNSOLICITED_ECOSYSTEM_OUTLIER', () => {
  const items = [mkItem('P73299-B21', 'CTO Chassis')];
  const evalResults = mkEval({
    aspects: {
      storage: {},
      network: {},
      compute: { cpuCount: 2, maxCpuTdpWatts: 205 },
      support: {
        unsolicitedOptionalItems: [
          { sku: 'HA114A1', description: 'HPE Installation and Startup Service', quantity: 1 }
        ]
      }
    }
  });

  const result = identifyTroublesomeSkus(items, evalResults, null, {});
  const unsolicited = result.find(t => t.type === 'UNSOLICITED_ECOSYSTEM_OUTLIER');
  assert.ok(unsolicited, 'Must detect unsolicited service');
  assert.strictEqual(unsolicited.action, 'PRUNE_UNSOLICITED_OUTLIER');
  assert.strictEqual(unsolicited.alternativeSku, null);
});

test('Least-Delta — Detects MEMORY_BUS_SPEED_BOTTLENECK for Silver CPU + DDR5-5600', () => {
  const items = [
    mkItem('4410Y', 'Intel Xeon Silver 4410Y Processor'),
    mkItem('P73300-B21', 'HPE 32GB DDR5-5600 RDIMM', 8)
  ];
  const evalResults = mkEval({
    aspects: {
      storage: {},
      network: {},
      compute: { cpuCount: 2, maxCpuTdpWatts: 150 },
      support: {}
    }
  });

  const result = identifyTroublesomeSkus(items, evalResults, null, {});
  const mismatch = result.find(t => t.type === 'MEMORY_BUS_SPEED_BOTTLENECK');
  assert.ok(mismatch, 'Must detect memory speed bottleneck');
  assert.strictEqual(mismatch.action, 'ALIGN_MEMORY_BUS_SPEED');
});

test('Least-Delta — No false positives on clean BOQ with high-TDP CPU and DDR5-5600', () => {
  const items = [
    mkItem('P73305-B21', 'Intel Xeon Gold 6538N+ Processor'),
    mkItem('P73300-B21', 'HPE 32GB DDR5-5600 RDIMM', 8)
  ];
  const evalResults = mkEval({
    aspects: {
      storage: {},
      network: {},
      compute: { cpuCount: 2, maxCpuTdpWatts: 205 },
      support: {}
    }
  });

  const result = identifyTroublesomeSkus(items, evalResults, null, {});
  const mismatch = result.find(t => t.type === 'MEMORY_BUS_SPEED_BOTTLENECK');
  assert.strictEqual(mismatch, undefined, 'No memory bottleneck for high-TDP Gold CPU');
});

// ═══════════════════════════════════════════════════════════════════════════════
// buildLeastDeltaCandidate
// ═══════════════════════════════════════════════════════════════════════════════

test('Least-Delta — buildLeastDeltaCandidate returns null when no troublesome SKUs', () => {
  const result = buildLeastDeltaCandidate([], [], [], {}, null, {}, () => 0);
  assert.strictEqual(result, null);
});

test('Least-Delta — buildLeastDeltaCandidate substitutes controller and prunes cascades', () => {
  const baseParts = [
    { sku: 'P73299-B21', description: 'CTO Chassis', quantity: 1, unitPriceUsd: 3200, extendedPriceUsd: 3200 },
    { sku: 'P408i-o', description: '8-port Tri-Mode Controller', quantity: 1, unitPriceUsd: 450, extendedPriceUsd: 450 }
  ];
  const fixParts = [
    { sku: 'P48835-B21', description: 'SAS Expander Card', quantity: 1, unitPriceUsd: 200, extendedPriceUsd: 200, isFixInjected: true },
    { sku: 'P48918-B21', description: 'Controller Enablement Cable', quantity: 1, unitPriceUsd: 50, extendedPriceUsd: 50, isFixInjected: true },
    { sku: 'P48820-B21', description: 'High Performance Fan Kit', quantity: 1, unitPriceUsd: 150, extendedPriceUsd: 150, isFixInjected: true }
  ];
  const troublesomeSkus = [{
    type: 'STORAGE_EXPANDER_CASCADE',
    originalSku: 'P408i-o',
    originalDesc: '8-port Tri-Mode Controller',
    troublesomeReason: '8-port controller requires SAS Expander',
    alternativeSku: 'P55415-B21',
    alternativeDesc: 'MR416i-o 16-port Controller',
    action: 'SUBSTITUTE_CONTROLLER_DIRECT_ATTACH',
    functionalEquivalence: '16-port direct-attach',
    cascadingSkusEliminated: ['P48835-B21', 'P48918-B21'],
    presalesValuePitch: 'Eliminates expander latency'
  }];

  const getPrice = (sku) => {
    const prices = { 'P55415-B21': 650, 'P48820-B21': 150 };
    return prices[sku] || 0;
  };

  const result = buildLeastDeltaCandidate(baseParts, fixParts, troublesomeSkus, {}, null, {}, getPrice);

  assert.ok(result, 'Must produce a candidate');
  assert.strictEqual(result.isLeastDeltaPath, true);
  assert.strictEqual(result.troublesomeRootSku, 'P408i-o');
  assert.strictEqual(result.alternativeSku, 'P55415-B21');

  // Verify controller was substituted
  const hasSub = result.parts.some(p => p.sku === 'P55415-B21');
  assert.ok(hasSub, 'Alternative controller must be in candidate parts');

  // Verify original controller was removed
  const hasOrig = result.parts.some(p => p.sku === 'P408i-o');
  assert.ok(!hasOrig, 'Original troublesome controller must be removed');

  // Verify cascading parts were pruned
  const hasExpander = result.parts.some(p => p.sku === 'P48835-B21');
  const hasCable = result.parts.some(p => p.sku === 'P48918-B21');
  assert.ok(!hasExpander, 'SAS Expander must be pruned');
  assert.ok(!hasCable, 'Enablement cable must be pruned');

  // Verify non-cascading fix is retained
  const hasFan = result.parts.some(p => p.sku === 'P48820-B21');
  assert.ok(hasFan, 'Non-cascading fan kit must be retained');

  // Verify delta metrics
  assert.strictEqual(result.deltaMetrics.replacementsCount, 1);
  assert.ok(result.deltaMetrics.cascadingDependenciesAvoided >= 2);
  assert.ok(result.sharedIntelligenceReasoning.length > 50, 'Must have substantive reasoning');
});

test('Least-Delta — buildLeastDeltaCandidate prunes unsolicited outlier', () => {
  const baseParts = [
    { sku: 'P73299-B21', description: 'CTO Chassis', quantity: 1, unitPriceUsd: 3200, extendedPriceUsd: 3200 },
    { sku: 'HA114A1', description: 'Installation Service', quantity: 1, unitPriceUsd: 850, extendedPriceUsd: 850 }
  ];
  const troublesomeSkus = [{
    type: 'UNSOLICITED_ECOSYSTEM_OUTLIER',
    originalSku: 'HA114A1',
    originalDesc: 'Installation Service',
    troublesomeReason: 'Not requested by customer',
    alternativeSku: null,
    alternativeDesc: null,
    action: 'PRUNE_UNSOLICITED_OUTLIER',
    functionalEquivalence: 'Core hardware stays buildable',
    cascadingSkusEliminated: ['HA114A1'],
    presalesValuePitch: 'Competitive bid pricing'
  }];

  const result = buildLeastDeltaCandidate(baseParts, [], troublesomeSkus, {}, null, {}, () => 0);

  assert.ok(result, 'Must produce a candidate');
  const hasService = result.parts.some(p => p.sku === 'HA114A1');
  assert.ok(!hasService, 'Unsolicited service must be pruned');
  assert.ok(result.deltaMetrics.removalsCount >= 1, 'Must record removal');
});

test('Least-Delta — findBestAlternativeInCatalog dynamically queries catalog', () => {
  const { findBestAlternativeInCatalog } = require('../../scripts/lib/conflict/least_delta_combinator.js');
  
  // Test fallback when catalog is null
  const fallbackExpander = findBestAlternativeInCatalog('STORAGE_EXPANDER_CASCADE', 'P408i-o', {}, null, { gen: 'Gen12' });
  assert.strictEqual(fallbackExpander.sku, 'P55415-B21');

  const fallbackPcie = findBestAlternativeInCatalog('CONTESTED_OCP_SLOT_COLLISION', 'P408i-o', {}, null, {});
  assert.strictEqual(fallbackPcie.sku, 'P47777-B21');

  const fallbackMem = findBestAlternativeInCatalog('MEMORY_BUS_SPEED_BOTTLENECK', 'P73300-B21', { targetCapacityGb: 32 }, null, {});
  assert.strictEqual(fallbackMem.sku, 'P43328-B21');

  // Test dynamic resolution when catalog entries are provided
  const mockCatalog = {
    entries: [
      {
        parentCategory: 'Storage',
        skus: [
          { 'Product #': 'P55415-B21', Description: 'HPE Broadcom MR416i-o x16 Lanes 8GB Cache Tri-Mode Controller', 'Lifecycle Status': 'Active' },
          { 'Product #': 'P47777-B21', Description: 'HPE MR416i-p Gen11 x16 Lanes 8GB Cache PCIe Storage Controller', 'Lifecycle Status': 'Active' }
        ]
      },
      {
        parentCategory: 'Memory',
        skus: [
          { 'Product #': 'P43328-B21', Description: 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit', 'Lifecycle Status': 'Active' }
        ]
      }
    ]
  };

  const dynamicExpander = findBestAlternativeInCatalog('STORAGE_EXPANDER_CASCADE', 'P408i-o', {}, mockCatalog, {});
  assert.strictEqual(dynamicExpander.sku, 'P55415-B21');

  const dynamicPcie = findBestAlternativeInCatalog('CONTESTED_OCP_SLOT_COLLISION', 'P408i-o', {}, mockCatalog, {});
  assert.strictEqual(dynamicPcie.sku, 'P47777-B21');

  const dynamicMem = findBestAlternativeInCatalog('MEMORY_BUS_SPEED_BOTTLENECK', 'P73300-B21', { targetCapacityGb: 32 }, mockCatalog, {});
  assert.strictEqual(dynamicMem.sku, 'P43328-B21');
});

test('Least-Delta — buildLeastDeltaCandidate handles multiple simultaneous troublesome SKUs', () => {
  const baseParts = [
    { sku: 'P73299-B21', description: 'CTO Chassis', quantity: 1, unitPriceUsd: 3200, extendedPriceUsd: 3200 },
    { sku: 'P408i-o', description: '8-port Tri-Mode Controller', quantity: 1, unitPriceUsd: 450, extendedPriceUsd: 450 },
    { sku: 'HA114A1', description: 'Unsolicited Service', quantity: 1, unitPriceUsd: 850, extendedPriceUsd: 850 }
  ];
  const fixParts = [
    { sku: 'P48835-B21', description: 'SAS Expander Card', quantity: 1, unitPriceUsd: 200, extendedPriceUsd: 200, isFixInjected: true }
  ];
  const troublesomeSkus = [
    {
      type: 'STORAGE_EXPANDER_CASCADE',
      originalSku: 'P408i-o',
      originalDesc: '8-port Controller',
      troublesomeReason: 'Forces SAS expander',
      alternativeSku: 'P55415-B21',
      alternativeDesc: '16-port Controller',
      action: 'SUBSTITUTE_CONTROLLER_DIRECT_ATTACH',
      functionalEquivalence: 'Direct attach',
      cascadingSkusEliminated: ['P48835-B21'],
      presalesValuePitch: 'Eliminates expander'
    },
    {
      type: 'UNSOLICITED_ECOSYSTEM_OUTLIER',
      originalSku: 'HA114A1',
      originalDesc: 'Unsolicited Service',
      troublesomeReason: 'Not requested by customer',
      alternativeSku: null,
      alternativeDesc: null,
      action: 'PRUNE_UNSOLICITED_OUTLIER',
      functionalEquivalence: 'Core hardware intact',
      cascadingSkusEliminated: ['HA114A1'],
      presalesValuePitch: 'Commercial competitiveness'
    }
  ];

  const getPrice = (sku) => (sku === 'P55415-B21' ? 650 : 0);
  const result = buildLeastDeltaCandidate(baseParts, fixParts, troublesomeSkus, {}, null, {}, getPrice);

  assert.ok(result, 'Must produce candidate');
  assert.strictEqual(result.deltaMetrics.replacementsCount, 1, 'Must have 1 replacement (controller)');
  assert.strictEqual(result.deltaMetrics.removalsCount, 1, 'Must have 1 removal (unsolicited service)');
  assert.strictEqual(result.deltaMetrics.cascadingDependenciesAvoided, 2, 'Must avoid 2 cascading SKUs');
  assert.ok(!result.parts.some(p => p.sku === 'HA114A1'), 'Service must be pruned');
  assert.ok(!result.parts.some(p => p.sku === 'P48835-B21'), 'Expander must be pruned');
  assert.ok(result.parts.some(p => p.sku === 'P55415-B21'), 'Alternative controller must be present');
});

test('Least-Delta — Detects GENERATIONAL_CPU_OBSOLESCENCE and GENERATIONAL_MEMORY_COUPLING on DL380 Gen11', () => {
  const items = [
    mkItem('P52533-B21', 'HPE ProLiant DL380 Gen11 12LFF NC Configure-to-order Server'),
    mkItem('P49619-B21', 'Intel Xeon-Gold 6414U 2.0GHz 32-core 250W Processor for HPE'),
    mkItem('P43328-B21', 'HPE 32GB (1x32GB) Dual Rank x8 DDR5-4800 CAS-40-39-39 EC8 Registered Smart Memory Kit', 8)
  ];
  const evalResults = mkEval({
    missingDependencies: [
      { sku: 'P43328-F21', description: 'HPE Factory Integrated Option (FIO) Replacement for P43328-B21' }
    ]
  });

  const troublesome = identifyTroublesomeSkus(items, evalResults, null, { model: 'DL380_Gen11', gen: 'Gen11' });
  assert.ok(troublesome.length >= 2, 'Must detect CPU obsolescence and memory coupling');

  const cpuTrouble = troublesome.find(t => t.type === 'GENERATIONAL_CPU_OBSOLESCENCE');
  assert.ok(cpuTrouble, 'Must find GENERATIONAL_CPU_OBSOLESCENCE');
  assert.strictEqual(cpuTrouble.originalSku, 'P49619-B21');
  assert.strictEqual(cpuTrouble.alternativeSku, 'P67082-B21');
  assert.ok(cpuTrouble.alternativeDesc.includes('6548Y+'), 'Must upgrade to 5th Gen 6548Y+');

  const memTrouble = troublesome.find(t => t.type === 'GENERATIONAL_MEMORY_COUPLING');
  assert.ok(memTrouble, 'Must find GENERATIONAL_MEMORY_COUPLING');
  assert.strictEqual(memTrouble.originalSku, 'P43328-B21');
  assert.strictEqual(memTrouble.alternativeSku, 'P64706-F21');
  assert.ok(memTrouble.alternativeDesc.includes('5600'), 'Must upgrade to DDR5-5600');

  const baseParts = items.map(it => ({ sku: it.sku, description: it.description, quantity: it.quantity, unitPriceUsd: 100, extendedPriceUsd: 100 * it.quantity }));
  const fixParts = [{ sku: 'P43328-F21', description: 'HPE FIO Replacement', quantity: 8, unitPriceUsd: 100, extendedPriceUsd: 800 }];
  const candidate = buildLeastDeltaCandidate(baseParts, fixParts, troublesome, evalResults, null, { model: 'DL380_Gen11' }, () => 200);

  assert.ok(candidate, 'Must generate candidate');
  assert.strictEqual(candidate.strategyName, 'MODERNIZED_5TH_GEN_PLATFORM');
  assert.ok(candidate.tierTitle.includes('Modernized 5th Gen Platform'));
  assert.ok(candidate.parts.some(p => p.sku === 'P67082-B21'), '5th Gen CPU must be in parts');
  assert.ok(candidate.parts.some(p => p.sku === 'P64706-F21'), 'DDR5-5600 FIO Memory must be in parts');
  assert.ok(!candidate.parts.some(p => p.sku === 'P43328-F21'), 'Legacy DDR5-4800 FIO fix must be eliminated');
  assert.ok(!candidate.parts.some(p => p.sku === 'P49619-B21'), 'Legacy 4th Gen CPU must be replaced');
});

test('Least-Delta — Modernizes 8480+ to 8570 and DDR5-4800 to DDR5-5600 for Config 1 Server', () => {
  const items = [
    mkItem('P52534-B21', 'HPE ProLiant DL380 Gen11 8SFF NC Configure-to-order Server', 10),
    mkItem('P49607-B21', 'Intel Xeon-Platinum 8480+ 2.0GHz 56-core 350W Processor for HPE', 20),
    mkItem('P43334-B21', 'HPE 128GB (1x128GB) Quad Rank x4 DDR5-4800 CAS-46-39-39 EC8 Registered 3DS Smart Memory Kit', 80)
  ];
  const evalResults = mkEval({
    missingDependencies: [
      { sku: 'P43334-F21', description: 'HPE Factory Integrated Option (FIO) Replacement for P43334-B21' }
    ]
  });

  const troublesome = identifyTroublesomeSkus(items, evalResults, null, { model: 'DL380_Gen11', gen: 'Gen11' });
  const cpuTrouble = troublesome.find(t => t.type === 'GENERATIONAL_CPU_OBSOLESCENCE');
  assert.ok(cpuTrouble, 'Must identify 8480+ generational obsolescence');
  assert.strictEqual(cpuTrouble.alternativeSku, 'P67087-B21');
  assert.ok(cpuTrouble.alternativeDesc.includes('8570'), 'Must upgrade to 5th Gen 8570');

  const memTrouble = troublesome.find(t => t.type === 'GENERATIONAL_MEMORY_COUPLING');
  assert.ok(memTrouble, 'Must identify 128GB DDR5-4800 coupling');
  assert.strictEqual(memTrouble.alternativeSku, 'P69976-F21');
  assert.ok(memTrouble.alternativeDesc.includes('5600'), 'Must upgrade to 128GB DDR5-5600 FIO');
});
