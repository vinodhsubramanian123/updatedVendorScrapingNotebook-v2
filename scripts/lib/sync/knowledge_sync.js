'use strict';
/**
 * scripts/lib/knowledge_sync.js — Bi-Directional Knowledge Sync & Registry Coordinator
 *
 * Coordinates:
 * 1. Master Knowledge Registry compilation across learned deltas.
 * 2. Markdown payload generation (sync_payload_builder.js).
 * 3. NotebookLM CLI upload & source synchronization (nlm_sync_client.js).
 * 4. Knowledge drift inspection (drift_inspector.js).
 */

const fs = require('fs');
const path = require('path');
const { safeWriteJsonAtomic } = require('../system/fs_compat.js');
const { inferPillar, resolveProductIdentity } = require('../catalog/product_scope.js');

// Modular subcomponents
const { syncToNotebookLM } = require('./nlm_sync_client.js');
const { generateNotebookSyncPayload: buildPayload, loadNotebookConfig } = require('./sync_payload_builder.js');
const { inspectKnowledgeDrift: runDriftInspection } = require('./drift_inspector.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const OUTPUTS_ROOT = path.join(PROJECT_ROOT, 'outputs');
const MASTER_REGISTRY_FILE = path.join(OUTPUTS_ROOT, 'history', 'master_knowledge_registry.json');

/**
 * Normalizes chassis names to canonical format (INV-36 compliance).
 * - Replaces spaces with underscores ('DL380 Gen11' → 'DL380_Gen11')
 * - Strips trailing form-factor suffixes ('DL380_Gen12_SFF' → 'DL380_Gen12')
 */
function normalizeChassisName(name) {
  if (!name || name === 'GLOBAL') return name || 'GLOBAL';
  let normalized = String(name).trim().replace(/\s+/g, '_');
  normalized = normalized.replace(/_(8SFF|24SFF|8LFF|12LFF|EDSFF|SFF|LFF)$/i, '');
  return normalized;
}

function getNotebookIdForChassis(cfg, chassisName) {
  if (cfg && cfg.notebooks && cfg.notebooks[chassisName]) {
    const entry = cfg.notebooks[chassisName];
    const id = (typeof entry === 'object' && entry !== null) ? entry.notebookId : entry;
    if (id && String(id).trim()) return String(id).trim();
  }
  return (cfg && cfg.defaultNotebookId && String(cfg.defaultNotebookId).trim()) || null;
}

function classifyKnowledgeScope(deltaOrText) {
  // Accept both a delta object and a raw string (called from knowledge_extractor.js)
  const isString = typeof deltaOrText === 'string';
  const c = isString ? '' : String(deltaOrText.chassis || '').toLowerCase();
  const raw = isString
    ? deltaOrText.toLowerCase()
    : String(deltaOrText.rawMessage || deltaOrText.ruleUpdate || deltaOrText.errorType || '').toLowerCase();
  const ruleType = isString ? '' : String(deltaOrText.ruleType || '').toUpperCase();

  if (raw.includes('all hpe') || raw.includes('global') || raw.includes('vendor-wide') || raw.includes('across all servers') ||
      raw.includes('taa') || raw.includes('gta') || raw.includes('dc lug') || raw.includes('-48vdc') || raw.includes('telco')) {
    return 'UNIVERSAL_VENDOR';
  }
  const explicitlyFamilyWide = raw.includes('family-wide') || raw.includes('entire family') ||
    raw.includes('all gen11') || raw.includes('all gen12') || raw.includes('across this generation');
  if (!c && (ruleType === 'OPTION_TYPE_SUBSTITUTION' || explicitlyFamilyWide ||
      raw.includes('ddr5') || raw.includes('ddr4') || raw.includes('1dpc') || raw.includes('2dpc'))) {
    return 'FAMILY_GEN';
  }
  return 'CHASSIS_SPECIFIC';
}

function hasExplicitWideScopeEvidence(delta, level) {
  const raw = String(`${delta.scopeEvidence || ''} ${delta.rawMessage || ''} ${delta.ruleUpdate || ''}`).toLowerCase();
  if (level === 'vendor') {
    return delta.vendorWideVerified === true || /vendor-wide|all hpe products|across all hpe|across all servers/.test(raw);
  }
  return delta.familyWideVerified === true || /family-wide|entire family|all gen\s*\d+|across this generation/.test(raw);
}

function collectAllDeltas(outputsRoot = OUTPUTS_ROOT) {
  const deltas = [];
  const seenIds = new Set();

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        const ephemeral = ent.name === 'temp' || ent.name.startsWith('staging_') ||
          ent.name.startsWith('failed_') || ent.name.includes('_promotion_bak_');
        if (ephemeral) continue;
        scanDir(full);
      } else if (ent.name === 'catalog_deltas.json') {
        try {
          const content = JSON.parse(fs.readFileSync(full, 'utf-8'));
          const list = Array.isArray(content) ? content : (content.deltas || []);
          const inferredChassis = normalizeChassisName(
            path.basename(dir) === 'history' ? path.basename(path.dirname(dir)) : path.basename(dir)
          );
          list.forEach(d => {
            const governanceStatus = String(d.governanceStatus || d.status || '').toUpperCase();
            if (/QUARANTIN|REJECT|CONTRADICT|PENDING/.test(governanceStatus)) return;
            // Skip orphan deltas with no meaningful data
            if (!d.chassis && !d.affectedSku && !d.ruleType && !d.rawMessage) return;
            if (!d.chassis && inferredChassis && inferredChassis !== 'history' && inferredChassis !== 'outputs') {
              d.chassis = inferredChassis;
            }
            // Normalize chassis name if present (INV-36) — preserve undefined for universal scope classification
            if (d.chassis) d.chassis = normalizeChassisName(d.chassis);
            const rawText = d.rawMessage || d.ruleUpdate || '';
            const key = `${d.chassis}|${d.affectedSku}|${d.requiredDependencySku || ''}|${rawText}`;
            
            const existingIdx = deltas.findIndex(existing => {
              const existingRaw = existing.rawMessage || existing.ruleUpdate || '';
              return existing.chassis === d.chassis && 
                     existing.affectedSku === d.affectedSku &&
                     (existing.requiredDependencySku === d.requiredDependencySku || (!existing.requiredDependencySku && !d.requiredDependencySku)) &&
                     (existingRaw === rawText);
            });

            if (existingIdx >= 0) {
              const existingD = deltas[existingIdx];
              const dTime = d.timestamp ? new Date(d.timestamp).getTime() : 0;
              const eTime = existingD.timestamp ? new Date(existingD.timestamp).getTime() : 0;
              if (dTime > eTime) {
                deltas[existingIdx] = d;
              }
            } else {
              seenIds.add(key);
              deltas.push(d);
            }
          });
        } catch (_) {}
      }
    }
  }

  scanDir(outputsRoot);
  return deltas;
}

function buildMasterKnowledgeRegistry(options = {}) {
  const outputsRoot = options.outputsRoot || OUTPUTS_ROOT;
  const persist = options.persist !== false;
  const allDeltas = collectAllDeltas(outputsRoot);
  const notebookConfig = loadNotebookConfig();
  const universalRules = [];
  const familyGenRules = [];
  const chassisSpecificRules = [];

  allDeltas.forEach(d => {
    let scope = d.scopeTaxonomy || classifyKnowledgeScope(d);
    // Backward compatibility normalization
    if (scope === 'UNIVERSAL_HPE') scope = 'UNIVERSAL_VENDOR';
    if (scope === 'FAMILY_GEN_SPECIFIC') scope = 'FAMILY_GEN';

    // Legacy data frequently promoted a one-product portal observation merely
    // because its prose contained words such as "global" or "Gen12". Keep it
    // chassis-specific unless broad applicability was explicitly verified.
    const hasProductProvenance = Boolean(d.chassis || d.productId);
    const scopeWasCorrected =
      (scope === 'UNIVERSAL_VENDOR' && hasProductProvenance && !hasExplicitWideScopeEvidence(d, 'vendor')) ||
      (scope === 'FAMILY_GEN' && hasProductProvenance && !hasExplicitWideScopeEvidence(d, 'family'));
    if (scopeWasCorrected) scope = 'CHASSIS_SPECIFIC';

    const identity = resolveProductIdentity(d.chassis || '', notebookConfig);
    const enrichedDelta = {
      ...d,
      vendor: d.vendor || identity?.vendor || 'HPE',
      pillar: d.pillar || identity?.pillar || inferPillar(d.family),
      family: d.family || identity?.family || '',
      generation: d.generation || d.gen || identity?.generation || '',
      productId: d.productId || identity?.productId || d.chassis || '',
      scopeTaxonomy: scope,
      ...(scopeWasCorrected ? { scopeCorrection: 'CONSERVATIVE_PRODUCT_FIREWALL' } : {}),
      solutionType: d.solutionType || (d.chassis ? `${d.chassis} CTO Server` : 'General Server')
    };

    if (scope === 'UNIVERSAL_VENDOR') {
      universalRules.push(enrichedDelta);
    } else if (scope === 'FAMILY_GEN') {
      familyGenRules.push(enrichedDelta);
    } else {
      chassisSpecificRules.push(enrichedDelta);
    }
  });

  const nowISO = new Date().toISOString();

  // Collect unique product families represented in the learned rules (excluding non-product tokens)
  const familySet = new Set(allDeltas.map(d => d.family || (d.chassis || '').split('_')[0]).filter(f => Boolean(f) && !['GLOBAL', 'Universal', 'GENERAL'].includes(f)));

  const registry = {
    registryVersion: '2.0.0',
    schemaVersion: '1.0',
    // GAP-4 FIX: generatedAt is the canonical timestamp field read by the dashboard.
    // lastUpdated is preserved for backward compatibility with older consumers.
    generatedAt: nowISO,
    lastUpdated: nowISO,
    totalLearnedRules: allDeltas.length,
    totalDeduplicatedRules: allDeltas.length,
    productFamiliesSynced: [...familySet],
    counts: {
      universal: universalRules.length,
      familyGen: familyGenRules.length,
      chassisSpecific: chassisSpecificRules.length
    },
    universalRules,
    familyGenRules,
    chassisSpecificRules
  };

  const historyDir = path.join(outputsRoot, 'history');
  const registryFile = path.join(historyDir, 'master_knowledge_registry.json');
  if (persist && !fs.existsSync(historyDir)) fs.mkdirSync(historyDir, { recursive: true });
  if (persist) safeWriteJsonAtomic(registryFile, registry);

  // Emit consolidated master Markdown charter for universal cross-notebook sync
  const masterCharterFile = path.join(historyDir, 'master_universal_knowledge_charter.md');
  let md = `# HPE Knowledge Registry — Local Audit Index\n\n`;
  md += `**Document Version**: \`2.0.0\` | **Generated**: \`${nowISO}\`  \n`;
  md += `**Scope**: Local governance index. This file is not a NotebookLM source; product notebooks receive independently scoped projections.  \n`;
  md += `**Total Verified Knowledge Deltas**: \`${allDeltas.length}\` (\`${universalRules.length}\` Universal + \`${familyGenRules.length}\` Family/Gen + \`${chassisSpecificRules.length}\` Chassis Specific)  \n\n`;
  md += `---\n\n`;
  md += `## Scoped Knowledge Delta Inventory\n\n`;
  if (allDeltas.length === 0) {
    md += `*No persistent knowledge deltas logged.*\n`;
  } else {
    allDeltas.forEach((d, idx) => {
      md += `### ${idx + 1}. [${d.deltaId || `DELTA-${idx+1}`}] ${d.chassis || 'Universal'} — ${d.ruleType || 'RULE'}\n`;
      md += `- **Scope**: \`${d.scopeTaxonomy || 'CHASSIS_SPECIFIC'}\`\n`;
      md += `- **Rule**: ${d.ruleUpdate || d.rawMessage}\n`;
      if (d.affectedSku) md += `- **Affected SKU**: \`${d.affectedSku}\`\n`;
      if (d.requiredDependencySku) md += `- **Required Dependency**: \`${d.requiredDependencySku}\`\n`;
      if (d.humanReasoning) md += `- **Engineering Rationale**: *${d.humanReasoning}*\n`;
      md += `\n`;
    });
  }

  if (persist) {
    try { fs.writeFileSync(masterCharterFile, md, 'utf-8'); } catch (_) {}
  }

  return registry;
}

function generateNotebookSyncPayload(chassisName = 'Unknown_Chassis', autoUpload = false, syncOptions = {}) {
  const registry = buildMasterKnowledgeRegistry();
  return buildPayload(chassisName, autoUpload, registry, syncOptions);
}

function inspectKnowledgeDrift(chassisName = 'Unknown_Chassis') {
  const registry = buildMasterKnowledgeRegistry();
  const cfg = loadNotebookConfig();
  return runDriftInspection(chassisName, registry, cfg, generateNotebookSyncPayload);
}

async function main() {
  const args = process.argv.slice(2);
  const JSON_MODE = args.includes('--json');
  const AUTO_UPLOAD = args.includes('--auto-upload-nlm');
  const CONFIRM_SOURCE_RETIREMENT = args.includes('--confirm-source-retirement');

  let chassis = null;
  const chIdx = args.indexOf('--chassis');
  if (chIdx !== -1 && args[chIdx + 1]) chassis = args[chIdx + 1];

  const registry = buildMasterKnowledgeRegistry();
  const cfg = loadNotebookConfig();

  const { findCatalogJsonFiles } = require('../catalog/sync_registry.js');
  const allCatalogFiles = findCatalogJsonFiles(OUTPUTS_ROOT);
  const targetChassisList = chassis 
    ? [chassis] 
    : (allCatalogFiles.length > 0 
        ? allCatalogFiles.map(f => path.basename(f, '_Catalog.json')) 
        : []);

  const results = [];
  for (const ch of targetChassisList) {
    const payload = generateNotebookSyncPayload(ch, AUTO_UPLOAD, {
      confirmSourceRetirement: CONFIRM_SOURCE_RETIREMENT
    });
    const notebookId = getNotebookIdForChassis(cfg, ch);
    results.push({
      chassis: ch,
      notebookId,
      payloadPath: payload.payloadPath,
      deltaCount: payload.deltaCount,
      uploadResult: payload.uploadResult
    });
  }

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify({
      status: 'SUCCESS',
      data: { masterRegistry: registry, results }
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
  classifyKnowledgeScope,
  hasExplicitWideScopeEvidence,
  loadNotebookConfig,
  getNotebookIdForChassis,
  collectAllDeltas,
  normalizeChassisName
};
