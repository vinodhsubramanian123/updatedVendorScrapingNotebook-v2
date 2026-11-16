'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const XLSX = require('xlsx-js-style');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const GENERATE_XLSX_SCRIPT = path.join(PROJECT_ROOT, 'scripts', 'catalogs', 'generate_xlsx.js');
const POST_FLOW_SYNC_SCRIPT = path.join(PROJECT_ROOT, 'scripts', 'lib', 'sync', 'post_flow_sync.js');

const { generateMainSheet } = require('../../scripts/lib/catalog/catalog_formatter.js');
const { _buildSkuFromRow } = require('../../scripts/catalogs/xlsx_to_catalog.js');
const { processCatalogDiff } = require('../../scripts/lib/catalog/diff_catalog.js');
const { computeIncrementalDifferential } = require('../../scripts/lib/catalog/checksum_diff.js');
const {
  summarizeCatalogDiffState,
  writeCatalogDiffSummaryMarkdown,
  runScrapingPostflightVerification
} = require('../../scripts/lib/scraper/scraping_preflight_gate.js');
const {
  _buildHeaderAndSummarySection,
  _buildAttributeHistorySection
} = require('../../scripts/lib/sync/sync_payload_builder.js');
const {
  createCaptureReceipt,
  finalizeCaptureReceipt,
  compareSkus
} = require('../../scripts/lib/catalog/catalog_capture_receipt.js');
const {
  normalizeSolutionPillar,
  defaultClassifySolutionDomain,
  registerCustomVendorPortalPolicy,
  unregisterCustomVendorPortalPolicy,
  resolvePortalSessionPolicy
} = require('../../scripts/lib/scraper/vendor_portal_router.js');
const {
  registerVendorScraperAdapter,
  unregisterVendorScraperAdapter,
  getScraperAdapterForPortal,
  listRegisteredVendorAdapters
} = require('../../scripts/lib/scraper/vendor_scraper_adapter.js');
const { resolveExpectedProductIdentity } = require('../../scripts/scrapers/scrape_oca_solution.js');
const {
  inspectCatalogDeltas,
  checkPortalAndSyncReadiness
} = require('../../scripts/services/mcp_server.js');

function withTempDir(fn) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'verifier-cat-sync-'));
  let isAsync = false;
  try {
    const res = fn(tmpDir);
    if (res && typeof res.then === 'function') {
      isAsync = true;
      return res.finally(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      });
    }
    return res;
  } finally {
    if (!isAsync) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
}

function buildDiffTsvEntries() {
  return [
    {
      parentCategory: 'Networking',
      subCategory: 'Ethernet Adapters',
      minQty: 0,
      maxQty: 4,
      constraint: 'max 4',
      rules: ['Supports 25GbE SFP28 uplinks'],
      skus: [
        {
          'Product #': 'SKU-ATTR-1',
          Description: '25GbE Dual-Port SFP28 Adapter Rev B',
          'Current Qty': '0',
          'Option Type': 'Option',
          'Unit Price (USD)': '850.00',
          'Previous List Price (USD)': '850.00',
          'Price Change (USD)': '$0.00',
          'Price Change (%)': '0.00%',
          'Diff Status': 'ATTRIBUTE_CHANGED',
          'Attribute Deltas': 'Description: "25GbE Dual-Port SFP28 Adapter Rev A" → "25GbE Dual-Port SFP28 Adapter Rev B"',
          'Price History Trail': '2026-11-14: $850.00 → 2026-11-15: $850.00 ([[ATTR]])'
        },
        {
          'Product #': 'SKU-BOTH-2',
          Description: '100GbE QSFP28 Dual-Port Switch Card',
          'Current Qty': '0',
          'Option Type': 'Option',
          'Unit Price (USD)': '1650.00',
          'Previous List Price (USD)': '1500.00',
          'Price Change (USD)': '+$150.00',
          'Price Change (%)': '+10.00%',
          'Diff Status': 'PRICE_AND_ATTRIBUTE_CHANGED',
          'Attribute Deltas': 'Lead Time: "10-14 days" → "5-7 days"',
          'Price History Trail': '2026-11-14: $1500.00 → 2026-11-15: $1650.00 (+$150.00) [[ATTR]]'
        }
      ]
    }
  ];
}

function writeMinimalXlsxScraps(dir, prefix, entries) {
  const scrapsDir = path.join(dir, 'intermittent_scraps');
  fs.mkdirSync(scrapsDir, { recursive: true });
  const tsvSkus = generateMainSheet(entries, prefix, { portalPrefix: 'Acme Portal' });
  fs.writeFileSync(path.join(scrapsDir, `${prefix}_Catalog_SKUs.tsv`), tsvSkus, 'utf8');
  const rulesTsv = [
    'Main Category\tSub-Category\tConstraint\tOption Type\tRule Text',
    'Networking\tEthernet Adapters\tmax 4\tRule\tSupports 25GbE SFP28 uplinks'
  ].join('\n');
  fs.writeFileSync(path.join(scrapsDir, `${prefix}_Catalog_Rules.tsv`), rulesTsv, 'utf8');
  const summaryTsv = [
    'Main Category\tSub-Category\tConstraint\tMin Qty\tMax Qty\tUnique SKUs\tHas Rules',
    'Networking\tEthernet Adapters\tmax 4\t0\t4\t2\tYes'
  ].join('\n');
  fs.writeFileSync(path.join(scrapsDir, `${prefix}_Catalog_Summary.tsv`), summaryTsv, 'utf8');
}

function loadIsolatedPostFlowSync(mockQuickSpecsImpl) {
  const noopLogger = { info() {}, warn() {}, error() {}, debug() {} };
  const deps = {
    path,
    fs,
    crypto: require('node:crypto'),
    './knowledge_sync.js': {
      buildMasterKnowledgeRegistry: () => ({ totalLearnedRules: 4 }),
      generateNotebookSyncPayload: (chassisName, _autoUpload, opts) => ({
        payloadPath: path.join(opts?.targetDir || os.tmpdir(), `notebook_sync_payload_${chassisName}.md`),
        uploadResult: { success: true, notebookId: 'nb-sync-1', newSourceId: 'src-1', newSourceName: 'payload.md' }
      }),
      inspectKnowledgeDrift: () => ({ status: 'SYNCED', unSyncedDeltasCount: 0, notebookId: 'nb-sync-1' })
    },
    '../system/pipeline_logger.js': noopLogger,
    './quickspecs_sync.js': { verifyNotebookQuickSpecs: mockQuickSpecsImpl }
  };
  const mod = { exports: {} };
  vm.runInNewContext(fs.readFileSync(POST_FLOW_SYNC_SCRIPT, 'utf8'), {
    require: id => {
      assert.ok(Object.hasOwn(deps, id), `Unexpected dependency requested: ${id}`);
      return deps[id];
    },
    module: mod,
    exports: mod.exports,
    __dirname: path.dirname(POST_FLOW_SYNC_SCRIPT),
    __filename: POST_FLOW_SYNC_SCRIPT,
    process: { env: { ...process.env, NODE_ENV: 'production' } },
    Date,
    console
  });
  return mod.exports;
}

describe('2a. TSV & XLSX Attribute Deltas Preservation + Row Round-Trip', () => {
  it('preserves Attribute Deltas and vendor portalPrefix in 34-column TSV output', () => {
    const tsv = generateMainSheet(buildDiffTsvEntries(), 'Test_Rack_Server', { portalPrefix: 'Acme Partner Portal' });
    const lines = tsv.split(/\r?\n/).filter(Boolean);
    assert.equal(lines.length, 3);
    const headers = lines[0].split('\t');
    assert.equal(headers.length, 34);
    const attrIdx = headers.indexOf('Attribute Deltas');
    assert.equal(attrIdx, headers.indexOf('Price History Trail') - 1);
    const row1 = lines[1].split('\t');
    assert.equal(row1[headers.indexOf('Hierarchy Path')], 'Acme Partner Portal > Test_Rack_Server > Networking > Ethernet Adapters');
    assert.equal(row1[attrIdx], 'Description: "25GbE Dual-Port SFP28 Adapter Rev A" → "25GbE Dual-Port SFP28 Adapter Rev B"');
  });

  it('preserves Attribute Deltas, cell wrapping, and diff counts in generated Excel sheets', () => {
    withTempDir(tmpDir => {
      const prefix = 'Acme_Switch_100G';
      const entries = buildDiffTsvEntries();
      writeMinimalXlsxScraps(tmpDir, prefix, entries);
      fs.writeFileSync(path.join(tmpDir, `${prefix}_Catalog.json`), JSON.stringify({
        metadata: { chassis: 'Acme Switch 100G', scrapeDate: '2026-11-15', totalUniqueSKUs: 2, totalTables: 1 },
        entries
      }), 'utf8');

      const xlsxPath = path.join(tmpDir, `${prefix}_OCA_Catalog.xlsx`);
      execFileSync(process.execPath, [GENERATE_XLSX_SCRIPT, xlsxPath], { cwd: PROJECT_ROOT, stdio: 'pipe' });

      const wb = XLSX.readFile(xlsxPath, { cellStyles: true });
      for (const sheetName of ['All SKUs', 'Catalog Diffs', 'Price History Timeline']) {
        assert.ok(wb.SheetNames.includes(sheetName), `Missing expected sheet: ${sheetName}`);
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
        assert.equal(rows.length, 2);
        const attrRow = rows.find(r => r['Product #'] === 'SKU-ATTR-1');
        assert.equal(attrRow['Attribute Deltas'], 'Description: "25GbE Dual-Port SFP28 Adapter Rev A" → "25GbE Dual-Port SFP28 Adapter Rev B"');
        const bothRow = rows.find(r => r['Product #'] === 'SKU-BOTH-2');
        assert.equal(bothRow['Attribute Deltas'], 'Lead Time: "10-14 days" → "5-7 days"');
      }

      const diffsSheet = wb.Sheets['Catalog Diffs'];
      const headerRow = XLSX.utils.sheet_to_json(diffsSheet, { header: 1 })[0];
      const attrColIdx = headerRow.indexOf('Attribute Deltas');
      assert.ok(attrColIdx >= 0);
      assert.equal(diffsSheet['!cols']?.[attrColIdx]?.wch, 42);
      assert.equal(diffsSheet[XLSX.utils.encode_cell({ r: 1, c: attrColIdx })]?.s?.fgColor?.rgb, 'E8F0FE');
      assert.equal(diffsSheet[XLSX.utils.encode_cell({ r: 2, c: attrColIdx })]?.s?.fgColor?.rgb, 'F3E5F5');
      assert.ok((wb.Styles?.CellXf || []).some(xf => xf.alignment?.wrapText === true));

      const metaRows = XLSX.utils.sheet_to_json(wb.Sheets.Metadata);
      const metaMap = Object.fromEntries(metaRows.map(r => [r.Field, r.Value]));
      assert.equal(metaMap['Diff Attr Changed'], '1');
      assert.equal(metaMap['Diff Price+Attr Changed'], '1');
    });
  });

  it('reconstructs Attribute Deltas from worksheet row via _buildSkuFromRow', () => {
    const sku = _buildSkuFromRow({
      'Product #': 'SKU-RT-1',
      Description: 'Redundant 1600W PSU Titanium',
      'Unit Price (USD)': '450.00',
      'Diff Status': 'ATTRIBUTE_CHANGED',
      'Attribute Deltas': 'CLIC Status: "Pending" → "Valid"',
      'Price History Trail': '2026-11-15: $450.00 ([[ATTR]])'
    });
    assert.equal(sku['Diff Status'], 'ATTRIBUTE_CHANGED');
    assert.equal(sku['Attribute Deltas'], 'CLIC Status: "Pending" → "Valid"');
    assert.equal(sku['Price History Trail'], '2026-11-15: $450.00 ([[ATTR]])');
  });
});

describe('2b. Catalog Diff & Checksum Differential Attribute Trail Capture', () => {
  it('captures attribute-only and combined changes in diff_catalog trails and price_history.json', () => {
    withTempDir(tmpDir => {
      const historyDir = path.join(tmpDir, 'history');
      const day1Catalog = {
        metadata: { scrapeDate: '2026-11-14', totalUniqueSKUs: 2 },
        entries: [{
          parentCategory: 'Storage',
          subCategory: 'NVMe SSDs',
          skus: [
            { 'Product #': 'DRV-1', Description: '3.2TB NVMe Gen4 U.3 SSD', 'Unit Price (USD)': '1000.00', 'Lead Time': '14 days', 'Lifecycle Status': 'Active', 'CLIC Status': 'Valid' },
            { 'Product #': 'DRV-2', Description: '6.4TB NVMe Gen4 U.3 SSD', 'Unit Price (USD)': '2000.00', 'Lead Time': '21 days', 'Lifecycle Status': 'Active', 'CLIC Status': 'Valid' }
          ]
        }]
      };
      processCatalogDiff(day1Catalog, historyDir, 'catalog');

      const day2Catalog = {
        metadata: { scrapeDate: '2026-11-15', totalUniqueSKUs: 2 },
        entries: [{
          parentCategory: 'Storage',
          subCategory: 'NVMe Gen5 SSDs',
          skus: [
            { 'Product #': 'DRV-1', Description: '3.2TB NVMe Gen5 E3.S SSD', 'Unit Price (USD)': '1000.00', 'Lead Time': '7 days', 'Lifecycle Status': 'Active', 'CLIC Status': 'Valid' },
            { 'Product #': 'DRV-2', Description: '6.4TB NVMe Gen5 E3.S SSD', 'Unit Price (USD)': '2200.00', 'Lead Time': '21 days', 'Lifecycle Status': 'Active', 'CLIC Status': 'Valid' }
          ]
        }]
      };
      const diffRes = processCatalogDiff(day2Catalog, historyDir, 'catalog');
      assert.equal(diffRes.diffSummary.attributeChanged, 1);
      assert.equal(diffRes.diffSummary.priceAndAttributeChanged, 1);

      const skusById = Object.fromEntries(diffRes.enrichedCatalog.entries[0].skus.map(s => [s['Product #'], s]));
      assert.equal(skusById['DRV-1']['Diff Status'], 'ATTRIBUTE_CHANGED');
      assert.ok(skusById['DRV-1']['Attribute Deltas'].includes('Description: "3.2TB NVMe Gen4 U.3 SSD" → "3.2TB NVMe Gen5 E3.S SSD"'));
      assert.ok(skusById['DRV-1']['Attribute Deltas'].includes('Lead Time: "14 days" → "7 days"'));
      assert.ok(skusById['DRV-1']['Price History Trail'].includes('[Δ Attr:'));

      assert.equal(skusById['DRV-2']['Diff Status'], 'PRICE_AND_ATTRIBUTE_CHANGED');
      assert.equal(skusById['DRV-2']['Price Change (USD)'], '+$200.00');
      assert.ok(skusById['DRV-2']['Attribute Deltas'].includes('Description:'));

      const priceHistory = JSON.parse(fs.readFileSync(path.join(historyDir, 'price_history.json'), 'utf8'));
      const drv1Events = priceHistory['DRV-1'];
      assert.equal(Array.isArray(drv1Events), true);
      assert.equal(drv1Events.at(-1).status, 'ATTRIBUTE_CHANGED');
      assert.equal(drv1Events.at(-1).attributeDeltas.length >= 2, true);
      assert.equal(drv1Events.at(-1).attributeDeltas.some(d => d.includes('Description: "3.2TB NVMe Gen4 U.3 SSD"')), true);

      const attrHistory = JSON.parse(fs.readFileSync(path.join(historyDir, 'attribute_history.json'), 'utf8'));
      assert.ok(attrHistory.some(e => e.productNumber === 'DRV-1' && e.field === 'Lead Time' && e.newValue === '7 days'));
    });
  });

  it('records attributeDeltas on modifiedSkus in checksum_diff.computeIncrementalDifferential', () => {
    const prev = {
      entries: [{
        parentCategory: 'Networking',
        subCategory: 'Optics',
        skus: [{ 'Product #': 'OPT-1', Description: '25Gb SFP28 SR Optic', 'Unit Price (USD)': '120.00', 'Lead Time': '10 days' }]
      }]
    };
    const next = [{
      parentCategory: 'Networking',
      subCategory: 'Optics',
      skus: [{ 'Product #': 'OPT-1', Description: '25Gb SFP28 LR Optic 10km', 'Unit Price (USD)': '120.00', 'Lead Time': '5 days' }]
    }];

    const diff = computeIncrementalDifferential(next, prev);
    assert.equal(diff.stats.modifiedSkusCount, 1);
    assert.equal(diff.modifiedSkus[0].sku, 'OPT-1');
    const deltas = diff.modifiedSkus[0].changes.attributeDeltas;
    assert.equal(deltas.some(d => d.field === 'Description' && d.oldValue === '25Gb SFP28 SR Optic'), true);
    assert.equal(deltas.some(d => d.field === 'Lead Time' && d.newValue === '5 days'), true);
    assert.ok(diff.newSnapshot.skus['OPT-1'].hash);
  });
});

describe('2c. Preflight/Postflight Gate Counts, Markdown Summary & Synergy_12000_Frame Fix', () => {
  it('tallies ATTRIBUTE_CHANGED and PRICE_AND_ATTRIBUTE_CHANGED, writes markdown table, and sets qualityAuditPassed', () => {
    withTempDir(tmpDir => {
      const catPath = path.join(tmpDir, 'Test_Node_Catalog.json');
      const catalog = {
        metadata: { model: 'Test_Node', totalUniqueSKUs: 3, totalSubcategories: 1 },
        unavailableRules: [],
        entries: [{
          parentCategory: 'Memory',
          subCategory: 'DDR5',
          skus: [
            { 'Product #': 'MEM-1', Description: '32GB RDIMM', 'Unit Price (USD)': '500.00', 'Diff Status': 'ATTRIBUTE_CHANGED', 'Previous List Price (USD)': '500.00', 'Price Change (USD)': '$0.00', 'Attribute Deltas': 'Lead Time: "14d" → "7d"' },
            { 'Product #': 'MEM-2', Description: '64GB RDIMM', 'Unit Price (USD)': '990.00', 'Diff Status': 'PRICE_AND_ATTRIBUTE_CHANGED', 'Previous List Price (USD)': '900.00', 'Price Change (USD)': '+$90.00', 'Attribute Deltas': 'Description: "64GB Gen1" → "64GB RDIMM"' },
            { 'Product #': 'MEM-3', Description: '128GB RDIMM', 'Unit Price (USD)': '1800.00', 'Diff Status': 'UNCHANGED' }
          ]
        }]
      };
      fs.writeFileSync(catPath, JSON.stringify(catalog), 'utf8');

      const summary = summarizeCatalogDiffState(catPath);
      assert.equal(summary.diffCounts.ATTRIBUTE_CHANGED, 1);
      assert.equal(summary.diffCounts.PRICE_AND_ATTRIBUTE_CHANGED, 1);
      assert.equal(summary.diffCounts.MODIFIED, 2);
      assert.equal(summary.diffCounts.UNCHANGED, 1);

      const receipt = runScrapingPostflightVerification({
        liveOutputDir: tmpDir,
        liveCatalogJson: catPath,
        meta: { cleanName: 'Test_Node', family: 'Compute', gen: 'Gen12' },
        hwSkuCount: 3,
        serviceSkuCount: 0,
        totalSkuCount: 3,
        conditionalSkusCount: 0,
        postFlowSyncResult: { success: true, syncStatus: 'CLOUD_VERIFIED', notebookId: 'nb-1', verifiedSourceId: 'src-1' },
        preflightReport: { pass: true }
      });

      assert.equal(receipt.postflight.qualityAuditPassed, true);
      assert.equal(receipt.postflight.diffCounts.ATTRIBUTE_CHANGED, 1);
      assert.equal(receipt.postflight.diffCounts.PRICE_AND_ATTRIBUTE_CHANGED, 1);

      const md = fs.readFileSync(path.join(tmpDir, 'Test_Node_Catalog_Diff_Summary.md'), 'utf8');
      assert.ok(md.includes('Previous Price (USD)'));
      assert.ok(md.includes('Delta (USD)'));
      assert.ok(md.includes('Attribute Changes (Old → New)'));
      assert.ok(md.includes('MEM-1'));
      assert.ok(md.includes('+$90.00'));

      const failedMd = writeCatalogDiffSummaryMarkdown(null, { cleanName: 'X' }, { diffCounts: summary.diffCounts, changedRows: [] }, 3, 0);
      assert.ok(failedMd.includes('No SKU additions, modifications, or removals'));
    });
  });

  it('verifies Synergy_12000_Frame_Catalog_Diff_Summary.md is populated and non-blank', () => {
    const mdPath = path.join(PROJECT_ROOT, 'outputs', 'Synergy', 'General', 'Synergy_12000_Frame', 'Synergy_12000_Frame_Catalog_Diff_Summary.md');
    const md = fs.readFileSync(mdPath, 'utf8');
    assert.ok(md.trim().length > 100);
    assert.ok(md.includes('Price & Attribute Changed: 1'));
    assert.ok(md.includes('Previous Price (USD)'));
    assert.ok(md.includes('Delta (USD)'));
    assert.ok(md.includes('Attribute Changes (Old → New)'));
    assert.ok(md.includes('P83805-B21'));
  });
});

describe('2d. Post-Flow Sync QuickSpecs Await, Sync Payload Builder & Capture Receipt', () => {
  it('awaits quickSpecsSyncPromise in triggerPostFlowSyncAsync for success and failure paths', async () => {
    const successMod = loadIsolatedPostFlowSync(async () => ({ success: true, status: 'QUICKSPECS_SYNCED', sourceId: 'qs-99' }));
    const okRes = await successMod.triggerPostFlowSyncAsync('Acme_Server_X1', 'SCRAPE', { autoUploadNLM: true, persist: true });
    assert.equal(Object.hasOwn(okRes, 'quickSpecsSyncPromise'), false);
    assert.deepEqual(okRes.quickSpecsSync, { success: true, status: 'QUICKSPECS_SYNCED', sourceId: 'qs-99' });

    const rejectMod = loadIsolatedPostFlowSync(async () => { throw new Error('network timeout'); });
    const errRes = await rejectMod.triggerPostFlowSyncAsync('Acme_Server_X1', 'SCRAPE', { autoUploadNLM: true, persist: true });
    assert.equal(Object.hasOwn(errRes, 'quickSpecsSyncPromise'), false);
    assert.equal(errRes.quickSpecsSync.success, false);
    assert.equal(errRes.quickSpecsSync.status, 'QUICKSPECS_SYNC_ERROR');
  });

  it('includes priceAndAttributeChanged and service attribute history in sync payload sections', () => {
    const headerMd = _buildHeaderAndSummarySection(
      { vendor: 'Acme', pillar: 'Networking', family: 'Switch', generation: 'Gen2', productId: 'Acme_Switch' },
      'Acme_Switch',
      10,
      4,
      2,
      { added: 1, priceChanged: 1, attributeChanged: 2, priceAndAttributeChanged: 3, reinstated: 0 },
      { added: 0, priceChanged: 0, attributeChanged: 1, priceAndAttributeChanged: 2, reinstated: 0 }
    );
    assert.ok(headerMd.includes('Price & Attr Changed'));
    assert.ok(headerMd.includes('| **Hardware Components** | 10 | 1 | 1 | 2 | 3 | 0 |'));
    assert.ok(headerMd.includes('| **Support Services & SLAs** | 4 | 0 | 0 | 1 | 2 | 0 |'));
    assert.ok(headerMd.includes('| **Total Portfolio** | **14** | **1** | **1** | **3** | **5** | **0** |'));

    const attrMd = _buildAttributeHistorySection([], {
      servicesAttributeHistory: [
        { date: '2026-11-15', productNumber: 'SVC-3YR-PRO', field: 'Lead Time', oldValue: '5 days', newValue: '2 days' }
      ],
      catalogData: {
        entries: [{ parentCategory: 'Storage', skus: [{ 'Product #': 'NVME-1', 'Diff Status': 'ATTRIBUTE_CHANGED', 'Attribute Deltas': 'CLIC Status: "Pending" → "Valid"' }] }]
      },
      servicesData: { entries: [] }
    });
    assert.ok(attrMd.includes('| 2026-11-15 | Services | `SVC-3YR-PRO` | Lead Time | 5 days | **2 days** |'));
    assert.ok(attrMd.includes('| `NVME-1` | Hardware | ATTRIBUTE_CHANGED | CLIC Status: "Pending" → "Valid" |'));
  });

  it('captures modified SKUs and attributeDeltas in catalog_capture_receipt', () => {
    const before = { entries: [{ skus: [{ 'Product #': 'NIC-1', 'List Price (USD)': '400.00' }] }] };
    const after = {
      entries: [{
        skus: [{
          'Product #': 'NIC-1',
          'List Price (USD)': '400.00',
          'Diff Status': 'ATTRIBUTE_CHANGED',
          'Attribute Deltas': 'Description: "10G NIC" → "25G NIC"'
        }]
      }]
    };
    const delta = compareSkus(before, after);
    assert.equal(delta.modified.length, 1);
    assert.equal(delta.modified[0].diffStatus, 'ATTRIBUTE_CHANGED');
    assert.equal(delta.modified[0].attributeDeltas, 'Description: "10G NIC" → "25G NIC"');

    withTempDir(tmpDir => {
      const liveDir = path.join(tmpDir, 'live');
      const stagingDir = path.join(tmpDir, 'staging');
      const prefix = 'Acme_Test_Box';
      fs.mkdirSync(path.join(liveDir, 'raw_data'), { recursive: true });
      fs.mkdirSync(path.join(stagingDir, 'raw_data'), { recursive: true });

      const ts = new Date(Date.now() - 5000).toISOString();
      const baseCatalog = entries => ({
        metadata: { vendor: 'AcmeVendor', chassis: 'Acme Test Box', scrapeDate: '2026-11-15', scrapeTimestamp: ts, totalUniqueSKUs: 1 },
        entries
      });
      const liveEntries = [{ parentCategory: 'Chassis', subCategory: 'Base', skus: [{ 'Product #': 'BOX-1', Description: 'Acme Box Gen1', 'Unit Price (USD)': '2000.00', 'List Price (USD)': '2000.00' }] }];
      const nextEntries = [{ parentCategory: 'Chassis', subCategory: 'Base', skus: [{ 'Product #': 'BOX-1', Description: 'Acme Box Gen2', 'Unit Price (USD)': '2000.00', 'List Price (USD)': '2000.00', 'Diff Status': 'ATTRIBUTE_CHANGED', 'Attribute Deltas': 'Description: "Acme Box Gen1" → "Acme Box Gen2"' }] }];

      for (const [dir, entries] of [[liveDir, liveEntries], [stagingDir, nextEntries]]) {
        fs.writeFileSync(path.join(dir, `${prefix}_Catalog.json`), JSON.stringify(baseCatalog(entries)), 'utf8');
        fs.writeFileSync(path.join(dir, `${prefix}_Services.json`), JSON.stringify({ metadata: { totalUniqueSKUs: 0 }, entries: [] }), 'utf8');
        fs.writeFileSync(path.join(dir, `${prefix}_Catalog_Rules.json`), JSON.stringify({ rules: [] }), 'utf8');
        writeMinimalXlsxScraps(dir, prefix, entries);
        execFileSync(process.execPath, [GENERATE_XLSX_SCRIPT, path.join(dir, `${prefix}_OCA_Catalog.xlsx`)], { cwd: PROJECT_ROOT, stdio: 'pipe' });
      }
      fs.writeFileSync(path.join(stagingDir, 'raw_data', 'oca_raw_data_full.json'), JSON.stringify({
        vendor: 'AcmeVendor',
        timestamp: ts,
        selectedBaseSku: 'BOX-1',
        ownerConfiguration: 'Acme Config',
        solutionDomain: 'Storage',
        observedSelectors: ['#menu'],
        finalSelectorsRestored: true
      }), 'utf8');

      const receipt = createCaptureReceipt(stagingDir, liveDir, prefix, { skipCoverageValidation: true });
      assert.equal(receipt.vendor, 'AcmeVendor');
      assert.equal(receipt.deltas.modifiedCount, 1);
      assert.equal(receipt.deltas.modifiedSkus[0].attributeDeltas, 'Description: "Acme Box Gen1" → "Acme Box Gen2"');

      const completed = finalizeCaptureReceipt(stagingDir, receipt, { syncStatus: 'CLOUD_VERIFIED', success: true, verifiedSourceId: 'src-rec-1' });
      assert.equal(completed.cloud.status, 'CLOUD_VERIFIED');
      assert.equal(completed.deltas.modifiedCount, 1);
    });
  });
});

describe('2e. Multi-Vendor Registration, Solution Domains & MCP Readiness Tools', () => {
  it('supports custom non-HPE vendor registration, multi-pillar routing, and product identity resolution', async () => {
    const customVendor = 'AcmeCloudSystems';
    try {
      assert.equal(normalizeSolutionPillar('compute'), 'Server');
      assert.equal(normalizeSolutionPillar('alletra'), 'Storage');
      assert.equal(normalizeSolutionPillar('san'), 'Networking');
      assert.equal(normalizeSolutionPillar('fabric'), 'Networking');

      registerCustomVendorPortalPolicy(customVendor, {
        portalUrl: 'https://config.acmecloud.example/portal',
        urlPatterns: ['config.acmecloud.example'],
        supportedPillars: ['Server', 'Storage', 'Networking'],
        tableSelectors: { tableSelector: 'table.bom-grid' },
        scrapingInstructions: { extractionMode: 'DOM_TABLE' }
      });

      const policy = resolvePortalSessionPolicy({ portalUrl: 'https://config.acmecloud.example/portal/san', pillar: 'san' });
      assert.equal(policy.vendor, customVendor);
      assert.equal(policy.isCustom, true);
      assert.deepEqual(policy.supportedPillars, ['Server', 'Storage', 'Networking']);

      registerVendorScraperAdapter(customVendor, {
        vendor: customVendor,
        portalUrl: 'https://config.acmecloud.example/portal',
        supportedPillars: ['Server', 'Storage', 'Networking'],
        selectors: { tableSelector: 'table.bom-grid' }
      });

      const byVendor = getScraperAdapterForPortal('https://config.acmecloud.example/portal');
      assert.equal(byVendor.vendor, customVendor);
      assert.equal(byVendor.adapterType, 'CONFIGURABLE_DOM');
      const extracted = await byVendor.extractCatalogTree({});
      assert.equal(extracted.adapterType, 'CONFIGURABLE_DOM');
      assert.ok(listRegisteredVendorAdapters().some(a => a.vendor === customVendor && a.isCustom === true));

      const domainNet = defaultClassifySolutionDomain({ description: 'Spine Switch 100GbE Fabric' });
      assert.equal(domainNet.domainPillar, 'Networking');
      assert.equal(domainNet.matchedBy, 'entry_keyword');

      const domainStore = defaultClassifySolutionDomain({ description: 'Generic Chassis Fan' }, { pillar: 'Storage' });
      assert.equal(domainStore.domainPillar, 'Storage');
      assert.equal(domainStore.matchedBy, 'context_pillar');

      const unregistered = resolveExpectedProductIdentity('Acme Array X9000', {}, customVendor);
      assert.equal(unregistered?.vendor, customVendor);
      const registered = resolveExpectedProductIdentity(
        'Acme Array X9000',
        { notebooks: { Acme_Array_X9000: { vendor: customVendor, pillar: 'Storage', family: 'Acme', generation: 'Gen2' } } },
        customVendor
      );
      assert.equal(registered?.vendor, customVendor);
      assert.equal(registered?.pillar, 'Storage');
    } finally {
      unregisterVendorScraperAdapter(customVendor);
      unregisterCustomVendorPortalPolicy(customVendor);
    }
  });

  it('exposes inspectCatalogDeltas and checkPortalAndSyncReadiness across real products and custom vendors', () => {
    const deltaSingle = inspectCatalogDeltas({ product: 'Synergy_12000_Frame' });
    assert.equal(deltaSingle.found, true);
    assert.equal(deltaSingle.mode, 'SINGLE_PRODUCT');
    assert.equal(deltaSingle.nlmSyncConfirmed, true);
    assert.equal(deltaSingle.diffCounts.priceAndAttributeChanged, 1);
    assert.ok(deltaSingle.modifiedSkus.some(s => s.sku === 'P83805-B21' && s.attributeDeltas));

    const readinessReal = checkPortalAndSyncReadiness({ product: 'DL380_Gen12' });
    assert.equal(readinessReal.products.length, 1);
    const dl380Readiness = readinessReal.products[0];
    assert.equal(dl380Readiness.product, 'DL380_Gen12');
    assert.equal(dl380Readiness.catalogFound, true);
    const expectedFreshnessStatus = dl380Readiness.freshness.ageDays <= 3
      ? 'FRESH'
      : (dl380Readiness.freshness.ageDays <= 30 ? 'STALE_WARNING' : 'CRITICAL_OUTDATED');
    assert.equal(dl380Readiness.freshness.status, expectedFreshnessStatus);
    assert.equal(dl380Readiness.freshness.isFresh, expectedFreshnessStatus === 'FRESH');
    assert.equal(dl380Readiness.nlmSyncConfirmed, true);

    const customVendor = 'AcmeMcpVendor';
    try {
      registerCustomVendorPortalPolicy(customVendor, {
        portalUrl: 'https://partner.acmemcp.example/config',
        supportedPillars: ['Storage', 'Networking'],
        tableSelectors: { tableSelector: '.sku-row' }
      });
      registerVendorScraperAdapter(customVendor, {
        vendor: customVendor,
        portalUrl: 'https://partner.acmemcp.example/config',
        supportedPillars: ['Storage', 'Networking'],
        selectors: { tableSelector: '.sku-row' }
      });

      const readinessCustom = checkPortalAndSyncReadiness({
        vendor: customVendor,
        portalUrl: 'https://partner.acmemcp.example/config',
        pillar: 'Networking'
      });
      assert.equal(readinessCustom.portalReadiness.vendor, customVendor);
      assert.equal(readinessCustom.portalReadiness.isRegistered, true);
      assert.equal(readinessCustom.portalReadiness.isCustomRegistered, true);
      assert.equal(readinessCustom.portalReadiness.adapterType, 'CONFIGURABLE_DOM');
      assert.equal(readinessCustom.portalReadiness.requestedPillar, 'Networking');
      assert.equal(readinessCustom.portalReadiness.requestedPillarSupported, true);

      const readinessUnsupportedPillar = checkPortalAndSyncReadiness({
        vendor: customVendor,
        pillar: 'Server'
      });
      assert.equal(readinessUnsupportedPillar.portalReadiness.requestedPillar, 'Server');
      assert.equal(readinessUnsupportedPillar.portalReadiness.requestedPillarSupported, false);
    } finally {
      unregisterVendorScraperAdapter(customVendor);
      unregisterCustomVendorPortalPolicy(customVendor);
    }
  });
});

describe('Wave 2. Duplicate-PN Diffs, Storage/Networking Rules, CDP 404 Detection & Storage Scraper Parity', () => {
  it('matches duplicate-PN rows against their exact candidate row in diff_catalog.js', () => {
    withTempDir(tmpDir => {
      const historyDir = path.join(tmpDir, 'history');
      const day1 = {
        metadata: { scrapeDate: '2026-11-14', totalUniqueSKUs: 1 },
        entries: [{
          parentCategory: 'Compute Nodes',
          subCategory: 'Synergy Compute',
          skus: [
            { 'Product #': 'P83805-B21', Description: 'Solution Compute Node', 'Option Type': 'CTO', 'Unit Price (USD)': '3000.00', 'Lead Time': '14 days' },
            { 'Product #': 'P83805-B21', Description: 'for SAP HANA Compute Node', 'Option Type': 'CTO', 'Unit Price (USD)': '3463.00', 'Lead Time': '14 days' }
          ]
        }]
      };
      processCatalogDiff(day1, historyDir, 'catalog');

      const day2 = {
        metadata: { scrapeDate: '2026-11-15', totalUniqueSKUs: 1 },
        entries: [{
          parentCategory: 'Compute Nodes',
          subCategory: 'Synergy Compute',
          skus: [
            { 'Product #': 'P83805-B21', Description: 'for SAP HANA Compute Node', 'Option Type': 'CTO', 'Unit Price (USD)': '3463.00', 'Lead Time': '7 days' },
            { 'Product #': 'P83805-B21', Description: 'Solution Compute Node', 'Option Type': 'CTO', 'Unit Price (USD)': '3000.00', 'Lead Time': '14 days' }
          ]
        }]
      };
      const diffRes = processCatalogDiff(day2, historyDir, 'catalog');
      const skus = diffRes.enrichedCatalog.entries[0].skus;
      const hanaRow = skus.find(s => s.Description === 'for SAP HANA Compute Node');
      const solRow = skus.find(s => s.Description === 'Solution Compute Node');

      assert.equal(hanaRow['Diff Status'], 'ATTRIBUTE_CHANGED');
      assert.equal(hanaRow['Previous List Price (USD)'], '3463.00');
      assert.ok(hanaRow['Attribute Deltas'].includes('Lead Time: "14 days" → "7 days"'));
      assert.equal(solRow['Diff Status'], 'UNCHANGED');
      assert.equal(solRow['Price Change (USD)'], '$0.00');
    });
  });

  it('normalizes alternate Storage/Networking rule schemas in catalog_rules.js and validates Alletra rules JSON', () => {
    const { _parseRawRules, loadCatalogRules } = require('../../scripts/lib/catalog/catalog_rules.js');
    const parsed = _parseRawRules({
      metadata: { pillar: 'NETWORKING' },
      rules: [
        {
          ruleId: 'RULE_SW_UPLINK',
          description: 'Requires 2x 100GbE QSFP28 transceivers per switch.',
          type: 'FABRIC_REQUIREMENT',
          affectedSku: 'SW-100G-01'
        }
      ]
    });
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].ruleId, 'RULE_SW_UPLINK');
    assert.equal(parsed[0].affectedSku, 'SW-100G-01');
    assert.equal(parsed[0].type, 'FABRIC_REQUIREMENT');
    assert.equal(parsed[0].parentCategory, 'NETWORKING');
    assert.ok(parsed[0].ruleText.includes('100GbE QSFP28'));

    const alletraDir = path.join(PROJECT_ROOT, 'outputs', 'Alletra', 'Storage', 'Alletra_Storage_System');
    const alletraLoaded = loadCatalogRules(alletraDir);
    assert.ok(alletraLoaded.parsedRules.length >= 3);
    const mpRule = alletraLoaded.parsedRules.find(r => r.ruleId === 'RULE_ALLETRA_MP_B10000_CTO_CHASSIS');
    assert.ok(mpRule);
    assert.equal(mpRule.affectedSku, 'R0Q37A');
    assert.equal(mpRule.parentCategory, 'Storage Systems');
    assert.ok(mpRule.ruleText.includes('($43,200.00)'));
    assert.equal(mpRule.ruleText.includes('(,200.00)'), false);
  });

  it('detects non-CDP HTTP 404 listener on port in probeCdpPort, ensureChromeBrowserRunning, auditCdpPortal, and dashboard routes', async () => {
    const http = require('node:http');
    const { probeCdpPort, isCdpAlive, ensureChromeBrowserRunning } = require('../../scripts/lib/scraper/browser_launcher.js');
    const { auditCdpPortal } = require('../../scripts/maintenance/check_all_auth.js');

    const srv = http.createServer((_req, res) => {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    });
    await new Promise(resolve => srv.listen(0, '127.0.0.1', resolve));
    const port = srv.address().port;
    try {
      const probe = await probeCdpPort(port);
      assert.equal(probe.alive, false);
      assert.equal(probe.occupiedByNonCdp, true);
      assert.equal(probe.statusCode, 404);
      assert.equal(await isCdpAlive(port), false);

      const launchRes = await ensureChromeBrowserRunning(port, 'https://partner.hpe.com');
      assert.equal(launchRes.ok, false);
      assert.equal(launchRes.wasLaunched, false);
      assert.equal(launchRes.occupiedByNonCdp, true);
      assert.equal(launchRes.statusCode, 404);
      assert.ok(launchRes.error.includes('404'));
    } finally {
      await new Promise(resolve => srv.close(resolve));
    }

    const origFetch = global.fetch;
    global.fetch = async () => ({ ok: false, status: 404, json: async () => ([]) });
    try {
      const cdpAudit = await auditCdpPortal();
      assert.equal(cdpAudit.status, 'STANDBY');
      assert.equal(cdpAudit.portConflict, true);
      assert.equal(cdpAudit.httpStatus, 404);

      const catalogsRouter = require('../../dashboard/routes/catalogs.cjs');
      const cdpLayer = catalogsRouter.stack.find(l => l.route?.path === '/cdp-status');
      let cdpPayload = null;
      await cdpLayer.route.stack[0].handle({}, { json: body => { cdpPayload = body; } });
      assert.equal(cdpPayload.status, 'STANDBY');
      assert.equal(cdpPayload.portConflict, true);
      assert.equal(cdpPayload.httpStatus, 404);
    } finally {
      global.fetch = origFetch;
    }

    const browserLauncher = require('../../scripts/lib/scraper/browser_launcher.js');
    const origEnsure = browserLauncher.ensureChromeBrowserRunning;
    browserLauncher.ensureChromeBrowserRunning = async () => ({
      ok: false,
      wasLaunched: false,
      port: 9222,
      occupiedByNonCdp: true,
      statusCode: 404,
      error: 'Port 9222 occupied by non-CDP listener'
    });
    try {
      const tasksRouter = require('../../dashboard/routes/tasks.cjs');
      const launchLayer = tasksRouter.stack.find(l => l.route?.path === '/launch-browser');
      let statusSent = 200;
      let bodySent = null;
      const mockRes = {
        status(code) { statusSent = code; return this; },
        json(body) { bodySent = body; return this; }
      };
      await launchLayer.route.stack[0].handle({}, mockRes);
      assert.equal(statusSent, 503);
      assert.ok(JSON.stringify(bodySent).includes('non-CDP listener'));
    } finally {
      browserLauncher.ensureChromeBrowserRunning = origEnsure;
    }
  });

  it('integrates preflight/postflight in scrape_oca_storage_solution.js and NLM transport failover in sync_scraping_workflow_learnings.js', async () => {
    const { _parseCliArgs, auditAndPromoteStorageStaging } = require('../../scripts/scrapers/scrape_oca_storage_solution.js');
    const cli = _parseCliArgs([
      'node', 'scrape_oca_storage_solution.js',
      '--chassis', 'Alletra 6000',
      '--vendor', 'AcmeStorage',
      '--portal-url', 'https://storage.acme.example/wizard'
    ]);
    assert.equal(cli.targetChassisQuery, 'Alletra 6000');
    assert.equal(cli.vendor, 'AcmeStorage');
    assert.equal(cli.portalUrl, 'https://storage.acme.example/wizard');

    await withTempDir(async tmpDir => {
      const stagingDir = path.join(tmpDir, 'staging');
      const liveDir = path.join(tmpDir, 'live');
      const prefix = 'Acme_Storage_Array';
      fs.mkdirSync(path.join(stagingDir, 'raw_data'), { recursive: true });
      const ts = new Date(Date.now() - 3000).toISOString();
      const entries = buildDiffTsvEntries();

      fs.writeFileSync(path.join(stagingDir, `${prefix}_Catalog.json`), JSON.stringify({
        metadata: { vendor: 'AcmeStorage', model: prefix, chassis: 'Acme Storage Array', scrapeDate: '2026-11-15', scrapeTimestamp: ts, totalUniqueSKUs: 2 },
        entries
      }), 'utf8');
      fs.writeFileSync(path.join(stagingDir, `${prefix}_Services.json`), JSON.stringify({ metadata: { totalUniqueSKUs: 0 }, entries: [] }), 'utf8');
      fs.writeFileSync(path.join(stagingDir, `${prefix}_Catalog_Rules.json`), JSON.stringify({ rules: [] }), 'utf8');
      writeMinimalXlsxScraps(stagingDir, prefix, entries);
      const xlsxPath = path.join(stagingDir, `${prefix}_OCA_Catalog.xlsx`);
      execFileSync(process.execPath, [GENERATE_XLSX_SCRIPT, xlsxPath], { cwd: PROJECT_ROOT, stdio: 'pipe' });
      fs.writeFileSync(path.join(stagingDir, 'raw_data', 'oca_raw_data_full.json'), JSON.stringify({
        vendor: 'AcmeStorage',
        timestamp: ts,
        selectedBaseSku: 'SKU-ATTR-1',
        ownerConfiguration: 'Acme Storage Config',
        solutionDomain: 'STORAGE',
        observedSelectors: ['#wizard'],
        finalSelectorsRestored: true
      }), 'utf8');

      await auditAndPromoteStorageStaging(
        stagingDir,
        { cleanName: prefix, family: 'Alletra', gen: 'Storage' },
        path.join(stagingDir, `${prefix}_Catalog.json`),
        xlsxPath,
        {
          liveOutputDir: liveDir,
          skipExcelTallyVerify: true,
          skipCoverageValidation: true,
          throwOnAuditFailure: true,
          vendor: 'AcmeStorage',
          portalUrl: 'https://storage.acme.example/wizard',
          preflightReport: { pass: true },
          syncOptions: { autoUploadNLM: false, syncRunningKnowledge: false }
        }
      );

      assert.equal(fs.existsSync(path.join(liveDir, `${prefix}_Catalog_Diff_Summary.md`)), true);
      const verReceipt = JSON.parse(fs.readFileSync(path.join(liveDir, 'scraping_verification_receipt.json'), 'utf8'));
      assert.equal(verReceipt.postflight.qualityAuditPassed, true);
      assert.equal(verReceipt.postflight.diffCounts.ATTRIBUTE_CHANGED, 1);
      assert.equal(verReceipt.postflight.diffCounts.PRICE_AND_ATTRIBUTE_CHANGED, 1);
      const capReceipt = JSON.parse(fs.readFileSync(path.join(liveDir, 'capture_receipt.json'), 'utf8'));
      assert.equal(capReceipt.vendor, 'AcmeStorage');
    });

    const quickspecsSrc = fs.readFileSync(path.join(PROJECT_ROOT, 'scripts', 'lib', 'sync', 'quickspecs_sync.js'), 'utf8');
    assert.ok(quickspecsSrc.includes('nlmEnvironment(extendedPath, false)'));
    assert.ok(quickspecsSrc.includes("PYTHONIOENCODING: 'utf-8'"));

    const learningsSrc = fs.readFileSync(path.join(PROJECT_ROOT, 'scripts', 'maintenance', 'sync_scraping_workflow_learnings.js'), 'utf8');
    assert.ok(learningsSrc.includes('execNlmRead'));
    assert.ok(learningsSrc.includes('nlmEnvironment(extendedPath, false)'));
  });

  it('resolves fallback CDP port on non-CDP conflict and detects shorthand G12 ProLiant platforms accurately', async () => {
    const http = require('node:http');
    const {
      resolveAvailableFallbackCdpPort,
      ensureChromeBrowserRunning
    } = require('../../scripts/lib/scraper/browser_launcher.js');
    const { detectChassisVariant } = require('../../scripts/lib/catalog/catalog_discovery.js');
    const { parseProductMeta } = require('../../scripts/lib/catalog/product_meta.js');

    const conflictSrv = http.createServer((_req, res) => {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    });
    await new Promise(resolve => conflictSrv.listen(0, '127.0.0.1', resolve));
    const conflictPort = conflictSrv.address().port;

    try {
      const strictRes = await ensureChromeBrowserRunning(conflictPort, 'https://partner.hpe.com');
      assert.equal(strictRes.ok, false);
      assert.equal(strictRes.occupiedByNonCdp, true);

      const fallback = await resolveAvailableFallbackCdpPort(conflictPort);
      assert.ok(fallback && Number.isInteger(fallback.port));
      assert.notEqual(fallback.port, conflictPort);
      assert.ok(fallback.port >= 9223 && fallback.port <= 9245);
    } finally {
      await new Promise(resolve => conflictSrv.close(resolve));
    }

    const detected = detectChassisVariant([
      { sku: 'P72176-B21  AKM', description: 'HPE DL360 G12 10SFF/20EDSFF Hyb Configure-to-order Server' }
    ]);
    assert.equal(detected.id, 'DL360_Gen12');
    assert.equal(detected.gen, 'Gen12');
    assert.equal(detected.uHeight, 1);

    const parsedMeta = parseProductMeta('HPE DL360 G12 10SFF/20EDSFF Hyb Configure-to-order Server');
    assert.deepEqual(parsedMeta, { family: 'ProLiant', gen: 'Gen12', cleanName: 'DL360_Gen12' });
  });
});

