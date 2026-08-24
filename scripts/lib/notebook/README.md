# Gemini NotebookLM RAG Subsystem (`scripts/lib/notebook/`)

## 1. Purpose & Scope
Provides integration with Gemini NotebookLM for deep RAG grounded queries, NLP rule extraction from verified answers, query sanitization, and async job execution.

## 2. Key Modules & Functions
| Module | Main Exports | Purpose |
|---|---|---|
| `knowledge_extractor.js` | `extractKnowledgeDelta()` | Extracts structured hardware rules and delta constraints from natural language RAG responses. |
| `notebook_query_utils.js` | `queryNotebook()` | Primary interface for dispatching natural language queries to NotebookLM via MCP or CLI. |
| `query_sanitizer.js` | `sanitizeQuery()` | Strips sensitive customer data and formats queries for optimal token efficiency. |
| `query_diagnostics.js` | `diagnoseQueryHealth()` | Verifies NotebookLM token health, quota state, and source index readiness. |
| `job_manager.js` | `dispatchAsyncQuery()` | Manages background query polling and asynchronous job status. |

## 3. Data Contracts
Extracted knowledge deltas are mapped into `KnowledgeDelta` records with:
- `affectedSku`: Target part number
- `ruleType`: `MANDATORY_DEPENDENCY` | `MUTUAL_EXCLUSION` | `QUANTITY_LIMIT`
- `rationale`: Grounded citation from official QuickSpecs source
