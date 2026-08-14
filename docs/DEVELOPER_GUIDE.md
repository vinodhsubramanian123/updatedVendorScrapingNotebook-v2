# Developer Guide

## 1. Prerequisites & Environment Setup

### System Requirements
- **Node.js** ≥ 18.0.0
- **npm** ≥ 9.0.0 (comes with Node.js)
- **Google Chrome** with remote debugging enabled on port `9222` (for live OCA scraping)

### Initial Setup
```bash
# Clone and install dependencies
git clone <repo-url>
cd vendorNotebookSolution
npm install

# Copy environment variables template
cp .env.example .env
```

### Environment Variables (`.env`)
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | Express server port for the dashboard |
| `NODE_ENV` | No | `development` | Node environment (`development` / `production`) |
| `GEMINI_API_KEY` | No | — | Google Gemini API key (or comma-separated pool of keys) for Smart FIFO Rotation, NotebookLM RAG, OCR, and Agentic Guardrail |

> **Note**: The dashboard runs fully functional without `GEMINI_API_KEY`. The local Rule Engine (deterministic) handles all BOQ evaluations. The API keys enable the Multimodal OCR, NotebookLM RAG verification, and Agentic Guardrail loops with zero-downtime auto-rotation.

---

## 2. Running the Application

### Dashboard (Recommended for Development)
```bash
# Start the full dashboard (Express backend + Vite dev server + feedback listener)
npm run dashboard

# OR start just the Express backend (serves pre-built frontend)
npm run dev
```

### Key npm Scripts
| Command | Description |
|---------|-------------|
| `npm run dev` | Start Express backend server on configured PORT |
| `npm run build` | Build production dashboard assets via Vite |
| `npm run lint` | Run `oxlint` on dashboard source files |
| `npm test` | Run portfolio verification audit (`verify_all.js`) |
| `npm run test:rotator` | Run Smart Gemini Key Rotator test suite (`test_gemini_rotator.js`) |
| `npm run test:all` | Run ALL test suites (E2E, conflicts, offline, edges, aspects, audit) |
| `npm run test:aspects` | Run 34-assertion aspect math verification |
| `npm run test:benchmarks` | Run 5-scenario BOQ evaluation benchmarks |
| `npm run eval:boq -- <file>` | Run CLI BOQ evaluator against a quote file |
| `npm run scrape` | Execute live OCA portal scrape via CDP |
| `npm run rebuild` | Rebuild all catalogs from raw_data |
| `npm run sync:knowledge` | Sync knowledge payloads to NotebookLM |
| `npm run status` | View pipeline observability status |

---

## 3. Live CDP Scraping & SSO Workflow

The dashboard features a "Zero-Touch" browser launcher for CDP scraping. However, due to HPE Enterprise security, a manual authentication step is strictly required.

**The Hybrid Workflow:**
1. **Launch Browser:** Click the "Launch Scraper Browser" button in the UI. The backend (`/api/launch-browser`) spins up Google Chrome bound to port 9222 using a persistent local profile (`.chrome_sso_profile`).
2. **Manual SSO:** The browser opens `partner.hpe.com`. You **must** log in manually and click the **"OCA Configurator"** link. Direct URL navigation to `oca.ext.hpe.com` will fail because it bypasses SAML token generation.
3. **Scrape:** Once the OCA configurator is fully loaded, return to the dashboard and click "Start Scrape".

*Note for AI Agents:* Do not attempt to bypass this manual SSO step or hallucinate a fully automated login sequence for the HPE portal.

---

## 4. Configuration Profiles
The OCA scraping engine relies on dynamic JSON profiles to dictate product-specific DOM rules without polluting core Node.js scripts.
- **Location**: `scripts/config/profiles/`
- **Fallback**: `default_profile.json` is used for any unknown product line.
- **Overrides**: Create a new profile (e.g., `proliant_gen12.json`) to adjust `scrollHeightThreshold` or map generation-specific components (e.g., `sr932i` controllers).

---

## 4. UI/UX & Coding Standards
- **Styling (Taste Skill)**: Enforce the `design-taste-frontend` rules. Use strictly Tailwind utility classes with Geist font and Emerald Green/Slate palettes. No generic "AI slop" gradients or heavy pure-black drop shadows.
- **Accessibility**: Ensure high contrast, proper modal closures (Escape key/backdrop clicks), and no orphaned click handlers.
- **Agent Knowledge Policy (Token Optimization)**: Before attempting to read or parse codebases, AI Agents MUST read `graphify-out/GRAPH_REPORT.md` (e.g. using `view_file` or `cat`). To dynamically explore file paths and trace dependencies, you MUST use the `graphify` skill rather than brute-force `grep` or `ls -R`. 
  - *Example:* Instead of reading all files in `scripts/lib/`, use `/graphify query "how does boq_evaluator work" --dfs` to trace the execution path and save tokens.
- **React Hooks**: All hooks must be called unconditionally before any early returns. Use `useRef` for values needed inside closures without triggering re-renders.

---

## 5. Testing & Benchmarking

### Test Suite Overview
| Suite | Command | Assertions | Description |
|-------|---------|------------|-------------|
| Aspect Math | `npm run test:aspects` | 34 | Physical hardware math (thermal, power, memory, PCIe, storage, network) |
| BOQ Benchmarks | `npm run test:benchmarks` | 5 scenarios | End-to-end BOQ evaluation with recall/precision metrics |
| Portfolio Audit | `npm test` | Per-product | Validates all catalog outputs on disk |
| E2E Scenarios | `node tests/test_end_to_end_scenarios.js` | Multi | Cross-product evaluation scenarios |
| Conflict Graph | `node tests/test_conflict_graph.js` | Per-rule | Conflict graph logic validation |
| Offline Mode | `node tests/test_offline_pipeline.js` | Fallback | Verifies graceful degradation without APIs |
| Edge Cases | `node tests/test_edge_cases.js` | Edge | Boundary condition coverage |
| E2E UI | `node tests/e2e_headless_ui_test.js` | UI | Headless browser dashboard verification |

### Adversarial Red-Teaming
Run `node scripts/adversarial_agent.js` to execute a single adversarial red-team pass. This stress-tests the evaluator with intentionally malformed or conflicting BOQs and logs results to `pipeline_telemetry.json`.

---

## 6. Project Architecture

For detailed architecture documentation, see:
- [ARCHITECTURE_AND_DESIGN.md](file:///home/vinodh/vendorNotebookSolution/docs/ARCHITECTURE_AND_DESIGN.md) — Core architecture, Dual-Brain paradigm, Mermaid diagrams
- [WORKFLOWS_AND_LEARNINGS.md](file:///home/vinodh/vendorNotebookSolution/docs/WORKFLOWS_AND_LEARNINGS.md) — E2E pipelines, Agentic Guardrail loops
- [DATA_DICTIONARY.md](file:///home/vinodh/vendorNotebookSolution/.agents/DATA_DICTIONARY.md) — JSON schemas and data contracts
