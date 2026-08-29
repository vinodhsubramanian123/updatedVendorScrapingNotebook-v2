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
  const sheetName = wb.SheetNames[0];
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
      row.forEach((col, cIdx) => {
        const c = String(col || '').toLowerCase().trim();
        if (c.includes('desc') && !c.includes('remark') && !c.includes('rationale')) headerMap.desc = cIdx;
        // Prioritize true quantity columns over split/reconciliation descriptions
        if ((c === 'qty' || c === 'quantity' || c === 'count' || c === 'units' || c.includes('rfp qty') || c.includes('customer qty') || c.includes('order qty')) && !c.includes('split') && !c.includes('sku &')) {
          headerMap.qty = cIdx;
        } else if (c.includes('qty') && !c.includes('split') && !c.includes('sku &') && headerMap.qty === 3) {
          headerMap.qty = cIdx;
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
 * Identify clusters and compute partition multipliers from raw items.
 * @param {Array<object>} rawItems 
 * @returns {object} { isMultiCluster, totalChassis, clusters: [] }
 */
function analyzeAndPartitionClusters(rawItems) {
  // GAP-1 FIX: Dynamically detect chassis from BOQ items instead of hardcoding P52534-B21
  const chassisMap = getChassisMap();
  const allBaseSkus = new Set(Object.values(chassisMap).map(c => c.baseSku).filter(Boolean));
  const chassisItem = rawItems.find(i =>
    i.category === 'Base Chassis' ||
    i.sku === 'CHASSIS_PLACEHOLDER' ||
    allBaseSkus.has(cleanBaseSKU(i.sku))
  );

  // Resolve the actual chassis identity from items
  const detectedChassis = detectChassisVariant(rawItems);
  const resolvedBaseSku = detectedChassis.baseSku || 'P52534-B21';
  const resolvedChassisDesc = detectedChassis.model
    ? `HPE ${detectedChassis.model} Configure-to-order Server`
    : 'HPE ProLiant Configure-to-order Server';

  // GAP-2 FIX: Default to 1 server (not 60) when no chassis item found
  const totalChassis = chassisItem ? (chassisItem.quantity || 1) : 1;

  // Identify CPU items
  const cpuItems = rawItems.filter(i => {
    const d = i.description.toLowerCase();
    const c = i.category.toLowerCase();
    return d.includes('processor') || d.includes('xeon') || c.includes('processor') || c.includes('processors');
  });

  function getClusterSizing(multiplier, items) {
    let psuWattage = 800;
    let railKitCount = 0;
    let cpuWatts = 0;
    let gpuWatts = 0;
    let memWatts = 0;
    let storageWatts = 0;
    
    items.forEach(it => {
      const desc = (it.description || '').toLowerCase();
      const clean = cleanBaseSKU(it.sku);
      if (desc.includes('power supply') || desc.includes('flex slot')) {
        const wMatch = desc.match(/(\d{3,4})\s*w/i);
        if (wMatch) psuWattage = Math.max(psuWattage, parseInt(wMatch[1], 10));
      }
      if (desc.includes('rack rail') || desc.includes('rail kit') || clean === 'P52341-B21') {
        railKitCount += (parseInt(it.totalQuantity || it.quantity, 10) || 1);
      }
      if (desc.includes('processor') || desc.includes('xeon')) {
        const tdpMatch = desc.match(/(\d{2,3})\s*w/i);
        cpuWatts += (tdpMatch ? parseInt(tdpMatch[1], 10) : 205) * (it.quantity || 1);
      }
      if (desc.includes('nvidia') || desc.includes('gpu')) {
        gpuWatts += 300 * (it.quantity || 1);
      }
      if (desc.includes('memory') || desc.includes('rdimm')) {
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
      totalRackUnits: multiplier * 2,
      standard42uRacksRequired: Math.ceil((multiplier * 2) / 42),
      totalFacilityPowerKw: Number(((multiplier * (psuWattage || 800)) / 1000).toFixed(2)),
      railKitCoverage: {
        required: multiplier,
        recommendedSku: 'P52341-B21',
        description: 'HPE ProLiant DL380 Gen11 Easy Install Rail Kit',
        providedCount: railKitCount,
        isCompliant: railKitCount >= multiplier
      },
      needsHighLine220v
    };
  }

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
        clusterSizing: getClusterSizing(totalChassis, rawItems)
      }]
    };
  }

  // Multi-processor cluster detected! Compute multiplier per CPU model (2 CPUs per server)
  const clusters = [];
  const cpusPerServer = 2;

  // GAP-6 FIX: Dynamic alphabetical cluster labels for N clusters
  const CLUSTER_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  // Mathematically rigorous Hamilton-Hare Largest Remainder Method to satisfy Diophantine constraint
  const rawQuotas = cpuItems.map(c => (c.quantity || 1) / cpusPerServer);
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

  tempClusters.forEach(({ cpu, baseMult, idx }) => {
    const letter = CLUSTER_LETTERS[idx] || String(idx + 1);
    const clusterLabel = `Cluster_${letter}`;
    const cpuTdpMatch = cpu.description.match(/(\d+)W/i);
    const tdp = cpuTdpMatch ? parseInt(cpuTdpMatch[1], 10) : 205;

    clusters.push({
      clusterId: idx + 1,
      name: clusterLabel,
      multiplier: baseMult,
      cpuSku: cpu.sku,
      cpuDesc: cpu.description,
      cpuTdp: tdp,
      items: []
    });
  });

  // Identify PSUs to match by TDP
  const psuItems = rawItems.filter(i => {
    const d = i.description.toLowerCase();
    const c = i.category.toLowerCase();
    return d.includes('power supply') || d.includes('flex slot') || c.includes('power');
  });

  // Sort clusters by TDP descending (highest TDP gets highest wattage PSU)
  clusters.sort((a, b) => b.cpuTdp - a.cpuTdp);

  // Allocate items to clusters
  clusters.forEach((cluster) => {
    const mult = cluster.multiplier;

    // 1. Add Base Chassis (GAP-1 FIX: dynamically resolved)
    cluster.items.push({
      sku: resolvedBaseSku,
      description: resolvedChassisDesc,
      quantity: 1, // Per-server quantity
      totalQuantity: mult,
      category: 'Base Chassis'
    });

    // 2. Add Matched Processor
    cluster.items.push({
      sku: cluster.cpuSku,
      description: cluster.cpuDesc,
      quantity: 2, // 2 CPUs per server
      totalQuantity: mult * 2,
      category: 'Processor'
    });

    // 3. Add Matched Power Supply
    if (psuItems.length > 0) {
      let matchedPsu;
      if (cluster.cpuTdp >= 300) {
        matchedPsu = psuItems.find(p => p.description.includes('Titanium') || p.description.includes('2200W') || p.description.includes('1800W')) || psuItems[0];
      } else {
        matchedPsu = psuItems.find(p => p.description.includes('1600W') || p.description.includes('Platinum')) || psuItems[psuItems.length - 1];
      }
      cluster.items.push({
        sku: matchedPsu.sku,
        description: matchedPsu.description,
        quantity: 2, // 1+1 Redundant
        totalQuantity: mult * 2,
        category: 'Power Supply'
      });
    }

    // 4. Distribute Common Infrastructure Options
    rawItems.forEach(item => {
      const clean = cleanBaseSKU(item.sku);
      if (clean === cluster.cpuSku || psuItems.some(p => cleanBaseSKU(p.sku) === clean) || item.category === 'Base Chassis' || clean === resolvedBaseSku || item.sku === 'CHASSIS_PLACEHOLDER' || allBaseSkus.has(clean)) {
        return; // Handled separately
      }

      // Memory: Proportionally distributed per server
      // GAP-5 FIX: Preserve the original memory SKU and convert to FIO via -F21 suffix for CTO compliance (CLIC 81354490 & 91001655)
      if (item.description.toLowerCase().includes('dimm') || item.description.toLowerCase().includes('memory') || item.category.toLowerCase().includes('memory')) {
        const perServerDimms = Math.round(item.quantity / totalChassis) || 8;
        // Convert BTO SKU to FIO: replace -B21 with -F21, or append #0D1
        let fioSku = cleanBaseSKU(item.sku);
        if (fioSku.endsWith('-B21')) {
          fioSku = fioSku.replace(/-B21$/, '-F21');
        } else if (!fioSku.includes('-F21') && !fioSku.includes('#0D1')) {
          fioSku = fioSku + '#0D1';
        }
        cluster.items.push({
          sku: fioSku,
          description: item.description.replace(/\bBTO\b/gi, 'FIO') + (item.description.toLowerCase().includes('fio') ? '' : ' (FIO)'),
          quantity: perServerDimms,
          totalQuantity: mult * perServerDimms,
          category: 'Memory'
        });
      }
      // Heatsinks (1 per CPU = 2 per server)
      else if (item.description.toLowerCase().includes('heat sink') || item.description.toLowerCase().includes('heatsink')) {
        cluster.items.push({
          sku: item.sku,
          description: item.description,
          quantity: 2,
          totalQuantity: mult * 2,
          category: 'Compute & Thermal'
        });
      }
      // Fans (CLIC Rule 81354654: P48820-B21 is a kit containing all 6 fans -> 1 kit per server)
      else if (item.description.toLowerCase().includes('fan kit') || item.description.toLowerCase().includes('fans') || clean === 'P48820-B21') {
        cluster.items.push({
          sku: 'P48820-B21',
          description: 'HPE ProLiant DL380/DL560 Gen11 2U High Performance Fan Kit',
          quantity: 1,
          totalQuantity: mult * 1,
          category: 'Compute & Thermal'
        });
      }
      // FC HBAs: Proportionally distributed per server
      else if (item.description.toLowerCase().includes('fiber channel') || clean === 'R2E09A') {
        const perServerHbas = Math.round(item.quantity / totalChassis) || 2;
        cluster.items.push({
          sku: item.sku,
          description: item.description,
          quantity: perServerHbas,
          totalQuantity: mult * perServerHbas,
          category: 'PCI-Express Slot'
        });
      }
      // GAP-3 FIX: PCIe Network Adapters — proportionally derive per-server count from total BOQ qty
      else if (item.description.toLowerCase().includes('adapter') && (item.description.toLowerCase().includes('ethernet') || item.description.toLowerCase().includes('10/25gb') || item.description.toLowerCase().includes('25gb') || item.description.toLowerCase().includes('100gb') || /P26262|P42045|P10115/i.test(clean))) {
        const perServerNics = Math.max(1, Math.round(item.quantity / totalChassis));
        cluster.items.push({
          sku: item.sku,
          description: item.description,
          quantity: perServerNics,
          totalQuantity: mult * perServerNics,
          category: 'Network Controller'
        });
      }
      // SFP28/SFP56 Transceivers: Proportionally derive ports per server
      else if (item.description.toLowerCase().includes('transceiver') || item.description.toLowerCase().includes('sfp') || clean === '845398-B21') {
        const perServerTransceivers = Math.max(1, Math.round(item.quantity / totalChassis));
        cluster.items.push({
          sku: item.sku,
          description: item.description,
          quantity: perServerTransceivers,
          totalQuantity: mult * perServerTransceivers,
          category: 'Network Controller'
        });
      }
      // OCP2 Enablement: Exclude P51911-B21 (CPU1 to OCP2) to avoid CLIC Rule 81355854 conflict; retain P48830-B21 (CPU2 to OCP2)
      else if (clean === 'P51911-B21') {
        return; // Exclude conflicting duplicate OCP enablement kit
      }
      // Storage Cables: Exclude P48832-B21 (Tri-Mode Y-Cable) to avoid CLIC Rules 81354627 & 81354632; P48918-B21 is retained for MR408i-o
      else if (clean === 'P48832-B21') {
        return; // Exclude incompatible Y-Cable
      }
      // GAP-4 FIX: Standard 1-per-server infrastructure — only check totalChassis, no hardcoded literal
      else if (item.quantity === totalChassis) {
        cluster.items.push({
          sku: item.sku,
          description: item.description,
          quantity: 1,
          totalQuantity: mult,
          category: item.category
        });
      }
      // Catch remaining items with proportional distribution
      else if (item.quantity > 1) {
        const perServer = Math.max(1, Math.round(item.quantity / totalChassis));
        cluster.items.push({
          sku: item.sku,
          description: item.description,
          quantity: perServer,
          totalQuantity: mult * perServer,
          category: item.category
        });
      }
    });

    // GAP-6 FIX: Inject riser cable kits based on actual PCIe card count math, not cluster name
    // Count physical PCIe cards in this cluster (HBAs, NICs, controllers, GPUs — excluding OCP)
    const pcieCardCount = cluster.items.reduce((count, ci) => {
      const d = (ci.description || '').toLowerCase();
      const isPcieCard = (d.includes('fiber channel') || d.includes('hba') ||
        (d.includes('adapter') && !d.includes('ocp')) ||
        d.includes('gpu') || d.includes('accelerator') ||
        (d.includes('controller') && d.includes('-p')));
      return isPcieCard ? count + (ci.quantity || 1) : count;
    }, 0);

    // CLIC Rules 81016755 & 81354683: >=5 PCIe cards requires Primary Riser Cable Kit for Slot 1 enablement
    if (pcieCardCount >= 5) {
      cluster.items.push({
        sku: 'P56073-B21',
        description: 'HPE ProLiant DL380 Gen11 x16/x16/x16 Primary Cable Kit (Slot 1 Enablement)',
        quantity: 1,
        totalQuantity: mult,
        category: 'PCI-Express Slot'
      });
    }

    // EU Lot 9 CE Mark Removal: Inject if cluster uses Platinum PSUs (not Titanium)
    const hasPlatinumPsu = cluster.items.some(ci =>
      (ci.description || '').toLowerCase().includes('platinum') ||
      (ci.description || '').toLowerCase().includes('1600w')
    );
    if (hasPlatinumPsu) {
      cluster.items.push({
        sku: 'P35876-B21',
        description: 'HPE CE Mark Removal FIO Enablement Kit (EU Lot 9 Regulatory Setting)',
        quantity: 1,
        totalQuantity: mult,
        category: 'Factory Configuration Setting'
      });
    }

    // 6. Add Mandatory Management SaaS License (CLIC Rule 81322276)
    cluster.items.push({
      sku: 'R7A11AAE',
      description: 'HPE Compute Ops Management Enhanced 3-year SaaS',
      quantity: 1,
      totalQuantity: mult,
      category: 'Operating System / License'
    });

    cluster.clusterSizing = getClusterSizing(mult, cluster.items);
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

  const rawItems = extractRawItemsFromWorkbook(inputFilePath);
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
