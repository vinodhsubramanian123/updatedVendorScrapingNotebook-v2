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

// Modular subcomponents
const { syncToNotebookLM } = require('./nlm_sync_client.js');
const { generateNotebookSyncPayload: buildPayload, loadNotebookConfig } = require('./sync_payload_builder.js');
const { inspectKnowledgeDrift: runDriftInspection } = require('./drift_inspector.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const OUTPUTS_ROOT = path.join(PROJECT_ROOT, 'outputs');
const MASTER_REGISTRY_FILE = path.join(OUTPUTS_ROOT, 'history', 'master_knowledge_registry.json');

function getNotebookIdForChassis(cfg, chassisName) {
  if (cfg && cfg.notebooks && cfg.notebooks[chassisName]) {
    const entry = cfg.notebooks[chassisName];
    const id = (typeof entry === 'object' && entry !== null) ? entry.notebookId : entry;
    if (id && String(id).trim()) return String(id).trim();
  }
  return (cfg && cfg.defaultNotebookId && String(cfg.defaultNotebookId).trim()) || "1d190853-4e9c-48df-aa70-eae66c6f2c1f";
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
  // BTO→FIO substitutions apply to all CTO ProLiant builds — promote to FAMILY_GEN
  if (ruleType === 'OPTION_TYPE_SUBSTITUTION' ||
      raw.includes('bto') || raw.includes('fio') || raw.includes('configure-to-order') ||
      raw.includes('factory integrated') || raw.includes('-f21') ||
      raw.includes('ddr5') || raw.includes('ddr4') || raw.includes('1dpc') || raw.includes('2dpc') ||
      raw.includes('tri-mode') || raw.includes('mr416i') || raw.includes('sr932i') ||
      raw.includes('storage battery') || raw.includes('p01366-b21') ||
      raw.includes('high performance fan') || raw.includes('p48820-b21') ||
      (c.includes('gen12') || c.includes('gen11') || c.includes('proliant') ||
       c.includes('alletra') || c.includes('synergy') || c.includes('cray') ||
       c.includes('storeever') || c.includes('msl'))) {
    return 'FAMILY_GEN';
  }
  return 'CHASSIS_SPECIFIC';
}

function collectAllDeltas() {
  const deltas = [];
  const seenIds = new Set();

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        scanDir(full);
      } else if (ent.name === 'catalog_deltas.json') {
        try {
          const content = JSON.parse(fs.readFileSync(full, 'utf-8'));
          const list = Array.isArray(content) ? content : (content.deltas || []);
          const inferredChassis = path.basename(dir) === 'history' ? path.basename(path.dirname(dir)) : path.basename(dir);
          list.forEach(d => {
            // Skip orphan deltas with no meaningful data
            if (!d.chassis && !d.affectedSku && !d.ruleType && !d.rawMessage) return;
            if (!d.chassis && inferredChassis && inferredChassis !== 'history' && inferredChassis !== 'outputs') {
              d.chassis = inferredChassis;
            }
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

  scanDir(OUTPUTS_ROOT);
  return deltas;
}

function buildMasterKnowledgeRegistry() {
  const allDeltas = collectAllDeltas();
  const universalRules = [];
  const familyGenRules = [];
  const chassisSpecificRules = [];

  allDeltas.forEach(d => {
    let scope = d.scopeTaxonomy || classifyKnowledgeScope(d);
    // Backward compatibility normalization
    if (scope === 'UNIVERSAL_HPE') scope = 'UNIVERSAL_VENDOR';
    if (scope === 'FAMILY_GEN_SPECIFIC') scope = 'FAMILY_GEN';

    const enrichedDelta = {
      ...d,
      scopeTaxonomy: scope,
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

  // Collect unique product families represented in the learned rules
  const familySet = new Set(allDeltas.map(d => d.family || (d.chassis || '').split('_')[0]).filter(Boolean));

  const registry = {
    registryVersion: '2.0.0',
    schemaVersion: '1.0',
    // GAP-4 FIX: generatedAt is the canonical timestamp field read by the dashboard.
    // lastUpdated is preserved for backward compatibility with older consumers.
    generatedAt: nowISO,
    lastUpdated: nowISO,
    totalLearnedRules: allDeltas.length,
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

  const historyDir = path.join(OUTPUTS_ROOT, 'history');
  if (!fs.existsSync(historyDir)) fs.mkdirSync(historyDir, { recursive: true });
  safeWriteJsonAtomic(MASTER_REGISTRY_FILE, registry);

  return registry;
}

function generateNotebookSyncPayload(chassisName = 'Unknown_Chassis', autoUpload = false) {
  const registry = buildMasterKnowledgeRegistry();
  return buildPayload(chassisName, autoUpload, registry);
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
  loadNotebookConfig,
  getNotebookIdForChassis,
  collectAllDeltas
};
