'use strict';
/**
 * scripts/lib/conflict/resource_arbitrator_remediation.js
 *
 * Extracted form-factor dual taxonomy resolution, OCP slot contention remediation,
 * rear boot bay arbitration, and self-correction trail builder for resource_arbitrator.js.
 */

const fs = require('fs');
const path = require('path');
const { cleanBaseSKU } = require('../catalog/sku.js');
const logger = require('../system/pipeline_logger.js');

let _chassisMapRaw = null;
function getChassisMapRaw() {
  if (_chassisMapRaw) return _chassisMapRaw;
  try {
    const mapPath = path.join(__dirname, '..', '..', 'config', 'chassis_map.json');
    if (fs.existsSync(mapPath)) {
      _chassisMapRaw = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    }
  } catch (err) {
    logger.warn('RESOURCE_ARBITRATOR', `Failed reading chassis_map.json: ${err.message}`);
  }
  return _chassisMapRaw || {};
}

const DEFAULT_FORM_FACTOR_DUALS = [
  {
    role: 'Storage Controller',
    ocpRegex: /\b(mr|sr)\d{3}i-o\b/i,
    pcieRegex: /\b(mr|sr)\d{3}i-p\b/i,
    ocpCableRegex: /\b(storage controller enablement|controller enablement|cpu\d to ocp|direct attach)\b/i,
    pcieCableRegex: /\b(tri-mode splitter|pcie box|riser to drive cage|splitter cable)\b/i,
    defaultPcieDual: {
      sku: 'P47777-B21',
      description: 'HPE MR416i-p Gen11 x16 Lanes 8GB Cache PCI SPDM Storage Controller',
      cacheGb: 8,
      busWidth: 'x16',
      cableSku: 'P48832-B21',
      cableDescription: 'HPE ProLiant DL380 Gen11 Tri-Mode Splitter Cable Kit'
    },
    defaultOcpDual: {
      sku: 'P58335-B21',
      description: 'HPE MR408i-o Gen11 x8 Lanes 4GB Cache OCP SPDM Storage Controller',
      cacheGb: 4,
      busWidth: 'x8',
      cableSku: 'P48918-B21',
      cableDescription: 'HPE ProLiant Storage Controller Enablement Cable Kit'
    }
  },
  {
    role: 'Boot Storage',
    bayRegex: /\bns204i-u\b/i,
    pcieRegex: /\bns204i-p\b/i,
    defaultPcieDual: {
      sku: 'P12965-B21',
      description: 'HPE NS204i-p Gen10 Plus NVMe PCIe3 x8 OS Boot Device'
    },
    defaultBayDual: {
      sku: 'P48183-B21',
      description: 'HPE NS204i-u Gen11 NVMe Hot Plug Boot Optimized Storage Device'
    }
  },
  {
    role: 'Network Adapter',
    ocpRegex: /\bocp3?\b/i,
    pcieRegex: /\b(standup|adapter|pcie)\b/i
  }
];

function _buildDualStorageConfig(storageConfig = {}) {
  const pcie = storageConfig.pcie || {};
  const ocp = storageConfig.ocp || {};
  return {
    role: 'Storage Controller',
    ocpRegex: /\b(mr|sr)\d{3}i-o\b/i,
    pcieRegex: /\b(mr|sr)\d{3}i-p\b/i,
    ocpCableRegex: /\b(storage controller enablement|controller enablement|cpu\d to ocp|direct attach)\b/i,
    pcieCableRegex: /\b(tri-mode splitter|pcie box|riser to drive cage|splitter cable)\b/i,
    cacheSwapReasoning: storageConfig.cacheSwapReasoning || '',
    defaultPcieDual: {
      sku: pcie.sku || 'P47777-B21',
      description: pcie.description || 'HPE MR416i-p Gen11 x16 Lanes 8GB Cache PCI SPDM Storage Controller',
      cacheGb: pcie.cacheGb || 8,
      busWidth: pcie.busWidth || 'x16',
      cableSku: pcie.cableSku || 'P48832-B21',
      cableDescription: pcie.cableDescription || 'HPE ProLiant DL380 Gen11 Tri-Mode Splitter Cable Kit'
    },
    defaultOcpDual: {
      sku: ocp.sku || 'P58335-B21',
      description: ocp.description || 'HPE MR408i-o Gen11 x8 Lanes 4GB Cache OCP SPDM Storage Controller',
      cacheGb: ocp.cacheGb || 4,
      busWidth: ocp.busWidth || 'x8',
      cableSku: ocp.cableSku || 'P48918-B21',
      cableDescription: ocp.cableDescription || 'HPE ProLiant Storage Controller Enablement Cable Kit'
    }
  };
}

function _buildDualBootConfig(bootConfig = {}) {
  const pcie = bootConfig.pcie || {};
  const bay = bootConfig.bay || {};
  return {
    role: 'Boot Storage',
    bayRegex: /\bns204i-u\b/i,
    pcieRegex: /\bns204i-p\b/i,
    defaultPcieDual: {
      sku: pcie.sku || 'P12965-B21',
      description: pcie.description || 'HPE NS204i-p NVMe PCIe3 x8 OS Boot Device'
    },
    defaultBayDual: {
      sku: bay.sku || 'P48183-B21',
      description: bay.description || 'HPE NS204i-u NVMe Hot Plug Boot Optimized Storage Device'
    }
  };
}

function resolveFormFactorDuals(genKey = 'Gen11') {
  const map = getChassisMapRaw();
  const dualsMap = map.form_factor_duals || {};
  const normalizedGen = (genKey || '').includes('12') ? 'Gen12' : 'Gen11';
  const genConfig = dualsMap[normalizedGen] || dualsMap['Gen11'];

  if (!genConfig) return DEFAULT_FORM_FACTOR_DUALS;

  return [
    _buildDualStorageConfig(genConfig.storage_controller),
    _buildDualBootConfig(genConfig.boot_device),
    {
      role: 'Network Adapter',
      ocpRegex: /\bocp3?\b/i,
      pcieRegex: /\b(standup|adapter|pcie)\b/i
    }
  ];
}

function categorizeOcpAndPcieItems(safeItems) {
  const ocpStorageControllers = [];
  const pcieStorageControllers = [];
  const ocpNics = [];
  const pcieNics = [];
  const storageCables = [];

  safeItems.forEach(it => {
    const desc = (it.description || '').toLowerCase();
    const isStorageCtrl = desc.includes('controller') || desc.includes('storage') || desc.includes('raid');
    const isNic = desc.includes('adapter') || desc.includes('ethernet') || desc.includes('sfp') || desc.includes('bcm57') || desc.includes('mcx6');
    const isCable = desc.includes('cable') || desc.includes('enablement');

    if (isStorageCtrl && (desc.includes('-o') || desc.includes('ocp'))) {
      ocpStorageControllers.push(it);
    } else if (isStorageCtrl && (desc.includes('-p') || desc.includes('pci'))) {
      pcieStorageControllers.push(it);
    }

    if (isNic && (desc.includes('ocp') || desc.includes('ocp3'))) {
      ocpNics.push(it);
    } else if (isNic && !desc.includes('ocp') && !desc.includes('1gb 4-port base-t ocp')) {
      pcieNics.push(it);
    }

    if (isCable) storageCables.push(it);
  });

  return { ocpStorageControllers, pcieStorageControllers, ocpNics, pcieNics, storageCables };
}

function _buildBranchA(primaryOcpCtrl, fastOcpNic, adminOcpNic) {
  return {
    branchId: 'branch_ocp_storage_baseline',
    title: 'Branch A: OCP Storage Controller Baseline (CapEx & Slot Efficient)',
    targetRank: 1,
    tradeoffType: 'CAPEX_AND_SLOT_OPTIMIZED',
    storageController: {
      formFactor: 'OCP_3_0',
      sku: cleanBaseSKU(primaryOcpCtrl.sku),
      desc: primaryOcpCtrl.description,
      cacheSize: '4GB Flash-backed',
      slotOccupied: 'OCP Slot 1'
    },
    networkingDistribution: {
      ocpSlot1: `Storage Controller (${cleanBaseSKU(primaryOcpCtrl.sku)})`,
      ocpSlot2: adminOcpNic ? `1Gb Admin NIC (${cleanBaseSKU(adminOcpNic.sku)})` : 'Empty',
      pcieCardsCount: 2,
      pcieCardsDesc: '10/25Gb Ethernet delivered via standard PCIe riser standup adapters'
    },
    cableKit: {
      sku: 'P48918-B21',
      description: 'HPE ProLiant Storage Controller Enablement Cable Kit'
    },
    substitutions: [
      {
        action: 'OMIT_CONTESTED_OCP_NIC',
        originalSku: cleanBaseSKU(fastOcpNic.sku),
        originalDesc: fastOcpNic.description,
        reasoning: 'Omitted from OCP Slot 1 because OCP storage controller takes precedence for CapEx efficiency; throughput delivered via PCIe NICs.'
      },
      {
        action: 'ENFORCE_OCP_STORAGE_CABLE',
        injectedSku: 'P48918-B21',
        injectedDesc: 'HPE ProLiant Storage Controller Enablement Cable Kit',
        quantity: 1,
        reasoning: 'Direct enablement cable required for OCP -o controller to standard 8SFF drive cage.'
      }
    ],
    advantages: ['Retains the original OCP storage controller']
  };
}

function _buildBranchB(primaryOcpCtrl, fastOcpNic, adminOcpNic, duals, effectiveChassisInfo) {
  const pcieDualController = duals[0].defaultPcieDual;
  const pcieDualCable = duals[0].defaultPcieDual.cableSku;
  const pcieDualCableDesc = duals[0].defaultPcieDual.cableDescription;
  const cacheSwapReasoning = duals[0].cacheSwapReasoning || `MR416i-p comes standard with 8GB cache on ${effectiveChassisInfo?.gen || 'Gen11'} (no 4GB variant exists for -p series), providing 2x write-cache headroom.`;

  return {
    branchId: 'branch_pcie_storage_ocp_nic',
    title: 'Branch B: PCIe Storage Controller + OCP NIC Retention (High-IOPS & Exact Part Match)',
    targetRank: 3,
    tradeoffType: 'HIGH_IOPS_AND_OCP_RETENTION',
    storageController: {
      formFactor: 'PCIE_STANDUP',
      sku: pcieDualController.sku,
      desc: pcieDualController.description,
      cacheSize: `${pcieDualController.cacheGb || 8}GB Flash-backed (2x Cache, ${pcieDualController.busWidth || 'x16'} Bandwidth)`,
      cacheSwapReasoning,
      slotOccupied: 'PCIe Riser Slot 3'
    },
    networkingDistribution: {
      ocpSlot1: `10/25Gb SFP28 Adapter (${cleanBaseSKU(fastOcpNic.sku)}) [Customer RFP Exact Match]`,
      ocpSlot2: adminOcpNic ? `1Gb Admin NIC (${cleanBaseSKU(adminOcpNic.sku)})` : 'Empty',
      pcieCardsCount: 1,
      pcieCardsDesc: '1x 10/25Gb PCIe card + 1x OCP card delivers full required network bandwidth'
    },
    cableKit: { sku: pcieDualCable, description: pcieDualCableDesc },
    substitutions: [
      {
        action: 'PIVOT_STORAGE_CONTROLLER_TO_PCIE',
        originalSku: cleanBaseSKU(primaryOcpCtrl.sku),
        injectedSku: pcieDualController.sku,
        injectedDesc: pcieDualController.description,
        quantity: primaryOcpCtrl.quantity || 1,
        reasoning: `Pivoted storage controller from -o to -p (${pcieDualController.sku}) to free OCP Slot 1 for customer's requested ${cleanBaseSKU(fastOcpNic.sku)} adapter. ${cacheSwapReasoning}`
      },
      {
        action: 'RETAIN_OCP_NIC_IN_FREED_SLOT',
        retainedSku: cleanBaseSKU(fastOcpNic.sku),
        retainedDesc: fastOcpNic.description,
        slotLocation: 'OCP Slot 1',
        reasoning: `Installed customer's exact requested OCP3 part number ${cleanBaseSKU(fastOcpNic.sku)} into freed OCP Slot 1.`
      },
      {
        action: 'PIVOT_STORAGE_CABLE_TO_PCIE_SPLITTER',
        originalSku: 'P48918-B21',
        injectedSku: pcieDualCable,
        injectedDesc: pcieDualCableDesc,
        quantity: 1,
        reasoning: `Tri-Mode Splitter Cable (${pcieDualCable}) connects PCIe standup controller to 8SFF drive cages, validating customer's original RFP cable choice.`
      }
    ],
    advantages: [`Retains the requested OCP adapter ${cleanBaseSKU(fastOcpNic.sku)}`]
  };
}

function arbitrateOcpSlotContention(safeItems, ocpAspect, effectiveChassisInfo, duals, contentions, branches) {
  const { ocpStorageControllers, ocpNics } = categorizeOcpAndPcieItems(safeItems);
  const totalOcpStorageCount = ocpStorageControllers.reduce((acc, it) => acc + (it.quantity || 1), 0);
  const totalOcpNicCount = ocpNics.reduce((acc, it) => acc + (it.quantity || 1), 0);
  const totalOcpDemands = totalOcpStorageCount + totalOcpNicCount;
  const maxOcpSlots = ocpAspect.maxOcpSlots || 2;

  if (totalOcpDemands <= maxOcpSlots || totalOcpStorageCount <= 0 || totalOcpNicCount < 1) return;

  const primaryOcpCtrl = ocpStorageControllers[0];
  const fastOcpNic = ocpNics.find(n => (n.description || '').toLowerCase().includes('10/25gb') || (n.description || '').toLowerCase().includes('25gb') || (n.description || '').toLowerCase().includes('100gb')) || ocpNics[0];
  const adminOcpNic = ocpNics.find(n => (n.description || '').toLowerCase().includes('1gb') || (n.description || '').toLowerCase().includes('base-t')) || ocpNics[1];

  contentions.push({
    resourceType: 'OCP_3_0_SLOTS',
    branchId: 'branch_ocp_storage_baseline',
    maxCapacity: maxOcpSlots,
    requestedDemands: totalOcpDemands,
    contenders: [
      { subsystem: 'Storage', role: 'Storage Controller (-o)', sku: cleanBaseSKU(primaryOcpCtrl.sku), desc: primaryOcpCtrl.description },
      { subsystem: 'Networking', role: 'High-Speed OCP NIC', sku: cleanBaseSKU(fastOcpNic.sku), desc: fastOcpNic.description },
      { subsystem: 'Networking', role: 'Admin 1Gb OCP NIC', sku: cleanBaseSKU(adminOcpNic?.sku || ''), desc: adminOcpNic?.description || '' }
    ],
    tradeoffSummary: `OCP 3.0 capacity exceeded (${totalOcpDemands}/${maxOcpSlots} occupied). Contested between Storage Controller ${cleanBaseSKU(primaryOcpCtrl.sku)} and High-Speed OCP Adapter ${cleanBaseSKU(fastOcpNic.sku)}.`
  });

  branches.push(_buildBranchA(primaryOcpCtrl, fastOcpNic, adminOcpNic));
  branches.push(_buildBranchB(primaryOcpCtrl, fastOcpNic, adminOcpNic, duals, effectiveChassisInfo));
}

function arbitrateRearBootDeviceContention(safeItems, duals, contentions, branches) {
  const rearBootDevices = safeItems.filter(it => (it.description || '').toLowerCase().includes('ns204i-u'));
  const rearDriveCages = safeItems.filter(it => (it.description || '').toLowerCase().includes('rear') && ((it.description || '').toLowerCase().includes('cage') || (it.description || '').toLowerCase().includes('2sff')));
  if (rearBootDevices.length === 0 || rearDriveCages.length === 0) return;

  contentions.push({
    resourceType: 'REAR_CHASSIS_BAY_SPACE',
    maxCapacity: 1,
    requestedDemands: 2,
    tradeoffSummary: 'Rear chassis bay is contested between NS204i-u Boot Device and 2SFF Rear Drive Cage.',
    branchId: 'branch_pcie_boot_device',
    hypothesis: 'Initial BOQ attempted to house both NS204i-u rear boot device and 2SFF rear drive cage in the same rear bay.',
    detectedFailure: 'Rear chassis bay physical space exceeded: NS204i-u Boot Device and 2SFF Rear Drive Cage both contend for rear bay slot.',
    backtrackedFrom: 'NS204i-u rear boot device in rear bay',
    selfCorrectionAction: 'Branch C: Standup PCIe OS Boot Device (Rear Drive Capacity Expansion)',
    resolutionDetails: 'Pivoted NS204i-u rear boot device to PCIe slot (NS204i-p) to accommodate rear 2SFF drive cage while preserving OS boot mirroring.'
  });

  const bootDual = duals[1].defaultPcieDual;
  branches.push({
    branchId: 'branch_pcie_boot_device',
    title: 'Branch C: Standup PCIe OS Boot Device (Rear Drive Capacity Expansion)',
    targetRank: 4,
    tradeoffType: 'CAPACITY_EXPANSION',
    substitutions: [{
      action: 'PIVOT_BOOT_DEVICE_TO_PCIE',
      originalSku: cleanBaseSKU(rearBootDevices[0].sku),
      injectedSku: bootDual.sku,
      injectedDesc: bootDual.description,
      reasoning: 'Pivoted NS204i-u rear boot device to PCIe slot (NS204i-p) to accommodate rear 2SFF drive cage.'
    }]
  });
}

function buildArbitrationSelfCorrectionTrail(contentions, branches, effectiveEvalResults) {
  const selfCorrectionTrail = [];
  let stepNumber = 1;
  contentions.forEach(contention => {
    const primaryBranch = branches.find(b => b.branchId === contention.branchId);
    if (primaryBranch) {
      const isLegacyOcp = contention.resourceType === 'OCP_3_0_SLOTS' && !effectiveEvalResults?.useNumericStep && !effectiveEvalResults?.options?.useNumericStep;
      selfCorrectionTrail.push({
        step: isLegacyOcp ? 'CONTESTED_RESOURCE_ARBITRATION' : stepNumber++,
        contestedResourceType: contention.resourceType,
        branchId: primaryBranch.branchId,
        status: 'PROPOSED',
        hypothesis: contention.hypothesis || `Greedy allocation attempted to assign all ${contention.requestedDemands} demands to ${contention.resourceType} (capacity: ${contention.maxCapacity}).`,
        detectedFailure: contention.detectedFailure || contention.tradeoffSummary,
        backtrackedFrom: contention.backtrackedFrom || contention.contenders?.map(c => `${c.role} (${c.sku})`).join(', ') || 'Contested component set',
        selfCorrectionAction: `Proposed: ${contention.selfCorrectionAction || primaryBranch.title}`,
        resolutionDetails: `Expected outcome if applied: ${contention.resolutionDetails || primaryBranch.title}. Candidate validation pending.`,
        verifiedBuildable: false
      });
    }
  });
  return selfCorrectionTrail;
}

module.exports = {
  DEFAULT_FORM_FACTOR_DUALS,
  resolveFormFactorDuals,
  arbitrateOcpSlotContention,
  arbitrateRearBootDeviceContention,
  buildArbitrationSelfCorrectionTrail
};
