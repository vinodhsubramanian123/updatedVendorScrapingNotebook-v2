# HPE MSL3040_Tape — Synchronized Catalog Knowledge

**Target Product**: `MSL3040_Tape`

**Scope Identity**: `HPE/STORAGE/StoreEver/Tape/MSL3040_Tape`

**Sync Timestamp**: 2026-11-21T13:41:18.802Z

**Total Verified SKUs**: `277` (`124` Hardware + `153` Services)

**Total Synced KnowledgeDeltas**: `22`

This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.

---

## 🚀 Executive Delta & Recent Change Summary

| Category | Total SKUs | Added (Last Scrape) | Price Changed | Attribute Changed | Price & Attr Changed | Reinstated | Status |
|----------|------------|---------------------|---------------|-------------------|----------------------|------------|--------|
| **Hardware Components** | 124 | 2 | 0 | 121 | 0 | 0 | **CERTIFIED** |
| **Support Services & SLAs** | 153 | 89 | 0 | 37 | 0 | 0 | **CERTIFIED** |
| **Total Portfolio** | **277** | **91** | **0** | **158** | **0** | **0** | **ACTIVE** |


## Configured child menus

OBSERVED_CONFIGURED_CHILD_MENUS.  Other selector states require separate observation.

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

## 🏛️ 2. Family & Generation Rules (StoreEver Tape)

*No verified family/generation rules are registered for this product.*

## 🎯 3. Chassis & Solution-Type Gotchas (MSL3040_Tape)

*No specific gotchas logged for MSL3040_Tape. Baseline chassis layout rules active.*

## 🔒 3b. Physical & Architectural Gating Rules (DOM Unavailable Tables)

### Component Mutual Exclusion Rules

1. **[Cables]**: Supported on LTO-9 SAS Drive (R6Q75A) Only.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (4)**: `716197-B21`, `716199-B21`, `P35176-B21`, `P35175-B21`

## ⚠️ 4. Discontinued & Obsolete SKUs Registry

### Fully Discontinued & Delisted SKUs

| SKU | Description | Status | Discontinued Date | Last Known Price | Successor SKU | Tracking |
|-----|-------------|--------|-------------------|------------------|---------------|----------|
| `Q2R41A` | HPE StoreEver MSL3040 Tape Library Base Module CTO Chassis | **DISCONTINUED** | 2026-11-20 | $4500.00 | None | STOPPED_AFTER_REMOVAL |
| `C0H28A` | HPE StoreEver MSL LTO-6 Ultrium 6250 Fibre Channel Drive Upgrade Kit | **REINSTATED** | 2026-09-09 | $5300.00 | None | STOPPED_AFTER_REMOVAL |
| `C0H27A` | HPE StoreEver MSL LTO-6 Ultrium 6250 SAS Drive Upgrade Kit | **REINSTATED** | 2026-09-09 | $5100.00 | None | STOPPED_AFTER_REMOVAL |
| `N7P36A` | HPE StoreEver MSL LTO-7 Ultrium 15000 FC Drive Upgrade Kit | **REINSTATED** | 2026-09-09 | $9362.00 | None | STOPPED_AFTER_REMOVAL |
| `N7P37A` | HPE StoreEver MSL LTO-7 Ultrium 15000 SAS Drive Upgrade Kit | **REINSTATED** | 2026-09-09 | $9010.00 | None | STOPPED_AFTER_REMOVAL |
| `Q6Q67A` | HPE StoreEver MSL LTO-8 Ultrium 30750 FC Drive Upgrade Kit | **REINSTATED** | 2026-09-09 | $21600.00 | None | STOPPED_AFTER_REMOVAL |
| `Q6Q68A` | HPE StoreEver MSL LTO-8 Ultrium 30750 SAS Drive Upgrade Kit | **REINSTATED** | 2026-09-09 | $16800.00 | None | STOPPED_AFTER_REMOVAL |
| `R6Q74A` | HPE StoreEver MSL LTO-9 Ultrium 45000 Fibre Channel Drive Upgrade Kit | **REINSTATED** | 2026-09-09 | $33000.00 | None | STOPPED_AFTER_REMOVAL |
| `R6Q75A` | HPE StoreEver MSL LTO-9 Ultrium 45000 SAS Drive Upgrade Kit | **REINSTATED** | 2026-09-09 | $24000.00 | None | STOPPED_AFTER_REMOVAL |
| `AF570A` | HPE C13 - BS-1363A UK/HK/SG 250V 10Amp 1.83m Power Cord | **REINSTATED** | 2026-09-09 | $55.00 | None | STOPPED_AFTER_REMOVAL |
| `AF568A` | HPE C13 - CEE-VII EU 250V 10Amp 1.83m Power Cord | **REINSTATED** | 2026-09-09 | $71.00 | None | STOPPED_AFTER_REMOVAL |
| `AF557A` | HPE C13 - GB-1002 CN 250V 10Amp 1.83m Power Cord | **REINSTATED** | 2026-09-09 | $156.00 | None | STOPPED_AFTER_REMOVAL |
| `AF556A` | HPE C13 - Nema 5-15P US/CA 110V 10Amp 1.83m Power Cord | **REINSTATED** | 2026-09-09 | $55.00 | None | STOPPED_AFTER_REMOVAL |
| `AF569A` | HPE C13 - AS3112-3 AU 250V 10Amp 2.5m Power Cord | **REINSTATED** | 2026-09-09 | $65.00 | None | STOPPED_AFTER_REMOVAL |
| `142257-002` | HPE C13 - C14 WW 250V 10Amp 2.5m Jumper Cord | **REINSTATED** | 2026-09-09 | $34.00 | None | STOPPED_AFTER_REMOVAL |
| `AF561A` | HPE C13 - CNS-690 TW 110V 13Amp 1.83m Power Cord | **REINSTATED** | 2026-09-09 | $55.00 | None | STOPPED_AFTER_REMOVAL |
| `AF566A` | HPE C13 - DK-2.5A DK 250V 10Amp 1.83m Power Cord | **REINSTATED** | 2026-09-09 | $55.00 | None | STOPPED_AFTER_REMOVAL |
| `AF558A` | HPE C13 - IRAM -2073 AR 250V 10A 2.5m Power Cord | **REINSTATED** | 2026-09-09 | $65.00 | None | STOPPED_AFTER_REMOVAL |
| `AF562A` | HPE C13 - IS-1293 IN 240V 6Amp LV 2.0m Power Cord | **REINSTATED** | 2026-09-09 | $194.00 | None | STOPPED_AFTER_REMOVAL |
| `SG579A` | HPE C13 - IS-1293 IN 250V 10Amp HV 2.5m Power Cord | **REINSTATED** | 2026-09-09 | $142.00 | None | STOPPED_AFTER_REMOVAL |
| `AF572A` | HPE C13 - JIS C8303 JP 100V 12Amp 2.0m Power Cord | **REINSTATED** | 2026-09-09 | $60.00 | None | STOPPED_AFTER_REMOVAL |
| `AF560A` | HPE C13 - KSC- 8305 KR 250V 10Amp 1.83m Power Cord | **REINSTATED** | 2026-09-09 | $55.00 | None | STOPPED_AFTER_REMOVAL |
| `AF559A` | HPE C13 - Nema 5-15P TH/PH 250V 10Amp 1.83m Power Cord | **REINSTATED** | 2026-09-09 | $55.00 | None | STOPPED_AFTER_REMOVAL |
| `AF567A` | HPE C13 - SABS-164 ZA 250V 10Amp 2.5m Power Cord | **REINSTATED** | 2026-09-09 | $65.00 | None | STOPPED_AFTER_REMOVAL |
| `AF565A` | HPE C13 - SEV 1011 CH 250V 10Amp 1.83m Power Cord | **REINSTATED** | 2026-09-09 | $55.00 | None | STOPPED_AFTER_REMOVAL |
| `AF564A` | HPE C13 - SI-32 IL 250V 10Amp 1.83m Power Cord | **REINSTATED** | 2026-09-09 | $55.00 | None | STOPPED_AFTER_REMOVAL |
| `TC406A` | HPE StoreEver MSL Command View for Tape Libraries - TapeAssure Advanced LTU | **REINSTATED** | 2026-09-09 | $2500.00 | None | STOPPED_AFTER_REMOVAL |
| `Q8K96A` | HPE StoreEver MSL3040 High Availability LTO-6 Control Path Failover LTU | **REINSTATED** | 2026-09-09 | $3000.00 | None | STOPPED_AFTER_REMOVAL |
| `Q8K97A` | HPE StoreEver MSL3040 High Availability LTO-6 Data Path Failover LTU | **REINSTATED** | 2026-09-09 | $3000.00 | None | STOPPED_AFTER_REMOVAL |
| `Q8K98A` | HPE StoreEver MSL3040 KMIP Key Manager LTU | **REINSTATED** | 2026-09-09 | $6000.00 | None | STOPPED_AFTER_REMOVAL |
| `Q8L00A` | HPE StoreEver MSL3040 LTO-7+ Path Failover LTU | **REINSTATED** | 2026-09-09 | $6000.00 | None | STOPPED_AFTER_REMOVAL |
| `Q8K99A` | HPE StoreEver MSL3040 Secure Manager LTU | **REINSTATED** | 2026-09-09 | $2000.00 | None | STOPPED_AFTER_REMOVAL |
| `AG467A` | HPE Medium Standard Delivery-Door/Dock Service | **DISCONTINUED** | 2026-11-20 | $1.00 | None | STOPPED_AFTER_REMOVAL |
| `H33XXA5` | HPE Education - Learning Credits 5Yr SVC | **DISCONTINUED** | 2026-11-20 | $100.00 | None | STOPPED_AFTER_REMOVAL |
| `HA0Z0A1` | HPE DL 1Yr Other 1GB Content Hosted SVC | **DISCONTINUED** | 2026-11-20 | $1620.00 | None | STOPPED_AFTER_REMOVAL |
| `HR2R4A1` | HPE Digital Learner Bronze 1Yr Subs SVC | **DISCONTINUED** | 2026-11-20 | $4000.00 | None | STOPPED_AFTER_REMOVAL |
| `HR2R5A1` | HPE Digital Learner Silver 1Yr Subs SVC | **DISCONTINUED** | 2026-11-20 | $5000.00 | None | STOPPED_AFTER_REMOVAL |
| `HR2R6A1` | HPE Digital Learner Gold 1Yr Subs SVC | **DISCONTINUED** | 2026-11-20 | $8000.00 | None | STOPPED_AFTER_REMOVAL |
| `HV9V8A1` | HPE Digital Learner SMB 1Yr Subs SVC | **DISCONTINUED** | 2026-11-20 | $1300.00 | None | STOPPED_AFTER_REMOVAL |
| `H36VWA1` | HPE Storage VM Migration 50 VM SVC | **DISCONTINUED** | 2026-11-20 | $17520.00 | None | STOPPED_AFTER_REMOVAL |
| `H36VXA1` | HPE Storage VM Migration 150 VM SVC | **DISCONTINUED** | 2026-11-20 | $29760.00 | None | STOPPED_AFTER_REMOVAL |
| `H36WBA1` | HPE Storage VM Migration 5 VM Zerto SVC | **DISCONTINUED** | 2026-11-20 | $7140.00 | None | STOPPED_AFTER_REMOVAL |
| `H36WNA1` | HPE AI Soltns and Platfrms 5 Day Rem SVC | **DISCONTINUED** | 2026-11-20 | $13800.00 | None | STOPPED_AFTER_REMOVAL |
| `H36WMA1` | HPE AI Solns and Pltfrms 5 Day Onste SVC | **DISCONTINUED** | 2026-11-20 | $23400.00 | None | STOPPED_AFTER_REMOVAL |
| `H36WQA1` | HPE AI Soltns and Platfrms 1 Day Rem SVC | **DISCONTINUED** | 2026-11-20 | $2760.00 | None | STOPPED_AFTER_REMOVAL |
| `H46RMA1` | HPE Data and AI Security 5 Day Rem SVC | **DISCONTINUED** | 2026-11-20 | $9000.00 | None | STOPPED_AFTER_REMOVAL |
| `H46RNA1` | HPE Data and AI Security 5 Day Onste SVC | **DISCONTINUED** | 2026-11-20 | $18540.00 | None | STOPPED_AFTER_REMOVAL |
| `H46RLA1` | HPE Data and AI Security 1 Day Rem SVC | **DISCONTINUED** | 2026-11-20 | $2640.00 | None | STOPPED_AFTER_REMOVAL |
| `H57FDA1` | HPE Data Sltn and Pltfrms 5 Day Rem SVC | **DISCONTINUED** | 2026-11-20 | $13800.00 | None | STOPPED_AFTER_REMOVAL |
| `H4F42A1` | HPE Factory Express Complex Unit of SVC | **DISCONTINUED** | 2026-11-20 | $1850.00 | None | STOPPED_AFTER_REMOVAL |
| `H7M73A1` | HPE Factory Express 3PAR OS Backrev SVC | **DISCONTINUED** | 2026-11-20 | $1575.00 | None | STOPPED_AFTER_REMOVAL |
| `HA840A1` | HPE Supplied Asset Tag Service | **DISCONTINUED** | 2026-11-20 | $15.00 | None | STOPPED_AFTER_REMOVAL |
| `HA841A1` | HPE Customer Supplied Asset Tag Service | **DISCONTINUED** | 2026-11-20 | $26.00 | None | STOPPED_AFTER_REMOVAL |
| `HA861A1` | HPE FE Personalized Install SVC | **DISCONTINUED** | 2026-11-20 | $2105.00 | None | STOPPED_AFTER_REMOVAL |
| `HA875A1` | HPE Special Factory Service | **DISCONTINUED** | 2026-11-20 | $1.00 | None | STOPPED_AFTER_REMOVAL |
| `HU7D3A1` | HPE FE OEM Customization UOS SVC | **DISCONTINUED** | 2026-11-20 | $65.00 | None | STOPPED_AFTER_REMOVAL |
| `P1F70A` | HPE Forklift at Delivery Service | **DISCONTINUED** | 2026-11-20 | $1399.00 | None | STOPPED_AFTER_REMOVAL |
| `P1F72A` | HPE Two People at Delivery SVC | **DISCONTINUED** | 2026-11-20 | $466.00 | None | STOPPED_AFTER_REMOVAL |
| `P1F73A` | HPE Campus Delivery Service | **DISCONTINUED** | 2026-11-20 | $104.00 | None | STOPPED_AFTER_REMOVAL |

### ⏳ Impending Obsolescence & Clearance Hardware (90-Day to 180-Day Window)

*These components remain orderable in live configurators today but have published vendor end dates. They represent high-value clearance opportunities for immediate deployments, but require explicit procurement cutoff remarks before quotation:*

| Product # | Description | Category | List Price (USD) | Discontinued Date | Price Trend | Presales Strategy Guidance |
|---|---|---|---:|---|:---:|---|
| `Q2R41A` | [REMOVED SKU] HPE StoreEver MSL3040 Tape Library Base Module CTO Chassis | Chassis | $4,500 | 2026-11-20 | -100.00% | 🔥 **Clearance Opportunity** (-100.00% CapEx savings). Procure before 2026-11-20. |
| `C7975A` | HPE LTO-5 Ultrium 3TB RW Data Cartridge | Storage Controllers | $46.46 | 10/31/2026 | 0.00% | ⚠️ Approaching EOL (10/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `Q2011A` | HPE LTO-5 Ultrium RW Bar Code Label Pack | Storage Controllers | $92.99 | 10/31/2026 | 0.00% | ⚠️ Approaching EOL (10/31/2026). Valid for immediate builds; verify multi-year roadmaps. |

## 📊 5b. Category-Level Trends & Significant Price Adjustments

### Category Portfolio Delta & Planning Intelligence

| Category | Total SKUs | Added | Modified | Unchanged | Clearance / Drops | Category Planning Insight |
|---|---:|---:|---:|---:|---:|---|
| **Chassis** | 2 | 1 | 0 | 1 | 1 | ⚠️ Active price drops / clearance (1 SKUs discounted) |
| **Storage Controllers** | 72 | 0 | 72 | 0 | 0 | 🔄 Attributes/specifications updated (72 SKUs) |
| **MSL Options** | 1 | 0 | 1 | 0 | 0 | 🔄 Attributes/specifications updated (1 SKUs) |
| **Power Supplies** | 1 | 0 | 1 | 0 | 0 | 🔄 Attributes/specifications updated (1 SKUs) |
| **Cables & Enablement Kits** | 28 | 0 | 28 | 0 | 0 | 🔄 Attributes/specifications updated (28 SKUs) |
| **Drive Enclosures / Drives** | 13 | 0 | 13 | 0 | 0 | 🔄 Attributes/specifications updated (13 SKUs) |
| **Software & Licenses** | 6 | 0 | 6 | 0 | 0 | 🔄 Attributes/specifications updated (6 SKUs) |
| **Accessories & Infrastructure** | 1 | 1 | 0 | 0 | 0 | ✨ Portfolio expanding (+1 new options) |

### High-Impact Price Adjustments (Drops $\ge 10\%$ and Major Moves)

| Product # | Description | Category | Previous Price | Current Price | Delta (USD) | Change (%) | Movement Type |
|---|---|---|---:|---:|---:|---:|---|
| `Q2R41A` | [REMOVED SKU] HPE StoreEver MSL3040 Tape Library Base Module CTO Chassis | Chassis | $4,500 | $4,500 | $-4,500 | **-100.0%** | 📉 CLEARANCE_DROP |
| `Q6Q62C` | HPE MSL3040 Scalable Base Module | Chassis | New Addition | $4,500 | $4,500 | **+100.0%** | ✨ NEW_OPTION |

## 🔄 5. Recent Attribute & Specification Modifications Log

| Timestamp | Source | SKU | Attribute | Old Value | New Value | Detail |
|-----------|--------|-----|-----------|-----------|-----------|--------|
| 2026-11-20 | Services | `H33XTA2` | Vendor Attributes | {"List Price (USD)":"100.00","Product Number":"H33XTA2"} | **{"leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","Product Number":"H33XTA2","rowType":"SUPPORT_SERVICE"}** | Vendor Attributes: "{"List Price (USD)":"100.00","Product Number":"H33XTA2"}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","Product Number":"H33XTA2","rowType":"SUPPORT_SERVICE"}" |
| 2026-11-20 | Services | `H33XVA3` | Main Category | Processor | **Support Services** | Main Category: "Processor" → "Support Services" |
| 2026-11-20 | Services | `H33XVA3` | Sub-Category | Intel Xeon Scalable Processors | **Support & Deployment Services** | Sub-Category: "Intel Xeon Scalable Processors" → "Support & Deployment Services" |
| 2026-11-20 | Services | `H33XVA3` | Constraint | min 1, max 2 | **max 8** | Constraint: "min 1, max 2" → "max 8" |
| 2026-11-20 | Services | `H33XVA3` | Rule/Note | Selection constraint for Intel Xeon Scalable Processors: min 1, max 2 | **Selection constraint for OCP3 Networking Adapters: max 8** | Rule/Note: "Selection constraint for Intel Xeon Scalable Processors: min 1, max 2" → "Selection constraint for OCP3 Networking Adapters: max 8" |
| 2026-11-20 | Services | `H33XVA3` | Max Qty | 2 | **8** | Max Qty: "2" → "8" |
| 2026-11-20 | Services | `H33XVA3` | Component Role | N/A | **Service & Support** | Component Role: "N/A" → "Service & Support" |
| 2026-11-20 | Services | `H33XVA3` | CLIC Status | Active | **Unpublished** | CLIC Status: "Active" → "Unpublished" |
| 2026-11-20 | Services | `H33XVA3` | Lead Time | N/A | **Unpublished** | Lead Time: "N/A" → "Unpublished" |
| 2026-11-20 | Services | `H33XVA3` | Lead Time Source | Not published by OCA | **Unpublished** | Lead Time Source: "Not published by OCA" → "Unpublished" |
| 2026-11-20 | Services | `H33XVA3` | Speed Tier | N/A | **Unpublished** | Speed Tier: "N/A" → "Unpublished" |
| 2026-11-20 | Services | `H33XVA3` | Vendor Recommended | N/A | **false** | Vendor Recommended: "N/A" → "false" |
| 2026-11-20 | Services | `H33XVA3` | Vendor Attributes | {"List Price (USD)":"100.00","Product Number":"H33XVA3"} | **{"leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","Product Number":"H33XVA3","rowType":"SUPPORT_SERVICE"}** | Vendor Attributes: "{"List Price (USD)":"100.00","Product Number":"H33XVA3"}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","Product Number":"H33XVA3","rowType":"SUPPORT_SERVICE"}" |
| 2026-11-20 | Services | `H33XWA4` | Main Category | Processor | **Support Services** | Main Category: "Processor" → "Support Services" |
| 2026-11-20 | Services | `H33XWA4` | Sub-Category | Intel Xeon Scalable Processors | **Support & Deployment Services** | Sub-Category: "Intel Xeon Scalable Processors" → "Support & Deployment Services" |
| 2026-11-20 | Services | `H33XWA4` | Constraint | min 1, max 2 | **max 8** | Constraint: "min 1, max 2" → "max 8" |
| 2026-11-20 | Services | `H33XWA4` | Rule/Note | Selection constraint for Intel Xeon Scalable Processors: min 1, max 2 | **Selection constraint for OCP3 Networking Adapters: max 8** | Rule/Note: "Selection constraint for Intel Xeon Scalable Processors: min 1, max 2" → "Selection constraint for OCP3 Networking Adapters: max 8" |
| 2026-11-20 | Services | `H33XWA4` | Max Qty | 2 | **8** | Max Qty: "2" → "8" |
| 2026-11-20 | Services | `H33XWA4` | Component Role | N/A | **Service & Support** | Component Role: "N/A" → "Service & Support" |
| 2026-11-20 | Services | `H33XWA4` | CLIC Status | Active | **Unpublished** | CLIC Status: "Active" → "Unpublished" |
| 2026-11-20 | Services | `H33XWA4` | Lead Time | N/A | **Unpublished** | Lead Time: "N/A" → "Unpublished" |
| 2026-11-20 | Services | `H33XWA4` | Lead Time Source | Not published by OCA | **Unpublished** | Lead Time Source: "Not published by OCA" → "Unpublished" |
| 2026-11-20 | Services | `H33XWA4` | Speed Tier | N/A | **Unpublished** | Speed Tier: "N/A" → "Unpublished" |
| 2026-11-20 | Services | `H33XWA4` | Vendor Recommended | N/A | **false** | Vendor Recommended: "N/A" → "false" |
| 2026-11-20 | Services | `H33XWA4` | Vendor Attributes | {"List Price (USD)":"100.00","Product Number":"H33XWA4"} | **{"leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","Product Number":"H33XWA4","rowType":"SUPPORT_SERVICE"}** | Vendor Attributes: "{"List Price (USD)":"100.00","Product Number":"H33XWA4"}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","Product Number":"H33XWA4","rowType":"SUPPORT_SERVICE"}" |

### Current Scrape SKU Attribute Deltas

| SKU | Source | Diff Status | Attribute Changes (Old → New) |
|-----|--------|-------------|-------------------------------|
| `Q6Q62C` | Hardware | ADDED | New SKU introduced |
| `Q2R41A` | Hardware | REMOVED | SKU Discontinued & Tombstoned |
| `C0H28A` | Hardware | ATTRIBUTE_CHANGED | Main Category: "Networking" → "Storage Controllers"; Component Role: "(None)" → "Storage Controller"; Discontinued Date: "04/30/2024" → "05/31/2024"; CLIC Status: "Obsolete (OB)" → "Unpublished"; Lead Time: "(None)" → "Unpublished"; Lead Time Source: "Not published by OCA" → "Unpublished"; Speed Tier: "(None)" → "Unpublished"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":5300,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `C0H27A` | Hardware | ATTRIBUTE_CHANGED | Main Category: "Networking" → "Storage Controllers"; Component Role: "(None)" → "Storage Controller"; Discontinued Date: "11/30/2023" → "12/31/2023"; CLIC Status: "Obsolete (OB)" → "Unpublished"; Lead Time: "(None)" → "Unpublished"; Lead Time Source: "Not published by OCA" → "Unpublished"; Speed Tier: "(None)" → "Unpublished"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":5100,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `N7P36A` | Hardware | ATTRIBUTE_CHANGED | Main Category: "Networking" → "Storage Controllers"; Component Role: "(None)" → "Storage Controller"; Discontinued Date: "07/17/2026" → "07/31/2026"; CLIC Status: "Obsolete (OB)" → "Unpublished"; Lead Time: "(None)" → "Unpublished"; Lead Time Source: "Not published by OCA" → "Unpublished"; Speed Tier: "(None)" → "Unpublished"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":9362,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `N7P37A` | Hardware | ATTRIBUTE_CHANGED | Main Category: "Networking" → "Storage Controllers"; Component Role: "(None)" → "Storage Controller"; Discontinued Date: "07/17/2026" → "07/31/2026"; CLIC Status: "Obsolete (OB)" → "Unpublished"; Lead Time: "(None)" → "Unpublished"; Lead Time Source: "Not published by OCA" → "Unpublished"; Speed Tier: "(None)" → "Unpublished"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":9010,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `Q6Q67A` | Hardware | ATTRIBUTE_CHANGED | Main Category: "Networking" → "Storage Controllers"; Component Role: "(None)" → "Storage Controller"; Discontinued Date: "05/31/2030" → "06/30/2030"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "4"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "4"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":21600,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `Q6Q68A` | Hardware | ATTRIBUTE_CHANGED | Main Category: "Networking" → "Storage Controllers"; Component Role: "(None)" → "Storage Controller"; Discontinued Date: "05/31/2030" → "06/30/2030"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "14"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "14"; Speed Tier: "(None)" → "Standard Delivery (8-30d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":16800,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `R6Q74A` | Hardware | ATTRIBUTE_CHANGED | Main Category: "Networking" → "Storage Controllers"; Component Role: "(None)" → "Storage Controller"; Discontinued Date: "05/31/2030" → "06/30/2030"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "42"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "42"; Speed Tier: "(None)" → "Extended Schedule (31-45d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"42","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":33000,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `R6Q75A` | Hardware | ATTRIBUTE_CHANGED | Main Category: "Networking" → "Storage Controllers"; Component Role: "(None)" → "Storage Controller"; Discontinued Date: "05/31/2030" → "06/30/2030"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "14"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "14"; Speed Tier: "(None)" → "Standard Delivery (8-30d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":24000,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `AM495A` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Option Component"; Discontinued Date: "09/30/2027" → "10/31/2027"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "4"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "4"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2500,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `Q6Q64A` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Power Supply"; Discontinued Date: "09/30/2031" → "10/31/2031"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "4"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "4"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":780,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `AJ838A` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Cable Kit"; Discontinued Date: "11/30/2028" → "12/31/2028"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "3"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":208,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `AJ836A` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Cable Kit"; Discontinued Date: "11/30/2028" → "12/31/2028"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "3"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":115,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `AJ839A` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Cable Kit"; Discontinued Date: "11/30/2028" → "12/31/2028"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "3"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":253,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `QK732A` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Cable Kit"; Discontinued Date: "11/30/2028" → "12/31/2028"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "3"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":115,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `QK737A` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Cable Kit"; Discontinued Date: "11/30/2028" → "12/31/2028"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "3"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":415,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `AJ837A` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Cable Kit"; Discontinued Date: "11/30/2028" → "12/31/2028"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "4"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "4"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":162,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `QK735A` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Cable Kit"; Discontinued Date: "11/30/2028" → "12/31/2028"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "14"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "14"; Speed Tier: "(None)" → "Standard Delivery (8-30d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":195,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `QK733A` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Cable Kit"; Discontinued Date: "11/30/2028" → "12/31/2028"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "14"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "14"; Speed Tier: "(None)" → "Standard Delivery (8-30d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":130,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `QK736A` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Cable Kit"; Discontinued Date: "11/30/2028" → "12/31/2028"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "4"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "4"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":239,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `QK734A` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Cable Kit"; Discontinued Date: "11/30/2028" → "12/31/2028"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "14"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "14"; Speed Tier: "(None)" → "Standard Delivery (8-30d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":147,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `716191-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Cable Kit"; Discontinued Date: "08/31/2030" → "09/30/2030"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "3"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":221,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `716193-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Cable Kit"; Discontinued Date: "08/31/2030" → "09/30/2030"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "3"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":324,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `K2R10A` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Cable Kit"; Discontinued Date: "05/31/2027" → "06/30/2027"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "3"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":501,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `AE470A` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Cable Kit"; Discontinued Date: "05/31/2022" → "06/30/2022"; CLIC Status: "Obsolete (OB)" → "Unpublished"; Lead Time: "(None)" → "Unpublished"; Lead Time Source: "Not published by OCA" → "Unpublished"; Speed Tier: "(None)" → "Unpublished"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":78,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `AE465A` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Cable Kit"; Discontinued Date: "01/31/2022" → "02/01/2022"; CLIC Status: "Obsolete (OB)" → "Unpublished"; Lead Time: "(None)" → "Unpublished"; Lead Time Source: "Not published by OCA" → "Unpublished"; Speed Tier: "(None)" → "Unpublished"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":110,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `AN975A` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Cable Kit"; Discontinued Date: "08/31/2025" → "09/30/2025"; CLIC Status: "Obsolete (OB)" → "Unpublished"; Lead Time: "(None)" → "Unpublished"; Lead Time Source: "Not published by OCA" → "Unpublished"; Speed Tier: "(None)" → "Unpublished"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":264,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `AN976A` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Cable Kit"; Discontinued Date: "08/31/2025" → "09/30/2025"; CLIC Status: "Obsolete (OB)" → "Unpublished"; Lead Time: "(None)" → "Unpublished"; Lead Time Source: "Not published by OCA" → "Unpublished"; Speed Tier: "(None)" → "Unpublished"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":410,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `K2R09A` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Cable Kit"; Discontinued Date: "05/31/2027" → "06/30/2027"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "4"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "4"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":358,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `716197-B21` | Hardware | ATTRIBUTE_CHANGED | Rule/Note: "Supported on LTO-9 SAS Drive (R6Q75A) Only." → "Supported on LTO-9 SAS Drive (R6Q75A) Only.; 716197-B21 conditional visibility: portal selector activation required (Supported on LTO-9 SAS Drive (R6Q75A) Only.); PORTAL_CONDITIONAL; 716199-B21 conditional visibility: portal selector activation required (Supported on LTO-9 SAS Drive (R6Q75A) Only.); PORTAL_CONDITIONAL; P35176-B21 conditional visibility: portal selector activation required (Supported on LTO-9 SAS Drive (R6Q75A) Only.); PORTAL_CONDITIONAL; P35175-B21 conditional visibility: portal selector activation required (Supported on LTO-9 SAS Drive (R6Q75A) Only.); PORTAL_CONDITIONAL"; Component Role: "(None)" → "Cable Kit"; Discontinued Date: "08/31/2030" → "09/30/2030"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "3"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Portal Visibility: "(None)" → "PORTAL_CONDITIONAL"; Condition Type: "(None)" → "PORTAL_CONDITIONAL_VIEW"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":177,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `716199-B21` | Hardware | ATTRIBUTE_CHANGED | Rule/Note: "Supported on LTO-9 SAS Drive (R6Q75A) Only." → "Supported on LTO-9 SAS Drive (R6Q75A) Only.; 716197-B21 conditional visibility: portal selector activation required (Supported on LTO-9 SAS Drive (R6Q75A) Only.); PORTAL_CONDITIONAL; 716199-B21 conditional visibility: portal selector activation required (Supported on LTO-9 SAS Drive (R6Q75A) Only.); PORTAL_CONDITIONAL; P35176-B21 conditional visibility: portal selector activation required (Supported on LTO-9 SAS Drive (R6Q75A) Only.); PORTAL_CONDITIONAL; P35175-B21 conditional visibility: portal selector activation required (Supported on LTO-9 SAS Drive (R6Q75A) Only.); PORTAL_CONDITIONAL"; Component Role: "(None)" → "Cable Kit"; Discontinued Date: "08/31/2030" → "09/30/2030"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "3"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Portal Visibility: "(None)" → "PORTAL_CONDITIONAL"; Condition Type: "(None)" → "PORTAL_CONDITIONAL_VIEW"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":287,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P35176-B21` | Hardware | ATTRIBUTE_CHANGED | Rule/Note: "Supported on LTO-9 SAS Drive (R6Q75A) Only." → "Supported on LTO-9 SAS Drive (R6Q75A) Only.; 716197-B21 conditional visibility: portal selector activation required (Supported on LTO-9 SAS Drive (R6Q75A) Only.); PORTAL_CONDITIONAL; 716199-B21 conditional visibility: portal selector activation required (Supported on LTO-9 SAS Drive (R6Q75A) Only.); PORTAL_CONDITIONAL; P35176-B21 conditional visibility: portal selector activation required (Supported on LTO-9 SAS Drive (R6Q75A) Only.); PORTAL_CONDITIONAL; P35175-B21 conditional visibility: portal selector activation required (Supported on LTO-9 SAS Drive (R6Q75A) Only.); PORTAL_CONDITIONAL"; Component Role: "(None)" → "Cable Kit"; Discontinued Date: "08/31/2030" → "09/30/2030"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "14"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "14"; Speed Tier: "(None)" → "Standard Delivery (8-30d)"; Portal Visibility: "(None)" → "PORTAL_CONDITIONAL"; Condition Type: "(None)" → "PORTAL_CONDITIONAL_VIEW"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":206,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P35175-B21` | Hardware | ATTRIBUTE_CHANGED | Rule/Note: "Supported on LTO-9 SAS Drive (R6Q75A) Only." → "Supported on LTO-9 SAS Drive (R6Q75A) Only.; 716197-B21 conditional visibility: portal selector activation required (Supported on LTO-9 SAS Drive (R6Q75A) Only.); PORTAL_CONDITIONAL; 716199-B21 conditional visibility: portal selector activation required (Supported on LTO-9 SAS Drive (R6Q75A) Only.); PORTAL_CONDITIONAL; P35176-B21 conditional visibility: portal selector activation required (Supported on LTO-9 SAS Drive (R6Q75A) Only.); PORTAL_CONDITIONAL; P35175-B21 conditional visibility: portal selector activation required (Supported on LTO-9 SAS Drive (R6Q75A) Only.); PORTAL_CONDITIONAL"; Component Role: "(None)" → "Cable Kit"; Discontinued Date: "08/31/2030" → "09/30/2030"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "8"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "8"; Speed Tier: "(None)" → "Standard Delivery (8-30d)"; Portal Visibility: "(None)" → "PORTAL_CONDITIONAL"; Condition Type: "(None)" → "PORTAL_CONDITIONAL_VIEW"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":369,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `Q6Q63A` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Cable Kit"; Discontinued Date: "09/30/2031" → "10/31/2031"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "4"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "4"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":7275,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `AF568A` | Hardware | ATTRIBUTE_CHANGED | Max Qty: "-1" → "(None)"; Component Role: "(None)" → "Cable Kit"; Discontinued Date: "10/31/2031" → "11/30/2031"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "3"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":71,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `AF556A` | Hardware | ATTRIBUTE_CHANGED | Max Qty: "-1" → "(None)"; Component Role: "(None)" → "Cable Kit"; Discontinued Date: "09/30/2028" → "07/31/2029"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "3"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":55,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `AF569A` | Hardware | ATTRIBUTE_CHANGED | Max Qty: "-1" → "(None)"; Component Role: "(None)" → "Cable Kit"; Discontinued Date: "09/30/2028" → "07/31/2029"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "11"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "11"; Speed Tier: "(None)" → "Standard Delivery (8-30d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"11","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":65,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `AF570A` | Hardware | ATTRIBUTE_CHANGED | Max Qty: "-1" → "(None)"; Component Role: "(None)" → "Cable Kit"; Discontinued Date: "09/30/2028" → "07/31/2029"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "13"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "13"; Speed Tier: "(None)" → "Standard Delivery (8-30d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"13","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":55,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `142257-002` | Hardware | ATTRIBUTE_CHANGED | Max Qty: "-1" → "(None)"; Component Role: "(None)" → "Cable Kit"; Discontinued Date: "11/30/2026" → "07/31/2029"; Lifecycle Status: "EOL Warning (90-Day)" → "Active"; CLIC Status: "EOL Warning (90-Day)" → "Unpublished"; Lifecycle Badge: "90" → "(None)"; Availability: "EOL Warning (90-Day)" → "Available"; Lead Time: "(None)" → "8"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "8"; Speed Tier: "(None)" → "Standard Delivery (8-30d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":34,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `AF571A` | Hardware | ATTRIBUTE_CHANGED | Max Qty: "-1" → "(None)"; Component Role: "(None)" → "Cable Kit"; Discontinued Date: "09/30/2018" → "10/31/2018"; CLIC Status: "Obsolete (OB)" → "Unpublished"; Lead Time: "(None)" → "Unpublished"; Lead Time Source: "Not published by OCA" → "Unpublished"; Speed Tier: "(None)" → "Unpublished"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"}" |
| `AF561A` | Hardware | ATTRIBUTE_CHANGED | Max Qty: "-1" → "(None)"; Component Role: "(None)" → "Cable Kit"; Discontinued Date: "09/30/2028" → "07/31/2029"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "14"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "14"; Speed Tier: "(None)" → "Standard Delivery (8-30d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":55,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `AF566A` | Hardware | ATTRIBUTE_CHANGED | Max Qty: "-1" → "(None)"; Component Role: "(None)" → "Cable Kit"; Discontinued Date: "09/30/2028" → "07/31/2029"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "11"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "11"; Speed Tier: "(None)" → "Standard Delivery (8-30d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"11","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":55,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `AF557A` | Hardware | ATTRIBUTE_CHANGED | Max Qty: "-1" → "(None)"; Component Role: "(None)" → "Cable Kit"; Discontinued Date: "10/31/2031" → "11/30/2031"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "21"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "21"; Speed Tier: "(None)" → "Standard Delivery (8-30d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"21","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":156,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `AF558A` | Hardware | ATTRIBUTE_CHANGED | Max Qty: "-1" → "(None)"; Component Role: "(None)" → "Cable Kit"; Discontinued Date: "09/30/2028" → "07/31/2029"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "4"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "4"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":65,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `AF562A` | Hardware | ATTRIBUTE_CHANGED | Max Qty: "-1" → "(None)"; Component Role: "(None)" → "Cable Kit"; Discontinued Date: "10/31/2031" → "11/30/2031"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "4"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "4"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":194,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `SG579A` | Hardware | ATTRIBUTE_CHANGED | Max Qty: "-1" → "(None)"; Component Role: "(None)" → "Cable Kit"; Discontinued Date: "11/30/2022" → "12/31/2022"; CLIC Status: "Obsolete (OB)" → "Unpublished"; Lead Time: "(None)" → "Unpublished"; Lead Time Source: "Not published by OCA" → "Unpublished"; Speed Tier: "(None)" → "Unpublished"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":142,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `AF572A` | Hardware | ATTRIBUTE_CHANGED | Max Qty: "-1" → "(None)"; Component Role: "(None)" → "Cable Kit"; Discontinued Date: "09/30/2028" → "07/31/2029"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "4"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "4"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":60,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `AF560A` | Hardware | ATTRIBUTE_CHANGED | Max Qty: "-1" → "(None)"; Component Role: "(None)" → "Cable Kit"; Discontinued Date: "09/30/2028" → "07/31/2029"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "4"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "4"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":55,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `AF559A` | Hardware | ATTRIBUTE_CHANGED | Max Qty: "-1" → "(None)"; Component Role: "(None)" → "Cable Kit"; Discontinued Date: "09/30/2028" → "07/31/2029"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "4"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "4"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":55,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |

## 🧩 6. Same-Product CTO Variant Matrix

| Chassis Identifier | Product Family | Generation | Form Factor | CTO Base SKU |
|--------------------|----------------|------------|-------------|--------------|
| **MSL3040_Tape** | StoreEver | Tape | Rack | `Q6Q62C` |

## 📦 9. Solution Manifest, EDT & Commercial Baseline

**Configuration Profile**: `OCA Config 2` | **Icon ID**: `I158519560-01` | **Estimated Delivery Time (EDT)**: `14 - 18 days`

### Structural Field & Evidence Coverage

- **Row Types**: BASE_SYSTEM: 1, HARDWARE_OPTION: 165, SOFTWARE_SUBSCRIPTION: 7, SUPPORT_SERVICE: 104
- **Price States**: PRICED: 117, UNPRICED: 160
- **Lead-Time Measurement**: Numeric Days: 74, ETA Date Only: 0, Unpublished: 203
- **Visibility Coverage**: VISIBLE: 273, SELECTOR_HIDDEN: 4

## ⏱️ 10. Supply Chain & Delivery Lead Time Intelligence

### Confirmed Component Delivery SLAs

| Product # | Description | Category | Lead Time | Channel Status |
|---|---|---|---:|---|
| `Q6Q62C` | HPE MSL3040 Scalable Base Module | Chassis | EDT 17 - 21 days | Available in OCA product catalog |
| `Q2R41A` | [REMOVED SKU] HPE StoreEver MSL3040 Tape Library Base Module CTO Chassis | Chassis | Not available (Discontinued) | Available in OCA product catalog |
| `Q6Q67A` | HPE StoreEver MSL LTO-8 Ultrium 30750 FC Drive Upgrade Kit | Storage Controllers | 4 | Available |
| `Q6Q68A` | HPE StoreEver MSL LTO-8 Ultrium 30750 SAS Drive Upgrade Kit | Storage Controllers | 14 | Available |
| `R6Q74A` | HPE StoreEver MSL LTO-9 Ultrium 45000 Fibre Channel Drive Upgrade Kit | Storage Controllers | 42 | Available |
| `R6Q75A` | HPE StoreEver MSL LTO-9 Ultrium 45000 SAS Drive Upgrade Kit | Storage Controllers | 14 | Available |
| `AM495A` | HPE StoreEver 1/8 G2 Tape Autoloader and MSL Tape Library Encryption Kit | MSL Options | 4 | Available |
| `Q6Q64A` | HPE StoreEver MSL3040 Upgrade Power Supply Kit | Power Supplies | 4 | Available |
| `AJ838A` | HPE LC to LC Multi-mode OM3 2-Fiber 30.0m 1-Pack Fiber Optic Cable | Cables & Enablement Kits | 3 | Available |
| `AJ836A` | HPE LC to LC Multi-mode OM3 2-Fiber 5.0m 1-Pack Fiber Optic Cable | Cables & Enablement Kits | 3 | Available |
| `AJ839A` | HPE LC to LC Multi-mode OM3 2-Fiber 50.0m 1-Pack Fiber Optic Cable | Cables & Enablement Kits | 3 | Available |
| `QK732A` | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 1m Cable | Cables & Enablement Kits | 3 | Available |
| `QK737A` | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 50m Cable | Cables & Enablement Kits | 3 | Available |
| `AJ837A` | HPE LC to LC Multi-mode OM3 2-Fiber 15.0m 1-Pack Fiber Optic Cable | Cables & Enablement Kits | 4 | Available |
| `QK735A` | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 15m Cable | Cables & Enablement Kits | 14 | Available |
| `QK733A` | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 2m Cable | Cables & Enablement Kits | 14 | Available |
| `QK736A` | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 30m Cable | Cables & Enablement Kits | 4 | Available |
| `QK734A` | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 5m Cable | Cables & Enablement Kits | 14 | Available |
| `716191-B21` | HPE 2.0m External Mini SAS High Density to Mini SAS Cable | Drive Enclosures / Drives | 3 | Available |
| `716193-B21` | HPE 4.0m External Mini SAS High Density to Mini SAS Cable | Drive Enclosures / Drives | 3 | Available |
| `K2R10A` | HPE StoreEver Mini-SAS High Density to 4-lane Mini-SAS External Fanout 4m Cable | Drive Enclosures / Drives | 3 | Available |
| `K2R09A` | HPE StoreEver Mini-SAS High Density to 4-lane Mini-SAS External Fanout 2m Cable | Drive Enclosures / Drives | 4 | Available |
| `716197-B21` | HPE External 2.0m (6ft) Mini-SAS HD 4x to Mini-SAS HD 4x Cable | Drive Enclosures / Drives | 3 | Not published by OCA |
| `716199-B21` | HPE External 4.0m (13ft) Mini-SAS HD 4x to Mini-SAS HD 4x Cable | Drive Enclosures / Drives | 3 | Not published by OCA |
| `P35176-B21` | HPE External 12Gb Mini SAS High Density to Mini SAS High Density 4-lane 2m Fanout Cable | Drive Enclosures / Drives | 14 | Not published by OCA |
| `P35175-B21` | HPE External 12Gb Mini SAS High Density to Mini SAS High Density 4-lane 4m Fanout Cable | Drive Enclosures / Drives | 8 | Not published by OCA |
| `Q6Q63A` | HPE StoreEver MSL3040 Scalable Library Expansion Module | Drive Enclosures / Drives | 4 | Available |
| `AF568A` | HPE C13 - CEE-VII EU 250V 10Amp 1.83m Power Cord | Cables & Enablement Kits | 3 | Available |
| `AF556A` | HPE C13 - Nema 5-15P US/CA 110V 10Amp 1.83m Power Cord | Cables & Enablement Kits | 3 | Available |
| `AF569A` | HPE C13 - AS3112-3 AU 250V 10Amp 2.5m Power Cord | Cables & Enablement Kits | 11 | Available |
*... [46 additional supply chain records omitted for brevity]*

### ⚠️ Supply Chain Verification Advisory (Unpublished Delivery Lead Times)

*The following high-value active components have unpublished delivery estimates in live OCA. Presales engineers must verify distributor buffer stock before quoting committed deployment timelines:*

| Product # | Description | Category | Lead Time Status | Presales Action |
|---|---|---|:---:|---|
| `C0H28A` | HPE StoreEver MSL LTO-6 Ultrium 6250 Fibre Channel Drive Upgrade Kit | Storage Controllers | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `C0H27A` | HPE StoreEver MSL LTO-6 Ultrium 6250 SAS Drive Upgrade Kit | Storage Controllers | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `N7P36A` | HPE StoreEver MSL LTO-7 Ultrium 15000 FC Drive Upgrade Kit | Storage Controllers | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `N7P37A` | HPE StoreEver MSL LTO-7 Ultrium 15000 SAS Drive Upgrade Kit | Storage Controllers | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `Q8K98A` | HPE StoreEver MSL3040 KMIP Key Manager LTU | Software & Licenses | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `Q8L00A` | HPE StoreEver MSL3040 LTO-7+ Path Failover LTU | Software & Licenses | **Unpublished** | Verify distributor inventory prior to SLA commitment |


<!-- MANAGED_FULL_CATALOG -->
Content fingerprint: 75f4ebe534d3bef3615b8c386eaffb13ef47051eee928eb2c89674fae3f0a340

## Complete workbook text projection

Displayed cell values follow by sheet and original row. Formatting, charts and formulas remain in the Excel artifact. Repeated rows refer to the first identical row and schema; no content is replaced by a fingerprint.

### Category Summary

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Constraint | Min Qty | Max Qty | Total SKUs | Has Rules | Rule Count |
| 2 | Tape Drives | Tape Drives | max 3 | 0 | 3 | 0 | No | 0 |
| 3 | MSL Options | Encryption Kit | max 999 | 0 | 999 | 1 | Yes | 1 |
| 4 | MSL Options | Power Supply | max 1 | 0 | 1 | 0 | No | 0 |
| 5 | Cables | FibreChannel Cables | max 999 | 0 | 999 | 0 | No | 0 |
| 6 | Cables | SAS Cables | max 999 | 0 | 999 | 0 | No | 0 |
| 7 | Expansion Modules | Expansion Modules | max 15 | 0 | 15 | 0 | No | 0 |
| 8 | Power Cords | Power Cord | no max | 0 | Unlimited | 0 | No | 0 |
| 9 | Storage Media | Storage Media | max 999 | 0 | 999 | 0 | No | 0 |
| 10 | Software | Software | no max | 0 | Unlimited | 0 | No | 0 |
| 11 | Chassis | Variants | min 1, max 1 — Active OCA CTO chassis | 1 | 1 | 2 | Yes | 1 |
| 12 | Storage Controllers | Fibre Channel Host Bus Adapters | max 3 | 0 | 3 | 8 | Yes | 1 |
| 13 | Power Supplies | Power Supply | max 1 | 0 | 1 | 1 | Yes | 1 |
| 14 | Cables &amp; Enablement Kits | FibreChannel Cables | max 999 | 0 | 999 | 10 | Yes | 1 |
| 15 | Drive Enclosures / Drives | SAS Cables | max 999 | 0 | 999 | 13 | Yes | 7 |
| 16 | Cables &amp; Enablement Kits | Power Cord | no max | 0 | Unlimited | 18 | Yes | 1 |
| 17 | Storage Controllers | Storage Media | max 999 | 0 | 999 | 64 | Yes | 1 |
| 18 | Software &amp; Licenses | Software | no max | 0 | Unlimited | 13 | Yes | 2 |
| 19 | Accessories &amp; Infrastructure | Accessories &amp; Infrastructure Options |  | 0 | Unlimited | 1 | No | 0 |
| 20 | Support Services | System Options |  | 0 | Unlimited | 103 | No | 0 |
| 21 | Support Services | Storage Media | max 999 | 0 | 999 | 20 | Yes | 1 |
| 22 | Support Services | Support &amp; Deployment Services | max 8 | 0 | 8 | 10 | Yes | 1 |
| 23 | Processor | Intel Xeon Scalable Processors | Discontinued | 0 | Discontinued | 6 | Yes | 1 |
| 24 | Chassis | Encryption Kit | Discontinued | 0 | Discontinued | 7 | Yes | 1 |


### All SKUs

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |
| 2 | Chassis | Variants | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Chassis &gt; Variants | Base Chassis | min 1, max 1 | 1 | 1 | Select exactly one currently discoverable, non-TAA/non-GTA CTO base chassis | Q6Q62C | CTO | HPE MSL3040 Scalable Base Module | 1 | $4,500.00 |  |  |  |  | No | Available in OCA product catalog | 17 |  | Standard Delivery (8-30d) | OCA candidate estimate | Valid | Active |  |  |  |
| 3 | Chassis | Variants | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Chassis &gt; Variants | Base Chassis | min 1, max 1 | 1 | 1 | Select exactly one currently discoverable, non-TAA/non-GTA CTO base chassis | Q2R41A | CTO | [REMOVED SKU] HPE StoreEver MSL3040 Tape Library Base Module CTO Chassis | 0 | $4,500.00 |  | - | $0.00 | - | No | Available in OCA product catalog | Not available (Discontinued) |  | Unpublished | Not published by OCA | Unpublished | Active | 2026-09-09 | 2026-11-20 | {} |
| 4 | Storage Controllers | Fibre Channel Host Bus Adapters | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Fibre Channel Host Bus Adapters | Storage Controller | max 3 | 0 | 3 | Selection constraint for Fibre Channel Host Bus Adapters: max 3 | C0H28A | Standard | HPE StoreEver MSL LTO-6 Ultrium 6250 Fibre Channel Drive Upgrade Kit | 0 | $5,300.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/23/2017 | 05/31/2024 | [TEXT_1] |
| 5 | Storage Controllers | Fibre Channel Host Bus Adapters | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Fibre Channel Host Bus Adapters | Storage Controller | max 3 | 0 | 3 | Selection constraint for Fibre Channel Host Bus Adapters: max 3 | C0H27A | Standard | HPE StoreEver MSL LTO-6 Ultrium 6250 SAS Drive Upgrade Kit | 0 | $5,100.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/23/2017 | 12/31/2023 | [TEXT_2] |
| 6 | Storage Controllers | Fibre Channel Host Bus Adapters | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Fibre Channel Host Bus Adapters | Storage Controller | max 3 | 0 | 3 | Selection constraint for Fibre Channel Host Bus Adapters: max 3 | N7P36A | Standard | HPE StoreEver MSL LTO-7 Ultrium 15000 FC Drive Upgrade Kit | 0 | $9,362.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/23/2017 | 07/31/2026 | [TEXT_3] |
| 7 | Storage Controllers | Fibre Channel Host Bus Adapters | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Fibre Channel Host Bus Adapters | Storage Controller | max 3 | 0 | 3 | Selection constraint for Fibre Channel Host Bus Adapters: max 3 | N7P37A | Standard | HPE StoreEver MSL LTO-7 Ultrium 15000 SAS Drive Upgrade Kit | 0 | $9,010.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/23/2017 | 07/31/2026 | [TEXT_4] |
| 8 | Storage Controllers | Fibre Channel Host Bus Adapters | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Fibre Channel Host Bus Adapters | Storage Controller | max 3 | 0 | 3 | Selection constraint for Fibre Channel Host Bus Adapters: max 3 | Q6Q67A | Standard | HPE StoreEver MSL LTO-8 Ultrium 30750 FC Drive Upgrade Kit | 0 | $21,600.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 02/05/2018 | 06/30/2030 | [TEXT_5] |
| 9 | Storage Controllers | Fibre Channel Host Bus Adapters | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Fibre Channel Host Bus Adapters | Storage Controller | max 3 | 0 | 3 | Selection constraint for Fibre Channel Host Bus Adapters: max 3 | Q6Q68A | Standard | HPE StoreEver MSL LTO-8 Ultrium 30750 SAS Drive Upgrade Kit | 0 | $16,800.00 |  |  | NA |  | No | Available | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 02/05/2018 | 06/30/2030 | [TEXT_6] |
| 10 | Storage Controllers | Fibre Channel Host Bus Adapters | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Fibre Channel Host Bus Adapters | Storage Controller | max 3 | 0 | 3 | Selection constraint for Fibre Channel Host Bus Adapters: max 3 | R6Q74A | Standard | HPE StoreEver MSL LTO-9 Ultrium 45000 Fibre Channel Drive Upgrade Kit | 0 | $33,000.00 |  |  | NA |  | No | Available | 42 | 42 | Extended Schedule (31-45d) | OCA row attribute | Unpublished | Active | 01/10/2022 | 06/30/2030 | [TEXT_7] |
| 11 | Storage Controllers | Fibre Channel Host Bus Adapters | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Fibre Channel Host Bus Adapters | Storage Controller | max 3 | 0 | 3 | Selection constraint for Fibre Channel Host Bus Adapters: max 3 | R6Q75A | Standard | HPE StoreEver MSL LTO-9 Ultrium 45000 SAS Drive Upgrade Kit | 0 | $24,000.00 |  |  | NA |  | No | Available | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 01/10/2022 | 06/30/2030 | [TEXT_8] |
| 12 | MSL Options | Encryption Kit | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; MSL Options &gt; Encryption Kit | Option Component | max 999 | 0 | 999 | Selection constraint for Encryption Kit: max 999 | AM495A | Standard | HPE StoreEver 1/8 G2 Tape Autoloader and MSL Tape Library Encryption Kit | 0 | $2,500.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 10/31/2027 | [TEXT_9] |
| 13 | Power Supplies | Power Supply | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Power Supplies &gt; Power Supply | Power Supply | max 1 | 0 | 1 | Selection constraint for Power Supply: max 1 | Q6Q64A | Standard | HPE StoreEver MSL3040 Upgrade Power Supply Kit | 0 | $780.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 12/04/2017 | 10/31/2031 | [TEXT_10] |
| 14 | Cables &amp; Enablement Kits | FibreChannel Cables | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Cables &amp; Enablement Kits &gt; FibreChannel Cables | Cable Kit | max 999 | 0 | 999 | Selection constraint for FibreChannel Cables: max 999 | AJ838A | Standard | HPE LC to LC Multi-mode OM3 2-Fiber 30.0m 1-Pack Fiber Optic Cable | 0 | $208.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 12/31/2028 | [TEXT_11] |
| 15 | Cables &amp; Enablement Kits | FibreChannel Cables | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Cables &amp; Enablement Kits &gt; FibreChannel Cables | Cable Kit | max 999 | 0 | 999 | Selection constraint for FibreChannel Cables: max 999 | AJ836A | Standard | HPE LC to LC Multi-mode OM3 2-Fiber 5.0m 1-Pack Fiber Optic Cable | 0 | $115.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 12/31/2028 | [TEXT_12] |
| 16 | Cables &amp; Enablement Kits | FibreChannel Cables | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Cables &amp; Enablement Kits &gt; FibreChannel Cables | Cable Kit | max 999 | 0 | 999 | Selection constraint for FibreChannel Cables: max 999 | AJ839A | Standard | HPE LC to LC Multi-mode OM3 2-Fiber 50.0m 1-Pack Fiber Optic Cable | 0 | $253.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 12/31/2028 | [TEXT_13] |
| 17 | Cables &amp; Enablement Kits | FibreChannel Cables | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Cables &amp; Enablement Kits &gt; FibreChannel Cables | Cable Kit | max 999 | 0 | 999 | Selection constraint for FibreChannel Cables: max 999 | QK732A | Standard | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 1m Cable | 0 | $115.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 12/31/2028 | [TEXT_12] |
| 18 | Cables &amp; Enablement Kits | FibreChannel Cables | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Cables &amp; Enablement Kits &gt; FibreChannel Cables | Cable Kit | max 999 | 0 | 999 | Selection constraint for FibreChannel Cables: max 999 | QK737A | Standard | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 50m Cable | 0 | $415.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 12/31/2028 | [TEXT_14] |
| 19 | Cables &amp; Enablement Kits | FibreChannel Cables | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Cables &amp; Enablement Kits &gt; FibreChannel Cables | Cable Kit | max 999 | 0 | 999 | Selection constraint for FibreChannel Cables: max 999 | AJ837A | Standard | HPE LC to LC Multi-mode OM3 2-Fiber 15.0m 1-Pack Fiber Optic Cable | 0 | $162.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 12/31/2028 | [TEXT_15] |
| 20 | Cables &amp; Enablement Kits | FibreChannel Cables | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Cables &amp; Enablement Kits &gt; FibreChannel Cables | Cable Kit | max 999 | 0 | 999 | Selection constraint for FibreChannel Cables: max 999 | QK735A | Standard | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 15m Cable | 0 | $195.00 |  |  | NA |  | No | Available | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 12/31/2028 | [TEXT_16] |
| 21 | Cables &amp; Enablement Kits | FibreChannel Cables | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Cables &amp; Enablement Kits &gt; FibreChannel Cables | Cable Kit | max 999 | 0 | 999 | Selection constraint for FibreChannel Cables: max 999 | QK733A | Standard | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 2m Cable | 0 | $130.00 |  |  | NA |  | No | Available | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 12/31/2028 | [TEXT_17] |
| 22 | Cables &amp; Enablement Kits | FibreChannel Cables | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Cables &amp; Enablement Kits &gt; FibreChannel Cables | Cable Kit | max 999 | 0 | 999 | Selection constraint for FibreChannel Cables: max 999 | QK736A | Standard | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 30m Cable | 0 | $239.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 12/31/2028 | [TEXT_18] |
| 23 | Cables &amp; Enablement Kits | FibreChannel Cables | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Cables &amp; Enablement Kits &gt; FibreChannel Cables | Cable Kit | max 999 | 0 | 999 | Selection constraint for FibreChannel Cables: max 999 | QK734A | Standard | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 5m Cable | 0 | $147.00 |  |  | NA |  | No | Available | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 12/31/2028 | [TEXT_19] |
| 24 | Drive Enclosures / Drives | SAS Cables | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Drive Enclosures / Drives &gt; SAS Cables | Cable Kit | max 999 | 0 | 999 | Selection constraint for SAS Cables: max 999 | 716191-B21 | Standard | HPE 2.0m External Mini SAS High Density to Mini SAS Cable | 0 | $221.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 09/30/2030 | [TEXT_20] |
| 25 | Drive Enclosures / Drives | SAS Cables | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Drive Enclosures / Drives &gt; SAS Cables | Cable Kit | max 999 | 0 | 999 | Selection constraint for SAS Cables: max 999 | 716193-B21 | Standard | HPE 4.0m External Mini SAS High Density to Mini SAS Cable | 0 | $324.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 09/30/2030 | [TEXT_21] |
| 26 | Drive Enclosures / Drives | SAS Cables | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Drive Enclosures / Drives &gt; SAS Cables | Cable Kit | max 999 | 0 | 999 | Selection constraint for SAS Cables: max 999 | K2R10A | Standard | HPE StoreEver Mini-SAS High Density to 4-lane Mini-SAS External Fanout 4m Cable | 0 | $501.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 06/30/2027 | [TEXT_22] |
| 27 | Drive Enclosures / Drives | SAS Cables | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Drive Enclosures / Drives &gt; SAS Cables | Cable Kit | max 999 | 0 | 999 | Selection constraint for SAS Cables: max 999 | AE470A | Standard | HPE SAS Min-Min 1x-2M Cable Assembly Kit | 0 | $78.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/23/2017 | 06/30/2022 | [TEXT_23] |
| 28 | Drive Enclosures / Drives | SAS Cables | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Drive Enclosures / Drives &gt; SAS Cables | Cable Kit | max 999 | 0 | 999 | Selection constraint for SAS Cables: max 999 | AE465A | Standard | HPE SAS Min-Min 1x-4m Cable Assembly Kit | 0 | $110.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/23/2017 | 02/01/2022 | [TEXT_24] |
| 29 | Drive Enclosures / Drives | SAS Cables | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Drive Enclosures / Drives &gt; SAS Cables | Cable Kit | max 999 | 0 | 999 | Selection constraint for SAS Cables: max 999 | AN975A | Standard | HPE StoreEver 2m External Mini-SAS to 4x1 Mini-SAS Cable | 0 | $264.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/23/2017 | 09/30/2025 | [TEXT_25] |
| 30 | Drive Enclosures / Drives | SAS Cables | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Drive Enclosures / Drives &gt; SAS Cables | Cable Kit | max 999 | 0 | 999 | Selection constraint for SAS Cables: max 999 | AN976A | Standard | HPE StoreEver 4m External Mini-SAS to 4x1 Mini-SAS Cable | 0 | $410.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/23/2017 | 09/30/2025 | [TEXT_26] |
| 31 | Drive Enclosures / Drives | SAS Cables | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Drive Enclosures / Drives &gt; SAS Cables | Cable Kit | max 999 | 0 | 999 | Selection constraint for SAS Cables: max 999 | K2R09A | Standard | HPE StoreEver Mini-SAS High Density to 4-lane Mini-SAS External Fanout 2m Cable | 0 | $358.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 06/30/2027 | [TEXT_27] |
| 32 | Drive Enclosures / Drives | SAS Cables | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Drive Enclosures / Drives &gt; SAS Cables | Cable Kit | max 999 | 0 | 999 | [TEXT_28] | 716197-B21 | Standard | HPE External 2.0m (6ft) Mini-SAS HD 4x to Mini-SAS HD 4x Cable | 0 | $177.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 09/30/2030 | [TEXT_29] |
| 33 | Drive Enclosures / Drives | SAS Cables | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Drive Enclosures / Drives &gt; SAS Cables | Cable Kit | max 999 | 0 | 999 | [TEXT_30] | 716199-B21 | Standard | HPE External 4.0m (13ft) Mini-SAS HD 4x to Mini-SAS HD 4x Cable | 0 | $287.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 09/30/2030 | [TEXT_31] |
| 34 | Drive Enclosures / Drives | SAS Cables | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Drive Enclosures / Drives &gt; SAS Cables | Cable Kit | max 999 | 0 | 999 | [TEXT_32] | P35176-B21 | Standard | HPE External 12Gb Mini SAS High Density to Mini SAS High Density 4-lane 2m Fanout Cable | 0 | $206.00 |  |  | NA |  | No | Not published by OCA | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 01/10/2022 | 09/30/2030 | [TEXT_33] |
| 35 | Drive Enclosures / Drives | SAS Cables | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Drive Enclosures / Drives &gt; SAS Cables | Cable Kit | max 999 | 0 | 999 | [TEXT_34] | P35175-B21 | Standard | HPE External 12Gb Mini SAS High Density to Mini SAS High Density 4-lane 4m Fanout Cable | 0 | $369.00 |  |  | NA |  | No | Not published by OCA | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 01/10/2022 | 09/30/2030 | [TEXT_35] |
| 36 | Drive Enclosures / Drives | SAS Cables | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Drive Enclosures / Drives &gt; SAS Cables | Cable Kit | max 999 | 0 | 999 | Selection constraint for SAS Cables: max 999 | Q6Q63A | Standard | HPE StoreEver MSL3040 Scalable Library Expansion Module | 0 | $7,275.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 12/04/2017 | 10/31/2031 | [TEXT_36] |
| 37 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | Unlimited | 0 | Unlimited | Selection constraint for Power Cord: no max | AF568A | Standard | HPE C13 - CEE-VII EU 250V 10Amp 1.83m Power Cord | 0 | $71.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 11/30/2031 | [TEXT_37] |
| 38 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | Unlimited | 0 | Unlimited | Selection constraint for Power Cord: no max | AF556A | Standard | HPE C13 - Nema 5-15P US/CA 110V 10Amp 1.83m Power Cord | 0 | $55.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 07/31/2029 | [TEXT_38] |
| 39 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | Unlimited | 0 | Unlimited | Selection constraint for Power Cord: no max | AF569A | Standard | HPE C13 - AS3112-3 AU 250V 10Amp 2.5m Power Cord | 0 | $65.00 |  |  | NA |  | No | Available | 11 | 11 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 07/31/2029 | [TEXT_39] |
| 40 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | Unlimited | 0 | Unlimited | Selection constraint for Power Cord: no max | AF570A | Standard | HPE C13 - BS-1363A UK/HK/SG 250V 10Amp 1.83m Power Cord | 0 | $55.00 |  |  | NA |  | No | Available | 13 | 13 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 07/31/2029 | [TEXT_40] |
| 41 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | Unlimited | 0 | Unlimited | Selection constraint for Power Cord: no max | 142257-002 | Standard | HPE C13 - C14 WW 250V 10Amp 2.5m Jumper Cord | 0 | $34.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 07/31/2029 | [TEXT_41] |
| 42 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | Unlimited | 0 | Unlimited | Selection constraint for Power Cord: no max | AF571A | Standard | HPE C13 - CEI-23-50 IT/CL 250V 10Amp 1.83m Power Cord | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/23/2017 | 10/31/2018 | [TEXT_42] |
| 43 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | Unlimited | 0 | Unlimited | Selection constraint for Power Cord: no max | AF561A | Standard | HPE C13 - CNS-690 TW 110V 13Amp 1.83m Power Cord | 0 | $55.00 |  |  | NA |  | No | Available | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 07/31/2029 | [TEXT_43] |
| 44 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | Unlimited | 0 | Unlimited | Selection constraint for Power Cord: no max | AF566A | Standard | HPE C13 - DK-2.5A DK 250V 10Amp 1.83m Power Cord | 0 | $55.00 |  |  | NA |  | No | Available | 11 | 11 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 07/31/2029 | [TEXT_44] |
| 45 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | Unlimited | 0 | Unlimited | Selection constraint for Power Cord: no max | AF557A | Standard | HPE C13 - GB-1002 CN 250V 10Amp 1.83m Power Cord | 0 | $156.00 |  |  | NA |  | No | Available | 21 | 21 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 11/30/2031 | [TEXT_45] |
| 46 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | Unlimited | 0 | Unlimited | Selection constraint for Power Cord: no max | AF558A | Standard | HPE C13 - IRAM -2073 AR 250V 10A 2.5m Power Cord | 0 | $65.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 07/31/2029 | [TEXT_46] |
| 47 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | Unlimited | 0 | Unlimited | Selection constraint for Power Cord: no max | AF562A | Standard | HPE C13 - IS-1293 IN 240V 6Amp LV 2.0m Power Cord | 0 | $194.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 11/30/2031 | [TEXT_47] |
| 48 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | Unlimited | 0 | Unlimited | Selection constraint for Power Cord: no max | SG579A | Standard | HPE C13 - IS-1293 IN 250V 10Amp HV 2.5m Power Cord | 0 | $142.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/19/2018 | 12/31/2022 | [TEXT_48] |
| 49 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | Unlimited | 0 | Unlimited | Selection constraint for Power Cord: no max | AF572A | Standard | HPE C13 - JIS C8303 JP 100V 12Amp 2.0m Power Cord | 0 | $60.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 07/31/2029 | [TEXT_49] |
| 50 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | Unlimited | 0 | Unlimited | Selection constraint for Power Cord: no max | AF560A | Standard | HPE C13 - KSC- 8305 KR 250V 10Amp 1.83m Power Cord | 0 | $55.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 07/31/2029 | [TEXT_50] |
| 51 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | Unlimited | 0 | Unlimited | Selection constraint for Power Cord: no max | AF559A | Standard | HPE C13 - Nema 5-15P TH/PH 250V 10Amp 1.83m Power Cord | 0 | $55.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 07/31/2029 | [TEXT_50] |
| 52 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | Unlimited | 0 | Unlimited | Selection constraint for Power Cord: no max | AF567A | Standard | HPE C13 - SABS-164 ZA 250V 10Amp 2.5m Power Cord | 0 | $65.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 07/31/2029 | [TEXT_46] |
| 53 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | Unlimited | 0 | Unlimited | Selection constraint for Power Cord: no max | AF565A | Standard | HPE C13 - SEV 1011 CH 250V 10Amp 1.83m Power Cord | 0 | $55.00 |  |  | NA |  | No | Available | 11 | 11 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 07/31/2029 | [TEXT_44] |
| 54 | Cables &amp; Enablement Kits | Power Cord | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Cables &amp; Enablement Kits &gt; Power Cord | Cable Kit | Unlimited | 0 | Unlimited | Selection constraint for Power Cord: no max | AF564A | Standard | HPE C13 - SI-32 IL 250V 10Amp 1.83m Power Cord | 0 | $55.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 07/31/2029 | [TEXT_50] |
| 55 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | C7973A | Standard | HPE LTO-3 Ultrium 800 GB Re-writable Data Cartridge | 0 | $61.35 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/23/2017 | 03/31/2019 | [TEXT_51] |
| 56 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | C7973W | Standard | HPE LTO-3 Ultrium 800 GB WORM Data Cartridge | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/23/2017 | 11/01/2018 | [TEXT_42] |
| 57 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | C7973AL | Standard | HPE LTO-3 Ultrium 800GB RW Labeled Data Cartridge 20 Pack | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/23/2017 | 11/01/2018 | [TEXT_42] |
| 58 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | C7974AN | Standard | HPE LTO-4 Ultrium 1.6TB Non-custom Label Data Cartridge 20 Pack | 0 | $695.91 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/23/2017 | 02/28/2023 | [TEXT_52] |
| 59 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | C7974AL | Standard | HPE LTO-4 Ultrium 1.6TB RW Custom Label Data Cartridge 20 Pack | 0 | $1,182.63 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/31/2018 | 04/30/2022 | [TEXT_53] |
| 60 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | Q2009A | Standard | HPE LTO-4 Ultrium Read/Write Bar Code Label Pack | 0 | $197.87 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/23/2017 | 06/30/2022 | [TEXT_54] |
| 61 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | Q2010A | Standard | HPE LTO-4 Ultrium WORM Bar Code Label Pack | 0 | $199.05 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/23/2017 | 02/29/2024 | [TEXT_55] |
| 62 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | C7975AL | Standard | HPE LTO-5 RW Custom Labeled Data Cartridge 20 Pack | 0 | $929.43 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/23/2017 | 03/31/2025 | [TEXT_56] |
| 63 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | C7975AA | Standard | HPE LTO-5 Ultrium 3TB RW 20 Data Cartridges | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/03/2018 | 03/31/2025 | [TEXT_42] |
| 64 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | C7975A | Standard | HPE LTO-5 Ultrium 3TB RW Data Cartridge | 0 | $46.46 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/23/2017 | 10/31/2026 | [TEXT_57] |
| 65 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | C7975W | Standard | HPE LTO-5 Ultrium 3TB WORM Data Cartridge | 0 | $53.12 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/23/2017 | 12/01/2023 | [TEXT_58] |
| 66 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | C7975AN | Standard | HPE LTO-5 Ultrium Non-custom Labeled Data Cartridge 20 Pack | 0 | $929.43 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/23/2017 | 12/31/2025 | [TEXT_56] |
| 67 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | Q2011A | Standard | HPE LTO-5 Ultrium RW Bar Code Label Pack | 0 | $92.99 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/23/2017 | 10/31/2026 | [TEXT_59] |
| 68 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | Q2012A | Standard | HPE LTO-5 Ultrium WORM Bar Code Label Pack | 0 | $199.05 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/23/2017 | 02/29/2024 | [TEXT_55] |
| 69 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | C7976BL | Standard | HPE LTO-6 Ultrium 6.25TB BaFe RW Custom Labeled Data Cartridge 20 Pack | 0 | $1,146.39 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/23/2017 | 03/31/2025 | [TEXT_60] |
| 70 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | C7976B | Standard | HPE LTO-6 Ultrium 6.25TB BaFe RW Data Cartridge | 0 | $57.32 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/23/2017 | 08/31/2025 | [TEXT_61] |
| 71 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | C7976BN | Standard | HPE LTO-6 Ultrium 6.25TB BaFe RW Non Custom Labeled Data Cartridges 20 Pack | 0 | $1,293.13 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/23/2017 | 07/31/2026 | [TEXT_62] |
| 72 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | C7976BW | Standard | HPE LTO-6 Ultrium 6.25TB BaFe WORM Data Cartridge | 0 | $86.76 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/23/2017 | 07/31/2026 | [TEXT_63] |
| 73 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | C7976AF | Standard | HPE LTO-6 Ultrium 6.25TB MP RFID RW Custom Labeled Data Cartridge 20 Pack | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/23/2017 | 11/01/2018 | [TEXT_42] |
| 74 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | C7976AA | Standard | HPE LTO-6 Ultrium 6.25TB RW 20 Data Cartridges | 0 |  |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 12/03/2018 | 10/31/2031 | [TEXT_64] |
| 75 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | C7976AC | Standard | HPE LTO-6 Ultrium 6.25TB RW Custom Labeled 20 Data Cartridges Library Pack without Cases | 0 | $1,530.46 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 10/31/2031 | [TEXT_65] |
| 76 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | C7976AL | Standard | HPE LTO-6 Ultrium 6.25TB RW Custom Labeled 20 Data Cartridges with Cases | 0 | $1,530.47 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 10/31/2031 | [TEXT_66] |
| 77 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | C7976A | Standard | HPE LTO-6 Ultrium 6.25TB RW Data Cartridge | 0 | $76.53 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 10/31/2031 | [TEXT_67] |
| 78 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | C7976AN | Standard | HPE LTO-6 Ultrium 6.25TB RW Non Custom Labeled 20 Data Cartridges with Cases | 0 | $1,530.47 |  |  | NA |  | No | Available | 6 | 6 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 10/31/2031 | [TEXT_68] |
| 79 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | C7976WL | Standard | HPE LTO-6 Ultrium 6.25TB WORM Custom Labeled 20 Data Cartridges with Cases | 0 | $2,176.50 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 10/31/2031 | [TEXT_69] |
| 80 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | C7976W | Standard | HPE LTO-6 Ultrium 6.25TB WORM Data Cartridge | 0 | $108.82 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 10/31/2031 | [TEXT_70] |
| 81 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | Q2013A | Standard | HPE LTO-6 Ultrium RW Bar Code Label Pack | 0 | $92.99 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 10/31/2031 | [TEXT_71] |
| 82 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | C7977AH | Standard | HPE LTO-7 Ultrium 15TB Eco Case Data Cartridge 20 Pack | 0 | $2,205.96 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 11/30/2036 | [TEXT_72] |
| 83 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | C7977A | Standard | HPE LTO-7 Ultrium 15TB RW Data Cartridge | 0 | $110.30 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 11/30/2036 | [TEXT_73] |
| 84 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | C7977AN | Standard | HPE LTO-7 Ultrium Non Custom Labeled Data Cartridge 20 Pack | 0 | $2,205.96 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 11/30/2036 | [TEXT_74] |
| 85 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | C7977AF | Standard | HPE LTO-7 Ultrium RFID RW Custom Labeled Data Cartridge 20 Pack | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/23/2017 | 11/01/2018 | [TEXT_42] |
| 86 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | Q2014A | Standard | HPE LTO-7 Ultrium RW Bar Code Label Pack | 0 | $92.99 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 11/30/2036 | [TEXT_71] |
| 87 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | C7977AL | Standard | HPE LTO-7 Ultrium RW Custom Labeled Data Cartridge 20 Pack | 0 | $2,205.96 |  |  | NA |  | No | Available | 9 | 9 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 11/30/2036 | [TEXT_75] |
| 88 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | C7977AC | Standard | HPE LTO-7 Ultrium RW No Case Custom Labeled Data Cartridge 20 Pack | 0 | $2,205.96 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 11/30/2036 | [TEXT_72] |
| 89 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | Q2078MC | Standard | HPE LTO-7 Ultrium Type M 22.5TB RW 20 Data Cartridges Custom Labeled Library Pack without Cases | 0 | $1,617.88 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 02/05/2018 | 07/31/2023 | [TEXT_76] |
| 90 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | Q2078ML | Standard | HPE LTO-7 Ultrium Type M 22.5TB RW 20 Data Cartridges Custom Labeled with Cases | 0 | $1,617.88 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 02/05/2018 | 07/31/2023 | [TEXT_76] |
| 91 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | Q2078MN | Standard | HPE LTO-7 Ultrium Type M 22.5TB RW 20 Data Cartridges Non Custom Labeled with Cases | 0 | $1,617.88 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 02/05/2018 | 07/31/2023 | [TEXT_76] |
| 92 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | Q2016A | Standard | HPE LTO-7 Ultrium Type M RW Bar Code Label Pack | 0 | $199.05 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 02/05/2018 | 07/31/2023 | [TEXT_55] |
| 93 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | C7977WL | Standard | HPE LTO-7 Ultrium WORM Custom Labeled Data Cartridge 20 Pack | 0 | $3,044.17 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 11/30/2036 | [TEXT_77] |
| 94 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | C7977W | Standard | HPE LTO-7 Ultrium WORM Data Cartridge | 0 | $152.20 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 11/30/2036 | [TEXT_78] |
| 95 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | Q2078AH | Standard | HPE LTO-8 Ultrium 30TB RW 20 Data Cartridges Library Pack without Cases | 0 | $2,348.24 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/14/2019 | 11/30/2036 | [TEXT_79] |
| 96 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | Q2078AL | Standard | HPE LTO-8 Ultrium 30TB RW Custom Labeled Library Pack 20 Data Cartridges with Cases | 0 | $2,348.24 |  |  | NA |  | No | Available | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 08/14/2019 | 11/30/2036 | [TEXT_80] |
| 97 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | Q2078AC | Standard | HPE LTO-8 Ultrium 30TB RW Custom Labeled Library Pack 20 Data Cartridges without Cases | 0 | $2,348.24 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 08/14/2019 | 11/30/2036 | [TEXT_81] |
| 98 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | Q2078A | Standard | HPE LTO-8 Ultrium 30TB RW Data Cartridge | 0 | $117.43 |  |  | NA |  | No | Available | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 08/14/2019 | 11/30/2036 | [TEXT_82] |
| 99 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | Q2078AN | Standard | HPE LTO-8 Ultrium 30TB RW Non Custom Labeled Library Pack 20 Data Cartridges with Cases | 0 | $2,348.24 |  |  | NA |  | No | Available | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 08/14/2019 | 11/30/2036 | [TEXT_80] |
| 100 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | Q2078WL | Standard | HPE LTO-8 Ultrium 30TB WORM Custom Labeled 20 Data Cartridges with Cases | 0 | $3,240.72 |  |  | NA |  | No | Available | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 08/14/2019 | 11/30/2036 | [TEXT_83] |
| 101 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | Q2078W | Standard | HPE LTO-8 Ultrium 30TB WORM Data Cartridge | 0 | $162.07 |  |  | NA |  | No | Available | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 08/14/2019 | 11/30/2036 | [TEXT_84] |
| 102 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | Q2015A | Standard | HPE LTO-8 Ultrium RW Bar Code Label Pack | 0 | $92.99 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 12/04/2017 | 11/30/2036 | [TEXT_71] |
| 103 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | Q2079AH | Standard | HPE LTO-9 Ultrium 45TB RW 20 Data Cartridges Library Pack without Cases | 0 | $2,911.01 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/07/2021 | 12/31/2030 | [TEXT_85] |
| 104 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | Q2079AL | Standard | HPE LTO-9 Ultrium 45TB RW Custom Labeled 20 Data Cartridges with Cases | 0 | $2,911.01 |  |  | NA |  | No | Available | 10 | 10 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 09/07/2021 | 12/31/2030 | [TEXT_86] |
| 105 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | Q2079AC | Standard | HPE LTO-9 Ultrium 45TB RW Custom Labeled Library Pack 20 Data Cartridges without Cases | 0 | $2,911.01 |  |  | NA |  | No | Available | 9 | 9 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 09/07/2021 | 12/31/2030 | [TEXT_87] |
| 106 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | Q2079A | Standard | HPE LTO-9 Ultrium 45TB RW Data Cartridge | 0 | $145.56 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 09/07/2021 | 12/31/2030 | [TEXT_88] |
| 107 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | Q2079AN | Standard | HPE LTO-9 Ultrium 45TB RW Non Custom Labeled 20 Data Cartridges with Cases | 0 | $2,911.01 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/07/2021 | 12/31/2030 | [TEXT_85] |
| 108 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | Q2079WL | Standard | HPE LTO-9 Ultrium 45TB WORM Custom Labeled 20 Data Cartridges with Cases | 0 | $3,976.02 |  |  | NA |  | No | Available | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 09/07/2021 | 12/31/2030 | [TEXT_89] |
| 109 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | Q2079W | Standard | HPE LTO-9 Ultrium 45TB WORM Data Cartridge | 0 | $198.80 |  |  | NA |  | No | Available | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 09/07/2021 | 12/31/2030 | [TEXT_90] |
| 110 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | Q2017A | Standard | HPE LTO-9 Ultrium RW Bar Code Label Pack | 0 | $92.99 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/07/2021 | 12/31/2030 | [TEXT_71] |
| 111 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | C7972A | Standard | HPE LTO2 Ultrium 400GB RW Data Tape | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/23/2017 | 10/31/2017 | [TEXT_42] |
| 112 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | C7974A | Standard | HPE LTO4 Ultrium 1.6TB Read/Write Data Cartridge | 0 | $58.24 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/23/2017 | 06/30/2022 | [TEXT_91] |
| 113 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | C7974W | Standard | HPE LTO4 Ultrium 1.6TB WORM Data Tape Cartridge | 0 | $41.63 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/23/2017 | 02/29/2024 | [TEXT_92] |
| 114 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | Q2007A | Standard | HPE Ultrium 3 RW Bar Code Label Pack | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/23/2017 | 12/31/2018 | [TEXT_42] |
| 115 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | Q2008A | Standard | HPE Ultrium 3 WORM Bar Code Label Pack | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/23/2017 | 12/31/2018 | [TEXT_42] |
| 116 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | C7972AN | Standard | HPE Ultrium 400GB Non-custom Label 20 Pack | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/23/2017 | 01/01/2018 | [TEXT_42] |
| 117 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | C7973AN | Standard | HPE Ultrium 800GB Non-custom Label 20 Pack | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/23/2017 | 11/01/2018 | [TEXT_42] |
| 118 | Storage Controllers | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Storage Controllers &gt; Storage Media | Storage Controller | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | C7978A | Standard | HPE Ultrium Universal Cleaning Cartridge | 0 | $77.62 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/23/2017 | 11/30/2036 | [TEXT_93] |
| 119 | Software &amp; Licenses | Software | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Software &amp; Licenses &gt; Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Software: no max | TC406A | Standard | HPE StoreEver MSL Command View for Tape Libraries - TapeAssure Advanced LTU | 0 | $2,500.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/23/2017 | 11/30/2028 | [TEXT_94] |
| 120 | Software &amp; Licenses | Software | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Software &amp; Licenses &gt; Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Software: no max | Q8K96A | Standard | HPE StoreEver MSL3040 High Availability LTO-6 Control Path Failover LTU | 0 | $3,000.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/04/2017 | 04/30/2023 | [TEXT_95] |
| 121 | Software &amp; Licenses | Software | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Software &amp; Licenses &gt; Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Software: no max | Q8K97A | Standard | HPE StoreEver MSL3040 High Availability LTO-6 Data Path Failover LTU | 0 | $3,000.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/04/2017 | 04/30/2023 | [TEXT_95] |
| 122 | Software &amp; Licenses | Software | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Software &amp; Licenses &gt; Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Software: no max | Q8K98A | Standard | HPE StoreEver MSL3040 KMIP Key Manager LTU | 0 | $6,000.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/04/2017 | 01/31/2029 | [TEXT_96] |
| 123 | Software &amp; Licenses | Software | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Software &amp; Licenses &gt; Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Software: no max | Q8L00A | Standard | HPE StoreEver MSL3040 LTO-7+ Path Failover LTU | 0 | $6,000.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/04/2017 | 01/31/2029 | [TEXT_96] |
| 124 | Software &amp; Licenses | Software | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Software &amp; Licenses &gt; Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Software: no max | Q8K99A | Standard | HPE StoreEver MSL3040 Secure Manager LTU | 0 | $2,000.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/04/2017 | 01/31/2029 | [TEXT_97] |
| 125 | Accessories &amp; Infrastructure | Accessories &amp; Infrastructure Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Accessories &amp; Infrastructure &gt; Accessories &amp; Infrastructure Options | Option Component | Unlimited | 0 | Unlimited |  | 469776-715 | Standard | HPE Add Generic Packaging Kit | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | [TEXT_98] |


### Chassis Variants

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Product # | Form Factor | Description | Option Type | HPE Recommended | List Price (USD) | Constraint | Start Date | Discontinued Date | Note |
| 2 | Q6Q62C | Unknown | HPE MSL3040 Scalable Base Module | CTO | No | $4,500.00 | min 1, max 1 |  | Unknown | [TEXT_99] |
| 3 | Q2R41A | Unknown | [REMOVED SKU] HPE StoreEver MSL3040 Tape Library Base Module CTO Chassis | CTO | No | $4,500.00 | min 1, max 1 | 2026-09-09 | 2026-11-20 | [TEXT_99] |


### Chassis Options Matrix

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Base SKU | Form Factor | Option Type | HPE Recommended | List Price (USD) | Drive Media Supported | Base Drive Bays | Max Expandability | Power Envelope | Lifecycle Status | Start Date | Discontinued Date | Architectural Rules |
| 2 | Q6Q62C | Unknown | CTO | No | $4,500.00 | UNVERIFIED — variant-specific evidence required | UNVERIFIED — title is not a bay inventory | UNVERIFIED — variant-specific evidence required | UNVERIFIED — variant-specific evidence required | Active |  | Unknown | NOT VERIFIED: do not transfer compatibility or rules between base SKUs without scoped vendor evidence. |
| 3 | Q2R41A | Unknown | CTO | No | $4,500.00 | UNVERIFIED — variant-specific evidence required | UNVERIFIED — title is not a bay inventory | UNVERIFIED — variant-specific evidence required | UNVERIFIED — variant-specific evidence required | Active | 2026-09-09 | 2026-11-20 | NOT VERIFIED: do not transfer compatibility or rules between base SKUs without scoped vendor evidence. |


### Rules &amp; Constraints

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 |
| --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Constraint | Rule Type | Rule Text |
| 2 | Tape Drives | Tape Drives | max 3 | Quantity Constraint | Quantity: max 3 |
| 3 | MSL Options | Encryption Kit | max 999 | Quantity Constraint | Quantity: max 999 |
| 4 | MSL Options | Power Supply | max 1 | Quantity Constraint | Quantity: max 1 |
| 5 | Cables | FibreChannel Cables | max 999 | Quantity Constraint | Quantity: max 999 |
| 6 | Cables | SAS Cables | max 999 | Quantity Constraint | Quantity: max 999 |
| 7 | Expansion Modules | Expansion Modules | max 15 | Quantity Constraint | Quantity: max 15 |
| 8 | Power Cords | Power Cord | Unlimited | Quantity Constraint | Quantity: Unlimited |
| 9 | Storage Media | Storage Media | max 999 | Quantity Constraint | Quantity: max 999 |
| 10 | Software | Software | Unlimited | Quantity Constraint | Quantity: Unlimited |
| 11 | Chassis | Variants | min 1, max 1 — Active OCA CTO chassis | Configuration Rule | Select exactly one currently discoverable, non-TAA/non-GTA CTO base chassis |
| 12 | Storage Controllers | Fibre Channel Host Bus Adapters | max 3 | Configuration Rule | Selection constraint for Fibre Channel Host Bus Adapters: max 3 |
| 13 | MSL Options | Encryption Kit | max 999 | Configuration Rule | Selection constraint for Encryption Kit: max 999 |
| 14 | Power Supplies | Power Supply | max 1 | Configuration Rule | Selection constraint for Power Supply: max 1 |
| 15 | Cables &amp; Enablement Kits | FibreChannel Cables | max 999 | Configuration Rule | Selection constraint for FibreChannel Cables: max 999 |
| 16 | Drive Enclosures / Drives | SAS Cables | max 999 | Configuration Rule | Selection constraint for SAS Cables: max 999 |
| 17 | Drive Enclosures / Drives | SAS Cables | max 999 | Configuration Rule | Supported on LTO-9 SAS Drive (R6Q75A) Only. |
| 18 | Drive Enclosures / Drives | SAS Cables | max 999 | Configuration Rule | 716197-B21 conditional visibility: portal selector activation required (Supported on LTO-9 SAS Drive (R6Q75A) Only.); PORTAL_CONDITIONAL |
| 19 | Drive Enclosures / Drives | SAS Cables | max 999 | Configuration Rule | 716199-B21 conditional visibility: portal selector activation required (Supported on LTO-9 SAS Drive (R6Q75A) Only.); PORTAL_CONDITIONAL |
| 20 | Drive Enclosures / Drives | SAS Cables | max 999 | Configuration Rule | P35176-B21 conditional visibility: portal selector activation required (Supported on LTO-9 SAS Drive (R6Q75A) Only.); PORTAL_CONDITIONAL |
| 21 | Drive Enclosures / Drives | SAS Cables | max 999 | Configuration Rule | P35175-B21 conditional visibility: portal selector activation required (Supported on LTO-9 SAS Drive (R6Q75A) Only.); PORTAL_CONDITIONAL |
| 22 | Cables &amp; Enablement Kits | Power Cord | no max | Configuration Rule | Selection constraint for Power Cord: no max |
| 23 | Storage Controllers | Storage Media | max 999 | Configuration Rule | Selection constraint for Storage Media: max 999 |
| 24 | Software &amp; Licenses | Software | no max | Configuration Rule | Selection constraint for Software: no max |
| 25 | Support Services | Storage Media | max 999 | Configuration Rule | Selection constraint for Storage Media: max 999 |
| 26 | Support Services | Support &amp; Deployment Services | max 8 | Configuration Rule | Selection constraint for OCP3 Networking Adapters: max 8 |
| 27 | Processor | Intel Xeon Scalable Processors | Discontinued | Configuration Rule | [DISCONTINUED] SKU present in previous scrape but removed from active catalog |
| 28 | Chassis | Encryption Kit | Discontinued | Configuration Rule | [DISCONTINUED] SKU present in previous scrape but removed from active catalog |
| 29 | Cables | Configuration Rules | Supported on LTO-9 SAS Drive (R6Q75A) Only. | Learned Feedback Rule | [MUTUAL_EXCLUSION] Supported on LTO-9 SAS Drive (R6Q75A) Only. |


### Unavailable Rules &amp; Gates

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Rule ID | Rule Type | Section | Constraint / Reason | Affected SKU Count | Affected SKUs |
| 2 | RULE_1 | CONDITIONAL_VISIBILITY | Cables | Supported on LTO-9 SAS Drive (R6Q75A) Only. | 4 | 716197-B21, 716199-B21, P35176-B21, P35175-B21 |


### Hardware Accessories

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |
| 2 | Processor | Intel Xeon Scalable Processors | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Processor &gt; Intel Xeon Scalable Processors | Discontinued Hardware | Discontinued | 0 | Discontinued | [DISCONTINUED] SKU present in previous scrape but removed from active catalog | H33XXA5 | Service | [REMOVED SKU] HPE Education - Learning Credits 5Yr SVC | 0 | $100.00 |  | - | $0.00 | - | No | Not published by OCA | Not available (Discontinued) |  | Unpublished | Not published by OCA | Unpublished | Active | 2026-09-09 | 2026-11-20 | {} |
| 3 | Processor | Intel Xeon Scalable Processors | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Processor &gt; Intel Xeon Scalable Processors | Discontinued Hardware | Discontinued | 0 | Discontinued | [DISCONTINUED] SKU present in previous scrape but removed from active catalog | HA0Z0A1 | Service | [REMOVED SKU] HPE DL 1Yr Other 1GB Content Hosted SVC | 0 | $1,620.00 |  | - | $0.00 | - | No | Not published by OCA | Not available (Discontinued) |  | Unpublished | Not published by OCA | Unpublished | Active | 2026-09-09 | 2026-11-20 | {} |
| 4 | Processor | Intel Xeon Scalable Processors | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Processor &gt; Intel Xeon Scalable Processors | Discontinued Hardware | Discontinued | 0 | Discontinued | [DISCONTINUED] SKU present in previous scrape but removed from active catalog | HR2R4A1 | Service | [REMOVED SKU] HPE Digital Learner Bronze 1Yr Subs SVC | 0 | $4,000.00 |  | - | $0.00 | - | No | Not published by OCA | Not available (Discontinued) |  | Unpublished | Not published by OCA | Unpublished | Active | 2026-09-09 | 2026-11-20 | {} |
| 5 | Processor | Intel Xeon Scalable Processors | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Processor &gt; Intel Xeon Scalable Processors | Discontinued Hardware | Discontinued | 0 | Discontinued | [DISCONTINUED] SKU present in previous scrape but removed from active catalog | HR2R5A1 | Service | [REMOVED SKU] HPE Digital Learner Silver 1Yr Subs SVC | 0 | $5,000.00 |  | - | $0.00 | - | No | Not published by OCA | Not available (Discontinued) |  | Unpublished | Not published by OCA | Unpublished | Active | 2026-09-09 | 2026-11-20 | {} |
| 6 | Processor | Intel Xeon Scalable Processors | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Processor &gt; Intel Xeon Scalable Processors | Discontinued Hardware | Discontinued | 0 | Discontinued | [DISCONTINUED] SKU present in previous scrape but removed from active catalog | HR2R6A1 | Service | [REMOVED SKU] HPE Digital Learner Gold 1Yr Subs SVC | 0 | $8,000.00 |  | - | $0.00 | - | No | Not published by OCA | Not available (Discontinued) |  | Unpublished | Not published by OCA | Unpublished | Active | 2026-09-09 | 2026-11-20 | {} |
| 7 | Processor | Intel Xeon Scalable Processors | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Processor &gt; Intel Xeon Scalable Processors | Discontinued Hardware | Discontinued | 0 | Discontinued | [DISCONTINUED] SKU present in previous scrape but removed from active catalog | HV9V8A1 | Service | [REMOVED SKU] HPE Digital Learner SMB 1Yr Subs SVC | 0 | $1,300.00 |  | - | $0.00 | - | No | Not published by OCA | Not available (Discontinued) |  | Unpublished | Not published by OCA | Unpublished | Active | 2026-09-09 | 2026-11-20 | {} |
| 8 | Chassis | Encryption Kit | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Chassis &gt; Encryption Kit | Discontinued Hardware | Discontinued | 0 | Discontinued | [DISCONTINUED] SKU present in previous scrape but removed from active catalog | H4F42A1 | CTO | [REMOVED SKU] HPE Factory Express Complex Unit of SVC | 0 | $1,850.00 |  | - | $0.00 | - | No | Not published by OCA | Not available (Discontinued) |  | Unpublished | Not published by OCA | Unpublished | Active | 2026-09-09 | 2026-11-20 | {} |
| 9 | Chassis | Encryption Kit | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Chassis &gt; Encryption Kit | Discontinued Hardware | Discontinued | 0 | Discontinued | [DISCONTINUED] SKU present in previous scrape but removed from active catalog | H7M73A1 | CTO | [REMOVED SKU] HPE Factory Express 3PAR OS Backrev SVC | 0 | $1,575.00 |  | - | $0.00 | - | No | Not published by OCA | Not available (Discontinued) |  | Unpublished | Not published by OCA | Unpublished | Active | 2026-09-09 | 2026-11-20 | {} |
| 10 | Chassis | Encryption Kit | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Chassis &gt; Encryption Kit | Discontinued Hardware | Discontinued | 0 | Discontinued | [DISCONTINUED] SKU present in previous scrape but removed from active catalog | HA840A1 | CTO | [REMOVED SKU] HPE Supplied Asset Tag Service | 0 | $15.00 |  | - | $0.00 | - | No | Not published by OCA | Not available (Discontinued) |  | Unpublished | Not published by OCA | Unpublished | Active | 2026-09-09 | 2026-11-20 | {} |
| 11 | Chassis | Encryption Kit | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Chassis &gt; Encryption Kit | Discontinued Hardware | Discontinued | 0 | Discontinued | [DISCONTINUED] SKU present in previous scrape but removed from active catalog | HA841A1 | CTO | [REMOVED SKU] HPE Customer Supplied Asset Tag Service | 0 | $26.00 |  | - | $0.00 | - | No | Not published by OCA | Not available (Discontinued) |  | Unpublished | Not published by OCA | Unpublished | Active | 2026-09-09 | 2026-11-20 | {} |
| 12 | Chassis | Encryption Kit | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Chassis &gt; Encryption Kit | Discontinued Hardware | Discontinued | 0 | Discontinued | [DISCONTINUED] SKU present in previous scrape but removed from active catalog | HA861A1 | CTO | [REMOVED SKU] HPE FE Personalized Install SVC | 0 | $2,105.00 |  | - | $0.00 | - | No | Not published by OCA | Not available (Discontinued) |  | Unpublished | Not published by OCA | Unpublished | Active | 2026-09-09 | 2026-11-20 | {} |
| 13 | Chassis | Encryption Kit | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Chassis &gt; Encryption Kit | Discontinued Hardware | Discontinued | 0 | Discontinued | [DISCONTINUED] SKU present in previous scrape but removed from active catalog | HA875A1 | CTO | [REMOVED SKU] HPE Special Factory Service | 0 | $1.00 |  | - | $0.00 | - | No | Not published by OCA | Not available (Discontinued) |  | Unpublished | Not published by OCA | Unpublished | Active | 2026-09-09 | 2026-11-20 | {} |
| 14 | Chassis | Encryption Kit | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Chassis &gt; Encryption Kit | Discontinued Hardware | Discontinued | 0 | Discontinued | [DISCONTINUED] SKU present in previous scrape but removed from active catalog | HU7D3A1 | CTO | [REMOVED SKU] HPE FE OEM Customization UOS SVC | 0 | $65.00 |  | - | $0.00 | - | No | Not published by OCA | Not available (Discontinued) |  | Unpublished | Not published by OCA | Unpublished | Active | 2026-09-09 | 2026-11-20 | {} |


### Software &amp; Licenses

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |
| 8 | Software &amp; Licenses | Software | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Software &amp; Licenses &gt; Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Software: no max | TC406AAE | Service | HPE StoreEver MSL Command View for Tape Libraries - TapeAssure Advanced E-LTU | 0 | $2,500.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/23/2017 | 11/30/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":2500,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 9 | Software &amp; Licenses | Software | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Software &amp; Licenses &gt; Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Software: no max | Q8K43AAE | Service | HPE StoreEver MSL3040 Command View for Tape Libraries - Data Verification 100 Cartridges E-LTU | 1 | $1,750.00 |  |  | $1,750.00 |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/04/2017 | 01/31/2029 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":1750,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 10 | Software &amp; Licenses | Software | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Software &amp; Licenses &gt; Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Software: no max | Q8K96AAE | Service | HPE StoreEver MSL3040 High Availability LTO-6 Control Path Failover E-LTU | 0 | $3,000.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/04/2017 | 05/02/2024 | [TEXT_100] |
| 11 | Software &amp; Licenses | Software | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Software &amp; Licenses &gt; Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Software: no max | Q8K97AAE | Service | HPE StoreEver MSL3040 High Availability LTO-6 Data Path Failover E-LTU | 0 | $3,000.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/04/2017 | 05/02/2024 | [TEXT_100] |
| 12 | Software &amp; Licenses | Software | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Software &amp; Licenses &gt; Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Software: no max | Q8K98AAE | Service | HPE StoreEver MSL3040 KMIP Key Manager E-LTU | 0 | $6,000.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/04/2017 | 11/30/2028 | [TEXT_101] |
| 13 | Software &amp; Licenses | Software | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Software &amp; Licenses &gt; Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Software: no max | Q8L00AAE | Service | HPE StoreEver MSL3040 LTO-7+ Path Failover E-LTU | 0 | $6,000.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/04/2017 | 11/30/2028 | [TEXT_101] |
| 14 | Software &amp; Licenses | Software | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Software &amp; Licenses &gt; Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Software: no max | Q8K99AAE | Service | HPE StoreEver MSL3040 Secure Manager E-LTU | 0 | $2,000.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/04/2017 | 11/30/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":2000,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |

Row 2: identical to sheet All SKUs, row 119.
Row 3: identical to sheet All SKUs, row 120.
Row 4: identical to sheet All SKUs, row 121.
Row 5: identical to sheet All SKUs, row 122.
Row 6: identical to sheet All SKUs, row 123.
Row 7: identical to sheet All SKUs, row 124.

### Support Services

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |
| 2 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | HA849A1 | Service | HPE Product and Package Labeling Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"HA849A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 3 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H29BWA1 | Service | HPE FE Tamper Evident Pack Overpack SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H29BWA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 4 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H29BXA1 | Service | HPE FE Tamper Evident Pack UoS SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H29BXA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 5 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | HA838A1 | Service | HPE Hardware Customization Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"HA838A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 6 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | HA867A1 | Service | HPE Standard Product Reporting Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"HA867A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 7 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | HA868A1 | Service | HPE Enhanced Product Reporting Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"HA868A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 8 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | HC790A | Service | HPE Integration Center Routing Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"HC790A","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 9 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | ZU706A | Standard | HPE Server Customization Package | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"ZU706A","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"} |
| 10 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H4F41A1 | Service | HPE Factory Express Standard Unit of SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H4F41A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 11 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Discontinued Hardware | Unlimited | 0 | Unlimited |  | AG467A | Standard | [REMOVED SKU] HPE Medium Standard Delivery-Door/Dock Service | 0 | $1.00 |  | - | $0.00 | - | No | Not published by OCA | Not available (Discontinued) |  | Unpublished | Not published by OCA | Unpublished | Active | 2026-11-20 | 2026-11-20 | {} |
| 12 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Discontinued Hardware | Unlimited | 0 | Unlimited |  | P1F70A | Standard | [REMOVED SKU] HPE Forklift at Delivery Service | 0 | $1,399.00 |  | - | $0.00 | - | No | Not published by OCA | Not available (Discontinued) |  | Unpublished | Not published by OCA | Unpublished | Active | 2026-11-20 | 2026-11-20 | {} |
| 13 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Discontinued Hardware | Unlimited | 0 | Unlimited |  | P1F72A | Standard | [REMOVED SKU] HPE Two People at Delivery SVC | 0 | $466.00 |  | - | $0.00 | - | No | Not published by OCA | Not available (Discontinued) |  | Unpublished | Not published by OCA | Unpublished | Active | 2026-11-20 | 2026-11-20 | {} |
| 14 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Discontinued Hardware | Unlimited | 0 | Unlimited |  | P1F73A | Standard | [REMOVED SKU] HPE Campus Delivery Service | 0 | $104.00 |  | - | $0.00 | - | No | Not published by OCA | Not available (Discontinued) |  | Unpublished | Not published by OCA | Unpublished | Active | 2026-11-20 | 2026-11-20 | {} |
| 15 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H0JT1A1 | Service | HPE NSS Improvement Unit of Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JT1A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"} |
| 16 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H36NRA4 | Service | HPE Zerto Virtual TAM 4yr 8x5 Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NRA4","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 17 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H36NRA5 | Service | HPE Zerto Virtual TAM 5yr 8x5 Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NRA5","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 18 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H36NSA1 | Service | HPE Zerto Health Check per Site SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NSA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 19 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H36NTA1 | Service | HPE Zerto Custom UoS SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NTA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 20 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H39VQA1#V0F | Service | HPE Synergy First Frame Rmt Str SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H39VQA1#V0F","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 21 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H42ZHA1 | Service | HPE Perf Analysis Comp Option1 Rmt1 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H42ZHA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 22 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H42ZJA1 | Service | HPE Perf Analysis Comp Option2 Rmt1 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H42ZJA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 23 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H42ZKA1 | Service | HPE Perf Analysis Comp Option3 Rmt1 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H42ZKA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 24 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H42ZLA1 | Service | HPE Perf Analysis DB Option1 Rmt1 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H42ZLA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 25 | Support Services | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; Storage Media | Service &amp; Support | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | H0JT2A1 | Service | HPE NSS Implementation Unit of Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JT2A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"} |
| 26 | Support Services | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; Storage Media | Service &amp; Support | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | H29BRA1 | Service | HPE Cray Team Day SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H29BRA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 27 | Support Services | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; Storage Media | Service &amp; Support | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | H29BSA1 | Service | HPE Storage Servers Install Hourly SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H29BSA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 28 | Support Services | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; Storage Media | Service &amp; Support | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | H36NLA1 | Service | HPE Zerto Quick Cloud Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NLA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 29 | Support Services | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; Storage Media | Service &amp; Support | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | H36NMA1 | Service | HPE Zerto Quick Start Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NMA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 30 | Support Services | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; Storage Media | Service &amp; Support | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | H36NNA1 | Service | HPE Zerto Quick Migration Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NNA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 31 | Support Services | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; Storage Media | Service &amp; Support | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | H36NPA1 | Service | HPE Zerto Quick Advisor Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NPA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 32 | Support Services | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; Storage Media | Service &amp; Support | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | H36NQA1 | Service | HPE Zerto Strutd TAM 1yr 12x5 Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NQA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 33 | Support Services | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; Storage Media | Service &amp; Support | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | H36NQA3 | Service | HPE Zerto Strutd TAM 3yr 12x5 Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NQA3","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 34 | Support Services | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; Storage Media | Service &amp; Support | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | H36NQA4 | Service | HPE Zerto Strutd TAM 4yr 12x5 Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NQA4","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 35 | Support Services | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; Storage Media | Discontinued Hardware | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | H36VWA1 | Service | [REMOVED SKU] HPE Storage VM Migration 50 VM SVC | 0 | $17,520.00 |  | - | $0.00 | - | No | Not published by OCA | Not available (Discontinued) |  | Unpublished | Not published by OCA | Unpublished | Active | 2026-09-09 | 2026-11-20 | {} |
| 36 | Support Services | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; Storage Media | Discontinued Hardware | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | H36VXA1 | Service | [REMOVED SKU] HPE Storage VM Migration 150 VM SVC | 0 | $29,760.00 |  | - | $0.00 | - | No | Not published by OCA | Not available (Discontinued) |  | Unpublished | Not published by OCA | Unpublished | Active | 2026-09-09 | 2026-11-20 | {} |
| 37 | Support Services | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; Storage Media | Discontinued Hardware | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | H36WBA1 | Service | [REMOVED SKU] HPE Storage VM Migration 5 VM Zerto SVC | 0 | $7,140.00 |  | - | $0.00 | - | No | Not published by OCA | Not available (Discontinued) |  | Unpublished | Not published by OCA | Unpublished | Active | 2026-09-09 | 2026-11-20 | {} |
| 38 | Support Services | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; Storage Media | Discontinued Hardware | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | H36WNA1 | Service | [REMOVED SKU] HPE AI Soltns and Platfrms 5 Day Rem SVC | 0 | $13,800.00 |  | - | $0.00 | - | No | Not published by OCA | Not available (Discontinued) |  | Unpublished | Not published by OCA | Unpublished | Active | 2026-09-09 | 2026-11-20 | {} |
| 39 | Support Services | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; Storage Media | Discontinued Hardware | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | H36WMA1 | Service | [REMOVED SKU] HPE AI Solns and Pltfrms 5 Day Onste SVC | 0 | $23,400.00 |  | - | $0.00 | - | No | Not published by OCA | Not available (Discontinued) |  | Unpublished | Not published by OCA | Unpublished | Active | 2026-09-09 | 2026-11-20 | {} |
| 40 | Support Services | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; Storage Media | Discontinued Hardware | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | H36WQA1 | Service | [REMOVED SKU] HPE AI Soltns and Platfrms 1 Day Rem SVC | 0 | $2,760.00 |  | - | $0.00 | - | No | Not published by OCA | Not available (Discontinued) |  | Unpublished | Not published by OCA | Unpublished | Active | 2026-09-09 | 2026-11-20 | {} |
| 41 | Support Services | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; Storage Media | Discontinued Hardware | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | H46RMA1 | Service | [REMOVED SKU] HPE Data and AI Security 5 Day Rem SVC | 0 | $9,000.00 |  | - | $0.00 | - | No | Not published by OCA | Not available (Discontinued) |  | Unpublished | Not published by OCA | Unpublished | Active | 2026-09-09 | 2026-11-20 | {} |
| 42 | Support Services | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; Storage Media | Discontinued Hardware | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | H46RNA1 | Service | [REMOVED SKU] HPE Data and AI Security 5 Day Onste SVC | 0 | $18,540.00 |  | - | $0.00 | - | No | Not published by OCA | Not available (Discontinued) |  | Unpublished | Not published by OCA | Unpublished | Active | 2026-09-09 | 2026-11-20 | {} |
| 43 | Support Services | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; Storage Media | Discontinued Hardware | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | H46RLA1 | Service | [REMOVED SKU] HPE Data and AI Security 1 Day Rem SVC | 0 | $2,640.00 |  | - | $0.00 | - | No | Not published by OCA | Not available (Discontinued) |  | Unpublished | Not published by OCA | Unpublished | Active | 2026-09-09 | 2026-11-20 | {} |
| 44 | Support Services | Storage Media | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; Storage Media | Discontinued Hardware | max 999 | 0 | 999 | Selection constraint for Storage Media: max 999 | H57FDA1 | Service | [REMOVED SKU] HPE Data Sltn and Pltfrms 5 Day Rem SVC | 0 | $13,800.00 |  | - | $0.00 | - | No | Not published by OCA | Not available (Discontinued) |  | Unpublished | Not published by OCA | Unpublished | Active | 2026-09-09 | 2026-11-20 | {} |
| 45 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | AG629A | Standard | HPE Consolidated Delivery Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"AG629A","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"} |
| 46 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | P1F75A | Standard | HPE Fixed Delivery Appointment Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"P1F75A","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"} |
| 47 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | P1F74A | Standard | HPE Unloading Logistic Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"P1F74A","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"} |
| 48 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | P1F76A | Standard | HPE Pre-Delivery Site Survey SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"P1F76A","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 49 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | P1F79A | Standard | HPE Delivery Any Day at 1300 Hours Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"P1F79A","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"} |
| 50 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | P1F78A | Standard | HPE Delivery Any Day at 0800 Hours Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"P1F78A","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"} |
| 51 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | P1F69A | Standard | HPE Delivery Site Above Ground Floor Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"P1F69A","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"} |
| 52 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | P1F80A | Standard | HPE Delivery Any Day at 1000 Hours Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"P1F80A","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"} |
| 53 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | P1F82A | Standard | HPE Delivery Any Day at 1500 Hours Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"P1F82A","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"} |
| 54 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | P1F71A | Standard | HPE Special Delivery Truck Size Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"P1F71A","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"} |
| 55 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | BQ337A | Standard | HPE Expedite Shipment Large Logistic Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"BQ337A","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"} |
| 56 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | BQ335A | Standard | HPE Expedite Shipment Small Logistic Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"BQ335A","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"} |
| 57 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | AG628A | Standard | HPE Special Equipment Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"AG628A","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"} |
| 58 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H0JD1A1 | Service | HPE Data Migration Readiness Assess Svc | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD1A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 59 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H0JD7A1 | Service | HPE Quickstart File Data Mig10TB SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD7A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 60 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H1Y26A1#002 | Service | HPE Energy Efficiency Analysis SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H1Y26A1#002","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 61 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H1Y26A1#003 | Service | HPE Infra Condition and Cap Analysis SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H1Y26A1#003","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 62 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H30RYA1 | Service | HPE Container Adopt Ph2 Redht Onsite SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H30RYA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 63 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H30SDA1 | Service | HPE Container Adopt Ph1 Anths Onsite SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H30SDA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 64 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H30SFA1 | Service | HPE Container Adopt Ph2 Anths Rem SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H30SFA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 65 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H30SGA1 | Service | HPE Container Adopt Ph2 Anths Onsite SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H30SGA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 66 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H30SHA1 | Service | HPE Container Adopt Ph3 Anths Rem SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H30SHA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 67 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H30SJA1 | Service | HPE Container Adopt Ph3 Anths Onsite SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H30SJA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 68 | Support Services | Support &amp; Deployment Services | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; Support &amp; Deployment Services | Service &amp; Support | max 8 | 0 | 8 | Selection constraint for OCP3 Networking Adapters: max 8 | H36NVA1 | Service | HPE Zerto Quick Upgrade Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NVA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 69 | Support Services | Support &amp; Deployment Services | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; Support &amp; Deployment Services | Service &amp; Support | max 8 | 0 | 8 | Selection constraint for OCP3 Networking Adapters: max 8 | H36XCA1#006 | Service | HPE GPU on RHOCP Integrat SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36XCA1#006","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 70 | Support Services | Support &amp; Deployment Services | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; Support &amp; Deployment Services | Service &amp; Support | max 8 | 0 | 8 | Selection constraint for OCP3 Networking Adapters: max 8 | H57GHA1 | Service | HPE Education 5 Day Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H57GHA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 71 | Support Services | Support &amp; Deployment Services | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; Support &amp; Deployment Services | Service &amp; Support | max 8 | 0 | 8 | Selection constraint for OCP3 Networking Adapters: max 8 | H57GJA1 | Service | HPE Education 5 Day Onsite SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H57GJA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 72 | Support Services | Support &amp; Deployment Services | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; Support &amp; Deployment Services | Service &amp; Support | max 8 | 0 | 8 | Selection constraint for OCP3 Networking Adapters: max 8 | H57GKA1 | Service | HPE Education 1 Day Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H57GKA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 73 | Support Services | Support &amp; Deployment Services | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; Support &amp; Deployment Services | Service &amp; Support | max 8 | 0 | 8 | Selection constraint for OCP3 Networking Adapters: max 8 | HV9X1A1#001 | Service | HPE Multi-Cloud Mgmt Adoption Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"HV9X1A1#001","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 74 | Support Services | Support &amp; Deployment Services | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; Support &amp; Deployment Services | Service &amp; Support | max 8 | 0 | 8 | Selection constraint for OCP3 Networking Adapters: max 8 | H33XSA1 | Service | HPE Education - Learning Credits 1Yr SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H33XSA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 75 | Support Services | Support &amp; Deployment Services | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; Support &amp; Deployment Services | Service &amp; Support | max 8 | 0 | 8 | Selection constraint for OCP3 Networking Adapters: max 8 | H33XTA2 | Service | HPE Education - Learning Credits 2Yr SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H33XTA2","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 76 | Support Services | Support &amp; Deployment Services | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; Support &amp; Deployment Services | Service &amp; Support | max 8 | 0 | 8 | Selection constraint for OCP3 Networking Adapters: max 8 | H33XVA3 | Service | HPE Education - Learning Credits 3Yr SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H33XVA3","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 77 | Support Services | Support &amp; Deployment Services | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; Support &amp; Deployment Services | Service &amp; Support | max 8 | 0 | 8 | Selection constraint for OCP3 Networking Adapters: max 8 | H33XWA4 | Service | HPE Education - Learning Credits 4Yr SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H33XWA4","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 78 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H0JD9A1 | Service | HPE File Data Migration 100TB SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD9A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 79 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H1WU9A1 | Service | HPE Scality Integration Basic SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H1WU9A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 80 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H1WV0A1 | Service | HPE Scality Integration Advanced SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H1WV0A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 81 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H1XF9A1 | Service | HPE Risk Assessment 10 Functions SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H1XF9A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 82 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H1XG0A1 | Service | HPE Business Imp Anlys 15 Process SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H1XG0A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 83 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H1XG7A1 | Service | HPE AI Video Analytics Assessment SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H1XG7A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 84 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H1Y25A1#002 | Service | HPE Energy Efficiency Analysis SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H1Y25A1#002","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 85 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H1Y25A1#003 | Service | HPE Infra Condition and Cap Analysis SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H1Y25A1#003","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 86 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H2S79A1 | Service | HPE Remot NW Conf and IntHr BusHrs SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H2S79A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 87 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H2S81A1 | Service | HPE Onsite NW Conf and Int Bus Hrs SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H2S81A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 88 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H29BQA1 | Service | HPE Cray Custom Operations SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H29BQA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 89 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H30SBA1 | Service | HPE Container Adopt Ph3 Redht Onsite SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H30SBA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 90 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H30SCA1 | Service | HPE Container Adopt Ph1 Anths Rem SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H30SCA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 91 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H30SLA1 | Service | HPE Container Adopt Ph1 Rnchr Onsite SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H30SLA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 92 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H30SMA1 | Service | HPE Container Adopt Ph2 Rnchr Rem SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H30SMA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 93 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H30SNA1 | Service | HPE Container Adopt Ph2 Rnchr Onsite SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H30SNA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 94 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H36NRA3 | Service | HPE Zerto Virtual TAM 3yr 8x5 Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NRA3","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 95 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H36PBA1 | Service | HPE Zerto Virtual TAM 1mo 8x5 Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36PBA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 96 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H36PCA1 | Service | HPE Zerto Virtual TAM 3mo 8x5 Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36PCA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 97 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H36PDA1 | Service | HPE Zerto Virtual TAM 6mo 8x5 Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36PDA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 98 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | HA124A1#V5K | Service | HPE Private Cloud AI with X10000 St SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"HA124A1#V5K","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 99 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H42ZQA1 | Service | HPE Perf Analysis SAP Option2 Rmt1 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H42ZQA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 100 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H42ZRA1 | Service | HPE Perf Analysis SAP Option3 Rmt1 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H42ZRA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 101 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H43BCA1 | Service | HPE Priv Cloud AI Deployment SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H43BCA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 102 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H44MDA1 | Service | HPE Data Sanitization HPC T1 NSH SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H44MDA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 103 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H44NJA1 | Service | HPE Compute Firmware Onsite SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H44NJA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 104 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | HU7D2A1 | Service | HPE Synergy Ecosystem Health Review SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"HU7D2A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 105 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H0JD4A1#WFH | Service | HPE 1Y Service Credits Qty 10 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD4A1#WFH","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 106 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H0JD4A1#WFK | Service | HPE 1Y Service Credits Qty 10 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD4A1#WFK","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 107 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H0JD4A1#WFM | Service | HPE 1Y Service Credits Qty 10 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD4A1#WFM","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 108 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H0JD4A1#Y65 | Service | HPE 1Y Service Credits Qty 10 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD4A1#Y65","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 109 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H0JD4A1#Y6B | Service | HPE 1Y Service Credits Qty 10 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD4A1#Y6B","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 110 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H0JD4A1008E | Service | HPE 1Y Service Credits Qty 10 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD4A1008E","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 111 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H0JD4A10BK5 | Service | HPE 1Y Service Credits Qty 10 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD4A10BK5","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 112 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H0JD4A3#WFH | Service | HPE 3Y Service Credits Qty 30 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD4A3#WFH","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 113 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H0JD4A3#WFK | Service | HPE 3Y Service Credits Qty 30 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD4A3#WFK","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 114 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H0JD4A3#WFM | Service | HPE 3Y Service Credits Qty 30 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD4A3#WFM","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 115 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H56JTA3#Y34 | Service | HPE 3Y CC - HPC AI Perf Optimization SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H56JTA3#Y34","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 116 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H56JTA4#Y34 | Service | HPE 4Y CC - HPC AI Perf Optimization SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H56JTA4#Y34","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 117 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H56JTA5#Y34 | Service | HPE 5Y CC - HPC AI Perf Optimization SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H56JTA5#Y34","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 118 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H39DJA3#Y35 | Service | HPE 3Y CC SB ATS Compute Base SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H39DJA3#Y35","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 119 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H39DJA4#Y35 | Service | HPE 4Y CC SB ATS Compute Base SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H39DJA4#Y35","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 120 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H39DJA5#Y35 | Service | HPE 5Y CC SB ATS Compute Base SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H39DJA5#Y35","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 121 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H39DKA3#Y35 | Service | HPE 3Y CC SB ATS Compute Ext SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H39DKA3#Y35","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 122 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H39DKA4#Y35 | Service | HPE 4Y CC SB ATS Compute Ext SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H39DKA4#Y35","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 123 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H39DKA5#Y35 | Service | HPE 5Y CC SB ATS Compute Ext SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H39DKA5#Y35","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 124 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H39DLA3#Y36 | Service | HPE 3Y CC SB ATS Storage Base SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H39DLA3#Y36","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 125 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H46SGA3 | Service | HPE 3Y AL STG Block Pro-SAM T1 Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H46SGA3","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 126 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H46SGA4 | Service | HPE 4Y AL STG Block Pro-SAM T1 Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H46SGA4","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 127 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H46SGA5 | Service | HPE 5Y AL STG Block Pro-SAM T1 Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H46SGA5","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 128 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H46SHA3 | Service | HPE 3Y AL STG Block Pro-SAM T2 Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H46SHA3","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 129 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H46SHA4 | Service | HPE 4Y AL STG Block Pro-SAM T2 Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H46SHA4","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 130 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H46SHA5 | Service | HPE 5Y AL STG Block Pro-SAM T2 Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H46SHA5","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 131 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H46SJA3 | Service | HPE 3Y AL STG File/Object Pro-SAM T1 Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H46SJA3","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 132 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H46SJA4 | Service | HPE 4Y AL STG File/Object Pro-SAM T1 Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H46SJA4","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 133 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H46SJA5 | Service | HPE 5Y AL STG File/Object Pro-SAM T1 Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H46SJA5","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 134 | Support Services | System Options | HPE OCA &gt; MSL3040 Tape [Q6Q62C] &gt; Support Services &gt; System Options | Service &amp; Support | Unlimited | 0 | Unlimited |  | H46SKA3 | Service | HPE 3Y AL STG File/Object Pro-SAM T2 Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H46SKA3","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |


### Power Supplies

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 13.

### Chassis

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 2.
Row 3: identical to sheet All SKUs, row 3.

### Storage Controllers

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 4.
Row 3: identical to sheet All SKUs, row 5.
Row 4: identical to sheet All SKUs, row 6.
Row 5: identical to sheet All SKUs, row 7.
Row 6: identical to sheet All SKUs, row 8.
Row 7: identical to sheet All SKUs, row 9.
Row 8: identical to sheet All SKUs, row 10.
Row 9: identical to sheet All SKUs, row 11.
Row 10: identical to sheet All SKUs, row 55.
Row 11: identical to sheet All SKUs, row 56.
Row 12: identical to sheet All SKUs, row 57.
Row 13: identical to sheet All SKUs, row 58.
Row 14: identical to sheet All SKUs, row 59.
Row 15: identical to sheet All SKUs, row 60.
Row 16: identical to sheet All SKUs, row 61.
Row 17: identical to sheet All SKUs, row 62.
Row 18: identical to sheet All SKUs, row 63.
Row 19: identical to sheet All SKUs, row 64.
Row 20: identical to sheet All SKUs, row 65.
Row 21: identical to sheet All SKUs, row 66.
Row 22: identical to sheet All SKUs, row 67.
Row 23: identical to sheet All SKUs, row 68.
Row 24: identical to sheet All SKUs, row 69.
Row 25: identical to sheet All SKUs, row 70.
Row 26: identical to sheet All SKUs, row 71.
Row 27: identical to sheet All SKUs, row 72.
Row 28: identical to sheet All SKUs, row 73.
Row 29: identical to sheet All SKUs, row 74.
Row 30: identical to sheet All SKUs, row 75.
Row 31: identical to sheet All SKUs, row 76.
Row 32: identical to sheet All SKUs, row 77.
Row 33: identical to sheet All SKUs, row 78.
Row 34: identical to sheet All SKUs, row 79.
Row 35: identical to sheet All SKUs, row 80.
Row 36: identical to sheet All SKUs, row 81.
Row 37: identical to sheet All SKUs, row 82.
Row 38: identical to sheet All SKUs, row 83.
Row 39: identical to sheet All SKUs, row 84.
Row 40: identical to sheet All SKUs, row 85.
Row 41: identical to sheet All SKUs, row 86.
Row 42: identical to sheet All SKUs, row 87.
Row 43: identical to sheet All SKUs, row 88.
Row 44: identical to sheet All SKUs, row 89.
Row 45: identical to sheet All SKUs, row 90.
Row 46: identical to sheet All SKUs, row 91.
Row 47: identical to sheet All SKUs, row 92.
Row 48: identical to sheet All SKUs, row 93.
Row 49: identical to sheet All SKUs, row 94.
Row 50: identical to sheet All SKUs, row 95.
Row 51: identical to sheet All SKUs, row 96.
Row 52: identical to sheet All SKUs, row 97.
Row 53: identical to sheet All SKUs, row 98.
Row 54: identical to sheet All SKUs, row 99.
Row 55: identical to sheet All SKUs, row 100.
Row 56: identical to sheet All SKUs, row 101.
Row 57: identical to sheet All SKUs, row 102.
Row 58: identical to sheet All SKUs, row 103.
Row 59: identical to sheet All SKUs, row 104.
Row 60: identical to sheet All SKUs, row 105.
Row 61: identical to sheet All SKUs, row 106.
Row 62: identical to sheet All SKUs, row 107.
Row 63: identical to sheet All SKUs, row 108.
Row 64: identical to sheet All SKUs, row 109.
Row 65: identical to sheet All SKUs, row 110.
Row 66: identical to sheet All SKUs, row 111.
Row 67: identical to sheet All SKUs, row 112.
Row 68: identical to sheet All SKUs, row 113.
Row 69: identical to sheet All SKUs, row 114.
Row 70: identical to sheet All SKUs, row 115.
Row 71: identical to sheet All SKUs, row 116.
Row 72: identical to sheet All SKUs, row 117.
Row 73: identical to sheet All SKUs, row 118.

### MSL Options

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 12.

### Cables &amp; Enablement Kits

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 14.
Row 3: identical to sheet All SKUs, row 15.
Row 4: identical to sheet All SKUs, row 16.
Row 5: identical to sheet All SKUs, row 17.
Row 6: identical to sheet All SKUs, row 18.
Row 7: identical to sheet All SKUs, row 19.
Row 8: identical to sheet All SKUs, row 20.
Row 9: identical to sheet All SKUs, row 21.
Row 10: identical to sheet All SKUs, row 22.
Row 11: identical to sheet All SKUs, row 23.
Row 12: identical to sheet All SKUs, row 37.
Row 13: identical to sheet All SKUs, row 38.
Row 14: identical to sheet All SKUs, row 39.
Row 15: identical to sheet All SKUs, row 40.
Row 16: identical to sheet All SKUs, row 41.
Row 17: identical to sheet All SKUs, row 42.
Row 18: identical to sheet All SKUs, row 43.
Row 19: identical to sheet All SKUs, row 44.
Row 20: identical to sheet All SKUs, row 45.
Row 21: identical to sheet All SKUs, row 46.
Row 22: identical to sheet All SKUs, row 47.
Row 23: identical to sheet All SKUs, row 48.
Row 24: identical to sheet All SKUs, row 49.
Row 25: identical to sheet All SKUs, row 50.
Row 26: identical to sheet All SKUs, row 51.
Row 27: identical to sheet All SKUs, row 52.
Row 28: identical to sheet All SKUs, row 53.
Row 29: identical to sheet All SKUs, row 54.

### Drive Enclosures  Drives

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 24.
Row 3: identical to sheet All SKUs, row 25.
Row 4: identical to sheet All SKUs, row 26.
Row 5: identical to sheet All SKUs, row 27.
Row 6: identical to sheet All SKUs, row 28.
Row 7: identical to sheet All SKUs, row 29.
Row 8: identical to sheet All SKUs, row 30.
Row 9: identical to sheet All SKUs, row 31.
Row 10: identical to sheet All SKUs, row 32.
Row 11: identical to sheet All SKUs, row 33.
Row 12: identical to sheet All SKUs, row 34.
Row 13: identical to sheet All SKUs, row 35.
Row 14: identical to sheet All SKUs, row 36.

### Accessories &amp; Infrastructure

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 125.

### Discontinued SKUs

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Product # | Description | Main Category | Sub-Category | Status | First Seen Date | Discontinued Date | Reinstated Date | Days Active | Last Known Price | Full Price Trail | Tracking State | Retention Class | Business Relevant | Reason |
| 2 | Q2R41A | HPE StoreEver MSL3040 Tape Library Base Module CTO Chassis | Chassis | Variants | DISCONTINUED | 2026-09-09 | 2026-11-20 |  | 72 | $4,500.00 | 2026-09-09: $4500.00 → 2026-11-20: $4500.00 (✕ REMOVED) | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE | No | Removed from active HPE OCA portal catalog |
| 3 | AM495A | 2,500.00 | Accessories &amp; Infrastructure | Encryption Kit | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 4 | Q6Q64A | 780.00 | Power Supplies | Power Supply | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 5 | AJ838A | 208.00 | Cables &amp; Enablement Kits | FibreChannel Cables | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 6 | AJ836A | 115.00 | Cables &amp; Enablement Kits | FibreChannel Cables | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 7 | AJ839A | 253.00 | Cables &amp; Enablement Kits | FibreChannel Cables | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 8 | QK732A | 115.00 | Cables &amp; Enablement Kits | FibreChannel Cables | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 9 | QK737A | 415.00 | Cables &amp; Enablement Kits | FibreChannel Cables | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 10 | AJ837A | 162.00 | Cables &amp; Enablement Kits | FibreChannel Cables | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 11 | QK735A | 195.00 | Cables &amp; Enablement Kits | FibreChannel Cables | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 12 | QK733A | 130.00 | Cables &amp; Enablement Kits | FibreChannel Cables | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 13 | QK736A | 239.00 | Cables &amp; Enablement Kits | FibreChannel Cables | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 14 | QK734A | 147.00 | Cables &amp; Enablement Kits | FibreChannel Cables | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 15 | 716191-B21 | 221.00 | Drive Enclosures / Drives | SAS Cables | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 16 | 716193-B21 | 324.00 | Drive Enclosures / Drives | SAS Cables | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 17 | K2R10A | 501.00 | Drive Enclosures / Drives | SAS Cables | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 18 | AE470A | 78.00 | Drive Enclosures / Drives | SAS Cables | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 19 | AE465A | 110.00 | Drive Enclosures / Drives | SAS Cables | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 20 | AN975A | 264.00 | Drive Enclosures / Drives | SAS Cables | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 21 | AN976A | 410.00 | Drive Enclosures / Drives | SAS Cables | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 22 | K2R09A | 358.00 | Drive Enclosures / Drives | SAS Cables | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 23 | 716197-B21 | Description | Drive Enclosures / Drives | SAS Cables | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 24 | 716199-B21 | 287.00 | Drive Enclosures / Drives | SAS Cables | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 25 | P35176-B21 | 206.00 | Drive Enclosures / Drives | SAS Cables | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 26 | P35175-B21 | 369.00 | Drive Enclosures / Drives | SAS Cables | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 27 | Q6Q63A | 7,275.00 | Accessories &amp; Infrastructure | Expansion Modules | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 28 | C7973A | 61.35 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 29 | C7973W | HPE ProLiant Server Option (C7973W) | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 30 | C7973AL | HPE ProLiant Server Option (C7973AL) | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 31 | C7974AN | 695.91 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 32 | C7974AL | 1,182.63 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 33 | Q2009A | 197.87 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 34 | Q2010A | 199.05 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 35 | C7975AL | 929.43 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 36 | C7975AA | HPE ProLiant Server Option (C7975AA) | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 37 | C7975A | 46.46 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 38 | C7975W | 53.12 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 39 | C7975AN | 929.43 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 40 | Q2011A | 92.99 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 41 | Q2012A | 199.05 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 42 | C7976BL | 1,146.39 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 43 | C7976B | 57.32 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 44 | C7976BN | 1,293.13 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 45 | C7976BW | 86.76 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 46 | C7976AF | HPE ProLiant Server Option (C7976AF) | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 47 | C7976AA | HPE ProLiant Server Option (C7976AA) | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 48 | C7976AC | 1,530.46 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 49 | C7976AL | 1,530.47 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 50 | C7976A | 76.53 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 51 | C7976AN | 1,530.47 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 52 | C7976WL | 2,176.50 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 53 | C7976W | 108.82 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 54 | Q2013A | 92.99 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 55 | C7977AH | 2,205.96 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 56 | C7977A | 110.30 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 57 | C7977AN | 2,205.96 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 58 | C7977AF | HPE ProLiant Server Option (C7977AF) | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 59 | Q2014A | 92.99 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 60 | C7977AL | 2,205.96 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 61 | C7977AC | 2,205.96 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 62 | Q2078MC | 1,617.88 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 63 | Q2078ML | 1,617.88 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 64 | Q2078MN | 1,617.88 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 65 | Q2016A | 199.05 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 66 | C7977WL | 3,044.17 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 67 | C7977W | 152.20 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 68 | Q2078AH | 2,348.24 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 69 | Q2078AL | 2,348.24 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 70 | Q2078AC | 2,348.24 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 71 | Q2078A | 117.43 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 72 | Q2078AN | 2,348.24 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 73 | Q2078WL | 3,240.72 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 74 | Q2078W | 162.07 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 75 | Q2015A | 92.99 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 76 | Q2079AH | 2,911.01 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 77 | Q2079AL | 2,911.01 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 78 | Q2079AC | 2,911.01 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 79 | Q2079A | 145.56 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 80 | Q2079AN | 2,911.01 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 81 | Q2079WL | 3,976.02 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 82 | Q2079W | 198.80 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 83 | Q2017A | 92.99 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 84 | C7972A | HPE ProLiant Server Option (C7972A) | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 85 | C7974A | 58.24 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 86 | C7974W | 41.63 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 87 | Q2007A | HPE ProLiant Server Option (Q2007A) | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 88 | Q2008A | HPE ProLiant Server Option (Q2008A) | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 89 | C7972AN | HPE ProLiant Server Option (C7972AN) | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 90 | C7973AN | HPE ProLiant Server Option (C7973AN) | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 91 | C7978A | 77.62 | Accessories &amp; Infrastructure | Storage Media | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 92 | AG467A | HPE Medium Standard Delivery-Door/Dock Service | Cables &amp; Enablement Kits | Power Cord | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 93 | AG629A | HPE Consolidated Delivery Service | Software &amp; Licenses | Software | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 94 | P1F69A | HPE Delivery Site Above Ground Floor Service | Software &amp; Licenses | Software | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 95 | P1F70A | HPE Forklift at Delivery Service | Software &amp; Licenses | Software | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 96 | P1F71A | HPE Special Delivery Truck Size Service | Software &amp; Licenses | Software | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 97 | P1F72A | HPE Two People at Delivery SVC | Software &amp; Licenses | Software | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 98 | P1F73A | HPE Campus Delivery Service | Software &amp; Licenses | Software | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 99 | P1F74A | HPE Unloading Logistic Service | Software &amp; Licenses | Software | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 100 | P1F75A | HPE Fixed Delivery Appointment Service | Software &amp; Licenses | Software | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 101 | P1F76A | HPE Pre-Delivery Site Survey SVC | Software &amp; Licenses | Software | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 102 | P1F78A | HPE Delivery Any Day at 0800 Hours Service | Software &amp; Licenses | Software | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 103 | AG628A | HPE Special Equipment Service | Software &amp; Licenses | Software | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 104 | BQ335A | HPE Expedite Shipment Small Logistic Service | Software &amp; Licenses | Software | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 105 | BQ337A | HPE Expedite Shipment Large Logistic Service | Software &amp; Licenses | Software | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 106 | C0H28A | HPE StoreEver MSL LTO-6 Ultrium 6250 Fibre Channel Drive Upgrade Kit | Networking | Fibre Channel Host Bus Adapters | REINSTATED | 2026-09-09 | 2026-09-09 | 2026-09-09 |  | $5,300.00 | 2026-09-09: $5300.00 (✕ REMOVED) | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE | No | Vendor marked obsolete/EOL in portal |
| 107 | C0H27A | HPE StoreEver MSL LTO-6 Ultrium 6250 SAS Drive Upgrade Kit | Networking | Fibre Channel Host Bus Adapters | REINSTATED | 2026-09-09 | 2026-09-09 | 2026-09-09 |  | $5,100.00 | 2026-09-09: $5100.00 (✕ REMOVED) | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE | No | Vendor marked obsolete/EOL in portal |
| 108 | N7P36A | HPE StoreEver MSL LTO-7 Ultrium 15000 FC Drive Upgrade Kit | Networking | Fibre Channel Host Bus Adapters | REINSTATED | 2026-09-09 | 2026-09-09 | 2026-09-09 |  | $9,362.00 | 2026-09-09: $9362.00 (✕ REMOVED) | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE | No | Vendor marked obsolete/EOL in portal |
| 109 | N7P37A | HPE StoreEver MSL LTO-7 Ultrium 15000 SAS Drive Upgrade Kit | Networking | Fibre Channel Host Bus Adapters | REINSTATED | 2026-09-09 | 2026-09-09 | 2026-09-09 |  | $9,010.00 | 2026-09-09: $9010.00 (✕ REMOVED) | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE | No | Vendor marked obsolete/EOL in portal |
| 110 | Q6Q67A | HPE StoreEver MSL LTO-8 Ultrium 30750 FC Drive Upgrade Kit | Networking | Fibre Channel Host Bus Adapters | REINSTATED | 2026-09-09 | 2026-09-09 | 2026-09-09 |  | $21,600.00 | 2026-09-09: $21600.00 (✕ REMOVED) | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE | No | Removed from active HPE OCA portal catalog |
| 111 | Q6Q68A | HPE StoreEver MSL LTO-8 Ultrium 30750 SAS Drive Upgrade Kit | Networking | Fibre Channel Host Bus Adapters | REINSTATED | 2026-09-09 | 2026-09-09 | 2026-09-09 |  | $16,800.00 | 2026-09-09: $16800.00 (✕ REMOVED) | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE | No | Removed from active HPE OCA portal catalog |
| 112 | R6Q74A | HPE StoreEver MSL LTO-9 Ultrium 45000 Fibre Channel Drive Upgrade Kit | Networking | Fibre Channel Host Bus Adapters | REINSTATED | 2026-09-09 | 2026-09-09 | 2026-09-09 |  | $33,000.00 | 2026-09-09: $33000.00 (✕ REMOVED) | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE | No | Removed from active HPE OCA portal catalog |
| 113 | R6Q75A | HPE StoreEver MSL LTO-9 Ultrium 45000 SAS Drive Upgrade Kit | Networking | Fibre Channel Host Bus Adapters | REINSTATED | 2026-09-09 | 2026-09-09 | 2026-09-09 |  | $24,000.00 | 2026-09-09: $24000.00 (✕ REMOVED) | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE | No | Removed from active HPE OCA portal catalog |
| 114 | AF570A | HPE C13 - BS-1363A UK/HK/SG 250V 10Amp 1.83m Power Cord | Cables &amp; Enablement Kits | Power Cord | REINSTATED | 2026-09-09 | 2026-09-09 | 2026-09-09 |  | $55.00 | 2026-09-09: $55.00 (✕ REMOVED) | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE | No | Removed from active HPE OCA portal catalog |
| 115 | AF568A | HPE C13 - CEE-VII EU 250V 10Amp 1.83m Power Cord | Cables &amp; Enablement Kits | Power Cord | REINSTATED | 2026-09-09 | 2026-09-09 | 2026-09-09 |  | $71.00 | 2026-09-09: $71.00 (✕ REMOVED) | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE | No | Removed from active HPE OCA portal catalog |
| 116 | AF557A | HPE C13 - GB-1002 CN 250V 10Amp 1.83m Power Cord | Cables &amp; Enablement Kits | Power Cord | REINSTATED | 2026-09-09 | 2026-09-09 | 2026-09-09 |  | $156.00 | 2026-09-09: $156.00 (✕ REMOVED) | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE | No | Removed from active HPE OCA portal catalog |
| 117 | AF556A | HPE C13 - Nema 5-15P US/CA 110V 10Amp 1.83m Power Cord | Cables &amp; Enablement Kits | Power Cord | REINSTATED | 2026-09-09 | 2026-09-09 | 2026-09-09 |  | $55.00 | 2026-09-09: $55.00 (✕ REMOVED) | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE | No | Removed from active HPE OCA portal catalog |
| 118 | AF569A | HPE C13 - AS3112-3 AU 250V 10Amp 2.5m Power Cord | Cables &amp; Enablement Kits | Power Cord | REINSTATED | 2026-09-09 | 2026-09-09 | 2026-09-09 |  | $65.00 | 2026-09-09: $65.00 (✕ REMOVED) | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE | No | Removed from active HPE OCA portal catalog |
| 119 | 142257-002 | HPE C13 - C14 WW 250V 10Amp 2.5m Jumper Cord | Cables &amp; Enablement Kits | Power Cord | REINSTATED | 2026-09-09 | 2026-09-09 | 2026-09-09 |  | $34.00 | 2026-09-09: $34.00 (✕ REMOVED) | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE | No | Vendor marked obsolete/EOL in portal |
| 120 | AF561A | HPE C13 - CNS-690 TW 110V 13Amp 1.83m Power Cord | Cables &amp; Enablement Kits | Power Cord | REINSTATED | 2026-09-09 | 2026-09-09 | 2026-09-09 |  | $55.00 | 2026-09-09: $55.00 (✕ REMOVED) | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE | No | Removed from active HPE OCA portal catalog |
| 121 | AF566A | HPE C13 - DK-2.5A DK 250V 10Amp 1.83m Power Cord | Cables &amp; Enablement Kits | Power Cord | REINSTATED | 2026-09-09 | 2026-09-09 | 2026-09-09 |  | $55.00 | 2026-09-09: $55.00 (✕ REMOVED) | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE | No | Removed from active HPE OCA portal catalog |
| 122 | AF558A | HPE C13 - IRAM -2073 AR 250V 10A 2.5m Power Cord | Cables &amp; Enablement Kits | Power Cord | REINSTATED | 2026-09-09 | 2026-09-09 | 2026-09-09 |  | $65.00 | 2026-09-09: $65.00 (✕ REMOVED) | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE | No | Removed from active HPE OCA portal catalog |
| 123 | AF562A | HPE C13 - IS-1293 IN 240V 6Amp LV 2.0m Power Cord | Cables &amp; Enablement Kits | Power Cord | REINSTATED | 2026-09-09 | 2026-09-09 | 2026-09-09 |  | $194.00 | 2026-09-09: $194.00 (✕ REMOVED) | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE | No | Removed from active HPE OCA portal catalog |
| 124 | SG579A | HPE C13 - IS-1293 IN 250V 10Amp HV 2.5m Power Cord | Cables &amp; Enablement Kits | Power Cord | REINSTATED | 2026-09-09 | 2026-09-09 | 2026-09-09 |  | $142.00 | 2026-09-09: $142.00 (✕ REMOVED) | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE | No | Vendor marked obsolete/EOL in portal |
| 125 | AF572A | HPE C13 - JIS C8303 JP 100V 12Amp 2.0m Power Cord | Cables &amp; Enablement Kits | Power Cord | REINSTATED | 2026-09-09 | 2026-09-09 | 2026-09-09 |  | $60.00 | 2026-09-09: $60.00 (✕ REMOVED) | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE | No | Removed from active HPE OCA portal catalog |
| 126 | AF560A | HPE C13 - KSC- 8305 KR 250V 10Amp 1.83m Power Cord | Cables &amp; Enablement Kits | Power Cord | REINSTATED | 2026-09-09 | 2026-09-09 | 2026-09-09 |  | $55.00 | 2026-09-09: $55.00 (✕ REMOVED) | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE | No | Removed from active HPE OCA portal catalog |
| 127 | AF559A | HPE C13 - Nema 5-15P TH/PH 250V 10Amp 1.83m Power Cord | Cables &amp; Enablement Kits | Power Cord | REINSTATED | 2026-09-09 | 2026-09-09 | 2026-09-09 |  | $55.00 | 2026-09-09: $55.00 (✕ REMOVED) | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE | No | Removed from active HPE OCA portal catalog |
| 128 | AF567A | HPE C13 - SABS-164 ZA 250V 10Amp 2.5m Power Cord | Cables &amp; Enablement Kits | Power Cord | REINSTATED | 2026-09-09 | 2026-09-09 | 2026-09-09 |  | $65.00 | 2026-09-09: $65.00 (✕ REMOVED) | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE | No | Removed from active HPE OCA portal catalog |
| 129 | AF565A | HPE C13 - SEV 1011 CH 250V 10Amp 1.83m Power Cord | Cables &amp; Enablement Kits | Power Cord | REINSTATED | 2026-09-09 | 2026-09-09 | 2026-09-09 |  | $55.00 | 2026-09-09: $55.00 (✕ REMOVED) | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE | No | Removed from active HPE OCA portal catalog |
| 130 | AF564A | HPE C13 - SI-32 IL 250V 10Amp 1.83m Power Cord | Cables &amp; Enablement Kits | Power Cord | REINSTATED | 2026-09-09 | 2026-09-09 | 2026-09-09 |  | $55.00 | 2026-09-09: $55.00 (✕ REMOVED) | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE | No | Removed from active HPE OCA portal catalog |
| 131 | TC406A | HPE StoreEver MSL Command View for Tape Libraries - TapeAssure Advanced LTU | Software &amp; Licenses | Software | REINSTATED | 2026-09-09 | 2026-09-09 | 2026-09-09 |  | $2,500.00 | 2026-09-09: $2500.00 (✕ REMOVED) | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE | No | Removed from active HPE OCA portal catalog |
| 132 | Q8K96A | HPE StoreEver MSL3040 High Availability LTO-6 Control Path Failover LTU | Software &amp; Licenses | Software | REINSTATED | 2026-09-09 | 2026-09-09 | 2026-09-09 |  | $3,000.00 | 2026-09-09: $3000.00 (✕ REMOVED) | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE | No | Vendor marked obsolete/EOL in portal |
| 133 | Q8K97A | HPE StoreEver MSL3040 High Availability LTO-6 Data Path Failover LTU | Software &amp; Licenses | Software | REINSTATED | 2026-09-09 | 2026-09-09 | 2026-09-09 |  | $3,000.00 | 2026-09-09: $3000.00 (✕ REMOVED) | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE | No | Vendor marked obsolete/EOL in portal |
| 134 | Q8K98A | HPE StoreEver MSL3040 KMIP Key Manager LTU | Software &amp; Licenses | Software | REINSTATED | 2026-09-09 | 2026-09-09 | 2026-09-09 |  | $6,000.00 | 2026-09-09: $6000.00 (✕ REMOVED) | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE | No | Removed from active HPE OCA portal catalog |
| 135 | Q8L00A | HPE StoreEver MSL3040 LTO-7+ Path Failover LTU | Software &amp; Licenses | Software | REINSTATED | 2026-09-09 | 2026-09-09 | 2026-09-09 |  | $6,000.00 | 2026-09-09: $6000.00 (✕ REMOVED) | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE | No | Removed from active HPE OCA portal catalog |
| 136 | Q8K99A | HPE StoreEver MSL3040 Secure Manager LTU | Software &amp; Licenses | Software | REINSTATED | 2026-09-09 | 2026-09-09 | 2026-09-09 |  | $2,000.00 | 2026-09-09: $2000.00 (✕ REMOVED) | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE | No | Removed from active HPE OCA portal catalog |
| 137 | Q6Q62C | HPE MSL3040 Scalable Base Module | Chassis | Variants | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 138 | 469776-715 | HPE Add Generic Packaging Kit | Accessories &amp; Infrastructure | Accessories &amp; Infrastructure Options | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |


### Metadata

| Original row | Column 1 | Column 2 |
| --- | --- | --- |
| 1 | Field | Value |
| 2 | Chassis | MSL3040 Tape |
| 3 | Scrape Date | 2026-11-20 |
| 4 | Source | OCA (Online Configuration Application) |
| 5 | Total Sub-Categories | 23 |
| 6 | Total Hardware SKUs | 124 |
| 7 | Total Service/Software SKUs | 153 |
| 8 | Total Combined SKUs | 277 |
| 9 | Chassis Variant Options | 2 |
| 10 | Total Rules | 28 |
| 11 | Unavailable DOM Rules | 1 |
| 12 | Total Tables | 12 |
| 13 | Diff Added SKUs | 91 |
| 14 | Diff Removed SKUs | 28 |
| 15 | Diff Price Changed | 0 |
| 16 | Diff Attr Changed | 158 |
| 17 | Diff Price+Attr Changed | 0 |
| 18 | Diff Reinstated SKUs | 0 |
| 19 | Diff Unchanged SKUs | 0 |
| 20 | Discontinued (All-Time) | 1 |
| 21 | Reinstated (All-Time) | 31 |
| 22 | Services JSON | outputs/StoreEver/Tape/MSL3040_Tape/MSL3040_Tape_Services.json |
| 23 | Output Folder | outputs/StoreEver/Tape/MSL3040_Tape |


## Shared cell text

Bracketed TEXT identifiers above refer to these exact repeated values. The surrounding sheet, column and row determine applicability.

### TEXT_1

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":5300,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_2

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":5100,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_3

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":9362,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_4

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":9010,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_5

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":21600,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_6

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":16800,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_7

{"leadTime":"42","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":33000,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_8

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":24000,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_9

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2500,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_10

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":780,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_11

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":208,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_12

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":115,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_13

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":253,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_14

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":415,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_15

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":162,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_16

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":195,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_17

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":130,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_18

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":239,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_19

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":147,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_20

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":221,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_21

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":324,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_22

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":501,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_23

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":78,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_24

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":110,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_25

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":264,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_26

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":410,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_27

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":358,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_28

Supported on LTO-9 SAS Drive (R6Q75A) Only. &#124; 716197-B21 conditional visibility: portal selector activation required (Supported on LTO-9 SAS Drive (R6Q75A) Only.); PORTAL_CONDITIONAL &#124; (+3 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_29

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":177,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_30

Supported on LTO-9 SAS Drive (R6Q75A) Only. &#124; 716199-B21 conditional visibility: portal selector activation required (Supported on LTO-9 SAS Drive (R6Q75A) Only.); PORTAL_CONDITIONAL &#124; (+3 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_31

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":287,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_32

Supported on LTO-9 SAS Drive (R6Q75A) Only. &#124; P35176-B21 conditional visibility: portal selector activation required (Supported on LTO-9 SAS Drive (R6Q75A) Only.); PORTAL_CONDITIONAL &#124; (+3 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_33

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":206,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_34

Supported on LTO-9 SAS Drive (R6Q75A) Only. &#124; P35175-B21 conditional visibility: portal selector activation required (Supported on LTO-9 SAS Drive (R6Q75A) Only.); PORTAL_CONDITIONAL &#124; (+3 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_35

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":369,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_36

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":7275,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_37

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":71,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_38

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":55,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_39

{"leadTime":"11","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":65,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_40

{"leadTime":"13","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":55,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_41

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":34,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_42

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"}

### TEXT_43

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":55,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_44

{"leadTime":"11","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":55,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_45

{"leadTime":"21","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":156,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_46

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":65,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_47

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":194,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_48

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":142,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_49

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":60,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_50

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":55,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_51

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":61.35,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_52

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":695.91,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_53

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1182.63,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_54

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":197.87,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_55

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":199.05,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_56

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":929.43,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_57

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":46.46,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_58

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":53.12,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_59

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":92.99,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_60

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1146.39,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_61

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":57.32,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_62

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1293.13,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_63

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":86.76,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_64

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"}

### TEXT_65

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":1530.46,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_66

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":1530.47,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_67

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":76.53,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_68

{"leadTime":"6","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":1530.47,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_69

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2176.5,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_70

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":108.82,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_71

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":92.99,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_72

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2205.96,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_73

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":110.3,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_74

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2205.96,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_75

{"leadTime":"9","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2205.96,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_76

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1617.88,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_77

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":3044.17,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_78

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":152.2,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_79

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2348.24,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_80

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2348.24,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_81

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2348.24,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_82

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":117.43,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_83

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":3240.72,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_84

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":162.07,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_85

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2911.01,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_86

{"leadTime":"10","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2911.01,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_87

{"leadTime":"9","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2911.01,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_88

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":145.56,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_89

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":3976.02,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_90

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":198.8,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_91

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":58.24,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_92

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":41.63,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_93

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":77.62,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_94

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":2500,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_95

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":3000,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_96

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":6000,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_97

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":2000,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_98

{"Product Number":"469776-715","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"}

### TEXT_99

Select ONE chassis variant as the mandatory CTO base. All component rules, drive bay limits, and power constraints depend on this selection.

### TEXT_100

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":3000,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_101

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":6000,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

