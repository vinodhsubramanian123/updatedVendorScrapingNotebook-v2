'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  ALLETRA_MP_MANDATORY_DISCLOSURE,
  interpolateMemoryTopology,
  interpolateStorageTopology,
  computeHaClusterScalingCurve,
  interpolateAlletraMpEnvelope,
  computeNormalizedEfficiencyMetrics,
  computeCrossGenerationDeltas,
  analyzePriceTrendAnalytics
} = require('../../scripts/lib/conflict/sizing/scaling_interpolator.js');
const {
  compareSolutionsAcrossPlatforms
} = require('../../scripts/lib/boq/solution_comparator.js');
const {
  classifyQueryIntent,
  executeRoutedQuery
} = require('../../scripts/evaluators/route_query.js');
const {
  executeCatalogSearch
} = require('../../scripts/lib/catalog/catalog_query_engine.js');
const {
  verifyPrePresentationAcceptance
} = require('../../scripts/lib/boq/bom_verifier.js');
const {
  planPresalesQuery
} = require('../../scripts/lib/boq/presales_query_planner.js');
const {
  executeToolRequest
} = require('../../scripts/services/mcp_server.js');
const { listAllCatalogs } = require('../../scripts/lib/catalog/catalog_discovery.js');

const REPO_ROOT = path.resolve(__dirname, '../..');

function loadRealCatalog(relPath) {
  return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf8'));
}

describe('Phase 3A · scaling_interpolator.js', () => {
  it('computes balanced 1DPC & 2DPC memory topologies with speed-stepdown disclosure and null-price safety', () => {
    const dl380Gen12 = loadRealCatalog('outputs/ProLiant/Gen12/DL380_Gen12/DL380_Gen12_Catalog.json');
    const res = interpolateMemoryTopology({
      targetRamGb: 512,
      socketCount: 2,
      channelsPerSocket: 8,
      catalogData: dl380Gen12
    });
    assert.equal(res.coverageGap, null);
    assert.ok(res.recommended1Dpc, 'Expected a balanced 1DPC recommendation');
    assert.ok(res.recommended2Dpc, 'Expected a balanced 2DPC recommendation');
    assert.equal(res.recommended1Dpc.dpc, 1);
    assert.equal(res.recommended1Dpc.speedStepdownApplied, false);
    assert.equal(res.recommended1Dpc.speedStepdownDisclosure, null);
    assert.ok(res.recommended1Dpc.totalCapacityGb >= 512);
    assert.equal(res.recommended2Dpc.dpc, 2);
    assert.equal(res.recommended2Dpc.speedStepdownApplied, true);
    assert.match(res.recommended2Dpc.speedStepdownDisclosure, /2DPC speed stepdown/i);
    assert.equal(typeof res.recommended1Dpc.headroomPct, 'number');

    // Negative control: 0 DIMMs -> CATALOG_COVERAGE_GAP
    const emptyMem = interpolateMemoryTopology({
      targetRamGb: 512,
      socketCount: 2,
      channelsPerSocket: 8,
      catalogData: { entries: [] }
    });
    assert.equal(emptyMem.coverageGap, 'CATALOG_COVERAGE_GAP');
    assert.deepEqual(emptyMem.candidates, []);

    // Negative control: unpriced DIMM preserves null (never $0)
    const unpriced = interpolateMemoryTopology({
      targetRamGb: 256,
      socketCount: 2,
      channelsPerSocket: 8,
      dimmOptions: [{ sku: 'P99999-B21', description: 'HPE 32GB DDR5-5600 RDIMM', capacityGb: 32, speedMt: 5600, unitPriceUsd: null }]
    });
    assert.equal(unpriced.bestBalanced.unitPriceUsd, null);
    assert.equal(unpriced.bestBalanced.totalMemoryCostUsd, null);
    assert.equal(unpriced.bestBalanced.pricingComplete, false);
  });

  it('computes RAID usable TB, hot spares, efficiency ratio, and SAS-expander/controller crossover (>8 drives)', () => {
    const driveOptions = [
      { sku: 'P40500-B21', description: 'HPE 1.92TB SAS RI SFF SSD', capacityTb: 1.92, protocol: 'SAS', formFactor: 'SFF', unitPriceUsd: 1200 },
      { sku: 'P40502-B21', description: 'HPE 7.68TB SAS RI SFF SSD', capacityTb: 7.68, protocol: 'SAS', formFactor: 'SFF', unitPriceUsd: 3800 }
    ];
    const raid6 = interpolateStorageTopology({
      targetUsableTb: 20,
      raidLevel: 'RAID6-ADG',
      hotSpares: 1,
      controllerPortLimit: 8,
      driveOptions
    });
    assert.equal(raid6.raidLevel, 'RAID6-ADG');
    assert.equal(raid6.coverageGap, null);
    const smallDrive = raid6.candidates.find(c => c.sku === 'P40500-B21');
    const largeDrive = raid6.candidates.find(c => c.sku === 'P40502-B21');
    assert.ok(smallDrive && largeDrive);
    assert.equal(largeDrive.totalDrives, 6); // 3 data + 2 parity + 1 spare
    assert.equal(largeDrive.controllerCrossoverTriggered, false);
    assert.ok(smallDrive.totalDrives > 8);
    assert.equal(smallDrive.controllerCrossoverTriggered, true);
    assert.ok(smallDrive.crossoverOptions.includes('ADD_SAS_EXPANDER_CARD'));
    assert.ok(largeDrive.usableTb >= 20);
    assert.ok(largeDrive.parityOverheadTb > 0);
    assert.ok(largeDrive.hotSpareOverheadTb > 0);
    assert.ok(largeDrive.efficiencyRatio > 0 && largeDrive.efficiencyRatio < 1);

    // vSAN check
    const vsan = interpolateStorageTopology({
      targetUsableTb: 15,
      raidLevel: 'vSAN',
      hotSpares: 0,
      driveOptions
    });
    assert.equal(vsan.raidLevel, 'VSAN');
    assert.ok(vsan.recommended.usableTb >= 15);
    assert.equal(vsan.recommended.efficiencyRatio, 0.5);

    // Negative control: 0 drives -> CATALOG_COVERAGE_GAP
    const emptyDrives = interpolateStorageTopology({
      targetUsableTb: 10,
      raidLevel: 'RAID5',
      catalogData: { entries: [] }
    });
    assert.equal(emptyDrives.coverageGap, 'CATALOG_COVERAGE_GAP');
    assert.deepEqual(emptyDrives.candidates, []);
  });

  it('computes NONE, N+1, and 2N HA cluster scaling curves, 42U rack footprint, and peak kW envelopes', () => {
    const curve = computeHaClusterScalingCurve({
      perNodeCores: 64,
      perNodeRamGb: 512,
      perNodeUsableTb: 20,
      perNodeWatts: 800,
      perNodeRackU: 2,
      perNodeCostUsd: null,
      pricingComplete: false,
      requiredCores: 192,
      requiredRamGb: 1536,
      requiredUsableTb: 60
    });
    assert.equal(curve.minActiveNodes, 3);
    assert.equal(curve.policyRecommendations.NONE.totalNodes, 3);
    assert.equal(curve.policyRecommendations['N+1'].totalNodes, 4);
    assert.equal(curve.policyRecommendations['N+1'].survivingCores, 192);
    assert.equal(curve.policyRecommendations['2N'].totalNodes, 6);
    assert.equal(curve.policyRecommendations['2N'].survivingNodes, 3);
    assert.equal(curve.policyRecommendations['2N'].totalRackU, 12);
    assert.equal(curve.policyRecommendations['2N'].racks42U, 1);
    assert.equal(curve.policyRecommendations['2N'].peakPowerKw, 4.8);
    assert.equal(curve.policyRecommendations['2N'].clusterCostUsd, null);
    assert.ok(Array.isArray(curve.scalingCurve) && curve.scalingCurve.length >= 3);
  });

  it('interpolates Alletra MP B10100->B10200 switchless-to-switched crossover & X10000 TLC vs QLC grids with Ninja Online disclosure', () => {
    const internal20 = interpolateAlletraMpEnvelope({ product: 'Alletra_MP_B10000', targetDriveCount: 20 });
    assert.equal(internal20.telemetryPresent, true);
    assert.equal(internal20.recommendedTopology, 'SWITCHLESS_B10100');
    assert.equal(internal20.recommendedBaseSku, 'S0B84A');
    assert.equal(internal20.requiredJbofs, 0);
    assert.equal(internal20.switchlessToSwitchedCrossover.crossoverTriggered, false);
    assert.equal(internal20.switchlessToSwitchedCrossover.requiresBackendNvmeOfSwitches, false);
    assert.equal(internal20.portalValidationStatus, 'PORTAL_VALIDATION_PENDING');
    assert.equal(internal20.mandatoryWorkflowDisclosure, ALLETRA_MP_MANDATORY_DISCLOSURE);

    const mid48 = interpolateAlletraMpEnvelope({ product: 'Alletra_MP_B10000', targetDriveCount: 48 });
    assert.equal(mid48.recommendedTopology, 'SWITCHLESS_B10100');
    assert.equal(mid48.requiredJbofs, 1);
    assert.equal(mid48.eligibleControllerNodes.some(n => n.model === 'B10120'), false);
    assert.equal(mid48.eligibleControllerNodes.some(n => n.model === 'B10130'), true);

    const switched96 = interpolateAlletraMpEnvelope({ product: 'Alletra_MP_B10000', targetDriveCount: 96 });
    assert.equal(switched96.recommendedTopology, 'SWITCHED_B10200');
    assert.equal(switched96.recommendedBaseSku, 'S1R06A');
    assert.equal(switched96.internalChassisDrives, 0);
    assert.equal(switched96.requiredJbofs, 4);
    assert.equal(switched96.switchlessToSwitchedCrossover.crossoverTriggered, true);
    assert.equal(switched96.switchlessToSwitchedCrossover.requiresBackendNvmeOfSwitches, true);

    const x10k = interpolateAlletraMpEnvelope({
      product: 'Alletra_MP_X10000',
      targetNodes: 4,
      targetJbofs: 2,
      workloadProfile: '1M|PUT|1'
    });
    assert.equal(x10k.telemetryPresent, true);
    assert.equal(x10k.mediaEnvelopes.TLC.available, true);
    assert.equal(x10k.mediaEnvelopes.QLC.available, true);
    assert.ok(x10k.tlcVsQlcComparison.tlcMbps > x10k.tlcVsQlcComparison.qlcMbps);
    assert.equal(x10k.portalValidationStatus, 'PORTAL_VALIDATION_PENDING');

    // Graceful fallback when Ninja telemetry JSON is absent
    const fallback = interpolateAlletraMpEnvelope({
      product: 'Alletra_MP_B10000',
      targetDriveCount: 96,
      b10000Path: path.join(REPO_ROOT, 'outputs', 'DOES_NOT_EXIST_NINJA.json')
    });
    assert.equal(fallback.telemetryPresent, false);
    assert.equal(fallback.telemetrySource, 'EMBEDDED_ENVELOPE_FALLBACK');
    assert.equal(fallback.recommendedTopology, 'SWITCHED_B10200');
    assert.equal(fallback.requiresNinjaOnlineOcaJsonExport, true);
  });

  it('computes bounded price-trend analytics and cross-gen deltas strictly tagged ESTIMATE without coercing null prices', () => {
    const trend = analyzePriceTrendAnalytics([
      { date: '2026-08-01', price: 1000 },
      { date: '2026-09-01', price: 1050 },
      { date: '2026-10-01', price: 1120 },
      { date: '2026-11-01', price: 1180 }
    ], { sku: 'P69727-B21' });
    assert.equal(trend.sufficientData, true);
    assert.equal(trend.classification, 'ESTIMATE');
    assert.equal(trend.substitutesForDatedCatalogPrice, false);
    assert.equal(trend.latestDatedCatalogPriceUsd, 1180);
    assert.equal(trend.direction, 'UPWARD');
    assert.ok(trend.slopeUsdPerDay > 0);
    assert.ok(trend.volatilityPct > 0);
    assert.equal(trend.isBounded, true);

    // Bounded clamp check on volatile short-window jump
    const clamped = analyzePriceTrendAnalytics([
      { date: '2026-11-01', price: 100 },
      { date: '2026-11-02', price: 500 }
    ], { maxAnnualizedAbsPct: 200 });
    assert.equal(clamped.wasClampedToBounds, true);
    assert.equal(clamped.annualizedTrendPct, 200);

    // Null price preservation
    const eff = computeNormalizedEfficiencyMetrics({
      capexListUsd: null,
      pricingComplete: false,
      totalCores: 64,
      totalRamGb: 512,
      usableTb: 20,
      peakWatts: 640,
      rackUnits: 2
    });
    assert.equal(eff.capexListUsd, null);
    assert.equal(eff.costPerCoreUsd, null);
    assert.equal(eff.costPerGbRamUsd, null);
    assert.equal(eff.costPerUsableTbUsd, null);
    assert.equal(eff.wattsPerCore, 10);
    assert.equal(eff.coresPerU, 32);

    const delta = computeCrossGenerationDeltas(
      { platform: 'DL385_Gen11', generation: 'Gen11', capexListUsd: 100000, pricingComplete: true, costPerCoreUsd: 1562.5 },
      { platform: 'DL380_Gen12', generation: 'Gen12', capexListUsd: null, pricingComplete: false, costPerCoreUsd: null }
    );
    assert.equal(delta.classification, 'ESTIMATE');
    assert.equal(delta.bothPricesComplete, false);
    assert.equal(delta.capexListUsd.delta, null);
  });
});

describe('Phase 3A · solution_comparator.js, Routing, Verifier & MCP Wiring', () => {
  it('compares DL380 Gen12 vs DL385 Gen11 vs DL360 Gen12 side-by-side with Pareto frontier and cross-gen deltas', () => {
    const result = compareSolutionsAcrossPlatforms(
      'Compare DL380 Gen12 vs DL385 Gen11 vs DL360 Gen12 for 64 cores and 512GB RAM'
    );
    assert.equal(result.intent, 'SOLUTION_COMPARISON');
    assert.deepEqual(result.comparedPlatforms.sort(), ['DL360_Gen12', 'DL380_Gen12', 'DL385_Gen11']);
    assert.deepEqual(result.unresolvedPlatforms, []);
    assert.equal(result.portalValidationStatus, 'PORTAL_VALIDATION_PENDING');
    assert.equal(result.comparisonMatrix.length, 3);
    assert.ok(result.crossGenerationDeltas.length >= 1);
    assert.equal(result.crossGenerationDeltas[0].classification, 'ESTIMATE');
    for (const row of result.comparisonMatrix) {
      assert.equal(row.portalValidationStatus, 'PORTAL_VALIDATION_PENDING');
      assert.equal(typeof row.pricingComplete, 'boolean');
      assert.equal(typeof row.paretoOptimal, 'boolean');
      assert.ok(Array.isArray(row.disqualifiedReasons));
      assert.ok(row.achievedSpecs.coresPerNode >= 64);
      assert.ok(row.achievedSpecs.ramGbPerNode >= 512);
    }
    const gate = verifyPrePresentationAcceptance(result, 'SOLUTION_COMPARISON', {});
    assert.equal(gate.checks.find(c => c.id === 'SC1')?.status, 'PASSED');
  });

  it('enforces negative controls: unknown platform unresolved, unpriced SKU keeps null CapEx, 0-drive catalog flags CATALOG_COVERAGE_GAP', () => {
    // 1. Unknown platform never widened
    const withUnknown = compareSolutionsAcrossPlatforms(
      'Compare DL380 Gen12 vs DL999 Gen99 for 64 cores and 512GB RAM'
    );
    assert.deepEqual(withUnknown.comparedPlatforms, ['DL380_Gen12']);
    assert.ok(withUnknown.unresolvedPlatforms.some(p => /DL999/i.test(p)));
    assert.equal(withUnknown.status, 'PARTIAL_COMPARISON');

    // 2. Synthetic unpriced base + 0 drives -> capexListUsd: null, pricingComplete: false, CATALOG_COVERAGE_GAP
    const synthCatalogs = [
      { id: 'DL380_Gen12', chassis: 'DL380 Gen12', gen: 'Gen12', catalogDir: '', catalogJsonPath: '' },
      { id: 'DL385_Gen11', chassis: 'DL385 Gen11', gen: 'Gen11', catalogDir: '', catalogJsonPath: '' }
    ];
    const unpricedAndNoDrives = {
      entries: [
        { parentCategory: 'Chassis', skus: [{ 'Product #': 'P73282-B21', Description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', 'List Price (USD)': '' }] },
        { parentCategory: 'Processor', skus: [{ 'Product #': 'P74571-B21', Description: 'Intel Xeon 6737P 32-core 270W Processor', 'List Price (USD)': '$3,500.00', 'Lead Time': '7 days' }] },
        { parentCategory: 'Memory', skus: [{ 'Product #': 'P69727-B21', Description: 'HPE 32GB (1x32GB) Dual Rank DDR5-6400 RDIMM', 'List Price (USD)': '$900.00', 'Lead Time': '5 days' }] },
        { parentCategory: 'Power Supplies', skus: [{ 'Product #': 'P03178-B21', Description: 'HPE 1000W Flex Slot Titanium Power Supply', 'List Price (USD)': '$500.00', 'Lead Time': '5 days' }] }
      ]
    };
    const res = compareSolutionsAcrossPlatforms(
      { platforms: ['DL380_Gen12'], cores: 64, ramGb: 512, usableTb: 20, raidLevel: 'RAID5' },
      { catalogs: synthCatalogs, catalogDataById: { DL380_Gen12: unpricedAndNoDrives } }
    );
    const row = res.comparisonMatrix[0];
    assert.equal(row.capexListUsd, null);
    assert.equal(row.pricingComplete, false);
    assert.ok(row.unpricedSkus.includes('P73282-B21'));
    assert.equal(row.costPerCoreUsd, null);
    assert.ok(row.catalogCoverageGaps.some(g => g.code === 'CATALOG_COVERAGE_GAP' && g.category === 'Drive Cage / Drive'));
    assert.ok(row.disqualifiedReasons.some(r => r.code === 'CATALOG_COVERAGE_GAP'));
  });

  it('routes SOLUTION_COMPARISON via route_query & planner while preserving AMBIGUOUS_QUERY regression guards', async () => {
    const query = 'Compare DL380 Gen12 vs DL385 Gen11 for 64 cores and 512GB RAM';
    const intent = classifyQueryIntent(query);
    assert.equal(intent.intent, 'SOLUTION_COMPARISON');

    const plan = planPresalesQuery(query);
    assert.equal(plan.objective, 'SOLUTION_COMPARISON');

    const routed = await executeRoutedQuery(query, { offline: true });
    assert.equal(routed.classification.intent, 'SOLUTION_COMPARISON');
    assert.equal(routed.result.intent, 'SOLUTION_COMPARISON');
    assert.equal(routed.result.comparisonMatrix.length, 2);
    assert.equal(routed.result.acceptanceGate?.isValid, true);

    // Regression guard: generic multi-gen without vs/sizing remains AMBIGUOUS_QUERY
    const ambig = await executeRoutedQuery('Compare DL380 Gen11 and DL380 Gen12 for our environment', { offlineMode: true });
    assert.equal(ambig.ambiguityDetails?.chassisKey, 'AMBIGUOUS_QUERY');

    // Regression guard: multi-product BOM build stays PLATFORM_CLARIFICATION_REQUIRED
    const ambigBuild = await executeRoutedQuery('Build a BOM for B10000 and X10000', { offline: true });
    assert.equal(ambigBuild.result.code, 'PLATFORM_CLARIFICATION_REQUIRED');
  });

  it('enriches Alletra MP route_query handoffs and catalog_query_engine searches with Ninja Online telemetry', async () => {
    const b10kHandoff = await executeRoutedQuery('Size B10200 with 96 NVMe drives', { offline: true });
    assert.equal(b10kHandoff.result.code, 'NINJA_ONLINE_SIZING_REQUIRED');
    assert.equal(b10kHandoff.result.storageSizingHandoff.telemetryPresent, true);
    assert.equal(b10kHandoff.result.storageSizingHandoff.crossoverAnalysis.crossoverTriggered, true);
    assert.equal(b10kHandoff.result.storageSizingHandoff.driveAndJbofLimits.recommendedBaseSku, 'S1R06A');
    assert.deepEqual(b10kHandoff.result.candidateBOM, []);

    const x10kHandoff = await executeRoutedQuery('Build a BOM for HPE Alletra MP X10000 with 2 PB storage', { offline: true });
    assert.equal(x10kHandoff.result.code, 'NINJA_ONLINE_SIZING_REQUIRED');
    assert.equal(x10kHandoff.result.storageSizingHandoff.telemetryPresent, true);
    assert.ok(x10kHandoff.result.storageSizingHandoff.topologyEnvelopes.TLC.available);
    assert.ok(x10kHandoff.result.storageSizingHandoff.topologyEnvelopes.QLC.available);

    const catalogs = listAllCatalogs();
    const searchRes = executeCatalogSearch('List NVMe drives for Alletra MP B10000', { catalogs, recordMiss: false });
    assert.ok(searchRes.ninjaSizingTelemetry?.Alletra_MP_B10000);
    assert.equal(searchRes.ninjaSizingTelemetry.Alletra_MP_B10000.topologyLimits.switchedMaxDrives, 384);
  });

  it('exposes compare_solutions and interpolate_scaling through mcp_server executeToolRequest', async () => {
    const cmpResp = await executeToolRequest({
      params: {
        name: 'compare_solutions',
        arguments: {
          query: 'Compare DL380 Gen12 vs DL360 Gen12 for 64 cores and 512GB RAM'
        }
      }
    });
    assert.equal(cmpResp.isError, undefined);
    const cmpPayload = JSON.parse(cmpResp.content[0].text);
    assert.equal(cmpPayload.intent, 'SOLUTION_COMPARISON');
    assert.equal(cmpPayload.comparisonMatrix.length, 2);

    const interpResp = await executeToolRequest({
      params: {
        name: 'interpolate_scaling',
        arguments: {
          mode: 'alletra_mp',
          chassis_id: 'Alletra_MP_B10000',
          params: { targetDriveCount: 96 }
        }
      }
    });
    assert.equal(interpResp.isError, undefined);
    const interpPayload = JSON.parse(interpResp.content[0].text);
    assert.equal(interpPayload.recommendedTopology, 'SWITCHED_B10200');
    assert.equal(interpPayload.portalValidationStatus, 'PORTAL_VALIDATION_PENDING');
  });
});
