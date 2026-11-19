# SI-00 Baseline & Ownership Reconciliation Register

Date: 19 November 2026  
Baseline Commit (`HEAD`): `329ec34ee32a350a1134b57c8faa270695974d07` (`feat(intelligence): codify INV-243 blindspot scanner, support/COM parity, cross-solution pricing, and Dell/Huawei attribute BOM mapping`)  
Executor / Author: Antigravity (Execution Lead)  
Runtime Environment: Windows (`v24.19.0`), package `booktoskill-hpe-oca-scraper@1.1.0`

## 1. Environment, Graphify & Static Gate Baseline (Verified Pre-Edit)

| Check / Artifact | Observed Result | Notes / Hash |
|---|---|---|
| `git status --short` (before SI-00) | Only `docs/audits/2026-11-19-solution-intelligence-end-to-end-implementation-plan.md` untracked | Working tree otherwise clean on `329ec34e` |
| `npm.cmd run update:graph && npm.cmd run verify:graph` | **RESTORED & CERTIFIED** | `graphify-out/graph.json` rebuilt: `14,071` nodes, `27,049` edges, `776` communities; `34` skills connected (`0` isolated, `0` ad-hoc scripts). SHA-256: `5292553d19cee974b52e5da295ed6031abfa37b7f154b82662c81d604affc6cf` |
| `npm.cmd run test:smoke` | **8/8 PASSED** (`16.55s`) | Isolated matrix clear |
| `npm.cmd run test --workspace=dashboard` | **13 files / 74 tests PASSED** (`23.28s`) | Vitest clean |
| `npm.cmd run lint:all` | **0 warnings, 0 errors** (`246ms`, `721` files, `95` rules) | `oxlint` |
| `npm.cmd run lint:complexity` | **0 breaches** (`> 30 CC`: `0` / `3,685` functions across `399` files; `151` functions at `CC 26–30`) | Strict ceiling `<= 30` |
| `npm.cmd run test:circular` | **0 circular dependencies** (`717` files) | Clean DAG |
| `npm.cmd run test:deadcode` | **PASSED** (`718` files, `139` roots, `177` lib modules, `4` allowlisted orphans) | `INV-242` active |
| `npm.cmd run test:skills` | **34/34 PASSED** (`244` known INV refs, `2178` known SKUs) | `validate_skills_integrity.js` |
| `validate_skill_workflow_registry.js` | **VALID** (`34` capabilities, `18` router intents, `0` unmapped, `0` issues) | Source fingerprint `17108d1c2c54899afff2cc28db9892e31f4c95c87a99727a9f5ab1dedd2d8c17` |
| `npm.cmd run audit:blindspots` | Executed (`17` products, `89` findings: `HIGH=6, MEDIUM=38, LOW=45`) | Observed baseline (`Alletra_Storage_System`, `GX5000_General_RACK`, `DL145_Gen11`–`Synergy_*`) |

### Configuration & Catalog Fingerprints (`329ec34e`)
- `scripts/config/notebooks.json`: `9c0b1bf334e9642e2cacffbb10bd509858374cea5817a3a51b90674c6ef2b493`
- `scripts/config/chassis_map.json`: `fd91254e1171cf444d9dccddc9a8025bd0a36ff9cb4143b9adbc2a79ab25e29f`
- `scripts/config/skill_workflow_registry.js`: `87ba729654d994b9f8326126b8a1804d42e71b0040711c28984f81386d577128`
- Active product `*_Catalog.json` files (excluding `.promotion.*.previous` snapshots): `17` canonical product directories across `Alletra`, `Cray`, `ProLiant` (`Gen11`, `Gen12`), `SAN`, `StoreEver`, and `Synergy`.

---

## 2. Historical Checkpoint Reconciliation (CP6–CP18 vs Actual `329ec34e` Source)

The 2026-10-04 ledger (`docs/audits/2026-10-04-skill-workflow-checkpoint-ledger.md`) ended at Session `5.45` (`2026-10-09`), whereas subsequent `INV-179` through `INV-243` commits landed through November 2026. Reconciled against current source on `329ec34e`:

| Checkpoint | Ledger Status (`2026-10-09`) | Actual `329ec34e` Code Disposition | Evidence / Residual Gap |
|---|---|---|---|
| **CP4 / CP5** | `VERIFIED_INDEPENDENT` (unused) | **IMPLEMENTED_UNUSED** (`skill_workflow_registry.js` has `activation: 'UNUSED'`, `0` runtime consumers; `bom_verifier.js` retains 6 legacy + 3 lazy exports) | Registry parity updated (`34/34` skills, `18` router intents), still declarative only (`SI-09`) |
| **CP6 / CP6r** | `VERIFIED_INDEPENDENT` (`CP6r`); `CP6b` pending | **PARTIALLY_ACTIVE** (`workflow_lease.js` active; `telemetry_measurement_store.js` still in `ORPHAN_ALLOWLIST` with `0` production consumers) | Telemetry population isolation & store wiring remain (`SI-01`, `SI-10`) |
| **CP7 (`a/b/c`)** | `IN_PROGRESS` (`CP7a` verified unused; `CP7b` integrated behind `PRESALES_QUERY_SHADOW=1`; `CP7c` off) | **SHADOW_OPT_IN_ONLY** (`executeRoutedQuery` calls `_executeLegacyRoutedQuery`; `PRESALES_QUERY_SHADOW=1` runs `presales_query_shadow.js`; `_attachQueryPlanIfAvailable` attaches non-enumerable `queryPlan`) | Compound dispatch & planner governance open (`SI-05`) |
| **CP8 (`a/b`)** | `IN_PROGRESS` (`CP8a` closed; `CP8b` quantity fixes) | **ACTIVE_CONSERVATION_AND_CLUSTERS** (`multi_cluster_splitter.js`, `configuration_context.js`, `_evaluatePartitionedClusters` active; `eval_multi_boq.js` wired) | Per-group requirement dispositions open (`SI-02`, `SI-05`) |
| **CP9 (`a–e`)** | `NOT_STARTED` in ledger summary; Session 5.45 implemented continuations | **IMPLEMENTED_PARTIAL** (`route_query.js` has `_continueOcrDownstreamIfRequested`, `_handleWorkloadDna` `dnaProfile`, `_handleCrossVendorTransformation` + `attribute_equivalence_mapper.js`, `_handleHeterogeneousTenderModernization`) | Compound order/exclusions/requirement preservation open (`SI-02`, `SI-05`, `SI-06`) |
| **CP10 (`a/b`)** | `NOT_STARTED` in ledger summary; Session 5.44–5.45 delivered nullable pricing + `scrutinizeCandidateBOM` | **IMPLEMENTED_PARTIAL** (`budget_optimizer.js` preserves `null` pricing + `cross_solution_pricing.js` added; `adversarial_agent.js:scrutinizeCandidateBOM` separated from chaos) | Qualifying hard requirements & evidence basis for trade-offs open (`SI-06`) |
| **CP11 (`a/b`)** | `IN_PROGRESS` | **IMPLEMENTED_ACTIVE** (`canonical_terminal_owner.js`, `evidence_ledger.js` 9-phase lifecycle, `taskManager` + SSE snapshot, `eval_output_serializer.js` integrity binding) | Single shared decision projection across presenters open (`SI-01`, `SI-07`) |
| **CP12 (`a–c`)** | `NOT_STARTED` in ledger summary; Session 5.45 + `INV-231`/`242` delivered governance | **IMPLEMENTED_PARTIAL** (`feedback_loop.js`, `active_knowledge_router.js`, `quarantined_deltas.js` scope-aware dedup & append-only retraction active) | Cross-artifact dependency index invalidation & fresh-process applied-effect telemetry open (`SI-08`) |
| **CP13–CP16** | `NOT_STARTED` in ledger summary; Session 5.45 + `INV-240`/`243` implemented adapters | **IMPLEMENTED_MULTI_VENDOR_ADAPTERS** (`hpe`, `dell`, `huawei`, `lenovo`, `vendor_x` policy/adapters + `attribute_vectors.js`; `vendor_x_adapter.js` allowlisted orphan) | Typed constraints & vendor-neutral predicate parity open (`SI-04`) |
| **CP17 / CP18** | `NOT_STARTED` in ledger summary; Nov `INV-229`–`243` closed CC<=30 & E2E | **PARTIALLY_SUPERSEDED** (`CC <= 30` across 399 files, clean DAG, `test:deadcode`, Playwright release gate; held-out 24-family SI quality matrix not yet built) | Superseded by `SI-10` held-out & release gates |

---

## 3. Canonical Entrypoints Map (`329ec34e`)

- **CLI / Evaluators (`181` scripts in `package.json`)**:
  - `scripts/evaluators/eval_boq.js` (`runEvaluationPipeline`, `eval:boq`)
  - `scripts/evaluators/eval_multi_boq.js` (`eval:multi`)
  - `scripts/evaluators/route_query.js` (`executeRoutedQuery`, `classifyQueryIntent`, `route:query`)
  - `scripts/evaluators/adversarial_agent.js` (`adversarial:redteam`)
  - `scripts/lib/boq/generate_boq_xlsx.js` (`boq:export`)
  - `scripts/lib/boq/vendor_bom_verifier.js` (`reconcile:bom`)
  - `scripts/lib/boq/multi_cluster_splitter.js` (`tender:split`)
  - `scripts/lib/conflict/least_delta_combinator.js` (`least:delta`)
  - `scripts/lib/conflict/workload_dna.js` (`workload:dna`)
- **MCP Server (`scripts/services/mcp_server.js`, `16` tools)**:
  - Aspect tools (7): `evaluate_aspect_thermal`, `evaluate_aspect_memory`, `evaluate_aspect_storage`, `evaluate_aspect_networking`, `evaluate_aspect_pcie`, `evaluate_aspect_power`, `evaluate_aspect_support`
  - Intelligence / RAG / Governance tools (9): `query_notebooklm`, `query_catalog_db`, `simulate_build`, `record_knowledge_delta`, `inspect_category_dependencies`, `inspect_catalog_deltas`, `check_portal_and_sync_readiness`, `inspect_portfolio_blindspots`, `compare_sku_across_solutions`
- **Dashboard Bridge (`dashboard/server.cjs`, `5` routers, `65` endpoints)**:
  - `dashboard/routes/evaluation.cjs`: `/api/upload-boq`, `/api/preprocess-boq`, `/api/confirm-preflight-split`, `/api/eval-boq`, `/api/export-boq`, `/api/export-boq-xlsx`, `/api/export-boq-diagnostic`, `/api/audit-catalog`, `/api/recompute-matrix`, `/api/telemetry`, `/api/decision-traces`, `/api/query/route`, `/api/query/classify`
  - `dashboard/routes/catalogs.cjs`, `dashboard/routes/notebook.cjs`, `dashboard/routes/tasks.cjs`, `dashboard/routes/sse.cjs`
- **Registry (`scripts/config/skill_workflow_registry.js`)**: `34/34` skills match `.agents/skills/*`, `18` router intents mapped (`activation: 'UNUSED'`, declarative contract metadata).

---

## 4. Section 2 + 2A Disposition Register (Execution Backlog Owners)

| Issue ID | Owning File & Line(s) | Direct Consumers | Current Behavior on `329ec34e` | Target SI Package & Intended Difference | Rollback Scope | Verification Owner / Suite |
|---|---|---|---|---|---|---|
| **S2-01** | `scripts/lib/system/reasoning_post_analyzer.js:166-228,283` | `route_query.js`, `eval_boq.js`, dashboard `PresalesRequestPanel.jsx` | Assumes 20% power headroom, 8 memory channels, PCIe primary cable cause, `x16LanesAvailable \|\| 1`, `cpus \|\| 2`, `formFactor \|\| '2U'`, `confidence ?? 1.0`; Tier 2 accepts `citationsCount > 0` without `citations` array | **SI-01**: Render only supplied facts (`UNKNOWN` when missing); require `candidateReviewCurrent` or non-empty non-ephemeral `citations` array for Tier 2 | Single file + tests | `test_reasoning_post_analyzer.js`, `test_si01_honest_claims_and_benchmarks.js` |
| **S2-02** | `scripts/lib/conflict/decision_trace.js:33,44,53-54,77-79` | `strategy_synthesizer.js`, `eval_output_serializer.js`, `/api/decision-traces` | Empty `decisions` emits `"Original customer hardware was 100% buildable"`; missing `capExDeltaUsd` becomes `0`; omitted `confidence` defaults to `1.0`; omitted `selectionRationale` becomes optimality prose | **SI-01**: Empty ledger states no decisions recorded + separate validation needed; preserve `null` for missing delta/confidence/rationale | Single file + tests | `test_decision_trace_ledger.js`, `test_si01_honest_claims_and_benchmarks.js` |
| **S2-03** | `tests/integration/test_boq_eval_benchmarks.js:225-320` | `npm run test:benchmarks` | `totalFalsePositives` never incremented; extra violations don't fail clean scenarios; missing confidence defaults to `1.0`; `0/0` precision/recall yields `100%`; prints `"5 Tiers Validated"`; writes to tracked `tests/fixtures/`; non-atomic report write; exit 0 on failure | **SI-01**: Honest FP/FN accounting, fail on unexpected violations, `null` zero-denominator/missing confidence, temp fixtures, atomic `--save` v2 schema (preserving v1 reads), nonzero exit on failure | Single file + unit tests | `test_si01_honest_claims_and_benchmarks.js`, `node tests/integration/test_boq_eval_benchmarks.js` |
| **S2-04** | `scripts/lib/boq/requirement_intent_resolver.js:189` | `route_query.js`, `boq_evaluator.js` | `budgetMatch` accepts unqualified `max`, turning `"max 64 cores"` into `budgetUsd: 64` | **SI-02**: Typed unit-bearing requirement records; currency-qualified budget parsing; source provenance | `requirements/*` + resolver | `SI-02` unit/acceptance suite |
| **S2-05** | `scripts/evaluators/route_query.js:2315-2327` | Dashboard `/api/query/route`, CLI `route:query` | `executeRoutedQuery` dispatches legacy switch; `presales_query_planner.js` shadow is opt-in only | **SI-05**: Connect verified requirement records & compound plans incrementally after path qualification | Router dispatch seam | `test:domain -- router`, `SI-05` suite |
| **S2A-01** | `scripts/lib/boq/eval_output_serializer.js:39,111-114,148-151,186-193` | `eval_boq.js`, `/api/export-boq*`, Markdown deliverables | Hardcodes `PORTAL VALIDATION PENDING.` in header, emits `❌ Missing` when `aspectChecks` absent, defaults DNA summary to `Balanced Enterprise / READ_INTENSIVE`, formats missing pricing as `$0` when `pricingComplete` omitted | **SI-01** (template honesty) + **SI-07** (unified projection): Derive portal status from `verifyCurrentPortalReceipt`, tri-state unknowns, omit `$0` when pricing incomplete/null | Single file + tests | `test_si01_honest_claims_and_benchmarks.js`, `test_post_hardening_boundary_review.js` |
| **S2A-02** | `scripts/lib/system/counterfactual_repair.js:95-97,164-173` | `reasoning_post_analyzer.js`, `eval_boq.js` | Unlabelled `1.2` power headroom fallback; fabricates `3 Year Basic` support when no SLA/years requested | **SI-01**: Disclose `headroomAssumed` policy explicitly when validator omits `requiredWattageWithHeadroom`; return `ACTION_REQUIRED` when neither SLA level nor years was requested | Single file + tests | `test_counterfactual_repair_and_reasoning.js`, `test_si01_honest_claims_and_benchmarks.js` |
| **S2A-03** | `scripts/lib/conflict/workload_dna.js:55,165,171` | `boq_evaluator.js`, `strategy_synthesizer.js`, `cross_vendor_transformer.js` | Defaults `detectedChannelWidth: 8`, `storageWorkload: 'READ_INTENSIVE'`, and unflagged heuristic GPU watts | **SI-01** (honest defaults) + **SI-06** (demand models): `null` channel width for unrecognized CPUs, `'NONE'`/`'UNKNOWN'` storage workload when absent, `gpuPowerBasis` metadata | Single file + tests | `test_workload_dna_numa.js`, `test_si01_honest_claims_and_benchmarks.js` |
| **S2A-04** | `dashboard/src/services/workflowEvidence.js:38`, `dashboard/src/services/exportEligibility.js:85-92` | `MacroOrchestratorFlow.jsx`, `MatrixStatusBanners.jsx`, `PresalesRequestPanel.jsx` | Marks candidate document review `COMPLETED` / `VERIFIED (GROUNDED)` without `sourceDetached`, `authoritativeSourceIds`, non-mock/non-simulation, citation array, or `DOUBLE_CHECK_PASSED` | **SI-01** (parity helper) + **SI-07** (server `/api/export-boq*` parity + `MatrixStatusBanners.jsx:111`): Enforce `isVerifiedCandidateDocumentReview` | Two JS services + Vitest/unit tests | `npm.cmd run test --workspace=dashboard`, `test_si01_honest_claims_and_benchmarks.js` |
| **S2A-05** | `scripts/lib/boq/boq_evaluator.js:118-123` | `eval_boq.js`, Excel workbook ingestion | Slices off all workbook rows above `headerRow`, dropping cover-sheet SLA/budget/deadline clauses | **SI-02**: Capture pre-header cover cells as untrusted requirement provenance before slicing SKU table | `boq_evaluator.js` + `requirements/` | `SI-02` acceptance suite |
