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

### 💻 Universal Cross-Platform Environment Setup & Migration Matrix
The engine is certified cross-platform across **Linux Mint / Ubuntu**, **Windows 10/11**, and **macOS Monterey 12.7+ (MacBook Air Intel / Apple Silicon)**.

#### 1. OS-Specific Prerequisites

| Requirement | Linux Mint / Ubuntu | Windows 10 / 11 | macOS Monterey 12.7+ (MacBook Air) |
| :--- | :--- | :--- | :--- |
| **Node.js (>=20.19.0)** | `curl -fsSL https://deb.nodesource.com/setup_20.x \| sudo -E bash - && sudo apt-get install -y nodejs` (or nvm) | `winget install OpenJS.NodeJS.LTS` (or from nodejs.org) | `brew install node` (or nvm) |
| **Python (>=3.10)** | `sudo apt-get install -y python3 python3-pip` | `winget install Python.Python.3.12` | `brew install python@3.11` (or system python3) |
| **Google Chrome** | `wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && sudo dpkg -i ...` | Standard installer (`C:\Program Files\Google\Chrome`) | `brew install --cask google-chrome` (`/Applications/Google Chrome.app`) |
| **CLI Tools (`uv`)** | `curl -LsSf https://astral.sh/uv/install.sh \| sh` | `powershell -c "irm https://astral.sh/uv/install.ps1 \| iex"` | `brew install uv` (or `curl -LsSf https://astral.sh/uv/install.sh \| sh`) |
| **NotebookLM & Graphify** | `uv tool install notebooklm-mcp-cli && uv tool install "graphifyy[mcp]"` | `uv tool install notebooklm-mcp-cli` & `uv tool install "graphifyy[mcp]"` | `uv tool install notebooklm-mcp-cli` & `uv tool install "graphifyy[mcp]"` |

---

#### 2. Zero-Touch 1-Command Autonomous Migration (RECOMMENDED)

When switching to any laptop (Linux Mint, Windows, or MacBook Air):

1. **Clone the repository and install npm dependencies:**
   ```bash
   git clone <repo-url>
   cd vendorNotebookSolution
   npm install
   ```

2. **Download `antigravity_migration_bundle.zip`:**
   Download the bundle from [Google Drive](https://drive.google.com/file/d/1R3joG9HkIT0BgHvzjqvC38CHS5-wVFkg/view?usp=sharing) and place it in `~/Downloads` (or project root).

3. **Run the autonomous restorer:**
   ```bash
   npm run restore:env
   ```

**What `npm run restore:env` executes automatically:**
- 🖥️ **Cross-Platform Detection**: Automatically senses Linux Mint, Windows 10/11, or macOS Monterey 12.7 (Darwin, Intel / Apple Silicon) and resolves appropriate home/appdata paths.
- 🔑 **Sanitized `.env` Restoration**: Injects Gemini API keys and key-rotation configuration into `.env` while automatically stripping any host-specific `PATH=` variables to prevent cross-OS pollution.
- ☁️ **Google ADC Restoration**: Copies Google Cloud Application Default Credentials to `~/.config/gcloud/` (macOS/Linux) or `%APPDATA%\gcloud\` (Windows).
- 📓 **Google NotebookLM Session**: Restores active session cookies and `auth.json` to `~/.notebooklm-mcp-cli/` so all 35+ `gemini-notebook-mcp` tools connect immediately without re-authenticating in a browser.
- 🧠 **Master Knowledge Registry & Brain State**: Syncs `master_knowledge_registry.json`, price trails, and quarantined deltas into `outputs/history/`.
- ⚙️ **Machine-Accurate MCP Configuration**: Dynamically generates `~/.gemini/config/mcp_config.json`, discovering Antigravity built-in extensions (`data-agent-kit`, `notebooks`, `visualization`) and resolving `notebooklm-mcp` and `graphify-mcp` across `~/.local/bin`, `/opt/homebrew/bin`, and `/usr/local/bin`.
- 🌐 **Headless Browser Setup**: Automatically runs `npx playwright install chromium`.
- 🛡️ **Autonomous Health Certification**: Runs `npm run guardrail:check` and certifies all 7 enterprise guardrails pass 100%.

---

#### 3. Post-Migration Verification & Certification Commands

Run these two commands on the new machine to verify 100% health:
```bash
# 1. Verify all 7 system guardrails (Gemini rotator, NotebookLM MCP, physical aspects, atomic FS)
npm run guardrail:check

# 2. Run the complete isolated test matrix (all unit, chaos, and integration suites)
npm test
```
**Expected Outcome**: 7/7 Guardrails PASS, 162/162 Test Suites PASS (100.0%).

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
