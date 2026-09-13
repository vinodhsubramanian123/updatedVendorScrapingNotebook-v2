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

const { cleanBaseSKU, buildCatalogSkuIndex } = require('../catalog/sku.js');
const { classifyComponentRole } = require('../catalog/product_meta.js');
const { introspectSku } = require('./cascading_impact_analyzer.js');

/**
 * Dynamically find the best alternative SKU in the catalog for a given component role
 * @param {string} roleType 
 * @param {string} currentSku 
 * @param {object} constraints 
 * @param {object} catalogData 
 * @param {object} chassisInfo 
 * @returns {object|null} { sku, description }
 */
function findBestAlternativeInCatalog(roleType, currentSku, constraints = {}, catalogData = null, chassisInfo = {}) {
  const isGen12 = (chassisInfo?.gen || '').includes('12') || (chassisInfo?.model || '').includes('Gen12');

  // Fallback defaults if catalog is missing or empty
  if (!catalogData || !Array.isArray(catalogData.entries) || catalogData.entries.length === 0) {
    if (roleType === 'STORAGE_EXPANDER_CASCADE') {
      const altSku = isGen12 ? 'P55415-B21' : 'P55415-B21';
      return {
        sku: altSku,
        description: 'HPE Broadcom MR416i-o x16 Lanes 8GB Cache Tri-Mode Storage Controller'
      };
    }
    if (roleType === 'CONTESTED_OCP_SLOT_COLLISION') {
      const pcieSku = isGen12 ? 'P47777-B21' : 'P47777-B21';
      return {
        sku: pcieSku,
        description: 'HPE MR416i-p Gen11 x16 Lanes 8GB Cache PCIe Storage Controller'
      };
    }
    if (roleType === 'MEMORY_BUS_SPEED_BOTTLENECK') {
      const targetCapacity = constraints.targetCapacityGb || 32;
      return targetCapacity >= 64
        ? { sku: 'P43331-B21', description: 'HPE 64GB 2Rx4 DDR5-4800 Registered Smart Memory Kit' }
        : { sku: 'P43328-B21', description: 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit' };
    }
    return null;
  }

  const skuIndex = buildCatalogSkuIndex(catalogData);

  if (roleType === 'STORAGE_EXPANDER_CASCADE') {
    for (const [sku, item] of skuIndex.entries()) {
      if (item.lifecycleStatus && (item.lifecycleStatus === 'OB' || item.lifecycleStatus === 'EOL')) continue;
      const desc = (item.skuData?.Description || item.entry?.description || '').toLowerCase();
      if ((desc.includes('controller') || desc.includes('raid')) &&
          (desc.includes('16-port') || desc.includes('x16') || desc.includes('416i')) &&
          desc.includes('tri-mode')) {
        return {
          sku,
          description: item.skuData?.Description || item.entry?.description || '16-Port Tri-Mode Storage Controller'
        };
      }
    }
    return {
      sku: 'P55415-B21',
      description: 'HPE Broadcom MR416i-o x16 Lanes 8GB Cache Tri-Mode Storage Controller'
    };
  }

  if (roleType === 'CONTESTED_OCP_SLOT_COLLISION') {
    for (const [sku, item] of skuIndex.entries()) {
      if (item.lifecycleStatus && (item.lifecycleStatus === 'OB' || item.lifecycleStatus === 'EOL')) continue;
      const desc = (item.skuData?.Description || item.entry?.description || '').toLowerCase();
      if ((desc.includes('controller') || desc.includes('raid')) &&
          (desc.includes('pcie') || desc.includes('-p') || desc.includes('416i-p') || desc.includes('216i-p')) &&
          !desc.includes('-o') && !desc.includes('ocp')) {
        return {
          sku,
          description: item.skuData?.Description || item.entry?.description || 'PCIe Standup Storage Controller'
        };
      }
    }
    return {
      sku: 'P47777-B21',
      description: 'HPE MR416i-p Gen11 x16 Lanes 8GB Cache PCIe Storage Controller'
    };
  }

  if (roleType === 'MEMORY_BUS_SPEED_BOTTLENECK') {
    const targetCapacity = constraints.targetCapacityGb || 32;
    for (const [sku, item] of skuIndex.entries()) {
      if (item.lifecycleStatus && (item.lifecycleStatus === 'OB' || item.lifecycleStatus === 'EOL')) continue;
      const desc = (item.skuData?.Description || item.entry?.description || '').toLowerCase();
      if ((desc.includes('memory') || desc.includes('dimm') || desc.includes('smart memory')) &&
          desc.includes('4800') &&
          desc.includes(`${targetCapacity}gb`)) {
        return {
          sku,
          description: item.skuData?.Description || item.entry?.description || `HPE ${targetCapacity}GB DDR5-4800 Registered Smart Memory Kit`
        };
      }
    }
    return targetCapacity >= 64
      ? { sku: 'P43331-B21', description: 'HPE 64GB 2Rx4 DDR5-4800 Registered Smart Memory Kit' }
      : { sku: 'P43328-B21', description: 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit' };
  }

  return null;
}

/**
 * Detect troublesome SKUs that cause cascading dependency additions
 * @param {Array<object>} items 
 * @param {object} evalResults 
 * @param {object} catalogData 
 * @param {object} chassisInfo 
 * @returns {Array<object>} Detected troublesome SKU profiles with alternatives
 */
function identifyTroublesomeSkus(items = [], evalResults = {}, catalogData = null, chassisInfo = {}) {
  const troublesome = [];
  const missing = evalResults.missingDependencies || [];
  const errors = evalResults.errors || [];
  const warnings = evalResults.warnings || [];
  const aspects = evalResults.aspects || {};
  const storage = aspects.storage || {};
  const network = aspects.network || {};
  const compute = aspects.compute || {};
  const support = aspects.support || {};

  // 1. Troublesome 8-Port Storage Controller with > 8 Drives (Forces SAS Expander + Cables)
  const hasExpanderMandate = missing.some(d => d.key === 'SAS_EXPANDER_CARD' || d.sku === 'P48835-B21') ||
                             warnings.some(w => w.toLowerCase().includes('sas expander'));
  
  if (hasExpanderMandate) {
    const controllerItem = items.find(it => {
      const desc = (it.description || '').toLowerCase();
      return (desc.includes('controller') || desc.includes('raid') || it.sku?.startsWith('P')) &&
             (desc.includes('408i') || desc.includes('8-port') || desc.includes('8 port') || (storage.controllerDirectCapacity === 8));
    }) || items.find(it => {
      const desc = (it.description || '').toLowerCase();
      return desc.includes('controller') || desc.includes('mr408') || desc.includes('mr216');
    });

    if (controllerItem) {
      const alt = findBestAlternativeInCatalog('STORAGE_EXPANDER_CASCADE', controllerItem.sku, { driveCount: storage.driveCount || 16 }, catalogData, chassisInfo);
      troublesome.push({
        type: 'STORAGE_EXPANDER_CASCADE',
        originalSku: cleanBaseSKU(controllerItem.sku),
        originalDesc: controllerItem.description || '8-port Storage Controller',
        troublesomeReason: `8-port controller requires adding SAS Expander Card (P48835-B21) and auxiliary cables for ${storage.driveCount || 16} drives.`,
        alternativeSku: alt.sku,
        alternativeDesc: alt.description,
        action: 'SUBSTITUTE_CONTROLLER_DIRECT_ATTACH',
        functionalEquivalence: `16-port Tri-Mode Controller provides direct-attach connectivity for up to 16 drives with 8GB cache, eliminating SAS Expander card latency and extra cable kits.`,
        cascadingSkusEliminated: ['P48835-B21', 'P48918-B21', 'P48832-B21'],
        presalesValuePitch: 'Upgrading from an 8-port controller with an expander card to a direct 16-port controller eliminates single-point-of-failure expander cards, reduces drive latency, and yields fewer overall BOM line items.'
      });
    }
  }

  // 2. Troublesome OCP Storage Controller in Contested OCP Slot Environment (Dual OCP NICs)
  const isOcpExceeded = network.isExceedingOcpSlots || missing.some(d => d.key === 'OCP_SLOT_EXCEEDED');
  if (isOcpExceeded) {
    const ocpControllerItem = items.find(it => {
      const desc = (it.description || '').toLowerCase();
      return (desc.includes('controller') || desc.includes('raid')) && (desc.includes('-o') || desc.includes('ocp'));
    });

    if (ocpControllerItem) {
      const pcieAlt = findBestAlternativeInCatalog('CONTESTED_OCP_SLOT_COLLISION', ocpControllerItem.sku, {}, catalogData, chassisInfo);
      troublesome.push({
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
      });
    }
  }

  // 3. Troublesome Unsolicited Optional Services / Add-on Software (INV-32)
  if (support.unsolicitedOptionalItems && support.unsolicitedOptionalItems.length > 0) {
    support.unsolicitedOptionalItems.forEach(unsolicited => {
      troublesome.push({
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
      });
    });
  }

  // 4. Troublesome Memory Speed Mismatch (DDR5-5600 throttled by low-TDP CPU)
  const isSilverOrLowTdp = (compute.maxCpuTdpWatts > 0 && compute.maxCpuTdpWatts <= 165) ||
    items.some(it => {
      const d = (it.description || '').toLowerCase();
      return d.includes('silver') || d.includes('4410y') || d.includes('4416+');
    });

  const highSpeedMemory = items.find(it => {
    const d = (it.description || '').toLowerCase();
    return (d.includes('5600') || it.sku === 'P73300-B21' || it.sku === 'P64707-B21') && (d.includes('memory') || d.includes('rdimm'));
  });

  if (isSilverOrLowTdp && highSpeedMemory) {
    const memAlt = findBestAlternativeInCatalog('MEMORY_BUS_SPEED_BOTTLENECK', highSpeedMemory.sku, { targetCapacityGb: 32 }, catalogData, chassisInfo);
    troublesome.push({
      type: 'MEMORY_BUS_SPEED_BOTTLENECK',
      originalSku: cleanBaseSKU(highSpeedMemory.sku),
      originalDesc: highSpeedMemory.description || 'DDR5-5600 Memory',
      troublesomeReason: 'Intel Xeon Silver processors throttle memory frequency to 4000-4400 MT/s, rendering DDR5-5600 premium investment ineffective.',
      alternativeSku: memAlt.sku,
      alternativeDesc: memAlt.description,
      action: 'ALIGN_MEMORY_BUS_SPEED',
      functionalEquivalence: 'DDR5-4800 delivers 100% of the effective memory throughput supported by the CPU memory controller at reduced acquisition cost.',
      cascadingSkusEliminated: [],
      presalesValuePitch: 'Aligning memory speed with CPU memory bus limits delivers identical throughput without paying for unused frequency headroom.'
    });
  }

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
function buildLeastDeltaCandidate(baseParts = [], fixParts = [], troublesomeSkus = [], evalResults = {}, catalogData = null, chassisInfo = {}, getPrice = () => 0) {
  if (!troublesomeSkus || troublesomeSkus.length === 0) return null;

  let candidateParts = [...baseParts];
  let additionsCount = 0;
  let removalsCount = 0;
  let replacementsCount = 0;
  const replacedSkus = [];
  const prunedSkus = [];
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
      const clean = cleanBaseSKU(p.sku);
      if (clean === trouble.originalSku) {
        matched = true;
        if (trouble.action === 'PRUNE_UNSOLICITED_OUTLIER' || !trouble.alternativeSku) {
          removalsCount += (p.quantity || 1);
          prunedSkus.push(p.sku);
        } else {
          // Substitute with cleaner functional alternative
          const altPrice = getPrice(trouble.alternativeSku);
          nextParts.push({
            sku: trouble.alternativeSku,
            description: trouble.alternativeDesc,
            quantity: p.quantity || 1,
            unitPriceUsd: altPrice,
            extendedPriceUsd: altPrice * (p.quantity || 1),
            isFixInjected: false,
            isStrategyAddon: true,
            isLeastDeltaSubstitution: true,
            category: 'Least-Delta Functional Replacement'
          });
          replacementsCount += 1;
          replacedSkus.push({ from: p.sku, to: trouble.alternativeSku });
        }
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
  const eliminatedSet = new Set(allCascadingEliminated.map(s => cleanBaseSKU(s)));
  const hasExpanderTrouble = troublesomeSkus.some(t => t.type === 'STORAGE_EXPANDER_CASCADE');

  for (const f of fixParts) {
    const cleanF = cleanBaseSKU(f.sku);
    if (eliminatedSet.has(cleanF) || (hasExpanderTrouble && (cleanF === 'P48835-B21' || cleanF === 'P48918-B21'))) {
      continue;
    }
    candidateParts.push(f);
    additionsCount += (f.quantity || 1);
  }

  const primaryTrouble = appliedActions[0] || troublesomeSkus[0];
  const totalCost = candidateParts.reduce((sum, p) => sum + (p.extendedPriceUsd || (p.unitPriceUsd * (p.quantity || 1))), 0);
  const totalDeltaOperations = additionsCount + removalsCount + replacementsCount;

  const summaryPitches = appliedActions.map(a => a.presalesValuePitch).filter(Boolean);
  const combinedPitch = summaryPitches.length > 0 ? summaryPitches.join(' ') : primaryTrouble.presalesValuePitch;

  const sharedIntelligenceReasoning = `Least-Delta Architecture Strategy: Identified ${appliedActions.length} troublesome SKU(s) causing cascading additions (${allCascadingEliminated.join(', ') || 'multiple auxiliary parts'}). Replaced/pruned with verified functional alternatives. ${primaryTrouble.functionalEquivalence} Result: ${totalDeltaOperations} delta operations, eliminating ${allCascadingEliminated.length} accessory kits.`;

  return {
    tierTitle: 'Rank 2: Least-Delta Functional Alternative (Cascade Pruned)',
    strategyName: 'LEAST_DELTA_CASCADE_PRUNED',
    isLeastDeltaPath: true,
    troublesomeRootSku: primaryTrouble.originalSku,
    alternativeSku: primaryTrouble.alternativeSku,
    troublesomeReason: primaryTrouble.troublesomeReason,
    functionalEquivalence: primaryTrouble.functionalEquivalence,
    presalesValuePitch: combinedPitch,
    allTroublesomeSkus: appliedActions,
    cascadingSkusEliminated: allCascadingEliminated,
    deltaSummary: `${replacementsCount} Replacement, ${removalsCount} Removal, ${additionsCount} Additions (${allCascadingEliminated.length} Cascades Avoided)`,
    deltaMetrics: {
      additionsCount,
      removalsCount,
      replacementsCount,
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
  findBestAlternativeInCatalog
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
  const chassisName = chIdx !== -1 && args[chIdx + 1] ? args[chIdx + 1] : 'DL380_Gen12';
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

    const { getChassisCatalog } = require('../catalog/catalog_discovery.js');
    const chassisInfo = getChassisCatalog ? getChassisCatalog(chassisName, {}) : null;
    const catalogData = chassisInfo?.catalogData || null;

    const troublesome = identifyTroublesomeSkus(items, catalogData, { chassis: chassisName });
    const candidate = buildLeastDeltaCandidate(items, catalogData, { chassis: chassisName });

    if (jsonOut) {
      console.log(JSON.stringify({ troublesome, candidate }, null, 2));
    } else {
      console.log('\n===============================================================');
      console.log(`🔍 LEAST-DELTA COMBINATOR & TROUBLESOME SKU ANALYSIS: ${path.basename(filePath)}`);
      console.log(`🎯 Chassis Variant : ${chassisName}`);
      console.log('---------------------------------------------------------------');
      console.log(`⚠️ Troublesome SKUs Identified: ${troublesome.length}`);
      troublesome.forEach((t, i) => {
        console.log(`  ${i + 1}. SKU [${t.sku}] (${t.roleType}): ${t.reason}`);
        console.log(`     Cascading additions: ${t.cascadingSkus.join(', ') || 'None'}`);
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
