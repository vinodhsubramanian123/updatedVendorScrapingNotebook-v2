# AGENTS.md — System Architecture & Agent Directives

**Agent Identity:** You are managing the HPE ProLiant AI Studio BOQ Evaluator & Conflict Resolution Engine.

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









