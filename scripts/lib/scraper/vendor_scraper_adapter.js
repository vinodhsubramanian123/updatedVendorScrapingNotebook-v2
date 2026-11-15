'use strict';
/**
 * scripts/lib/scraper/vendor_scraper_adapter.js
 *
 * Multi-vendor row normalization, domain classification, catalog rule extraction,
 * and declarative DOM portal adapter registry.
 *
 * Decouples portal scraping and catalog building from HPE-specific WebLogic DOM.
 * Maps disparate vendor configurator UIs (HPE OCA, Dell Premier, Cisco CCW,
 * Lenovo DCSC, custom ConfigurablePortalDomAdapter, Generic) into canonical
 * Server / Storage / Networking / Composite catalog items and rules.
 */

const { cleanBaseSKU } = require('../catalog/sku.js');
const { classifyComponentRole, parseProductMeta } = require('../catalog/product_meta.js');
const { inferPillar } = require('../catalog/product_scope.js');
const { normalizeSolutionPillar } = require('./vendor_portal_router.js');

function _detectFamilySafe(text = '') {
  const s = String(text || '').trim();
  if (!s) return null;
  try {
    return parseProductMeta(s)?.family || null;
  } catch (_) {
    return null;
  }
}

const SKU_TOKEN_REGEX = /\b(?:[A-Z0-9]{5,8}-[A-Z0-9]{2,4}|\d{3}-[A-Z0-9]{4}|(?:UCS|N9K)-[A-Z0-9-]+|7[A-Z0-9]{6,}|G[A-Z0-9]{6}|[A-Z]\d[A-Z0-9]{3}[A-Z])\b/g;

const NETWORKING_ROLES = new Set([
  'SAN Switch', 'Network Switch', 'Fabric Interconnect',
  'Port Upgrade Bundle', 'Network Adapter', 'Fibre Channel HBA', 'Transceiver'
]);

const STORAGE_ROLES = new Set([
  'Storage Controller', 'Drive Cage / Drive', 'Storage Battery'
]);

const SERVER_ROLES = new Set([
  'Processor', 'Memory', 'GPU / Accelerator', 'PCIe Riser', 'Cooling / Thermal', 'Boot Device'
]);

function _detectRoleDomain(role) {
  if (role === 'Composable Enclosure') return 'Composite';
  if (NETWORKING_ROLES.has(role)) return 'Networking';
  if (STORAGE_ROLES.has(role)) return 'Storage';
  if (SERVER_ROLES.has(role)) return 'Server';
  return null;
}

function _detectTextDomain(text) {
  if (/\b(synergy\s*12000|composable\s*(?:frame|enclosure)|composite)\b/i.test(text)) return 'Composite';
  if (/\b(fibre\s*channel\s*switch|fc\s*switch|network\s*switch|ethernet\s*switch|top-of-rack|tor\b|sn\d{4}[a-z]?|nexus|catalyst|aruba|infiniband|interconnect|virtual\s*connect|f32|transceiver|sfp28|qsfp28|qsfp56|dac\s*cable)\b/i.test(text)) {
    return 'Networking';
  }
  if (/\b(alletra|nimble|storeever|storeonce|msa\s*\d+|msl\d+|powerstore|powervault|powerscale|thinksystem\s*d[em]|storage\s*array|storage\s*system|tape\s*library|drive\s*enclosure|jbod|sas\s*expansion)\b/i.test(text)) {
    return 'Storage';
  }
  if (/\b(proliant|dl\d{3}a?|ml\d{3}|rl\d{3}|sy\d{3}|poweredge|thinksystem\s*sr|thinkagile|ucs\s*[bc]\d+|cray|gx\d{4}|cto\s*server|compute\s*module)\b/i.test(text)) {
    return 'Server';
  }
  return null;
}

function _resolveContextDomain(context = {}) {
  const explicit = context.pillar || context.domain || context.solutionDomain;
  if (explicit) return normalizeSolutionPillar(explicit, 'Server');
  if (context.family || context.productId) {
    const fam = context.family || _detectFamilySafe(context.productId || '');
    const inferred = inferPillar(fam, context.productId || '');
    if (inferred && inferred !== 'UNKNOWN') return normalizeSolutionPillar(inferred, 'Server');
  }
  return null;
}

function _extractSkuMentions(text = '') {
  const matches = String(text || '').match(SKU_TOKEN_REGEX);
  return matches ? Array.from(new Set(matches)) : [];
}

function _classifyRuleType(text = '', fallback = 'PORTAL_CONSTRAINT') {
  const s = String(text || '');
  if (/mutually\s+exclusive|incompatible|cannot\s+be\s+combined|not\s+supported\s+with|excluded/i.test(s)) {
    return 'MUTUAL_EXCLUSION';
  }
  if (/requires|prerequisite|must\s+select|mandatory|depends\s+on/i.test(s)) {
    return 'REQUIRED_DEPENDENCY';
  }
  if (/ambient|thermal|temperature|cooling|heatsink|heat\s*sink|fan\s*kit|tdp|\d+\s*°?\s*c\b/i.test(s)) {
    return 'THERMAL_CONSTRAINT';
  }
  if (/\b(?:min|max|minimum|maximum|up\s+to)\s+\d+|\b(?:slot|bay|port|dimm|channel)\s*(?:limit|count|max)/i.test(s)) {
    return 'CAPACITY_CONSTRAINT';
  }
  if (/conditional|hidden|visible\s+when|requires_selection|portal_conditional/i.test(s)) {
    return 'CONDITIONAL_VISIBILITY';
  }
  return fallback;
}

function _dominantRole(rules = []) {
  const counts = new Map();
  for (const r of rules) {
    if (!r.componentRole) continue;
    counts.set(r.componentRole, (counts.get(r.componentRole) || 0) + 1);
  }
  if (counts.size === 0) return 'Option Component';
  let topRole = 'Option Component';
  let topCount = -1;
  for (const [role, count] of counts.entries()) {
    if (count > topCount) { topRole = role; topCount = count; }
  }
  return topRole;
}

function _buildStructuredRule({ vendor, domainPillar, componentRole, ruleType, parentCategory, subCategory, ruleText, affectedSkus, requiredSkus, excludedSkus, minQty, maxQty, source }) {
  const cleanText = String(ruleText || '').trim();
  const extracted = _extractSkuMentions(cleanText);
  return {
    vendor,
    domainPillar,
    componentRole,
    ruleType: ruleType || _classifyRuleType(cleanText),
    parentCategory: parentCategory || 'General',
    subCategory: subCategory || '',
    affectedSkus: Array.isArray(affectedSkus) && affectedSkus.length > 0 ? affectedSkus : extracted,
    requiredSkus: Array.isArray(requiredSkus) ? requiredSkus : [],
    excludedSkus: Array.isArray(excludedSkus) ? excludedSkus : [],
    minQty: minQty ?? null,
    maxQty: maxQty ?? null,
    rule: cleanText,
    source
  };
}

function _normalizeTreeEntryRows(adapter, entry, context) {
  const parentCategory = entry.parentCategory || entry.category || 'Hardware Options';
  const subCategory = entry.subCategory || '';
  const cls = adapter.classifySolutionDomain({ parentCategory, subCategory, ...entry }, context);
  const rawSkus = Array.isArray(entry.skus) ? entry.skus : (Array.isArray(entry.rows) ? entry.rows : []);
  const skus = rawSkus.map(row => adapter.normalizeRawCatalogRow(row, { ...context, category: parentCategory, pillar: cls.domainPillar }));
  return {
    parentCategory,
    subCategory,
    domainPillar: cls.domainPillar,
    componentRole: cls.componentRole,
    skus,
    rules: Array.isArray(entry.rules) ? entry.rules : []
  };
}

function _buildNormalizedTreeEntries(adapter, rawEntries, rawTables, context) {
  const entries = [];
  for (const entry of Array.isArray(rawEntries) ? rawEntries : []) {
    if (entry && typeof entry === 'object') {
      entries.push(_normalizeTreeEntryRows(adapter, entry, context));
    }
  }
  for (const tbl of Array.isArray(rawTables) ? rawTables : []) {
    if (Array.isArray(tbl)) {
      entries.push(_normalizeTreeEntryRows(adapter, { rows: tbl }, context));
    } else if (tbl && typeof tbl === 'object') {
      const normalized = Array.isArray(tbl.rows) || Array.isArray(tbl.skus)
        ? tbl
        : { category: tbl.category || 'Hardware Options', rows: [tbl] };
      entries.push(_normalizeTreeEntryRows(adapter, normalized, context));
    }
  }
  return entries;
}

class BaseVendorScraperAdapter {
  constructor(vendor = 'Generic', options = {}) {
    this.vendor = vendor;
    this.adapterType = options.adapterType || 'DEFAULT';
    const rawPillars = Array.isArray(options.supportedPillars) && options.supportedPillars.length > 0
      ? options.supportedPillars
      : ['Server', 'Storage', 'Networking'];
    this.supportedPillars = Array.from(new Set(rawPillars.map(p => normalizeSolutionPillar(p)).filter(Boolean)));
    this.capabilities = {
      rowNormalization: true,
      portalExtraction: Boolean(options.portalExtraction),
      domainClassification: true,
      ruleExtraction: true,
      ...options.capabilities
    };
  }

  detectPortal() {
    return false;
  }

  async extractCatalogTree(domPayload = {}, context = {}) {
    const payload = domPayload && typeof domPayload === 'object' ? domPayload : {};
    const entries = _buildNormalizedTreeEntries(this, payload.entries, payload.tables, context);
    const rules = this.extractNormalizedCatalogRules(
      entries,
      payload.fullText || '',
      payload.networkRules || payload.networkSniffedRules || [],
      context.pillar || null
    );
    return {
      vendor: this.vendor,
      supportedPillars: this.supportedPillars,
      solutionDomain: rules.domainPillar,
      entries,
      skusCount: entries.reduce((sum, e) => sum + e.skus.length, 0),
      rules
    };
  }

  classifySolutionDomain(rawEntry = {}, context = {}) {
    const category = String(rawEntry.parentCategory || rawEntry.category || '').trim();
    const subCategory = String(rawEntry.subCategory || '').trim();
    const description = String(rawEntry.description || rawEntry.Description || rawEntry.desc || rawEntry.rule || '').trim();
    const componentRole = rawEntry.componentRole || rawEntry['Component Role'] || classifyComponentRole(`${category} ${subCategory}`.trim(), description);
    const combinedText = `${category} ${subCategory} ${description}`.trim();

    const explicit = rawEntry.domainPillar || rawEntry.pillar || rawEntry.solutionDomain;
    const contextDomain = _resolveContextDomain(context);
    const textDomain = _detectTextDomain(combinedText);
    const roleDomain = _detectRoleDomain(componentRole);

    let domainPillar = 'Server';
    let matchedBy = 'default';
    if (explicit) {
      domainPillar = normalizeSolutionPillar(String(explicit), 'Server');
      matchedBy = 'explicit_entry_pillar';
    } else if (textDomain) {
      domainPillar = textDomain;
      matchedBy = 'text_signature';
    } else if (roleDomain) {
      domainPillar = roleDomain;
      matchedBy = 'component_role';
    } else if (contextDomain) {
      domainPillar = contextDomain;
      matchedBy = 'context_pillar';
    }

    return {
      domainPillar,
      componentRole,
      solutionDomain: contextDomain || domainPillar,
      family: context.family || _detectFamilySafe(combinedText) || 'General',
      matchedBy
    };
  }

  _collectNetworkRules(networkRules, defaultDomain, seen, structuredRules) {
    for (const nr of Array.isArray(networkRules) ? networkRules : []) {
      const text = String(nr?.rule || nr?.ineligibilityReason || nr?.message || '').trim();
      if (!text) continue;
      const cls = this.classifySolutionDomain(nr, { pillar: defaultDomain });
      const ruleObj = _buildStructuredRule({
        vendor: this.vendor,
        domainPillar: cls.domainPillar,
        componentRole: cls.componentRole,
        ruleType: nr.ruleType || _classifyRuleType(text, 'DYNAMIC_RULE'),
        parentCategory: nr.parentCategory || 'Network Rule',
        subCategory: nr.subCategory || '',
        ruleText: text,
        affectedSkus: nr.affectedSkus,
        requiredSkus: nr.requiredSkus,
        excludedSkus: nr.excludedSkus,
        minQty: nr.minQty,
        maxQty: nr.maxQty,
        source: 'network'
      });
      const key = `${ruleObj.domainPillar}|${ruleObj.ruleType}|${ruleObj.rule}`;
      if (!seen.has(key)) { seen.add(key); structuredRules.push(ruleObj); }
    }
  }

  _collectEntryRules(rawEntries, defaultDomain, seen, structuredRules) {
    for (const entry of Array.isArray(rawEntries) ? rawEntries : []) {
      const cls = this.classifySolutionDomain(entry, { pillar: defaultDomain });
      const entryTexts = [...(Array.isArray(entry.rules) ? entry.rules : [])];
      if (entry.constraint || entry.constraintText) entryTexts.push(entry.constraint || entry.constraintText);
      for (const skuRow of Array.isArray(entry.skus) ? entry.skus : []) {
        const skuConstraint = skuRow['Constraint Text'] || skuRow['Table Rule/Note'] || skuRow.constraint || '';
        if (skuConstraint) entryTexts.push(`${skuRow.sku || skuRow['Product #'] || ''}: ${skuConstraint}`);
      }
      for (const item of entryTexts) {
        const text = typeof item === 'string' ? item.trim() : String(item?.rule || item?.text || '').trim();
        if (!text) continue;
        const ruleObj = _buildStructuredRule({
          vendor: this.vendor,
          domainPillar: cls.domainPillar,
          componentRole: cls.componentRole,
          ruleType: typeof item === 'object' && item?.ruleType ? item.ruleType : _classifyRuleType(text),
          parentCategory: entry.parentCategory || entry.category || 'Hardware Options',
          subCategory: entry.subCategory || '',
          ruleText: text,
          minQty: entry.minQty,
          maxQty: entry.maxQty,
          source: 'dom_entry'
        });
        const key = `${ruleObj.domainPillar}|${ruleObj.ruleType}|${ruleObj.rule}`;
        if (!seen.has(key)) { seen.add(key); structuredRules.push(ruleObj); }
      }
    }
  }

  _collectTextRules(fullText, defaultDomain, seen, structuredRules) {
    if (typeof fullText !== 'string' || !fullText.trim()) return;
    const rulePattern = /\b(?:requires|prerequisite|must\s+select|mutually\s+exclusive|incompatible|cannot\s+be\s+combined|min\s+\d+|max\s+\d+|up\s+to\s+\d+|ambient\s+temp)\b/i;
    const lines = fullText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length >= 6 && rulePattern.test(l)).slice(0, 100);
    for (const line of lines) {
      const cls = this.classifySolutionDomain({ description: line }, { pillar: defaultDomain });
      const ruleObj = _buildStructuredRule({
        vendor: this.vendor,
        domainPillar: cls.domainPillar,
        componentRole: cls.componentRole,
        ruleType: _classifyRuleType(line),
        parentCategory: 'Portal Notes',
        subCategory: '',
        ruleText: line,
        source: 'full_text'
      });
      const key = `${ruleObj.domainPillar}|${ruleObj.ruleType}|${ruleObj.rule}`;
      if (!seen.has(key)) { seen.add(key); structuredRules.push(ruleObj); }
    }
  }

  extractNormalizedCatalogRules(rawEntries = [], fullText = '', networkRules = [], domain = null) {
    const resolvedDomain = domain ? normalizeSolutionPillar(domain) : 'Server';
    const structuredRules = [];
    const seen = new Set();

    this._collectNetworkRules(networkRules, resolvedDomain, seen, structuredRules);
    this._collectEntryRules(rawEntries, resolvedDomain, seen, structuredRules);
    this._collectTextRules(fullText, resolvedDomain, seen, structuredRules);

    const rulesByDomain = { Server: [], Storage: [], Networking: [], Composite: [] };
    for (const rule of structuredRules) {
      const bucket = rulesByDomain[rule.domainPillar] || rulesByDomain.Server;
      bucket.push(rule);
    }

    return {
      vendor: this.vendor,
      domainPillar: resolvedDomain,
      componentRole: _dominantRole(structuredRules),
      totalRules: structuredRules.length,
      structuredRules,
      rulesByDomain
    };
  }

  normalizeRawCatalogRow(rawRow = {}, context = {}) {
    const sku = cleanBaseSKU(rawRow.sku || rawRow.partNumber || rawRow['Product #'] || '');
    const description = String(rawRow.description || rawRow.Description || rawRow.desc || '').trim();
    const parentCategory = String(rawRow.category || rawRow.parentCategory || 'Hardware Options').trim();
    const rawPrice = rawRow.price ?? rawRow.listPrice ?? rawRow['Unit Price (USD)'] ?? rawRow['List Price (USD)'] ?? 0;
    const parsedPrice = Number(String(rawPrice).replace(/[^0-9.-]/g, '')) || 0;
    const cls = this.classifySolutionDomain({ ...rawRow, parentCategory, description }, context);

    return {
      vendor: this.vendor,
      sku,
      description,
      listPriceUsd: parsedPrice,
      parentCategory,
      componentRole: cls.componentRole,
      domainPillar: cls.domainPillar
    };
  }
}

class HpeOcaAdapter extends BaseVendorScraperAdapter {
  constructor() {
    super('HPE', { supportedPillars: ['Server', 'Storage', 'Networking', 'Composite'] });
  }

  detectPortal(url = '', html = '') {
    return /partner\.hpe\.com|oca\.ext\.hpe\.com|weblogic/i.test(url) || /ocaBodyTextSnapshot|one\s*config\s*advanced/i.test(html);
  }

  normalizeRawCatalogRow(rawRow, context = {}) {
    const norm = super.normalizeRawCatalogRow(rawRow, context);
    norm.vendor = 'HPE';
    norm.isFioOption = /\bfio\b/i.test(norm.description);
    norm.isBtoOption = /\bbto\b/i.test(norm.description);
    return norm;
  }
}

class DellPremierAdapter extends BaseVendorScraperAdapter {
  constructor() {
    super('Dell', { supportedPillars: ['Server', 'Storage', 'Networking'] });
  }

  detectPortal(url = '', html = '') {
    return /dell\.com|premier\.dell\.com|dsa\.dell\.com/i.test(url) || /poweredge|idrac|percc|powerstore/i.test(html);
  }

  normalizeRawCatalogRow(rawRow, context = {}) {
    const norm = super.normalizeRawCatalogRow(rawRow, context);
    norm.vendor = 'Dell';
    return norm;
  }
}

class CiscoCcwAdapter extends BaseVendorScraperAdapter {
  constructor() {
    super('Cisco', { supportedPillars: ['Server', 'Storage', 'Networking'] });
  }

  detectPortal(url = '', html = '') {
    return /cisco\.com|apps\.cisco\.com\/(?:ccw|Commerce)/i.test(url) || /cisco\s*commerce|intersight/i.test(html);
  }

  normalizeRawCatalogRow(rawRow, context = {}) {
    const norm = super.normalizeRawCatalogRow(rawRow, context);
    norm.vendor = 'Cisco';
    return norm;
  }
}

class LenovoDcscAdapter extends BaseVendorScraperAdapter {
  constructor() {
    super('Lenovo', { supportedPillars: ['Server', 'Storage', 'Networking'] });
  }

  detectPortal(url = '', html = '') {
    return /dcsc\.lenovo\.com|lenovo\.com\/.*config/i.test(url) || /thinksystem|thinkagile|xclarity|dcsc/i.test(html);
  }

  normalizeRawCatalogRow(rawRow = {}, context = {}) {
    const enrichedRow = {
      ...rawRow,
      sku: rawRow.sku || rawRow.featureCode || rawRow.mtm || rawRow.partNumber || rawRow['Feature Code'] || ''
    };
    const norm = super.normalizeRawCatalogRow(enrichedRow, context);
    norm.vendor = 'Lenovo';
    norm.isCtoBase = /\bcto\b/i.test(norm.description) || /^7[A-Z0-9]{3}CTO/i.test(norm.sku);
    return norm;
  }
}

const DEFAULT_COLUMN_ALIASES = Object.freeze({
  sku: ['sku', 'partNumber', 'Product #', 'Part Number', 'Option ID', 'Feature Code', 'PID', 'MTM'],
  description: ['description', 'Description', 'desc', 'name', 'Title', 'Option Name', 'Component Name'],
  price: ['price', 'listPrice', 'Unit Price (USD)', 'List Price (USD)', 'List Price', 'Unit Price'],
  category: ['parentCategory', 'category', 'Category', 'Group', 'Main Category'],
  subCategory: ['subCategory', 'subcategory', 'Sub-Category', 'Subcategory'],
  constraint: ['constraint', 'Constraint Text', 'rules', 'Compatibility', 'Notes', 'Requirement'],
  qty: ['qty', 'quantity', 'Current Qty', 'Qty']
});

function _lookupByAliases(row = {}, aliases = []) {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    if (row[alias] !== undefined && row[alias] !== null && String(row[alias]).trim() !== '') {
      return row[alias];
    }
    const lowerAlias = String(alias).toLowerCase();
    const matchedKey = keys.find(k => k.toLowerCase() === lowerAlias);
    if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null && String(row[matchedKey]).trim() !== '') {
      return row[matchedKey];
    }
  }
  return undefined;
}

function _matchesPatternList(value = '', patterns = []) {
  const text = String(value || '');
  if (!text) return false;
  return patterns.some(pat => (pat instanceof RegExp ? pat.test(text) : text.toLowerCase().includes(String(pat).toLowerCase())));
}

class ConfigurablePortalDomAdapter extends BaseVendorScraperAdapter {
  constructor(vendorNameOrSpec, maybeSpec = {}) {
    const isSpecOnly = typeof vendorNameOrSpec === 'object' && vendorNameOrSpec !== null;
    const spec = isSpecOnly ? vendorNameOrSpec : (maybeSpec || {});
    const vendorName = isSpecOnly ? (spec.vendor || 'Custom') : String(vendorNameOrSpec || spec.vendor || 'Custom');
    super(vendorName, {
      adapterType: spec.adapterType || 'CONFIGURABLE_DOM',
      supportedPillars: spec.supportedPillars || ['Server', 'Storage', 'Networking'],
      portalExtraction: Boolean(spec.selectors?.tableSelector || spec.tableSelectors?.tableSelector || (spec.urlPatterns || []).length > 0 || spec.portalUrl),
      capabilities: spec.capabilities
    });
    this.adapterType = spec.adapterType || 'CONFIGURABLE_DOM';
    this.portalUrl = spec.portalUrl || spec.anchorTabUrl || '';
    this.urlPatterns = Array.isArray(spec.urlPatterns) && spec.urlPatterns.length > 0
      ? [...spec.urlPatterns]
      : (this.portalUrl ? [this.portalUrl] : []);
    this.htmlPatterns = Array.isArray(spec.htmlPatterns) ? [...spec.htmlPatterns] : [];
    this.selectors = {
      ...spec.loginSelectors,
      ...spec.navigationSelectors,
      ...spec.tableSelectors,
      ...spec.ruleSelectors,
      ...spec.selectors
    };
    this.columnAliases = {
      sku: [...(spec.columnAliases?.sku || []), ...DEFAULT_COLUMN_ALIASES.sku],
      description: [...(spec.columnAliases?.description || []), ...DEFAULT_COLUMN_ALIASES.description],
      price: [...(spec.columnAliases?.price || []), ...DEFAULT_COLUMN_ALIASES.price],
      category: [...(spec.columnAliases?.category || []), ...DEFAULT_COLUMN_ALIASES.category],
      subCategory: [...(spec.columnAliases?.subCategory || []), ...DEFAULT_COLUMN_ALIASES.subCategory],
      constraint: [...(spec.columnAliases?.constraint || []), ...DEFAULT_COLUMN_ALIASES.constraint],
      qty: [...(spec.columnAliases?.qty || []), ...DEFAULT_COLUMN_ALIASES.qty]
    };
    this.ruleExtraction = spec.ruleExtraction || {};
    this.domainOverrides = spec.domainOverrides || {};
  }

  detectPortal(url = '', html = '') {
    return _matchesPatternList(url, this.urlPatterns) || _matchesPatternList(html, this.htmlPatterns);
  }

  classifySolutionDomain(rawEntry = {}, context = {}) {
    const text = `${rawEntry.parentCategory || rawEntry.category || ''} ${rawEntry.subCategory || ''} ${rawEntry.description || rawEntry.Description || ''}`.toLowerCase();
    for (const [keyword, domain] of Object.entries(this.domainOverrides)) {
      if (keyword && text.includes(String(keyword).toLowerCase())) {
        const componentRole = rawEntry.componentRole || classifyComponentRole(rawEntry.category || rawEntry.parentCategory || '', rawEntry.description || '');
        return {
          domainPillar: normalizeSolutionPillar(domain, 'Server'),
          componentRole,
          solutionDomain: normalizeSolutionPillar(context.pillar || domain, 'Server'),
          family: context.family || this.vendor,
          matchedBy: 'adapter_domain_override'
        };
      }
    }
    return super.classifySolutionDomain(rawEntry, context);
  }

  normalizeRawCatalogRow(rawRow = {}, context = {}) {
    const mappedRow = {
      ...rawRow,
      sku: _lookupByAliases(rawRow, this.columnAliases.sku) ?? rawRow.sku ?? '',
      description: _lookupByAliases(rawRow, this.columnAliases.description) ?? rawRow.description ?? '',
      price: _lookupByAliases(rawRow, this.columnAliases.price) ?? rawRow.price ?? 0,
      category: _lookupByAliases(rawRow, this.columnAliases.category) ?? rawRow.category ?? 'Hardware Options',
      subCategory: _lookupByAliases(rawRow, this.columnAliases.subCategory) ?? rawRow.subCategory ?? '',
      constraint: _lookupByAliases(rawRow, this.columnAliases.constraint) ?? rawRow.constraint ?? ''
    };
    const norm = super.normalizeRawCatalogRow(mappedRow, context);
    if (mappedRow.subCategory) norm.subCategory = String(mappedRow.subCategory).trim();
    if (mappedRow.constraint) norm.constraint = String(mappedRow.constraint).trim();
    return norm;
  }

  extractNormalizedCatalogRules(rawEntries = [], fullText = '', networkRules = [], domain = null) {
    const result = super.extractNormalizedCatalogRules(rawEntries, fullText, networkRules, domain);
    const customPatterns = Array.isArray(this.ruleExtraction.rulePatterns) ? this.ruleExtraction.rulePatterns : [];
    if (customPatterns.length > 0 && typeof fullText === 'string' && fullText.trim()) {
      const seen = new Set(result.structuredRules.map(r => `${r.domainPillar}|${r.ruleType}|${r.rule}`));
      for (const line of fullText.split(/\r?\n/).map(l => l.trim()).filter(Boolean)) {
        if (!_matchesPatternList(line, customPatterns)) continue;
        const cls = this.classifySolutionDomain({ description: line }, { pillar: result.domainPillar });
        const ruleObj = _buildStructuredRule({
          vendor: this.vendor,
          domainPillar: cls.domainPillar,
          componentRole: cls.componentRole,
          ruleType: _classifyRuleType(line),
          parentCategory: 'Adapter Custom Rules',
          subCategory: '',
          ruleText: line,
          source: 'custom_pattern'
        });
        const key = `${ruleObj.domainPillar}|${ruleObj.ruleType}|${ruleObj.rule}`;
        if (!seen.has(key)) {
          seen.add(key);
          result.structuredRules.push(ruleObj);
          (result.rulesByDomain[ruleObj.domainPillar] || result.rulesByDomain.Server).push(ruleObj);
        }
      }
      result.totalRules = result.structuredRules.length;
    }
    return result;
  }

  async extractCatalogTree(domPayload = {}, context = {}) {
    const baseTree = await super.extractCatalogTree(domPayload, context);
    return {
      ...baseTree,
      adapterType: 'CONFIGURABLE_DOM',
      portalUrl: this.portalUrl || null,
      selectors: this.selectors,
      domExtractionPlan: this.getDomExtractionPlan()
    };
  }

  getDomExtractionPlan() {
    return {
      vendor: this.vendor,
      portalUrl: this.portalUrl,
      urlPatterns: this.urlPatterns,
      supportedPillars: this.supportedPillars,
      selectors: this.selectors,
      columnAliases: this.columnAliases,
      ruleExtraction: this.ruleExtraction
    };
  }
}

class GenericSpreadsheetAdapter extends BaseVendorScraperAdapter {
  constructor() {
    super('Generic');
  }

  detectPortal() {
    return true;
  }
}

const BUILTIN_ADAPTERS = [
  new HpeOcaAdapter(),
  new DellPremierAdapter(),
  new CiscoCcwAdapter(),
  new LenovoDcscAdapter(),
  new GenericSpreadsheetAdapter()
];

const _customAdapters = new Map();

function registerVendorScraperAdapter(vendorName, adapterClassOrSpec) {
  if (!vendorName || typeof vendorName !== 'string' || !vendorName.trim()) {
    throw new Error('CUSTOM_SCRAPER_ADAPTER_INVALID: vendorName must be a non-empty string');
  }
  const cleanName = vendorName.trim();
  const key = cleanName.toLowerCase();
  let adapterInstance;
  if (typeof adapterClassOrSpec === 'function') {
    adapterInstance = new adapterClassOrSpec(cleanName);
  } else if (adapterClassOrSpec instanceof BaseVendorScraperAdapter) {
    adapterInstance = adapterClassOrSpec;
  } else if (adapterClassOrSpec && typeof adapterClassOrSpec === 'object') {
    adapterInstance = new ConfigurablePortalDomAdapter(cleanName, adapterClassOrSpec);
  } else {
    throw new Error('CUSTOM_SCRAPER_ADAPTER_INVALID: adapterClassOrSpec must be a class, adapter instance, or spec object');
  }
  _customAdapters.set(key, adapterInstance);
  return adapterInstance;
}

function unregisterVendorScraperAdapter(vendorName) {
  if (!vendorName || typeof vendorName !== 'string') return false;
  return _customAdapters.delete(vendorName.trim().toLowerCase());
}

function clearCustomScraperAdapters() {
  _customAdapters.clear();
}

function getVendorAdapter(vendorOrQuery = 'HPE', options = {}) {
  const key = String(vendorOrQuery || '').trim().toLowerCase();
  if (key && _customAdapters.has(key)) {
    return _customAdapters.get(key);
  }
  const builtinMatch = BUILTIN_ADAPTERS.find(a => a.vendor.toLowerCase() === key);
  if (builtinMatch) return builtinMatch;
  if (options.portalUrl) {
    const portalMatch = getScraperAdapterForPortal(options.portalUrl, options.html || '');
    if (portalMatch && portalMatch.vendor !== 'Generic') return portalMatch;
  }
  return options.fallback ? new GenericSpreadsheetAdapter() : null;
}

function getScraperAdapterForPortal(url = '', html = '') {
  for (const adapter of _customAdapters.values()) {
    if (adapter.detectPortal(url, html)) return adapter;
  }
  for (const adapter of BUILTIN_ADAPTERS) {
    if (adapter.detectPortal(url, html)) return adapter;
  }
  return new GenericSpreadsheetAdapter();
}

function listRegisteredVendorAdapters() {
  const result = [];
  const seen = new Set();
  for (const adapter of _customAdapters.values()) {
    seen.add(adapter.vendor.toLowerCase());
    result.push({
      vendor: adapter.vendor,
      adapterName: adapter.constructor?.name || 'CustomAdapter',
      isCustom: true,
      supportedPillars: adapter.supportedPillars,
      capabilities: adapter.capabilities
    });
  }
  for (const adapter of BUILTIN_ADAPTERS) {
    if (seen.has(adapter.vendor.toLowerCase())) continue;
    result.push({
      vendor: adapter.vendor,
      adapterName: adapter.constructor?.name || 'BuiltinAdapter',
      isCustom: false,
      supportedPillars: adapter.supportedPillars,
      capabilities: adapter.capabilities
    });
  }
  return result;
}

module.exports = {
  BaseVendorScraperAdapter,
  HpeOcaAdapter,
  DellPremierAdapter,
  CiscoCcwAdapter,
  LenovoDcscAdapter,
  ConfigurablePortalDomAdapter,
  GenericSpreadsheetAdapter,
  registerVendorScraperAdapter,
  unregisterVendorScraperAdapter,
  clearCustomScraperAdapters,
  getVendorAdapter,
  getScraperAdapterForPortal,
  listRegisteredVendorAdapters
};
