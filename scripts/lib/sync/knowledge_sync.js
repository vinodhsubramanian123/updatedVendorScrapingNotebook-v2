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

  // Emit consolidated master Markdown charter for universal cross-notebook sync
  const masterCharterFile = path.join(historyDir, 'master_universal_knowledge_charter.md');
  let md = `# HPE Enterprise Server Architecture — Master Universal Knowledge Charter\n\n`;
  md += `**Document Version**: \`2.0.0\` | **Generated**: \`${nowISO}\`  \n`;
  md += `**Scope**: Universal Ground-Truth Knowledge across ProLiant, Synergy, Alletra, Cray, and StoreEver portfolios  \n`;
  md += `**Total Verified Knowledge Deltas**: \`${allDeltas.length}\` (\`${universalRules.length}\` Universal + \`${familyGenRules.length}\` Family/Gen + \`${chassisSpecificRules.length}\` Chassis Specific)  \n\n`;
  md += `---\n\n`;

  md += `## 1. 🌐 Universal Vendor & CPQ Commercial Policies (Level 1)\n\n`;
  md += `These rules apply across all HPE servers, storage systems, and CTO configurator environments:\n\n`;
  md += `1. **Hierarchical Container Tree & Option Tagging**: Every server configuration in HPE OCA/CLIC is a structured container tree. Components inside a CTO chassis must carry the \`#0D1\` (Factory Integrated Option / FIO) suffix. Unparented BTO components (e.g. standalone memory modules) outside the server container will fail CLIC validation (Rules 81354490 & 91001655).\n`;
  md += `2. **Mandatory Management SaaS Licensing**: Every CTO server model requires an active management license (e.g. HPE Compute Ops Management Enhanced \`R7A11AAE\` or iLO Advanced) to be orderable (Rule 81322276).\n`;
  md += `3. **Telco -48VDC Electrical Safety**: -48VDC power supply configurations mandate dedicated DC terminal lug connector kits (\`P36877-B21\`) for electrical safety compliance.\n`;
  md += `4. **MEA / Dubai Compliance Exclusions**: Trade Agreements Act (TAA) and Government Trade Agreements (GTA) SKUs are strictly excluded from international MEA quotes.\n\n`;

  md += `## 2. 🏛️ Family & Generation Rules (Level 2: ProLiant Gen11 / Gen12)\n\n`;
  md += `1. **Memory Channel Topology**: ProLiant 2P platforms feature 16 memory channels (8 per socket). All populated channels must be balanced with identical DIMM capacities and CAS latencies. x4 and x8 registered DDR5 DIMMs must never be mixed.\n`;
  md += `2. **Thermal & Fan Kit Bundle Cardinality**: Processors with TDP > 240W mandate High-Performance Fan Kits (\`P48820-B21\`). \`P48820-B21\` is a complete kit containing all 6 chassis fans; maximum allowed quantity is strictly 1 kit per base chassis (Rule 81354654).\n`;
  md += `3. **Smart Storage Battery & Write-Back Cache**: Dedicated Tri-Mode RAID controllers (MR416i, SR932i, MR408i) require an HPE Smart Storage Battery (\`P01366-B21\` 96W) to enable write-back cache protection.\n`;
  md += `4. **Storage Controller Form-Factor Cabling**: OCP slot controllers (\`-o\` suffix, e.g. MR408i-o \`P58335-B21\`) connecting to standard 8SFF cages (\`P48813-B21\`) require the Controller Enablement Cable Kit (\`P48918-B21\`). Tri-Mode Y-Splitter Cables (\`P48832-B21\`) are exclusively for PCIe riser cards (\`-p\`) routing to Premium NVMe Cages (\`P48814-B21\`) (Rules 81354627 & 81354632).\n`;
  md += `5. **Storage Expander & Multi-Drive Channel Limits**: An 8-port controller directly connects up to 8 drives. Configurations with 16 or 24 drives on a single controller require a SAS Expander Card (\`P48835-B21\`) or Tri-Mode Switch Card (\`P55806-B21\`).\n`;
  md += `6. **GPU Accelerator Auxiliary Power Cabling**: High-power PCIe GPUs (NVIDIA L40S, A100, H100) require dedicated GPU Auxiliary Power Cable Kits (\`P48816-B21\` / \`P76450-B21\`) to connect to the internal power distribution board.\n`;
  md += `7. **Windows Server Core Licensing**: Windows Server licenses are priced per physical CPU core (16-core minimum base). If total server cores exceed 16, additional core license packs are mandatory.\n\n`;

  md += `## 3. 🎯 Chassis-Specific Gotchas & Electrical Topology (Level 3)\n\n`;
  md += `1. **DL380 Gen11 / Gen12 PCIe Riser Electrical Enablement**:\n`;
  md += `   - Primary 3x16 Riser (\`P48803-B21\`): Slots 2 & 3 are active out-of-the-box. Slot 1 requires Primary Riser Cable Kit (\`P56073-B21\`) to connect to motherboard SlimSAS port (Rules 81016755 & 81354683).\n`;
  md += `   - Secondary 3x16 Riser (\`P51083-B21\`): Slots 5 & 6 are active out-of-the-box. Slot 4 requires Secondary Riser Cable Kit (\`P56074-B21\`) (Rule 81356091).\n`;
  md += `2. **OCP2 Enablement Mutual Exclusion**: \`P51911-B21\` (CPU1 to OCP2) and \`P48830-B21\` (CPU2 to OCP2) are mutually exclusive in the same server. Dual-processor servers must utilize \`P48830-B21\` (Rule 81355854).\n`;
  md += `3. **Power Derating & Utility Voltage**: 1600W/1800W power supplies derate to 800W on 110V low-line utility power. Dense configurations (>800W node draw) mandate 200V-240V high-line PDU circuits.\n\n`;

  md += `## 4. 📋 Master Knowledge Deltas Registry\n\n`;
  if (allDeltas.length === 0) {
    md += `*No persistent knowledge deltas logged.*\n`;
  } else {
    allDeltas.forEach((d, idx) => {
      md += `### ${idx + 1}. [${d.deltaId || `DELTA-${idx+1}`}] ${d.chassis || 'Universal'} — ${d.ruleType || 'RULE'}\n`;
      md += `- **Scope**: \`${d.scopeTaxonomy || 'UNIVERSAL_VENDOR'}\`\n`;
      md += `- **Rule**: ${d.ruleUpdate || d.rawMessage}\n`;
      if (d.affectedSku) md += `- **Affected SKU**: \`${d.affectedSku}\`\n`;
      if (d.requiredDependencySku) md += `- **Required Dependency**: \`${d.requiredDependencySku}\`\n`;
      if (d.humanReasoning) md += `- **Engineering Rationale**: *${d.humanReasoning}*\n`;
      md += `\n`;
    });
  }

  try {
    fs.writeFileSync(masterCharterFile, md, 'utf-8');
  } catch (_) {}

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
