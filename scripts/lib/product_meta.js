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
  { role: 'Base Chassis', keywords: ['chassis', 'base', 'cto server', 'cto chassis', 'base chassis', 'configure-to-order', 'base system', 'compute module', 'frame', 'enclosure'] },
  { role: 'Processor', keywords: ['processor', 'xeon', 'epyc'] },
  { role: 'Memory', keywords: ['memory', 'rdimm', 'ddr5'] },
  { role: 'Transceiver', keywords: ['transceiver', 'sfp28 sr', 'optical transceiver'] },
  { role: 'Cable Kit', keywords: ['cable', 'cable kit', 'power cable', 'lug kit', 'box 1/2 cable', 'direct attach', 'enablement kit'] },
  { role: 'Storage Battery', keywords: ['battery', 'smart storage battery', 'lithium-ion battery'] },
  { role: 'Boot Device', keywords: ['boot device', 'ns204i', 'boot optimized'] },
  { role: 'Power Supply', keywords: ['power', 'power supply', 'flex slot', '-48vdc'] },
  { role: 'GPU / Accelerator', keywords: ['gpu', 'accelerator', 'nvidia', 'tesla', 'quadro', 'radeon'] },
  { role: 'PCIe Riser', keywords: ['riser', 'riser kit', 'primary riser', 'secondary riser', 'tertiary riser'] },
  { role: 'Fibre Channel HBA', keywords: ['fibre channel', 'host bus adapter', 'hba'] },
  { role: 'Storage Controller', keywords: ['storage', 'controller', 'raid', 'mr416i', 'sr932i'] },
  { role: 'Network Adapter', keywords: ['network', 'ethernet', 'ocp', 'adapter', 'bcm57'] },
  { role: 'Drive Cage / Drive', keywords: ['drive', 'cage', 'hdd', 'ssd', 'nvme'] },
  { role: 'Cooling / Thermal', keywords: ['fan', 'cooling', 'fan kit', 'heatsink'] },
  { role: 'Service & Support', keywords: ['support', 'service', 'tech care', 'warranty', 'pointnext', 'installation'] },
  { role: 'Operating System / License', keywords: ['software', 'operating system', 'windows server', 'red hat', 'suse', 'license', 'oneview', 'e-ltu', 'vmware'] },
  { role: 'Chassis Infrastructure', keywords: ['infrastructure', 'bezel', 'rail', 'management arm', 'tracking', 'localization'] }
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

  const mappings = (profile && profile.component_mapping)
    ? Object.entries(profile.component_mapping).map(([role, keywords]) => ({ role, keywords }))
    : DEFAULT_ROLE_MAPPINGS;

  for (const { role, keywords } of mappings) {
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

module.exports = {
  parseProductMeta,
  classifyComponentRole
};
