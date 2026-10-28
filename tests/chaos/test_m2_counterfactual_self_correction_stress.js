'use strict';
/**
 * tests/chaos/test_m2_counterfactual_self_correction_stress.js
 *
 * EMPIRICAL ADVERSARIAL CHALLENGER SUITE (Milestone 2 / Challenger M2_1)
 * Counterfactual Repair & Physical Self-Correction Adversarial Stress
 *
 * Rigorously stress-tests:
 * - scripts/lib/system/counterfactual_repair.js (generateCounterfactualRepairProofs)
 * - scripts/lib/conflict/resource_arbitrator.js (arbitrateContestedResources)
 *
 * Attack Vectors Tested:
 * 1. Multi-Deficit Concurrent Unbuildable Stress: 11 concurrent physical deficits across all 7 aspects.
 * 2. Hardware Delta & Mathematical Proof Invariants: Action types, valid SKUs, positive quantities, non-empty proofs.
 * 3. Cluster Multiplier Scaling: 1, 2, 4, 8, 16, 64 nodes, zero/negative/undefined multiplier boundary fuzzing.
 * 4. Zero-Defect & Clean Solution Invariants: 0 repair proofs produced for 100% buildable solutions.
 * 5. Extreme Multi-Contention Arbitration: Simultaneous 8-node power, mixed memory, 4-card PCIe, CTO chassis, OCP, rear bay, thermal, storage.
 * 6. Sequential Step Trail Integrity: Sequential numbering, hypothesis, detected failure, resolution details, verifiedBuildable.
 * 7. Boundary & Robustness Mining: Empty objects, undefined inputs, null-checks, corrupted aspect subsets.
 * 8. Adversarial Falsification & Discovered Flaws:
 *    - REAR_CHASSIS_BAY_SPACE branch misalignment during concurrent OCP contention
 *    - hasManagementLicense false-positive contention when items list is empty
 *    - Null items array unhandled TypeError vulnerability
 *    - Null evalResults unhandled TypeError vulnerability in counterfactual repair
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  generateCounterfactualRepairProofs
} = require('../../scripts/lib/system/counterfactual_repair.js');

const {
  arbitrateContestedResources
} = require('../../scripts/lib/conflict/resource_arbitrator.js');

describe('Milestone 2 Counterfactual Repair & Physical Self-Correction Adversarial Stress (Challenger M2_1)', () => {

  // ─────────────────────────────────────────────────────────────────────────────
  // ATTACK VECTOR 1: Multi-Deficit Concurrent Stress (11 Simultaneous Deficits)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Attack Vector 1: Multi-Deficit Concurrent Stress (11 Simultaneous Deficits)', () => {
    it('synthesizes deterministic proofs for 11 concurrent physical deficits simultaneously', () => {
      const multiDeficitEval = {
        customerDisposition: 'DELIVERY_BLOCKED_UNBUILDABLE',
        serverCount: 4,
        evalSummary: {
          power: {
            hasZeroPsus: true,
            psuCount: 0,
            estimatedNodeWattage: 950
          },
          compute: {
            cpuCount: 8,
            maxCpuTdpWatts: 385,
            needsHeatsink: true,
            needsDirectLiquidCooling: true,
            fanKitUnderPopulated: true
          },
          memory: {
            cpuCount: 8,
            memoryCount: 7,
            channelWidth: 8,
            isBalancedChannel: false
          },
          storage: {
            needsCableKit: true,
            hasSmartBattery: false,
            hasStorageController: true
          },
          pcie: {
            gpuCount: 4,
            gpuPowerCableKitCount: 0,
            needsGpuPowerCableKit: true,
            isExceedingActiveSlots: true,
            needsSecondaryRiser: true,
            requiredPcieCards: 4,
            activeSlotsAvailable: 2
          },
          support: {
            hasSupportService: false
          }
        },
        selfCorrectionTrail: [
          { contestedResourceType: 'OCP_3_0_SLOTS', detectedFailure: 'OCP slot 1 collision' }
        ]
      };

      const proofs = generateCounterfactualRepairProofs(multiDeficitEval, { serverCount: 4 });

      assert.equal(proofs.length, 11, 'Must synthesize exactly 11 concurrent repair proofs');

      const expectedTypes = [
        'POWER_PSU_MISSING',
        'THERMAL_HEATSINK_MISSING',
        'THERMAL_DLC_MANDATED',
        'THERMAL_FANS_UNDERPOPULATED',
        'MEMORY_UNBALANCED_CHANNELS',
        'STORAGE_CABLE_KIT_MISSING',
        'STORAGE_BATTERY_MISSING',
        'GPU_POWER_CABLE_MISSING',
        'PCIE_SECONDARY_RISER_MISSING',
        'CONTESTED_RESOURCE_COLLISION',
        'SUPPORT_SERVICE_MISSING'
      ];

      for (const expectedType of expectedTypes) {
        const found = proofs.find(p => p.issueType === expectedType);
        assert.ok(found, `Must include proof for ${expectedType}`);
        assert.ok(found.rootCause, `${expectedType} must specify a root cause`);
        assert.ok(found.mathematicalProof, `${expectedType} must provide mathematical proof`);
        assert.equal(found.resultingStatus, '100% BUILDABLE');
      }
    });

    it('validates all hardware deltas contain non-empty SKUs, valid actions, and positive quantities', () => {
      const multiDeficitEval = {
        customerDisposition: 'DELIVERY_BLOCKED_UNBUILDABLE',
        evalSummary: {
          power: { hasZeroPsus: true, psuCount: 0 },
          compute: { cpuCount: 2, maxCpuTdpWatts: 300, needsHeatsink: true, fanKitUnderPopulated: true },
          memory: { cpuCount: 2, memoryCount: 3, channelWidth: 8, isBalancedChannel: false },
          storage: { needsCableKit: true, hasSmartBattery: false, hasStorageController: true },
          pcie: { gpuCount: 2, needsGpuPowerCableKit: true, needsPrimaryRiser: true },
          support: { hasSupportService: false }
        },
        selfCorrectionTrail: [
          { contestedResourceType: 'OCP_3_0_SLOTS', detectedFailure: 'OCP slot 1 collision' }
        ]
      };

      const proofs = generateCounterfactualRepairProofs(multiDeficitEval, { serverCount: 1 });
      const validActions = new Set(['ADD', 'SUBSTITUTE', 'REMOVE']);
      const skuPattern = /^[A-Z0-9]{5,8}(-[A-Z0-9]{3})?$/;

      for (const proof of proofs) {
        assert.ok(proof.requiredHardwareDeltas.length > 0, `${proof.issueType} must have non-empty deltas`);
        for (const delta of proof.requiredHardwareDeltas) {
          assert.ok(validActions.has(delta.action), `Delta action '${delta.action}' must be valid`);
          assert.ok(typeof delta.sku === 'string' && delta.sku.length > 0, `Delta SKU must be non-empty string in ${proof.issueType}`);
          assert.ok(skuPattern.test(delta.sku), `Delta SKU '${delta.sku}' must match HPE SKU pattern in ${proof.issueType}`);
          assert.ok(typeof delta.description === 'string' && delta.description.length > 0, `Delta description required in ${proof.issueType}`);
          assert.ok(Number.isInteger(delta.quantity) && delta.quantity > 0, `Delta quantity (${delta.quantity}) must be positive integer`);
        }
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ATTACK VECTOR 2: Cluster Multiplier Scaling (1, 2, 4, 8, 16, 64 Nodes)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Attack Vector 2: Cluster Multiplier Scaling Across Topologies', () => {
    const clusterSizes = [1, 2, 4, 8, 16, 64];

    for (const size of clusterSizes) {
      it(`scales hardware quantities deterministically for ${size}-node cluster`, () => {
        const evalResults = {
          customerDisposition: 'DELIVERY_BLOCKED_UNBUILDABLE',
          evalSummary: {
            power: { hasZeroPsus: true, psuCount: 0, estimatedNodeWattage: 800 },
            compute: { cpuCount: size * 2, maxCpuTdpWatts: 200, needsHeatsink: true, fanKitUnderPopulated: true },
            support: { hasSupportService: false }
          }
        };

        const proofs = generateCounterfactualRepairProofs(evalResults, { serverCount: size });

        const psuProof = proofs.find(p => p.issueType === 'POWER_PSU_MISSING');
        assert.ok(psuProof);
        assert.equal(psuProof.requiredHardwareDeltas[0].quantity, size * 2, `PSUs must be 2 per node (${size * 2})`);

        const fanProof = proofs.find(p => p.issueType === 'THERMAL_FANS_UNDERPOPULATED');
        assert.ok(fanProof);
        assert.equal(fanProof.requiredHardwareDeltas[0].quantity, size, `Fan kits must be 1 per server node (${size})`);

        const supportProof = proofs.find(p => p.issueType === 'SUPPORT_SERVICE_MISSING');
        assert.ok(supportProof);
        assert.equal(supportProof.requiredHardwareDeltas[0].quantity, size, `Support contracts must be 1 per node (${size})`);

        const heatsinkProof = proofs.find(p => p.issueType === 'THERMAL_HEATSINK_MISSING');
        assert.ok(heatsinkProof);
        assert.equal(heatsinkProof.requiredHardwareDeltas[0].quantity, size * 2, `Heatsinks must cover all ${size * 2} sockets`);
      });
    }

    it('falls back safely to serverCount = 1 when serverCount is zero, negative, or undefined', () => {
      const boundaryCounts = [0, -1, -99, undefined, NaN];

      for (const count of boundaryCounts) {
        const evalResults = {
          evalSummary: {
            power: { hasZeroPsus: true, psuCount: 0 },
            support: { hasSupportService: false }
          }
        };

        const proofs = generateCounterfactualRepairProofs(evalResults, { serverCount: count });
        const psuProof = proofs.find(p => p.issueType === 'POWER_PSU_MISSING');
        assert.equal(psuProof.requiredHardwareDeltas[0].quantity, 2, `Quantity must default to 2 for count=${count}`);

        const supportProof = proofs.find(p => p.issueType === 'SUPPORT_SERVICE_MISSING');
        assert.equal(supportProof.requiredHardwareDeltas[0].quantity, 1, `Support quantity must default to 1 for count=${count}`);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ATTACK VECTOR 3: Zero-Defect and Boundary Mining
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Attack Vector 3: Zero-Defect Invariants and Boundary Mining', () => {
    it('produces exactly 0 repair proofs for a 100% buildable, zero-defect configuration', () => {
      const cleanEval = {
        customerDisposition: 'READY_FOR_PRESENTATION',
        serverCount: 2,
        evalSummary: {
          power: { psuCount: 4, hasZeroPsus: false, estimatedNodeWattage: 600, maxPsuWattage: 1600, hasPsuWattageDeficit: false, hasPsuHeadroomDeficit: false },
          compute: { cpuCount: 4, maxCpuTdpWatts: 185, needsHeatsink: false, needsDirectLiquidCooling: false, fanKitUnderPopulated: false, hasHighPerfFans: true },
          memory: { cpuCount: 4, memoryCount: 32, channelWidth: 8, isBalancedChannel: true, needsMemory: false },
          storage: { needsCableKit: false, hasSmartBattery: true, hasStorageController: true },
          pcie: { gpuCount: 0, needsGpuPowerCableKit: false, isExceedingActiveSlots: false, needsSecondaryRiser: false },
          support: { hasSupportService: true, needsSupportService: false }
        },
        errors: [],
        acceptanceGate: { blockersCount: 0, blockers: [] }
      };

      const proofs = generateCounterfactualRepairProofs(cleanEval, { serverCount: 2 });
      assert.equal(proofs.length, 0, 'Zero-defect configuration must yield 0 repair proofs');
    });

    it('handles empty evaluation object without throwing and returns 0 proofs', () => {
      const proofs = generateCounterfactualRepairProofs({});
      assert.equal(proofs.length, 0);
    });

    it('handles undefined evalResults and options without throwing and returns 0 proofs', () => {
      const proofs = generateCounterfactualRepairProofs(undefined, undefined);
      assert.equal(proofs.length, 0);
    });

    it('extracts residual acceptance blockers when no physical aspect deficits exist', () => {
      const blockerEval = {
        customerDisposition: 'DELIVERY_BLOCKED_UNBUILDABLE',
        evalSummary: {},
        acceptanceGate: {
          blockersCount: 1,
          blockers: [{ id: 'B16', detail: 'Customer SKU P10115-B21 unmatched in catalog' }]
        }
      };

      const proofs = generateCounterfactualRepairProofs(blockerEval);
      assert.equal(proofs.length, 1);
      assert.equal(proofs[0].issueType, 'BLOCKER_B16');
      assert.equal(proofs[0].requiredHardwareDeltas[0].sku, 'P10115-B21');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ATTACK VECTOR 4: Extreme Multi-Contention Resource Arbitration
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Attack Vector 4: Extreme Multi-Contention Resource Arbitration', () => {
    it('arbitrates extreme configuration with 8 concurrent contentions and produces sequential steps', () => {
      const extremeItems = [
        { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF NC CTO Server', quantity: 1 },
        { sku: 'P67088-B21', description: 'Intel Xeon-Platinum 8592+ 2.0GHz 64-core 350W Processor', quantity: 2 },
        { sku: 'P00424-B21', description: 'HPE 32GB 2Rx4 PC4-3200AA-R Smart Memory Kit', quantity: 4 },
        { sku: 'P64707-F21', description: 'HPE 64GB DDR5-5600 Registered Smart Memory', quantity: 4 },
        { sku: 'P26262-B21', description: 'Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 Adapter for HPE', quantity: 4 },
        { sku: 'P58335-B21', description: 'HPE MR408i-o Gen11 x8 Lanes 4GB Cache OCP SPDM Storage Controller', quantity: 1 },
        { sku: 'P10115-B21', description: 'Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter for HPE', quantity: 2 },
        { sku: 'P48183-B21', description: 'HPE NS204i-u Gen11 NVMe Hot Plug Boot Optimized Storage Device', quantity: 1 },
        { sku: 'P48813-B21', description: 'HPE ProLiant DL380 Gen11 2SFF Rear Drive Cage Kit', quantity: 1 },
        { sku: 'P38995-B21', description: 'HPE 800W Flex Slot Platinum Hot Plug Low Halogen Power Supply', quantity: 2 }
      ];

      const extremeEvalResults = {
        useNumericStep: true,
        aspectChecks: {
          computeThermal: { maxCpuTdpWatts: 350, needsDirectLiquidCooling: true },
          memoryChannel: { hasMixedDdrGeneration: true, isBalancedChannel: false },
          pcieRiser: { isExceedingActiveSlots: true, activeSlotsAvailable: 2, requiredPcieCards: 4, needsSecondaryRiser: true },
          powerEnvironment: { hasPsuWattageDeficit: true, hasPsuHeadroomDeficit: true, estimatedPeakWatts: 2400, activePsuWattage: 800 },
          storageTriMode: { needsCableKit: true, needsSasExpander: true, driveCount: 16 },
          supportManufacturing: { hasCtoServer: true, hasManagementLicense: false },
          networkingOcp: { maxOcpSlots: 2 }
        },
        missingDependencies: [
          { key: 'SECONDARY_RISER_CABLE_KIT' },
          { key: 'SAS_EXPANDER_CARD' }
        ]
      };

      const res = arbitrateContestedResources(extremeItems, extremeEvalResults, { gen: 'Gen11' });

      assert.equal(res.hasContentions, true);
      assert.equal(res.contentionsCount, 8, 'Must detect 8 distinct physical contentions');
      assert.equal(res.selfCorrectionTrail.length, 8, 'Must emit 8 self-correction trail entries');

      const expectedTypes = [
        'OCP_3_0_SLOTS',
        'REAR_CHASSIS_BAY_SPACE',
        'THERMAL_COOLING_ENVELOPE',
        'MEMORY_BUS_ARCHITECTURE',
        'PCIE_EXPANSION_LANES',
        'POWER_ENVELOPE_CAPACITY',
        'STORAGE_CABLING_AND_EXPANSION',
        'MANDATORY_CTO_MANAGEMENT_LICENSE'
      ];

      for (let i = 0; i < res.selfCorrectionTrail.length; i++) {
        const item = res.selfCorrectionTrail[i];
        assert.equal(item.step, i + 1, `Trail step must be sequentially numbered (${i + 1})`);
        assert.equal(item.contestedResourceType, expectedTypes[i]);
        assert.ok(item.hypothesis, `Item ${i + 1} must have a non-empty hypothesis`);
        assert.ok(item.detectedFailure, `Item ${i + 1} must specify detectedFailure`);
        assert.ok(item.backtrackedFrom, `Item ${i + 1} must state backtrackedFrom baseline`);
        assert.ok(item.selfCorrectionAction, `Item ${i + 1} must have selfCorrectionAction`);
        assert.ok(item.resolutionDetails, `Item ${i + 1} must have resolutionDetails`);
        assert.equal(item.verifiedBuildable, true);
      }
    });

    it('handles legacy call without useNumericStep by preserving backward compatibility', () => {
      const items = [
        { sku: 'P58335-B21', description: 'HPE MR408i-o Gen11 x8 Lanes 4GB Cache OCP SPDM Storage Controller', quantity: 1 },
        { sku: 'P10115-B21', description: 'Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter for HPE', quantity: 2 },
        { sku: 'P67088-B21', description: 'Intel Xeon-Platinum 8592+ 2.0GHz 64-core 350W Processor', quantity: 2 }
      ];
      const res = arbitrateContestedResources(items, {}, { gen: 'Gen11' });

      assert.ok(res.selfCorrectionTrail.length >= 2);
      const ocpTrail = res.selfCorrectionTrail.find(t => t.contestedResourceType === 'OCP_3_0_SLOTS');
      assert.ok(ocpTrail);
      assert.equal(ocpTrail.step, 'CONTESTED_RESOURCE_ARBITRATION', 'Legacy trail preserves string step name');
    });

    it('handles missing/partial aspect data gracefully without throwing', () => {
      const partialAspects = [
        { aspectChecks: null },
        { aspectChecks: {} },
        { aspectChecks: { powerEnvironment: null } },
        { aspectChecks: { computeThermal: { needsDirectLiquidCooling: true } } },
        { aspectChecks: { memoryChannel: { hasMixedDdrGeneration: true } } }
      ];

      for (const partial of partialAspects) {
        assert.doesNotThrow(() => {
          const res = arbitrateContestedResources([], partial, { gen: 'Gen11' });
          assert.ok(typeof res === 'object');
        });
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ATTACK VECTOR 5: Adversarial Discovered Flaws & Vulnerability Benchmarks (Remediated)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Attack Vector 5: Discovered Flaws & Vulnerability Benchmarks', () => {
    it('CHALLENGE FINDING 1: REAR_CHASSIS_BAY_SPACE correctly resolves to Branch C when OCP contention exists', () => {
      const items = [
        // OCP Contention:
        { sku: 'P58335-B21', description: 'HPE MR408i-o Gen11 x8 Lanes 4GB Cache OCP SPDM Storage Controller', quantity: 1 },
        { sku: 'P10115-B21', description: 'Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter for HPE', quantity: 2 },
        // Rear Bay Contention:
        { sku: 'P48183-B21', description: 'HPE NS204i-u Gen11 NVMe Hot Plug Boot Optimized Storage Device', quantity: 1 },
        { sku: 'P48813-B21', description: 'HPE ProLiant DL380 Gen11 2SFF Rear Drive Cage Kit', quantity: 1 }
      ];

      const res = arbitrateContestedResources(items, { useNumericStep: true }, { gen: 'Gen11' });
      const rearBayTrail = res.selfCorrectionTrail.find(t => t.contestedResourceType === 'REAR_CHASSIS_BAY_SPACE');
      assert.ok(rearBayTrail, 'Must detect REAR_CHASSIS_BAY_SPACE');

      // Patched system correctly links to Branch C (Standup PCIe OS Boot Device)
      assert.ok(
        rearBayTrail.selfCorrectionAction.includes('Branch C') || rearBayTrail.selfCorrectionAction.includes('PCIe'),
        'REAR_CHASSIS_BAY_SPACE correctly links to Branch C (Standup PCIe OS Boot Device) with branchId'
      );
    });

    it('CHALLENGE FINDING 2: hasManagementLicense does not create false-positive contention when items list is empty', () => {
      const res = arbitrateContestedResources(
        [],
        {
          useNumericStep: true,
          aspectChecks: {
            supportManufacturing: { hasCtoServer: true, hasManagementLicense: true }
          }
        },
        { gen: 'Gen11' }
      );

      const licenseContention = res.contentions.find(c => c.resourceType === 'MANDATORY_CTO_MANAGEMENT_LICENSE');
      assert.equal(
        licenseContention,
        undefined,
        'No false contention generated when hasManagementLicense is explicitly true'
      );
    });

    it('CHALLENGE FINDING 3: null items parameter is handled safely without throwing', () => {
      assert.doesNotThrow(() => {
        arbitrateContestedResources(null, {}, {});
      }, 'Null items parameter handled safely by array guard');
    });

    it('CHALLENGE FINDING 4: null evalResults is handled safely without throwing', () => {
      assert.doesNotThrow(() => {
        generateCounterfactualRepairProofs(null, {});
      }, 'Null evalResults handled safely by null guard');
    });

    it('CHALLENGE FINDING 5: null options is handled safely without throwing', () => {
      assert.doesNotThrow(() => {
        generateCounterfactualRepairProofs({}, null);
      }, 'Null options handled safely by null guard');
    });
  });

});
