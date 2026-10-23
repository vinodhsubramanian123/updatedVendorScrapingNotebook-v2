# Priority solution intelligence and accuracy gap plan

23 October 2026. Baseline: commit `23273bb`; existing uncommitted changes in `scripts/lib/feedback/continuous_learning_verifier.js` are part of the reviewed working tree and must be preserved.

## Scope and evidence

This is a bounded static gap analysis of quantity allocation/export, recommendation scoring, acceptance and learning. Graphify was queried successfully (9,868 nodes reported); relevant source functions were then inspected. No runtime reproduction or tests were executed for this document. Source-level findings below do not imply every end-to-end path is affected. Historical certification and the 22 October closure report do not close these counterexamples.

This plan refines the earlier modernization blueprint, rather than replacing all its backlog. Implementation belongs to Antigravity with focused validation under the current testing assignment. No new cloud operation, vendor acceptance or publication is required to reproduce local defects. Preserve current changes, production catalogs and historical evidence.

## Findings and fixes

### G01 — Quantity conservation is observational, not enforced (P0)

**Observed:** `scripts/lib/boq/multi_cluster_splitter.js:buildQuantityConservationLedger` returns fully conserved for non-array inputs, compares each repeated source SKU row against the entire allocated SKU total, normalizes F21/B21 without qualification, and uses truthiness defaults for quantities. `splitAndWriteClusterWorkbooks` proceeds without inspecting `quantityConservation`. Repository search found the field only in the splitter. The allocator retains rounding/flooring paths.

**Fix:** validate input quantities as safe integers; preserve owner/configuration/global scope and source-row attribution; aggregate repeated rows consistently or explicitly allocate their shares. Do not equate FIO and BTO parts without an approved mapping. Include allocated-only additions as well as missing source items. Separate approved mandatory additions from unexplained differences. Retain diagnostic results on infeasibility, but prevent authoritative portal/presentation export when unresolved differences remain. Carry the ledger into routed output and the delivery gate. Inventory direct export callers so a fix in one wrapper cannot be bypassed.

**Acceptance:** 450 components across 60 homogeneous nodes cannot silently become 480; three nodes with ten items cannot silently drop one. Duplicate-row splitting/reordering preserves the outcome; zero/shared quantities remain correct; added-only items appear; malformed arrays are not conserved. Known valid inputs still export. Unresolved allocations produce ACTION_REQUIRED with source quantities and remediation, not a fabricated completed order.

### G02 — Ranking loses ownership and can depend on candidate order (P1)

**Observed:** `strategy_synthesizer.js:scoreAndSortCandidates` keys quantity maps by SKU only. `matchedCount` counts candidate rows against a unique source-SKU denominator, allowing a ratio above one. `partCategoryMap` is shared and populated during candidate traversal, allowing earlier candidates to supply categories used to weight later ones. Quantities use `|| 1`.

**Fix:** use canonical scoped order quantities and distinct scoped component identities. Compute category/role evidence before scoring, from authoritative scoped data, with explicit unknown/conflict handling. Do not let candidate-provided descriptions/categories lower penalties. Clamp is insufficient: calculate the correct unique intersection. Preserve the latest INV-193 architectural-weight policy; document its relationship to the older least-changed-lines policy instead of silently replacing one. Hard requirement/compatibility checks precede either preference policy. Use deterministic tie-breakers and retain strategy identity separately from display rank.

**Acceptance:** moving identical SKUs between owners is a real change; equivalent per-node/order representations compare equally; row splitting and candidate permutation leave scores unchanged; match ratio stays within [0,1]; conflicting category claims cannot improve score. Verify final serialized rank order, not just an intermediate sort.

### G03 — Domain acceptance permits imprecise identity matches (P0 verification)

**Observed:** `bom_verifier.js:_checkPhysicalAspects` accepts stripped IDs and first-word matches. A STORAGE token can satisfy more than one required storage identity. It infers SAN from any chassis name containing "switch", and routes SAN through generic networking requirements despite the specialized SAN evaluator emitting its own four checks. NOT_APPLICABLE handling needs explicit profile semantics.

**Fix:** choose an implemented profile using canonical domain/product identity. Match exact check IDs or a documented one-to-one legacy alias map. Reject duplicate identity substitution and unknown profiles; do not infer completeness from count or free text. Define a specific supported SAN profile and explicitly authorized non-applicable checks rather than exempting all switches. Preserve separate whole-solution and portal gates.

**Acceptance:** unrelated passing checks named with STORAGE/POWER words cannot satisfy missing required checks. Generic switches cannot inherit SN3600B validation. Supported server and specialized SAN fixtures remain correctly classified. Missing profile or required identity blocks certification while retaining diagnostics.

### G04 — Unmatched-input gate can be masked or crash (P0)

**Observed:** `bom_verifier.js:_checkUnmatchedSkus` selects `output.unmatchedSkus || context.unmatchedSkus`: an empty output array masks context findings. Non-array values are treated as no unmatched inputs. Null array entries are dereferenced during formatting. Absence is described as affirmative catalog matching, although the parser's collection is not a complete catalog-presence check.

**Fix:** preserve and merge authoritative intake diagnostics across context/output, with stable row identities and explicit resolved provenance. Validate shapes and format malformed entries safely. Distinguish no reported unmatched tokens from proven source coverage. Connect remaining unresolved meaningful requirements to the existing requirement-resolution gate without rejecting resolved generic descriptions or harmless headings.

**Acceptance:** output=[] plus a nonempty context remains blocked; malformed/string/null diagnostics do not PASS or crash; a legitimate resolution clears only the corresponding finding; omitted input metadata cannot establish affirmative catalog coverage. Exercise direct, routed and grouped ingress.

### G05 — Learned-rule identity and persistence remain incomplete (P1)

**Observed:** the working-tree repair preserves corrupt history, binds directory scope, uses exact IDs for reachability and avoids synthesis during simulation. It is not runtime-validated. `recordAndCertifyLearnedRule` still replaces entries using SKU/type/dependency alone, excluding selector/threshold/scope differences, and performs read-modify-write without a surrounding workflow lease. Atomic file replacement alone does not prevent concurrent lost updates. Legacy audit records do not reliably identify which rule fired.

**Fix:** reuse owner-aware workflow leases for the whole read/validate/merge/write transaction. Define full semantic identity including product/domain/selectors/operators/units/thresholds, or explicit version/supersession identity. Preserve distinct conditional rules. Add stable rule IDs to actual application audits and distinguish reachable, applied, validated and promoted states. Verify governance at the caller boundary so a new persistence API cannot bypass quarantine. Corrupt history recovery must preserve bytes and require a validated replacement; do not automatically initialize empty history.

**Acceptance:** two concurrent writers retain both updates; two selector-specific rules coexist; unrelated rule activity cannot certify target consumption; corrupted/wrong-schema history remains preserved with an actionable error. A fresh process applies only the intended rule. Validate both the recent uncommitted repair and the composed changes.

### G06 — Revocation and self-healing closure need proof (P1 investigation)

No new reproduced defect is asserted here. Inspect active-knowledge router caches, quarantine/promote APIs, rule verifier consumers and recovery queues. Establish whether withdrawal, expiry, conflicting evidence or product remapping invalidate already loaded rules and candidate reviews.

**Fix if missing:** bounded recovery using the canonical APIs, explicit ownership and durable attempt state. Retry only recoverable operations; ambiguous remote outcomes require readback before resubmission. Never self-promote an inference or copied generated answer into vendor authority. Preserve primary failures, retry/deadline budgets and scope. Report unresolved recovery as pending/action-required.

**Acceptance:** trigger/non-trigger/wrong-product cases in a fresh process; revoked rules cease affecting evaluation; stale cached review cannot authorize changed evidence; failed recovery does not fabricate success; no duplicate remote mutation or deletion of protected sources.

## Execution order

1. **Baseline:** capture HEAD, tracked/untracked hashes and protected data; inspect current callers and checkpoint mappings; preserve the learning patch. Record existing failures separately.
2. **Delivery correctness:** reproduce and fix G01/G03/G04 in small patches. Add focused positive controls and negative cases. Gate actual export/API results, not only helper functions.
3. **Decision quality:** fix G02 after quantity semantics are stable. Declare ranking-policy precedence and expected changes before accepting new orderings.
4. **Learning reliability:** complete G05; investigate and repair demonstrated G06 gaps. Prove fresh-process consumption/revocation and recovery ownership.
5. **Final integration:** Antigravity runs affected tests and shared smoke/core lint/complexity/circular-dependency checks; dashboard tests/build/browser checks only for touched consumers. Refresh Graphify after significant changes and verify completion. No blind full matrix; no skipped live case counted as passing.

Relevant existing anchors: `test_multi_cluster_splitter_fuzz.js`, `test_configuration_quantity_context.js`, `test_bom_verifier.js`, `test_query_router.js`, `test_agentic_flow_audit_remediation.js`, `test_agentic_learning_and_evidence_trace.js`, and quarantine/active-knowledge tests. Extend missing counterexamples rather than copying implementation formulas into assertions. Use isolated fixtures, NODE_ENV=test, and denied cloud mutation for local negatives.

## Completion criteria and wider backlog

Each finding needs source evidence, initial reproduction, exact changed files, before/after behavior, final source hashes, commands/counts/exits, and remaining limitations. Mark AUTHORED until executed validation exists; use independently verified only with an independent review. Update the 22 October closure claims to reflect the verified scope, not simply the presence of a feature.

Deferred until these gates are stable: calibrated confidence and claim-level contradiction handling; workload/substitution equivalence matrices; broader product coverage; held-out accuracy/abstention benchmarks; large module extraction. Existing deterministic versus cloud, vendor receipt, commercial completeness and publication boundaries remain mandatory throughout. A local benchmark or structurally complete ledger cannot certify live ordering or cloud synchronization.

This plan is ready for implementation. It does not claim exhaustive solution coverage or that a missing runtime proof is itself a reproduced defect.
