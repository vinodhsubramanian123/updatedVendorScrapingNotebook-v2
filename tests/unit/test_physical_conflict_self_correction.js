'use strict';
/**
 * tests/unit/test_physical_conflict_self_correction.js — Generalized Self-Correction Trail Verification
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { arbitrateContestedResources } = require('../../scripts/lib/conflict/resource_arbitrator.js');
const { performReasoningPostAnalysis } = require('../../scripts/lib/system/reasoning_post_analyzer.js');

describe('Generalized Counterfactual Self-Correction Trail (Feature 5 / Requirement R2)', () => {

  it('1. Thermal: High-TDP processor emits THERMAL_COOLING_ENVELOPE self-correction trail', () => {
    const highTdpItems = [
      { sku: 'P67088-B21', description: 'Intel Xeon-Platinum 8592+ 2.0GHz 64-core 350W Processor', quantity: 2 }
    ];
    const res = arbitrateContestedResources(highTdpItems, { useNumericStep: true }, { gen: 'Gen12' });
    assert.equal(res.hasContentions, true);
    const trail = res.selfCorrectionTrail.find(t => t.contestedResourceType === 'THERMAL_COOLING_ENVELOPE');
    assert.ok(trail, 'Must emit THERMAL_COOLING_ENVELOPE entry');
    assert.equal(typeof trail.step, 'number');
    assert.ok(trail.hypothesis.includes('standard chassis cooling'));
    assert.ok(trail.detectedFailure.includes('Direct Liquid Cooling'));
    assert.ok(trail.selfCorrectionAction.includes('Branch DLC'));
    assert.equal(trail.verifiedBuildable, true);
  });

  it('2. Memory: Mixed DDR4/DDR5 emits MEMORY_BUS_ARCHITECTURE self-correction trail', () => {
    const mixedMemItems = [
      { sku: 'P00424-B21', description: 'HPE 32GB 2Rx4 PC4-3200AA-R Smart Memory Kit', quantity: 4 },
      { sku: 'P64707-F21', description: 'HPE 64GB DDR5-5600 Registered Smart Memory', quantity: 4 }
    ];
    const res = arbitrateContestedResources(mixedMemItems, { useNumericStep: true }, { gen: 'Gen11' });
    assert.equal(res.hasContentions, true);
    const trail = res.selfCorrectionTrail.find(t => t.contestedResourceType === 'MEMORY_BUS_ARCHITECTURE');
    assert.ok(trail, 'Must emit MEMORY_BUS_ARCHITECTURE entry');
    assert.equal(typeof trail.step, 'number');
    assert.ok(trail.detectedFailure.includes('DDR4 and DDR5'));
    assert.ok(trail.selfCorrectionAction.includes('Branch Memory'));
    assert.equal(trail.verifiedBuildable, true);
  });

  it('3. PCIe: Exceeding active slots emits PCIE_EXPANSION_LANES self-correction trail', () => {
    const pcieItems = [
      { sku: 'P26262-B21', description: 'Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 Adapter for HPE', quantity: 4 }
    ];
    const res = arbitrateContestedResources(
      pcieItems,
      {
        useNumericStep: true,
        aspectChecks: { pcieRiser: { isExceedingActiveSlots: true, activeSlotsAvailable: 2, requiredPcieCards: 4 } }
      },
      { gen: 'Gen11' }
    );
    assert.equal(res.hasContentions, true);
    const trail = res.selfCorrectionTrail.find(t => t.contestedResourceType === 'PCIE_EXPANSION_LANES');
    assert.ok(trail, 'Must emit PCIE_EXPANSION_LANES entry');
    assert.equal(typeof trail.step, 'number');
    assert.ok(trail.detectedFailure.includes('electrically active slots'));
    assert.ok(trail.selfCorrectionAction.includes('Branch PCIe'));
    assert.equal(trail.verifiedBuildable, true);
  });

  it('4. Power: Power deficit emits POWER_ENVELOPE_CAPACITY self-correction trail', () => {
    const powerItems = [
      { sku: 'P38995-B21', description: 'HPE 800W Flex Slot Platinum Hot Plug Low Halogen Power Supply', quantity: 2 }
    ];
    const res = arbitrateContestedResources(
      powerItems,
      {
        useNumericStep: true,
        aspectChecks: { powerEnvironment: { hasPsuWattageDeficit: true, estimatedPeakWatts: 1950, activePsuWattage: 800 } }
      },
      { gen: 'Gen11' }
    );
    assert.equal(res.hasContentions, true);
    const trail = res.selfCorrectionTrail.find(t => t.contestedResourceType === 'POWER_ENVELOPE_CAPACITY');
    assert.ok(trail, 'Must emit POWER_ENVELOPE_CAPACITY entry');
    assert.equal(typeof trail.step, 'number');
    assert.ok(trail.detectedFailure.includes('electrical headroom'));
    assert.ok(trail.selfCorrectionAction.includes('Branch Power'));
    assert.equal(trail.verifiedBuildable, true);
  });

  it('5. Storage: Missing controller cable emits STORAGE_CABLING_AND_EXPANSION self-correction trail', () => {
    const storageItems = [
      { sku: 'P47777-B21', description: 'HPE MR416i-p Gen11 x16 Lanes 8GB Cache PCI SPDM Storage Controller', quantity: 1 },
      { sku: 'P48813-B21', description: 'HPE ProLiant DL380 Gen11 8SFF Tri-Mode Drive Cage Kit', quantity: 1 }
    ];
    const res = arbitrateContestedResources(
      storageItems,
      {
        useNumericStep: true,
        aspectChecks: { storageTriMode: { needsCableKit: true } },
        missingDependencies: [{ key: 'CONTROLLER_DRIVE_CABLE_KIT' }]
      },
      { gen: 'Gen11' }
    );
    assert.equal(res.hasContentions, true);
    const trail = res.selfCorrectionTrail.find(t => t.contestedResourceType === 'STORAGE_CABLING_AND_EXPANSION');
    assert.ok(trail, 'Must emit STORAGE_CABLING_AND_EXPANSION entry');
    assert.equal(typeof trail.step, 'number');
    assert.ok(trail.detectedFailure.includes('controller enablement cable kit'));
    assert.ok(trail.selfCorrectionAction.includes('Branch Storage'));
    assert.equal(trail.verifiedBuildable, true);
  });

  it('6. Support/Licensing: Missing CTO license emits MANDATORY_CTO_MANAGEMENT_LICENSE self-correction trail', () => {
    const ctoItems = [
      { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF NC CTO Server', quantity: 1 }
    ];
    const res = arbitrateContestedResources(
      ctoItems,
      {
        useNumericStep: true,
        aspectChecks: { supportManufacturing: { hasCtoServer: true, hasManagementLicense: false } }
      },
      { gen: 'Gen11' }
    );
    assert.equal(res.hasContentions, true);
    const trail = res.selfCorrectionTrail.find(t => t.contestedResourceType === 'MANDATORY_CTO_MANAGEMENT_LICENSE');
    assert.ok(trail, 'Must emit MANDATORY_CTO_MANAGEMENT_LICENSE entry');
    assert.equal(typeof trail.step, 'number');
    assert.ok(trail.detectedFailure.includes('Rule 81322276'));
    assert.ok(trail.selfCorrectionAction.includes('Branch Licensing'));
    assert.equal(trail.verifiedBuildable, true);
  });

  it('7. End-to-End: Reasoning Post-Analyzer embeds multi-aspect selfCorrectionTrail into Step 6 narrative', () => {
    const multiAspectTrail = [
      { step: 1, contestedResourceType: 'THERMAL_COOLING_ENVELOPE', selfCorrectionAction: 'Branch DLC: Injected Direct Liquid Cooling', resolutionDetails: 'Normalized cooling manifold', verifiedBuildable: true },
      { step: 2, contestedResourceType: 'MEMORY_BUS_ARCHITECTURE', selfCorrectionAction: 'Branch Memory: Standardized DDR5', resolutionDetails: 'Substituted uniform DDR5', verifiedBuildable: true },
      { step: 3, contestedResourceType: 'MANDATORY_CTO_MANAGEMENT_LICENSE', selfCorrectionAction: 'Branch Licensing: Injected R7A11AAE COM SaaS', resolutionDetails: 'Enforced Rule 81322276', verifiedBuildable: true }
    ];

    const analysis = performReasoningPostAnalysis({
      queryText: 'Evaluate multi-conflict BOQ',
      context: { persistLedger: false },
      classification: { intent: 'BOQ_EVALUATION', confidence: 0.98 },
      responseData: {
        status: 'PASSED',
        chassis: 'DL380_Gen12',
        selfCorrectionTrail: multiAspectTrail,
        acceptanceGate: { isValid: true, status: 'PASSED', blockersCount: 0 }
      }
    });

    assert.equal(analysis.selfCorrectionTrail.length, 3);
    const step6 = analysis.reasoningNarrative.find(n => n.includes('6. Autonomous Self-Correction & Backtracking'));
    assert.ok(step6, 'Step 6 must be present in narrative');
    assert.ok(step6.includes('Resolved 3 physical contention(s)'));
    assert.ok(step6.includes('Branch DLC'));
    assert.ok(step6.includes('Branch Memory'));
    assert.ok(step6.includes('Branch Licensing'));
  });

});
