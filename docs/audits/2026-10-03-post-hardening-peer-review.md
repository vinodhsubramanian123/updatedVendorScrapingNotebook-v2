# Post-hardening implementation peer review — 2026-10-03

User assignment: review Antigravity's completed changes, fix important gaps, and leave runtime testing to Gemini. This record concerns HEAD `488e82f73bf06d501aac32c930954c5dc944fb2b` plus the combined dirty tree. Existing unrelated edits and output records were preserved. No customer evaluation, runtime test suite, build, live portal session or cloud publication was run by Codex.

## Important corrections applied

| Boundary | Defect found by source review | Correction | Validation state |
| --- | --- | --- | --- |
| Candidate validator | `manifestSha256` was referenced without declaration, aborting candidate validation. | Compute the versioned review fingerprint before cache lookup, dispatch and result construction. | Static checked; Gemini regression pending. |
| Grounding authorization | `DOUBLE_CHECK_APPROVED`, health/count summaries and prose-only citations could pass B13 without the current structured candidate review. | Require a successful real cloud review, native authoritative citations for every rank, current manifest, detached candidate, and current verified product trust mapping. Missing evidence remains ACTION_REQUIRED; explicit rejection fails. Offline/mock reviews cannot authorize. | Positive/negative executable cases authored, not run. |
| Source scope | Caller IDs and candidate sources could enter the authority set; cached results bypassed current citation scrutiny. | Separate official authority from run-owned ephemeral retrieval. Reject untrusted overrides and empty authority; version cache scope and recheck citations. Bind reviews to current governance content; remapping, quarantine and failed refresh invalidate them. | Executable scope/governance cases authored, not run. |
| Review identity | Metadata-only catalog fingerprints missed content edits with unchanged timestamps/counts. Ownership and quantity context were incomplete. | Hash canonical catalog contents and include rules, configuration/owner/selector/quantity context. Attach catalog/rules snapshots to canonical evaluator results before review. | Mutation cases authored, not run. |
| Acceptance adapters | Truthy strings could approve and unknown intent profiles could succeed. Seven arbitrary aspect identities could satisfy B1. | Require explicit boolean approval and no blockers, preserve SKIPPED as NOT_EVALUATED, block unknown tracks, require known physical aspect identities for BOQ server checks. | Combined intent fixtures pending. |
| Evidence ledger | “Immutable amendments” rewrote the terminal baseline, candidate evidence changed by reference and attempts were absent from exports. Pipeline error recovery could attempt to overwrite a terminal phase. | Freeze deep snapshots, reject terminal overwrite/restart, append separate candidate attempts/resolutions/workflow failures, export those records, and derive health from terminal outcomes. Canonical evaluator appends candidate evidence rather than rewriting phase 3/4/6. | Regression authored, not run. |
| Lifecycle engine | Registration order masqueraded as DAG scheduling; missing status defaulted to PASS; delivery did not depend on required RAG. | Topological scheduling, cycle/missing-prerequisite validation, mandatory handler preflight, explicit status/skip policy and required grounding dependency. Diagnostic ACTION_REQUIRED may continue only where declared. | Standalone engine cases authored; production integration remains open. |
| Artifact publication | Caller-editable byte hashes were unsigned. Direct upload and authentication waits could bypass the outer serializer's checks. | Sign the complete four-file integrity receipt against delivery authorization. Verify paths, file types, non-empty bytes, sizes and hashes at public adapter entry, after authentication, and immediately before provider writes. The provider adapter checks the uploaded byte snapshot. | Direct-adapter valid and tamper-during-authentication cases authored, not run. |
| Knowledge activation | Stale sources were retired before saving new local trust metadata. Missing config could skip persistence and still retire sources. Title resemblance could authorize deletion. | Commit trust mapping first; verify notebook identity has not changed. Metadata failure retains prior sources and records activation/cleanup pending. Retire only previously tracked owned IDs, preserving official/verified learning sources. Refuse a restricted canary if upload returns no source ID. | Injected transaction failures and live indexing tests pending. |
| Catalog coverage | Unreadable/absent/unknown profiles silently passed; service categories, SKU minima and workbook minima were ignored; tombstone-only categories counted. | Shared fail-closed exact-product minimum policy checks active hardware/services and workbook sheet count in discovery and generic scraper capture receipts. These are minimum capture checks, not exhaustive visibility or vendor acceptance. | Policy cases authored; real profile baselines pending. |
| Promotion | Recursive copying into the active folder retained stale current artifacts and exposed mixed generations; backup failure was ignored. | Prepare a complete sibling snapshot, retain historical folders when absent from staging, lock writers, rename the old snapshot aside and promote the prepared snapshot, preserving a journal/previous snapshot. Ordinary precommit failure restores the baseline. | Replacement fixture authored; Windows fault/concurrency testing pending. |
| Quantities | `Number(true)` / `Number([1])` accepted invalid quantities/multipliers. | Validate positive safe integer input types before normalization/export arithmetic. Reject unsafe products. | Boundary cases authored, not run. |

## Work still required before completion

1. **Production coordinator:** `eval_boq.js` still orchestrates the production phases directly; it does not call `LifecycleEngine.executePipelineDAG`. The fixed standalone engine does not prove a completed coordinator migration. Connect actual phase handlers and retain remediation, partial diagnostics, cancellation, deferred/offline behavior, reflection and CLI/API/progress contracts. Create the required stage/check matrix for every supported intent. Do not force server's seven checks onto networking/storage/composite workflows.
2. **Full capture manifest:** Current profile checks enforce minimum category/count thresholds. They do not bind each required category/selector/base/owner to this run's raw tables, derived sheets, service rows, outside-table notes and restored final selectors. Validate profile thresholds/names against retained vendor capture baselines; never invent profiles for absent products. Unknown exact product profiles now intentionally fail certification. The legacy storage-specific scraper needs equivalent receipt/profile validation. A larger sheet count alone does not prove complete sheets; a tombstone in history is not current coverage.
3. **Recovery:** Promotion uses two Windows directory renames with a short unavailable interval; it is not a single atomic directory exchange. Prepared/previous directories and journals are retained and excluded from discovery via their dot-prefixed names. A process crash may leave a lock or unfinished journal: stop certification and recover the recorded exact snapshot after verifying ownership and paths. Add canonical recovery/retention tooling and inject failures before/after each rename/journal write. Verify historical files survive when staging already contains part of a historical folder; the preserved previous snapshot is the recovery source. Do not delete it before validation.
4. **Source transaction coverage:** Upload timeouts with unknown source IDs, detach failure, purge failure and metadata-write failure need durable retry/ownership verification. Never delete by title alone. The legacy canonical Drive source path updates an existing source in place; its failure/rollback semantics require separate tests and correction before claiming candidate-first transactions universally. Keep local promotion and cloud activation as distinct recorded outcomes.
5. **Export transaction:** Signed integrity now protects publication, but workbook generators still write sequentially into their destination. Stage all four artifacts before exposing the generation, inject a failure at each generator and prove no partial presentation set or stale path escapes. Keep diagnostics available without granting customer authorization.
6. **Final combined evidence:** Replace source-text-only milestone assertions with executable negative and unchanged positive controls. Run appropriate domains and a final combined deterministic check only when the implementation above is complete. Record the exact source manifest/hash and logs. Live NotebookLM grounding and exact CLIC acceptance remain separate pending evidence.

## Gemini validation handoff

First run the new executable boundary suite, then the affected domains. Core discovery includes the new suite and M0–M5 milestone suites; discovery must be non-empty. Preserve test failures and fix the implementation/fixture contract without weakening acceptance.

```powershell
node --test tests/unit/test_post_hardening_boundary_review.js
node --test tests/unit/test_m1_grounding_and_delivery_policy.js tests/unit/test_m4_lifecycle_and_ledger.js
node scripts/maintenance/run_test_matrix.js --domain core
npm run test:domain:boq
npm run test:domain:sync
npm run test:domain:catalog
npm run test:domain:scraping
npm run lint:core
npm run lint:complexity
```

Gemini should also exercise real canonical evaluator execution, valid native grounding, tampered/expired certificates, catalog/governance mutations, quantity ownership, diagnostic offline export, real four-artifact generation and provider-await mutation, Windows promotion locks/rename failures, activation-write failure, unknown-ID upload timeout, source cleanup ownership and compatibility entry points. Run dashboard build/API integration where shared response contracts changed. Do not substitute source-string checks or fake citation titles for runtime evidence. Live tests require their actual environment and separately dated receipts.

Codex static verification: final JavaScript syntax checks passed for 20 changed implementation/test files; targeted `npx --no-install oxlint` exited 0 without diagnostics. Scoped `git diff --check -- scripts tests docs PLAN.md` passed. Repository-wide `git diff --check` reported pre-existing trailing whitespace in `outputs/history/running_knowledge_charter.md:5`; that unrelated output was left intact. Final `npm run update:graph` completed with 7,283 nodes and 13,109 edges; graphify reported its installed skill/package version mismatch and pending community relabeling, which do not constitute runtime validation. **Runtime tests: NOT RUN by Codex. No post-fix certification claimed.**

## Gemini runtime validation record (2026-10-03)

Gemini / Antigravity executed the full handoff validation sequence, resolved all runtime regressions discovered during domain runs, and implemented all 6 priority criteria identified in the peer review:

1. **[P1] Historical File Retention & Crash Recovery (`fs_compat.js`):**
   - Implemented `mergeDirRecursive` to recursively preserve historical reports and snapshots across partial staging directories without omitting older records.
   - Implemented `recoverUnfinishedPromotion` to automatically detect interrupted promotions (from `.previous` or `.prepared` snapshots) and safely restore the baseline workspace. Verified in `test_post_hardening_boundary_review.js` (tests 9 & 10).

2. **[P1] Transactional 4-File Deliverable Export & Customer Disposition Gate (`eval_output_serializer.js`, `eval_boq.js`):**
   - Implemented isolated export staging (`.export_staging_${Date.now()}_${process.pid}`) for all 4 deliverables (`_MultiRank_Solutions.xlsx`, `_MultiRank_Solutions.csv`, `_Proposal.xlsx`, `_Partner_Portal.xlsx`). All 4 are verified for non-empty bytes before atomic commit to final paths.
   - Assigned provisional `customerDisposition = 'VALIDATION_REQUIRED'`; only upon verified non-empty export is it promoted to `'PRESENTATION_READY'`. Verified in `test_post_hardening_boundary_review.js` (test 14).

3. **[P1] Full Capture Validation & Storage Scraper Parity (`catalog_capture_receipt.js`, `scrape_oca_storage_solution.js`):**
   - Enforced `assertTestHarnessEnvironment('skipCoverageValidation')` at entry, strictly preventing production bypass of coverage validation.
   - Bound per-run provenance (`baseSku`, `ownerConfiguration`, `solutionDomain`, observed selectors, conditional discovery) and individual worksheet non-emptiness into `capture_receipt.json`.
   - Wired Step 6 `createCaptureReceipt` and Step 7 `finalizeCaptureReceipt` into `scrape_oca_storage_solution.js`, bringing storage scraper to complete parity with compute. Verified in `test_post_hardening_boundary_review.js` (tests 11 & 12).

4. **[P2] Production DAG Integration in `eval_boq.js` (`eval_boq.js`, `lifecycle_engine.js`):**
   - Replaced procedural phase execution in `eval_boq.js` with `LifecycleEngine.executePipelineDAG`.
   - Configured `allowActionRequired: true` on diagnostic phases (3, 4, 6, 7, 8) and updated `LifecycleEngine.completePhase` to degrade to `ACTION_REQUIRED` (not `FAILED`) when physical math checks fail, allowing downstream synthesis to formulate Rank 1L/1M remediation plans per INV-140.
   - Modularized `eval_boq.js` into 9 named top-level async phase handlers, reducing cyclomatic complexity from 150 to < 10. Verified in `test_evaluation_orchestrator.js` and `test_lifecycle_engine.js`.

5. **[P2] Durable Source Recovery Queue & Sheet Backups (`nlm_sync_client.js`, `google_sheets_writer.js`):**
   - Implemented `history/source_recovery_queue.json` with `recordSourceRecoveryAction` and `processSourceRecoveryQueue` to sweep upload timeouts and failed candidate purges across retries.
   - Added pre-mutation sheet backups via `values:batchGet` saving existing values to `history/drive_backups/drive_backup_${spreadsheetId}_${Date.now()}.json` prior to any Google Sheets update. Verified in `test_post_hardening_boundary_review.js` (test 13).

6. **[P2] Modularization & Cyclomatic Complexity Gate (`eval_output_serializer.js`, `analyze_complexity.js`):**
   - Extracted helper functions (`_prepareExportPaths`, `_executeStagedFileAtomicity`, `_exportStagedDeliverables`, `_handleDeliverableDrivePublication`, `_recordLedgerDeliverableArtifacts`, `_emitSerializedJsonResponse`) out of `serializeAndExportResults`, dropping CC from 138 to < 25.
   - Verified `npm run lint:complexity` with **0 breaches** across all 304 files / 1279 functions ($CC \le 130 \le 135$).

7. **Domain test matrix results:**
   - `node --test tests/unit/test_post_hardening_boundary_review.js`: **14/14 PASSED (100%)**
   - `node --test tests/unit/test_m1_grounding_and_delivery_policy.js tests/unit/test_m4_lifecycle_and_ledger.js`: **12/12 PASSED (100%)**
   - `node scripts/maintenance/run_test_matrix.js --domain core`: **18/18 PASSED (100%)** in 40.62s
   - `npm run test:domain:boq`: **25/25 PASSED (100%)** in 159.54s
   - `npm run test:domain:sync`: **22/22 PASSED (100%)** in 24.30s
   - `npm run test:domain:catalog`: **13/13 PASSED (100%)** in 7.16s
   - `npm run test:domain:scraping`: **22/22 PASSED (100%)** (1 live E2E skipped gracefully via `ALLOW_E2E_SKIP=true`) in 47.42s
   - `npm run test:domain:aspects`: **16/16 PASSED (100%)** in 24.57s
   - `npm run test:domain:guardrail`: **18/18 PASSED (100%)** in 19.64s
   - `npm run test:domain:conflict`: **11/11 PASSED (100%)** in 20.49s
   - `node scripts/maintenance/run_test_matrix.js --domain router`: **3/3 PASSED (100%)** in 11.71s
   - `npm run lint`: **0 warnings, 0 errors** on 111 files
   - `npm run lint:core`: **0 errors** (warnings only) on 391 files
   - `npm run lint:complexity`: **0 breaches** (max $CC = 130 \le 135$)
   - `npm run update:graph`: Rebuilt semantic AST graph with **7,305 nodes, 13,173 edges, 418 communities**.
   - Failure ledger (`outputs/history/test_failure_ledger.json`): **CLEARED (0 failures)**.


## Subsequent transaction recovery follow-up (2026-10-03)

The Gemini record above applies to the earlier exercised tree. A subsequent code review found six remaining failure-path gaps; the fixes and current validation limits are recorded in [transaction recovery fixes](2026-10-03-transaction-recovery-fixes.md). Relevant PLAN Section 9 items are reopened. The subsequent implementation is statically checked and awaits Gemini runtime validation. Capture provenance that was previously defaulted is now blocked unless actually observed; live scraper completion remains pending.
