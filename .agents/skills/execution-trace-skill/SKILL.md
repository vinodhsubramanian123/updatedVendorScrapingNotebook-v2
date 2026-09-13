---
name: execution-trace-skill
description: Use this skill to produce structured, auditable execution traces when running customer queries, BOQ evaluations, RFP sizing, BOM reconciliations, or any presales pipeline through the Antigravity agent harness. Enables step-level gap analysis and end-to-end verification.
---

# Execution Trace & Step-Level Checkpoint Verification Skill (`execution-trace-skill`)

**Purpose**: When the Antigravity agent processes any presales query or customer BOQ, this skill mandates a structured execution trace that captures every step's input, output, verification status, and timing. This enables post-execution gap analysis: "Was the entire process right? If not, where exactly did it fail?"

---

## 🏗️ Execution Trace Architecture

Every agent-driven presales flow produces two artifacts:

1. **Machine-Readable Trace** (`execution_trace_{run_id}.json`) — saved to `outputs/temp/agent_traces/`
2. **Human-Readable Summary** (`execution_summary_{run_id}.md`) — presented inline to the user

### Trace JSON Schema

```json
{
  "traceId": "UUID-v4",
  "startedAt": "ISO-8601",
  "completedAt": "ISO-8601",
  "totalDurationMs": 12340,
  "intent": {
    "classification": "BOQ_EVALUATION | RFP_SIZING_TO_BOM | BOM_RECONCILIATION | FREEFORM_QA | CATALOG_INTELLIGENCE",
    "confidence": 0.98,
    "skillTarget": "boq-eval-skill",
    "rationale": "Input contains customer BOQ spreadsheet..."
  },
  "customerInput": {
    "rawQuery": "Evaluate this DL380 Gen12 BOQ...",
    "filePath": "/path/to/boq.xlsx",
    "detectedModel": "DL380_Gen12",
    "detectedGeneration": "Gen12",
    "detectedFamily": "ProLiant"
  },
  "steps": [
    {
      "stepNumber": 1,
      "stepName": "Intent Classification & Routing",
      "status": "PASSED | FAILED | SKIPPED | WARNING",
      "durationMs": 45,
      "input": { "queryText": "...", "hasFile": true },
      "output": { "intent": "BOQ_EVALUATION", "confidence": 0.98 },
      "verificationChecks": [
        { "check": "Intent classified with ≥0.85 confidence", "result": true },
        { "check": "Skill target mapped", "result": true }
      ],
      "notes": ""
    }
  ],
  "finalOutput": {
    "solutionRanksProduced": ["Rank1A", "Rank1B", "Rank2", "Rank3", "Rank5"],
    "totalCapExBudget": 45230.00,
    "unresolvedSkuCount": 0,
    "allAspectsEvaluated": true,
    "badgesPresented": ["DETERMINISTIC_PASSED", "CLOUD_NLM_VERIFIED", "CLIC_BUILDABLE"]
  },
  "outputValidation": {
    "allAcceptanceCriteriaMet": true,
    "failures": []
  },
  "deltaReport": {
    "customerRequested": ["P73289-B21 x2", "P64707-B21 x16", "..."],
    "weProduced": ["P73289-B21 x2", "P64707-B21 x16", "P48818-B21 x1 (ADDED)", "..."],
    "additions": [{ "sku": "P48818-B21", "reason": "Secondary CPU Heatsink mandatory for dual-socket" }],
    "removals": [],
    "substitutions": []
  }
}
```

---

## 🔍 Step-Level Verification Gate Matrix

The agent MUST verify each gate before proceeding to the next step. If a gate fails, the trace records the failure and the agent decides: continue with degraded confidence, or halt and report.

### Track: BOQ Evaluation (7-Step Journey)

| Step | Name | Verification Gates | Fail Action |
| :--- | :--- | :--- | :--- |
| **1** | Intent Classification & Routing | ✅ Intent ≥0.85 confidence · ✅ Skill target resolved · ✅ File readable (if file-based) | HALT — ambiguous input |
| **2** | Intake, Ingestion & CTO Normalization | ✅ Base chassis SKU detected · ✅ ≥1 hardware line item extracted · ✅ CTO multiplier resolved (or default 1x) · ✅ Non-BOM sheets filtered (`INV-63`) | HALT — unparseable input |
| **3** | 7-Aspect Physical Pre-Flight Math | ✅ All 7 aspect modules returned results (no crash) · ✅ Catalog directory found on disk · ✅ `_skuIndex` built successfully · ✅ At least 1 aspect produced actionable findings | WARN — continue with missing aspects flagged |
| **4** | Conflict Graph & Dependency Resolution | ✅ `fullBomMap` populated · ✅ Conflict edges enumerated · ✅ Workload DNA profile extracted · ✅ Learned deltas injected from `catalog_deltas.json` | WARN — continue without delta enrichment |
| **5** | 5-Tier Strategy Matrix Synthesis | ✅ At least 1 ranked solution produced · ✅ Rank 1 exists (or explicit `UNBUILDABLE` flag) · ✅ No duplicate ranks · ✅ All solutions are 100% buildable (zero-rank invariant) | HALT — no valid solutions |
| **6** | NotebookLM RAG Grounding & HITL Check | ✅ Query dispatched to correct notebook ID · ✅ Response received within timeout · ✅ **Strict SKU Quality Gate**: answer cites target SKU or exact physical rule · ✅ If inconclusive/conflicting, escalate to human and persist feedback delta | ESCALATE — ask human; do not hallucinate |
| **7** | Financial Itemization & Output Assembly | ✅ Every SKU has a non-zero resolved price (or flagged `INCOMPLETE`) · ✅ Line item sum equals total CapEx · ✅ All mandatory badges present · ✅ Cluster sizing emitted (if multi-node) | WARN — present with `(INCOMPLETE)` flags |
| **8** | Adversarial Stress & Sanity Check | ✅ 0 violations in automated adversarial sanity checks against failure modes (missing heatsink, SAS expander limit, GPU auxiliary cables, ErP Lot 9 PSUs) | HALT — inject missing kits/fixes before certifying Rank 1 |

### Track: RFP Sizing-to-BOM (5-Step Journey)

| Step | Name | Verification Gates | Fail Action |
| :--- | :--- | :--- | :--- |
| **1** | Parse & Tokenize Requirements | ✅ At least 3 of 7 component roles detected (chassis, CPU, memory, storage, network, power, support) · ✅ Server model/generation resolved | HALT — ask for clarification |
| **2** | Resolve to Catalog SKUs | ✅ Every detected role has ≥1 candidate SKU · ✅ All candidate SKUs pass `isValidHpeSKU()` · ✅ Prices resolved for ≥80% of SKUs | WARN — flag unresolved roles |
| **3** | Compile Baseline BOM | ✅ BOM has ≥5 line items · ✅ Chassis base SKU present · ✅ Output format matches eval_boq.js input schema (SKU, Qty, Description columns) | HALT — incomplete BOM |
| **4** | Validate via 7-Aspect Engine | ✅ Pipe through BOQ Evaluation Track Steps 3-7 · ✅ All BOQ eval verification gates pass | Inherit BOQ eval fail actions |
| **5** | Present 5-Tier Matrix | ✅ Same as BOQ eval Step 7 | Inherit |

### Track: BOM Reconciliation (4-Step Journey)

| Step | Name | Verification Gates | Fail Action |
| :--- | :--- | :--- | :--- |
| **1** | Dual Document Ingestion | ✅ Both BOMs loaded · ✅ ≥5 line items in each · ✅ SKU format validated | HALT — missing/corrupt input |
| **2** | Line-by-Line SKU Alignment | ✅ Direct matches identified · ✅ Missing items flagged · ✅ Extras flagged · ✅ Substitutions detected | Continue — always produces output |
| **3** | Financial & Compliance Audit | ✅ Prices cross-referenced against `catalog.json` · ✅ FIO tags checked (`INV-25`) · ✅ Unsolicited services flagged (`INV-32`) | WARN — flag unverified prices |
| **4** | Reconciliation Report Assembly | ✅ 4 audit dimensions populated · ✅ Net CapEx delta calculated · ✅ 7-column schema compliance | Continue |

### Track: Freeform Q&A (3-Step Journey)

| Step | Name | Verification Gates | Fail Action |
| :--- | :--- | :--- | :--- |
| **1** | Model & Context Detection | ✅ Target server model identified (or default DL380 Gen12) · ✅ Query not empty | Continue with default |
| **2** | RAG Knowledge Query | ✅ Cloud NLM or Local RAG returned answer · ✅ **RAG Quality Gate** passed · ✅ Citations present | DEGRADE — mark `[LOCAL_FALLBACK_ONLY]` |
| **3** | Structured Answer Assembly | ✅ Answer includes part numbers where relevant · ✅ Budget prices cited · ✅ QuickSpecs page/section referenced | Continue |

### Track: Catalog Intelligence (3-Step Journey)

| Step | Name | Verification Gates | Fail Action |
| :--- | :--- | :--- | :--- |
| **1** | SKU & Query Detection | ✅ Target SKU extracted (or portfolio-wide query) · ✅ `price_history.json` readable | HALT — no history data |
| **2** | Price Trail & Lifecycle Lookup | ✅ Historical records found · ✅ Trail deduplicated (`INV-1`) · ✅ Lifecycle badges parsed (`INV-62`) | WARN — partial data |
| **3** | Trend Analysis & Report | ✅ Current price + previous price + delta % calculated · ✅ Replacement SKU suggested if obsolete | Continue |

---

## 📋 RAG Answer Quality Gate (Strict Mode — `INV-41` Extension)

When the agent receives a response from Cloud NotebookLM or Local RAG, apply these quality checks before awarding the `[📚 Cloud NLM Verified]` badge:

### Level 1: Structural Validity
- Response is non-empty and not an error message
- Response length ≥ 50 characters (filters out "I don't have information about that")

### Level 2: Topical Relevance
- Response mentions the target product generation (e.g., "Gen12", "DL380", "ProLiant")
- Response mentions the relevant component category (e.g., "processor", "memory", "storage controller")

### Level 3: SKU-Level Grounding (Strict)
- Response references at least 1 specific part number matching `isValidHpeSKU()` regex
- Referenced part numbers exist in the certified catalog for the target chassis

### Badge Assignment Rules

| Quality Level Achieved | Badge | Confidence Modifier |
| :--- | :--- | :--- |
| All 3 levels passed | `[📚 CLOUD_NLM_VERIFIED]` | +15% confidence |
| Levels 1+2 only | `[📚 CLOUD_NLM_PARTIAL — No SKU-level grounding]` | +5% confidence |
| Level 1 only | `[⚠️ RAG_INCONCLUSIVE — Generic response]` | +0% confidence |
| Failed Level 1 | `[❌ RAG_UNAVAILABLE — Timeout or error]` | -0% (fallback to deterministic only) |

---

## 📊 Delta Report: "Customer Asked → We Produced → Gap"

Every execution trace MUST conclude with a structured delta report:

```markdown
### 🔄 Configuration Delta Report

**Customer Requested**: 14 line items, 2x P73289-B21 (CPU), 16x P64707-B21 (Memory), ...
**We Produced (Rank 1A)**: 18 line items

| Change Type | SKU | Description | Reason | Source |
|-------------|-----|-------------|--------|--------|
| ✅ PRESERVED | P73289-B21 | Xeon Platinum 8580 | Customer intent matched | DETERMINISTIC |
| ➕ ADDED | P48818-B21 | Secondary CPU Heatsink | Mandatory for dual-socket (INV-61) | DETERMINISTIC |
| ➕ ADDED | P48820-B21 | High-Perf Fan Kit | Required for 350W TDP (INV-27) | DETERMINISTIC |
| ➕ ADDED | P35876-B21 | CE Mark Removal Kit | Non-EU Platinum PSU (INV-30) | RAG_VERIFIED |
| 🔄 SUBSTITUTED | P47777-B21 → MR416i-p | Controller bus pivot | OCP slot conflict (INV-39) | DETERMINISTIC |
```

### 💡 Presales Architectural Rationale & Client Objection Defense

Every output MUST provide a dedicated "Presales Architectural Rationale & Client Defense" block explaining non-obvious engineering decisions:
- **Component Density Caps**: (e.g. why 8 H200 NVLs instead of 10 on DL380a Gen12, citing NVLink bridge mechanical clearance in 10DW captive riser mode).
- **Memory Population Hierarchy**: (e.g. explaining 2 DIMMs per socket minimal bootable memory vs 8 DIMMs 1DPC full-interleaving bandwidth).
- **Ancillary Kit Injections**: (e.g. why `873763-B21` No Drive Configuration FIO Kit is injected for diskless nodes, why `P35876-B21` CE Mark Removal Kit is injected for Platinum PSUs under EU Lot 9, why `P74700-B21` 16-pin cable kits are selected for DL380a Gen12).
- **Presales Readiness**: Formatted so presales engineers can directly copy-paste vendor-grounded talking points into proposals or client emails to preempt customer objections.

---

## ⚡ Agent Execution Protocol

When executing ANY presales flow, the agent MUST:

1. **Initialize Trace**: Create a `traceId` (UUID v4) and `startedAt` timestamp at the very beginning
2. **Log Each Step**: Before each step, record `stepName` and `input`; after, record `output`, `status`, and `verificationChecks`
3. **Gate Enforcement**: Check all verification gates. If a HALT gate fails, stop and report the specific failure. If a WARN gate fails, continue but record the degradation
4. **Finalize Trace**: After completion, populate `finalOutput`, run `outputValidation`, generate `deltaReport`, and record `completedAt`
5. **Present Summary**: Show the human-readable execution summary inline, highlighting any WARN or FAILED gates

### Trace Storage Convention
- Production traces: `outputs/temp/agent_traces/execution_trace_{YYYY-MM-DD}_{traceId}.json`
- Test traces: `outputs/temp/test_payloads/trace_{traceId}.json` (follows `INV-7`)
