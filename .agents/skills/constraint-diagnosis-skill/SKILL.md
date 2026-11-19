---
name: constraint-diagnosis-skill
description: >-
  Diagnose typed physical and operational constraint infeasibility, compute minimal conflicting sets
  with single-constraint ablation verification, run bounded feasibility searches, and execute
  regression-guarded repair transactions with receipt invalidation and blocker reconciliation. **DO
  call for**: explaining why a configuration is infeasible or unknown and executing rollback-safe
  candidate repair deltas. **DO NOT call for**: customer requirement extraction
  (requirements-accounting-skill) or initial BOQ parsing (boq-eval-skill).
---

# Constraint Diagnosis & Verified Repair Skill (`constraint-diagnosis-skill`)

Comply with [Normative Language Standard](../../rules/normative_language.md). Enforces typed hard-before-preference predicates (`INV-105`), ablation-verified minimal conflicting sets, scope-bounded infeasibility reporting (`INV-231`), and SHA-256 rollback-safe repair transactions.

---

## 1. Trigger & Non-Trigger Boundaries

### Trigger Conditions (`DO call for`)
- Adapting physical aspect outputs or typed predicates into `ConstraintResult` (`HARD` vs `PREFERENCE`, distinct `resultCategory: 'CONSTRAINT_PREDICATE'`).
- Extracting minimal conflicting constraint sets (`computeMinimalConflictingSet`) and verifying irreducibility via single-constraint removal ablation.
- Executing bounded feasibility searches (`runBoundedFeasibilitySearch`) with explicit iteration, candidate, and elapsed-time budgets.
- Applying candidate deltas (`ADD`, `REMOVE`, `SUBSTITUTE`, `SET_QUANTITY`) via `executeVerifiedRepairTransaction` or `executeRepairSession` with regression rollback, cycle detection, receipt invalidation, and multi-class blocker reconciliation (`HARDWARE`, `EVIDENCE`, `OPERATIONAL`).

### Non-Trigger Conditions (`DO NOT call for`)
- Initial tender clause tokenization and unit extraction (`requirements-accounting-skill`).
- Workload demand profiling and Pareto trade-off ranking (`decision-uncertainty-skill`).
- Live OCA scraping (`oca-catalog-scraper`) or spreadsheet rendering (`workbook-generator-skill`).

---

## 2. Inputs & Outputs (`CapabilityHandoffSchema`)

All cross-skill handoffs conform to `CapabilityHandoffSchema` in [`scripts/lib/system/schemas.js`](../../../scripts/lib/system/schemas.js) (`capabilityId`, `scope`, `artifactRefs`, `evidenceRefs`, `unresolvedRequirements`).

| Direction | Function / Contract | Schema & Required Fields |
| :--- | :--- | :--- |
| **Input (Diagnose)** | `diagnoseInfeasibility(constraints, options)` | `ConstraintResult[]` and `options` (`product`, `catalogRevision`, `checkFeasibleSubsetFn`) |
| **Output (Diagnose)** | `FeasibilityDiagnosisReport` | `outcome` (`FEASIBLE_IN_EVALUATED_SCOPE \| INFEASIBLE_IN_EVALUATED_SCOPE \| UNKNOWN \| SEARCH_EXHAUSTED`), `universalImpossibilityClaimed: false`, `scope`, `hardBeforePreferences`, `minimalConflictingSet` (`isIrreducible`, `irreducibilityBasis`, `ablationChecks`), `missingInputs[]`, `notEvaluatedDomains[]` |
| **Input (Repair)** | `executeVerifiedRepairTransaction(baseline, delta, options)` | Immutable baseline snapshot, delta or delta list, `validateFn`, `baselineValidation`, optional `AbortSignal` |
| **Output (Repair)** | `RepairTransactionResult` | `outcome` (`ACCEPTED \| ROLLED_BACK \| CYCLE_DETECTED_REJECTED \| SEARCH_EXHAUSTED \| CANCELLED`), `parentManifestSha256`, `resultingManifestSha256`, `manifestChanged`, `receiptInvalidated`, `regressionDetected`, `rollbackReason`, unmutated `baselineSnapshot` |

---

## ⛔ HALT Conditions

```
HALT-CST1: If any HARD constraint evaluates to FAIL, UNKNOWN, or NOT_EVALUATED:
  emit [ERR_CONSTRAINT_DIAGNOSIS_BLOCKED] and set evaluateHardBeforePreferences().blocksPositiveRanking = true.
  Keep missing electrical/thermal inputs as UNKNOWN and missing domain profiles as NOT_EVALUATED.
  NEVER claim universal vendor impossibility (universalImpossibilityClaimed MUST remain false).

HALT-CST2: If a repair delta increases criticalErrorCount, introduces any newly violated hard requirement, throws during validation, repeats a visited SHA-256 manifest, exhausts budget limits, or receives an AbortSignal:
  emit [ERR_REPAIR_TRANSACTION_ROLLED_BACK] (or [ERR_REPAIR_SESSION_BOUNDED]) and restore baselineSnapshot untouched.
  Whenever manifestChanged === true, invalidate stale portalReceipt, clicReceipt, ephemeralSourceValidation, and deliveryAuthorization fields immediately.
```

---

## 3. Implementation Owner Modules
- [`conflict_explanations.js`](../../../scripts/lib/conflict/constraints/conflict_explanations.js) (`computeMinimalConflictingSet`, `diagnoseInfeasibility`, `runBoundedFeasibilitySearch`, `classifyFeasibilityOutcome`)
- [`constraint_results.js`](../../../scripts/lib/conflict/constraints/constraint_results.js) (`createConstraintResult`, `adaptAspectChecksToConstraints`, `evaluateHardBeforePreferences`, `summarizeConstraintResults`)
- [`repair_transactions.js`](../../../scripts/lib/conflict/repair_transactions.js) (`computeManifestSha256`, `applyManifestDelta`, `invalidateCandidateReceipts`, `executeVerifiedRepairTransaction`, `executeRepairSession`, `reconcileBlockers`)
- [`conflict_graph.js`](../../../scripts/lib/conflict/conflict_graph.js) (`validateConflictGraph`)

## 4. Peer Skills
- [`self-correction-counterfactual-skill`](../self-correction-counterfactual-skill/SKILL.md) — Backtracking loop and Phase 9 counterfactual narrative synthesis.
- [`boq-eval-skill`](../boq-eval-skill/SKILL.md) — 7-aspect evaluator feeding `ConstraintResult[]`.
- [`least-delta-combinator-skill`](../least-delta-combinator-skill/SKILL.md) — Alternative SKU synthesis to prune cascading conflicts.
- [`claim-evidence-adjudication-skill`](../claim-evidence-adjudication-skill/SKILL.md) — Evidence blocker classification and receipt invalidation.

## 5. Tests & Scenarios
- [`test_si04_constraints_and_infeasibility.js`](../../../tests/unit/test_si04_constraints_and_infeasibility.js) — Thermal impossibility, slot collision ablation (`isIrreducible`), unknown electrical inputs, missing domain profiles, bounded `SEARCH_EXHAUSTED` preserving `bestValidatedCandidate`, and `conflict_graph.js` integration.
- [`test_si05_compound_and_repair_transactions.js`](../../../tests/unit/test_si05_compound_and_repair_transactions.js) — Repair rollback, SHA-256 cycle rejection, cancellation, receipt invalidation, and simultaneous multi-class blocker reconciliation.
- [`test_si09_skills_and_registry.js`](../../../tests/unit/test_si09_skills_and_registry.js) — Registry binding and scope isolation assertions.

## 6. Evidence of Consumption
- Typed `ConstraintResult[]` (`schemaVersion: '1.0'`), `minimalConflictingSet.ablationChecks`, `parentManifestSha256` / `resultingManifestSha256` transaction logs, `receiptInvalidation`, and `reconcileBlockers` multi-class output.

## 7. Offline Air-Gap & Tier-3 Vendor Acceptance Boundaries
- **Offline Air-Gap Safety (`INV-235`)**: Constraint adaptation, ablation verification, bounded search, and repair transactions execute deterministically in-memory offline with zero network calls (`OFFLINE_MODE=1` safe).
- **Non-Activation Boundary**: This `SKILL.md` and its `activation: 'UNUSED'` registry entry in [`skill_workflow_registry.js`](../../../scripts/config/skill_workflow_registry.js) never activate customer routing by themselves.
- **Tier-3 Portal Boundary (`INV-201`, `INV-231`)**: Even an `ACCEPTED` local repair transaction establishes Tier-1 local repair progress only; changed manifests invalidate any prior portal receipts (`PORTAL VALIDATION PENDING`) until revalidated live in OCA/CLIC.
