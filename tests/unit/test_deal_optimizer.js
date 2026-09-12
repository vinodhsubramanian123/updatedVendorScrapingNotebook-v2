'use strict';

const test = require('node:test');
const assert = require('node:assert');
const {
  classifyWorkloadProfile,
  analyzeDealValueEngineering
} = require('../../scripts/lib/boq/deal_optimizer.js');

// ── Helpers ──────────────────────────────────────────────────────────────────
function mkItem(sku, description = '', quantity = 1, unitListPrice = 100) {
  return { sku, description, quantity, unitListPrice };
}

function mkAspects(overrides = {}) {
  return {
    compute: { cpuCount: 2, maxCpuTdpWatts: 205, coresPerCpu: 24 },
    memory: { totalMemoryGb: 256, dimmCount: 8 },
    storage: { driveCount: 8 },
    pcie: { gpuCount: 0 },
    power: { estimatedNodeWattage: 600, maxPsuWattage: 800, psuCount: 2 },
    support: { unsolicitedOptionalItems: null },
    ...overrides
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// classifyWorkloadProfile
// ═══════════════════════════════════════════════════════════════════════════════

test('DealOptimizer — Classifies AI_ML_ACCELERATED with >= 2 GPUs', () => {
  const profile = classifyWorkloadProfile([], {
    aspects: mkAspects({ pcie: { gpuCount: 4 } })
  });
  assert.strictEqual(profile.profile, 'AI_ML_ACCELERATED');
  assert.strictEqual(profile.gpuCount, 4);
});

test('DealOptimizer — Classifies HIGH_DENSITY_STORAGE with >= 16 drives', () => {
  const profile = classifyWorkloadProfile([], {
    aspects: mkAspects({ storage: { driveCount: 24 } })
  });
  assert.strictEqual(profile.profile, 'HIGH_DENSITY_STORAGE');
});

test('DealOptimizer — Classifies MEMORY_INTENSIVE_VIRTUALIZATION for high RAM-per-core', () => {
  const profile = classifyWorkloadProfile([], {
    aspects: mkAspects({
      compute: { cpuCount: 2, maxCpuTdpWatts: 205 },
      memory: { totalMemoryGb: 1024 }
    })
  });
  assert.strictEqual(profile.profile, 'MEMORY_INTENSIVE_VIRTUALIZATION');
});

test('DealOptimizer — Classifies COMPUTE_INTENSIVE_HPC for TDP >= 270W', () => {
  const profile = classifyWorkloadProfile([], {
    aspects: mkAspects({ compute: { cpuCount: 2, maxCpuTdpWatts: 350 } })
  });
  assert.strictEqual(profile.profile, 'COMPUTE_INTENSIVE_HPC');
});

test('DealOptimizer — Classifies COLD_STORAGE_ARCHIVE for moderate drives + low TDP', () => {
  const profile = classifyWorkloadProfile([], {
    aspects: mkAspects({
      storage: { driveCount: 12 },
      compute: { cpuCount: 2, maxCpuTdpWatts: 150 }
    })
  });
  assert.strictEqual(profile.profile, 'COLD_STORAGE_ARCHIVE');
});

test('DealOptimizer — Falls back to BALANCED_ENTERPRISE for standard configs', () => {
  const profile = classifyWorkloadProfile([], { aspects: mkAspects() });
  assert.strictEqual(profile.profile, 'BALANCED_ENTERPRISE');
});

// ═══════════════════════════════════════════════════════════════════════════════
// analyzeDealValueEngineering
// ═══════════════════════════════════════════════════════════════════════════════

test('DealOptimizer — Detects memory bus alignment opportunity for Silver CPU', () => {
  const items = [
    mkItem('4410Y', 'Intel Xeon Silver 4410Y Processor', 2, 500),
    mkItem('P73300-B21', 'HPE 32GB DDR5-5600 RDIMM', 8, 200)
  ];
  const evalResults = { aspects: mkAspects({ compute: { cpuCount: 2, maxCpuTdpWatts: 150 } }) };

  const report = analyzeDealValueEngineering(items, evalResults, null, null);

  assert.ok(report.opportunitiesCount >= 1, 'Should detect at least 1 opportunity');
  const memOpp = report.opportunities.find(o => o.id === 'VE-OPT-MEMORY-BUS-ALIGNMENT');
  assert.ok(memOpp, 'Must detect VE-OPT-MEMORY-BUS-ALIGNMENT');
  assert.ok(memOpp.rationale.includes('Silver') || memOpp.rationale.includes('4000'), 'Rationale must reference Silver or memory bus limit');
  assert.ok(memOpp.estimatedSavingsUsd > 0, 'Must have positive savings estimate');
});

test('DealOptimizer — Detects PSU right-sizing opportunity for low draw + high wattage PSUs', () => {
  const items = [mkItem('P73299-B21', 'CTO Chassis', 1, 3200)];
  const evalResults = {
    aspects: mkAspects({
      power: { estimatedNodeWattage: 350, maxPsuWattage: 1600, psuCount: 2 },
      compute: { cpuCount: 2, maxCpuTdpWatts: 165 }
    })
  };

  const report = analyzeDealValueEngineering(items, evalResults, null, null);
  const psuOpp = report.opportunities.find(o => o.id === 'VE-OPT-PSU-RIGHT-SIZING');
  assert.ok(psuOpp, 'Must detect VE-OPT-PSU-RIGHT-SIZING');
  assert.ok(psuOpp.estimatedSavingsUsd > 0);
});

test('DealOptimizer — Detects unsolicited services stripping', () => {
  const items = [
    mkItem('P73299-B21', 'CTO Chassis', 1, 3200),
    mkItem('HA114A1', 'HPE Installation and Startup Service', 1, 850)
  ];
  const evalResults = {
    aspects: mkAspects({
      support: {
        unsolicitedOptionalItems: [
          { sku: 'HA114A1', description: 'Installation Service', quantity: 1, unitListPrice: 850 }
        ]
      }
    })
  };

  const report = analyzeDealValueEngineering(items, evalResults, null, null);
  const svcOpp = report.opportunities.find(o => o.id === 'VE-OPT-UNSOLICITED-SERVICES');
  assert.ok(svcOpp, 'Must detect VE-OPT-UNSOLICITED-SERVICES');
  assert.ok(svcOpp.estimatedSavingsUsd >= 850);
});

test('DealOptimizer — No false positives on clean high-TDP config with appropriate PSUs', () => {
  const items = [
    mkItem('P73305-B21', 'Intel Xeon Gold 6538N+ Processor', 2, 2000),
    mkItem('P73300-B21', 'HPE 32GB DDR5-5600 RDIMM', 8, 200)
  ];
  const evalResults = {
    aspects: mkAspects({
      compute: { cpuCount: 2, maxCpuTdpWatts: 205 },
      power: { estimatedNodeWattage: 600, maxPsuWattage: 800, psuCount: 2 }
    })
  };

  const report = analyzeDealValueEngineering(items, evalResults, null, null);
  const memOpp = report.opportunities.find(o => o.id === 'VE-OPT-MEMORY-BUS-ALIGNMENT');
  assert.strictEqual(memOpp, undefined, 'No memory alignment opportunity for Gold CPU');
  const psuOpp = report.opportunities.find(o => o.id === 'VE-OPT-PSU-RIGHT-SIZING');
  assert.strictEqual(psuOpp, undefined, 'No PSU right-sizing for properly matched config');
});

test('DealOptimizer — Detects CPU tier right-sizing for Platinum CPU on storage workload', () => {
  const items = [
    mkItem('P67097-B21', 'Intel Xeon-Platinum 8558 2.1GHz 48-core 330W Processor for HPE', 2, 5200),
    mkItem('P40498-B21', 'HPE 960GB SAS 12G Read Intensive SFF SSD', 16, 350)
  ];
  const evalResults = {
    aspects: mkAspects({
      compute: { cpuCount: 2, maxCpuTdpWatts: 205 },
      storage: { driveCount: 16 }
    })
  };

  const report = analyzeDealValueEngineering(items, evalResults, null, null);
  const cpuOpp = report.opportunities.find(o => o.id === 'VE-OPT-CPU-TIER-ALIGNMENT');
  assert.ok(cpuOpp, 'Must detect VE-OPT-CPU-TIER-ALIGNMENT');
  assert.ok(cpuOpp.estimatedSavingsUsd > 0);
  assert.ok(cpuOpp.recommendedAlternative.includes('Gold'));
});

test('DealOptimizer — Detects NIC tier alignment for 100GbE on standard enterprise workload', () => {
  const items = [
    mkItem('P25960-B21', 'Mellanox MCX623106AS-CDAT Ethernet 100Gb 2-port QSFP56 Adapter for HPE', 2, 1400),
    mkItem('P73300-B21', 'HPE 32GB DDR5-5600 RDIMM', 8, 200)
  ];
  const evalResults = {
    aspects: mkAspects({
      compute: { cpuCount: 2, maxCpuTdpWatts: 205 },
      pcie: { gpuCount: 0 }
    })
  };

  const report = analyzeDealValueEngineering(items, evalResults, null, null);
  const nicOpp = report.opportunities.find(o => o.id === 'VE-OPT-NIC-TIER-ALIGNMENT');
  assert.ok(nicOpp, 'Must detect VE-OPT-NIC-TIER-ALIGNMENT');
  assert.ok(nicOpp.estimatedSavingsUsd > 0);
  assert.ok(nicOpp.recommendedAlternative.includes('25Gb'));
});

test('DealOptimizer — Report structure includes required fields', () => {
  const report = analyzeDealValueEngineering([], { aspects: mkAspects() }, null, null);

  assert.ok('workloadProfile' in report);
  assert.ok('workloadTraits' in report);
  assert.ok('baselineCapExUsd' in report);
  assert.ok('optimizedCapExUsd' in report);
  assert.ok('potentialSavingsUsd' in report);
  assert.ok('capexSavingsPercent' in report);
  assert.ok('opportunitiesCount' in report);
  assert.ok('opportunities' in report);
  assert.ok('generatedAt' in report);
  assert.ok(Array.isArray(report.opportunities));
});
