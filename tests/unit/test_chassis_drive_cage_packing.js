'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { HeterogeneousTenderModernizer } = require('../../scripts/lib/boq/heterogeneous_tender_modernizer');
const { buildUniversalQuantityConservationLedger } = require('../../scripts/lib/boq/quantity_conservation');

test('Drive Cage Packing & Expansion — Positive & Negative Suite', async (t) => {
  await t.test('1. Progressive SFF Expansion: 16 SFF drives packs into 1 server with 2nd cage kit (no ghost server)', () => {
    const modernizer = new HeterogeneousTenderModernizer({ defaultServerPlatform: 'HPE_PROLIANT_DL380_GEN11' });
    const tender = [{
      groupId: 'Grp_Storage_16SFF',
      multiplier: 1,
      items: [{ sku: 'P40430-B21', description: 'HPE 300GB SAS 12G 10K SFF BC HDD', quantity: 16 }]
    }];

    const fleet = modernizer.synthesizeCarrierFleet(tender, 'HPE_PROLIANT_DL380_GEN11', {
      allocateStorageCarriers: true,
      progressiveCageExpansion: true
    });

    assert.strictEqual(fleet.status, 'DRAFT_ALLOCATION_REVIEW_REQUIRED');
    const pool = fleet.carrierPools.find(p => p.poolType === 'STORAGE_CARRIER');
    assert.ok(pool, 'Storage pool created');
    assert.strictEqual(pool.chassisCount, 1, 'Only 1 server chassis created (no ghost server)');
    assert.strictEqual(pool.baysPerServer, 16, 'Expanded to 16 bays');
    assert.strictEqual(pool.additionalCagesPerServer, 1, '1 additional drive cage kit');
    assert.strictEqual(pool.driveCageSku, 'P48813-B21', 'Allocated Gen11 8SFF drive cage kit');
    assert.strictEqual(pool.needsExpander, true, 'Expander required for 16 drives');
    assert.strictEqual(pool.expanderSku, 'P48835-B21', 'Gen11 SAS Expander allocated');

    // Verify items populated
    const cageItem = pool.items.find(i => i.role === 'Drive Cage');
    assert.ok(cageItem, 'Drive cage kit in items');
    assert.strictEqual(cageItem.sku, 'P48813-B21');
    assert.strictEqual(cageItem.totalQuantity, 1);

    const expanderItem = pool.items.find(i => i.role === 'Storage Expander');
    assert.ok(expanderItem, 'SAS expander in items');
    assert.strictEqual(expanderItem.sku, 'P48835-B21');

    const cableItem = pool.items.find(i => i.role === 'Storage Cabling');
    assert.ok(cableItem, 'Storage cable kit in items');
    assert.strictEqual(cableItem.sku, 'P48918-B21');

    // Quantity Conservation Ledger (INV-192)
    const qc = buildUniversalQuantityConservationLedger(tender[0].items, pool);
    assert.strictEqual(qc.isFullyConserved, true, 'Drives 100% conserved under INV-192');
    assert.strictEqual(qc.totalDiscrepancies, 0);
  });

  await t.test('2. Progressive SFF Expansion: 24 SFF drives packs into 1 server with 2 additional cages and expander', () => {
    const modernizer = new HeterogeneousTenderModernizer({ defaultServerPlatform: 'HPE_PROLIANT_DL380_GEN11' });
    const tender = [{
      groupId: 'Grp_Storage_24SFF',
      multiplier: 1,
      items: [{ sku: 'P40430-B21', description: 'HPE 300GB SAS 12G 10K SFF BC HDD', quantity: 24 }]
    }];

    const fleet = modernizer.synthesizeCarrierFleet(tender, 'HPE_PROLIANT_DL380_GEN11', {
      allocateStorageCarriers: true,
      progressiveCageExpansion: true
    });

    const pool = fleet.carrierPools.find(p => p.poolType === 'STORAGE_CARRIER');
    assert.strictEqual(pool.chassisCount, 1, '1 server node packs all 24 drives');
    assert.strictEqual(pool.baysPerServer, 24);
    assert.strictEqual(pool.additionalCagesPerServer, 2, '2 extra 8SFF cages (total 3 cages)');
    assert.strictEqual(pool.expanderSku, 'P48835-B21');

    const cageItem = pool.items.find(i => i.role === 'Drive Cage');
    assert.strictEqual(cageItem.totalQuantity, 2, 'Total 2 extra cages allocated');
  });

  await t.test('3. Progressive LFF Expansion: 12 LFF drives expands 4LFF base to 12LFF on 1 server', () => {
    const modernizer = new HeterogeneousTenderModernizer({ defaultServerPlatform: 'HPE_PROLIANT_DL380_GEN11' });
    const tender = [{
      groupId: 'Grp_Storage_12LFF',
      multiplier: 1,
      items: [{ sku: 'P53556-B21', description: 'HPE 20TB SAS 12G 7.2K LFF LP HDD', quantity: 12 }]
    }];

    const fleet = modernizer.synthesizeCarrierFleet(tender, 'HPE_PROLIANT_DL380_GEN11', {
      allocateStorageCarriers: true,
      progressiveCageExpansion: true
    });

    const pool = fleet.carrierPools.find(p => p.poolType === 'STORAGE_CARRIER');
    assert.strictEqual(pool.formFactor, 'lff');
    assert.strictEqual(pool.chassisCount, 1, '1 server packs 12 LFF drives');
    assert.strictEqual(pool.baysPerServer, 12);
    assert.strictEqual(pool.additionalCagesPerServer, 2, '2 extra 4LFF cages added to base');
    assert.strictEqual(pool.driveCageSku, 'P48809-B21', '4LFF LP Midplane drive cage kit');
  });

  await t.test('4. Gen12 Packaging Modalities: Allocates Gen12 drive cages, Tri-Mode switch and Gen12 cables', () => {
    const modernizer = new HeterogeneousTenderModernizer({ defaultServerPlatform: 'HPE_PROLIANT_DL380_GEN12' });
    const tender = [{
      groupId: 'Grp_Storage_Gen12',
      multiplier: 1,
      items: [{ sku: 'P74800-B21', description: 'HPE 1.92TB NVMe Gen5 Read Intensive SFF SSD', quantity: 16 }]
    }];

    const fleet = modernizer.synthesizeCarrierFleet(tender, 'HPE_PROLIANT_DL380_GEN12', {
      allocateStorageCarriers: true,
      progressiveCageExpansion: true
    });

    const pool = fleet.carrierPools.find(p => p.poolType === 'STORAGE_CARRIER');
    assert.strictEqual(pool.chassisCount, 1);
    assert.strictEqual(pool.driveCageSku, 'P75741-B21', 'Gen12 8SFF drive cage kit');
    assert.strictEqual(pool.expanderSku, 'P55806-B21', 'Gen12 Tri-Mode Switch Card');
    assert.strictEqual(pool.cableKitSku, 'P76456-B21', 'Gen12 controller cable kit');
  });

  await t.test('5. Multi-Server Scaling: 48 SFF drives scales to 2 servers with 24 bays each (no unhoused drives)', () => {
    const modernizer = new HeterogeneousTenderModernizer({ defaultServerPlatform: 'HPE_PROLIANT_DL380_GEN11' });
    const tender = [{
      groupId: 'Grp_Storage_48SFF',
      multiplier: 1,
      items: [{ sku: 'P40430-B21', description: 'HPE 300GB SAS 12G 10K SFF BC HDD', quantity: 48 }]
    }];

    const fleet = modernizer.synthesizeCarrierFleet(tender, 'HPE_PROLIANT_DL380_GEN11', {
      allocateStorageCarriers: true,
      progressiveCageExpansion: true
    });

    const pool = fleet.carrierPools.find(p => p.poolType === 'STORAGE_CARRIER');
    assert.strictEqual(pool.chassisCount, 2, 'Scales to 2 servers (24 bays each)');
    assert.strictEqual(pool.drivesPerServer, 24);
    assert.strictEqual(pool.baysPerServer, 24);
    assert.strictEqual(pool.totalBays, 48);
    assert.strictEqual(pool.surplusBays, 0);

    const cageItem = pool.items.find(i => i.role === 'Drive Cage');
    assert.strictEqual(cageItem.totalQuantity, 4, '4 extra cages total (2 per server)');
  });

  await t.test('6. 1U Physical Gating: DL360 Gen11 1U cannot expand front cages, scales to 2 servers for 16 drives', () => {
    const modernizer = new HeterogeneousTenderModernizer({ defaultServerPlatform: 'HPE_PROLIANT_DL360_GEN11' });
    const tender = [{
      groupId: 'Grp_Storage_1U',
      multiplier: 1,
      items: [{ sku: 'P40430-B21', description: 'HPE 300GB SAS 12G 10K SFF BC HDD', quantity: 16 }]
    }];

    const fleet = modernizer.synthesizeCarrierFleet(tender, 'HPE_PROLIANT_DL360_GEN11', {
      allocateStorageCarriers: true,
      progressiveCageExpansion: true
    });

    const pool = fleet.carrierPools.find(p => p.poolType === 'STORAGE_CARRIER');
    assert.strictEqual(pool.chassisCount, 2, '1U cannot add 2nd front cage, correctly scales to 2 servers');
    assert.strictEqual(pool.baysPerServer, 8);
    assert.strictEqual(pool.additionalCagesPerServer, 0);
  });

  await t.test('7. Deliverables Integration: buildDualDeliverables executes quantity conservation and attaches ledger', () => {
    const modernizer = new HeterogeneousTenderModernizer({ defaultServerPlatform: 'HPE_PROLIANT_DL380_GEN11' });
    const categorized = modernizer.categorizeTenderItems([
      { isAdHocGroup: true, items: [{ sku: 'P40430-B21', description: 'HPE 300GB SAS 12G 10K SFF BC HDD', qty: 16 }] }
    ]);
    const fleet = modernizer.synthesizeCarrierFleet(categorized.unbuildableAdHoc, 'HPE_PROLIANT_DL380_GEN11', {
      allocateStorageCarriers: true,
      progressiveCageExpansion: true
    });

    const deliverables = modernizer.buildDualDeliverables(categorized, fleet);
    assert.ok(deliverables.quantityConservationLedger, 'Quantity conservation ledger attached');
    assert.strictEqual(deliverables.isQuantityConserved, true);
    assert.strictEqual(deliverables.portalValidationStatus, 'PORTAL VALIDATION PENDING');
  });

  await t.test('8. Backward Compatibility: When progressiveCageExpansion is omitted, preserves legacy capacity estimate', () => {
    const modernizer = new HeterogeneousTenderModernizer({ defaultServerPlatform: 'HPE_PROLIANT_DL380_GEN11' });
    const tender = [{
      groupId: 'Grp_Legacy',
      multiplier: 1,
      items: [{ sku: 'P40430-B21', description: 'HPE 300GB SAS 12G 10K SFF BC HDD', quantity: 32 }]
    }];

    const fleet = modernizer.synthesizeCarrierFleet(tender, 'HPE_PROLIANT_DL380_GEN11', {
      allocateStorageCarriers: true
    });

    const pool = fleet.carrierPools.find(p => p.poolType === 'STORAGE_CARRIER');
    assert.strictEqual(pool.status, 'CAPACITY_ESTIMATE_ONLY');
    assert.strictEqual(pool.chassisCount, 4, 'Preserves legacy 4 chassis for 32 drives without option');
    assert.strictEqual(pool.baysPerServer, 8);
  });
});
