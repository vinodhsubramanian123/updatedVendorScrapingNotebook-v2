'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  detectFabricProtocol,
  parseCompetitorSpecification,
  audit12PointPhysicalParity,
  transformCompetitorQuote,
  _evaluateGpuParity,
  _evaluateStorageControllerParity,
  _evaluateOpticalTransceiverParity,
  _evaluatePowerSupplyParity,
  _evaluateManagementLicenseParity,
  _evaluateNetworkingFabricParity,
  _evaluateMemoryTopologyParity
} = require('./proposed_cross_vendor_transformer.js');

test('Fabric Protocol Detection: detects InfiniBand NDR, HDR, RoCEv2, and Ethernet', () => {
  assert.equal(
    detectFabricProtocol('NVIDIA ConnectX-7 NDR 400Gb/s InfiniBand OSFP Single-Port Adapter'),
    'INFINIBAND_NDR'
  );
  assert.equal(
    detectFabricProtocol('HPE InfiniBand NDR/Ethernet 400Gb 1-port OSFP PCIe5 x16 MCX75310AAS-NEAT Adapter'),
    'INFINIBAND_NDR'
  );
  assert.equal(
    detectFabricProtocol('HPE InfiniBand NDR200/Ethernet 200Gb 1-port OSFP PCIe5 x16 MCX75310AAS-HEAT Adapter'),
    'INFINIBAND_NDR'
  );
  assert.equal(
    detectFabricProtocol('Mellanox ConnectX-6 HDR 200Gb/s InfiniBand QSFP56 Dual-Port Adapter'),
    'INFINIBAND_HDR'
  );
  assert.equal(
    detectFabricProtocol('HPE InfiniBand HDR/Ethernet 200Gb 1-port QSFP56 PCIe3 x16 MCX653105A-HDAT Adapter'),
    'INFINIBAND_HDR'
  );
  assert.equal(
    detectFabricProtocol('Broadcom BCM57508 100GbE 2-port RoCEv2 OCP3 Adapter'),
    'ROCE_V2'
  );
  assert.equal(
    detectFabricProtocol('Mellanox MCX623106AS-CDAT Ethernet 100Gb 2-port QSFP56 Adapter with RoCE'),
    'ROCE_V2'
  );
  assert.equal(
    detectFabricProtocol('Intel I350 1GbE 4-port Base-T Adapter'),
    'ETHERNET'
  );
  assert.equal(
    detectFabricProtocol('Broadcom BCM5719 1GbE 4-port Base-T OCP3 Adapter'),
    'ETHERNET'
  );
});

test('Fabric Protocol Parsing in parseCompetitorSpecification', () => {
  const specNdr = parseCompetitorSpecification(
    '2x NVIDIA ConnectX-7 NDR 400Gb/s InfiniBand 1-port OSFP PCIe Adapter',
    'DELL'
  );
  assert.equal(specNdr.networking.fabricProtocol, 'INFINIBAND_NDR');
  assert.equal(specNdr.networking.speedGb, 400);
  assert.equal(specNdr.networking.portsCount, 1);

  const specHdr = parseCompetitorSpecification(
    '2x Mellanox ConnectX-6 HDR 200Gb/s InfiniBand 2-port QSFP56 Adapter',
    'DELL'
  );
  assert.equal(specHdr.networking.fabricProtocol, 'INFINIBAND_HDR');
  assert.equal(specHdr.networking.speedGb, 200);
  assert.equal(specHdr.networking.portsCount, 2);

  const specRoce = parseCompetitorSpecification(
    '2x Broadcom 57508 100GbE 2-port RoCEv2 OCP3 Adapter',
    'DELL'
  );
  assert.equal(specRoce.networking.fabricProtocol, 'ROCE_V2');
  assert.equal(specRoce.networking.speedGb, 100);
  assert.equal(specRoce.networking.portsCount, 2);
});

test('High-Speed Fabric Parity Enforcement: NDR InfiniBand matched by HPE NDR adapter', () => {
  const spec = parseCompetitorSpecification('1x NVIDIA ConnectX-7 NDR 400Gb/s InfiniBand 1-port OSFP Adapter');
  const matchingBom = [
    { sku: 'P45641-H23', quantity: 1, description: 'HPE InfiniBand NDR/Ethernet 400Gb 1-port OSFP PCIe5 x16 MCX75310AAS-NEAT Adapter' }
  ];
  const parity = _evaluateNetworkingFabricParity(spec, matchingBom);
  assert.equal(parity.status, 'MATCHED');
  assert.match(parity.details, /INFINIBAND_NDR/);
});

test('High-Speed Fabric Parity Enforcement: NDR InfiniBand rejected when target only provides Ethernet', () => {
  const spec = parseCompetitorSpecification('1x NVIDIA ConnectX-7 NDR 400Gb/s InfiniBand 1-port OSFP Adapter');
  const ethernetBom = [
    { sku: 'P26262-B21', quantity: 1, description: 'Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 Adapter for HPE' }
  ];
  const parity = _evaluateNetworkingFabricParity(spec, ethernetBom);
  assert.equal(parity.status, 'DEFICIT');
  assert.match(parity.details, /protocol mismatch/i);
});

test('GPU Parity: Genuine evaluation replaces stub', () => {
  const spec = parseCompetitorSpecification('2x NVIDIA H100 80GB SXM5 GPU');
  const matchingBom = [
    { sku: 'P64821-B21', quantity: 2, description: 'NVIDIA H100 80GB PCIe Accelerator for HPE' }
  ];
  const matchResult = _evaluateGpuParity(spec, matchingBom);
  assert.equal(matchResult.status, 'MATCHED');

  const downgradedBom = [
    { sku: 'P53401-B21', quantity: 4, description: 'NVIDIA L4 24GB PCIe Accelerator for HPE' }
  ];
  const downgradeResult = _evaluateGpuParity(spec, downgradedBom);
  assert.equal(downgradeResult.status, 'DEFICIT');
  assert.match(downgradeResult.details, /does not meet competitor compute tier/i);

  const missingBom = [];
  const emptyResult = _evaluateGpuParity(spec, missingBom);
  assert.equal(emptyResult.status, 'DEFICIT');
  assert.match(emptyResult.details, /contains 0 GPU accelerators/i);

  const unspecifiedSpec = parseCompetitorSpecification('2x Intel Xeon Platinum 8480+');
  const unspecResult = _evaluateGpuParity(unspecifiedSpec, matchingBom);
  assert.equal(unspecResult.status, 'NOT_EVALUATED');
});

test('Storage Controller Parity: Genuine evaluation replaces stub', () => {
  const spec = parseCompetitorSpecification('Dell PERC H755 with 8GB Cache RAID Controller');
  const matchingBom = [
    { sku: 'P48994-B21', quantity: 1, description: 'HPE Smart Array SR932i-p Gen11 8GB Cache Tri-Mode Controller' }
  ];
  const matchResult = _evaluateStorageControllerParity(spec, matchingBom);
  assert.equal(matchResult.status, 'MATCHED');

  const lowerCacheBom = [
    { sku: 'P48824-B21', quantity: 1, description: 'HPE Smart Array MR416i-p Gen11 4GB Cache Controller' }
  ];
  const lowerResult = _evaluateStorageControllerParity(spec, lowerCacheBom);
  assert.equal(lowerResult.status, 'DEFICIT');
  assert.match(lowerResult.details, /controller cache .* is lower than competitor/i);

  const missingBom = [];
  const missingResult = _evaluateStorageControllerParity(spec, missingBom);
  assert.equal(missingResult.status, 'DEFICIT');
  assert.match(missingResult.details, /lacks storage controller/i);
});

test('Optical Transceiver Parity: Genuine evaluation replaces stub', () => {
  const spec = parseCompetitorSpecification('4x 25G SFP28 SR Optical Transceiver');
  const matchingBom = [
    { sku: '845398-B21', quantity: 4, description: 'HPE 25Gb SFP28 SR 100m Optical Transceiver' }
  ];
  const matchResult = _evaluateOpticalTransceiverParity(spec, matchingBom);
  assert.equal(matchResult.status, 'MATCHED');

  const deficitBom = [
    { sku: '845398-B21', quantity: 2, description: 'HPE 25Gb SFP28 SR 100m Optical Transceiver' }
  ];
  const deficitResult = _evaluateOpticalTransceiverParity(spec, deficitBom);
  assert.equal(deficitResult.status, 'DEFICIT');
  assert.match(deficitResult.details, /Deficit: 2/);

  const missingBom = [];
  const missingResult = _evaluateOpticalTransceiverParity(spec, missingBom);
  assert.equal(missingResult.status, 'DEFICIT');
  assert.match(missingResult.details, /lacks optical transceivers/i);
});

test('Power Supply Parity: Wattage and Titanium efficiency check', () => {
  const spec = parseCompetitorSpecification('2x 1600W Titanium Hot Plug Power Supply');
  const matchingBom = [
    { sku: 'P48803-B21', quantity: 2, description: 'HPE 1600W Flex Slot Titanium Hot Plug Power Supply Kit' }
  ];
  const matchResult = _evaluatePowerSupplyParity(spec, matchingBom);
  assert.equal(matchResult.status, 'MATCHED');

  const lowerWattageBom = [
    { sku: 'P48801-B21', quantity: 2, description: 'HPE 800W Flex Slot Titanium Hot Plug Power Supply Kit' }
  ];
  const wattageDeficit = _evaluatePowerSupplyParity(spec, lowerWattageBom);
  assert.equal(wattageDeficit.status, 'DEFICIT');
  assert.match(wattageDeficit.details, /wattage \(800W\) is lower than competitor requirement \(1600W\)/i);

  const lowerEfficiencyBom = [
    { sku: 'P48802-B21', quantity: 2, description: 'HPE 1600W Flex Slot Platinum Hot Plug Power Supply Kit' }
  ];
  const effDeficit = _evaluatePowerSupplyParity(spec, lowerEfficiencyBom);
  assert.equal(effDeficit.status, 'DEFICIT');
  assert.match(effDeficit.details, /efficiency \(Platinum\) does not satisfy required Titanium/i);
});

test('Management License Parity: Enterprise tier requires explicit iLO Advanced license', () => {
  const spec = parseCompetitorSpecification('Dell iDRAC9 Enterprise Remote Management');
  const matchingBom = [
    { sku: 'E6U59ABE', quantity: 1, description: 'HPE iLO Advanced 1-server License with 3yr Support' }
  ];
  const matchResult = _evaluateManagementLicenseParity(spec, matchingBom);
  assert.equal(matchResult.status, 'MATCHED');

  const baseChassisOnlyBom = [
    { sku: 'P73282-B21', quantity: 1, description: 'HPE ProLiant DL380 Gen12 8SFF NC CTO Server' }
  ];
  const missingLicenseResult = _evaluateManagementLicenseParity(spec, baseChassisOnlyBom);
  assert.equal(missingLicenseResult.status, 'DEFICIT');
  assert.match(missingLicenseResult.details, /lacks explicit iLO Advanced/i);
});

test('NUMA Balanced Channel Interleaving: detects asymmetric DIMM population on dual socket', () => {
  const spec = parseCompetitorSpecification('2x Intel Xeon Platinum 8480+; 512GB RAM');
  const balancedBom = [
    { sku: 'P43328-B21', quantity: 16, description: 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit' }
  ];
  const balancedResult = _evaluateMemoryTopologyParity(spec, balancedBom);
  assert.equal(balancedResult.status, 'MATCHED');

  const asymmetricBom = [
    { sku: 'P43328-B21', quantity: 7, description: 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit' }
  ];
  const asymmetricResult = _evaluateMemoryTopologyParity(spec, asymmetricBom);
  assert.equal(asymmetricResult.status, 'DEFICIT');
  assert.match(asymmetricResult.details, /asymmetric across 2 sockets, breaking NUMA channel interleaving/i);
});

test('End-to-End transformCompetitorQuote: 12-point audit achieves 100% compliance on full matching BOM', () => {
  const competitorTender = [
    '2x Intel Xeon Platinum 8480+ 56C 350W',
    '16x 32GB DDR5-4800 RDIMM',
    '2x NVIDIA H100 80GB SXM5 GPU',
    '8x 3.84TB NVMe SSD',
    '1x Dell PERC H755 with 8GB Cache RAID Controller',
    '2x NVIDIA ConnectX-7 NDR 400Gb/s InfiniBand 1-port OSFP Adapter',
    '4x 25G SFP28 SR Optical Transceiver',
    '2x 1600W Titanium Power Supply',
    'Dell iDRAC9 Enterprise Remote Management',
    '2x BOSS M.2 Boot SSD',
    'High Performance Fan Kit and Heatsinks',
    '2x PCIe Expansion Riser'
  ].join('; ');

  const matchingBom = [
    { sku: 'P73282-B21', quantity: 1, description: 'HPE ProLiant DL380 Gen12 8SFF NC CTO Server' },
    { sku: 'P49610-B21', quantity: 2, description: 'Intel Xeon Platinum 8480+ 56-core 350W Processor' },
    { sku: 'P43328-B21', quantity: 16, description: 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit' },
    { sku: 'P64821-B21', quantity: 2, description: 'NVIDIA H100 80GB PCIe Accelerator for HPE' },
    { sku: 'P48994-B21', quantity: 1, description: 'HPE Smart Array SR932i-p Gen11 8GB Cache Tri-Mode Controller' },
    { sku: 'P40499-B21', quantity: 8, description: 'HPE 3.84TB NVMe Gen4 Read Intensive SFF SSD' },
    { sku: 'P45641-H23', quantity: 2, description: 'HPE InfiniBand NDR/Ethernet 400Gb 1-port OSFP PCIe5 x16 MCX75310AAS-NEAT Adapter' },
    { sku: '845398-B21', quantity: 4, description: 'HPE 25Gb SFP28 SR 100m Optical Transceiver' },
    { sku: 'P48803-B21', quantity: 2, description: 'HPE 1600W Flex Slot Titanium Hot Plug Power Supply Kit' },
    { sku: 'E6U59ABE', quantity: 1, description: 'HPE iLO Advanced 1-server License with 3yr Support' },
    { sku: 'P12965-B21', quantity: 1, description: 'HPE NS204i-u Gen11 NVMe Hot Plug Boot Optimized Storage Device' },
    { sku: 'P48820-B21', quantity: 1, description: 'HPE ProLiant DL380 Gen12 High Performance Fan Kit' },
    { sku: 'P48818-B21', quantity: 2, description: 'HPE ProLiant DL380 Gen12 Standard Heatsink Kit' },
    { sku: 'P48821-B21', quantity: 2, description: 'HPE ProLiant DL380 Gen12 2x16 Primary & Secondary PCIe Riser Kit' }
  ];

  const result = transformCompetitorQuote(competitorTender, 'DELL', 'DL380_Gen12', {
    targetBom: matchingBom
  });

  assert.equal(result.status, 'CANDIDATE_EVALUATION_REQUIRED');
  assert.equal(result.auditReport.status, 'PASSED');
  assert.equal(result.auditReport.actionRequiredSubsystems, 0);
  assert.equal(result.auditReport.unresolvedSubsystems, 0);
  assert.equal(result.auditReport.passedSubsystems, 12);
  assert.equal(result.auditReport.is100PercentCompliant, true);
  assert.equal(result.auditReport.auditItems.length, 12);
  assert.ok(result.auditReport.auditItems.every(i => i.status === 'MATCHED' || i.status === 'EXCEEDS'));

  const directAudit = audit12PointPhysicalParity(result.competitorSpec, matchingBom, 'DL380_Gen12');
  assert.equal(directAudit.is100PercentCompliant, true);
  assert.equal(directAudit.passedSubsystems, 12);
});

