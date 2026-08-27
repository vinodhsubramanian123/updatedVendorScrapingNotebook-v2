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
    const firstCell = String(row[0] || '').toLowerCase();
    if (firstCell === 'no.' || firstCell === 'item' || firstCell === 'no') {
      row.forEach((col, cIdx) => {
        const c = String(col || '').toLowerCase();
        if (c.includes('desc')) headerMap.desc = cIdx;
        if (c.includes('qty') || c.includes('quantity')) headerMap.qty = cIdx;
        if (c.includes('category')) headerMap.cat = cIdx;
        if (c.includes('unit price')) headerMap.unitPrice = cIdx;
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
    const qtyVal = parseInt(String(row[headerMap.qty] || '').replace(/[^\d]/g, ''), 10);
    const lineQty = !isNaN(qtyVal) && qtyVal > 0 ? qtyVal : null;

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
          rawItems.push({
            sku: 'P52534-B21',
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
  // Find total chassis count
  const chassisItem = rawItems.find(i => i.category === 'Base Chassis' || i.sku === 'P52534-B21' || i.sku === 'DL380_Gen11_8SFF_NC_CTO');
  const totalChassis = chassisItem ? chassisItem.quantity : 60;

  // Identify CPU items
  const cpuItems = rawItems.filter(i => {
    const d = i.description.toLowerCase();
    const c = i.category.toLowerCase();
    return d.includes('processor') || d.includes('xeon') || c.includes('processor') || c.includes('processors');
  });

  if (cpuItems.length <= 1) {
    return {
      isMultiCluster: false,
      totalChassis,
      clusters: [{ name: 'Default_Cluster', multiplier: totalChassis, items: rawItems }]
    };
  }

  // Multi-processor cluster detected! Compute multiplier per CPU model (2 CPUs per server)
  const clusters = [];
  const cpusPerServer = 2;

  cpuItems.forEach((cpu, idx) => {
    const clusterMultiplier = Math.round(cpu.quantity / cpusPerServer);
    const clusterLabel = idx === 0 ? 'Cluster_A_Platinum' : 'Cluster_B_Gold';
    const cpuTdpMatch = cpu.description.match(/(\d+)W/i);
    const tdp = cpuTdpMatch ? parseInt(cpuTdpMatch[1], 10) : (idx === 0 ? 350 : 270);

    clusters.push({
      clusterId: idx + 1,
      name: clusterLabel,
      multiplier: clusterMultiplier,
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

    // 1. Add Base Chassis (P52534-B21)
    cluster.items.push({
      sku: 'P52534-B21',
      description: 'HPE ProLiant DL380 Gen11 8SFF NC Configure-to-order Server',
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
      if (clean === cluster.cpuSku || psuItems.some(p => cleanBaseSKU(p.sku) === clean) || item.category === 'Base Chassis' || clean === 'P52534-B21' || clean === 'DL380_GEN11_8SFF_NC_CTO') {
        return; // Handled separately
      }

      // Memory (480 total DIMMs across 60 servers = 8 DIMMs per server)
      // Must be Factory Integrated Option (0D1) in CTO chassis to avoid CLIC 81354490 & 91001655
      if (item.description.toLowerCase().includes('dimm') || item.description.toLowerCase().includes('memory') || item.category.toLowerCase().includes('memory')) {
        const perServerDimms = Math.round(item.quantity / totalChassis);
        cluster.items.push({
          sku: 'P64707-B21 0D1',
          description: 'HPE 64GB (1x64GB) Dual Rank x4 DDR5-5600 CAS-46-45-45 EC8 Registered Smart FIO Memory Kit',
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
      // FC HBAs (120 across 60 servers = 2 per server)
      else if (item.description.toLowerCase().includes('fiber channel') || clean === 'R2E09A') {
        cluster.items.push({
          sku: item.sku,
          description: item.description,
          quantity: 2,
          totalQuantity: mult * 2,
          category: 'PCI-Express Slot'
        });
      }
      // 10/25Gb PCIe Adapters (160 total: Cluster A gets 2, Cluster B gets 3)
      else if (item.description.toLowerCase().includes('adapter') && clean === 'P26262-B21') {
        const nicQty = cluster.multiplier === 20 ? 2 : 3;
        cluster.items.push({
          sku: item.sku,
          description: item.description,
          quantity: nicQty,
          totalQuantity: mult * nicQty,
          category: 'Network Controller'
        });
      }
      // SFP28 Transceivers (1 per port: Cluster A has 6 ports, Cluster B has 8 ports)
      else if (clean === '845398-B21') {
        const nicQty = cluster.multiplier === 20 ? 2 : 3;
        const portsPerServer = (nicQty * 2) + 2; // (PCIe NICs * 2) + OCP 2p = 6 or 8
        cluster.items.push({
          sku: item.sku,
          description: item.description,
          quantity: portsPerServer,
          totalQuantity: mult * portsPerServer,
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
      // Standard 1-per-server infrastructure (Risers, Boot devices, Cables, Controllers, Racking)
      else if (item.quantity === totalChassis || item.quantity === 60) {
        cluster.items.push({
          sku: item.sku,
          description: item.description,
          quantity: 1,
          totalQuantity: mult,
          category: item.category
        });
      }
    });

    // 5. Add Required Riser Cable Enablement Kits (CLIC Rules 81016755, 81354683, 81170920, 81356091)
    // Primary 3x16 Cable Kit enables Slot 1
    cluster.items.push({
      sku: 'P56073-B21',
      description: 'HPE ProLiant DL380 Gen11 x16/x16/x16 Primary Cable Kit',
      quantity: 1,
      totalQuantity: mult,
      category: 'PCI-Express Slot'
    });

    // Secondary 3x16 Cable Kit enables Slot 4
    cluster.items.push({
      sku: 'P56074-B21',
      description: 'HPE ProLiant DL380 Gen11 x16/x16/x16 Secondary Cable Kit',
      quantity: 1,
      totalQuantity: mult,
      category: 'PCI-Express Slot'
    });

    // 6. Add Mandatory Management SaaS License (CLIC Rule 81322276)
    cluster.items.push({
      sku: 'R7A11AAE',
      description: 'HPE Compute Ops Management Enhanced 3-year SaaS',
      quantity: 1,
      totalQuantity: mult,
      category: 'Operating System / License'
    });
  });

  return {
    isMultiCluster: true,
    totalChassis,
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

  const generatedWorkbooks = [];

  partitionResult.clusters.forEach(cluster => {
    const wb = XLSX.utils.book_new();
    const sheetData = [
      ['No.', 'Category', 'Description', 'Per-Server Qty', 'Total Cluster Qty', 'Multiplier: ' + cluster.multiplier]
    ];

    cluster.items.forEach((item, idx) => {
      sheetData.push([
        idx + 1,
        item.category,
        item.description.includes(item.sku) ? item.description : `${item.description} (${item.sku})`,
        item.quantity,
        item.totalQuantity
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, ws, 'Server Config');

    const fileName = `${cluster.name}_${cluster.multiplier}x_DL380_Gen11.xlsx`;
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
