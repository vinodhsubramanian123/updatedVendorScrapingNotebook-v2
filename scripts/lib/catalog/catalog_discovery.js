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

function getChassisMap() {
  if (_chassisMapCache) return _chassisMapCache;

  const defaultMap = {
    "DL380_Gen12_SFF": { "family": "ProLiant", "gen": "Gen12", "formFactor": "8SFF", "baseSku": "P73282-B21", "model": "DL380 Gen12 8SFF" },
    "DL380_Gen11": { "family": "ProLiant", "gen": "Gen11", "formFactor": "8SFF", "baseSku": "P52534-B21", "model": "DL380 Gen11 8SFF" },
    "MSL3040_Tape": { "family": "StoreEver", "gen": "Gen1", "formFactor": "Rack", "baseSku": "Q6Q67A", "model": "MSL3040 Tape" },
    "GX5000_General_RACK": { "family": "Cray", "gen": "Gen1", "formFactor": "Rack", "baseSku": "P57100-B21", "model": "GX5000 General RACK" },
    "SY100Gb_F32_Module": { "family": "Synergy", "gen": "Gen1", "formFactor": "Blade", "baseSku": "864273-B21", "model": "SY100Gb F32 Module" },
    "Alletra_Storage_System": { "family": "Alletra", "gen": "Gen1", "formFactor": "Array", "baseSku": "R0Q21A", "model": "Alletra Storage System" }
  };

  const mapPath = path.join(__dirname, '..', '..', 'config', 'chassis_map.json');
  let loaded = {};
  if (fs.existsSync(mapPath)) {
    try {
      loaded = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    } catch (err) {
      try {
        const _logger = require('../system/pipeline_logger.js');
        _logger.warn('CATALOG_DISCOVERY', 'Failed to parse chassis_map.json', err);
      } catch (_) { /* ignore */ }
    }
  }

  const aggregated = { ...defaultMap };
  if (loaded.chassis_base_skus && typeof loaded.chassis_base_skus === 'object') {
    for (const [sku, v] of Object.entries(loaded.chassis_base_skus)) {
      aggregated[sku] = { ...v, baseSku: sku, model: v.model || sku };
    }
  }
  for (const [k, v] of Object.entries(loaded)) {
    if (k === 'chassis_base_skus' || k === 'chassis_base_skus_by_family_gen') continue;
    if (typeof v === 'string') {
      aggregated[k] = { model: v, family: "ProLiant", gen: "Gen12", formFactor: "Rack", baseSku: k };
    } else if (typeof v === 'object' && v !== null) {
      aggregated[k] = { ...v, baseSku: v.baseSku || k, model: v.model || k };
    }
  }
  _chassisMapCache = aggregated;
  return _chassisMapCache;
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
    } catch (_) {
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

  // Check descriptions
  for (const it of (items || [])) {
    const desc = (it.description || '').toLowerCase();
    if (desc.includes('dl380') && desc.includes('gen12')) return { ...chassisMap['DL380_Gen12_SFF'], id: 'DL380_Gen12_SFF' };
    if (desc.includes('dl380') && desc.includes('gen11')) return { ...chassisMap['DL380_Gen11'], id: 'DL380_Gen11' };
    if (desc.includes('alletra')) return { ...chassisMap['Alletra_Storage_System'], id: 'Alletra_Storage_System' };
    if (desc.includes('msl') || desc.includes('tape')) return { ...chassisMap['MSL3040_Tape'], id: 'MSL3040_Tape' };
    if (desc.includes('cray') || desc.includes('gx5000')) return { ...chassisMap['GX5000_General_RACK'], id: 'GX5000_General_RACK' };
    if (desc.includes('synergy')) return { ...chassisMap['SY100Gb_F32_Module'], id: 'SY100Gb_F32_Module' };
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
    if (file.startsWith('.')) return;
    const filePath = path.join(dir, file);
    try {
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(findCatalogJsonFiles(filePath));
      } else if (file.endsWith('_Catalog.json') && !filePath.includes('raw_data')) {
        results.push(filePath);
      }
    } catch (e) { const _logger = require('../system/pipeline_logger.js'); _logger.warn('ERROR', 'catalog_discovery.js', e); }
  });

  return results;
}

/**
 * List all available catalogs with summary metadata.
 * @param {string} outputsRoot Optional override for outputs directory
 * @returns {Array<object>} Array of catalog summary objects
 */
function listAllCatalogs(outputsRoot = OUTPUTS_ROOT) {
  const catalogJsons = findCatalogJsonFiles(outputsRoot);
  const catalogs = [];

  catalogJsons.sort().forEach(jsonPath => {
    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      const meta = data.metadata || {};
      const dir  = path.dirname(jsonPath);
      const fileBase = path.basename(jsonPath, '_Catalog.json');

      const xlsxPath = path.join(dir, `${fileBase}_OCA_Catalog.xlsx`);
      let pdfPath = path.join(dir, `HPE_${fileBase}_QuickSpecs.pdf`);
      if (!fs.existsSync(pdfPath)) {
        const pdfs = fs.readdirSync(dir).filter(f => f.endsWith('.pdf'));
        pdfPath = pdfs.length > 0 ? path.join(dir, pdfs[0]) : null;
      }

      let pdfInfo = null;
      if (pdfPath && fs.existsSync(pdfPath)) {
        const pStat = fs.statSync(pdfPath);
        const md5 = crypto.createHash('md5').update(fs.readFileSync(pdfPath)).digest('hex').substring(0, 8);
        pdfInfo = {
          path: pdfPath,
          sizeMb: parseFloat((pStat.size / 1024 / 1024).toFixed(2)),
          md5Prefix: md5
        };
      }

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
  } catch (e) { console.warn('Caught suppressed error in catalog_discovery.js:', e);
return null;
  }
}

/**
 * Recursively collect all KnowledgeDeltas from catalog_deltas.json files.
 * @param {string} dir Starting directory
 * @returns {Array<object>} All deltas
 */
function collectKnowledgeDeltas(dir = OUTPUTS_ROOT) {
  let deltas = [];
  if (!fs.existsSync(dir)) return deltas;

  const list = fs.readdirSync(dir);
  list.forEach(file => {
    if (file.startsWith('.')) return;
    const filePath = path.join(dir, file);
    try {
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        deltas = deltas.concat(collectKnowledgeDeltas(filePath));
      } else if (file === 'catalog_deltas.json') {
        try {
          const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          if (Array.isArray(parsed)) deltas.push(...parsed);
        } catch (e) { const _logger = require('../system/pipeline_logger.js'); _logger.warn('ERROR', 'catalog_discovery.js', e); }
      }
    } catch (e) { const _logger = require('../system/pipeline_logger.js'); _logger.warn('ERROR', 'catalog_discovery.js', e); }
  });

  return deltas;
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

    // 1. Try exact match by model or base SKU
    if (variant.baseSku && variant.baseSku !== 'CUSTOM_OVERRIDE' && variant.baseSku !== 'UNKNOWN') {
      for (const cat of catalogs) {
        if (cat.id === modelClean || cat.chassis.includes(variant.model) || cat.catalogDir.includes(variant.model.replace(/\s+/g, '_'))) {
          return {
            chassisDir: cat.catalogDir,
            matchType: 'EXACT',
            confidenceScore: 0.95,
            requiresUserConfirmation: false,
            detectedVariant: variant
          };
        }
      }
    }

    // 2. Try exact or normalized model match (e.g., DL380 Gen12 8SFF -> DL380_Gen12_SFF)
    const baseFormFactor = (variant.formFactor || '').replace(/^\d+/, ''); // '8SFF' -> 'SFF', '12LFF' -> 'LFF'
    const normalizedVariantModel = variant.model
      .replace(/\b\d+SFF\b/i, 'SFF')
      .replace(/\b\d+LFF\b/i, 'LFF')
      .replace(/\b\d+EDSFF\b/i, 'EDSFF')
      .replace(/\s+/g, '_')
      .replace(/HPE_?/i, '');

    for (const cat of catalogs) {
      if (cat.id === modelClean || cat.id === normalizedVariantModel || cat.chassis.includes(variant.model)) {
        return {
          chassisDir: cat.catalogDir,
          matchType: 'EXACT',
          confidenceScore: 0.95,
          requiresUserConfirmation: false,
          detectedVariant: variant
        };
      }
    }

    // 3. Match by family + gen + form factor (e.g. ProLiant + Gen12 + SFF)
    if (variant.family && variant.gen) {
      // First try strict family + gen + formFactor match
      for (const cat of catalogs) {
        const catPath = cat.catalogDir.toLowerCase();
        const famMatch = catPath.includes(variant.family.toLowerCase());
        const genMatch = catPath.includes(variant.gen.toLowerCase());
        const ffMatch = baseFormFactor && (catPath.includes(baseFormFactor.toLowerCase()) || cat.id.toLowerCase().includes(baseFormFactor.toLowerCase()));
        if (famMatch && genMatch && ffMatch) {
          return {
            chassisDir: cat.catalogDir,
            matchType: 'FAMILY_GEN_FF_MATCH',
            confidenceScore: 0.95,
            requiresUserConfirmation: false,
            detectedVariant: variant
          };
        }
      }

      // Then try family + gen match (e.g. ProLiant + Gen11 -> DL380_Gen11)
      for (const cat of catalogs) {
        const catPath = cat.catalogDir.toLowerCase();
        const famMatch = catPath.includes(variant.family.toLowerCase());
        const genMatch = catPath.includes(variant.gen.toLowerCase());
        if (famMatch && genMatch) {
          return {
            chassisDir: cat.catalogDir,
            matchType: 'FAMILY_GEN_MATCH',
            confidenceScore: 0.95,
            requiresUserConfirmation: false,
            detectedVariant: variant
          };
        }
      }
    }

    // 4. Try fuzzy match by family + form factor
    for (const cat of catalogs) {
      const catLower = cat.id.toLowerCase();
      if ((catLower.includes((variant.formFactor || '').toLowerCase()) || (baseFormFactor && catLower.includes(baseFormFactor.toLowerCase()))) &&
          catLower.includes((variant.family || '').toLowerCase().substring(0, 4))) {
        return {
          chassisDir: cat.catalogDir,
          matchType: 'FUZZY',
          confidenceScore: 0.85,
          requiresUserConfirmation: false,
          detectedVariant: variant
        };
      }
    }
  } catch (e) { const _logger = require('../system/pipeline_logger.js'); _logger.warn('ERROR', 'catalog_discovery.js', e); }

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
  detectChassisVariant
};
