'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const xlsx = require('xlsx-js-style');

const { resolveCapabilityToSku } = require('../../scripts/lib/catalog/generic_domain_templates.js');
const {
  extractCanonicalAttributes,
  extractCompactCanonicalSpecs,
  CANONICAL_CATEGORY_SCHEMA
} = require('../../scripts/lib/catalog/attribute_vectors.js');
const {
  resolveTableTaxonomyAndRole,
  _reconcileVariantMatrixFromCatalog
} = require('../../scripts/catalogs/build_catalog.js');
const { loadProfile } = require('../../scripts/lib/system/profile_loader.js');
const { validateCatalogCoverage } = require('../../scripts/lib/catalog/catalog_coverage.js');
const { createCaptureReceipt } = require('../../scripts/lib/catalog/catalog_capture_receipt.js');
const { safeWriteJsonAtomic } = require('../../scripts/lib/system/fs_compat.js');

function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'phase1-schema-hardening-'));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('Phase 1.1 — resolveCapabilityToSku resolves real Catalog.json entry.skus and preserves legacy entry.options', () => {
  const liveFormatCatalog = {
    entries: [
      {
        parentCategory: 'Accessories & Infrastructure',
        subCategory: 'Misc',
        skus: [
          {
            'Product #': 'P00001-B21',
            Description: 'HPE ProLiant High Performance Fan Kit (Removed)',
            'List Price (USD)': '150.00',
            'Diff Status': 'REMOVED'
          }
        ]
      },
      {
        parentCategory: 'Cooling / Thermal',
        subCategory: 'High Performance & Standard Fan Kits',
        skus: [
          {
            'Product #': 'P74795-B21',
            Description: 'HPE ProLiant Compute DL380 Gen12 High Performance Fan Kit',
            'List Price (USD)': '$295.00'
          }
        ]
      },
      {
        parentCategory: 'Power Supplies',
        subCategory: 'Flex Slot Power Supplies',
        skus: [
          {
            sku: 'P75100-B21',
            Description: 'HPE 2400W Flex Slot Titanium Hot Plug Power Supply Kit',
            listPrice: null
          }
        ]
      }
    ]
  };

  const fan = resolveCapabilityToSku('HIGH_PERFORMANCE_COOLING', liveFormatCatalog);
  assert.ok(fan, 'Must resolve real Catalog.json entry.skus');
  assert.equal(fan.sku, 'P74795-B21', 'Must skip REMOVED tombstone and pick active Cooling entry');
  assert.equal(fan.price, 295);
  assert.match(fan.description, /High Performance Fan Kit/i);

  const psu = resolveCapabilityToSku('GPU_AUXILIARY_POWER_AND_TITANIUM_PSU', liveFormatCatalog);
  assert.ok(psu);
  assert.equal(psu.sku, 'P75100-B21');
  assert.equal(psu.price, null, 'Unpriced SKU must preserve nullable price (never coerce to 0)');

  // Legacy entry.options with explicit $0 still works
  const legacyCatalog = {
    entries: [
      {
        parentCategory: 'Factory Configuration Settings',
        subCategory: 'FIO Options',
        options: [
          { sku: '873763-B21', name: 'HPE ProLiant Compute No Drive Configuration FIO Kit', priceUsd: 0 }
        ]
      }
    ]
  };
  const fio = resolveCapabilityToSku('NO_DRIVE_BLANK_OR_FIO_BYPASS', legacyCatalog);
  assert.ok(fio);
  assert.equal(fio.sku, '873763-B21');
  assert.equal(fio.price, 0);

  // Negative control: unknown capability returns null
  assert.equal(resolveCapabilityToSku('NON_EXISTENT_CAPABILITY', liveFormatCatalog), null);
});

test('Phase 1.2a — attribute_vectors eliminates fabricated socketCount:2 on non-servers and preserves true servers', () => {
  const dl380 = extractCompactCanonicalSpecs({
    sku: 'P73282-B21',
    description: 'HPE ProLiant Compute DL380 Gen12 8SFF NC CTO Server',
    category: 'Chassis'
  });
  assert.equal(dl380.category, 'Chassis');
  assert.equal(dl380.socketCount, 2);
  assert.equal(dl380.uHeight, 2);
  assert.equal(dl380.bayCount, 8);

  const dl145 = extractCompactCanonicalSpecs({
    sku: 'P71964-B21',
    description: 'HPE ProLiant DL145 Gen11 Configure-to-order Server',
    category: 'Chassis'
  });
  assert.equal(dl145.category, 'Chassis');
  assert.equal(dl145.socketCount, 1);

  const dl580 = extractCompactCanonicalSpecs({
    sku: 'P75399-B21',
    description: 'HPE ProLiant Compute DL580 Gen12 SFF Configure-to-order Server',
    category: 'Chassis'
  });
  assert.equal(dl580.category, 'Chassis');
  assert.equal(dl580.socketCount, 4);

  // Negative controls: accessories, Synergy Frame, Alletra MP, Tape Library MUST NOT get socketCount: 2
  const nonServers = [
    { sku: 'P73325-B21', description: 'HPE ProLiant Compute Localization FIO Kit', category: 'Accessories & Infrastructure' },
    { sku: 'P51174-B21', description: 'HPE Synergy 12000 Configure-to-order Frame', category: 'Chassis' },
    { sku: 'R7C75A', description: 'HPE Alletra Storage MP 10000 2U Chassis', category: 'Accessories & Infrastructure' },
    { sku: 'S0U79A', description: 'HPE Alletra Storage MP CDM Bluetooth Connect Kit', category: 'Accessories & Infrastructure' },
    { sku: 'Q6Q62C', description: 'HPE StoreEver MSL3040 Scalable Base Module', category: 'Chassis' },
    { sku: 'CUSTOM1', description: 'Generic Base Chassis Enclosure', category: 'Chassis' }
  ];

  for (const item of nonServers) {
    const specs = extractCompactCanonicalSpecs(item);
    assert.equal(specs.socketCount, undefined, `${item.sku} (${item.description}) must NOT fabricate socketCount`);
  }
});

test('Phase 1.2b — attribute_vectors QuickSpecs GPU lookup populates TDP, VRAM, formFactor, auxPower and excludes non-GPUs', () => {
  const gpuCases = [
    { desc: 'NVIDIA H200 NVL 141GB PCIe Accelerator for HPE', tdp: 600, vram: 141, ff: 'Double-Wide PCIe', aux: '16-pin (12V-2x6)' },
    { desc: 'NVIDIA H100 NVL 94GB PCIe Accelerator for HPE', tdp: 400, vram: 94, ff: 'Double-Wide PCIe', aux: '16-pin (12VHPWR)' },
    { desc: 'NVIDIA H100 80GB PCIe Accelerator for HPE', tdp: 350, vram: 80, ff: 'Double-Wide PCIe', aux: '16-pin (12VHPWR)' },
    { desc: 'NVIDIA B200 Accelerator for HPE', tdp: 1000, vram: 180, ff: 'SXM/OAM', aux: 'SXM Baseboard' },
    { desc: 'NVIDIA L40S 48GB PCIe Accelerator', tdp: 350, vram: 48, ff: 'Double-Wide PCIe', aux: '16-pin (12VHPWR)' },
    { desc: 'NVIDIA L40 48GB PCIe Accelerator', tdp: 300, vram: 48, ff: 'Double-Wide PCIe', aux: '16-pin (12VHPWR)' },
    { desc: 'NVIDIA L4 24GB PCIe Accelerator for HPE', tdp: 72, vram: 24, ff: 'Single-Wide PCIe', aux: 'None (PCIe Slot Powered)' },
    { desc: 'NVIDIA A100 80GB PCIe Non-CEC Accelerator', tdp: 300, vram: 80, ff: 'Double-Wide PCIe', aux: '8-pin CPU/EPS' },
    { desc: 'NVIDIA A40 48GB PCIe Non-CEC Accelerator', tdp: 300, vram: 48, ff: 'Double-Wide PCIe', aux: '8-pin CPU/EPS' },
    { desc: 'NVIDIA A30 PCIe Accelerator', tdp: 165, vram: 24, ff: 'Double-Wide PCIe', aux: '8-pin CPU/EPS' },
    { desc: 'NVIDIA A16 64GB PCIe Non-CEC Accelerator', tdp: 250, vram: 64, ff: 'Double-Wide PCIe', aux: '8-pin CPU/EPS' },
    { desc: 'NVIDIA A2 16GB PCIe Non-CEC Accelerator', tdp: 60, vram: 16, ff: 'Single-Wide PCIe', aux: 'None (PCIe Slot Powered)' },
    { desc: 'NVIDIA RTX 6000 Ada Generation 48GB PCIe Accelerator', tdp: 300, vram: 48, ff: 'Double-Wide PCIe', aux: '16-pin (12VHPWR)' },
    { desc: 'NVIDIA RTX PRO 6000 Blackwell Server Edition 96GB PCIe Accelerator', tdp: 600, vram: 96, ff: 'Double-Wide PCIe', aux: '16-pin (12V-2x6)' },
    { desc: 'NVIDIA RTX PRO 4500 Blackwell Server Edition 32GB PCIe Accelerator for HPE', tdp: 200, vram: 32, ff: 'Double-Wide PCIe', aux: '16-pin (12V-2x6)' },
    { desc: 'NVIDIA RTX 4000 Ada 20GB PCIe Accelerator', tdp: 130, vram: 20, ff: 'Single-Wide PCIe', aux: '16-pin (12VHPWR)' },
    { desc: 'AMD Instinct MI300X 192GB OAM Accelerator', tdp: 750, vram: 192, ff: 'SXM/OAM', aux: 'OAM Baseboard' },
    { desc: 'AMD Instinct MI325X 256GB OAM Accelerator', tdp: 1000, vram: 256, ff: 'SXM/OAM', aux: 'OAM Baseboard' }
  ];

  for (const tc of gpuCases) {
    const specs = extractCompactCanonicalSpecs({ sku: 'GPU-TEST', description: tc.desc, category: 'Graphics & GPU' });
    assert.equal(specs.category, 'GPU / Accelerator', `Expected GPU category for ${tc.desc}`);
    assert.equal(specs.tdpWatts, tc.tdp, `TDP mismatch for ${tc.desc}`);
    assert.equal(specs.vramGb, tc.vram, `VRAM mismatch for ${tc.desc}`);
    assert.equal(specs.formFactor, tc.ff, `FormFactor mismatch for ${tc.desc}`);
    assert.equal(specs.auxPower, tc.aux, `auxPower mismatch for ${tc.desc}`);
  }

  // Negative controls: switches with NVIDIA Cumulus, GPU Mode FIO, and NVIDIA E-LTU MUST NOT classify as GPU / Accelerator
  const nonGpuCases = [
    { sku: 'S2T79A', description: 'HPE 200GbE 32QSFP56 Power to Connector Airflow Switch SN3700M with NVIDIA Cumulus', category: 'Networking' },
    { sku: 'P75008-B21', description: 'HPE ProLiant Compute DL380a Gen12 8 Double Wide/16 Single Wide FIO Configuration', category: 'Graphics & GPU' },
    { sku: 'S2S17AAE', description: 'NVIDIA AI Enterprise per GPU 3-year Subscription 9x5 Support E-LTU', category: 'Software & Licenses' },
    { sku: 'R3Q37AAE', description: 'NVIDIA RTX Virtual Workstation 1 Concurrent User 3-year Subscription E-LTU', category: 'Software & Licenses' }
  ];
  for (const item of nonGpuCases) {
    const specs = extractCompactCanonicalSpecs(item);
    assert.notEqual(specs.category, 'GPU / Accelerator', `${item.sku} must NOT classify as GPU / Accelerator`);
  }
});

test('Phase 1.2c — attribute_vectors extracts optics, switches, storage arrays, tape drives/libraries, and Synergy enclosures', () => {
  // Optics reach / fiberMode / wavelengthNm
  const sr4 = extractCompactCanonicalSpecs({ sku: 'Q2F19A', description: 'HPE 100GbE QSFP28 SR4 100m Transceiver', category: 'Networking' });
  assert.equal(sr4.category, 'Networking / FC / Optics');
  assert.equal(sr4.reach, 'SR4');
  assert.equal(sr4.reachDistance, '100m');
  assert.equal(sr4.fiberMode, 'MMF');
  assert.equal(sr4.wavelengthNm, 850);

  const lr = extractCompactCanonicalSpecs({ sku: 'P000LR', description: 'HPE 25GbE SFP28 LR 10km Single-mode 1310nm Transceiver', category: 'Networking' });
  assert.equal(lr.reach, 'LR');
  assert.equal(lr.reachDistance, '10km');
  assert.equal(lr.fiberMode, 'SMF');
  assert.equal(lr.wavelengthNm, 1310);

  const dac = extractCompactCanonicalSpecs({ sku: 'JL271A', description: 'HPE Networking X240 100G QSFP28 1m DAC Cable', category: 'Networking' });
  assert.equal(dac.reach, 'DAC');
  assert.equal(dac.fiberMode, 'Copper');
  assert.equal(dac.wavelengthNm, undefined);

  const elw = extractCompactCanonicalSpecs({ sku: 'Q2P63A', description: 'HPE B-series 32Gb SFP28 ELW 25km Transceiver', category: 'Networking' });
  assert.equal(elw.reach, 'ELW');
  assert.equal(elw.fiberMode, 'SMF');
  assert.equal(elw.wavelengthNm, 1550);

  // Switches: totalPorts, licensedPorts, airflow
  const sn3600b = extractCompactCanonicalSpecs({
    sku: 'R7R97A',
    description: 'HPE SN3600B 32Gb 24/8 8-port 32Gb Short Wave SFP28 Fibre Channel Switch',
    category: 'Chassis'
  });
  assert.equal(sn3600b.category, 'Networking / FC / Optics');
  assert.equal(sn3600b.totalPorts, 24);
  assert.equal(sn3600b.licensedPorts, 8);
  assert.equal(sn3600b.reach, 'SW');

  const sn6750b = extractCompactCanonicalSpecs({
    sku: 'R8U62A',
    description: 'HPE SN6750B 64Gb 48/128 48-port 64Gb Short Wave SFP56 Port Side Intake Integrated FC Switch',
    category: 'Networking'
  });
  assert.equal(sn6750b.totalPorts, 128);
  assert.equal(sn6750b.licensedPorts, 48);
  assert.equal(sn6750b.airflow, 'Port Side Intake');

  const sn3700m = extractCompactCanonicalSpecs({
    sku: 'S2T79A',
    description: 'HPE 200GbE 32QSFP56 Power to Connector Airflow Switch SN3700M with NVIDIA Cumulus',
    category: 'Networking'
  });
  assert.equal(sn3700m.totalPorts, 32);
  assert.equal(sn3700m.airflow, 'Power to Connector');

  // Storage Arrays
  const b10100 = extractCompactCanonicalSpecs({
    sku: 'S0B84A',
    description: 'HPE Alletra Storage MP B10100 Switchless Base Configuration',
    category: 'Chassis'
  });
  assert.equal(b10100.category, 'Storage Array');
  assert.equal(b10100.arrayTopology, 'Switchless');
  assert.equal(b10100.mediaTier, 'NVMe All-Flash');
  assert.equal(b10100.maxDrives, 72);

  const b10200 = extractCompactCanonicalSpecs({
    sku: 'S1R06A',
    description: 'HPE Alletra Storage MP B10200 Switched Base Configuration',
    category: 'Chassis'
  });
  assert.equal(b10200.category, 'Storage Array');
  assert.equal(b10200.arrayTopology, 'Switched');
  assert.equal(b10200.maxDrives, 384);

  // Synergy Enclosure
  const frame = extractCompactCanonicalSpecs({
    sku: 'P51174-B21',
    description: 'HPE Synergy 12000 Configure-to-order Frame',
    category: 'Chassis'
  });
  assert.equal(frame.category, 'Synergy Enclosure');
  assert.equal(frame.bayCount, 12);
  assert.equal(frame.interconnectBays, 6);
  assert.equal(frame.uHeight, 10);

  // Tape Drive & Storage Media MUST NEVER classify as Storage Controller
  const lto9Fc = extractCanonicalAttributes({
    sku: 'R6Q74A',
    description: 'HPE StoreEver MSL LTO-9 Ultrium 45000 Fibre Channel Drive Upgrade Kit',
    category: 'Storage Controllers'
  });
  assert.equal(lto9Fc.category, 'Tape Drive');
  assert.equal(lto9Fc.attributes.ltoGen, 'LTO-9');
  assert.equal(lto9Fc.attributes.hostInterface, 'FC');
  assert.equal(lto9Fc.attributes.nativeCapacityTb, 18);
  assert.equal(lto9Fc.attributes.compressedCapacityTb, 45);
  assert.equal(lto9Fc.attributes.needsBattery, undefined);
  assert.equal(lto9Fc.attributes.portCount, undefined);

  const lto6Sas = extractCanonicalAttributes({
    sku: 'C0H27A',
    description: 'HPE StoreEver MSL LTO-6 Ultrium 6250 SAS Drive Upgrade Kit',
    category: 'Storage Controllers'
  });
  assert.equal(lto6Sas.category, 'Tape Drive');
  assert.equal(lto6Sas.attributes.ltoGen, 'LTO-6');
  assert.equal(lto6Sas.attributes.hostInterface, 'SAS');

  const ltoCart = extractCanonicalAttributes({
    sku: 'Q2079A',
    description: 'HPE LTO-9 Ultrium 45TB RW Data Cartridge',
    category: 'Storage Media'
  });
  assert.equal(ltoCart.category, 'Storage Media');
  assert.equal(ltoCart.attributes.ltoGen, 'LTO-9');
  assert.equal(ltoCart.attributes.nativeCapacityTb, 18);
  assert.equal(ltoCart.attributes.compressedCapacityTb, 45);

  const mslLib = extractCanonicalAttributes({
    sku: 'Q6Q62C',
    description: 'HPE StoreEver MSL3040 Tape Library Base Module',
    category: 'Chassis'
  });
  assert.equal(mslLib.category, 'Tape Library');
  assert.equal(mslLib.attributes.slotCount, 40);

  assert.ok(CANONICAL_CATEGORY_SCHEMA['Storage Array']);
  assert.ok(CANONICAL_CATEGORY_SCHEMA['Tape Library']);
  assert.ok(CANONICAL_CATEGORY_SCHEMA['Synergy Enclosure']);
});

test('Phase 1.3 — build_catalog taxonomy fixes MSL3040 LTO drives, Alletra X10000 switches/bluetooth, and Synergy [OB] variants', async () => {
  const storeEverProfile = await loadProfile('StoreEver', 'Tape');

  const ltoDriveRes = resolveTableTaxonomyAndRole(
    { name: 'Tape Drives', parentCategory: 'Storage Controllers', constraint: 'max 3', minQty: 0, maxQty: 3 },
    100,
    { label: 'Tape Drives' },
    [],
    storeEverProfile,
    [
      { 'Product #': 'C0H28A', Description: 'HPE StoreEver MSL LTO-6 Ultrium 6250 Fibre Channel Drive Upgrade Kit' },
      { 'Product #': 'C0H27A', Description: 'HPE StoreEver MSL LTO-6 Ultrium 6250 SAS Drive Upgrade Kit' }
    ]
  );
  assert.equal(ltoDriveRes.parentCat, 'Tape Drives', 'MSL3040 LTO drives must classify under Tape Drives, NOT Storage Controllers');
  assert.equal(ltoDriveRes.detectedRole, 'Tape Drive');

  const ltoMediaRes = resolveTableTaxonomyAndRole(
    { name: 'Storage Media', parentCategory: 'Storage Controllers', constraint: 'max 999', minQty: 0, maxQty: 999 },
    200,
    { label: 'Storage Media' },
    [],
    storeEverProfile,
    [{ 'Product #': 'C7973A', Description: 'HPE LTO-3 Ultrium 800 GB Re-writable Data Cartridge' }]
  );
  assert.equal(ltoMediaRes.parentCat, 'Storage Media');

  // Alletra MP X10000 Back-End Switches (both AC & -48VDC) -> Networking (NOT Power Supplies)
  const x10000Switches = resolveTableTaxonomyAndRole(
    { name: 'Back-End Switches', parentCategory: 'Power Supplies', constraint: 'max 2', minQty: 0, maxQty: 2 },
    300,
    { label: 'Back-End Switches' },
    [],
    null,
    [
      { 'Product #': 'S1R08A', Description: 'HPE Alletra Storage MP 32-port 100GbE Switch Bundle' },
      { 'Product #': 'S1S69A', Description: 'HPE Alletra Storage MP 32-port 100GbE -48VDC Switch Bundle' }
    ]
  );
  assert.equal(x10000Switches.parentCat, 'Networking', 'Alletra MP X10000 Back-End Switches must classify under Networking');

  // Alletra MP X10000 BlueTooth Connectivity Kit -> Accessories & Infrastructure (NOT Power Supplies)
  const x10000Bt = resolveTableTaxonomyAndRole(
    { name: 'BlueTooth Connectivity Kit', parentCategory: 'Power Supplies', constraint: 'max 1', minQty: 0, maxQty: 1 },
    310,
    { label: 'BlueTooth Connectivity Kit' },
    [],
    null,
    [{ 'Product #': 'S0U79A', Description: 'HPE Alletra Storage MP CDM Bluetooth Connect Kit' }]
  );
  assert.equal(x10000Bt.parentCat, 'Accessories & Infrastructure', 'BlueTooth Connectivity Kit must classify under Accessories & Infrastructure');

  // Synergy_12000_Frame variant reconciliation must exclude Frame Options and [OB] obsolete compute modules
  const matrix = {};
  _reconcileVariantMatrixFromCatalog(matrix, {
    entries: [
      {
        parentCategory: 'Chassis',
        subCategory: 'Variants',
        skus: [{ sku: 'P51174-B21', Description: 'HPE Synergy 12000 Configure-to-order Frame', listPrice: 8500, 'Component Role': 'Base Chassis' }]
      },
      {
        parentCategory: 'Frame Options',
        subCategory: 'Compute',
        skus: [
          { sku: '732350-B21', Description: 'HPE Synergy 480 Gen9 CTO Compute Module', listPrice: null, 'Component Role': 'Base Chassis', lifecycleBadge: 'OB', 'Lifecycle Status': 'Obsolete (OB)' },
          { sku: 'P68217-B21', Description: 'HPE Synergy 480 Gen12 CTO Compute Module', listPrice: 4200, 'Component Role': 'Base Chassis' }
        ]
      }
    ]
  });
  assert.ok(matrix['P51174-B21'], 'Active Frame base SKU must be retained');
  assert.equal(matrix['732350-B21'], undefined, '[OB] Frame Options compute module must NOT be promoted into Frame chassisVariantMatrix');
  assert.equal(matrix['P68217-B21'], undefined, 'Child Frame Options module must NOT be promoted into Frame chassisVariantMatrix');
});

test('Phase 1.4 — chassis_map.json includes Alletra MP B10000/X10000 and Synergy owned module base SKUs', () => {
  const cmap = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../scripts/config/chassis_map.json'), 'utf8'));
  const byFg = cmap.chassis_base_skus_by_family_gen;
  const flat = cmap.chassis_base_skus;

  assert.ok(byFg.Alletra_MP_B10000?.skus?.S0B84A, 'Alletra_MP_B10000 switchless S0B84A in by_family_gen');
  assert.ok(byFg.Alletra_MP_B10000?.skus?.S1R06A, 'Alletra_MP_B10000 switched S1R06A in by_family_gen');
  assert.equal(byFg.Alletra_MP_B10000.skus.S0B84A.topology, 'switchless');
  assert.equal(byFg.Alletra_MP_B10000.skus.S1R06A.topology, 'switched');

  assert.ok(byFg.Alletra_MP_X10000?.skus?.S3L12A, 'Alletra_MP_X10000 S3L12A in by_family_gen');
  assert.ok(byFg.Synergy_4Port_Frame_Link_Module?.skus?.['876852-B21'], '876852-B21 in by_family_gen');
  assert.ok(byFg.Synergy_Brocade_64Gb_FC_Module?.skus?.['P77653-B21'], 'P77653-B21 in by_family_gen');

  for (const sku of ['S0B84A', 'S1R06A', 'S3L12A', '876852-B21', 'P77653-B21']) {
    assert.ok(flat[sku], `${sku} must be present in flat chassis_base_skus`);
  }
  assert.equal(flat.S0B84A.listPrice, null, 'Unpriced Alletra base must stay null (never fabricated $0)');
  assert.equal(flat['876852-B21'].listPrice, 2210);
  assert.equal(flat['P77653-B21'].listPrice, 63999);
});

test('Phase 1.5 — catalog_coverage_profiles & capture receipt enforce staging hardware floors and stub quarantine', () => {
  const profilesPath = path.resolve(__dirname, '../../scripts/config/catalog_coverage_profiles.json');
  const profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8')).profiles;

  assert.equal(profiles.Alletra_Storage_System.archivedStub, true);
  assert.equal(profiles.GX5000_General_RACK.archivedStub, true);
  assert.ok(profiles.DL380_Gen12.minActualDrives >= 5);
  assert.ok(profiles.DL380a_Gen12.minActualGpuCards >= 1);
  assert.equal(profiles.DL380_Gen12.maxZeroPriceBaseVariants, 0);
  assert.equal(profiles.DL380_Gen12.maxAgeDays, 30);

  withTempDir((tmpDir) => {
    const customProfiles = path.join(tmpDir, 'profiles.json');
    const nowIso = new Date().toISOString();
    safeWriteJsonAtomic(customProfiles, {
      profiles: {
        GPU_SERVER: {
          product: 'GPU Server',
          mandatoryCategories: ['Processor', 'Chassis'],
          minActualDrives: 2,
          minActualGpuCards: 1,
          maxZeroPriceBaseVariants: 0,
          maxAgeDays: 30
        },
        STUB_PROD: {
          product: 'Archived Stub',
          archivedStub: true,
          mandatoryCategories: ['Variants']
        }
      }
    });

    const wb = { SheetNames: ['All SKUs'], Sheets: { 'All SKUs': xlsx.utils.aoa_to_sheet([['Product #'], ['P1-B21']]) } };
    const services = { entries: [] };

    const validCatalog = {
      metadata: { scrapeTimestamp: nowIso, totalUniqueSKUs: 5 },
      entries: [
        { parentCategory: 'Chassis', subCategory: 'Variants', skus: [{ sku: 'P10000-B21', Description: 'HPE DL380a Gen12 CTO Server', listPrice: 21407, 'Component Role': 'Base Chassis' }] },
        { parentCategory: 'Processor', subCategory: 'Intel Xeon', skus: [{ sku: 'P10001-B21', Description: 'Intel Xeon 6760P 64-core Processor', listPrice: 8000 }] },
        {
          parentCategory: 'Drive Enclosures / Drives',
          subCategory: 'NVMe SSDs',
          skus: [
            { sku: 'P10002-B21', Description: 'HPE 3.84TB NVMe Read Intensive SFF SSD', listPrice: 1200 },
            { sku: 'P10003-B21', Description: 'HPE 7.68TB NVMe Read Intensive SFF SSD', listPrice: 2400 }
          ]
        },
        { parentCategory: 'Graphics & GPU', subCategory: 'GPU Accelerators', skus: [{ sku: 'P10004-B21', Description: 'NVIDIA H200 NVL 141GB PCIe Accelerator for HPE', listPrice: 45000 }] }
      ]
    };

    // Positive control: passes hardened staging floors
    const okRes = validateCatalogCoverage('GPU_SERVER', validCatalog, services, wb, customProfiles, { enforceStagingFloors: true });
    assert.equal(okRes.valid, true, `Expected valid, got: ${okRes.reason}`);
    assert.equal(okRes.stagingFloorMetrics.actualDrives, 2);
    assert.equal(okRes.stagingFloorMetrics.actualGpuCards, 1);
    assert.equal(okRes.stagingFloorMetrics.zeroPriceBaseVariants, 0);

    // Negative control 1: GPU Mode FIO alone must FAIL minActualGpuCards
    const noRealGpuCatalog = structuredClone(validCatalog);
    noRealGpuCatalog.entries[3].skus = [{ sku: 'P75008-B21', Description: 'HPE ProLiant Compute DL380a Gen12 8 Double Wide/16 Single Wide FIO Configuration', listPrice: 0 }];
    const noGpuRes = validateCatalogCoverage('GPU_SERVER', noRealGpuCatalog, services, wb, customProfiles, { enforceStagingFloors: true });
    assert.equal(noGpuRes.valid, false);
    assert.match(noGpuRes.reason, /minActualGpuCards: 0 below 1/);

    // Negative control 2: 0 actual drives must FAIL minActualDrives
    const noDrivesCatalog = structuredClone(validCatalog);
    noDrivesCatalog.entries[2].skus = [{ sku: 'P74743-B21', Description: 'HPE DL380 Gen12 8SFF Drive Cage Kit', listPrice: 250 }];
    const noDrivesRes = validateCatalogCoverage('GPU_SERVER', noDrivesCatalog, services, wb, customProfiles, { enforceStagingFloors: true });
    assert.equal(noDrivesRes.valid, false);
    assert.match(noDrivesRes.reason, /minActualDrives: 0 below 2/);

    // Negative control 3: $0 active base variant must FAIL maxZeroPriceBaseVariants
    const zeroBaseCatalog = structuredClone(validCatalog);
    zeroBaseCatalog.entries[0].skus[0].listPrice = 0;
    const zeroBaseRes = validateCatalogCoverage('GPU_SERVER', zeroBaseCatalog, services, wb, customProfiles, { enforceStagingFloors: true });
    assert.equal(zeroBaseRes.valid, false);
    assert.match(zeroBaseRes.reason, /maxZeroPriceBaseVariants: 1 exceeds 0/);

    // Negative control 4: stale >30d capture must FAIL maxAgeDays
    const staleCatalog = structuredClone(validCatalog);
    staleCatalog.metadata.scrapeTimestamp = new Date(Date.now() - 45 * 86400000).toISOString();
    const staleRes = validateCatalogCoverage('GPU_SERVER', staleCatalog, services, wb, customProfiles, { enforceStagingFloors: true });
    assert.equal(staleRes.valid, false);
    assert.match(staleRes.reason, /maxAgeDays:/);

    // Negative control 5: archivedStub profile must FAIL staging enforcement
    const stubRes = validateCatalogCoverage(
      'STUB_PROD',
      { metadata: { scrapeTimestamp: nowIso }, entries: [{ parentCategory: 'Chassis', subCategory: 'Variants', skus: [{ sku: 'R0Q35A', listPrice: 12500 }] }] },
      services,
      wb,
      customProfiles,
      { enforceStagingFloors: true }
    );
    assert.equal(stubRes.valid, false);
    assert.match(stubRes.reason, /archivedStub/);

    // Integration check via createCaptureReceipt: blocks missing GPUs on staging promotion
    const stage = path.join(tmpDir, 'stage');
    const live = path.join(tmpDir, 'live');
    fs.mkdirSync(path.join(stage, 'raw_data'), { recursive: true });
    safeWriteJsonAtomic(path.join(stage, 'GPU_SERVER_Catalog.json'), noRealGpuCatalog, { rejectInvalid: false });
    safeWriteJsonAtomic(path.join(stage, 'GPU_SERVER_Services.json'), { entries: [] }, { rejectInvalid: false });
    safeWriteJsonAtomic(path.join(stage, 'GPU_SERVER_Catalog_Rules.json'), { rules: [] }, { rejectInvalid: false });
    safeWriteJsonAtomic(path.join(stage, 'raw_data', 'oca_raw_data_full.json'), {
      timestamp: nowIso,
      selectedBaseSku: 'P10000-B21',
      ownerConfiguration: 'GPU_SERVER #1',
      solutionDomain: 'SERVER',
      observedSelectors: [{ selector: 'gpuMode', value: '8DW' }],
      finalSelectorsRestored: true
    }, { rejectInvalid: false });
    const realWb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(
      realWb,
      xlsx.utils.aoa_to_sheet([['Product #'], ['P10000-B21'], ['P10001-B21'], ['P10002-B21'], ['P10003-B21'], ['P75008-B21']]),
      'All SKUs'
    );
    xlsx.writeFile(realWb, path.join(stage, 'GPU_SERVER_OCA_Catalog.xlsx'));

    assert.throws(
      () => createCaptureReceipt(stage, live, 'GPU_SERVER', { profilesPath: customProfiles }),
      /minActualGpuCards: 0 below 1/
    );
  });
});
