'use strict';
/**
 * tests/unit/test_delivery_pacing_and_release_waves.js
 *
 * Verifies Invariant INV-177 / INV-180:
 * 1. Release Wave Disparity detection (e.g. 6740P [Feb 2025] vs 6748P [June 2025] = 98-day gap).
 * 2. Pacing Item Lead-Time Bottleneck detection (e.g. R2E09A FC HBA with 30-day lead time).
 * 3. Proactive UCID separation recommendation during multi-cluster partitioning.
 * 4. Pre-presentation Acceptance Gate check B15 (Pacing & Delivery Feasibility Advisory).
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const { analyzeDeliveryPacing, parseDateToMs, formatMsToDateStr } = require('../../scripts/lib/boq/delivery_pacing_analyzer.js');
const { analyzeAndPartitionClusters } = require('../../scripts/lib/boq/multi_cluster_splitter.js');
const { validateBoqEvaluationCriteria } = require('../../scripts/lib/boq/bom_verifier.js');

describe('Delivery Pacing & Release Wave Analyzer (INV-177 / INV-180)', () => {
  const catalogPath = path.resolve(__dirname, '../../outputs/ProLiant/Gen12/DL380_Gen12/DL380_Gen12_Catalog.json');
  let mockCatalog = null;
  if (fs.existsSync(catalogPath)) {
    try {
      mockCatalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    } catch (_) {}
  }

  test('Date parsing and formatting utility handles MM/DD/YYYY and YYYY-MM-DD', () => {
    const ms1 = parseDateToMs('02/24/2025');
    assert.ok(ms1 !== null, 'MM/DD/YYYY should parse cleanly');
    assert.strictEqual(formatMsToDateStr(ms1), '2025-02-24');

    const ms2 = parseDateToMs('2025-06-02');
    assert.ok(ms2 !== null, 'YYYY-MM-DD should parse cleanly');
    assert.strictEqual(formatMsToDateStr(ms2), '2025-06-02');

    assert.strictEqual(parseDateToMs('Unpublished'), null);
    assert.strictEqual(parseDateToMs(''), null);
    assert.strictEqual(parseDateToMs(null), null);
  });

  test('Detects 98-day release wave gap between Intel Xeon 6740P and 6748P', () => {
    const items = [
      { sku: 'P73282-B21', description: 'HPE DL380 Gen12 SFF CTO Server', quantity: 20, startDate: '02/24/2025' },
      { sku: 'P73829-B21', description: 'Intel Xeon 6740P 2.1GHz 48-core 270W Processor for HPE', quantity: 40, startDate: '02/24/2025' },
      { sku: 'P74579-B21', description: 'Intel Xeon 6748P 2.5GHz 48-core 300W Processor for HPE', quantity: 40, startDate: '06/02/2025' }
    ];

    const result = analyzeDeliveryPacing(items);
    assert.strictEqual(result.hasReleaseWaveGap, true, 'Must flag release wave gap');
    assert.strictEqual(result.releaseWaveGapDays, 98, 'Calculated gap should be exactly 98 days');
    assert.strictEqual(result.recommendedUcidSplit, true, 'Must recommend UCID split');
    assert.ok(result.wavePacingItems.some(w => w.sku === 'P74579-B21'), '6748P must be identified as pacing item');
    assert.ok(result.advisories.length > 0, 'Advisory must be emitted');
    assert.ok(result.advisories[0].includes('Release Wave Disparity Detected'));
  });

  test('Enriches missing dates and lead times from supplied catalogData', () => {
    if (!mockCatalog) return; // Skip if catalog missing

    const items = [
      { sku: 'P73829-B21', quantity: 40 }, // 6740P
      { sku: 'P74579-B21', quantity: 40 }  // 6748P
    ];

    const result = analyzeDeliveryPacing(items, { catalogData: mockCatalog });
    assert.strictEqual(result.hasReleaseWaveGap, true);
    assert.strictEqual(result.releaseWaveGapDays, 98);
    assert.strictEqual(result.earliestStartDate, '2025-02-24');
    assert.strictEqual(result.latestStartDate, '2025-06-02');
  });

  test('Detects pacing item bottleneck when lead time exceeds threshold (R2E09A 30 days)', () => {
    const items = [
      { sku: 'P73282-B21', description: 'HPE DL380 Gen12 SFF CTO Server', leadTimeDays: 4 },
      { sku: 'P73829-B21', description: 'Intel Xeon 6740P Processor', leadTimeDays: 4 },
      { sku: 'R2E09A', description: 'HPE SN1610Q 32Gb 2-port FC HBA', leadTimeDays: 30 }
    ];

    const result = analyzeDeliveryPacing(items, { leadTimeBottleneckDays: 21 });
    assert.strictEqual(result.hasPacingBottleneck, true);
    assert.strictEqual(result.maxLeadTimeDays, 30);
    assert.strictEqual(result.leadTimeBottleneckItem.sku, 'R2E09A');
    assert.ok(result.advisories.some(a => a.includes('R2E09A') && a.includes('30 days')));
  });

  test('Multi-cluster splitter embeds delivery pacing and flags release wave UCID split', () => {
    const rawItems = [
      { category: 'Base Chassis', sku: 'P73282-B21', description: 'HPE DL380 Gen12 8SFF CTO Server', quantity: 40, startDate: '02/24/2025' },
      { category: 'Processor', sku: 'P73829-B21', description: 'Intel Xeon 6740P 2.1GHz 48-core 270W Processor', quantity: 40, startDate: '02/24/2025' },
      { category: 'Processor', sku: 'P74579-B21', description: 'Intel Xeon 6748P 2.5GHz 48-core 300W Processor', quantity: 40, startDate: '06/02/2025' },
      { category: 'Power Supply', sku: 'P38997-B21', description: 'HPE 1600W Flex Slot Platinum Low Halogen Power Supply Kit', quantity: 80, startDate: '02/24/2025' }
    ];

    const partitioned = analyzeAndPartitionClusters(rawItems, 'Test_BOQ');
    assert.strictEqual(partitioned.isMultiCluster, true);
    assert.strictEqual(partitioned.clusters.length, 2);
    assert.strictEqual(partitioned.recommendedUcidSplit, true);
    assert.ok(partitioned.ucidSplitReason.includes('Release Wave Disparity'));
    assert.ok(partitioned.deliveryPacing.releaseWaveGapDays >= 90);
  });

  test('Pre-presentation gate B15 check: Passes when all components have aligned delivery', () => {
    const cleanOutput = {
      aspectChecks: [
        { id: 'COMPUTE_THERMAL', status: 'PASS' },
        { id: 'MEMORY_CHANNEL', status: 'PASS' },
        { id: 'STORAGE_TRI_MODE', status: 'PASS' },
        { id: 'PCIE_RISER', status: 'PASS' },
        { id: 'NETWORKING_OCP', status: 'PASS' },
        { id: 'POWER_ENVIRONMENT', status: 'PASS' },
        { id: 'SUPPORT_MANUFACTURING', status: 'PASS' }
      ],
      rankedSolutions: [
        {
          rank: 'Rank 1',
          skuPartsList: [
            { sku: 'P73282-B21', description: 'Server', startDate: '02/24/2025', leadTimeDays: 4, listPrice: 5000 },
            { sku: 'P73829-B21', description: '6740P', startDate: '02/24/2025', leadTimeDays: 4, listPrice: 13000 },
            { sku: 'R7A11AAE', description: 'COM 3yr', startDate: '01/01/2023', leadTimeDays: null, listPrice: 500 }
          ],
          totalPrice: 18500
        }
      ],
      chassis: 'DL380 Gen12'
    };

    const checks = validateBoqEvaluationCriteria(cleanOutput, {});
    const b15 = checks.find(c => c.id === 'B15');
    assert.ok(b15, 'B15 check must be present');
    assert.strictEqual(b15.status, 'PASSED');
    assert.strictEqual(b15.passed, true);
    assert.strictEqual(b15.severity, 'WARN');
  });

  test('Pre-presentation gate B15 check: Emits ACTION_REQUIRED (WARN) when mixing disparate release waves', () => {
    const disparateOutput = {
      aspectChecks: [
        { id: 'COMPUTE_THERMAL', status: 'PASS' },
        { id: 'MEMORY_CHANNEL', status: 'PASS' },
        { id: 'STORAGE_TRI_MODE', status: 'PASS' },
        { id: 'PCIE_RISER', status: 'PASS' },
        { id: 'NETWORKING_OCP', status: 'PASS' },
        { id: 'POWER_ENVIRONMENT', status: 'PASS' },
        { id: 'SUPPORT_MANUFACTURING', status: 'PASS' }
      ],
      rankedSolutions: [
        {
          rank: 'Rank 1',
          skuPartsList: [
            { sku: 'P73282-B21', description: 'Server', startDate: '02/24/2025', leadTimeDays: 4, listPrice: 5000 },
            { sku: 'P73829-B21', description: '6740P', startDate: '02/24/2025', leadTimeDays: 4, listPrice: 13000 },
            { sku: 'P74579-B21', description: '6748P', startDate: '06/02/2025', leadTimeDays: 4, listPrice: 38000 },
            { sku: 'R7A11AAE', description: 'COM 3yr', startDate: '01/01/2023', leadTimeDays: null, listPrice: 500 }
          ],
          totalPrice: 56500
        }
      ],
      chassis: 'DL380 Gen12'
    };

    const checks = validateBoqEvaluationCriteria(disparateOutput, {});
    const b15 = checks.find(c => c.id === 'B15');
    assert.ok(b15, 'B15 check must be present');
    assert.strictEqual(b15.status, 'ACTION_REQUIRED');
    assert.strictEqual(b15.severity, 'WARN');
    assert.ok(b15.detail.includes('98-day gap'));
    assert.ok(b15.detail.includes('P74579-B21'));
  });
});
