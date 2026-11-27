# HPE ProLiant AI Studio — Master 8-Phase Dashboard Modernization, Wave B–F Closure, Code-Quality Ratchet & 3-Tier Agentic Blueprint

**Last Updated:** 2026-11-26  
**Git Baseline:** Branch `main` (`origin`: `https://github.com/vinodhsubramanian123/updatedVendorScrapingNotebook-v2.git`) at commit `0456ce8f` + partial working-tree progress  
**Current Repo Measurements (`5,206` functions across `482` files):**
- Dashboard Vitest: `15/15` files (`89/89` tests passing)
- `CC 1–15`: `4,425` (`85.0%`) | `CC > 20`: `347` legacy functions | `LOC > 80`: `132` legacy functions | `CC > 30`: `0` functions
- Dashboard Complexity Hotspots: `BoqUploader.jsx` (`CC: 30`, `173` LOC), `NotebookRagDrawer.jsx` (`CC: 30`, `198` LOC)
- Runtime Environment: `7` rotating `GEMINI_API_KEY`s in `.env` + local `agy.exe` at `C:\Users\latha\AppData\Local\agy\bin\agy.exe`

**Core Guiding Principles Approved by User:**
1. **World-Class Solution Intelligence & UX First (Zero Security Theater):** Personal local workstation tool — do NOT waste time or tokens on artificial multi-tenant security sandboxes or containment ceremony. Put 100% of engineering focus into **hardware/presales accuracy, zero-hallucination evidence, sleek Linear + Stripe UI/UX, live step-by-step agentic transparency, and rock-solid maintainability**.
2. **Tightened Agentic Maintainability Ratchet (`INV-287`):** Every new and edited function must obey **`CC <= 15` target (`CC <= 20` hard cap)**, **`LOC <= 80`**, and **`maxNesting <= 4`**, while freezing legacy `CC 21–30` / `LOC > 80` functions in a ratchet baseline (allowed to shrink, never allowed to grow, auto-pruned when refactored).
3. **3-Tier Autonomous Presales Execution (`INV-288`):** Fast Deterministic (`< 1s`) → Native Gemini Tool-Calling Copilot (7 rotating keys) → Automatic `agy` Deep Escalation whenever confidence `< 0.80` or gaps remain, to resolve supported customer requests and disclose gaps inside the dashboard.
4. **Release closure (`INV-111`):** After all automated gates and live `/browser` bug fixes pass, persist forensic learnings, invariants, skill registries, and Graphify AST updates, and perform any separately authorized Git release actions.

---

## Browser verification checkpoint

The walkthrough in [walkthrough.md](walkthrough.md) records browser findings, fixes, screenshots, and gate results for the current working tree. Use it as the latest checkpoint. The intake findings below were captured before the shell, routes, and Wave B–F views were implemented.

- Browser verification through 27 November 2026 passed 84 checks in Light and Dark at four viewport sizes. The six requested commands, both offline browser suites, and the maintainability ratchet passed. The dashboard suite finished at 98 tests.
- Corrected the platform comparison preset and canonical comparison renderer. Local NotebookLM fan-out now inherits the Studio’s local-only setting. Telemetry requests are cancelled when the view closes, and catalog status badges meet the contrast check.
- For the next acceptance pass, start at live provider verification and cross-vendor result review. Use a synthetic quote to exercise a parity gap, an unavailable provider, a cancelled escalation, and a follow-up. Record which provider executed and which evidence supported the answer. Portal validation remains pending until a current manifest-bound receipt is recorded.

- Fixed exact SKU search against nested catalog records and carried the selected part number into Catalog Explorer. Coverage includes `P73282-B21` and its captured list price.
- Added keyboard focus containment and Escape handling to the mobile navigation, feedback, and quarantine dialogs. The omnibox shortcut yields to open dialogs.
- Bound the timeline tier and tool activity to server events. Keep agent synthesis distinct from cited document evidence. Load Settings and NotebookLM panels on demand.
- Carry forward live provider acceptance. Exercise Gemini, Antigravity, and NotebookLM with synthetic input on a separately configured online instance. Verify tool policy, runtime containment, actual provider completion, and follow-up continuity before marking the online tier complete. An installed CLI and a mocked response are insufficient.
- A commit or push requires a directly requested release action. The current handoff is the working tree and verification artifacts.

## 0. Intake Working-Tree Audit

### Keep & Build Upon (Already in Working Tree, `89/89` Vitest Passing)
- **`App.jsx` Decomposition:** Shrunk `1,371` → `335` LOC via `AppDrawers.jsx`, `WorkspaceViews.jsx`, `useWorkspaceRuns.js`, and `workspaceRequests.js`.
- **2 Router Fixes (`scripts/lib/router/specialty_track_handlers.js`):** Unknown envelope platforms return `REQUIRES_HUMAN_CLARIFICATION` (tested in `test_hardware_envelope_solver.js`); `_handleSolutionComparison()` forwards `offline` policy into `coordinateMultiNotebookQueries()`.
- **Tab-Scoped Timeline Store (`executionTimeline.js` + `useSSEStream.js`):** Isolates SSE timeline state by `sessionStorage` owned run IDs (`boq.ownedRunId` / `presales.ownedRunId`).
- **One-Click Query Panel Wiring (`PresalesRequestPanel.jsx` + `RoutedOutcome.jsx` + `AgentConversationThread.jsx`):** `Enter` submit, *Run query* + *Preview route* buttons, mode selector, `omniboxRequest` prop, and updated `test_dashboard_browser_e2e.js`.

### 5 Bugs & Gaps in Partial Working Tree (Must Fix During Execution)
1. **Live Studio `HTTP 404` (`PresalesRequestPanel.jsx:82`):** Calls `POST /api/agent/query`, which does not exist until `dashboard/routes/agent.cjs` is created and mounted in `dashboard/server.cjs`.
2. **8 Schema Mismatches in `HardwareEnvelopeView.jsx`:** Reads nonexistent `storageAndPower`, `categoryBounds`, `gpu.maxDoubleWide`/`maxSingleWide`, `memory.maxDimms`/`maxMemoryTb` instead of real `hardware_envelope_solver.js` fields (`storage`, `power`, `catalogSubcategoryBounds.subcategories`, `gpu.maxDoubleWideGpus`, `memory.maxDimmsChassis`, `catalogRuleMetrics`).
3. **Incomplete `SolutionComparisonView.jsx`:** Missing `tradeOffVsBaseline`, `multiNotebookGrounding` provenance, and `CROSS_VENDOR_TRANSFORMATION` fields (`sourceVendor`, `targetChassis`, `parityGaps` with `GAP_IDENTIFIED` / `UNMAPPED` / `NOT_EVALUATED`).
4. **Unstyled Prototype Elements & Missing Omnibox Wiring:** `AgenticExecutionTimeline.jsx` uses bare native `<details>`/`<progress>`; `PresalesRequestPanel.jsx:437` has an unstyled `<select>`; `App.jsx` hasn't mounted `Sidebar.jsx`, `CommandOmnibox.jsx`, or `omniboxRequest` state yet.
5. **Unstarted Tracks:** Phase 1 (UX skill + Light/Dark CSS tokens), Phase 2 (Complexity Ratchet + `CC <= 15` refactors), Phase 3 (6 Wave B–F Express routes + `route_query.js` SSE hooks + `evalNormalizer.js`), Phase 4 (`presales_copilot_agent.js` + `agy_escalation_bridge.js` + `agent.cjs`), Phase 6 (Catalog/Portfolio/Matrix/Topology/Settings/Telemetry Wave B–F views), Phase 7 (11 gates + `/browser` QA), and Phase 8 (Learnings + Git Commit & Push).

---

## 1. Verified Backend Schemas (Exact Field Names)

- **`computeFullPlatformEnvelope()` (`scripts/lib/rules/hardware_envelope_solver.js`):**
  - `platformId`, `domain`, `formFactor`
  - `cpu`: `{ minSockets, maxSockets, maxAirCooledTdpWatts, ... }`
  - `pcie`: `{ baseMechanicalSlots, maxMechanicalSlots, maxElectricallyActiveSlots, maxX16Slots, riserCombinations[] }`
  - `ocp`: `{ minSlots, maxSlots, rules }`
  - `gpu`: `{ minGpus, maxSingleWideGpus, maxDoubleWideGpus, maxRecommendedForTarget, catalogReportedMaxQty, requiresAuxiliaryPowerCables, minPsuCountForMaxGpu, requiresHighLine220vAboveTdpWatts, thermalAmbientGatesCount }`
  - `memory`: `{ generation, cpuCountConsidered, maxSockets, channelsPerSocket, maxDimmsPerChannel, minDimmsPerSocket, maxDimmsPerSocket, maxDimmsChassis, maxDimmsForCurrentCpus, validBalancedTotalDimms, maxDimmCapacityGb, maxMemoryCapacityTb, speedDeratingNotice }`
  - `storage`: `{ minDrives, maxSffDrives, maxLffDrives, maxEdsffDrives, controllerDirectPortOptions, requiresExpanderAboveDirectPorts, alletraVariants }`
  - `power`: `{ minPsusPerNode, recommendedRedundantPsus, maxPsusPerNode, validPsuCounts, supportsDc48V, highLineRequiredAboveWatts }`
  - `catalogRuleMetrics`: `{ totalRules, conditionalAndThermalGates }`
  - `catalogSubcategoryBounds`: `{ categoryKey, minQty, maxQty, subcategories[] }`
- **`solveBuildableConfiguration()` (`scripts/lib/conflict/buildable_graph_solver.js`):**
  - `{ status, isBuildable, manifestSha256, cycles, contradictions, repairsApplied, remainingErrors, remainingMissingDependencies, lifecycleBlockers, ruleAuditSummary: { evaluatedRulesCount, violationsCount } }`
- **Comparison & Cross-Vendor (`solution_comparator.js` & `rfp_and_reconciliation_handlers.js`):**
  - `comparedPlatforms`, `comparisonMatrix[]` (`day2Runway`, `tradeOffVsBaseline`, `disqualifiedReasons`, `catalogCoverageGaps`), `unresolvedPlatforms`, `omittedPlatforms`, `multiNotebookGrounding`, `portalValidationStatus`
  - `sourceVendor`, `targetChassis`, `competitorSpec`, `parityGaps[]` (`GAP_IDENTIFIED` | `UNMAPPED` | `NOT_EVALUATED`), `candidateBom[]`, `auditReport`

---

## 2. Master 8-Phase Execution Plan

### Phase 1 — Enterprise Dashboard UI/UX Skill, Skill Registry Parity & Unified Light/Dark Design System
1. **[NEW] `.agents/skills/enterprise-dashboard-ux-skill/SKILL.md`**:
   - Linear + Stripe + Vercel SaaS craft standard: collapsible `240px`/`64px` sidebar, `56px` command bar with `⌘K`/`/` omnibox, 8pt spacing grid, `Geist Sans` + `Geist Mono` with `tabular-nums`, Light (`:root`) & Dark (`[data-theme="dark"]`) semantic surface/border/text tokens, HPE Emerald (`#01A781`) accent, `120–350ms` GPU transitions (`prefers-reduced-motion: reduce`), WCAG 2.2 AA contrast & focus rings, live agentic step/log/escalation UX, epistemic status badges, and `CC <= 15` / `LOC <= 80` / `nesting <= 4` component rules.
2. **[MODIFY] `.agents/skills/design-taste-frontend/SKILL.md`, `AGENTS.md`, & `scripts/config/skill_workflow_registry.js`**:
   - Cross-link dashboard tasks from `design-taste-frontend` to `enterprise-dashboard-ux-skill`.
   - Register `enterprise-dashboard-ux-skill` in `AGENTS.md` (40 skills) AND in `scripts/config/skill_workflow_registry.js` (`kind: 'ENGINEERING'`) so `npm run test:skills` passes `100%`.
3. **[NEW] `dashboard/src/hooks/useTheme.js`**:
   - Persists `'light' | 'dark'` in `localStorage` (with `try/catch` fallback), defaults to Light mode while respecting explicit OS/saved preference toggle, updates `document.documentElement.dataset.theme` and `style.colorScheme`.
4. **[MODIFY] `dashboard/src/styles/index.css`** & **[DELETE] `dashboard/src/index.css`, `dashboard/src/App.css`**:
   - Consolidate all CSS into `dashboard/src/styles/index.css` with `:root` (Light) and `[data-theme="dark"]` (Dark) tokens (`--surface-canvas`, `--surface-panel`, `--surface-elevated`, `--surface-subtle`, `--border-subtle`, `--border-default`, `--text-primary`, `--text-secondary`, `--text-muted`, high-contrast status badges).
   - Remove hardcoded `color-scheme: light !important; background-color: #ffffff !important` on `<select>`/`<option>` so native dropdowns adapt cleanly to Light & Dark themes.

### Phase 2 — World-Class Maintainability Ratchet (`INV-287`) & Hotspot Decomposition (`CC <= 15`)
1. **[MODIFY] `scripts/maintenance/analyze_complexity.js`** + **[NEW] `scripts/config/complexity_ratchet_baseline.json`**:
   - Add control-flow nesting depth calculation (`maxNesting` across `if`, `for`, `while`, `switch`, `try`/`catch` blocks — ignoring flat object/JSX braces and `a ?? b ?? c` chains).
   - Enforce **3-Dimensional Quality Gate** for all new and edited functions (`--ratchet` mode, enabled in `npm run lint:complexity`):
     - **Cyclomatic Complexity:** Target `CC <= 15` (advisory `16–20`), **hard fail `CC > 20`** (unless in ratchet baseline at `<= recordedCC`, never `> 30`).
     - **Function Length:** **Hard fail `LOC > 80`** (unless in ratchet baseline at `<= recordedLOC`).
     - **Control-Flow Nesting:** **Hard fail `maxNesting > 4`** (unless in ratchet baseline at `<= recordedNesting`).
   - Support `--write-baseline` / `--prune-baseline` so refactored functions (starting immediately with `BoqUploader` and `NotebookRagDrawer`!) are removed from the legacy allowlist permanently.
   - Keep `analyzeFile()`, `stripNonCodeLiterals()`, and `runAnalysis()` return shapes 100% compatible with `test_complexity_analyzer_accuracy.js` & `test_circular_and_complexity.js`, and add new unit tests for `maxNesting` + ratchet enforcement.
2. **[MODIFY] `package.json` & `.agents/skills/code-quality-gate-skill/SKILL.md`**:
   - Update `lint:complexity` to enforce `--fail-on-breach --max-cc=20 --max-loc=80 --max-nesting=4 --ratchet` and document the new ratchet standard in `code-quality-gate-skill`.
3. **[NEW] `dashboard/src/hooks/useBoqUploader.js`** + **[MODIFY] `dashboard/src/components/BoqUploader.jsx`**:
   - Extract preprocessing, split confirmation, and direct evaluation hooks so `BoqUploader()` drops from `CC: 30, LOC: 173` → `CC <= 12, LOC <= 70`.
4. **[NEW] `dashboard/src/components/rag/RagResultCard.jsx` & `MultiNotebookPanel.jsx`** + **[MODIFY] `dashboard/src/components/NotebookRagDrawer.jsx`**:
   - Remove duplicate `Escape` `useEffect` (L304–319), replace raw `fetch()` with `requestJson()` + `AbortController`, add *Multi-Notebook Fan-Out* tab (`POST /api/multi-notebook-query`), and drop `NotebookRagDrawer()` from `CC: 30, LOC: 198` → `CC <= 14, LOC <= 75`.

### Phase 3 — Express Wave B–F APIs, Live SSE Milestones & `evalNormalizer` Closure
1. **[MODIFY] `scripts/evaluators/route_query.js` & `dashboard/routes/evaluation.cjs`**:
   - Add optional `context.onProgress` / `context.onLog` callbacks in `_executeLegacyRoutedQuery()` emitting 5 canonical progress milestones (`15%` Classify → `35%` Scope/Manifest → `65%` Domain Engine → `85%` Acceptance Gate → `100%` Phase 9 Reasoning).
   - Wire into `POST /api/query/route` via `broadcastSSE` and persist query trace logs to `outputs/history/runs/<runId>.json`.
2. **[MODIFY] `dashboard/routes/catalogs.cjs`**:
   - `GET /api/platform-envelope`: validates `platformId`, returns `computeFullPlatformEnvelope()` + `pcieAndOcp`, `gpuTopology`, `memoryEnvelope`.
   - `GET /api/product-manifests`: returns all 17 Zod-validated manifests from `loadAllProductManifests()`.
   - `GET /api/vendor-adapters`: returns `listVendorAdapters()` (`HPE`, `DELL`, `HUAWEI`, `CISCO`, `LENOVO`).
   - `GET /api/global-search?q=&limit=`: fast cached cross-17-catalog SKU, product, and manifest search.
3. **[MODIFY] `dashboard/routes/notebook.cjs`**:
   - `GET /api/config/model-routing`: serves `model_routing.json` tiers + active Prompt `v4` + `geminiKeysConfigured` count.
   - `POST /api/multi-notebook-query`: runs `coordinateMultiNotebookQueries()` respecting offline policy.
4. **[MODIFY] `dashboard/src/services/evalNormalizer.js`**:
   - Propagate `closureStatus` (`closureVerified`, `status`, `manifestSha256`, `ruleAuditSummary`, `cycles`, `contradictions`, `lifecycleBlockers`, `repairsApplied`) and `guardrailMeta` (`promptVersion`, `activeTier`, `model`, `negationGuardApplied`, `ambientGateChecked`, `tdpGateChecked`), plus `CLOSURE VERIFIED` / `CLOSURE BLOCKED` and `PORTAL VALIDATION PENDING` badges.

### Phase 4 — 3-Tier Autonomous Agentic Copilot & Practical `agy` Escalation (`POST /api/agent/query`)
1. **[NEW] `scripts/lib/rag/presales_copilot_agent.js`** *(Tier 2 — Native Gemini Tool-Calling Copilot)*:
   - Reuses `gemini_rotator.js` (7 rotating keys) + `guardrail_transport.js` + `model_routing.json` (`reasoning_deep` / `synthesis_structured`), bounded to `maxTurns = 6` with `AbortSignal`.
   - Read-only **Presales Tool Belt**: `search_all_catalogs`, `compute_hardware_envelope`, `inspect_product_manifest`, `compare_solutions_or_vendors`, `run_rfp_sizing`, `evaluate_boq_and_closure`, `query_notebooklm_quickspecs`.
   - Streams `onStep`, `onToolCall`, `onToolResult`, `onLog` live over SSE; computes honest `confidence` from real tool coverage/gaps and sets `needsDeepEscalation = true` when `confidence < 0.80`, unresolved multi-domain gaps remain, or Gemini keys are exhausted/unavailable.
2. **[NEW] `scripts/lib/rag/agy_escalation_bridge.js`** *(Tier 3 — Practical Antigravity `agy` Escalation)*:
   - Lightweight binary check (`checkAgyAvailability()`) + spawns `agy --print --output-format stream-json --mode plan` (read-only plan mode + concise presales prompt to answer using repo catalogs/solvers/NotebookLM without modifying files), with `--conversation <id>` for multi-turn follow-ups and `AbortSignal` cancellation.
   - Parses NDJSON lines into clean SSE `PROGRESS`, `TOOL_CALL`, `TOOL_RESULT`, `LOG` events and final structured answer.
3. **[NEW] `dashboard/routes/agent.cjs`** (mounted in `dashboard/server.cjs`):
   - `GET /api/agent/runtime-status` & `POST /api/agent/query` (`SMART_AUTO` | `DETERMINISTIC` | `GEMINI_AGENT` | `AGY_DEEP`), orchestrating Tier 1 → Tier 2 → Tier 3 Auto-Escalation, streaming live SSE events, respecting `OFFLINE_MODE` (Tier 1 only when offline), and persisting run traces + session turns.

### Phase 5 — Linear + Stripe App Shell, Unified Omnibox (`⌘K`/`/`) & Studio Bug Fixes
1. **[NEW] `dashboard/src/components/layout/Sidebar.jsx`**:
   - Collapsible `240px` / `64px` icon rail + `< 1024px` mobile drawer with 3 groups:
     - *Workspace:* Presales Studio (`orchestrator`), Resolution Matrix (`matrix`), Partner Reconciliation (`reconciliation`)
     - *Catalog & Specs:* Catalog Explorer (`catalog`), Portfolio & Manifests (`portfolio`), Artifacts & Audit (`artifacts`)
     - *System & Ops:* Agentic Insights (`telemetry`), Pipeline Ops (`pipeline`)
   - Footer actions: Quarantine Vault, HITL Feedback, Settings, Collapse toggle.
2. **[NEW] `dashboard/src/components/layout/CommandOmnibox.jsx`**:
   - `⌘K` / `/` omnibox in the `56px` Top Bar: live debounced cross-17-catalog search (`/api/global-search`) + `Enter` one-press customer query execution (`omniboxRequest` → Presales Studio) + Quick Jump commands.
3. **[MODIFY] `dashboard/src/components/Header.jsx`, `dashboard/src/App.jsx`, `WorkspaceViews.jsx`, `AppDrawers.jsx`**:
   - Single-line `56px` Top Bar with breadcrumb, `CommandOmnibox`, `CdpHealthBadge`, `NotebookLmHealthBadge`, Agent Tier pill, and Light/Dark theme toggle. Wire `omniboxRequest` and promoted `reconciliation` / `portfolio` views.
4. **[FIX & POLISH] Studio Views (`HardwareEnvelopeView.jsx`, `SolutionComparisonView.jsx`, `AgenticExecutionTimeline.jsx`, `PresalesRequestPanel.jsx`, `AgentConversationThread.jsx`):**
   - Fix all 8 field-name mismatches in `HardwareEnvelopeView.jsx` to match exact `computeFullPlatformEnvelope()` output.
   - Upgrade `SolutionComparisonView.jsx` with `tradeOffVsBaseline`, `multiNotebookGrounding` provenance, and Cisco/Dell/Lenovo/Huawei `parityGaps` (`GAP_IDENTIFIED` / `UNMAPPED` / `NOT_EVALUATED`).
   - Upgrade `AgenticExecutionTimeline.jsx` with visual phase cards, tier & auto-escalation badges, expandable tool summaries, filterable monospace SSE console, elapsed timer, cancel button, and Dark/Light tokens.

### Phase 6 — Full Wave B–F Integration Across Catalog, Portfolio, Matrix, Topology, Settings & Telemetry
1. **Catalog & Portfolio:** Add *Hardware Envelope* tab in `CatalogExplorer.jsx` + `CatalogFilterBar.jsx`; *Capability Manifest* inspector in `RulesConfiguration.jsx`; *17 Zod Manifests + 5 Vendor Adapters* banner & quick Envelope button in `ChassisPortfolioTable.jsx`.
2. **Closure Graph & Rule IR:** Surface `closureVerified`, `manifestSha256` digest, evaluated rules count, cycle/contradiction diagnostics, lifecycle blockers, and auto-repairs across `ConflictGraphInspector.jsx`, `RuleLogicVisualizer.jsx`, `matrix/RankCard.jsx`, `matrix/MatrixStatusBanners.jsx`, and `topology/BoqTopologyModal.jsx`.
3. **Model Routing, Prompt v4 & Escalation Settings:** Add tabbed *Gemini Model Routing & Escalation* + *Appearance* in `SettingsDrawer.jsx`; surface Prompt `v4`, active tier model, negation-guard, and `AMBIENT_GATE`/`TDP_GATE` status in `GuardrailReviewStatus.jsx` & `NlmHealthTelemetry.jsx`.

### Phase 7 — All 11 Automated Gates & Live 4-Viewport `/browser` QA + Bug-Fix Loop
1. **Unit, Component & Route Tests:** Add tests for `analyze_complexity.js` ratchet/nesting, `presales_copilot_agent.js`, `agy_escalation_bridge.js`, all new Express routes, `useTheme`, `Sidebar`, `CommandOmnibox`, `HardwareEnvelopeView` (exact backend schema!), `SolutionComparisonView`, `AgenticExecutionTimeline`, `MultiNotebookPanel`, and `evalNormalizer`.
2. **Execute All 11 Repo Verification Gates (Zero Failures / Zero Warnings):**
   - `npm --prefix dashboard test -- --run`
   - `npm run test:smoke`
   - `npm --prefix dashboard run build`
   - `npm run lint:all` (`0` oxlint warnings)
   - `npm run lint:complexity` (`CC <= 20`, `LOC <= 80`, `maxNesting <= 4` on all new/edited functions; `0` ratchet regressions; `BoqUploader` & `NotebookRagDrawer` pruned from legacy allowlist)
   - `npm run test:circular` (`0` module cycles)
   - `npm run test:deadcode` (`0` unreachable modules)
   - `npm run test:skills` (`40/40` skills verified)
   - `node scripts/maintenance/test_dashboard_browser_e2e.js`
   - `node tests/e2e/test_dashboard_full_portfolio_e2e.js`
   - `npm run update:graph && npm run verify:graph`
3. **Live `/browser` 4-Viewport Walkthrough (`1440×900`, `1024×768`, `768×1024`, `390×844` in Light & Dark):**
   - Exercise every navigation section, sidebar collapse, mobile drawer, Light/Dark toggle, `<select>` dropdowns, Omnibox cross-17-catalog search + one-press query launch, route preview vs single-fire run, live `AgenticExecutionTimeline` + SSE logs + cancel, Hardware Envelope view, Cross-Vendor Comparison, Multi-Notebook RAG, Matrix Closure badges, and Settings Model Routing.
   - Fix every visual, console, network, or UX defect found, re-run affected gates, and record screenshots + receipts in `docs/plans/walkthrough.md`.

### Phase 8 — Final Learnings, Charter and Release Evidence
1. **Forensic Learnings & Knowledge Capture:**
   - Append verified engineering learnings to `.agents/FORENSIC_LEARNINGS.md` and update `.agents/ACTIVE_LEARNINGS_DIGEST.md` (covering schema-contract verification before UI binding, the 3D maintainability ratchet `CC <= 20 / LOC <= 80 / nesting <= 4`, and 3-tier autonomous presales escalation).
2. **Invariants, Charters & Closure Audit:**
   - Codify **`INV-287`** (*3-Dimensional Agentic Maintainability Ratchet: `CC <= 20`, `LOC <= 80`, `maxNesting <= 4`*) and **`INV-288`** (*3-Tier Autonomous Dashboard Presales Runtime & Wave B–F UI Parity*) in `docs/INVARIANTS.md`.
   - Synchronize `AGENTS.md` and `GEMINI.md` headers/contracts (`40/40` skills, ratcheted complexity gate, 3-tier dashboard runtime).
   - Write `docs/audits/2026-11-26-dashboard-modernization-and-agentic-studio-closure.md` and link in `docs/audits/HISTORICAL_MILESTONES_INDEX.md`.
3. **Final graph and gate verification:**
   - Run `npm run update:graph && npm run verify:graph && npm run test:skills && npm run lint:all && npm run lint:complexity`.
   - Audit `git status` for transient artifacts. Carry the verified diff forward for a separately authorized release.

---

## 3. Recommended Parallel Execution Split (On "Go")

- **Worker 1 (Design System, UX Skill & App Shell):** Phase 1 + Phase 5 Shell (`enterprise-dashboard-ux-skill`, `skill_workflow_registry.js`, Light/Dark `styles/index.css`, `useTheme.js`, `Sidebar.jsx`, `CommandOmnibox.jsx`, `Header.jsx`).
- **Worker 2 (Complexity Ratchet & Hotspot Refactors):** Phase 2 (`analyze_complexity.js` 3D ratchet + `complexity_ratchet_baseline.json`, `useBoqUploader.js`, `NotebookRagDrawer` + `RagResultCard` + `MultiNotebookPanel`).
- **Worker 3 (Backend Wave B–F Routes & 3-Tier Agentic Runtime):** Phase 3 + Phase 4 (`route_query.js` SSE hooks, `evaluation.cjs`, `catalogs.cjs`, `notebook.cjs`, `evalNormalizer.js`, `presales_copilot_agent.js`, `agy_escalation_bridge.js`, `dashboard/routes/agent.cjs`).
- **Worker 4 (Studio Bug Fixes & Wave B–F UI Views):** Phase 5 Studio fixes + Phase 6 (`HardwareEnvelopeView` 8 schema fixes, `SolutionComparisonView`, `AgenticExecutionTimeline`, Catalog/Portfolio/Matrix/Topology/Settings/Telemetry).
- **Coordinator (Integration, 11 Gates, `/browser` QA, Learnings & Release Evidence):** Wire `App.jsx` & `server.cjs`, pass all 11 gates, execute 4-viewport Light/Dark `/browser` QA & bug fixes, complete Phase 8 learnings/charters/invariants, and hand off the verified working tree.
