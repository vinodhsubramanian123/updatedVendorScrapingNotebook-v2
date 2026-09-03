# Project Rules — HPE OCA Catalog Intelligence

## Project Overview
This workspace contains tools for scraping, parsing, and organizing HPE server product catalog data from the **OCA (Online Configuration Application)** portal. The primary outputs are classified Excel workbooks + JSON companions for import into Google Notebook LM and the Vendor BOM Comparison Engine.

---

## Pipeline State of Health (Last Updated: 2026-08-22)

### ✅ Certified Products & Portfolio Status (Last Audited: 2026-08-22)
| Product | Family | Output Prefix | Unique SKUs | Entries | QuickSpecs PDF | Status |
|---------|--------|---------------|-------------|---------|----------------|--------|
| HPE ProLiant DL380 Gen12 | ProLiant | `DL380_Gen12` | 302 HW / 667 Svc (969 total) | 71 (Full OCA Scrape) | Advisory (No QS Link) | ✅ 100% PASS (Full Pipeline & Cloud NLM) |
| HPE ProLiant DL380 Gen11 | ProLiant | `DL380_Gen11` | 478 HW / 1109 Svc | 76 (Full OCA Scrape + Active GPLs) | ✅ Verified (2.06 MB) | ✅ 100% PASS (Full Pipeline & Cloud NLM) |
| HPE ProLiant DL380a Gen12 | ProLiant | `DL380a_Gen12` | 1 (8DW/16SW GPU CTO) | Baseline + Deltas | ✅ Verified (NotebookLM) | ✅ Baseline & Delta PASS |
| HPE ProLiant DL145 Gen11 | ProLiant | `DL145_Gen11` | 1 (AMD EPYC Edge CTO) | Baseline + Deltas | ✅ Verified (NotebookLM) | ✅ Baseline & Delta PASS |
| HPE StoreEver MSL3040 Tape Library | StoreEver | `MSL3040_Tape` | 2 | 1 (Baseline + CTO variants) | ✅ Verified (2.06 MB) | ✅ Baseline PASS |
| HPE Cray Supercomputing GX5000 Rack | Cray | `GX5000_General_RACK` | 2 | 1 (Baseline + CTO variants) | ⚠️ Advisory (No DOM link) | ✅ Baseline PASS |
| HPE Synergy VC 100Gb F32 Module | Synergy | `SY100Gb_F32_Module` | 3 | 1 (Baseline + CTO variants) | ✅ Verified (0.89 MB) | ✅ Baseline PASS |
| HPE Alletra Storage System | Alletra | `Alletra_Storage_System` | 3 | 1 (Baseline + CTO variants) | ⏳ Configured in map | ✅ Baseline PASS |

**Total Verified Portfolio Intelligence**: **8 Canonical Product Generations Certified** across 5 families. 34/34 Aspect Math Tests + 5/5 Automated Benchmarks + 7/7 Pipeline Guardrails + 15/15 Excel Audit Checks Certified across 50+ test suites.

> **SKU Count Source of Truth**: The correct HW SKU count for DL380 Gen12 is **302** (unique hardware part numbers) and **667** service SKUs. SFF, LFF, and EDSFF form factor variants are tracked within `DL380_Gen12`. The number of entries refers to categorized option groups. `updateScrapedRegistry()` reads `liveCatalogJson.metadata.totalUniqueSKUs` post-promotion.

### ✅ Automated Evaluation Benchmark Suite (`tests/integration/test_boq_eval_benchmarks.js`)
- **Pass Rate**: 5/5 Scenarios (100.0%)
- **Recall Rate**: 100.0%
- **Precision Rate**: 100.0%
- **Strategy Matrix Tiers**: 5 Tiers Validated (Rank 1 through Rank 5)
- **Cloud NotebookLM Grounding**: Active OAuth Profile authenticated; `DL380_Gen12_OCA_Catalog_2026-08-28` & `DL380_Gen11_OCA_Catalog_2026-08-28` synced.

---

## Canonical Directory Layout

```
vendorNotebookSolution/
├── .agents/
│   ├── AGENTS.md                          ← project rules, state of health & technical invariants
│   ├── DATA_DICTIONARY.md                 ← JSON schemas & data contracts
│   └── skills/
│       ├── design-taste-frontend/         ← Anti-slop UI aesthetics (Geist, Emerald Green, shapes)
│       ├── orchestrator-workflow-skill/   ← macro 6-stage continuous learning lifecycle
│       ├── oca-catalog-scraper/           ← step-by-step scraping skill
│       ├── oca-portal-navigator/          ← hands-free partner portal & oca navigator skill
│       ├── boq-eval-skill/                ← BOQ validation & pre-flight skill
│       ├── nlm-skill/                     ← Gemini NotebookLM RAG integration
│       └── knowledge-sync-skill/          ← delta sync & knowledge registry skill
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
8. **Hybrid Zero-Touch Scraping Workflow**: Agents MUST NOT attempt to bypass or automate the HPE SSO login sequence. The scraper relies on a Zero-Touch `/api/launch-browser` API that spins up Chrome with a persistent `--user-data-dir`. The human user MUST manually log in and click the OCA link in that specific browser window. Once loaded, the scraper attaches to CDP port 9222 headlessly.

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

