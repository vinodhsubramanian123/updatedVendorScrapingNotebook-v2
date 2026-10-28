'use strict';
/**
 * tests/unit/test_counterfactual_repair_and_reasoning.js — Counterfactual Repair & Mathematical Derivations Verification
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { generateCounterfactualRepairProofs } = require('../../scripts/lib/system/counterfactual_repair.js');
const { performReasoningPostAnalysis } = require('../../scripts/lib/system/reasoning_post_analyzer.js');

describe('Counterfactual Repair Engine & Mathematical Reasoning Proofs (Features 6 & 8 / Requirement R2)', () => {

  it('1. Power: Generates exact proofs for power deficit and 0 PSUs', () => {
    const evalResults = {
      customerDisposition: 'DELIVERY_BLOCKED_UNBUILDABLE',
      evalSummary: {
        power: {
          hasZeroPsus: true,
          psuCount: 0,
          estimatedNodeWattage: 850
        }
      }
    };

    const proofs = generateCounterfactualRepairProofs(evalResults, { serverCount: 1 });
    assert.equal(proofs.length, 1);
    assert.equal(proofs[0].issueType, 'POWER_PSU_MISSING');
    assert.equal(proofs[0].requiredHardwareDeltas[0].action, 'ADD');
    assert.equal(proofs[0].requiredHardwareDeltas[0].sku, 'P38997-B21');
    assert.equal(proofs[0].requiredHardwareDeltas[0].quantity, 2);
    assert.ok(proofs[0].mathematicalProof.includes('1600W'));
    assert.equal(proofs[0].resultingStatus, '100% BUILDABLE');
  });

  it('2. Thermal: Generates exact proofs for missing heatsink and high TDP', () => {
    const evalResults = {
      customerDisposition: 'DELIVERY_BLOCKED_UNBUILDABLE',
      evalSummary: {
        compute: {
          cpuCount: 2,
          maxCpuTdpWatts: 225,
          needsHeatsink: true
        }
      }
    };

    const proofs = generateCounterfactualRepairProofs(evalResults, { serverCount: 1 });
    assert.equal(proofs.length, 1);
    assert.equal(proofs[0].issueType, 'THERMAL_HEATSINK_MISSING');
    assert.equal(proofs[0].requiredHardwareDeltas[0].sku, 'P74792-B21');
    assert.equal(proofs[0].requiredHardwareDeltas[0].quantity, 2);
    assert.ok(proofs[0].mathematicalProof.includes('270W'));
    assert.equal(proofs[0].resultingStatus, '100% BUILDABLE');
  });

  it('3. Memory: Generates exact proofs for memory channel imbalance and 0 RAM', () => {
    const evalResults = {
      customerDisposition: 'DELIVERY_BLOCKED_UNBUILDABLE',
      evalSummary: {
        memory: {
          cpuCount: 2,
          memoryCount: 3,
          channelWidth: 8,
          isBalancedChannel: false
        }
      }
    };

    const proofs = generateCounterfactualRepairProofs(evalResults, { serverCount: 1 });
    assert.equal(proofs.length, 1);
    assert.equal(proofs[0].issueType, 'MEMORY_UNBALANCED_CHANNELS');
    assert.ok(proofs[0].mathematicalProof.includes('16 DIMMs'));
    assert.equal(proofs[0].resultingStatus, '100% BUILDABLE');
  });

  it('4. Reasoning Post-Analyzer: Calculates explicit Step 3 math and Step 6 resolution proofs', () => {
    const responseData = {
      status: 'ACTION_REQUIRED',
      chassis: 'DL380_Gen12',
      isMathClean: false,
      customerDisposition: 'DELIVERY_BLOCKED_UNBUILDABLE',
      aspectChecksCompleted: true,
      aspectChecks: [
        { id: 1, name: 'Power', status: 'FAIL', detail: 'PSU deficit' }
      ],
      evalSummary: {
        power: {
          estimatedNodeWattage: 850,
          requiredWattageWithHeadroom: 1020,
          maxPsuWattage: 800,
          hasPsuHeadroomDeficit: true
        },
        memory: {
          cpuCount: 2,
          memoryCount: 16,
          channelWidth: 8,
          isBalancedChannel: true
        },
        pcie: {
          requiredPcieCards: 3,
          activeSlotsAvailable: 2,
          totalPhysicalSlots: 3
        },
        compute: {
          cpuCount: 2,
          maxCpuTdpWatts: 225
        }
      },
      selfCorrectionTrail: [
        {
          contestedResourceType: 'OCP_SLOT_1_COLLISION',
          selfCorrectionAction: 'Branch B: Form-Factor Pivot to PCIe Storage',
          resolutionDetails: 'Pivoted controller to PCIe Standup Slot 3.'
        }
      ]
    };

    const analysis = performReasoningPostAnalysis({
      queryText: 'Evaluate unbuildable tender',
      context: { chassisName: 'DL380_Gen12', persistLedger: false },
      classification: { intent: 'BOQ_EVALUATION', confidence: 1.0 },
      responseData,
      traceId: 'TRC-TEST-MATH-001',
      executionTimeMs: 80
    });

    assert.ok(analysis.reasoningNarrative);
    const narrative = analysis.reasoningNarrative.join('\n');
    assert.ok(narrative.includes('Power Deficit Proof: Node load = 850W + 20% headroom (170W) = 1020W required vs 800W PSU capacity -> Deficit: -220W (28% overage)'));
    assert.ok(narrative.includes('Memory Balance Proof: 16 DIMMs across 2 CPU(s) with 8 channels/socket'));
    assert.ok(narrative.includes('PCIe Capacity Proof: Demand = 3 card(s) vs Active = 2 slot(s)'));
    assert.ok(narrative.includes('Autonomous Self-Correction & Backtracking: Resolved 1 physical contention(s)'));
    assert.ok(narrative.includes('Deterministic Counterfactual Repair Proofs: Generated'));
    assert.ok(analysis.counterfactualRepairProofs.length > 0);
  });

});
