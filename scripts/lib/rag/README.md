# Local RAG & Agentic Guardrails (`scripts/lib/rag/`)

## 1. Purpose & Scope
Implements dual-brain offline search fallbacks and the autonomous agentic MCP guardrail evaluation loop.

## 2. Key Modules & Functions
| Module | Main Exports | Purpose |
|---|---|---|
| `local_rag_search.js` | `searchLocalRag()`, `rankRagCandidates()` | Dual-layer local BM25 + semantic embedding fallback search when NotebookLM is offline or rate-limited. |
| `agentic_guardrail.js` | `runGuardrailLoop()` | Multi-step agentic LLM reasoning loop that verifies edge-case rules against MCP knowledge tools. |

## 3. Dual-Brain Principles
- The frontend UI MUST NOT block while waiting for LLM or cloud RAG.
- If NotebookLM API returns 429/timeout, the engine automatically falls back to `local_rag_search.js` with zero user disruption.
