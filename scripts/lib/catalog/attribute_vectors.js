'use strict';
/**
 * scripts/lib/catalog/attribute_vectors.js
 *
 * Canonical vendor-neutral attribute extraction across all enterprise BOM categories
 * (Chassis, Processor, Memory, Storage Controller, Boot Device, Drive, Networking/FC/Optics,
 * Power Supply, Cooling/Thermal, GPU/Accelerator, Software/Support/Services).
 */

const fs = require('fs');
const path = require('path');
const { cleanBaseSKU } = require('./sku.js');
const { classifyComponentRole } = require('./product_meta.js');
const {
  extractManagementLicenseMetadata,
  extractSupportTermYears,
  extractIloLicenseMetadata,
  isHardwareBreakFixSupport,
  isOnsiteInstallationService,
  isRemoteInstallationService
} = require('../aspects/support_manufacturing.js');

const VENDORS_CONFIG_DIR = path.resolve(__dirname, '../../config/vendors');
let cachedVendorMatchers = null;

function _loadVendorMatchers() {
  if (cachedVendorMatchers) return cachedVendorMatchers;
  const matchers = [
    { vendor: 'HPE', pattern: /\b(hpe|proliant|synergy|alletra|storeever|storeonce|ilo\s*\d?|tech\s*care|compute\s*ops)\b/i },
    { vendor: 'Dell', pattern: /\b(dell|poweredge|powerstore|powervault|powerswitch|idrac|openmanage|perc|boss-n1|prosupport)\b/i },
    { vendor: 'Huawei', pattern: /\b(huawei|fusionserver|taishan|kunlun|oceanstor|cloudengine|ibmc|imaster|fusiondirector|hi-care)\b/i },
    { vendor: 'Cisco', pattern: /\b(cisco|ucs|nexus|catalyst|cimc|intersight)\b/i },
    { vendor: 'Lenovo', pattern: /\b(lenovo|thinksystem|thinkagile|xclarity)\b/i }
  ];
  const seen = new Map(matchers.map((entry) => [entry.vendor.toUpperCase(), entry]));
  try {
    for (const dirent of fs.readdirSync(VENDORS_CONFIG_DIR, { withFileTypes: true })) {
      if (!dirent.isDirectory()) continue;
      const policyPath = path.join(VENDORS_CONFIG_DIR, dirent.name, 'policy.json');
      if (!fs.existsSync(policyPath)) continue;
      const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
      const vendorId = String(policy.vendorId || dirent.name).trim();
      if (!vendorId) continue;
      const tokens = [
        vendorId,
        policy.vendorName,
        policy.terminology?.portalName,
        policy.terminology?.rulesEngine,
        ...(Array.isArray(policy.aliases) ? policy.aliases : [])
      ].map((v) => String(v || '').trim()).filter((v) => v.length >= 2);
      if (!tokens.length) continue;
      const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const policyRe = new RegExp(`\\b(?:${escaped.join('|')})\\b`, 'i');
      const existing = seen.get(vendorId.toUpperCase());
      if (existing) {
        existing.pattern = new RegExp(`(?:${existing.pattern.source})|(?:${policyRe.source})`, 'i');
      } else {
        const added = { vendor: vendorId, pattern: policyRe };
        seen.set(vendorId.toUpperCase(), added);
        matchers.push(added);
      }
    }
  } catch { /* fallback to built-in vendor matchers */ }
  cachedVendorMatchers = matchers;
  return matchers;
}

const CANONICAL_CATEGORY_SCHEMA = Object.freeze({
  Chassis: ['uHeight', 'socketCount', 'bayFormFactor', 'bayCount', 'bmcTier'],
  Processor: ['cpuVendor', 'family', 'model', 'cores', 'baseClockGhz', 'l3CacheMb', 'tdpWatts'],
  Memory: ['capacityGb', 'ddrGen', 'speedMt', 'rank', 'moduleType'],
  'Storage Controller': ['protocol', 'portCount', 'cacheGb', 'formFactor', 'needsBattery'],
  'Boot Device': ['isDedicatedBoot', 'capacityGb', 'raidLevel'],
  Drive: ['formFactor', 'capacityGb', 'interfaceProtocol', 'endurance', 'isSed'],
  'Networking / FC / Optics': ['portCount', 'speedGbps', 'fabricProtocol', 'formFactor', 'opticsIncluded'],
  'Power Supply': ['wattage', 'efficiency', 'inputType'],
  'Cooling / Thermal': ['thermalType', 'packaging'],
  'GPU / Accelerator': ['gpuModel', 'tier', 'tdpWatts', 'formFactor'],
  'Software / Support / Services': ['layer', 'termYears', 'slaTier', 'retention']
});

function _num(text, re) {
  const m = text.match(re);
  return m ? Number(m[1]) : null;
}

function _detectVendor(sku = '', desc = '') {
  const s = `${sku} ${desc}`;
  for (const { vendor, pattern } of _loadVendorMatchers()) {
    if (pattern.test(s)) return vendor;
  }
  return 'UNKNOWN';
}

function _extractProcessorAttrs(desc) {
  const lower = desc.toLowerCase();
  const cpuVendor = lower.includes('epyc') || lower.includes('amd') ? 'AMD' : (lower.includes('xeon') || lower.includes('intel') ? 'Intel' : null);
  const modelMatch = desc.match(/\b(?:xeon\s*(?:platinum|gold|silver|bronze)?|epyc|kunpeng)\s*([\d]{4}[a-z0-9+]*)/i);
  const clockMatch = desc.match(/(\d+(?:\.\d+)?)\s*ghz/i);
  return {
    cpuVendor,
    model: modelMatch ? modelMatch[1].toUpperCase() : null,
    cores: _num(desc, /(\d+)\s*-?\s*c(?:ores?)?\b/i),
    baseClockGhz: clockMatch ? Number(clockMatch[1]) : null,
    l3CacheMb: _num(desc, /(\d+)\s*mb\s*(?:l3|cache)/i),
    tdpWatts: _num(desc, /(\d+)\s*w\b/i)
  };
}

function _extractMemoryAttrs(desc) {
  const capTb = _num(desc, /(\d+(?:\.\d+)?)\s*tb\b/i);
  const capGb = capTb !== null ? Math.round(capTb * 1024) : _num(desc, /(\d+)\s*gb\b/i);
  const ddrMatch = desc.match(/\bddr(\d+)\b/i);
  const rankMatch = desc.match(/\b([124]rx[48])\b/i);
  const lower = desc.toLowerCase();
  const moduleType = lower.includes('mrdimm') ? 'MRDIMM' : (lower.includes('lrdimm') ? 'LRDIMM' : (lower.includes('rdimm') || lower.includes('dimm') ? 'RDIMM' : null));
  return {
    capacityGb: capGb,
    ddrGen: ddrMatch ? `DDR${ddrMatch[1]}` : null,
    speedMt: _num(desc, /ddr\d+-(\d{4,5})/i) ?? _num(desc, /(\d{4,5})\s*(?:mt\/s|mhz)/i),
    rank: rankMatch ? rankMatch[1].toUpperCase() : null,
    moduleType
  };
}

function _extractDriveAttrs(desc) {
  const lower = desc.toLowerCase();
  const tb = _num(desc, /(\d+(?:\.\d+)?)\s*tb\b/i);
  const gb = _num(desc, /(\d+)\s*gb\b/i);
  const capacityGb = tb !== null ? Math.round(tb * 1000) : gb;
  const formFactor = lower.includes('edsff') || lower.includes('e3.s') ? 'EDSFF' : (lower.includes('lff') || lower.includes('3.5') ? 'LFF' : (lower.includes('m.2') ? 'M.2' : (lower.includes('sff') || lower.includes('2.5') || lower.includes('u.3') || lower.includes('u.2') ? 'SFF' : null)));
  const interfaceProtocol = lower.includes('nvme') || lower.includes('u.3') || lower.includes('u.2') || lower.includes('edsff') ? 'NVMe' : (lower.includes('sas') ? 'SAS' : (lower.includes('sata') ? 'SATA' : null));
  const endurance = /\b(?:wi|write\s*intensive|mixed\s*use\s*high)\b/i.test(desc) ? 'WI' : (/\b(?:mu|mixed\s*use)\b/i.test(desc) ? 'MU' : (/\b(?:ri|read\s*intensive)\b/i.test(desc) ? 'RI' : null));
  return {
    formFactor,
    capacityGb,
    interfaceProtocol,
    endurance,
    isSed: /\b(?:sed|self[\s-]*encrypt|fips)\b/i.test(desc)
  };
}

function _extractNetworkingAttrs(desc) {
  const lower = desc.toLowerCase();
  const isFc = /\b(?:fc|fibre\s*channel|sn\d{4}|lpe\d+|qle\d+)\b/i.test(desc);
  const fabricProtocol = isFc
    ? 'FC'
    : (/\b(?:infiniband|ndr|hdr)\b/i.test(desc) ? (/\bndr\b|400/i.test(desc) ? 'INFINIBAND_NDR' : 'INFINIBAND_HDR') : (/\b(?:roce|rocev2|rdma)\b/i.test(desc) ? 'ROCE_V2' : 'ETHERNET'));
  const speedGbps = _num(desc, /(\d+)\s*(?:gb|gbe|gb\/s|gbps)\b/i) || (/\b32g\b/i.test(desc) ? 32 : (/\b64g\b/i.test(desc) ? 64 : null));
  const portCount = _num(desc, /(\d+)\s*-?\s*port\b/i) ?? (/\bdual[\s-]*port\b/i.test(desc) ? 2 : (/\bquad[\s-]*port\b/i.test(desc) ? 4 : null));
  const formFactor = lower.includes('ocp') ? 'OCP3' : (lower.includes('osfp') ? 'OSFP' : (lower.includes('qsfp') ? 'QSFP' : (lower.includes('sfp') ? 'SFP' : 'PCIe')));
  return {
    portCount,
    speedGbps,
    fabricProtocol,
    formFactor,
    opticsIncluded: /\b(?:included|bundled|sr\s*included)\b/i.test(desc)
  };
}

function _extractPowerAttrs(desc) {
  const lower = desc.toLowerCase();
  const efficiency = lower.includes('titanium') ? 'Titanium' : (lower.includes('platinum') ? 'Platinum' : null);
  const inputType = /(?:\bdc\b|-?48\s*v\s*dc)/i.test(desc) ? 'DC' : 'AC';
  return {
    wattage: _num(desc, /(\d{3,4})\s*w\b/i),
    efficiency,
    inputType
  };
}

function _extractSoftwareAndServiceAttrs(sku, desc) {
  const mgmt = extractManagementLicenseMetadata(sku, desc);
  const ilo = extractIloLicenseMetadata(sku, desc);
  const lower = desc.toLowerCase();
  if (mgmt && mgmt.tier !== 'FIO_PRECLAIM_TOKEN') {
    return {
      layer: 'FLEET_SAAS',
      termYears: mgmt.termYears,
      slaTier: mgmt.tier,
      retention: 'NONE'
    };
  }
  if (ilo || /\b(?:idrac|ibmc|cimc|xclarity)\b/i.test(desc)) {
    const tier = ilo ? ilo.tier : (lower.includes('enterprise') || lower.includes('datacenter') ? 'BMC_ENTERPRISE' : 'BMC_STANDARD');
    return { layer: 'BMC', termYears: null, slaTier: tier, retention: 'NONE' };
  }
  if (isOnsiteInstallationService(sku, desc) || isRemoteInstallationService(sku, desc)) {
    return {
      layer: 'DEPLOYMENT',
      termYears: null,
      slaTier: isRemoteInstallationService(sku, desc) ? 'REMOTE' : 'ONSITE',
      retention: 'NONE'
    };
  }
  if (isHardwareBreakFixSupport(sku, desc) || /\b(?:prosupport|hi-care|smart\s*net|premier\s*support)\b/i.test(desc)) {
    const retention = /\bcdmr\b/i.test(desc) ? 'CDMR' : (/\bgdmr\b/i.test(desc) ? 'GDMR' : (/\bdmr\b/i.test(desc) ? 'DMR' : 'NONE'));
    const slaTier = /critical|24x7|mission|4h/i.test(desc) ? 'CRITICAL_24X7' : (/essential|prosupport\s*plus/i.test(desc) ? 'ESSENTIAL' : 'BASIC_NBD');
    return {
      layer: 'HW_BREAKFIX',
      termYears: extractSupportTermYears(sku, desc),
      slaTier,
      retention
    };
  }
  return { layer: 'SOFTWARE_OTHER', termYears: extractSupportTermYears(sku, desc), slaTier: null, retention: 'NONE' };
}

const CANONICAL_CATEGORY_RULES = [
  { cat: 'Processor', match: (role, desc) => role === 'Processor' || /\b(?:xeon|epyc|kunpeng)\b/i.test(desc) },
  { cat: 'Memory', match: (role, desc) => role === 'Memory' || /\b(?:rdimm|lrdimm|mrdimm|ddr\d+)\b/i.test(desc) },
  { cat: 'Boot Device', match: (role, desc) => role === 'Boot Device' || /\b(?:ns204i|boss-n1|boss|m\.2\s*boot)\b/i.test(desc) },
  { cat: 'Storage Controller', match: (role, desc) => role === 'Storage Controller' || /\b(?:mr\d{3}i|sr\d{3}i|perc\s*h\d+|raid\s*controller|smart\s*array)\b/i.test(desc) },
  {
    cat: 'GPU / Accelerator',
    match: (role, desc) => role === 'GPU / Accelerator' || (/\b(?:h200|h100|b100|b200|gb200|l40s?|l4|a100|rtx|mi\d{3}|gaudi|gpu|accelerator|ascend)\b/i.test(desc) && role !== 'Service & Support' && role !== 'Operating System / License')
  },
  { cat: 'Power Supply', match: (role, desc) => role === 'Power Supply' || /\b(?:power\s*supply|psu|flex\s*slot)\b/i.test(desc) },
  { cat: 'Cooling / Thermal', match: (role, desc) => role === 'Cooling / Thermal' || /\b(?:fan\s*kit|heatsink|heat\s*sink|cold\s*plate|air\s*baffle|liquid\s*cool)\b/i.test(desc) },
  { cat: 'Networking / FC / Optics', match: (role, desc) => ['Network Adapter', 'Fibre Channel HBA', 'Transceiver'].includes(role) || /\b(?:gbe|sfp28|qsfp|ocp3|infiniband|connectx|fc\s*hba)\b/i.test(desc) },
  { cat: 'Drive', match: (role, desc) => role === 'Drive Cage / Drive' || (/\b(?:ssd|hdd|nvme|sff|lff|edsff)\b/i.test(desc) && /\b(?:tb|gb)\b/i.test(desc) && !/\b(?:cto|server|chassis)\b/i.test(desc)) },
  { cat: 'Software / Support / Services', match: (role, _d, lower) => role === 'Service & Support' || role === 'Operating System / License' || /\b(?:tech\s*care|prosupport|hi-care|compute\s*ops|oneview|ilo|idrac|ibmc|saas|windows\s*server|vmware|rhel|startup\s*svc)\b/i.test(lower) },
  { cat: 'Chassis', match: (role, desc) => role === 'Base Chassis' || /\b(?:poweredge|fusionserver|proliant|thinksystem|ucs\s*[bc]|alletra|cto\s*server)\b/i.test(desc) }
];

function _resolveCanonicalCategory(role, _sku, desc) {
  const lower = desc.toLowerCase();
  return CANONICAL_CATEGORY_RULES.find((entry) => entry.match(role, desc, lower))?.cat || 'Other / Accessory';
}

function _extractStorageControllerAttrs(desc) {
  const portMatch = desc.match(/(?:mr|sr)\d(\d{2})/i) || desc.match(/(\d+)\s*-?\s*port/i);
  return {
    protocol: /tri[\s-]*mode|nvme/i.test(desc) ? 'Tri-Mode' : 'SAS/SATA',
    portCount: portMatch ? Number(portMatch[1]) : 8,
    cacheGb: _num(desc, /(\d+)\s*gb\b/i),
    formFactor: /(?:-o\b|\bocp\b)/i.test(desc) ? 'OCP' : 'PCIe',
    needsBattery: !/vroc/i.test(desc)
  };
}

function _extractGpuAttrs(desc) {
  const modelMatch = desc.match(/\b((?:nvidia\s+)?(?:h100|h200|b100|b200|gb200|l40s?|l4|a100|a40|a30|a16|a2|rtx\s*(?:pro\s*)?\d{4}\s*(?:ada|blackwell)?|instinct\s*mi\d{3}[a-z]?|mi\d{3}[a-z]?|gaudi\s*\d?))\b/i);
  const gpuModel = modelMatch ? modelMatch[1].replace(/\s+/g, ' ').trim() : null;
  const tier = /\b(?:h100|h200|b100|b200|gb200|a100|mi\d{3}|gaudi)\b/i.test(desc)
    ? 'Training / HPC'
    : (/\b(?:l40s?|l4|a30|a16|a2)\b/i.test(desc)
      ? 'Inference / AI'
      : (/\b(?:rtx|quadro)\b/i.test(desc) ? 'Workstation / Viz' : null));
  const formFactor = /\b(?:sxm\d*|oam)\b/i.test(desc)
    ? 'SXM/OAM'
    : (/\b(?:hhhl|low\s*profile|single[\s-]*wide)\b/i.test(desc)
      ? 'Single-Wide PCIe'
      : (/\b(?:double[\s-]*wide|dw)\b/i.test(desc) ? 'Double-Wide PCIe' : (/\bpcie\b/i.test(desc) ? 'PCIe' : null)));
  return {
    gpuModel,
    vramGb: _num(desc, /\b(\d{2,3})\s*gb\b/i),
    tier,
    tdpWatts: _num(desc, /\b(\d{2,4})\s*w\b/i),
    formFactor
  };
}

function _extractCoolingAttrs(desc) {
  let thermalType = null;
  if (/\b(?:dlc|liquid\s*cool|cold\s*plate)\b/i.test(desc)) thermalType = 'Direct Liquid Cooling';
  else if (/(?:high|max)\s*perf.*fan/i.test(desc)) thermalType = 'High Performance Fan';
  else if (/\bfan\b/i.test(desc)) thermalType = 'Standard Fan';
  else if (/(?:high|max)\s*perf.*heat\s*sink/i.test(desc)) thermalType = 'Performance Heat Sink';
  else if (/\bheat\s*sink\b|\bheatsink\b/i.test(desc)) thermalType = 'Standard Heat Sink';
  else if (/\bbaffle\b/i.test(desc)) thermalType = 'Air Baffle';
  const packaging = /\bkit\b/i.test(desc) ? 'Kit' : (/\bmodule\b/i.test(desc) ? 'Module' : (/\bpack\b/i.test(desc) ? 'Pack' : null));
  return { thermalType, packaging };
}

function _extractChassisAttrs(desc) {
  const explicitU = _num(desc, /\b([1-8])u\b/i);
  const uHeight = explicitU
    ?? (/dl360|r6\d{2}|2288h\s*1u/i.test(desc) ? 1 : (/dl380a|r8\d{2}|dl5\d{2}/i.test(desc) ? 4 : (/dl\d{3}|r7\d{2}/i.test(desc) ? 2 : null)));
  const explicitSockets = _num(desc, /\b([1248])p\b/i) ?? _num(desc, /\b([1248])-?(?:socket|cpu)\b/i);
  const socketCount = explicitSockets
    ?? (/dl5\d{2}|r9\d{2}/i.test(desc) ? 4 : (/dl1\d{2}|r[23]50/i.test(desc) ? 1 : 2));
  const bayFormFactor = /\bedsff\b/i.test(desc) ? 'EDSFF' : (/\blff\b/i.test(desc) ? 'LFF' : (/\bsff\b/i.test(desc) ? 'SFF' : null));
  return {
    uHeight,
    socketCount,
    bayFormFactor,
    bayCount: _num(desc, /\b(\d{1,2})\s*(?:sff|lff|edsff)\b/i)
  };
}

function _extractAttributesByCategory(category, sku, desc) {
  const extractors = {
    Processor: () => _extractProcessorAttrs(desc),
    Memory: () => _extractMemoryAttrs(desc),
    Drive: () => _extractDriveAttrs(desc),
    'Networking / FC / Optics': () => _extractNetworkingAttrs(desc),
    'Power Supply': () => _extractPowerAttrs(desc),
    'Cooling / Thermal': () => _extractCoolingAttrs(desc),
    'GPU / Accelerator': () => _extractGpuAttrs(desc),
    'Software / Support / Services': () => _extractSoftwareAndServiceAttrs(sku, desc),
    'Boot Device': () => ({
      isDedicatedBoot: true,
      capacityGb: _num(desc, /(\d+)\s*gb\b/i),
      raidLevel: /\braid\s*1\b/i.test(desc) ? 'RAID1' : null
    }),
    'Storage Controller': () => _extractStorageControllerAttrs(desc),
    Chassis: () => _extractChassisAttrs(desc)
  };
  return extractors[category] ? extractors[category]() : {};
}

function extractCanonicalAttributes(item = {}, catalogEntry = null) {
  const rawSku = String(item.sku || item['Product #'] || '').trim();
  const sku = cleanBaseSKU(rawSku) || rawSku;
  const desc = String(item.description || item.Description || catalogEntry?.Description || '').trim();
  const parentCat = String(item.category || item.parentCategory || catalogEntry?.parentCategory || '');
  const role = classifyComponentRole(parentCat, desc);
  const category = _resolveCanonicalCategory(role, sku, desc);
  const vendor = item.vendor || _detectVendor(sku, desc);
  const attributes = _extractAttributesByCategory(category, sku, desc);

  return { sku, rawSku, description: desc, vendor, role, category, attributes };
}

function extractCompactCanonicalSpecs(item = {}, catalogEntry = null) {
  const extracted = extractCanonicalAttributes(item, catalogEntry);
  const compact = { vendor: extracted.vendor, category: extracted.category };
  for (const [key, value] of Object.entries(extracted.attributes || {})) {
    if (value !== null && value !== undefined && value !== '') {
      compact[key] = value;
    }
  }
  return compact;
}

function getCanonicalCategorySchema() {
  return CANONICAL_CATEGORY_SCHEMA;
}

module.exports = {
  CANONICAL_CATEGORY_SCHEMA,
  extractCanonicalAttributes,
  extractCompactCanonicalSpecs,
  getCanonicalCategorySchema
};
