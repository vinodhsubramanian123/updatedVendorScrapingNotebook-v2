# HPE ProLiant AI Studio BOQ Evaluator & Conflict Resolution Engine

Welcome to the **HPE ProLiant AI Studio BOQ Evaluator**. This is a production-grade, Agent-Assisted hardware configuration validation engine built on a **Hybrid Dual-Brain Architecture**.

## 📖 Documentation & Knowledge Base

To ensure AI Agents and human developers operate efficiently (without wasting tokens) and with absolute clarity, we have consolidated our Canonical Engineering Knowledge Base into three highly-focused documents:

### 1. [Architecture & Design](docs/ARCHITECTURE_AND_DESIGN.md)
Contains the core systemic design:
- The **Hybrid Dual-Brain Architecture** (Mermaid Diagram)
- Core coding decisions (Deterministic Rule Engine Primacy, Agentic MCP Guardrails)
- Data dictionary and key JSON schemas

### 2. [Workflows, Pipelines & Full Learnings](docs/WORKFLOWS_AND_LEARNINGS.md)
Contains operational clarity and execution pipelines:
- **6-Stage BOQ Evaluation Workflow**
- MCP Server details & Tooling integrations
- **Full Learnings Update**: Rate Limit Handling (429/503), Hallucination Prevention via Background Red-Teaming (Adversarial Agent), and autonomous resolution loops.

### 3. [Developer Guide](docs/DEVELOPER_GUIDE.md)
Contains strict instructions on how to interact with the codebase:
- Setup, execution scripts, and dashboard launch commands
- UI/UX standards (Tailwind, Accessibility)
- Continuous Benchmarking and Red-Teaming verification steps.

---

## 🤖 Agent System Instructions (AGENTS.md & GEMINI.md)

- **[AGENTS.md](AGENTS.md)**: Token-optimized root instruction set prioritizing atomic JSON writes, rule-engine deterministic fallbacks, and skill delegation.
- **[GEMINI.md](GEMINI.md)**: Guidelines for Gemini LLM prompting, MCP context window management, API rate limit resilience, and NotebookLM RAG fallback.

## 🚀 Quick Start

1. Start the real-time telemetry dashboard:
   ```bash
   cd dashboard && npm run dev
   ```
2. Run a CLI Evaluation (Agentic Guardrail Loop Enabled):
   ```bash
   node scripts/eval_boq.js tests/fixtures/test_boq_dl380_gen12.csv --chassis outputs/ProLiant/Gen12/DL380_Gen12_SFF
   ```
3. Run the continuous Red-Team background benchmarking:
   ```bash
   node scripts/run_background_adversary.js &
   ```
