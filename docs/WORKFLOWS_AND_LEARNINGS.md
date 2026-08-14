# Workflows, Pipelines & Full Learnings

## 1. 6-Stage BOQ Evaluation Workflow
1. **Multimodal Parsing**: `gemini-2.5-flash` processes images/PDFs into structured BOQ JSON.
2. **CTO Normalization**: Resolves fractional math for multi-node chassis configurations.
3. **Aspect Math Guardrails**: Validates CPU TDP limits, memory channel symmetry, power lug kits, and PCIe slots.
4. **NotebookLM Grounding**: Queries HPE QuickSpecs for absolute truth on dependencies.
5. **Agentic Verification (Guardrail Loop)**: Gemini LLM orchestrates tools to resolve conflicts, re-simulate builds, and learn missing knowledge.
6. **Partner Portal Re-verification**: Cross-checks solutions against official HPE portals to derive `KnowledgeDeltas`.

## 2. System Learnings & Improvements
- **API Rate Limits & Key Rotation (429 & 503 Errors)**: High concurrency triggers strict Gemini API limits. We solved this by implementing an autonomous dynamic API Key Rotation architecture in `agentic_guardrail.js`. The system parses a comma-separated list of keys from `.env` and immediately reconstructs the `@google/genai` Chat session (preserving full message history) with a new active key if a `429` error is encountered, bypassing the traditional 15-second backoff loop.
- **Hallucination Prevention (Red-Teaming)**: We implemented a background Adversarial Agent (`adversarial_agent.js`) that continuously injects hallucinated BOQs to verify the evaluator's Catch Rate and Precision. This runs asynchronously and updates the `pipeline_telemetry.json` heartbeat.
- **Agentic Autonomy**: We replaced static LLM explanation prompts with an active **Guardrail Loop** using MCP tool definitions. The LLM can now call `simulate_build` and `record_knowledge_delta`.
- **Decoupling Scraping from Core Script**: We observed that globally hardcoded CDP parameters (like a 15,000px scroll threshold) were perfectly tuned for massive chassis like DL380 Gen12 but would artificially cause false-positive validation failures on smaller networking or storage scrapes. We resolved this ambiguity by implementing a Configuration-Driven Profile architecture (`scripts/config/profiles/`), moving generation-specific keywords and heuristics out of regex strings and into maintainable JSON profiles.
- **React Hook Hygiene & Execution Order (GAP-5)**: Early conditional returns (`if (isLoading)` or `if (error)`) before `useMemo` or `useEffect` hook definitions break React's hook call order, causing runtime crashes during state changes or tab navigation. All hooks MUST be declared unconditionally at top-level before any rendering conditionals.
- **Lint-Enforced Import Discipline & Zero-Warning Standard (GAP-7/8)**: Unused imports and dead variables pollute bundle size and mask bugs. Integrating `oxlint` into `package.json` (`npm run lint`) enforces a 0-warning, 0-error code quality benchmark across all 36 dashboard component files.
- **Canonical Data Contracts (GAP-11)**: Formalizing `.agents/DATA_DICTIONARY.md` ensures full structural compatibility between backend engine data providers (`boq_evaluator.js`, `conflict_graph.js`, `agentic_guardrail.js`) and React UI consumers.
- **Module Resolution & Script Modularization (GAP-15)**: Common utility helpers (like `csv_to_catalog.js`) required by system scripts (`sync_registry.js`, `rebuild_all.js`) must be maintained in canonical `scripts/` paths rather than archived directories to guarantee module require stacks pass cleanly in automated CI/CD pipelines.
- **Clean Root & Artifact Discipline (GAP-16)**: Standardized test output paths so scripts (like `e2e_headless_ui_test.js`) write JSON reports to `outputs/history/e2e_report.json` instead of writing stray files to the project root directory.
- **Playwright E2E UI Automation & Log Unpacking (GAP-17)**: Headless browser testing revealed that structured SSE log streams can broadcast objects (`{text, timestamp, stream}`) rather than raw strings. Safely coercing log objects before regex matching in `WorkflowStepper.jsx` and adding `data-tab` & `data-testid` attributes ensures robust automated tab navigation and 0-error component rendering.
- **Architectural Loose Coupling via Graphify**: By running `graphify` audits on our `scripts/` and `dashboard/src/` codebases, we successfully identified "God Nodes" and "Surprising Connections" (e.g., `agentic_eval.js` tightly coupling directly to `lib/local_rag_search.js`). We resolved this by refactoring backend agents to enforce strict loose coupling through a master barrel export (`scripts/lib/index.js`), which significantly improves modularity.
- **Anti-Slop UI Refactoring (Taste Skill)**: Standard templates often yield visually generic "AI slop". By incorporating the `design-taste-frontend` skill, we standardized on the **Geist** font, strict `rounded-xl` (12px) shapes, tight drop-shadows, and a high-contrast **Emerald Green (`#01A781`) / Slate** palette. This drastically improved data density and visual hierarchy in the React dashboard.
- **Token Optimization via Graphify Semantic Reports**: Agents reviewing this repository to understand code flow and logic MUST read the `graphify-out/GRAPH_REPORT.md` files (generated via Graphify) instead of executing full-file reads. Graphify summarizes architectural hubs and edges, effectively saving thousands of input tokens while preventing agents from hallucinating dependencies.
- **Graphify API Key Resolution**: `agentic_guardrail.js` utilizes a comma-separated list of Gemini API keys in `.env` for rotation. However, third-party Python tools like `graphify` expect a single valid key and will fail with `400 Invalid Auth key` if passed the raw list. Always extract a single key (e.g., `export GEMINI_API_KEY=$(grep GEMINI_API_KEY .env | cut -d '=' -f2 | awk -F',' '{print $3}')`) before running `graphify .`.

## 3. MCP Server & Tooling Workflow
The MCP server (`scripts/mcp_server.js`) exposes the local rule engine as standardized tools. 
When a BOQ evaluation results in low confidence, the orchestrator triggers `runAgenticGuardrail`, which uses these tools to iteratively resolve issues until a high confidence score is achieved.

## 4. Testing & Certification Suite
- **Aspect Math Unit Suite (`scripts/test_all_aspects.js`)**: 34 assertions covering physical hardware aspects (thermal, power, memory, PCIe, storage, network).
- **Evaluation Benchmarks (`scripts/test_boq_eval_benchmarks.js`)**: 5 scenarios validating violation recall rate (100.0%) and precision rate (100.0%) across strategy matrix tiers.
- **Portfolio Audit Suite (`scripts/verify_all.js`)**: 100% verification across all portfolio catalog outputs on disk.
- **UI End-to-End (`tests/e2e_headless_ui_test.js`)**: Headless browser test verifying full dashboard component rendering and user interaction flows.

## 5. DL380 Gen12 E2E Perfection & Fail-Safe Pipeline Learnings
- **Staging Isolation & Master Excel Integrity**: Live scrapes triggered from the Express dashboard execute inside isolated staging paths (`outputs/temp/staging_{chassis}_{ts}`). Promotion to live workspace (`{chassis}_OCA_Catalog.xlsx`, `{chassis}_Catalog.json`) occurs ONLY after `verify_excel_tally.js` certifies 100% row and SKU count accuracy. If any failure occurs, the live catalog remains 100% untouched while failed staging is preserved for diagnosis.
- **NotebookLM RAG Auto-Sync**: Post-flow sync (`post_flow_sync.js`) automatically refreshes the Markdown RAG payload (`notebook_sync_payload_DL380_Gen12_SFF.md`) and updates `notebooks.json` sync status (`lastSyncedAt`, `lastSyncDeltaCount`), maintaining real-time alignment between the Dual-Brain RAG and live catalog data.
- **Closed-Loop Telemetry & HITL Action Ledger**: Every evaluation run logs execution duration, confidence score, and domain violation counts into `pipeline_telemetry.json`. Human-in-the-loop actions (such as split confirmation or feedback drawer submissions) feed directly into `feedback_loop.js`, continuously improving evaluation precision over subsequent quote runs.
- **100% Headless UI Perfection**: Utilizing Playwright (`tests/e2e_headless_ui_test.js`), we achieved a flawless 7/7 (100%) test pass rate on the dashboard UI, confirming zero console or page errors across complex NotebookLM RAG payloads, interactive strategy matrices, and seamless local Node.js API endpoint connectivity.

## 6. Core Engine Gap Remediation & Full-Pipeline Perfection Learnings
- **Single Source of Truth for SKU Parsing (G1)**: Previously, [`boq_evaluator.js`](file:///home/vinodh/vendorNotebookSolution/scripts/lib/boq_evaluator.js) and [`boq_preprocessor.js`](file:///home/vinodh/vendorNotebookSolution/scripts/lib/boq_preprocessor.js) maintained duplicate ~80-line SKU extraction loops. We unified these into [`scripts/lib/boq_parser.js`](file:///home/vinodh/vendorNotebookSolution/scripts/lib/boq_parser.js) via `parseSkuLines()`, ensuring consistent regex cleaning, multiplier detection, and quantity normalization.
- **Master Barrel Export Integrity (G2)**: Expanded [`scripts/lib/index.js`](file:///home/vinodh/vendorNotebookSolution/scripts/lib/index.js) from 26 to 33 clean domain exports (`checksumDiff`, `dataValidator`, `skuVersioning`, `syncRegistry`, `profileLoader`, `xlsxExporter`, `boqParser`), providing a unified typed entrypoint.
- **Universal Atomic Write Compliance (G3, G21)**: Replaced bare `fs.writeFileSync` in [`pipeline_logger.js`](file:///home/vinodh/vendorNotebookSolution/scripts/lib/pipeline_logger.js) and `csv_to_catalog.js` with `safeWriteJsonAtomic()`. Integrated pre-commit schema validation (`validateSchema: true`) using [`data_validator.js`](file:///home/vinodh/vendorNotebookSolution/scripts/lib/data_validator.js).
- **Circular Dependency Break (G8)**: Relocated `DEFAULT_MANDATORY_SKUS` and `getMandatorySkusForChassis` to [`catalog_rules.js`](file:///home/vinodh/vendorNotebookSolution/scripts/lib/catalog_rules.js), completely eliminating circular require chains between `conflict_graph.js` and `boq_evaluator.js`.
- **Realistic Network & PCIe Math (G11, G12, G18)**: Replaced static port approximations with regex-driven port extraction (`1p`, `2p`, `4p`, `quad`, `dual`), dual OCP slot limit enforcement, and catalog-aware PCIe slot math in [`boq_evaluator.js`](file:///home/vinodh/vendorNotebookSolution/scripts/lib/boq_evaluator.js).
- **Universal Chassis Base SKU Mapping (G16)**: Updated `getChassisMap()` in [`conflict_graph.js`](file:///home/vinodh/vendorNotebookSolution/scripts/lib/conflict_graph.js) to aggregate both flat `chassis_base_skus` and nested `chassis_base_skus_by_family_gen` across all product lines (ProLiant, Synergy, Alletra, Cray, StoreEver).
- **Dynamic Strategy Matrix Economics (G19)**: Replaced static fallback prices ($250, $850, $1850) with itemized SKU pricing dynamically calculated from parsed catalog price maps in [`conflict_graph.js`](file:///home/vinodh/vendorNotebookSolution/scripts/lib/conflict_graph.js).
- **Agentic Guardrail Production Safety (G7, G13)**: Added 90-second overall timeouts, turn tracking, tool execution ledgers, and `pipeline_logger` integration in [`agentic_guardrail.js`](file:///home/vinodh/vendorNotebookSolution/scripts/lib/agentic_guardrail.js); added 25MB file size limits and path resolution guards in [`ocr_service.js`](file:///home/vinodh/vendorNotebookSolution/scripts/lib/ocr_service.js).
- **Learned Delta Deduplication (G15)**: Added `deltaId` and signature deduplication in [`knowledge_sync.js`](file:///home/vinodh/vendorNotebookSolution/scripts/lib/knowledge_sync.js) and [`conflict_graph.js`](file:///home/vinodh/vendorNotebookSolution/scripts/lib/conflict_graph.js).
- **N-Way Multi-Config Diff Matrix (G9)**: Extended `buildConfigDiffMatrix` in [`boq_preprocessor.js`](file:///home/vinodh/vendorNotebookSolution/scripts/lib/boq_preprocessor.js) to compare arbitrary $N$ configurations with multi-column tracking.
- **Component Role Classification Expansion (G17)**: Added explicit classification branches for `'GPU / Accelerator'`, `'PCIe Riser'`, `'Cable Kit'`, and `'Operating System / License'` in [`product_meta.js`](file:///home/vinodh/vendorNotebookSolution/scripts/lib/product_meta.js).
- **Multi-GPU Workload DNA Profiling (G27)**: Tracked multi-GPU configurations as arrays with total counts in [`conflict_graph.js`](file:///home/vinodh/vendorNotebookSolution/scripts/lib/conflict_graph.js).

## 7. DL380 Gen12 Combinations Suite & Positive/Negative Hardware Matrix Learnings
- **Positive Valid Baseline**: Valid DL380 Gen12 configurations with symmetric 16-DIMM DDR5, dual Xeon CPUs, and redundant PSUs yield a 100% PASS with 0 violations and >90% baseline confidence.
- **Negative Thermal Auto-Injection**: Processors exceeding 240W TDP (`P74573-B21` / `P73299-B21`) trigger thermal aspect violations. The autonomous guardrail auto-resolves and injects `P48820-B21` (High Performance Fan Kit) into Rank 1 solutions.
- **Negative Storage Battery Auto-Injection**: Tri-mode RAID controllers (`MR416i-o` `P55415-B21`) trigger write-back cache warnings. The engine auto-injects `P01366-B21` (96W Smart Storage Battery).
- **Negative Power DC Lug Auto-Injection**: Telco -48VDC power supplies (`865434-B21` / `P17081-B21`) mandate DC terminal lug connectors for electrical safety. The engine auto-injects `P36877-B21`.
- **Negative Memory Topology Channel Math**: 9 DIMMs across dual sockets triggers unbalanced channel warnings and interleaving penalties.
- **Cross-Generation Isolation**: Gen11 Xeon CPUs placed in Gen12 BOQs are flagged cleanly without crashing or cross-contaminating generation catalogs.
- **Multi-Sheet Multi-Config Preprocessing**: Ingesting multi-sheet workbooks automatically identifies variation drivers (`MEMORY_DENSITY_VARIATION`, `STORAGE_VARIATION`, `WORKLOAD_NODE_PURPOSE`).
- **Closed-Loop Feedback & Learning**: Human-in-the-loop or Partner Portal rejections write `KnowledgeDelta` records atomically (`outputs/.../history/catalog_deltas.json`), immediately updating subsequent evaluation runs to 100% confidence.

## 8. Vertical Category-Wise Strategy Matrix Grid & Blank SKU Cell Handling
- **Vertical Category Matrix Grid**: Renders hardware items grouped into 9 standardized physical rows: `Chassis Base`, `Compute Processors`, `Thermal Fans`, `Memory`, `Storage Controllers & Battery`, `Drive Media`, `Power Infrastructure`, `Networking & PCIe`, `Pointnext Tech Care`.
- **Clean Blank / Unneeded SKU Handling**: When candidate solutions (e.g. Rank 3 Cost Balanced or Rank 5 Budget Minimized) intentionally omit an add-on or accessory, the UI displays `— None Required (Standard Default Included)` to avoid confusing missing data errors.
- **1-Click Portal TSV Copy & Excel Export**: Instant tab-delimited copying for HPE Partner Portal entry and multi-sheet Excel export.

## 9. Master Catalog Multi-Sheet Excel Downloads & Color-Coded Delta History Formatting
- **Full Workbook Generation (`generate_xlsx.js`)**: Exports 6+ sheets (`Category Summary`, `All SKUs`, `Rules & Constraints`, `All Service SKUs`, `Price History Timeline`, `Discontinued SKUs`, `Metadata`) with freeze headers, auto-filters, and color-coded diff highlights:
  - 🟢 `ADDED` (Green)
  - 🔴 `REMOVED` (Red strikethrough)
  - 🟡 `PRICE_CHANGED` (Amber)
  - 🔵 `ATTRIBUTE_CHANGED` (Blue)
  - 🟣 `PRICE_AND_ATTRIBUTE_CHANGED` (Purple)

## 10. Gemini NotebookLM Anti-Clutter Clean Source Replacement & Dual-Brain Collaboration
- **Source Hygiene & De-Duplication (`knowledge_sync.js`)**: Before uploading a new sync payload, the sync engine queries `nlm source list` and removes/replaces stale existing sources for that chassis before uploading the fresh charter (`notebook_sync_payload_<Chassis>.md`), preventing duplicate source clutter in NotebookLM.
- **Dual-Brain Principle**:
  - **Grounding Brain (NotebookLM)**: Houses product QuickSpecs, delta history, price trends, and universal vendor rules for natural language semantic retrieval.
  - **Deterministic Verification Brain (Local Rule Engine + Agentic Guardrail)**: Evaluates physical aspect math (TDP, memory symmetry, electrical lugs, PCIe slots) with 100% confidence.

## 11. Data Architecture: TSV vs JSON Roles & Output Regeneration
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

## 12. HPE OCA Partner Portal Scraping Channels & Strict Navigation Protocol
- **Channel 1: Solution Root & Chassis Search Page**:
  - Contains Base Chassis CTO Variants (`P73282-B21` to `P73287-B21`) and their base list prices ($5,584 - $7,450).
  - Must be captured first before navigating deeper into node menus.
- **Channel 2: Product Node Menu & Extended Overview Menu**:
  - Contains all internal hardware subcategories (Processors, Memory, Power Supplies, Smart Chassis bundles, Drive cages, PCIe cards, Fans) and Aspect Rules.
- **Channel 3: Solution Services & Configured BOM Tab**:
  - Contains HPE Pointnext, Tech Care service tiers, and startup services.
- **Strict In-Page Navigation Protocol**:
  - **NEVER use browser `back()` button or raw direct URLs**: Direct URL navigation breaks authenticated WebLogic/OAuth SSO sessions.
  - **ALL navigation MUST execute via in-page DOM element clicks and jQuery tree selectors** via CDP within the active authenticated session.

## 13. UI/UX Hierarchy: Multi-Config BOQ Engine vs Product Catalog Browsing
- **BOQ Evaluation Engine (`orchestrator` tab)**:
  - **Product-Agnostic & Multi-Config**: A customer BOQ file (Excel/CSV/Text) often contains multiple sheets or multiple configuration sections (e.g. 4x Database Nodes with DL380 Gen12, 8x Web Nodes with DL380 Gen11, 1x Alletra Storage).
  - The BOQ engine autonomously inspects each line item, detects the chassis variant dynamically, and runs 6-aspect math across all detected configs.
  - The global header reflects `BOQ Engine Mode: Multi-Model Auto-Detect` to prevent the misconception that the user must choose a single product beforehand.
- **Product Catalog Explorer (`catalog` tab) & Scraper (`scraper` tab)**:
  - **Product-Scoped**: These views specifically browse or trigger scraping for a concrete hardware catalog.
  - An in-page **Product Line Switcher Bar** allows toggling between all 6 certified product lines (`DL380 Gen12`, `DL380 Gen11`, `Alletra`, `Synergy`, `MSL Tape`, `Cray`) directly within the view without confusing the global BOQ workflow.
