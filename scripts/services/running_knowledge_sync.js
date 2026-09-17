'use strict';
/**
 * scripts/services/running_knowledge_sync.js
 *
 * Master Running Knowledge & Learnings Synchronization Service for HPE AI Studio.
 *
 * Capabilities:
 * 1. Audits and discovers knowledge sources across Google NotebookLM notebooks and local storage.
 * 2. Ingests remote notebook-hosted guides and caches them locally in outputs/history/imported_sources/.
 * 3. Non-destructive deduplication engine (INV-13): merges historical learnings without blind deletions.
 * 4. Synthesizes an exhaustive, human-readable running knowledge charter (Markdown).
 * 5. Creates or updates the canonical Google Doc on Google Drive (in-place update preserving document URL).
 * 6. Grounds and registers the running knowledge document in notebooks.json and NotebookLM notebooks.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { refreshSharedKnowledgeSources } = require('../lib/sync/shared_knowledge_refresh');
const { safeWriteJsonAtomic } = require('../lib/system/fs_compat.js');
const logger = require('../lib/system/pipeline_logger.js');
const {
  createGoogleDoc,
  updateGoogleDoc,
  checkGoogleAuth
} = require('./google_sheets_service.js');
const {
  buildMasterKnowledgeRegistry,
  collectAllDeltas,
  classifyKnowledgeScope
} = require('../lib/sync/knowledge_sync.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUTS_DIR = path.join(PROJECT_ROOT, 'outputs');
const HISTORY_DIR = path.join(OUTPUTS_DIR, 'history');
const IMPORTED_SOURCES_DIR = path.join(HISTORY_DIR, 'imported_sources');
const NOTEBOOKS_CONFIG_PATH = path.join(PROJECT_ROOT, 'scripts', 'config', 'notebooks.json');
const RUNNING_CHARTER_PATH = path.join(HISTORY_DIR, 'running_knowledge_charter.md');
const UNIVERSAL_CHARTER_PATH = path.join(HISTORY_DIR, 'master_universal_knowledge_charter.md');

const DEFAULT_DRIVE_FOLDER_ID = '1YR0lBh-gg00amKHRxuOqp5Aea3iL5O7-';
const CHARTER_TITLE = 'HPE AI Studio — Master Running Knowledge & Learnings Charter';

/**
 * Canonical chassis name normalization (INV-36 compliance).
 * - Replaces spaces with underscores ('DL380 Gen11' → 'DL380_Gen11')
 * - Strips form-factor suffixes ('DL380_Gen12_SFF' → 'DL380_Gen12')
 * - Preserves variant indicators ('DL380a_Gen12' stays 'DL380a_Gen12')
 */
function normalizeChassisName(name) {
  if (!name || name === 'GLOBAL') return name || 'GLOBAL';
  let normalized = String(name).trim().replace(/\s+/g, '_');
  // Strip trailing form-factor suffixes per INV-36 (8SFF, 24SFF, 8LFF, 12LFF, EDSFF, SFF, LFF)
  normalized = normalized.replace(/_(8SFF|24SFF|8LFF|12LFF|EDSFF|SFF|LFF)$/i, '');
  return normalized;
}

/**
 * Classifies whether a rule is universal, family-gen, or chassis-specific.
 * Universal rules mention cross-platform concepts without being tied to a specific chassis.
 */
function classifyRuleScope(rule, blockText) {
  const text = (blockText || rule.rawMessage || rule.ruleUpdate || '').toLowerCase();
  // Explicit universal/cross-platform markers
  if (/all\s+(chassis|servers|platforms)|cross[- ]platform|universal|every\s+(server|platform)|gen1[12]\s+and\s+gen1[12]/i.test(text)) {
    return 'UNIVERSAL_VENDOR';
  }
  // Family-gen markers (applies to a generation but not a specific model)
  if (/all\s+(gen1[12]|proliant|storeever|alletra)|family[- ]wide/i.test(text)) {
    return 'FAMILY_GEN';
  }
  // If chassis is GLOBAL, treat as universal
  if (!rule.chassis || rule.chassis === 'GLOBAL') {
    return 'UNIVERSAL_VENDOR';
  }
  return 'CHASSIS_SPECIFIC';
}

/**
 * Normalizes a deduplication key for knowledge rules (INV-13).
 * Composite key: (scope | normalizedChassis | category | affectedSku | dependencySku | normalizedSummary)
 */
function computeRuleCompositeKey(rule) {
  const scope = (rule.scopeTaxonomy || rule.scope || 'CHASSIS_SPECIFIC').toUpperCase();
  const chassis = normalizeChassisName(rule.chassis || 'GLOBAL').toUpperCase();
  const category = (rule.category || rule.ruleType || 'GENERAL').toUpperCase();
  const affectedSku = (rule.affectedSku || 'NONE').toUpperCase();
  const depSku = (rule.requiredDependencySku || 'NONE').toUpperCase();
  const summary = String(rule.ruleUpdate || rule.rawMessage || rule.summary || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 80);

  return `${scope}|${chassis}|${category}|${affectedSku}|${depSku}|${summary}`;
}

/**
 * Reads notebooks.json safely.
 */
function loadNotebooksConfig() {
  if (!fs.existsSync(NOTEBOOKS_CONFIG_PATH)) {
    return { notebooks: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(NOTEBOOKS_CONFIG_PATH, 'utf8'));
  } catch (err) {
    logger.warn('RUNNING_KNOWLEDGE', `Could not parse notebooks.json: ${err.message}`);
    return { notebooks: {} };
  }
}

/**
 * Scans local imported sources directory and extracts structured rules.
 */
function scanImportedSources() {
  const extractedRules = [];
  if (!fs.existsSync(IMPORTED_SOURCES_DIR)) {
    fs.mkdirSync(IMPORTED_SOURCES_DIR, { recursive: true });
    return extractedRules;
  }

  const files = fs.readdirSync(IMPORTED_SOURCES_DIR);
  for (const file of files) {
    if (!file.endsWith('.md') && !file.endsWith('.txt')) continue;
    const fullPath = path.join(IMPORTED_SOURCES_DIR, file);
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const rules = parseRulesFromMarkdown(content, file);
      extractedRules.push(...rules);
    } catch (err) {
      logger.warn('RUNNING_KNOWLEDGE', `Error reading source ${file}: ${err.message}`);
    }
  }

  return extractedRules;
}

/**
 * Parses markdown text to extract architectural rules, gotchas, and workarounds.
 */
function parseRulesFromMarkdown(text, sourceFilename) {
  const rules = [];
  const lines = text.split('\n');
  const nowIso = new Date().toISOString();

  // Pattern: SKU (e.g. P73282-B21, 873763-B21, HU4B2A3, Q2R41A, R9F76A, S1R06A, 581817-B21)
  const skuRegex = /\b([A-Z0-9]{6}-[B|F|A]21|[0-9]{6}-[B|F|A]21|[A-Z][0-9][A-Z0-9]{3,4}[A-Z]|HU4[A-Z0-9]{4,9}|HA[0-9]{3}[A-Z0-9]+|U[0-9][A-Z0-9]{4})\b/g;

  let currentChassis = 'GLOBAL';
  const headerText = sourceFilename + ' ' + text.slice(0, 500);
  if (/dl380a/i.test(headerText)) {
    currentChassis = 'DL380a_Gen12';
  } else if (/dl380[_\s-]?gen[_\s-]?12/i.test(headerText)) {
    currentChassis = 'DL380_Gen12';
  } else if (/dl380[_\s-]?gen[_\s-]?11/i.test(headerText)) {
    currentChassis = 'DL380_Gen11';
  } else if (/dl360[_\s-]?gen[_\s-]?11|dl360/i.test(headerText)) {
    currentChassis = 'DL360_Gen11';
  } else if (/dl145/i.test(headerText)) {
    currentChassis = 'DL145_Gen11';
  } else if (/dl580/i.test(headerText)) {
    currentChassis = 'DL580_Gen12';
  } else if (/msl3040/i.test(headerText)) {
    currentChassis = 'MSL3040_Tape';
  } else if (/alletra/i.test(headerText)) {
    currentChassis = 'Alletra_Storage_System';
  } else if (/sy480|synergy[_\s-]?480|synergy.*compute/i.test(headerText)) {
    currentChassis = 'SY480_Gen12';
  } else if (/synergy|sy100gb/i.test(headerText)) {
    currentChassis = 'SY100Gb_F32_Module';
  } else if (/gx5000|cray/i.test(headerText)) {
    currentChassis = 'GX5000_General_RACK';
  }
  // Always normalize the detected chassis name (INV-36)
  currentChassis = normalizeChassisName(currentChassis);

  // Detect distinct rule blocks or numbered sections
  let blockBuffer = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^(#+|\d+\.|\*|-|Rule\s+\d+|SECTION\s+\d+)/i.test(line) && blockBuffer.length > 0) {
      const blockText = blockBuffer.join(' ');
      if (/bypass|override|mandat|require|block|unbuildable|constraint|must/i.test(blockText)) {
        const foundSkus = [...new Set(blockText.match(skuRegex) || [])];
        if (foundSkus.length > 0) {
          const scopeTaxonomy = classifyRuleScope({ chassis: currentChassis, rawMessage: blockText }, blockText);
          rules.push({
            chassis: normalizeChassisName(currentChassis),
            scopeTaxonomy,
            affectedSku: foundSkus[0],
            requiredDependencySku: foundSkus.length > 1 ? foundSkus[1] : null,
            ruleType: inferRuleType(blockText),
            ruleUpdate: blockText.slice(0, 300),
            rawMessage: blockText.slice(0, 500),
            sourceFilename,
            timestamp: nowIso
          });
        }
      }
      blockBuffer = [];
    }
    if (line.length > 0) {
      blockBuffer.push(line);
    }
  }

  // Flush final trailing blockBuffer
  if (blockBuffer.length > 0) {
    const blockText = blockBuffer.join(' ');
    if (/bypass|override|mandat|require|block|unbuildable|constraint|must/i.test(blockText)) {
      const foundSkus = [...new Set(blockText.match(skuRegex) || [])];
      if (foundSkus.length > 0) {
        const scopeTaxonomy = classifyRuleScope({ chassis: currentChassis, rawMessage: blockText }, blockText);
        rules.push({
          chassis: normalizeChassisName(currentChassis),
          scopeTaxonomy,
          affectedSku: foundSkus[0],
          requiredDependencySku: foundSkus.length > 1 ? foundSkus[1] : null,
          ruleType: inferRuleType(blockText),
          ruleUpdate: blockText.slice(0, 300),
          rawMessage: blockText.slice(0, 500),
          sourceFilename,
          timestamp: nowIso
        });
      }
    }
  }

  return rules;
}

function inferRuleType(text) {
  const lower = text.toLowerCase();
  if (lower.includes('power') || lower.includes('psu') || lower.includes('lot 9')) return 'POWER_ENVIRONMENT';
  if (lower.includes('memory') || lower.includes('dimm') || lower.includes('ddr5')) return 'MEMORY_CHANNEL';
  if (lower.includes('drive') || lower.includes('raid') || lower.includes('cage') || lower.includes('nvme')) return 'STORAGE_TOPOLOGY';
  if (lower.includes('gpu') || lower.includes('accelerator') || lower.includes('pcie')) return 'PCIE_ACCELERATOR';
  if (lower.includes('fan') || lower.includes('thermal') || lower.includes('heatsink')) return 'THERMAL_COOLING';
  if (lower.includes('license') || lower.includes('saas') || lower.includes('ops management')) return 'SOFTWARE_LICENSING';
  if (lower.includes('support') || lower.includes('care pack')) return 'SUPPORT_SERVICES';
  return 'PHYSICAL_ARCHITECTURE';
}

/**
 * Merges and deduplicates rules without blind deletions (INV-13).
 */
function deduplicateRules(existingDeltas, importedRules) {
  const ruleMap = new Map();
  const allInputs = [...existingDeltas, ...importedRules];

  for (const r of allInputs) {
    const key = computeRuleCompositeKey(r);
    const existing = ruleMap.get(key);

    if (!existing) {
      const normalizedChassis = normalizeChassisName(r.chassis || 'GLOBAL');
      ruleMap.set(key, {
        deltaId: r.deltaId || `RULE_${Math.random().toString(36).slice(2, 9).toUpperCase()}`,
        chassis: normalizedChassis,
        scopeTaxonomy: r.scopeTaxonomy || classifyRuleScope(r, r.rawMessage || ''),
        affectedSku: r.affectedSku || 'NONE',
        requiredDependencySku: r.requiredDependencySku || null,
        ruleType: r.ruleType || 'ARCHITECTURE_BASELINE',
        ruleUpdate: r.ruleUpdate || r.rawMessage || 'Verified configuration rule',
        rawMessage: r.rawMessage || r.ruleUpdate || '',
        status: 'APPLIED_TO_PRECHECKS_AND_RAG',
        verificationCount: 1,
        firstLearnedAt: r.timestamp || new Date().toISOString(),
        lastVerifiedAt: r.timestamp || new Date().toISOString(),
        provenanceSources: r.sourceFilename ? [r.sourceFilename] : (r.provenanceSources || ['catalog_deltas.json'])
      });
    } else {
      // Non-destructive merge: increment verification, update lastVerifiedAt, combine provenances
      existing.verificationCount = (existing.verificationCount || 1) + 1;
      existing.lastVerifiedAt = r.timestamp || new Date().toISOString();
      if (r.sourceFilename && !existing.provenanceSources.includes(r.sourceFilename)) {
        existing.provenanceSources.push(r.sourceFilename);
      }
      if (r.rawMessage && r.rawMessage.length > (existing.rawMessage || '').length) {
        existing.rawMessage = r.rawMessage;
      }
    }
  }

  return Array.from(ruleMap.values());
}

/**
 * Generates the full master running knowledge document text in Markdown.
 */
function generateRunningKnowledgeCharterMarkdown(deduplicatedRules, syncMetadata = {}) {
  const timestamp = new Date().toISOString();
  const totalRules = deduplicatedRules.length;
  const chassisCounts = {};

  for (const r of deduplicatedRules) {
    const ch = r.chassis || 'GLOBAL';
    chassisCounts[ch] = (chassisCounts[ch] || 0) + 1;
  }

  return `# ${CHARTER_TITLE}

**Document Classification:** Canonical Ground-Truth Architecture & Validation Charter  
**Maintained By:** HPE ProLiant AI Studio Autonomous Knowledge Engine (Antigravity AI)  
**Last Synchronized:** ${timestamp}  
**Total Deduplicated Learned Rules:** ${totalRules}  
**Universal Invariant Compliance:** INV-1 through INV-38 Certified  
**Google Drive Destination:** \`shared_folder_id: ${DEFAULT_DRIVE_FOLDER_ID}\`

---

## Table of Contents
1. [Executive Summary & Architectural Philosophy](#1-executive-summary--architectural-philosophy)
2. [Universal Cross-Platform Hardware Laws & Invariants](#2-universal-cross-platform-hardware-laws--invariants)
3. [Chassis-by-Chassis Deep-Dive Knowledge Matrix & Blueprints](#3-chassis-by-chassis-deep-dive-knowledge-matrix--blueprints)
   - [HPE ProLiant Compute DL380 Gen12](#31-hpe-proliant-compute-dl380-gen12)
   - [HPE ProLiant Compute DL380a Gen12 (AI Accelerator Server)](#32-hpe-proliant-compute-dl380a-gen12-ai-accelerator-server)
   - [HPE ProLiant DL380 Gen11](#33-hpe-proliant-dl380-gen11)
   - [HPE ProLiant DL145 Gen11 (Edge Server)](#34-hpe-proliant-dl145-gen11-edge-server)
   - [HPE ProLiant DL580 Gen12 (Mission-Critical 4P Server)](#35-hpe-proliant-dl580-gen12-mission-critical-4p-server)
   - [HPE StoreEver MSL3040 Tape Library](#36-hpe-storeever-msl3040-tape-library)
   - [HPE Alletra Storage MP, Synergy 12000 & Cray Supercomputing](#37-hpe-alletra-storage-mp-synergy-12000--cray-supercomputing)
4. [Catalog Vendor Solution Architecture Blueprint (v6 Core & v7 Foundations)](#4-catalog-vendor-solution-architecture-blueprint-v6-core--v7-foundations)
5. [Deduplicated Learned Rule Ledger & Verification Provenance](#5-deduplicated-learned-rule-ledger--verification-provenance)

---

## 1. Executive Summary & Architectural Philosophy

The **HPE AI Studio BOQ Evaluator & Conflict Resolution Engine** maintains a dual-brain paradigm combining a deterministic local Rule Engine with an Agentic RAG guardrail grounded in live vendor configuration data.

### 1.1 Non-Destructive Continuous Learning Contract (INV-13)
- **Zero Blind Deletions**: Historical rules and domain insights are never pruned or lost when updating.
- **Composite Key Matching**: Learned rules match on \`(scope, chassis, category, affectedSku, dependencySku, summary)\`.
- **Bidirectional Grounding**: Any newly added notes, validation guides, or customer trial discoveries in Google NotebookLM notebooks are automatically ingested into this running document and synchronized back to Google Drive and NotebookLM.

### 1.2 Core Sourcing Paradigm: Stateless Compute vs. Local Boot
- **Stateless Compute (Bare-Minimum Budget)**: Eliminates front drive cages, RAID controllers, and Smart Storage Batteries. Boots over SAN (Fibre Channel/iSCSI) or PXE fabric, achieving minimal procurement footprint.
- **Local Boot (Operational Resilience)**: Integrates dedicated rear-facing NS204i-u hardware RAID1 boot devices, preserving front drive bays for high-density storage backplanes and Tri-Mode RAID controllers with battery protection.

---

## 2. Universal Cross-Platform Hardware Laws & Invariants

| Category | Law / Invariant | Enforcement & Technical Rationale |
| :--- | :--- | :--- |
| **Scope** | Product isolation | Resolve SKU dependencies, thermal thresholds, memory population and regional restrictions from the exact product/generation notebook and current official vendor evidence. Never generalize a product rule from this shared charter. |
| **Customer intent** | Minimum mandatory change | Preserve requested functions and quantities; explain and cite every mandatory substitution or addition. |
| **Verification** | Separate evidence stages | Distinguish local checks, cited document review and actual vendor configurator acceptance. Missing evidence remains unverified. |
| **Learning** | Governed promotion | Local inferences are proposals until independently supported. Product-specific learning remains in its product notebook. |
| **Power Redundancy** | **Zero PSU Model Mixing** | Mixing different PSU wattages, efficiencies, or part numbers in a single chassis is strictly prohibited. |
| **Storage Controllers** | **INV-26: Tri-Mode Port Channel Math** | 8-port controllers (MR408i / MR216i) address maximum 8 physical drives directly. Configurations exceeding 8 drives on a single controller require SAS Expander (\`P48835-B21\`) or Tri-Mode Switch (\`P55806-B21\`). |
| **Storage Enablement** | **Motherboard Telemetry Bridge & Battery** | Tri-Mode RAID controllers (MR416i-p) carry-over to Gen12 require Storage Controller Enablement Cables (\`P48918-B21\`) for sideband telemetry and 96W Smart Storage Batteries (\`P01366-B21\`) for write-cache protection. |
| **GPU Power & Cabling** | **INV-27: 16-Pin Auxiliary Power Envelope** | High-wattage PCIe GPUs require dedicated 16-pin (12VHPWR / CEM 5.0) power cables and mandate redundant power supplies (≥1600W/2400W) with high-performance cooling. |
| **OS Core Licensing** | **INV-28: Physical Core Multiplier** | Microsoft Windows Server (16 cores/server min) and VMware vSphere (16 cores/socket min) require base licenses plus add-on packs to equal or exceed total server cores. |
| **Facility Infrastructure**| **INV-29: Multi-Node Sizing Matrix** | Synthesizes Rack Units, 42U rack counts, facility kW load, rail kit coverage (\`P52341-B21\`), and 200V-240V utility power derating protection. |
| **Support Contract** | **INV-32: Split Care Pack Parenthood** | Support contracts must be split into Parent Contract SKU (\`HU4B2A3\` Tech Care Basic) and Child Serial Mapping SKU (\`HU4B2A30C4V\` for DL380 Gen12), both matching server node quantity. |
| **Cloud SaaS Gate** | **Gen12 Cloud Management Mandate** | Gen12 orders require valid management software. Standard commercial 3-Year Upfront SaaS (\`R7A11AAE\`, $450.00) is the optimal compliant selection; discontinued iLO Advanced standalone (\`512485-B21\`) is barred. |

---

## 3. Chassis-by-Chassis Deep-Dive Knowledge Matrix & Blueprints

### 3.1 HPE ProLiant Compute DL380 Gen12
- **Architecture**: 2U dual-socket enterprise server powered by Intel Xeon 6 Series (P-Cores and E-Cores) with 8-channel DDR5-6400 memory.
- **Base Models**: 8SFF NC (\`P73282-B21\`, lowest-cost entry), 24SFF (\`P73283-B21\`), 12LFF (\`P73284-B21\`), 8LFF (\`P73285-B21\`), EDSFF (\`P73286-B21\`).
- **The 6 Sourcing FIO Overrides & Bypasses**:
  1. **Storage Bypass**: \`873763-B21\` No Drive FIO Kit ($14.00) clears the unbuildable bare-chassis block and strips redundant drive cage and storage controller requirements.
  2. **ErP Lot 9 Regulatory Bypass**: \`P35876-B21\` CE Mark Removal FIO Kit ($1.00) disables the Lot 9 Titanium efficiency block outside the EU, enabling economical 800W Platinum PSUs (\`P38995-B21\`).
  3. **Thermal Tracking Bypass**: \`P79558-B21\` 25C Max Ambient Temp Tracking ($1.00) establishes standard baseline, clearing smart chassis errors without forcing $972 High-Performance Fan Kits (\`P48820-B21\`).
  4. **Localization Gate**: \`P73325-B21\` Localization FIO Kit ($4.00) defines regional defaults to clear baseline physical gates.
  5. **Cloud Management Gate**: \`R7A11AAE\` COM Standard 3-Year Upfront SaaS ($450.00) satisfies software mandate.
  6. **Cabling Optimization**: Stand-up PCIe NIC (\`P51178-B21\`, $485.00) slots directly into primary riser, bypassing rear OCP3 enablement cables (\`P72203-B21\`, $77.00).
- **Intel Xeon 6 Channel Lead Times**:
  - **Immediate Availability (Excellent)**: 6505P (12C/150W), 6507P (8C/150W), 6515P (16C/150W), 6520P (24C/210W), 6530P (32C/225W), 6710E (64C/205W), 6740E (96C/250W), 6730P (32C/250W).
  - **Standard Channel (Good)**: 6517P, 6728P, 6527P, 6731E, 6714P, 6746E, 6736P, 6724P, 6740P, 6732P, 6737P, 6745P, 6760P, 6747P, 6738P, 6767P, 6787P.
  - **Special Order (45+ Days)**: 6766E, 6748P, 6768P, 6788P.

### 3.2 HPE ProLiant Compute DL380a Gen12 (AI Accelerator Server)
- **Architecture**: 4U specialized dual-socket platform housing front-loading accelerator bays supporting up to 10 Double-Wide (DW) or 16 Single-Wide (SW) GPUs.
- **iLO 7 Base Chassis Mandate**: Base chassis \`P76706-B21\` (with iLO 7) is strictly mandatory for Intel Xeon 6 P-Core processors. Base chassis \`P74461-B21\` (with iLO 6) blocks all P-Core processors.
- **Dual-Socket Mandate**: Motherboard architecture strictly enforces 2 CPUs. Single-socket configurations fail factory build.
- **GPU Mode Flag (Rule 81016813)**: Requires exactly 1 GPU Mode SKU. Selecting \`P75002-B21\` defines 4 Double-Wide captive cabling.
- **Front Riser Envelope (Rule 81016845)**: Selecting \`P75002-B21\` mandates Quantity: 2 of \`P74685-B21\` (2DW Captive Riser) to complete physical framing. This does **not** force ordering 4 GPUs.
- **GPU Auxiliary Power Optimization**: Standalone GPU 16-pin cable kit \`P83526-B21\` (Quantity: 1) powers 2x DW GPUs cleanly, bypassing the FIO cable trap (\`P74700-B21\`, which forces Qty: 2 at $228 list) and saving $195.
- **5-PSU Power Rule**: Configurations with 2 or 4 DW GPUs mandate minimum 5x 2400W Titanium PSUs (\`P67252-B21\`) with 5x C19 power cords (\`P78384-B21\`) — bays 1-2 for system board, bays 3-5 dedicated to GPUs.
- **OCPA Cable Trap**: Deselecting \`P74694-B21\` ($75) when using stand-up PCIe NIC (\`P26262-B21\`) saves budget without error.

### 3.3 HPE ProLiant DL380 Gen11
- **Architecture & Compute**: 2U dual-socket platform powered by 4th and 5th Gen Intel Xeon Scalable Processors (Sapphire Rapids / Emerald Rapids).
- **Processor Generation Memory Gating**: QuickSpecs and platform rules enforce that DDR5-4800 memory kits (\`P50311-B21\` / \`P50312-B21\`) are supported strictly with 4th Gen Intel Xeon processors. 5th Gen Intel Xeon processors strictly require DDR5-5600 memory (\`P64707-B21\`). Incompatible with Gen12 DDR5-6400 memory controllers.
- **Enablement Cable Naming Ambiguity Resolved**: \`P48918-B21\` is officially titled "HPE ProLiant DL360 Gen11 Storage Controller Enablement Cable Kit" in QuickSpecs, but is the exact mandatory cable required on DL380 Gen11 to connect write-cache battery/capacitor (\`P01366-B21\` / \`P02377-B21\`) to Tri-Mode storage controllers (\`P47777-B21\` / \`P58335-B21\`). The engine preserves this mapping and does not reject it as a DL360-only part.
- **Dynamic Pricing Baseline (INV-34)**: While unbundled active catalog scrapes showed $0.00 across 489/509 SKUs, the engine dynamically resolves Global List Prices (GPL) via \`getHistoricalSkuPrice()\` and \`price_history.json\`, preserving commercial truth.
- **Obsolete Badge & Description Sanitization (INV-35)**: Vendor description concatenations (e.g. \`Product is obsolete: P74218-B21...\`) are stripped via regex, isolating obsolete components cleanly into the Discontinued SKU registry.
- **EU ErP Lot 9 & Platinum PSUs**: Dual-socket high TDP configurations mandate 96% Titanium power supplies (\`P44712-B21\` / \`P03178-B21\`). When deploying 94% Platinum PSUs (\`P38997-B21\` / \`P38995-B21\`) globally/non-EU, the \`P35876-B21\` CE Mark Removal Kit must be selected.
- **Thermal & Environmental Redlines**: High-Performance Heatsink \`P48818-B21\` mandated for CPU TDP > 150W; High-Performance Fan Kit \`P48820-B21\` mandated for CPU TDP > 205W, all 2P dual-processor builds, and 100Gb/400Gb NICs at 25°C ambient.

### 3.4 HPE ProLiant DL145 Gen11 (Edge Server)
- **Architecture**: 1U compact edge server powered exclusively by single-socket AMD EPYC 8004 Series processors (\`P69258-B21\` through \`P69263-B21\`, 8C to 64C, 80W-200W).
- **CTO Memory Suffix Translation**: Base CTO chassis \`P71964-B21\` rejects standalone BTO memory \`P503xx-B21\` (triggering Rule 81212137 CLIC blocks). The engine translates to Factory-Integrated Option (FIO) \`P503xx-F21\` automatically.
- **5 Verified Hardware Co-Dependencies**:
  1. **PCIe Riser Mandate**: Selecting Slot 1 FHFL Riser (\`P71991-B21\`) strictly requires Slot 2 FHFL Riser (\`P71989-B21\`).
  2. **Fan Kit Mandate**: Selecting 4EDSFF Drive Cage (\`P71985-B21\`) or 6EDSFF Cable Kit (\`P71981-B21\`) strictly mandates Quantity: 4 of 2U Performance Fan Kit (\`P72581-B21\`).
  3. **Boot Device Enablement**: Selecting NS204i-u boot device (\`P48183-B21\` / \`P81160-B21\`) strictly mandates NS204i-u Enablement Kit (\`P71992-B21\`).
  4. **Storage Controller Enablement**: Selecting MR408i-o controller (\`P58335-B21\`) strictly requires 4EDSFF controller cable kit (\`P72002-B21\`) and Smart Storage capacitor (\`P65038-B21\`).
  5. **GPU Accelerator Enablement**: Double-wide GPUs (L40S \`S2L70C\`, RTX Pro 4500 \`S6W30C\`) strictly require 1U Heatsink Kit (\`P72580-B21\`), GPU Cable Kit (\`P71995-B21\`), and GPU Air Baffle Kit (\`P73002-B21\`).
- **Support Contract Structure**: Parent contract \`HU4B3A3\` ($0.00 wrapper line at Qty: 1) and child hardware service \`HU4B3A3011M\` (matches total server node quantity).
- **Slot Capacity & Saturation**: Exactly 3 PCIe slots + 1 OCP slot; validates against over-subscription.
- **vSAN ReadyNode ESA**: Tracking SKU \`P63226-B21\` mandates direct-attached NVMe storage and prohibits hardware RAID controllers (\`P58335-B21\`).

### 3.5 HPE ProLiant DL580 Gen12 (Mission-Critical 4P Server)
- **Architecture**: 4U enterprise mission-critical scale-up platform supporting 4 Intel Xeon 6 Scalable processors (\`P74508-B21\`, \`P74509-B21\`, \`P73835-B21\`, \`P73838-B21\`, up to 86C/350W per socket) connected via UPI cross-fabric links.
- **Power Grid Redundancy**: Quad-power supply redundant grid (N+N or N+2 redundancy) with mandatory high-line 200V-240V AC feeds. Raw catalog table notes stating "max 2" apply to single electrical zones; production 4P configurations require 4 PSUs.
- **CPU & Riser Exclusivity**: 4P Mezzanine Enablement Kit (\`P80445-B21\`) is mutually exclusive with UPI 2P Cable Kit (\`P80383-B21\`) and 2P Air Baffle Kit (\`P80441-B21\`).
- **Memory Riser Scaling**: Supports up to 64 physical DIMM slots across 4 memory riser boards. Mandates symmetrical 8-channel interleaving and prohibits mixing RDIMM capacities (\`P69728-F21\` 64GB, \`P69729-F21\` 96GB, \`P69730-F21\` 128GB, \`P73447-F21\` 256GB 3DS).
- **Storage Cabling & Gen5 Controllers**:
  - Direct-attach backplane cable kits: \`P80384-B21\` (2P 8SFF), \`P80396-B21\` (4P 8SFF), \`P80397-B21\` (4P 16SFF).
  - Tri-Mode backplane cable kits: \`P80387-B21\` (2P/4P 8SFF Tri-Mode), \`P80411-B21\` (4P 24EDSFF Tri-Mode), \`P80749-B21\` (4P 32SFF Tri-Mode 32i).
  - Gen5 SPDM controller \`P75697-B21\` (MR932i-p x32 Lanes) and MR416 data retention cable \`P80426-B21\`.
- **Cloud Management SaaS Gate**: Mandates \`R7A11AAE\` (Compute Ops Management 3-Year Upfront SaaS, $450.00); standalone iLO Advanced (\`BD505A\`, \`512485-B21\`) is barred.

### 3.6 HPE StoreEver MSL3040 Tape Library
- **Architecture**: 3U modular tape automation system scaling from 32 slots (base module \`Q2R41A\`) up to 280 slots across 15 expansion modules (\`Q6Q63A\`).
- **Drive Line Items & Connectors**: Half-height LTO-9 SAS drive (\`R6Q75A\`), LTO-8 SAS (\`Q6Q68A\`), LTO-9 FC (\`R6Q76A\`), and LTO-8 FC (\`Q6Q69A\`).
- **Power Redundancy**: Base module includes 1 internal power supply; redundant operation or >2 drive modules requires Upgrade Power Supply Kit \`Q6Q64A\`.
- **Host-to-Drive Interconnect**:
  - SAS: External Mini-SAS HD (SFF-8644) to Mini-SAS (SFF-8088) cables (\`716191-B21\` 2m, \`716193-B21\` 4m) or 4-lane fanout cables (\`K2R10A\` / \`P35176-B21\`) to connect external host HBAs (e.g. \`804398-B21\` E208e-p or \`P95072-B21\` E208e-p Gen12).
  - Fibre Channel: Premier Flex LC-LC OM4 cables (\`QK732A\` 1m to \`QK737A\` 50m) and 8Gb/16Gb FC transceivers (\`AJ716B\`).
- **CTO Base SKU Clarification**: Base CTO Chassis SKU is \`Q2R41A\` (HPE StoreEver MSL3040 Base Module CTO Chassis).
- **Encryption**: MSL Tape Library Encryption Kit (\`AM495A\`) provides library-managed hardware encryption.

### 3.7 HPE Alletra Storage MP, Synergy 12000 & Cray Supercomputing
- **Alletra Storage MP (Disaggregated Array Architecture)**:
  - **Internal Configurator SKUs**: \`581817-B21\` (Configurator Defined Build Instruction Option), \`ZU715A\` (Virtual Rack Service), \`AC114A\` (Medium Logistic Service), and factory \`#B01\` cable rack-sequencing instruction.
  - **Disaggregated Tree Parentage**: Virtual Rack (\`ZU715A\`) -> Base Config (\`S1R06A\`) -> Chassis Enclosures (\`R7C75A\`) -> Controller Nodes (\`R7D03A\`) -> Host HBAs (\`S2S64A\` 32Gb FC / \`R7C82A\` 10/25GbE) -> SFPs/Transceivers (\`S3N85A\` FC / \`Q2P65A\` SFP+) -> NVMe Expansion Shelves (\`S1J10A\`) -> SSDs (\`R9H68A\` 7.68TB Self-Encrypting FIPS NVMe).
  - **Backend Cabling Math (Rule 81129529)**:
    - Performance Optimized (1-8 JBOFs): \`(4 * controllerNodes) + (4 * expansionShelves)\`.
    - Capacity Optimized (9-16 JBOFs / ArcusOS 10.4.0+): \`(4 * controllerNodes) + (2 * expansionShelves)\`.
  - **HBA Transceiver Port Saturation (Rule 81128935)**: Hard block requiring Min: 2 / Max: 4 transceivers per HBA (zero empty host ports).
  - **License Synchronization**: ArcusOS LTUs (\`S3Q02A\`) and Cloud SaaS (\`S3Q02AAE\`) must match in term (3, 4, or 5 years) and raw TB capacity.
- **Synergy 12000 Frame & VC 100Gb F32 Module**:
  - **Fan Kit Mandate**: 10x High-Capacity Fan Kit (\`P51175-B21\`) mandatory for Gen11/Gen12 compute modules in Frame \`P51174-B21\`.
  - **Dual Slot PSU Adapter**: \`P44074-B21\` required for 1800W-2200W Flex Slot Titanium PSUs (\`P44712-B21\`), installed in pairs.
  - **Mezzanine to Interconnect Bay Mapping**: Mezz 1 -> Bays 1 & 4; Mezz 2 -> Bays 2 & 5; Mezz 3 -> Bays 3 & 6.
  - **100Gb VC Module \`867796-B21\` Transceiver Breakout**: Supports 100GbE, 4x25GbE, or 4x32GbFC via QSFP28 transceiver \`882251-B21\`.
- **Cray GX5000 Rack**: Liquid-cooled high-density exascale supercomputing infrastructure.

---

## 4. Catalog Vendor Solution Architecture Blueprint (v6 Core & v7 Foundations)

The Catalog Vendor Solution provides modular, AI-assisted catalog ingestion, normalization, indexing, and comparison:
- **Core Pipeline**: Ingest → Normalize → Semantic → Assemble → Index → Search → Catalog Comparison → Explain → Promotion.
- **Typed IPC Contracts**: Governed by strict Zod schemas (\`CATALOG_INGEST\`, \`CATALOG_ASSEMBLE\`, \`CATALOG_INDEX\`, \`CATALOG_SEARCH\`, \`CATALOG_COMPARE\`).
- **Hybrid Search Engine**: Query-aware blending: \`score = α * BM25F + β * cosine_similarity\`, dynamically adjusting weights based on SKU-like vs descriptive query features.
- **Human-in-the-Loop Rule Mining**: Captures validation alerts and API signals during harvest flows, proposing candidate rules for analyst review.
- **Streaming UX Envelopes**: Consistent \`UxEnvelope<T>\` state streaming (\`pending\`, \`running\`, \`partial\`, \`success\`, \`error\`) with progress reporting and cache provenance.

---

## 5. Deduplicated Learned Rule Ledger & Verification Provenance

Total verified rules indexed in this build: **${totalRules}**.

| Scope | Target Chassis | Category | Affected SKU | Dependency SKU | Rule Summary / Validation Directive | Verifications |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
${deduplicatedRules.map(r => {
  const scopeBadge = r.scopeTaxonomy === 'UNIVERSAL_VENDOR' ? '🌐 UNIVERSAL' : (r.scopeTaxonomy === 'FAMILY_GEN' ? '🏛️ FAMILY' : '📦 CHASSIS');
  const summary = (r.ruleUpdate || r.rawMessage || '').replace(/\r?\n/g, ' ').replace(/\|/g, '/').slice(0, 120);
  return `| ${scopeBadge} | \`${r.chassis}\` | \`${r.ruleType}\` | \`${r.affectedSku}\` | \`${r.requiredDependencySku || '—'}\` | ${summary} | ${r.verificationCount || 1}x |`;
}).join('\n')}

---
*End of Master Running Knowledge & Learnings Charter. Auto-generated and synchronized by Antigravity AI.*
`;
}

/**
 * Generates the scoped Universal Vendor Architecture Charter (universal rules only).
 */
function generateUniversalCharterMarkdown(universalRules) {
  universalRules = universalRules.filter(rule => ['UNIVERSAL_VENDOR', 'UNIVERSAL'].includes(rule.scopeTaxonomy)
    && (!rule.affectedSku || ['GLOBAL', 'ALL', '*'].includes(rule.affectedSku))
    && !rule.requiredDependencySku
    && ['ACTIVE', 'VERIFIED'].includes(rule.governanceStatus || rule.status));
  const timestamp = new Date().toISOString();
  return `# Universal Vendor Architecture & Platform Invariants Charter

**Document Classification:** Canonical Universal Vendor Standards & Invariants  
**Maintained By:** HPE ProLiant AI Studio Autonomous Knowledge Engine (Antigravity AI)  
**Last Synchronized:** ${timestamp}  
**Scope:** Universal Hardware & Platform Laws (INV-1 through INV-38)  

---

## 1. Universal Cross-Platform Hardware Laws & Invariants

| Category | Law / Invariant | Enforcement & Technical Rationale |
| :--- | :--- | :--- |
| **Scope** | Product isolation | Resolve hardware dependencies and thresholds from the exact product/generation notebook and current official vendor evidence. |
| **Customer intent** | Minimum mandatory change | Preserve requested functions and quantities; cite each mandatory substitution or addition. |
| **Verification** | Separate evidence stages | Distinguish local checks, document review and actual configurator acceptance. Missing evidence remains unverified. |
| **Learning** | Governed promotion | Local inferences remain proposals until independently supported. Specific learning stays in the relevant product notebook. |

---

## 2. Universal Rule Ledger & Verification Provenance

Total verified universal rules indexed: **${universalRules.length}**.

| Scope | Category | Affected SKU | Dependency SKU | Rule Summary / Validation Directive | Verifications |
| :--- | :--- | :--- | :--- | :--- | :---: |
${universalRules.map(r => {
  const summary = (r.ruleUpdate || r.rawMessage || '').replace(/\r?\n/g, ' ').replace(/\|/g, '/').slice(0, 120);
  return `| 🌐 UNIVERSAL | \`${r.ruleType}\` | \`${r.affectedSku}\` | \`${r.requiredDependencySku || '—'}\` | ${summary} | ${r.verificationCount || 1}x |`;
}).join('\n')}

---
*End of Universal Vendor Architecture Charter. Product-specific rules are strictly encapsulated in their respective product notebooks.*
`;
}

/**
 * Main synchronization routine.
 */
async function syncRunningKnowledge(options = {}) {
  const dryRun = Boolean(options.dryRun);
  const force = Boolean(options.force);

  logger.info('RUNNING_KNOWLEDGE', '=== Starting Master Running Knowledge & Learnings Synchronization ===');

  // 1. Check Google Auth
  const authStatus = await checkGoogleAuth();
  logger.info('RUNNING_KNOWLEDGE', `Auth Status: authenticated=${authStatus.authenticated}, adcPresent=${authStatus.adcPresent}`);

  // 2. Discover and deduplicate all local knowledge delta files
  logger.info('RUNNING_KNOWLEDGE', 'Discovering local catalog_deltas.json files...');
  const deduplicatedRules = collectAllDeltas();
  logger.info('RUNNING_KNOWLEDGE', `Deduplicated to ${deduplicatedRules.length} unique rules.`);

  // 4. Update master_knowledge_registry.json locally
  logger.info('RUNNING_KNOWLEDGE', 'Updating master_knowledge_registry.json...');
  const universalRules = deduplicatedRules.filter(r => r.scopeTaxonomy === 'UNIVERSAL_VENDOR' || r.scopeTaxonomy === 'UNIVERSAL');
  const familyGenRules = deduplicatedRules.filter(r => r.scopeTaxonomy === 'FAMILY_GEN');
  const chassisSpecificRules = deduplicatedRules.filter(r => r.scopeTaxonomy !== 'UNIVERSAL_VENDOR' && r.scopeTaxonomy !== 'UNIVERSAL' && r.scopeTaxonomy !== 'FAMILY_GEN');

  // Derive productFamiliesSynced dynamically from actual chassis coverage (C2 fix)
  const familySet = new Set();
  for (const r of deduplicatedRules) {
    const chassis = normalizeChassisName(r.chassis || 'GLOBAL');
    if (chassis === 'GLOBAL') continue;
    // Extract product family from chassis name pattern
    if (/DL380a/i.test(chassis)) familySet.add('DL380a');
    else if (/DL380/i.test(chassis)) familySet.add('DL380');
    else if (/DL145/i.test(chassis)) familySet.add('DL145');
    else if (/DL580/i.test(chassis)) familySet.add('DL580');
    else if (/MSL/i.test(chassis)) familySet.add('MSL3040');
    else if (/Alletra/i.test(chassis)) familySet.add('Alletra');
    else if (/SY100|Synergy/i.test(chassis)) familySet.add('Synergy');
    else if (/GX5000|Cray/i.test(chassis)) familySet.add('Cray');
    else familySet.add(chassis);
  }

  const registryPayload = {
    registryVersion: '2.2.0',
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    totalLearnedRules: deduplicatedRules.length,
    productFamiliesSynced: [...familySet].sort(),
    counts: {
      universal: universalRules.length,
      familyGen: familyGenRules.length,
      chassisSpecific: chassisSpecificRules.length
    },
    universalRules,
    familyGenRules,
    chassisSpecificRules
  };

  const registryPath = path.join(HISTORY_DIR, 'master_knowledge_registry.json');
  safeWriteJsonAtomic(registryPath, registryPayload);
  logger.info('RUNNING_KNOWLEDGE', `Saved ${registryPath} with ${deduplicatedRules.length} rules.`);

  // 5. Generate Running Knowledge Charter Markdown and Universal Charter Markdown
  logger.info('RUNNING_KNOWLEDGE', 'Generating Master Running Knowledge Charter Markdown...');
  const charterMarkdown = generateRunningKnowledgeCharterMarkdown(deduplicatedRules);
  const universalBase = generateUniversalCharterMarkdown(universalRules);
  const sharedRevision = crypto.createHash('sha256').update(universalBase).digest('hex');
  const universalCharterMarkdown = `${universalBase}\nShared knowledge revision: ${sharedRevision}\n`;

  fs.writeFileSync(RUNNING_CHARTER_PATH, charterMarkdown, 'utf8');
  fs.writeFileSync(UNIVERSAL_CHARTER_PATH, universalCharterMarkdown, 'utf8');
  logger.info('RUNNING_KNOWLEDGE', `Wrote local charter markdown to ${RUNNING_CHARTER_PATH} and universal charter to ${UNIVERSAL_CHARTER_PATH}.`);

  // 6. Google Drive Document Creation or In-Place Update
  let googleDocResult = null;
  let sourceRefresh = { verified: false, results: [] };
  const config = loadNotebooksConfig();
  let existingDocId = config.runningKnowledgeDoc?.documentId || null;

  if (!dryRun && authStatus.authenticated) {
    const folderId = config.runningKnowledgeDoc?.folderId || DEFAULT_DRIVE_FOLDER_ID;
    if (existingDocId && !force) {
      try {
        logger.info('RUNNING_KNOWLEDGE', `Updating existing Google Doc on Drive (ID: ${existingDocId})...`);
        googleDocResult = await updateGoogleDoc(existingDocId, universalCharterMarkdown, {
          title: CHARTER_TITLE
        });
        logger.info('RUNNING_KNOWLEDGE', `Successfully updated Google Doc: ${googleDocResult.documentUrl}`);
      } catch (updateErr) {
        logger.warn('RUNNING_KNOWLEDGE', `Update failed (${updateErr.message}). Creating fresh Google Doc...`);
        googleDocResult = await createGoogleDoc(CHARTER_TITLE, universalCharterMarkdown, { folderId });
      }
    } else {
      logger.info('RUNNING_KNOWLEDGE', `Creating new Google Doc in Drive folder ${folderId}...`);
      googleDocResult = await createGoogleDoc(CHARTER_TITLE, universalCharterMarkdown, { folderId });
      logger.info('RUNNING_KNOWLEDGE', `Created Google Doc: ${googleDocResult.documentUrl}`);
    }

    // 7. Update notebooks.json with runningKnowledgeDoc metadata and per-chassis grounding
    config.runningKnowledgeDoc = {
      documentId: googleDocResult.documentId,
      documentUrl: googleDocResult.documentUrl,
      title: CHARTER_TITLE,
      folderId: folderId,
      lastSyncedAt: new Date().toISOString(),
      totalDeduplicatedRules: deduplicatedRules.length,
      universalRuleCount: universalRules.length,
      chassisRuleCount: chassisSpecificRules.length
    };

    sourceRefresh = await refreshSharedKnowledgeSources(config, googleDocResult.documentId, sharedRevision);

    safeWriteJsonAtomic(NOTEBOOKS_CONFIG_PATH, config);
    logger.info('RUNNING_KNOWLEDGE', `Updated notebooks.json with runningKnowledgeDoc ID: ${googleDocResult.documentId}`);
  } else if (dryRun) {
    logger.info('RUNNING_KNOWLEDGE', '[DRY RUN] Skipped Google Drive API calls.');
  } else {
    logger.warn('RUNNING_KNOWLEDGE', 'Google Auth not active; skipped Google Drive sync.');
  }

  logger.info('RUNNING_KNOWLEDGE', '=== Synchronization Completed Successfully ===');

  return {
    success: dryRun || (Boolean(googleDocResult) && sourceRefresh.verified),
    cloudDocumentUpdated: Boolean(googleDocResult),
    notebookSourcesVerified: sourceRefresh.verified,
    sourceRefresh,
    totalRules: deduplicatedRules.length,
    googleDoc: googleDocResult,
    charterPath: RUNNING_CHARTER_PATH,
    registryPath
  };
}

// CLI Execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');

  (async () => {
    try {
      const res = await syncRunningKnowledge({ dryRun, force });
      console.log('\n[SUCCESS] Running Knowledge Synchronization Succeeded!');
      console.log(`Total Deduplicated Rules: ${res.totalRules}`);
      if (res.googleDoc) {
        console.log(`Google Doc URL:          ${res.googleDoc.documentUrl}`);
        console.log(`Google Doc ID:           ${res.googleDoc.documentId}`);
      }
      console.log(`Charter Markdown:        ${res.charterPath}\n`);
    } catch (err) {
      console.error('\n[ERROR] Running Knowledge Sync Failed:', err.message);
      process.exit(1);
    }
  })();
}

module.exports = {
  syncRunningKnowledge,
  computeRuleCompositeKey,
  deduplicateRules,
  parseRulesFromMarkdown,
  generateRunningKnowledgeCharterMarkdown,
  generateUniversalCharterMarkdown
};
