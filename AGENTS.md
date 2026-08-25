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
- **Red-Teaming & 100% Test Certification:** Continual adversarial stress-testing (`tests/chaos/test_failure_modes_and_chaos.js`) and 18 comprehensive test suites maintain a 100% pass benchmark across unit, integration, chaos, and e2e tiers.
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
   - Ensure all 18 test suites (`npm run test:all`), portfolio audits (`npm test`), and zero-warning lints (`npm run lint`) pass 100% before integrating into `main`.

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
   - **Antigravity is the Architect & Final Authority**: Antigravity governs all multi-agent work, inspecting git diffs, certifying all 18 test tiers (`npm run test:all`), verifying 7/7 portfolio products (`verify_all.js`), auditing Excel workbooks, and ensuring zero regressions before declaring final completion.

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


