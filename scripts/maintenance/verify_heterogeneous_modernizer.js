'use strict';
/**
 * scripts/maintenance/verify_heterogeneous_modernizer.js
 *
 * Self-contained verification test for HeterogeneousTenderModernizer engine.
 */

const { HeterogeneousTenderModernizer } = require('../lib/boq/heterogeneous_tender_modernizer.js');
const { getPlatformProfile } = require('../lib/rules/platform_profiles.js');

async function runVerification() {
  console.log('================================================================================');
  console.log('🧪 VERIFYING HETEROGENEOUS TENDER MODERNIZER ENGINE');
  console.log('================================================================================');

  // Test 1: Verify Platform Profile Registry
  console.log('\n[TEST 1] Platform Profile Registry Lookup');
  const dl380Profile = getPlatformProfile('DL380 Gen11');
  if (!dl380Profile || dl380Profile.generation !== 'Gen11') {
    throw new Error('FAILED: Could not load DL380 Gen11 profile');
  }
  console.log(`✅ Loaded profile: ${dl380Profile.family} (${dl380Profile.vendor}) | Max DIMMs: ${dl380Profile.memoryArchitecture.maxDimmsPerChassis}`);

  const msaProfile = getPlatformProfile('MSA 2060');
  if (!msaProfile || msaProfile.domain !== 'storage') {
    throw new Error('FAILED: Could not load MSA 2060 profile');
  }
  console.log(`✅ Loaded profile: ${msaProfile.family} (${msaProfile.domain})`);

  // Test 2: Ingestion & Domain Partitioning
  console.log('\n[TEST 2] Ingestion & Domain Partitioning');
  const modernizer = new HeterogeneousTenderModernizer();

  const mockTender = [
    {
      id: 'T1',
      title: 'Table 1: Production Database Nodes',
      multiplier: 2,
      items: [
        { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF Server', qty: 1 },
        { sku: 'P67095-B21', description: 'Intel Xeon-Gold 6530 Processor', qty: 2 }
      ]
    },
    {
      id: 'T14',
      title: 'Table 14: StoreEver Tape Archive',
      items: [
        { sku: 'Q6Q62C', description: 'HPE StoreEver MSL3040 Base Module', qty: 1 }
      ]
    },
    {
      id: 'T17',
      title: 'Table 17: MSA 2060 SAN Storage',
      items: [
        { sku: 'R0Q74B', description: 'HPE MSA 2060 2U SFF Chassis', qty: 1 },
        { sku: 'R3R30A', description: 'HPE MSA 3.84TB SAS SSD', qty: 24 }
      ]
    },
    {
      id: 'T13',
      title: 'Table 13: Ad-Hoc Server Spares & Accessories',
      isAdHocTable: true,
      items: [
        { sku: 'P00930-B21', description: '64GB 2Rx4 DDR5-5600 DIMM', qty: 120 },
        { sku: '815100-B21', description: '32GB 2Rx8 DDR5-5600 DIMM', qty: 80 },
        { sku: 'P08421-B21', description: '10/25Gb SFP28 2-port NIC', qty: 28 },
        { sku: 'P28028-B21', description: '300GB 15K SAS BC HDD', qty: 4 }
      ]
    }
  ];

  const partitioned = modernizer.categorizeTenderItems(mockTender);
  console.log(`✅ Partitioned domains: Servers=${partitioned.servers.length}, Storage=${partitioned.storage.length}, Tape=${partitioned.tapeBackup.length}, Ad-Hoc=${partitioned.unbuildableAdHoc.length}`);
  if (partitioned.servers.length !== 1 || partitioned.storage.length !== 1 || partitioned.tapeBackup.length !== 1 || partitioned.unbuildableAdHoc.length !== 1) {
    throw new Error('FAILED: Domain partitioning mismatch');
  }

  // Test 3: Carrier Fleet Diophantine Bin-Packing
  console.log('\n[TEST 3] Carrier Fleet Diophantine Bin-Packing');
  const carrierFleet = modernizer.synthesizeCarrierFleet(partitioned.unbuildableAdHoc, 'HPE_PROLIANT_DL380_GEN11');
  console.log(`✅ Synthesized carrier pools: ${carrierFleet.carrierPools.length}`);
  for (const pool of carrierFleet.carrierPools) {
    console.log(`   - Pool "${pool.poolId}": ${pool.chassisCount} chassis | Target RAM: ${pool.targetMemoryCapacity} | Total DIMMs: ${pool.totalDimms} (absorbed ${pool.absorbedRequirement}) | CPUs: ${pool.totalCpus} (${pool.cpusPerServer}P)`);
    if (pool.poolId === 'Pool_64GB' && pool.chassisCount !== 4) throw new Error(`Expected 4 chassis for 64GB pool, got ${pool.chassisCount}`);
    if (pool.poolId === 'Pool_32GB' && pool.chassisCount !== 3) throw new Error(`Expected 3 chassis for 32GB pool, got ${pool.chassisCount}`);
  }

  // Test 4: PCIe Ethernet Cap & OCP3 Split Arbitration
  console.log('\n[TEST 4] PCIe Ethernet Cap & OCP3 Split Arbitration');
  const poolA = carrierFleet.carrierPools.find(p => p.poolId === 'Pool_64GB');
  console.log(`   - Pool A NICs: ${poolA.nics.pciePerServer} PCIe + ${poolA.nics.ocpPerServer} OCP = ${poolA.nics.pciePerServer + poolA.nics.ocpPerServer}/server (Total provisioned: ${poolA.nics.totalProvisioned})`);
  if (poolA.nics.pciePerServer > 3) throw new Error('FAILED: Exceeded max 3 PCIe Ethernet cards!');
  if (!poolA.nics.requiresOcpEnablement) throw new Error('FAILED: Did not flag required OCP enablement kit');

  // Test 5: Deep Dependency Injection (Companion Kits)
  console.log('\n[TEST 5] Deep Dependency Injection (Companion Kits)');
  const rawServer = {
    name: 'Server 1',
    items: [
      { sku: 'P52534-B21', description: 'DL380 Gen11 8SFF Chassis', qty: 1 },
      { sku: 'P67095-B21', description: 'Intel Xeon-Gold 6530 Processor', qty: 2 },
      { sku: 'P26262-B21', description: 'Broadcom 10/25Gb PCIe Adapter', qty: 4 }, // >3 cards forces secondary riser
      { sku: 'P10115-B21', description: 'Broadcom 10/25Gb OCP3 Adapter', qty: 1 }, // OCP forces P48828
      { sku: 'P58335-B21', description: 'MR408i-o Storage Controller', qty: 1 },
      { sku: 'P01366-B21', description: 'Smart Storage Battery', qty: 1 } // Battery forces P48918 cable
    ]
  };
  const enrichedServer = modernizer.injectMissingDeepDependencies(rawServer, 'HPE_PROLIANT_DL380_GEN11');
  console.log(`✅ Injected ${enrichedServer.injectedDependencies.length} companion kits:`);
  enrichedServer.injectedDependencies.forEach(k => console.log(`   - [${k.sku}] ${k.description} (Qty: ${k.qty})`));
  const injectedSkus = enrichedServer.injectedDependencies.map(k => k.sku);
  if (!injectedSkus.includes('P48818-B21')) throw new Error('Missing injected 2nd CPU heatsink');
  if (!injectedSkus.includes('P48802-B21')) throw new Error('Missing injected secondary riser');
  if (!injectedSkus.includes('P48828-B21')) throw new Error('Missing injected OCP2 enablement kit');
  if (!injectedSkus.includes('P48918-B21')) throw new Error('Missing injected battery cable kit');
  if (!injectedSkus.includes('P48820-B21')) throw new Error('Missing injected fan kit');
  if (!injectedSkus.includes('P52341-B21')) throw new Error('Missing injected rail kit');

  // Test 6: Official HPE OCA Upload Format Builder
  console.log('\n[TEST 6] Official HPE OCA Upload Format Builder (4-Column, 2-Line Gap, No Price)');
  const ocaBlocks = [
    { configName: 'DL380 Gen11 #1', items: [{ sku: 'P52534-B21', description: 'Chassis', qty: 1 }] },
    { configName: 'DL380 Gen11 #2', items: [{ sku: 'P52534-B21', description: 'Chassis', qty: 1 }] }
  ];
  const ocaRows = modernizer.generateOcaUploadRows(ocaBlocks);
  console.log(`✅ Generated ${ocaRows.length} OCA upload rows`);
  // Verify 2 empty rows between block 1 and block 2
  // Row 0: Banner, Row 1: Headers, Row 2: Item 1, Row 3: Blank, Row 4: Blank, Row 5: Banner 2
  if (ocaRows[3].length !== 0 || ocaRows[4].length !== 0) throw new Error('FAILED: Missing 2 blank separator lines between configs!');
  if (ocaRows[1].join(',') !== 'Qty,Product #,Description,Config Name') throw new Error('FAILED: OCA headers mismatch!');

  // Test 7: SKU Substitution & Grounding
  console.log('\n[TEST 7] Active vs Obsolete SKU Grounding');
  const obsoleteCheck = modernizer.resolveActiveHardware('P28028-B21', '300GB 15K SAS BC HDD');
  console.log(`   - Obsolete SKU ${obsoleteCheck.originalSku} -> Active Replacement: ${obsoleteCheck.sku} (${obsoleteCheck.description})`);
  if (obsoleteCheck.sku !== 'P40430-B21') throw new Error(`Expected P40430-B21, got ${obsoleteCheck.sku}`);

  // Test 8: 3-Tier Fallback Chain
  console.log('\n[TEST 8] 3-Tier Fallback Chain (NotebookLM -> Live Scrape -> Human Confirmation)');
  const fallbackRes = await modernizer.resolveHardwareWithFallback({ model: 'Unknown-Chassis-2027' });
  console.log(`   - Fallback Action: ${fallbackRes.tier} | Message: "${fallbackRes.message}"`);
  if (fallbackRes.tier !== 'TIER_2_LIVE_SCRAPE_REQUIRED') throw new Error('FAILED: 3-tier fallback did not trigger scrape requirement!');

  // Test 9: Client Audit Rule (Zero "UCID" Invariant)
  console.log('\n[TEST 9] Client Audit Invariant Enforcement');
  const goodRemark = modernizer.formatClientRemark('CARRIER_ABSORPTION_SOURCE', {
    componentType: 'memory',
    targetTable: '19',
    targetPoolName: 'Carrier Pool A - 64GB'
  });
  console.log(`   - Valid remark: "${goodRemark}"`);
  if (goodRemark.toUpperCase().includes('UCID')) throw new Error('FAILED: "UCID" found in good remark!');

  let threwOnBadRemark = false;
  try {
    modernizer.formatClientRemark('CUSTOM', { customRemark: 'Absorbed into UCID 2 carrier server' });
  } catch (err) {
    threwOnBadRemark = true;
    console.log(`✅ Caught forbidden jargon invariant violation: "${err.message}"`);
  }
  if (!threwOnBadRemark) throw new Error('FAILED: Engine did not throw on forbidden "UCID" term!');

  // [TEST 10] Gen12 Platform Profile & Dependency Verification
  console.log('\n[TEST 10] Gen12 Platform Profile & Dependency Verification');
  const gen12Profile = getPlatformProfile('HPE_PROLIANT_DL380_GEN12');
  if (!gen12Profile || gen12Profile.generation !== 'Gen12') throw new Error('FAILED to load DL380 Gen12 profile!');
  console.log(`✅ Loaded Gen12 profile: Base Chassis=${gen12Profile.baseChassis.sku}, Memory Speed=${gen12Profile.memoryArchitecture.speedMt} MT/s`);

  // [TEST 11] Dell PowerEdge Cross-Vendor Mapping
  console.log('\n[TEST 11] Dell PowerEdge Cross-Vendor Mapping');
  const dellProfile = getPlatformProfile('DELL_POWEREDGE_R770');
  if (!dellProfile || dellProfile.targetHpeEquivalent !== 'HPE_PROLIANT_DL380_GEN12') {
    throw new Error('FAILED: Dell R770 did not map to DL380 Gen12 equivalent!');
  }
  console.log(`✅ Dell R770 mapped to target equivalent: ${dellProfile.targetHpeEquivalent}`);

  // [TEST 12] Flat Item Ingestion Without Pre-Split Tables
  console.log('\n[TEST 12] Flat Item Ingestion Without Pre-Split Tables');
  const flatTenderItems = [
    { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 Server', qty: 2 },
    { sku: 'R0Q40B', description: 'HPE MSA 2060 Enclosure Storage Array', qty: 1 },
    { sku: 'P64707-B21', description: 'HPE 64GB DDR5 Memory DIMM', qty: 32, isAdHocRow: true }
  ];
  const flatCategorized = modernizer.categorizeTenderItems(flatTenderItems);
  if (flatCategorized.servers.length !== 1 || flatCategorized.unbuildableAdHoc.length !== 1) {
    throw new Error('FAILED: Flat item ingestion did not properly partition servers and ad-hoc items!');
  }
  console.log(`✅ Flat tender items successfully ingested and partitioned into domains and ad-hoc components`);

  console.log('\n================================================================================');
  console.log('🎉 ALL HETEROGENEOUS TENDER MODERNIZER TESTS PASSED (12/12 - 100% CERTIFIED)');
  console.log('================================================================================');
}

runVerification().catch(err => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
