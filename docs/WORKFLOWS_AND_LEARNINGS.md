# Workflows, Pipelines & Full Learnings

## 1. 6-Stage BOQ Evaluation Workflow
1. **Multimodal Parsing**: Multimodal OCR service (`ocr_service.js`) backed by `gemini-3.6-flash` processes images/PDFs into structured BOQ JSON with automated API key rotation and retry.
2. **CTO Normalization**: Resolves fractional math for multi-node chassis configurations.
3. **7-Aspect Math Guardrails**: Validates CPU TDP limits, memory channel symmetry, power lug kits, storage controllers & battery, PCIe expansion slots, chassis base variants, and Pointnext Tech Care SLAs.
4. **NotebookLM Grounding**: Queries HPE QuickSpecs for absolute truth on dependencies.
5. **Agentic Verification (Guardrail Loop)**: Gemini LLM orchestrates MCP tools to resolve conflicts, re-simulate builds, and learn missing knowledge.
6. **Partner Portal Re-verification**: Cross-checks solutions against official HPE portals to derive `KnowledgeDeltas`.

---

## 2. System Learnings & Architectural Improvements
- **Deterministic FIFO Key Rotation & Quota Management (429 & Daily Quota Errors)**: High concurrency triggers strict Gemini API limits. We solved this by creating a dedicated, stateful Key Rotation Manager (`gemini_rotator.js`). Instead of random key selection, it uses a deterministic FIFO queue:
  - **Deterministic Head-of-Queue**: The system always uses the active Head key at the top of the queue.
  - **Demote-to-Bottom on 429 / Quota Limit**: When a key encounters a rate limit (HTTP 429 / Quota Exhaustion / Daily Limit), it is marked exhausted until midnight UTC, removed from the head, and pushed to the bottom of the queue.
  - **Immediate Pop & Retry**: The next active key immediately pops up to the top and seamlessly executes the request.
  - **Day-Rollover Auto-Restoration**: As soon as the UTC calendar day rolls over, all exhausted keys automatically reset to active status and rejoin the rotation.
  - **State Persistence**: Tracked atomically in `outputs/history/gemini_keys_state.json`.
- **Hallucination Prevention (Red-Teaming)**: We implemented a background Adversarial Agent (`adversarial_agent.js`) that continuously injects hallucinated BOQs to verify the evaluator's Catch Rate and Precision. This runs asynchronously and updates the `pipeline_telemetry.json` heartbeat.
- **Agentic Autonomy**: We replaced static LLM explanation prompts with an active **Guardrail Loop** using MCP tool definitions (`agentic_guardrail.js`). The LLM can now call `simulate_build`, `query_notebooklm`, and `record_knowledge_delta`.
- **Decoupling Scraping from Core Script**: We observed that globally hardcoded CDP parameters (like a 15,000px scroll threshold) were perfectly tuned for massive chassis like DL380 Gen12 but would artificially cause false-positive validation failures on smaller networking or storage scrapes. We resolved this ambiguity by implementing a Configuration-Driven Profile architecture (`scripts/config/profiles/`), moving generation-specific keywords and heuristics out of regex strings and into maintainable JSON profiles.
- **React Hook Hygiene & Execution Order**: Early conditional returns (`if (isLoading)` or `if (error)`) before `useMemo` or `useEffect` hook definitions break React's hook call order, causing runtime crashes during state changes or tab navigation. All hooks MUST be declared unconditionally at top-level before any rendering conditionals.
- **Lint-Enforced Import Discipline & Zero-Warning Standard**: Unused imports and dead variables pollute bundle size and mask bugs. Integrating `oxlint` into `package.json` (`npm run lint`) enforces a 0-warning, 0-error code quality benchmark across all 101 dashboard source files.
- **Canonical Data Contracts**: Formalizing `.agents/DATA_DICTIONARY.md` ensures full structural compatibility between backend engine data providers (`boq_evaluator.js`, `conflict_graph.js`, `agentic_guardrail.js`) and React UI consumers.
- **Module Resolution & Subsystem Modularization**: All reusable logic is organized into clean domain namespaces under `scripts/lib/` (`aspects`, `boq`, `catalog`, `conflict`, `feedback`, `notebook`, `ocr`, `preprocessor`, `prompts`, `rag`, `scraper`, `sync`, `system`) and unified through a master barrel export (`scripts/lib/index.js`).
- **Clean Root & Artifact Discipline**: Standardized test and runtime output paths so scripts write JSON reports to `outputs/history/` instead of polluting the project root directory.
- **Playwright E2E UI Automation & Log Unpacking**: Headless browser testing revealed that structured SSE log streams can broadcast objects (`{text, timestamp, stream}`) rather than raw strings. Safely coercing log objects before regex matching in `WorkflowStepper.jsx` and adding `data-tab` & `data-testid` attributes ensures robust automated tab navigation and 0-error component rendering.
- **Architectural Loose Coupling via Graphify**: By running `graphify` audits on our `scripts/` and `dashboard/src/` codebases, we successfully identified "God Nodes" and "Surprising Connections". We resolved this by refactoring backend agents to enforce strict loose coupling through a master barrel export (`scripts/lib/index.js`), achieving high cohesion.
- **Visual BOQ Topology & Multi-Product Composable Decomposition**: Complex customer quotes span both standalone rack servers (DL380 Gen12) and composable modular platforms (Synergy 12000 Frames with SY480/SY660 Compute Modules, VC 100Gb F32 Interconnects, and D3940 Storage Modules), as well as Storage Arrays (Alletra Controller Pairs) and Tape Libraries (StoreEver MSL3040). We solved this by decoupling the topology generator into a pure transformation service (`topologyGraphBuilder.js`) with:
  - **Dynamic Product Family Detection**: Automatically discovers whether a solution belongs to ProLiant, Synergy, Alletra, StoreEver, or Cray.
  - **Multi-Level Assembly Structure**: Decomposes Solution Roots $\rightarrow$ Modular Sub-Products $\rightarrow$ 6 Subsystem Busses $\rightarrow$ SKU Nodes and Dependency Gaps.
  - **Interactive 2D Canvas**: SVG coordinate space with cubic Bezier connector curves, animated pulsing paths for missing mandatory gaps, and live zoom/pan/filter capabilities.
  - **Self-Healing Telemetry & Diagnostics**: Real-time diagnostic bar tracking render latency, node count, completeness score, and error boundary resilience.
- **Anti-Slop UI Refactoring (Taste Skill)**: Standard templates often yield visually generic "AI slop". By incorporating the `design-taste-frontend` skill, we standardized on the **Geist** font, strict `rounded-xl` (12px) shapes, tight drop-shadows, and a high-contrast **Emerald Green (`#01A781`) / Slate** palette. This drastically improved data density and visual hierarchy in the React dashboard.
- **Token Optimization via Graphify Semantic Reports**: Agents reviewing this repository to understand code flow and logic MUST consult the dynamic semantic graph by running `/graphify query "<question>"` rather than executing brute-force full-file reads or greps. Graphify summarizes architectural hubs and edges, effectively saving thousands of input tokens while preventing agents from hallucinating dependencies.

---

## 3. MCP Server & Tooling Workflow
The MCP server (`scripts/services/mcp_server.js`) exposes the local rule engine and knowledge bases as standardized tools:
- `validate_boq`: Runs deterministic 7-aspect physical math evaluation on incoming quotes.
- `simulate_build`: Evaluates hypothetical BOM modifications during agentic guardrail loops.
- `query_notebooklm`: Queries grounded HPE QuickSpecs for deep technical constraint verification.
- `query_local_knowledge`: Fast dual-layer local fallback search across catalog and delta rules.
- `record_knowledge_delta`: Ingests portal-verified corrections into the continuous learning registry.

When a BOQ evaluation results in low confidence or physical constraint violations, the orchestrator triggers `runAgenticGuardrail`, which uses these tools iteratively until a buildable 100% confidence solution is synthesized.

---

## 4. Comprehensive Testing & Certification Suite
- **50+ Comprehensive Test Suites**: Organized across 4 tiers:
  - **Unit Tier**: Aspect math checkers, preprocessors, Zod runtime schemas, key rotators, incremental checksums, topology builders, query sanitizers, data validators, error envelopes, drift inspectors, feedback persisters, and Jules task managers.
  - **Chaos & Failure Tier**: Offline pipeline resilience, extreme edge cases, concurrent fuzzing memory stability, task mutex concurrency, CDP DOM extraction resilience, and OCR service resilience.
  - **Integration Tier**: Vendor BOM verifiers, end-to-end multi-product scenarios, conflict graph DAG validation, historical pricing timelines, Excel alignment audits, DL380 Gen12 combinations, whole solution integration gaps, and automated BOQ evaluation benchmarks.
  - **E2E Tier**: Customer BOQ flows, live CLIC portal validation, and Playwright headless browser dashboard tests.
- **100% Pass Benchmark**: Every commit and pull request must achieve a 100% pass rate across all suites.
- **6 Canonical Product Generations Certified**: Verified across `DL380 Gen12`, `DL380 Gen11`, `MSL3040 Tape`, `GX5000 Rack`, `SY100Gb F32 Module`, and `Alletra Storage System`.

---

## 5. DL380 Gen12 E2E Perfection & Fail-Safe Pipeline Learnings
- **Staging Isolation & Master Excel Integrity**: Live scrapes triggered from the Express dashboard execute inside isolated staging paths (`outputs/temp/staging_{chassis}_{ts}`). Promotion to live workspace (`{chassis}_OCA_Catalog.xlsx`, `{chassis}_Catalog.json`) occurs ONLY after `verify_excel_tally.js` certifies 100% row and SKU count accuracy. If any failure occurs, the live catalog remains 100% untouched while failed staging is preserved for diagnosis.
- **NotebookLM RAG Auto-Sync**: Post-flow sync (`scripts/lib/sync/post_flow_sync.js`) automatically refreshes the Markdown RAG payload (`notebook_sync_payload_DL380_Gen12.md`) and updates `notebooks.json` sync status (`lastSyncedAt`, `lastSyncDeltaCount`), maintaining real-time alignment between the Dual-Brain RAG and live catalog data.
- **Closed-Loop Telemetry & HITL Action Ledger**: Every evaluation run logs execution duration, confidence score, and domain violation counts into `pipeline_telemetry.json`. Human-in-the-loop actions (such as split confirmation or feedback drawer submissions) feed directly into `scripts/lib/feedback/feedback_loop.js`, continuously improving evaluation precision over subsequent quote runs.
- **100% Headless UI Perfection**: Utilizing Playwright (`tests/e2e/e2e_headless_ui_test.js`), we achieved a flawless 7/7 (100%) test pass rate on the dashboard UI, confirming zero console or page errors across complex NotebookLM RAG payloads, interactive strategy matrices, and seamless local Node.js API endpoint connectivity.

---

## 6. Customer BOQ E2E Evaluation & Stream Architecture Learnings
- **Chunk Stream Buffering Across TCP/Pipe Boundaries**: Node child processes emitting large payloads (>64KB JSON) split stdout across multiple `data` events. If chunk lines are parsed without maintaining an incomplete line buffer (`lineBuffers[streamType]`), newlines get erroneously injected in the middle of JSON strings (e.g. splitting `"isFixInjected":false` into `"isFixInjecte\n"` + `"d":false`), resulting in `SyntaxError: Unexpected end of JSON input`. `dashboard/server.cjs` now maintains stream chunk line buffering and collects pure unsegmented raw text in `stdoutBuffer`, guaranteeing 100% deterministic JSON extraction.
- **Unambiguous Marker Protocol (`__EVAL_RESULT_JSON__`)**: When a background evaluation process outputs diagnostic logs or post-flow sync telemetry to stdout after emitting the result JSON, naive backwards brace scanning (`lastIndexOf('}')`) can grab braces of trailing log objects. Enclosing the structured evaluator payload in `\n__EVAL_RESULT_JSON__...__EVAL_RESULT_JSON__\n` markers ensures complete isolation from all subsequent log streams.
- **React SyntheticEvent Parameter Safety in Async Handlers**: Passing component callbacks directly as event handlers (e.g. `<button onClick={handlePreprocess}>`) passes a React `SyntheticBaseEvent` as the first argument. If the function accepts optional override arguments (`(overrideFile = null) => ...`), checking `overrideFile instanceof File || (overrideFile && typeof overrideFile.size === 'number')` prevents passing the synthetic event into `FormData.append()`, which would trigger HTTP 400 Bad Request errors.
- **5-Tier Strategy Matrix State Hoisting**: In multi-tiered resolution workflows, child modal components (`ResolutionMatrix.jsx`) expect top-level access to `rankedSolutions` and `conflictGraph`. `App.jsx` flattens and hoists `evalResults.conflictGraph.rankedSolutions` directly to `flatEval.rankedSolutions`, providing multi-path fallback so UI matrix tiers (Rank 1 Intent Preserved through Rank 5 Budget Minimized) render seamlessly without blank screens.
- **End-to-End Real Customer BOQ Verification**: The automated 13-step Playwright test validates the entire real-world workflow using customer quotes:
  1. Dashboard Navigation & Badges
  2. BOQ Ingestion Modal Open
  3. Real Customer Excel Upload
  4. Pre-processing & Multi-Unit CTO Normalization (5x Multiplier, 31 SKUs)
  5. 5-Stage Cleansing Pipeline & Hardware Profile Verification (2x Xeon 6747P 330W, 2048GB RAM, 24x NVMe SSD, AC Power)
  6. Aspect Math & Constraint Pre-flight Trigger
  7. 10-Step Visual Motion Graphics Execution Tracking
  8. Certified 100% Score & Workload DNA Match (`DATABASE_IN_MEMORY`)
  9. Strategy Matrix Modal Inspection
  10. 5-Tier Strategic Resolution Matrix Verification (Rank 1 through Rank 5)
  11. Corrected BOM Excel Generation & Dispatch
  12. Telemetry Metrics & Action Ledger Inspection
  13. Walkthrough Report Compilation (13/13 Steps Passed, 100% Success)

---

## 7. DL380 Gen12 Combinations Suite & Positive/Negative Hardware Matrix Learnings
- **Positive Valid Baseline**: Valid DL380 Gen12 configurations with symmetric 16-DIMM DDR5, dual Xeon CPUs, and redundant PSUs yield a 100% PASS with 0 violations and >90% baseline confidence.
- **Negative Thermal Auto-Injection**: Processors exceeding 240W TDP (`P74573-B21` / `P73299-B21`) trigger thermal aspect violations. The autonomous guardrail auto-resolves and injects `P48820-B21` (High Performance Fan Kit) into Rank 1 solutions.
- **Negative Storage Battery Auto-Injection**: Tri-mode RAID controllers (`MR416i-o` `P55415-B21`) trigger write-back cache warnings. The engine auto-injects `P01366-B21` (96W Smart Storage Battery).
- **Negative Power DC Lug Auto-Injection**: Telco -48VDC power supplies (`865434-B21` / `P17081-B21`) mandate DC terminal lug connectors for electrical safety. The engine auto-injects `P36877-B21`.
- **Negative Memory Topology Channel Math**: 9 DIMMs across dual sockets triggers unbalanced channel warnings and interleaving penalties.

---

## 8. Live Customer BOQ (22-Node DL380 Gen12) & Dual-Brain Architectural Learnings
- **Commercial Option Suffix Rules (BTO vs FIO in CTO Chassis)**: Customer BOQs often contain retail Build-to-Order (`-B21`) part numbers (e.g. `P69728-B21` 64GB DDR5-6400 RAM) inside Configure-to-Order (CTO) factory base chassis (`P73282-B21`). While physical math (DIMM count, 8-channel balance, 1DPC bus speed) passes 100%, HPE OCA factory orderability rules reject `-B21` parts with `BTO products are not allowed in CTO Base Model`. Integrated Option Suffix Validation into `scripts/lib/aspects/memory_channel.js` and `boq_evaluator.js` to automatically flag and map `-B21` parts to their Factory Integrated Option (`-F21`) direct SKU fix (e.g. `P69728-B21` → `P69728-F21`).
- **Cross-Chassis & Cross-Generation Physical Contamination**:
  - *Cross-Chassis Cable Mismatch*: Identified 1U DL360 Storage Controller Cables (`P48918-B21`) erroneously quoted on a 2U DL380 Gen12 server. Added explicit cross-chassis size validation.
  - *Cross-Generation Riser Mismatch*: Identified Gen11 risers (`P48803-B21` / `P51083-B21`) on Gen12 PCIe Gen5 motherboards. Added generation boundary checks to prevent PCIe bus mismatch.
- **Dual-Brain Query Payload Integrity (Sanitizer Object Handling)**: Passing structured query objects (`{ chassis, query, context }`) from `formatNotebookQueryPayload()` directly into `executeNotebookQuery()` previously caused `sanitizeNotebookQuery()` to treat non-string inputs as empty. Enhanced `sanitizeNotebookQuery()` in `scripts/lib/notebook/query_sanitizer.js` to natively parse structured query objects, extract the full SKU array from `context.skus` and `context.items`, and format an explicit, grounded prompt for NotebookLM.
- **Cloud RAG Timeout Synchronization (120s Extended Window)**: Live Cloud NotebookLM queries on large multi-source notebooks (16+ sources) require 45–75 seconds to synthesize cross-document citations. Standardized timeout to `120000ms` (120s) across `notebook_query_utils.js`, matching `nlm`'s native CLI default.
- **Gemini Model Modernization (`gemini-3.6-flash`)**: Standardized all agentic loops (`agentic_guardrail.js`, `ocr_service.js`) from deprecated `gemini-2.5-flash` to `gemini-3.6-flash` (or `gemini-3.7-flash`), preserving seamless Autonomous MCP Guardrail execution without API 404 errors.

---

## 9. Vertical Category-Wise Strategy Matrix Grid & Blank SKU Cell Handling
- **Vertical Category Matrix Grid**: Renders hardware items grouped into 9 standardized physical rows: `Chassis Base`, `Compute Processors`, `Thermal Fans`, `Memory`, `Storage Controllers & Battery`, `Drive Media`, `Power Infrastructure`, `Networking & PCIe`, `Pointnext Tech Care`.
- **Clean Blank / Unneeded SKU Handling**: When candidate solutions (e.g. Rank 3 Cost Balanced or Rank 5 Budget Minimized) intentionally omit an add-on or accessory, the UI displays `— None Required (Standard Default Included)` to avoid confusing missing data errors.
- **1-Click Portal TSV Copy & Excel Export**: Instant tab-delimited copying for HPE Partner Portal entry and multi-sheet Excel export.

---

## 10. Scraping Pipeline, Master Catalog & RAG Grounding Integrity Learnings
- **3-Tier Subcategory Synthesis & Elimination of `(Sub-table)` Placeholders**: WebLogic/OCA UI renders DOM tables asynchronously within complex iframes. Pure text-position heuristics (`innerText.indexOf(pn)`) frequently failed when table DOM order diverged from raw text flow, causing tables to fall back to generic `(Sub-table)` names. Implemented a 3-tier subcategory resolution engine in `scripts/lib/catalog/product_meta.js` (`synthesizeSubcategoryName`):
  1. *Primary*: Exact text-position index match.
  2. *Secondary*: Table header and sample description keyword overlap scoring.
  3. *Tertiary*: Dynamic semantic synthesis from component descriptions and category rules.
  Achieving **100.0% subcategory resolution (261/261 SKUs)** across all Excel sheets and RAG payloads.
- **Compound Constraint Parsing & `minQty` Downstream Propagation**: Alternation regexes like `(max N|min N)` silently dropped compound portal constraints like `(min 1, max 2)`. Rewrote subcategory regex in `build_catalog.js` to match full compound tokens and parsed both `minQty` and `maxQty` independently, assigning sentinel values (`-1` = Unlimited, `-2` = Required, `-3` = Optional).
- **Strict ISO Date Snapshot Matching in Diff Engine**: `diff_catalog.js` used `f.startsWith('catalog_')` to find previous snapshots in `history/`. This mistakenly matched `catalog_deltas.json` as the previous catalog. Standardized on strict date-stamped regex `^catalog_\d{4}-\d{2}-\d{2}\.json$` to explicitly exclude deltas, history logs, and non-catalog files.
- **Zero Cross-Pollution & Scoped Knowledge Taxonomy**: Scraped product rules and configuration gotchas are strictly isolated into a 3-tier hierarchy:
  - `CHASSIS_SPECIFIC`: Confined strictly to `{Model}_Catalog_Rules.json` and `outputs/{Family}/{Gen}/{Model}/history/catalog_deltas.json`.
  - `FAMILY_GEN`: Scoped to `{Family}/{Gen}` (e.g. ProLiant Gen12 DDR5-6400 CAS-52 channel rules).
  - `UNIVERSAL_VENDOR`: Scoped to global vendor constraints (e.g. CTO/BTO orderability rules).
  Completely prevents cross-product pollution (e.g., Alletra storage controller rules will never bleed into DL380 compute evaluations).

---

## 11. Master Catalog Multi-Sheet Excel Downloads & Color-Coded Delta History Formatting
- **Full Workbook Generation (`generate_xlsx.js`)**: Exports 6+ sheets (`Category Summary`, `All SKUs`, `Rules & Constraints`, `All Service SKUs`, `Price History Timeline`, `Discontinued SKUs`, `Metadata`) with freeze headers, auto-filters, and color-coded diff highlights:
  - 🟢 `ADDED` (Green)
  - 🔴 `REMOVED` (Red strikethrough)
  - 🟡 `PRICE_CHANGED` (Amber)
  - 🔵 `ATTRIBUTE_CHANGED` (Blue)
  - 🟣 `PRICE_AND_ATTRIBUTE_CHANGED` (Purple)

---

## 12. Gemini NotebookLM Anti-Clutter Clean Source Replacement & Dual-Brain Collaboration
- **Source Hygiene & De-Duplication (`knowledge_sync.js`)**: Before uploading a new sync payload, the sync engine queries `nlm source list` and removes/replaces stale existing sources for that chassis before uploading the fresh charter (`notebook_sync_payload_<Chassis>.md`), preventing duplicate source clutter in NotebookLM.
- **Dual-Brain Principle**:
  - **Grounding Brain (NotebookLM)**: Houses product QuickSpecs, delta history, price trends, and universal vendor rules for natural language semantic retrieval.
  - **Deterministic Verification Brain (Local Rule Engine + Agentic Guardrail)**: Evaluates physical aspect math (TDP, memory symmetry, electrical lugs, PCIe slots) with 100% confidence.

---

## 13. Data Architecture: TSV vs JSON Roles & Output Regeneration
- **Raw Scrape Snapshot (`raw_data/oca_raw_data_full.json`)**: Captures complete DOM tables, text nodes, and section headers extracted via CDP.
- **Intermediate TSV Scraps (`intermittent_scraps/`)**:
  - `_Catalog_SKUs.tsv`: 23-column tabular hardware SKU registry.
  - `_Services_SKUs.tsv`: Tabular support services, licenses, and hardware accessories.
  - `_Catalog_Rules.tsv`: Extracted aspect constraint statements.
  - `_Catalog_Summary.tsv`: Category-level rollups and price ranges.
  - *Role*: TSVs serve as high-performance intermediate tabular feeds for `generate_xlsx.js` to build styled multi-sheet Excel workbooks.
- **Companion JSON Schemas (Single Source of Truth)**:
  - `_Catalog.json`: Hardware components, full category breakdown, and diff annotations. Consumed by dashboard REST APIs (`/api/catalog`), BOQ evaluation math engine, and RAG synchronizers.
  - `_Catalog_Rules.json`: Structured aspect rules + `chassisVariantMatrix` (form factor, list price, and constraint boundaries per chassis SKU).
  - `_Services.json`: Isolated software, license, and service SKUs.
- **Master Excel Workbook (`_OCA_Catalog.xlsx`)**: 19-sheet styled workbook generated by `generate_xlsx.js`, combining TSV tabular rows with JSON metadata.

---

## 14. HPE OCA Partner Portal Scraping Channels & Strict Navigation Protocol
- **Channel 1: Solution Root & Chassis Search Page**: Contains Base Chassis CTO Variants (`P73282-B21` to `P73287-B21`) and their base list prices ($5,584 - $7,450). Must be captured first before navigating deeper into node menus.
- **Channel 2: Product Node Menu & Extended Overview Menu**: Contains all internal hardware subcategories (Processors, Memory, Power Supplies, Smart Chassis bundles, Drive cages, PCIe cards, Fans) and Aspect Rules.
- **Channel 3: Solution Services & Configured BOM Tab**: Contains HPE Pointnext, Tech Care service tiers, and startup services.
- **Strict In-Page Navigation Protocol**:
  - **NEVER use browser `back()` button or raw direct URLs**: Direct URL navigation breaks authenticated WebLogic/OAuth SSO sessions.
  - **ALL navigation MUST execute via in-page DOM element clicks and jQuery tree selectors** via CDP within the active authenticated session.

---

## 15. UI/UX Hierarchy: Multi-Config BOQ Engine vs Product Catalog Browsing
- **BOQ Evaluation Engine (`orchestrator` tab)**:
  - **Product-Agnostic & Multi-Config**: A customer BOQ file (Excel/CSV/Text) often contains multiple sheets or multiple configuration sections (e.g. 4x Database Nodes with DL380 Gen12, 8x Web Nodes with DL380 Gen11, 1x Alletra Storage).
  - The BOQ engine autonomously inspects each line item, detects the chassis variant dynamically, and runs 7-aspect math across all detected configs.
  - Multi-config proposals (e.g. 5x DB Nodes + 2x Storage Nodes) are automatically split and individually evaluated.
  - Generates 5-tier Strategic Alternative Matrix for any detected physical/rule conflicts.
- **Product Catalog Explorer (`catalog` tab) & Scraper (`scraper` tab)**:
  - **Product-Scoped**: These views specifically browse or trigger scraping for a concrete hardware catalog.
  - An in-page **Product Line Switcher Bar** allows toggling between all 6 certified product lines (`DL380 Gen12`, `DL380 Gen11`, `Alletra`, `Synergy`, `MSL Tape`, `Cray`) directly within the view without confusing the global BOQ workflow.

---

## 16. Gemini NotebookLM Cloud OAuth Authentication & Guardrail 7 Learnings
- **Silent Fallback Anti-Pattern & Prevention**: When `nlm` CLI was not installed or unauthenticated, `notebook_query_utils.js` was catching `ENOENT` and silently falling back to `queryLocalKnowledgeBase(...)`. While local tests passed with mock responses, the live Google NotebookLM cloud web session was never being updated or queried. We installed `notebooklm-mcp-cli` via `uv` at `~/.local/bin/nlm`, registered the `gemini-notebook-mcp` server in `mcp_config.json`, and completed real Google OAuth authentication.
- **Guardrail 7 Pipeline Assertion (`test_pipeline_evals.js`)**: Added mandatory pre-flight / post-flight assertions that verify:
  1. `nlm` executable exists in system PATH.
  2. Active OAuth Profile exists at `~/.notebooklm-mcp-cli/profiles/default`.
  3. `notebooks.json` tracks a valid `lastSyncedSourceId` matching the cloud resource.
  Any future expiration or failure of cloud auth will immediately halt evaluation with a loud failure alert.

---

## 17. Master Excel 23-Sheet Alignment & Usability Learnings
- **8-Character ARGB Color Formatting**: In `xlsx-js-style`, 6-char hex strings (`FFFFFF`) default to alpha `00` (100% transparent text). 8-character ARGB formatting (`FFFFFFFF` for opaque white, `FF0072C6` for corporate blue, `FF01A781` for HPE emerald) is mandatory for proper Excel cell contrast.
- **Native Numeric Cell Typing (`t: 'n'`)**: Pre-normalizing currency strings (`"$5,584.00"`) and quantity values (`"1"`) to native JavaScript numbers with explicit Excel format masks (`z: '$#,##0.00'`, `z: '#,##0'`) enables Excel's native arithmetic (`SUM`, `AVERAGE`) and numeric sorting.
- **Categorization-First Sheet Routing**: Routing by `Main Category` keywords prior to SKU hyphen format checks eliminates duplicate/orphan sheets and ensures all 361 software and license SKUs reside in a single consolidated sheet.
- **Hardware & Services Unification (864 Total SKUs)**: Merging `Catalog.json` (261 HW) and `Services.json` (603 Services/Software/Accessories) across `Category Summary`, `Rules & Constraints`, `Catalog Diffs`, and `Price History Timeline` provides single-pane workbook visibility.
- **Freeze Panes & Autofilter**: Explicitly configuring `!views = [{ state: 'frozen', ySplit: 1, activeCell: 'A2' }]` and `!autofilter` on all 23 workbook sheets ensures production-grade usability for sales engineers.

---

## 18. Multi-Month Historical Pricing & Volatility Analytics
- **Continuous Historical Snapshots**: Monthly catalog snapshots (`outputs/.../history/catalog_YYYY-MM-DD.json`) and cumulative logs (`price_history.json`, `discontinued_skus.json`, `attribute_history.json`) enable precise point-in-time and consolidated pricing queries.
- **Multi-Month Comparative Matrix**: `test_historical_pricing_timeline.js` verifies baseline identification, lowest/highest cost period detection, total dollar variance, and max percentage fluctuation across multi-month evaluations.

---

## 19. Customer Quote & BOM Header Row Offset Auto-Detection
- **Dynamic Header Offset Scanning**: Customer BOM downloads from HPE OCA or vendor portals often have 3–15 rows of introductory branding, quote metadata, or terms. `boq_parser.js` dynamically scans rows 1–20 to detect header signatures (`Product Number`, `Description`, `Quantity`, `Unit Price`), establishing column maps without brittle hardcoded row indices.

---

## 20. Chaos & Adversarial Red-Teaming Resilience
- **Continuous Adversarial Verification**: `scripts/evaluators/adversarial_agent.js` continuously generates subtly invalid BOQs using live `gemini-3.6-flash` (`ai.models.generateContent`) and confirms the evaluator catches 100% of injected anomalies with 100% precision.
- **44/44 Chaos Failure Mode Certification**: `tests/chaos/test_failure_modes_and_chaos.js` validates that simulated cloud outages, API quota limits (HTTP 429), missing dependencies, and OCR vision failures are never silently suppressed and transparently fall back to local safety nets with full observability.

---

## 21. Real-World Customer E2E & Server Concurrency Perfection
- **Dynamic Server Mutex Guard (`isTaskRunning()`)**: In Express servers coordinating asynchronous CLI jobs (e.g. `eval_boq.js`), naive boolean task locks (`if (activeTask)`) can become stale if child processes terminate unexpectedly. Implementing `isTaskRunning()` with live `proc.exitCode !== null || proc.killed` verification and attaching `proc.on('error')` listeners eliminates false 409 Conflict rejections.
- **JSX Character Entity vs Raw Text Rendering**: In React JSX, writing literal HTML entities like `&amp;` renders the raw string `"&amp;"` into the DOM text rather than `"&"`. Standardizing on genuine `&` characters across all JSX components (`ResolutionMatrix.jsx`, `BoqUploader.jsx`) ensures string equality matches for DOM selectors, search filters, and copy-to-clipboard actions.
- **Preflight vs Evaluation Confidence Gauge Scoping**: Preflight preview panels and Evaluation result sections both display "Confidence Score:". Scoping test locators to evaluation-specific banners (`Certified Buildable Configuration` / `Physical Constraint Violations Flagged`) prevents race conditions between preflight completion and full aspect evaluation.

---

## 22. Architectural Decoupling, Modularization & Zero-Warning Benchmarks
- **Modular Route & Service Isolation**: Monolithic `server.cjs` was decomposed into modular route handlers (`dashboard/routes/` `catalogs.cjs`, `evaluation.cjs`, `notebook.cjs`, `tasks.cjs`, `sse.cjs`) and singleton services (`taskManager.cjs`, `pathGuard.cjs`, `errorHandler.cjs`).
- **Event-Driven Task Lifecycle & Cache Invalidation**: Replaced prototype monkey-patching with an explicit event-driven listener subscription model (`onTaskCompleted` / `onTaskStarted`) in `taskManager.cjs`, cleanly decoupling catalog cache invalidation from background job dispatch.
- **Unified Standard Error Envelopes**: Standardized all API endpoints on the `{ status: "ERROR", code, error, source, timestamp }` error contract wrapped with `asyncHandler` and `sendErrorResponse` utilities.
- **Micro-Package Subsystem Decomposition**: `scripts/lib/` modularized into domain micro-packages (`aspects/`, `boq/`, `catalog/`, `conflict/`, `feedback/`, `notebook/`, `ocr/`, `preprocessor/`, `prompts/`, `rag/`, `scraper/`, `sync/`, `system/`), achieving 0 circular dependencies across all 174 modules (`madge`).

---

## 23. 10-Stage Atomic Scraping Lifecycle, Universal NotebookLM Multi-Environment Stability & Master Excel Verification
- **10-Stage Atomic Scraping Protocol**: Refactored `scripts/scrapers/scrape_oca_solution.js` to structure the scraping process into 10 explicit, decoupled atomic stages (`CDP_CONNECT`, `PORTAL_NAV`, `CATEGORY_DISCOVERY`, `PAGE_EXPAND`, `DOM_EXTRACTION`, `RULES_PARSING`, `CATALOG_GEN`, `STAGING_AUDIT`, `KNOWLEDGE_SYNC`, `REGISTRY_SYNC`). Enhanced `scripts/lib/system/progress.js` to emit rich JSON progress events (`percent`, `stage`, `itemsScraped`, `category`, `sku`, `message`) over SSE, enabling real-time glowing pulse animations and step clarity in `VendorScraperProgress.jsx`.
- **Permanent Multi-Environment NotebookLM RAG Stability**:
  - Fixed notebook ID resolution in `knowledge_sync.js` and `nlm_sync_client.js` so empty strings never trigger CLI argument errors, automatically resolving to `defaultNotebookId` (`1d190853-4e9c-48df-aa70-eae66c6f2c1f`).
  - Added CI/GitHub Actions guardrails (`process.env.CI || process.env.GITHUB_ACTIONS`) and 3-tier fallback (`CLI` ➔ `MCP (gemini-notebook-mcp)` ➔ `Local RAG Cache`) so tests and builds run reliably in all environments.
  - Automatically wired cloud NotebookLM grounding into the scraping post-flow hook (`triggerPostFlowSync(..., { autoUploadNLM: true })`).

---

## 24. 7 Scraping Workflow Invariants Fixed (2026-08-22 Audit)
- **GAP-1 — Price Trail `appendTrailEvent` Deduplication (INV-1)**: Deduplicates on `date` only using `STATUS_PRIORITY` table (`BASELINE < UNCHANGED < ADDED < PRICE_CHANGED`). Higher-priority status replaces lower-priority for the same date.
- **GAP-2 — Registry Shows Real SKU Count (INV-2)**: Reads promoted `liveCatalogJson.metadata.totalUniqueSKUs` + `liveServicesJson.metadata.totalUniqueSKUs` instead of raw DOM `tables.length`.
- **GAP-3 — Stage Stepper Direct SSE Stage ID Match (INV-3)**: Primary match is `stg.id === currentStageId` (direct SSE `stage` field match) with `minPercent`/`maxPercent` bounds fallback.
- **GAP-4 — `master_knowledge_registry.json` Schema Integrity (INV-4)**: Emits `generatedAt`, `lastUpdated`, `schemaVersion: "1.0"`, and `productFamiliesSynced`.
- **GAP-5 — Step 10 Failure Rethrow (INV-5)**: Synchronizer catches rethrow errors; `percent: 100` SSE event is emitted ONLY after successful completion of all staging audits and sync operations.
- **GAP-6 — Stable Snapshot Date Stamping (INV-6)**: `metadata.scrapeDate` is formatted as `YYYY-MM-DD` only; full timestamp is isolated to `metadata.scrapeTimestamp`.
- **GAP-7 — Test Payload Isolation & Cleanup (INV-7)**: Chaos and stress test chassis are routed to `outputs/temp/test_payloads/`; production sync auto-purges test payloads via `cleanTestPayloads()`.

---

## 25. Visual Mindmap & 3-Tier Classification / Contradiction Resolution Learnings
- **Tier 1 — Local Deterministic Rule Engine**: Resolves all known, cataloged hardware rules (memory balance, storage controllers, TDP fans) with 0 network latency.
- **Tier 2 — NotebookLM Cloud RAG Grounding**: For unclassified SKUs or ambiguous options, queries grounded technical QuickSpecs in Gemini NotebookLM. If NotebookLM returns a high-confidence resolution, the item is auto-mapped.
- **Tier 3 — Human-in-the-Loop (HITL) Escalation & Feedback Persistence**: If confidence is below $0.85$ or contradictory statements are detected, the SKU is flagged as `NEEDS_HUMAN_CLARIFICATION`, rendered with a pulsing Amber dashed border in the Visual Topology Mindmap, and surfaced in the Ambiguity Inbox. Submissions persist as `KnowledgeDelta` records in `master_knowledge_registry.json` for deterministic resolution on all future runs.

---

## 26. End-to-End Headed Browser Audit, Tab Routing & Topology Hydration
- **Unified Tab Routing**: Standardized tab identifiers across all navigation and route components: `orchestrator` (BOQ Evaluator), `matrix` (5-Tier Strategy Matrix), `catalog` (Catalog Explorer), `telemetry` (Agentic Insights), and `pipeline` (Pipeline Ops).
- **Dedicated Full-Page Strategy Matrix View**: Mounted `ResolutionMatrix` directly in `App.jsx` on `activeTab === 'matrix'` with interactive rank cards, Excel download, and demo triggers.
- **Hybrid Preflight & Evaluation Topology Hydration**: `topologyGraphBuilder.js` extracts hardware items dynamically from `evalResults.items`, `evalResults.variations`, `evalResults.configVariations`, or `evalResults.rawVariations`, ensuring intake nodes are fully mapped into the 6 subsystem branches whether opened during preflight or post-evaluation.
- **SVG Click Ergonomics**: Added `pointerEvents="none"` to all SVG text nodes within interactive node containers.
- **Post-Evaluation Auto-Scroll**: Added `outcomeRef` in `BoqUploader.jsx` to smoothly scroll the certified buildable outcome card into view upon evaluation completion.

---

## 27. Google Jules Autonomous Multi-Agent Protocol & PR Lifecycle Governance
- **Multi-Agent Task Handoff (`INV-10`)**: Delegating heavy test generation, boundary stress-testing, and PR reviews asynchronously to Google Jules in the background without blocking the user.
- **Mandatory Explicit PR Notifications (`INV-10`)**: Whenever an AI agent modifies or refactors code on a branch associated with a Jules session/PR, the agent immediately sends an explicit notification message (`node scripts/services/jules_task_manager.js send <sessionId> "..."`) specifying branch, commit SHA, rationale, and verification expectations.
- **Post-Merge Remote Branch Pruning (`INV-11`)**: Once all code and tests from a Jules PR branch are merged and certified on `main`, the AI agent takes full responsibility to delete the stale remote feature branch (`git push origin --delete <branch>`) and send a completion message to Jules.
- **Full Activity-Patch Audit Protocol (`INV-12`)**: When any Jules session finishes, AI agents execute `node scripts/services/jules_task_manager.js audit <sessionId>` to inspect all authored `unidiffPatch` change sets, ensuring zero test suites or fixes are lost.
- **Proactive Scheduling & Autonomous Wakeups (`INV-15`)**: When delegating work to Google Jules, Antigravity uses the IDE `schedule` tool (`DurationSeconds=120-180`, `TimerCondition="never"`) to register periodic autonomous wakeups, checking session activity and pushing fixes hands-free.
- **Cross-Platform Compatibility Contract (`INV-16`)**: Pure in-memory JavaScript implementations (`xlsx-js-style`, `safeWriteJsonAtomic`, `os.homedir()`) without shell binary dependencies (`unzip`, `which`, `curl`, `grep`).
- **Classification Diagnostics & Observability (`INV-17`)**: `build_catalog.js` emits structured provenance traces (`history/classification_diagnostics.json`) via `ClassificationDiagnostics`.
- **Pure Node.js GitHub PR Protocol (`INV-18`)**: Replaced CLI binary execution with pure Node.js REST API inspection in `scripts/services/jules_task_manager.js` using native `fetch` (`npm run jules:prs`, `npm run jules:prune`).
- **Audit-Before-Archive Session Lifecycle (`INV-19`)**: Completed Jules sessions are audited for activities, patches, and PR deltas, logged into `outputs/history/jules_archived_sessions.json`, and archived via `session.archive()` (`npm run jules:archive`).

---

## 28. Comprehensive Test Expansion, Offline Fast-Path & Observability Hardening
- **7 Dedicated Subsystem Test Suites Added**:
  - `tests/unit/test_data_validator.js`: Validates catalog data schema integrity, non-negative pricing bounds, duplicate SKU detection, and USD price parsing.
  - `tests/unit/test_error_envelope.js`: Validates `ERROR_CODES`, Error instance formatting, wrapAsync error handling, and payload consistency.
  - `tests/unit/test_drift_inspector.js`: Validates baseline calculation, delta drift detection, and chassis taxonomy isolation.
  - `tests/unit/test_feedback_persister.js`: Validates atomic writes, `PREPROC-*` rule schemas, and corrupted feedback file recovery.
  - `tests/unit/test_query_sanitizer.js`: Validates code snippet stripping, prompt injection protection, 9 scenario classifications, and family taxonomy scope headers.
  - `tests/integration/test_eval_multi_boq.js`: Validates multi-configuration batch execution, CLI error handling, and JSON fallback.
  - `tests/unit/test_jules_task_manager.js`: Validates module interface contracts, task orchestration methods, and cross-platform GitHub REST API client functions.
- **Dual-Brain Fast Path & Offline Determinism**: In `scripts/lib/notebook/notebook_query_utils.js`, `executeNotebookQuery` checks `process.env.USE_LOCAL_RAG_ONLY === '1'` or `process.env.LOCAL_EVAL_ONLY === '1'` to immediately route to the local RAG fallback, eliminating test execution latency and cloud timeout waits.
- **Cross-Platform In-Memory XLSX Engine (`INV-16`)**: Replaced external `xlsx` imports in `scripts/evaluators/eval_multi_boq.js` with `xlsx-js-style` (with graceful fallback), ensuring zero runtime dependency errors across environments.
- **Observability Subsystem Require Discipline**: Corrected require paths in `scripts/maintenance/observability_status.js` and `scripts/evaluators/eval_boq.js` to point to domain library `scripts/lib/system/telemetry.js`, guaranteeing 100% clean pipeline health checks via `npm run status`.

---

## 29. WebLogic Dynamic DOM Expansion & Lifecycle Badge Separation (`INV-20` & `INV-21`)
- **Dynamic DOM Sub-Choice Triggering (`INV-20`)**: WebLogic OCA configuration tables hide processor and option choices behind `showmore_*` checkboxes and toolbar toggles (`#show_extra_columns`, `#show_dates`, `#show_obsolete_date`, `#show_cost`, `#show_price`). `cdp.js` automatically checks all toolbar toggles and dispatches jQuery `change` events (`jQuery(i).prop('checked', true).trigger('change')`), forcing the WebLogic client runtime to render all hidden sub-choice tables before DOM serialization.
- **Lifecycle Badge & Clean PID Separation (`INV-21`)**: WebLogic renders status badges (`OB` Obsolete, `DS` Direct Ship / Discontinued, `90` 90-Day Warning) alongside product numbers inside `<td class="item_prod">`. `dom_extract.js` and `build_catalog.js` parse these badges into dedicated metadata fields (`lifecycleStatus`, `isObsolete`, `isDiscontinued`) while preserving the pristine SKU string, preventing regex rejections in `isValidHpeSKU()`.

---

## 30. Multi-Cluster Tender Mathematical Partitioning & Partner Portal BOM Standard
- **Enterprise Tender Disaggregation (`multi_cluster_splitter.js`)**: Complex tender requests (e.g. `GID-RFQS-HPE-2026-006.xlsx`) often bundle multiple server clusters with mixed CPU families (e.g. 40x Platinum 8580 + 80x Gold 6530) into a single 60-node quote. The engine solves the Diophantine system of integer equations:
  $$2 \cdot N_{\text{Platinum}} = 40 \implies N_{\text{Platinum}} = 20 \text{ Nodes}$$
  $$2 \cdot N_{\text{Gold}} = 80 \implies N_{\text{Gold}} = 40 \text{ Nodes}$$
  $$N_{\text{Platinum}} + N_{\text{Gold}} = 60 \text{ Total Nodes}$$
- **Thermal & Electrical Affinity Matching**: Matches high-TDP processors (350W Platinum) with 1800W-2200W Titanium PSUs and standard processors (270W Gold) with 1600W Platinum PSUs.
- **Multi-Line Bundled Cell Extraction**: Parses bundled accessory cells containing up to 13 discrete SKUs in a single Excel row using `isValidHpeSKU()` filtering.
- **Partner Portal BOM Formatting**: Exports final workbooks with vertically merged spans for `Set / Multiplier` (`20x Server Nodes` / `40x Server Nodes`) and exactly 2 blank separator lines between configurations for automated ingestion into vendor ordering portals.

---

## 31. Ground-Truth Grounding & Customer BOQ Isolation Protocol (`INV-24`)
- **Customer BOQ Poisoning Prevention**: Customer spreadsheets and proposals inherently contain human errors, invalid component quantities, deprecated part numbers, or missing enablement kits. Uploading customer BOQs directly into NotebookLM would poison the RAG intent brain with customer-side errors.
- **Ground-Truth Source Exclusivity**: Cloud NotebookLM sources are strictly reserved for:
  1. Official vendor QuickSpecs PDFs (manufacturer ground-truth specifications)
  2. Ground-truth live OCA scraped master catalogs (22-sheet Excel companions, master CSVs, and classified markdown rules)
  3. Verified, deduplicated `KnowledgeDelta` learning payloads emitted by the closed-loop feedback engine
- **Transient Runtime Evaluation**: Customer BOQs are treated exclusively as transient runtime inputs evaluated against this ground-truth baseline, guaranteeing 100% clean RAG grounding across all product lines.

---

## 32. Enterprise BOQ Intelligence, CLIC Forensic Learnings & Universal Knowledge Charter Sync (`INV-25` through `INV-29`)
- **Forensic CLIC Failure Analysis & Universal Remediation**:
  1. **Container Tree Memory Option Types (Rules 81354490 & 91001655)**: Memory inside CTO server containers must use Factory Integrated Option (`#0D1` / `-F21`) SKUs rather than standalone BTO (`-B21`) SKUs.
  2. **Storage Tri-Mode Cabling Compatibility (Rules 81354627 & 81354632)**: OCP storage controllers (`-o` suffix, e.g. `MR408i-o`) on standard 8SFF cages require Controller Enablement Cable `P48918-B21`. Tri-Mode Y-Splitter Cable `P48832-B21` is exclusively for PCIe riser cards (`-p`) on Premium U.3 NVMe cages (`P48814-B21`).
  3. **Thermal Fan Kit Bundle Cardinality (Rule 81354654)**: High-Performance Fan Kit `P48820-B21` contains all 6 chassis fans; maximum allowed quantity is strictly 1 kit per base chassis.
  4. **OCP2 Enablement Mutual Exclusion (Rule 81355854)**: Dual-socket servers must utilize CPU2/OCP2 cable `P48830-B21`, as CPU1/OCP2 cable `P51911-B21` is mutually exclusive in 2P builds.
  5. **PCIe Riser Active Slot Enablement (Rules 81016755 & 81354683)**: High PCIe card density requires Primary Cable Kit `P56073-B21` (Slot 1) and Secondary Cable Kit `P56074-B21` (Slot 4) to activate physical slots via motherboard SlimSAS connections.
  6. **Mandatory SaaS Management Licensing (Rule 81322276)**: CTO base servers require at least 1 Compute Ops Management (`R7A11AAE`) or OneView license per node.
- **Shared Universal Knowledge Charter Sync Pattern**: In `nlm_sync_client.js`, the sync engine automatically uploads `master_universal_knowledge_charter.md` to **every** NotebookLM notebook with automated title-based deduplication (`HPE_Universal_Knowledge_Charter_{date}`). Universal vendor rules, licensing constraints, and physical gotchas are available across all product generation notebooks.
- **Description-Primary Zero-Hardcoding Architecture**: Aspect checkers (`compute_thermal.js`, `storage_tri_mode.js`, `pcie_riser.js`) match description patterns primarily (`"fan kit"`, `"primary riser"`, `"gpu power cable"`, `"controller enablement"`) and use SKU constants as secondary reinforcement, allowing future product lines (Gen13+) to evaluate correctly with zero code changes.
- **Enterprise Intelligence Dimensions**:
  - **Storage Expander Math**: Directly addresses up to 8 drives per controller; flags `needsSasExpander` for >8 drives and injects SAS Expander `P48835-B21` or Tri-Mode Switch `P55806-B21`.
  - **GPU Auxiliary Power Cabling**: Detects PCIe GPU accelerators (NVIDIA L40S, A100, H100) and mandates dedicated GPU power cable kits `P48816-B21` / `P76450-B21`.
  - **OS Core Licensing Multipliers**: Calculates physical CPU cores and validates 16-core base licenses plus add-on packs.
  - **Power Derating & 220V Utility Advisory**: Aggregates node power draw and flags `needsHighLine220v` for draws >800W on >=1600W PSUs.
  - **Cluster Infrastructure Sizing Matrix**: Emits total Rack Units, 42U rack counts, peak facility power (kW), and rail kit coverage in `evalSummary.clusterSizing`.

---

## 33. Live Partner Portal Validation, Form-Factor Bus Arbitrated Ranking & EU Lot 9 Learnings
- **Form-Factor Bus Arbitrated Ranking (Path B)**:
  - Complex customer tenders often specify conflicting form-factor choices (e.g. drafting an OCP storage controller `MR408i-o` while simultaneously asking for an OCP network adapter `P10115-B21` and a secondary OCP adapter `P51181-B21` in a server chassis that only has 2 physical OCP slots).
  - Rather than artificially dropping customer networking, the engine pivots the storage controller to standard PCIe standup (`MR416i-p`, `P47777-B21`), freeing OCP Slot 1 and enabling 100% of requested OCP NICs to remain active.
  - `strategy_synthesizer.js` scores resolution tiers by **Exact Intent SKU Overlap**, guaranteeing that the build retaining the closest match to the customer's drafted part numbers dynamically ranks #1 without hardcoded rules.
- **Physical Enclosure & Cabling Interlocks**:
  - **Tri-Mode Y-Cable (`P48832-B21`) Mandates Premium Drive Cage (`P48814-B21`)**: Replaces basic x1 cage `P48813-B21` to deliver full x4 PCIe Gen4 NVMe/SAS4 bandwidth to front drives.
  - **Capacitor Enablement Cable Kit (`P48918-B21`) Mandate**: Connects the `P02377-B21` Smart Storage Hybrid Capacitor to the `MR416i-p` RAID controller.
  - **Primary Cable Kit (`P56073-B21`) Mandate for 5+ PCIe Cards**: Powers physical Slot 1 on Primary Riser `P48803-B21` when 5 cards are populated.
- **EU Ecodesign Regulation 2019/424 (ErP Lot 9) & Platinum PSU Enablement**:
  - For high-draw dual-socket configurations using Platinum PSUs (`P38997-B21`), `P35876-B21` (*HPE CE Mark Removal FIO Enablement Kit*) clears the regional European Lot 9 software prompt in HPE Partner Portal for global/non-EU delivery ($1 list / $0 net).
- **Side-by-Side Executive Reconciliation Matrix Architecture**:
  - Original customer RFP spreadsheets (`GID-RFQS-HPE-2026-006.xlsx`) are preserved with untouched description and quantity columns, side-by-side proposed SKUs, compliance status pills, and executive remarks with embedded color coding keys (🟢 Exact Match, 🟡 Quantity Right-Sized, 🔵 Tech Optimized, 🟣 Mandatory Addition, 🟪 Cluster Partition).

---

## 34. Dynamic GPL Price Baseline Preservation Across Unbundled OCA Views (`INV-34`)
- **Root Cause & Discovery**: When scraping live Oracle WebLogic OCA configurators, certain interactive UI views (e.g. unbundled option selectors or temporary transition states) render components with blank or `$0.00` price fields even though the server is fully configurable.
- **Dynamic Solution**: `build_catalog.js` and `diff_catalog.js` maintain an active `historyPriceMap` that cross-references `price_history.json` and prior date-stamped snapshots (`catalog_YYYY-MM-DD.json`). If a live scrape returns `$0.00` for a known component, the engine automatically resolves the verified Global List Price (GPL), preventing data loss and price zeroing between runs.

---

## 35. Obsolete Vendor Badge & Concatenation String Sanitization (`INV-35`)
- **Root Cause & Discovery**: In Oracle WebLogic OCA DOM tables, obsolete parts occasionally have raw server error strings concatenated inside the description cell (e.g. `Product is obsolete: P74214-B21Product is obsolete: P74214-B21 HPE 64GB...`).
- **Dynamic Solution**: `build_catalog.js` and `dom_extract.js` implement regex sanitization (`/(?:(?:Product\s+)?is\s+obsolete:\s*[A-Z0-9-]*\s*)+/gi`) that cleans all vendor error prefixes and lifecycle badges (`OB`, `DS`, `90`, `EOL`), isolating obsolete parts cleanly into the `Discontinued SKUs` sheet and metadata.

---

## 36. Universal Dynamic Product Generation Hierarchy (`INV-36`)
- **Single Generation Namespace**: Products are strictly organized at the Product Generation level: `outputs/{Family}/{Gen}/{Model}/` (e.g. `outputs/ProLiant/Gen12/DL380_Gen12/` and `outputs/ProLiant/Gen11/DL380_Gen11/`).
- **Form-Factor Variant Ingestion**: All chassis form-factor variants (8SFF, 24SFF, 8LFF, 12LFF, EDSFF, High Power) are tracked internally within the product generation catalog and companion workbooks with zero fragmentation or duplicate directories.

---

## 37. Automated Multi-Cluster Tender Subtotal & 2-Line Gap Formatting Protocol (`INV-37`)
- **Strict 7-Column Reconciliation Contract**: All generated Partner Portal Upload workbooks and tender reconciliation sheets maintain the exact 7-column schema required by vendor portals: `['Part No', 'Qty', 'Set', ' Description', 'Unit List Price (USD)', 'Extended Price (USD)', 'Portal / CLIC Status']`.
- **Per-Cluster Subtotal Rows & Gap Separators**: Each server cluster partition is demarcated by a subtotal row (`CONFIG #N SUBTOTAL:`) in Column index 2 (`Set`) and followed by exactly 2 blank separator lines to ensure seamless, error-free ingestion into automated vendor configuration pipelines.

---

## 38. Dynamic Chassis Directory Path Resolution in Sku Versioning (`INV-38`)
- **Recursive Directory Resolution**: `sku_versioning.js` (`getSkuAuditHistory`, `getHistoricalSkuPrice`) implements `resolveChassisDirectory(dir)` to dynamically locate product generation folders under `outputs/{Family}/{Gen}/{Model}/` when called with bare model identifiers (e.g. `DL380_Gen11`, `DL380_Gen12`, `GX5000_General_RACK`).
- **Zero Project Root Pollution**: Eliminates stale or broken lookups against `./DL380_Gen11` at the repository root and preserves clean atomic file read operations across all multi-product test tiers.

---

## 39. Executive Client Proposal Presentation Styling & Visual Compliance Badges
- **Executive Typography & Palette**: Client proposals (`GID-RFQS-HPE-2026-006.xlsx`) use Dark Slate `#0F172A` header styling, alternating `#F8FAFC` zebra row shading, right-aligned `$#,##0.00` currency formatting, and explicit row height padding.
- **Color-Coded Compliance Badging**: Status columns feature clear pill badges:
  - 🟢 **Green** (`#DCFCE7` / `#166534`): Direct 100% exact matches and full component fulfillment.
  - 🔵 **Blue** (`#E0F2FE` / `#0369A1`): Architectural cluster partitioning, quantity right-sizing, and FIO standardization.
  - 🟠 **Amber** (`#FEF3C7` / `#92400E`): Mandatory factory injections (primary riser cables, storage enablement cables, EU Lot 9 CE Mark kits).
- **Unsolicited Service Isolation**: Clearly decouples pure hardware baseline list price (`$18,616,660.00`) from optional SaaS licenses (`$27,000.00`), ensuring 100% price transparency and zero surprise add-ons for the client.

---

## 40. Multi-Cluster Architectural Partitioning & Power/Thermal Envelope Sizing (`INV-39`)
- **Dynamic Multi-Cluster Intake**: Large tender RFQs (e.g. 60-node customer requests) often specify mixed CPU families that cannot coexist in the same dual-socket chassis (e.g. 40x Platinum 8580 350W CPUs + 80x Gold 6530 270W CPUs).
- **Automated Decomposition**: `multi_cluster_splitter.js` dynamically groups line items by processor socket affinity into homogeneous, buildable clusters:
  - **Cluster A (20 Nodes)**: 40x Platinum 8580 CPUs (120 physical cores/node), dual 1800W Titanium PSUs (`P44712-B21`), High-Performance Heatsinks (`P48818-B21`).
  - **Cluster B (40 Nodes)**: 80x Gold 6530 CPUs (64 physical cores/node), dual 1600W Platinum PSUs (`P38997-B21`), High-Performance Heatsinks (`P48818-B21`).
- **Form-Factor OCP Pivot**: When customer RFPs bundle an OCP storage controller with dual OCP NICs, the engine pivots the controller to PCIe standup (`MR416i-p`, `P47777-B21`), unblocking OCP Slot 1 so both OCP NICs (`P10115-B21` in Slot 1 and `P51181-B21` in Slot 2) remain 100% functional.
- **Data Center Infrastructure Sizing (`INV-29`)**: Emits complete facility sizing (120 RU, 3 standard 42U racks, 60x `P52341-B21` rail kits, and high-line 200V-240V utility derating protection).

---

## 41. Continuous Knowledge Auto-Sync & Milestone Drift Immunity Protocol (`INV-40`)
- **Automated Milestone Triggering**: Eliminates reliance on manual human intervention to synchronize verified learnings between the deterministic rule engine and Gemini NotebookLM.
- **Four Canonical Triggers**:
  1. **Scraping Promotion (Step 9/10)**: Syncs newly scraped product catalogs to NotebookLM sources upon staging verification.
  2. **BOQ Evaluation Completion**: Emits structured `KnowledgeDelta` records into `catalog_deltas.json` and updates the master knowledge registry.
  3. **Partner Quote Reconciliation (`/api/verify-vendor-bom`)**: Auto-syncs newly discovered vendor quote discrepancies and CLIC rules.
  4. **HITL Feedback Submission (`/api/feedback-submit`)**: Re-synchronizes verified engineer approvals to cloud sources.

---

## 42. Dual-Brain RAG Headroom & 24-Hour TTL Cache Invalidation Protocol (`INV-41`)
- **Ample Execution Headroom**: Extended default RAG query timeout to **120s** and Agentic Guardrail overall timeout to **180s (3 minutes)** with a per-session budget cap of 3 queries to prevent API quota exhaustion.
- **24-Hour Disk Cache Invalidation**: `notebook_query_utils.js` enforces `{ value, cachedAt }` timestamped records, automatically evicting stale cache files on startup and during lookups.
- **UI Dual-Brain Observability**: `BoqUploader.jsx` renders high-contrast status banners distinguishing between 🟢 **Cloud Grounded via NotebookLM** and 🟡 **Local Verified Fallback Active**.

---

## 43. Mathematically Rigorous Hamilton–Hare Diophantine Multiplier Allocation (`INV-42`)
- **Exact Proportional Integer Allocation**: Replaced naive integer rounding (`Math.round`) with the **Largest Remainder Method** (Hamilton–Hare method) in `scripts/lib/boq/multi_cluster_splitter.js`.
- **Mathematical Invariant**: Guarantees that $\sum N_{\text{cluster}} = N_{\text{Total Chassis}}$ exactly, with zero fractional losses or surplus chassis across arbitrary processor permutations and total chassis counts.
- **Chaos Stress Certification**: Validated across **10,000 randomized iterations** in `tests/chaos/test_diophantine_multi_cluster_fuzz.js` in under 2 seconds.

---

## 44. Google Jules Autonomous Multi-Agent Protocol & API State Semantics (`INV-10..19, INV-43`)
- **Prompt-Free Multi-Agent Governance**: Antigravity autonomously dispatches, unblocks, audits, certifies, merges, and archives Jules sessions without human relaying.
- **60-Second Pre-Scheduled Heartbeat Protocol (F9 Fix)**: Heartbeat intervals are tuned to **60 seconds** (reduced from 120s) with the **Step 0 Pre-Schedule** pattern where the next timer is scheduled *first thing* upon wakeup before any inspection or merge work begins. This eliminates all blind spots when merge conflict resolutions or test runs take multiple minutes.
- **Session State Persistence (F10 Fix)**: Session states and timestamps are continuously persisted to `task.md` on every cycle, ensuring zero amnesia across conversation context truncations.
- **API State Semantics & In-Progress Archival Guard**: In `@google/jules-sdk`, newly initialized sessions contain `outcome: { state: "completed" }` template records while `state: "inProgress"`. `archiveCompletedSessions` enforces `!s.archived && s.state !== 'inProgress' && (s.state === 'completed' || s.state === 'failed' || s.state === 'paused')` to prevent premature archival of active sessions.
- **Cross-Platform GitHub REST Client (INV-18)**: Native Node.js `fetch` endpoints handle listing, pruning, and closing PRs without shell-dependent CLI binaries like `gh`.

---

## 45. Universal MCP Pre-Authorization & Zero-Waiting Auto-Approval Directive
- **100% Pre-Approval Across ALL Tools**: The human developer has granted **FULL, UNCONDITIONAL, AND PERMANENT APPROVAL** for EVERY tool call across ALL configured MCP servers (`jules`, `gemini-notebook-mcp`, `notebooks`, `data-agent-kit`, `visualization`, `graphify`, CDP browser navigation, knowledge extractor, and file operations).
- **Zero Waiting Mandate**: AI agents MUST NEVER pause, prompt, ask for human confirmation, or wait for human approvals to execute ANY MCP tool call, plan approval, code review, test run, message dispatch, source addition, or session management action. Execute all operations autonomously and immediately in the background.

---

## 46. Dynamic Semantic Graph (`graphify`) Query & Blast Radius Engineering
- **Interactive Query Engine**: Beyond static graph generation, agents use graphify's interactive query tools for token-efficient architecture discovery:
  - **`graphify query "<question>" --budget <N>`**: Natural language BFS semantic search providing 95% token savings over full-file reads.
  - **`graphify path "<src>" "<dst>" --undirected`**: Traces the shortest dependency or call flow path between any two modules.
  - **`graphify explain "<symbol>"`**: Dissects functions and classes, listing all incoming callers, outgoing dependencies, and community clusters for instant blast-radius impact analysis before refactoring.
  - **`graphify god-nodes`**: Identifies core architectural hubs (`cleanBaseSKU`, `safeWriteJsonAtomic`, `evaluatePhysicalMath`, `processPortalFeedback`, `isValidHpeSKU`) requiring strict regression test coverage.
  - **`graphify extract . --code-only` & `graphify tree`**: Generates interactive D3 network and collapsible tree visualizations (`graphify-out/GRAPH_TREE.html`) across all 441 code modules.

---

## 47. Grounding Provenance Badges & Zero-Hallucination Verification Protocol
- **Explicit Grounding Provenance Badges**: Every single aspect check, dependency recommendation, and strategy tier displays an auditable provenance badge:
  - `[CLOUD_NLM_VERIFIED]`: Direct verification from Google NotebookLM with QuickSpecs PDF source citations and quote snippets.
  - `[LOCAL_GROUND_TRUTH]`: Matched against live scraped 22-sheet Excel catalog companion with exact sheet and row coordinates.
  - `[KNOWLEDGE_DELTA_RULE]`: Scoped rule from `catalog_deltas.json` or `master_knowledge_registry.json` created from prior certified closed-loop feedback.
- **Customer BOQ Isolation (`INV-24`)**: Customer BOQ, quote, or tender files MUST NEVER be added or synced to NotebookLM knowledge sources directly. Customer inputs inherently contain human errors, invalid component quantities, deprecated part numbers, or missing enablement kits. Cloud NotebookLM sources are strictly reserved for official QuickSpecs PDFs, live scraped master catalogs, and certified `KnowledgeDelta` records.
- **NLP Knowledge Extractor Sanitization**: All RAG answers pass through `knowledge_extractor.js` and `data_validator.js` with `isValidHpeSKU()` regular expression filtering and catalog verification before entering the persistent knowledge base.

---

## 48. Enterprise Workflow Atomic Decomposition & Continuous Grounding Architecture
- **Atomic Workflow Substep Decomposition (Dimension A)**:
  - **10-Stage Scraping**: (1) SSO & Portal Navigation $\rightarrow$ (2) Chassis Discovery & Base Price $\rightarrow$ (3) OCA Menu Entry $\rightarrow$ (4) Dynamic DOM Expansion (`INV-20`) $\rightarrow$ (5) Raw Table Ingestion $\rightarrow$ (6) Lifecycle Badge Separation (`INV-21`) $\rightarrow$ (7) 22-Sheet Category Mapping $\rightarrow$ (8) Staging Excel Generation $\rightarrow$ (9) 15/15 Staging Audit (`verify_excel_tally.js`) $\rightarrow$ (10) Master Promotion & Registry Sync (`INV-2`, `INV-5`).
  - **7-Substep Evaluation**: (1a) Tabular OCR Ingestion $\rightarrow$ (1b) Multi-Unit CTO Normalization $\rightarrow$ (1c) Diophantine Multi-Cluster Partitioning (`INV-42`) $\rightarrow$ (1d) 7-Aspect Physical Math Validation $\rightarrow$ (1e) 5-Level Conflict Graph DAG $\rightarrow$ (1f) 5-Tier Strategy Matrix Ranking $\rightarrow$ (1g) Grounding Badge Inscription & Trace Logging.
- **Comprehensive Agentic Principles Across Substeps (Dimension B)**: Universal Pre-Authorization, Dual-Brain Verification (Physics + LLM), Grounding Badges, Deterministic Key Health (`gemini_rotator.js`), and Atomic Idempotency (`safeWriteJsonAtomic`).
- **Multi-Stage NotebookLM MCP Verification (Dimension C)**:
  - **Stage 1 (Pre-Flight)**: Workload DNA Verification against QuickSpecs PDFs via `notebook_query`.
  - **Stage 2 (In-Flight)**: Conflict Resolution for complex multi-option constraints.
  - **Stage 3 (Post-Flight)**: Solution Grounding before customer presentation.
  - **Stage 4 (Closed-Loop)**: Delta Syncing from verified BOM reconciliations into product notebooks.
- **Continuous Telemetry & Drift Observability (Dimension D)**:
  - Complete per-run replay ledgers in `outputs/history/runs/{run_id}.json`.
  - Aggregated metrics in `outputs/history/pipeline_telemetry.json`.
  - Dynamic drift inspection (`drift_inspector.js`) alerting on customer BOM variations.
- **Knowledge Scoping & Isolation (Dimension E)**: Universal Master Knowledge Registry (`master_knowledge_registry.json`) for cross-chassis rules vs Product-Specific Partitioned Catalogs (`outputs/{Family}/{Gen}/{Model}/`) and dedicated NotebookLM notebooks. Zero cross-chassis contamination (`INV-24`).
- **Master Excel Pre-Sync Validation & Pruning (Dimension F)**: 15/15 Staging Guardrail checks before promotion (`INV-22`), Anomaly Drop Protection (`INV-23`), and automatic stale test payload pruning (`cleanTestPayloads`).
- **Re-scraping Diffs & Fail-Hard Integrity (Dimension G)**: Priority-based price trail deduplication (`INV-1`), GPL baseline preservation across $0 unbundled views (`INV-34`), obsolete badge sanitization (`INV-35`), and fail-hard execution on Steps 8-10 (`INV-5`).

---

## 49. Static Circular Dependency DAG & SonarQube Cyclomatic Complexity Guardrail (`INV-46`)
- **Zero Circular Dependencies DAG Enforcement**:
  - The repository's 350+ JavaScript, JSX, and CommonJS modules are statically validated to form a strict Directed Acyclic Graph (DAG) with **0 circular dependency cycles**.
  - Verified automatically in CI and pre-flight tests via `tests/unit/test_circular_and_complexity.js` and `npm run test:circular` (`scripts/maintenance/analyze_circular_deps.js`).
- **SonarQube-Style Cyclomatic Complexity (CC) Reduction**:
  - Monolithic aspect checker God-functions with CC $>100$ were systematically refactored into clean, single-responsibility pipelines:
    - **`product_meta.js`**: `synthesizeSubcategoryName` CC dropped from **130** to **10**, `classifyComponentRole` dropped from **30** to **11**, and `parseProductMeta` dropped from **36** to **15** using declarative `SUBCATEGORY_SYNTHESIS_RULES` matcher arrays.
    - **`support_manufacturing.js`**: `evalSupportManufacturing` CC dropped from **88** to **4** by extracting modular helpers (`tallySupportItems`, `computeWindowsLicensing`, `computeVmwareLicensing`, `computeLinuxLicensing`, `computeTapeAutomationMath`).
    - **`pcie_riser.js`**: `evalPcieRiserSlots` CC dropped from **104** to **1** by decomposing into `tallyPcieItems` and `calculatePcieSlots`.
    - **`storage_tri_mode.js`**: `evalStorageTriMode` CC dropped from **172** to **14** by extracting `buildSkuCategoryMap`, `isDriveComponent`, `tallyStorageItems`, `validateAlletraStorage`, and `validateStoreEverStorage`.
    - **`networking_ocp.js`**: `evalNetworkingOcp` CC dropped from **143** to **10** by extracting `buildSkuCategoryMap`, `parseAdapterPortCount`, `parseSynergyMezzanine`, `tallyNetworkingItems`, `validateSanTransceivers`, and `validateSynergyFabrics`.
  - Enforced continuously via `npm run test:complexity` with hard CC bounds ($\le 20$ for evaluators, $\le 15$ for sub-functions).

---

## 50. Isolated Test Execution, Failure Ledger & Diagnostic Telemetry (`INV-47`)
- **Process Isolation & Subprocess Architecture**:
  - Replaced brittle monolithic bash command chains (`node t1 && node t2 && ...`) with `scripts/maintenance/run_test_matrix.js`.
  - Every test file is spawned in an isolated Node.js child process with individual timeouts (60s default) and captured stdout/stderr streams.
- **Automated Failure Isolation & Ledgering**:
  - When any test fails, execution details (exact assertion mismatches, duration, exit code, line numbers) are captured into a highlighted diagnostic trace and persisted to `outputs/history/test_failure_ledger.json` using `safeWriteJsonAtomic`.
- **Targeted Fast-Path Reruns & Token Conservation**:
  - `npm run test:failed`: Re-runs ONLY the failing tests recorded in the failure ledger, clearing them once they pass.
  - `npm run test:isolated -- <file>`: Runs a single test in isolation with full verbosity and debug output.
  - `npm run test:all`: Executes the entire discovered test matrix across unit, chaos, integration, and e2e tiers, displaying duration metrics and summary tables.

---

## 51. Strict Generation & Product Family RAG Firewall (`INV-48`)
- **Zero Cross-Generation Bleeding**:
  - `local_rag_search.js` strictly isolates RAG lookups by targeted chassis/generation. When evaluating a Gen12 server, the engine is firewalled to `outputs/ProLiant/Gen12/DL380_Gen12/` and the Gen12 NotebookLM ID.
  - Eliminated dangerous blind fallbacks: if an SKU or query has no match in the target generation, it returns an empty result instead of leaking Gen11 components or cross-family storage options.

---

## 52. Autonomous Multi-Solution Cluster Partitioning (`INV-49`)
- **Mixed Proposal Dissection**:
  - Customer tenders frequently aggregate disparate hardware categories (e.g. 20x DL380 Compute nodes, 2x Alletra MP Storage arrays, 1x StoreEver MSL Tape Library, 4x Aruba switches) into a single spreadsheet.
  - `boq_preprocessor.js` and `multi_cluster_splitter.js` dissect these into distinct Solution Clusters, evaluating each against its own domain catalog without invalidly checking tape drives against server drive cages.

---

## 53. Ambiguity Inbox Escalation & Human Sign-off Protocol (`INV-50`)
- **No Ungrounded Auto-Healing**:
  - When encountering unknown, obsolete, or ambiguously phrased part numbers not certified by QuickSpecs or live catalogs, the engine halts auto-substitution.
  - The item is marked as `NEEDS_HUMAN_CLARIFICATION`, rendered with an Amber visual badge in the Topology Canvas, and surfaced in the Ambiguity Inbox for human engineer confirmation. Engineer decisions write persistent `KnowledgeDelta` records to `master_knowledge_registry.json`.

---

## 54. 4-Tier Vendor-Agnostic Taxonomy Protocol (`INV-51`)
- **Isolated Vendor Namespaces**:
  - To support multi-vendor portfolios (HPE, Dell PowerEdge, Cisco UCS, Lenovo ThinkSystem), the directory and RAG knowledge structure is standardized under `{Vendor}/{Family}/{Gen}/{Model}/`.
  - Guarantees zero cross-vendor data contamination while sharing the core 7-aspect physical math verification kernel.






