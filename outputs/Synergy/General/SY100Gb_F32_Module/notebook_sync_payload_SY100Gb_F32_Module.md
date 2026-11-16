# HPE SY100Gb_F32_Module — Synchronized Catalog Knowledge

**Target Product**: `SY100Gb_F32_Module`

**Scope Identity**: `HPE/NETWORKING/Synergy/General/SY100Gb_F32_Module`

**Sync Timestamp**: 2026-11-16T21:08:58.291Z

**Total Verified SKUs**: `143` (`141` Hardware + `2` Services)

**Total Synced KnowledgeDeltas**: `25`

This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.

---

## 🚀 Executive Delta & Recent Change Summary

| Category | Total SKUs | Added (Last Scrape) | Price Changed | Attribute Changed | Price & Attr Changed | Reinstated | Status |
|----------|------------|---------------------|---------------|-------------------|----------------------|------------|--------|
| **Hardware Components** | 141 | 0 | 0 | 139 | 0 | 0 | **CERTIFIED** |
| **Support Services & SLAs** | 2 | 0 | 0 | 2 | 0 | 0 | **CERTIFIED** |
| **Total Portfolio** | **143** | **0** | **0** | **141** | **0** | **0** | **ACTIVE** |


## Owned component capture scope

Observed 2026-11-11T18:49:10.220Z. Component base SKU: 867796-B21. Owner: 100Gb Virtual #1. Parent base SKU: P51174-B21. Coverage is limited to the component menu.

Service scope: OBSERVED_SELECTED_SERVICES_ONLY. Unexecuted: alternative service types, terms and tiers; parent-level support changes. Missing prices remain unknown.

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

## 🏛️ 2. Family & Generation Rules (Synergy General)

*No verified family/generation rules are registered for this product.*

## 🎯 3. Chassis & Solution-Type Gotchas (SY100Gb_F32_Module)

1. **[LEARN_SY100GB_F32_MODULE_WORKFLOW_DUAL_PUBLICATION_ADVISORY_20261029] SY100Gb_F32_Module** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `SY100Gb_F32_Module CTO Server`):
   - **Rule**: Publish and read back the human Drive workbook separately from the complete semantic Markdown source in NotebookLM. Google Sheets is not a supported NotebookLM Drive source. A recent upload timestamp does not refresh old vendor observations.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

2. **[LEARN_SY100GB_F32_MODULE_WORKFLOW_SOURCE_RETIREMENT_ADVISORY_20261029] SY100Gb_F32_Module** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `SY100Gb_F32_Module CTO Server`):
   - **Rule**: Verify exact-product replacement content, indexing and source-restricted grounded canary, then commit trust metadata before removing only managed stale catalog snapshots. Preserve QuickSpecs, separate learnings, shared enclosure/fabric sources and unrelated documents. Inventory absence is not authority to remove another product source.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

3. **[LEARN_SY100GB_F32_MODULE_WORKFLOW_CLOUD_LEARNING_REVIEW_ADVISORY_20261029] SY100Gb_F32_Module** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `SY100Gb_F32_Module CTO Server`):
   - **Rule**: Preserve retrieved cloud learning documents locally with their source IDs. Treat prose claims as candidates pending dated vendor evidence; resolve contradictions before promoting hardware dependencies. Conflicting quantity claims require dated evidence for this exact product and selector state.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

4. **[LEARN_SY100GB_F32_MODULE_SUPPORT_PRICING_UPDATE_20261102] SY100Gb_F32_Module** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `SY100Gb_F32_Module CTO Server`):
   - **Rule**: HPE Virtual Connect SE 100Gb F32 Module for Synergy Support (HU4B2A3 Z1R, under HU4B2A3 3Y Tech Care Basic) list price updated in November 2026 OCA catalog from .00 to .00 USD (+.00 / +5.04% per module).
   - **Affected SKU**: `HU4B2A3 Z1R` | **Required Dependency**: `N/A`


## 🔒 3b. Physical & Architectural Gating Rules (DOM Unavailable Tables)

### Component Mutual Exclusion Rules

1. **[Interconnect Addons and Options]**: Max quantity of product limited by space available.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (62)**: `487655-B21`, `C7533A`, `C7535A`, `C7536A`, `C7537A`, `C7542A`, `G9Q68A`, `487649-B21`, `487652-B21`, `498385-B21`, `498385-B22`, `498385-B23`, `498385-B24`, `498385-B25`, `538272-B21`, `670759-B21`, `670759-B22`, `670759-B23`, `670759-B24`, `670759-B25`, `712495-B21`, `712497-B21`, `720196-B21`, `720205-B21`, `720208-B21`, `721067-B21`, `721070-B21`, `721073-B21`, `730907-B21`, `804095-B21`, `804098-B21`, `804101-B21`, `804104-B21`, `804107-B21`, `804110-B21`, `804155-B21`, `808722-B21`, `808722-B22`, `808722-B23`, `808722-B24`, `808722-B25`, `808722-B26`, `808722-B27`, `808722-B28`, `845412-B21`, `861412-B21`, `861413-B21`, `861414-B21`, `J9283B`, `JC784C`, `JD095C`, `JD096C`, `JD097C`, `JG081C`, `JG326A`, `JG327A`, `JG328A`, `JG329A`, `JG330A`, `JG331A`, `QK702A`, `QK736A`

2. **[Interconnect Addons and Options]**: Product is obsolete
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (2)**: `AP784A`, `AP785A`

3. **[Interconnect Addons and Options]**: License not compatible for selected VC.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `N3R43A`

## ⚠️ 4. Discontinued & Obsolete SKUs Registry

### Fully Discontinued & Delisted SKUs

| SKU | Description | Status | Discontinued Date | Last Known Price | Successor SKU | Tracking |
|-----|-------------|--------|-------------------|------------------|---------------|----------|
| `AJ718A` | HPE 8Gb Short Wave Fibre Channel SFP+ 1 Pack Transceiver | **DISCONTINUED** | 2026-11-11 | $180.00 | None | STOPPED_AFTER_REMOVAL |
| `P06584-B21` | HPE Synergy VC 100Gb F32 Interconnect CTO Module | **DISCONTINUED** | 2026-10-30 | $5400.00 | None | STOPPED_AFTER_REMOVAL |

### ⏳ Impending Obsolescence & Clearance Hardware (90-Day to 180-Day Window)

*These components remain orderable in live configurators today but have published vendor end dates. They represent high-value clearance opportunities for immediate deployments, but require explicit procurement cutoff remarks before quotation:*

| Product # | Description | Category | List Price (USD) | Discontinued Date | Price Trend | Presales Strategy Guidance |
|---|---|---|---:|---|:---:|---|
| `AJ718A` | [REMOVED SKU] HPE 8Gb Short Wave Fibre Channel SFP+ 1 Pack Transceiver | Networking | $180 | 2026-11-11 | -100.00% | 🔥 **Clearance Opportunity** (-100.00% CapEx savings). Procure before 2026-11-11. |
| `K2Q21A` | HPE C-series 3M Passive Copper SFP+ Cable | Cables & Enablement Kits | $467 | 10/23/2026 | 0.00% | ⚠️ Approaching EOL (10/23/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `K2Q22A` | HPE C-series 5M Passive Copper SFP+ Cable | Cables & Enablement Kits | $535 | 10/23/2026 | 0.00% | ⚠️ Approaching EOL (10/23/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `QK701A` | HPE C-series SFP+ to SFP+ Active Copper 7.0m Direct Attach Cable | Cables & Enablement Kits | $1,216 | 10/23/2026 | 0.00% | ⚠️ Approaching EOL (10/23/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `QK702A` | HPE C-series SFP+ to SFP+ Active Copper 10.0m Direct Attach Cable | Accessories & Infrastructure | $1,459 | 10/23/2026 | 0.00% | ⚠️ Approaching EOL (10/23/2026). Valid for immediate builds; verify multi-year roadmaps. |

## 📊 5b. Category-Level Trends & Significant Price Adjustments

### Category Portfolio Delta & Planning Intelligence

| Category | Total SKUs | Added | Modified | Unchanged | Clearance / Drops | Category Planning Insight |
|---|---:|---:|---:|---:|---:|---|
| **Chassis** | 1 | 0 | 1 | 0 | 0 | 🔄 Attributes/specifications updated (1 SKUs) |
| **Networking** | 32 | 0 | 31 | 1 | 1 | ⚠️ Active price drops / clearance (1 SKUs discounted) |
| **Cables & Enablement Kits** | 44 | 0 | 44 | 0 | 0 | 🔄 Attributes/specifications updated (44 SKUs) |
| **Accessories & Infrastructure** | 62 | 0 | 62 | 0 | 0 | 🔄 Attributes/specifications updated (62 SKUs) |
| **Software & Licenses** | 2 | 0 | 2 | 0 | 0 | 🔄 Attributes/specifications updated (2 SKUs) |

### High-Impact Price Adjustments (Drops $\ge 10\%$ and Major Moves)

| Product # | Description | Category | Previous Price | Current Price | Delta (USD) | Change (%) | Movement Type |
|---|---|---|---:|---:|---:|---:|---|
| `AJ718A` | [REMOVED SKU] HPE 8Gb Short Wave Fibre Channel SFP+ 1 Pack Transceiver | Networking | $180 | $180 | $-180 | **-100.0%** | 📉 CLEARANCE_DROP |

## 🔄 5. Recent Attribute & Specification Modifications Log

| Timestamp | Source | SKU | Attribute | Old Value | New Value | Detail |
|-----------|--------|-----|-----------|-----------|-----------|--------|
| 2026-11-11 | Hardware | `JG330A` | Discontinued Date | 12/31/2050 | **12/31/2099** | Discontinued Date: "12/31/2050" → "12/31/2099" |
| 2026-11-11 | Hardware | `JG330A` | Lead Time | Unpublished | **13** | Lead Time: "Unpublished" → "13" |
| 2026-11-11 | Hardware | `JG330A` | Lead Time Source | Unpublished | **OCA row attribute** | Lead Time Source: "Unpublished" → "OCA row attribute" |
| 2026-11-11 | Hardware | `JG330A` | Lead Time Days | N/A | **13** | Lead Time Days: "N/A" → "13" |
| 2026-11-11 | Hardware | `JG330A` | Speed Tier | Unpublished | **Standard Delivery (8-30d)** | Speed Tier: "Unpublished" → "Standard Delivery (8-30d)" |
| 2026-11-11 | Hardware | `JG330A` | Vendor Attributes | {"Est. Lead Time":"13","listPrice":850} | **{"listPrice":850}** | Vendor Attributes: "{"Est. Lead Time":"13","listPrice":850}" → "{"listPrice":850}" |
| 2026-11-11 | Hardware | `JG331A` | Discontinued Date | 12/31/2050 | **12/31/2099** | Discontinued Date: "12/31/2050" → "12/31/2099" |
| 2026-11-11 | Hardware | `JG331A` | Lead Time | Unpublished | **13** | Lead Time: "Unpublished" → "13" |
| 2026-11-11 | Hardware | `JG331A` | Lead Time Source | Unpublished | **OCA row attribute** | Lead Time Source: "Unpublished" → "OCA row attribute" |
| 2026-11-11 | Hardware | `JG331A` | Lead Time Days | N/A | **13** | Lead Time Days: "N/A" → "13" |
| 2026-11-11 | Hardware | `JG331A` | Speed Tier | Unpublished | **Standard Delivery (8-30d)** | Speed Tier: "Unpublished" → "Standard Delivery (8-30d)" |
| 2026-11-11 | Hardware | `JG331A` | Vendor Attributes | {"Est. Lead Time":"13","listPrice":986} | **{"listPrice":986}** | Vendor Attributes: "{"Est. Lead Time":"13","listPrice":986}" → "{"listPrice":986}" |
| 2026-11-11 | Hardware | `QK702A` | Discontinued Date | 10/22/2026 | **10/23/2026** | Discontinued Date: "10/22/2026" → "10/23/2026" |
| 2026-11-11 | Hardware | `QK736A` | Discontinued Date | 11/30/2028 | **12/31/2028** | Discontinued Date: "11/30/2028" → "12/31/2028" |
| 2026-11-11 | Hardware | `QK736A` | Lead Time | Unpublished | **4** | Lead Time: "Unpublished" → "4" |
| 2026-11-11 | Hardware | `QK736A` | Lead Time Source | Unpublished | **OCA row attribute** | Lead Time Source: "Unpublished" → "OCA row attribute" |
| 2026-11-11 | Hardware | `QK736A` | Lead Time Days | N/A | **4** | Lead Time Days: "N/A" → "4" |
| 2026-11-11 | Hardware | `QK736A` | Speed Tier | Unpublished | **Fast-Ship Certified (<=7d)** | Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)" |
| 2026-11-11 | Hardware | `QK736A` | Vendor Attributes | {"Est. Lead Time":"4","listPrice":239} | **{"listPrice":239}** | Vendor Attributes: "{"Est. Lead Time":"4","listPrice":239}" → "{"listPrice":239}" |
| 2026-11-11 | Hardware | `AP784A` | Discontinued Date | 05/06/2016 | **04/01/2014** | Discontinued Date: "05/06/2016" → "04/01/2014" |
| 2026-11-11 | Hardware | `AP785A` | Discontinued Date | 05/06/2016 | **04/01/2014** | Discontinued Date: "05/06/2016" → "04/01/2014" |
| 2026-11-11 | Hardware | `R3P67A` | Discontinued Date | 09/30/2027 | **10/31/2027** | Discontinued Date: "09/30/2027" → "10/31/2027" |
| 2026-11-11 | Hardware | `N3R43A` | Discontinued Date | 05/31/2023 | **06/30/2023** | Discontinued Date: "05/31/2023" → "06/30/2023" |
| 2026-11-11 | Services | `R3P67AAE` | Discontinued Date | 09/30/2027 | **10/31/2027** | Discontinued Date: "09/30/2027" → "10/31/2027" |
| 2026-11-11 | Services | `HU4D5A5#Z1R` | Vendor Attributes | {"Evidence Scope":"Observed selected service; alternatives not enumerated","Owner Configuration":"CE45087D126BB28FD3A232EBB77B29B2"} | **{"Evidence Scope":"Observed selected service; alternatives not enumerated","Owner Configuration":"40DFBA5F21575295DAD5FE86F2C55A9A"}** | Vendor Attributes: "{"Evidence Scope":"Observed selected service; alternatives not enumerated","Owner Configuration":"CE45087D126BB28FD3A232EBB77B29B2"}" → "{"Evidence Scope":"Observed selected service; alternatives not enumerated","Owner Configuration":"40DFBA5F21575295DAD5FE86F2C55A9A"}" |

### Current Scrape SKU Attribute Deltas

| SKU | Source | Diff Status | Attribute Changes (Old → New) |
|-----|--------|-------------|-------------------------------|
| `841716-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "11/30/2030" → "12/31/2030"; Lead Time: "Unpublished" → "3"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"3","listPrice":1412}" → "{"listPrice":1412}" |
| `882251-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "11/30/2030" → "12/31/2030"; Lead Time: "Unpublished" → "3"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"3","listPrice":6330}" → "{"listPrice":6330}" |
| `720187-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "07/31/2027" → "08/30/2027"; Lead Time: "Unpublished" → "4"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "4"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"3","listPrice":2524}" → "{"listPrice":2524}" |
| `817040-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "03/31/2023" → "05/05/2023" |
| `845966-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "11/30/2030" → "12/31/2030"; Lead Time: "Unpublished" → "4"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "4"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"4","listPrice":4252}" → "{"listPrice":4252}" |
| `845970-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "11/30/2030" → "12/31/2030"; Lead Time: "Unpublished" → "14"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "14"; Speed Tier: "Unpublished" → "Standard Delivery (8-30d)"; Vendor Attributes: "{"Est. Lead Time":"4","listPrice":227}" → "{"listPrice":227}" |
| `845972-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "07/27/2026" → "07/28/2026"; Lead Time: "Unpublished" → "60"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "60"; Speed Tier: "Unpublished" → "Constrained / Long Lead Time (>45d)"; Vendor Attributes: "{"Est. Lead Time":"60","listPrice":2585}" → "{"listPrice":2585}" |
| `JG661A` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "12/31/2050" → "12/31/2099"; Lead Time: "Unpublished" → "78"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "78"; Speed Tier: "Unpublished" → "Constrained / Long Lead Time (>45d)"; Vendor Attributes: "{"Est. Lead Time":"78","listPrice":10499}" → "{"listPrice":10499}" |
| `JH234A` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "12/31/2050" → "12/31/2099"; Lead Time: "Unpublished" → "13"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "13"; Speed Tier: "Unpublished" → "Standard Delivery (8-30d)"; Vendor Attributes: "{"Est. Lead Time":"13","listPrice":451}" → "{"listPrice":451}" |
| `JH235A` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "12/31/2050" → "12/31/2099"; Lead Time: "Unpublished" → "13"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "13"; Speed Tier: "Unpublished" → "Standard Delivery (8-30d)"; Vendor Attributes: "{"Est. Lead Time":"13","listPrice":629}" → "{"listPrice":629}" |
| `JH236A` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "12/31/2050" → "12/31/2099"; Lead Time: "Unpublished" → "13"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "13"; Speed Tier: "Unpublished" → "Standard Delivery (8-30d)"; Vendor Attributes: "{"Est. Lead Time":"13","listPrice":779}" → "{"listPrice":779}" |
| `JH419A` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "12/31/2050" → "12/31/2099" |
| `JH420A` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "12/31/2050" → "12/31/2099" |
| `JH673A` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "12/31/2050" → "12/31/2099" |
| `JL307A` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "12/31/2050" → "12/31/2099" |
| `JL310A` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "12/31/2050" → "12/31/2099" |
| `P90358-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "11/30/2031" → "12/31/2031" |
| `R0Z25A` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "12/31/2050" → "12/31/2099" |
| `R0Z26A` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "12/31/2050" → "12/31/2099" |
| `AJ718A` | Hardware | REMOVED | SKU Discontinued & Tombstoned |
| `455886-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "11/30/2030" → "12/31/2030"; Lead Time: "Unpublished" → "3"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"4","listPrice":1751}" → "{"listPrice":1751}" |
| `813874-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "07/31/2027" → "08/30/2027"; Lead Time: "Unpublished" → "3"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"3","listPrice":1173}" → "{"listPrice":1173}" |
| `844483-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "07/31/2027" → "08/30/2027"; Lead Time: "Unpublished" → "3"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"3","listPrice":2451}" → "{"listPrice":2451}" |
| `E7Y09A` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2029" → "07/31/2029"; Lead Time: "Unpublished" → "3"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"3","listPrice":700}" → "{"listPrice":700}" |
| `E7Y10A` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2029" → "07/31/2029"; Lead Time: "Unpublished" → "3"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"3","listPrice":405}" → "{"listPrice":405}" |
| `455883-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "11/30/2030" → "12/31/2030"; Lead Time: "Unpublished" → "8"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "8"; Speed Tier: "Unpublished" → "Standard Delivery (8-30d)"; Vendor Attributes: "{"Est. Lead Time":"8","listPrice":842}" → "{"listPrice":842}" |
| `845398-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2028" → "07/31/2028"; Lead Time: "Unpublished" → "4"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "4"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"4","listPrice":2110}" → "{"listPrice":2110}" |
| `JG234A` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "12/31/2050" → "12/31/2099"; Lead Time: "Unpublished" → "13"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "13"; Speed Tier: "Unpublished" → "Standard Delivery (8-30d)"; Vendor Attributes: "{"Est. Lead Time":"13","listPrice":10394}" → "{"listPrice":10394}" |
| `P9H30A` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "04/30/2028" → "05/31/2028"; Lead Time: "Unpublished" → "14"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "14"; Speed Tier: "Unpublished" → "Standard Delivery (8-30d)"; Vendor Attributes: "{"Est. Lead Time":"14","listPrice":1399}" → "{"listPrice":1399}" |
| `P9H32A` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "08/03/2022" → "08/05/2022" |
| `537963-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "07/31/2027" → "08/30/2027"; Lead Time: "Unpublished" → "3"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"3","listPrice":327}" → "{"listPrice":327}" |
| `720211-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "07/31/2027" → "08/30/2027"; Lead Time: "Unpublished" → "3"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"3","listPrice":1711}" → "{"listPrice":1711}" |
| `721064-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "11/30/2030" → "12/31/2030"; Lead Time: "Unpublished" → "3"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"3","listPrice":729}" → "{"listPrice":729}" |
| `721076-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "07/31/2027" → "08/30/2027"; Lead Time: "Unpublished" → "3"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"3","listPrice":2408}" → "{"listPrice":2408}" |
| `845406-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "11/30/2030" → "12/31/2030"; Lead Time: "Unpublished" → "3"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"3","listPrice":685}" → "{"listPrice":685}" |
| `845408-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "07/31/2027" → "08/31/2027"; Lead Time: "Unpublished" → "3"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"3","listPrice":788}" → "{"listPrice":788}" |
| `845410-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "07/31/2027" → "08/30/2027"; Lead Time: "Unpublished" → "3"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"3","listPrice":2861}" → "{"listPrice":2861}" |
| `845414-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "07/31/2027" → "08/30/2027"; Lead Time: "Unpublished" → "3"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"3","listPrice":2972}" → "{"listPrice":2972}" |
| `845416-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "07/31/2027" → "08/31/2027"; Lead Time: "Unpublished" → "3"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"3","listPrice":916}" → "{"listPrice":916}" |
| `845420-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "07/31/2027" → "08/30/2027"; Lead Time: "Unpublished" → "3"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"3","listPrice":3437}" → "{"listPrice":3437}" |
| `876680-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "11/30/2030" → "12/31/2030"; Lead Time: "Unpublished" → "3"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"3","listPrice":678}" → "{"listPrice":678}" |
| `876692-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "11/30/2030" → "12/31/2030"; Lead Time: "Unpublished" → "3"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"3","listPrice":4247}" → "{"listPrice":4247}" |
| `876698-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "11/30/2030" → "12/31/2030"; Lead Time: "Unpublished" → "3"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"3","listPrice":4495}" → "{"listPrice":4495}" |
| `AJ833A` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "11/30/2028" → "12/31/2028"; Lead Time: "Unpublished" → "3"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"3","listPrice":65}" → "{"listPrice":65}" |
| `AJ836A` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "11/30/2028" → "12/31/2028"; Lead Time: "Unpublished" → "3"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"3","listPrice":115}" → "{"listPrice":115}" |
| `AJ838A` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "11/30/2028" → "12/31/2028"; Lead Time: "Unpublished" → "3"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"3","listPrice":208}" → "{"listPrice":208}" |
| `AJ839A` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "11/30/2028" → "12/31/2028"; Lead Time: "Unpublished" → "3"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"3","listPrice":253}" → "{"listPrice":253}" |
| `H6Z30A` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "11/30/2028" → "12/31/2028"; Lead Time: "Unpublished" → "3"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"3","listPrice":3422}" → "{"listPrice":3422}" |
| `P64635-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "11/30/2030" → "12/31/2030"; Lead Time: "Unpublished" → "3"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"3","listPrice":4321}" → "{"listPrice":4321}" |
| `P64638-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "11/30/2030" → "12/31/2030"; Lead Time: "Unpublished" → "3"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"3","listPrice":4247}" → "{"listPrice":4247}" |

## 🧩 6. Same-Product CTO Variant Matrix

| Chassis Identifier | Product Family | Generation | Form Factor | CTO Base SKU |
|--------------------|----------------|------------|-------------|--------------|
| **SY100Gb_F32_Module** | Synergy | General | Interconnect Module | `867796-B21` |

## ⭐ 8. Vendor Recommended & Preferred Hardware Options

| Product # | Description | Category | Recommendation Badge | List Price (USD) | Lead Time |
|---|---|---|:---:|---:|---|
| `867796-B21` | HPE Virtual Connect SE 100Gb F32 Module for Synergy [867796-B21] | Chassis | **Recommended** | $3,200 | Unpublished |

## ⏱️ 10. Supply Chain & Delivery Lead Time Intelligence

### Confirmed Component Delivery SLAs

| Product # | Description | Category | Lead Time | Channel Status |
|---|---|---|---:|---|
| `841716-B21` | HPE 40Gb QSFP+ Bidirectional Transceiver | Networking | 3 | Available |
| `882251-B21` | HPE Synergy 100GbE/4x25GbE/4x32GbFC QSFP28 Transceiver | Networking | 3 | Available |
| `720187-B21` | HPE BladeSystem c-Class 40Gb QSFP+ MPO SR4 100m Transceiver | Networking | 4 | Available |
| `845966-B21` | HPE 100Gb QSFP28 MPO SR4 100m Transceiver | Networking | 4 | Available |
| `845970-B21` | HPE QSFP28 to SFP28 Adapter | Networking | 14 | Available |
| `845972-B21` | HPE 100Gb QSFP28 Bidirectional Transceiver | Networking | 60 | Obsolete (OB) |
| `JG661A` | HPE Networking X140 40G QSFP+ LC LR4 SM 10km 1310nm Transceiver | Networking | 78 | Available |
| `JH234A` | HPE Networking X242 40G QSFP+ to QSFP+ 1m Direct Attach Copper Cable | Networking | 13 | Available |
| `JH235A` | HPE Networking X242 40G QSFP+ to QSFP+ 3m Direct Attach Copper Cable | Networking | 13 | Available |
| `JH236A` | HPE Networking X242 40G QSFP+ to QSFP+ 5m Direct Attach Copper Cable | Networking | 13 | Available |
| `455886-B21` | HPE BladeSystem c-Class 10Gb SFP+ LR Transceiver | Networking | 3 | Available |
| `813874-B21` | HPE 10GBase-T SFP+ Transceiver | Networking | 3 | Available |
| `844483-B21` | HPE 25Gb SFP28 to SFP28 7m Active Optical Cable | Networking | 3 | Available |
| `E7Y09A` | HPE 16Gb SFP+ Short Wave 1-pack Industrial Extended Transceiver | Networking | 3 | Available |
| `E7Y10A` | HPE 16Gb SFP+ Short Wave 1-pack Commercial Transceiver | Networking | 3 | Available |
| `455883-B21` | HPE BladeSystem c-Class 10Gb SFP+ SR Transceiver | Networking | 8 | Available |
| `845398-B21` | HPE 25Gb SFP28 SR 100m Transceiver | Networking | 4 | Available |
| `JG234A` | HPE Networking X130 10G SFP+ LC ER 40km Transceiver | Networking | 13 | Available |
| `P9H30A` | HPE 32Gb SFP28 Short Wave Commercial Temperature Transceiver | Networking | 14 | Available |
| `537963-B21` | HPE BladeSystem c-Class 10GbE SFP+ to SFP+ 5m Direct Attach Copper Cable | Cables & Enablement Kits | 3 | Available |
| `720211-B21` | HPE BladeSystem c-Class 40G QSFP+ to QSFP+ 15m Active Optical Cable | Cables & Enablement Kits | 3 | Available |
| `721064-B21` | HPE BladeSystem c-Class 40G QSFP+ to 4x10G SFP+ 3m Direct Attach Copper Splitter Cable | Cables & Enablement Kits | 3 | Available |
| `721076-B21` | HPE BladeSystem c-Class QSFP+ to 4x10G SFP+ 15m Active Optical Cable | Cables & Enablement Kits | 3 | Available |
| `845406-B21` | HPE 100Gb QSFP28 to QSFP28 3m Direct Attach Copper Cable | Cables & Enablement Kits | 3 | Available |
| `845408-B21` | HPE 100Gb QSFP28 to QSFP28 5m Direct Attach Copper Cable | Cables & Enablement Kits | 3 | Available |
| `845410-B21` | HPE 100Gb QSFP28 to QSFP28 7m Active Optical Cable | Cables & Enablement Kits | 3 | Available |
| `845414-B21` | HPE 100Gb QSFP28 to QSFP28 15m Active Optical Cable | Cables & Enablement Kits | 3 | Available |
| `845416-B21` | HPE 100Gb QSFP28 to 4x25Gb SFP28 3m Direct Attach Copper Cable | Cables & Enablement Kits | 3 | Available |
| `845420-B21` | HPE QSFP28 to 4x25Gb SFP28 7m Active Optical Cable | Cables & Enablement Kits | 3 | Available |
| `876680-B21` | HPE Synergy 300Gb Interconnect Link 2.1m Direct Attach Copper Cable | Cables & Enablement Kits | 3 | Available |
*... [47 additional supply chain records omitted for brevity]*

### ⚠️ Supply Chain Verification Advisory (Unpublished Delivery Lead Times)

*The following high-value active components have unpublished delivery estimates in live OCA. Presales engineers must verify distributor buffer stock before quoting committed deployment timelines:*

| Product # | Description | Category | Lead Time Status | Presales Action |
|---|---|---|:---:|---|
| `JH673A` | HPE Networking X150 100G QSFP28 CWDM4 2km SM Transceiver | Networking | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `JL310A` | HPE Aruba Networking 100G QSFP28 LC LR4 10km SMF 2-strand Transceiver | Networking | **Unpublished** | Verify distributor inventory prior to SLA commitment |

