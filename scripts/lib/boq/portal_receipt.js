'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const normalizeSku = value => String(value || '').trim().toUpperCase().replace(/\s+/g, '#');
const parsePrice = value => /^\d+(?:,\d{3})*(?:\.\d+)?$/.test(String(value ?? '').trim()) ? Number(String(value).replace(/,/g, '')) : NaN;

/** Read captured vendor evidence. A receipt only applies to the exact complete
 * SKU/quantity manifest; it cannot certify a later substitution or another BOM. */
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
    return { status: 'CLIC_ACCEPTED', capturedAt: check.capturedAt, rows,
      totalUsd,
      bomPath, checkPath,
      bomSha256: crypto.createHash('sha256').update(bomBytes).digest('hex'),
      checkSha256: crypto.createHash('sha256').update(checkBytes).digest('hex') };
  } catch (_) { return null; }
}

function receiptMatches(receipt, items) {
  if (!receipt) return false;
  const manifest = rows => {
    const totals = new Map();
    for (const row of rows) {
      const sku = normalizeSku(row.sku);
      totals.set(sku, (totals.get(sku) || 0) + Number(row.quantity));
    }
    return JSON.stringify([...totals].sort(([a], [b]) => a.localeCompare(b)));
  };
  return manifest(receipt.rows) === manifest(items);
}

module.exports = { readPortalReceipt, receiptMatches, normalizeSku };
