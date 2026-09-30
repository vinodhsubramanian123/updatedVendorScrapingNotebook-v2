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

- Raw scrape observations: `outputs/{Family}/{Gen}/{Model}/raw_data/conditional_skus.json`; current writer uses `skus` (array), timestamp and chassisName.
- Runtime BOQ plan: report-side `evidence/<report>_runtime_discovery_plan.json`.
- Compiled rules: `<Product>_Catalog_Rules.json` via `applyConditionalDiscovery(entries, observations)` in `scripts/lib/catalog/conditional_discovery.js`.
- Current compiled fields: `ruleType: CONDITIONAL_VISIBILITY`, `affectedSkus`, `conditionKey`, `conditionOperator`, `thresholdValue`, `portalVerificationRequired`. Ambient operators are `lte`/`gte`; unresolved gates remain unknown. These are visibility observations, not `MANDATORY_IF` rules.
- Preserve exact base, owner, selector state and evidence time when available. Do not merge different bases or trigger combinations by SKU alone. A SKU missing in one unvisited state is not a removal.
- Narrative API: `generateEvaluationNarrative()` in `scripts/lib/boq/eval_output_serializer.js`; use the full evaluation result. Runtime probes apply to all proposed ranks, not only Rank 1L.

## Completion gate

A plan, hidden list or successful catalog build cannot close this workflow. Require exact final state readback, fresh complete vendor validation and retained evidence. Unsupported selector automation stays unresolved. Source replacement follows knowledge-sync verification, never discovery alone.
