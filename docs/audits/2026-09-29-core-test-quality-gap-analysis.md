# Core Test Quality and Guardrail Gap Analysis

**Date:** 2026-09-29  
**Scope:** Production-core tests for customer-query classification, skill/workflow dispatch, deterministic evaluation, agentic guardrails, evidence, degraded operation, acceptance, delivery, portal receipts, catalog lifecycle, learning, synchronization, and cross-platform behavior.  
**Excluded:** Dashboard/UI implementation and dashboard-specific tests.  
**Execution boundary:** Static test/code analysis only. The suite was inventoried but not executed; Antigravity/Gemini retains test execution and certification ownership.

## 1. Executive conclusion

The repository has a large and valuable test inventory, especially around physical rules, parsers, catalog data, and isolated helpers. The critical weakness is not suite count. It is that customer-facing correctness is not represented as a mandatory, evidence-backed contract across routing, workflow order, degraded states, acceptance, delivery, and Tier 3 portal proof.

Several current tests can preserve unsafe behavior:

- the router test treats one-file reconciliation as valid;
- the low-level freshness test requires a missing catalog to return fresh;
- the live CLIC test exits successfully when no browser exists and catches connection errors without failing;
- evidence tests can manually assign `PASSED` rather than proving that a stage derived PASS from evidence;
- output tests call workbook generation without a delivery-authorization contract;
- targeted domain selection is filename-based and omits central router/orchestrator/skill-boundary tests;
- the default `npm test` excludes E2E, while the cross-platform CI job runs an older hand-selected subset rather than the core workflow contract.

The quality objective should change from “all discovered files exited zero” to:

> Every supported customer intent, transport, mandatory stage, failure class, evidence transition, and delivery claim has a unique executable contract; a missing dependency, skipped check, stale receipt, absent assertion, or empty selection cannot count as certification.

## 2. Inventory and confidence boundary

- The current runner discovers **185 suites**: 115 unit, 41 chaos, 26 integration, and 3 E2E.
- Excluding dashboard/UI-related files leaves **182 core-oriented JavaScript test files** for review.
- `tests/README.md` still claims 158 suites and describes `npm test` as a portfolio audit, while `package.json` maps it to the fast unit+chaos+integration tiers.
- No exact duplicate JavaScript test files were found by SHA-256.
- No production coverage or mutation-testing tool is configured. A green suite therefore shows that current assertions passed, not that critical branches were executed or that assertions would detect a disabled guardrail.
- Ten reviewed core-oriented files use custom harnesses or no standard `assert` calls. Some are legitimate custom reporters, but the matrix does not distinguish an assertion-bearing custom harness from a script that simply exits zero.

This analysis does not treat test count, log banners, or a zero process exit as proof of a safety property.

## 3. P0 findings — tests that can hide or preserve silent failure

### T-01: The matrix equates process exit zero with a passed test

- `run_test_matrix.js` sets `pass = code === 0 && !timedOut` and does not require discovered test cases, assertions, TAP results, or a declared custom-harness result.
- A domain or pattern that selects zero suites prints a warning and exits zero.
- A typo, stale matcher, missing fixture, early return, or swallowed integration error can therefore produce green automation without executing the intended proof.

**Required correction:** every run profile declares an expected non-zero suite set and required capability IDs. Parse Node TAP summaries where available. Custom harnesses must emit a machine-readable assertion count/result contract. Zero selected suites, zero executed tests for a required profile, unexpected skips, and missing result summaries fail the run.

### T-02: “Live CLIC” can pass without live CLIC

- `tests/e2e/test_live_clic.js` exits zero when no browser target is present.
- Its top-level catch logs a connection note but does not fail.
- It contains no assertions for advice classification, transaction identity, manifest binding, receipt persistence, receipt freshness, or configuration ownership.
- `tests/integration/test_clic_cross_product_validation.js` is named as CLIC validation but calls only `evaluatePhysicalMath()` with synthetic BOMs; it does not exercise the CLIC parser or portal.

**Impact:** CI or a local run can report CLIC coverage without any vendor transaction or receipt proof.

**Required correction:** split profiles into `portal-contract` (fully deterministic parser/classifier/receipt tests) and `portal-live` (environment-required). An unavailable live dependency is an explicit `NOT_RUN` result and cannot count as certified. Rename low-level physical-rule tests so they do not imply Tier 3 validation.

### T-03: Tests encode two known unsafe contracts

- `test_query_router.js` explicitly executes “BOM_RECONCILIATION with single audit file” and only checks that a boolean report exists. This preserves the empty-customer-baseline path.
- `test_knowledge_governance_and_kit_routing.js` explicitly asserts that a nonexistent catalog returns `true` from `isCatalogFresh()`.

**Required correction:** invert both contracts. Reconciliation requires two non-empty inputs or an explicitly different `CATALOG_AUDIT` intent. Missing/unreadable catalog evidence returns a typed non-success state and must block certification.

### T-04: Router tests prove labels, not skill execution

`route_query.js` currently recognizes at least these execution tracks: freeform Q&A, BOQ evaluation, OCR, RFP sizing, reconciliation, catalog intelligence, workload DNA, value engineering, least-delta, workbook generation, remarks reconciliation, multi-cluster tender, adversarial validation, continuous learning, knowledge sync, cross-vendor transformation, and heterogeneous modernization.

Only five `skillTarget` mappings are asserted in `test_query_router.js`. Execution checks are mostly shallow (`answer` truthy, citations is an array, status truthy, report boolean exists). There is no systematic proof that:

- all intents are reachable and mutually disambiguated;
- keyword collisions follow declared precedence;
- explicit intent, file type, and natural-language intent cannot conflict silently;
- the selected skill's prerequisites, mandatory stages, halt conditions, and handoff actually execute;
- file and in-memory representations take the same workflow;
- OCR proceeds from ingestion into normalized routing;
- unsupported/ambiguous requests remain blocked rather than choosing a default product;
- a response contains evidence appropriate to the selected track.

**Required correction:** generate a routing decision table from the workflow registry. For every intent test positive, negative, collision, ambiguity, malformed-input, explicit-override, and transport-equivalence cases. Assert handler identity and required stage/evidence IDs—not only `skillTarget` text.

### T-05: Acceptance is unit-tested but not enforced at the delivery boundary

- `test_bom_verifier.js` directly covers only U1, U3, B1, B6, and one aggregate incomplete case. The implementation currently emits 21 distinct check IDs; most have no direct contract coverage, and the module's broader U/B/R/C/Q range claims exceed implemented checks.
- No core test invokes the real customer workflow and proves that failed/incomplete acceptance prevents workbook/report/Sheets export.
- Workbook tests call `generatePartnerPortalReadyWorkbook()` directly with unevaluated structures and prove only that certification wording is absent.

**Required correction:** make acceptance profiles declarative and test every required ID and status transition. Add application-level tests that spy on delivery ports and prove they are never called without `DeliveryAuthorization`. Diagnostic artifact production must be explicitly separate from presentation-authorized delivery.

### T-06: Evidence tests can assert assigned status rather than earned status

- Several ledger tests call `completePhase(..., 'PASSED', ...)` directly and then verify that PASSED was stored.
- There is no test that calling `completePhase()` without an outcome fails, although production currently defaults the status to `PASSED`.
- `SKIPPED` is accepted as terminal without comprehensive tests requiring a policy code, applicability decision, and retained evidence.
- `test_evidence_log_health.js` returns successfully when no recent logs exist, silently ignores unreadable logs, skips phases with no status, and depends on shared `outputs/history` state.

**Required correction:** stage adapters return typed results from which ledger state is derived. Test that callers cannot set PASS directly, default outcome is forbidden, every skip needs a policy reason, unreadable evidence fails health, empty evidence selections are non-certifying, and generated ledgers are verified from isolated fixtures.

### T-07: New operational skills have no runtime-contract tests

- No test references `product_metadata_manager.js` or `commitSuccessfulResyncMetadata()`.
- `assertNotebookHealth()` has helper-level tests but no production caller test proving degraded status reaches customer disposition and delivery policy.
- Conditional visibility tests cover ambient classification, hashing, exports, and file lookup, but not the documented multi-dimension macro sweep, sweep coverage manifest, partial failure, or non-exhaustive status.
- No test exercises `parseLiveCdpModal()` or `parseClicAdviceExcel()` as a deterministic classification contract.
- No test calls `receiptMatches()` or proves exact solution fingerprint, configuration ownership, transaction identity, or expiry invalidation.

**Required correction:** mark these skills `PARTIAL` until runtime contracts and integration tests exist. Add contract tests before wiring them into the canonical workflow.

## 4. P1 findings — weak coverage architecture and maintainability

### T-08: Domain selection is filename-based and misses core suites

The domain runner uses regular expressions over file paths. Important suites not matched by any named functional domain include:

- `test_query_router.js`
- `test_evaluation_orchestrator.js`
- `test_presales_skill_boundaries.js`
- `test_presales_skills_chaos.js`
- `test_active_knowledge_router.js`
- `test_quickspecs_oca_reconciliation.js`

The smoke profile also omits the router, orchestrator, acceptance-to-delivery wiring, and portal receipt contracts.

**Required correction:** replace filename inference with an explicit test manifest keyed by capability/invariant IDs. A suite may belong to multiple capabilities without depending on its filename. Add a mandatory `core-contract` profile.

### T-09: Cross-platform CI exists but does not run the core contract

The GitHub workflow correctly spans Ubuntu, Windows, and macOS on Node 20 and 22. However, it executes a hand-selected legacy list and does not run the router, canonical orchestrator, acceptance gate, evidence truth, skill-boundary, degraded-mode, conditional-discovery, or receipt-binding suites.

**Required correction:** run the deterministic `core-contract` profile on the OS/Node matrix. Keep live portal/cloud checks in a separate credentialed profile, but require their deterministic adapters everywhere.

### T-10: Tests are not consistently hermetic

- Some tests inspect or write shared `outputs/` state rather than an injected temporary workspace.
- `test_evaluation_orchestrator.js` writes a real evidence-ledger artifact and does not remove it.
- `test_evidence_log_health.js` reads recent repository history and can pass vacuously on a clean environment.
- Portfolio tests use mutable checked-in/generated catalogs; missing catalogs sometimes skip instead of fail.

**Impact:** order, machine state, prior runs, and timestamps can change what a green result means.

**Required correction:** default tests use temporary workspace/output roots, fixed clocks, deterministic IDs, seeded randomness, and fixture-owned catalogs. Separate immutable contract fixtures from explicit portfolio certification data. Every external prerequisite declares `REQUIRED`, `OPTIONAL_NONCERTIFYING`, or `LIVE_ONLY`.

### T-11: No mutation or decision-coverage evidence protects the guardrails

There is no configured statement/branch coverage threshold or mutation suite. The most valuable question—“would this test fail if the guardrail were removed?”—is therefore unanswered.

**Required correction:** use targeted mutation tests for safety-critical decisions rather than chasing global percentages. Mutations must include:

- bypass a mandatory workflow stage;
- flip missing/stale/degraded evidence to PASS;
- default an absent outcome to PASS;
- ignore acceptance before export;
- accept a stale/mismatched portal receipt;
- treat prose/citation-free model output as verified;
- promote a quarantined learning;
- swallow a decision-critical exception;
- change quantity/configuration ownership without invalidating fingerprints.

### T-12: Failure-path and agentic-principle coverage is fragmented

There are good helper tests for prompt construction, sanitization, drift, quarantine, and some offline behavior. Missing application-level proofs include:

- model output is always untrusted until schema and citation validation;
- tool/API errors become typed degraded/failure states;
- retry limits, timeouts, circuit breakers, and iteration budgets terminate safely;
- repeated calls are idempotent and do not duplicate learning or artifacts;
- cloud unavailability never disables deterministic local checks;
- learning cannot affect the current evaluation and promotion requires independent evidence;
- every customer-facing factual claim maps to retained source/evidence IDs;
- unsupported capability becomes `NOT_EVALUATED`, never an inferred generic PASS.

**Required correction:** express these as workflow invariants and run them against every applicable intent, not only isolated agentic helpers.

## 5. Duplicate and overlap assessment

No byte-identical duplicate JavaScript test files were found. There is substantial semantic overlap, but it is not automatically waste:

- individual aspect-unit suites, comprehensive aspect suites, cross-chassis suites, integration aspect suites, and the misleadingly named CLIC cross-product suite exercise overlapping physical rules;
- presales boundary and chaos suites overlap commercial remarks, heterogeneous modernization, and cross-vendor parsing;
- multiple evidence suites check ledger shapes, often from manually assigned statuses rather than real workflow transitions.

Do not delete tests based on similar names. First assign every case a unique tuple:

`capability/invariant -> layer -> scenario -> fault -> expected evidence/outcome`

Then:

- retain unit tests for algorithm boundaries;
- retain contract tests for schemas and state transitions;
- retain integration tests only for real wiring between owners;
- retain E2E tests only for externally observable customer outcomes;
- merge cases only when their tuple and fault-detection value are identical;
- rename tests that imply a higher evidence tier than they exercise;
- use mutation results to identify redundant cases that kill exactly the same mutants.

## 6. Required core test architecture

```text
Capability / invariant registry
          |
          +--> generated routing decision table
          +--> required workflow-stage matrix
          +--> acceptance-profile check IDs
          +--> evidence and delivery policies
          +--> test manifest
                    |
                    +--> unit: pure algorithms and schemas
                    +--> contract: state transitions and ports
                    +--> integration: canonical workflow wiring
                    +--> chaos: typed dependency/failure injection
                    +--> live: external vendor/cloud receipts
```

Every test-manifest entry should declare:

- capability and invariant IDs;
- production owner/API;
- tier and deterministic/live classification;
- fixtures and product/domain scope;
- required predecessors;
- expected execution state, outcome, evidence, and customer disposition;
- external prerequisites and skip policy;
- mutation/fault(s) it is expected to detect;
- supported OS constraints, if any.

## 7. Priority implementation plan

### Test Phase A — Stop false-green execution

1. Make zero selected suites fail for named domain/pattern/core profiles.
2. Require TAP/custom-harness result summaries and executed-test/assertion counts.
3. Replace silent early returns with explicit `SKIP`/`NOT_RUN` records; required profile skips fail certification.
4. Repair the live CLIC test so missing browser/connection is not PASS.
5. Correct stale suite counts and command descriptions from generated discovery data.

**Exit:** a green profile proves that the intended tests actually executed.

### Test Phase B — Lock the corrected safety contracts

1. Invert missing-catalog freshness from true to typed non-success.
2. Reject one-file reconciliation; add separately named catalog-audit coverage.
3. Reject implicit/default ledger PASS and unreasoned SKIP.
4. Prove failed/incomplete acceptance blocks every presentation exporter.
5. Prove all bypass entry points are migrated or explicitly internal.

**Exit:** tests no longer preserve known P0 architecture defects.

### Test Phase C — Complete routing and skill invocation coverage

1. Generate positive/negative/collision cases for every supported intent.
2. Assert the workflow definition, handler, prerequisites, stage IDs, halt behavior, evidence requirements, and next handoff.
3. Run equivalent file, memory, text, and OCR-normalized requests through the same canonical semantics.
4. Validate ambiguous product/generation and unsupported capability outcomes.

**Exit:** a label-only or skipped skill invocation cannot pass.

### Test Phase D — Prove epistemic and agentic invariants

1. Test local deterministic checks under every cloud failure mode.
2. Reject prose-only, anonymous, candidate-authored, mismatched, or stale grounding.
3. Enforce retry/iteration/time budgets and typed dependency failures.
4. Prove learning quarantine, independent promotion, idempotency, and no current-run self-certification.
5. Trace each customer claim to immutable evidence IDs.

**Exit:** model output can advise but cannot manufacture verification.

### Test Phase E — New skill and Tier 3 contracts

1. Test exact product identity, collision handling, corrupt-registry quarantine, atomic merge, and concurrent metadata updates.
2. Test conditional sweep coverage manifests and partial-dimension failure.
3. Test CLIC extraction/classification independently from learning side effects.
4. Test receipt fingerprint, product scope, configuration ownership, transaction ID, expiry, and mutation invalidation.
5. Test degraded-mode propagation into acceptance, narrative, and delivery.

**Exit:** the three new skill documents match executable, verified capabilities.

### Test Phase F — Deduplicate by fault-detection value

1. Build requirement-to-test traceability.
2. Add targeted guardrail mutation runs.
3. Merge or remove only cases with identical responsibility and mutant detection.
4. Keep product matrices data-driven rather than copying test bodies.

**Exit:** every retained test has a distinct reason to fail.

### Test Phase G — Cross-platform core gate

1. Add `test:core-contract` with no dashboard/UI dependency.
2. Run it on Windows, Linux, and macOS with supported Node versions.
3. Use injected temporary roots, fixed clock, deterministic IDs, and seeded randomness.
4. Keep external live checks separate, visible, and non-substitutable.

**Exit:** OS, current directory, historical outputs, and unavailable optional services cannot change deterministic core conclusions.

## 8. Quality-oriented definition of done

The test remediation is complete only when:

1. Every supported customer intent has routing, collision, negative, and workflow-execution coverage.
2. Every operational skill maps to an exported runtime contract and an enforced caller test.
3. Every mandatory workflow stage has success, failure, degraded, timeout, and forbidden-skip tests.
4. Missing/unreadable/stale evidence never produces a successful test expectation.
5. Acceptance failure demonstrably prevents all presentation-authorized exports.
6. Ledger PASS is derived from evidence; callers cannot default or assign it freely.
7. Every skip/not-run result has a policy code and is excluded from certification unless explicitly allowed.
8. Tier 3 certification requires a fresh exact receipt; absence cannot pass live validation.
9. Agentic text, citations, learning, and promotion obey separate evidence states.
10. Test profiles fail when their selection is empty or required prerequisites are absent.
11. Core tests are hermetic and deterministic across Windows, Linux, and macOS.
12. Safety-critical mutations are killed by named tests.
13. Requirement-to-test traceability identifies gaps and true duplication.
14. Suite counts and coverage tables are generated, not manually claimed.
15. No test name or success banner claims a higher evidence tier than it actually exercises.

## 9. Recommended first batch

Start with the false-green and contract-conflict fixes, not new test volume:

1. harden the runner against empty selections, zero executed tests, and unclassified skips;
2. fix the live CLIC false pass;
3. invert the single-file reconciliation and missing-catalog freshness expectations;
4. add canonical router/orchestrator/acceptance-to-delivery contract tests;
5. add the three new skills as explicitly partial capabilities with failing/disabled contract placeholders until runtime wiring is implemented;
6. introduce a deterministic `core-contract` profile and place it in the existing cross-platform CI matrix.

This batch directly prevents the present suite from certifying the most important silent skips while preserving useful rule-level coverage.
