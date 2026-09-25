---
name: heterogeneous-tender-modernizer
description: Plan mixed-domain hardware tenders and explicitly requested loose-component carrier allocations while preserving source rows, quantity ownership and unresolved validation gaps.
---

# Heterogeneous tender modernization

Read `docs/SOLUTION_TOPOLOGY_AND_VALIDATION.md`. Route by owned component role, not table title or product family. Mixed assemblies, unknown components and containment gaps remain unresolved; do not run them through server defaults.

## Inputs and execution

Use `scripts/evaluators/route_query.js` with heterogeneous intent. Supply `context.tables` or a JSON `--file` containing table groups. Each group has `items`, an optional stable `id`, and an explicit `multiplier` (defaults to one). Each item needs `quantity` or `qty`. Preserve original part numbers, descriptions, prices, notes and requested quantities. Ingest Excel/PDF through the appropriate existing ingestion skill before this route; it does not read binary workbooks itself.

The implementation is `scripts/lib/boq/heterogeneous_tender_modernizer.js`:

- `categorizeTenderItems` preserves groups and multipliers. It uses component role anchors; mixed or unidentified groups are retained in `unresolved`. Explicit `isAdHocTable`, `isAdHocGroup`, `isAdHocRow` or `isOrphan` marks loose requirements. A customer request for spares does not authorize mounting or dropping them.
- `synthesizeCarrierFleet` requires an exact server profile via `context.targetPlatform` or CLI `--chassis`. Profile lookup must be unambiguous. No default model is inferred. Current planning covers memory capacity estimates only: it preserves source identities, applies group multipliers once, and discloses proposed buffers. It does not prove minimal fleet size, balanced memory, compatibility or full BOM completion. NICs, drives, CPUs and other unallocated items remain visible in `unresolvedItems`.
- `injectMissingDeepDependencies` delegates to scoped evaluation instead of injecting an inventory of kits without predicates. Run complete owned candidates through `eval_boq.js`; resolve CPU activation, riser occupancy, backplanes, power, cooling and support from product evidence.
- `resolveActiveHardware` retains the requested SKU and exposes profile replacements only as candidates. Historical lifecycle dates do not prove current ordering availability or equivalent performance.
- `buildDualDeliverables` returns draft data with source rows, proposed pools and unresolved items. It does not create certified spreadsheets or publish to Google Sheets.

## Evidence and delivery

Use the structured ephemeral validator in `scripts/lib/sync/nlm_solution_source_validator.js` with the exact scoped notebook, native citations and complete manifest. `resolveHardwareWithFallback` returns a validation handoff, not an ungrounded notebook verdict. Live portal acceptance is separate and must be renewed after manifest changes or expiry.

Use [commercial remarks](../boq-remarks-reconciliation-skill/SKILL.md) for dynamic headers, action tags and bidirectional quantity bridges. Identify source/destination groups from actual inputs; never reuse historical table numbers, pool names, server counts or notebook IDs.

Choose the export dialect explicitly:

- `generateOcaUploadRows` is a four-column batch row formatter (`Qty`, `Product #`, `Description`, `Config Name`), with two blank rows between blocks. It validates positive integral quantities and nonempty SKUs, adds no banner rows, and does not validate ownership or vendor compatibility. Repeated configurations must be explicitly expanded; no SKU suffix rewriting is permitted.
- The seven-column Partner Portal/reconciliation workbook is a different format produced by `scripts/lib/boq/generate_boq_xlsx.js`. Follow [workbook-generator-skill](../workbook-generator-skill/SKILL.md), and confirm the receiving interface rather than asserting one universal upload format.

Default unspecified support to product-qualified 3-year Tech Care Basic, selected independently per icon with both apply-to-all controls off. Preserve requested support. Keep `PORTAL VALIDATION PENDING` visible until a fresh final-manifest receipt exists. Use the [continuous learning skill](../continuous-learning-skill/SKILL.md) to persist newly evidenced lessons in their product scope; estimates are not learned vendor rules.
