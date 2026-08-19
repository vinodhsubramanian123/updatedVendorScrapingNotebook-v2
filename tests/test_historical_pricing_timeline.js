'use strict';
/**
 * tests/test_historical_pricing_timeline.js
 *
 * Rigorous multi-month timeline & historical pricing verification suite.
 * Tests individual SKU price queries and consolidated BOQ calculations
 * across Aug, Sept, Oct, Nov, and Dec with inflation, deflation, and discontinued items.
 */

const fs = require('fs');
const path = require('path');
const {
  normalizeTargetDate,
  formatMonthLabel,
  getHistoricalSkuPrice,
  getHistoricalBoqPricing,
  compareBoqPricingAcrossTimeline
} = require('../scripts/lib/sku_versioning');
const { safeWriteJsonAtomic } = require('../scripts/lib/fs_compat');

let totalTests = 0;
let passedTests = 0;

function report(description, condition, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${description}`);
  } else {
    console.error(`  ❌ FAIL: ${description} ${details}`);
    throw new Error(`Assertion failed: ${description}`);
  }
}

async function runHistoricalPricingSuite() {
  console.log('================================================================');
  console.log('📈 MULTI-MONTH TIME-SERIES & HISTORICAL BOQ PRICING SUITE');
  console.log('================================================================\n');

  const testTempDir = path.join(__dirname, 'temp_history_test_dir');
  const historyDir = path.join(testTempDir, 'history');
  fs.mkdirSync(historyDir, { recursive: true });

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // SETUP: Multi-Month Price History Dataset (Aug, Sept, Oct, Nov, Dec 2026)
    // ─────────────────────────────────────────────────────────────────────────
    // P73282-B21 (Base Chassis): Stable $5,584.00
    // P49025-B21 (64-core CPU): $11,600 (Aug) -> $12,180 (+5% in Sept) -> $11,000 (-9.7% in Nov)
    // P64708-B21 (64GB RAM): $850 (Aug) -> $800 (Oct) -> $750 (Dec)
    // P48820-B21 (Thermal Fan Kit): $335 (Aug) -> Discontinued in Oct (REMOVED) -> Reinstated in Dec ($350)
    // ─────────────────────────────────────────────────────────────────────────

    const mockPriceHistory = {
      'P73282-B21': [
        { date: '2026-08-01', price: 5584.00, status: 'BASELINE' }
      ],
      'P49025-B21': [
        { date: '2026-08-01', price: 11600.00, status: 'BASELINE' },
        { date: '2026-09-15', price: 12180.00, status: 'PRICE_INCREASE' },
        { date: '2026-11-01', price: 11000.00, status: 'PRICE_DECREASE' }
      ],
      'P64708-B21': [
        { date: '2026-08-01', price: 850.00, status: 'BASELINE' },
        { date: '2026-10-01', price: 800.00, status: 'PRICE_DECREASE' },
        { date: '2026-12-01', price: 750.00, status: 'PRICE_DECREASE' }
      ],
      'P48820-B21': [
        { date: '2026-08-01', price: 335.00, status: 'BASELINE' },
        { date: '2026-10-15', price: 335.00, status: 'REMOVED' },
        { date: '2026-12-01', price: 350.00, status: 'REINSTATED' }
      ]
    };

    safeWriteJsonAtomic(path.join(historyDir, 'price_history.json'), mockPriceHistory);

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 1: Date Normalization & Month Fuzzy Matching
    // ─────────────────────────────────────────────────────────────────────────
    console.log('▶ [TEST 1]: Date Normalization & Fuzzy Month Matching');
    report('Normalizes "2026-08-15" ISO date', normalizeTargetDate('2026-08-15') === '2026-08-15');
    report('Normalizes "2026-09" to month end (2026-09-30)', normalizeTargetDate('2026-09') === '2026-09-30');
    report('Normalizes "August 2026" string (2026-08-31)', normalizeTargetDate('August 2026') === '2026-08-31');
    report('Normalizes "Sept" abbreviation (2026-09-30)', normalizeTargetDate('Sept') === '2026-09-30');
    report('Normalizes "October" string (2026-10-31)', normalizeTargetDate('October') === '2026-10-31');
    report('Normalizes "Nov 2026" string (2026-11-30)', normalizeTargetDate('Nov 2026') === '2026-11-30');
    report('Normalizes "December" string (2026-12-31)', normalizeTargetDate('December') === '2026-12-31');
    report('Formats month label "Aug 2026"', formatMonthLabel('2026-08-15') === 'Aug 2026');

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 2: Individual SKU Point-in-Time Historical Price Lookup
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n▶ [TEST 2]: Individual SKU Historical Price Lookup Across Months');
    
    // CPU in Aug: $11,600
    const cpuAug = getHistoricalSkuPrice('P49025-B21', '2026-08-15', testTempDir);
    report('CPU price in August is $11,600.00', cpuAug.priceUsd === 11600 && cpuAug.status === 'BASELINE');

    // CPU in Sept: $12,180 (+5%)
    const cpuSept = getHistoricalSkuPrice('P49025-B21', '2026-09-20', testTempDir);
    report('CPU price in September reflects price increase ($12,180.00)', cpuSept.priceUsd === 12180 && cpuSept.changeFromBaselinePercent === 5);

    // CPU in Oct: still $12,180 (effective from Sept 15)
    const cpuOct = getHistoricalSkuPrice('P49025-B21', '2026-10-10', testTempDir);
    report('CPU price in October preserves effective September price ($12,180.00)', cpuOct.priceUsd === 12180 && cpuOct.effectiveDate === '2026-09-15');

    // CPU in Nov: $11,000 (-5.17% from baseline)
    const cpuNov = getHistoricalSkuPrice('P49025-B21', '2026-11-15', testTempDir);
    report('CPU price in November drops to $11,000.00', cpuNov.priceUsd === 11000 && cpuNov.status === 'PRICE_DECREASE');

    // Fan in Oct: Discontinued (REMOVED)
    const fanOct = getHistoricalSkuPrice('P48820-B21', '2026-10-20', testTempDir);
    report('Fan Kit in October flagged as discontinued (REMOVED)', fanOct.isDiscontinued === true && fanOct.status === 'REMOVED');

    // Fan in Dec: Reinstated at $350.00
    const fanDec = getHistoricalSkuPrice('P48820-B21', '2026-12-05', testTempDir);
    report('Fan Kit in December reinstated ($350.00)', fanDec.priceUsd === 350 && fanDec.isDiscontinued === false && fanDec.status === 'REINSTATED');

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 3: Consolidated BOQ Multi-Month Historical Pricing
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n▶ [TEST 3]: Consolidated BOQ Cost Calculation Across Months');

    // Standard BOQ: 1x Chassis, 2x CPU, 16x RAM, 2x Fan Kit
    const sampleBOQ = [
      { sku: 'P73282-B21', quantity: 1, description: 'DL380 Gen12 SFF Chassis' },
      { sku: 'P49025-B21', quantity: 2, description: 'Intel Xeon-P 8592+ CPU' },
      { sku: 'P64708-B21', quantity: 16, description: '64GB DDR5 Smart Memory' },
      { sku: 'P48820-B21', quantity: 2, description: 'High Performance Fan Kit' }
    ];

    // August Expected: 5584 + (2 * 11600) + (16 * 850) + (2 * 335) = 5584 + 23200 + 13600 + 670 = $43,054.00
    const boqAug = getHistoricalBoqPricing(sampleBOQ, 'August 2026', testTempDir);
    report('Consolidated BOQ total in August is $43,054.00', boqAug.totalCapExUsd === 43054.00);
    report('All 4 items active in August (0 discontinued)', boqAug.discontinuedItemsCount === 0);

    // September Expected: 5584 + (2 * 12180) + (16 * 850) + (2 * 335) = 5584 + 24360 + 13600 + 670 = $44,214.00 (+1,160.00)
    const boqSept = getHistoricalBoqPricing(sampleBOQ, 'Sept 2026', testTempDir);
    report('Consolidated BOQ total in September is $44,214.00', boqSept.totalCapExUsd === 44214.00);

    // October Expected: 5584 + (2 * 12180) + (16 * 800) + (2 * 335) = 5584 + 24360 + 12800 + 670 = $43,414.00 (Fan discontinued)
    const boqOct = getHistoricalBoqPricing(sampleBOQ, 'October 2026', testTempDir);
    report('Consolidated BOQ total in October is $43,414.00', boqOct.totalCapExUsd === 43414.00);
    report('October BOQ correctly flags 1 discontinued component', boqOct.discontinuedItemsCount === 1);

    // November Expected: 5584 + (2 * 11000) + (16 * 800) + (2 * 335) = 5584 + 22000 + 12800 + 670 = $41,054.00
    const boqNov = getHistoricalBoqPricing(sampleBOQ, 'Nov 2026', testTempDir);
    report('Consolidated BOQ total in November is $41,054.00', boqNov.totalCapExUsd === 41054.00);

    // December Expected: 5584 + (2 * 11000) + (16 * 750) + (2 * 350) = 5584 + 22000 + 12000 + 700 = $40,284.00
    const boqDec = getHistoricalBoqPricing(sampleBOQ, 'Dec 2026', testTempDir);
    report('Consolidated BOQ total in December is $40,284.00', boqDec.totalCapExUsd === 40284.00);
    report('December BOQ reflects reinstated components (0 discontinued)', boqDec.discontinuedItemsCount === 0);

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 4: Full Multi-Month Time-Series Comparative Analysis
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n▶ [TEST 4]: Multi-Month Comparative Analysis Matrix & Volatility');

    const timelineAnalysis = compareBoqPricingAcrossTimeline(
      sampleBOQ,
      ['Aug 2026', 'Sept 2026', 'Oct 2026', 'Nov 2026', 'Dec 2026'],
      testTempDir
    );

    report('Timeline contains 5 monthly evaluation points', timelineAnalysis.timeline.length === 5);
    report('Baseline CapEx correctly identified as $43,054.00', timelineAnalysis.baselineCapExUsd === 43054.00);
    report('Identifies lowest cost month as Dec 2026 ($40,284.00)', timelineAnalysis.volatilityMetrics.lowestCostMonth === 'Dec 2026' && timelineAnalysis.volatilityMetrics.lowestCapExUsd === 40284.00);
    report('Identifies highest cost month as Sep 2026 ($44,214.00)', timelineAnalysis.volatilityMetrics.highestCostMonth === 'Sep 2026' && timelineAnalysis.volatilityMetrics.highestCapExUsd === 44214.00);
    report('Calculates total variance ($3,930.00) and max fluctuation percentage', timelineAnalysis.volatilityMetrics.netVarianceUsd === 3930.00 && timelineAnalysis.volatilityMetrics.maxFluctuationPercent > 0);
    report('Component matrix tracks all 4 hardware SKUs across 5 months', timelineAnalysis.componentMatrix.length === 4 && timelineAnalysis.componentMatrix[0].timeline.length === 5);

    console.log('\n================================================================');
    console.log(`🎉 ALL ${totalTests} HISTORICAL TIMELINE PRICING TESTS PASSED (100% VERIFIED)`);
    console.log('================================================================\n');

  } finally {
    try {
      fs.rmSync(testTempDir, { recursive: true, force: true });
    } catch (_) { /* ignore cleanup error */ }
  }
}

runHistoricalPricingSuite().catch((err) => {
  console.error('\n💥 FATAL HISTORICAL PRICING TEST FAILURE:', err);
  process.exit(1);
});
