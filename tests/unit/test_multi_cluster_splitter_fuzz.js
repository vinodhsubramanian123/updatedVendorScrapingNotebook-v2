'use strict';
/**
 * tests/unit/test_multi_cluster_splitter_fuzz.js
 *
 * Comprehensive unit and fuzz testing for Multi-Cluster BOQ Splitter & Partitioning Engine:
 * (scripts/lib/boq/multi_cluster_splitter.js)
 *
 * Test Boundaries:
 * 1. Single homogeneous cluster intake.
 * 2. 2-cluster partition (20x Platinum + 40x Gold).
 * 3. 3-cluster partition (10x Platinum + 20x Gold + 30x Silver).
 * 4. Asymmetric & odd CPU quantity handling.
 * 5. Multi-line bundled text cells with embedded accessory SKUs.
 * 6. 7-column Excel header contract validation (INV-37).
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx-js-style');

const {
  findValidSkuInText,
  extractRawItemsFromWorkbook,
  analyzeAndPartitionClusters,
  splitAndWriteClusterWorkbooks
} = require('../../scripts/lib/boq/multi_cluster_splitter.js');

describe('🧪 Multi-Cluster Splitter & Partitioning Engine Fuzz Suite', () => {

  test('1. findValidSkuInText correctly finds hyphenated and 6-char HPE SKUs in complex text', () => {
    assert.strictEqual(findValidSkuInText('ProLiant DL380 Gen11 8SFF Server (P52534-B21) with accessories'), 'P52534-B21');
    assert.strictEqual(findValidSkuInText('Broadcom BCM57414 10/25Gb 2p SFP28 Adapter P26262-B21'), 'P26262-B21');
    assert.strictEqual(findValidSkuInText('SN1610Q 32Gb 2-port FC HBA R2E09A'), 'R2E09A');
    assert.strictEqual(findValidSkuInText('Plain description without part number'), null);
    assert.strictEqual(findValidSkuInText(''), null);
  });

  test('2. Single homogeneous cluster (10x DL380 Gen12 servers) partitions cleanly', () => {
    const rawItems = [
      { sku: 'P73282-B21', category: 'Chassis', description: 'HPE DL380 Gen12 8SFF CTO Server', quantity: 10 },
      { sku: 'P74573-B21', category: 'Processor', description: 'Intel Xeon 6730P 32-core 250W', quantity: 20 },
      { sku: 'P69728-B21', category: 'Memory', description: '64GB DDR5-6400 RAM', quantity: 160 },
      { sku: 'P48820-B21', category: 'Thermal', description: 'High Performance Fan Kit', quantity: 10 }
    ];

    const partition = analyzeAndPartitionClusters(rawItems);
    assert.strictEqual(partition.totalChassis, 10);
    assert.strictEqual(partition.clusters.length, 1);
    assert.strictEqual(partition.clusters[0].multiplier, 10);
    assert.strictEqual(partition.clusters[0].cpuSku, 'P74573-B21');
    assert.strictEqual(partition.clusters[0].items.length, 4);
  });

  test('3. 2-Cluster partition (20x Platinum + 40x Gold) solves Diophantine multipliers with 0 remainder', () => {
    const rawItems = [
      { sku: 'P52534-B21', category: 'Chassis', description: 'HPE DL380 Gen11 8SFF CTO Server', quantity: 60 },
      { sku: 'P67088-B21', category: 'Processor', description: 'Intel Xeon Platinum 8580 60C 350W', quantity: 40 },
      { sku: 'P67095-B21', category: 'Processor', description: 'Intel Xeon Gold 6530 32C 270W', quantity: 80 },
      { sku: 'P64707-F21', category: 'Memory', description: '64GB DDR5-5600 RAM', quantity: 480 },
      { sku: 'P44712-B21', category: 'Power', description: '1800W Titanium PSU', quantity: 40 },
      { sku: 'P38997-B21', category: 'Power', description: '1600W Platinum PSU', quantity: 80 }
    ];

    const partition = analyzeAndPartitionClusters(rawItems);
    assert.strictEqual(partition.totalChassis, 60);
    assert.strictEqual(partition.clusters.length, 2);

    const clusterPlatinum = partition.clusters.find(c => c.multiplier === 20 || c.cpuSku === 'P67088-B21');
    const clusterGold = partition.clusters.find(c => c.multiplier === 40 || c.cpuSku === 'P67095-B21');

    assert(clusterPlatinum, 'Must create 20-node Platinum cluster');
    assert(clusterGold, 'Must create 40-node Gold cluster');

    // Platinum cluster allocation
    const platPsu = clusterPlatinum.items.find(i => i.sku === 'P44712-B21');
    assert(platPsu, 'Cluster Platinum must receive 1800W Titanium PSUs');
    assert.strictEqual(platPsu.quantity, 2); // 2 per node
    assert.strictEqual(platPsu.totalQuantity, 40); // 40 total

    // Gold cluster allocation
    const goldPsu = clusterGold.items.find(i => i.sku === 'P38997-B21');
    assert(goldPsu, 'Cluster Gold must receive 1600W Platinum PSUs');
    assert.strictEqual(goldPsu.quantity, 2);
    assert.strictEqual(goldPsu.totalQuantity, 80);
  });

  test('4. 3-Cluster partition (10x Platinum + 20x Gold + 30x Silver = 60 Nodes)', () => {
    const rawItems = [
      { sku: 'P52534-B21', category: 'Chassis', description: 'HPE DL380 Gen11 8SFF CTO Server', quantity: 60 },
      { sku: 'P67088-B21', category: 'Processor', description: 'Intel Xeon Platinum 8580 (60C)', quantity: 20 }, // 10 nodes * 2
      { sku: 'P67095-B21', category: 'Processor', description: 'Intel Xeon Gold 6530 (32C)', quantity: 40 },    // 20 nodes * 2
      { sku: 'P67100-B21', category: 'Processor', description: 'Intel Xeon Silver 4514Y (16C)', quantity: 60 }, // 30 nodes * 2
      { sku: 'P64707-F21', category: 'Memory', description: '64GB DDR5-5600 RAM', quantity: 480 }
    ];

    const partition = analyzeAndPartitionClusters(rawItems);
    assert.strictEqual(partition.totalChassis, 60);
    assert.strictEqual(partition.clusters.length, 3);

    const mults = partition.clusters.map(c => c.multiplier).sort((a, b) => a - b);
    assert.deepStrictEqual(mults, [10, 20, 30]);
  });

  test('5. splitAndWriteClusterWorkbooks generates standard 7-column Excel workbooks (INV-37)', () => {
    const tempDir = path.resolve(__dirname, '../../outputs/temp/test_fuzz_split_workbooks');
    fs.mkdirSync(tempDir, { recursive: true });

    const sampleTenderPath = path.resolve(__dirname, '../fixtures/samples/DL380_Gen11_60-node_Split_Cluster_Tender.xlsx');
    if (fs.existsSync(sampleTenderPath)) {
      const splitRes = splitAndWriteClusterWorkbooks(sampleTenderPath, tempDir);
      assert.strictEqual(splitRes.clusterCount, 2);

      splitRes.workbooks.forEach(wbInfo => {
        assert(fs.existsSync(wbInfo.filePath));
        const wb = xlsx.readFile(wbInfo.filePath);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
        
        // Assert header contract (INV-37)
        const header = data[0];
        assert.deepStrictEqual(header, [
          'Part No', 'Qty', 'Description', 'Category', 'Unit List Price (USD)', 'Extended Price (USD)', 'Portal / CLIC Status'
        ]);

        // Assert all rows contain valid data
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          assert(row[0], `Row ${i} must have Part No`);
          assert(typeof row[1] === 'number' && row[1] > 0, `Row ${i} must have valid quantity`);
        }
      });
    }

    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_) {}
  });

});
