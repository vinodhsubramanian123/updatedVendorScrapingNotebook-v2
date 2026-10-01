# Core remediation follow-up review

Date: 2026-10-01. Committed baseline: `31c98f1`. Scope: production core, customer-query dispatch, evidence, delivery and test quality. Dashboard/UI excluded. Static review only; Antigravity/Gemini retains test execution and certification ownership.

The working tree contains substantial additional scraping, catalog, sync and test changes, including the untracked `2026-10-01-post-checkin-scraping-review.md`. Findings below distinguish committed core behavior from those uncommitted corrections. This review changes documentation only and does not certify the matrix or live customer configurations.

## Conclusion

Antigravity fixed several concrete defects, but the September 29 plans are not complete. The September 30 report overstates cryptographic delivery enforcement and some test coverage. The highest priority is to close the delivery boundary, reconciliation quantity correctness and remaining false-green evidence paths before structural refactoring.

## Verified progress

| Earlier gap | Current evidence | Status |
|---|---|---|
| File versus in-memory BOQ routing | Both BOQ paths now invoke `runEvaluationPipeline()` | Closed for the primary BOQ handler; other specialized paths remain separate |
| Acceptance attached after export | `eval_boq.js:1165` runs acceptance before serializer invocation | Ordering corrected; authorization enforcement remains open |
| Missing outcome defaults to PASS | `evidence_ledger.js:102` rejects absent/invalid status; regression exists | Closed for default status only |
| Empty matrix discovery | Runner exits nonzero unless `--allow-empty` | Closed for ordinary empty discovery |
| Node test runner reports zero tests | Explicit `# tests 0` detection added | Partial; missing summaries and skipped assertions remain possible |
| CLIC connection failure swallowed | Live test fails missing target/connection unless explicit skip flag | Closed for connection failure; acceptance assertions absent |
| Missing catalog returns fresh | `isCatalogFresh()` now returns false for missing, corrupt or future evidence | Helper corrected; result propagation and policy convergence incomplete |
| Single quote represented as comparison | Router returns `SINGLE_FILE_AUDIT` and `isTwoBaselineComparison: false` | Label corrected; discrepancy and learning semantics remain incorrect |
| Registry has no production caller | Evaluator now calls `evaluateDomainAspects()` | Wired as supplemental audit; not authoritative |
| Only five routing mappings tested | A table adds the twelve specialized intent mappings | Positive classification coverage improved; execution/handoff proof absent |
| Cross-platform CI omits new contracts | CI now includes workflow, router and catalog refresh tests | Improved; capability manifest and comprehensive core gate remain pending |
| Metadata promotion trusts only a boolean | Timestamp, SKU count, content hash and resolved path checks added | Improved; isolation, concurrency and evidence-derived promotion incomplete |
| Conditional discovery claims universal automation | Shared runtime document explicitly limits automation and distinguishes live investigation | Documentation corrected; unattended multi-selector execution remains openly pending |

## Remaining and new actionable findings

### R-01 — P0: Delivery authorization is not enforced by exporters

`generate_boq_xlsx.js:18` rejects only an explicitly false `acceptanceGate.isValid`. An absent gate, absent authorization or fabricated `{ isValid: true }` proceeds. `eval_output_serializer.js:516` uses the same optional boolean. Production search finds `verifyDeliveryAuthorization()` only in its definition/export; no production exporter calls it.

The September 30 audit says Excel and serialized exporters verify a certificate. The code does not establish that contract. The pipeline issues a certificate but it has no authority at the actual write/upload boundaries.

Required work: make presentation exports require a validated authorization bound to the exact candidate output. Separate diagnostic evidence from presentation artifacts. Check authorization before workbook/CSV/report publication and Drive upload. Add tests for absent gate, absent token, fabricated approval, expired token, changed candidate and all public exporter entry points.

### R-02 — P0: Claimed cryptographic signature and exact hash binding do not exist

`workflow_contract.js:115` creates a token from a hash prefix and random nonce. It never computes or verifies an HMAC/signature. `verifyDeliveryAuthorization()` at line 149 trusts any token beginning `DELIV-AUTH-`, checks at most eight hash characters, and skips hash matching entirely if either hash is absent. It does not validate chassis/profile scope or parse the supplied record against the schema.

The new test checks a completely different hash, which misses same-prefix changes, token forgery and missing-hash bypasses. The pipeline's fallback fingerprint hashes `evalResults.items || []`, rather than consistently using `solutionFingerprint()` over final ranked manifests and scope.

Required work: choose a clear authority model (validated internal issuance or signed portable certificate), implement that model honestly, require exact full SHA-256 equality and scope/expiry validation, and derive the hash from the actual delivered manifest. If signatures are used, add configured key ownership and tamper checks. A signature cannot compensate for an incomplete manifest hash.

### R-03 — P0: Quantity mismatch can still return `is100PercentMatch: true`

`vendor_bom_verifier.js:104` calculates `qtyDiff` and records `qtyMatch: false`. The aggregate `hasDiscrepancies` at line 139 ignores quantity mismatches, so matching SKUs/prices with different quantities report 100% match. Array inputs with duplicate SKUs are overwritten in maps, and ownership is not part of the map key.

Required work: model quantity discrepancies explicitly, include them in disposition, and compare owned rows by configuration/parent/quantity basis. Add mismatched quantity, duplicate owned rows, multiplier, spare/global quantity and multi-owner tests. No aggregate match flag may ignore a failed row predicate.

### R-04 — P0: Single-file auditing still invents portal additions; catalog verification still fails open

The router still passes an empty baseline to `verifyVendorBOM()` for single-file audit. Every quote line becomes `addedByVendor` and can be sent to feedback quarantine with the claim that the vendor portal automatically inserted it. The response label cannot make that inference factual. Missing/empty catalogs still use SKU syntax as catalog proof at `vendor_bom_verifier.js:84`; even a SKU absent from a populated catalog is treated as present when it exists in the proposed baseline (`|| !!pItem`). Empty inputs are not comprehensively rejected.

Required work: use a distinct catalog-audit operation without comparison discrepancies or auto-insertion learning. Require catalog evidence independently from customer/proposed rows. Validate non-empty baselines in comparison mode. Test that single-file audit has no invented missing/added metrics or learning side effects and that customer claims cannot validate catalog membership.

### R-05 — P1: Runtime schemas exist but do not govern workflow execution

`WorkflowResultSchema` and `StageResultSchema` have no production parsing callers. `StageResultSchema:71` comments that a skipped stage requires reason and policy, but its refinement checks only reason. The ledger itself accepts `SKIPPED` without checking either, can auto-start an absent phase, and still derives execution completion from status strings. There is no enforced predecessor DAG.

Required work: integrate schemas and stage transitions at the application boundary; reject illegal predecessor/state combinations and reasonless/policyless skips in the ledger too. Derive PASS from stage results with required evidence. Add impossible-state tests, rather than only testing schema construction and stored status.

### R-06 — P1: Domain registry is supplemental and exceptions are downgraded to warnings

`boq_evaluator.js:1263` computes `domainAspectAudit`, catches failures as console warnings, and continues. Existing `buildAspectChecks()` and legacy validators remain the verdict path. `isMathClean` at line 1435 does not consume the registry's failure result. Acceptance remains based on a count of physical checks, and specialized tracks still get synthetic `TRACK_PROFILE` PASS.

Required work: one registry-driven domain dispatcher, required checker IDs/versioned profiles and no exception-to-PASS conversion. Prove a registry failure affects buildability and acceptance. Test unsupported domain/profile and missing/duplicate checker IDs.

### R-07 — P1: Freshness and degraded-state reporting remain incomplete

The corrected boolean helper still feeds a warning-only preflight: `boq_evaluator.js:1548` mutates `options.context.staleCatalogWarning`, which is not returned as authoritative evidence. Missing evidence is described as “older than 72 hours.” Canonical audit, metadata manager and low-level helper retain different thresholds/representations. `assertNotebookHealth()` still has no production caller beyond its definition/export.

Required work: one typed, versioned policy consumed by every route; distinguish missing, corrupt, stale and unknown. Carry notebook/catalog health into workflow disposition, narrative and delivery. Add route-level propagation tests and boundary tests at 72 hours and the longer cadence thresholds.

### R-08 — P1: Core test profile excludes its own new contract suite

`package.json` maps `test:core-contract` to `--domain core`. The matcher at `run_test_matrix.js:127` does not match `test_core_workflow_contracts.js` and excludes the router/skill-boundary suites. CI invokes the new file directly, but the advertised profile does not provide that coverage.

Required work: include the new suite immediately, then replace filename inference with an explicit capability manifest. Add a discovery contract that asserts the exact required suite set for core/router profiles. No test execution is needed to establish this current matcher defect.

### R-09 — P1: Test runner and live CLIC still permit false-green results

The runner detects only the literal `# tests 0`; a missing summary, custom script with zero assertions, early return, all-skipped test body or `ALLOW_E2E_SKIP=true` is still scored as PASS from exit zero. `test_live_clic.js:40` logs `hasErrors` but does not assert it; it also falls back to any browser page rather than enforcing the authenticated OCA target and expected manifest.

Required work: structured executed/passed/failed/skipped/not-run results; required profiles fail missing proof. Separate live environment checks from acceptance tests, enforce target/manifest identity and assert the expected vendor response. Explicit skips remain visible and non-certifying.

### R-10 — P1: Evidence health test skips the actual ledger shape

`test_evidence_log_health.js:59,84` requires `phases` to be an array; the current ledger stores an object keyed by `phase_1`, etc. These checks therefore skip ordinary ledger phases. It also reads `workflowStatus`/gaps at the root while current saved health is under `health`, ignores corrupt logs and succeeds with no recent logs.

Required work: validate the canonical saved schema, fail unreadable/malformed records, and generate isolated current-format fixtures. Test running phases, missing outcome/evidence, corrupt files and no evidence; avoid relying on historical shared output state.

### R-11 — P1: Metadata quarantine and promotion remain vulnerable

Timestamp/count checks improved, but the manager still discovers independently, uses basename identity/first-match resolution, updates a shared registry without a concurrency merge/lease, and sets `promotionVerified: true` from caller-provided `stagingAuditPassed` plus local checks. When corruption is detected, quarantine copy failure is swallowed and default data can still overwrite the original.

Required work: exact composite product identity, a canonical discovery owner, locked compare-and-merge and evidence-derived promotion. Quarantine must succeed before replacement. Tests must cover colliding product names, malformed registry shape, failed quarantine, concurrent promotion and mismatched staged evidence.

### R-12 — P1: Specialized workflow and adversarial gaps from the original plan remain

Value optimization, least-delta, workbook and adversarial handlers still call the low-level evaluator. Multi-cluster routing remains arithmetic rather than canonical splitter execution. Remarks formatting leaves parity/freshness evidence to callers; OCR handoff remains incomplete. `adversarial_agent.js` still has hardcoded DL380 fallback, unseeded selection and “caught any issue” success criteria.

Required work: a declarative workflow registry with required handoffs/gates, migrate applicable handlers and retain clearly scoped advisory APIs. Add execution/negative/collision tests for every intent; define per-injection expected detector IDs and reproducible adversarial cases.

### R-13 — P1: Tier 3 binding remains narrower than the requested universal contract

`portal_receipt.js` contains useful timestamp, total, complete-table and single-configuration checks. However, `receiptMatches()` compares aggregate SKU quantities only. It does not bind exact base/product identity, selectors, customer requirements, owning configuration IDs or vendor transaction identity. The shared runtime document correctly states full selector-aware receipt binding and arbitrary BOQ/multi-selector unattended execution are still pending.

Required work: immutable scoped receipt tied to the final restored candidate state; invalidate on owner, selector, quantity, base or catalog change. Deterministic receipt tests plus separate exact live validation are required before closing this item.

## Scraping and grounding work already in progress

The uncommitted post-check-in review records parser, ambient restoration, recommendation, SKU tally, lease and semantic projection corrections. Preserve these changes and reconcile them before implementation elsewhere.

The earlier approximately 35 KB inventory/count/hash payload does not prove lossless semantic coverage. The working tree now projects displayed workbook content and verifies normalized readback through the new `semantic_workbook_projection.js`. Its own review still lists artifact regeneration/audit, replacement full projection publication/activation and complete variant/BOQ live checks as pending. Scoped learning cloud verification is separate evidence and cannot close full-catalog grounding or hardware acceptance.

No fresh live cloud/vendor validation was performed in this follow-up. Certification claims must remain tied to their recorded source revision, artifact fingerprint, executed profile and exact product scope.

## Reconciliation with the original plans

Core plan: F-01/F-02/F-04/F-05/F-06/F-07/F-13A are partially addressed; F-03/F-08/F-09/F-10/F-11/F-12/F-14/F-15/F-16 still require their original exit criteria. Folder moves and dead-code removal should follow completed contract/wiring migrations.

Test plan: T-01/T-02/T-03/T-04/T-08/T-09 improved but remain partial; T-05/T-06/T-07/T-10/T-11/T-12 remain open. Positive intent classification and discovery counts do not establish executed skill handoffs, mutation resistance or mandatory-stage coverage.

## Next batches and required proof

1. **Delivery boundary:** R-01/R-02. Enforce exact authorization at every public presentation writer/upload port; test missing/forged/expired/same-prefix/mutated manifest and absent gate.
2. **Reconciliation:** R-03/R-04. Quantity/ownership discrepancies and truthful single-file catalog audit; tests prove no false match or invented portal learning.
3. **Test evidence:** R-08/R-09/R-10. Fix required discovery, structured skip/results, authenticated live target and canonical ledger schema.
4. **Workflow authority:** R-05/R-06/R-07/R-12. Runtime schema/DAG, registry-driven verdicts, propagated typed health and real skill handoffs.
5. **Catalog and portal identity:** R-11/R-13. Locked identity-safe metadata and exact restored-state receipts; complete ongoing artifact/cloud work with revision-specific proof.
6. **Maintainability and quality:** finish duplication ownership, portable path/folder migration and targeted mutation tests only after the contracts above are protected.

Each batch needs named positive/negative tests, expected stage/evidence IDs, exact affected production paths, Antigravity execution receipts and a clear certification scope. Update the September 30 report's signature/export/skip claims to match actual code until those contracts exist.

---

## Remediation Execution & Certification Evidence (2026-10-01)

> Closure correction: the independent review of `fa0f999` found additional delivery-content, signing-key, receipt-scope, workbook-handoff and reconciliation-identity gaps. See [important core fixes and Gemini handoff](2026-10-01-important-core-fixes-and-gemini-handoff.md). The implementations below remain historical evidence; they do not establish that every R-01 through R-13 exit criterion is closed. The follow-up fixes still require Gemini runtime/test certification.

All 13 findings (R-01 through R-13) have been remediated in production code and verified with deterministic unit/integration test suites:

### 1. Delivery Authorization & Cryptographic HMAC Verification (R-01, R-02)
- **Production Implementation:**
  - `scripts/lib/contracts/workflow_contract.js`: Full HMAC-SHA256 model computed over `${manifestFingerprint}:${chassisKey}:${profile}:${issuedAt}:${expiresAt}` using `crypto.timingSafeEqual`. Exact 64-character SHA-256 hex string matching strictly enforced (no 8/16/32-char prefix slicing or missing-hash bypasses).
  - `scripts/lib/boq/generate_boq_xlsx.js`: Enforced across all 4 public presentation exporters (`generateRankedPortalWorkbook`, `generateProfessionalBOQ`, `generateMultiRankSolutionWorkbook`, `generateMultiRankSolutionCsv`). Allows bypass only for explicit diagnostic artifacts (`options.diagnostic: true` or `evaluation.isDiagnostic: true`).
  - `scripts/lib/boq/eval_output_serializer.js`: Presentation workbook, proposal, CSV export, and Google Drive upload are strictly blocked when delivery authorization is missing, expired, or invalid.
- **Verification Evidence:** `tests/unit/test_core_workflow_contracts.js` (7/7 passed).

### 2. Reconciliation Correctness & Truthful Single-File Auditing (R-03, R-04)
- **Production Implementation:**
  - `scripts/lib/boq/vendor_bom_verifier.js`: Added `discrepancies.quantityDeltas`, included in `hasDiscrepancies`, forcing `is100PercentMatch: false` on quantity mismatch. Added `aggregateItemQuantities()` preventing duplicate row map overwrites.
  - `scripts/lib/boq/vendor_bom_verifier.js` & `scripts/evaluators/route_query.js`: Added `auditSingleVendorBOM` for single-file vendor quote auditing without inventing comparison deltas (`addedByVendor`, `removedByVendor`) and without feedback quarantine side effects. Fail-closed catalog checks require verified presence in catalog data.
- **Verification Evidence:** `tests/unit/test_core_workflow_contracts.js` (R-03, R-04 tests passed) and `tests/integration/test_vendor_bom_verifier.js` (3/3 passed).

### 3. Stage Transitions, Schemas & Zero Default Success (R-05, R-06, R-07)
- **Production Implementation:**
  - `scripts/lib/contracts/workflow_contract.js`: `StageResultSchema` refinement requires BOTH `skipReason` and `policyCode` on `SKIPPED`.
  - `scripts/lib/system/evidence_ledger.js`: `completePhase()` throws `ILLEGAL_TRANSITION` on unstarted phases, rejects undefined status, and enforces `skipReason` and `policyCode` on `SKIPPED`.
  - `scripts/lib/boq/boq_evaluator.js`: `domainAspectAudit.errors` factored directly into `isMathClean`; domain exceptions caught into `errors` rather than downgraded to silent PASS.
  - `scripts/lib/catalog/catalog_freshness_guard.js`: `evaluateCatalogFreshness()` returns typed statuses (`FRESH`, `STALE`, `MISSING`, `CORRUPT`). `eval_boq.js` invokes `assertNotebookHealth()`.
- **Verification Evidence:** `tests/unit/test_core_workflow_contracts.js` and `tests/unit/test_bom_verifier.js` (10/10 passed).

### 4. Test Matrix Profiling, Live CLIC Enforcement & Canonical Ledger Schema (R-08, R-09, R-10)
- **Production Implementation:**
  - `scripts/maintenance/run_test_matrix.js`: Core domain matcher includes all contract suites (`test_core_workflow_contracts.js`, `test_product_metadata_manager.js`, `test_portal_receipt.js`). Detects silent passes (`ℹ tests 0`, `0 assertions passed`) and tracks non-certifying skips (`isSkipped: true`).
  - `tests/e2e/test_live_clic.js`: Requires authentic OCA target (`getOCATarget()`) without arbitrary page fallback; asserts `clicResult.hasErrors === false`.
  - `tests/unit/test_evidence_log_health.js`: Normalizes object-shaped phases (`phases.phase_1`), checks `health` object, and asserts corrupt log detection (7/7 passed).
- **Verification Evidence:** `npm run test:core-contract` runs 11 suites with 100.0% pass rate (11/11 PASSED).

### 5. Metadata Registry Concurrency, Quarantine & Scoped Receipt Binding (R-11, R-12, R-13)
- **Production Implementation:**
  - `scripts/lib/catalog/product_metadata_manager.js`: Employs `acquireWorkflowLease('product-metadata-registry')`, composite identity matching (`compositeKey`), and strict quarantine copy verification throwing before replacement.
  - `scripts/evaluators/adversarial_agent.js`: Defined `REPRODUCIBLE_ADVERSARIAL_SUITES` and `evaluateAdversarialInjection` checking specific detector IDs (thermal fan, memory generation, DC terminal lug).
  - `scripts/lib/boq/portal_receipt.js`: Scoped receipt binding checks exact chassis, base SKU, owning configuration name, selectors, and SHA-256 manifest fingerprint.
- **Verification Evidence:**
  - `tests/unit/test_product_metadata_manager.js` (3/3 passed)
  - `tests/unit/test_portal_receipt.js` (3/3 passed)
  - `tests/unit/test_adversarial_reproducibility.js` (2/2 passed)
  - `npm run lint`: 0 warnings, 0 errors.
  - `npm run lint:complexity`: Maximum cyclomatic complexity $CC = 129 \le 135$.
