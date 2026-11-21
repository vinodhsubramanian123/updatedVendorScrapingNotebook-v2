'use strict';
/**
 * scripts/lib/catalog_discovery.js — Catalog Discovery & Portfolio Listing API
 *
 * Provides reusable functions for enumerating scraped catalogs, reading catalog details,
 * collecting KnowledgeDeltas, and checking CDP health. Extracted from observability_status.js
 * to support programmatic access from dashboard server.js and --json CLI modes.
 */

const fs     = require('fs');
const path   = require('path');
const http   = require('http');
const crypto = require('crypto');
const { cleanBaseSKU } = require('./sku.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const OUTPUTS_ROOT = path.join(PROJECT_ROOT, 'outputs');

// ── Cache for Chassis Map ───────────────────────────────────────────────────
let _chassisMapCache = null;

function invalidateChassisMapCache() {
  _chassisMapCache = null;
}

function _resolveDefaultUHeight(info) {
  if (Number.isFinite(info?.uHeight)) return info.uHeight;
  const m = `${info?.model || ''} ${info?.id || ''} ${info?.formFactor || ''}`.toLowerCase();
  if (/blade|compute module|interconnect|management|fc switch/i.test(m)) return 0;
  if (/dl380a|dl384|dl580|4u|8dw/i.test(m)) return 4;
  if (/msl3040|3u/i.test(m)) return 3;
  if (/dl360|1u|sn3600b|switch/i.test(m)) return 1;
  if (/gx5000|42u/i.test(m)) return 42;
  if (/alletra/i.test(m)) return 4;
  return 2;
}

const SKIP_CHASSIS_MAP_SECTIONS = new Set([
  'chassis_base_skus',
  'chassis_base_skus_by_family_gen',
  'portfolio_products',
  'form_factor_duals',
  'product_bundle_compositions',
  'storage_role_catalog',
  'kit_routing'
]);

function _ingestNotebookEntriesIntoMap(aggregated) {
  const nbPath = path.join(__dirname, '..', '..', 'config', 'notebooks.json');
  if (!fs.existsSync(nbPath)) return;
  try {
    const nbJson = JSON.parse(fs.readFileSync(nbPath, 'utf8'));
    for (const [id, nb] of Object.entries(nbJson.notebooks || {})) {
      if (aggregated[id]) {
        if (!aggregated[id].baseSku && nb.baseSku) aggregated[id].baseSku = nb.baseSku;
        continue;
      }
      aggregated[id] = {
        family: nb.family || 'ProLiant',
        gen: nb.gen || 'General',
        formFactor: nb.formFactor || 'Rack',
        uHeight: _resolveDefaultUHeight({ id, family: nb.family, formFactor: nb.formFactor }),
        baseSku: nb.baseSku || null,
        model: id.replace(/_/g, ' ')
      };
    }
  } catch { /* ignore invalid notebooks.json */ }
}

function _loadChassisMapJson() {
  const mapPath = path.join(__dirname, '..', '..', 'config', 'chassis_map.json');
  if (!fs.existsSync(mapPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  } catch (err) {
    try { require('../system/pipeline_logger.js').warn('CATALOG_DISCOVERY', 'Failed to parse chassis_map.json', err); } catch { /* ignore */ }
    return {};
  }
}

function _ingestConfiguredChassisSections(loaded, aggregated) {
  for (const [id, v] of Object.entries(loaded.portfolio_products || {})) {
    aggregated[id] = { ...v, id, uHeight: _resolveDefaultUHeight({ id, ...v }), model: v.model || id.replace(/_/g, ' ') };
  }
  for (const group of Object.values(loaded.chassis_base_skus_by_family_gen || {})) {
    const pid = group?.catalogProductId;
    const firstSku = Object.keys(group?.skus || {})[0] || null;
    if (pid && !aggregated[pid]) {
      aggregated[pid] = {
        family: group.family || 'ProLiant',
        gen: group.gen || 'General',
        formFactor: group.skus?.[firstSku]?.formFactor || 'Rack',
        uHeight: _resolveDefaultUHeight({ id: pid, model: group.modelFamily }),
        baseSku: firstSku,
        model: group.modelFamily || pid.replace(/_/g, ' ')
      };
    }
  }
  for (const [sku, v] of Object.entries(loaded.chassis_base_skus || {})) {
    aggregated[sku] = { ...v, uHeight: _resolveDefaultUHeight(v), baseSku: sku, model: v.model || sku };
  }
}

function getChassisMap() {
  if (_chassisMapCache) return _chassisMapCache;
  const loaded = _loadChassisMapJson();
  const aggregated = {};
  _ingestConfiguredChassisSections(loaded, aggregated);
  for (const [k, v] of Object.entries(loaded)) {
    if (SKIP_CHASSIS_MAP_SECTIONS.has(k) || k.includes('kit')) continue;
    if (typeof v === 'string') {
      aggregated[k] = { model: v, family: 'ProLiant', gen: 'Gen12', formFactor: 'Rack', uHeight: _resolveDefaultUHeight({ model: v }), baseSku: k };
    } else if (typeof v === 'object' && v !== null) {
      aggregated[k] = { ...v, uHeight: _resolveDefaultUHeight(v), baseSku: v.baseSku || k, model: v.model || k };
    }
  }
  _ingestNotebookEntriesIntoMap(aggregated);
  _chassisMapCache = aggregated;
  return _chassisMapCache;
}

function _buildDynamicPlatformMatchers(chassisMap) {
  const matchers = [];
  for (const [id, info] of Object.entries(chassisMap)) {
    if (!id.includes('_') && (!Array.isArray(info?.aliases) || info.aliases.length === 0)) continue;
    const aliases = Array.isArray(info?.aliases) && info.aliases.length > 0
      ? info.aliases
      : [id.replace(/_/g, '\\s+').replace(/([a-z])(\d)/gi, '$1\\s*$2')];
    const excludeList = Array.isArray(info?.excludeAliases) && info.excludeAliases.length > 0
      ? new RegExp(info.excludeAliases.join('|'), 'i')
      : null;
    const specificity = (/gen\s*\d/i.test(id) ? 20 : 0) + (id.includes('a_') ? 10 : 0) + (excludeList ? 5 : 0) + id.length;
    matchers.push({
      id,
      specificity,
      pattern: new RegExp(aliases.join('|'), 'i'),
      exclude: excludeList
    });
  }
  return matchers.sort((a, b) => b.specificity - a.specificity);
}

function _matchPlatformDescription(desc, chassisMap, dynamicMatchers) {
  const explicitPlatform = desc.match(/\b(dl\s*\d{3}[a-z]?)\s*(?:gen|g)\s*(\d+)\b/i);
  if (explicitPlatform) {
    const id = `${explicitPlatform[1].replace(/\s/g, '').toUpperCase().replace(/A$/, 'a')}_Gen${explicitPlatform[2]}`;
    if (chassisMap[id]) return { ...chassisMap[id], id };
    return { unknown: true, requiresUserConfirmation: true, id, model: id, family: 'ProLiant', gen: `Gen${explicitPlatform[2]}`, reason: 'Explicit product generation has no mapped catalog' };
  }
  for (const matcher of dynamicMatchers) {
    if (matcher.pattern.test(desc) && (!matcher.exclude || !matcher.exclude.test(desc))) {
      if (chassisMap[matcher.id]) return { ...chassisMap[matcher.id], id: matcher.id };
    }
  }
  return null;
}

/**
 * Detect chassis variant and generation from raw BOQ items or override.
 * @param {Array<object>} items - Parsed BOQ items
 * @param {string} overrideVariant - Optional CLI override
 * @returns {object} Chassis information metadata
 */
function detectChassisVariant(items, overrideVariant = '') {
  const chassisMap = getChassisMap();

  if (overrideVariant) {
    if (chassisMap[overrideVariant]) {
      return { ...chassisMap[overrideVariant], id: overrideVariant };
    }
    const found = Object.values(chassisMap).find(c =>
      (c.formFactor && c.formFactor.toLowerCase() === overrideVariant.toLowerCase()) ||
      (c.model && c.model.toLowerCase().includes(overrideVariant.toLowerCase()))
    );
    if (found) {
      return { ...found, id: overrideVariant, formFactor: overrideVariant };
    }
    // Dynamic metadata detection for unknown overrides
    try {
      const { parseProductMeta } = require('./product_meta.js');
      const meta = parseProductMeta(overrideVariant);
      return {
        family: meta.family || 'ProLiant',
        gen: meta.gen || 'General',
        formFactor: overrideVariant,
        model: overrideVariant,
        id: overrideVariant
      };
    } catch {
      return { family: 'ProLiant', gen: 'General', formFactor: overrideVariant, model: overrideVariant, id: overrideVariant };
    }
  }

  // Scan items for direct base chassis SKU match
  for (const it of (items || [])) {
    const clean = cleanBaseSKU(it.sku);
    if (chassisMap[clean]) {
      return { ...chassisMap[clean], id: clean };
    }
    for (const [id, info] of Object.entries(chassisMap)) {
      if (clean === info.baseSku || (it.description && it.description.toLowerCase().includes(id.toLowerCase()))) {
        return { ...info, id };
      }
    }
  }

  const dynamicMatchers = _buildDynamicPlatformMatchers(chassisMap);
  for (const it of (items || [])) {
    const desc = (it.description || '').toLowerCase();
    const matched = _matchPlatformDescription(desc, chassisMap, dynamicMatchers);
    if (matched) return matched;
  }

  // If no chassis can be identified, trigger Human-in-the-Loop confirmation instead of silent Gen12 assumption
  return {
    unknown: true,
    requiresUserConfirmation: true,
    confidenceScore: 0.0,
    family: 'Unknown',
    gen: 'Unknown',
    formFactor: 'Unknown',
    model: 'Unknown Chassis Variant',
    id: 'UNKNOWN',
    baseSku: 'UNKNOWN'
  };
}

/**
 * Check if CDP port 9222 is alive and return list of open page targets.
 * @param {number} port
 * @returns {Promise<{ ok: boolean, pages: Array<object> }>}
 */
function checkCdpHealth(port = 9222) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/json`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const targets = JSON.parse(data);
          const pages = targets.filter(t => t.type === 'page');
          const ocaPage = pages.find(p => (p.url || '').includes('oca.ext.hpe.com'));
          resolve({ ok: true, pages, hasActiveOca: !!ocaPage });
        } catch (e) { console.warn('Caught suppressed error in catalog_discovery.js:', e);
resolve({ ok: false, pages: [], hasActiveOca: false });
        }
      });
    });
    req.on('error', () => resolve({ ok: false, pages: [], hasActiveOca: false }));
    req.setTimeout(1500, () => { req.destroy(); resolve({ ok: false, pages: [], hasActiveOca: false }); });
  });
}

const IGNORED_DISCOVERY_DIRS = new Set(['history', 'temp', 'node_modules', '.git', 'test_payloads', 'test_portal_stress', 'test_reconciliation', 'test_tenders', 'split_clusters']);

function isIgnoredDiscoveryPath(file, filePath) {
  if (file.startsWith('.')) return true;
  if (IGNORED_DISCOVERY_DIRS.has(file)) return true;
  if (file.startsWith('failed_staging') || file.startsWith('staging_')) return true;
  if (file.endsWith('.tmp') || file.endsWith('.bak') || file.includes('.tmp')) return true;
  if (filePath && (filePath.includes(`${path.sep}temp${path.sep}`) || filePath.endsWith(`${path.sep}temp`))) return true;
  if (filePath && (filePath.includes(`${path.sep}history${path.sep}`) || filePath.endsWith(`${path.sep}history`))) return true;
  return false;
}

/**
 * Recursively find all *_Catalog.json files under a directory.
 * @param {string} dir
 * @returns {Array<string>} Absolute paths to catalog JSON files
 */
function findCatalogJsonFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;

  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    if (isIgnoredDiscoveryPath(file, filePath)) return;
    try {
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(findCatalogJsonFiles(filePath));
      } else if (file.endsWith('_Catalog.json') && !filePath.includes('raw_data')) {
        results.push(filePath);
      }
    } catch (e) {
      if (e && e.code !== 'ENOENT') {
        const _logger = require('../system/pipeline_logger.js');
        _logger.warn('ERROR', 'catalog_discovery.js', e);
      }
    }
  });

  return results;
}

/**
 * List all available catalogs with summary metadata.
 * @param {string} outputsRoot Optional override for outputs directory
 * @returns {Array<object>} Array of catalog summary objects
 */
function _loadNotebooksOfficialCounts() {
  try {
    const nbPath = path.join(PROJECT_ROOT, 'scripts', 'config', 'notebooks.json');
    if (!fs.existsSync(nbPath)) return {};
    const nb = JSON.parse(fs.readFileSync(nbPath, 'utf8')).notebooks || {};
    const map = {};
    for (const [key, val] of Object.entries(nb)) {
      map[key] = Array.isArray(val?.officialSourceIds) ? val.officialSourceIds.length : 0;
    }
    return map;
  } catch {
    return {};
  }
}

function _resolveLocalPdfInfo(dir, fileBase) {
  let pdfPath = path.join(dir, `HPE_${fileBase}_QuickSpecs.pdf`);
  if (!fs.existsSync(pdfPath)) {
    const pdfs = fs.readdirSync(dir).filter(f => f.endsWith('.pdf'));
    pdfPath = pdfs.length > 0 ? path.join(dir, pdfs[0]) : null;
  }
  if (!pdfPath || !fs.existsSync(pdfPath)) return null;
  const pStat = fs.statSync(pdfPath);
  const md5 = crypto.createHash('md5').update(fs.readFileSync(pdfPath)).digest('hex').substring(0, 8);
  return {
    path: pdfPath,
    sizeMb: parseFloat((pStat.size / 1024 / 1024).toFixed(2)),
    md5Prefix: md5
  };
}

/**
 * List all available catalogs with summary metadata.
 * @param {string} outputsRoot Optional override for outputs directory
 * @returns {Array<object>} Array of catalog summary objects
 */
function listAllCatalogs(outputsRoot = OUTPUTS_ROOT) {
  const catalogJsons = findCatalogJsonFiles(outputsRoot);
  const officialCounts = _loadNotebooksOfficialCounts();
  const catalogs = [];

  catalogJsons.sort().forEach(jsonPath => {
    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      const meta = data.metadata || {};
      const dir  = path.dirname(jsonPath);
      const fileBase = path.basename(jsonPath, '_Catalog.json');
      const xlsxPath = path.join(dir, `${fileBase}_OCA_Catalog.xlsx`);
      const pdfInfo = _resolveLocalPdfInfo(dir, fileBase);
      const historyDir = path.join(dir, 'history');
      const hasDiffHistory = fs.existsSync(historyDir) &&
        fs.readdirSync(historyDir).some(f => f.startsWith('catalog_') && f.endsWith('.json'));

      catalogs.push({
        id: fileBase,
        chassis: meta.chassis || fileBase,
        skuCount: meta.totalUniqueSKUs || 0,
        totalSubcategories: meta.totalSubcategories || 0,
        totalTables: meta.totalTables || 0,
        scrapeDate: meta.scrapeDate || null,
        catalogJsonPath: jsonPath,
        catalogDir: dir,
        relativeDir: path.relative(PROJECT_ROOT, dir),
        hasExcel: fs.existsSync(xlsxPath),
        xlsxPath: fs.existsSync(xlsxPath) ? xlsxPath : null,
        pdf: pdfInfo,
        cloudQuickSpecsCount: officialCounts[fileBase] || 0,
        hasDiffHistory
      });
    } catch (e) { const _logger = require('../system/pipeline_logger.js'); _logger.warn('ERROR', 'catalog_discovery.js', e); }
  });

  return catalogs;
}

/**
 * Read full catalog detail for a specific catalog JSON path.
 * @param {string} catalogJsonPath Absolute path to *_Catalog.json
 * @returns {object|null} Parsed catalog data or null
 */
function getCatalogDetail(catalogJsonPath) {
  if (!fs.existsSync(catalogJsonPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(catalogJsonPath, 'utf-8'));
  } catch (e) {
    const err = new Error(`DataCorruptionError: Failed to parse catalog at ${catalogJsonPath}: ${e.message}`);
    err.code = 'DATA_CORRUPTION';
    throw err;
  }
}

function _isIgnoredDeltaPath(file, filePath) {
  if (file.startsWith('.')) return true;
  if (IGNORED_DISCOVERY_DIRS.has(file) && file !== 'history') return true;
  if (file === 'skill_workflow_excellence') return true;
  if (file.startsWith('failed_staging') || file.startsWith('staging_')) return true;
  if (file.endsWith('.tmp') || file.endsWith('.bak') || file.includes('.tmp')) return true;
  return Boolean(filePath && (filePath.includes(`${path.sep}temp${path.sep}`) || filePath.endsWith(`${path.sep}temp`)));
}

/**
 * Recursively collect all KnowledgeDeltas from catalog_deltas.json files.
 * @param {string} dir Starting directory
 * @returns {Array<object>} All deltas
 */
function collectKnowledgeDeltas(dir = OUTPUTS_ROOT, _seenIds = new Set()) {
  let deltas = [];
  if (!fs.existsSync(dir)) return deltas;

  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    if (_isIgnoredDeltaPath(file, filePath)) return;
    try {
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        deltas = deltas.concat(collectKnowledgeDeltas(filePath, _seenIds));
      } else if (file === 'catalog_deltas.json') {
        try {
          const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              const id = item?.deltaId || item?.ruleId;
              if (!id || !_seenIds.has(id)) {
                if (id) _seenIds.add(id);
                deltas.push(item);
              }
            }
          }
        } catch (e) { const _logger = require('../system/pipeline_logger.js'); _logger.warn('ERROR', 'catalog_discovery.js', e); }
      }
    } catch (e) { const _logger = require('../system/pipeline_logger.js'); _logger.warn('ERROR', 'catalog_discovery.js', e); }
  });

  return deltas;
}

function _findCatalogByBaseSku(catalogs, baseSku) {
  if (!baseSku || baseSku === 'CUSTOM_OVERRIDE' || baseSku === 'UNKNOWN') {
    return null;
  }
  for (const cat of catalogs) {
    let containsBaseSku = false;
    try {
      const catalogData = JSON.parse(fs.readFileSync(cat.catalogJsonPath, 'utf8'));
      containsBaseSku = (catalogData.entries || []).some(entry => (entry.skus || []).some(skuData =>
        cleanBaseSKU(skuData['Product #'] || skuData.sku) === baseSku
      ));
    } catch { /* unreadable catalogs are ignored by discovery */ }
    if (containsBaseSku) {
      return cat.catalogDir;
    }
  }
  return null;
}

function _findCatalogByModel(catalogs, variant, modelClean) {
  const normalizedVariantModel = variant.model
    .replace(/\b\d+SFF\b/i, 'SFF')
    .replace(/\b\d+LFF\b/i, 'LFF')
    .replace(/\b\d+EDSFF\b/i, 'EDSFF')
    .replace(/\s+/g, '_')
    .replace(/HPE_?/i, '');

  for (const cat of catalogs) {
    if (cat.id === modelClean || cat.id === normalizedVariantModel || cat.chassis.includes(variant.model)) {
      return cat.catalogDir;
    }
  }
  return null;
}

function _findCatalogByFamilyGen(catalogs, variant, baseFormFactor) {
  if (!variant.family || !variant.gen) return null;

  for (const cat of catalogs) {
    const catPath = cat.catalogDir.toLowerCase();
    const famMatch = catPath.includes(variant.family.toLowerCase());
    const genMatch = catPath.includes(variant.gen.toLowerCase());
    const ffMatch = baseFormFactor && (catPath.includes(baseFormFactor.toLowerCase()) || cat.id.toLowerCase().includes(baseFormFactor.toLowerCase()));
    if (famMatch && genMatch && ffMatch) {
      return { matchType: 'FAMILY_GEN_FF_MATCH', catalogDir: cat.catalogDir, confidenceScore: 0.95, requiresUserConfirmation: false };
    }
  }

  const familyGenMatches = catalogs.filter(cat => {
    const catPath = cat.catalogDir.toLowerCase();
    return catPath.includes(variant.family.toLowerCase()) && catPath.includes(variant.gen.toLowerCase());
  });
  if (familyGenMatches.length === 1) {
    return { matchType: 'UNIQUE_FAMILY_GEN_MATCH', catalogDir: familyGenMatches[0].catalogDir, confidenceScore: 0.8, requiresUserConfirmation: true, candidates: familyGenMatches.map(c => c.catalogDir) };
  }
  if (familyGenMatches.length > 1) {
    return { matchType: 'AMBIGUOUS_FAMILY_GEN_MATCH', catalogDir: '', confidenceScore: 0.5, requiresUserConfirmation: true, candidates: familyGenMatches.map(c => c.catalogDir) };
  }
  return null;
}

function _findCatalogByFuzzy(catalogs, variant, baseFormFactor) {
  for (const cat of catalogs) {
    const catLower = cat.id.toLowerCase();
    const formMatch = catLower.includes((variant.formFactor || '').toLowerCase()) || (baseFormFactor && catLower.includes(baseFormFactor.toLowerCase()));
    const famMatch = catLower.includes((variant.family || '').toLowerCase().substring(0, 4));
    if (formMatch && famMatch) {
      return cat.catalogDir;
    }
  }
  return null;
}

/**
 * Auto-detect the chassis output directory from BOQ items by matching base SKUs.
 * Returns detailed detection metadata including confidenceScore and user confirmation triggers.
 * @param {Array<object>} boqItems Consolidated BOQ items
 * @returns {object} { chassisDir, matchType, confidenceScore, requiresUserConfirmation, detectedVariant }
 */
function autoDetectChassisDetailed(boqItems = []) {
  try {
    const variant = detectChassisVariant(boqItems);
    const catalogs = listAllCatalogs();
    const modelClean = variant.model.replace(/\s+/g, '_').replace(/HPE_?/i, '');

    // 0. If chassis map explicitly mapped this variant to a target catalog directory, use it directly.
    if (variant.chassisDir) {
      const resolved = path.isAbsolute(variant.chassisDir) ? variant.chassisDir : path.join(PROJECT_ROOT, variant.chassisDir);
      if (fs.existsSync(resolved)) {
        return {
          chassisDir: resolved,
          matchType: 'EXACT_CHASSIS_MAP_DIR',
          confidenceScore: 1.0,
          requiresUserConfirmation: false,
          detectedVariant: variant,
          candidates: [resolved]
        };
      }
    }

    // 1. A base SKU found inside a catalog is the strongest product boundary.
    const baseSkuDir = _findCatalogByBaseSku(catalogs, variant.baseSku);
    if (baseSkuDir) {
      return {
        chassisDir: baseSkuDir,
        matchType: 'EXACT_BASE_SKU',
        confidenceScore: 1.0,
        requiresUserConfirmation: false,
        detectedVariant: variant,
        candidates: [baseSkuDir]
      };
    }

    // 2. Try exact or normalized model match
    const modelDir = _findCatalogByModel(catalogs, variant, modelClean);
    if (modelDir) {
      return {
        chassisDir: modelDir,
        matchType: 'EXACT',
        confidenceScore: 0.95,
        requiresUserConfirmation: false,
        detectedVariant: variant
      };
    }

    // 3. Match by family + gen + form factor
    const baseFormFactor = (variant.formFactor || '').replace(/^\d+/, '');
    const familyGenResult = _findCatalogByFamilyGen(catalogs, variant, baseFormFactor);
    if (familyGenResult) {
      return {
        chassisDir: familyGenResult.catalogDir,
        matchType: familyGenResult.matchType,
        confidenceScore: familyGenResult.confidenceScore,
        requiresUserConfirmation: familyGenResult.requiresUserConfirmation,
        detectedVariant: variant,
        ...(familyGenResult.candidates ? { candidates: familyGenResult.candidates } : {})
      };
    }

    // 4. Try fuzzy match by family + form factor
    const fuzzyDir = _findCatalogByFuzzy(catalogs, variant, baseFormFactor);
    if (fuzzyDir) {
      return {
        chassisDir: fuzzyDir,
        matchType: 'FUZZY',
        confidenceScore: 0.6,
        requiresUserConfirmation: true,
        detectedVariant: variant,
        candidates: [fuzzyDir]
      };
    }
  } catch (e) {
    const _logger = require('../system/pipeline_logger.js');
    _logger.warn('ERROR', 'catalog_discovery.js', e);
  }

  // 5. Ultimate fallback (triggers strict failure in eval_boq.js)
  return {
    chassisDir: '',
    matchType: 'FALLBACK',
    confidenceScore: 0.0,
    requiresUserConfirmation: true,
    unknown: true,
    detectedVariant: { model: 'Unknown Variant', formFactor: 'Unknown', family: 'Unknown' }
  };
}

function autoDetectChassisDir(boqItems = []) {
  return autoDetectChassisDetailed(boqItems).chassisDir;
}

function _verifyCatalogFiles(matched, cleanId) {
  if (!matched.catalogJsonPath || !fs.existsSync(matched.catalogJsonPath)) {
    return {
      certified: false,
      catalogPath: matched.catalogJsonPath,
      xlsxPath: matched.xlsxPath,
      skuCount: 0,
      reason: `Catalog JSON missing on disk for '${cleanId}' at ${matched.catalogJsonPath}`
    };
  }
  if (!matched.xlsxPath || !fs.existsSync(matched.xlsxPath)) {
    return {
      certified: false,
      catalogDir: matched.catalogDir,
      catalogPath: matched.catalogJsonPath,
      xlsxPath: matched.xlsxPath,
      skuCount: matched.skuCount,
      reason: `Master 22-sheet Excel catalog (.xlsx) missing on disk for '${cleanId}'. Scrape must be fully exported.`
    };
  }
  if ((matched.skuCount || 0) <= 0) {
    return {
      certified: false,
      catalogPath: matched.catalogJsonPath,
      xlsxPath: matched.xlsxPath,
      skuCount: 0,
      reason: `Catalog for '${cleanId}' has 0 unique SKUs. Incomplete or empty scrape.`
    };
  }
  return null;
}

function _readAndVerifyCatalogJson(matched, cleanId) {
  let catalogContent = null;
  try {
    catalogContent = JSON.parse(fs.readFileSync(matched.catalogJsonPath, 'utf-8'));
  } catch (err) {
    return {
      errorResult: {
        certified: false,
        catalogDir: matched.catalogDir,
        catalogPath: matched.catalogJsonPath,
        xlsxPath: matched.xlsxPath,
        skuCount: 0,
        reason: `Catalog JSON could not be parsed: ${err.message}`
      }
    };
  }

  const meta = catalogContent?.metadata || {};
  const actualSkus = new Set((catalogContent.entries || []).flatMap(entry => entry.skus || []).map(row => String(row.sku || row['Product #'] || '').trim()).filter(Boolean));
  if (actualSkus.size !== Number(meta.totalUniqueSKUs)) {
    return {
      errorResult: { certified: false, catalogPath: matched.catalogJsonPath, reason: `Catalog SKU tally mismatch: metadata=${meta.totalUniqueSKUs}, actual=${actualSkus.size}` }
    };
  }
  return { catalogContent, meta };
}

function _readAndVerifyMasterWorkbook(matched) {
  try {
    const bytes = fs.readFileSync(matched.xlsxPath);
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error('Not an XLSX ZIP container');
    const workbook = require('xlsx-js-style').read(bytes, { type: 'buffer' });
    if (!workbook.Sheets['All SKUs']) throw new Error('Missing All SKUs sheet');
    return { workbook };
  } catch (error) {
    return {
      errorResult: { certified: false, catalogPath: matched.catalogJsonPath, xlsxPath: matched.xlsxPath, reason: `Invalid master workbook: ${error.message}` }
    };
  }
}

function _verifyFlagshipServerConstraints(matched, cleanId, catalogContent) {
  const isFlagshipRackServer = /dl380|dl360|dl580|sy480/i.test(cleanId);
  if (!isFlagshipRackServer) return null;

  if (matched.skuCount < 20) {
    return {
      certified: false,
      catalogDir: matched.catalogDir,
      catalogPath: matched.catalogJsonPath,
      xlsxPath: matched.xlsxPath,
      skuCount: matched.skuCount,
      reason: `Flagship server '${cleanId}' has only ${matched.skuCount} SKUs, failing minimum cardinality threshold (>= 20). Incomplete catalog.`
    };
  }
  const subcats = (catalogContent.entries || []).map(e => String(e.subCategory || '').toLowerCase());
  const hasCompute = subcats.some(s => s.includes('processor') || s.includes('cpu') || s.includes('compute'));
  const hasMemory = subcats.some(s => s.includes('memory') || s.includes('dimm') || s.includes('rdimm'));
  if (!hasCompute || !hasMemory) {
    return {
      certified: false,
      catalogDir: matched.catalogDir,
      catalogPath: matched.catalogJsonPath,
      xlsxPath: matched.xlsxPath,
      skuCount: matched.skuCount,
      reason: `Flagship server '${cleanId}' is missing mandatory subcategories (compute=${hasCompute}, memory=${hasMemory}). Incomplete catalog.`
    };
  }
  return null;
}

function _verifyCoverageAndFreshness(matched, catalogContent, workbook) {
  try {
    const services = JSON.parse(fs.readFileSync(path.join(matched.catalogDir, `${matched.id}_Services.json`), 'utf8'));
    const coverage = require('./catalog_coverage.js').validateCatalogCoverage(matched.id, catalogContent, services, workbook);
    if (!coverage.valid) return { certified: false, catalogPath: matched.catalogJsonPath, reason: coverage.reason };
  } catch (error) {
    return { certified: false, catalogPath: matched.catalogJsonPath, reason: `Coverage evidence unavailable: ${error.message}` };
  }

  const { auditCatalogFreshness, verifyTabularIntegrity } = require('./catalog_freshness_guard.js');
  const tabularCheck = verifyTabularIntegrity(catalogContent);
  if (!tabularCheck.isValid) {
    return {
      certified: false,
      catalogDir: matched.catalogDir,
      catalogPath: matched.catalogJsonPath,
      xlsxPath: matched.xlsxPath,
      skuCount: matched.skuCount,
      reason: `Tabular integrity failure: ${tabularCheck.errors.join('; ')}`
    };
  }

  const freshness = auditCatalogFreshness(catalogContent);
  if (['UNKNOWN', 'INVALID_FUTURE_DATE', 'CRITICAL_OUTDATED'].includes(freshness.freshnessStatus)) {
    return {
      certified: false,
      catalogDir: matched.catalogDir,
      catalogPath: matched.catalogJsonPath,
      xlsxPath: matched.xlsxPath,
      skuCount: matched.skuCount,
      reason: `Catalog freshness ${freshness.freshnessStatus}: ${freshness.advisories.join('; ')}`
    };
  }
  return { tabularCheck, freshness };
}

/**
 * Verifies if a given chassis catalog is certified and was scraped at least once.
 * Checks for:
 * 1. Directory existence in outputs/
 * 2. *_Catalog.json existence with metadata.totalUniqueSKUs > 0
 * 3. *_OCA_Catalog.xlsx existence
 *
 * @param {string} chassisId - Chassis name or prefix (e.g. 'DL380_Gen12', 'DL360_Gen11')
 * @param {string} [outputsRoot] - Optional outputs root override
 * @returns {{ certified: boolean, catalogPath: string|null, xlsxPath: string|null, skuCount: number, reason?: string, catalogDir?: string }}
 */
function isCatalogCertified(chassisId, outputsRoot = OUTPUTS_ROOT) {
  if (!chassisId || typeof chassisId !== 'string') {
    return { certified: false, catalogPath: null, xlsxPath: null, skuCount: 0, reason: 'Invalid or missing chassis identifier' };
  }

  const cleanId = chassisId.trim();
  const catalogs = listAllCatalogs(outputsRoot);

  const matched = catalogs.find(c =>
    c.id.toLowerCase() === cleanId.toLowerCase() ||
    c.chassis.toLowerCase() === cleanId.toLowerCase() ||
    path.basename(c.catalogDir).toLowerCase() === cleanId.toLowerCase()
  );

  if (!matched) {
    return {
      certified: false,
      catalogPath: null,
      xlsxPath: null,
      skuCount: 0,
      reason: `No catalog directory or snapshot found for '${cleanId}' in outputs/. Solution has never been scraped.`
    };
  }

  const fileError = _verifyCatalogFiles(matched, cleanId);
  if (fileError) return fileError;

  const { catalogContent, meta, errorResult: jsonError } = _readAndVerifyCatalogJson(matched, cleanId);
  if (jsonError) return jsonError;

  const { workbook, errorResult: wbError } = _readAndVerifyMasterWorkbook(matched);
  if (wbError) return wbError;

  const normalizedMeta = require('./catalog_freshness_guard.js').normalizeCatalogMetadata(meta);
  if (!normalizedMeta.scrapeDate || !/^\d{4}-\d{2}-\d{2}$/.test(normalizedMeta.scrapeDate)) {
    return {
      certified: false,
      catalogDir: matched.catalogDir,
      catalogPath: matched.catalogJsonPath,
      xlsxPath: matched.xlsxPath,
      skuCount: matched.skuCount,
      reason: `Catalog metadata missing canonical scrapeDate (YYYY-MM-DD) for '${cleanId}'.`
    };
  }

  const flagshipError = _verifyFlagshipServerConstraints(matched, cleanId, catalogContent);
  if (flagshipError) return flagshipError;

  const coverageFreshness = _verifyCoverageAndFreshness(matched, catalogContent, workbook);
  if (coverageFreshness.certified === false) return coverageFreshness;

  return {
    certified: true,
    catalogDir: matched.catalogDir,
    catalogPath: matched.catalogJsonPath,
    xlsxPath: matched.xlsxPath,
    skuCount: matched.skuCount,
    scrapeDate: meta.scrapeDate,
    freshness: coverageFreshness.freshness,
    integrity: coverageFreshness.tabularCheck
  };
}

module.exports = {
  checkCdpHealth,
  findCatalogJsonFiles,
  listAllCatalogs,
  getCatalogDetail,
  collectKnowledgeDeltas,
  autoDetectChassisDir,
  autoDetectChassisDetailed,
  getChassisMap,
  invalidateChassisMapCache,
  detectChassisVariant,
  isCatalogCertified
};
