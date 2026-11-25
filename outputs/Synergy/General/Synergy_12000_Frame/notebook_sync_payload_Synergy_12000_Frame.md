# HPE Synergy_12000_Frame — Synchronized Catalog Knowledge

**Target Product**: `Synergy_12000_Frame`

**Scope Identity**: `HPE/COMPOSITE/Synergy/General/Synergy_12000_Frame`

**Sync Timestamp**: 2026-11-25T08:15:49.197Z

**Total Verified SKUs**: `447` (`257` Hardware + `190` Services)

**Total Synced KnowledgeDeltas**: `28`

This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.

---

## 🚀 Executive Delta & Recent Change Summary

| Category | Total SKUs | Added (Last Scrape) | Price Changed | Attribute Changed | Price & Attr Changed | Reinstated | Status |
|----------|------------|---------------------|---------------|-------------------|----------------------|------------|--------|
| **Hardware Components** | 257 | 29 | 0 | 228 | 0 | 0 | **CERTIFIED** |
| **Support Services & SLAs** | 190 | 4 | 0 | 186 | 0 | 0 | **CERTIFIED** |
| **Total Portfolio** | **447** | **33** | **0** | **414** | **0** | **0** | **ACTIVE** |


## Configured child menus

OBSERVED_CONFIGURED_CHILD_MENUS. Observed child base SKUs 876852-B21, 867796-B21.  Other selector states require separate observation.

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

## 🎯 3. Chassis & Solution-Type Gotchas (Synergy_12000_Frame)

1. **[LEARN_SYNERGY_12000_FRAME_WORKFLOW_DUAL_PUBLICATION_ADVISORY_20261029] Synergy_12000_Frame** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `Synergy_12000_Frame CTO Server`):
   - **Rule**: Publish and read back the human Drive workbook separately from the complete semantic Markdown source in NotebookLM. Google Sheets is not a supported NotebookLM Drive source. A recent upload timestamp does not refresh old vendor observations.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

2. **[LEARN_SYNERGY_12000_FRAME_WORKFLOW_SOURCE_RETIREMENT_ADVISORY_20261029] Synergy_12000_Frame** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `Synergy_12000_Frame CTO Server`):
   - **Rule**: Verify exact-product replacement content, indexing and source-restricted grounded canary, then commit trust metadata before removing only managed stale catalog snapshots. Preserve QuickSpecs, separate learnings, shared enclosure/fabric sources and unrelated documents. Inventory absence is not authority to remove another product source.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

3. **[LEARN_SYNERGY_12000_FRAME_WORKFLOW_CLOUD_LEARNING_REVIEW_ADVISORY_20261029] Synergy_12000_Frame** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `Synergy_12000_Frame CTO Server`):
   - **Rule**: Preserve retrieved cloud learning documents locally with their source IDs. Treat prose claims as candidates pending dated vendor evidence; resolve contradictions before promoting hardware dependencies. Conflicting quantity claims require dated evidence for this exact product and selector state.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

4. **[LEARN_SYNERGY_12000_DUAL_SLOT_PSU_ADAPTER_12PSU_20261124] Synergy_12000_Frame** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `Synergy_12000_Frame CTO Server`):
   - **Rule**: 6x HPE Synergy Dual Slot Power Supply Adapters (P44074-B21) expand a Synergy 12000 Frame (P51174-B21) from 6 physical PSU bays to 12x HPE 1800W-2200W Flex Slot Titanium PSUs (P44712-B21) per frame (verified across 2-frame 24-PSU UCID 5158592304-01 and 3-frame 36-PSU UCID 5158590124-02 OCA builds). Multi-frame roles are encoded inside sequential frames Synergy 12000 Frame #1/#2/#3 via 859493-B21 (Master1 FIO + Composer2 872957-B21), 859494-B22 (Master2 FIO + Composer2), and Satellite frames (no Master FIO / no Composer2).
   - **Affected SKU**: `P44074-B21` | **Required Dependency**: `P44712-B21`

5. **[LEARN_SYNERGY_6PLANE_CABLING_AND_PORT_BUDGET_20261125] Synergy_12000_Frame** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `Synergy_12000_Frame CTO Server`):
   - **Rule**: HPE OCA does not validate Synergy inter-frame or northbound cabling. Enforce 6-plane completeness via synergy_cabling_auditor.js: (1) Internal midplane (blades & Composer2 = 0 cables); (2) Frame power jumpers (P44712-B21 ships with C13-C14 cords and requires AF590A C20-C13 jumpers for C20 PDUs); (3) FLM 876852-B21 HA ring needs 0/2/3 10GbE SFP+ LINK DACs or optics for 1/2/3 frames plus 2x MGMT uplinks (e.g. 453154-B21) per ring, and never raw CAT6A without 813874-B21; (4) Ethernet 300Gb ICL needs 2x CXP28 cables per 50Gb ILM (867793-B21) for full 50Gb (0/4/8 for 1/2/3 frames) with zero LSZH/Plenum mixing; (5) Master F32 Q7/Q8 horizontal stacking requires 2x 100Gb QSFP28 cables per pair (BiDi optics forbidden in Q7/Q8), and total stacking + uplink QSFP28 endpoints must fit within 8 cages per F32; (6) Brocade FC Q2E57A/P77653-B21 ship with 4x SW optics and 0 fiber cables, requiring OM4 LC/LC or MPO breakout cables.
   - **Affected SKU**: `867796-B21` | **Required Dependency**: `845406-B21`


## 🔒 3b. Physical & Architectural Gating Rules (DOM Unavailable Tables)

### Component Mutual Exclusion Rules

1. **[Compute and Storage]**: Non-TAA Model cannot support TAA products.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (11)**: `871940-B22`, `871941-B22`, `871942-B22`, `P22139-B22`, `P39531-B22`, `P83805-B21#GTA`, `P68217-B21#GTA`, `P83806-B21#GTA`, `871929-B22`, `871930-B22`, `871931-B22`

2. **[Compute and Storage]**: CTO Compute and Storage Modules can only be configured in a CTO Frame.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (18)**: `871943-B21`, `871945-B21`, `871946-B21`, `826950-B21`, `826951-B21`, `826952-B21`, `826953-B21`, `826954-B21`, `834483-B21`, `834484-B21`, `871932-B21`, `871933-B21`, `871934-B21`, `826956-B21`, `826957-B21`, `826958-B21`, `834480-B21`, `834481-B21`

3. **[Compute and Storage]**: CTO Compute and Storage Modules can only be configured in a CTO Frame.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `755984-B21`

4. **[Management Hardware]**: Mixing Composer and Composer 2 is not allowed
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `804353-B21`

5. **[Management Hardware]**: Non-TAA Model cannot support TAA products.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (4)**: `804353-B22`, `804937-B22`, `872957-B22`, `P73869-B22`

6. **[Management Hardware]**: If HPE Synergy 4-port Frame Link Module is included in the 12000 Frame, Synergy Image Streamer on Synergy Composer cannot be selected.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `804937-B21`

7. **[Management Hardware]**: Max quantity of product limited by space available.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `P54624-B21`

8. **[Management Hardware]**: Mixing of Composer 2 and Composer 2 Plus modules is not allowed.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `P73869-B21`

9. **[Management Hardware]**: Either Frame link Module or 4p Frame Link Module can be selected. Mixing is not allowed.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `804942-B21`

10. **[Management Hardware]**: Non-TAA Model cannot support TAA products.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `804942-B22`

11. **[Interconnects]**: Non-TAA Model cannot support TAA products.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (5)**: `867793-B22`, `867796-B22`, `779215-B22`, `779218-B22`, `799330-B22`

12. **[Interconnects]**: Product is obsolete
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `489184-B21`

13. **[Interconnects]**: Product not supported
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (14)**: `648312-B21`, `658247-B21`, `674280-B21`, `674281-B21`, `674282-B21`, `674283-B21`, `674284-B21`, `829914-B21`, `829915-B21`, `829916-B21`, `843191-B21`, `843192-B21`, `843193-B21`, `846041-B21`

14. **[Interconnects]**: Cannot mix together in the same Synergy 12000 Frame
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `794502-B23`

15. **[Power]**: Model X - No Mixing of Power Supplies is allowed. All selected Power Supplies must be of the same part number. Minimum should be determined based on the Power Advisor Program. (Minimum is always at least 2 - Power Advisor Program will indicate scenarios in which more than 2 is required)
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (11)**: `798095-B21`, `798096-B21`, `876929-B21`, `P27749-B21`, `P27750-B21`, `798099-B21`, `798100-B21`, `798101-B21`, `798102-B21`, `798342-B21`, `798349-B21`

16. **[Power]**: This cable kit support with only the following power supplies
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (8)**: `J6X00A`, `P9B75A`, `J6W98A`, `J6W99A`, `J6X01A`, `J6X02A`, `J6X03A`, `P9B77A`

17. **[Power]**: This option cable kit contains 6 six power cords and support only with the following power supplies
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `872035-B21`

## ⚠️ 4. Discontinued & Obsolete SKUs Registry

*No discontinued or reinstated SKUs detected for Synergy_12000_Frame. All cataloged SKUs are active.*

### ⏳ Impending Obsolescence & Clearance Hardware (90-Day to 180-Day Window)

*These components remain orderable in live configurators today but have published vendor end dates. They represent high-value clearance opportunities for immediate deployments, but require explicit procurement cutoff remarks before quotation:*

| Product # | Description | Category | List Price (USD) | Discontinued Date | Price Trend | Presales Strategy Guidance |
|---|---|---|---:|---|:---:|---|
| `P39531-B21` | HPE Synergy 480 Gen11 Configure-to-order Compute Module | Frame Options | $3,463 | 09/08/2026 | 0.00% | ⚠️ Approaching EOL (09/08/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P83805-B21` | HPE Synergy 480 Gen11 Solution Compute Node | Frame Options | $3,463 | 09/10/2026 | 0.00% | ⚠️ Approaching EOL (09/10/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P83805-B21` | HPE Synergy 480 Gen11 for SAP HANA Compute Node | Accessories & Infrastructure | $0 | 09/10/2026 | 0.00% | ⚠️ Approaching EOL (09/10/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `835386-B21` | HPE Synergy D3940 12Gb SAS CTO Drive Enclosure with 40 SFF (2.5in) Drive Bays | Accessories & Infrastructure | $4,411 | 11/30/2026 | 0.00% | ⚠️ Approaching EOL (11/30/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `872957-B21` | HPE Synergy Composer2 Management Appliance | Management Hardware | $10,400 | 03/31/2027 | 0.00% | ⚠️ Approaching EOL (03/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P54624-B21` | HPE Synergy Composer2 Management Appliance Kit | Management Hardware | $10,400 | 03/31/2027 | 0.00% | ⚠️ Approaching EOL (03/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `755985-B21` | HPE Synergy 12Gb SAS Connection Module with 12 Internal Ports | Networking | $2,099 | 11/30/2026 | 0.00% | ⚠️ Approaching EOL (11/30/2026). Valid for immediate builds; verify multi-year roadmaps. |

## 📊 5b. Category-Level Trends & Significant Price Adjustments

### Category Portfolio Delta & Planning Intelligence

| Category | Total SKUs | Added | Modified | Unchanged | Clearance / Drops | Category Planning Insight |
|---|---:|---:|---:|---:|---:|---|
| **Chassis** | 1 | 0 | 1 | 0 | 0 | 🔄 Attributes/specifications updated (1 SKUs) |
| **Frame Options** | 39 | 0 | 39 | 0 | 0 | 🔄 Attributes/specifications updated (39 SKUs) |
| **Accessories & Infrastructure** | 31 | 0 | 31 | 0 | 0 | 🔄 Attributes/specifications updated (31 SKUs) |
| **Drive Enclosures / Drives** | 2 | 0 | 2 | 0 | 0 | 🔄 Attributes/specifications updated (2 SKUs) |
| **Management Hardware** | 6 | 0 | 6 | 0 | 0 | 🔄 Attributes/specifications updated (6 SKUs) |
| **Networking** | 42 | 0 | 42 | 0 | 0 | 🔄 Attributes/specifications updated (42 SKUs) |
| **Cables & Enablement Kits** | 81 | 0 | 81 | 0 | 0 | 🔄 Attributes/specifications updated (81 SKUs) |
| **Tape Drives** | 5 | 0 | 5 | 0 | 0 | 🔄 Attributes/specifications updated (5 SKUs) |
| **Software & Licenses** | 37 | 29 | 8 | 0 | 0 | ✨ Portfolio expanding (+29 new options) |
| **Cooling / Thermal** | 1 | 0 | 1 | 0 | 0 | 🔄 Attributes/specifications updated (1 SKUs) |
| **Power Supplies** | 13 | 0 | 13 | 0 | 0 | 🔄 Attributes/specifications updated (13 SKUs) |

### High-Impact Price Adjustments (Drops $\ge 10\%$ and Major Moves)

| Product # | Description | Category | Previous Price | Current Price | Delta (USD) | Change (%) | Movement Type |
|---|---|---|---:|---:|---:|---:|---|
| `P9P38AAE` | Hortonworks OnSt Tng Del Ad Stu PD E-LTU | Software & Licenses | New Addition | $530 | $530 | **+100.0%** | ✨ NEW_OPTION |
| `G7M28AAE` | Cloudera Enterprise Basic Edition 1 Year Subscription per Node 8x5 Support E-LTU | Software & Licenses | New Addition | $1,600 | $1,600 | **+100.0%** | ✨ NEW_OPTION |
| `G7M27AAE` | Cloudera Enterprise Basic Edition 1 Year Subscription per Node 24x7 Support E-LTU | Software & Licenses | New Addition | $2,000 | $2,000 | **+100.0%** | ✨ NEW_OPTION |
| `P9V12AAE` | Cloudera Enterprise Data Engineering Edition 1yr Subscription per Node 8x5 Bronze Support E-LTU | Software & Licenses | New Addition | $3,200 | $3,200 | **+100.0%** | ✨ NEW_OPTION |
| `P9V13AAE` | Cloudera Enterprise Data Engineering Edition 1yr Subscription per Node 24x7 Gold Support E-LTU | Software & Licenses | New Addition | $4,000 | $4,000 | **+100.0%** | ✨ NEW_OPTION |
| `P9A42AAE` | Cloudera Enterprise Basic Edition 3 Year Subscription per Node 8x5 Support E-LTU | Software & Licenses | New Addition | $4,800 | $4,800 | **+100.0%** | ✨ NEW_OPTION |
| `P9V14AAE` | Cloudera Enterprise Operational Database Edition 1yr Subscription per Node 8x5 Bronze Support E-LTU | Software & Licenses | New Addition | $4,800 | $4,800 | **+100.0%** | ✨ NEW_OPTION |
| `P9V15AAE` | Cloudera Enterprise Operational Database Edition 1yr Subscription per Node 24x7 Gold Support E-LTU | Software & Licenses | New Addition | $6,000 | $6,000 | **+100.0%** | ✨ NEW_OPTION |
| `P9V16AAE` | Cloudera Enterprise Analytical Database Edition 1yr Subscription per Node 8x5 Bronze Support E-LTU | Software & Licenses | New Addition | $7,060 | $7,060 | **+100.0%** | ✨ NEW_OPTION |
| `P9A41AAE` | Cloudera Enterprise Basic Edition 3 Year Subscription per Node 24x7 Support E-LTU | Software & Licenses | New Addition | $7,540 | $7,540 | **+100.0%** | ✨ NEW_OPTION |
| `P9V17AAE` | Cloudera Enterprise Analytical Database Edition 1yr Subscription per Node 24x7 Gold Support E-LTU | Software & Licenses | New Addition | $8,000 | $8,000 | **+100.0%** | ✨ NEW_OPTION |
| `G7M30AAE` | Cloudera Enterprise Data Hub Edition 1 Year Subscription per Node 8x5 Support E-LTU | Software & Licenses | New Addition | $8,000 | $8,000 | **+100.0%** | ✨ NEW_OPTION |
| `G7M29AAE` | Cloudera Enterprise Data Hub Edition 1 Year Subscription per Node 24x7 Support E-LTU | Software & Licenses | New Addition | $10,000 | $10,000 | **+100.0%** | ✨ NEW_OPTION |
| `P9V18AAE` | Cloudera Enterprise Data Engineering Edition 3yr Subscription per Node 24x7 Gold Support E-LTU | Software & Licenses | New Addition | $12,000 | $12,000 | **+100.0%** | ✨ NEW_OPTION |
| `F5Z52AAE` | Hortonworks Data Platform (HDP) Enterprise Subscription 4 N/50TB Raw Strg 1yr 24x7 Supp E-LTU | Software & Licenses | New Addition | $12,429 | $12,429 | **+100.0%** | ✨ NEW_OPTION |
| `G7M31AAE` | Cloudera Enterprise Data Hub Edition 1 Year Subscription per Node 24x7 Premium E-LTU | Software & Licenses | New Addition | $12,820 | $12,820 | **+100.0%** | ✨ NEW_OPTION |
| `P9V19AAE` | Cloudera Enterprise Operational Database Edition 3yr Subscription per Node 24x7 Gold Support E-LTU | Software & Licenses | New Addition | $19,860 | $19,860 | **+100.0%** | ✨ NEW_OPTION |
| `P9A44AAE` | Cloudera Enterprise Data Hub Edition 3 Year Subscription per Node 8x5 Support E-LTU | Software & Licenses | New Addition | $24,000 | $24,000 | **+100.0%** | ✨ NEW_OPTION |
| `P9V20AAE` | Cloudera Enterprise Analytical Database Edition 3yr Subscription per Node 24x7 Gold Support E-LTU | Software & Licenses | New Addition | $26,480 | $26,480 | **+100.0%** | ✨ NEW_OPTION |
| `P9A43AAE` | Cloudera Enterprise Data Hub Edition 3 Year Subscription per Node 24x7 Support E-LTU | Software & Licenses | New Addition | $30,000 | $30,000 | **+100.0%** | ✨ NEW_OPTION |
*... [4 additional price movements omitted for brevity]*

## 🔄 5. Recent Attribute & Specification Modifications Log

| Timestamp | Source | SKU | Attribute | Old Value | New Value | Detail |
|-----------|--------|-----|-----------|-----------|-----------|--------|
| 2026-11-12 | Services | `F5Z52AAE` | Speed Tier | Unpublished | **N/A** | Speed Tier: "Unpublished" → "N/A" |
| 2026-11-12 | Services | `F5Z52AAE` | Portal Visibility | PORTAL_CONDITIONAL | **N/A** | Portal Visibility: "PORTAL_CONDITIONAL" → "N/A" |
| 2026-11-12 | Services | `F5Z52AAE` | Condition Type | PORTAL_CONDITIONAL_VIEW | **N/A** | Condition Type: "PORTAL_CONDITIONAL_VIEW" → "N/A" |
| 2026-11-12 | Services | `F5Z52AAE` | Vendor Recommended | false | **N/A** | Vendor Recommended: "false" → "N/A" |
| 2026-11-12 | Services | `F5Z52AAE` | Vendor Attributes | {"listPrice":12429} | **N/A** | Vendor Attributes: "{"listPrice":12429}" → "N/A" |
| 2026-11-12 | Services | `P9P38AAE` | Main Category | Drive Enclosures / Drives | **Software & Licenses** | Main Category: "Drive Enclosures / Drives" → "Software & Licenses" |
| 2026-11-12 | Services | `P9P38AAE` | Sub-Category | Hard Disk Drives (SAS/SATA) | **Server Management & Operating System Licenses** | Sub-Category: "Hard Disk Drives (SAS/SATA)" → "Server Management & Operating System Licenses" |
| 2026-11-12 | Services | `P9P38AAE` | Description | Hortonworks OnSt Tng Del Ad Stu PD E-LTU | **N/A** | Description: "Hortonworks OnSt Tng Del Ad Stu PD E-LTU" → "N/A" |
| 2026-11-12 | Services | `P9P38AAE` | Constraint | max 24 | **N/A** | Constraint: "max 24" → "N/A" |
| 2026-11-12 | Services | `P9P38AAE` | Rule/Note | Selection constraint for Hard Disk Drives (SAS/SATA): max 24; Q5U42AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; L4Z37AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P9V17AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P9V16AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P9V20AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; G7M27AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; G7M28AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P9A41AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P9A42AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P9V13AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P9V12AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P9V18AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; G7M31AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; G7M29AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; G7M30AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P9A45AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P9A43AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P9A44AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P9V15AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P9V14AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P9V19AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; JP408AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q5U39AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q5U41AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q5U44AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q5U43AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q5U40AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; F5Z52AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P9P38AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL | **N/A** | Rule/Note: "Selection constraint for Hard Disk Drives (SAS/SATA): max 24; Q5U42AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; L4Z37AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P9V17AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P9V16AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P9V20AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; G7M27AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; G7M28AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P9A41AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P9A42AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P9V13AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P9V12AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P9V18AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; G7M31AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; G7M29AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; G7M30AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P9A45AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P9A43AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P9A44AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P9V15AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P9V14AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P9V19AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; JP408AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q5U39AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q5U41AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q5U44AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q5U43AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q5U40AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; F5Z52AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P9P38AAE conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL" → "N/A" |
| 2026-11-12 | Services | `P9P38AAE` | Max Qty | 24 | **N/A** | Max Qty: "24" → "N/A" |
| 2026-11-12 | Services | `P9P38AAE` | Option Type | Service | **N/A** | Option Type: "Service" → "N/A" |
| 2026-11-12 | Services | `P9P38AAE` | Start Date | 05/06/2016 | **N/A** | Start Date: "05/06/2016" → "N/A" |
| 2026-11-12 | Services | `P9P38AAE` | Discontinued Date | 07/31/2020 | **N/A** | Discontinued Date: "07/31/2020" → "N/A" |
| 2026-11-12 | Services | `P9P38AAE` | Lifecycle Status | Obsolete (OB) | **N/A** | Lifecycle Status: "Obsolete (OB)" → "N/A" |
| 2026-11-12 | Services | `P9P38AAE` | CLIC Status | Unpublished | **N/A** | CLIC Status: "Unpublished" → "N/A" |
| 2026-11-12 | Services | `P9P38AAE` | Lifecycle Badge | OB | **N/A** | Lifecycle Badge: "OB" → "N/A" |
| 2026-11-12 | Services | `P9P38AAE` | Availability | Obsolete (OB) | **N/A** | Availability: "Obsolete (OB)" → "N/A" |
| 2026-11-12 | Services | `P9P38AAE` | Lead Time | Unpublished | **N/A** | Lead Time: "Unpublished" → "N/A" |
| 2026-11-12 | Services | `P9P38AAE` | Lead Time Source | Unpublished | **N/A** | Lead Time Source: "Unpublished" → "N/A" |
| 2026-11-12 | Services | `P9P38AAE` | Speed Tier | Unpublished | **N/A** | Speed Tier: "Unpublished" → "N/A" |
| 2026-11-12 | Services | `P9P38AAE` | Portal Visibility | PORTAL_CONDITIONAL | **N/A** | Portal Visibility: "PORTAL_CONDITIONAL" → "N/A" |
| 2026-11-12 | Services | `P9P38AAE` | Condition Type | PORTAL_CONDITIONAL_VIEW | **N/A** | Condition Type: "PORTAL_CONDITIONAL_VIEW" → "N/A" |
| 2026-11-12 | Services | `P9P38AAE` | Vendor Recommended | false | **N/A** | Vendor Recommended: "false" → "N/A" |
| 2026-11-12 | Services | `P9P38AAE` | Vendor Attributes | {"listPrice":530} | **N/A** | Vendor Attributes: "{"listPrice":530}" → "N/A" |

### Current Scrape SKU Attribute Deltas

| SKU | Source | Diff Status | Attribute Changes (Old → New) |
|-----|--------|-------------|-------------------------------|
| `R1R47A` | Hardware | ATTRIBUTE_CHANGED | Sub-Category: "Server Management & Operating System Licenses" → "Compute"; Rule/Note: "Selection constraint for Server Management & Operating System Licenses: max 12; R1R47A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871940-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871941-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871942-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q88A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P22139-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P39531-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P83805-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732350-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732351-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732352-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834485-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871929-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871930-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871931-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q89A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; R1R49A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732360-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834482-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL" → "Selection constraint for Compute: max 12"; Component Role: "(None)" → "Base Chassis"; Portal Visibility: "PORTAL_CONDITIONAL" → "(None)"; Condition Type: "PORTAL_CONDITIONAL_VIEW" → "(None)"; Vendor Attributes: "{"listPrice":3327}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":3327,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `871940-B21` | Hardware | ATTRIBUTE_CHANGED | Sub-Category: "Server Management & Operating System Licenses" → "Compute"; Rule/Note: "Selection constraint for Server Management & Operating System Licenses: max 12; R1R47A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871940-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871941-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871942-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q88A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P22139-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P39531-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P83805-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732350-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732351-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732352-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834485-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871929-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871930-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871931-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q89A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; R1R49A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732360-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834482-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL" → "Selection constraint for Compute: max 12"; Component Role: "(None)" → "Base Chassis"; Portal Visibility: "PORTAL_CONDITIONAL" → "(None)"; Condition Type: "PORTAL_CONDITIONAL_VIEW" → "(None)"; Vendor Attributes: "{"listPrice":3324}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":3324,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `871941-B21` | Hardware | ATTRIBUTE_CHANGED | Sub-Category: "Server Management & Operating System Licenses" → "Compute"; Rule/Note: "Selection constraint for Server Management & Operating System Licenses: max 12; R1R47A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871940-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871941-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871942-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q88A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P22139-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P39531-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P83805-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732350-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732351-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732352-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834485-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871929-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871930-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871931-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q89A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; R1R49A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732360-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834482-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL" → "Selection constraint for Compute: max 12"; Component Role: "(None)" → "Base Chassis"; Portal Visibility: "PORTAL_CONDITIONAL" → "(None)"; Condition Type: "PORTAL_CONDITIONAL_VIEW" → "(None)"; Vendor Attributes: "{"listPrice":3136}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":3136,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `871942-B21` | Hardware | ATTRIBUTE_CHANGED | Sub-Category: "Server Management & Operating System Licenses" → "Compute"; Rule/Note: "Selection constraint for Server Management & Operating System Licenses: max 12; R1R47A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871940-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871941-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871942-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q88A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P22139-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P39531-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P83805-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732350-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732351-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732352-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834485-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871929-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871930-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871931-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q89A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; R1R49A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732360-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834482-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL" → "Selection constraint for Compute: max 12"; Component Role: "(None)" → "Base Chassis"; Portal Visibility: "PORTAL_CONDITIONAL" → "(None)"; Condition Type: "PORTAL_CONDITIONAL_VIEW" → "(None)"; Vendor Attributes: "{"listPrice":3327}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":3327,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `Q9Q88A` | Hardware | ATTRIBUTE_CHANGED | Sub-Category: "Server Management & Operating System Licenses" → "Compute"; Rule/Note: "Selection constraint for Server Management & Operating System Licenses: max 12; R1R47A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871940-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871941-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871942-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q88A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P22139-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P39531-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P83805-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732350-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732351-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732352-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834485-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871929-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871930-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871931-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q89A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; R1R49A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732360-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834482-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL" → "Selection constraint for Compute: max 12"; Component Role: "(None)" → "Base Chassis"; Portal Visibility: "PORTAL_CONDITIONAL" → "(None)"; Condition Type: "PORTAL_CONDITIONAL_VIEW" → "(None)"; Vendor Attributes: "{"listPrice":3019}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":3019,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P22139-B21` | Hardware | ATTRIBUTE_CHANGED | Sub-Category: "Server Management & Operating System Licenses" → "Compute"; Rule/Note: "Selection constraint for Server Management & Operating System Licenses: max 12; R1R47A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871940-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871941-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871942-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q88A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P22139-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P39531-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P83805-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732350-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732351-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732352-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834485-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871929-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871930-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871931-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q89A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; R1R49A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732360-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834482-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL" → "Selection constraint for Compute: max 12"; Component Role: "(None)" → "Base Chassis"; Portal Visibility: "PORTAL_CONDITIONAL" → "(None)"; Condition Type: "PORTAL_CONDITIONAL_VIEW" → "(None)"; Vendor Attributes: "{"listPrice":3843}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":3843,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P39531-B21` | Hardware | ATTRIBUTE_CHANGED | Sub-Category: "Server Management & Operating System Licenses" → "Compute"; Rule/Note: "Selection constraint for Server Management & Operating System Licenses: max 12; R1R47A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871940-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871941-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871942-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q88A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P22139-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P39531-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P83805-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732350-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732351-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732352-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834485-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871929-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871930-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871931-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q89A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; R1R49A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732360-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834482-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL" → "Selection constraint for Compute: max 12"; Component Role: "(None)" → "Base Chassis"; Portal Visibility: "PORTAL_CONDITIONAL" → "(None)"; Condition Type: "PORTAL_CONDITIONAL_VIEW" → "(None)"; Vendor Attributes: "{"listPrice":3463}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":3463,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P83805-B21` | Hardware | ATTRIBUTE_CHANGED | Sub-Category: "Server Management & Operating System Licenses" → "Compute"; Rule/Note: "Selection constraint for Server Management & Operating System Licenses: max 12; R1R47A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871940-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871941-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871942-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q88A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P22139-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P39531-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P83805-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732350-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732351-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732352-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834485-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871929-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871930-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871931-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q89A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; R1R49A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732360-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834482-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL" → "Selection constraint for Compute: max 12"; Component Role: "(None)" → "Base Chassis"; Portal Visibility: "PORTAL_CONDITIONAL" → "(None)"; Condition Type: "PORTAL_CONDITIONAL_VIEW" → "(None)"; Vendor Attributes: "{"listPrice":3463}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":3463,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P68217-B21` | Hardware | ATTRIBUTE_CHANGED | Sub-Category: "Server Management & Operating System Licenses" → "Compute"; Rule/Note: "Selection constraint for Server Management & Operating System Licenses: max 12; R1R47A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871940-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871941-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871942-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q88A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P22139-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P39531-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P83805-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732350-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732351-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732352-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834485-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871929-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871930-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871931-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q89A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; R1R49A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732360-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834482-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL" → "Selection constraint for Compute: max 12"; Component Role: "(None)" → "Base Chassis"; Vendor Attributes: "{"listPrice":4459}" → "{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":4459,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P83806-B21` | Hardware | ATTRIBUTE_CHANGED | Sub-Category: "Server Management & Operating System Licenses" → "Compute"; Rule/Note: "Selection constraint for Server Management & Operating System Licenses: max 12; R1R47A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871940-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871941-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871942-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q88A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P22139-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P39531-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P83805-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732350-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732351-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732352-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834485-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871929-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871930-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871931-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q89A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; R1R49A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732360-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834482-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL" → "Selection constraint for Compute: max 12"; Component Role: "(None)" → "Base Chassis"; Vendor Attributes: "{"listPrice":4059}" → "{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":4059,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `732350-B21` | Hardware | ATTRIBUTE_CHANGED | Sub-Category: "Server Management & Operating System Licenses" → "Compute"; Rule/Note: "Selection constraint for Server Management & Operating System Licenses: max 12; R1R47A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871940-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871941-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871942-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q88A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P22139-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P39531-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P83805-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732350-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732351-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732352-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834485-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871929-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871930-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871931-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q89A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; R1R49A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732360-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834482-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL" → "Selection constraint for Compute: max 12"; Component Role: "(None)" → "Base Chassis"; Portal Visibility: "PORTAL_CONDITIONAL" → "(None)"; Condition Type: "PORTAL_CONDITIONAL_VIEW" → "(None)"; Vendor Attributes: "{}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"}" |
| `732351-B21` | Hardware | ATTRIBUTE_CHANGED | Sub-Category: "Server Management & Operating System Licenses" → "Compute"; Rule/Note: "Selection constraint for Server Management & Operating System Licenses: max 12; R1R47A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871940-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871941-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871942-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q88A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P22139-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P39531-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P83805-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732350-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732351-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732352-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834485-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871929-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871930-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871931-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q89A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; R1R49A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732360-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834482-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL" → "Selection constraint for Compute: max 12"; Component Role: "(None)" → "Base Chassis"; Portal Visibility: "PORTAL_CONDITIONAL" → "(None)"; Condition Type: "PORTAL_CONDITIONAL_VIEW" → "(None)"; Vendor Attributes: "{}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"}" |
| `732352-B21` | Hardware | ATTRIBUTE_CHANGED | Sub-Category: "Server Management & Operating System Licenses" → "Compute"; Rule/Note: "Selection constraint for Server Management & Operating System Licenses: max 12; R1R47A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871940-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871941-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871942-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q88A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P22139-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P39531-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P83805-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732350-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732351-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732352-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834485-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871929-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871930-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871931-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q89A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; R1R49A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732360-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834482-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL" → "Selection constraint for Compute: max 12"; Component Role: "(None)" → "Base Chassis"; Portal Visibility: "PORTAL_CONDITIONAL" → "(None)"; Condition Type: "PORTAL_CONDITIONAL_VIEW" → "(None)"; Vendor Attributes: "{}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"}" |
| `834485-B21` | Hardware | ATTRIBUTE_CHANGED | Sub-Category: "Server Management & Operating System Licenses" → "Compute"; Rule/Note: "Selection constraint for Server Management & Operating System Licenses: max 12; R1R47A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871940-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871941-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871942-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q88A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P22139-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P39531-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P83805-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732350-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732351-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732352-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834485-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871929-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871930-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871931-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q89A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; R1R49A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732360-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834482-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL" → "Selection constraint for Compute: max 12"; Component Role: "(None)" → "Base Chassis"; Portal Visibility: "PORTAL_CONDITIONAL" → "(None)"; Condition Type: "PORTAL_CONDITIONAL_VIEW" → "(None)"; Vendor Attributes: "{}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"}" |
| `871929-B21` | Hardware | ATTRIBUTE_CHANGED | Sub-Category: "Server Management & Operating System Licenses" → "Compute"; Rule/Note: "Selection constraint for Server Management & Operating System Licenses: max 12; R1R47A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871940-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871941-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871942-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q88A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P22139-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P39531-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P83805-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732350-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732351-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732352-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834485-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871929-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871930-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871931-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q89A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; R1R49A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732360-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834482-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL" → "Selection constraint for Compute: max 12"; Component Role: "(None)" → "Base Chassis"; Portal Visibility: "PORTAL_CONDITIONAL" → "(None)"; Condition Type: "PORTAL_CONDITIONAL_VIEW" → "(None)"; Vendor Attributes: "{"listPrice":11003}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":11003,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `871930-B21` | Hardware | ATTRIBUTE_CHANGED | Sub-Category: "Server Management & Operating System Licenses" → "Compute"; Rule/Note: "Selection constraint for Server Management & Operating System Licenses: max 12; R1R47A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871940-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871941-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871942-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q88A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P22139-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P39531-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P83805-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732350-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732351-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732352-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834485-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871929-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871930-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871931-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q89A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; R1R49A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732360-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834482-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL" → "Selection constraint for Compute: max 12"; Component Role: "(None)" → "Base Chassis"; Portal Visibility: "PORTAL_CONDITIONAL" → "(None)"; Condition Type: "PORTAL_CONDITIONAL_VIEW" → "(None)"; Vendor Attributes: "{"listPrice":10579}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":10579,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `871931-B21` | Hardware | ATTRIBUTE_CHANGED | Sub-Category: "Server Management & Operating System Licenses" → "Compute"; Rule/Note: "Selection constraint for Server Management & Operating System Licenses: max 12; R1R47A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871940-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871941-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871942-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q88A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P22139-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P39531-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P83805-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732350-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732351-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732352-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834485-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871929-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871930-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871931-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q89A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; R1R49A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732360-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834482-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL" → "Selection constraint for Compute: max 12"; Component Role: "(None)" → "Base Chassis"; Portal Visibility: "PORTAL_CONDITIONAL" → "(None)"; Condition Type: "PORTAL_CONDITIONAL_VIEW" → "(None)"; Vendor Attributes: "{"listPrice":11371}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":11371,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `Q9Q89A` | Hardware | ATTRIBUTE_CHANGED | Sub-Category: "Server Management & Operating System Licenses" → "Compute"; Rule/Note: "Selection constraint for Server Management & Operating System Licenses: max 12; R1R47A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871940-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871941-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871942-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q88A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P22139-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P39531-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P83805-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732350-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732351-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732352-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834485-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871929-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871930-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871931-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q89A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; R1R49A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732360-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834482-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL" → "Selection constraint for Compute: max 12"; Component Role: "(None)" → "Base Chassis"; Portal Visibility: "PORTAL_CONDITIONAL" → "(None)"; Condition Type: "PORTAL_CONDITIONAL_VIEW" → "(None)"; Vendor Attributes: "{"listPrice":10548}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":10548,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `R1R49A` | Hardware | ATTRIBUTE_CHANGED | Sub-Category: "Server Management & Operating System Licenses" → "Compute"; Rule/Note: "Selection constraint for Server Management & Operating System Licenses: max 12; R1R47A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871940-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871941-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871942-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q88A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P22139-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P39531-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P83805-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732350-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732351-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732352-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834485-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871929-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871930-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871931-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q89A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; R1R49A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732360-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834482-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL" → "Selection constraint for Compute: max 12"; Component Role: "(None)" → "Base Chassis"; Portal Visibility: "PORTAL_CONDITIONAL" → "(None)"; Condition Type: "PORTAL_CONDITIONAL_VIEW" → "(None)"; Vendor Attributes: "{"listPrice":9655}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":9655,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `732360-B21` | Hardware | ATTRIBUTE_CHANGED | Sub-Category: "Server Management & Operating System Licenses" → "Compute"; Rule/Note: "Selection constraint for Server Management & Operating System Licenses: max 12; R1R47A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871940-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871941-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871942-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q88A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P22139-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P39531-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P83805-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732350-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732351-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732352-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834485-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871929-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871930-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871931-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q89A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; R1R49A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732360-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834482-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL" → "Selection constraint for Compute: max 12"; Component Role: "(None)" → "Base Chassis"; Portal Visibility: "PORTAL_CONDITIONAL" → "(None)"; Condition Type: "PORTAL_CONDITIONAL_VIEW" → "(None)"; Vendor Attributes: "{}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"}" |
| `834482-B21` | Hardware | ATTRIBUTE_CHANGED | Sub-Category: "Server Management & Operating System Licenses" → "Compute"; Rule/Note: "Selection constraint for Server Management & Operating System Licenses: max 12; R1R47A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871940-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871941-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871942-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q88A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P22139-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P39531-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; P83805-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732350-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732351-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732352-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834485-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871929-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871930-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 871931-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; Q9Q89A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; R1R49A conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 732360-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL; 834482-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL" → "Selection constraint for Compute: max 12"; Component Role: "(None)" → "Base Chassis"; Portal Visibility: "PORTAL_CONDITIONAL" → "(None)"; Condition Type: "PORTAL_CONDITIONAL_VIEW" → "(None)"; Vendor Attributes: "{"listPrice":13245}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":13245,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P83805-B21` | Hardware | ATTRIBUTE_CHANGED | Rule/Note: "Non-TAA Model cannot support TAA products.; P83805-B21 conditional visibility: portal selector activation required (OB); PORTAL_CONDITIONAL" → "Non-TAA Model cannot support TAA products."; Component Role: "(None)" → "Option Component"; Portal Visibility: "PORTAL_CONDITIONAL" → "(None)"; Condition Type: "PORTAL_CONDITIONAL_VIEW" → "(None)"; Vendor Attributes: "{"listPrice":0}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":0,"priceState":"ZERO_UNCONFIRMED","priceStatus":"ZERO_UNCONFIRMED","rowType":"HARDWARE_OPTION"}" |
| `871943-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Base Chassis"; Vendor Attributes: "{"listPrice":11615}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":11615,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `871945-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Base Chassis"; Vendor Attributes: "{"listPrice":6605}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":6605,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `871946-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Base Chassis"; Vendor Attributes: "{"listPrice":4605}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":4605,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `826950-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Base Chassis"; Vendor Attributes: "{}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"}" |
| `826951-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Base Chassis"; Vendor Attributes: "{}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"}" |
| `826952-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Base Chassis"; Vendor Attributes: "{}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"}" |
| `826953-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Base Chassis"; Vendor Attributes: "{}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"}" |
| `826954-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Base Chassis"; Vendor Attributes: "{}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"}" |
| `834483-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Base Chassis"; Vendor Attributes: "{}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"}" |
| `834484-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Base Chassis"; Vendor Attributes: "{}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"}" |
| `871932-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Base Chassis"; Vendor Attributes: "{}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"}" |
| `871933-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Base Chassis"; Vendor Attributes: "{}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"}" |
| `871934-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Base Chassis"; Vendor Attributes: "{}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"}" |
| `826956-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Base Chassis"; Vendor Attributes: "{}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"}" |
| `826957-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Base Chassis"; Vendor Attributes: "{}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"}" |
| `826958-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Base Chassis"; Vendor Attributes: "{}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"}" |
| `834480-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Base Chassis"; Vendor Attributes: "{"listPrice":68475}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":68475,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `834481-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Base Chassis"; Vendor Attributes: "{"listPrice":48360}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":48360,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `835386-B21` | Hardware | ATTRIBUTE_CHANGED | Rule/Note: "Selection constraint for Storage: max 12; 835386-B21 conditional visibility: portal selector activation required (DS); PORTAL_CONDITIONAL; R1R48A conditional visibility: portal selector activation required (DS); PORTAL_CONDITIONAL" → "Selection constraint for Storage: max 12"; Component Role: "(None)" → "Composable Enclosure"; Portal Visibility: "PORTAL_CONDITIONAL" → "(None)"; Condition Type: "PORTAL_CONDITIONAL_VIEW" → "(None)"; Vendor Attributes: "{"listPrice":4411}" → "{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Direct Ship","listPrice":4411,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `R1R48A` | Hardware | ATTRIBUTE_CHANGED | Rule/Note: "Selection constraint for Storage: max 12; 835386-B21 conditional visibility: portal selector activation required (DS); PORTAL_CONDITIONAL; R1R48A conditional visibility: portal selector activation required (DS); PORTAL_CONDITIONAL" → "Selection constraint for Storage: max 12"; Component Role: "(None)" → "Composable Enclosure"; Portal Visibility: "PORTAL_CONDITIONAL" → "(None)"; Condition Type: "PORTAL_CONDITIONAL_VIEW" → "(None)"; Vendor Attributes: "{"listPrice":3895}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":3895,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `755984-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Composable Enclosure"; Vendor Attributes: "{}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"}" |
| `872957-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Option Component"; Vendor Attributes: "{"listPrice":10400}" → "{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":10400,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `804353-B21` | Hardware | ATTRIBUTE_CHANGED | Max Qty: "-3" → "(None)"; Component Role: "(None)" → "Option Component"; Vendor Attributes: "{"listPrice":2625}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":2625,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `804937-B21` | Hardware | ATTRIBUTE_CHANGED | Rule/Note: "If HPE Synergy 4-port Frame Link Module is included in the 12000 Frame, Synergy Image Streamer on Synergy Composer cannot be selected.; 804937-B21 conditional visibility: portal selector activation required (If HPE Synergy 4-port Frame Link Module is included in the 12000 Frame, Synergy Image Streamer on Synergy Composer cannot be selected.); PORTAL_CONDITIONAL" → "Selection constraint for System Options: optional; 804937-B21 conditional visibility: portal selector activation required (If HPE Synergy 4-port Frame Link Module is included in the 12000 Frame, Synergy Image Streamer on Synergy Composer cannot be selected.); PORTAL_CONDITIONAL"; Max Qty: "-3" → "(None)"; Component Role: "(None)" → "Option Component"; Vendor Attributes: "{"listPrice":13795}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":13795,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P54624-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Option Component"; Vendor Attributes: "{"listPrice":10400}" → "{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":10400,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P73869-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Option Component"; Vendor Attributes: "{"listPrice":10400}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":10400,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `876852-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Composable Enclosure"; Vendor Attributes: "{"listPrice":2210}" → "{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2210,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `804942-B21` | Hardware | ATTRIBUTE_CHANGED | Rule/Note: "Either Frame link Module or 4p Frame Link Module can be selected. Mixing is not allowed.; 804942-B21 conditional visibility: portal selector activation required (Either Frame link Module or 4p Frame Link Module can be selected. Mixing is not allowed.); PORTAL_CONDITIONAL" → "Selection constraint for Frame Link Module USB: max 99; 804942-B21 conditional visibility: portal selector activation required (Either Frame link Module or 4p Frame Link Module can be selected. Mixing is not allowed.); PORTAL_CONDITIONAL"; Component Role: "(None)" → "Composable Enclosure"; Vendor Attributes: "{"listPrice":1085}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1085,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |

## 🧩 6. Same-Product CTO Variant Matrix

| Chassis Identifier | Product Family | Generation | Form Factor | CTO Base SKU |
|--------------------|----------------|------------|-------------|--------------|
| **Synergy_12000_Frame** | Synergy | General | Frame | `P51174-B21` |

## 📦 9. Solution Manifest, EDT & Commercial Baseline

**Configuration Profile**: `OCA Config 2` | **Icon ID**: `I158326811-01` | **Estimated Delivery Time (EDT)**: `24 - 30 days`

### Structural Field & Evidence Coverage

- **Row Types**: BASE_SYSTEM: 1, HARDWARE_OPTION: 239, INTERNAL_CONFIGURATION: 7, SOFTWARE_SUBSCRIPTION: 95, SUPPORT_SERVICE: 106
- **Price States**: PRICED: 257, UNPRICED: 190, ZERO_UNCONFIRMED: 1
- **Lead-Time Measurement**: Numeric Days: 75, ETA Date Only: 0, Unpublished: 373
- **Visibility Coverage**: VISIBLE: 388, SELECTOR_HIDDEN: 60

## ⏱️ 10. Supply Chain & Delivery Lead Time Intelligence

### Confirmed Component Delivery SLAs

| Product # | Description | Category | Lead Time | Channel Status |
|---|---|---|---:|---|
| `P68217-B21` | HPE Synergy 480 Gen12 Configure-to-order Compute Module | Frame Options | 4 | Available |
| `P83806-B21` | HPE Synergy 480 Gen12 Solution Compute Node | Frame Options | 4 | Available |
| `835386-B21` | HPE Synergy D3940 12Gb SAS CTO Drive Enclosure with 40 SFF (2.5in) Drive Bays | Accessories & Infrastructure | 4 | Direct Ship (DS) |
| `872957-B21` | HPE Synergy Composer2 Management Appliance | Management Hardware | 4 | Available |
| `P54624-B21` | HPE Synergy Composer2 Management Appliance Kit | Management Hardware | 4 | Not published by OCA |
| `876852-B21` | HPE Synergy 4-port Frame Link Module | Management Hardware | 3 | Available |
| `P06458-B21` | HPE Synergy 4-port Frame Link Module USB Adapter | Management Hardware | 3 | Available |
| `867793-B21` | HPE Synergy 50Gb Interconnect Link Module | Networking | 3 | Available |
| `867796-B21` | HPE Virtual Connect SE 100Gb F32 Module for Synergy | Networking | 3 | Available |
| `P77653-B21` | Brocade 64Gb Fibre Channel Module for HPE Synergy | Networking | 3 | Available |
| `755985-B21` | HPE Synergy 12Gb SAS Connection Module with 12 Internal Ports | Networking | 4 | Direct Ship (DS) |
| `799330-B21` | HE Synergy 10Gb Pass-Thru Module | Networking | 4 | Obsolete (OB) |
| `876259-B21` | HPE Virtual Connect SE 32Gb Fibre Channel Module for Synergy | Networking | 4 | Available |
| `Q2E57A` | Brocade 32Gb/20 4SFP+ Power Pack+ Fibre Channel SAN Switch Module for HPE Synergy | Networking | 4 | Available |
| `487655-B21` | HPE BladeSystem c-Class 10GbE SFP+ to SFP+ 3m Direct Attach Copper Cable | Cables & Enablement Kits | 3 | Available |
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
| `845424-B21` | HPE QSFP28 to 4x25Gb SFP28 15m Active Optical Cable | Cables & Enablement Kits | 4 | Available |
| `J9283B` | HPE X242 10G SFP+ to SFP+ 3m Direct Attach Copper Cable | Cables & Enablement Kits | 5 | Obsolete (OB) |
| `JD097C` | HPE Networking X240 10G SFP+ SFP+ 3m DAC Cable | Cables & Enablement Kits | 13 | Available |
| `JG081C` | HPE Networking X240 10G SFP+ SFP+ 5m DAC Cable | Cables & Enablement Kits | 13 | Available |
| `G9Q68A` | HPE NonStop Category 6A 21 Foot Cable | Networking | 3 | Available |
*... [45 additional supply chain records omitted for brevity]*

### ⚠️ Supply Chain Verification Advisory (Unpublished Delivery Lead Times)

*The following high-value active components have unpublished delivery estimates in live OCA. Presales engineers must verify distributor buffer stock before quoting committed deployment timelines:*

| Product # | Description | Category | Lead Time Status | Presales Action |
|---|---|---|:---:|---|
| `P51174-B21` | HPE Synergy 12000 Configure-to-order Frame | Chassis | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `871929-B21` | HPE Synergy 660 Gen10 Configure-to-order Compute Module | Frame Options | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `871930-B21` | HPE Synergy 660 Gen10 Configure-to-order without Drive Bays Compute Module | Frame Options | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `871931-B21` | HPE Synergy 660 Gen10 Configure-to-order Premium Backplane Compute Module | Frame Options | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `Q9Q89A` | HPE Synergy 660 Gen10 for SAP HANA Tailored Datacenter Integration Compute Block | Frame Options | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `R1R49A` | HPE Synergy 660 Gen10 for SAP HANA Compute Block | Frame Options | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `834482-B21` | HPE Synergy 680 Gen9 4S-EX Configure-to-order Compute Module | Frame Options | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `871943-B21` | HPE Synergy 480 Gen10 6130 2P 64GB-R P204i-c SAS Performance Compute Module | Frame Options | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `871945-B21` | HPE Synergy 480 Gen10 5118 1P 32GB-R E208i-c Base Compute Module | Frame Options | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `834480-B21` | HPE Synergy 680 Gen9 4S-EX Performance Compute Module | Frame Options | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `834481-B21` | HPE Synergy 680 Gen9 4S-EX Base Compute Module | Frame Options | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `804937-B21` | HPE Synergy Image Streamer | Accessories & Infrastructure | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P73869-B21` | HPE Composer2 Plus Management Appliance | Management Hardware | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P68134-B21` | HPE Virtual Connect 64Gb Fibre Channel Module for HPE Synergy | Networking | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `779224-B23` | HPE Synergy 40Gb F8 Switch Module | Networking | **Unpublished** | Verify distributor inventory prior to SLA commitment |
*... [42 additional unpublished items omitted for brevity]*


<!-- MANAGED_FULL_CATALOG -->
Content fingerprint: f815957a446bc65f6865968f79857f8109d64993209e49089535bb08a3f0ac03

## Complete workbook text projection

Displayed cell values follow by sheet and original row. Formatting, charts and formulas remain in the Excel artifact. Repeated rows refer to the first identical row and schema; no content is replaced by a fingerprint.

### Category Summary

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Constraint | Min Qty | Max Qty | Total SKUs | Has Rules | Rule Count |
| 2 | Software | Solutions Software | no max | 0 | Unlimited | 0 | No | 0 |
| 3 | Unknown | HPE Workload Aware Security | max 1 | 0 | 1 | 0 | No | 0 |
| 4 | Unknown | Storage | max 12 | 0 | 12 | 0 | No | 0 |
| 5 | Cooling Options | Cooling Options | required | 1 | Required | 0 | No | 0 |
| 6 | Unknown | Compute | max 12 | 0 | 12 | 0 | No | 0 |
| 7 | Management Hardware | Appliance | max 2 | 0 | 2 | 3 | Yes | 5 |
| 8 | Management Hardware | Redundant Frame Link | max 2 | 0 | 2 | 1 | Yes | 1 |
| 9 | Management Hardware | Frame Link Module USB | max 99 | 0 | 99 | 2 | Yes | 3 |
| 10 | Interconnects | Interconnects | max 6 | 0 | 6 | 0 | No | 0 |
| 11 | Interconnects | Direct Attach Cables | max 18 | 0 | 18 | 0 | No | 0 |
| 12 | Interconnects | CAT Ethernet Cables | max 12 | 0 | 12 | 0 | No | 0 |
| 13 | Interconnects | Tape Storage | max 99 | 0 | 99 | 0 | No | 0 |
| 14 | Frame Options | Frame Options | max 2 | 0 | 2 | 0 | No | 0 |
| 15 | Frame Options | Rack Options | max 2 | 0 | 2 | 0 | No | 0 |
| 16 | Operating Environment | Red Hat Enterprise Linux Server | no max | 0 | Unlimited | 0 | No | 0 |
| 17 | Operating Environment | Non Preinstalled Operating System | no max | 0 | Unlimited | 0 | No | 0 |
| 18 | Cooling Options | Cooling Options (required) | max 10 | 0 | 10 | 0 | No | 0 |
| 19 | Cooling Options | Power Supply (required) | max 12 | 0 | 12 | 0 | No | 0 |
| 20 | Cooling Options | Power Supply | required | 1 | Required | 0 | No | 0 |
| 21 | Cooling Options | Accessories | max 6 | 0 | 6 | 0 | No | 0 |
| 22 | Cooling Options | Power Cords | max 12 | 0 | 12 | 0 | No | 0 |
| 23 | Cooling Options | Manufacturing Services | max 1 | 0 | 1 | 0 | No | 0 |
| 24 | Chassis | Variants | min 1, max 1 — Active OCA CTO chassis | 1 | 1 | 1 | Yes | 1 |
| 25 | Frame Options | Compute | max 12 | 0 | 12 | 21 | Yes | 1 |
| 26 | Accessories &amp; Infrastructure | Compute | max 12 | 0 | 12 | 1 | Yes | 1 |
| 27 | Frame Options | Smart Array SAS Controllers | max 12 | 0 | 12 | 18 | Yes | 19 |
| 28 | Accessories &amp; Infrastructure | Storage | max 12 | 0 | 12 | 2 | Yes | 1 |
| 29 | Drive Enclosures / Drives | SFF Drive Cages &amp; Enablement | max 24 | 0 | 24 | 1 | Yes | 2 |
| 30 | Accessories &amp; Infrastructure | System Options | optional | 0 | Optional | 22 | Yes | 5 |
| 31 | Networking | Optical Transceivers &amp; DAC Cables | max 6 | 0 | 6 | 21 | Yes | 1 |
| 32 | Networking | System Options | max 8 | 0 | 8 | 2 | Yes | 4 |
| 33 | Networking | PCIe Networking Adapters | max 8 | 0 | 8 | 15 | Yes | 16 |
| 34 | Cables &amp; Enablement Kits | Direct Attach Cables | max 18 | 0 | 18 | 37 | Yes | 1 |
| 35 | Networking | CAT Ethernet Cables | max 12 | 0 | 12 | 4 | Yes | 1 |
| 36 | Tape Drives | LTO Tape Drives | max 99 | 0 | 99 | 5 | Yes | 1 |
| 37 | Accessories &amp; Infrastructure | Frame Options | max 2 | 0 | 2 | 2 | Yes | 1 |
| 38 | Accessories &amp; Infrastructure | -48VDC Power Supplies &amp; Cable Kits | max 2 | 0 | 2 | 4 | Yes | 1 |
| 39 | Software &amp; Licenses | Red Hat Enterprise Linux Server | no max | 0 | Unlimited | 2 | Yes | 1 |
| 40 | Cooling / Thermal | High Performance &amp; Standard Fan Kits | max 6 | 0 | 6 | 1 | Yes | 1 |
| 41 | Power Supplies | Power Supply | required | 1 | Required | 12 | Yes | 13 |
| 42 | Cables &amp; Enablement Kits | Power Cords | max 12 | 0 | 12 | 36 | Yes | 2 |
| 43 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables |  | 0 | Unlimited | 8 | Yes | 9 |
| 44 | Power Supplies | -48VDC Power Supplies &amp; Cable Kits | min 1, max 2 | 1 | 2 | 1 | Yes | 2 |
| 45 | Drive Enclosures / Drives | Hard Disk Drives (SAS/SATA) | max 24 | 0 | 24 | 1 | Yes | 1 |
| 46 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | max 24 | 0 | 24 | 35 | Yes | 1 |
| 47 | Software &amp; Licenses | Non Preinstalled Operating System | no max | 0 | Unlimited | 58 | Yes | 1 |
| 48 | Support Services | Server Management &amp; Operating System Licenses | max 1 | 0 | 1 | 6 | Yes | 1 |
| 49 | Support Services | System Options |  | 0 | Unlimited | 80 | No | 0 |
| 50 | Support Services | Manufacturing Services | max 1 | 0 | 1 | 30 | Yes | 3 |
| 51 | Support Services | Support &amp; Deployment Services | max 8 | 0 | 8 | 10 | Yes | 1 |
| 52 | Support Services | Compute | max 12 | 0 | 12 | 6 | Yes | 1 |


### All SKUs

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |
| 2 | Chassis | Variants | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Chassis &gt; Variants | Base Chassis | min 1, max 1 | 1 | 1 | Select exactly one currently discoverable, non-TAA/non-GTA CTO base chassis | P51174-B21 | CTO | HPE Synergy 12000 Configure-to-order Frame | 1 | $6,130.00 |  |  |  |  | No | Available in OCA product catalog | Unpublished |  | Unpublished | Not published by OCA | Valid | Active |  |  |  |
| 3 | Frame Options | Compute | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Compute | Base Chassis | max 12 | 0 | 12 | Selection constraint for Compute: max 12 | R1R47A | CTO | HPE Synergy 480 Gen10 for SAP HANA Compute Block | 0 | $3,327.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 04/02/2019 | 07/31/2024 | [TEXT_1] |
| 4 | Frame Options | Compute | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Compute | Base Chassis | max 12 | 0 | 12 | Selection constraint for Compute: max 12 | 871940-B21 | CTO | HPE Synergy 480 Gen10 Configure-to-order Compute Module | 0 | $3,324.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 07/11/2017 | 05/02/2024 | [TEXT_2] |
| 5 | Frame Options | Compute | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Compute | Base Chassis | max 12 | 0 | 12 | Selection constraint for Compute: max 12 | 871941-B21 | CTO | HPE Synergy 480 Gen10 Configure-to-order without Drive Bays Compute Module | 0 | $3,136.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 07/11/2017 | 05/02/2024 | [TEXT_3] |
| 6 | Frame Options | Compute | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Compute | Base Chassis | max 12 | 0 | 12 | Selection constraint for Compute: max 12 | 871942-B21 | CTO | HPE Synergy 480 Gen10 Configure-to-order Premium Compute Module | 0 | $3,327.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 07/11/2017 | 05/02/2024 | [TEXT_1] |
| 7 | Frame Options | Compute | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Compute | Base Chassis | max 12 | 0 | 12 | Selection constraint for Compute: max 12 | Q9Q88A | CTO | HPE Synergy 480 Gen10 for SAP HANA Tailored Datacenter Integration Compute Block | 0 | $3,019.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 03/05/2018 | 10/31/2020 | [TEXT_4] |
| 8 | Frame Options | Compute | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Compute | Base Chassis | max 12 | 0 | 12 | Selection constraint for Compute: max 12 | P22139-B21 | CTO | HPE Synergy 480 Gen10 Plus Base Chassis Configure-to-order Compute Module | 0 | $3,843.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 07/06/2021 | 06/20/2024 | [TEXT_5] |
| 9 | Frame Options | Compute | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Compute | Base Chassis | max 12 | 0 | 12 | Selection constraint for Compute: max 12 | P39531-B21 | CTO | HPE Synergy 480 Gen11 Configure-to-order Compute Module | 0 | $3,463.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 03/06/2023 | 09/08/2026 | [TEXT_6] |
| 10 | Frame Options | Compute | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Compute | Base Chassis | max 12 | 0 | 12 | Selection constraint for Compute: max 12 | P83805-B21 | CTO | HPE Synergy 480 Gen11 Solution Compute Node | 0 | $3,463.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 07/07/2025 | 09/10/2026 | [TEXT_6] |
| 11 | Frame Options | Compute | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Compute | Base Chassis | max 12 | 0 | 12 | Selection constraint for Compute: max 12 | P68217-B21 | CTO | HPE Synergy 480 Gen12 Configure-to-order Compute Module | 0 | $4,459.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/05/2025 | 07/31/2029 | [TEXT_7] |
| 12 | Frame Options | Compute | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Compute | Base Chassis | max 12 | 0 | 12 | Selection constraint for Compute: max 12 | P83806-B21 | CTO | HPE Synergy 480 Gen12 Solution Compute Node | 0 | $4,059.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 07/07/2025 | 07/31/2029 | [TEXT_8] |
| 13 | Frame Options | Compute | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Compute | Base Chassis | max 12 | 0 | 12 | Selection constraint for Compute: max 12 | 732350-B21 | CTO | HPE Synergy 480 Gen9 Configure-to-order Compute Module | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 05/31/2018 | [TEXT_9] |
| 14 | Frame Options | Compute | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Compute | Base Chassis | max 12 | 0 | 12 | Selection constraint for Compute: max 12 | 732351-B21 | CTO | HPE Synergy 480 Gen9 Configure-to-order w/o Drive Bays Compute Module | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 05/31/2018 | [TEXT_9] |
| 15 | Frame Options | Compute | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Compute | Base Chassis | max 12 | 0 | 12 | Selection constraint for Compute: max 12 | 732352-B21 | CTO | HPE Synergy 480 Gen9 Configure-to-order Expanded Storage Compute Module | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/06/2016 | 05/31/2018 | [TEXT_9] |
| 16 | Frame Options | Compute | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Compute | Base Chassis | max 12 | 0 | 12 | Selection constraint for Compute: max 12 | 834485-B21 | CTO | HPE Synergy 620 Gen9 2S-EX Configure-to-order Compute Module | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/06/2016 | 05/31/2018 | [TEXT_9] |
| 17 | Frame Options | Compute | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Compute | Base Chassis | max 12 | 0 | 12 | Selection constraint for Compute: max 12 | 871929-B21 | CTO | HPE Synergy 660 Gen10 Configure-to-order Compute Module | 0 | $11,003.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 07/11/2017 | 02/28/2024 | [TEXT_10] |
| 18 | Frame Options | Compute | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Compute | Base Chassis | max 12 | 0 | 12 | Selection constraint for Compute: max 12 | 871930-B21 | CTO | HPE Synergy 660 Gen10 Configure-to-order without Drive Bays Compute Module | 0 | $10,579.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 07/11/2017 | 02/28/2024 | [TEXT_11] |
| 19 | Frame Options | Compute | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Compute | Base Chassis | max 12 | 0 | 12 | Selection constraint for Compute: max 12 | 871931-B21 | CTO | HPE Synergy 660 Gen10 Configure-to-order Premium Backplane Compute Module | 0 | $11,371.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 07/11/2017 | 02/28/2024 | [TEXT_12] |
| 20 | Frame Options | Compute | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Compute | Base Chassis | max 12 | 0 | 12 | Selection constraint for Compute: max 12 | Q9Q89A | CTO | HPE Synergy 660 Gen10 for SAP HANA Tailored Datacenter Integration Compute Block | 0 | $10,548.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 03/05/2018 | 10/31/2020 | [TEXT_13] |
| 21 | Frame Options | Compute | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Compute | Base Chassis | max 12 | 0 | 12 | Selection constraint for Compute: max 12 | R1R49A | CTO | HPE Synergy 660 Gen10 for SAP HANA Compute Block | 0 | $9,655.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 04/02/2019 | 02/28/2024 | [TEXT_14] |
| 22 | Frame Options | Compute | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Compute | Base Chassis | max 12 | 0 | 12 | Selection constraint for Compute: max 12 | 732360-B21 | CTO | HPE Synergy 660 Gen9 Configure-to-order SAS Compute Module | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 05/31/2018 | [TEXT_9] |
| 23 | Frame Options | Compute | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Compute | Base Chassis | max 12 | 0 | 12 | Selection constraint for Compute: max 12 | 834482-B21 | CTO | HPE Synergy 680 Gen9 4S-EX Configure-to-order Compute Module | 0 | $13,245.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/06/2016 | 04/30/2019 | [TEXT_15] |
| 24 | Accessories &amp; Infrastructure | Compute | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Accessories &amp; Infrastructure &gt; Compute | Option Component | max 12 | 0 | 12 | Non-TAA Model cannot support TAA products. | P83805-B21 | Standard | HPE Synergy 480 Gen11 for SAP HANA Compute Node | 0 | $0.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 07/07/2025 | 09/10/2026 | [TEXT_16] |
| 25 | Frame Options | Smart Array SAS Controllers | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Smart Array SAS Controllers | Base Chassis | max 12 | 0 | 12 | [TEXT_17] | 871943-B21 | CTO | HPE Synergy 480 Gen10 6130 2P 64GB-R P204i-c SAS Performance Compute Module | 0 | $11,615.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 07/11/2017 | 06/29/2019 | [TEXT_18] |
| 26 | Frame Options | Smart Array SAS Controllers | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Smart Array SAS Controllers | Base Chassis | max 12 | 0 | 12 | [TEXT_19] | 871945-B21 | CTO | HPE Synergy 480 Gen10 5118 1P 32GB-R E208i-c Base Compute Module | 0 | $6,605.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 07/11/2017 | 03/29/2019 | [TEXT_20] |
| 27 | Frame Options | Smart Array SAS Controllers | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Smart Array SAS Controllers | Base Chassis | max 12 | 0 | 12 | [TEXT_21] | 871946-B21 | CTO | HPE Synergy 480 Gen10 3104 1P 16GB-R S100i SATA Entry Compute Module | 0 | $4,605.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 07/11/2017 | 03/29/2019 | [TEXT_22] |
| 28 | Frame Options | Smart Array SAS Controllers | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Smart Array SAS Controllers | Base Chassis | max 12 | 0 | 12 | [TEXT_23] | 826950-B21 | CTO | HPE Synergy 480 Gen9 E5-2680 v4 2P 128GB-L P240nr Performance Compute Module | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 05/31/2018 | [TEXT_9] |
| 29 | Frame Options | Smart Array SAS Controllers | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Smart Array SAS Controllers | Base Chassis | max 12 | 0 | 12 | [TEXT_24] | 826951-B21 | CTO | HPE Synergy 480 Gen9 E5-2660 v4 2P 64GB-R P240nr Performance Compute Module | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 05/31/2018 | [TEXT_9] |
| 30 | Frame Options | Smart Array SAS Controllers | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Smart Array SAS Controllers | Base Chassis | max 12 | 0 | 12 | [TEXT_25] | 826952-B21 | CTO | HPE Synergy 480 Gen9 E5-2650 v4 1P 64GB-R P240nr Base Compute Module | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 05/31/2018 | [TEXT_9] |
| 31 | Frame Options | Smart Array SAS Controllers | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Smart Array SAS Controllers | Base Chassis | max 12 | 0 | 12 | [TEXT_26] | 826953-B21 | CTO | HPE Synergy 480 Gen9 E5-2630 v4 1P 32GB-R P240nr Base Compute Module | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 05/31/2018 | [TEXT_9] |
| 32 | Frame Options | Smart Array SAS Controllers | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Smart Array SAS Controllers | Base Chassis | max 12 | 0 | 12 | [TEXT_27] | 826954-B21 | CTO | HPE Synergy 480 Gen9 E5-2609 v4 1P 16GB-R H240nr Entry Compute Module | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 05/31/2018 | [TEXT_9] |
| 33 | Frame Options | Smart Array SAS Controllers | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Smart Array SAS Controllers | Base Chassis | max 12 | 0 | 12 | [TEXT_28] | 834483-B21 | CTO | HPE Synergy 620 Gen9 2S-EX Performance Compute Module | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/06/2016 | 05/31/2018 | [TEXT_9] |
| 34 | Frame Options | Smart Array SAS Controllers | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Smart Array SAS Controllers | Base Chassis | max 12 | 0 | 12 | [TEXT_29] | 834484-B21 | CTO | HPE Synergy 620 Gen9 2S-EX Base Compute Module | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/06/2016 | 05/31/2018 | [TEXT_9] |
| 35 | Frame Options | Smart Array SAS Controllers | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Smart Array SAS Controllers | Base Chassis | max 12 | 0 | 12 | [TEXT_30] | 871932-B21 | CTO | HPE Synergy 660 Gen10 8160 4P 256GB-R P408i-c SAS Performance Compute Module | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 07/11/2017 | 01/31/2019 | [TEXT_9] |
| 36 | Frame Options | Smart Array SAS Controllers | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Smart Array SAS Controllers | Base Chassis | max 12 | 0 | 12 | [TEXT_31] | 871933-B21 | CTO | HPE Synergy 660 Gen10 6140 2P 128GB-R E208i-c Base Compute Module | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 07/11/2017 | 01/31/2019 | [TEXT_9] |
| 37 | Frame Options | Smart Array SAS Controllers | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Smart Array SAS Controllers | Base Chassis | max 12 | 0 | 12 | [TEXT_32] | 871934-B21 | CTO | HPE Synergy 660 Gen10 5118 2P 64GB-R S100i SATA Entry Compute Module | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 07/11/2017 | 01/31/2019 | [TEXT_9] |
| 38 | Frame Options | Smart Array SAS Controllers | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Smart Array SAS Controllers | Base Chassis | max 12 | 0 | 12 | [TEXT_33] | 826956-B21 | CTO | HPE SY 660 Gen9 E5-4650v4 4P Cmpt Mdl | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/23/2016 | 05/31/2018 | [TEXT_9] |
| 39 | Frame Options | Smart Array SAS Controllers | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Smart Array SAS Controllers | Base Chassis | max 12 | 0 | 12 | [TEXT_34] | 826957-B21 | CTO | HPE SY 660 Gen9 E5-4620v4 4P Cmpt Mdl | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/23/2016 | 05/31/2018 | [TEXT_9] |
| 40 | Frame Options | Smart Array SAS Controllers | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Smart Array SAS Controllers | Base Chassis | max 12 | 0 | 12 | [TEXT_35] | 826958-B21 | CTO | HPE SY 660 Gen9 E5-4610v4 2P Cmpt Mdl | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/23/2016 | 05/31/2018 | [TEXT_9] |
| 41 | Frame Options | Smart Array SAS Controllers | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Smart Array SAS Controllers | Base Chassis | max 12 | 0 | 12 | [TEXT_36] | 834480-B21 | CTO | HPE Synergy 680 Gen9 4S-EX Performance Compute Module | 0 | $68,475.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/06/2016 | 04/30/2019 | [TEXT_37] |
| 42 | Frame Options | Smart Array SAS Controllers | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Frame Options &gt; Smart Array SAS Controllers | Base Chassis | max 12 | 0 | 12 | [TEXT_38] | 834481-B21 | CTO | HPE Synergy 680 Gen9 4S-EX Base Compute Module | 0 | $48,360.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/06/2016 | 04/30/2019 | [TEXT_39] |
| 43 | Accessories &amp; Infrastructure | Storage | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Accessories &amp; Infrastructure &gt; Storage | Composable Enclosure | max 12 | 0 | 12 | Selection constraint for Storage: max 12 | 835386-B21 | Standard | HPE Synergy D3940 12Gb SAS CTO Drive Enclosure with 40 SFF (2.5in) Drive Bays | 0 | $4,411.00 |  |  | NA |  | No | Direct Ship (DS) | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Direct Ship (DS) | 01/05/2017 | 11/30/2026 | [TEXT_40] |
| 44 | Accessories &amp; Infrastructure | Storage | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Accessories &amp; Infrastructure &gt; Storage | Composable Enclosure | max 12 | 0 | 12 | Selection constraint for Storage: max 12 | R1R48A | Standard | HPE Solutions for SAP HANA with D3940 Storage | 0 | $3,895.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 04/02/2019 | 10/30/2021 | [TEXT_41] |
| 45 | Drive Enclosures / Drives | SFF Drive Cages &amp; Enablement | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Drive Enclosures / Drives &gt; SFF Drive Cages &amp; Enablement | Composable Enclosure | max 24 | 0 | 24 | [TEXT_42] | 755984-B21 | Standard | HPE Synergy D3940 12Gb SAS Drive Enclosure with 40 SFF (2.5in) Drive Bays | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 01/05/2017 | 05/31/2018 | [TEXT_9] |
| 46 | Management Hardware | Appliance | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Management Hardware &gt; Appliance | Option Component | max 2 | 0 | 2 | Selection constraint for Appliance: max 2 | 872957-B21 | Standard | HPE Synergy Composer2 Management Appliance | 2 | $10,400.00 |  |  | $20,800.00 |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/03/2019 | 03/31/2027 | [TEXT_43] |
| 47 | Accessories &amp; Infrastructure | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Accessories &amp; Infrastructure &gt; System Options | Option Component | Optional | 0 | Optional | [TEXT_44] | 804353-B21 | Standard | HPE Synergy Composer | 0 | $2,625.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 01/05/2017 | 03/24/2020 | [TEXT_45] |
| 48 | Accessories &amp; Infrastructure | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Accessories &amp; Infrastructure &gt; System Options | Option Component | Optional | 0 | Optional | [TEXT_46] | 804937-B21 | Standard | HPE Synergy Image Streamer | 0 | $13,795.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 01/05/2017 | 12/01/2021 | [TEXT_47] |
| 49 | Management Hardware | Appliance | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Management Hardware &gt; Appliance | Option Component | max 2 | 0 | 2 | [TEXT_48] | P54624-B21 | Standard | HPE Synergy Composer2 Management Appliance Kit | 0 | $10,400.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/04/2022 | 03/31/2027 | [TEXT_43] |
| 50 | Management Hardware | Appliance | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Management Hardware &gt; Appliance | Option Component | max 2 | 0 | 2 | [TEXT_49] | P73869-B21 | Standard | HPE Composer2 Plus Management Appliance | 0 | $10,400.00 |  |  | NA |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 07/06/2026 | 12/31/2030 | [TEXT_50] |
| 51 | Management Hardware | Redundant Frame Link | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Management Hardware &gt; Redundant Frame Link | Composable Enclosure | max 2 | 0 | 2 | Selection constraint for Redundant Frame Link: max 2 | 876852-B21 | Standard | HPE Synergy 4-port Frame Link Module | 2 | $2,210.00 |  |  | $4,420.00 |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/03/2019 | 12/31/2032 | [TEXT_51] |
| 52 | Management Hardware | Frame Link Module USB | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Management Hardware &gt; Frame Link Module USB | Composable Enclosure | max 99 | 0 | 99 | [TEXT_52] | 804942-B21 | Standard | HPE Synergy Frame Link Module | 0 | $1,085.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 01/05/2017 | 09/30/2021 | [TEXT_53] |
| 53 | Management Hardware | Frame Link Module USB | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Management Hardware &gt; Frame Link Module USB | Composable Enclosure | max 99 | 0 | 99 | Selection constraint for Frame Link Module USB: max 99 | P06458-B21 | Standard | HPE Synergy 4-port Frame Link Module USB Adapter | 0 | $167.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/03/2019 | 12/31/2032 | [TEXT_54] |
| 54 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Fabric Interconnect | max 6 | 0 | 6 | Selection constraint for Optical Transceivers &amp; DAC Cables: max 6 | 867793-B21 | Standard | HPE Synergy 50Gb Interconnect Link Module | 0 | $12,259.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 07/01/2019 | 12/31/2030 | [TEXT_55] |
| 55 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Fabric Interconnect | max 6 | 0 | 6 | Selection constraint for Optical Transceivers &amp; DAC Cables: max 6 | 867796-B21 | Standard | HPE Virtual Connect SE 100Gb F32 Module for Synergy | 2 | $23,527.00 |  |  | $47,054.00 |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 07/01/2019 | 12/31/2027 | [TEXT_56] |
| 56 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Fabric Interconnect | max 6 | 0 | 6 | Selection constraint for Optical Transceivers &amp; DAC Cables: max 6 | P68134-B21 | Standard | HPE Virtual Connect 64Gb Fibre Channel Module for HPE Synergy | 0 | $63,999.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 07/06/2026 | 07/31/2030 | [TEXT_57] |
| 57 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Fabric Interconnect | max 6 | 0 | 6 | Selection constraint for Optical Transceivers &amp; DAC Cables: max 6 | P77653-B21 | Standard | Brocade 64Gb Fibre Channel Module for HPE Synergy | 0 | $63,999.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 02/02/2026 | 12/31/2032 | [TEXT_58] |
| 58 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Fabric Interconnect | max 6 | 0 | 6 | Selection constraint for Optical Transceivers &amp; DAC Cables: max 6 | 755985-B21 | Standard | HPE Synergy 12Gb SAS Connection Module with 12 Internal Ports | 0 | $2,099.00 |  |  | NA |  | No | Direct Ship (DS) | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Direct Ship (DS) | 01/05/2017 | 11/30/2026 | [TEXT_59] |
| 59 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Fabric Interconnect | max 6 | 0 | 6 | Selection constraint for Optical Transceivers &amp; DAC Cables: max 6 | 779215-B21 | Standard | HPE Synergy 10Gb Interconnect Link Module | 0 | $3,480.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 01/05/2017 | 12/31/2022 | [TEXT_60] |
| 60 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Fabric Interconnect | max 6 | 0 | 6 | Selection constraint for Optical Transceivers &amp; DAC Cables: max 6 | 779218-B21 | Standard | HPE Synergy 20Gb Interconnect Link Module | 0 | $3,740.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 01/05/2017 | 12/31/2022 | [TEXT_61] |
| 61 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Fabric Interconnect | max 6 | 0 | 6 | Selection constraint for Optical Transceivers &amp; DAC Cables: max 6 | 779224-B23 | Standard | HPE Synergy 40Gb F8 Switch Module | 0 | $24,356.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 01/05/2017 | 12/31/2020 | [TEXT_62] |
| 62 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Fabric Interconnect | max 6 | 0 | 6 | Selection constraint for Optical Transceivers &amp; DAC Cables: max 6 | 779227-B21 | Standard | HPE Virtual Connect SE 16Gb Fibre Channel Module for Synergy | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 01/05/2017 | 02/15/2019 | [TEXT_9] |
| 63 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Fabric Interconnect | max 6 | 0 | 6 | Selection constraint for Optical Transceivers &amp; DAC Cables: max 6 | 799330-B21 | Standard | HE Synergy 10Gb Pass-Thru Module | 0 | $7,722.00 |  |  | NA |  | No | Obsolete (OB) | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Obsolete (OB) | 01/05/2017 | 08/31/2026 | [TEXT_63] |
| 64 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Fabric Interconnect | max 6 | 0 | 6 | Selection constraint for Optical Transceivers &amp; DAC Cables: max 6 | 876259-B21 | Standard | HPE Virtual Connect SE 32Gb Fibre Channel Module for Synergy | 0 | $28,481.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/02/2019 | 11/30/2027 | [TEXT_64] |
| 65 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Fabric Interconnect | max 6 | 0 | 6 | Selection constraint for Optical Transceivers &amp; DAC Cables: max 6 | K2Q83A | Standard | Brocade 16Gb/12 Fibre Channel SAN Switch Module for HPE Synergy | 0 | $13,156.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 08/14/2020 | [TEXT_65] |
| 66 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Fabric Interconnect | max 6 | 0 | 6 | Selection constraint for Optical Transceivers &amp; DAC Cables: max 6 | K2Q83B | Standard | Brocade 16Gb/12 Fibre Channel SAN Switch Module for HPE Synergy | 0 | $11,780.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/01/2018 | 07/06/2021 | [TEXT_66] |
| 67 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Fabric Interconnect | max 6 | 0 | 6 | Selection constraint for Optical Transceivers &amp; DAC Cables: max 6 | K2Q84A | Standard | Brocade 16Gb/24 Fibre Channel SAN Switch Module for HPE Synergy | 0 | $18,058.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 04/06/2019 | [TEXT_67] |
| 68 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Fabric Interconnect | max 6 | 0 | 6 | Selection constraint for Optical Transceivers &amp; DAC Cables: max 6 | K2Q84B | Standard | Brocade 16Gb/24 Fibre Channel SAN Switch Module for HPE Synergy | 0 | $16,169.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/01/2018 | 04/07/2021 | [TEXT_68] |
| 69 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Fabric Interconnect | max 6 | 0 | 6 | Selection constraint for Optical Transceivers &amp; DAC Cables: max 6 | K2Q86A | Standard | Brocade 16Gb/24 PowerPack+ Fibre Channel SAN Switch Module for HPE Synergy | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 06/29/2019 | [TEXT_9] |
| 70 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Fabric Interconnect | max 6 | 0 | 6 | Selection constraint for Optical Transceivers &amp; DAC Cables: max 6 | K2Q86B | Standard | Brocade 16Gb/24 PowerPack+ Fibre Channel SAN Switch Module for HPE Synergy | 0 | $25,870.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/01/2018 | 08/31/2021 | [TEXT_69] |
| 71 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Fabric Interconnect | max 6 | 0 | 6 | Selection constraint for Optical Transceivers &amp; DAC Cables: max 6 | P08477-B21 | Standard | HPE Virtual Connect SE 16Gb Fibre Channel Module for HPE Synergy | 0 | $20,959.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/05/2018 | 12/14/2023 | [TEXT_70] |
| 72 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Fabric Interconnect | max 6 | 0 | 6 | Selection constraint for Optical Transceivers &amp; DAC Cables: max 6 | Q2E55A | Standard | Brocade 32Gb/12 2SFP+ Fibre Channel SAN Switch Module for HPE Synergy | 0 | $18,355.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 04/02/2019 | 03/01/2023 | [TEXT_71] |
| 73 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Fabric Interconnect | max 6 | 0 | 6 | Selection constraint for Optical Transceivers &amp; DAC Cables: max 6 | Q2E56A | Standard | Brocade 32Gb/20 4SFP+ Fibre Channel SAN Switch Module for HPE Synergy | 0 | $25,029.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 04/02/2019 | 01/11/2026 | [TEXT_72] |
| 74 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Fabric Interconnect | max 6 | 0 | 6 | Selection constraint for Optical Transceivers &amp; DAC Cables: max 6 | Q2E57A | Standard | Brocade 32Gb/20 4SFP+ Power Pack+ Fibre Channel SAN Switch Module for HPE Synergy | 0 | $38,712.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/02/2019 | 11/30/2027 | [TEXT_73] |
| 75 | Networking | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; System Options | Network Switch | max 8 | 0 | 8 | [TEXT_74] | 489184-B21 | Standard | HPE 4X QDR InfiniBand Switch Module for c-Class BladeSystem                       Product is obsolete: 489184-B21 ($c) | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 02/12/2016 | [TEXT_9] |
| 76 | Networking | PCIe Networking Adapters | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; PCIe Networking Adapters | Network Switch | max 8 | 0 | 8 | [TEXT_75] | 648312-B21 | Standard | HPE 4X FDR InfiniBand Switch Module for c-Class BladeSystem | 0 | $15,665.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 10/31/2020 | [TEXT_76] |
| 77 | Networking | PCIe Networking Adapters | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; PCIe Networking Adapters | Network Switch | max 8 | 0 | 8 | [TEXT_77] | 658247-B21 | Standard | HPE 6125G Ethernet Blade Switch | 0 | $2,420.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 02/12/2021 | [TEXT_78] |
| 78 | Networking | PCIe Networking Adapters | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; PCIe Networking Adapters | Network Switch | max 8 | 0 | 8 | [TEXT_79] | 674280-B21 | Standard | Mellanox InfiniBand QDR/FDR Modular Management Board | 0 | $12,575.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 04/22/2019 | [TEXT_80] |
| 79 | Networking | PCIe Networking Adapters | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; PCIe Networking Adapters | Network Switch | max 8 | 0 | 8 | [TEXT_81] | 674281-B21 | Standard | Mellanox InfiniBand QDR Modular Fabric Board | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 02/28/2017 | [TEXT_9] |
| 80 | Networking | PCIe Networking Adapters | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; PCIe Networking Adapters | Network Switch | max 8 | 0 | 8 | [TEXT_82] | 674282-B21 | Standard | Mellanox InfiniBand FDR Modular Fabric Board | 0 | $21,815.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 04/30/2019 | [TEXT_83] |
| 81 | Networking | PCIe Networking Adapters | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; PCIe Networking Adapters | Network Switch | max 8 | 0 | 8 | [TEXT_84] | 674283-B21 | Standard | Mellanox InfiniBand QDR Modular Line Board | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 02/28/2017 | [TEXT_9] |
| 82 | Networking | PCIe Networking Adapters | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; PCIe Networking Adapters | Network Switch | max 8 | 0 | 8 | [TEXT_85] | 674284-B21 | Standard | Mellanox InfiniBand FDR Modular Line Board | 0 | $18,920.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 04/30/2019 | [TEXT_86] |
| 83 | Networking | PCIe Networking Adapters | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; PCIe Networking Adapters | Network Switch | max 8 | 0 | 8 | [TEXT_87] | 829914-B21 | Standard | Intel Omni-Path Architecture Director Switch Fabric Board | 0 | $22,599.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/06/2016 | 04/30/2022 | [TEXT_88] |
| 84 | Networking | PCIe Networking Adapters | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; PCIe Networking Adapters | Network Switch | max 8 | 0 | 8 | [TEXT_89] | 829915-B21 | Standard | Intel Omni-Path Architecture 32-port QSFP28 Director Switch Line Board | 0 | $26,999.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/06/2016 | 04/30/2022 | [TEXT_90] |
| 85 | Networking | PCIe Networking Adapters | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; PCIe Networking Adapters | Network Switch | max 8 | 0 | 8 | [TEXT_91] | 829916-B21 | Standard | Intel Omni-Path Architecture Director Switch Management Module | 0 | $5,719.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/06/2016 | 04/30/2022 | [TEXT_92] |
| 86 | Networking | PCIe Networking Adapters | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; PCIe Networking Adapters | Network Switch | max 8 | 0 | 8 | [TEXT_93] | 843191-B21 | Standard | Mellanox InfiniBand EDR Modular Management Board | 0 | $17,679.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/06/2016 | 09/30/2023 | [TEXT_94] |
| 87 | Networking | PCIe Networking Adapters | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; PCIe Networking Adapters | Network Switch | max 8 | 0 | 8 | [TEXT_95] | 843192-B21 | Standard | Mellanox InfiniBand EDR Modular Fabric Board | 0 | $31,199.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/06/2016 | 09/30/2023 | [TEXT_96] |
| 88 | Networking | PCIe Networking Adapters | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; PCIe Networking Adapters | Network Switch | max 8 | 0 | 8 | [TEXT_97] | 843193-B21 | Standard | Mellanox InfiniBand EDR 36 Port Modular Line Board | 0 | $56,783.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/06/2016 | 09/30/2023 | [TEXT_98] |
| 89 | Networking | PCIe Networking Adapters | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; PCIe Networking Adapters | Network Switch | max 8 | 0 | 8 | [TEXT_99] | 846041-B21 | Standard | Intel Omni-Path Architecture Director Switch Power Supply Module | 0 | $2,249.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/06/2016 | 04/30/2022 | [TEXT_100] |
| 90 | Networking | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; System Options | Fabric Interconnect | max 8 | 0 | 8 | [TEXT_101] | 794502-B23 | Standard | HPE Virtual Connect SE 40Gb F8 Module for Synergy | 0 | $25,999.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 01/05/2017 | 06/30/2021 | [TEXT_102] |
| 91 | Cables &amp; Enablement Kits | Direct Attach Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Direct Attach Cables | Transceiver | max 18 | 0 | 18 | Selection constraint for Direct Attach Cables: max 18 | 487655-B21 | Standard | HPE BladeSystem c-Class 10GbE SFP+ to SFP+ 3m Direct Attach Copper Cable | 0 | $285.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 08/30/2027 | [TEXT_103] |
| 92 | Cables &amp; Enablement Kits | Direct Attach Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Direct Attach Cables | Transceiver | max 18 | 0 | 18 | Selection constraint for Direct Attach Cables: max 18 | 537963-B21 | Standard | HPE BladeSystem c-Class 10GbE SFP+ to SFP+ 5m Direct Attach Copper Cable | 0 | $327.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 08/30/2027 | [TEXT_104] |
| 93 | Cables &amp; Enablement Kits | Direct Attach Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Direct Attach Cables | Transceiver | max 18 | 0 | 18 | Selection constraint for Direct Attach Cables: max 18 | 720211-B21 | Standard | HPE BladeSystem c-Class 40G QSFP+ to QSFP+ 15m Active Optical Cable | 0 | $1,711.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 08/30/2027 | [TEXT_105] |
| 94 | Cables &amp; Enablement Kits | Direct Attach Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Direct Attach Cables | Transceiver | max 18 | 0 | 18 | Selection constraint for Direct Attach Cables: max 18 | 721064-B21 | Standard | HPE BladeSystem c-Class 40G QSFP+ to 4x10G SFP+ 3m Direct Attach Copper Splitter Cable | 0 | $729.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 12/31/2030 | [TEXT_106] |
| 95 | Cables &amp; Enablement Kits | Direct Attach Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Direct Attach Cables | Transceiver | max 18 | 0 | 18 | Selection constraint for Direct Attach Cables: max 18 | 721076-B21 | Standard | HPE BladeSystem c-Class QSFP+ to 4x10G SFP+ 15m Active Optical Cable | 0 | $2,408.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 08/30/2027 | [TEXT_107] |
| 96 | Cables &amp; Enablement Kits | Direct Attach Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Direct Attach Cables | Transceiver | max 18 | 0 | 18 | Selection constraint for Direct Attach Cables: max 18 | 845406-B21 | Standard | HPE 100Gb QSFP28 to QSFP28 3m Direct Attach Copper Cable | 0 | $685.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 06/06/2016 | 12/31/2030 | [TEXT_108] |
| 97 | Cables &amp; Enablement Kits | Direct Attach Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Direct Attach Cables | Transceiver | max 18 | 0 | 18 | Selection constraint for Direct Attach Cables: max 18 | 845408-B21 | Standard | HPE 100Gb QSFP28 to QSFP28 5m Direct Attach Copper Cable | 0 | $788.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 06/06/2016 | 08/31/2027 | [TEXT_109] |
| 98 | Cables &amp; Enablement Kits | Direct Attach Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Direct Attach Cables | Transceiver | max 18 | 0 | 18 | Selection constraint for Direct Attach Cables: max 18 | 845410-B21 | Standard | HPE 100Gb QSFP28 to QSFP28 7m Active Optical Cable | 0 | $2,861.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/25/2017 | 08/30/2027 | [TEXT_110] |
| 99 | Cables &amp; Enablement Kits | Direct Attach Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Direct Attach Cables | Transceiver | max 18 | 0 | 18 | Selection constraint for Direct Attach Cables: max 18 | 845414-B21 | Standard | HPE 100Gb QSFP28 to QSFP28 15m Active Optical Cable | 0 | $2,972.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/25/2017 | 08/30/2027 | [TEXT_111] |
| 100 | Cables &amp; Enablement Kits | Direct Attach Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Direct Attach Cables | Transceiver | max 18 | 0 | 18 | Selection constraint for Direct Attach Cables: max 18 | 845416-B21 | Standard | HPE 100Gb QSFP28 to 4x25Gb SFP28 3m Direct Attach Copper Cable | 0 | $916.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 06/06/2016 | 08/31/2027 | [TEXT_112] |
| 101 | Cables &amp; Enablement Kits | Direct Attach Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Direct Attach Cables | Transceiver | max 18 | 0 | 18 | Selection constraint for Direct Attach Cables: max 18 | 845420-B21 | Standard | HPE QSFP28 to 4x25Gb SFP28 7m Active Optical Cable | 0 | $3,437.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 12/03/2018 | 08/30/2027 | [TEXT_113] |
| 102 | Cables &amp; Enablement Kits | Direct Attach Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Direct Attach Cables | Transceiver | max 18 | 0 | 18 | Selection constraint for Direct Attach Cables: max 18 | 487649-B21 | Standard | HPE BladeSystem c-Class 10GbE SFP+ to SFP+ 0.5m Direct Attach Copper Cable | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 01/31/2018 | [TEXT_9] |
| 103 | Cables &amp; Enablement Kits | Direct Attach Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Direct Attach Cables | Transceiver | max 18 | 0 | 18 | Selection constraint for Direct Attach Cables: max 18 | 487652-B21 | Standard | HPE BladeSystem c-Class 10GbE SFP+ to SFP+ 1m Direct Attach Copper Cable | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 01/31/2019 | [TEXT_9] |
| 104 | Cables &amp; Enablement Kits | Direct Attach Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Direct Attach Cables | Transceiver | max 18 | 0 | 18 | Selection constraint for Direct Attach Cables: max 18 | 720196-B21 | Standard | HPE BladeSystem c-Class 40G QSFP+ to QSFP+ 1m Direct Attach Copper Cable | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 01/31/2019 | [TEXT_9] |
| 105 | Cables &amp; Enablement Kits | Direct Attach Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Direct Attach Cables | Transceiver | max 18 | 0 | 18 | Selection constraint for Direct Attach Cables: max 18 | 720199-B21 | Standard | HPE BladeSystem c-Class 40G QSFP+ to QSFP+ 3m Direct Attach Copper Cable | 0 | $516.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 12/31/2024 | [TEXT_114] |
| 106 | Cables &amp; Enablement Kits | Direct Attach Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Direct Attach Cables | Transceiver | max 18 | 0 | 18 | Selection constraint for Direct Attach Cables: max 18 | 720202-B21 | Standard | HPE BladeSystem c-Class 40G QSFP+ to QSFP+ 5m Direct Attach Copper Cable | 0 | $789.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 11/25/2024 | [TEXT_115] |
| 107 | Cables &amp; Enablement Kits | Direct Attach Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Direct Attach Cables | Transceiver | max 18 | 0 | 18 | Selection constraint for Direct Attach Cables: max 18 | 720205-B21 | Standard | HPE BladeSystem c-Class 40G QSFP+ to QSFP+ 7m Active Optical Cable | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 01/31/2019 | [TEXT_9] |
| 108 | Cables &amp; Enablement Kits | Direct Attach Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Direct Attach Cables | Transceiver | max 18 | 0 | 18 | Selection constraint for Direct Attach Cables: max 18 | 720208-B21 | Standard | HPE BladeSystem c-Class 40G QSFP+ to QSFP+ 10m Active Optical Cable | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 01/31/2018 | [TEXT_9] |
| 109 | Cables &amp; Enablement Kits | Direct Attach Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Direct Attach Cables | Transceiver | max 18 | 0 | 18 | Selection constraint for Direct Attach Cables: max 18 | 721067-B21 | Standard | HPE BladeSystem c-Class 40G QSFP+ to 4x10G SFP+ 5m Direct Attach Copper Splitter Cable | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 01/31/2018 | [TEXT_9] |
| 110 | Cables &amp; Enablement Kits | Direct Attach Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Direct Attach Cables | Transceiver | max 18 | 0 | 18 | Selection constraint for Direct Attach Cables: max 18 | 721070-B21 | Standard | HPE BladeSystem c-Class QSFP+ to 4x10G SFP+ 7m Active Optical Cable | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 01/31/2019 | [TEXT_9] |
| 111 | Cables &amp; Enablement Kits | Direct Attach Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Direct Attach Cables | Transceiver | max 18 | 0 | 18 | Selection constraint for Direct Attach Cables: max 18 | 721073-B21 | Standard | HPE BladeSystem c-Class QSFP+ to 4x10G SFP+ 10m Active Optical Cable | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 01/31/2018 | [TEXT_9] |
| 112 | Cables &amp; Enablement Kits | Direct Attach Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Direct Attach Cables | Transceiver | max 18 | 0 | 18 | Selection constraint for Direct Attach Cables: max 18 | 730907-B21 | Standard | HPE BladeSystem c-Class 40G QSFP+ to QSFP+ .35m Direct Attach Copper Cable | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 10/16/2018 | [TEXT_9] |
| 113 | Cables &amp; Enablement Kits | Direct Attach Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Direct Attach Cables | Transceiver | max 18 | 0 | 18 | Selection constraint for Direct Attach Cables: max 18 | 804095-B21 | Standard | HPE Synergy Interconnect Link 1.1m Direct Attach Copper Cable | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 01/05/2017 | 05/31/2018 | [TEXT_9] |
| 114 | Cables &amp; Enablement Kits | Direct Attach Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Direct Attach Cables | Transceiver | max 18 | 0 | 18 | Selection constraint for Direct Attach Cables: max 18 | 804098-B21 | Standard | HPE Synergy Interconnect Link 1.6m Direct Attach Copper Cable | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 01/05/2017 | 12/31/2018 | [TEXT_9] |
| 115 | Cables &amp; Enablement Kits | Direct Attach Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Direct Attach Cables | Transceiver | max 18 | 0 | 18 | Selection constraint for Direct Attach Cables: max 18 | 804101-B21 | Standard | HPE Synergy Interconnect Link 3m Active Optical Cable | 0 | $902.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 01/05/2017 | 12/31/2022 | [TEXT_116] |
| 116 | Cables &amp; Enablement Kits | Direct Attach Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Direct Attach Cables | Transceiver | max 18 | 0 | 18 | Selection constraint for Direct Attach Cables: max 18 | 804104-B21 | Standard | HPE Synergy Interconnect Link 5m Active Optical Cable | 0 | $944.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 01/05/2017 | 12/31/2022 | [TEXT_117] |
| 117 | Cables &amp; Enablement Kits | Direct Attach Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Direct Attach Cables | Transceiver | max 18 | 0 | 18 | Selection constraint for Direct Attach Cables: max 18 | 804107-B21 | Standard | HPE Synergy Interconnect Link 10m Active Optical Cable | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 01/05/2017 | 05/31/2018 | [TEXT_9] |
| 118 | Cables &amp; Enablement Kits | Direct Attach Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Direct Attach Cables | Transceiver | max 18 | 0 | 18 | Selection constraint for Direct Attach Cables: max 18 | 804110-B21 | Standard | HPE Synergy Interconnect Link 15m Active Optical Cable | 0 | $1,161.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 01/05/2017 | 12/31/2022 | [TEXT_118] |
| 119 | Cables &amp; Enablement Kits | Direct Attach Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Direct Attach Cables | Transceiver | max 18 | 0 | 18 | Selection constraint for Direct Attach Cables: max 18 | 804155-B21 | Standard | HPE Synergy Interconnect Link 2.1m Direct Attach Copper Cable | 0 | $209.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 01/05/2017 | 12/31/2022 | [TEXT_119] |
| 120 | Cables &amp; Enablement Kits | Direct Attach Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Direct Attach Cables | Transceiver | max 18 | 0 | 18 | Selection constraint for Direct Attach Cables: max 18 | 845412-B21 | Standard | HPE 100Gb QSFP28 to QSFP28 10m Active Optical Cable | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 09/25/2017 | 01/31/2018 | [TEXT_9] |
| 121 | Cables &amp; Enablement Kits | Direct Attach Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Direct Attach Cables | Transceiver | max 18 | 0 | 18 | Selection constraint for Direct Attach Cables: max 18 | 845424-B21 | Standard | HPE QSFP28 to 4x25Gb SFP28 15m Active Optical Cable | 0 | $4,302.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 12/03/2018 | 08/30/2027 | [TEXT_120] |
| 122 | Cables &amp; Enablement Kits | Direct Attach Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Direct Attach Cables | Transceiver | max 18 | 0 | 18 | Selection constraint for Direct Attach Cables: max 18 | AP818A | Standard | HPE B-series SFP+ to SFP+ Active Copper 1.0m Direct Attach Cable | 0 | $274.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 07/20/2021 | [TEXT_121] |
| 123 | Cables &amp; Enablement Kits | Direct Attach Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Direct Attach Cables | Transceiver | max 18 | 0 | 18 | Selection constraint for Direct Attach Cables: max 18 | AP819A | Standard | HPE B-series SFP+ to SFP+ Active Copper 3.0m Direct Attach Cable | 0 | $307.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 07/20/2021 | [TEXT_122] |
| 124 | Cables &amp; Enablement Kits | Direct Attach Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Direct Attach Cables | Transceiver | max 18 | 0 | 18 | Selection constraint for Direct Attach Cables: max 18 | AP820A | Standard | HPE B-series SFP+ to SFP+ Active Copper 5.0m Direct Attach Cable | 0 | $347.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 06/16/2022 | [TEXT_123] |
| 125 | Cables &amp; Enablement Kits | Direct Attach Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Direct Attach Cables | Transceiver | max 18 | 0 | 18 | Selection constraint for Direct Attach Cables: max 18 | J9283B | Standard | HPE X242 10G SFP+ to SFP+ 3m Direct Attach Copper Cable | 0 |  |  |  | NA |  | No | Obsolete (OB) | 5 | 5 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Obsolete (OB) | 05/06/2016 | 05/31/2018 | [TEXT_124] |
| 126 | Cables &amp; Enablement Kits | Direct Attach Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Direct Attach Cables | Transceiver | max 18 | 0 | 18 | Selection constraint for Direct Attach Cables: max 18 | JD097C | Standard | HPE Networking X240 10G SFP+ SFP+ 3m DAC Cable | 0 | $314.00 |  |  | NA |  | No | Available | 13 | 13 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 12/31/2099 | [TEXT_125] |
| 127 | Cables &amp; Enablement Kits | Direct Attach Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Direct Attach Cables | Transceiver | max 18 | 0 | 18 | Selection constraint for Direct Attach Cables: max 18 | JG081C | Standard | HPE Networking X240 10G SFP+ SFP+ 5m DAC Cable | 0 | $346.00 |  |  | NA |  | No | Available | 13 | 13 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 12/31/2099 | [TEXT_126] |
| 128 | Networking | CAT Ethernet Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; CAT Ethernet Cables | Cable Kit | max 12 | 0 | 12 | Selection constraint for CAT Ethernet Cables: max 12 | G9Q68A | Standard | HPE NonStop Category 6A 21 Foot Cable | 0 |  |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 02/12/2019 | 04/30/2028 | [TEXT_127] |
| 129 | Networking | CAT Ethernet Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; CAT Ethernet Cables | Cable Kit | max 12 | 0 | 12 | Selection constraint for CAT Ethernet Cables: max 12 | 861412-B21 | Standard | HPE Synergy Frame Link Module CAT6A 1.2m Cable | 0 | $65.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 01/05/2017 | 08/31/2027 | [TEXT_128] |
| 130 | Networking | CAT Ethernet Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; CAT Ethernet Cables | Cable Kit | max 12 | 0 | 12 | Selection constraint for CAT Ethernet Cables: max 12 | 861413-B21 | Standard | HPE Synergy Frame Link Module CAT6A 3m Cable | 0 | $113.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 01/05/2017 | 08/31/2027 | [TEXT_129] |
| 131 | Networking | CAT Ethernet Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; CAT Ethernet Cables | Cable Kit | max 12 | 0 | 12 | Selection constraint for CAT Ethernet Cables: max 12 | 861414-B21 | Standard | HPE Synergy Frame Link Module CAT6A 6.4m Cable | 0 | $113.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 01/05/2017 | 11/30/2022 | [TEXT_130] |
| 132 | Tape Drives | LTO Tape Drives | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Tape Drives &gt; LTO Tape Drives | Tape Drive | max 99 | 0 | 99 | Selection constraint for LTO Tape Drives: max 99 | BC023A | Standard | HPE StoreEver LTO-8 Ultrium 30750 External Tape Drive | 0 | $16,300.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 02/05/2018 | 06/30/2030 | [TEXT_131] |
| 133 | Tape Drives | LTO Tape Drives | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Tape Drives &gt; LTO Tape Drives | Tape Drive | max 99 | 0 | 99 | Selection constraint for LTO Tape Drives: max 99 | Q6Q65A | Standard | HPE StoreEver 1/8 G2 LTO-8 Ultrium 30750 FC Tape Autoloader | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 02/05/2018 | 02/28/2019 | [TEXT_9] |
| 134 | Tape Drives | LTO Tape Drives | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Tape Drives &gt; LTO Tape Drives | Tape Drive | max 99 | 0 | 99 | Selection constraint for LTO Tape Drives: max 99 | Q6Q66A | Standard | HPE StoreEver 1/8 G2 LTO-8 Ultrium 30750 SAS Tape Autoloader | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 02/05/2018 | 02/28/2019 | [TEXT_9] |
| 135 | Tape Drives | LTO Tape Drives | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Tape Drives &gt; LTO Tape Drives | Tape Drive | max 99 | 0 | 99 | Selection constraint for LTO Tape Drives: max 99 | Q6Q67A | Standard | HPE StoreEver MSL LTO-8 Ultrium 30750 FC Drive Upgrade Kit | 0 | $21,600.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 02/05/2018 | 06/30/2030 | [TEXT_132] |
| 136 | Tape Drives | LTO Tape Drives | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Tape Drives &gt; LTO Tape Drives | Tape Drive | max 99 | 0 | 99 | Selection constraint for LTO Tape Drives: max 99 | Q6Q68A | Standard | HPE StoreEver MSL LTO-8 Ultrium 30750 SAS Drive Upgrade Kit | 0 | $16,800.00 |  |  | NA |  | No | Available | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 02/05/2018 | 06/30/2030 | [TEXT_133] |
| 137 | Accessories &amp; Infrastructure | Frame Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Accessories &amp; Infrastructure &gt; Frame Options | Composable Enclosure | max 2 | 0 | 2 | Selection constraint for Frame Options: max 2 | 804923-B21 | Standard | HPE Synergy 12000 Frame Compute Half Shelf | 0 | $431.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 01/05/2017 | 12/31/2032 | [TEXT_134] |
| 138 | Accessories &amp; Infrastructure | Frame Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Accessories &amp; Infrastructure &gt; Frame Options | Composable Enclosure | max 2 | 0 | 2 | Selection constraint for Frame Options: max 2 | 804943-B21 | Standard | HPE Synergy Frame 4x Lift Handles | 1 | $158.00 |  |  | $158.00 |  | No | Available | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 01/29/2019 | 12/31/2032 | [TEXT_135] |
| 139 | Accessories &amp; Infrastructure | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Accessories &amp; Infrastructure &gt; -48VDC Power Supplies &amp; Cable Kits | Chassis Infrastructure | max 2 | 0 | 2 | Selection constraint for -48VDC Power Supplies &amp; Cable Kits: max 2 | 804938-B21 | Standard | HPE Synergy Frame Rack Rail Kit | 1 | $214.00 |  |  | $214.00 |  | No | Available | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 01/29/2019 | 12/31/2032 | [TEXT_136] |
| 140 | Accessories &amp; Infrastructure | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Accessories &amp; Infrastructure &gt; -48VDC Power Supplies &amp; Cable Kits | Chassis Infrastructure | max 2 | 0 | 2 | Selection constraint for -48VDC Power Supplies &amp; Cable Kits: max 2 | 871749-B21 | Standard | HPE Synergy Frame Round Hole Rack Rail Kit | 0 | $475.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 12/04/2017 | 12/31/2032 | [TEXT_137] |
| 141 | Accessories &amp; Infrastructure | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Accessories &amp; Infrastructure &gt; -48VDC Power Supplies &amp; Cable Kits | Chassis Infrastructure | max 2 | 0 | 2 | Selection constraint for -48VDC Power Supplies &amp; Cable Kits: max 2 | 872033-B21 | Standard | HPE Synergy Seismic Kit | 0 | $699.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 08/07/2017 | 09/27/2021 | [TEXT_138] |
| 142 | Accessories &amp; Infrastructure | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Accessories &amp; Infrastructure &gt; -48VDC Power Supplies &amp; Cable Kits | Chassis Infrastructure | max 2 | 0 | 2 | Selection constraint for -48VDC Power Supplies &amp; Cable Kits: max 2 | 872034-B21 | Standard | HPE Synergy DC Power Grounding Kit | 0 | $281.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 08/07/2017 | 11/30/2024 | [TEXT_139] |
| 143 | Software &amp; Licenses | Red Hat Enterprise Linux Server | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Red Hat Enterprise Linux Server | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Red Hat Enterprise Linux Server: no max | M6K35A | Standard | SUSE Linux Enterprise Server HPC Compute Node 1-2 Sockets 3 Year Subscription Flx LTU | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 06/01/2018 | [TEXT_9] |
| 144 | Software &amp; Licenses | Red Hat Enterprise Linux Server | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Red Hat Enterprise Linux Server | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Red Hat Enterprise Linux Server: no max | M6K36A | Standard | SUSE Linux Enterprise Server HPC Head Node 1-2 Sockets 3 Year Subscription 24x7 Support Flx LTU | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 06/01/2018 | [TEXT_9] |
| 145 | Cooling / Thermal | High Performance &amp; Standard Fan Kits | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cooling / Thermal &gt; High Performance &amp; Standard Fan Kits | Cooling / Thermal | max 6 | 0 | 6 | Selection constraint for High Performance &amp; Standard Fan Kits: max 6 | P51175-B21 | Standard | HPE Synergy 12000 High Capacity Fan Kit | 10 | $300.00 |  |  | $3,000.00 |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 03/06/2023 | 12/31/2032 | [TEXT_140] |
| 146 | Power Supplies | Power Supply | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Power Supplies &gt; Power Supply | Power Supply | min 1, Required | 1 | Required | Selection constraint for Power Supply: required | P44712-B21 | Standard | HPE 1800W-2200W Flex Slot Titanium Hot Plug Power Supply Kit | 12 | $1,588.00 |  |  | $19,056.00 |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 03/06/2023 | 12/31/2030 | [TEXT_141] |
| 147 | Power Supplies | Power Supply | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Power Supplies &gt; Power Supply | Power Supply | min 1, Required | 1 | Required | [TEXT_142] | 798095-B21 | Standard | HPE 2650W Performance Hot Plug Titanium Plus Power Supply Kit | 0 | $718.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 01/30/2029 | [TEXT_143] |
| 148 | Power Supplies | Power Supply | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Power Supplies &gt; Power Supply | Power Supply | min 1, Required | 1 | Required | [TEXT_144] | 798096-B21 | Standard | HPE 6x 2650W Performance Hot Plug Titanium Plus FIO Power Supply Kit | 0 | $4,419.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 01/30/2029 | [TEXT_145] |
| 149 | Power Supplies | Power Supply | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Power Supplies &gt; Power Supply | Power Supply | min 1, Required | 1 | Required | [TEXT_146] | 876929-B21 | Standard | HPE 2900-3400W Hot Plug Titanium Power Supply Kit | 0 | $1,125.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 02/05/2018 | 12/31/2032 | [TEXT_147] |
| 150 | Power Supplies | Power Supply | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Power Supplies &gt; Power Supply | Power Supply | min 1, Required | 1 | Required | [TEXT_148] | P27749-B21 | Standard | HPE 3000W Titanium Hot Plug Power Supply Kit | 0 | $1,190.00 |  |  | NA |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 07/06/2021 | 12/31/2032 | [TEXT_149] |
| 151 | Power Supplies | Power Supply | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Power Supplies &gt; Power Supply | Power Supply | min 1, Required | 1 | Required | [TEXT_150] | P27750-B21 | Standard | HPE 6x 3000W Titanium Hot Plug FIO Power Supply Kit | 0 | $4,743.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 07/06/2021 | 12/31/2032 | [TEXT_151] |
| 152 | Power Supplies | Power Supply | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Power Supplies &gt; Power Supply | Power Supply | min 1, Required | 1 | Required | [TEXT_152] | 798099-B21 | Standard | HPE 2650W -48VDC Hot Plug Power Supply Kit | 0 | $1,485.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 08/07/2017 | 11/30/2024 | [TEXT_153] |
| 153 | Power Supplies | Power Supply | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Power Supplies &gt; Power Supply | Power Supply | min 1, Required | 1 | Required | [TEXT_154] | 798100-B21 | Standard | HPE 6x 2650W -48VDC Hot Plug Power Factory Integrated Supply Kit | 0 | $6,799.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 08/07/2017 | 11/30/2024 | [TEXT_155] |
| 154 | Power Supplies | Power Supply | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Power Supplies &gt; Power Supply | Power Supply | min 1, Required | 1 | Required | [TEXT_156] | 798101-B21 | Standard | HPE 2650W 277VAC Hot Plug Power Supply Kit | 0 | $679.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 08/07/2017 | 09/27/2021 | [TEXT_157] |
| 155 | Power Supplies | Power Supply | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Power Supplies &gt; Power Supply | Power Supply | min 1, Required | 1 | Required | [TEXT_158] | 798102-B21 | Standard | HPE 6x 2650W 277VAC Hot Plug FIO Power Supply Kit | 0 | $3,829.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 08/07/2017 | 09/27/2021 | [TEXT_159] |
| 156 | Power Supplies | Power Supply | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Power Supplies &gt; Power Supply | Power Supply | min 1, Required | 1 | Required | [TEXT_160] | 798342-B21 | Standard | HPE 2650W HVDC Hot Plug Power Supply Kit | 0 | $679.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/06/2017 | 09/27/2021 | [TEXT_157] |
| 157 | Power Supplies | Power Supply | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Power Supplies &gt; Power Supply | Power Supply | min 1, Required | 1 | Required | [TEXT_161] | 798349-B21 | Standard | HPE 6x 2650W HVDC Hot Plug Factory Integrated Power Supply Kit | 0 | $3,829.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/06/2017 | 09/27/2021 | [TEXT_159] |
| 158 | Networking | PCIe Networking Adapters | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Networking &gt; PCIe Networking Adapters | Network Adapter | max 6 | 0 | 6 | Selection constraint for PCIe Networking Adapters: max 6 | P44074-B21 | Standard | HPE Synergy Dual Slot Power Supply Adapter | 6 | $295.00 |  |  | $1,770.00 |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 03/06/2023 | 12/31/2032 | [TEXT_162] |
| 159 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 12 | 0 | 12 | Selection constraint for Power Cords: max 12 | 295633-B22 | Standard | HPE C19 - C20 WW 250V 16Amp 2.5m Jumper Cord | 0 | $102.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 08/31/2028 | [TEXT_163] |
| 160 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 12 | 0 | 12 | Selection constraint for Power Cords: max 12 | AF556A | Standard | HPE C13 - Nema 5-15P US/CA 110V 10Amp 1.83m Power Cord | 0 | $55.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 07/31/2029 | [TEXT_164] |
| 161 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 12 | 0 | 12 | Selection constraint for Power Cords: max 12 | AF568A | Standard | HPE C13 - CEE-VII EU 250V 10Amp 1.83m Power Cord | 0 | $71.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 11/30/2031 | [TEXT_165] |
| 162 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 12 | 0 | 12 | Selection constraint for Power Cords: max 12 | AF574A | Standard | HPE C19 - C20 WW 250V 16Amp Flint Gray 2.0m Jumper Cord | 0 | $38.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 12/31/2028 | [TEXT_166] |
| 163 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 12 | 0 | 12 | Selection constraint for Power Cords: max 12 | AF575A | Standard | HPE C19 - C20 WW 250V 16Amp Flint Gray 1.20m Jumper Cord | 0 | $40.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 07/31/2029 | [TEXT_167] |
| 164 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 12 | 0 | 12 | Selection constraint for Power Cords: max 12 | AF590A | Standard | HPE C20 - C13 WW 250V 15Amp 2.0m Jumper Cord | 0 | $56.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 11/30/2028 | [TEXT_168] |
| 165 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 12 | 0 | 12 | Selection constraint for Power Cords: max 12 | R1C66A | Standard | HPE C19-C20 IN 250V 16Amp 2.5m Black Jumper Cord | 0 | $88.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 12/03/2018 | 11/30/2031 | [TEXT_169] |
| 166 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 12 | 0 | 12 | Selection constraint for Power Cords: max 12 | A0K02A | Standard | HPE C13 - C14 WW 250V 10Amp 2.0m Jumper Cord | 0 | $34.00 |  |  | NA |  | No | Available | 21 | 21 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 10/31/2031 | [TEXT_170] |
| 167 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 12 | 0 | 12 | Selection constraint for Power Cords: max 12 | A0N33A | Standard | HPE C13-NEMA 6-15P 10A/250V 3.6m Black Power Cord | 0 | $78.00 |  |  | NA |  | No | Available | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 10/31/2031 | [TEXT_171] |
| 168 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 12 | 0 | 12 | Selection constraint for Power Cords: max 12 | AF557A | Standard | HPE C13 - GB-1002 CN 250V 10Amp 1.83m Power Cord | 0 | $156.00 |  |  | NA |  | No | Available | 21 | 21 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 11/30/2031 | [TEXT_172] |
| 169 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 12 | 0 | 12 | Selection constraint for Power Cords: max 12 | AF558A | Standard | HPE C13 - IRAM -2073 AR 250V 10A 2.5m Power Cord | 0 | $65.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 07/31/2029 | [TEXT_173] |
| 170 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 12 | 0 | 12 | Selection constraint for Power Cords: max 12 | AF559A | Standard | HPE C13 - Nema 5-15P TH/PH 250V 10Amp 1.83m Power Cord | 0 | $55.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 07/31/2029 | [TEXT_174] |
| 171 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 12 | 0 | 12 | Selection constraint for Power Cords: max 12 | AF560A | Standard | HPE C13 - KSC- 8305 KR 250V 10Amp 1.83m Power Cord | 0 | $55.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 07/31/2029 | [TEXT_174] |
| 172 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 12 | 0 | 12 | Selection constraint for Power Cords: max 12 | AF561A | Standard | HPE C13 - CNS-690 TW 110V 13Amp 1.83m Power Cord | 0 | $55.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 07/31/2029 | [TEXT_174] |
| 173 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 12 | 0 | 12 | Selection constraint for Power Cords: max 12 | AF562A | Standard | HPE C13 - IS-1293 IN 240V 6Amp LV 2.0m Power Cord | 0 | $194.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 11/30/2031 | [TEXT_175] |
| 174 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 12 | 0 | 12 | Selection constraint for Power Cords: max 12 | AF564A | Standard | HPE C13 - SI-32 IL 250V 10Amp 1.83m Power Cord | 0 | $55.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 07/31/2029 | [TEXT_174] |
| 175 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 12 | 0 | 12 | Selection constraint for Power Cords: max 12 | AF565A | Standard | HPE C13 - SEV 1011 CH 250V 10Amp 1.83m Power Cord | 0 | $55.00 |  |  | NA |  | No | Available | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 07/31/2029 | [TEXT_176] |
| 176 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 12 | 0 | 12 | Selection constraint for Power Cords: max 12 | AF566A | Standard | HPE C13 - DK-2.5A DK 250V 10Amp 1.83m Power Cord | 0 | $55.00 |  |  | NA |  | No | Available | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 07/31/2029 | [TEXT_176] |
| 177 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 12 | 0 | 12 | Selection constraint for Power Cords: max 12 | AF567A | Standard | HPE C13 - SABS-164 ZA 250V 10Amp 2.5m Power Cord | 0 | $65.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 07/31/2029 | [TEXT_173] |
| 178 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 12 | 0 | 12 | Selection constraint for Power Cords: max 12 | AF569A | Standard | HPE C13 - AS3112-3 AU 250V 10Amp 2.5m Power Cord | 0 | $65.00 |  |  | NA |  | No | Available | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 07/31/2029 | [TEXT_177] |
| 179 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 12 | 0 | 12 | Selection constraint for Power Cords: max 12 | AF570A | Standard | HPE C13 - BS-1363A UK/HK/SG 250V 10Amp 1.83m Power Cord | 0 | $55.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 07/31/2029 | [TEXT_174] |
| 180 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 12 | 0 | 12 | Selection constraint for Power Cords: max 12 | AF572A | Standard | HPE C13 - JIS C8303 JP 100V 12Amp 2.0m Power Cord | 0 | $60.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 07/31/2029 | [TEXT_178] |
| 181 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 12 | 0 | 12 | Selection constraint for Power Cords: max 12 | AF573A | Standard | HPE C13 - C14 WW 250V 10Amp Flint Gray 2.0m Jumper Cord | 0 | $38.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 10/31/2031 | [TEXT_179] |
| 182 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 12 | 0 | 12 | Selection constraint for Power Cords: max 12 | AF591A | Standard | HPE C13 - NBR-14136 BR 250V 10Amp 1.83m Power Cord | 0 | $49.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 11/30/2031 | [TEXT_180] |
| 183 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 12 | 0 | 12 | Selection constraint for Power Cords: max 12 | E7804A | Standard | HPE C19 - C20 WW 250V 16Amp 4.5m Jumper Cord | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 10/31/2018 | [TEXT_9] |
| 184 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 12 | 0 | 12 | Selection constraint for Power Cords: max 12 | P9B76A | Standard | HPE SDG23A-SDG23B 277V 1.37m Jumper Cord | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 08/07/2017 | 05/31/2018 | [TEXT_9] |
| 185 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 12 | 0 | 12 | Selection constraint for Power Cords: max 12 | R1C65A | Standard | HPE C13-C14 IN 250V 10Amp 2m Black Jumper Cord | 0 | $119.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 12/03/2018 | 11/30/2031 | [TEXT_181] |
| 186 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 12 | 0 | 12 | Selection constraint for Power Cords: max 12 | TK738A | Standard | HPE 2.0m 250V 16A C19-C20 WW Single IPD Enabled Jumper Cord | 0 | $100.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 10/31/2019 | [TEXT_182] |
| 187 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 12 | 0 | 12 | Selection constraint for Power Cords: max 12 | TK739A | Standard | HPE 2.0m 250V 16A C19-C20 WW 3PC Kit IPD Enabled Jumper Cord | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 04/30/2018 | [TEXT_9] |
| 188 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 12 | 0 | 12 | Selection constraint for Power Cords: max 12 | TK740A | Standard | HPE 2.5m 250V 16A C19-C20 WW Single IPD Enabled Jumper Cord | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 04/30/2018 | [TEXT_9] |
| 189 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 12 | 0 | 12 | Selection constraint for Power Cords: max 12 | TK741A | Standard | HPE 2.5m 250V 16A C19-C20 WW 3PC Kit IPD Enabled Jumper Cord | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 04/30/2018 | [TEXT_9] |
| 190 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 12 | 0 | 12 | Selection constraint for Power Cords: max 12 | TK742A | Standard | HPE 3.0m 250V 16A C19-C20 WW Single IPD Enabled Jumper Cord | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 04/30/2018 | [TEXT_9] |
| 191 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 12 | 0 | 12 | Selection constraint for Power Cords: max 12 | TK743A | Standard | HPE 3.0m 250V 16A C19-C20 WW 3PC Kit IPD Enabled Jumper Cord | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 04/30/2018 | [TEXT_9] |
| 192 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 12 | 0 | 12 | Selection constraint for Power Cords: max 12 | TK744A | Standard | HPE 1.37m 250V 16A C19-C20 WW Single IPD Enabled Jumper Cord | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 04/30/2018 | [TEXT_9] |
| 193 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 12 | 0 | 12 | Selection constraint for Power Cords: max 12 | TK745A | Standard | HPE 1.37m 250V 16A C19-C20 WW 3PC Kit IPD Enabled Jumper Cord | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 04/30/2018 | [TEXT_9] |
| 194 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | Unlimited | 0 | Unlimited | [TEXT_183] | J6X00A | Standard | HPE SAFDGRID-SAFDGRID 277V 15Amp DC 2.0m Jumper Cord | 0 | $111.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 06/30/2029 | [TEXT_184] |
| 195 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | Unlimited | 0 | Unlimited | [TEXT_185] | P9B75A | Standard | HPE SDG23A-SDG23B 277V 0.76m Jumper Cord | 0 | $79.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/07/2017 | 11/30/2027 | [TEXT_186] |
| 196 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | Unlimited | 0 | Unlimited | [TEXT_187] | J6W98A | Standard | HPE SAFDGRID-SAFDGRID 277V 15Amp DC 0.76m Jumper Cord | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 09/30/2018 | [TEXT_9] |
| 197 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | Unlimited | 0 | Unlimited | [TEXT_188] | J6W99A | Standard | HPE SAFDGRID-SAFDGRID 277V 15Amp DC 1.37m Jumper Cord | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 10/31/2018 | [TEXT_9] |
| 198 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | Unlimited | 0 | Unlimited | [TEXT_189] | J6X01A | Standard | HPE SAFDGRID-LS-25 277V 15Amp AC 0.76m Jumper Cord | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 09/30/2018 | [TEXT_9] |
| 199 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | Unlimited | 0 | Unlimited | [TEXT_190] | J6X02A | Standard | HPE SAFDGRID-LS-25 277V 15Amp AC 1.37m Jumper Cord | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 10/31/2018 | [TEXT_9] |
| 200 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | Unlimited | 0 | Unlimited | [TEXT_191] | J6X03A | Standard | HPE SAFDGRID-LS-25 277V 15Amp AC 2.0m Jumper Cord | 0 | $80.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 07/30/2020 | [TEXT_192] |
| 201 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | Unlimited | 0 | Unlimited | [TEXT_193] | P9B77A | Standard | HPE SDG23A-SDG23B 277V 2.0m Jumper Cord | 0 | $99.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/07/2017 | 11/30/2027 | [TEXT_194] |
| 202 | Power Supplies | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Power Supplies &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | min 1, max 2 | 1 | 2 | [TEXT_195] | 872035-B21 | Standard | HPE Synergy -48VDC Power Cable Kit | 0 | $6,341.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 08/07/2017 | 02/01/2024 | [TEXT_196] |
| 203 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 12 | 0 | 12 | Selection constraint for Power Cords: max 12 | 469774-409 | Standard | HPE Remove Standard Power Cords | 0 | $1.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/06/2016 | 01/31/2031 | [TEXT_197] |
| 204 | Accessories &amp; Infrastructure | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Accessories &amp; Infrastructure &gt; System Options | Option Component | Optional | 0 | Optional | Selection constraint for System Options: optional | 638212-B21 | Standard | HPE USB AE Keyboard/Mouse Kit | 0 | $66.00 |  | NA | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 11/30/2024 | [TEXT_198] |
| 205 | Accessories &amp; Infrastructure | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Accessories &amp; Infrastructure &gt; System Options | Option Component | Optional | 0 | Optional | Selection constraint for System Options: optional | 672097-373 | Standard | HPE USB AP/INTL Keyboard/Mouse Kit | 0 | $32.00 |  | NA | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 11/30/2024 | [TEXT_199] |
| 206 | Accessories &amp; Infrastructure | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Accessories &amp; Infrastructure &gt; System Options | Option Component | Optional | 0 | Optional | Selection constraint for System Options: optional | 672097-113 | Standard | HPE USB CH Keyboard/Mouse Kit | 0 | $32.00 |  | NA | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 11/30/2024 | [TEXT_199] |
| 207 | Accessories &amp; Infrastructure | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Accessories &amp; Infrastructure &gt; System Options | Option Component | Optional | 0 | Optional | Selection constraint for System Options: optional | 631364-B21 | Standard | HPE USB CN Keyboard/Mouse Kit | 0 | $123.00 |  | NA | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 01/31/2025 | [TEXT_200] |
| 208 | Accessories &amp; Infrastructure | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Accessories &amp; Infrastructure &gt; System Options | Option Component | Optional | 0 | Optional | Selection constraint for System Options: optional | 672097-223 | Standard | HPE USB CZ Keyboard/Mouse Kit | 0 | $32.00 |  | NA | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 11/30/2024 | [TEXT_199] |
| 209 | Accessories &amp; Infrastructure | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Accessories &amp; Infrastructure &gt; System Options | Option Component | Optional | 0 | Optional | Selection constraint for System Options: optional | 631358-B21 | Standard | HPE USB DE Keyboard/Mouse Kit | 0 | $44.00 |  | NA | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 11/30/2024 | [TEXT_201] |
| 210 | Accessories &amp; Infrastructure | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Accessories &amp; Infrastructure &gt; System Options | Option Component | Optional | 0 | Optional | Selection constraint for System Options: optional | 631348-B21 | Standard | HPE USB ES Keyboard/Mouse Kit | 0 | $66.00 |  | NA | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 11/30/2024 | [TEXT_198] |
| 211 | Accessories &amp; Infrastructure | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Accessories &amp; Infrastructure &gt; System Options | Option Component | Optional | 0 | Optional | Selection constraint for System Options: optional | 672097-353 | Standard | HPE USB FI Keyboard/Mouse Kit | 0 | $32.00 |  | NA | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 11/30/2024 | [TEXT_199] |
| 212 | Accessories &amp; Infrastructure | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Accessories &amp; Infrastructure &gt; System Options | Option Component | Optional | 0 | Optional | Selection constraint for System Options: optional | 631346-B21 | Standard | HPE USB FR Keyboard/Mouse Kit | 0 | $44.00 |  | NA | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 11/30/2024 | [TEXT_201] |
| 213 | Accessories &amp; Infrastructure | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Accessories &amp; Infrastructure &gt; System Options | Option Component | Optional | 0 | Optional | Selection constraint for System Options: optional | 672097-D63 | Standard | HPE USB IN Keyboard/Mouse Kit | 0 | $32.00 |  | NA | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 06/14/2024 | [TEXT_199] |
| 214 | Accessories &amp; Infrastructure | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Accessories &amp; Infrastructure &gt; System Options | Option Component | Optional | 0 | Optional | Selection constraint for System Options: optional | 672097-B33 | Standard | HPE USB INTL Keyboard/Mouse Kit | 0 | $32.00 |  | NA | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 11/30/2024 | [TEXT_199] |
| 215 | Accessories &amp; Infrastructure | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Accessories &amp; Infrastructure &gt; System Options | Option Component | Optional | 0 | Optional | Selection constraint for System Options: optional | 631362-B21 | Standard | HPE USB IT Keyboard/Mouse Kit | 0 | $66.00 |  | NA | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 11/30/2024 | [TEXT_198] |
| 216 | Accessories &amp; Infrastructure | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Accessories &amp; Infrastructure &gt; System Options | Option Component | Optional | 0 | Optional | Selection constraint for System Options: optional | 631360-B21 | Standard | HPE USB JP Keyboard/Mouse Kit | 0 | $49.00 |  | NA | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 11/30/2024 | [TEXT_202] |
| 217 | Accessories &amp; Infrastructure | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Accessories &amp; Infrastructure &gt; System Options | Option Component | Optional | 0 | Optional | Selection constraint for System Options: optional | 672097-KD3 | Standard | HPE USB KR Keyboard/Mouse Kit | 0 | $32.00 |  | NA | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 01/31/2025 | [TEXT_199] |
| 218 | Accessories &amp; Infrastructure | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Accessories &amp; Infrastructure &gt; System Options | Option Component | Optional | 0 | Optional | Selection constraint for System Options: optional | 672097-133 | Standard | HPE USB PT Keyboard/Mouse Kit | 0 | $32.00 |  | NA | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 11/30/2024 | [TEXT_199] |
| 219 | Accessories &amp; Infrastructure | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Accessories &amp; Infrastructure &gt; System Options | Option Component | Optional | 0 | Optional | Selection constraint for System Options: optional | 638214-B21 | Standard | HPE USB RU Keyboard/Mouse Kit | 0 | $32.00 |  | NA | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 11/30/2024 | [TEXT_199] |
| 220 | Accessories &amp; Infrastructure | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Accessories &amp; Infrastructure &gt; System Options | Option Component | Optional | 0 | Optional | Selection constraint for System Options: optional | 672097-103 | Standard | HPE USB SE Keyboard/Mouse Kit | 0 | $32.00 |  | NA | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 11/30/2024 | [TEXT_199] |
| 221 | Accessories &amp; Infrastructure | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Accessories &amp; Infrastructure &gt; System Options | Option Component | Optional | 0 | Optional | Selection constraint for System Options: optional | 672097-143 | Standard | HPE USB TR Keyboard/Mouse Kit | 0 | $32.00 |  | NA | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 11/30/2024 | [TEXT_199] |
| 222 | Accessories &amp; Infrastructure | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Accessories &amp; Infrastructure &gt; System Options | Option Component | Optional | 0 | Optional | Selection constraint for System Options: optional | 631344-B21 | Standard | HPE USB UK Keyboard/Mouse Kit | 0 | $44.00 |  | NA | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 11/30/2024 | [TEXT_201] |
| 223 | Accessories &amp; Infrastructure | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Accessories &amp; Infrastructure &gt; System Options | Option Component | Optional | 0 | Optional | Selection constraint for System Options: optional | 631341-B21 | Standard | HPE USB US Keyboard/Mouse Kit | 0 | $32.00 |  | NA | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 11/30/2024 | [TEXT_199] |
| 224 | Drive Enclosures / Drives | Hard Disk Drives (SAS/SATA) | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Drive Enclosures / Drives &gt; Hard Disk Drives (SAS/SATA) | Service &amp; Support | max 24 | 0 | 24 | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 | F5Z52A | Standard | Hortonworks Data Platform (HDP) Enterprise Subscription 4 N/50TB Raw Strg 1year 24x7 Support FlexLTU | 0 | $12,575.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 11/15/2019 | [TEXT_80] |
| 225 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 24 | 0 | 24 | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 | Q5U42AAE | Service | Cloudera Edge Management Less Than 1000 Agents AGPL 1yr Subscription 24x7 Severity 1 Response E-LTU | 0 | $62,410.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/05/2017 | 12/31/2021 | [TEXT_203] |
| 226 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 24 | 0 | 24 | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 | L4Z37AAE | Service | Cloudera Enterprise 1 Year Subscription 24x7 Support Flex E-LTU | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 08/31/2016 | [TEXT_204] |
| 227 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 24 | 0 | 24 | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 | L4Z37A | Standard | Cloudera Enterprise 1 year Subscription 24x7 Support Flex LTU | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 08/31/2016 | [TEXT_204] |
| 228 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 24 | 0 | 24 | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 | P9V17AAE | Service | Cloudera Enterprise Analytical Database Edition 1yr Subscription per Node 24x7 Gold Support E-LTU | 0 | $8,000.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/06/2016 | 05/31/2023 | [TEXT_205] |
| 229 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 24 | 0 | 24 | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 | P9V16AAE | Service | Cloudera Enterprise Analytical Database Edition 1yr Subscription per Node 8x5 Bronze Support E-LTU | 0 | $7,060.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/06/2016 | 12/31/2021 | [TEXT_206] |
| 230 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 24 | 0 | 24 | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 | P9V20AAE | Service | Cloudera Enterprise Analytical Database Edition 3yr Subscription per Node 24x7 Gold Support E-LTU | 0 | $26,480.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/06/2016 | 12/31/2021 | [TEXT_207] |
| 231 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 24 | 0 | 24 | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 | G7M27AAE | Service | Cloudera Enterprise Basic Edition 1 Year Subscription per Node 24x7 Support E-LTU | 0 | $2,000.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 05/31/2023 | [TEXT_208] |
| 232 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 24 | 0 | 24 | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 | G7M27A | Standard | Cloudera Enterprise Basic Edition 1 Year Subscription per Node 24x7 Support Physical LTU | 0 | $2,230.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 12/31/2021 | [TEXT_209] |
| 233 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 24 | 0 | 24 | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 | G7M28AAE | Service | Cloudera Enterprise Basic Edition 1 Year Subscription per Node 8x5 Support E-LTU | 0 | $1,600.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 02/01/2023 | [TEXT_210] |
| 234 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 24 | 0 | 24 | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 | G7M28A | Standard | Cloudera Enterprise Basic Edition 1 Year Subscription per Node 8x5 Support Physical LTU | 0 | $1,785.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 02/28/2020 | [TEXT_211] |
| 235 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 24 | 0 | 24 | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 | P9A41AAE | Service | Cloudera Enterprise Basic Edition 3 Year Subscription per Node 24x7 Support E-LTU | 0 | $7,540.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 07/31/2020 | [TEXT_212] |
| 236 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 24 | 0 | 24 | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 | P9A42AAE | Service | Cloudera Enterprise Basic Edition 3 Year Subscription per Node 8x5 Support E-LTU | 0 | $4,800.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 05/31/2023 | [TEXT_213] |
| 237 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 24 | 0 | 24 | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 | P9V13AAE | Service | Cloudera Enterprise Data Engineering Edition 1yr Subscription per Node 24x7 Gold Support E-LTU | 0 | $4,000.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/06/2016 | 05/31/2023 | [TEXT_214] |
| 238 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 24 | 0 | 24 | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 | P9V12AAE | Service | Cloudera Enterprise Data Engineering Edition 1yr Subscription per Node 8x5 Bronze Support E-LTU | 0 | $3,200.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/06/2016 | 02/01/2023 | [TEXT_215] |
| 239 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 24 | 0 | 24 | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 | P9V18AAE | Service | Cloudera Enterprise Data Engineering Edition 3yr Subscription per Node 24x7 Gold Support E-LTU | 0 | $12,000.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/06/2016 | 02/01/2023 | [TEXT_216] |
| 240 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 24 | 0 | 24 | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 | G7M31AAE | Service | Cloudera Enterprise Data Hub Edition 1 Year Subscription per Node 24x7 Premium E-LTU | 0 | $12,820.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 12/31/2021 | [TEXT_217] |
| 241 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 24 | 0 | 24 | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 | G7M29AAE | Service | Cloudera Enterprise Data Hub Edition 1 Year Subscription per Node 24x7 Support E-LTU | 0 | $10,000.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 05/31/2023 | [TEXT_218] |
| 242 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 24 | 0 | 24 | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 | G7M29A | Standard | Cloudera Enterprise Data Hub Edition 1 Year Subscription per Node 24x7 Support Physical LTU | 0 | $11,150.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 12/31/2021 | [TEXT_219] |
| 243 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 24 | 0 | 24 | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 | G7M30AAE | Service | Cloudera Enterprise Data Hub Edition 1 Year Subscription per Node 8x5 Support E-LTU | 0 | $8,000.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 02/01/2023 | [TEXT_205] |
| 244 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 24 | 0 | 24 | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 | G7M30A | Standard | Cloudera Enterprise Data Hub Edition 1 Year Subscription per Node 8x5 Support Physical LTU | 0 | $8,920.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 02/28/2020 | [TEXT_220] |
| 245 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 24 | 0 | 24 | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 | P9A45AAE | Service | Cloudera Enterprise Data Hub Edition 3 Year Subscription per Node 24x7 Premium E-LTU | 0 | $38,470.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 07/31/2020 | [TEXT_221] |
| 246 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 24 | 0 | 24 | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 | P9A43AAE | Service | Cloudera Enterprise Data Hub Edition 3 Year Subscription per Node 24x7 Support E-LTU | 0 | $30,000.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 02/01/2023 | [TEXT_222] |
| 247 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 24 | 0 | 24 | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 | P9A44AAE | Service | Cloudera Enterprise Data Hub Edition 3 Year Subscription per Node 8x5 Support E-LTU | 0 | $24,000.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 02/01/2023 | [TEXT_223] |
| 248 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 24 | 0 | 24 | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 | P9V15AAE | Service | Cloudera Enterprise Operational Database Edition 1yr Subscription per Node 24x7 Gold Support E-LTU | 0 | $6,000.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/06/2016 | 05/31/2023 | [TEXT_224] |
| 249 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 24 | 0 | 24 | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 | P9V14AAE | Service | Cloudera Enterprise Operational Database Edition 1yr Subscription per Node 8x5 Bronze Support E-LTU | 0 | $4,800.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/06/2016 | 02/01/2023 | [TEXT_213] |
| 250 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 24 | 0 | 24 | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 | P9V19AAE | Service | Cloudera Enterprise Operational Database Edition 3yr Subscription per Node 24x7 Gold Support E-LTU | 0 | $19,860.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/06/2016 | 12/31/2021 | [TEXT_225] |
| 251 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 24 | 0 | 24 | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 | JP408AAE | Service | Cloudera Hortonworks Data Platform Enterprise Plus 4 Nodes/50TB Raw Storage 1yr 24x7 Support E-LTU | 0 | $42,070.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 12/31/2021 | [TEXT_226] |
| 252 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 24 | 0 | 24 | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 | JP408A | Standard | Cloudera Hortonworks Data Platform Enterprise Plus 4 Nodes/50TB Raw Storage 1yr 24x7 Support LTU | 0 | $42,070.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 11/15/2019 | [TEXT_226] |
| 253 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 24 | 0 | 24 | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 | Q5U39AAE | Service | Hortonworks Data Flow Edge 10 Branch Office Nodes 1yr 24x7 Support Severity 1 Response E-LTU | 0 | $62,410.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/05/2017 | 07/31/2020 | [TEXT_203] |
| 254 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 24 | 0 | 24 | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 | Q5U41AAE | Service | Hortonworks Data Flow Edge 100 Branch Office Nodes 1yr 24x7 Support Severity 1 Response E-LTU | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/05/2017 | 08/31/2018 | [TEXT_204] |
| 255 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 24 | 0 | 24 | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 | Q5U44AAE | Service | Hortonworks Data Flow Edge 10K Agents (MiNiFi) 1yr 24x7 Support Severity 1 Response E-LTU | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/05/2017 | 08/31/2018 | [TEXT_204] |
| 256 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 24 | 0 | 24 | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 | Q5U43AAE | Service | Hortonworks Data Flow Edge 1K Agents (MiNiFi) 1yr 24x7 Support Severity 1 Response E-LTU | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/05/2017 | 08/31/2018 | [TEXT_204] |
| 257 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 24 | 0 | 24 | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 | Q5U40AAE | Service | Hortonworks Data Flow Edge 25 Branch Office Nodes 1yr 24x7 Support Severity 1 Response E-LTU | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/05/2017 | 08/31/2018 | [TEXT_204] |
| 258 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 24 | 0 | 24 | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 | F5Z52AAE | Service | Hortonworks Data Platform (HDP) Enterprise Subscription 4 N/50TB Raw Strg 1yr 24x7 Supp E-LTU | 0 | $12,429.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 05/31/2020 | [TEXT_227] |
| 259 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 24 | 0 | 24 | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 | P9P38AAE | Service | Hortonworks OnSt Tng Del Ad Stu PD E-LTU | 0 | $530.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2016 | 07/31/2020 | [TEXT_228] |


### Chassis Variants

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Product # | Form Factor | Description | Option Type | HPE Recommended | List Price (USD) | Constraint | Start Date | Discontinued Date | Note |
| 2 | P51174-B21 | Unknown | HPE Synergy 12000 Configure-to-order Frame | CTO | No | $6,130.00 | min 1, max 1 |  | Unknown | Select ONE chassis variant as the mandatory CTO base. All component rules, drive bay limits, and power constraints depend on this selection. |


### Chassis Options Matrix

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Base SKU | Form Factor | Option Type | HPE Recommended | List Price (USD) | Drive Media Supported | Base Drive Bays | Max Expandability | Power Envelope | Lifecycle Status | Start Date | Discontinued Date | Architectural Rules |
| 2 | P51174-B21 | Unknown | CTO | No | $6,130.00 | UNVERIFIED — variant-specific evidence required | UNVERIFIED — title is not a bay inventory | UNVERIFIED — variant-specific evidence required | UNVERIFIED — variant-specific evidence required | Active |  | Unknown | NOT VERIFIED: do not transfer compatibility or rules between base SKUs without scoped vendor evidence. |


### Rules &amp; Constraints

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 |
| --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Constraint | Rule Type | Rule Text |
| 2 | Software | Solutions Software | Unlimited | Quantity Constraint | Quantity: Unlimited |
| 3 | Unknown | HPE Workload Aware Security | max 1 | Quantity Constraint | Quantity: max 1 |
| 4 | Unknown | Storage | max 12 | Quantity Constraint | Quantity: max 12 |
| 5 | Cooling Options | Cooling Options | min 1, Required | Quantity Constraint | Quantity: min 1, Required |
| 6 | Unknown | Compute | max 12 | Quantity Constraint | Quantity: max 12 |
| 7 | Management Hardware | Appliance | max 2 | Quantity Constraint | Quantity: max 2 |
| 8 | Management Hardware | Redundant Frame Link | max 2 | Quantity Constraint | Quantity: max 2 |
| 9 | Management Hardware | Frame Link Module USB | max 99 | Quantity Constraint | Quantity: max 99 |
| 10 | Interconnects | Interconnects | max 6 | Quantity Constraint | Quantity: max 6 |
| 11 | Interconnects | Direct Attach Cables | max 18 | Quantity Constraint | Quantity: max 18 |
| 12 | Interconnects | CAT Ethernet Cables | max 12 | Quantity Constraint | Quantity: max 12 |
| 13 | Interconnects | Tape Storage | max 99 | Quantity Constraint | Quantity: max 99 |
| 14 | Frame Options | Frame Options | max 2 | Quantity Constraint | Quantity: max 2 |
| 15 | Frame Options | Rack Options | max 2 | Quantity Constraint | Quantity: max 2 |
| 16 | Operating Environment | Red Hat Enterprise Linux Server | Unlimited | Quantity Constraint | Quantity: Unlimited |
| 17 | Operating Environment | Non Preinstalled Operating System | Unlimited | Quantity Constraint | Quantity: Unlimited |
| 18 | Cooling Options | Cooling Options (required) | max 10 | Quantity Constraint | Quantity: max 10 |
| 19 | Cooling Options | Power Supply (required) | max 12 | Quantity Constraint | Quantity: max 12 |
| 20 | Cooling Options | Power Supply | min 1, Required | Quantity Constraint | Quantity: min 1, Required |
| 21 | Cooling Options | Accessories | max 6 | Quantity Constraint | Quantity: max 6 |
| 22 | Cooling Options | Power Cords | max 12 | Quantity Constraint | Quantity: max 12 |
| 23 | Cooling Options | Manufacturing Services | max 1 | Quantity Constraint | Quantity: max 1 |
| 24 | Chassis | Variants | min 1, max 1 — Active OCA CTO chassis | Configuration Rule | Select exactly one currently discoverable, non-TAA/non-GTA CTO base chassis |
| 25 | Frame Options | Compute | max 12 | Configuration Rule | Selection constraint for Compute: max 12 |
| 26 | Accessories &amp; Infrastructure | Compute | max 12 | Configuration Rule | Non-TAA Model cannot support TAA products. |
| 27 | Frame Options | Smart Array SAS Controllers | max 12 | Configuration Rule | CTO Compute and Storage Modules can only be configured in a CTO Frame. |
| 28 | Frame Options | Smart Array SAS Controllers | max 12 | Configuration Rule | 871943-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL |
| 29 | Frame Options | Smart Array SAS Controllers | max 12 | Configuration Rule | 871945-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL |
| 30 | Frame Options | Smart Array SAS Controllers | max 12 | Configuration Rule | 871946-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL |
| 31 | Frame Options | Smart Array SAS Controllers | max 12 | Configuration Rule | 826950-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL |
| 32 | Frame Options | Smart Array SAS Controllers | max 12 | Configuration Rule | 826951-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL |
| 33 | Frame Options | Smart Array SAS Controllers | max 12 | Configuration Rule | 826952-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL |
| 34 | Frame Options | Smart Array SAS Controllers | max 12 | Configuration Rule | 826953-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL |
| 35 | Frame Options | Smart Array SAS Controllers | max 12 | Configuration Rule | 826954-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL |
| 36 | Frame Options | Smart Array SAS Controllers | max 12 | Configuration Rule | 834483-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL |
| 37 | Frame Options | Smart Array SAS Controllers | max 12 | Configuration Rule | 834484-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL |
| 38 | Frame Options | Smart Array SAS Controllers | max 12 | Configuration Rule | 871932-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL |
| 39 | Frame Options | Smart Array SAS Controllers | max 12 | Configuration Rule | 871933-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL |
| 40 | Frame Options | Smart Array SAS Controllers | max 12 | Configuration Rule | 871934-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL |
| 41 | Frame Options | Smart Array SAS Controllers | max 12 | Configuration Rule | 826956-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL |
| 42 | Frame Options | Smart Array SAS Controllers | max 12 | Configuration Rule | 826957-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL |
| 43 | Frame Options | Smart Array SAS Controllers | max 12 | Configuration Rule | 826958-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL |
| 44 | Frame Options | Smart Array SAS Controllers | max 12 | Configuration Rule | 834480-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL |
| 45 | Frame Options | Smart Array SAS Controllers | max 12 | Configuration Rule | 834481-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL |
| 46 | Accessories &amp; Infrastructure | Storage | max 12 | Configuration Rule | Selection constraint for Storage: max 12 |
| 47 | Drive Enclosures / Drives | SFF Drive Cages &amp; Enablement | max 24 | Configuration Rule | CTO Compute and Storage Modules can only be configured in a CTO Frame. |
| 48 | Drive Enclosures / Drives | SFF Drive Cages &amp; Enablement | max 24 | Configuration Rule | 755984-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL |
| 49 | Management Hardware | Appliance | max 2 | Configuration Rule | Selection constraint for Appliance: max 2 |
| 50 | Accessories &amp; Infrastructure | System Options | optional | Configuration Rule | Mixing Composer and Composer 2 is not allowed |
| 51 | Accessories &amp; Infrastructure | System Options | optional | Configuration Rule | 804353-B21 conditional visibility: portal selector activation required (Mixing Composer and Composer 2 is not allowed); PORTAL_CONDITIONAL |
| 52 | Accessories &amp; Infrastructure | System Options | optional | Configuration Rule | Selection constraint for System Options: optional |
| 53 | Accessories &amp; Infrastructure | System Options | optional | Configuration Rule | 804937-B21 conditional visibility: portal selector activation required (If HPE Synergy 4-port Frame Link Module is included in the 12000 Frame, Synergy Image Streamer on Synergy Composer cannot be selected.); PORTAL_CONDITIONAL |
| 54 | Management Hardware | Appliance | max 2 | Configuration Rule | Max quantity of product limited by space available. |
| 55 | Management Hardware | Appliance | max 2 | Configuration Rule | P54624-B21 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 56 | Management Hardware | Appliance | max 2 | Configuration Rule | Mixing of Composer 2 and Composer 2 Plus modules is not allowed. |
| 57 | Management Hardware | Appliance | max 2 | Configuration Rule | P73869-B21 conditional visibility: portal selector activation required (Mixing of Composer 2 and Composer 2 Plus modules is not allowed.); PORTAL_CONDITIONAL |
| 58 | Management Hardware | Redundant Frame Link | max 2 | Configuration Rule | Selection constraint for Redundant Frame Link: max 2 |
| 59 | Management Hardware | Frame Link Module USB | max 99 | Configuration Rule | Selection constraint for Frame Link Module USB: max 99 |
| 60 | Management Hardware | Frame Link Module USB | max 99 | Configuration Rule | 804942-B21 conditional visibility: portal selector activation required (Either Frame link Module or 4p Frame Link Module can be selected. Mixing is not allowed.); PORTAL_CONDITIONAL |
| 61 | Networking | Optical Transceivers &amp; DAC Cables | max 6 | Configuration Rule | Selection constraint for Optical Transceivers &amp; DAC Cables: max 6 |
| 62 | Networking | System Options | max 8 | Configuration Rule | Product is obsolete |
| 63 | Networking | System Options | max 8 | Configuration Rule | 489184-B21 conditional visibility: portal selector activation required (Product is obsolete); PORTAL_CONDITIONAL |
| 64 | Networking | PCIe Networking Adapters | max 8 | Configuration Rule | Product not supported |
| 65 | Networking | PCIe Networking Adapters | max 8 | Configuration Rule | 648312-B21 conditional visibility: portal selector activation required (Product not supported); PORTAL_CONDITIONAL |
| 66 | Networking | PCIe Networking Adapters | max 8 | Configuration Rule | 658247-B21 conditional visibility: portal selector activation required (Product not supported); PORTAL_CONDITIONAL |
| 67 | Networking | PCIe Networking Adapters | max 8 | Configuration Rule | 674280-B21 conditional visibility: portal selector activation required (Product not supported); PORTAL_CONDITIONAL |
| 68 | Networking | PCIe Networking Adapters | max 8 | Configuration Rule | 674281-B21 conditional visibility: portal selector activation required (Product not supported); PORTAL_CONDITIONAL |
| 69 | Networking | PCIe Networking Adapters | max 8 | Configuration Rule | 674282-B21 conditional visibility: portal selector activation required (Product not supported); PORTAL_CONDITIONAL |
| 70 | Networking | PCIe Networking Adapters | max 8 | Configuration Rule | 674283-B21 conditional visibility: portal selector activation required (Product not supported); PORTAL_CONDITIONAL |
| 71 | Networking | PCIe Networking Adapters | max 8 | Configuration Rule | 674284-B21 conditional visibility: portal selector activation required (Product not supported); PORTAL_CONDITIONAL |
| 72 | Networking | PCIe Networking Adapters | max 8 | Configuration Rule | 829914-B21 conditional visibility: portal selector activation required (Product not supported); PORTAL_CONDITIONAL |
| 73 | Networking | PCIe Networking Adapters | max 8 | Configuration Rule | 829915-B21 conditional visibility: portal selector activation required (Product not supported); PORTAL_CONDITIONAL |
| 74 | Networking | PCIe Networking Adapters | max 8 | Configuration Rule | 829916-B21 conditional visibility: portal selector activation required (Product not supported); PORTAL_CONDITIONAL |
| 75 | Networking | PCIe Networking Adapters | max 8 | Configuration Rule | 843191-B21 conditional visibility: portal selector activation required (Product not supported); PORTAL_CONDITIONAL |
| 76 | Networking | PCIe Networking Adapters | max 8 | Configuration Rule | 843192-B21 conditional visibility: portal selector activation required (Product not supported); PORTAL_CONDITIONAL |
| 77 | Networking | PCIe Networking Adapters | max 8 | Configuration Rule | 843193-B21 conditional visibility: portal selector activation required (Product not supported); PORTAL_CONDITIONAL |
| 78 | Networking | PCIe Networking Adapters | max 8 | Configuration Rule | 846041-B21 conditional visibility: portal selector activation required (Product not supported); PORTAL_CONDITIONAL |
| 79 | Networking | System Options | max 8 | Configuration Rule | Cannot mix together in the same Synergy 12000 Frame |
| 80 | Networking | System Options | max 8 | Configuration Rule | 794502-B23 conditional visibility: portal selector activation required (Cannot mix together in the same Synergy 12000 Frame); PORTAL_CONDITIONAL |
| 81 | Cables &amp; Enablement Kits | Direct Attach Cables | max 18 | Configuration Rule | Selection constraint for Direct Attach Cables: max 18 |
| 82 | Networking | CAT Ethernet Cables | max 12 | Configuration Rule | Selection constraint for CAT Ethernet Cables: max 12 |
| 83 | Tape Drives | LTO Tape Drives | max 99 | Configuration Rule | Selection constraint for LTO Tape Drives: max 99 |
| 84 | Accessories &amp; Infrastructure | Frame Options | max 2 | Configuration Rule | Selection constraint for Frame Options: max 2 |
| 85 | Accessories &amp; Infrastructure | -48VDC Power Supplies &amp; Cable Kits | max 2 | Configuration Rule | Selection constraint for -48VDC Power Supplies &amp; Cable Kits: max 2 |
| 86 | Software &amp; Licenses | Red Hat Enterprise Linux Server | no max | Configuration Rule | Selection constraint for Red Hat Enterprise Linux Server: no max |
| 87 | Cooling / Thermal | High Performance &amp; Standard Fan Kits | max 6 | Configuration Rule | Selection constraint for High Performance &amp; Standard Fan Kits: max 6 |
| 88 | Power Supplies | Power Supply | required | Configuration Rule | Selection constraint for Power Supply: required |
| 89 | Power Supplies | Power Supply | required | Configuration Rule | 798095-B21 conditional visibility: portal selector activation required (Model X - No Mixing of Power Supplies is allowed.  All selected Power Supplies must be of the same part number.  Minimum should be determined based on the Power Advisor Program.  (Minimum is always at least 2 - Power Advisor Program will  indicate scenarios in which more than 2 is required)); PORTAL_CONDITIONAL |
| 90 | Power Supplies | Power Supply | required | Configuration Rule | 798096-B21 conditional visibility: portal selector activation required (Model X - No Mixing of Power Supplies is allowed.  All selected Power Supplies must be of the same part number.  Minimum should be determined based on the Power Advisor Program.  (Minimum is always at least 2 - Power Advisor Program will  indicate scenarios in which more than 2 is required)); PORTAL_CONDITIONAL |
| 91 | Power Supplies | Power Supply | required | Configuration Rule | 876929-B21 conditional visibility: portal selector activation required (Model X - No Mixing of Power Supplies is allowed.  All selected Power Supplies must be of the same part number.  Minimum should be determined based on the Power Advisor Program.  (Minimum is always at least 2 - Power Advisor Program will  indicate scenarios in which more than 2 is required)); PORTAL_CONDITIONAL |
| 92 | Power Supplies | Power Supply | required | Configuration Rule | P27749-B21 conditional visibility: portal selector activation required (Model X - No Mixing of Power Supplies is allowed.  All selected Power Supplies must be of the same part number.  Minimum should be determined based on the Power Advisor Program.  (Minimum is always at least 2 - Power Advisor Program will  indicate scenarios in which more than 2 is required)); PORTAL_CONDITIONAL |
| 93 | Power Supplies | Power Supply | required | Configuration Rule | P27750-B21 conditional visibility: portal selector activation required (Model X - No Mixing of Power Supplies is allowed.  All selected Power Supplies must be of the same part number.  Minimum should be determined based on the Power Advisor Program.  (Minimum is always at least 2 - Power Advisor Program will  indicate scenarios in which more than 2 is required)); PORTAL_CONDITIONAL |
| 94 | Power Supplies | Power Supply | required | Configuration Rule | 798099-B21 conditional visibility: portal selector activation required (Model X - No Mixing of Power Supplies is allowed.  All selected Power Supplies must be of the same part number.  Minimum should be determined based on the Power Advisor Program.  (Minimum is always at least 2 - Power Advisor Program will  indicate scenarios in which more than 2 is required)); PORTAL_CONDITIONAL |
| 95 | Power Supplies | Power Supply | required | Configuration Rule | 798100-B21 conditional visibility: portal selector activation required (Model X - No Mixing of Power Supplies is allowed.  All selected Power Supplies must be of the same part number.  Minimum should be determined based on the Power Advisor Program.  (Minimum is always at least 2 - Power Advisor Program will  indicate scenarios in which more than 2 is required)); PORTAL_CONDITIONAL |
| 96 | Power Supplies | Power Supply | required | Configuration Rule | 798101-B21 conditional visibility: portal selector activation required (Model X - No Mixing of Power Supplies is allowed.  All selected Power Supplies must be of the same part number.  Minimum should be determined based on the Power Advisor Program.  (Minimum is always at least 2 - Power Advisor Program will  indicate scenarios in which more than 2 is required)); PORTAL_CONDITIONAL |
| 97 | Power Supplies | Power Supply | required | Configuration Rule | 798102-B21 conditional visibility: portal selector activation required (Model X - No Mixing of Power Supplies is allowed.  All selected Power Supplies must be of the same part number.  Minimum should be determined based on the Power Advisor Program.  (Minimum is always at least 2 - Power Advisor Program will  indicate scenarios in which more than 2 is required)); PORTAL_CONDITIONAL |
| 98 | Power Supplies | Power Supply | required | Configuration Rule | 798342-B21 conditional visibility: portal selector activation required (Model X - No Mixing of Power Supplies is allowed.  All selected Power Supplies must be of the same part number.  Minimum should be determined based on the Power Advisor Program.  (Minimum is always at least 2 - Power Advisor Program will  indicate scenarios in which more than 2 is required)); PORTAL_CONDITIONAL |
| 99 | Power Supplies | Power Supply | required | Configuration Rule | 798349-B21 conditional visibility: portal selector activation required (Model X - No Mixing of Power Supplies is allowed.  All selected Power Supplies must be of the same part number.  Minimum should be determined based on the Power Advisor Program.  (Minimum is always at least 2 - Power Advisor Program will  indicate scenarios in which more than 2 is required)); PORTAL_CONDITIONAL |
| 100 | Networking | PCIe Networking Adapters | max 6 | Configuration Rule | Selection constraint for PCIe Networking Adapters: max 6 |
| 101 | Cables &amp; Enablement Kits | Power Cords | max 12 | Configuration Rule | Selection constraint for Power Cords: max 12 |
| 102 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables |  | Configuration Rule | This cable kit support with only the following power supplies |
| 103 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables |  | Configuration Rule | J6X00A conditional visibility: portal selector activation required (This cable kit support with only the following power supplies); PORTAL_CONDITIONAL |
| 104 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables |  | Configuration Rule | P9B75A conditional visibility: portal selector activation required (This cable kit support with only the following power supplies); PORTAL_CONDITIONAL |
| 105 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables |  | Configuration Rule | J6W98A conditional visibility: portal selector activation required (This cable kit support with only the following power supplies); PORTAL_CONDITIONAL |
| 106 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables |  | Configuration Rule | J6W99A conditional visibility: portal selector activation required (This cable kit support with only the following power supplies); PORTAL_CONDITIONAL |
| 107 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables |  | Configuration Rule | J6X01A conditional visibility: portal selector activation required (This cable kit support with only the following power supplies); PORTAL_CONDITIONAL |
| 108 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables |  | Configuration Rule | J6X02A conditional visibility: portal selector activation required (This cable kit support with only the following power supplies); PORTAL_CONDITIONAL |
| 109 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables |  | Configuration Rule | J6X03A conditional visibility: portal selector activation required (This cable kit support with only the following power supplies); PORTAL_CONDITIONAL |
| 110 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables |  | Configuration Rule | P9B77A conditional visibility: portal selector activation required (This cable kit support with only the following power supplies); PORTAL_CONDITIONAL |
| 111 | Power Supplies | -48VDC Power Supplies &amp; Cable Kits | min 1, max 2 | Configuration Rule | Selection constraint for -48VDC Power Supplies &amp; Cable Kits: min 1, max 2 |
| 112 | Power Supplies | -48VDC Power Supplies &amp; Cable Kits | min 1, max 2 | Configuration Rule | 872035-B21 conditional visibility: portal selector activation required (This option cable kit contains 6 six power cords and support only with the following power supplies); PORTAL_CONDITIONAL |
| 113 | Drive Enclosures / Drives | Hard Disk Drives (SAS/SATA) | max 24 | Configuration Rule | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 |
| 114 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | max 24 | Configuration Rule | Selection constraint for Hard Disk Drives (SAS/SATA): max 24 |
| 115 | Software &amp; Licenses | Non Preinstalled Operating System | no max | Configuration Rule | Selection constraint for Non Preinstalled Operating System: no max |
| 116 | Support Services | Server Management &amp; Operating System Licenses | max 1 | Configuration Rule | Selection constraint for Server Management &amp; Operating System Licenses: max 1 |
| 117 | Support Services | Manufacturing Services | max 1 | Configuration Rule | Selection constraint for Manufacturing Services: max 1 |
| 118 | Support Services | Support &amp; Deployment Services | max 8 | Configuration Rule | Selection constraint for OCP3 Networking Adapters: max 8 |
| 119 | Support Services | Compute | max 12 | Configuration Rule | Selection constraint for Compute: max 12 |
| 120 | Compute and Storage | Configuration Rules | Non-TAA Model cannot support TAA products. | Learned Feedback Rule | [MUTUAL_EXCLUSION] Non-TAA Model cannot support TAA products. |
| 121 | Compute and Storage | Configuration Rules | CTO Compute and Storage Modules can only be configured in a CTO Frame. | Learned Feedback Rule | [MUTUAL_EXCLUSION] CTO Compute and Storage Modules can only be configured in a CTO Frame. |
| 122 | Management Hardware | Configuration Rules | Mixing Composer and Composer 2 is not allowed | Learned Feedback Rule | [MUTUAL_EXCLUSION] Mixing Composer and Composer 2 is not allowed |
| 123 | Management Hardware | Configuration Rules | Non-TAA Model cannot support TAA products. | Learned Feedback Rule | [MUTUAL_EXCLUSION] Non-TAA Model cannot support TAA products. |
| 124 | Management Hardware | Configuration Rules | [TEXT_229] | Learned Feedback Rule | [MUTUAL_EXCLUSION] If HPE Synergy 4-port Frame Link Module is included in the 12000 Frame, Synergy Image Streamer on Synergy Composer cannot be selected. |
| 125 | Management Hardware | Configuration Rules | Max quantity of product limited by space available. | Learned Feedback Rule | [MUTUAL_EXCLUSION] Max quantity of product limited by space available. |
| 126 | Management Hardware | Configuration Rules | Mixing of Composer 2 and Composer 2 Plus modules is not allowed. | Learned Feedback Rule | [MUTUAL_EXCLUSION] Mixing of Composer 2 and Composer 2 Plus modules is not allowed. |
| 127 | Management Hardware | Configuration Rules | Either Frame link Module or 4p Frame Link Module can be selected. Mixing is not allowed. | Learned Feedback Rule | [MUTUAL_EXCLUSION] Either Frame link Module or 4p Frame Link Module can be selected. Mixing is not allowed. |
| 128 | Interconnects | Configuration Rules | Non-TAA Model cannot support TAA products. | Learned Feedback Rule | [MUTUAL_EXCLUSION] Non-TAA Model cannot support TAA products. |
| 129 | Interconnects | Configuration Rules | Product is obsolete | Learned Feedback Rule | [MUTUAL_EXCLUSION] Product is obsolete |
| 130 | Interconnects | Configuration Rules | Product not supported | Learned Feedback Rule | [MUTUAL_EXCLUSION] Product not supported |
| 131 | Interconnects | Configuration Rules | Cannot mix together in the same Synergy 12000 Frame | Learned Feedback Rule | [MUTUAL_EXCLUSION] Cannot mix together in the same Synergy 12000 Frame |
| 132 | Power | Configuration Rules | [TEXT_230] | Learned Feedback Rule | [MUTUAL_EXCLUSION] Model X - No Mixing of Power Supplies is allowed. All selected Power Supplies must be of the same part number. Minimum should be determined based on the Power Advisor Program. (Minimum is always at least 2 - Power Advisor Program will indicate scenarios in which more than 2 is required) |
| 133 | Power | Configuration Rules | This cable kit support with only the following power supplies | Learned Feedback Rule | [MUTUAL_EXCLUSION] This cable kit support with only the following power supplies |
| 134 | Power | Configuration Rules | This option cable kit contains 6 six power cords and support only with the following power supplies | Learned Feedback Rule | [MUTUAL_EXCLUSION] This option cable kit contains 6 six power cords and support only with the following power supplies |
| 135 | Operating Environment | Red Hat Enterprise Linux Server |  | Minimum Requirement | Minimum 1 of any of the OS SKUs must be selected. |
| 136 | Operating Environment | Red Hat Enterprise Linux Server |  | Recommendation | It is recommended to select an Operating System (Non Preinstalled Operating System, Red Hat Enterprise Linux Server) |


### Unavailable Rules &amp; Gates

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Rule ID | Rule Type | Section | Constraint / Reason | Affected SKU Count | Affected SKUs |
| 2 | RULE_1 | CONDITIONAL_VISIBILITY | Compute and Storage | Non-TAA Model cannot support TAA products. | 11 | 871940-B22, 871941-B22, 871942-B22, P22139-B22, P39531-B22, P83805-B21, P68217-B21, P83806-B21, 871929-B22, 871930-B22, 871931-B22 |
| 3 | RULE_2 | CONDITIONAL_VISIBILITY | Compute and Storage | CTO Compute and Storage Modules can only be configured in a CTO Frame. | 18 | 871943-B21, 871945-B21, 871946-B21, 826950-B21, 826951-B21, 826952-B21, 826953-B21, 826954-B21, 834483-B21, 834484-B21, 871932-B21, 871933-B21, 871934-B21, 826956-B21, 826957-B21, 826958-B21, 834480-B21, 834481-B21 |
| 4 | RULE_3 | CONDITIONAL_VISIBILITY | Compute and Storage | CTO Compute and Storage Modules can only be configured in a CTO Frame. | 1 | 755984-B21 |
| 5 | RULE_4 | CONDITIONAL_VISIBILITY | Management Hardware | Mixing Composer and Composer 2 is not allowed | 1 | 804353-B21 |
| 6 | RULE_5 | CONDITIONAL_VISIBILITY | Management Hardware | Non-TAA Model cannot support TAA products. | 4 | 804353-B22, 804937-B22, 872957-B22, P73869-B22 |
| 7 | RULE_6 | CONDITIONAL_VISIBILITY | Management Hardware | [TEXT_229] | 1 | 804937-B21 |
| 8 | RULE_7 | CONDITIONAL_VISIBILITY | Management Hardware | Max quantity of product limited by space available. | 1 | P54624-B21 |
| 9 | RULE_8 | CONDITIONAL_VISIBILITY | Management Hardware | Mixing of Composer 2 and Composer 2 Plus modules is not allowed. | 1 | P73869-B21 |
| 10 | RULE_9 | CONDITIONAL_VISIBILITY | Management Hardware | Either Frame link Module or 4p Frame Link Module can be selected. Mixing is not allowed. | 1 | 804942-B21 |
| 11 | RULE_10 | CONDITIONAL_VISIBILITY | Management Hardware | Non-TAA Model cannot support TAA products. | 1 | 804942-B22 |
| 12 | RULE_11 | CONDITIONAL_VISIBILITY | Interconnects | Non-TAA Model cannot support TAA products. | 5 | 867793-B22, 867796-B22, 779215-B22, 779218-B22, 799330-B22 |
| 13 | RULE_12 | CONDITIONAL_VISIBILITY | Interconnects | Product is obsolete | 1 | 489184-B21 |
| 14 | RULE_13 | CONDITIONAL_VISIBILITY | Interconnects | Product not supported | 14 | 648312-B21, 658247-B21, 674280-B21, 674281-B21, 674282-B21, 674283-B21, 674284-B21, 829914-B21, 829915-B21, 829916-B21, 843191-B21, 843192-B21, 843193-B21, 846041-B21 |
| 15 | RULE_14 | CONDITIONAL_VISIBILITY | Interconnects | Cannot mix together in the same Synergy 12000 Frame | 1 | 794502-B23 |
| 16 | RULE_15 | CONDITIONAL_VISIBILITY | Power | [TEXT_230] | 11 | 798095-B21, 798096-B21, 876929-B21, P27749-B21, P27750-B21, 798099-B21, 798100-B21, 798101-B21, 798102-B21, 798342-B21, 798349-B21 |
| 17 | RULE_16 | CONDITIONAL_VISIBILITY | Power | This cable kit support with only the following power supplies | 8 | J6X00A, P9B75A, J6W98A, J6W99A, J6X01A, J6X02A, J6X03A, P9B77A |
| 18 | RULE_17 | CONDITIONAL_VISIBILITY | Power | This option cable kit contains 6 six power cords and support only with the following power supplies | 1 | 872035-B21 |


### Software &amp; Licenses

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |
| 39 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R6J26AAE | Service | Red Hat Ansible Automation Platform 100 Nodes 1yr Subscription 9x5 RH Support E-LTU | 0 | $21,544.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 08/03/2020 | 12/30/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":21544,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 40 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R6J29AAE | Service | Red Hat Ansible Automation Platform 100 Nodes 3yr Subscription 9x5 RH Support E-LTU | 0 | $86,513.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 08/03/2020 | 04/01/2025 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":86513,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 41 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1B00AAE | Service | Red Hat Ansible Engine Premium 100 Nodes 1yr Subscription 24x7 RH Support E-LTU | 0 | $7,717.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/03/2018 | 07/30/2020 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":7717,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 42 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1B01AAE | Service | Red Hat Ansible Engine Premium 100 Nodes 3yr Subscription 24x7 RH Support E-LTU | 0 | $21,994.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/03/2018 | 07/30/2020 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":21994,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 43 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1B04AAE | Service | Red Hat Ansible Engine Premium 10000 Nodes 1yr Subscription 24x7 RH Support E-LTU | 0 | $771,746.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/03/2018 | 07/30/2020 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":771746,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 44 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1B05AAE | Service | Red Hat Ansible Engine Premium 10000 Nodes 3yr Subscription 24x7 RH Support E-LTU | 0 | $2,199,750.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/03/2018 | 07/30/2020 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":2199750,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 45 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1B02AAE | Service | Red Hat Ansible Engine Premium 5000 Nodes 1yr Subscription 24x7 RH Support E-LTU | 0 | $385,876.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/03/2018 | 07/30/2020 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":385876,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 46 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1B03AAE | Service | Red Hat Ansible Engine Premium 5000 Nodes 3yr Subscription 24x7 RH Support E-LTU | 0 | $1,099,351.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/03/2018 | 07/30/2020 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1099351,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 47 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1A94AAE | Service | Red Hat Ansible Engine Standard 100 Nodes 1yr Subscription 9x5 RH Support E-LTU | 0 | $5,512.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/03/2018 | 10/15/2020 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":5512,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 48 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1A95AAE | Service | Red Hat Ansible Engine Standard 100 Nodes 3yr Subscription 9x5 RH Support E-LTU | 0 | $15,718.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/03/2018 | 07/30/2020 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":15718,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 49 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1A98AAE | Service | Red Hat Ansible Engine Standard 10000 Nodes 1yr Subscription 9x5 RH Support E-LTU | 0 | $551,246.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/03/2018 | 07/30/2020 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":551246,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 50 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1A99AAE | Service | Red Hat Ansible Engine Standard 10000 Nodes 3yr Subscription 9x5 RH Support E-LTU | 0 | $1,570,801.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/03/2018 | 07/30/2020 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1570801,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 51 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1A96AAE | Service | Red Hat Ansible Engine Standard 5000 Nodes 1yr Subscription 9x5 RH Support E-LTU | 0 | $275,623.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/03/2018 | 07/30/2020 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":275623,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 52 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1A97AAE | Service | Red Hat Ansible Engine Standard 5000 Nodes 3yr Subscription 9x5 RH Support E-LTU | 0 | $785,400.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/03/2018 | 07/30/2020 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":785400,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 53 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1Z74AAE | Service | Red Hat Ansible Engine for HPE Synergy 100 Nodes 1yr Subscription 24x7 RH Support E-LTU | 0 | $7,679.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 02/04/2019 | 03/31/2021 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":7679,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 54 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1Z80AAE | Service | Red Hat Ansible Engine for HPE Synergy 100 Nodes 1yr Subscription 9x5 RH Support E-LTU | 0 | $5,249.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 02/04/2019 | 03/31/2021 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":5249,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 55 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1Z75AAE | Service | Red Hat Ansible Engine for HPE Synergy 100 Nodes 3yr Subscription 24x7 RH Support E-LTU | 0 | $21,884.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 02/04/2019 | 03/31/2021 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":21884,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 56 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1Z81AAE | Service | Red Hat Ansible Engine for HPE Synergy 100 Nodes 3yr Subscription 9x5 RH Support E-LTU | 0 | $15,639.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 02/04/2019 | 03/31/2021 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":15639,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 57 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1Z78AAE | Service | Red Hat Ansible Engine for HPE Synergy 10000 Nodes 1yr Subscription 24x7 RH Support E-LTU | 0 | $767,887.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 02/04/2019 | 03/31/2021 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":767887,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 58 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1Z84AAE | Service | Red Hat Ansible Engine for HPE Synergy 10000 Nodes 1yr Subscription 9x5 RH Support E-LTU | 0 | $548,490.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 02/04/2019 | 03/31/2021 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":548490,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 59 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1Z79AAE | Service | Red Hat Ansible Engine for HPE Synergy 10000 Nodes 3yr Subscription 24x7 RH Support E-LTU | 0 | $2,188,751.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 02/04/2019 | 03/31/2021 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":2188751,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 60 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1Z85AAE | Service | Red Hat Ansible Engine for HPE Synergy 10000 Nodes 3yr Subscription 9x5 RH Support E-LTU | 0 | $1,562,947.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 02/04/2019 | 03/31/2021 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1562947,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 61 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1Z76AAE | Service | Red Hat Ansible Engine for HPE Synergy 5000 Nodes 1yr Subscription 24x7 RH Support E-LTU | 0 | $383,947.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 02/04/2019 | 03/31/2021 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":383947,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 62 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1Z82AAE | Service | Red Hat Ansible Engine for HPE Synergy 5000 Nodes 1yr Subscription 9x5 RH Support E-LTU | 0 | $274,245.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 02/04/2019 | 03/31/2021 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":274245,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 63 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1Z77AAE | Service | Red Hat Ansible Engine for HPE Synergy 5000 Nodes 3yr Subscription 24x7 RH Support E-LTU | 0 | $1,093,854.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 02/04/2019 | 03/31/2021 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1093854,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 64 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1Z83AAE | Service | Red Hat Ansible Engine for HPE Synergy 5000 Nodes 3yr Subscription 9x5 RH Support E-LTU | 0 | $781,473.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 02/04/2019 | 03/31/2021 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":781473,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 65 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1B10AAE | Service | Red Hat Ansible Tower with Ansible Engine Premium 100 Nodes 1yr Subscription 24x7 RH Support E-LTU | 0 | $18,399.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/03/2018 | 05/08/2022 | [TEXT_231] |
| 66 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1B11AAE | Service | Red Hat Ansible Tower with Ansible Engine Premium 100 Nodes 3yr Subscription 24x7 RH Support E-LTU | 0 | $55,019.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/03/2018 | 07/30/2020 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":55019,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 67 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1B08AAE | Service | Red Hat Ansible Tower with Ansible Engine Premium 10000 Nodes 1yr Subscription 24x7 RH Support E-LTU | 0 | $1,653,751.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/03/2018 | 07/30/2020 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1653751,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 68 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1B09AAE | Service | Red Hat Ansible Tower with Ansible Engine Premium 10000 Nodes 3yr Subscription 24x7 RH Support E-LTU | 0 | $4,713,450.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/03/2018 | 07/30/2020 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":4713450,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 69 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1B06AAE | Service | Red Hat Ansible Tower with Ansible Engine Premium 5000 Nodes 1yr Subscription 24x7 RH Support E-LTU | 0 | $826,875.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/03/2018 | 07/30/2020 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":826875,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 70 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1B07AAE | Service | Red Hat Ansible Tower with Ansible Engine Premium 5000 Nodes 3yr Subscription 24x7 RH Support E-LTU | 0 | $2,357,248.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/03/2018 | 07/30/2020 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":2357248,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 71 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1Z86AAE | Service | Red Hat Ansible Tower with Ansible Engine for HPE Synergy 100 Nodes 1yr 24x7 RH Support E-LTU | 0 | $18,399.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 02/04/2019 | 03/31/2021 | [TEXT_231] |
| 72 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1Z87AAE | Service | Red Hat Ansible Tower with Ansible Engine for HPE Synergy 100 Nodes 3yr 24x7 RH Support E-LTU | 0 | $54,744.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 02/04/2019 | 03/31/2021 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":54744,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 73 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1Z90AAE | Service | Red Hat Ansible Tower with Ansible Engine for HPE Synergy 10000 Nodes 1yr 24x7 RH Support E-LTU | 0 | $1,645,482.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 02/04/2019 | 03/31/2021 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1645482,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 74 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1Z91AAE | Service | Red Hat Ansible Tower with Ansible Engine for HPE Synergy 10000 Nodes 3yr 24x7 RH Support E-LTU | 0 | $4,689,883.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 02/04/2019 | 03/31/2021 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":4689883,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 75 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1Z88AAE | Service | Red Hat Ansible Tower with Ansible Engine for HPE Synergy 5000 Nodes 1yr 24x7 RH Support E-LTU | 0 | $822,741.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 02/04/2019 | 03/31/2021 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":822741,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 76 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1Z89AAE | Service | Red Hat Ansible Tower with Ansible Engine for HPE Synergy 5000 Nodes 3yr 24x7 RH Support E-LTU | 0 | $2,345,462.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 02/04/2019 | 03/31/2021 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":2345462,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 77 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1B18AAE | Service | Red Hat Hyper Converged Infrastructure 3-node POD 1yr Subscription 24x7 RH Support E-LTU | 0 | $19,844.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/03/2018 | 07/30/2020 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":19844,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 78 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1B16AAE | Service | Red Hat Hyper Converged Infrastructure 3-node POD 1yr Subscription 9x5 RH Support E-LTU | 0 | $12,599.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/03/2018 | 02/28/2022 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":12599,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 79 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1B19AAE | Service | Red Hat Hyper Converged Infrastructure 3-node POD 3yr Subscription 24x7 RH Support E-LTU | 0 | $56,595.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/03/2018 | 07/30/2020 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":56595,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 80 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1B17AAE | Service | Red Hat Hyper Converged Infrastructure 3-node POD 3yr Subscription 9x5 RH Support E-LTU | 0 | $37,693.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/03/2018 | 07/30/2020 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":37693,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 81 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1Z96AAE | Service | Red Hat Hyper Converged Infrastructure for HPE Synergy 3-node POD 1yr 24x7 RH Support E-LTU | 0 | $19,745.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 02/04/2019 | 03/31/2021 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":19745,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 82 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1Z98AAE | Service | Red Hat Hyper Converged Infrastructure for HPE Synergy 3-node POD 1yr 9x5 RH Support E-LTU | 0 | $13,163.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 02/04/2019 | 03/31/2021 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":13163,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 83 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1Z97AAE | Service | Red Hat Hyper Converged Infrastructure for HPE Synergy 3-node POD 3yr 24x7 RH Support E-LTU | 0 | $56,312.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 02/04/2019 | 03/31/2021 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":56312,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 84 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1Z99AAE | Service | Red Hat Hyper Converged Infrastructure for HPE Synergy 3-node POD 3yr 9x5 RH Support E-LTU | 0 | $37,505.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 02/04/2019 | 03/31/2021 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":37505,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 85 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1B15AAE | Service | Red Hat OpenShift Container Platform 1-2 Sockets 3yr Subscription 24x7 RH Support E-LTU | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/05/2018 | 11/29/2018 | [TEXT_204] |
| 86 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1B13AAE | Service | Red Hat OpenShift Container Platform 1-2 Sockets 3yr Subscription 9x5 RH Support E-LTU | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/05/2018 | 11/29/2018 | [TEXT_204] |
| 87 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1B14AAE | Service | Red Hat OpenShift Container Platform 1-32 Cores 1yr Subscription 24x7 RH Support E-LTU | 0 | $50,399.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/03/2018 | 03/01/2021 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":50399,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 88 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1B12AAE | Service | Red Hat OpenShift Container Platform 1-32 Cores 1yr Subscription 9x5 RH Support E-LTU | 0 | $34,016.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/03/2018 | 03/01/2021 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":34016,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 89 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R6J33AAE | Service | Red Hat OpenShift Container Platform 2 Cores or 4 vCPUs 1yr Subscription 9x5 RH Support E-LTU | 0 | $4,475.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 08/03/2020 | 12/30/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":4475,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 90 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R6J34AAE | Service | Red Hat OpenShift Container Platform 2 Cores or 4 vCPUs 3yr Subscription 24x7 RH Support E-LTU | 0 | $26,642.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 08/03/2020 | 04/01/2025 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":26642,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 91 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R6J35AAE | Service | Red Hat OpenShift Container Platform 2 Cores or 4 vCPUs 3yr Subscription 9x5 RH Support E-LTU | 0 | $17,987.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 08/03/2020 | 04/01/2025 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":17987,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 92 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1Z92AAE | Service | Red Hat OpenShift Container Platform for HPE Synergy 1-32 Cores 1yr Subscription 24x7 RH Sup E-LTU | 0 | $47,999.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 02/04/2019 | 03/31/2021 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":47999,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 93 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R1Z94AAE | Service | Red Hat OpenShift Container Platform for HPE Synergy 1-32 Cores 1yr Subscription 9x5 RH Sup E-LTU | 0 | $32,399.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 02/04/2019 | 03/31/2021 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":32399,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 94 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R6J37AAE | Service | Red Hat OpenShift Container Storage 2 Cores 1-year Subscription 9x5 RH Support E-LTU | 0 | $1,949.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 08/03/2020 | 11/30/2021 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1949,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 95 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R6J38AAE | Service | Red Hat OpenShift Container Storage 2 Cores 3-year Subscription 24x7 RH Support E-LTU | 0 | $7,699.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 08/03/2020 | 11/30/2021 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":7699,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 96 | Software &amp; Licenses | Non Preinstalled Operating System | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Software &amp; Licenses &gt; Non Preinstalled Operating System | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Non Preinstalled Operating System: no max | R6J39AAE | Service | Red Hat OpenShift Container Storage 2 Cores 3-year Subscription 9x5 RH Support E-LTU | 0 | $5,539.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 08/03/2020 | 11/30/2021 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":5539,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 97 | Support Services | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Server Management &amp; Operating System Licenses: max 1 | Q8K91A | Standard | HPE Workload Aware Security for Linux x86 Basic 1yr Support Instance LTU | 0 | $625.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/04/2017 | 08/10/2020 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":625,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"} |
| 98 | Support Services | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Server Management &amp; Operating System Licenses: max 1 | Q8K91AAE | Service | HPE Workload Aware Security for Linux x86 Basic 1yr Support Instance E-LTU | 0 | $625.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/04/2017 | 08/10/2020 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":625,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 99 | Support Services | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Server Management &amp; Operating System Licenses: max 1 | Q8K92A | Standard | HPE Workload Aware Security for Linux x86 Advanced Instance LTU | 0 | $1,875.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/04/2017 | 08/10/2020 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1875,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"} |
| 100 | Support Services | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Server Management &amp; Operating System Licenses: max 1 | Q8K92AAE | Service | HPE Workload Aware Security for Linux x86 Advanced 1yr Support Instance E-LTU | 0 | $1,875.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/04/2017 | 08/10/2020 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1875,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 101 | Support Services | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Server Management &amp; Operating System Licenses: max 1 | Q8K93A | Standard | HPE Workload Aware Security for Linux x86 Basic Media | 0 | $50.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/04/2017 | 08/10/2020 | [TEXT_232] |
| 102 | Support Services | Server Management &amp; Operating System Licenses | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Server Management &amp; Operating System Licenses: max 1 | Q8K94A | Standard | HPE Workload Aware Security for Linux x86 Advanced Media | 0 | $50.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/04/2017 | 08/10/2020 | [TEXT_232] |

Row 2: identical to sheet All SKUs, row 143.
Row 3: identical to sheet All SKUs, row 144.
Row 4: identical to sheet All SKUs, row 225.
Row 5: identical to sheet All SKUs, row 226.
Row 6: identical to sheet All SKUs, row 227.
Row 7: identical to sheet All SKUs, row 228.
Row 8: identical to sheet All SKUs, row 229.
Row 9: identical to sheet All SKUs, row 230.
Row 10: identical to sheet All SKUs, row 231.
Row 11: identical to sheet All SKUs, row 232.
Row 12: identical to sheet All SKUs, row 233.
Row 13: identical to sheet All SKUs, row 234.
Row 14: identical to sheet All SKUs, row 235.
Row 15: identical to sheet All SKUs, row 236.
Row 16: identical to sheet All SKUs, row 237.
Row 17: identical to sheet All SKUs, row 238.
Row 18: identical to sheet All SKUs, row 239.
Row 19: identical to sheet All SKUs, row 240.
Row 20: identical to sheet All SKUs, row 241.
Row 21: identical to sheet All SKUs, row 242.
Row 22: identical to sheet All SKUs, row 243.
Row 23: identical to sheet All SKUs, row 244.
Row 24: identical to sheet All SKUs, row 245.
Row 25: identical to sheet All SKUs, row 246.
Row 26: identical to sheet All SKUs, row 247.
Row 27: identical to sheet All SKUs, row 248.
Row 28: identical to sheet All SKUs, row 249.
Row 29: identical to sheet All SKUs, row 250.
Row 30: identical to sheet All SKUs, row 251.
Row 31: identical to sheet All SKUs, row 252.
Row 32: identical to sheet All SKUs, row 253.
Row 33: identical to sheet All SKUs, row 254.
Row 34: identical to sheet All SKUs, row 255.
Row 35: identical to sheet All SKUs, row 256.
Row 36: identical to sheet All SKUs, row 257.
Row 37: identical to sheet All SKUs, row 258.
Row 38: identical to sheet All SKUs, row 259.

### Support Services

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |
| 2 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | HA849A1 | Service | HPE Product and Package Labeling Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"HA849A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 3 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | HA851A1 | Service | HPE Customer Furnished Equipment Handling Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"HA851A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 4 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | ZU723A | Standard | HPE Customization Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"ZU723A","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"} |
| 5 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H29BWA1 | Service | HPE FE Tamper Evident Pack Overpack SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H29BWA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 6 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H29BXA1 | Service | HPE FE Tamper Evident Pack UoS SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H29BXA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 7 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | HA838A1 | Service | HPE Hardware Customization Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"HA838A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 8 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | HA839A1 | Service | HPE System Settings Customization Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"HA839A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 9 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | HA846A1 | Service | HPE VPN Access Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"HA846A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 10 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | HA848A1 | Service | HPE Firmware Revision Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"HA848A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 11 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | HA867A1 | Service | HPE Standard Product Reporting Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"HA867A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 12 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | A9907A#008 | Standard | Customer Solution Specialist On-site Support and Knowledge Transfer Services | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"A9907A#008","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"} |
| 13 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | A9907A#101 | Standard | Customer Solution Specialist Services -Tech. Computing and Emerging Technology | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"A9907A#101","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"} |
| 14 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | A9907A#102 | Standard | Customer Solution Specialist Services - IT infrastructure | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"A9907A#102","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"} |
| 15 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | AC068A | Standard | HPE FE Cluster Hig Den-Base HW Intg SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"AC068A","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 16 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | HB480A1 | Service | HPE ClusterPlatform 4-8 Factory SW SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"HB480A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 17 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | HB481A1 | Service | HPE ClusterPlatform 9-17 Factory SW SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"HB481A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 18 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | HB482A1 | Service | HPE ClusterPlatform 18-33 Factory SW SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"HB482A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 19 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | HB483A1 | Service | HPE ClusterPlatform 34-65 Factory SW SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"HB483A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 20 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | HB484A1 | Service | HPE ClustrPlatform 66-129 Factory SW SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"HB484A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 21 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | S1J77A | Standard | HPE AMS HPC FIO Rack Config Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"S1J77A","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"INTERNAL_CONFIGURATION"} |
| 22 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H0JD0A1 | Service | HPE 3PAR Onl Imp QuickStartup Rmt1 Svc | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD0A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 23 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H0JT1A1 | Service | HPE NSS Improvement Unit of Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JT1A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"} |
| 24 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H36NRA4 | Service | HPE Zerto Virtual TAM 4yr 8x5 Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NRA4","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 25 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H36NRA5 | Service | HPE Zerto Virtual TAM 5yr 8x5 Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NRA5","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 26 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H36NSA1 | Service | HPE Zerto Health Check per Site SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NSA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 27 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H36NTA1 | Service | HPE Zerto Custom UoS SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NTA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 28 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H39VQA1#V0F | Service | HPE Synergy First Frame Rmt Str SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H39VQA1#V0F","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 29 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H42ZHA1 | Service | HPE Perf Analysis Comp Option1 Rmt1 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H42ZHA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 30 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H42ZJA1 | Service | HPE Perf Analysis Comp Option2 Rmt1 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H42ZJA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 31 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H42ZKA1 | Service | HPE Perf Analysis Comp Option3 Rmt1 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H42ZKA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 32 | Support Services | Manufacturing Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Manufacturing Services | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Manufacturing Services: max 1 | HA124A1#V0F | Service | HPE Synergy First Frame Rmt Str SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"HA124A1#V0F","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 33 | Support Services | Manufacturing Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Manufacturing Services | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Manufacturing Services: max 1 | H0JT2A1 | Service | HPE NSS Implementation Unit of Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JT2A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"} |
| 34 | Support Services | Manufacturing Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Manufacturing Services | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Manufacturing Services: max 1 | H29BRA1 | Service | HPE Cray Team Day SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H29BRA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 35 | Support Services | Manufacturing Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Manufacturing Services | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Manufacturing Services: max 1 | H29BSA1 | Service | HPE Storage Servers Install Hourly SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H29BSA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 36 | Support Services | Manufacturing Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Manufacturing Services | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Manufacturing Services: max 1 | H36NLA1 | Service | HPE Zerto Quick Cloud Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NLA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 37 | Support Services | Manufacturing Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Manufacturing Services | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Manufacturing Services: max 1 | H36NMA1 | Service | HPE Zerto Quick Start Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NMA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 38 | Support Services | Manufacturing Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Manufacturing Services | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Manufacturing Services: max 1 | H36NNA1 | Service | HPE Zerto Quick Migration Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NNA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 39 | Support Services | Manufacturing Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Manufacturing Services | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Manufacturing Services: max 1 | H36NPA1 | Service | HPE Zerto Quick Advisor Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NPA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 40 | Support Services | Manufacturing Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Manufacturing Services | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Manufacturing Services: max 1 | H36NQA1 | Service | HPE Zerto Strutd TAM 1yr 12x5 Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NQA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 41 | Support Services | Manufacturing Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Manufacturing Services | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Manufacturing Services: max 1 | H36NQA3 | Service | HPE Zerto Strutd TAM 3yr 12x5 Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NQA3","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 42 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | R3J78A | Standard | HPE VIP GPS Tracking Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"R3J78A","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"INTERNAL_CONFIGURATION"} |
| 43 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | P1F74A | Standard | HPE Unloading Logistic Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"P1F74A","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"} |
| 44 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | P1F76A | Standard | HPE Pre-Delivery Site Survey SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"P1F76A","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 45 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | P1F78A | Standard | HPE Delivery Any Day at 0800 Hours Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"P1F78A","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"} |
| 46 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | R2D12A | Standard | HPE 1200 Hours Any Day Delivery Logistic Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"R2D12A","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"} |
| 47 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | R2D20A | Standard | HPE 2200 Hours Any Day Delivery Logistic Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"R2D20A","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"} |
| 48 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | R2D10A | Standard | HPE 0700 Hours Any Day Delivery Logistic Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"R2D10A","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"} |
| 49 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | R2D04A | Standard | HPE 0100 Hours Any Day Delivery Logistic Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"R2D04A","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"} |
| 50 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | P1F71A | Standard | HPE Special Delivery Truck Size Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"P1F71A","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"} |
| 51 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | P1F81A | Standard | HPE Delivery Any Day at 0900 Hours Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"P1F81A","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"} |
| 52 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | AC123A | Standard | HPE Special Request/ Equipment Logistic Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"AC123A","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"} |
| 53 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | BQ337A | Standard | HPE Expedite Shipment Large Logistic Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"BQ337A","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"} |
| 54 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | BQ335A | Standard | HPE Expedite Shipment Small Logistic Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"BQ335A","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"} |
| 55 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | G1H96A1 | Standard | HPE Account Management Support - EG 1 Svc | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"G1H96A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 56 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | G1H97A1 | Standard | HPE Account Management Support - EG 2 Svc | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"G1H97A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 57 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | G1H98A1 | Standard | HPE Account Management Support - EG 3 | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"G1H98A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"} |
| 58 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | G1H99A1 | Standard | HPE Account Management Support - EG 4 Svc | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"G1H99A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 59 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H0JD1A1 | Service | HPE Data Migration Readiness Assess Svc | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD1A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 60 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H0JD7A1 | Service | HPE Quickstart File Data Mig10TB SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD7A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 61 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H1Y26A1#002 | Service | HPE Energy Efficiency Analysis SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H1Y26A1#002","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 62 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H1Y26A1#003 | Service | HPE Infra Condition and Cap Analysis SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H1Y26A1#003","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 63 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H30RYA1 | Service | HPE Container Adopt Ph2 Redht Onsite SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H30RYA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 64 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H30SDA1 | Service | HPE Container Adopt Ph1 Anths Onsite SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H30SDA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 65 | Support Services | Support &amp; Deployment Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Support &amp; Deployment Services | Service &amp; Support | max 8 | 0 | 8 | Selection constraint for OCP3 Networking Adapters: max 8 | H33XSA1 | Service | HPE Education - Learning Credits 1Yr SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H33XSA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 66 | Support Services | Support &amp; Deployment Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Support &amp; Deployment Services | Service &amp; Support | max 8 | 0 | 8 | Selection constraint for OCP3 Networking Adapters: max 8 | H33XTA2 | Service | HPE Education - Learning Credits 2Yr SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H33XTA2","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 67 | Support Services | Support &amp; Deployment Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Support &amp; Deployment Services | Service &amp; Support | max 8 | 0 | 8 | Selection constraint for OCP3 Networking Adapters: max 8 | H33XVA3 | Service | HPE Education - Learning Credits 3Yr SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H33XVA3","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 68 | Support Services | Support &amp; Deployment Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Support &amp; Deployment Services | Service &amp; Support | max 8 | 0 | 8 | Selection constraint for OCP3 Networking Adapters: max 8 | H33XWA4 | Service | HPE Education - Learning Credits 4Yr SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H33XWA4","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 69 | Support Services | Support &amp; Deployment Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Support &amp; Deployment Services | Service &amp; Support | max 8 | 0 | 8 | Selection constraint for OCP3 Networking Adapters: max 8 | H33XXA5 | Service | HPE Education - Learning Credits 5Yr SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H33XXA5","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 70 | Support Services | Support &amp; Deployment Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Support &amp; Deployment Services | Service &amp; Support | max 8 | 0 | 8 | Selection constraint for OCP3 Networking Adapters: max 8 | H36NVA1 | Service | HPE Zerto Quick Upgrade Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NVA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 71 | Support Services | Support &amp; Deployment Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Support &amp; Deployment Services | Service &amp; Support | max 8 | 0 | 8 | Selection constraint for OCP3 Networking Adapters: max 8 | H36XCA1#006 | Service | HPE GPU on RHOCP Integrat SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36XCA1#006","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 72 | Support Services | Support &amp; Deployment Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Support &amp; Deployment Services | Service &amp; Support | max 8 | 0 | 8 | Selection constraint for OCP3 Networking Adapters: max 8 | H57GHA1 | Service | HPE Education 5 Day Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H57GHA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 73 | Support Services | Support &amp; Deployment Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Support &amp; Deployment Services | Service &amp; Support | max 8 | 0 | 8 | Selection constraint for OCP3 Networking Adapters: max 8 | H57GJA1 | Service | HPE Education 5 Day Onsite SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H57GJA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 74 | Support Services | Support &amp; Deployment Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Support &amp; Deployment Services | Service &amp; Support | max 8 | 0 | 8 | Selection constraint for OCP3 Networking Adapters: max 8 | H57GKA1 | Service | HPE Education 1 Day Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H57GKA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 75 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H0JD9A1 | Service | HPE File Data Migration 100TB SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD9A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 76 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H1WU9A1 | Service | HPE Scality Integration Basic SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H1WU9A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 77 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H1WV0A1 | Service | HPE Scality Integration Advanced SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H1WV0A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 78 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H1XF9A1 | Service | HPE Risk Assessment 10 Functions SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H1XF9A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 79 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H1XG0A1 | Service | HPE Business Imp Anlys 15 Process SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H1XG0A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 80 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H1XG7A1 | Service | HPE AI Video Analytics Assessment SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H1XG7A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 81 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H1Y25A1#002 | Service | HPE Energy Efficiency Analysis SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H1Y25A1#002","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 82 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H1Y25A1#003 | Service | HPE Infra Condition and Cap Analysis SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H1Y25A1#003","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 83 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H2S79A1 | Service | HPE Remot NW Conf and IntHr BusHrs SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H2S79A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 84 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H2S81A1 | Service | HPE Onsite NW Conf and Int Bus Hrs SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H2S81A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 85 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H29BQA1 | Service | HPE Cray Custom Operations SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H29BQA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 86 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H30SBA1 | Service | HPE Container Adopt Ph3 Redht Onsite SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H30SBA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 87 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H30SCA1 | Service | HPE Container Adopt Ph1 Anths Rem SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H30SCA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 88 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H30SLA1 | Service | HPE Container Adopt Ph1 Rnchr Onsite SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H30SLA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 89 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H30SMA1 | Service | HPE Container Adopt Ph2 Rnchr Rem SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H30SMA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 90 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H30SNA1 | Service | HPE Container Adopt Ph2 Rnchr Onsite SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H30SNA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 91 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H36NRA3 | Service | HPE Zerto Virtual TAM 3yr 8x5 Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NRA3","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 92 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H36PBA1 | Service | HPE Zerto Virtual TAM 1mo 8x5 Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36PBA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 93 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H36PCA1 | Service | HPE Zerto Virtual TAM 3mo 8x5 Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36PCA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 94 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H36PDA1 | Service | HPE Zerto Virtual TAM 6mo 8x5 Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36PDA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 95 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | HA124A1#V5K | Service | HPE Private Cloud AI with X10000 St SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"HA124A1#V5K","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 96 | Support Services | Compute | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Compute | Service &amp; Support | max 12 | 0 | 12 | Selection constraint for Compute: max 12 | H42ZQA1 | Service | HPE Perf Analysis SAP Option2 Rmt1 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H42ZQA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 97 | Support Services | Compute | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Compute | Service &amp; Support | max 12 | 0 | 12 | Selection constraint for Compute: max 12 | H42ZRA1 | Service | HPE Perf Analysis SAP Option3 Rmt1 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H42ZRA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 98 | Support Services | Compute | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Compute | Service &amp; Support | max 12 | 0 | 12 | Selection constraint for Compute: max 12 | H43BCA1 | Service | HPE Priv Cloud AI Deployment SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H43BCA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 99 | Support Services | Compute | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Compute | Service &amp; Support | max 12 | 0 | 12 | Selection constraint for Compute: max 12 | H44MDA1 | Service | HPE Data Sanitization HPC T1 NSH SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H44MDA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 100 | Support Services | Compute | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Compute | Service &amp; Support | max 12 | 0 | 12 | Selection constraint for Compute: max 12 | H44NJA1 | Service | HPE Compute Firmware Onsite SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H44NJA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 101 | Support Services | Compute | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Compute | Service &amp; Support | max 12 | 0 | 12 | Selection constraint for Compute: max 12 | HU7D2A1 | Service | HPE Synergy Ecosystem Health Review SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"HU7D2A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 102 | Support Services | Manufacturing Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Manufacturing Services | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Manufacturing Services: max 1 | HU0R5A5#Y39 | Service | HPE 5Y Service Credits Qty 50 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"HU0R5A5#Y39","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 103 | Support Services | Manufacturing Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Manufacturing Services | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Manufacturing Services: max 1 | H0JD4A1#WFH | Service | HPE 1Y Service Credits Qty 10 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD4A1#WFH","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 104 | Support Services | Manufacturing Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Manufacturing Services | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Manufacturing Services: max 1 | H0JD4A1#WFK | Service | HPE 1Y Service Credits Qty 10 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD4A1#WFK","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 105 | Support Services | Manufacturing Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Manufacturing Services | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Manufacturing Services: max 1 | H0JD4A1#WFM | Service | HPE 1Y Service Credits Qty 10 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD4A1#WFM","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 106 | Support Services | Manufacturing Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Manufacturing Services | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Manufacturing Services: max 1 | H0JD4A1#Y65 | Service | HPE 1Y Service Credits Qty 10 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD4A1#Y65","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 107 | Support Services | Manufacturing Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Manufacturing Services | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Manufacturing Services: max 1 | H0JD4A1#Y6B | Service | HPE 1Y Service Credits Qty 10 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD4A1#Y6B","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 108 | Support Services | Manufacturing Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Manufacturing Services | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Manufacturing Services: max 1 | H0JD4A1008E | Service | HPE 1Y Service Credits Qty 10 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD4A1008E","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 109 | Support Services | Manufacturing Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Manufacturing Services | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Manufacturing Services: max 1 | H0JD4A10BK5 | Service | HPE 1Y Service Credits Qty 10 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD4A10BK5","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 110 | Support Services | Manufacturing Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Manufacturing Services | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Manufacturing Services: max 1 | H0JD4A3#WFH | Service | HPE 3Y Service Credits Qty 30 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD4A3#WFH","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 111 | Support Services | Manufacturing Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Manufacturing Services | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Manufacturing Services: max 1 | H0JD4A3#WFK | Service | HPE 3Y Service Credits Qty 30 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD4A3#WFK","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 112 | Support Services | Manufacturing Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Manufacturing Services | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Manufacturing Services: max 1 | H54SBA5#Y35 | Service | HPE 5Y Complete Care SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H54SBA5#Y35","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 113 | Support Services | Manufacturing Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Manufacturing Services | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Manufacturing Services: max 1 | H39DJA3#Y35 | Service | HPE 3Y CC SB ATS Compute Base SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H39DJA3#Y35","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 114 | Support Services | Manufacturing Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Manufacturing Services | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Manufacturing Services: max 1 | H39DJA4#Y35 | Service | HPE 4Y CC SB ATS Compute Base SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H39DJA4#Y35","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 115 | Support Services | Manufacturing Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Manufacturing Services | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Manufacturing Services: max 1 | H39DJA5#Y35 | Service | HPE 5Y CC SB ATS Compute Base SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H39DJA5#Y35","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 116 | Support Services | Manufacturing Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Manufacturing Services | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Manufacturing Services: max 1 | H39DKA3#Y35 | Service | HPE 3Y CC SB ATS Compute Ext SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H39DKA3#Y35","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 117 | Support Services | Manufacturing Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Manufacturing Services | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Manufacturing Services: max 1 | H39DKA4#Y35 | Service | HPE 4Y CC SB ATS Compute Ext SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H39DKA4#Y35","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 118 | Support Services | Manufacturing Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Manufacturing Services | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Manufacturing Services: max 1 | H39DKA5#Y35 | Service | HPE 5Y CC SB ATS Compute Ext SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H39DKA5#Y35","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 119 | Support Services | Manufacturing Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Manufacturing Services | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Manufacturing Services: max 1 | H39DLA3#Y36 | Service | HPE 3Y CC SB ATS Storage Base SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H39DLA3#Y36","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 120 | Support Services | Manufacturing Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Manufacturing Services | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Manufacturing Services: max 1 | H39DLA4#Y36 | Service | HPE 4Y CC SB ATS Storage Base SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H39DLA4#Y36","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 121 | Support Services | Manufacturing Services | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; Manufacturing Services | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Manufacturing Services: max 1 | H39DLA5#Y36 | Service | HPE 5Y CC SB ATS Storage Base SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H39DLA5#Y36","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 122 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H40CSA3 | Service | HPE 3Y CC SB Expert Support SAP HANA SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H40CSA3","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 123 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H40CSA4 | Service | HPE 4Y CC SB Expert Support SAP HANA SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H40CSA4","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 124 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H40CSA5 | Service | HPE 5Y CC SB Expert Support SAP HANA SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H40CSA5","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 125 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | HY0W3A3#Z5K | Service | HPE 3Y CC SB Perform Optim SAP SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"HY0W3A3#Z5K","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 126 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | HY0W3A4#Z5K | Service | HPE 4Y CC SB Perform Optim SAP SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"HY0W3A4#Z5K","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 127 | Support Services | System Options | HPE OCA &gt; Synergy 12000 Frame [P51174-B21] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | HY0W3A5#Z5K | Service | HPE 5Y CC SB Perform Optim SAP SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"HY0W3A5#Z5K","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |


### Networking

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 54.
Row 3: identical to sheet All SKUs, row 55.
Row 4: identical to sheet All SKUs, row 56.
Row 5: identical to sheet All SKUs, row 57.
Row 6: identical to sheet All SKUs, row 58.
Row 7: identical to sheet All SKUs, row 59.
Row 8: identical to sheet All SKUs, row 60.
Row 9: identical to sheet All SKUs, row 61.
Row 10: identical to sheet All SKUs, row 62.
Row 11: identical to sheet All SKUs, row 63.
Row 12: identical to sheet All SKUs, row 64.
Row 13: identical to sheet All SKUs, row 65.
Row 14: identical to sheet All SKUs, row 66.
Row 15: identical to sheet All SKUs, row 67.
Row 16: identical to sheet All SKUs, row 68.
Row 17: identical to sheet All SKUs, row 69.
Row 18: identical to sheet All SKUs, row 70.
Row 19: identical to sheet All SKUs, row 71.
Row 20: identical to sheet All SKUs, row 72.
Row 21: identical to sheet All SKUs, row 73.
Row 22: identical to sheet All SKUs, row 74.
Row 23: identical to sheet All SKUs, row 75.
Row 24: identical to sheet All SKUs, row 76.
Row 25: identical to sheet All SKUs, row 77.
Row 26: identical to sheet All SKUs, row 78.
Row 27: identical to sheet All SKUs, row 79.
Row 28: identical to sheet All SKUs, row 80.
Row 29: identical to sheet All SKUs, row 81.
Row 30: identical to sheet All SKUs, row 82.
Row 31: identical to sheet All SKUs, row 83.
Row 32: identical to sheet All SKUs, row 84.
Row 33: identical to sheet All SKUs, row 85.
Row 34: identical to sheet All SKUs, row 86.
Row 35: identical to sheet All SKUs, row 87.
Row 36: identical to sheet All SKUs, row 88.
Row 37: identical to sheet All SKUs, row 89.
Row 38: identical to sheet All SKUs, row 90.
Row 39: identical to sheet All SKUs, row 128.
Row 40: identical to sheet All SKUs, row 129.
Row 41: identical to sheet All SKUs, row 130.
Row 42: identical to sheet All SKUs, row 131.
Row 43: identical to sheet All SKUs, row 158.

### Power Supplies

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 146.
Row 3: identical to sheet All SKUs, row 147.
Row 4: identical to sheet All SKUs, row 148.
Row 5: identical to sheet All SKUs, row 149.
Row 6: identical to sheet All SKUs, row 150.
Row 7: identical to sheet All SKUs, row 151.
Row 8: identical to sheet All SKUs, row 152.
Row 9: identical to sheet All SKUs, row 153.
Row 10: identical to sheet All SKUs, row 154.
Row 11: identical to sheet All SKUs, row 155.
Row 12: identical to sheet All SKUs, row 156.
Row 13: identical to sheet All SKUs, row 157.
Row 14: identical to sheet All SKUs, row 202.

### Chassis

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 2.

### Frame Options

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
Row 23: identical to sheet All SKUs, row 25.
Row 24: identical to sheet All SKUs, row 26.
Row 25: identical to sheet All SKUs, row 27.
Row 26: identical to sheet All SKUs, row 28.
Row 27: identical to sheet All SKUs, row 29.
Row 28: identical to sheet All SKUs, row 30.
Row 29: identical to sheet All SKUs, row 31.
Row 30: identical to sheet All SKUs, row 32.
Row 31: identical to sheet All SKUs, row 33.
Row 32: identical to sheet All SKUs, row 34.
Row 33: identical to sheet All SKUs, row 35.
Row 34: identical to sheet All SKUs, row 36.
Row 35: identical to sheet All SKUs, row 37.
Row 36: identical to sheet All SKUs, row 38.
Row 37: identical to sheet All SKUs, row 39.
Row 38: identical to sheet All SKUs, row 40.
Row 39: identical to sheet All SKUs, row 41.
Row 40: identical to sheet All SKUs, row 42.

### Accessories &amp; Infrastructure

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 24.
Row 3: identical to sheet All SKUs, row 43.
Row 4: identical to sheet All SKUs, row 44.
Row 5: identical to sheet All SKUs, row 47.
Row 6: identical to sheet All SKUs, row 48.
Row 7: identical to sheet All SKUs, row 137.
Row 8: identical to sheet All SKUs, row 138.
Row 9: identical to sheet All SKUs, row 139.
Row 10: identical to sheet All SKUs, row 140.
Row 11: identical to sheet All SKUs, row 141.
Row 12: identical to sheet All SKUs, row 142.
Row 13: identical to sheet All SKUs, row 204.
Row 14: identical to sheet All SKUs, row 205.
Row 15: identical to sheet All SKUs, row 206.
Row 16: identical to sheet All SKUs, row 207.
Row 17: identical to sheet All SKUs, row 208.
Row 18: identical to sheet All SKUs, row 209.
Row 19: identical to sheet All SKUs, row 210.
Row 20: identical to sheet All SKUs, row 211.
Row 21: identical to sheet All SKUs, row 212.
Row 22: identical to sheet All SKUs, row 213.
Row 23: identical to sheet All SKUs, row 214.
Row 24: identical to sheet All SKUs, row 215.
Row 25: identical to sheet All SKUs, row 216.
Row 26: identical to sheet All SKUs, row 217.
Row 27: identical to sheet All SKUs, row 218.
Row 28: identical to sheet All SKUs, row 219.
Row 29: identical to sheet All SKUs, row 220.
Row 30: identical to sheet All SKUs, row 221.
Row 31: identical to sheet All SKUs, row 222.
Row 32: identical to sheet All SKUs, row 223.

### Drive Enclosures  Drives

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 45.
Row 3: identical to sheet All SKUs, row 224.

### Management Hardware

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 46.
Row 3: identical to sheet All SKUs, row 49.
Row 4: identical to sheet All SKUs, row 50.
Row 5: identical to sheet All SKUs, row 51.
Row 6: identical to sheet All SKUs, row 52.
Row 7: identical to sheet All SKUs, row 53.

### Cables &amp; Enablement Kits

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 91.
Row 3: identical to sheet All SKUs, row 92.
Row 4: identical to sheet All SKUs, row 93.
Row 5: identical to sheet All SKUs, row 94.
Row 6: identical to sheet All SKUs, row 95.
Row 7: identical to sheet All SKUs, row 96.
Row 8: identical to sheet All SKUs, row 97.
Row 9: identical to sheet All SKUs, row 98.
Row 10: identical to sheet All SKUs, row 99.
Row 11: identical to sheet All SKUs, row 100.
Row 12: identical to sheet All SKUs, row 101.
Row 13: identical to sheet All SKUs, row 102.
Row 14: identical to sheet All SKUs, row 103.
Row 15: identical to sheet All SKUs, row 104.
Row 16: identical to sheet All SKUs, row 105.
Row 17: identical to sheet All SKUs, row 106.
Row 18: identical to sheet All SKUs, row 107.
Row 19: identical to sheet All SKUs, row 108.
Row 20: identical to sheet All SKUs, row 109.
Row 21: identical to sheet All SKUs, row 110.
Row 22: identical to sheet All SKUs, row 111.
Row 23: identical to sheet All SKUs, row 112.
Row 24: identical to sheet All SKUs, row 113.
Row 25: identical to sheet All SKUs, row 114.
Row 26: identical to sheet All SKUs, row 115.
Row 27: identical to sheet All SKUs, row 116.
Row 28: identical to sheet All SKUs, row 117.
Row 29: identical to sheet All SKUs, row 118.
Row 30: identical to sheet All SKUs, row 119.
Row 31: identical to sheet All SKUs, row 120.
Row 32: identical to sheet All SKUs, row 121.
Row 33: identical to sheet All SKUs, row 122.
Row 34: identical to sheet All SKUs, row 123.
Row 35: identical to sheet All SKUs, row 124.
Row 36: identical to sheet All SKUs, row 125.
Row 37: identical to sheet All SKUs, row 126.
Row 38: identical to sheet All SKUs, row 127.
Row 39: identical to sheet All SKUs, row 159.
Row 40: identical to sheet All SKUs, row 160.
Row 41: identical to sheet All SKUs, row 161.
Row 42: identical to sheet All SKUs, row 162.
Row 43: identical to sheet All SKUs, row 163.
Row 44: identical to sheet All SKUs, row 164.
Row 45: identical to sheet All SKUs, row 165.
Row 46: identical to sheet All SKUs, row 166.
Row 47: identical to sheet All SKUs, row 167.
Row 48: identical to sheet All SKUs, row 168.
Row 49: identical to sheet All SKUs, row 169.
Row 50: identical to sheet All SKUs, row 170.
Row 51: identical to sheet All SKUs, row 171.
Row 52: identical to sheet All SKUs, row 172.
Row 53: identical to sheet All SKUs, row 173.
Row 54: identical to sheet All SKUs, row 174.
Row 55: identical to sheet All SKUs, row 175.
Row 56: identical to sheet All SKUs, row 176.
Row 57: identical to sheet All SKUs, row 177.
Row 58: identical to sheet All SKUs, row 178.
Row 59: identical to sheet All SKUs, row 179.
Row 60: identical to sheet All SKUs, row 180.
Row 61: identical to sheet All SKUs, row 181.
Row 62: identical to sheet All SKUs, row 182.
Row 63: identical to sheet All SKUs, row 183.
Row 64: identical to sheet All SKUs, row 184.
Row 65: identical to sheet All SKUs, row 185.
Row 66: identical to sheet All SKUs, row 186.
Row 67: identical to sheet All SKUs, row 187.
Row 68: identical to sheet All SKUs, row 188.
Row 69: identical to sheet All SKUs, row 189.
Row 70: identical to sheet All SKUs, row 190.
Row 71: identical to sheet All SKUs, row 191.
Row 72: identical to sheet All SKUs, row 192.
Row 73: identical to sheet All SKUs, row 193.
Row 74: identical to sheet All SKUs, row 194.
Row 75: identical to sheet All SKUs, row 195.
Row 76: identical to sheet All SKUs, row 196.
Row 77: identical to sheet All SKUs, row 197.
Row 78: identical to sheet All SKUs, row 198.
Row 79: identical to sheet All SKUs, row 199.
Row 80: identical to sheet All SKUs, row 200.
Row 81: identical to sheet All SKUs, row 201.
Row 82: identical to sheet All SKUs, row 203.

### Tape Drives

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 132.
Row 3: identical to sheet All SKUs, row 133.
Row 4: identical to sheet All SKUs, row 134.
Row 5: identical to sheet All SKUs, row 135.
Row 6: identical to sheet All SKUs, row 136.

### Cooling  Thermal

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 145.

### Discontinued SKUs

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Product # | Description | Main Category | Sub-Category | Status | First Seen Date | Discontinued Date | Reinstated Date | Days Active | Last Known Price | Full Price Trail | Tracking State | Retention Class | Business Relevant | Reason |
| 2 | Q5U42AAE | Cloudera Edge Management Less Than 1000 Agents AGPL 1yr Subscription 24x7 Severity 1 Response E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-12 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 3 | L4Z37AAE | Cloudera Enterprise 1 Year Subscription 24x7 Support Flex E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-12 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 4 | P9V17AAE | Cloudera Enterprise Analytical Database Edition 1yr Subscription per Node 24x7 Gold Support E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-12 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 5 | P9V16AAE | Cloudera Enterprise Analytical Database Edition 1yr Subscription per Node 8x5 Bronze Support E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-12 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 6 | P9V20AAE | Cloudera Enterprise Analytical Database Edition 3yr Subscription per Node 24x7 Gold Support E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-12 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 7 | G7M27AAE | Cloudera Enterprise Basic Edition 1 Year Subscription per Node 24x7 Support E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-12 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 8 | G7M28AAE | Cloudera Enterprise Basic Edition 1 Year Subscription per Node 8x5 Support E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-12 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 9 | P9A41AAE | Cloudera Enterprise Basic Edition 3 Year Subscription per Node 24x7 Support E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-12 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 10 | P9A42AAE | Cloudera Enterprise Basic Edition 3 Year Subscription per Node 8x5 Support E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-12 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 11 | P9V13AAE | Cloudera Enterprise Data Engineering Edition 1yr Subscription per Node 24x7 Gold Support E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-12 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 12 | P9V12AAE | Cloudera Enterprise Data Engineering Edition 1yr Subscription per Node 8x5 Bronze Support E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-12 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 13 | P9V18AAE | Cloudera Enterprise Data Engineering Edition 3yr Subscription per Node 24x7 Gold Support E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-12 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 14 | G7M31AAE | Cloudera Enterprise Data Hub Edition 1 Year Subscription per Node 24x7 Premium E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-12 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 15 | G7M29AAE | Cloudera Enterprise Data Hub Edition 1 Year Subscription per Node 24x7 Support E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-12 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 16 | G7M30AAE | Cloudera Enterprise Data Hub Edition 1 Year Subscription per Node 8x5 Support E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-12 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 17 | P9A45AAE | Cloudera Enterprise Data Hub Edition 3 Year Subscription per Node 24x7 Premium E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-12 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 18 | P9A43AAE | Cloudera Enterprise Data Hub Edition 3 Year Subscription per Node 24x7 Support E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-12 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 19 | P9A44AAE | Cloudera Enterprise Data Hub Edition 3 Year Subscription per Node 8x5 Support E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-12 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 20 | P9V15AAE | Cloudera Enterprise Operational Database Edition 1yr Subscription per Node 24x7 Gold Support E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-12 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 21 | P9V14AAE | Cloudera Enterprise Operational Database Edition 1yr Subscription per Node 8x5 Bronze Support E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-12 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 22 | P9V19AAE | Cloudera Enterprise Operational Database Edition 3yr Subscription per Node 24x7 Gold Support E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-12 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 23 | JP408AAE | Cloudera Hortonworks Data Platform Enterprise Plus 4 Nodes/50TB Raw Storage 1yr 24x7 Support E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-12 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 24 | Q5U39AAE | Hortonworks Data Flow Edge 10 Branch Office Nodes 1yr 24x7 Support Severity 1 Response E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-12 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 25 | Q5U41AAE | Hortonworks Data Flow Edge 100 Branch Office Nodes 1yr 24x7 Support Severity 1 Response E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-12 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 26 | Q5U44AAE | Hortonworks Data Flow Edge 10K Agents (MiNiFi) 1yr 24x7 Support Severity 1 Response E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-12 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 27 | Q5U43AAE | Hortonworks Data Flow Edge 1K Agents (MiNiFi) 1yr 24x7 Support Severity 1 Response E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-12 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 28 | Q5U40AAE | Hortonworks Data Flow Edge 25 Branch Office Nodes 1yr 24x7 Support Severity 1 Response E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-12 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 29 | F5Z52AAE | Hortonworks Data Platform (HDP) Enterprise Subscription 4 N/50TB Raw Strg 1yr 24x7 Supp E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-12 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 30 | P9P38AAE | Hortonworks OnSt Tng Del Ad Stu PD E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-12 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |


### Metadata

| Original row | Column 1 | Column 2 |
| --- | --- | --- |
| 1 | Field | Value |
| 2 | Chassis | Synergy 12000 Frame |
| 3 | Scrape Date | 2026-11-12 |
| 4 | Source | OCA (Online Configuration Application) |
| 5 | Total Sub-Categories | 51 |
| 6 | Total Hardware SKUs | 257 |
| 7 | Total Service/Software SKUs | 190 |
| 8 | Total Combined SKUs | 448 |
| 9 | Chassis Variant Options | 1 |
| 10 | Total Rules | 135 |
| 11 | Unavailable DOM Rules | 17 |
| 12 | Total Tables | 35 |
| 13 | Diff Added SKUs | 33 |
| 14 | Diff Removed SKUs | 0 |
| 15 | Diff Price Changed | 0 |
| 16 | Diff Attr Changed | 414 |
| 17 | Diff Price+Attr Changed | 0 |
| 18 | Diff Reinstated SKUs | 0 |
| 19 | Diff Unchanged SKUs | 1 |
| 20 | Discontinued (All-Time) | 0 |
| 21 | Reinstated (All-Time) | 0 |
| 22 | Services JSON | outputs/Synergy/General/Synergy_12000_Frame/Synergy_12000_Frame_Services.json |
| 23 | Output Folder | outputs/Synergy/General/Synergy_12000_Frame |


## Shared cell text

Bracketed TEXT identifiers above refer to these exact repeated values. The surrounding sheet, column and row determine applicability.

### TEXT_1

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":3327,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_2

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":3324,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_3

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":3136,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_4

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":3019,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_5

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":3843,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_6

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":3463,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_7

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":4459,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_8

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":4059,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_9

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"}

### TEXT_10

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":11003,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_11

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":10579,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_12

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":11371,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_13

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":10548,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_14

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":9655,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_15

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":13245,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_16

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":0,"priceState":"ZERO_UNCONFIRMED","priceStatus":"ZERO_UNCONFIRMED","rowType":"HARDWARE_OPTION"}

### TEXT_17

CTO Compute and Storage Modules can only be configured in a CTO Frame. &#124; 871943-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL &#124; (+17 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_18

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":11615,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_19

CTO Compute and Storage Modules can only be configured in a CTO Frame. &#124; 871945-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL &#124; (+17 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_20

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":6605,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_21

CTO Compute and Storage Modules can only be configured in a CTO Frame. &#124; 871946-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL &#124; (+17 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_22

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":4605,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_23

CTO Compute and Storage Modules can only be configured in a CTO Frame. &#124; 826950-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL &#124; (+17 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_24

CTO Compute and Storage Modules can only be configured in a CTO Frame. &#124; 826951-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL &#124; (+17 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_25

CTO Compute and Storage Modules can only be configured in a CTO Frame. &#124; 826952-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL &#124; (+17 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_26

CTO Compute and Storage Modules can only be configured in a CTO Frame. &#124; 826953-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL &#124; (+17 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_27

CTO Compute and Storage Modules can only be configured in a CTO Frame. &#124; 826954-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL &#124; (+17 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_28

CTO Compute and Storage Modules can only be configured in a CTO Frame. &#124; 834483-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL &#124; (+17 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_29

CTO Compute and Storage Modules can only be configured in a CTO Frame. &#124; 834484-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL &#124; (+17 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_30

CTO Compute and Storage Modules can only be configured in a CTO Frame. &#124; 871932-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL &#124; (+17 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_31

CTO Compute and Storage Modules can only be configured in a CTO Frame. &#124; 871933-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL &#124; (+17 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_32

CTO Compute and Storage Modules can only be configured in a CTO Frame. &#124; 871934-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL &#124; (+17 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_33

CTO Compute and Storage Modules can only be configured in a CTO Frame. &#124; 826956-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL &#124; (+17 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_34

CTO Compute and Storage Modules can only be configured in a CTO Frame. &#124; 826957-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL &#124; (+17 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_35

CTO Compute and Storage Modules can only be configured in a CTO Frame. &#124; 826958-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL &#124; (+17 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_36

CTO Compute and Storage Modules can only be configured in a CTO Frame. &#124; 834480-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL &#124; (+17 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_37

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":68475,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_38

CTO Compute and Storage Modules can only be configured in a CTO Frame. &#124; 834481-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL &#124; (+17 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_39

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":48360,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_40

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Direct Ship","listPrice":4411,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_41

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":3895,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_42

CTO Compute and Storage Modules can only be configured in a CTO Frame. &#124; 755984-B21 conditional visibility: portal selector activation required (CTO Compute and Storage Modules can only be configured in a CTO Frame.); PORTAL_CONDITIONAL

### TEXT_43

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":10400,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_44

Mixing Composer and Composer 2 is not allowed &#124; 804353-B21 conditional visibility: portal selector activation required (Mixing Composer and Composer 2 is not allowed); PORTAL_CONDITIONAL

### TEXT_45

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":2625,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_46

Selection constraint for System Options: optional &#124; 804937-B21 conditional visibility: portal selector activation required (If HPE Synergy 4-port Frame Link Module is included in the 12000 Frame, Synergy Image Streamer on Synergy Composer cannot be selected.); PORTAL_CONDITIONAL

### TEXT_47

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":13795,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_48

Max quantity of product limited by space available. &#124; P54624-B21 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL

### TEXT_49

Mixing of Composer 2 and Composer 2 Plus modules is not allowed. &#124; P73869-B21 conditional visibility: portal selector activation required (Mixing of Composer 2 and Composer 2 Plus modules is not allowed.); PORTAL_CONDITIONAL

### TEXT_50

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":10400,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_51

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2210,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_52

Selection constraint for Frame Link Module USB: max 99 &#124; 804942-B21 conditional visibility: portal selector activation required (Either Frame link Module or 4p Frame Link Module can be selected. Mixing is not allowed.); PORTAL_CONDITIONAL

### TEXT_53

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1085,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_54

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":167,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_55

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":12259,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_56

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":23527,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_57

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":63999,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_58

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":63999,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_59

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Direct Ship","listPrice":2099,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_60

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":3480,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_61

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":3740,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_62

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":24356,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_63

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Obsolete","listPrice":7722,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_64

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":28481,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_65

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":13156,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_66

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":11780,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_67

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":18058,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_68

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":16169,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_69

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":25870,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_70

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":20959,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_71

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":18355,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_72

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":25029,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_73

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":38712,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_74

Product is obsolete &#124; 489184-B21 conditional visibility: portal selector activation required (Product is obsolete); PORTAL_CONDITIONAL

### TEXT_75

Product not supported &#124; 648312-B21 conditional visibility: portal selector activation required (Product not supported); PORTAL_CONDITIONAL &#124; (+13 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_76

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":15665,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_77

Product not supported &#124; 658247-B21 conditional visibility: portal selector activation required (Product not supported); PORTAL_CONDITIONAL &#124; (+13 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_78

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":2420,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_79

Product not supported &#124; 674280-B21 conditional visibility: portal selector activation required (Product not supported); PORTAL_CONDITIONAL &#124; (+13 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_80

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":12575,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_81

Product not supported &#124; 674281-B21 conditional visibility: portal selector activation required (Product not supported); PORTAL_CONDITIONAL &#124; (+13 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_82

Product not supported &#124; 674282-B21 conditional visibility: portal selector activation required (Product not supported); PORTAL_CONDITIONAL &#124; (+13 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_83

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":21815,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_84

Product not supported &#124; 674283-B21 conditional visibility: portal selector activation required (Product not supported); PORTAL_CONDITIONAL &#124; (+13 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_85

Product not supported &#124; 674284-B21 conditional visibility: portal selector activation required (Product not supported); PORTAL_CONDITIONAL &#124; (+13 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_86

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":18920,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_87

Product not supported &#124; 829914-B21 conditional visibility: portal selector activation required (Product not supported); PORTAL_CONDITIONAL &#124; (+13 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_88

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":22599,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_89

Product not supported &#124; 829915-B21 conditional visibility: portal selector activation required (Product not supported); PORTAL_CONDITIONAL &#124; (+13 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_90

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":26999,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_91

Product not supported &#124; 829916-B21 conditional visibility: portal selector activation required (Product not supported); PORTAL_CONDITIONAL &#124; (+13 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_92

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":5719,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_93

Product not supported &#124; 843191-B21 conditional visibility: portal selector activation required (Product not supported); PORTAL_CONDITIONAL &#124; (+13 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_94

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":17679,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_95

Product not supported &#124; 843192-B21 conditional visibility: portal selector activation required (Product not supported); PORTAL_CONDITIONAL &#124; (+13 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_96

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":31199,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_97

Product not supported &#124; 843193-B21 conditional visibility: portal selector activation required (Product not supported); PORTAL_CONDITIONAL &#124; (+13 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_98

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":56783,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_99

Product not supported &#124; 846041-B21 conditional visibility: portal selector activation required (Product not supported); PORTAL_CONDITIONAL &#124; (+13 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_100

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":2249,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_101

Cannot mix together in the same Synergy 12000 Frame &#124; 794502-B23 conditional visibility: portal selector activation required (Cannot mix together in the same Synergy 12000 Frame); PORTAL_CONDITIONAL

### TEXT_102

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":25999,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_103

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":285,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_104

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":327,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_105

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":1711,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_106

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":729,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_107

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2408,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_108

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":685,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_109

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":788,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_110

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2861,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_111

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2972,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_112

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":916,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_113

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":3437,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_114

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":516,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_115

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":789,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_116

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":902,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_117

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":944,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_118

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1161,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_119

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":209,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_120

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":4302,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_121

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":274,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_122

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":307,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_123

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":347,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_124

{"leadTime":"5","leadTimeUnit":"DAYS","lifecycleCanonical":"Obsolete","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"}

### TEXT_125

{"leadTime":"13","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":314,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_126

{"leadTime":"13","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":346,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_127

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"}

### TEXT_128

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":65,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_129

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":113,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_130

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":113,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_131

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":16300,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_132

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":21600,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_133

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":16800,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_134

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":431,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_135

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":158,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_136

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":214,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_137

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":475,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_138

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":699,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_139

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":281,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_140

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":300,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_141

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":1588,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_142

Selection constraint for Power Supply: required &#124; 798095-B21 conditional visibility: portal selector activation required (Model X - No Mixing of Power Supplies is allowed.  All selected Power Supplies must be of the same part number.  Minimum should be determined based on the Power Advisor Program.  (Minimum is always at least 2 - Power Advisor Program will  indicate scenarios in which more than 2 is required)); PORTAL_CONDITIONAL &#124; (+10 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_143

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":718,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_144

Selection constraint for Power Supply: required &#124; 798096-B21 conditional visibility: portal selector activation required (Model X - No Mixing of Power Supplies is allowed.  All selected Power Supplies must be of the same part number.  Minimum should be determined based on the Power Advisor Program.  (Minimum is always at least 2 - Power Advisor Program will  indicate scenarios in which more than 2 is required)); PORTAL_CONDITIONAL &#124; (+10 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_145

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":4419,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_146

Selection constraint for Power Supply: required &#124; 876929-B21 conditional visibility: portal selector activation required (Model X - No Mixing of Power Supplies is allowed.  All selected Power Supplies must be of the same part number.  Minimum should be determined based on the Power Advisor Program.  (Minimum is always at least 2 - Power Advisor Program will  indicate scenarios in which more than 2 is required)); PORTAL_CONDITIONAL &#124; (+10 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_147

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":1125,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_148

Selection constraint for Power Supply: required &#124; P27749-B21 conditional visibility: portal selector activation required (Model X - No Mixing of Power Supplies is allowed.  All selected Power Supplies must be of the same part number.  Minimum should be determined based on the Power Advisor Program.  (Minimum is always at least 2 - Power Advisor Program will  indicate scenarios in which more than 2 is required)); PORTAL_CONDITIONAL &#124; (+10 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_149

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":1190,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_150

Selection constraint for Power Supply: required &#124; P27750-B21 conditional visibility: portal selector activation required (Model X - No Mixing of Power Supplies is allowed.  All selected Power Supplies must be of the same part number.  Minimum should be determined based on the Power Advisor Program.  (Minimum is always at least 2 - Power Advisor Program will  indicate scenarios in which more than 2 is required)); PORTAL_CONDITIONAL &#124; (+10 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_151

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":4743,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_152

Selection constraint for Power Supply: required &#124; 798099-B21 conditional visibility: portal selector activation required (Model X - No Mixing of Power Supplies is allowed.  All selected Power Supplies must be of the same part number.  Minimum should be determined based on the Power Advisor Program.  (Minimum is always at least 2 - Power Advisor Program will  indicate scenarios in which more than 2 is required)); PORTAL_CONDITIONAL &#124; (+10 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_153

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1485,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_154

Selection constraint for Power Supply: required &#124; 798100-B21 conditional visibility: portal selector activation required (Model X - No Mixing of Power Supplies is allowed.  All selected Power Supplies must be of the same part number.  Minimum should be determined based on the Power Advisor Program.  (Minimum is always at least 2 - Power Advisor Program will  indicate scenarios in which more than 2 is required)); PORTAL_CONDITIONAL &#124; (+10 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_155

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":6799,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_156

Selection constraint for Power Supply: required &#124; 798101-B21 conditional visibility: portal selector activation required (Model X - No Mixing of Power Supplies is allowed.  All selected Power Supplies must be of the same part number.  Minimum should be determined based on the Power Advisor Program.  (Minimum is always at least 2 - Power Advisor Program will  indicate scenarios in which more than 2 is required)); PORTAL_CONDITIONAL &#124; (+10 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_157

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":679,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_158

Selection constraint for Power Supply: required &#124; 798102-B21 conditional visibility: portal selector activation required (Model X - No Mixing of Power Supplies is allowed.  All selected Power Supplies must be of the same part number.  Minimum should be determined based on the Power Advisor Program.  (Minimum is always at least 2 - Power Advisor Program will  indicate scenarios in which more than 2 is required)); PORTAL_CONDITIONAL &#124; (+10 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_159

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":3829,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_160

Selection constraint for Power Supply: required &#124; 798342-B21 conditional visibility: portal selector activation required (Model X - No Mixing of Power Supplies is allowed.  All selected Power Supplies must be of the same part number.  Minimum should be determined based on the Power Advisor Program.  (Minimum is always at least 2 - Power Advisor Program will  indicate scenarios in which more than 2 is required)); PORTAL_CONDITIONAL &#124; (+10 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_161

Selection constraint for Power Supply: required &#124; 798349-B21 conditional visibility: portal selector activation required (Model X - No Mixing of Power Supplies is allowed.  All selected Power Supplies must be of the same part number.  Minimum should be determined based on the Power Advisor Program.  (Minimum is always at least 2 - Power Advisor Program will  indicate scenarios in which more than 2 is required)); PORTAL_CONDITIONAL &#124; (+10 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_162

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":295,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_163

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":102,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_164

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":55,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_165

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":71,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_166

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":38,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_167

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":40,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_168

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":56,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_169

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":88,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_170

{"leadTime":"21","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":34,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_171

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":78,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_172

{"leadTime":"21","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":156,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_173

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":65,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_174

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":55,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_175

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":194,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_176

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":55,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_177

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":65,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_178

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":60,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_179

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":38,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_180

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":49,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_181

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":119,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_182

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":100,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_183

This cable kit support with only the following power supplies &#124; J6X00A conditional visibility: portal selector activation required (This cable kit support with only the following power supplies); PORTAL_CONDITIONAL &#124; (+7 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_184

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":111,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_185

This cable kit support with only the following power supplies &#124; P9B75A conditional visibility: portal selector activation required (This cable kit support with only the following power supplies); PORTAL_CONDITIONAL &#124; (+7 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_186

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":79,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_187

This cable kit support with only the following power supplies &#124; J6W98A conditional visibility: portal selector activation required (This cable kit support with only the following power supplies); PORTAL_CONDITIONAL &#124; (+7 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_188

This cable kit support with only the following power supplies &#124; J6W99A conditional visibility: portal selector activation required (This cable kit support with only the following power supplies); PORTAL_CONDITIONAL &#124; (+7 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_189

This cable kit support with only the following power supplies &#124; J6X01A conditional visibility: portal selector activation required (This cable kit support with only the following power supplies); PORTAL_CONDITIONAL &#124; (+7 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_190

This cable kit support with only the following power supplies &#124; J6X02A conditional visibility: portal selector activation required (This cable kit support with only the following power supplies); PORTAL_CONDITIONAL &#124; (+7 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_191

This cable kit support with only the following power supplies &#124; J6X03A conditional visibility: portal selector activation required (This cable kit support with only the following power supplies); PORTAL_CONDITIONAL &#124; (+7 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_192

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":80,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_193

This cable kit support with only the following power supplies &#124; P9B77A conditional visibility: portal selector activation required (This cable kit support with only the following power supplies); PORTAL_CONDITIONAL &#124; (+7 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_194

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":99,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_195

Selection constraint for -48VDC Power Supplies &amp; Cable Kits: min 1, max 2 &#124; 872035-B21 conditional visibility: portal selector activation required (This option cable kit contains 6 six power cords and support only with the following power supplies); PORTAL_CONDITIONAL

### TEXT_196

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":6341,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_197

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":1,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_198

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":66,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_199

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":32,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_200

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":123,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_201

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":44,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_202

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":49,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_203

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":62410,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_204

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_205

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":8000,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_206

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":7060,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_207

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":26480,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_208

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":2000,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_209

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":2230,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_210

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1600,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_211

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1785,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_212

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":7540,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_213

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":4800,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_214

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":4000,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_215

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":3200,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_216

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":12000,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_217

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":12820,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_218

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":10000,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_219

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":11150,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_220

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":8920,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_221

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":38470,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_222

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":30000,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_223

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":24000,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_224

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":6000,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_225

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":19860,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_226

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":42070,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_227

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":12429,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_228

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":530,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_229

If HPE Synergy 4-port Frame Link Module is included in the 12000 Frame, Synergy Image Streamer on Synergy Composer cannot be selected.

### TEXT_230

Model X - No Mixing of Power Supplies is allowed. All selected Power Supplies must be of the same part number. Minimum should be determined based on the Power Advisor Program. (Minimum is always at least 2 - Power Advisor Program will indicate scenarios in which more than 2 is required)

### TEXT_231

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":18399,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_232

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":50,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

