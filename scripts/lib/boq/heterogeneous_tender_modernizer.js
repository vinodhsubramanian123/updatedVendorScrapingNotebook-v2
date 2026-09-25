'use strict';

const { getPlatformProfile, GENERIC_DETECTION_PATTERNS } = require('../rules/platform_profiles');
const { topologyRole } = require('./solution_topology');

function positiveInteger(value, label) {
  const number = typeof value === 'string' && value.trim() ? Number(value) : value;
  if (!Number.isSafeInteger(number) || number < 1) throw new Error(`${label} must be a positive integer.`);
  return number;
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

  synthesizeCarrierFleet(groups = [], targetPlatformKey = null) {
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
    const memory = new Map();
    for (const group of groups) {
      const multiplier = positiveInteger(group.multiplier ?? group.chassisCount ?? 1, 'Group multiplier');
      for (const item of group.items || []) {
        const quantity = positiveInteger(item.quantity ?? item.qty, 'Item quantity') * multiplier;
        positiveInteger(quantity, 'Extended quantity');
        const description = item.description || item.desc || '';
        const sku = item.sku || item.pn || '';
        const capacity = Number(item.capacityGb ?? description.match(/(\d+)\s*gb/i)?.[1]);
        if (!GENERIC_DETECTION_PATTERNS.isMemory(description, sku) || !Number.isFinite(capacity) || capacity <= 0) {
          result.unresolvedItems.push({ ...structuredClone(item), quantity, sourceGroup: group.groupId || group.title,
            reason: 'Requires product-specific allocation; no automatic PCIe-to-OCP substitution or drive/CPU absorption.' });
          continue;
        }
        // Keep identities separate: equal capacities alone do not prove compatibility.
        const key = `${sku}|${description}|${capacity}`;
        const entry = memory.get(key) || { capacity, quantity: 0, sources: [], sku };
        entry.quantity += quantity;
        positiveInteger(entry.quantity, 'Memory total');
        entry.sources.push({ groupId: group.groupId || group.title, quantity, sku });
        memory.set(key, entry);
      }
    }
    for (const entry of memory.values()) {
      const chassisCount = Math.ceil(entry.quantity / maxDimms);
      const totalDimms = positiveInteger(chassisCount * maxDimms, 'Provisioned DIMMs');
      result.carrierPools.push({
        poolId: `Pool_${result.carrierPools.length + 1}`, status: 'CAPACITY_ESTIMATE_ONLY',
        carrierChassisSku: base.sku, carrierChassisDesc: base.description,
        chassisCount, dimmsPerServer: maxDimms, targetMemoryCapacity: `${entry.capacity}GB`,
        absorbedRequirement: entry.quantity, totalDimms, surplusDimms: totalDimms - entry.quantity,
        cpusPerServer: cpus, totalCpus: chassisCount * cpus, sourceLinks: entry.sources, items: [],
        reason: 'Capacity estimate uses maximum population; compatibility, minimal-cost population and added quantities require evaluation.'
      });
    }
    this.logEvidence('CARRIER_PLANNING', 'CAPACITY_ESTIMATED', { pools: result.carrierPools.length, unresolved: result.unresolvedItems.length });
    return { ...result, status: 'DRAFT_ALLOCATION_REVIEW_REQUIRED' };
  }

  injectMissingDeepDependencies(serverConfig = {}, targetPlatformKey = null) {
    // Profile kit inventories have no conditional compatibility receipts. Never
    // inject every fan/rail/OCP kit merely because it appears in that inventory.
    return { ...structuredClone(serverConfig), injectedDependencies: [], status: 'NOT_EVALUATED',
      targetPlatform: targetPlatformKey || this.defaultServerPlatform,
      reason: 'Run the owned candidate through eval_boq and its scoped dependency rules.' };
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
    return {
      status: 'DRAFT', portalValidationStatus: 'PORTAL VALIDATION PENDING',
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
