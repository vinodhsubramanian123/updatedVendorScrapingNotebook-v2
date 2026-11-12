'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { discoverAllProductCatalogs, getProductGenerationMetadata } = require('./product_metadata_manager.js');
const { safeWriteJsonAtomic } = require('../system/fs_compat.js');
const ROOT = path.resolve(__dirname, '../../..');
const normalize = text => String(text || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function loadProductDefinitions() {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/config/notebooks.json'), 'utf8'));
  return Object.entries(cfg.notebooks).map(([product, entry]) => ({ product, vendor: entry.vendor || 'HPE',
    baseSku: entry.baseSku || null, requireExactOcaBase: entry.requireExactOcaBase === true || entry.captureViaParent === true }));
}

function matchExplicitProduct(text, definitions) {
  const exact = normalize(text);
  return definitions.filter(entry => normalize(entry.product) === exact || (entry.baseSku && normalize(entry.baseSku) === exact))
    .map(entry => entry.product);
}

function findProducts(text, definitions) {
  const canonical = String(text || '').replace(/_/g, ' ');
  return definitions.filter(entry => {
    const tokens = entry.product.split('_').map(token => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const exact = new RegExp(`(^|[^a-z0-9])${tokens.join('[\\s_-]+')}([^a-z0-9]|$)`, 'i');
    if (exact.test(canonical)) return true;
    if (entry.baseSku && new RegExp(`(^|[^a-z0-9])${entry.baseSku}([^a-z0-9]|$)`, 'i').test(canonical)) return true;
    const parsed = require('./product_meta.js').parseProductMeta(canonical);
    return normalize(parsed.cleanName) === normalize(entry.product);
  }).map(entry => entry.product);
}

function getSheetLayout(rows) {
  const header = rows.findIndex(row => row.some(cell => ['product', 'productnumber', 'partnumber', 'sku'].includes(normalize(cell)))
    && row.some(cell => ['description', 'productdescription'].includes(normalize(cell))));
  const columns = (rows[header] || []).map(normalize);
  return {
    header,
    sku: columns.findIndex(cell => ['product', 'productnumber', 'partnumber', 'sku'].includes(cell)),
    description: columns.findIndex(cell => ['description', 'productdescription'].includes(cell)),
    owner: columns.indexOf('configname'),
    isSummary: header === -1 && rows.some(row => {
      const names = row.map(normalize);
      return names.includes('category') && names.includes('categorylistpriceusd') && names.includes('totallistpriceusd');
    })
  };
}

function isUnmappedBase(row, layout) {
  const description = String(layout.description >= 0 ? row[layout.description] ?? '' : row.join(' '));
  if (/\b(?:(?:cto|configure[ -]+to[ -]+order)\s+(?:server|base|frame|rack|enclosure|chassis|compute module)|(?:DL|ML|RL)\s*\d{3}[a-z]?\b.*\bGen\s*\d+|poweredge|cisco\s+ucs)\b/i.test(description)) return true;
  const owner = String(row[layout.owner] || '').replace(/\s*#\d+\s*$/, '');
  return Boolean(owner && normalize(description).endsWith(normalize(owner)) &&
    /\b(?:frame link module|(?:fibre|fiber) channel module|compute module|interconnect module|virtual connect)\b/i.test(owner));
}

function inspectWorkbookSheet(name, inputRows, definitions, add, unresolved, explicitProducts) {
  const layout = getSheetLayout(inputRows);
  const ignored = layout.isSummary || require('../boq/boq_parser.js').isNonBomSheet(name);
  const products = new Set();
  if (!ignored) inputRows.forEach((row, index) => {
    if (index <= layout.header) return;
    const sku = String(row[layout.sku] || '').trim();
    const origin = { source: 'WORKBOOK', sheet: name, row: index + 1 };
    const baseSku = sku.split(/\s+/)[0];
    const exact = baseSku ? matchExplicitProduct(baseSku, definitions) : [];
    const description = layout.description >= 0 ? row[layout.description] : row.join(' ');
    const eligibleDefinitions = baseSku ? definitions.filter(entry => !entry.requireExactOcaBase) : definitions;
    const inferred = exact.length ? [] : findProducts(description, eligibleDefinitions);
    const matches = exact.length ? add(baseSku, origin, true) : inferred.flatMap(product => add(product, origin, true));
    matches.forEach(product => products.add(product));
    if (!matches.length && isUnmappedBase(row, layout)) {
      unresolved.push({ ...origin, sku: sku || null, reason: 'UNRESOLVED_BASE_PRODUCT' });
    }
  });
  if (!ignored && inputRows.length && !products.size && !explicitProducts) {
    unresolved.push({ sheet: name, reason: 'NO_EXACT_PRODUCT_IN_SHEET' });
  }
  return { name, rows: inputRows.length, status: ignored ? 'NON_BOM_SHEET' : 'INSPECTED', products: [...products] };
}

function buildRefreshPlan({ products = [], filePath = null, query = null, vendor = 'HPE', force = false,
  definitions = loadProductDefinitions(), metadata = getProductGenerationMetadata } = {}) {
  const discovered = discoverAllProductCatalogs();
  const rows = [];
  const unresolved = [];
  const sheets = [];
  const add = (text, origin, explicit = false) => {
    const matches = explicit ? matchExplicitProduct(text, definitions) : findProducts(text, definitions);
    if (!matches.length && explicit) unresolved.push({ ...origin, reason: 'EXACT_PRODUCT_MAPPING_REQUIRED', requested: text });
    for (const product of matches) rows.push({ ...origin, product });
    return matches;
  };
  for (const product of products) add(product, { source: 'EXPLICIT_PRODUCT' }, true);
  if (query && !add(query, { source: 'QUERY' }).length) unresolved.push({ source: 'QUERY', reason: 'EXACT_PRODUCT_MAPPING_REQUIRED' });
  if (filePath) {
    const xlsx = require('xlsx-js-style');
    const wb = xlsx.readFile(filePath);
    for (const name of wb.SheetNames) {
      const inputRows = xlsx.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' });
      sheets.push(inspectWorkbookSheet(name, inputRows, definitions, add, unresolved, products.length > 0));
    }
  }
  const tasks = [...new Set(rows.map(row => row.product))].map(product => {
    const identity = definitions.find(entry => entry.product === product);
    const current = metadata(product, discovered);
    const supported = normalize(vendor) === 'hpe' && normalize(identity.vendor) === 'hpe';
    const action = !supported ? 'UNSUPPORTED_VENDOR' : force || current.needsResync ? (current.exists ? 'REFRESH' : 'FIRST_CAPTURE')
      : current.notebook?.syncState !== 'VERIFIED' || !current.notebook?.catalogMatches ? 'SYNC_ONLY' : 'REUSE';
    return { product, vendor: identity.vendor, action, capturedAt: current.scrapeTimestamp || null,
      catalogSha256: current.catalogSha256 || null, origins: rows.filter(row => row.product === product) };
  });
  return { schemaVersion: 1, createdAt: new Date().toISOString(), vendor, sheets, tasks, unresolved,
    ready: tasks.length > 0 && !unresolved.length && tasks.every(task => task.action !== 'UNSUPPORTED_VENDOR') };
}

// Sequential on purpose: the authenticated OCA browser is one mutable session.
function executeRefreshPlan(plan, { run = execFileSync, metadata = getProductGenerationMetadata } = {}) {
  if (!plan.ready) throw new Error('CATALOG_PLAN_UNRESOLVED: See exact product/vendor/sheet gaps in the plan');
  const results = [];
  for (const task of plan.tasks) {
    if (task.action === 'REUSE') { results.push({ ...task, status: 'REUSED' }); continue; }
    const dir = path.join(ROOT, 'outputs', 'history', 'catalog_refresh_runs');
    fs.mkdirSync(dir, { recursive: true });
    const id = `${Date.now()}-${process.pid}-${task.product}`;
    const logPath = path.join(dir, `${id}.log`);
    const fd = fs.openSync(logPath, 'w');
    const args = task.action === 'SYNC_ONLY'
      ? [path.join(ROOT, 'scripts/lib/sync/knowledge_sync.js'), '--chassis', task.product, '--auto-upload-nlm', '--confirm-source-retirement']
      : [path.join(ROOT, 'scripts/scrapers/scrape_oca_solution.js'), '--chassis', task.product, '--confirm-source-retirement'];
    let result;
    try {
      run(process.execPath, args, { cwd: ROOT, stdio: ['ignore', fd, fd], timeout: 45 * 60 * 1000, windowsHide: true });
      const after = metadata(task.product);
      if (after.needsResync || after.notebook?.syncState !== 'VERIFIED' || !after.notebook?.catalogMatches) {
        throw new Error('Post-run freshness or cloud fingerprint verification incomplete');
      }
      result = { ...task, status: 'VERIFIED', logPath, capturedAt: after.scrapeTimestamp, catalogSha256: after.catalogSha256 };
    } catch (error) {
      result = { ...task, status: 'FAILED', logPath, error: error.message };
    } finally { fs.closeSync(fd); }
    safeWriteJsonAtomic(path.join(dir, `${id}.json`), result);
    results.push(result);
    if (result.status === 'FAILED') break;
  }
  return { success: results.length === plan.tasks.length && results.every(result => result.status !== 'FAILED'), results };
}
module.exports = { buildRefreshPlan, executeRefreshPlan, findProducts };
