# GEMINI.md — Gemini LLM & MCP Integration Guidelines

## 1. Dual-Brain Verification Pattern
- **NotebookLM (Grounding Brain)**: Queries official QuickSpecs source documents.
- **Gemini LLM (Intent & Verification Brain)**: Verifies workload DNA (via MCP tools) and handles the autonomous Guardrail Loop (`agentic_guardrail.js`).
- **Gemini Vision OCR**: Extracts structured tabular SKU entries from quotes via `gemini-2.5-flash`.

## 2. API & Rate Limit Handling (Critical)
- **Model Versions**: Use `gemini-2.5-flash` or `gemini-3.5-flash` for agentic loops. Avoid `gemini-3.6-flash` or `1.5-flash` due to availability/rate limits we have encountered.
- **Rate Limit Resilience (HTTP 429)**: The `agentic_guardrail.js` implements automatic exponential backoff/sleep for 429 errors. Agentic flows MUST catch API errors gracefully.
- **Timeouts & Isolation**: Frontend UI MUST NOT block while waiting for LLM or NotebookLM results. Background processing is mandated.

## 3. Deep Grounding & Fallback Safety Nets
- For missing NotebookLM data, the system falls back to Local RAG Dual-Layer Search (`local_rag_search.js`).
- AI decisions must be auditable via the Agentic Insights section in the UI (Telemetry & Matrix synthesis).
