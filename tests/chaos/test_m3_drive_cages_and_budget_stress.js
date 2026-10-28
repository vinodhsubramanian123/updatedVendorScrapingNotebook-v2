'use strict';
/**
 * tests/chaos/test_m3_drive_cages_and_budget_stress.js
 *
 * EMPIRICAL ADVERSARIAL CHALLENGER SUITE (Milestone 3 / Challenger M3_2)
 * Progressive Chassis Drive Cage Expansion, Quantity Conservation, and Rank 5 Budget NVMe Down-Tiering Stress
 *
 * Rigorously stress-tests:
 * - scripts/lib/boq/heterogeneous_tender_modernizer.js (HeterogeneousTenderModernizer)
 * - scripts/lib/boq/quantity_conservation.js (buildUniversalQuantityConservationLedger)
 * - scripts/lib/conflict/strategy_synthesizer.js (_tryBudgetStorageSubstitution, synthesize5TierRankedSolutions)
 *
 * Attack Vectors:
 * 1. Progressive Drive Cage Expansion Boundary Fuzzing (1 to 120+ drives, SFF, LFF, EDSFF, DL380 Gen11/Gen12 vs 1U DL360 Gen11).
 * 2. Hardware Enablement Mathematical Scaling ($N_{servers} = \max(1, \lceil Q / C_{max} \rceil)$, cables, expanders, batteries).
 * 3. Universal Quantity Conservation Ledger (INV-192 / F-CONS1) under mixed-tier tenders, repeated rows, and ad-hoc groups.
 * 4. Rank 5 Value Engineering NVMe Down-Tiering across all 4 capacity tiers, capacity non-decrease ($C_{target} \ge C_{original}$), and carrier preservation.
 * 5. Natural-Language & Flag Workload Gating: Write-intensive protections (WRITE_INTENSIVE, natural language transaction logs, WAL, SQL redo logs).
 * 6. Adversarial Discovered Flaws & Vulnerabilities:
 *    - Finding 1: SAP_HANA / HANA workload protection bypass in _tryBudgetStorageSubstitution.
 *    - Finding 2: UPPER_SNAKE_CASE identifier bypass (DATABASE_TRANSACTION_LOG, SQL_REDO_LOG, POSTGRESQL_WAL) due to \b boundary.
 *    - Finding 3: Unhandled TypeError when getPrice is omitted in _tryBudgetStorageSubstitution.
 *    - Finding 4: Unhandled TypeError when parts is null in _tryBudgetStorageSubstitution.
 *    - Finding 5: Missing DL380A_GEN12 platform profile causing SERVER_PLATFORM_PROFILE_REQUIRED in synthesizeCarrierFleet.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { HeterogeneousTenderModernizer } = require('../../scripts/lib/boq/heterogeneous_tender_modernizer.js');
const {
  _tryBudgetStorageSubstitution,
  synthesize5TierRankedSolutions,
  CERTIFIED_STORAGE_DOWNTIER_MAP
} = require('../../scripts/lib/conflict/strategy_synthesizer.js');

describe('Milestone 3 Empirical Challenger Stress Suite (Features 11 & 12)', () => {

  // ─────────────────────────────────────────────────────────────────────────────
  // ATTACK VECTOR 1: Progressive Drive Cage Expansion Scaling & Mathematical Invariants
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Attack Vector 1: Progressive Drive Cage Expansion Scaling & Mathematical Invariants', () => {

    it('DL380 Gen11 2U SFF: Fuzzes drive counts 1 to 120 asserting exact server scaling and bay containment', () => {
      const modernizer = new HeterogeneousTenderModernizer({ defaultServerPlatform: 'HPE_PROLIANT_DL380_GEN11' });
      const testQuantities = [1, 2, 7, 8, 9, 15, 16, 17, 23, 24, 25, 32, 47, 48, 49, 72, 95, 96, 97, 120];

      for (const q of testQuantities) {
        const tender = [{
          groupId: `Grp_SFF_${q}`,
          items: [{ sku: 'P40430-B21', description: 'HPE 300GB SAS 12G 10K SFF BC HDD', quantity: q }]
        }];

        const fleet = modernizer.synthesizeCarrierFleet(tender, 'HPE_PROLIANT_DL380_GEN11', {
          allocateStorageCarriers: true,
          progressiveCageExpansion: true
        });

        assert.equal(fleet.status, 'DRAFT_ALLOCATION_REVIEW_REQUIRED');
        const pool = fleet.carrierPools.find(p => p.poolType === 'STORAGE_CARRIER');
        assert.ok(pool, `Storage carrier pool must be created for Q=${q}`);

        // Invariant 1: Server count scaling: N_servers = max(1, ceil(Q / 24))
        const expectedServers = Math.max(1, Math.ceil(q / 24));
        assert.equal(pool.chassisCount, expectedServers, `Server count for Q=${q} must be ${expectedServers}`);

        // Invariant 2: Total bays must accommodate all drives with zero unhoused drives
        assert.ok(pool.totalBays >= q, `Total bays (${pool.totalBays}) must be >= requested drives (${q})`);
        assert.ok(pool.surplusBays >= 0, `Surplus bays (${pool.surplusBays}) must be non-negative`);
        assert.equal(pool.surplusBays, pool.totalBays - q, 'Surplus bays must match delta math');

        // Invariant 3: Drives per server must never exceed bays per server
        assert.ok(pool.drivesPerServer <= pool.baysPerServer, `Drives/server (${pool.drivesPerServer}) <= bays/server (${pool.baysPerServer})`);

        // Invariant 4: Enablement hardware scaling
        const expItem = pool.items.find(i => i.role === 'Storage Expander');
        const ctrlItem = pool.items.find(i => i.role === 'Storage Controller');
        const cableItem = pool.items.find(i => i.role === 'Storage Cabling');
        const batItem = pool.items.find(i => i.role === 'Storage Battery');
        const cageItem = pool.items.find(i => i.role === 'Drive Cage');

        assert.equal(ctrlItem.totalQuantity, expectedServers, '1 controller per server');
        assert.equal(cableItem.totalQuantity, expectedServers, '1 cable kit per server');
        assert.equal(batItem.totalQuantity, expectedServers, '1 battery per server');

        if (pool.drivesPerServer > 8) {
          assert.equal(pool.needsExpander, true, `Expander required when drives/server (${pool.drivesPerServer}) > 8`);
          assert.ok(expItem, 'Expander item must be present');
          assert.equal(expItem.totalQuantity, expectedServers, '1 expander per server');
          assert.equal(expItem.sku, 'P48835-B21', 'Gen11 SAS Expander SKU');
        } else {
          assert.equal(pool.needsExpander, false, `Expander not needed when drives/server (${pool.drivesPerServer}) <= 8`);
          assert.equal(expItem, undefined, 'No expander item when <= 8 drives/server');
        }

        if (pool.additionalCagesPerServer > 0) {
          assert.ok(cageItem, 'Drive cage kit item must be present');
          assert.equal(cageItem.totalQuantity, pool.additionalCagesPerServer * expectedServers, 'Cage kit total quantity');
          assert.equal(cageItem.sku, 'P48813-B21', 'Gen11 8SFF drive cage SKU');
        } else {
          assert.equal(cageItem, undefined, 'No extra cage kit when drives fit in base 8 bays');
        }
      }
    });

    it('DL380 Gen12 2U SFF: Allocates Gen12 cage kits, Tri-Mode switch, and Gen12 controller cables', () => {
      const modernizer = new HeterogeneousTenderModernizer();
      const tender = [{
        groupId: 'Grp_Gen12_16SFF',
        items: [{ sku: 'P74800-B21', description: 'HPE 1.92TB NVMe Gen5 Read Intensive SFF SSD', quantity: 16 }]
      }];

      const fleet = modernizer.synthesizeCarrierFleet(tender, 'HPE_PROLIANT_DL380_GEN12', {
        allocateStorageCarriers: true,
        progressiveCageExpansion: true
      });

      const pool = fleet.carrierPools[0];
      assert.equal(pool.chassisCount, 1);
      assert.equal(pool.driveCageSku, 'P75741-B21', 'Gen12 8SFF Drive Cage Kit');
      assert.equal(pool.expanderSku, 'P55806-B21', 'Gen12 Tri-Mode Switch Card');
      assert.equal(pool.cableKitSku, 'P76456-B21', 'Gen12 Controller Cable Kit');

      const ctrlItem = pool.items.find(i => i.role === 'Storage Controller');
      assert.equal(ctrlItem.sku, 'P76458-B21', 'Gen12 MR408i-o Storage Controller');
    });

    it('DL360 Gen11 1U Physical Gating: Prevents secondary front cages and scales server count at Q > 8', () => {
      const modernizer = new HeterogeneousTenderModernizer();
      const testQuantities = [8, 9, 16, 17, 24, 25, 32];

      for (const q of testQuantities) {
        const tender = [{
          groupId: `Grp_1U_${q}`,
          items: [{ sku: 'P40430-B21', description: 'HPE 300GB SAS 12G 10K SFF BC HDD', quantity: q }]
        }];

        const fleet = modernizer.synthesizeCarrierFleet(tender, 'HPE_PROLIANT_DL360_GEN11', {
          allocateStorageCarriers: true,
          progressiveCageExpansion: true
        });

        const pool = fleet.carrierPools[0];
        const expectedServers = Math.ceil(q / 8);

        // 1U physical invariant: cannot add front cages, baysPerServer remains 8
        assert.equal(pool.chassisCount, expectedServers, `1U server count for Q=${q} must be ${expectedServers}`);
        assert.equal(pool.baysPerServer, 8, '1U bays per server must remain strictly 8');
        assert.equal(pool.additionalCagesPerServer, 0, '1U additional cages must be strictly 0');
        assert.equal(pool.driveCageSku, null, 'No cage SKU for 1U');
        assert.equal(pool.needsExpander, false, '1U <= 8 drives per server never needs SAS expander');
      }
    });

    it('LFF Expansion on DL380 Gen11 & Gen12: Expands 4LFF base to 8LFF and 12LFF before scaling servers at Q > 12', () => {
      const modernizer = new HeterogeneousTenderModernizer();
      const testCases = [
        { q: 4, expectedServers: 1, expectedBays: 4, extraCages: 0 },
        { q: 8, expectedServers: 1, expectedBays: 8, extraCages: 1 },
        { q: 12, expectedServers: 1, expectedBays: 12, extraCages: 2 },
        { q: 13, expectedServers: 2, expectedBays: 8, extraCages: 1 }, // 13/2 = 7 drives/srv -> 8 bays/srv
        { q: 24, expectedServers: 2, expectedBays: 12, extraCages: 2 },
        { q: 25, expectedServers: 3, expectedBays: 12, extraCages: 2 }
      ];

      for (const tc of testCases) {
        const tender = [{
          groupId: `Grp_LFF_${tc.q}`,
          items: [{ sku: 'P53556-B21', description: 'HPE 20TB SAS 12G 7.2K LFF LP HDD', quantity: tc.q }]
        }];

        const fleet = modernizer.synthesizeCarrierFleet(tender, 'HPE_PROLIANT_DL380_GEN11', {
          allocateStorageCarriers: true,
          progressiveCageExpansion: true
        });

        const pool = fleet.carrierPools[0];
        assert.equal(pool.formFactor, 'lff');
        assert.equal(pool.chassisCount, tc.expectedServers, `LFF Q=${tc.q} server count`);
        assert.equal(pool.baysPerServer, tc.expectedBays, `LFF Q=${tc.q} bays per server`);
        assert.equal(pool.additionalCagesPerServer, tc.extraCages, `LFF Q=${tc.q} extra cages`);
        assert.equal(pool.driveCageSku, tc.extraCages > 0 ? 'P48809-B21' : null);
      }
    });

    it('EDSFF Expansion on DL380 Gen11: Expands 12EDSFF base up to 36 bays before scaling servers at Q > 36', () => {
      const modernizer = new HeterogeneousTenderModernizer();
      const testCases = [
        { q: 12, expectedServers: 1, expectedBays: 12, extraCages: 0 },
        { q: 24, expectedServers: 1, expectedBays: 24, extraCages: 1 },
        { q: 36, expectedServers: 1, expectedBays: 36, extraCages: 2 },
        { q: 37, expectedServers: 2, expectedBays: 24, extraCages: 1 }, // 37/2 = 19 drives/srv -> 24 bays/srv
        { q: 72, expectedServers: 2, expectedBays: 36, extraCages: 2 }
      ];

      for (const tc of testCases) {
        const tender = [{
          groupId: `Grp_EDSFF_${tc.q}`,
          items: [{ sku: 'P57789-B21', description: 'HPE 3.84TB NVMe Gen5 Mainstream Read Intensive EDSFF E3.S SSD', quantity: tc.q }]
        }];

        const fleet = modernizer.synthesizeCarrierFleet(tender, 'HPE_PROLIANT_DL380_GEN11', {
          allocateStorageCarriers: true,
          progressiveCageExpansion: true
        });

        const pool = fleet.carrierPools[0];
        assert.equal(pool.formFactor, 'edsff');
        assert.equal(pool.chassisCount, tc.expectedServers, `EDSFF Q=${tc.q} server count`);
        assert.equal(pool.baysPerServer, tc.expectedBays, `EDSFF Q=${tc.q} bays per server`);
        assert.equal(pool.additionalCagesPerServer, tc.extraCages, `EDSFF Q=${tc.q} extra cages`);
        assert.equal(pool.driveCageSku, tc.extraCages > 0 ? 'P48808-B21' : null);
      }
    });

    it('Negative & Validation Guards: Rejects non-positive integer quantities with explicit errors', () => {
      const modernizer = new HeterogeneousTenderModernizer();
      assert.throws(() => {
        modernizer.synthesizeCarrierFleet([{
          groupId: 'Grp_Zero',
          items: [{ sku: 'P40430-B21', description: 'HPE 300GB SAS HDD', quantity: 0 }]
        }], 'HPE_PROLIANT_DL380_GEN11', { allocateStorageCarriers: true });
      }, /must be a positive integer/);

      assert.throws(() => {
        modernizer.synthesizeCarrierFleet([{
          groupId: 'Grp_Negative',
          items: [{ sku: 'P40430-B21', description: 'HPE 300GB SAS HDD', quantity: -5 }]
        }], 'HPE_PROLIANT_DL380_GEN11', { allocateStorageCarriers: true });
      }, /must be a positive integer/);
    });

  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ATTACK VECTOR 2: Universal Quantity Conservation Ledger (INV-192 / F-CONS1) Stress
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Attack Vector 2: Universal Quantity Conservation Ledger (INV-192) Stress', () => {

    it('Audits massive heterogeneous tender (120 drives across 4 pools) with zero quantity loss', () => {
      const modernizer = new HeterogeneousTenderModernizer({ defaultServerPlatform: 'HPE_PROLIANT_DL380_GEN11' });
      const rawTender = [
        { isAdHocGroup: true, items: [
          { sku: 'P40430-B21', description: 'HPE 300GB SAS 12G 10K SFF BC HDD', quantity: 48 },
          { sku: 'P40543-B21', description: 'HPE 1.92TB NVMe Gen4 High Performance Read Intensive SFF BC SSD', quantity: 24 },
          { sku: 'P53556-B21', description: 'HPE 20TB SAS 12G 7.2K LFF LP HDD', quantity: 12 },
          { sku: 'P57789-B21', description: 'HPE 3.84TB NVMe Gen5 Mainstream Read Intensive EDSFF E3.S SSD', quantity: 36 }
        ]}
      ];

      const categorized = modernizer.categorizeTenderItems(rawTender);
      assert.equal(categorized.unbuildableAdHoc.length, 1);

      const fleet = modernizer.synthesizeCarrierFleet(categorized.unbuildableAdHoc, 'HPE_PROLIANT_DL380_GEN11', {
        allocateStorageCarriers: true,
        progressiveCageExpansion: true
      });

      assert.equal(fleet.carrierPools.length, 4, 'Must create 4 distinct storage carrier pools');
      const deliverables = modernizer.buildDualDeliverables(categorized, fleet);

      assert.equal(deliverables.isQuantityConserved, true, 'Zero dropped drives across all 120 units');
      assert.equal(deliverables.quantityConservationLedger.totalDiscrepancies, 0, 'Zero discrepancies in ledger');

      const ledger = deliverables.quantityConservationLedger.ledger;
      const sffHdd = ledger.find(l => l.cleanSku === 'P40430-B21');
      assert.equal(sffHdd.requestedQuantity, 48);
      assert.equal(sffHdd.allocatedTotal, 48);
      assert.equal(sffHdd.delta, 0);
      assert.equal(sffHdd.status, 'CONSERVED_EXACT');

      const sffSsd = ledger.find(l => l.cleanSku === 'P40543-B21');
      assert.equal(sffSsd.requestedQuantity, 24);
      assert.equal(sffSsd.allocatedTotal, 24);
      assert.equal(sffSsd.delta, 0);

      const lffHdd = ledger.find(l => l.cleanSku === 'P53556-B21');
      assert.equal(lffHdd.requestedQuantity, 12);
      assert.equal(lffHdd.allocatedTotal, 12);
      assert.equal(lffHdd.delta, 0);

      const edsffSsd = ledger.find(l => l.cleanSku === 'P57789-B21');
      assert.equal(edsffSsd.requestedQuantity, 36);
      assert.equal(edsffSsd.allocatedTotal, 36);
      assert.equal(edsffSsd.delta, 0);
    });

    it('Multi-row repeated SKU attribution: Correctly consolidates duplicate SKU lines and preserves source shares', () => {
      const modernizer = new HeterogeneousTenderModernizer();
      const categorized = modernizer.categorizeTenderItems([
        { isAdHocGroup: true, items: [
          { sku: 'P40430-B21', description: 'HPE 300GB SAS SFF HDD (Host OS Array)', quantity: 8 },
          { sku: 'P40430-B21', description: 'HPE 300GB SAS SFF HDD (Data Storage Pool)', quantity: 16 }
        ]}
      ]);

      const fleet = modernizer.synthesizeCarrierFleet(categorized.unbuildableAdHoc, 'HPE_PROLIANT_DL380_GEN11', {
        allocateStorageCarriers: true,
        progressiveCageExpansion: true
      });

      const deliverables = modernizer.buildDualDeliverables(categorized, fleet);
      assert.equal(deliverables.isQuantityConserved, true);
      const ledgerEntry = deliverables.quantityConservationLedger.ledger.find(l => l.cleanSku === 'P40430-B21');
      assert.equal(ledgerEntry.requestedQuantity, 24, 'Aggregates 8 + 16 = 24');
      assert.equal(ledgerEntry.allocatedTotal, 24);
      assert.equal(ledgerEntry.delta, 0);
      assert.equal(ledgerEntry.rowAllocations.length, 2, 'Tracks 2 distinct source rows');
      assert.equal(ledgerEntry.rowAllocations[0].requestedQuantity, 8);
      assert.equal(ledgerEntry.rowAllocations[0].allocatedShare, 8);
      assert.equal(ledgerEntry.rowAllocations[1].requestedQuantity, 16);
      assert.equal(ledgerEntry.rowAllocations[1].allocatedShare, 16);
    });

  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ATTACK VECTOR 3: Rank 5 Strategic Budget NVMe Down-Tiering & Value Engineering
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Attack Vector 3: Rank 5 Strategic Budget NVMe Down-Tiering & Value Engineering', () => {

    it('Verifies capacity non-decrease invariant (C_target >= C_original) across all 4 certified tiers', () => {
      for (const [key, mapping] of Object.entries(CERTIFIED_STORAGE_DOWNTIER_MAP)) {
        assert.ok(mapping.sku.startsWith('P'), `${key} SKU must be authentic HPE SKU`);
        assert.ok(mapping.desc.includes('Read Intensive'), `${key} replacement must be Read Intensive`);
        assert.ok(mapping.desc.includes('BC'), `${key} replacement must preserve Basic Carrier (BC)`);

        // Extract capacity from key and verify non-decrease
        const keyCapGb = key.includes('800GB') ? 800 : (key.includes('1.6TB') ? 1600 : (key.includes('3.2TB') ? 3200 : (key.includes('6.4TB') ? 6400 : parseInt(key, 10))));
        assert.ok(mapping.capGb >= keyCapGb, `Capacity non-decrease violated for ${key}: ${mapping.capGb} < ${keyCapGb}`);
      }
    });

    it('Down-tiers 800GB Mixed Use to 960GB Read Intensive with CapEx savings in non-write-intensive workload', () => {
      const items = [
        { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF NC CTO Server', quantity: 1, unitPriceUsd: 1650 },
        { sku: 'P49610-B21', description: 'Intel Xeon-Gold 6430 2.1GHz 32-core Processor', quantity: 2, unitPriceUsd: 2200 },
        { sku: 'P43328-B21', description: 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit', quantity: 16, unitPriceUsd: 180 },
        { sku: 'P40546-B21', description: 'HPE 800GB NVMe Gen4 Mixed Use SFF BC SSD', quantity: 4, unitPriceUsd: 490 },
        { sku: 'P48803-B21', description: 'HPE 800W Flex Slot Platinum Power Supply', quantity: 2, unitPriceUsd: 280 }
      ];

      const tiers = synthesize5TierRankedSolutions(items, {}, {}, { model: 'DL380 Gen11' });
      const budget = tiers.find(r => r.strategyId === 'STRATEGY_BUDGET');
      assert.ok(budget, 'Budget strategy candidate must be generated');

      const replacedDrives = budget.skuPartsList.filter(p => p.sku === 'P40542-B21');
      assert.equal(replacedDrives.length, 1);
      assert.equal(replacedDrives[0].quantity, 4, 'Drive quantity 100% conserved');
      assert.ok(replacedDrives[0].description.includes('960GB'));
      assert.ok(replacedDrives[0].description.includes('Read Intensive'));
      assert.ok(budget.estimatedCostUsd < tiers[0].estimatedCostUsd, 'Budget CapEx strictly minimized');
    });

    it('Down-tiers 3.84TB Mixed Use to 3.84TB Read Intensive preserving 100% capacity', () => {
      const items = [
        { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF NC CTO Server', quantity: 1, unitPriceUsd: 1650 },
        { sku: 'P49610-B21', description: 'Intel Xeon-Gold 6430 2.1GHz 32-core Processor', quantity: 2, unitPriceUsd: 2200 },
        { sku: 'P43328-B21', description: 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit', quantity: 16, unitPriceUsd: 180 },
        { sku: 'P40550-B21', description: 'HPE 3.84TB NVMe Gen4 Mixed Use SFF BC SSD', quantity: 8, unitPriceUsd: 1250 },
        { sku: 'P48803-B21', description: 'HPE 800W Flex Slot Platinum Power Supply', quantity: 2, unitPriceUsd: 280 }
      ];

      const tiers = synthesize5TierRankedSolutions(items, {}, {}, { model: 'DL380 Gen11' });
      const budget = tiers.find(r => r.strategyId === 'STRATEGY_BUDGET');
      const replacedDrives = budget.skuPartsList.filter(p => p.sku === 'P40544-B21');
      assert.equal(replacedDrives.length, 1);
      assert.equal(replacedDrives[0].quantity, 8);
      assert.ok(replacedDrives[0].description.includes('3.84TB'));
    });

    it('Negative Filters: Does not alter drives that are already Read Intensive, SAS HDDs, or SATA SSDs', () => {
      // 1. Read Intensive NVMe
      const riNvme = [{ sku: 'P40543-B21', description: 'HPE 1.92TB NVMe Read Intensive SFF BC SSD', quantity: 4, unitPriceUsd: 450 }];
      assert.equal(_tryBudgetStorageSubstitution(riNvme, null, null, () => 450), false);
      assert.equal(riNvme[0].sku, 'P40543-B21');

      // 2. SAS HDD
      const sasHdd = [{ sku: 'P40430-B21', description: 'HPE 300GB SAS 12G 10K SFF BC HDD', quantity: 4, unitPriceUsd: 180 }];
      assert.equal(_tryBudgetStorageSubstitution(sasHdd, null, null, () => 180), false);
      assert.equal(sasHdd[0].sku, 'P40430-B21');

      // 3. SATA SSD
      const sataSsd = [{ sku: 'P18424-B21', description: 'HPE 960GB SATA 6G Mixed Use SFF BC Multi Vendor SSD', quantity: 4, unitPriceUsd: 320 }];
      assert.equal(_tryBudgetStorageSubstitution(sataSsd, null, null, () => 320), false);
      assert.equal(sataSsd[0].sku, 'P18424-B21');
    });

  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ATTACK VECTOR 4: Natural-Language & Flag Workload Gating
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Attack Vector 4: Natural-Language & Flag Workload Gating', () => {

    it('Strictly blocks down-tiering when storageWorkload is WRITE_INTENSIVE', () => {
      const items = [{ sku: 'P40548-B21', description: 'HPE 1.92TB NVMe Mixed Use SFF BC SSD', quantity: 4, unitPriceUsd: 750 }];
      const changed = _tryBudgetStorageSubstitution(items, { storageWorkload: 'WRITE_INTENSIVE' }, null, () => 450);
      assert.equal(changed, false, 'Explicit WRITE_INTENSIVE must block down-tiering');
      assert.equal(items[0].sku, 'P40548-B21');
    });

    it('Strictly blocks down-tiering when isWriteIntensive is true', () => {
      const items = [{ sku: 'P40548-B21', description: 'HPE 1.92TB NVMe Mixed Use SFF BC SSD', quantity: 4, unitPriceUsd: 750 }];
      const changed = _tryBudgetStorageSubstitution(items, { isWriteIntensive: true }, null, () => 450);
      assert.equal(changed, false, 'isWriteIntensive=true must block down-tiering');
    });

    it('Strictly blocks down-tiering when primaryWorkload contains natural-language "transaction log"', () => {
      const items = [{ sku: 'P40548-B21', description: 'HPE 1.92TB NVMe Mixed Use SFF BC SSD', quantity: 4, unitPriceUsd: 750 }];
      const changed = _tryBudgetStorageSubstitution(items, { primaryWorkload: 'High-Volume Transaction Log Engine' }, null, () => 450);
      assert.equal(changed, false, 'Natural language transaction log must block down-tiering');
    });

    it('Strictly blocks down-tiering when primaryWorkload contains natural-language "redo log"', () => {
      const items = [{ sku: 'P40548-B21', description: 'HPE 1.92TB NVMe Mixed Use SFF BC SSD', quantity: 4, unitPriceUsd: 750 }];
      const changed = _tryBudgetStorageSubstitution(items, { primaryWorkload: 'Enterprise Redo Log Store' }, null, () => 450);
      assert.equal(changed, false, 'Natural language redo log must block down-tiering');
    });

    it('Strictly blocks down-tiering when drive description contains write-intensive / transaction log tokens', () => {
      const descriptions = [
        'HPE 1.92TB NVMe Mixed Use SFF BC SSD (Database Transaction Log)',
        'HPE 3.84TB NVMe MU SFF SSD - WAL Journal',
        'HPE 800GB NVMe MU SFF BC SSD - Write-Heavy redo log',
        'HPE 1.92TB NVMe Gen4 High Performance Mixed Use SSD (DB Logging)'
      ];

      for (const desc of descriptions) {
        const items = [{ sku: 'P40548-B21', description: desc, quantity: 2, unitPriceUsd: 750 }];
        const changed = _tryBudgetStorageSubstitution(items, null, null, () => 450);
        assert.equal(changed, false, `Drive description "${desc}" must protect against down-tiering`);
        assert.equal(items[0].sku, 'P40548-B21');
      }
    });

  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ATTACK VECTOR 5: Adversarial Discovered Flaws & Vulnerability Benchmarks
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Attack Vector 5: Adversarial Discovered Flaws & Vulnerability Benchmarks', () => {

    it('CHALLENGE FINDING 1: SAP_HANA / HANA primaryWorkload or description must strictly block down-tiering', () => {
      const items = [{ sku: 'P40548-B21', description: 'HPE 1.92TB NVMe Gen4 High Performance Mixed Use SFF BC U.3 SSD', quantity: 4, unitPriceUsd: 750 }];

      // Adversarial test: SAP HANA database workload must not be down-tiered to Read Intensive NVMe
      const changed = _tryBudgetStorageSubstitution(items, { primaryWorkload: 'SAP_HANA' }, null, () => 450);
      assert.equal(
        changed,
        false,
        'SAP HANA workload must strictly block down-tiering (Read Intensive fails SAP HANA TDI write requirements)'
      );
    });

    it('CHALLENGE FINDING 2: UPPER_SNAKE_CASE identifiers (DATABASE_TRANSACTION_LOG, SQL_REDO_LOG, POSTGRESQL_WAL) must block down-tiering', () => {
      const testCases = ['DATABASE_TRANSACTION_LOG', 'SQL_REDO_LOG', 'POSTGRESQL_WAL'];
      for (const id of testCases) {
        const items = [{ sku: 'P40548-B21', description: 'HPE 1.92TB NVMe Mixed Use SFF BC SSD', quantity: 4, unitPriceUsd: 750 }];
        const changed = _tryBudgetStorageSubstitution(items, { primaryWorkload: id }, null, () => 450);
        assert.equal(
          changed,
          false,
          `Identifier ${id} must block down-tiering even with snake_case underscores`
        );
      }
    });

    it('CHALLENGE FINDING 3: _tryBudgetStorageSubstitution must safely handle omitted getPrice without throwing TypeError', () => {
      const items = [{ sku: 'P40548-B21', description: 'HPE 1.92TB NVMe Gen4 High Performance Mixed Use SFF BC U.3 SSD', quantity: 4, unitPriceUsd: 750 }];

      assert.doesNotThrow(() => {
        _tryBudgetStorageSubstitution(items);
      }, 'Missing getPrice parameter must be handled safely with fallback to refPrice');
    });

    it('CHALLENGE FINDING 4: _tryBudgetStorageSubstitution must safely handle null parts parameter without throwing TypeError', () => {
      assert.doesNotThrow(() => {
        _tryBudgetStorageSubstitution(null);
      }, 'Null parts parameter must be handled safely without throwing TypeError');
    });

    it('CHALLENGE FINDING 5: synthesizeCarrierFleet must resolve HPE_PROLIANT_DL380A_GEN12 server platform profile', () => {
      const modernizer = new HeterogeneousTenderModernizer();
      const tender = [{
        groupId: 'Grp_DL380a',
        items: [{ sku: 'P57789-B21', description: 'HPE 3.84TB NVMe Gen5 EDSFF E3.S SSD', quantity: 8 }]
      }];

      const fleet = modernizer.synthesizeCarrierFleet(tender, 'HPE_PROLIANT_DL380A_GEN12', {
        allocateStorageCarriers: true,
        progressiveCageExpansion: true
      });

      assert.notEqual(
        fleet.reason,
        'SERVER_PLATFORM_PROFILE_REQUIRED',
        'DL380a Gen12 must have registered platform profile in PLATFORM_PROFILES'
      );
    });

    it('CHALLENGE FINDING 6: REDIS_AOF, CASSANDRA_COMMITLOG, and KAFKA_JOURNAL must block down-tiering', () => {
      const testCases = ['REDIS_AOF', 'CASSANDRA_COMMITLOG', 'KAFKA_JOURNAL'];
      for (const id of testCases) {
        const items = [{ sku: 'P40548-B21', description: 'HPE 1.92TB NVMe Mixed Use SFF BC SSD', quantity: 4, unitPriceUsd: 750 }];
        const changed = _tryBudgetStorageSubstitution(items, { primaryWorkload: id }, null, () => 450);
        assert.equal(changed, false, `Identifier ${id} must block down-tiering`);
        assert.equal(items[0].sku, 'P40548-B21');
      }
    });

  });

});
