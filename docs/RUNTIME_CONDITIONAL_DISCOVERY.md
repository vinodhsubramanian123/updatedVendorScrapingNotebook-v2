# Catalog discovery and BOQ-scoped runtime validation

This is the shared procedure for Codex, Gemini/Antigravity and Claude. Read it before catalog capture or BOQ portal validation. It supersedes older claims that a default DOM capture, a successful build, or a list of chassis candidates certifies a whole generation.

## Evidence boundaries

| Evidence | What it establishes | What it does not establish |
|---|---|---|
| Chassis search result | A candidate base and its description were observed | Its options were traversed or shared with another base |
| Hidden DOM / selector probe | A SKU was present under the captured state | Requiredness, compatibility, price, or orderability |
| Authenticated backend response | A dated rule/message for the observed request and state | All API rules or all possible combinations |
| Catalog + workbook tally | Captured data agrees across the generated artifacts | Exhaustive portal coverage |
| Exact current CLIC receipt | Acceptance of that manifest within its validity window | Acceptance of another rank, quantity, owner, selector state, or chassis |

Product scope is **vendor + solution domain + family + generation + exact base SKU + owning configuration/component**. OEM, commercial, regional and TAA variants must remain distinguishable. A rule on one base is not a universal generation rule unless the vendor evidence explicitly covers the others. For DL380 Gen12, P77819-B21 was observed as OEM CTO; P73282-B21 was selected as the commercial CTO. These observations are not a permanent availability/price claim or an automatic substitution rule.

## Workflow A: catalog capture

1. Use the catalog freshness/refresh planner for every BOQ workbook sheet and every distinct product configuration; preserve sheet and owner identifiers. First capture, dated refresh, cloud-only sync and reuse are different operations.
2. Navigate using the exact product/base. A generic request must not silently choose OEM. An explicit SKU/filter that has no match must fail, never select the first result.
3. Discover candidates and record discovered versus visited bases separately. Capture each visited base's hierarchy, options, prices, support and rules with provenance. Do not pool compatibility across bases by SKU alone.
4. Expand sections, walk hidden DOM, probe supported observed selectors, and capture authenticated backend responses. Start interception before the relevant interaction; capture failures and pending responses remain evidence gaps.
5. Record selector state before and after each probe. Restore the original state in `finally`. Sweep only values actually available for the exact base. Never lower a customer's ambient requirement merely to reveal an attractive GPU.
6. Build and audit the staged JSON/TSV/workbook. Compare unique SKUs, services, rules, categories, sheets, hashes and dated deltas before promotion. Unknown recommendation/price/capacity remains unknown.
7. Verify new NotebookLM source identity, readiness, content and grounded citations before retiring the earlier managed sources. Capture timestamps are vendor observation times, not rebuild times.

**Current automation boundary:** hidden-DOM extraction and ambient probing exist. CPU/backplane/PSU/GPU/NIC/fan multi-selector traversal and exhaustive all-base capture are not implemented as unattended enumeration. Mark unvisited branches explicitly. Do not convert intended sweep tables in a skill into a success claim.

## Workflow B: runtime checks for a concrete BOQ

This is a bounded live investigation followed by final acceptance, not an exhaustive product rescrape and not Jules CI/CD work.

1. Run the canonical BOQ/query pipeline. Keep every workbook sheet/configuration and proposed rank separate. The deterministic runtime planner identifies missing catalog SKUs, known conditional rows, trigger conditions, unresolved base/quantity/identity, and an exact manifest fingerprint.
2. Inspect `<report>_runtime_discovery_plan.json` beside the report in `evidence/`. A catalog miss means **unverified**, not invalid/unsupported. Do not substitute or remove a requested SKU just because it was absent from the default capture.
3. Use `oca-portal-navigator` to open the exact base in a disposable configuration. Apply the candidate's full SKU/quantity manifest, ownership and explicitly requested environmental state using observed portal controls. Read the full manifest back before investigating. Do not validate against whichever BOQ happens to be open. Support selection belongs to the owning component; keep apply-to-all off.
4. Inspect each planned SKU and relevant selector condition. Walk hidden elements and use the known ambient probe only where appropriate. For CPU count, backplane, PSU, GPU, NIC or fan conditions, inspect the actual controls or authenticated runtime requests, apply the BOQ-relevant state, wait for recalculation, capture newly appearing/disappearing SKUs, changed prices and advice, and restore state. If an interaction/adapter is unavailable, record it as unresolved; do not invent a control or API endpoint.
5. A discovered prerequisite can trigger another scoped probe. Repeat until no new prerequisites or conflicts appear for the tested manifest, or stop with an explicit unresolved boundary. Cache only identical product/base/owner/quantity/selector/catalog fingerprints; changed quantities or selectors invalidate reuse. Do not enumerate the Cartesian product of every catalog option for each BOQ.
6. Preserve raw vendor response, observation time, base SKU, owner, full before/after manifest, requested/observed selector states, rule ID and evidence path. Absence of a response or an empty hidden list is not proof of no conditional rules. Unclassified backend messages remain observations.
7. Restore the requested final state and read back the final full BOQ. Re-run local/domain checks and grounded review after each modification. Then run CLIC and bind its receipt to the exact final manifest and state. Discovery may run before local checks are all PASS; final acceptance may not. An exploratory CLIC error is useful evidence, not acceptance.
8. Persist only evidence-backed, correctly scoped lessons using `recordAndCertifyLearnedRule()`. A customer BOQ or model guess is not a vendor rule. Scoped workflow advisories must not manufacture dependencies. Export reachability evidence beside the product report; sync using the existing knowledge-sync flow. Preserve earlier sources until replacement verification succeeds.

## Executable wiring

- `scripts/lib/boq/runtime_discovery_plan.js`: deterministic `buildRuntimeDiscoveryPlan(evaluation, options)` and report formatting. Reads the exact catalog plus `raw_data/conditional_skus.json` and `<Product>_Catalog_Rules.json`. Fingerprints include scope, full SKU suffixes, quantities, selectors and catalog content. Plan status is pending, never accepted.
- `evaluatePhysicalMath()` in `boq_evaluator.js`: attaches the plan to server evaluation output. The shared acceptance gate also recomputes it for supplied baseline/rank manifests across domains.
- `eval_output_serializer.js`: recomputes from final ranks, writes the atomic report-side plan and includes runtime investigations in the report. This prevents a plan for an earlier rank being silently reused after substitutions.
- `bom_verifier.js`: U6 surfaces unresolved conditional/missing SKU investigations as blocking UNKNOWN evidence. Local evaluation remains usable offline, with unresolved live evidence disclosed.
- `dom_extract.js`: real APIs are `extractHiddenElements(ws, sendCommand)` and `probeConditionalSkuVisibility(ws, sendCommand, thresholds, captureState)`. They return arrays. `cdp.js` re-exports these and provides `setupNetworkSniffer(ws)`; call `flush()` before snapshots and `detach()` in `finally`.
- `conditional_discovery.js`: `applyConditionalDiscovery(entries, observations)` compiles **CONDITIONAL_VISIBILITY**, not mandatory dependencies inferred from visibility.
- `portal_receipt.js`: existing fresh complete receipt checks and exact manifest matching remain separate. The runtime plan does not mark a receipt accepted or clear U6. Full selector-aware automatic receipt binding is still required before unattended closure.

**Execution disclosure:** plan creation and export are automated. Applying arbitrary BOQs and all selector types to HPE OCA is still a live-agent procedure using observed UI/runtime evidence; no universal unattended portal executor exists. Do not report that a generated plan was executed. Do not detach old knowledge sources on the strength of a plan or a hidden-DOM observation.

## Durable learning and reachability

The versioned workflow advisory seed is `scripts/config/scraping_workflow_learnings.js`. Apply it with `node scripts/maintenance/record_scraping_workflow_learnings.js`. It uses the continuous-learning API and saves certification beside the DL380 Gen12 evidence. Re-running is idempotent by stable delta ID. Reachable means the knowledge router loads the advisory; it does not prove hardware validity, completed portal work or cloud synchronization.


### Verified correction (2026-10-01)

See [the post-check-in review](audits/2026-10-01-post-checkin-scraping-review.md). Ambient tracking may be selectable SKU rows; the row adapter is implemented and restoration failures are fatal. Distinguish collapsed layout from unavailable status: S3U30C existed at 30C but was unavailable on P73282-B21; at tested 27C the restriction disappeared. Do not infer an allowed <=30C gate or all lower temperatures. NotebookLM row counts and fingerprints do not replace content: the semantic projection now retains displayed sheet data with shared-text references and full-content readback. The four scoped advisory lessons were cloud-verified in the exact DL380 Gen12 notebook; full catalog republishing remains separate.
