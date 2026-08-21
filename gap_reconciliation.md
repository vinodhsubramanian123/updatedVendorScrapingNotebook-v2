# Complete Reconciliation: Docs ↔ Diagrams ↔ Code ↔ Live Graph

A complete cross-layer gap analysis across **4 sources of truth**:
1. **`docs/`** — What was designed and specified
2. **`diagrams/fromDocs/`** — How the design was visualized  
3. **`diagrams/fromCode/`** — What the code actually does
4. **`scripts/lib/`** — Ground truth implementation
5. **`graphify-out/GRAPH_REPORT.md`** — Live 2213-node, 3228-edge semantic dependency graph (Built: 2026-08-21)

---

## 🟥 Critical Gaps (Design Says One Thing, Code Does Another)

---

### GAP-1 — `ragSecondOpinion` Is Static, Not Live (Diagrams vs Code)

| Layer | What It Says |
|---|---|
| `fromDocs/03` (Strategy Matrix diagram) | `RAG_CHECK → QuickSpecs Grounding Verification → NotebookLM Secondary Validation` applied to **all 5 tiers** |
| `fromDocs/08` (Guardrail diagram) | Guardrail actively queries NLM per-tier before returning output |
| **`strategy_synthesizer.js` line 242–334** | `ragSecondOpinion` for Ranks 1–5 are **hardcoded strings**: `"✅ Grounded in QuickSpecs: CTO factory standardized baseline..."` |

**Root Cause**: NLM queries are async and slow; the synthesizer is called synchronously inside `eval_boq.js`.  
**Impact**: UI shows fake "grounded" badges on Ranks 2–5 when no grounding actually occurred.  
**Fix**: Either call `queryLocalKnowledgeBase(tier_description)` inline per tier during synthesis (fast, offline), or mark them `"⏳ Pending (select to verify)"` with a client-triggered lazy-load endpoint.

---

### GAP-2 — Diagram Says 6 Aspects, Doc Says 6, Code Has 7 (Stale Docs)

| Layer | Aspect Count |
|---|---|
| `fromDocs/09` title | `"6-Aspect Physical Math Hierarchy"` — diagram shows exactly 6 subgraphs |
| `docs/ARCHITECTURE_AND_DESIGN.md` line 18 | `"6-Aspect Math: Thermal, Power, Memory, PCIe, Storage, Network"` |
| `docs/ARCHITECTURE_AND_DESIGN.md` line 176 (barrel table) | `"6-aspect physical math"` in the `boq` namespace description |
| **`scripts/lib/aspects/`** | **7 modules**: `compute_thermal`, `memory_channel`, `storage_tri_mode`, `networking_ocp`, `pcie_riser`, `power_environment`, **`support_manufacturing`** |
| **`boq_evaluator.js` line 5–13** | Comment header itself lists `7. Support & Services` |

**Root Cause**: `support_manufacturing.js` was added after the docs were finalized.  
**Impact**: Docs, diagrams, and barrel table description are internally inconsistent with the code.  
**Fix**:  
- Update `fromDocs/09` title to `"7-Aspect Physical Math Hierarchy"` and add Aspect 7 subgraph  
- Update all 3 instances in `docs/ARCHITECTURE_AND_DESIGN.md`  
- Update barrel table description in line 176  
- Update `fromDocs/01` (Dual-Brain diagram) which only shows D1–D6

---

### GAP-3 — `classifyKnowledgeScope()` Name Mismatch Between Modules

| Layer | Returns |
|---|---|
| `knowledge_sync.js` `classifyKnowledgeScope()` | Returns `'UNIVERSAL_HPE'` or `'FAMILY_GEN_SPECIFIC'` or `'CHASSIS_SPECIFIC'` |
| `feedback_loop.js` line 99–100 | Maps `'UNIVERSAL_HPE'` → `'UNIVERSAL_VENDOR'`, `'FAMILY_GEN_SPECIFIC'` → `'FAMILY_GEN'` |
| `fromDocs/05` diagram taxonomy node | Uses `UNIVERSAL_VENDOR_RULES`, `FAMILY_GEN_RULES`, `CHASSIS_SPECIFIC_RULES` |
| `master_knowledge_registry.json` schema | Keys are `universalRules`, `familyGenRules`, `chassisSpecificRules` |

**Root Cause**: The return values in `classifyKnowledgeScope()` use different string constants than the registry schema keys and the diagram labels. The translation layer in `feedback_loop.js` adds a fragile, silent mapping.  
**Impact**: Any new caller of `classifyKnowledgeScope()` that forgets to apply the translation will insert `'UNIVERSAL_HPE'` strings directly into `scopeTaxonomy` fields, causing registry mismatches.  
**Fix**: Standardize return values in `classifyKnowledgeScope()` to `'UNIVERSAL_VENDOR'` / `'FAMILY_GEN'` / `'CHASSIS_SPECIFIC'` — remove the translation layer in `feedback_loop.js`.

---

### GAP-4 — Guardrail Diagram Shows `query_quickspecs` Tool; Code Has `query_notebooklm`

| Layer | Tool Name |
|---|---|
| `fromDocs/08` (Guardrail sequence diagram) lines 21–29 | `Tool: query_quickspecs(query)` calls NLM via `MCP` |
| `fromCode/` diagrams reference `simulate_build`, `search_catalog` | From code structure |
| **`agentic_guardrail.js`** tool registry (line 77) | Tool is named **`query_notebooklm`**, not `query_quickspecs` |

**Root Cause**: The diagram was written using the conceptual name from the docs, but the implementation uses the actual MCP tool name.  
**Impact**: Diagram is misleading — engineers reading it would look for a `query_quickspecs` function that doesn't exist.  
**Fix**: Update `fromDocs/08` to use `query_notebooklm` (or add a note that `query_quickspecs` is the logical name resolved through `query_notebooklm`).

---

### GAP-5 — BOQ Workflow Diagram: Missing `7. Support` Aspect Check in Stage 3

| Layer | What It Shows |
|---|---|
| `fromDocs/02` (6-Stage BOQ workflow) line 38–43 | `par` block runs exactly 6 aspects, ends at `Aspect 6: Networking` |
| **`boq_evaluator.js`** imports | 7 aspect checkers imported, including `evalSupportManufacturing` |

**Impact**: Anyone reading the workflow diagram thinks there are 6 parallel checks. Aspect 7 (Pointnext Tech Care SLA) is invisible in the canonical workflow diagram.  
**Fix**: Add `Math->>Math: Aspect 7: Support & Services SLA (Tech Care Validation)` inside the `par` block.

---

## 🟡 Medium Gaps (Incomplete or Misaligned Detail)

---

### GAP-6 — Backend Route Diagram Missing Feedback & Telemetry Routes

| Layer | Routes Shown |
|---|---|
| `fromCode/01` (Backend API diagram) line 26–27 | Shows `R_FEEDBACK (feedback.cjs)` and `R_TELEMETRY (telemetry.cjs)` |
| `fromDocs/02` (BOQ Workflow) | Only shows `POST /api/eval-boq`, `POST /api/upload-boq`, `GET /api/stream-logs` |
| `fromDocs/05` (Feedback Learning) | Shows `POST /api/submit-feedback` as the API endpoint name |

**Root Cause**: `fromDocs/05` references `/api/submit-feedback` but the actual route (from `fromCode/01`) is `POST /api/feedback`.  
**Fix**: Update `fromDocs/05` feedback diagram endpoint label from `/api/submit-feedback` to `/api/feedback`.

---

### GAP-7 — Strategy Matrix: Rank 3 & 4 Are Static Addon Lists, Not Dynamic DNA-Based

| Layer | What It Says |
|---|---|
| `fromDocs/03` (Strategy Matrix diagram) | Rank 3: `"Upgrades to High-Performance NVMe / High-Clock Processors"`, Rank 4: `"Maximizes DIMM slot occupancy"` — *implied as computed from BOQ DNA* |
| `docs/ARCHITECTURE_AND_DESIGN.md` line 87–88 | `"Upgrade to NVMe / High-Frequency CPUs"`, `"Maximize 2DPC memory / 24-drive cages"` |
| **`strategy_synthesizer.js` lines 159–210** | Rank 2/3/4 addons come entirely from `strategy_addons.json` config file. If that file doesn't exist or `tierConfig` is empty, Ranks 2–5 are **identical to Rank 1**. |

**Root Cause**: The design assumed dynamic SKU computation from Workload DNA; the implementation delegates to a static config file.  
**Impact**: Without `scripts/config/strategy_addons.json`, Ranks 2/3/4 are empty of addons — the deduplication filter at line 343–354 then collapses them all into 1 unique rank.  
**Fix**:  
1. Verify `scripts/config/strategy_addons.json` exists with at least a `default` key  
2. Or: Generate dynamic Rank 3/4 addons from Workload DNA (e.g. detect `gpu: true` → add GPU riser kit SKU)

---

### GAP-8 — `fromDocs/01` Dual-Brain: `SIM ↔ D1..D6` Bidirectional Arrow Not In Code

| Layer | What It Shows |
|---|---|
| `fromDocs/01` line 63 | `SIM <--> D1 & D2 & D3 & D4 & D5 & D6` (bidirectional simulation feedback) |
| **`agentic_guardrail.js` `simulate_build` handler** | Calls `evaluateBOQMultiAspect(parsedItems, ...)` which runs all 7 aspects — but the result is **returned once** to Gemini, not looped back iteratively per-aspect |

**Root Cause**: The diagram implies a tight simulation feedback loop per aspect; the code does a single full re-evaluation and returns the aggregate.  
**Impact**: Minor — behavior is equivalent overall, but engineers may expect per-aspect simulation hooks.  
**Fix**: Add a clarifying note to `fromDocs/01` that the `SIM` node represents a full multi-aspect re-run, not per-aspect hooks.

---

### GAP-9 — `fromCode/03` Barrel Diagram Shows `budget_optimizer.js` Under BOQ; Its Role Is Unclear

| Layer | What It Shows |
|---|---|
| `fromCode/03` line 26 | `budget_optimizer.js (Rank 5 CapEx Minimizer)` |
| **`strategy_synthesizer.js`** | Rank 5 is synthesized inline; `budget_optimizer.js` is never imported there |

**Root Cause**: `budget_optimizer.js` may be a standalone script or early prototype that is not wired into the main synthesis flow.  
**Impact**: The barrel diagram suggests it's integrated into the BOQ subsystem but it may be orphaned.  
**Fix**: Verify if `budget_optimizer.js` is called anywhere in the live code path. If it's dead code, mark it `[DEPRECATED]` in both the barrel diagram and `scripts/lib/index.js`.

---

### GAP-10 — `fromDocs/11` Macro Orchestrator Shows 6 Stages; No Corresponding `fromCode` Diagram

| Layer | Status |
|---|---|
| `fromDocs/11` | Macro 6-stage orchestration lifecycle diagram |
| `fromCode/` | No matching orchestrator implementation diagram |

**Root Cause**: There is no `fromCode/11_macro_orchestrator.md` counterpart. This means no code-derived diagram documents how `scripts/rebuild_all.js`, `scripts/verify_all.js`, and `scripts/eval_boq.js` are connected in the orchestration lifecycle.  
**Fix**: Create `diagrams/fromCode/12_macro_orchestration_lifecycle.md` tracing `scripts/*.js` entry points and their execution dependencies.

---

## 🟢 Minor / Documentation-Only Drifts

---

### GAP-11 — `fromDocs/06` Key Rotator: State Machine Accurate, But Missing `AllKeysExhausted` State

| Layer | Status |
|---|---|
| `fromDocs/06` (FIFO State Machine) | Shows `DemotedToBottom → PromoteNextHead → ActiveHead` |
| **`gemini_rotator.js`** | Has a `NoActiveKeysAvailable` condition when all keys are exhausted |

**Fix**: Add a dead-end `AllKeysExhausted` state with a `⏳ Wait Until UTC Midnight Rollover` self-loop.

---

### GAP-12 — Docs Reference `gemini-3.5-flash` But `GEMINI.md` Uses `gemini-3.7-flash` / `gemini-2.5-flash-lite`

| Layer | Model Name |
|---|---|
| `GEMINI.md` line 2 | Lists `gemini-3.5-flash`, `gemini-2.5-flash-lite`, `gemini-3.7-flash` |
| **`agentic_guardrail.js` line 26** | `const MODEL_NAME = 'gemini-3.5-flash'` |
| `docs/WORKFLOWS_AND_LEARNINGS.md` line 4 | `gemini-3.5-flash` |

**Fix**: Standardize model version constant into `.env` as `GEMINI_MODEL_NAME=gemini-2.5-flash` and read it in `agentic_guardrail.js` and `ocr_service.js` instead of hardcoding. Update `GEMINI.md` to reflect the single canonical version.

---

## 📋 Reconciliation Priority Matrix

| # | Gap | Severity | Effort | Who is Affected |
|---|---|---|---|---|
| GAP-1 | `ragSecondOpinion` static strings on Ranks 2–5 | 🔴 High | Medium | End-users see fake grounding badges |
| GAP-2 | 6 vs 7 aspects — stale across all 3 layers | 🔴 High | Low | Misleads any engineer reading docs |
| GAP-3 | `classifyKnowledgeScope()` string constant mismatch | 🔴 High | Low | Any future caller skips silent translation, causes registry corruption |
| GAP-4 | `query_quickspecs` vs `query_notebooklm` tool name | 🟡 Medium | Low | Misleads engineers reading the Guardrail diagram |
| GAP-5 | Aspect 7 missing from workflow sequence diagram | 🟡 Medium | Low | Incomplete workflow documentation |
| GAP-6 | `/api/submit-feedback` vs `/api/feedback` endpoint name | 🟡 Medium | Low | Integration confusion |
| GAP-7 | Ranks 3/4 static config vs DNA-computed addons | 🟡 Medium | High | Ranks may collapse to 1 without config file |
| GAP-8 | SIM ↔ Aspects bidirectional misleading | 🟢 Low | Low | Clarification note needed |
| GAP-9 | `budget_optimizer.js` orphaned in barrel | 🟢 Low | Low | Dead code confusion |
| GAP-10 | No `fromCode` counterpart for macro orchestration | 🟢 Low | Medium | Documentation incompleteness |
| GAP-11 | `AllKeysExhausted` state missing from rotator diagram | 🟢 Low | Low | Incomplete state machine diagram |
| GAP-12 | Model name hardcoded, not `.env`-driven | 🟢 Low | Low | Flexibility & maintainability |

---

## 🛠️ Recommended Fix Order

```
Phase A (Code Fixes — Correctness):
  → GAP-3: Standardize classifyKnowledgeScope() return values
  → GAP-1: Replace static ragSecondOpinion with local RAG or pending markers
  → GAP-7: Verify strategy_addons.json exists + add DNA-driven fallback

Phase B (Diagram Fixes — Accuracy):
  → GAP-2: Update fromDocs/09 title + add Aspect 7 subgraph + fix 3 doc references
  → GAP-4: Update fromDocs/08 query_quickspecs → query_notebooklm
  → GAP-5: Add Aspect 7 to fromDocs/02 Stage 3 par block
  → GAP-6: Fix fromDocs/05 API endpoint label
  → GAP-11: Add AllKeysExhausted state to fromDocs/06

Phase C (Architecture Improvements):
  → GAP-12: Move MODEL_NAME to .env
  → GAP-9: Verify budget_optimizer.js usage or mark deprecated
  → GAP-10: Create fromCode/12_macro_orchestration_lifecycle.md
```

---

## 🔬 Graphify Semantic Graph Corroboration & New Findings

The live graph (2213 nodes, 3228 edges, 164 communities, built 2026-08-21) **confirms and extends** the analysis above with structural evidence.

---

### 📊 God Node Risk Analysis (Graphify: Lines 178–188)

The graph identifies 10 God Nodes — highly connected functions that act as cross-cutting bridges:

| Rank | God Node | Edges | Risk |
|---|---|---|---|
| 1 | `scripts` (npm scripts hub) | 49 | 🟡 Conceptual — not a code smell |
| 2 | `safeWriteJsonAtomic()` | 42 | 🟡 Intentional — all atomic writes MUST go through this |
| 3 | `cleanBaseSKU()` | 38 | 🔴 **Smell** — 38 callers means any regex change is a breaking change across all modules |
| 4 | `sendCommand()` (CDP) | 31 | 🟡 Expected — CDP is the scraper transport layer |
| 5 | `connectWS()` (CDP) | 29 | 🟡 Expected — same as above |
| 6 | `evaluatePhysicalMath()` | 25 | 🟡 Intentional — core evaluator entry point |
| 7 | `getOCATarget()` | 24 | 🟡 Expected — browser session resolver |
| 8 | `processPortalFeedback()` | 22 | 🔴 **Smell** — feedback function has 22 incoming callers; should be behind a service API |
| 9 | `classifyComponentRole()` | 22 | 🔴 **Smell** — used in 22 places including synthesizer, evaluator, and tests; any change breaks everywhere |
| 10 | `Workflows doc` | 22 | 🟢 Normal — doc is heavily referenced |

**Graph Confirms GAP-3**: `classifyComponentRole()` (22 edges) and `processPortalFeedback()` (22 edges) are architectural hubs that would propagate any taxonomy rename or API signature change instantly across 22+ call sites. This directly corroborates the taxonomy mismatch risk in GAP-3.

---

### 🔗 Surprising Connections (Graphify: Lines 190–200)

The graph detected 5 non-obvious inferred edges:

```
1. ScrapingHistorySection.jsx → scripts/mcp_server.js  [INFERRED - indirect_call]
2. RunHistoryTable.jsx        → scripts/mcp_server.js  [INFERRED - indirect_call]
3. EvaluationProgressSteps.jsx → scripts/lib/pipeline_logger.js  [INFERRED]
4. runChaosSuite()            → parseAndConsolidateBOQ()  [EXTRACTED]
5. test_dual_brain_fallbacks.js → evaluatePhysicalMath()  [EXTRACTED]
```

**New GAP-GRAPH-1 — React UI Components Have Inferred Coupling to MCP Server**  
`ScrapingHistorySection.jsx` and `RunHistoryTable.jsx` have *inferred* indirect calls to `scripts/mcp_server.js`. This is unexpected — React components should never have direct paths to the MCP server. These are likely via API calls through Express routes, but the inference suggests the abstraction boundary is too thin or implicit. Need to verify these are routed through `dashboard/routes/` and not bypassing the Express layer.

**New GAP-GRAPH-2 — Chaos Suite Calls `parseAndConsolidateBOQ()` Directly**  
`runChaosSuite()` in `tests/test_failure_modes_and_chaos.js` calls `parseAndConsolidateBOQ()` directly from `boq_evaluator.js`. This is correct for unit testing but the graph confirms that chaos tests bypass the full 6-stage pipeline (upload → preprocess → eval) — they jump straight to the evaluation layer. This is by design for speed but means chaos coverage does not cover Stage 1 and Stage 2 failure modes.

---

### 🏘️ Community Cohesion Issues (Graphify: Lines 805–826)

The graph flags several communities with dangerously **low cohesion scores** (below 0.10):

| Community | Cohesion | Issue |
|---|---|---|
| `Catalog Build Logic` (65 nodes) | 0.03 | Near-zero cohesion — 65 loosely related nodes thrown together |
| `NPM Scripts` (49 nodes) | 0.04 | NPM scripts hub is a flat list, not a module — expected |
| `Workflows doc` community | 0.08 | Documentation is too wide — referenced from everywhere |
| `BOQ Preprocessing` (27 nodes) | 0.08 | Preprocessing route handler mixed with unrelated imports |
| `Catalog Rules Engine` (25 nodes) | 0.07 | Rules engine tests mixed with DNA extractor and synthesizer |

**New GAP-GRAPH-3 — "Catalog Build Logic" Community is Too Large (65 nodes, cohesion 0.03)**  
With 65 nodes and 0.03 cohesion, this community is a **God Community** — the graph couldn't find meaningful internal structure. This typically means `scripts/lib/catalog_formatter.js`, `catalog_discovery.js`, `diff_catalog.js`, and parts of `generate_boq_xlsx.js` are too tightly mixed without clear domain separation. Suggest splitting into `catalog/format`, `catalog/diff`, and `catalog/discovery` sub-namespaces matching the `aspects/` and `conflict/` pattern already used.

---

### 🧩 Knowledge Gaps Found by Graph (Lines 805–808)

```
1374 isolated nodes (≤1 connection) — possible missing edges or undocumented components
13 thin communities (<3 nodes) — omitted from report
```

**New GAP-GRAPH-4 — 1374 Isolated Nodes**  
1374 nodes have ≤1 edge. While many are expected (ESLint config keys, package.json fields), this count is too large — it suggests a significant number of module exports are **not being imported anywhere** in the codebase. This corroborates GAP-9 (`budget_optimizer.js` isolation) and likely means several other utility functions exported from barrel files are dead code.

**Recommended action**: Run `graphify query "list orphaned exports"` to get a targeted list of unused exports.

---

### ✅ Graph Confirms These Are Fine (No New Issues)

| Area | Graphify Status |
|---|---|  
| Import Cycles | ✅ `None detected` — zero circular deps across 174 modules |
| `safeWriteJsonAtomic()` usage | ✅ Expected God Node — all 42 call sites are intentional |
| `GeminiKeyRotator` community | ✅ Well-isolated, cohesion 0.21 |
| `Resolution Matrix UI` community | ✅ Correctly grouped, cohesion 0.18 |
| `Feedback Queue Management` | ✅ `feedback_queue.js` has its own tight community |
| SSE Streaming path | ✅ `useSSEStream.js` community cohesion 0.70 — very tight |

---

## 🗺️ Final Unified Reconciliation Map (All 4 Layers)

```
                    Docs    fromDocs  fromCode  Live Code   Graph
GAP-1  (Fake RAG)     ✗        ✗         ✓         ✗          —
GAP-2  (6 vs 7 Aspects) ✗     ✗         —         ✓          —
GAP-3  (Scope names)   ✗      ✓         —         ✗       CONFIRMED
GAP-4  (Tool name)     ✓      ✗         —         ✓          —
GAP-5  (Stage 3 Asp7)  —      ✗         —         ✓          —
GAP-6  (API endpoint)  —      ✗         ✓         ✓          —
GAP-7  (Rank collapse) ✓      ✓         —         ✗          —
GAP-8  (SIM arrows)    —      ✗         —         ✓          —
GAP-9  (Dead code)     —      ✗         ✓         ✗       CONFIRMED (isolated node)
GAP-10 (No fromCode)   —      ✓         ✗         —          —
GAP-11 (State machine) —      ✗         —         ✓          —
GAP-12 (Hardcoded model) ✓    —         —         ✗          —
GRAPH-1 (UI→MCP coupling)     —         —         —       NEW FINDING
GRAPH-2 (Chaos skips stages)  —         —         —       NEW FINDING
GRAPH-3 (God Community)       —         —         —       NEW FINDING
GRAPH-4 (1374 isolated nodes) —         —         —       NEW FINDING
```

**Legend**: ✓ = correct here | ✗ = gap/missing here | — = not applicable
