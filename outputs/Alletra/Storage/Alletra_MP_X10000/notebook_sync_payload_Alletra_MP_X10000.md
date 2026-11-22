# HPE Alletra_MP_X10000 — Synchronized Catalog Knowledge

**Target Product**: `Alletra_MP_X10000`

**Scope Identity**: `HPE/STORAGE/Alletra/Storage/Alletra_MP_X10000`

**Sync Timestamp**: 2026-11-22T08:59:58.199Z

**Total Verified SKUs**: `83` (`80` Hardware + `3` Services)

**Total Synced KnowledgeDeltas**: `22`

This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.

---

## 🚀 Executive Delta & Recent Change Summary

| Category | Total SKUs | Added (Last Scrape) | Price Changed | Attribute Changed | Price & Attr Changed | Reinstated | Status |
|----------|------------|---------------------|---------------|-------------------|----------------------|------------|--------|
| **Hardware Components** | 80 | 0 | 0 | 0 | 0 | 0 | **CERTIFIED** |
| **Support Services & SLAs** | 3 | 0 | 0 | 0 | 0 | 0 | **CERTIFIED** |
| **Total Portfolio** | **83** | **0** | **0** | **0** | **0** | **0** | **ACTIVE** |


## Configured child menus

ACTIVE_SCOPE_UNVERIFIED.  Other selector states require separate observation.

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

## 🏛️ 2. Family & Generation Rules (Alletra Storage)

*No verified family/generation rules are registered for this product.*

## 🎯 3. Chassis & Solution-Type Gotchas (Alletra_MP_X10000)

*No specific gotchas logged for Alletra_MP_X10000. Baseline chassis layout rules active.*

## 🔒 3b. Physical & Architectural Gating Rules (DOM Unavailable Tables)

### Base Chassis & Form Factor Compatibility Gates

1. **[Controller Node Models]**: No Mixing of Chassis
   - **Gated Rule Type**: `CHASSIS_GATE`
   - **Affected SKUs (1)**: `S0U32A`

### Component Mutual Exclusion Rules

1. **[Controller Node Models]**: B series nodes only supported for upgrades
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (2)**: `R7C71B`, `S3L11B`

2. **[Controller Node Models]**: TAA isSelected
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `S3L11A`

3. **[Power Supplies]**: No Mix PowerSupply
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (2)**: `R7C78A`, `R9Z97A`

4. **[Power Supplies]**: If single Phase or threePhase is selected then DC Power Cables not supported 1
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (2)**: `P22173-B21`, `P36877-B21`

5. **[Power Supplies]**: Breaker Panel can be selected only if R7C78A is selected
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (2)**: `G2H95A`, `Q9N54A`

6. **[Data Intelligent Node]**: If (S7V58A ) is selected, Then show the option to select S6A73C,S6W21C
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (2)**: `S6A73C_GPU`, `S6W21C_GPU`

7. **[Drive Enclosure]**: TAA isSelected
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `S0S46A`

8. **[Drive Enclosure]**: Max quantity of product limited by space available.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (2)**: `S2T35A`, `Q2F19A`

9. **[Drive Enclosure]**: Back-End Connectivity cables are not supported
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (8)**: `R9F76A`, `R9F79A`, `R9F80A`, `R9F81A`, `S1D25A`, `S1D26A`, `S1D27A`, `S1D28A`

10. **[Capacity]**: Max quantity of product class limited by space available.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (4)**: `R9H71B`, `R9H73B`, `R9H72B`, `S4P49A`

11. **[Capacity]**: Max quantity of product class limited by space available.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (3)**: `S0Q04B`, `S0Q03B`, `S0Q02B`

12. **[Capacity]**: Max quantity of product class limited by space available.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (5)**: `S1Z68A`, `R9H67A`, `R9H66A`, `R9H69A`, `R9H68A`

13. **[Capacity]**: Max quantity of product class limited by space available.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (3)**: `S4P40A`, `S3L74A`, `S3L73A`

14. **[Back-End Switches]**: If “acPowerFlag” is selected then S1S69A not supported
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `S1S69A`

## ⚠️ 4. Discontinued & Obsolete SKUs Registry

*No discontinued or reinstated SKUs detected for Alletra_MP_X10000. All cataloged SKUs are active.*

### ⏳ Impending Obsolescence & Clearance Hardware (90-Day to 180-Day Window)

*These components remain orderable in live configurators today but have published vendor end dates. They represent high-value clearance opportunities for immediate deployments, but require explicit procurement cutoff remarks before quotation:*

| Product # | Description | Category | List Price (USD) | Discontinued Date | Price Trend | Presales Strategy Guidance |
|---|---|---|---:|---|:---:|---|
| `K2Q21A` | HPE C-series 3M Passive Copper SFP+ Cable | Cables & Enablement Kits | $467 | 10/23/2026 | 0.00% | ⚠️ Approaching EOL (10/23/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `K2Q22A` | HPE C-series 5M Passive Copper SFP+ Cable | Cables & Enablement Kits | $535 | 10/23/2026 | 0.00% | ⚠️ Approaching EOL (10/23/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `QK701A` | HPE C-series SFP+ to SFP+ Active Copper 7.0m Direct Attach Cable | Cables & Enablement Kits | $1,216 | 10/23/2026 | 0.00% | ⚠️ Approaching EOL (10/23/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `S6X66A` | HPE Alletra Storage MP X10000 Solution for Commvault HyperScale Flex FIO Tracking | Accessories & Infrastructure | $1 | 04/30/2027 | 0.00% | ⚠️ Approaching EOL (04/30/2027). Valid for immediate builds; verify multi-year roadmaps. |

## 📊 5b. Category-Level Trends & Significant Price Adjustments

### Category Portfolio Delta & Planning Intelligence

| Category | Total SKUs | Added | Modified | Unchanged | Clearance / Drops | Category Planning Insight |
|---|---:|---:|---:|---:|---:|---|
| **Chassis** | 1 | 0 | 0 | 1 | 0 | Stable portfolio |
| **Accessories & Infrastructure** | 5 | 0 | 0 | 5 | 0 | Stable portfolio |
| **Storage Controllers** | 2 | 0 | 0 | 2 | 0 | Stable portfolio |
| **Power Supplies** | 5 | 0 | 0 | 5 | 0 | Stable portfolio |
| **Cables & Enablement Kits** | 41 | 0 | 0 | 41 | 0 | Stable portfolio |
| **Drive Enclosures / Drives** | 13 | 0 | 0 | 13 | 0 | Stable portfolio |
| **Networking** | 13 | 0 | 0 | 13 | 0 | Stable portfolio |

## 🔄 5. Recent Attribute & Specification Modifications Log

*No attribute or specification changes recorded across catalog snapshots.*

## 🧩 6. Same-Product CTO Variant Matrix

| Chassis Identifier | Product Family | Generation | Form Factor | CTO Base SKU |
|--------------------|----------------|------------|-------------|--------------|
| **Alletra_MP_X10000** | Alletra | Storage | Array | `S3L12A` |

### Structural Field & Evidence Coverage

- **Row Types**: BASE_SYSTEM: 1, HARDWARE_OPTION: 80, INTERNAL_CONFIGURATION: 1, SUPPORT_SERVICE: 1
- **Price States**: PRICED: 82, UNPRICED: 1
- **Lead-Time Measurement**: Numeric Days: 72, ETA Date Only: 0, Unpublished: 11
- **Visibility Coverage**: VISIBLE: 53, SELECTOR_HIDDEN: 30

## ⏱️ 10. Supply Chain & Delivery Lead Time Intelligence

### Confirmed Component Delivery SLAs

| Product # | Description | Category | Lead Time | Channel Status |
|---|---|---|---:|---|
| `R7C75A` | HPE Alletra Storage MP 10000 2U Chassis | Accessories & Infrastructure | 3 | Available |
| `R7C71A` | HPE Alletra Storage MP X10250 Controller Node | Storage Controllers | 3 | Available |
| `R7C71B` | HPE Alletra Storage MP X10250 Controller Node Field Upgrade | Storage Controllers | 3 | Not published by OCA |
| `R7C76A` | HPE Alletra Storage MP C14 1600W AC Power Supply | Power Supplies | 4 | Available |
| `R7C78A` | HPE Alletra Storage MP 1600W -48VDC Power Supply | Power Supplies | 4 | Not published by OCA |
| `R9Z97A` | HPE Alletra Storage MP C14 2200W AC Power Supply | Power Supplies | 14 | Not published by OCA |
| `R9R55A` | HPE C13 - Schuko 250V 10Amp EU Power Cord | Cables & Enablement Kits | 3 | Available |
| `R9S00A` | HPE C13 - C14 250V 10Amp Gray 1.4m WW Power Cord | Cables & Enablement Kits | 3 | Available |
| `R9R52A` | HPE C13 - C14 250V 10Amp Black 1.4m WW Power Cord | Cables & Enablement Kits | 8 | Available |
| `R9R53A` | HPE C13 - C14 250V 10Amp Black 1.37m IN Power Cord | Cables & Enablement Kits | 8 | Available |
| `R9R54A` | HPE C13 - AS3112 250V 10Amp AU Power Cord | Cables & Enablement Kits | 8 | Available |
| `R9R56A` | HPE C13 - BS1363 250V 10Amp UK Power Cord | Cables & Enablement Kits | 8 | Available |
| `R9R57A` | HPE C13 - NEMA 5-15P 250V 10Amp US Power Cord | Cables & Enablement Kits | 4 | Available |
| `R9R58A` | HPE C13 - GB2099 250V 10Amp CN Power Cord | Cables & Enablement Kits | 8 | Available |
| `R9R59A` | HPE C13 - JIS8303 125V 11Amp TW/JP Power Cord | Cables & Enablement Kits | 8 | Available |
| `R9R60A` | HPE C13 - JIS8303 6-15P 250V 12Amp JP Power Cord | Cables & Enablement Kits | 8 | Available |
| `R9R61A` | HPE C13 - IN1293 250V 16Amp IN Power Cord | Cables & Enablement Kits | 8 | Available |
| `R9R62A` | HPE C13 - SANS164-1 250V 16Amp ZA Power Cord | Cables & Enablement Kits | 8 | Available |
| `R9R63A` | HPE C13 - SI32 250V 16Amp IL Power Cord | Cables & Enablement Kits | 14 | Available |
| `R9R64A` | HPE C13 - CEI23-16 250V 10Amp IT Power Cord | Cables & Enablement Kits | 8 | Available |
| `R9R65A` | HPE C13 - WS-010A 250V 10Amp KR Power Cord | Cables & Enablement Kits | 8 | Available |
| `R9S01A` | HPE C13 - C14 250V 10Amp Gray 1.37m IN Power Cord | Cables & Enablement Kits | 8 | Available |
| `S3L68A` | HPE C13 - C14 250V 10Amp Black 2m WW Power Cord | Cables & Enablement Kits | 4 | Available |
| `S3L69A` | HPE C13 - C14 250V 10Amp Gray 2m WW Power Cord | Cables & Enablement Kits | 8 | Available |
| `S3L70A` | HPE C13 - C14 250V 10Amp Black 2m IN Power Cord | Cables & Enablement Kits | 8 | Available |
| `S3L71A` | HPE C13 - C14 250V 10Amp Gray 2m IN Power Cord | Cables & Enablement Kits | 8 | Available |
| `P22173-B21` | HPE 1600W -48VDC 600V 3.5m Power Cable Kit                       If single Phase or threePhase is selected then DC Power Cables not supported 3 | Power Supplies | 3 | Not published by OCA |
| `P36877-B21` | HPE 1600W -48VDC Power Cable Lug Kit                       If single Phase or threePhase is selected then DC Power Cables not supported 3 | Power Supplies | 3 | Not published by OCA |
| `G2H95A` | E-T-A S541 2x16 Output DC Breaker Panels | Accessories & Infrastructure | 4 | Not published by OCA |
| `Q9N54A` | E-T-A 6401 Two Grounding Bars w/ Screws | Accessories & Infrastructure | 4 | Not published by OCA |
*... [41 additional supply chain records omitted for brevity]*


<!-- MANAGED_FULL_CATALOG -->
Content fingerprint: b15e7db33cbf8029ff1e428b28d16f5a15bf04a8e1b1d7ff52dceced8da4f6fa

## Complete workbook text projection

Displayed cell values follow by sheet and original row. Formatting, charts and formulas remain in the Excel artifact. Repeated rows refer to the first identical row and schema; no content is replaced by a fingerprint.

### Category Summary

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Constraint | Min Qty | Max Qty | Total SKUs | Has Rules | Rule Count |
| 2 | Unknown | Power Level Options | required | 1 | Required | 0 | No | 0 |
| 3 | Unknown | Power Watt Options | required | 1 | Required | 0 | No | 0 |
| 4 | Power Cords | Power Cords Length | required | 1 | Required | 0 | No | 0 |
| 5 | Unknown | Installation Services | required | 1 | Required | 0 | No | 0 |
| 6 | Unknown | Node Chassis | max 8 | 0 | 8 | 0 | No | 0 |
| 7 | Unknown | Node | max 4 | 0 | 4 | 0 | No | 0 |
| 8 | Power Supplies | Power Supplies | max 4 | 0 | 4 | 1 | Yes | 1 |
| 9 | Power Supplies | Power Cord | max 8 | 0 | 8 | 0 | No | 0 |
| 10 | Power Supplies | Data Intelligent Node | max 3 | 0 | 3 | 0 | No | 0 |
| 11 | Power Supplies | Data Intelligence GPUs | no max | 0 | Unlimited | 0 | No | 0 |
| 12 | Power Supplies | Data Intelligence SaaS | max 5 | 0 | 5 | 0 | No | 0 |
| 13 | Power Supplies | Data protection accelerator node | no max | 0 | Unlimited | 0 | No | 0 |
| 14 | Power Supplies | Drive Enclosure | max 16 | 0 | 16 | 0 | No | 0 |
| 15 | Power Supplies | BlueTooth Connectivity Kit | max 1 | 0 | 1 | 0 | No | 0 |
| 16 | Power Supplies | Back-End Switches | max 2 | 0 | 2 | 0 | No | 0 |
| 17 | Power Supplies | Back-End Switch Rail Kits | max 8 | 0 | 8 | 0 | No | 0 |
| 18 | Cables | Management Cables | no max | 0 | Unlimited | 0 | No | 0 |
| 19 | Cables | DAC Cables | no max | 0 | Unlimited | 0 | No | 0 |
| 20 | Cables | Configuration Indicators | max 2 | 0 | 2 | 0 | No | 0 |
| 21 | Cables | Commvault Tracking SKU | max 1 | 0 | 1 | 0 | No | 0 |
| 22 | Chassis | Variants | min 1, max 1 — Active OCA CTO chassis | 1 | 1 | 1 | Yes | 1 |
| 23 | Accessories &amp; Infrastructure | Node Chassis | max 8 | 0 | 8 | 1 | Yes | 1 |
| 24 | Storage Controllers | Node | max 4 | 0 | 4 | 2 | Yes | 3 |
| 25 | Power Supplies | -48VDC Power Supplies &amp; Cable Kits | min 1, max 2 | 1 | 2 | 4 | Yes | 6 |
| 26 | Cables &amp; Enablement Kits | Power Cord | max 8 | 0 | 8 | 20 | Yes | 1 |
| 27 | Accessories &amp; Infrastructure | System Options | optional | 0 | Optional | 2 | Yes | 3 |
| 28 | Drive Enclosures / Drives | Drive Enclosure | max 16 | 0 | 16 | 13 | Yes | 16 |
| 29 | Networking | Optical Transceivers &amp; DAC Cables | max 8 | 0 | 8 | 10 | Yes | 12 |
| 30 | Accessories &amp; Infrastructure | BlueTooth Connectivity Kit | max 1 | 0 | 1 | 1 | Yes | 1 |
| 31 | Networking | Back-End Switches | max 2 | 0 | 2 | 3 | Yes | 3 |
| 32 | Cables &amp; Enablement Kits | Back-End Switch Rail Kits | max 8 | 0 | 8 | 1 | Yes | 1 |
| 33 | Cables &amp; Enablement Kits | Management Cables | no max | 0 | Unlimited | 4 | Yes | 1 |
| 34 | Cables &amp; Enablement Kits | DAC Cables | no max | 0 | Unlimited | 16 | Yes | 1 |
| 35 | Accessories &amp; Infrastructure | Commvault Tracking SKU | max 1 | 0 | 1 | 1 | Yes | 1 |
| 36 | Support Services | Configuration Indicators | max 2 | 0 | 2 | 3 | Yes | 1 |


### All SKUs

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |
| 2 | Chassis | Variants | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Chassis &gt; Variants | Base Chassis | min 1, max 1 | 1 | 1 | Select exactly one currently discoverable, non-TAA/non-GTA CTO base chassis | S3L12A | CTO | HPE Alletra Storage MP X10000 Base Configuration | 1 | $1.00 |  |  |  |  | No | Available in OCA product catalog | Unpublished |  | Unpublished | Not published by OCA | Valid | Active |  |  |  |
| 3 | Accessories &amp; Infrastructure | Node Chassis | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Accessories &amp; Infrastructure &gt; Node Chassis | Option Component | max 8 | 0 | 8 | Selection constraint for Node Chassis: max 8 | R7C75A | Standard | HPE Alletra Storage MP 10000 2U Chassis | 2 | $13,749.00 |  |  | $27,498.00 |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2029 | [TEXT_1] |
| 4 | Storage Controllers | Node | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Storage Controllers &gt; Node | Storage Controller | max 4 | 0 | 4 | Selection constraint for Node: max 4 | R7C71A | Standard | HPE Alletra Storage MP X10250 Controller Node | 0 | $403,464.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 11/18/2024 | 10/31/2028 | [TEXT_2] |
| 5 | Storage Controllers | Node | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Storage Controllers &gt; Node | Storage Controller | max 4 | 0 | 4 | [TEXT_3] | R7C71B | Standard | HPE Alletra Storage MP X10250 Controller Node Field Upgrade | 0 | $524,503.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/04/2025 | 10/31/2031 | [TEXT_4] |
| 6 | Power Supplies | Power Supplies | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Power Supplies &gt; Power Supplies | Power Supply | max 4 | 0 | 4 | Selection constraint for Power Supplies: max 4 | R7C76A | Standard | HPE Alletra Storage MP C14 1600W AC Power Supply | 4 | $2,327.00 |  |  | $9,308.00 |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_5] |
| 7 | Power Supplies | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Power Supplies &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | min 1, max 2 | 1 | 2 | [TEXT_6] | R7C78A | Standard | HPE Alletra Storage MP 1600W -48VDC Power Supply | 0 | $11,842.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/02/2023 | 12/31/2032 | [TEXT_7] |
| 8 | Power Supplies | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Power Supplies &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | min 1, max 2 | 1 | 2 | [TEXT_8] | R9Z97A | Standard | HPE Alletra Storage MP C14 2200W AC Power Supply | 0 | $3,332.00 |  |  | NA |  | No | Not published by OCA | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 10/02/2023 | 12/31/2032 | [TEXT_9] |
| 9 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | max 8 | 0 | 8 | Selection constraint for Power Cord: max 8 | R9R55A | Standard | HPE C13 - Schuko 250V 10Amp EU Power Cord | 0 | $64.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_10] |
| 10 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | max 8 | 0 | 8 | Selection constraint for Power Cord: max 8 | R9S00A | Standard | HPE C13 - C14 250V 10Amp Gray 1.4m WW Power Cord | 2 | $23.00 |  |  | $46.00 |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_11] |
| 11 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | max 8 | 0 | 8 | Selection constraint for Power Cord: max 8 | R9R52A | Standard | HPE C13 - C14 250V 10Amp Black 1.4m WW Power Cord | 2 | $83.00 |  |  | $166.00 |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_12] |
| 12 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | max 8 | 0 | 8 | Selection constraint for Power Cord: max 8 | R9R53A | Standard | HPE C13 - C14 250V 10Amp Black 1.37m IN Power Cord | 0 | $59.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_13] |
| 13 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | max 8 | 0 | 8 | Selection constraint for Power Cord: max 8 | R9R54A | Standard | HPE C13 - AS3112 250V 10Amp AU Power Cord | 0 | $196.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_14] |
| 14 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | max 8 | 0 | 8 | Selection constraint for Power Cord: max 8 | R9R56A | Standard | HPE C13 - BS1363 250V 10Amp UK Power Cord | 0 | $36.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_15] |
| 15 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | max 8 | 0 | 8 | Selection constraint for Power Cord: max 8 | R9R57A | Standard | HPE C13 - NEMA 5-15P 250V 10Amp US Power Cord | 0 | $21.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_16] |
| 16 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | max 8 | 0 | 8 | Selection constraint for Power Cord: max 8 | R9R58A | Standard | HPE C13 - GB2099 250V 10Amp CN Power Cord | 0 | $26.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_17] |
| 17 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | max 8 | 0 | 8 | Selection constraint for Power Cord: max 8 | R9R59A | Standard | HPE C13 - JIS8303 125V 11Amp TW/JP Power Cord | 0 | $148.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_18] |
| 18 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | max 8 | 0 | 8 | Selection constraint for Power Cord: max 8 | R9R60A | Standard | HPE C13 - JIS8303 6-15P 250V 12Amp JP Power Cord | 0 | $43.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_19] |
| 19 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | max 8 | 0 | 8 | Selection constraint for Power Cord: max 8 | R9R61A | Standard | HPE C13 - IN1293 250V 16Amp IN Power Cord | 0 | $61.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_20] |
| 20 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | max 8 | 0 | 8 | Selection constraint for Power Cord: max 8 | R9R62A | Standard | HPE C13 - SANS164-1 250V 16Amp ZA Power Cord | 0 | $21.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_21] |
| 21 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | max 8 | 0 | 8 | Selection constraint for Power Cord: max 8 | R9R63A | Standard | HPE C13 - SI32 250V 16Amp IL Power Cord | 0 | $24.00 |  |  | NA |  | No | Available | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_22] |
| 22 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | max 8 | 0 | 8 | Selection constraint for Power Cord: max 8 | R9R64A | Standard | HPE C13 - CEI23-16 250V 10Amp IT Power Cord | 0 | $29.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_23] |
| 23 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | max 8 | 0 | 8 | Selection constraint for Power Cord: max 8 | R9R65A | Standard | HPE C13 - WS-010A 250V 10Amp KR Power Cord | 0 | $31.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_24] |
| 24 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | max 8 | 0 | 8 | Selection constraint for Power Cord: max 8 | R9S01A | Standard | HPE C13 - C14 250V 10Amp Gray 1.37m IN Power Cord | 0 | $59.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_13] |
| 25 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | max 8 | 0 | 8 | Selection constraint for Power Cord: max 8 | S3L68A | Standard | HPE C13 - C14 250V 10Amp Black 2m WW Power Cord | 0 | $23.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 02/05/2024 | 12/31/2032 | [TEXT_25] |
| 26 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | max 8 | 0 | 8 | Selection constraint for Power Cord: max 8 | S3L69A | Standard | HPE C13 - C14 250V 10Amp Gray 2m WW Power Cord | 0 | $123.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 02/05/2024 | 12/31/2032 | [TEXT_26] |
| 27 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | max 8 | 0 | 8 | Selection constraint for Power Cord: max 8 | S3L70A | Standard | HPE C13 - C14 250V 10Amp Black 2m IN Power Cord | 0 | $76.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 02/05/2024 | 12/31/2032 | [TEXT_27] |
| 28 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | max 8 | 0 | 8 | Selection constraint for Power Cord: max 8 | S3L71A | Standard | HPE C13 - C14 250V 10Amp Gray 2m IN Power Cord | 0 | $72.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 02/05/2024 | 12/31/2032 | [TEXT_28] |
| 29 | Power Supplies | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Power Supplies &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | min 1, max 2 | 1 | 2 | [TEXT_29] | P22173-B21 | Standard | [TEXT_30] | 0 | $818.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 12/07/2020 | 07/31/2028 | [TEXT_31] |
| 30 | Power Supplies | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Power Supplies &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | min 1, max 2 | 1 | 2 | [TEXT_32] | P36877-B21 | Standard | [TEXT_33] | 0 | $135.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 12/07/2020 | 07/31/2029 | [TEXT_34] |
| 31 | Accessories &amp; Infrastructure | System Options | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Accessories &amp; Infrastructure &gt; System Options | Option Component | Optional | 0 | Optional | [TEXT_35] | G2H95A | Standard | E-T-A S541 2x16 Output DC Breaker Panels | 0 | $5,682.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 12/12/2013 | 11/30/2031 | [TEXT_36] |
| 32 | Accessories &amp; Infrastructure | System Options | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Accessories &amp; Infrastructure &gt; System Options | Option Component | Optional | 0 | Optional | [TEXT_37] | Q9N54A | Standard | E-T-A 6401 Two Grounding Bars w/ Screws | 0 | $196.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 12/01/2017 | 11/30/2031 | [TEXT_38] |
| 33 | Drive Enclosures / Drives | Drive Enclosure | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Drive Enclosures / Drives &gt; Drive Enclosure | Drive Cage / Drive | max 16 | 0 | 16 | Selection constraint for Drive Enclosure: max 16 | S1J10A | CTO | HPE Alletra Storage MP 10001 NVMe Configure-to-order Expansion Shelf | 0 | $19,654.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/02/2023 | 12/31/2032 | [TEXT_39] |
| 34 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 8 | 0 | 8 | [TEXT_40] | S2T35A | Standard | HPE Storage 100GbE QSFP28 SR4 Extended Temperature Pull Tab Transceiver | 0 | $3,299.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 02/05/2024 | 07/31/2029 | [TEXT_41] |
| 35 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 8 | 0 | 8 | [TEXT_42] | Q2F19A | Standard | HPE 100GbE QSFP28 SR4 100m Transceiver | 0 | $2,425.00 |  |  | NA |  | No | Not published by OCA | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 09/25/2017 | 12/31/2028 | [TEXT_43] |
| 36 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 8 | 0 | 8 | [TEXT_44] | R9F76A | Standard | HPE Aruba Networking 100G QSFP28 to QSFP28 2m Active Optical Cable | 0 | $2,649.00 |  |  | NA |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/06/2021 | 12/31/2029 | [TEXT_45] |
| 37 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 8 | 0 | 8 | [TEXT_46] | R9F79A | Standard | HPE Aruba Networking 100G QSFP28 to QSFP28 7m Active Optical Cable | 0 | $2,739.00 |  |  | NA |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/06/2021 | 12/31/2029 | [TEXT_47] |
| 38 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 8 | 0 | 8 | [TEXT_48] | R9F80A | Standard | HPE Aruba Networking 100G QSFP28 to QSFP28 15m Active Optical Cable | 0 | $2,959.00 |  |  | NA |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/06/2021 | 12/31/2029 | [TEXT_49] |
| 39 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 8 | 0 | 8 | [TEXT_50] | R9F81A | Standard | HPE Aruba Networking 100G QSFP28 to QSFP28 30m Active Optical Cable | 0 | $2,959.00 |  |  | NA |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/06/2021 | 12/31/2029 | [TEXT_49] |
| 40 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 8 | 0 | 8 | [TEXT_51] | S1D25A | Standard | HPE Aruba Networking 200G QSFP-DD to 2x QSFP28 100G 3m Active Optical Cable | 0 | $5,039.00 |  |  | NA |  | No | Not published by OCA | 78 | 78 | Constrained / Long Lead Time (&gt;45d) | OCA row attribute | Unpublished | Active | 02/06/2023 | 12/31/2029 | [TEXT_52] |
| 41 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 8 | 0 | 8 | [TEXT_53] | S1D26A | Standard | HPE Aruba Networking 200G QSFP-DD to 2x QSFP28 100G 7m Active Optical Cable | 0 | $5,039.00 |  |  | NA |  | No | Not published by OCA | 78 | 78 | Constrained / Long Lead Time (&gt;45d) | OCA row attribute | Unpublished | Active | 02/06/2023 | 12/31/2029 | [TEXT_52] |
| 42 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 8 | 0 | 8 | [TEXT_54] | S1D27A | Standard | HPE Aruba Networking 200G QSFP-DD to 2x QSFP28 100G 15m Active Optical Cable | 0 | $6,829.00 |  |  | NA |  | No | Not published by OCA | 78 | 78 | Constrained / Long Lead Time (&gt;45d) | OCA row attribute | Unpublished | Active | 02/06/2023 | 12/31/2029 | [TEXT_55] |
| 43 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 8 | 0 | 8 | [TEXT_56] | S1D28A | Standard | HPE Aruba Networking 200G QSFP-DD to 2x QSFP28 100G 30m Active Optical Cable | 0 | $6,829.00 |  |  | NA |  | No | Not published by OCA | 78 | 78 | Constrained / Long Lead Time (&gt;45d) | OCA row attribute | Unpublished | Active | 02/06/2023 | 12/31/2029 | [TEXT_55] |
| 44 | Drive Enclosures / Drives | Drive Enclosure | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Drive Enclosures / Drives &gt; Drive Enclosure | Drive Cage / Drive | max 16 | 0 | 16 | [TEXT_57] | R9H71B | Standard | HPE Alletra Storage MP 3.84TB NVMe Read Intensive FIPS 140-3 Encrypted SSD                       Max 24 drive supported | 0 | $58,713.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/04/2025 | 12/31/2029 | [TEXT_58] |
| 45 | Drive Enclosures / Drives | Drive Enclosure | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Drive Enclosures / Drives &gt; Drive Enclosure | Drive Cage / Drive | max 16 | 0 | 16 | [TEXT_59] | R9H73B | Standard | HPE Alletra Storage MP 15.36TB NVMe Read Intensive FIPS 140-3 Encrypted SSD                       Max 24 drive supported | 0 | $235,872.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/04/2025 | 12/31/2029 | [TEXT_60] |
| 46 | Drive Enclosures / Drives | Drive Enclosure | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Drive Enclosures / Drives &gt; Drive Enclosure | Drive Cage / Drive | max 16 | 0 | 16 | [TEXT_61] | R9H72B | Standard | HPE Alletra Storage MP 7.68TB NVMe Read Intensive FIPS 140-3 Encrypted SSD                       Max 24 drive supported | 0 | $131,890.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/04/2025 | 12/31/2029 | [TEXT_62] |
| 47 | Drive Enclosures / Drives | Drive Enclosure | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Drive Enclosures / Drives &gt; Drive Enclosure | Drive Cage / Drive | max 16 | 0 | 16 | [TEXT_63] | S4P49A | Standard | HPE Alletra Storage MP 30.72TB NVMe SFF FIPS Encrypted SSD                       Max 24 drive supported | 0 | $376,435.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 06/02/2025 | 01/31/2028 | [TEXT_64] |
| 48 | Drive Enclosures / Drives | Drive Enclosure | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Drive Enclosures / Drives &gt; Drive Enclosure | Drive Cage / Drive | max 16 | 0 | 16 | [TEXT_65] | S1Z68A | Standard | HPE Alletra Storage MP 30.72TB NVMe SFF Self-encrypting SSD                       Max 24 drive supported | 0 | $342,214.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 11/30/2023 | 01/31/2028 | [TEXT_66] |
| 49 | Drive Enclosures / Drives | Drive Enclosure | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Drive Enclosures / Drives &gt; Drive Enclosure | Drive Cage / Drive | max 16 | 0 | 16 | [TEXT_67] | R9H67A | Standard | HPE Alletra Storage MP 3.84TB NVMe SFF Self-encrypting SSD                       Max 24 drive supported | 0 | $53,373.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 01/08/2024 | 12/31/2029 | [TEXT_68] |
| 50 | Drive Enclosures / Drives | Drive Enclosure | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Drive Enclosures / Drives &gt; Drive Enclosure | Drive Cage / Drive | max 16 | 0 | 16 | [TEXT_69] | R9H66A | Standard | HPE Alletra Storage MP 1.92TB NVMe SFF Self-encrypting SSD                       Max 24 drive supported | 0 | $36,109.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 01/08/2024 | 12/31/2029 | [TEXT_70] |
| 51 | Drive Enclosures / Drives | Drive Enclosure | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Drive Enclosures / Drives &gt; Drive Enclosure | Drive Cage / Drive | max 16 | 0 | 16 | [TEXT_71] | R9H69A | Standard | HPE Alletra Storage MP 15.36TB NVMe SFF Self-encrypting SSD                       Max 24 drive supported | 0 | $214,426.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 01/08/2024 | 12/31/2029 | [TEXT_72] |
| 52 | Drive Enclosures / Drives | Drive Enclosure | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Drive Enclosures / Drives &gt; Drive Enclosure | Drive Cage / Drive | max 16 | 0 | 16 | [TEXT_73] | R9H68A | Standard | HPE Alletra Storage MP 7.68TB NVMe SFF Self-encrypting SSD                       Max 24 drive supported | 0 | $119,901.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 01/08/2024 | 12/31/2029 | [TEXT_74] |
| 53 | Drive Enclosures / Drives | Drive Enclosure | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Drive Enclosures / Drives &gt; Drive Enclosure | Drive Cage / Drive | max 16 | 0 | 16 | [TEXT_75] | S4P40A | Standard | HPE Alletra Storage MP 61.44TB NVMe SFF QLC SSD                       Max 24 drive supported | 0 | $420,983.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 06/02/2025 | 09/30/2027 | [TEXT_76] |
| 54 | Drive Enclosures / Drives | Drive Enclosure | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Drive Enclosures / Drives &gt; Drive Enclosure | Drive Cage / Drive | max 16 | 0 | 16 | [TEXT_77] | S3L74A | Standard | HPE Alletra Storage MP 30.72TB NVMe SFF QLC SSD                       Max 24 drive supported | 0 | $241,214.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/07/2024 | 09/30/2027 | [TEXT_78] |
| 55 | Drive Enclosures / Drives | Drive Enclosure | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Drive Enclosures / Drives &gt; Drive Enclosure | Drive Cage / Drive | max 16 | 0 | 16 | [TEXT_79] | S3L73A | Standard | HPE Alletra Storage MP 15.36TB NVMe SFF QLC SSD                       Max 24 drive supported | 0 | $126,796.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/07/2024 | 09/30/2027 | [TEXT_80] |
| 56 | Accessories &amp; Infrastructure | BlueTooth Connectivity Kit | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Accessories &amp; Infrastructure &gt; BlueTooth Connectivity Kit | Option Component | max 1 | 0 | 1 | Selection constraint for BlueTooth Connectivity Kit: max 1 | S0U79A | Standard | HPE Alletra Storage MP CDM Bluetooth Connect Kit | 1 | $197.00 |  |  | $197.00 |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_81] |
| 57 | Networking | Back-End Switches | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Networking &gt; Back-End Switches | Network Switch | max 2 | 0 | 2 | Selection constraint for Back-End Switches: max 2 | S1R08A | Standard | HPE Alletra Storage MP 32-port 100GbE Switch Bundle | 0 | $43,467.00 |  |  | NA |  | No | Available | 5 | 5 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 03/31/2040 | [TEXT_82] |
| 58 | Networking | Back-End Switches | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Networking &gt; Back-End Switches | Network Switch | max 2 | 0 | 2 | Selection constraint for Back-End Switches: max 2 | S6L90A | Standard | HPE Alletra Storage MP 9300-32D 32-port 400Gb Switch Bundle | 0 | $128,140.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/06/2026 | 12/31/2032 | [TEXT_83] |
| 59 | Networking | Back-End Switches | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Networking &gt; Back-End Switches | Network Switch | max 2 | 0 | 2 | [TEXT_84] | S1S69A | Standard | HPE Alletra Storage MP 32-port 100GbE -48VDC Switch Bundle | 0 | $49,176.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 02/05/2024 | 03/31/2040 | [TEXT_85] |
| 60 | Cables &amp; Enablement Kits | Back-End Switch Rail Kits | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; Back-End Switch Rail Kits | Cable Kit | max 8 | 0 | 8 | Selection constraint for Back-End Switch Rail Kits: max 8 | S0A95A | Standard | HPE Switch Pair Installation Kit with 4U Cable Tray | 0 | $3,075.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_86] |
| 61 | Cables &amp; Enablement Kits | Management Cables | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; Management Cables | Cable Kit | Unlimited | 0 | Unlimited | Selection constraint for Management Cables: no max | C7535A | Standard | HPE RJ45 to RJ45 Cat5e Black M/M 7.6ft 1-pack Data Cable | 0 | $20.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/01/2001 | 08/31/2027 | [TEXT_87] |
| 62 | Cables &amp; Enablement Kits | Management Cables | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; Management Cables | Cable Kit | Unlimited | 0 | Unlimited | Selection constraint for Management Cables: no max | C7536A | Standard | HPE 4.3m/14ft CAT5 RJ45 M/M Ethernet Cable | 0 | $21.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 03/01/2001 | 08/31/2027 | [TEXT_88] |
| 63 | Cables &amp; Enablement Kits | Management Cables | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; Management Cables | Cable Kit | Unlimited | 0 | Unlimited | Selection constraint for Management Cables: no max | C7537A | Standard | HPE 7.6m/25ft CAT5 RJ45 M/M Ethernet Cable | 0 | $46.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/01/2001 | 08/31/2027 | [TEXT_89] |
| 64 | Cables &amp; Enablement Kits | Management Cables | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; Management Cables | Cable Kit | Unlimited | 0 | Unlimited | Selection constraint for Management Cables: no max | C7542A | Standard | HPE 15.2m/50ft CAT5 RJ45 M/M Ethernet Cable | 0 | $86.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/01/2001 | 08/31/2027 | [TEXT_90] |
| 65 | Cables &amp; Enablement Kits | DAC Cables | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; DAC Cables | Transceiver | Unlimited | 0 | Unlimited | Selection constraint for DAC Cables: no max | 487655-B21 | Standard | HPE BladeSystem c-Class 10GbE SFP+ to SFP+ 3m Direct Attach Copper Cable | 0 | $285.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 12/01/2008 | 08/30/2027 | [TEXT_91] |
| 66 | Cables &amp; Enablement Kits | DAC Cables | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; DAC Cables | Transceiver | Unlimited | 0 | Unlimited | Selection constraint for DAC Cables: no max | 537963-B21 | Standard | HPE BladeSystem c-Class 10GbE SFP+ to SFP+ 5m Direct Attach Copper Cable | 0 | $327.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/14/2009 | 08/30/2027 | [TEXT_92] |
| 67 | Cables &amp; Enablement Kits | DAC Cables | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; DAC Cables | Transceiver | Unlimited | 0 | Unlimited | Selection constraint for DAC Cables: no max | 844477-B21 | Standard | HPE 25Gb SFP28 to SFP28 3m Direct Attach Copper Cable | 0 | $392.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 06/06/2016 | 08/31/2027 | [TEXT_93] |
| 68 | Cables &amp; Enablement Kits | DAC Cables | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; DAC Cables | Transceiver | Unlimited | 0 | Unlimited | Selection constraint for DAC Cables: no max | 844483-B21 | Standard | HPE 25Gb SFP28 to SFP28 7m Active Optical Cable | 0 | $2,451.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 12/03/2018 | 08/30/2027 | [TEXT_94] |
| 69 | Cables &amp; Enablement Kits | DAC Cables | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; DAC Cables | Transceiver | Unlimited | 0 | Unlimited | Selection constraint for DAC Cables: no max | 845416-B21 | Standard | HPE 100Gb QSFP28 to 4x25Gb SFP28 3m Direct Attach Copper Cable | 0 | $916.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 06/06/2016 | 08/31/2028 | [TEXT_95] |
| 70 | Cables &amp; Enablement Kits | DAC Cables | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; DAC Cables | Transceiver | Unlimited | 0 | Unlimited | Selection constraint for DAC Cables: no max | J9283D | Standard | HPE Aruba Networking 10G SFP+ to SFP+ 3m Direct Attach Copper Cable | 0 | $315.00 |  |  | NA |  | No | Available | 13 | 13 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 12/04/2017 | 12/31/2099 | [TEXT_96] |
| 71 | Cables &amp; Enablement Kits | DAC Cables | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; DAC Cables | Transceiver | Unlimited | 0 | Unlimited | Selection constraint for DAC Cables: no max | J9285D | Standard | HPE Aruba Networking 10G SFP+ to SFP+ 7m Direct Attach Copper Cable | 0 | $430.00 |  |  | NA |  | No | Available | 13 | 13 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 12/04/2017 | 12/31/2099 | [TEXT_97] |
| 72 | Cables &amp; Enablement Kits | DAC Cables | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; DAC Cables | Transceiver | Unlimited | 0 | Unlimited | Selection constraint for DAC Cables: no max | JD097C | Standard | HPE Networking X240 10G SFP+ SFP+ 3m DAC Cable | 0 | $314.00 |  |  | NA |  | No | Available | 13 | 13 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/14/2012 | 12/31/2099 | [TEXT_98] |
| 73 | Cables &amp; Enablement Kits | DAC Cables | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; DAC Cables | Transceiver | Unlimited | 0 | Unlimited | Selection constraint for DAC Cables: no max | JG081C | Standard | HPE Networking X240 10G SFP+ SFP+ 5m DAC Cable | 0 | $346.00 |  |  | NA |  | No | Available | 13 | 13 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/14/2012 | 12/31/2099 | [TEXT_99] |
| 74 | Cables &amp; Enablement Kits | DAC Cables | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; DAC Cables | Transceiver | Unlimited | 0 | Unlimited | Selection constraint for DAC Cables: no max | JG330A | Standard | HPE Networking Comware X240 40G QSFP+ to 4x10G SFP+ 3m Direct Attach Copper Splitter Cable | 0 | $850.00 |  |  | NA |  | No | Available | 13 | 13 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 02/13/2012 | 12/31/2099 | [TEXT_100] |
| 75 | Cables &amp; Enablement Kits | DAC Cables | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; DAC Cables | Transceiver | Unlimited | 0 | Unlimited | Selection constraint for DAC Cables: no max | JG331A | Standard | HPE Networking Comware X240 40G QSFP+ to 4x10G SFP+ 5m Direct Attach Copper Splitter Cable | 0 | $986.00 |  |  | NA |  | No | Available | 13 | 13 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 02/13/2012 | 12/31/2099 | [TEXT_101] |
| 76 | Cables &amp; Enablement Kits | DAC Cables | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; DAC Cables | Transceiver | Unlimited | 0 | Unlimited | Selection constraint for DAC Cables: no max | K2Q21A | Standard | HPE C-series 3M Passive Copper SFP+ Cable | 0 | $467.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/01/2014 | 10/23/2026 | [TEXT_102] |
| 77 | Cables &amp; Enablement Kits | DAC Cables | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; DAC Cables | Transceiver | Unlimited | 0 | Unlimited | Selection constraint for DAC Cables: no max | K2Q22A | Standard | HPE C-series 5M Passive Copper SFP+ Cable | 0 | $535.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/01/2014 | 10/23/2026 | [TEXT_103] |
| 78 | Cables &amp; Enablement Kits | DAC Cables | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; DAC Cables | Transceiver | Unlimited | 0 | Unlimited | Selection constraint for DAC Cables: no max | Q9S67A | Standard | HPE 25GbE SFP28 to SFP28 3m Smart Active Optical Cable | 0 | $975.00 |  |  | NA |  | No | Available | 49 | 49 | Constrained / Long Lead Time (&gt;45d) | OCA row attribute | Unpublished | Active | 09/04/2018 | 12/31/2028 | [TEXT_104] |
| 79 | Cables &amp; Enablement Kits | DAC Cables | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; DAC Cables | Transceiver | Unlimited | 0 | Unlimited | Selection constraint for DAC Cables: no max | Q9S68A | Standard | HPE 25GbE SFP28 to SFP28 5m Smart Active Optical Cable | 0 | $1,075.00 |  |  | NA |  | No | Available | 35 | 35 | Extended Schedule (31-45d) | OCA row attribute | Unpublished | Active | 09/04/2018 | 12/31/2028 | [TEXT_105] |
| 80 | Cables &amp; Enablement Kits | DAC Cables | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Cables &amp; Enablement Kits &gt; DAC Cables | Transceiver | Unlimited | 0 | Unlimited | Selection constraint for DAC Cables: no max | QK701A | Standard | HPE C-series SFP+ to SFP+ Active Copper 7.0m Direct Attach Cable | 0 | $1,216.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/09/2011 | 10/23/2026 | [TEXT_106] |
| 81 | Accessories &amp; Infrastructure | Commvault Tracking SKU | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Accessories &amp; Infrastructure &gt; Commvault Tracking SKU | Chassis Infrastructure | max 1 | 0 | 1 | Selection constraint for Commvault Tracking SKU: max 1 | S6X66A | Standard | HPE Alletra Storage MP X10000 Solution for Commvault HyperScale Flex FIO Tracking | 0 | $1.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/01/2025 | 04/30/2027 | [TEXT_107] |


### Chassis Variants

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Product # | Form Factor | Description | Option Type | HPE Recommended | List Price (USD) | Constraint | Start Date | Discontinued Date | Note |
| 2 | S3L12A | Unknown | HPE Alletra Storage MP X10000 Base Configuration | CTO | No | $1.00 | min 1, max 1 |  | Unknown | Select ONE chassis variant as the mandatory CTO base. All component rules, drive bay limits, and power constraints depend on this selection. |


### Chassis Options Matrix

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Base SKU | Form Factor | Option Type | HPE Recommended | List Price (USD) | Drive Media Supported | Base Drive Bays | Max Expandability | Power Envelope | Lifecycle Status | Start Date | Discontinued Date | Architectural Rules |
| 2 | S3L12A | Unknown | CTO | No | $1.00 | UNVERIFIED — variant-specific evidence required | UNVERIFIED — title is not a bay inventory | UNVERIFIED — variant-specific evidence required | UNVERIFIED — variant-specific evidence required | Active |  | Unknown | NOT VERIFIED: do not transfer compatibility or rules between base SKUs without scoped vendor evidence. |


### Rules &amp; Constraints

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 |
| --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Constraint | Rule Type | Rule Text |
| 2 | Unknown | Power Level Options | min 1, Required | Quantity Constraint | Quantity: min 1, Required |
| 3 | Unknown | Power Watt Options | min 1, Required | Quantity Constraint | Quantity: min 1, Required |
| 4 | Power Cords | Power Cords Length | min 1, Required | Quantity Constraint | Quantity: min 1, Required |
| 5 | Unknown | Installation Services | min 1, Required | Quantity Constraint | Quantity: min 1, Required |
| 6 | Unknown | Node Chassis | max 8 | Quantity Constraint | Quantity: max 8 |
| 7 | Unknown | Node | max 4 | Quantity Constraint | Quantity: max 4 |
| 8 | Power Supplies | Power Supplies | max 4 | Quantity Constraint | Quantity: max 4 |
| 9 | Power Supplies | Power Cord | max 8 | Quantity Constraint | Quantity: max 8 |
| 10 | Power Supplies | Data Intelligent Node | max 3 | Quantity Constraint | Quantity: max 3 |
| 11 | Power Supplies | Data Intelligence GPUs | Unlimited | Quantity Constraint | Quantity: Unlimited |
| 12 | Power Supplies | Data Intelligence SaaS | max 5 | Quantity Constraint | Quantity: max 5 |
| 13 | Power Supplies | Data protection accelerator node | Unlimited | Quantity Constraint | Quantity: Unlimited |
| 14 | Power Supplies | Drive Enclosure | max 16 | Quantity Constraint | Quantity: max 16 |
| 15 | Power Supplies | BlueTooth Connectivity Kit | max 1 | Quantity Constraint | Quantity: max 1 |
| 16 | Power Supplies | Back-End Switches | max 2 | Quantity Constraint | Quantity: max 2 |
| 17 | Power Supplies | Back-End Switch Rail Kits | max 8 | Quantity Constraint | Quantity: max 8 |
| 18 | Cables | Management Cables | Unlimited | Quantity Constraint | Quantity: Unlimited |
| 19 | Cables | DAC Cables | Unlimited | Quantity Constraint | Quantity: Unlimited |
| 20 | Cables | Configuration Indicators | max 2 | Quantity Constraint | Quantity: max 2 |
| 21 | Cables | Commvault Tracking SKU | max 1 | Quantity Constraint | Quantity: max 1 |
| 22 | Chassis | Variants | min 1, max 1 — Active OCA CTO chassis | Configuration Rule | Select exactly one currently discoverable, non-TAA/non-GTA CTO base chassis |
| 23 | Accessories &amp; Infrastructure | Node Chassis | max 8 | Configuration Rule | Selection constraint for Node Chassis: max 8 |
| 24 | Storage Controllers | Node | max 4 | Configuration Rule | Selection constraint for Node: max 4 |
| 25 | Storage Controllers | Node | max 4 | Configuration Rule | B series nodes only supported for upgrades |
| 26 | Storage Controllers | Node | max 4 | Configuration Rule | R7C71B conditional visibility: portal selector activation required (B series nodes only supported for upgrades); PORTAL_CONDITIONAL |
| 27 | Power Supplies | Power Supplies | max 4 | Configuration Rule | Selection constraint for Power Supplies: max 4 |
| 28 | Power Supplies | -48VDC Power Supplies &amp; Cable Kits | min 1, max 2 | Configuration Rule | No Mix PowerSupply |
| 29 | Power Supplies | -48VDC Power Supplies &amp; Cable Kits | min 1, max 2 | Configuration Rule | R7C78A conditional visibility: portal selector activation required (No Mix PowerSupply); PORTAL_CONDITIONAL |
| 30 | Power Supplies | -48VDC Power Supplies &amp; Cable Kits | min 1, max 2 | Configuration Rule | R9Z97A conditional visibility: portal selector activation required (No Mix PowerSupply); PORTAL_CONDITIONAL |
| 31 | Cables &amp; Enablement Kits | Power Cord | max 8 | Configuration Rule | Selection constraint for Power Cord: max 8 |
| 32 | Power Supplies | -48VDC Power Supplies &amp; Cable Kits | min 1, max 2 | Configuration Rule | If single Phase or threePhase is selected then DC Power Cables not supported 1 |
| 33 | Power Supplies | -48VDC Power Supplies &amp; Cable Kits | min 1, max 2 | Configuration Rule | P22173-B21 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 1); PORTAL_CONDITIONAL |
| 34 | Power Supplies | -48VDC Power Supplies &amp; Cable Kits | min 1, max 2 | Configuration Rule | P36877-B21 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 1); PORTAL_CONDITIONAL |
| 35 | Accessories &amp; Infrastructure | System Options | optional | Configuration Rule | Breaker Panel can be selected only if R7C78A is selected |
| 36 | Accessories &amp; Infrastructure | System Options | optional | Configuration Rule | G2H95A conditional visibility: portal selector activation required (Breaker Panel can be selected only if R7C78A is selected); PORTAL_CONDITIONAL |
| 37 | Accessories &amp; Infrastructure | System Options | optional | Configuration Rule | Q9N54A conditional visibility: portal selector activation required (Breaker Panel can be selected only if R7C78A is selected); PORTAL_CONDITIONAL |
| 38 | Drive Enclosures / Drives | Drive Enclosure | max 16 | Configuration Rule | Selection constraint for Drive Enclosure: max 16 |
| 39 | Networking | Optical Transceivers &amp; DAC Cables | max 8 | Configuration Rule | Max quantity of product limited by space available. |
| 40 | Networking | Optical Transceivers &amp; DAC Cables | max 8 | Configuration Rule | S2T35A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 41 | Networking | Optical Transceivers &amp; DAC Cables | max 8 | Configuration Rule | Q2F19A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 42 | Networking | Optical Transceivers &amp; DAC Cables | max 8 | Configuration Rule | Back-End Connectivity cables are not supported |
| 43 | Networking | Optical Transceivers &amp; DAC Cables | max 8 | Configuration Rule | R9F76A conditional visibility: portal selector activation required (Back-End Connectivity cables are not supported); PORTAL_CONDITIONAL |
| 44 | Networking | Optical Transceivers &amp; DAC Cables | max 8 | Configuration Rule | R9F79A conditional visibility: portal selector activation required (Back-End Connectivity cables are not supported); PORTAL_CONDITIONAL |
| 45 | Networking | Optical Transceivers &amp; DAC Cables | max 8 | Configuration Rule | R9F80A conditional visibility: portal selector activation required (Back-End Connectivity cables are not supported); PORTAL_CONDITIONAL |
| 46 | Networking | Optical Transceivers &amp; DAC Cables | max 8 | Configuration Rule | R9F81A conditional visibility: portal selector activation required (Back-End Connectivity cables are not supported); PORTAL_CONDITIONAL |
| 47 | Networking | Optical Transceivers &amp; DAC Cables | max 8 | Configuration Rule | S1D25A conditional visibility: portal selector activation required (Back-End Connectivity cables are not supported); PORTAL_CONDITIONAL |
| 48 | Networking | Optical Transceivers &amp; DAC Cables | max 8 | Configuration Rule | S1D26A conditional visibility: portal selector activation required (Back-End Connectivity cables are not supported); PORTAL_CONDITIONAL |
| 49 | Networking | Optical Transceivers &amp; DAC Cables | max 8 | Configuration Rule | S1D27A conditional visibility: portal selector activation required (Back-End Connectivity cables are not supported); PORTAL_CONDITIONAL |
| 50 | Networking | Optical Transceivers &amp; DAC Cables | max 8 | Configuration Rule | S1D28A conditional visibility: portal selector activation required (Back-End Connectivity cables are not supported); PORTAL_CONDITIONAL |
| 51 | Drive Enclosures / Drives | Drive Enclosure | max 16 | Configuration Rule | Max quantity of product class limited by space available. |
| 52 | Drive Enclosures / Drives | Drive Enclosure | max 16 | Configuration Rule | R9H71B conditional visibility: portal selector activation required (Max quantity of product class limited by space available.); PORTAL_CONDITIONAL |
| 53 | Drive Enclosures / Drives | Drive Enclosure | max 16 | Configuration Rule | R9H73B conditional visibility: portal selector activation required (Max quantity of product class limited by space available.); PORTAL_CONDITIONAL |
| 54 | Drive Enclosures / Drives | Drive Enclosure | max 16 | Configuration Rule | R9H72B conditional visibility: portal selector activation required (Max quantity of product class limited by space available.); PORTAL_CONDITIONAL |
| 55 | Drive Enclosures / Drives | Drive Enclosure | max 16 | Configuration Rule | S4P49A conditional visibility: portal selector activation required (Max quantity of product class limited by space available.); PORTAL_CONDITIONAL |
| 56 | Drive Enclosures / Drives | Drive Enclosure | max 16 | Configuration Rule | S1Z68A conditional visibility: portal selector activation required (Max quantity of product class limited by space available.); PORTAL_CONDITIONAL |
| 57 | Drive Enclosures / Drives | Drive Enclosure | max 16 | Configuration Rule | R9H67A conditional visibility: portal selector activation required (Max quantity of product class limited by space available.); PORTAL_CONDITIONAL |
| 58 | Drive Enclosures / Drives | Drive Enclosure | max 16 | Configuration Rule | R9H66A conditional visibility: portal selector activation required (Max quantity of product class limited by space available.); PORTAL_CONDITIONAL |
| 59 | Drive Enclosures / Drives | Drive Enclosure | max 16 | Configuration Rule | R9H69A conditional visibility: portal selector activation required (Max quantity of product class limited by space available.); PORTAL_CONDITIONAL |
| 60 | Drive Enclosures / Drives | Drive Enclosure | max 16 | Configuration Rule | R9H68A conditional visibility: portal selector activation required (Max quantity of product class limited by space available.); PORTAL_CONDITIONAL |
| 61 | Drive Enclosures / Drives | Drive Enclosure | max 16 | Configuration Rule | S4P40A conditional visibility: portal selector activation required (Max quantity of product class limited by space available.); PORTAL_CONDITIONAL |
| 62 | Drive Enclosures / Drives | Drive Enclosure | max 16 | Configuration Rule | S3L74A conditional visibility: portal selector activation required (Max quantity of product class limited by space available.); PORTAL_CONDITIONAL |
| 63 | Drive Enclosures / Drives | Drive Enclosure | max 16 | Configuration Rule | S3L73A conditional visibility: portal selector activation required (Max quantity of product class limited by space available.); PORTAL_CONDITIONAL |
| 64 | Accessories &amp; Infrastructure | BlueTooth Connectivity Kit | max 1 | Configuration Rule | Selection constraint for BlueTooth Connectivity Kit: max 1 |
| 65 | Networking | Back-End Switches | max 2 | Configuration Rule | Selection constraint for Back-End Switches: max 2 |
| 66 | Networking | Back-End Switches | max 2 | Configuration Rule | If “acPowerFlag” is selected then S1S69A not supported |
| 67 | Networking | Back-End Switches | max 2 | Configuration Rule | S1S69A conditional visibility: portal selector activation required (If “acPowerFlag” is selected then S1S69A not supported); PORTAL_CONDITIONAL |
| 68 | Cables &amp; Enablement Kits | Back-End Switch Rail Kits | max 8 | Configuration Rule | Selection constraint for Back-End Switch Rail Kits: max 8 |
| 69 | Cables &amp; Enablement Kits | Management Cables | no max | Configuration Rule | Selection constraint for Management Cables: no max |
| 70 | Cables &amp; Enablement Kits | DAC Cables | no max | Configuration Rule | Selection constraint for DAC Cables: no max |
| 71 | Accessories &amp; Infrastructure | Commvault Tracking SKU | max 1 | Configuration Rule | Selection constraint for Commvault Tracking SKU: max 1 |
| 72 | Support Services | Configuration Indicators | max 2 | Configuration Rule | Selection constraint for Configuration Indicators: max 2 |
| 73 | Controller Node Models | Configuration Rules | No Mixing of Chassis | Learned Feedback Rule | [CHASSIS_GATE] No Mixing of Chassis |
| 74 | Controller Node Models | Configuration Rules | B series nodes only supported for upgrades | Learned Feedback Rule | [MUTUAL_EXCLUSION] B series nodes only supported for upgrades |
| 75 | Controller Node Models | Configuration Rules | TAA isSelected | Learned Feedback Rule | [MUTUAL_EXCLUSION] TAA isSelected |
| 76 | Power Supplies | Configuration Rules | No Mix PowerSupply | Learned Feedback Rule | [MUTUAL_EXCLUSION] No Mix PowerSupply |
| 77 | Power Supplies | Configuration Rules | If single Phase or threePhase is selected then DC Power Cables not supported 1 | Learned Feedback Rule | [MUTUAL_EXCLUSION] If single Phase or threePhase is selected then DC Power Cables not supported 1 |
| 78 | Power Supplies | Configuration Rules | Breaker Panel can be selected only if R7C78A is selected | Learned Feedback Rule | [MUTUAL_EXCLUSION] Breaker Panel can be selected only if R7C78A is selected |
| 79 | Data Intelligent Node | Configuration Rules | If (S7V58A ) is selected, Then show the option to select S6A73C,S6W21C | Learned Feedback Rule | [MUTUAL_EXCLUSION] If (S7V58A ) is selected, Then show the option to select S6A73C,S6W21C |
| 80 | Drive Enclosure | Configuration Rules | TAA isSelected | Learned Feedback Rule | [MUTUAL_EXCLUSION] TAA isSelected |
| 81 | Drive Enclosure | Configuration Rules | Max quantity of product limited by space available. | Learned Feedback Rule | [MUTUAL_EXCLUSION] Max quantity of product limited by space available. |
| 82 | Drive Enclosure | Configuration Rules | Back-End Connectivity cables are not supported | Learned Feedback Rule | [MUTUAL_EXCLUSION] Back-End Connectivity cables are not supported |
| 83 | Capacity | Configuration Rules | Max quantity of product class limited by space available. | Learned Feedback Rule | [MUTUAL_EXCLUSION] Max quantity of product class limited by space available. |
| 84 | Back-End Switches | Configuration Rules | If “acPowerFlag” is selected then S1S69A not supported | Learned Feedback Rule | [MUTUAL_EXCLUSION] If “acPowerFlag” is selected then S1S69A not supported |


### Unavailable Rules &amp; Gates

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Rule ID | Rule Type | Section | Constraint / Reason | Affected SKU Count | Affected SKUs |
| 2 | RULE_1 | CONDITIONAL_VISIBILITY | Controller Node Models | No Mixing of Chassis | 1 | S0U32A |
| 3 | RULE_2 | CONDITIONAL_VISIBILITY | Controller Node Models | B series nodes only supported for upgrades | 2 | R7C71B, S3L11B |
| 4 | RULE_3 | CONDITIONAL_VISIBILITY | Controller Node Models | TAA isSelected | 1 | S3L11A |
| 5 | RULE_4 | CONDITIONAL_VISIBILITY | Power Supplies | No Mix PowerSupply | 2 | R7C78A, R9Z97A |
| 6 | RULE_5 | CONDITIONAL_VISIBILITY | Power Supplies | If single Phase or threePhase is selected then DC Power Cables not supported 1 | 2 | P22173-B21, P36877-B21 |
| 7 | RULE_6 | CONDITIONAL_VISIBILITY | Power Supplies | Breaker Panel can be selected only if R7C78A is selected | 2 | G2H95A, Q9N54A |
| 8 | RULE_7 | CONDITIONAL_VISIBILITY | Data Intelligent Node | If (S7V58A ) is selected, Then show the option to select S6A73C,S6W21C | 2 | S6A73C_GPU, S6W21C_GPU |
| 9 | RULE_8 | CONDITIONAL_VISIBILITY | Drive Enclosure | TAA isSelected | 1 | S0S46A |
| 10 | RULE_9 | CONDITIONAL_VISIBILITY | Drive Enclosure | Max quantity of product limited by space available. | 2 | S2T35A, Q2F19A |
| 11 | RULE_10 | CONDITIONAL_VISIBILITY | Drive Enclosure | Back-End Connectivity cables are not supported | 8 | R9F76A, R9F79A, R9F80A, R9F81A, S1D25A, S1D26A, S1D27A, S1D28A |
| 12 | RULE_11 | CONDITIONAL_VISIBILITY | Capacity | Max quantity of product class limited by space available. | 4 | R9H71B, R9H73B, R9H72B, S4P49A |
| 13 | RULE_12 | CONDITIONAL_VISIBILITY | Capacity | Max quantity of product class limited by space available. | 3 | S0Q04B, S0Q03B, S0Q02B |
| 14 | RULE_13 | CONDITIONAL_VISIBILITY | Capacity | Max quantity of product class limited by space available. | 5 | S1Z68A, R9H67A, R9H66A, R9H69A, R9H68A |
| 15 | RULE_14 | CONDITIONAL_VISIBILITY | Capacity | Max quantity of product class limited by space available. | 3 | S4P40A, S3L74A, S3L73A |
| 16 | RULE_15 | CONDITIONAL_VISIBILITY | Back-End Switches | If “acPowerFlag” is selected then S1S69A not supported | 1 | S1S69A |


### Support Services

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |
| 2 | Support Services | Configuration Indicators | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Support Services &gt; Configuration Indicators | Service &amp; Support | max 2 | 0 | 2 | Selection constraint for Configuration Indicators: max 2 | 581817-B21 | Standard | HPE Configurator Defined Build Instruction Option | 1 | $1.00 |  |  | $1.00 |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 11/01/2009 | 12/31/2098 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":1,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"} |
| 3 | Support Services | Configuration Indicators | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Support Services &gt; Configuration Indicators | Service &amp; Support | max 2 | 0 | 2 | Selection constraint for Configuration Indicators: max 2 | H44JMAS | Service | HPE Alletra Storage MP X10000 SVC | 1 |  |  |  | $0.00 |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 02/12/2024 | 12/31/2099 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 4 | Support Services | Configuration Indicators | HPE OCA &gt; Alletra MP X10000 [S3L12A] &gt; Support Services &gt; Configuration Indicators | Service &amp; Support | max 2 | 0 | 2 | Selection constraint for Configuration Indicators: max 2 | N9Z52A | Standard | HPE Storage Field Integration Configuration | 0 | $1.00 |  |  | NA |  | No | Available | 1 | 1 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/05/2019 | 05/31/2028 | {"leadTime":"1","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":1,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"} |


### Networking

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 34.
Row 3: identical to sheet All SKUs, row 35.
Row 4: identical to sheet All SKUs, row 36.
Row 5: identical to sheet All SKUs, row 37.
Row 6: identical to sheet All SKUs, row 38.
Row 7: identical to sheet All SKUs, row 39.
Row 8: identical to sheet All SKUs, row 40.
Row 9: identical to sheet All SKUs, row 41.
Row 10: identical to sheet All SKUs, row 42.
Row 11: identical to sheet All SKUs, row 43.
Row 12: identical to sheet All SKUs, row 57.
Row 13: identical to sheet All SKUs, row 58.
Row 14: identical to sheet All SKUs, row 59.

### Power Supplies

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 6.
Row 3: identical to sheet All SKUs, row 7.
Row 4: identical to sheet All SKUs, row 8.
Row 5: identical to sheet All SKUs, row 29.
Row 6: identical to sheet All SKUs, row 30.

### Chassis

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 2.

### Accessories &amp; Infrastructure

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 3.
Row 3: identical to sheet All SKUs, row 31.
Row 4: identical to sheet All SKUs, row 32.
Row 5: identical to sheet All SKUs, row 56.
Row 6: identical to sheet All SKUs, row 81.

### Storage Controllers

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 4.
Row 3: identical to sheet All SKUs, row 5.

### Cables &amp; Enablement Kits

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 9.
Row 3: identical to sheet All SKUs, row 10.
Row 4: identical to sheet All SKUs, row 11.
Row 5: identical to sheet All SKUs, row 12.
Row 6: identical to sheet All SKUs, row 13.
Row 7: identical to sheet All SKUs, row 14.
Row 8: identical to sheet All SKUs, row 15.
Row 9: identical to sheet All SKUs, row 16.
Row 10: identical to sheet All SKUs, row 17.
Row 11: identical to sheet All SKUs, row 18.
Row 12: identical to sheet All SKUs, row 19.
Row 13: identical to sheet All SKUs, row 20.
Row 14: identical to sheet All SKUs, row 21.
Row 15: identical to sheet All SKUs, row 22.
Row 16: identical to sheet All SKUs, row 23.
Row 17: identical to sheet All SKUs, row 24.
Row 18: identical to sheet All SKUs, row 25.
Row 19: identical to sheet All SKUs, row 26.
Row 20: identical to sheet All SKUs, row 27.
Row 21: identical to sheet All SKUs, row 28.
Row 22: identical to sheet All SKUs, row 60.
Row 23: identical to sheet All SKUs, row 61.
Row 24: identical to sheet All SKUs, row 62.
Row 25: identical to sheet All SKUs, row 63.
Row 26: identical to sheet All SKUs, row 64.
Row 27: identical to sheet All SKUs, row 65.
Row 28: identical to sheet All SKUs, row 66.
Row 29: identical to sheet All SKUs, row 67.
Row 30: identical to sheet All SKUs, row 68.
Row 31: identical to sheet All SKUs, row 69.
Row 32: identical to sheet All SKUs, row 70.
Row 33: identical to sheet All SKUs, row 71.
Row 34: identical to sheet All SKUs, row 72.
Row 35: identical to sheet All SKUs, row 73.
Row 36: identical to sheet All SKUs, row 74.
Row 37: identical to sheet All SKUs, row 75.
Row 38: identical to sheet All SKUs, row 76.
Row 39: identical to sheet All SKUs, row 77.
Row 40: identical to sheet All SKUs, row 78.
Row 41: identical to sheet All SKUs, row 79.
Row 42: identical to sheet All SKUs, row 80.

### Drive Enclosures  Drives

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 33.
Row 3: identical to sheet All SKUs, row 44.
Row 4: identical to sheet All SKUs, row 45.
Row 5: identical to sheet All SKUs, row 46.
Row 6: identical to sheet All SKUs, row 47.
Row 7: identical to sheet All SKUs, row 48.
Row 8: identical to sheet All SKUs, row 49.
Row 9: identical to sheet All SKUs, row 50.
Row 10: identical to sheet All SKUs, row 51.
Row 11: identical to sheet All SKUs, row 52.
Row 12: identical to sheet All SKUs, row 53.
Row 13: identical to sheet All SKUs, row 54.
Row 14: identical to sheet All SKUs, row 55.

### Metadata

| Original row | Column 1 | Column 2 |
| --- | --- | --- |
| 1 | Field | Value |
| 2 | Chassis | Alletra MP X10000 |
| 3 | Scrape Date | 2026-11-21 |
| 4 | Source | OCA (Online Configuration Application) |
| 5 | Total Sub-Categories | 35 |
| 6 | Total Hardware SKUs | 80 |
| 7 | Total Service/Software SKUs | 3 |
| 8 | Total Combined SKUs | 83 |
| 9 | Chassis Variant Options | 1 |
| 10 | Total Rules | 83 |
| 11 | Unavailable DOM Rules | 15 |
| 12 | Total Tables | 22 |
| 13 | Diff Added SKUs | 0 |
| 14 | Diff Removed SKUs | 0 |
| 15 | Diff Price Changed | 0 |
| 16 | Diff Attr Changed | 0 |
| 17 | Diff Price+Attr Changed | 0 |
| 18 | Diff Reinstated SKUs | 0 |
| 19 | Diff Unchanged SKUs | 83 |
| 20 | Discontinued (All-Time) | 0 |
| 21 | Reinstated (All-Time) | 0 |
| 22 | Services JSON | outputs/Alletra/Storage/Alletra_MP_X10000/Alletra_MP_X10000_Services.json |
| 23 | Output Folder | outputs/Alletra/Storage/Alletra_MP_X10000 |


## Shared cell text

Bracketed TEXT identifiers above refer to these exact repeated values. The surrounding sheet, column and row determine applicability.

### TEXT_1

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":13749,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_2

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":403464,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_3

B series nodes only supported for upgrades &#124; R7C71B conditional visibility: portal selector activation required (B series nodes only supported for upgrades); PORTAL_CONDITIONAL

### TEXT_4

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":524503,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_5

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2327,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_6

No Mix PowerSupply &#124; R7C78A conditional visibility: portal selector activation required (No Mix PowerSupply); PORTAL_CONDITIONAL &#124; (+1 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_7

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":11842,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_8

No Mix PowerSupply &#124; R9Z97A conditional visibility: portal selector activation required (No Mix PowerSupply); PORTAL_CONDITIONAL &#124; (+1 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_9

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":3332,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_10

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":64,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_11

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":23,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_12

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":83,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_13

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":59,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_14

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":196,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_15

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":36,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_16

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":21,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_17

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":26,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_18

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":148,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_19

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":43,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_20

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":61,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_21

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":21,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_22

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":24,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_23

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":29,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_24

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":31,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_25

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":23,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_26

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":123,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_27

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":76,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_28

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":72,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_29

If single Phase or threePhase is selected then DC Power Cables not supported 1 &#124; P22173-B21 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 1); PORTAL_CONDITIONAL &#124; (+1 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_30

HPE 1600W -48VDC 600V 3.5m Power Cable Kit                       If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_31

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":818,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_32

If single Phase or threePhase is selected then DC Power Cables not supported 1 &#124; P36877-B21 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 1); PORTAL_CONDITIONAL &#124; (+1 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_33

HPE 1600W -48VDC Power Cable Lug Kit                       If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_34

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":135,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_35

Breaker Panel can be selected only if R7C78A is selected &#124; G2H95A conditional visibility: portal selector activation required (Breaker Panel can be selected only if R7C78A is selected); PORTAL_CONDITIONAL &#124; (+1 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_36

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":5682,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_37

Breaker Panel can be selected only if R7C78A is selected &#124; Q9N54A conditional visibility: portal selector activation required (Breaker Panel can be selected only if R7C78A is selected); PORTAL_CONDITIONAL &#124; (+1 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_38

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":196,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_39

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":19654,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_40

Max quantity of product limited by space available. &#124; S2T35A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+1 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_41

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":3299,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_42

Max quantity of product limited by space available. &#124; Q2F19A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+1 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_43

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2425,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_44

Back-End Connectivity cables are not supported &#124; R9F76A conditional visibility: portal selector activation required (Back-End Connectivity cables are not supported); PORTAL_CONDITIONAL &#124; (+7 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_45

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":2649,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_46

Back-End Connectivity cables are not supported &#124; R9F79A conditional visibility: portal selector activation required (Back-End Connectivity cables are not supported); PORTAL_CONDITIONAL &#124; (+7 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_47

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":2739,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_48

Back-End Connectivity cables are not supported &#124; R9F80A conditional visibility: portal selector activation required (Back-End Connectivity cables are not supported); PORTAL_CONDITIONAL &#124; (+7 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_49

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":2959,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_50

Back-End Connectivity cables are not supported &#124; R9F81A conditional visibility: portal selector activation required (Back-End Connectivity cables are not supported); PORTAL_CONDITIONAL &#124; (+7 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_51

Back-End Connectivity cables are not supported &#124; S1D25A conditional visibility: portal selector activation required (Back-End Connectivity cables are not supported); PORTAL_CONDITIONAL &#124; (+7 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_52

{"leadTime":"78","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":5039,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_53

Back-End Connectivity cables are not supported &#124; S1D26A conditional visibility: portal selector activation required (Back-End Connectivity cables are not supported); PORTAL_CONDITIONAL &#124; (+7 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_54

Back-End Connectivity cables are not supported &#124; S1D27A conditional visibility: portal selector activation required (Back-End Connectivity cables are not supported); PORTAL_CONDITIONAL &#124; (+7 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_55

{"leadTime":"78","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":6829,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_56

Back-End Connectivity cables are not supported &#124; S1D28A conditional visibility: portal selector activation required (Back-End Connectivity cables are not supported); PORTAL_CONDITIONAL &#124; (+7 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_57

Max quantity of product class limited by space available. &#124; R9H71B conditional visibility: portal selector activation required (Max quantity of product class limited by space available.); PORTAL_CONDITIONAL &#124; (+3 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_58

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":58713,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_59

Max quantity of product class limited by space available. &#124; R9H73B conditional visibility: portal selector activation required (Max quantity of product class limited by space available.); PORTAL_CONDITIONAL &#124; (+3 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_60

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":235872,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_61

Max quantity of product class limited by space available. &#124; R9H72B conditional visibility: portal selector activation required (Max quantity of product class limited by space available.); PORTAL_CONDITIONAL &#124; (+3 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_62

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":131890,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_63

Max quantity of product class limited by space available. &#124; S4P49A conditional visibility: portal selector activation required (Max quantity of product class limited by space available.); PORTAL_CONDITIONAL &#124; (+3 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_64

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":376435,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_65

Max quantity of product class limited by space available. &#124; S1Z68A conditional visibility: portal selector activation required (Max quantity of product class limited by space available.); PORTAL_CONDITIONAL &#124; (+4 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_66

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":342214,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_67

Max quantity of product class limited by space available. &#124; R9H67A conditional visibility: portal selector activation required (Max quantity of product class limited by space available.); PORTAL_CONDITIONAL &#124; (+4 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_68

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":53373,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_69

Max quantity of product class limited by space available. &#124; R9H66A conditional visibility: portal selector activation required (Max quantity of product class limited by space available.); PORTAL_CONDITIONAL &#124; (+4 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_70

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":36109,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_71

Max quantity of product class limited by space available. &#124; R9H69A conditional visibility: portal selector activation required (Max quantity of product class limited by space available.); PORTAL_CONDITIONAL &#124; (+4 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_72

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":214426,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_73

Max quantity of product class limited by space available. &#124; R9H68A conditional visibility: portal selector activation required (Max quantity of product class limited by space available.); PORTAL_CONDITIONAL &#124; (+4 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_74

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":119901,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_75

Max quantity of product class limited by space available. &#124; S4P40A conditional visibility: portal selector activation required (Max quantity of product class limited by space available.); PORTAL_CONDITIONAL &#124; (+2 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_76

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":420983,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_77

Max quantity of product class limited by space available. &#124; S3L74A conditional visibility: portal selector activation required (Max quantity of product class limited by space available.); PORTAL_CONDITIONAL &#124; (+2 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_78

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":241214,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_79

Max quantity of product class limited by space available. &#124; S3L73A conditional visibility: portal selector activation required (Max quantity of product class limited by space available.); PORTAL_CONDITIONAL &#124; (+2 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_80

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":126796,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_81

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":197,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_82

{"leadTime":"5","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":43467,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_83

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":128140,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_84

If “acPowerFlag” is selected then S1S69A not supported &#124; S1S69A conditional visibility: portal selector activation required (If “acPowerFlag” is selected then S1S69A not supported); PORTAL_CONDITIONAL

### TEXT_85

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":49176,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_86

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":3075,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_87

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":20,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_88

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":21,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_89

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":46,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_90

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":86,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_91

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":285,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_92

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":327,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_93

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":392,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_94

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2451,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_95

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":916,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_96

{"leadTime":"13","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":315,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_97

{"leadTime":"13","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":430,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_98

{"leadTime":"13","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":314,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_99

{"leadTime":"13","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":346,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_100

{"leadTime":"13","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":850,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_101

{"leadTime":"13","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":986,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_102

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":467,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_103

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":535,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_104

{"leadTime":"49","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":975,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_105

{"leadTime":"35","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":1075,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_106

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1216,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_107

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":1,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

