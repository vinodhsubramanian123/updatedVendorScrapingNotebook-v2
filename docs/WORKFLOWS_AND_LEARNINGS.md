# Workflows, Pipelines & Full Learnings

## 1. 6-Stage BOQ Evaluation Workflow
1. **Multimodal Parsing**: `gemini-2.5-flash` processes images/PDFs into structured BOQ JSON.
2. **CTO Normalization**: Resolves fractional math for multi-node chassis configurations.
3. **Aspect Math Guardrails**: Validates CPU TDP limits, memory channel symmetry, power lug kits, and PCIe slots.
4. **NotebookLM Grounding**: Queries HPE QuickSpecs for absolute truth on dependencies.
5. **Agentic Verification (Guardrail Loop)**: Gemini LLM orchestrates tools to resolve conflicts, re-simulate builds, and learn missing knowledge.
6. **Partner Portal Re-verification**: Cross-checks solutions against official HPE portals to derive `KnowledgeDeltas`.

## 2. System Learnings & Improvements
- **API Rate Limits (429 & 503 Errors)**: High concurrency triggers strict Gemini API limits (especially on models like `gemini-3.6-flash`). We introduced retry backoff loops in `agentic_guardrail.js` and shifted primary operations to `gemini-2.5-flash` and `gemini-3.5-flash`.
- **Hallucination Prevention (Red-Teaming)**: We implemented a background Adversarial Agent (`adversarial_agent.js`) that continuously injects hallucinated BOQs to verify the evaluator's Catch Rate and Precision. This runs asynchronously and updates the `pipeline_telemetry.json` heartbeat.
- **Agentic Autonomy**: We replaced static LLM explanation prompts with an active **Guardrail Loop** using MCP tool definitions. The LLM can now call `simulate_build` and `record_knowledge_delta`.
- **Decoupling Scraping from Core Script**: We observed that globally hardcoded CDP parameters (like a 15,000px scroll threshold) were perfectly tuned for massive chassis like DL380 Gen12 but would artificially cause false-positive validation failures on smaller networking or storage scrapes. We resolved this ambiguity by implementing a Configuration-Driven Profile architecture (`scripts/config/profiles/`), moving generation-specific keywords and heuristics out of regex strings and into maintainable JSON profiles.
- **React Hook Hygiene & Execution Order (GAP-5)**: Early conditional returns (`if (isLoading)` or `if (error)`) before `useMemo` or `useEffect` hook definitions break React's hook call order, causing runtime crashes during state changes or tab navigation. All hooks MUST be declared unconditionally at top-level before any rendering conditionals.
- **Lint-Enforced Import Discipline & Zero-Warning Standard (GAP-7/8)**: Unused imports and dead variables pollute bundle size and mask bugs. Integrating `oxlint` into `package.json` (`npm run lint`) enforces a 0-warning, 0-error code quality benchmark across all 36 dashboard component files.
- **Canonical Data Contracts (GAP-11)**: Formalizing `.agents/DATA_DICTIONARY.md` ensures full structural compatibility between backend engine data providers (`boq_evaluator.js`, `conflict_graph.js`, `agentic_guardrail.js`) and React UI consumers.
- **Module Resolution & Script Modularization (GAP-15)**: Common utility helpers (like `csv_to_catalog.js`) required by system scripts (`sync_registry.js`, `rebuild_all.js`) must be maintained in canonical `scripts/` paths rather than archived directories to guarantee module require stacks pass cleanly in automated CI/CD pipelines.
- **Clean Root & Artifact Discipline (GAP-16)**: Standardized test output paths so scripts (like `e2e_headless_ui_test.js`) write JSON reports to `outputs/history/e2e_report.json` instead of writing stray files to the project root directory.
- **Playwright E2E UI Automation & Log Unpacking (GAP-17)**: Headless browser testing revealed that structured SSE log streams can broadcast objects (`{text, timestamp, stream}`) rather than raw strings. Safely coercing log objects before regex matching in `WorkflowStepper.jsx` and adding `data-tab` & `data-testid` attributes ensures robust automated tab navigation and 0-error component rendering.

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


