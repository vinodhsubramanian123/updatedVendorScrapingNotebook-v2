# HPE Synergy_4Port_Frame_Link_Module — Synchronized Catalog Knowledge

**Target Product**: `Synergy_4Port_Frame_Link_Module`

**Scope Identity**: `HPE/NETWORKING/Synergy/General/Synergy_4Port_Frame_Link_Module`

**Sync Timestamp**: 2026-11-22T09:09:58.381Z

**Total Verified SKUs**: `62` (`62` Hardware + `0` Services)

**Total Synced KnowledgeDeltas**: `25`

This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.

---

## 🚀 Executive Delta & Recent Change Summary

| Category | Total SKUs | Added (Last Scrape) | Price Changed | Attribute Changed | Price & Attr Changed | Reinstated | Status |
|----------|------------|---------------------|---------------|-------------------|----------------------|------------|--------|
| **Hardware Components** | 62 | 0 | 0 | 0 | 0 | 0 | **CERTIFIED** |
| **Support Services & SLAs** | 0 | 0 | 0 | 0 | 0 | 0 | **CERTIFIED** |
| **Total Portfolio** | **62** | **0** | **0** | **0** | **0** | **0** | **ACTIVE** |


## Owned component capture scope

Observed 2026-11-12T03:18:03.540Z. Component base SKU: 876852-B21. Owner: 4-port Frame Link Module #1. Parent base SKU: P51174-B21. Coverage is limited to the component menu.

Service scope: OWNER_ABSENT_IN_OBSERVED_SERVICE_TREE. Unexecuted: alternative service types, terms and tiers; parent-level support changes. Missing prices remain unknown.

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
17. **[OWNER_STANDARD_3Y_BASIC]**: Preserve explicit customer support term and tier in the closest rank; use 3-year Tech Care Basic only when unspecified or explicitly authorized. For this SN3600B BOQ the owner authorized 5-year Essential to 3-year Basic. Compare qualified fixed and flexible service options; disclose retention and preserve parent/suffix pairs. This commercial preference is not vendor qualification. *(Type: SUPPORT_POLICY)*
18. **[OWNER_ICON_SERVICE_ISOLATION]**: Select Services from Components for the owning icon, edit its dropdowns, and leave both apply-to-all icons and apply-to-all nodes off. Different icons retain their own SLA. *(Type: ICON_SUPPORT_ISOLATION)*
19. **[OWNER_OCA_EXPIRED_SESSION]**: When OCA says it encountered a problem, restart from Partner Portal refresh/login and open One Config Advanced through Quick Links. Do not reload the failed OCA session. Keep a Partner Portal tab before closing stale OCA so CDP does not disappear. This supersedes cache-flush advice for encountered-a-problem errors. *(Type: SESSION_RECOVERY_PROTOCOL)*
20. **[OWNER_CLOSEST_REQUIREMENT_RANK]**: Closest rank preserves customer requirements and makes only necessary compatibility/buildability changes. Budget alternatives disclose every deviation; do not silently reduce term, tier, capacity or resilience. Keep explicit owner overrides auditable against the original customer BOQ. *(Type: CUSTOMER_INTENT_POLICY)*
21. **[OWNER_COMPONENT_DOMAIN_ROUTING]**: Route by component role and exact product, never vendor or family alone. Synergy compute, fabric and frame use separate scopes. Resolve ownership before quantities. Validate each component and enclosure/bay, adapter/fabric, optical endpoints, shared power and per-icon SLA relationships; missing profiles remain NOT_EVALUATED and cannot inherit server defaults. Scraping completeness is not buildability certification. *(Type: COMPONENT_DOMAIN_ROUTING)*
22. **[GUARDRAIL_TRANSPORT_RECOVERY]**: Gemini guardrail API sends must retain systemInstruction and function declarations when overriding SDK send config. Enforce scoped local simulation and NotebookLM checks. Retry bounded transient provider errors without exhausting keys, distinguish per-minute from explicit daily quotas, and use configured approved model fallback with preserved tool results and no replay side effects. Empty or unfinished responses are unavailable, not verification. Dashboard status is independent of NotebookLM and vendor acceptance. *(Type: GUARDRAIL_RECOVERY_POLICY)*

## 🏛️ 2. Family & Generation Rules (Synergy General)

*No verified family/generation rules are registered for this product.*

## 🎯 3. Chassis & Solution-Type Gotchas (Synergy_4Port_Frame_Link_Module)

1. **[LEARN_SYNERGY_4PORT_FRAME_LINK_MODULE_WORKFLOW_DUAL_PUBLICATION_ADVISORY_20261029] Synergy_4Port_Frame_Link_Module** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `Synergy_4Port_Frame_Link_Module CTO Server`):
   - **Rule**: Publish and read back the human Drive workbook separately from the complete semantic Markdown source in NotebookLM. Google Sheets is not a supported NotebookLM Drive source. A recent upload timestamp does not refresh old vendor observations.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

2. **[LEARN_SYNERGY_4PORT_FRAME_LINK_MODULE_WORKFLOW_SOURCE_RETIREMENT_ADVISORY_20261029] Synergy_4Port_Frame_Link_Module** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `Synergy_4Port_Frame_Link_Module CTO Server`):
   - **Rule**: Verify exact-product replacement content, indexing and source-restricted grounded canary, then commit trust metadata before removing only managed stale catalog snapshots. Preserve QuickSpecs, separate learnings, shared enclosure/fabric sources and unrelated documents. Inventory absence is not authority to remove another product source.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

3. **[LEARN_SYNERGY_4PORT_FRAME_LINK_MODULE_WORKFLOW_CLOUD_LEARNING_REVIEW_ADVISORY_20261029] Synergy_4Port_Frame_Link_Module** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `Synergy_4Port_Frame_Link_Module CTO Server`):
   - **Rule**: Preserve retrieved cloud learning documents locally with their source IDs. Treat prose claims as candidates pending dated vendor evidence; resolve contradictions before promoting hardware dependencies. Conflicting quantity claims require dated evidence for this exact product and selector state.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`


## 🔒 3b. Physical & Architectural Gating Rules (DOM Unavailable Tables)

### Component Mutual Exclusion Rules

1. **[Transceivers]**: Max quantity of product limited by space available.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (30)**: `QK724A`, `R6B10A`, `834972-B21`, `834972-B22`, `834972-B23`, `834972-B24`, `834972-B25`, `834972-B26`, `834972-B27`, `834972-B28`, `834973-B21`, `834973-B22`, `834973-B23`, `834973-B24`, `834973-B25`, `AJ716B`, `AJ717A`, `AP783A`, `AW538A`, `H6Z29A`, `JD093B`, `P9H29A`, `P9H32A`, `Q2R27A`, `Q2R31A`, `QK725A`, `R6B11A`, `R6B12A`, `R6B13A`, `R6B21A`

2. **[Transceivers]**: Max quantity of product limited by space available.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (2)**: `JD095C`, `JD096C`

## ⚠️ 4. Discontinued & Obsolete SKUs Registry

*No discontinued or reinstated SKUs detected for Synergy_4Port_Frame_Link_Module. All cataloged SKUs are active.*

### ⏳ Impending Obsolescence & Clearance Hardware (90-Day to 180-Day Window)

*These components remain orderable in live configurators today but have published vendor end dates. They represent high-value clearance opportunities for immediate deployments, but require explicit procurement cutoff remarks before quotation:*

| Product # | Description | Category | List Price (USD) | Discontinued Date | Price Trend | Presales Strategy Guidance |
|---|---|---|---:|---|:---:|---|
| `R6B10A` | HPE B-series 16Gb SFP+ Short Wave 1-pack Secure Transceiver | Networking | $1,946 | 04/30/2027 | 0.00% | ⚠️ Approaching EOL (04/30/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `AJ716B` | HPE B-series 8Gb Shortwave Fibre Channel 1 Pack SFP+ Transceiver | Networking | $185 | 09/30/2026 | 0.00% | ⚠️ Approaching EOL (09/30/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `AP783A` | HPE C-series 10GbE Short Range SFP+ Transceiver | Networking | $2,428 | 10/23/2026 | 0.00% | ⚠️ Approaching EOL (10/23/2026). Valid for immediate builds; verify multi-year roadmaps. |

## 📊 5b. Category-Level Trends & Significant Price Adjustments

### Category Portfolio Delta & Planning Intelligence

| Category | Total SKUs | Added | Modified | Unchanged | Clearance / Drops | Category Planning Insight |
|---|---:|---:|---:|---:|---:|---|
| **Chassis** | 1 | 0 | 0 | 1 | 0 | Stable portfolio |
| **Networking** | 40 | 0 | 0 | 40 | 0 | Stable portfolio |
| **Cables & Enablement Kits** | 21 | 0 | 0 | 21 | 0 | Stable portfolio |

## 🔄 5. Recent Attribute & Specification Modifications Log

*No attribute or specification changes recorded across catalog snapshots.*

## 🧩 6. Same-Product CTO Variant Matrix

| Chassis Identifier | Product Family | Generation | Form Factor | CTO Base SKU |
|--------------------|----------------|------------|-------------|--------------|
| **Synergy_4Port_Frame_Link_Module** | Synergy | General | Management Module | `876852-B21` |

### Structural Field & Evidence Coverage

- **Row Types**: BASE_SYSTEM: 1, HARDWARE_OPTION: 61
- **Price States**: PRICED: 61, UNPRICED: 1
- **Lead-Time Measurement**: Numeric Days: 35, ETA Date Only: 0, Unpublished: 27
- **Visibility Coverage**: VISIBLE: 30, SELECTOR_HIDDEN: 32

## ⏱️ 10. Supply Chain & Delivery Lead Time Intelligence

### Confirmed Component Delivery SLAs

| Product # | Description | Category | Lead Time | Channel Status |
|---|---|---|---:|---|
| `455886-B21` | HPE BladeSystem c-Class 10Gb SFP+ LR Transceiver | Networking | 3 | Available |
| `813874-B21` | HPE 10GBase-T SFP+ Transceiver | Networking | 3 | Available |
| `455883-B21` | HPE BladeSystem c-Class 10Gb SFP+ SR Transceiver | Networking | 8 | Available |
| `JD092B` | HPE Networking X130 10G SFP+ LC SR Transceiver | Networking | 13 | Available |
| `JD094B` | HPE Networking X130 10G SFP+ LC LR Transceiver | Networking | 13 | Available |
| `JG234A` | HPE Networking X130 10G SFP+ LC ER 40km Transceiver | Networking | 13 | Available |
| `QK724A` | HPE B-series 16Gb SFP+ Short Wave Transceiver | Networking | 3 | Not published by OCA |
| `R6B10A` | HPE B-series 16Gb SFP+ Short Wave 1-pack Secure Transceiver | Networking | 3 | Not published by OCA |
| `JD093B` | HPE X130 10G SFP+ LC LRM Transceiver | Networking | 5 | Obsolete (OB) |
| `R6B12A` | HPE B-series 32Gb SFP28 Short Wave 1-pack Secure Transceiver | Networking | 4 | Not published by OCA |
| `R6B13A` | HPE B-series 32Gb SFP28 Long Wave 10km 1-pack Secure Transceiver | Networking | 4 | Not published by OCA |
| `487655-B21` | HPE BladeSystem c-Class 10GbE SFP+ to SFP+ 3m Direct Attach Copper Cable | Cables & Enablement Kits | 3 | Available |
| `537963-B21` | HPE BladeSystem c-Class 10GbE SFP+ to SFP+ 5m Direct Attach Copper Cable | Cables & Enablement Kits | 3 | Available |
| `JC784C` | HPE Networking X240 10G SFP+ 7m DAC Cable | Cables & Enablement Kits | 13 | Available |
| `JD097C` | HPE Networking X240 10G SFP+ SFP+ 3m DAC Cable | Cables & Enablement Kits | 13 | Available |
| `JG081C` | HPE Networking X240 10G SFP+ SFP+ 5m DAC Cable | Cables & Enablement Kits | 13 | Available |
| `JD095C` | HPE Networking X240 10G SFP+ SFP+ 0.65m DAC Cable | Networking | 13 | Not published by OCA |
| `JD096C` | HPE Networking X240 10G SFP+ SFP+ 1.2m DAC Cable | Networking | 13 | Not published by OCA |
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
*... [5 additional supply chain records omitted for brevity]*

### ⚠️ Supply Chain Verification Advisory (Unpublished Delivery Lead Times)

*The following high-value active components have unpublished delivery estimates in live OCA. Presales engineers must verify distributor buffer stock before quoting committed deployment timelines:*

| Product # | Description | Category | Lead Time Status | Presales Action |
|---|---|---|:---:|---|
| `AW538A` | HPE B-series 8Gb Extended Long Wave 25km Fibre Channel SFP+ Transceiver 1 Pack | Networking | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `H6Z29A` | HPE B-series 16Gb LW 25km FC SFP 1-pack Transceiver | Networking | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P9H29A` | HPE B-Series 32Gb SFP28 Long Wave 1-pack Transceiver | Networking | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `Q2R27A` | HPE B-series 4x32Gb 1-pack Short Wave QSFP Transceiver | Networking | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `Q2R31A` | HPE B-series 4x32Gb 1-pack Long Wave 2km QSFP Transceiver | Networking | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `R6B11A` | HPE B-series 16Gb SFP+ Long Wave 10km 1-pack Secure Transceiver | Networking | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `R6B21A` | HPE B-series 16Gb SFP+ Extended Long Wave 25km 1-pack Secure Transceiver | Networking | **Unpublished** | Verify distributor inventory prior to SLA commitment |


<!-- MANAGED_FULL_CATALOG -->
Content fingerprint: e5f9e11c5d512f81038aaa38b4a4dd11b28fdff0be0765e67d0fba221f2dc28f

## Complete workbook text projection

Displayed cell values follow by sheet and original row. Formatting, charts and formulas remain in the Excel artifact. Repeated rows refer to the first identical row and schema; no content is replaced by a fingerprint.

### Category Summary

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Constraint | Min Qty | Max Qty | Total SKUs | Has Rules | Rule Count |
| 2 | Transceivers | SFP Transceivers | max 4 | 0 | 4 | 0 | No | 0 |
| 3 | Cables | DAC Cables | max 4 | 0 | 4 | 0 | No | 0 |
| 4 | Cables | OM3 Fibre Cables | max 4 | 0 | 4 | 0 | No | 0 |
| 5 | Cables | OM4 Fibre Cables | max 4 | 0 | 4 | 0 | No | 0 |
| 6 | Cables | CAT6A Cables | max 4 | 0 | 4 | 0 | No | 0 |
| 7 | Cables | 1Gb Transceivers for Management Ports Only | max 2 | 0 | 2 | 0 | No | 0 |
| 8 | Chassis | Variants | min 1, max 1 — Active OCA CTO chassis | 1 | 1 | 1 | Yes | 1 |
| 9 | Networking | SFP Transceivers | max 4 | 0 | 4 | 38 | Yes | 35 |
| 10 | Cables &amp; Enablement Kits | DAC Cables | max 4 | 0 | 4 | 5 | Yes | 1 |
| 11 | Cables &amp; Enablement Kits | OM3 Fibre Cables | max 4 | 0 | 4 | 7 | Yes | 1 |
| 12 | Cables &amp; Enablement Kits | OM4 Fibre Cables | max 4 | 0 | 4 | 6 | Yes | 1 |
| 13 | Cables &amp; Enablement Kits | CAT6A Cables | max 4 | 0 | 4 | 3 | Yes | 1 |
| 14 | Networking | 1Gb Transceivers for Management Ports Only | max 2 | 0 | 2 | 2 | Yes | 1 |


### All SKUs

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |
| 2 | Chassis | Variants | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Chassis &gt; Variants | Base Chassis | min 1, max 1 | 1 | 1 | Select exactly one currently discoverable, non-TAA/non-GTA CTO base chassis | 876852-B21 | CTO | HPE Synergy 4-port Frame Link Module [876852-B21] | 1 | $2,210.00 |  |  |  |  | No | Available in OCA product catalog | Unpublished |  | Unpublished | Not published by OCA | Not evaluated | Active |  |  |  |
| 3 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | Selection constraint for SFP Transceivers: max 4 | 455886-B21 | Standard | HPE BladeSystem c-Class 10Gb SFP+ LR Transceiver | 0 | $1,751.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 12/31/2030 | [TEXT_1] |
| 4 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | Selection constraint for SFP Transceivers: max 4 | 813874-B21 | Standard | HPE 10GBase-T SFP+ Transceiver | 0 | $1,173.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 08/30/2027 | [TEXT_2] |
| 5 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | Selection constraint for SFP Transceivers: max 4 | 455883-B21 | Standard | HPE BladeSystem c-Class 10Gb SFP+ SR Transceiver | 0 | $842.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 12/31/2030 | [TEXT_3] |
| 6 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | Selection constraint for SFP Transceivers: max 4 | JD092B | Standard | HPE Networking X130 10G SFP+ LC SR Transceiver | 0 | $840.00 |  |  | NA |  | No | Available | 13 | 13 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 12/31/2099 | [TEXT_4] |
| 7 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | Selection constraint for SFP Transceivers: max 4 | JD094B | Standard | HPE Networking X130 10G SFP+ LC LR Transceiver | 0 | $2,043.00 |  |  | NA |  | No | Available | 13 | 13 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 12/31/2099 | [TEXT_5] |
| 8 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | Selection constraint for SFP Transceivers: max 4 | JG234A | Standard | HPE Networking X130 10G SFP+ LC ER 40km Transceiver | 0 | $10,394.00 |  |  | NA |  | No | Available | 13 | 13 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 12/31/2099 | [TEXT_6] |
| 9 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | [TEXT_7] | QK724A | Standard | HPE B-series 16Gb SFP+ Short Wave Transceiver | 0 | $417.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 04/30/2028 | [TEXT_8] |
| 10 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | [TEXT_9] | R6B10A | Standard | HPE B-series 16Gb SFP+ Short Wave 1-pack Secure Transceiver | 0 | $1,946.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 12/07/2020 | 04/30/2027 | [TEXT_10] |
| 11 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | [TEXT_11] | 834972-B21 | Standard | HPE 3m InfiniBand EDR QSFP Optical Cable | 0 | $1,250.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 04/30/2025 | [TEXT_12] |
| 12 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | [TEXT_13] | 834972-B22 | Standard | HPE 5m InfiniBand EDR QSFP Optical Cable | 0 | $1,251.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 12/31/2024 | [TEXT_14] |
| 13 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | [TEXT_15] | 834972-B23 | Standard | HPE 7m InfiniBand EDR QSFP Optical Cable | 0 | $1,251.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 12/31/2024 | [TEXT_14] |
| 14 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | [TEXT_16] | 834972-B24 | Standard | HPE 10m InfiniBand EDR QSFP Optical Cable | 0 | $1,250.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 12/31/2024 | [TEXT_12] |
| 15 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | [TEXT_17] | 834972-B25 | Standard | HPE 12m InfiniBand EDR QSFP Optical Cable | 0 | $1,272.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 04/30/2025 | [TEXT_18] |
| 16 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | [TEXT_19] | 834972-B26 | Standard | HPE 15m InfiniBand EDR QSFP Optical Cable | 0 | $1,364.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 12/31/2024 | [TEXT_20] |
| 17 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | [TEXT_21] | 834972-B27 | Standard | HPE 20m InfiniBand EDR QSFP Optical Cable | 0 | $1,364.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 04/11/2024 | [TEXT_20] |
| 18 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | [TEXT_22] | 834972-B28 | Standard | HPE 30m InfiniBand EDR QSFP Optical Cable | 0 | $1,575.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 12/31/2024 | [TEXT_23] |
| 19 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | [TEXT_24] | 834973-B21 | Standard | HPE 0.5m InfiniBand EDR QSFP Copper Cable | 0 | $263.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 12/31/2024 | [TEXT_25] |
| 20 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | [TEXT_26] | 834973-B22 | Standard | HPE 1m InfiniBand EDR QSFP Copper Cable | 0 | $247.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 12/31/2024 | [TEXT_27] |
| 21 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | [TEXT_28] | 834973-B23 | Standard | HPE 1.5m InfiniBand EDR QSFP Copper Cable | 0 | $273.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 12/31/2024 | [TEXT_29] |
| 22 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | [TEXT_30] | 834973-B24 | Standard | HPE 2m InfiniBand EDR QSFP Copper Cable | 0 | $287.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 12/31/2024 | [TEXT_31] |
| 23 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | [TEXT_32] | 834973-B25 | Standard | HPE 3m InfiniBand EDR QSFP Copper Cable | 0 | $335.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 12/31/2024 | [TEXT_33] |
| 24 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | [TEXT_34] | AJ716B | Standard | HPE B-series 8Gb Shortwave Fibre Channel 1 Pack SFP+ Transceiver | 0 | $185.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 09/30/2026 | [TEXT_35] |
| 25 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | [TEXT_36] | AJ717A | Standard | HPE B-series 8Gb Long Wave 10km Fibre Channel 1 Pack SFP+ Transceiver | 0 | $1,700.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 01/24/2024 | [TEXT_37] |
| 26 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | [TEXT_38] | AP783A | Standard | HPE C-series 10GbE Short Range SFP+ Transceiver | 0 | $2,428.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 10/23/2026 | [TEXT_39] |
| 27 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | [TEXT_40] | AW538A | Standard | HPE B-series 8Gb Extended Long Wave 25km Fibre Channel SFP+ Transceiver 1 Pack | 0 | $6,379.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 12/31/2019 | [TEXT_41] |
| 28 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | [TEXT_42] | H6Z29A | Standard | HPE B-series 16Gb LW 25km FC SFP 1-pack Transceiver | 0 | $7,071.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 12/02/2022 | [TEXT_43] |
| 29 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | [TEXT_44] | JD093B | Standard | HPE X130 10G SFP+ LC LRM Transceiver | 0 |  |  |  | NA |  | No | Obsolete (OB) | 5 | 5 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Obsolete (OB) | 05/06/2016 | 10/01/2018 | [TEXT_45] |
| 30 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | [TEXT_46] | P9H29A | Standard | HPE B-Series 32Gb SFP28 Long Wave 1-pack Transceiver | 0 | $6,100.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 03/27/2017 | 11/30/2021 | [TEXT_47] |
| 31 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | [TEXT_48] | P9H32A | Standard | HPE B-series 32Gb SFP28 Short Wave 1-pack Transceiver | 0 | $2,199.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/28/2016 | 08/05/2022 | [TEXT_49] |
| 32 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | [TEXT_50] | Q2R27A | Standard | HPE B-series 4x32Gb 1-pack Short Wave QSFP Transceiver | 0 | $19,530.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 04/02/2019 | 07/24/2022 | [TEXT_51] |
| 33 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | [TEXT_52] | Q2R31A | Standard | HPE B-series 4x32Gb 1-pack Long Wave 2km QSFP Transceiver | 0 | $50,526.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 09/25/2017 | 02/15/2024 | [TEXT_53] |
| 34 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | [TEXT_54] | QK725A | Standard | HPE B-series 16Gb SFP+ Long Wave 10km Transceiver | 0 | $3,400.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 02/24/2023 | [TEXT_55] |
| 35 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | [TEXT_56] | R6B11A | Standard | HPE B-series 16Gb SFP+ Long Wave 10km 1-pack Secure Transceiver | 0 | $6,614.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/07/2020 | 06/15/2025 | [TEXT_57] |
| 36 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | [TEXT_58] | R6B12A | Standard | HPE B-series 32Gb SFP28 Short Wave 1-pack Secure Transceiver | 0 | $2,691.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 12/07/2020 | 03/31/2028 | [TEXT_59] |
| 37 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | [TEXT_60] | R6B13A | Standard | HPE B-series 32Gb SFP28 Long Wave 10km 1-pack Secure Transceiver | 0 | $8,838.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 12/07/2020 | 03/31/2028 | [TEXT_61] |
| 38 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | [TEXT_62] | R6B21A | Standard | HPE B-series 16Gb SFP+ Extended Long Wave 25km 1-pack Secure Transceiver | 0 | $27,508.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/07/2020 | 06/30/2025 | [TEXT_63] |
| 39 | Cables &amp; Enablement Kits | DAC Cables | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Cables &amp; Enablement Kits &gt; DAC Cables | Transceiver | max 4 | 0 | 4 | Selection constraint for DAC Cables: max 4 | 487655-B21 | Standard | HPE BladeSystem c-Class 10GbE SFP+ to SFP+ 3m Direct Attach Copper Cable | 0 | $285.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 08/30/2027 | [TEXT_64] |
| 40 | Cables &amp; Enablement Kits | DAC Cables | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Cables &amp; Enablement Kits &gt; DAC Cables | Transceiver | max 4 | 0 | 4 | Selection constraint for DAC Cables: max 4 | 537963-B21 | Standard | HPE BladeSystem c-Class 10GbE SFP+ to SFP+ 5m Direct Attach Copper Cable | 0 | $327.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 08/30/2027 | [TEXT_65] |
| 41 | Cables &amp; Enablement Kits | DAC Cables | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Cables &amp; Enablement Kits &gt; DAC Cables | Transceiver | max 4 | 0 | 4 | Selection constraint for DAC Cables: max 4 | JC784C | Standard | HPE Networking X240 10G SFP+ 7m DAC Cable | 0 | $430.00 |  |  | NA |  | No | Available | 13 | 13 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 12/31/2099 | [TEXT_66] |
| 42 | Cables &amp; Enablement Kits | DAC Cables | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Cables &amp; Enablement Kits &gt; DAC Cables | Transceiver | max 4 | 0 | 4 | Selection constraint for DAC Cables: max 4 | JD097C | Standard | HPE Networking X240 10G SFP+ SFP+ 3m DAC Cable | 0 | $314.00 |  |  | NA |  | No | Available | 13 | 13 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 12/31/2099 | [TEXT_67] |
| 43 | Cables &amp; Enablement Kits | DAC Cables | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Cables &amp; Enablement Kits &gt; DAC Cables | Transceiver | max 4 | 0 | 4 | Selection constraint for DAC Cables: max 4 | JG081C | Standard | HPE Networking X240 10G SFP+ SFP+ 5m DAC Cable | 0 | $346.00 |  |  | NA |  | No | Available | 13 | 13 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 12/31/2099 | [TEXT_68] |
| 44 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | [TEXT_69] | JD095C | Standard | HPE Networking X240 10G SFP+ SFP+ 0.65m DAC Cable | 0 | $199.00 |  |  | NA |  | No | Not published by OCA | 13 | 13 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 12/31/2099 | [TEXT_70] |
| 45 | Networking | SFP Transceivers | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; SFP Transceivers | Transceiver | max 4 | 0 | 4 | [TEXT_71] | JD096C | Standard | HPE Networking X240 10G SFP+ SFP+ 1.2m DAC Cable | 0 | $220.00 |  |  | NA |  | No | Not published by OCA | 13 | 13 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 12/31/2099 | [TEXT_72] |
| 46 | Cables &amp; Enablement Kits | OM3 Fibre Cables | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Cables &amp; Enablement Kits &gt; OM3 Fibre Cables | Cable Kit | max 4 | 0 | 4 | Selection constraint for OM3 Fibre Cables: max 4 | AJ833A | Standard | HPE LC to LC Multi-mode OM3 2-Fiber 0.5m 1-Pack Fiber Optic Cable | 0 | $65.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 12/31/2028 | [TEXT_73] |
| 47 | Cables &amp; Enablement Kits | OM3 Fibre Cables | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Cables &amp; Enablement Kits &gt; OM3 Fibre Cables | Cable Kit | max 4 | 0 | 4 | Selection constraint for OM3 Fibre Cables: max 4 | AJ836A | Standard | HPE LC to LC Multi-mode OM3 2-Fiber 5.0m 1-Pack Fiber Optic Cable | 0 | $115.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 12/31/2028 | [TEXT_74] |
| 48 | Cables &amp; Enablement Kits | OM3 Fibre Cables | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Cables &amp; Enablement Kits &gt; OM3 Fibre Cables | Cable Kit | max 4 | 0 | 4 | Selection constraint for OM3 Fibre Cables: max 4 | AJ838A | Standard | HPE LC to LC Multi-mode OM3 2-Fiber 30.0m 1-Pack Fiber Optic Cable | 0 | $208.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 12/31/2028 | [TEXT_75] |
| 49 | Cables &amp; Enablement Kits | OM3 Fibre Cables | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Cables &amp; Enablement Kits &gt; OM3 Fibre Cables | Cable Kit | max 4 | 0 | 4 | Selection constraint for OM3 Fibre Cables: max 4 | AJ839A | Standard | HPE LC to LC Multi-mode OM3 2-Fiber 50.0m 1-Pack Fiber Optic Cable | 0 | $253.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 12/31/2028 | [TEXT_76] |
| 50 | Cables &amp; Enablement Kits | OM3 Fibre Cables | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Cables &amp; Enablement Kits &gt; OM3 Fibre Cables | Cable Kit | max 4 | 0 | 4 | Selection constraint for OM3 Fibre Cables: max 4 | AJ834A | Standard | HPE LC to LC Multi-mode OM3 2-Fiber 1.0m 1-Pack Fiber Optic Cable | 0 | $70.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 12/31/2028 | [TEXT_77] |
| 51 | Cables &amp; Enablement Kits | OM3 Fibre Cables | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Cables &amp; Enablement Kits &gt; OM3 Fibre Cables | Cable Kit | max 4 | 0 | 4 | Selection constraint for OM3 Fibre Cables: max 4 | AJ835A | Standard | HPE LC to LC Multi-mode OM3 2-Fiber 2.0m 1-Pack Fiber Optic Cable | 0 | $95.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 12/31/2028 | [TEXT_78] |
| 52 | Cables &amp; Enablement Kits | OM3 Fibre Cables | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Cables &amp; Enablement Kits &gt; OM3 Fibre Cables | Cable Kit | max 4 | 0 | 4 | Selection constraint for OM3 Fibre Cables: max 4 | AJ837A | Standard | HPE LC to LC Multi-mode OM3 2-Fiber 15.0m 1-Pack Fiber Optic Cable | 0 | $162.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 12/31/2028 | [TEXT_79] |
| 53 | Cables &amp; Enablement Kits | OM4 Fibre Cables | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Cables &amp; Enablement Kits &gt; OM4 Fibre Cables | Cable Kit | max 4 | 0 | 4 | Selection constraint for OM4 Fibre Cables: max 4 | QK732A | Standard | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 1m Cable | 0 | $115.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 12/31/2028 | [TEXT_74] |
| 54 | Cables &amp; Enablement Kits | OM4 Fibre Cables | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Cables &amp; Enablement Kits &gt; OM4 Fibre Cables | Cable Kit | max 4 | 0 | 4 | Selection constraint for OM4 Fibre Cables: max 4 | QK737A | Standard | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 50m Cable | 0 | $415.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 12/31/2028 | [TEXT_80] |
| 55 | Cables &amp; Enablement Kits | OM4 Fibre Cables | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Cables &amp; Enablement Kits &gt; OM4 Fibre Cables | Cable Kit | max 4 | 0 | 4 | Selection constraint for OM4 Fibre Cables: max 4 | QK733A | Standard | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 2m Cable | 0 | $130.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 12/31/2028 | [TEXT_81] |
| 56 | Cables &amp; Enablement Kits | OM4 Fibre Cables | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Cables &amp; Enablement Kits &gt; OM4 Fibre Cables | Cable Kit | max 4 | 0 | 4 | Selection constraint for OM4 Fibre Cables: max 4 | QK734A | Standard | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 5m Cable | 0 | $147.00 |  |  | NA |  | No | Available | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 12/31/2028 | [TEXT_82] |
| 57 | Cables &amp; Enablement Kits | OM4 Fibre Cables | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Cables &amp; Enablement Kits &gt; OM4 Fibre Cables | Cable Kit | max 4 | 0 | 4 | Selection constraint for OM4 Fibre Cables: max 4 | QK735A | Standard | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 15m Cable | 0 | $195.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 12/31/2028 | [TEXT_83] |
| 58 | Cables &amp; Enablement Kits | OM4 Fibre Cables | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Cables &amp; Enablement Kits &gt; OM4 Fibre Cables | Cable Kit | max 4 | 0 | 4 | Selection constraint for OM4 Fibre Cables: max 4 | QK736A | Standard | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 30m Cable | 0 | $239.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 12/31/2028 | [TEXT_84] |
| 59 | Cables &amp; Enablement Kits | CAT6A Cables | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Cables &amp; Enablement Kits &gt; CAT6A Cables | Cable Kit | max 4 | 0 | 4 | Selection constraint for CAT6A Cables: max 4 | 861412-B21 | Standard | HPE Synergy Frame Link Module CAT6A 1.2m Cable | 0 | $65.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 01/05/2017 | 08/31/2027 | [TEXT_85] |
| 60 | Cables &amp; Enablement Kits | CAT6A Cables | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Cables &amp; Enablement Kits &gt; CAT6A Cables | Cable Kit | max 4 | 0 | 4 | Selection constraint for CAT6A Cables: max 4 | 861413-B21 | Standard | HPE Synergy Frame Link Module CAT6A 3m Cable | 0 | $113.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 01/05/2017 | 08/31/2027 | [TEXT_86] |
| 61 | Cables &amp; Enablement Kits | CAT6A Cables | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Cables &amp; Enablement Kits &gt; CAT6A Cables | Cable Kit | max 4 | 0 | 4 | Selection constraint for CAT6A Cables: max 4 | 861414-B21 | Standard | HPE Synergy Frame Link Module CAT6A 6.4m Cable | 0 | $113.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 01/05/2017 | 11/30/2022 | [TEXT_87] |
| 62 | Networking | 1Gb Transceivers for Management Ports Only | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; 1Gb Transceivers for Management Ports Only | Transceiver | max 2 | 0 | 2 | Selection constraint for 1Gb Transceivers for Management Ports Only: max 2 | 453151-B21 | Standard | HPE BladeSystem c-Class Virtual Connect 1G SFP SX Transceiver | 0 | $427.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 08/30/2027 | [TEXT_88] |
| 63 | Networking | 1Gb Transceivers for Management Ports Only | HPE OCA &gt; Synergy 4Port Frame Link Module [876852-B21] &gt; Networking &gt; 1Gb Transceivers for Management Ports Only | Transceiver | max 2 | 0 | 2 | Selection constraint for 1Gb Transceivers for Management Ports Only: max 2 | 453154-B21 | Standard | HPE BladeSystem CClass Virtual Connect 1G SFP RJ45 Transceiver | 0 | $426.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 08/30/2027 | [TEXT_89] |


### Chassis Variants

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Product # | Form Factor | Description | Option Type | HPE Recommended | List Price (USD) | Constraint | Start Date | Discontinued Date | Note |
| 2 | 876852-B21 | Unknown | HPE Synergy 4-port Frame Link Module [876852-B21] | CTO | No | $2,210.00 | min 1, max 1 |  | Unknown | Select ONE chassis variant as the mandatory CTO base. All component rules, drive bay limits, and power constraints depend on this selection. |


### Chassis Options Matrix

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Base SKU | Form Factor | Option Type | HPE Recommended | List Price (USD) | Drive Media Supported | Base Drive Bays | Max Expandability | Power Envelope | Lifecycle Status | Start Date | Discontinued Date | Architectural Rules |
| 2 | 876852-B21 | Unknown | CTO | No | $2,210.00 | UNVERIFIED — variant-specific evidence required | UNVERIFIED — title is not a bay inventory | UNVERIFIED — variant-specific evidence required | UNVERIFIED — variant-specific evidence required | Active |  | Unknown | NOT VERIFIED: do not transfer compatibility or rules between base SKUs without scoped vendor evidence. |


### Rules &amp; Constraints

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 |
| --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Constraint | Rule Type | Rule Text |
| 2 | Transceivers | SFP Transceivers | max 4 | Quantity Constraint | Quantity: max 4 |
| 3 | Cables | DAC Cables | max 4 | Quantity Constraint | Quantity: max 4 |
| 4 | Cables | OM3 Fibre Cables | max 4 | Quantity Constraint | Quantity: max 4 |
| 5 | Cables | OM4 Fibre Cables | max 4 | Quantity Constraint | Quantity: max 4 |
| 6 | Cables | CAT6A Cables | max 4 | Quantity Constraint | Quantity: max 4 |
| 7 | Cables | 1Gb Transceivers for Management Ports Only | max 2 | Quantity Constraint | Quantity: max 2 |
| 8 | Chassis | Variants | min 1, max 1 — Active OCA CTO chassis | Configuration Rule | Select exactly one currently discoverable, non-TAA/non-GTA CTO base chassis |
| 9 | Networking | SFP Transceivers | max 4 | Configuration Rule | Selection constraint for SFP Transceivers: max 4 |
| 10 | Networking | SFP Transceivers | max 4 | Configuration Rule | Max quantity of product limited by space available. |
| 11 | Networking | SFP Transceivers | max 4 | Configuration Rule | QK724A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 12 | Networking | SFP Transceivers | max 4 | Configuration Rule | R6B10A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 13 | Networking | SFP Transceivers | max 4 | Configuration Rule | 834972-B21 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 14 | Networking | SFP Transceivers | max 4 | Configuration Rule | 834972-B22 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 15 | Networking | SFP Transceivers | max 4 | Configuration Rule | 834972-B23 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 16 | Networking | SFP Transceivers | max 4 | Configuration Rule | 834972-B24 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 17 | Networking | SFP Transceivers | max 4 | Configuration Rule | 834972-B25 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 18 | Networking | SFP Transceivers | max 4 | Configuration Rule | 834972-B26 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 19 | Networking | SFP Transceivers | max 4 | Configuration Rule | 834972-B27 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 20 | Networking | SFP Transceivers | max 4 | Configuration Rule | 834972-B28 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 21 | Networking | SFP Transceivers | max 4 | Configuration Rule | 834973-B21 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 22 | Networking | SFP Transceivers | max 4 | Configuration Rule | 834973-B22 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 23 | Networking | SFP Transceivers | max 4 | Configuration Rule | 834973-B23 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 24 | Networking | SFP Transceivers | max 4 | Configuration Rule | 834973-B24 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 25 | Networking | SFP Transceivers | max 4 | Configuration Rule | 834973-B25 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 26 | Networking | SFP Transceivers | max 4 | Configuration Rule | AJ716B conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 27 | Networking | SFP Transceivers | max 4 | Configuration Rule | AJ717A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 28 | Networking | SFP Transceivers | max 4 | Configuration Rule | AP783A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 29 | Networking | SFP Transceivers | max 4 | Configuration Rule | AW538A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 30 | Networking | SFP Transceivers | max 4 | Configuration Rule | H6Z29A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 31 | Networking | SFP Transceivers | max 4 | Configuration Rule | JD093B conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 32 | Networking | SFP Transceivers | max 4 | Configuration Rule | P9H29A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 33 | Networking | SFP Transceivers | max 4 | Configuration Rule | P9H32A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 34 | Networking | SFP Transceivers | max 4 | Configuration Rule | Q2R27A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 35 | Networking | SFP Transceivers | max 4 | Configuration Rule | Q2R31A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 36 | Networking | SFP Transceivers | max 4 | Configuration Rule | QK725A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 37 | Networking | SFP Transceivers | max 4 | Configuration Rule | R6B11A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 38 | Networking | SFP Transceivers | max 4 | Configuration Rule | R6B12A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 39 | Networking | SFP Transceivers | max 4 | Configuration Rule | R6B13A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 40 | Networking | SFP Transceivers | max 4 | Configuration Rule | R6B21A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 41 | Cables &amp; Enablement Kits | DAC Cables | max 4 | Configuration Rule | Selection constraint for DAC Cables: max 4 |
| 42 | Networking | SFP Transceivers | max 4 | Configuration Rule | JD095C conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 43 | Networking | SFP Transceivers | max 4 | Configuration Rule | JD096C conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 44 | Cables &amp; Enablement Kits | OM3 Fibre Cables | max 4 | Configuration Rule | Selection constraint for OM3 Fibre Cables: max 4 |
| 45 | Cables &amp; Enablement Kits | OM4 Fibre Cables | max 4 | Configuration Rule | Selection constraint for OM4 Fibre Cables: max 4 |
| 46 | Cables &amp; Enablement Kits | CAT6A Cables | max 4 | Configuration Rule | Selection constraint for CAT6A Cables: max 4 |
| 47 | Networking | 1Gb Transceivers for Management Ports Only | max 2 | Configuration Rule | Selection constraint for 1Gb Transceivers for Management Ports Only: max 2 |
| 48 | Transceivers | Configuration Rules | Max quantity of product limited by space available. | Learned Feedback Rule | [MUTUAL_EXCLUSION] Max quantity of product limited by space available. |


### Unavailable Rules &amp; Gates

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Rule ID | Rule Type | Section | Constraint / Reason | Affected SKU Count | Affected SKUs |
| 2 | RULE_1 | CONDITIONAL_VISIBILITY | Transceivers | Max quantity of product limited by space available. | 30 | QK724A, R6B10A, 834972-B21, 834972-B22, 834972-B23, 834972-B24, 834972-B25, 834972-B26, 834972-B27, 834972-B28, 834973-B21, 834973-B22, 834973-B23, 834973-B24, 834973-B25, AJ716B, AJ717A, AP783A, AW538A, H6Z29A, JD093B, P9H29A, P9H32A, Q2R27A, Q2R31A, QK725A, R6B11A, R6B12A, R6B13A, R6B21A |
| 3 | RULE_2 | CONDITIONAL_VISIBILITY | Transceivers | Max quantity of product limited by space available. | 2 | JD095C, JD096C |


### Networking

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
Row 20: identical to sheet All SKUs, row 21.
Row 21: identical to sheet All SKUs, row 22.
Row 22: identical to sheet All SKUs, row 23.
Row 23: identical to sheet All SKUs, row 24.
Row 24: identical to sheet All SKUs, row 25.
Row 25: identical to sheet All SKUs, row 26.
Row 26: identical to sheet All SKUs, row 27.
Row 27: identical to sheet All SKUs, row 28.
Row 28: identical to sheet All SKUs, row 29.
Row 29: identical to sheet All SKUs, row 30.
Row 30: identical to sheet All SKUs, row 31.
Row 31: identical to sheet All SKUs, row 32.
Row 32: identical to sheet All SKUs, row 33.
Row 33: identical to sheet All SKUs, row 34.
Row 34: identical to sheet All SKUs, row 35.
Row 35: identical to sheet All SKUs, row 36.
Row 36: identical to sheet All SKUs, row 37.
Row 37: identical to sheet All SKUs, row 38.
Row 38: identical to sheet All SKUs, row 44.
Row 39: identical to sheet All SKUs, row 45.
Row 40: identical to sheet All SKUs, row 62.
Row 41: identical to sheet All SKUs, row 63.

### Chassis

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 2.

### Cables &amp; Enablement Kits

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 39.
Row 3: identical to sheet All SKUs, row 40.
Row 4: identical to sheet All SKUs, row 41.
Row 5: identical to sheet All SKUs, row 42.
Row 6: identical to sheet All SKUs, row 43.
Row 7: identical to sheet All SKUs, row 46.
Row 8: identical to sheet All SKUs, row 47.
Row 9: identical to sheet All SKUs, row 48.
Row 10: identical to sheet All SKUs, row 49.
Row 11: identical to sheet All SKUs, row 50.
Row 12: identical to sheet All SKUs, row 51.
Row 13: identical to sheet All SKUs, row 52.
Row 14: identical to sheet All SKUs, row 53.
Row 15: identical to sheet All SKUs, row 54.
Row 16: identical to sheet All SKUs, row 55.
Row 17: identical to sheet All SKUs, row 56.
Row 18: identical to sheet All SKUs, row 57.
Row 19: identical to sheet All SKUs, row 58.
Row 20: identical to sheet All SKUs, row 59.
Row 21: identical to sheet All SKUs, row 60.
Row 22: identical to sheet All SKUs, row 61.

### Metadata

| Original row | Column 1 | Column 2 |
| --- | --- | --- |
| 1 | Field | Value |
| 2 | Chassis | Synergy 4Port Frame Link Module |
| 3 | Scrape Date | 2026-11-12 |
| 4 | Source | OCA (Online Configuration Application) |
| 5 | Total Sub-Categories | 13 |
| 6 | Total Hardware SKUs | 62 |
| 7 | Total Service/Software SKUs | 0 |
| 8 | Total Combined SKUs | 62 |
| 9 | Chassis Variant Options | 1 |
| 10 | Total Rules | 47 |
| 11 | Unavailable DOM Rules | 2 |
| 12 | Total Tables | 9 |
| 13 | Diff Added SKUs | 0 |
| 14 | Diff Removed SKUs | 0 |
| 15 | Diff Price Changed | 0 |
| 16 | Diff Attr Changed | 0 |
| 17 | Diff Price+Attr Changed | 0 |
| 18 | Diff Reinstated SKUs | 0 |
| 19 | Diff Unchanged SKUs | 62 |
| 20 | Discontinued (All-Time) | 0 |
| 21 | Reinstated (All-Time) | 0 |
| 22 | Services JSON | outputs/Synergy/General/Synergy_4Port_Frame_Link_Module/Synergy_4Port_Frame_Link_Module_Services.json |
| 23 | Output Folder | outputs/Synergy/General/Synergy_4Port_Frame_Link_Module |


## Shared cell text

Bracketed TEXT identifiers above refer to these exact repeated values. The surrounding sheet, column and row determine applicability.

### TEXT_1

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":1751,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_2

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":1173,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_3

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":842,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_4

{"leadTime":"13","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":840,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_5

{"leadTime":"13","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2043,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_6

{"leadTime":"13","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":10394,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_7

Max quantity of product limited by space available. &#124; QK724A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+29 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_8

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":417,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_9

Max quantity of product limited by space available. &#124; R6B10A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+29 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_10

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":1946,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_11

Max quantity of product limited by space available. &#124; 834972-B21 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+29 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_12

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1250,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_13

Max quantity of product limited by space available. &#124; 834972-B22 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+29 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_14

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1251,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_15

Max quantity of product limited by space available. &#124; 834972-B23 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+29 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_16

Max quantity of product limited by space available. &#124; 834972-B24 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+29 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_17

Max quantity of product limited by space available. &#124; 834972-B25 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+29 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_18

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1272,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_19

Max quantity of product limited by space available. &#124; 834972-B26 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+29 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_20

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1364,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_21

Max quantity of product limited by space available. &#124; 834972-B27 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+29 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_22

Max quantity of product limited by space available. &#124; 834972-B28 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+29 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_23

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1575,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_24

Max quantity of product limited by space available. &#124; 834973-B21 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+29 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_25

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":263,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_26

Max quantity of product limited by space available. &#124; 834973-B22 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+29 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_27

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":247,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_28

Max quantity of product limited by space available. &#124; 834973-B23 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+29 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_29

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":273,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_30

Max quantity of product limited by space available. &#124; 834973-B24 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+29 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_31

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":287,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_32

Max quantity of product limited by space available. &#124; 834973-B25 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+29 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_33

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":335,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_34

Max quantity of product limited by space available. &#124; AJ716B conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+29 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_35

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":185,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_36

Max quantity of product limited by space available. &#124; AJ717A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+29 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_37

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1700,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_38

Max quantity of product limited by space available. &#124; AP783A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+29 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_39

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":2428,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_40

Max quantity of product limited by space available. &#124; AW538A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+29 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_41

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":6379,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_42

Max quantity of product limited by space available. &#124; H6Z29A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+29 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_43

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":7071,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_44

Max quantity of product limited by space available. &#124; JD093B conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+29 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_45

{"leadTime":"5","leadTimeUnit":"DAYS","lifecycleCanonical":"Obsolete","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"}

### TEXT_46

Max quantity of product limited by space available. &#124; P9H29A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+29 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_47

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":6100,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_48

Max quantity of product limited by space available. &#124; P9H32A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+29 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_49

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":2199,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_50

Max quantity of product limited by space available. &#124; Q2R27A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+29 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_51

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":19530,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_52

Max quantity of product limited by space available. &#124; Q2R31A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+29 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_53

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":50526,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_54

Max quantity of product limited by space available. &#124; QK725A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+29 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_55

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":3400,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_56

Max quantity of product limited by space available. &#124; R6B11A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+29 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_57

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":6614,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_58

Max quantity of product limited by space available. &#124; R6B12A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+29 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_59

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2691,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_60

Max quantity of product limited by space available. &#124; R6B13A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+29 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_61

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":8838,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_62

Max quantity of product limited by space available. &#124; R6B21A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+29 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_63

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":27508,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_64

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":285,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_65

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":327,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_66

{"leadTime":"13","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":430,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_67

{"leadTime":"13","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":314,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_68

{"leadTime":"13","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":346,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_69

Max quantity of product limited by space available. &#124; JD095C conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+1 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_70

{"leadTime":"13","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":199,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_71

Max quantity of product limited by space available. &#124; JD096C conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+1 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_72

{"leadTime":"13","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":220,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_73

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":65,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_74

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":115,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_75

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":208,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_76

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":253,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_77

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":70,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_78

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":95,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_79

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":162,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_80

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":415,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_81

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":130,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_82

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":147,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_83

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":195,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_84

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":239,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_85

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":65,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_86

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":113,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_87

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":113,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_88

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":427,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_89

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":426,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

