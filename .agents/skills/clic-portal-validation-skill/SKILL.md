---
name: clic-portal-validation-skill
description: Investigate BOQ-specific portal conditions and validate the final complete manifest in authenticated HPE OCA/CLIC. Distinguish exploratory advice from acceptance; preserve exact product/base/owner/selector scope and dated evidence.
---

# Live CLIC investigation and final acceptance

Read [the shared runtime procedure](../../../docs/RUNTIME_CONDITIONAL_DISCOVERY.md). It defines two separate modes:

- **Investigation:** missing/conditional SKUs or unresolved dependencies may be investigated before local checks all pass. Use the runtime discovery plan and conditional-SKU skill. A failing CLIC response is evidence to resolve, never acceptance.
- **Final acceptance:** after the requested manifest and scoped local/domain checks are complete, import/apply and read back the exact full configuration, restore requested selector state, run CLIC and retain complete fresh evidence. Local PASS and NotebookLM citations do not substitute for CLIC acceptance.

Do not use Jules for either customer workflow. Never require a local verdict of "100% buildable" merely to investigate the missing evidence needed to establish buildability.

## Procedure

1. Verify vendor, domain, family, generation, exact base and owning configuration. Generic DL380 Gen12 must not silently select OEM. An explicit base/filter cannot fall back.
2. Load the exact candidate's SKU/quantity manifest, environmental state and support requirements. Keep customer source rows intact; compare readback to the candidate manifest. Select product-qualified support at the owning component with apply-to-all controls off. Apply the 3-year Tech Care Basic default only where the customer left support unspecified.
3. Investigate targeted conditional/missing SKU states using the actual portal UI and observed authenticated backend requests. Capture rule IDs, source responses and before/after manifests; restore state. Never infer a conflict from an unclassified informational message.
4. Resolve build-breaking errors. Keep divergent vendor-supported remedies as separate candidate manifests (for example expander versus second controller); preserve the original customer requirements and quantity ownership.
5. Re-run deterministic checks and grounded candidate review after substitutions. Final CLIC validation must operate on the final read-back manifest, not an earlier exploratory state.
6. Save complete BOM and configuration advice with timestamps and source hashes under the product's evidence directory. Bind exact manifest and selector state. Changing base, owner, quantities, components or environment invalidates prior acceptance.
7. Persist only supported scoped lessons through `recordAndCertifyLearnedRule()`; save reachability certification and continue the normal knowledge-sync flow.

## Implemented interfaces and limits

- `scripts/lib/scraper/cdp.js`: CDP connection, `triggerClicCheck`, network capture, DOM utilities. Inspect actual function signatures before invoking; there is no `extractCLICAdvice({tabId,...})` export in `navigate_oca.js`.
- `scripts/scrapers/visual_clic_inspector.js` and `parse_clic_modal.js`: inspection/parsing helpers; they do not constitute a universal BOQ importer or a manifest-bound acceptance executor. Review active target and scope before use.
- `scripts/lib/boq/portal_receipt.js`: `readPortalReceipt(targetDir)` reads `evidence/clic_corrected_bom.json` and `clic_corrected_configuration.json`; `receiptMatches(receipt, items)` compares SKU/quantity manifests. Current receipt policy requires a complete BOM, reconciled prices, owner consistency, overall OK with zero unbuildables/errors/warnings/process-control issues, captures within 15 minutes, and age within 24 hours. Consult code for exact validation.
- A portal warning may be informational, but the current strict reader does not accept it. Preserve vendor severity and disclose the unresolved acceptance policy; never rewrite a warning as zero.
- The runtime plan is automated; arbitrary BOQ application and all selector interactions remain a live-agent procedure. Selector-aware unattended receipt closure is not implemented. Do not label a planned or partial run accepted.

## Deliverable state

Remain `PORTAL VALIDATION PENDING` while relevant investigations, requested-state readback or final receipt are missing. Preserve catalogue completeness, local physical checks, NotebookLM grounding and live acceptance as separate evidence states. Do not retire earlier NotebookLM sources until replacement readiness/content/citations are verified.
