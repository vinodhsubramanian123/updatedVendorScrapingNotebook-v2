'use strict';
/**
 * scripts/lib/aspects/storage_tri_mode.js — Storage & Tri-Mode Controller Aspect Pre-Check
 */

const { cleanBaseSKU } = require('../catalog/sku.js');
const { classifyComponentRole } = require('../catalog/product_meta.js');

function evalStorageTriMode(items, catalogData = null, mandatorySkus = {}) {
  let driveCount = 0;
  let hasStorageController = false;
  let hasSmartBattery = false;
  let hasNoDriveKit = false;

  const batterySku = cleanBaseSKU(mandatorySkus.SMART_STORAGE_BATTERY?.sku || 'P01366-B21');
  const noDriveSku = cleanBaseSKU(mandatorySkus.NO_DRIVE_FIO_KIT?.sku || '873763-B21');

  for (const it of items) {
    const desc = (it.description || '').toLowerCase();
    const sku = cleanBaseSKU(it.sku);

    let role = classifyComponentRole('', desc);
    if (catalogData && catalogData.entries) {
      const match = catalogData.entries.find(e => e.skus && e.skus.find(s => cleanBaseSKU(s['Product #']) === cleanBaseSKU(it.sku)));
      if (match) role = classifyComponentRole(match.parentCategory, desc);
    }

    if (role === 'Drive Cage / Drive' || desc.includes('hdd') || desc.includes('ssd') || desc.includes('drive') || desc.includes('nvme')) {
      if (!desc.includes('no drive') && !desc.includes('cage') && !desc.includes('controller')) {
        driveCount += (it.quantity || 1);
      }
    }
    if (desc.includes('controller') || desc.includes('mr416i') || desc.includes('sr932i')) {
      hasStorageController = true;
    }
    if (sku === batterySku || desc.includes('smart storage battery')) {
      hasSmartBattery = true;
    }
    if (sku === noDriveSku || desc.includes('no drive')) {
      hasNoDriveKit = true;
    }
  }

  return { driveCount, hasStorageController, hasSmartBattery, hasNoDriveKit };
}

module.exports = {
  evalStorageTriMode
};
