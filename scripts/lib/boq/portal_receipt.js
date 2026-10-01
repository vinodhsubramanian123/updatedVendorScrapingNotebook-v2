'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const normalizeSku = value => String(value || '').trim().toUpperCase().replace(/\s+/g, '#');
const parsePrice = value => /^\d+(?:,\d{3})*(?:\.\d+)?$/.test(String(value ?? '').trim()) ? Number(String(value).replace(/,/g, '')) : NaN;

function serializeManifest(rows) {
  const totals = new Map();
  for (const row of rows) {
    const sku = normalizeSku(row.sku || row['Product #']);
    if (!sku) continue;
    totals.set(sku, (totals.get(sku) || 0) + Number(row.quantity || row.qty || 1));
  }
  return JSON.stringify([...totals].sort(([a], [b]) => a.localeCompare(b)));
}

/**
 * Read captured vendor evidence. A receipt only applies to the exact complete
 * SKU/quantity manifest and bound scope; it cannot certify a later substitution or another BOM.
 *
 * @param {string} targetDir - Directory containing evidence folder
 * @param {object} [options] - Optional scope binding parameters
 * @returns {object|null}
 */
function readPortalReceipt(targetDir, options = {}) {
  try {
    const bomPath = path.join(targetDir, 'evidence', 'clic_corrected_bom.json');
    const checkPath = path.join(targetDir, 'evidence', 'clic_corrected_configuration.json');
    const bomBytes = fs.readFileSync(bomPath);
    const checkBytes = fs.readFileSync(checkPath);
    const bom = JSON.parse(bomBytes);
    const check = JSON.parse(checkBytes);
    const times = [Date.parse(bom.capturedAt), Date.parse(check.capturedAt)];
    if (times.some(time => !Number.isFinite(time) || time > Date.now() + 60000)) return null;
    if (/partial BOM/i.test(bom.text || '') || !/Overall Status:\s*OK\s*Unbuildables\s*0\s*Errors:\s*0\s*Warnings:\s*0\s*Process control\s*0/.test(check.text || '')) return null;
    if (Math.abs(Date.parse(bom.capturedAt) - Date.parse(check.capturedAt)) > 15 * 60000) return null;
    if (Date.now() - Date.parse(check.capturedAt) > 24 * 3600000) return null;
    const table = (bom.tables || []).find(t => t.rows?.length > 1 && t.rows[0].includes('Hierarchy') && t.rows[0].includes('Unit Price (USD)'));
    if (!table) return null;
    const h = table.rows[0];
    if (!['Qty', 'Product #', 'Product Description', 'Config Name', 'Unit Price (USD)', 'Ext. Price (USD)'].every(name => h.includes(name))) return null;
    const rows = table.rows.slice(1).filter(r => r[h.indexOf('Product #')]).map(r => ({
      sku: normalizeSku(r[h.indexOf('Product #')]),
      quantity: Number(r[h.indexOf('Qty')]),
      description: r[h.indexOf('Product Description')],
      configurationName: r[h.indexOf('Config Name')],
      unitPriceUsd: parsePrice(r[h.indexOf('Unit Price (USD)')]),
      extendedPriceUsd: parsePrice(r[h.indexOf('Ext. Price (USD)')])
    }));
    if (!rows.length || rows.some(r => !Number.isSafeInteger(r.quantity) || r.quantity <= 0 || !Number.isFinite(r.unitPriceUsd) || !Number.isFinite(r.extendedPriceUsd) || Math.abs(r.quantity * r.unitPriceUsd - r.extendedPriceUsd) > 0.01)) return null;
    // Multiple icons require an explicit ownership map. Aggregated quantities
    // alone cannot establish that each icon retained its requested SLA.
    if (rows.some(row => !String(row.configurationName || '').trim()) || new Set(rows.map(row => row.configurationName)).size !== 1) return null;
    const totalUsd = rows.reduce((sum, row) => sum + row.extendedPriceUsd, 0);
    const displayedTotal = parsePrice((bom.text || '').match(/Solution List Price\s*[⇄\s]*USD\s*([\d,.]+)/)?.[1]);
    if (!Number.isFinite(displayedTotal) || Math.abs(totalUsd - displayedTotal) > 0.01) return null;

    const baseRow = rows.find(r => /cto|server|chassis/i.test(r.description || ''));
    const manifestStr = serializeManifest(rows);
    const manifestSha256 = crypto.createHash('sha256').update(manifestStr).digest('hex');

    return {
      status: 'CLIC_ACCEPTED',
      capturedAt: check.capturedAt,
      chassis: options.chassis || path.basename(targetDir),
      baseSku: baseRow ? baseRow.sku : (options.baseSku || null),
      configurationName: rows[0].configurationName,
      selectors: options.selectors || null,
      rows,
      totalUsd,
      bomPath,
      checkPath,
      manifestSha256,
      bomSha256: crypto.createHash('sha256').update(bomBytes).digest('hex'),
      checkSha256: crypto.createHash('sha256').update(checkBytes).digest('hex')
    };
  } catch (_) { return null; }
}

/**
 * Validates whether a candidate solution matches a scoped portal acceptance receipt.
 * Enforces product model, base SKU, owning configuration, selectors, and manifest equality.
 *
 * @param {object} receipt - Captured portal receipt from readPortalReceipt()
 * @param {Array|object} candidate - Candidate items array or solution object
 * @param {object} [options] - Additional expected scope attributes
 * @returns {boolean}
 */
function receiptMatches(receipt, candidate, options = {}) {
  if (!receipt || typeof receipt !== 'object') return false;
  if (!candidate) return false;

  const items = Array.isArray(candidate) ? candidate : (candidate.skuPartsList || candidate.skuList || candidate.items || []);
  if (!Array.isArray(items) || items.length === 0) return false;

  // Scope binding 1: Chassis / Product model match
  const candidateChassis = options.chassisKey || options.chassis || candidate.chassis || candidate.model;
  if (candidateChassis && receipt.chassis && String(candidateChassis).trim().toLowerCase() !== String(receipt.chassis).trim().toLowerCase()) {
    return false;
  }

  // Scope binding 2: Base SKU match
  const candidateBase = options.baseSku || candidate.baseSku;
  if (candidateBase && receipt.baseSku && normalizeSku(candidateBase) !== normalizeSku(receipt.baseSku)) {
    return false;
  }

  // Scope binding 3: Owning configuration name match
  if (receipt.configurationName && candidate.configurationName) {
    if (String(receipt.configurationName).trim() !== String(candidate.configurationName).trim()) {
      return false;
    }
  }

  // Scope binding 4: Selector state match
  const expectedSelectors = options.selectors || candidate.selectors;
  if (expectedSelectors && receipt.selectors) {
    for (const [k, v] of Object.entries(expectedSelectors)) {
      if (receipt.selectors[k] !== undefined && receipt.selectors[k] !== v) {
        return false;
      }
    }
  }

  // Scope binding 5: Exact aggregate SKU & quantity manifest matching
  return serializeManifest(receipt.rows) === serializeManifest(items);
}

module.exports = {
  readPortalReceipt,
  receiptMatches,
  normalizeSku,
  serializeManifest
};
