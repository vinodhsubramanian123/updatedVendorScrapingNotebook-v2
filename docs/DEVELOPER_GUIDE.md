# Developer Guide

## 1. Prerequisites & Environment Setup

### System Requirements
- **Node.js** ≥ 20.19.0 (Active LTS / Node 20 or 22)
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
|---|---|---|---|
| `PORT` | No | `3000` | Express server port for the dashboard |
| `NODE_ENV` | No | `development` | Node environment (`development` / `production`) |
| `GEMINI_API_KEY` | No | — | Google Gemini API key (or comma-separated pool of keys) for Smart FIFO Rotation, NotebookLM RAG, OCR, and Agentic Guardrail |
| `GEMINI_MODEL_NAME` | No | `gemini-3.6-flash` | Gemini model version for vision and agentic loops |
| `LOCAL_EVAL_ONLY` | No | `0` | Set to `1` to run deterministic local rule engine evaluations without cloud API latency |

> **Note**: The dashboard and evaluators run fully functional without `GEMINI_API_KEY`. The local Rule Engine (deterministic) handles all BOQ physical aspect math evaluations. API keys enable Multimodal OCR, cloud NotebookLM RAG verification, and Agentic Guardrail loops with zero-downtime auto-rotation.

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
|---|---|
| `npm run dev` | Start Express backend server on configured PORT |
| `npm run dashboard` | Start Express backend, Vite frontend dev server, and feedback listener concurrently |
| `npm run build` | Build production dashboard assets via Vite |
| `npm run lint` | Run `oxlint` on dashboard source files (0-warning, 0-error gate) |
| `npm test` | Run portfolio verification audit (`verify_all.js`) across 7 products |
| `npm run status` | Display unified observability dashboard overview (`observability_status.js`) |
| `npm run status:sync` | Re-sync live portfolio state and generate `.agents/PORTFOLIO_STATUS.md` |
| `npm run test:all` | Run complete regression matrix across 50+ test suites (100% PASS) |
| `npm run test:aspect_units` | Run 7 modular physical hardware aspect unit checkers |
| `npm run test:preprocessor` | Run BOQ preprocessor, CTO normalizer, and boundary fuzzing suites |
| `npm run test:guardrail_prompts` | Run guardrail system prompt factory and query sanitizer tests |
| `npm run test:notebook_job_diagnostics` | Run async query job manager, failure diagnosis, and drift tests |
| `npm run test:schemas` | Run Zod runtime schema validators for data contracts |
| `npm run test:knowledge_extractor` | Run RAG closed-loop knowledge extraction and deduplication tests |
| `npm run test:dl380_combinations` | Run 8 comprehensive DL380 Gen12 combination and workflow tests |
| `npm run test:benchmarks` | Run 5-scenario BOQ evaluation benchmarks |
| `npm run test:data_validator` | Run catalog schema and price validator unit tests |
| `npm run test:error_envelope` | Run error envelope and wrapAsync unit tests |
| `npm run test:drift_inspector` | Run knowledge drift inspector unit tests |
| `npm run test:feedback_persister` | Run HITL feedback persistence and recovery unit tests |
| `npm run test:query_sanitizer` | Run NLP query sanitizer and prompt injection guard tests |
| `npm run test:eval_multi` | Run multi-configuration batch evaluator tests |
| `npm run test:jules_task_manager` | Run Jules task manager and GitHub REST client tests |
| `npm run eval:boq -- <file>` | Run CLI BOQ evaluator against a quote file |
| `npm run scrape` | Execute live OCA portal scrape via CDP |
| `npm run rebuild` | Rebuild all catalogs from raw_data |
| `npm run sync:knowledge` | Sync knowledge payloads to NotebookLM |
| `npm run update:graph` | Rebuild dynamic semantic dependency graph (`graphify`) |
| `npm run jules:prs` | Inspect open pull requests on GitHub via native REST API |
| `npm run jules:prune` | Prune merged remote feature branches from GitHub |
| `npm run jules:archive` | Audit and archive completed Jules sessions |

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

## 5. UI/UX & Coding Standards
- **Styling (Taste Skill)**: Enforce the `design-taste-frontend` rules. Use strictly Tailwind utility classes with Geist font and Emerald Green (`#01A781`) / Slate high-contrast palettes. No generic "AI slop" gradients or heavy pure-black drop shadows.
- **Accessibility**: Ensure high contrast, proper modal closures (Escape key/backdrop clicks), and no orphaned click handlers.
- **Agent Knowledge Policy (Token Optimization)**: Before attempting to read or parse codebases, AI Agents MUST consult the dynamic semantic graph by running `/graphify query "<question>"`. To dynamically explore file paths and trace dependencies, use the `graphify` skill rather than brute-force `grep` or `ls -R`.
- **React Hooks**: All hooks must be called unconditionally before any early returns. Use `useRef` for values needed inside closures without triggering re-renders.

---

## 6. Testing & Benchmarking

### Test Suite Overview
| Suite | Command | Assertions / Coverage | Description |
|---|---|---|---|
| Aspect Math | `npm run test:aspect_units` | 34 | 7 physical hardware math checkers (compute, memory, storage, pcie, power, chassis, support) |
| BOQ Benchmarks | `npm run test:benchmarks` | 5 scenarios | End-to-end BOQ evaluation with 100% recall/precision metrics |
| Portfolio Audit | `npm test` | 7 product lines | Validates all catalog outputs on disk against 7 guardrails |
| E2E Scenarios | `node tests/integration/test_end_to_end_scenarios.js` | Multi-scenario | Cross-product evaluation scenarios |
| Conflict Graph | `node tests/integration/test_conflict_graph.js` | Per-rule DAG | Conflict graph DAG and resolution matrix validation |
| Offline Mode | `node tests/chaos/test_offline_pipeline.js` | Full fallback | Verifies graceful degradation without external APIs |
| Edge Cases | `node tests/chaos/test_edge_cases.js` | Boundary | Boundary condition and malformed BOM coverage |
| Complete Matrix | `npm run test:all` | 50+ test suites | Full automated regression across all 4 testing tiers |

### Adversarial Red-Teaming
Run `node scripts/evaluators/adversarial_agent.js` to execute an adversarial red-team pass. This stress-tests the evaluator with intentionally malformed or conflicting BOQs and logs results to `pipeline_telemetry.json`.

---

## 7. Project Architecture & Consolidated References

For detailed architecture documentation, see:
- [DIRECTORY_STRUCTURE.md](file:///home/vinodh/vendorNotebookSolution/docs/DIRECTORY_STRUCTURE.md) — Comprehensive canonical directory and subsystem layout
- [ARCHITECTURE_AND_DESIGN.md](file:///home/vinodh/vendorNotebookSolution/docs/ARCHITECTURE_AND_DESIGN.md) — Core architecture, Dual-Brain paradigm, Mermaid diagrams
- [WORKFLOWS_AND_LEARNINGS.md](file:///home/vinodh/vendorNotebookSolution/docs/WORKFLOWS_AND_LEARNINGS.md) — E2E pipelines, Agentic Guardrail loops, 28 comprehensive learnings
- [DATA_DICTIONARY.md](file:///home/vinodh/vendorNotebookSolution/.agents/DATA_DICTIONARY.md) — JSON schemas and data contracts

---

## 8. Debugging Playbook — Known Gotchas & Diagnostic Commands

The following are the 7 invariants most likely to be accidentally broken by future changes. Use these commands to quickly verify the system is healthy after any modification to the scraping pipeline.

### DX-1: Verify Price Trail Has No Same-Day Duplicates
```bash
node -e "
const h = require('./outputs/ProLiant/Gen12/DL380_Gen12_SFF/history/price_history.json');
let bad = 0;
for (const [k, trail] of Object.entries(h)) {
  const seen = {};
  for (const t of trail) { seen[t.date] = (seen[t.date] || 0) + 1; }
  if (Object.values(seen).some(v => v > 1)) { console.log('DUPLICATE:', k, seen); bad++; }
}
console.log(bad === 0 ? '✅ No same-day duplicates' : '❌ ' + bad + ' SKUs have same-day duplicates');
"
```
**Expected**: `✅ No same-day duplicates`. If any SKU shows two entries for the same date, `appendTrailEvent` in `scripts/lib/catalog/diff_catalog.js` is deduplicating by `(date AND status)` instead of `date` only — that's INV-1 regression.

### DX-2: Verify SKU Count in Registry is Real (Not DOM Table Count)
```bash
node -e "
const fs = require('fs');
const cat = JSON.parse(fs.readFileSync('./outputs/ProLiant/Gen12/DL380_Gen12_SFF/DL380_Gen12_SFF_Catalog.json'));
console.log('catalog.json totalUniqueSKUs:', cat.metadata.totalUniqueSKUs);
const md = fs.readFileSync('./outputs/SCRAPED_CATALOGS.md', 'utf-8');
const match = md.match(/DL380_Gen12_SFF.*?\|(\d+)/);
console.log('SCRAPED_CATALOGS.md SKU count:', match ? match[1] : 'Not found');
console.log(parseInt(match?.[1]) > 200 ? '✅ Count looks real' : '❌ Count looks like DOM table count (~124)');
"
```
**Expected**: `totalUniqueSKUs` > 200. If SCRAPED_CATALOGS.md shows ~124, Step 9 of `scripts/scrapers/scrape_oca_solution.js` is passing `tables.length` instead of reading `liveCatalogJson.metadata.totalUniqueSKUs` — that's INV-2 regression.

### DX-3: Verify Stage Stepper Has minPercent/maxPercent
```bash
grep -c "minPercent" dashboard/src/components/stepper/StepStageCard.jsx
grep -c "currentStageId" dashboard/src/components/stepper/StepStageCard.jsx
```
**Expected**: Both > 0. If 0, the stage stepper has been reverted to `idx * 16` bucket math — that's INV-3 regression.

### DX-4: Verify master_knowledge_registry.json has generatedAt
```bash
node -e "
const r = require('./outputs/history/master_knowledge_registry.json');
console.log('generatedAt:', r.generatedAt);
console.log('schemaVersion:', r.schemaVersion);
console.log('productFamiliesSynced:', r.productFamiliesSynced);
console.log(r.generatedAt ? '✅ OK' : '❌ generatedAt missing — INV-4 regression');
"
```

### DX-5: Verify Step 10 Failure Propagates (Not Silent Warn)
```bash
grep -n "console.warn" scripts/scrapers/scrape_oca_solution.js | grep -i "sync_all"
grep -n "throw new Error" scripts/scrapers/scrape_oca_solution.js | grep -i "sync_all"
```
**Expected**: First grep returns 0 lines; second grep returns 1 line. If the second is 0, that's INV-5 regression.

### DX-6: Verify scrapeDate is YYYY-MM-DD (Not Full ISO)
```bash
node -e "
const fs = require('fs');
const cat = JSON.parse(fs.readFileSync('./outputs/ProLiant/Gen12/DL380_Gen12_SFF/DL380_Gen12_SFF_Catalog.json'));
const d = cat.metadata.scrapeDate;
console.log('scrapeDate:', d);
console.log(/^\d{4}-\d{2}-\d{2}$/.test(d) ? '✅ YYYY-MM-DD format' : '❌ Not YYYY-MM-DD — INV-6 regression');
const h = require('fs').readdirSync('./outputs/ProLiant/Gen12/DL380_Gen12_SFF/history');
const bad = h.filter(f => /^catalog_\d{4}-\d{2}-\d{2}T/.test(f));
console.log(bad.length === 0 ? '✅ No ISO-timestamp snapshots' : '❌ ' + bad.length + ' ISO-timestamp snapshots found (INV-6 regression)');
"
```

### DX-7: Verify outputs/history/ Has No Test Payloads
```bash
ls outputs/history/notebook_sync_payload_edge-test-* 2>/dev/null | wc -l
ls outputs/history/notebook_sync_payload_hpe-chaos-test-* 2>/dev/null | wc -l
# Both should output: 0
# If not, run cleanup:
node -e "require('./scripts/lib/sync/post_flow_sync.js').cleanTestPayloads()"
```

### Quick Full Health Check
Run all diagnostics and test suites in sequence:
```bash
npm test && npm run test:all && npm run status
```
**Expected**: All 3 pass cleanly with 100% compliance and zero warnings.
