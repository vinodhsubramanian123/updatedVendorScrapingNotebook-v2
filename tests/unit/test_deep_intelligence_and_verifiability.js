'use strict';
/**
 * tests/unit/test_deep_intelligence_and_verifiability.js
 *
 * Comprehensive Dual Positive & Negative Verification Matrix:
 * 1. Dynamic Phase 9 & Phase 3 Terminal Status Integrity (INV-131)
 * 2. In-Flight NLM Auth Auto-Healing & MCP Refresh Integration (INV-157)
 * 3. Self-Correction & Counterfactual Backtracking Ledger
 * 4. Shared Infrastructure Partitioning in Multi-Cluster Tenders
 * 5. Architectural Capability Downgrade Penalties in Strategy Ranking
 * 6. Gate B19: Live Portal Validation & Cryptographic Receipt Binding
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { performReasoningPostAnalysis } = require('../../scripts/lib/system/reasoning_post_analyzer.js');
const { arbitrateContestedResources } = require('../../scripts/lib/conflict/resource_arbitrator.js');
const {
  analyzeAndPartitionClusters,
  isSharedInfrastructureItem
} = require('../../scripts/lib/boq/multi_cluster_splitter.js');
const {
  scoreAndSortCandidates,
  computeCapabilityDowngradePenalty
} = require('../../scripts/lib/conflict/strategy_synthesizer.js');
const { validateBoqEvaluationCriteria } = require('../../scripts/lib/boq/bom_verifier.js');

describe('Deep Intelligence, Web Verifiability & Self-Correction Matrix', () => {

  describe('1. Dynamic Phase 9 & Phase 3 Terminal Status Integrity (INV-131)', () => {
    it('Positive Control: Clean buildable solution completes Phase 3 / Phase 9 as PASSED', () => {
      const responseData = {
        status: 'PASSED',
        targetSku: 'P52534-B21',
        chassis: 'DL380_Gen12',
        isMathClean: true,
        aspectChecks: [{ id: 'STORAGE', status: 'PASS' }],
        acceptanceGate: { isValid: true, status: 'PASSED', blockersCount: 0 }
      };

      const analysis = performReasoningPostAnalysis({
        queryText: 'Evaluate DL380 Gen12 buildable config',
        context: { persistLedger: false },
        classification: { intent: 'BOQ_EVALUATION', confidence: 0.98 },
        responseData
      });

      assert.equal(analysis.acceptanceGate.status, 'PASSED');
      assert.equal(analysis.acceptanceGate.isValid, true);
    });

    it('Negative Test: Unbuildable solution with failed acceptance does NOT default to PASSED (INV-131)', () => {
      const responseData = {
        status: 'FAILED',
        targetSku: 'P52534-B21',
        chassis: 'DL380_Gen12',
        isMathClean: false,
        errors: ['Thermal threshold exceeded by 120W'],
        acceptanceGate: { isValid: false, status: 'FAILED', blockersCount: 1 }
      };

      const analysis = performReasoningPostAnalysis({
        queryText: 'Evaluate DL380 Gen12 broken config',
        context: { persistLedger: false },
        classification: { intent: 'BOQ_EVALUATION', confidence: 0.95 },
        responseData
      });

      assert.equal(analysis.acceptanceGate.isValid, false);
      assert.equal(analysis.acceptanceGate.status, 'FAILED');
      assert.equal(analysis.acceptanceGate.blockersCount, 1);
    });
  });

  describe('2. Autonomous Self-Correction & Counterfactual Backtracking Ledger', () => {
    it('Positive Control: Contested OCP resource arbitration creates structured selfCorrectionTrail', () => {
      const contestedItems = [
        { sku: 'P58335-B21', description: 'HPE MR408i-o Gen11 x8 Lanes OCP SPDM Storage Controller', quantity: 1 },
        { sku: 'P22702-B21', description: 'Intel E810-XXVDA2 Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter', quantity: 1 },
        { sku: 'P08449-B21', description: 'Intel I350-T4 Ethernet 1Gb 4-port BASE-T OCP3 Adapter', quantity: 1 }
      ];

      const result = arbitrateContestedResources(
        contestedItems,
        { aspectChecks: { networkingOcp: { maxOcpSlots: 2 } } },
        { gen: 'Gen11' }
      );

      assert.equal(result.hasContentions, true);
      assert.ok(Array.isArray(result.selfCorrectionTrail));
      assert.ok(result.selfCorrectionTrail.length > 0);

      const trail = result.selfCorrectionTrail[0];
      assert.equal(trail.step, 'CONTESTED_RESOURCE_ARBITRATION');
      assert.ok(trail.detectedFailure.includes('OCP 3.0 capacity exceeded'));
      assert.ok(trail.selfCorrectionAction.includes('Branch A'));
      assert.equal(trail.verifiedBuildable, true);
    });

    it('Positive Control: Reasoning Post-Analyzer attaches selfCorrectionTrail to narrative', () => {
      const responseData = {
        status: 'PASSED',
        chassis: 'DL380_Gen11',
        selfCorrectionTrail: [
          {
            step: 'CONTESTED_RESOURCE_ARBITRATION',
            selfCorrectionAction: 'Branch A: OCP Storage Controller Baseline',
            resolutionDetails: 'Pivoted contested adapter'
          }
        ],
        acceptanceGate: { isValid: true, status: 'PASSED', blockersCount: 0 }
      };

      const analysis = performReasoningPostAnalysis({
        queryText: 'Evaluate contested OCP server',
        context: { persistLedger: false },
        classification: { intent: 'BOQ_EVALUATION', confidence: 0.95 },
        responseData
      });

      assert.ok(Array.isArray(analysis.selfCorrectionTrail));
      assert.equal(analysis.selfCorrectionTrail.length, 1);
      const narrativeHasSelfCorrection = analysis.reasoningNarrative.some(n =>
        n.includes('6. Autonomous Self-Correction & Backtracking')
      );
      assert.equal(narrativeHasSelfCorrection, true);
    });

    it('Positive Control: Resolves nested conflictGraph.arbitrationResults.selfCorrectionTrail and string chassis keys', () => {
      const contestedItems = [
        { sku: 'P58335-B21', description: 'HPE MR408i-o Gen11 x8 Lanes OCP SPDM Storage Controller', quantity: 1 },
        { sku: 'P22702-B21', description: 'Intel E810-XXVDA2 Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter', quantity: 1 },
        { sku: 'P08449-B21', description: 'Intel I350-T4 Ethernet 1Gb 4-port BASE-T OCP3 Adapter', quantity: 1 }
      ];
      const strChassisArb = arbitrateContestedResources(contestedItems, 'DL380_Gen12');
      assert.equal(strChassisArb.hasContentions, true);
      assert.ok(strChassisArb.selfCorrectionTrail.length > 0);

      const responseData = {
        status: 'PASSED',
        chassis: 'DL380_Gen12',
        conflictGraph: {
          arbitrationResults: strChassisArb
        },
        acceptanceGate: { isValid: true, status: 'PASSED', blockersCount: 0 }
      };

      const analysis = performReasoningPostAnalysis({
        queryText: 'Evaluate nested conflictGraph arbitration',
        context: { persistLedger: false },
        classification: { intent: 'BOQ_EVALUATION', confidence: 0.99 },
        responseData
      });

      assert.equal(analysis.selfCorrectionTrail.length, 1);
      assert.ok(analysis.reasoningNarrative.some(n => n.includes('6. Autonomous Self-Correction & Backtracking')));
    });
  });

  describe('3. Shared Datacenter Infrastructure Partitioning', () => {
    it('Positive Control: Identifies 42U Enterprise Racks and PDUs as shared infrastructure', () => {
      const rackItem = { sku: 'BW904A', description: 'HPE 42U 600mmx1075mm G2 Enterprise Shock Rack', quantity: 1 };
      const pduItem = { sku: 'P9Q39A', description: 'HPE G2 Monitored Modular 32A/230V Single Phase PDU', quantity: 2 };
      const serverItem = { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 SFF CTO Server', quantity: 4 };

      assert.equal(isSharedInfrastructureItem(rackItem), true);
      assert.equal(isSharedInfrastructureItem(pduItem), true);
      assert.equal(isSharedInfrastructureItem(serverItem), false);
    });

    it('Positive Control: Multi-cluster tender conserves shared rack/PDU without dividing into node pieces', () => {
      const rawTenderItems = [
        { sku: 'BW904A', description: 'HPE 42U 600mmx1075mm G2 Enterprise Shock Rack', quantity: 1, category: 'Rack' },
        { sku: 'P9Q39A', description: 'HPE G2 Monitored Modular 32A/230V PDU', quantity: 2, category: 'Power' },
        { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 CTO Chassis', quantity: 4, category: 'Base Chassis' },
        { sku: 'P49614-B21', description: 'Intel Xeon-G 6430 2.1GHz 32-core 270W Processor', quantity: 4, category: 'Processor' },
        { sku: 'P49618-B21', description: 'Intel Xeon-P 8462Y+ 2.8GHz 32-core 300W Processor', quantity: 4, category: 'Processor' }
      ];

      const partition = analyzeAndPartitionClusters(rawTenderItems);

      assert.equal(partition.isMultiCluster, true);
      assert.ok(Array.isArray(partition.sharedInfrastructure));
      assert.equal(partition.sharedInfrastructure.length, 2);

      const rackAlloc = partition.sharedInfrastructure.find(i => i.sku === 'BW904A');
      assert.ok(rackAlloc);
      assert.equal(rackAlloc.quantity, 1);

      // Verify that quantity conservation passes cleanly with shared infrastructure conserved
      assert.ok(partition.quantityConservation);
      assert.equal(partition.quantityConservation.isFullyConserved, true);
      assert.equal(partition.quantityConservation.totalDiscrepancies, 0);
    });
  });

  describe('4. Architectural Capability Downgrade Penalties in Strategy Ranking', () => {
    it('Positive Control: Candidate preserving 8GB cache is ranked ahead of candidate downgrading to 4GB cache', () => {
      const requestedItems = [
        { sku: 'P47777-B21', description: 'HPE MR416i-p Gen11 x16 Lanes 8GB Cache PCI Storage Controller', quantity: 1, category: 'Storage Controller' }
      ];

      const candPreserved = {
        name: 'Preserved_8GB_Candidate',
        score: 0.90,
        physicalMathClean: true,
        skuPartsList: [
          { sku: 'P47777-B21', description: 'HPE MR416i-p Gen11 x16 Lanes 8GB Cache PCI Storage Controller', quantity: 1, category: 'Storage Controller' }
        ]
      };

      const candDowngraded = {
        name: 'Downgraded_4GB_Candidate',
        score: 0.90,
        physicalMathClean: true,
        skuPartsList: [
          { sku: 'P58335-B21', description: 'HPE MR408i-o Gen11 x8 Lanes 4GB Cache OCP Storage Controller', quantity: 1, category: 'Storage Controller' }
        ]
      };

      const penaltyPreserved = computeCapabilityDowngradePenalty(candPreserved, requestedItems);
      const penaltyDowngraded = computeCapabilityDowngradePenalty(candDowngraded, requestedItems);

      assert.equal(penaltyPreserved, 0);
      assert.ok(penaltyDowngraded > 0);

      const candidates = [candDowngraded, candPreserved];
      scoreAndSortCandidates(candidates, requestedItems);

      // Preserved candidate must be sorted first (Rank 1) due to 0 capability downgrade penalty
      assert.equal(candidates[0].name, 'Preserved_8GB_Candidate');
    });

    it('Negative Test: Permuting candidate order yields deterministic ranking', () => {
      const requestedItems = [
        { sku: 'P47777-B21', description: 'HPE MR416i-p 8GB Cache Storage Controller', quantity: 1, category: 'Storage Controller' }
      ];

      const candA = {
        name: 'Candidate_A_Preserved',
        score: 0.85,
        physicalMathClean: true,
        skuPartsList: [{ sku: 'P47777-B21', description: 'HPE MR416i-p 8GB Cache Controller', quantity: 1 }]
      };
      const candB = {
        name: 'Candidate_B_Downgraded',
        score: 0.85,
        physicalMathClean: true,
        skuPartsList: [{ sku: 'P58335-B21', description: 'HPE MR408i-o 4GB Cache Controller', quantity: 1 }]
      };

      const order1 = [candA, candB];
      scoreAndSortCandidates(order1, requestedItems);

      const order2 = [candB, candA];
      scoreAndSortCandidates(order2, requestedItems);

      assert.equal(order1[0].name, order2[0].name);
      assert.equal(order1[0].name, 'Candidate_A_Preserved');
    });

    it('Positive Control: Penalizes CPU Platinum -> Silver and DDR5 -> DDR4 downgrades', () => {
      const requested = [
        { sku: 'P49618-B21', description: 'Intel Xeon-P 8462Y+ 32-core Platinum Processor', quantity: 2 },
        { sku: 'P43328-B21', description: 'HPE 32GB 1Rx4 PC5-4800B-R Smart Memory DDR5', quantity: 16 }
      ];

      const candDowngraded = {
        name: 'Downgraded_Candidate',
        skuPartsList: [
          { sku: 'P49610-B21', description: 'Intel Xeon-S 4410Y 12-core Silver Processor', quantity: 2 },
          { sku: 'P06031-B21', description: 'HPE 32GB 2Rx4 PC4-2933Y-R Smart Memory DDR4', quantity: 16 }
        ]
      };

      const penalty = computeCapabilityDowngradePenalty(candDowngraded, requested);
      // CPU Platinum -> Silver (+5.0) + DDR5 -> DDR4 (+6.0) = 11.0
      assert.ok(penalty >= 11.0);
    });

    it('Positive Control: Penalizes GPU H100 -> L4 accelerator downgrade', () => {
      const requested = [
        { sku: 'S0G80A', description: 'NVIDIA H100 80GB PCIe Accelerator', quantity: 2 }
      ];

      const candDowngraded = {
        name: 'Downgraded_GPU_Candidate',
        skuPartsList: [
          { sku: 'S0K89A', description: 'NVIDIA L4 24GB PCIe Accelerator', quantity: 2 }
        ]
      };

      const penalty = computeCapabilityDowngradePenalty(candDowngraded, requested);
      assert.ok(penalty >= 5.0);
    });
  });

  describe('5. Gate B19: Live Portal Validation & Cryptographic Receipt Binding', () => {
    it('Positive Control: Honest PORTAL_VALIDATION_PENDING status evaluates to NOT_APPLICABLE (WARN)', () => {
      const boqOutput = {
        portalValidationStatus: 'PORTAL_VALIDATION_PENDING',
        aspectChecks: [
          { aspectId: 'COMPUTE_TOPOLOGY', status: 'PASS' },
          { aspectId: 'MEMORY_POPULATION', status: 'PASS' },
          { aspectId: 'THERMAL_ENVELOPE', status: 'PASS' },
          { aspectId: 'POWER_LOAD', status: 'PASS' },
          { aspectId: 'PCIE_BUS_LANES', status: 'PASS' },
          { aspectId: 'STORAGE_CONTROLLER_PAIR', status: 'PASS' },
          { aspectId: 'CHASSIS_OPTIONS', status: 'PASS' }
        ],
        rankedSolutions: [{ rank: 1, score: 0.95 }],
        financialPricing: { subtotalUsd: 15000 },
        items: [{ sku: 'P52534-B21', quantity: 1 }]
      };

      const checks = validateBoqEvaluationCriteria(boqOutput, {
        catalogData: {
          'P52534-B21': { name: 'DL380 Gen11 CTO' },
          'P49614-B21': { name: 'Intel Xeon-G 6430' }
        }
      });

      const gateB19 = checks.find(c => c.id === 'B19');
      assert.ok(gateB19);
      assert.equal(gateB19.status, 'NOT_APPLICABLE');
      assert.equal(gateB19.passed, true);
    });

    it('Negative Test: Claiming ACCEPTED_BY_VENDOR without session receipt FAILS Gate B19 (INV-0 / INV-104)', () => {
      const boqOutput = {
        portalValidationStatus: 'ACCEPTED_BY_VENDOR', // Unverified claim!
        aspectChecks: [
          { aspectId: 'COMPUTE_TOPOLOGY', status: 'PASS' },
          { aspectId: 'MEMORY_POPULATION', status: 'PASS' },
          { aspectId: 'THERMAL_ENVELOPE', status: 'PASS' },
          { aspectId: 'POWER_LOAD', status: 'PASS' },
          { aspectId: 'PCIE_BUS_LANES', status: 'PASS' },
          { aspectId: 'STORAGE_CONTROLLER_PAIR', status: 'PASS' },
          { aspectId: 'CHASSIS_OPTIONS', status: 'PASS' }
        ],
        items: [{ sku: 'P52534-B21', quantity: 1 }]
      };

      const checks = validateBoqEvaluationCriteria(boqOutput, {
        catalogData: { 'P52534-B21': { name: 'DL380 Gen11 CTO' } }
      });

      const gateB19 = checks.find(c => c.id === 'B19');
      assert.ok(gateB19);
      assert.equal(gateB19.status, 'FAILED');
      assert.equal(gateB19.passed, false);
      assert.ok(gateB19.detail.includes('lacks official session receipt'));
    });

    it('Negative Test: Claiming ACCEPTED_BY_VENDOR with non-existent receipt file path FAILS Gate B19', () => {
      const boqOutput = {
        portalValidationStatus: 'ACCEPTED_BY_VENDOR',
        sessionReceiptPath: path.join(__dirname, 'non_existent_session_receipt_12345.json'),
        aspectChecks: [
          { aspectId: 'COMPUTE_TOPOLOGY', status: 'PASS' }
        ],
        items: [{ sku: 'P52534-B21', quantity: 1 }]
      };

      const checks = validateBoqEvaluationCriteria(boqOutput, {
        catalogData: { 'P52534-B21': { name: 'DL380 Gen11 CTO' } }
      });

      const gateB19 = checks.find(c => c.id === 'B19');
      assert.ok(gateB19);
      assert.equal(gateB19.status, 'FAILED');
      assert.equal(gateB19.passed, false);
      assert.ok(gateB19.detail.includes('does not exist on disk'));
    });

    it('Negative Test: Claiming CLIC_ACCEPTED with empty receipt object FAILS Gate B19', () => {
      const boqOutput = {
        portalValidationStatus: 'CLIC_ACCEPTED',
        sessionReceipt: {},
        aspectChecks: [
          { aspectId: 'COMPUTE_TOPOLOGY', status: 'PASS' }
        ],
        items: [{ sku: 'P52534-B21', quantity: 1 }]
      };

      const checks = validateBoqEvaluationCriteria(boqOutput, {
        catalogData: { 'P52534-B21': { name: 'DL380 Gen11 CTO' } }
      });

      const gateB19 = checks.find(c => c.id === 'B19');
      assert.ok(gateB19);
      assert.equal(gateB19.status, 'FAILED');
      assert.equal(gateB19.passed, false);
      assert.ok(gateB19.detail.includes('empty or missing required verification fields'));
    });

    it('Positive Control: Claiming ACCEPTED_BY_VENDOR WITH verified session receipt PASSES Gate B19', () => {
      const boqOutput = {
        portalValidationStatus: 'ACCEPTED_BY_VENDOR',
        sessionReceipt: {
          sessionId: 'OCA-SESS-98231',
          validatedAt: '2026-10-24T18:00:00Z',
          manifestSha256: 'a1b2c3d4e5f67890...'
        },
        aspectChecks: [
          { aspectId: 'COMPUTE_TOPOLOGY', status: 'PASS' },
          { aspectId: 'MEMORY_POPULATION', status: 'PASS' },
          { aspectId: 'THERMAL_ENVELOPE', status: 'PASS' },
          { aspectId: 'POWER_LOAD', status: 'PASS' },
          { aspectId: 'PCIE_BUS_LANES', status: 'PASS' },
          { aspectId: 'STORAGE_CONTROLLER_PAIR', status: 'PASS' },
          { aspectId: 'CHASSIS_OPTIONS', status: 'PASS' }
        ],
        items: [{ sku: 'P52534-B21', quantity: 1 }]
      };

      const checks = validateBoqEvaluationCriteria(boqOutput, {
        catalogData: { 'P52534-B21': { name: 'DL380 Gen11 CTO' } }
      });

      const gateB19 = checks.find(c => c.id === 'B19');
      assert.ok(gateB19);
      assert.equal(gateB19.status, 'PASSED');
      assert.equal(gateB19.passed, true);
    });
  });

  describe('6. In-Flight NLM Auth Diagnostics & Auto-Healing Integration (INV-157)', () => {
    it('Positive Control: diagnoseNotebookFailure correctly classifies 401/UNAUTHENTICATED as AUTH_EXPIRED', () => {
      const { diagnoseNotebookFailure } = require('../../scripts/lib/notebook/query_diagnostics.js');
      const err = new Error('HTTP 401 UNAUTHENTICATED: OAuth access token has expired or session revoked.');
      const diag = diagnoseNotebookFailure('test-notebook-uuid', err);

      assert.equal(diag.errorType, 'AUTH_EXPIRED');
      assert.ok(diag.rootCause.includes('expired or unauthenticated'));
      assert.ok(diag.remediationAction.includes('nlm login --force --storage file'));
    });

    it('Negative Test: Unrecoverable 404 notebook error is cleanly distinguished from auth failure', () => {
      const { diagnoseNotebookFailure } = require('../../scripts/lib/notebook/query_diagnostics.js');
      const err = new Error('HTTP 404 NOT_FOUND: Target notebook could not be located.');
      const diag = diagnoseNotebookFailure('missing-notebook-uuid', err);

      assert.equal(diag.errorType, 'INVALID_NOTEBOOK_ID');
      assert.notEqual(diag.errorType, 'AUTH_EXPIRED');
    });
  });

});
