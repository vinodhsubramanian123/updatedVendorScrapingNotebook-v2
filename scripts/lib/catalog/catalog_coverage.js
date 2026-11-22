'use strict';
const fs = require('fs');
const path = require('path');

function checkRequiredHardware(requirements = [], hardware) {
  return requirements.flatMap(({ sku, category, leadTimeRequired }) => {
    const matches = hardware.filter(({ row, category: actual }) =>
      String(row.sku || row['Product #'] || '').trim() === sku &&
      (!category || actual.includes(category.toLowerCase())));
    if (!matches.length) return [`missing hardware SKU: ${sku} (${category || 'any category'})`];
    if (leadTimeRequired && !matches.some(({ row }) =>
      Number.isFinite(row.leadTimeDays) && row.leadTimeDays >= 0 && row['Lead Time Source'] === 'OCA row attribute')) {
      return [`missing OCA row lead time for ${sku}`];
    }
    return [];
  });
}

function _extractActiveRows(data) {
  return (data?.entries || []).flatMap(entry => (entry.skus || [])
    .filter(row => !['REMOVED', 'DISCONTINUED'].includes(String(row['Diff Status'] || '').toUpperCase()))
    .map(row => ({
      row,
      parentCategory: String(entry.parentCategory || '').trim(),
      subCategory: String(entry.subCategory || '').trim(),
      category: `${entry.parentCategory || ''} ${entry.subCategory || ''}`.toLowerCase().trim()
    })));
}

function _parseRowNumericPrice(row) {
  const candidates = [row?.listPrice, row?.['List Price (USD)'], row?.['Unit Price (USD)'], row?.['Price (USD)'], row?.priceUsd];
  for (const val of candidates) {
    if (val === null || val === undefined || val === '') continue;
    if (typeof val === 'number') {
      if (Number.isFinite(val)) return val;
      continue;
    }
    const cleaned = String(val).replace(/[$,\s]/g, '');
    if (!cleaned || /^(?:na|n\/a)$/i.test(cleaned)) continue;
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function _isActualPhysicalDriveRow(row) {
  const desc = String(row?.Description || row?.description || '');
  if (!/\b(?:ssd|hdd|nvme|sas|sata)\b/i.test(desc) || !/\b\d+(?:\.\d+)?\s*(?:gb|tb)\b/i.test(desc)) return false;
  return !/\b(?:cage|controller|cable|cord|blank|boot|ns204|memory|dimm|rdimm|lrdimm|chassis|server|software|license|e-[lr]tu|subscription)\b/i.test(desc);
}

function _isActualGpuCardRow(row, category) {
  const desc = String(row?.Description || row?.description || '');
  const isGpuMatch = /\b(?:nvidia|h200|h100|b200|b100|gb200|l40s?|l4|a100|a40|a30|a16|a2|rtx\s*(?:pro\s*)?\d{4}|mi3\d{2}[a-z]?|gaudi)\b/i.test(desc)
    || (/\b(?:gpu|graphic|accel)/i.test(category) && /\baccelerator\b/i.test(desc));
  if (!isGpuMatch) return false;
  return !/\b(?:software|license|e-[lr]tu|subscription|virtual\s*(?:workstation|applications|pc)|ai\s*enterprise|ml\s*dev|fio\s*configuration|gpu\s*mode|cable|cord|enablement\s*kit|bridge|baffle|heatsink|heat\s*sink|fan\s*kit|switch|cumulus|connectx|infiniband)\b/i.test(desc);
}

function _isZeroPriceBaseVariantRow(entry) {
  const { row, parentCategory, subCategory } = entry;
  const parentLower = parentCategory.toLowerCase();
  if (parentLower === 'frame options') return false;
  const isBase = parentLower === 'chassis' || subCategory.toLowerCase() === 'variants' || row?.['Component Role'] === 'Base Chassis';
  if (!isBase) return false;
  const lc = String(row?.lifecycleCanonical || row?.['Lifecycle Status'] || row?.lifecycleStatus || '').toLowerCase();
  const badge = String(row?.lifecycleBadge || '').toUpperCase();
  if (badge === 'OB' || badge === 'EOL' || lc.includes('obsolete') || lc.includes('end of life') || lc.includes('end_of_life')) return false;
  const priceState = String(row?.priceState || '').toUpperCase();
  if (priceState === 'PRIVATE_UNPRICED' || priceState === 'REGIONAL_NA_UNPRICED' || row?.priceProvenance === 'OCA_CANDIDATE_VERIFIED_ZERO') return false;
  const price = _parseRowNumericPrice(row);
  return price === null || price <= 0;
}

function _countUniqueFilteredSkus(hardware, predicate) {
  return new Set(
    hardware
      .filter(predicate)
      .map(({ row }) => String(row.sku || row['Product #'] || '').trim())
      .filter(Boolean)
  );
}

function _computeCaptureAgeDays(catalog, options = {}) {
  const captureTs = catalog?.metadata?.scrapeTimestamp || catalog?.metadata?.scrapeDate || null;
  if (!captureTs) return null;
  const refMs = options.referenceDate ? Date.parse(options.referenceDate) : Date.now();
  const capMs = Date.parse(captureTs);
  return Number.isFinite(capMs) && Number.isFinite(refMs)
    ? Number(((refMs - capMs) / 86400000).toFixed(2))
    : null;
}

function _checkMinFloor(profile, key, actual, failures) {
  if (profile[key] == null) return;
  if (!Number.isSafeInteger(profile[key]) || profile[key] < 0) throw new Error(`Invalid ${key}`);
  if (actual < profile[key]) failures.push(`${key}: ${actual} below ${profile[key]}`);
}

function _evaluateStagingHardwareFloors(profile, catalog, hardware, options = {}) {
  const failures = [];
  if (profile.archivedStub === true && !options.allowArchivedStub) {
    failures.push(`archivedStub: '${profile.product || 'product'}' is quarantined as an archived stub`);
  }

  const driveSkus = _countUniqueFilteredSkus(hardware, ({ row }) => _isActualPhysicalDriveRow(row));
  const gpuSkus = _countUniqueFilteredSkus(hardware, ({ row, category }) => _isActualGpuCardRow(row, category));
  const zeroBaseSkus = _countUniqueFilteredSkus(hardware, _isZeroPriceBaseVariantRow);
  const ageDays = _computeCaptureAgeDays(catalog, options);

  _checkMinFloor(profile, 'minActualDrives', driveSkus.size, failures);
  _checkMinFloor(profile, 'minActualGpuCards', gpuSkus.size, failures);

  if (profile.maxZeroPriceBaseVariants != null) {
    if (!Number.isSafeInteger(profile.maxZeroPriceBaseVariants) || profile.maxZeroPriceBaseVariants < 0) {
      throw new Error('Invalid maxZeroPriceBaseVariants');
    }
    if (zeroBaseSkus.size > profile.maxZeroPriceBaseVariants) {
      failures.push(`maxZeroPriceBaseVariants: ${zeroBaseSkus.size} exceeds ${profile.maxZeroPriceBaseVariants} (${[...zeroBaseSkus].join(', ')})`);
    }
  }
  if (profile.maxAgeDays != null) {
    if (!Number.isSafeInteger(profile.maxAgeDays) || profile.maxAgeDays <= 0) throw new Error('Invalid maxAgeDays');
    if (ageDays !== null && ageDays > profile.maxAgeDays) {
      failures.push(`maxAgeDays: ${ageDays}d exceeds ${profile.maxAgeDays}d`);
    }
  }

  return {
    failures,
    metrics: {
      actualDrives: driveSkus.size,
      actualGpuCards: gpuSkus.size,
      zeroPriceBaseVariants: zeroBaseSkus.size,
      ageDays
    }
  };
}

function _categoryMatches(entryCategory, targetCategory) {
  const entry = String(entryCategory || '').toLowerCase();
  const target = String(targetCategory || '').toLowerCase();
  if (entry.includes(target)) return true;
  if (target.includes('sas controller') && entry.includes('storage controller')) return true;
  if (target.includes('storage controller') && entry.includes('sas controller')) return true;
  return false;
}

function _checkCategoryCoverage(profile, hardware, serviceRows) {
  const missing = (required, entries) => required.filter(category => !entries.some(entry => _categoryMatches(entry.category, category)));
  const failures = missing(profile.mandatoryCategories, hardware).map(category => `missing hardware category: ${category}`);
  failures.push(...checkRequiredHardware(profile.requiredHardware, hardware));

  if (profile.mandatoryServicesCategories) {
    if (!Array.isArray(profile.mandatoryServicesCategories)) throw new Error('Invalid service category policy');
    failures.push(...missing(profile.mandatoryServicesCategories, serviceRows).map(category => `missing service category: ${category}`));
  }
  return failures;
}

function _countUniqueSkus(entries) {
  return new Set(entries.map(({ row }) => String(row.sku || row['Product #'] || '').trim()).filter(Boolean)).size;
}

function _checkRequiredWorkbookSheets(requiredSheets = [], workbook) {
  if (!Array.isArray(requiredSheets) || requiredSheets.some(name => typeof name !== 'string' || !name.trim())) {
    throw new Error('Invalid required workbook sheet policy');
  }
  const failures = [];
  for (const name of requiredSheets) {
    const sheet = workbook?.Sheets?.[name];
    if (!workbook?.SheetNames?.includes(name) || !sheet) {
      failures.push(`missing required workbook sheet: ${name}`);
      continue;
    }
    const rows = require('xlsx-js-style').utils.sheet_to_json(sheet, { header: 1, blankrows: false });
    if (!rows.slice(1).some(row => row.some(cell => cell != null && String(cell).trim()))) {
      failures.push(`empty required workbook sheet: ${name}`);
    }
  }
  return failures;
}

function _checkThresholdMetrics(profile, hardware, serviceRows, workbook) {
  const failures = [];
  const metrics = [
    ['minHardwareSKUs', _countUniqueSkus(hardware)],
    ['minServicesSKUs', _countUniqueSkus(serviceRows)],
    ['expectedWorkbookSheets', workbook?.SheetNames?.length || 0]
  ];
  for (const [key, actual] of metrics) {
    if (profile[key] != null) {
      if (!Number.isSafeInteger(profile[key]) || profile[key] <= 0) throw new Error(`Invalid ${key}`);
      if (actual < profile[key]) failures.push(`${key}: ${actual} below ${profile[key]}`);
    }
  }
  return failures;
}

// A profile is a minimum capture policy, not proof of exhaustive portal coverage.
function validateCatalogCoverage(product, catalog, services, workbook, profilesPath = path.resolve(__dirname, '../../config/catalog_coverage_profiles.json'), options = {}) {
  try {
    const profile = JSON.parse(fs.readFileSync(profilesPath, 'utf8')).profiles?.[product];
    if (!profile || !Array.isArray(profile.mandatoryCategories) || !profile.mandatoryCategories.length) {
      return { valid: false, reason: `No complete coverage profile for exact product '${product}'.` };
    }
    const hardware = _extractActiveRows(catalog);
    const serviceRows = _extractActiveRows(services);
    const stagingFloors = _evaluateStagingHardwareFloors(profile, catalog, hardware, options);

    const failures = [
      ..._checkCategoryCoverage(profile, hardware, serviceRows),
      ..._checkThresholdMetrics(profile, hardware, serviceRows, workbook),
      ..._checkRequiredWorkbookSheets(profile.requiredSheets, workbook),
      ...(options.enforceStagingFloors ? stagingFloors.failures : [])
    ];

    return {
      valid: failures.length === 0,
      reason: failures.join('; '),
      profileProduct: product,
      archivedStub: profile.archivedStub === true,
      scope: options.enforceStagingFloors ? 'PROFILE_STAGING_HARDENED' : 'PROFILE_MINIMUM_CAPTURE',
      stagingFloorMetrics: stagingFloors.metrics,
      stagingFloorAdvisories: stagingFloors.failures
    };
  } catch (error) {
    return { valid: false, reason: `Coverage policy unavailable or invalid: ${error.message}` };
  }
}

module.exports = { validateCatalogCoverage };
