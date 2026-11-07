---
name: presales-clearance-strategy-skill
description: >-
  Dual-track 90-day clearance vs. active production baseline presales strategy, sourced from
  docs/audits/2026-10-20-sku-lifecycle-and-presales-clearance-strategy.md.
  **DO call for**: a customer BOQ or catalog query where a SKU is in a 90-Day EOL Warning or Clearance
  state and the presales answer needs side-by-side options with commercial remarks.
  **DO NOT call for**: plain price-history or lifecycle lookups (use catalog-intelligence-skill),
  or physical thermal/power checks (use boq-eval-skill).
---

# Presales Clearance Strategy (`presales-clearance-strategy-skill`)

Comply with [Normative Language Standard](../../rules/normative_language.md).

## 1. Source and evidence limits
- **Only source**: [2026-10-20 SKU lifecycle and clearance audit](../../../docs/audits/2026-10-20-sku-lifecycle-and-presales-clearance-strategy.md). Every pattern below comes from it. The audit's live evidence is one DL380a Gen12 session, dated 2026-10-20; prices, badges, lead times and end dates MUST be re-read from the current catalog before quoting.
- **Invariant labelling is unresolved**: root `AGENTS.md` labels this strategy `INV-179`, but `docs/INVARIANTS.md` defines `INV-179` as the Atomic Icon Principle (CLIC Rule 81322276). Cite the audit document, not an invariant number, until a human reconciles the two.
- The audit observed one clearance SKU at a 42.01% price drop. No general discount percentage, quote-validity period or disclaimer text is defined in the sources. Do not state one.

## ⛔ HALT Conditions

```
HALT-PCS1: If a clearance or 90-Day-EOL SKU has no active-lifecycle alternative identified in the catalog:
  emit [ERR_NO_ACTIVE_BASELINE] and present the clearance SKU as a single flagged option only.
  Do NOT label it recommended.

HALT-PCS2: If the SKU's end date, price or lead time cannot be read from the current catalog:
  emit [ERR_LIFECYCLE_EVIDENCE_MISSING]. Keep missing lead time as null (Invariant F15); do NOT invent a value.
```

## 2. Presales recommendation pattern (from the audit, section 3)
Present options side by side using `scripts/lib/boq/commercial_remarks.js`:

| Option | Role | Remark pattern (audit wording) |
| :--- | :--- | :--- |
| A | Long-term production standard (active lifecycle, published lead time) | `[RECOMMENDED PRODUCTION BASELINE]` |
| B | Fast-track clearance (90-Day EOL) | `[FAST-TRACK / CLEARANCE OPTION]` with the end date and a caution for rollouts past it |
| C | Option with unpublished lead time | `[DELIVERY RISK WARNING]` |

A rigid rejection of a 90-Day-EOL SKU is counter-productive when stock can be committed immediately. Equally, a clearance SKU MUST NOT replace the production baseline unless the customer asked for it.

## 3. Engine touchpoints (from the audit, section 4)
- `least_delta_combinator.js:auditDiscontinuedTroublesomeSkus` checks customer inputs against `discontinued_skus.json`.
- `_scoreActiveReplacementCandidate` matches on capacity, interface, workload, form factor and historical budget anchor.
- Rank 2 `MODERNIZED_ACTIVE_BASELINE` carries the active alternative.
- Missing lead times stay `leadTimeDays: null` / `Unpublished by OCA`.

## 4. Related skills
- [catalog-intelligence-skill](../catalog-intelligence-skill/SKILL.md)
- [boq-remarks-reconciliation-skill](../boq-remarks-reconciliation-skill/SKILL.md)
- [least-delta-combinator-skill](../least-delta-combinator-skill/SKILL.md)
