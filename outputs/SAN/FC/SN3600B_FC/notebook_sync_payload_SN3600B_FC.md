# HPE SN3600B_FC — Synchronized Catalog Knowledge

**Target Product**: `SN3600B_FC`

**Scope Identity**: `HPE/NETWORKING/SAN/FC/SN3600B_FC`

**Sync Timestamp**: 2026-11-16T21:08:50.291Z

**Total Verified SKUs**: `158` (`58` Hardware + `100` Services)

**Total Synced KnowledgeDeltas**: `21`

This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.

---

## 🚀 Executive Delta & Recent Change Summary

| Category | Total SKUs | Added (Last Scrape) | Price Changed | Attribute Changed | Price & Attr Changed | Reinstated | Status |
|----------|------------|---------------------|---------------|-------------------|----------------------|------------|--------|
| **Hardware Components** | 58 | 1 | 1 | 34 | 22 | 0 | **CERTIFIED** |
| **Support Services & SLAs** | 100 | 0 | 0 | 0 | 0 | 0 | **CERTIFIED** |
| **Total Portfolio** | **158** | **1** | **1** | **34** | **22** | **0** | **ACTIVE** |

## 🌐 1. Universal Vendor Rules (HPE)

1. **[DELTA_UNIVERSAL_MULTI_ICON_ERROR_ATTRIBUTION]**: When Rule 81039677 occurs on multi-icon tenders, trace errors to individual child icon containers instead of modifying the root BOM item. *(Type: ERROR_DIAGNOSTIC_ATTRIBUTION)*
2. **[DELTA_UNIVERSAL_SUPPORT_TIER_ISOLATION]**: Configure support services independently per icon container. Never broadcast support attributes across diverse product families. *(Type: ICON_SUPPORT_ISOLATION)*
3. **[DELTA_UNIVERSAL_OCA_SUPPORT_CACHE_FLUSH]**: Historical service-selector workaround only: in an authenticated working OCA configuration with contradictory service selections, reselect services for the owning node and revalidate. It is not an expired-session recovery. If OCA displays encountered-a-problem, refresh/login from Partner Portal and launch One Config Advanced through Quick Links; never reload the failed OCA tab or remove services as a session fix. *(Type: SESSION_RECOVERY_PROTOCOL)*
4. **[LEARN_UNIVERSAL_SMART_CHOICE_BTO_VS_OCA_VALIDATION_20261112]**: HPE Smart Choice (xxxxxx-xx5) and regional BTO SKUs are pre-configured distributor builds, NOT CTO (-B21) configurables: (1) Never infer unstated internal factory SKUs from the short description alone (QuickSpecs notes BTO models ship with a pre-selected primary NIC without naming its exact SKU in the title, and HPE forbids factory integration of extra options into pre-configured models). (2) Never treat an OCA Customize BOM export of a -xx5 SKU as proof of factory-included parts: OCA opens Smart Choice SKUs as blank shells (0 CPU/RAM/PSU errors), auto-selects separately priced CTO menu defaults on top of the base SKU, and fails CLIC with Rule 81016667 (UNBUILDABLE: configure/quote/order via Distributor webstore or iQuote Universal, Warning 81400509). (3) Validation & reasoning steps: verify suffix (-xx5 BTO/Smart Choice vs -B21 CTO in chassis_map.json / *_Catalog.json); if CTO is desired, map to -B21 CTO chassis and run the canonical CTO evaluation/CLIC path; if exact Smart Choice factory contents are needed, consult HPE Smart Choice Supplemental QuickSpecs (e.g. a50009219enw), iQuote Universal, or an authorized distributor. *(Type: WORKFLOW_SMART_CHOICE_CTO_VALIDATION_STEPS)*
5. **[LEARN_UNIVERSAL_CLIC_GLOBAL_CHECK_AND_SEVERITY_TRIAGE_20261112]**: For any full HPE solution in OCA: (1) Run CLIC Check at the Global Solution Level (top breadcrumb #eo_nav_li_0) rather than only at a child frame/node (Partial CLIC Check), and click Download Advice (#_clic_download_excel) to inspect every row of the Advice_Text and BOM sheets alongside Solution Summary Messages/Issues. (2) Triage CLIC severities properly: Unbuildables and Process control (P+ in Advice_Text) MUST be fixed or formally exception-approved before quoting/ordering. Plain Error rows do not automatically break buildability and may sometimes be ignored, but MUST still be read carefully to verify whether a required action/quantity is missing or already met elsewhere in the solution. Warnings (e.g., PSU C13-to-C20 jumper cables for C19 PDUs, redundant VC FC licenses) must also be reviewed for physical deployment completeness. (3) Note that CLIC Advice Information sheet counts may underreport Warning rows compared to Advice_Text and CLIC Advice BOM may omit icon-level service lines outside the hardware container. *(Type: WORKFLOW_CLIC_GLOBAL_AND_SEVERITY_TRIAGE)*
6. **[LEARN_UNIVERSAL_LIFECYCLE_CLOSENESS_LEADTIME_RANKING_20261115]**: Strategy synthesis and least-delta replacement (INV-237): (1) Filter out DISCONTINUED / OBSOLETE SKUs across both hardware options and support services (allowing ACTIVE/REINSTATED SKUs and routing 90-day EOL warnings via dual-track PRESALES_CLEARANCE_STRATEGY). (2) Rank buildable alternatives using weighted component attribute fidelity (CPU cores/GHz, memory capacity/MTs/rank, GPU compute, drive capacity/protocol) and protect GPU downgrades rather than counting raw SKU deltas equally. (3) Surface lead-time optimization advisories when a functionally close active match reduces delivery wait significantly (>= 14 days faster on parts with >= 21-day lead time). (4) Attribute cascading troublemaker SKUs from the rule/error graph and honor defaultOffline: true on automatic RFP-to-BOQ continuation unless cloud validation is explicitly requested. *(Type: WORKFLOW_CLOSENESS_LIFECYCLE_AND_LEADTIME)*
7. **[LEARN_UNIVERSAL_CATEGORY_TOPOLOGY_AND_ESCALATION_20261115]**: SKU category prerequisite intelligence & runtime escalation (INV-238): (1) Drive Cage / Backplane topology — NOT bare drives alone — dictates Storage Controller requirements: NO_DRIVE_KIT and DIRECT_CONNECT_CAGE (direct-attach NVMe) exempt hardware controllers, whereas CONTROLLER_ROUTED_CAGE (Tri-Mode U.3/SAS/SATA front cages) without a controller or VROC trigger STORAGE_CONTROLLER_FOR_CAGE. Unspecified front cages log explicit ambiguity for verification rather than guessing. (2) Enforce full cross-category matrix across 11 component categories via analyzeCategoryDependencies(). (3) Expose inspect_category_dependencies (MCP & guardrail) and query_codebase_graph (local Graphify lookup) alongside query_notebooklm, escalating unresolved ambiguities via [TRUSTED_WEB_VERIFICATION_REQUIRED] with site:hpe.com QuickSpecs hints. *(Type: WORKFLOW_CATEGORY_DEPENDENCY_AND_ESCALATION)*
8. **[LEARN_UNIVERSAL_ATTRIBUTE_DELTA_AND_SYNC_CONFIRMATION_20261115]**: End-to-end catalog diff & sync confirmation protocol (INV-239): (1) Preserve Attribute Deltas ("field: oldValue -> newValue") across TSVs (34 columns), Excel sheets (All SKUs, Catalog Diffs, Price History Timeline), XLSX->JSON round-trips, price_history.json [Delta Attr] trails, and checksum_diff.js incremental modifiedSkus. (2) Match duplicate-PN rows against closest prior candidate rows (Description / Option Type / Sub-Category) before falling back to prevSkuMap. (3) Tally ATTRIBUTE_CHANGED and PRICE_AND_ATTRIBUTE_CHANGED alongside sibling *_Services.json in *_Catalog_Diff_Summary.md and NLM sync payloads. (4) Await quickSpecsSyncPromise in triggerPostFlowSyncAsync, persist qualityAuditPassed + NLM confirmation fields in scraping_verification_receipt.json, and enforce execNlmRead (cdp->httpx failover) on read RPCs. *(Type: WORKFLOW_ATTRIBUTE_DELTAS_AND_SYNC_RECEIPTS)*
9. **[LEARN_UNIVERSAL_MULTIVENDOR_PORTAL_CDP_AND_DOMAIN_RULES_20261115]**: Multi-vendor portal, domain rules & CDP readiness protocol (INV-240): (1) Use registerCustomVendorPortalPolicy, registerVendorScraperAdapter (ConfigurablePortalDomAdapter / LenovoDcscAdapter), normalizeSolutionPillar (Server/Storage/Networking/Composite), and --vendor/--portal-url CLI flags to onboard new vendor portals cleanly without hardcoded credentials. (2) Expose inspect_catalog_deltas and check_portal_and_sync_readiness via mcp_server.js (14 tools). (3) Enforce preflight/postflight, diff summary, capture receipt, and NLM sync parity in scrape_oca_storage_solution.js and normalize alternate rule schemas (ruleId/description/type) in catalog_rules.js before classifyRule. (4) Use probeCdpPort(9222) so non-CDP HTTP listeners (e.g. background msedge HTTP 404) surface portConflict: true / occupiedByNonCdp: true and return HTTP 503 on POST /api/tasks/launch-browser instead of masking as SUCCESS. *(Type: WORKFLOW_MULTIVENDOR_PORTAL_AND_CDP_GUARD)*
10. **[LEARN_UNIVERSAL_CDP_FATAL_EVAL_AND_RETRY_GUARD_20261117]**: CDP polling helpers must classify SyntaxError and ReferenceError exceptions as immediate fatal errors instead of retrying silently to false, DOM evaluation builders must serialize inputs safely via JSON.stringify, OCA navigation timeouts must surface OCA_RESPONSE_TIMEOUT without closing active OCA workspaces (keeping Partner Portal tabs alive), and QuickSpecs downloads must try vendor HTTPS first with isolated browser-context fallback so active configuration tabs remain untouched (INV-241). *(Type: WORKFLOW_CDP_FATAL_EVAL_AND_RETRY_GUARD)*
11. **[LEARN_UNIVERSAL_BACKPLANE_SELECTOR_STATE_DISCOVERY_20261117]**: Runtime discovery plans must forward exact selector trigger SKUs into bounded inactive backplane selector probes when hot-plug drive tables are collapsed, record a completed sweep only after verified quantity 1 readback and confirmed return to quantity 0 in try/finally (throwing loudly if restore fails or readback drops), materialize portal-observed conditional rows into hardwareEntries, and render selector tables with explicit scope disclosure into NotebookLM payloads (INV-241). *(Type: WORKFLOW_SELECTOR_STATE_BACKPLANE_DISCOVERY)*
12. **[LEARN_UNIVERSAL_PARSER_PRICE_AND_HEADER_OWNERSHIP_20261117]**: Workbook parsers must enforce strict header precedence so Extended List Price columns never overwrite Unit Price values, consolidate zero-dollar factory modifier or country-suffix companion lines without inflating quantities, tag quantity-1 installation and support wrapper headers as order-level global scope across multi-node tenders, and exempt non-fix customer-originated service lines in pre-presentation checks (INV-241). *(Type: WORKFLOW_PARSER_PRICE_AND_HEADER_OWNERSHIP)*
13. **[LEARN_UNIVERSAL_RECONCILIATION_UNSPLIT_AND_SERVICES_20261117]**: Two-baseline BOM reconciliation must resolve unsplit customer baseline items directly from parsed workbook lines scaled across per-node multipliers (preserving global wrapper items at quantity 1), check sibling services JSON catalogs alongside hardware catalog entries so valid SaaS and care SKUs are not misclassified as uncataloged, and support explicit no-quarantine flags in verification runs (INV-241). *(Type: WORKFLOW_RECONCILIATION_UNSPLIT_AND_SERVICES_LOOKUP)*
14. **[LEARN_UNIVERSAL_SEPARATED_CABLE_PATHS_AND_CATEGORY_MATCHING_20261117]**: Physical validation must distinguish backplane-to-controller storage signal cables, CPU-to-slot OCP enablement cables, and controller sideband telemetry paths separately without miscounting storage cables as adapters or passing disconnected backplanes, enforce product-specific thermal kit lookup before falling back, and reject cross-category hardware mismatches plus non-hardware OS/management tokens in replacement scoring (INV-241). *(Type: WORKFLOW_TOPOLOGY_CATEGORY_AND_CABLE_ENFORCEMENT)*
15. **[LEARN_UNIVERSAL_FAST_SHIP_TOPOLOGY_AND_CLIC_CARRYFORWARD_20261117]**: Fast-ship candidate synthesis must resolve coupled cabling and enablement paths and pass full multi-aspect physical revalidation before ranking, spare non-bottleneck compute/power parts when another hardware option sets the >=21-day lead-time bottleneck, report configurator solution Estimated Delivery Time separately from single-part component lead times, and classify BOM CLIC Status or live configurator results with 0 unbuildables, 0 errors, and 0 process-control blocks (even with warning advisories) as PORTAL_VALIDATED_WITH_WARNINGS while failing closed on any unbuildable/error row or unbacked validation claim (INV-241). *(Type: WORKFLOW_FAST_SHIP_TOPOLOGY_AND_CLIC_CARRYFORWARD)*
16. **[OWNER_STANDARD_3Y_BASIC]**: Preserve explicit customer support term and tier in the closest rank; use 3-year Tech Care Basic only when unspecified or explicitly authorized. For this SN3600B BOQ the owner authorized 5-year Essential to 3-year Basic. Compare qualified fixed and flexible service options; disclose retention and preserve parent/suffix pairs. This commercial preference is not vendor qualification. *(Type: SUPPORT_POLICY)*
17. **[OWNER_ICON_SERVICE_ISOLATION]**: Select Services from Components for the owning icon, edit its dropdowns, and leave both apply-to-all icons and apply-to-all nodes off. Different icons retain their own SLA. *(Type: ICON_SUPPORT_ISOLATION)*
18. **[OWNER_OCA_EXPIRED_SESSION]**: When OCA says it encountered a problem, restart from Partner Portal refresh/login and open One Config Advanced through Quick Links. Do not reload the failed OCA session. Keep a Partner Portal tab before closing stale OCA so CDP does not disappear. This supersedes cache-flush advice for encountered-a-problem errors. *(Type: SESSION_RECOVERY_PROTOCOL)*
19. **[OWNER_CLOSEST_REQUIREMENT_RANK]**: Closest rank preserves customer requirements and makes only necessary compatibility/buildability changes. Budget alternatives disclose every deviation; do not silently reduce term, tier, capacity or resilience. Keep explicit owner overrides auditable against the original customer BOQ. *(Type: CUSTOMER_INTENT_POLICY)*
20. **[OWNER_COMPONENT_DOMAIN_ROUTING]**: Route by component role and exact product, never vendor or family alone. Synergy compute, fabric and frame use separate scopes. Resolve ownership before quantities. Validate each component and enclosure/bay, adapter/fabric, optical endpoints, shared power and per-icon SLA relationships; missing profiles remain NOT_EVALUATED and cannot inherit server defaults. Scraping completeness is not buildability certification. *(Type: COMPONENT_DOMAIN_ROUTING)*
21. **[GUARDRAIL_TRANSPORT_RECOVERY]**: Gemini guardrail API sends must retain systemInstruction and function declarations when overriding SDK send config. Enforce scoped local simulation and NotebookLM checks. Retry bounded transient provider errors without exhausting keys, distinguish per-minute from explicit daily quotas, and use configured approved model fallback with preserved tool results and no replay side effects. Empty or unfinished responses are unavailable, not verification. Dashboard status is independent of NotebookLM and vendor acceptance. *(Type: GUARDRAIL_RECOVERY_POLICY)*

## 🏛️ 2. Family & Generation Rules (SAN FC)

*No verified family/generation rules are registered for this product.*

## 🎯 3. Chassis & Solution-Type Gotchas (SN3600B_FC)

*No specific gotchas logged for SN3600B_FC. Baseline chassis layout rules active.*

## 🔒 3b. Physical & Architectural Gating Rules (DOM Unavailable Tables)

*No portal-conditional gating rules detected in default DOM state.*

## ⚠️ 4. Discontinued & Obsolete SKUs Registry

*No discontinued or reinstated SKUs detected for SN3600B_FC. All cataloged SKUs are active.*

### ⏳ Impending Obsolescence & Clearance Hardware (90-Day to 180-Day Window)

*These components remain orderable in live configurators today but have published vendor end dates. They represent high-value clearance opportunities for immediate deployments, but require explicit procurement cutoff remarks before quotation:*

| Product # | Description | Category | List Price (USD) | Discontinued Date | Price Trend | Presales Strategy Guidance |
|---|---|---|---:|---|:---:|---|
| `142257-002` | HPE C13 - C14 WW 250V 10Amp 2.5m Jumper Cord | Cables & Enablement Kits | $34 | 11/30/2026 | 0.00% | ⚠️ Approaching EOL (11/30/2026). Valid for immediate builds; verify multi-year roadmaps. |

## 📊 5b. Category-Level Trends & Significant Price Adjustments

### Category Portfolio Delta & Planning Intelligence

| Category | Total SKUs | Added | Modified | Unchanged | Clearance / Drops | Category Planning Insight |
|---|---:|---:|---:|---:|---:|---|
| **Chassis** | 1 | 0 | 1 | 0 | 0 | 🔄 Attributes/specifications updated (1 SKUs) |
| **Networking** | 16 | 1 | 15 | 0 | 0 | ✨ Portfolio expanding (+1 new options) |
| **Drive Enclosures / Drives** | 1 | 0 | 1 | 0 | 0 | 🔄 Attributes/specifications updated (1 SKUs) |
| **Cables & Enablement Kits** | 39 | 0 | 39 | 0 | 0 | 🔄 Attributes/specifications updated (39 SKUs) |
| **Software & Licenses** | 1 | 0 | 1 | 0 | 0 | 🔄 Attributes/specifications updated (1 SKUs) |

### High-Impact Price Adjustments (Drops $\ge 10\%$ and Major Moves)

| Product # | Description | Category | Previous Price | Current Price | Delta (USD) | Change (%) | Movement Type |
|---|---|---|---:|---:|---:|---:|---|
| `H6Z29A` | HPE B-series 16Gb LW 25km FC SFP 1-pack Transceiver | Networking | New Addition | $7,071 | $7,071 | **+100.0%** | ✨ NEW_OPTION |

## 🔄 5. Recent Attribute & Specification Modifications Log

| Timestamp | Source | SKU | Attribute | Old Value | New Value | Detail |
|-----------|--------|-----|-----------|-----------|-----------|--------|
| 2026-09-22 | Hardware | `AF566A` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| 2026-09-22 | Hardware | `AF567A` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| 2026-09-22 | Hardware | `AF569A` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| 2026-09-22 | Hardware | `AF571A` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| 2026-09-22 | Hardware | `AF572A` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| 2026-09-22 | Hardware | `AF591A` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| 2026-09-22 | Hardware | `R1C65A` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| 2026-09-22 | Hardware | `SG579A` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| 2026-09-22 | Hardware | `SK792A` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| 2026-09-22 | Hardware | `AJ833A` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| 2026-09-22 | Hardware | `AJ835A` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| 2026-09-22 | Hardware | `AJ836A` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| 2026-09-22 | Hardware | `AJ838A` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| 2026-09-22 | Hardware | `AJ839A` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| 2026-09-22 | Hardware | `AJ834A` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| 2026-09-22 | Hardware | `AJ837A` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| 2026-09-22 | Hardware | `QK731A` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| 2026-09-22 | Hardware | `QK732A` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| 2026-09-22 | Hardware | `QK737A` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| 2026-09-22 | Hardware | `QK729A` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| 2026-09-22 | Hardware | `QK733A` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| 2026-09-22 | Hardware | `QK734A` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| 2026-09-22 | Hardware | `QK735A` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"1,560.00"}** | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"1,560.00"}" |
| 2026-09-22 | Hardware | `QK736A` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| 2026-09-22 | Hardware | `Q1Z11BAE` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |

### Current Scrape SKU Attribute Deltas

| SKU | Source | Diff Status | Attribute Changes (Old → New) |
|-----|--------|-------------|-------------------------------|
| `R7M09A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `R7M10A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `QK724A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `R6B10A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `R6W28A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `H6Z29A` | Hardware | ADDED | New SKU introduced |
| `QK725A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `R6B11A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `R6B21A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `P9H29A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `P9H32A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `R0Q23A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `R6B12A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `R6B13A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `R6W26A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `R7M17A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `N9Y63A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `295633-B22` | Hardware | ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `AF556A` | Hardware | ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `AF557A` | Hardware | ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `AF568A` | Hardware | ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `AF570A` | Hardware | ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `R1C66A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `142257-002` | Hardware | ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `A0N33A` | Hardware | ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `AF558A` | Hardware | ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `AF559A` | Hardware | ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `AF560A` | Hardware | ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `AF561A` | Hardware | ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `AF562A` | Hardware | ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `AF564A` | Hardware | ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `AF565A` | Hardware | ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `AF566A` | Hardware | ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `AF567A` | Hardware | ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `AF569A` | Hardware | ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `AF571A` | Hardware | ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `AF572A` | Hardware | ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `AF591A` | Hardware | ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `R1C65A` | Hardware | ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `SG579A` | Hardware | ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `SK792A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `AJ833A` | Hardware | ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `AJ835A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `AJ836A` | Hardware | ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `AJ838A` | Hardware | ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `AJ839A` | Hardware | ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `AJ834A` | Hardware | ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `AJ837A` | Hardware | ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `QK731A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |
| `QK732A` | Hardware | ATTRIBUTE_CHANGED | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"Extended Price (USD)":"NA"}" |

## 🧩 6. Same-Product CTO Variant Matrix

| Chassis Identifier | Product Family | Generation | Form Factor | CTO Base SKU |
|--------------------|----------------|------------|-------------|--------------|
| **SN3600B_FC** | SAN | FC | 1U | `R7R97A` |

