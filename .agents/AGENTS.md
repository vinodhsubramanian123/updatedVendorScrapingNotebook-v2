# Project Rules — HPE OCA Catalog Intelligence

## Project Overview
This workspace contains tools for scraping, parsing, and organizing HPE server product catalog data from the **OCA (Online Configuration Application)** portal. The primary outputs are classified Excel workbooks + JSON companions for import into Google Notebook LM and the Vendor BOM Comparison Engine.

---

## Pipeline State of Health (Last Updated: 2026-08-22)

### ✅ Certified Products & Portfolio Status (Last Audited: 2026-08-22)
| Product | Family | Output Prefix | Unique SKUs | Entries | QuickSpecs PDF | Status |
|---------|--------|---------------|-------------|---------|----------------|--------|
| HPE ProLiant DL380 Gen12 SFF | ProLiant | `DL380_Gen12_SFF` | 261 HW / 603 Svc (864 total) | 66 (Full OCA Scrape) | ✅ Verified (2.06 MB) | ✅ 100% PASS (Full Pipeline & Cloud NLM) |
| HPE ProLiant DL380 Gen11 | ProLiant | `DL380_Gen11` | 4 | 1 (Baseline + CTO variants) | ✅ Verified (2.06 MB) | ✅ Baseline PASS |
| HPE StoreEver MSL3040 Tape Library | StoreEver | `MSL3040_Tape` | 2 | 1 (Baseline + CTO variants) | ✅ Verified (2.06 MB) | ✅ Baseline PASS |
| HPE Cray Supercomputing GX5000 Rack | Cray | `GX5000_General_RACK` | 2 | 1 (Baseline + CTO variants) | ⚠️ Advisory (No DOM link) | ✅ Baseline PASS |
| HPE Synergy VC 100Gb F32 Module | Synergy | `SY100Gb_F32_Module` | 3 | 1 (Baseline + CTO variants) | ✅ Verified (0.89 MB) | ✅ Baseline PASS |
| HPE Alletra Storage System | Alletra | `Alletra_Storage_System` | 3 | 1 (Baseline + CTO variants) | ⏳ Configured in map | ✅ Baseline PASS |

**Total Verified Portfolio Intelligence**: **6/6 Product Lines Certified** across 5 families. 34/34 Aspect Math Tests + 5/5 Automated Benchmarks + 7/7 Pipeline Guardrails + 15/15 Excel Audit Checks Certified across 17 test suites.

> **SKU Count Source of Truth**: The correct HW SKU count for DL380 Gen12 SFF is **261** (unique hardware part numbers) and **603** service SKUs. The number `124` that may appear in `SCRAPED_CATALOGS.md` refers to raw DOM table groups extracted by the CDP scraper — **not** the de-duplicated unique SKU count from `catalog.json.metadata.totalUniqueSKUs`. GAP-2 was fixed on 2026-08-22 to ensure `updateScrapedRegistry()` now reads `liveCatalogJson.metadata.totalUniqueSKUs` post-promotion.

### ✅ Automated Evaluation Benchmark Suite (`scripts/test_boq_eval_benchmarks.js`)
- **Pass Rate**: 5/5 Scenarios (100.0%)
- **Recall Rate**: 100.0%
- **Precision Rate**: 100.0%
- **Strategy Matrix Tiers**: 5 Tiers Validated (Rank 1 through Rank 5)
- **Cloud NotebookLM Grounding**: Active OAuth Profile authenticated; `DL380_Gen12_SFF_OCA_Catalog_2026-08-22` synced.

---

## Canonical Directory Layout

```
vendorNotebookSolution/
├── .agents/
│   ├── AGENTS.md                          ← project rules & state of health
│   ├── DATA_DICTIONARY.md                 ← JSON schemas & contracts
│   └── skills/
│       ├── design-taste-frontend/         ← Anti-slop UI aesthetics (Geist, Emerald Green, shapes)
│       ├── orchestrator-workflow-skill/   ← macro 6-stage lifecycle orchestration
│       ├── oca-catalog-scraper/           ← step-by-step scraping skill
│       ├── oca-portal-navigator/          ← hands-free partner portal & oca navigator skill
│       ├── boq-eval-skill/                ← BOQ validation & pre-flight skill
│       ├── nlm-skill/                     ← Gemini NotebookLM RAG integration
│       └── knowledge-sync-skill/          ← delta sync & knowledge registry skill
├── scripts/                               ← ALL Node.js scripts live here
│   ├── config/
│   │   └── profiles/                      ← dynamic JSON scraping profiles (default, proliant_gen12, etc.)
│   ├── lib/
│   │   ├── agentic_guardrail.js           ← LLM MCP tool loop & fallback
│   │   ├── boq_evaluator.js               ← 6-aspect physical math engine
│   │   ├── boq_parser.js                  ← shared SKU extraction & line parser (DRY single source)
│   │   ├── boq_preprocessor.js            ← BOQ text/CSV parser & grouper
│   │   ├── budget_optimizer.js            ← Rank 5 budget optimization engine
│   │   ├── catalog/                       ← modular catalog barrel (checksum, diff, discovery, format, rules, versioning)
│   │   ├── catalog_discovery.js           ← auto-discover chassis dirs & metadata
│   │   ├── catalog_formatter.js           ← SKU formatting & normalization
│   │   ├── catalog_rules.js               ← 5-level rule extractor & mandatory SKU resolver
│   │   ├── cdp.js                         ← shared CDP connection & command module
│   │   ├── checksum_diff.js               ← SHA-256 hash diff engine
│   │   ├── aspects/                       ← 7 physical aspect checkers (compute, memory, storage, pcie, etc.)
│   │   ├── conflict/                      ← workload DNA & 5-tier strategy matrix synthesizer
│   │   ├── notebook/                      ← query sanitizer, diagnostics, async job manager, knowledge_extractor
│   │   ├── preprocessor/                  ← CTO normalizer, variation clusterer, feedback persister
│   │   ├── sync/                          ← NLM sync client, payload builder, drift inspector
│   │   ├── error_envelope.js              ← standardized API error envelope & codes
│   │   ├── schemas.js                     ← Zod runtime schema & validation pipeline
│   │   ├── conflict_graph.js              ← 5-level conflict graph coordinator
│   │   ├── data_validator.js              ← schema & assertion validator
│   │   ├── diff_catalog.js                ← catalog diff & price history engine
│   │   ├── dom_extract.js                 ← DOM text & table extraction helpers
│   │   ├── feedback_loop.js               ← HITL feedback capture & learning
│   │   ├── feedback_queue.js              ← async feedback queue
│   │   ├── fs_compat.js                   ← safe atomic file operations & backups
│   │   ├── gemini_rotator.js              ← deterministic FIFO key rotator & daily quota manager
│   │   ├── generate_boq_xlsx.js           ← XLSX exporter
│   │   ├── index.js                       ← barrel re-export for common lib modules (34 domain exports)
│   │   ├── knowledge_sync.js              ← NotebookLM sync payload coordinator
│   │   ├── local_rag_search.js            ← dual-layer local fallback search
│   │   ├── navigate_oca.js                ← smart partner portal auto-navigator
│   │   ├── notebook_query_utils.js        ← natural language query coordinator & barrel
│   │   ├── ocr_service.js                 ← Gemini Vision OCR service with 25MB limits
│   │   ├── pipeline_logger.js             ← standardized logger
│   │   ├── post_flow_sync.js              ← post-flow RAG sync hook
│   │   ├── product_meta.js                ← universal product family & model parser
│   │   ├── profile_loader.js              ← dynamic JSON profile loader
│   │   ├── progress.js                    ← task progress tracker
│   │   ├── registry.js                    ← shared registry table updater
│   │   ├── sku.js                         ← centralized HPE SKU regex & normalization
│   │   ├── sku_versioning.js              ← SKU version history & diff audit
│   │   ├── sync_registry.js               ← master registry auto-synchronizer
│   │   ├── system/
│   │   │   └── telemetry.js               ← pipeline telemetry & action ledger engine
│   │   ├── telemetry.js                   ← re-export proxy for system/telemetry.js
│   │   └── vendor_bom_verifier.js         ← vendor BOM cross-verification & scrape trigger
│   ├── eval_boq.js                        ← primary BOQ evaluator CLI
│   ├── test_boq_eval_benchmarks.js        ← automated BOQ evaluation benchmark suite
│   ├── test_all_aspects.js                ← 34-test aspect math verification suite
│   ├── verify_all.js                      ← portfolio audit suite (npm test)
│   └── rebuild_all.js                     ← rebuild all catalogs from raw_data
├── diagrams/                              ← 22 Mermaid architecture diagrams + interactive viewer.html
├── tests/                                 ← 17 comprehensive test suites (100% PASS)
│   ├── e2e_customer_boq_flow.js           ← E2E 13-step customer BOQ flow
│   ├── e2e_headless_ui_test.js            ← E2E headless browser UI test
│   ├── test_conflict_graph.js             ← conflict graph unit tests
│   ├── test_dual_brain_fallbacks.js       ← offline dual-brain fallback & error envelope suite
│   ├── test_edge_cases.js                 ← physical aspect edge cases
│   ├── test_end_to_end_scenarios.js       ← positive, negative & neutral E2E scenarios
│   ├── test_excel_alignment_and_audit.js  ← Excel structure & validation tests
│   ├── test_extreme_edge_cases.js         ← extreme edge case & boundary suite
│   ├── test_failure_modes_and_chaos.js    ← 44-test failure mode & chaos resilience suite
│   ├── test_gemini_rotator.js             ← smart FIFO key rotator & daily quota suite
│   ├── test_historical_pricing_timeline.js← price history timeline tests
│   ├── test_incremental_checksum.js       ← diff checksum logic tests
│   ├── test_knowledge_extractor.js        ← generic RAG knowledge extractor tests
│   ├── test_offline_pipeline.js           ← offline/fallback mode tests
│   ├── test_schemas.js                    ← Zod runtime validation suite
│   ├── test_task_mutex_concurrency.js     ← background task mutex concurrency suite
│   ├── test_ui_opportunity_boq.js         ← opportunity BOQ mapping tests
│   └── test_vendor_bom_verifier.js        ← BOM cross-verification tests
├── dashboard/                             ← React + Vite UI dashboard
│   ├── server.cjs                         ← modular Express backend coordinator
│   ├── routes/                            ← modular Express route handlers
│   ├── services/                          ← taskManager, pathGuard, errorHandler
│   ├── src/
│   │   ├── App.jsx                        ← main app shell with custom hooks
│   │   ├── services/                      ← evalNormalizer
│   │   ├── utils/                         ← categoryStyles, logParser
│   │   └── components/                    ← modular UI components
│   │       ├── header/                    ← ChassisSelector, SmartSearchInput, NavigationTabs
│   │       ├── matrix/                    ← RankCard, MatrixComparisonTable, MatrixToolbar, RejectionModal
│   │       ├── uploader/                  ← BoqInputZone, PreflightPipelineAudit, MultiConfigSplitModal, EvaluationProgressSteps
│   │       ├── stepper/                   ← StepStageCard, StepLogViewer, WorkflowHeader
│   │       ├── summary/                   ← ChassisHeaderSummary, ChassisActiveModelCard, ChassisPortfolioTable
│   │       ├── history/                   ← RunHistoryTable, RunDetailModal
│   │       ├── reconciliation/            ← VendorMatchTable, ReconciliationActionPanel
│   │       └── telemetry/                 ← telemetry hooks, sections, ledgers, modals
│   └── package.json                       ← dashboard workspace config
├── docs/                                  ← consolidated project documentation
│   ├── ARCHITECTURE_AND_DESIGN.md         ← core architecture & Mermaid diagrams
│   ├── WORKFLOWS_AND_LEARNINGS.md         ← E2E pipelines & agentic workflows
│   └── DEVELOPER_GUIDE.md                 ← local dev, testing, API guide
├── _archive_scripts/                      ← deprecated one-time fix/patch scripts
├── outputs/                               ← ALL scrape outputs live here
│   ├── SCRAPED_CATALOGS.md                ← master registry of every scrape
│   ├── history/                           ← telemetry, benchmarks, run logs
│   └── {Family}/{Gen}/{Model}_{FormFactor}/
├── README.md                              ← project documentation & run commands
└── package.json                           ← npm configuration & script targets
```

> **Rule — NO FILES AT PROJECT ROOT**: Output JSON, Excel, TSV, and PDF files MUST NEVER be written to the project root. All outputs go inside `outputs/{Family}/{Gen}/{Model}/`.

> **Rule — ALWAYS REFERENCE DATA DICTIONARY**: Before reading or modifying pipeline JSON schemas (`catalog.json`, `evalResults`, `telemetry`), AI agents MUST read `.agents/DATA_DICTIONARY.md` to understand data contracts.

---

## Key Operational Rules & Agent Directives

1. **Token Optimization (Graphify)**: AI Agents MUST NOT blindly read large source files or crawl directories manually. ALWAYS prioritize using the `graphify` skill (`/graphify query`) to extract targeted architectural insights. Only read the full `graphify-out/GRAPH_REPORT.md` artifact if a comprehensive overview is strictly necessary. Run `npm run update:graph` if you have uncommitted changes.
2. **Anti-Slop UI Standard**: Adhere to `design-taste-frontend` rules. Avoid generic gradients and pure-black shadows. Stick to the high-contrast Emerald Green/Slate palette with strict 12px radiuses.
3. **Authentication via CDP**: Use Chrome DevTools Protocol on port 9222 to piggyback on the active authenticated browser session.
4. **Safe Atomic Writes**: All JSON modifications MUST pass through `safeWriteJsonAtomic` in `scripts/lib/fs_compat.js`.
5. **Dynamic Pathing**: Never hardcode file paths or chassis IDs in scripts. Derive them from CLI arguments or metadata.
6. **Clean SKU Regex**: All SKUs must pass `isValidHpeSKU()` filtering. `Current Qty` must pass `/^\d+$/`.
7. **5-Tier Strategy Matrix**: Always synthesize Rank 1 (Intent Preserved) through Rank 5 (Budget Minimized) without duplicate ranks or hallucinated SKUs.
8. **Hybrid Zero-Touch Scraping Workflow**: Agents MUST NOT attempt to bypass or automate the HPE SSO login sequence. The scraper relies on a Zero-Touch `/api/launch-browser` API that spins up Chrome with a persistent `--user-data-dir`. The human user MUST manually log in and click the OCA link in that specific browser window. Once loaded, the scraper attaches to CDP port 9222 headlessly.

---

## Critical Technical Invariants (Fixed 2026-08-22 — Must Never Regress)

The following 7 invariants were found broken in live code and fixed. Future agents MUST NOT revert these patterns.

### INV-1: Price Trail `appendTrailEvent` deduplicates by DATE not (date+status)
- **File**: `scripts/lib/diff_catalog.js` → `appendTrailEvent(trail, event)`
- **Broken**: Was deduplicating by `(date AND status)` — same-day reruns created ghost ADDED+UNCHANGED pairs.
- **Fixed**: Deduplicates by `date` only, using a priority table (`BASELINE < UNCHANGED < ADDED < PRICE_CHANGED` etc.). A higher-priority status **replaces** a lower-priority one for the same date. This means a same-day rerun of an unchanged SKU records exactly **one** BASELINE/UNCHANGED entry.
- **Rule**: NEVER change `appendTrailEvent` to use both `date` AND `status` as the composite key.

### INV-2: SKU Count in Registry Must Come from `liveCatalogJson`, NOT `tables.length`
- **File**: `scripts/scrape_oca_solution.js` → Step 9, `updateScrapedRegistry()` call
- **Broken**: Was passing `tablesCount: tables.length` (= raw DOM table count ≈ 124) instead of actual unique SKUs (≈ 780).
- **Fixed**: After `promoteStagingDirectory()`, reads `liveCatalogJson.metadata.totalUniqueSKUs` for hardware and `liveServicesJson.metadata.totalUniqueSKUs` for services. Passes `tablesCount: totalSkuCount`, `hwSkuCount`, `serviceSkuCount` to registry.
- **Rule**: Always read the promoted catalog JSON to get the real SKU count. Never count DOM tables as SKUs.

### INV-3: Stage Stepper Uses Direct SSE Stage ID Match, Not Percent Buckets
- **File**: `dashboard/src/components/VendorScraperProgress.jsx`
- **Broken**: Was using `idx * 16` arithmetic (legacy 6-stage bucket math) to decide which stepper card glows — wrong for a 10-stage pipeline.
- **Fixed**: `SCRAPER_STAGES` entries have `minPercent`/`maxPercent` ranges. The primary match is `stg.id === currentStageId` (direct SSE `stage` field match). Fallback to `pct >= stg.minPercent && pct <= stg.maxPercent` when the stage ID is unknown.
- **Rule**: When adding stages to `SCRAPER_STAGES`, always add `minPercent`/`maxPercent` fields AND ensure the SSE `stage` field value exactly matches the `id` key.

### INV-4: `master_knowledge_registry.json` Must Contain `generatedAt` and `schemaVersion`
- **File**: `scripts/lib/knowledge_sync.js` → `buildMasterKnowledgeRegistry()`
- **Broken**: Was emitting `lastUpdated` but not `generatedAt` (the field the dashboard reads). Schema version was absent.
- **Fixed**: Emits both `generatedAt` (canonical, read by UI) and `lastUpdated` (backward compat), `schemaVersion: "1.0"`, and `productFamiliesSynced: [...familySet]`.
- **Rule**: Any new top-level field added to `master_knowledge_registry.json` MUST also be documented in `.agents/DATA_DICTIONARY.md`.

### INV-5: Step 10 (`sync_all_registered_catalogs`) Failure MUST Rethrow — Never Silent Warn
- **File**: `scripts/scrape_oca_solution.js` → Step 10 catch block
- **Broken**: Was `console.warn(...)` only — pipeline continued, emitted `percent: 100`, and exited 0 on sync failure.
- **Fixed**: Failure now emits an `error` SSE event and **rethrows** `new Error(...)`, causing the pipeline to exit code 1 and the UI to show a failure state. The `percent: 100` SSE is emitted **only** after both sync operations succeed.
- **Rule**: Steps 8-10 (Staging Audit, Knowledge Sync, Registry Sync) are all fail-hard. Any `catch` block in these steps that does not rethrow is a regression.

### INV-6: `scrapeDate` in `build_catalog.js` Metadata MUST Be `YYYY-MM-DD` Only
- **File**: `scripts/build_catalog.js` → `buildCatalogObject()` metadata block
- **Broken**: Was `new Date().toISOString()` — a full ISO8601 timestamp like `2026-08-22T09:27:12.174Z`. This caused `diff_catalog.js` to write snapshot files named `catalog_2026-08-22T09:27:12.174Z.json`, creating 10+ snapshots per calendar day.
- **Fixed**: `scrapeDate: new Date().toISOString().split('T')[0]` (stable `YYYY-MM-DD` key). Separate `scrapeTimestamp: new Date().toISOString()` for audit. The `diff_catalog.js` snapshot regex is now strict: `^catalog_\d{4}-\d{2}-\d{2}\.json$` (no ISO timestamp suffix).
- **Rule**: `scrapeDate` is the snapshot filename key — it MUST be `YYYY-MM-DD`. Any code that reads or writes `metadata.scrapeDate` expecting a full ISO timestamp is a bug.

### INV-7: Test-Chassis Sync Payloads Must Be Routed to `outputs/temp/test_payloads/`
- **Files**: `scripts/lib/sync/sync_payload_builder.js`, `scripts/lib/post_flow_sync.js`
- **Broken**: Test chassis names like `edge-test-*` and `hpe-chaos-test-*` (from chaos/stress tests) had no catalog on disk, so `targetDir` fell back to `OUTPUTS_ROOT` → payloads piled up in `outputs/history/` (52+ stale files found).
- **Fixed**: `sync_payload_builder.js` detects test chassis patterns (`/^edge-test-/i`, `/^hpe-chaos-test-/i`, `/^tmp[_-]test/i`, `/^test[_-]/i`) and routes their payloads to `outputs/temp/test_payloads/`. `post_flow_sync.js` exports `cleanTestPayloads()` and calls it automatically at the end of every production sync.
- **Rule**: If adding new test chassis patterns to chaos/stress tests, add the corresponding regex to `TEST_CHASSIS_PATTERNS` in both files. Never write test payloads to `outputs/history/`.

---

## History Directory Hygiene Rules

The `outputs/{Family}/{Gen}/{Model}/history/` directory stores canonical diff artifacts. These files must remain clean:

| File | Description | Corrupt if... |
|------|-------------|---------------|
| `catalog_YYYY-MM-DD.json` | One per calendar day snapshot | Named with full ISO timestamp |
| `price_history.json` | One entry per SKU per calendar day | Multiple entries for same date+SKU |
| `discontinued_skus.json` | Cumulative registry of removed SKUs | Contains `$0`-price unpriced CTO placeholders |
| `attribute_history.json` | Change log per SKU per field | Contains duplicate entries |
| `notebook_sync_payload_{chassis}.md` | Latest RAG payload | Contains test chassis names |

Run `node -e "require('./scripts/lib/post_flow_sync.js').cleanTestPayloads()"` to purge stale test payloads from `outputs/history/` if they accumulate.
