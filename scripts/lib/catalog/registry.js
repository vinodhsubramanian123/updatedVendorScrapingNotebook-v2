'use strict';
/**
 * scripts/lib/registry.js — Shared Master Catalog Registry Updater
 *
 * Maintains outputs/SCRAPED_CATALOGS.md table of scraped product catalogs.
 * Imported by scrape_oca_solution.js, scrape_oca_storage_solution.js, and sync_registry.js (DRY).
 */

const fs   = require('fs');
const path = require('path');
const { toForwardSlash, safeWriteTextAtomic, withFileLock } = require('../system/fs_compat.js');

const PROJECT_ROOT  = path.resolve(__dirname, '..', '..', '..');
const OUTPUTS_ROOT  = path.join(PROJECT_ROOT, 'outputs');
const REGISTRY_PATH = path.join(OUTPUTS_ROOT, 'SCRAPED_CATALOGS.md');

/**
 * Update outputs/SCRAPED_CATALOGS.md with a new or updated scrape entry.
 * @param {object} info - Scrape details object
 */
function updateScrapedRegistry(info) {
  const dateStr  = (info.timestamp || new Date().toISOString()).substring(0, 10);

  // Convert all paths to clean outputs-relative paths for SCRAPED_CATALOGS.md
  const relXlsx = toForwardSlash(path.relative(OUTPUTS_ROOT, info.xlsxPath));
  const relJson = toForwardSlash(path.relative(OUTPUTS_ROOT, info.jsonPath));
  const relPdf  = info.pdfPath ? toForwardSlash(path.relative(OUTPUTS_ROOT, info.pdfPath)) : null;
  const pdfStr  = relPdf ? `[PDF](${relPdf})` : 'Advisory (No QS Link)';

  const normOutputDir = toForwardSlash(info.outputDir);
  const relOutputDir  = normOutputDir.replace(/.*\/outputs\//, 'outputs/').replace(/\/+$/, '') + '/';

  const skuDisplayCount = info.skuCount !== undefined ? info.skuCount : (info.tablesCount || 0);
  let learnedCount = info.learnedCount !== undefined ? info.learnedCount : 0;
  if (learnedCount === 0 && info.outputDir) {
    const deltasP1 = path.join(info.outputDir, 'history', 'catalog_deltas.json');
    const deltasP2 = path.join(info.outputDir, 'catalog_deltas.json');
    const candidatePath = fs.existsSync(deltasP1) ? deltasP1 : (fs.existsSync(deltasP2) ? deltasP2 : null);
    if (candidatePath) {
      try {
        const deltas = JSON.parse(fs.readFileSync(candidatePath, 'utf-8'));
        learnedCount = Array.isArray(deltas) ? deltas.length : (Array.isArray(deltas?.rules) ? deltas.rules.length : 0);
      } catch (_) {}
    }
  }

  const newRow =
    `| ${dateStr} | ${info.solutionName || 'OCA Solution'} | ${info.family} | ` +
    `${info.gen} | \`${info.chassisName}\` | **${skuDisplayCount}** | **${learnedCount}** | ` +
    `[${path.basename(relXlsx)}](${relXlsx}) | [${path.basename(relJson)}](${relJson}) | ` +
    `${pdfStr} | \`${relOutputDir}\` |\n`;

  const writeRegistry = () => {
    let currentContent = '';
    if (fs.existsSync(REGISTRY_PATH)) {
      currentContent = fs.readFileSync(REGISTRY_PATH, 'utf-8');
    } else {
      currentContent =
        `# Master Scraped HPE Product Catalogs Registry\n\n` +
        `## Scraped Product Catalogs\n\n` +
        `| Date | Solution Name | Family | Gen | Chassis (prefix) | Total SKUs | Learned Rules | Excel | JSON | PDF | Output Folder |\n` +
        `| :--- | :--- | :--- | :--- | :--- | ---: | ---: | :--- | :--- | :--- | :--- |\n`;
    }

    const lines = currentContent.split('\n');
    const existingLineIndex = lines.findIndex(line => line.includes(`\`${relOutputDir}\``));

    if (existingLineIndex > -1) {
      lines[existingLineIndex] = newRow.trim();
      currentContent = lines.join('\n');
      if (!currentContent.includes('| Learned Rules |')) {
        currentContent = currentContent.replace('| Total SKUs | Excel |', '| Total SKUs | Learned Rules | Excel |');
        currentContent = currentContent.replace('| Sheets / Entries | Excel Workbook |', '| Sheets / Entries | Learned Rules | Excel Workbook |');
        currentContent = currentContent.replace('| :--- | :--- | :--- | :--- | :--- | ---: | :--- | :--- | :--- | :--- |', '| :--- | :--- | :--- | :--- | :--- | ---: | ---: | :--- | :--- | :--- | :--- |');
        currentContent = currentContent.replace('|------|--------------|--------|-----|-------------|------------------|----------------|--------------|----------------|-------------|', '|------|--------------|--------|-----|-------------|------------------|---------------|----------------|--------------|----------------|-------------|');
      }
      if (process.env.NODE_ENV === 'test') {
        fs.writeFileSync(REGISTRY_PATH, currentContent);
      } else {
        safeWriteTextAtomic(REGISTRY_PATH, currentContent);
      }
      console.log(`Updated existing row in Master Registry for: ${relOutputDir}`);
    } else {
      const divider = '| :--- | :--- | :--- | :--- | :--- | ---: | ---: | :--- | :--- | :--- | :--- |\n';
      if (currentContent.includes(divider)) {
        currentContent = currentContent.replace(divider, divider + newRow);
      } else {
        currentContent += newRow;
      }
      if (process.env.NODE_ENV === 'test') {
        fs.writeFileSync(REGISTRY_PATH, currentContent);
      } else {
        safeWriteTextAtomic(REGISTRY_PATH, currentContent);
      }
      console.log(`Added new row to Master Registry: ${relOutputDir}`);
    }
  };

  if (process.env.NODE_ENV === 'test') {
    writeRegistry();
  } else {
    withFileLock(REGISTRY_PATH, writeRegistry);
  }
}

module.exports = { updateScrapedRegistry, REGISTRY_PATH };
