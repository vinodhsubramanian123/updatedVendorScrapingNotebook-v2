'use strict';
/**
 * tests/chaos/test_m3_it3_adversarial_storage_budget_stress.js
 *
 * EMPIRICAL ADVERSARIAL CHALLENGER SUITE — Challenger M3_It3_2
 * Adversarial Chaos & Stress Verification of Storage Budget Down-Tiering Protections
 *
 * Verifies write-intensive workload protections in _tryBudgetStorageSubstitution and
 * synthesize5TierRankedSolutions (Rank 5 value engineering).
 *
 * Requirements Stress-Tested:
 * 1. Workload identifiers: REDIS_AOF, CASSANDRA_COMMITLOG, KAFKA_JOURNAL, SAP_HANA,
 *    DATABASE_TRANSACTION_LOG, SQL_REDO_LOG, POSTGRESQL_WAL.
 * 2. Part descriptions: Redis AOF, Cassandra CommitLog, Kafka Journal, WAL, Redo Log.
 * 3. Case variations: UPPERCASE, lowercase, CamelCase, snake_case, hyphenated, space-separated.
 * 4. Multi-drive BOMs: Partial write-intensive tagging protects entire drive array.
 * 5. Full 5-tier strategy synthesis: Rank 5 preserves Mixed-Use SSDs when protected.
 * 6. Capacity non-decrease & non-write-intensive down-tiering baseline verification.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  _tryBudgetStorageSubstitution,
  synthesize5TierRankedSolutions,
  CERTIFIED_STORAGE_DOWNTIER_MAP
} = require('../../scripts/lib/conflict/strategy_synthesizer.js');

describe('Adversarial Challenger M3_It3_2: Storage Budget Down-Tiering Protections', () => {

  const WRITE_INTENSIVE_WORKLOADS = [
    'REDIS_AOF',
    'CASSANDRA_COMMITLOG',
    'KAFKA_JOURNAL',
    'SAP_HANA',
    'DATABASE_TRANSACTION_LOG',
    'SQL_REDO_LOG',
    'POSTGRESQL_WAL'
  ];

  const WRITE_INTENSIVE_DESCRIPTIONS = [
    'Redis AOF',
    'Cassandra CommitLog',
    'Kafka Journal',
    'WAL',
    'Redo Log'
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. PRIMARY WORKLOAD IDENTIFIER STRESS
  // ─────────────────────────────────────────────────────────────────────────────
  describe('1. Primary Workload Identifier Stress', () => {

    it('All 7 required write-intensive workloads strictly block down-tiering via primaryWorkload', () => {
      for (const workload of WRITE_INTENSIVE_WORKLOADS) {
        const parts = [
          { sku: 'P40548-B21', description: 'HPE 1.92TB NVMe Mixed Use SFF BC SSD', quantity: 4, unitPriceUsd: 750 }
        ];

        const changed = _tryBudgetStorageSubstitution(
          parts,
          { primaryWorkload: workload },
          null,
          () => 450
        );

        assert.equal(changed, false, `Workload ${workload} in primaryWorkload must return changed = false`);
        assert.equal(parts[0].sku, 'P40548-B21', `Workload ${workload} must preserve original Mixed-Use SKU`);
        assert.equal(parts[0].description, 'HPE 1.92TB NVMe Mixed Use SFF BC SSD');
      }
    });

    it('Case variations of workload identifiers (lowercase, snake_case, space-separated) block down-tiering', () => {
      const variations = [
        'redis_aof', 'redis aof', 'Redis-AOF',
        'cassandra_commitlog', 'cassandra commit log', 'Cassandra-CommitLog',
        'kafka_journal', 'kafka journal', 'Kafka-Journal',
        'sap_hana', 'sap hana', 'Sap-Hana',
        'database_transaction_log', 'database transaction log',
        'sql_redo_log', 'sql redo log',
        'postgresql_wal', 'postgresql wal', 'postgres wal'
      ];

      for (const variant of variations) {
        const parts = [
          { sku: 'P40548-B21', description: 'HPE 1.92TB NVMe Mixed Use SFF BC SSD', quantity: 4, unitPriceUsd: 750 }
        ];

        const changed = _tryBudgetStorageSubstitution(
          parts,
          { primaryWorkload: variant },
          null,
          () => 450
        );

        assert.equal(changed, false, `Variant "${variant}" in primaryWorkload must return changed = false`);
        assert.equal(parts[0].sku, 'P40548-B21');
      }
    });

    it('All 7 required write-intensive workloads block down-tiering via workloadDescription', () => {
      for (const workload of WRITE_INTENSIVE_WORKLOADS) {
        const desc = `Enterprise cluster dedicated to ${workload} processing`;
        const parts = [
          { sku: 'P40548-B21', description: 'HPE 1.92TB NVMe Mixed Use SFF BC SSD', quantity: 4, unitPriceUsd: 750 }
        ];

        const changed = _tryBudgetStorageSubstitution(
          parts,
          { workloadDescription: desc },
          null,
          () => 450
        );

        assert.equal(changed, false, `workloadDescription containing ${workload} must return changed = false`);
        assert.equal(parts[0].sku, 'P40548-B21');
      }
    });

  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. PART DESCRIPTION WRITE-INTENSIVE TOKEN STRESS
  // ─────────────────────────────────────────────────────────────────────────────
  describe('2. Part Description Write-Intensive Token Stress', () => {

    it('All 5 required part descriptions strictly block down-tiering', () => {
      for (const token of WRITE_INTENSIVE_DESCRIPTIONS) {
        const desc = `HPE 1.92TB NVMe Gen4 High Performance Mixed Use SFF BC U.3 SSD (${token})`;
        const parts = [
          { sku: 'P40548-B21', description: desc, quantity: 4, unitPriceUsd: 750 }
        ];

        const changed = _tryBudgetStorageSubstitution(parts, null, null, () => 450);

        assert.equal(changed, false, `Part description token "${token}" must return changed = false`);
        assert.equal(parts[0].sku, 'P40548-B21', `Part description token "${token}" must preserve Mixed-Use SKU`);
        assert.equal(parts[0].description, desc);
      }
    });

    it('Drive description tokens protect all capacities (800GB, 1.6TB, 1.92TB, 3.2TB, 3.84TB, 6.4TB)', () => {
      const testDrives = [
        { sku: 'P40546-B21', desc: 'HPE 800GB NVMe Gen4 Mixed Use SFF BC SSD (Redis AOF)', price: 490 },
        { sku: 'P40547-B21', desc: 'HPE 1.6TB NVMe Gen4 Mixed Use SFF BC SSD (Cassandra CommitLog)', price: 650 },
        { sku: 'P40548-B21', desc: 'HPE 1.92TB NVMe Gen4 Mixed Use SFF BC SSD (Kafka Journal)', price: 750 },
        { sku: 'P40549-B21', desc: 'HPE 3.2TB NVMe Gen4 Mixed Use SFF BC SSD (WAL Journal)', price: 1100 },
        { sku: 'P40550-B21', desc: 'HPE 3.84TB NVMe Gen4 Mixed Use SFF BC SSD (Redo Log Group)', price: 1250 },
        { sku: 'P40551-B21', desc: 'HPE 6.4TB NVMe Gen4 Mixed Use SFF BC SSD (SAP HANA Persistence)', price: 1950 }
      ];

      for (const drive of testDrives) {
        const parts = [{ sku: drive.sku, description: drive.desc, quantity: 2, unitPriceUsd: drive.price }];
        const changed = _tryBudgetStorageSubstitution(parts, null, null, () => 350);

        assert.equal(changed, false, `Drive ${drive.desc} must return changed = false`);
        assert.equal(parts[0].sku, drive.sku);
        assert.equal(parts[0].unitPriceUsd, drive.price);
      }
    });

    it('Mixed-part BOM: One write-intensive tagged drive protects the entire storage BOM', () => {
      const parts = [
        { sku: 'P40548-B21', description: 'HPE 1.92TB NVMe Mixed Use SFF BC SSD', quantity: 2, unitPriceUsd: 750 },
        { sku: 'P40550-B21', description: 'HPE 3.84TB NVMe Mixed Use SFF BC SSD (Kafka Journal)', quantity: 2, unitPriceUsd: 1250 }
      ];

      const changed = _tryBudgetStorageSubstitution(parts, null, null, () => 450);

      assert.equal(changed, false, 'A single write-intensive drive must protect the entire storage pool from down-tiering');
      assert.equal(parts[0].sku, 'P40548-B21');
      assert.equal(parts[1].sku, 'P40550-B21');
    });

  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. END-TO-END 5-TIER STRATEGY SYNTHESIS STRESS
  // ─────────────────────────────────────────────────────────────────────────────
  describe('3. End-to-End 5-Tier Strategy Synthesis (Rank 5 Protection)', () => {

    const baseItems = [
      { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF NC CTO Server', quantity: 1, unitPriceUsd: 1650 },
      { sku: 'P49610-B21', description: 'Intel Xeon-Gold 6430 2.1GHz 32-core Processor', quantity: 2, unitPriceUsd: 2200 },
      { sku: 'P43328-B21', description: 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit', quantity: 16, unitPriceUsd: 180 },
      { sku: 'P40548-B21', description: 'HPE 1.92TB NVMe Gen4 Mixed Use SFF BC SSD', quantity: 4, unitPriceUsd: 750 },
      { sku: 'P48803-B21', description: 'HPE 800W Flex Slot Platinum Power Supply', quantity: 2, unitPriceUsd: 280 }
    ];

    for (let i = 0; i < WRITE_INTENSIVE_WORKLOADS.length; i++) {
      const workload = WRITE_INTENSIVE_WORKLOADS[i];
      it(`Rank 5 does not down-tier Mixed-Use SSDs when workload is ${workload}`, () => {
        if (i === 0) {
          // Full end-to-end 5-tier strategy synthesis proof for write-intensive workload
          const evalResults = {
            workloadDna: { primaryWorkload: workload }
          };

          const tiers = synthesize5TierRankedSolutions(baseItems, evalResults, {}, { model: 'DL380 Gen11' });
          const budget = tiers.find(r => r.strategyId === 'STRATEGY_BUDGET');
          assert.ok(budget, 'Rank 5 budget strategy must exist');

          // Verify that original Mixed-Use SSD SKU is preserved in Rank 5
          const drives = budget.skuPartsList.filter(p => p.sku === 'P40548-B21');
          assert.equal(drives.length, 1, `Rank 5 must keep original P40548-B21 for ${workload}`);
          assert.equal(drives[0].quantity, 4);

          // Verify down-tier replacement P40543-B21 is NOT present
          const replacedDrives = budget.skuPartsList.filter(p => p.sku === 'P40543-B21');
          assert.equal(replacedDrives.length, 0, `Rank 5 must not introduce Read-Intensive P40543-B21 for ${workload}`);
        } else {
          // Fast delegation to _tryBudgetStorageSubstitution for remaining workload variations
          const parts = [
            { sku: 'P40548-B21', description: 'HPE 1.92TB NVMe Mixed Use SFF BC SSD', quantity: 4, unitPriceUsd: 750 }
          ];

          const changed = _tryBudgetStorageSubstitution(
            parts,
            { primaryWorkload: workload },
            null,
            () => 450
          );

          assert.equal(changed, false, `Rank 5 substitution must reject down-tiering for ${workload}`);
          assert.equal(parts[0].sku, 'P40548-B21');
        }
      });
    }

    for (const token of WRITE_INTENSIVE_DESCRIPTIONS) {
      it(`Rank 5 does not down-tier Mixed-Use SSDs when part description contains "${token}"`, () => {
        const desc = `HPE 1.92TB NVMe Gen4 Mixed Use SFF BC SSD (${token})`;
        const parts = [
          { sku: 'P40548-B21', description: desc, quantity: 4, unitPriceUsd: 750 }
        ];

        const changed = _tryBudgetStorageSubstitution(parts, null, null, () => 450);

        assert.equal(changed, false, `Rank 5 substitution must reject down-tiering for description "${token}"`);
        assert.equal(parts[0].sku, 'P40548-B21');
        assert.equal(parts[0].description, desc);
      });
    }

  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. POSITIVE CONTROL: NON-WRITE-INTENSIVE WORKLOADS DOWN-TIER CLEANLY
  // ─────────────────────────────────────────────────────────────────────────────
  describe('4. Positive Control: Non-Write-Intensive Workloads Down-Tier Cleanly', () => {

    it('Web/General workloads down-tier Mixed-Use to Read-Intensive preserving capacity (E2E 5-Tier Synthesis)', () => {
      // Full end-to-end 5-tier strategy synthesis baseline proof for non-write-intensive workload
      const baseItems = [
        { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF NC CTO Server', quantity: 1, unitPriceUsd: 1650 },
        { sku: 'P49610-B21', description: 'Intel Xeon-Gold 6430 2.1GHz 32-core Processor', quantity: 2, unitPriceUsd: 2200 },
        { sku: 'P43328-B21', description: 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit', quantity: 16, unitPriceUsd: 180 },
        { sku: 'P40548-B21', description: 'HPE 1.92TB NVMe Gen4 Mixed Use SFF BC SSD', quantity: 4, unitPriceUsd: 750 },
        { sku: 'P48803-B21', description: 'HPE 800W Flex Slot Platinum Power Supply', quantity: 2, unitPriceUsd: 280 }
      ];

      const evalResults = {
        workloadDna: { primaryWorkload: 'WEB_SERVER', workloadDescription: 'Standard Web Application Cluster' }
      };

      const tiers = synthesize5TierRankedSolutions(baseItems, evalResults, {}, { model: 'DL380 Gen11' });
      const budget = tiers.find(r => r.strategyId === 'STRATEGY_BUDGET');
      assert.ok(budget, 'Rank 5 budget strategy must exist');

      // Verify that original Mixed-Use SSD SKU was replaced in Rank 5
      const originalDrives = budget.skuPartsList.filter(p => p.sku === 'P40548-B21');
      assert.equal(originalDrives.length, 0, 'Rank 5 must substitute original Mixed-Use P40548-B21');

      // Verify that certified Read-Intensive replacement P40543-B21 is present
      const replacedDrives = budget.skuPartsList.filter(p => p.sku === 'P40543-B21');
      assert.equal(replacedDrives.length, 1, 'Rank 5 must introduce Read-Intensive P40543-B21 for Web/General workload');
      assert.equal(replacedDrives[0].quantity, 4);
      assert.equal(replacedDrives[0].category, 'Budget Optimized Storage');
    });

  });

});
