'use strict';

/** Count occurrences separately from part numbers; never collapse scoped option rows. */
function catalogCounts(content) {
  const entries = Array.isArray(content.entries) ? content.entries : [];
  const rows = entries.flatMap(entry => Array.isArray(entry.skus) ? entry.skus : []);
  const codes = rows.map(row => String(row.sku || row.SKU || row['Product #'] || row.partNumber || '').trim()).filter(Boolean);
  return {
    totalUniqueSKUs: new Set(codes).size,
    totalSkuOccurrences: rows.length,
    unidentifiedOccurrences: rows.length - codes.length,
    totalSubcategories: entries.length
  };
}

module.exports = { catalogCounts };
