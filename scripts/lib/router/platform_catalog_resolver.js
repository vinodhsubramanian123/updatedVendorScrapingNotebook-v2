'use strict';
/**
 * scripts/lib/router/platform_catalog_resolver.js
 * Platform resolution, catalog discovery, policy resolution, BOM item reading, and workload branch checking.
 */

const fs = require('fs');
const path = require('path');
const { cleanBaseSKU, attachCompanionServices } = require('../catalog/sku.js');
const catalogDiscovery = require('../catalog/catalog_discovery.js');
const { evaluateBOQMultiAspect } = require('../boq/boq_evaluator.js');
const { resolveEffectivePolicy } = require('../system/policy_resolver.js');
const logger = require('../system/pipeline_logger.js');

const getChassisMap = (...args) => catalogDiscovery.getChassisMap(...args);
const listAllCatalogs = (...args) => catalogDiscovery.listAllCatalogs(...args);

const ALLETRA_MP_CATALOGS = new Set(['Alletra_MP_B10000', 'Alletra_MP_X10000']);
const COMPETITOR_VENDORS = ['cisco', 'lenovo', 'supermicro', 'dell', 'huawei'];
const OCR_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.tiff', '.bmp', '.pdf'];

function getBaseChassisSku(chassisKey = '') {
  try {
    const cmap = getChassisMap();
    if (cmap[chassisKey]?.baseSku) return cmap[chassisKey].baseSku;
    if (cmap[chassisKey]?.sku) return cmap[chassisKey].sku;
    for (const [k, v] of Object.entries(cmap)) {
      if (v.model === chassisKey || k.toLowerCase() === chassisKey.toLowerCase()) {
        if (v.baseSku) return v.baseSku;
      }
    }
  } catch (err) {
    logger.debug('ROUTE_QUERY', `Unable to resolve chassis map for ${chassisKey}: ${err?.message}`);
  }
  try {
    const catalogs = listAllCatalogs();
    const found = catalogs.find(c => c.id.toLowerCase() === chassisKey.toLowerCase() || c.chassis?.toLowerCase() === chassisKey.toLowerCase());
    if (found?.baseSku) return found.baseSku;
  } catch (err) {
    logger.debug('ROUTE_QUERY', `Unable to find catalog base SKU for ${chassisKey}: ${err?.message}`);
  }
  return null;
}

function _escapeRegex(str) {
  return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function _buildDynamicAliasesForModel(keyStem, catalogId, allStems) {
  const variants = new Set();
  const spaced = String(catalogId || keyStem).replace(/_/g, ' ').replace(/\bgen\s*(\d+)/i, 'Gen $1').trim();
  if (spaced) variants.add(_escapeRegex(spaced).replace(/\s+/g, '\\s*'));
  const compact = keyStem.toLowerCase();
  const hasLongerSibling = allStems.some((other) => other !== compact && other.startsWith(compact) && /[a-z]/i.test(other.slice(compact.length, compact.length + 1)));
  const lookahead = hasLongerSibling ? '(?![a-z])' : '';
  const siblingNextLetters = [...new Set(
    allStems
      .filter((other) => other !== compact && other.startsWith(compact))
      .map((other) => other.slice(compact.length, compact.length + 1).toLowerCase())
      .filter((ch) => /[a-z]/.test(ch) && ch !== 'g')
  )];
  const tailLookahead = siblingNextLetters.length ? `(?!${siblingNextLetters.join('|')})` : '';
  const alphaNum = compact.match(/^([a-z]+)(\d+[a-z]?)$/);
  if (alphaNum) {
    variants.add(`${alphaNum[1]}\\s*${alphaNum[2]}${lookahead}`);
    const tail = `${alphaNum[2]}${tailLookahead}`;
    if (alphaNum[2].length >= 3) variants.add(`${tail}\\s*(?:gen|g)\\d+`);
  } else if (compact.length >= 3) {
    variants.add(`${_escapeRegex(compact)}${lookahead}`);
  }
  return variants;
}

function _buildPlatformSignatures(catalogs) {
  const chassisMap = getChassisMap();
  const entries = new Map();
  for (const [id, meta] of Object.entries(chassisMap)) {
    entries.set(id, { id, keywords: meta?.aliases || meta?.keywords || [] });
  }
  for (const cat of Array.isArray(catalogs) ? catalogs : []) {
    if (cat?.id && !entries.has(cat.id)) {
      entries.set(cat.id, { id: cat.id, keywords: [] });
    }
  }
  const stems = [...entries.keys()].map((id) => id.split('_')[0].toLowerCase()).filter(Boolean);
  const byStem = new Map();

  for (const { id, keywords } of entries.values()) {
    const stem = id.split('_')[0].toLowerCase();
    if (!stem) continue;
    const prefix = id.toLowerCase().replace(/_gen\d+$/i, '') + (id.includes('_Gen') ? '_' : '');
    const variants = _buildDynamicAliasesForModel(stem, id, stems);
    for (const kw of Array.isArray(keywords) ? keywords : []) {
      const escaped = _escapeRegex(String(kw).trim()).replace(/\\ /g, '\\s+');
      if (escaped) variants.add(escaped);
    }
    if (!byStem.has(stem)) {
      byStem.set(stem, { key: stem, prefix: `${stem}_`, exactPrefix: prefix, variants });
    } else {
      for (const v of variants) byStem.get(stem).variants.add(v);
    }
  }

  return [...byStem.values()].map((item) => ({
    key: item.key,
    prefix: item.key === 'sy100gb' || item.key === 'synergy' ? item.exactPrefix : item.prefix,
    pattern: new RegExp(`\\b(?:${[...item.variants].join('|')})\\b`, 'i')
  }));
}

function _parseGenerationHints(text, context) {
  const migrationMatch = text.match(/\b(?:migrate|modernize|upgrade|transition|move|replace|from)\b.*?\bgen\s*(\d+)\b.*?\b(?:to|into|->|with|target)\b.*?\bgen\s*(\d+)\b/i) ||
                         text.match(/\bgen\s*(\d+)\b\s*(?:to|->)\s*.*?\bgen\s*(\d+)\b/i);

  let targetGen = null;
  if (migrationMatch) {
    const sourceGen = `Gen${migrationMatch[1]}`;
    targetGen = `Gen${migrationMatch[2]}`;
    if (context && typeof context === 'object') {
      context.migrationSourceGen = sourceGen;
      context.migrationTargetGen = targetGen;
    }
  }

  const explicitGenMatch = targetGen ? null : (
    text.match(/\bgen\s*(\d+)\b/i) ||
    text.match(/(?:dl\s*\d+[a-z]?|sy\s*\d+|\b\d{3}[a-z]?)[-_]?(?:gen|g)(\d+)\b/i) ||
    text.match(/\bg(\d+)\b/i)
  );
  const explicitGen = targetGen || (explicitGenMatch ? `Gen${explicitGenMatch[1]}` : null);
  const requestedGenerations = new Set([
    ...[...text.matchAll(/\bgen\s*(\d+)\b/gi)].map(match => match[1]),
    ...[...text.matchAll(/(?:dl\s*\d+[a-z]?|sy\s*\d+|\b\d{3}[a-z]?)[-_]?(?:gen|g)(\d+)\b/gi)].map(match => match[1]),
    ...[...text.matchAll(/\bg(\d+)\b/gi)].map(match => match[1])
  ]);
  return { targetGen, explicitGen, requestedGenerations };
}

function _resolveSinglePlatformCandidate(platform, candidates, explicitGen) {
  const unsupportedResult = {
    chassisKey: `${platform.key.toUpperCase()}_${explicitGen}_UNSUPPORTED`,
    catalogDir: null,
    catalogPath: null,
    catalogData: null,
    isAmbiguous: true,
    error: `${platform.key.toUpperCase()} ${explicitGen} is not available in portfolio.`
  };
  if (candidates.length === 1) {
    const cand = candidates[0];
    if (explicitGen && !cand.id.includes(explicitGen)) return { earlyReturn: unsupportedResult };
    return { matchedCatalog: cand };
  }
  if (candidates.length > 1) {
    if (!explicitGen) {
      return {
        earlyReturn: {
          chassisKey: 'AMBIGUOUS_PRODUCT',
          catalogDir: null,
          catalogPath: null,
          catalogData: null,
          isAmbiguous: true,
          candidates: candidates.map(c => c.id),
          error: 'Multiple product generations match; specify the exact target generation.'
        }
      };
    }
    const matchedCatalog = candidates.find(c => c.id.includes(explicitGen));
    if (!matchedCatalog) return { earlyReturn: unsupportedResult };
    return { matchedCatalog };
  }
  return { matchedCatalog: null };
}

function _matchPlatformCandidates(text, catalogs, platformSignatures, explicitGen) {
  const matchedPlatforms = platformSignatures.filter(p => p.pattern.test(text));
  if (matchedPlatforms.length === 1) {
    const platform = matchedPlatforms[0];
    const prefix = platform.prefix || (platform.key.includes('_') ? platform.key : `${platform.key}_`);
    const candidates = catalogs.filter(c => c.id.toLowerCase().startsWith(prefix));
    return _resolveSinglePlatformCandidate(platform, candidates, explicitGen);
  }
  if (matchedPlatforms.length > 1) {
    return {
      earlyReturn: {
        chassisKey: 'AMBIGUOUS_QUERY',
        catalogDir: null,
        catalogPath: null,
        catalogData: null,
        isAmbiguous: true,
        candidates: catalogs.filter(c => matchedPlatforms.some(p => c.id.toLowerCase().startsWith(p.prefix))).map(c => c.id),
        error: `Multiple hardware platforms matched query text: ${matchedPlatforms.map(p => p.key.toUpperCase()).join(', ')}. Please specify a single target model.`,
        availableCatalogs: catalogs.map(c => c.id)
      }
    };
  }
  return { matchedCatalog: null };
}

function _loadCatalogDataSafe(catalogJsonPath) {
  if (!catalogJsonPath || !fs.existsSync(catalogJsonPath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(catalogJsonPath, 'utf-8'));
    return attachCompanionServices(parsed, catalogJsonPath);
  } catch (err) {
    logger.warn('ROUTE_QUERY', `Error parsing catalog JSON at ${catalogJsonPath}: ${err?.message}`);
    return null;
  }
}

function _resolvePresalesCatalog(queryText, target, catalogs, preferNamedProduct) {
  let matchedProducts = catalogDiscovery.matchAlletraMpProducts(queryText);
  if (!matchedProducts.length && preferNamedProduct) {
    const { resolveCatalogQueryScope } = require('../catalog/catalog_query_engine.js');
    const scope = resolveCatalogQueryScope(queryText, catalogs);
    const migrationCtx = {};
    const { targetGen } = _parseGenerationHints(String(queryText || '').toLowerCase(), migrationCtx);
    const sourceGenRegex = targetGen && migrationCtx.migrationSourceGen
      ? new RegExp(`\\b${migrationCtx.migrationSourceGen.replace(/^gen/i, 'gen\\s*')}\\b`, 'i')
      : null;
    const unresolved = sourceGenRegex
      ? scope.unresolvedProducts.filter(p => !sourceGenRegex.test(String(p)))
      : scope.unresolvedProducts;
    if (unresolved.length) {
      return { earlyReturn: { chassisKey: 'UNKNOWN_PRODUCT', isAmbiguous: true, error: 'A named sizing product has no matching catalog.' } };
    }
    matchedProducts = scope.products;
  }
  if (matchedProducts.length > 1) {
    return {
      earlyReturn: {
        chassisKey: 'AMBIGUOUS_PRODUCT',
        isAmbiguous: true,
        candidates: matchedProducts,
        error: 'Multiple products were named. Submit a separate sizing or evaluation request for each product.'
      }
    };
  }
  const product = matchedProducts[0];
  const matchedCatalog = catalogs.find(c => product ? c.id === product :
    target && (c.id.toLowerCase() === target || c.chassis?.toLowerCase() === target));
  if (product && !matchedCatalog) {
    return {
      earlyReturn: {
        chassisKey: 'UNKNOWN_PRODUCT',
        isAmbiguous: true,
        candidates: [],
        error: 'The requested Alletra MP product catalog is unavailable.'
      }
    };
  }
  return { matchedCatalog, explicitProduct: Boolean(product) };
}

function _auditCatalogHealth(catalogData) {
  if (!catalogData || !Array.isArray(catalogData.entries)) return null;
  try {
    const { auditCatalogFreshness, verifyTabularIntegrity } = require('../catalog/catalog_freshness_guard.js');
    if (typeof auditCatalogFreshness !== 'function') return null;
    const freshness = auditCatalogFreshness(catalogData);
    const integrity = typeof verifyTabularIntegrity === 'function' ? verifyTabularIntegrity(catalogData) : null;
    return {
      isFresh: freshness.isFresh,
      ageHours: freshness.ageHours,
      reason: freshness.reason,
      tabularIntegrityValid: integrity ? integrity.isValid : null,
      totalPriceableSkus: integrity ? integrity.totalPriceableSkus : null
    };
  } catch {
    return null;
  }
}

function getChassisCatalog(queryText = '', context = {}) {
  const text = (queryText + ' ' + (context.chassisName || context.model || '')).toLowerCase().replace(/_/g, ' ');

  let catalogs = [];
  try {
    catalogs = Array.isArray(context?.availableCatalogs) ? context.availableCatalogs : listAllCatalogs();
  } catch (err) {
    logger.debug('ROUTE_QUERY', `Dynamic catalog discovery note: ${err?.message}`);
  }

  const target = String(context.chassisName || context.model || '').toLowerCase().trim();
  const presalesCatalog = _resolvePresalesCatalog(queryText, target, catalogs, context.preferNamedProduct);
  if (presalesCatalog.earlyReturn) return presalesCatalog.earlyReturn;
  let { matchedCatalog } = presalesCatalog;

  const generationText = presalesCatalog.explicitProduct ? String(queryText) : text;
  const { targetGen, explicitGen, requestedGenerations } = _parseGenerationHints(generationText, context);

  if (matchedCatalog && explicitGen && !matchedCatalog.id.toLowerCase().includes(explicitGen.toLowerCase())) {
    return { chassisKey: 'GENERATION_MISMATCH', catalogDir: null, catalogPath: null, catalogData: null, isAmbiguous: true, error: 'Explicit product and requested generation disagree.' };
  }
  if (!targetGen && requestedGenerations.size > 1) {
    return { chassisKey: 'AMBIGUOUS_QUERY', catalogDir: null, catalogPath: null, catalogData: null, isAmbiguous: true, error: 'Multiple generations require separate configurations.' };
  }

  if (!matchedCatalog) {
    const platformSignatures = _buildPlatformSignatures(catalogs);
    const resolved = _matchPlatformCandidates(text, catalogs, platformSignatures, explicitGen);
    if (resolved.earlyReturn) return resolved.earlyReturn;
    matchedCatalog = resolved.matchedCatalog;
  }

  if (!matchedCatalog) {
    return {
      chassisKey: 'UNKNOWN_PRODUCT',
      catalogDir: null,
      catalogPath: null,
      catalogData: null,
      isAmbiguous: true,
      error: 'Product platform and generation could not be resolved from input.',
      availableCatalogs: catalogs.map(c => c.id)
    };
  }

  const catalogData = _loadCatalogDataSafe(matchedCatalog.catalogJsonPath);
  return {
    chassisKey: matchedCatalog.id,
    catalogDir: matchedCatalog.catalogDir,
    catalogPath: matchedCatalog.catalogJsonPath,
    catalogData,
    catalogAudit: _auditCatalogHealth(catalogData),
    isAmbiguous: false
  };
}

function _resolveContextPolicy(context = {}, { defaultOffline = false, includeRagOnly = false } = {}) {
  return resolveEffectivePolicy({
    clientOffline: context.offline,
    clientOfflineMode: context.offlineMode,
    enableCloudValidation: context.enableCloudValidation,
    inheritedPolicy: context.effectivePolicy || null,
    defaultOffline,
    includeRagOnly,
    lockInheritedOffline: true
  });
}

function _isOfflineContext(context = {}) {
  return _resolveContextPolicy(context, { defaultOffline: false, includeRagOnly: false }).offline;
}

function _compileCatalogSearch(queryText, context) {
  const { parseCatalogSearchQuery } = require('../catalog/catalog_query_engine.js');
  return parseCatalogSearchQuery(queryText, {
    catalogs: context.availableCatalogs,
    selectedProduct: context.chassisName || context.model || (context.chassisDir ? path.basename(context.chassisDir) : null)
  });
}

function readRoutedItems(context) {
  let input = context.items;
  const inputPath = context.filePath || context.file;
  if (!input && inputPath) {
    const ext = path.extname(inputPath).toLowerCase();
    if (ext === '.json') {
      const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
      input = Array.isArray(data) ? data : data.items || data.parsedItems;
    } else {
      if (!['.xlsx', '.xls', '.csv', '.tsv', '.txt'].includes(ext)) throw new Error('Ingest this document through OCR before this operation.');
      if (['.xlsx', '.xls'].includes(ext) && !context.targetSheet) {
        const workbook = require('xlsx-js-style').readFile(inputPath);
        if (workbook.SheetNames.length > 1) throw new Error('Select targetSheet or supply owned groups for a multi-sheet workbook.');
      }
      input = require('../boq/boq_evaluator').parseAndConsolidateBOQ('', inputPath, context.targetSheet);
    }
  }
  if (!Array.isArray(input) || !input.length) throw new Error('Nonempty structured BOM items are required.');
  return input.map(item => {
    const quantity = Number(item.quantity ?? item.qty);
    const sku = item.sku || item.pn || item.partNumber;
    if (!sku || !Number.isSafeInteger(quantity) || quantity < 1) throw new Error('Each BOM item needs a SKU and positive integer quantity.');
    return { ...item, sku, quantity };
  });
}

function requireScopedCatalog(queryText, context) {
  const scope = getChassisCatalog(queryText, context);
  if (scope.isAmbiguous || !scope.catalogDir || !scope.catalogData) throw new Error(scope.error || 'Exact product catalog required.');
  return scope;
}

function evaluateWorkloadBranch(branch, items, chassisInfo) {
  if (!chassisInfo.catalogData) return { ...branch, evaluation: null, evaluationStatus: 'CATALOG_REQUIRED' };
  const candidate = structuredClone(items);
  const pendingActions = [];
  for (const sub of branch.substitutions || []) {
    if (sub.action === 'RETAIN_OCP_NIC_IN_FREED_SLOT' && candidate.some(item => cleanBaseSKU(item.sku) === cleanBaseSKU(sub.retainedSku))) continue;
    const matches = candidate.filter(item => cleanBaseSKU(item.sku) === cleanBaseSKU(sub.originalSku));
    const pivot = ['PIVOT_STORAGE_CONTROLLER_TO_PCIE', 'PIVOT_STORAGE_CABLE_TO_PCIE_SPLITTER', 'PIVOT_BOOT_DEVICE_TO_PCIE'].includes(sub.action);
    if (pivot && sub.injectedSku && matches.length === 1 && (sub.quantity == null || sub.quantity === matches[0].quantity)) {
      Object.assign(matches[0], { sku: sub.injectedSku, description: sub.injectedDesc });
    } else {
      pendingActions.push(sub.action);
    }
  }
  if (pendingActions.length || !branch.substitutions?.length) {
    return { ...branch, evaluation: null, evaluationStatus: 'SUBSTITUTIONS_PENDING', pendingActions };
  }
  try {
    const evaluation = evaluateBOQMultiAspect(candidate, {
      chassis: chassisInfo.chassisKey, catalogData: chassisInfo.catalogData, targetDir: chassisInfo.catalogDir
    });
    return { ...branch, evaluationStatus: 'EVALUATED', evaluation };
  } catch (err) {
    return { ...branch, evaluationStatus: 'ERROR', evaluation: null, evaluationError: err.message };
  }
}

module.exports = {
  ALLETRA_MP_CATALOGS,
  COMPETITOR_VENDORS,
  OCR_IMAGE_EXTENSIONS,
  getChassisMap,
  listAllCatalogs,
  getBaseChassisSku,
  getChassisCatalog,
  _resolveContextPolicy,
  _isOfflineContext,
  _compileCatalogSearch,
  readRoutedItems,
  requireScopedCatalog,
  evaluateWorkloadBranch
};
