# Intelligence Elevation, Modular Decomposition & Epistemic Hygiene Closure (2026-11-24)

## 1. Executive Summary
Following a repository-wide gap analysis spanning charter size/ambiguity, cyclomatic bloat across 6 monolithic orchestration files, inconsistent phase numbering, fabricated telemetry defaults, closed-loop reflection governance, and cross-domain solution reasoning, **Waves 1–5** (`INV-276`–`INV-280`) were implemented, hardened, and verified offline across unit, chaos, integration, domain, UI Vitest, and headless Playwright E2E suites.

- **Portfolio & Knowledge Scope (`2026-11-24`)**: **17 active live-scraped HPE product lines** (`7,024` catalog SKUs summed across products) + **2 quarantined legacy stubs** (`Alletra_Storage_System`, `GX5000_General_RACK`), **178** closed-loop knowledge deltas on disk, `SI-00`–`SI-10` offline benchmark **56/56 PASS** (`28/28` dev, `28/28` held-out across `28` scenario families, `0` false acceptances, `0` repair regressions), and **5/5** offline Playwright E2E suites verified (`tests/e2e/test_live_clic.js` remains excluded offline because Chrome CDP port `9222` currently holds an unauthenticated `OCAInternalLogin` page protected under `AGENTS.md` Section 5).
- **Per-Customer Tier 3 Boundary**: Live authenticated HPE OCA (`CLIC`) portal acceptance remains **`PORTAL VALIDATION PENDING`** for any customer BOM until a current manifest-bound Tier 3 portal receipt is recorded.

---

## 2. Wave 1 — Compact Charters, Single-Truth Metadata & Graphify Hygiene (`INV-276`)
1. **Charter Compaction Below Truncation Limits**:
   - Compacted root [`AGENTS.md`](../../AGENTS.md) (`13,606` bytes `< 16,384` B limit) and [`GEMINI.md`](../../GEMINI.md) (`5,639` bytes `< 14,336` B limit), resolving prior contradictions (`CC <= 30`, unified `~/.notebooklm-mcp-cli/chrome-profiles/<profile>` profile per `INV-269`, `17` active + `2` quarantined stubs).
   - Preserved chronological audit links in [`docs/audits/HISTORICAL_MILESTONES_INDEX.md`](HISTORICAL_MILESTONES_INDEX.md) and archived legacy Sept–Oct 2026 root planning/handoff documents under `docs/audits/archive/`.
2. **Indexed Invariant Lookup (`npm run docs:lookup`)**:
   - Added [`scripts/maintenance/lookup_invariant.js`](../../scripts/maintenance/lookup_invariant.js) to resolve `INV-<n>` entries or keyword topics directly from [`docs/INVARIANTS.md`](../INVARIANTS.md) without loading the full file into context.
3. **Purified Graphify Index & Real-Repo Forensics**:
   - Added [`.graphifyignore`](../../.graphifyignore) excluding `outputs/`, `*.xlsx`, `*.csv`, `*.tsv`, `*.pdf`, `docs/audits/archive/`, `.agents/teamwork/`, `tests/fixtures/`, `scratch/`, and `temp/` so spreadsheet cell noise cannot pollute `graphify-out/graph.json`, while maintaining `graphify-out/wiki/index.md`.
   - Rewrote [`.agents/FORENSIC_LEARNINGS.md`](../../.agents/FORENSIC_LEARNINGS.md) to cite exclusively verified modules and failure modes in this repository (Sections 1–8), and updated [`scripts/maintenance/generate_portfolio_status.js`](../../scripts/maintenance/generate_portfolio_status.js) + [`.agents/PORTFOLIO_STATUS.md`](../../.agents/PORTFOLIO_STATUS.md) to cleanly segregate the `17` active catalogs from the `2` quarantined legacy stubs.

---

## 3. Wave 2 — Modular `<800` LOC Seam Architecture & Tokenized CC Gate (`INV-277`)
Decomposed all 6 monolithic files into strict `<800` LOC facades delegating to focused `<800` LOC domain submodules (28 extracted submodules ranging from `21` to `789` LOC), preserving all backwards-compatible public exports and static AST `switch` structures required by `skill_workflow_registry.js`:

| Orchestration Facade | Final Facade LOC | Extracted Submodule Package | Submodule Count |
| :--- | :---: | :--- | :---: |
| [`scripts/evaluators/route_query.js`](../../scripts/evaluators/route_query.js) | `539` | `scripts/lib/router/` | `5` |
| [`scripts/lib/conflict/strategy_synthesizer.js`](../../scripts/lib/conflict/strategy_synthesizer.js) | `251` | `scripts/lib/conflict/ranks/` | `5` |
| [`scripts/lib/boq/boq_evaluator.js`](../../scripts/lib/boq/boq_evaluator.js) | `547` | `scripts/lib/boq/evaluators/` | `4` |
| [`scripts/evaluators/eval_boq.js`](../../scripts/evaluators/eval_boq.js) | `662` | `scripts/lib/boq/pipeline/` | `4` |
| [`scripts/lib/boq/bom_verifier.js`](../../scripts/lib/boq/bom_verifier.js) | `370` | `scripts/lib/boq/gates/` | `5` |
| [`scripts/catalogs/build_catalog.js`](../../scripts/catalogs/build_catalog.js) | `127` | `scripts/lib/catalog/builder/` | `5` |

- Hardened [`scripts/maintenance/analyze_complexity.js`](../../scripts/maintenance/analyze_complexity.js) (verified by [`tests/unit/test_complexity_analyzer_accuracy.js`](../../tests/unit/test_complexity_analyzer_accuracy.js)) to strip comments, string/template literals, and regex literals before brace-depth tracking, eliminate `else if (` double-counting, detect class/object methods accurately, and enforce `<= 30` CC across all production functions.

---

## 4. Wave 3 — Canonical 9-Phase Reasoning & Epistemically Honest Telemetry (`INV-278`)
- Unified `CANONICAL_EXECUTION_PHASES` (Phases 1–9) and `mapStageTimingsToCanonicalPhases` in [`scripts/lib/contracts/workflow_contract.js`](../../scripts/lib/contracts/workflow_contract.js), synchronized across `eval_boq.js`, `route_query.js`, [`scripts/lib/system/evidence_ledger.js`](../../scripts/lib/system/evidence_ledger.js), [`scripts/lib/system/reasoning_post_analyzer.js`](../../scripts/lib/system/reasoning_post_analyzer.js), [`scripts/lib/lifecycle/lifecycle_engine.js`](../../scripts/lib/lifecycle/lifecycle_engine.js), and [`scripts/maintenance/skill_workflow/golden_boq_artifacts.js`](../../scripts/maintenance/skill_workflow/golden_boq_artifacts.js).
- Hardened [`scripts/lib/system/telemetry.js`](../../scripts/lib/system/telemetry.js) (`v2.0.0`, verified by [`tests/unit/test_telemetry_epistemic_honesty.js`](../../tests/unit/test_telemetry_epistemic_honesty.js)):
  - Removed synthetic defaults (`1.0` confidence, synthetic percentage `stageBreakdown` splits, `'DL380 Gen12 SFF'` default chassis, hardcoded `33` rule counts) in favor of honest `null` / `'UNSPECIFIED_PLATFORM'` until measured.
  - Serialized disk writes under `withFileLock` + atomic JSON replacement (`fs_compat.js`) and isolated test-runner telemetry writes (`NODE_ENV === 'test'` / `NODE_TEST_CONTEXT`) to `_ephemeralTestStores` unless an explicit override file is supplied.
  - Added `recordRoutedQueryTelemetry`, p50/p95 durations, and learning-effectiveness counters (`learningEffectiveness`), wired null-safely across dashboard UI telemetry components (`TelemetryCard.jsx`, `KpiMetricsGrid.jsx`, `AccuracyProfilerPanel.jsx`, `EvaluationHistoryLedger.jsx`, `telemetry/modals/index.jsx`).

---

## 5. Wave 4 — Continuous Learning Promotion & Cross-Domain Reasoning (`INV-279`, `INV-280`)
- **Two-Lane Reflection & Regression-Gated Rule Promotion (`INV-279`)**:
  - [`scripts/lib/feedback/post_run_reflection.js`](../../scripts/lib/feedback/post_run_reflection.js) (`runPostExecutionReflection`) inspects deterministic aspect gaps, QuickSpecs RAG discrepancies, counterfactual repair wins, and uncataloged SKU misses while rejecting Tier-0 customer claim contamination (`INV-24`), atomically enqueueing deduplicated proposals into `outputs/history/learning/instruction_improvement_queue.json` and regenerating `.agents/ACTIVE_LEARNINGS_DIGEST.md`.
  - [`scripts/lib/feedback/instruction_promoter.js`](../../scripts/lib/feedback/instruction_promoter.js) + [`scripts/maintenance/promote_learned_instructions.js`](../../scripts/maintenance/promote_learned_instructions.js) (`npm run learn:promote`) promote only candidates with `>= 3` authoritative observations (`INV-225`) or verified portal/human receipts and roll back atomically on regression.
- **Composite Solution Containment (`Gate B25`, `INV-280`)**: [`scripts/lib/boq/composite_solution_validator.js`](../../scripts/lib/boq/composite_solution_validator.js) (`validateCompositeSolutionContainment`) checks multi-domain tenders (`Server` + `SAN` + `Alletra`/`Tape`) across `2N` SAN port budgets, transceiver optical speed/protocol compatibility, and 42U rack U-height + low-line/high-line PSU kW envelopes, emitting `UNKNOWN` whenever required denominators or optics are absent.
- **Day-2 Runway, Marginal Trade-Offs & VOI Intake Triage (`INV-280`)**:
  - [`scripts/lib/conflict/tradeoff_explainer.js`](../../scripts/lib/conflict/tradeoff_explainer.js) attaches nullable `day2Runway` headroom and `tradeOffVsBaseline` comparisons across `strategy_synthesizer.js` and `solution_comparator.js`.
  - [`scripts/lib/conflict/sizing/voi_clarification_ranker.js`](../../scripts/lib/conflict/sizing/voi_clarification_ranker.js) (`rankClarificationsByValueOfInformation`, `collectScopedIntakeTrapAdvisories`) ranks missing sizing inputs by CapEx/topology swing and surfaces platform-scoped intake advisories.
- **Expanded `SI-10` Benchmark (`56/56 PASS`)**: Verified in `outputs/history/solution_intelligence/si10_quality_evaluation_receipt.json` (`28` scenario families, `28/28` dev + `28/28` held-out, `0` false acceptances, `0` repair regressions, `100%` requirement disposition coverage).

---

## 6. Wave 5 — Regression, Performance & E2E Defect Closures
1. **Catalog Variant Identity Propagation ([`scripts/lib/catalog/catalog_discovery.js`](../../scripts/lib/catalog/catalog_discovery.js))**: Propagated `catalogProductId` from `chassis_base_skus_by_family_gen` onto `chassis_base_skus` inside `_ingestConfiguredChassisSections`, preventing raw CTO SKU strings (e.g. `P72176-B21`) from masquerading as product family IDs (`DL360_Gen12`).
2. **Historical Snapshot Index Cache ([`scripts/lib/catalog/sku_versioning.js`](../../scripts/lib/catalog/sku_versioning.js))**: Added stat-fingerprinted `snapshotIndexCache` (`MAX_SNAPSHOT_INDEX_CACHE = 128`, invalidated in `_clearCatalogPriceCache`) for `_readCurrentSkuDetails` and `_scanSnapshotOccurrences`, eliminating redundant multi-MB synchronous snapshot JSON parses/checksums per BOQ (measuring `evaluateBOQMultiAspect` latency improvement from `36,455 ms` / `1,173` sync reads down to `10,978 ms` / `560` sync reads in targeted profiling).
3. **Evaluator Serialization Trim ([`scripts/lib/boq/eval_output_serializer.js`](../../scripts/lib/boq/eval_output_serializer.js))**: Omitted raw `catalogData` and `catalogRules` blobs from `_buildNestedEvalResults`, reducing `__EVAL_RESULT_JSON__` / SSE payload size from `11.62 MB` to `~4.7 MB`.
4. **Playwright / Vite / Portal E2E Hardening**:
   - Made `workloadProfile.toString` non-enumerable in [`scripts/lib/boq/deal_optimizer.js`](../../scripts/lib/boq/deal_optimizer.js) so structured-clone RPC across Playwright `page.evaluate` never throws on function properties.
   - Added `'test_ui_opportunity_boq'` to `LONG_RUNNING_TEST_PATTERNS` in [`scripts/maintenance/run_test_matrix.js`](../../scripts/maintenance/run_test_matrix.js).
   - Synchronized test suites with shipped UI behavior (`INV-173`, `INV-274`, `INV-275`, `INV-128`): `#boq-file-input` health-policy mount wait (`BoqUploader.jsx`), React Portal `[role="dialog"]` scoping (so hidden `#root` text never shadows modal cards), `--production` static bundle serving (`dashboard/dist`), `Cooling / Thermal` co-located PSU provenance check (`tests/unit/test_phase4_scrape_coverage.js`), `Accessories & Infrastructure` workbook sheet verification (`tests/integration/test_excel_alignment_and_audit.js`), and `INV-274` drive-cage probe mock updates (`tests/unit/test_dxb_dl360_gen12_boq_remediation.js`).

---

## 7. Observed Verification Summary
- **UI Build & Vitest**: `npm.cmd run build` (`vite build` in `dashboard`) PASS; `npm.cmd test --workspace=dashboard` PASS (`14` Vitest files).
- **Domain Matrices & Core Contracts**: `test:core-contract` `28/28`, `test:domain:aspects` `28/28`, `test:domain:conflict` `23/23`, `test:domain:guardrail` `24/24`, `test:domain:catalog` `22/22`, `test:domain:sync` `21/21`, `test:domain:boq` `39/39`, `test:domain:scraping` `26/26` offline (`[27]` `tests/e2e/test_live_clic.js` skipped offline: requires authenticated HPE OCA configurator session on port `9222`, currently on `OCAInternalLogin`).
- **Offline Playwright E2E Suites (5/5 PASS)**:
  - `tests/e2e/test_e2e_downloads_boq_and_vendor_bom.js`: `9/9 PASS` (`0` console errors, `0` gaps).
  - `tests/e2e/test_dashboard_full_portfolio_e2e.js`: PASS.
  - `tests/e2e/test_ui_workflow_e2e.js`: PASS (`22` topology nodes, `0` console errors).
  - `tests/e2e/e2e_headless_ui_test.js`: `7/7 PASS` (`0` console errors, `0` workflow gaps).
  - `tests/e2e/e2e_customer_boq_flow.js`: `13/13 STEPS PASSED (100% SUCCESS)`.
- **Terminal Post-Edit Gates & Graphify**: Verified across final clean tree (`lint:all`, `lint:complexity`, `test:circular`, `test:deadcode`, `test:skills`, `test:charter`, `verify:graph`, `test:smoke`).
