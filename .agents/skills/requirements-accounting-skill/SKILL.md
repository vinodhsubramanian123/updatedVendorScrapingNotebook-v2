---
name: requirements-accounting-skill
description: >-
  Extract immutable typed customer requirement clauses, units, ownership scopes (PER_NODE, GLOBAL,
  SPARE), and exclusions, and evaluate candidate requirement coverage dispositions without dropping
  uninterpreted clauses. **DO call for**: parsing tender or RFP requirement clauses into typed
  RequirementRecords and auditing candidate requirement satisfaction or blocking coverage gaps. **DO
  NOT call for**: 7-aspect hardware physics validation (boq-eval-skill) or source trust adjudication
  (claim-evidence-adjudication-skill).
---

# Requirements Accounting & Candidate Coverage Skill (`requirements-accounting-skill`)

Comply with [Normative Language Standard](../../rules/normative_language.md). Enforces lossless customer clause extraction, currency-qualified budget parsing, quantity conservation (`INV-192`), and zero silent omissions (`INV-105`, `INV-195`).

---

## 1. Trigger & Non-Trigger Boundaries

### Trigger Conditions (`DO call for`)
- Customer tenders, cover notes, spreadsheets, or natural-language RFPs containing capacity, budget, SLA, redundancy, exclusion, or exact-SKU lock clauses (`do not substitute`, `no installation`, `per node`, `global`, `spare`).
- Evaluating candidate BOMs against extracted `RequirementRecord[]` to produce auditable `SATISFIED`, `VIOLATED`, `UNRESOLVED`, `NOT_APPLICABLE`, or `WAIVED` dispositions.
- Auditing tender line-item quantity conservation (`buildUniversalQuantityConservationLedger`) across node multipliers and shared datacenter infrastructure.

### Non-Trigger Conditions (`DO NOT call for`)
- Running 7-aspect thermal, memory, PCIe, storage, network, or power physics checks alone (`boq-eval-skill`).
- Adjudicating document citation applicability, contradiction preservation, or Tier-3 portal receipt validity (`claim-evidence-adjudication-skill`).
- Performing top-level query intent classification (`presales-query-router`).

---

## 2. Inputs & Outputs (`CapabilityHandoffSchema`)

All cross-skill handoffs conform to `CapabilityHandoffSchema` in [`scripts/lib/system/schemas.js`](../../../scripts/lib/system/schemas.js) (`capabilityId`, `scope`, `artifactRefs`, `evidenceRefs`, `unresolvedRequirements`).

| Direction | Function / Contract | Schema & Required Fields |
| :--- | :--- | :--- |
| **Input (Extract)** | `extractRequirementRecords(input)` | Raw text, line array, or `{ rawLines, coverNoteRecords, unresolvedRequirements, filePath, page }` |
| **Output (Extract)** | Frozen `RequirementAccounting` (`schemaVersion: '1.0'`) | `inputRevisionSha256`, `totalClauses`, `parsedCount`, `uninterpretedCount`, `ambiguityCount`, `records[]`, `uninterpretedClauses[]`, `ambiguities[]`, `clarificationQuestions[]`, `normalizedClauses[]` |
| **Input (Coverage)** | `evaluateCandidateRequirementCoverage(candidate, requirementAccounting, context)` | Candidate BOM (`skuPartsList`, `pricingComplete`, `totalCostUsd`, `nodeCount`), `RequirementAccounting`, and optional `baselineItems` / `waivers` |
| **Output (Coverage)** | `RequirementCoverageResult` | `inputRevisionSha256`, `dispositions[]`, `summary`, `blocksPositiveRecommendation`, `rejectedWaivers[]`, `quantityConservation` |

Every extracted clause retains full provenance (`file`, `sheet`, `cell`, `row`, `col`, `lineNumber`, `page`, `span`). Uninterpreted clauses MUST NOT be discarded. Non-currency numeric bounds (such as `max 64 cores` or `max 16 DIMMs`) MUST map to their hardware metrics (`cores`, `dimmCount`) and MUST NOT coerce into `budgetUsd`.

---

## ⛔ HALT Conditions

```
HALT-REQ1: If any hard requirement clause is uninterpreted, ambiguous, VIOLATED, or UNRESOLVED (including incomplete pricing where pricingComplete === false or totalCostUsd == null on an explicit budget clause):
  emit [ERR_REQUIREMENT_UNRESOLVED_OR_VIOLATED] and set blocksPositiveRecommendation = true.
  Remediation: Emit clarificationQuestions[] referencing exact clause IDs and provenance, or require an explicit waiver with customerAuthority and physicalImpossibility === true.
  Do NOT silently drop clauses, manufacture prices, or certify blocked candidates.

HALT-REQ2: If a waiver omits customerAuthority or sets physicalImpossibility !== true:
  emit [ERR_REQUIREMENT_WAIVER_REJECTED] and record the failure in rejectedWaivers[].
  Remediation: Keep the underlying disposition unchanged and retain the recommendation block.
```

---

## 3. Implementation Owner Modules
- [`requirement_records.js`](../../../scripts/lib/boq/requirements/requirement_records.js) (`extractRequirementRecords`, `extractBudgetConstraint`, `extractWorkbookCoverNotes`, `buildRequirementRevisionDigest`)
- [`coverage.js`](../../../scripts/lib/boq/requirements/coverage.js) (`evaluateCandidateRequirementCoverage`, `attachCandidateDispositions`, `summarizeRequirementCoverage`, `applyRequirementWaiver`)
- [`typed_values.js`](../../../scripts/lib/boq/requirements/typed_values.js) (`parseTypedClauseValue`, `detectHardnessAndScope`, `computeUsableStorageTb`)
- [`quantity_conservation.js`](../../../scripts/lib/boq/quantity_conservation.js) (`buildUniversalQuantityConservationLedger`)

## 4. Peer Skills
- [`boq-eval-skill`](../boq-eval-skill/SKILL.md) — Downstream candidate physical math and matrix evaluation.
- [`presales-query-router`](../presales-query-router/SKILL.md) — Upstream presales intake classification and ambiguity gating.
- [`decision-uncertainty-skill`](../decision-uncertainty-skill/SKILL.md) — Consequential uncertainty and pre-ranking qualification.
- [`output-validation-skill`](../output-validation-skill/SKILL.md) — Pre-presentation gate blocking on violated or unresolved hard requirements.

## 5. Tests & Scenarios
- [`test_si02_requirements_accounting.js`](../../../tests/unit/test_si02_requirements_accounting.js) — Currency vs non-currency bounds, incomplete-pricing `UNRESOLVED` gating, cover-note provenance, `PER_NODE`/`GLOBAL`/`SPARE` scope checks, negations, uninterpreted hard clauses, and strict waiver enforcement.
- [`test_si09_skills_and_registry.js`](../../../tests/unit/test_si09_skills_and_registry.js) — Skill integrity, registry declaration (`activation: 'UNUSED'`), and positive/negative scope invocation checks.

## 6. Evidence of Consumption
- Deterministic `inputRevisionSha256` digest computed from canonical clauses and provenance.
- Immutable `REQ-<8hex>-<seq>` clause records, `uninterpretedClauses[]`, `clarificationQuestions[]`, candidate `requirementCoverage.dispositions[]`, and `quantityConservation` deltas.

## 7. Offline Air-Gap & Tier-3 Vendor Acceptance Boundaries
- **Offline Air-Gap Safety (`INV-235`)**: `extractRequirementRecords` and `evaluateCandidateRequirementCoverage` execute 100% locally with zero network, cloud LLM, or NotebookLM dependencies (`OFFLINE_MODE=1` and `LOCAL_EVAL_ONLY=1` safe).
- **Non-Activation Boundary**: This skill document and its `activation: 'UNUSED'` declaration in [`skill_workflow_registry.js`](../../../scripts/config/skill_workflow_registry.js) do NOT activate a customer runtime dispatch path independently.
- **Tier-3 Portal Boundary (`INV-201`)**: `SATISFIED` requirement coverage confirms conformance against parsed customer specifications only; it NEVER establishes live OCA/CLIC vendor acceptance (`PORTAL VALIDATION PENDING` remains until an exact-manifest Tier-3 receipt is verified).
