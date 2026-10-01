'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const normalizeSku = value => String(value || '').trim().toUpperCase().replace(/\s+/g, '#');
const parsePrice = value => /^\d+(?:,\d{3})*(?:\.\d+)?$/.test(String(value ?? '').trim()) ? Number(String(value).replace(/,/g, '')) : NaN;
const canonicalScope = scope => JSON.stringify(scope, (_key, value) => value && typeof value === 'object' && !Array.isArray(value)
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]])) : value);

function serializeManifest(rows) {
  const totals = new Map();
  for (const row of rows) {
    const sku = normalizeSku(row.sku || row['Product #']);
    const quantity = Number(row.quantity ?? row.qty);
    if (!sku || !Number.isSafeInteger(quantity) || quantity <= 0) throw new Error('Invalid portal manifest row');
    const total = (totals.get(sku) || 0) + quantity;
    if (!Number.isSafeInteger(total)) throw new Error('Invalid portal manifest total');
    totals.set(sku, total);
  }
  return JSON.stringify([...totals].sort(([a], [b]) => a.localeCompare(b)));
}

/**
 * Read captured vendor evidence. A receipt only applies to the exact complete
 * SKU/quantity manifest and bound scope; it cannot certify a later substitution or another BOM.
 *
 * @param {string} targetDir - Directory containing evidence folder
 * @returns {object|null}
 */
function readPortalReceipt(targetDir) {
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
    if (times.some(time => Date.now() - time > 24 * 3600000)) return null;
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

    // Scope must be observed in BOTH captures. Reader arguments, directory names
    // and description heuristics are expectations, not vendor evidence.
    const scope = bom.capturedScope;
    const scopeVerified = Boolean(scope && check.capturedScope &&
      typeof scope.chassis === 'string' && scope.chassis.trim() &&
      typeof scope.baseSku === 'string' && scope.baseSku.trim() && scope.configurationName === rows[0].configurationName &&
      scope.selectors && typeof scope.selectors === 'object' && !Array.isArray(scope.selectors) &&
      Object.values(scope.selectors).every(value => typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) &&
      canonicalScope(scope) === canonicalScope(check.capturedScope) &&
      rows.some(row => row.sku === normalizeSku(scope.baseSku)));
    const manifestStr = serializeManifest(rows);
    const manifestSha256 = crypto.createHash('sha256').update(manifestStr).digest('hex');

    return {
      status: scopeVerified ? 'CLIC_ACCEPTED' : 'CLIC_OBSERVED_UNSCOPED',
      capturedAt: new Date(Math.min(...times)).toISOString(),
      chassis: scopeVerified ? scope.chassis : null,
      baseSku: scopeVerified ? normalizeSku(scope.baseSku) : null,
      configurationName: rows[0].configurationName,
      configurationId: scopeVerified ? scope.configurationId || null : null,
      selectors: scopeVerified ? scope.selectors : null,
      rows,
      totalUsd,
      bomPath,
      checkPath,
      manifestSha256,
      bomSha256: crypto.createHash('sha256').update(bomBytes).digest('hex'),
      checkSha256: crypto.createHash('sha256').update(checkBytes).digest('hex')
    };
  } catch { return null; }
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
  if (!receipt || receipt.status !== 'CLIC_ACCEPTED') return false;
  if (!candidate) return false;
  const captured = Date.parse(receipt.capturedAt);
  if (!Number.isFinite(captured) || captured > Date.now() + 60000 || Date.now() - captured > 24 * 3600000) return false;

  const items = Array.isArray(candidate) ? candidate : (candidate.skuPartsList || candidate.skuList || candidate.items || []);
  if (!Array.isArray(items) || items.length === 0) return false;

  // Scope binding 1: Chassis / Product model match
  const candidateChassis = String(options.chassisKey || options.chassis || candidate.chassis || candidate.model || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const receiptChassis = String(receipt.chassis || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!candidateChassis || !receiptChassis || candidateChassis !== receiptChassis) {
    return false;
  }

  // Scope binding 2: Base SKU match
  const candidateBase = options.baseSku || candidate.baseSku;
  if (!candidateBase || !receipt.baseSku || normalizeSku(candidateBase) !== normalizeSku(receipt.baseSku)) {
    return false;
  }

  // Scope binding 3: Owning configuration name match
  const owner = options.configurationName || candidate.configurationName;
  if (!owner || String(receipt.configurationName).trim() !== String(owner).trim()) return false;
  const candidateConfigId = options.configurationId || candidate.configurationId || null;
  const receiptConfigId = receipt.configurationId || null;
  if (receiptConfigId !== candidateConfigId) return false;
  if (items.some(item => (item.configurationName && item.configurationName !== owner) ||
    (receiptConfigId && item.configurationId && item.configurationId !== receiptConfigId) ||
    // Owner/hierarchy mappings not present in this single-icon capture cannot
    // be proved by aggregate SKU equality. Leave those candidates pending.
    item.ownerId || item.parentId || item.subParentId)) return false;

  // Scope binding 4: Selector state match
  const expectedSelectors = options.selectors || candidate.selectors;
  if (!expectedSelectors || !receipt.selectors) return false;
  const keys = Object.keys(expectedSelectors).sort();
  if (JSON.stringify(keys) !== JSON.stringify(Object.keys(receipt.selectors).sort())) return false;
  if (keys.some(key => receipt.selectors[key] !== expectedSelectors[key])) return false;

  // Scope binding 5: Exact aggregate SKU & quantity manifest matching
  try {
    const manifest = serializeManifest(receipt.rows);
    return crypto.createHash('sha256').update(manifest).digest('hex') === receipt.manifestSha256 &&
      manifest === serializeManifest(items);
  } catch { return false; }
}

module.exports = {
  readPortalReceipt,
  receiptMatches,
  normalizeSku,
  serializeManifest
};
