'use strict';

const test = require('node:test');
const assert = require('node:assert');
const {
  detectVendor,
  detectHardwareDomain,
  extractComponentSpecifications,
  normalizeHardwareItem
} = require('../../scripts/lib/taxonomy/vendor_agnostic_schema.js');

test('VendorAgnosticSchema — Detects hardware vendors correctly', () => {
  assert.strictEqual(detectVendor('HPE ProLiant DL380 Gen12 Server', 'P73282-B21'), 'HPE');
  assert.strictEqual(detectVendor('Dell PowerEdge R760 Rack Server', '338-CCUR'), 'Dell');
  assert.strictEqual(detectVendor('Cisco UCS C220 M7 Rack Server', 'UCS-CPU-6430'), 'Cisco');
  assert.strictEqual(detectVendor('Lenovo ThinkSystem SR650 V3', '7D75A000NA'), 'Lenovo');
  assert.strictEqual(detectVendor('Supermicro SuperServer 2U', 'SYS-221H-TNR'), 'Supermicro');
  assert.strictEqual(detectVendor('Generic Whitebox Server', 'GEN-SRV-01'), 'Generic');
});

test('VendorAgnosticSchema — Detects hardware domains correctly', () => {
  assert.strictEqual(detectHardwareDomain('HPE ProLiant Compute DL380 Gen12'), 'server');
  assert.strictEqual(detectHardwareDomain('HPE Alletra 9000 SAN Storage Array'), 'storage');
  assert.strictEqual(detectHardwareDomain('Aruba CX 8325 32-Port QSFP28 Top-of-Rack Switch'), 'networking');
  assert.strictEqual(detectHardwareDomain('HPE ProLiant DL380a Gen12 8DW GPU SXM5 Cluster'), 'ai_cluster');
  assert.strictEqual(detectHardwareDomain('HPE StoreEver MSL3040 LTO-9 Tape Library'), 'archive');
});

test('VendorAgnosticSchema — Extracts physical hardware specifications accurately', () => {
  const desc = 'Intel Xeon Gold 6430 2.1GHz 32-core 270W Processor';
  const specs = extractComponentSpecifications({ description: desc });

  assert.strictEqual(specs.cores, 32);
  assert.strictEqual(specs.speedGhz, 2.1);
  assert.strictEqual(specs.tdpWatts, 270);
});

test('VendorAgnosticSchema — Extracts memory, storage and power specs', () => {
  const memSpecs = extractComponentSpecifications({ description: '64GB 2Rx4 DDR5-5600 Registered Smart Memory Kit' });
  assert.strictEqual(memSpecs.capacityGb, 64);

  const driveSpecs = extractComponentSpecifications({ description: '3.84TB NVMe Read Intensive SFF SSD' });
  assert.strictEqual(driveSpecs.driveCapacityTb, 3.84);
  assert.strictEqual(driveSpecs.formFactor, 'SFF');

  const psuSpecs = extractComponentSpecifications({ description: '1600W Flex Slot Platinum Hot Plug Low Halogen Power Supply' });
  assert.strictEqual(psuSpecs.wattage, 1600);
  assert.strictEqual(psuSpecs.efficiency, 'Platinum');
});

test('VendorAgnosticSchema — Normalizes inbound items to CanonicalHardwareItem', () => {
  const raw = {
    sku: 'P73282-B21',
    description: 'HPE ProLiant Compute DL380 Gen12 8SFF CTO Server',
    quantity: 2,
    price: 5584,
    quantityScope: 'base',
    quantityBasis: 'base',
    configId: 'CFG-01'
  };

  const canonical = normalizeHardwareItem(raw);
  assert.strictEqual(canonical.vendor, 'HPE');
  assert.strictEqual(canonical.domain, 'server');
  assert.strictEqual(canonical.sku, 'P73282-B21');
  assert.strictEqual(canonical.partNumber, 'P73282-B21');
  assert.strictEqual(canonical.cleanSku, 'P73282-B21');
  assert.strictEqual(canonical.quantity, 2);
  assert.strictEqual(canonical.unitPriceUsd, 5584);
  assert.strictEqual(canonical.priceUsd, 5584);
  assert.strictEqual(canonical.pricing.unitPriceUsd, 5584);
  assert.strictEqual(canonical.pricing.extendedPriceUsd, 11168);
  assert.strictEqual(canonical.componentRole, 'Base Chassis');
  assert.strictEqual(canonical.quantityScope, 'base');
  assert.strictEqual(canonical.configId, 'CFG-01');
});

test('VendorAgnosticSchema — F16: Prevents Dell misclassification, separates EDSFF, and detects solution domain', () => {
  const { detectSolutionDomain } = require('../../scripts/lib/taxonomy/vendor_agnostic_schema.js');

  // 1. Bare HPE 6-character hardware SKUs must NOT detect as Dell
  assert.strictEqual(detectVendor('NVIDIA H200 NVL 141GB GPU', 'S3U30C'), 'HPE');
  assert.strictEqual(detectVendor('SN1610Q 32Gb 2-port FC HBA', 'R2E09A'), 'HPE');

  // 2. 2400W PSU must NOT match 400W TDP
  const psuSpecs = extractComponentSpecifications({ description: 'HPE 2400W Flex Slot Platinum Hot Plug Power Supply' });
  assert.strictEqual(psuSpecs.wattage, 2400);
  assert.strictEqual(psuSpecs.tdpWatts, undefined);

  // 3. EDSFF form factor must NOT match SFF
  const edsffSpecs = extractComponentSpecifications({ description: 'HPE 3.84TB NVMe Read Intensive EDSFF E3.S SSD' });
  assert.strictEqual(edsffSpecs.formFactor, 'EDSFF');

  // 4. Solution domain is server even when row 0 is a network adapter
  const bom = [
    { sku: 'P50311-B21', description: 'HPE 25Gb 2-port SFP28 BCM57414 OCP3 Adapter', category: 'Network Options' },
    { sku: 'P73282-B21', description: 'HPE ProLiant Compute DL380 Gen12 8SFF CTO Server', category: 'Base Chassis' },
    { sku: 'P67100-B21', description: 'Intel Xeon 6710E Processor', category: 'Processors' }
  ];
  assert.strictEqual(detectSolutionDomain(bom), 'server');
});
