# Remaining catalog code gaps and implementation plan

20 November 2026 · Offline review of the working tree based on commit `5fcf7d76`, including the catalog changes in progress.

The implementation and ongoing verification expectations are recorded in [Catalog evidence, replay, and learning](../CATALOG_EVIDENCE_AND_LEARNING.md).

Antigravity is implementing stricter field parsing, structured catalog search, staged capture replay, and product refreshes. The remaining work is to make the new paths preserve the requested scope, substantiate customer-facing claims, and close a query miss only when the original question can be answered. The counterexamples below were reproduced against local fixtures unless identified as a source review.

## P0 · Bind search and acceptance to the original request

**Evidence.** An explicit request for DL999 Gen12 returned DL380a Gen12 results because the unmatched model disappeared from the filter. “Under 150 GB and under $40,000” produced a $150 price ceiling. The response verifier passed a fixture containing the wrong product, a $999 price under a $200 ceiling, 999 days under a 10-day limit, and incorrect sort order. In the opposite direction, calling the verifier without a parsed request made an ordinary GPU list require both price and lead time. An unreadable catalog and a catalog with only unpriced candidates both reported complete coverage. [Search parser, executor, and verifier](../../scripts/lib/catalog/catalog_query_engine.js#L105) · [Router](../../scripts/evaluators/route_query.js#L1183) · [CI2 acceptance](../../scripts/lib/boq/bom_verifier.js#L1634)

**Implementation.** Carry one normalized request through classification, execution, and acceptance. Preserve explicit unresolved model tokens, model-generation pairs, the dashboard’s selected model when it supplies the only scope, units, and unsupported hard filters. Bind acceptance to that trusted request. Check returned product, role, limits, sort, and result counts. Collect per-source read statuses and field exclusions. Preserve a partial answer when some eligible rows lack required evidence. Reserve a definitive zero-match result for a readable, applicable scope with sufficient coverage.

**Acceptance tests.** A named unknown model returns an unresolved-scope result. Combined GB, USD, and day limits bind to their own clauses, including strict versus inclusive bounds. A plain SKU list succeeds with unavailable price or ETA. Missing, corrupt, and unpriced data each produce a diagnostic outcome. Mutating the product, range, order, or count after execution fails acceptance.

## P0 · Establish availability and preserve selector evidence

**Evidence.** A fixture explicitly marked `PORTAL_CONDITIONAL` and `isSelectable: false` projected as visible, orderable, and unconstrained. “Orderable GPUs” compiled to a lifecycle filter for Active. “EOL Warning (90-Day)” normalized to Obsolete. The search engine also stores conditional observations in a map keyed by SKU, so later observations can replace earlier ones from different selector states. [Availability parser](../../scripts/lib/catalog/field_parsers.js#L460) · [Search row loading](../../scripts/lib/catalog/catalog_query_engine.js#L198)

**Implementation.** Read the builder's actual conditional fields and keep all applicable observations by exact SKU, base, owner, selector state, and capture. Carry lifecycle, visibility, selectability, observed availability, and compatibility independently. Require positive, applicable evidence for an orderable filter. Preserve whether lead-time data is an estimate and use the upper end of an observed range for hard delivery ceilings.

**Acceptance tests.** A conditional or explicitly unselectable row stays out of orderable results. Two observations from different base or selector contexts remain distinguishable. A 90-day warning keeps its own state. A 21–35 day observation stays out of a hard delivery limit of 30 days. Missing status produces unknown; unknown coverage stays visible in the response.

## P0 · Protect SKU identity and historical pricing

**Evidence.** A catalog captured on 20 November supplied a $120 price for an as-of query dated 1 January. The price was labeled high confidence and effective on 1 January. A separate fixture filled `P69727-B21` with the price and lead time of `P69727-F21` using the same series stem. The peer history fallback returns a trail without the peer identity. The backfill helper case reproduces at the function boundary. The cited review found only its definition and tests, so current production impact from that helper remains unproven. [Historical pricing](../../scripts/lib/catalog/sku_versioning.js#L539) · [Peer history](../../scripts/lib/catalog/sku_versioning.js#L80) · [Cross-solution matching and backfill](../../scripts/lib/catalog/cross_solution_pricing.js#L248)

**Implementation.** Require dated evidence at or before the requested date and retain the actual observation date and scope. Surface newer and peer observations with their real source when useful. Match exact SKUs, including fulfillment and regional suffixes, for prices and ETAs. Keep related variants discoverable under explicit variant comparison. Preserve confirmed included or zero-price items and disclose cross-scope estimates.

**Acceptance tests.** An as-of date before the first capture yields unresolved historical pricing. A newer price can appear only with its own observation date. B21 and F21 remain distinct for totals and ETA, and conflicting exact-SKU observations retain provenance. Check the historical BOQ roll-up alongside the single-SKU path.

## P0 · Make staged capture replay a dependable release gate

**Evidence.** A missing replay suite returned `passed: true` and zero cases. A case the parser could not recognize also returned `passed: true` with a skip explanation. The runner reads product cases and the default template. The configured portfolio case and assertions such as `verifyLeadTimeMeasured` have no equivalent execution in that runner. The SKU replay reads rows directly, so it can miss a failure in the actual routed response. [Replay runner](../../scripts/lib/catalog/capture_query_replay.js#L159) · [Configured cases](../../scripts/config/catalog_query_replay_suite.json) · [Staging receipt](../../scripts/lib/catalog/catalog_capture_receipt.js#L236)

**Implementation.** Require a readable suite, validate case kinds and assertions, and distinguish executed, failed, skipped, and inapplicable cases. Require a positive executed-case count for each applicable gate. Replay exact-SKU and structured searches through the canonical local route with an injected staged catalog set. Keep staged product replay and cross-catalog replay independently reported. Bind the results to the suite version and input artifact hashes in the capture receipt. Use positive controls and explicit tests for honest empty results.

**Acceptance tests.** Missing or corrupt suite, unknown assertion, unparsed required query, zero executions, and mismatched expected scope each block the relevant gate. Include the price, scope, availability, and time counterexamples above. Prove a failed stage leaves the previous promoted catalog and receipt readable. Verify that the portfolio drift assertion actually executes against its declared inputs.

## P1 · Close query misses with verified outcomes

**Evidence.** The scraper loads pending query misses and marks matching product items `PROBED_BY_SCRAPE` immediately after saving raw staging data. This occurs before catalog validation and promotion, without proof that a targeted selector ran or that the original query improved. The writer stores raw query excerpts and uses a capped read-modify-write queue. [Queue writer](../../scripts/lib/catalog/catalog_query_engine.js#L583) · [Scraper status update](../../scripts/scrapers/scrape_oca_solution.js#L1347)

**Implementation.** Store a redacted typed query, reason, evidence scope, stable issue ID, count, and trace references. Deduplicate recurring misses and lock read-modify-write updates using the existing file lock. Track attempted, verified resolved, still unresolved, and failed outcomes. Close a specific issue only after the exact-scope evidence exists and the original query replays successfully against the promoted artifacts. Keep genuine zero matches distinct from actionable coverage gaps. Surface recurring misses and closure rates through run telemetry.

**Acceptance tests.** Failed and rolled-back captures leave the issue open. An unrelated product or selector cannot close it. Concurrent enqueue and resolution preserve both updates. Success requires the exact capture reference and replay outcome. A partial answer with a material evidence gap can create a typed issue.

## P1 · Align dashboard, CLI, and MCP behavior

**Evidence.** The dashboard and CLI use the routed catalog search. MCP `query_catalog_db` calls local RAG directly, so the same question can bypass structured filters, field validation, and scope evidence. [MCP dispatch](../../scripts/services/mcp_server.js#L973)

**Implementation.** Use the verified catalog response across entry points for structured requests. Preserve the MCP response contract for existing callers or version it explicitly. Carry scope, case outcome, exclusions, evidence references, and effective dates through the dashboard and persisted run record.

**Acceptance tests.** Send the same fixture-backed filter, invalid scope, and incomplete-data question through all three entry points. Assert equivalent eligible rows and evidence disposition. Verify that a dashboard reload preserves the original scoped answer and partial status.

## Implementation order and release checks

1. Keep the active capture work as the integration baseline. Rerun the fixture counterexamples against its final diff before assigning ownership of each remaining item.
2. Fix scope and acceptance, availability, and as-of pricing. Use isolated local fixtures during concurrent scraping.
3. Wire the hardened replay gate after the canonical contract stabilizes. Exercise one staged failing capture and one successful capture before wider rollout.
4. Add evidence-bound queue closure and entry-point parity. Apply repository lint, complexity, cycle, and targeted catalog, router, dashboard, and smoke checks. Track capture freshness, publication readback, and live acceptance against their respective receipts.

