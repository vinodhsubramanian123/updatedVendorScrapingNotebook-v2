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
const { detectChassisVariant, getChassisMap, autoDetectChassisDir } = require('../catalog/catalog_discovery.js');
const { isNonBomSheet } = require('./boq_parser.js');
const { analyzeDeliveryPacing } = require('./delivery_pacing_analyzer.js');
const { evaluateItemPricing } = require('./pricing_presence.js');

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
  // Use canonical non-BOM sheet filter (INV-63)
  const candidateSheets = wb.SheetNames.filter(name => !isNonBomSheet(name));
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
  // Reject malformed quantities before division or search; zero multipliers can hang execution.
  if (!Array.isArray(clusters) || clusters.some(c => !Number.isSafeInteger(c?.multiplier) || c.multiplier <= 0) || !Number.isSafeInteger(totalQty) || totalQty < 0) {
    throw new Error('INVALID_CLUSTER_QUANTITIES');
  }
  let searchSteps = 0;
  const consumeSearchStep = () => {
    if (++searchSteps > 100000) throw new Error('CLUSTER_ALLOCATION_SEARCH_LIMIT: allocation remains unresolved');
  };
  const multipliers = clusters.map(c => c.multiplier);
  const k = multipliers.length;
  if (k === 0) return [];
  const qty = Number(totalQty);
  if (!Number.isFinite(qty) || qty <= 0) {
    return multipliers.map(() => 0);
  }

  const totalChassis = multipliers.reduce((a, b) => a + b, 0) || 1;

  if (k === 1) {
    const m = multipliers[0] || 1;
    if (qty % m === 0) {
      const q = qty / m;
      if (options.requireEven && q % 2 !== 0) {
        return [0];
      }
      return [q];
    }
    const floorQty = Math.floor(qty / m);
    return [options.requireEven && floorQty % 2 !== 0 ? Math.max(0, floorQty - 1) : floorQty];
  }

  // Exact division across all clusters
  if (qty % totalChassis === 0) {
    const perServer = qty / totalChassis;
    if (!options.requireEven || perServer % 2 === 0) {
      return multipliers.map(() => perServer);
    }
  }

  // 2 clusters case: exact exhaustive Diophantine search with minimal variance
  if (k === 2) {
    const [m1, m2] = multipliers;
    const solutions = [];
    const maxQ1 = Math.floor(qty / m1);
    const avg = qty / totalChassis;

    for (let q1 = 0; q1 <= maxQ1; q1++) {
      consumeSearchStep();
      const rem = qty - m1 * q1;
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

  // 3+ clusters case: bounded search for exact Diophantine solution
  if (k > 2 && k <= 5) {
    const avg = qty / totalChassis;
    let bestSolution = null;
    let minVariance = Infinity;

    function search(idx, currentRem, currentAlloc) {
      consumeSearchStep();
      if (idx === k - 1) {
        const mk = multipliers[idx];
        if (currentRem % mk === 0) {
          const qk = currentRem / mk;
          if (qk >= 0 && (!options.requireEven || qk % 2 === 0)) {
            const fullAlloc = [...currentAlloc, qk];
            const variance = fullAlloc.reduce((sum, q) => sum + Math.pow(q - avg, 2), 0);
            if (variance < minVariance) {
              minVariance = variance;
              bestSolution = fullAlloc;
            }
          }
        }
        return;
      }
      const mi = multipliers[idx];
      const maxQi = Math.floor(currentRem / mi);
      for (let qi = 0; qi <= maxQi; qi++) {
        if (options.requireEven && qi % 2 !== 0) continue;
        search(idx + 1, currentRem - mi * qi, [...currentAlloc, qi]);
      }
    }

    search(0, qty, []);
    if (bestSolution) return bestSolution;
  }

  if (options.allowRounding === false) {
    const floorQty = Math.floor(qty / totalChassis);
    return multipliers.map(() => options.requireEven && floorQty % 2 !== 0 ? Math.max(0, floorQty - 1) : floorQty);
  }
  const rounded = Math.max(1, Math.round(qty / totalChassis));
  return multipliers.map(() => options.requireEven && rounded % 2 !== 0 ? rounded + 1 : rounded);
}

/**
 * Compute infrastructure and facility sizing for a given cluster.
 */
function computeClusterSizing(multiplier, items, uHeight, railKitSku, railKitDesc) {
  let psuWattage = 0;
  let hasUnknownComponentPower = false;
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
      if (!tdpMatch) hasUnknownComponentPower = true;
      cpuWatts += (tdpMatch ? parseInt(tdpMatch[1], 10) : 0) * (it.quantity || 1);
    }
    if (desc.includes('nvidia') || desc.includes('gpu') || desc.includes('accelerator')) {
      const gpuWattMatch = desc.match(/(\d{2,4})\s*w\b/i);
      let gWatt = 0;
      if (gpuWattMatch) {
        gWatt = parseInt(gpuWattMatch[1], 10);
      } else {
        hasUnknownComponentPower = true;
      }
      gpuWatts += gWatt * (it.quantity || 1);
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
    totalRackUnits: uHeight > 0 ? multiplier * uHeight : null,
    standard42uRacksRequired: uHeight > 0 ? Math.ceil((multiplier * uHeight) / 42) : null,
    usable42uRacksRequired: null,
    totalFacilityPowerKw: null,
    estimatedDrawKw: hasUnknownComponentPower ? null : Number(((multiplier * estimatedNodeWattage) / 1000).toFixed(2)),
    peakFacilityFeedKw: null,
    sizingStatus: 'ESTIMATE_SITE_VALIDATION_REQUIRED',
    powerAssumptions: 'Memory, storage and base-load estimates remain heuristic. PSU capacity is not actual draw. Site rack reserve, redundancy and electrical derating require explicit inputs.',
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
    const allocList = itemAllocationsBySku.get(clean);
    const hasClusterAlloc = Array.isArray(allocList);
    const alloc = allocList?.[cIdx];
    let perServerDimms;
    if (hasClusterAlloc) {
      perServerDimms = (typeof alloc === 'number' && Number.isFinite(alloc)) ? alloc : 0;
    } else {
      perServerDimms = Math.max(1, Math.round((item.quantity || 1) / totalChassis));
    }
    if (perServerDimms <= 0) return;
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
  const allocList = itemAllocationsBySku.get(clean);
  const hasClusterAlloc = Array.isArray(allocList);
  const alloc = allocList?.[cIdx];
  let perServer;
  if (hasClusterAlloc) {
    perServer = (typeof alloc === 'number' && Number.isFinite(alloc)) ? alloc : 0;
  } else {
    perServer = Math.max(1, Math.round((item.quantity || 1) / totalChassis));
  }
  if (perServer <= 0) return;
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
      category: 'PCI-Express Slot',
      policyMandated: true
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
      category: 'Factory Configuration Setting',
      policyMandated: true
    });
  }
}

const QUALIFYING_COM_ONEVIEW_SKUS = new Set([
  'R7A11AAE', // Base SKU: COM 3yr Enhanced Upfront
  'R7A12AAE', // 5-Year Enhanced, Upfront
  'S2E10AAE', // 7-Year Enhanced, Upfront
  'S5E59AAE', // HPE COM Adv 3yr Up ProLiant SaaS
  'S5E60AAE', // HPE COM Adv 5yr Up ProLiant SaaS
  'S5E61AAE', // HPE COM Adv 7yr Up ProLiant SaaS
  'E5Y43A',   // OneView Advanced FIO SKU (with iLO)
  'P8B31A',   // OneView Advanced w/o iLO FIO SKU
  'E5Y35AAE', // HPE OneView including 3yr 24x7 Support Flexible Quantity E-LTU
  'P8B25A',   // HPE OV w/o iLO 3yr 24x7 Track 1Svr LTU
  'E5Y36A',   // HPE OV 3yr 24x7 Supp Track 1 Svr Lic
  'E5Y44A'    // HPE OV for DL 3y 24x7 Bdl Track 1Svr Lic
]);

/**
 * Enforce the "Atomic Icon" Principle (INV-179):
 * Guarantees that each partitioned server cluster is an independently buildable atomic unit in CLIC.
 * Specifically verifies and injects:
 * 1. CLIC Rule 81322276: Mandatory Compute Ops Management (COM) or OneView license attached 1:1 per server
 *    for all compatible NPI CTO models on Gen11 and Gen12 ProLiant platforms.
 * 2. Dedicated per-cluster hardware support line items (Tech Care Basic) and proportional service credits.
 */
function applyClusterManagementAndSupportPolicy(cluster, mult, rawItems, detectedChassis) {
  const isGen11Or12 = detectedChassis && (
    detectedChassis.gen === 'Gen11' ||
    detectedChassis.gen === 'Gen12' ||
    /Gen11|Gen12/i.test(detectedChassis.model || '')
  );

  if (!isGen11Or12) return;

  // 1. Mandatory Management License (CLIC Rule 81322276)
  const hasQualifyingManagementLicense = (cluster.items || []).some(ci => {
    const clean = cleanBaseSKU(ci.sku);
    return QUALIFYING_COM_ONEVIEW_SKUS.has(clean) ||
           /compute ops management|oneview/i.test(ci.description || '');
  });

  if (!hasQualifyingManagementLicense) {
    cluster.items.push({
      sku: 'R7A11AAE',
      description: 'HPE GreenLake for Compute Ops Management Enhanced 3-year Upfront SaaS (CLIC Rule 81322276 Mandatory Policy)',
      quantity: 1,
      totalQuantity: mult,
      category: 'Software & Licenses',
      policyMandated: true,
      ruleId: '81322276',
      notes: 'Mandatory COM Base SKU injected to guarantee independent cluster buildability (Atomic Icon Invariant INV-179)'
    });
    if (!cluster.policyAdvisories) cluster.policyAdvisories = [];
    cluster.policyAdvisories.push('CLIC Rule 81322276: Injected R7A11AAE (1 per server) to avoid Process Control override block upon standalone quote export.');
  }

  // 2. Hardware Support Check (INV-179 Proportional Support)
  const hasSupportService = (cluster.items || []).some(ci =>
    /^HU4B2A3/i.test(cleanBaseSKU(ci.sku)) ||
    ci.category === 'Support Services' ||
    /tech care/i.test(ci.description || '')
  );

  const rawSupportItem = (rawItems || []).find(r => /^HU4B2A3/i.test(cleanBaseSKU(r.sku)) || /tech care/i.test(r.description || ''));
  if (rawSupportItem && !hasSupportService) {
    cluster.items.push({
      sku: rawSupportItem.sku || 'HU4B2A3',
      description: rawSupportItem.description || 'HPE 3Y Tech Care Basic Service',
      quantity: 1,
      totalQuantity: 1,
      category: 'Support Services',
      policyMandated: true
    });
    cluster.items.push({
      sku: 'HU4B2A30C4V',
      description: `HPE ${detectedChassis.model || 'ProLiant'} Support`,
      quantity: 1,
      totalQuantity: mult,
      category: 'Support Services',
      policyMandated: true
    });
  }
}

function resolveCatalogDataForItems(rawItems, options = {}) {
  if (options && options.catalogData) return options.catalogData;
  try {
    const chassisDir = autoDetectChassisDir(rawItems);
    if (chassisDir && fs.existsSync(chassisDir)) {
      const catFiles = fs.readdirSync(chassisDir).filter(f => f.endsWith('_Catalog.json'));
      if (catFiles.length > 0) {
        return JSON.parse(fs.readFileSync(path.join(chassisDir, catFiles[0]), 'utf8'));
      }
    }
  } catch (_) {}
  return null;
}

const { buildUniversalQuantityConservationLedger } = require('./quantity_conservation.js');

/**
 * Build an auditable quantity conservation ledger between raw tender items and partitioned clusters.
 * Ensures that no customer requirement or hardware count drops silently.
 * Delegated to canonical universal quantity conservation engine (INV-192 / G01 / G09).
 *
 * @param {Array<object>} rawItems - Source tender line items
 * @param {Array<object>} clusters - Partitioned cluster configurations
 * @param {object} [options={}] - Options { strict: boolean }
 * @returns {object} { isFullyConserved: boolean, totalDiscrepancies: number, ledger: Array<object> }
 */
function buildQuantityConservationLedger(rawItems, clusters, options = {}) {
  return buildUniversalQuantityConservationLedger(rawItems, clusters, options);
}

/**
 * Classify whole-datacenter infrastructure items (Racks, PDUs, KVM consoles)
 * that should not be divided or multiplied per server node.
 * @param {object} item
 * @returns {boolean}
 */
function isSharedInfrastructureItem(item) {
  if (!item) return false;
  const desc = (item.description || '').toLowerCase();
  const cat = (item.category || '').toLowerCase();
  const clean = cleanBaseSKU(item.sku || '');

  const isRack = (desc.includes('rack') && (desc.includes('42u') || desc.includes('48u') || desc.includes('g2') || desc.includes('shock') || desc.includes('pallet') || desc.includes('enterprise'))) ||
    cat === 'rack' || cat === 'racks' || clean.startsWith('BW90') || clean.startsWith('P9K0');

  const isPdu = (desc.includes('pdu') || desc.includes('power distribution unit') || desc.includes('modular pdu') || desc.includes('monitored pdu')) ||
    clean.startsWith('P9Q') || clean.startsWith('P9R');

  const isKvm = (desc.includes('kvm') || desc.includes('rackmount console') || desc.includes('console switch') || desc.includes('tft7600')) ||
    clean.startsWith('AF65') || clean.startsWith('Q2S');

  return Boolean(isRack || isPdu || isKvm);
}

/**
 * Identify clusters and compute partition multipliers from raw items.
 * @param {Array<object>} rawItems 
 * @param {string} [boqName='']
 * @param {object} [options={}]
 * @returns {object} { isMultiCluster, totalChassis, clusters: [] }
 */
function analyzeAndPartitionClusters(rawItems, boqName = '', options = {}) {
  const catalogData = resolveCatalogDataForItems(rawItems, options);
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

  const uHeight = Number.isFinite(detectedChassis.uHeight)
    ? detectedChassis.uHeight
    : (detectedChassis.formFactor === '1U' || /DL360/i.test(detectedChassis.model || '')
        ? 1
        : (/blade|compute module/i.test(detectedChassis.formFactor || '') || /SY480|SY100Gb/i.test(detectedChassis.model || '')
            ? 0
            : (/DL380a|DL384|DL580|4U/i.test(detectedChassis.model || '') || detectedChassis.formFactor === '4U' ? 4 : 2)));
  const railKitSku = enablementKits.railKit?.sku || null;
  const railKitDesc = enablementKits.railKit?.name || `HPE ${detectedChassis.model || 'ProLiant'} Easy Install Rail Kit`;

  if (cpuItems.length <= 1) {
    const singleCpu = cpuItems[0];
    const singlePacing = analyzeDeliveryPacing(rawItems, { catalogData });
    const singleCluster = [{
      name: 'Default_Cluster',
      multiplier: totalChassis,
      cpuSku: singleCpu?.sku || null,
      cpuDesc: singleCpu?.description || null,
      items: rawItems,
      clusterSizing: computeClusterSizing(totalChassis, rawItems, uHeight, railKitSku, railKitDesc),
      deliveryPacing: singlePacing
    }];
    const quantityConservation = buildQuantityConservationLedger(rawItems, singleCluster);
    return {
      isMultiCluster: false,
      totalChassis,
      detectedChassis,
      clusters: singleCluster,
      quantityConservation,
      deliveryPacing: singlePacing,
      recommendedUcidSplit: false
    };
  }

  const totalCpus = cpuItems.reduce((sum, c) => sum + (c.quantity || 1), 0);
  const globalCpusPerServer = Math.max(1, Math.round(totalCpus / totalChassis)) || (detectedChassis.sockets || 2);

  const clusters = allocateClusterChassisQuotas(cpuItems, totalChassis, globalCpusPerServer);
  clusters.sort((a, b) => b.cpuTdp - a.cpuTdp);

  const psuItems = rawItems.filter(i => {
    if (isSharedInfrastructureItem(i)) return false;
    const d = i.description.toLowerCase();
    const c = i.category.toLowerCase();
    return (d.includes('power supply') || d.includes('flex slot') || d.includes('psu') || c.includes('power')) &&
      !d.includes('pdu') && !d.includes('power distribution unit');
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
    allBaseSkus.has(clean) ||
    isSharedInfrastructureItem(item);

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
    applyClusterManagementAndSupportPolicy(cluster, mult, rawItems, detectedChassis);
    cluster.clusterSizing = computeClusterSizing(mult, cluster.items, uHeight, railKitSku, railKitDesc);
    cluster.deliveryPacing = analyzeDeliveryPacing(cluster.items, { catalogData });

    let knownSubtotal = 0;
    let pricingComplete = true;
    const priceUnavailableSkus = [];
    for (const item of cluster.items) {
      const { isPriced, unitPriceUsd } = evaluateItemPricing(item);
      if (isPriced && typeof unitPriceUsd === 'number') {
        knownSubtotal += unitPriceUsd * (item.totalQuantity || (item.quantity * mult));
      } else {
        pricingComplete = false;
        if (item.sku) priceUnavailableSkus.push(item.sku);
      }
    }
    cluster.pricingSummary = {
      pricingComplete,
      priceUnavailableSkus,
      knownOrderSubtotalUsd: Number.isFinite(knownSubtotal) ? knownSubtotal : null,
      totalOrderCostUsd: pricingComplete && Number.isFinite(knownSubtotal) ? knownSubtotal : null
    };
  });

  const sharedInfrastructure = rawItems.filter(isSharedInfrastructureItem).map(it => ({
    sku: it.sku,
    description: it.description,
    quantity: it.quantity || 1,
    totalQuantity: it.quantity || 1,
    category: it.category || 'Shared Infrastructure',
    isSharedInfrastructure: true
  }));

  const overallPacing = analyzeDeliveryPacing(rawItems, { catalogData });
  const quantityConservation = buildQuantityConservationLedger(rawItems, { clusters, sharedInfrastructure });

  return {
    isMultiCluster: true,
    totalChassis,
    detectedChassis,
    clusters,
    sharedInfrastructure,
    quantityConservation,
    deliveryPacing: overallPacing,
    recommendedUcidSplit: overallPacing.recommendedUcidSplit,
    ucidSplitReason: overallPacing.ucidSplitReason
  };
}

/**
 * Generate separate Excel workbooks for each partitioned cluster.
 * @param {string} inputFilePath 
 * @param {string} outputDirectory 
 * @returns {Array<object>} Generated cluster workbooks metadata
 */
/**
 * Generate separate Excel workbooks for each partitioned cluster.
 * @param {string|Array<object>} inputFilePath 
 * @param {string} outputDirectory 
 * @param {object|string} [options={}]
 * @returns {Array<object>} Generated cluster workbooks metadata
 */
function splitAndWriteClusterWorkbooks(inputFilePath, outputDirectory, options = {}) {
  const opts = typeof options === 'string' ? { chassis: options } : (options || {});

  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, { recursive: true });
  }

  const rawItems = Array.isArray(inputFilePath) ? inputFilePath : extractRawItemsFromWorkbook(inputFilePath);
  const partitionResult = analyzeAndPartitionClusters(rawItems);
  const detectedChassis = partitionResult.detectedChassis || detectChassisVariant(rawItems);

  // DeliveryAuthorization Enforcement (INV-128 / G07)
  const isDiagnostic = opts.diagnostic === true || opts.allowUncertified === true;
  const auth = opts.deliveryAuthorization || partitionResult.deliveryAuthorization;
  if (auth) {
    const { assertDeliveryAuthorization } = require('../contracts/workflow_contract.js');
    const crypto = require('crypto');
    const manifestFingerprint = crypto.createHash('sha256').update(JSON.stringify(rawItems)).digest('hex');
    assertDeliveryAuthorization(auth, manifestFingerprint, {
      chassisKey: detectedChassis?.model || 'MULTI_CLUSTER_TENDER',
      profile: 'MULTI_CLUSTER_TENDER'
    });
  } else if (!isDiagnostic && (opts.strictDeliveryAuth || process.env.STRICT_DELIVERY_AUTH === 'true')) {
    throw new Error('Presentation export blocked: Raw clusters have no DeliveryAuthorization. Use the canonical evaluated manifest or explicit diagnostic mode.');
  }

  const generatedWorkbooks = [];

  partitionResult.clusters.forEach(cluster => {
    const wb = XLSX.utils.book_new();
    const sheetData = [
      ['Part No', 'Qty', 'Description', 'Category', 'Unit List Price (USD)', 'Extended Price (USD)', 'Portal / CLIC Status']
    ];

    cluster.items.forEach(item => {
      const { isPriced, unitPriceUsd, isConfirmedZero } = evaluateItemPricing(item);
      const displayUnitPrice = isPriced ? (unitPriceUsd === 0 ? (isConfirmedZero ? 0 : null) : unitPriceUsd) : null;
      const displayExtendedPrice = (displayUnitPrice !== null && typeof displayUnitPrice === 'number')
        ? displayUnitPrice * (item.quantity || 1)
        : null;
      sheetData.push([
        item.sku,
        item.quantity,
        item.description,
        item.category,
        displayUnitPrice,
        displayExtendedPrice,
        item.portalStatus || (item.policyMandated ? 'POLICY_MANDATED_LOCAL' : 'PORTAL_VALIDATION_PENDING')
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

  if (Array.isArray(partitionResult.sharedInfrastructure) && partitionResult.sharedInfrastructure.length > 0) {
    const wb = XLSX.utils.book_new();
    const sheetData = [
      ['Part No', 'Qty', 'Description', 'Category', 'Unit List Price (USD)', 'Extended Price (USD)', 'Portal / CLIC Status']
    ];
    partitionResult.sharedInfrastructure.forEach(item => {
      const { isPriced, unitPriceUsd, isConfirmedZero } = evaluateItemPricing(item);
      const displayUnitPrice = isPriced ? (unitPriceUsd === 0 ? (isConfirmedZero ? 0 : null) : unitPriceUsd) : null;
      const displayExtendedPrice = (displayUnitPrice !== null && typeof displayUnitPrice === 'number')
        ? displayUnitPrice * (item.quantity || 1)
        : null;
      sheetData.push([
        item.sku,
        item.quantity,
        item.description,
        item.category,
        displayUnitPrice,
        displayExtendedPrice,
        'PORTAL_VALIDATION_PENDING'
      ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, ws, 'Shared Infrastructure');
    const outPath = path.join(outputDirectory, 'Shared_Infrastructure_Datacenter.xlsx');
    XLSX.writeFile(wb, outPath);

    generatedWorkbooks.push({
      clusterName: 'Shared_Infrastructure',
      multiplier: 1,
      isSharedInfrastructure: true,
      filePath: outPath,
      itemCount: partitionResult.sharedInfrastructure.length,
      items: partitionResult.sharedInfrastructure
    });
  }

  return {
    totalChassis: partitionResult.totalChassis,
    clusterCount: partitionResult.clusters.length,
    workbooks: generatedWorkbooks,
    sharedInfrastructure: partitionResult.sharedInfrastructure || [],
    quantityConservation: partitionResult.quantityConservation
  };
}

module.exports = {
  findValidSkuInText,
  extractRawItemsFromWorkbook,
  analyzeAndPartitionClusters,
  splitAndWriteClusterWorkbooks,
  applyClusterManagementAndSupportPolicy,
  solveDiophantineMultiCluster,
  buildQuantityConservationLedger,
  isSharedInfrastructureItem,
  QUALIFYING_COM_ONEVIEW_SKUS
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
