---
name: cross-vendor-transformation-skill
description: >-
  Translate a competitor hardware tender into an evidence-backed HPE proposal, preserving
  source requirements and documenting parity gaps.
  **DO call for:** "Convert this Cisco UCS BOM to HPE equivalent", "Provide HPE alternative
  for this Dell PowerEdge quote", "Translate this Lenovo tender to ProLiant."
  **DO NOT call for:** general competitive questions ("what does X cost?"), Gen11 vs Gen12
  comparisons, or freeform product questions — those route via presales-query-router.
---

# Cross-vendor transformation

Use the exact source requirements and requested target product. Never substitute a fixed chassis, CPU, GPU, drive, support SKU, price, or notebook ID. Missing information stays unknown; product examples and past portal receipts are not universal compatibility rules.

Read `docs/SOLUTION_TOPOLOGY_AND_VALIDATION.md` before mixed-domain work. Resolve each owned component against its exact catalog, generation and region. Preserve local drives, adapter counts, support terms and other explicit requirements in the closest proposal; disclose deviations separately.

## ⛔ HALT Conditions

```
HALT-CV1: If context.targetVendor / target chassis is not specified:
  emit [TARGET_PRODUCT_REQUIRED] — ask user to specify target platform before proceeding.

HALT-CV2: If source BOM rows are 0 after ingestion:
  emit [SCOPED_SIZING_REQUIRED] — cannot transform an empty source.
  Route to ocr-quote-ingestion-skill if source is an image/scanned PDF.

HALT-CV3: If source vendor catalog is not in certified outputs/ directory:
  emit [CATALOG_UNAVAILABLE — run oca-catalog-scraper for <targetChassis> first].
  Do NOT attempt transformation without certified ground truth catalog.
```

## Execution

1. Ingest the source through the existing spreadsheet/OCR workflow. Retain original rows, units, configuration ownership and per-node versus total quantities.
2. Use `scripts/evaluators/route_query.js` with explicit cross-vendor intent, source vendor and target chassis. The JavaScript API accepts `context.competitorSpec`, `context.targetBom` (per-node quantities), and `context.nodeMultiplier`. The CLI accepts text/JSON using `--file` and target identity using `--chassis`.
3. `scripts/lib/boq/cross_vendor_transformer.js` extracts partial CPU/memory requirements and retains all source lines. It does **not** autonomously select catalog parts or certify physical parity. Review unparsed requirements before sizing. A missing target returns `TARGET_PRODUCT_REQUIRED`; a missing candidate returns `SCOPED_SIZING_REQUIRED`.
4. Synthesize the target with the [RFP sizing skill](../rfp-sizing-synthesizer/SKILL.md) through the canonical sizing pipeline, then evaluate each complete candidate with `scripts/evaluators/eval_boq.js`. Do not execute throwaway tender scripts. The transformer retains supplied candidates separately from recommendations; an empty recommendation is an evidence gap, not a diskless solution.
5. Assess compute, memory, accelerators, thermal limits, controller/cache, cabling, data drives, boot, risers, networking, redundant power, and infrastructure/support. These are review categories; every unresolved category remains `NOT_EVALUATED`. Presence of a processor or DIMM description does not prove performance or quantity parity.
6. Use `validateSolutionWithEphemeralSource` in `scripts/lib/sync/nlm_solution_source_validator.js` with exact product notebook resolution, native citations and the complete manifest. A prose PASS is insufficient. Obtain a fresh live vendor acceptance receipt for the final unchanged manifest.
7. Generate only evaluated alternatives. Never label placeholder performance/budget tiers buildable or quote fixed historical savings. Use the [workbook generator](../workbook-generator-skill/SKILL.md) for its documented export dialect, and [commercial remarks](../boq-remarks-reconciliation-skill/SKILL.md) for customer reconciliation.

Default support is product-qualified 3-year Tech Care Basic only when the customer is silent. Select per owning icon with both apply-to-all controls off. Every deliverable remains `PORTAL VALIDATION PENDING` until final live acceptance. Offline operation must retain inputs and unresolved checks without inventing SKUs or cloud success.

