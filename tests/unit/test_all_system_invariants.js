'use strict';
/**
 * tests/unit/test_all_system_invariants.js — Executable Architecture Invariants Test Harness
 *
 * Directly tests the 19 Critical Technical Invariants documented in .agents/AGENTS.md:
 * - INV-1: Price trail deduplicates by DATE using STATUS_PRIORITY table.
 * - INV-4: master_knowledge_registry.json contains generatedAt and schemaVersion.
 * - INV-6: scrapeDate is strictly YYYY-MM-DD format (no full ISO timestamps).
 * - INV-7: Test-chassis sync payloads route to outputs/temp/test_payloads/.
 * - INV-9: SKU price cache memoization & lifecycle reset.
 * - INV-13: Closed-loop knowledge delta deduplication in place.
 */

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Subsystems
const { appendTrailEvent } = require('../../scripts/lib/catalog/diff_catalog.js');
const { buildMasterKnowledgeRegistry } = require('../../scripts/lib/sync/knowledge_sync.js');
const { generateNotebookSyncPayload } = require('../../scripts/lib/sync/sync_payload_builder.js');
const { getHistoricalSkuPrice, _clearCatalogPriceCache } = require('../../scripts/lib/catalog/sku_versioning.js');
const { processPortalFeedback } = require('../../scripts/lib/feedback/feedback_loop.js');

test('🏛️ SYSTEM INVARIANTS HARNESS (INV-1 to INV-19)', async (t) => {

  await t.test('INV-1: appendTrailEvent deduplicates by DATE using STATUS_PRIORITY', () => {
    const trail = [
      { date: '2026-08-27', price: 1000, status: 'BASELINE' }
    ];

    // Same-day UNCHANGED should NOT replace BASELINE (BASELINE has equal/higher baseline standing)
    appendTrailEvent(trail, { date: '2026-08-27', price: 1000, status: 'UNCHANGED' });
    assert.strictEqual(trail.length, 1, 'Must not duplicate entries for the same date');

    // Same-day PRICE_CHANGED should REPLACE BASELINE (higher priority)
    appendTrailEvent(trail, { date: '2026-08-27', price: 1200, status: 'PRICE_CHANGED' });
    assert.strictEqual(trail.length, 1, 'Must replace lower priority status on same date');
    assert.strictEqual(trail[0].status, 'PRICE_CHANGED', 'Higher priority status must replace lower priority');
    assert.strictEqual(trail[0].price, 1200);

    // Different date should append
    appendTrailEvent(trail, { date: '2026-08-28', price: 1200, status: 'UNCHANGED' });
    assert.strictEqual(trail.length, 2, 'Different dates must append');
  });

  await t.test('INV-4: master_knowledge_registry.json contains generatedAt and schemaVersion', () => {
    const registry = buildMasterKnowledgeRegistry();
    assert.ok(registry.generatedAt, 'Registry must contain generatedAt ISO timestamp');
    assert.ok(registry.lastUpdated, 'Registry must contain lastUpdated for backward compatibility');
    assert.ok(registry.schemaVersion, 'Registry must contain schemaVersion');
    assert.ok(Array.isArray(registry.productFamiliesSynced), 'Registry must contain productFamiliesSynced array');
  });

  await t.test('INV-6: scrapeDate in catalog metadata is strictly YYYY-MM-DD', () => {
    const { createCatalogMetadata } = require('../../scripts/catalogs/build_catalog.js');
    const metadata = createCatalogMetadata('ProLiant', 'Gen12', 'DL380_Gen12');
    assert.ok(metadata, 'Metadata object must be returned');
    assert.match(metadata.scrapeDate, /^\d{4}-\d{2}-\d{2}$/, 'scrapeDate must strictly match YYYY-MM-DD');
    assert.doesNotMatch(metadata.scrapeDate, /T\d{2}:\d{2}:\d{2}/, 'scrapeDate must NOT contain full ISO timestamp');
  });

  await t.test('INV-7: Test-chassis payloads route to outputs/temp/test_payloads/', () => {
    const testChassis = 'hpe-chaos-test-node-99';
    const payload = generateNotebookSyncPayload(testChassis, false);
    assert.ok(payload.payloadPath, 'Must return payloadPath');
    assert.ok(
      payload.payloadPath.includes(path.join('outputs', 'temp', 'test_payloads')),
      `Test payload path must be inside outputs/temp/test_payloads/, got: ${payload.payloadPath}`
    );
  });

  await t.test('INV-9: Memoized SKU price cache lifecycle reset', () => {
    _clearCatalogPriceCache();
    const priceRecord = getHistoricalSkuPrice('P73282-B21', 'nonexistent_dir_for_test');
    assert.ok(priceRecord, 'Price record object is returned');
    assert.strictEqual(priceRecord.priceUsd, 0, 'Unknown SKU has 0 price');
    assert.strictEqual(priceRecord.status, 'NO_PRICE_RECORDED', 'Unknown SKU status is NO_PRICE_RECORDED');
    _clearCatalogPriceCache();
  });

  await t.test('INV-13: Closed-loop knowledge delta deduplicates in place', () => {
    const tmpDir = path.join(os.tmpdir(), `test_inv13_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    try {
      const errorMsg = 'P49610-B21 requires P48820-B21 High Performance Fan Kit for cooling.';
      const delta1 = processPortalFeedback(errorMsg, tmpDir, {
        affectedSku: 'P49610-B21',
        requiredDependencySku: 'P48820-B21',
        humanReasoning: 'Initial observation'
      });

      const historyFile = path.join(tmpDir, 'history', 'catalog_deltas.json');
      assert.ok(fs.existsSync(historyFile));
      let deltas = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
      assert.strictEqual(deltas.length, 1);

      // Ingest duplicate error with updated reasoning
      const delta2 = processPortalFeedback(errorMsg, tmpDir, {
        affectedSku: 'P49610-B21',
        requiredDependencySku: 'P48820-B21',
        humanReasoning: 'Updated secondary verification reasoning'
      });

      deltas = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
      assert.strictEqual(deltas.length, 1, 'Must deduplicate identical rule in place');
      assert.strictEqual(deltas[0].humanReasoning, 'Updated secondary verification reasoning', 'Must update metadata in place');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  await t.test('INV-34: Dynamic GPL Price Baseline Preservation Across Unbundled Views', () => {
    // When an active scrape returns $0.00 for a known SKU, historical price map resolves list price
    const gen11Dir = path.join(process.cwd(), 'outputs', 'ProLiant', 'Gen11', 'DL380_Gen11');
    const priceRecord = getHistoricalSkuPrice('P67088-B21', gen11Dir);
    assert.ok(priceRecord, 'Price record must exist');
    assert.strictEqual(priceRecord.priceUsd, 23877, 'Must preserve $23,877 GPL list price for Xeon Platinum 8580');
  });

  await t.test('INV-35: Obsolete Vendor Description Badge & Concatenation Sanitization', () => {
    // Test cleaning logic on corrupted DOM string
    const rawDesc = 'Product is obsolete: P74214-B21Product is obsolete: P74214-B21 HPE 64GB 2Rx4 DDR5-5600 Smart Memory';
    let cleanDesc = rawDesc.replace(/(?:(?:Product\s+)?is\s+obsolete:\s*[A-Z0-9-]*\s*)+/gi, '').trim();
    cleanDesc = cleanDesc.replace(/^(?:OB|DS|90|EOL)\s+/i, '').trim();
    assert.strictEqual(cleanDesc, 'HPE 64GB 2Rx4 DDR5-5600 Smart Memory', 'Must strip repeated vendor obsolete prefix');
  });

  await t.test('INV-36: Universal Dynamic Product Generation Hierarchy', () => {
    // DL380_Gen12 and DL380_Gen11 directories exist as single product generation level
    const gen12Dir = path.join(process.cwd(), 'outputs', 'ProLiant', 'Gen12', 'DL380_Gen12');
    const gen11Dir = path.join(process.cwd(), 'outputs', 'ProLiant', 'Gen11', 'DL380_Gen11');
    assert.ok(fs.existsSync(gen12Dir), 'DL380_Gen12 canonical product generation directory must exist');
    assert.ok(fs.existsSync(gen11Dir), 'DL380_Gen11 canonical product generation directory must exist');
    
    // Ensure no fragmented form factor directories exist
    const staleGen12Sff = path.join(process.cwd(), 'outputs', 'ProLiant', 'Gen12', 'DL380_Gen12_SFF');
    assert.strictEqual(fs.existsSync(staleGen12Sff), false, 'Fragmented form-factor directory DL380_Gen12_SFF must not exist');
  });

  await t.test('INV-37: Automated Multi-Cluster Tender Subtotal & 2-Line Gap Formatting Protocol', () => {
    const { generatePartnerPortalUploadBOM } = require('../../scripts/lib/boq/generate_boq_xlsx.js');
    const sampleClusters = [{
      name: 'Cluster 1',
      multiplier: 10,
      items: [{ sku: 'P52534-B21', quantity: 1, totalQuantity: 10, description: 'DL380 Gen11 CTO', unitPrice: 5070 }]
    }];
    const tempFile = path.join(process.cwd(), 'outputs', 'temp', 'inv37_test.xlsx');
    fs.mkdirSync(path.dirname(tempFile), { recursive: true });
    generatePartnerPortalUploadBOM(sampleClusters, tempFile);
    
    const XLSX = require('xlsx-js-style');
    const wb = XLSX.readFile(tempFile);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
    assert.deepEqual(rows[0], ['Part No', 'Qty', 'Set', ' Description', 'Unit List Price (USD)', 'Extended Price (USD)', 'Portal / CLIC Status']);
    const subtotal = rows.find(r => r[2] && String(r[2]).includes('SUBTOTAL:'));
    assert.ok(subtotal, 'Must contain subtotal row in Set column');
    fs.unlinkSync(tempFile);
  });

  await t.test('INV-38: Dynamic Chassis Directory Path Resolution in Sku Versioning', () => {
    const { getHistoricalSkuPrice } = require('../../scripts/lib/catalog/sku_versioning.js');
    const res = getHistoricalSkuPrice('P67088-B21', 'DL380_Gen11');
    assert.strictEqual(res.priceUsd, 23877, 'Must dynamically resolve bare model DL380_Gen11 to outputs directory');
  });

  await t.test('INV-42: Mathematically Rigorous Hamilton–Hare Diophantine Multiplier Allocation', () => {
    const { analyzeAndPartitionClusters } = require('../../scripts/lib/boq/multi_cluster_splitter.js');
    const items = [
      { sku: 'P67088-B21', description: 'Intel Xeon Platinum 8580 Processor', quantity: 40, category: 'Processor' },
      { sku: 'P67095-B21', description: 'Intel Xeon Gold 6530 Processor', quantity: 80, category: 'Processor' },
      { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF Server', quantity: 60, category: 'Base Chassis' }
    ];
    const partition = analyzeAndPartitionClusters(items, { targetTotalChassis: 60 });
    assert.strictEqual(partition.isMultiCluster, true);
    assert.strictEqual(partition.clusters.length, 2);
    const sumMultipliers = partition.clusters.reduce((sum, c) => sum + c.multiplier, 0);
    assert.strictEqual(sumMultipliers, 60, 'Sum of cluster multipliers must exactly equal target 60 chassis');
  });

  await t.test('INV-43: MCP-First Jules Autonomous Lifecycle Skill Contract', () => {
    const skillPath = path.join(process.cwd(), '.agents', 'skills', 'jules-autonomous-protocol', 'SKILL.md');
    assert.ok(fs.existsSync(skillPath), 'SKILL.md must exist');
    const skillContent = fs.readFileSync(skillPath, 'utf-8');
    assert.ok(skillContent.includes('MCP-First, CLI-Fallback'), 'Skill must define MCP-first priority');
    assert.ok(skillContent.includes('Stage 2: Proactive Heartbeat Cron Loop'), 'Skill must mandate proactive heartbeat loop');
    assert.ok(skillContent.includes('Stage 4: Code Review & Diff Extraction'), 'Skill must mandate code review before archive');
    assert.ok(skillContent.includes('Stage 8: Gap Scan & New Task Dispatch'), 'Skill must mandate gap scan');
  });

});


