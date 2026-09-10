'use strict';
/**
 * tests/unit/test_phase1_audit_contracts.js
 *
 * Unit & edge-case test suite for Phase 1 Audit Contracts:
 * 1. Old-but-valid captures (discovery contemporaneous with scrape passes in historical mode).
 * 2. Stale promotion (discovery >300s old fails in --pre-promotion mode).
 * 3. Corrupt baseline (corrupted baseline snapshot JSON throws an explicit assertion error, never swallowed).
 * 4. Same-day rerun (current snapshot is excluded from earlier snapshots, preventing self-comparison).
 * 5. >30% real SKU drop (active hardware drop below 70% retention triggers hard assertion failure).
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const XLSX = require('xlsx-js-style');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const VERIFY_SCRIPT = path.join(PROJECT_ROOT, 'tests', 'integration', 'verify_excel_tally.js');

function createMockAuditFixture(opts = {}) {
  const tmpDir = path.join(os.tmpdir(), 'audit_contract_test_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8));
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.mkdirSync(path.join(tmpDir, 'raw_data'), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, 'history'), { recursive: true });

  const filePrefix = opts.filePrefix || 'DL145_Gen11';
  const scrapeTime = opts.scrapeTime || '2026-09-10T12:00:00.000Z';
  const discoveryTime = opts.discoveryTime || '2026-09-10T11:59:00.000Z'; // 60s delta

  // 1. Write chassis_discovery.json
  const discovery = {
    query: filePrefix,
    selectedSku: 'P71964-B21',
    capturedAt: discoveryTime,
    candidates: [
      {
        sku: 'P71964-B21',
        text: 'P71964-B21 - HPE ProLiant DL145 Gen11 Configure-to-order Server',
        isCto: true,
        eligible: true
      }
    ]
  };
  fs.writeFileSync(path.join(tmpDir, 'raw_data', 'chassis_discovery.json'), JSON.stringify(discovery, null, 2));

  // 2. Write Catalog.json
  const skus = (opts.skus || [
    { 'Product #': 'P71964-B21', Description: 'HPE ProLiant DL145 Gen11 Configure-to-order Server', 'Option Type': 'CTO', 'Unit Price (USD)': '2375.00', 'Current Qty': '1', Availability: 'Available', 'Lead Time': '14 days', 'Start Date': '2025-06-01', 'Discontinued Date': '2029-12-31', 'Lifecycle Status': 'Active' },
    { 'Product #': 'P74573-B21', Description: 'Intel Xeon 6730P Processor', 'Option Type': 'Standard', 'Unit Price (USD)': '10516.00', 'Current Qty': '1', Availability: 'Available', 'Lead Time': '14 days', 'Start Date': '2025-06-01', 'Discontinued Date': '2029-12-31', 'Lifecycle Status': 'Active' }
  ]);

  const catalog = {
    metadata: {
      chassis: filePrefix,
      scrapeDate: '2026-09-10',
      scrapeTimestamp: scrapeTime,
      totalUniqueSKUs: skus.length,
      historySnapshot: opts.currentSnapshotName || 'catalog_2026-09-10.json'
    },
    entries: [
      {
        parentCategory: 'Chassis',
        subCategory: 'Variants',
        skus: [skus[0]]
      },
      {
        parentCategory: 'Processor',
        subCategory: 'Processors',
        skus: skus.slice(1)
      }
    ]
  };
  fs.writeFileSync(path.join(tmpDir, `${filePrefix}_Catalog.json`), JSON.stringify(catalog, null, 2));

  // 3. Write Excel workbook
  const wb = XLSX.utils.book_new();
  const allSkusRows = skus.map(s => ({
    'Product #': s['Product #'],
    'Description': s.Description,
    'Option Type': s['Option Type'],
    'Hierarchy Path': 'Chassis > Compute > Server > ' + s['Product #'],
    'Current Qty': s['Current Qty'],
    'Unit Price (USD)': parseFloat(s['Unit Price (USD)']),
    'Availability': s.Availability,
    'Lead Time': s['Lead Time'],
    'Lead Time Source': 'OCA row attribute',
    'Lifecycle Status': 'Active',
    'Start Date': s['Start Date'],
    'Discontinued Date': s['Discontinued Date'],
    'Vendor Attributes (JSON)': '{}'
  }));

  const wsAll = XLSX.utils.json_to_sheet(allSkusRows);
  XLSX.utils.book_append_sheet(wb, wsAll, 'All SKUs');

  const wsSummary = XLSX.utils.json_to_sheet([
    { 'Category': 'Chassis', 'Total SKUs': 1 },
    { 'Category': 'Processor', 'Total SKUs': skus.length - 1 }
  ]);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Category Summary');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ Rule: 'Test Rule' }]), 'Rules & Constraints');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ Metric: 'Total', Value: skus.length }]), 'Metadata');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([allSkusRows[0]]), 'Chassis');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allSkusRows.slice(1)), 'Processor');

  const xlsxPath = path.join(tmpDir, `${filePrefix}_OCA_Catalog.xlsx`);
  XLSX.writeFile(wb, xlsxPath);

  // 4. Setup history
  const defaultHistory = {
    [opts.currentSnapshotName || 'catalog_2026-09-10.json']: catalog
  };
  const historyFiles = { ...defaultHistory, ...(opts.historyFiles || {}) };
  for (const [filename, content] of Object.entries(historyFiles)) {
    fs.writeFileSync(path.join(tmpDir, 'history', filename), typeof content === 'string' ? content : JSON.stringify(content, null, 2));
  }

  return { tmpDir, xlsxPath };
}

test('Phase 1 Contract: Old-but-valid capture passes in historical artifact mode', () => {
  // Discovery and scrape happened 5 hours ago, 45 seconds apart
  const fiveHoursAgo = new Date(Date.now() - 5 * 3600 * 1000).toISOString();
  const discoveryTime = new Date(Date.parse(fiveHoursAgo) - 45 * 1000).toISOString();

  const { tmpDir, xlsxPath } = createMockAuditFixture({
    scrapeTime: fiveHoursAgo,
    discoveryTime: discoveryTime
  });

  try {
    const output = execSync(`node "${VERIFY_SCRIPT}" "${xlsxPath}"`, {
      cwd: PROJECT_ROOT,
      encoding: 'utf8'
    });
    assert.match(output, /ALL AUDIT CHECKS PASSED/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Phase 1 Contract: Stale promotion fails when --pre-promotion is passed with old capture', () => {
  // Discovery happened 10 minutes ago
  const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { tmpDir, xlsxPath } = createMockAuditFixture({
    scrapeTime: new Date().toISOString(),
    discoveryTime: tenMinsAgo
  });

  try {
    assert.throws(() => {
      execSync(`node "${VERIFY_SCRIPT}" "${xlsxPath}" --pre-promotion`, {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
        stdio: 'pipe'
      });
    }, (err) => {
      return /maximum 300s/i.test(err.message || err.stderr?.toString());
    });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Phase 1 Contract: Corrupted baseline snapshot throws explicit assertion error', () => {
  const { tmpDir, xlsxPath } = createMockAuditFixture({
    historyFiles: {
      'catalog_2026-09-08.json': '{ corrupt invalid json syntax ...',
      'catalog_2026-09-10.json': { metadata: { scrapeDate: '2026-09-10' }, entries: [] }
    }
  });

  try {
    assert.throws(() => {
      execSync(`node "${VERIFY_SCRIPT}" "${xlsxPath}"`, {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
        stdio: 'pipe'
      });
    }, (err) => {
      return /Corrupt or unreadable baseline snapshot/i.test(err.message || err.stderr?.toString());
    });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Phase 1 Contract: Same-day rerun excludes current snapshot from baseline comparison', () => {
  // Only the current snapshot exists in history (same day rerun)
  const { tmpDir, xlsxPath } = createMockAuditFixture({
    currentSnapshotName: 'catalog_2026-09-10.json',
    historyFiles: {
      'catalog_2026-09-10.json': { metadata: { scrapeDate: '2026-09-10' }, entries: [] }
    }
  });

  try {
    const output = execSync(`node "${VERIFY_SCRIPT}" "${xlsxPath}"`, {
      cwd: PROJECT_ROOT,
      encoding: 'utf8'
    });
    // Must recognize first baseline established rather than self-comparison
    assert.match(output, /First baseline established/i);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Phase 1 Contract: >30% real active hardware drop triggers INV-23 hard assertion failure', () => {
  // Baseline had 60 hardware SKUs
  const baselineSkus = [];
  for (let i = 1; i <= 60; i++) {
    baselineSkus.push({
      'Product #': `P${String(10000 + i).padStart(5, '0')}-B21`,
      Description: `Component ${i}`,
      'Option Type': 'Standard'
    });
  }
  const baselineCatalog = {
    metadata: { scrapeDate: '2026-09-08' },
    entries: [
      {
        parentCategory: 'Memory',
        subCategory: 'Smart Memory',
        skus: baselineSkus
      }
    ]
  };

  // Current catalog only has 20 hardware SKUs (66% drop, far below 70% retention threshold)
  const { tmpDir, xlsxPath } = createMockAuditFixture({
    historyFiles: {
      'catalog_2026-09-08.json': baselineCatalog,
      'catalog_2026-09-10.json': { metadata: { scrapeDate: '2026-09-10' }, entries: [] }
    }
  });

  try {
    assert.throws(() => {
      execSync(`node "${VERIFY_SCRIPT}" "${xlsxPath}"`, {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
        stdio: 'pipe'
      });
    }, (err) => {
      return /INV-23 active hardware retention is >=70%/i.test(err.message || err.stderr?.toString());
    });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
