'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const { evalStorageTriMode } = require('../../scripts/lib/aspects/storage_tri_mode.js');
const { identifyTroublesomeSkus, buildLeastDeltaCandidate } = require('../../scripts/lib/conflict/least_delta_combinator.js');
const { verifyPrePresentationAcceptance } = require('../../scripts/lib/boq/bom_verifier.js');

test('Step 1: 389692-B21 is preserved in DL380a_Gen12_Catalog.json under Storage Controllers > RAID Settings', () => {
  const catPath = path.join(process.cwd(), 'outputs', 'ProLiant', 'Gen12', 'DL380a_Gen12', 'DL380a_Gen12_Catalog.json');
  assert.ok(fs.existsSync(catPath), 'DL380a catalog exists');
  const cat = JSON.parse(fs.readFileSync(catPath, 'utf8'));

  const raidEntry = cat.entries.find(e => 
    e.parentCategory === 'Storage Controllers' && e.subCategory === 'RAID Settings'
  );
  assert.ok(raidEntry, 'RAID Settings entry found in hardware catalog');

  const customerRaidSku = raidEntry.skus.find(s => (s.sku || s['Product #']) === '389692-B21');
  assert.ok(customerRaidSku, '389692-B21 found inside RAID Settings entry');
  assert.strictEqual(customerRaidSku.listPrice, 1);
  assert.strictEqual(customerRaidSku.Description, 'HPE Customer Defined RAID Setting Service');
});

test('Step 2A: storage_tri_mode detects CLIC geometry conflict when 339778-B21 is selected with >2 drives', () => {
  const items = [
    { sku: 'P76706-B21', description: 'HPE ProLiant Compute DL380a Gen12 CTO Server', quantity: 1 },
    { sku: 'P74710-B21', description: 'HPE ProLiant Compute DL380a Gen12 4SFF FIO Drive Cage Kit', quantity: 1 },
    { sku: 'P50216-B21', description: 'HPE 1.92TB NVMe Gen4 High Performance Read Intensive SFF SSD', quantity: 4 },
    { sku: '339778-B21', description: 'HPE RAID 1 Drive 1 FIO Setting', quantity: 1 }
  ];

  const res = evalStorageTriMode(items, null, {}, 1);
  assert.strictEqual(res.driveCount, 4);
  assert.strictEqual(res.hasRaid1FioSetting, true);
  assert.strictEqual(res.hasRaid1MultiDriveConflict, true);
  assert.strictEqual(res.needsCustomerDefinedRaidTranspilation, true);
  assert.strictEqual(res.needsRaid1FioPruning, false);
});

test('Step 2B: storage_tri_mode detects redundancy when dedicated NS204i-u boot device is present', () => {
  const items = [
    { sku: 'P76706-B21', description: 'HPE ProLiant Compute DL380a Gen12 CTO Server', quantity: 1 },
    { sku: 'P74710-B21', description: 'HPE ProLiant Compute DL380a Gen12 4SFF FIO Drive Cage Kit', quantity: 1 },
    { sku: 'P50216-B21', description: 'HPE 1.92TB NVMe Gen4 High Performance Read Intensive SFF SSD', quantity: 4 },
    { sku: 'P78279-B21', description: 'HPE NS204i-u Gen12 NVMe Hot Plug Boot Optimized Storage Device', quantity: 1 },
    { sku: '339778-B21', description: 'HPE RAID 1 Drive 1 FIO Setting', quantity: 1 }
  ];

  const res = evalStorageTriMode(items, null, {}, 1);
  assert.strictEqual(res.hasBootController, true);
  assert.strictEqual(res.hasRaid1MultiDriveConflict, true);
  assert.strictEqual(res.needsRaid1FioPruning, true);
  assert.strictEqual(res.needsCustomerDefinedRaidTranspilation, false);
});

test('Step 3A: least_delta_combinator transpiles 339778-B21 to 389692-B21 at zero CapEx delta when >2 drives present', () => {
  const baseParts = [
    { sku: 'P76706-B21', description: 'HPE ProLiant Compute DL380a Gen12 CTO Server', quantity: 1, unitPriceUsd: 21407 },
    { sku: 'P74710-B21', description: 'HPE ProLiant Compute DL380a Gen12 4SFF FIO Drive Cage Kit', quantity: 1, unitPriceUsd: 372 },
    { sku: 'P50216-B21', description: 'HPE 1.92TB NVMe Gen4 High Performance Read Intensive SFF SSD', quantity: 4, unitPriceUsd: 1200 },
    { sku: '339778-B21', description: 'HPE RAID 1 Drive 1 FIO Setting', quantity: 1, unitPriceUsd: 1 }
  ];

  const evalResults = {
    missingDependencies: [
      {
        sku: '389692-B21',
        originalSku: '339778-B21',
        description: 'HPE Customer Defined RAID Setting Service',
        action: 'TRANSPILE_TO_CUSTOMER_DEFINED_RAID'
      }
    ],
    aspects: {
      storage: {
        driveCount: 4,
        hasBootController: false,
        hasRaid1FioSetting: true,
        hasRaid1MultiDriveConflict: true,
        needsCustomerDefinedRaidTranspilation: true
      }
    }
  };

  const troublesome = identifyTroublesomeSkus(baseParts, evalResults);
  assert.strictEqual(troublesome.length, 1);
  assert.strictEqual(troublesome[0].originalSku, '339778-B21');
  assert.strictEqual(troublesome[0].alternativeSku, '389692-B21');
  assert.strictEqual(troublesome[0].action, 'TRANSPILE_TO_CUSTOMER_DEFINED_RAID');

  const candidate = buildLeastDeltaCandidate(
    baseParts,
    [],
    troublesome,
    evalResults,
    null,
    { catalogDir: path.join(process.cwd(), 'outputs', 'ProLiant', 'Gen12', 'DL380a_Gen12') },
    (sku) => sku === '389692-B21' ? 1.00 : 0
  );

  assert.strictEqual(candidate.parts.some(p => p.sku === '339778-B21'), false, '339778-B21 pruned/replaced');
  const transpiled = candidate.parts.find(p => p.sku === '389692-B21');
  assert.ok(transpiled, '389692-B21 present in candidate BOM');
  assert.strictEqual(transpiled.unitPriceUsd, 1.00);
});

test('Step 3B: least_delta_combinator prunes 339778-B21 when dedicated NS204i-u is present', () => {
  const baseParts = [
    { sku: 'P76706-B21', description: 'HPE ProLiant Compute DL380a Gen12 CTO Server', quantity: 1, unitPriceUsd: 21407 },
    { sku: 'P78279-B21', description: 'HPE NS204i-u Gen12 NVMe Hot Plug Boot Optimized Storage Device', quantity: 1, unitPriceUsd: 590 },
    { sku: 'P50216-B21', description: 'HPE 1.92TB NVMe Gen4 Read Intensive SFF SSD', quantity: 4, unitPriceUsd: 1200 },
    { sku: '339778-B21', description: 'HPE RAID 1 Drive 1 FIO Setting', quantity: 1, unitPriceUsd: 1 }
  ];

  const evalResults = {
    missingDependencies: [
      {
        sku: '339778-B21',
        description: 'HPE RAID 1 Drive 1 FIO Setting',
        action: 'PRUNE_REDUNDANT_RAID1_FIO'
      }
    ],
    aspects: {
      storage: {
        driveCount: 4,
        hasBootController: true,
        hasRaid1FioSetting: true,
        hasRaid1MultiDriveConflict: true,
        needsRaid1FioPruning: true
      }
    }
  };

  const troublesome = identifyTroublesomeSkus(baseParts, evalResults);
  assert.strictEqual(troublesome.length, 1);
  assert.strictEqual(troublesome[0].action, 'PRUNE_REDUNDANT_RAID1_FIO');

  const candidate = buildLeastDeltaCandidate(
    baseParts,
    [],
    troublesome,
    evalResults,
    null,
    { catalogDir: path.join(process.cwd(), 'outputs', 'ProLiant', 'Gen12', 'DL380a_Gen12') },
    () => 0
  );

  assert.strictEqual(candidate.parts.some(p => p.sku === '339778-B21'), false, '339778-B21 pruned from candidate BOM');
  assert.strictEqual(candidate.deltaMetrics.removalsCount, 1);
});

test('Step 4: bom_verifier Gate B20 enforces rail kits and optical transceivers for turnkey tenders', () => {
  const mockOutputMissingInfrastructure = {
    items: [
      { sku: 'P76706-B21', description: 'HPE ProLiant Compute DL380a Gen12 CTO Server', quantity: 1 },
      { sku: 'P10115-B21', description: 'HPE Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter', quantity: 1 }
    ]
  };

  const contextTurnkey = {
    tenderText: 'Customer mandates turnkey installation, mounting in rack, and cabling.'
  };

  const acceptance1 = verifyPrePresentationAcceptance(mockOutputMissingInfrastructure, 'BOQ_EVALUATION', contextTurnkey);
  const gateB20_1 = acceptance1.checks.find(c => c.id === 'B20');
  assert.ok(gateB20_1, 'Gate B20 check present');
  assert.strictEqual(gateB20_1.status, 'ACTION_REQUIRED');
  assert.ok(gateB20_1.detail.includes('P69770-B21') || gateB20_1.detail.includes('Rack Rail Kit'));
  assert.ok(/845398-B21|optical transceivers/i.test(gateB20_1.detail));

  const mockOutputComplete = {
    items: [
      { sku: 'P76706-B21', description: 'HPE ProLiant Compute DL380a Gen12 CTO Server', quantity: 1 },
      { sku: 'P10115-B21', description: 'HPE Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter', quantity: 1 },
      { sku: 'P69770-B21', description: 'HPE ProLiant Compute DL380a Gen12 Ball Bearing Rail Kit', quantity: 1 },
      { sku: '845398-B21', description: 'HPE 25Gb SFP28 SR 100m Transceiver', quantity: 2 }
    ]
  };

  const acceptance2 = verifyPrePresentationAcceptance(mockOutputComplete, 'BOQ_EVALUATION', contextTurnkey);
  const gateB20_2 = acceptance2.checks.find(c => c.id === 'B20');
  assert.ok(gateB20_2, 'Gate B20 check present');
  assert.strictEqual(gateB20_2.status, 'PASSED');
});
