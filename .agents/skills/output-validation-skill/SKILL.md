---
name: output-validation-skill
description: Use this skill to validate the completeness, correctness, and quality of any presales output (BOQ evaluation, RFP sizing, BOM reconciliation, Q&A answer) before presenting it to the user. Catches missing badges, incomplete financial totals, unresolved SKUs, and structural defects.
---

# Output Validation & Acceptance Criteria Skill (`output-validation-skill`)

**Purpose**: After the agent completes any presales pipeline execution, this skill mandates a structured self-check against acceptance criteria before presenting results. This prevents incomplete, inaccurate, or structurally deficient outputs from reaching the user.

---

## 🛡️ Universal Acceptance Criteria (All Tracks)

Every output, regardless of track, MUST pass these universal checks:

| # | Criterion | Validation Rule | Severity |
|---|-----------|----------------|----------|
| U1 | **Non-Empty Response** | Output contains ≥1 actionable recommendation, answer, or finding | 🔴 BLOCK |
| U2 | **Server Model Identified** | Target server model/generation is explicitly stated in the output | 🟡 WARN |
| U3 | **No Hallucinated SKUs** | Every part number mentioned passes `isValidHpeSKU()` and exists in certified `catalog.json` for the target chassis | 🔴 BLOCK |
| U4 | **Timestamp & Provenance** | Output includes execution timestamp and source attribution (which catalog version, which NLM notebook) | 🟡 WARN |
| U5 | **Honest Uncertainty** | Any unresolvable gaps are explicitly flagged (never silently omitted or filled with guesses) | 🔴 BLOCK |

---

## 📋 Track-Specific Acceptance Criteria

### Track: BOQ Evaluation

| # | Criterion | Validation Rule | Severity |
|---|-----------|----------------|----------|
| B1 | **All 7 Aspects Evaluated** | Output contains results from: Compute & Thermal, Memory Channel, Storage Tri-Mode, Networking & OCP, PCIe Riser, Power & Environmental, Support & Manufacturing | 🔴 BLOCK |
| B2 | **At Least 1 Ranked Solution** | Output contains at least Rank 1 (or explicit `UNBUILDABLE` determination with rationale) | 🔴 BLOCK |
| B3 | **No Duplicate Ranks** | Each rank number appears at most once (sub-paths like 1A/1B are allowed) | 🟡 WARN |
| B4 | **Financial Table Present** | Every solution includes: SKU, Description, Qty, Unit List Price (USD), Extended Price (USD) | 🔴 BLOCK |
| B5 | **Total CapEx Computed** | Total CapEx Budget sum is present and equals the sum of Extended Prices (±$0.01 tolerance) | 🔴 BLOCK |
| B6 | **Unresolved Prices Flagged** | If any SKU price could not be resolved, output states `(INCOMPLETE — N SKU(s) unresolved)` per `INV-33` | 🔴 BLOCK |
| B7 | **Dual-Brain Badges Present** | Output contains at least `[🧠 Deterministic Brain]` badge. RAG badge shows actual quality level per RAG Quality Gate | 🟡 WARN |
| B8 | **No Unsolicited Services** | Rank 1 solution does NOT contain installation/startup services unless customer explicitly requested them (`INV-32`) | 🔴 BLOCK |
| B9 | **FIO Tags for CTO Components** | Internal components in CTO containers have `#0D1` / `-F21` annotation in the description or notes (`INV-25`) | 🟡 WARN |
| B10 | **Cluster Sizing (if multi-node)** | If tender has >1 server node, output includes: Total RU, Rack Count, Peak kW, Rail Kit coverage (`INV-29`) | 🟡 WARN |
| B11 | **Delta Report Present** | Output contains "Customer Asked → We Produced" delta comparison showing additions, removals, and substitutions | 🟡 WARN |
| B12 | **Mandatory Accessories Injected** | Secondary heatsink, fan kits, controller cables, and enablement kits are present where required by INV-26 through INV-31 | 🔴 BLOCK |
| B13 | **Adversarial Self-Validation Clean** | Output passes automated adversarial sanity checks against enterprise edge-case failure modes (zero compromise on quality) | 🔴 BLOCK |
| B14 | **HITL Escalation on Uncertainty** | Any low-confidence RAG answer, conflicting source, or unmapped SKU was escalated to human operator with options | 🔴 BLOCK |
| B15 | **Proactive Presales Consultation Gate** | Output proactively presents the key qualifying questions (workload type, electrical facility, networking fabric) and next-step actions without waiting for user prompts | 🟡 WARN |
| B16 | **Google Drive & ADC Health Gate** | If cloud deliverable or Google Drive upload requested, verify token validity and lifespan via `ensureGoogleAuthValid({ autoHeal: true })` before presentation. If expired or expiring within 48h, auto-heal autonomously (`npm run auth:heal` / `npm run auth:drive`) without human in loop (`INV-90`) | 🔴 BLOCK |

### Track: RFP Sizing-to-BOM

| # | Criterion | Validation Rule | Severity |
|---|-----------|----------------|----------|
| R1 | **All Detected Roles Resolved** | Every component role the customer specified has a corresponding SKU in the synthesized BOM | 🔴 BLOCK |
| R2 | **Base Chassis Present** | Synthesized BOM includes exactly 1 base chassis CTO SKU | 🔴 BLOCK |
| R3 | **Memory Symmetry** | DIMM count is a multiple of populated memory channels (16 for DL380 Gen12, 24 for 4-socket) | 🟡 WARN |
| R4 | **Power Envelope Calculated** | Total system draw computed and matched to PSU wattage tier | 🟡 WARN |
| R5 | **Piped Through 7-Aspect Engine** | Synthesized BOM was validated through the full BOQ evaluation pipeline (not just presented raw) | 🔴 BLOCK |
| R6 | **Capability Space & Architectural Branching** | When customer requests "max [component]" or open-ended capacity, engine enumerates all chassis modes (e.g. 8DW vs 10DW) and surfaces parallel ranked sub-paths (Rank 1A vs Rank 1B) with trade-offs (`INV-84`) | 🔴 BLOCK |

### Track: BOM Reconciliation

| # | Criterion | Validation Rule | Severity |
|---|-----------|----------------|----------|
| C1 | **4 Audit Dimensions Populated** | Output addresses: Direct Matches, Missing Items, Unsolicited Extras, Substitutions | 🔴 BLOCK |
| C2 | **Net CapEx Delta Calculated** | Output states the total price difference between customer request and vendor quote | 🟡 WARN |
| C3 | **Unsolicited Extras Itemized** | Any unrequested services/software are individually listed with their CapEx impact (`INV-32`) | 🔴 BLOCK |
| C4 | **7-Column Schema Compliance** | If outputting a workbook, it follows the standardized schema per `INV-37` | 🟡 WARN |

### Track: Freeform Q&A

| # | Criterion | Validation Rule | Severity |
|---|-----------|----------------|----------|
| Q1 | **Answer References Sources** | Answer cites QuickSpecs page/section, catalog category, or specific INV rule | 🟡 WARN |
| Q2 | **Part Numbers Verified** | Any SKUs mentioned in the answer exist in certified catalogs | 🔴 BLOCK |
| Q3 | **Budget Prices Included** | If answering a "what do I need?" question, include unit list prices for recommended parts | 🟡 WARN |
| Q4 | **RAG Badge Accurate** | Badge reflects actual RAG quality gate result, not auto-verified | 🟡 WARN |

### Track: Catalog Intelligence

| # | Criterion | Validation Rule | Severity |
|---|-----------|----------------|----------|
| I1 | **Price Data Sourced from History** | Prices come from `price_history.json` or `catalog.json`, never fabricated (`INV-33`) | 🔴 BLOCK |
| I2 | **Date-Stamped Observations** | Each price point includes the observation date | 🟡 WARN |
| I3 | **Replacement Suggestion for Obsolete** | If queried SKU is `OB`/`EOL`, suggest a current replacement SKU with price | 🟡 WARN |

---

## ⚙️ Validation Execution Protocol

The agent MUST execute validation as the **final step** of every presales flow, BEFORE presenting the output:

### Step 1: Collect Output Artifact
- Gather the complete response text, financial tables, badges, and structured data

### Step 2: Run Universal Checks (U1–U5)
- If any 🔴 BLOCK criterion fails → DO NOT present the output
- Instead, report: `[⛔ OUTPUT VALIDATION FAILED: {criterion_id} — {description}]`
- Attempt to self-heal (e.g., re-resolve prices, re-run missing aspect) and re-validate

### Step 3: Run Track-Specific Checks
- Apply the relevant track's criteria table
- For 🔴 BLOCK failures: same as Step 2
- For 🟡 WARN failures: present the output with inline warnings: `[⚠️ {criterion_id}: {description}]`

### Step 4: Record in Execution Trace
- Log all validation results in the `outputValidation` section of the execution trace (per `execution-trace-skill`)
- Record `allAcceptanceCriteriaMet: true/false` and list any failures

### Step 5: Present Final Output
- If all criteria pass: present with full confidence badges
- If WARN-only failures: present with degraded badges and explicit warnings
- If BLOCK failures after self-heal attempt: present partial results with clear `[INCOMPLETE]` flags and explain what's missing

---

## 🔄 Self-Healing Strategies

When a BLOCK criterion fails, the agent SHOULD attempt these remediation strategies before giving up:

| Failed Criterion | Self-Heal Strategy |
|-----------------|-------------------|
| B1 (Missing Aspects) | Re-run the missing aspect checker individually |
| B4/B5 (Missing Financials) | Re-resolve prices via `getHistoricalSkuPrice()` for unresolved SKUs |
| B6 (Unresolved Prices) | Check alternative catalog directories (Gen11/Gen12 cross-reference) |
| U3 (Hallucinated SKU) | Search across all certified catalogs; if truly non-existent, remove from output |
| B2 (No Ranked Solution) | Relax constraints and attempt Rank 5 (Budget Minimized) synthesis |
| R1 (Unresolved Roles) | Query NotebookLM for the missing component category to find candidate SKUs |
| B12 (Missing Accessories) | Re-run conflict graph with expanded mandatory SKU injection |

---

## 📊 Validation Summary Badge

After validation completes, emit a summary badge in the output:

```
✅ [OUTPUT VALIDATION: 12/12 criteria PASSED — Full confidence]
```
or
```
⚠️ [OUTPUT VALIDATION: 10/12 criteria PASSED, 2 WARNINGS — B9: FIO tags not annotated, B11: Delta report omitted]
```
or
```
⛔ [OUTPUT VALIDATION: 9/12 criteria PASSED, 1 BLOCKED — B5: Financial total mismatch ($45,230 vs $44,890 line item sum). Self-heal attempted: re-resolved 2 SKU prices. Re-validation: PASSED]
```


### Portable deliverables (2026-09-22)

Saved Markdown deliverables use encoded report-relative links from `toReportLink`; native launchers use `toClickableFileUri`. Retain evidence beside the report. Check that every local target exists, including workbooks with spaces, Unicode, percent signs and parentheses. Cross-drive/share links need encoded file URLs and cannot be made portable without moving their targets. Native app launching on another OS is not certified by path-format checks.
