'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  resolveCatalogQueryScope,
  parseCatalogSearchQuery,
  executeCatalogSearch,
  verifyCatalogSearchResponse,
  recordQueryMissIfNeeded
} = require('../../scripts/lib/catalog/catalog_query_engine.js');
const { classifyQueryIntent } = require('../../scripts/evaluators/route_query.js');
const { verifyPrePresentationAcceptance } = require('../../scripts/lib/boq/bom_verifier.js');

function buildFixtureCatalogData() {
  return {
    metadata: { chassis: 'DL360 Gen12', generation: 'Gen12', scrapeDate: '2026-11-20' },
    entries: [
      {
        parentCategory: 'Memory',
        subCategory: 'DDR5 SmartMemory',
        skus: [
          {
            'Product #': 'P64707-B21',
            Description: 'HPE 64GB (1x64GB) Dual Rank x4 DDR5-5600 CAS-46-45-45 EC8 Registered Smart Memory Kit',
            'List Price (USD)': '$1,250.00',
            'Lead Time': '5 days'
          },
          {
            'Product #': 'P76001-B21',
            Description: 'HPE 64GB (1x64GB) Dual Rank x4 DDR5-6400 RDIMM Memory Kit',
            'List Price (USD)': '$1,480.00',
            'Lead Time': '2 weeks'
          },
          {
            'Product #': 'P76002-B21',
            Description: 'HPE 64GB (1x64GB) Dual Rank x4 DDR5-6400 RDIMM Memory Kit',
            'List Price (USD)': '$1,520.00',
            'Lead Time': 'ETA 2026-12-15'
          },
          {
            'Product #': 'P76003-B21',
            Description: 'HPE 64GB (1x64GB) Dual Rank x4 DDR5-5600 RDIMM Memory Kit',
            'List Price (USD)': '$1,100.00',
            'Lead Time': 'Unpublished'
          },
          {
            'Product #': 'P76004-B21',
            Description: 'HPE 64GB (1x64GB) DDR5-5600 RDIMM Corrupted Price Row',
            'List Price (USD)': '10/23/2017',
            'Lead Time': '3 days'
          }
        ]
      },
      {
        parentCategory: 'GPU / Accelerators',
        subCategory: 'NVIDIA PCIe',
        skus: [
          {
            'Product #': 'R9S37C',
            Description: 'NVIDIA L40S 48GB PCIe GPU Accelerator for HPE',
            'List Price (USD)': '$9,850.00',
            'Lead Time': '10 days'
          },
          {
            'Product #': 'S2L70C',
            Description: 'NVIDIA H100 NVL 94GB PCIe Accelerator',
            'List Price (USD)': '$29,500.00',
            'Lead Time': '4 weeks'
          }
        ]
      }
    ]
  };
}

function buildFixtureServicesData() {
  return {
    metadata: { chassis: 'DL360 Gen12', generation: 'Gen12', scrapeDate: '2026-11-20' },
    entries: [
      {
        parentCategory: 'Services',
        subCategory: 'HPE Tech Care',
        skus: [
          {
            'Product #': 'HU4B2A3',
            Description: 'HPE 3 Year Tech Care Basic Service',
            'List Price (USD)': '$490.00',
            'Lead Time': '3 days'
          },
          {
            'Product #': 'HU4A6A5',
            Description: 'HPE 5 Year Tech Care Essential Service',
            'List Price (USD)': '$1,890.00',
            'Lead Time': '3 days'
          }
        ]
      }
    ]
  };
}

describe('catalog_query_engine — filtered catalog searches, exclusions, verification & router', () => {
  let tmpRoot;
  let scopedCatalogs;

  before(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cat_q_test_'));
    const catDir = path.join(tmpRoot, 'DL360_Gen12');
    fs.mkdirSync(catDir, { recursive: true });
    const catalogJsonPath = path.join(catDir, 'DL360_Gen12_Catalog.json');
    const servicesJsonPath = path.join(catDir, 'DL360_Gen12_Services.json');
    fs.writeFileSync(catalogJsonPath, JSON.stringify(buildFixtureCatalogData(), null, 2));
    fs.writeFileSync(servicesJsonPath, JSON.stringify(buildFixtureServicesData(), null, 2));
    scopedCatalogs = [{
      id: 'DL360_Gen12',
      chassis: 'DL360 Gen12',
      gen: 'Gen12',
      catalogDir: catDir,
      catalogJsonPath,
      servicesJsonPath,
      scrapeDate: '2026-11-20'
    }];
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('filters 64 GB DDR5 DIMMs, sorts by lead time asc, and segregates ETA/unpublished/parse-failed rows', () => {
    const query = 'List all 64 GB DDR5 DIMMs for DL360 Gen12 and sort by lead time';
    const parsed = parseCatalogSearchQuery(query, { catalogs: scopedCatalogs });
    assert.ok(parsed);
    assert.deepEqual(parsed.products, ['DL360_Gen12']);
    assert.deepEqual(parsed.componentRoles, ['Memory']);
    assert.equal(parsed.specs.ddrType, 'DDR5');
    assert.equal(parsed.specs.exactCapacityGb, 64);
    assert.equal(parsed.sortBy, 'leadTimeAsc');

    const payload = executeCatalogSearch(parsed, { catalogs: scopedCatalogs, recordMiss: false });
    assert.deepEqual(payload.results.map((r) => r.sku), ['P64707-B21', 'P76001-B21']);
    assert.deepEqual(payload.results.map((r) => r.leadTimeDays), [5, 14]);
    assert.equal(payload.excludedUnmeasured.length, 2);
    assert.equal(payload.excludedConflicts.length, 1);
    assert.equal(payload.excludedConflicts[0].sku, 'P76004-B21');

    const verified = verifyCatalogSearchResponse(payload, parsed);
    assert.equal(verified.status, 'PARTIAL');
    assert.equal(verified.passed, false);
  });

  it('rejects null lead-time leaks and parse failures inside verifyCatalogSearchResponse', () => {
    const parsed = parseCatalogSearchQuery('List 64 GB DDR5 DIMMs for DL360 Gen12 sorted by lead time', { catalogs: scopedCatalogs });
    const badPayload = {
      results: [{ sku: 'P76002-B21', listPriceUsd: 1520, leadTimeDays: null, priceState: 'PRICED' }],
      excludedUnmeasured: [],
      excludedConflicts: [],
      summary: { returnedCount: 1 }
    };
    const res = verifyCatalogSearchResponse(badPayload, parsed);
    assert.equal(res.status, 'FAILED');
    assert.ok(res.issues.some((msg) => msg.includes('evidence requirements')));
  });

  it('filters GPUs strictly under a $15000 ceiling', () => {
    const parsed = parseCatalogSearchQuery('Show GPUs under $15000 for DL360 Gen12', { catalogs: scopedCatalogs });
    const payload = executeCatalogSearch(parsed, { catalogs: scopedCatalogs, recordMiss: false });
    assert.deepEqual(payload.results.map((r) => r.sku), ['R9S37C']);
    assert.equal(payload.results[0].listPriceUsd, 9850);
    assert.equal(verifyCatalogSearchResponse(payload, parsed).status, 'PASSED');
  });

  it('filters 3 year Tech Care Basic support SKUs with SUPPORT_SERVICE classification', () => {
    const parsed = parseCatalogSearchQuery('List 3 year Tech Care Basic support for DL360 Gen12', { catalogs: scopedCatalogs });
    const payload = executeCatalogSearch(parsed, { catalogs: scopedCatalogs, recordMiss: false });
    assert.deepEqual(payload.results.map((r) => r.sku), ['HU4B2A3']);
    assert.equal(payload.results[0].rowType, 'SUPPORT_SERVICE');
    assert.equal(verifyCatalogSearchResponse(payload, parsed).status, 'PASSED');
  });

  it('queues query-miss probes cleanly when returnedCount is 0 due to unmeasured/conflicting rows', () => {
    const queuePath = path.join(tmpRoot, 'query_miss_probe_queue.json');
    const wrote = recordQueryMissIfNeeded('List 128 GB DIMMs sorted by lead time', {
      filters: { products: ['DL360_Gen12'], componentRoles: ['Memory'] },
      summary: { returnedCount: 0, excludedUnmeasuredCount: 3, excludedConflictCount: 0, incompleteCatalogCoverage: true }
    }, queuePath);
    assert.equal(wrote, true);
    const saved = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
    assert.equal(saved.items.length, 1);
    assert.equal(saved.items[0].status, 'PENDING_PROBE');
  });

  it('routes catalog search intent to CATALOG_INTELLIGENCE and enforces CI1-CI3 verifier gates', () => {
    const classified = classifyQueryIntent('List all 64 GB DDR5 DIMMs for DL360 Gen12 and sort by lead time');
    assert.equal(classified.intent, 'CATALOG_INTELLIGENCE');

    const accepted = verifyPrePresentationAcceptance({
      answer: 'Found 2 matching 64 GB DDR5 DIMMs sorted by lead time.',
      catalogSearch: {
        results: [{ sku: 'P64707-B21', listPriceUsd: 1250, leadTimeDays: 5, priceState: 'PRICED' }],
        excludedUnmeasured: [],
        excludedConflicts: [],
        summary: { returnedCount: 1 }
      }
    }, 'CATALOG_INTELLIGENCE', {});
    assert.equal(accepted.checks.find((c) => c.id === 'CI2')?.status, 'PASSED');

    const rejectedDump = verifyPrePresentationAcceptance({
      answer: 'Raw price history attached.',
      priceHistory: [{ sku: 'P64707-B21', events: [] }],
      targetSku: null
    }, 'CATALOG_INTELLIGENCE', {});
    assert.equal(rejectedDump.status, 'FAILED');
    assert.equal(rejectedDump.checks.find((c) => c.id === 'CI1')?.status, 'FAILED');

    const rejectedConflict = verifyPrePresentationAcceptance({
      answer: 'Found 1 row.',
      catalogSearch: {
        results: [{ sku: 'P76004-B21', listPriceUsd: null, leadTimeDays: 3, priceState: 'PARSE_FAILED' }],
        excludedUnmeasured: [],
        excludedConflicts: [],
        summary: { returnedCount: 1 }
      }
    }, 'CATALOG_INTELLIGENCE', {});
    assert.equal(rejectedConflict.status, 'FAILED');
    assert.equal(rejectedConflict.checks.find((c) => c.id === 'CI2')?.status, 'FAILED');
  });

  it('handles null search safely, isolates GPU software, enforces TDP strict bounds, and supports Alletra MP + DDR6/GPU vectors', () => {
    const emptyPayload = executeCatalogSearch(null, { catalogs: scopedCatalogs, recordMiss: false });
    assert.deepEqual(emptyPayload.results, []);
    assert.equal(emptyPayload.summary.incompleteCatalogCoverage, true);

    const { extractCanonicalAttributes, extractCompactCanonicalSpecs } = require('../../scripts/lib/catalog/attribute_vectors.js');
    const ddr6 = extractCanonicalAttributes({ sku: 'X-DDR6-128', Description: '128GB 2Rx4 DDR6-8800 RDIMM Memory Kit' });
    assert.equal(ddr6.attributes.ddrGen, 'DDR6');
    assert.equal(ddr6.attributes.speedMt, 8800);

    const gpuAttrs = extractCompactCanonicalSpecs({ sku: 'S7J51C', Description: 'NVIDIA RTX Pro 5000 48GB Spl GPU 300W PCIe' });
    assert.equal(gpuAttrs.category, 'GPU / Accelerator');
    assert.equal(gpuAttrs.vramGb, 48);
    assert.equal(gpuAttrs.tdpWatts, 300);

    const tdpQuery = parseCatalogSearchQuery('List CPUs above 250W TDP for DL360 Gen12', { catalogs: scopedCatalogs });
    assert.equal(tdpQuery.specs.minWattage, 250);
    assert.equal(tdpQuery.specs.minWattageExclusive, true);
    assert.equal(tdpQuery.specs.wattages, undefined);

    const gpuQuery = parseCatalogSearchQuery('List all GPUs for DL360 Gen12', { catalogs: scopedCatalogs });
    assert.deepEqual(gpuQuery.rowTypes, ['HARDWARE_OPTION', 'BASE_SYSTEM', 'OWNED_COMPONENT_PARENT']);

    const multiCatalogs = [
      ...scopedCatalogs,
      { id: 'Alletra_MP_B10000', chassis: 'HPE Alletra Storage MP B10000', gen: 'Storage' },
      { id: 'Alletra_MP_X10000', chassis: 'HPE Alletra Storage MP X10000', gen: 'Storage' }
    ];
    assert.deepEqual(resolveCatalogQueryScope('List NVMe drives for Alletra MP B10000', multiCatalogs).products, ['Alletra_MP_B10000']);
    assert.deepEqual(resolveCatalogQueryScope('Show SSDs for Alletra 10k', multiCatalogs).products, ['Alletra_MP_B10000']);
    assert.deepEqual(resolveCatalogQueryScope('List drives for Alletra X10000', multiCatalogs).products, ['Alletra_MP_X10000']);
  });
});
