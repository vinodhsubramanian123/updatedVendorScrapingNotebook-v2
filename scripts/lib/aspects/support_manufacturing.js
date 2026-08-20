'use strict';
/**
 * scripts/lib/aspects/support_manufacturing.js — Support & Manufacturing Aspect Pre-Check
 */

const { cleanBaseSKU } = require('../sku.js');
const { classifyComponentRole } = require('../product_meta.js');

function evalSupportManufacturing(items, catalogData = null) {
  let hasSupportService = false;
  for (const it of items) {
    const desc = (it.description || '').toLowerCase();
    let role = classifyComponentRole('', desc);
    if (catalogData && catalogData.entries) {
      const match = catalogData.entries.find(e => e.skus && e.skus.find(s => cleanBaseSKU(s['Product #']) === cleanBaseSKU(it.sku)));
      if (match) role = classifyComponentRole(match.parentCategory, desc);
    }
    if (role === 'Service & Support' || desc.includes('tech care') || desc.includes('support') || desc.includes('warranty') || /^h[a-z0-9]{6}/i.test(it.sku)) {
      hasSupportService = true;
    }
  }
  return { hasSupportService };
}

module.exports = {
  evalSupportManufacturing
};
