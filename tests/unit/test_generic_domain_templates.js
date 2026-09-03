'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  loadGenericRulesMatrix,
  getGenericRulesForDomain,
  extractDomainMetrics,
  resolveCapabilityToSku,
  evaluateGenericDomainRules,
  GENERIC_DOMAIN_CATEGORIES
} = require('../../scripts/lib/catalog/generic_domain_templates.js');

test('Generic Domain Templates - Matrix Schema & Domain Filtering', (t) => {
  const matrix = loadGenericRulesMatrix();
  assert.ok(matrix.version, 'Matrix has version');
  assert.ok(Array.isArray(matrix.rules), 'Matrix has rules array');
  assert.ok(matrix.rules.length >= 10, 'Contains at least 10 domain rules');

  const serverRules = getGenericRulesForDomain('SERVER');
  assert.ok(serverRules.length >= 8, 'Server domain has comprehensive physical rules');
  assert.ok(serverRules.every(r => r.domain === 'SERVER' || r.domain === 'UNIVERSAL'), 'All returned rules belong to SERVER or UNIVERSAL');

  const storageRules = getGenericRulesForDomain('STORAGE');
  assert.ok(storageRules.length >= 2, 'Storage domain has storage rules');

  const netRules = getGenericRulesForDomain('NETWORKING');
  assert.ok(netRules.length >= 1, 'Networking domain has networking rules');
});

test('Generic Domain Templates - Domain Metrics Extraction (Zero Hardcoding)', (t) => {
  const sampleItems = [
    { description: 'Intel Xeon Platinum 8592+ 1.9GHz 64-core 350W Processor', qty: 2, category: 'Processor' },
    { description: 'NVIDIA L40S 48GB PCIe Double-Wide Accelerator', qty: 4, category: 'Graphics Options' },
    { description: 'HPE MR408i-o Gen12 SPDM Storage Controller', qty: 1, category: 'Storage Controller' },
    { description: 'HPE 3.84TB NVMe Gen5 High Performance SFF SSD', qty: 16, category: 'Storage Devices' },
    { description: 'HPE ProLiant 4SFF Drive Cage Kit', qty: 1, category: 'Smart Chassis' },
    { description: 'HPE ProLiant 4EDSFF Drive Cage Kit', qty: 1, category: 'Smart Chassis' },
    { description: 'HPE 2400W Flex Slot Titanium Hot Plug Low Halogen Power Supply', qty: 5, category: 'Power Supplies' },
    { description: 'HPE 64GB 2Rx4 DDR5-5600 Registered Smart Memory', qty: 10, category: 'Memory' }
  ];

  const metrics = extractDomainMetrics(sampleItems, { usesParityRaid: true });
  assert.equal(metrics.attributes.tdpWatts, 350, 'Detected 350W TDP');
  assert.equal(metrics.attributes.cpuCount, 2, 'Detected 2 CPUs');
  assert.equal(metrics.capabilities.hasGpuAccelerator, true, 'Detected GPU accelerator');
  assert.equal(metrics.capabilities.hasDoubleWideGpu, true, 'Detected double-wide GPU');
  assert.equal(metrics.metrics.internalDriveCount, 16, 'Detected 16 drives');
  assert.equal(metrics.metrics.drivesPerController, 16, 'Computed 16 drives per controller (>8 threshold)');
  assert.equal(metrics.capabilities.hasDisparateCageMixing, true, 'Detected SFF + EDSFF cage mixing');
  assert.equal(metrics.capabilities.hasUnbalancedMemoryChannels, true, '10 DIMMs is unbalanced for 8/12/16 channels');
});

test('Generic Domain Templates - Physical Rule Violations & Recommendations', (t) => {
  const highTdpGpuItems = [
    { description: 'Intel Xeon 6780E 2.2GHz 144-core 330W Processor', qty: 2, category: 'Processor' },
    { description: 'NVIDIA H100 80GB Double-Wide PCIe GPU', qty: 2, category: 'Graphics Options' },
    { description: 'MR216i-o Storage Controller (Zero Cache)', qty: 1, category: 'Storage Controller' },
    { description: 'HPE 960GB SATA Read Intensive SFF SSD', qty: 12, category: 'Storage Devices' },
    { description: 'HPE 800W Flex Slot Platinum Power Supply', qty: 2, category: 'Power Supplies' }
  ];

  const evalResult = evaluateGenericDomainRules(highTdpGpuItems, {
    domain: 'SERVER',
    usesParityRaid: true
  });

  assert.equal(evalResult.passed, false, 'Should fail physical rules');
  assert.ok(evalResult.violations.length > 0, 'Contains violations');

  const ruleIds = evalResult.violations.map(v => v.ruleId);
  assert.ok(ruleIds.includes('GDR-SRV-001'), 'Triggers High-TDP & Accelerator Cooling mandate');
  assert.ok(ruleIds.includes('GDR-SRV-002'), 'Triggers GPU aux power & 2400W Titanium PSU mandate');
  assert.ok(ruleIds.includes('GDR-SRV-003'), 'Triggers controller direct-attach >8 drive expander mandate');

  const recIds = evalResult.recommendations.map(r => r.ruleId);
  assert.ok(recIds.includes('GDR-SRV-004'), 'Triggers Cacheless parity RAID write risk warning');
});

test('Generic Domain Templates - Edge Server Power Profile Enforcement', (t) => {
  const edgeServerItems = [
    { description: 'HPE ProLiant DL145 Gen11 Edge Server CTO', qty: 1, category: 'Base Chassis' },
    { description: 'AMD EPYC 8004 32-core Processor', qty: 1, category: 'Processor' },
    { description: 'HPE 1600W Flex Slot Platinum Power Supply', qty: 2, category: 'Power Supplies' }
  ];

  const evalResult = evaluateGenericDomainRules(edgeServerItems, { domain: 'SERVER' });
  const edgeViolation = evalResult.violations.find(v => v.ruleId === 'GDR-SRV-006');
  assert.ok(edgeViolation, 'Triggers Edge Server Compact Power Envelope Enforcement (>1000W PSU)');
  assert.equal(edgeViolation.severity, 'ERROR');
});

test('Generic Domain Templates - Diskless Server Cooling Bypass FIO Kit', (t) => {
  const disklessServerItems = [
    { description: 'HPE ProLiant DL380 Gen12 SFF CTO Server', qty: 1, category: 'Base Chassis' },
    { description: 'Intel Xeon 6730P 2.5GHz 32-core 200W Processor', qty: 2, category: 'Processor' },
    { description: 'HPE 64GB 2Rx4 DDR5-5600 Smart Memory', qty: 16, category: 'Memory' }
  ];

  const evalResult = evaluateGenericDomainRules(disklessServerItems, { domain: 'SERVER' });
  const disklessViolation = evalResult.violations.find(v => v.ruleId === 'GDR-SRV-010');
  assert.ok(disklessViolation, 'Triggers No-Drive Cooling Airflow Bypass FIO Kit rule');
});

test('Generic Domain Templates - Storage & Networking Domain Rules', (t) => {
  const storageItems = [
    { description: 'HPE Alletra Storage 4120 Base Array', qty: 1, category: 'Base Enclosure' },
    { description: 'HPE Alletra Storage Controller Module', qty: 1, category: 'Storage Controller' }
  ];

  const stgResult = evaluateGenericDomainRules(storageItems, {
    domain: 'STORAGE',
    unpopulatedBays: 12
  });

  const stgViolation = stgResult.violations.find(v => v.ruleId === 'GDR-STG-002');
  assert.ok(stgViolation, 'Triggers dual-controller HA redundancy requirement');

  const stgRec = stgResult.recommendations.find(r => r.ruleId === 'GDR-STG-001');
  assert.ok(stgRec, 'Triggers unpopulated bay drive blank recommendation');

  const netItems = [
    { description: 'HPE Synergy 100Gb F32 Interconnect Module', qty: 2, category: 'Interconnect' }
  ];

  const netResult = evaluateGenericDomainRules(netItems, {
    domain: 'NETWORKING',
    hasMissingTransceivers: true
  });

  const netRec = netResult.recommendations.find(r => r.ruleId === 'GDR-NET-001');
  assert.ok(netRec, 'Triggers matched transceiver complement recommendation');
});

test('Generic Domain Templates - Dynamic Capability Resolution against Live Catalog', (t) => {
  const sampleCatalog = {
    entries: [
      {
        parentCategory: 'Smart Chassis',
        subCategory: 'Cooling Options',
        options: [
          { sku: 'P48820-B21', name: 'HPE ProLiant High Performance Fan Kit', priceUsd: 185 },
          { sku: 'P74792-B21', name: 'HPE ProLiant Performance Heat Sink Kit', priceUsd: 210 }
        ]
      },
      {
        parentCategory: 'Factory Configuration Settings',
        subCategory: 'FIO Options',
        options: [
          { sku: '873763-B21', name: 'HPE ProLiant Compute No Drive Configuration FIO Kit', priceUsd: 0 }
        ]
      },
      {
        parentCategory: 'Storage Devices',
        subCategory: 'Drive Blanks',
        options: [
          { sku: 'R0Q21A', name: 'HPE Alletra Storage Drive Blank Kit', priceUsd: 45 }
        ]
      }
    ]
  };

  const resolvedCooling = resolveCapabilityToSku('HIGH_PERFORMANCE_COOLING', sampleCatalog);
  assert.ok(resolvedCooling, 'Resolves cooling capability');
  assert.equal(resolvedCooling.sku, 'P48820-B21');

  const resolvedNoDrive = resolveCapabilityToSku('NO_DRIVE_BLANK_OR_FIO_BYPASS', sampleCatalog);
  assert.ok(resolvedNoDrive, 'Resolves no drive capability');
  assert.equal(resolvedNoDrive.sku, '873763-B21');

  const resolvedBlank = resolveCapabilityToSku('STORAGE_DRIVE_BLANKS', sampleCatalog);
  assert.ok(resolvedBlank, 'Resolves storage drive blank capability');
  assert.equal(resolvedBlank.sku, 'R0Q21A');
});
