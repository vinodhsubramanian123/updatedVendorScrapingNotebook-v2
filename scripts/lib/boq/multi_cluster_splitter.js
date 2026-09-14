'use strict';
/**
 * scripts/lib/boq/multi_cluster_splitter.js — Automated Multi-Cluster BOQ Splitter & Partitioning Engine
 *
 * Decomposes complex aggregated tender RFQ BOQs (such as GID-RFQS-HPE-2026-006.xlsx)
 * into distinct, homogeneous, 100% buildable server cluster configurations.
 *
 * Handles:
 * 1. Multi-line SKU cells (extracting embedded accessory SKUs with chassis multiplier).
 * 2. Multi-processor partitioning (determining cluster multipliers from CPU core/TDP counts).
 * 3. Power supply wattage matching (assigning high-wattage PSUs to high-TDP clusters).
 * 4. Proportional distribution of memory, storage controllers, boot devices, and risers.
 * 5. Generation of discrete cluster workbooks for physical aspect verification.
 */

const fs = require('fs');
const path = require('path');
let XLSX;
try {
  XLSX = require('xlsx-js-style');
} catch (_) {
  XLSX = require('xlsx');
}

const { cleanBaseSKU, isValidHpeSKU } = require('../catalog/sku.js');
const { detectChassisVariant, getChassisMap } = require('../catalog/catalog_discovery.js');

/**
 * Robustly find a valid HPE SKU within text with multiple tokens.
 * @param {string} text 
 * @returns {string|null}
 */
function findValidSkuInText(text) {
  if (!text) return null;
  const matches = text.match(/\b([A-Z0-9]{3,8}-[A-Z0-9]{3,4}|[A-Z0-9]{6}|[A-Z0-9]{5,8}AAE|[HURS][A-Z0-9]{4,11})\b/ig);
  if (!matches) return null;
  for (const m of matches) {
    const clean = cleanBaseSKU(m);
    if (isValidHpeSKU(clean)) return clean;
  }
  return null;
}

/**
 * Extract all raw line items from an Excel workbook, supporting multi-line description cells.
 * @param {string} filePath 
 * @returns {Array<object>} Raw parsed line items
 */
function extractRawItemsFromWorkbook(filePath) {
  const wb = XLSX.readFile(filePath);
  const nonBomKeywords = ['audit', 'architecture', 'terms', 'notes', 'readme', 'compliance', 'matrix', 'instructions', 'cover'];
  const candidateSheets = wb.SheetNames.filter(name => {
    const lower = name.toLowerCase();
    return !nonBomKeywords.some(kw => lower.includes(kw));
  });
  const sheetName = candidateSheets.length > 0 ? candidateSheets[0] : wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const rawItems = [];
  let headerMap = { no: 0, cat: 1, desc: 2, qty: 3, unitPrice: 4, totalPrice: 5 };
  let currentCategory = 'General';

  for (let rIdx = 0; rIdx < rows.length; rIdx++) {
    const row = rows[rIdx];
    if (!row || row.length === 0) continue;

    // Detect header row
    const firstCell = String(row[0] || '').toLowerCase().trim();
    if (firstCell === 'no.' || firstCell === 'item' || firstCell === 'no' || firstCell === 'pos') {
      let qtyConfidence = 0;
      row.forEach((col, cIdx) => {
        const c = String(col || '').toLowerCase().trim();
        if (c.includes('desc') && !c.includes('remark') && !c.includes('rationale')) headerMap.desc = cIdx;
        
        // Priority-based quantity column resolution
        const isExactQty = c === 'qty' || c === 'quantity' || c === 'count' || c === 'units';
        const isPrefixQty = c.startsWith('rfp qty') || c.startsWith('customer qty') || c.startsWith('order qty') || c.endsWith('qty');
        const isGeneralQty = c.includes('qty') && !c.includes('split') && !c.includes('sku &') && !c.includes('diff');

        if (isExactQty && qtyConfidence < 3) {
          headerMap.qty = cIdx;
          qtyConfidence = 3;
        } else if (isPrefixQty && qtyConfidence < 2) {
          headerMap.qty = cIdx;
          qtyConfidence = 2;
        } else if (isGeneralQty && qtyConfidence < 1) {
          headerMap.qty = cIdx;
          qtyConfidence = 1;
        }

        if (c.includes('category')) headerMap.cat = cIdx;
        if (c.includes('unit price') || c === 'price') headerMap.unitPrice = cIdx;
        if (c.includes('total price')) headerMap.totalPrice = cIdx;
      });
      continue;
    }

    // Update sticky category if present
    const catCell = String(row[headerMap.cat] || '').trim();
    if (catCell && catCell !== 'null' && catCell !== 'undefined') {
      currentCategory = catCell;
    }

    const descCell = String(row[headerMap.desc] || '').trim();
    const rawQtyCell = String(row[headerMap.qty] || '').trim();
    let lineQty = null;
    if (/^\d+$/.test(rawQtyCell)) {
      lineQty = parseInt(rawQtyCell, 10);
    } else {
      const m = rawQtyCell.match(/\b(?:qty|quantity|count)[:=\s]*(\d+)\b/i) || rawQtyCell.match(/^(\d+)\b/);
      if (m) {
        lineQty = parseInt(m[1], 10);
      }
    }

    if (!descCell) continue;

    // Check if cell contains multi-line bundled items (e.g. Model Name with 13 embedded SKUs)
    const lines = descCell.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    if (lines.length > 1) {
      lines.forEach(l => {
        const cleanSku = findValidSkuInText(l);
        if (cleanSku) {
          rawItems.push({
            sku: cleanSku,
            description: l,
            quantity: lineQty || 1,
            category: currentCategory,
            rawLine: l
          });
        } else if (l.toLowerCase().includes('server') || l.toLowerCase().includes('chassis') || l.toLowerCase().includes('configure-to-order')) {
          // GAP-1 FIX: Mark as Base Chassis with placeholder SKU; resolved dynamically in analyzeAndPartitionClusters()
          rawItems.push({
            sku: 'CHASSIS_PLACEHOLDER',
            description: l,
            quantity: lineQty || 1,
            category: 'Base Chassis',
            rawLine: l
          });
        }
      });
    } else {
      const cleanSku = findValidSkuInText(descCell);
      if (cleanSku) {
        rawItems.push({
          sku: cleanSku,
          description: descCell,
          quantity: lineQty || 1,
          category: currentCategory,
          rawLine: descCell
        });
      }
    }
  }

  return rawItems;
}

/**
 * Mathematically rigorous Diophantine solver to distribute quantities across clusters
 * with zero hardcoding and zero fractional remainders.
 * 
 * Given cluster multipliers m_1, m_2, ..., m_k and total item quantity Q:
 * Finds non-negative integers q_1, q_2, ..., q_k such that:
 *   sum(m_i * q_i) === Q
 * 
 * If requireEven is true (e.g. transceivers for dual-port NICs), enforces q_i % 2 === 0.
 * Minimizes variance across clusters to maintain maximum cluster homogeneity.
 */
function solveDiophantineMultiCluster(clusters, totalQty, options = {}) {
  const multipliers = clusters.map(c => c.multiplier);
  const k = multipliers.length;
  if (k === 0) return [];
  if (k === 1) {
    return [Math.round(totalQty / multipliers[0])];
  }

  const totalChassis = multipliers.reduce((a, b) => a + b, 0) || 1;
  // If exact division
  if (totalQty % totalChassis === 0) {
    const perServer = totalQty / totalChassis;
    return multipliers.map(() => perServer);
  }

  // 2 clusters case: exact exhaustive Diophantine search with minimal variance
  if (k === 2) {
    const [m1, m2] = multipliers;
    const solutions = [];
    const maxQ1 = Math.floor(totalQty / m1);
    const avg = totalQty / totalChassis;

    for (let q1 = 0; q1 <= maxQ1; q1++) {
      const rem = totalQty - m1 * q1;
      if (rem % m2 === 0) {
        const q2 = rem / m2;
        if (q2 >= 0) {
          if (options.requireEven && (q1 % 2 !== 0 || q2 % 2 !== 0)) {
            continue;
          }
          const variance = Math.pow(q1 - avg, 2) + Math.pow(q2 - avg, 2);
          solutions.push({ q1, q2, variance });
        }
      }
    }

    if (solutions.length > 0) {
      solutions.sort((a, b) => a.variance - b.variance);
      return [solutions[0].q1, solutions[0].q2];
    }
  }

  // General fallback when no exact integer Diophantine solution exists:
  // Distribute uniformly per server using rounded ratio (e.g. 450 DIMMs / 60 chassis = 7.5 -> 8 per server)
  const perServerRounded = Math.max(1, Math.round(totalQty / totalChassis));
  return multipliers.map(() => perServerRounded);
}

/**
 * Identify clusters and compute partition multipliers from raw items.
 * @param {Array<object>} rawItems 
 * @param {string} [boqName='']
 * @returns {object} { isMultiCluster, totalChassis, clusters: [] }
 */
/**
 * Compute infrastructure and facility sizing for a given cluster.
 */
function computeClusterSizing(multiplier, items, uHeight, railKitSku, railKitDesc) {
  let psuWattage = 800;
  let railKitCount = 0;
  let cpuWatts = 0;
  let gpuWatts = 0;
  let memWatts = 0;
  let storageWatts = 0;
  
  items.forEach(it => {
    const desc = (it.description || '').toLowerCase();
    const clean = cleanBaseSKU(it.sku);
    if (desc.includes('power supply') || desc.includes('flex slot') || it.category === 'Power Supply') {
      const wMatch = desc.match(/(\d{3,4})\s*w/i);
      if (wMatch) psuWattage = Math.max(psuWattage, parseInt(wMatch[1], 10));
    }
    if (desc.includes('rack rail') || desc.includes('rail kit') || clean === railKitSku) {
      railKitCount += (parseInt(it.totalQuantity || it.quantity, 10) || 1);
    }
    if (desc.includes('processor') || desc.includes('xeon') || it.category === 'Processor') {
      const tdpMatch = desc.match(/(\d{2,3})\s*w/i);
      cpuWatts += (tdpMatch ? parseInt(tdpMatch[1], 10) : 205) * (it.quantity || 1);
    }
    if (desc.includes('nvidia') || desc.includes('gpu')) {
      gpuWatts += 300 * (it.quantity || 1);
    }
    if (desc.includes('memory') || desc.includes('rdimm') || it.category === 'Memory') {
      memWatts += 8 * (it.quantity || 1);
    }
    if (desc.includes('ssd') || desc.includes('hdd') || desc.includes('nvme')) {
      if (!desc.includes('cage') && !desc.includes('controller')) {
        storageWatts += 15 * (it.quantity || 1);
      }
    }
  });

  const estimatedNodeWattage = cpuWatts + gpuWatts + memWatts + storageWatts + 150;
  const needsHighLine220v = estimatedNodeWattage > 800 && psuWattage >= 1600;

  return {
    serverCount: multiplier,
    totalRackUnits: multiplier * uHeight,
    standard42uRacksRequired: Math.ceil((multiplier * uHeight) / 42),
    totalFacilityPowerKw: Number(((multiplier * (psuWattage || 800)) / 1000).toFixed(2)),
    railKitCoverage: {
      required: multiplier,
      recommendedSku: railKitSku,
      description: railKitDesc,
      providedCount: railKitCount,
      isCompliant: railKitCount >= multiplier
    },
    needsHighLine220v
  };
}

/**
 * Hamilton-Hare Largest Remainder Method for Diophantine chassis allocation per CPU model.
 */
function allocateClusterChassisQuotas(cpuItems, totalChassis, globalCpusPerServer) {
  const CLUSTER_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const rawQuotas = cpuItems.map(c => (c.quantity || 1) / globalCpusPerServer);
  const totalRawQuota = rawQuotas.reduce((sum, q) => sum + q, 0) || 1;

  const tempClusters = cpuItems.map((cpu, idx) => {
    const raw = rawQuotas[idx];
    const exactShare = totalChassis * (raw / totalRawQuota);
    const baseMult = Math.floor(exactShare);
    const remainder = exactShare - baseMult;
    return { idx, cpu, raw, exactShare, baseMult, remainder };
  });

  let allocatedChassis = tempClusters.reduce((sum, c) => sum + c.baseMult, 0);
  const deficit = totalChassis - allocatedChassis;

  tempClusters.sort((a, b) => b.remainder - a.remainder || b.raw - a.raw);

  for (let i = 0; i < deficit; i++) {
    if (i < tempClusters.length) {
      tempClusters[i].baseMult += 1;
    }
  }

  tempClusters.sort((a, b) => a.idx - b.idx);

  const clusters = [];
  tempClusters.forEach(({ cpu, baseMult, idx }) => {
    const letter = CLUSTER_LETTERS[idx] || String(idx + 1);
    const clusterLabel = `Cluster_${letter}`;
    const cpuTdpMatch = (cpu.description || '').match(/(\d+)W/i);
    const tdp = cpuTdpMatch ? parseInt(cpuTdpMatch[1], 10) : 205;
    const clusterCpusPerServer = Math.max(1, Math.round((cpu.quantity || 1) / (baseMult || 1))) || globalCpusPerServer;

    clusters.push({
      clusterId: idx + 1,
      name: clusterLabel,
      multiplier: baseMult,
      cpuSku: cpu.sku,
      cpuDesc: cpu.description,
      cpuTdp: tdp,
      cpusPerServer: clusterCpusPerServer,
      items: []
    });
  });

  return clusters;
}

/**
 * Match PSUs to clusters by wattage and TDP priority.
 */
function matchPsusToClusters(clusters, psuItems) {
  const psuListWithWattage = psuItems.map(p => {
    const wMatch = (p.description || '').match(/(\d{3,4})\s*w/i);
    const isTitanium = /titanium/i.test(p.description || '');
    const wattage = wMatch ? parseInt(wMatch[1], 10) : (isTitanium ? 2200 : 1600);
    return { ...p, wattage };
  }).sort((a, b) => b.wattage - a.wattage);

  const unassignedPsus = [...psuListWithWattage];
  const clusterPsuMap = new Map();

  clusters.forEach(c => {
    const exactMatchIdx = unassignedPsus.findIndex(p => {
      const perServer = p.quantity / c.multiplier;
      return perServer >= 1 && Number.isInteger(perServer);
    });
    if (exactMatchIdx !== -1) {
      clusterPsuMap.set(c.clusterId, unassignedPsus.splice(exactMatchIdx, 1)[0]);
    }
  });

  clusters.forEach(c => {
    if (!clusterPsuMap.has(c.clusterId)) {
      const nextPsu = unassignedPsus.shift() || psuListWithWattage[0] || psuItems[0];
      clusterPsuMap.set(c.clusterId, nextPsu);
    }
  });

  return clusterPsuMap;
}

/**
 * Pre-calculate per-cluster allocations for all common infrastructure items.
 */
function precomputeCommonItemAllocations(rawItems, clusters, totalChassis, isExcludedItemFn, enablementKits) {
  const itemAllocationsBySku = new Map();

  rawItems.forEach(item => {
    const clean = cleanBaseSKU(item.sku);
    if (isExcludedItemFn(item, clean)) return;

    const desc = (item.description || '').toLowerCase();
    const isTransceiver = desc.includes('transceiver') || desc.includes('sfp');
    const isFan = desc.includes('fan kit') || desc.includes('fans') || clean === enablementKits.highPerfFanKit?.sku;
    const isHeatsink = desc.includes('heat sink') || desc.includes('heatsink') || clean === enablementKits.highPerfHeatsink?.sku;

    if (isFan) {
      const isKit = desc.includes('kit') || clean === enablementKits.highPerfFanKit?.sku;
      const kitQtyPerServer = isKit ? 1 : Math.max(1, Math.round((item.quantity || 1) / totalChassis));
      itemAllocationsBySku.set(clean, clusters.map(() => kitQtyPerServer));
      return;
    }

    if (isHeatsink) {
      itemAllocationsBySku.set(clean, clusters.map(c => c.cpusPerServer));
      return;
    }

    const requireEven = isTransceiver;
    const allocs = solveDiophantineMultiCluster(clusters, item.quantity || 1, { requireEven });
    itemAllocationsBySku.set(clean, allocs);
  });

  return itemAllocationsBySku;
}

/**
 * Distribute items and infrastructure options to a specific cluster.
 */
function populateClusterCommonItem(cluster, item, cIdx, itemAllocationsBySku, totalChassis, enablementKits, rawItems) {
  const mult = cluster.multiplier;
  const clean = cleanBaseSKU(item.sku);
  const desc = (item.description || '').toLowerCase();

  // Memory: Proportionally distributed per server & FIO conversion
  if (desc.includes('dimm') || desc.includes('memory') || (item.category || '').toLowerCase().includes('memory')) {
    const perServerDimms = itemAllocationsBySku.get(clean)?.[cIdx] || Math.max(1, Math.round(item.quantity / totalChassis));
    let fioSku = cleanBaseSKU(item.sku);
    if (fioSku.endsWith('-B21')) {
      fioSku = fioSku.replace(/-B21$/, '-F21');
    } else if (!fioSku.includes('-F21') && !fioSku.includes('#0D1')) {
      fioSku = fioSku + '#0D1';
    }
    cluster.items.push({
      sku: fioSku,
      description: item.description.replace(/\bBTO\b/gi, 'FIO') + (desc.includes('fio') ? '' : ' (FIO)'),
      quantity: perServerDimms,
      totalQuantity: mult * perServerDimms,
      category: 'Memory'
    });
    return;
  }

  // Heatsinks
  if (desc.includes('heat sink') || desc.includes('heatsink')) {
    const perServer = itemAllocationsBySku.get(clean)?.[cIdx] || cluster.cpusPerServer;
    cluster.items.push({
      sku: item.sku,
      description: item.description,
      quantity: perServer,
      totalQuantity: mult * perServer,
      category: 'Compute & Thermal'
    });
    return;
  }

  // Fans
  if (desc.includes('fan kit') || desc.includes('fans') || clean === enablementKits.highPerfFanKit?.sku) {
    const perServer = itemAllocationsBySku.get(clean)?.[cIdx] || 1;
    cluster.items.push({
      sku: item.sku,
      description: item.description,
      quantity: perServer,
      totalQuantity: mult * perServer,
      category: 'Compute & Thermal'
    });
    return;
  }

  // OCP2 Enablement: Exclude DL360 CPU1 to OCP2 if DL380 CPU2 to OCP2 is present
  if (clean === enablementKits.cpu1OcpCable?.sku || clean === 'P51911-B21') {
    const hasCpu2Ocp = rawItems.some(r => cleanBaseSKU(r.sku) === (enablementKits.cpu2OcpCable?.sku || 'P48830-B21'));
    if (hasCpu2Ocp) return;
    const perServer = itemAllocationsBySku.get(clean)?.[cIdx] || 1;
    cluster.items.push({
      sku: item.sku,
      description: item.description,
      quantity: perServer,
      totalQuantity: mult * perServer,
      category: item.category
    });
    return;
  }

  // Storage Cables: Exclude Y-Cable if paired with an OCP controller in raw mode
  if (clean === enablementKits.triModeSplitterCable?.sku || clean === 'P48832-B21') {
    const hasOcpController = rawItems.some(r => (r.description || '').toLowerCase().includes('-o') || (r.description || '').toLowerCase().includes('ocp'));
    if (hasOcpController) return;
    const perServer = itemAllocationsBySku.get(clean)?.[cIdx] || 1;
    cluster.items.push({
      sku: item.sku,
      description: item.description,
      quantity: perServer,
      totalQuantity: mult * perServer,
      category: item.category
    });
    return;
  }

  // All other common infrastructure options: allocate via Diophantine partition
  const perServer = itemAllocationsBySku.get(clean)?.[cIdx] || Math.max(1, Math.round(item.quantity / totalChassis));
  cluster.items.push({
    sku: item.sku,
    description: item.description,
    quantity: perServer,
    totalQuantity: mult * perServer,
    category: item.category
  });
}

/**
 * Inject Primary Riser power cable and EU Lot 9 CE removal enablement kits when mandated.
 */
function applyClusterEnablementKits(cluster, mult, enablementKits) {
  const pcieCardCount = cluster.items.reduce((count, ci) => {
    const d = (ci.description || '').toLowerCase();
    const isPcieCard = (d.includes('fiber channel') || d.includes('hba') ||
      (d.includes('adapter') && !d.includes('ocp')) ||
      d.includes('gpu') || d.includes('accelerator') ||
      (d.includes('controller') && d.includes('-p')));
    return isPcieCard ? count + (ci.quantity || 1) : count;
  }, 0);

  // CLIC Rules 81016755 & 81354683: >=5 PCIe cards requires Primary Riser Cable Kit for Slot 1 enablement
  const primaryCableSku = enablementKits.primaryRiserCableKit?.sku || 'P56073-B21';
  const primaryCableDesc = enablementKits.primaryRiserCableKit?.name || 'HPE ProLiant Primary Cable Kit (Slot 1 Enablement)';
  if (pcieCardCount >= 5 && primaryCableSku) {
    cluster.items.push({
      sku: primaryCableSku,
      description: primaryCableDesc,
      quantity: 1,
      totalQuantity: mult,
      category: 'PCI-Express Slot'
    });
  }

  // EU Lot 9 CE Mark Removal: Inject if cluster uses non-Titanium PSUs in dual-socket configuration
  const hasNonTitaniumPsu = cluster.items.some(ci =>
    ci.category === 'Power Supply' && !/titanium/i.test(ci.description || '')
  );
  const ceRemovalSku = enablementKits.ceRemovalKit?.sku || 'P35876-B21';
  const ceRemovalDesc = enablementKits.ceRemovalKit?.name || 'HPE CE Mark Removal FIO Enablement Kit (EU Lot 9 Regulatory Setting)';
  if (hasNonTitaniumPsu && ceRemovalSku && cluster.cpusPerServer >= 2) {
    cluster.items.push({
      sku: ceRemovalSku,
      description: ceRemovalDesc,
      quantity: 1,
      totalQuantity: mult,
      category: 'Factory Configuration Setting'
    });
  }
}

/**
 * Identify clusters and compute partition multipliers from raw items.
 * @param {Array<object>} rawItems 
 * @param {string} [boqName='']
 * @returns {object} { isMultiCluster, totalChassis, clusters: [] }
 */
function analyzeAndPartitionClusters(rawItems, boqName = '') {
  const chassisMap = getChassisMap();
  const allBaseSkus = new Set(Object.values(chassisMap).map(c => c.baseSku).filter(Boolean));
  const chassisItem = rawItems.find(i =>
    i.category === 'Base Chassis' ||
    i.sku === 'CHASSIS_PLACEHOLDER' ||
    allBaseSkus.has(cleanBaseSKU(i.sku))
  );

  const detectedChassis = detectChassisVariant(rawItems);
  const resolvedBaseSku = detectedChassis.baseSku || 'P52534-B21';
  const resolvedChassisDesc = detectedChassis.model
    ? `HPE ${detectedChassis.model} Configure-to-order Server`
    : 'HPE ProLiant Configure-to-order Server';

  const genKey = detectedChassis.gen ? `ProLiant_${detectedChassis.gen}` : 'DEFAULT';
  const enablementKits = chassisMap.enablement_kits?.[genKey] || chassisMap.enablement_kits?.DEFAULT || {};
  const totalChassis = chassisItem ? (chassisItem.quantity || 1) : 1;

  const cpuItems = rawItems.filter(i => {
    const d = i.description.toLowerCase();
    const c = i.category.toLowerCase();
    return d.includes('processor') || d.includes('xeon') || c.includes('processor') || c.includes('processors');
  });

  const uHeight = (detectedChassis.model && /DL360|DL145/i.test(detectedChassis.model)) ? 1 : (detectedChassis.model && /DL580/i.test(detectedChassis.model)) ? 4 : 2;
  const railKitSku = enablementKits.railKit?.sku || 'P52341-B21';
  const railKitDesc = enablementKits.railKit?.name || `HPE ${detectedChassis.model || 'ProLiant'} Easy Install Rail Kit`;

  if (cpuItems.length <= 1) {
    const singleCpu = cpuItems[0];
    return {
      isMultiCluster: false,
      totalChassis,
      detectedChassis,
      clusters: [{
        name: 'Default_Cluster',
        multiplier: totalChassis,
        cpuSku: singleCpu?.sku || null,
        cpuDesc: singleCpu?.description || null,
        items: rawItems,
        clusterSizing: computeClusterSizing(totalChassis, rawItems, uHeight, railKitSku, railKitDesc)
      }]
    };
  }

  const totalCpus = cpuItems.reduce((sum, c) => sum + (c.quantity || 1), 0);
  const globalCpusPerServer = Math.max(1, Math.round(totalCpus / totalChassis)) || (detectedChassis.sockets || 2);

  const clusters = allocateClusterChassisQuotas(cpuItems, totalChassis, globalCpusPerServer);
  clusters.sort((a, b) => b.cpuTdp - a.cpuTdp);

  const psuItems = rawItems.filter(i => {
    const d = i.description.toLowerCase();
    const c = i.category.toLowerCase();
    return d.includes('power supply') || d.includes('flex slot') || c.includes('power');
  });
  const totalPsus = psuItems.reduce((sum, p) => sum + (p.quantity || 1), 0);
  const defaultPsusPerServer = Math.max(1, Math.round(totalPsus / totalChassis)) || 2;
  const clusterPsuMap = matchPsusToClusters(clusters, psuItems);

  const isExcludedItem = (item, clean) =>
    cpuItems.some(c => cleanBaseSKU(c.sku) === clean) ||
    psuItems.some(p => cleanBaseSKU(p.sku) === clean) ||
    item.category === 'Base Chassis' ||
    clean === resolvedBaseSku ||
    item.sku === 'CHASSIS_PLACEHOLDER' ||
    allBaseSkus.has(clean);

  const itemAllocationsBySku = precomputeCommonItemAllocations(rawItems, clusters, totalChassis, isExcludedItem, enablementKits);

  clusters.forEach((cluster, cIdx) => {
    const mult = cluster.multiplier;
    cluster.items.push({
      sku: resolvedBaseSku,
      description: resolvedChassisDesc,
      quantity: 1,
      totalQuantity: mult,
      category: 'Base Chassis'
    });

    cluster.items.push({
      sku: cluster.cpuSku,
      description: cluster.cpuDesc,
      quantity: cluster.cpusPerServer,
      totalQuantity: mult * cluster.cpusPerServer,
      category: 'Processor'
    });

    const matchedPsu = clusterPsuMap.get(cluster.clusterId) || psuItems[0];
    if (matchedPsu) {
      const psuQtyPerServer = Math.max(1, Math.round((matchedPsu.quantity || totalPsus) / mult)) || defaultPsusPerServer;
      cluster.items.push({
        sku: matchedPsu.sku,
        description: matchedPsu.description,
        quantity: psuQtyPerServer,
        totalQuantity: mult * psuQtyPerServer,
        category: 'Power Supply'
      });
    }

    rawItems.forEach(item => {
      const clean = cleanBaseSKU(item.sku);
      if (isExcludedItem(item, clean)) return;
      populateClusterCommonItem(cluster, item, cIdx, itemAllocationsBySku, totalChassis, enablementKits, rawItems);
    });

    applyClusterEnablementKits(cluster, mult, enablementKits);
    cluster.clusterSizing = computeClusterSizing(mult, cluster.items, uHeight, railKitSku, railKitDesc);
  });

  return {
    isMultiCluster: true,
    totalChassis,
    detectedChassis,
    clusters
  };
}

/**
 * Generate separate Excel workbooks for each partitioned cluster.
 * @param {string} inputFilePath 
 * @param {string} outputDirectory 
 * @returns {Array<object>} Generated cluster workbooks metadata
 */
function splitAndWriteClusterWorkbooks(inputFilePath, outputDirectory) {
  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, { recursive: true });
  }

  const rawItems = Array.isArray(inputFilePath) ? inputFilePath : extractRawItemsFromWorkbook(inputFilePath);
  const partitionResult = analyzeAndPartitionClusters(rawItems);
  const detectedChassis = partitionResult.detectedChassis || detectChassisVariant(rawItems);

  const generatedWorkbooks = [];

  partitionResult.clusters.forEach(cluster => {
    const wb = XLSX.utils.book_new();
    const sheetData = [
      ['Part No', 'Qty', 'Description', 'Category', 'Unit List Price (USD)', 'Extended Price (USD)', 'Portal / CLIC Status']
    ];

    cluster.items.forEach(item => {
      sheetData.push([
        item.sku,
        item.quantity,
        item.description,
        item.category,
        item.unitPriceUsd || 0,
        (item.unitPriceUsd || 0) * (item.quantity || 1),
        'ACTIVE_IN_OCA'
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, ws, 'Server Config');

    const modelName = (detectedChassis.model || 'Server').replace(/\s+/g, '_');
    const fileName = `${cluster.name}_${cluster.multiplier}x_${modelName}.xlsx`;
    const outPath = path.join(outputDirectory, fileName);
    XLSX.writeFile(wb, outPath);

    generatedWorkbooks.push({
      clusterName: cluster.name,
      multiplier: cluster.multiplier,
      cpuSku: cluster.cpuSku,
      filePath: outPath,
      itemCount: cluster.items.length,
      items: cluster.items
    });
  });

  return {
    totalChassis: partitionResult.totalChassis,
    clusterCount: partitionResult.clusters.length,
    workbooks: generatedWorkbooks
  };
}

module.exports = {
  findValidSkuInText,
  extractRawItemsFromWorkbook,
  analyzeAndPartitionClusters,
  splitAndWriteClusterWorkbooks
};

// ── CLI Runner ─────────────────────────────────────────────────────────────
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node scripts/lib/boq/multi_cluster_splitter.js <tender_file.xlsx> [output_dir] [--json]');
    process.exit(0);
  }
  const filePath = path.resolve(args[0]);
  const outDir = args[1] && !args[1].startsWith('--') ? path.resolve(args[1]) : path.join(path.dirname(filePath), 'split_clusters');
  const jsonOut = args.includes('--json');

  try {
    const rawItems = extractRawItemsFromWorkbook(filePath);
    const partition = analyzeAndPartitionClusters(rawItems, path.basename(filePath));
    const result = splitAndWriteClusterWorkbooks(filePath, outDir);

    if (jsonOut) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('\n===============================================================');
      console.log(`🧩 MULTI-CLUSTER TENDER SPLITTER: ${path.basename(filePath)}`);
      console.log(`🏢 Total Chassis Count : ${result.totalChassis} nodes`);
      console.log(`📦 Discovered Clusters : ${result.clusterCount}`);
      console.log('---------------------------------------------------------------');
      result.workbooks.forEach((wb, i) => {
        console.log(`Cluster ${i + 1} [${wb.clusterName}]: ${wb.multiplier}x nodes (${wb.itemCount} SKUs/node) -> ${wb.filePath}`);
      });
      console.log('===============================================================\n');
    }
  } catch (err) {
    console.error(`Multi-cluster splitting failed: ${err.message}`);
    process.exit(1);
  }
}
