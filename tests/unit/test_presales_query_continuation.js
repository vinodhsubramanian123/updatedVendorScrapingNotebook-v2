'use strict';
/**
 * tests/unit/test_presales_query_continuation.js
 *
 * Validates CP9b (RFP continuation), CP9c (Workload DNA slot arbitration + 7-aspect),
 * and CP9a (OCR intake execution with provenance).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { executeRoutedQuery } = require('../../scripts/evaluators/route_query.js');

test('CP9c — WORKLOAD_DNA arbitrates OCP slot contention and evaluates pivoted branches', async () => {
  // Input with 1x OCP Storage Controller MR408i-o and 2x OCP NICs on DL380 Gen11 (1 OCP slot only)
  const contestedItems = [
    { sku: 'P58335-B21', quantity: 1, description: 'HPE MR408i-o Gen11 x8 Lanes 4GB Cache OCP SPDM Storage Controller' },
    { sku: 'P10115-B21', quantity: 2, description: 'Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter for HPE' },
    { sku: 'P49610-B21', quantity: 2, description: 'Intel Xeon-Gold 6430 2.1GHz 32-core 270W Processor' },
    { sku: 'P43322-B21', quantity: 16, description: 'HPE 16GB DDR5-5600 Registered Smart Memory' }
  ];

  const res = await executeRoutedQuery('Analyze workload DNA for high-IOPS database on DL380 Gen11', {
    items: contestedItems,
    chassisName: 'DL380 Gen11'
  });

  assert.strictEqual(res.classification.intent, 'WORKLOAD_DNA');
  assert.strictEqual(res.result.status, 'CONTENTION_ARBITRATED');
  assert.strictEqual(res.result.hasContentions, true);
  assert.strictEqual(res.result.arbitrationAvailable, true);
  assert.ok(res.result.contentionsCount >= 1);
  assert.ok(res.result.arbitrationBranches.length >= 1);

  // Branch B pivots storage controller to PCIe (MR416i-p)
  const branchB = res.result.arbitrationBranches.find(b => b.branchId === 'branch_pcie_storage_ocp_nic');
  assert.ok(branchB, 'Branch B with PCIe storage pivot must be generated');
  assert.strictEqual(branchB.storageController.sku, 'P47777-B21');
});

test('CP9c — WORKLOAD_DNA returns ADVISORY when no hardware slots collide', async () => {
  const cleanItems = [
    { sku: 'P47777-B21', quantity: 1, description: 'HPE MR416i-p Gen11 x16 Lanes 8GB Cache PCI SPDM Storage Controller' },
    { sku: 'P10115-B21', quantity: 1, description: 'Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter for HPE' },
    { sku: 'P49610-B21', quantity: 2, description: 'Intel Xeon-Gold 6430 2.1GHz 32-core 270W Processor' },
    { sku: 'P43322-B21', quantity: 16, description: 'HPE 16GB DDR5-5600 Registered Smart Memory' }
  ];

  const res = await executeRoutedQuery('Profile workload DNA for virtualization host', {
    items: cleanItems,
    chassisName: 'DL380 Gen11'
  });

  assert.strictEqual(res.classification.intent, 'WORKLOAD_DNA');
  assert.strictEqual(res.result.status, 'ADVISORY');
  assert.strictEqual(res.result.hasContentions, false);
  assert.strictEqual(res.result.arbitrationAvailable, true);
});

test('CP9b — RFP_SIZING_TO_BOM continues into runEvaluationPipeline when continueEvaluation is requested', async () => {
  const res = await executeRoutedQuery('Size a server with dual 32-core CPUs, 512GB RAM, and 8x 960GB SSD on DL380 Gen12', {
    continueEvaluation: true
  });

  assert.strictEqual(res.classification.intent, 'RFP_SIZING_TO_BOM');
  assert.ok(res.result.candidateBOM.length > 0);
  assert.ok(res.result.evaluatedSolution !== null, 'evaluatedSolution must be populated when continueEvaluation is requested');
  assert.ok(['LOCAL_COMPLETE', 'EVALUATION_COMPLETE', 'ACTION_REQUIRED', 'LOCAL_RULE_CHECKED'].includes(res.result.status), `Unexpected status: ${res.result.status}`);
});

test('CP9b — RFP_SIZING_TO_BOM remains SIZING_DRAFT when continuation is not requested', async () => {
  const res = await executeRoutedQuery('Size a server with dual 32-core CPUs, 512GB RAM, and 8x 960GB SSD on DL380 Gen12');

  assert.strictEqual(res.classification.intent, 'RFP_SIZING_TO_BOM');
  assert.strictEqual(res.result.status, 'SIZING_DRAFT');
  assert.strictEqual(res.result.evaluatedSolution, null);
  assert.ok(res.result.candidateBOM.length > 0);
});

test('CP9a — OCR_QUOTE_INGESTION handles missing file safely with FILE_NOT_FOUND', async () => {
  const res = await executeRoutedQuery('Ingest quote image', {
    filePath: 'nonexistent_quote_file.png',
    executeOcr: true
  });

  assert.strictEqual(res.classification.intent, 'OCR_QUOTE_INGESTION');
  assert.strictEqual(res.result.status, 'FILE_NOT_FOUND');
  assert.ok(res.result.error.includes('Target image file not found'));
});

test('CP9a — OCR_QUOTE_INGESTION returns READY_FOR_OCR when executeOcr is false', async () => {
  const res = await executeRoutedQuery('Ingest quote image from quote.png', {
    filePath: 'quote.png'
  });

  assert.strictEqual(res.classification.intent, 'OCR_QUOTE_INGESTION');
  assert.strictEqual(res.result.status, 'READY_FOR_OCR');
});
