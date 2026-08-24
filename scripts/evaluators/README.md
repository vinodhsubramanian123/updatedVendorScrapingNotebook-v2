# Evaluator Subsystem (`scripts/evaluators/`)

## 1. Purpose & Scope
Houses the 6-aspect physical pre-check math kernels, batch BOQ processors, strategy matrix synthesizers, and agentic evaluation runners.

## 2. Key Modules & Scripts
| Script | Entrypoint / Function | Description |
|---|---|---|
| `eval_boq.js` | `evaluateBoq(filePath, chassisId)` | Main CLI runner for customer quotes and BOMs against catalog rules. |
| `eval_multi_boq.js` | `evaluateMultiBoq()` | Evaluates multi-chassis batch customer proposals and splits by chassis type. |
| `agentic_eval.js` | `runAgenticEval()` | Dual-brain evaluation using MCP tools and Gemini verification loop. |
| `adversarial_agent.js` | `runChaosSuite()` | Adversarial red-teaming and boundary fuzzing agent. |

## 3. Evaluation Pipeline Stages
1. **Preprocessor & SKU Sanitization**: Filters invalid tokens, normalizes CTO variants, clusters multi-server configs.
2. **Deterministic Physical Math**: Evaluates 7 hardware aspects (Compute/Thermal, Memory Channels, Storage Tri-Mode, PCIe Risers, Power & Environment, Networking OCP, Support & Manufacturing).
3. **Conflict Graph Resolution**: Identifies missing dependencies, mutually exclusive SKUs, and topology violations.
4. **5-Tier Strategy Synthesis**: Builds Rank 1 (Intent Preserved) through Rank 5 (Budget Optimized) alternatives.
5. **Telemetry & Ledger Recording**: Logs structured execution steps to `outputs/history/telemetry/pipeline_telemetry.json`.
