'use strict';
/**
 * scripts/lib/boq/comparator_bom_assembler.js
 *
 * Candidate BOM assembly helpers extracted from solution_comparator.js:
 * row pricing, lifecycle filtering, base chassis / CPU / NIC / GPU / FC / PSU
 * catalog option matching, thermal/mgmt enablement, and Cost/Lead-Time aggregation.
 */

const fs = require('fs');
const { cleanBaseSKU, attachCompanionServices, classifyLifecycleState } = require('../catalog/sku.js');
const { parseStrictPrice, parseLeadTimeOrEta } = require('../catalog/field_parsers.js');
const { extractCanonicalAttributes } = require('../catalog/attribute_vectors.js');
const { interpolateMemoryTopology, interpolateStorageTopology } = require('../conflict/sizing/scaling_interpolator.js');
const logger = require('../system/pipeline_logger.js');

function roundMetric(value, decimals = 2) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function parseCatalogRowPrice(skuRow, desc) {
  const fields = [
    skuRow?.['List Price (USD)'],
    skuRow?.['Unit Price (USD)'],
    skuRow?.['Price (USD)'],
    skuRow?.listPrice,
    skuRow?.unitPriceUsd
  ];
  for (const raw of fields) {
    if (raw === undefined || raw === null || String(raw).trim() === '') continue;
    const parsed = parseStrictPrice(raw, { row: skuRow, description: desc });
    if (parsed.priceState === 'PRICED' && Number.isFinite(parsed.priceUsd)) {
      return { priceUsd: parsed.priceUsd, priceState: 'PRICED' };
    }
    return { priceUsd: null, priceState: parsed.priceState || 'UNPRICED' };
  }
  return { priceUsd: null, priceState: 'UNPRICED' };
}

function isActiveCatalogRow(skuRow, sku, desc) {
  if (/^\[REMOVED\s+SKU\]/i.test(String(desc || '').trim())) return false;
  const lc = classifyLifecycleState(
    skuRow?.['Lifecycle Status'] || skuRow?.lifecycleStatus || skuRow?.Status,
    skuRow?.['Diff Status'] || skuRow?.diffStatus,
    sku,
    desc,
    skuRow?.vendorSupplyStatus
  );
  return !lc.isBlockedForProduction && !lc.isConstrainedSupply;
}

function loadPlatformCatalogData(cat, options = {}) {
  if (options.catalogDataById && Object.hasOwn(options.catalogDataById, cat.id)) {
    return options.catalogDataById[cat.id];
  }
  if (!cat?.catalogJsonPath || !fs.existsSync(cat.catalogJsonPath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(cat.catalogJsonPath, 'utf8'));
    return attachCompanionServices(parsed, cat.catalogJsonPath);
  } catch (err) {
    logger.warn('SOLUTION_COMPARATOR', `Failed to load catalog ${cat.catalogJsonPath}: ${err.message}`);
    return null;
  }
}

function findCatalogRowBySku(catalogData, targetSku) {
  const clean = cleanBaseSKU(targetSku);
  if (!clean || !Array.isArray(catalogData?.entries)) return null;
  for (const entry of catalogData.entries) {
    for (const skuRow of entry?.skus || []) {
      if (cleanBaseSKU(skuRow['Product #'] || skuRow.sku) === clean) {
        return { skuRow, entry };
      }
    }
  }
  return null;
}

function buildBomItemFromRow(skuRow, role, quantity) {
  const sku = cleanBaseSKU(skuRow['Product #'] || skuRow.sku);
  const desc = String(skuRow.Description || skuRow.description || '').trim();
  const { priceUsd, priceState } = parseCatalogRowPrice(skuRow, desc);
  const lead = parseLeadTimeOrEta(skuRow['Lead Time'] || skuRow.leadTime, skuRow.leadTimeDays);
  return { sku, description: desc, quantity, role, unitPriceUsd: priceUsd, priceState, leadTimeDays: lead.days };
}

function selectBaseChassisItem(catalogData, meta) {
  if (meta.baseSku) {
    const found = findCatalogRowBySku(catalogData, meta.baseSku);
    if (found) return buildBomItemFromRow(found.skuRow, 'Base Chassis', 1);
  }
  for (const entry of catalogData?.entries || []) {
    if (!/chassis/i.test(entry.parentCategory || '')) continue;
    for (const skuRow of entry?.skus || []) {
      const sku = cleanBaseSKU(skuRow['Product #'] || skuRow.sku);
      const desc = String(skuRow.Description || skuRow.description || '').trim();
      if (sku && /\bcto\b/i.test(desc) && isActiveCatalogRow(skuRow, sku, desc)) {
        return buildBomItemFromRow(skuRow, 'Base Chassis', 1);
      }
    }
  }
  return null;
}

function extractActiveCpus(catalogData) {
  const cpus = [];
  const seen = new Set();
  for (const entry of catalogData?.entries || []) {
    for (const skuRow of entry?.skus || []) {
      const sku = cleanBaseSKU(skuRow['Product #'] || skuRow.sku);
      const desc = String(skuRow.Description || skuRow.description || '').trim();
      if (!sku || seen.has(sku) || !/\b(?:xeon|epyc|processor)\b/i.test(desc)) continue;
      if (/\b(?:heat\s*sink|heatsink|blank|kit\s+enablement|fan|cable|cage)\b/i.test(desc)) continue;
      if (!isActiveCatalogRow(skuRow, sku, desc)) continue;
      const canonical = extractCanonicalAttributes({ sku, description: desc, category: entry.parentCategory || '' }, entry);
      const cores = canonical.attributes?.cores || Number((desc.match(/\b(\d{1,3})[\s-]*core\b/i) || [])[1] || 0);
      if (!Number.isFinite(cores) || cores < 4) continue;
      const tdpWatts = canonical.attributes?.tdpWatts || Number((desc.match(/\b(\d{2,3})\s*W\b/i) || [])[1] || 185);
      const { priceUsd, priceState } = parseCatalogRowPrice(skuRow, desc);
      const lead = parseLeadTimeOrEta(skuRow['Lead Time'] || skuRow.leadTime, skuRow.leadTimeDays);
      seen.add(sku);
      cpus.push({ sku, description: desc, cores, tdpWatts, unitPriceUsd: priceUsd, priceState, leadTimeDays: lead.days });
    }
  }
  return cpus;
}

function selectCpuConfiguration(catalogData, targetCores, meta) {
  const cpus = extractActiveCpus(catalogData);
  if (!cpus.length) return { item: null, socketCount: 0, totalCores: 0, maxTdpWatts: 0, coverageGap: true };

  const desiredCores = Number.isFinite(targetCores) && targetCores > 0 ? targetCores : 32;
  const socketOptions = meta.maxSockets >= 4 ? [4, 2] : (meta.maxSockets >= 2 ? [2, 1] : [1]);
  const candidates = [];
  for (const cpu of cpus) {
    for (const sockets of socketOptions) {
      candidates.push({
        cpu,
        sockets,
        totalCores: cpu.cores * sockets,
        meetsTarget: cpu.cores * sockets >= desiredCores,
        totalCost: cpu.unitPriceUsd !== null ? cpu.unitPriceUsd * sockets : null
      });
    }
  }
  candidates.sort((a, b) => {
    if (a.meetsTarget !== b.meetsTarget) return a.meetsTarget ? -1 : 1;
    if (a.totalCores !== b.totalCores) return a.meetsTarget ? (a.totalCores - b.totalCores) : (b.totalCores - a.totalCores);
    if (a.sockets !== b.sockets) return b.sockets - a.sockets;
    return (a.totalCost ?? Number.POSITIVE_INFINITY) - (b.totalCost ?? Number.POSITIVE_INFINITY) || a.cpu.sku.localeCompare(b.cpu.sku);
  });

  const best = candidates[0];
  return {
    item: {
      sku: best.cpu.sku,
      description: best.cpu.description,
      quantity: best.sockets,
      role: 'Processor',
      unitPriceUsd: best.cpu.unitPriceUsd,
      priceState: best.cpu.priceState,
      leadTimeDays: best.cpu.leadTimeDays
    },
    socketCount: best.sockets,
    totalCores: best.totalCores,
    maxTdpWatts: best.cpu.tdpWatts,
    meetsTarget: best.meetsTarget,
    coverageGap: false
  };
}

function selectFirstMatchingCatalogOption(catalogData, role, quantity, matchFn, preferPriced = true) {
  const hits = [];
  for (const entry of catalogData?.entries || []) {
    for (const skuRow of entry?.skus || []) {
      const sku = cleanBaseSKU(skuRow['Product #'] || skuRow.sku);
      const desc = String(skuRow.Description || skuRow.description || '').trim();
      if (!sku || !desc || !isActiveCatalogRow(skuRow, sku, desc)) continue;
      if (!matchFn(sku, desc, entry)) continue;
      hits.push(buildBomItemFromRow(skuRow, role, quantity));
    }
  }
  if (!hits.length) return null;
  hits.sort((a, b) => {
    if (preferPriced && (a.unitPriceUsd !== null) !== (b.unitPriceUsd !== null)) {
      return a.unitPriceUsd !== null ? -1 : 1;
    }
    return (a.unitPriceUsd ?? Number.POSITIVE_INFINITY) - (b.unitPriceUsd ?? Number.POSITIVE_INFINITY) || a.sku.localeCompare(b.sku);
  });
  return hits[0];
}

function _comparePsuCandidates(a, b, minWatts) {
  const fitDiff = (a.watts >= minWatts ? 0 : 1) - (b.watts >= minWatts ? 0 : 1);
  const titDiff = (/titanium|96%/i.test(a.description) ? 0 : 1) - (/titanium|96%/i.test(b.description) ? 0 : 1);
  return fitDiff || titDiff || (a.watts - b.watts) || ((a.unitPriceUsd ?? Number.POSITIVE_INFINITY) - (b.unitPriceUsd ?? Number.POSITIVE_INFINITY)) || a.sku.localeCompare(b.sku);
}

function selectPsuItem(catalogData, estimatedWatts) {
  const psus = [];
  for (const entry of catalogData?.entries || []) {
    for (const skuRow of entry?.skus || []) {
      const sku = cleanBaseSKU(skuRow['Product #'] || skuRow.sku);
      const desc = String(skuRow.Description || skuRow.description || '').trim();
      if (!sku || !/\b(?:power\s*supply|flex\s*slot)\b/i.test(desc) || /\b(?:cord|cable|enablement|blank|-48\s*vdc|dc\s+power)\b/i.test(desc)) continue;
      if (!isActiveCatalogRow(skuRow, sku, desc)) continue;
      const watts = Number((desc.match(/\b(\d{3,4})\s*W\b/i) || [])[1] || 800);
      psus.push({ ...buildBomItemFromRow(skuRow, 'Power Supply', 2), watts });
    }
  }
  if (!psus.length) return null;
  const minWatts = Math.max(800, Math.ceil(estimatedWatts * 1.25));
  psus.sort((a, b) => _comparePsuCandidates(a, b, minWatts));
  const { watts: _w, ...chosen } = psus[0];
  return chosen;
}

function appendThermalAndMgmtEnablement(bomItems, catalogData, cpuRes) {
  const sockets = cpuRes.socketCount || 2;
  const highPerfHeatSink = cpuRes.maxTdpWatts > 205
    ? selectFirstMatchingCatalogOption(catalogData, 'Cooling / Thermal', sockets, (_s, d) => /high\s*performance.*heat\s*sink/i.test(d) && !/liquid|dlc|direct/i.test(d))
    : null;
  const heatSink = highPerfHeatSink || selectFirstMatchingCatalogOption(
    catalogData, 'Cooling / Thermal', sockets, (_s, d) => /heat\s*sink/i.test(d) && !/liquid|dlc|blank|enablement/i.test(d)
  );
  if (heatSink) bomItems.push(heatSink);

  if (cpuRes.maxTdpWatts > 185) {
    const fanKit = selectFirstMatchingCatalogOption(
      catalogData, 'Cooling / Thermal', 1, (_s, d) => /high\s*performance\s*fan/i.test(d) && !/blank/i.test(d)
    );
    if (fanKit) bomItems.push(fanKit);
  }

  const mgmt = selectFirstMatchingCatalogOption(
    catalogData, 'Software', 1, (s, d) => s === 'R7A11AAE' || s === 'E5Y43A' || /compute\s+ops\s+management.*3-?y/i.test(d)
  );
  if (mgmt) bomItems.push(mgmt);
}

function aggregateBomPricingAndLeadTime(bomItems, nodeCount) {
  const unpricedSkus = [];
  let perNodeCostUsd = 0;
  let maxLeadTimeDays = null;
  let unknownLeadTimeCount = 0;

  for (const item of bomItems) {
    if (item.unitPriceUsd === null || !Number.isFinite(item.unitPriceUsd) || item.priceState !== 'PRICED') {
      unpricedSkus.push(item.sku);
    } else {
      perNodeCostUsd += item.unitPriceUsd * item.quantity;
    }
    if (Number.isFinite(item.leadTimeDays)) {
      maxLeadTimeDays = maxLeadTimeDays === null ? item.leadTimeDays : Math.max(maxLeadTimeDays, item.leadTimeDays);
    } else {
      unknownLeadTimeCount += 1;
    }
  }

  const pricingComplete = bomItems.length > 0 && unpricedSkus.length === 0;
  return {
    perNodeCostUsd: pricingComplete ? roundMetric(perNodeCostUsd, 2) : null,
    capexListUsd: pricingComplete ? roundMetric(perNodeCostUsd * nodeCount, 2) : null,
    pricingComplete,
    unpricedSkus,
    maxLeadTimeDays: unknownLeadTimeCount === 0 ? maxLeadTimeDays : null,
    observedMaxLeadTimeDays: maxLeadTimeDays,
    unknownLeadTimeCount
  };
}

function appendWorkloadSpecialtyHardware(bomItems, coverageGaps, catId, catalogData, spec) {
  if (Number.isFinite(spec.nicSpeedGbps) && spec.nicSpeedGbps > 0) {
    const nicItem = selectFirstMatchingCatalogOption(
      catalogData, 'Network Adapter', 1,
      (_s, d) => /\b(?:adapter|ethernet|nic|ocp)\b/i.test(d) && !/\b(?:transceiver|cable|sfp|qsfp|dac|aoc)\b/i.test(d) && new RegExp(`\\b${spec.nicSpeedGbps}\\s*Gb`, 'i').test(d)
    );
    if (nicItem) bomItems.push(nicItem);
  }
  if (Number.isFinite(spec.gpuCount) && spec.gpuCount > 0) {
    const modelNeedle = String(spec.gpuModel || '').toLowerCase();
    const gpuItem = selectFirstMatchingCatalogOption(
      catalogData, 'GPU / Accelerator', spec.gpuCount,
      (_s, d) => /\b(?:gpu|nvidia|tesla|h100|h200|l40|l4|a100|b200|rtx)\b/i.test(d) && !/\b(?:cable|kit|enablement|riser)\b/i.test(d) && (!modelNeedle || d.includes(modelNeedle))
    );
    if (gpuItem) bomItems.push(gpuItem);
    else coverageGaps.push({ code: 'CATALOG_COVERAGE_GAP', category: 'GPU / Accelerator', detail: `No active matching GPU SKU found in ${catId} catalog (${spec.gpuModel || 'any'}).` });
  }
  if (Number.isFinite(spec.fcPorts) && spec.fcPorts > 0) {
    const hbaItem = selectFirstMatchingCatalogOption(
      catalogData, 'Fibre Channel HBA', Math.max(1, Math.ceil(spec.fcPorts / 2)),
      (_s, d) => /\b(?:fibre\s*channel|hba|sn1610|sn1700|lpe\d+)\b/i.test(d) && !/\b(?:transceiver|cable)\b/i.test(d)
    );
    if (hbaItem) bomItems.push(hbaItem);
  }
}

function _appendMemoryAndStorageBom(bomItems, coverageGaps, cat, meta, catalogData, spec, cpuRes, baseItem) {
  const targetRamGb = spec.ramGb || 256;
  const memInterp = interpolateMemoryTopology({
    targetRamGb,
    socketCount: cpuRes.socketCount || Math.min(2, meta.maxSockets),
    channelsPerSocket: meta.channelsPerSocket,
    preferFio: true,
    catalogData
  });
  if (memInterp.coverageGap === 'CATALOG_COVERAGE_GAP' || !memInterp.bestBalanced) {
    coverageGaps.push({ code: 'CATALOG_COVERAGE_GAP', category: 'Memory', detail: `No active Memory DIMM SKUs found in ${cat.id} catalog.` });
  } else {
    const dimm = memInterp.bestBalanced;
    const fioDesc = baseItem && !/\bfio\b|factory integrated/i.test(dimm.description)
      ? `${dimm.description} (Factory Integrated #0D1)`
      : dimm.description;
    bomItems.push({ sku: dimm.sku, description: fioDesc, quantity: dimm.totalDimms, role: 'Memory', unitPriceUsd: dimm.unitPriceUsd, priceState: dimm.pricingComplete ? 'PRICED' : 'UNPRICED', leadTimeDays: dimm.leadTimeDays });
  }

  let storageInterp = null;
  if (Number.isFinite(spec.usableTb) && spec.usableTb > 0) {
    storageInterp = interpolateStorageTopology({
      targetUsableTb: spec.usableTb, raidLevel: spec.raidLevel, hotSpares: spec.hotSpares,
      driveProtocol: spec.driveProtocol, maxBays: meta.maxBays, catalogData
    });
    if (storageInterp.coverageGap === 'CATALOG_COVERAGE_GAP') {
      coverageGaps.push({ code: 'CATALOG_COVERAGE_GAP', category: 'Drive Cage / Drive', detail: `No active physical Drive SKUs found in ${cat.id} catalog to satisfy ${spec.usableTb}TB usable.` });
    } else if (storageInterp.recommended) {
      const drv = storageInterp.recommended;
      bomItems.push({ sku: drv.sku, description: drv.description, quantity: drv.totalDrives, role: 'Drive Cage / Drive', unitPriceUsd: drv.unitPriceUsd, priceState: drv.pricingComplete ? 'PRICED' : 'UNPRICED', leadTimeDays: drv.leadTimeDays });
    }
  } else {
    const noDriveKit = selectFirstMatchingCatalogOption(catalogData, 'Enablement', 1, s => s === '873763-B21');
    if (noDriveKit) bomItems.push(noDriveKit);
  }
  return { targetRamGb, memInterp, storageInterp };
}

function assembleServerBom(cat, meta, catalogData, spec) {
  const bomItems = [];
  const coverageGaps = [];

  const baseItem = selectBaseChassisItem(catalogData, meta);
  if (baseItem) bomItems.push(baseItem);
  else coverageGaps.push({ code: 'CATALOG_COVERAGE_GAP', category: 'Base Chassis', detail: `No active CTO base chassis SKU found in ${cat.id} catalog.` });

  const cpuRes = selectCpuConfiguration(catalogData, spec.cores, meta);
  if (cpuRes.coverageGap || !cpuRes.item) {
    coverageGaps.push({ code: 'CATALOG_COVERAGE_GAP', category: 'Processor', detail: `No active Processor SKUs found in ${cat.id} catalog.` });
  } else {
    bomItems.push(cpuRes.item);
    appendThermalAndMgmtEnablement(bomItems, catalogData, cpuRes);
  }

  const { targetRamGb, memInterp, storageInterp } = _appendMemoryAndStorageBom(bomItems, coverageGaps, cat, meta, catalogData, spec, cpuRes, baseItem);
  appendWorkloadSpecialtyHardware(bomItems, coverageGaps, cat.id, catalogData, spec);

  const estimatedBaseWatts = (cpuRes.maxTdpWatts * (cpuRes.socketCount || 2)) + ((memInterp.bestBalanced?.totalDimms || 8) * 10) + ((storageInterp?.recommended?.totalDrives || 0) * 14) + 120;
  const psuItem = selectPsuItem(catalogData, estimatedBaseWatts);
  if (psuItem) bomItems.push(psuItem);

  return { bomItems, coverageGaps, cpuRes, memInterp, storageInterp, targetRamGb, estimatedBaseWatts };
}

module.exports = {
  roundMetric,
  loadPlatformCatalogData,
  aggregateBomPricingAndLeadTime,
  assembleServerBom
};
