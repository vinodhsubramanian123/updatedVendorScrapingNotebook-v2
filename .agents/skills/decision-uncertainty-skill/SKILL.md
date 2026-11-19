---
name: decision-uncertainty-skill
description: >-
  Model workload demand provenance, failover capacity, and unprofiled workload extrapolation guards,
  trigger consequential clarification drafts when critical inputs are absent, and qualify candidates
  against hard constraints before deterministic ranking or Pareto trade-off evaluation. **DO call
  for**: sizing under missing inputs, unprofiled workload refusal, pre-ranking qualification, and
  nullable price/lead-time preservation. **DO NOT call for**: standalone SKU price history
  (catalog-intelligence-skill) or infeasibility ablation (constraint-diagnosis-skill).
---

# Decision Uncertainty & Pre-Ranking Qualification Skill (`decision-uncertainty-skill`)

Comply with [Normative Language Standard](../../rules/normative_language.md). Enforces honest uncertainty (`INV-73`, `INV-105`), per-field demand provenance, hard-requirement qualification before ranking (`INV-204`, `INV-217`, `INV-237`), and strict preservation of `null` prices and lead times.

---

## 1. Trigger & Non-Trigger Boundaries

### Trigger Conditions (`DO call for`)
- Sizing enterprise workloads where demand parameters MAY be incomplete (`workingSetGb`, `requiredCores`, `throughputOrConcurrency`) or outside supported pilot coverage (`SUPPORTED_PILOT_WORKLOADS`), requiring `SIZING_DRAFT_SCENARIO_RANGE` or `UNPROFILED_REQUIRES_AUTHORITATIVE_SIZING_BASIS`.
- Recording per-field demand provenance (`USER_FACT`, `CITED_MEASUREMENT`, `ASSUMPTION`, `ESTIMATE`, `MISSING`) and surfacing `nextRequiredInput` triggers for consequential clarification.
- Enforcing N+1 / 2N failover node capacity loss, raw-vs-usable RAID overhead, NUMA 1DPC/2DPC trade-offs, fabric parity, and explicit service parity before ranking.
- Qualifying candidate BOMs (`qualifyCandidatesBeforeRanking`), maintaining permutation-invariant closest-rank ordering, and computing multi-objective Pareto frontiers (`computeParetoFrontier`) with explicit `evaluatedCandidateSet` scope and `isGlobalMinimum` guards.

### Non-Trigger Conditions (`DO NOT call for`)
- Standalone catalog price trails or lifecycle state queries (`catalog-intelligence-skill`).
- Minimal conflicting set ablation or rollback repair transactions (`constraint-diagnosis-skill`).
- Spreadsheet file formatting (`workbook-generator-skill`).

---

## 2. Inputs & Outputs (`CapabilityHandoffSchema`)

All cross-skill handoffs conform to `CapabilityHandoffSchema` in [`scripts/lib/system/schemas.js`](../../../scripts/lib/system/schemas.js) (`capabilityId`, `scope`, `artifactRefs`, `evidenceRefs`, `unresolvedRequirements`).

| Direction | Function / Contract | Schema & Required Fields |
| :--- | :--- | :--- |
| **Input (Workload Sizing)** | `evaluateWorkloadSizingPilot(demandInput, candidateInput, options)` | Raw demand text or `WorkloadDemandRecord` (`workloadFamily`, `workingSetGb`, `requiredCores`, `throughputOrConcurrency`, `growthFactor`, `resilienceMode`, `storage`, `network`, `explicitService`), candidate node template |
| **Output (Workload Sizing)** | `WorkloadSizingPilotResult` | `pilotCoverage`, `sizingStatus`, `isQualified`, `extrapolationRefused`, `demandRecord` (`provenance`), `missingCriticalInputs[]`, `nextRequiredInput`, `scenarioRange`, `recommendedCluster`, `checks`, `hardConstraintFailures[]` |
| **Input (Pre-Rank Gate)** | `qualifyCandidatesBeforeRanking(candidates, options)` / `computeParetoFrontier(candidates, options)` | Candidate BOM list with `requirementCoverage`, `physicalMathClean`, `constraintResults`, `fabricParity`, `explicitServiceRequirement`, optional `baselineItems` |
| **Output (Pre-Rank Gate)** | `QualificationAndParetoResult` | `qualifiedCandidates[]`, `disqualifiedCandidates[]` (with `disqualificationReasons[]`), `frontierCandidates[]`, `dominatedCandidates[]`, `evaluatedCandidateSet`, `isGlobalMinimum`, `minimumCostClaim` |

---

## ⛔ HALT Conditions

```
HALT-UNC1: If workloadFamily is unprofiled (not in SUPPORTED_PILOT_WORKLOADS) or missingCriticalInputs.length > 0:
  emit [ERR_SIZING_UNCERTAINTY_UNQUALIFIED] with isQualified = false and extrapolationRefused = true.
  Return SIZING_DRAFT_SCENARIO_RANGE (or UNPROFILED_REQUIRES_AUTHORITATIVE_SIZING_BASIS) and surface nextRequiredInput.
  Do NOT extrapolate performance from a bare workload label or hardware generation.

HALT-UNC2: If any candidate violates hard requirement coverage, physical math, typed HARD constraints, fabric parity, or explicit service rules:
  emit [ERR_CANDIDATE_DISQUALIFIED_PRE_RANKING] and move candidate to disqualifiedCandidates[] before ranking or Pareto selection.
  Preserve missing prices and stale/missing lead times as null; keep isGlobalMinimum = false whenever searchSpaceComplete !== true or allEligiblePricesKnown !== true.
```

---

## 3. Implementation Owner Modules
- [`workload_demand.js`](../../../scripts/lib/conflict/sizing/workload_demand.js) (`createWorkloadDemandRecord`, `extractWorkloadDemand`, `evaluateWorkloadSizingPilot`)
- [`pareto_ranker.js`](../../../scripts/lib/conflict/sizing/pareto_ranker.js) (`qualifyCandidatesBeforeRanking`, `rankQualifiedCandidatesDeterministically`, `computeParetoFrontier`)
- [`workload_dna.js`](../../../scripts/lib/conflict/workload_dna.js) (`extractWorkloadDna`, `buildWorkloadDemandProfile`)
- [`strategy_synthesizer.js`](../../../scripts/lib/conflict/strategy_synthesizer.js) (`synthesize5TierRankedSolutions`)

## 4. Peer Skills
- [`workload-dna-skill`](../workload-dna-skill/SKILL.md) — Application architecture classification and contested-slot arbitration.
- [`rfp-sizing-synthesizer`](../rfp-sizing-synthesizer/SKILL.md) — Translating qualified demand into concrete candidate BOMs.
- [`requirements-accounting-skill`](../requirements-accounting-skill/SKILL.md) — Requirement disposition and missing-price `UNRESOLVED` gating.
- [`degraded-mode-skill`](../degraded-mode-skill/SKILL.md) — Stale catalog and ungrounded cloud uncertainty disclosure.

## 5. Tests & Scenarios
- [`test_si06_sizing_and_alternatives.js`](../../../tests/unit/test_si06_sizing_and_alternatives.js) — Unprofiled workload guard, `SIZING_DRAFT_SCENARIO_RANGE`, N+1/2N failover, RAID overhead, NUMA 1DPC/2DPC, fabric/service parity, null price/lead-time preservation, permutation invariance, and pre-ranking disqualification.
- [`test_si09_skills_and_registry.js`](../../../tests/unit/test_si09_skills_and_registry.js) — Registry wiring and unprofiled/missing-input negative scope checks.

## 6. Evidence of Consumption
- Explicit `demandRecord.provenance` per field, `nextRequiredInput`, `disqualificationReasons[]`, `evaluatedCandidateSet`, and `minimumCostClaim.claimScope` (`SCOPED_TO_EVALUATED_CANDIDATE_SET_ONLY` vs `GLOBAL_MINIMUM_IN_COMPLETE_DECLARED_SCOPE`).

## 7. Offline Air-Gap & Tier-3 Vendor Acceptance Boundaries
- **Offline Air-Gap Safety (`INV-235`)**: Workload demand parsing, uncertainty gating, pre-ranking qualification, and Pareto frontier selection run deterministically offline with zero cloud dependencies (`OFFLINE_MODE=1` safe).
- **Non-Activation Boundary**: This `SKILL.md` and its `activation: 'UNUSED'` declaration in [`skill_workflow_registry.js`](../../../scripts/config/skill_workflow_registry.js) never activate a runtime path on their own.
- **Tier-3 Portal Boundary (`INV-201`)**: `SIZED_QUALIFIED` status and Pareto frontier optimality evaluate local candidate math only; vendor orderability, live pricing, and CLIC acceptance stay `PORTAL VALIDATION PENDING` until verified with a Tier-3 portal receipt.
