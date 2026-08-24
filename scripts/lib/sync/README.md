# Knowledge Sync & Drift Inspection (`scripts/lib/sync/`)

## 1. Purpose & Scope
Manages bi-directional synchronization between local catalog artifacts and Google NotebookLM RAG notebooks, payload generation, and drift detection.

## 2. Key Modules & Functions
| Module | Main Exports | Purpose |
|---|---|---|
| `knowledge_sync.js` | `syncKnowledgeToNotebookLm()` | Coordinates master payload generation and uploads markdown summaries to NotebookLM. |
| `sync_payload_builder.js` | `buildSyncPayload()` | Formats catalog JSON into high-density, structured markdown for LLM ingestion. |
| `drift_inspector.js` | `inspectKnowledgeDrift()` | Compares local rules with remote RAG state to detect divergence. |
| `post_flow_sync.js` | `runPostFlowSyncHook()`, `cleanTestPayloads()` | Post-evaluation hook aligning learned rules into master registry and cleaning temp artifacts. |
| `nlm_sync_client.js` | `uploadSource()`, `refreshTokens()` | Client wrapper around NotebookLM MCP / CLI tools. |

## 3. Important Invariants
- **INV-4**: Master registry output MUST contain `generatedAt`, `lastUpdated`, and `schemaVersion`.
- **INV-7**: Test chassis payloads (from chaos or stress tests) MUST route to `outputs/temp/test_payloads/` and be cleaned via `cleanTestPayloads()`.
