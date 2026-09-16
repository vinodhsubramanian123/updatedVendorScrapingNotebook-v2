# Project Rules — HPE OCA Catalog Intelligence

## Project Overview
This workspace contains tools for scraping, parsing, and organizing HPE server product catalog data from the **OCA (Online Configuration Application)** portal. The primary outputs are classified Excel workbooks + JSON companions for import into Google Notebook LM and the Vendor BOM Comparison Engine.

---

## Pipeline State of Health (Last Audited: 2026-09-14)

### ✅ Certified Products & Portfolio Status (10 Canonical Product Generations)
| Product | Family | Output Prefix | Unique SKUs | Entries | QuickSpecs PDF | Status |
|---------|--------|---------------|-------------|---------|----------------|--------|
| HPE ProLiant DL380 Gen12 | ProLiant | `DL380_Gen12` | 472 HW / 667 Svc | 71 (Full OCA Scrape) | Advisory (No QS Link) | ✅ 100% PASS (Full Pipeline & Cloud NLM) |
| HPE ProLiant DL380 Gen11 | ProLiant | `DL380_Gen11` | 584 HW / 1109 Svc | 76 (Full OCA Scrape + Active GPLs) | ✅ Verified (2.08 MB) | ✅ 100% PASS (Full Pipeline & Cloud NLM) |
| HPE ProLiant DL380a Gen12 | ProLiant | `DL380a_Gen12` | 359 HW / 295 Svc | 48 (Full OCA Scrape) | Advisory (No QS Link) | ✅ 100% PASS (Full Pipeline & Cloud NLM) |
| HPE ProLiant DL145 Gen11 | ProLiant | `DL145_Gen11` | 357 HW / 267 Svc | 42 (Full OCA Scrape) | Advisory (No QS Link) | ✅ 100% PASS (Full Pipeline & Cloud NLM) |
| HPE ProLiant DL580 Gen12 | ProLiant | `DL580_Gen12` | 242 HW / 626 Svc | 45 (Full OCA Scrape) | Advisory (No QS Link) | ✅ 100% PASS (Full Pipeline & Cloud NLM) |
| HPE Synergy 480 Gen12 | Synergy | `SY480_Gen12` | 154 HW / 403 Svc | 52 (Full OCA Scrape) | ✅ Verified (2.58 MB) | ✅ 100% PASS (Full Pipeline & Cloud NLM) |
| HPE StoreEver MSL3040 Tape Library | StoreEver | `MSL3040_Tape` | 104 HW / 91 Svc | 24 (Full OCA Scrape) | Advisory (No QS Link) | ✅ 100% PASS (Full Pipeline & Cloud NLM) |
| HPE Cray Supercomputing GX5000 Rack | Cray | `GX5000_General_RACK` | 2 | 1 (Baseline + CTO variants) | ⚠️ Advisory (No DOM link) | ✅ Baseline PASS |
| HPE Synergy VC 100Gb F32 Module | Synergy | `SY100Gb_F32_Module` | 3 | 1 (Baseline + CTO variants) | ✅ Verified (0.52 MB) | ✅ Baseline PASS |
| HPE Alletra Storage System | Alletra | `Alletra_Storage_System` | 3 | 1 (Baseline + CTO variants) | ⏳ Configured in map | ✅ Baseline PASS |

**Total Verified Portfolio Intelligence**: **10 Canonical Product Generations Certified** across 5 families (2,280 unique hardware SKUs on disk). Full isolated test matrix certified at **167/167 Suites PASSED (100.0%)** (101 Unit, 40 Chaos, 26 Integration) plus 3/3 Playwright headless E2E browser suites with 0 lint warnings/errors on 110 files, 11/11 sample portfolio BOMs certified, all Codex audit findings F01–F13 resolved, and CC $\le 135$.

### ✅ Automated Evaluation Benchmark Suite (`tests/integration/test_boq_eval_benchmarks.js`)
- **Pass Rate**: 15/15 Scenarios (100.0%)
- **Recall Rate**: 100.0%
- **Precision Rate**: 100.0%
- **Strategy Matrix Tiers**: 5 Tiers Validated (Rank 1 - Rank 5, plus Rank 1L/1M Least-Delta variants)
- **Cloud NotebookLM Grounding**: Active OAuth Profile authenticated; 10 product generation sync payloads generated and validated.

---

## Canonical Directory Layout

```
vendorNotebookSolution/
├── .agents/
│   ├── AGENTS.md                          ← project rules, state of health & technical invariants
│   ├── DATA_DICTIONARY.md                 ← JSON schemas & data contracts
│   └── skills/
│       ├── orchestrator-workflow-skill/   ← macro 7-phase continuous learning lifecycle & execution map
│       ├── presales-query-router/         ← 5-track presales intent classifier & dispatcher
│       ├── boq-eval-skill/                ← 7-aspect physical math & pre-flight BOQ validation
│       ├── multi-cluster-tender-skill/    ← multi-node tender decomposition & 42U rack/power sizing
│       ├── rfp-sizing-synthesizer/        ← natural language sizing requirements to starting BOM
│       ├── workload-dna-skill/            ← enterprise app workload matching & slot arbitration
│       ├── least-delta-combinator-skill/  ← troublesome SKU pruning & minimal-mutation alternatives (Rank 1L)
│       ├── value-engineering-skill/       ← post-buildability CapEx/OpEx deal optimizer
│       ├── bom-reconciliation-skill/      ← customer tender vs vendor partner quote cross-verification
│       ├── adversarial-validation-skill/  ← enterprise chaos red-teaming & 10 failure mode sanity checks
│       ├── ocr-quote-ingestion-skill/     ← multimodal Gemini Vision OCR for scanned PDF/image quotes
│       ├── catalog-intelligence-skill/    ← price trails, lifecycle status changes (OB, DS, 90, EOL)
│       ├── workbook-generator-skill/      ← standardized 7-column upload sheets & executive workbooks
│       ├── execution-trace-skill/         ← auditable execution trace ledger & delta report
│       ├── output-validation-skill/       ← pre-presentation 14-point acceptance criteria gate
│       ├── nlm-skill/                     ← Gemini NotebookLM RAG integration & Strict SKU Gate
│       ├── knowledge-sync-skill/          ← bi-directional delta sync & master knowledge registry
│       ├── oca-catalog-scraper/           ← live WebLogic OCA portal CDP scraper
│       ├── oca-portal-navigator/          ← hands-free partner portal SSO & menu navigator
│       └── design-taste-frontend/         ← anti-slop UI aesthetics (Geist, Emerald Green, shapes)
├── scripts/                               ← Node.js CLI tools & subsystems
│   ├── scrapers/                          ← OCA portal CDP scrapers & PDF extractors
│   ├── evaluators/                        ← BOQ evaluators, multi-config splitters & adversarial agents
│   ├── catalogs/                          ← Catalog generators, CSV/XLSX converters & sync tools
│   ├── maintenance/                       ← Generation maintenance, complexity analysis & certifiers
│   ├── services/                          ← MCP server, feedback listeners & Jules task manager
│   ├── demos/                             ← Live CDP visual demos & topology screenshot capturers
│   ├── config/profiles/                   ← Dynamic JSON scraping profiles
│   ├── lib/                               ← Reusable core logic libraries (barrel: index.js)
│   │   ├── aspects/                       ← 7 physical aspect checkers (compute, memory, storage, pcie, power, net, support)
│   │   ├── boq/                           ← BOQ evaluator, parser, preprocessor, budget optimizer, BOM verifier
│   │   ├── catalog/                       ← Rules engine, discovery, formatter, diff, SKU versioning, registry sync
│   │   ├── conflict/                      ← Workload DNA, conflict graph, 5-tier strategy matrix synthesizer
│   │   ├── feedback/                      ← HITL feedback loop & queue processors
│   │   ├── notebook/                      ← Knowledge extractor, NLP sanitizer, query diagnostics, job manager
│   │   ├── ocr/                           ← Gemini Vision OCR service (25MB payload limits)
│   │   ├── preprocessor/                  ← CTO normalizer, variation clusterer, feedback persister
│   │   ├── rag/                           ← Agentic MCP guardrail & local fallback RAG search
│   │   ├── scraper/                       ← CDP connector, DOM extractors, OCA portal navigator
│   │   ├── sync/                          ← NLM sync client, payload builder, drift inspector, post-flow sync
│   │   └── system/                        ← Telemetry ledger, atomic fs_compat, rotator, Zod schemas, logger
│   └── README.md                          ← Subsystem catalog guide
├── tests/                                 ← 50+ comprehensive test suites across 4 tiers (100% PASS)
│   ├── unit/                              ← Aspect math, preprocessors, schemas, rotator, checksums, topology (23 tests)
│   ├── chaos/                             ← Chaos & failure modes, edge cases, memory fuzzing, mutex, offline (9 tests)
│   ├── integration/                       ← E2E scenarios, BOM verifier, Excel audit, portfolio certification (15 tests)
│   ├── e2e/                               ← Customer BOQ flows, headless browser UI tests, live CLIC (5 tests)
│   ├── fixtures/                          ← Raw DOM dumps, customer BOQ spreadsheets, ground-truth benchmarks
│   └── README.md                          ← Testing tier guide
├── dashboard/                             ← React + Vite UI dashboard
│   ├── server.cjs                         ← Modular Express backend coordinator
│   ├── routes/                            ← Modular Express route handlers
│   ├── services/                          ← taskManager, pathGuard, errorHandler
│   ├── src/
│   │   ├── App.jsx                        ← Main app shell with custom hooks
│   │   ├── services/                      ← evalNormalizer, topologyGraphBuilder
│   │   ├── utils/                         ← categoryStyles, logParser
│   │   └── components/                    ← Modular UI components (header, matrix, uploader, stepper, telemetry, etc.)
│   └── package.json                       ← Dashboard workspace config
├── docs/                                  ← Consolidated project documentation
│   ├── DIRECTORY_STRUCTURE.md             ← Complete canonical directory and file layout
│   ├── ARCHITECTURE_AND_DESIGN.md         ← Core architecture, Dual-Brain paradigm, schemas & diagrams
│   ├── WORKFLOWS_AND_LEARNINGS.md         ← E2E pipelines, agentic guardrails & learning loops
│   └── DEVELOPER_GUIDE.md                 ← Local dev, testing tiers & API documentation
├── outputs/                               ← ALL scrape outputs live here
│   ├── SCRAPED_CATALOGS.md                ← Master registry of every scrape
│   ├── history/                           ← Telemetry ledgers, run logs, sync payloads
│   ├── temp/                              ← Uploaded BOQs, temporary test payloads
│   └── {Family}/{Gen}/{Model}_{FormFactor}/
├── README.md                              ← Project documentation & quick start guide
└── package.json                           ← npm configuration & script targets
```

> **Rule — NO FILES AT PROJECT ROOT**: Output JSON, Excel, TSV, and PDF files MUST NEVER be written to the project root. All outputs go inside `outputs/{Family}/{Gen}/{Model}/`.

> **Rule — ALWAYS REFERENCE DATA DICTIONARY**: Before reading or modifying pipeline JSON schemas (`catalog.json`, `evalResults`, `telemetry`), AI agents MUST read `.agents/DATA_DICTIONARY.md` to understand data contracts.

---

## Key Operational Rules & Agent Directives

0. **Permanent Universal MCP Auto-Approval & Zero-Waiting Policy (MANDATORY & UNCONDITIONAL)**: The human developer has granted **FULL, UNCONDITIONAL, AND PERMANENT APPROVAL** for EVERY MCP tool call across ALL configured and future servers without exception (`jules` [all tools: `create_session`, `send_reply_to_session`, `get_session_state`, `get_bash_outputs`, `list_sessions`, etc.], `gemini-notebook-mcp` [all 35+ tools], `notebooks` [all 8+ tools], `data-agent-kit` [all tools], `visualization` [`render_chart`], `graphify`, CDP browser navigation, knowledge extractor, etc.). AI Agents MUST NEVER pause, prompt, ask for human confirmation, or wait for human approvals to execute ANY MCP tool call, plan approval, code review, test run, message dispatch, source addition, or session management action. Execute all operations autonomously and immediately in the background.
1. **Token Optimization (Graphify)**: AI Agents MUST NOT blindly read large source files or crawl directories manually. ALWAYS prioritize using the `graphify` skill (`/graphify query`) to extract targeted architectural insights. Only read the full `graphify-out/GRAPH_REPORT.md` artifact if a comprehensive overview is strictly necessary. Run `npm run update:graph` if you have uncommitted changes.
2. **Anti-Slop UI Standard**: Adhere to `design-taste-frontend` rules. Avoid generic gradients and pure-black shadows. Stick to the high-contrast Emerald Green/Slate palette with strict 12px radiuses.
3. **Authentication via CDP**: Use Chrome DevTools Protocol on port 9222 to piggyback on the active authenticated browser session.
4. **Safe Atomic Writes**: All JSON modifications MUST pass through `safeWriteJsonAtomic` in `scripts/lib/system/fs_compat.js`.
5. **Dynamic Pathing**: Never hardcode file paths or chassis IDs in scripts. Derive them from CLI arguments or metadata.
6. **Clean SKU Regex**: All SKUs must pass `isValidHpeSKU()` filtering. `Current Qty` must pass `/^\d+$/`.
7. **5-Tier Strategy Matrix**: Always synthesize Rank 1 (Intent Preserved) through Rank 5 (Budget Minimized) without duplicate ranks or hallucinated SKUs.
8. **Zero-Touch Automated Scraping & Tab 1 Self-Healing Recovery Workflow (`INV-89`)**: The scraping engine operates 100% hands-free on CDP port 9222. `browser_launcher.js` automatically verifies port 9222 and launches Google Chrome with `--remote-debugging-port=9222 --user-data-dir=.chrome_sso_profile https://partner.hpe.com/web/prp`. `navigate_oca.js` detects the login page, triggers `#oktaSignInBtn`, and clicks `#onepass-submit-btn` using saved credentials. Once inside the Partner Portal home page, it clicks "One Config Advanced" from the Quick links section (`#quick-links-807 a`), which opens OCA in a new tab with fresh SAML tokens. Whenever a WebLogic session times out, encounters an exception dialog, or freezes silently, the engine MUST NEVER reload the OCA page in-place (which breaks WebLogic state). Instead, it automatically closes the broken OCA tab, switches to the parent Partner Portal tab, reloads Tab 1 to refresh session tokens, and re-clicks "One Config Advanced" from Quick links to resume extraction without human intervention.

---

## Critical Technical Invariants (Fixed 2026-08-22 — Must Never Regress)

The following 7 invariants were found broken in live code and fixed. Future agents MUST NOT revert these patterns.

### INV-1: Price Trail `appendTrailEvent` deduplicates by DATE not (date+status)
- **File**: `scripts/lib/catalog/diff_catalog.js` → `appendTrailEvent(trail, event)`
- **Broken**: Was deduplicating by `(date AND status)` — same-day reruns created ghost ADDED+UNCHANGED pairs.
- **Fixed**: Deduplicates by `date` only, using a priority table (`BASELINE < UNCHANGED < ADDED < PRICE_CHANGED` etc.). A higher-priority status **replaces** a lower-priority one for the same date. This means a same-day rerun of an unchanged SKU records exactly **one** BASELINE/UNCHANGED entry.
- **Rule**: NEVER change `appendTrailEvent` to use both `date` AND `status` as the composite key.

### INV-2: SKU Count in Registry Must Come from `liveCatalogJson`, NOT `tables.length`
- **File**: `scripts/scrapers/scrape_oca_solution.js` → Step 9, `updateScrapedRegistry()` call
- **Broken**: Was passing `tablesCount: tables.length` (= raw DOM table count ≈ 124) instead of actual unique SKUs (≈ 780).
- **Fixed**: After `promoteStagingDirectory()`, reads `liveCatalogJson.metadata.totalUniqueSKUs` for hardware and `liveServicesJson.metadata.totalUniqueSKUs` for services. Passes `tablesCount: totalSkuCount`, `hwSkuCount`, `serviceSkuCount` to registry.
- **Rule**: Always read the promoted catalog JSON to get the real SKU count. Never count DOM tables as SKUs.

### INV-3: Stage Stepper Uses Direct SSE Stage ID Match, Not Percent Buckets
- **File**: `dashboard/src/components/stepper/StepStageCard.jsx` (or `VendorScraperProgress.jsx`)
- **Broken**: Was using `idx * 16` arithmetic (legacy 6-stage bucket math) to decide which stepper card glows — wrong for a 10-stage pipeline.
- **Fixed**: `SCRAPER_STAGES` entries have `minPercent`/`maxPercent` ranges. The primary match is `stg.id === currentStageId` (direct SSE `stage` field match). Fallback to `pct >= stg.minPercent && pct <= stg.maxPercent` when the stage ID is unknown.
- **Rule**: When adding stages to `SCRAPER_STAGES`, always add `minPercent`/`maxPercent` fields AND ensure the SSE `stage` field value exactly matches the `id` key.

### INV-4: `master_knowledge_registry.json` Must Contain `generatedAt` and `schemaVersion`
- **File**: `scripts/lib/sync/knowledge_sync.js` → `buildMasterKnowledgeRegistry()`
- **Broken**: Was emitting `lastUpdated` but not `generatedAt` (the field the dashboard reads). Schema version was absent.
- **Fixed**: Emits both `generatedAt` (canonical, read by UI) and `lastUpdated` (backward compat), `schemaVersion: "1.0"`, and `productFamiliesSynced: [...familySet]`.
- **Rule**: Any new top-level field added to `master_knowledge_registry.json` MUST also be documented in `.agents/DATA_DICTIONARY.md`.

### INV-5: Step 10 (`sync_all_registered_catalogs`) Failure MUST Rethrow — Never Silent Warn
- **File**: `scripts/scrapers/scrape_oca_solution.js` → Step 10 catch block
- **Broken**: Was `console.warn(...)` only — pipeline continued, emitted `percent: 100`, and exited 0 on sync failure.
- **Fixed**: Failure now emits an `error` SSE event and **rethrows** `new Error(...)`, causing the pipeline to exit code 1 and the UI to show a failure state. The `percent: 100` SSE is emitted **only** after both sync operations succeed.
- **Rule**: Steps 8-10 (Staging Audit, Knowledge Sync, Registry Sync) are all fail-hard. Any `catch` block in these steps that does not rethrow is a regression.

### INV-6: `scrapeDate` in `build_catalog.js` Metadata MUST Be `YYYY-MM-DD` Only
- **File**: `scripts/catalogs/build_catalog.js` → `buildCatalogObject()` metadata block
- **Broken**: Was `new Date().toISOString()` — a full ISO8601 timestamp like `2026-08-22T09:27:12.174Z`. This caused `diff_catalog.js` to write snapshot files named `catalog_2026-08-22T09:27:12.174Z.json`, creating 10+ snapshots per calendar day.
- **Fixed**: `scrapeDate: new Date().toISOString().split('T')[0]` (stable `YYYY-MM-DD` key). Separate `scrapeTimestamp: new Date().toISOString()` for audit. The `diff_catalog.js` snapshot regex is now strict: `^catalog_\d{4}-\d{2}-\d{2}\.json$` (no ISO timestamp suffix).
- **Rule**: `scrapeDate` is the snapshot filename key — it MUST be `YYYY-MM-DD`. Any code that reads or writes `metadata.scrapeDate` expecting a full ISO timestamp is a bug.

### INV-7: Test-Chassis Sync Payloads Must Be Routed to `outputs/temp/test_payloads/`
- **Files**: `scripts/lib/sync/sync_payload_builder.js`, `scripts/lib/sync/post_flow_sync.js`
- **Broken**: Test chassis names like `edge-test-*` and `hpe-chaos-test-*` (from chaos/stress tests) had no catalog on disk, so `targetDir` fell back to `OUTPUTS_ROOT` → payloads piled up in `outputs/history/` (52+ stale files found).
- **Fixed**: `sync_payload_builder.js` detects test chassis patterns (`/^edge-test-/i`, `/^hpe-chaos-test-/i`, `/^tmp[_-]test/i`, `/^test[_-]/i`) and routes their payloads to `outputs/temp/test_payloads/`. `post_flow_sync.js` exports `cleanTestPayloads()` and calls it automatically at the end of every production sync.
- **Rule**: If adding new test chassis patterns to chaos/stress tests, add the corresponding regex to `TEST_CHASSIS_PATTERNS` in both files. Never write test payloads to `outputs/history/`.

### INV-8: Fast Substring Pre-Check for Async Catalog History Parsing
- **File**: `scripts/catalogs/build_catalog.js`
- **Pattern**: History snapshot file reading is parallelized via `Promise.all` with `fs.promises.readFile`. Prior to `JSON.parse`, files are pre-filtered via `rawContent.includes('"parentCategory":"Chassis"')` to avoid expensive JSON parsing of non-chassis catalogs.
- **Rule**: Never revert history parsing to sequential blocking `fs.readFileSync` loops.

### INV-9: Memoized SKU Price Cache with Lifecycle Reset
- **File**: `scripts/lib/catalog/sku_versioning.js`
- **Pattern**: `getHistoricalSkuPrice` caches catalog SKU maps in `catalogPriceCache` Map for $O(1)$ amortized lookups across multi-item BOM audits. Exported `_clearCatalogPriceCache()` clears the cache cleanly between test suites.
- **Rule**: Never perform un-memoized full-catalog array scans on repeated SKU lookups.

### INV-10: Jules Task Manager Autonomous Background Delegation & Closed-Loop PR Protocol
- **Files**: `scripts/services/jules_task_manager.js`, `@google/jules-sdk`
- **Pattern**: Multi-agent task handoff delegates heavy test generation, boundary stress-testing, and PR reviews asynchronously to Google Jules in the background without blocking the user.
- **Mandatory Notification Rule**: Whenever an AI agent modifies, patches, or refactors code on a branch associated with a Jules session/PR, the agent **MUST NOT stop after git push**. The agent **MUST immediately call `sendMessageToSession(sessionId, message)`** (or `node scripts/services/jules_task_manager.js send <sessionId> "<message>"`) specifying the exact branch, commit hash, rationale, and verification expectations.
- **Autonomous Feedback Rule**: When Jules comments with issues or failed edge cases, the agent must autonomously read the session activity (`status <sessionId>`), address the underlying pattern across the codebase, push the fix, and reply to Jules in the same session without requiring the human user to act as a relayer.
- **Artifact Hygiene Rule**: All automated PRs created by Jules must be audited for accidental build artifacts (INV-7) before merging. Ensure 100% pass across all 18 test suites (`npm run test:all`) and zero lint errors (`npm run lint`).

### INV-11: Post-Merge Stale Branch Pruning & Full Ownership Protocol
- **Pattern**: Once a feature branch created by Jules is audited, verified, certified, and fully integrated into `main`, the agent takes full ownership of branch lifecycle management.
- **Rule**: Agents must prune stale remote feature branches from GitHub (`git push origin --delete <branch>`) and notify Jules that the session is integrated. Never leave abandoned or dangling branches on remote once code has landed on `main`.

### INV-12: Full Activity-Patch Audit Protocol Before Session Retirement
- **Pattern**: When any Jules session finishes, pauses, or requests input, AI agents must never assume code is only on a remote git branch.
- **Rule**: Agents MUST execute `node scripts/services/jules_task_manager.js audit <sessionId>` to inspect all authored `unidiffPatch` change sets, extract unpushed test suites/fixes, run local validation (`npm run test:all`), and certify 100% compliance before concluding.

### INV-13: Closed-Loop Knowledge Delta Deduplication
- **Pattern**: `scripts/lib/feedback/feedback_loop.js` and `scripts/lib/notebook/knowledge_extractor.js` must deduplicate incoming rules against existing `catalog_deltas.json` and `master_knowledge_registry.json`.
- **Rule**: Never blindly push duplicate rules. Match on `(chassis, affectedSku, requiredDependencySku, rawMessage/ruleUpdate)` and update timestamps/scores in place.

### INV-14: Whole-Solution BOM Manifest Context in Grounded RAG Queries
- **Pattern**: `formatNotebookQueryPayload` in `boq_evaluator.js` must always bundle the entire solution BOM manifest (comma-separated SKU quantities), detected physical issues, proposed fixes, and 5-tier strategy summaries.
- **Rule**: Never dispatch isolated, single-SKU queries to NotebookLM/RAG for whole-solution validation. Always preserve full topological context.

### INV-15: Proactive Multi-Agent Scheduling & Final Authority Governance
- **Pattern**: Whenever an Antigravity AI Agent delegates work to Google Jules or has an active Jules session in flight, the agent **MUST NOT go idle or wait for the human user to prompt or relay messages**.
- **Rule**: The agent MUST proactively schedule periodic background wakeups using the `schedule` tool (`DurationSeconds=120-180`, `TimerCondition="never"`) to inspect session progress, query activities (`session.activities.list()`), answer clarifications, push remediation code, and verify final certification until the task is complete. Antigravity is the Architect and Final Authority.

### INV-16: Cross-Platform Universal Compatibility Contract
- **Pattern**: All CI workflows, test suites, and build scripts MUST be strictly cross-platform across Ubuntu, macOS, and Windows.
- **Rule**: Zero shell-specific binary dependencies (no `unzip`, `which`, `curl`, `grep`, or `rm -rf` via `execSync`). Use pure in-memory JavaScript (`xlsx-js-style` cell styles, `os.homedir()`, `safeWriteJsonAtomic`). Frontend tooling must pin stable production LTS releases (Vite 6, Vitest 3) and use `npm install --include=optional` in CI.

### INV-17: Catalog Ingestion & Classification Diagnostics Observability
- **Pattern**: `scripts/catalogs/build_catalog.js` must always record structured provenance traces (`outputs/{Family}/{Gen}/{Model}/history/classification_diagnostics.json`) via `ClassificationDiagnostics`.
- **Rule**: All test assertion suites MUST provide rich introspective diff reporting linking directly to the provenance trace upon any assertion failure.

### INV-18: Cross-Platform Pull Request & Branch Inspection Protocol
- **Pattern**: AI agents and developers inspect and prune Jules PR branches directly through pure Node.js services without requiring external binaries like the GitHub CLI (`gh`).
- **Rule**: Never run `gh pr list` in shell scripts or test suites. Always use `node scripts/services/jules_task_manager.js prs` (or `npm run jules:prs`) and `node scripts/services/jules_task_manager.js prune` (or `npm run jules:prune`) which leverage native `fetch` over GitHub REST API endpoints with automated header resolution.

### INV-19: Audit-Before-Archive Session Lifecycle Governance
- **Pattern**: Completed Jules sessions are audited for activities, patches, and PR deltas, logged into `outputs/history/jules_archived_sessions.json`, and archived via `session.archive()`.
- **Rule**: Never leave completed, fully integrated sessions lingering in the active query pool. Run `node scripts/services/jules_task_manager.js archive-completed` (or `npm run jules:archive`) after merging PRs to keep the active session pool lean and fast.

### INV-20: WebLogic OCA Dynamic DOM Expansion & Full Sub-Choice Trigger Protocol
- **Pattern**: WebLogic-based OCA menus contain collapsed sub-choice groups (`showmore_*`), toolbar toggles (`#show_extra_columns`, `#show_dates`, `#show_obsolete_date`, `#show_cost`, `#show_price`), and deferred table panes.
- **Rule**: `cdp.js` must click all toolbar toggles, check all `showmore_*` inputs, and dispatch jQuery `change` events (`jQuery(i).prop('checked', true).trigger('change')`) to force the WebLogic client runtime to render all hidden sub-choice tables (e.g. `ProcessorSection_AdditionalProcessorsChoice`). Never rely solely on scroll height or top-level table counts.

### INV-21: Lifecycle Status Tag & Clean PID Separation Protocol
- **Pattern**: WebLogic OCA renders lifecycle status badges inside `<td class="item_prod">` as `<span class="td_prod">OB</span>` or `<span class="td_prod">90</span>` alongside `<span class="_pid">SKU</span>`.
- **Rule**: `dom_extract.js` and `build_catalog.js` MUST separate lifecycle status tags (`OB` Obsolete, `DS` Direct Ship / Discontinued, `90` 90-Day Warning, `EOL` End of Life) from the clean SKU string. SKUs must never have un-stripped leading or trailing text that causes regex rejections in `isValidHpeSKU()`. All extracted lifecycle statuses, effective start dates, and discontinued/obsolete dates MUST be preserved in the catalog JSON, TSV, and 22-sheet Excel workbooks.

### INV-22: Category Cardinality & Proactive Provenance Pre-Commit Assertion
- **Pattern**: Staging validation (`verify_excel_tally.js`, `test_pipeline_evals.js`) must not just check `totalUniqueSKUs > 0`. Flagship servers (DL380, DL360, Synergy, Cray) have mandatory minimum cardinality thresholds for key categories (e.g. Flagship 2P servers require >= 30 processor SKUs).
- **Rule**: If a flagship server catalog contains fewer than the expected minimum category options, the staging audit must fail hard in Step 8, aborting promotion of an incomplete catalog to live workspace and preventing knowledge drift.

### INV-23: Catastrophic Drop & Anomaly Pre-Promotion Guardrail
- **Pattern**: Staging validation (`verify_excel_tally.js`) compares staging SKU counts against the previous baseline snapshot before promotion.
- **Rule**: If a staging catalog experiences an unexpected drop (>30% drop below previous baseline without explicit decommissioning), the pipeline MUST raise a hard `INV-23 Anomaly Alert` in Step 8 and abort promotion, keeping live master Excel workbooks, JSON companions, and historical snapshots 100% intact.

### INV-24: Knowledge Base Grounding & Customer BOQ Isolation Protocol
- **Pattern**: Unverified customer BOQs and tender spreadsheets inherently contain human errors, invalid component quantities, deprecated part numbers, or missing enablement kits.
- **Rule**: Customer BOQ, quote, or tender files MUST NEVER be added or synced to NotebookLM knowledge sources directly. Ingesting raw customer BOQs directly would poison the RAG intent brain with unverified errors. Cloud NotebookLM sources are strictly reserved for: (1) Official vendor QuickSpecs PDFs, (2) Ground-truth live OCA scraped master catalogs (22-sheet Excel companions and master CSVs), and (3) Verified, deduplicated `KnowledgeDelta` learning payloads emitted by the closed-loop feedback engine. Customer BOQs are treated exclusively as runtime evaluation inputs tested against this ground-truth baseline.

### INV-25: Multi-Chassis Container Tree & Option Placement Protocol
- **Pattern**: Every server configuration in HPE OCA/CLIC is a structured container tree. Components inside a CTO chassis must carry the `#0D1` (Factory Integrated Option / FIO) suffix.
- **Rule**: `multi_cluster_splitter.js` and `boq_evaluator.js` MUST enforce FIO option tagging (`#0D1` / `-F21`) for all internal components nested inside a CTO base chassis container. Standalone BTO components (e.g. `P64707-B21` memory) placed outside the server container will fail CLIC validation with unbuildable errors (Rules 81354490 & 91001655).

### INV-26: Storage Expander & Tri-Mode Controller Port Channel Math
- **Pattern**: Dedicated Tri-Mode RAID controllers have strict direct-attach drive limits (8-port controllers like `MR408i-o` / `MR216i-p` directly address up to 8 physical drives).
- **Rule**: Configurations with 16 or 24 drives on a single controller MUST include a SAS Expander Card (`P48835-B21`) or Tri-Mode Switch Card (`P55806-B21`). Controller enablement cables (`P48918-B21`) MUST be used for OCP controllers on standard 8SFF cages; Y-splitter cables (`P48832-B21`) are strictly restricted to PCIe riser cards on Premium cages (Rules 81354627 & 81354632).

### INV-27: GPU Accelerator Auxiliary Power & Thermal Envelope Protocol
- **Pattern**: High-power PCIe GPUs (NVIDIA L40S, A100, H100) require dedicated auxiliary power cabling to the internal power distribution board.
- **Rule**: The presence of PCIe GPU accelerators mandates GPU Auxiliary Power Cable Kits (`P48816-B21` / `P76450-B21`), High-Performance Fan Kits (`P48820-B21`), High-Performance Heatsinks, and redundant power supplies (>=1600W).

### INV-28: OS & Hypervisor Physical Core Multiplier Licensing Protocol
- **Pattern**: Microsoft Windows Server and VMware vSphere Foundation/Cloud Foundation are licensed per physical CPU core with strict base minimums (Windows Server: 16 cores per server minimum; VMware: 16 cores per socket minimum).
- **Rule**: `support_manufacturing.js` MUST calculate total physical socket cores (`cpuCount * coresPerCpu`) and validate that base licenses plus additional core packs (`2-core` / `4-core` / `16-core` add-ons) equal or exceed total server cores.

### INV-29: Multi-Node Cluster Infrastructure & Power Sizing Matrix
- **Pattern**: Large multi-node tenders (e.g. 60x DL380 nodes) require comprehensive data center infrastructure synthesis.
- **Rule**: `boq_evaluator.js` and `multi_cluster_splitter.js` MUST emit `clusterSizing` containing: (1) Total Rack Units (`serverCount * 2U`), (2) Standard 42U Rack Count (`ceil(totalRU / 42)`), (3) Peak Facility Power Envelope (`(serverCount * psuWattage) / 1000` kW), (4) Rail Kit Coverage (`P52341-B21` Easy Install Rail Kit 1 per node), and (5) High-line 200V-240V utility power derating protection when estimated node draw exceeds 800W.

### INV-30: OCP Form-Factor Controller & Multi-Device Physical Slot Budget
- **Pattern**: Standard 2U rack servers (DL380 Gen11 / Gen12) have a physical maximum of TWO (2) OCP 3.0 slots (OCP1 and OCP2).
- **Rule**: `networking_ocp.js` and `boq_evaluator.js` MUST count both OCP storage controllers (`-o` suffix, e.g. `MR408i-o`, `MR216i-o`, `SR-series`) AND OCP network adapters against `maxOcpSlots = 2`. When an OCP storage controller occupies Slot 1 and an OCP NIC occupies Slot 2, adding a 3rd OCP device (e.g. `P10115-B21`) is physically unbuildable and MUST be rejected or converted to a standard PCIe standup adapter (`P26262-B21`).

### INV-31: FIO Root Part Number Whitelisting vs Suffix Relabeling
- **Pattern**: In HPE CLIC/OCA, BTO memory SKUs (`-B21`) are strictly restricted from standalone quotes in CTO base models under global supply constraint rules (Rules 81354490 & 91001655).
- **Rule**: Rule engines and tender generators MUST NEVER synthesize an FIO component by simply appending `" 0D1"` to an un-whitelisted BTO part number (e.g. `P64707-B21 0D1`). CTO configurations require true FIO root part numbers (`-F21`, e.g. `P64707-F21`) or explicit `#0D1`-whitelisted companion Smart Kits (`P73148-B21 #0D1`).

### INV-32: EU Ecodesign Lot 9 Regulatory Compliance & Platinum PSU Enablement Protocol
- **Pattern**: Dual-socket servers with high-draw TDP configurations default to EU Ecodesign Regulation 2019/424 (ErP Lot 9) in HPE OCA, requiring 96% Titanium power supplies.
- **Rule**: When ordering 94% Platinum PSUs (`P38997-B21`), `power_environment.js` and `boq_evaluator.js` MUST inject `P35876-B21` (HPE CE Mark Removal FIO Enablement Kit, $1 list) in Factory Configuration Settings for non-EU/global deployment to clear regulatory software prompts without altering the customer's requested PSU model.

### INV-33: PCIe Riser 5th Slot Power Delivery Cable Protocol
- **Pattern**: When 5 or more physical PCIe expansion cards are populated across risers (e.g. 2x FC HBAs + 2x PCIe NICs + 1x RAID controller), physical Slot 1 on Primary Riser `P48803-B21` requires auxiliary cable enablement.
- **Rule**: `pcie_riser.js` and `boq_evaluator.js` MUST inject Primary Cable Kit `P56073-B21` to supply dedicated power and PCIe lanes to Slot 1 (Rules 81016755 & 81354683).

### INV-34: Dynamic GPL Price Baseline Preservation Across Unbundled Views
- **Pattern**: WebLogic OCA portal renders temporary unbundled views or $0.00 prices during certain configurator state transitions.
- **Rule**: `build_catalog.js` and `diff_catalog.js` MUST load `historyPriceMap` from `price_history.json` and prior snapshots. Verified historical Global List Prices (GPL) are preserved so no pricing data is lost or zeroed out between runs.

### INV-35: Obsolete Vendor Description Badge & Concatenation Sanitization
- **Pattern**: WebLogic DOM rendering occasionally concatenates vendor error strings inside `<td class="item_desc">` (e.g. `Product is obsolete: <SKU>`).
- **Rule**: `build_catalog.js` and `dom_extract.js` MUST strip all `Product is obsolete:\s*[A-Z0-9-]+\s*` and embedded status badges (`OB`, `DS`, `90`, `EOL`) from descriptions, isolating obsolete parts cleanly into the `Discontinued SKUs` sheet and metadata.

### INV-36: Universal Dynamic Product Generation Hierarchy
- **Pattern**: Product lines must not be fragmented into ad-hoc form-factor subdirectories.
- **Rule**: The repository enforces a strict 3-tier taxonomy: `{Family}/{Gen}/{Model}/`. All chassis form-factor variants (8SFF, 24SFF, 8LFF, 12LFF, EDSFF, etc.) MUST be contained within the single product generation directory (e.g. `outputs/ProLiant/Gen12/DL380_Gen12/` and `outputs/ProLiant/Gen11/DL380_Gen11/`). No duplicate or fragmented form-factor directories.

### INV-37: Automated Multi-Cluster Tender Subtotal & 2-Line Gap Formatting Protocol
- **Pattern**: Partner Portal upload workbooks require strict 7-column schema and per-cluster subtotal rows with 2-line gaps.
- **Rule**: All generated Partner Portal Upload workbooks and tender reconciliation sheets maintain the exact 7-column schema required by vendor portals: `['Part No', 'Qty', 'Set', ' Description', 'Unit List Price (USD)', 'Extended Price (USD)', 'Portal / CLIC Status']`, with per-cluster subtotal rows (`CONFIG #N SUBTOTAL:` in Column index 2) and 2-line separator gaps.

### INV-38: Dynamic Chassis Directory Path Resolution in Sku Versioning
- **Pattern**: Sku versioning and historical price lookup engines must resolve bare model strings without failing or defaulting to the project root.
- **Rule**: `sku_versioning.js` (`getSkuAuditHistory`, `getHistoricalSkuPrice`) implements `resolveChassisDirectory(dir)` to dynamically locate product generation folders under `outputs/{Family}/{Gen}/{Model}/` when called with bare model identifiers (e.g. `DL380_Gen11`, `DL380_Gen12`, `GX5000_General_RACK`).

### INV-39: Multi-Cluster Architectural Partitioning & Form-Factor Pivot Protocol
- **Pattern**: Complex multi-server tenders (e.g. 60-node RFQs with mixed Platinum 8580 and Gold 6530 processors) require dynamic decomposition into homogeneous, 100% buildable clusters.
- **Rule**: `multi_cluster_splitter.js` and `boq_evaluator.js` MUST: (1) Partition mixed CPU tenders into homogeneous cluster tiers (e.g. 20-node Platinum 8580 + 40-node Gold 6530), (2) Match power and thermal envelopes (1800W Titanium PSUs for 350W TDP vs 1600W Platinum PSUs for 270W TDP), and (3) Execute Form-Factor Pivots (e.g. OCP controller `MR408i-o` to PCIe standup `MR416i-p`) whenever physical OCP slots are oversubscribed.

### INV-40: Continuous Knowledge Auto-Sync & Milestone Drift Immunity Protocol
- **Pattern**: Deterministic rule engine learnings and Gemini NotebookLM RAG knowledge sources must remain synchronized across all lifecycle events without manual human prompting.
- **Rule**: `post_flow_sync.js` (`triggerPostFlowSync`) is automatically executed on four canonical milestones: (1) Live scrape completion and staging promotion (Step 9/10), (2) BOQ evaluation completion, (3) Partner quote reconciliation (`/api/verify-vendor-bom`), and (4) HITL feedback submission (`/api/feedback-submit`).

### INV-41: Dual-Brain RAG Headroom & 24-Hour TTL Cache Invalidation Protocol
- **Pattern**: Complex multi-part RAG queries require ample latency headroom to avoid premature timeouts, while disk cache must not serve stale responses indefinitely.
- **Rule**: Default RAG timeout is set to 120s, and Agentic Guardrail overall timeout is set to 180s (3 minutes) with a 3-query budget cap. Disk cache in `notebook_query_utils.js` enforces a 24-hour TTL with automatic startup and lookup eviction. The UI explicitly surfaces dual-brain grounding status (`NOTEBOOK_LM_CLOUD` vs `LOCAL_VERIFIED_FALLBACK`).

### INV-42: Mathematically Rigorous Hamilton–Hare Diophantine Multiplier Allocation Protocol
- **Pattern**: Customer multi-server tenders with non-trivial processor distributions (e.g. fractional ratios or remainders) require exact integer chassis partitioning.
- **Rule**: `multi_cluster_splitter.js` implements the exact Hamilton–Hare Largest Remainder Method. Each cluster calculates an exact proportional target share $E_i = N_{\text{total}} \times \frac{Q_i}{\sum Q}$, an integer base multiplier $\lfloor E_i \rfloor$, and a fractional remainder $E_i - \lfloor E_i \rfloor$. Deficit chassis are allocated $+1$ each to highest remainder clusters, mathematically guaranteeing $\sum N_{\text{cluster}} = N_{\text{total}}$ with zero lost or surplus nodes across all permutations.

### INV-43: MCP-First Jules Lifecycle Order & Zero-Human Relay Invariant
- **Pattern**: Background task delegation to Google Jules requires MCP-first tool invocations to capture rich structured properties (`pendingPlan`, `lastAgentMessage`, `status: busy|stable|failed`) and eliminate manual human relay.
- **Rule**: AI agents MUST strictly execute the 8-stage lifecycle: (1) Laser-focused atomic dispatch, (2) Mandatory proactive heartbeat cron (`schedule DurationSeconds=120`, `TimerCondition="never"`), (3) Two-way plan auto-approval and unblocking, (4) Structured code review and diff inspection BEFORE archiving, (5) PR verification and merge to `main` with 100% test pass, (6) Remote branch pruning ONLY AFTER merge to `main`, (7) Audit-before-archive session retirement, and (8) Proactive gap scan for new task dispatch.

### INV-44: Google Jules SDK Client Method Contract & State Machine Lifecycle
- **Pattern**: Calling `.list()` on `client.sessions` in `@google/jules-sdk` throws `TypeError: client.sessions.list is not a function`.
- **Rule**: In `@google/jules-sdk`, `client.sessions` is a callable factory function `client.sessions()`, and the collection listing method is `.all()` (e.g. `await client.sessions().all()`). `s.activities.history()` is an async generator for streaming complete historical activities. When a session enters `awaitingUserFeedback`, the agent MUST immediately unblock it using `session.approve()` or `session.send(message)`.

### INV-45: Enterprise Workflow Atomic Decomposition & Continuous Grounding Contract
- **Pattern**: Heavy monolithic stages obscure failure points and prevent fine-grained progress observability.
- **Rule**: Heavy workflows MUST be decomposed into fine-grained atomic stages with SSE telemetry:
  - **10-Stage Scraping**: (1) SSO & Portal Navigation $\rightarrow$ (2) Chassis Discovery & Base Price $\rightarrow$ (3) OCA Menu Entry $\rightarrow$ (4) Dynamic DOM Expansion (`INV-20`) $\rightarrow$ (5) Raw Table Ingestion $\rightarrow$ (6) Lifecycle Badge Separation (`INV-21`) $\rightarrow$ (7) 22-Sheet Category Mapping $\rightarrow$ (8) Staging Excel Generation $\rightarrow$ (9) 15/15 Staging Audit (`verify_excel_tally.js`) $\rightarrow$ (10) Master Promotion & Registry Sync (`INV-2`, `INV-5`).
  - **7-Substep Evaluation**: (1a) Tabular OCR Ingestion $\rightarrow$ (1b) Multi-Unit CTO Normalization $\rightarrow$ (1c) Diophantine Multi-Cluster Partitioning (`INV-42`) $\rightarrow$ (1d) 7-Aspect Physical Math Validation $\rightarrow$ (1e) 5-Level Conflict Graph DAG $\rightarrow$ (1f) 5-Tier Strategy Matrix Ranking $\rightarrow$ (1g) Grounding Badge Inscription & Trace Logging.
  - **4-Stage Continuous NLM Verification**: Pre-Flight DNA validation, In-Flight conflict RAG, Post-Flight solution grounding, and Closed-Loop Delta sync.
  - **Knowledge Isolation**: Universal Master Knowledge Registry (`master_knowledge_registry.json`) for cross-chassis rules vs Product-Specific Partitioned Catalogs (`outputs/{Family}/{Gen}/{Model}/`) with zero cross-chassis contamination (`INV-24`).

### INV-46: Static Circular Dependency DAG & SonarQube Cyclomatic Complexity Guardrail
- **Pattern**: Complex, tightly-coupled functions create fragility, maintenance friction, and potential infinite recursion bugs.
- **Rule**: The repository dependency graph is strictly enforced as a Directed Acyclic Graph (DAG) with **0 circular dependency cycles** across all 350+ modules. McCabe Cyclomatic Complexity (CC) is strictly governed: high-level evaluators (`evalSupportManufacturing`, `evalPcieRiserSlots`, `evalNetworkingOcp`, `evalStorageTriMode`) MUST NOT exceed **CC $\le 20$**, and category/subcategory synthesis engines MUST NOT exceed **CC $\le 15$** (utilizing declarative matcher arrays like `SUBCATEGORY_SYNTHESIS_RULES`). Validated continuously via `npm run test:circular` and `npm run test:complexity`.

### INV-47: Isolated Test Matrix, Failure Ledger & Subprocess Telemetry Harness
- **Pattern**: Monolithic chained test runs (`&&`) abort abruptly on failure, masking subsequent suite outcomes and forcing expensive full-matrix re-executions that waste time and tokens.
- **Rule**: Test suites MUST execute via `scripts/maintenance/run_test_matrix.js` (`npm run test:all`), running each test file in an isolated Node.js process with a 60s timeout guard. Any failure is isolated immediately, recorded into `outputs/history/test_failure_ledger.json` with exact assertion traces, and re-tested iteratively using `npm run test:failed` or `npm run test:isolated -- <file>` until 100% green before running the full matrix.

### INV-48: Strict Generation & Product Family RAG Firewall
- **Pattern**: Unconstrained catalog and delta searches bleed across product generations (e.g. suggesting Gen11 DDR4/DDR5-4800 memory or processors for a Gen12 server).
- **Rule**: `local_rag_search.js` and `notebook_query_utils.js` MUST enforce strict generation/family filtering when `chassisName` is targeted. A Gen12 query MUST search exclusively within `outputs/ProLiant/Gen12/DL380_Gen12/` and Gen12 cloud notebooks, with ZERO fallback to scanning all other catalogs. Cross-compatible SKUs require explicit QuickSpecs / NLM certification.

### INV-49: Autonomous Multi-Solution Cluster Partitioning Protocol
- **Pattern**: Mixed-infrastructure customer tenders (combining Compute Servers, External Storage Arrays, Tape Automation, and Networking) will fail physical checks if evaluated against a single server container.
- **Rule**: `boq_preprocessor.js` and `multi_cluster_splitter.js` MUST automatically dissect mixed quotes into dedicated Solution Clusters (e.g. Cluster A: DL380 Compute, Cluster B: Alletra Storage MP, Cluster C: MSL Tape, Cluster D: Aruba Fabric), evaluating each against its own ground-truth catalog without cross-solution option spilling.

### INV-50: Ambiguity Inbox Escalation & Human Sign-off Protocol
- **Pattern**: Auto-healing unverified or obsolete customer SKUs with ungrounded guesses risks proposing invalid or obsolete parts.
- **Rule**: Unmatched, ambiguous, or legacy SKUs not verified in QuickSpecs or live catalogs MUST NOT be substituted automatically. They must be flagged as `NEEDS_HUMAN_CLARIFICATION`, highlighted with Amber visual badges in the Topology Canvas, and routed to the Ambiguity Inbox for human engineer confirmation. Human sign-offs persist as `KnowledgeDelta` records in `master_knowledge_registry.json`.

### INV-51: 4-Tier Vendor-Agnostic Taxonomy Protocol
- **Pattern**: Expanding beyond HPE into Dell PowerEdge, Cisco UCS, and Lenovo ThinkSystem requires strict architectural namespaces to prevent vendor cross-pollution.
- **Rule**: All catalogs, rules, and RAG payloads MUST adhere to the canonical 4-tier hierarchy: `{Vendor}/{Family}/{Gen}/{Model}/` (e.g. `outputs/HPE/ProLiant/Gen12/DL380_Gen12/`, `outputs/Dell/PowerEdge/16G/R760/`, `outputs/Cisco/UCS/M7/C240_M7/`), ensuring 100% isolated knowledge domains.

### INV-52: Smart Fuzzy Category Alignment & Upward Attribute Matching Protocol
- **Pattern**: Typos in customer part numbers or description-only rows can lead to discarded items or downgraded substitutions.
- **Rule**: `boq_parser.js` and `strategy_synthesizer.js` MUST map ambiguous inputs to their target component category/subcategory, prioritizing exact match first, nearest upward/equivalent attribute match second (never downward), and synthesizing 5-tier ranked alternatives with 100% buildable mandatory physical fixes.

### INV-53: Autonomous Jules Session Resumption, Auto-Unblocking & Final Authority Quality Review Protocol
- **Pattern**: Jules background sessions frequently pause awaiting plan approvals (`awaitingPlanApproval`) or user feedback (`awaitingUserFeedback`), which causes automation stalls if waiting for human intervention.
- **Rule**: AI agents MUST execute `node scripts/services/jules_task_manager.js unblock` (or `npm run jules:unblock` / `approveSession`) to auto-approve proposed plans and dispatch unblocking directives without human waiting. Antigravity maintains 100% Lead Architect authority, auditing all authored test suites, verifying isolated test passes (`npm run test:isolated`), inspecting git diffs for artifact hygiene (`INV-7`), and certifying 100% quality before integration. Jules tasks MUST follow the Atomic Contract pattern (1 module + 1 test file per session, pure cross-platform JS, zero shell commands).

### INV-54: DL380a Gen12 GPU Accelerator & DL145 Gen11 AMD EPYC Domain Isolation Protocol
- **Pattern**: Specialized AI/GPU accelerator servers (`DL380a_Gen12`) and edge servers (`DL145_Gen11`) have architectural physical rules that conflict with standard 2P enterprise servers if mixed.
- **Rule**:
  - `DL380a_Gen12` (`P76706-B21`): Captive risers mandate GPU auxiliary power kits (`P76450-B21`). Double-wide GPUs require min 5x 2400W Titanium PSUs (`P75008-B21` / `P75002-B21`). Drive cages 4SFF (`P74710-B21`) and 4EDSFF (`P74712-B21`) cannot be mixed (Rule 81016788). Cacheless MR216i-o controllers trigger RAID 5/6 risk warnings.
  - `DL145_Gen11` (`P71964-B21`): 1U edge chassis powered by AMD EPYC 8004 single socket. 4EDSFF cage default, max 1000W edge PSU profile (1600W+ enterprise PSUs physically incompatible), and extended temperature operation (-5°C to 55°C).
  - In `chassis_map.json`, each is segregated into dedicated family sections (`ProLiant_DL380a_Gen12` and `ProLiant_DL145_Gen11`).

### INV-55: Safe Knowledge Query String Normalization & Regex Escaping Protocol
- **Pattern**: Passing complex query objects (e.g. `{ query: "...", chassis: "..." }`) or markdown formatting (`**`) into RAG search causes runtime crashes (`TypeError: (query || "").toLowerCase is not a function`, `SyntaxError: Invalid regular expression: /\b**\b/i: Nothing to repeat`).
- **Rule**: All knowledge search entry points (`local_rag_search.js`, `notebook_query_utils.js`) MUST safely coerce query inputs to strings (`query?.query || query?.text || JSON.stringify(query)`), and keyword RegExp constructors MUST escape special regex characters (`term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`).

### INV-56: Universal Zero-Hardcoding Generic Domain Template Rules & Capability Protocol
- **Pattern**: Hardcoding fixed SKU strings into physical aspect checkers and rules creates maintenance debt and fails when encountering new product generations, form factors, or multi-vendor quotes (Dell PowerEdge, Cisco UCS, Lenovo ThinkSystem).
- **Rule**: Architectural physical constraints, dependencies, and risk checks MUST be defined as zero-hardcoded generic domain templates (`scripts/config/generic_domain_rules_matrix.json`, `scripts/lib/catalog/generic_domain_templates.js`) covering `SERVER`, `STORAGE`, and `NETWORKING` domains.
  - Evaluation operates strictly on parsed component roles, attributes (TDP, wattages, direct drive counts, slot counts, core counts), and capability tags (`HIGH_PERFORMANCE_COOLING`, `STORAGE_EXPANDER_OR_SWITCH`, `GPU_AUXILIARY_POWER_AND_TITANIUM_PSU`, `STORAGE_DRIVE_BLANKS`, `MATCHED_FABRIC_TRANSCEIVERS_OR_DACS`).
  - Abstract capabilities resolve to concrete vendor/chassis part numbers dynamically via `resolveCapabilityToSku(capability, catalog)`, allowing cross-generation and cross-vendor catalogs to inherit universal intelligence automatically without code changes.

### INV-57: Tiered Test Matrix Architecture & Deterministic Domain Isolation Protocol
- **Pattern**: Running 130+ test suites in an undifferentiated flat run causes developer friction and blocks quick feedback on unit/chaos suites.
- **Rule**: Test suites are strictly partitioned into 4 deterministic tiers:
  1. `📦 Unit Tests` (`tests/unit`, 69 suites): Aspect math, memory/power calculations, schemas, parsers, and preprocessors. Fast, deterministic, zero-network.
  2. `⚡ Chaos & Fault Injection` (`tests/chaos`, 38 suites): Adversarial fuzzing, race conditions, memory stress, mutex locks, and crash recovery.
  3. `🔗 Integration & Portfolio Certification` (`tests/integration`, 23 suites): Full BOM verifications, conflict graphs, cross-gen diffs, Excel tallies, and portfolio audits.
  4. `🌐 End-to-End & Browser Workflows` (`tests/e2e`, 3 suites): Headless browser UI workflows, download validations, and live CLIC pipelines.
- **Fast Default**: `npm test` defaults to `node scripts/maintenance/run_test_matrix.js --tier fast` (130 suites covering unit + chaos + integration), allowing instant iteration without blocking on multi-minute headless browser automation.
### INV-58: Monolithic CLI Pipeline Decomposition & RAG Hotspot Modularization Protocol
- **Pattern**: High-level CLI entry points (`build_catalog.js`, `eval_boq.js`) and catalog search engines (`local_rag_search.js`) tend to accumulate cyclomatic complexity ($CC > 200$), conflating argument parsing, normalization, diffing, RAG querying, and file serialization.
- **Rule**: All CLI entry points and orchestration tools MUST adhere to single-responsibility stage decomposition with a strict upper bound of $CC \le 10$ for entry `main()` functions:
  - `build_catalog.js` MUST isolate table expansion, subcategory matching, taxonomy resolution, history price reconciliation, chassis variant injection, and export into discrete lifecycle stages.
  - `eval_boq.js` MUST isolate argument normalization, BOQ ingestion, aspect pre-checks, RAG validation, report generation, and structured `__EVAL_RESULT_JSON__` serialization into discrete pipeline stages.
  - `local_rag_search.js` MUST partition multi-dimensional search routines into processor searches, category matching, and chassis variant matching, maintaining orchestrator complexity at $CC \le 15$.
  - Domain aspect checkers MUST encapsulate literal part numbers into declarative lookup sets at the module header.
- **Enforcement**: `tests/unit/test_circular_and_complexity.js` enforces automated complexity ceilings on these functions as an automated gate.

### INV-59: Memoized O(1) Catalog SKU Index Contract
- **Pattern**: Aspect checkers and conflict resolution matrix previously performed repeated nested `.find()` loops over `catalogData.entries` and each entry's `skus` array ($O(N \times M \times K)$ complexity).
- **Rule**: All physical aspect checkers (`compute_thermal.js`, `memory_channel.js`, `networking_ocp.js`, `pcie_riser.js`, `power_environment.js`, `storage_tri_mode.js`, `support_manufacturing.js`, `support_services.js`) and resolution engines (`resolution_matrix.js`) MUST use `buildCatalogSkuIndex(catalogData)` from `scripts/lib/catalog/sku.js` to look up SKU metadata in $O(1)$ amortized time via the cached `catalogData._skuIndex` Map.

### INV-60: Customer Tender Base SKU Quantity Accumulation Protocol
- **Pattern**: Customer BOQ spreadsheets often list identical base hardware part numbers (e.g. `P64707-B21` memory) multiple times across separate rows or tender partitions. Overwriting entries in `fullBomMap` caused severe quantity drops.
- **Rule**: `conflict_graph.js` and all BOQ preprocessors MUST accumulate quantities (`fullBomMap.get(sku).quantity += item.quantity`) when identical base SKUs appear in an input tender, preventing hardware quantity loss.

### INV-61: Dynamic Generation-Aware Hardware Mandatory SKUs & SSOT Contract
- **Pattern**: Conflicting mandatory SKU dictionaries across `catalog_rules.js` and `boq_evaluator.js` with hardcoded heatsinks and riser cable kits caused cross-generation component pollution.
- **Rule**: `catalog_rules.js` is the Single Source of Truth (`DEFAULT_MANDATORY_SKUS`). `boq_evaluator.js` MUST re-export this dictionary. Mandatory heatsinks and riser cable kits MUST be dynamically resolved via `resolveMandatoryHeatsinkSku(gen)` and `resolveMandatoryCableKit(gen, riser)` to correctly assign Gen12 vs Gen11 parts (`P48818-B21` / `P76453-B21` for Gen12; `P74792-B21` / `P56073-B21` / `P56074-B21` for Gen11).

### INV-62: Strict Delimited Lifecycle & 90-Day Warning Token Parsing Protocol
- **Pattern**: Using `.startsWith('90')` in `support_services.js` falsely flagged standard non-EOL SKUs beginning with "90" as 90-Day Warning items.
- **Rule**: Lifecycle status checks for 90-Day Warnings and EOL parts must require strict delimiter tokens: `/^(?:90|EOL)\s+/i`, `[90]`, `(90)`, or `90-DAY`.

### INV-63: Enterprise Tender Multi-Cluster Sheet Preprocessing & Documentation Filtering Protocol
- **Pattern**: Enterprise customer quotes frequently prepend non-BOM documentation sheets (e.g. "Cover Page", "Terms & Conditions", "Readme"). Reading `wb.SheetNames[0]` caused empty BOM crashes.
- **Rule**: `multi_cluster_splitter.js` MUST evaluate sheet names with `isNonBomSheet` (filtering `audit`, `terms`, `notes`, `readme`, `cover`, `compliance`, `matrix`) to dynamically target the true BOM data sheet.

### INV-64: Frontend Canonical Product Taxonomy & Invariant INV-36 Adherence
- **Pattern**: Stale form-factor model names (such as `'DL380_Gen12_SFF'`) in UI hooks and selectors violated Invariant INV-36 and caused blank catalog views.
- **Rule**: Frontend selectors, hooks, and API routes MUST standardize on the canonical generation model directory (`'DL380_Gen12'`). `useCatalogs.js` MUST provide automated fallback to the first available catalog if the selected key is not found.

### INV-65: Modern CDP Download Behavioral Protocol & Filename Preservation
- **Pattern**: `Page.setDownloadBehavior` is deprecated, while `Browser.setDownloadBehavior` with `allowAndName` explicitly stores files under download GUIDs.
- **Rule**: Automated downloads use `Browser.setDownloadBehavior` with `{ behavior: 'allow', downloadPath: path.join(os.homedir(), 'Downloads'), eventsEnabled: true }`, falling back to deprecated `Page.setDownloadBehavior` only for older Chromium. Consumers still validate and rename the completed file from the `suggestedFilename` event when required.

### INV-66: Browser Security Preservation Protocol
- **Rule**: Automation MUST NOT disable Safe Browsing or weaken the user's Chrome security profile. Download permission is scoped to the active automation flow, files are validated after completion, and paths are resolved dynamically with `os.homedir()`.

### INV-67: Zero-Human-in-the-Loop Google Sheets & Docs Workspace Automation Protocol
- **Pattern**: Google OAuth blocks personal `@gmail.com` accounts from requesting sensitive scopes (`spreadsheets`, `documents`, `drive`) using the default generic `gcloud` developer client ID with the error *"This app is blocked"*.
- **Rule**: AI agents MUST NOT instruct users to authenticate sensitive Workspace scopes without an owned client ID. Zero-human-in-the-loop Google Sheets and Google Docs operations MUST use either:
  1. An operator-owned Desktop App OAuth client stored outside the repository, with the operator registered as a Test User and authenticated through Application Default Credentials; OR
  2. A dedicated service account whose key is stored outside the repository, with access limited to a designated Drive folder (`GOOGLE_DRIVE_FOLDER_ID`).

### INV-68: Evidence-Gated Shared Accessory Compatibility Protocol
- **Pattern**: Product isolation filters MUST reject foreign chassis/base rows without discarding ordinary accessory rows merely because the prior snapshot also contained another chassis.
- **Rule**: Rails, cable-management arms, storage enablement kits, cables, power cords, and transceivers may be reused across products or generations only through an exact-product, evidence-backed `KnowledgeDelta`; shared presence elsewhere is not proof of compatibility.
- **Scope**: A reusable record MUST use `CHASSIS_SPECIFIC` scope and include `sharedAccessoryVerified: true`, an approved `accessoryClass`, exact `compatibleProductIds`, `verificationStatus: VERIFIED`, trusted `compatibilityEvidenceType`, and non-empty `verificationSourceIds`.
- **Isolation**: Local registry projection and NotebookLM payload isolation MUST apply the same gate. If an accessory disappears from a target product's fresh OCA scrape, preserve its discontinued and price history; never reactivate it from another product's catalog.

### INV-69: Delta-Only SKU Lifecycle & Business Retention Protocol
- **Pattern**: Catalog diffs MUST capture SKU addition/removal/reinstatement, price changes, lifecycle badge/status transitions, start dates, and vendor discontinuation dates. Stable scrapes MUST NOT append redundant `UNCHANGED` price-history events.
- **Rule**: A SKU removed from the active OCA catalog receives exactly one `REMOVED` event and a compact tombstone marked `trackingState: STOPPED_AFTER_REMOVAL`; subsequent snapshots MUST NOT move its original discontinuation date or repeatedly remove it.
- **Retention**: Compact lifecycle evidence remains available for historical deal validation, obsolete-part rejection, replacement reasoning, and reinstatement detection. Extended retention may be marked `BUSINESS_RELEVANT` when deal or verified-rule references exist. Excel, Google Sheet, local audit, and NotebookLM representations MUST expose consistent lifecycle and retention state. Reappearance in the exact target-product catalog changes the state to `REINSTATED` and resumes tracking.

### INV-70: Evidence-Gated Human Resolution & Anti-Hallucination Protocol
- **Pattern**: Portal messages, NotebookLM answers, generic feedback, and any record merely labeled `HUMAN_HITL` are observations, not active rules. They MUST default to product-scoped quarantine and MUST NOT update catalog rules, the master registry, confidence, or NotebookLM sources.
- **Rule**: Promotion requires an exact product-generation target, valid SKU syntax, explicit scope, a named reviewer, independent reasoning, an affirmative verification decision, and at least one traceable trusted evidence record. Contradictions additionally require the reviewer to identify the superseded rule IDs.
- **Fingerprinting**: Knowledge records use a stable semantic SHA-256 fingerprint. Repeated observations increment occurrence metadata and merge reasons instead of creating stale duplicates. Promotion and rejection write immutable decision-ledger entries; corrupt governance files fail closed. Confidence may increase only after successful evidence-backed validation.

### INV-71: Requirement-Led Part Resolution & PCIe Topology Evidence Protocol
- **Pattern**: A malformed, unknown, or description-mismatched part number MUST be resolved from the complete requirement context and the missing component role. SKU edit distance is a tie-breaker only after the candidate matches the inferred category; a close SKU from another category is forbidden.
- **Rule**: Automatic replacement requires an exact confirmed product generation, catalog membership, category certainty, score `>= 0.90`, and a top-candidate margin `>= 0.08`. Otherwise the original item remains unchanged and the Ambiguity Inbox records `NEEDS_HUMAN_CLARIFICATION`; unconfirmed decisions are not learning-eligible.
- **PCIe Topology**: PCIe capacity results MUST expose per-node and cluster demand/capacity, mechanical versus electrically active slots, x16 capacity, riser position, parsed catalog lane evidence, confidence, and whether exact-product NotebookLM verification is required.

### INV-72: Customer Input Workflow Discipline & Scoped Learning Protocol
- **Pattern**: When given a customer BOQ or configuration question, AI agents often attempt to write one-off scripts, scratch classes, or ad-hoc parsers, bypassing the battle-tested production pipeline.
- **Rule**: Whenever an AI agent receives a customer BOQ spreadsheet, quote, tender excerpt, or configuration query, the agent **MUST ALWAYS route the request through the canonical evaluation pipeline** (`scripts/evaluators/eval_boq.js`, `scripts/lib/boq/boq_evaluator.js`, `scripts/lib/boq/multi_cluster_splitter.js`). Writing ad-hoc classes, scratch parsers, or temporary bypass scripts is STRICTLY PROHIBITED.
- **Verification & Parallel Paths**: All evaluations must execute the 7 physical aspect checkers, cross-reference mapped NotebookLM instances (`scripts/config/notebooks.json`), validate 100% buildability against CLIC/OCA constraints, and synthesize 5-tier ranked solutions (Rank 1A, 1B, 1C + Ranks 2-5). Unbuildable solutions receive 0 rank.
- **Scoped Learning**: Closed-loop feedback must be strictly scoped: universal/family rules are saved to `outputs/history/master_knowledge_registry.json`, while chassis-specific rules are saved to `outputs/{Family}/{Gen}/{Model}/catalog_deltas.json` and synchronized only to that product's target Notebook ID.
- **Ask When Ambiguous**: If an ambiguous requirement, missing chassis mapping, or unresolvable conflict arises, the agent **MUST actively ask the user for clarification** rather than making unverified assumptions. All outputs must display complete SKUs, unit prices, extended prices, total rank budgets, and Dual-Brain verification badges.

### INV-73: Zero-Repetition Autonomous Customer BOQ Execution & Up-Front Clarification Protocol
- **Pattern**: Users submit customer BOQs with high-level directives such as "provide solution for config #X in sheet Y", "evaluate all configs in sheet Y", or "evaluate all configs across all sheets". AI agents previously required users to repeat execution instructions, remind them of schemas, or prompt for missing badges/budgets.
- **Rule**: AI agents **MUST NOT require the user to repeat instructions, remind them of schemas, or prompt for missing badges/budgets**. The agent automatically recognizes the full lifecycle goals and delivers the complete, certified solution end-to-end.
- **Up-Front Ambiguity Triage (Zero-Hallucination Gate)**: Before launching deep execution, the agent validates input sanity (target sheets, cluster isolation, product generation, hardware contradictions). If any critical ambiguity exists, the agent **MUST actively clarify immediately in the initial turn** rather than guessing, hallucinating, or making ungrounded assumptions, ensuring a high confidence score ($\ge 0.95$).
- **Autonomous End-to-End Delivery**: Once unambiguous, the agent executes the complete pipeline: cluster partitioning (`multi_cluster_splitter.js`) $\rightarrow$ 7 physical aspects $\rightarrow$ deep NotebookLM RAG $\rightarrow$ 100% buildable 5-tier strategy matrix (Rank 1A/1B/1C through Rank 5; unbuildable = 0 rank) $\rightarrow$ line-by-line financial breakdown (Part Number, Description, Qty, Unit Price, Extended Price, Total Budget) $\rightarrow$ Dual-Brain verification badges $\rightarrow$ scoped knowledge delta sync without user prompting.

### INV-74: Least-Delta Combinator & Troublesome SKU Pruning Protocol
- **Pattern**: Certain customer BOQ line items require extensive downstream additions (e.g. storage controllers requiring multiple cages, expanders, and cables), or are discordant with the server architecture.
- **Rule**: When a SKU triggers disproportionate enablement additions or cannot be fulfilled cleanly, the engine synthesizes a least-delta ranked variant (Rank 1L / Rank 1M) evaluating alternative valid replacements (`findBestAlternativeInCatalog`) or SKU pruning, minimizing net mutation while guaranteeing 100% buildability.

### INV-75: Auditable Decision Trace Ledger Protocol
- **Pattern**: Modifications, part additions, and pruning previously had scattered or ephemeral reasoning.
- **Rule**: Every part addition, substitution, or removal across all rank tiers MUST record an immutable decision trace entry in `outputs/history/decision_traces.json` capturing the rule ID, target SKU, trigger reason, and attribution brain (`DETERMINISTIC_PHYSICAL_MATH`, `RAG_AGENTIC_GUARDRAIL`, `VALUE_ENGINEERING`, `HITL_FEEDBACK`).

### INV-76: Value Engineering & Deal Optimizer Protocol
- **Pattern**: Standard configuration tools stop at basic buildability without identifying commercial deal optimization opportunities.
- **Rule**: Following 100% buildability certification, the engine applies non-disruptive value engineering rules (CPU tier alignment, NIC bandwidth right-sizing, PSU efficiency matching, warranty alignment) to calculate potential CapEx/OpEx savings. Recommendations are surfaced in the UI, markdown reports, and telemetry.

### INV-77: QuickSpecs vs Live OCA Reconciliation & Expansion Guidance Protocol
- **Pattern**: Live OCA scrapes can omit sub-choice options if DOM toggle expansion is incomplete.
- **Rule**: Scraped live OCA catalogs are periodically reconciled against vendor QuickSpecs PDFs/text payloads. Discrepancies automatically emit `expansion_guidance.json` in `outputs/{Family}/{Gen}/{Model}/history/` to instruct the CDP scraper to trigger dynamic sub-choice expansion.

### INV-78: Unified Presales Intent Query Routing & Single-User Protocol
- **Pattern**: Customer presales queries vary across freeform Q&A, sizing requests, BOQ reviews, and BOM reconciliations.
- **Rule**: Inbound queries route through `route_query.js` into 5 canonical tracks (`FREEFORM_QA`, `RFP_SIZING_TO_BOM`, `BOQ_EVALUATION`, `BOM_RECONCILIATION`, `CATALOG_INTELLIGENCE`). In single-user environments, all user roles are unified to eliminate administrative approval friction while maintaining strict automated validation.


### INV-79: DL380a Gen12 GPU Accelerator Domain Isolation & Riser Architecture
- **Pattern**: Standard DL380 rules or components must not bleed into DL380a GPU server configurations.
- **Rule**: DL380a Gen12 is a dedicated AI accelerator server supporting up to 8DW/16SW GPUs with captive GPU risers. Quotes/BOQs specifying DL380a must evaluate strictly against outputs/ProLiant/Gen12/DL380a_Gen12 and dedicated NotebookLM notebook b233ec88-4682-4164-a801-3ee6ca649dc1. Never route to standard DL380_Gen12.

### INV-80: Minimal Supported Memory Population Hierarchy vs Channel Interleaving
- **Pattern**: Dual-socket platforms support hierarchical memory configurations: [1, 2, 4, 6, 8, 12, 16] DIMMs per CPU.
- **Rule**: Sizing engines MUST recognize minimal entry configurations (e.g. 4x 32GB DDR5 on dual-socket systems) as 100% buildable, passing with an informative interleaving advisory rather than a fatal validation error.

### INV-81: Diskless Compute Nodes & No Local Drive FIO Enablement Kit (873763-B21)
- **Pattern**: Omitting local drives on stateless SAN/PXE compute nodes triggers factory configuration rules (HPE CLIC Rule 81392308).
- **Rule**: Sizing and evaluation engines MUST inject 873763-B21 (HPE No Drive Configuration FIO Kit) when no local drives and no storage controllers are configured, designating the server as diskless and clearing drive cage requirements.

### INV-82: Dynamic WebLogic AJAX Panels, Missing SKU Discovery & Scraper Resilience
- **Pattern**: OCA subchoice options (accelerators, captive risers, cables) hide in deferred AJAX panels.
- **Rule**: Missing SKUs discovered through customer RFPs or QuickSpecs reconciliation MUST be dynamically backfilled into master workbooks, and cdp.js MUST dispatch jQuery change events to expand all dependent subchoice containers during live scrapes.

### INV-83: Google Sheets & NotebookLM Synchronization Strategy: Full Replace vs Delta Append
- **Pattern**: Appending duplicate catalog rows pollutes RAG embeddings.
- **Rule**: Master catalog grounding sheets (All SKUs) must use Full Replace In Place to prevent polluting semantic vector embeddings with outdated price entries. Telemetry change logs (Price Trails, Knowledge Deltas) must use Delta Append.

### INV-84: Parallel Sub-Path Architectural Branching & Multi-Mode Sizing Protocol
- **Pattern**: Physical platform capabilities often support multiple valid topologies (e.g. 8DW Interconnect-Optimized vs 10DW Density-Optimized).
- **Rule**: The engine MUST NOT prematurely converge on a single configuration. It MUST synthesize parallel buildable sub-paths (Rank 1A and Rank 1B) and present a side-by-side trade-off matrix.

### INV-85: Universal Multi-Domain Presales Process Architecture & Zero-Hardcoded Multi-Mode Discovery Protocol
- **Pattern**: Domain-specific hardcoding limits scalability across compute, storage, and networking.
- **Rule**: Process architecture applies universally across all server families (ProLiant, Synergy, Cray, Superdome), storage architectures (Alletra, MSA, StoreEver), and networking fabrics. Formulates the 4 proactive presales qualifying dimensions (Workload DNA, Facility & Electrical, Fabric/Interconnect, Data/Lifecycle) on Turn 1.

### INV-86: Hierarchical Container Trees & Spatial Presales Reasoning Protocol
- **Pattern**: Complex enterprise infrastructure must follow structured physical containment.
- **Rule**: Configurations are structured as 4-tier containment trees: Level 0 Enclosure -> Level 1 Modules -> Level 2 Enablement/Risers/Cages -> Level 3 Leaf SKUs. Sizing engines propagate physical constraints bi-directionally and verify spatial placement.

### INV-87: Internal Storage Controller Backplane Cabling & Thermal Escalation Protocol
- **Pattern**: Internal storage controllers cannot exist in factory CTO containers without a physical drive backplane to cable into.
- **Rule**: Configuring an internal storage controller (MR416i-p, MR408i-o, SR932i-p) into a chassis with 873763-B21 (No Drive Kit) is an unbuildable conflict. The engine MUST: (1) Prune 873763-B21, (2) Inject primary 8SFF Tri-Mode Drive Cage Kit (P75741-B21 Gen12 / P48813-B21 Gen11), (3) Inject Box 2 Controller Cable Kit (P76456-B21 Gen12 / P48918-B21), (4) Escalate cooling to High-Performance Fan Kit (P48820-B21), and (5) Inject 96W Battery (P01366-B21) and Enablement Cable (P48918-B21). Rear boot devices (NS204i-u v2 P78279-B21) require rear mount kit (P74755-B21) and do not satisfy front drive cage cabling.

### INV-88: Holistic Solution Coexistence & Dual-Brain Dynamic Grounding Protocol
- **Pattern**: Evaluating component additions in isolation causes delta myopia and unbuildable factory orders.
- **Rule**: Whenever an existing solution is expanded, modified, or customized, the engine MUST re-evaluate the entire coexisting BOM across all 7 physical aspects simultaneously. Combines high-speed static pre-checks with patient NotebookLM RAG grounding, parsing learned vendor rules into master_knowledge_registry.json for continuous closed-loop self-improvement.

### INV-89: Zero-Touch Browser Auto-Launch, Saved-Credential SSO & Stale-Session Tab 1 Self-Healing Recovery Protocol
- **Pattern**: WebLogic OCA is an enterprise Java state machine tied to short-lived SAML tokens. In-place browser reloads (`location.reload()`) in an active OCA tab break session continuity and yield unrecoverable blank pages, 403 Forbidden, or broken login loops. WebLogic frequently encounters silent freezes (infinite loading spinners without explicit timeout dialogs) or DOM detachments.
- **Rule**: AI agents and scraper pipelines MUST NOT prompt the human user to manually launch Chrome or log into HPE Partner Portal. `browser_launcher.js` automatically checks port 9222 and launches Google Chrome with `--remote-debugging-port=9222 --user-data-dir=.chrome_sso_profile https://partner.hpe.com/web/prp`. `navigate_oca.js` clicks `#oktaSignInBtn` and dispatches clicks to `#onepass-submit-btn` with auto-saved credentials. When a session times out, freezes, or fails:
  1. Close the stale OCA tab via CDP (`/json/close/{targetId}`).
  2. Switch focus back to Tab 1 (`https://partner.hpe.com/group/prp`).
  3. Re-authenticate via `performAutomatedSignIn()` if the portal expired.
  4. Reload Tab 1 via CDP (`Page.reload`) to regenerate fresh SAML tokens and re-bind Quick Links.
  5. Click "One Config Advanced" in Quick links (`#quick-links-807 a` / `eServiceId=187402`) to spawn a pristine OCA tab.
  6. Re-navigate the fresh tab to the target chassis Menu tab and resume operations seamlessly without human intervention.

### INV-90: Autonomous Zero-Touch Google Drive ADC Token Health & Weekly Self-Healing Gate
- **Pattern**: Google OAuth access tokens expire and refresh tokens hit 7-day cliffs on personal desktop clients.
- **Rule**: Prior to any Google Drive upload or sync, the engine executes `ensureGoogleAuthValid({ autoHeal: true })`. AI agents are 100% pre-authorized to execute autonomous healing (`npm run auth:heal`) without waiting for human approval.

### INV-91: Intra-Category & Presales Mutual Exclusion Protocol
- **Pattern**: Contradictory components selected within the same category cause immediate CLIC build failures.
- **Rule**: Enforce mutual exclusion: AC vs -48VDC power supplies; disparate PSU wattages/efficiencies in redundant pairs; Onsite Installation (`HA114A1`) vs Remote Deployment (`HA454A1`); DDR4 vs DDR5; RDIMM vs LRDIMM vs MRDIMM; disparate processor steppings/models across dual sockets.

### INV-92: SaaS Cloud Subscription vs. Physical Hardware Break-Fix Support Delineation Protocol
- **Pattern**: SaaS software subscriptions (Compute Ops Management) and physical hardware support (Pointnext Tech Care) are distinct operational contracts.
- **Rule**: Software SaaS subscriptions cannot substitute for physical server break-fix warranty. A solution containing SaaS software without hardware break-fix support must emit an advisory notice.

### INV-93: Tiered Multi-Brain Verification & CLIC Advice Divergent Multi-Path Resolution Protocol
- **Pattern**: CLIC Advice and physical topology often allow multiple valid buildable remedies (e.g. SAS Expander vs 2nd RAID Controller).
- **Rule**: Warnings are separated from unbuildable errors. When multiple valid resolution paths exist, both branches are preserved as divergent options feeding the 5-Tier Strategy Matrix (Rank 1A, Rank 1B, Rank 1L least-delta, Rank 2 performance, Rank 5 budget).

### INV-94: Price Sanity, Clean Header Parsing & Anti-Fabrication Guardrail
- **Pattern**: Incomplete table header mapping in WebLogic OCA caused "cost (usd)" to be unmapped, and numeric fallbacks occasionally mistook order quantities (e.g. 1, 2) or part numbers as prices.
- **Rule**: `parseSingleTableRow` in `dom_extract.js` explicitly maps all cost header variants (`cost`, `cost (usd)`, `ext cost`, `extended price`, `price`) to numeric prices. Fallbacks strictly reject quantities and SKU-like strings. Staging audit `verify_excel_tally.js` fails hard if quantity-as-price or SKU-as-price violations are found.

### INV-95: Cross-Chassis Portfolio Price Backfill Protocol
- **Pattern**: When a newly scraped chassis has unrendered prices for shared commodity components (e.g. DL360 Gen11 where WebLogic OCA rendered $0), but sibling products of the exact same HPE generation have verified historical prices.
- **Rule**: `loadPortfolioPriceBackfill()` in `build_catalog.js` deterministically scans sibling catalogs in the same generation directory (`outputs/ProLiant/Gen11/`) to backfill prices for shared SKUs (CPUs, DIMMs, drives, NICs, cables, FIO kits). Strictly respects Generation Firewalls (`INV-48`) to prohibit cross-generation bleeding, and logs source catalog provenance in build telemetry.

### INV-96: Catalog Scraped & Certified Pre-Flight Gate
- **Pattern**: When evaluating customer BOQs, un-scraped chassis lack ground-truth wattages, slot counts, base prices, and CTO variants.
- **Rule**: Prior to running physical checks, `eval_boq.js` and `boq-eval-skill` MUST assert `isCatalogCertified(chassisId)` from `catalog_discovery.js`. If `outputs/{Family}/{Gen}/{Model}/` is missing or contains 0 SKUs, the engine halts immediately with `[ERR_UNSCRAPED_SOLUTION]`, directing the operator to run `scrape_oca_solution.js` or trigger the scraper in the dashboard to establish certified ground truth first.

### INV-97: Autonomous Solution Strategy Double-Check Protocol
- **Pattern**: The 5-Tier Strategy Matrix synthesizes Rank 1 (Intent Match) and Rank 1L (Least Delta Alternative), adding enablement kits (cables, expanders, risers, DC lugs) that must be verified against vendor spec sheets.
- **Rule**: After strategy matrix generation, the engine automatically verifies the synthesized solution against the product's NotebookLM notebook via `validateSolutionWithEphemeralSource()` in `nlm_solution_source_validator.js`. The multi-rank solution CSV is temporarily attached as an ephemeral source in NotebookLM, validated across all 7 physical aspects, and immediately detached per `INV-24`, recording verification attestation in `evalResults.solutionDoubleCheck`.

### INV-98: Generation-Isolated vs Universal Knowledge Scoping
- **Pattern**: Knowledge deltas must be segregated to prevent cross-generation rule contamination (e.g. DDR4 vs DDR5).
- **Rule**: `CHASSIS_SPECIFIC` deltas reside exclusively in `outputs/{Family}/{Gen}/{Model}/history/catalog_deltas.json` and sync exclusively to that product's notebook. `UNIVERSAL_CROSS_CHASSIS` rules reside in `outputs/history/master_universal_knowledge_charter.md` covering universal truths (e.g. FIO `#0D1` suffixing, redundant PSU matching, minimum OS core licensing).

### INV-99: Zero Unearned Verification Badges & Evidence-Derived Reporting
- **Pattern**: Status claims must strictly derive from runtime evidence rather than static strings or ungrounded assumptions.
- **Rule**: All exported Excel workbooks, JSON results, and UI dashboard badges MUST derive verification tags strictly from verified runtime evidence (`rank.evidence`, `rank.isBuildable`, `rank.cloudGrounded`). Fabricating static labels like "100% Factory Buildable in CLIC" or "7/7 ASPECTS PASS" when evaluation is ungrounded, pending, or failed is strictly prohibited.

### INV-100: Solution Source Ephemeral Validation & Robust Cleanup Protocol
- **Pattern**: Candidate solution manifests temporarily attached to NotebookLM must not linger in production notebooks.
- **Rule**: Ephemeral candidate solution sources attached to NotebookLM for multi-rank validation MUST be removed using `nlm source delete <sourceId>` enclosed within a guaranteed `finally` block, ensuring no candidate artifacts persist in the knowledge base or violate Customer BOQ Isolation (`INV-24`).

### INV-101: Multi-Sheet Sheet Name Integrity & Quantity Conservation
- **Pattern**: When evaluating multi-sheet tenders, evaluating the wrong worksheet duplicates clusters and invalidates BOM counts.
- **Rule**: When evaluating multi-sheet tenders with an explicitly requested `targetSheet`, `readBoqLines` in `boq_evaluator.js` MUST evaluate that exact sheet. If the requested sheet is missing from the workbook, the engine MUST throw a hard exception (`[ERR_SHEET_NOT_FOUND]`) rather than silently defaulting to the first sheet.

### INV-102: Immutable Candidate Manifest & Non-Destructive Knowledge Deduplication
- **Pattern**: Candidate mutations must not contaminate shared arrays, and multi-dependency rules must not overwrite each other.
- **Rule**: Every candidate in the 5-Tier Strategy Matrix MUST maintain an immutable part manifest with an independent SHA-256 hash. Knowledge delta deduplication in `continuous_learning_verifier.js` MUST match on `(affectedSku, ruleType, requiredDependencySku)`, ensuring that distinct physical dependencies are never overwritten.

### INV-103: Cross-Platform Atomic File I/O & Windows Lock Resilience
- **Pattern**: File watchers and anti-virus locks on Windows cause `fs.renameSync` to intermittently raise `EPERM`.
- **Rule**: Atomic filesystem operations in `scripts/lib/system/fs_compat.js` MUST catch both `EXDEV` and `EPERM`, falling back transparently to `copyFileSync` and `unlinkSync` to guarantee cross-platform atomic writes.

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

Run `node -e "require('./scripts/lib/sync/post_flow_sync.js').cleanTestPayloads()"` to purge stale test payloads from `outputs/history/` if they accumulate.
