# AGENTS.md — System Architecture & Agent Directives

**Agent Identity:** You are managing the HPE ProLiant AI Studio BOQ Evaluator & Conflict Resolution Engine.

## 1. Mandatory First Step (Dynamic Discovery)
- **Read the Graph First:** Upon entering any session in this repository, you MUST first read [`graphify-out/GRAPH_REPORT.md`](file:///home/vinodh/vendorNotebookSolution/graphify-out/GRAPH_REPORT.md). This semantic graph is the *dynamic* source of truth for the codebase architecture, community boundaries, and God nodes.
- **Do Not Brute-Force Read:** Do not use `grep` or `cat` in loops to find code. Instead, use the `graphify` skill (e.g., `/graphify query "<question>"`) to dynamically trace code paths and dependencies to save context tokens.

## 2. Static Knowledge vs. Dynamic Knowledge
- **Static Rules (Read Once):** Core architectural rules (Dual-Brain), UI anti-slop guidelines (`design-taste-frontend`), data dictionary schemas (`.agents/DATA_DICTIONARY.md`), and fail-safe mechanisms are static. Read them here and in `docs/`.
- **Dynamic Logic (Query on Demand):** File dependencies, execution paths, and specific implementation logic change frequently. Query the live graph for these.

## 3. Golden Directives (Token-Optimized)
- **Use Skills for Depth:** This project uses specialized skills in [`.agents/skills/`](file:///home/vinodh/vendorNotebookSolution/.agents/skills/). If you need details on BOQ Evaluation, Scraping, NotebookLM RAG, Knowledge Sync, or Orchestration workflows, read the respective `SKILL.md`.
- **Atomic File Operations:** Always use `safeWriteJsonAtomic` in `scripts/lib/fs_compat.js` for writing JSON files to prevent corruption. No bare `fs.writeFileSync` for JSON.
- **Fail-Safe & Dual-Brain:** The system relies on a local Rule Engine (deterministic) and an Agentic MCP Guardrail (LLM/RAG). The frontend MUST NOT break if the LLM/API is offline or rate-limited.
- **No Mock Stubs:** All UI components and backend scripts must be fully functional and trigger real actions. UI metrics must be derived dynamically from JSON metadata.

## 4. Architecture & Documentation Index
For full architectural details, coding decisions, and project learnings, refer to the consolidated docs:
- [`docs/ARCHITECTURE_AND_DESIGN.md`](file:///home/vinodh/vendorNotebookSolution/docs/ARCHITECTURE_AND_DESIGN.md): Core architecture, Dual-Brain paradigm, data dictionary, and Mermaid diagrams.
- [`docs/WORKFLOWS_AND_LEARNINGS.md`](file:///home/vinodh/vendorNotebookSolution/docs/WORKFLOWS_AND_LEARNINGS.md): E2E Pipelines, Agentic Guardrail loops, Continuous Benchmarking (Adversarial Red-Teaming), and MCP workflows.
- [`docs/DEVELOPER_GUIDE.md`](file:///home/vinodh/vendorNotebookSolution/docs/DEVELOPER_GUIDE.md): Local development, UI/UX standards, testing (eval/benchmarks), and API rate limit handling.

## 3. Key Technical Decisions
- **MCP Agentic Loop:** The BOQ Evaluator utilizes an MCP Server (`scripts/mcp_server.js`) and an Agentic Guardrail (`scripts/lib/agentic_guardrail.js`) for resolution.
- **Red-Teaming:** A background task (`scripts/adversarial_agent.js`) continually stress-tests the evaluator for reliability, logging to `pipeline_telemetry.json`.
