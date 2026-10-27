'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  AUDIT_SUBSYSTEMS,
  parseCompetitorSpecification,
  audit12PointPhysicalParity,
  transformCompetitorQuote
} = require('../../scripts/lib/boq/cross_vendor_transformer.js');
const { HeterogeneousTenderModernizer } = require('../../scripts/lib/boq/heterogeneous_tender_modernizer.js');

test('Wave 3 Gap Closure — G5.1 Cross-Vendor 12-Point Parity Math', async (t) => {
  await t.test('G5.1 (Positive): Computes exact parity metrics across compute, memory, and networking', () => {
    const sourceBoq = [
      { sku: 'DELL-CPU-8480', description: 'Intel Xeon Platinum 8480+ 56-core Processor', quantity: 2, vendor: 'Dell' },
      { sku: 'DELL-MEM-64G', description: '64GB DDR5-4800 Registered DIMM', quantity: 16, capacityGb: 64, vendor: 'Dell' },
      { sku: 'DELL-DRV-1920', description: '1.92TB SAS Read Intensive SFF SSD', quantity: 8, vendor: 'Dell' },
      { sku: 'DELL-NIC-25G', description: 'Broadcom 57414 Dual Port 10/25GbE SFP28 Adapter', quantity: 2, vendor: 'Dell' },
      { sku: 'DELL-PSU-1600', description: '1600W Titanium Hot-Plug Power Supply', quantity: 2, vendor: 'Dell' }
    ];

    const targetHpeBom = [
      { sku: 'P49607-B21', description: 'Intel Xeon Platinum 8480+ 2.0GHz 56-core 350W Processor for HPE', quantity: 2 },
      { sku: 'P43328-B21', description: 'HPE 64GB (1x64GB) Dual Rank x4 DDR5-4800 Registered Smart Memory Kit', quantity: 16 },
      { sku: 'P49031-B21', description: 'HPE 1.92TB SAS 24G Read Intensive SFF BC Multi Vendor SSD', quantity: 8 },
      { sku: 'P26262-B21', description: 'Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 Adapter for HPE', quantity: 2 },
      { sku: 'P38997-B21', description: 'HPE 1600W Flex Slot Platinum Hot Plug Low Halogen Power Supply Kit', quantity: 2 }
    ];

    const spec = parseCompetitorSpecification(sourceBoq, 'Dell');
    assert.strictEqual(spec.compute.cpuCount, 2);
    assert.strictEqual(spec.compute.totalCores, 112); // 2 * 56
    assert.strictEqual(spec.memory.totalMemoryGb, 1024); // 16 * 64
    assert.strictEqual(spec.localDrives.count, 8);

    const audit = audit12PointPhysicalParity(spec, targetHpeBom, 'DL380 Gen11');
    assert.ok(audit, 'Parity audit object produced');
    assert.strictEqual(audit.auditItems.length, 12);

    // Compute parity
    const compute = audit.auditItems.find(p => p.subsystem === 'COMPUTE_PROCESSORS');
    assert.ok(compute, 'Compute processors dimension audited');
    assert.strictEqual(compute.status, 'MATCHED');

    // Memory capacity parity
    const memory = audit.auditItems.find(p => p.subsystem === 'MEMORY_TOPOLOGY');
    assert.ok(memory, 'Memory topology dimension audited');
    assert.strictEqual(memory.status, 'MATCHED');

    // Storage drives parity
    const storage = audit.auditItems.find(p => p.subsystem === 'DATA_STORAGE_DRIVES');
    assert.ok(storage, 'Storage drives dimension audited');
    assert.strictEqual(storage.status, 'MATCHED');

    // Networking parity
    const network = audit.auditItems.find(p => p.subsystem === 'OCP_NETWORKING_FABRIC');
    assert.ok(network, 'Networking dimension audited');
    assert.strictEqual(network.status, 'MATCHED');

    // Power parity
    const power = audit.auditItems.find(p => p.subsystem === 'POWER_AND_REDUNDANCY');
    assert.ok(power, 'Power dimension audited');
    assert.strictEqual(power.status, 'MATCHED');

    // Overall summary
    assert.strictEqual(audit.actionRequiredSubsystems, 0);
    assert.ok(audit.passedSubsystems >= 5);
  });

  await t.test('G5.1 (Negative): Detects DEFICIT when target BOM is missing cores or memory', () => {
    const sourceBoq = [
      { sku: 'CISCO-CPU-64', description: 'Intel Xeon 64-core Processor', quantity: 2 },
      { sku: 'CISCO-RAM-64', description: '64GB DDR5 Memory DIMM', quantity: 32 } // 2048 GB
    ];

    const incompleteTargetBom = [
      { sku: 'HPE-CPU-32', description: 'Intel Xeon 32-core Processor for HPE', quantity: 2 }, // only 64 cores vs 128
      { sku: 'HPE-RAM-32', description: '32GB DDR5 Registered Memory Kit', quantity: 16 } // only 512 GB vs 2048
    ];

    const spec = parseCompetitorSpecification(sourceBoq, 'Cisco');
    const audit = audit12PointPhysicalParity(spec, incompleteTargetBom, 'DL380 Gen11');

    assert.ok(audit.actionRequiredSubsystems > 0, 'Flags deficit when target under-provisions');
    assert.strictEqual(audit.status, 'ACTION_REQUIRED');

    const compute = audit.auditItems.find(p => p.subsystem === 'COMPUTE_PROCESSORS');
    assert.strictEqual(compute.status, 'DEFICIT');

    const memory = audit.auditItems.find(p => p.subsystem === 'MEMORY_TOPOLOGY');
    assert.strictEqual(memory.status, 'DEFICIT');
  });

  await t.test('G5.1 (Honest Coverage): Empty or unstated subsystems remain NOT_EVALUATED rather than fake PASS', () => {
    const audit = audit12PointPhysicalParity({}, [], 'DL380 Gen11');
    assert.strictEqual(audit.status, 'NOT_EVALUATED');
    assert.strictEqual(audit.totalSubsystemsAudited, 0);
    assert.strictEqual(audit.unresolvedSubsystems, 12);
    assert.strictEqual(audit.passedSubsystems, 0);
  });

  await t.test('G5.1 (Transform Flow): transformCompetitorQuote incorporates parity audit and maintains PORTAL VALIDATION PENDING', () => {
    const source = [{ sku: 'DELL-SRV-1', description: 'Dell PowerEdge R760 2x Intel Xeon 56C 1024GB RAM', quantity: 1 }];
    const transformed = transformCompetitorQuote(source, 'Dell', 'DL380 Gen11', {
      targetBom: [
        { sku: 'P49607-B21', quantity: 2, description: 'Intel Xeon Platinum 8480+ 56-core Processor' },
        { sku: 'P43328-B21', quantity: 16, description: 'HPE 64GB DDR5 Registered Smart Memory Kit' }
      ]
    });

    assert.strictEqual(transformed.status, 'CANDIDATE_EVALUATION_REQUIRED');
    assert.strictEqual(transformed.portalValidationStatus, 'PORTAL VALIDATION PENDING');
    assert.ok(transformed.auditReport, 'Audit report attached');
    assert.strictEqual(transformed.auditReport.auditItems.length, 12);
  });
});

test('Wave 3 Gap Closure — G5.2 Heterogeneous Tender Modernizer Carrier Fleet Expansion', async (t) => {
  await t.test('G5.2 (Positive): Expands storage and PCIe carriers when options are explicitly enabled', () => {
    const modernizer = new HeterogeneousTenderModernizer({ defaultServerPlatform: 'HPE_PROLIANT_DL380_GEN11' });
    const tenderGroups = [
      {
        groupId: 'Grp_Storage',
        title: 'Loose Storage Drives',
        multiplier: 2,
        items: [
          { sku: 'P40430-B21', description: 'HPE 300GB SAS 12G 10K SFF BC HDD', quantity: 16 } // 32 drives total
        ]
      },
      {
        groupId: 'Grp_Pcie',
        title: 'Loose Network Cards',
        multiplier: 1,
        items: [
          { sku: 'P26262-B21', description: 'Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 Adapter', quantity: 9 } // 9 adapters
        ]
      }
    ];

    const fleet = modernizer.synthesizeCarrierFleet(tenderGroups, 'HPE_PROLIANT_DL380_GEN11', {
      allocateStorageCarriers: true,
      allocatePcieCarriers: true
    });

    assert.strictEqual(fleet.status, 'DRAFT_ALLOCATION_REVIEW_REQUIRED');
    assert.ok(fleet.carrierPools.length >= 2, 'Allocated both storage and PCIe carrier pools');

    const storagePool = fleet.carrierPools.find(p => p.poolType === 'STORAGE_CARRIER');
    assert.ok(storagePool, 'Storage pool synthesized');
    assert.strictEqual(storagePool.absorbedRequirement, 32); // 16 * 2
    assert.strictEqual(storagePool.baysPerServer, 8);
    assert.strictEqual(storagePool.chassisCount, 4); // ceil(32 / 8)

    const pciePool = fleet.carrierPools.find(p => p.poolType === 'PCIE_CARRIER');
    assert.ok(pciePool, 'PCIe pool synthesized');
    assert.strictEqual(pciePool.absorbedRequirement, 9);
    assert.strictEqual(pciePool.slotsPerServer, 3);
    assert.strictEqual(pciePool.chassisCount, 3); // ceil(9 / 3)

    assert.strictEqual(fleet.unresolvedItems.length, 0, 'All drives and adapters allocated to carriers');
  });

  await t.test('G5.2 (Negative): Without explicit options, non-memory loose items are NOT absorbed and remain in unresolvedItems', () => {
    const modernizer = new HeterogeneousTenderModernizer({ defaultServerPlatform: 'HPE_PROLIANT_DL380_GEN11' });
    const tenderGroups = [
      {
        groupId: 'Grp_Loose',
        title: 'Unspecified Loose Hardware',
        multiplier: 1,
        items: [
          { sku: 'P40430-B21', description: 'HPE 300GB SAS 12G 10K SFF BC HDD', quantity: 10 },
          { sku: 'P26262-B21', description: 'Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 Adapter', quantity: 4 }
        ]
      }
    ];

    const fleet = modernizer.synthesizeCarrierFleet(tenderGroups, 'HPE_PROLIANT_DL380_GEN11');
    assert.strictEqual(fleet.carrierPools.length, 0, 'No carrier pools created without opt-in');
    assert.strictEqual(fleet.unresolvedItems.length, 2, 'All non-memory items preserved in unresolvedItems');
    assert.ok(fleet.unresolvedItems[0].reason.includes('Requires product-specific allocation'));
  });

  await t.test('G5.2 (Dependency Inference): injectMissingDeepDependencies suggests rail kit and support policy when requested', () => {
    const modernizer = new HeterogeneousTenderModernizer({ defaultServerPlatform: 'HPE_PROLIANT_DL380_GEN11' });
    const bareConfig = {
      chassis: 'DL380 Gen11',
      items: [
        { sku: 'P52534-B21', description: 'Chassis', quantity: 1 }
      ]
    };

    const evaluated = modernizer.injectMissingDeepDependencies(bareConfig, 'HPE_PROLIANT_DL380_GEN11', { inferBaseDependencies: true });
    assert.ok(Array.isArray(evaluated.suggestedDependencies), 'Provides suggestedDependencies list');
    const hasRail = evaluated.suggestedDependencies.some(d => d.type === 'RAIL_KIT');
    const hasSupport = evaluated.suggestedDependencies.some(d => d.type === 'SUPPORT_POLICY');
    assert.strictEqual(hasRail, true, 'Identifies missing rail kit');
    assert.strictEqual(hasSupport, true, 'Identifies missing support policy');
  });
});
