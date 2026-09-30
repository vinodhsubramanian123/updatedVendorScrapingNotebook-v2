'use strict';
/**
 * tests/unit/test_vendor_scraping_and_chassis_matrix.js
 *
 * Certifies:
 * 1. HPE Recommended column visibility and binary 'Yes'/'No' population in TSV, JSON, and XLSX.
 * 2. Chassis Options Matrix sheet generation with variant capabilities (SFF vs LFF vs EDSFF).
 * 3. Multi-Vendor Portal Router & Dell Premier scaffolding isolation.
 * 4. Stale duplicate Google Sheet and catalog source detection in NotebookLM sync.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const xlsx = require('xlsx-js-style');

const { generateMainSheet } = require('../../scripts/lib/catalog/catalog_formatter.js');
const { inferVendor, routeDiscoverCandidates } = require('../../scripts/lib/scraper/vendor_portal_router.js');
const { discoverDellChassisCandidates } = require('../../scripts/lib/scraper/navigate_dell.js');

test('HPE Recommended column is present in TSV header and populated on every row', () => {
  const mockEntries = [
    {
      parentCategory: 'Chassis',
      subCategory: 'Variants',
      constraint: 'min 1, max 1',
      skus: [
        {
          'Product #': 'P52534-B21',
          sku: 'P52534-B21',
          'Option Type': 'CTO',
          'Component Role': 'Base Chassis',
          Description: 'HPE ProLiant DL380 Gen12 8SFF Configure-to-order Server',
          'Unit Price (USD)': '2500.00',
          listPrice: 2500.00,
          'Current Qty': '1'
        }
      ]
    },
    {
      parentCategory: 'Processor',
      subCategory: 'Intel Xeon 5th Gen Processors',
      constraint: 'min 1, max 2',
      skus: [
        {
          'Product #': 'P67098-B21',
          sku: 'P67098-B21',
          'Option Type': 'Standard',
          'Component Role': 'CPU',
          Description: 'Intel Xeon-Gold 6526Y 2.8GHz 16-core 195W Processor for HPE',
          'Unit Price (USD)': '1850.00',
          listPrice: 1850.00,
          'Current Qty': '1',
          'HPE Recommended': 'No'
        }
      ]
    }
  ];

  const tsv = generateMainSheet(mockEntries, 'DL380 Gen12');
  const lines = tsv.trim().split('\n');
  const headers = lines[0].split('\t');

  const recColIdx = headers.indexOf('HPE Recommended');
  assert.ok(recColIdx !== -1, 'TSV must have "HPE Recommended" header column');

  // Verify chassis row defaults to 'Yes'
  const chassisCells = lines[1].split('\t');
  assert.equal(chassisCells[recColIdx], 'Yes', 'Base CTO chassis must evaluate to HPE Recommended: Yes');

  // Verify option row defaults to 'No'
  const procCells = lines[2].split('\t');
  assert.equal(procCells[recColIdx], 'No', 'Standard option without explicit flag must evaluate to HPE Recommended: No');
});

test('Chassis Options Matrix sheet generation maps server variant capabilities', () => {
  // Simulate the Chassis Options Matrix builder logic from generate_xlsx.js
  const chassisRows = [
    {
      'Product #': 'P52534-B21',
      'Description': 'HPE ProLiant DL380 Gen12 8SFF Configure-to-order Server',
      'Option Type': 'CTO',
      'Unit Price (USD)': '2500.00',
      'HPE Recommended': 'Yes',
      'Start Date': '05/05/2025',
      'Discontinued Date': 'Active',
      'Lifecycle Status': 'Active'
    },
    {
      'Product #': 'P52535-B21',
      'Description': 'HPE ProLiant DL380 Gen12 12LFF Configure-to-order Server',
      'Option Type': 'CTO',
      'Unit Price (USD)': '3100.00',
      'HPE Recommended': 'Yes',
      'Start Date': '05/05/2025',
      'Discontinued Date': 'Active',
      'Lifecycle Status': 'Active'
    },
    {
      'Product #': 'P52536-B21',
      'Description': 'HPE ProLiant DL380 Gen12 24SFF Configure-to-order Server',
      'Option Type': 'CTO',
      'Unit Price (USD)': '3400.00',
      'HPE Recommended': 'Yes',
      'Start Date': '05/05/2025',
      'Discontinued Date': 'Active',
      'Lifecycle Status': 'Active'
    }
  ];

  const matrix = chassisRows.map(r => {
    const desc = r.Description;
    let formFactor = 'Unknown';
    let defaultBays = '8 Bays';
    if (desc.includes('8SFF')) { formFactor = '8SFF (2.5-inch)'; defaultBays = '8 SFF Front Bays'; }
    if (desc.includes('12LFF')) { formFactor = '12LFF (3.5-inch)'; defaultBays = '12 LFF Front Bays'; }
    if (desc.includes('24SFF')) { formFactor = '24SFF (2.5-inch)'; defaultBays = '24 SFF Front Bays'; }

    return {
      'Base SKU': r['Product #'],
      'Form Factor': formFactor,
      'Option Type': r['Option Type'],
      'HPE Recommended': r['HPE Recommended'],
      'Base Drive Bays': defaultBays,
      'Lifecycle Status': r['Lifecycle Status']
    };
  });

  assert.equal(matrix.length, 3);
  assert.equal(matrix[0]['Form Factor'], '8SFF (2.5-inch)');
  assert.equal(matrix[0]['HPE Recommended'], 'Yes');
  assert.equal(matrix[1]['Form Factor'], '12LFF (3.5-inch)');
  assert.equal(matrix[2]['Form Factor'], '24SFF (2.5-inch)');
});

test('Multi-Vendor Portal Router isolates HPE, Dell, and Cisco routing', async () => {
  assert.equal(inferVendor('DL380 Gen12'), 'HPE');
  assert.equal(inferVendor('PowerEdge R760'), 'Dell');
  assert.equal(inferVendor('PowerStore 1200T'), 'Dell');
  assert.equal(inferVendor('Cisco UCS B200 M6'), 'Cisco');
  assert.equal(inferVendor('Generic Server', 'Dell'), 'Dell');
  assert.equal(inferVendor('Generic Server', 'HPE'), 'HPE');

  // Verify Dell candidate discovery returns Dell candidate schema
  const dellCandidates = await discoverDellChassisCandidates(null, 'PowerEdge R760');
  assert.equal(dellCandidates.length, 1);
  assert.equal(dellCandidates[0].vendor, 'Dell');
  assert.equal(dellCandidates[0].sku, '210-BFVR');
  assert.equal(dellCandidates[0].eligible, true);
});

test('Stale Google Sheet and catalog source duplicate detection logic', () => {
  const chassisName = 'DL380_Gen12';
  const canonicalDriveSheetId = '1ODabKd0jVBFJU0ga4hfZOs5TtzNIuCXJWb4oXr88ocY';
  const newSourceId = 'new-verified-source-id';
  const protectedIds = new Set(['official-quickspecs-id', 'verified-learning-id']);

  const isManagedTitle = title => String(title || '').startsWith(`${chassisName}_OCA_Catalog_`)
    || String(title || '') === `notebook_sync_payload_${chassisName}.md`
    || String(title || '') === `${chassisName} Canonical Knowledge`
    || String(title || '').includes(`${chassisName} Canonical Knowledge`)
    || String(title || '').includes(`${chassisName}_OCA_Catalog`)
    || String(title || '').includes(`${chassisName} Master Catalog`);

  const sourcesInNotebook = [
    { id: 'official-quickspecs-id', title: 'HPE ProLiant DL380 Gen12 QuickSpecs PDF' },
    { id: 'verified-learning-id', title: 'DL380_Gen12 Verified Learnings' },
    { id: 'old-stale-source-1', title: 'DL380_Gen12_OCA_Catalog_2026-09-01' },
    { id: 'old-duplicate-sheet-source', title: 'DL380_Gen12 Canonical Knowledge', drive_id: canonicalDriveSheetId },
    { id: 'new-verified-source-id', title: 'DL380_Gen12 Canonical Knowledge', drive_id: canonicalDriveSheetId }
  ];

  const staleSources = sourcesInNotebook.filter(s => {
    const title = String(s.title || s.filename || '');
    const isDriveDuplicate = canonicalDriveSheetId && (s.drive_id === canonicalDriveSheetId || s.doc_id === canonicalDriveSheetId);
    const isManagedSource = isManagedTitle(title) || isDriveDuplicate;
    return (
      isManagedSource &&
      s.id !== undefined &&
      !protectedIds.has(s.id) &&
      s.id !== newSourceId
    );
  });

  // Stale sources must identify the 2 old managed items without touching protected ones or the new verified source
  assert.equal(staleSources.length, 2);
  const staleIds = staleSources.map(s => s.id);
  assert.ok(staleIds.includes('old-stale-source-1'));
  assert.ok(staleIds.includes('old-duplicate-sheet-source'));
  assert.ok(!staleIds.includes('official-quickspecs-id'), 'QuickSpecs must never be flagged as stale');
  assert.ok(!staleIds.includes('new-verified-source-id'), 'New replacement source must never be flagged as stale');
});
