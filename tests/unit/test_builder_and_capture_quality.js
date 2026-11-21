'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  parseConstraintMinMax,
  _isInvalidHeaderCandidateRow,
  _isStructuralWrapperTable,
  _reconcileVariantMatrixFromCatalog
} = require('../../scripts/catalogs/build_catalog.js');
const { generateMainSheet } = require('../../scripts/lib/catalog/catalog_formatter.js');
const { evaluateCaptureQualityGate, runCaptureQueryReplay } = require('../../scripts/lib/catalog/capture_query_replay.js');

describe('build_catalog & catalog_formatter — structural hardening & 34-col TSV', () => {
  it('filters oversized wrapper tables and rejects currency/SKU/date values mistakenly used as headers', () => {
    const megaWrapper = {
      tableId: 'outer_wrapper',
      rows: Array.from({ length: 185 }, (_, i) => Array(i === 0 ? 66 : 4).fill('x'))
    };
    const childTable = {
      tableId: 'real_catalog_table',
      rows: [
        ['Product #', 'Description', 'List Price (USD)', 'Lead Time'],
        ['AM495A', 'HPE StoreEver MSL3040 Expansion Module', '$1,500.00', '5 days']
      ]
    };
    assert.equal(_isStructuralWrapperTable(megaWrapper, 0, [megaWrapper, childTable]), true);
    assert.equal(_isStructuralWrapperTable(childTable, 1, [megaWrapper, childTable]), false);

    assert.equal(_isInvalidHeaderCandidateRow(['AM495A', '$1,500.00', '10/23/2017']), true);
    assert.equal(_isInvalidHeaderCandidateRow(['Product #', 'Description', 'List Price (USD)', 'Lead Time']), false);
  });

  it('emits nullable maxQty with explicit maxQtySemantics across constraint classes', () => {
    assert.deepEqual(parseConstraintMinMax('Required (Min 1)'), { minQty: 1, maxQty: null, maxQtySemantics: 'REQUIRED' });
    assert.deepEqual(parseConstraintMinMax('Optional'), { minQty: 0, maxQty: null, maxQtySemantics: 'OPTIONAL' });
    assert.deepEqual(parseConstraintMinMax('Unlimited'), { minQty: 0, maxQty: null, maxQtySemantics: 'UNBOUNDED' });
    assert.deepEqual(parseConstraintMinMax('Min 1 / Max 4'), { minQty: 1, maxQty: 4, maxQtySemantics: 'BOUNDED' });
  });

  it('retains 6-char base SKUs like R7R97A inside chassisVariantMatrix reconciliation', () => {
    const matrix = {};
    _reconcileVariantMatrixFromCatalog(matrix, {
      entries: [
        {
          parentCategory: 'Chassis',
          subCategory: 'Variants',
          skus: [{ sku: 'R7R97A', Description: 'HPE SN3600B 32Gb FC Switch', listPrice: 12000 }]
        }
      ]
    });
    assert.ok(matrix.R7R97A);
    assert.equal(matrix.R7R97A.sku, 'R7R97A');
    assert.equal(matrix.R7R97A.listPrice, 12000);
  });

  it('preserves exact 34 TSV columns in generateMainSheet with Attribute Deltas before Price History Trail', () => {
    const tsv = generateMainSheet(
      [{ parentCategory: 'Chassis', subCategory: 'Variants', skus: [{ sku: 'R7R97A', Description: 'SN3600B', listPrice: 12000 }] }],
      'SN3600B_FC'
    );
    const headers = tsv.split(/\r?\n/)[0].split('\t');
    assert.equal(headers.length, 34);
    assert.equal(headers[32], 'Attribute Deltas');
    assert.equal(headers[33], 'Price History Trail');
  });

  it('prevents 200+ sibling conditional rules from bloating Table Rule/Note beyond Excel 32767-char ceiling', () => {
    const skus = Array.from({ length: 220 }, (_, i) => ({
      sku: `P40${String(400 + i)}-B21`,
      Description: `HPE 2.4TB SAS Drive ${i}`,
      listPrice: 500 + i
    }));
    const rules = skus.map((s) =>
      `${s.sku} conditional visibility: portal selector activation required (Revealed when P74743-B21 (HPE DL380 Gen12 Rear 2SFF U.3 Stacking Drive Cage) = 1); PORTAL_CONDITIONAL`
    );
    rules.unshift('Minimum 1 drive required when stacking cage is selected');
    const tsv = generateMainSheet([{ parentCategory: 'Drive Enclosures / Drives', subCategory: 'Hot Plug SFF Drives', rules, skus }], 'DL380_Gen12');
    const dataRows = tsv.split(/\r?\n/).slice(1);
    assert.equal(dataRows.length, 220);
    const firstRowCols = dataRows[0].split('\t');
    const noteCell = firstRowCols[7];
    assert.ok(noteCell.includes('Minimum 1 drive required'));
    assert.ok(noteCell.includes('P40400-B21 conditional visibility:'));
    assert.ok(!noteCell.includes('P40401-B21 conditional visibility:'));
    assert.ok(noteCell.length <= 4000, `noteCell exceeded bound: ${noteCell.length}`);
  });
});

describe('capture_query_replay — capture quality gate & product replay verification', () => {
  let tmpRoot;

  before(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cap_gate_test_'));
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  function writeCatalogFixture(dirName, catalogObj, diagObj, suiteQueries) {
    const dir = path.join(tmpRoot, dirName);
    fs.mkdirSync(path.join(dir, 'history'), { recursive: true });
    fs.writeFileSync(path.join(dir, `${dirName}_Catalog.json`), JSON.stringify(catalogObj, null, 2));
    if (diagObj) {
      fs.writeFileSync(path.join(dir, 'history', 'classification_diagnostics.json'), JSON.stringify(diagObj, null, 2));
    }
    const suitePath = path.join(dir, 'replay_suite.json');
    fs.writeFileSync(suitePath, JSON.stringify({ schemaVersion: '1.0.0', productQueries: { [dirName]: suiteQueries } }, null, 2));
    return { dir, suitePath };
  }

  it('passes clean catalogs and executes golden lookup & filtered query replay checks', () => {
    const { dir, suitePath } = writeCatalogFixture(
      'DL360_Gen12',
      {
        metadata: { chassis: 'DL360 Gen12', generation: 'Gen12', totalUniqueSKUs: 2, scrapeDate: '2026-11-20' },
        entries: [
          {
            parentCategory: 'Chassis',
            subCategory: 'Variants',
            headers: ['Product #', 'Description', 'List Price (USD)', 'Lead Time'],
            skus: [{ 'Product #': 'P71100-B21', Description: 'HPE DL360 Gen12 CTO Server', 'List Price (USD)': '$3,500.00', 'Lead Time': '5 days' }]
          },
          {
            parentCategory: 'Memory',
            subCategory: 'DDR5 DIMMs',
            headers: ['Product #', 'Description', 'List Price (USD)', 'Lead Time'],
            skus: [{ 'Product #': 'P64707-B21', Description: 'HPE 64GB DDR5-5600 RDIMM Memory Kit', 'List Price (USD)': '$1,250.00', 'Lead Time': '2 weeks', leadTimeDays: 14 }]
          }
        ]
      },
      { summary: { totalUniqueSKUs: 2 } },
      [
        { id: 'base-cto', kind: 'skuLookup', sku: 'P71100-B21', minPriceUsd: 1000 },
        { id: 'dimms-sort', kind: 'catalogSearch', query: 'List all 64 GB DDR5 DIMMs for DL360 Gen12 and sort by lead time', allowZeroMatches: false, verifyLeadTimeMeasured: true }
      ]
    );

    const quality = evaluateCaptureQualityGate(dir, 'DL360_Gen12');
    assert.equal(quality.passed, true, `unexpected blockers: ${quality.blockers.join('; ')}`);

    const replay = runCaptureQueryReplay(dir, 'DL360_Gen12', { suitePath });
    assert.equal(replay.passed, true, `unexpected replay blockers: ${replay.blockers.join('; ')}`);
    assert.equal(replay.results.length, 2);
  });

  it('blocks mega-row headers, suspected date prices, week-multiplier loss, and diagnostics mismatches', () => {
    const { dir } = writeCatalogFixture(
      'MSL3040_Tape',
      {
        metadata: { chassis: 'MSL3040 Tape Library', generation: 'Tape', totalUniqueSKUs: 3, scrapeDate: '2026-11-20' },
        entries: [
          {
            parentCategory: 'Storage',
            subCategory: 'Tape Modules',
            headers: Array.from({ length: 24 }, (_, i) => `Col_${i}`),
            skus: [
              { 'Product #': 'AM495A', Description: 'Tape Expansion Module', 'List Price (USD)': '10/23/2017', 'Lead Time': '6-8 weeks', leadTimeDays: 6 },
              { 'Product #': 'Q2R41A', Description: 'MSL3040 Base Library', 'List Price (USD)': '$8,900.00', 'Lead Time': 'ETA 2026-12-01', leadTimeDays: 5 }
            ]
          }
        ]
      },
      { summary: { totalUniqueSKUs: 99 } },
      []
    );

    const quality = evaluateCaptureQualityGate(dir, 'MSL3040_Tape');
    assert.equal(quality.passed, false);
    assert.ok(quality.blockers.some((b) => b.includes('mega-row header width')));
    assert.ok(quality.blockers.some((b) => b.includes('malformed/shifted/date price')));
    assert.ok(quality.blockers.some((b) => b.includes('dropped weeks multiplier')));
    assert.ok(quality.blockers.some((b) => b.includes('converted ETA date')));
    assert.ok(quality.blockers.some((b) => b.includes('Diagnostics totalUniqueSKUs')));
  });

  it('matches mandatoryCategories across parentCategory and subCategory in validateCatalogCoverage', () => {
    const { validateCatalogCoverage } = require('../../scripts/lib/catalog/catalog_coverage.js');
    const profilesPath = path.join(tmpRoot, 'profiles_cov.json');
    fs.writeFileSync(profilesPath, JSON.stringify({
      profiles: {
        MSL3040_Tape: {
          mandatoryCategories: ['Power Supplies', 'Storage Media'],
          minHardwareSKUs: 2,
          expectedWorkbookSheets: 2
        }
      }
    }));
    const catalog = {
      entries: [
        { parentCategory: 'Power Supplies', subCategory: 'Power Supply', skus: [{ sku: 'Q6Q64A' }] },
        { parentCategory: 'Storage Controllers', subCategory: 'Storage Media', skus: [{ sku: 'C7978A' }] }
      ]
    };
    const res = validateCatalogCoverage('MSL3040_Tape', catalog, { entries: [] }, { SheetNames: ['Category Summary', 'All SKUs'] }, profilesPath);
    assert.equal(res.valid, true, `expected valid coverage, got: ${res.reason}`);
  });

  it('captures Services -> Edit picker options cleanly and excludes PRIVATE_UNPRICED/REGIONAL_NA_UNPRICED from zero-price alerts', async () => {
    const { captureServicesEditPicker } = require('../../scripts/lib/scraper/catalog_tab_capture.js');
    const mockApi = {
      sendCommand: async (_ws, _method, { expression }) => {
        if (expression.includes('editBtn.click()')) {
          return { result: { value: { clicked: true, triggerText: 'Edit' } } };
        }
        return {
          result: {
            value: {
              tables: [{
                tableId: 'services_edit_picker_0',
                rows: [
                  ['Product #', 'Description', 'List Price (USD)'],
                  ['HU4B2A3', 'HPE 3Y Tech Care Basic Service', '$1,450.00']
                ]
              }],
              fullText: 'HU4B2A3 HPE 3Y Tech Care Basic Service $1,450.00'
            }
          }
        };
      },
      waitForDOMPredicate: async () => true
    };
    const editRes = await captureServicesEditPicker({}, mockApi);
    assert.equal(editRes.captured, true);
    assert.equal(editRes.optionCount, 1);

    const { auditProductBlindspots } = require('../../scripts/lib/catalog/portfolio_blindspots.js');
    const { dir } = writeCatalogFixture(
      'DL380_Gen12',
      {
        metadata: { chassis: 'DL380 Gen12', generation: 'Gen12', totalUniqueSKUs: 2, scrapeDate: '2026-11-21' },
        entries: [{
          parentCategory: 'Networking',
          subCategory: 'Adapters',
          skus: [
            { 'Product #': 'P11111-B21', Description: 'Private NIC', 'Lifecycle Status': 'Active', isPrivateSku: true, priceState: 'PRIVATE_UNPRICED' },
            { 'Product #': 'P22222-AA1', Description: 'Regional APAC Part', 'Lifecycle Status': 'Active', priceState: 'REGIONAL_NA_UNPRICED' }
          ]
        }]
      },
      { summary: { totalUniqueSKUs: 2, totalExtractedSKUs: 2 }, attributeFidelity: {} },
      []
    );
    const blindspot = auditProductBlindspots({
      id: 'DL380_Gen12',
      family: 'ProLiant',
      gen: 'Gen12',
      catalogDir: dir,
      catalogJsonPath: path.join(dir, 'DL380_Gen12_Catalog.json'),
      rulesJsonPath: path.join(dir, 'DL380_Gen12_Catalog_Rules.json'),
      servicesJsonPath: path.join(dir, 'DL380_Gen12_Services.json'),
      skuCount: 2
    });
    assert.equal(blindspot.findings.some(f => f.code === 'ZERO_PRICE_ACTIVE_NON_FIO_SKUS'), false);
    assert.equal(blindspot.findings.some(f => f.code === 'UNPRICED_PRIVATE_OR_REGIONAL_SKUS'), true);

    const { extractModelGeneration, _sortAndFilterEligibleCandidates } = require('../../scripts/lib/scraper/navigate_oca.js');
    assert.equal(extractModelGeneration('HPE Alletra Storage MP B10000').model, 'alletrab10000');

    const rankedB10k = _sortAndFilterEligibleCandidates([
      { sku: 'ARCUSKSASOL', text: 'S7U66A/S7U67A - HPE Alletra Storage MP B10000 KSA', isCto: true },
      { sku: 'ARCUSSOLWIZARD', text: 'arcusSolwizard - HPE Alletra Storage MP B10000', isCto: true, isWizard: true }
    ], 'Alletra Storage MP B10000');
    assert.equal(rankedB10k[0].sku, 'ARCUSSOLWIZARD');

    const rankedX10k = _sortAndFilterEligibleCandidates([
      { sku: 'HOMEFLEETKSASOL', text: 'S7Z87A - HPE Alletra Storage MP X10000 KSA', isCto: true },
      { sku: 'HOMEFLEETUPGSOL', text: 'S6W29A - HPE Alletra Storage MP X10000 Disconnected Solution Add-on', isCto: true },
      { sku: 'HOMEFLEETSOL', text: 'S3L12A - HPE Alletra Storage MP X10000 Base Configuration', isCto: true }
    ], 'Alletra Storage MP X10000');
    assert.equal(rankedX10k[0].sku, 'HOMEFLEETSOL');
  });
});
