# Human-in-the-Loop Feedback Engine (`scripts/lib/feedback/`)

## 1. Purpose & Scope
Captures human adjustments, approvals, and rejections from the UI dashboard and incorporates them into persistent knowledge deltas for continuous learning.

## 2. Key Modules & Functions
| Module | Main Exports | Purpose |
|---|---|---|
| `feedback_loop.js` | `recordFeedback()`, `applyDeltaLearning()` | Deduplicates and persists human feedback into `catalog_deltas.json` and master registry. |
| `feedback_queue.js` | `enqueueFeedback()`, `processFeedbackQueue()` | Asynchronous queue buffering user feedback submissions during heavy batch operations. |

## 3. Important Invariants
- **INV-13**: Feedback rules must be strictly deduplicated against existing `catalog_deltas.json` before persistence.
- Modifying rules must pass schema validation against Zod schemas in `scripts/lib/system/schemas.js`.
