'use strict';
/**
 * scripts/maintenance/generate_portfolio_status.js — Dynamic Portfolio Status Markdown Generator
 * Usage: node scripts/maintenance/generate_portfolio_status.js (or npm run status:sync)
 *
 * Inspects on-disk catalog metadata and scripts/config/catalog_coverage_profiles.json,
 * cleanly separating active catalogs from archivedStub legacy stubs (INV-276).
 */

const fs = require('fs');
const path = require('path');
const { listAllCatalogs, collectKnowledgeDeltas } = require('../lib/catalog/catalog_discovery.js');
const { safeWriteTextAtomic } = require('../lib/system/fs_compat.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUTS_ROOT = path.join(PROJECT_ROOT, 'outputs');
const COVERAGE_PROFILES_PATH = path.join(PROJECT_ROOT, 'scripts', 'config', 'catalog_coverage_profiles.json');
const TARGET_DOC = path.join(PROJECT_ROOT, '.agents', 'PORTFOLIO_STATUS.md');

function _loadArchivedStubSet() {
  const stubs = new Set(['Alletra_Storage_System', 'GX5000_General_RACK']);
  if (!fs.existsSync(COVERAGE_PROFILES_PATH)) return stubs;
  try {
    const parsed = JSON.parse(fs.readFileSync(COVERAGE_PROFILES_PATH, 'utf8'));
    for (const [id, profile] of Object.entries(parsed.profiles || {})) {
      if (profile?.archivedStub === true || profile?.coverageStatus === 'ARCHIVED_STUB') {
        stubs.add(id);
      } else if (profile && profile.archivedStub === false) {
        stubs.delete(id);
      }
    }
  } catch { /* keep fallback stub list */ }
  return stubs;
}

function _normalizeRelDir(c) {
  const raw = String(c.relativeDir || c.dir || '').replace(/\\/g, '/');
  const m = raw.match(/(outputs\/.*)$/);
  return (m ? m[1] : raw).replace(/\//g, path.sep);
}

function _isQuarantinedStub(c, stubSet) {
  const dirName = path.basename(String(c.dir || c.relativeDir || '').replace(/[\\/]+$/, ''));
  const normalizedChassis = String(c.chassis || '').replace(/\s+/g, '_');
  return stubSet.has(dirName) || stubSet.has(c.chassis) || stubSet.has(normalizedChassis);
}

function _formatCatalogRows(rows, statusText) {
  return rows.map(c => {
    const excelStatus = c.hasExcel ? '✅ Present' : '❌ Missing';
    const pdfStatus = c.pdf ? `✅ ${c.pdf.sizeMb} MB` : '⚠️ Advisory (No PDF)';
    const diffStatus = c.hasDiffHistory ? '✅ Active' : 'Baseline';
    return `| \`${c.chassis}\` | \`${_normalizeRelDir(c)}\` | **${c.skuCount}** | ${excelStatus} | ${pdfStatus} | ${diffStatus} | ${statusText} |`;
  }).join('\n');
}

function generateMarkdown() {
  const allCatalogs = listAllCatalogs(OUTPUTS_ROOT);
  const stubSet = _loadArchivedStubSet();
  const activeCatalogs = allCatalogs.filter(c => !_isQuarantinedStub(c, stubSet));
  const quarantinedCatalogs = allCatalogs.filter(c => _isQuarantinedStub(c, stubSet));
  const deltas = collectKnowledgeDeltas(OUTPUTS_ROOT);
  const nowStr = new Date().toISOString().split('T')[0];

  const activeSKUs = activeCatalogs.reduce((acc, c) => acc + c.skuCount, 0);
  const header = `| Product Chassis | Relative Directory | SKUs on Disk | Excel Workbook | QuickSpecs PDF | Diff History | Status |\n| :--- | :--- | :--- | :--- | :--- | :--- | :--- |`;

  const lines = [
    `# Portfolio State of Health (Auto-Generated: ${nowStr})`,
    '',
    'This document is dynamically generated from on-disk catalog metadata and `scripts/config/catalog_coverage_profiles.json` by `scripts/maintenance/generate_portfolio_status.js`.',
    '',
    `### 📊 Active Scraped Catalogs (${activeCatalogs.length} Product Lines)`,
    '',
    header,
    _formatCatalogRows(activeCatalogs, 'Active catalog discovered; coverage and solution validation require separate evidence'),
    '',
    `**Active Catalog SKU Count (summed per product)**: **${activeSKUs}** across **${activeCatalogs.length} active product lines** (${quarantinedCatalogs.length} quarantined legacy stub(s) excluded). Shared SKUs may occur across products.`
  ];

  if (quarantinedCatalogs.length > 0) {
    lines.push(
      '',
      `### 🗄️ Quarantined Legacy Stubs (Excluded from Active Grounding — ${quarantinedCatalogs.length})`,
      '',
      header,
      _formatCatalogRows(quarantinedCatalogs, 'QUARANTINED_ARCHIVED_STUB (excluded from active grounding)')
    );
  }

  lines.push(
    '',
    '### 🧠 Learned KnowledgeDeltas',
    '',
    `- Total Closed-Loop Knowledge Deltas on Disk: **${deltas.length}**`,
    '',
    '### 🚀 Quick Commands',
    '',
    '- Re-sync portfolio & generate this document: `npm run status:sync`',
    '- Promote verified learnings (`>= 3` observations): `npm run learn:promote`',
    '- Lookup invariants quickly: `npm run docs:lookup -- INV-276`',
    '- Certify DL380 Gen12: `npm run certify:gen12`',
    '- Single-command Gen12 maintenance: `npm run maintain:gen12`',
    '- Portfolio maintenance: `npm run maintain:portfolio`',
    ''
  );

  safeWriteTextAtomic(TARGET_DOC, lines.join('\n'));
  console.log(`✅ Generated live portfolio status: ${path.relative(PROJECT_ROOT, TARGET_DOC)} (${activeCatalogs.length} active, ${quarantinedCatalogs.length} quarantined stubs)`);
}

generateMarkdown();
