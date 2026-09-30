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
    baseSku: entry.baseSku || null, family: entry.family, generation: entry.gen || entry.generation }));
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

function buildRefreshPlan({ products = [], filePath = null, query = null, vendor = 'HPE', force = false,
  definitions = loadProductDefinitions(), metadata = getProductGenerationMetadata } = {}) {
  const discovered = discoverAllProductCatalogs();
  const rows = [];
  const unresolved = [];
  const sheets = [];
  const add = (text, origin, explicit = false) => {
    const matches = explicit ? definitions.filter(entry => normalize(entry.product) === normalize(text)).map(entry => entry.product)
      : findProducts(text, definitions);
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
      const ignored = require('../boq/boq_parser.js').isNonBomSheet(name);
      const productsInSheet = new Set();
      inputRows.forEach((row, index) => {
        if (ignored) return;
        const text = row.join(' ');
        const matches = add(text, { source: 'WORKBOOK', sheet: name, row: index + 1 });
        matches.forEach(product => productsInSheet.add(product));
        // Unknown base equipment may coexist with recognized equipment on one sheet.
        if (!matches.length && /\b(?:cto\s+(?:server|base)|(?:DL|ML|RL)\s*\d{3}[a-z]?\b.*\bGen\s*\d+|poweredge|cisco\s+ucs)\b/i.test(text)) {
          unresolved.push({ sheet: name, row: index + 1, reason: 'UNRESOLVED_BASE_PRODUCT' });
        }
      });
      if (!ignored && inputRows.length && !productsInSheet.size && !products.length) {
        unresolved.push({ sheet: name, reason: 'NO_EXACT_PRODUCT_IN_SHEET' });
      }
      sheets.push({ name, rows: inputRows.length, status: ignored ? 'NON_BOM_SHEET' : 'INSPECTED', products: [...productsInSheet] });
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
