# GEMINI.md — Gemini LLM & MCP Integration Guidelines

## 1. Dual-Brain Verification Pattern
- **NotebookLM (Grounding Brain)**: Queries official QuickSpecs source documents.
- **Gemini LLM (Intent & Verification Brain)**: Verifies workload DNA (via MCP tools) and handles the autonomous Guardrail Loop (`agentic_guardrail.js`).
- **Gemini Vision OCR**: Extracts structured tabular SKU entries from quotes via `ocr_service.js` with automated key rotation.

## 2. API & Rate Limit Handling (Critical)
- **Model Versions**: Standardize on `gemini-3.5-flash` (or `gemini-2.5-flash-lite` / `gemini-3.7-flash`).
- **Smart FIFO Key Rotation & Quota Management**: `gemini_rotator.js` manages all configured keys in a deterministic FIFO queue. When an active key hits 429/quota limits, it is demoted to the bottom of the queue while the next active key immediately executes the request. Keys automatically restore on UTC day rollover.
- **Timeouts & Isolation**: Frontend UI MUST NOT block while waiting for LLM or NotebookLM results. Background processing is mandated.

## 3. Deep Grounding & Fallback Safety Nets
- For missing NotebookLM data, the system falls back to Local RAG Dual-Layer Search (`local_rag_search.js`).
- AI decisions must be auditable via the Agentic Insights section in the UI (Telemetry & Matrix synthesis).

## 4. Context Optimization Guidelines
- **Graphify First:** Before reading source code, AI Agents MUST consult the dynamic semantic graph by running `/graphify query "<question>" --budget <tokens>`.
- **Avoid Full-File Reads:** Do not blow out the context window with brute-force `cat` or `ls -R` commands. Use Graphify to target the specific community or node of interest.
