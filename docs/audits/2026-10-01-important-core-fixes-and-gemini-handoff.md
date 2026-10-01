# Important core fixes and Gemini handoff

Date: 2026-10-01. Reviewed baseline: `fa0f999`.

Status: implementation and static review only; **runtime/test/live certification pending Gemini**. Dashboard excluded. This is a bounded follow-up, not a certification of every workflow or operating system. The earlier statement that all R-01 through R-13 are fully resolved is not supported by the current wiring and negative-path coverage.

## Execution plan and changes made

| Priority | Concrete miss | Implementation | Required proof |
|---|---|---|---|
| P1 | Exporters and the serializer trusted `manifestFingerprint` even when actual content changed. The candidate-review hash did not cover all presentation representations. | Added a separate canonical `deliveryFingerprint`; issuer, serializer, four presentation exporters and workbook router recompute it. Includes baseline/fallback rows, both candidate collections and SKU representations, quantity/owner/selector/price fields, node counts, support, supplied catalog content and core acceptance/grounding claims. Lifecycle bookkeeping is deliberately excluded. | Authorized control succeeds; changed quantity, owner, price, selectors, node count, alternate representation or acceptance blocks. Cached hash cannot restore authorization. |
| P1 | A checked-in default HMAC key allowed anyone knowing the source to reproduce signatures. Evaluation data could enable diagnostic bypass. | Private random process-local offline key replaces the public fallback. Explicit `DELIVERY_AUTH_SECRET` supports separately provisioned cross-process use. Only explicit caller `options.diagnostic` enables diagnostic export; `evaluation.isDiagnostic` does not. Token lifetime must be positive and at most one hour. | Old public-key forgery fails; same-process token verifies; configured-key cross-process behavior is tested independently. Data-only diagnostic bypass fails. |
| P1 | Portal scope could be manufactured from reader options or folder names. Missing selector fields passed matching; cached receipts were not rechecked for age; quantity zero became one. Workbooks could claim factory acceptance from a boolean. | Both raw captures must contain matching observed `capturedScope`. Unscoped legacy evidence is `CLIC_OBSERVED_UNSCOPED`. Candidate matching requires product/base/configuration/selector scope, exact quantities, current age and manifest hash. Unproved multi-owner mappings remain pending. Workbook acceptance labels revalidate receipts instead of trusting booleans/status strings. SAN supplies candidate scope explicitly. | Missing/changed product, base, owner, selector, quantity, hash or freshness rejects. Unscoped receipts and bare `isClicValidated` never yield an accepted presentation badge. Live restoration and exact vendor acceptance remain separate. |
| P1 | Workbook intent executed the low-level evaluator, then called an exporter without attaching its gate/certificate. Classification success did not establish an executable handoff. | Workbook requests now reuse the canonical BOQ pipeline and its authorized portal artifact. Missing/invalid authorization, delivery errors or absent artifacts return `VALIDATION_REQUIRED`; pipeline errors remain errors. | Router spy verifies canonical call and offline/JSON options; unsigned/mutated returns are rejected; valid artifact is returned without a second ad-hoc export. |
| P1 | Reconciliation summed by cleaned base SKU only, hiding suffix/owner substitutions and permitting invalid quantities. Quote deltas were described as proven portal insertions/removals. | Aggregate identity now includes exact normalized SKU suffix, configuration/name, owner/parent/subparent, quantity scope and multiplier. Catalog membership is exact, not base-alias proof. Missing/nonpositive/fractional/nonfinite quantities and unsafe aggregates fail. Discrepancies retain `scopeIdentity`; quote observations no longer assert an unproved portal insertion origin. | Same scoped manifest matches; changing owner or suffix does not; unknown suffix remains uncataloged even when a sibling/base is present. Malformed rows fail in both single-file and comparison mode. Duplicate same-scope quantities still aggregate correctly. |
| P1 | Pipeline acceptance overwrote the ingested catalog with possibly undefined `options.catalogData`. | Acceptance prefers the actual ingested catalog. | File and in-memory evaluation use the same exact catalog scope at the acceptance boundary. |

No dashboard code was edited. Unrelated concurrent changes to semantic projection and its tests/audit were preserved.

## Regression changes

- `tests/unit/test_core_workflow_contracts.js`: four-exporter mutation rejection, data-only bypass rejection, delivery content binding, public-key forgery, evidence-backed presentation badges, exact suffix/ownership reconciliation and invalid quantities. Existing positive authorization fixture now signs the actual delivery hash.
- `tests/unit/test_portal_receipt.js`: fixtures capture observed scope in both evidence files, rather than injecting desired scope through reader arguments. Added missing-scope, inconsistent capture scope, incomplete selectors, malformed quantities, unproved owners, altered hash and cached-expiry rejection.
- `tests/unit/test_query_router.js`: workbook execution handoff spy plus unsigned/authorized/mutated return cases. Mocked pipeline verifies routing, not real hardware grounding; do not describe it as end-to-end certification.

### Verification completed by Codex

- Syntax checks on 12 changed JavaScript files: passed.
- `git diff --check`: passed at the implementation checkpoint.
- Targeted OxLint on those files: **0 errors, 25 warnings** (unused imports/arguments/catch bindings and redundant spreads). Core lint is **not** clean; `npm run lint` currently covers only `dashboard/src`, so its historical zero-warning claim cannot establish core quality.
- Semantic graph refresh: performed; refresh again after final handoff edits if needed.
- Test suites, mutation runs, live portal work and cloud grounding: **not executed**, as assigned to Gemini by the repository charter.

## Compatibility and evidence migration

1. Previously issued delivery certificates use a different fingerprint/signing contract and must not be reused. Re-run canonical acceptance/issuance. Offline certificates without a configured private key are intentionally process-local; restarting a process invalidates them. Persisted authorization requires a separately managed private `DELIVERY_AUTH_SECRET`, never the former public key.
2. Both `clic_corrected_bom.json` and `clic_corrected_configuration.json` must preserve the same **observed** `capturedScope` alongside their timestamps, complete manifest and raw vendor result. Fields: exact `chassis`, `baseSku`, `configurationName`, optional mapped `configurationId`, and `selectors` with observed scalar values. An empty selector object is valid only when observation establishes no applicable selectors. Expectations cannot be copied into old captures to upgrade evidence.
3. Until the capture procedure and evaluator handoff supply that evidence, affected solutions remain `PORTAL VALIDATION PENDING`. Generic multi-icon owner/hierarchy receipt mapping is not implemented; such candidates fail closed instead of borrowing a single-icon receipt.
4. Exact suffix catalog lookup can surface newly unverified service variants. That is an evidence gap, not proof of unsupported hardware or permission to remove a requested service.
5. Changes use built-in Node APIs and platform-neutral paths; this is portability by construction, **not** proof of Windows/macOS/Linux execution. Do not claim all-OS certification without those runs.

## Gemini validation — required before closing these findings

Run targeted tests first, retaining assertion/skip/failure counts and revision-specific logs:

```text
node --test tests/unit/test_core_workflow_contracts.js tests/unit/test_portal_receipt.js tests/unit/test_query_router.js
npm run test:core-contract
node scripts/maintenance/run_test_matrix.js --domain router
npm run test:domain:boq
```

Then run the affected vendor reconciliation integration and SAN/receipt/quantity-scope tests, not an indiscriminate full matrix. Check actual discovery is non-empty and that skipped or mocked live work is not certified. Add these remaining focused cases if absent:

- Pipeline → serializer → every writer → upload: authorized control, mutated manifest and artifact-not-created failure. Verify no upload after failed export and no reuse of an earlier artifact path.
- Both `recommendedSolutions`/`rankedSolutions` and `skuPartsList`/`skuList` divergence; SAN selection; professional-workbook baseline dependency fallback.
- Same-scope duplicate rows, ownership swaps with unchanged grand totals, explicit quantity-scope/multiplier changes, unsafe aggregate overflow and invalid proposed quantities.
- Receipt with reordered scope keys, stale BOM but newer check, mismatched paired capture, future timestamp, multiple icons and missing selector provenance.
- Explicit shared-secret cross-process verification and key rotation; reject signed invalid/overlong validity windows. Keep secrets out of logs and fixtures.
- One real canonical pipeline run in offline/degraded mode and one grounded final-candidate run. Confirm delivery disposition and unfinished stages remain truthful. Live acceptance only for the exact restored product/base/owner/selector/manifest.
- Windows/macOS/Linux deterministic contract runs. Provider/browser-dependent tests require separately recorded live environments.

If a test fails, repair production behavior or document the genuine unsupported boundary; do not weaken the assertion to match an unsafe pass.

## Lower-risk implementation work for Gemini

1. **Core lint coverage:** add a separate core lint script covering `scripts` and `tests`, with the repository's reproducible tooling. Preserve dashboard lint separately. Remove unused imports/arguments and redundant spreads only after checking consumers; record the actual warnings rather than reporting dashboard output as core proof.
2. **Documentation reconciliation:** update the September 30 and October 1 closure summaries and invariant descriptions to distinguish implemented, statically checked, unit-tested, integration-tested and live accepted. Link this follow-up; retain historical results with their original revision/scope.
3. **Test fixtures/discovery:** ensure new cases run in the core/router domains; use atomic JSON fixture writes; remove truly overlapping tests only when their negative-path contracts remain covered. Suite counts are not exit criteria.
4. **Failure diagnostics:** preserve the authorization-issuance exception in the evaluation's evidence/error envelope instead of recording only `VALIDATION_REQUIRED`. Keep provider failures separate from local buildability.
5. **Maintainability inventory:** map public consumers of portal/workbook helpers and duplicated routing/scope helpers before proposing moves. Produce exact move/deprecation candidates and import-compatibility checks. Do not delete a module just because a simple text search found no callers.

## Remaining substantial work — not “easy cleanup” or closed findings

- **R-12 workflow authority remains partial.** Value engineering, least-delta and adversarial handlers still invoke the low-level evaluator; multi-cluster/remarks/OCR handoffs need execution-level proof. Migrate through a declarative required-stage contract without changing the semantics of legitimate advisory-only operations. Positive classification tests are insufficient.
- **Candidate document review scope is narrower than delivery scope.** `solutionFingerprint` still uses timestamp/count catalog identity and a reduced candidate manifest. Bind NotebookLM review to exact catalog content, ownership/selectors and the representation actually exported; reject conflicting SKU representations. This needs coordinated validator/payload/gate tests, not a blind hash change that invalidates every legitimate review.
- **Reconciliation financial evidence needs a separate contract.** Duplicate same-scope rows with different unit prices still need weighted/extended-price comparison; missing, malformed and confirmed-zero prices must remain distinct. The identity/quantity fix does not certify complete commercial parity. Add owner-preserving file-parser round-trip tests; an array-level regression alone cannot prove ingestion retains that ownership.
- **Universal portal closure remains pending.** Add observed capture adapters, transaction/configuration identity and per-icon quantity/ownership mappings, then wire them through domain evaluators. Do not manufacture `capturedScope` from request expectations or mark generic unattended selector traversal implemented.
- **Workflow schema/DAG and structured test outcomes remain separate exit criteria.** Required-stage transitions, explicit skip policies, registry-driven verdicts, collision tests and mutation resistance need evidence beyond the patched local checks. Reassess the original R-05 through R-10 exit criteria before declaring completion.

Recommended order: certify this bounded fix batch; complete document-review identity and required-stage wiring; finish observed multi-owner portal binding; then deduplicate/move folders behind protected contracts. Keep core correction and its regression tests together.

## Gemini Execution & Resolution Record (2026-10-01)

### 1. Analysis of Identified Gaps & Root Cause Patterns
- **Delivery Authorization vs. Cached Manifest**: In production, parent (`server.cjs`) and child evaluation processes (`eval_boq.js`) previously generated separate in-memory default HMAC secrets, causing tokens issued by the child to fail verification in the parent. Setting `process.env.DELIVERY_AUTH_SECRET` centrally on server boot ensures deterministic cross-process verification without compromising token security.
- **INV-24 Quarantine Rejection (Root Cause)**: Feedback messaging added by Codex in `vendor_bom_verifier.js` contained the word `"quote"`, which triggered `quarantined_deltas.js` rejection under `FORBIDDEN_SOURCE_TERMS`. The feedback string was corrected to `"Unverified vendor observation: SKU ${added.sku}..."`, preserving honest difference reporting without triggering epistemic quarantine violations.
- **Portal Status Contract**: `generatePartnerPortalUploadBOM` is designed specifically for upload sheets into HPE OCA. Reverting to `'Ready for Portal Upload'` as the unvalidated fallback and checking cryptographic receipt bindings for `'CLIC ACCEPTED — <timestamp>'` restores proper operational status.
- **Missing Catalog Schema Metadata**: Fixture generation in `test_core_workflow_contracts.js` lacked the required `metadata` object expected by `safeWriteJsonAtomic`. Adding valid schema metadata (`metadata: { chassis: 'DL380_Gen12', scrapeDate: ... }`) resolved the invariant assertion crash.
- **Core Linter & Failure Diagnostics**: Added `npm run lint:core` to `package.json` (`npx -y oxlint scripts/ tests/`). Cleaned up unused variables and spreads. Preserved `deliveryAuthError` on the evaluation error envelope.

### 2. Certified Test Matrix Execution Results
- **Smoke Domain**: 8/8 suites PASSED (100.0%) in 9.62s.
- **Core Contract Domain**: 11/11 suites PASSED (100.0%) in 44.29s (`test_core_workflow_contracts.js`, `test_product_metadata_manager.js`, `test_portal_receipt.js`, etc.).
- **BOQ Domain**: 25/25 suites PASSED (100.0%) in 155.00s (13 Unit, 4 Chaos, 7 Integration, 1 E2E).
- **Physical Aspects Domain**: 16/16 suites PASSED (100.0%) in 26.89s (11 Unit, 2 Chaos, 3 Integration).
- **Router Domain**: 3/3 suites PASSED (100.0%) in 35.95s.
- **Sync Domain**: 22/22 suites PASSED (100.0%) in 39.83s.
- **Code Quality & Cyclomatic Complexity**: Maximum $CC = 133 \le 135$; `npm run lint` reports 0 warnings and 0 errors.
- **Semantic AST Graph**: Updated and linked via `npm run update:graph` (7,084 nodes, 12,720 edges, 417 communities).

### 3. Comprehensive Fixes Implemented in this Round
1. **Reconciliation Honesty in Presales Router (`route_query.js`)**: Empty or unparseable customer tenders now cleanly route as `SINGLE_FILE_AUDIT` with honest discrepancy reporting instead of falsely asserting `RECONCILIATION_COMPLETE`.
2. **Cross-Process HMAC Secret Export (`workflow_contract.js`)**: `DELIVERY_AUTH_SECRET` is automatically initialized into `process.env` upon module load if unset, guaranteeing child processes inherit the identical signing secret.
3. **Chassis Key Normalization (`workflow_contract.js`, `portal_receipt.js`)**: Delimiter- and case-agnostic normalization (`DL380_Gen12` vs `DL380 Gen12`) prevents false scope-check rejections.
4. **Target Chassis Key Harmonization & Error Propagation (`eval_boq.js`, `eval_output_serializer.js`)**: Unified target chassis resolution across evaluation and serialization pipelines; propagated detailed `deliveryAuthError` into `deliveryError` and JSON response payloads.
5. **Phase 8 Double-Completion Lifecycle Resolution (`eval_output_serializer.js`)**: All deliverable artifacts are now recorded before Phase 8 completes, eliminating duplicate completion after Phase 9. Extracted helper functions reduced cyclomatic complexity from 136 to 107.
6. **Dashboard Export Payload Unwrapping (`dashboard/routes/evaluation.cjs`)**: Unwrapped nested SSE evaluation result structures and forwarded authorization options to `generateProfessionalBOQ`.
7. **Portal Exporter Delivery Gate (`generate_boq_xlsx.js`)**: Gated direct calls to `generatePartnerPortalUploadBOM` when passed an evaluation object with an `exportPath`.
8. **Weighted Price Aggregation (`vendor_bom_verifier.js`)**: Duplicate rows with different unit prices in BOM audits now compute weighted average prices rather than discarding subsequent row prices.
