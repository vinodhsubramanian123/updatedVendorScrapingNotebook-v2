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
const { inferPillar, resolveProductIdentity, isApprovedUniversalPolicySku } = require('../catalog/product_scope.js');

// Modular subcomponents
const { syncToNotebookLM } = require('./nlm_sync_client.js');
const { generateNotebookSyncPayload: buildPayload, loadNotebookConfig } = require('./sync_payload_builder.js');
const { inspectKnowledgeDrift: runDriftInspection } = require('./drift_inspector.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const OUTPUTS_ROOT = path.join(PROJECT_ROOT, 'outputs');

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
    // Respect explicit disabling — never return an ID for a disabled notebook
    if (typeof entry === 'object' && entry !== null && entry.queryEnabled === false) {
      return null;
    }
    const id = (typeof entry === 'object' && entry !== null) ? entry.notebookId : entry;
    if (id && String(id).trim()) return String(id).trim();
  }
  return null;
}

/**
 * Returns a degraded-mode flag string when the notebook entry has a known degradation,
 * or null when the notebook is healthy.
 *
 * Possible return values:
 *   'QUERY_DISABLED'       — queryEnabled === false in notebooks.json
 *   'STALE_NOTEBOOK_SYNC'  — cloudSyncState === 'FAILED' in notebooks.json
 *   'NO_NOTEBOOK_MAPPED'   — no entry at all for this chassis
 *   null                   — notebook is healthy / no degradation detected
 *
 * @param {object} cfg           — parsed notebooks.json content
 * @param {string} chassisName   — normalized chassis key, e.g. 'DL380_Gen12'
 * @returns {string|null}
 */
function getNotebookDegradedMode(cfg, chassisName) {
  if (!cfg || !cfg.notebooks || !cfg.notebooks[chassisName]) {
    return 'NO_NOTEBOOK_MAPPED';
  }
  const entry = cfg.notebooks[chassisName];
  if (typeof entry === 'object' && entry !== null) {
    if (entry.queryEnabled === false) return 'QUERY_DISABLED';
    if (entry.cloudSyncState === 'FAILED') return 'STALE_NOTEBOOK_SYNC';
    if (entry.cloudSyncState !== 'VERIFIED' || !entry.lastSyncedAt) return 'UNVERIFIED_NOTEBOOK_SYNC';
  } else {
    return 'UNVERIFIED_NOTEBOOK_SYNC';
  }
  return null;
}

/**
 * Emits a structured degradation alert when a notebook has cloudSyncState=FAILED.
 * Sets the evaluation confidence label to DEGRADED_UNGROUNDED for this chassis.
 * Called from the knowledge sync coordinator before any cloud query.
 * @param {object} cfg - parsed notebooks.json
 * @param {string} chassisName - canonical chassis key
 * @param {object} loggerRef - pipeline_logger instance
 * @returns {{ isHealthy: boolean, degradationMode: string|null, confidenceLabel: string }}
 */
function assertNotebookHealth(cfg, chassisName, loggerRef) {
  const degradedMode = getNotebookDegradedMode(cfg, chassisName);
  if (!degradedMode) {
    return { isHealthy: true, degradationMode: null, confidenceLabel: 'GROUNDED' };
  }

  const entry = cfg?.notebooks?.[chassisName];
  const lastError = (typeof entry === 'object' && entry?.lastSyncError) ? entry.lastSyncError.substring(0, 200) : 'unknown';

  loggerRef.error('KNOWLEDGE_SYNC',
    `[DEGRADED] Notebook for "${chassisName}" is in degraded mode: ${degradedMode}.\n` +
    `  Last sync error: ${lastError}\n` +
    `  Action required: Re-authenticate Google OAuth and re-run: nlm source sync-drive ${chassisName}\n` +
    `  Evaluation will proceed with LOCAL RAG only — NLM grounding is UNAVAILABLE.`
  );

  const confidenceLabel = degradedMode === 'NO_NOTEBOOK_MAPPED'
    ? 'UNGROUNDED_NO_NOTEBOOK'
    : 'DEGRADED_UNGROUNDED';

  return { isHealthy: false, degradationMode: degradedMode, confidenceLabel };
}

const UNIVERSAL_KEYWORDS = ['all hpe', 'global', 'vendor-wide', 'across all servers', 'taa', 'gta', 'dc lug', '-48vdc', 'telco'];
const FAMILY_KEYWORDS = ['family-wide', 'entire family', 'all gen11', 'all gen12', 'across this generation', 'ddr5', 'ddr4', '1dpc', '2dpc'];

function _hasChassisHardwareSku(deltaOrText) {
  return Boolean(deltaOrText.affectedSku && !isApprovedUniversalPolicySku(deltaOrText.affectedSku)) ||
         Boolean(deltaOrText.requiredDependencySku && !isApprovedUniversalPolicySku(deltaOrText.requiredDependencySku));
}

function classifyKnowledgeScope(deltaOrText) {
  // Accept both a delta object and a raw string (called from knowledge_extractor.js)
  const isString = typeof deltaOrText === 'string';
  const c = isString ? '' : String(deltaOrText.chassis || '').toLowerCase();
  const raw = isString
    ? deltaOrText.toLowerCase()
    : String(deltaOrText.rawMessage || deltaOrText.ruleUpdate || deltaOrText.errorType || '').toLowerCase();
  const ruleType = isString ? '' : String(deltaOrText.ruleType || '').toUpperCase();

  // Strict Invariant (INV-48 / INV-110): Universal / shared rules must NEVER contain chassis hardware SKUs
  if (!isString && _hasChassisHardwareSku(deltaOrText)) {
    return 'CHASSIS_SPECIFIC';
  }

  if (UNIVERSAL_KEYWORDS.some(kw => raw.includes(kw))) {
    return 'UNIVERSAL_VENDOR';
  }
  const matchesFamily = ruleType === 'OPTION_TYPE_SUBSTITUTION' || FAMILY_KEYWORDS.some(kw => raw.includes(kw));
  if (!c && matchesFamily) {
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

function _shouldSkipDeltaGovernance(d) {
  if (d.active === false) return true;
  if ([d.status, d.governanceStatus].some(s => /^(RETRACTED|SUPERSEDED|REVOKED|EXPIRED|DEPRECATED)$/i.test(s || ''))) return true;
  const governanceStatus = String(d.governanceStatus || d.status || '').toUpperCase();
  if (/QUARANTIN|REJECT|CONTRADICT|PENDING/.test(governanceStatus)) return true;
  return !d.chassis && !d.affectedSku && !d.ruleType && !d.rawMessage;
}

function _mergeSingleDelta(d, inferredChassis, deltas, seenIds) {
  if (_shouldSkipDeltaGovernance(d)) return;
  if (!d.chassis && inferredChassis && inferredChassis !== 'history' && inferredChassis !== 'outputs') {
    d.chassis = inferredChassis;
  }
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
}

function _scanDeltasDir(dir, deltas, seenIds) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      const ephemeral = ent.name === 'temp' || ent.name.startsWith('staging_') ||
        ent.name.startsWith('failed_') || ent.name.includes('_promotion_bak_');
      if (ephemeral) continue;
      _scanDeltasDir(full, deltas, seenIds);
    } else if (ent.name === 'catalog_deltas.json') {
      try {
        const content = JSON.parse(fs.readFileSync(full, 'utf-8'));
        const list = Array.isArray(content) ? content : (content.deltas || []);
        const inferredChassis = normalizeChassisName(
          path.basename(dir) === 'history' ? path.basename(path.dirname(dir)) : path.basename(dir)
        );
        const { _loadRevokedIdentifiers, _isDeltaRevokedOrInactive } = require('../catalog/active_knowledge_router');
        const revoked = _loadRevokedIdentifiers(path.basename(dir) === 'history' ? path.dirname(dir) : dir);
        list.filter(d => !_isDeltaRevokedOrInactive(d, revoked))
          .forEach(d => _mergeSingleDelta(d, inferredChassis, deltas, seenIds));
      } catch (_) {}
    }
  }
}

function collectAllDeltas(outputsRoot = OUTPUTS_ROOT) {
  const deltas = [];
  const seenIds = new Set();
  _scanDeltasDir(outputsRoot, deltas, seenIds);
  return deltas;
}

function _shouldCorrectDeltaScope(scope, d, hasProductProvenance, hasChassisHardwareSku) {
  if (hasChassisHardwareSku && (scope === 'UNIVERSAL_VENDOR' || scope === 'FAMILY_GEN')) {
    return true;
  }
  if (scope === 'UNIVERSAL_VENDOR' && hasProductProvenance && !hasExplicitWideScopeEvidence(d, 'vendor')) {
    return true;
  }
  if (scope === 'FAMILY_GEN' && hasProductProvenance && !hasExplicitWideScopeEvidence(d, 'family')) {
    return true;
  }
  return false;
}

function _resolveEnrichedDeltaScope(d, notebookConfig) {
  let scope = d.scopeTaxonomy || classifyKnowledgeScope(d);
  if (scope === 'UNIVERSAL_HPE') scope = 'UNIVERSAL_VENDOR';
  if (scope === 'FAMILY_GEN_SPECIFIC') scope = 'FAMILY_GEN';

  const hasProductProvenance = Boolean(d.chassis || d.productId);
  const hasChassisHardwareSku =
    Boolean(d.affectedSku && !isApprovedUniversalPolicySku(d.affectedSku)) ||
    Boolean(d.requiredDependencySku && !isApprovedUniversalPolicySku(d.requiredDependencySku));
  const scopeWasCorrected = _shouldCorrectDeltaScope(scope, d, hasProductProvenance, hasChassisHardwareSku);
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

  return { enrichedDelta, scope };
}

function _formatCharterRulesSection(rules, prefix, emptyMessage, titleFormatter) {
  if (!rules || rules.length === 0) {
    return `*${emptyMessage}*\n\n`;
  }
  let out = '';
  rules.forEach((d, idx) => {
    const title = titleFormatter ? titleFormatter(d, idx) : `[${d.deltaId || `DELTA-${prefix}${idx+1}`}] ${d.ruleType || 'RULE'}`;
    out += `#### ${prefix}${idx + 1}. ${title}\n`;
    out += `- **Scope**: \`${d.scopeTaxonomy || 'UNKNOWN'}\`\n`;
    out += `- **Rule**: ${d.ruleUpdate || d.rawMessage}\n`;
    if (d.affectedSku) out += `- **Affected ${prefix === 'U' ? 'Policy Token' : 'SKU'}**: \`${d.affectedSku}\`\n`;
    if (d.requiredDependencySku) out += `- **Required Dependency**: \`${d.requiredDependencySku}\`\n`;
    if (d.humanReasoning) out += `- **Engineering Rationale**: *${d.humanReasoning}*\n`;
    out += `\n`;
  });
  return out;
}

function _buildMasterCharterMarkdown(nowISO, allDeltasCount, universalRules, familyGenRules, chassisSpecificRules) {
  let md = `# HPE Knowledge Registry — Local Audit Index\n\n`;
  md += `**Document Version**: \`2.0.0\` | **Generated**: \`${nowISO}\`  \n`;
  md += `**Scope**: Local governance index. This file is not a NotebookLM source; product notebooks receive independently scoped projections.  \n`;
  md += `**Total Verified Knowledge Deltas**: \`${allDeltasCount}\` (\`${universalRules.length}\` Universal + \`${familyGenRules.length}\` Family/Gen + \`${chassisSpecificRules.length}\` Chassis Specific)  \n\n`;
  md += `---\n\n`;
  md += `## Scoped Knowledge Delta Inventory\n\n`;

  md += `### 🌐 1. Universal Vendor Rules (Zero Product-Specific SKUs)\n\n`;
  md += _formatCharterRulesSection(
    universalRules,
    'U',
    'No verified universal vendor rules logged.',
    (d, idx) => `[${d.deltaId || `DELTA-U${idx+1}`}] ${d.ruleType || 'POLICY'}`
  );

  md += `### 🏛️ 2. Family & Generation Rules\n\n`;
  md += _formatCharterRulesSection(
    familyGenRules,
    'F',
    'No verified family/generation rules logged.',
    (d, idx) => `[${d.deltaId || `DELTA-F${idx+1}`}] ${d.family || 'Family'} ${d.generation || 'Gen'} — ${d.ruleType || 'RULE'}`
  );

  md += `### 🎯 3. Chassis & Solution Gotchas (Grouped by Product)\n\n`;
  md += _formatCharterRulesSection(
    chassisSpecificRules,
    'C',
    'No persistent chassis-specific gotchas logged.',
    (d, idx) => `[${d.deltaId || `DELTA-C${idx+1}`}] ${d.chassis || 'Chassis'} — ${d.ruleType || 'RULE'}`
  );

  return md;
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
    const { enrichedDelta, scope } = _resolveEnrichedDeltaScope(d, notebookConfig);
    if (scope === 'UNIVERSAL_VENDOR') {
      universalRules.push(enrichedDelta);
    } else if (scope === 'FAMILY_GEN') {
      familyGenRules.push(enrichedDelta);
    } else {
      chassisSpecificRules.push(enrichedDelta);
    }
  });

  const nowISO = new Date().toISOString();
  const familySet = new Set(allDeltas.map(d => d.family || (d.chassis || '').split('_')[0]).filter(f => Boolean(f) && !['GLOBAL', 'Universal', 'GENERAL'].includes(f)));

  const registry = {
    registryVersion: '2.0.0',
    schemaVersion: '1.0',
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

  const masterCharterFile = path.join(historyDir, 'master_universal_knowledge_charter.md');
  const md = _buildMasterCharterMarkdown(nowISO, allDeltas.length, universalRules, familyGenRules, chassisSpecificRules);

  if (persist) {
    try { fs.writeFileSync(masterCharterFile, md.replace(/[ \t]+$/gm, '').trimEnd() + '\n', 'utf-8'); } catch (_) {}
  }

  return registry;
}

function generateNotebookSyncPayload(chassisName = 'Unknown_Chassis', autoUpload = false, syncOptions = {}) {
  const persist = syncOptions.persist !== undefined ? syncOptions.persist : (process.env.NODE_ENV !== 'test');
  const registry = buildMasterKnowledgeRegistry({ persist });
  return buildPayload(chassisName, autoUpload, registry, { ...syncOptions, persist });
}

function inspectKnowledgeDrift(chassisName = 'Unknown_Chassis') {
  const registry = buildMasterKnowledgeRegistry({ persist: false });
  const cfg = loadNotebookConfig();
  return runDriftInspection(chassisName, registry, cfg,
    name => buildPayload(name, false, registry, { persist: false }));
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

  const complete = AUTO_UPLOAD && results.length > 0 && results.every(result => result.uploadResult?.success === true);
  if (AUTO_UPLOAD && !complete) process.exitCode = 1;

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify({
      status: complete ? 'CLOUD_VERIFIED' : AUTO_UPLOAD ? 'CLOUD_FAILED' : 'LOCAL_PAYLOAD_ONLY',
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
  console.log(complete ? 'Knowledge sync cloud verification complete.' : 'Knowledge sync remains local-only or incomplete; inspect per-product results.');
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
  getNotebookDegradedMode,
  assertNotebookHealth,
  collectAllDeltas,
  normalizeChassisName
};
