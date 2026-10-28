'use strict';

const { getPlatformProfile, GENERIC_DETECTION_PATTERNS } = require('../rules/platform_profiles');
const { topologyRole } = require('./solution_topology');

function positiveInteger(value, label) {
  const number = typeof value === 'string' && value.trim() ? Number(value) : value;
  if (!Number.isSafeInteger(number) || number < 1) throw new Error(`${label} must be a positive integer.`);
  return number;
}

function _allocateMemoryPools(memory, base, maxDimms, cpus, carrierPools) {
  for (const entry of memory.values()) {
    const chassisCount = Math.ceil(entry.quantity / maxDimms);
    const totalDimms = positiveInteger(chassisCount * maxDimms, 'Provisioned DIMMs');
    carrierPools.push({
      poolId: `Pool_${carrierPools.length + 1}`,
      poolType: 'MEMORY_CARRIER',
      status: 'CAPACITY_ESTIMATE_ONLY',
      carrierChassisSku: base.sku,
      carrierChassisDesc: base.description,
      chassisCount,
      dimmsPerServer: maxDimms,
      targetMemoryCapacity: `${entry.capacity}GB`,
      absorbedRequirement: entry.quantity,
      totalDimms,
      surplusDimms: totalDimms - entry.quantity,
      cpusPerServer: cpus,
      totalCpus: chassisCount * cpus,
      sourceLinks: entry.sources,
      items: [],
      reason: 'Capacity estimate uses maximum population; compatibility, minimal-cost population and added quantities require evaluation.'
    });
  }
}

/**
 * Detect drive physical form factor from description and SKU nomenclature.
 * @param {string} desc
 * @param {string} sku
 * @returns {'edsff'|'lff'|'sff'}
 */
function detectDriveFormFactor(desc = '', sku = '') {
  const d = String(desc || '').toLowerCase();
  const s = String(sku || '').toUpperCase();
  if (/\b(edsff|e3\.s|e1\.s|e3\.l)\b/i.test(d) || /\b(edsff)\b/i.test(s)) {
    return 'edsff';
  }
  if (/\b(lff|3\.5\s*in|3\.5"|3\.5-inch|low profile carrier|lpc)\b/i.test(d)) {
    return 'lff';
  }
  if (/\b(sff|2\.5\s*in|2\.5"|2\.5-inch|basic carrier|smart carrier|u\.3|u\.2|bc\b|sc\b)\b/i.test(d)) {
    return 'sff';
  }
  return 'sff';
}

/**
 * Resolve storage architecture and progressive cage limits for platform profile.
 * @param {object} profile
 * @param {string} targetPlatformKey
 * @returns {object}
 */
function resolveStorageArchitecture(profile, targetPlatformKey) {
  if (profile?.storageArchitecture) return profile.storageArchitecture;

  const key = String(targetPlatformKey || profile?.modelFamily || profile?.model || profile?.family || '').toUpperCase();
  const isGen12 = profile?.generation === 'Gen12' || key.includes('GEN12') || key.includes('G12');
  const isDl380a = key.includes('DL380A');
  const is1U = profile?.formFactor === '1U Rack' || key.includes('DL360') || key.includes('DL145');

  return {
    sff: {
      baseBays: 8,
      baysPerCage: 8,
      maxCages: is1U ? 1 : 3,
      maxFrontBays: is1U ? 8 : 24,
      cageSku: isDl380a ? 'P74710-B21' : (isGen12 ? 'P75741-B21' : 'P48813-B21'),
      cageDesc: isDl380a
        ? 'HPE ProLiant DL380a Gen12 4SFF Front Drive Cage Kit'
        : (isGen12 ? 'HPE ProLiant DL380 Gen12 8SFF Drive Cage Kit' : 'HPE ProLiant DL380 Gen11 2U 8SFF x1 Tri-Mode U.3 Drive Cage Kit')
    },
    lff: {
      baseBays: 4,
      baysPerCage: 4,
      maxCages: is1U ? 1 : 3,
      maxFrontBays: is1U ? 4 : 12,
      cageSku: isGen12 ? 'P75743-B21' : 'P48809-B21',
      cageDesc: isGen12
        ? 'HPE ProLiant DL380 Gen12 4LFF Drive Cage Kit'
        : 'HPE ProLiant DL380 Gen11 4LFF SAS/SATA 12G LP Midplane Drive Cage Kit'
    },
    edsff: {
      baseBays: isDl380a ? 4 : 12,
      baysPerCage: isDl380a ? 4 : 12,
      maxCages: isDl380a ? 2 : 3,
      maxFrontBays: isDl380a ? 8 : 36,
      cageSku: isDl380a ? 'P74712-B21' : (isGen12 ? 'P74712-B21' : 'P48808-B21'),
      cageDesc: isDl380a
        ? 'HPE ProLiant DL380a Gen12 4EDSFF Front Drive Cage Kit'
        : (isGen12 ? 'HPE ProLiant Compute DL380 Gen12 12EDSFF Drive Cage Kit' : 'HPE ProLiant DL380 Gen11 12EDSFF Drive Cage Kit')
    },
    enablement: {
      directControllerLimit: 8,
      expanderSku: isGen12 ? 'P55806-B21' : 'P48835-B21',
      expanderDesc: isGen12 ? 'HPE ProLiant Tri-Mode Switch Card' : 'HPE ProLiant 24G SAS Expander Card with Cables',
      controllerCableSku: isDl380a ? 'P76700-B21' : (isGen12 ? 'P76456-B21' : 'P48918-B21'),
      controllerCableDesc: isDl380a
        ? 'HPE ProLiant Compute DL380a Gen12 NVMe to Tri-Mode PCIe FIO Cable Kit'
        : (isGen12 ? 'HPE ProLiant DL380 Gen12 Controller Cable Kit' : 'HPE ProLiant Storage Controller Enablement Cable Kit'),
      defaultStorageController: {
        sku: isGen12 ? 'P76458-B21' : 'P43022-B21',
        desc: isGen12 ? 'HPE MR408i-o Gen12 Storage Controller' : 'HPE MR408i-o Gen11 x8 Lanes 4GB Flash Tri-Mode Controller'
      },
      smartStorageBattery: {
        sku: isDl380a ? 'P01367-B21' : 'P01366-B21',
        desc: isDl380a
          ? 'HPE 96W Smart Storage Lithium-ion Battery with 260mm Cable Kit'
          : 'HPE 96W Smart Storage Battery (up to 20 Devices) with 145mm Cable Kit'
      }
    }
  };
}

/**
 * Build physical hardware items for storage carrier pool.
 */
function _buildStorageEnablementItems(chassisCount, drivesPerServer, additionalCagesPerServer, ff, arch, enablement, base, entry, options) {
  const items = [];
  const enable = enablement || arch?.enablement || {};
  const directLimit = Number.isInteger(enable.directControllerLimit) ? enable.directControllerLimit : 8;
  const controller = enable.defaultStorageController || {
    sku: 'P43022-B21',
    desc: 'HPE MR408i-o Gen11 x8 Lanes 4GB Flash Tri-Mode Controller'
  };
  const expanderSku = enable.expanderSku || 'P48835-B21';
  const expanderDesc = enable.expanderDesc || 'HPE ProLiant 24G SAS Expander Card with Cables';
  const cableSku = enable.controllerCableSku || 'P48918-B21';
  const cableDesc = enable.controllerCableDesc || 'HPE ProLiant Storage Controller Enablement Cable Kit';
  const battery = enable.smartStorageBattery || {
    sku: 'P01366-B21',
    desc: 'HPE 96W Smart Storage Battery (up to 20 Devices) with 145mm Cable Kit'
  };

  items.push({
    sku: base.sku,
    description: base.description,
    quantity: 1,
    totalQuantity: chassisCount,
    role: 'Chassis',
    policyMandated: true,
    reason: 'Carrier chassis hosting storage drive pool'
  });

  if (additionalCagesPerServer > 0) {
    items.push({
      sku: arch.cageSku,
      description: arch.cageDesc,
      quantity: additionalCagesPerServer,
      totalQuantity: positiveInteger(additionalCagesPerServer * chassisCount, 'Total cage kits'),
      role: 'Drive Cage',
      category: 'Drive Enclosures / Drives',
      policyMandated: true,
      reason: `Progressive drive cage expansion: added ${additionalCagesPerServer}x ${ff.toUpperCase()} cage(s)`
    });
  }

  if (!options?.omitStorageController) {
    items.push({
      sku: controller.sku,
      description: controller.desc,
      quantity: 1,
      totalQuantity: chassisCount,
      role: 'Storage Controller',
      category: 'Storage Controllers',
      policyMandated: true,
      reason: 'Tri-Mode storage controller for drive cage pool'
    });
  }

  const needsExpander = drivesPerServer > directLimit;
  if (needsExpander) {
    items.push({
      sku: expanderSku,
      description: expanderDesc,
      quantity: 1,
      totalQuantity: chassisCount,
      role: 'Storage Expander',
      category: 'Storage Controllers',
      policyMandated: true,
      reason: `Expander card required: ${drivesPerServer} drives exceed direct controller capacity (${directLimit})`
    });
  }

  items.push({
    sku: cableSku,
    description: cableDesc,
    quantity: 1,
    totalQuantity: chassisCount,
    role: 'Storage Cabling',
    category: 'Internal Cables',
    policyMandated: true,
    reason: 'Controller-to-backplane enablement cable kit'
  });

  items.push({
    sku: battery.sku,
    description: battery.desc,
    quantity: 1,
    totalQuantity: chassisCount,
    role: 'Storage Battery',
    category: 'Power and Cooling',
    policyMandated: true,
    reason: 'Write-back cache power protection battery'
  });

  items.push({
    sku: entry.sku,
    description: entry.description,
    quantity: drivesPerServer,
    totalQuantity: entry.quantity,
    role: 'Drive Cage / Drive',
    category: 'Drive Enclosures / Drives',
    policyMandated: false,
    reason: 'Customer tender storage drive housed in carrier'
  });

  return items;
}

function _allocateStoragePools(storage, base, profile, targetPlatformKey, carrierPools, options = {}) {
  const isProgressive = Boolean(
    options.progressiveCageExpansion ??
    options.packDriveCages ??
    options.expandDriveCages ??
    false
  );

  const storageArch = resolveStorageArchitecture(profile, targetPlatformKey);

  for (const entry of storage.values()) {
    const ff = detectDriveFormFactor(entry.description, entry.sku);
    const arch = storageArch[ff] || storageArch.sff;

    if (!isProgressive) {
      const baseDriveBays = profile.storageArchitecture?.baseDriveBays || profile.slots?.baseDriveBays || arch.baseBays || 8;
      const chassisCount = Math.ceil(entry.quantity / baseDriveBays);
      const totalBays = positiveInteger(chassisCount * baseDriveBays, 'Provisioned drive bays');
      carrierPools.push({
        poolId: `Pool_${carrierPools.length + 1}`,
        poolType: 'STORAGE_CARRIER',
        status: 'CAPACITY_ESTIMATE_ONLY',
        carrierChassisSku: base.sku,
        carrierChassisDesc: base.description,
        formFactor: ff,
        chassisCount,
        baysPerServer: baseDriveBays,
        targetDriveType: entry.description,
        absorbedRequirement: entry.quantity,
        totalBays,
        surplusBays: totalBays - entry.quantity,
        sourceLinks: entry.sources,
        items: [],
        reason: 'Drive capacity estimate uses base chassis bays; controllers, expanders, cables and drive enablement kits require evaluation.'
      });
      continue;
    }

    const maxServerBays = arch.maxFrontBays;
    const chassisCount = Math.max(1, Math.ceil(entry.quantity / maxServerBays));
    const drivesPerServer = Math.ceil(entry.quantity / chassisCount);

    let additionalCagesPerServer = 0;
    let baysPerServer = arch.baseBays;

    if (drivesPerServer > arch.baseBays) {
      const extraDrives = drivesPerServer - arch.baseBays;
      additionalCagesPerServer = Math.min(arch.maxCages - 1, Math.ceil(extraDrives / arch.baysPerCage));
      baysPerServer = arch.baseBays + (additionalCagesPerServer * arch.baysPerCage);
    }

    const totalBays = positiveInteger(chassisCount * baysPerServer, 'Provisioned drive bays');
    const surplusBays = totalBays - entry.quantity;
    const needsExpander = drivesPerServer > storageArch.enablement.directControllerLimit;

    const items = _buildStorageEnablementItems(
      chassisCount,
      drivesPerServer,
      additionalCagesPerServer,
      ff,
      arch,
      storageArch.enablement,
      base,
      entry,
      options
    );

    carrierPools.push({
      poolId: `Pool_${carrierPools.length + 1}`,
      poolType: 'STORAGE_CARRIER',
      status: 'EXPANDED_CARRIER_PACKED',
      carrierChassisSku: base.sku,
      carrierChassisDesc: base.description,
      formFactor: ff,
      chassisCount,
      serverCount: chassisCount,
      multiplier: chassisCount,
      drivesPerServer,
      baysPerServer,
      baseBays: arch.baseBays,
      additionalCagesPerServer,
      driveCageSku: additionalCagesPerServer > 0 ? arch.cageSku : null,
      needsExpander,
      expanderSku: needsExpander ? storageArch.enablement.expanderSku : null,
      cableKitSku: storageArch.enablement.controllerCableSku,
      targetDriveType: entry.description,
      absorbedRequirement: entry.quantity,
      totalBays,
      surplusBays,
      sourceLinks: entry.sources,
      items,
      reason: `Progressive cage expansion packed ${entry.quantity} ${ff.toUpperCase()} drives into ${chassisCount} server(s) (${baysPerServer} bays/srv) with ${additionalCagesPerServer} extra cage kit(s) and backplane enablement hardware.`
    });
  }
}

function _allocatePciePools(pcie, base, slotsPerServer, carrierPools) {
  for (const entry of pcie.values()) {
    const chassisCount = Math.ceil(entry.quantity / slotsPerServer);
    const totalSlots = positiveInteger(chassisCount * slotsPerServer, 'Provisioned PCIe slots');
    carrierPools.push({
      poolId: `Pool_${carrierPools.length + 1}`,
      poolType: 'PCIE_CARRIER',
      status: 'CAPACITY_ESTIMATE_ONLY',
      carrierChassisSku: base.sku,
      carrierChassisDesc: base.description,
      chassisCount,
      slotsPerServer,
      targetAdapterType: entry.description,
      absorbedRequirement: entry.quantity,
      totalSlots,
      surplusSlots: totalSlots - entry.quantity,
      sourceLinks: entry.sources,
      items: [],
      reason: 'PCIe adapter capacity estimate uses primary riser slots; secondary/tertiary risers, PCIe lane bifurcation and cabling require evaluation.'
    });
  }
}

class HeterogeneousTenderModernizer {
  constructor(options = {}) {
    this.defaultServerPlatform = options.defaultServerPlatform || null;
    this.strictZeroJargon = options.strictZeroJargon !== false;
    this.evidenceLedger = [];
  }

  logEvidence(phase, action, details) {
    this.evidenceLedger.push({ timestamp: new Date().toISOString(), phase, action, details });
  }

  categorizeTenderItems(input = []) {
    let groups;
    if (Array.isArray(input)) {
      groups = input.some(value => Array.isArray(value.items)) ? input : [{ items: input }];
    } else if (Array.isArray(input?.tables)) {
      groups = input.tables;
    } else {
      groups = Object.entries(input?.sheets || input || {}).map(([title, items]) => ({ title, items }));
    }
    const partitioned = { servers: [], storage: [], sanFabric: [], tapeBackup: [], unbuildableAdHoc: [], unresolved: [] };
    const domains = { server: 'servers', storage: 'storage', networking: 'sanFabric', archive: 'tapeBackup' };
    groups.forEach((group, index) => {
      if (!Array.isArray(group.items)) throw new Error('Each tender group requires an items array.');
      const base = {
        ...structuredClone(group),
        groupTitle: group.title || group.name || group.sheetName || `Group ${index + 1}`,
        groupId: group.id ?? group.tableId ?? group.groupId ?? `G${index + 1}`,
        multiplier: positiveInteger(group.multiplier ?? group.chassisCount ?? 1, 'Group multiplier')
      };
      for (const item of base.items) positiveInteger(item.quantity ?? item.qty, 'Item quantity');
      // Spares remain spares; only an explicit loose-group/row marker authorizes carrier planning.
      if (group.isAdHocTable || group.isAdHocGroup) {
        partitioned.unbuildableAdHoc.push(base);
        return;
      }
      const loose = base.items.filter(item => item.isAdHocRow || item.isOrphan);
      const owned = base.items.filter(item => !item.isAdHocRow && !item.isOrphan);
      if (loose.length) partitioned.unbuildableAdHoc.push({ ...base, items: loose });
      if (!owned.length) return;
      const roles = [...new Set(owned.map(item => topologyRole(item.description || item.desc || '')).filter(Boolean))];
      const domain = roles.length === 1 ? domains[roles[0]] : null;
      partitioned[domain || 'unresolved'].push({ ...base, items: owned,
        ...(domain ? {} : { status: 'NOT_EVALUATED', reason: 'Exact owned component domains and containment are required.' }) });
    });
    this.logEvidence('INGESTION', 'DOMAINS_PARTITIONED', { groups: groups.length });
    return partitioned;
  }

  synthesizeCarrierFleet(groups = [], targetPlatformKey = null, options = {}) {
    const sourceGroups = structuredClone(groups);
    const profile = getPlatformProfile(targetPlatformKey || this.defaultServerPlatform);
    const result = { status: 'NOT_EVALUATED', carrierPools: [], sourceGroups, unresolvedItems: [],
      portalValidationStatus: 'PORTAL VALIDATION PENDING' };
    if (!groups.length) return { ...result, status: 'NOT_APPLICABLE' };
    if (!profile || profile.domain !== 'server') return { ...result, reason: 'SERVER_PLATFORM_PROFILE_REQUIRED', unresolvedItems: sourceGroups };
    const maxDimms = profile.memoryArchitecture?.maxDimmsPerChassis;
    const cpus = profile.memoryArchitecture?.minCpuForMaxDimms;
    const base = profile.baseChassis;
    if (!Number.isSafeInteger(maxDimms) || maxDimms < 1 || !Number.isSafeInteger(cpus) || cpus < 1 || !base?.sku) {
      return { ...result, reason: 'MEMORY_CAPACITY_PROFILE_REQUIRED', unresolvedItems: sourceGroups };
    }

    const allocateStorage = Boolean(options.allocateAllCarriers || options.includeStorageCages || options.allocateStorageCarriers);
    const allocatePcie = Boolean(options.allocateAllCarriers || options.includePcieAdapters || options.allocatePcieCarriers);

    const memory = new Map();
    const storage = new Map();
    const pcie = new Map();

    for (const group of groups) {
      const multiplier = positiveInteger(group.multiplier ?? group.chassisCount ?? 1, 'Group multiplier');
      for (const item of group.items || []) {
        const quantity = positiveInteger(item.quantity ?? item.qty, 'Item quantity') * multiplier;
        positiveInteger(quantity, 'Extended quantity');
        const description = item.description || item.desc || '';
        const sku = item.sku || item.pn || '';

        if (GENERIC_DETECTION_PATTERNS.isMemory(description, sku)) {
          const capacity = Number(item.capacityGb ?? description.match(/(\d+)\s*gb/i)?.[1]);
          if (Number.isFinite(capacity) && capacity > 0) {
            const key = `${sku}|${description}|${capacity}`;
            const entry = memory.get(key) || { capacity, quantity: 0, sources: [], sku };
            entry.quantity += quantity;
            positiveInteger(entry.quantity, 'Memory total');
            entry.sources.push({ groupId: group.groupId || group.title, quantity, sku });
            memory.set(key, entry);
            continue;
          }
        }

        if (allocateStorage && GENERIC_DETECTION_PATTERNS.isDrive(description, sku)) {
          const key = `${sku}|${description}`;
          const entry = storage.get(key) || { description, quantity: 0, sources: [], sku };
          entry.quantity += quantity;
          positiveInteger(entry.quantity, 'Storage drive total');
          entry.sources.push({ groupId: group.groupId || group.title, quantity, sku });
          storage.set(key, entry);
          continue;
        }

        if (allocatePcie && GENERIC_DETECTION_PATTERNS.isPcieCard(description, sku)) {
          const key = `${sku}|${description}`;
          const entry = pcie.get(key) || { description, quantity: 0, sources: [], sku };
          entry.quantity += quantity;
          positiveInteger(entry.quantity, 'PCIe card total');
          entry.sources.push({ groupId: group.groupId || group.title, quantity, sku });
          pcie.set(key, entry);
          continue;
        }

        result.unresolvedItems.push({ ...structuredClone(item), quantity, sourceGroup: group.groupId || group.title,
          reason: 'Requires product-specific allocation; no automatic PCIe-to-OCP substitution or drive/CPU absorption.' });
      }
    }

    _allocateMemoryPools(memory, base, maxDimms, cpus, result.carrierPools);
    if (allocateStorage && storage.size > 0) {
      _allocateStoragePools(storage, base, profile, targetPlatformKey || this.defaultServerPlatform, result.carrierPools, options);
    }
    if (allocatePcie && pcie.size > 0) {
      const slotsPerServer = profile.slots?.primaryRiserSlots || 3;
      _allocatePciePools(pcie, base, slotsPerServer, result.carrierPools);
    }

    this.logEvidence('CARRIER_PLANNING', 'CAPACITY_ESTIMATED', { pools: result.carrierPools.length, unresolved: result.unresolvedItems.length });
    return { ...result, status: 'DRAFT_ALLOCATION_REVIEW_REQUIRED' };
  }

  injectMissingDeepDependencies(serverConfig = {}, targetPlatformKey = null, options = {}) {
    // Profile kit inventories have no conditional compatibility receipts. Never
    // inject every fan/rail/OCP kit merely because it appears in that inventory.
    const result = { ...structuredClone(serverConfig), injectedDependencies: [], status: 'NOT_EVALUATED',
      targetPlatform: targetPlatformKey || this.defaultServerPlatform,
      reason: 'Run the owned candidate through eval_boq and its scoped dependency rules.' };
    if (options.inferBaseDependencies) {
      const profile = getPlatformProfile(targetPlatformKey || this.defaultServerPlatform);
      const items = serverConfig.items || [];
      const hasSku = s => items.some(it => (it.sku || it.pn) === s);
      const suggested = [];
      if (profile?.enablementKits?.railKit && !hasSku(profile.enablementKits.railKit.sku)) {
        suggested.push({ ...profile.enablementKits.railKit, quantity: 1, type: 'RAIL_KIT', reason: 'Recommended baseline chassis rail kit' });
      }
      if (profile?.defaultSupportPolicy?.hardwareSupportSku && !hasSku(profile.defaultSupportPolicy.hardwareSupportSku)) {
        suggested.push({ sku: profile.defaultSupportPolicy.hardwareSupportSku, description: 'HPE Pointnext Tech Care Basic Service 3Y', quantity: 1, type: 'SUPPORT_POLICY', reason: 'Baseline hardware support warranty' });
      }
      result.suggestedDependencies = suggested;
    }
    return result;
  }

  resolveActiveHardware(sku, description, platformKey = null) {
    const profile = getPlatformProfile(platformKey || this.defaultServerPlatform);
    const key = String(sku || '').trim().toUpperCase();
    return { sku: key, description, originalSku: key, wasReplaced: false,
      candidateReplacement: profile?.activeReplacements?.[key] || null,
      status: 'CURRENT_ORDERABILITY_EVIDENCE_REQUIRED' };
  }

  formatClientRemark(actionType, context = {}) {
    const { formatCommercialRemark } = require('./commercial_remarks');
    const text = formatCommercialRemark(actionType, context);
    if (this.strictZeroJargon && /\bucid\b|dummy server|\bhack\b/i.test(text)) throw new Error('Internal portal jargon in client remark.');
    return text;
  }

  generateOcaUploadRows(blocks = []) {
    // This is the four-column batch dialect only, not the seven-column Partner
    // Portal reconciliation workbook. The caller must select the intended dialect.
    const rows = [['Qty', 'Product #', 'Description', 'Config Name']];
    blocks.forEach((block, index) => {
      if (!block.configName && !block.name) throw new Error('Configuration name required.');
      if (!Array.isArray(block.items) || !block.items.length) throw new Error('Configuration items required.');
      positiveInteger(block.multiplier ?? 1, 'Configuration multiplier');
      if ((block.multiplier ?? 1) !== 1) throw new Error('Expand repeated configuration blocks explicitly for the four-column dialect.');
      if (index) rows.push([], []);
      for (const item of block.items) {
        if (item.omitFromPortalUpload) throw new Error('Resolve omitted rows before export; the exporter cannot silently drop customer items.');
        const quantity = positiveInteger(item.qty ?? item.quantity, 'Portal quantity');
        const sku = String(item.sku || item.pn || '').trim();
        if (!sku || /\s/.test(sku)) throw new Error('Portal SKU must be nonempty and contain no whitespace.');
        rows.push([quantity, sku, String(item.description || item.desc || '').trim(), block.configName || block.name]);
      }
    });
    return rows;
  }

  async resolveHardwareWithFallback(queryContext = {}) {
    // A prose notebook answer is not a structured, manifest-bound verdict.
    return { tier: 'NOT_EVALUATED', actionRequired: 'STRUCTURED_SOURCE_VALIDATION_REQUIRED',
      queryContext: structuredClone(queryContext),
      message: 'Use validateSolutionWithEphemeralSource with the exact product notebook and complete candidate manifest; vendor acceptance remains separate.' };
  }

  buildDualDeliverables(categorizedData, carrierFleet) {
    const productionTables = ['servers', 'storage', 'sanFabric', 'tapeBackup'].flatMap(key => categorizedData[key] || []);

    let conservationLedger = null;
    try {
      const { buildUniversalQuantityConservationLedger } = require('./quantity_conservation.js');
      const rawCustomerItems = (carrierFleet.sourceGroups || []).flatMap(g => {
        const mult = g.multiplier || 1;
        return (g.items || []).map(it => ({
          ...it,
          quantity: (it.quantity || it.qty || 1) * mult
        }));
      });
      if (rawCustomerItems.length > 0 && carrierFleet.carrierPools?.length > 0) {
        conservationLedger = buildUniversalQuantityConservationLedger(rawCustomerItems, carrierFleet.carrierPools);
        this.logEvidence('CONSERVATION', 'TENDER_QUANTITY_AUDITED', {
          isFullyConserved: conservationLedger.isFullyConserved,
          discrepancies: conservationLedger.totalDiscrepancies
        });
      }
    } catch (err) {
      this.logEvidence('CONSERVATION', 'AUDIT_ERROR', { error: err.message });
    }

    return {
      status: 'DRAFT', portalValidationStatus: 'PORTAL VALIDATION PENDING',
      isQuantityConserved: conservationLedger ? conservationLedger.isFullyConserved : true,
      quantityConservationLedger: conservationLedger,
      internalProductionManifest: structuredClone(categorizedData),
      internalCarrierManifest: structuredClone(carrierFleet),
      clientMatrix: { title: 'Tender Reconciliation Draft', rulesEnforced: ['Source rows retained', 'Positive integer quantities'],
        productionTables: structuredClone(productionTables),
        unresolvedTables: structuredClone(categorizedData.unresolved || []),
        adHocSourceTables: structuredClone(categorizedData.unbuildableAdHoc || []),
        carrierFleetTables: structuredClone(carrierFleet.carrierPools || []) },
      evidenceLedger: structuredClone(this.evidenceLedger)
    };
  }
}

module.exports = { HeterogeneousTenderModernizer };
