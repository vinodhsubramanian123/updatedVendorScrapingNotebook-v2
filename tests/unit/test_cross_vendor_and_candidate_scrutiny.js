'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { executeRoutedQuery } = require('../../scripts/evaluators/route_query.js');
const { scrutinizeCandidateBOM, evaluateAdversarialInjection, REPRODUCIBLE_ADVERSARIAL_SUITES } = require('../../scripts/evaluators/adversarial_agent.js');
const { HeterogeneousTenderModernizer } = require('../../scripts/lib/boq/heterogeneous_tender_modernizer.js');

test('CP10b — ADVERSARIAL_VALIDATION executes CANDIDATE_SCRUTINY when candidate items are supplied', async () => {
  const candidateItems = [
    { sku: 'P73282-B21', quantity: 1, description: 'HPE ProLiant DL380 Gen12 8SFF NC CTO Server' },
    { sku: 'P49610-B21', quantity: 2, description: 'Intel Xeon-Gold 6430 2.1GHz 32-core 270W Processor' },
    { sku: 'P48818-B21', quantity: 1, description: 'HPE ProLiant DL380 Gen12 Standard Heatsink Kit' },
    { sku: 'P48820-B21', quantity: 1, description: 'HPE ProLiant DL380 Gen12 High Performance Fan Kit' },
    { sku: 'P43328-B21', quantity: 16, description: 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit' },
    { sku: 'P48803-B21', quantity: 2, description: 'HPE 800W Flex Slot Platinum Hot Plug Low Halogen Power Supply Kit' },
    { sku: 'P35876-B21', quantity: 1, description: 'HPE CE Mark Removal FIO Enablement Kit' }
  ];

  const result = await executeRoutedQuery('Red-team candidate BOQ and check failure modes', {
    intent: 'ADVERSARIAL_VALIDATION',
    chassisName: 'DL380_Gen12',
    items: candidateItems
  });

  assert.equal(result.result.intent, 'ADVERSARIAL_VALIDATION');
  assert.equal(result.result.mode, 'CANDIDATE_SCRUTINY');
  assert.equal(result.result.isSyntheticTest, false);
  assert.ok(result.result.scrutiny);
  assert.equal(result.result.scrutiny.totalFailureModes, 11);
  assert.equal(result.result.scrutiny.failureModesAudited.length, 11);
  assert.equal(result.result.scrutiny.isCertified, false); // Never certified without live CLIC portal
  assert.equal(result.result.scrutiny.portalValidationStatus, 'PORTAL VALIDATION PENDING');
});

test('CP10b — ADVERSARIAL_VALIDATION executes SYNTHETIC_CHAOS when no candidate items are supplied', async () => {
  const result = await executeRoutedQuery('Run adversarial stress testing on DL380_Gen12', {
    intent: 'ADVERSARIAL_VALIDATION',
    chassisName: 'DL380_Gen12'
  });

  assert.equal(result.result.intent, 'ADVERSARIAL_VALIDATION');
  assert.equal(result.result.mode, 'SYNTHETIC_CHAOS');
  assert.equal(result.result.isSyntheticTest, true);
  assert.equal(result.result.customerDisposition, 'NOT_FOR_CUSTOMER_DELIVERY');
  assert.equal(result.result.syntheticPassNeverCertifiesCandidate, true);
  assert.ok(result.result.evaluation);
  assert.ok(result.result.generatedBoq.length > 0);
});

test('CP10b — scrutinizeCandidateBOM rejects empty candidate and audits 11 failure modes', () => {
  const emptyResult = scrutinizeCandidateBOM([]);
  assert.equal(emptyResult.mode, 'CANDIDATE_SCRUTINY');
  assert.equal(emptyResult.status, 'EMPTY_CANDIDATE');
  assert.equal(emptyResult.isCertified, false);

  const flawedCandidate = [
    { sku: 'P73282-B21', quantity: 1, description: 'HPE ProLiant DL380 Gen12 8SFF NC CTO Server' },
    { sku: 'P49610-B21', quantity: 2, description: 'Intel Xeon-Gold 6430 2.1GHz 32-core 270W Processor' }
    // Missing 2nd CPU heatsink and missing fan kit
  ];
  const flawedResult = scrutinizeCandidateBOM(flawedCandidate, { chassis: 'DL380_Gen12' });
  assert.equal(flawedResult.mode, 'CANDIDATE_SCRUTINY');
  assert.equal(flawedResult.totalFailureModes, 11);
  assert.ok(flawedResult.totalIssuesCaught > 0);
  assert.equal(flawedResult.status, 'CANDIDATE_VIOLATIONS_DETECTED');
  assert.equal(flawedResult.disposition, 'REMEDIATION_REQUIRED');
});

test('CP10b — evaluateAdversarialInjection tags synthetic stress test explicitly', () => {
  const suite = REPRODUCIBLE_ADVERSARIAL_SUITES[0];
  const res = evaluateAdversarialInjection(suite);
  assert.equal(res.mode, 'SYNTHETIC_CHAOS');
  assert.equal(res.isSyntheticTest, true);
  assert.equal(res.customerDisposition, 'NOT_FOR_CUSTOMER_DELIVERY');
  assert.equal(res.syntheticPassNeverCertifiesCandidate, true);
  assert.equal(res.isCaught, true);
});

test('CP9d — CROSS_VENDOR_TRANSFORMATION evaluates candidate and identifies parity gaps', async () => {
  const competitorSpec = '2x Intel Xeon Platinum 8480+ 56C 350W; 32x 64GB DDR5-4800 RDIMM; 8x 3.84TB NVMe SSD; 2x 1600W PSU';
  const underspecifiedCandidate = [
    { sku: 'P73282-B21', quantity: 1, description: 'HPE ProLiant DL380 Gen12 8SFF NC CTO Server' },
    { sku: 'P49610-B21', quantity: 2, description: 'Intel Xeon-Gold 6430 2.1GHz 32-core 270W Processor' }, // 64 total cores vs 112 requested
    { sku: 'P43328-B21', quantity: 8, description: 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit' }  // 256GB vs 2048GB requested
  ];

  const result = await executeRoutedQuery('Convert competitor spec to DL380_Gen12', {
    intent: 'CROSS_VENDOR_TRANSFORMATION',
    chassisName: 'DL380_Gen12',
    competitorSpec,
    targetBom: underspecifiedCandidate,
    continueEvaluation: true
  });

  assert.equal(result.result.intent, 'CROSS_VENDOR_TRANSFORMATION');
  assert.equal(result.result.targetChassis, 'DL380_Gen12');
  assert.ok(result.result.parityGaps.length >= 2, 'Should identify compute and memory parity gaps');
  const coreGap = result.result.parityGaps.find(g => g.subsystem === 'COMPUTE_PROCESSORS');
  assert.ok(coreGap, 'Must identify core count deficit');
  assert.equal(coreGap.requested, 112);
  const memGap = result.result.parityGaps.find(g => g.subsystem === 'MEMORY_TOPOLOGY');
  assert.ok(memGap, 'Must identify memory capacity deficit');
  assert.equal(memGap.requested, 2048);
  assert.ok(result.result.evaluatedSolution, 'Must include evaluated solution when continueEvaluation is requested');
});

test('CP9e — HETEROGENEOUS_TENDER_MODERNIZATION partitions domains and synthesizes carrier fleet', async () => {
  const tenderItems = [
    { sku: 'P73282-B21', quantity: 2, description: 'HPE ProLiant Compute DL380 Gen12 8SFF NC CTO Server' },
    { sku: 'P49610-B21', quantity: 4, description: 'Intel Xeon-Gold 6430 2.1GHz 32-core 270W Processor' },
    { sku: 'R0Q53A', quantity: 1, description: 'HPE MSA 2060 16Gb Fibre Channel SFF Storage' },
    { sku: 'R0Q39A', quantity: 12, description: 'HPE MSA 1.92TB SAS 12G Read Intensive SFF SSD' },
    { sku: 'R7J28A', quantity: 2, description: 'HPE SN3600B 32Gb 24/8 Fibre Channel Switch' },
    { sku: 'Q6Q67A', quantity: 1, description: 'HPE StoreEver MSL 1/8 G2 0-drive Tape Autoloader' },
    // Loose unbuildable items requiring carrier fleet
    { sku: 'P43328-B21', quantity: 64, description: '64x 32GB DDR5-4800 Registered Smart Memory Kit loose spare', isAdHocRow: true }
  ];

  const result = await executeRoutedQuery('Modernize heterogeneous multi-domain tender', {
    intent: 'HETEROGENEOUS_TENDER_MODERNIZATION',
    targetPlatform: 'DL380 Gen11',
    items: tenderItems
  });

  assert.equal(result.result.intent, 'HETEROGENEOUS_TENDER_MODERNIZATION');
  assert.equal(result.result.status, 'DRAFT_VALIDATION_REQUIRED');
  assert.equal(result.result.portalValidationStatus, 'PORTAL VALIDATION PENDING');
  assert.ok(result.result.carrierFleetSummary);
  assert.ok(result.result.carrierFleetSummary.totalPools >= 1);
  assert.ok(result.result.deliverableSummary.carrierNodesCount >= 1);
  assert.ok(result.result.deliverables.internalProductionManifest);
  assert.ok(result.result.deliverables.internalCarrierManifest);
});
