'use strict';
/**
 * scripts/lib/aspects/support_manufacturing.js — Support & Manufacturing Aspect Pre-Check
 */

const { cleanBaseSKU } = require('../catalog/sku.js');
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

function evalSupportManufacturing(items, catalogData = null, totalSocketCores = 0) {
  let hasSupportService = false;
  let hasManagementLicense = false;
  let hasWindowsServer = false;
  let windowsBaseLicenses = 0;
  let windowsAddonCores = 0;

  let hasVmware = false;
  let vmwareLicensedCores = 0;

  let hasLinux = false;
  let linuxSubscriptions = 0;

  let detectedCpuCores = totalSocketCores;
  let detectedCpuSockets = 0;
  let targetVmwareCores = 0;

  const unsolicitedOptionalItems = [];

  for (const it of items) {
    const desc = (it.description || '').toLowerCase();
    const sku = cleanBaseSKU(it.sku);

    if (isUnsolicitedOptionalService(it.sku, it.description)) {
      unsolicitedOptionalItems.push({
        sku: it.sku,
        description: it.description,
        reason: 'Optional software / startup service not requested by customer (INV-32)'
      });
    }

    let role = classifyComponentRole('', desc);
    if (catalogData && catalogData.entries) {
      const match = catalogData.entries.find(e => e.skus && e.skus.find(s => cleanBaseSKU(s['Product #']) === sku));
      if (match) role = classifyComponentRole(match.parentCategory, desc);
    }

    // Extract CPU core count and sockets if not passed
    if (role === 'Processor' || desc.includes('xeon') || desc.includes('epyc') || desc.includes('processor')) {
      let coresPerCpu = 16; // default 16
      const coreMatch = desc.match(/(\d+)\s*-?\s*core/i);
      if (coreMatch) {
        coresPerCpu = parseInt(coreMatch[1], 10) || 16;
      }
      detectedCpuCores += (coresPerCpu * (it.quantity || 1));
      detectedCpuSockets += (it.quantity || 1);
      targetVmwareCores += (Math.max(16, coresPerCpu) * (it.quantity || 1));
    }

    if (role === 'Service & Support' || desc.includes('tech care') || desc.includes('support') || desc.includes('warranty') || /^h[a-z0-9]{6}/i.test(sku)) {
      hasSupportService = true;
    }

    if (VALID_MANAGEMENT_SKUS.has(sku) || desc.includes('compute ops management') || desc.includes('oneview') || desc.includes('com adv')) {
      hasManagementLicense = true;
    }

    // Windows Server Core Licensing
    if (desc.includes('windows server') || desc.includes('win server')) {
      hasWindowsServer = true;
      if (desc.includes('16-core') || desc.includes('16 core') || desc.includes('base')) {
        windowsBaseLicenses += (it.quantity || 1);
      }
      if (desc.includes('additional core') || desc.includes('add-on') || desc.includes('2-core') || desc.includes('4-core')) {
        const addonMatch = desc.match(/(\d+)\s*-?\s*core/i);
        const coresInPack = addonMatch ? parseInt(addonMatch[1], 10) : 16;
        windowsAddonCores += (coresInPack * (it.quantity || 1));
      }
    }

    // VMware Core Licensing
    if (desc.includes('vmware')) {
      hasVmware = true;
      const vmwareCoreMatch = desc.match(/(\d+)\s*-?\s*core/i);
      if (vmwareCoreMatch) {
        vmwareLicensedCores += (parseInt(vmwareCoreMatch[1], 10) * (it.quantity || 1));
      } else if (desc.includes('core')) {
        vmwareLicensedCores += (it.quantity || 1);
      }
    }

    // Linux (RHEL / SLES) Licensing
    if (desc.includes('rhel') || desc.includes('red hat') || desc.includes('sles') || desc.includes('suse')) {
      hasLinux = true;
      linuxSubscriptions += (it.quantity || 1);
    }
  }

  // Windows Server Core Licensing Math:
  // Requires minimum 16 cores per physical server. If CPU cores > 16, additional core packs are mandatory.
  const totalWindowsLicensedCores = (windowsBaseLicenses * 16) + windowsAddonCores;
  const targetCores = Math.max(16, detectedCpuCores || 16);
  const needsAdditionalWindowsCores = hasWindowsServer && totalWindowsLicensedCores < targetCores;
  const missingCoreLicenses = needsAdditionalWindowsCores ? (targetCores - totalWindowsLicensedCores) : 0;

  // VMware vSphere/Cloud Foundation Math:
  // Requires minimum 16 cores per socket across single and dual socket.
  if (targetVmwareCores === 0) {
    targetVmwareCores = Math.max(16, totalSocketCores || 16); // Fallback if no CPUs explicitly listed
  }
  const needsAdditionalVmwareCores = hasVmware && (vmwareLicensedCores < targetVmwareCores);
  const missingVmwareCores = needsAdditionalVmwareCores ? (targetVmwareCores - vmwareLicensedCores) : 0;

  // Linux Math: 1-2 sockets per subscription
  const targetCpuSockets = Math.max(1, detectedCpuSockets);
  const targetLinuxSubscriptions = Math.ceil(targetCpuSockets / 2);
  const needsAdditionalLinuxSubscriptions = hasLinux && (linuxSubscriptions < targetLinuxSubscriptions);
  const missingLinuxSubscriptions = needsAdditionalLinuxSubscriptions ? (targetLinuxSubscriptions - linuxSubscriptions) : 0;

  return {
    hasSupportService,
    hasManagementLicense,
    hasWindowsServer,
    detectedCpuCores: targetCores,
    totalWindowsLicensedCores,
    needsAdditionalWindowsCores,
    missingCoreLicenses,

    detectedCpuSockets: targetCpuSockets,

    hasVmware,
    vmwareLicensedCores,
    targetVmwareCores,
    needsAdditionalVmwareCores,
    missingVmwareCores,

    hasLinux,
    linuxSubscriptions,
    targetLinuxSubscriptions,
    needsAdditionalLinuxSubscriptions,
    missingLinuxSubscriptions,

    unsolicitedOptionalItems,
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
