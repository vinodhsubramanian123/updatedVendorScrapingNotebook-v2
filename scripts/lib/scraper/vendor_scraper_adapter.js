'use strict';
/**
 * scripts/lib/scraper/vendor_scraper_adapter.js
 *
 * Multi-vendor row normalization scaffolding (portal extraction unsupported)
 *
 * Decouples portal scraping and catalog building from HPE-specific WebLogic DOM.
 * Maps disparate vendor configurator UIs (HPE OCA, Dell Premier, Cisco CCW, Generic)
 * into canonical catalog items.
 */

const { cleanBaseSKU } = require('../catalog/sku.js');
const { classifyComponentRole } = require('../catalog/product_meta.js');

class BaseVendorScraperAdapter {
  constructor(vendor = 'Generic') {
    this.vendor = vendor;
    this.capabilities = { rowNormalization: true, portalExtraction: false };
  }

  detectPortal(url = '', html = '') {
    return false;
  }

  async extractCatalogTree(ws, sendCommand) {
    throw new Error(`extractCatalogTree() not implemented for ${this.vendor}`);
  }

  normalizeRawCatalogRow(rawRow, context = {}) {
    return {
      vendor: this.vendor,
      sku: cleanBaseSKU(rawRow.sku || rawRow.partNumber || ''),
      description: String(rawRow.description || rawRow.desc || '').trim(),
      listPriceUsd: Number(rawRow.price || rawRow.listPrice || 0),
      parentCategory: String(rawRow.category || rawRow.parentCategory || 'Hardware Options'),
      componentRole: classifyComponentRole(rawRow.category || '', rawRow.description || '')
    };
  }
}

class HpeOcaAdapter extends BaseVendorScraperAdapter {
  constructor() {
    super('HPE');
  }

  detectPortal(url = '', html = '') {
    return /partner\.hpe\.com|oca\.ext\.hpe\.com|weblogic/i.test(url) || /ocaBodyTextSnapshot|one\s*config\s*advanced/i.test(html);
  }

  normalizeRawCatalogRow(rawRow, context = {}) {
    const norm = super.normalizeRawCatalogRow(rawRow, context);
    norm.vendor = 'HPE';
    norm.isFioOption = /fio\b/i.test(norm.description);
    norm.isBtoOption = /bto\b/i.test(norm.description);
    return norm;
  }
}

class DellPremierAdapter extends BaseVendorScraperAdapter {
  constructor() {
    super('Dell');
  }

  detectPortal(url = '', html = '') {
    return /dell\.com|premier\.dell\.com|dsa\.dell\.com/i.test(url) || /poweredge|idrac|percc/i.test(html);
  }

  normalizeRawCatalogRow(rawRow, context = {}) {
    const norm = super.normalizeRawCatalogRow(rawRow, context);
    norm.vendor = 'Dell';
    return norm;
  }
}

class CiscoCcwAdapter extends BaseVendorScraperAdapter {
  constructor() {
    super('Cisco');
  }

  detectPortal(url = '', html = '') {
    return /cisco\.com|apps\.cisco\.com\/ccw/i.test(url) || /cisco\s*commerce|intersight/i.test(html);
  }

  normalizeRawCatalogRow(rawRow, context = {}) {
    const norm = super.normalizeRawCatalogRow(rawRow, context);
    norm.vendor = 'Cisco';
    return norm;
  }
}

class GenericSpreadsheetAdapter extends BaseVendorScraperAdapter {
  constructor() {
    super('Generic');
  }

  detectPortal() {
    return true; // Default fallback
  }
}

const ADAPTERS = [
  new HpeOcaAdapter(),
  new DellPremierAdapter(),
  new CiscoCcwAdapter(),
  new GenericSpreadsheetAdapter()
];

function getScraperAdapterForPortal(url = '', html = '') {
  for (const adapter of ADAPTERS) {
    if (adapter.detectPortal(url, html)) {
      return adapter;
    }
  }
  return new GenericSpreadsheetAdapter();
}

module.exports = {
  BaseVendorScraperAdapter,
  HpeOcaAdapter,
  DellPremierAdapter,
  CiscoCcwAdapter,
  GenericSpreadsheetAdapter,
  getScraperAdapterForPortal
};
