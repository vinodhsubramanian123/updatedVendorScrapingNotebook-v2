'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { runPostExecutionReflection } = require('../../scripts/lib/feedback/post_run_reflection.js');
const { promoteLearnedInstructions } = require('../../scripts/lib/feedback/instruction_promoter.js');
const { validateCompositeSolutionContainment } = require('../../scripts/lib/boq/composite_solution_validator.js');
const { computeCandidateRunwayAndTradeOffs } = require('../../scripts/lib/conflict/tradeoff_explainer.js');
const {
  rankClarificationsByValueOfInformation,
  collectScopedIntakeTrapAdvisories
} = require('../../scripts/lib/conflict/sizing/voi_clarification_ranker.js');

describe('Wave 4 Intelligence Elevation & Closed-Loop Reflection (INV-279, INV-280)', () => {
  it('1) post_run_reflection deduplicates distinct traces, rejects Tier-0 claims, and updates digest', t => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'w4-reflect-'));
    t.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));
    const queuePath = path.join(tmpDir, 'queue.json');
    const digestPath = path.join(tmpDir, 'ACTIVE_LEARNINGS_DIGEST.md');

    const detResponse = {
      chassis: 'DL380_Gen12',
      aspectChecksCompleted: true,
      missingDependencies: [
        { affectedSku: 'P67088-B21', key: 'P48820-B21', reason: 'High-TDP CPU requires HP fan kit' }
      ],
      opinionDiscrepancies: [
        { sku: 'P67088-B21', detail: 'Customer quote asks for standard fan on 350W CPU' }
      ]
    };

    const r1 = runPostExecutionReflection({
      responseData: detResponse,
      analysis: { epistemicIntegrity: { tier: 'TIER_1_PHYSICAL_SANITY' } },
      traceId: 'TRC-001',
      options: { forceReflection: true, queuePath, digestPath }
    });
    assert.equal(r1.enqueuedCount, 1);
    assert.equal(r1.rejectedTier0Count, 1);

    // Same traceId must NOT double-count
    const rSame = runPostExecutionReflection({
      responseData: detResponse,
      analysis: { epistemicIntegrity: { tier: 'TIER_1_PHYSICAL_SANITY' } },
      traceId: 'TRC-001',
      options: { forceReflection: true, queuePath, digestPath }
    });
    assert.equal(rSame.updatedCount, 0);

    // Distinct traces increment count to >= 3 -> readyForPromotion = true
    runPostExecutionReflection({ responseData: detResponse, analysis: { epistemicIntegrity: { tier: 'TIER_1_PHYSICAL_SANITY' } }, traceId: 'TRC-002', options: { forceReflection: true, queuePath, digestPath } });
    runPostExecutionReflection({ responseData: detResponse, analysis: { epistemicIntegrity: { tier: 'TIER_1_PHYSICAL_SANITY' } }, traceId: 'TRC-003', options: { forceReflection: true, queuePath, digestPath } });

    const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
    assert.equal(queue.entries.length, 1);
    assert.equal(queue.entries[0].authoritativeObservationCount, 3);
    assert.equal(queue.entries[0].readyForPromotion, true);
    assert.ok(fs.readFileSync(digestPath, 'utf8').includes('READY'));
  });

  it('2) promote_learned_instructions promotes >=3 observation rules and rolls back cleanly on validation failure', async t => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'w4-promote-'));
    t.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));
    const queuePath = path.join(tmpDir, 'queue.json');
    const digestPath = path.join(tmpDir, 'digest.md');
    const regPath = path.join(tmpDir, 'master_registry.json');
    const rulesPath = path.join(tmpDir, 'DL380_Gen12_Catalog_Rules.json');

    fs.writeFileSync(regPath, JSON.stringify({ registryVersion: '2.0.0', deltas: [], chassisSpecificRules: [] }));
    fs.writeFileSync(rulesPath, JSON.stringify([]));
    fs.writeFileSync(queuePath, JSON.stringify({
      version: '1.0.0',
      entries: [
        {
          proposalId: 'LEARN-2OBS',
          ruleKey: 'k-2obs',
          status: 'PENDING',
          chassis: 'DL380_Gen12',
          category: 'MANDATORY_DEPENDENCY',
          affectedSku: 'P67088-B21',
          targetSku: 'P48820-B21',
          summary: '2 observations only',
          ruleUpdate: 'Wait for 3rd obs',
          authoritativeObservationCount: 2,
          verifiedPortalOrHumanReceipt: false
        },
        {
          proposalId: 'LEARN-3OBS',
          ruleKey: 'k-3obs',
          status: 'PENDING',
          chassis: 'DL380_Gen12',
          category: 'MANDATORY_DEPENDENCY',
          affectedSku: 'P67088-B21',
          targetSku: 'P48820-B21',
          summary: '3 observations certified',
          ruleUpdate: 'Require P48820-B21',
          authoritativeObservationCount: 3,
          verifiedPortalOrHumanReceipt: false
        }
      ]
    }));

    const dryRun = await promoteLearnedInstructions({ apply: false, queuePath });
    assert.equal(dryRun.eligibleCount, 1);
    assert.equal(dryRun.candidates[0].proposalId, 'LEARN-3OBS');

    const beforeReg = fs.readFileSync(regPath, 'utf8');
    const rolled = await promoteLearnedInstructions({
      apply: true,
      queuePath,
      digestPath,
      masterRegistryPath: regPath,
      catalogRulesMap: { DL380_Gen12: rulesPath },
      validatorFn: async () => ({ ok: false, error: 'Simulated skill lint failure' })
    });
    assert.equal(rolled.status, 'ROLLED_BACK');
    assert.equal(rolled.rolledBack, true);
    assert.equal(fs.readFileSync(regPath, 'utf8'), beforeReg);

    const applied = await promoteLearnedInstructions({
      apply: true,
      queuePath,
      digestPath,
      masterRegistryPath: regPath,
      catalogRulesMap: { DL380_Gen12: rulesPath },
      validatorFn: async () => ({ ok: true })
    });
    assert.equal(applied.status, 'PROMOTED');
    assert.equal(applied.promotedCount, 1);
    assert.deepEqual(applied.promotedIds, ['LEARN-3OBS']);
    assert.equal(JSON.parse(fs.readFileSync(regPath, 'utf8')).deltas.length, 1);
    assert.equal(JSON.parse(fs.readFileSync(rulesPath, 'utf8')).length, 1);
  });

  it('3) composite_solution_validator evaluates PASS, FAIL, and UNKNOWN containment states', () => {
    const passRes = validateCompositeSolutionContainment({
      items: [
        { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 Server', quantity: 2, watts: 900 },
        { sku: 'R4D85A', description: 'HPE SN3600B 32Gb 24-port SAN Switch', quantity: 2, ports: 24, watts: 150 },
        { sku: 'S0B84A', description: 'HPE Alletra Storage MP B10100 Storage Array', quantity: 1, ports: 8, watts: 850 },
        { sku: 'Q2P63A', description: 'HPE 32Gb FC SFP28 OM4 MM Transceiver', quantity: 12 }
      ]
    }, { fcDemandPorts: 16 });
    assert.equal(passRes.status, 'PASS');
    assert.equal(passRes.isCompositeMultiDomain, true);
    assert.equal(passRes.totalRackUnits, 8);
    assert.equal(passRes.rackCount42U, 1);

    const failRes = validateCompositeSolutionContainment({
      items: [
        { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 Server', quantity: 1, watts: 800 },
        { sku: 'R4D85A', description: 'HPE SN3600B 32Gb 24-port SAN Switch', quantity: 1, ports: 24, watts: 150 },
        { sku: 'S0B84A', description: 'HPE Alletra Storage MP B10100 Array', quantity: 1, watts: 850 },
        { sku: 'OPT-ETH', description: 'HPE 25GbE SFP28 SR Optic Transceiver', quantity: 4 }
      ]
    }, { fcDemandPorts: 8 });
    assert.equal(failRes.status, 'FAIL');
    assert.ok(failRes.blockers.length >= 2);

    const unknownRes = validateCompositeSolutionContainment({
      items: [
        { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 Server', quantity: 2 },
        { sku: 'R4D85A', description: 'HPE SN3600B 32Gb 24-port SAN Switch', quantity: 2, ports: 24 },
        { sku: 'S0B84A', description: 'HPE Alletra Storage MP B10100 Array', quantity: 1 }
      ]
    }, { fcDemandPorts: 8 });
    assert.equal(unknownRes.status, 'UNKNOWN');
  });

  it('4) tradeoff_explainer & voi_clarification_ranker preserve nulls and rank non-destructively', () => {
    const compared = computeCandidateRunwayAndTradeOffs([
      { strategyId: 'STRATEGY_CLOSEST_INTENT', estimatedCostUsd: 8000, dimmCount: 8, maxDimmSlots: 32, skuPartsList: [{ sku: 'A' }] },
      { strategyId: 'STRATEGY_BUDGET', estimatedCostUsd: 6800, dimmCount: 4, maxDimmSlots: 32, hasDowngradedComponents: true, skuPartsList: [{ sku: 'B' }] },
      { strategyId: 'STRATEGY_UNPRICED', estimatedCostUsd: 0, pricingComplete: false, skuPartsList: [{ sku: 'C' }] }
    ]);
    assert.equal(compared[0].tradeOffVsBaseline.capExDeltaUsd, 0);
    assert.equal(compared[1].tradeOffVsBaseline.capExDeltaUsd, -1200);
    assert.equal(compared[1].tradeOffVsBaseline.capExDeltaPct, -15);
    assert.equal(compared[1].day2Runway.dimmSlotsFreePct, 87.5);
    assert.equal(compared[2].tradeOffVsBaseline.capExDeltaUsd, null);
    assert.equal(compared[2].tradeOffVsBaseline.capExDeltaPct, null);
    assert.equal(compared[2].day2Runway.dimmSlotsFreePct, null);

    const rawMissing = ['targetSlaTier', 'workingSetGb', 'resilienceMode'];
    const snapshot = [...rawMissing];
    const ranked = rankClarificationsByValueOfInformation(rawMissing, { nodeCount: 2 });
    assert.deepEqual(rawMissing, snapshot, 'Must never mutate input array');
    assert.equal(ranked.topClarification.field, 'resilienceMode');
    assert.equal(ranked.prioritizedClarifications.length, 3);

    const traps = collectScopedIntakeTrapAdvisories('Alletra_MP_B10000');
    assert.ok(traps.some(x => x.trapId === 'TRAP-B10K-TOPOLOGY'));
    assert.equal(collectScopedIntakeTrapAdvisories('UNKNOWN_PRODUCT').length, 0);
  });
});
