# Bounded remaining implementation handoff — 9 October 2026

This preserves reasoning required to finish pending work. No unfinished implementation below is certified. Source of acceptance: checkpoint ledger and source-bound receipts, not this narrative.

## Query-choice intelligence (partial CP7c/CP12)

Inputs: scripts/lib/boq/presales_disambiguation.js, scripts/evaluators/route_query.js and archived outputs/history/skill_workflow_excellence/2026-10-09/continuation-5-39/user_platform_selection_store.unverified.js. Verify actual paths/source before editing. Candidate copy: Temp/codex-disambiguation-intelligence-20261009. Only syntax was checked for the archived store.

Persist USER_PLATFORM_SELECTION as a user preference with exact normalized query, actual selected known platform, candidate scope and time. It is not a hardware KnowledgeDelta or vendor acceptance. Use safeWriteJsonAtomic and owner-aware workflow leases. Consult matching records before the platform-dependent handler; explicit conflicting context wins. Report retrieved versus actually used IDs separately.

Unresolved AMBIGUOUS_QUERY returns ACTION_REQUIRED with factual questions before handlers/side effects. Do not block all confidence below.95 (ordinary freeform.8 remains usable). Unknown/multiple selections yield null. Never invent a recommended Gen12 platform, base SKU, QuickSpecs ID or verified human evidence. Resolve base chassis from authoritative local catalog/profile or null.

Prove consumption by rerunning the original query WITHOUT injecting selected context and showing the stored decision was actually used. Explicit-context routing alone proves clarification, not learning. Avoid circular imports: standalone store, lazy helper routing or injection. Preserve17 intents/public exports and disclose intentional differences.

Checks: invalid choices; wrong scope/unrelated query/missing record/conflicting context; fresh-process record consumption before handler; no fabricated hardware feedback; explicit context alone not labelled learned. Isolated author owns helper/router/store and focused tests only.

## Pricing presence (partial CP10a/CP8b)

Inputs: scripts/lib/boq/multi_group_plan.js, scripts/lib/boq/configuration_context.js, scripts/lib/boq/boq_parser.js; verify paths/callers. Candidate copy: Temp/codex-pricing-presence-20261009; no completed receipt.

Known gaps: writeGroupInput unitPriceUsd??0 manufactures prices; price||0 arithmetic converts unknown to zero. Preserve blank/unknown through actual XLSX round-trip. Preserve explicitly confirmed zero as0 with provenance, using additional headers/parser support only where necessary. Existing parser defaults0 are not proof of a confirmed zero.

Provide knownOrderSubtotalUsd while incomplete totalOrderCostUsd stays null with pricingComplete/priceUnavailableSkus. Complete known-price behavior stays stable. NaN/Infinity/negative/string values are not observed prices unless existing explicit normalization establishes otherwise. Never substitute catalog list price for a missing customer quote price. Audit numeric-total consumers for null safely.

Checks: actual writeGroupInput workbook to canonical parse and quantity context; missing/unconfirmed0/confirmed0/positive/invalid; nine-node and global quantities scale once; complete-price parity. Keep source scope to context/plan/minimal parser and any small pricing helper. No boq_evaluator.js or route_query.js writes in this lane.

## Delegation and integration

Use repository agy-orchestration/SKILL.md. User selected gemini-3.8-flash-high with effort high. Supply exact sources, absolute allowed writes, specific tests and receipt path. Native Agy workers can run independently; verify actual invocation/cwd and disjoint ownership. Codex owns semantic decisions and independent acceptance. No broad repeated audit, full context resend or full matrix for two-file fixes.

Retain failed evidence, fix the demonstrated counterexample, rerun only invalidated checks. Before integration verify current preimages, copy accepted changes, run required composition checks, archive artifacts, update plan/ledger/current snapshot and commit locally to main. User has authorized local commits; no push requested. A cancelled/unknown remote request stays NOT_VERIFIED unless an owned provider contract actually yields its result. Source attachments and live scraping remain distinct unresolved qualifications.

## Implemented supersession — revision 5.43

Query-choice contract above is now integrated in db32541; do not reimplement. Pricing presence above is integrated in this checkpoint and independently accepted for its bounded paths. Resume from current-status and exact acceptance receipts.

## Implemented supersession — revision 5.44

Price basis in `budget_optimizer.js` and honest nullable schema in `schemas.js` are now integrated and verified:
1. `schemas.js`: Added `NullablePriceNumber` (validates floats, strips currency syntax, preserves `null` for null/undefined/'N/A'/'NULL', rejects negative numbers). `BOQItemSchema.unitPriceUsd` now defaults to `null` and supports `inputUnitPriceUsd`, `quotedUnitPriceUsd`, `catalogListPriceUsd`, `extendedPriceUsd`, and `isConfirmedZeroPrice`. `CoercedNumber` remains unmodified for non-price numeric contracts.
2. `budget_optimizer.js`: Lines 95–108 now preserve `quotedUnitPriceUsd` from customer quotes, record `catalogListPriceUsd` from catalog/receipt, leave unquoted items as `unitPriceUsd = null`, and return `quotedBomCostUsd: null` whenever unquoted items exist. Exposes `knownQuotedSubtotalUsd`, `hasUnquotedCustomerItems`, `pricingBasis`, and `pricingComplete`.
3. Verification: `tests/unit/test_schemas.js` (6/6 pass, 46 assertions across suite) and `tests/unit/test_budget_optimizer_boundaries.js` (3/3 pass, including quoted discount preservation, unquoted null retention, and hybrid quote calculation). 0 circular dependencies, CC <= 131 <= 135, 0 new lint warnings.
4. Created `.agents/skills/epistemic-verification-skill/SKILL.md` and codified Anti-Patterns 15–19 (`INV-158` to `INV-162`) in `.agents/rules/epistemic_truth_and_deep_reasoning.md`.
5. Next gate: Batch A reliability & process lifecycle (CP11a root trace, CP11b terminal serializer phase 8/9 split, CP8b multi-node scaling, CP6b telemetry activation).
