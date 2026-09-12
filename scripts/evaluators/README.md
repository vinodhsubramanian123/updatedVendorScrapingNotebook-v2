# Evaluator Subsystem (`scripts/evaluators/`)

## 1. Purpose & Scope
Houses the 7-aspect physical pre-check math kernels, batch BOQ processors, strategy matrix synthesizers, presales intent query routers, and agentic evaluation runners.

## 2. Key Modules & Scripts
| Script | Entrypoint / Function | Description |
|---|---|---|
| `eval_boq.js` | `evaluateBoq(filePath, chassisId)` | Main CLI runner for customer quotes and BOMs against catalog rules, with circuit breakers and Section 3.5 value engineering reports. |
| `route_query.js` | `routePresalesQuery(text, payload)` | Deterministic single-user presales query router classifying queries into Freeform Q&A, RFP Sizing, BOQ Evaluation, BOM Reconciliation, or Catalog Intelligence (`INV-78`). |
| `eval_multi_boq.js` | `evaluateMultiBoq()` | Evaluates multi-chassis batch customer proposals and splits by chassis type. |
| `agentic_eval.js` | `runAgenticEval()` | Dual-brain evaluation using MCP tools and Gemini verification loop. |
| `adversarial_agent.js` | `runChaosSuite()` | Adversarial red-teaming and boundary fuzzing agent. |

## 3. Evaluation Pipeline Stages
1. **Preprocessor & SKU Sanitization**: Filters invalid tokens, normalizes CTO variants, clusters multi-server configs.
2. **Deterministic Physical Math**: Evaluates 7 hardware aspects (Compute/Thermal, Memory Channels, Storage Tri-Mode, PCIe Risers, Power & Environment, Networking OCP, Support & Manufacturing).
3. **Conflict Graph Resolution**: Identifies missing dependencies, mutually exclusive SKUs, and topology violations.
4. **Least-Delta Synthesis**: Prunes troublesome SKUs and synthesizes Rank 1L/1M minimal-mutation options (`INV-74`).
5. **5-Tier Strategy Synthesis**: Builds Rank 1 (Intent Preserved) through Rank 5 (Budget Optimized) alternatives.
6. **Value Engineering & Decision Ledger**: Analyzes commercial optimization opportunities (`deal_optimizer.js`) and logs auditable traces to `outputs/history/decision_traces.json`.
7. **Telemetry & Ledger Recording**: Logs structured execution steps to `outputs/history/telemetry/pipeline_telemetry.json`.
