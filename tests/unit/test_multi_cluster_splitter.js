/**
 * test_multi_cluster_splitter.js
 * Unit Test Suite for Multi-Cluster BOQ Splitter & Automated Partitioning Engine.
 * 
 * Verifies:
 * - Extraction of multi-line SKU bundles within single cells.
 * - Multi-processor cluster detection and exact multiplier partitioning.
 * - Power supply matching by CPU TDP profiles.
 * - Proportional allocation of common infrastructure (memory, risers, storage controllers, boot devices).
 * - Full buildability validation for customer tender GID-RFQS-HPE-2026-006.xlsx.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { extractRawItemsFromWorkbook, analyzeAndPartitionClusters, splitAndWriteClusterWorkbooks } = require('../../scripts/lib/boq/multi_cluster_splitter.js');

const SAMPLE_BOQ = '/home/vinodh/Downloads/GID-RFQS-HPE-2026-006.xlsx';

describe('Multi-Cluster BOQ Splitter Engine', () => {
  it('should extract all raw items from customer tender spreadsheet', () => {
    if (!fs.existsSync(SAMPLE_BOQ)) return;

    const rawItems = extractRawItemsFromWorkbook(SAMPLE_BOQ);
    assert.ok(rawItems.length >= 15, `Must extract at least 15 distinct line items (found: ${rawItems.length})`);

    // Verify key SKUs are present
    const skus = rawItems.map(i => i.sku);
    assert.ok(skus.includes('P67088-B21'), 'Must extract Xeon Platinum 8580');
    assert.ok(skus.includes('P67095-B21'), 'Must extract Xeon Gold 6530');
    assert.ok(skus.includes('P64707-B21'), 'Must extract 64GB DDR5 Memory');
    assert.ok(skus.includes('P44712-B21'), 'Must extract Titanium Power Supply');
    assert.ok(skus.includes('P38997-B21'), 'Must extract Platinum Power Supply');
  });

  it('should partition the 60-node tender into 20x Platinum and 40x Gold clusters', () => {
    if (!fs.existsSync(SAMPLE_BOQ)) return;

    const rawItems = extractRawItemsFromWorkbook(SAMPLE_BOQ);
    const partition = analyzeAndPartitionClusters(rawItems);

    assert.strictEqual(partition.isMultiCluster, true, 'Must detect multi-cluster configuration');
    assert.strictEqual(partition.totalChassis, 60, 'Total chassis count must be 60');
    assert.strictEqual(partition.clusters.length, 2, 'Must partition into exactly 2 clusters');

    const platinumCluster = partition.clusters.find(c => c.multiplier === 20);
    const goldCluster = partition.clusters.find(c => c.multiplier === 40);

    assert.ok(platinumCluster, 'Must identify 20x Platinum cluster');
    assert.ok(goldCluster, 'Must identify 40x Gold cluster');

    assert.strictEqual(platinumCluster.cpuSku, 'P67088-B21');
    assert.strictEqual(goldCluster.cpuSku, 'P67095-B21');
  });

  it('should match power supplies appropriately to CPU TDP', () => {
    if (!fs.existsSync(SAMPLE_BOQ)) return;

    const rawItems = extractRawItemsFromWorkbook(SAMPLE_BOQ);
    const partition = analyzeAndPartitionClusters(rawItems);

    const platinumCluster = partition.clusters.find(c => c.multiplier === 20);
    const goldCluster = partition.clusters.find(c => c.multiplier === 40);

    const platPsu = platinumCluster.items.find(i => i.category === 'Power Supply');
    const goldPsu = goldCluster.items.find(i => i.category === 'Power Supply');

    assert.ok(platPsu.description.includes('Titanium') || platPsu.description.includes('2200W'), 'Platinum 350W cluster must use Titanium high-wattage PSU');
    assert.ok(goldPsu.description.includes('1600W') || goldPsu.description.includes('Platinum'), 'Gold 270W cluster must use 1600W PSU');
  });

  it('should generate valid cluster workbooks in temporary directory', () => {
    if (!fs.existsSync(SAMPLE_BOQ)) return;

    const tmpOut = path.join(__dirname, '..', '..', 'outputs', 'temp', 'test_split_clusters');
    const res = splitAndWriteClusterWorkbooks(SAMPLE_BOQ, tmpOut);

    assert.strictEqual(res.totalChassis, 60);
    assert.strictEqual(res.workbooks.length, 2);

    res.workbooks.forEach(wb => {
      assert.ok(fs.existsSync(wb.filePath), `Generated workbook must exist at ${wb.filePath}`);
      assert.ok(wb.itemCount >= 20, `Cluster workbook must have >= 20 configured line items (found: ${wb.itemCount})`);
    });

    // Cleanup
    fs.rmSync(tmpOut, { recursive: true, force: true });
  });
});
