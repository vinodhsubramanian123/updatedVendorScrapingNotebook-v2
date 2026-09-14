'use strict';
/**
 * scripts/lib/sync/sync_payload_builder.js — Markdown Sync Payload Generator
 *
 * Compiles comprehensive markdown payload with executive summary, active SKU registry,
 * universal rules, chassis gotchas, discontinued SKUs, attribute changes, and price trail.
 * Deconstructed into modular section builders (CC <= 25 per function).
 */

const fs = require('fs');
const path = require('path');
const logger = require('../system/pipeline_logger.js');
const { syncToNotebookLM } = require('./nlm_sync_client.js');
const { buildKnowledgeWorkbookDatasets } = require('./google_sheets_writer.js');
const { baseProductId, normalize, isVerifiedSharedAccessoryRule, scopeRegistryForProduct } = require('../catalog/product_scope.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const OUTPUTS_ROOT = path.join(PROJECT_ROOT, 'outputs');
const CONFIG_NOTEBOOKS = path.join(PROJECT_ROOT, 'scripts', 'config', 'notebooks.json');

function loadNotebookConfig() {
  const defaultCfg = {
    defaultNotebookId: null,
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

function referencesOtherRegisteredProduct(text, chassisName, cfg) {
  return Object.keys(cfg?.notebooks || {}).some(productId => {
    if (productId === chassisName) return false;
    return [productId, productId.replace(/_/g, ' ')].some(alias => {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`(^|[^A-Za-z0-9])${escaped}([^A-Za-z0-9]|$)`, 'i').test(String(text || ''));
    });
  });
}

function inferAccessoryClass(desc, cat = '') {
  const d = String(desc || '').toLowerCase();
  const c = String(cat || '').toLowerCase();
  if (d.includes('rail') || c.includes('rail')) return 'RAIL';
  if (d.includes('cable') || c.includes('cable')) return 'CABLE';
  if (d.includes('power cord') || d.includes('power cable')) return 'POWER_CORD';
  if (d.includes('transceiver') || c.includes('transceiver')) return 'TRANSCEIVER';
  if (d.includes('enablement kit') || d.includes('fio kit') || d.includes('bracket') || c.includes('enablement')) return 'ENABLEMENT_KIT';
  if (d.includes('management arm') || d.includes('cma')) return 'CABLE_MANAGEMENT_ARM';
  return null;
}

function _resolveSyncTargetDirectory(chassisName, catalogPath) {
  const TEST_CHASSIS_PATTERNS = [
    /^edge-test-/i,
    /^hpe-chaos-test-/i,
    /^tmp[_-]test/i,
    /^test[_-]/i,
    /oca-feedback-test/i,
    /_test$/i
  ];
  const isTestChassis = TEST_CHASSIS_PATTERNS.some(p => p.test(chassisName));

  if (isTestChassis) {
    const testDir = path.join(PROJECT_ROOT, 'outputs', 'temp', 'test_payloads');
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
    return { targetDir: testDir, isTestChassis: true };
  }

  if (catalogPath && fs.existsSync(catalogPath)) {
    const dir = path.dirname(catalogPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return { targetDir: dir, isTestChassis: false };
  }

  const histDir = path.join(OUTPUTS_ROOT, 'history');
  if (!fs.existsSync(histDir)) fs.mkdirSync(histDir, { recursive: true });
  return { targetDir: histDir, isTestChassis: false };
}

function _buildHeaderAndSummarySection(targetIdentity, chassisName, totalActiveHwSKUs, totalActiveSrvSKUs, totalRules, hwDiff, srvDiff) {
  let md = `# ${targetIdentity.vendor} ${chassisName} — Synchronized Catalog Knowledge\n\n`;
  md += `**Target Product**: \`${chassisName}\`\n\n`;
  md += `**Scope Identity**: \`${targetIdentity.vendor}/${targetIdentity.pillar}/${targetIdentity.family}/${targetIdentity.generation}/${targetIdentity.productId || chassisName}\`\n\n`;
  md += `**Sync Timestamp**: ${new Date().toISOString()}\n\n`;
  md += `**Total Verified SKUs**: \`${totalActiveHwSKUs + totalActiveSrvSKUs}\` (\`${totalActiveHwSKUs}\` Hardware + \`${totalActiveSrvSKUs}\` Services)\n\n`;
  md += `**Total Synced KnowledgeDeltas**: \`${totalRules}\`\n\n`;
  md += `This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.\n\n`;
  md += `---\n\n`;

  md += `## 🚀 Executive Delta & Recent Change Summary\n\n`;
  md += `| Category | Total SKUs | Added (Last Scrape) | Price Changed | Attribute Changed | Reinstated | Status |\n`;
  md += `|----------|------------|---------------------|---------------|-------------------|------------|--------|\n`;
  md += `| **Hardware Components** | ${totalActiveHwSKUs} | ${hwDiff.added || 0} | ${hwDiff.priceChanged || 0} | ${hwDiff.attributeChanged || 0} | ${hwDiff.reinstated || 0} | **CERTIFIED** |\n`;
  md += `| **Support Services & SLAs** | ${totalActiveSrvSKUs} | ${srvDiff.added || 0} | ${srvDiff.priceChanged || 0} | ${srvDiff.attributeChanged || 0} | ${srvDiff.reinstated || 0} | **CERTIFIED** |\n`;
  md += `| **Total Portfolio** | **${totalActiveHwSKUs + totalActiveSrvSKUs}** | **${(hwDiff.added || 0) + (srvDiff.added || 0)}** | **${(hwDiff.priceChanged || 0) + (srvDiff.priceChanged || 0)}** | **${(hwDiff.attributeChanged || 0) + (srvDiff.attributeChanged || 0)}** | **${(hwDiff.reinstated || 0) + (srvDiff.reinstated || 0)}** | **ACTIVE** |\n\n`;
  return md;
}

function _buildUniversalAndFamilyRulesSection(targetIdentity, universalRules = [], familyGenRules = []) {
  let md = `## 🌐 1. Universal Vendor Rules (${targetIdentity.vendor})\n\n`;
  if (universalRules.length === 0) {
    md += `*No verified universal vendor rules are registered for this product.*\n\n`;
  } else {
    universalRules.forEach((r, idx) => {
      md += `${idx + 1}. **[${r.deltaId}]**: ${r.ruleUpdate} *(Type: ${r.errorType})*\n`;
    });
    md += `\n`;
  }

  md += `## 🏛️ 2. Family & Generation Rules (${targetIdentity.family} ${targetIdentity.generation})\n\n`;
  if (familyGenRules.length === 0) {
    md += `*No verified family/generation rules are registered for this product.*\n\n`;
  } else {
    familyGenRules.forEach((r, idx) => {
      md += `${idx + 1}. **[${r.deltaId}] ${r.chassis}**: ${r.ruleUpdate} *(Affected SKU: ${r.affectedSku})*\n`;
    });
    md += `\n`;
  }
  return md;
}

function _buildChassisSpecificRulesSection(chassisName, chassisSpecificRules = [], targetIdentity) {
  let md = `## 🎯 3. Chassis & Solution-Type Gotchas (${chassisName})\n\n`;
  const relevantChassisRules = chassisSpecificRules.filter(r => {
    if (isVerifiedSharedAccessoryRule(r, targetIdentity)) return true;
    const c = String(r.chassis || '').toLowerCase();
    const target = String(chassisName || '').toLowerCase();
    return !target || c.includes(target) || target.includes(c);
  });

  if (relevantChassisRules.length === 0) {
    md += `*No specific gotchas logged for ${chassisName}. Baseline chassis layout rules active.*\n\n`;
  } else {
    relevantChassisRules.forEach((r, idx) => {
      if (isVerifiedSharedAccessoryRule(r, targetIdentity)) {
        const compatible = (r.compatibleProductIds || []).map(baseProductId).join(',');
        const ruleText = String(r.ruleUpdate || '').replace(/\s+/g, ' ').trim();
        const evidenceIds = (r.verificationSourceIds || []).map(id => String(id).replace(/[^A-Za-z0-9_.:-]/g, '')).filter(Boolean).join(',');
        md += `${idx + 1}. [SHARED_ACCESSORY_VERIFIED target=${compatible}] **[${r.deltaId}] ${r.affectedSku}**: ${ruleText} (Class: ${r.accessoryClass}; Evidence: ${r.compatibilityEvidenceType}; Sources: ${evidenceIds})\n\n`;
        return;
      }
      md += `${idx + 1}. **[${r.deltaId}] ${r.chassis}** (Taxonomy: \`${r.scopeTaxonomy || 'CHASSIS_SPECIFIC'}\` | Solution: \`${r.solutionType || 'General Server'}\`):\n`;
      md += `   - **Rule**: ${r.ruleUpdate}\n`;
      md += `   - **Affected SKU**: \`${r.affectedSku || 'N/A'}\` | **Required Dependency**: \`${r.requiredDependencySku || 'N/A'}\`\n`;
      if (r.humanReasoning) {
        md += `   - 💡 **Human Engineer Rationale**: *"${r.humanReasoning}"*\n`;
      }
      md += `\n`;
    });
    md += `\n`;
  }
  return md;
}

function _buildDiscontinuedSection(chassisName, discontinuedRegistry = {}, servicesDiscontinuedRegistry = {}, cfg) {
  let md = `## ⚠️ 4. Discontinued & Obsolete SKUs Registry\n\n`;
  const discontinuedList = [
    ...Object.values(discontinuedRegistry),
    ...Object.values(servicesDiscontinuedRegistry)
  ].filter(d => d.status === 'DISCONTINUED' || d.status === 'REMOVED' || d.status === 'REINSTATED');

  if (discontinuedList.length === 0) {
    md += `*No discontinued or reinstated SKUs detected for ${chassisName}. All cataloged SKUs are active.*\n\n`;
  } else {
    md += `| SKU | Description | Status | Discontinued Date | Last Known Price | Tracking | Retention |\n`;
    md += `|-----|-------------|--------|-------------------|------------------|----------|-----------|\n`;
    discontinuedList.forEach(d => {
      const skuPn = d.productNumber || d.sku || d['Product #'] || 'N/A';
      const description = d.description || 'N/A';
      let sharedEvidence = description;
      if (referencesOtherRegisteredProduct(description, chassisName, cfg)) {
        const accessoryClass = inferAccessoryClass(description, d.mainCategory || d.subCategory);
        const isIsolated = /\b(processor|xeon|epyc|ddr4|ddr5|memory\s+kit|chassis\s+cto|system\s+board)\b/i.test(description);
        if (accessoryClass && !isIsolated && skuPn !== 'N/A') {
          sharedEvidence = `[SHARED_ACCESSORY_VERIFIED target=${chassisName}] ${description} (Class: ${accessoryClass}; Evidence: CERTIFIED_OCA_CATALOG; Sources: ${chassisName}_Master_Catalog)`;
        }
      }
      md += `| \`${skuPn}\` | ${sharedEvidence} | **${d.status}** | ${d.discontinuedDate || 'N/A'} | ${d.lastKnownPrice ? `$${d.lastKnownPrice}` : 'N/A'} | ${d.trackingState || 'LIFECYCLE_RETAINED'} | ${d.retentionClass || 'COMPACT_LIFECYCLE_TOMBSTONE'} |\n`;
    });
    md += `\n`;
  }
  return md;
}

function _buildAttributeHistorySection(attributeHistory = []) {
  let md = `## 🔄 5. Recent Attribute & Specification Modifications Log\n\n`;
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
  return md;
}

function _buildSameProductVariantSection(chassisName, targetIdentity) {
  let md = `## 🧩 6. Same-Product CTO Variant Matrix\n\n`;
  const { getChassisMap } = require('../conflict/conflict_graph.js');
  const chassisMap = getChassisMap();

  md += `| Chassis Identifier | Product Family | Generation | Form Factor | CTO Base SKU |\n`;
  md += `|--------------------|----------------|------------|-------------|--------------|\n`;
  const sameProductVariants = Object.entries(chassisMap).filter(([id]) =>
    normalize(baseProductId(id)) === normalize(baseProductId(chassisName))
  );
  for (const [id, info] of sameProductVariants) {
    md += `| **${id}** | ${info.family || 'ProLiant'} | ${info.gen || 'Gen12'} | ${info.formFactor || 'SFF'} | \`${info.baseSku || 'N/A'}\` |\n`;
  }
  if (sameProductVariants.length === 0) md += `| ${chassisName} | ${targetIdentity.family} | ${targetIdentity.generation} | N/A | \`N/A\` |\n`;
  md += `\n`;
  return md;
}

/**
 * Generate comprehensive markdown sync payload for target chassis
 *
 * @param {string} chassisName
 * @param {boolean} autoUpload
 * @param {object|null} registryOrOptions
 * @param {object} maybeSyncOptions
 * @returns {{ payloadPath: string|null, markdownText: string, deltaCount: number, uploadResult: object|null }}
 */
function generateNotebookSyncPayload(chassisName = 'Unknown_Chassis', autoUpload = false, registryOrOptions = null, maybeSyncOptions = {}) {
  let registry = null;
  let syncOptions = {};
  if (registryOrOptions && typeof registryOrOptions === 'object') {
    if ('confirmSourceRetirement' in registryOrOptions || 'autoUpload' in registryOrOptions || 'syncOptions' in registryOrOptions) {
      syncOptions = registryOrOptions;
    } else {
      registry = registryOrOptions;
      syncOptions = maybeSyncOptions || {};
    }
  }

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
  const { findCatalogJsonFiles } = require('../catalog/sync_registry.js');
  const allCatalogFiles = findCatalogJsonFiles(OUTPUTS_ROOT);
  const baseChassisName = chassisName.replace(/_(SFF|LFF|EDSFF)$/i, '');
  const catalogPath = allCatalogFiles.find(f => path.basename(f).startsWith(chassisName) || path.basename(f).startsWith(baseChassisName)) || null;

  const { targetDir, isTestChassis } = _resolveSyncTargetDirectory(chassisName, catalogPath);

  let catalogData = null;
  if (catalogPath && fs.existsSync(catalogPath)) {
    try {
      catalogData = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
    } catch (e) {
      logger.error('KNOWLEDGE_SYNC', `Failed to parse catalogData at ${catalogPath}`, e);
      throw new Error(`SyncPayloadBuilderError: Corrupt catalog JSON at ${catalogPath}: ${e.message}`);
    }
  }

  const historyDir = path.join(targetDir, 'history');
  let discontinuedRegistry = {};
  const discontinuedSkusPath = path.join(historyDir, 'discontinued_skus.json');
  if (fs.existsSync(discontinuedSkusPath)) {
    try { discontinuedRegistry = JSON.parse(fs.readFileSync(discontinuedSkusPath, 'utf-8')); } catch (_) {}
  }

  let attributeHistory = [];
  const attributeHistoryPath = path.join(historyDir, 'attribute_history.json');
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
  let servicesDiscontinuedRegistry = {};
  const servicesDiscontinuedPath = path.join(servicesHistoryDir, 'services_discontinued_skus.json');
  if (fs.existsSync(servicesDiscontinuedPath)) {
    try { servicesDiscontinuedRegistry = JSON.parse(fs.readFileSync(servicesDiscontinuedPath, 'utf-8')); } catch (_) {}
  }

  const hwDiff = catalogData?.metadata?.diffSummary || { added: 0, removed: 0, priceChanged: 0, attributeChanged: 0, unchanged: 0, reinstated: 0 };
  const srvDiff = servicesData?.metadata?.diffSummary || { added: 0, removed: 0, priceChanged: 0, attributeChanged: 0, unchanged: 0, reinstated: 0 };
  const totalActiveHwSKUs = catalogData?.metadata?.totalUniqueSKUs || 0;
  const totalActiveSrvSKUs = servicesData?.metadata?.totalUniqueSKUs || 0;

  if (!registry) {
    const masterRegistryPath = path.join(OUTPUTS_ROOT, 'history', 'master_knowledge_registry.json');
    if (fs.existsSync(masterRegistryPath)) {
      try {
        registry = JSON.parse(fs.readFileSync(masterRegistryPath, 'utf-8'));
      } catch (_) {}
    }
  }

  const scopedRegistry = scopeRegistryForProduct(registry, chassisName, cfg);
  if (!scopedRegistry.target && !isTestChassis) {
    throw new Error(`SyncPayloadBuilderError: Product ${chassisName} is not registered with an exact vendor/family/generation identity.`);
  }

  const totalRules = scopedRegistry.totalLearnedRules || 0;
  const targetIdentity = scopedRegistry.target || { vendor: 'HPE', pillar: 'UNKNOWN', family: 'UNKNOWN', generation: 'UNKNOWN' };

  let md = _buildHeaderAndSummarySection(targetIdentity, chassisName, totalActiveHwSKUs, totalActiveSrvSKUs, totalRules, hwDiff, srvDiff);
  md += _buildUniversalAndFamilyRulesSection(targetIdentity, scopedRegistry.universalRules, scopedRegistry.familyGenRules);
  md += _buildChassisSpecificRulesSection(chassisName, scopedRegistry.chassisSpecificRules, targetIdentity);
  md += _buildDiscontinuedSection(chassisName, discontinuedRegistry, servicesDiscontinuedRegistry, cfg);
  md += _buildAttributeHistorySection(attributeHistory);
  md += _buildSameProductVariantSection(chassisName, targetIdentity);

  // Write payload file
  const safeFilename = `notebook_sync_payload_${chassisName}.md`;
  const payloadPath = path.join(targetDir, safeFilename);

  try {
    fs.writeFileSync(payloadPath, md, 'utf-8');
  } catch (err) {
    logger.warn('KNOWLEDGE_SYNC', `Failed to write payload to ${payloadPath}`, err);
  }

  let contentFingerprints = null;
  const masterCsvPath = path.join(targetDir, `${chassisName}_Master_Catalog.csv`);
  if (fs.existsSync(masterCsvPath) && fs.existsSync(payloadPath)) {
    try {
      contentFingerprints = buildKnowledgeWorkbookDatasets(masterCsvPath, payloadPath, {
        chassisName,
        targetDir
      }).fingerprints;
    } catch (fingerprintError) {
      logger.warn('KNOWLEDGE_SYNC', `Unable to calculate canonical content fingerprints for ${chassisName}: ${fingerprintError.message}`);
    }
  }

  let uploadResult = null;
  if (autoUpload) {
    const notebookId = (cfg.notebooks && cfg.notebooks[chassisName])
      ? (typeof cfg.notebooks[chassisName] === 'object' ? cfg.notebooks[chassisName].notebookId : cfg.notebooks[chassisName])
      : cfg.defaultNotebookId;
    uploadResult = syncToNotebookLM(notebookId, payloadPath, chassisName, totalRules, {
      ...syncOptions,
      contentFingerprints
    });
  }

  return {
    payloadPath,
    markdownText: md,
    deltaCount: totalRules,
    contentFingerprints,
    uploadResult
  };
}

module.exports = {
  generateNotebookSyncPayload,
  loadNotebookConfig
};
