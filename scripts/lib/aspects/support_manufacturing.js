'use strict';
/**
 * scripts/lib/aspects/support_manufacturing.js — Support & Manufacturing Aspect Pre-Check
 */

const { cleanBaseSKU, buildCatalogSkuIndex } = require('../catalog/sku.js');
const { classifyComponentRole } = require('../catalog/product_meta.js');

// Mandatory Process Control License SKUs (e.g. CLIC Rule 81322276)
const VALID_MANAGEMENT_SKUS = new Set([
  'R7A11AAE', // Base COM 3yr SaaS
  'R7A12AAE', // COM 5yr
  'S2E10AAE', // COM 7yr
  'S5E59AAE', // COM Adv 3yr
  'S5E60AAE', // COM Adv 5yr
  'S5E61AAE', // COM Adv 7yr
  'E5Y43A',   // OneView Advanced FIO
  'P8B31A'    // OneView Advanced w/o iLO FIO
]);

// Unsolicited Optional Services & Software (INV-32: Never inject unless explicitly requested)
const UNSOLICITED_OPTIONAL_SERVICE_SKUS = new Set([
  'S1A05A',    // Optional SaaS / Software add-on
  'HA114A1',   // HPE Installation and Startup Service
  'HA114A1 5A6', // HPE ProLiant DL/ML ONS Startup SVC
  'HA124A1',   // HPE Premier Installation Service
  'H7J38A1'    // HPE Implementation Service
]);

function isUnsolicitedOptionalService(sku, description = '') {
  const clean = cleanBaseSKU(sku);
  const desc = (description || '').toLowerCase();
  if (UNSOLICITED_OPTIONAL_SERVICE_SKUS.has(clean) || UNSOLICITED_OPTIONAL_SERVICE_SKUS.has(sku)) {
    return true;
  }
  if (desc.includes('installation and startup') || desc.includes('ons startup svc') || desc.includes('startup service')) {
    return true;
  }
  return false;
}

function parseCpuInfo(desc, qty) {
  let coresPerCpu = 16;
  const coreMatch = desc.match(/(\d+)\s*-?\s*core/i);
  if (coreMatch) {
    coresPerCpu = parseInt(coreMatch[1], 10) || 16;
  }
  return {
    cores: coresPerCpu * qty,
    sockets: qty,
    vmwareTarget: Math.max(16, coresPerCpu) * qty
  };
}

function tallySupportItems(items, catalogData) {
  const skuIndex = buildCatalogSkuIndex(catalogData);
  const tally = {
    hasSupportService: false,
    hasManagementLicense: false,
    hasWindowsServer: false,
    windowsBaseLicenses: 0,
    windowsAddonCores: 0,
    totalUnsolicitedCostUsd: 0,
    hasVmware: false,
    vmwareLicensedCores: 0,
    hasLinux: false,
    linuxSubscriptions: 0,
    dataCartridgeCount: 0,
    cleaningCartridgeCount: 0,
    barcodeLabelCount: 0,
    parsedCpuCores: 0,
    detectedCpuSockets: 0,
    targetVmwareCores: 0,
    unsolicitedOptionalItems: []
  };

  for (const it of items) {
    const desc = (it.description || '').toLowerCase();
    const sku = cleanBaseSKU(it.sku);
    const qty = it.quantity || 1;

    if (isUnsolicitedOptionalService(it.sku, it.description)) {
      const uPrice = parseFloat(String(it.unitPrice || it.price || it['Unit Price (USD)'] || '0').replace(/[\$,]/g, '')) || 0;
      const extPrice = uPrice * qty;
      tally.totalUnsolicitedCostUsd += extPrice;
      tally.unsolicitedOptionalItems.push({
        sku: it.sku,
        description: it.description,
        quantity: qty,
        unitPriceUsd: uPrice,
        extendedPriceUsd: extPrice,
        reason: 'Optional software / startup service not requested by customer (INV-32)'
      });
    }

    let role = classifyComponentRole('', desc);
    const catalogItem = skuIndex.get(sku);
    if (catalogItem) {
      role = classifyComponentRole(catalogItem.parentCategory, desc);
    }

    // Processors
    if (role === 'Processor' || desc.includes('xeon') || desc.includes('epyc') || desc.includes('processor')) {
      const cpu = parseCpuInfo(desc, qty);
      tally.parsedCpuCores += cpu.cores;
      tally.detectedCpuSockets += cpu.sockets;
      tally.targetVmwareCores += cpu.vmwareTarget;
    }

    // Support & Management
    if (role === 'Service & Support' || desc.includes('tech care') || desc.includes('support') || desc.includes('warranty') || /^h[a-z0-9]{6}/i.test(sku)) {
      tally.hasSupportService = true;
    }
    if (VALID_MANAGEMENT_SKUS.has(sku) || desc.includes('compute ops management') || desc.includes('oneview') || desc.includes('com adv')) {
      tally.hasManagementLicense = true;
    }

    // Windows Server
    if (desc.includes('windows server') || desc.includes('win server') || desc.includes('ms ws') || /\bws20(19|22|25)\b/i.test(desc)) {
      tally.hasWindowsServer = true;
      if (desc.includes('16-core') || desc.includes('16 core') || desc.includes('base')) {
        tally.windowsBaseLicenses += qty;
      }
      if (desc.includes('additional core') || desc.includes('add-on') || desc.includes('2-core') || desc.includes('4-core')) {
        const addonMatch = desc.match(/(\d+)\s*-?\s*core/i);
        const coresInPack = addonMatch ? parseInt(addonMatch[1], 10) : 16;
        tally.windowsAddonCores += (coresInPack * qty);
      }
    }

    // VMware
    if (desc.includes('vmware')) {
      tally.hasVmware = true;
      const vmwareCoreMatch = desc.match(/(\d+)\s*-?\s*core/i);
      tally.vmwareLicensedCores += vmwareCoreMatch ? (parseInt(vmwareCoreMatch[1], 10) * qty) : (desc.includes('core') ? qty : 0);
    }

    // Linux
    if (desc.includes('rhel') || desc.includes('red hat') || desc.includes('sles') || desc.includes('suse')) {
      tally.hasLinux = true;
      tally.linuxSubscriptions += qty;
    }

    // Tape Media
    if ((desc.includes('lto-') || desc.includes('ultrium')) && (desc.includes('data cartridge') || desc.includes('rw data') || desc.includes('rw custom') || desc.includes('non custom'))) {
      tally.dataCartridgeCount += qty;
    }
    if (sku === 'C7978A' || desc.includes('universal cleaning') || desc.includes('cleaning cartridge')) {
      tally.cleaningCartridgeCount += qty;
    }
    if (desc.includes('bar code label') || desc.includes('barcode label') || desc.includes('label pack') || sku === 'Q2014A') {
      tally.barcodeLabelCount += qty;
    }
  }

  return tally;
}

function computeWindowsLicensing(nodes, detectedCpuCores, windowsBaseLicenses, windowsAddonCores, hasWindowsServer) {
  const minClusterWindowsCores = 16 * nodes;
  const requiredWindowsCores = Math.max(minClusterWindowsCores, detectedCpuCores || minClusterWindowsCores);
  const totalCoveredWindowsCores = (windowsBaseLicenses * 16) + windowsAddonCores;
  const isWindowsLicenseUnderprovisioned = hasWindowsServer && (windowsBaseLicenses < nodes || totalCoveredWindowsCores < requiredWindowsCores);
  const missingCoreLicenses = isWindowsLicenseUnderprovisioned ? Math.max(0, requiredWindowsCores - totalCoveredWindowsCores) : 0;

  return {
    requiredWindowsCores,
    totalCoveredWindowsCores,
    isWindowsLicenseUnderprovisioned,
    needsAdditionalWindowsCores: isWindowsLicenseUnderprovisioned,
    missingCoreLicenses
  };
}

function computeVmwareLicensing(targetVmwareCores, detectedCpuSockets, vmwareLicensedCores, hasVmware) {
  const requiredVmwareCores = targetVmwareCores || Math.max(16, (detectedCpuSockets || 1) * 16);
  const isVmwareLicenseUnderprovisioned = hasVmware && (vmwareLicensedCores < requiredVmwareCores);
  const missingVmwareCores = isVmwareLicenseUnderprovisioned ? Math.max(0, requiredVmwareCores - vmwareLicensedCores) : 0;

  return {
    requiredVmwareCores,
    isVmwareLicenseUnderprovisioned,
    needsAdditionalVmwareCores: isVmwareLicenseUnderprovisioned,
    missingVmwareCores
  };
}

function computeLinuxLicensing(detectedCpuSockets, linuxSubscriptions, hasLinux) {
  const requiredLinuxSubscriptions = Math.ceil((detectedCpuSockets || 1) / 2);
  const isLinuxSubscriptionUnderprovisioned = hasLinux && (linuxSubscriptions < requiredLinuxSubscriptions);
  const missingLinuxSubscriptions = isLinuxSubscriptionUnderprovisioned ? Math.max(0, requiredLinuxSubscriptions - linuxSubscriptions) : 0;

  return {
    requiredLinuxSubscriptions,
    isLinuxSubscriptionUnderprovisioned,
    needsAdditionalLinuxSubscriptions: isLinuxSubscriptionUnderprovisioned,
    missingLinuxSubscriptions
  };
}

function computeTapeAutomationMath(dataCartridgeCount, cleaningCartridgeCount, barcodeLabelCount) {
  const expectedCleaningCartridges = dataCartridgeCount > 0 ? Math.ceil(dataCartridgeCount / 20) : 0;
  const needsMoreCleaningCartridges = cleaningCartridgeCount < expectedCleaningCartridges;
  const missingCleaningCartridges = Math.max(0, expectedCleaningCartridges - cleaningCartridgeCount);

  const expectedBarcodeLabels = dataCartridgeCount > 0 ? Math.ceil(dataCartridgeCount / 100) : 0;
  const needsMoreBarcodeLabels = barcodeLabelCount < expectedBarcodeLabels;
  const missingBarcodeLabels = Math.max(0, expectedBarcodeLabels - barcodeLabelCount);

  return {
    expectedCleaningCartridges,
    needsMoreCleaningCartridges,
    missingCleaningCartridges,
    expectedBarcodeLabels,
    needsMoreBarcodeLabels,
    missingBarcodeLabels
  };
}

function evalSupportManufacturing(items, catalogData = null, totalSocketCores = 0, serverCount = 1) {
  const nodes = Math.max(1, parseInt(serverCount, 10) || 1);
  const t = tallySupportItems(items, catalogData);

  const detectedCpuCores = t.parsedCpuCores > 0 ? t.parsedCpuCores : (totalSocketCores || 0);
  const win = computeWindowsLicensing(nodes, detectedCpuCores, t.windowsBaseLicenses, t.windowsAddonCores, t.hasWindowsServer);
  const vmware = computeVmwareLicensing(t.targetVmwareCores, t.detectedCpuSockets, t.vmwareLicensedCores, t.hasVmware);
  const linux = computeLinuxLicensing(t.detectedCpuSockets, t.linuxSubscriptions, t.hasLinux);
  const tape = computeTapeAutomationMath(t.dataCartridgeCount, t.cleaningCartridgeCount, t.barcodeLabelCount);

  return {
    hasSupportService: t.hasSupportService,
    hasManagementLicense: t.hasManagementLicense,
    hasWindowsServer: t.hasWindowsServer,
    windowsBaseLicenses: t.windowsBaseLicenses,
    windowsAddonCores: t.windowsAddonCores,
    totalCoveredWindowsCores: win.totalCoveredWindowsCores,
    totalWindowsLicensedCores: win.totalCoveredWindowsCores,
    requiredWindowsCores: win.requiredWindowsCores,
    isWindowsLicenseUnderprovisioned: win.isWindowsLicenseUnderprovisioned,
    needsAdditionalWindowsCores: win.needsAdditionalWindowsCores,
    missingCoreLicenses: win.missingCoreLicenses,
    
    detectedCpuCores: win.requiredWindowsCores,
    targetCores: win.requiredWindowsCores,
    detectedCpuSockets: Math.max(1, t.detectedCpuSockets),
    targetCpuSockets: Math.max(1, t.detectedCpuSockets),
    
    hasVmware: t.hasVmware,
    vmwareLicensedCores: t.vmwareLicensedCores,
    requiredVmwareCores: vmware.requiredVmwareCores,
    targetVmwareCores: vmware.requiredVmwareCores,
    isVmwareLicenseUnderprovisioned: vmware.isVmwareLicenseUnderprovisioned,
    needsAdditionalVmwareCores: vmware.needsAdditionalVmwareCores,
    missingVmwareCores: vmware.missingVmwareCores,
    
    hasLinux: t.hasLinux,
    linuxSubscriptions: t.linuxSubscriptions,
    requiredLinuxSubscriptions: linux.requiredLinuxSubscriptions,
    targetLinuxSubscriptions: linux.requiredLinuxSubscriptions,
    isLinuxSubscriptionUnderprovisioned: linux.isLinuxSubscriptionUnderprovisioned,
    needsAdditionalLinuxSubscriptions: linux.needsAdditionalLinuxSubscriptions,
    missingLinuxSubscriptions: linux.missingLinuxSubscriptions,
    
    dataCartridgeCount: t.dataCartridgeCount,
    cleaningCartridgeCount: t.cleaningCartridgeCount,
    expectedCleaningCartridges: tape.expectedCleaningCartridges,
    needsMoreCleaningCartridges: tape.needsMoreCleaningCartridges,
    missingCleaningCartridges: tape.missingCleaningCartridges,
    barcodeLabelCount: t.barcodeLabelCount,
    expectedBarcodeLabels: tape.expectedBarcodeLabels,
    needsMoreBarcodeLabels: tape.needsMoreBarcodeLabels,
    missingBarcodeLabels: tape.missingBarcodeLabels,
    
    unsolicitedOptionalItems: t.unsolicitedOptionalItems,
    totalUnsolicitedCostUsd: t.totalUnsolicitedCostUsd,
    serverCount: nodes,
    defaultSupportSku: 'HU4B2A3',
    defaultManagementSku: 'R7A11AAE'
  };
}

module.exports = {
  evalSupportManufacturing,
  isUnsolicitedOptionalService,
  VALID_MANAGEMENT_SKUS,
  UNSOLICITED_OPTIONAL_SERVICE_SKUS
};

