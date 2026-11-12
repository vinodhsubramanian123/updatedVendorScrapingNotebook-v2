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

// A profile is a minimum capture policy, not proof of exhaustive portal coverage.
function validateCatalogCoverage(product, catalog, services, workbook, profilesPath = path.resolve(__dirname, '../../config/catalog_coverage_profiles.json')) {
  try {
    const profile = JSON.parse(fs.readFileSync(profilesPath, 'utf8')).profiles?.[product];
    if (!profile || !Array.isArray(profile.mandatoryCategories) || !profile.mandatoryCategories.length) {
      return { valid: false, reason: `No complete coverage profile for exact product '${product}'.` };
    }
    const rows = data => (data?.entries || []).flatMap(entry => (entry.skus || [])
      .filter(row => !['REMOVED', 'DISCONTINUED'].includes(String(row['Diff Status'] || '').toUpperCase()))
      .map(row => ({ row, category: String(entry.subCategory || '').toLowerCase() })));
    const hardware = rows(catalog);
    const serviceRows = rows(services);
    const count = entries => new Set(entries.map(({ row }) => String(row.sku || row['Product #'] || '').trim()).filter(Boolean)).size;
    const missing = (required, entries) => required.filter(category => !entries.some(entry => entry.category.includes(String(category).toLowerCase())));
    const failures = missing(profile.mandatoryCategories, hardware).map(category => `missing hardware category: ${category}`);
    failures.push(...checkRequiredHardware(profile.requiredHardware, hardware));
    if (profile.mandatoryServicesCategories && !Array.isArray(profile.mandatoryServicesCategories)) throw new Error('Invalid service category policy');
    failures.push(...missing(profile.mandatoryServicesCategories || [], serviceRows).map(category => `missing service category: ${category}`));
    for (const [key, actual] of [['minHardwareSKUs', count(hardware)], ['minServicesSKUs', count(serviceRows)], ['expectedWorkbookSheets', workbook?.SheetNames?.length || 0]]) {
      if (profile[key] != null && (!Number.isSafeInteger(profile[key]) || profile[key] <= 0)) throw new Error(`Invalid ${key}`);
      if (profile[key] != null && actual < profile[key]) failures.push(`${key}: ${actual} below ${profile[key]}`);
    }
    return { valid: failures.length === 0, reason: failures.join('; '), profileProduct: product, scope: 'PROFILE_MINIMUM_CAPTURE' };
  } catch (error) {
    return { valid: false, reason: `Coverage policy unavailable or invalid: ${error.message}` };
  }
}
module.exports = { validateCatalogCoverage };
