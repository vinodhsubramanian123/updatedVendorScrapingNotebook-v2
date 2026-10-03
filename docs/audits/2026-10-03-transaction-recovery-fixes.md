# Transaction and recovery follow-up — 2026-10-03

This follow-up supersedes completion claims for the six affected boundaries in `PLAN.md` Section 9 and the earlier post-hardening audit. Earlier Gemini results remain historical evidence for the tree Gemini exercised; they do not certify these subsequent edits. Codex made no commit and did not run runtime tests, builds, cloud writes or live portal operations. The existing Antigravity working tree was preserved.

## Changes and remaining evidence

1. **Four-artifact export:** `scripts/lib/boq/eval_output_serializer.js` validates four distinct non-empty artifacts and publishes their immutable sibling generation with one directory rename. It preserves older complete generations, signs the new manifest and publishes pointers only after success. It no longer removes/replaces final artifacts one file at a time. A generation published before a later signing failure remains an unpublished diagnostic; retries use another generation.
2. **Promotion recovery:** `scripts/lib/system/fs_compat.js` uses owner-aware workflow leases and invokes recovery in production before preparing another promotion. Recovery validates exact journal/target/prepared/backup identities and rejects symlinks, escaped paths and ambiguous states. It restores a backup even when the persisted journal still says PREPARED, handles an interrupted first capture and retains uncommitted snapshots. Promotion failures after directory publication restore the old baseline. Legacy empty locks and acquisition claim files fail closed and require verified owner recovery; no active lock is forcibly deleted.
3. **DAG warnings:** `scripts/lib/lifecycle/lifecycle_engine.js` allows WARNED prerequisites to continue only when the phase explicitly permits warnings or diagnostic action-required continuation. The canonical diagnostic phases therefore reach remediation/grounding/finalization without converting warnings into PASS. Strict prerequisites still block.
4. **Capture evidence:** `scripts/lib/catalog/catalog_capture_receipt.js` requires explicit raw base/owner, scoped domain, observed selectors and final selector restoration. A metadata/profile-derived chassis selection is not substituted for observed base evidence. Header-only worksheets and All SKUs sheets missing service SKUs are rejected. Fixture coverage bypass requires the actual test entry point or Node test context, produces DIAGNOSTIC_CAPTURE and preserves that distinction on finalization.
   **Operational consequence:** the current generic and storage raw capture producers do not yet supply all required observed owner/selector/restoration fields. Such captures are blocked before live promotion. Antigravity must collect actual portal evidence through the live capture procedure and verify the positive path; fabricated defaults or a test-only bypass must not be used to restore production passage. This is pending live evidence, not a claim of complete scraper certification.
5. **Notebook candidate cleanup:** `scripts/lib/sync/nlm_sync_client.js` writes the queue atomically under `outputs/history/source_recovery_queue.json`, serializes queue updates, quarantines corrupt queues and propagates persistence errors. It persists an attempt before upload, records pre-upload IDs and a unique attempt title, resolves unknown timeout IDs only from a unique new inventory match, rechecks current product mapping and every protected source in that notebook, and verifies deletion by inventory readback. Ambiguous or unowned legacy candidates remain pending. Candidate failure updates the existing attempt rather than creating duplicate cleanup records. Config injection follows the canonical sync configuration path.
6. **Google Sheet replacement:** `scripts/lib/sync/google_sheets_writer.js` serializes writes per spreadsheet, requires a complete durable pre-write snapshot and retains `userEnteredValue`, including formulas. A failed write/readback triggers restoration of prior values/grid dimensions and removal of newly added managed tabs. Snapshot readback determines rollback verification. The durable backup records RESTORED or RECOVERY_REQUIRED; a failed rollback remains an explicit recovery task. This covers entered values and the grid properties changed by this writer, not unrelated formatting or simultaneous external human edits.

## Gemini validation handoff — NOT RUN by Codex

New executable regressions: `tests/unit/test_post_hardening_failure_transactions.js`. Existing boundary fixtures in `tests/unit/test_post_hardening_boundary_review.js` now supply genuine scoped ownership for mock cleanup and explicitly remove Node test context when exercising the production bypass rejection.

Run against the pinned final combined working tree:

```text
node --test tests/unit/test_post_hardening_failure_transactions.js tests/unit/test_post_hardening_boundary_review.js
npm run test:core-contract
npm run test:domain:boq
npm run test:domain:catalog
npm run test:domain:scraping
npm run test:domain:sync
npm run lint:core
npm run lint:complexity
```

Gemini must additionally exercise production promotion recovery, failure during COMMITTED journal persistence, first-capture recovery, protected/ambiguous source cleanup, durable queue write failures, successful Sheet replacement and provider write/readback/rollback failures. Keep valid controls alongside rejection cases. Record commands, suite/assertion counts, exit codes and exact revision/dirty-tree evidence. Live capture/cloud validation requires separate dated native evidence. No prior receipt becomes fresh because these changes exist.

Codex static checks: JavaScript syntax checks passed for all eight changed implementation/test files. Targeted `npx --no-install oxlint` passed without diagnostics (exit 0). `git diff --check -- scripts tests docs PLAN.md` passed (exit 0). `npm run update:graph` completed (exit 0): 7,349 nodes, 13,293 edges, 415 communities; its subsequent refresh detected no topology changes. Graphify reported the installed skill/package version mismatch and pending community label refresh; these are tooling notices and provide no runtime certification. Runtime validation remains pending with Gemini.
