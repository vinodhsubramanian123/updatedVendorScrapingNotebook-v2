'use strict';
/**
 * scripts/lib/product_meta.js — Universal Product Meta Detection
 *
 * Consolidated parser for detecting product family, generation, and clean model shorthand
 * across ProLiant, Synergy, Alletra, Nimble, StoreOnce, MSA, StoreEver, Cray, etc.
 */

const FAMILY_PATTERNS = [
  { family: 'SAN', pattern: /\bsn\s*\d{4}[a-z]\b|fibre\s+channel\s+switch/i },
  { family: 'ProLiant', pattern: /proliant|\b[DMR]L\s*\d{3}\b/i },
  { family: 'Synergy', pattern: /synergy|\bSY\d{3}\b/i },
  { family: 'Alletra', pattern: /alletra/i },
  { family: 'Nimble', pattern: /nimble/i },
  { family: 'StoreOnce', pattern: /storeonce/i },
  { family: 'MSA', pattern: /msa/i },
  { family: 'StoreEver', pattern: /msl|storeever|tape/i },
  { family: 'Cray', pattern: /cray|gx\d/i },
  { family: 'Superdome', pattern: /superdome/i },
  { family: 'Edgeline', pattern: /edgeline/i },
  { family: 'SimpliVity', pattern: /simplivity/i },
  { family: 'Aruba', pattern: /aruba/i },
  { family: 'PowerEdge', pattern: /poweredge|\b(r[6789]\d{2}|c6\d{3})\b/i },
  { family: 'PowerStore', pattern: /powerstore/i },
  { family: 'PowerVault', pattern: /powervault/i },
  { family: 'UCS', pattern: /cisco\s*ucs|\b(c220|c240|b200)\b/i },
  { family: 'Nexus', pattern: /nexus|\bn9k\b/i },
  { family: 'ThinkSystem', pattern: /thinksystem|\bsr\d{3}\b/i }
];

function detectProductFamily(fullText) {
  for (const { family, pattern } of FAMILY_PATTERNS) {
    if (pattern.test(fullText)) return family;
  }
  if (/gen\d+|hpe/i.test(fullText)) return 'ProLiant';
  return 'General';
}

function parseProductMeta(rawText, pageTitle = '') {
  const fullText = `${rawText || ''} ${pageTitle || ''}`.replace(/_/g, ' ');

  // 1. Generation Detection
  const genMatch = fullText.match(/Gen\d+(?:Plus)?/i);
  let gen = genMatch ? genMatch[0] : 'General';
  if (gen === 'General' && /tape|msl|storeever/i.test(fullText)) gen = 'Tape';
  if (gen === 'General' && /alletra|nimble|storeonce|msa|simplivity/i.test(fullText)) gen = 'Storage';
  if (gen === 'General' && /\bsn\s*\d{4}[a-z]\b|fibre\s+channel\s+switch/i.test(fullText)) gen = 'FC';

  // 2. Family Detection
  const family = detectProductFamily(fullText);

  // 3. Model & Form Factor Detection
  const modelMatch = fullText.match(/\b(SN\s*\d{4}[a-z]|DL\s*\d{3}\s*a?|ML\s*\d{3}|RL\s*\d{3}|SY\s*\d{3}|Synergy\s*\d+|GX\s*\d{4}|MicroServer|MSL\s*\d{4}|Alletra\s*\d{4}|Nimble\s*[A-Z0-9]+|StoreOnce\s*\d{4}|MSA\s*\d{4}|2060|2062|1060|2050|5010|5030|5050|6000|9000|Virtual\s*Connect|VC\s*\d+Gb|100Gb\s*F32)\b/i);
  const primaryFfMatch   = fullText.match(/\b(SFF|LFF|EDSFF|NHP)\b/i);
  const secondaryFfMatch = fullText.match(/\b(Module|Frame|Rack|Enclosure|Storage|CTO)\b/i);
  const formFactorMatch  = primaryFfMatch || secondaryFfMatch;

  let cleanName = '';
  if (modelMatch) {
    let model = modelMatch[0].trim();
    if (/^SN\s*\d{4}[a-z]$/i.test(model)) model = model.replace(/\s+/g, '').toUpperCase();
    if (/^DL\s*(\d{3})\s*(a?)$/i.test(model)) {
      const m = model.match(/^DL\s*(\d{3})\s*(a?)$/i);
      model = `DL${m[1]}${m[2] ? m[2].toLowerCase() : ''}`;
    } else if (/^(?:ML|RL|SY)\s*(\d{3})$/i.test(model)) {
      const m = model.match(/^([A-Z]{2})\s*(\d{3})$/i);
      model = `${m[1].toUpperCase()}${m[2]}`;
    } else {
      model = model.replace(/\s+/g, '_');
    }
    if (/100Gb|Virtual_Connect|F32/i.test(model)) model = 'SY100Gb_F32';
    if (/^Synergy_(\d{3})$/i.test(model)) model = model.replace(/^Synergy_/i, 'SY');
    const isRackOrBlade = /^(?:DL|ML|RL|SY)\d/i.test(model);
    const ff  = !isRackOrBlade && family !== 'SAN' && formFactorMatch ? formFactorMatch[0].toUpperCase() : '';
    cleanName = `${model}${gen && gen !== 'General' ? '_' + gen : ''}${ff ? '_' + ff : ''}`;
  } else {
    cleanName = rawText
      .replace(/Collapse All|Expand All|Expand Subsections|Undo Selection|Remove Defaults|View HPE Recommended only/gi, '')
      .replace(/\b[A-Z0-9]{3,8}-[A-Z0-9]{3,4}\b/gi, '') // Strip SKU IDs (Rule #15)
      .replace(/[^a-zA-Z0-9_\-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  // Ensure cleanName is valid & free of verbose leading prefixes or stray trailing SKU IDs
  cleanName = cleanName
    .replace(/^HPE_/i, '')
    .replace(/_[A-Z0-9]{5,8}-[A-Z0-9]{3,4}$/i, '')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_');

  return { family, gen, cleanName };
}

// Declarative fallback component mapping table with hierarchical weight priority
// Highest weights: Chassis, Specific Accessories (Battery, Transceiver, Cable Kit), Processor, Memory -> GPUs, Storage & Controllers -> Adapters & Fabric -> Infrastructure & Support
const DEFAULT_ROLE_MAPPINGS = [
  { role: 'Base Chassis', keywords: ['chassis cto', 'cto server', 'base chassis', 'configure-to-order server', 'configure-to-order compute module', 'configure-to-order chassis', 'base system', 'compute module', 'frame cto', 'cto chassis', 'cto rack'] },
  { role: 'Storage Battery', keywords: ['smart storage battery', 'battery', 'lithium-ion battery', 'bbu', 'supercapacitor', 'energy storage'] },
  { role: 'Transceiver', keywords: ['transceiver', 'optical transceiver', 'sfp28 sr', 'sfp28 lr', 'qsfp28 sr', 'qsfp28 lr', 'sfp56', 'qsfp56', 'qsfp-dd', 'direct attach', 'dac cable', 'active optical cable', 'aoc cable'] },
  { role: 'Cable Kit', keywords: ['cable', 'cable kit', 'power cable', 'power cord', 'jumper cord', 'lug kit', 'box 1/2 cable', 'enablement kit', 'fiber optic', 'om3', 'om4', 'lc to lc', 'serial cable', 'side-by-side cable', 'nvlink bridge', 'nvlink', 'riser cable', 'gpu aux cable', 'internal cable kit', 'controller cable'] },
  { role: 'Processor', keywords: ['processor', 'xeon', 'epyc'] },
  { role: 'Memory', keywords: ['memory', 'rdimm', 'ddr5', 'ddr4', 'dimm blank', 'mrdimm', 'lrdimm'] },
  { role: 'GPU / Accelerator', keywords: ['gpu', 'accelerator', 'nvidia', 'tesla', 'quadro', 'radeon', 'rtx'] },
  { role: 'Storage Controller', keywords: ['storage controller', 'controller', 'raid', 'mr416i', 'sr932i', 'smart array', 'vroc', 'megaraid', 'smartraid', 'tri-mode controller'] },
  { role: 'Boot Device', keywords: ['boot device', 'ns204i-u', 'ns204i-p', 'boot optimized', 'boss-s', 'm.2 boot'] },
  { role: 'Drive Cage / Drive', keywords: ['drive', 'cage', 'hdd', 'ssd', 'nvme', 'media bay', 'drive blank', 'no drive', 'drive enclosure', 'edsff'] },
  { role: 'Fibre Channel HBA', keywords: ['fibre channel', 'host bus adapter', 'hba', 'qlogic', 'emulex'] },
  { role: 'Network Adapter', keywords: ['network', 'ethernet', 'ocp', 'adapter', 'bcm57', 'e810', 'mellanox', 'broadcom'] },
  { role: 'PCIe Riser', keywords: ['riser', 'riser kit', 'primary riser', 'secondary riser', 'tertiary riser', 'retimer', 'paddle card', 'pcie rear', 'rear fio kit'] },
  { role: 'Cooling / Thermal', keywords: ['cold plate', 'liquid cooling', 'direct liquid cooling', 'dlc module', 'fan kit', 'fan', 'cooling', 'heatsink', 'heat sink'] },
  { role: 'Security & Platform Trust', keywords: ['tpm', 'trusted platform module', 'intrusion detection', 'chassis intrusion', 'security bezel', 'bezel lock', 'key manager'] },
  { role: 'Power Supply', keywords: ['flex slot', '-48vdc', 'hot plug power supply', 'titanium power', 'platinum power', 'power supply', 'ps kit'] },
  { role: 'Operating System / License', keywords: ['software', 'operating system', 'windows server', 'red hat', 'suse', 'license', 'oneview', 'e-ltu', 'vmware', 'ilo', 'certificate', 'password fio', 'ras os control', 'flexible ltu'] },
  { role: 'Service & Support', keywords: ['support', 'service', 'tech care', 'warranty', 'pointnext', 'installation', 'startup', 'deployment'] },
  { role: 'Chassis Infrastructure', keywords: ['infrastructure', 'bezel', 'rail', 'management arm', 'cma', 'insight display', 'blank kit', 'localization', 'ambient temperature', 'tracking', 'supply chain', 'ce mark', 'energy star', 'fio trigger', 'security kit'] }
];

const INFRASTRUCTURE_KEYWORDS = ['rail', 'cable management', 'cma', 'insight display', 'bezel kit', 'blank kit'];
const INFRASTRUCTURE_EXCLUSION_KEYWORDS = ['processor', 'memory', 'power', 'controller', 'adapter'];
const BASE_CHASSIS_KEYWORDS = ['cto server', 'base chassis', 'configure-to-order server', 'configure-to-order compute module', 'configure-to-order chassis', 'compute module', 'cto rack', 'cto chassis'];

function isChassisInfrastructure(desc) {
  if (INFRASTRUCTURE_KEYWORDS.some(k => desc.includes(k))) return true;
  if (desc.includes('infrastructure') && !INFRASTRUCTURE_EXCLUSION_KEYWORDS.some(k => desc.includes(k))) return true;
  return false;
}

function isBaseChassis(desc) {
  if (/\b(?:kit|cable|cooling|baffle|heatsink|heat sink)\b/i.test(desc)) return false;
  if (BASE_CHASSIS_KEYWORDS.some(k => desc.includes(k))) return true;
  if (desc.includes('base') && desc.includes('chassis')) return true;
  if (desc.includes('server') && desc.includes('cto')) return true;
  return false;
}

/**
 * Dynamically classify component role from category name and item description.
 * Utilizes configuration profile for overrides, falls back to default logic.
 * @param {string} categoryName 
 * @param {string} itemDescription 
 * @param {object} profile Optional profile object loaded from profile_loader.js
 * @returns {string} Dynamic component role
 */
function classifyComponentRole(categoryName = '', itemDescription = '', profile = null) {
  const cat = String(categoryName).toLowerCase();
  const desc = String(itemDescription).toLowerCase();

  // Bundled optics in a switch description do not make the switch an optic.
  if (/\b(?:fibre channel|fc)\s+switch\b/i.test(desc) && !/\b(support|service|upgrade|license|kit)\b/i.test(desc)) return 'SAN Switch';
  if (/\bupgrade\s+license\s+with\s+transceiver\s+kit\b/i.test(desc)) return 'Port Upgrade Bundle';

  // Explicit guard: Infrastructure accessories
  if (isChassisInfrastructure(desc)) {
    return 'Chassis Infrastructure';
  }

  // Explicit guard: CTO Base Chassis
  if (isBaseChassis(desc)) {
    return 'Base Chassis';
  }

  // Explicit guard: Storage Battery (must precede Cable Kit and Controllers)
  if (desc.includes('smart storage battery') || (desc.includes('battery') && (desc.includes('storage') || desc.includes('controller') || desc.includes('bbu') || desc.includes('capacitor')))) {
    return 'Storage Battery';
  }

  // Explicit guard: Transceivers & Optical interconnects (must precede Network Adapters)
  if (desc.includes('transceiver') || desc.includes('optical transceiver') || desc.includes('dac cable') || desc.includes('direct attach copper') || desc.includes('active optical cable')) {
    return 'Transceiver';
  }

  // Explicit guard: Cable Kits (must not be swallowed by parent controllers, risers, GPUs)
  if (/\b(?:cable\s*kit|internal\s*cable|power\s*cable|power\s*cord|jumper\s*cord|lug\s*kit|splitter\s*cable|y-cable|aux\s*cable|riser\s*cable|sas\s*cable|sata\s*cable|gpu\s*aux)\b/i.test(desc) ||
      (desc.includes('cable') && (desc.includes('controller') || desc.includes('riser') || desc.includes('gpu') || desc.includes('storage')))) {
    return 'Cable Kit';
  }

  // Product profiles are additive overrides.
  const profileMappings = profile && profile.component_mapping
    ? profile.component_mapping
    : {};
  const knownRoles = new Set(DEFAULT_ROLE_MAPPINGS.map(({ role }) => role));
  const mappings = DEFAULT_ROLE_MAPPINGS.map(({ role, keywords }) => ({
    role,
    keywords: Array.from(new Set([...keywords, ...(profileMappings[role] || [])]))
  }));
  for (const [role, keywords] of Object.entries(profileMappings)) {
    if (!knownRoles.has(role)) mappings.push({ role, keywords });
  }

  for (const { role, keywords } of mappings) {
    if (role === 'Base Chassis') continue; // Handled by explicit guard above
    if (role === 'GPU / Accelerator' && (desc.includes('cable') || desc.includes('cord'))) continue;
    if (role === 'Network Adapter' && (desc.includes('enablement') || desc.includes('cable') || desc.includes('cord') || desc.includes('transceiver'))) continue;
    if (role === 'Storage Controller' && (desc.includes('cable') || desc.includes('cord') || desc.includes('battery'))) continue;
    if (role === 'PCIe Riser' && (desc.includes('cable') || desc.includes('cord'))) continue;
    if (keywords.some(k => cat.includes(k) || desc.includes(k))) {
      return role;
    }
  }

  // Regex check for service SKUs across vendors (HPE Pointnext, Dell ProSupport, Cisco SmartNet)
  if (/^h[a-z0-9]{6}/i.test(desc) || /^hu4b/i.test(desc) || /^803-[a-z0-9]+/i.test(desc) || /^con-snt/i.test(desc) || desc.includes('prosupport') || desc.includes('smartnet') || desc.includes('pointnext')) {
    return 'Service & Support';
  }

  return 'Option Component';
}

// Declarative Subcategory Synthesis Rules (SonarQube CC-reduction)
const SUBCATEGORY_SYNTHESIS_RULES = [
  // 1. Processors
  { name: 'Energy Star Configuration Presets', match: t => t.includes('energy star') },
  { name: 'Intel Xeon 6th Gen Scalable Processors', match: t => t.includes('xeon 6') || t.includes('6710e') || t.includes('6730p') || t.includes('6780e') || t.includes('6700') || t.includes('processor for hpe') },
  { name: 'Intel Xeon Scalable Processors', match: t => !t.includes('power supply') && !t.includes('flex slot') && !t.includes('psu') && !t.includes('transceiver') && (t.includes('xeon') || ((t.includes('platinum') || t.includes('gold') || t.includes('silver') || t.includes('bronze')) && (t.includes('processor') || t.includes('cpu') || t.includes('scalable')))) },
  { name: 'AMD EPYC Scalable Processors', match: t => t.includes('epyc') || t.includes('9004') || t.includes('9005') || t.includes('9754') },

  // 2. Thermal & Cooling
  { name: 'Standard & Performance Heat Sinks', match: t => t.includes('heat sink') || t.includes('heatsink') },
  { name: 'High Performance & Standard Fan Kits', match: t => t.includes('fan kit') || t.includes('fan') },

  // 3. Memory
  { name: 'DDR5 Registered Smart Memory', match: t => t.includes('ddr5') || t.includes('smart memory') || t.includes('rdimm') || t.includes('cas-52') },
  { name: 'DDR4 Registered Smart Memory', match: t => t.includes('ddr4') },
  { name: 'Memory Blank Kits', match: t => t.includes('dimm blank') || t.includes('memory blank') },

  // 4. Storage Controllers & Batteries
  { name: 'Tri-Mode MegaRAID Storage Controllers', match: t => t.includes('mr416') || t.includes('mr216') || t.includes('mr408') || t.includes('megaraid') },
  { name: 'Tri-Mode SmartRAID Storage Controllers', match: t => t.includes('sr932') || t.includes('sr416') || t.includes('smartraid') },
  { name: 'Smart Array SAS Controllers', match: t => t.includes('smart array') || t.includes('e208') || t.includes('p408') || t.includes('p816') },
  { name: 'Intel VROC RAID Enablement', match: t => t.includes('vroc') },
  { name: 'Smart Storage Batteries', match: t => t.includes('smart storage battery') || t.includes('battery') },

  // 5. PCIe Risers & Retimers
  { name: 'Primary PCIe Risers', match: t => t.includes('primary riser') || t.includes('pri riser') },
  { name: 'Secondary PCIe Risers', match: t => t.includes('secondary riser') || t.includes('sec riser') },
  { name: 'Tertiary PCIe Risers', match: t => t.includes('tertiary riser') || t.includes('tertiary') || t.includes('tert riser') },
  { name: 'PCIe Riser Kits', match: t => t.includes('riser') },

  // 5b. Graphics & GPU Accelerators
  { name: 'GPU Accelerators', match: t => t.includes('accelerator') || t.includes('nvidia') || t.includes('h200') || t.includes('l40s') || t.includes('l4') || t.includes('rtx') || t.includes('gpu') },

  // 6. Cables & Enablement
  { name: 'Storage Controller Cable Kits', match: t => t.includes('box 1/2') || t.includes('box 1') || t.includes('box 2') || t.includes('cage cable') || t.includes('controller cable') },
  { name: 'Drive Blank & FIO Enablement Kits', match: t => t.includes('no drive') || t.includes('drive blank') },

  // 7. Drive Enclosures & Storage Media
  { name: 'SFF Drive Cages & Enablement', match: t => t.includes('sff') && (t.includes('cage') || t.includes('bay') || t.includes('enclosure') || t.includes('drive')) },
  { name: 'LFF Drive Cages & Enablement', match: t => t.includes('lff') && (t.includes('cage') || t.includes('bay') || t.includes('enclosure') || t.includes('drive')) },
  { name: 'EDSFF Drive Cages & Enablement', match: t => t.includes('edsff') && (t.includes('cage') || t.includes('bay') || t.includes('enclosure') || t.includes('drive')) },
  { name: 'Solid State Drives (NVMe/SAS/SATA)', match: t => t.includes('ssd') || t.includes('nvme') || t.includes('read intensive') || t.includes('mixed use') || t.includes('write intensive') },
  { name: 'Hard Disk Drives (SAS/SATA)', match: t => t.includes('hdd') || t.includes('hard drive') || t.includes('10k') || t.includes('7.2k') || t.includes('15k') },

  // 8. Networking & Fabrics
  { name: 'OCP3 Networking Adapters', match: t => t.includes('ocp3') || t.includes('ocp') },
  { name: 'PCIe Networking Adapters', match: t => t.includes('adapter') || t.includes('bcm57') || t.includes('intel e810') || t.includes('mellanox') || t.includes('broadcom') || t.includes('base-t') || t.includes('ethernet') },
  { name: 'Optical Transceivers & DAC Cables', match: t => t.includes('transceiver') || t.includes('sfp28') || t.includes('qsfp28') || t.includes('sfp56') || t.includes('dac') },
  { name: 'Fibre Channel Host Bus Adapters', match: t => t.includes('fibre channel') || t.includes('hba') || t.includes('qlogic') || t.includes('emulex') },

  // 9. Power & Infrastructure
  { name: '-48VDC Power Supplies & Cable Kits', match: t => t.includes('-48vdc') || t.includes('dc power') || t.includes('lug kit') },
  { name: 'Flex Slot Power Supplies', match: t => t.includes('titanium') || t.includes('platinum') || t.includes('flex slot') || t.includes('power supply') || t.includes('ps kit') },
  { name: 'Power Cords & Jumper Cables', match: t => t.includes('power cord') || t.includes('jumper cord') || t.includes('iec') },
  { name: 'Chassis Infrastructure & Rail Kits', match: t => t.includes('bezel') || t.includes('rail') || t.includes('cma') || t.includes('cable management') },

  // 10. Software & Licenses
  { name: 'Server Management & Operating System Licenses', match: t => t.includes('ilo') || t.includes('oneview') || t.includes('ops management') || t.includes('e-ltu') || t.includes('license') || t.includes('windows server') || t.includes('red hat') || t.includes('suse') }
];

/**
 * Synthesize a clean, descriptive subcategory name from category name, table descriptions, and rules.
 * Used when portal scraping yields unclassified (Sub-table) or generic fallback names.
 * @param {string} parentCategory E.g. 'Processor', 'Memory', 'Power Supplies'
 * @param {Array<string>|string} itemDescriptions Array of descriptions or concatenated string
 * @param {Array<string>} [tableRules] Optional table-level rules
 * @returns {string} Synthesized subcategory name
 */
function synthesizeSubcategoryName(parentCategory = '', itemDescriptions = [], tableRules = []) {
  const descsText = Array.isArray(itemDescriptions) ? itemDescriptions.join(' ') : String(itemDescriptions || '');
  const rulesText = Array.isArray(tableRules) ? tableRules.join(' ') : String(tableRules || '');
  const text = `${descsText} ${rulesText}`.toLowerCase();

  for (const rule of SUBCATEGORY_SYNTHESIS_RULES) {
    if (rule.match(text)) {
      return rule.name;
    }
  }

  const cat = String(parentCategory || '').trim();
  return cat && cat !== 'Unknown' ? `${cat} Options` : 'System Options';
}

module.exports = {
  parseProductMeta,
  classifyComponentRole,
  synthesizeSubcategoryName,
  DEFAULT_ROLE_MAPPINGS,
  SUBCATEGORY_SYNTHESIS_RULES
};
