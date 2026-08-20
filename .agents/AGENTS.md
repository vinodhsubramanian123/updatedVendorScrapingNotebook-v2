# Project Rules — HPE OCA Catalog Intelligence

## Project Overview
This workspace contains tools for scraping, parsing, and organizing HPE server product catalog data from the **OCA (Online Configuration Application)** portal. The primary outputs are classified Excel workbooks + JSON companions for import into Google Notebook LM and the Vendor BOM Comparison Engine.

---

## Pipeline State of Health (Last Updated: 2026-08-19)

### ✅ Certified Products & Portfolio Status (Last Audited: 2026-08-19)
| Product | Family | Output Prefix | Unique SKUs | Entries | QuickSpecs PDF | Status |
|---------|--------|---------------|-------------|---------|----------------|--------|
| HPE ProLiant DL380 Gen12 SFF | ProLiant | `DL380_Gen12_SFF` | 261 HW / 603 Svc | 66 (Full OCA Scrape) | ✅ Verified (2.06 MB) | ✅ 100% PASS (Full Pipeline & Cloud NLM) |
| HPE ProLiant DL380 Gen11 | ProLiant | `DL380_Gen11` | 4 | 1 (Baseline + CTO variants) | ✅ Verified (2.06 MB) | ✅ Baseline PASS |
| HPE StoreEver MSL3040 Tape Library | StoreEver | `MSL3040_Tape` | 2 | 1 (Baseline + CTO variants) | ✅ Verified (2.06 MB) | ✅ Baseline PASS |
| HPE Cray Supercomputing GX5000 Rack | Cray | `GX5000_General_RACK` | 2 | 1 (Baseline + CTO variants) | ⚠️ Advisory (No DOM link) | ✅ Baseline PASS |
| HPE Synergy VC 100Gb F32 Module | Synergy | `SY100Gb_F32_Module` | 3 | 1 (Baseline + CTO variants) | ✅ Verified (0.89 MB) | ✅ Baseline PASS |
| HPE Alletra Storage System | Alletra | `Alletra_Storage_System` | 3 | 1 (Baseline + CTO variants) | ⏳ Configured in map | ✅ Baseline PASS |

**Total Verified Portfolio Intelligence**: **6/6 Product Lines Certified** across 5 families. 34/34 Aspect Math Tests + 5/5 Automated Benchmarks + 7/7 Pipeline Guardrails + 15/15 Excel Audit Checks Certified across 13 test suites.

### ✅ Automated Evaluation Benchmark Suite (`scripts/test_boq_eval_benchmarks.js`)
- **Pass Rate**: 5/5 Scenarios (100.0%)
- **Recall Rate**: 100.0%
- **Precision Rate**: 100.0%
- **Strategy Matrix Tiers**: 5 Tiers Validated (Rank 1 through Rank 5)
- **Cloud NotebookLM Grounding**: Active OAuth Profile authenticated; `DL380_Gen12_SFF_OCA_Catalog_2026-08-19` synced.

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
│   │   ├── catalog_discovery.js           ← auto-discover chassis dirs & metadata
│   │   ├── catalog_formatter.js           ← SKU formatting & normalization
│   │   ├── catalog_rules.js               ← 5-level rule extractor & mandatory SKU resolver
│   │   ├── cdp.js                         ← shared CDP connection & command module
│   │   ├── checksum_diff.js               ← SHA-256 hash diff engine
│   │   ├── aspects/                       ← 7 physical aspect checkers (compute, memory, storage, pcie, etc.)
│   │   ├── conflict/                      ← workload DNA & 5-tier strategy matrix synthesizer
│   │   ├── notebook/                      ← query sanitizer, diagnostics, async job manager
│   │   ├── preprocessor/                  ← CTO normalizer, variation clusterer, feedback persister
│   │   ├── sync/                          ← NLM sync client, payload builder, drift inspector
│   │   ├── error_envelope.js              ← standardized API error envelope & codes
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
├── tests/                                 ← test suites
│   ├── test_gemini_rotator.js             ← smart FIFO key rotator & daily quota unit/live suite
│   ├── test_task_mutex_concurrency.js     ← background task mutex & concurrency suite
│   ├── test_dual_brain_fallbacks.js       ← offline dual-brain fallback & error envelope suite
│   ├── test_extreme_edge_cases.js         ← boundary conditions & extreme edge case suite
│   ├── e2e_headless_ui_test.js            ← E2E headless browser UI test
│   ├── test_failure_modes_and_chaos.js    ← 38-test failure mode & chaos resilience suite
│   ├── test_end_to_end_scenarios.js       ← multi-scenario E2E validation
│   ├── test_conflict_graph.js             ← conflict graph unit tests
│   ├── test_offline_pipeline.js           ← offline/fallback mode tests
│   ├── test_edge_cases.js                 ← edge case coverage
│   ├── test_vendor_bom_verifier.js        ← BOM verification tests
│   └── test_incremental_checksum.js       ← diff checksum logic tests
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

1. **Token Optimization (Graphify)**: AI Agents MUST NOT blindly read large source files or crawl directories manually. ALWAYS use the `graphify` skill to map semantic graphs, or read the pre-generated `graphify-out/GRAPH_REPORT.md` artifacts to save tokens and understand codebase architecture.
2. **Anti-Slop UI Standard**: Adhere to `design-taste-frontend` rules. Avoid generic gradients and pure-black shadows. Stick to the high-contrast Emerald Green/Slate palette with strict 12px radiuses.
3. **Authentication via CDP**: Use Chrome DevTools Protocol on port 9222 to piggyback on the active authenticated browser session.
4. **Safe Atomic Writes**: All JSON modifications MUST pass through `safeWriteJsonAtomic` in `scripts/lib/fs_compat.js`.
5. **Dynamic Pathing**: Never hardcode file paths or chassis IDs in scripts. Derive them from CLI arguments or metadata.
6. **Clean SKU Regex**: All SKUs must pass `isValidHpeSKU()` filtering. `Current Qty` must pass `/^\d+$/`.
7. **5-Tier Strategy Matrix**: Always synthesize Rank 1 (Intent Preserved) through Rank 5 (Budget Minimized) without duplicate ranks or hallucinated SKUs.
8. **Hybrid Zero-Touch Scraping Workflow**: Agents MUST NOT attempt to bypass or automate the HPE SSO login sequence. The scraper relies on a Zero-Touch `/api/launch-browser` API that spins up Chrome with a persistent `--user-data-dir`. The human user MUST manually log in and click the OCA link in that specific browser window. Once loaded, the scraper attaches to CDP port 9222 headlessly.
