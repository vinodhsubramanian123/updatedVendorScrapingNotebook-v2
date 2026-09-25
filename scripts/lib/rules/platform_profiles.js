'use strict';
/**
 * scripts/lib/rules/platform_profiles.js
 *
 * Generic Platform Profile & Domain Rules Layer
 *
 * Decouples hardware-specific physical constraints, slot capacities,
 * lifecycle horizons, detection heuristics, and memory channel rules from
 * presales evaluation algorithms.
 *
 * Allows any enterprise server, storage array, SAN switch, or tape library
 * (across HPE ProLiant Gen11/Gen12, Dell PowerEdge 16G/17G, Cisco UCS, etc.)
 * to be onboarded by registering its profile here without altering the engine.
 */

const GENERIC_DETECTION_PATTERNS = {
  isCpu: (desc = '', sku = '') =>
    /\b(processor|cpu|xeon|epyc)\b/i.test(desc) && !/\b(cable|heatsink|enablement|bracket|retainer|carrier|thermal|socket\s+cover)\b/i.test(desc),
  isPcieCard: (desc = '', sku = '') =>
    /\b(adapter|hba|nic|pcie card|ethernet)\b/i.test(desc) && !/\b(ocp|mezzanine|flr)\b/i.test(desc),
  isOcp: (desc = '', sku = '') =>
    /\b(ocp|ocp3|flr)\b/i.test(desc) && !/\b(cable|enablement)\b/i.test(desc),
  isStorageController: (desc = '', sku = '') =>
    /\b(smart array|tri-mode|raid controller|storage controller|megaraid|perc)\b/i.test(desc) &&
    !/\b(battery|cable|bbu)\b/i.test(desc),
  isBattery: (desc = '', sku = '') =>
    /\b(battery|capacitor|cache battery|smart storage battery|bbu)\b/i.test(desc) && !/\b(cable|enablement)\b/i.test(desc),
  isMemory: (desc = '', sku = '') =>
    /\b(memory|dimm|rdimm|lrdimm|mrdimm|ddr[45]|registered\s+smart\s+kit)\b/i.test(desc),
  isDrive: (desc = '', sku = '') =>
    /\b(ssd|hdd|nvme|sas|sata|drive)\b/i.test(desc) &&
    !/\b(boot device|ns204i|boss|cage|backplane|tray|cbl)\b/i.test(desc),
  isBootDevice: (desc = '', sku = '') =>
    /\b(boot device|ns204i|boss|m\.2 boot)\b/i.test(desc) && !/\b(cable|enablement)\b/i.test(desc)
};

// Historical product observations, not live orderability or acceptance evidence.
// Consumers must verify exact scope and current catalog/portal evidence before
// selecting replacements, support suffixes or manufacturing dependencies.
const PLATFORM_PROFILES = {
  // --- COMPUTE PLATFORMS (HPE ProLiant) ---
  'HPE_PROLIANT_DL380_GEN11': {
    domain: 'server',
    vendor: 'HPE',
    family: 'ProLiant DL',
    generation: 'Gen11',
    formFactor: '2U Rack',
    maxSockets: 2,
    baseChassis: { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF NC Configure-to-order Server' },
    baseChassis24Sff: { sku: 'P52535-B21', description: 'HPE ProLiant DL380 Gen11 24SFF NC Configure-to-order Server' },
    detection: GENERIC_DETECTION_PATTERNS,
    memoryArchitecture: {
      generation: 'DDR5',
      channelsPerSocket: 8,
      dimmsPerChannel: 2,
      maxDimmsPerSocket: 16,
      maxDimmsPerChassis: 32,
      minCpuForMaxDimms: 2,
      speedMt: 5600,
      allowMixedCapacities: false, // OCA hard stop if mixed
      validBalancedCountsPerSocket: [1, 2, 4, 6, 8, 12, 16],
      skus: {
        '16GB': { bto: 'P64705-B21', fio: 'P64705-F21', desc: 'HPE 16GB 1Rx8 DDR5-5600 Smart FIO Memory Kit' },
        '32GB': { bto: 'P64706-B21', fio: 'P64706-F21', desc: 'HPE 32GB 2Rx8 DDR5-5600 Smart FIO Memory Kit' },
        '64GB': { bto: 'P64707-B21', fio: 'P64707-F21', desc: 'HPE 64GB 2Rx4 DDR5-5600 Smart FIO Memory Kit' },
        '96GB': { bto: 'P64708-B21', fio: 'P64708-F21', desc: 'HPE 96GB 2Rx4 DDR5-5600 Smart FIO Memory Kit' },
        '128GB': { bto: 'P69976-B21', fio: 'P69976-F21', desc: 'HPE 128GB 2Rx4 DDR5-5600 Smart FIO Memory Kit' }
      }
    },
    slots: {
      primaryRiserSlots: 3,
      secondaryRiserSlots: 3,
      tertiaryRiserSlots: 2,
      maxPcieEthernetPerChassis: 3, // OCA subcategory selection constraint
      ocpSlots: 2, // OCP1 (internal OROC storage) + OCP2 (rear networking)
      maxCentralizedCacheBattery: 1 // Rule 81354647
    },
    enablementKits: {
      secondaryRiser: { sku: 'P48802-B21', description: 'HPE ProLiant DL380 Gen11 2U x8/x16/x8 Secondary Riser Kit' },
      tertiaryRiser: { sku: 'P48804-B21', description: 'HPE ProLiant DL380 Gen11 2U x16/x16 Tertiary Riser Kit' },
      ocp2Networking: { sku: 'P48828-B21', description: 'HPE ProLiant DL300 Gen11 2U OCP2 x16 Enablement Kit' },
      ocp2Cpu1Cabling: { sku: 'P51911-B21', description: 'HPE ProLiant DL380 Gen11 CPU1 to OCP2 x8 Enablement Kit' },
      storageBatteryEnablementCable: { sku: 'P48918-B21', description: 'HPE ProLiant Storage Controller Enablement Cable Kit' },
      fanKit: { sku: 'P48820-B21', description: 'HPE ProLiant DL380/DL560 Gen11 2U High Performance Fan Kit', fansPerKit: 6 },
      heatsinkKit: { sku: 'P48818-B21', description: 'HPE ProLiant DL380/DL560 Gen11 High Performance 2U Heat Sink Kit', minSockets: 2 },
      driveCage8SffTriMode: { sku: 'P48813-B21', description: 'HPE ProLiant DL380 Gen11 2U 8SFF x1 Tri-Mode U.3 Drive Cage Kit' },
      railKit: { sku: 'P52341-B21', description: 'HPE ProLiant DL3XX Gen11 Easy Install Rail 3 Kit' }
    },
    defaultSupportPolicy: {
      hardwareSupportSku: 'HU4B2A3', // HPE 3Y Tech Care Basic Service
      hardwareSupportChildSku: 'HU4B2A300DK',
      cloudManagementSaaS: 'R7A11AAE', // HPE Compute Ops Management Standard 3Y Upfront SaaS
      cloudManagementFio: 'S1A05A',
      powerJumperCord: 'R1C65A'
    },
    lifecycleHorizons: {
      'P40430-B21': { activeUntil: '2028-06-30', status: 'ACTIVE_ORDERABLE' },
      'P67095-B21': { activeUntil: '2027-07-31', status: 'ACTIVE_ORDERABLE' },
      'P67091-B21': { activeUntil: '2027-07-31', status: 'ACTIVE_ORDERABLE' },
      'P52534-B21': { activeUntil: '2028-04-30', status: 'ACTIVE_ORDERABLE' },
      'P48820-B21': { activeUntil: '2029-06-30', status: 'ACTIVE_ORDERABLE' },
      'P38997-B21': { activeUntil: '2029-06-30', status: 'ACTIVE_ORDERABLE' },
      'P28028-B21': { activeUntil: '2024-10-31', status: 'OBSOLETE_END_OF_SALE' }
    },
    activeReplacements: {
      'P28028-B21': { replacement: 'P40430-B21', desc: 'HPE 300GB SAS 12G 10K SFF BC HDD', reason: '15K SAS drives reached End-of-Sale 10/31/2024; active factory 10K equivalent' },
      '870753-B21': { replacement: 'P40430-B21', desc: 'HPE 300GB SAS 12G 10K SFF BC HDD', reason: 'Legacy Gen10 SC drive replaced by active Gen11 BC carrier' },
      '881457-B21': { replacement: 'P28352-B21', desc: 'HPE 2.4TB SAS 12G 10K SFF BC 512e HDD', reason: 'Legacy Gen10 SC drive replaced by active Gen11 BC carrier' },
      'P49052-B21': { replacement: 'P49053-B21', desc: 'HPE 3.2TB SAS 24G Mixed Use SFF BC SSD', reason: 'Legacy Gen10 SC drive replaced by active Gen11 BC carrier' },
      'P08421-B21': { replacement: 'P26262-B21', desc: 'Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 Adapter', reason: 'Active Gen11 PCIe adapter' }
    }
  },

  'HPE_PROLIANT_DL380_GEN12': {
    domain: 'server',
    vendor: 'HPE',
    family: 'ProLiant DL',
    generation: 'Gen12',
    formFactor: '2U Rack',
    maxSockets: 2,
    baseChassis: { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF NC Configure-to-order Server' },
    baseChassis24Sff: { sku: 'P73283-B21', description: 'HPE ProLiant DL380 Gen12 24SFF NC Configure-to-order Server' },
    detection: GENERIC_DETECTION_PATTERNS,
    memoryArchitecture: {
      generation: 'DDR5',
      channelsPerSocket: 8,
      dimmsPerChannel: 2,
      maxDimmsPerSocket: 16,
      maxDimmsPerChassis: 32,
      minCpuForMaxDimms: 2,
      speedMt: 6400,
      allowMixedCapacities: false,
      validBalancedCountsPerSocket: [1, 2, 4, 6, 8, 12, 16],
      skus: {
        '32GB': { bto: 'P74878-B21', fio: 'P74878-F21', desc: 'HPE 32GB 2Rx8 DDR5-6400 Smart FIO Memory Kit' },
        '64GB': { bto: 'P74879-B21', fio: 'P74879-F21', desc: 'HPE 64GB 2Rx4 DDR5-6400 Smart FIO Memory Kit' },
        '96GB': { bto: 'P74880-B21', fio: 'P74880-F21', desc: 'HPE 96GB 2Rx4 DDR5-6400 Smart FIO Memory Kit' },
        '128GB': { bto: 'P74881-B21', fio: 'P74881-F21', desc: 'HPE 128GB 2Rx4 DDR5-6400 Smart FIO Memory Kit' }
      }
    },
    slots: {
      primaryRiserSlots: 3,
      secondaryRiserSlots: 3,
      tertiaryRiserSlots: 2,
      maxPcieEthernetPerChassis: 4,
      ocpSlots: 2,
      maxCentralizedCacheBattery: 1
    },
    enablementKits: {
      secondaryRiser: { sku: 'P76453-B21', description: 'HPE ProLiant DL380 Gen12 2U x16/x16 Secondary Riser Kit' },
      ocp2Networking: { sku: 'P72203-B21', description: 'HPE ProLiant DL380 Gen12 OCP2 Slot Enablement Cable Kit' },
      fanKit: { sku: 'P74780-B21', description: 'HPE ProLiant DL380 Gen12 High Performance Fan Kit', fansPerKit: 6 },
      heatsinkKit: { sku: 'P48818-B21', description: 'HPE ProLiant DL380 Gen12 High Performance Heat Sink Kit', minSockets: 2 },
      driveCage8SffTriMode: { sku: 'P75741-B21', description: 'HPE ProLiant DL380 Gen12 8SFF Tri-Mode Drive Cage Kit' },
      railKit: { sku: 'P52341-B21', description: 'HPE ProLiant DL3XX Gen12 Easy Install Rail 3 Kit' }
    },
    defaultSupportPolicy: {
      hardwareSupportSku: 'HU4B2A30C4V',
      cloudManagementSaaS: 'R7A11AAE',
      cloudManagementFio: 'S1A05A',
      powerJumperCord: 'R1C65A'
    }
  },

  'HPE_PROLIANT_DL360_GEN11': {
    domain: 'server',
    vendor: 'HPE',
    family: 'ProLiant DL',
    generation: 'Gen11',
    formFactor: '1U Rack',
    maxSockets: 2,
    baseChassis: { sku: 'P52532-B21', description: 'HPE ProLiant DL360 Gen11 8SFF NC Configure-to-order Server' },
    detection: GENERIC_DETECTION_PATTERNS,
    memoryArchitecture: {
      generation: 'DDR5',
      channelsPerSocket: 8,
      dimmsPerChannel: 2,
      maxDimmsPerSocket: 16,
      maxDimmsPerChassis: 32,
      minCpuForMaxDimms: 2,
      speedMt: 5600,
      allowMixedCapacities: false,
      validBalancedCountsPerSocket: [1, 2, 4, 6, 8, 12, 16]
    },
    slots: {
      primaryRiserSlots: 2,
      secondaryRiserSlots: 1,
      maxPcieEthernetPerChassis: 2,
      ocpSlots: 2
    }
  },

  // --- COMPUTE PLATFORMS (Dell PowerEdge for Cross-Vendor Parity) ---
  'DELL_POWEREDGE_R770': {
    domain: 'server',
    vendor: 'Dell',
    family: 'PowerEdge',
    generation: '17G',
    formFactor: '2U Rack',
    maxSockets: 2,
    baseChassis: { sku: 'R770-CTO', description: 'Dell PowerEdge R770 Server' },
    detection: GENERIC_DETECTION_PATTERNS,
    memoryArchitecture: {
      generation: 'DDR5',
      channelsPerSocket: 8,
      dimmsPerChannel: 2,
      maxDimmsPerSocket: 16,
      maxDimmsPerChassis: 32,
      minCpuForMaxDimms: 2,
      speedMt: 6400,
      allowMixedCapacities: false
    },
    targetHpeEquivalent: 'HPE_PROLIANT_DL380_GEN12'
  },

  'DELL_POWEREDGE_R760': {
    domain: 'server',
    vendor: 'Dell',
    family: 'PowerEdge',
    generation: '16G',
    formFactor: '2U Rack',
    maxSockets: 2,
    baseChassis: { sku: 'R760-CTO', description: 'Dell PowerEdge R760 Server' },
    detection: GENERIC_DETECTION_PATTERNS,
    memoryArchitecture: {
      generation: 'DDR5',
      channelsPerSocket: 8,
      dimmsPerChannel: 2,
      maxDimmsPerSocket: 16,
      maxDimmsPerChassis: 32,
      minCpuForMaxDimms: 2,
      speedMt: 5600,
      allowMixedCapacities: false
    },
    targetHpeEquivalent: 'HPE_PROLIANT_DL380_GEN11'
  },

  // --- STORAGE PLATFORMS ---
  'HPE_MSA_2060': {
    domain: 'storage',
    vendor: 'HPE',
    family: 'MSA SAN Storage',
    formFactor: '2U Rack',
    architecture: 'Dual Active-Active Controllers',
    baseSffBays: 24,
    maxExpansionEnclosures: 3,
    enclosureSku: 'R0Q40B', // HPE MSA 2060 SAS 12G 2U 24-disk SFF Drive Enclosure
    enclosureBays: 24,
    maxTotalDrives: 96,
    supportedMedia: ['SAS SSD', 'SAS 10K HDD', 'SAS 15K HDD'],
    hostProtocols: ['16Gb FC', '32Gb FC', '10GbE iSCSI', '25GbE iSCSI', '12G SAS'],
    defaultSupportPolicy: {
      hardwareSupportSku: 'HU4B2A3',
      hardwareSupportChildSku: 'HU4B2A300DK'
    }
  },

  // --- SAN SWITCHING PLATFORMS ---
  'HPE_STOREFABRIC_SN3600B': {
    domain: 'networking',
    subDomain: 'san_fabric',
    vendor: 'HPE / Brocade',
    family: 'StoreFabric B-Series',
    formFactor: '1U Rack',
    protocol: '32Gb Fibre Channel',
    basePortsActive: 8,
    maxPorts: 24,
    upgradePackSku: 'R7M09A', // HPE SN3600B 8-port 32Gb Short Wave FC Upgrade LTU + 8x SFPs
    portsPerUpgradePack: 8,
    optics: '32Gb SFP+ Short Wave',
    powerSupplies: 1, // Single fixed PSU with PDU jumper cord R1C65A
    jumperCordSku: 'R1C65A',
    defaultSupportPolicy: {
      hardwareSupportSku: 'HU4B4A3', // HPE 3Y Tech Care Basic Switch Service
      hardwareSupportChildSku: 'HU4B4A3ZTL'
    }
  },

  // --- TAPE ARCHIVE PLATFORMS ---
  'HPE_STOREEVER_MSL3040': {
    domain: 'archive',
    vendor: 'HPE',
    family: 'StoreEver Tape Library',
    formFactor: '3U Base Module (Scalable to 42U)',
    baseModuleSku: 'Q6Q62C',
    baseSlots: 40,
    expansionModuleSku: 'Q6Q63A',
    expansionSlotsPerModule: 40,
    maxDrivesPerModule: 3,
    driveGenerations: ['LTO-9 FC', 'LTO-8 FC', 'LTO-7 FC', 'LTO-9 SAS'],
    defaultLto9FcDriveSku: 'R6Q74A',
    mediaSkus: {
      lto9Data: 'Q2079A',
      lto9BarcodePack: 'Q2079AN',
      cleaningCartridge: 'C7978A',
      encryptionLtu: 'Q8K43AAE'
    },
    defaultSupportPolicy: {
      hardwareSupportSku: 'HU4B2A3',
      hardwareSupportChildSku: 'HU4B2A3YJR'
    }
  }
};

/**
 * Retrieve an exact profile or an unambiguous model suffix. Broad family names
 * and generation-free server names never select a default platform.
 * @param {string} platformKey
 * @returns {object|null}
 */
function getPlatformProfile(platformKey = '') {
  if (!platformKey) return null;
  const cleanKey = String(platformKey).trim().toUpperCase().replace(/[-\s]+/g, '_');
  if (PLATFORM_PROFILES[cleanKey]) return PLATFORM_PROFILES[cleanKey];

  if (!/\d/.test(cleanKey)) return null;
  const matches = Object.entries(PLATFORM_PROFILES).filter(([key]) => key.endsWith(`_${cleanKey}`));
  return matches.length === 1 ? matches[0][1] : null;
}

module.exports = {
  GENERIC_DETECTION_PATTERNS,
  PLATFORM_PROFILES,
  getPlatformProfile
};
