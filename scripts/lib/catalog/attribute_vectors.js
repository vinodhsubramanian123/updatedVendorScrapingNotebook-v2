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
const { lookupGpuQuickSpecs, lookupLtoQuickSpecs } = require('./gpu_specs_lookup.js');
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
  'Synergy Enclosure': ['uHeight', 'bayCount', 'interconnectBays'],
  'Storage Array': ['arrayTopology', 'mediaTier', 'maxDrives', 'uHeight'],
  'Tape Library': ['ltoGen', 'nativeCapacityTb', 'compressedCapacityTb', 'hostInterface', 'slotCount'],
  'Tape Drive': ['ltoGen', 'nativeCapacityTb', 'compressedCapacityTb', 'hostInterface'],
  'Storage Media': ['ltoGen', 'nativeCapacityTb', 'compressedCapacityTb', 'mediaType'],
  Processor: ['cpuVendor', 'family', 'model', 'cores', 'baseClockGhz', 'l3CacheMb', 'tdpWatts'],
  Memory: ['capacityGb', 'ddrGen', 'speedMt', 'rank', 'moduleType'],
  'Storage Controller': ['protocol', 'portCount', 'cacheGb', 'formFactor', 'needsBattery'],
  'Boot Device': ['isDedicatedBoot', 'capacityGb', 'raidLevel'],
  Drive: ['formFactor', 'capacityGb', 'interfaceProtocol', 'endurance', 'isSed'],
  'Networking / FC / Optics': [
    'portCount', 'speedGbps', 'fabricProtocol', 'formFactor', 'opticsIncluded',
    'reach', 'reachDistance', 'fiberMode', 'wavelengthNm',
    'totalPorts', 'licensedPorts', 'airflow'
  ],
  'Power Supply': ['wattage', 'efficiency', 'inputType'],
  'Cooling / Thermal': ['thermalType', 'packaging'],
  'GPU / Accelerator': ['gpuModel', 'vramGb', 'tier', 'tdpWatts', 'formFactor', 'auxPower'],
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

const REACH_SMF_CODES = new Set(['LR', 'LR4', 'LR1', 'ER', 'ZR', 'DR1', 'DR4', 'FR4', 'FR1', 'LW', 'ELW']);
const REACH_MMF_CODES = new Set(['SR', 'SR4', 'SR8', 'SW', 'AOC']);
const REACH_WAVELENGTH_NM = Object.freeze({
  SR: 850, SR4: 850, SR8: 850, SW: 850,
  LR: 1310, LR4: 1310, LR1: 1310, DR1: 1310, DR4: 1310, FR4: 1310, FR1: 1310, LW: 1310,
  ER: 1550, ELW: 1550, ZR: 1550
});

function _extractOpticsReachCode(desc) {
  const codeMatch = desc.match(/\b(ELW|DR4|FR4|SR4|LR4|SR8|DR1|FR1|LR1|CR4|SR|LR|ER|ZR|SW|LW|DAC|AOC)\b/i);
  if (codeMatch) return codeMatch[1].toUpperCase();
  if (/direct\s*attach\s*copper/i.test(desc)) return 'DAC';
  if (/active\s*optical/i.test(desc)) return 'AOC';
  if (/extended\s*long\s*wave/i.test(desc)) return 'ELW';
  if (/short\s*wave/i.test(desc)) return 'SW';
  if (/long\s*wave/i.test(desc)) return 'LW';
  if (/short\s*range/i.test(desc)) return 'SR';
  if (/long\s*range/i.test(desc)) return 'LR';
  return null;
}

function _extractOpticsAttrs(desc) {
  const reachCode = _extractOpticsReachCode(desc);
  const distMatch = desc.match(/\b(\d+(?:\.\d+)?)\s*(km|m)\b/i);
  const reachDistance = distMatch ? `${distMatch[1]}${distMatch[2].toLowerCase()}` : null;
  const reach = reachCode || reachDistance || null;

  let fiberMode = null;
  if (reachCode === 'DAC' || reachCode === 'CR4' || /\b(?:direct\s*attach\s*copper|twinax|copper|base-t|rj45|cat5e?|cat6a?)\b/i.test(desc)) {
    fiberMode = 'Copper';
  } else if (/\b(?:smf|single[\s-]*mode|os[12]|1310\s*nm|1550\s*nm)\b/i.test(desc) || (reachCode && REACH_SMF_CODES.has(reachCode))) {
    fiberMode = 'SMF';
  } else if (/\b(?:mmf|multi[\s-]*mode|om[345]|active\s*optical|850\s*nm)\b/i.test(desc) || (reachCode && REACH_MMF_CODES.has(reachCode))) {
    fiberMode = 'MMF';
  }

  const explicitWl = _num(desc, /\b(\d{3,4})\s*nm\b/i);
  const inferredWl = fiberMode !== 'Copper' && reachCode ? (REACH_WAVELENGTH_NM[reachCode] || null) : null;
  const wavelengthNm = explicitWl ?? inferredWl;
  return { reach, reachDistance, fiberMode, wavelengthNm };
}

function _extractSwitchAttrs(desc) {
  const isSwitch = /\b(?:switch|sn\d{4}[a-z]?|brocade|nexus|cumulus|f32|frame\s*link)\b/i.test(desc)
    && !/\b(?:rail|cable\s*tray|installation\s*kit|power\s*cord|transceiver\s*kit)\b/i.test(desc);
  if (!isSwitch) return { totalPorts: null, licensedPorts: null, airflow: null };

  let totalPorts = null;
  let licensedPorts = null;
  const ratioMatch = desc.match(/\b(\d{1,3})\s*\/\s*(\d{1,3})\b/);
  if (ratioMatch && !/\b(?:10\/25|10\/40|25\/100|40\/100|1\/10)\b/.test(ratioMatch[0])) {
    const a = Number(ratioMatch[1]);
    const b = Number(ratioMatch[2]);
    totalPorts = Math.max(a, b);
    licensedPorts = Math.min(a, b);
  } else {
    const portCount = _num(desc, /(\d{1,3})\s*-?\s*port\b/i) ?? _num(desc, /\b(\d{1,3})\s*(?:qsfp\w*|sfp\w*)\b/i);
    if (portCount !== null) {
      totalPorts = portCount;
      licensedPorts = portCount;
    }
  }

  let airflow = null;
  if (/port\s*side\s*intake|connector\s*to\s*power|port[\s-]*to[\s-]*power|front[\s-]*to[\s-]*back/i.test(desc)) {
    airflow = 'Port Side Intake';
  } else if (/power\s*to\s*connector|port\s*side\s*exhaust|power[\s-]*to[\s-]*port|back[\s-]*to[\s-]*front/i.test(desc)) {
    airflow = 'Power to Connector';
  }
  return { totalPorts, licensedPorts, airflow };
}

function _extractNetworkingAttrs(desc) {
  const lower = desc.toLowerCase();
  const isFc = /\b(?:fc|fibre\s*channel|sn\d{4}[bc]?|lpe\d+|qle\d+|brocade)\b/i.test(desc);
  const fabricProtocol = isFc
    ? 'FC'
    : (/\b(?:infiniband|ndr|hdr)\b/i.test(desc) ? (/\bndr\b|400/i.test(desc) ? 'INFINIBAND_NDR' : 'INFINIBAND_HDR') : (/\b(?:roce|rocev2|rdma)\b/i.test(desc) ? 'ROCE_V2' : 'ETHERNET'));
  const speedGbps = _num(desc, /(\d+)\s*(?:gb|gbe|gb\/s|gbps)\b/i)
    || _num(desc, /\b(\d{2,3})g\b/i)
    || null;
  const portCount = _num(desc, /(\d+)\s*-?\s*port\b/i) ?? (/\bdual[\s-]*port\b/i.test(desc) ? 2 : (/\bquad[\s-]*port\b/i.test(desc) ? 4 : null));
  const formFactor = lower.includes('ocp') ? 'OCP3' : (lower.includes('osfp') ? 'OSFP' : (lower.includes('qsfp') ? 'QSFP' : (lower.includes('sfp') ? 'SFP' : (/\bswitch\b/i.test(desc) ? 'Switch' : 'PCIe'))));
  const optics = _extractOpticsAttrs(desc);
  const sw = _extractSwitchAttrs(desc);
  return {
    portCount,
    speedGbps,
    fabricProtocol,
    formFactor,
    opticsIncluded: /\b(?:included|bundled|sr\s*included)\b/i.test(desc),
    ...optics,
    ...sw
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

function _isNonGpuItem(role, desc) {
  if (role === 'Service & Support' || role === 'Operating System / License') return true;
  if (/\b(?:switch|cumulus|connectx|infiniband|e-ltu|e-rtu|subscription|virtual\s*(?:workstation|applications|pc)|ai\s*enterprise|ml\s*dev|fio\s*configuration|gpu\s*mode)\b/i.test(desc)) {
    return true;
  }
  return /\b(?:cable|cord|bridge|enablement\s*kit|baffle|heatsink|heat\s*sink|fan\s*kit|bracket|riser)\b/i.test(desc)
    && !/\baccelerator\b/i.test(desc);
}

function _isTapeDriveDesc(role, desc) {
  if (role === 'Tape Drive') return true;
  return /\b(?:lto[-\s]?[3-9]|ultrium)\b/i.test(desc)
    && /\b(?:drive|upgrade\s*kit)\b/i.test(desc)
    && !/\b(?:cartridge|worm|cleaning|bar\s*code|software|license|ltu)\b/i.test(desc);
}

function _isStorageMediaDesc(role, desc) {
  if (role === 'Storage Media') return true;
  return /\b(?:lto[-\s]?[3-9]|ultrium)\b/i.test(desc)
    && /\b(?:cartridge|worm|cleaning|bar\s*code|media|pack)\b/i.test(desc);
}

function _isTapeLibraryDesc(desc) {
  return /\b(?:msl\d{4}|tape\s*library|tape\s*autoloader)\b/i.test(desc)
    && !/\b(?:lto[-\s]?[3-9]|ultrium|drive|cartridge|cable|cord|power\s*supply|encryption|license|ltu|support|service)\b/i.test(desc);
}

function _isSynergyEnclosureDesc(role, desc) {
  if (role === 'Composable Enclosure') return true;
  return /\bsynergy\s*12000\b/i.test(desc)
    && /\b(?:frame|enclosure)\b/i.test(desc)
    && !/\b(?:cable|cord|rail|kit|blank|power\s*supply|module)\b/i.test(desc);
}

function _isStorageArrayDesc(desc) {
  const isArrayBrand = /\b(?:alletra|msa\s*\d{4}|nimble|powerstore|oceanstor)\b/i.test(desc);
  if (!isArrayBrand) return false;
  const isBaseOrShelf = /\b(?:base\s*(?:configuration|system)|storage\s*array|expansion\s*shelf|jbof|2u\s*chassis|controller\s*node|dual[\s-]*node|ksa)\b/i.test(desc);
  const isPeripheral = /\b(?:ssd|hdd|power\s*supply|power\s*cord|cable|transceiver|switch|rail|bluetooth|breaker|grounding|tracking|license|ltu|support|service|drive\s*blank)\b/i.test(desc);
  return isBaseOrShelf && !isPeripheral;
}

function _isConfirmedBaseServerChassis(role, desc) {
  if (/\b(?:kit|cable|cord|cooling|baffle|heatsink|heat\s*sink|rail|bezel|blank|bracket|tracking|localization|switch|alletra|msl\d{4}|tape|synergy\s*12000)\b/i.test(desc)) {
    return false;
  }
  if (role === 'Base Chassis') return true;
  return /\b(?:cto\s*server|configure-to-order\s*(?:server|compute\s*module|chassis)|base\s*chassis)\b/i.test(desc);
}

const CANONICAL_CATEGORY_RULES = [
  { cat: 'Software / Support / Services', match: (role, _d, lower) => role === 'Service & Support' || role === 'Operating System / License' || /\b(?:tech\s*care|prosupport|hi-care|compute\s*ops|oneview|ilo|idrac|ibmc|saas|e-[lr]tu|windows\s*server|vmware|rhel|startup\s*svc|virtual\s*(?:workstation|applications|pc)|ai\s*enterprise)\b/i.test(lower) },
  { cat: 'Tape Drive', match: (role, desc) => _isTapeDriveDesc(role, desc) },
  { cat: 'Storage Media', match: (role, desc) => _isStorageMediaDesc(role, desc) },
  { cat: 'Tape Library', match: (_r, desc) => _isTapeLibraryDesc(desc) },
  { cat: 'Synergy Enclosure', match: (role, desc) => _isSynergyEnclosureDesc(role, desc) },
  { cat: 'Storage Array', match: (_r, desc) => _isStorageArrayDesc(desc) },
  { cat: 'Processor', match: (role, desc) => role === 'Processor' || /\b(?:xeon|epyc|kunpeng)\b/i.test(desc) },
  { cat: 'Memory', match: (role, desc) => role === 'Memory' || /\b(?:rdimm|lrdimm|mrdimm|ddr\d+)\b/i.test(desc) },
  { cat: 'Boot Device', match: (role, desc) => role === 'Boot Device' || /\b(?:ns204i|boss-n1|boss|m\.2\s*boot)\b/i.test(desc) },
  { cat: 'Storage Controller', match: (role, desc) => (role === 'Storage Controller' || /\b(?:mr\d{3}i|sr\d{3}i|perc\s*h\d+|raid\s*controller|smart\s*array)\b/i.test(desc)) && !/\b(?:lto[-\s]?[3-9]|ultrium|tape)\b/i.test(desc) },
  { cat: 'Networking / FC / Optics', match: (role, desc) => ['Network Adapter', 'Fibre Channel HBA', 'Transceiver', 'Network Switch', 'SAN Switch', 'Fabric Interconnect'].includes(role) || /\b(?:gbe|sfp\+|sfp28|sfp56|qsfp\w*|osfp|ocp3|infiniband|connectx|fc\s*hba|fibre\s*channel\s*switch|\bsn\d{4}[bc]\b|transceiver)\b/i.test(desc) },
  {
    cat: 'GPU / Accelerator',
    match: (role, desc) => !_isNonGpuItem(role, desc) && (role === 'GPU / Accelerator' || Boolean(lookupGpuQuickSpecs(desc)) || /\b(?:h200|h100|b100|b200|gb200|l40s?|l4|a100|a40|a30|a16|a2|rtx|mi\d{3}[a-z]?|gaudi|gpu|accelerator|ascend)\b/i.test(desc))
  },
  { cat: 'Power Supply', match: (role, desc) => role === 'Power Supply' || /\b(?:power\s*supply|psu|flex\s*slot)\b/i.test(desc) },
  { cat: 'Cooling / Thermal', match: (role, desc) => role === 'Cooling / Thermal' || /\b(?:fan\s*kit|heatsink|heat\s*sink|cold\s*plate|air\s*baffle|liquid\s*cool)\b/i.test(desc) },
  { cat: 'Drive', match: (role, desc) => role === 'Drive Cage / Drive' || (/\b(?:ssd|hdd|nvme|sff|lff|edsff)\b/i.test(desc) && /\b(?:tb|gb)\b/i.test(desc) && !/\b(?:cto|server|chassis)\b/i.test(desc)) },
  { cat: 'Chassis', match: (role, desc) => _isConfirmedBaseServerChassis(role, desc) }
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
  const quickSpec = lookupGpuQuickSpecs(desc);
  const modelMatch = desc.match(/\b((?:nvidia\s+)?(?:h100|h200|b100|b200|gb200|l40s?|l4|a100|a40|a30|a16|a2|rtx\s*(?:pro\s*)?\d{4}\s*(?:sff\s*)?(?:ada|blackwell)?|instinct\s*mi\d{3}[a-z]?|mi\d{3}[a-z]?|gaudi\s*\d?))\b/i);
  const gpuModel = quickSpec?.gpuModel || (modelMatch ? modelMatch[1].replace(/\s+/g, ' ').trim() : null);
  const tier = quickSpec?.tier || (/\b(?:h100|h200|b100|b200|gb200|a100|mi\d{3}|gaudi)\b/i.test(desc)
    ? 'Training / HPC'
    : (/\b(?:l40s?|l4|a30|a16|a2)\b/i.test(desc)
      ? 'Inference / AI'
      : (/\b(?:rtx|quadro|a40)\b/i.test(desc) ? 'Workstation / Viz' : null)));
  const explicitFf = /\b(?:sxm\d*|oam)\b/i.test(desc)
    ? 'SXM/OAM'
    : (/\b(?:hhhl|low\s*profile|single[\s-]*wide)\b/i.test(desc)
      ? 'Single-Wide PCIe'
      : (/\b(?:double[\s-]*wide|dw)\b/i.test(desc) ? 'Double-Wide PCIe' : null));
  const formFactor = explicitFf || quickSpec?.formFactor || (/\bpcie\b/i.test(desc) ? 'PCIe' : null);
  const explicitVram = _num(desc, /\b(\d{2,3})\s*gb\b/i);
  const explicitTdp = _num(desc, /\b(\d{2,4})\s*w\b/i);
  return {
    gpuModel,
    vramGb: explicitVram ?? quickSpec?.vramGb ?? null,
    tier,
    tdpWatts: explicitTdp ?? quickSpec?.tdpWatts ?? null,
    formFactor,
    auxPower: quickSpec?.auxPower ?? null
  };
}

function _extractStorageArrayAttrs(desc) {
  let arrayTopology = null;
  if (/\b(?:b101\d{2}|switchless)\b/i.test(desc)) arrayTopology = 'Switchless';
  else if (/\b(?:b102\d{2}|switched|x10\d{3})\b/i.test(desc)) arrayTopology = 'Switched';
  else if (/\balletra.*mp\b|\bb10000\b/i.test(desc)) arrayTopology = 'Modular Disaggregated';
  else if (/\b(?:alletra\s*[69]000|msa|nimble|powerstore|oceanstor)\b/i.test(desc)) arrayTopology = 'Dual-Controller';

  let mediaTier = null;
  if (/\bqlc\b/i.test(desc)) mediaTier = 'QLC';
  else if (/\btlc\b/i.test(desc)) mediaTier = 'TLC';
  else if (/\b(?:nvme|all[\s-]*flash|alletra)\b/i.test(desc)) mediaTier = 'NVMe All-Flash';
  else if (/\bhybrid\b/i.test(desc)) mediaTier = 'Hybrid';

  const explicitDrives = _num(desc, /\b(\d{2,3})\s*(?:drives?|bays?|sff|lff)\b/i);
  let maxDrives = explicitDrives;
  if (maxDrives === null) {
    if (/\b(?:b101\d{2}|switchless)\b/i.test(desc)) maxDrives = 72;
    else if (/\b(?:b102\d{2}|switched)\b/i.test(desc)) maxDrives = 384;
    else if (/\b(?:expansion\s*shelf|jbof|10001|2u\s*chassis)\b/i.test(desc)) maxDrives = 24;
  }

  return {
    arrayTopology,
    mediaTier,
    maxDrives,
    uHeight: _num(desc, /\b([1-8])u\b/i) ?? (/\balletra.*mp\b/i.test(desc) ? 2 : null)
  };
}

function _extractTapeAttrs(desc, kind) {
  const lto = lookupLtoQuickSpecs(desc);
  const hostInterface = /\b(?:fibre\s*channel|fc)\b/i.test(desc) ? 'FC' : (/\bsas\b/i.test(desc) ? 'SAS' : null);
  const base = {
    ltoGen: lto?.ltoGen || null,
    nativeCapacityTb: lto?.nativeCapacityTb ?? null,
    compressedCapacityTb: lto?.compressedCapacityTb ?? null
  };
  if (kind === 'Storage Media') {
    const mediaType = /cleaning/i.test(desc) ? 'Cleaning' : (/\bworm\b/i.test(desc) ? 'WORM' : 'Re-writable');
    return { ...base, mediaType };
  }
  if (kind === 'Tape Library') {
    const slotCount = _num(desc, /\b(\d{2,3})\s*slots?\b/i) ?? (/msl3040/i.test(desc) ? 40 : (/msl2024/i.test(desc) ? 24 : null));
    return { ...base, hostInterface, slotCount };
  }
  return { ...base, hostInterface };
}

function _extractSynergyEnclosureAttrs(desc) {
  const isSynergy12000 = /synergy\s*12000/i.test(desc);
  return {
    uHeight: _num(desc, /\b(\d{1,2})u\b/i) ?? (isSynergy12000 ? 10 : null),
    bayCount: _num(desc, /\b(\d{1,2})\s*(?:compute\s*)?bays?\b/i) ?? (isSynergy12000 ? 12 : null),
    interconnectBays: _num(desc, /\b(\d{1,2})\s*interconnect\s*bays?\b/i) ?? (isSynergy12000 ? 6 : null)
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

function _inferServerSocketCount(desc) {
  const explicitSockets = _num(desc, /\b([1248])p\b/i) ?? _num(desc, /\b([1248])-?(?:socket|cpu)\b/i);
  if (explicitSockets !== null) return explicitSockets;
  if (/\b(?:dl5\d{2}|r[89]\d{2})\b/i.test(desc)) return 4;
  if (/\b(?:dl1\d{2}|dl3[24]5|r[23]\d{2}|r[67][56]15|ml30)\b/i.test(desc)) return 1;
  if (/\b(?:dl3[68]0a?|dl384|dl385|sy480|ml350|r[67]\d{2}|2288h|sr6[35]0|ucs\s*c2[24]0)\b/i.test(desc)) return 2;
  return null;
}

function _extractChassisAttrs(desc) {
  const explicitU = _num(desc, /\b([1-8])u\b/i);
  const uHeight = explicitU
    ?? (/dl360|r6\d{2}|2288h\s*1u/i.test(desc) ? 1 : (/dl380a|r8\d{2}|dl5\d{2}/i.test(desc) ? 4 : (/dl\d{3}|r7\d{2}/i.test(desc) ? 2 : null)));
  const socketCount = _inferServerSocketCount(desc);
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
    'Tape Drive': () => _extractTapeAttrs(desc, 'Tape Drive'),
    'Storage Media': () => _extractTapeAttrs(desc, 'Storage Media'),
    'Tape Library': () => _extractTapeAttrs(desc, 'Tape Library'),
    'Storage Array': () => _extractStorageArrayAttrs(desc),
    'Synergy Enclosure': () => _extractSynergyEnclosureAttrs(desc),
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
