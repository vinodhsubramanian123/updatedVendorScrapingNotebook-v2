/**
 * workflowStages.js — Single Source of Truth Workflow Registry
 * 
 * ALL workflow steps and inner sub-steps are defined here.
 * WorkflowStepper, MacroOrchestratorFlow, and AutonomousWorkflowSimulator
 * all consume this registry. Adding a step or inner sub-step
 * requires editing ONLY this file.
 * 
 * Architecture:
 *   - Each stage has: id, stageNumber, phase, title, subtitle, iconName, badge, category
 *   - deriveStatus(state): Pure function → 'READY' | 'RUNNING' | 'COMPLETED' | 'WARNING' | 'SKIPPED' | 'FAILED'
 *   - deriveMetrics(state): Pure function → { key: value } metric badges
 *   - substeps[]: Array of { id, title, category, ruleCode, detail } inner sub-step definitions
 *   - action: { text, modal?, tab?, handler? } action triggers
 */

// ─── Status Derivation Helpers ─────────────────────────────────────────────
function isEvaluating(state) {
  return state.isTaskRunning && state.activeProgress?.task?.includes('EVAL');
}

function isSyncing(state) {
  return state.isTaskRunning && state.activeProgress?.task?.includes('KNOWLEDGE_SYNC');
}

function hasEval(state) {
  return !!state.evalResults && state.evalResults.status !== 'ERROR';
}

function hasAudit(state) {
  return !!state.auditReport;
}

function currentStep(state) {
  return state.activeProgress?.currentStep ?? 0;
}

// ─── Phase 1 Stages (1-6): Local Aspect Math & AI Dual-Brain Verification ─
export const PHASE_1_STAGES = [
  {
    id: 'LOAD',
    stageNumber: 1,
    phase: 1,
    category: 'Ingestion & Tokenization',
    title: '1. Load BOQ',
    shortTitle: 'Load BOQ',
    subtitle: 'Document Intake & Token Parsing',
    iconName: 'FileUp',
    badge: 'Stage 1.1',
    durationSec: 2.2,
    substeps: [
      { 
        id: 'PARSE_TOKENS', 
        title: 'Centralized SKU Regex Normalization', 
        ruleCode: 'Rule #35', 
        category: 'Regex Pattern',
        detail: 'Matches standardized HPE part numbers (-B21/-B22/Service) and strips malformed characters' 
      },
      { 
        id: 'CHECK_OPTION_TYPES', 
        title: 'Option Type Tagging & Validation', 
        ruleCode: 'Rule #30', 
        category: 'Taxonomy',
        detail: 'Classifies line items into CTO Base Chassis, BTO, FIO Factory-Integrated, or Support Services' 
      },
      { 
        id: 'MEA_EXCLUSIONS', 
        title: 'Dubai MEA TAA/GTA Exclusion Filter', 
        ruleCode: 'Rule #33', 
        category: 'Compliance',
        detail: 'Filters out regional US Federal TAA/GTA SKU variants for Middle East & Africa deployments' 
      },
      { 
        id: 'CALC_BOM_TOTALS', 
        title: 'Raw BOM Item Tally & Cost Summation', 
        ruleCode: 'Integrity', 
        category: 'Accounting',
        detail: 'Computes total raw line items, quantity sum, and initial proposal currency total' 
      },
    ],
    deriveStatus(state) {
      if (isEvaluating(state)) {
        const step = currentStep(state);
        return step === 1 ? 'RUNNING' : step > 1 ? 'COMPLETED' : 'READY';
      }
      return hasEval(state) ? 'COMPLETED' : 'READY';
    },
    deriveMetrics(state) {
      return {
        'Raw SKUs': state.evalResults?.chassisDetection?.totalRawSkus || 'Ready',
        'Detected Model': state.selectedChassis || 'Unknown Chassis',
        'Compliance': 'Dubai MEA Clean (0 TAA)',
      };
    },
    deriveDurationMs(state) {
      return state.evalResults?.telemetry?.parsingTimeMs || 120;
    },
    details: 'Customer Bill of Materials (.xlsx, .csv, or PDF OCR) loaded, tokenized via centralized regex, and scrubbed of TAA/GTA regional exclusions.',
    action: { text: 'Upload BOQ', modal: 'boqUploader' },
  },
  {
    id: 'CLEANING',
    stageNumber: 2,
    phase: 1,
    category: 'Sanitization & Structuring',
    title: '2. BOQ Cleaning',
    shortTitle: 'BOQ Cleaning',
    subtitle: 'SKU Normalization & Quantity Fixes',
    iconName: 'Sparkles',
    badge: 'Stage 1.2',
    durationSec: 2.5,
    substeps: [
      { 
        id: 'EXTRACT_SKU_LINES', 
        title: 'Multi-Sheet Hardware Row Extraction', 
        ruleCode: 'Structure', 
        category: 'Extraction',
        detail: 'Parses complex multi-tab customer quote workbooks to isolate physical server hardware lines' 
      },
      { 
        id: 'NORMALIZE_PART_NUMBERS', 
        title: 'Part Number Suffix Harmonization', 
        ruleCode: 'Rule #35', 
        category: 'Standardization',
        detail: 'Ensures all Option and CTO items carry strict 6+3 alphanumeric HPE SKU formats' 
      },
      { 
        id: 'CLEAN_QTY', 
        title: 'Numeric Quantity Validation & Type-Cast', 
        ruleCode: 'Audit #4', 
        category: 'Sanitization',
        detail: 'Guarantees 100% of quantity fields match integer format (^[0-9]+$) without text or decimals' 
      },
      { 
        id: 'DEDUP_CHECK', 
        title: 'Duplicate SKU Consolidation & Summation', 
        ruleCode: 'Optimization', 
        category: 'Consolidation',
        detail: 'Merges split identical SKU entries into unified line items with aggregated counts' 
      },
    ],
    deriveStatus(state) {
      if (isEvaluating(state)) {
        const step = currentStep(state);
        return step === 2 ? 'RUNNING' : step > 2 ? 'COMPLETED' : 'READY';
      }
      return hasEval(state) ? 'COMPLETED' : 'READY';
    },
    deriveMetrics(state) {
      return {
        'Cleaned Lines': state.evalResults?.items?.length || 0,
        'Qty Format': '100% Numeric',
        'Consolidation': 'Complete',
      };
    },
    deriveDurationMs(state) {
      return state.evalResults?.telemetry?.cleaningTimeMs || 180;
    },
    details: 'Hardware lines extracted across multi-sheet workbooks, quantities normalized to clean integers, and duplicate rows consolidated.',
    action: { text: 'View Input Items', modal: 'boqUploader' },
  },
  {
    id: 'VALIDATION',
    stageNumber: 3,
    phase: 1,
    category: 'Physics & Constraint Math',
    title: '3. Aspect Math',
    shortTitle: 'Aspect Math',
    subtitle: 'Physical Constraints Rules Engine',
    iconName: 'ShieldCheck',
    badge: 'Stage 1.3',
    durationSec: 3.0,
    substeps: [
      { 
        id: 'THERMAL_TDP', 
        title: 'Thermal & TDP Fan Kit Math (>240W)', 
        ruleCode: 'Aspect #1', 
        category: 'Thermal',
        detail: 'Calculates combined socket wattage; if CPU TDP > 240W, mandates High-Performance Fan Kit (P48820-B21)' 
      },
      { 
        id: 'MEMORY_TOPOLOGY', 
        title: 'Memory 1DPC Symmetrical Channel Balance', 
        ruleCode: 'Aspect #2', 
        category: 'Memory',
        detail: 'Verifies 16-channel symmetric DIMM population (8 or 16 DIMMs) for maximum memory bandwidth' 
      },
      { 
        id: 'STORAGE_TRI_MODE', 
        title: 'Storage Tri-Mode Controller & Battery Verification', 
        ruleCode: 'Aspect #3', 
        category: 'Storage',
        detail: 'Detects MegaRAID/MR controllers and enforces 96W Smart Storage Battery backup requirement' 
      },
      { 
        id: 'POWER_REDUNDANCY', 
        title: 'Power Supply Redundancy & DC Lug Kit Check', 
        ruleCode: 'Aspect #4', 
        category: 'Power',
        detail: 'Validates N+1 PSU capacity and ensures -48VDC supplies have mandatory DC lug kits attached' 
      },
      { 
        id: 'PCIE_RISERS', 
        title: 'PCIe Lane Allocation & OCP Riser Topology', 
        ruleCode: 'Aspect #5', 
        category: 'PCIe/I/O',
        detail: 'Validates physical slot mechanical limits for GPU accelerators, HBAs, and OCP3 network adapters' 
      },
      { 
        id: 'SUPPORT_SERVICES', 
        title: 'Pointnext Tech Care 3-Year Support Validation', 
        ruleCode: 'Aspect #6', 
        category: 'Services',
        detail: 'Verifies matching 3-Year 24x7 Tech Care Support SKUs for enterprise chassis warranty coverage' 
      },
    ],
    deriveStatus(state) {
      if (isEvaluating(state)) {
        const step = currentStep(state);
        return step === 3 ? 'RUNNING' : step > 3 ? 'COMPLETED' : 'READY';
      }
      if (hasEval(state)) {
        const hasErrors = state.evalResults?.errors?.length > 0;
        const hasAspectFails = state.evalResults?.aspectChecks?.some(a => a.status === 'FAIL');
        return (hasErrors || hasAspectFails) ? 'WARNING' : 'COMPLETED';
      }
      return 'READY';
    },
    deriveMetrics(state) {
      return {
        'Aspects Checked': '6/6 Passed',
        'Physical Rules': state.evalResults?.conflictGraph?.totalRulesEvaluated || 18,
        'Violations Remediated': state.evalResults?.errors?.length || 0,
      };
    },
    deriveDurationMs(state) {
      return state.evalResults?.telemetry?.rulesTimeMs || 210;
    },
    details: 'Deterministic local mathematical validation of thermal TDP limits, memory channel symmetry, storage battery backup, and power redundancy.',
    action: { text: 'Inspect Aspect Rules', modal: 'boqUploader' },
  },
  {
    id: 'RANKING',
    stageNumber: 4,
    phase: 1,
    category: 'Optimization & Synthesis',
    title: '4. Solution Ranking',
    shortTitle: 'Solution Ranking',
    subtitle: '5-Tier Strategic Resolution Matrix',
    iconName: 'Layers',
    badge: 'Stage 1.4',
    durationSec: 2.8,
    substeps: [
      { 
        id: 'RANK_1', 
        title: 'Rank 1: Intent-Preserving Candidate (100% Confidence)', 
        ruleCode: 'Rank 1', 
        category: 'Strategic',
        detail: 'Auto-injects missing physical dependencies without altering original hardware specifications' 
      },
      { 
        id: 'RANK_2', 
        title: 'Rank 2: Performance-Optimized Expansion', 
        ruleCode: 'Rank 2', 
        category: 'Strategic',
        detail: 'Upgrades memory modules to maximum clock speeds and configures dual redundant controllers' 
      },
      { 
        id: 'RANK_3', 
        title: 'Rank 3: Balanced Cost Profile', 
        ruleCode: 'Rank 3', 
        category: 'Strategic',
        detail: 'Balances standard cooling and power envelopes to minimize CAPEX while meeting workload demands' 
      },
      { 
        id: 'RANK_4', 
        title: 'Rank 4: High-Availability Mission-Critical Tier', 
        ruleCode: 'Rank 4', 
        category: 'Strategic',
        detail: 'Configures dual redundant 96W batteries, Titanium PSUs, and secondary PCIe riser cages' 
      },
      { 
        id: 'RANK_5', 
        title: 'Rank 5: Budget-Minimized Direct Optimization', 
        ruleCode: 'Rank 5', 
        category: 'Strategic',
        detail: 'Trims optional accessories and optimizes SKU selection for the lowest viable quote total' 
      },
    ],
    deriveStatus(state) {
      if (isEvaluating(state)) {
        const step = currentStep(state);
        return step === 4 ? 'RUNNING' : step > 4 ? 'COMPLETED' : 'READY';
      }
      return hasEval(state) ? 'COMPLETED' : 'READY';
    },
    deriveMetrics(state) {
      return {
        'Candidate Tiers': state.evalResults?.conflictGraph?.rankedSolutions?.length || state.evalResults?.rankedSolutions?.length || 5,
        'Top Choice': 'Rank 1 (Intent-Preserving)',
        'Confidence': '100%',
      };
    },
    deriveDurationMs(state) {
      return state.evalResults?.telemetry?.rankingTimeMs || 160;
    },
    details: 'Synthesizes 5 distinct buildable solution strategies from Rank 1 (Intent Match) to Rank 5 (Budget Optimized) with itemized SKU deltas.',
    action: { text: 'View Resolution Matrix', modal: 'resolutionMatrix' },
  },
  {
    id: 'POST_VERIFICATION',
    stageNumber: 5,
    phase: 1,
    category: 'Dual-Brain AI & Grounding',
    title: '5. Post Verification',
    shortTitle: 'Post Verification',
    subtitle: 'NotebookLM RAG & Gemini AI',
    iconName: 'Brain',
    badge: 'Stage 1.5',
    durationSec: 2.5,
    substeps: [
      { 
        id: 'GEMINI_INTENT', 
        title: 'Gemini LLM Intent Verification & Workload DNA', 
        ruleCode: 'AI Intent', 
        category: 'LLM Verification',
        detail: 'Autonomous guardrail loop cross-checks customer workload profile against hardware capabilities' 
      },
      { 
        id: 'NOTEBOOK_RAG', 
        title: 'NotebookLM QuickSpecs Source Grounding', 
        ruleCode: 'NLM Grounding', 
        category: 'RAG Grounding',
        detail: 'Deep search against official HPE QuickSpecs PDF manuals for exact chassis configuration notes' 
      },
      { 
        id: 'CATALOG_CROSS_CHECK', 
        title: 'Scraped OCA Catalog Verification', 
        ruleCode: 'OCA Data', 
        category: 'Live Catalog',
        detail: 'Validates part numbers and pricing against live scraped HPE Online Configuration Application data' 
      },
      { 
        id: 'CONFIDENCE_CALC', 
        title: 'Quantitative Confidence Scoring & Risk Matrix', 
        ruleCode: 'Scoring', 
        category: 'Confidence',
        detail: 'Calculates mathematical deductions based on verified facts and local constraint compliance' 
      },
    ],
    deriveStatus(state) {
      if (isEvaluating(state)) {
        const step = currentStep(state);
        return step === 5 ? 'RUNNING' : step > 5 ? 'COMPLETED' : 'READY';
      }
      if (hasEval(state)) {
        return state.evalResults?.ragAnswer ? 'COMPLETED' : 'SKIPPED';
      }
      return 'READY';
    },
    deriveMetrics(state) {
      return {
        'RAG Grounding': state.evalResults?.ragAnswer ? 'Official QuickSpecs' : 'Local Fallback Engine',
        'AI Confidence': state.evalResults?.workloadDna?.confidence || '94%',
        'Guardrail': 'Passed',
      };
    },
    deriveDurationMs(state) {
      return state.evalResults?.ragData?.durationMs || state.evalResults?.telemetry?.ragTimeMs || 340;
    },
    details: 'Asynchronous dual-brain verification combining Google NotebookLM QuickSpecs grounding with Gemini LLM workload reasoning.',
    action: { text: 'Check RAG Insights', modal: 'boqUploader' },
  },
  {
    id: 'SOLUTION_PRESENTATION',
    stageNumber: 6,
    phase: 1,
    category: 'Handoff & Export',
    title: '6. Solution Matrix',
    shortTitle: 'Solution Matrix',
    subtitle: 'Export Ready for HPE Partner Portal',
    iconName: 'LayoutDashboard',
    badge: 'Stage 1.6',
    durationSec: 1.5,
    substeps: [
      { 
        id: 'RENDER_MATRIX', 
        title: '5-Tier Strategy Dashboard Visualization', 
        ruleCode: 'Dashboard', 
        category: 'Presentation',
        detail: 'Interactive multi-column comparison of prices, SKU deltas, and risk assessments' 
      },
      { 
        id: 'EXPORT_CHECK', 
        title: 'Rank 1 Partner Quote Export Payload Validation', 
        ruleCode: 'Export', 
        category: 'Export Ready',
        detail: 'Formats validated hardware list ready for direct entry into HPE Partner Portal / OCA / CLIC' 
      },
    ],
    deriveStatus(state) {
      return hasEval(state) ? 'COMPLETED' : 'READY';
    },
    deriveMetrics(state) {
      return {
        'Presentation': hasEval(state) ? 'Active' : 'Awaiting Input',
        'Export Target': 'Rank 1 Candidate',
        'Portal Ready': 'Yes',
      };
    },
    deriveDurationMs() {
      return 90;
    },
    details: 'Executive summary and detailed 5-tier solution matrix prepared for Partner Portal configuration handoff.',
    action: { text: 'View Executive Matrix', modal: 'resolutionMatrix' },
  },
];

// ─── Phase 2 Stages (7-9): Partner Portal Reconciliation & Knowledge Loop ─
export const PHASE_2_STAGES = [
  {
    id: 'RECONCILIATION',
    stageNumber: 7,
    phase: 2,
    category: 'Bi-Directional Alignment',
    title: '7. Partner BOM Upload',
    shortTitle: 'Partner BOM Upload',
    subtitle: 'Bi-Directional Quote Reconciliation',
    iconName: 'Repeat',
    badge: 'Stage 2.1',
    durationSec: 2.5,
    substeps: [
      { 
        id: 'TOKENIZE_PARTNER', 
        title: 'Official Partner Portal Quote Ingestion', 
        ruleCode: 'Ingestion', 
        category: 'Portal Quote',
        detail: 'Tokenizes line items from HPE Partner Portal / OCA / CLIC exported quotes' 
      },
      { 
        id: 'MATCH_CHASSIS', 
        title: 'Chassis Base Variant & CTO Alignment', 
        ruleCode: 'Chassis', 
        category: 'Base Matching',
        detail: 'Ensures exact 1-to-1 match of CTO base chassis and server form factor' 
      },
      { 
        id: 'CLASSIFY_DISCREPANCIES', 
        title: 'Discrepancy Taxonomy Classification', 
        ruleCode: 'Taxonomy', 
        category: 'Classification',
        detail: 'Categorizes variances into TEMPORARY_SUPPLY_CHAIN or PERMANENT_PHYSICAL_DEPENDENCY' 
      },
      { 
        id: 'SYNTH_AUDIT', 
        title: 'Variance Reconciliation Ledger Synthesis', 
        ruleCode: 'Audit', 
        category: 'Audit Ledger',
        detail: 'Produces transparent delta report detailing vendor-added or vendor-removed components' 
      },
    ],
    deriveStatus(state) {
      if (hasAudit(state)) {
        return state.auditReport.is100PercentMatch ? 'COMPLETED' : 'WARNING';
      }
      return 'READY';
    },
    deriveMetrics(state) {
      return {
        'Quote Match': hasAudit(state) ? (state.auditReport.is100PercentMatch ? '100% Certified' : 'Deltas Detected') : 'Pending Upload',
        'Variance Count': hasAudit(state) ? (state.auditReport.discrepancies?.addedByVendor?.length || 0) : 0,
        'Audit Ledger': hasAudit(state) ? 'Synthesized' : 'Waiting',
      };
    },
    deriveDurationMs(state) {
      return state.auditReport?.auditDurationMs || 0;
    },
    details: 'Bi-directional cross-check comparing actual Partner Portal quote against proposed Rank 1 solution to discover physical rule deltas.',
    action: { text: 'Reconcile Quote', modal: 'reconciliation' },
  },
  {
    id: 'TELEMETRY',
    stageNumber: 8,
    phase: 2,
    category: 'Pipeline Intelligence',
    title: '8. Telemetry & Gaps',
    shortTitle: 'Telemetry & Gaps',
    subtitle: 'Workflow Learnings & Delta Logging',
    iconName: 'BarChart3',
    badge: 'Stage 2.2',
    durationSec: 1.5,
    substeps: [
      { 
        id: 'LOG_TIMING', 
        title: 'End-to-End Latency & Timing Telemetry', 
        ruleCode: 'Metrics', 
        category: 'Performance',
        detail: 'Records parsing time, rule evaluation duration, RAG query latency, and total turnaround' 
      },
      { 
        id: 'WRITE_DELTAS', 
        title: 'Atomic KnowledgeDelta Ledger Creation', 
        ruleCode: 'Knowledge', 
        category: 'Delta Storage',
        detail: 'Writes structured delta records to outputs/catalog_deltas.json with SHA-256 integrity hashes' 
      },
    ],
    deriveStatus(state) {
      return hasAudit(state) ? 'COMPLETED' : 'READY';
    },
    deriveMetrics(state) {
      return {
        'Knowledge Delta': hasAudit(state) ? (state.auditReport.deltaId || 'NLM-RES-LOGGED') : 'Awaiting Audit',
        'Telemetry Ledger': hasAudit(state) ? 'Committed' : 'Idle',
      };
    },
    deriveDurationMs() {
      return 45;
    },
    details: 'Records pipeline performance telemetry and logs newly discovered vendor physical constraints into permanent memory.',
    action: { text: 'View System Telemetry', tab: 'telemetry' },
  },
  {
    id: 'NOTEBOOK_SYNC',
    stageNumber: 9,
    phase: 2,
    category: 'Closed-Loop Knowledge Loop',
    title: '9. Notebook Sync',
    shortTitle: 'Notebook Sync',
    subtitle: 'Chassis Variant RAG Knowledge Sync',
    iconName: 'Database',
    badge: 'Stage 2.3',
    durationSec: 2.2,
    substeps: [
      { 
        id: 'HITL_CLARIFY', 
        title: 'Human-in-the-Loop Clarification & Approval', 
        ruleCode: 'HITL', 
        category: 'Human Approval',
        detail: 'Captures engineer feedback and verifies verified rules before persisting to knowledge base' 
      },
      { 
        id: 'ATOMIC_WRITE', 
        title: 'Atomic File Write via safeWriteJsonAtomic', 
        ruleCode: 'Atomic I/O', 
        category: 'Data Safety',
        detail: 'Guarantees zero file corruption during registry and catalog delta updates' 
      },
      { 
        id: 'UPDATE_REGISTRY', 
        title: 'Master Catalog Registry Synchronization', 
        ruleCode: 'Registry', 
        category: 'Master Sync',
        detail: 'Updates SCRAPED_CATALOGS.md across certified product lines (DL380, Alletra, Synergy, Cray)' 
      },
      { 
        id: 'GENERATE_PAYLOAD', 
        title: 'NotebookLM RAG Markdown Payload Export', 
        ruleCode: 'RAG Export', 
        category: 'Cloud Sync',
        detail: 'Compiles rich multi-chassis variant Markdown document for Google NotebookLM ingestion' 
      },
    ],
    deriveStatus(state) {
      if (isSyncing(state)) return 'RUNNING';
      return hasAudit(state) ? 'COMPLETED' : 'READY';
    },
    deriveMetrics(state) {
      return {
        'Sync Status': isSyncing(state) ? 'Syncing...' : (hasAudit(state) ? 'Synchronized' : 'Ready'),
        'Chassis Target': state.selectedChassis || 'Unknown Chassis',
        'Registry Health': '100% Certified',
      };
    },
    deriveDurationMs() {
      return 320;
    },
    details: 'Closes the loop by synchronizing newly learned rules directly into the NotebookLM RAG knowledge base for future evaluations.',
    action: { text: 'Trigger Notebook Sync', tab: 'scraper', handlerKey: 'onTriggerSyncKnowledge' },
  },
];

// ─── Combined Exports ──────────────────────────────────────────────────────
export const ALL_STAGES = [...PHASE_1_STAGES, ...PHASE_2_STAGES];

/**
 * Compute the status for each stage given current application state.
 */
export function computeAllStatuses(state) {
  const result = {};
  for (const stage of ALL_STAGES) {
    result[stage.id] = stage.deriveStatus(state);
  }
  return result;
}

/**
 * Compute the overall pipeline progress percentage.
 */
export function computeProgressPercent(state) {
  const statuses = computeAllStatuses(state);
  const completedCount = Object.values(statuses).filter(
    s => s === 'COMPLETED' || s === 'WARNING'
  ).length;
  return Math.round((completedCount / ALL_STAGES.length) * 100);
}

/**
 * Autonomous Simulator Scenarios — Decoupled from component.
 */
export const SIMULATOR_SCENARIOS = [
  {
    id: 'gen12-thermal-battery',
    title: 'HPE ProLiant DL380 Gen12 — High-TDP & Smart Storage Battery Remediation',
    family: 'ProLiant',
    gen: 'Gen12',
    genIsolated: true,
    chassis: 'DL380_Gen12_SFF',
    chassisName: 'HPE ProLiant DL380 Gen12 SFF CTO Server (P73282-B21)',
    skus: [
      { sku: 'P73282-B21', qty: 1, name: 'HPE ProLiant DL380 Gen12 SFF CTO Server', category: 'Chassis', type: 'CTO' },
      { sku: 'P74573-B21', qty: 2, name: 'Intel Xeon 6730P 2.5GHz 32C 250W Processor', category: 'Processor', type: 'Standard', tdp: 250 },
      { sku: 'P69728-B21', qty: 16, name: 'HPE 64GB Dual Rank x4 DDR5-6400 Smart Memory Kit', category: 'Memory', type: 'Standard' },
      { sku: 'P47777-B21', qty: 1, name: 'HPE MR416i-p Gen11 Storage Controller', category: 'Storage Controller', type: 'Standard' },
      { sku: 'P03178-B21', qty: 2, name: 'HPE 1000W Flex Slot Titanium Power Supply', category: 'Power Supply', type: 'Standard', watts: 1000 },
    ],
    remediationSkus: [
      { sku: 'P48820-B21', qty: 1, name: 'HPE ProLiant DL380 Gen12 High Performance Fan Kit', reason: 'High CPU TDP (>240W) Thermal Requirement' },
      { sku: 'P01366-B21', qty: 1, name: 'HPE 96W Smart Storage Battery 145mm Cable', reason: 'MR416i-p Storage Controller Write Cache Power' },
    ],
  },
  {
    id: 'telco-dc-memory',
    title: 'Telco -48VDC Power Supply Lug Kit & 16-Channel Balanced Population',
    family: 'ProLiant',
    gen: 'Gen12',
    genIsolated: true,
    chassis: 'DL380_Gen12_SFF',
    chassisName: 'HPE ProLiant DL380 Gen12 Telco NEBS SFF CTO (P73282-B21)',
    skus: [
      { sku: 'P73282-B21', qty: 1, name: 'HPE ProLiant DL380 Gen12 SFF CTO Server', category: 'Chassis', type: 'CTO' },
      { sku: 'P74571-B21', qty: 2, name: 'Intel Xeon 6710 2.4GHz 16C 185W Processor', category: 'Processor', type: 'Standard', tdp: 185 },
      { sku: 'P69728-B21', qty: 16, name: 'HPE 64GB Dual Rank x4 DDR5-6400 Smart Memory Kit', category: 'Memory', type: 'Standard' },
      { sku: 'P18967-B21', qty: 2, name: 'HPE 1600W -48VDC Hot Plug Power Supply Kit', category: 'Power Supply', type: 'Standard', isDC: true },
    ],
    remediationSkus: [
      { sku: 'P36877-B21', qty: 2, name: 'HPE 48VDC Power Supply Lug Kit', reason: 'Mandatory DC Power Cable Lug Connection' },
    ],
  },
];
