# Solution reasoning and self-correction gap review

Date: 2026-11-08

Scope: static inspection of canonical query routing, BOQ reflection, counterfactual repair, explanation generation, and their focused tests. Graph discovery used `graphify query` before tracing the implementation. This is a bounded review, not whole-repository certification. No production code was changed and no tests, live vendor checks, or cloud operations were run. Runtime validation remains with Antigravity/Gemini under the repository's evidence-workflow contract.

## Conclusion

The most consequential weakness is that the explanation and repair layers can assert stronger conclusions than their supporting calculations and evidence. Additional model intelligence cannot compensate for this boundary. Treat explanations as renderings of verified results and repairs as hypotheses until the complete changed candidate is revalidated.

## Verified static findings

### R1 — P1: Proposed repairs assert buildability even when their own inequalities fail

Owner: `scripts/lib/system/counterfactual_repair.js:53-78`, `:286-310`, `:404-423`.

The PSU selection caps at 2200W for every requirement above 1600W, then unconditionally emits `100% BUILDABLE`. A requirement of 3000W produces the textual assertion `2200W >= 3000W`, with a negative margin. The PCIe branch similarly claims new capacity meets demand without checking the inequality. Eight required cards and a selected three-slot riser can remain infeasible.

The generator does not apply the deltas or call a validator. The canonical evaluator attaches its results at `scripts/evaluators/eval_boq.js:1585-1593`; the explanation explicitly advertises proofs for 100% buildability at `scripts/lib/system/reasoning_post_analyzer.js:289-291`.

Fix: emit `PROPOSED_UNVALIDATED`; validate arithmetic predicates; apply deltas to an isolated candidate; run the complete applicable domain and topology checks. Preserve separate local, document, and vendor evidence states. This finding establishes misleading repair claims, not a demonstrated bypass of delivery authorization.

### R2 — P1: Repair selection bypasses product scope and customer service requirements

Owner: `scripts/lib/system/counterfactual_repair.js:81-150`, `:210-281`, `:343-363`, `:404-417`.

Repair helpers select fixed Gen11/Gen12 parts without receiving the target catalog, platform, generation, or customer requirements. The entry point extracts server count but does not pass product scope into selection. The support repair selects a DL380 Gen11 Essential service, contrary to the stated product-qualified Basic default when support is unspecified. These are code-level selection defects; this review makes no external compatibility claim about individual SKUs.

Fix: reuse scoped candidate discovery and product-qualified service selection. Every proposed item needs owner, quantity basis, catalog/rule identity, and requirement provenance. Missing compatible candidates must yield unresolved dependencies, never a generic substitute.

### R3 — P1: Residual blockers are omitted or misrepresented as hardware additions

Owner: `scripts/lib/system/counterfactual_repair.js:367-399`, `:419-420`.

Residual acceptance blockers are considered only if no other repair proof exists. A power repair therefore prevents residual grounding or receipt blockers from appearing in the repair set. When residual handling does run, it extracts a possible SKU from prose, proposes ADD quantity 1 even when SKU is undefined, and claims the acceptance issue is resolved.

Fix: reconcile every blocker with a typed resolution: hardware change, missing evidence, clarification, unsupported capability, or operational recovery. Require complete blocker accounting. An evidence failure must never become an invented hardware requirement.

### R4 — P1: Reasoning tiers trust summary flags instead of verified evidence contracts

Owner: `scripts/lib/system/reasoning_post_analyzer.js:23-55`, `:479-488`.

Tier 3 is selected from `clicValidation.isValid` or an accepted-status string, without checking a bound current receipt here. Tier 2 trusts a grounding flag and positive citation count. An `errors` array alone qualifies for the description that seven physical aspects were evaluated. The analysis payload also defaults `isMathClean` from absence of errors.

Fix: derive claims from the canonical validated evidence result with manifest and requirement fingerprints, source identity, freshness, and explicit check coverage. Unknown or absent evidence stays unknown. Inspect upstream callers during implementation to avoid duplicating existing receipt verification; the demonstrated defect is this reporting layer's permissive contract, not proof that all upstream receipt checks are absent.

### R5 — P1: Explanations invent independent engineering conclusions

Owner: `scripts/lib/system/reasoning_post_analyzer.js:167-206`, `:239-249`, `:283-285`.

The explanation assumes DDR5-5600 bandwidth, generic cooling thresholds, and fixed OCP repair topology. A 300W CPU enters text claiming a 185–270W heatsink is mandatory. A trail containing an OCP resource type is rendered as a specific controller relocation, slot allocation, bandwidth change, and cache increase without requiring those facts in the trail. Every trail entry is counted as a resolved contention without inspecting a resolution verdict.

Fix: remove engineering inference from prose templates. Render actual validator facts and before/after candidate differences, with rule/source references. Distinguish attempted, rejected, unresolved, and validated repairs. Unknown measurements must not acquire default factual values.

### R6 — P1: Reflection exceptions can still produce PASS

Owner: `scripts/evaluators/eval_boq.js:1628-1657`.

The reflection phase catches analyzer errors and then returns `status: PASSED`, a PASS check for completed reflection, and a Tier 1 fallback. This makes failed reasoning inspection look completed.

Fix: record an explicit failed or action-required reflection result and the error category. Keep previously validated hardware results separate from reflection health. Apply delivery policy according to whether a failed mandatory check affects customer claims; do not silently certify it.

### R7 — P2: Focused tests validate canned answers instead of the asserted guarantees

Owner: `tests/unit/test_counterfactual_repair_and_reasoning.js:25-32`, `:47-53`, `:69-73`.

Reviewed assertions require fixed SKUs and the literal `100% BUILDABLE` status. They do not demonstrate complete validation of the altered candidate. Passing these tests cannot establish the advertised repair guarantee. This finding is limited to the inspected tests, not a claim that no other adversarial tests exist.

Fix: add falsifying cases for requirements above the highest available capacity, cross-generation catalogs, missing source evidence, simultaneous hardware and evidence blockers, zero-delta memory repairs, failed reflection, and rejected correction trails. Assert the changed configuration and its evidence state, not a prose string.

## Architecture required for reliable improvement across query types

The following are design acceptance criteria, not additional repository-wide absence claims:

1. **Requirement coverage:** preserve each customer clause, source span, quantity owner, unit, hard constraint, preference, and unresolved ambiguity. Final answers must account for every clause; classify intent confidence separately from factual confidence.
2. **Claim-level evidence:** each material conclusion references its supporting facts and rules. Track applicability, product scope, source revision, contradictions, and expiry. A citation's existence does not establish that it supports the claim.
3. **Bounded correction:** record failure, propose alternatives, apply one isolated change, revalidate the full affected solution, compare against unchanged customer constraints, and accept or roll back. Use canonical manifest hashes for cycle detection and explicit iteration/time limits. Exhaustion returns the best validated state plus unresolved issues.
4. **Evidence invalidation:** changing requirements, quantities, configuration, or supporting source versions invalidates dependent conclusions and receipts. Validate dependency propagation across outputs, caches, and cloud consumers.
5. **Learning retraction:** retain original evidence and an append-only correction history. Mark wrong rules rejected or superseded; identify downstream claims and cached answers that need reevaluation. Do not erase audit history or promote an agent's own explanation as independent evidence.
6. **Independent verification:** prefer a separate deterministic check or genuinely independent authoritative evidence over asking the generating model to approve itself. Preserve disagreement until it is resolved.
7. **Outcome evaluation:** use held-out customer queries spanning freeform questions, sizing, reconciliation, mixed domains, ambiguity, stale evidence, contradictory sources, and impossible requests. Measure unsupported claims, requirement omissions, repair regressions, abstention quality, and recovery success separately from lint and suite pass rates.

## Recommended execution order

First remove false success and unsupported proof claims (R1, R3–R6). Next replace fixed repair selection with scoped candidates and full revalidation (R2), then strengthen adversarial checks (R7). Finally audit requirement coverage and evidence invalidation/retraction end to end against the design criteria above. Retain portal validation pending until exact current vendor acceptance is independently established.

Perfection for every future customer query cannot be certified. The defensible objective is traceable claims, complete requirement accounting, visible uncertainty, and verified recovery without worsening the solution.
