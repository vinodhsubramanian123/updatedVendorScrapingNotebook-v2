# Human-in-the-Loop Feedback Engine (`scripts/lib/feedback/`)

## 1. Purpose & Scope
Captures human adjustments, approvals, and rejections from the UI dashboard and incorporates them into persistent knowledge deltas for continuous learning.

## 2. Key Modules & Functions
| Module | Main Exports | Purpose |
|---|---|---|
| `feedback_loop.js` | `classifyPortalError()`, `processPortalFeedback()` | Records portal observations in product-scoped quarantine and activates only complete evidence-backed human decisions. |
| `quarantined_deltas.js` | `validateKnowledgeDelta()`, `promoteQuarantinedDelta()` | Enforces SKU, provenance, scope, contradiction, confidence, decision-ledger, and semantic-dedup gates. |
| `feedback_queue.js` | `enqueueFeedback()`, `processFeedbackQueue()` | Asynchronous queue buffering user feedback submissions during heavy batch operations. |

## 3. Important Invariants
- **INV-13**: Feedback rules must be strictly deduplicated against existing `catalog_deltas.json` before persistence.
- **INV-70**: Labels such as `HUMAN_HITL` do not grant trust. Promotion requires a named reviewer, independent reasoning, explicit verification, trusted evidence, and exact product scope.
- Modifying rules must pass schema validation against Zod schemas in `scripts/lib/system/schemas.js`.
