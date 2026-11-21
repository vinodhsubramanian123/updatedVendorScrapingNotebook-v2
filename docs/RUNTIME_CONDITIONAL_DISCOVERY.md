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
6. Build and audit the staged JSON/TSV/workbook. Compare unique SKUs, services, rules, categories, sheets, hashes and dated deltas before promotion. Execute the scoped replay suite against those artifact hashes. Preserve customer workbooks and historical evidence and prefer staged receipts on name collisions. Unknown recommendation, price, and capacity remain unknown. See [the catalog evidence contract](CATALOG_EVIDENCE_AND_LEARNING.md).
7. Verify new NotebookLM source identity, readiness, content and grounded citations before retiring the earlier managed sources. Capture timestamps are vendor observation times, not rebuild times.

The Synergy 12000 frame `P51174-B21` has its own commercial frame catalog. Capture its menu with `npm run scrape -- --chassis Synergy_12000_Frame`. The frame catalog records options offered by the frame, including power cords and module part numbers. The F32 and 4-port Frame Link Module captures use the Components tree under the exact frame. For the Brocade 64Gb Fibre Channel Module, the scraper selects one `P77653-B21` in a fresh frame configuration, reads back that selection, and opens its owned menu. All three captures verify the exact child and parent SKUs. Support evidence records selected services or the absence of the component in the observed service tree. Alternative service selections and other portal configurations require separate observations.

Run `node scripts/maintenance/audit_product_rules_association.js --require-fresh --require-published` to compare the product inventory and its known owned scopes with capture receipts and the published artifact hashes. The portfolio dashboard shows the OCA capture and NotebookLM publication dates independently. A recent publication can refer to an older capture. New capture work uses `outputs/.catalog-staging`; the resume command can also read retained stages from the previous `outputs/temp` location.

### Nested product scopes

Register each independently configurable menu in `scripts/config/notebooks.json` with its exact `baseSku`, family, generation, pillar, and coverage profile. For a menu reached through another product, set `captureViaParent: true` and `parentProductId` to its immediate owner. Set `ocaMenuName` to the displayed OCA menu title for models the product parser does not recognize. Use `ocaSearchQuery` on a root registration when its portal search label differs from the product ID. A `parentOptionCategory` can identify a verified selector that reveals a child in a fresh catalog configuration.

The capture starts at the registered root and verifies every base SKU and breadcrumb before entering the next owned menu. Receipts bind the complete ownership path. The planner adds the ancestors needed to capture a leaf, and `--include-owned` walks the registered subtree. Keep independent expected scopes in `ownedCatalogs` in `scripts/config/chassis_map.json`. Nested declarations can use their own `ownedCatalogs` lists. The audit surfaces missing registrations, invalid ownership paths, and unregistered configured menus observed in OCA. A menu visible only under an unvisited selector remains outside the observed capture.

```powershell
node scripts/catalogs/ensure_catalogs.js --product Synergy_12000_Frame --include-owned
node scripts/catalogs/ensure_catalogs.js --product Synergy_12000_Frame --include-owned --execute
```

**Current automation boundary:** hidden-DOM extraction (`extractHiddenElements`), ambient probing (`probeConditionalSkuVisibility`), and single-selector unconfigured backplane/drive-cage probing (`drive_cage_selector_probe.js:probeBackplaneSelectorSkus`, capped at `maxSelectors = 2` when hot-plug drive tables are absent in default DOM) exist automatically. Multi-selector CPU/backplane/PSU/GPU/NIC/fan Cartesian traversal and exhaustive all-base capture are not implemented as unattended enumeration. Mark unvisited branches explicitly (e.g., `HIDDEN_DOM_AMBIENT_AND_SCOPED_BACKPLANE_SELECTORS_OTHER_MACROS_UNVERIFIED`). Do not convert intended sweep tables in a skill into a success claim.

### WebLogic AJAX DOM vs CSS-Hidden DOM & Live Update Feedback Loop

Vendor configurators like HPE WebLogic OCA expose conditional options through **two distinct DOM behaviors**:
1. **CSS-hidden / collapsed DOM & `table.UavailableTable`:** Present in initial HTML (`display:none` or accordion tabs) and captured automatically by `extractHiddenElements`, `extractUnavailableDomRules`, and CDP network response snapping (`networkSniffer`).
2. **Server-rendered AJAX-injected sections:** Absent from the initial DOM (`0` table rows at default state) until an owning selector option (e.g., stacking drive cage/backplane kit) is toggled to `1` (`>0`), triggering a server round-trip; resetting that selector back to `0` strips those rows back out of the DOM.

When a customer BOQ or scrape hits an uncaptured AJAX-gated dependency:
1. Run `drive_cage_selector_probe.js:probeBackplaneSelectorSkus` during scraping (automatically invoked by `scrape_oca_solution.js:_appendBackplaneSelectorSkus` when `HotPlugSFFChoice` / `HotPlugLFFChoice` rows are hidden) OR execute a BOQ-scoped live CDP probe from `<report>_runtime_discovery_plan.json` for non-backplane selector trees.
2. Record each revealed item with `conditionType: "SELECTOR_STATE_CONDITIONAL"`, `observedInPortal: true`, `selectorTriggerSku`, lead time, lifecycle dates, and price; strictly restore selector quantity to `0` in `try/finally` (failing loudly with `BACKPLANE_SELECTOR_RESTORE_FAILED` on restore failure).
3. Persist into `raw_data/conditional_skus.json`, rebuild via `scripts/catalogs/build_catalog.js` (`resolveConditionalRawData` + `conditional_discovery.js:applyConditionalDiscovery` materializing portal-observed entries into `hardwareEntries`), verify `sync_payload_builder.js` selector tables + NotebookLM readback via `post_flow_sync.js`, and record scoped learnings via `recordAndCertifyLearnedRule()`.

For a scoped backplane check, pass the plan's `selectorTriggerSku` in `probeBackplaneSelectorSkus` option `selectorSkus`. The probe records a completed sweep only after it reads quantity `1` in the target row and confirms that the same row returns to `0`. An unavailable requested selector produces an explicit skip.

### Non-Negotiable BOQ, Parser & Topology Validation Gates (`INV-241`)

- **CDP Fail-Loud Polling:** `cdp.js:waitForDOMPredicate` and `navigate_oca.js:_pollForActiveOcaReadiness` abort immediately on `SyntaxError` / `ReferenceError` evaluation exceptions; DOM helpers serialize arguments via `JSON.stringify`.
- **Workbook Price & Service Header Fidelity:** `boq_parser.js` enforces strict header precedence so `Extended List Price` never overwrites `Unit Price`; `0D1`/`B19` modifiers consolidate without quantity inflation; `configuration_context.js` treats qty-1 install/support wrappers as `quantityScope: "global"` while preserving customer-originated services across `B8`.
- **Reconciliation & Catalogs:** `route_query.js:_resolveReconciliationBaseline` resolves raw pre-expansion items across per-node multipliers vs global scope and validates SaaS/care SKUs against sibling `*_Services.json` catalogs alongside hardware `entries`.
- **Path-Separated Cabling, Category Parity & Fast-Ship Clarity:** `storage_tri_mode.js` validates backplane-to-controller storage signal cables independently from CPU-to-slot OCP enablement cables and sideband telemetry cables; `networking_ocp.js` excludes storage/backplane cables when counting OCP adapters; `least_delta_combinator.js` enforces strict component-category matching and excludes non-hardware OS/management licenses before replacement scoring; `strategy_synthesizer.js` revalidates coupled topology fast-ship candidates cleanly, labels configurator solution EDT ranges separately from single-part catalog lead times, and carries forward live configurator warnings so `0`-error configurations with advisories remain `PORTAL VALIDATION PENDING`.

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
