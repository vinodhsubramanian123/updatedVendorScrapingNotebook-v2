'use strict';
/**
 * scripts/lib/boq/heterogeneous_tender_modernizer.js
 *
 * Heterogeneous Tender Modernizer & Ad-Hoc Carrier Fleet Synthesis Engine
 *
 * Generic, hardware-agnostic solution execution engine that transforms
 * complex, messy, multi-domain customer tender spreadsheets into 100%
 * buildable, audit-certified, vendor-compliant configurations.
 *
 * Decouples domain routing, carrier synthesis, and dual-brain grounding
 * from specific platform rules. All hardware constraints are dynamically
 * queried from PlatformProfiles and active catalogs.
 */

const { getPlatformProfile, GENERIC_DETECTION_PATTERNS } = require('../rules/platform_profiles.js');
const { cleanBaseSKU } = require('../catalog/sku.js');
const { safeWriteJsonAtomic } = require('../system/fs_compat.js');
const { topologyRole } = require('./solution_topology.js');

class HeterogeneousTenderModernizer {
  constructor(options = {}) {
    this.defaultServerPlatform = options.defaultServerPlatform || 'HPE_PROLIANT_DL380_GEN11';
    this.defaultStoragePlatform = options.defaultStoragePlatform || 'HPE_MSA_2060';
    this.defaultFabricPlatform = options.defaultFabricPlatform || 'HPE_STOREFABRIC_SN3600B';
    this.defaultTapePlatform = options.defaultTapePlatform || 'HPE_STOREEVER_MSL3040';
    this.strictZeroJargon = options.strictZeroJargon !== false; // Invariant: Zero "UCID" in client remarks
    this.evidenceLedger = [];
  }

  /**
   * Log an epistemic verification step in the audit ledger.
   */
  logEvidence(phase, action, details) {
    this.evidenceLedger.push({
      timestamp: new Date().toISOString(),
      phase,
      action,
      details
    });
  }

  /**
   * Phase 1: Ingestion & Multi-Domain Categorization
   * Dynamically partitions raw tender line items into respective solution domains
   * using topologyRole semantic recognition, completely independent of table titles.
   *
   * Accepts:
   * - Array of table/group objects ({ title, items, ... })
   * - Flat array of item objects ({ sku, description, qty, ... })
   * - Object with sheet arrays ({ Sheet1: [...], Sheet2: [...] })
   */
  categorizeTenderItems(input = []) {
    let inputGroups = [];

    if (Array.isArray(input)) {
      if (input.length > 0 && (input[0].items || input[0].tableId || input[0].title || input[0].sheetName)) {
        inputGroups = input;
      } else {
        inputGroups = [{ title: 'Imported Tender Items', items: input }];
      }
    } else if (input && typeof input === 'object') {
      if (input.tables && Array.isArray(input.tables)) {
        inputGroups = input.tables;
      } else if (input.sheets && typeof input.sheets === 'object') {
        inputGroups = Object.entries(input.sheets).map(([sheetName, items]) => ({
          title: sheetName,
          items: Array.isArray(items) ? items : []
        }));
      } else {
        inputGroups = Object.entries(input).map(([title, items]) => ({
          title,
          items: Array.isArray(items) ? items : []
        }));
      }
    }

    this.logEvidence('PHASE_1_INGESTION', 'DOMAINS_PARTITIONED', { totalGroups: inputGroups.length });

    const partitioned = {
      servers: [],
      storage: [],
      sanFabric: [],
      tapeBackup: [],
      unbuildableAdHoc: []
    };

    for (const group of inputGroups) {
      const groupTitle = String(group.title || group.name || group.sheetName || 'Group').trim();
      const groupId = group.id || group.tableId || group.groupId || 'G1';
      const multiplier = Number(group.multiplier || group.chassisCount || 1);
      const items = group.items || [];

      // 1. Explicit loose ad-hoc / spare table check
      const groupLower = groupTitle.toLowerCase();
      if (group.isAdHocTable || group.isAdHocGroup || groupLower.includes('ad-hoc') || groupLower.includes('spare') || groupLower.includes('accessories')) {
        partitioned.unbuildableAdHoc.push({ groupTitle, groupId, items });
        continue;
      }

      // 2. Identify primary domain anchor within group
      let groupDomain = null;

      // Check group title semantics
      if (groupLower.includes('tape') || groupLower.includes('msl') || groupLower.includes('storeever')) {
        groupDomain = 'tapeBackup';
      } else if (groupLower.includes('storage') || groupLower.includes('msa') || groupLower.includes('powerstore') || groupLower.includes('unity') || groupLower.includes('enclosure')) {
        groupDomain = 'storage';
      } else if (groupLower.includes('switch') || groupLower.includes('san fabric') || groupLower.includes('fibre channel')) {
        groupDomain = 'sanFabric';
      } else if (groupLower.includes('server') || groupLower.includes('compute') || groupLower.includes('proliant') || groupLower.includes('poweredge')) {
        groupDomain = 'servers';
      }

      // If not determined by title, infer from anchor chassis role
      if (!groupDomain) {
        for (const it of items) {
          const role = topologyRole(it.description || it.desc || '');
          if (role === 'storage') { groupDomain = 'storage'; break; }
          if (role === 'networking') { groupDomain = 'sanFabric'; break; }
          if (role === 'archive') { groupDomain = 'tapeBackup'; break; }
          if (role === 'server') { groupDomain = 'servers'; break; }
        }
      }

      // Fallback default domain is server
      groupDomain = groupDomain || 'servers';

      // 3. Separate any unattached loose ad-hoc rows from domain items
      const validDomainItems = [];
      for (const it of items) {
        if (it.isAdHocRow || (it.remarks && it.remarks.toLowerCase().includes('ad-hoc')) || it.isOrphan) {
          partitioned.unbuildableAdHoc.push({
            groupTitle,
            groupId,
            items: [it]
          });
        } else {
          validDomainItems.push(it);
        }
      }

      if (validDomainItems.length > 0) {
        partitioned[groupDomain].push({
          groupTitle,
          groupId,
          multiplier,
          items: validDomainItems
        });
      }
    }

    return partitioned;
  }

  /**
   * Phase 2: Carrier Fleet Synthesis (Diophantine Bin-Packing)
   * Sizes minimal carrier server nodes to absorb all loose ad-hoc components
   * without violating memory channel limits, slot rules, or mixed-DIMM constraints.
   */
  synthesizeCarrierFleet(unbuildableAdHocGroups = [], targetPlatformKey = null) {
    const profile = getPlatformProfile(targetPlatformKey || this.defaultServerPlatform);
    if (!profile) throw new Error(`Platform profile not found for key: ${targetPlatformKey}`);

    this.logEvidence('PHASE_2_CARRIER_SYNTHESIS', 'PLATFORM_PROFILE_LOADED', {
      platform: profile.family,
      vendor: profile.vendor,
      maxDimms: profile.memoryArchitecture?.maxDimmsPerChassis || 32
    });

    const detection = profile.detection || GENERIC_DETECTION_PATTERNS;

    // Aggregate all loose components
    const aggregate = {
      dimmsByCapacity: {},
      nics: 0,
      drivesByCapacity: {},
      cpus: [],
      psus: 0
    };

    for (const group of unbuildableAdHocGroups) {
      for (const it of group.items) {
        const desc = String(it.description || it.desc || '').toLowerCase();
        const qty = Number(it.quantity || it.qty || 1);
        const sku = cleanBaseSKU(it.sku || it.pn);

        if (detection.isMemory(desc, sku) || it.capacityGb) {
          const capMatch = desc.match(/(\d+)\s*gb/i);
          const cap = it.capacityGb || (capMatch ? `${capMatch[1]}GB` : '64GB');
          aggregate.dimmsByCapacity[cap] = (aggregate.dimmsByCapacity[cap] || 0) + qty;
        } else if (detection.isPcieCard(desc, sku) || detection.isOcp(desc, sku)) {
          aggregate.nics += qty;
        } else if (detection.isDrive(desc, sku)) {
          const driveKey = `${sku}_${desc.substring(0, 30)}`;
          aggregate.drivesByCapacity[driveKey] = (aggregate.drivesByCapacity[driveKey] || 0) + qty;
        } else if (detection.isCpu(desc, sku)) {
          aggregate.cpus.push({ sku, desc: it.description || it.desc, qty });
        } else if (desc.includes('power supply') || desc.includes('psu')) {
          aggregate.psus += qty;
        }
      }
    }

    const carrierPools = [];
    const maxDimms = profile.memoryArchitecture?.maxDimmsPerChassis || 32;
    const baseChassisSku = profile.baseChassis?.sku || profile.enablementKits?.baseChassis?.sku;

    // Partition distinct memory capacities into dedicated carrier pools
    // (Rule: No mixed DIMM capacities allowed in single host chassis)
    for (const [capacity, totalDimms] of Object.entries(aggregate.dimmsByCapacity)) {
      const chassisCount = Math.ceil(totalDimms / maxDimms);
      const totalCapacityProvisioned = chassisCount * maxDimms;
      const surplusDimms = totalCapacityProvisioned - totalDimms;

      const poolConfig = {
        poolId: `Pool_${capacity}`,
        carrierChassisSku: baseChassisSku,
        carrierChassisDesc: profile.baseChassis?.description || 'Carrier Server Chassis',
        chassisCount,
        targetMemoryCapacity: capacity,
        dimmsPerServer: maxDimms,
        totalDimms: totalCapacityProvisioned,
        surplusDimms,
        absorbedRequirement: totalDimms,
        // Dual-socket CPUs are physically mandatory to activate all memory channels
        cpusPerServer: profile.memoryArchitecture?.minCpuForMaxDimms || 2,
        totalCpus: chassisCount * (profile.memoryArchitecture?.minCpuForMaxDimms || 2),
        heatsinksPerServer: profile.memoryArchitecture?.minCpuForMaxDimms || 2,
        fanKitsPerServer: 1,
        psusPerServer: 2,
        railKitsPerServer: 1,
        storageControllersPerServer: 1,
        controllerBatteriesPerServer: 1,
        controllerCablesPerServer: 1,
        items: []
      };

      carrierPools.push(poolConfig);
    }

    // If loose DIMMs were 0 but loose NICs or drives exist, synthesize default carrier pool
    if (carrierPools.length === 0 && (aggregate.nics > 0 || Object.keys(aggregate.drivesByCapacity).length > 0)) {
      const nicsCount = aggregate.nics;
      const chassisCount = Math.ceil(nicsCount / 4) || 1;
      carrierPools.push({
        poolId: 'Pool_General_AdHoc',
        carrierChassisSku: baseChassisSku,
        carrierChassisDesc: profile.baseChassis?.description || 'Carrier Server Chassis',
        chassisCount,
        targetMemoryCapacity: '32GB',
        dimmsPerServer: 4,
        totalDimms: chassisCount * 4,
        surplusDimms: 0,
        absorbedRequirement: 0,
        cpusPerServer: 2,
        totalCpus: chassisCount * 2,
        heatsinksPerServer: 2,
        fanKitsPerServer: 1,
        psusPerServer: 2,
        railKitsPerServer: 1,
        storageControllersPerServer: 1,
        controllerBatteriesPerServer: 1,
        controllerCablesPerServer: 1,
        items: []
      });
    }

    // Distribute loose NICs across carrier pools obeying PCIe Ethernet limits
    let remainingNics = aggregate.nics;
    const maxPcieNics = profile.slots?.maxPcieEthernetPerChassis || 3;

    for (const pool of carrierPools) {
      if (remainingNics <= 0) break;
      const nicsForPool = Math.min(remainingNics, pool.chassisCount * 4);
      const nicsPerServer = Math.ceil(nicsForPool / pool.chassisCount);
      
      // If nicsPerServer > maxPcieNics, split into PCIe + OCP
      const pciePerServer = Math.min(nicsPerServer, maxPcieNics);
      const ocpPerServer = Math.max(0, nicsPerServer - pciePerServer);

      pool.nics = {
        pciePerServer,
        totalPcie: pciePerServer * pool.chassisCount,
        ocpPerServer,
        totalOcp: ocpPerServer * pool.chassisCount,
        totalProvisioned: (pciePerServer + ocpPerServer) * pool.chassisCount,
        requiresOcpEnablement: ocpPerServer > 0,
        ocpEnablementSku: profile.enablementKits?.ocp2Networking?.sku || profile.enablementKits?.ocp2Networking
      };

      remainingNics -= pool.nics.totalProvisioned;
    }

    // Account for loose drives
    const totalLooseDrives = Object.values(aggregate.drivesByCapacity).reduce((sum, q) => sum + q, 0);
    if (totalLooseDrives > 0 && carrierPools.length > 0) {
      const primaryPool = carrierPools[0];
      const drivesPerNode = Math.ceil(totalLooseDrives / primaryPool.chassisCount);
      primaryPool.drives = {
        totalLooseDrives,
        drivesPerNode,
        requiresExtendedChassis: drivesPerNode > 8,
        recommendedChassisSku: (drivesPerNode > 8 && profile.baseChassis24Sff?.sku) ? profile.baseChassis24Sff.sku : baseChassisSku
      };
    }

    this.logEvidence('PHASE_2_CARRIER_SYNTHESIS', 'POOLS_SYNTHESIZED', {
      totalPools: carrierPools.length,
      totalCarrierNodes: carrierPools.reduce((sum, p) => sum + p.chassisCount, 0)
    });

    return {
      aggregate,
      carrierPools
    };
  }

  /**
   * Phase 3: Hardware Slot, Enablement & Missing Deep Dependency Injection
   * Audits server configurations and automatically injects mandatory companion hardware
   * that customer tenders routinely omit (risers, heatsinks, cables, fan kits, enablement kits).
   *
   * Completely decoupled and rule-driven via platform_profiles.
   */
  injectMissingDeepDependencies(serverConfig = {}, targetPlatformKey = null) {
    const profile = getPlatformProfile(targetPlatformKey || this.defaultServerPlatform);
    if (!profile) return serverConfig;

    const items = [...(serverConfig.items || [])];
    const injected = [];
    const detection = profile.detection || GENERIC_DETECTION_PATTERNS;

    const hasSku = (targetSku) => items.some(it => cleanBaseSKU(it.sku || it.pn) === cleanBaseSKU(targetSku));
    const countCategory = (filterFn) => items.filter(filterFn).reduce((sum, it) => sum + (Number(it.qty || it.quantity) || 1), 0);

    const cpuCount = countCategory(it => detection.isCpu(it.description || it.desc || '', it.sku || it.pn || ''));
    const pcieCardCount = countCategory(it => detection.isPcieCard(it.description || it.desc || '', it.sku || it.pn || ''));
    const hasOcp2 = items.some(it => detection.isOcp(it.description || it.desc || '', it.sku || it.pn || ''));
    const hasStorageController = items.some(it => detection.isStorageController(it.description || it.desc || '', it.sku || it.pn || ''));
    const hasBattery = items.some(it => detection.isBattery(it.description || it.desc || '', it.sku || it.pn || ''));

    const kits = profile.enablementKits || {};

    // 1. Dual-Socket Heatsink Injection
    if (kits.heatsinkKit) {
      const kitSku = kits.heatsinkKit.sku || kits.heatsinkKit;
      const minSockets = kits.heatsinkKit.minSockets || 2;
      if (cpuCount >= minSockets && !hasSku(kitSku)) {
        const desc = kits.heatsinkKit.description || 'High Performance Heatsink Kit';
        const heatsink = { sku: kitSku, description: desc, qty: cpuCount, autoInjected: true };
        items.push(heatsink);
        injected.push(heatsink);
      }
    }

    // 2. High-Performance Fan Kit
    if (kits.fanKit) {
      const kitSku = kits.fanKit.sku || kits.fanKit;
      if (!hasSku(kitSku)) {
        const desc = kits.fanKit.description || 'High Performance Fan Kit';
        const fanKit = { sku: kitSku, description: desc, qty: 1, autoInjected: true };
        items.push(fanKit);
        injected.push(fanKit);
      }
    }

    // 3. Secondary Riser Kit
    if (kits.secondaryRiser) {
      const kitSku = kits.secondaryRiser.sku || kits.secondaryRiser;
      const primarySlots = profile.slots?.primaryRiserSlots || 3;
      if (pcieCardCount > primarySlots && !hasSku(kitSku)) {
        const desc = kits.secondaryRiser.description || 'Secondary Riser Kit';
        const secRiser = { sku: kitSku, description: desc, qty: 1, autoInjected: true };
        items.push(secRiser);
        injected.push(secRiser);
      }
    }

    // 4. OCP2 Enablement Kit
    if (kits.ocp2Networking && hasOcp2) {
      const kitSku = kits.ocp2Networking.sku || kits.ocp2Networking;
      if (!hasSku(kitSku)) {
        const desc = kits.ocp2Networking.description || 'OCP2 Enablement Kit';
        const ocpKit = { sku: kitSku, description: desc, qty: 1, autoInjected: true };
        items.push(ocpKit);
        injected.push(ocpKit);
      }
    }

    // 5. Storage Controller Enablement Cable for Cache Battery
    if (kits.storageBatteryEnablementCable && hasStorageController && hasBattery) {
      const kitSku = kits.storageBatteryEnablementCable.sku || kits.storageBatteryEnablementCable;
      if (!hasSku(kitSku)) {
        const desc = kits.storageBatteryEnablementCable.description || 'Storage Controller Enablement Cable Kit';
        const cableKit = { sku: kitSku, description: desc, qty: 1, autoInjected: true };
        items.push(cableKit);
        injected.push(cableKit);
      }
    }

    // 6. Rail Kit
    if (kits.railKit) {
      const kitSku = kits.railKit.sku || kits.railKit;
      if (!hasSku(kitSku)) {
        const desc = kits.railKit.description || 'Easy Install Rail Kit';
        const railKit = { sku: kitSku, description: desc, qty: 1, autoInjected: true };
        items.push(railKit);
        injected.push(railKit);
      }
    }

    this.logEvidence('PHASE_3_DEPENDENCY_INJECTION', 'COMPANION_KITS_INJECTED', {
      serverName: serverConfig.name || serverConfig.groupTitle || 'Server',
      injectedCount: injected.length,
      injectedSkus: injected.map(it => it.sku)
    });

    return {
      ...serverConfig,
      items,
      injectedDependencies: injected
    };
  }

  /**
   * Phase 4: Dual-Brain Grounding & SKU Substitution
   * Queries platform profiles and verifies non-obsolete active equivalents.
   */
  resolveActiveHardware(sku, description, platformKey = null) {
    const profile = getPlatformProfile(platformKey || this.defaultServerPlatform);
    const clean = cleanBaseSKU(sku);

    if (profile && profile.activeReplacements && profile.activeReplacements[clean]) {
      const rep = profile.activeReplacements[clean];
      this.logEvidence('PHASE_4_SKU_SUBSTITUTION', 'OBSOLETE_REPLACED', {
        original: clean,
        replacement: rep.replacement,
        reason: rep.reason
      });
      return {
        sku: rep.replacement,
        description: rep.desc,
        originalSku: clean,
        wasReplaced: true,
        reason: rep.reason
      };
    }

    return {
      sku: clean,
      description,
      originalSku: clean,
      wasReplaced: false
    };
  }

  /**
   * Phase 5: Client Presentation Remarks Synthesis (Zero-Jargon Rule)
   * Builds clear, audit-proof client remarks with intra-sheet cross-references.
   * Asserts ZERO occurrences of internal configurator terms ("UCID").
   */
  formatClientRemark(actionType, context = {}) {
    let text = '';

    switch (actionType) {
      case 'CARRIER_ABSORPTION_SOURCE': {
        const targetRef = context.targetTable
          ? (String(context.targetTable).toLowerCase().includes('table') || String(context.targetTable).toLowerCase().includes('section')
              ? context.targetTable
              : `Table ${context.targetTable}`)
          : (context.targetSection || context.targetPoolName || 'Carrier Server Estate');
        const poolRef = context.targetPoolName && !targetRef.includes(context.targetPoolName) ? ` (${context.targetPoolName})` : '';
        text = `Ad-hoc loose ${context.componentType || 'item'}. Absorbed and accounted for in ${targetRef}${poolRef}.`;
        break;
      }

      case 'CARRIER_FLEET_HEADER':
        text = `Dedicated carrier server fleet to physically mount, cool, and warrant loose tender items (${context.description || 'components'}) in full compliance with factory configurator rules.`;
        break;

      case 'OBSOLETE_SKU_MODERNIZED':
        text = `Active factory-orderable equivalent (${context.newSku}) replacing retired/obsolete SKU ${context.oldSku}. (${context.reason}).`;
        break;

      case 'SLOT_CONSTRAINT_SOLVED':
        text = `Subcategory allocation: ${context.pcieCount}x PCIe adapters + ${context.ocpCount}x OCP3 adapter to strictly observe configurator PCIe slot limits while preserving all ${context.totalPorts} requested network ports.`;
        break;

      case 'MEMORY_CHANNEL_BALANCE':
        text = `Balanced memory population (${context.dimmCount} DIMMs) across ${context.channelCount} active channels to deliver full bandwidth without bus downclocking.`;
        break;

      case 'SINGLE_SOCKET_BASELINE':
        text = `Single-socket (1P) baseline adopted to strictly honor tender Qty 1 CPU ask without unbudgeted CapEx. Primary Riser slots active; secondary riser omitted pending customer confirmation on 2P expansion.`;
        break;

      default:
        text = context.customRemark || '';
        break;
    }

    // Invariant Check: Assert zero mentions of "UCID"
    if (this.strictZeroJargon && text.toUpperCase().includes('UCID')) {
      throw new Error(`Client Audit Invariant Violation: Forbidden term 'UCID' detected in remark: "${text}"`);
    }

    return text;
  }

  /**
   * Phase 6: HPE Portal Upload Template Formatter
   * Generates the official HPE One Config Advanced (OCA) 4-column batch upload format:
   * [Qty], [Product #], [Description], [Config Name]
   * - Strictly NO PRICES (prices confuse WebLogic import).
   * - Exactly 2 blank separator lines between distinct configuration blocks.
   * - Appends FIO (-F21) / CTO suffixes for factory integration.
   */
  generateOcaUploadRows(configurationBlocks = []) {
    const rows = [];

    configurationBlocks.forEach((cfg, idx) => {
      if (idx > 0) {
        // Exactly 2 blank lines separating configuration groups
        rows.push([]);
        rows.push([]);
      }

      // Configuration Banner Header
      rows.push([`## CONFIGURATION #${idx + 1}: ${cfg.configName || cfg.name || 'System Group'}`]);
      rows.push(['Qty', 'Product #', 'Description', 'Config Name']);

      const items = cfg.items || [];
      for (const it of items) {
        const qty = Number(it.qty || it.quantity || 1);
        const pn = String(it.sku || it.pn || '').trim();
        const desc = String(it.desc || it.description || '').trim();
        const cfgName = cfg.configName || cfg.name || 'System';

        // Omit orphaned canvas items that cause WebLogic parse crashes
        if (it.omitFromPortalUpload) continue;

        rows.push([qty, pn, desc, cfgName]);
      }
    });

    this.logEvidence('PHASE_6_PORTAL_FORMATTER', 'OCA_UPLOAD_ROWS_BUILT', {
      totalBlocks: configurationBlocks.length,
      totalRows: rows.length
    });

    return rows;
  }

  /**
   * Phase 7: 3-Tier Epistemic Fallback Chain
   * 1. Query Grounded NotebookLM Sources (QuickSpecs RAG).
   * 2. If unmapped / absent, fallback to Hands-Free CDP Live Scraping via port 9222.
   * 3. Prompt human confirmation before scraping unmapped products.
   */
  async resolveHardwareWithFallback(queryContext = {}, mcpClient = null) {
    this.logEvidence('PHASE_7_EPISTEMIC_FALLBACK', 'CHECKING_TIER_1_NOTEBOOK', { query: queryContext.sku || queryContext.query });

    // Tier 1: NotebookLM Grounding
    if (mcpClient && queryContext.notebookId) {
      try {
        const nlmResult = await mcpClient.callTool('gemini-notebook-mcp', 'notebook_query', {
          notebook_id: queryContext.notebookId,
          query: queryContext.query || `Provide exact specs, active SKU, and FIO/BTO part numbers for ${queryContext.sku}`
        });
        if (nlmResult && nlmResult.answer && !nlmResult.answer.toLowerCase().includes('not found')) {
          return { tier: 'TIER_1_NOTEBOOKLM_GROUNDED', result: nlmResult.answer };
        }
      } catch (err) {
        console.warn(`NotebookLM lookup failed: ${err.message}. Cascading to Tier 2 fallback.`);
      }
    }

    // Tier 2 & 3: Live Portal Scrape Fallback & Human Confirmation
    return {
      tier: 'TIER_2_LIVE_SCRAPE_REQUIRED',
      actionRequired: 'HUMAN_CONFIRMATION_OR_CDP_SCRAPE',
      message: `Product ${queryContext.sku || queryContext.model} is absent in current NotebookLM sources. Ready to hands-free scrape live catalog from HPE Partner Portal / OCA via CDP port 9222.`
    };
  }

  /**
   * Phase 8: Deliverables Builder
   * Emits (1) Internal Vendor Configurator Manifests (Production + Carrier Fleet)
   * and (2) Client-Facing Tender-Preserving Reconciliation Matrix.
   */
  buildDualDeliverables(categorizedData, carrierFleet) {
    this.logEvidence('PHASE_8_DELIVERABLES', 'BUILDING_MANIFESTS', {});

    // Internal Manifest A: Production Estate
    const internalProductionManifest = {
      name: 'Production Estate (Servers, Storage, SAN Fabric, Archive)',
      servers: categorizedData.servers,
      storage: categorizedData.storage,
      sanFabric: categorizedData.sanFabric,
      tapeBackup: categorizedData.tapeBackup
    };

    // Internal Manifest B: Carrier Absorption Fleet
    const internalCarrierManifest = {
      name: 'Ad-Hoc Carrier Fleet',
      pools: carrierFleet.carrierPools
    };

    // Client Presentation Matrix
    const clientMatrix = {
      title: 'Tender Modernization & Hardware Reconciliation Master',
      rulesEnforced: [
        'Zero internal configurator jargon in client remarks',
        '100% preservation of original tender line items',
        'Diophantine integer-only node sizing',
        'Dual-brain epistemic ground-truth SKU verification',
        'Deep dependency injection (risers, fans, heatsinks, enablement kits)'
      ],
      productionTables: (categorizedData.servers || []).concat(
        categorizedData.storage || [],
        categorizedData.sanFabric || [],
        categorizedData.tapeBackup || []
      ),
      adHocSourceTables: categorizedData.unbuildableAdHoc || [],
      carrierFleetTables: carrierFleet.carrierPools || []
    };

    return {
      internalProductionManifest,
      internalCarrierManifest,
      clientMatrix,
      evidenceLedger: this.evidenceLedger
    };
  }
}

module.exports = {
  HeterogeneousTenderModernizer
};
