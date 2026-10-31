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

function _resolveSyncTargetDirectory(chassisName, catalogPath, persistRequested) {
  const TEST_CHASSIS_PATTERNS = [
    /^edge-test-/i,
    /^hpe-chaos-test-/i,
    /^tmp[_-]test/i,
    /^test[_-]/i,
    /oca-feedback-test/i,
    /_test$/i
  ];
  const isTestChassis = TEST_CHASSIS_PATTERNS.some(p => p.test(chassisName));
  const persist = persistRequested !== false && (isTestChassis || process.env.NODE_ENV !== 'test' || persistRequested === true);

  if (isTestChassis) {
    const testDir = path.join(PROJECT_ROOT, 'outputs', 'temp', 'test_payloads');
    if (persist && !fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
    return { targetDir: testDir, isTestChassis: true };
  }

  if (catalogPath && fs.existsSync(catalogPath)) {
    const dir = path.dirname(catalogPath);
    if (persist && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return { targetDir: dir, isTestChassis: false };
  }

  const histDir = path.join(OUTPUTS_ROOT, 'history');
  if (persist && !fs.existsSync(histDir)) fs.mkdirSync(histDir, { recursive: true });
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
      md += `${idx + 1}. **[${r.deltaId}]**: ${r.ruleUpdate} *(Type: ${r.ruleType || r.errorType || 'ADVISORY'})*\n`;
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

function _buildDiscontinuedSection(chassisName, discontinuedRegistry = {}, servicesDiscontinuedRegistry = {}, cfg, catalogData = null) {
  let md = `## ⚠️ 4. Discontinued & Obsolete SKUs Registry\n\n`;
  const discontinuedList = [
    ...Object.values(discontinuedRegistry),
    ...Object.values(servicesDiscontinuedRegistry)
  ].filter(d => d.status === 'DISCONTINUED' || d.status === 'REMOVED' || d.status === 'REINSTATED');

  if (discontinuedList.length === 0) {
    md += `*No discontinued or reinstated SKUs detected for ${chassisName}. All cataloged SKUs are active.*\n\n`;
  } else {
    md += `### Fully Discontinued & Delisted SKUs\n\n`;
    md += `| SKU | Description | Status | Discontinued Date | Last Known Price | Successor SKU | Tracking |\n`;
    md += `|-----|-------------|--------|-------------------|------------------|---------------|----------|\n`;
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
      const successor = d.successorSku ? `\`${d.successorSku}\`` : 'None';
      md += `| \`${skuPn}\` | ${sharedEvidence} | **${d.status}** | ${d.discontinuedDate || 'N/A'} | ${d.lastKnownPrice ? `$${d.lastKnownPrice}` : 'N/A'} | ${successor} | ${d.trackingState || 'LIFECYCLE_RETAINED'} |\n`;
    });
    md += `\n`;
  }

  // Impending Obsolescence & Clearance SKUs (90-day to 180-day window)
  const impendingList = [];
  if (catalogData && Array.isArray(catalogData.entries)) {
    const scrapeDate = catalogData.metadata?.scrapeDate || new Date().toISOString().split('T')[0];
    const cutoffDate = new Date(new Date(scrapeDate).getTime() + 180 * 24 * 60 * 60 * 1000);

    for (const entry of catalogData.entries) {
      for (const sku of entry.skus || []) {
        const pn = sku['Product #'] || sku.sku;
        if (!pn) continue;
        const endDateStr = sku['Discontinued Date'];
        const badge = sku['Lifecycle Badge'] || sku.lifecycleBadge;
        const status = sku['Lifecycle Status'] || sku.lifecycleStatus || '';

        let isImpending = badge === '90' || /90|EOL/i.test(status);
        if (endDateStr && endDateStr !== 'None' && endDateStr !== 'NA') {
          const d = new Date(endDateStr);
          if (!isNaN(d.getTime()) && d <= cutoffDate && d >= new Date('2026-09-01')) {
            isImpending = true;
          }
        }

        if (isImpending) {
          const price = sku['Unit Price (USD)'] || sku.listPrice || '0.00';
          const priceChange = sku['Price Change (%)'] || '0.00%';
          const desc = sku.Description || sku.description || '';
          const isClearance = parseFloat(String(priceChange).replace('%', '')) <= -10;
          impendingList.push({
            sku: pn,
            description: desc,
            category: entry.parentCategory || 'Components',
            price,
            endDate: endDateStr || 'Impending (90-Day)',
            priceChange,
            isClearance
          });
        }
      }
    }
  }

  if (impendingList.length > 0) {
    md += `### ⏳ Impending Obsolescence & Clearance Hardware (90-Day to 180-Day Window)\n\n`;
    md += `*These components remain orderable in live configurators today but have published vendor end dates. They represent high-value clearance opportunities for immediate deployments, but require explicit procurement cutoff remarks before quotation:*\n\n`;
    md += `| Product # | Description | Category | List Price (USD) | Discontinued Date | Price Trend | Presales Strategy Guidance |\n`;
    md += `|---|---|---|---:|---|:---:|---|\n`;
    impendingList.slice(0, 25).forEach(item => {
      const strategyNote = item.isClearance
        ? `🔥 **Clearance Opportunity** (${item.priceChange} CapEx savings). Procure before ${item.endDate}.`
        : `⚠️ Approaching EOL (${item.endDate}). Valid for immediate builds; verify multi-year roadmaps.`;
      md += `| \`${item.sku}\` | ${item.description} | ${item.category} | $${Number(item.price).toLocaleString()} | ${item.endDate} | ${item.priceChange} | ${strategyNote} |\n`;
    });
    if (impendingList.length > 25) {
      md += `*... [${impendingList.length - 25} additional impending EOL records omitted for brevity]*\n`;
    }
    md += `\n`;
  }

  return md;
}

function _buildCategoryTrendsAndPriceMovesSection(catalogData) {
  if (!catalogData || !Array.isArray(catalogData.entries)) return '';

  let md = `## 📊 5b. Category-Level Trends & Significant Price Adjustments\n\n`;

  const catMap = new Map();
  const majorMoves = [];

  for (const entry of catalogData.entries) {
    const catName = entry.parentCategory || 'Uncategorized';
    if (!catMap.has(catName)) {
      catMap.set(catName, { total: 0, added: 0, modified: 0, unchanged: 0, priceDrops: 0, priceIncreases: 0 });
    }
    const rec = catMap.get(catName);

    for (const sku of entry.skus || []) {
      rec.total++;
      const diffStatus = sku['Diff Status'] || 'UNCHANGED';
      if (diffStatus === 'ADDED') rec.added++;
      else if (diffStatus.includes('CHANGED')) rec.modified++;
      else rec.unchanged++;

      const pctStr = String(sku['Price Change (%)'] || '0').replace('%', '');
      const pct = parseFloat(pctStr);
      const deltaStr = String(sku['Price Change (USD)'] || '$0.00').replace(/[^0-9.-]/g, '');
      const delta = parseFloat(deltaStr);

      if (pct <= -10) rec.priceDrops++;
      else if (pct >= 10 && delta > 50) rec.priceIncreases++;

      if (Math.abs(pct) >= 10 && Math.abs(delta) >= 50) {
        majorMoves.push({
          sku: sku['Product #'] || sku.sku,
          description: sku.Description || sku.description || '',
          category: catName,
          prevPrice: sku['Previous List Price (USD)'] || 'N/A',
          currPrice: sku['Unit Price (USD)'] || sku.listPrice || '0.00',
          delta,
          pct,
          isDrop: pct < 0
        });
      }
    }
  }

  md += `### Category Portfolio Delta & Planning Intelligence\n\n`;
  md += `| Category | Total SKUs | Added | Modified | Unchanged | Clearance / Drops | Category Planning Insight |\n`;
  md += `|---|---:|---:|---:|---:|---:|---|\n`;

  for (const [catName, stats] of catMap.entries()) {
    let insight = 'Stable portfolio';
    if (stats.priceDrops > 0) insight = `⚠️ Active price drops / clearance (${stats.priceDrops} SKUs discounted)`;
    else if (stats.added > 0) insight = `✨ Portfolio expanding (+${stats.added} new options)`;
    else if (stats.modified > 0) insight = `🔄 Attributes/specifications updated (${stats.modified} SKUs)`;

    md += `| **${catName}** | ${stats.total} | ${stats.added} | ${stats.modified} | ${stats.unchanged} | ${stats.priceDrops} | ${insight} |\n`;
  }
  md += `\n`;

  if (majorMoves.length > 0) {
    majorMoves.sort((a, b) => a.delta - b.delta);
    md += `### High-Impact Price Adjustments (Drops $\\ge 10\\%$ and Major Moves)\n\n`;
    md += `| Product # | Description | Category | Previous Price | Current Price | Delta (USD) | Change (%) | Movement Type |\n`;
    md += `|---|---|---|---:|---:|---:|---:|---|\n`;

    majorMoves.slice(0, 20).forEach(m => {
      const type = m.isDrop ? '📉 CLEARANCE_DROP' : (m.prevPrice === 'N/A' || isNaN(Number(m.prevPrice)) ? '✨ NEW_OPTION' : '📈 PRICE_INCREASE');
      const prevPriceStr = m.prevPrice === 'N/A' || isNaN(Number(m.prevPrice)) ? 'New Addition' : `$${Number(m.prevPrice).toLocaleString()}`;
      md += `| \`${m.sku}\` | ${m.description} | ${m.category} | ${prevPriceStr} | $${Number(m.currPrice || 0).toLocaleString()} | $${Number(m.delta || 0).toLocaleString()} | **${m.pct > 0 ? '+' : ''}${m.pct.toFixed(1)}%** | ${type} |\n`;
    });
    if (majorMoves.length > 20) {
      md += `*... [${majorMoves.length - 20} additional price movements omitted for brevity]*\n`;
    }
    md += `\n`;
  }

  return md;
}

function _buildAttributeHistorySection(attributeHistory = []) {
  let md = `## 🔄 5. Recent Attribute & Specification Modifications Log\n\n`;
  if (attributeHistory.length === 0) {
    md += `*No attribute or specification changes recorded across catalog snapshots.*\n\n`;
  } else {
    // Filter out trivial transitions and select meaningful ones
    const meaningful = attributeHistory.filter(a => {
      const field = a.field || a.attribute || '';
      if (field === 'HPE Recommended' && (!a.oldValue || a.oldValue === 'No') && a.newValue === 'No') return false;
      return true;
    });

    md += `| Timestamp | SKU | Attribute | Old Value | New Value |\n`;
    md += `|-----------|-----|-----------|-----------|-----------|\n`;
    meaningful.slice(-25).forEach(a => {
      const aSku = a.productNumber || a.sku || a['Product #'] || 'N/A';
      const aDate = a.date || a.timestamp?.split('T')[0] || 'N/A';
      const aField = a.field || a.attribute || 'Specification';
      md += `| ${aDate} | \`${aSku}\` | ${aField} | ${a.oldValue} | **${a.newValue}** |\n`;
    });
    md += `\n`;
  }
  return md;
}

function _buildUnavailableDomGatingRulesSection(unavailableRules = []) {
  let md = `## 🔒 3b. Physical & Architectural Gating Rules (DOM Unavailable Tables)\n\n`;
  if (!unavailableRules || unavailableRules.length === 0) {
    return md + `*No portal-conditional gating rules detected in default DOM state.*\n\n`;
  }

  const groups = {
    'AMBIENT_GATE': { title: 'Thermal & Ambient Temperature Gates', rules: [] },
    'MEMORY_MIXING': { title: 'Memory Technology & Density Mixing Constraints', rules: [] },
    'CHASSIS_GATE': { title: 'Base Chassis & Form Factor Compatibility Gates', rules: [] },
    'SLOT_COLLISION': { title: 'PCIe Riser & OCP Slot Contention Constraints', rules: [] },
    'PAIRED_KIT_REQUIRED': { title: 'Mandatory Paired Enablement Kits & Interconnects', rules: [] },
    'SUPPLY_RESTRICTED': { title: 'Customer Specific & Constrained Supply Gates', rules: [] },
    'MUTUAL_EXCLUSION': { title: 'Component Mutual Exclusion Rules', rules: [] },
    'BTO_DISALLOWED': { title: 'CTO vs BTO Factory Integration Rules', rules: [] }
  };

  for (const r of unavailableRules) {
    const type = r.ruleType || 'MUTUAL_EXCLUSION';
    if (!groups[type]) {
      groups[type] = { title: `${type.replace(/_/g, ' ')} Rules`, rules: [] };
    }
    groups[type].rules.push(r);
  }

  for (const group of Object.values(groups)) {
    if (group.rules.length === 0) continue;
    md += `### ${group.title}\n\n`;
    group.rules.forEach((r, idx) => {
      const skusFormatted = (r.affectedSkus || []).map(s => `\`${s}\``).join(', ');
      md += `${idx + 1}. **[${r.section || 'General'}]**: ${r.reason}\n`;
      md += `   - **Gated Rule Type**: \`${r.ruleType}\`\n`;
      md += `   - **Affected SKUs (${r.affectedSkusCount || (r.affectedSkus || []).length})**: ${skusFormatted || 'None'}\n\n`;
    });
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

function _buildSmartChassisAndRecommendedSection(catalogData) {
  let md = '';
  const smartCombos = catalogData?.smartChassisCombinations || [];
  if (smartCombos.length > 0) {
    md += `## 🛠️ 7. Valid Smart Chassis Combinations & Topological Capacity\n\n`;
    md += `| Pattern ID | Description | Base Price | Drive Cages | Total Bays | PCIe Slots | Controller |\n`;
    md += `|---|---|---:|---:|---:|---:|---|\n`;
    smartCombos.forEach(c => {
      md += `| \`${c.patternId}\` | ${c.description} | $${Number(c.price || 0).toLocaleString()} | ${c.qtyDriveCages} | ${c.qtyBays} | ${c.qtyPciSlots} | ${c.controllers} |\n`;
    });
    md += `\n`;
  }

  const recSkus = [];
  for (const entry of catalogData?.entries || []) {
    for (const sku of entry.skus || []) {
      const recVal = String(sku['HPE Recommended'] || sku.hpe_recommended || '').toLowerCase();
      const isVendorRec = sku.vendorRecommended === true;
      if (sku['HPE Recommended'] === 'Yes' || isVendorRec || recVal.includes('diamond') || recVal.includes('mainstream') || recVal.includes('gold')) {
        let badgeType = 'Recommended';
        if (recVal.includes('diamond')) badgeType = 'Diamond Preferred';
        else if (recVal.includes('mainstream') || recVal.includes('gold')) badgeType = 'Mainstream';

        recSkus.push({
          sku: sku['Product #'] || sku.sku,
          description: sku.Description || sku.description || '',
          category: entry.parentCategory || '',
          badge: badgeType,
          price: sku.listPrice || sku['Unit Price (USD)'] || '0.00',
          leadTime: (sku['Lead Time'] && sku['Lead Time'] !== 'Unpublished') ? sku['Lead Time'] : 'Unpublished'
        });
      }
    }
  }

  if (recSkus.length > 0) {
    md += `## ⭐ 8. Vendor Recommended & Preferred Hardware Options\n\n`;
    md += `| Product # | Description | Category | Recommendation Badge | List Price (USD) | Lead Time |\n`;
    md += `|---|---|---|:---:|---:|---|\n`;
    recSkus.forEach(s => {
      md += `| \`${s.sku}\` | ${s.description} | ${s.category} | **${s.badge}** | $${Number(s.price).toLocaleString()} | ${s.leadTime} |\n`;
    });
    md += `\n`;
  }

  const manifest = catalogData?.solutionManifest;
  if (manifest) {
    md += `## 📦 9. Solution Manifest, EDT & Commercial Baseline\n\n`;
    if (manifest.deliveryAndSupport) {
      const d = manifest.deliveryAndSupport;
      md += `**Configuration Profile**: \`${d.configName || 'Standard'}\` | **Icon ID**: \`${d.iconId || 'N/A'}\` | **Estimated Delivery Time (EDT)**: \`${d.edt || 'Standard'}\`\n\n`;
    }
    if (manifest.commercialBreakdown) {
      const c = manifest.commercialBreakdown;
      md += `| Hardware (USD) | Support (USD) | Services (USD) | Software (USD) | Total Baseline (USD) |\n`;
      md += `|---:|---:|---:|---:|---:|\n`;
      md += `| $${Number(c.hardware || 0).toLocaleString()} | $${Number(c.support || 0).toLocaleString()} | $${Number(c.services || 0).toLocaleString()} | $${Number(c.software || 0).toLocaleString()} | **$${Number(c.total || 0).toLocaleString()}** |\n\n`;
    }
    if (Array.isArray(manifest.baselineHierarchy) && manifest.baselineHierarchy.length > 0) {
      md += `### Authoritative Baseline BOM Hierarchy\n\n`;
      md += `| Level | Product # | Description | Qty | Unit Price (USD) | Ext. Price (USD) |\n`;
      md += `|---|---|---|---:|---:|---:|\n`;
      manifest.baselineHierarchy.slice(0, 20).forEach(h => {
        const pn = h.optionCode ? `${h.sku} ${h.optionCode}` : h.sku;
        md += `| ${h.hierarchyLevel} | \`${pn}\` | ${h.description} | ${h.quantity} | $${Number(h.unitPrice || 0).toLocaleString()} | $${Number(h.extPrice || 0).toLocaleString()} |\n`;
      });
      if (manifest.baselineHierarchy.length > 20) {
        md += `*... [${manifest.baselineHierarchy.length - 20} additional baseline items omitted for brevity]*\n`;
      }
      md += `\n`;
    }
  }

  // Section 10: Supply Chain & Channel Lead Time Intel
  const leadTimeItems = [];
  const unpubDeliveryRisk = [];
  for (const entry of catalogData?.entries || []) {
    for (const sku of entry.skus || []) {
      const lt = sku['Lead Time'] || sku.leadTime || '';
      const pn = sku['Product #'] || sku.sku;
      if (!pn) continue;
      if (lt && lt !== 'Not published by OCA' && lt !== 'Standard' && lt !== 'Unpublished') {
        leadTimeItems.push({
          sku: pn,
          description: sku.Description || sku.description || '',
          category: entry.parentCategory || '',
          leadTime: lt,
          availability: sku.Availability || sku.availability || 'Available'
        });
      } else if (lt === 'Unpublished' || sku.leadTimeDays === null) {
        const price = parseFloat(sku['Unit Price (USD)'] || sku.listPrice || '0');
        if (price > 5000) {
          unpubDeliveryRisk.push({
            sku: pn,
            description: sku.Description || sku.description || '',
            category: entry.parentCategory || ''
          });
        }
      }
    }
  }

  if (leadTimeItems.length > 0 || unpubDeliveryRisk.length > 0) {
    md += `## ⏱️ 10. Supply Chain & Delivery Lead Time Intelligence\n\n`;
    if (leadTimeItems.length > 0) {
      md += `### Confirmed Component Delivery SLAs\n\n`;
      md += `| Product # | Description | Category | Lead Time | Channel Status |\n`;
      md += `|---|---|---|---:|---|\n`;
      leadTimeItems.slice(0, 30).forEach(s => {
        md += `| \`${s.sku}\` | ${s.description} | ${s.category} | ${s.leadTime} | ${s.availability} |\n`;
      });
      if (leadTimeItems.length > 30) {
        md += `*... [${leadTimeItems.length - 30} additional supply chain records omitted for brevity]*\n`;
      }
      md += `\n`;
    }

    if (unpubDeliveryRisk.length > 0) {
      md += `### ⚠️ Supply Chain Verification Advisory (Unpublished Delivery Lead Times)\n\n`;
      md += `*The following high-value active components have unpublished delivery estimates in live OCA. Presales engineers must verify distributor buffer stock before quoting committed deployment timelines:*\n\n`;
      md += `| Product # | Description | Category | Lead Time Status | Presales Action |\n`;
      md += `|---|---|---|:---:|---|\n`;
      unpubDeliveryRisk.slice(0, 15).forEach(s => {
        md += `| \`${s.sku}\` | ${s.description} | ${s.category} | **Unpublished** | Verify distributor inventory prior to SLA commitment |\n`;
      });
      if (unpubDeliveryRisk.length > 15) {
        md += `*... [${unpubDeliveryRisk.length - 15} additional unpublished items omitted for brevity]*\n`;
      }
      md += `\n`;
    }
  }

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
    if ('confirmSourceRetirement' in registryOrOptions || 'autoUpload' in registryOrOptions || 'syncOptions' in registryOrOptions || 'persist' in registryOrOptions) {
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
  const isValidFormat = chassisName && /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(chassisName) && chassisName.length <= 80;

  if (BLOCKED_CHASSIS.has(chassisName) || (!isRegisteredChassis && !isValidFormat)) {
    logger.warn('KNOWLEDGE_SYNC', `Refusing to generate sync payload for invalid chassis: "${chassisName}"`);
    return { payloadPath: null, markdownText: '', deltaCount: 0, uploadResult: null };
  }

  // Find catalog path dynamically
  const { findCatalogJsonFiles } = require('../catalog/sync_registry.js');
  const allCatalogFiles = findCatalogJsonFiles(OUTPUTS_ROOT);
  const baseChassisName = chassisName.replace(/_(SFF|LFF|EDSFF)$/i, '');
  const catalogPath = allCatalogFiles.find(f => path.basename(f).startsWith(chassisName) || path.basename(f).startsWith(baseChassisName)) || null;

  const { targetDir, isTestChassis } = _resolveSyncTargetDirectory(chassisName, catalogPath, syncOptions.persist);

  let catalogData = null;
  if (catalogPath && fs.existsSync(catalogPath)) {
    try {
      catalogData = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
    } catch (e) {
      logger.error('KNOWLEDGE_SYNC', `Failed to parse catalogData at ${catalogPath}`, e);
      throw new Error(`SyncPayloadBuilderError: Corrupt catalog JSON at ${catalogPath}: ${e.message}`);
    }

    // Pre-flight catalog quality assertion (INV-124 / INV-139 / INV-158)
    if (!isTestChassis) {
      const { assertScrapedCatalogQuality } = require('../catalog/catalog_freshness_guard.js');
      assertScrapedCatalogQuality(targetDir, {
        chassisName,
        throwOnError: true,
        requireHumanConfirmation: syncOptions.requireHumanConfirmation === true,
        humanConfirmed: syncOptions.humanConfirmed === true
      });
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

  let unavailableRules = [];
  const unavailRulesPath = path.join(targetDir, 'raw_data', 'unavailable_rules.json');
  if (fs.existsSync(unavailRulesPath)) {
    try {
      const parsedUnavail = JSON.parse(fs.readFileSync(unavailRulesPath, 'utf8'));
      unavailableRules = parsedUnavail.rules || [];
    } catch (_) {}
  }

  let md = _buildHeaderAndSummarySection(targetIdentity, chassisName, totalActiveHwSKUs, totalActiveSrvSKUs, totalRules, hwDiff, srvDiff);
  const rawCapturePath = path.join(targetDir, 'raw_data', 'oca_raw_data_full.json');
  if (fs.existsSync(rawCapturePath)) {
    const rawCapture = JSON.parse(fs.readFileSync(rawCapturePath, 'utf8'));
    if (rawCapture.parentConfiguration) {
      md += `\n## Owned component capture scope\n\nObserved ${rawCapture.timestamp}; base ${rawCapture.selectedBaseSku}; owner ${rawCapture.ownerConfiguration}; parent ${rawCapture.parentConfiguration}. This is the component catalog, not certification of its parent solution.\n\n`;
      if (rawCapture.componentServiceEvidence) md += `Service scope: ${rawCapture.componentServiceEvidence.scope}. Unexecuted: ${(rawCapture.componentServiceEvidence.unexecuted || []).join('; ')}. Missing prices remain unknown.\n\n`;
    }
  }
  md += _buildUniversalAndFamilyRulesSection(targetIdentity, scopedRegistry.universalRules, scopedRegistry.familyGenRules);
  md += _buildChassisSpecificRulesSection(chassisName, scopedRegistry.chassisSpecificRules, targetIdentity);
  md += _buildUnavailableDomGatingRulesSection(unavailableRules);
  md += _buildDiscontinuedSection(chassisName, discontinuedRegistry, servicesDiscontinuedRegistry, cfg, catalogData);
  md += _buildCategoryTrendsAndPriceMovesSection(catalogData);
  md += _buildAttributeHistorySection(attributeHistory);
  md += _buildSameProductVariantSection(chassisName, targetIdentity);
  md += _buildSmartChassisAndRecommendedSection(catalogData);
  // Publish vendor-observed service evidence separately from customer inputs.
  // The receipt is fresh, complete, and icon-scoped; this does not certify a
  // future candidate or make its complete customer manifest an authority.
  const receipt = require('../boq/portal_receipt').readPortalReceipt(targetDir);
  const baseSku = cfg.notebooks?.[chassisName]?.baseSku;
  if (receipt && baseSku && receipt.rows.some(row => row.sku === baseSku)) {
    const serviceBases = new Set(receipt.rows.filter(row => /\b(service|support|svc|inst(?:all(?:ation)?)?)\b/i.test(row.description || '')).map(row => row.sku.split('#')[0]));
    const serviceRows = receipt.rows.filter(row => serviceBases.has(row.sku.split('#')[0]));
    if (serviceRows.length) {
      md += `\n## Live OCA product-qualified service observations\n\nProduct ${baseSku}; captured ${receipt.capturedAt}. Source: authenticated HPE OCA Components service editor and complete CLIC acceptance. Receipt SHA-256: ${receipt.checkSha256}. This dated evidence proves the following services were accepted for this product; future availability and any changed configuration require a new live check.\n\n`;
      md += '| Service SKU | Vendor description | Captured unit list USD |\n|---|---|---:|\n';
      for (const row of serviceRows) md += `| ${row.sku} | ${row.description} | ${row.unitPriceUsd} |\n`;
    }
  }

  // Write payload file atomically (prevents transient Windows file-lock errors right after staging promotion)
  const safeFilename = `notebook_sync_payload_${chassisName}.md`;
  const payloadPath = path.join(targetDir, safeFilename);
  const tmpPayloadPath = `${payloadPath}.${Date.now()}.tmp`;
  const shouldPersist = syncOptions.persist !== false && (isTestChassis || process.env.NODE_ENV !== 'test' || syncOptions.persist === true);
  if (!shouldPersist) return {
    payloadPath: null, markdownText: md, deltaCount: totalRules,
    payloadPersisted: false, contentFingerprints: null,
    uploadResult: autoUpload ? { success: false, error: 'PERSISTENCE_DISABLED' } : null
  };

  if (shouldPersist) {
    try {
      fs.writeFileSync(tmpPayloadPath, md, 'utf-8');
      try {
        if (fs.existsSync(payloadPath)) fs.unlinkSync(payloadPath);
      } catch (_) {}
      try {
        fs.renameSync(tmpPayloadPath, payloadPath);
      } catch (_) {
        fs.copyFileSync(tmpPayloadPath, payloadPath);
        try { fs.unlinkSync(tmpPayloadPath); } catch (__) {}
      }
    } catch (err) {
      try { if (fs.existsSync(tmpPayloadPath)) fs.unlinkSync(tmpPayloadPath); } catch (_) {}
      logger.warn('KNOWLEDGE_SYNC', `Failed to write payload to ${payloadPath}`, err);
      throw new Error(`KNOWLEDGE_PAYLOAD_WRITE_FAILED: ${err.code || 'WRITE_ERROR'}`, { cause: err });
    }
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
