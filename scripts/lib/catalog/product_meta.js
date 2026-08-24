'use strict';
/**
 * scripts/lib/product_meta.js — Universal Product Meta Detection
 *
 * Consolidated parser for detecting product family, generation, and clean model shorthand
 * across ProLiant, Synergy, Alletra, Nimble, StoreOnce, MSA, StoreEver, Cray, etc.
 */

function parseProductMeta(rawText, pageTitle = '') {
  const fullText = `${rawText || ''} ${pageTitle || ''}`;

  // 1. Generation Detection
  const genMatch = fullText.match(/Gen\d+(?:Plus)?/i);
  let gen = genMatch ? genMatch[0] : 'General';
  if (gen === 'General' && /tape|msl|storeever/i.test(fullText)) gen = 'Tape';
  if (gen === 'General' && /alletra|nimble|storeonce|msa|simplivity/i.test(fullText)) gen = 'Storage';

  // 2. Family Detection
  let family = 'ProLiant';
  if (/synergy/i.test(fullText))                 family = 'Synergy';
  else if (/alletra/i.test(fullText))            family = 'Alletra';
  else if (/nimble/i.test(fullText))             family = 'Nimble';
  else if (/storeonce/i.test(fullText))          family = 'StoreOnce';
  else if (/msa/i.test(fullText))                family = 'MSA';
  else if (/msl|storeever|tape/i.test(fullText)) family = 'StoreEver';
  else if (/cray|gx\d/i.test(fullText))          family = 'Cray';
  else if (/superdome/i.test(fullText))          family = 'Superdome';
  else if (/edgeline/i.test(fullText))           family = 'Edgeline';
  else if (/simplivity/i.test(fullText))         family = 'SimpliVity';
  else if (/aruba/i.test(fullText))              family = 'Aruba';

  // 3. Model & Form Factor Detection
  const modelMatch = fullText.match(/\b(DL\d{3}|ML\d{3}|RL\d{3}|SY\d{3}|GX\d{4}|MicroServer|MSL\d{4}|Alletra\s*\d{4}|Nimble\s*[A-Z0-9]+|StoreOnce\s*\d{4}|MSA\s*\d{4}|2060|2062|1060|2050|5010|5030|5050|6000|9000|Virtual\s*Connect|VC\s*\d+Gb|100Gb\s*F32)\b/i);
  // Prioritize primary physical form factors (SFF, LFF, EDSFF, NHP) over generic brand descriptors (Compute, Storage)
  const primaryFfMatch   = fullText.match(/\b(SFF|LFF|EDSFF|NHP)\b/i);
  const secondaryFfMatch = fullText.match(/\b(Module|Frame|Rack|Enclosure|Storage|CTO)\b/i);
  const formFactorMatch  = primaryFfMatch || secondaryFfMatch;

  let cleanName = '';
  if (modelMatch) {
    let model = modelMatch[0].replace(/\s+/g, '_');
    if (/100Gb|Virtual_Connect|F32/i.test(model)) model = 'SY100Gb_F32';
    const ff  = formFactorMatch ? formFactorMatch[0].toUpperCase() : '';
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

// Declarative fallback component mapping table
const DEFAULT_ROLE_MAPPINGS = [
  { role: 'Base Chassis', keywords: ['chassis cto', 'cto server', 'base chassis', 'configure-to-order', 'base system', 'compute module', 'frame cto', 'cto chassis', 'cto rack'] },
  { role: 'Processor', keywords: ['processor', 'xeon', 'epyc'] },
  { role: 'Memory', keywords: ['memory', 'rdimm', 'ddr5', 'ddr4', 'dimm blank'] },
  { role: 'Transceiver', keywords: ['transceiver', 'sfp28 sr', 'optical transceiver', 'qsfp28', 'sfp56', 'qsfp56'] },
  { role: 'Cable Kit', keywords: ['cable', 'cable kit', 'power cable', 'lug kit', 'box 1/2 cable', 'direct attach', 'enablement kit', 'fiber optic', 'om3', 'om4', 'lc to lc', 'serial cable', 'side-by-side cable'] },
  { role: 'Storage Battery', keywords: ['battery', 'smart storage battery', 'lithium-ion battery'] },
  { role: 'Boot Device', keywords: ['boot device', 'ns204i', 'boot optimized'] },
  { role: 'Power Supply', keywords: ['power', 'power supply', 'flex slot', '-48vdc', 'pdu', 'jumper cord', 'power cord'] },
  { role: 'GPU / Accelerator', keywords: ['gpu', 'accelerator', 'nvidia', 'tesla', 'quadro', 'radeon', 'rtx'] },
  { role: 'PCIe Riser', keywords: ['riser', 'riser kit', 'primary riser', 'secondary riser', 'tertiary riser', 'retimer', 'paddle card'] },
  { role: 'Fibre Channel HBA', keywords: ['fibre channel', 'host bus adapter', 'hba', 'qlogic', 'emulex'] },
  { role: 'Storage Controller', keywords: ['storage', 'controller', 'raid', 'mr416i', 'sr932i', 'smart array', 'vroc', 'megaraid', 'smartraid'] },
  { role: 'Network Adapter', keywords: ['network', 'ethernet', 'ocp', 'adapter', 'bcm57', 'e810', 'mellanox', 'broadcom'] },
  { role: 'Drive Cage / Drive', keywords: ['drive', 'cage', 'hdd', 'ssd', 'nvme', 'media bay', 'drive blank', 'no drive', 'drive enclosure'] },
  { role: 'Cooling / Thermal', keywords: ['fan', 'cooling', 'fan kit', 'heatsink', 'heat sink', 'cold plate', 'liquid cooling'] },
  { role: 'Service & Support', keywords: ['support', 'service', 'tech care', 'warranty', 'pointnext', 'installation', 'startup', 'deployment'] },
  { role: 'Operating System / License', keywords: ['software', 'operating system', 'windows server', 'red hat', 'suse', 'license', 'oneview', 'e-ltu', 'vmware', 'ilo', 'certificate', 'password fio', 'ras os control', 'flexible ltu'] },
  { role: 'Chassis Infrastructure', keywords: ['infrastructure', 'bezel', 'rail', 'management arm', 'cma', 'insight display', 'blank kit', 'localization', 'ambient temperature', 'tracking', 'supply chain', 'ce mark', 'energy star', 'fio trigger', 'security kit', 'tpm'] }
];

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

  // Explicit guard: Infrastructure accessories (rails, CMAs, bezels, insight displays) are NEVER Base Chassis
  if (desc.includes('rail') || desc.includes('cable management') || desc.includes('cma') || desc.includes('insight display') || desc.includes('bezel kit') || desc.includes('blank kit') || (desc.includes('infrastructure') && !desc.includes('processor') && !desc.includes('memory') && !desc.includes('power') && !desc.includes('controller') && !desc.includes('adapter'))) {
    return 'Chassis Infrastructure';
  }

  // Explicit guard: CTO Base Chassis
  if (desc.includes('cto server') || desc.includes('base chassis') || desc.includes('configure-to-order') || desc.includes('compute module') || desc.includes('cto rack') || (desc.includes('base') && desc.includes('chassis')) || (desc.includes('server') && desc.includes('cto'))) {
    return 'Base Chassis';
  }

  const mappings = (profile && profile.component_mapping)
    ? Object.entries(profile.component_mapping).map(([role, keywords]) => ({ role, keywords }))
    : DEFAULT_ROLE_MAPPINGS;

  for (const { role, keywords } of mappings) {
    if (role === 'Base Chassis') continue; // Handled by explicit guard above
    if (keywords.some(k => cat.includes(k) || desc.includes(k))) {
      return role;
    }
  }

  // Regex check for service SKUs
  if (/^h[a-z0-9]{6}/i.test(desc) || /^hu4b/i.test(desc)) {
    return 'Service & Support';
  }

  return 'Option Component';
}

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

  // 1. Processors
  if (text.includes('energy star')) return 'Energy Star Configuration Presets';
  if (text.includes('xeon 6') || text.includes('6710e') || text.includes('6730p') || text.includes('6780e') || text.includes('6700') || text.includes('processor for hpe')) return 'Intel Xeon 6th Gen Scalable Processors';
  if (text.includes('xeon') || text.includes('platinum') || text.includes('gold') || text.includes('silver') || text.includes('bronze')) return 'Intel Xeon Scalable Processors';
  if (text.includes('epyc') || text.includes('9004') || text.includes('9005') || text.includes('9754')) return 'AMD EPYC Scalable Processors';

  // 2. Thermal & Cooling
  if (text.includes('heat sink') || text.includes('heatsink')) return 'Standard & Performance Heat Sinks';
  if (text.includes('fan kit') || text.includes('fan')) return 'High Performance & Standard Fan Kits';

  // 3. Memory
  if (text.includes('ddr5') || text.includes('smart memory') || text.includes('rdimm') || text.includes('cas-52')) return 'DDR5 Registered Smart Memory';
  if (text.includes('ddr4')) return 'DDR4 Registered Smart Memory';
  if (text.includes('dimm blank') || text.includes('memory blank')) return 'Memory Blank Kits';

  // 4. Storage Controllers & Batteries
  if (text.includes('mr416') || text.includes('mr216') || text.includes('mr408') || text.includes('megaraid')) return 'Tri-Mode MegaRAID Storage Controllers';
  if (text.includes('sr932') || text.includes('sr416') || text.includes('smartraid')) return 'Tri-Mode SmartRAID Storage Controllers';
  if (text.includes('smart array') || text.includes('e208') || text.includes('p408') || text.includes('p816')) return 'Smart Array SAS Controllers';
  if (text.includes('vroc')) return 'Intel VROC RAID Enablement';
  if (text.includes('smart storage battery') || text.includes('battery')) return 'Smart Storage Batteries';

  // 5. PCIe Risers & Retimers
  if (text.includes('primary riser') || text.includes('pri riser')) return 'Primary PCIe Risers';
  if (text.includes('secondary riser') || text.includes('sec riser')) return 'Secondary PCIe Risers';
  if (text.includes('tertiary riser') || text.includes('tertiary') || text.includes('tert riser')) return 'Tertiary PCIe Risers';
  if (text.includes('riser')) return 'PCIe Riser Kits';

  // 6. Cables & Enablement
  if (text.includes('box 1/2') || text.includes('box 1') || text.includes('box 2') || text.includes('cage cable') || text.includes('controller cable')) return 'Storage Controller Cable Kits';
  if (text.includes('no drive') || text.includes('drive blank')) return 'Drive Blank & FIO Enablement Kits';

  // 7. Drive Enclosures & Storage Media
  if (text.includes('sff') && (text.includes('cage') || text.includes('bay') || text.includes('enclosure') || text.includes('drive'))) return 'SFF Drive Cages & Enablement';
  if (text.includes('lff') && (text.includes('cage') || text.includes('bay') || text.includes('enclosure') || text.includes('drive'))) return 'LFF Drive Cages & Enablement';
  if (text.includes('edsff') && (text.includes('cage') || text.includes('bay') || text.includes('enclosure') || text.includes('drive'))) return 'EDSFF Drive Cages & Enablement';
  if (text.includes('ssd') || text.includes('nvme') || text.includes('read intensive') || text.includes('mixed use') || text.includes('write intensive')) return 'Solid State Drives (NVMe/SAS/SATA)';
  if (text.includes('hdd') || text.includes('hard drive') || text.includes('10k') || text.includes('7.2k') || text.includes('15k')) return 'Hard Disk Drives (SAS/SATA)';

  // 8. Networking & Fabrics
  if (text.includes('ocp3') || text.includes('ocp')) return 'OCP3 Networking Adapters';
  if (text.includes('adapter') || text.includes('bcm57') || text.includes('intel e810') || text.includes('mellanox') || text.includes('broadcom') || text.includes('base-t') || text.includes('ethernet')) return 'PCIe Networking Adapters';
  if (text.includes('transceiver') || text.includes('sfp28') || text.includes('qsfp28') || text.includes('sfp56') || text.includes('dac')) return 'Optical Transceivers & DAC Cables';
  if (text.includes('fibre channel') || text.includes('hba') || text.includes('qlogic') || text.includes('emulex')) return 'Fibre Channel Host Bus Adapters';

  // 9. Power & Infrastructure
  if (text.includes('-48vdc') || text.includes('dc power') || text.includes('lug kit')) return '-48VDC Power Supplies & Cable Kits';
  if (text.includes('titanium') || text.includes('platinum') || text.includes('flex slot') || text.includes('power supply') || text.includes('ps kit')) return 'Flex Slot Power Supplies';
  if (text.includes('power cord') || text.includes('jumper cord') || text.includes('iec')) return 'Power Cords & Jumper Cables';
  if (text.includes('bezel') || text.includes('rail') || text.includes('cma') || text.includes('cable management')) return 'Chassis Infrastructure & Rail Kits';

  // 10. Software & Licenses
  if (text.includes('ilo') || text.includes('oneview') || text.includes('ops management') || text.includes('e-ltu') || text.includes('license') || text.includes('windows server') || text.includes('red hat') || text.includes('suse')) return 'Server Management & Operating System Licenses';

  const cat = String(parentCategory || '').trim();
  return cat && cat !== 'Unknown' ? `${cat} Options` : 'System Options';
}

module.exports = {
  parseProductMeta,
  classifyComponentRole,
  synthesizeSubcategoryName
};
