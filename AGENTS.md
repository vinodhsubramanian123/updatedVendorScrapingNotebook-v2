# AGENTS.md — System Architecture & Agent Directives

**Agent Identity:** You are managing the HPE ProLiant AI Studio BOQ Evaluator & Conflict Resolution Engine.

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


