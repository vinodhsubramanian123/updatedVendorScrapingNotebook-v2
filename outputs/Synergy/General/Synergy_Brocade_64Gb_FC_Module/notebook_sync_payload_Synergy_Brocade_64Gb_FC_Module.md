# HPE Synergy_Brocade_64Gb_FC_Module — Synchronized Catalog Knowledge

**Target Product**: `Synergy_Brocade_64Gb_FC_Module`

**Scope Identity**: `HPE/NETWORKING/Synergy/General/Synergy_Brocade_64Gb_FC_Module`

**Sync Timestamp**: 2026-11-25T08:21:00.465Z

**Total Verified SKUs**: `40` (`24` Hardware + `16` Services)

**Total Synced KnowledgeDeltas**: `27`

This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.

---

## 🚀 Executive Delta & Recent Change Summary

| Category | Total SKUs | Added (Last Scrape) | Price Changed | Attribute Changed | Price & Attr Changed | Reinstated | Status |
|----------|------------|---------------------|---------------|-------------------|----------------------|------------|--------|
| **Hardware Components** | 24 | 0 | 0 | 0 | 0 | 0 | **CERTIFIED** |
| **Support Services & SLAs** | 16 | 0 | 0 | 0 | 0 | 0 | **CERTIFIED** |
| **Total Portfolio** | **40** | **0** | **0** | **0** | **0** | **0** | **ACTIVE** |


## Owned component capture scope

Observed 2026-11-12T03:22:14.338Z. Component base SKU: P77653-B21. Owner: Brocade 64Gb Fibre Channel Module for HPE Synergy #1. Parent base SKU: P51174-B21. Coverage is limited to the component menu.

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
16. **[LEARN_UNIVERSAL_BLINDSPOT_SUPPORT_PARITY_AND_MULTIVENDOR_BOM_20261118]**: Universal portfolio intelligence, support governance & multi-vendor attribute mapping rules (INV-242, INV-243): (1) Index companion *_Services.json entries non-destructively onto catalogData via non-enumerable _servicesEntries (preserving catalogData.entries and snapshotFingerprint), normalize -2/-1 max-qty sentinels to null, and recover or flag SHIFTED_COLUMN_CORRUPTION rows where SKU/badge tokens leak into Unit Price columns. (2) Enforce per-node quantity parity (Qty >= serverCount) for COM, iLO, and child support SKUs, flag COM-vs-hardware term mismatches and discontinued iLO licenses, fail Gate B14 as ACTION_REQUIRED when multi-node Gen11/Gen12 servers have qualifyingComQty < chassisQty without an approved SmartForm override, and separate Gate B19 PORTAL_VALIDATED_WITH_PC_OVERRIDE from unresolved P+ Process Control blocks. (3) Keep cross-solution price/lead-time backfill scoped strictly to same-generation matches while preserving nullable unpriced SKUs. (4) Map competitor Dell/Huawei/Cisco/Lenovo BOM lines using canonical attribute vectors without silent write-endurance or InfiniBand-to-Ethernet downgrades, and keep deadcode/orphan and scope-aware delta deduplication gates green. *(Type: WORKFLOW_BLINDSPOT_SUPPORT_PARITY_AND_MULTIVENDOR_BOM)*
17. **[LEARN_UNIVERSAL_OCA_UPLOAD_CONFIG_NAME_AND_DIVISIBILITY_20261124]**: 4-column HPE OCA BOM upload workbooks (Product #, Product Description, Qty, Config Name starting at A1 with zero trailing blank rows and preserved HPE modifier whitespace) must satisfy: (1) Use exact built-in keyword Ad-Hoc #1 in pre-upload Excel sheets for loose non-0D1 cables and transceivers — NEVER post-import display labels like AdHoc - SFP + Cables or AdHoc - Cables + Trans (verified in UCID 5158592304-01 vs UCID 5158590124-02: uploading AdHoc - SFP + Cables caused OCA to absorb K2Q47A x6, QK729A x6, and R6B12A x16 into 32Gb/20 4SFP+ FC #2 and scatter the remaining 7 loose cables across separate Ad-Hoc buckets, whereas Ad-Hoc #1 imports all 10 into one container that can be renamed in the UI afterward); (2) Parent-child integer divisibility (childQty % parentQty === 0) inside every non-AdHoc CTO Config Name, because OCA builds one template per Config Name scaled by parentQty and ejects non-divisible children (e.g. 1x 453154-B21 under 2x 876852-B21 = 0.5/unit) into extra Ad-Hoc containers; (3) Keep factory-integrated 0D1 transceivers inside parent modules only when divisible, and place indivisible loose parts in Ad-Hoc #1 without 0D1; (4) Number frame and FLM Config Names sequentially (#1, #2, #3), never role-named #1 duplicates or skipped indices, and anchor aggregated HU4B2A3* services to each owning product class #1 Config Name. *(Type: WORKFLOW_OCA_UPLOAD_CONFIG_CONTAINER_CONTRACT)*
18. **[OWNER_STANDARD_3Y_BASIC]**: Preserve explicit customer support term and tier in the closest rank; use 3-year Tech Care Basic only when unspecified or explicitly authorized. For this SN3600B BOQ the owner authorized 5-year Essential to 3-year Basic. Compare qualified fixed and flexible service options; disclose retention and preserve parent/suffix pairs. This commercial preference is not vendor qualification. *(Type: SUPPORT_POLICY)*
19. **[OWNER_ICON_SERVICE_ISOLATION]**: Select Services from Components for the owning icon, edit its dropdowns, and leave both apply-to-all icons and apply-to-all nodes off. Different icons retain their own SLA. *(Type: ICON_SUPPORT_ISOLATION)*
20. **[OWNER_OCA_EXPIRED_SESSION]**: When OCA says it encountered a problem, restart from Partner Portal refresh/login and open One Config Advanced through Quick Links. Do not reload the failed OCA session. Keep a Partner Portal tab before closing stale OCA so CDP does not disappear. This supersedes cache-flush advice for encountered-a-problem errors. *(Type: SESSION_RECOVERY_PROTOCOL)*
21. **[OWNER_CLOSEST_REQUIREMENT_RANK]**: Closest rank preserves customer requirements and makes only necessary compatibility/buildability changes. Budget alternatives disclose every deviation; do not silently reduce term, tier, capacity or resilience. Keep explicit owner overrides auditable against the original customer BOQ. *(Type: CUSTOMER_INTENT_POLICY)*
22. **[OWNER_COMPONENT_DOMAIN_ROUTING]**: Route by component role and exact product, never vendor or family alone. Synergy compute, fabric and frame use separate scopes. Resolve ownership before quantities. Validate each component and enclosure/bay, adapter/fabric, optical endpoints, shared power and per-icon SLA relationships; missing profiles remain NOT_EVALUATED and cannot inherit server defaults. Scraping completeness is not buildability certification. *(Type: COMPONENT_DOMAIN_ROUTING)*
23. **[GUARDRAIL_TRANSPORT_RECOVERY]**: Gemini guardrail API sends must retain systemInstruction and function declarations when overriding SDK send config. Enforce scoped local simulation and NotebookLM checks. Retry bounded transient provider errors without exhausting keys, distinguish per-minute from explicit daily quotas, and use configured approved model fallback with preserved tool results and no replay side effects. Empty or unfinished responses are unavailable, not verification. Dashboard status is independent of NotebookLM and vendor acceptance. *(Type: GUARDRAIL_RECOVERY_POLICY)*

## 🏛️ 2. Family & Generation Rules (Synergy General)

*No verified family/generation rules are registered for this product.*

## 🎯 3. Chassis & Solution-Type Gotchas (Synergy_Brocade_64Gb_FC_Module)

1. **[LEARN_SYNERGY_BROCADE_64GB_FC_MODULE_WORKFLOW_DUAL_PUBLICATION_ADVISORY_20261029] Synergy_Brocade_64Gb_FC_Module** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `Synergy_Brocade_64Gb_FC_Module CTO Server`):
   - **Rule**: Publish and read back the human Drive workbook separately from the complete semantic Markdown source in NotebookLM. Google Sheets is not a supported NotebookLM Drive source. A recent upload timestamp does not refresh old vendor observations.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

2. **[LEARN_SYNERGY_BROCADE_64GB_FC_MODULE_WORKFLOW_SOURCE_RETIREMENT_ADVISORY_20261029] Synergy_Brocade_64Gb_FC_Module** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `Synergy_Brocade_64Gb_FC_Module CTO Server`):
   - **Rule**: Verify exact-product replacement content, indexing and source-restricted grounded canary, then commit trust metadata before removing only managed stale catalog snapshots. Preserve QuickSpecs, separate learnings, shared enclosure/fabric sources and unrelated documents. Inventory absence is not authority to remove another product source.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

3. **[LEARN_SYNERGY_BROCADE_64GB_FC_MODULE_WORKFLOW_CLOUD_LEARNING_REVIEW_ADVISORY_20261029] Synergy_Brocade_64Gb_FC_Module** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `Synergy_Brocade_64Gb_FC_Module CTO Server`):
   - **Rule**: Preserve retrieved cloud learning documents locally with their source IDs. Treat prose claims as candidates pending dated vendor evidence; resolve contradictions before promoting hardware dependencies. Conflicting quantity claims require dated evidence for this exact product and selector state.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

4. **[LEARN_SYNERGY_BROCADE_FC_NO_STACKING_AND_FIBER_PARITY_20261125] Synergy_Brocade_64Gb_FC_Module** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `Synergy_Brocade_64Gb_FC_Module CTO Server`):
   - **Rule**: HPE Synergy Brocade FC switch modules never use inter-frame stacking cables across frames; every switch connects strictly northbound to SAN Fabric A/B via Access Gateway or Switch mode. Both P77653-B21 (64Gb, 12 internal + 12 external SFP56, 0 QSFP) and Q2E57A (32Gb/20, 12 internal + 8 external SFP28 + 2 QSFP) include 4x SW SFP transceivers in-box (R7M15A for 64Gb) and 0 fiber cables. Every active FC switch requires matching 1:1 OM4 LC/LC fiber cables (e.g. QK732A-QK737A) or MPO breakout cables (K2Q46A/K2Q47A on QSFP) covering both the 4 included-in-box optics and any added R7M15A/R7M16A or R6B12A/R6W26A expansion optics.
   - **Affected SKU**: `P77653-B21` | **Required Dependency**: `QK734A`


## 🔒 3b. Physical & Architectural Gating Rules (DOM Unavailable Tables)

*No portal-conditional gating rules detected in default DOM state.*

## ⚠️ 4. Discontinued & Obsolete SKUs Registry

*No discontinued or reinstated SKUs detected for Synergy_Brocade_64Gb_FC_Module. All cataloged SKUs are active.*

## 📊 5b. Category-Level Trends & Significant Price Adjustments

### Category Portfolio Delta & Planning Intelligence

| Category | Total SKUs | Added | Modified | Unchanged | Clearance / Drops | Category Planning Insight |
|---|---:|---:|---:|---:|---:|---|
| **Chassis** | 1 | 0 | 0 | 1 | 0 | Stable portfolio |
| **Cables & Enablement Kits** | 18 | 0 | 0 | 18 | 0 | Stable portfolio |
| **Software & Licenses** | 5 | 0 | 0 | 5 | 0 | Stable portfolio |

## 🔄 5. Recent Attribute & Specification Modifications Log

*No attribute or specification changes recorded across catalog snapshots.*

## 🧩 6. Same-Product CTO Variant Matrix

| Chassis Identifier | Product Family | Generation | Form Factor | CTO Base SKU |
|--------------------|----------------|------------|-------------|--------------|
| **Synergy_Brocade_64Gb_FC_Module** | Synergy | General | FC Switch Module | `P77653-B21` |

### Structural Field & Evidence Coverage

- **Row Types**: BASE_SYSTEM: 1, HARDWARE_OPTION: 20, SOFTWARE_SUBSCRIPTION: 19
- **Price States**: PRICED: 40
- **Lead-Time Measurement**: Numeric Days: 19, ETA Date Only: 0, Unpublished: 21
- **Visibility Coverage**: VISIBLE: 40

## ⏱️ 10. Supply Chain & Delivery Lead Time Intelligence

### Confirmed Component Delivery SLAs

| Product # | Description | Category | Lead Time | Channel Status |
|---|---|---|---:|---|
| `P77653-B21` | Brocade 64Gb Fibre Channel Module for HPE Synergy [P77653-B21] | Chassis | 3 days | Available in OCA product catalog |
| `AJ833A` | HPE LC to LC Multi-mode OM3 2-Fiber 0.5m 1-Pack Fiber Optic Cable | Cables & Enablement Kits | 3 | Available |
| `AJ836A` | HPE LC to LC Multi-mode OM3 2-Fiber 5.0m 1-Pack Fiber Optic Cable | Cables & Enablement Kits | 3 | Available |
| `AJ838A` | HPE LC to LC Multi-mode OM3 2-Fiber 30.0m 1-Pack Fiber Optic Cable | Cables & Enablement Kits | 3 | Available |
| `AJ839A` | HPE LC to LC Multi-mode OM3 2-Fiber 50.0m 1-Pack Fiber Optic Cable | Cables & Enablement Kits | 3 | Available |
| `AJ834A` | HPE LC to LC Multi-mode OM3 2-Fiber 1.0m 1-Pack Fiber Optic Cable | Cables & Enablement Kits | 4 | Available |
| `AJ835A` | HPE LC to LC Multi-mode OM3 2-Fiber 2.0m 1-Pack Fiber Optic Cable | Cables & Enablement Kits | 4 | Available |
| `AJ837A` | HPE LC to LC Multi-mode OM3 2-Fiber 15.0m 1-Pack Fiber Optic Cable | Cables & Enablement Kits | 4 | Available |
| `QK732A` | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 1m Cable | Cables & Enablement Kits | 3 | Available |
| `QK737A` | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 50m Cable | Cables & Enablement Kits | 3 | Available |
| `QK733A` | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 2m Cable | Cables & Enablement Kits | 4 | Available |
| `QK734A` | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 5m Cable | Cables & Enablement Kits | 14 | Available |
| `QK735A` | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 15m Cable | Cables & Enablement Kits | 8 | Available |
| `QK736A` | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 30m Cable | Cables & Enablement Kits | 4 | Available |
| `K2Q46A` | HPE Premier Flex MPO8 to 4xLC Multi-mode OM4 5m Fiber Cable | Cables & Enablement Kits | 14 | Available |
| `K2Q47A` | HPE Premier Flex MPO8 to 4xLC Multi-mode OM4 15m Fiber Cable | Cables & Enablement Kits | 4 | Available |
| `H6Z30A` | HPE Premier Flex MPO12/MPO12 Multi-mode OM4 100m Fiber Cable | Cables & Enablement Kits | 3 | Available |
| `QK731A` | HPE Premier Flex MPO12/MPO12 Multi-mode OM4 50m Fiber Cable | Cables & Enablement Kits | 3 | Available |
| `QK729A` | HPE Premier Flex MPO12/MPO12 Multi-mode OM4 10m Fiber Cable | Cables & Enablement Kits | 4 | Available |

### ⚠️ Supply Chain Verification Advisory (Unpublished Delivery Lead Times)

*The following high-value active components have unpublished delivery estimates in live OCA. Presales engineers must verify distributor buffer stock before quoting committed deployment timelines:*

| Product # | Description | Category | Lead Time Status | Presales Action |
|---|---|---|:---:|---|
| `Q2E58A` | Brocade 32Gb Fibre Channel SAN Switch Module 8-port Upgrade LTU for HPE Synergy | Software & Licenses | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `Q2E60A` | Brocade 32Gb Fibre Channel SAN Switch Module Power Pack+ LTU for HPE Synergy | Software & Licenses | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `5517AAE` | Brocade 8/16Gb Embedded FC Switch 12-port Upgrade E-LTU | Software & Licenses | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `5527AAE` | HPE B-series Entry Switch ISL Trunking E-LTU | Software & Licenses | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `TC464BAE` | Brocade 16Gb Embedded Switch Power Pack+ E-LTU | Software & Licenses | **Unpublished** | Verify distributor inventory prior to SLA commitment |


<!-- MANAGED_FULL_CATALOG -->
Content fingerprint: 15d8ff6d85677e58281005e67751c2f2d37933067015e2f264239673f7bb6d56

## Complete workbook text projection

Displayed cell values follow by sheet and original row. Formatting, charts and formulas remain in the Excel artifact. Repeated rows refer to the first identical row and schema; no content is replaced by a fingerprint.

### Category Summary

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Constraint | Min Qty | Max Qty | Total SKUs | Has Rules | Rule Count |
| 2 | Unknown | OM3 LC-LC type connectors cable | max 8 | 0 | 8 | 0 | No | 0 |
| 3 | Unknown | Premier Flex OM4 LC-LC | max 8 | 0 | 8 | 0 | No | 0 |
| 4 | Unknown | QSFP to 4xLC Breakout | max 4 | 0 | 4 | 0 | No | 0 |
| 5 | Unknown | MPO/MPO Multi-mode | max 4 | 0 | 4 | 0 | No | 0 |
| 6 | Software | Software for Brocade Switches | no max | 0 | Unlimited | 0 | No | 0 |
| 7 | Software | SANnav - New License | no max | 0 | Unlimited | 0 | No | 0 |
| 8 | Software | SANnav - Renewal License | no max | 0 | Unlimited | 0 | No | 0 |
| 9 | Chassis | Variants | min 1, max 1 — Active OCA CTO chassis | 1 | 1 | 1 | Yes | 1 |
| 10 | Cables &amp; Enablement Kits | OM3 LC-LC type connectors cable | max 8 | 0 | 8 | 7 | Yes | 1 |
| 11 | Cables &amp; Enablement Kits | Premier Flex OM4 LC-LC | max 8 | 0 | 8 | 6 | Yes | 1 |
| 12 | Cables &amp; Enablement Kits | QSFP to 4xLC Breakout | max 4 | 0 | 4 | 2 | Yes | 1 |
| 13 | Cables &amp; Enablement Kits | MPO/MPO Multi-mode | max 4 | 0 | 4 | 3 | Yes | 1 |
| 14 | Software &amp; Licenses | Software for Brocade Switches | no max | 0 | Unlimited | 9 | Yes | 2 |
| 15 | Software &amp; Licenses | SANnav - New License | no max | 0 | Unlimited | 9 | Yes | 1 |
| 16 | Software &amp; Licenses | SANnav - Renewal License | no max | 0 | Unlimited | 3 | Yes | 1 |


### All SKUs

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |
| 2 | Chassis | Variants | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Chassis &gt; Variants | Base Chassis | min 1, max 1 | 1 | 1 | Select exactly one currently discoverable, non-TAA/non-GTA CTO base chassis | P77653-B21 | CTO | Brocade 64Gb Fibre Channel Module for HPE Synergy [P77653-B21] | 1 | $63,999.00 |  |  |  |  | No | Available in OCA product catalog | 3 | 3 | OCA Estimate | OCA parent option row | Not evaluated | Active |  |  |  |
| 3 | Cables &amp; Enablement Kits | OM3 LC-LC type connectors cable | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Cables &amp; Enablement Kits &gt; OM3 LC-LC type connectors cable | Cable Kit | max 8 | 0 | 8 | Selection constraint for OM3 LC-LC type connectors cable: max 8 | AJ833A | Standard | HPE LC to LC Multi-mode OM3 2-Fiber 0.5m 1-Pack Fiber Optic Cable | 0 | $65.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/10/2017 | 12/31/2028 | [TEXT_1] |
| 4 | Cables &amp; Enablement Kits | OM3 LC-LC type connectors cable | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Cables &amp; Enablement Kits &gt; OM3 LC-LC type connectors cable | Cable Kit | max 8 | 0 | 8 | Selection constraint for OM3 LC-LC type connectors cable: max 8 | AJ836A | Standard | HPE LC to LC Multi-mode OM3 2-Fiber 5.0m 1-Pack Fiber Optic Cable | 0 | $115.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/10/2017 | 12/31/2028 | [TEXT_2] |
| 5 | Cables &amp; Enablement Kits | OM3 LC-LC type connectors cable | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Cables &amp; Enablement Kits &gt; OM3 LC-LC type connectors cable | Cable Kit | max 8 | 0 | 8 | Selection constraint for OM3 LC-LC type connectors cable: max 8 | AJ838A | Standard | HPE LC to LC Multi-mode OM3 2-Fiber 30.0m 1-Pack Fiber Optic Cable | 0 | $208.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/10/2017 | 12/31/2028 | [TEXT_3] |
| 6 | Cables &amp; Enablement Kits | OM3 LC-LC type connectors cable | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Cables &amp; Enablement Kits &gt; OM3 LC-LC type connectors cable | Cable Kit | max 8 | 0 | 8 | Selection constraint for OM3 LC-LC type connectors cable: max 8 | AJ839A | Standard | HPE LC to LC Multi-mode OM3 2-Fiber 50.0m 1-Pack Fiber Optic Cable | 0 | $253.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/10/2017 | 12/31/2028 | [TEXT_4] |
| 7 | Cables &amp; Enablement Kits | OM3 LC-LC type connectors cable | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Cables &amp; Enablement Kits &gt; OM3 LC-LC type connectors cable | Cable Kit | max 8 | 0 | 8 | Selection constraint for OM3 LC-LC type connectors cable: max 8 | AJ834A | Standard | HPE LC to LC Multi-mode OM3 2-Fiber 1.0m 1-Pack Fiber Optic Cable | 0 | $70.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/10/2017 | 12/31/2028 | [TEXT_5] |
| 8 | Cables &amp; Enablement Kits | OM3 LC-LC type connectors cable | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Cables &amp; Enablement Kits &gt; OM3 LC-LC type connectors cable | Cable Kit | max 8 | 0 | 8 | Selection constraint for OM3 LC-LC type connectors cable: max 8 | AJ835A | Standard | HPE LC to LC Multi-mode OM3 2-Fiber 2.0m 1-Pack Fiber Optic Cable | 0 | $95.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/10/2017 | 12/31/2028 | [TEXT_6] |
| 9 | Cables &amp; Enablement Kits | OM3 LC-LC type connectors cable | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Cables &amp; Enablement Kits &gt; OM3 LC-LC type connectors cable | Cable Kit | max 8 | 0 | 8 | Selection constraint for OM3 LC-LC type connectors cable: max 8 | AJ837A | Standard | HPE LC to LC Multi-mode OM3 2-Fiber 15.0m 1-Pack Fiber Optic Cable | 0 | $162.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/10/2017 | 12/31/2028 | [TEXT_7] |
| 10 | Cables &amp; Enablement Kits | Premier Flex OM4 LC-LC | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Cables &amp; Enablement Kits &gt; Premier Flex OM4 LC-LC | Cable Kit | max 8 | 0 | 8 | Selection constraint for Premier Flex OM4 LC-LC: max 8 | QK732A | Standard | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 1m Cable | 0 | $115.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/10/2017 | 12/31/2028 | [TEXT_2] |
| 11 | Cables &amp; Enablement Kits | Premier Flex OM4 LC-LC | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Cables &amp; Enablement Kits &gt; Premier Flex OM4 LC-LC | Cable Kit | max 8 | 0 | 8 | Selection constraint for Premier Flex OM4 LC-LC: max 8 | QK737A | Standard | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 50m Cable | 0 | $415.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/10/2017 | 12/31/2028 | [TEXT_8] |
| 12 | Cables &amp; Enablement Kits | Premier Flex OM4 LC-LC | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Cables &amp; Enablement Kits &gt; Premier Flex OM4 LC-LC | Cable Kit | max 8 | 0 | 8 | Selection constraint for Premier Flex OM4 LC-LC: max 8 | QK733A | Standard | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 2m Cable | 0 | $130.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/10/2017 | 12/31/2028 | [TEXT_9] |
| 13 | Cables &amp; Enablement Kits | Premier Flex OM4 LC-LC | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Cables &amp; Enablement Kits &gt; Premier Flex OM4 LC-LC | Cable Kit | max 8 | 0 | 8 | Selection constraint for Premier Flex OM4 LC-LC: max 8 | QK734A | Standard | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 5m Cable | 2 | $147.00 |  |  | $294.00 |  | No | Available | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 08/10/2017 | 12/31/2028 | [TEXT_10] |
| 14 | Cables &amp; Enablement Kits | Premier Flex OM4 LC-LC | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Cables &amp; Enablement Kits &gt; Premier Flex OM4 LC-LC | Cable Kit | max 8 | 0 | 8 | Selection constraint for Premier Flex OM4 LC-LC: max 8 | QK735A | Standard | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 15m Cable | 0 | $195.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 08/10/2017 | 12/31/2028 | [TEXT_11] |
| 15 | Cables &amp; Enablement Kits | Premier Flex OM4 LC-LC | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Cables &amp; Enablement Kits &gt; Premier Flex OM4 LC-LC | Cable Kit | max 8 | 0 | 8 | Selection constraint for Premier Flex OM4 LC-LC: max 8 | QK736A | Standard | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 30m Cable | 0 | $239.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/10/2017 | 12/31/2028 | [TEXT_12] |
| 16 | Cables &amp; Enablement Kits | QSFP to 4xLC Breakout | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Cables &amp; Enablement Kits &gt; QSFP to 4xLC Breakout | Cable Kit | max 4 | 0 | 4 | Selection constraint for QSFP to 4xLC Breakout: max 4 | K2Q46A | Standard | HPE Premier Flex MPO8 to 4xLC Multi-mode OM4 5m Fiber Cable | 0 | $800.00 |  |  | NA |  | No | Available | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 08/10/2017 | 12/31/2028 | [TEXT_13] |
| 17 | Cables &amp; Enablement Kits | QSFP to 4xLC Breakout | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Cables &amp; Enablement Kits &gt; QSFP to 4xLC Breakout | Cable Kit | max 4 | 0 | 4 | Selection constraint for QSFP to 4xLC Breakout: max 4 | K2Q47A | Standard | HPE Premier Flex MPO8 to 4xLC Multi-mode OM4 15m Fiber Cable | 0 | $1,350.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/10/2017 | 12/31/2028 | [TEXT_14] |
| 18 | Cables &amp; Enablement Kits | MPO/MPO Multi-mode | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Cables &amp; Enablement Kits &gt; MPO/MPO Multi-mode | Cable Kit | max 4 | 0 | 4 | Selection constraint for MPO/MPO Multi-mode: max 4 | H6Z30A | Standard | HPE Premier Flex MPO12/MPO12 Multi-mode OM4 100m Fiber Cable | 0 | $3,422.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/10/2017 | 12/31/2028 | [TEXT_15] |
| 19 | Cables &amp; Enablement Kits | MPO/MPO Multi-mode | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Cables &amp; Enablement Kits &gt; MPO/MPO Multi-mode | Cable Kit | max 4 | 0 | 4 | Selection constraint for MPO/MPO Multi-mode: max 4 | QK731A | Standard | HPE Premier Flex MPO12/MPO12 Multi-mode OM4 50m Fiber Cable | 0 | $2,000.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/10/2017 | 12/31/2028 | [TEXT_16] |
| 20 | Cables &amp; Enablement Kits | MPO/MPO Multi-mode | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Cables &amp; Enablement Kits &gt; MPO/MPO Multi-mode | Cable Kit | max 4 | 0 | 4 | Selection constraint for MPO/MPO Multi-mode: max 4 | QK729A | Standard | HPE Premier Flex MPO12/MPO12 Multi-mode OM4 10m Fiber Cable | 0 | $719.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/10/2017 | 12/31/2028 | [TEXT_17] |
| 21 | Software &amp; Licenses | Software for Brocade Switches | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Software &amp; Licenses &gt; Software for Brocade Switches | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Software for Brocade Switches: no max | Q2E58A | Standard | Brocade 32Gb Fibre Channel SAN Switch Module 8-port Upgrade LTU for HPE Synergy | 0 | $8,500.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 04/02/2019 | 01/27/2023 | [TEXT_18] |
| 22 | Software &amp; Licenses | Software for Brocade Switches | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Software &amp; Licenses &gt; Software for Brocade Switches | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Software for Brocade Switches: no max | Q2E60A | Standard | Brocade 32Gb Fibre Channel SAN Switch Module Power Pack+ LTU for HPE Synergy | 0 | $15,220.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 04/02/2019 | 01/27/2023 | [TEXT_19] |
| 23 | Software &amp; Licenses | Software for Brocade Switches | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Software &amp; Licenses &gt; Software for Brocade Switches | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Software for Brocade Switches: no max | 5517AAE | Standard | Brocade 8/16Gb Embedded FC Switch 12-port Upgrade E-LTU | 0 | $5,277.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 08/10/2017 | 12/21/2022 | [TEXT_20] |
| 24 | Software &amp; Licenses | Software for Brocade Switches | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Software &amp; Licenses &gt; Software for Brocade Switches | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Software for Brocade Switches: no max | 5527AAE | Standard | HPE B-series Entry Switch ISL Trunking E-LTU | 0 | $6,125.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 08/10/2017 | 04/28/2023 | [TEXT_21] |
| 25 | Software &amp; Licenses | Software for Brocade Switches | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Software &amp; Licenses &gt; Software for Brocade Switches | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Software for Brocade Switches: no max | TC464BAE | Standard | Brocade 16Gb Embedded Switch Power Pack+ E-LTU | 0 | $7,815.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/01/2018 | 11/21/2023 | [TEXT_22] |


### Chassis Variants

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Product # | Form Factor | Description | Option Type | HPE Recommended | List Price (USD) | Constraint | Start Date | Discontinued Date | Note |
| 2 | P77653-B21 | Unknown | Brocade 64Gb Fibre Channel Module for HPE Synergy [P77653-B21] | CTO | No | $63,999.00 | min 1, max 1 |  | Unknown | Select ONE chassis variant as the mandatory CTO base. All component rules, drive bay limits, and power constraints depend on this selection. |


### Chassis Options Matrix

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Base SKU | Form Factor | Option Type | HPE Recommended | List Price (USD) | Drive Media Supported | Base Drive Bays | Max Expandability | Power Envelope | Lifecycle Status | Start Date | Discontinued Date | Architectural Rules |
| 2 | P77653-B21 | Unknown | CTO | No | $63,999.00 | UNVERIFIED — variant-specific evidence required | UNVERIFIED — title is not a bay inventory | UNVERIFIED — variant-specific evidence required | UNVERIFIED — variant-specific evidence required | Active |  | Unknown | NOT VERIFIED: do not transfer compatibility or rules between base SKUs without scoped vendor evidence. |


### Rules &amp; Constraints

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 |
| --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Constraint | Rule Type | Rule Text |
| 2 | Unknown | OM3 LC-LC type connectors cable | max 8 | Quantity Constraint | Quantity: max 8 |
| 3 | Unknown | Premier Flex OM4 LC-LC | max 8 | Quantity Constraint | Quantity: max 8 |
| 4 | Unknown | QSFP to 4xLC Breakout | max 4 | Quantity Constraint | Quantity: max 4 |
| 5 | Unknown | MPO/MPO Multi-mode | max 4 | Quantity Constraint | Quantity: max 4 |
| 6 | Software | Software for Brocade Switches | Unlimited | Quantity Constraint | Quantity: Unlimited |
| 7 | Software | SANnav - New License | Unlimited | Quantity Constraint | Quantity: Unlimited |
| 8 | Software | SANnav - Renewal License | Unlimited | Quantity Constraint | Quantity: Unlimited |
| 9 | Chassis | Variants | min 1, max 1 — Active OCA CTO chassis | Configuration Rule | Select exactly one currently discoverable, non-TAA/non-GTA CTO base chassis |
| 10 | Cables &amp; Enablement Kits | OM3 LC-LC type connectors cable | max 8 | Configuration Rule | Selection constraint for OM3 LC-LC type connectors cable: max 8 |
| 11 | Cables &amp; Enablement Kits | Premier Flex OM4 LC-LC | max 8 | Configuration Rule | Selection constraint for Premier Flex OM4 LC-LC: max 8 |
| 12 | Cables &amp; Enablement Kits | QSFP to 4xLC Breakout | max 4 | Configuration Rule | Selection constraint for QSFP to 4xLC Breakout: max 4 |
| 13 | Cables &amp; Enablement Kits | MPO/MPO Multi-mode | max 4 | Configuration Rule | Selection constraint for MPO/MPO Multi-mode: max 4 |
| 14 | Software &amp; Licenses | Software for Brocade Switches | no max | Configuration Rule | Selection constraint for Software for Brocade Switches: no max |
| 15 | Software &amp; Licenses | SANnav - New License | no max | Configuration Rule | Selection constraint for SANnav - New License: no max |
| 16 | Software &amp; Licenses | SANnav - Renewal License | no max | Configuration Rule | Selection constraint for SANnav - Renewal License: no max |


### Software &amp; Licenses

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |
| 7 | Software &amp; Licenses | Software for Brocade Switches | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Software &amp; Licenses &gt; Software for Brocade Switches | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Software for Brocade Switches: no max | D4U69AAE | Service | Brocade 16Gb Fibre Channel SAN Switch Module 12-port Upgrade E-LTU for HPE Synergy | 0 | $8,334.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 08/10/2017 | 04/28/2023 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":8334,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 8 | Software &amp; Licenses | Software for Brocade Switches | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Software &amp; Licenses &gt; Software for Brocade Switches | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Software for Brocade Switches: no max | Q2E58AAE | Service | Brocade 32Gb Fibre Channel SAN Switch Module 8-port Upgrade E-LTU for HPE Synergy | 0 | $8,586.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 04/02/2019 | 11/30/2029 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":8586,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 9 | Software &amp; Licenses | Software for Brocade Switches | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Software &amp; Licenses &gt; Software for Brocade Switches | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Software for Brocade Switches: no max | Q2E60AAE | Service | Brocade 32Gb Fibre Channel SAN Switch Module Power Pack+ E-LTU for HPE Synergy | 0 | $15,374.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 04/02/2019 | 11/30/2029 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":15374,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 10 | Software &amp; Licenses | Software for Brocade Switches | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Software &amp; Licenses &gt; Software for Brocade Switches | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Software for Brocade Switches: no max | TC514AAE | Service | HPE 8/16Gb Embedded Switch Fabric Vision E-LTU | 0 | $6,163.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 08/10/2017 | 11/21/2023 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":6163,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 11 | Software &amp; Licenses | SANnav - New License | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Software &amp; Licenses &gt; SANnav - New License | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for SANnav - New License: no max | R3P47AAE | Service | HPE SANnav Global View 1yr E-LTU | 0 | $135,058.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 09/03/2019 | 10/31/2031 | [TEXT_23] |
| 12 | Software &amp; Licenses | SANnav - New License | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Software &amp; Licenses &gt; SANnav - New License | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for SANnav - New License: no max | R3P50AAE | Service | HPE SANnav Global View 3yr E-LTU | 0 | $324,137.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 09/03/2019 | 10/31/2031 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":324137,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 13 | Software &amp; Licenses | SANnav - New License | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Software &amp; Licenses &gt; SANnav - New License | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for SANnav - New License: no max | R4P31AAE | Service | HPE SANnav Global View 5yr E-LTU | 0 | $540,233.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 02/03/2020 | 10/31/2031 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":540233,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 14 | Software &amp; Licenses | SANnav - New License | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Software &amp; Licenses &gt; SANnav - New License | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for SANnav - New License: no max | R3P45AAE | Service | HPE SANnav Management Portal Base 1yr E-LTU | 0 | $36,018.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 09/03/2019 | 10/31/2031 | [TEXT_24] |
| 15 | Software &amp; Licenses | SANnav - New License | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Software &amp; Licenses &gt; SANnav - New License | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for SANnav - New License: no max | R3P48AAE | Service | HPE SANnav Management Portal Base 3yr E-LTU | 0 | $86,443.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 09/03/2019 | 10/31/2031 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":86443,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 16 | Software &amp; Licenses | SANnav - New License | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Software &amp; Licenses &gt; SANnav - New License | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for SANnav - New License: no max | R4P29AAE | Service | HPE SANnav Management Portal Base 5yr E-LTU | 0 | $144,076.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 02/03/2020 | 10/31/2031 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":144076,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 17 | Software &amp; Licenses | SANnav - New License | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Software &amp; Licenses &gt; SANnav - New License | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for SANnav - New License: no max | R3P46AAE | Service | HPE SANnav Management Portal Enterprise 1yr E-LTU | 0 | $90,047.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 09/03/2019 | 10/31/2031 | [TEXT_25] |
| 18 | Software &amp; Licenses | SANnav - New License | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Software &amp; Licenses &gt; SANnav - New License | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for SANnav - New License: no max | R3P49AAE | Service | HPE SANnav Management Portal Enterprise 3yr E-LTU | 0 | $216,111.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 09/03/2019 | 10/31/2031 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":216111,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 19 | Software &amp; Licenses | SANnav - New License | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Software &amp; Licenses &gt; SANnav - New License | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for SANnav - New License: no max | R4P30AAE | Service | HPE SANnav Management Portal Enterprise 5yr E-LTU | 0 | $360,192.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 02/03/2020 | 10/31/2031 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":360192,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 20 | Software &amp; Licenses | SANnav - Renewal License | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Software &amp; Licenses &gt; SANnav - Renewal License | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for SANnav - Renewal License: no max | S1S58AAE | Service | HPE SANnav Global View 1-year Renewal E-LTU | 0 | $135,058.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/05/2023 | 10/31/2031 | [TEXT_23] |
| 21 | Software &amp; Licenses | SANnav - Renewal License | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Software &amp; Licenses &gt; SANnav - Renewal License | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for SANnav - Renewal License: no max | S1S52AAE | Service | HPE SANnav Management Portal Base 1-year Renewal E-LTU | 0 | $36,018.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/05/2023 | 10/31/2031 | [TEXT_24] |
| 22 | Software &amp; Licenses | SANnav - Renewal License | HPE OCA &gt; Synergy Brocade 64Gb FC Module [P77653-B21] &gt; Software &amp; Licenses &gt; SANnav - Renewal License | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for SANnav - Renewal License: no max | S1S55AAE | Service | HPE SANnav Management Portal Enterprise 1-year Renewal E-LTU | 0 | $90,047.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/05/2023 | 10/31/2031 | [TEXT_25] |

Row 2: identical to sheet All SKUs, row 21.
Row 3: identical to sheet All SKUs, row 22.
Row 4: identical to sheet All SKUs, row 23.
Row 5: identical to sheet All SKUs, row 24.
Row 6: identical to sheet All SKUs, row 25.

### Chassis

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 2.

### Cables &amp; Enablement Kits

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 3.
Row 3: identical to sheet All SKUs, row 4.
Row 4: identical to sheet All SKUs, row 5.
Row 5: identical to sheet All SKUs, row 6.
Row 6: identical to sheet All SKUs, row 7.
Row 7: identical to sheet All SKUs, row 8.
Row 8: identical to sheet All SKUs, row 9.
Row 9: identical to sheet All SKUs, row 10.
Row 10: identical to sheet All SKUs, row 11.
Row 11: identical to sheet All SKUs, row 12.
Row 12: identical to sheet All SKUs, row 13.
Row 13: identical to sheet All SKUs, row 14.
Row 14: identical to sheet All SKUs, row 15.
Row 15: identical to sheet All SKUs, row 16.
Row 16: identical to sheet All SKUs, row 17.
Row 17: identical to sheet All SKUs, row 18.
Row 18: identical to sheet All SKUs, row 19.
Row 19: identical to sheet All SKUs, row 20.

### Metadata

| Original row | Column 1 | Column 2 |
| --- | --- | --- |
| 1 | Field | Value |
| 2 | Chassis | Synergy Brocade 64Gb FC Module |
| 3 | Scrape Date | 2026-11-12 |
| 4 | Source | OCA (Online Configuration Application) |
| 5 | Total Sub-Categories | 15 |
| 6 | Total Hardware SKUs | 24 |
| 7 | Total Service/Software SKUs | 16 |
| 8 | Total Combined SKUs | 40 |
| 9 | Chassis Variant Options | 1 |
| 10 | Total Rules | 15 |
| 11 | Unavailable DOM Rules | 0 |
| 12 | Total Tables | 6 |
| 13 | Diff Added SKUs | 0 |
| 14 | Diff Removed SKUs | 0 |
| 15 | Diff Price Changed | 0 |
| 16 | Diff Attr Changed | 0 |
| 17 | Diff Price+Attr Changed | 0 |
| 18 | Diff Reinstated SKUs | 0 |
| 19 | Diff Unchanged SKUs | 40 |
| 20 | Discontinued (All-Time) | 0 |
| 21 | Reinstated (All-Time) | 0 |
| 22 | Services JSON | outputs/Synergy/General/Synergy_Brocade_64Gb_FC_Module/Synergy_Brocade_64Gb_FC_Module_Services.json |
| 23 | Output Folder | outputs/Synergy/General/Synergy_Brocade_64Gb_FC_Module |


## Shared cell text

Bracketed TEXT identifiers above refer to these exact repeated values. The surrounding sheet, column and row determine applicability.

### TEXT_1

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":65,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_2

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":115,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_3

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":208,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_4

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":253,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_5

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":70,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_6

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":95,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_7

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":162,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_8

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":415,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_9

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":130,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_10

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":147,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_11

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":195,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_12

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":239,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_13

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":800,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_14

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":1350,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_15

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":3422,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_16

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2000,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_17

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":719,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_18

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":8500,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_19

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":15220,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_20

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":5277,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_21

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":6125,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_22

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":7815,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_23

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":135058,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_24

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":36018,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_25

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":90047,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

