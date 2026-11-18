'use strict';
/**
 * scripts/lib/catalog/category_dependencies.js — Cross-Category Prerequisite & Ambiguity Escalation Matrix
 *
 * Codifies which SKU categories dictate mandatory co-requisites, conditional exemptions
 * (e.g. Direct-Connect / No-Drive vs Controller-Routed Drive Cages), mutually exclusive options,
 * and structured runtime escalation queries for NotebookLM, Graphify, and Trusted Web QuickSpecs.
 */

const fs = require('fs');
const path = require('path');
const { cleanBaseSKU, buildCatalogSkuIndex, isOcaModifierTrackingRow } = require('./sku.js');
const { classifyComponentRole } = require('./product_meta.js');

const DIRECT_CONNECT_CAGE_RE = /\b(?:direct[\s-]*attach|direct[\s-]*connect|nvme[\s-]*direct|cpu[\s-]*direct|x1\s*(?:nvme|pcie)?\s*direct|direct[\s-]*cable|emb(?:edded)?[\s-]*direct)\b/i;
const FRONT_DRIVE_CAGE_RE = /\b(?:drive\s*cage|sff\s*cage|lff\s*cage|cage\s*kit|backplane(?:\s*kit)?|box\s*[12]\b|4edsff|4sff|8sff|12lff|24sff|u\.3\s*prem)\b/i;
const CONTROLLER_ROUTED_CAGE_RE = /\b(?:tri[\s-]*mode|u\.3|sas|sata|8sff|12lff|24sff|box\s*[12]|smart\s*array)\b/i;
const SAS_SATA_DRIVE_RE = /\b(?:sas|sata)\b.*\b(?:hdd|ssd|drive)\b|\b(?:hdd|ssd)\b.*\b(?:sas|sata)\b/i;
const NVME_DRIVE_RE = /\bnvme\b.*\b(?:ssd|drive)\b|\bu\.3\b.*\bssd\b/i;

const CATEGORY_DEPENDENCY_MATRIX = [
  {
    category: 'Drive Cage / Backplane',
    dictatedBy: 'Cage / Backplane Topology (NOT bare drives alone)',
    requires: ['Storage Controller + Controller Enablement Cable + Smart Storage Battery when controller-routed (Tri-Mode U.3 / SAS / SATA front cage without Direct-Connect)'],
    exemptions: [
      'No Drive Configuration FIO Kit (diskless): controller is NOT required and conflicts with hardware RAID controllers.',
      'Direct-Attach / Direct-Connect NVMe cage (x1/CPU PCIe direct cable): controller is NOT mandatory.'
    ],
    mutuallyExclusiveWith: ['4SFF + 4EDSFF cage mixing', 'Hardware Storage Controller paired with No Drive FIO Kit'],
    ambiguityEscalation: {
      notebookQueryHint: 'Verify whether this drive cage/backplane SKU connects directly to system board PCIe lanes or requires an MR/SR storage controller and which Box cable kit.',
      graphifySymbols: ['evalStorageTriMode', 'tallyCagesAndDrives', 'validateStorageCablingAndBackplane'],
      trustedWebQueryHint: 'site:hpe.com QuickSpecs drive cage direct attach vs controller enablement cable kit'
    }
  },
  {
    category: 'Drive (SSD / HDD / NVMe)',
    dictatedBy: 'Backplane capacity, media form factor, and RAID geometry',
    requires: ['Matching chassis/cage form factor (SFF vs LFF vs EDSFF)', 'SAS Expander / Tri-Mode Switch when per-node drives exceed controller port capacity (8 or 16)', 'Customer Defined RAID Service (389692-B21) instead of 2-drive RAID1 FIO (339778-B21) when data drives > 2'],
    exemptions: ['Drives alone do not dictate a hardware RAID controller when routed via Direct-Connect NVMe backplane or Intel VROC.'],
    mutuallyExclusiveWith: ['LFF 3.5-inch drives in SFF chassis'],
    ambiguityEscalation: {
      notebookQueryHint: 'Check drive media protocol (NVMe U.3 / SAS / SATA) and supported backplane cages in chassis QuickSpecs.',
      graphifySymbols: ['checkChassisDriveCompatibility', '_checkSasExpanderAndRaidTranspilation'],
      trustedWebQueryHint: 'site:hpe.com QuickSpecs drive bay support matrix NVMe Tri-Mode'
    }
  },
  {
    category: 'Storage Controller',
    dictatedBy: 'Controller-routed storage topology & slot form factor (-p PCIe vs -o OCP)',
    requires: ['Physical Drive Cage / Backplane (cannot pair with No Drive FIO)', 'Smart Storage Battery / Hybrid Capacitor', 'Controller Enablement or Tri-Mode Splitter Cable Kit'],
    exemptions: ['VROC software RAID and NS204i-u boot devices do not require Smart Storage Battery.'],
    mutuallyExclusiveWith: ['No Drive FIO Kit', 'Tri-Mode Splitter Cable paired with -o OCP controller or standard cage'],
    ambiguityEscalation: {
      notebookQueryHint: 'Confirm controller cache battery requirement and exact OCP vs PCIe enablement cable SKU for this generation.',
      graphifySymbols: ['_checkControllerCablesAndBatteries', 'arbitrateContestedResources'],
      trustedWebQueryHint: 'site:hpe.com MR416i MR408i cable kit Smart Storage Battery QuickSpecs'
    }
  },
  {
    category: 'Boot Device',
    dictatedBy: 'NS204i-u front/rear enablement and OS boot isolation',
    requires: ['NS204i-u Rear/Front Mount Enablement Kit for internal hot-plug M.2 carrier'],
    exemptions: ['Decoupled from SFF data drive bay count and allows pruning redundant 339778-B21 FIO setting.'],
    mutuallyExclusiveWith: ['Rear-bay NS204i-u competing with rear riser/slot clearances if unbundled'],
    ambiguityEscalation: {
      notebookQueryHint: 'Confirm NS204i-u boot enablement kit SKU and rear/front bay routing.',
      graphifySymbols: ['_checkNs204BootEnablement'],
      trustedWebQueryHint: 'site:hpe.com NS204i-u Gen12 enablement kit QuickSpecs'
    }
  },
  {
    category: 'Processor (CPU)',
    dictatedBy: 'Socket count, TDP envelope, and ambient thermal rating',
    requires: ['High-Performance Fan Kit when TDP >= 240W or elevated ambient > 30C', 'High-Performance Heatsink or DLC cold plate above chassis threshold', 'CPU2 unlocks Secondary PCIe Riser and 2nd-socket DIMM channels'],
    exemptions: ['Low-TDP configurations below chassis thermal gate can use standard fans and heatsinks.'],
    mutuallyExclusiveWith: ['Mixed CPU models/steppings on the same node'],
    ambiguityEscalation: {
      notebookQueryHint: 'Verify TDP thermal fan/heatsink threshold and ambient temperature cap for this CPU SKU.',
      graphifySymbols: ['evalComputeThermal', '_validateCpuAndGpuThermalEnvelope'],
      trustedWebQueryHint: 'site:hpe.com thermal heatsink high performance fan TDP threshold QuickSpecs'
    }
  },
  {
    category: 'Memory (DIMM)',
    dictatedBy: 'Channel interleaving, 1DPC/2DPC cooling, and NUMA balance',
    requires: ['Uniform DDR generation, module type (RDIMM/LRDIMM/MRDIMM), bit-width (x4 vs x8), and 96GB capacity rule', 'Balanced channel count per populated CPU socket', 'High-Perf Fans on 2DPC high-speed/high-capacity builds'],
    exemptions: ['1DPC low-capacity builds avoid 2DPC thermal fan escalation.'],
    mutuallyExclusiveWith: ['x4 + x8 mixing', 'DDR4 + DDR5 mixing', 'RDIMM + LRDIMM + MRDIMM mixing', '96GB mixed with non-96GB DIMMs'],
    ambiguityEscalation: {
      notebookQueryHint: 'Verify DIMM population rules (channels per socket, 1DPC/2DPC speed drop) and thermal triggers.',
      graphifySymbols: ['evalMemoryChannel', '_validateMemoryCategoryRules'],
      trustedWebQueryHint: 'site:hpe.com DDR5 memory population rules 1DPC 2DPC QuickSpecs'
    }
  },
  {
    category: 'GPU / Accelerator',
    dictatedBy: 'PCIe width/length, 16-pin/aux power delivery, thermal airflow, and Titanium PSU capacity',
    requires: ['Double-width/full-length PCIe Riser(s) & Riser Cable Kit', 'GPU Aux / 16-pin Power Cable Kit', 'High-Perf Fans & High-Perf Heatsinks', 'Titanium PSU(s) (2x >=1800W or 4x-6x 2400W/3200W on DL380a)'],
    exemptions: ['Dual-GPU cable kits (e.g. P74700-B21) power 2 GPUs per kit.'],
    mutuallyExclusiveWith: ['Low-wattage or Platinum PSU multi-GPU envelope violations'],
    ambiguityEscalation: {
      notebookQueryHint: 'Verify exact GPU auxiliary power cable SKU capacity (1 vs 2 GPUs/kit), required riser kit, and PSU count.',
      graphifySymbols: ['_checkGpuPowerCables', '_checkMultiGpuTitanium', 'resolveGpuCableCapacity'],
      trustedWebQueryHint: 'site:hpe.com DL380 DL380a GPU enablement cable kit QuickSpecs'
    }
  },
  {
    category: 'PCIe Riser & Standup Cards',
    dictatedBy: 'Mechanical slots vs electrically active PCIe lanes',
    requires: ['Primary / Secondary Riser Cable Kits to activate CPU1/CPU2 riser slots', 'Arbitration against OCP slot when pivoting `-o` controllers to `-p` PCIe'],
    exemptions: ['Built-in default x8 primary riser lanes on base CTO without extra add-in cards.'],
    mutuallyExclusiveWith: ['Secondary riser standup cards without CPU2 populated'],
    ambiguityEscalation: {
      notebookQueryHint: 'Confirm which riser slots require CPU2 and primary/secondary enablement cable kits.',
      graphifySymbols: ['evalPcieRiserSlots', 'validatePCIeRules'],
      trustedWebQueryHint: 'site:hpe.com PCIe riser cable kit slot matrix QuickSpecs'
    }
  },
  {
    category: 'Network Adapter / FC HBA / Switch',
    dictatedBy: 'OCP 3.0 slot count, HBA port optics, and switch uplink speed parity',
    requires: ['Matching SFP28/SFP56/QSFP28 transceivers for FC HBAs & switches', 'OM4 LC-LC optical patch cables for active optics', 'CPU1 vs CPU2 OCP2 enablement cable separation'],
    exemptions: ['Factory optic-bundled HBAs (R2E08A, R2E09A, R2J62A, R2J63A) include transceivers in-box.'],
    mutuallyExclusiveWith: ['>1 OCP3 adapter on 1-OCP chassis', 'CPU1_OCP2 + CPU2_OCP2 cable together on dual-CPU builds'],
    ambiguityEscalation: {
      notebookQueryHint: 'Verify whether the adapter includes optics in-box and check OCP3 enablement cable rules.',
      graphifySymbols: ['evalNetworkingOcp', 'validateNetworkingRules', 'evalSwitchFabricPorts'],
      trustedWebQueryHint: 'site:hpe.com OCP3 enablement kit FC HBA included transceivers QuickSpecs'
    }
  },
  {
    category: 'Power Supply (PSU) & Thermal',
    dictatedBy: 'AC vs -48VDC facility power, efficiency uniformity, and wattage headroom',
    requires: ['-48VDC PSU mandates DC Power Cable Lug Kit', 'Redundant pairs match efficiency (Titanium vs Platinum) and wattage', 'High-draw AC builds trigger EU Lot 9 Titanium or CE Mark Removal Kit and 200-240V high-line advisory'],
    exemptions: ['Multi-cluster tenders with even pairs across distinct node clusters.'],
    mutuallyExclusiveWith: ['AC + -48VDC PSU mixing', 'Platinum + Titanium mixing in one server'],
    ambiguityEscalation: {
      notebookQueryHint: 'Verify PSU redundancy, AC/DC lug kit, and EU Lot 9 / 200-240V derating limits.',
      graphifySymbols: ['evalPowerEnvironment', '_validatePsuCategoryRules'],
      trustedWebQueryHint: 'site:hpe.com Flex Slot power supply EU Lot 9 CE removal QuickSpecs'
    }
  },
  {
    category: 'Service & Support / Infrastructure',
    dictatedBy: 'Product-qualified Tech Care SLA policy, licensing cores/sockets, and turnkey racking',
    requires: ['3-year Tech Care Basic baseline unless explicitly specified otherwise', 'Core-count packs matched for Windows Server (16-core min/server) and VMware (16-core/socket min)', 'Turnkey racking requests mandate rail kit + optical transceivers'],
    exemptions: ['Explicit customer SLA specification overrides the 3-year Basic default in closest rank.'],
    mutuallyExclusiveWith: ['Onsite + Remote Installation in same configuration', 'SaaS (*AAE) treated as physical break-fix replacement'],
    ambiguityEscalation: {
      notebookQueryHint: 'Verify product-qualified Tech Care parent/suffix SLA SKU and required rail kits.',
      graphifySymbols: ['evalSupportServices', 'evalSupportManufacturing', 'validateSupportRules'],
      trustedWebQueryHint: 'site:hpe.com Tech Care Basic essential service QuickSpecs'
    }
  }
];

function _classifyCageItem(it, mappedCat) {
  const desc = String(it?.description || '').toLowerCase();
  const sku = cleanBaseSKU(it?.sku || '');
  const role = classifyComponentRole(mappedCat, desc);
  const isNoDrive = desc.includes('no drive') || desc.includes('diskless') || sku === '873763-B21';
  const isCtrl = !isNoDrive && !desc.includes('ns204i') && !desc.includes('vroc') &&
    (role === 'Storage Controller' || /\b(mr|sr)\d{3}i/i.test(desc) || desc.includes('smart array') ||
     (desc.includes('controller') && !desc.includes('network') && !desc.includes('ethernet') && !desc.includes('node')));
  const isCage = !isNoDrive && !isCtrl && !desc.includes('controller') && FRONT_DRIVE_CAGE_RE.test(desc) && !desc.includes('chassis') && !desc.includes('cto server');
  const isDirectCage = isCage && DIRECT_CONNECT_CAGE_RE.test(desc);
  const isRoutedCage = isCage && !isDirectCage && CONTROLLER_ROUTED_CAGE_RE.test(desc);
  return { sku, desc, role, isNoDrive, isCtrl, isCage, isDirectCage, isRoutedCage };
}

function _recordCageFlagsInRes(res, it, flags) {
  const label = flags.sku || it?.description;
  if (flags.desc.includes('vroc') || flags.sku === 'R7J57A' || flags.sku === 'S3Q19A') res.hasVroc = true;
  if (flags.isNoDrive) res.noDriveKits.push(label);
  if (flags.isCtrl) res.controllers.push(label);
  if (flags.isCage) res.explicitFrontCages.push(label);
  if (flags.isDirectCage) res.directConnectCages.push(label);
  if (flags.isRoutedCage) res.controllerRoutedCages.push(label);
  if (!flags.isCage && !flags.isCtrl && !flags.isNoDrive) {
    if (SAS_SATA_DRIVE_RE.test(flags.desc)) res.hasSasOrSataDrives = true;
    if (NVME_DRIVE_RE.test(flags.desc)) res.hasNvmeDrives = true;
  }
}

function _deriveTopologyLabel(res) {
  if (res.noDriveKits.length > 0 && res.explicitFrontCages.length === 0) return 'NO_DRIVE_KIT';
  if (res.directConnectCages.length > 0 && res.controllerRoutedCages.length === 0) return 'DIRECT_CONNECT_CAGE';
  if (res.controllerRoutedCages.length > 0) return 'CONTROLLER_ROUTED_CAGE';
  if (res.explicitFrontCages.length > 0) return 'DIRECT_OR_UNSPECIFIED_CAGE';
  return 'NONE';
}

function classifyDriveCageTopology(items = [], catalogData = null) {
  const index = catalogData ? buildCatalogSkuIndex(catalogData) : new Map();
  const res = {
    explicitFrontCages: [],
    directConnectCages: [],
    controllerRoutedCages: [],
    noDriveKits: [],
    controllers: [],
    hasVroc: false,
    hasSasOrSataDrives: false,
    hasNvmeDrives: false
  };

  for (const it of (items || [])) {
    if (isOcaModifierTrackingRow(it?.sku, it?.description)) continue;
    const catItem = index.get(cleanBaseSKU(it?.sku || ''));
    const mappedCat = catItem ? (catItem.parentCategory || catItem.subCategory || '') : '';
    _recordCageFlagsInRes(res, it, _classifyCageItem(it, mappedCat));
  }

  const topology = _deriveTopologyLabel(res);
  const hasExplicitRoutedSpecs = res.controllerRoutedCages.some(c => /tri[\s-]*mode|u\.3|sas|sata|8sff|12lff|24sff/i.test(c));
  const controllerRequiredByCage = (
    res.controllerRoutedCages.length > 0 &&
    res.directConnectCages.length === 0 &&
    res.noDriveKits.length === 0 &&
    (hasExplicitRoutedSpecs || res.explicitFrontCages.length > 0 || res.hasSasOrSataDrives)
  );

  return { ...res, topology, controllerRequiredByCage };
}

function getCategoryDependencyMatrix(filter = '') {
  const q = String(filter || '').trim().toLowerCase();
  if (!q) return CATEGORY_DEPENDENCY_MATRIX;
  return CATEGORY_DEPENDENCY_MATRIX.filter(entry =>
    entry.category.toLowerCase().includes(q) ||
    entry.dictatedBy.toLowerCase().includes(q) ||
    entry.requires.some(r => r.toLowerCase().includes(q)) ||
    entry.exemptions.some(e => e.toLowerCase().includes(q))
  );
}

function _mapRoleToMatrixCategory(role = '', desc = '') {
  if (role === 'Drive Cage / Drive') {
    return FRONT_DRIVE_CAGE_RE.test(desc) || desc.includes('no drive')
      ? 'Drive Cage / Backplane'
      : 'Drive (SSD / HDD / NVMe)';
  }
  if (role === 'Network Adapter' || role === 'Fibre Channel HBA' || role === 'Transceiver' || role === 'SAN Switch' || role === 'Fabric Interconnect' || role === 'Network Switch') {
    return 'Network Adapter / FC HBA / Switch';
  }
  if (role === 'PCIe Riser') return 'PCIe Riser & Standup Cards';
  if (role === 'Power Supply' || role === 'Cooling / Thermal') return 'Power Supply (PSU) & Thermal';
  if (role === 'Service & Support' || role === 'Operating System / License' || role === 'Chassis Infrastructure') {
    return 'Service & Support / Infrastructure';
  }
  if (role === 'Processor') return 'Processor (CPU)';
  if (role === 'Memory') return 'Memory (DIMM)';
  return role;
}

function _collectUnresolvedCategoryAmbiguities(storageTopology, items) {
  const ambiguities = [];
  if (storageTopology.topology === 'CONTROLLER_ROUTED_CAGE' && storageTopology.controllers.length === 0 && !storageTopology.hasVroc) {
    ambiguities.push({
      category: 'Drive Cage / Backplane',
      issue: `Controller-routed drive cage (${storageTopology.controllerRoutedCages.join(', ')}) present without a Storage Controller.`,
      resolutionPath: 'Verify whether chassis uses direct-connect NVMe cabling or add a compatible MR/SR Storage Controller + cable kit + battery.'
    });
  }
  if (storageTopology.topology === 'DIRECT_OR_UNSPECIFIED_CAGE' && storageTopology.controllers.length === 0) {
    ambiguities.push({
      category: 'Drive Cage / Backplane',
      issue: `Drive cage (${storageTopology.explicitFrontCages.join(', ')}) does not explicitly state Direct-Connect vs Tri-Mode routing.`,
      resolutionPath: 'Consult NotebookLM QuickSpecs or HPE trusted web documentation to verify whether this cage wires direct-connect or requires a controller.'
    });
  }
  const hasUncatalogedCustomCage = (items || []).some(it => FRONT_DRIVE_CAGE_RE.test(String(it?.description || '')) && !cleanBaseSKU(it?.sku));
  if (hasUncatalogedCustomCage) {
    ambiguities.push({
      category: 'Drive Cage / Backplane',
      issue: 'Drive cage requirement lacks an exact vendor SKU.',
      resolutionPath: 'Query catalog DB and NotebookLM to map exact chassis-compatible drive cage SKU.'
    });
  }
  return ambiguities;
}

function analyzeCategoryDependencies(items = [], catalogData = null, options = {}) {
  const index = catalogData ? buildCatalogSkuIndex(catalogData) : new Map();
  const activeSet = new Set();
  for (const it of (items || [])) {
    if (isOcaModifierTrackingRow(it?.sku, it?.description)) continue;
    const sku = cleanBaseSKU(it?.sku || '');
    const catItem = index.get(sku);
    const mappedCat = catItem ? (catItem.parentCategory || catItem.subCategory || '') : '';
    const desc = String(it?.description || catItem?.skuData?.Description || '').toLowerCase();
    const role = classifyComponentRole(mappedCat, desc);
    activeSet.add(_mapRoleToMatrixCategory(role, desc));
  }

  const storageTopology = classifyDriveCageTopology(items, catalogData);
  const rulesByCat = new Map(CATEGORY_DEPENDENCY_MATRIX.map(r => [r.category, r]));
  const triggeredDependencies = Array.from(activeSet).map(c => rulesByCat.get(c)).filter(Boolean);
  const exemptionsApplied = [];
  if (storageTopology.topology === 'NO_DRIVE_KIT') exemptionsApplied.push('NO_DRIVE_KIT: Hardware storage controller not required.');
  if (storageTopology.topology === 'DIRECT_CONNECT_CAGE') exemptionsApplied.push('DIRECT_CONNECT_CAGE: Direct-attach backplane does not require a hardware RAID controller.');
  if (storageTopology.hasVroc && storageTopology.controllers.length === 0) exemptionsApplied.push('VROC: Intel VROC software RAID exempts Smart Storage Battery.');

  const unresolvedAmbiguities = _collectUnresolvedCategoryAmbiguities(storageTopology, items);
  const chassisId = options?.chassisId || options?.chassis || '';
  const escalationGuidance = {
    notebookQueryHints: triggeredDependencies.map(d => `[${d.category}] ${d.ambiguityEscalation.notebookQueryHint}`),
    graphifySymbols: Array.from(new Set(triggeredDependencies.flatMap(d => d.ambiguityEscalation.graphifySymbols))),
    trustedWebQueryHints: triggeredDependencies.map(d => `${chassisId ? `${chassisId.replace(/_/g, ' ')} ` : ''}${d.ambiguityEscalation.trustedWebQueryHint}`)
  };

  return {
    activeCategories: Array.from(activeSet),
    storageTopology,
    triggeredDependencies,
    exemptionsApplied,
    unresolvedAmbiguities,
    escalationGuidance
  };
}

function queryLocalGraphifyNeighborhood(concept = '', maxResults = 8) {
  const candidates = [
    path.join(process.cwd(), 'graphify-out', 'graph.json'),
    path.resolve(__dirname, '..', '..', '..', 'graphify-out', 'graph.json')
  ];
  const graphPath = candidates.find(p => fs.existsSync(p));
  if (!graphPath) {
    return { available: false, reason: 'graphify-out/graph.json not found on disk.', nodes: [] };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
    const nodes = Array.isArray(raw.nodes) ? raw.nodes : [];
    const tokens = String(concept || '').toLowerCase().split(/\s+/).filter(t => t.length >= 3);
    if (tokens.length === 0) return { available: true, totalNodes: nodes.length, nodes: [] };
    const scored = [];
    for (const node of nodes) {
      const hay = `${node.id || ''} ${node.label || ''} ${node.source_file || ''} ${node.community || ''}`.toLowerCase();
      let score = 0;
      for (const tok of tokens) {
        if (hay.includes(tok)) score++;
      }
      if (score > 0) scored.push({ id: node.id, label: node.label, sourceFile: node.source_file, location: node.location, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return { available: true, totalNodes: nodes.length, nodes: scored.slice(0, maxResults) };
  } catch (err) {
    return { available: false, reason: err.message, nodes: [] };
  }
}

const {
  CANONICAL_CATEGORY_SCHEMA,
  extractCanonicalAttributes,
  getCanonicalCategorySchema
} = require('./attribute_vectors.js');

module.exports = {
  CATEGORY_DEPENDENCY_MATRIX,
  CANONICAL_CATEGORY_SCHEMA,
  extractCanonicalAttributes,
  getCanonicalCategorySchema,
  classifyDriveCageTopology,
  getCategoryDependencyMatrix,
  analyzeCategoryDependencies,
  queryLocalGraphifyNeighborhood
};
