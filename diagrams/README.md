# Architecture & System Diagrams Index

This repository contains a comprehensive suite of **23 visual architecture diagrams** modeling all workflows, substeps, data contracts, physical aspect math, agentic loops, and code-level interactions for the **HPE ProLiant AI Studio BOQ Evaluator & Conflict Resolution Engine**.

---

## 📂 1. Diagrams From Documentation (`diagrams/fromDocs/`)

Architectural diagrams derived from the consolidated system specifications in `docs/ARCHITECTURE_AND_DESIGN.md`, `docs/WORKFLOWS_AND_LEARNINGS.md`, `docs/DEVELOPER_GUIDE.md`, and `.agents/skills/`.

| Diagram | Focus Area | Description |
|---|---|---|
| [**01. Hybrid Dual-Brain Architecture**](fromDocs/01_hybrid_dual_brain_architecture.md) | Core Paradigm | Decoupling of deterministic offline math engine from QuickSpecs grounded LLM/RAG. |
| [**02. 6-Stage BOQ Evaluation Workflow**](fromDocs/02_six_stage_boq_evaluation_workflow.md) | E2E Evaluation | Detailed sequence diagram of the 6-stage BOQ lifecycle with all pre-flight substeps. |
| [**03. 5-Tier Strategy Resolution Matrix**](fromDocs/03_five_tier_strategy_resolution_matrix.md) | Solution Synthesis | Workload DNA profiling, Rank 1 through Rank 5 synthesis, and budget arithmetic. |
| [**04. Zero-Touch CDP Scraping Lifecycle**](fromDocs/04_zero_touch_cdp_scraping_lifecycle.md) | Ingestion & Scraper | Chrome remote debugging (port 9222), SSO boundary, staging isolation & promotion. |
| [**05. Closed-Loop Feedback & Learning**](fromDocs/05_closed_loop_feedback_and_learning.md) | Continuous Learning | HITL feedback capture, Partner Portal rejection ingestion, KnowledgeDelta sync. |
| [**06. Gemini Smart FIFO Key Rotator**](fromDocs/06_gemini_smart_fifo_rotator_state_machine.md) | API Resilience | Deterministic FIFO queue, 429 daily demotion, and UTC midnight reset state machine. |
| [**07. Multi-Config BOQ Preprocessing**](fromDocs/07_multi_config_boq_preprocessing.md) | Data Normalization | Multi-sheet parsing, CTO multiplier division, and fractional anomaly heuristics. |
| [**08. Agentic Guardrail MCP Tool Loop**](fromDocs/08_agentic_guardrail_mcp_loop.md) | AI Agent Loop | Autonomous MCP tool server execution, simulate_build iteration & RAG grounding. |
| [**09. 7-Aspect Hardware Math Hierarchy**](fromDocs/09_six_aspect_hardware_math_hierarchy.md) | Physical Constraints | Mathematical formulas, TDP boundaries, memory channels, and capacity gates. |
| [**10. Chaos Resilience & Red-Teaming**](fromDocs/10_chaos_and_adversarial_red_teaming.md) | Outage Resilience | Adversarial agent mutation, failure mode safety nets, and fallback observability. |
| [**11. Master Macro Orchestration Flow**](fromDocs/11_master_macro_orchestration_flow.md) | Macro Lifecycle | High-level circular continuous learning loop from live scraping to feedback learning. |

---

## 📂 2. Diagrams From Code (`diagrams/fromCode/`)

Implementation diagrams derived directly from the source code across `dashboard/server.cjs`, `dashboard/routes/`, `dashboard/src/`, and `scripts/lib/`.

| Diagram | Focus Area | Source Implementation |
|---|---|---|
| [**01. Backend API & Routes Architecture**](fromCode/01_backend_api_and_routes_architecture.md) | Server & Routing | `dashboard/server.cjs`, `dashboard/routes/`, `dashboard/services/` |
| [**02. Task Manager Mutex & SSE Streaming**](fromCode/02_task_manager_mutex_and_sse_streaming.md) | Async & Process Lifecycle | `dashboard/services/taskManager.cjs`, `dashboard/routes/tasks.cjs` |
| [**03. Library Subsystems & Barrel Structure**](fromCode/03_library_subsystems_and_barrel_structure.md) | Domain Organization | `scripts/lib/index.js`, 6 decoupled subsystem directories |
| [**04. React Frontend Component Hierarchy**](fromCode/04_react_frontend_component_hierarchy.md) | UI & State Flow | `dashboard/src/App.jsx`, custom hooks, modular UI components |
| [**05. Conflict DAG & Rule Engine**](fromCode/05_conflict_dag_and_rule_engine.md) | Capacity & Graph Rules | `scripts/lib/conflict_graph.js`, `scripts/lib/catalog_rules.js` |
| [**06. CDP Browser Automation & DOM Extraction**](fromCode/06_cdp_browser_automation_and_dom_extraction.md) | Browser Remote Debugging | `scripts/lib/cdp.js`, `scripts/lib/dom_extract.js`, `navigate_oca.js` |
| [**07. Multimodal Vision OCR Pipeline**](fromCode/07_multimodal_vision_ocr_pipeline.md) | Vision AI Extraction | `scripts/lib/ocr_service.js`, `scripts/lib/gemini_rotator.js` |
| [**08. Master Excel Workbook Generation**](fromCode/08_master_excel_workbook_generation_pipeline.md) | XLSX Generation | `scripts/generate_xlsx.js`, `scripts/lib/generate_boq_xlsx.js` |
| [**09. Checksum Diffing & SKU Versioning**](fromCode/09_checksum_diffing_and_versioning_engine.md) | Incremental Auditing | `scripts/lib/checksum_diff.js`, `scripts/lib/sku_versioning.js` |
| [**10. Telemetry Ledger & Observability Pipeline**](fromCode/10_telemetry_ledger_and_observability_pipeline.md) | Logging & Metrics | `scripts/lib/system/telemetry.js`, `pipeline_logger.js`, `progress.js` |
| [**11. Zod Runtime Schemas & Validation**](fromCode/11_zod_runtime_schema_and_validation_pipeline.md) | Data Contracts | `scripts/lib/schemas.js`, `scripts/lib/data_validator.js` |
| [**12. Macro Orchestration Execution Lifecycle**](fromCode/12_macro_orchestration_lifecycle.md) | CLI & Lifecycle Scripts | `scripts/rebuild_all.js`, `scripts/verify_all.js`, `scripts/eval_boq.js` |
