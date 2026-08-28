# HPE ProLiant AI Studio BOQ Evaluator & Conflict Resolution Engine

Welcome to the **HPE ProLiant AI Studio BOQ Evaluator**. This is a production-grade, Agent-Assisted hardware configuration validation engine built on a **Hybrid Dual-Brain Architecture**.

## 📖 Documentation & Knowledge Base

To ensure AI Agents and human developers operate efficiently (without wasting tokens) and with absolute clarity, our Canonical Engineering Knowledge Base is organized into:

### 1. [Directory Structure & Topology](docs/DIRECTORY_STRUCTURE.md)
Comprehensive map of the modular codebase layout across `scripts/` subsystems, `scripts/lib/` domain libraries, `tests/` tiers, and dashboard services.

### 2. [Architecture & Design](docs/ARCHITECTURE_AND_DESIGN.md)
Core systemic design:
- The **Hybrid Dual-Brain Architecture** (Mermaid Diagrams)
- Core coding decisions (Deterministic Rule Engine Primacy, Agentic MCP Guardrails)
- Data dictionary and key JSON schemas

### 3. [Workflows, Pipelines & Full Learnings](docs/WORKFLOWS_AND_LEARNINGS.md)
Operational clarity and execution pipelines:
- **6-Stage Continuous Learning Lifecycle**
- MCP Server details & Tooling integrations
- Rate Limit Handling (Smart FIFO Key Rotation), Hallucination Prevention via Adversarial Red-Teaming, and 28 comprehensive system learnings.

### 4. [Developer Guide](docs/DEVELOPER_GUIDE.md)
Instructions for local development, debugging playbook, and testing:
- Setup, execution scripts, and dashboard launch commands
- **UI/UX standards**: Enforces the `design-taste-frontend` rules (Geist font, Emerald Green, Anti-Slop layout).
- **Codebase Auditing**: Uses `graphify` semantic graphs for codebase comprehension and architecture validation to optimize agent tokens.
- Continuous Benchmarking and Red-Teaming verification steps.

---

## 🤖 For AI Agents (MANDATORY START)

Before reading code or executing commands, **query the semantic graph via `/graphify query`**.

- **[AGENTS.md](AGENTS.md)**: Root instruction set prioritizing atomic JSON writes, rule-engine deterministic fallbacks, and skill delegation.
- **[GEMINI.md](GEMINI.md)**: Guidelines for Gemini LLM prompting, MCP context window management, API rate limit resilience, and NotebookLM RAG fallback.
- **[.agents/DATA_DICTIONARY.md](.agents/DATA_DICTIONARY.md)**: Canonical schema definitions for catalog JSONs, evaluation results, and telemetry ledgers.

## 🚀 Quick Start

1. Start the real-time telemetry dashboard:
   ```bash
   npm run dashboard
   ```
2. Run a CLI Evaluation (Agentic Guardrail Loop Enabled):
   ```bash
   node scripts/evaluators/eval_boq.js tests/fixtures/test_boq_dl380_gen12.csv --chassis outputs/ProLiant/Gen12/DL380_Gen12
   ```
3. Run all test suites (50+ test suites across 4 tiers, 100% pass):
   ```bash
   npm run test:all
   ```
4. Check pipeline and portfolio observability status:
   ```bash
   npm run status
   ```
5. Bootstrap & certify the Gen12 golden catalog:
   ```bash
   npm run bootstrap:gen12
   npm run certify:gen12
   ```
6. Run a single adversarial red-team pass (optional):
   ```bash
   node scripts/evaluators/adversarial_agent.js
   ```
