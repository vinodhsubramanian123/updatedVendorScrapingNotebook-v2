---
name: solution-quality-evaluation-skill
description: >-
  Engineering-only quality evaluation of reasoning traces, held-out benchmark scenarios with
  independent expected outcomes, factual post-analysis audits, and pre-presentation gate scoring
  without zero-denominator inflation. **DO call for**: running held-out BOQ benchmarks, verifying
  factual reasoning post-analysis, and auditing honest quality metrics. **DO NOT call for**: live
  customer BOQ routing (presales-query-router) or hardware sizing synthesis (rfp-sizing-synthesizer).
---

# Solution Quality Evaluation & Honest Benchmark Skill (`solution-quality-evaluation-skill`)

Comply with [Normative Language Standard](../../rules/normative_language.md). Operates strictly in `ENGINEERING` scope (`vendorScope: ['NOT_APPLICABLE']`, `domainScope: ['ENGINEERING']`, excluded from customer BOQ dispatch per `INV-72`). Enforces honest null benchmark denominators (`INV-105`), factual reasoning traces (`INV-191`, `INV-231`), and non-masking acceptance gates (`INV-128`).

---

## 1. Trigger & Non-Trigger Boundaries

### Trigger Conditions (`DO call for`)
- Scoring held-out benchmark scenarios (`scoreBenchmarkScenario`, `computeBenchmarkMetrics`, `runBenchmarkSuite`) against independent expected outcomes while preserving `null` on zero denominators or missing confidence values.
- Auditing post-execution reasoning narratives (`performReasoningPostAnalysis`) to verify that narratives contain only facts grounded in observed audit trails and never elevate Tier-0/Tier-1/Tier-2 outputs to Tier-3 without a verified receipt (`INV-231`).
- Verifying track-specific pre-presentation acceptance profiles (`verifyPrePresentationAcceptance`) under negative, unknown-track, or incomplete response inputs.

### Non-Trigger Conditions (`DO NOT call for`)
- Routing, sizing, or evaluating live customer tenders (`presales-query-router`, `rfp-sizing-synthesizer`, `boq-eval-skill`).
- Mutating `tests/fixtures/` or customer `outputs/` artifacts during benchmark runs (`runBenchmarkSuite` isolates CSV inputs in temporary directories).
- Live OCA/CLIC portal navigation or scraping (`oca-portal-navigator`, `oca-catalog-scraper`).

---

## 2. Inputs & Outputs (`CapabilityHandoffSchema`)

All cross-skill handoffs conform to `CapabilityHandoffSchema` in [`scripts/lib/system/schemas.js`](../../../scripts/lib/system/schemas.js) (`capabilityId`, `scope`, `artifactRefs`, `evidenceRefs`, `unresolvedRequirements`).

| Direction | Function / Contract | Schema & Required Fields |
| :--- | :--- | :--- |
| **Input (Post-Analysis)** | `performReasoningPostAnalysis({ queryText, context, classification, responseData, traceId, executionTimeMs, evidenceLedger })` | Query text, context (`persistLedger`, `isolatedMode`), intent classification, evaluation response payload |
| **Output (Post-Analysis)** | `ReasoningAnalysis` | `traceId`, `intent`, `epistemicIntegrity` (`tier`, `vendorAcceptancePending`, `receiptFingerprint`), `reasoningNarrative`, `counterfactualRepairProofs`, `transparencyAudit`, `acceptanceGate`, `feedbackResult` |
| **Input (Acceptance Gate)** | `verifyPrePresentationAcceptance(outputArtifact, track, context)` | Candidate/response artifact, track name (`BOQ_EVALUATION`, `RFP_SIZING_TO_BOM`, `BOM_RECONCILIATION`, `FREEFORM_QA`, `WORKBOOK_GENERATION`, `REMARKS_RECONCILIATION`, `CONTINUOUS_LEARNING`, `KNOWLEDGE_SYNC`, `PRESALES_CLEARANCE_STRATEGY`), scoped catalog context |
| **Output (Acceptance Gate)** | `PrePresentationGateResult` | `isValid`, `isApproved`, `status` (`PASSED \| FAILED \| INCOMPLETE \| ACTION_REQUIRED`), `blockersCount`, `warningsCount`, `checks[]` |

---

## ⛔ HALT Conditions

```
HALT-SQE1: If computeBenchmarkMetrics receives zero TP+FP or zero TP+FN denominators, or if a benchmark scenario returns invalid/null error arrays or ungrounded confidence coercion:
  emit [ERR_BENCHMARK_METRIC_INTEGRITY] and preserve precision = null / recall = null / confidenceScore = null.
  NEVER coerce missing denominators or missing confidence values to 100 or 0.

HALT-SQE2: If performReasoningPostAnalysis detects an unverified Tier-3 receipt claim or fabricated narrative metric absent from the audit trail, or if verifyPrePresentationAcceptance encounters an unknown track profile or failing BLOCK check:
  emit [ERR_QUALITY_AUDIT_FAILED] and degrade epistemicIntegrity.tier or set acceptance status to FAILED / INCOMPLETE.
  Do NOT mark uncertified runs as PASSED or TIER_3_OFFICIAL_VENDOR_ACCEPTANCE.
```

---

## 3. Implementation Owner Modules
- [`reasoning_post_analyzer.js`](../../../scripts/lib/system/reasoning_post_analyzer.js) (`determineEpistemicTier`, `performReasoningPostAnalysis`, `_deriveStep3MathematicalProofs`, `_deriveStep6ResolutionProofs`)
- [`bom_verifier.js`](../../../scripts/lib/boq/bom_verifier.js) (`verifyPrePresentationAcceptance`, `validateUniversalCriteria`)
- [`evidence_ledger.js`](../../../scripts/lib/system/evidence_ledger.js) (`createEvidenceLedger`)
- [`test_boq_eval_benchmarks.js`](../../../tests/integration/test_boq_eval_benchmarks.js) (`scoreBenchmarkScenario`, `computeBenchmarkMetrics`, `runBenchmarkSuite`)

## 4. Peer Skills
- [`epistemic-verification-skill`](../epistemic-verification-skill/SKILL.md) — Falsification gates and terminal 9-phase ledger enforcement.
- [`output-validation-skill`](../output-validation-skill/SKILL.md) — Operational 18-point pre-presentation acceptance execution.
- [`execution-trace-skill`](../execution-trace-skill/SKILL.md) — Step-level evidence trace capture and ledger persistence.
- [`code-quality-gate-skill`](../code-quality-gate-skill/SKILL.md) — Repository complexity, lint, DAG, and non-empty test matrix gates.

## 5. Tests & Scenarios
- [`test_si01_honest_claims_and_benchmarks.js`](../../../tests/unit/test_si01_honest_claims_and_benchmarks.js) — False-positive accounting, zero-denominator null precision/recall, isolated benchmark temp CSV runs, epistemic tier downgrades, and factual narrative audits.
- [`test_reasoning_post_analyzer.js`](../../../tests/unit/test_reasoning_post_analyzer.js) — Epistemic tier boundaries and transparent reasoning analysis attachment.
- [`test_si09_skills_and_registry.js`](../../../tests/unit/test_si09_skills_and_registry.js) — Engineering isolation, callable exports, and negative-path verification.

## 6. Evidence of Consumption
- `ReasoningAnalysis` attached on evaluated payloads, `PrePresentationGateResult` check arrays (`U1..U6`, `B1..B21`), and schema-versioned v2 benchmark report metrics saved only when explicitly requested.

## 7. Offline Air-Gap & Tier-3 Vendor Acceptance Boundaries
- **Offline Air-Gap Safety (`INV-235`)**: `performReasoningPostAnalysis` (with `persistLedger: false` / `isolatedMode: true` in tests), `verifyPrePresentationAcceptance`, and `runBenchmarkSuite` run deterministically offline without network or remote LLM access.
- **Non-Activation Boundary**: This `SKILL.md` and its `activation: 'UNUSED'` declaration in [`skill_workflow_registry.js`](../../../scripts/config/skill_workflow_registry.js) remain strictly `ENGINEERING` documentation; they NEVER activate a customer BOQ workflow path (`INV-72`).
- **Tier-3 Portal Boundary (`INV-201`, `INV-231`)**: Passing held-out engineering benchmarks or local acceptance gates verifies evaluation software behavior only; customer configurations remain `PORTAL VALIDATION PENDING` until an exact-manifest live CLIC receipt is recorded.
