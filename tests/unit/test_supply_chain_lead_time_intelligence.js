'use strict';

/**
 * tests/unit/test_supply_chain_lead_time_intelligence.js
 *
 * Comprehensive Positive & Negative Test Suite for:
 * 1. Supply Chain & Delivery Lead Time Intelligence (INV-177)
 * 2. Dynamic OCA `#menu_tools` & BOM Preference Discovery (INV-178)
 * 3. Critical Path Pacing Item (max LeadTime) & Outlier Detection
 * 4. Rank 1S (Fast-Ship Delivery-Optimized Baseline) Synthesis
 * 5. Schema passthrough & validation for supply chain attributes
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  parseLeadTimeDays,
  calculateSupplyMetrics,
  synthesizeFastShipAlternative,
  synthesize5TierRankedSolutions
} = require('../../scripts/lib/conflict/strategy_synthesizer.js');
const { CatalogSkuItemSchema } = require('../../scripts/lib/system/schemas.js');
const { inspectAndEnableToolsMenu } = require('../../scripts/lib/scraper/navigate_oca.js');

// =============================================================================
// Test Group 1: Lead Time Parsing & Edge Cases (Positive & Negative)
// =============================================================================
test('1. Lead Time Parsing — Positive Scenarios', () => {
  // Plain integers
  assert.strictEqual(parseLeadTimeDays(4), 4);
  assert.strictEqual(parseLeadTimeDays('4'), 4);
  assert.strictEqual(parseLeadTimeDays('47'), 47);
  assert.strictEqual(parseLeadTimeDays('120'), 120);

  // Strings with "days"
  assert.strictEqual(parseLeadTimeDays('4 days'), 4);
  assert.strictEqual(parseLeadTimeDays('47 Days'), 47);
  assert.strictEqual(parseLeadTimeDays('14 day'), 14);

  // Ranges
  assert.strictEqual(parseLeadTimeDays('30-45 days'), 37.5);
  assert.strictEqual(parseLeadTimeDays('60 to 90 days'), 75);
  assert.strictEqual(parseLeadTimeDays('7 - 14'), 10.5);
});

test('1. Lead Time Parsing — Negative & Nullable Scenarios', () => {
  assert.strictEqual(parseLeadTimeDays(null), null);
  assert.strictEqual(parseLeadTimeDays(undefined), null);
  assert.strictEqual(parseLeadTimeDays(''), null);
  assert.strictEqual(parseLeadTimeDays('   '), null);
  assert.strictEqual(parseLeadTimeDays('N/A'), null);
  assert.strictEqual(parseLeadTimeDays('na'), null);
  assert.strictEqual(parseLeadTimeDays('unknown'), null);
  assert.strictEqual(parseLeadTimeDays('Standard'), null);
  assert.strictEqual(parseLeadTimeDays('Contact HPE Sales'), null);
  assert.strictEqual(parseLeadTimeDays('TBD'), null);
});

// =============================================================================
// Test Group 2: Critical Path Pacing Item & Outlier Detection
// =============================================================================
test('2. Supply Metrics — Critical Path Pacing Item & Outlier Identification', () => {
  // Real customer scenario: 20-node server BOM where 2.4TB HDD causes delivery delay
  const bomParts = [
    { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF Server', leadTime: '4 days', leadTimeDays: 4 },
    { sku: 'P73300-B21', description: 'Intel Xeon-Gold 6530 2.1GHz 32-core Processor', leadTime: '7 days', leadTimeDays: 7 },
    { sku: 'P64707-B21', description: 'HPE 64GB DDR5-5600 Smart Memory', leadTime: '4 days', leadTimeDays: 4 },
    { sku: 'P28352-B21', description: 'HPE 2.4TB SAS 12G 10K SFF HDD', leadTime: '90 days', leadTimeDays: 90 }, // OUTLIER!
    { sku: 'P38997-B21', description: 'HPE 1000W Titanium Power Supply', leadTime: '7 days', leadTimeDays: 7 }
  ];

  const metrics = calculateSupplyMetrics(bomParts);

  // Critical path verification: Solution EDT is strictly max(leadTime)
  assert.strictEqual(metrics.maxLeadTimeDays, 90, 'Solution EDT must be governed by slowest pacing item (90d)');
  assert.strictEqual(metrics.solutionEdtDays, 90, 'Solution EDT days must equal max lead time');
  assert.strictEqual(metrics.pacingItemSku, 'P28352-B21', 'Pacing item must be identified as P28352-B21');
  assert.strictEqual(metrics.pacingItemDescription, 'HPE 2.4TB SAS 12G 10K SFF HDD');

  // Outlier detection verification
  assert.strictEqual(metrics.leadTimeOutliers.length, 1, 'Exactly one outlier should be detected');
  assert.strictEqual(metrics.leadTimeOutliers[0].sku, 'P28352-B21');
  assert.strictEqual(metrics.leadTimeOutliers[0].leadTimeDays, 90);

  // Average vs Max distinction
  assert.strictEqual(metrics.estimatedAverageLeadTimeDays, 22.4, 'Average lead time is calculated for statistical comparison');
  assert.notStrictEqual(metrics.solutionEdtDays, metrics.estimatedAverageLeadTimeDays, 'Solution EDT must NOT be confused with average lead time');
});

test('2. Supply Metrics — All Fast-Ship Parts (Zero Outliers Scenario)', () => {
  const allFastBom = [
    { sku: 'P73282-B21', description: 'Server Chassis', leadTimeDays: 4 },
    { sku: 'P73300-B21', description: 'Processor', leadTimeDays: 7 },
    { sku: 'P64707-B21', description: 'Memory', leadTimeDays: 4 },
    { sku: 'P40507-B21', description: 'Fast-Ship SSD', leadTimeDays: 7 }
  ];

  const metrics = calculateSupplyMetrics(allFastBom);
  assert.strictEqual(metrics.maxLeadTimeDays, 7);
  assert.strictEqual(metrics.leadTimeOutliers.length, 0, 'No outliers when all items are fast-ship <= 7d');
});

test('2. Supply Metrics — Completely Unknown Lead Times (Negative Path)', () => {
  const unknownBom = [
    { sku: 'UNKNOWN-1', description: 'Item 1' },
    { sku: 'UNKNOWN-2', description: 'Item 2', leadTime: 'Contact Sales' }
  ];

  const metrics = calculateSupplyMetrics(unknownBom);
  assert.strictEqual(metrics.knownLeadTimeCount, 0);
  assert.strictEqual(metrics.unknownLeadTimeCount, 2);
  assert.strictEqual(metrics.maxLeadTimeDays, null);
  assert.strictEqual(metrics.solutionEdtDays, null);
  assert.strictEqual(metrics.leadTimeOutliers.length, 0);
});

// =============================================================================
// Test Group 3: Rank 1S Fast-Ship Alternative Synthesis
// =============================================================================
test('3. Rank 1S Synthesis — Replaces Pacing Bottlenecks & Collapses Schedule', () => {
  const candidateParts = [
    { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF Server', category: 'Chassis', unitPriceUsd: 2500, quantity: 1, leadTimeDays: 4 },
    { sku: 'P73300-B21', description: 'Intel Xeon-Gold 6530 2.1GHz 32-core Processor', category: 'Processor', unitPriceUsd: 3200, quantity: 2, leadTimeDays: 7 },
    { sku: 'P64707-B21', description: 'HPE 64GB DDR5-5600 Smart Memory', category: 'Memory', unitPriceUsd: 450, quantity: 8, leadTimeDays: 4 },
    { sku: 'P28352-B21', description: 'HPE 2.4TB SAS 12G 10K SFF HDD', category: 'Storage Drive', unitPriceUsd: 650, quantity: 4, leadTimeDays: 90 },
    { sku: 'P38997-B21', description: 'HPE 1000W Titanium Power Supply', category: 'Power Supply', unitPriceUsd: 350, quantity: 2, leadTimeDays: 7 }
  ];

  const supplyMetrics = calculateSupplyMetrics(candidateParts);
  const mockCatalog = {
    entries: [
      {
        productNumber: 'P40507-B21',
        description: 'HPE 1.92TB SAS 12G Read Intensive SFF BC Multi Vendor SSD',
        leadTime: '7 days',
        leadTimeDays: 7,
        unitPriceUsd: 580
      }
    ]
  };
  const chassisInfo = { chassis: 'DL380_Gen12', model: 'DL380 Gen12', gen: 'Gen12' };
  const getPrice = sku => (sku === 'P40507-B21' ? 580 : 500);
  getPrice.hasPrice = () => true;
  getPrice.status = () => 'CATALOG_PRICE';

  const mockRevalidateCached = parts => ({
    parts,
    injectedFixes: [],
    totalCost: parts.reduce((sum, p) => sum + (p.unitPriceUsd * (p.quantity || 1)), 0),
    physicalMathClean: true,
    aspectErrors: []
  });

  const fastShipTier = synthesizeFastShipAlternative(
    candidateParts,
    supplyMetrics,
    mockCatalog,
    chassisInfo,
    getPrice,
    mockRevalidateCached,
    () => ({ leadTimeDays: 7, availability: 'Available' })
  );

  assert.ok(fastShipTier, 'Fast-Ship Alternative must be synthesized when outlier exists');
  assert.strictEqual(fastShipTier.rank, '1S');
  assert.strictEqual(fastShipTier.originalEdtDays, 90);
  assert.strictEqual(fastShipTier.fastShipEdtDays, 7);
  assert.strictEqual(fastShipTier.deliveryDaysSaved, 83, 'Delivery schedule must collapse by 83 days (90d -> 7d)');
  assert.strictEqual(fastShipTier.physicalMathClean, true, 'Synthesized Fast-Ship candidate must be 100% physically clean');
  assert.strictEqual(fastShipTier.substitutedPacingItems.length, 1);
  assert.strictEqual(fastShipTier.substitutedPacingItems[0].originalSku, 'P28352-B21');
  assert.strictEqual(fastShipTier.substitutedPacingItems[0].replacementSku, 'P40507-B21');
});

test('3. Rank 1S Synthesis — Returns null when no delivery bottlenecks exist (Negative Path)', () => {
  const candidateParts = [
    { sku: 'P73282-B21', description: 'Server Chassis', category: 'Chassis', unitPriceUsd: 2500, quantity: 1, leadTimeDays: 4 },
    { sku: 'P73300-B21', description: 'Processor', category: 'Processor', unitPriceUsd: 3200, quantity: 2, leadTimeDays: 7 }
  ];

  const supplyMetrics = calculateSupplyMetrics(candidateParts);
  const fastShipTier = synthesizeFastShipAlternative(
    candidateParts,
    supplyMetrics,
    {},
    {},
    () => 100,
    parts => ({ parts, totalCost: 100, physicalMathClean: true }),
    () => ({ leadTimeDays: 7 })
  );

  assert.strictEqual(fastShipTier, null, 'Must return null when max lead time is well below 45 days and no outliers exist');
});

// =============================================================================
// Test Group 4: 5-Tier Matrix Integration with Supply Metrics
// =============================================================================
test('4. 5-Tier Strategy Matrix — Includes Supply Metrics & FastShip Attachment on Rank 1', () => {
  const rawItems = [
    { sku: 'P73282-B21', category: 'Chassis', description: 'DL380 Gen12 8SFF', quantity: 1, leadTimeDays: 4 },
    { sku: 'P73300-B21', category: 'Processor', description: 'Intel Xeon-Gold 6530', quantity: 2, leadTimeDays: 7 },
    { sku: 'P28352-B21', category: 'Storage Drive', description: '2.4TB SAS 10K HDD', quantity: 4, leadTimeDays: 90 }
  ];

  const ranks = synthesize5TierRankedSolutions(
    rawItems,
    { missingDependencies: [] },
    { conflicts: [] },
    { chassis: 'DL380_Gen12', model: 'DL380 Gen12', gen: 'Gen12' },
    'outputs/ProLiant/Gen12/DL380_Gen12'
  );

  assert.strictEqual(ranks.length, 5, 'Must maintain exactly 5 tiers in matrix');
  const rank1 = ranks[0];
  assert.ok(rank1.supplyMetrics, 'Rank 1 must have supplyMetrics attached');
  assert.strictEqual(rank1.supplyMetrics.maxLeadTimeDays, 90);
  assert.strictEqual(rank1.supplyMetrics.pacingItemSku, 'P28352-B21');
  assert.ok(rank1.fastShipAlternative, 'Rank 1 must have fastShipAlternative attached when outlier exists');
  assert.strictEqual(rank1.fastShipAlternative.rank, '1S');
  assert.strictEqual(rank1.tradeoffMetrics.fastShipAlternativeAvailable, true);
  assert.ok(rank1.tradeoffMetrics.deliveryDaysSaved > 0);
});

// =============================================================================
// Test Group 5: Schema Validation for Supply Chain Attributes
// =============================================================================
test('5. Catalog SKU Schema — Validates Supply Chain Attributes with Passthrough', () => {
  // Valid entry with supply chain attributes
  const validSku = {
    productNumber: 'P40507-B21',
    description: 'HPE 1.92TB SAS SSD',
    mainCategory: 'Storage',
    leadTime: '7 days',
    leadTimeDays: 7,
    clicStatus: 'Active',
    allocationStatus: 'AVAILABLE',
    powerWatts: 8.5,
    weightKg: 0.25,
    customFieldFromWebLogic: 'XYZ-123' // Passthrough check
  };

  const parsed = CatalogSkuItemSchema.parse(validSku);
  assert.strictEqual(parsed.leadTimeDays, 7);
  assert.strictEqual(parsed.clicStatus, 'Active');
  assert.strictEqual(parsed.allocationStatus, 'AVAILABLE');
  assert.strictEqual(parsed.powerWatts, 8.5);
  assert.strictEqual(parsed.customFieldFromWebLogic, 'XYZ-123', 'Passthrough must preserve unknown vendor attributes');

  // Negative: invalid enum on allocationStatus
  assert.throws(() => {
    CatalogSkuItemSchema.parse({
      ...validSku,
      allocationStatus: 'INVALID_STATUS_THAT_DOES_NOT_EXIST'
    });
  }, /Invalid enum value/);
});

// =============================================================================
// Test Group 6: OCA `#menu_tools` Discovery Probe
// =============================================================================
test('6. Dynamic OCA Tools Menu Probe — Simulates CDP Interaction & Fallback', async () => {
  // Case A: Mock CDP session where `#menu_tools` is present
  const mockWsWithTools = {
    async evaluate(fnStr) {
      if (fnStr.includes('menu_tools') || fnStr.includes('gears')) {
        return {
          found: true,
          iconId: 'menu_tools',
          opened: true,
          columnsToggled: ['Lead Time', 'Status'],
          toggledCount: 2
        };
      }
      return null;
    }
  };

  const resultWithTools = await inspectAndEnableToolsMenu(mockWsWithTools);
  assert.strictEqual(resultWithTools.enabled, true);
  assert.strictEqual(resultWithTools.toggledCount, 2);
  assert.ok(resultWithTools.columnsToggled.includes('Lead Time'));

  // Case B: Mock CDP session where `#menu_tools` is absent (Graceful Fallback)
  const mockWsWithoutTools = {
    async evaluate() {
      return { found: false, reason: 'No tools menu or column preferences icon detected' };
    }
  };

  const resultWithoutTools = await inspectAndEnableToolsMenu(mockWsWithoutTools);
  assert.strictEqual(resultWithoutTools.enabled, false);
  assert.strictEqual(resultWithoutTools.toggledCount, 0);

  // Case C: Null/broken CDP session (Robust Fail-Open)
  const resultNull = await inspectAndEnableToolsMenu(null);
  assert.strictEqual(resultNull.enabled, false);
  assert.strictEqual(resultNull.reason, 'NO_CDP_SESSION');
});
