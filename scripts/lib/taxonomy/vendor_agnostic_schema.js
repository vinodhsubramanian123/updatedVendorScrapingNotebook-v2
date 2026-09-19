'use strict';
/**
 * scripts/lib/taxonomy/vendor_agnostic_schema.js
 *
 * Universal Vendor-Agnostic Hardware Entity & Normalization Layer
 *
 * Normalizes hardware components across multi-vendor portfolios
 * (HPE, Dell, Cisco, Lenovo, Supermicro, generic whitebox) into a unified
 * canonical schema. Detects vendor, domain (server, storage, networking,
 * ai_cluster, archive), component role, and physical specifications.
 */

const { cleanBaseSKU } = require('../catalog/sku.js');
const { classifyComponentRole } = require('../catalog/product_meta.js');

const VENDOR_SIGNATURES = [
  { vendor: 'HPE', patterns: [/\bhpe\b/i, /\bproliant\b/i, /\bsynergy\b/i, /\balletra\b/i, /\bnimble\b/i, /\bstoreever\b/i, /\bstoreonce\b/i, /\bcray\b/i, /\bpointnext\b/i, /\bil[o0]\b/i, /\bsmart\s*array\b/i] },
  { vendor: 'Dell', patterns: [/\bdell\b/i, /\bpoweredge\b/i, /\bpowerstore\b/i, /\bpowervault\b/i, /\bpowerscale\b/i, /\bidrac\b/i, /\bpercc\b/i, /\bprosupport\b/i, /\bcompellent\b/i] },
  { vendor: 'Cisco', patterns: [/\bcisco\b/i, /\bucs\b/i, /\bnexus\b/i, /\bcatalyst\b/i, /\bintersight\b/i, /\bsmartnet\b/i, /\bvic\s*\d{4}\b/i] },
  { vendor: 'Lenovo', patterns: [/\blenovo\b/i, /\bthinksystem\b/i, /\bthinkagile\b/i, /\bxclarity\b/i] },
  { vendor: 'Supermicro', patterns: [/\bsupermicro\b/i, /\bsuperblade\b/i, /\bsupertwin\b/i, /\bmotherboard\b/i] }
];

const VENDOR_SKU_PATTERNS = [
  { vendor: 'HPE', regex: /^[A-Z0-9]{6}-B2[1-5]$/i },
  { vendor: 'HPE', regex: /^[A-Z0-9]{6}-[BFHK]2[1-5]$/i },
  { vendor: 'HPE', regex: /^H[A-Z0-9]{6}$/i }, // Pointnext
  { vendor: 'HPE', regex: /^HU4B[A-Z0-9]+$/i },
  { vendor: 'HPE', regex: /^[A-Z][0-9][A-Z0-9]{3}[A-Z]$/i }, // HPE 6-char hardware SKUs (S3U30C, S2L70C, R2E09A, R0Q21A, Q6Q67A)
  { vendor: 'Cisco', regex: /^UCS-[A-Z0-9\-]+$/i },
  { vendor: 'Cisco', regex: /^N9K-[A-Z0-9\-]+$/i },
  { vendor: 'Dell', regex: /^\d{3}-[A-Z0-9]{4}$/i }, // 338-CCUR, 400-BDBY
  { vendor: 'Lenovo', regex: /^[0-9]{4}[A-Z0-9]{3}$/i }
];

const DOMAIN_SIGNATURES = [
  { domain: 'ai_cluster', patterns: [/\b(h100|h200|b200|l40s|a100|nvlink|nvswitch|sxm5|sxm6|hgx|dl380a|8dw|16sw|gb200)\b/i] },
  { domain: 'storage', patterns: [/\b(alletra|nimble|storeonce|msa|powerstore|powervault|netapp|san\s*storage|fibre\s*channel\s*array|controller\s*node\s*pair|drive\s*enclosure|sas\s*expansion)\b/i] },
  { domain: 'networking', patterns: [/\b(switch|top-of-rack|tor|spine|leaf|nexus|aruba\s*cx|catalyst|infiniband\s*switch|optical\s*transceiver|dac\s*cable|breakout|qsfp|sfp28|sfp56)\b/i] },
  { domain: 'archive', patterns: [/\b(tape|msl|storeever|lto-8|lto-9|tape\s*library|tape\s*drive|cartridge)\b/i] },
  { domain: 'server', patterns: [/\b(server|compute|proliant|poweredge|ucs\s*c|thinksystem|chassis|dl380|dl360|r760|r660|c220|c240)\b/i] }
];

/**
 * Detect hardware vendor from text context, part number, and metadata
 * @param {string} text - Description, category, or header text
 * @param {string} [partNumber=''] - SKU or Part Number
 * @param {object} [metadata={}] - Optional companion metadata
 * @returns {string} Normalized vendor name
 */
function detectVendor(text = '', partNumber = '', metadata = {}) {
  const combined = `${text || ''} ${metadata?.vendor || ''} ${metadata?.chassis || ''}`.trim();

  // 1. Explicit metadata
  if (metadata?.vendor && typeof metadata.vendor === 'string') {
    const vNorm = metadata.vendor.toUpperCase();
    if (['HPE', 'DELL', 'CISCO', 'LENOVO', 'SUPERMICRO'].includes(vNorm)) {
      return vNorm === 'HPE' ? 'HPE' : vNorm.charAt(0) + vNorm.slice(1).toLowerCase();
    }
  }

  // 2. Text signatures
  for (const { vendor, patterns } of VENDOR_SIGNATURES) {
    if (patterns.some(p => p.test(combined))) {
      return vendor;
    }
  }

  // 3. Part number regex signatures
  const cleanPn = cleanBaseSKU(partNumber);
  if (cleanPn) {
    for (const { vendor, regex } of VENDOR_SKU_PATTERNS) {
      if (regex.test(cleanPn)) {
        return vendor;
      }
    }
  }

  return 'Generic';
}

/**
 * Detect hardware solution domain
 * @param {string} text - Description, category, or chassis name
 * @param {string} [category=''] - Category name
 * @param {object} [metadata={}] - Optional metadata
 * @returns {string} 'server' | 'storage' | 'networking' | 'ai_cluster' | 'archive'
 */
function detectHardwareDomain(text = '', category = '', metadata = {}) {
  const combined = `${text || ''} ${category || ''} ${metadata?.domain || ''} ${metadata?.chassis || ''}`.trim();

  for (const { domain, patterns } of DOMAIN_SIGNATURES) {
    if (patterns.some(p => p.test(combined))) {
      return domain;
    }
  }

  return 'server';
}

/**
 * Extract physical hardware specifications from item text/description
 * @param {object} item - Raw or intermediate item
 * @returns {object} Extracted physical specifications
 */
function extractComponentSpecifications(item = {}) {
  const desc = String(item.description || '').toLowerCase();
  const specs = {};

  // TDP (Watts) - strictly for processors and bounded to <= 500W to avoid matching PSU wattages
  const isCpu = desc.includes('processor') || desc.includes('xeon') || desc.includes('epyc') || desc.includes('cpu');
  const tdpMatch = desc.match(/\b(\d{2,3})\s*w\b/i);
  if (tdpMatch && isCpu) {
    const val = parseInt(tdpMatch[1], 10);
    if (val <= 500) {
      specs.tdpWatts = val;
    }
  }

  // Cores (e.g. 32-core, 32 core, 32C)
  const coreMatch = desc.match(/(\d{1,3})\s*(?:-|–)?\s*c(?:ore(?:s)?)?\b/i);
  if (coreMatch) {
    specs.cores = parseInt(coreMatch[1], 10);
  }

  // Speed (GHz / MHz)
  const ghzMatch = desc.match(/(\d+\.\d+)\s*ghz\b/i);
  if (ghzMatch) {
    specs.speedGhz = parseFloat(ghzMatch[1]);
  }
  const mhzMatch = desc.match(/(\d{4})\s*mhz\b/i) || desc.match(/(\d{4})\s*mt\/s\b/i);
  if (mhzMatch) {
    specs.speedMhz = parseInt(mhzMatch[1], 10);
  }

  // Memory Capacity (GB / TB)
  const memGbMatch = desc.match(/(\d{1,4})\s*gb\b/i);
  if (memGbMatch && (desc.includes('memory') || desc.includes('dimm') || desc.includes('rdimm') || desc.includes('ddr'))) {
    specs.capacityGb = parseInt(memGbMatch[1], 10);
  }

  // Storage Drive Capacity (TB / GB)
  const driveTbMatch = desc.match(/(\d+(?:\.\d+)?)\s*tb\b/i);
  if (driveTbMatch && (desc.includes('ssd') || desc.includes('hdd') || desc.includes('nvme') || desc.includes('drive'))) {
    specs.driveCapacityTb = parseFloat(driveTbMatch[1]);
  }

  // Power Supply Wattage & Efficiency
  const psuWattMatch = desc.match(/(\d{3,4})\s*w\b/i);
  if (psuWattMatch && (desc.includes('power supply') || desc.includes('flex slot') || desc.includes('psu'))) {
    specs.wattage = parseInt(psuWattMatch[1], 10);
    if (desc.includes('titanium')) specs.efficiency = 'Titanium';
    else if (desc.includes('platinum')) specs.efficiency = 'Platinum';
    else if (desc.includes('gold')) specs.efficiency = 'Gold';
    else if (desc.includes('-48vdc') || desc.includes('dc power')) specs.efficiency = '-48VDC';
  }

  // Transceiver / Network Port Speed
  const netSpeedMatch = desc.match(/(\d{1,3})\s*gb(?:e)?\b/i);
  if (netSpeedMatch && (desc.includes('ethernet') || desc.includes('adapter') || desc.includes('transceiver') || desc.includes('fibre channel') || desc.includes('fc'))) {
    specs.portSpeedGb = parseInt(netSpeedMatch[1], 10);
  }

  // Form Factor - evaluate EDSFF before SFF to avoid greedy substring collision
  if (desc.includes('edsff')) specs.formFactor = 'EDSFF';
  else if (desc.includes('sff')) specs.formFactor = 'SFF';
  else if (desc.includes('lff')) specs.formFactor = 'LFF';

  return specs;
}

/**
 * Detect solution domain across an entire set of BOM items independently of row order
 * @param {Array<object>} items
 * @param {object} [context={}]
 * @returns {string} 'server' | 'storage' | 'networking' | 'ai_cluster' | 'archive'
 */
function detectSolutionDomain(items = [], context = {}) {
  if (context.domain && typeof context.domain === 'string') return context.domain;
  if (!Array.isArray(items) || items.length === 0) return 'server';

  const domains = new Set();
  for (const item of items) {
    const text = `${item.description || item.desc || ''} ${item.category || ''}`;
    const match = DOMAIN_SIGNATURES.find(signature => signature.patterns.some(pattern => pattern.test(text)));
    if (match) domains.add(match.domain);
  }
  // Server components in an array do not make the array a server. Prefer
  // solution identity from the chassis context, then explicit chassis rows.
  if (context.chassis) return detectHardwareDomain(context.chassis, '', context);
  const chassis = items.filter(item => classifyComponentRole(item.category || '', item.description || '') === 'Base Chassis');
  const chassisDomains = new Set(chassis.map(item => detectHardwareDomain(item.description, item.category)));
  if (chassisDomains.size === 1) return [...chassisDomains][0];
  if (chassisDomains.size > 1) return 'mixed';
  if (domains.has('ai_cluster') && domains.has('server') && domains.size === 2) return 'ai_cluster';
  return domains.size === 1 ? [...domains][0] : domains.size > 1 ? 'mixed' : 'unknown';
}

/**
 * Normalize an inbound item into the CanonicalHardwareItem schema
 * Preserves sku identity, pricing metadata, quantity scope, and configuration ownership
 * @param {object} rawItem - Inbound raw item
 * @param {object} [context={}] - Evaluation or parsing context
 * @returns {object} CanonicalHardwareItem
 */
function normalizeHardwareItem(rawItem = {}, context = {}) {
  const rawSku = String(rawItem.sku || rawItem.partNumber || rawItem.itemNumber || '').trim();
  const cleanSku = cleanBaseSKU(rawSku);
  const description = String(rawItem.description || rawItem.desc || rawItem.name || '').trim();
  const rawQty = Number(rawItem.quantity ?? rawItem.qty ?? 1);
  if (!Number.isInteger(rawQty) || rawQty < 1) throw new Error('Hardware quantity must be a positive integer');
  const quantity = rawQty;
  const category = String(rawItem.category || rawItem.parentCategory || '').trim();
  const subcategory = String(rawItem.subcategory || '').trim();

  const vendor = detectVendor(description, cleanSku, context);
  const domain = detectHardwareDomain(description, category, context);
  const componentRole = classifyComponentRole(category, description);
  const specifications = extractComponentSpecifications({ ...rawItem, description });

  const currency = String(rawItem.currency || rawItem.pricing?.currency || 'USD').toUpperCase();
  const rawPrice = rawItem.unitPriceUsd ?? rawItem.priceUsd ?? rawItem.pricing?.unitPriceUsd ?? rawItem.price ?? rawItem.listPrice;
  const parsedPrice = require('./sku_resolver.js').extractCatalogItemPrice({ listPrice: rawPrice });
  const validPrice = currency === 'USD' && parsedPrice.hasPrice ? parsedPrice.price : null;
  const isResolved = validPrice !== null;

  return {
    ...rawItem,
    // Identity fields (harmonized across evaluator contracts)
    sku: cleanSku || rawSku,
    cleanSku: cleanSku || rawSku,
    partNumber: cleanSku || rawSku,
    rawPartNumber: rawSku,
    description,
    quantity,
    category: category || 'Hardware Options',
    subcategory: subcategory || componentRole,
    componentRole,
    vendor,
    domain,
    specifications,

    // Pricing fields
    unitPriceUsd: validPrice,
    priceUsd: validPrice,
    pricing: {
      unitPriceUsd: validPrice,
      extendedPriceUsd: validPrice !== null ? validPrice * quantity : null,
      currency,
      originalUnitPrice: parsedPrice.price,
      isResolved
    },

    // Configuration & Quantity Scope metadata
    quantityScope: rawItem.quantityScope,
    quantityBasis: rawItem.quantityBasis,
    configId: rawItem.configId || rawItem.clusterId || null,
    clusterMultiplier: rawItem.clusterMultiplier || 1,
    requirementTag: rawItem.requirementTag || null,
    isResolved,

    provenance: {
      ...rawItem.provenance,
      sourceFile: context.filePath || rawItem.provenance?.sourceFile || null,
      lineNumber: rawItem.lineNumber || null,
      rawItem
    }
  };
}

module.exports = {
  detectVendor,
  detectHardwareDomain,
  detectSolutionDomain,
  extractComponentSpecifications,
  normalizeHardwareItem,
  VENDOR_SIGNATURES,
  DOMAIN_SIGNATURES
};
