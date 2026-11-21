'use strict';

const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const { isDeepStrictEqual } = require('util');
const { enqueueCatalogProbe } = require('./catalog_probe_queue.js');
const { listAllCatalogs } = require('./catalog_discovery.js');
const { cleanBaseSKU, isValidHpeSKU } = require('./sku.js');
const { classifyComponentRole } = require('./product_meta.js');
const { extractCanonicalAttributes } = require('./attribute_vectors.js');
const { isRemovalTombstone } = require('./diff_catalog.js');
const {
  parseStrictPrice,
  reconcileConflictingPrices,
  parseLeadTimeOrEta,
  buildAvailabilityContract,
  classifyRowType
} = require('./field_parsers.js');

const SEARCH_VERB_RE = /\b(?:list|show|find|filter|search|which|get|give\s+me|what\s+are|sort(?:ed)?\s+by|cheapest|fastest|lowest\s+price|shortest\s+lead\s+time|compare)\b/i;
const STRUCTURED_CONSTRAINT_RE = /\b(?:\d+(?:\.\d+)?\s*(?:gb|tb|w|watts?|days?|yrs?|years?|cores?|gbe|mt\/s)|ddr\d+|rdimm|lrdimm|mrdimm|nvme|sas|sata|sff|lff|edsff|tech\s*care|foundation\s*care|fast[\s-]*ship|obsolete|90[\s-]*day|direct\s*ship|constrained[\s_-]*supply|\[cs\]|conditional|hidden|tdp|titanium|platinum|-48\s*vdc|read\s*intensive|mixed\s*use|write\s*intensive|ocp\s*3|direct\s*liquid|heatsink|heat\s*sink|fan\s*kit|storage\s*controller|raid|jbof|enclosure|under\s*\$|below\s*\$|above\s*\$|over\s*\$|sort(?:ed)?\s+by\s+(?:price|lead\s*time|capacity|cores?|wattage|tdp)|dimms?|gpus?|cpus?|psus?|power\s*suppl(?:y|ies)|drives?|ssds?|hdds?|nics?|transceivers?|cables?|support\s*skus?|rail\s*kits?)\b/i;
const CONCEPTUAL_RE = /^\s*(?:what\s+is|why\s+does|how\s+do(?:es)?|explain)\b/i;
const ARCHITECTURE_TOPIC_RE = /\b(?:pcie\s+(?:slot\s+)?lanes?|pcie\s+bifurcation|slot\s+layout)\b/i;

const ROLE_QUERY_PATTERNS = [
  { role: 'Memory', regex: /\b(?:memory|ram|[lr]?dimms?|mrdimms?|ddr\d+)\b/i },
  { role: 'Processor', regex: /\b(?:cpus?|processors?|xeon|epyc|kunpeng)\b/i },
  { role: 'GPU / Accelerator', regex: /\b(?:gpus?|graphics|accelerators?|h100|h200|b100|b200|gb200|l40s?|a100|rtx|mi\d{3}|instinct|gaudi)\b/i },
  { role: 'Drive Cage / Drive', regex: /\b(?:drives?|ssds?|hdds?|nvme\s*drives?|sff\s*drives?|lff\s*drives?|edsff|jbof|drive\s*enclosures?)\b/i },
  { role: 'Storage Controller', regex: /\b(?:storage\s*controllers?|raid\s*controllers?|smart\s*array|tri[\s-]*mode|mr\d{3}i|sr\d{3}i)\b/i },
  { role: 'Boot Device', regex: /\b(?:boot\s*devices?|ns204i|boss(?:-n1)?|m\.2\s*boot)\b/i },
  { role: 'Network Adapter', regex: /\b(?:nics?|network\s*adapters?|ethernet|ocp3?|infiniband|connectx)\b/i },
  { role: 'Fibre Channel HBA', regex: /\b(?:fc\s*hbas?|fibre\s*channel\s*hbas?|san\s*hbas?)\b/i },
  { role: 'Transceiver', regex: /\b(?:transceivers?|optics?|sfp\d*|qsfp\d*|dac|aoc)\b/i },
  { role: 'Power Supply', regex: /\b(?:psus?|power\s*suppl(?:y|ies)|flex\s*slot)\b/i },
  { role: 'Cooling / Thermal', regex: /\b(?:fans?|heatsinks?|heat\s*sinks?|cooling)\b/i },
  { role: 'Service & Support', regex: /\b(?:support|tech\s*care|foundation\s*care|pointnext|prosupport|smartnet|hi-care|services?|installation|warranty)\b/i },
  { role: 'Software', regex: /\b(?:software|licens(?:e|ing)|ilo\s*advanced|compute\s*ops|greenlake|oneview|saas)\b/i },
  { role: 'Rack / Rail', regex: /\b(?:rail\s*kits?|rack\s*kits?|racks?)\b/i }
];

function _normalizeToken(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

const MODEL_RE = /\b((?:dl|ml|bl|rl|sy|sn|gx|msl)\s*\d{3,5}[a-z]?|synergy\s*\d{3,5}|alletra(?:\s+storage)?(?:\s+mp)?\s*(?:[bx]\d{4,5}[a-z]?|10k|\d{4}|mp)|(?:b|x)10000|poweredge\s*[rtmc]\d{3,4}[a-z]*|fusionserver\s*\d{4}[a-z]?|thinksystem\s*s[rt]\d{3}|ucs\s*[bc]\d{3})(?:[\s_-]*(?:gen\s*|g)(\d{1,2}))?(?![a-z0-9])/gi;
const PORTFOLIO_RE = /\b(?:across\s+(?:all\s+)?(?:catalogs|products|solutions)|portfolio[ -]wide|entire\s+portfolio)\b/i;
const GEN_RE = /\bgen\s*(\d{1,2})\b/gi;

function _catalogGeneration(catalog) {
  return [catalog.gen, catalog.generation, catalog.id].map(value => String(value || '').match(/gen\s*(\d+)/i)?.[1]).find(Boolean) || null;
}

function _matchesAlias(text, alias) {
  const tokens = String(alias || '').match(/[a-z0-9]+/gi);
  return Boolean(tokens && tokens.join('').length >= 4 &&
    new RegExp(['\\b', tokens.join('[\\s_-]*'), '\\b'].join(''), 'i').test(text));
}

function _canonicalModelStem(model) {
  const stem = _normalizeToken(model).replace(/^synergy(?=\d)/, 'sy');
  const mpMatch = stem.match(/^alletra(?:storage)?(?:mp)?([bx]\d{4,5}[a-z]?|10k)$/);
  if (mpMatch) {
    const code = mpMatch[1] === '10k' ? 'b10000' : mpMatch[1];
    return `alletramp${code}`;
  }
  if (/^(?:b|x)\d{4,5}[a-z]?$/.test(stem)) return `alletramp${stem}`;
  return stem;
}

function _matchCatalogModel(catalog, model) {
  const aliases = [catalog.id, catalog.chassis].map(token => _normalizeToken(token).replace(/^synergy(?=\d)/, 'sy'));
  const stem = _canonicalModelStem(model);
  return aliases.some(alias => alias === stem ||
    alias.startsWith(stem) && /^(?:gen\d|tape|fc|frame|general|sff|lff|[bx]\d{4,5})/.test(alias.slice(stem.length)));
}

function resolveCatalogQueryScope(query, catalogs, selectedProduct) {
  const text = String(query || '').replace(/_/g, ' ');
  const mentions = [...text.matchAll(MODEL_RE)];
  const generations = [...new Set([...text.matchAll(GEN_RE)].map(match => match[1]))];
  const unqualifiedGeneration = generations.length === 1 ? generations[0] : null;
  const products = new Set();
  const unresolved = [];
  for (const [label, model, generation] of mentions) {
    const targetGen = generation || unqualifiedGeneration;
    const found = catalogs.filter(cat => _matchCatalogModel(cat, model) && (!targetGen || _catalogGeneration(cat) === targetGen));
    if (!found.length) unresolved.push(label.trim());
    for (const cat of found) products.add(cat.id);
  }
  for (const cat of catalogs) {
    if (_matchesAlias(text, cat.id) || (!mentions.length && _matchesAlias(text, cat.chassis))) products.add(cat.id);
  }
  if (!products.size && !mentions.length && !generations.length && selectedProduct && !PORTFOLIO_RE.test(text)) {
    const found = catalogs.filter(cat => [cat.id, cat.chassis].some(alias => _normalizeToken(alias) === _normalizeToken(selectedProduct)));
    for (const cat of found) products.add(cat.id);
    if (!found.length) unresolved.push(String(selectedProduct));
  }
  return {
    products: [...products],
    generations: mentions.length || products.size ? [] : generations.map(gen => 'Gen' + gen),
    unresolvedProducts: [...new Set(unresolved)]
  };
}

function _parseCapacityFilter(text) {
  const capMatch = text.match(/(>=|<=|>|<|at\s+least|at\s+most|under|over)?\s*(\d+(?:\.\d+)?)\s*(gb|tb)\b/i);
  if (!capMatch) return {};
  const op = (capMatch[1] || '').toLowerCase();
  const unit = capMatch[3].toUpperCase();
  const gbValue = unit === 'TB' ? Math.round(Number(capMatch[2]) * 1000) : Number(capMatch[2]);
  if (op === '>=' || op === 'at least' || op === 'over' || op === '>') {
    return { minCapacityGb: gbValue, ...(op === 'over' || op === '>' ? { minCapacityExclusive: true } : {}) };
  }
  if (op === '<=' || op === 'at most' || op === 'under' || op === '<') {
    return { maxCapacityGb: gbValue, ...(op === 'under' || op === '<' ? { maxCapacityExclusive: true } : {}) };
  }
  return { exactCapacityGb: gbValue };
}

function _parseWattageBounds(text) {
  const out = {};
  const boundRe = /(>=|<=|>|<|\b(?:above|over|more\s+than|at\s+least|min(?:imum)?|below|under|less\s+than|at\s+most|max(?:imum)?)\b)\s*(\d{2,4})\s*w(?:atts?)?(?:\s*tdp)?\b/gi;
  const consumed = new Set();
  for (const m of text.matchAll(boundRe)) {
    const op = m[1].toLowerCase();
    const val = Number(m[2]);
    if (!Number.isFinite(val)) continue;
    consumed.add(m.index + m[0].lastIndexOf(m[2]));
    const exclusive = /^(?:[<>]|above|over|more\s+than|below|under|less\s+than)$/i.test(op);
    if (/^(?:>|>=|above|over|more\s+than|at\s+least|min)/i.test(op)) {
      out.minWattage = val;
      if (exclusive) out.minWattageExclusive = true;
    } else {
      out.maxWattage = val;
      if (exclusive) out.maxWattageExclusive = true;
    }
  }
  const bareWatts = [...text.matchAll(/\b(\d{2,4})\s*w(?:atts?)?\b/gi)]
    .filter((m) => !consumed.has(m.index))
    .map((m) => Number(m[1]));
  if (bareWatts.length > 0 && out.minWattage == null && out.maxWattage == null) {
    out.wattages = [...new Set(bareWatts)];
  }
  return out;
}

function _parseCoreBounds(text) {
  const m = text.match(/(>=|<=|>|<|\b(?:above|over|at\s+least|min(?:imum)?|below|under|at\s+most|max(?:imum)?)\b)?\s*(\d{1,3})\s*cores?\b/i);
  if (!m) return {};
  const val = Number(m[2]);
  const op = (m[1] || '').toLowerCase();
  if (/^(?:<=|<|below|under|at\s+most|max)/i.test(op)) {
    return { maxCores: val, ...(op === '<' || op === 'below' || op === 'under' ? { maxCoresExclusive: true } : {}) };
  }
  return { minCores: val, ...(op === '>' || op === 'above' || op === 'over' ? { minCoresExclusive: true } : {}) };
}

function _parseSpecs(query) {
  const text = String(query || '');
  const specs = { ..._parseCapacityFilter(text), ..._parseWattageBounds(text), ..._parseCoreBounds(text) };
  const ddr = text.match(/\b(ddr\d+)\b/i);
  if (ddr) specs.ddrType = ddr[1].toUpperCase();
  const dimm = text.match(/\b(rdimm|lrdimm|mrdimm)\b/i);
  if (dimm) specs.dimmType = dimm[1].toUpperCase();
  const speedMt = text.match(/\b(\d{4,5})\s*(?:mt\/s|mhz)\b/i);
  if (speedMt) specs.speedMt = Number(speedMt[1]);
  const gpu = text.match(/\b(h100|h200|b100|b200|gb200|l40s?|l4|a100|rtx\s*(?:pro\s*)?\d{4}|mi\d{3}[a-z]?|gaudi\s*\d?)\b/i);
  if (gpu) specs.gpuModel = gpu[1].replace(/\s+/g, ' ').toUpperCase();
  const nicSpeed = text.match(/\b(\d{1,3})\s*gbe\b/i);
  if (nicSpeed) specs.nicSpeedGbps = Number(nicSpeed[1]);
  if (/\bocp\s*3\b|\bocp3\b/i.test(text)) specs.nicFormFactor = 'OCP3';
  if (/\btitanium\b/i.test(text)) specs.psuEfficiency = 'Titanium';
  else if (/\bplatinum\b/i.test(text)) specs.psuEfficiency = 'Platinum';
  const proto = text.match(/\b(nvme|sas|sata)\b/i);
  if (proto) specs.driveProtocol = proto[1].toUpperCase();
  const ff = text.match(/\b(sff|lff|edsff|m\.2)\b/i);
  if (ff) specs.driveFormFactor = ff[1].toUpperCase();
  if (/\bread\s*intensive\b/i.test(text)) specs.driveEndurance = 'RI';
  else if (/\bmixed\s*use\b/i.test(text)) specs.driveEndurance = 'MU';
  else if (/\bwrite\s*intensive\b/i.test(text)) specs.driveEndurance = 'WI';
  const term = text.match(/\b(\d+)\s*[-\s]?(?:yrs?|years?)\b/i);
  if (term) specs.serviceTermYears = Number(term[1]);
  if (/\bbasic\b/i.test(text) && /\b(?:tech\s*care|support|service)\b/i.test(text)) specs.serviceSla = 'BASIC';
  else if (/\bessential\b/i.test(text)) specs.serviceSla = 'ESSENTIAL';
  else if (/\bcritical\b/i.test(text)) specs.serviceSla = 'CRITICAL';
  return specs;
}

function _parsePriceBounds(query) {
  const price = { maxPriceUsd: null, minPriceUsd: null };
  const matches = query.matchAll(/(?:\b(price|cost|budget)\s+)?(?<!\w)(<=|>=|<|>|\b(?:under|below|less\s+than|max(?:imum)?|within|at\s+most|above|over|more\s+than|min(?:imum)?|at\s+least)\b)\s*(USD\b|\$)?\s*(\d[\d,]*(?:\.\d{1,2})?)([km]\b)?(?:\s*(USD\b|\$))?(?![\w,.])/gi);
  const multiplier = { k: 1000, m: 1000000 };
  for (const [, field, op, prefix, amount, scale, suffix] of matches) {
    if (!field && !prefix && !suffix) continue;
    const value = Number(amount.replace(/,/g, '')) * (multiplier[scale?.toLowerCase()] || 1);
    if (!Number.isFinite(value)) continue;
    const isMin = /^(?:>|>=|above|over|more|min|at\s+least)/i.test(op);
    const exclusive = /^(?:[<>]|under|below|less\s+than|above|over|more\s+than)$/i.test(op);
    const key = isMin ? 'minPriceUsd' : 'maxPriceUsd';
    const strictKey = isMin ? 'minExclusive' : 'maxExclusive';
    if (price[key] === null || (isMin ? value > price[key] : value < price[key])) {
      price[key] = value;
      delete price[strictKey];
    }
    if (value === price[key] && exclusive) price[strictKey] = true;
  }
  return price;
}

function _parseLeadTimeBounds(query) {
  const text = String(query || '');
  if (/\bfast[\s-]*ship\b/i.test(text)) return { maxLeadTimeDays: 7, fastShipOnly: true };
  const match = text.match(/(<=|<|\bwithin|\bunder|\bmax(?:imum)?|\bat\s+most)\s*(\d+)\s*(business\s+days?|days?|weeks?)\b/i);
  const unit = match?.[3].toLowerCase() || '';
  return {
    maxLeadTimeDays: match ? Number(match[2]) * (unit.startsWith('week') ? 7 : 1) : null,
    fastShipOnly: false,
    ...(match && /^(?:<|under)$/i.test(match[1]) ? { maxExclusive: true } : {}),
    ...(unit.startsWith('business') ? { unit: 'BUSINESS_DAYS' } : {})
  };
}

function _parseSortOrder(query) {
  const lower = String(query || '').toLowerCase();
  if (/\b(?:sort(?:ed)?\s+by\s+lead\s*time|fastest|shortest\s+lead\s*time|quickest\s+delivery)\b/.test(lower)) {
    return /\bdesc(?:ending)?|longest|slowest\b/.test(lower) ? 'leadTimeDesc' : 'leadTimeAsc';
  }
  if (/\b(?:sort(?:ed)?\s+by\s+price|cheapest|lowest\s+price|most\s+expensive|highest\s+price)\b/.test(lower)) {
    return /\bdesc(?:ending)?|most\s+expensive|highest\b/.test(lower) ? 'priceDesc' : 'priceAsc';
  }
  if (/\b(?:sort(?:ed)?\s+by\s+capacity|highest\s+capacity|largest\s+capacity|lowest\s+capacity|smallest\s+capacity)\b/.test(lower)) {
    return /\basc(?:ending)?|lowest|smallest\b/.test(lower) ? 'capacityAsc' : 'capacityDesc';
  }
  if (/\b(?:sort(?:ed)?\s+by\s+cores?|most\s+cores|highest\s+cores?)\b/.test(lower)) {
    return 'coresDesc';
  }
  if (/\b(?:sort(?:ed)?\s+by\s+(?:wattage|tdp|power)|highest\s+(?:wattage|tdp)|lowest\s+(?:wattage|tdp))\b/.test(lower)) {
    return /\basc(?:ending)?|lowest\b/.test(lower) ? 'wattageAsc' : 'wattageDesc';
  }
  return 'default';
}

function _parseLifecycleAndVisibilityFilters(query) {
  const lower = String(query || '').toLowerCase();
  const lifecycles = [];
  if (/\bobsolete|discontinued|eol\b/.test(lower) && !/\b90[\s-]*day\b/.test(lower)) lifecycles.push('Obsolete');
  if (/\b90[\s-]*day\b/.test(lower)) lifecycles.push('90-Day Warning');
  if (/\bdirect[\s-]*ship\b/.test(lower)) lifecycles.push('Direct Ship');
  if (/\b(?:constrained[\s_-]*supply|supply[\s_-]*(?:restricted|constrained))\b|\[cs\]/.test(lower)) lifecycles.push('Constrained Supply');
  if (/\bactive\b/.test(lower)) lifecycles.push('Active');

  const visibilityFilter = /\b(?:hidden|conditional|selector[\s-]*gated)\b/.test(lower)
    ? ['SELECTOR_HIDDEN', 'DOM_HIDDEN']
    : null;
  return { lifecycles, visibilityFilter, orderableOnly: /\b(?:orderable|available|in\s+stock|can\s+(?:i|we)\s+(?:buy|order))\b/i.test(query) };
}

function _unsupportedCatalogFilters(text) {
  const filters = [];
  if (/\b(?:EUR|AED|INR|GBP|euro|rupees|partner\s+cost|discounted\s+price)\b/i.test(text)) filters.push('Requested currency or price basis is unavailable');
  if (/\b(?:excluding|except|without|but not|compatible with|works with)\b/i.test(text)) filters.push('Requested exclusion or compatibility filter requires clarification');
  if (/\b(?:deliver(?:y|ed)?\s+)?(?:by|before)\s+\d{4}-\d{2}-\d{2}\b/i.test(text)) filters.push('A dated delivery deadline requires a scoped ETA');
  return filters;
}

/**
 * Parse natural language catalog search/filter/sort queries cleanly.
 * Returns null if the query is conceptual Q&A or a multiline BOQ without search constraints.
 * @param {string} query
 * @param {object} [options]
 * @returns {object|null}
 */
function _resolveQueryRowTypes(text, componentRoles) {
  if (/\bfio\b|internal|tracking|all\s+rows/i.test(text)) return null;
  const wantsService = componentRoles.includes('Service & Support');
  const wantsSoftware = componentRoles.includes('Software');
  if (wantsService && !wantsSoftware && componentRoles.length === 1) return ['SUPPORT_SERVICE'];
  if (wantsSoftware && !wantsService && componentRoles.length === 1) return ['SOFTWARE_SUBSCRIPTION'];
  if (componentRoles.length > 0 && !wantsService && !wantsSoftware) {
    return ['HARDWARE_OPTION', 'BASE_SYSTEM', 'OWNED_COMPONENT_PARENT'];
  }
  return ['HARDWARE_OPTION', 'BASE_SYSTEM', 'OWNED_COMPONENT_PARENT', 'SUPPORT_SERVICE', 'SOFTWARE_SUBSCRIPTION'];
}

function parseCatalogSearchQuery(query, options = {}) {
  const text = String(query || '').trim();
  if (!text || text.split(/\r?\n/).length > 4) return null;
  if (CONCEPTUAL_RE.test(text) && !/\b(?:sort|under\s*\$|<=|\d+\s*gb|dimms?|gpus?|psus?|skus?)\b/i.test(text)) return null;
  if (ARCHITECTURE_TOPIC_RE.test(text) && !/\b(?:skus?|prices?|costs?|lead\s*time|orderable)\b/i.test(text)) return null;
  if (!SEARCH_VERB_RE.test(text) || !STRUCTURED_CONSTRAINT_RE.test(text)) return null;

  const catalogs = Array.isArray(options.catalogs) ? options.catalogs : listAllCatalogs();
  const targets = resolveCatalogQueryScope(text, catalogs, options.selectedProduct);
  const componentRoles = ROLE_QUERY_PATTERNS.filter((p) => p.regex.test(text)).map((p) => p.role);
  const specs = _parseSpecs(text);
  const price = _parsePriceBounds(text);
  const leadTime = _parseLeadTimeBounds(text);
  const sortBy = _parseSortOrder(text);
  const state = _parseLifecycleAndVisibilityFilters(text);
  const limitMatch = text.match(/\btop\s+(\d+)\b/i);
  const rowTypes = _resolveQueryRowTypes(text, componentRoles);

  return {
    rawQuery: text,
    ...targets,
    componentRoles,
    rowTypes,
    specs,
    price,
    leadTime,
    ...state,
    unresolvedFilters: _unsupportedCatalogFilters(text),
    sortBy,
    limit: limitMatch ? Math.max(1, Math.min(100, Number(limitMatch[1]))) : 50
  };
}

function _loadSearchableRowsForCatalog(cat) {
  const rows = [];
  const sources = [];
  const loadJson = (filePath, defaultKind) => {
    const source = { product: cat.id, kind: defaultKind, file: filePath || null, status: 'MISSING' };
    sources.push(source);
    if (!filePath) return;
    try {
      const bytes = fs.readFileSync(filePath);
      const data = JSON.parse(bytes.toString('utf8'));
      if (!Array.isArray(data?.entries) || data.entries.some(entry => !Array.isArray(entry?.skus) ||
          entry.skus.some(row => !row || typeof row !== 'object' || Array.isArray(row)))) {
        source.status = 'INVALID';
        return;
      }
      source.status = 'READ';
      source.sha256 = createHash('sha256').update(bytes).digest('hex');
      source.capturedAt = data.metadata?.scrapeTimestamp || data.metadata?.scrapeDate || cat.scrapeDate || null;
      for (const entry of data.entries) {
        for (const skuRow of entry.skus) {
          if (isRemovalTombstone(skuRow)) continue;
          rows.push({
            catalog: cat,
            entry,
            skuRow,
            source,
            sourceKind: defaultKind,
            scrapeDate: data?.metadata?.scrapeDate || cat.scrapeDate || null
          });
        }
      }
    } catch (error) {
      source.status = error.code === 'ENOENT' ? 'MISSING' : 'UNREADABLE';
    }
  };
  loadJson(cat.catalogJsonPath, 'CATALOG');
  const servicesPath = cat.servicesJsonPath || path.join(cat.catalogDir, `${cat.id}_Services.json`);
  loadJson(servicesPath, 'SERVICES');

  const condPath = path.join(cat.catalogDir, 'raw_data', 'conditional_skus.json');
  const condMap = new Map();
  const conditionalSource = { product: cat.id, kind: 'CONDITIONAL', file: condPath, status: 'MISSING' };
  sources.push(conditionalSource);
  try {
    const bytes = fs.readFileSync(condPath);
    const cond = JSON.parse(bytes.toString('utf8'));
    const list = Array.isArray(cond) ? cond : (cond?.observations || cond?.conditionalSkus || cond?.skus);
    if (!Array.isArray(list)) throw new Error('Invalid conditional observations');
    conditionalSource.status = 'READ';
    conditionalSource.sha256 = createHash('sha256').update(bytes).digest('hex');
    for (const item of list) {
      const sku = cleanBaseSKU(item?.sku || item?.['Product #']);
      if (!sku) continue;
      if (!condMap.has(sku)) condMap.set(sku, []);
      condMap.get(sku).push(item);
    }
  } catch (error) {
    conditionalSource.status = error.code === 'ENOENT' ? 'MISSING' : 'UNREADABLE';
  }
  return { rows, condMap, sources };
}

function _extractRowCapacityGb(desc) {
  const m = String(desc || '').match(/\b(\d+(?:\.\d+)?)\s*(TB|GB)\b/i);
  if (!m) return null;
  const val = Number(m[1]);
  return m[2].toUpperCase() === 'TB' ? Math.round(val * 1000) : val;
}

function _matchesMemorySpecs(desc, specs, attrs) {
  if (specs.ddrType) {
    const ddrDesc = String(desc || '').match(/\b(ddr\d+)\b/i);
    const rowDdr = attrs.ddrGen || attrs.ddrType || (ddrDesc ? ddrDesc[1].toUpperCase() : null);
    if (rowDdr !== specs.ddrType) return false;
  }
  if (specs.dimmType && !(new RegExp(`\\b${specs.dimmType}\\b`, 'i').test(desc))) return false;
  if (specs.speedMt && attrs.speedMt !== specs.speedMt && !desc.includes(String(specs.speedMt))) return false;
  if (specs.exactCapacityGb != null || specs.minCapacityGb != null || specs.maxCapacityGb != null) {
    const rowGb = attrs.capacityGb || _extractRowCapacityGb(desc);
    if (!rowGb) return false;
    if (specs.exactCapacityGb != null && Math.abs(rowGb - specs.exactCapacityGb) > 0.1) return false;
    if (_outsideBounds(rowGb, specs.minCapacityGb, specs.maxCapacityGb, specs.minCapacityExclusive, specs.maxCapacityExclusive)) return false;
  }
  return true;
}

function _matchesComputeAndPowerSpecs(desc, specs, attrs) {
  if (specs.gpuModel && !(new RegExp(`\\b${specs.gpuModel.replace(/\s+/g, '\\s+')}\\b`, 'i').test(desc))) return false;
  if (specs.minCores != null || specs.maxCores != null) {
    const cores = attrs.cores;
    if (!Number.isFinite(cores) || _outsideBounds(cores, specs.minCores, specs.maxCores, specs.minCoresExclusive, specs.maxCoresExclusive)) {
      return false;
    }
  }
  const wattMatch = String(desc).match(/\b(\d{2,4})\s*w\b/i);
  const rowWatt = attrs.tdpWatts ?? attrs.wattage ?? (wattMatch ? Number(wattMatch[1]) : null);
  if (specs.minWattage != null || specs.maxWattage != null) {
    if (!Number.isFinite(rowWatt) || _outsideBounds(rowWatt, specs.minWattage, specs.maxWattage, specs.minWattageExclusive, specs.maxWattageExclusive)) {
      return false;
    }
  }
  if (specs.wattages && specs.wattages.length > 0 && (!Number.isFinite(rowWatt) || !specs.wattages.includes(rowWatt))) {
    return false;
  }
  if (specs.psuEfficiency && String(attrs.efficiency || '').toLowerCase() !== specs.psuEfficiency.toLowerCase()
    && !(new RegExp(`\\b${specs.psuEfficiency}\\b`, 'i').test(desc))) {
    return false;
  }
  return true;
}

function _matchesDriveSpecs(desc, specs, attrs = {}) {
  if (specs.driveProtocol && attrs.interfaceProtocol !== specs.driveProtocol && !(new RegExp(`\\b${specs.driveProtocol}\\b`, 'i').test(desc))) return false;
  if (specs.driveFormFactor && attrs.formFactor !== specs.driveFormFactor && !(new RegExp(`\\b${specs.driveFormFactor}\\b`, 'i').test(desc))) return false;
  if (specs.driveEndurance && attrs.endurance !== specs.driveEndurance) return false;
  return true;
}

function _matchesNetworkSpecs(desc, specs, attrs = {}) {
  if (specs.nicSpeedGbps && attrs.speedGbps !== specs.nicSpeedGbps && !(new RegExp(`\\b${specs.nicSpeedGbps}\\s*gbe?\\b`, 'i').test(desc))) {
    return false;
  }
  if (specs.nicFormFactor && attrs.formFactor !== specs.nicFormFactor && !/\bocp\s*3\b|\bocp3\b/i.test(desc)) {
    return false;
  }
  return true;
}

function _matchesServiceSpecs(desc, specs, attrs) {
  if (specs.serviceTermYears) {
    const term = attrs.termYears || Number((desc.match(/\b(\d+)\s*[-\s]?y(?:ear|r)?\b/i) || [])[1] || 0);
    if (term !== specs.serviceTermYears) return false;
  }
  if (specs.serviceSla && String(attrs.slaTier || '').toUpperCase() !== specs.serviceSla && !new RegExp(`\\b${specs.serviceSla}\\b`, 'i').test(desc)) {
    return false;
  }
  return true;
}

function _matchesDeviceAndServiceSpecs(desc, specs, attrs) {
  return _matchesComputeAndPowerSpecs(desc, specs, attrs)
    && _matchesDriveSpecs(desc, specs, attrs)
    && _matchesNetworkSpecs(desc, specs, attrs)
    && _matchesServiceSpecs(desc, specs, attrs);
}

function _inspectRowPricing(skuRow, desc) {
  const candidates = [
    ['List Price (USD)', skuRow['List Price (USD)']],
    ['Unit Price (USD)', skuRow['Unit Price (USD)']],
    ['Price (USD)', skuRow['Price (USD)']],
    ['listPrice', skuRow.listPrice]
  ].filter(([, val]) => val !== null && val !== undefined && String(val).trim() !== '');

  if (candidates.length === 0) return { priceUsd: null, priceState: 'UNPRICED', priceStatus: 'UNPRICED' };
  if (candidates.length > 1) {
    const reconciled = reconcileConflictingPrices(candidates.map(([source, raw]) => ({ source, raw, row: skuRow, description: desc })),
      { toleranceUsd: 0 });
    if (reconciled.priceState === 'CONFLICTING_EVIDENCE') {
      return reconciled;
    }
    if (reconciled.parseFailures?.length && reconciled.priceUsd !== null) {
      return { ...reconciled, priceUsd: null, priceState: 'CONFLICTING_EVIDENCE', priceStatus: 'CONFLICTING_EVIDENCE' };
    }
  }
  return parseStrictPrice(candidates[0][1], { row: skuRow, description: desc });
}

function _roleMatchesFilter(requestedRoles, candidate) {
  if (!requestedRoles?.length) return true;
  if (requestedRoles.includes(candidate.componentRole)) return true;
  const descAndSub = `${candidate.componentRole || ''} ${candidate.subCategory || ''} ${candidate.description || ''}`;
  return requestedRoles.some((reqRole) => {
    if (reqRole === 'Software') return candidate.rowType === 'SOFTWARE_SUBSCRIPTION' || /software|licens/i.test(candidate.componentRole || '');
    if (reqRole === 'Service & Support') return candidate.rowType === 'SUPPORT_SERVICE' || /service|support/i.test(candidate.componentRole || '');
    if (reqRole === 'Rack / Rail') return /\b(?:rack|rail)\b/i.test(descAndSub);
    if (reqRole === 'Cooling / Thermal') return /\b(?:cooling|thermal|fan|heatsink)\b/i.test(descAndSub);
    if (reqRole === 'Transceiver') return /\b(?:transceiver|optic|sfp|qsfp|cable|dac|aoc)\b/i.test(descAndSub);
    return false;
  });
}

function _matchesQueryFilters(candidate, parsedQuery) {
  if (!_roleMatchesFilter(parsedQuery.componentRoles, candidate)) {
    return false;
  }
  if (parsedQuery.rowTypes?.length > 0 && !parsedQuery.rowTypes.includes(candidate.rowType)) {
    return false;
  }
  if (parsedQuery.lifecycles?.length > 0 && !parsedQuery.lifecycles.includes(candidate.lifecycleCanonical)) {
    return false;
  }
  if (parsedQuery.visibilityFilter?.length > 0 && !parsedQuery.visibilityFilter.includes(candidate.visibility)) {
    return false;
  }
  const { specs } = parsedQuery;
  if (specs) {
    if (!_matchesMemorySpecs(candidate.description || '', specs, candidate.attributes || {})) return false;
    if (!_matchesDeviceAndServiceSpecs(candidate.description || '', specs, candidate.attributes || {})) return false;
  }
  return true;
}

function _sortMetric(item, sortBy) {
  if (sortBy === 'capacityAsc' || sortBy === 'capacityDesc') {
    return item.attributes?.capacityGb ?? _extractRowCapacityGb(item.description || '');
  }
  if (sortBy === 'coresDesc') return item.attributes?.cores ?? null;
  return item.attributes?.tdpWatts ?? item.attributes?.wattage ?? null;
}

function _sortSearchResults(items, sortBy) {
  return [...items].sort((a, b) => {
    if (sortBy === 'leadTimeAsc') {
      return a.leadTimeDays !== b.leadTimeDays ? a.leadTimeDays - b.leadTimeDays : (a.listPriceUsd ?? Infinity) - (b.listPriceUsd ?? Infinity);
    }
    if (sortBy === 'leadTimeDesc') {
      return b.leadTimeDays !== a.leadTimeDays ? b.leadTimeDays - a.leadTimeDays : a.sku.localeCompare(b.sku);
    }
    if (sortBy === 'priceDesc') {
      return (b.listPriceUsd ?? -Infinity) - (a.listPriceUsd ?? -Infinity) || a.sku.localeCompare(b.sku);
    }
    if (sortBy === 'priceAsc') {
      return (a.listPriceUsd ?? Infinity) - (b.listPriceUsd ?? Infinity) || a.sku.localeCompare(b.sku);
    }
    if (['capacityAsc', 'capacityDesc', 'coresDesc', 'wattageAsc', 'wattageDesc'].includes(sortBy)) {
      const av = _sortMetric(a, sortBy);
      const bv = _sortMetric(b, sortBy);
      const desc = sortBy.endsWith('Desc');
      return ((desc ? (bv ?? -Infinity) - (av ?? -Infinity) : (av ?? Infinity) - (bv ?? Infinity))) || a.sku.localeCompare(b.sku);
    }
    return a.product.localeCompare(b.product) || a.sku.localeCompare(b.sku);
  });
}

function selectCatalogsForScope(allCatalogs, parsedQuery) {
  if (!parsedQuery || typeof parsedQuery !== 'object') return [];
  if (parsedQuery.unresolvedProducts?.length || parsedQuery.unresolvedFilters?.length) return [];
  const generations = parsedQuery.generations || (parsedQuery.gen ? [parsedQuery.gen] : []);
  return allCatalogs.filter((cat) => {
    if (parsedQuery.products?.length > 0 && !parsedQuery.products.includes(cat.id)) return false;
    if (generations.length && !generations.includes('Gen' + _catalogGeneration(cat))) return false;
    return true;
  });
}

function _applicableConditionalEntries(observations, skuRow, catalog) {
  const rowScope = skuRow.scopeProvenance || {};
  return (observations || []).filter(item => {
    const scope = item.scopeProvenance || {};
    const owner = rowScope.ownerProduct || skuRow.ownerProduct || catalog.id;
    return (!scope.ownerProduct || scope.ownerProduct === owner) &&
      (!scope.baseSku || !rowScope.baseSku || scope.baseSku === rowScope.baseSku);
  });
}

function lookupCatalogSku(catalog, sku) {
  if (!catalog?.catalogDir || !catalog.catalogJsonPath || !sku) return null;
  const target = cleanBaseSKU(sku);
  const { rows, condMap } = _loadSearchableRowsForCatalog(catalog);
  const matches = rows.filter(item => cleanBaseSKU(item.skuRow['Product #'] || item.skuRow.sku) === target);
  if (!matches.length) {
    const observations = _applicableConditionalEntries(condMap.get(target), {}, catalog);
    if (!observations.length) return null;
    const row = observations[0];
    return { row, entry: { parentCategory: row.parentCategory || 'Conditional Options', subCategory: row.subCategory },
      observations, price: { priceUsd: null, priceState: 'UNPRICED', priceStatus: 'UNPRICED' }, source: null };
  }
  const choices = matches.map(item => ({ item, price: _inspectRowPricing(item.skuRow, item.skuRow.Description || item.skuRow.description) }));
  const primary = choices.find(choice => Number.isFinite(choice.price.priceUsd)) || choices[0];
  const prices = new Set(choices.map(choice => choice.price.priceUsd).filter(Number.isFinite));
  const malformed = choices.some(choice => ['PARSE_FAILED', 'CONFLICTING_EVIDENCE'].includes(choice.price.priceState));
  const conflict = prices.size > 1 || (malformed && prices.size > 0);
  const { skuRow: row, entry, source } = primary.item;
  return { row, entry, source, observations: _applicableConditionalEntries(condMap.get(target), row, catalog),
    price: conflict ? { priceUsd: null, priceState: 'CONFLICTING_EVIDENCE', priceStatus: 'CONFLICTING_EVIDENCE',
      conflicts: choices.map(choice => ({ source: choice.item.source, scope: choice.item.skuRow.scopeProvenance || null, ...choice.price })) }
      : primary.price };
}

function _evaluateRowCandidate(item, condMap, parsedQuery) {
  const { catalog, entry, skuRow } = item;
  const rawSku = String(skuRow['Product #'] || skuRow.sku || '').trim();
  const baseSku = cleanBaseSKU(rawSku);
  if (!baseSku || !isValidHpeSKU(baseSku)) return null;

  const desc = String(skuRow.Description || skuRow.description || '').trim();
  const componentRole = classifyComponentRole(`${entry.parentCategory || ''} ${entry.subCategory || ''}`, desc, null);
  const canonical = extractCanonicalAttributes({ sku: baseSku, description: desc, category: entry.parentCategory || '' }, entry);
  const cond = _applicableConditionalEntries(condMap.get(baseSku), skuRow, catalog);
  const availability = buildAvailabilityContract({ skuRow, conditionalEntry: cond, capturedAt: item.source.capturedAt });
  const rowType = classifyRowType(skuRow, { isBase: /^(?:base\s*)?chassis$/i.test(entry.parentCategory || '') && /variants|chassis/i.test(entry.subCategory || '') });

  const candidate = {
    product: catalog.id,
    ownerProduct: skuRow.ownerProduct || catalog.id,
    gen: catalog.gen || null,
    sku: rawSku,
    baseSku,
    description: desc,
    parentCategory: entry.parentCategory || 'Uncategorized',
    subCategory: entry.subCategory || '',
    componentRole,
    rowType,
    attributes: { ...canonical.attributes, ...skuRow.canonicalSpecs },
    lifecycleCanonical: availability.lifecycleCanonical,
    visibility: availability.visibility,
    availability: availability.availability,
    selectability: availability.selectability,
    compatibility: availability.compatibility,
    conditionSummary: availability.conditionSummary,
    conditionalObservations: cond.map(observation => ({
      condition: observation.condition || observation.ruleContext || null,
      selectorTriggerSku: observation.selectorTriggerSku || null,
      operator: observation.operator || null,
      thresholdDegC: observation.thresholdDegC ?? null,
      scope: observation.scopeProvenance || null
    })),
    scope: skuRow.scopeProvenance || null,
    evidence: item.source,
    scrapeDate: item.scrapeDate
  };

  if (!_matchesQueryFilters(candidate, parsedQuery)) return null;

  const pricing = _inspectRowPricing(skuRow, desc);
  const leadTime = parseLeadTimeOrEta(skuRow['Lead Time'] || skuRow.leadTime, skuRow.leadTimeDays, skuRow['Speed Tier']);
  return {
    ...candidate,
    listPriceUsd: pricing.priceUsd,
    priceState: pricing.priceState,
    priceStatus: pricing.priceStatus,
    leadTimeDays: leadTime.days,
    leadTimeText: leadTime.raw,
    leadTime
  };
}

function _outsideBounds(value, min, max, minExclusive, maxExclusive) {
  return (min != null && (value < min || (minExclusive && value === min))) ||
    (max != null && (value > max || (maxExclusive && value === max)));
}

function _matchDisposition(row, request) {
  if (['PARSE_FAILED', 'CONFLICTING_EVIDENCE'].includes(row.priceState)) return 'PRICE_CONFLICT';
  const price = request.price || {};
  const lead = request.leadTime || {};
  const priced = Number.isFinite(row.listPriceUsd);
  const measured = Number.isFinite(row.leadTimeDays);
  if (priced && _outsideBounds(row.listPriceUsd, price.minPriceUsd, price.maxPriceUsd, price.minExclusive, price.maxExclusive)) return 'OUTSIDE_FILTER';
  if (request.orderableOnly && row.availability !== 'ORDERABLE') {
    return ['NOT_SELECTABLE', 'OBSOLETE'].includes(row.availability) ? 'OUTSIDE_FILTER' : 'ORDERABILITY_UNVERIFIED';
  }
  if (!priced && (price.minPriceUsd != null || price.maxPriceUsd != null || /^price/.test(request.sortBy || ''))) return 'UNPRICED';
  if (!measured && (lead.maxLeadTimeDays != null || /^leadTime/.test(request.sortBy || ''))) {
    return row.leadTime?.rawType === 'ETA_DATE' ? 'ETA_DATE_NOT_NUMERIC_DAYS' : 'LEAD_TIME_UNPUBLISHED';
  }
  if (lead.maxLeadTimeDays != null) {
    if ((row.leadTime?.unit === 'BUSINESS_DAYS') !== (lead.unit === 'BUSINESS_DAYS')) return 'LEAD_TIME_UNIT_UNVERIFIED';
    const upper = row.leadTime?.maxDays ?? row.leadTimeDays;
    if (_outsideBounds(upper, null, lead.maxLeadTimeDays, false, lead.maxExclusive)) return 'OUTSIDE_FILTER';
  }
  return 'MATCH';
}

function _partitionSearchMatch(record, request, buckets) {
  const reason = _matchDisposition(record, request);
  if (reason === 'MATCH') buckets.matched.push(record);
  else if (reason !== 'OUTSIDE_FILTER') {
    const exclusion = { sku: record.sku, product: record.product, reason, evidence: record.evidence };
    if (reason === 'PRICE_CONFLICT') buckets.excludedConflicts.push({ ...exclusion, priceStatus: record.priceStatus });
    else if (reason === 'UNPRICED') buckets.excludedUnpriced.push(exclusion);
    else buckets.excludedUnmeasured.push({ ...exclusion, leadTimeText: record.leadTimeText });
  }
}

function _uniqueScopedRows(rows) {
  const byScope = new Map();
  for (const row of rows) {
    const key = JSON.stringify([row.product, row.ownerProduct, row.baseSku, row.scope?.baseSku, row.scope?.selectorState, row.scope?.region]);
    if (!byScope.has(key)) byScope.set(key, []);
    byScope.get(key).push(row);
  }
  return [...byScope.values()].map(group => {
    const first = group[0];
    const observed = group.filter(row => Number.isFinite(row.listPriceUsd));
    const prices = new Set(observed.map(row => row.listPriceUsd));
    const availability = group.every(row => row.availability === first.availability) ? first.availability : 'UNKNOWN';
    if (prices.size > 1 || group.some(row => ['PARSE_FAILED', 'CONFLICTING_EVIDENCE'].includes(row.priceState))) {
      return { ...first, availability, listPriceUsd: null, priceState: 'CONFLICTING_EVIDENCE', priceStatus: 'CONFLICTING_EVIDENCE' };
    }
    return { ...(observed[0] || first), availability };
  });
}

function _hasSourceGap(source, request) {
  if (source.status === 'READ') return false;
  if (source.status !== 'MISSING' || source.kind === 'CATALOG') return true;
  return source.kind === 'SERVICES' && request.rowTypes?.length > 0 &&
    request.rowTypes.every(type => ['SUPPORT_SERVICE', 'SOFTWARE_SUBSCRIPTION'].includes(type));
}

function _emptySearchPayload(rawQuery = '') {
  return {
    query: String(rawQuery || ''),
    filters: {},
    sources: [],
    results: [],
    excludedUnmeasured: [],
    excludedUnpriced: [],
    excludedConflicts: [],
    summary: {
      productsSearched: [],
      totalRowsScanned: 0,
      matchedCount: 0,
      returnedCount: 0,
      excludedUnmeasuredCount: 0,
      excludedUnpricedCount: 0,
      excludedConflictCount: 0,
      incompleteCatalogCoverage: true
    }
  };
}

/**
 * Execute a deterministic structured catalog search with strict conflict & unmeasured exclusions.
 * @param {object|string|null} queryOrParsed
 * @param {object} [options]
 * @returns {object}
 */
function executeCatalogSearch(queryOrParsed, options = {}) {
  const allCatalogs = Array.isArray(options.catalogs) ? options.catalogs : listAllCatalogs();
  const parsedQuery = typeof queryOrParsed === 'string'
    ? parseCatalogSearchQuery(queryOrParsed, { ...options, catalogs: allCatalogs })
    : queryOrParsed;
  if (!parsedQuery || typeof parsedQuery !== 'object') {
    return _emptySearchPayload(typeof queryOrParsed === 'string' ? queryOrParsed : '');
  }
  const targetCatalogs = selectCatalogsForScope(allCatalogs, parsedQuery);
  const buckets = { matched: [], excludedUnmeasured: [], excludedUnpriced: [], excludedConflicts: [] };
  const sources = [];
  let totalRowsScanned = 0;

  for (const cat of targetCatalogs) {
    const { rows, condMap, sources: catalogSources } = _loadSearchableRowsForCatalog(cat);
    sources.push(...catalogSources);
    totalRowsScanned += rows.length;
    const candidates = rows.map(item => _evaluateRowCandidate(item, condMap, parsedQuery)).filter(Boolean);
    for (const candidate of _uniqueScopedRows(candidates)) _partitionSearchMatch(candidate, parsedQuery, buckets);
  }

  const sorted = _sortSearchResults(buckets.matched, parsedQuery.sortBy);
  const limited = sorted.slice(0, parsedQuery.limit || 50);
  const incompleteCatalogCoverage = targetCatalogs.length === 0 || sources.some(source => _hasSourceGap(source, parsedQuery))
    || buckets.excludedUnmeasured.length > 0 || buckets.excludedUnpriced.length > 0 || buckets.excludedConflicts.length > 0;

  const { rawQuery, ...filters } = parsedQuery;
  const payload = {
    query: rawQuery,
    filters: structuredClone(filters),
    sources,
    results: limited,
    excludedUnmeasured: buckets.excludedUnmeasured,
    excludedUnpriced: buckets.excludedUnpriced,
    excludedConflicts: buckets.excludedConflicts,
    summary: {
      productsSearched: targetCatalogs.map((c) => c.id),
      totalRowsScanned,
      matchedCount: buckets.matched.length,
      returnedCount: limited.length,
      excludedUnmeasuredCount: buckets.excludedUnmeasured.length,
      excludedUnpricedCount: buckets.excludedUnpriced.length,
      excludedConflictCount: buckets.excludedConflicts.length,
      incompleteCatalogCoverage
    }
  };

  if (options.recordMiss !== false) {
    recordQueryMissIfNeeded(parsedQuery.rawQuery, payload, options.probeQueuePath, options.traceId);
  }
  return payload;
}

/**
 * Verify that a catalog search payload contains no leaked parse-failed rows, unmeasured
 * lead-time rows in numeric lead-time sorts/filters, or raw unfiltered history dumps.
 * @param {object} searchPayload
 * @param {object} [parsedQuery]
 * @returns {{ passed: boolean, status: string, issues: string[] }}
 */
function verifyCatalogSearchResponse(searchPayload, parsedQuery = null) {
  const issues = [];
  if (!searchPayload || !Array.isArray(searchPayload.results) || !Array.isArray(searchPayload.excludedUnmeasured)) {
    issues.push('Missing structured search arrays (results / excludedUnmeasured).');
    return { passed: false, status: 'FAILED', issues };
  }
  const request = parsedQuery || searchPayload.filters || {};
  const { rawQuery: _rawQuery, ...expectedFilters } = request;
  const { results, summary } = searchPayload;
  if (parsedQuery && !isDeepStrictEqual(searchPayload.filters, expectedFilters)) issues.push('Catalog filters differ from the verified request.');
  if (!_validResultCounts(results, summary, request)) issues.push('Catalog search counts do not agree with the returned rows and requested limit.');
  if (results.some(row => !_rowSatisfiesRequest(row, summary, request))) {
    issues.push('Returned rows violate the requested scope, filters, or evidence requirements.');
  }
  if (request.sortBy && _sortSearchResults([...results], request.sortBy).some((row, index) => row !== results[index])) {
    issues.push('Returned rows violate the requested sort order.');
  }
  if (issues.length > 0) {
    return { passed: false, status: 'FAILED', issues };
  }
  const incomplete = summary.incompleteCatalogCoverage || searchPayload.sources?.some(source => _hasSourceGap(source, request)) ||
    [searchPayload.excludedConflicts, searchPayload.excludedUnpriced,
    searchPayload.excludedUnmeasured].some(list => list?.length > 0);
  if (incomplete) {
    issues.push('Some requested scope or field evidence was unavailable.');
    return { passed: false, status: results.length ? 'PARTIAL' : 'ACTION_REQUIRED', issues };
  }
  return { passed: true, status: 'PASSED', issues: [] };
}

function _validResultCounts(results, summary, request) {
  if (!summary || summary.returnedCount !== results.length || results.length > (request.limit || 50)) return false;
  if (summary.matchedCount !== undefined && (!Number.isSafeInteger(summary.matchedCount) ||
      results.length !== Math.min(summary.matchedCount, request.limit || 50))) return false;
  if (request.products?.length && summary.productsSearched?.some(product => !request.products.includes(product))) return false;
  if (request.products?.length && !summary.incompleteCatalogCoverage &&
      request.products.some(product => !summary.productsSearched?.includes(product))) return false;
  return true;
}

function _rowSatisfiesRequest(row, summary, request) {
  if (!row || !summary) return false;
  if (request.unresolvedProducts?.length || request.unresolvedFilters?.length) return false;
  if (request.products?.length && !request.products.includes(row.product)) return false;
  if (summary.productsSearched?.length && !summary.productsSearched.includes(row.product)) return false;
  const generations = request.generations || (request.gen ? [request.gen] : []);
  if (generations.length && !generations.includes('Gen' + _catalogGeneration({ id: row.product, gen: row.gen }))) return false;
  return _matchesQueryFilters(row, request) && _matchDisposition(row, request) === 'MATCH';
}

/**
 * Queue actionable scraping follow-ups whenever a customer query hits incomplete portal
 * capture coverage (missing lead times, conflicting prices, or absent products).
 * @param {string} query
 * @param {object} searchResult
 * @param {string} [queuePath]
 * @returns {boolean}
 */
function recordQueryMissIfNeeded(_query, searchResult, queuePath, traceId) {
  return enqueueCatalogProbe(searchResult, { queuePath, traceId });
}

module.exports = {
  resolveCatalogQueryScope,
  selectCatalogsForScope,
  lookupCatalogSku,
  parseCatalogSearchQuery,
  executeCatalogSearch,
  verifyCatalogSearchResponse,
  recordQueryMissIfNeeded
};
