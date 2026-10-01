---
name: conditional-sku-discovery-skill
description: Discover hidden and selector-dependent catalog SKUs, and investigate BOQ-specific conditional SKUs in a scoped live portal session. Keep catalog coverage, observed visibility, compatibility and final CLIC acceptance separate. Read docs/RUNTIME_CONDITIONAL_DISCOVERY.md for implemented APIs and current automation limits.
---

# Conditional SKU discovery

Read [the shared runtime procedure](../../../docs/RUNTIME_CONDITIONAL_DISCOVERY.md) first. It is the cross-agent source of truth for catalog capture and BOQ-triggered investigations.

## When to use

- During an authenticated catalog scrape before staging promotion.
- During BOQ evaluation when the runtime discovery plan identifies an absent or conditional SKU, unresolved trigger, or unverified configuration combination. This is scoped evidence gathering, not a full catalog rescrape.
- Do not invoke Jules or background CI/CD for customer portal investigations. INV-72 isolates CI/CD work; it does not prohibit BOQ-specific live investigation.

## Real implementation

```javascript
const { sendCommand, setupNetworkSniffer } = require('./scripts/lib/scraper/cdp');
const { extractHiddenElements, probeConditionalSkuVisibility } = require('./scripts/lib/scraper/dom_extract');
// ws must belong to the verified exact product/base/configuration.
const capture = await setupNetworkSniffer(ws);
try {
  const hidden = await extractHiddenElements(ws, sendCommand); // array
  // Only when appropriate for this investigation; this mutates and restores ambient.
  const conditional = await probeConditionalSkuVisibility(ws, sendCommand, [35, 30, 27, 25]);
  await capture.flush?.();
  const rules = capture.getCapturedRules();
  const coverage = capture.getCoverage?.() || { scope: 'UNAVAILABLE' };
  // Persist observations and provenance with safeWriteJsonAtomic; none is an acceptance receipt.
} finally {
  await capture.detach();
}
```

Those thresholds are probe inputs, not supported values for every product. The implementation inspects available options. Hidden DOM and ambient probing exist; arbitrary CPU/backplane/PSU/GPU/NIC/fan sweeps are live-agent work until an adapter is implemented and verified. Never set `sweepsExecuted` for an intended or skipped sweep.

## Runtime sequence

1. Read the canonical evaluation's runtime plan for every baseline/rank and configuration owner.
2. Open the exact base and apply/read back the whole candidate manifest and requested environment.
3. Investigate only relevant SKU gates and newly observed prerequisite branches using real controls or observed authenticated requests. Capture before/after state and advice.
4. Restore requested state; re-evaluate any changed configuration and run final CLIC validation separately.
5. Save scoped observations and certify evidence-backed lessons through continuous learning. Keep unresolved branches pending.

Missing from capture does not mean unsupported. Hidden does not mean orderable, mandatory, or incompatible. A visibility probe cannot silently lower the customer's environmental requirement. Empty output is inconclusive; capture errors must be disclosed.

## Persistence and compilation

- Raw scrape observations: `outputs/{Family}/{Gen}/{Model}/raw_data/conditional_skus.json` and `raw_data/unavailable_rules.json`.
- Universal DOM unavailable tables: `extractUnavailableDomRules(ws, sendCommand)` parses `table.UavailableTable`, `tr.uavailableTable_tr`, `.choice_header1[style*="red"]`, and row IDs `choice_column_titles_<choiceId>-<reason>` across all product categories.
- Classification engine: categorizes reasoning into machine-readable rule types: `AMBIENT_GATE`, `CHASSIS_GATE`, `MEMORY_MIXING`, `SLOT_COLLISION`, `PAIRED_KIT_REQUIRED`, `SUPPLY_RESTRICTED`, `MUTUAL_EXCLUSION`, and `BTO_DISALLOWED`.
- Catalog compilation: `applyUnavailableDomRulesAndSkus()` merges unavailable SKUs into `hardwareEntries` as `PORTAL_CONDITIONAL` with `isSelectable: false` and their explicit `ineligibilityReason`, while emitting compiled rules to `<Product>_Catalog_Rules.json` and `<Product>_Unavailable_Rules.tsv`.
- Workbook generation: `generate_xlsx.js` renders a dedicated `Unavailable Rules & Gates` sheet.
- NotebookLM sync payload: `sync_payload_builder.js` formats categorized semantic Markdown sections (`Thermal & Ambient Gates`, `Memory Mixing`, `Chassis Gating`, `Slot Collisions`, `Paired Kits`, `Supply Constraints`) for deep grounded RAG reasoning.
- Runtime BOQ plan: report-side `evidence/<report>_runtime_discovery_plan.json`.
- Narrative API: `generateEvaluationNarrative()` in `scripts/lib/boq/eval_output_serializer.js`; use the full evaluation result. Runtime probes apply to all proposed ranks, not only Rank 1L.

## Completion gate

A plan, hidden list or successful catalog build cannot close this workflow. Require exact final state readback, fresh complete vendor validation and retained evidence. Unsupported selector automation stays unresolved. Source replacement follows knowledge-sync verification, never discovery alone.


### Verified correction (2026-10-01)

See [the post-check-in review](../../../docs/audits/2026-10-01-post-checkin-scraping-review.md). Ambient tracking may be selectable SKU rows; the row adapter is implemented and restoration failures are fatal. Distinguish collapsed layout from unavailable status: S3U30C existed at 30C but was unavailable on P73282-B21; at tested 27C the restriction disappeared. Do not infer an allowed <=30C gate or all lower temperatures. NotebookLM row counts and fingerprints do not replace content: the semantic projection now retains displayed sheet data with shared-text references and full-content readback. The four scoped advisory lessons were cloud-verified in the exact DL380 Gen12 notebook; full catalog republishing remains separate.
