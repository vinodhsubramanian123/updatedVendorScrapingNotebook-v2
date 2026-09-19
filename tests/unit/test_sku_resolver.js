'use strict';

const test = require('node:test');
const assert = require('node:assert');
const {
  getChassisEquationParameters,
  resolveComponentByRole,
  evaluateThermalCoolingEquation,
  evaluateDcPowerEquation,
  evaluateBatteryEquation
} = require('../../scripts/lib/taxonomy/sku_resolver.js');

test('SkuResolver — Builds chassis equation parameters vector dynamically from explicit catalog metadata', () => {
  // Unknown limits must not be fabricated when metadata is absent
  const thetaNull = getChassisEquationParameters(null, 'DL380_Gen12');
  assert.strictEqual(thetaNull.maxTdpThreshold, undefined);
  assert.strictEqual(thetaNull.chassisKey, 'DL380_Gen12');

  // When explicit chassis profile metadata is provided, parameters are dynamically bound
  const catalog12 = {
    chassisMetadata: { maxTdpThreshold: 185, memoryChannelsPerSocket: 12, provenance: 'QuickSpecs' }
  };
  const theta12 = getChassisEquationParameters(catalog12, 'DL380_Gen12');
  assert.strictEqual(theta12.maxTdpThreshold, 185);
  assert.strictEqual(theta12.memoryChannelsPerSocket, 12);
  assert.strictEqual(theta12.provenance, 'QuickSpecs');

  const catalog1U = {
    chassisMetadata: { fansPerChassis: 7, maxTdpThreshold: 165 }
  };
  const theta1U = getChassisEquationParameters(catalog1U, 'DL360_Gen11');
  assert.strictEqual(theta1U.fansPerChassis, 7);
  assert.strictEqual(theta1U.maxTdpThreshold, 165);

  const catalogGpu = {
    chassisMetadata: { hasNativeRearSlots: true }
  };
  const thetaGpu = getChassisEquationParameters(catalogGpu, 'DL380a_Gen12');
  assert.strictEqual(thetaGpu.hasNativeRearSlots, true);
});

test('SkuResolver — Resolves components by role from canonical catalog schema', () => {
  const canonicalCatalog = {
    entries: [
      {
        parentCategory: 'Storage Options',
        subCategory: 'Storage Batteries',
        skus: [
          {
            'Product #': 'P01366-B21',
            sku: 'P01366-B21',
            Description: 'HPE 96W Smart Storage Lithium-ion Battery with 145mm Cable Kit',
            'Unit Price (USD)': '150.00',
            listPrice: 150,
            'Lifecycle Status': 'Active',
            provenance: 'HPE OCA Scraper'
          }
        ]
      },
      {
        parentCategory: 'Cooling Options',
        subCategory: 'High Performance Fans',
        skus: [
          {
            'Product #': 'P48820-B21',
            sku: 'P48820-B21',
            Description: 'HPE ProLiant DL380 Gen11 High Performance Fan Kit',
            listPrice: 220,
            'Lifecycle Status': 'Active'
          }
        ]
      },
      {
        parentCategory: 'Storage Options',
        subCategory: 'Internal Storage Options',
        skus: [
          {
            'Product #': '873763-B21',
            sku: '873763-B21',
            Description: 'HPE ProLiant Compute DL380 No Drive Configuration FIO Kit',
            listPrice: 14,
            'Lifecycle Status': 'Active'
          },
          {
            'Product #': 'P49048-B21',
            sku: 'P49048-B21',
            Description: 'HPE 800GB SAS 12G Mixed Use SFF BC Multi Vendor SSD',
            listPrice: 850,
            'Lifecycle Status': 'Active'
          }
        ]
      },
      {
        parentCategory: 'Networking Options',
        subCategory: 'Optical Transceivers',
        skus: [
          {
            'Product #': 'AJ718A',
            sku: 'AJ718A',
            Description: 'HPE 32Gb Short Wave SFP28 Optical Transceiver',
            listPrice: 420,
            'Lifecycle Status': 'Active'
          },
          {
            'Product #': 'R7W32A',
            sku: 'R7W32A',
            Description: 'HPE 64Gb Short Wave SFP56 Optical Transceiver',
            listPrice: 890,
            'Lifecycle Status': 'Active'
          },
          {
            'Product #': '453154-B21',
            sku: '453154-B21',
            Description: 'HPE 10GbE SFP+ SR Optical Transceiver',
            listPrice: 190,
            'Lifecycle Status': 'Active'
          }
        ]
      },
      {
        parentCategory: 'Power Infrastructure',
        subCategory: 'DC Power Options',
        skus: [
          {
            'Product #': 'P14282-B21',
            sku: 'P14282-B21',
            Description: 'HPE -48VDC Power Cable 48V Lug Kit',
            listPrice: 45,
            'Lifecycle Status': 'Active'
          }
        ]
      }
    ]
  };

  // 1. Resolve Storage Battery
  const resolvedBattery = resolveComponentByRole(canonicalCatalog, { role: 'Storage Battery' });
  assert.strictEqual(resolvedBattery.found, true);
  assert.strictEqual(resolvedBattery.sku, 'P01366-B21');
  assert.strictEqual(resolvedBattery.price, 150);
  assert.strictEqual(resolvedBattery.isResolved, true);

  // 2. Resolve High-Perf Fan
  const resolvedFan = resolveComponentByRole(canonicalCatalog, { role: 'Fan Kit / Fan', keywords: ['high performance'] });
  assert.strictEqual(resolvedFan.found, true);
  assert.strictEqual(resolvedFan.sku, 'P48820-B21');

  // 3. Resolve No-Drive Option: MUST NOT resolve to ordinary drive P49048-B21!
  const resolvedNoDrive = resolveComponentByRole(canonicalCatalog, { role: 'Drive Cage / Drive', keywords: ['no drive'] });
  assert.strictEqual(resolvedNoDrive.found, true);
  assert.strictEqual(resolvedNoDrive.sku, '873763-B21');
  assert.notStrictEqual(resolvedNoDrive.sku, 'P49048-B21');

  // 4. Resolve 32Gb FC Transceiver: MUST NOT match 10Gb or 64Gb!
  const resolved32 = resolveComponentByRole(canonicalCatalog, { role: 'Transceiver', specs: { speedGb: 32 } });
  assert.strictEqual(resolved32.found, true);
  assert.strictEqual(resolved32.sku, 'AJ718A');

  // 5. Incompatible spec (e.g. 128Gb optical transceiver not present) returns unresolved
  const unresolved128 = resolveComponentByRole(canonicalCatalog, { role: 'Transceiver', specs: { speedGb: 128 } });
  assert.strictEqual(unresolved128.found, false);
  assert.strictEqual(unresolved128.sku, null);
  assert.strictEqual(unresolved128.isResolved, false);

  // 6. Preferred SKU with mismatching role/spec is rejected
  const badPref = resolveComponentByRole(canonicalCatalog, { role: 'Storage Battery', preferredSku: 'AJ718A' });
  assert.strictEqual(badPref.sku, 'P01366-B21'); // Falls back to real battery, does not accept optic AJ718A as battery
});

test('SkuResolver — Emits clean requirement tag when unmapped instead of fabricating SKUs', () => {
  const emptyCatalog = { entries: [] };
  const res = resolveComponentByRole(emptyCatalog, {
    role: 'Storage Battery',
    genericDescription: 'Smart Storage Battery Kit'
  });

  assert.strictEqual(res.found, false);
  assert.strictEqual(res.sku, null);
  assert.strictEqual(res.requirementTag, 'REQUIREMENT_STORAGE_BATTERY');
  assert.strictEqual(res.isResolved, false);
  assert.strictEqual(res.price, null);
});

test('SkuResolver — Invariant Equation: Thermal & Cooling Balance (CPU + GPU envelope)', () => {
  const theta = { maxTdpThreshold: 185, maxEnvelopeThreshold: 970 };

  // Case 1: Low TDP CPU (150W), 0W GPU -> Satisfied
  const eqLow = evaluateThermalCoolingEquation(150, 0, false, false, theta);
  assert.strictEqual(eqLow.needsHighPerfCooling, false);

  // Case 2: High TDP CPU (270W) with fans & heatsink -> Satisfied
  const eqHighGood = evaluateThermalCoolingEquation(270, 0, true, true, theta);
  assert.strictEqual(eqHighGood.needsHighPerfCooling, false);

  // Case 3: High TDP CPU (270W) missing fans -> Fails
  const eqHighBad = evaluateThermalCoolingEquation(270, 0, false, true, theta);
  assert.strictEqual(eqHighBad.needsHighPerfCooling, true);
  assert.strictEqual(eqHighBad.missingFanKit, true);
  assert.ok(eqHighBad.formula.includes('270W'));

  // Case 4: Moderate CPU (165W) + 4x 300W GPUs (1200W) exceeding envelope -> Needs high perf cooling
  const eqGpuHigh = evaluateThermalCoolingEquation(165, 1200, false, false, theta);
  assert.strictEqual(eqGpuHigh.needsHighPerfCooling, true);
});

test('SkuResolver — Invariant Equation: DC Power Lugs & Battery (Discrete Count Inequalities)', () => {
  // Case 1: Incomplete limits/ratios -> Returns NOT_EVALUATED (no guessed constants)
  const incompleteTheta = { requiresDcLugKit: true, requiresRaidBattery: true };
  const unverifiedDc = evaluateDcPowerEquation(2, 0, incompleteTheta);
  assert.strictEqual(unverifiedDc.status, 'NOT_EVALUATED');
  assert.strictEqual(unverifiedDc.isMissing, null);

  const unverifiedBatt = evaluateBatteryEquation(1, 0, incompleteTheta);
  assert.strictEqual(unverifiedBatt.status, 'NOT_EVALUATED');
  assert.strictEqual(unverifiedBatt.isMissing, null);

  // Case 2: Complete limits and discrete ratios supplied
  const theta = {
    requiresDcLugKit: true,
    lugsPerPsu: 1,
    lugsPerKit: 1,
    requiresRaidBattery: true,
    controllersPerBattery: 1
  };

  // 2 DC PSUs with 0 lug kits -> Missing 2
  const eqDc = evaluateDcPowerEquation(2, 0, theta);
  assert.strictEqual(eqDc.isMissing, true);
  assert.strictEqual(eqDc.missingLugCount, 2);

  // 2 DC PSUs with 2 lug kits -> Satisfied
  const eqDcGood = evaluateDcPowerEquation(2, 2, theta);
  assert.strictEqual(eqDcGood.isMissing, false);
  assert.strictEqual(eqDcGood.missingLugCount, 0);

  // 1 RAID controller with 0 batteries -> Missing 1
  const eqBatt = evaluateBatteryEquation(1, 0, theta);
  assert.strictEqual(eqBatt.isMissing, true);
  assert.strictEqual(eqBatt.missingBatteryCount, 1);

  // 1 RAID controller with 1 battery -> Satisfied
  const eqBattGood = evaluateBatteryEquation(1, 1, theta);
  assert.strictEqual(eqBattGood.isMissing, false);
  assert.strictEqual(eqBattGood.missingBatteryCount, 0);
});
