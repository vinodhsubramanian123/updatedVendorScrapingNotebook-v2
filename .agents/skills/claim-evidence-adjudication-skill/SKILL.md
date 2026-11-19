---
name: claim-evidence-adjudication-skill
description: >-
  Mechanically adjudicate material solution claims against typed EvidenceRecords, enforce product,
  generation, selector, and content-hash applicability, preserve contradictions, and maintain
  independent Tier-1, Tier-2, and Tier-3 evidence lanes. **DO call for**: verifying claim support,
  rejecting self-citations or wrong-scope citations, and isolating stale dependencies. **DO NOT call
  for**: customer requirement parsing (requirements-accounting-skill) or live portal scraping
  (oca-catalog-scraper).
---

# Claim & Evidence Adjudication Skill (`claim-evidence-adjudication-skill`)

Comply with [Normative Language Standard](../../rules/normative_language.md). Enforces non-repudiable disk evidence (`INV-104`), zero default success (`INV-105`), zero ephemeral self-citation, strict generation/product isolation, and independent evidence lane separation (`INV-201`, `INV-231`).

---

## 1. Trigger & Non-Trigger Boundaries

### Trigger Conditions (`DO call for`)
- Adjudicating technical, pricing, compatibility, or portal acceptance claims against typed `EvidenceRecord` (`DETERMINISTIC_CALCULATION`, `CATALOG_OBSERVATION`, `OFFICIAL_DOCUMENT_PASSAGE`, `PORTAL_RECEIPT_CAPTURE`, `UNTRUSTED_INPUT`, `MODEL_PROPOSAL`).
- Enforcing scope applicability (`product`, `generation`, `baseSku`, `owner`, `region`, `selectors`), `contentSha256` integrity, and `freshnessPolicy.maxAgeMs` bounds.
- Building independent status lanes (`localChecks`, `documentGrounding`, `liveVendorAcceptance`, `cloudSync`, `learningSync`) without flattening Tier-2 document citations into Tier-3 live vendor acceptance.
- Detecting cyclic evidence dependencies and stale downstream claim/candidate/artifact state after rule retractions or revision changes.

### Non-Trigger Conditions (`DO NOT call for`)
- Parsing customer RFP clauses and budget thresholds (`requirements-accounting-skill`).
- Running physical aspect math solvers (`boq-eval-skill`).
- Executing live WebLogic OCA scraping (`oca-catalog-scraper`).

---

## 2. Inputs & Outputs (`CapabilityHandoffSchema`)

All cross-skill handoffs conform to `CapabilityHandoffSchema` in [`scripts/lib/system/schemas.js`](../../../scripts/lib/system/schemas.js) (`capabilityId`, `scope`, `artifactRefs`, `evidenceRefs`, `unresolvedRequirements`).

| Direction | Function / Contract | Schema & Required Fields |
| :--- | :--- | :--- |
| **Input (Adjudicate)** | `adjudicateSolutionClaims(claims, evidenceRecords, context)` | `ClaimRecord[]`, `EvidenceRecord[]` (`schemaVersion: '1.0'`), target `context` (`product`, `generation`, `baseSku`, `owner`, `region`, `selectors`, `authoritativeSourceIds`, `quarantinedSourceIds`, `ephemeralSourceId`, `inventoryStatus`) |
| **Output (Adjudicate)** | `AdjudicationReport` | `overallStatus` (`SUPPORTED \| CONTRADICTED \| REJECTED \| UNKNOWN`), `counts`, `hasContradictions`, `hasRejections`, `hasPendingChecks`, `claims[]`, `evidenceDigestSha256` |
| **Input (Lanes)** | `buildIndependentEvidenceStates(input, evalResults, context)` | Evaluation artifact, ephemeral review, claim adjudication, portal receipt check, sync health metadata |
| **Output (Lanes)** | `IndependentEvidenceStates` | Separate state objects for `localChecks`, `documentGrounding`, `liveVendorAcceptance`, `cloudSync`, `learningSync` |

---

## ⛔ HALT Conditions

```
HALT-EVD1: If a material claim cites UNTRUSTED_INPUT, MODEL_PROPOSAL, ephemeral self-citation, mock/simulation records, quarantined source IDs, mismatched product/generation/baseSku/owner/region, unmet selector preconditions, stale contentSha256, expired maxAgeMs, or inaccessible source inventory:
  emit [ERR_EVIDENCE_CLAIM_UNSUPPORTED] and classify evidence as rejected/non-authoritative.
  Preserve overallStatus = 'UNKNOWN' or 'REJECTED'; never coerce missing or unverified evidence to 'SUPPORTED'.

HALT-EVD2: If opposing authoritative evidence records conflict for the same claim scope:
  emit [ERR_EVIDENCE_CONTRADICTION_DETECTED] and preserve status = 'CONTRADICTED' (hasContradictions: true).
  Do NOT allow a newer timestamp to overwrite a conflicting authoritative scope check.

HALT-EVD3: If cyclic evidence dependency chains exist or dependency revisions become stale:
  emit [ERR_STALE_OR_CYCLIC_EVIDENCE] and mark downstream claims/artifacts STALE_INVALIDATED.
```

---

## 3. Implementation Owner Modules
- [`source_adjudicator.js`](../../../scripts/lib/boq/evidence/source_adjudicator.js) (`checkEvidenceApplicability`, `adjudicateMaterialClaim`, `adjudicateSolutionClaims`, `computeEvidenceDigest`)
- [`claim_records.js`](../../../scripts/lib/boq/evidence/claim_records.js) (`createEvidenceRecord`, `createClaimRecord`, `buildIndependentEvidenceStates`, `buildEphemeralValidationEvidence`)
- [`portal_receipt.js`](../../../scripts/lib/boq/portal_receipt.js) (`verifyCurrentPortalReceipt`, `readPortalReceipt`, `receiptMatches`)
- [`nlm_solution_source_validator.js`](../../../scripts/lib/sync/nlm_solution_source_validator.js) (`validateSolutionWithEphemeralSource`, `resolveProductNotebookId`)

## 4. Peer Skills
- [`epistemic-verification-skill`](../epistemic-verification-skill/SKILL.md) — Falsification gates and non-repudiation audits.
- [`nlm-skill`](../nlm-skill/SKILL.md) — Grounded NotebookLM query transport and ephemeral source validation.
- [`degraded-mode-skill`](../degraded-mode-skill/SKILL.md) — Stale catalog and unavailable notebook disclosure.
- [`output-validation-skill`](../output-validation-skill/SKILL.md) — Acceptance enforcement over adjudicated claims and lane states.

## 5. Tests & Scenarios
- [`test_si03_claim_evidence_adjudication.js`](../../../tests/unit/test_si03_claim_evidence_adjudication.js) — Wrong-generation/product rejection, ephemeral/mock/untrusted exclusion, inaccessible inventory `UNKNOWN`, `contentSha256`/`maxAgeMs` expiry, contradiction preservation, selector gating, and Tier-2 vs Tier-3 separation.
- [`test_si09_skills_and_registry.js`](../../../tests/unit/test_si09_skills_and_registry.js) — Registry wiring and scope-rejection verification.

## 6. Evidence of Consumption
- Deterministic `evidenceDigestSha256` bound over adjudicated claim statuses and source hashes (`contentSha256`, `revisionSha256`).
- Explicit `supportingEvidenceIds`, `opposingEvidenceIds`, and `rejectedEvidenceIds` with exact rejection codes (`INAPPLICABLE_GENERATION`, `REJECTED_SELF_CITATION`, `INAPPLICABLE_SELECTOR_UNMET`, `UNKNOWN_INVENTORY_INACCESSIBLE`).

## 7. Offline Air-Gap & Tier-3 Vendor Acceptance Boundaries
- **Offline Air-Gap Safety (`INV-235`)**: Mechanical claim adjudication executes deterministically offline with zero cloud RPCs; when `isOffline` is set, `documentGrounding.status` evaluates to `OFFLINE_UNVERIFIED` and `cloudSync.status` evaluates to `OFFLINE`.
- **Non-Activation Boundary**: This `SKILL.md` and its `activation: 'UNUSED'` declaration in [`skill_workflow_registry.js`](../../../scripts/config/skill_workflow_registry.js) never activate a runtime execution route independently.
- **Tier-3 Portal Boundary (`INV-201`, `INV-241`)**: Even when `documentGrounding` reaches `SUPPORTED` (`TIER_2_DOCUMENT_CITATION`), `liveVendorAcceptance` remains `PORTAL VALIDATION PENDING` (`verified: false`) until an exact-manifest, scope-matched, unexpired `PORTAL_RECEIPT_CAPTURE` verifies cleanly.
