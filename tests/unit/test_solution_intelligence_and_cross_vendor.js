'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { normalizeLifecycleLabel, auditProductBlindspots } = require('../../scripts/lib/catalog/portfolio_blindspots.js');
const { compareSkuAcrossSolutions, findCrossSolutionPriceVariances } = require('../../scripts/lib/catalog/cross_solution_pricing.js');
const { evalSupportManufacturing } = require('../../scripts/lib/aspects/support_manufacturing.js');
const { validateBoqEvaluationCriteria } = require('../../scripts/lib/boq/bom_verifier.js');
const { extractCanonicalAttributes, getCanonicalCategorySchema } = require('../../scripts/lib/catalog/attribute_vectors.js');
const { createHuaweiAdapter } = require('../../scripts/lib/adapters/huawei_adapter.js');
const { createDellAdapter } = require('../../scripts/lib/adapters/dell_adapter.js');
const { validateVendorAdapter } = require('../../scripts/lib/contracts/vendor_adapter_contract.js');
const { inferVendor, resolvePortalSessionPolicy } = require('../../scripts/lib/scraper/vendor_portal_router.js');
const { getVendorAdapter } = require('../../scripts/lib/scraper/vendor_scraper_adapter.js');
const { detectVendor } = require('../../scripts/lib/taxonomy/vendor_agnostic_schema.js');
const { mapSourceBomToTargetCatalog } = require('../../scripts/lib/boq/attribute_equivalence_mapper.js');
const { transformCompetitorQuote } = require('../../scripts/lib/boq/cross_vendor_transformer.js');
const { attachCompanionServices, buildCatalogSkuIndex, normalizeMaxQtySentinel } = require('../../scripts/lib/catalog/sku.js');
const { backfillMissingPricesAndLeadTimes } = require('../../scripts/lib/catalog/cross_solution_pricing.js');
const { executeRoutedQuery } = require('../../scripts/evaluators/route_query.js');

function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-intel-'));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('Phase 1 — Blind-spot scanner normalizes lifecycle strings and flags $0 variants, sentinels, and skipped tables', () => {
  assert.equal(normalizeLifecycleLabel('EOL Warning (90-Day)'), 'EOL_90_DAY_WARNING');
  assert.equal(normalizeLifecycleLabel('90-Day EOL Warning'), 'EOL_90_DAY_WARNING');
  assert.equal(normalizeLifecycleLabel('Obsolete (OB)'), 'OBSOLETE');

  withTempDir(tmp => {
    const catDir = path.join(tmp, 'DL_TEST');
    const histDir = path.join(catDir, 'history');
    fs.mkdirSync(histDir, { recursive: true });
    const catalogPath = path.join(catDir, 'DL_TEST_Catalog.json');
    fs.writeFileSync(catalogPath, JSON.stringify({
      entries: [{
        parentCategory: 'Chassis',
        skus: [{ 'Product #': 'P99999-B21', Description: 'Test CTO Server', 'Unit Price (USD)': '0', 'Lifecycle Status': 'Active' }]
      }]
    }));
    fs.writeFileSync(path.join(histDir, 'classification_diagnostics.json'), JSON.stringify({
      summary: { totalExtractedSKUs: 100, totalUniqueSKUs: 90 },
      skippedTables: [{ tableIndex: 2, reason: 'No valid SKU or headers detected' }],
      tableDecisions: [{ subCategory: 'Drive Cage Accessories', maxQty: -2 }],
      chassisVariantsMatrix: { 'P99999-B21': { description: 'Test CTO', listPrice: 0 } },
      categoryDistribution: { 'Software & Licenses': 250, 'Support Services': 1 },
      attributeFidelity: {
        skusWithLeadTime: 20,
        skusWithCost: 0,
        clicStatusDistribution: { Unpublished: 95, Valid: 5 },
        lifecycleStatusDistribution: { 'EOL Warning (90-Day)': 5, '90-Day EOL Warning': 2 }
      }
    }));

    const res = auditProductBlindspots({
      id: 'DL_TEST',
      family: 'ProLiant',
      gen: 'Gen12',
      catalogDir: catDir,
      catalogJsonPath: catalogPath
    });
    const codes = new Set(res.findings.map(f => f.code));
    assert.ok(codes.has('SKIPPED_NON_EMPTY_TABLES'));
    assert.ok(codes.has('SENTINEL_MAX_QTY'));
    assert.ok(codes.has('UNNORMALIZED_LIFECYCLE_LABELS'));
    assert.ok(codes.has('ZERO_PRICE_BASE_VARIANTS'));
    assert.ok(codes.has('SERVICES_CATEGORY_IMBALANCE'));
    assert.ok(codes.has('MISSING_CATALOG_RULES'));
    assert.ok(codes.has('ZERO_PRICE_ACTIVE_NON_FIO_SKUS'));
  });
});

test('Phase 2 — Support/COM term parity, discontinued iLO, and Process Control (P+) SmartForm override vs block', () => {
  const supportRes = evalSupportManufacturing([
    { sku: 'P73282-B21', description: 'HPE DL380 Gen12 CTO Server', quantity: 1 },
    { sku: 'R7A11AAE', description: 'HPE GreenLake for Compute Ops Management 3-year Upfront SaaS', quantity: 1 },
    { sku: 'HU4A6A5', description: 'HPE 5Y Tech Care Essential Service', quantity: 1 },
    { sku: '512485-B21', description: 'HPE iLO Advanced 1-svr License', quantity: 1 }
  ]);
  assert.equal(supportRes.managementTermYears, 3);
  assert.equal(supportRes.hardwareSupportTermYears, 5);
  assert.equal(supportRes.hasManagementSupportTermMismatch, true);
  assert.equal(supportRes.hasDiscontinuedIloLicense, true);

  const baseEval = {
    chassis: 'DL380_Gen12',
    isMathClean: true,
    items: [{ sku: 'P73282-B21', description: 'HPE DL380 Gen12 CTO Server', quantity: 1 }],
    aspectChecks: [
      { id: 'COMPUTE_THERMAL', status: 'PASS' },
      { id: 'MEMORY_CHANNEL', status: 'PASS' },
      { id: 'STORAGE_TRI_MODE', status: 'PASS' },
      { id: 'PCIE_RISER', status: 'PASS' },
      { id: 'NETWORKING_OCP', status: 'PASS' },
      { id: 'POWER_ENVIRONMENT', status: 'PASS' },
      { id: 'SUPPORT_MANUFACTURING', status: 'PASS' }
    ]
  };

  // Unresolved P+ Process Control MUST fail Gate B19
  const blocked = validateBoqEvaluationCriteria({
    ...baseEval,
    liveClicValidation: { unbuildablesCount: 0, errorsCount: 0, processControlCount: 1, warningsCount: 2 }
  });
  const b19Blocked = blocked.find(c => c.id === 'B19');
  assert.equal(b19Blocked.status, 'FAILED');
  assert.equal(b19Blocked.evidence.portalStatus, 'PORTAL_VALIDATION_FAILED');

  // Approved SmartForm exception must unblock B19 & B14 with explicit override status
  const approved = validateBoqEvaluationCriteria({
    ...baseEval,
    liveClicValidation: {
      unbuildablesCount: 0, errorsCount: 0, processControlCount: 1, warningsCount: 2,
      processControlApproval: { approved: true, exceptionId: 'SF-81322276-2026' }
    }
  });
  const b14Approved = approved.find(c => c.id === 'B14');
  const b19Approved = approved.find(c => c.id === 'B19');
  assert.equal(b14Approved.status, 'PASSED');
  assert.equal(b19Approved.status, 'PASSED');
  assert.equal(b19Approved.evidence.portalStatus, 'PORTAL_VALIDATED_WITH_PC_OVERRIDE');
});

test('Phase 3 — Cross-solution SKU price comparison preserves nullable prices and surfaces spreads', () => {
  withTempDir(tmp => {
    const makeCat = (id, priceVal) => {
      const d = path.join(tmp, id);
      fs.mkdirSync(d, { recursive: true });
      const cPath = path.join(d, `${id}_Catalog.json`);
      fs.writeFileSync(cPath, JSON.stringify({
        metadata: { scrapeDate: '2026-11-18' },
        entries: [{
          parentCategory: 'Drive Enclosures / Drives',
          skus: [{ 'Product #': 'P50224-B21', Description: 'HPE 15.36TB NVMe RI SFF SSD', 'Unit Price (USD)': priceVal, 'Lifecycle Status': 'Active' }]
        }]
      }));
      return { id, chassis: id, catalogDir: d, catalogJsonPath: cPath };
    };

    const catalogs = [makeCat('SOL_A', '32718'), makeCat('SOL_B', '86062'), makeCat('SOL_C', '')];
    const cmp = compareSkuAcrossSolutions('P50224-B21', { catalogs });
    assert.equal(cmp.summary.solutionsFound, 3);
    assert.equal(cmp.summary.pricedCount, 2);
    assert.equal(cmp.summary.unpricedCount, 1);
    assert.equal(cmp.summary.minPriceUsd, 32718);
    assert.equal(cmp.summary.maxPriceUsd, 86062);
    assert.equal(cmp.summary.hasPriceVariance, true);

    const unpricedRow = cmp.matches.find(m => m.product === 'SOL_C');
    assert.equal(unpricedRow.listPriceUsd, null);
    assert.equal(unpricedRow.priceStatus, 'UNPRICED');

    const variances = findCrossSolutionPriceVariances({ catalogs });
    assert.equal(variances.variancesCount, 1);
    assert.equal(variances.variances[0].spreadUsd, 53344);
  });
});

test('Phase 4 & 5 — Canonical attributes, Huawei & Dell adapters, and attribute-based BOM-to-BOM mapping', () => {
  const schema = getCanonicalCategorySchema();
  assert.ok(schema.Processor && schema['Software / Support / Services']);

  const huawei = createHuaweiAdapter();
  const dell = createDellAdapter();
  assert.equal(validateVendorAdapter(huawei).valid, true);
  assert.equal(validateVendorAdapter(dell).valid, true);
  assert.equal(inferVendor('Huawei FusionServer 2288H V7'), 'Huawei');
  assert.equal(resolvePortalSessionPolicy({ vendor: 'Huawei' }).vendor, 'Huawei');
  assert.equal(getVendorAdapter('Huawei').vendor, 'Huawei');
  assert.equal(detectVendor('Huawei OceanStor Dorado 5000'), 'Huawei');

  const huaweiCpu = extractCanonicalAttributes({ sku: '02314ABC', description: 'Intel Xeon Gold 6530 32-Core 2.1GHz 270W Processor', vendor: 'Huawei' });
  assert.equal(huaweiCpu.category, 'Processor');
  assert.equal(huaweiCpu.attributes.cores, 32);

  const targetCatalog = {
    entries: [
      {
        parentCategory: 'Processor',
        skus: [
          { 'Product #': 'P74571-B21', Description: 'Intel Xeon 6530P 2.3GHz 32-core 225W Processor', 'Unit Price (USD)': '4200', 'Lifecycle Status': 'Active' }
        ]
      },
      {
        parentCategory: 'Memory',
        skus: [
          { 'Product #': 'P69728-F21', Description: 'HPE 64GB 2Rx4 PC5-6400B-R Smart Kit', 'Unit Price (USD)': '1100', 'Lifecycle Status': 'Active' }
        ]
      },
      {
        parentCategory: 'Drive Enclosures / Drives',
        skus: [
          { 'Product #': 'P40497-B21', Description: 'HPE 480GB SATA 6G Read Intensive SFF SSD', 'Unit Price (USD)': '800', 'Lifecycle Status': 'Active' }
        ]
      },
      {
        parentCategory: 'Networking',
        skus: [
          { 'Product #': 'P51178-B21', Description: 'Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter', 'Unit Price (USD)': '485', 'Lifecycle Status': 'Active' }
        ]
      }
    ]
  };

  const sourceItems = [
    { sku: '338-DELL1', description: 'Dell PowerEdge Intel Xeon 32-Core 2.3GHz 225W Processor', quantity: 2 },
    { sku: '370-DELL2', description: 'Dell 64GB RDIMM 6400MT/s DDR5 Memory', quantity: 16 },
    { sku: '400-WI', description: 'Dell 480GB SAS Write Intensive SFF SSD', quantity: 2 },
    { sku: '540-IB', description: 'Dell NVIDIA ConnectX-7 NDR 400Gb InfiniBand OSFP Adapter', quantity: 1 }
  ];

  const mapped = mapSourceBomToTargetCatalog(sourceItems, targetCatalog, { sourceVendor: 'Dell', targetVendor: 'HPE' });
  assert.equal(mapped.totalSourceLines, 4);
  assert.equal(mapped.mappings[0].targetSku, 'P74571-B21');
  assert.equal(mapped.mappings[1].targetSku, 'P69728-F21');
  // Write-Intensive SAS drive must never silently downgrade to Read-Intensive SATA
  assert.equal(mapped.mappings[2].targetSku, null);
  // InfiniBand must never silently map to Ethernet
  assert.equal(mapped.mappings[3].targetSku, null);
  assert.equal(mapped.mappings[3].matchStatus, 'UNRESOLVED');
  assert.equal(mapped.parityGaps.length, 2);

  const transformed = transformCompetitorQuote('Dell PowerEdge R760', 'Dell', 'DL380_Gen12', {
    sourceItems,
    targetCatalogData: targetCatalog
  });
  assert.ok(transformed.equivalenceMapping);
  assert.equal(transformed.recommendedBom.length, 2);
});

test('Step 4.1 — Multi-node COM & iLO quantity-per-node parity + Gate B14 ACTION_REQUIRED', () => {
  const supportRes = evalSupportManufacturing([
    { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 CTO Server', category: 'Base Chassis', quantity: 10 },
    { sku: 'R7A11AAE', description: 'HPE GreenLake for Compute Ops Management 3-year Upfront SaaS', quantity: 1 },
    { sku: 'BD505A', description: 'HPE iLO Advanced 1-server License', quantity: 1 }
  ], null, 0, 10);

  assert.equal(supportRes.managementLicenseCount, 1);
  assert.equal(supportRes.isManagementLicenseUnderprovisioned, true);
  assert.equal(supportRes.missingManagementLicenses, 9);
  assert.equal(supportRes.iloLicenseCount, 1);
  assert.equal(supportRes.isIloLicenseUnderprovisioned, true);
  assert.equal(supportRes.missingIloLicenses, 9);

  const checks = validateBoqEvaluationCriteria({
    chassis: 'DL380_Gen12',
    isMathClean: true,
    serverCount: 10,
    items: [
      { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 CTO Server', category: 'Base Chassis', quantity: 10 },
      { sku: 'R7A11AAE', description: 'HPE GreenLake for Compute Ops Management 3-year Upfront SaaS', quantity: 1 }
    ],
    aspectChecks: [
      { id: 'COMPUTE_THERMAL', status: 'PASS' },
      { id: 'MEMORY_CHANNEL', status: 'PASS' },
      { id: 'STORAGE_TRI_MODE', status: 'PASS' },
      { id: 'PCIE_RISER', status: 'PASS' },
      { id: 'NETWORKING_OCP', status: 'PASS' },
      { id: 'POWER_ENVIRONMENT', status: 'PASS' },
      { id: 'SUPPORT_MANUFACTURING', status: 'WARN' }
    ]
  });

  const b14 = checks.find(c => c.id === 'B14');
  assert.equal(b14.status, 'ACTION_REQUIRED');
  assert.equal(b14.evidence.ruleId, '81322276');
  assert.equal(b14.evidence.qualifyingComQty, 1);
  assert.equal(b14.evidence.requiredServers, 10);
});

test('Step 4.2 — Companion *_Services.json non-destructive attachment and index lookup', () => {
  withTempDir(tmp => {
    const catalogJsonPath = path.join(tmp, 'TestSrv_Catalog.json');
    const servicesJsonPath = path.join(tmp, 'TestSrv_Services.json');
    const catalogData = {
      metadata: { product: 'TestSrv', totalUniqueSKUs: 1 },
      entries: [
        {
          parentCategory: 'Base Chassis',
          subCategory: 'Server',
          skus: [{ 'Product #': 'P73282-B21', Description: 'HPE DL380 Gen12 CTO Server', 'Unit Price (USD)': '$2500.00' }]
        }
      ]
    };
    const servicesData = {
      metadata: { product: 'TestSrv', section: 'Services' },
      entries: [
        {
          parentCategory: 'Support Services',
          subCategory: 'Tech Care Basic',
          skus: [{ 'Product #': 'HU4B2A3', Description: 'HPE 3Y Tech Care Basic Service', 'Unit Price (USD)': '$950.00' }]
        }
      ]
    };
    fs.writeFileSync(catalogJsonPath, JSON.stringify(catalogData));
    fs.writeFileSync(servicesJsonPath, JSON.stringify(servicesData));

    const attached = attachCompanionServices(catalogData, catalogJsonPath);
    assert.equal(attached, catalogData);
    assert.equal(catalogData.entries.length, 1);
    assert.equal(catalogData.metadata.totalUniqueSKUs, 1);
    assert.equal(Object.keys(catalogData).includes('_servicesEntries'), false);
    assert.equal(catalogData._servicesEntries.length, 1);

    const idx = buildCatalogSkuIndex(catalogData);
    assert.ok(idx.has('P73282-B21'));
    assert.ok(idx.has('HU4B2A3'));
    assert.equal(idx.get('HU4B2A3').parentCategory, 'Support Services');
  });
});

test('Step 4.3 — Shifted-column 142257-002 recovery in pricing engine and HIGH finding in blindspot audit', () => {
  withTempDir(tmp => {
    const prodDir = path.join(tmp, 'MSL3040_Tape');
    fs.mkdirSync(prodDir, { recursive: true });
    const catalogJsonPath = path.join(prodDir, 'MSL3040_Tape_Catalog.json');
    const servicesJsonPath = path.join(prodDir, 'MSL3040_Tape_Services.json');
    fs.writeFileSync(catalogJsonPath, JSON.stringify({
      metadata: { scrapeDate: '2026-11-18' },
      entries: []
    }));
    fs.writeFileSync(servicesJsonPath, JSON.stringify({
      metadata: { scrapeDate: '2026-11-18' },
      entries: [{
        parentCategory: 'Power Cords',
        subCategory: 'Jumper Cords',
        skus: [{
          'Product #': '142257-002',
          Available: 'HPE C13 - C14 WW 250V 10Amp 2.5m Jumper Cord',
          Description: '34.00',
          'Unit Price (USD)': '142257-002 [90]',
          listPrice: 142257
        }]
      }]
    }));

    const catEntry = {
      id: 'MSL3040_Tape',
      family: 'StoreEver',
      gen: 'Tape',
      catalogDir: prodDir,
      catalogJsonPath,
      servicesJsonPath,
      hasServices: true
    };

    const { compareSkuAcrossSolutions } = require('../../scripts/lib/catalog/cross_solution_pricing.js');
    const cmp = compareSkuAcrossSolutions('142257-002', { catalogs: [catEntry] });
    assert.equal(cmp.matches.length, 1);
    assert.equal(cmp.matches[0].listPriceUsd, null);
    assert.equal(cmp.matches[0].priceStatus, 'SHIFTED_COLUMN_REJECTED');
    assert.equal(cmp.matches[0].priceState, 'PARSE_FAILED');
    assert.equal(cmp.matches[0].description, 'HPE C13 - C14 WW 250V 10Amp 2.5m Jumper Cord');

    const audit = auditProductBlindspots(catEntry);
    const shiftedFinding = audit.findings.find(f => f.code === 'SHIFTED_COLUMN_CORRUPTION');
    assert.ok(shiftedFinding);
    assert.equal(shiftedFinding.severity, 'HIGH');
    assert.equal(shiftedFinding.count, 1);
  });
});

test('Step 4.4 — Same-gen price & lead-time backfill and normalizeMaxQtySentinel(-2)', () => {
  assert.equal(normalizeMaxQtySentinel(-2), null);
  assert.equal(normalizeMaxQtySentinel(-1), null);
  assert.equal(normalizeMaxQtySentinel(8), 8);

  withTempDir(tmp => {
    const gen12Dir = path.join(tmp, 'DL360_Gen12');
    const gen11Dir = path.join(tmp, 'DL360_Gen11');
    fs.mkdirSync(gen12Dir, { recursive: true });
    fs.mkdirSync(gen11Dir, { recursive: true });

    const gen12CatPath = path.join(gen12Dir, 'DL360_Gen12_Catalog.json');
    const gen11CatPath = path.join(gen11Dir, 'DL360_Gen11_Catalog.json');
    fs.writeFileSync(gen12CatPath, JSON.stringify({
      metadata: { scrapeDate: '2026-11-10' },
      entries: [{
        parentCategory: 'Storage',
        skus: [{ 'Product #': 'P74571-B21', Description: 'HPE 1.92TB NVMe RI SSD', 'Unit Price (USD)': '$890.00', leadTimeDays: 14 }]
      }]
    }));
    fs.writeFileSync(gen11CatPath, JSON.stringify({
      metadata: { scrapeDate: '2026-11-15' },
      entries: [{
        parentCategory: 'Networking',
        skus: [{ 'Product #': 'P99999-B21', Description: 'Gen11 Only Adapter', 'Unit Price (USD)': '$500.00', leadTimeDays: 7 }]
      }]
    }));

    const catalogs = [
      { id: 'DL360_Gen12', gen: 'Gen12', catalogDir: gen12Dir, catalogJsonPath: gen12CatPath, scrapeDate: '2026-11-10' },
      { id: 'DL360_Gen11', gen: 'Gen11', catalogDir: gen11Dir, catalogJsonPath: gen11CatPath, scrapeDate: '2026-11-15' }
    ];

    const res = backfillMissingPricesAndLeadTimes([
      { sku: 'P74571-B21', description: 'SSD', unitPriceUsd: null, leadTimeDays: null },
      { sku: 'P99999-B21', description: 'Cross-gen SKU', unitPriceUsd: null, leadTimeDays: null }
    ], 'Gen12', { catalogs });

    assert.equal(res[0].unitPriceUsd, 890);
    assert.equal(res[0].leadTimeDays, 14);
    assert.equal(res[0].backfilledFromProduct, 'DL360_Gen12');
    // Cross-gen Gen11 price MUST NOT bleed into Gen12 backfill
    assert.equal(res[1].unitPriceUsd, null);
    assert.equal(res[1].leadTimeDays, null);
  });
});

test('Step 4.5 — Route workflow chaining: MULTI_CLUSTER_TENDER, WORKLOAD_DNA, and OCR_QUOTE_INGESTION', async () => {
  // 1. MULTI_CLUSTER_TENDER runs perClusterEvaluations when structured items are provided
  const clusterRes = await executeRoutedQuery('Size 10 nodes of DL380 Gen12 cluster', {
    intent: 'MULTI_CLUSTER_TENDER',
    chassisName: 'DL380_Gen12',
    serverCount: 10,
    offline: true,
    items: [
      { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF Configure-to-order Server', category: 'Base Chassis', quantity: 10 },
      { sku: 'P71124-B21', description: 'Intel Xeon 6530P 32-core Processor', category: 'Processor', quantity: 20 },
      { sku: 'P38995-B21', description: 'HPE 1600W Flex Slot Platinum Power Supply Kit', category: 'Power Supply', quantity: 20 }
    ]
  });
  assert.equal(clusterRes.result.intent, 'MULTI_CLUSTER_TENDER');
  assert.equal(clusterRes.result.status, 'DRAFT_VALIDATION_REQUIRED');
  assert.ok(Array.isArray(clusterRes.result.clusterAnalysis.perClusterEvaluations));
  assert.ok(clusterRes.result.clusterAnalysis.perClusterEvaluations.length >= 1);
  assert.ok(clusterRes.result.clusterAnalysis.perClusterEvaluations[0].evaluation);

  // 2. WORKLOAD_DNA without items preserves SCOPED_SIZING_REQUIRED and includes dnaProfile + constraints
  const dnaRes = await executeRoutedQuery('SAP HANA in-memory database workload sizing', {
    intent: 'WORKLOAD_DNA',
    offline: true
  });
  assert.equal(dnaRes.result.intent, 'WORKLOAD_DNA');
  assert.equal(dnaRes.result.status, 'SCOPED_SIZING_REQUIRED');
  assert.ok(dnaRes.result.dnaProfile);
  assert.equal(dnaRes.result.recommendedSizingConstraints.minFlashEndurance, 'MU_OR_WI');

  // 3. OCR_QUOTE_INGESTION chains downstream into WORKLOAD_DNA when continueDownstream is true
  const ocrService = require('../../scripts/lib/ocr/ocr_service.js');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-ocr-chain-'));
  const dummyPng = path.join(tmpDir, 'dl380_quote.png');
  fs.writeFileSync(dummyPng, 'mock-png');
  const origOcr = ocrService.performGeminiOcr;
  ocrService.performGeminiOcr = async () => ({
    isOcrProcessed: true,
    ocrStatus: 'SUCCESS',
    lineCount: 2,
    detectedSkus: ['P73282-B21', 'P71124-B21'],
    modelUsed: 'gemini-3.6-flash',
    text: '1x P73282-B21 HPE ProLiant DL380 Gen12 CTO Server\n2x P71124-B21 Intel Xeon 6530P Processor'
  });

  try {
    const ocrRes = await executeRoutedQuery('Parse DL380 Gen12 quote image', {
      filePath: dummyPng,
      executeOcr: true,
      continueDownstream: true,
      downstreamIntent: 'WORKLOAD_DNA',
      chassisName: 'DL380_Gen12'
    });
    assert.equal(ocrRes.result.intent, 'OCR_QUOTE_INGESTION');
    assert.equal(ocrRes.result.status, 'OCR_EXTRACTION_SUCCESS');
    assert.ok(ocrRes.result.downstreamResult);
    assert.equal(ocrRes.result.downstreamResult.intent, 'WORKLOAD_DNA');
  } finally {
    ocrService.performGeminiOcr = origOcr;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
