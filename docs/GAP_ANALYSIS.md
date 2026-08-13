# Gap Analysis — HPE OCA Catalog Intelligence Pipeline

**Date**: 2026-08-12 | **Scope**: Full codebase, outputs, docs, dashboard, tests, lint

---

## Executive Summary

| Severity | Count | Category |
|----------|-------|----------|
| 🔴 **Critical** | 6 | Missing product outputs, React Hook violations, missing docs |
| 🟠 **Major** | 9 | Lint debt, SKU count discrepancies, stale references, test gaps |
| 🟡 **Minor** | 12 | Unused imports, doc drift, registry format inconsistency |

**Overall Health Score: ~72%** — The core engine (BOQ evaluator, conflict graph, scraping pipeline) is solid and functional. The primary gaps are in **catalog output completeness**, **React correctness**, and **documentation-to-code drift**.

### ✅ Recently Resolved Improvements
- **Scraping Hardcoding Ambiguity Resolved**: Extracted brittle hardcoded scraping thresholds (e.g., DL380 Gen12 15000px scroll limit) and target tabs into a dynamic `scripts/config/profiles/` architecture, improving scalability across diverse product lines without triggering false-positive validation failures.

---

## 1. Product Catalog Coverage

### What AGENTS.md Claims (6 Products, 2,568 SKUs)

| Product | Claimed SKUs | Claimed Sheets | Claimed Status |
|---------|-------------|----------------|----------------|
| DL380 Gen12 SFF | 951 | 30 | ✅ 100% PASS |
| Alletra Storage System | 92 | 8 | ✅ 100% PASS |
| DL380 Gen11 | 1,253 | 24 | ✅ 100% PASS |
| MSL3040 Tape | 85 | 11 | ✅ 100% PASS |
| GX5000 General RACK | 46 | 11 | ✅ 100% PASS |
| SY100Gb F32 Module | 141 | 8 | ✅ 100% PASS |

### What Actually Exists on Disk

| Product | Output Dir | Catalog JSON | Excel | Audit JSON | Rules JSON | History Dir |
|---------|-----------|-------------|-------|------------|------------|-------------|
| DL380 Gen12 SFF | ✅ | ✅ (690 KB) | ✅ (2.2 MB) | ✅ | ✅ | ✅ |
| DL380 Gen11 | ✅ | ✅ (6 KB) | ✅ (41 KB) | ❌ | ❌ | ✅ |
| GX5000 RACK | ✅ | ✅ | ❓ Unchecked | ❌ | ❌ | ❌ |
| MSL3040 Tape | ✅ | ✅ | ❓ Unchecked | ❌ | ❌ | ❌ |
| SY100Gb F32 | ✅ | ✅ | ❓ Unchecked | ❌ | ❌ | ❌ |
| **Alletra Storage** | **❌ MISSING** | **❌ MISSING** | **❌ MISSING** | **❌** | **❌** | **❌** |

> [!CAUTION]
> ### 🔴 GAP-1: Alletra Storage System — No Output Directory
> AGENTS.md claims 92 SKUs and 8 sheets for "HPE Alletra Storage System" with ✅ 100% PASS, but **no `outputs/Alletra/` directory exists at all**. The `chassis_map.json` has Alletra base SKUs defined, and a NotebookLM sync payload exists at `outputs/history/notebook_sync_payload_Alletra_Storage_System.md`, but no actual catalog data was ever scraped to disk.

> [!WARNING]
> ### 🟠 GAP-2: DL380 Gen11 — Severely Undersized Catalog
> Claims **1,253 SKUs** and **24 sheets**, but the JSON is only **6 KB** and the Excel only **41 KB**. For reference, DL380 Gen12 SFF (951 SKUs) has a 690 KB JSON and 2.2 MB Excel. The Gen11 catalog appears to contain only a handful of entries — possibly 4 base SKUs from `chassis_map.json` and not a full OCA scrape.

> [!WARNING]
> ### 🟠 GAP-3: Missing Audit/Rules Artifacts for Non-Gen12 Products
> Only DL380 Gen12 SFF has `audit_result.json`, `DL380_Gen12_SFF_Catalog_Rules.json`, and `preflight_audit_log.json`. The other 4 existing products have none of these verification artifacts, meaning they haven't been through the full pipeline audit.

> [!IMPORTANT]
> ### 🟠 GAP-4: SCRAPED_CATALOGS.md Registry — Missing Table Header
> The [SCRAPED_CATALOGS.md](file:///home/vinodh/vendorNotebookSolution/outputs/SCRAPED_CATALOGS.md) file has raw table rows but **no markdown table header row** (no `| Date | Product | ... |` header or `|---|---|` separator). It also lists only 5 entries — Alletra is absent entirely. The "Sheets" column shows 2, 4, 124, 2, 3 — which doesn't match the AGENTS.md claims of 30, 24, 8, 11, 8 sheets.

---

## 2. Code Quality & Lint Health

### Lint Summary (from `oxlint`)

| Category | Count | Severity |
|----------|-------|----------|
| `no-unused-vars` (imports) | **~40** | 🟡 Minor |
| `no-unused-vars` (params/vars) | **~12** | 🟡 Minor |
| `rules-of-hooks` violations | **4** | 🔴 Critical |
| `exhaustive-deps` warnings | **2** | 🟠 Major |
| Silenced catch blocks | **~6** | 🟡 Minor |

> [!CAUTION]
> ### 🔴 GAP-5: React Hook Rule Violations (4 errors)
> These are **runtime crash risks** — React will behave unpredictably:
>
> | File | Hook | Issue |
> |------|------|-------|
> | [CatalogExplorer.jsx](file:///home/vinodh/vendorNotebookSolution/dashboard/src/components/CatalogExplorer.jsx) | `useState` (L79) | Called after conditional early return |
> | [CatalogExplorer.jsx](file:///home/vinodh/vendorNotebookSolution/dashboard/src/components/CatalogExplorer.jsx) | `useState` (L108) | Called after conditional early return |
> | [CatalogExplorer.jsx](file:///home/vinodh/vendorNotebookSolution/dashboard/src/components/CatalogExplorer.jsx) | `useState` (L109) | Called after conditional early return |
> | [PriceAnalyticsCard.jsx](file:///home/vinodh/vendorNotebookSolution/dashboard/src/components/PriceAnalyticsCard.jsx) | `useMemo` (L71) | Called conditionally |

> [!WARNING]
> ### 🟠 GAP-6: useEffect Missing Dependencies (App.jsx)
> [App.jsx](file:///home/vinodh/vendorNotebookSolution/dashboard/src/App.jsx) has two `useEffect` hooks with empty dependency arrays `[]` but they reference `fetchAvailableCatalogs` and `selectedChassis` — these are stale closure bugs that could cause the SSE handler to miss state changes.

> [!IMPORTANT]
> ### 🟠 GAP-7: Massive Unused Import Debt
> Over **40 unused `lucide-react` icon imports** across components. Worst offenders:
> - [ScrapingHistorySection.jsx](file:///home/vinodh/vendorNotebookSolution/dashboard/src/components/ScrapingHistorySection.jsx) — 8 unused imports + 2 unused params
> - [RuleLogicVisualizer.jsx](file:///home/vinodh/vendorNotebookSolution/dashboard/src/components/RuleLogicVisualizer.jsx) — 9 unused imports
> - [VendorScraperProgress.jsx](file:///home/vinodh/vendorNotebookSolution/dashboard/src/components/VendorScraperProgress.jsx) — 5 unused imports + 2 unused vars

### 🟠 GAP-8: `npm run lint` is a No-Op
The root [package.json](file:///home/vinodh/vendorNotebookSolution/package.json#L16) has `"lint": "echo 'No lint errors'"` — the CI lint command is hardcoded to always pass. The real linting is done via `oxlint` inside the dashboard workspace but is never wired into the root `npm run lint`.

---

## 3. Testing & Verification

### Test Suite Inventory

| Test File | Type | Scope |
|-----------|------|-------|
| [test_all_aspects.js](file:///home/vinodh/vendorNotebookSolution/scripts/test_all_aspects.js) | Unit | 34 aspect math assertions |
| [test_boq_eval_benchmarks.js](file:///home/vinodh/vendorNotebookSolution/scripts/test_boq_eval_benchmarks.js) | Benchmark | 5 BOQ eval scenarios |
| [test_pipeline_evals.js](file:///home/vinodh/vendorNotebookSolution/scripts/test_pipeline_evals.js) | Integration | Portfolio audit |
| [verify_all.js](file:///home/vinodh/vendorNotebookSolution/scripts/verify_all.js) | Audit | Full portfolio pass |
| [test_end_to_end_scenarios.js](file:///home/vinodh/vendorNotebookSolution/tests/test_end_to_end_scenarios.js) | E2E | Multi-scenario validation |
| [test_conflict_graph.js](file:///home/vinodh/vendorNotebookSolution/tests/test_conflict_graph.js) | Unit | Conflict graph logic |
| [test_offline_pipeline.js](file:///home/vinodh/vendorNotebookSolution/tests/test_offline_pipeline.js) | Integration | Offline/fallback mode |
| [test_edge_cases.js](file:///home/vinodh/vendorNotebookSolution/tests/test_edge_cases.js) | Edge | Edge case coverage |
| [test_vendor_bom_verifier.js](file:///home/vinodh/vendorNotebookSolution/tests/test_vendor_bom_verifier.js) | Unit | BOM verification |
| [test_incremental_checksum.js](file:///home/vinodh/vendorNotebookSolution/tests/test_incremental_checksum.js) | Unit | Diff checksum logic |
| [e2e_headless_ui_test.js](file:///home/vinodh/vendorNotebookSolution/tests/e2e_headless_ui_test.js) | E2E UI | Headless browser test |

> [!IMPORTANT]
> ### 🟠 GAP-9: E2E UI Test Has Zero Gaps but Shallow Coverage
> The [e2e_report.json](file:///home/vinodh/vendorNotebookSolution/e2e_report.json) shows `totalGaps: 0, totalConsoleErrors: 0`, but the test only checks:
> - Dashboard loads
> - "Evaluate BOQ Quote" button exists
> - DL380 Gen12 preset button exists
> - Header tabs exist
>
> **Missing E2E coverage**: Catalog Explorer tab, NotebookLM RAG drawer, Settings drawer, Resolution Matrix rendering, SSE streaming, Vendor BOM modal, feedback loop, scraper trigger flow.

> [!WARNING]
> ### 🟠 GAP-10: No Test Coverage for Dashboard Components
> Zero unit/integration tests for any of the **33 React components**. No Jest, Vitest, or React Testing Library setup exists. The dashboard package has no test script.

---

## 4. Documentation Drift

> [!CAUTION]
> ### 🔴 GAP-11: Missing `.agents/DATA_DICTIONARY.md`
> AGENTS.md rule states: *"Before reading or modifying pipeline JSON schemas, AI agents MUST read `.agents/DATA_DICTIONARY.md`"*. However, **this file does not exist**. The grep search found `DATA_DICTIONARY` only referenced in AGENTS.md text — the actual data dictionary was never created.

> [!WARNING]
> ### 🟠 GAP-12: Developer Guide References Non-Existent Script
> [DEVELOPER_GUIDE.md](file:///home/vinodh/vendorNotebookSolution/docs/DEVELOPER_GUIDE.md#L16) mentions `run_background_adversary.js` but this file doesn't exist. The actual adversarial agent script is [adversarial_agent.js](file:///home/vinodh/vendorNotebookSolution/scripts/adversarial_agent.js).

### 🟡 GAP-13: Canonical Layout vs. Reality Drift
AGENTS.md canonical layout mentions `scripts/lib/logger.js` — this file doesn't exist in `scripts/lib/`. The following files exist in lib but are **not listed** in the canonical layout:

| In Lib, Not Documented | Documented, Not in Lib |
|------------------------|----------------------|
| `agentic_guardrail.js` | `logger.js` ❌ |
| `boq_preprocessor.js` | — |
| `budget_optimizer.js` | — |
| `catalog_discovery.js` | — |
| `catalog_formatter.js` | — |
| `catalog_rules.js` | — |
| `checksum_diff.js` | — |
| `data_validator.js` | — |
| `feedback_loop.js` | — |
| `feedback_queue.js` | — |
| `generate_boq_xlsx.js` | — |
| `index.js` | — |
| `knowledge_sync.js` | — |
| `local_rag_search.js` | — |
| `ocr_service.js` | — |
| `pipeline_logger.js` | — |
| `progress.js` | — |
| `sku_versioning.js` | — |
| `telemetry.js` (stub, 216B) | — |

> The canonical directory tree lists only 14 lib files but **32 actually exist**. Over half the codebase is undocumented.

---

## 5. Dashboard UI Completeness

### Component Inventory (33 files, ~490 KB total)

The dashboard has an impressive component set. Functionality spot-check:

| Component | Purpose | Wired In? |
|-----------|---------|-----------|
| [BoqUploader.jsx](file:///home/vinodh/vendorNotebookSolution/dashboard/src/components/BoqUploader.jsx) | BOQ file upload & evaluation | ✅ |
| [ResolutionMatrix.jsx](file:///home/vinodh/vendorNotebookSolution/dashboard/src/components/ResolutionMatrix.jsx) | 5-tier strategy matrix display | ✅ |
| [CatalogExplorer.jsx](file:///home/vinodh/vendorNotebookSolution/dashboard/src/components/CatalogExplorer.jsx) | Browse scraped catalog data | ✅ (⚠️ hooks bug) |
| [TelemetryCard.jsx](file:///home/vinodh/vendorNotebookSolution/dashboard/src/components/TelemetryCard.jsx) | Pipeline telemetry display | ✅ |
| [WorkflowStepper.jsx](file:///home/vinodh/vendorNotebookSolution/dashboard/src/components/WorkflowStepper.jsx) | Multi-phase eval stepper | ✅ |
| [ChassisSyncSummaryView.jsx](file:///home/vinodh/vendorNotebookSolution/dashboard/src/components/ChassisSyncSummaryView.jsx) | Chassis sync summary | ✅ |
| [VendorBomVerificationModal.jsx](file:///home/vinodh/vendorNotebookSolution/dashboard/src/components/VendorBomVerificationModal.jsx) | BOM cross-verification | ✅ |
| [NotebookRagDrawer.jsx](file:///home/vinodh/vendorNotebookSolution/dashboard/src/components/NotebookRagDrawer.jsx) | RAG query drawer | ✅ |
| [ScrapingHistorySection.jsx](file:///home/vinodh/vendorNotebookSolution/dashboard/src/components/ScrapingHistorySection.jsx) | Scrape history timeline | ⚠️ unused params |
| [PriceAnalyticsCard.jsx](file:///home/vinodh/vendorNotebookSolution/dashboard/src/components/PriceAnalyticsCard.jsx) | Price trend analytics | ⚠️ hooks bug |
| [RuleLogicVisualizer.jsx](file:///home/vinodh/vendorNotebookSolution/dashboard/src/components/RuleLogicVisualizer.jsx) | Rule engine visualization | ✅ |

> [!WARNING]
> ### 🟠 GAP-14: `server.cjs` is Monolithic (67 KB)
> The Express backend [server.cjs](file:///home/vinodh/vendorNotebookSolution/dashboard/server.cjs) is a **single 67 KB file** handling all API routes, SSE streaming, task management, scraping orchestration, and static file serving. No route separation, no middleware abstraction.

---

## 6. Pipeline Infrastructure

### 🟡 GAP-15: `scripts/lib/telemetry.js` is a 216-byte Stub
The canonical `scripts/lib/telemetry.js` is only 216 bytes — likely a re-export stub. The real telemetry engine lives at `scripts/lib/system/telemetry.js`. This creates import confusion.

### 🟡 GAP-16: Root-Level Stray Files
Per AGENTS.md rule *"NO FILES AT PROJECT ROOT"*, these files violate the rule:
- `test_unknown.csv` (27 bytes)
- `lint.txt` / `lint.json` (46 KB)
- `e2e_report.json` (84 bytes)
- `metadata.json` (244 bytes)

### 🟡 GAP-17: `_archive_scripts/` Purpose Unclear
An `_archive_scripts/` directory exists at root with no documentation. It's unclear if these are deprecated scripts or backup copies.

---

## 7. Security & Reliability

### 🟡 GAP-18: Silenced Catch Blocks
At least **6 instances** of `catch (_) {}` or `catch (e) {}` with no error handling across [server.cjs](file:///home/vinodh/vendorNotebookSolution/dashboard/server.cjs) and dashboard components. These silently swallow errors that could mask real failures.

### 🟡 GAP-19: No `.env` File — Only `.env.example`
The `.env.example` file exists (125 bytes) but no actual `.env` is committed or documented as required for local dev setup.

---

## 8. Prioritized Remediation Roadmap

### 🔴 P0 — Critical (Fix This Week)

| # | Gap | Action | Effort |
|---|-----|--------|--------|
| 1 | GAP-5 | Fix React Hook violations in `CatalogExplorer.jsx` and `PriceAnalyticsCard.jsx` — move all hooks above early returns | 1-2 hrs |
| 2 | GAP-1 | Run Alletra Storage scrape or remove from AGENTS.md certified list | 2-4 hrs |
| 3 | GAP-11 | Create `.agents/DATA_DICTIONARY.md` documenting all JSON schemas | 3-4 hrs |

### 🟠 P1 — Major (Fix This Sprint)

| # | Gap | Action | Effort |
|---|-----|--------|--------|
| 4 | GAP-2 | Re-scrape DL380 Gen11 to populate full 1,253 SKU catalog | 2-3 hrs |
| 5 | GAP-6 | Fix `useEffect` dependency arrays in `App.jsx` | 30 min |
| 6 | GAP-7,8 | Clean unused imports, wire `oxlint` into root `npm run lint` | 1-2 hrs |
| 7 | GAP-3 | Run `verify_all.js` audit against all 5 product catalogs, generate missing audit/rules artifacts | 1-2 hrs |
| 8 | GAP-10 | Add Vitest + React Testing Library, write tests for top 5 critical components | 4-6 hrs |
| 9 | GAP-12,13 | Update DEVELOPER_GUIDE.md and AGENTS.md canonical layout to match reality | 1-2 hrs |

### 🟡 P2 — Minor (Backlog)

| # | Gap | Action | Effort |
|---|-----|--------|--------|
| 10 | GAP-4 | Fix SCRAPED_CATALOGS.md header and add Alletra entry | 15 min |
| 11 | GAP-9 | Expand E2E headless test to cover all tabs and flows | 3-4 hrs |
| 12 | GAP-14 | Refactor `server.cjs` into route modules | 4-6 hrs |
| 13 | GAP-15 | Consolidate telemetry imports | 15 min |
| 14 | GAP-16 | Move stray root files to proper locations | 15 min |
| 15 | GAP-18 | Add proper error logging to silent catch blocks | 1 hr |

---

## Appendix: Quick Metrics

```
Codebase Size:
  scripts/        — 32 files, ~230 KB
  scripts/lib/    — 32 files, ~300 KB
  dashboard/src/  — 33 components, ~490 KB
  server.cjs      — 1 file, 67 KB
  tests/          — 7 test files, ~41 KB

Product Catalog Outputs:
  Verified on disk: 5/6 products (Alletra missing)
  Full pipeline artifacts: 1/6 (only DL380 Gen12 SFF)
  NotebookLM sync payloads: 6/6 ✅

Test Health:
  Benchmark suite: 5/5 PASS (100%)
  E2E UI test: 0 gaps, 0 console errors
  React Hook safety: 4 violations ❌

Lint Health:
  Total warnings: ~60
  Critical errors: 4 (hooks)
  Root lint wired: ❌ (echo no-op)
```
