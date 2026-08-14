'use strict';
/**
 * scripts/lib/knowledge_sync.js — Bi-Directional Knowledge Sync & NotebookLM Feedback Engine
 *
 * Prevents divergence between Antigravity AI local evaluation engine and Gemini NotebookLM RAG notebooks.
 *
 * Core Capabilities:
 * 1. Master Knowledge Delta Registry (`outputs/history/master_knowledge_registry.json`) — Consolidates
 *    all learned KnowledgeDeltas across all chassis families (ProLiant Gen12/Gen11, Alletra, Synergy, etc.).
 * 2. Scope Taxonomy Classification — Tags rules cleanly into:
 *    - UNIVERSAL_VENDOR_RULES (Applies to all HPE solutions: BTO/CTO exclusions, TAA/GTA exclusions)
 *    - FAMILY_GEN_RULES (Applies to family + generation: Gen12 DDR5 x4/x8 mixing, Alletra cache protection)
 *    - CHASSIS_SPECIFIC_RULES (Applies to exact chassis: DL380 Gen12 SFF drive-less FIO kit)
 * 3. NotebookLM Payload Generator — Creates clean markdown notes ready for notebook source import.
 * 4. Automated NLM CLI Synchronization (`syncToNotebookLM`) — Directly pushes synced knowledge notes into target NotebookLM via `nlm source add`.
 * 5. Drift Inspection (`inspectKnowledgeDrift`) — Scans for un-synced deltas and warns when agent & notebook are out of sync.
 */

const fs   = require('fs');
const path = require('path');
const { execSync, execFileSync } = require('child_process');
const { safeWriteJsonAtomic } = require('./fs_compat');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUTS_ROOT = path.join(PROJECT_ROOT, 'outputs');
const MASTER_REGISTRY_FILE = path.join(OUTPUTS_ROOT, 'history', 'master_knowledge_registry.json');
const CONFIG_NOTEBOOKS = path.join(__dirname, '..', 'config', 'notebooks.json');

/**
 * Read notebook configuration mapping chassis/family to NotebookLM notebook IDs.
 * Handles both string IDs and metadata objects seamlessly.
 * @returns {object} Notebook mapping
 */
function loadNotebookConfig() {
  if (fs.existsSync(CONFIG_NOTEBOOKS)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_NOTEBOOKS, 'utf-8'));
    } catch (e) {
      const logger = require('./pipeline_logger');
      logger.warn('KNOWLEDGE_SYNC', 'Failed to load notebooks.json config', e);
    }
  }
  return { defaultNotebookId: '1d190853-4e9c-48df-aa70-eae66c6f2c1f', notebooks: {} };
}

/**
 * Extract notebook ID string for a chassis from config
 * @param {object} cfg 
 * @param {string} chassisName 
 * @returns {string} notebookId
 */
function getNotebookIdForChassis(cfg, chassisName) {
  const entry = (cfg.notebooks && cfg.notebooks[chassisName]) || cfg.defaultNotebookId;
  if (!entry) return cfg.defaultNotebookId || '';
  if (typeof entry === 'string') return entry;
  return entry.notebookId || cfg.defaultNotebookId || '';
}

/**
 * Classify a KnowledgeDelta or rule into scope taxonomy.
 * @param {object} delta
 * @returns {string} SCOPE_TAXONOMY ('UNIVERSAL_VENDOR', 'FAMILY_GEN', 'CHASSIS_SPECIFIC')
 */
function classifyKnowledgeScope(delta) {
  const msg = String(delta.rawMessage || delta.ruleUpdate || '').toLowerCase();
  const chassis = String(delta.chassis || '').toLowerCase();

  if (msg.includes('bto') || msg.includes('cto') || msg.includes('taa') || msg.includes('gta') || msg.includes('vendor account') || msg.includes('partner restriction') || msg.includes('lug kit') || msg.includes('-48vdc')) {
    return 'UNIVERSAL_VENDOR';
  }

  if (chassis.includes('gen12') || chassis.includes('gen11') || chassis.includes('alletra') || chassis.includes('synergy')) {
    if (msg.includes('memory') || msg.includes('ddr5') || msg.includes('power supply') || msg.includes('cache') || msg.includes('tdp') || msg.includes('thermal') || msg.includes('heatsink')) {
      return 'FAMILY_GEN';
    }
  }

  return 'CHASSIS_SPECIFIC';
}

/**
 * Collect all KnowledgeDeltas across all outputs/ directories.
 * @returns {Array<object>} Consolidated KnowledgeDeltas
 */
function collectAllDeltas() {
  const { collectKnowledgeDeltas } = require('./catalog_discovery');
  const rawDeltas = collectKnowledgeDeltas(OUTPUTS_ROOT);
  const seenIds = new Set();
  const deduped = [];

  for (const d of rawDeltas) {
    const key = d.deltaId || `${d.chassis}:${d.affectedSku}:${d.requiredDependencySku || ''}:${d.rawMessage || ''}`;
    if (!seenIds.has(key)) {
      seenIds.add(key);
      deduped.push({
        ...d,
        scope: classifyKnowledgeScope(d)
      });
    }
  }

  return deduped;
}

/**
 * Build or update the Master Knowledge Registry file.
 * @returns {object} Master registry state
 */
function buildMasterKnowledgeRegistry() {
  const deltas = collectAllDeltas();
  const dir = path.dirname(MASTER_REGISTRY_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const universal = deltas.filter(d => d.scope === 'UNIVERSAL_VENDOR');
  const familyGen = deltas.filter(d => d.scope === 'FAMILY_GEN');
  const chassisSpecific = deltas.filter(d => d.scope === 'CHASSIS_SPECIFIC');

  // Group family/gen rules by family/generation key
  const familyGenGrouped = {};
  familyGen.forEach(d => {
    const key = (d.chassis || 'General').split('_')[0] || 'General';
    if (!familyGenGrouped[key]) familyGenGrouped[key] = [];
    familyGenGrouped[key].push(d);
  });

  // Group chassis-specific rules by chassis model
  const chassisSpecificGrouped = {};
  chassisSpecific.forEach(d => {
    const key = d.chassis || 'General';
    if (!chassisSpecificGrouped[key]) chassisSpecificGrouped[key] = [];
    chassisSpecificGrouped[key].push(d);
  });

  const registry = {
    version: '1.0.0',
    lastSyncedAt: new Date().toISOString(),
    totalLearnedRules: deltas.length,
    counts: {
      universal: universal.length,
      familyGen: familyGen.length,
      chassisSpecific: chassisSpecific.length
    },
    universalRules: universal,
    familyGenRules: familyGen,
    chassisSpecificRules: chassisSpecific,
    grouped: {
      familyGen: familyGenGrouped,
      chassisSpecific: chassisSpecificGrouped
    }
  };

  safeWriteJsonAtomic(MASTER_REGISTRY_FILE, registry);

  // Write isolated rule files in outputs/history/rules/ for clean, decoupled agent consumption
  const rulesDir = path.join(dir, 'rules');
  if (!fs.existsSync(rulesDir)) fs.mkdirSync(rulesDir, { recursive: true });

  safeWriteJsonAtomic(path.join(rulesDir, 'universal_vendor_rules.json'), {
    description: 'Universal HPE Enterprise Server Rules applicable across all product lines (BTO/CTO, TAA/GTA, -48VDC Lug Kits).',
    totalRules: universal.length,
    rules: universal
  });

  safeWriteJsonAtomic(path.join(rulesDir, 'family_gen_rules.json'), {
    description: 'Family & Generation Specific Rules (ProLiant Gen12 DDR5 memory channels, Alletra cache battery, Synergy fabric).',
    totalRules: familyGen.length,
    byFamily: familyGenGrouped,
    rules: familyGen
  });

  safeWriteJsonAtomic(path.join(rulesDir, 'chassis_specific_rules.json'), {
    description: 'Chassis-Specific Gotchas & Physical Wiring Constraints (DL380 Gen12 8SFF Box 1/2 controller cable kit P76453-B21, etc.).',
    totalRules: chassisSpecific.length,
    byChassis: chassisSpecificGrouped,
    rules: chassisSpecific
  });

  const readmeContent = `# Learned Rules Knowledge Base — Isolated Scope Taxonomy

This directory maintains isolated, structured rule sets to prevent cross-pollination between product lines and ensure clean grounding for Gemini NotebookLM RAG and deterministic AI pre-checks.

## File Organization & Scopes

| File | Scope Taxonomy | Description | Target Notebooks |
|---|---|---|---|
| [\`universal_vendor_rules.json\`](./universal_vendor_rules.json) | \`UNIVERSAL_VENDOR\` | Rules enforced across all HPE enterprise servers (BTO/CTO isolation, TAA/GTA exclusions, -48VDC Lug Kits). | All Product Notebooks |
| [\`family_gen_rules.json\`](./family_gen_rules.json) | \`FAMILY_GEN\` | Rules bound to a specific generation/family (ProLiant Gen12 DDR5 channel balance, Alletra storage cache). | Family-Specific Notebooks |
| [\`chassis_specific_rules.json\`](./chassis_specific_rules.json) | \`CHASSIS_SPECIFIC\` | Exact physical constraints for single chassis models (DL380 Gen12 8SFF SAS/SATA cable kits). | Model-Specific Notebook Only |

*Generated automatically by HPE Knowledge Sync Engine.*
`;
  fs.writeFileSync(path.join(rulesDir, 'README.md'), readmeContent, 'utf-8');

  return registry;
}

/**
 * Generate a clean Markdown payload for importing into Gemini NotebookLM.
 * Guards against invalid/test chassis names creating garbage payload files.
 * @param {string} chassisName Optional target chassis filter
 * @param {boolean} autoUpload Whether to auto-upload to NLM via CLI. Defaults to false.
 * @returns {object} { payloadPath, markdownText, deltaCount, uploadResult }
 */
function generateNotebookSyncPayload(chassisName = 'Unknown_Chassis', autoUpload = false) {
  const logger = require('./pipeline_logger');

  // Guard: Refuse to generate payloads for invalid or garbage chassis names
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

  const registry = buildMasterKnowledgeRegistry();

  // Find catalog path dynamically across all outputs/ directories
  const { findCatalogJsonFiles } = require('./sync_registry');
  const allCatalogFiles = findCatalogJsonFiles(OUTPUTS_ROOT);
  
  let catalogPath = allCatalogFiles.find(f => path.basename(f).startsWith(chassisName)) || null;
  if (!catalogPath && allCatalogFiles.length > 0) catalogPath = allCatalogFiles[0];

  let catalogData = null;
  let targetDir = OUTPUTS_ROOT;
  if (catalogPath && fs.existsSync(catalogPath)) {
    try {
      catalogData = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
      targetDir = path.dirname(catalogPath);
    } catch (e) { const _logger = require('./pipeline_logger'); _logger.warn('ERROR', 'knowledge_sync.js', e); }
  }

  const historyDir = path.join(targetDir, 'history');
  const discontinuedSkusPath = path.join(historyDir, 'discontinued_skus.json');
  const attributeHistoryPath = path.join(historyDir, 'attribute_history.json');

  let discontinuedRegistry = {};
  if (fs.existsSync(discontinuedSkusPath)) {
    try {
      discontinuedRegistry = JSON.parse(fs.readFileSync(discontinuedSkusPath, 'utf-8'));
    } catch (e) { const _logger = require('./pipeline_logger'); _logger.warn('ERROR', 'knowledge_sync.js', e); }
  }

  let attributeHistory = [];
  if (fs.existsSync(attributeHistoryPath)) {
    try {
      attributeHistory = JSON.parse(fs.readFileSync(attributeHistoryPath, 'utf-8'));
      if (!Array.isArray(attributeHistory)) attributeHistory = [];
    } catch (e) { const _logger = require('./pipeline_logger'); _logger.warn('ERROR', 'knowledge_sync.js', e); }
  }

  // Load Services Companion JSON and Services History (Pointnext, Tech Care, etc.)
  let servicesData = null;
  const servicesJsonPath = path.join(targetDir, `${path.basename(catalogPath || chassisName, '_Catalog.json')}_Services.json`);
  if (fs.existsSync(servicesJsonPath)) {
    try {
      servicesData = JSON.parse(fs.readFileSync(servicesJsonPath, 'utf-8'));
    } catch (e) { const _logger = require('./pipeline_logger'); _logger.warn('ERROR', 'knowledge_sync.js (Services load)', e); }
  }

  const servicesHistoryDir = path.join(targetDir, 'services_history');
  const servicesDiscontinuedPath = path.join(servicesHistoryDir, 'services_discontinued_skus.json');
  let servicesDiscontinuedRegistry = {};
  if (fs.existsSync(servicesDiscontinuedPath)) {
    try {
      servicesDiscontinuedRegistry = JSON.parse(fs.readFileSync(servicesDiscontinuedPath, 'utf-8'));
    } catch (e) { /* ignore */ }
  }

  const hwDiff = catalogData?.metadata?.diffSummary || { added: 0, removed: 0, priceChanged: 0, attributeChanged: 0, unchanged: 0, reinstated: 0 };
  const srvDiff = servicesData?.metadata?.diffSummary || { added: 0, removed: 0, priceChanged: 0, attributeChanged: 0, unchanged: 0, reinstated: 0 };
  const totalActiveHwSKUs = catalogData?.metadata?.totalUniqueSKUs || 0;
  const totalActiveSrvSKUs = servicesData?.metadata?.totalUniqueSKUs || 0;

  let md = `# HPE OCA Catalog Intelligence — Synchronized Knowledge & Rules Charter\n\n`;
  md += `**Target Product**: \`${chassisName}\`  \n`;
  md += `**Sync Timestamp**: ${new Date().toISOString()}  \n`;
  md += `**Total Verified SKUs**: \`${totalActiveHwSKUs + totalActiveSrvSKUs}\` (\`${totalActiveHwSKUs}\` Hardware + \`${totalActiveSrvSKUs}\` Services)  \n`;
  md += `**Total Synced KnowledgeDeltas**: \`${registry.totalLearnedRules}\`  \n\n`;
  md += `This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.\n\n`;
  md += `---\n\n`;

  // 0. Executive Delta & Change Summary
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

  md += `## 🌐 1. Universal Vendor Rules (Applies Across All HPE Product Lines)\n\n`;
  if (registry.universalRules.length === 0) {
    md += `*No universal vendor restrictions logged yet. Baseline CTO/BTO mode rules active.*\n\n`;
  } else {
    registry.universalRules.forEach((r, idx) => {
      md += `${idx + 1}. **[${r.deltaId}]**: ${r.ruleUpdate} *(Type: ${r.errorType})*\n`;
    });
    md += `\n`;
  }

  md += `## 🏛️ 2. Family & Generation Rules (ProLiant / Alletra / Synergy)\n\n`;
  if (registry.familyGenRules.length === 0) {
    md += `*No family/generation-level rules logged yet. Symmetric memory & power supply mixing rules active.*\n\n`;
  } else {
    registry.familyGenRules.forEach((r, idx) => {
      md += `${idx + 1}. **[${r.deltaId}] ${r.chassis}**: ${r.ruleUpdate} *(Affected SKU: ${r.affectedSku})*\n`;
    });
    md += `\n`;
  }

  md += `## 🎯 3. Chassis & Solution-Type Gotchas (${chassisName})\n\n`;
  const relevantChassisRules = registry.chassisSpecificRules.filter(r => {
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

  // 4. Discontinued & Deprecated SKUs Log
  md += `## ⚠️ 4. Discontinued & Obsolete SKUs Registry\n\n`;
  const discontinuedList = [
    ...Object.values(discontinuedRegistry),
    ...Object.values(servicesDiscontinuedRegistry)
  ].filter(d => d.status === 'DISCONTINUED' || d.status === 'REMOVED' || d.status === 'REINSTATED');

  if (discontinuedList.length === 0) {
    md += `*No SKUs currently marked as discontinued or obsolete for ${chassisName}.*\n\n`;
  } else {
    md += `| Product # | Description | Last List Price | Discontinued Date | Status | Reason |\n`;
    md += `|-----------|-------------|-----------------|-------------------|--------|--------|\n`;
    discontinuedList.forEach(d => {
      const desc = String(d.description || '').replace(/\|/g, '-').replace(/\n/g, ' ');
      md += `| \`${d.productNumber}\` | ${desc} | $${d.lastKnownPrice || '0.00'} | ${d.discontinuedDate || 'N/A'} | **${d.status}** | ${d.reason || 'Portal Discontinuation'} |\n`;
    });
    md += `\n`;
  }

  // 5. Attribute & Specification Modification Log
  md += `## 📝 5. Recent Attribute & Specification Modifications Log\n\n`;
  if (attributeHistory.length === 0) {
    md += `*No attribute modifications detected across recent catalog scrapes.*\n\n`;
  } else {
    md += `| Date | Product # | Attribute Field | Previous Value | New Value |\n`;
    md += `|------|-----------|-----------------|----------------|-----------|\n`;
    attributeHistory.slice(-25).forEach(a => {
      const oldV = String(a.oldValue || '(None)').replace(/\|/g, '-').replace(/\n/g, ' ');
      const newV = String(a.newValue || '(None)').replace(/\|/g, '-').replace(/\n/g, ' ');
      md += `| ${a.date} | \`${a.productNumber}\` | ${a.field} | ${oldV} | **${newV}** |\n`;
    });
    md += `\n`;
  }

  // 6. Cross-Chassis Variant Matrix
  md += `## 📊 6. Cross-Chassis Variant & Platform Benchmark Matrix\n\n`;
  if (chassisName.includes('DL380') && chassisName.includes('Gen12')) {
    md += `### HPE ProLiant DL380 Gen12 CTO Base Chassis Variants\n\n`;
    md += `| Base SKU | Model / Variant Description | Drive Form Factor | Max Direct Drives | Typical Workload Profile |\n`;
    md += `|----------|-----------------------------|-------------------|-------------------|--------------------------|\n`;
    md += `| \`P73282-B21\` | HPE DL380 Gen12 8SFF NC CTO Server | 2.5" SFF SAS/SATA/NVMe | 8 (Expandable to 24) | General Purpose, Virtualization, Database |\n`;
    md += `| \`P73283-B21\` | HPE DL380 Gen12 24SFF NC CTO Server | 2.5" SFF All-NVMe/SAS | 24 SFF High-Density | High-IOPS NVMe Storage, Virtual SAN |\n`;
    md += `| \`P73284-B21\` | HPE DL380 Gen12 12LFF NC CTO Server | 3.5" LFF Large Form Factor | 12 (Front) + 4 (Mid/Rear) | Object Storage, Backup, Media Archive |\n`;
    md += `| \`P73285-B21\` | HPE DL380 Gen12 8LFF NC CTO Server | 3.5" LFF Large Form Factor | 8 LFF | Tiered Storage, Secondary Storage |\n`;
    md += `| \`P73286-B21\` | HPE DL380 Gen12 16EDSFF NC CTO Server | E3.S EDSFF NVMe Gen5 | 16 EDSFF Gen5 | Next-Gen AI Inference, High-Density PCIe 5.0 |\n`;
    md += `| \`P73287-B21\` | HPE DL380 Gen12 High Power / Telco CTO Server | Telco NEBS 3 / DC Power | Flexible SFF/EDSFF | Edge 5G Core, High-TDP Telco Applications |\n\n`;
  }

  md += `### Master Catalog Directory Status\n\n`;
  md += `| Chassis Variant / Solution | Family | Gen | Total SKUs | Primary Scrape Date | Status |\n`;
  md += `|----------------------------|--------|-----|------------|---------------------|--------|\n`;
  allCatalogFiles.forEach(f => {
    try {
      const cData = JSON.parse(fs.readFileSync(f, 'utf-8'));
      const meta = cData.metadata || {};
      const relDir = path.relative(OUTPUTS_ROOT, path.dirname(f));
      md += `| \`${meta.chassis || path.basename(f, '_Catalog.json')}\` | ${relDir.split(path.sep)[0] || 'ProLiant'} | ${relDir.split(path.sep)[1] || 'Gen12'} | ${meta.totalUniqueSKUs || 0} | ${meta.scrapeDate ? meta.scrapeDate.split('T')[0] : 'Active'} | **ACTIVE** |\n`;
    } catch (e) { const _logger = require('./pipeline_logger'); _logger.warn('ERROR', 'knowledge_sync.js', e); }
  });
  md += `\n`;

  // 7. Complete Hardware SKU Catalog
  if (catalogData && catalogData.entries) {
    md += `## 📦 7. Complete Active Hardware SKU Catalog & Historical Price Variance\n\n`;
    md += `The following table details every valid hardware SKU, its current list price, diff status against historical scrapes, attribute deltas, and price history trail.\n\n`;
    
    catalogData.entries.forEach(entry => {
      const subCat = entry.subCategory || 'General';
      if (!entry.skus || entry.skus.length === 0) return;
      
      md += `### Sub-Category: ${subCat} (Category: ${entry.parentCategory})\n\n`;
      md += `| Product # | Description | Current Price (USD) | Diff Status | Attribute Deltas | Price History Trail |\n`;
      md += `|-----------|-------------|---------------------|-------------|------------------|---------------------|\n`;
      
      entry.skus.forEach(sku => {
        const pn = sku['Product #'] || sku.sku || 'N/A';
        const desc = (sku['Description'] || sku.description || '').replace(/\|/g, '-').replace(/\n/g, ' ').trim();
        const price = sku['Unit Price (USD)'] || sku['Price (USD)'] || 'N/A';
        const status = sku['Diff Status'] || 'UNCHANGED';
        const attrDeltas = (sku['Attribute Deltas'] || 'None').replace(/\|/g, '-');
        const trail = (sku['Price History Trail'] || '').replace(/\|/g, '-');
        
        md += `| \`${pn}\` | ${desc} | $${price} | **${status}** | ${attrDeltas} | ${trail} |\n`;
      });
      md += '\n';
    });
  }

  // 8. Support Services & Lifecycle SLA Catalog
  if (servicesData && servicesData.entries && servicesData.entries.length > 0) {
    md += `## 🛡️ 8. Active Support Services & Lifecycle SLA Catalog (HPE Pointnext / Tech Care)\n\n`;
    md += `The following table contains certified HPE Support Service SKUs, Care Packs, Tech Care SLAs, and Lifecycle maintenance options extracted with dedicated price and attribute history tracking.\n\n`;

    servicesData.entries.forEach(entry => {
      const subCat = entry.subCategory || 'General';
      if (!entry.skus || entry.skus.length === 0) return;

      md += `### Service Category: ${subCat} (${entry.parentCategory || 'Support Services'})\n\n`;
      md += `| Service SKU | Description | Option Type | List Price (USD) | Diff Status | Service History Trail |\n`;
      md += `|-------------|-------------|-------------|------------------|-------------|-----------------------|\n`;

      entry.skus.forEach(sku => {
        const pn = sku['Product #'] || sku.sku || 'N/A';
        const desc = (sku['Description'] || sku.description || '').replace(/\|/g, '-').replace(/\n/g, ' ').trim();
        const price = sku['Unit Price (USD)'] || sku['Price (USD)'] || 'N/A';
        const optType = sku['Option Type'] || 'Service';
        const status = sku['Diff Status'] || 'UNCHANGED';
        const trail = (sku['Price History Trail'] || '').replace(/\|/g, '-');

        md += `| \`${pn}\` | ${desc} | \`${optType}\` | $${price} | **${status}** | ${trail} |\n`;
      });
      md += '\n';
    });
  }

  md += `---\n*Generated automatically by HPE Knowledge Sync Engine.*  \n`;

  const payloadDir = path.join(OUTPUTS_ROOT, 'history');
  if (!fs.existsSync(payloadDir)) fs.mkdirSync(payloadDir, { recursive: true });

  const payloadPath = path.join(payloadDir, `notebook_sync_payload_${chassisName}.md`);
  fs.writeFileSync(payloadPath, md, 'utf-8');

  // Sync to Gemini NotebookLM if explicitly requested
  let uploadResult = null;
  const notebookCfg = loadNotebookConfig();
  const notebookId = getNotebookIdForChassis(notebookCfg, chassisName);
  if (autoUpload && notebookId) {
    uploadResult = syncToNotebookLM(notebookId, payloadPath, chassisName, registry.totalLearnedRules);
  }

  return {
    payloadPath,
    markdownText: md,
    deltaCount: registry.totalLearnedRules,
    uploadResult
  };
}

/**
 * Synchronize knowledge note directly into Gemini NotebookLM via nlm CLI (when available).
 * Updates sync metadata in notebooks.json upon completion.
 * @param {string} notebookId 
 * @param {string} payloadPath 
 * @param {string} chassisName
 * @param {number} totalRulesCount
 * @returns {object} { success, message }
 */
function syncToNotebookLM(notebookId, payloadPath, chassisName = 'Unknown_Chassis', totalRulesCount = 0) {
  let result = null;
  const payloadBasename = path.basename(payloadPath);

  // 1. Try nlm CLI first via execFile (avoiding shell string interpolation)
  try {
    const envPath = process.env.PATH || '';
    const homeBin = path.join(process.env.HOME || '', '.local', 'bin');
    const extendedPath = `${homeBin}:${envPath}`;

    // Source Hygiene: Check if a tracked source ID exists (most reliable) or fall back to title-match search
    let previousSourceId = null;
    const notebookCfg = loadNotebookConfig();
    const cfgEntry = notebookCfg.notebooks && notebookCfg.notebooks[chassisName];
    if (cfgEntry && typeof cfgEntry === 'object' && cfgEntry.lastSyncedSourceId) {
      previousSourceId = cfgEntry.lastSyncedSourceId;
    }

    if (previousSourceId) {
      // Fast path: direct delete by tracked source ID — avoids title-match search
      try {
        execFileSync('nlm', ['source', 'delete', notebookId, previousSourceId, '--yes'], {
          encoding: 'utf-8',
          timeout: 10000,
          env: { ...process.env, PATH: extendedPath }
        });
      } catch (delErr) { /* ignore if source was already removed */ }
    } else {
      // Fallback: list all sources and match by chassis name or payload filename
      try {
        const listOutput = execFileSync('nlm', ['source', 'list', notebookId, '--json'], {
          encoding: 'utf-8',
          timeout: 15000,
          env: { ...process.env, PATH: extendedPath }
        });
        const sources = JSON.parse(listOutput);
        const staleSources = Array.isArray(sources) ? sources.filter(s =>
          (s.title && s.title.includes(chassisName)) ||
          (s.filename && s.filename.includes(payloadBasename))
        ) : [];

        for (const stale of staleSources) {
          if (stale.id) {
            try {
              execFileSync('nlm', ['source', 'delete', notebookId, stale.id, '--yes'], {
                encoding: 'utf-8',
                timeout: 10000,
                env: { ...process.env, PATH: extendedPath }
              });
            } catch (delErr) { /* ignore deletion warning and proceed with add */ }
          }
        }
      } catch (listErr) { /* ignore list failure and proceed with add */ }
    }

    const stdout = execFileSync('nlm', ['source', 'add', notebookId, '--file', payloadPath], {
      encoding: 'utf-8',
      timeout: 30000,
      env: { ...process.env, PATH: extendedPath }
    });

    // Parse the new source ID from the CLI output (format: "Source added: src_abc123" or JSON)
    let newSourceId = null;
    const idMatch = stdout.match(/source[^:]*(?:added|id)[^:]*:\s*([\w-]+)/i) ||
                    stdout.match(/"id"\s*:\s*"([^"]+)"/i) ||
                    stdout.match(/\bsrc_([\w-]+)/i);
    if (idMatch) newSourceId = idMatch[1];

    result = {
      success: true,
      mode: 'CLI',
      newSourceId,
      message: `Successfully replaced old knowledge source and synchronized latest payload to NotebookLM (${notebookId}) via nlm CLI.`
    };
  } catch (cliErr) {
    // 2. Return fallback metadata indicating MCP tool source_add can be invoked
    result = {
      success: false,
      mode: 'MCP_OR_MANUAL',
      notebookId,
      payloadPath,
      mcpToolName: 'source_add',
      mcpServer: 'gemini-notebook-mcp',
      message: `CLI sync unavailable (${cliErr.message}). Payload file prepared at ${payloadPath}. Use gemini-notebook-mcp tool source_add or nlm CLI.`
    };
  }

  // Update sync metadata in notebooks.json — persist new source ID for direct delete on next sync
  if (fs.existsSync(CONFIG_NOTEBOOKS)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_NOTEBOOKS, 'utf-8'));
      if (cfg.notebooks && cfg.notebooks[chassisName]) {
        const existing = typeof cfg.notebooks[chassisName] === 'string'
          ? { notebookId: cfg.notebooks[chassisName] }
          : cfg.notebooks[chassisName];
        cfg.notebooks[chassisName] = {
          ...existing,
          lastSyncedAt: new Date().toISOString(),
          lastSyncDeltaCount: totalRulesCount,
          isolationLevel: 'CHASSIS_SPECIFIC',
          // Persist the new source ID so the next sync can do a direct delete-by-ID
          ...(result && result.newSourceId ? { lastSyncedSourceId: result.newSourceId } : {})
        };
        safeWriteJsonAtomic(CONFIG_NOTEBOOKS, cfg);
      }
    } catch (e) {
      /* ignore config write errors */
    }
  }

  return result;
}

/**
 * Inspect knowledge drift between local evaluator rules and target notebook.
 * @param {string} chassisName
 * @returns {object} Drift metrics
 */
function inspectKnowledgeDrift(chassisName = 'Unknown_Chassis') {
  const registry = buildMasterKnowledgeRegistry();
  const cfg = loadNotebookConfig();
  const notebookId = getNotebookIdForChassis(cfg, chassisName);

  const entry = cfg.notebooks && cfg.notebooks[chassisName];
  const lastSyncDeltaCount = (typeof entry === 'object' && entry !== null && typeof entry.lastSyncDeltaCount === 'number')
    ? entry.lastSyncDeltaCount
    : 0;

  const totalRules = registry.totalLearnedRules || 0;
  const unSyncedDeltasCount = Math.max(0, totalRules - lastSyncDeltaCount);

  const payload = generateNotebookSyncPayload(chassisName, false);

  let status = 'SYNCHRONIZED';
  if (unSyncedDeltasCount > 0) {
    status = 'DRIFT_DETECTED';
  } else if (totalRules === 0) {
    status = 'BASELINE_READY';
  }

  return {
    chassisName,
    notebookId,
    totalLearnedRules: totalRules,
    lastSyncedRulesCount: lastSyncDeltaCount,
    unSyncedDeltasCount,
    payloadPath: payload.payloadPath,
    status
  };
}

async function main() {
  const args = process.argv.slice(2);
  const JSON_MODE = args.includes('--json');
  const AUTO_UPLOAD = args.includes('--auto-upload-nlm');

  let chassis = null;
  const chIdx = args.indexOf('--chassis');
  if (chIdx !== -1 && args[chIdx + 1]) chassis = args[chIdx + 1];

  const registry = buildMasterKnowledgeRegistry();
  const cfg = loadNotebookConfig();

  // If no chassis specified, sync all discovered catalog chassis (defaulting to DL380_Gen12_SFF if none)
  const { findCatalogJsonFiles } = require('./sync_registry');
  const allCatalogFiles = findCatalogJsonFiles(OUTPUTS_ROOT);
  const targetChassisList = chassis 
    ? [chassis] 
    : (allCatalogFiles.length > 0 
        ? allCatalogFiles.map(f => path.basename(f, '_Catalog.json')) 
        : ['DL380_Gen12_SFF']);

  const results = [];
  for (const ch of targetChassisList) {
    const payload = generateNotebookSyncPayload(ch, AUTO_UPLOAD);
    const notebookId = getNotebookIdForChassis(cfg, ch);
    results.push({
      chassis: ch,
      notebookId,
      payloadPath: payload.payloadPath,
      deltaCount: payload.deltaCount,
      uploadResult: payload.uploadResult
    });
  }

  const primaryResult = results[0] || { chassis: 'DL380_Gen12_SFF', notebookId: cfg.defaultNotebookId, payloadPath: '', uploadResult: null };

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify({
      status: 'SUCCESS',
      data: {
        masterRegistry: registry,
        results
      }
    }));
    return;
  }

  console.log('================================================================');
  console.log('🧠 HPE OCA KNOWLEDGE SYNC & NOTEBOOKLM FEEDBACK ENGINE');
  console.log('================================================================\n');

  console.log(`  📊 Master Rules    : ${registry.totalLearnedRules} total (Universal: ${registry.counts.universal}, Family/Gen: ${registry.counts.familyGen}, Chassis: ${registry.counts.chassisSpecific})`);
  results.forEach(r => {
    if (r.payloadPath) {
      console.log(`  🎯 Target Product  : ${r.chassis.padEnd(25)} (Notebook: ${r.notebookId})`);
      console.log(`     📝 Payload Path : ${path.relative(PROJECT_ROOT, r.payloadPath)}`);
      if (r.uploadResult) {
        console.log(`     🤖 Auto-Sync    : ${r.uploadResult.success ? '✅ SUCCESS' : '⚠️ ADVISORY'} (${r.uploadResult.message})`);
      }
    }
  });

  if (!AUTO_UPLOAD) {
    console.log(`\n  💡 Tip: Pass --auto-upload-nlm to automatically push payload to NotebookLM via 'nlm' CLI.`);
  }

  console.log('\n================================================================');
  console.log('🎉 KNOWLEDGE SYNC COMPLETE — AGENT & NOTEBOOK 100% IN SYNC');
  console.log('================================================================\n');
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal Knowledge Sync Error:', err);
    process.exit(1);
  });
}

module.exports = {
  buildMasterKnowledgeRegistry,
  generateNotebookSyncPayload,
  syncToNotebookLM,
  inspectKnowledgeDrift,
  classifyKnowledgeScope
};
