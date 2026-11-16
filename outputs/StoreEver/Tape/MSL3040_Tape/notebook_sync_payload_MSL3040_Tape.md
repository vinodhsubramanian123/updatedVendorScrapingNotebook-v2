# HPE MSL3040_Tape — Synchronized Catalog Knowledge

**Target Product**: `MSL3040_Tape`

**Scope Identity**: `HPE/STORAGE/StoreEver/Tape/MSL3040_Tape`

**Sync Timestamp**: 2026-11-16T21:08:52.954Z

**Total Verified SKUs**: `232` (`141` Hardware + `91` Services)

**Total Synced KnowledgeDeltas**: `21`

This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.

---

## 🚀 Executive Delta & Recent Change Summary

| Category | Total SKUs | Added (Last Scrape) | Price Changed | Attribute Changed | Price & Attr Changed | Reinstated | Status |
|----------|------------|---------------------|---------------|-------------------|----------------------|------------|--------|
| **Hardware Components** | 141 | 14 | 0 | 90 | 89 | 0 | **CERTIFIED** |
| **Support Services & SLAs** | 91 | 0 | 0 | 0 | 0 | 0 | **CERTIFIED** |
| **Total Portfolio** | **232** | **14** | **0** | **90** | **89** | **0** | **ACTIVE** |

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

## 🏛️ 2. Family & Generation Rules (StoreEver Tape)

*No verified family/generation rules are registered for this product.*

## 🎯 3. Chassis & Solution-Type Gotchas (MSL3040_Tape)

*No specific gotchas logged for MSL3040_Tape. Baseline chassis layout rules active.*

## 🔒 3b. Physical & Architectural Gating Rules (DOM Unavailable Tables)

*No portal-conditional gating rules detected in default DOM state.*

## ⚠️ 4. Discontinued & Obsolete SKUs Registry

### Fully Discontinued & Delisted SKUs

| SKU | Description | Status | Discontinued Date | Last Known Price | Successor SKU | Tracking |
|-----|-------------|--------|-------------------|------------------|---------------|----------|
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
| `469776-715` | HPE Add Generic Packaging Kit | **REINSTATED** | 2026-09-09 | $1.00 | None | STOPPED_AFTER_REMOVAL |
| `HA453A1-001` | HPE FE Proliant Svr Pkg 3 SVC | **REINSTATED** | 2026-09-09 | $205.00 | None | STOPPED_AFTER_REMOVAL |
| `HA453A1-003` | HPE FE Multi-node Svr Pkg 3 SVC | **REINSTATED** | 2026-09-09 | $315.00 | None | STOPPED_AFTER_REMOVAL |
| `HA453A1-023` | HPE FE High End Storage Pkg 3 SVC | **REINSTATED** | 2026-09-09 | $384.00 | None | STOPPED_AFTER_REMOVAL |
| `ZU706A` | HPE Server Customization Package | **REINSTATED** | 2026-09-09 | $149.00 | None | STOPPED_AFTER_REMOVAL |
| `ZU723A` | HPE Customization Service | **REINSTATED** | 2026-09-09 | $110.00 | None | STOPPED_AFTER_REMOVAL |

### ⏳ Impending Obsolescence & Clearance Hardware (90-Day to 180-Day Window)

*These components remain orderable in live configurators today but have published vendor end dates. They represent high-value clearance opportunities for immediate deployments, but require explicit procurement cutoff remarks before quotation:*

| Product # | Description | Category | List Price (USD) | Discontinued Date | Price Trend | Presales Strategy Guidance |
|---|---|---|---:|---|:---:|---|
| `469776-715` | [REMOVED SKU] HPE Add Generic Packaging Kit | Accessories & Infrastructure | $1 | 2026-09-09 | 0.00% | ⚠️ Approaching EOL (2026-09-09). Valid for immediate builds; verify multi-year roadmaps. |
| `HA453A1-001` | [REMOVED SKU] HPE FE Proliant Svr Pkg 3 SVC | Accessories & Infrastructure | $205 | 2026-09-09 | 0.00% | ⚠️ Approaching EOL (2026-09-09). Valid for immediate builds; verify multi-year roadmaps. |
| `HA453A1-003` | [REMOVED SKU] HPE FE Multi-node Svr Pkg 3 SVC | Accessories & Infrastructure | $315 | 2026-09-09 | 0.00% | ⚠️ Approaching EOL (2026-09-09). Valid for immediate builds; verify multi-year roadmaps. |
| `HA453A1-023` | [REMOVED SKU] HPE FE High End Storage Pkg 3 SVC | Accessories & Infrastructure | $384 | 2026-09-09 | 0.00% | ⚠️ Approaching EOL (2026-09-09). Valid for immediate builds; verify multi-year roadmaps. |
| `ZU706A` | [REMOVED SKU] HPE Server Customization Package | Accessories & Infrastructure | $149 | 2026-09-09 | 0.00% | ⚠️ Approaching EOL (2026-09-09). Valid for immediate builds; verify multi-year roadmaps. |
| `ZU723A` | [REMOVED SKU] HPE Customization Service | Accessories & Infrastructure | $110 | 2026-09-09 | 0.00% | ⚠️ Approaching EOL (2026-09-09). Valid for immediate builds; verify multi-year roadmaps. |
| `AF570A` | [REMOVED SKU] HPE C13 - BS-1363A UK/HK/SG 250V 10Amp 1.83m Power Cord | Cables & Enablement Kits | $55 | 2026-09-09 | 0.00% | ⚠️ Approaching EOL (2026-09-09). Valid for immediate builds; verify multi-year roadmaps. |
| `AF568A` | [REMOVED SKU] HPE C13 - CEE-VII EU 250V 10Amp 1.83m Power Cord | Cables & Enablement Kits | $71 | 2026-09-09 | 0.00% | ⚠️ Approaching EOL (2026-09-09). Valid for immediate builds; verify multi-year roadmaps. |
| `AF557A` | [REMOVED SKU] HPE C13 - GB-1002 CN 250V 10Amp 1.83m Power Cord | Cables & Enablement Kits | $156 | 2026-09-09 | 0.00% | ⚠️ Approaching EOL (2026-09-09). Valid for immediate builds; verify multi-year roadmaps. |
| `AF556A` | [REMOVED SKU] HPE C13 - Nema 5-15P US/CA 110V 10Amp 1.83m Power Cord | Cables & Enablement Kits | $55 | 2026-09-09 | 0.00% | ⚠️ Approaching EOL (2026-09-09). Valid for immediate builds; verify multi-year roadmaps. |
| `AF569A` | [REMOVED SKU] HPE C13 - AS3112-3 AU 250V 10Amp 2.5m Power Cord | Cables & Enablement Kits | $65 | 2026-09-09 | 0.00% | ⚠️ Approaching EOL (2026-09-09). Valid for immediate builds; verify multi-year roadmaps. |
| `142257-002` | [REMOVED SKU] HPE C13 - C14 WW 250V 10Amp 2.5m Jumper Cord | Cables & Enablement Kits | $34 | 2026-09-09 | 0.00% | ⚠️ Approaching EOL (2026-09-09). Valid for immediate builds; verify multi-year roadmaps. |
| `AF561A` | [REMOVED SKU] HPE C13 - CNS-690 TW 110V 13Amp 1.83m Power Cord | Cables & Enablement Kits | $55 | 2026-09-09 | 0.00% | ⚠️ Approaching EOL (2026-09-09). Valid for immediate builds; verify multi-year roadmaps. |
| `AF566A` | [REMOVED SKU] HPE C13 - DK-2.5A DK 250V 10Amp 1.83m Power Cord | Cables & Enablement Kits | $55 | 2026-09-09 | 0.00% | ⚠️ Approaching EOL (2026-09-09). Valid for immediate builds; verify multi-year roadmaps. |
| `AF558A` | [REMOVED SKU] HPE C13 - IRAM -2073 AR 250V 10A 2.5m Power Cord | Cables & Enablement Kits | $65 | 2026-09-09 | 0.00% | ⚠️ Approaching EOL (2026-09-09). Valid for immediate builds; verify multi-year roadmaps. |
| `AF562A` | [REMOVED SKU] HPE C13 - IS-1293 IN 240V 6Amp LV 2.0m Power Cord | Cables & Enablement Kits | $194 | 2026-09-09 | 0.00% | ⚠️ Approaching EOL (2026-09-09). Valid for immediate builds; verify multi-year roadmaps. |
| `SG579A` | [REMOVED SKU] HPE C13 - IS-1293 IN 250V 10Amp HV 2.5m Power Cord | Cables & Enablement Kits | $142 | 2026-09-09 | 0.00% | ⚠️ Approaching EOL (2026-09-09). Valid for immediate builds; verify multi-year roadmaps. |
| `AF572A` | [REMOVED SKU] HPE C13 - JIS C8303 JP 100V 12Amp 2.0m Power Cord | Cables & Enablement Kits | $60 | 2026-09-09 | 0.00% | ⚠️ Approaching EOL (2026-09-09). Valid for immediate builds; verify multi-year roadmaps. |
| `AF560A` | [REMOVED SKU] HPE C13 - KSC- 8305 KR 250V 10Amp 1.83m Power Cord | Cables & Enablement Kits | $55 | 2026-09-09 | 0.00% | ⚠️ Approaching EOL (2026-09-09). Valid for immediate builds; verify multi-year roadmaps. |
| `AF559A` | [REMOVED SKU] HPE C13 - Nema 5-15P TH/PH 250V 10Amp 1.83m Power Cord | Cables & Enablement Kits | $55 | 2026-09-09 | 0.00% | ⚠️ Approaching EOL (2026-09-09). Valid for immediate builds; verify multi-year roadmaps. |
| `AF567A` | [REMOVED SKU] HPE C13 - SABS-164 ZA 250V 10Amp 2.5m Power Cord | Cables & Enablement Kits | $65 | 2026-09-09 | 0.00% | ⚠️ Approaching EOL (2026-09-09). Valid for immediate builds; verify multi-year roadmaps. |
| `AF565A` | [REMOVED SKU] HPE C13 - SEV 1011 CH 250V 10Amp 1.83m Power Cord | Cables & Enablement Kits | $55 | 2026-09-09 | 0.00% | ⚠️ Approaching EOL (2026-09-09). Valid for immediate builds; verify multi-year roadmaps. |
| `AF564A` | [REMOVED SKU] HPE C13 - SI-32 IL 250V 10Amp 1.83m Power Cord | Cables & Enablement Kits | $55 | 2026-09-09 | 0.00% | ⚠️ Approaching EOL (2026-09-09). Valid for immediate builds; verify multi-year roadmaps. |
| `TC406A` | [REMOVED SKU] HPE StoreEver MSL Command View for Tape Libraries - TapeAssure Advanced LTU | Software & Licenses | $2,500 | 2026-09-09 | 0.00% | ⚠️ Approaching EOL (2026-09-09). Valid for immediate builds; verify multi-year roadmaps. |
| `Q8K96A` | [REMOVED SKU] HPE StoreEver MSL3040 High Availability LTO-6 Control Path Failover LTU | Software & Licenses | $3,000 | 2026-09-09 | 0.00% | ⚠️ Approaching EOL (2026-09-09). Valid for immediate builds; verify multi-year roadmaps. |
*... [12 additional impending EOL records omitted for brevity]*

## 📊 5b. Category-Level Trends & Significant Price Adjustments

### Category Portfolio Delta & Planning Intelligence

| Category | Total SKUs | Added | Modified | Unchanged | Clearance / Drops | Category Planning Insight |
|---|---:|---:|---:|---:|---:|---|
| **Chassis** | 1 | 0 | 1 | 0 | 0 | 🔄 Attributes/specifications updated (1 SKUs) |
| **Accessories & Infrastructure** | 73 | 0 | 67 | 6 | 0 | 🔄 Attributes/specifications updated (67 SKUs) |
| **Power Supplies** | 2 | 0 | 2 | 0 | 0 | 🔄 Attributes/specifications updated (2 SKUs) |
| **Cables & Enablement Kits** | 38 | 1 | 20 | 17 | 10 | ⚠️ Active price drops / clearance (10 SKUs discounted) |
| **Drive Enclosures / Drives** | 25 | 0 | 25 | 0 | 12 | ⚠️ Active price drops / clearance (12 SKUs discounted) |
| **Storage Controllers** | 64 | 0 | 64 | 0 | 0 | 🔄 Attributes/specifications updated (64 SKUs) |
| **Software & Licenses** | 19 | 13 | 0 | 6 | 0 | ✨ Portfolio expanding (+13 new options) |
| **Networking** | 8 | 0 | 0 | 8 | 0 | Stable portfolio |

### High-Impact Price Adjustments (Drops $\ge 10\%$ and Major Moves)

| Product # | Description | Category | Previous Price | Current Price | Delta (USD) | Change (%) | Movement Type |
|---|---|---|---:|---:|---:|---:|---|
| `K2R10A` | 501.00 | Drive Enclosures / Drives | $501 | $0 | $-501 | **-100.0%** | 📉 CLEARANCE_DROP |
| `QK737A` | 415.00 | Cables & Enablement Kits | $415 | $0 | $-415 | **-100.0%** | 📉 CLEARANCE_DROP |
| `AN976A` | 410.00 | Drive Enclosures / Drives | $410 | $0 | $-410 | **-100.0%** | 📉 CLEARANCE_DROP |
| `P35175-B21` | 369.00 | Drive Enclosures / Drives | $369 | $0 | $-369 | **-100.0%** | 📉 CLEARANCE_DROP |
| `K2R09A` | 358.00 | Drive Enclosures / Drives | $358 | $0 | $-358 | **-100.0%** | 📉 CLEARANCE_DROP |
| `716193-B21` | 324.00 | Drive Enclosures / Drives | $324 | $0 | $-324 | **-100.0%** | 📉 CLEARANCE_DROP |
| `716199-B21` | 287.00 | Drive Enclosures / Drives | $287 | $0 | $-287 | **-100.0%** | 📉 CLEARANCE_DROP |
| `AN975A` | 264.00 | Drive Enclosures / Drives | $264 | $0 | $-264 | **-100.0%** | 📉 CLEARANCE_DROP |
| `AJ839A` | 253.00 | Cables & Enablement Kits | $253 | $0 | $-253 | **-100.0%** | 📉 CLEARANCE_DROP |
| `QK736A` | 239.00 | Cables & Enablement Kits | $239 | $0 | $-239 | **-100.0%** | 📉 CLEARANCE_DROP |
| `716191-B21` | 221.00 | Drive Enclosures / Drives | $221 | $0 | $-221 | **-100.0%** | 📉 CLEARANCE_DROP |
| `AJ838A` | 208.00 | Cables & Enablement Kits | $208 | $0 | $-208 | **-100.0%** | 📉 CLEARANCE_DROP |
| `P35176-B21` | 206.00 | Drive Enclosures / Drives | $206 | $0 | $-206 | **-100.0%** | 📉 CLEARANCE_DROP |
| `QK735A` | 195.00 | Cables & Enablement Kits | $195 | $0 | $-195 | **-100.0%** | 📉 CLEARANCE_DROP |
| `716197-B21` | Description | Drive Enclosures / Drives | $177 | $0 | $-177 | **-100.0%** | 📉 CLEARANCE_DROP |
| `AJ837A` | 162.00 | Cables & Enablement Kits | $162 | $0 | $-162 | **-100.0%** | 📉 CLEARANCE_DROP |
| `QK734A` | 147.00 | Cables & Enablement Kits | $147 | $0 | $-147 | **-100.0%** | 📉 CLEARANCE_DROP |
| `QK733A` | 130.00 | Cables & Enablement Kits | $130 | $0 | $-130 | **-100.0%** | 📉 CLEARANCE_DROP |
| `AJ836A` | 115.00 | Cables & Enablement Kits | $115 | $0 | $-115 | **-100.0%** | 📉 CLEARANCE_DROP |
| `QK732A` | 115.00 | Cables & Enablement Kits | $115 | $0 | $-115 | **-100.0%** | 📉 CLEARANCE_DROP |
*... [69 additional price movements omitted for brevity]*

## 🔄 5. Recent Attribute & Specification Modifications Log

| Timestamp | Source | SKU | Attribute | Old Value | New Value | Detail |
|-----------|--------|-----|-----------|-----------|-----------|--------|
| 2026-09-09 | Hardware | `Q6Q68A` | Discontinued Date | 05/31/2030 | **2026-09-09** | Discontinued Date: "05/31/2030" → "2026-09-09" |
| 2026-09-09 | Hardware | `Q6Q68A` | Lifecycle Status | Active | **N/A** | Lifecycle Status: "Active" → "N/A" |
| 2026-09-09 | Hardware | `Q6Q68A` | Availability | Available | **N/A** | Availability: "Available" → "N/A" |
| 2026-09-09 | Hardware | `Q6Q68A` | Lead Time Source | Not published by OCA | **N/A** | Lead Time Source: "Not published by OCA" → "N/A" |
| 2026-09-09 | Hardware | `Q6Q68A` | Vendor Attributes | {"Extended Price (USD)":"NA"} | **N/A** | Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "N/A" |
| 2026-09-09 | Hardware | `R6Q74A` | Description | HPE StoreEver MSL LTO-9 Ultrium 45000 Fibre Channel Drive Upgrade Kit | **[REMOVED SKU] HPE StoreEver MSL LTO-9 Ultrium 45000 Fibre Channel Drive Upgrade Kit** | Description: "HPE StoreEver MSL LTO-9 Ultrium 45000 Fibre Channel Drive Upgrade Kit" → "[REMOVED SKU] HPE StoreEver MSL LTO-9 Ultrium 45000 Fibre Channel Drive Upgrade Kit" |
| 2026-09-09 | Hardware | `R6Q74A` | Constraint | N/A | **Discontinued** | Constraint: "N/A" → "Discontinued" |
| 2026-09-09 | Hardware | `R6Q74A` | Rule/Note | N/A | **[DISCONTINUED] SKU removed from latest HPE OCA portal catalog** | Rule/Note: "N/A" → "[DISCONTINUED] SKU removed from latest HPE OCA portal catalog" |
| 2026-09-09 | Hardware | `R6Q74A` | Max Qty | N/A | **0** | Max Qty: "N/A" → "0" |
| 2026-09-09 | Hardware | `R6Q74A` | Component Role | N/A | **Discontinued Hardware** | Component Role: "N/A" → "Discontinued Hardware" |
| 2026-09-09 | Hardware | `R6Q74A` | Discontinued Date | 05/31/2030 | **2026-09-09** | Discontinued Date: "05/31/2030" → "2026-09-09" |
| 2026-09-09 | Hardware | `R6Q74A` | Lifecycle Status | Active | **N/A** | Lifecycle Status: "Active" → "N/A" |
| 2026-09-09 | Hardware | `R6Q74A` | Availability | Available | **N/A** | Availability: "Available" → "N/A" |
| 2026-09-09 | Hardware | `R6Q74A` | Lead Time Source | Not published by OCA | **N/A** | Lead Time Source: "Not published by OCA" → "N/A" |
| 2026-09-09 | Hardware | `R6Q74A` | Vendor Attributes | {"Extended Price (USD)":"NA"} | **N/A** | Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "N/A" |
| 2026-09-09 | Hardware | `R6Q75A` | Description | HPE StoreEver MSL LTO-9 Ultrium 45000 SAS Drive Upgrade Kit | **[REMOVED SKU] HPE StoreEver MSL LTO-9 Ultrium 45000 SAS Drive Upgrade Kit** | Description: "HPE StoreEver MSL LTO-9 Ultrium 45000 SAS Drive Upgrade Kit" → "[REMOVED SKU] HPE StoreEver MSL LTO-9 Ultrium 45000 SAS Drive Upgrade Kit" |
| 2026-09-09 | Hardware | `R6Q75A` | Constraint | N/A | **Discontinued** | Constraint: "N/A" → "Discontinued" |
| 2026-09-09 | Hardware | `R6Q75A` | Rule/Note | N/A | **[DISCONTINUED] SKU removed from latest HPE OCA portal catalog** | Rule/Note: "N/A" → "[DISCONTINUED] SKU removed from latest HPE OCA portal catalog" |
| 2026-09-09 | Hardware | `R6Q75A` | Max Qty | N/A | **0** | Max Qty: "N/A" → "0" |
| 2026-09-09 | Hardware | `R6Q75A` | Component Role | N/A | **Discontinued Hardware** | Component Role: "N/A" → "Discontinued Hardware" |
| 2026-09-09 | Hardware | `R6Q75A` | Discontinued Date | 05/31/2030 | **2026-09-09** | Discontinued Date: "05/31/2030" → "2026-09-09" |
| 2026-09-09 | Hardware | `R6Q75A` | Lifecycle Status | Active | **N/A** | Lifecycle Status: "Active" → "N/A" |
| 2026-09-09 | Hardware | `R6Q75A` | Availability | Available | **N/A** | Availability: "Available" → "N/A" |
| 2026-09-09 | Hardware | `R6Q75A` | Lead Time Source | Not published by OCA | **N/A** | Lead Time Source: "Not published by OCA" → "N/A" |
| 2026-09-09 | Hardware | `R6Q75A` | Vendor Attributes | {"Extended Price (USD)":"NA"} | **N/A** | Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "N/A" |

### Current Scrape SKU Attribute Deltas

| SKU | Source | Diff Status | Attribute Changes (Old → New) |
|-----|--------|-------------|-------------------------------|
| `Q2R41A` | Hardware | ATTRIBUTE_CHANGED | Availability: "Available in OCA product catalog" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)" |
| `AM495A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE StoreEver 1/8 G2 Tape Autoloader and MSL Tape Library Encryption Kit" → "2,500.00"; Availability: "Available" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `469776-715` | Hardware | REMOVED | Description: "HPE Add Generic Packaging Kit" → "[REMOVED SKU] HPE Add Generic Packaging Kit"; Constraint: "(None)" → "Discontinued"; Rule/Note: "(None)" → "[DISCONTINUED] SKU removed from latest HPE OCA portal catalog"; Max Qty: "(None)" → "0"; Component Role: "(None)" → "Discontinued Hardware"; HPE Recommended: "(None)" → "No"; Start Date: "(None)" → "2026-09-09"; Discontinued Date: "(None)" → "2026-09-09"; Lifecycle Status: "Active" → "(None)"; Availability: "Not published by OCA" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"List Price (USD)":"1.00","Product Number":"469776-715"}" → "(None)" |
| `HA453A1-001` | Hardware | REMOVED | Description: "HPE FE Proliant Svr Pkg 3 SVC" → "[REMOVED SKU] HPE FE Proliant Svr Pkg 3 SVC"; Constraint: "(None)" → "Discontinued"; Rule/Note: "(None)" → "[DISCONTINUED] SKU removed from latest HPE OCA portal catalog"; Max Qty: "(None)" → "0"; Component Role: "(None)" → "Discontinued Hardware"; HPE Recommended: "(None)" → "No"; Start Date: "(None)" → "2026-09-09"; Discontinued Date: "(None)" → "2026-09-09"; Lifecycle Status: "Active" → "(None)"; Availability: "Not published by OCA" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"List Price (USD)":"205.00","Product Number":"HA453A1-001"}" → "(None)" |
| `HA453A1-003` | Hardware | REMOVED | Description: "HPE FE Multi-node Svr Pkg 3 SVC" → "[REMOVED SKU] HPE FE Multi-node Svr Pkg 3 SVC"; Constraint: "(None)" → "Discontinued"; Rule/Note: "(None)" → "[DISCONTINUED] SKU removed from latest HPE OCA portal catalog"; Max Qty: "(None)" → "0"; Component Role: "(None)" → "Discontinued Hardware"; HPE Recommended: "(None)" → "No"; Start Date: "(None)" → "2026-09-09"; Discontinued Date: "(None)" → "2026-09-09"; Lifecycle Status: "Active" → "(None)"; Availability: "Not published by OCA" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"List Price (USD)":"315.00","Product Number":"HA453A1-003"}" → "(None)" |
| `HA453A1-023` | Hardware | REMOVED | Description: "HPE FE High End Storage Pkg 3 SVC" → "[REMOVED SKU] HPE FE High End Storage Pkg 3 SVC"; Constraint: "(None)" → "Discontinued"; Rule/Note: "(None)" → "[DISCONTINUED] SKU removed from latest HPE OCA portal catalog"; Max Qty: "(None)" → "0"; Component Role: "(None)" → "Discontinued Hardware"; HPE Recommended: "(None)" → "No"; Start Date: "(None)" → "2026-09-09"; Discontinued Date: "(None)" → "2026-09-09"; Lifecycle Status: "Active" → "(None)"; Availability: "Not published by OCA" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"List Price (USD)":"384.00","Product Number":"HA453A1-023"}" → "(None)" |
| `ZU706A` | Hardware | REMOVED | Description: "HPE Server Customization Package" → "[REMOVED SKU] HPE Server Customization Package"; Constraint: "(None)" → "Discontinued"; Rule/Note: "(None)" → "[DISCONTINUED] SKU removed from latest HPE OCA portal catalog"; Max Qty: "(None)" → "0"; Component Role: "(None)" → "Discontinued Hardware"; HPE Recommended: "(None)" → "No"; Start Date: "(None)" → "2026-09-09"; Discontinued Date: "(None)" → "2026-09-09"; Lifecycle Status: "Active" → "(None)"; Availability: "Not published by OCA" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"List Price (USD)":"149.00","Product Number":"ZU706A"}" → "(None)" |
| `ZU723A` | Hardware | REMOVED | Description: "HPE Customization Service" → "[REMOVED SKU] HPE Customization Service"; Constraint: "(None)" → "Discontinued"; Rule/Note: "(None)" → "[DISCONTINUED] SKU removed from latest HPE OCA portal catalog"; Max Qty: "(None)" → "0"; Component Role: "(None)" → "Discontinued Hardware"; HPE Recommended: "(None)" → "No"; Start Date: "(None)" → "2026-09-09"; Discontinued Date: "(None)" → "2026-09-09"; Lifecycle Status: "Active" → "(None)"; Availability: "Not published by OCA" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"List Price (USD)":"110.00","Product Number":"ZU723A"}" → "(None)" |
| `Q6Q64A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE StoreEver MSL3040 Upgrade Power Supply Kit" → "780.00"; Availability: "Available" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `AJ838A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE LC to LC Multi-mode OM3 2-Fiber 30.0m 1-Pack Fiber Optic Cable" → "208.00"; HPE Recommended: "(None)" → "11/30/2028"; Availability: "Available" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `AJ836A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE LC to LC Multi-mode OM3 2-Fiber 5.0m 1-Pack Fiber Optic Cable" → "115.00"; HPE Recommended: "(None)" → "11/30/2028"; Availability: "Available" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `AJ839A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE LC to LC Multi-mode OM3 2-Fiber 50.0m 1-Pack Fiber Optic Cable" → "253.00"; HPE Recommended: "(None)" → "11/30/2028"; Availability: "Available" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `QK732A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 1m Cable" → "115.00"; HPE Recommended: "(None)" → "11/30/2028"; Availability: "Available" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `QK737A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 50m Cable" → "415.00"; HPE Recommended: "(None)" → "11/30/2028"; Availability: "Available" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `AJ837A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE LC to LC Multi-mode OM3 2-Fiber 15.0m 1-Pack Fiber Optic Cable" → "162.00"; HPE Recommended: "(None)" → "11/30/2028"; Availability: "Available" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `QK735A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 15m Cable" → "195.00"; HPE Recommended: "(None)" → "11/30/2028"; Availability: "Available" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `QK733A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 2m Cable" → "130.00"; HPE Recommended: "(None)" → "11/30/2028"; Availability: "Available" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `QK736A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 30m Cable" → "239.00"; HPE Recommended: "(None)" → "11/30/2028"; Availability: "Available" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `QK734A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 5m Cable" → "147.00"; HPE Recommended: "(None)" → "11/30/2028"; Availability: "Available" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `716191-B21` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE 2.0m External Mini SAS High Density to Mini SAS Cable" → "221.00"; HPE Recommended: "(None)" → "08/31/2030"; Availability: "Available" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `716193-B21` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE 4.0m External Mini SAS High Density to Mini SAS Cable" → "324.00"; HPE Recommended: "(None)" → "08/31/2030"; Availability: "Available" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `K2R10A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE StoreEver Mini-SAS High Density to 4-lane Mini-SAS External Fanout 4m Cable" → "501.00"; HPE Recommended: "(None)" → "05/31/2027"; Availability: "Available" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `AE470A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE SAS Min-Min 1x-2M Cable Assembly Kit" → "78.00"; HPE Recommended: "(None)" → "05/31/2022"; Availability: "Obsolete (OB)" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `AE465A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE SAS Min-Min 1x-4m Cable Assembly Kit" → "110.00"; HPE Recommended: "(None)" → "01/31/2022"; Availability: "Obsolete (OB)" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `AN975A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE StoreEver 2m External Mini-SAS to 4x1 Mini-SAS Cable" → "264.00"; HPE Recommended: "(None)" → "08/31/2025"; Availability: "Obsolete (OB)" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `AN976A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE StoreEver 4m External Mini-SAS to 4x1 Mini-SAS Cable" → "410.00"; HPE Recommended: "(None)" → "08/31/2025"; Availability: "Obsolete (OB)" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `K2R09A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE StoreEver Mini-SAS High Density to 4-lane Mini-SAS External Fanout 2m Cable" → "358.00"; HPE Recommended: "(None)" → "05/31/2027"; Availability: "Available" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `716197-B21` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE External 2.0m (6ft) Mini-SAS HD 4x to Mini-SAS HD 4x Cable" → "Description"; HPE Recommended: "(None)" → "HPE Recommended"; Availability: "Not published by OCA" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `716199-B21` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE External 4.0m (13ft) Mini-SAS HD 4x to Mini-SAS HD 4x Cable" → "287.00"; HPE Recommended: "(None)" → "08/31/2030"; Availability: "Not published by OCA" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `P35176-B21` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE External 12Gb Mini SAS High Density to Mini SAS High Density 4-lane 2m Fanout Cable" → "206.00"; HPE Recommended: "(None)" → "08/31/2030"; Availability: "Not published by OCA" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `P35175-B21` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE External 12Gb Mini SAS High Density to Mini SAS High Density 4-lane 4m Fanout Cable" → "369.00"; HPE Recommended: "(None)" → "08/31/2030"; Availability: "Not published by OCA" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `Q6Q63A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE StoreEver MSL3040 Scalable Library Expansion Module" → "7,275.00"; Availability: "Available" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `C7973A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE LTO-3 Ultrium 800 GB Re-writable Data Cartridge" → "61.35"; Availability: "Obsolete (OB)" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `C7973W` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE LTO-3 Ultrium 800 GB WORM Data Cartridge" → "HPE ProLiant Server Option (C7973W)"; Availability: "Obsolete (OB)" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `C7973AL` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE LTO-3 Ultrium 800GB RW Labeled Data Cartridge 20 Pack" → "HPE ProLiant Server Option (C7973AL)"; Availability: "Obsolete (OB)" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `C7974AN` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE LTO-4 Ultrium 1.6TB Non-custom Label Data Cartridge 20 Pack" → "695.91"; Availability: "Obsolete (OB)" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `C7974AL` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE LTO-4 Ultrium 1.6TB RW Custom Label Data Cartridge 20 Pack" → "1,182.63"; Availability: "Obsolete (OB)" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `Q2009A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE LTO-4 Ultrium Read/Write Bar Code Label Pack" → "197.87"; Availability: "Obsolete (OB)" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `Q2010A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE LTO-4 Ultrium WORM Bar Code Label Pack" → "199.05"; Availability: "Obsolete (OB)" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `C7975AL` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE LTO-5 RW Custom Labeled Data Cartridge 20 Pack" → "929.43"; Availability: "Obsolete (OB)" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `C7975AA` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE LTO-5 Ultrium 3TB RW 20 Data Cartridges" → "HPE ProLiant Server Option (C7975AA)"; Availability: "Obsolete (OB)" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `C7975A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE LTO-5 Ultrium 3TB RW Data Cartridge" → "46.46"; Availability: "Direct Ship (DS)" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `C7975W` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE LTO-5 Ultrium 3TB WORM Data Cartridge" → "53.12"; Availability: "Obsolete (OB)" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `C7975AN` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE LTO-5 Ultrium Non-custom Labeled Data Cartridge 20 Pack" → "929.43"; Availability: "Obsolete (OB)" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `Q2011A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE LTO-5 Ultrium RW Bar Code Label Pack" → "92.99"; Availability: "Direct Ship (DS)" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `Q2012A` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE LTO-5 Ultrium WORM Bar Code Label Pack" → "199.05"; Availability: "Obsolete (OB)" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `C7976BL` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE LTO-6 Ultrium 6.25TB BaFe RW Custom Labeled Data Cartridge 20 Pack" → "1,146.39"; Availability: "Obsolete (OB)" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `C7976B` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE LTO-6 Ultrium 6.25TB BaFe RW Data Cartridge" → "57.32"; Availability: "Obsolete (OB)" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `C7976BN` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE LTO-6 Ultrium 6.25TB BaFe RW Non Custom Labeled Data Cartridges 20 Pack" → "1,293.13"; Availability: "Obsolete (OB)" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |
| `C7976BW` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Description: "HPE LTO-6 Ultrium 6.25TB BaFe WORM Data Cartridge" → "86.76"; Availability: "Obsolete (OB)" → "(None)"; Lead Time Source: "Not published by OCA" → "(None)"; Vendor Attributes: "{"Extended Price (USD)":"NA"}" → "(None)" |

## 🧩 6. Same-Product CTO Variant Matrix

| Chassis Identifier | Product Family | Generation | Form Factor | CTO Base SKU |
|--------------------|----------------|------------|-------------|--------------|
| **MSL3040_Tape** | StoreEver | Gen1 | Rack | `Q6Q67A` |

