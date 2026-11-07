---
name: clic-portal-validation-skill
description: >-
  **Live Authenticated HPE OCA / CLIC Portal Validation & Cryptographic Receipt Binding Gate (Gate B19 / INV-201)**.
  **DO call for**: Validating candidate manifests in live authenticated WebLogic OCA, inspecting CLIC advice modals,
  extracting vendor rule IDs, and recording cryptographic receipts.
  **DO NOT call for**: Offline physical math pre-checks (use boq-eval-skill), Google Jules CI/CD (use jules-autonomous-protocol),
  or cross-vendor RFP translations (use cross-vendor-transformation-skill).
---

# Live CLIC Portal Validation & Receipt Binding Gate (`clic-portal-validation-skill`)

## 1. Scope & Acceptance Protocol
This skill governs the live validation of candidate hardware manifests inside authenticated HPE One Config Advanced (OCA) / CLIC WebLogic configurator sessions, binding exact manifests to cryptographic receipts (`INV-201`, Gate B19).

- **Epistemic Discipline**: Local 7-aspect PASS and NotebookLM citations represent Tier 1 and Tier 2 evidence; they do NOT substitute for live Tier 3 CLIC vendor acceptance.
- **Two Distinct Execution Modes**:
  1. **Exploratory Investigation**: Targeted investigation of conditional SKUs or unresolved dependencies prior to full local PASS. Captures rule IDs and before/after manifests.
  2. **Final Acceptance Gate**: Applied to the final candidate manifest. Requires reading back the exact full configuration with requested environmental selectors, running CLIC check, and persisting dated cryptographic evidence.
- **Tool Segregation**: Jules is strictly excluded from live customer portal validation (`INV-72`).
- **Normative Directives**: Comply with [Normative Language Standard](../../rules/normative_language.md).

---

## ⛔ HALT Conditions

```
HALT-CLIC1: If portal session drops to login or times out during validation:
  emit [ERR_CLIC_SESSION_DISCONNECTED] and initiate Tab 1 recovery (INV-89).
  Do NOT execute in-place reload on active OCA tabs (INV-173).

HALT-CLIC2: If read-back manifest differs from candidate SKU/quantity manifest:
  emit [ERR_MANIFEST_READBACK_MISMATCH] and HALT. Prior acceptance is invalidated.
  Remediation: Re-apply exact candidate items and verify selector state.

HALT-CLIC3: If CLIC response contains unbuildable errors:
  emit [ERR_CLIC_VALIDATION_REJECTED] and record rule IDs in candidateAttempts.
  Remediation: Route divergent remedies into parallel Rank 1A/1B manifests (INV-93).
```

---

## 2. Validation Procedure & Receipt Binding (`INV-201`)

1. **Platform Scoping**: Verify vendor, domain, family, generation, and exact base CTO chassis (`INV-25`). Generic DL380 Gen12 must not default to OEM models.
2. **Manifest Loading**: Apply the exact candidate SKU/quantity manifest, environmental state, and support requirements. Compare portal readback directly against the candidate manifest.
3. **Support Isolation**: Select product-qualified support at the owning component with apply-to-all controls OFF. The 3-year Tech Care Basic default applies only when support was unspecified.
4. **Error Remediation**: Resolve build-breaking errors. Preserve divergent vendor remedies (e.g., expander vs. second controller) as separate candidate manifests.
5. **Receipt Persistence (Gate B19)**:
   - Save complete BOM and configuration advice with timestamps and SHA-256 source hashes under `outputs/{Family}/{Gen}/{Model}/evidence/`.
   - `portal_receipt.js:receiptMatches(receipt, items)` requires a complete BOM, reconciled prices, owner consistency, overall OK status, zero unbuildables, capture within 15 minutes, and age $\le 24$ hours.
6. **Warning Policy**: Vendor warnings do not constitute clean acceptance; the strict reader records warnings and the solution remains `PORTAL VALIDATION PENDING` until resolved or explicitly waived.

---

## 3. Deliverable State Invariant
Deliverables MUST remain marked `PORTAL VALIDATION PENDING` whenever relevant investigations, requested-state readbacks, or final receipts are missing. Catalogue completeness, local physical checks, NotebookLM grounding, and live acceptance are distinct, un-conflatable evidence states.

---

## 4. References & Related Charters
- [Live CDP Modal Parser](../../../scripts/scrapers/parse_clic_modal.js) via `parseLiveCdpModal()` and `parseClicAdviceExcel()`
- [Shared Runtime Conditional Discovery Contract](../../../docs/RUNTIME_CONDITIONAL_DISCOVERY.md)
- [OCA Portal Auto-Navigator Skill](../oca-portal-navigator/SKILL.md)
- [Master System Invariants Directory (INV-201, Gate B19)](../../../docs/INVARIANTS.md)
