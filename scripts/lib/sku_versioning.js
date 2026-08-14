'use strict';
/**
 * scripts/lib/sku_versioning.js — HPE SKU Data Layer Versioning & History Audit System
 *
 * Captures historical snapshots, price trails, attribute mutations, and checksums
 * for any SKU within the HPE product ecosystem.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { safeWriteJsonAtomic } = require('./fs_compat');

/**
 * Calculate SHA-256 checksum for a string or object.
 */
function calculateChecksum(data) {
  const content = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Get comprehensive audit timeline and version history for a given SKU.
 * @param {string} targetSku - Cleaned HPE SKU (e.g. 'P73282-B21' or 'P02498-B21')
 * @param {string} chassisDir - Relative or absolute path to chassis folder
 * @returns {object} Audit trail with price history, attribute changes, snapshots, and current status
 */
function getSkuAuditHistory(targetSku, chassisDir) {
  if (!targetSku) throw new Error('Target SKU is required for version audit');
  
  const cleanSku = String(targetSku).replace(/[^a-zA-Z0-9\-]/g, '').trim();
  const historyDir = path.join(chassisDir, 'history');
  
  const auditResult = {
    sku: cleanSku,
    chassisDir,
    auditedAt: new Date().toISOString(),
    currentStatus: 'UNKNOWN',
    latestDetails: null,
    priceTimeline: [],
    attributeMutations: [],
    discontinuedInfo: null,
    snapshotOccurrences: []
  };

  if (!fs.existsSync(historyDir)) {
    return auditResult;
  }

  // 1. Read price history
  const priceHistoryPath = path.join(historyDir, 'price_history.json');
  if (fs.existsSync(priceHistoryPath)) {
    try {
      const priceHistory = JSON.parse(fs.readFileSync(priceHistoryPath, 'utf-8'));
      if (priceHistory[cleanSku]) {
        auditResult.priceTimeline = priceHistory[cleanSku];
      }
    } catch (err) {
      console.warn(`[sku_versioning] Error reading price_history.json: ${err.message}`);
    }
  }

  // 2. Read attribute mutations
  const attrHistoryPath = path.join(historyDir, 'attribute_history.json');
  if (fs.existsSync(attrHistoryPath)) {
    try {
      const attrHistory = JSON.parse(fs.readFileSync(attrHistoryPath, 'utf-8'));
      if (Array.isArray(attrHistory)) {
        auditResult.attributeMutations = attrHistory.filter(item => 
          item.productNumber === cleanSku || item.sku === cleanSku
        );
      }
    } catch (err) {
      console.warn(`[sku_versioning] Error reading attribute_history.json: ${err.message}`);
    }
  }

  // 3. Read discontinued SKUs log
  const discontinuedPath = path.join(historyDir, 'discontinued_skus.json');
  if (fs.existsSync(discontinuedPath)) {
    try {
      const discontinuedList = JSON.parse(fs.readFileSync(discontinuedPath, 'utf-8'));
      if (Array.isArray(discontinuedList)) {
        const match = discontinuedList.find(d => d.productNumber === cleanSku || d.sku === cleanSku);
        if (match) {
          auditResult.discontinuedInfo = match;
          auditResult.currentStatus = 'DISCONTINUED';
        }
      }
    } catch (err) {
      console.warn(`[sku_versioning] Error reading discontinued_skus.json: ${err.message}`);
    }
  }

  // 4. Scan catalog snapshots
  const snapshots = fs.readdirSync(historyDir)
    .filter(f => f.startsWith('catalog_') && f.endsWith('.json') && f !== 'catalog_deltas.json')
    .sort();

  for (const file of snapshots) {
    const snapshotPath = path.join(historyDir, file);
    try {
      const content = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
      if (!content || typeof content !== 'object') continue;
      const scrapeDate = content.metadata?.scrapeDate || file.replace('catalog_', '').replace('.json', '');
      const checksum = calculateChecksum(content);

      let foundInSnapshot = false;
      let skuDetails = null;

      const entriesList = Array.isArray(content.entries) ? content.entries : [];
      for (const entry of entriesList) {
        const skusList = Array.isArray(entry.skus) ? entry.skus : [];
        for (const s of skusList) {
          const skuCode = s.sku || s['Product #'] || s['SKU'];
          if (skuCode === cleanSku) {
            foundInSnapshot = true;
            skuDetails = {
              parentCategory: entry.parentCategory,
              subCategory: entry.subCategory,
              description: s.description || s['Description'] || '',
              priceUsd: s.priceUsd || s['Unit Price (USD)'] || '0.00',
              optionType: s.optionType || s['Option Type'] || ''
            };
            break;
          }
        }
        if (foundInSnapshot) break;
      }

      if (foundInSnapshot) {
        if (auditResult.currentStatus !== 'DISCONTINUED') {
          auditResult.currentStatus = 'ACTIVE';
        }
        auditResult.latestDetails = skuDetails;
        auditResult.snapshotOccurrences.push({
          snapshotFile: file,
          scrapeDate,
          snapshotChecksum: checksum,
          skuDetails
        });
      }
    } catch (err) {
      console.warn(`[sku_versioning] Error reading snapshot ${file}: ${err.message}`);
    }
  }

  return auditResult;
}

/**
 * Record a version snapshot of a catalog JSON payload with checksums.
 */
function recordVersionSnapshot(catalogData, historyDir) {
  fs.mkdirSync(historyDir, { recursive: true });
  const scrapeDate = catalogData.metadata?.scrapeDate || new Date().toISOString().split('T')[0];
  const snapshotPath = path.join(historyDir, `catalog_${scrapeDate}.json`);

  const checksum = calculateChecksum(catalogData);
  const versionedCatalog = {
    ...catalogData,
    metadata: {
      ...(catalogData.metadata || {}),
      snapshotChecksum: checksum,
      snapshotTimestamp: new Date().toISOString()
    }
  };

  safeWriteJsonAtomic(snapshotPath, versionedCatalog);
  return { snapshotPath, checksum, scrapeDate };
}

module.exports = {
  calculateChecksum,
  getSkuAuditHistory,
  recordVersionSnapshot
};
