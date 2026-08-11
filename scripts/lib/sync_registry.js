'use strict';
/**
 * scripts/lib/sync_registry.js — Master Catalog Registry Auto-Synchronizer
 *
 * Scans outputs/ directory recursively for catalog JSON files, extracts metadata,
 * and synchronizes outputs/SCRAPED_CATALOGS.md table.
 */

const fs   = require('fs');
const path = require('path');
const { updateScrapedRegistry } = require('./registry');
const { convertCSVToCatalogJSON } = require('../csv_to_catalog');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUTS_ROOT = path.join(PROJECT_ROOT, 'outputs');

function autoSyncCSVs(dir) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir, { withFileTypes: true });
  const csvFile = items.find(i => i.isFile() && i.name.endsWith('_Catalog_SKUs.csv'));
  if (csvFile) {
    const csvPath = path.join(dir, csvFile.name);
    const jsonName = csvFile.name.replace(/_Catalog_SKUs\.csv$/, '_Catalog.json');
    const jsonPath = path.join(dir, jsonName);
    let needsSync = !fs.existsSync(jsonPath);
    if (!needsSync) {
      try {
        const content = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        const jsonSKUs = content.metadata?.totalUniqueSKUs || 0;
        const csvLines = fs.readFileSync(csvPath, 'utf-8').split('\n').filter(l => l.trim()).length;
        const csvSKUs = Math.max(0, csvLines - 1);
        if (jsonSKUs < csvSKUs) needsSync = true;
      } catch (e) { console.warn('Caught suppressed error in sync_registry.js:', e);
needsSync = true; }
    }
    if (needsSync) {
      try { convertCSVToCatalogJSON(csvPath, jsonPath); } catch (e) { console.error(`Error auto-converting ${csvFile.name}:`, e.message); }
    }
  }
  for (const item of items) {
    if (item.isDirectory() && item.name !== 'history' && item.name !== 'raw_data' && item.name !== 'intermittent_scraps') {
      autoSyncCSVs(path.join(dir, item.name));
    }
  }
}

function findCatalogJsonFiles(dir, visitedInodes = new Set()) {
  let results = [];
  if (!fs.existsSync(dir)) return results;

  try {
    const dirStat = fs.lstatSync(dir);
    if (dirStat.ino && visitedInodes.has(dirStat.ino)) return results;
    if (dirStat.ino) visitedInodes.add(dirStat.ino);
  } catch (e) { console.warn('Caught suppressed error in sync_registry.js:', e); }

  const list = fs.readdirSync(dir);

  list.forEach(file => {
    if (file.startsWith('.')) return; // Skip dotfiles (.DS_Store, etc)
    const filePath = path.join(dir, file);
    try {
      const stat = fs.lstatSync(filePath);
      if (stat && stat.isSymbolicLink()) {
        return; // Skip directory symlinks to avoid circular reference loops
      }
      if (stat && stat.isDirectory()) {
        results = results.concat(findCatalogJsonFiles(filePath, visitedInodes));
      } else if (file.endsWith('_Catalog.json') && !filePath.includes('raw_data')) {
        results.push(filePath);
      }
    } catch (err) {
      console.warn(`  ⚠️ Could not stat ${filePath}: ${err.message}`);
    }
  });

  return results;
}

function syncRegistry() {
  console.log('================================================================');
  console.log('🔄 SYNCHRONIZING MASTER CATALOG REGISTRY (outputs/SCRAPED_CATALOGS.md)');
  console.log('================================================================\n');

  autoSyncCSVs(OUTPUTS_ROOT);
  const jsonFiles = findCatalogJsonFiles(OUTPUTS_ROOT);
  console.log(`Found ${jsonFiles.length} catalog JSON companion file(s) in outputs/.\n`);

  jsonFiles.sort().forEach(jsonPath => {
    try {
      const data     = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      const meta     = data.metadata || {};
      const dir      = path.dirname(jsonPath);
      const fileBase = path.basename(jsonPath, '_Catalog.json');

      const xlsxPath = path.join(dir, `${fileBase}_OCA_Catalog.xlsx`);
      let pdfPath    = path.join(dir, `HPE_${fileBase}_QuickSpecs.pdf`);
      if (!fs.existsSync(pdfPath)) {
        const pdfs = fs.readdirSync(dir).filter(f => f.endsWith('.pdf'));
        pdfPath = pdfs.length > 0 ? path.join(dir, pdfs[0]) : null;
      }

      // Infer family, gen, model from relative path structure
      const relPath = path.relative(OUTPUTS_ROOT, dir);
      const parts   = relPath.split(path.sep); // e.g. ["ProLiant", "Gen12", "DL380_Gen12_SFF"]

      const family  = parts[0] || 'HPE';
      const gen     = parts[1] || 'General';
      const chassis = parts[2] || fileBase;

      updateScrapedRegistry({
        timestamp:    meta.scrapeDate || new Date().toISOString(),
        solutionName: meta.chassis    || fileBase,
        family,
        gen,
        chassisName:  chassis,
        skuCount:     meta.totalUniqueSKUs || 0,
        xlsxPath:     fs.existsSync(xlsxPath) ? xlsxPath : jsonPath,
        jsonPath,
        pdfPath:      pdfPath && fs.existsSync(pdfPath) ? pdfPath : null,
        outputDir:    dir
      });
    } catch (err) {
      console.warn(`⚠️ Could not parse metadata from ${path.basename(jsonPath)}:`, err.message);
    }
  });

  console.log('\n================================================================');
  console.log('🎉 REGISTRY SYNCHRONIZATION COMPLETE!');
  console.log('================================================================\n');
}

if (require.main === module) {
  syncRegistry();
}

module.exports = { syncRegistry, findCatalogJsonFiles };
