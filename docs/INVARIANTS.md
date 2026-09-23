# AGENTS.md — System Architecture & Agent Directives

**Agent Identity:** You are managing the HPE ProLiant AI Studio BOQ Evaluator & Conflict Resolution Engine.

**Current engineering handoff (2026-09-17):** Phases 1 through 13 of `docs/CONTINUATION_CHECKPOINT.md` are completed, committed, and fully certified. The full isolated test matrix is **167/167 suites PASSED (100.0%)** (101 unit, 40 chaos, 26 integration) plus 3/3 Playwright headless E2E browser suites with 0 lint warnings/errors on 110 files, clean dashboard build, 11/11 sample portfolio BOMs certified, all Codex audit findings F01–F13 resolved, and all functions passing the cyclomatic complexity gate ($CC \le 135$). See `docs/CONTINUATION_CHECKPOINT.md`. All AI agents must strictly follow the canonical production workflow without writing ad-hoc scripts.

## 0. Permanent Universal MCP Auto-Approval & Zero-Waiting Policy (MANDATORY & UNCONDITIONAL)
- **100% Pre-Authorization**: The human developer has granted **FULL, UNCONDITIONAL, AND PERMANENT APPROVAL** for EVERY MCP tool call across ALL configured and future servers without exception:
  - **`jules`**: `create_session`, `send_reply_to_session`, `get_session_state`, `get_bash_outputs`, `list_sessions`, `query_cache`, `get_code_review_context`, `show_code_diff`.
  - **`gemini-notebook-mcp`**: all 35+ tools (`notebook_query`, `cross_notebook_query`, `notebook_create`, `source_add`, `notebook_list`, etc.).
  - **`notebooks`**: all 8+ tools (`create_notebook`, `insert_code_cell`, `insert_markdown_cell`, `replace_cell`, etc.).
  - **`data-agent-kit`**: all tools (`get_active_editor_context`, `get_active_gcp_connection`, `read_resource`, etc.).
  - **`visualization`**: `render_chart`.
  - **`graphify`**, CDP browser navigation, knowledge extractor, etc.
- **Zero Human Waiting**: AI Agents MUST NEVER pause, prompt, ask for human confirmation, or wait for human approvals to execute ANY MCP tool call, plan approval, code review, test run, message dispatch, source addition, or session management action. Execute all operations autonomously and immediately in the background.

## 1. Mandatory First Step (Dynamic Discovery)
- **Query the Graph First:** Upon entering any session in this repository, DO NOT blindly read the entire `graphify-out/GRAPH_REPORT.md` (which is large). Instead, you MUST prioritize using the `graphify` skill (e.g., `/graphify query "<question>"`) to dynamically trace code paths, query community boundaries, and locate God nodes. This heavily saves context tokens.
- **Do Not Brute-Force Read:** Do not use `grep` or `cat` in loops to find code. Instead, use the `graphify` skill to dynamically trace code paths and dependencies.

## 2. Static Knowledge vs. Dynamic Knowledge
- **Static Rules (Read Once):** Core architectural rules (Dual-Brain), UI anti-slop guidelines (`design-taste-frontend`), data dictionary schemas (`.agents/DATA_DICTIONARY.md`), directory structure (`docs/DIRECTORY_STRUCTURE.md`), and fail-safe mechanisms are static. Read them here and in `docs/`.
- **Dynamic Logic (Query on Demand):** File dependencies, execution paths, and specific implementation logic change frequently. Query the live graph for these.

## 3. Golden Directives (Token-Optimized)
- **Use Skills for Depth:** This project uses specialized skills in [`.agents/skills/`](file:///home/vinodh/vendorNotebookSolution/.agents/skills/). If you need details on BOQ Evaluation, Scraping, NotebookLM RAG, Knowledge Sync, or Orchestration workflows, read the respective `SKILL.md`.
- **Atomic File Operations:** Always use `safeWriteJsonAtomic` in `scripts/lib/system/fs_compat.js` for writing JSON files to prevent corruption. No bare `fs.writeFileSync` for JSON.
- **Fail-Safe & Dual-Brain:** The system relies on a local Rule Engine (deterministic) and an Agentic MCP Guardrail (LLM/RAG). The frontend MUST NOT break if the LLM/API is offline or rate-limited.
- **No Mock Stubs:** All UI components and backend scripts must be fully functional and trigger real actions. UI metrics must be derived dynamically from JSON metadata.
- **Strict Directory Hierarchy:** Zero loose files are allowed at the root of `scripts/`, `scripts/lib/`, or `tests/`. All functionality is encapsulated within modular domain subdirectories.

## 4. Architecture & Documentation Index
For full architectural details, coding decisions, and project learnings, refer to the consolidated docs:
- [`docs/DIRECTORY_STRUCTURE.md`](file:///home/vinodh/vendorNotebookSolution/docs/DIRECTORY_STRUCTURE.md): Canonical directory mapping and file hierarchy across the entire repository.
- [`docs/ARCHITECTURE_AND_DESIGN.md`](file:///home/vinodh/vendorNotebookSolution/docs/ARCHITECTURE_AND_DESIGN.md): Core architecture, Dual-Brain paradigm, data dictionary, and Mermaid diagrams.
- [`docs/WORKFLOWS_AND_LEARNINGS.md`](file:///home/vinodh/vendorNotebookSolution/docs/WORKFLOWS_AND_LEARNINGS.md): E2E Pipelines, Agentic Guardrail loops, Continuous Benchmarking (Adversarial Red-Teaming), and MCP workflows.
- [`docs/DEVELOPER_GUIDE.md`](file:///home/vinodh/vendorNotebookSolution/docs/DEVELOPER_GUIDE.md): Local development, UI/UX standards, testing (eval/benchmarks), and API rate limit handling.

## 5. Key Technical Decisions & Operational Guardrails
- **MCP Agentic Loop & Closed-Loop Extractor:** The BOQ Evaluator utilizes an MCP Server (`scripts/services/mcp_server.js`), an Agentic Guardrail (`scripts/lib/rag/agentic_guardrail.js`), and a generic NLP Knowledge Extractor (`scripts/lib/notebook/knowledge_extractor.js`) to parse verified RAG answers into persistent `KnowledgeDelta` records.
- **Autonomous Learning & Drift Sync:** RAG responses are structured and scoped into `catalog_deltas.json` (chassis-specific) and `master_knowledge_registry.json` (family/universal). Post-flow sync (`scripts/lib/sync/post_flow_sync.js`) guarantees bi-directional alignment before logging telemetry.
- **Zero-Hardcoding Compliance:** Aspect checkers (`scripts/lib/aspects/compute_thermal.js`, `memory_channel.js`, `power_environment.js`, etc.) maintain strict 0-hardcoded SKU strings, resolving form factor rules dynamically via `chassis_map.json` and catalog rules.
- **Red-Teaming & 100% Test Certification:** Continual adversarial stress-testing (`tests/chaos/test_failure_modes_and_chaos.js`) and 50+ comprehensive test suites maintain a 100% pass benchmark across unit, integration, chaos, and e2e tiers.
- **Async Task Mutex & Process Lifecycle:** `server.cjs` manages long-running child processes with `isTaskRunning()` and `proc.on('error')` guards, preventing stale mutex locks and false 409 Conflict errors.
- **Zero-Warning Code Quality:** All React dashboard components and backend services strictly adhere to a 0-warning, 0-error lint benchmark (`npm run lint` with `oxlint`).
- **Universal MCP & Learning Auto-Approval:** EVERY MCP server and tool (`gemini-notebook-mcp`, `graphify`, `notebooks`, `data-agent-kit`, `visualization`, CDP browser navigation, knowledge extraction, and learning pipelines) is 100% pre-authorized and auto-approved across all workflows (scraping, verification, knowledge sync, graph generation, BOQ evaluation). AI Agents MUST NOT prompt the human user for permission to execute MCP tool calls; run them autonomously without friction.
- **Dynamic Semantic Graph (`graphify`):** The repository maintains a live semantic dependency graph (updated via git hooks) for token-efficient architecture discovery. If you make significant uncommitted code changes during a session, run `npm run update:graph` to sync the graph before querying it.

### 5.1 Critical Production Invariants (INV-1 through INV-14)
- **INV-1: Price Trail `appendTrailEvent` deduplicates by DATE not (date+status)**: Deduplicates by `date` only using a priority table (`BASELINE < UNCHANGED < ADDED < PRICE_CHANGED`). Same-day reruns of an unchanged SKU record exactly one entry.
- **INV-2: SKU Count in Registry Must Come from `liveCatalogJson`, NOT `tables.length`**: Reads `liveCatalogJson.metadata.totalUniqueSKUs` for hardware and services. Never count raw DOM tables as SKUs.
- **INV-3: Stage Stepper Uses Direct SSE Stage ID Match, Not Percent Buckets**: `SCRAPER_STAGES` matches on `stg.id === currentStageId` directly rather than arbitrary bucket percentage divisions.
- **INV-4: `master_knowledge_registry.json` Must Contain `generatedAt` and `schemaVersion`**: Canonical metadata timestamp fields required by the dashboard.
- **INV-5: Step 10 (`sync_all_registered_catalogs`) Failure MUST Rethrow — Never Silent Warn**: Staging audit, knowledge sync, and registry sync are all fail-hard.
- **INV-6: `scrapeDate` in `build_catalog.js` Metadata MUST Be `YYYY-MM-DD` Only**: Stable snapshot date key prevents runaway snapshot file generation.
- **INV-7: Test-Chassis Sync Payloads Must Be Routed to `outputs/temp/test_payloads/`**: Test chassis payloads never pollute production `outputs/history/`.
- **INV-8: Fast Substring Pre-Check for Async Catalog History Parsing**: Uses `rawContent.includes('"parentCategory":"Chassis"')` before full JSON parsing.
- **INV-9: Memoized SKU Price Cache with Lifecycle Reset**: `getHistoricalSkuPrice` caches catalog SKU maps in `catalogPriceCache` for $O(1)$ amortized lookups across multi-item BOM audits.
- **INV-10: Jules Task Manager Autonomous Background Delegation & Closed-Loop PR Protocol**: Multi-agent task handoff delegates boundary test generation and PR reviews asynchronously.
- **INV-13: Closed-Loop Knowledge Delta Deduplication**: Deduplicates incoming rules against `catalog_deltas.json` and `master_knowledge_registry.json` matching on `(chassis, affectedSku, requiredDependencySku, rawMessage/ruleUpdate)`.
- **INV-14: Whole-Solution BOM Manifest Context in Grounded RAG Queries**: `formatNotebookQueryPayload` in `boq_evaluator.js` must always bundle the entire solution BOM manifest (comma-separated SKU quantities), detected physical issues, proposed fixes, and 5-tier strategy summaries. Never dispatch isolated, single-SKU queries to NotebookLM/RAG for whole-solution validation; always preserve full topological context.

## 6. Google Jules Autonomous Multi-Agent & PR Communication Protocol (MANDATORY)
The system leverages Google Jules for background code review, test generation, and boundary stress-testing via `@google/jules-sdk` and `scripts/services/jules_task_manager.js`. To ensure zero friction and avoid requiring the human user to act as a middleman, AI agents MUST strictly follow this closed-loop protocol:

1. **Mandatory Explicit PR Notifications (`scripts/services/jules_task_manager.js send`)**:
   - Whenever an AI agent modifies, fixes, or refactors code on a branch associated with a Jules session/PR, the agent **MUST NOT stop after git push**.
   - The agent **MUST immediately send an explicit notification message** into the corresponding Jules session:
     ```bash
     node scripts/services/jules_task_manager.js send <sessionId> "PR Verification Update: Branch <branchName>, Commit <commitHash>. Changes: <summaryOfChanges>. Please test and certify all test suites pass 100%."
     ```
   - Jules needs exact context: (1) Branch name, (2) Commit hash, (3) Rationale & changes made, (4) Verification expectations.

2. **Autonomous Feedback & Issue Remediation Loop**:
   - AI agents must proactively check session activity using `node scripts/services/jules_task_manager.js list` or `status <sessionId>`.
   - When Jules comments on issues or edge-case gaps, the agent must inspect Jules's reasoning, fix the underlying architectural pattern (not just isolated symptoms), run full regression tests, push to the branch, and reply to Jules in the session.
   - Do not wait for the human user to prompt or relay messages between agents.

3. **PR Merge & Artifact Hygiene Standards**:
   - Before merging any PR created by Jules, the agent must inspect `git diff --stat` to ensure no accidental build artifacts (e.g. `outputs/history/*.json` dumps, temp files) were committed (Invariant INV-7 & INV-10).
   - Ensure all 50+ test suites (`npm run test:all`), portfolio audits (`npm test`), and zero-warning lints (`npm run lint`) pass 100% before integrating into `main`.

4. **Post-Merge Remote Branch Pruning & Full Ownership (`INV-11`)**:
   - Once all code and tests from a Jules PR branch are merged and certified on `main`, the AI agent takes full responsibility to delete the stale remote feature branch (`git push origin --delete <branch>`) and send a completion message to Jules.
   - Never leave stale, abandoned, or lingering feature branches on GitHub once their work has landed on `main`.

5. **Full Activity-Patch Audit Protocol Before Session Retirement (`INV-12`)**:
   - When any Jules session finishes or pauses, the AI agent must **never assume code is only on a remote git branch**.
   - The agent MUST execute `node scripts/services/jules_task_manager.js audit <sessionId>` to inspect all session activities, patch deltas, and authored files.
   - If valuable tests or code fixes exist in the session's activity log that were not pushed to GitHub, the agent must extract them, run local validation (`npm run test:all`), commit them to `main`, and certify 100% compliance.

6. **Proactive Multi-Agent Scheduling & Final Authority Governance (`INV-15`)**:
   - Whenever an Antigravity AI Agent delegates work to Google Jules or has an active Jules session in flight, the agent **MUST NOT go idle or wait for the human user to prompt or relay messages**.
   - The agent **MUST proactively schedule periodic background wakeups** using the `schedule` tool (`DurationSeconds=120-180`, `TimerCondition="never"`) to inspect session progress, query activities (`session.activities.list()`), answer clarifications, push remediation code, and verify final certification until the task is complete.
   - **Antigravity is the Architect & Final Authority**: Antigravity governs all multi-agent work, inspecting git diffs, certifying all 50+ test tiers (`npm run test:all`), verifying 7/7 portfolio products (`verify_all.js`), auditing Excel workbooks, and ensuring zero regressions before declaring final completion.

7. **Cross-Platform Universal Compatibility Contract (`INV-16`)**:
   - All CI workflows, test suites, and build scripts MUST be strictly cross-platform across Ubuntu, macOS, and Windows.
   - Zero shell-specific binary dependencies (no `unzip`, `which`, `curl`, `grep`, or `rm -rf` via `execSync`). Use pure in-memory JavaScript (`xlsx-js-style` cell styles, `os.homedir()`, `safeWriteJsonAtomic`).
   - Frontend tooling must pin stable production LTS releases (Vite 6, Vitest 3) and use `npm install --include=optional` in CI to avoid native platform binding omissions in npm lockfiles.

8. **Catalog Ingestion & Classification Diagnostics Observability (`INV-17`)**:
   - `build_catalog.js` MUST always emit structured provenance traces (`outputs/{Family}/{Gen}/{Model}/history/classification_diagnostics.json`) via `ClassificationDiagnostics`.
   - All test assertion suites MUST provide rich introspective diff reporting linking directly to the provenance trace upon any assertion failure.

9. **Cross-Platform Pull Request & Branch Inspection Protocol (`INV-18`)**:
   - AI agents MUST NOT execute shell-dependent CLI binaries like `gh pr list` which fail when `gh` is uninstalled.
   - ALWAYS use `node scripts/services/jules_task_manager.js prs` (or `npm run jules:prs`) which leverages native Node.js `fetch` against the GitHub REST API (`https://api.github.com/repos/.../pulls`) with automated token resolution and zero external dependencies.
   - For pruning remote branches, ALWAYS use `node scripts/services/jules_task_manager.js prune` (or `npm run jules:prune`).

10. **Audit-Before-Archive Session Lifecycle Governance (`INV-19`)**:
   - Completed Jules sessions MUST NOT remain in the active query pool indefinitely.
   - AI agents MUST execute `node scripts/services/jules_task_manager.js archive-completed` (or `npm run jules:archive`).
   - The archive procedure strictly runs a full thread and patch audit (`auditSession`) before archiving the session on the Jules API (`session.archive()`), and logs a structured trace record to `outputs/history/jules_archived_sessions.json`.

11. **WebLogic OCA Dynamic DOM Expansion & Full Sub-Choice Trigger Protocol (`INV-20`)**:
   - WebLogic-based OCA menus contain collapsed sub-choice groups (`showmore_*`), toolbar toggles (`#show_extra_columns`, `#show_dates`, `#show_obsolete_date`, `#show_cost`, `#show_price`), and deferred table panes.
   - `cdp.js` must click all toolbar toggles, check all `showmore_*` inputs, and dispatch jQuery `change` events (`jQuery(i).prop('checked', true).trigger('change')`) to force the WebLogic client runtime to render all hidden sub-choice tables (e.g. `ProcessorSection_AdditionalProcessorsChoice`). Never rely solely on scroll height or top-level table counts.

12. **Lifecycle Status Tag & Clean PID Separation Protocol (`INV-21`)**:
   - WebLogic OCA renders lifecycle status badges inside `<td class="item_prod">` as `<span class="td_prod">OB</span>` or `<span class="td_prod">90</span>` alongside `<span class="_pid">SKU</span>`.
   - `dom_extract.js` and `build_catalog.js` MUST separate lifecycle status tags (`OB` Obsolete, `DS` Direct Ship / Discontinued, `90` 90-Day Warning, `EOL` End of Life) from the clean SKU string. SKUs must never have un-stripped leading or trailing text that causes regex rejections in `isValidHpeSKU()`. All extracted lifecycle statuses, effective start dates, and discontinued/obsolete dates MUST be preserved in the catalog JSON, TSV, and 22-sheet Excel workbooks.

13. **Category Cardinality & Proactive Provenance Pre-Commit Assertion (`INV-22`)**:
   - Staging validation (`verify_excel_tally.js`, `test_pipeline_evals.js`) must not just check `totalUniqueSKUs > 0`. Flagship servers (DL380, DL360, Synergy, Cray) have mandatory minimum cardinality thresholds for key categories (e.g. Flagship 2P servers require >= 30 processor SKUs).
   - If a flagship server catalog contains fewer than the expected minimum category options, the staging audit must fail hard in Step 8, aborting promotion of an incomplete catalog to live workspace and preventing knowledge drift.

14. **Catastrophic Drop & Anomaly Pre-Promotion Guardrail (`INV-23`)**:
    - Staging validation (`verify_excel_tally.js`) compares staging SKU counts against the previous baseline snapshot before promotion.
    - If a staging catalog experiences an unexpected drop (>30% drop below previous baseline without explicit decommissioning), the pipeline MUST raise a hard `INV-23 Anomaly Alert` in Step 8 and abort promotion.
    - The existing live master Excel workbook, JSON companion, and history snapshots remain untouched and completely protected against corruption.

15. **Knowledge Base Grounding & Customer BOQ Isolation Protocol (`INV-24`)**:
    - Customer BOQ, quote, or tender files MUST NEVER be added or synced to NotebookLM knowledge sources directly. Customer inputs inherently contain human errors, invalid component quantities, deprecated part numbers, or missing enablement kits. Ingesting raw customer BOQs directly would poison the RAG intent brain with unverified errors.
    - Cloud NotebookLM sources are strictly reserved for: (1) Official vendor QuickSpecs PDFs, (2) Ground-truth live OCA scraped master catalogs (22-sheet Excel companions and master CSVs), and (3) Verified, deduplicated `KnowledgeDelta` learning payloads emitted by the closed-loop feedback engine. Customer BOQs are treated exclusively as runtime evaluation inputs tested against this ground-truth baseline.

16. **Multi-Chassis Container Tree & Option Placement Protocol (`INV-25`)**:
    - Every server configuration in HPE OCA/CLIC is a structured container tree. Components inside a CTO chassis must carry the `#0D1` (Factory Integrated Option / FIO) suffix. Standalone BTO components (e.g. `P64707-B21` memory) placed outside the server container will fail CLIC validation with unbuildable errors (Rules 81354490 & 91001655).
    - `multi_cluster_splitter.js` and `boq_evaluator.js` MUST enforce FIO option tagging (`#0D1` / `-F21`) for all internal components nested inside a CTO base chassis container.

17. **Storage Expander & Tri-Mode Controller Port Channel Math (`INV-26`)**:
    - Dedicated Tri-Mode RAID controllers have strict direct-attach drive limits (8-port controllers like `MR408i-o` / `MR216i-p` can only directly address 8 physical drives).
    - Configurations with 16 or 24 drives on a single controller MUST include a SAS Expander Card (`P48835-B21`) or Tri-Mode Switch Card (`P55806-B21`). Controller enablement cables (`P48918-B21`) MUST be used for OCP controllers on standard 8SFF cages; Y-splitter cables (`P48832-B21`) are strictly restricted to PCIe riser cards on Premium cages (Rules 81354627 & 81354632).

18. **GPU Accelerator Auxiliary Power & Thermal Envelope Protocol (`INV-27`)**:
    - High-power PCIe GPUs (NVIDIA L40S, A100, H100) require dedicated GPU Auxiliary Power Cable Kits (`P48816-B21` / `P76450-B21`) to connect to the internal power distribution board.
    - The presence of high-wattage GPUs mandates High-Performance Fan Kits (`P48820-B21`), High-Performance Heatsinks, and redundant power supplies (>=1600W).

19. **OS & Hypervisor Physical Core Multiplier Licensing Protocol (`INV-28`)**:
    - Microsoft Windows Server and VMware vSphere Foundation/Cloud Foundation are licensed per physical CPU core with strict base minimums (Windows Server: 16 cores per server minimum; VMware: 16 cores per socket minimum).
    - `support_manufacturing.js` MUST calculate total physical socket cores (`cpuCount * coresPerCpu`) and validate that base licenses plus additional core packs (`2-core` / `4-core` / `16-core` add-ons) equal or exceed total server cores.

20. **Multi-Node Cluster Infrastructure & Power Sizing Matrix (`INV-29`)**:
    - Large multi-node tenders (e.g. 60x DL380 nodes) require comprehensive data center infrastructure synthesis.
    - `boq_evaluator.js` and `multi_cluster_splitter.js` MUST emit `clusterSizing` containing: (1) Total Rack Units (`serverCount * 2U`), (2) Standard 42U Rack Count (`ceil(totalRU / 42)`), (3) Peak Facility Power Envelope (`(serverCount * psuWattage) / 1000` kW), (4) Rail Kit Coverage (`P52341-B21` Easy Install Rail Kit 1 per node), and (5) High-line 200V-240V utility power derating protection when estimated node draw exceeds 800W.

21. **EU Ecodesign Lot 9 & Regulatory Platinum PSU Enablement Protocol (`INV-30`)**:
    - Dual-socket servers with high-draw TDP configurations default to EU Ecodesign Regulation 2019/424 (ErP Lot 9) in HPE OCA, requiring 96% Titanium power supplies.
    - When ordering 94% Platinum PSUs (`P38997-B21`), `power_environment.js` and `boq_evaluator.js` MUST inject `P35876-B21` (HPE CE Mark Removal FIO Enablement Kit, $1 list) in Factory Configuration Settings for non-EU/global deployment to clear regulatory software prompts without altering the customer's requested PSU model.

22. **PCIe Riser 5th Slot Power Delivery Cable Protocol (`INV-31`)**:
    - When 5 or more physical PCIe expansion cards are populated across risers (e.g. 2x FC HBAs + 2x PCIe NICs + 1x RAID controller), physical Slot 1 on Primary Riser `P48803-B21` requires the dedicated Primary Cable Kit `P56073-B21` to supply power and PCIe lanes (Rules 81016755 & 81354683).

23. **Zero Unsolicited Software, Startup Services & Standardized Reconciliation BOM Protocol (`INV-32`)**:
    - Optional software licenses (e.g. `S1A05A` SaaS packages) and optional on-site services (e.g. `HA114A1` Installation and Startup Service, `HA114A1 5A6` ONS Startup SVC) MUST NEVER be automatically injected into customer BOMs or Rank 1 intent builds unless explicitly requested by the customer.
    - Support service evaluation defaults to standard 3-year basic care (`HU4B2A3` / `HU4B2A300DK` or base Tech Care) without bundling unsolicited installation services.
    - All generated Partner Portal Upload and Tender BOM workbooks MUST conform to the standardized 7-column header contract required by `ReactVendorSolution` and automated reconciliation engines: `['Part No', 'Qty', 'Set', ' Description', 'Unit List Price (USD)', 'Extended Price (USD)', 'Portal / CLIC Status']`, with per-cluster subtotal rows (`CONFIG #N SUBTOTAL:`) and 2-line separator gaps.

24. **Single Source of Pricing Truth & Zero Standalone Price Hardcoding (`INV-33`)**:
    - All configurators, workbook generators, and evaluation engines MUST resolve SKU list prices dynamically via `getHistoricalSkuPrice()` or `catalog.json` / `price_history.json`.
    - NEVER declare standalone, hardcoded price arrays or mock budgetary placeholders in scripts. All pricing data must reside exclusively within certified catalog and price history data layers.

25. **Dynamic GPL Price Baseline Preservation Across Unbundled Views (`INV-34`)**:
    - When scraping WebLogic OCA portals where prices may temporarily render as `$0.00` in unbundled views or during UI state transitions, `build_catalog.js` and `diff_catalog.js` MUST load `historyPriceMap` from `price_history.json` and prior snapshots.
    - Verified historical Global List Prices (GPL) are preserved so no pricing data is lost or zeroed out between runs.

26. **Obsolete Vendor Description Badge & Concatenation Sanitization (`INV-35`)**:
    - WebLogic DOM rendering occasionally concatenates vendor error strings inside `<td class="item_desc">` (e.g. `Product is obsolete: <SKU>`).
    - `build_catalog.js` and `dom_extract.js` MUST strip all `Product is obsolete:\s*[A-Z0-9-]+\s*` and embedded status badges (`OB`, `DS`, `90`, `EOL`) from descriptions, isolating obsolete parts cleanly into the `Discontinued SKUs` sheet and metadata.

27. **Universal Dynamic Product Generation Hierarchy (`INV-36`)**:
    - The repository enforces a strict 3-tier taxonomy: `{Family}/{Gen}/{Model}/`. All chassis form-factor variants (8SFF, 24SFF, 8LFF, 12LFF, EDSFF, etc.) MUST be contained within the single product generation directory (e.g. `outputs/ProLiant/Gen12/DL380_Gen12/` and `outputs/ProLiant/Gen11/DL380_Gen11/`).
    - No duplicate or fragmented form-factor model directories.

28. **Automated Multi-Cluster Tender Subtotal & 2-Line Gap Formatting Protocol (`INV-37`)**:
    - All generated Partner Portal Upload workbooks and tender reconciliation sheets maintain the exact 7-column schema required by vendor portals: `['Part No', 'Qty', 'Set', ' Description', 'Unit List Price (USD)', 'Extended Price (USD)', 'Portal / CLIC Status']`.
    - Each server cluster partition is demarcated by a subtotal row (`CONFIG #N SUBTOTAL:`) in Column index 2 (`Set`) and followed by exactly 2 blank separator lines to ensure seamless, error-free ingestion into automated vendor configuration pipelines.

29. **Dynamic Chassis Directory Path Resolution in Sku Versioning (`INV-38`)**:
    - `sku_versioning.js` (`getSkuAuditHistory`, `getHistoricalSkuPrice`) implements `resolveChassisDirectory(dir)` to dynamically locate product generation folders under `outputs/{Family}/{Gen}/{Model}/` when called with bare model identifiers (e.g. `DL380_Gen11`, `DL380_Gen12`, `GX5000_General_RACK`).
    - Eliminates stale or broken lookups against `./DL380_Gen11` at the repository root and preserves clean atomic file read operations across all multi-product test tiers.

30. **Multi-Cluster Architectural Partitioning & Form-Factor Pivot Protocol (`INV-39`)**:
    - Complex multi-server tenders (e.g. 60-node RFQs with mixed Platinum 8580 and Gold 6530 processors) MUST be dynamically partitioned into homogeneous workload clusters (e.g. Cluster A: 20x Platinum nodes, Cluster B: 40x Gold nodes).
    - Thermal and PSU wattage matching is strictly enforced per cluster (350W TDP requires 1800W Titanium PSUs; 270W TDP pairs with 1600W Platinum PSUs).
    - When raw customer RFPs combine an OCP storage controller (MR408i-o) with dual OCP NICs exceeding the 2 physical OCP slots, the engine executes a Form-Factor Pivot to a PCIe controller (MR416i-p), freeing OCP Slot 1 and achieving 100% buildable compliance.

31. **Continuous Knowledge Auto-Sync & Milestone Drift Immunity Protocol (`INV-40`)**:
    - The engine MUST NOT rely on manual human prompts to synchronize verified learnings between the deterministic rule engine and Gemini NotebookLM.
    - Automatic background knowledge synchronization (`triggerPostFlowSync`) is triggered on key workflow milestones: (1) Live scrape promotion (Step 9/10), (2) BOQ evaluation completion, (3) Partner quote reconciliation (`/api/verify-vendor-bom`), and (4) HITL feedback submission (`/api/feedback-submit`).

32. **Dual-Brain RAG Headroom & 24-Hour TTL Cache Invalidation Protocol (`INV-41`)**:
    - Deep multi-part RAG queries against NotebookLM require sufficient execution headroom: default RAG timeout is set to 120s, and Agentic Guardrail overall timeout is set to 180s (3 minutes) with a 3-query budget cap to prevent rate limits.
    - Disk cache entries in `notebook_query_utils.js` enforce a strict 24-hour TTL with automatic timestamp eviction on startup and lookups.
    - The UI (`BoqUploader.jsx`) explicitly renders high-contrast status banners distinguishing between Cloud Grounded (`NOTEBOOK_LM_CLOUD`) and Local Verified Fallback (`LOCAL_VERIFIED_FALLBACK`).

33. **Mathematically Rigorous Hamilton–Hare Diophantine Multiplier Allocation Protocol (`INV-42`)**:
    - Multi-server tender partitioning (`multi_cluster_splitter.js`) implements the exact Hamilton–Hare Largest Remainder Method to allocate integer server quantities across clusters.
    - Each cluster calculates an exact proportional target share $E_i = N_{\text{total}} \times \frac{Q_i}{\sum Q}$, an integer base multiplier $\lfloor E_i \rfloor$, and a fractional remainder $E_i - \lfloor E_i \rfloor$.
    - The deficit $D = N_{\text{total}} - \sum \lfloor E_i \rfloor$ is distributed $+1$ each to the top $D$ clusters sorted by remainder descending, mathematically guaranteeing $\sum N_{\text{cluster}} = N_{\text{total}}$ across all permutations without fractional losses or surplus chassis.

34. **MCP-First Jules Lifecycle Order & Zero-Human Relay Invariant (`INV-43`)**:
    - AI agents MUST prioritize MCP tools (`jules/list_sessions`, `jules/get_session_state`, `jules/send_reply_to_session`, `jules/get_code_review_context`, `jules/show_code_diff`, `jules/create_session`) over CLI commands to inspect `pendingPlan`, `lastAgentMessage`, and structured status flags (`busy`, `stable`, `failed`).
    - The agent MUST strictly execute the 8-stage lifecycle in exact chronological sequence: (1) Laser-focused dispatch, (2) Mandatory heartbeat cron (`schedule DurationSeconds=120`), (3) Two-way plan auto-approval and unblocking, (4) Structured code review and diff inspection before archiving, (5) PR verification and merge to `main` with 100% test pass, (6) Remote branch pruning ONLY AFTER merge to `main`, (7) Audit-before-archive session retirement, and (8) Proactive gap scan for new task dispatch.
    - Zero human relaying: Antigravity autonomously answers clarifications, approves plans, verifies test suites, and keeps the heartbeat cron active until all tasks are certified.

35. **Google Jules SDK Client Method Contract & State Machine Lifecycle (`INV-44`)**:
    - `@google/jules-sdk` client methods: `client.sessions` is a callable factory function (`client.sessions()`), and the collection listing method is `.all()` (e.g. `await client.sessions().all()`). Calling `client.sessions.list()` is an anti-pattern and throws `TypeError`.
    - `session.activities.history()` is an async generator for streaming complete historical activities (`for await (const act of s.activities.history())`).
    - When a session enters `awaitingUserFeedback`, the agent MUST immediately unblock it using `session.approve()` or `session.send(message)`. The session will transition from `awaitingUserFeedback` to `progressUpdated` as it commits and pushes PR branches.

36. **Enterprise Workflow Atomic Decomposition & Continuous Grounding Contract (`INV-45`)**:
    - Heavy workflows MUST be decomposed into fine-grained atomic stages with SSE telemetry:
      - **10-Stage Scraping**: (1) SSO & Portal Navigation $\rightarrow$ (2) Chassis Discovery & Base Price $\rightarrow$ (3) OCA Menu Entry $\rightarrow$ (4) Dynamic DOM Expansion (`INV-20`) $\rightarrow$ (5) Raw Table Ingestion $\rightarrow$ (6) Lifecycle Badge Separation (`INV-21`) $\rightarrow$ (7) 22-Sheet Category Mapping $\rightarrow$ (8) Staging Excel Generation $\rightarrow$ (9) 15/15 Staging Audit (`verify_excel_tally.js`) $\rightarrow$ (10) Master Promotion & Registry Sync (`INV-2`, `INV-5`).
      - **7-Substep Evaluation**: (1a) Tabular OCR Ingestion $\rightarrow$ (1b) Multi-Unit CTO Normalization $\rightarrow$ (1c) Diophantine Multi-Cluster Partitioning (`INV-42`) $\rightarrow$ (1d) 7-Aspect Physical Math Validation $\rightarrow$ (1e) 5-Level Conflict Graph DAG $\rightarrow$ (1f) 5-Tier Strategy Matrix Ranking $\rightarrow$ (1g) Grounding Badge Inscription & Trace Logging.
    - NotebookLM is leveraged across 4 distinct verification stages: Pre-Flight DNA validation, In-Flight conflict RAG, Post-Flight solution grounding, and Closed-Loop Delta sync.
    - Universal Master Knowledge Registry (`master_knowledge_registry.json`) is maintained for cross-chassis rules while product-specific partitions (`outputs/{Family}/{Gen}/{Model}/`) isolate per-product catalogs with zero cross-chassis contamination (`INV-24`).

37. **Static Circular Dependency DAG & SonarQube Cyclomatic Complexity Guardrail (`INV-46`)**:
    - The repository dependency graph is strictly enforced as a Directed Acyclic Graph (DAG) with **0 circular dependency cycles** across all 350+ JavaScript, JSX, and CJS modules.
    - McCabe Cyclomatic Complexity (CC) is strictly governed across all physical aspect checkers and catalog synthesis engines:
      - High-level domain evaluators (`evalSupportManufacturing`, `evalPcieRiserSlots`, `evalNetworkingOcp`, `evalStorageTriMode`) MUST NOT exceed **CC $\le 20$** (refactored via modular tally and math decomposition).
      - Category & subcategory synthesis engines MUST NOT exceed **CC $\le 15$** (refactored via declarative pattern match tables `SUBCATEGORY_SYNTHESIS_RULES`).
    - Validated continuously via `node --test tests/unit/test_circular_and_complexity.js`, `npm run test:circular` (`scripts/maintenance/analyze_circular_deps.js`), and `npm run test:complexity` (`scripts/maintenance/analyze_complexity.js`).

38. **Isolated Test Matrix, Failure Ledger & Subprocess Telemetry Harness (`INV-47`)**:
    - All test execution (`npm run test:all`) MUST run through the isolated test matrix runner (`scripts/maintenance/run_test_matrix.js`), spawning each test file in its own isolated Node.js process with explicit timeout guards (default 60s).
    - Eliminates monolithic shell chains (`&&`) where a single failure aborts execution and masks subsequent test outcomes.
    - **Automated Failure Isolation**: When any test fails, the runner isolates the failure, logs a rich diagnostic trace (exact assertion mismatches, duration, exit code), and writes the failure atomically to `outputs/history/test_failure_ledger.json`.
    - **Iterative Fast-Path Recovery**: Developers and AI agents MUST re-test only the failed suite using `npm run test:failed` (or `npm run test:isolated -- <file>`) until it passes 100%, avoiding wasteful full-suite reruns and saving massive context tokens.
    - Once the isolated test passes, the runner clears the failure record from `test_failure_ledger.json` and updates `pipeline_telemetry.json`.

39. **Strict Generation & Product Family RAG Firewall (`INV-48`)**:
    - Dual-Brain RAG searches and local catalog lookups (`local_rag_search.js`, `notebook_query_utils.js`) MUST enforce strict Generation and Family Firewalls.
    - When a specific chassis or generation is targeted (e.g. `DL380_Gen12`), search MUST strictly query that generation's catalog (`outputs/ProLiant/Gen12/DL380_Gen12/`) and target cloud notebook.
    - Zero cross-generation bleeding: Gen12 queries must never return Gen11 components or fall back to scanning all catalogs in `outputs/`. Any cross-compatible part suggestion must be explicitly certified by official QuickSpecs / NotebookLM before inclusion.

40. **Autonomous Multi-Solution Cluster Partitioning Protocol (`INV-49`)**:
    - Complex multi-solution customer proposals (combining Compute Servers, External Storage Arrays, Tape Libraries, and Top-of-Rack Networking) MUST be automatically dissected by `boq_preprocessor.js` and `multi_cluster_splitter.js` into isolated Solution Clusters.
    - Each cluster is independently evaluated against its own dedicated product catalog and QuickSpecs RAG source, preventing storage drives or tape cartridges from being erroneously validated against server PCIe or DIMM slots.

41. **Ambiguity Inbox Escalation & Human Sign-off Protocol (`INV-50`)**:
    - When an unknown, legacy, or ambiguous SKU is encountered that cannot be conclusively verified against official QuickSpecs or the live catalog:
    - The engine MUST NOT hallucinate an ungrounded substitution or make blind cross-generation guesses.
    - The item MUST be assigned the `NEEDS_HUMAN_CLARIFICATION` status, rendered with an Amber visual badge in the Topology Mindmap, and surfaced in the Dashboard **Ambiguity Inbox** for human sales engineer review and classification.
    - Human submissions persist as persistent `KnowledgeDelta` records in `master_knowledge_registry.json`.

42. **4-Tier Vendor-Agnostic Taxonomy (`INV-51`)**:
    - Standardizes all catalogs, rule files, and RAG knowledge payloads into a canonical 4-tier directory hierarchy: `{Vendor}/{Family}/{Gen}/{Model}/` (e.g. `outputs/HPE/ProLiant/Gen12/DL380_Gen12/`, `outputs/Dell/PowerEdge/16G/R760/`, `outputs/Cisco/UCS/M7/C240_M7/`).
    - Eliminates cross-vendor and cross-generation data pollution while allowing universal 7-aspect validation across multi-vendor quotes.

43. **Smart Fuzzy Category Alignment & Upward Attribute Matching Protocol (`INV-52`)**:
    - When parsing customer BOQs with part typos, missing option codes, or description-only rows:
      1. **Category/Subcategory Scheme Placement**: The engine identifies the missing or requested component class (Processor, Memory, Storage Cage, RAID Controller, OCP NIC, Power Supply).
      2. **Upward / Closest Attribute Matching (Exact $\ge$ Upward, Never Downward)**:
         - **1st Priority**: Exact SKU / attribute match.
         - **2nd Priority**: Closest upward / equivalent match in the same category (e.g. 48-core $\rightarrow$ 48-core or 52-core, NEVER downgrade to 32-core).
         - **3rd Priority**: Propose 5-tier ranked alternative routes (Rank 1: Intent Preserved buildable, Rank 2: Performance Boost, Rank 3: Balanced, Rank 4: Scalability Expansion, Rank 5: Minimal CapEx).
      3. **100% Buildable Solution Contract**: In all proposed ranked tiers, all mandatory cables, risers, fan kits, and regulatory enablement options are automatically injected to eliminate unbuildable errors.

44. **Autonomous Jules Session Resumption, Auto-Unblocking & Final Authority Quality Review Protocol (`INV-53`)**:
    - **Zero Human Waiting & Auto-Unblock Loop**:
      - Jules sessions pause when plan approval is required (`awaitingPlanApproval`), user feedback is requested (`awaitingUserFeedback`), or interactive input is needed (`paused`).
      - AI agents MUST NOT require human intervention to unblock Jules.
      - Agents MUST execute `node scripts/services/jules_task_manager.js unblock` (or `npm run jules:unblock` / `approveSession`) which autonomously detects paused sessions, approves pending plans via `session.approve()`, and sends the full auto-approval directive via `session.send(...)` to resume execution immediately.
    - **Antigravity Lead Architect & Final Authority Governance**:
      - Antigravity takes 100% full ownership of reviewing, validating, and certifying all code and test suites authored by Jules before merging.
      - Never blind-merge Jules PRs or patches. Always run the complete isolated test matrix (`npm run test:isolated -- <testFile>` or `npm run test:all`), check circular dependencies (`npm run test:circular`), verify complexity bounds (`npm run test:complexity`), and audit portfolio certification (`npm test`).
    - **Jules Task Specialization & Token Optimization**:
      - **Where Jules Excels (Strengths)**: Atomic boundary/unit test authoring (`tests/unit/`, `node:test`), mathematical fuzzing (e.g. `budget_optimizer.js`, `query_sanitizer.js`), algorithm edge-case discovery, and component-level regression suites.
      - **Where Jules is Weak (Avoid Delegating)**: Large cross-directory architectural refactorings, multi-process orchestration, live browser scraping requiring authenticated CDP sessions, and domain ground-truth rule synthesis.
      - **Atomic Prompt Contract**: Keep Jules tasks single-responsibility (1 module + 1 test file), specify the exact file paths, mandate pure cross-platform JavaScript (no shell commands), provide the exact verification CLI command (`npm run test:isolated -- <testFile>`), and explicitly prohibit pausing for human confirmation.

45. **DL380a Gen12 GPU Accelerator & DL145 Gen11 AMD EPYC Domain Isolation Protocol (`INV-54`)**:
    - **DL380a Gen12 (`P76706-B21`)**: 8DW/16SW GPU Accelerator server with captive risers. Mandatory rules:
      - Double-wide GPUs require dedicated GPU auxiliary power kits (`P76450-B21`) and captive risers.
      - Rule 81017083: Minimum 5x 2400W Titanium PSUs (`P75008-B21` / `P75002-B21`) required when double-wide GPUs are present.
      - Rule 81016788: Drive cage mutual exclusivity — 4SFF (`P74710-B21`) and 4EDSFF (`P74712-B21`) cages cannot be mixed.
      - MR216i-o controller without cache carries RAID 5/6 risk warning.
    - **DL145 Gen11 (`P71964-B21`)**: 1U short-depth edge server powered by single-socket AMD EPYC 8004 series processors.
      - 4EDSFF default storage cage; maximum 1000W edge PSU profile (1600W+ enterprise PSUs physically incompatible).
      - Extended thermal operational envelope (-5°C to 55°C).
    - **Chassis Map Isolation**: In `chassis_map.json`, each is segregated into its own dedicated family entry (`ProLiant_DL380a_Gen12` and `ProLiant_DL145_Gen11`), ensuring zero SKU overlap or cross-pollution with DL380 Gen11 (`P5253...`) or DL380 Gen12 (`P7328...`) part numbering.

46. **Safe Knowledge Query String Normalization & Regex Escaping Protocol (`INV-55`)**:
    - `local_rag_search.js` and `notebook_query_utils.js` must safely normalize input query parameters to strings before invoking `.toLowerCase()`. Object query payloads (e.g. `{ query: "...", chassis: "..." }`) must be cleanly parsed (`query?.query || query?.text || JSON.stringify(query)`) to prevent `TypeError: (query || "").toLowerCase is not a function`.
    - In `local_rag_search.js`, all keyword term matching via `RegExp` must escape markdown asterisks `**` and special regex characters (`term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`) to prevent `SyntaxError: Invalid regular expression: /\b**\b/i: Nothing to repeat`.

47. **Universal Zero-Hardcoding Generic Domain Template Rules & Capability Protocol (`INV-56`)**:
    - **Zero Hardcoded SKUs**: Architectural physical rules and capability dependencies MUST NOT be hardcoded to fixed SKU strings. Instead, knowledge is represented generically across three domains: `SERVER`, `STORAGE`, and `NETWORKING` via `scripts/config/generic_domain_rules_matrix.json` and `scripts/lib/catalog/generic_domain_templates.js`.
    - **Capability & Attribute-Driven Evaluation**: Rules evaluate component roles, attributes (TDP, wattages, core counts, direct drive counts, slot counts), and capability flags (`HIGH_PERFORMANCE_COOLING`, `STORAGE_EXPANDER_OR_SWITCH`, `GPU_AUXILIARY_POWER_AND_TITANIUM_PSU`, `STORAGE_DRIVE_BLANKS`, `MATCHED_FABRIC_TRANSCEIVERS_OR_DACS`, etc.).
    - **Dynamic Native SKU Resolution**: The engine resolves abstract capabilities to concrete vendor/model SKUs dynamically by searching the active product catalog (`resolveCapabilityToSku(capability, catalog)`), allowing any product generation or vendor (HPE, Dell, Cisco, Lenovo) to automatically benefit from the unified knowledge brain without code modifications.

48. **Tiered Test Matrix Architecture & Deterministic Domain Isolation Protocol (`INV-57`)**:
    - **Tiered Test Organization**: The repository's 130+ test suites are strictly partitioned into 4 deterministic tiers:
      1. `📦 Unit Tests` (`tests/unit`, 69 suites): Aspect math, memory/power calculations, schemas, parsers, and preprocessors. Fast, deterministic, zero-network.
      2. `⚡ Chaos & Fault Injection` (`tests/chaos`, 38 suites): Adversarial fuzzing, race conditions, memory stress, mutex locks, and crash recovery.
      3. `🔗 Integration & Portfolio Certification` (`tests/integration`, 23 suites): Full BOM verifications, conflict graphs, cross-gen diffs, Excel tallies, and portfolio audits.
      4. `🌐 End-to-End & Browser Workflows` (`tests/e2e`, 3 suites): Headless browser UI workflows, download validations, and live CLIC pipelines.
    - **Tiered CLI Flags & Fast Default**: `scripts/maintenance/run_test_matrix.js` accepts `--tier` (`unit`, `chaos`, `integration`, `e2e`, `fast`). Standard `npm test` defaults to `--tier fast` (130 suites covering unit + chaos + integration), allowing instant iteration without blocking on multi-minute headless browser automation.
    - **Visual Tier Banners & Structured Telemetry**: The test runner prints visual tier transition banners and emits a structured per-tier breakdown table (suites, passed, failed, and duration per tier) with failure ledger tracking.

49. **Monolithic CLI Pipeline Decomposition & RAG Hotspot Modularization Protocol (`INV-58`)**:
    - **Single-Responsibility CLI Orchestration**: High-level CLI entry points and orchestration tools (`build_catalog.js`, `eval_boq.js`) MUST NOT interleave argument parsing, normalization, diff analysis, and export in monolithic `main()` functions. They must maintain a strict upper bound of $CC \le 10$ for entry `main()` functions by decomposing execution into discrete, independently testable lifecycle functions.
    - **Stage Separation in Catalog Ingestion (`build_catalog.js`)**: Ingestion, section expansion, subcategory matching, taxonomy resolution, history price reconciliation, chassis variant injection, and export MUST be partitioned into dedicated stage modules (`initCatalogBuild`, `extractSubcategoriesAndParents`, `expandTableSections`, `parseSingleTableRow`, `matchSubcategoryForTable`, `resolveTableTaxonomyAndRole`, `synthesizeCatalogEntries`, `injectChassisVariantsFromHistory`, `buildCatalogObject`, `reconcilePriceAndLifecycleHistory`, `buildChassisVariantMatrix`, `exportCatalogArtifacts`).
    - **Stage Separation in BOQ Evaluation (`eval_boq.js`)**: Argument normalization, BOQ ingestion, aspect pre-checks, RAG validation, markdown report synthesis, and structured `__EVAL_RESULT_JSON__` serialization MUST be cleanly isolated.
    - **Local Catalog RAG Modularization (`local_rag_search.js`)**: Multi-purpose search routines MUST separate processor searches (`searchProcessorSkusInEntry`), category matching (`searchCategorySkusInEntry`), and chassis base variant matching (`searchChassisBaseVariants`), ensuring orchestrator complexity stays below $CC \le 15$.
    - **Declarative SKU Encapsulation**: Domain aspect checkers MUST encapsulate vendor SKU strings into declarative lookup sets at the file header rather than scattering bare literals across nested conditionals.

50. **Memoized O(1) Catalog SKU Index Contract (`INV-59`)**:
    - Aspect checkers (`compute_thermal.js`, `memory_channel.js`, `networking_ocp.js`, `pcie_riser.js`, `power_environment.js`, `storage_tri_mode.js`, `support_manufacturing.js`, `support_services.js`) and conflict resolution engines (`resolution_matrix.js`) MUST NEVER perform unindexed $O(N \times M \times K)$ nested loops over `catalogData.entries` and each entry's `skus` array (`.find(...)`).
    - All SKU lookups MUST leverage `buildCatalogSkuIndex(catalogData)` in `scripts/lib/catalog/sku.js`, which constructs and memoizes an amortized $O(1)$ lookup Map directly on `catalogData._skuIndex`.

51. **Customer Tender Base SKU Quantity Accumulation Protocol (`INV-60`)**:
    - Customer BOQ workbooks frequently contain repeated occurrences of identical base hardware part numbers (e.g. `P64707-B21` memory or drive cages) distributed across multiple lines, chassis nodes, or tender sections.
    - In `conflict_graph.js` and all BOQ preprocessors, building the unified BOM map MUST accumulate quantities (`fullBomMap.get(sku).quantity += item.quantity`) rather than overwriting entries (`fullBomMap.set(sku, item)`), preventing silent hardware quantity loss and under-allocation.

52. **Dynamic Generation-Aware Hardware Mandatory SKUs & SSOT Contract (`INV-61`)**:
    - Mandatory hardware component definitions MUST maintain a Single Source of Truth (SSOT) centered in `scripts/lib/catalog/catalog_rules.js`. `boq_evaluator.js` MUST import and re-export `DEFAULT_MANDATORY_SKUS` from `catalog_rules.js` rather than maintaining duplicate divergent dictionaries.
    - Riser enablement cable kits and high-performance heatsinks differ across server generations (Gen12: heatsink `P48818-B21`, cable kit `P76453-B21`; Gen11: heatsink `P74792-B21`, cable kits `P56073-B21` / `P56074-B21`). The engine MUST resolve these dynamically via `resolveMandatoryHeatsinkSku(gen)` and `resolveMandatoryCableKit(gen, riser)` to prevent cross-generation component pollution.

53. **Strict Delimited Lifecycle & 90-Day Warning Token Parsing Protocol (`INV-62`)**:
    - In `support_services.js` and `resolution_matrix.js`, lifecycle status checks for 90-Day Warning and EOL items must require explicit token boundaries: `/^(?:90|EOL)\s+/i`, `[90]`, `(90)`, or `90-DAY`.
    - The engine MUST NEVER use loose prefix checks like `.startsWith('90')` on raw SKU strings, which cause false-positive EOL flags on standard production hardware SKUs that begin with the digits "90".

54. **Enterprise Tender Multi-Cluster Sheet Preprocessing & Documentation Filtering Protocol (`INV-63`)**:
    - Enterprise tender workbooks frequently lead with non-BOM documentation sheets preceding the actual hardware list (e.g. "Cover Page", "Terms & Conditions", "Audit Summary", "Compliance Matrix", "Instructions", "Readme").
    - `multi_cluster_splitter.js` MUST NOT blindly parse `wb.SheetNames[0]`. It MUST filter candidate sheets using non-BOM keywords (`audit`, `architecture`, `terms`, `notes`, `readme`, `compliance`, `matrix`, `instructions`, `cover`) to locate the primary BOM data sheet dynamically.

55. **Frontend Canonical Product Taxonomy & Invariant INV-36 Adherence (`INV-64`)**:
    - All frontend hooks, selector components, and API routes (`useCatalogs.js`, `ChassisSelector.jsx`, `App.jsx`, `dashboard/routes/evaluation.cjs`) MUST standardize on canonical generation model directories (e.g. `'DL380_Gen12'`) per Invariant INV-36.
    - `useCatalogs.js` MUST implement dynamic auto-fallback: if the requested chassis ID is not present in the active catalog pool, it automatically falls back to the first available valid catalog, ensuring the dashboard never crashes or loads blank catalog states.

56. **Modern CDP Download Behavioral Protocol & Filename Preservation (`INV-65`)**:
    - Use `Browser.setDownloadBehavior` with `behavior: 'allow'`, a dynamically resolved download directory, and download events. `allowAndName` is forbidden for filename preservation because Chromium explicitly names those files by download GUID. Use the deprecated Page method only as a compatibility fallback.

57. **Browser Security Preservation Protocol (`INV-66`)**:
    - Automation MUST NOT disable Safe Browsing, Enhanced Protection, or other user security controls. Download permission is applied through the scoped CDP session and every completed file is validated before ingestion.

58. **Zero-Human-in-the-Loop Google Sheets & Docs Workspace Automation Protocol (`INV-67`)**:
    - Personal `@gmail.com` accounts are protected by Google's OAuth security policy, which strictly blocks the default generic `gcloud` developer client ID (`32555940559...`) from requesting sensitive Workspace scopes (`https://www.googleapis.com/auth/spreadsheets`, `https://www.googleapis.com/auth/documents`, `https://www.googleapis.com/auth/drive`) with the error: *"This app is blocked. This app tried to access sensitive info in your Google Account."*
    - AI agents MUST NOT instruct users to run bare `gcloud auth application-default login --scopes=...` without a project-owned client ID.
    - Programmatic, zero-human-in-the-loop Google Sheets and Google Docs creation MUST use either:
      1. **Project Desktop App OAuth Client ID**: An operator-owned Desktop App client stored outside the repository and authenticated through Application Default Credentials; OR
      2. **Dedicated GCP Service Account + Shared Drive Folder**: A service account key stored outside the repository with access limited to a designated folder (`GOOGLE_DRIVE_FOLDER_ID`).
    - OAuth credentials can expire or be revoked; failures must preserve local artifacts and remain retryable.

59. **Evidence-Gated Shared Accessory Compatibility Protocol (`INV-68`)**:
    - Product isolation filters MUST reject foreign chassis/base rows without discarding ordinary accessory rows merely because the prior snapshot also contained another chassis.
    - Rails, cable-management arms, storage enablement kits, cables, power cords, and transceivers may be reused across products or generations only through an exact-product, evidence-backed `KnowledgeDelta`; shared presence elsewhere is not proof of compatibility.
    - A reusable record MUST use `CHASSIS_SPECIFIC` scope and include `sharedAccessoryVerified: true`, an approved `accessoryClass`, exact `compatibleProductIds`, `verificationStatus: VERIFIED`, trusted `compatibilityEvidenceType`, and non-empty `verificationSourceIds`.
    - Local registry projection and NotebookLM payload isolation MUST apply the same gate. If an accessory disappears from a target product's fresh OCA scrape, preserve its discontinued and price history; never reactivate it from another product's catalog.

60. **Delta-Only SKU Lifecycle & Business Retention Protocol (`INV-69`)**:
    - Catalog diffs MUST capture SKU addition/removal/reinstatement, price changes, lifecycle badge/status transitions, start dates, and vendor discontinuation dates. Stable scrapes MUST NOT append redundant `UNCHANGED` price-history events.
    - A SKU removed from the active OCA catalog receives exactly one `REMOVED` event and a compact tombstone marked `trackingState: STOPPED_AFTER_REMOVAL`; subsequent snapshots MUST NOT move its original discontinuation date or repeatedly remove it.
    - Compact lifecycle evidence remains available for historical deal validation, obsolete-part rejection, replacement reasoning, and reinstatement detection. Extended retention may be marked `BUSINESS_RELEVANT` when deal or verified-rule references exist.
    - Excel, Google Sheet, local audit, and NotebookLM representations MUST expose consistent lifecycle and retention state. Reappearance in the exact target-product catalog changes the state to `REINSTATED` and resumes tracking.

61. **Evidence-Gated Human Resolution & Anti-Hallucination Protocol (`INV-70`)**:
    - Portal messages, NotebookLM answers, generic feedback, and any record merely labeled `HUMAN_HITL` are observations, not active rules. They MUST default to product-scoped quarantine and MUST NOT update catalog rules, the master registry, confidence, or NotebookLM sources.
    - Promotion requires an exact product-generation target, valid SKU syntax, explicit scope, a named reviewer, independent reasoning, an affirmative verification decision, and at least one traceable trusted evidence record. Contradictions additionally require the reviewer to identify the superseded rule IDs.
    - Knowledge records use a stable semantic SHA-256 fingerprint. Repeated observations increment occurrence metadata and merge reasons instead of creating stale duplicates. Promotion and rejection write immutable decision-ledger entries; corrupt governance files fail closed.
    - Confidence may increase only after successful evidence-backed validation. The ledger MUST preserve pre/post confidence, reviewer reasoning, and evidence IDs. Local or unavailable NotebookLM responses are advisory and never learning-eligible.

62. **Requirement-Led Part Resolution & PCIe Topology Evidence Protocol (`INV-71`)**:
    - A malformed, unknown, or description-mismatched part number MUST be resolved from the complete requirement context and the missing component role. SKU edit distance is a tie-breaker only after the candidate matches the inferred category; a close SKU from another category is forbidden.
    - Automatic replacement requires an exact confirmed product generation, catalog membership, category certainty, score `>= 0.90`, and a top-candidate margin `>= 0.08`. Otherwise the original item remains unchanged and the Ambiguity Inbox records `NEEDS_HUMAN_CLARIFICATION`; unconfirmed decisions are not learning-eligible.
    - Attribute-only solution construction requires an explicit base product during the current maturity phase. The engine emits ranked same-category catalog options and budget/attribute intent, but ambiguous options require human selection and whole-solution revalidation.
    - PCIe capacity results MUST expose per-node and cluster demand/capacity, mechanical versus electrically active slots, x16 capacity, riser position, parsed catalog lane evidence, confidence, and whether exact-product NotebookLM verification is required. Family/generation-only routing cannot silently choose a product catalog or notebook.

63. **Customer Input Workflow Discipline & Scoped Learning Protocol (`INV-72`)**:
    - Whenever a customer BOQ spreadsheet, quote, tender excerpt, or configuration query is submitted to an AI agent, the agent **MUST ALWAYS route the request through the canonical evaluation pipeline** (`scripts/evaluators/eval_boq.js`, `scripts/lib/boq/boq_evaluator.js`, `scripts/lib/boq/multi_cluster_splitter.js`). Writing ad-hoc classes, scratch parsers, or temporary bypass scripts is STRICTLY PROHIBITED.
    - All evaluations must execute the 7 physical aspect checkers, cross-reference mapped NotebookLM instances (`scripts/config/notebooks.json`), validate 100% buildability against CLIC/OCA constraints, and synthesize 5-tier ranked solutions (Rank 1A, 1B, 1C + Ranks 2-5). Unbuildable solutions receive 0 rank.
    - Closed-loop feedback must be strictly scoped: universal/family rules are saved to `outputs/history/master_knowledge_registry.json`, while chassis-specific rules are saved to `outputs/{Family}/{Gen}/{Model}/catalog_deltas.json` and synchronized only to that product's target Notebook ID.
    - If an ambiguous requirement, missing chassis mapping, or unresolvable conflict arises, the agent **MUST actively ask the user for clarification** rather than making unverified assumptions. All outputs must display complete SKUs, unit prices, extended prices, total rank budgets, and Dual-Brain verification badges.

64. **Zero-Repetition Autonomous Customer BOQ Execution & Up-Front Clarification Protocol (`INV-73`)**:
    - Users submit customer BOQs with high-level directives such as "provide solution for config #X in sheet Y", "evaluate all configs in sheet Y", or "evaluate all configs across all sheets".
    - AI agents **MUST NOT require the user to repeat instructions, remind them of schemas, or prompt for missing badges/budgets**. The agent automatically recognizes the full lifecycle goals and delivers the complete, certified solution end-to-end.
    - **Up-Front Ambiguity Triage (Zero-Hallucination Gate)**: Before launching deep execution, the agent validates input sanity (target sheets, cluster isolation, product generation, hardware contradictions). If any critical ambiguity exists, the agent **MUST actively clarify immediately in the initial turn** rather than guessing, hallucinating, or making ungrounded assumptions, ensuring a high confidence score ($\ge 0.95$).
    - **Autonomous End-to-End Delivery**: Once unambiguous, the agent executes the complete pipeline: cluster partitioning (`multi_cluster_splitter.js`) $\rightarrow$ 7 physical aspects $\rightarrow$ deep NotebookLM RAG $\rightarrow$ 100% buildable 5-tier strategy matrix (Rank 1A/1B/1C through Rank 5; unbuildable = 0 rank) $\rightarrow$ line-by-line financial breakdown (Part Number, Description, Qty, Unit Price, Extended Price, Total Budget) $\rightarrow$ Dual-Brain verification badges $\rightarrow$ scoped knowledge delta sync without user prompting.

65. **Least-Delta Combinator & Troublesome SKU Pruning Protocol (`INV-74`)**:
    - When a user SKU causes a massive cascading chain of complex enablement dependencies (e.g. storage controllers requiring multiple cages/cables/risers, discordant GPUs, out-of-family components) or is architecturally discordant, the engine MUST NOT only offer heavy buildouts.
    - The combinator synthesizes a least-delta ranked variant (Rank 1L / Rank 1M) that evaluates pruning or replacing the troublesome SKU with a valid catalog alternative (`findBestAlternativeInCatalog` using `buildCatalogSkuIndex`), minimizing net BOM mutation while guaranteeing 100% physical buildability.

66. **Auditable Decision Trace Ledger Protocol (`INV-75`)**:
    - Every configuration modification, addition, replacement, or pruning performed by the engine across all rank tiers MUST record a structured, timestamped decision trace entry.
    - Each trace record contains the rule ID, affected SKU, component role, trigger reason, source brain (`DETERMINISTIC_PHYSICAL_MATH`, `RAG_AGENTIC_GUARDRAIL`, `VALUE_ENGINEERING`, `HITL_FEEDBACK`), and full human-readable justification.
    - Traces are persisted to `outputs/history/decision_traces.json` and queryable via `GET /api/decision-traces` for transparent governance.

67. **Value Engineering & Deal Optimizer Protocol (`INV-76`)**:
    - After certifying 100% physical buildability, the engine executes advisory deal optimization rules (CPU tier right-sizing, NIC bandwidth alignment, PSU efficiency tuning, and warranty duration alignment) to calculate potential CapEx/OpEx savings without degrading workload SLAs or violating customer constraints.
    - Value Engineering recommendations are surfaced in the UI matrix, CLI evaluation markdown reports (Section 3.5), and telemetry ledgers (`valueEngineeringSavingsUsd`).

68. **QuickSpecs vs Live OCA Reconciliation & Expansion Guidance Protocol (`INV-77`)**:
    - Scraped live OCA catalogs are periodically reconciled against vendor QuickSpecs PDFs/text payloads to detect DOM expansion gaps or pricing discrepancies.
    - Any QuickSpecs options missing from OCA catalogs automatically emit structured guidance (`expansion_guidance.json`) in `outputs/{Family}/{Gen}/{Model}/history/` to instruct the CDP scraper to trigger dynamic sub-choice expansion (`INV-20`). Exposed via `POST /api/reconcile-quickspecs`.

69. **Unified Presales Intent Query Routing & Single-User Protocol (`INV-78`)**:
    - Inbound customer queries, sizing requirements, tender RFPs, BOQ spreadsheets, and catalog questions MUST route through the deterministic query router (`route_query.js`).
    - The engine classifies input into 5 canonical tracks: `FREEFORM_QA`, `RFP_SIZING_TO_BOM`, `BOQ_EVALUATION`, `BOM_RECONCILIATION`, and `CATALOG_INTELLIGENCE`.
    - In single-user environments, all administrative/reviewer roles are unified, eliminating multi-party approval bottlenecks while preserving rigorous automated governance.

70. **DL380a Gen12 GPU Accelerator Domain Isolation & Riser Architecture (`INV-79`)**:
    - DL380a Gen12 utilizes a front-bay accelerator topology powered by dual switchboards (`P74714-B21`) and dedicated 16-pin cable kits (`P74700-B21`) rather than conventional rear PCIe risers.
    - Rear PCIe slot allocation is dynamically decoupled from front accelerator bays; 10DW mode reduces available rear slots from 5 to 3 (Slots 1, 3, 6) because Slots 2 and 4 are occupied by the captive riser pass-through feeds.

71. **Minimal Supported Memory Population Hierarchy vs Channel Interleaving (`INV-80`)**:
    - Dual-socket enterprise platforms require 16 DIMMs for theoretical 1DPC 16-channel interleaving saturation, but physically support a hierarchical population: `[1, 2, 4, 6, 8, 12, 16]` DIMMs per CPU.
    - Sizing engines MUST recognize minimal entry configurations (e.g. 4x 32GB DDR5 on dual-socket systems) as 100% buildable, passing with an informative interleaving advisory rather than a fatal validation error.

72. **Diskless Compute Nodes & No Local Drive FIO Enablement Kit (`873763-B21`) (`INV-81`)**:
    - When a server is provisioned for diskless SAN-boot, PXE clustering, or stateless AI compute, omitting local drives triggers factory configuration rules (HPE CLIC Rule 81392308).
    - Sizing and evaluation engines MUST inject `873763-B21` (HPE No Drive Configuration FIO Kit) to officially designate the server as diskless, clearing controller and drive cage requirements.

73. **Dynamic WebLogic AJAX Panels, Missing SKU Discovery & Scraper Resilience (`INV-82`)**:
    - WebLogic OCA configuration options (accelerators, captive risers, switchboards, auxiliary power cables) are frequently hidden inside deferred AJAX subchoice panels that do not render until parent choice triggers fire.
    - Missing SKUs discovered through customer RFPs or QuickSpecs reconciliation MUST be dynamically backfilled into master 22-sheet workbooks and TSVs, and `cdp.js` MUST dispatch jQuery change events to expand all dependent subchoice containers during live scrapes.

74. **Google Sheets & NotebookLM Synchronization Strategy: Full Replace vs Delta Append (`INV-83`)**:
    - Master catalog grounding sheets (`All SKUs`) must use Full Replace In Place to prevent polluting semantic vector embeddings with duplicate, obsolete, or outdated price entries.
    - Telemetry change logs (`Price Trails`, `Knowledge Deltas`) must use Delta Append to preserve immutable chronological audit trails.

75. **Parallel Sub-Path Architectural Branching & Multi-Mode Sizing Protocol (`INV-84`)**:
    - When physical platform capabilities support multiple valid topologies (e.g. 8DW Interconnect-Optimized vs 10DW Density-Optimized for accelerators), the engine MUST NOT prematurely converge on a single configuration.
    - The engine MUST synthesize parallel buildable sub-paths (**Rank 1A** and **Rank 1B**) and present a side-by-side trade-off matrix (Interconnect vs Density, Power headroom, Rear I/O expansion, and List Price).

76. **Universal Multi-Domain Presales Process Architecture & Zero-Hardcoded Multi-Mode Discovery Protocol (`INV-85`)**:
    - **Universal Applicability Across Compute, Storage, and Networking**: The dynamic capability space discovery, architectural branching (Rank 1A vs Rank 1B), peripheral envelope probing, and proactive presales qualifying protocol are domain-agnostic and generation-agnostic. They apply universally across all server families (ProLiant, Synergy, Cray, Superdome), storage architectures (Alletra, MSA, StoreEver), and networking fabrics (Aruba CX, Virtual Connect, Mellanox/Broadcom).
    - **Zero-Hardcoded Process Architecture**: The engine MUST NOT rely on hardcoded chassis strings or part numbers to discover options. All capability limits, operating modes, form factor trade-offs, and accessory dependencies are discovered dynamically via catalog metadata, data dictionary schemas (`.agents/DATA_DICTIONARY.md`), and `scripts/config/generic_domain_rules_matrix.json`.
    - **Mandatory 4-Dimension Presales Qualifying Engine**: For any customer inquiry or sizing request, the engine autonomously formulates the 4 proactive presales qualifying dimensions (Workload DNA, Facility & Electrical Envelope, Fabric & Interconnect Topology, Data Tiering & Lifecycle) on the first turn without requiring human nudges.

77. **Hierarchical Container Trees & Spatial Presales Reasoning Protocol (`INV-86`)**:
    - **4-Tier Physical Containment Tree**: Infrastructure configurations are structured as strict 4-tier containment trees: Level 0 Parent Frame/Enclosure $\rightarrow$ Level 1 Sub-Product Modules (Compute/Storage/Fabric nodes) $\rightarrow$ Level 2 Subcomponents & Enablement Architecture (Risers, cages, switchboards, cable assemblies) $\rightarrow$ Level 3 Leaf SKUs & Options (CPUs, DIMMs, Drives, PSUs, FIO tags).
    - **Bi-Directional Constraint Propagation**: Sizing and evaluation engines MUST propagate physical constraints both top-down (Frame limits on child module counts, riser impacts on rear slot availability) and bottom-up (Leaf SKU TDP/wattage aggregating to frame power supply and high-line electrical circuits).
    - **Spatial Placement Verification**: Sizing and BOM reconciliation MUST verify that every component is physically placed in the correct container tier (e.g. FIO `#0D1` / `-F21` internal options nested inside the CTO compute blade container per `INV-25`; external fabric switches or transceivers placed in their respective frame bays or top-of-rack groupings).
78. **Internal Storage Controller Backplane Cabling & Thermal Escalation Protocol (`INV-87`)**:
    - **Physical Backplane & Enclosure Dependency**: In HPE OCA / CLIC, an internal storage controller (`MR416i-p`, `MR416i-o`, `MR408i-o`, `SR932i-p`, etc.) CANNOT physically exist in a factory CTO container without a physical drive backplane/cage to connect into.
    - **No Drive Kit Invalidation**: Configuring an internal storage controller into a chassis that previously had `873763-B21` (No Drive Configuration FIO Kit) is an unbuildable conflict. The engine MUST:
      1. Prune `873763-B21` (No Drive FIO kit).
      2. Inject the primary 8SFF Tri-Mode Drive Cage Kit (`P75741-B21` for Gen12 / `P48813-B21` for Gen11) into Box 2.
      3. Inject the dedicated Controller Cable Kit (`P76456-B21` for Gen12 Box 2 / `P48918-B21` controller enablement).
      4. Escalate cooling to the High-Performance Fan Kit (`P48820-B21`) because U.3 Tri-Mode drive backplanes alter airflow impedance, mandating 6x high-performance cooling fans.
      5. Inject the Flash-Backed Write Cache Battery (`P01366-B21`) and Enablement Cable (`P48918-B21`) for controllers with cache.
    - **Rear Boot Isolation**: Dedicated OS boot devices (`NS204i-u v2` `P78279-B21`) install in the dedicated rear mount (`P74755-B21` for Gen12 / `P54442-B21` for Gen11) above the power supplies. They do not satisfy the front drive cage cabling requirement of internal storage controllers, and MUST be paired with their respective rear mount enablement kits.

79. **Holistic Solution Coexistence & Dual-Brain Dynamic Grounding Protocol (INV-88)**:
    - **Holistic Re-Synthesis on Solution Mutations**: Whenever an existing solution is expanded, modified, or customized (e.g. adding controllers, accelerators, or boot devices to a stateless base), AI agents and evaluation engines MUST NOT evaluate the added component in isolation. The engine MUST execute a holistic re-synthesis of the entire coexisting bill of materials across all 7 physical aspects simultaneously to ensure zero unbuildable contradictions or hidden dependencies.
    - **Dual-Brain Architecture (Static Pre-Processing + Dynamic RAG Grounding)**:
      1. *Static Fast-Path Pre-Processing*: High-speed deterministic rules catch baseline slot, cage, and thermal boundaries instantly, eliminating obvious invalid builds in milliseconds.
      2. *Dynamic NotebookLM Grounding & Reasoning*: The engine queries the cloud NotebookLM RAG brain with the complete coexisting BOM context. It waits for the authoritative QuickSpecs/OCA answer, extracts vendor reasoning, and verifies that no hidden factory integration rule is violated.
    - **Closed-Loop Knowledge Delta Sync**: Any newly surfaced physical rules or factory prerequisites are automatically extracted via `knowledge_extractor.js`, persisted in `master_knowledge_registry.json` and `catalog_deltas.json`, and synced across notebooks so the engine continuously improves.

80. **Zero-Touch Browser Auto-Launch, Saved-Credential SSO & Stale-Session Tab 1 Self-Healing Recovery Protocol (`INV-89`)**:
    - **100% Hands-Free Port 9222 Automation**: AI agents and scraper pipelines MUST NOT prompt the human user to manually launch Chrome or log into HPE Partner Portal. `browser_launcher.js` automatically checks port 9222 and launches Google Chrome with `--remote-debugging-port=9222 --user-data-dir=.chrome_sso_profile https://partner.hpe.com/web/prp`.
    - **Automated Saved-Credential SSO**: `navigate_oca.js` clicks `#oktaSignInBtn` and dispatches clicks to `#onepass-submit-btn` in the pre-filled credential modal, waiting patiently for redirect to settle on `https://partner.hpe.com/group/prp` ("Home - HPE Partner Portal").
    - **Fatal In-Place OCA Reload Avoidance**: WebLogic OCA session state is held in server memory tied to temporary SAML assertions. In-place browser reloads (`location.reload()`) in an active OCA tab break session continuity, producing unrecoverable 403 Forbidden errors, blank white pages, or broken login loops.
    - **Tab 1 Stale-Session Self-Healing Recovery Loop**: When an OCA session times out, freezes silently (infinite loading spinners without explicit timeout dialogs), encounters DOM detachments, or throws unhandled WebLogic exceptions:
      1. Close/abandon the stale OCA tab via CDP (`/json/close/{targetId}`).
      2. Switch CDP focus back to Tab 1 (`https://partner.hpe.com/group/prp`).
      3. If the portal session expired, execute `performAutomatedSignIn()`.
      4. Reload Tab 1 via CDP (`Page.reload`) to regenerate fresh SAML session tokens and re-bind Quick Links.
      5. Click "One Config Advanced" in Quick links (`#quick-links-807 a` / `eServiceId=187402`) to spawn a pristine OCA tab.
      6. Detect the new tab, navigate to the target chassis Menu tab via `searchAndConfigureChassis()`, and resume operations seamlessly without human intervention.

81. **Autonomous Zero-Touch Google Drive ADC Token Health & Weekly Self-Healing Gate (`INV-90`)**:
    - **Mandatory Pre-Upload Verification**: Prior to uploading any solution deliverable, synchronizing Google Drive spreadsheets, or executing NotebookLM cloud sync, the engine and AI agents MUST execute `ensureGoogleAuthValid({ autoHeal: true })` (or `npm run auth:check`).
    - **Proactive 7-Day Refresh Cliff Monitoring**: The health audit tracks `tokenValid`, granted scopes (`spreadsheets`, `drive`, `documents`), token age, and remaining days until the 7-day weekly refresh cliff (`daysRemaining`).
    - **Autonomous Zero-Human-in-the-Loop Re-Login**:
      - The human developer has granted **100% UNCONDITIONAL PRE-AUTHORIZATION** for AI agents to re-authenticate and refresh credentials without prompting or waiting for human approval.
      - If a token is expired (`invalid_grant`), missing scopes, or expiring within 48h (`isExpiringSoon`), the engine automatically executes `npm run auth:heal` (`scripts/services/autonomous_oauth_flow.js`), handles the local loopback callback, updates ADC atomically, and verifies health.
    - **"App Blocked" Prevention via Dedicated Client ID**: The authentication flow strictly provides `--client-id-file="~/.config/gcloud/client_secret.json"` to prevent Google from blocking restricted `drive` scopes on personal accounts.
    - **Cross-Laptop Portability Guarantee**: All credential paths derive dynamically from `os.homedir()` (`~/.config/gcloud/client_secret.json` and `~/.config/gcloud/application_default_credentials.json`). Moving between laptops requires zero code changes; running `npm run auth:drive` once or permitting autonomous agent self-healing restores full hands-free cloud operations immediately.

82. **Intra-Category & Presales Mutual Exclusion Protocol (`INV-91`)**:
    - **Up-Front Category-Level Gate**: Before whole-solution synthesis, the conflict engine evaluates intra-category and subcategory mutual exclusion to eliminate contradictory selections at their source:
      1. *Power Supply Input Architecture & Redundancy Homogeneity*: AC and -48VDC power supplies cannot share the same backplane. Redundant PSUs forbid mixing Platinum (94%) and Titanium (96%) efficiencies or mixing disparate wattages within a single server node.
      2. *Installation Support Services*: Onsite Installation/Startup Service (`HA114A1`, `HA124A1`, `H7J38A1`) and Remote Deployment Service (`HA454A1`, `H7J32A`) are mutually exclusive within the same solution.
      3. *Memory Generation & Type*: DDR4 and DDR5 memory modules are physically incompatible. RDIMM, LRDIMM, and MRDIMM modules cannot be mixed across channels or sockets.
      4. *Processor Model Uniformity*: Multi-socket nodes require identical processor SKUs (matching stepping, core count, frequency, and cache).

83. **SaaS Cloud Subscription vs. Physical Hardware Break-Fix Support Delineation Protocol (`INV-92`)**:
    - **Fundamental Contractual Distinction**: SaaS cloud management subscriptions (e.g. GreenLake Compute Ops Management `R7A11AAE`, `S1A05A`, E-LTU) and physical hardware break-fix support (Pointnext Tech Care `HU4B2A3`, Foundation Care) represent distinct operational contracts and MUST NOT be conflated, substituted, or treated as interchangeable.
    - **Deficit Advisory Warning**: Any solution bill of materials containing SaaS management software without physical hardware warranty/support coverage MUST emit an explicit advisory notice: `SaaS software subscriptions (Compute Ops Management) and physical hardware support (Tech Care) are distinct operational layers. SaaS cannot substitute for physical server break-fix maintenance coverage.`
    - **Zero Hallucination / Blind Assumption**: AI agents must never assume that a software subscription covers physical chassis components without verifying against NotebookLM and QuickSpecs specifications.

84. **Tiered Multi-Brain Verification & CLIC Advice Divergent Multi-Path Resolution Protocol (`INV-93`)**:
    - **Multi-Brain Collaboration Hierarchy**:
      1. *Lead Architect & Pair Programmer*: Antigravity / Gemini 3.6 Flash drives execution, deterministic 7-aspect physical math, atomic file updates, cyclomatic complexity gates ($CC \le 135$), zero-warning linter compliance, and test matrix certification.
      2. *Ground-Truth Verification Brain*: Gemini NotebookLM RAG (QuickSpecs PDFs + live OCA scraped 22-sheet catalogs + deduplicated knowledge deltas). Whenever in doubt, query NotebookLM; if confidence $< 0.95$, escalate to human.
      3. *Secondary Verification & Audit Safety Layer*: OpenAI Codex (GPT-6 Astra Light / Plus subscription) is utilized judiciously as a secondary verification and peer review layer for critical architectural questions, diff reviews, and sanity checks on generated walkthroughs and analysis outputs. The pipeline is non-blocking fail-open (if tokens or quota are unavailable, the autonomous pipeline never halts).
      4. *Future Synthesis*: Gemini Studio for multi-turn conversational reasoning and visual pipeline steering.
    - **CLIC Advice Ingestion & Divergent Multi-Path Resolution**:
      - When an exported CLIC Advice workbook or runtime advice modal is uploaded:
        - *Ignore Warnings*: Advisory notices (e.g., general warranty notices, non-blocking recommendations) are separated into advisories and do not fail the build.
        - *Isolate Unbuildable Errors*: Hard build-breaking errors (e.g., missing cables, slot oversubscriptions, form-factor gates) are extracted with exact Rule# and Product#.
        - *Map Divergent Resolution Paths*: When CLIC Advice or physical topology offers multiple valid remedies (e.g., Path A: SAS Expander `P48835-B21` vs. Path B: 2nd RAID Controller `P48824-B21`), the engine preserves both options as divergent branches feeding the 5-Tier Strategy Matrix (Rank 1A, Rank 1B, Rank 1L least-delta, Rank 2 performance, Rank 5 budget) based on closeness to original customer BOQ and architectural elegance.

85. **Price Sanity, Clean Header Parsing & Anti-Fabrication Guardrail (`INV-94`)**:
    - **Header Mapping & Cost Normalization**: `parseSingleTableRow` in `dom_extract.js` MUST explicitly map variations of cost headers (`cost`, `cost (usd)`, `ext cost`, `extended price`, `price`) to clean numerical prices. It must strictly reject un-parsed status strings, table headers, or blank placeholders.
    - **Anti-Fabrication & Strict Column Filtering**:
      - Numerical fallback logic MUST NEVER confuse table quantity columns (e.g. standard order multiples of 1, 2, 4, 8) or SKU-like part numbers with currency prices.
      - Any price extraction violating quantity-as-price ($1, $2, $4 without FIO kit confirmation) or SKU-as-price (matching `^[A-Z0-9]{6}-[A-Z0-9]{3}$`) must be flagged and rejected by staging audit `verify_excel_tally.js` (Audit 4B).
    - **Chassis Map Integrity**: Every chassis SKU discovered during scraping (e.g. `P52499-B21`, `P52500-B21`, `P52501-B21` for DL360 Gen11) MUST be mapped in `chassis_map.json` with correct form factor (1U/2U), socket count, and base chassis price.

86. **Cross-Chassis Portfolio Price Backfill Protocol (`INV-95`)**:
    - **Deterministic Sibling Catalog Scanning**: When a chassis's own raw scrape or price history lacks pricing for shared commodity options (e.g. where WebLogic OCA rendered $0 or cost columns were withheld during scrape), `loadPortfolioPriceBackfill()` in `build_catalog.js` scans sibling product catalogs within the exact same HPE generation family (e.g., DL380 Gen11, DL380a Gen11 for DL360 Gen11).
    - **Strict Generation Firewall (`INV-48`) Compliance**: Price backfill is strictly restricted to sibling catalogs of the SAME product generation (e.g., Gen11 $\rightarrow$ Gen11 only, Gen12 $\rightarrow$ Gen12 only). Cross-generation price bleeding (e.g. Gen11 DDR4/early DDR5 to Gen12 MRDIMMs) is strictly prohibited.
87. **Catalog Scraped & Certified Pre-Flight Gate (`INV-96`)**:
    - **Mandatory Grounding Verification**: Prior to executing BOQ evaluation or running 7-aspect physical math, `eval_boq.js` and `boq-eval-skill` MUST assert `isCatalogCertified(chassisId)` from `scripts/lib/catalog/catalog_discovery.js`.
    - **Strict Pre-Flight Assertion**: The target chassis catalog directory (`outputs/{Family}/{Gen}/{Model}/`) MUST exist, contain a valid `*_Catalog.json` with `metadata.totalUniqueSKUs > 0`, and contain the companion `*_OCA_Catalog.xlsx`.
    - **Ungrounded Evaluation Prohibition**: If the target chassis has never been scraped from HPE OCA or has 0 SKUs, evaluation MUST NOT proceed on ungrounded data. The engine immediately raises `[ERR_UNSCRAPED_SOLUTION]` with explicit instructions to run `scrape_oca_solution.js` or launch the scraper in the dashboard to establish certified ground truth first.

88. **Autonomous Solution Strategy Double-Check Protocol (`INV-97`)**:
    - **Post-Synthesis Grounded Double-Check**: After the 5-Tier Strategic Resolution Matrix synthesizes Rank 1 (Intent Preserved) and Rank 1L (Least Delta Alternative), the engine automatically verifies the synthesized solution against the product's NotebookLM notebook via `validateSolutionWithEphemeralSource()` in `scripts/lib/sync/nlm_solution_source_validator.js`.
    - **Zero-Contamination Ephemeral Attachment (`INV-24`)**: The multi-rank solution CSV is temporarily attached as an ephemeral source in NotebookLM, validated across all 7 physical aspects to confirm 100% buildability and verify that added enablement kits (cables, SAS expanders, auxiliary GPU power) comply with QuickSpecs and newly learned rules, and then immediately detached (`source_delete`).
    - **Verification Telemetry Attestation**: The double-check result is recorded in `evalResults.solutionDoubleCheck` (`DOUBLE_CHECK_PASSED` / `OFFLINE_MOCK_VERIFIED`) and logged to the execution trace ledger before final deliverable export.

89. **Generation-Isolated vs Universal Knowledge Scoping Protocol (`INV-98`)**:
    - Knowledge deltas MUST be strictly partitioned:
      - `CHASSIS_SPECIFIC`: Reside exclusively in `outputs/{Family}/{Gen}/{Model}/history/catalog_deltas.json` and sync exclusively to that product's notebook to prevent cross-generation rule contamination.
      - `UNIVERSAL_CROSS_CHASSIS`: Reside in `outputs/history/master_universal_knowledge_charter.md` covering universal truths (e.g. FIO `#0D1` suffixing, redundant PSU matching, minimum OS core licensing).

90. **Zero Unearned Verification Badges & Evidence-Derived Reporting (`INV-99`)**:
    - All exported Excel workbooks, JSON results, and UI dashboard badges MUST derive verification tags strictly from verified runtime evidence (`rank.evidence`, `rank.isBuildable`, `rank.cloudGrounded`).
    - Fabricating static or unconditional labels like "100% Factory Buildable in CLIC" or "7/7 ASPECTS PASS" when evaluation is ungrounded, pending, or failed is strictly prohibited.

91. **Solution Source Ephemeral Validation & Robust Cleanup Protocol (`INV-100`)**:
    - Ephemeral candidate solution sources attached to NotebookLM for multi-rank validation MUST be removed using `nlm source delete <sourceId>` enclosed within a guaranteed `finally` block.
    - Temporary candidate manifests MUST NEVER linger in production notebooks or pollute ground-truth QuickSpecs sources (`INV-24`).

92. **Multi-Sheet Sheet Name Integrity & Quantity Conservation (`INV-101`)**:
    - When evaluating multi-sheet tenders with an explicitly requested `targetSheet`, `readBoqLines` in `boq_evaluator.js` MUST evaluate that exact sheet.
    - If the requested sheet is missing from the workbook, the engine MUST throw a hard exception (`[ERR_SHEET_NOT_FOUND]`) rather than silently defaulting to the first sheet, preventing erroneous duplicate evaluations.

93. **Immutable Candidate Manifest & Non-Destructive Knowledge Deduplication (`INV-102`)**:
    - Every candidate in the 5-Tier Strategy Matrix MUST maintain an immutable part manifest with an independent SHA-256 hash, and distance scoring MUST prioritize customer intent preservation.
    - Knowledge delta deduplication in `continuous_learning_verifier.js` MUST match on `(affectedSku, ruleType, requiredDependencySku)`, ensuring that distinct physical dependencies (e.g. multiple distinct cable kits for a chassis) are never overwritten.

94. **Cross-Platform Atomic File I/O & Windows Lock Resilience (`INV-103`)**:
    - Atomic filesystem operations in `scripts/lib/system/fs_compat.js` MUST be resilient across all OS environments.
    - When `renameSync` encounters temporary Windows file locks (`EPERM`), it MUST automatically catch the error and fall back to `copyFileSync` and `unlinkSync`, guaranteeing atomic file integrity without crashing on file watchers or anti-virus processes.

95. **Terminal Evidence Ledger Lifecycle & Structural Guarantees (`INV-104`)**:
    - `evidenceLedger.finalizeAndExport()` MUST always run after Phase 8 (Deliverables) and Phase 9 (Continuous Learning) complete, or inside top-level error handlers (`catch (error)`).
    - Every phase (1 through 9) MUST record an unambiguous terminal status (`PASSED`, `FAILED`, `ACTION_REQUIRED`, `SKIPPED`, `NOT_REACHED`) in persistent storage on disk. No phase may ever remain `RUNNING` or `undefined`.
    - Every input artifact (`CUSTOMER_INPUT`, `CATALOG`) and deliverable artifact (`ANALYSIS_REPORT`, `RANKED_WORKBOOK`, `RANKED_CSV`, `PARTNER_PORTAL_WORKBOOK`) must record existence status, size, and cryptographic SHA-256 fingerprint.

96. **Strict Epistemological Segregation & Circular Authority Prohibition (`INV-105`)**:
    - Candidate BOM sources attached as ephemeral query inputs to NotebookLM MUST be strictly segregated from `authoritativeSourceIds`.
    - The candidate cannot certify itself: any LLM citation that references the candidate source itself or anonymous/unverified sources MUST evaluate to `UNKNOWN` and cannot certify vendor grounding.

97. **Zero Default Success & Strict Boolean Normalization (`INV-106`)**:
    - Normalizers and evaluators must NEVER use loose inequality checks (`!== false ? 'PASS' : 'FAIL'`).
    - When an aspect check, input field, or requirement is undefined or absent, it MUST evaluate strictly to `'UNKNOWN'` (or `'OPTIONAL'` for optional components like OCP adapters or Tech Care support), NEVER defaulting to `'PASS'`.

98. **Candidate Manifest Invalidation & Cryptographic Fingerprinting (`INV-107`)**:
    - Candidate review receipts (`candidateReviewCurrent`) are cryptographically bound to the SHA-256 manifest fingerprint (`solutionFingerprint(evalResults)`).
    - Any alteration of a SKU or quantity in a candidate solution immediately invalidates previous review receipts, withholding cloud delivery until re-verified.

99. **Atomic Non-Destructive Cloud Write & Readback Verification (`INV-108`)**:
    - Cloud delivery operations (Google Sheets) MUST NOT use destructive full-sheet wipes (`values:batchClear`).
    - Updates must use in-place cell updates (`spreadsheets.batchUpdate` with `updateCells`) followed by mandatory `values:batchGet` readback verification comparing cryptographic row fingerprints before declaring delivery complete.

100. **Universal Knowledge Scope Isolation & Quarantine Firewalls (`INV-109`)**:
    - Universal knowledge charters must strictly exclude single-product thresholds, TDP limits, and part numbers. Product-specific rules must remain quarantined to product catalogs and `quarantined_deltas.json`. Single-product rules must NEVER leak into the universal shared charter.

101. **Safe Search Tokenizer & Regex Metacharacter Sanitization (`INV-110`)**:
    - Query tokenizers (e.g. `prepareSearchTerms` in `local_rag_search.js`) must strip markdown syntax (`**`, `_`, `` ` ``, `#`) and escape regex metacharacters (`replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`) before passing search tokens to `new RegExp`.

102. **Error Trace Correlation in Machine-Parseable Output (`INV-111`)**:
    - Evaluator error handlers (both in `runEvaluationPipelineWithinTrace` and `main().catch()`) must attach `traceId` and `evidenceLogPath` and emit them inside `__EVAL_RESULT_JSON__{ status: 'ERROR', error: ..., data: { traceId, evidenceLogPath } }__EVAL_RESULT_JSON__` even on fatal pre-flight failures.

103. **Direct Catalog Option Table Schema Traversal (`INV-112`)**:
    - Option tables in HPE OCA scraped catalogs are structured under `catalogData.entries[].skus[]`. Catalog intelligence parsers must iterate directly over entries and nested skus rather than assuming a `categories` object, extracting `parentCategory`, `subCategory`, `lifecycleStatus`, and `listPrice`.

104. **Chassis-Scoped Historical Pricing Partitioning (`INV-113`)**:
    - Historical price trail records are partitioned strictly per product chassis at `outputs/{Family}/{Gen}/{Model}/history/price_history.json`. Queries must dynamically resolve the target model directory via `catalog_discovery.js` instead of assuming a global history file.

105. **Strict-Mode Variable Scope Hoisting in Multi-Branch Dispatchers (`INV-114`)**:
    - In `'use strict'` dispatchers and `switch` statements, variables referenced across conditional branches (`chassisInfo`, `context`) must be hoisted to block or function scope before branching on file vs in-memory items, preventing temporal dead zone `ReferenceError` hazards.

106. **Position-Independent CLI Argument Parsing (`INV-115`)**:
    - Command-line evaluators (`eval_boq.js`) must scan for non-flag tokens and support explicit `--file <path>`, ensuring option flags (`--offline`, `--json`, `--chassis`) placed before the target file do not trigger false "file not found" errors.

107. **Full 9-Phase Terminal Evidence Lifecycle for Presales Sizing (`INV-116`)**:
    - Presales pipelines that generate an `EvidenceLedger` (`RFP_SIZING_TO_BOM`) must advance all 9 phases to a terminal status (`PASSED`, `ACTION_REQUIRED`, or `RESOLVED`), cryptographically fingerprint customer requirements (`CUSTOMER_INPUT` SHA-256), and log candidate SKUs in `skuAuditLedger`, guaranteeing 100% healthy evidence logs (`healthy: true`, `gaps: []`).

108. **Pre-Processing Single-Node Base Unit BOM Normalization & Multiplier Preservation Invariant (`INV-117`)**:
    - **Single-Compute Normalization Anchor**: All customer tenders, quotes, RFP sheets, or multi-node BOQs (whether arriving as `.csv`, `.xlsx`, OCR scanned PDF, or images) must first undergo pre-flight sanitization and single-compute normalization. When input quantities represent an aggregated multi-node cluster ($N > 1$ chassis), items must be decomposed into a **Base Unit BOM** (representing exactly 1 server compute node) and an isolated **Node Multiplier** ($N = \text{serverCount}$).
    - **Physical Aspect Check Boundaries**: Physical engineering sanity checkers (compute/thermal, memory channel, PCIe riser slot budget, drive count & SAS/Tri-Mode expander threshold, power supply redundancy & envelope, networking OCP slot capacity) must **ONLY** evaluate the Base Unit BOM (1 server node) or per-node normalized counts ($Q_{\text{node}} = Q_{\text{total}} / N$). Single-server hardware capacity limits must NEVER be evaluated against pre-multiplied cluster totals, which triggers false expander, riser, and cable violations that corrupt Rank 1 recommendations.
    - **Multiplier Preservation in Enterprise Portals**: Downstream deliverables (HPE One Config Advanced / CLIC Partner Portal sheets, 5-Tier Strategy Workbooks, executive BOM summaries) must preserve the Base Unit BOM with the exact integer node multiplier (`Set = N` or `Qty = Q_node`, `Multiplier = N`). `Total CapEx` is strictly computed via formulaic rollups ($\sum Q_{\text{node}} \times N \times \text{UnitPrice}$) without double-multiplication.
    - **Spares, Cluster-Level Services, and Accessory Immunity**: Order-level installation services (e.g. `HA113A1` Onsite Installation), cluster-wide spares, chassis accessories (e.g. `804943-B21` 4x Lift Handle), and non-node SaaS subscriptions are immune to node division/multiplication and must remain scoped at `nodeMult = 1` or cluster level.
    - **Hardware Spec & Multiplier Neutralization**: Pre-processing tokenizers must neutralize hardware specification suffixes (such as `x8`, `x16`, `4x`, `#`, `Gen5`) in descriptions and model strings to prevent false parsing as quantity multipliers. Services and accessories with OEM product names (e.g. `HA113A1 5A6` "HPE Proliant DL/ML Install SVC") must never be detected as server chassis or drive cages.

109. **Dual OCP Slot Enablement Interconnect Invariant (`INV-118`)**:
    - When a customer tender or competitor quote (e.g. Dell R770 Riser 6-2) specifies two OCP expansion slots (`1x8/1x16 OCP (G5)` and `2nd OCP x16 (G5)`), the solution engine must provision the internal signal enablement cable kit (`P72203-B21` / `SECONDARY_OCP_SLOT_ENABLEMENT_CABLE`). In HPE DL380 Gen12, OCP Slot A is native, but OCP Slot B requires dedicated CPU1/CPU2 cabling to physically activate the rear secondary OCP port. Removing this cable produces a chassis with an unpowered, dead second OCP port, violating hardware parity.

110. **PCIe Lane-Width Parity & Primary Riser Upgrades Invariant (`INV-119`)**:
    - When an enterprise RFQ requires multiple full-height x16 Gen5 expansion slots (`Rear 2x16 FH (G5)`), the evaluation engine must upgrade from the factory default primary riser (`x8/x16/x8` at $0) to the all-x16 Gen5 Primary Riser Kit (`P48803-B21` / `PRIMARY_FULL_BANDWIDTH_EXPANSION_RISER`). Relying solely on the default riser delivers only a single x16 slot in the primary position, risking technical disqualification during competitive tender audits.

111. **Rear Boot Storage and Tertiary Riser Containment Invariant (`INV-120`)**:
    - In 2U enterprise server architectures, rear hot-plug boot storage devices (e.g. `P78279-B21` NS204i-u v2 with `P74755-B21` Rear Mount Kit or Dell BOSS-N1 rear) physically occupy the Tertiary Riser bay (Zone 3 above the power supplies). Tertiary risers and rear boot devices are mutually exclusive. The solution engine must strictly forbid tertiary risers when rear boot enablement kits are present.

112. **Data Storage Drive Preservation Invariant (`INV-121`)**:
    - When customer tenders explicitly specify local data storage drives (e.g. 3x 960GB SATA Read-Intensive SSDs) alongside storage controllers and drive cages, the evaluation engine MUST NEVER produce an unexpected diskless proposal or drop drives to artificially lower price. Mirrored M.2 boot storage (`NS204i-u`) satisfies only OS boot requirements; local application scratch and data drives must be preserved with exact count, interface, and capacity (`P40498-B21`).

113. **True N+1 Power Redundancy under Accelerator Peak Load Invariant (`INV-122`)**:
    - Dual-socket servers pairing high-TDP CPUs (>270W each, e.g. 2x Xeon 6760P 330W = 660W) with high-draw PCIe accelerators (>=350W, e.g. 1x H200 NVL 450W) exceed 1,500W system peak electrical draw under full thermal duty cycle. In 1+1 redundant configurations, each individual power supply MUST be sized to sustain full peak load upon single-feed or PSU failure. Sizing dual 1000W PSUs delivers 2000W combined non-redundant power but fails N+1 redundancy; high-wattage Titanium PSUs (e.g. `P44712-B21` 1800W-2200W Titanium) must be mandated.

## 7. Cognitive Mandates for Autonomous Agents (Root Cause Prevention)
To ensure that future AI agents (Antigravity, Codex, Claude, or subagents) never repeat the blind spots identified in the 2026-09-17 audit, all agents MUST adhere to these cognitive mandates:
1. **Adversarial Negative-Path Thinking**: For every feature or gate, test missing, empty, corrupt, and boundary inputs first. A failure or missing check must NEVER become a success claim.
2. **Disk-Persistence Verification**: Verify actual files on disk and their SHA-256 hashes, not in-memory return objects or transient flags.
3. **Four-Tier Epistemological Discipline**:
   - Tier 0: Customer Input = Untrusted Claim.
   - Tier 1: Local Aspect Rules = Pre-Flight Math Sanity Check.
   - Tier 2: Grounded NotebookLM Review = Document Citation Check.
   - Tier 3: Live OCA/CLIC Portal Response = Official Vendor Acceptance Receipt.
   Never conflate Tier 1 or Tier 2 with Tier 3. Deliverables must label `PORTAL VALIDATION PENDING` until a live CLIC transaction occurs.
4. **Zero Optimistic Falsification**: When an external service (LLM, RAG, API) is unavailable or offline, mark the stage as `ACTION_REQUIRED` or `INCOMPLETE`. Never fabricate a synthetic pass.
5. **No Blind Checkins Without Full Matrix & Linter Certification**: Never commit code without certifying `npm test` (165+ suites), `npm run lint` (0 warnings on 110 files), and complexity gates ($CC \le 135$).







