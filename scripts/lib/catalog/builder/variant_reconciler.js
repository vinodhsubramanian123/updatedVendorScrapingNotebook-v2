'use strict';
/**
 * scripts/lib/catalog/builder/variant_reconciler.js — Base Chassis Variants & Catalog Object Assembly
 */

const fs = require('fs');
const path = require('path');
const { cleanBaseSKU, isValidHpeSKU } = require('../sku.js');
const { parseProductMeta, classifyComponentRole } = require('../product_meta.js');
const { extractCompactCanonicalSpecs } = require('../attribute_vectors.js');
const { parseStrictPrice, normalizeLifecycleCanonical, classifyRowType } = require('../field_parsers.js');
const { registeredOwnedMenuMatches } = require('../catalog_hierarchy');
const { inferPillar } = require('../product_scope');
const PipelineLogger = require('../../system/pipeline_logger.js');
const {
  lookupChassisMapBaseSku,
  detectChassisFormFactor,
  parseTSVRows,
  getUniqueSkuCount
} = require('./taxonomy_and_intake.js');

function buildBaseChassisRecordFromMetadata(effectiveSku, discovered, mapInfo, chassisLabel, chassisDiscovery) {
  let rawDesc = discovered?.description || discovered?.text || mapInfo?.description || `${chassisLabel} Configure-to-order Server`;
  rawDesc = rawDesc.replace(/^[A-Z0-9-]+\s*-\s*/, '').trim();
  const discPrice = Number(discovered?.listPriceUsd || 0);
  const resolvedPrice = discPrice > 0 ? discPrice : Number(mapInfo?.listPrice || 0);
  const registration = require('../../../config/notebooks.json').notebooks[parseProductMeta(chassisLabel).cleanName];
  const price = resolvedPrice > 0 ? resolvedPrice : (registration?.requireExactOcaBase ? null : 0);
  const formattedPrice = price === null ? '' : price.toFixed(2);
  const status = discovered?.status || 'Active';
  const leadTime = discovered?.leadTime || chassisDiscovery?.deliveryEstimate || '';
  return {
    'Product #': effectiveSku,
    sku: effectiveSku,
    'Option Type': 'CTO',
    'Component Role': 'Base Chassis',
    Description: rawDesc,
    'Current Qty': '1',
    'Unit Price (USD)': formattedPrice,
    listPrice: price,
    'CLIC Status': status,
    'Lifecycle Status': status,
    lifecycleStatus: status,
    'HPE Recommended': 'Yes',
    Availability: discovered?.availability || 'Available in OCA product catalog',
    'Lead Time': leadTime,
    'Lead Time Source': leadTime ? 'OCA configuration estimate' : 'Not published by OCA',
    'Start Date': discovered?.startDate || mapInfo?.startDate || '',
    'Discontinued Date': discovered?.discontinuedDate || '',
    provenance: chassisDiscovery?.source || 'HPE OCA product catalog metadata'
  };
}

function extractBaseChassisEvidence(tables, baseSKU, chassisLabel, chassisDiscovery = null, meta = null) {
  const mapInfo = lookupChassisMapBaseSku(chassisLabel, meta, baseSKU);
  const effectiveSku = cleanBaseSKU(baseSKU || mapInfo?.sku || '');
  if (!effectiveSku || !isValidHpeSKU(effectiveSku)) return null;

  const discovered = (chassisDiscovery?.candidates || []).find(candidate =>
    cleanBaseSKU(candidate.sku) === effectiveSku && candidate.eligible !== false
  );

  if (discovered || mapInfo) {
    return buildBaseChassisRecordFromMetadata(effectiveSku, discovered, mapInfo, chassisLabel, chassisDiscovery);
  }

  for (const table of tables || []) {
    for (const row of table.rows || []) {
      const skuIndex = row.findIndex(cell => cleanBaseSKU(cell) === effectiveSku);
      if (skuIndex < 0) continue;
      const description = row.slice(skuIndex + 1).find(cell => /configure-to-order|cto server/i.test(String(cell || '')));
      if (description) {
        const price = Number(mapInfo?.listPrice || 0);
        const leadTime = chassisDiscovery?.deliveryEstimate || '';
        const hasValidPrice = price > 0;
        return {
          'Product #': effectiveSku,
          sku: effectiveSku,
          'Option Type': 'CTO',
          'Component Role': 'Base Chassis',
          Description: String(description).replace(/^[A-Z0-9-]+\s*-\s*/, '').trim(),
          'Current Qty': '1',
          'Unit Price (USD)': hasValidPrice ? price.toFixed(2) : '',
          'List Price (USD)': hasValidPrice ? price.toFixed(2) : '',
          listPrice: hasValidPrice ? price : null,
          priceState: hasValidPrice ? 'PRICED' : 'UNPRICED',
          rowType: 'BASE_SYSTEM',
          'CLIC Status': 'Active',
          'Lifecycle Status': 'Active',
          lifecycleStatus: 'Active',
          'HPE Recommended': 'Yes',
          Availability: 'Available in active OCA configuration',
          'Lead Time': leadTime || 'Unpublished',
          'Lead Time Source': leadTime ? 'OCA configuration estimate' : 'Not published by OCA',
          provenance: `OCA active configuration for ${chassisLabel}`
        };
      }
    }
  }
  return null;
}

function _isCanonicalNonProLiantBaseText(family, text) {
  if (/\b(?:upgrade|license|support|service|kit|expansion|drive|magazine)\b/i.test(text)) return false;
  if (family === 'SAN') return /\bswitch\b/i.test(text);
  if (family === 'StoreEver') return /\b(?:base\s+module|library|autoloader)\b/i.test(text);
  return ['Cray', 'Alletra'].includes(family);
}

function isCanonicalCtoChassisCandidate(candidate, chassisLabel) {
  const text = String(candidate?.description || candidate?.text || '').trim();
  const sku = cleanBaseSKU(candidate?.sku || '');
  if (!sku || !isValidHpeSKU(sku) || !text || candidate?.eligible === false) return false;
  if (candidate?.isBto || candidate?.isTaa || candidate?.isGta || /\b(?:TAA|GTA|BTO)\b|#GTA/i.test(text)) return false;
  const registeredId = String(chassisLabel).replace(/ /g, '_');
  const notebooks = require('../../../config/notebooks.json').notebooks;
  const expected = notebooks[registeredId]?.captureViaParent ? registeredId : parseProductMeta(chassisLabel).cleanName;
  const observedMeta = parseProductMeta(text);
  const observed = observedMeta.cleanName;
  const registration = notebooks[expected];
  if (registration?.captureViaParent) {
    return registration.baseSku === sku && registeredOwnedMenuMatches({ ...registration, productId: expected }, text);
  }
  const hasCtoOrFamilyBase = /configure[\s-]+to[\s-]+order|\bcto\b/i.test(text) || _isCanonicalNonProLiantBaseText(observedMeta.family, text);
  if (expected !== observed || !hasCtoOrFamilyBase) return false;
  return !/\b(?:OEM|solutions?|Commvault|Cohesity|Veeam|vSAN|template|KSA|Saudi|Disconnected|Add[\s-]*on)\b/i.test(text);
}

async function loadHistoricalChassisEvidence(targetDir, chassisLabel) {
  const result = new Map();
  const historyDir = path.join(targetDir, 'history');
  if (!fs.existsSync(historyDir)) return result;
  const expected = parseProductMeta(chassisLabel).cleanName;
  const files = fs.readdirSync(historyDir).filter(f => /^catalog_.*\.json$/.test(f)).sort().reverse();
  for (const file of files) {
    try {
      const catalog = JSON.parse(await fs.promises.readFile(path.join(historyDir, file), 'utf8'));
      for (const entry of catalog.entries || []) {
        const isChassis = String(entry.parentCategory || '').toLowerCase() === 'chassis' || String(entry.subCategory || '').toLowerCase() === 'variants';
        if (!isChassis) continue;
        for (const sku of entry.skus || []) {
          const description = String(sku.Description || sku.description || '').replace(/^\[REMOVED SKU\]\s*/i, '');
          const productNumber = cleanBaseSKU(sku['Product #'] || sku.sku || '');
          if (productNumber && isValidHpeSKU(productNumber) && parseProductMeta(description).cleanName === expected && !result.has(productNumber)) {
            result.set(productNumber, { ...sku, Description: description });
          }
        }
      }
    } catch (err) {
      PipelineLogger.debug('BUILD_CATALOG', `Failed reading historical chassis evidence from ${file}: ${err.message}`);
    }
  }
  return result;
}

function resolveDiscoveredVariantPriceWithProvenance(candidate, previous, chassisLabel, productNumber) {
  if (candidate.priceVerified && candidate.listPriceUsd === 0) {
    return { price: 0, priceProvenance: 'OCA_CANDIDATE_VERIFIED_ZERO' };
  }
  const currentPrice = Number(candidate.listPriceUsd || 0);
  if (currentPrice > 0) return { price: currentPrice, priceProvenance: 'OCA_CANDIDATE' };
  const mapInfo = lookupChassisMapBaseSku(chassisLabel, null, productNumber);
  const mapPrice = Number(mapInfo?.listPrice || 0);
  if (mapPrice > 0) return { price: mapPrice, priceProvenance: 'CHASSIS_MAP_FALLBACK' };
  const registration = require('../../../config/notebooks.json').notebooks[parseProductMeta(chassisLabel).cleanName];
  if (registration?.requireExactOcaBase || registration?.captureViaParent) {
    return { price: null, priceProvenance: 'UNPRICED' };
  }
  const historicalPrice = Number(previous.listPrice || previous['Unit Price (USD)'] || previous['Price (USD)'] || 0);
  return historicalPrice > 0
    ? { price: historicalPrice, priceProvenance: 'HISTORICAL_CATALOG_FALLBACK' }
    : { price: 0, priceProvenance: 'UNPRICED' };
}

function buildDiscoveredVariantRecord(candidate, previous, productNumber, chassisLabel, chassisDiscovery) {
  const description = String(candidate.description || candidate.text || previous.Description || '')
    .replace(/^\s*[A-Z0-9-]+(?:#GTA)?\s*-\s*/i, '').trim();
  const { price, priceProvenance } = resolveDiscoveredVariantPriceWithProvenance(candidate, previous, chassisLabel, productNumber);
  const isSelectedVariant = cleanBaseSKU(chassisDiscovery.selectedSku || '') === productNumber;
  const leadTime = candidate.leadTime || (isSelectedVariant ? (chassisDiscovery.deliveryEstimate || '') : '');
  const formattedPrice = price === null ? '' : price.toFixed(2);
  const clicStatus = candidate.clicStatus || (chassisDiscovery.parentConfiguration ? 'Not evaluated' : 'Valid');
  const lifecycleStatus = candidate.status || 'Active';
  const leadTimeSource = !leadTime ? 'Not published by OCA' : (chassisDiscovery.parentOption ? 'OCA parent option row'
    : (candidate.leadTime ? 'OCA candidate estimate' : 'OCA configuration estimate'));

  return {
    'Product #': productNumber,
    sku: productNumber,
    'Option Type': 'CTO',
    'Component Role': 'Base Chassis',
    Description: description || `${chassisLabel} Configure-to-order Server`,
    'Current Qty': '1',
    'Unit Price (USD)': formattedPrice,
    'List Price (USD)': formattedPrice,
    'Cost (USD)': '',
    costPrice: null,
    listPrice: price,
    priceProvenance,
    'CLIC Status': clicStatus,
    clicStatus,
    'Lifecycle Status': lifecycleStatus,
    lifecycleStatus,
    'HPE Recommended': previous['HPE Recommended'] === 'Yes' ? 'Yes' : 'No',
    Availability: candidate.availability || 'Available in OCA product catalog',
    'Lead Time': leadTime,
    'Lead Time Days': candidate.leadTimeDays == null ? '' : String(candidate.leadTimeDays),
    leadTimeDays: candidate.leadTimeDays ?? null,
    'Speed Tier': candidate.leadTimeDays != null ? 'OCA Estimate' : (leadTime ? 'Standard Delivery (8-30d)' : 'Unpublished'),
    'Lead Time Source': leadTimeSource,
    'Start Date': candidate.startDate || previous['Start Date'] || '',
    'Discontinued Date': candidate.discontinuedDate || previous['Discontinued Date'] || '',
    provenance: chassisDiscovery.source || 'HPE OCA product search'
  };
}

async function extractDiscoveredChassisVariants(targetDir, chassisLabel, chassisDiscovery) {
  const candidates = (chassisDiscovery?.candidates || []).filter(c => isCanonicalCtoChassisCandidate(c, chassisLabel));
  if (candidates.length === 0) return [];
  const historical = await loadHistoricalChassisEvidence(targetDir, chassisLabel);
  const bySku = new Map();
  for (const candidate of candidates) {
    const productNumber = cleanBaseSKU(candidate.sku);
    if (bySku.has(productNumber)) continue;
    const previous = historical.get(productNumber) || {};
    bySku.set(productNumber, buildDiscoveredVariantRecord(candidate, previous, productNumber, chassisLabel, chassisDiscovery));
  }
  return Array.from(bySku.values());
}

const CTO_HISTORY_KEYWORDS = ['cto server', 'base chassis', 'server cto', 'cto rack', 'cto chassis', 'compute module', 'cto frame'];

function extractValidHistoricalChassisEntries(hCat, targetProduct) {
  const hChassisEntries = (hCat.entries || []).filter(e =>
    (e.parentCategory || '').toLowerCase() === 'chassis' ||
    (e.subCategory || '').toLowerCase() === 'variants'
  );
  if (hChassisEntries.length === 0) return [];

  return hChassisEntries.map(e => ({
    ...e,
    parentCategory: 'Chassis',
    subCategory: 'Variants',
    minQty: 1,
    maxQty: 1,
    skus: (e.skus || []).filter(s => {
      const desc = (s['Description'] || s.description || '').toLowerCase();
      const historicalProduct = parseProductMeta(desc).cleanName;
      const isBaseOrCto = s['Component Role'] === 'Base Chassis' || (s['Option Type'] || s.optionType) === 'CTO';
      return isBaseOrCto && historicalProduct === targetProduct && CTO_HISTORY_KEYWORDS.some(kw => desc.includes(kw));
    })
  })).map(e => ({ ...e, skuCount: e.skus.length })).filter(e => e.skus.length > 0);
}

async function tryInjectVariantsFromHistoryDir(hardwareEntries, targetDir, chassisLabel) {
  const historyDir = path.join(targetDir, 'history');
  if (!fs.existsSync(historyDir)) return false;

  const histFiles = fs.readdirSync(historyDir)
    .filter(f => f.startsWith('catalog_') && f.endsWith('.json'))
    .sort().reverse();

  const histFilesData = await Promise.all(histFiles.map(async (hf) => {
    try {
      const rawContent = await fs.promises.readFile(path.join(historyDir, hf), 'utf-8');
      return { hf, rawContent };
    } catch (_) {
      return null;
    }
  }));

  const targetProduct = parseProductMeta(chassisLabel).cleanName;
  for (const data of histFilesData) {
    if (!data) continue;
    const { hf, rawContent } = data;
    if (!/"parentCategory"\s*:\s*"Chassis"|"subCategory"\s*:\s*"Variants"/.test(rawContent)) continue;
    try {
      const hCat = JSON.parse(rawContent);
      const cleanChassisEntries = extractValidHistoricalChassisEntries(hCat, targetProduct);
      if (cleanChassisEntries.length > 0) {
        hardwareEntries.unshift(...cleanChassisEntries);
        console.log(`  📦 Chassis variants injected from history snapshot: ${hf} (${cleanChassisEntries.reduce((sum, e) => sum + e.skus.length, 0)} SKUs)`);
        return true;
      }
    } catch (err) {
      PipelineLogger.debug('BUILD_CATALOG', `Failed reading history snapshot ${hf}: ${err.message}`);
    }
  }
  return false;
}

async function injectChassisVariantsFromHistory(hardwareEntries, targetDir, chassisLabel, baseSKU = '', tables = [], chassisDiscovery = null, meta = null) {
  const hasChassisEntry = hardwareEntries.some(e =>
    (e.subCategory || '').toLowerCase() === 'variants' &&
    (e.skus || []).some(s => s['Component Role'] === 'Base Chassis' && String(s['Lead Time'] || '').trim())
  );

  if (hasChassisEntry) return;

  const discoveredVariants = await extractDiscoveredChassisVariants(targetDir, chassisLabel, chassisDiscovery);
  if (discoveredVariants.length > 0) {
    hardwareEntries.unshift({
      tableIndex: -1,
      parentCategory: 'Chassis',
      subCategory: 'Variants',
      constraint: 'min 1, max 1 — Active OCA CTO chassis',
      minQty: 1,
      maxQty: 1,
      maxQtySemantics: 'BOUNDED',
      rules: ['Select exactly one currently discoverable, non-TAA/non-GTA CTO base chassis'],
      headers: ['Product #', 'Description', 'Unit Price (USD)', 'Start Date', 'Discontinued Date', 'Lead Time'],
      skuCount: discoveredVariants.length,
      skus: discoveredVariants
    });
    console.log(`  📦 ${discoveredVariants.length} active exact-product CTO chassis variant(s) injected from current OCA discovery.`);
    return;
  }

  const injectedFromHistory = await tryInjectVariantsFromHistoryDir(hardwareEntries, targetDir, chassisLabel);
  if (!injectedFromHistory) {
    const baseChassis = extractBaseChassisEvidence(tables, baseSKU, chassisLabel, chassisDiscovery, meta);
    if (baseChassis) {
      hardwareEntries.unshift({
        tableIndex: -1,
        parentCategory: 'Chassis',
        subCategory: 'Variants',
        constraint: 'min 1, max 1 — Active OCA Base Chassis',
        minQty: 1,
        maxQty: 1,
        maxQtySemantics: 'BOUNDED',
        rules: ['Base chassis captured from the active OCA configuration summary'],
        headers: ['Product #', 'Description'],
        skuCount: 1,
        skus: [baseChassis]
      });
      console.log(`  📦 Active OCA base chassis injected from configuration evidence: ${baseChassis.sku}`);
    } else {
      console.warn(`  ⚠️  WARNING: No exact-product chassis entry found in scraped data or history for ${chassisLabel}.`);
    }
  }
}

function _stampCatalogRow(s, e, ownerProduct) {
  const desc = s.Description || s.description || '';
  const componentRole = s['Component Role'] || classifyComponentRole(e.parentCategory || e.subCategory || '', desc);
  const rawLifecycle = s['Lifecycle Status'] || s.lifecycleStatus || 'Active';
  const lifecycleCanonical = s.lifecycleCanonical || normalizeLifecycleCanonical(rawLifecycle).lifecycleCanonical;
  const rowType = s.rowType || classifyRowType({ ...s, 'Component Role': componentRole }, { isBase: e.parentCategory === 'Chassis' });
  const canonicalSpecs = s.canonicalSpecs || extractCompactCanonicalSpecs(s, { parentCategory: e.parentCategory });
  return {
    ...s,
    ownerProduct: s.ownerProduct || ownerProduct,
    subCategory: s.subCategory || e.subCategory,
    'Component Role': componentRole,
    lifecycleCanonical,
    rowType,
    canonicalSpecs
  };
}

function buildCatalogObject(entries, filePrefix, meta, chassisLabel, subcatList) {
  return {
    metadata: {
      chassis:            filePrefix.replace(/_/g, ' '),
      model:              meta.cleanName || chassisLabel,
      family:             meta.family || 'General',
      generation:         meta.gen || 'General',
      pillar:             meta.pillar || inferPillar(meta.family, meta.cleanName || filePrefix),
      validationScope:    'CATALOG_ONLY_REQUIRES_PRODUCT_AND_TOPOLOGY_CHECKS',
      scrapeDate:         meta.scrapeTimestamp ? meta.scrapeTimestamp.split('T')[0] : null,
      scrapeTimestamp:    meta.scrapeTimestamp || null,
      builtAt:            new Date().toISOString(),
      totalSubcategories: new Set(entries.map(e => e.subCategory)).size,
      totalUniqueSKUs:    getUniqueSkuCount(entries),
      totalTables:        entries.length
    },
    subcategories: subcatList.filter(sc => entries.some(e => e.parentCategory === sc.parentCategory && e.subCategory === sc.name)).map(sc => ({
      parentCategory:  sc.parentCategory,
      name:            sc.name,
      constraint:      sc.constraint,
      minQty:          sc.minQty,
      maxQty:          sc.maxQty ?? null,
      maxQtySemantics: sc.maxQtySemantics || (sc.maxQty !== null && sc.maxQty !== undefined ? 'BOUNDED' : 'UNBOUNDED')
    })),
    entries: entries.map(e => {
      const ownerProduct = filePrefix || meta?.cleanName || null;
      const stampedSkus = (e.skus || []).map(s => _stampCatalogRow(s, e, ownerProduct));
      return {
        parentCategory:  e.parentCategory,
        subCategory:     e.subCategory,
        constraint:      e.constraint,
        minQty:          e.minQty || 0,
        maxQty:          e.maxQty ?? null,
        maxQtySemantics: e.maxQtySemantics || (e.maxQty !== null && e.maxQty !== undefined ? 'BOUNDED' : 'UNBOUNDED'),
        rules:           e.rules,
        headers:         e.headers,
        skuCount:        e.skuCount,
        skus:            stampedSkus
      };
    })
  };
}

const NON_CHASSIS_ACCESSORY_KEYWORDS = [
  'factory integrated', 'heatsink', 'processor', 'fan kit', 'cable', 'riser', 'cage', 'cord', 'power supply', 'bezel', 'rail'
];
const CTO_SERVER_KEYWORDS = ['cto server', 'server cto', 'cto rack', 'cto chassis'];

function isTsvChassisVariantRow(r) {
  const cat = (r['Main Category'] || '').toLowerCase();
  const sub = (r['Sub-Category'] || '').toLowerCase();
  const role = (r['Component Role'] || '').toLowerCase();
  const desc = (r['Description'] || '').toLowerCase();
  const lifecycle = String(r['Lifecycle Status'] || '').toLowerCase();
  if (cat === 'frame options' || lifecycle.includes('obsolete') || lifecycle.includes('end of life') || lifecycle.includes('discontinued')) {
    return false;
  }
  const isChassisCategory = cat === 'chassis' && ['variants', 'base chassis', 'chassis'].includes(sub);
  const isCtoServer = CTO_SERVER_KEYWORDS.some(kw => desc.includes(kw));
  const isNonChassisAccessory = NON_CHASSIS_ACCESSORY_KEYWORDS.some(kw => desc.includes(kw));
  return (isChassisCategory || isCtoServer) && !isNonChassisAccessory && role === 'base chassis';
}

function mapTsvRowToChassisVariant(r) {
  const desc = r['Description'] || '';
  const priceParsed = parseStrictPrice(r['Unit Price (USD)'] ?? r['List Price (USD)'], { description: desc });
  const price = priceParsed.priceUsd !== null ? priceParsed.priceUsd : 0;
  const rec = r['HPE Recommended'] || 'Unknown';
  return {
    sku: r['Product #'] || '',
    description: desc,
    formFactor: detectChassisFormFactor(desc),
    listPrice: priceParsed.priceUsd,
    listPriceFormatted: priceParsed.priceUsd !== null ? `$${price.toFixed(2)}` : '',
    optionType: r['Option Type'] || 'CTO',
    hpeRecommended: rec,
    'HPE Recommended': rec,
    startDate: r['Start Date'] || '',
    discontinuedDate: r['Discontinued Date'] || '',
    constraint: r['Constraint Text'] || 'max 1 — Mandatory Base Chassis Selection',
    maxQty: r['Subcategory Max Qty'] || '1',
    diffStatus: r['Diff Status'] || '',
    priceHistoryTrail: r['Price History Trail'] || ''
  };
}

function _buildHistoricalVariantRecord(s, pn, desc, e, hf) {
  const priceParsed = parseStrictPrice(s.listPrice ?? s['Unit Price (USD)'] ?? s['List Price (USD)'], { sku: pn, description: desc, row: s });
  const rec = s['HPE Recommended'] || s.hpeRecommended || 'Unknown';
  return {
    sku: pn,
    description: desc,
    formFactor: detectChassisFormFactor(desc),
    listPrice: priceParsed.priceUsd,
    listPriceFormatted: priceParsed.priceUsd !== null ? `$${priceParsed.priceUsd.toFixed(2)}` : '',
    optionType: s['Option Type'] || s.optionType || 'CTO',
    hpeRecommended: rec,
    'HPE Recommended': rec,
    startDate: s['Start Date'] || s.startDate || '',
    discontinuedDate: s['Discontinued Date'] || s.discontinuedDate || '',
    constraint: e.constraint || 'max 1 — Mandatory Base Chassis Selection',
    maxQty: e.maxQty ?? '1',
    sourceSnapshot: hf
  };
}

function appendHistoricalChassisVariantsFromCat(hCat, filePrefix, hf, chassisVariantMatrix) {
  const hChassisEntries = (hCat.entries || []).filter(e =>
    (e.parentCategory || '').toLowerCase() === 'chassis' ||
    (e.subCategory || '').toLowerCase() === 'variants'
  );
  for (const e of hChassisEntries) {
    for (const s of (e.skus || [])) {
      const pn = s.sku || s['Product #'] || '';
      const desc = s.description || s.Description || '';
      const isBto = String(s['Option Type'] || s.optionType || '').toUpperCase() === 'BTO';
      if (!pn || chassisVariantMatrix[pn] || !isCanonicalCtoChassisCandidate({ sku: pn, text: desc, isBto }, filePrefix)) continue;
      chassisVariantMatrix[pn] = _buildHistoricalVariantRecord(s, pn, desc, e, hf);
    }
  }
}

async function backfillVariantMatrixFromHistory(chassisVariantMatrix, targetDir, filePrefix) {
  const historyDir = path.join(targetDir, 'history');
  if (!fs.existsSync(historyDir)) return;

  const histFiles = fs.readdirSync(historyDir)
    .filter(f => f.startsWith('catalog_') && f.endsWith('.json'))
    .sort().reverse();

  const histFilesData = await Promise.all(histFiles.map(async (hf) => {
    try {
      const rawContent = await fs.promises.readFile(path.join(historyDir, hf), 'utf-8');
      return { hf, rawContent };
    } catch (_) {
      return null;
    }
  }));

  for (const data of histFilesData) {
    if (!data) continue;
    const { hf, rawContent } = data;
    if (!/"parentCategory"\s*:\s*"Chassis"|"subCategory"\s*:\s*"Variants"/.test(rawContent)) continue;
    try {
      const hCat = JSON.parse(rawContent);
      appendHistoricalChassisVariantsFromCat(hCat, filePrefix, hf, chassisVariantMatrix);
      if (Object.keys(chassisVariantMatrix).length >= 6) break;
    } catch (err) {
      PipelineLogger.debug('BUILD_CATALOG', `Failed parsing chassis variant from history ${hf}: ${err.message}`);
    }
  }
}

function _buildCatalogVariantRecord(s, pn, e, priceParsed) {
  const desc = s.Description || s.description || '';
  const rec = s['HPE Recommended'] || s.hpeRecommended || 'Unknown';
  return {
    sku: pn,
    description: desc,
    formFactor: detectChassisFormFactor(desc),
    listPrice: priceParsed.priceUsd,
    listPriceFormatted: priceParsed.priceUsd !== null ? `$${priceParsed.priceUsd.toFixed(2)}` : '',
    optionType: s['Option Type'] || s.optionType || 'CTO',
    hpeRecommended: rec,
    'HPE Recommended': rec,
    startDate: s['Start Date'] || '',
    discontinuedDate: s['Discontinued Date'] || '',
    constraint: e.constraint || 'max 1 — Mandatory Base Chassis Selection',
    maxQty: e.maxQty ?? null,
    maxQtySemantics: e.maxQtySemantics || null,
    priceProvenance: s.priceProvenance || (priceParsed.priceUsd > 0 ? 'CATALOG_ROW' : 'UNPRICED'),
    diffStatus: s['Diff Status'] || '',
    priceHistoryTrail: s['Price History Trail'] || ''
  };
}

function _isObsoleteOrRemovedVariantRow(s) {
  const diffStatus = String(s?.['Diff Status'] || s?.diffStatus || '').toUpperCase();
  if (diffStatus === 'REMOVED' || diffStatus === 'DISCONTINUED') return true;
  const lcCanonical = String(s?.lifecycleCanonical || '').toUpperCase();
  if (lcCanonical === 'OBSOLETE' || lcCanonical === 'END_OF_LIFE') return true;
  const lcRaw = String(s?.['Lifecycle Status'] || s?.lifecycleStatus || '').toLowerCase();
  const badge = String(s?.lifecycleBadge || '').toUpperCase();
  return badge === 'OB' || badge === 'EOL' || lcRaw.includes('obsolete') || lcRaw.includes('end of life');
}

function _reconcileVariantMatrixFromCatalog(chassisVariantMatrix, enrichedCatalog) {
  if (!enrichedCatalog || !Array.isArray(enrichedCatalog.entries)) return;
  for (const e of enrichedCatalog.entries) {
    const parentLower = (e.parentCategory || '').toLowerCase();
    if (parentLower === 'frame options') continue;
    const isChassis = parentLower === 'chassis' || (e.subCategory || '').toLowerCase() === 'variants';
    for (const s of e.skus || []) {
      const pn = cleanBaseSKU(s.sku || s['Product #']);
      if (!pn || !isValidHpeSKU(pn) || _isObsoleteOrRemovedVariantRow(s)) continue;
      if (!isChassis && s['Component Role'] !== 'Base Chassis' && s.rowType !== 'BASE_SYSTEM') continue;
      const p = parseStrictPrice(s.listPrice ?? s['List Price (USD)'] ?? s['Unit Price (USD)'], { row: s, sku: pn });
      const existing = chassisVariantMatrix[pn];
      const existingUnpriced = !existing || existing.listPrice === null || existing.listPrice === 0;
      if (existingUnpriced && (!existing || (p.priceUsd !== null && p.priceUsd > 0))) {
        chassisVariantMatrix[pn] = _buildCatalogVariantRecord(s, pn, e, p);
      }
    }
  }
}

async function buildChassisVariantMatrix(scrapsDir, filePrefix, targetDir, enrichedCatalog = null) {
  const skuTSVRows = parseTSVRows(path.join(scrapsDir, `${filePrefix}_Catalog_SKUs.tsv`));
  const srvTSVRows = parseTSVRows(path.join(scrapsDir, `${filePrefix}_Services_SKUs.tsv`));
  const allTSVRows = [...skuTSVRows, ...srvTSVRows];

  const chassisVariants = allTSVRows
    .filter(isTsvChassisVariantRow)
    .map(mapTsvRowToChassisVariant)
    .filter(v => v.sku && isValidHpeSKU(cleanBaseSKU(v.sku)));

  const chassisVariantMatrix = {};
  for (const v of chassisVariants) {
    chassisVariantMatrix[cleanBaseSKU(v.sku) || v.sku] = v;
  }

  _reconcileVariantMatrixFromCatalog(chassisVariantMatrix, enrichedCatalog);

  if (Object.keys(chassisVariantMatrix).length < 6) {
    await backfillVariantMatrixFromHistory(chassisVariantMatrix, targetDir, filePrefix);
  }

  return chassisVariantMatrix;
}

module.exports = {
  extractBaseChassisEvidence,
  isCanonicalCtoChassisCandidate,
  extractDiscoveredChassisVariants,
  injectChassisVariantsFromHistory,
  buildCatalogObject,
  buildChassisVariantMatrix,
  _reconcileVariantMatrixFromCatalog
};
