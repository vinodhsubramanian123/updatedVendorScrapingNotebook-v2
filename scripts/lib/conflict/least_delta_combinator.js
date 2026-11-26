'use strict';
/**
 * scripts/lib/conflict/least_delta_combinator.js — Least-Delta Solution Combinator & Troublesome SKU Pruning Engine
 *
 * Core Principle:
 * When a customer BOQ contains a "troublesome SKU" that forces multiple cascading dependencies
 * (e.g. expander cards, auxiliary cables, high-performance fans, high-wattage titanium PSUs),
 * this engine:
 * 1. Identifies the troublesome SKU acting as the root cause of the dependency cascade.
 * 2. Formulates clean, functionally equivalent alternative paths that preserve 100% of customer intent.
 * 3. Prunes the unnecessary cascading dependencies, achieving the FEWEST DELTA CHANGES.
 * 4. Generates shared intelligence reasoning detailing why this path is superior, what was eliminated,
 *    and how customer functional goals are guaranteed.
 */

const fs = require('fs');
const path = require('path');
const { cleanBaseSKU, buildCatalogSkuIndex } = require('../catalog/sku.js');
const logger = require('../system/pipeline_logger.js');
const {
  isSkuVisibleAtDefaultAmbient,
  isActiveCatalogOption: _isActiveCatalogOption,
  findBestAlternativeInCatalog
} = require('./least_delta/catalog_alternative_finder.js');
const {
  extractDriveOrComponentAttrs: _extractDriveOrComponentAttrs,
  scoreActiveReplacementCandidate: _scoreActiveReplacementCandidate,
  compareAvailabilityReplacement,
  isActiveLifecycleCandidate,
  findActiveLifecycleReplacement,
  findBestAlternativeForDiscontinuedSku,
  buildActiveSkuMap: _buildActiveSkuMap,
  resolveDiscontinuedStatus: _resolveDiscontinuedStatus,
  buildDiscontinuedReplacementResult: _buildDiscontinuedReplacementResult,
  buildLifecycleReplacementAction: _buildLifecycleReplacementAction
} = require('./least_delta/lifecycle_replacement_engine.js');

/**
 * Detect troublesome SKUs that cause cascading dependency additions
 * @param {Array<object>} items 
 * @param {object} evalResults 
 * @param {object} catalogData 
 * @param {object} chassisInfo 
 * @returns {Array<object>} Detected troublesome SKU profiles with alternatives
 */
function _checkStorageExpanderCascade(items, storage, missing, warnings, catalogData, chassisInfo) {
  const hasExpanderMandate = missing.some(d => d.key === 'SAS_EXPANDER_CARD' || (d.description && d.description.toLowerCase().includes('expander'))) ||
                             warnings.some(w => w.toLowerCase().includes('sas expander'));
  if (!hasExpanderMandate) return null;

  const controllerItem = items.find(it => {
    const desc = (it.description || '').toLowerCase();
    return (desc.includes('controller') || desc.includes('raid') || it.sku?.startsWith('P')) &&
           (desc.includes('408i') || desc.includes('8-port') || desc.includes('8 port') || (storage.controllerDirectCapacity === 8));
  }) || items.find(it => {
    const desc = (it.description || '').toLowerCase();
    return desc.includes('controller') || desc.includes('mr408') || desc.includes('mr216');
  });

  if (!controllerItem) return null;

  const alt = findBestAlternativeInCatalog('STORAGE_EXPANDER_CASCADE', controllerItem.sku, { driveCount: storage.driveCount || 16 }, catalogData, chassisInfo);
  const eliminated = missing
    .filter(d => d.key === 'SAS_EXPANDER_CARD' || (d.description && (d.description.toLowerCase().includes('expander') || d.description.toLowerCase().includes('cable'))))
    .map(d => d.sku)
    .filter(Boolean);

  return {
    type: 'STORAGE_EXPANDER_CASCADE',
    originalSku: cleanBaseSKU(controllerItem.sku),
    originalDesc: controllerItem.description || '8-port Storage Controller',
    troublesomeReason: `8-port controller requires adding SAS Expander Card and auxiliary cables for ${storage.driveCount || 16} drives.`,
    alternativeSku: alt.sku,
    alternativeDesc: alt.description,
    action: 'SUBSTITUTE_CONTROLLER_DIRECT_ATTACH',
    functionalEquivalence: `16-port Tri-Mode Controller provides direct-attach connectivity for up to 16 drives with 8GB cache, eliminating SAS Expander card latency and extra cable kits.`,
    cascadingSkusEliminated: eliminated.length > 0 ? eliminated : ['SAS_EXPANDER_CARD'],
    presalesValuePitch: 'Upgrading from an 8-port controller with an expander card to a direct 16-port controller eliminates single-point-of-failure expander cards, reduces drive latency, and yields fewer overall BOM line items.'
  };
}

function _checkContestedOcpSlot(items, network, missing, catalogData, chassisInfo) {
  const isOcpExceeded = network.isExceedingOcpSlots || missing.some(d => d.key === 'OCP_SLOT_EXCEEDED');
  if (!isOcpExceeded) return null;

  const ocpControllerItem = items.find(it => {
    const desc = (it.description || '').toLowerCase();
    return (desc.includes('controller') || desc.includes('raid')) && (desc.includes('-o') || desc.includes('ocp'));
  });

  if (!ocpControllerItem) return null;

  const pcieAlt = findBestAlternativeInCatalog('CONTESTED_OCP_SLOT_COLLISION', ocpControllerItem.sku, {}, catalogData, chassisInfo);
  return {
    type: 'CONTESTED_OCP_SLOT_COLLISION',
    originalSku: cleanBaseSKU(ocpControllerItem.sku),
    originalDesc: ocpControllerItem.description || 'OCP Storage Controller',
    troublesomeReason: `OCP form-factor storage controller collides with customer's dual 10/25Gb OCP networking adapters, exceeding the 2 physical OCP chassis slots.`,
    alternativeSku: pcieAlt.sku,
    alternativeDesc: pcieAlt.description,
    action: 'PIVOT_FORM_FACTOR_TO_PCIE',
    functionalEquivalence: `PCIe Standup form-factor controller delivers identical 8GB cache Tri-Mode RAID capability while liberating OCP Slot 1 for customer's requested OCP NIC.`,
    cascadingSkusEliminated: ['OCP_SLOT_CONFLICT', 'SECONDARY_RISER_CABLE_KIT'],
    presalesValuePitch: 'Pivoting storage controller to PCIe standup form factor eliminates the unbuildable OCP slot collision while keeping 100% of customer requested 25Gb OCP network adapters.'
  };
}

function _checkUnsolicitedEcosystem(support) {
  if (!support.unsolicitedOptionalItems || support.unsolicitedOptionalItems.length === 0) return [];
  return support.unsolicitedOptionalItems.map(unsolicited => ({
    type: 'UNSOLICITED_ECOSYSTEM_OUTLIER',
    originalSku: cleanBaseSKU(unsolicited.sku),
    originalDesc: unsolicited.description || 'Unsolicited Service / Software',
    troublesomeReason: `Optional service / add-on was not requested by customer and inflates headline quotation CapEx.`,
    alternativeSku: null,
    alternativeDesc: null,
    action: 'PRUNE_UNSOLICITED_OUTLIER',
    functionalEquivalence: 'Core hardware deployment remains 100% buildable and functional under standard 3-year basic Tech Care.',
    cascadingSkusEliminated: [unsolicited.sku],
    presalesValuePitch: 'Unbundling unrequested startup services ensures the BOM remains strictly focused on core customer hardware specifications, improving commercial tender competitiveness.'
  }));
}

function _checkMemoryBusSpeedBottleneck(items, compute, catalogData, chassisInfo) {
  const isSilverOrLowTdp = (compute.maxCpuTdpWatts > 0 && compute.maxCpuTdpWatts <= 165) ||
    items.some(it => {
      const d = (it.description || '').toLowerCase();
      return d.includes('silver') || d.includes('4410y') || d.includes('4416+');
    });

  const highSpeedMemory = items.find(it => {
    const d = (it.description || '').toLowerCase();
    return (d.includes('5600') || d.includes('6400') || d.includes('5200')) && (d.includes('memory') || d.includes('rdimm') || d.includes('dimm'));
  });

  if (!isSilverOrLowTdp || !highSpeedMemory) return null;

  const memAlt = findBestAlternativeInCatalog('MEMORY_BUS_SPEED_BOTTLENECK', highSpeedMemory.sku, { targetCapacityGb: 32 }, catalogData, chassisInfo);
  return {
    type: 'MEMORY_BUS_SPEED_BOTTLENECK',
    originalSku: cleanBaseSKU(highSpeedMemory.sku),
    originalDesc: highSpeedMemory.description || 'High-Speed Memory',
    troublesomeReason: 'Intel Xeon Silver processors throttle memory frequency to 4000-4400 MT/s, rendering DDR5-5600 premium investment ineffective.',
    alternativeSku: memAlt.sku,
    alternativeDesc: memAlt.description,
    action: 'ALIGN_MEMORY_BUS_SPEED',
    functionalEquivalence: 'DDR5-4800 delivers 100% of the effective memory throughput supported by the CPU memory controller at reduced acquisition cost.',
    cascadingSkusEliminated: [],
    presalesValuePitch: 'Aligning memory speed with CPU memory bus limits delivers identical throughput without paying for unused frequency headroom.'
  };
}

function _checkGenerationalCpuUpgradeItem(items, chassisInfo, catalogData) {
  const isGen11Platform = (chassisInfo?.gen || '').includes('11') || (chassisInfo?.model || '').includes('Gen11') ||
    items.some(it => (it.description || '').toLowerCase().includes('gen11') || (it.sku || '').toLowerCase().includes('p52533') || (it.sku || '').toLowerCase().includes('p52534'));

  const gen4CpuItem = items.find(it => {
    const d = (it.description || '').toLowerCase();
    const sku = cleanBaseSKU(it.sku);
    return (d.includes('processor') || d.includes('xeon') || sku.startsWith('P')) &&
      (/intel\s+xeon[^\d]+(\d)4\d{2}([a-z+]?)/i.test(d) || d.includes('6414u') || d.includes('8480+'));
  });

  if (!isGen11Platform || !gen4CpuItem) return null;

  const altCpu = findBestAlternativeInCatalog('GENERATIONAL_CPU_OBSOLESCENCE', gen4CpuItem.sku, { originalDesc: gen4CpuItem.description }, catalogData, chassisInfo);
  if (!altCpu) return null;

  return {
    type: 'GENERATIONAL_CPU_OBSOLESCENCE',
    originalSku: cleanBaseSKU(gen4CpuItem.sku),
    originalDesc: gen4CpuItem.description || 'Intel 4th Gen Xeon Processor',
    troublesomeReason: `4th Gen Intel Sapphire Rapids processor carries impending obsolescence risk (6414U is discontinued OB; 8480+ is legacy) and constrains memory bus to 4800 MT/s.`,
    alternativeSku: altCpu.sku,
    alternativeDesc: altCpu.description,
    action: 'UPGRADE_GENERATIONAL_CPU',
    functionalEquivalence: `5th Gen Intel Emerald Rapids processor (${altCpu.sku}) delivers drop-in socket compatibility, higher IPC and clock frequencies at identical thermal envelope, and active production lifecycle.`,
    cascadingSkusEliminated: [],
    presalesValuePitch: `Upgrading 4th Gen Intel Sapphire Rapids to active 5th Gen Intel Emerald Rapids eliminates 90-day/OB obsolescence risk, increases memory throughput by +16.7% (5600 MT/s vs 4800 MT/s), delivers higher base/boost frequencies at identical TDP envelopes, and matches HPE factory validated solution.`
  };
}

function _checkGenerationalMemoryCouplingItems(items, missing, chassisInfo, catalogData) {
  const results = [];
  const ddr4800MemItems = items.filter(it => {
    const d = (it.description || '').toLowerCase();
    return (d.includes('4800') || d.includes('ddr5-4800')) && (d.includes('memory') || d.includes('rdimm') || d.includes('smart memory'));
  });

  const isCto = items.some(it => (it.description || '').toLowerCase().includes('configure-to-order') || (it.description || '').toLowerCase().includes('cto'));
  const eliminatedFioFixes = missing
    .filter(d => (d.description || '').toLowerCase().includes('fio') && ((d.description || '').toLowerCase().includes('p433') || (d.sku || '').startsWith('P433')))
    .map(d => d.sku)
    .filter(Boolean);

  ddr4800MemItems.forEach(memItem => {
    const altMem = findBestAlternativeInCatalog('GENERATIONAL_MEMORY_COUPLING', memItem.sku, { originalDesc: memItem.description, isCto }, catalogData, chassisInfo);
    if (altMem) {
      results.push({
        type: 'GENERATIONAL_MEMORY_COUPLING',
        originalSku: cleanBaseSKU(memItem.sku),
        originalDesc: memItem.description || 'DDR5-4800 Smart Memory Kit',
        troublesomeReason: `DDR5-4800 memory operates at legacy 4800 MT/s and is architecturally coupled to 4th Gen CPU; 5th Gen CPU mandates DDR5-5600.`,
        alternativeSku: altMem.sku,
        alternativeDesc: altMem.description,
        action: 'UPGRADE_GENERATIONAL_MEMORY',
        functionalEquivalence: `DDR5-5600 Smart FIO Memory operates at full 5600 MT/s bus speed, matching 5th Gen CPU memory controller bandwidth and natively fulfilling CTO integration.`,
        cascadingSkusEliminated: eliminatedFioFixes.length > 0 ? eliminatedFioFixes : [memItem.sku.replace(/-B21$/i, '-F21')],
        presalesValuePitch: `Synchronously upgrading DDR5-4800 memory to DDR5-5600 Smart FIO Memory unlocks +16.7% memory bandwidth and natively satisfies CTO factory integration.`
      });
    }
  });
  return results;
}

function _checkGenerationalCpuAndMemory(items, missing, chassisInfo, catalogData) {
  const cpuUpgrade = _checkGenerationalCpuUpgradeItem(items, chassisInfo, catalogData);
  if (!cpuUpgrade) return [];

  const memUpgrades = _checkGenerationalMemoryCouplingItems(items, missing, chassisInfo, catalogData);
  return [cpuUpgrade, ...memUpgrades];
}

function _checkDiscontinuedAndObsoleteSkus(items, catalogData, chassisInfo, lifecycleRecommendations) {
  const results = [];
  const chassisDir = chassisInfo?.chassisDir || chassisInfo?.catalogDir || '';
  const { isValidHpeSKU } = require('../catalog/sku.js');

  let activeSkuMap;
  const lifecycleBySku = new Map(lifecycleRecommendations.map(rec => [rec.sku, rec]));
  const skuIndex = buildCatalogSkuIndex(catalogData);

  for (const it of items) {
    const cleanSku = cleanBaseSKU(it.sku);
    if (!cleanSku || !isValidHpeSKU(cleanSku)) continue;

    const lifecycle = lifecycleBySku.get(cleanSku);
    if (lifecycle) {
      if (lifecycle.replacement && lifecycle.replacement.matchType !== 'VENDOR_LISTED') results.push(_buildLifecycleReplacementAction(lifecycle));
      continue;
    }

    const { audit, isDiscontinuedOrMissing } = _resolveDiscontinuedStatus(cleanSku, chassisDir, skuIndex);
    if (!isDiscontinuedOrMissing) continue;

    activeSkuMap ??= _buildActiveSkuMap(catalogData);
    const replacement = findBestAlternativeForDiscontinuedSku(
      cleanSku,
      it.description || audit?.latestDetails?.description || '',
      catalogData,
      chassisInfo,
      audit,
      activeSkuMap
    );

    if (!replacement || !replacement.sku) continue;

    results.push(_buildDiscontinuedReplacementResult(cleanSku, it, audit, replacement));
  }

  return results;
}

function _checkRaid1FactoryArrayGeometry(items = [], storage = {}, missing = [], catalogData = null, chassisInfo = {}) {
  const raid1Miss = missing.find(m => m.sku === '339778-B21' || m.originalSku === '339778-B21');
  const hasRaid1InItems = items.some(it => cleanBaseSKU(it.sku) === '339778-B21');
  if (!hasRaid1InItems && !raid1Miss) return null;

  const perNodeDrives = storage.driveCount || 0;
  const hasBootController = storage.hasBootController || items.some(it => {
    const desc = (it.description || '').toLowerCase();
    return desc.includes('ns204i') || it.sku === 'P78279-B21';
  });

  if (perNodeDrives > 2 || raid1Miss) {
    if (hasBootController || raid1Miss?.action === 'PRUNE_REDUNDANT_RAID1_FIO') {
      return {
        originalSku: '339778-B21',
        originalDesc: 'HPE RAID 1 Drive 1 FIO Setting',
        type: 'REDUNDANT_BOOT_RAID1_FIO',
        action: 'PRUNE_REDUNDANT_RAID1_FIO',
        alternativeSku: null,
        alternativeDesc: null,
        reason: 'Hardware OS boot mirroring is already handled by dedicated NS204i-u boot controller (P78279-B21). 339778-B21 with >2 data drives creates unassigned drive geometry rejection in CLIC and is pruned.'
      };
    } else {
      return {
        originalSku: '339778-B21',
        originalDesc: 'HPE RAID 1 Drive 1 FIO Setting',
        type: 'FACTORY_ARRAY_GEOMETRY_MISMATCH',
        action: 'TRANSPILE_TO_CUSTOMER_DEFINED_RAID',
        alternativeSku: '389692-B21',
        alternativeDesc: 'HPE Customer Defined RAID Setting Service',
        reason: `339778-B21 hardcodes Drive Count == 2. Configuration contains ${perNodeDrives} drives, leaving drives unassigned in factory configuration. Transpiled to 389692-B21 (HPE Customer Defined RAID Setting Service) at zero CapEx delta to clear CLIC build blocker.`
      };
    }
  }
  return null;
}

function _checkRuleGraphCascadingTroublemakers(items = [], evalResults = {}, chassisInfo = {}, existingTroublesome = []) {
  const missing = evalResults.missingDependencies || [];
  const errors = evalResults.errors || [];
  if (missing.length === 0 && errors.length === 0) return [];

  const alreadyFlagged = new Set(existingTroublesome.map(t => cleanBaseSKU(t.originalSku)));
  const results = [];
  const chassisDir = chassisInfo?.chassisDir || chassisInfo?.catalogDir || '';
  let rulesList = [];
  if (chassisDir) {
    try {
      const files = fs.readdirSync(chassisDir);
      const rFile = files.find(f => f.endsWith('_Catalog_Rules.json'));
      if (rFile) {
        const parsed = JSON.parse(fs.readFileSync(path.join(chassisDir, rFile), 'utf8'));
        rulesList = Array.isArray(parsed?.rules) ? parsed.rules : (Array.isArray(parsed) ? parsed : []);
      }
    } catch (err) {
      logger.warn('LEAST_DELTA', `Unable to read Catalog_Rules in ${chassisDir}: ${err.message}`);
    }
  }

  for (const dep of missing) {
    const depSku = cleanBaseSKU(dep.sku);
    const matchedRule = rulesList.find(r => cleanBaseSKU(r.requiredDependencySku || r.requiredSku) === depSku);
    const triggerSku = cleanBaseSKU(dep.triggerSku || dep.sourceSku || matchedRule?.affectedSku || '');
    if (!triggerSku || alreadyFlagged.has(triggerSku)) continue;
    const item = items.find(it => cleanBaseSKU(it.sku) === triggerSku);
    if (!item) continue;

    alreadyFlagged.add(triggerSku);
    results.push({
      type: 'RULE_GRAPH_DEPENDENCY_CASCADE',
      originalSku: triggerSku,
      originalDesc: item.description || triggerSku,
      troublesomeReason: dep.reason || `SKU ${triggerSku} triggers mandatory dependency ${depSku} via rule graph attribution.`,
      triggeredDependencies: [depSku],
      action: dep.action || 'RESOLVE_RULE_CASCADE',
      cascadingSkusEliminated: []
    });
  }
  return results;
}

function identifyTroublesomeSkus(items = [], evalResults = {}, catalogData = null, chassisInfo = {}) {
  const troublesome = [];
  const missing = evalResults.missingDependencies || [];
  const warnings = evalResults.warnings || [];
  const aspects = evalResults.aspects || {};
  const storage = aspects.storage || {};
  const network = aspects.network || {};
  const compute = aspects.compute || {};
  const support = aspects.support || {};

  const expanderCascade = _checkStorageExpanderCascade(items, storage, missing, warnings, catalogData, chassisInfo);
  if (expanderCascade) troublesome.push(expanderCascade);

  const contestedOcp = _checkContestedOcpSlot(items, network, missing, catalogData, chassisInfo);
  if (contestedOcp) troublesome.push(contestedOcp);

  troublesome.push(..._checkUnsolicitedEcosystem(support));

  const memBottleneck = _checkMemoryBusSpeedBottleneck(items, compute, catalogData, chassisInfo);
  if (memBottleneck) troublesome.push(memBottleneck);

  troublesome.push(..._checkGenerationalCpuAndMemory(items, missing, chassisInfo, catalogData));

  const lifecycleRecommendations = evalResults.lifecycleRecommendations || evalResults.evalSummary?.lifecycleRecommendations || [];
  const lifecycleActions = _checkDiscontinuedAndObsoleteSkus(items, catalogData, chassisInfo, lifecycleRecommendations);
  const occupiedSkus = new Set(troublesome.map(action => action.originalSku));
  troublesome.push(...lifecycleActions.filter(action => !occupiedSkus.has(action.originalSku)));

  const raid1Geometry = _checkRaid1FactoryArrayGeometry(items, storage, missing, catalogData, chassisInfo);
  if (raid1Geometry) troublesome.push(raid1Geometry);

  troublesome.push(..._checkRuleGraphCascadingTroublemakers(items, evalResults, chassisInfo, troublesome));

  return troublesome;
}

/**
 * Synthesize a Least-Delta Alternative Candidate Solution
 * Handles single or multiple simultaneous troublesome SKUs iteratively.
 * @param {Array<object>} baseParts 
 * @param {Array<object>} fixParts 
 * @param {Array<object>} troublesomeSkus 
 * @param {object} evalResults 
 * @param {object} catalogData 
 * @param {object} chassisInfo 
 * @param {Function} getPrice 
 * @returns {object|null} Least-delta alternative candidate
 */
function _processTroublePartItem(p, trouble, chassisInfo, getPrice, deltaCounts, trackers) {
  const clean = cleanBaseSKU(p.sku);
  if (clean !== trouble.originalSku) {
    return { isMatch: false, replacementPart: p };
  }

  if (trouble.action === 'PRUNE_UNSOLICITED_OUTLIER' || !trouble.alternativeSku) {
    deltaCounts.removalsCount += (p.quantity || 1);
    trackers.prunedSkus.push(p.sku);
    if (trouble.action === 'PRUNE_REDUNDANT_RAID1_FIO') {
      try {
        const { recordSelfHealingEvent } = require('../system/telemetry.js');
        recordSelfHealingEvent('REDUNDANT_BOOT_RAID1_PRUNED', {
          prunedSku: p.sku,
          reason: trouble.reason
        });
      } catch (_) {}
    }
    return { isMatch: true, replacementPart: null };
  }

  if (trouble.action === 'TRANSPILE_TO_CUSTOMER_DEFINED_RAID') {
    try {
      const { recordSelfHealingEvent } = require('../system/telemetry.js');
      recordSelfHealingEvent('ARRAY_GEOMETRY_RAID1_TRANSPILATION', {
        fromSku: p.sku,
        toSku: trouble.alternativeSku,
        reason: trouble.reason
      });
    } catch (_) {}
  }
  const altPrice = getPrice(trouble.alternativeSku);
  const repPart = {
    sku: trouble.alternativeSku,
    description: trouble.alternativeDesc,
    quantity: p.quantity || 1,
    unitPriceUsd: altPrice,
    extendedPriceUsd: altPrice == null ? null : altPrice * (p.quantity || 1),
    isFixInjected: false,
    isStrategyAddon: true,
    isLeastDeltaSubstitution: true,
    ...(trouble.type === 'LIFECYCLE_SKU_SUBSTITUTION' ? {
      lifecycleStatus: 'ACTIVE',
      configurationId: p.configurationId,
      quantityScope: p.quantityScope,
      quantityBasis: p.quantityBasis,
      perNodeQuantity: p.perNodeQuantity,
      clusterQuantity: p.clusterQuantity,
      parentId: p.parentId,
      subParentId: p.subParentId
    } : {}),
    category: (trouble.type?.startsWith('GENERATIONAL') || trouble.type === 'DISCONTINUED_SKU_SUPERSEDED')
      ? 'Modernized Platform Hardware'
      : 'Least-Delta Functional Replacement'
  };
  deltaCounts.replacementsCount += 1;
  trackers.replacedSkus.push({ from: p.sku, to: trouble.alternativeSku });

  const catalogDir = chassisInfo?.catalogDir || null;
  const visibility = isSkuVisibleAtDefaultAmbient(trouble.alternativeSku, catalogDir);
  if (!visibility.isVisible) {
    trouble.portalConditionalSkus = trouble.portalConditionalSkus || [];
    trouble.portalConditionalSkus.push({
      sku: trouble.alternativeSku,
      conditionType: visibility.conditionType,
      thresholdDegC: visibility.thresholdDegC,
      operator: visibility.operator,
      note: `This SKU requires non-default portal ambient (${visibility.operator} ${visibility.thresholdDegC}°C) — portal verification mandatory before quoting`
    });
    if (!trouble.portalValidationStatus || trouble.portalValidationStatus === 'PASS') {
      trouble.portalValidationStatus = 'PORTAL_CONDITIONAL';
    }
  }

  return { isMatch: true, replacementPart: repPart };
}

function _filterAndAppendFixParts(candidateParts, fixParts, allCascadingEliminated, troublesomeSkus, deltaCounts) {
  const eliminatedSet = new Set(allCascadingEliminated.map(s => cleanBaseSKU(s)));
  const hasExpanderTrouble = troublesomeSkus.some(t => t.type === 'STORAGE_EXPANDER_CASCADE');

  for (const f of fixParts) {
    const cleanF = cleanBaseSKU(f.sku);
    if (eliminatedSet.has(cleanF) || (hasExpanderTrouble && (cleanF === 'P48835-B21' || cleanF === 'P48918-B21'))) {
      continue;
    }
    candidateParts.push(f);
    deltaCounts.additionsCount += (f.quantity || 1);
  }
}

function _resolveLeastDeltaStrategyNaming(appliedActions, primaryTrouble, allCascadingEliminated, totalDeltaOperations) {
  const hasGenerationalUpgrade = appliedActions.some(a => a.type === 'GENERATIONAL_CPU_OBSOLESCENCE');
  const hasDiscontinuedUpgrade = appliedActions.some(a => a.type === 'DISCONTINUED_SKU_SUPERSEDED');
  const lifecycleActions = appliedActions.filter(a => a.type === 'LIFECYCLE_SKU_SUBSTITUTION');

  const summaryPitches = appliedActions.map(a => a.presalesValuePitch).filter(Boolean);
  const combinedPitch = summaryPitches.length > 0 ? summaryPitches.join(' ') : primaryTrouble.presalesValuePitch;

  let tierTitle = 'Rank 2: Least-Delta Functional Alternative (Cascade Pruned)';
  let strategyName = 'LEAST_DELTA_CASCADE_PRUNED';
  if (hasGenerationalUpgrade) {
    tierTitle = 'Rank 2: Modernized 5th Gen Platform & High-Speed DDR5-5600 Architecture';
    strategyName = 'MODERNIZED_5TH_GEN_PLATFORM';
  } else if (hasDiscontinuedUpgrade) {
    tierTitle = 'Rank 2: Modernized Active Baseline (Discontinued SKUs Replaced)';
    strategyName = 'MODERNIZED_ACTIVE_BASELINE';
  } else if (lifecycleActions.length) {
    tierTitle = 'Rank 2: Active Production Alternatives';
    strategyName = 'MODERNIZED_ACTIVE_BASELINE';
  }

  let sharedIntelligenceReasoning = `Least-Delta Architecture Strategy: Identified ${appliedActions.length} troublesome SKU(s) causing cascading additions (${allCascadingEliminated.join(', ') || 'multiple auxiliary parts'}). Replaced/pruned with verified functional alternatives. ${primaryTrouble.functionalEquivalence} Result: ${totalDeltaOperations} delta operations, eliminating ${allCascadingEliminated.length} accessory kits.`;
  if (hasGenerationalUpgrade) {
    sharedIntelligenceReasoning = `Modernized 5th Gen Platform Strategy: Upgraded legacy 4th Gen Intel Sapphire Rapids processor to active 5th Gen Intel Emerald Rapids (${primaryTrouble.alternativeSku}) and synchronously upgraded memory to DDR5-5600 Smart FIO Memory. Eliminates 90-day/OB obsolescence risk, increases memory throughput by +16.7% (5600 MT/s vs 4800 MT/s), delivers higher base/boost frequencies at identical TDP envelopes, eliminates standalone BTO-to-FIO memory violations, and aligns 100% with official HPE factory validated solution.`;
  } else if (hasDiscontinuedUpgrade) {
    const discTroubles = appliedActions.filter(a => a.type === 'DISCONTINUED_SKU_SUPERSEDED');
    const substSummary = discTroubles.map(d => `${d.originalSku} -> ${d.alternativeSku} (${d.historicalBudgetAnchor?.budgetHintNote || ''})`).join('; ');
    sharedIntelligenceReasoning = `Modernized Active Baseline Strategy: Replaced ${discTroubles.length} discontinued/delisted SKU(s) with live active vendor replacements while preserving customer performance tiers and budget baselines: ${substSummary}. Guarantees 100% portal buildability with minimum mutation.`;
  }

  if (lifecycleActions.length) {
    sharedIntelligenceReasoning = lifecycleActions.map(a => `${a.troublesomeReason} ${a.presalesValuePitch}`).join(' ');
  }
  return { tierTitle, strategyName, combinedPitch, sharedIntelligenceReasoning };
}

function _resolveLeastDeltaPortalConditionals(appliedActions) {
  const portalConditionalSkus = [];
  for (const act of appliedActions) {
    if (Array.isArray(act.portalConditionalSkus) && act.portalConditionalSkus.length > 0) {
      portalConditionalSkus.push(...act.portalConditionalSkus);
    }
  }
  const isPortalConditional = portalConditionalSkus.length > 0;
  const portalValidationStatus = isPortalConditional ? 'PORTAL_CONDITIONAL' : 'PASS';
  return { portalConditionalSkus, isPortalConditional, portalValidationStatus };
}

function buildLeastDeltaCandidate(baseParts = [], fixParts = [], troublesomeSkus = [], evalResults = {}, catalogData = null, chassisInfo = {}, getPrice = () => 0) {
  if (!troublesomeSkus || troublesomeSkus.length === 0) return null;

  let candidateParts = [...baseParts];
  const deltaCounts = { additionsCount: 0, removalsCount: 0, replacementsCount: 0 };
  const trackers = { replacedSkus: [], prunedSkus: [] };
  const allCascadingEliminated = [];
  const appliedActions = [];

  // 1. Process all troublesome SKUs sequentially
  for (const trouble of troublesomeSkus) {
    if (trouble.cascadingSkusEliminated && Array.isArray(trouble.cascadingSkusEliminated)) {
      allCascadingEliminated.push(...trouble.cascadingSkusEliminated);
    }

    const nextParts = [];
    let matched = false;

    for (const p of candidateParts) {
      const res = _processTroublePartItem(p, trouble, chassisInfo, getPrice, deltaCounts, trackers);
      if (res.isMatch) {
        matched = true;
        if (res.replacementPart) nextParts.push(res.replacementPart);
      } else {
        nextParts.push(p);
      }
    }

    if (matched) {
      candidateParts = nextParts;
      appliedActions.push(trouble);
    }
  }

  // 2. Filter fix parts: eliminate cascading dependencies that are no longer needed
  _filterAndAppendFixParts(candidateParts, fixParts, allCascadingEliminated, troublesomeSkus, deltaCounts);

  const primaryTrouble = appliedActions.find(a => a.type === 'GENERATIONAL_CPU_OBSOLESCENCE') || appliedActions.find(a => a.type === 'DISCONTINUED_SKU_SUPERSEDED') || appliedActions[0] || troublesomeSkus[0];
  const totalCost = candidateParts.reduce((sum, p) => sum + (p.extendedPriceUsd || (p.unitPriceUsd * (p.quantity || 1))), 0);
  const totalDeltaOperations = deltaCounts.additionsCount + deltaCounts.removalsCount + deltaCounts.replacementsCount;

  const { tierTitle, strategyName, combinedPitch, sharedIntelligenceReasoning } = _resolveLeastDeltaStrategyNaming(appliedActions, primaryTrouble, allCascadingEliminated, totalDeltaOperations);
  const { portalConditionalSkus, isPortalConditional, portalValidationStatus } = _resolveLeastDeltaPortalConditionals(appliedActions);

  return {
    tierTitle,
    strategyName,
    isLeastDeltaPath: true,
    isPortalConditional,
    portalValidationStatus,
    portalConditionalSkus,
    troublesomeRootSku: primaryTrouble.originalSku,
    alternativeSku: primaryTrouble.alternativeSku,
    troublesomeReason: primaryTrouble.troublesomeReason,
    functionalEquivalence: primaryTrouble.functionalEquivalence,
    presalesValuePitch: combinedPitch,
    allTroublesomeSkus: appliedActions,
    historicalBudgetAnchors: appliedActions
      .filter(a => a.historicalBudgetAnchor)
      .map(a => ({ sku: a.originalSku, replacementSku: a.alternativeSku, ...a.historicalBudgetAnchor })),
    cascadingSkusEliminated: allCascadingEliminated,
    deltaSummary: `${deltaCounts.replacementsCount} Replacement, ${deltaCounts.removalsCount} Removal, ${deltaCounts.additionsCount} Additions (${allCascadingEliminated.length} Cascades Avoided)`,
    deltaMetrics: {
      additionsCount: deltaCounts.additionsCount,
      removalsCount: deltaCounts.removalsCount,
      replacementsCount: deltaCounts.replacementsCount,
      totalDeltaOperations,
      cascadingDependenciesAvoided: allCascadingEliminated.length
    },
    parts: candidateParts,
    estimatedCapex: Math.round(totalCost * 100) / 100,
    sharedIntelligenceReasoning
  };
}

module.exports = {
  identifyTroublesomeSkus,
  buildLeastDeltaCandidate,
  findBestAlternativeInCatalog,
  findBestAlternativeForDiscontinuedSku,
  findActiveLifecycleReplacement,
  isActiveLifecycleCandidate,
  isSkuVisibleAtDefaultAmbient,
  extractComponentAttributes: _extractDriveOrComponentAttrs,
  scoreReplacementCandidate: _scoreActiveReplacementCandidate,
  compareAvailabilityReplacement,
  isActiveCatalogOption: _isActiveCatalogOption
};

// ── CLI Runner ─────────────────────────────────────────────────────────────
if (require.main === module) {
  const fs = require('fs');
  const path = require('path');
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node scripts/lib/conflict/least_delta_combinator.js <boq_file.xlsx|csv|json> [--chassis <name>] [--json]');
    process.exit(0);
  }

  const filePath = path.resolve(args[0]);
  const chIdx = args.indexOf('--chassis');
  let chassisName = chIdx !== -1 && args[chIdx + 1] ? args[chIdx + 1] : null;
  if (!chassisName) {
    // Attempt inference from file path
    const fileBase = path.basename(filePath);
    const match = fileBase.match(/(DL\d{3}[a-z]?_Gen\d{2}|DL\d{3}[a-z]?|SY\d{3}|MSL\d{4}|GX\d{4}|Alletra)/i);
    chassisName = match ? match[1] : null;
  }
  if (!chassisName) {
    console.error('Error: Please specify target chassis via --chassis <name> (e.g. --chassis DL360_Gen11). Zero-hardcoding guardrail forbids defaulting.');
    process.exit(1);
  }
  const jsonOut = args.includes('--json');

  try {
    let items = [];
    if (filePath.endsWith('.json')) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      items = Array.isArray(data) ? data : (data.items || data.parsedItems || []);
    } else if (filePath.endsWith('.xlsx') || filePath.endsWith('.xls')) {
      const xlsx = require('xlsx-js-style');
      const wb = xlsx.readFile(filePath);
      const { parseSkuLines } = require('../boq/boq_parser.js');
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const csv = xlsx.utils.sheet_to_csv(sheet);
      items = parseSkuLines(csv.split(/\r?\n/)).items;
    } else {
      const { parseSkuLines } = require('../boq/boq_parser.js');
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      items = parseSkuLines(fileContent.split(/\r?\n/)).items;
    }

    const { listAllCatalogs, getCatalogDetail } = require('../catalog/catalog_discovery.js');
    const needle = String(chassisName || '').replace(/\s+/g, '_').toLowerCase();
    const matchedCatalog = listAllCatalogs().find(c =>
      c.id.toLowerCase() === needle ||
      c.chassis.toLowerCase() === needle ||
      path.basename(c.catalogDir).toLowerCase() === needle
    );
    const catalogData = matchedCatalog?.catalogJsonPath ? getCatalogDetail(matchedCatalog.catalogJsonPath) : null;

    const chassisInfo = matchedCatalog
      ? { id: matchedCatalog.id, chassis: matchedCatalog.chassis, model: matchedCatalog.chassis, catalogDir: matchedCatalog.catalogDir }
      : { id: chassisName, chassis: chassisName, model: chassisName };
    const evalResults = {};
    const troublesome = identifyTroublesomeSkus(items, evalResults, catalogData, chassisInfo);
    const candidate = buildLeastDeltaCandidate(items, [], troublesome, evalResults, catalogData, chassisInfo);

    if (jsonOut) {
      console.log(JSON.stringify({ troublesome, candidate }, null, 2));
    } else {
      console.log('\n===============================================================');
      console.log(`🔍 LEAST-DELTA COMBINATOR & TROUBLESOME SKU ANALYSIS: ${path.basename(filePath)}`);
      console.log(`🎯 Chassis Variant : ${chassisName}`);
      console.log('---------------------------------------------------------------');
      console.log(`⚠️ Troublesome SKUs Identified: ${troublesome.length}`);
      troublesome.forEach((t, i) => {
        const skuLabel = t.originalSku || t.sku || 'UNKNOWN';
        const kindLabel = t.type || t.roleType || 'TROUBLESOME_SKU';
        const reasonText = t.troublesomeReason || t.reason || '';
        const cascadeList = Array.isArray(t.cascadingSkusEliminated) ? t.cascadingSkusEliminated : (t.cascadingSkus || []);
        console.log(`  ${i + 1}. SKU [${skuLabel}] (${kindLabel}): ${reasonText}`);
        console.log(`     Cascading additions: ${cascadeList.join(', ') || 'None'}`);
      });
      console.log('---------------------------------------------------------------');
      if (candidate) {
        console.log(`💡 Strategy Tier: ${candidate.tierTitle}`);
        console.log(`📋 Delta Summary: ${candidate.deltaSummary}`);
        console.log(`💰 Estimated CapEx: $${candidate.estimatedCapex?.toLocaleString() || 0}`);
        console.log(`📝 Presales Value Pitch: ${candidate.presalesValuePitch}`);
      } else {
        console.log('ℹ️ No least-delta pruning needed (BOM has clean 1:1 dependencies).');
      }
      console.log('===============================================================\n');
    }
  } catch (err) {
    console.error(`Least-Delta analysis error: ${err.message}`);
    process.exit(1);
  }
}
