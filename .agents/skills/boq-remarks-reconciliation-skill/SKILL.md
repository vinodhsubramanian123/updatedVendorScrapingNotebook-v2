---
name: boq-remarks-reconciliation-skill
description: Add auditable commercial remarks and quantity bridges to customer BOQ reconciliations while preserving all original cells. Use when explaining matches, substitutions, additions, reductions or carrier allocations.
---

# Commercial remarks and reconciliation

Use `scripts/lib/boq/commercial_remarks.js` for header resolution and action formatting. It is a pure data helper, not a workbook editor or a live Google Sheets publisher. Use the appropriate spreadsheet skill and canonical workbook generator for actual artifacts. Do not run a historical scratch script against a new customer file.

## Preserve the customer baseline

Locate each table's header row from its content. `resolveTenderColumns(headerRow)` recognizes part number, description, quantity, multiplier and unit-price aliases, and rejects missing required or ambiguous columns. If a customer's header is outside those aliases, supply an explicit reviewed mapping rather than guessing. Never assume fixed column letters or overwrite customer Remarks/Notes.

Append an Engineering Remarks & Configuration Action column beyond the occupied extent of each table. `appendCommercialRemarks(rows, remarksByRow, headerIndex)` demonstrates the row-array contract and preserves input values. For real workbooks, retain formulas, styles, merged ranges and customer cells; write only analysis cells in a copy. Verify the original customer cells remain unchanged, including notes containing words such as “spare”.

## Actions and evidence

`formatCommercialRemark(action, context)` accepts these primary actions:

| Action | Meaning |
| --- | --- |
| `MATCHED` | Verified equality of SKU, quantity basis, description/specification and commercial terms |
| `MODERNIZED` | Proposed substitution, with evidence and performance differences disclosed |
| `REDUCED` / `BUFFERED` | Explicit quantity decrease/increase, with reason and customer requirement impact |
| `REMOVED` | Omitted from the proposed build; disclose unmet requirements and billing treatment |
| `FACTORY_INCLUDED` | A separately priced line omitted because documented bundle evidence includes it |
| `ABSORBED` | Allocated to a named destination, with forward and backward quantity references |
| `ADDED` | Proposed additional dependency or service, separately costed |
| `NOT_EVALUATED` | Reconciliation or evidence remains incomplete |

Provide `configuredQty` as a nonnegative integer (or null/omitted for `NOT_EVALUATED`), `proposedSku` when resolved, and `reason` for every non-match. Unknown quantity is displayed as Unresolved, never zero. `MATCHED` requires `exactMatch: true` from actual reconciliation; the formatter does not establish parity itself. `ABSORBED` additionally needs `sourceRef`, `destinationRef` and `quantityBridge`. Missing evidence never becomes a blank remark or an assumed match. Proposed SKU wording must not assert active orderability without current vendor evidence.

Do not silently reduce drives, change adapter form factors, replace CPU generations or add carrier nodes to meet a portal rule. Preserve the closest requested solution and show constrained alternatives separately. “Dropped” must not imply “delivered as a spare”. Explicit requested spares remain source requirements and may require a separately scoped field-order proposal.

## Quantity reconciliation

Use structured rows, not numbers extracted from prose. For each source SKU and owner, compute requested quantity from its explicit per-node/total basis; apply the multiplier once. Record allocation links containing source row, destination row and allocated quantity. Check that no source quantity is allocated twice and that every shortfall, addition and buffer is disclosed per SKU. Aggregate capacity alone cannot prove line-level reconciliation.

Generate group names, table references, node counts, note positions and merged spans from the actual workbook. Never assume “Pool A/B”, a second section, or a fixed number of carrier nodes. Footer notes summarize actual evidence and exceptions; they must not guarantee factory acceptance, warranty or 24x7 support. Default only unspecified support to product-qualified 3-year Tech Care Basic.

Use consistent visual cues (green matched, blue substitution, amber reduction, teal buffer, rose removal, purple allocation) with visible action text. Colors are presentation defaults, not hardware rules. Keep internal portal identifiers out of generated client remarks while preserving original customer text.

Before delivery, compare source cells against the saved baseline, reconcile each allocation and buffer, and ensure every unresolved row remains visible. Use [output-validation-skill](../output-validation-skill/SKILL.md) for the broader delivery checks. Keep `PORTAL VALIDATION PENDING` until the final unchanged manifest has fresh live vendor acceptance.
