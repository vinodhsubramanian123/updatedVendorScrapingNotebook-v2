# Solution intelligence: end-to-end implementation plan

Date: 19 November 2026

Status: CERTIFIED_OFFLINE_COMPLETE (M1–M6 SI-00..SI-10 CERTIFIED; live OCA/NotebookLM/cloud qualification recorded separately).

Reviewed baseline: `329ec34ee32a350a1134b57c8faa270695974d07`; working tree clean before this document.

Scope: customer intent, requirement preservation, evidence, constraint reasoning, repair, sizing, ranking, explanations, learning, skills, dashboard/export integration, and release qualification.

## 1. Intended result and evidence limits

Every material recommendation will identify the customer requirements it satisfies, the facts and rules that support it, the changes made to the original request, the alternatives evaluated, and the remaining uncertainty. The same decision records will drive the API response, dashboard, workbook, narrative, and delivery authorization.

This plan extends the current canonical pipelines. It reuses quantity conservation, product-scoped discovery, candidate revalidation, source trust sets, manifest-bound review/portal receipts, delivery authorization, and append-only learning governance. It does not replace those controls with another model's approval.

The 19 November review was static. No tests, lint, builds, live portal checks, notebook operations, or cloud publication were executed. Graphify was queried first, but `graphify-out/graph.json` was missing. A scoped independent Codex CLI review failed because its local file-reading launcher could not start. Direct source inspection supports the bounded findings below; independent review remains unfulfilled.

This plan closes no historical finding by itself. Older checkpoint tables and later completion notes disagree in places. Reconcile current source and revision-bound receipts before assigning implementation status. In particular, a report-only query planner is distinct from the existing optional RFP/OCR/workload continuations.

## 2. Existing sources and confirmed starting issues

| Source | Reuse or issue observed statically |
| --- | --- |
| `scripts/evaluators/route_query.js` | Canonical routing and existing optional continuations. `executeRoutedQuery` still uses legacy dispatch; planner shadow is opt-in/report-only. |
| `scripts/lib/boq/presales_query_planner.js`, `presales_query_plan_rules.js`, `presales_query_shadow.js` | Existing pure proposal, declared capability composition, and observation boundaries. No blanket activation is warranted. |
| `scripts/lib/boq/requirement_intent_resolver.js:185` | Role/budget extraction and scoped candidate scoring exist. The budget regex also accepts an unqualified `max`, so `max 64 cores` can be interpreted as a budget of 64 USD. |
| `scripts/lib/system/reasoning_post_analyzer.js:166` | Power text assumes 20% headroom, memory defaults channel width to eight, and PCIe shortage text asserts a primary cable requirement without establishing the scoped cause. Tier 2 reporting accepts summary grounding flags/counts without requiring an actual citation array. |
| `scripts/lib/conflict/decision_trace.js:76` | An empty decision list emits an unconditional buildability claim. Missing alternative cost deltas also default to zero. |
| `tests/integration/test_boq_eval_benchmarks.js:229` | False-positive count is never incremented; unexpected violations do not fail scenarios; missing confidence defaults to 1.0; five validated tiers are printed without corresponding tier validation. |
| `scripts/lib/conflict/strategy_synthesizer.js` | Scoped ranking and bounded candidate revalidation already exist. Extend and verify their contract rather than assuming repair is absent. |
| `scripts/lib/boq/solution_evidence.js`, `portal_receipt.js` | Existing fingerprints, current review checks, captured-artifact verification, and delivery binding. Extend dependencies without weakening current verification. |
| `scripts/config/skill_workflow_registry.js`, `scripts/lib/system/schemas.js` | Existing workflow declarations are marked unused/proposed, and several coverage notes are historical. Reconcile before adding another registry. |
| `docs/audits/2026-10-04-skill-workflow-checkpoint-ledger.md` | Useful CP mapping and evidence history; summary rows are not a current completion certificate. |

### 2A. Additional confirmed silent-default and evidence-leak findings

Direct source review across templates, counterfactual repair, workload sizing, parser boundaries, and dashboard presenters identified seven additional defects addressed in SI-01 / SI-02 / SI-07:

1. `scripts/lib/system/reasoning_post_analyzer.js`: line 142 defaults unknown `formFactor` to `'2U'`, line 207 defaults unknown `x16LanesAvailable` to `1`, line 228 defaults unknown `cpus` to `2`, and line 283 defaults missing `classification.confidence` to `1.0`.
2. `scripts/lib/conflict/decision_trace.js`: line 33 defaults omitted `confidence` to `1.0`, and line 54 fabricates default optimality rationale (`'Optimal workload match with minimum disruption'`) when omitted.
3. `scripts/lib/boq/eval_output_serializer.js`: line 39 hardcodes `PORTAL VALIDATION PENDING.` even when a verified Tier 3 portal receipt exists, lines 111–113 emit false `❌ Missing` fallback status for fans/battery when `aspectChecks` is absent, lines 148–151 fabricate `READ_INTENSIVE (SATA/NVMe)` when storage is absent, and line 191 formats `$0` when `pricingComplete` is omitted (`undefined`).
4. `scripts/lib/system/counterfactual_repair.js` (canonical path under `scripts/lib/system/`, not `scripts/lib/conflict/`): line 96 falls back to unlabelled `1.2` power headroom when `requiredWattageWithHeadroom` is absent, and lines 166–167 silently default to `3`-year `Basic` support when customer support SLA/term was not supplied.
5. `scripts/lib/conflict/workload_dna.js`: line 55 applies heuristic GPU TDP defaults (`700W / 350W / 75W`) without provenance tracking, line 165 defaults `detectedChannelWidth` to `8` for unknown CPUs, and line 171 defaults `storageWorkload` to `'READ_INTENSIVE'` when `driveCount === 0`.
6. `dashboard/src/services/workflowEvidence.js:38` and `dashboard/src/services/exportEligibility.js:86-88`: candidate document review acceptance skips `sourceDetached`, `authoritativeSourceIds`, non-mock/non-simulation, citation array, and `DOUBLE_CHECK_PASSED` checks enforced by `scripts/lib/boq/solution_evidence.js:candidateReviewCurrent`.
7. `scripts/lib/boq/boq_evaluator.js:118-123`: Excel cover rows above `headerRow` are sliced off before SKU parsing, which protects SKU extraction from cover-row pollution but discards SLA, budget, redundancy, and deadline notes before SI-02 requirement accounting.

Other capabilities below are implementation/verification targets. Their inclusion does not establish that every related control is absent throughout the repository.

## 3. Architecture and shared contracts

The canonical flow will be: intake and source capture; requirement accounting; scoped facts and evidence; constraint evaluation; candidate search and validation; decision records; presentation and delivery checks; terminal evidence and learning.

Introduce versioned contracts through small cohesive modules. The filenames below are proposed; SI-00 confirms final ownership and reuses equivalent existing modules.

| Contract | Minimum content and invariant |
| --- | --- |
| `RequirementRecord` | Stable ID; original text; file/sheet/cell or page/span; revision; owner/group; property; comparator; value/unit; quantity basis; hard constraint/preference/exclusion; extraction ambiguity. Originals are immutable. |
| `RequirementDisposition` | Requirement ID and candidate ID/revision; `SATISFIED`, `VIOLATED`, `UNRESOLVED`, `NOT_APPLICABLE`, or `WAIVED`; evaluator and evidence references. Waivers require explicit customer authority and never waive physical impossibility. |
| `EvidenceRecord` | Source identity/type, revision/content hash, exact passage or observation, retrieval/capture time, scope, applicability conditions, authority, and freshness policy. A hash establishes content identity, not vendor authorship or factual correctness. |
| `ClaimRecord` | Claim ID, precise assertion, candidate/requirement references, evidence/rule/calculation references, materiality, supporting/opposing evidence, and supported/contradicted/unknown state. A citation count cannot establish support. |
| `ConstraintResult` | Constraint/rule ID and version, typed inputs and units, ownership, predicate, result, missing inputs, and proof/reference. Constraint results remain distinct from workflow phase statuses. |
| `CandidateAttempt` | Parent and resulting manifest hashes, deltas, affected requirements/constraints, validation result, unresolved blockers, elapsed/search budget, and accepted/rejected/rolled-back/exhausted outcome. |
| `DecisionRecord` | Applicable alternatives, selection criteria, evaluated scope, selected candidate, factual rationale, rejected alternatives, known cost deltas, and outstanding actions. No default optimality or buildability assertion. |
| `EvidenceDependency` | Versioned edges from requirements, facts, rules and sources to claims, candidates, reviews, artifacts and authorizations. Cyclic evidence cannot establish authority. |
| `UncertaintyRecord` | Kind, affected decision/claim, missing fact, impact, and next evidence action. Routing scores, candidate similarity, evidence coverage and calibrated probability use separate fields. |
| `SolutionIntelligenceEnvelope` | Contract version, input/revision identity, track, candidate IDs, requirement coverage, material claims, constraints, decisions, limitations, and independent local/document/portal/delivery/sync states. |

Use sidecar contracts and explicit adapters first. Do not change existing public result shapes or reinterpret legacy records globally. Preserve `null` prices and unknown quantities; no migration manufactures missing observations or retroactively certifies historical records.

## 4. Work packages and dependencies

Delivery states: `PLANNED`, `AUTHORED`, `VERIFIED_SINGLE_AGENT`, `VERIFIED_INDEPENDENT`, and `ACTIVE` with an explicit capability scope. Failed/reverted work retains its records. Source presence and authored skills do not earn runtime closure.

| ID | Work package | Depends on | Primary deliverable |
| --- | --- | --- | --- |
| SI-00 | Current baseline and ownership reconciliation | None | Revision-bound coverage/receipt map and bounded execution backlog |
| SI-01 | Honest claims and trustworthy benchmark arithmetic | SI-00 | Removal of confirmed false assertions; reliable baseline metrics |
| SI-02 | Requirement accounting and typed extraction | SI-00, SI-01 | Source-linked clauses and complete candidate dispositions |
| SI-03 | Claim evidence and contradiction adjudication | SI-02 | Material claim support and source applicability checks |
| SI-04 | Typed constraints and infeasibility diagnosis | SI-02, SI-03 | Constraint explanations and bounded feasibility search |
| SI-05 | Compound execution and verified repair transactions | SI-04 | Requirement-preserving execution and rollback |
| SI-06 | Workload sizing and defensible alternatives | SI-04, SI-05 | Explicit demand models and qualifying trade-offs |
| SI-07 | Unified explanations, dashboard, exports and gates | SI-03; SI-05 for compound/repair paths; SI-06 for sizing paths | Consistent evidence-backed customer outputs |
| SI-08 | Invalidation, retraction and consumed learning | SI-03, SI-05, SI-07 | Dependency-aware reevaluation and demonstrated learning use |
| SI-09 | Skill contracts, registry and activation coverage | SI-02 onward, aligned to each consumer | Five focused skills and updated existing contracts |
| SI-10 | Held-out evaluation, staged release and qualification | SI-01 onward; all required consumers for final release | Final-tree evidence and per-path activation decisions |

SI-09 and the SI-10 evaluation harness evolve alongside their owning implementations. They are not delayed until every runtime change is complete. The SI-07 single-node BOQ presentation pilot reuses current candidate validation and delivery gates; it does not require activating new compound execution or repair behavior. SI-06 workload branches can proceed independently after their shared dependencies; integration remains serial per checkout.

### Repository guardrails and reuse contracts (INV-238 / INV-241–INV-243)

1. **Unreachable-module gate (`npm.cmd run test:deadcode`, `INV-242`)**: `scripts/maintenance/analyze_unreachable_modules.js --fail-on-orphan` rejects any file under `scripts/lib/`, `scripts/config/`, or `scripts/services/` not reachable from a production entrypoint or explicitly listed in `ORPHAN_ALLOWLIST`. Any additive module under `requirements/`, `evidence/`, or `constraints/` must either be wired behind an opt-in/sidecar seam at creation or explicitly registered in `ORPHAN_ALLOWLIST` until wired.
2. **Runtime Graphify restoration (`INV-238`)**: `scripts/lib/boq/boq_evaluator.js` calls `queryLocalGraphifyNeighborhood` at runtime; restoring `npm.cmd run update:graph && npm.cmd run verify:graph` in SI-00 restores both agent discovery and runtime category-dependency escalation.
3. **Reuse `INV-241`–`INV-243` foundations**: SI-02, SI-05, and SI-06 extend `attribute_vectors.js`, `attribute_equivalence_mapper.js`, `cross_solution_pricing.js` (nullable prices and shifted-column recovery), `attachCompanionServices`, and `route_query.js` continuations (`_evaluatePartitionedClusters`, `_handleWorkloadDna`, `_continueOcrDownstreamIfRequested`) instead of duplicating equivalents.
4. **Dual-Brain guardrail and MCP parity**: SI-03/SI-07 feed `RequirementRecord` and `ConstraintResult` summaries into `agentic_guardrail.js` / `guardrail_prompt.js` so LLM reviews audit against explicit customer hard constraints, and expose the `SolutionIntelligenceEnvelope` projection through `scripts/services/mcp_server.js`.
5. **Skill & complexity conformance (`INV-229`/`INV-242`)**: All new modules keep every function at `CC <= 30` (target `CC <= 15`) with zero oxlint warnings; SI-09 skills satisfy `scripts/maintenance/validate_skills_integrity.js` and 1:1 registration with `scripts/config/skill_workflow_registry.js` and `AGENTS.md`.
6. **Hybrid execution model**: M1 (`SI-00` + `SI-01`) runs serially in the primary checkout; M2–M5 run in lean waves (`2–3` authors with `workspace:"share"` + `1` independent `verifier` per wave, serially integrated by the coordinator); M6 (`SI-10`) uses `run_workflow` fan-out plus full combined gates.

### SI-00 — Establish the actual current baseline

Actions:

1. Record HEAD, dirty/untracked source manifests, dependency versions, relevant configuration/catalog hashes, and protected customer/cloud state. Reuse the existing accepted-tree isolation helpers.
2. Reconcile CP6/7/8/9/10/11/12/13/14/18 notes against current exports, consumers, flags and exact-source receipts. Classify each as implemented, exercised, independently verified, active, superseded, or unverified.
3. Restore the local Graphify graph using the repository maintenance procedure. Record missing/failed discovery explicitly; do not block direct scoped inspection indefinitely or label stale graph data current.
4. Map JS, CLI, dashboard and MCP entrypoints to their actual canonical handlers and exporters. Reconcile registry descriptors with those paths.
5. Build a disposition register for each issue in Section 2 and each broader capability. Avoid reopening resolved November repair/receipt defects without current evidence.

Acceptance: every planned edit has an owning module, consumers, current behavior, verification owner, intended difference, rollback scope, and required scenario. Historical pass counts are not carried into this revision.

### SI-01 — Remove false assertions and repair measurement

Owners: `reasoning_post_analyzer.js`, `decision_trace.js`, `test_boq_eval_benchmarks.js`, their focused tests, and consumers of benchmark reports.

Actions:

1. Render memory channel counts, power margins, slot facts and cable requirements only from validator facts/scoped rules. Unknown inputs produce unknown conclusions. Display the actual headroom policy used in the calculation.
2. Replace empty-ledger certification with a factual no-decisions record. Preserve unknown cost deltas as null.
3. Make Tier 2 reporting consume the canonical verified document-review result, including authoritative citation identity and candidate binding. Do not duplicate weaker checks in prose code.
4. Compare complete expected and detected violation sets. Record false positives, false negatives, invalid results and abstentions separately. Unexpected violations fail clean scenarios.
5. Define zero-denominator metrics as not measurable rather than 100%. Missing confidence remains null; remove fixed tier-validation claims. Benchmark regressions set a nonzero command outcome.
6. Route benchmark JSON persistence through `safeWriteJsonAtomic`; use isolated fixture/output roots. Update report consumers for nullable metrics and retain the old report schema/version for historical reads.

Acceptance cases: missing channel width, non-default headroom, PCIe shortage with unknown cause, empty decision trace, unsupported Tier 2 citation, clean BOQ with an extra violation, no detected positives, absent confidence, and a changed report schema. No new hardware conclusion may originate in a presentation template.

### SI-02 — Preserve and evaluate every requirement

Owners: `requirement_intent_resolver.js`, `boq_parser.js`, `configuration_context.js`, router sizing intake, OCR provenance, and existing conservation gates. Proposed helpers: `requirements/requirement_records.js`, `requirements/typed_values.js`, and `requirements/coverage.js` under `scripts/lib/boq/`.

Actions:

1. Preserve file/cell/page/text provenance and all unparsed clauses before normalization. Assign stable IDs within an immutable input revision.
2. Parse unit-bearing values and comparisons: min/max/exact, cores/socket/node/cluster, DIMM count versus RAM capacity, raw versus usable storage, network speed/ports, redundancy, support duration/SLA, deadline and currency-qualified budget.
3. Fix the unqualified `max` budget match. Recognize negation, exclusions, spares, per-owner allocation and shared infrastructure. Do not treat a preference as a physical rule.
4. Keep ambiguous interpretations as alternatives with an affected-decision record. Ask only consequential clarifications; unresolved hard requirements block the relevant positive claim or recommendation.
5. Attach dispositions to every candidate. Link quantity coverage to the existing conservation ledger and B18 instead of maintaining independent arithmetic.
6. Include normalized requirement content and revision in review/delivery fingerprints. Unknown legacy clause coverage remains unknown until reevaluated.

Acceptance cases: `max 64 cores` with no budget; explicit USD budget; 512 GB per node across 20 nodes; shared/spare optics; usable RAID capacity; do-not-substitute requirement; support SLA; contradictory node counts; Unicode/decimal units; and a clause the extractor cannot interpret. Every clause is accounted for even when extraction fails.

### SI-03 — Bind claims to applicable evidence

Owners: `nlm_solution_source_validator.js`, source trust-set utilities, `local_rag_search.js`, `solution_evidence.js`, `portal_receipt.js`, and acceptance adapters. Proposed helpers: `scripts/lib/boq/evidence/claim_records.js` and `evidence/source_adjudicator.js`.

Actions:

1. Register existing deterministic calculations, catalog observations, official document passages, and portal captures as typed evidence records. Keep customer/candidate content untrusted and exclude it from authoritative support.
2. Bind material claims to specific passages/predicates. Validate product/generation/base/owner/selector/region/date applicability. Normalize source revision and passage identity across local and cloud retrieval.
3. Use mechanical checks for source identity, numeric values, scope and freshness. A model may propose semantic support; unresolved or disputed material support stays unknown until adjudicated. Model agreement is not independent authority.
4. Preserve conflicting evidence with scope, authority and capture dates. A recent source cannot override a differently scoped rule solely because it is newer.
5. Track local checks, document grounding, live acceptance and publication independently. Partial evidence cannot be flattened into an overall verified badge.
6. Preserve current exact-manifest portal verification. A new claim layer must not weaken B19, source cleanup, receipt freshness or captured-artifact checks.

Acceptance cases: correct citation with wrong generation; candidate self-citation; inaccessible source inventory; changed source content with unchanged timestamp; conflicting regional availability; a conditional note applied without its selector; valid document support with no portal receipt; stale/changed-manifest receipt rejection.

### SI-04 — Make constraints explicit and diagnose infeasibility

Owners: domain aspect checkers, topology/conflict graph, scoped rule handlers and candidate validators. Proposed helpers: `scripts/lib/conflict/constraints/constraint_results.js` and `constraints/conflict_explanations.js`.

Actions:

1. Adapt existing checks into typed predicates with units, ownership, source/rule version, explicit missing inputs and separate PASS/FAIL/UNKNOWN/NOT_APPLICABLE results.
2. Evaluate hard constraints before preference scores. Missing domain profiles and unavailable rules remain NOT_EVALUATED/unknown through the public response.
3. Return a small conflicting constraint set with requirement IDs and evidence. Label it irreducible only when removing each included constraint has been checked in the declared model.
4. Use existing bounded enumeration/repair first. If a pilot demonstrates combinatorial coverage gaps, evaluate a solver adapter on a scoped finite catalog; record tool/library selection separately before introducing a dependency.
5. Report `FEASIBLE_IN_EVALUATED_SCOPE`, `INFEASIBLE_IN_EVALUATED_SCOPE`, `UNKNOWN`, or `SEARCH_EXHAUSTED`. Define state/time/candidate limits and retain the best validated candidate. No universal vendor-impossibility claim follows from a catalog miss.

Acceptance cases: impossible CPU/thermal combination, shared slot collision, owned backplane/controller dependencies, endpoint constraints, unknown electrical input, missing profile, iteration exhaustion, and a feasible solution missed by an intentionally restricted search. Scope and budget accompany every infeasibility/optimality claim.

### SI-05 — Execute compound requests and repairs as verified transactions

Owners: router/planner/shadow modules, canonical evaluator, `counterfactual_repair.js`, `strategy_synthesizer.js`, execution trace/cancellation utilities, and delivery authorization.

Actions:

1. Adapt verified requirement records into the existing planner. Retain all requested operations, their order, exclusions, prerequisites and owner scope.
2. Validate existing continuations before adding new ones. Qualify objective paths separately: BOQ, RFP/workload, OCR intake-to-objective, reconciliation, cross-vendor, and mixed-domain.
3. Turn repair proposals into isolated candidate attempts: snapshot; apply exact delta; revalidate applicable domains/topology/lifecycle/requirements; accept or roll back. Reconcile every hardware/evidence/operational blocker with a typed outcome.
4. Keep candidate hashing, cycle detection and iteration limits. Include elapsed budget and cancellation/deadline propagation; a rejected attempt cannot mutate the baseline or retain a stale review receipt.
5. Use one terminal workflow owner and existing phase lifecycle. Shadow execution observes one real invocation; it must never issue a second cloud call, export or hardware evaluation to compare behavior.
6. Activate a path only after intended differences and independent qualification are recorded. Preserve structured original errors when observation/reflection/reporting also fails.

Acceptance: compound request to ingest, reconcile and export with a real second baseline; negative operation instructions; exact once-only invocation; changed-candidate invalidation; simultaneous hardware and evidence blockers; repair regression rollback; timeout/cancel; and return of best validated state after exhaustion.

### SI-06 — Ground sizing and alternative selection

Owners: workload DNA, RFP sizing, resource arbitrator, least-delta combinator, strategy ranking, budget optimizer, support policy, and delivery pacing.

Actions:

1. Add explicit workload demand records: throughput/concurrency, latency/SLA, working set, growth, resilience/failure mode, software constraints, and measured/vendor sizing basis.
2. Distinguish user facts, cited measurements, assumptions and estimates. Missing critical demand yields a sizing draft or scenario range with the next required input.
3. Implement a pilot in one supported workload with available authoritative sizing evidence. Add further workload profiles only after the same conformance checks; do not extrapolate performance from a workload label or hardware generation.
4. Qualify candidates against hard requirements and domain evidence before ranking. Preserve customer closest-rank policy: changed SKU lines, then changed units among eligible equivalent candidates; record workload/capability trade-offs separately.
5. Show distinct non-dominated trade-offs for cost, delivery and performance. Missing prices/lead times remain unknown; quote/list/historical prices, currency/region and observation dates remain distinct.
6. State the evaluated candidate set. Use global-minimum language only when completeness is demonstrated for the declared finite scope.

Acceptance: same workload label with different demand; N+1 capacity loss; raw/usable storage; memory/NUMA trade-off; required fabric parity; explicit service requirement; null prices; stale lead time; deterministic ranking under input permutation; and an attractive cheap candidate that violates a hard requirement.

### SI-07 — Present one consistent result and enforce delivery policy

Owners: `eval_output_serializer.js`, reasoning analyzer, decision trace, `bom_verifier.js`, workbook generators, dashboard result/narrative/matrix components, `workflowEvidence.js`, `exportEligibility.js`, and server-side export binding.

Actions:

1. Build a pure decision projection consumed by all presenters. Show outcome; requirement coverage; changes and reasons; alternatives; unresolved facts/actions; separate evidence states.
2. Remove engineering inference and blanket assertions from templates. Provide concise factual rationale with expandable source/calculation references, rather than a speculative internal reasoning transcript.
3. Add requirement and evidence views to analytical workbooks/dashboard. Keep the vendor portal workbook's required seven-column layout intact; use the analytical workbook or evidence sidecar for added detail.
4. Bind customer-facing decision content and evidence revisions into authorization fingerprints. Reuse canonical fingerprint functions and server-held candidate identities.
5. Before finalizing positive recommendations, enforce: no omitted clauses; no violated/unresolved hard requirements; no unsupported material claims; current applicable validation; valid quantities; and existing required delivery gates. Useful diagnostic and provisional reports remain distinguishable from final deliverables under current watermark/quarantine policy.
6. Ensure UI/export/API consumers do not promote local-only, incomplete document review or failed synchronization to vendor acceptance or published status.

Acceptance: identical candidate facts and coverage in JSON/UI/XLSX/narrative; no claim from an empty trace; unavailable evidence visible; changed requirement/source invalidates export; browser and direct export API agree; diagnostic output remains useful without false acceptance.

### SI-08 — Invalidate dependent conclusions and prove learning use

Owners: `active_knowledge_router.js`, feedback/retraction utilities, shared/scoped registries, knowledge sync, local retrieval/cache readers, evidence fingerprints and artifact readers. Proposed helper: `scripts/lib/boq/evidence/dependency_index.js`.

Actions:

1. Index versioned dependencies from sources/rules/requirements through decisions to artifacts and authorizations. Invalidation is evaluated at every read/authorization boundary; a stale index cannot grant acceptance.
2. A changed requirement, source revision or retracted rule marks dependent claims and reviews stale and queues explicit reevaluation. Preserve original receipts/history; do not silently replace published historical files.
3. Reuse append-only retraction/supersession. Keep operational incidents and user preferences separate from physical rules. Agent-generated explanations cannot become independent evidence for themselves.
4. Record retrieved rule IDs versus actually applied IDs and their effects. Demonstrate fresh-process trigger, non-trigger, wrong-scope and retracted-rule behavior without prompt hints.
5. Measure repeated-incident recovery outcomes and regressions. A no-new-lesson run is valid; cloud sync status remains separate from local consumption and hardware correctness.

Acceptance: a retracted rule stops affecting new candidates; dependent cached answer/export becomes stale; unrelated product remains valid; restart reads correct state; atomic-write failure preserves the prior record; reflection failure preserves the original evaluation failure.

### SI-09 — Make skill instructions executable and non-overlapping

Create these five skills only with their implemented consumers and accepted contracts:

| Skill | Owns | Integration point |
| --- | --- | --- |
| `requirements-accounting-skill` | Clauses, units, ownership and coverage | SI-02 intake and candidate dispositions |
| `claim-evidence-adjudication-skill` | Claim support, applicability, contradictions and dependency references | SI-03/SI-08 evidence services |
| `constraint-diagnosis-skill` | Constraint explanations and bounded feasibility diagnosis | SI-04/SI-05 validator/search interface |
| `decision-uncertainty-skill` | Assumptions, consequential clarification and uncertainty types | SI-02/SI-05/SI-06 decisions |
| `solution-quality-evaluation-skill` | Held-out scenarios, independent expected outcomes and quality metrics | SI-01/SI-10 engineering evaluation |

Extend router, RFP/workload DNA, self-correction, output validation, execution trace, continuous learning, degraded mode and workbook skills at their owning packages. Each skill requires a trigger/non-trigger boundary, inputs/outputs, bounded failure path, implementation owner, tests/scenarios and evidence of actual consumption. Use progressive references; keep runtime contract schemas as the source of truth.

Reconcile the existing workflow registry instead of creating another dispatcher. Update relative links, current coverage limits, host triggers, schema references and graph mappings. Fix invariant-ID drift against `docs/INVARIANTS.md`; skill lint is not semantic hardware verification. Follow the skill-creator instructions when these files are actually authored.

Acceptance: registry/schema/link checks pass; every new skill reaches its intended consumer; non-trigger and wrong-scope cases stay inactive; instructions do not conflict with offline policy or vendor-evidence boundaries. Documentation-only authoring cannot activate a customer path.

### SI-10 — Measure quality and release proven paths

Owners: existing benchmark/test runners, canonical pipelines, CI, browser gate, skill/graph auditors, and a proposed `tests/fixtures/solution_intelligence/` scenario set.

Evaluation design:

1. Keep deterministic regressions, development examples and held-out evaluation separate. Tag synthetic, anonymized customer-derived, offline, live and replayed evidence. Do not use production customer files as writable fixtures.
2. Start with at least 24 independently adjudicated scenario families covering the matrix below. Maintain development and held-out variants for each; record actual cases and denominators instead of treating the family count as sample size.
3. Have an independent evaluator adjudicate expected constraints, required dispositions and claim support. Generator-produced expected prose and model consensus cannot certify their own outputs. Preserve reviewer disagreements until resolved.
4. Record source/model/prompt/tool/fixture versions, scope and evidence environment. Model/cloud changes rerun affected evaluations; unchanged deterministic receipts can be reused within their exact dependencies.
5. Gate high-severity safety/correctness failures individually. Report performance and calibration only where observations and sample size support them.

| Dimension | Required scenario coverage |
| --- | --- |
| Customer tracks | Freeform Q&A, BOQ, RFP/workload, one/two-baseline reconciliation, OCR resumption, cross-vendor, mixed-domain |
| Requirements | Numeric/unit ambiguity, negation, explicit SLA, usable capacity, per-node/global/spare ownership, omitted/unparseable clause |
| Evidence | Wrong generation/source, candidate self-citation, contradictory sources, stale/retracted rule, unavailable inventory, changed manifest |
| Reasoning | Infeasible constraints, search exhaustion, harmful repair rollback, cycle detection, ranking permutation, unknown cost/lead time |
| Lifecycle/interfaces | Offline air gap, cloud failure, timeout/cancel/restart, concurrent runs, JSON/UI/XLSX consistency, direct export gate, live exact-manifest acceptance |

Required metrics:

| Metric | Definition and release use |
| --- | --- |
| Requirement disposition coverage | Clauses with a valid terminal disposition / all adjudicated clauses. Target 100% accounting; unresolved is accounted for but not satisfied. |
| Hard-requirement preservation | Satisfied hard requirements / applicable hard requirements for each recommended candidate. Final recommendation requires all. |
| Material claim support | Adjudicated supported material claims / material claims made, with contradictions and unknowns reported separately. Unsupported positive acceptance is a release failure. |
| Constraint precision/recall | Correct full-set false-positive/false-negative accounting. No positive/negative denominator yields null, not perfect accuracy. |
| False acceptance | Accepted candidates with an independently established failed/unknown mandatory condition. Target zero in designated critical cases; finite success is scope-bound evidence. |
| Repair regression | Accepted repairs introducing a hard violation. Target zero in critical cases; report attempted, rejected and exhausted searches separately. |
| Clarification/abstention | Critical ambiguity caught before consequential action; unnecessary clarification rate; safe abstention versus avoidable incompleteness. Establish baseline before setting a numeric improvement target. |
| Ranking quality | Independent pairwise preference among eligible candidates; requirement violations are never averaged away by ranking scores. |
| Recovery/learning | Correct terminal recovery and repeated-incident improvement with fresh-process applied-rule evidence. |
| Latency/resource use | End-to-end median/tail time, tool calls and search budget per scenario/environment. Set operating limits from SI-00 baseline; no invented universal threshold. |

## 5. Verification, rollout and rollback

For each package, the designated implementation executor runs focused meaningful tests and affected-consumer seams in an accepted-tree disposable workspace. Preserve the current human assignment of testing: the present charter reserves the final combined remediation validation for Antigravity/Gemini. This planning document does not transfer testing ownership; record named author, test executor and independent reviewer when execution begins.

Checks planned, not run during this planning task:

- Targeted existing/new contract, parser, evidence, repair, ranking and serializer tests selected from the changed consumers; non-empty discovery is mandatory.
- Affected domains through `npm.cmd run test:domain -- <domain>`; `npm.cmd run test:smoke` at integration boundaries.
- `npm.cmd run lint:core`, dashboard lint for dashboard edits, `npm.cmd run lint:complexity` with the current global CC <= 30 ceiling, `npm.cmd run test:circular`, `npm.cmd run test:deadcode` (`INV-242`), and `npm.cmd run audit:blindspots` (`INV-243`).
- `npm.cmd run test:skills`, `node scripts/maintenance/validate_skill_workflow_registry.js`, Graphify refresh/integrity (`npm.cmd run update:graph && npm.cmd run verify:graph`) and dashboard production build after affected implementation/skill changes.
- Existing browser release checks when result rendering, workflow or export contracts change.
- Final deduplicated deterministic matrix on the actual combined tree, followed by separately recorded live NotebookLM/OCA/cloud qualification for declared paths.

Use existing execution-policy boundaries to prevent external writes during isolated testing; flags alone do not prove air-gap behavior. Retain exact source/config/fixture hashes, commands, logs, durations, counts, exit codes, skips, protected-state comparisons and unresolved failures. Do not rerun broad suites after a documentation-only change or unchanged-source promotion.

Rollout stages:

1. Additive versioned records and legacy adapters, without acceptance changes.
2. Report-only comparison of the new projection against one actual invocation. Declare intended semantic differences before activation.
3. Activate a single verified capability path in offline scenarios, then online document review, then live vendor acceptance where that path requires it.
4. Enable delivery-policy integration only when fingerprints, all exporters and server-held authorization agree. Unknown new mandatory checks cannot silently inherit a legacy PASS.
5. Expand by track/domain/profile after its conformance and independent receipt. A successful server flow does not certify Synergy composite, storage, networking or tape flows.

Use existing flags when suitable; proposed capability selectors are versioned configuration, default inactive until qualified. Do not add one global switch for every track. Disable/revert the exact path on false acceptance, requirement loss, inconsistent export status, stale authorization, repeated execution, or regression of current offline behavior. Return to the last validated state, preserve evidence, and quarantine affected artifacts. Rollback cannot restore an authorization already invalidated by a changed source or requirement.

Migration: read legacy records through explicit adapters; missing fields stay unknown. New records use a new schema version. Preserve old exports/reports as historical artifacts. Do not backfill claim support or requirement satisfaction from past summary flags. Keep external publication and other-user access verification separate from local file generation.

## 6. Milestones and usable increments

| Milestone | Includes | User-visible result |
| --- | --- | --- |
| M1: Honest baseline | SI-00/SI-01 | Trustworthy claims and benchmark arithmetic; existing workflows remain usable. |
| M2: Requirement/evidence pilot | SI-02/SI-03/SI-07 for one supported single-node BOQ path | Every customer clause and material conclusion is traceable in API, dashboard and analysis output. |
| M3: Verified solution reasoning | SI-04/SI-05/SI-06 pilot | Diagnosed conflicts, validated repairs and sizing/ranking rationale with explicit assumptions. |
| M4: Cross-track continuity | Remaining SI-05/SI-06/SI-07 track scopes | OCR, RFP, reconciliation, cross-vendor and mixed-domain operations retain intent and evidence through delivery. |
| M5: Durable learning and skill conformance | SI-08/SI-09 | Retracted knowledge invalidates dependent answers; new skills demonstrate actual use. |
| M6: Qualified release | SI-10 final combined gates | Independently reviewed current-tree receipts, declared coverage and separately evidenced live stages. |

Do not attach calendar promises before SI-00 establishes actual consumer count, reusable receipts and workload pilot evidence. At that boundary, estimate small independently reviewable changes, identify critical dependencies, and forecast each milestone from observed throughput. A skill count, historical suite count or percentage of equally weighted checkpoints is not an effort estimate.

## 7. Completion criteria and immediate next step

The declared implementation scope is complete only when:

1. Every confirmed Section 2 issue is fixed and independently verified or explicitly superseded with current source evidence.
2. Every customer track/profile in the release scope has requirement and claim coverage through its actual execution/export seams; unsupported profiles remain explicit.
3. Final recommendations preserve hard requirements, have current applicable validation, and contain no unsupported material engineering claims in the designated critical suite.
4. Modified candidates, changed requirements and changed/retracted evidence invalidate dependent review/delivery state across all enabled consumers.
5. The five new skill contracts and updated existing skills have real consumers and passing trigger/non-trigger coverage.
6. Current combined lint, CC <= 30, dependency, test, browser and graph checks meet their gates; skipped live work is not represented as passing.
7. Local checks, document grounding, authenticated vendor acceptance, cloud publication/readback and access verification remain separate reported evidence states.

Immediate next implementation slice: SI-00 reconciliation, then SI-01 factual narrative/empty-ledger fixes and benchmark arithmetic, with source-bound focused acceptance. SI-02 follows with the `max 64 cores` parser counterexample and source-linked requirement records. No production implementation, commits, publication or skill activation are performed by this planning task.

## 8. Planning handoff

Original Plan Author: Codex (static review of `329ec34e`). Plan Amended & Solidified: Antigravity (incorporating Section 2A additional findings, `INV-238`/`INV-241`–`INV-243` gates, and hybrid wave-swarm execution governance). Implementation/test status: IN_PROGRESS (`M1: SI-00 / SI-01` executing under Antigravity as Execution Lead + Test Executor with independent wave verification; Codex CLI peer review optional when launcher is available).

This document is the implementation roadmap. It supplements, rather than rewrites, historical CP receipts and closure records. Preserve unrelated changes, maintain one integrator per checkout, and commit/push/publish only under explicit user scope.


## 9. Resumption Plan (recorded 2026-11-21 IST; execute in order when the execution model quota resets)

**State on disk:** `SI-00`..`SI-10` code is complete and verified offline (SI-10: 48/48 scenarios, 24 dev + 24 held-out, 0 false acceptances; combined SI unit suites 99/99; lint 0/746 files; CC <= 30; 0 cycles; 39/39 skills; registry valid; graph 39/39 connected). Nothing is committed. Live OCA/NotebookLM/cloud qualification has NOT run and stays `PORTAL VALIDATION PENDING`.

**User authorization (explicit, 2026-11-19):** the user has now explicitly instructed knowledge/doc updates, a commit and a push of all the above changes. This supersedes the default "never commit/push without instruction" rule for this change set only.

### Remaining steps (in order)
1. **Retire** swarm workers `verifier` and `monitor`.
2. **Save SI-10 receipt:** `node scripts/maintenance/evaluate_solution_intelligence_quality.js --save`.
3. **Final gates** (PowerShell 5.1, no `&&`): SI-01..SI-10 unit suites; dashboard Vitest + `npm.cmd run build`; `node tests/e2e/test_dashboard_full_portfolio_e2e.js`; `test:smoke`; domains `conflict`, `router`, `sync`, `aspects`, `catalog`; `lint:all`; `lint:complexity`; `test:circular`; `test:deadcode`; `test:skills`; `validate_skill_workflow_registry.js`; `audit:blindspots`; `update:graph` then `verify:graph`.
4. **Restore test-dirtied tracked files** (`git checkout -- outputs/ProLiant/Gen12/DL380_Gen12/history/quarantined_deltas.json outputs/history/master_knowledge_registry.json outputs/history/master_universal_knowledge_charter.md outputs/history/test_failure_ledger.json`), keeping only `outputs/history/solution_intelligence/*`. Never touch `scripts/config/notebooks.json` or tracked `tests/fixtures/BENCH-*.csv`.
5. **Knowledge and documentation updates (new, requested):**
   - `docs/INVARIANTS.md`: add `INV-244` (typed requirement accounting + `max 64 cores` budget fix, SI-02), `INV-245` (claim/evidence adjudication and independent evidence lanes, SI-03), `INV-246` (typed constraints, ablation-verified infeasibility, bounded search, SI-04), `INV-247` (verified repair transactions, compound workflow once-only execution, SI-05), `INV-248` (workload demand provenance, pre-ranking qualification, Pareto/null preservation, SI-06), `INV-249` (unified decision projection, B22-B24 gates, strict document-review check, SI-07), `INV-250` (evidence dependency index, invalidation, segregation of incidents/preferences/self-explanations, SI-08), `INV-251` (39-skill registry conformance, SI-09), `INV-252` (held-out quality evaluation with honest null denominators, SI-10). Keep `INV-244`+ numbering consistent with the highest existing id and update the "INV-1 through INV-NNN" references.
   - `AGENTS.md` and `.agents/AGENTS.md`: update the invariant range, the certified-benchmark paragraph (new counts), and reference the certification report and this plan.
   - `.agents/DATA_DICTIONARY.md`: add schemas for `RequirementRecord`, `EvidenceRecord`/`ClaimRecord`, `ConstraintResult`, `SolutionIntelligenceEnvelope`, `EvidenceDependency` index, `WorkloadDemandRecord`, SI-10 receipt.
   - Learning records: add a `scripts/maintenance/record_solution_intelligence_learnings.js` (modeled on `record_skills_and_reasoning_learnings.js`, CC <= 15) with `WORKFLOW_*` advisories for the lessons below, run it for `DL380_Gen12`/`DL380a_Gen12` and verify reachability; do not set `hardwareCompatibilityCertified`.
   - Write `docs/audits/2026-11-19-solution-intelligence-certification-report.md` (gate numbers, SI-10 dev vs held-out metrics, receipt hashes, verifier-caught defects and fixes, offline-verified vs live-unexecuted separation) and set this plan's status line to `CERTIFIED_OFFLINE_COMPLETE (M1-M6 SI-00..SI-10; live qualification recorded separately)`.
   - Re-run `lint:all`, `test:skills`, `validate_skill_workflow_registry.js`, `update:graph`, `verify:graph` after doc/learning edits.
6. **Commit and push (explicitly authorized):** review `git status`/`git diff --stat`; stage by explicit paths (code, tests, fixtures, skills, docs, `outputs/history/solution_intelligence/*`, graph artifacts only if tracked); no `git add -A` of unrelated files; commit in logical commits (M1, M2, M3, M4-M5, M6+docs) or one well-described commit; `git push` to the current branch's remote. Do not force-push. If push is rejected, report; do not rewrite history.

### Lessons to record (knowledge updates)
- Never default missing capacity/price/lead-time; keep `null`/`UNKNOWN` through ranking and presentation.
- A bare `{ success: true }` is not a verified document review; require grounded, detached, double-checked, cited, non-mock review.
- Verifier caught 8 + 7 defects across waves; independent verification per wave is mandatory.
- Segregate operational incidents, user preferences and agent self-explanations from physical rules; keep `WORKFLOW_REVIEW` advisories reachable.
- Keep portal workbook 7-column layout intact; add analytics only to analytical workbooks.
- Model/quota pause lesson: prefer disjoint-file swarm authors on `workspace: inherit`; checkpoint on disk before quota exhaustion.
