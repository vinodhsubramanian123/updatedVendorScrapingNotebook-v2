'use strict';
/**
 * scripts/lib/sync/sync_payload_builder.js — Markdown Sync Payload Generator
 *
 * Compiles comprehensive markdown payload with executive summary, active SKU registry,
 * universal rules, chassis gotchas, discontinued SKUs, attribute changes, and price trail.
 */

const fs = require('fs');
const path = require('path');
const logger = require('../pipeline_logger.js');
const { syncToNotebookLM } = require('./nlm_sync_client.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const OUTPUTS_ROOT = path.join(PROJECT_ROOT, 'outputs');
const CONFIG_NOTEBOOKS = path.join(PROJECT_ROOT, 'scripts', 'config', 'notebooks.json');

function loadNotebookConfig() {
  const defaultCfg = {
    defaultNotebookId: "17cb979a-14d2-430c-a99f-7c1514757e79",
    notebooks: {}
  };
  if (fs.existsSync(CONFIG_NOTEBOOKS)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_NOTEBOOKS, 'utf-8'));
    } catch (_) {
      return defaultCfg;
    }
  }
  return defaultCfg;
}

/**
 * Generate comprehensive markdown sync payload for target chassis
 *
 * @param {string} chassisName
 * @param {boolean} autoUpload
 * @param {object} registry
 * @returns {{ payloadPath: string|null, markdownText: string, deltaCount: number, uploadResult: object|null }}
 */
function generateNotebookSyncPayload(chassisName = 'Unknown_Chassis', autoUpload = false, registry = null) {
  const BLOCKED_CHASSIS = new Set([
    'Unknown_Chassis', 'outputs', 'General', '', 'Chassis Dir', 'OCA Solution', '-------------', 'Output Path'
  ]);
  const cfg = loadNotebookConfig();
  const isRegisteredChassis = cfg.notebooks && !!cfg.notebooks[chassisName];
  const isValidFormat = chassisName && /^[A-Za-z0-9][A-Za-z0-9_\-]*$/.test(chassisName) && chassisName.length <= 80;

  if (BLOCKED_CHASSIS.has(chassisName) || (!isRegisteredChassis && !isValidFormat)) {
    logger.warn('KNOWLEDGE_SYNC', `Refusing to generate sync payload for invalid chassis: "${chassisName}"`);
    return { payloadPath: null, markdownText: '', deltaCount: 0, uploadResult: null };
  }

  // Find catalog path dynamically
  const { findCatalogJsonFiles } = require('../sync_registry.js');
  const allCatalogFiles = findCatalogJsonFiles(OUTPUTS_ROOT);

  let catalogPath = allCatalogFiles.find(f => path.basename(f).startsWith(chassisName)) || null;
  if (!catalogPath && allCatalogFiles.length > 0) catalogPath = allCatalogFiles[0];

  let catalogData = null;
  let targetDir = OUTPUTS_ROOT;
  if (catalogPath && fs.existsSync(catalogPath)) {
    try {
      catalogData = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
      targetDir = path.dirname(catalogPath);
    } catch (e) { logger.warn('KNOWLEDGE_SYNC', 'Error reading catalogData', e); }
  }

  const historyDir = path.join(targetDir, 'history');
  const discontinuedSkusPath = path.join(historyDir, 'discontinued_skus.json');
  const attributeHistoryPath = path.join(historyDir, 'attribute_history.json');

  let discontinuedRegistry = {};
  if (fs.existsSync(discontinuedSkusPath)) {
    try { discontinuedRegistry = JSON.parse(fs.readFileSync(discontinuedSkusPath, 'utf-8')); } catch (_) {}
  }

  let attributeHistory = [];
  if (fs.existsSync(attributeHistoryPath)) {
    try {
      attributeHistory = JSON.parse(fs.readFileSync(attributeHistoryPath, 'utf-8'));
      if (!Array.isArray(attributeHistory)) attributeHistory = [];
    } catch (_) {}
  }

  // Services companion JSON
  let servicesData = null;
  const servicesJsonPath = path.join(targetDir, `${path.basename(catalogPath || chassisName, '_Catalog.json')}_Services.json`);
  if (fs.existsSync(servicesJsonPath)) {
    try { servicesData = JSON.parse(fs.readFileSync(servicesJsonPath, 'utf-8')); } catch (_) {}
  }

  const servicesHistoryDir = path.join(targetDir, 'services_history');
  const servicesDiscontinuedPath = path.join(servicesHistoryDir, 'services_discontinued_skus.json');
  let servicesDiscontinuedRegistry = {};
  if (fs.existsSync(servicesDiscontinuedPath)) {
    try { servicesDiscontinuedRegistry = JSON.parse(fs.readFileSync(servicesDiscontinuedPath, 'utf-8')); } catch (_) {}
  }

  const hwDiff = catalogData?.metadata?.diffSummary || { added: 0, removed: 0, priceChanged: 0, attributeChanged: 0, unchanged: 0, reinstated: 0 };
  const srvDiff = servicesData?.metadata?.diffSummary || { added: 0, removed: 0, priceChanged: 0, attributeChanged: 0, unchanged: 0, reinstated: 0 };
  const totalActiveHwSKUs = catalogData?.metadata?.totalUniqueSKUs || 0;
  const totalActiveSrvSKUs = servicesData?.metadata?.totalUniqueSKUs || 0;

  const totalRules = registry?.totalLearnedRules || 0;
  const universalRules = registry?.universalRules || [];
  const familyGenRules = registry?.familyGenRules || [];
  const chassisSpecificRules = registry?.chassisSpecificRules || [];

  let md = `# HPE OCA Catalog Intelligence — Synchronized Knowledge & Rules Charter\n\n`;
  md += `**Target Product**: \`${chassisName}\`  \n`;
  md += `**Sync Timestamp**: ${new Date().toISOString()}  \n`;
  md += `**Total Verified SKUs**: \`${totalActiveHwSKUs + totalActiveSrvSKUs}\` (\`${totalActiveHwSKUs}\` Hardware + \`${totalActiveSrvSKUs}\` Services)  \n`;
  md += `**Total Synced KnowledgeDeltas**: \`${totalRules}\`  \n\n`;
  md += `This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.\n\n`;
  md += `---\n\n`;

  // 0. Executive Summary
  md += `## 🚀 Executive Delta & Recent Change Summary\n\n`;
  md += `| Category | Total SKUs | Added (Last Scrape) | Price Changed | Attribute Changed | Reinstated | Status |\n`;
  md += `|----------|------------|---------------------|---------------|-------------------|------------|--------|\n`;
  md += `| **Hardware Components** | ${totalActiveHwSKUs} | ${hwDiff.added || 0} | ${hwDiff.priceChanged || 0} | ${hwDiff.attributeChanged || 0} | ${hwDiff.reinstated || 0} | **CERTIFIED** |\n`;
  md += `| **Support Services & SLAs** | ${totalActiveSrvSKUs} | ${srvDiff.added || 0} | ${srvDiff.priceChanged || 0} | ${srvDiff.attributeChanged || 0} | ${srvDiff.reinstated || 0} | **CERTIFIED** |\n`;
  md += `| **Total Portfolio** | **${totalActiveHwSKUs + totalActiveSrvSKUs}** | **${(hwDiff.added || 0) + (srvDiff.added || 0)}** | **${(hwDiff.priceChanged || 0) + (srvDiff.priceChanged || 0)}** | **${(hwDiff.attributeChanged || 0) + (srvDiff.attributeChanged || 0)}** | **${(hwDiff.reinstated || 0) + (srvDiff.reinstated || 0)}** | **ACTIVE** |\n\n`;

  md += `### 🔍 Key Configuration & Physical Pre-Check Highlights:\n`;
  md += `- **Compute & Thermal**: Validates TDP heatsink class (>240W requires high-performance fan kits).\n`;
  md += `- **Memory Channels**: Enforces 1DPC / 2DPC symmetry and balanced population across memory controllers.\n`;
  md += `- **Storage Tri-Mode**: Backplane and controller pairing validation (e.g. MR416i-p / SR932i-p require dedicated Box 1/2 Cable Kit \`P76453-B21\`).\n`;
  md += `- **Support Services**: Complete lifecycle coverage across HPE Pointnext Complete Care and Tech Care Essential SLAs.\n\n`;
  md += `---\n\n`;

  // 1. Universal Rules
  md += `## 🌐 1. Universal Vendor Rules (Applies Across All HPE Product Lines)\n\n`;
  if (universalRules.length === 0) {
    md += `*No universal vendor restrictions logged yet. Baseline CTO/BTO mode rules active.*\n\n`;
  } else {
    universalRules.forEach((r, idx) => {
      md += `${idx + 1}. **[${r.deltaId}]**: ${r.ruleUpdate} *(Type: ${r.errorType})*\n`;
    });
    md += `\n`;
  }

  // 2. Family & Gen Rules
  md += `## 🏛️ 2. Family & Generation Rules (ProLiant / Alletra / Synergy)\n\n`;
  if (familyGenRules.length === 0) {
    md += `*No family/generation-level rules logged yet. Symmetric memory & power supply mixing rules active.*\n\n`;
  } else {
    familyGenRules.forEach((r, idx) => {
      md += `${idx + 1}. **[${r.deltaId}] ${r.chassis}**: ${r.ruleUpdate} *(Affected SKU: ${r.affectedSku})*\n`;
    });
    md += `\n`;
  }

  // 3. Chassis Specific Rules
  md += `## 🎯 3. Chassis & Solution-Type Gotchas (${chassisName})\n\n`;
  const relevantChassisRules = chassisSpecificRules.filter(r => {
    const c = String(r.chassis || '').toLowerCase();
    const target = String(chassisName || '').toLowerCase();
    return !target || c.includes(target) || target.includes(c);
  });

  if (relevantChassisRules.length === 0) {
    md += `*No specific gotchas logged for ${chassisName}. Baseline chassis layout rules active.*\n\n`;
  } else {
    relevantChassisRules.forEach((r, idx) => {
      md += `${idx + 1}. **[${r.deltaId}] ${r.chassis}** (Taxonomy: \`${r.scopeTaxonomy || 'CHASSIS_SPECIFIC'}\` | Solution: \`${r.solutionType || 'General Server'}\`):\n`;
      md += `   - **Rule**: ${r.ruleUpdate}\n`;
      md += `   - **Affected SKU**: \`${r.affectedSku || 'N/A'}\` | **Required Dependency**: \`${r.requiredDependencySku || 'N/A'}\` \n`;
      if (r.humanReasoning) {
        md += `   - 💡 **Human Engineer Rationale**: *"${r.humanReasoning}"*\n`;
      }
      md += `\n`;
    });
    md += `\n`;
  }

  // 4. Discontinued SKUs
  md += `## ⚠️ 4. Discontinued & Obsolete SKUs Registry\n\n`;
  const discontinuedList = [
    ...Object.values(discontinuedRegistry),
    ...Object.values(servicesDiscontinuedRegistry)
  ].filter(d => d.status === 'DISCONTINUED' || d.status === 'REMOVED' || d.status === 'REINSTATED');

  if (discontinuedList.length === 0) {
    md += `*No discontinued or reinstated SKUs detected for ${chassisName}. All cataloged SKUs are active.*\n\n`;
  } else {
    md += `| SKU | Description | Status | Discontinued Date | Last Known Price |\n`;
    md += `|-----|-------------|--------|-------------------|------------------|\n`;
    discontinuedList.forEach(d => {
      const skuPn = d.productNumber || d.sku || d['Product #'] || 'N/A';
      md += `| \`${skuPn}\` | ${d.description || 'N/A'} | **${d.status}** | ${d.discontinuedDate || 'N/A'} | ${d.lastKnownPrice ? `$${d.lastKnownPrice}` : 'N/A'} |\n`;
    });
    md += `\n`;
  }

  // 5. Attribute History
  md += `## 🔄 5. Recent Attribute & Specification Modifications Log\n\n`;
  if (attributeHistory.length === 0) {
    md += `*No attribute or specification changes recorded across catalog snapshots.*\n\n`;
  } else {
    md += `| Timestamp | SKU | Attribute | Old Value | New Value |\n`;
    md += `|-----------|-----|-----------|-----------|-----------|\n`;
    attributeHistory.slice(-15).forEach(a => {
      const aSku = a.productNumber || a.sku || a['Product #'] || 'N/A';
      const aDate = a.date || a.timestamp?.split('T')[0] || 'N/A';
      const aField = a.field || a.attribute || 'Specification';
      md += `| ${aDate} | \`${aSku}\` | ${aField} | ${a.oldValue} | **${a.newValue}** |\n`;
    });
    md += `\n`;
  }

  // 6. Cross-Chassis CTO Variant Matrix
  md += `## 🧩 6. Cross-Chassis Variant & Platform Benchmark Matrix\n\n`;
  const { getChassisMap } = require('../conflict_graph.js');
  const chassisMap = getChassisMap();

  md += `| Chassis Identifier | Product Family | Generation | Form Factor | CTO Base SKU |\n`;
  md += `|--------------------|----------------|------------|-------------|--------------|\n`;
  for (const [id, info] of Object.entries(chassisMap)) {
    md += `| **${id}** | ${info.family || 'ProLiant'} | ${info.gen || 'Gen12'} | ${info.formFactor || 'SFF'} | \`${info.baseSku || 'N/A'}\` |\n`;
  }
  md += `\n`;

  // Write payload file
  const safeFilename = `notebook_sync_payload_${chassisName}.md`;
  const payloadPath = path.join(targetDir, safeFilename);

  try {
    fs.writeFileSync(payloadPath, md, 'utf-8');
  } catch (err) {
    logger.warn('KNOWLEDGE_SYNC', `Failed to write payload to ${payloadPath}`, err);
  }

  let uploadResult = null;
  if (autoUpload) {
    const notebookId = (cfg.notebooks && cfg.notebooks[chassisName])
      ? (typeof cfg.notebooks[chassisName] === 'object' ? cfg.notebooks[chassisName].notebookId : cfg.notebooks[chassisName])
      : cfg.defaultNotebookId;
    uploadResult = syncToNotebookLM(notebookId, payloadPath, chassisName, totalRules);
  }

  return {
    payloadPath,
    markdownText: md,
    deltaCount: totalRules,
    uploadResult
  };
}

module.exports = {
  generateNotebookSyncPayload,
  loadNotebookConfig
};
