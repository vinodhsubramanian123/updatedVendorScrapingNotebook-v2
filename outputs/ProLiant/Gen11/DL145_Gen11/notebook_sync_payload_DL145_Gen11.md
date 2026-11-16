# HPE DL145_Gen11 — Synchronized Catalog Knowledge

**Target Product**: `DL145_Gen11`

**Scope Identity**: `HPE/SERVER/ProLiant/Gen11/DL145_Gen11`

**Sync Timestamp**: 2026-11-16T21:08:12.240Z

**Total Verified SKUs**: `624` (`413` Hardware + `211` Services)

**Total Synced KnowledgeDeltas**: `25`

This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.

---

## 🚀 Executive Delta & Recent Change Summary

| Category | Total SKUs | Added (Last Scrape) | Price Changed | Attribute Changed | Price & Attr Changed | Reinstated | Status |
|----------|------------|---------------------|---------------|-------------------|----------------------|------------|--------|
| **Hardware Components** | 413 | 56 | 0 | 39 | 0 | 0 | **CERTIFIED** |
| **Support Services & SLAs** | 211 | 0 | 0 | 0 | 0 | 0 | **CERTIFIED** |
| **Total Portfolio** | **624** | **56** | **0** | **39** | **0** | **0** | **ACTIVE** |

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

## 🏛️ 2. Family & Generation Rules (ProLiant Gen11)

*No verified family/generation rules are registered for this product.*

## 🎯 3. Chassis & Solution-Type Gotchas (DL145_Gen11)

1. **[DELTA_DL145_GEN11_AMD_EPYC_8004] DL145_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL145 Gen11 Edge Server`):
   - **Rule**: DL145 Gen11 is single-socket AMD EPYC 8004 only. No dual-socket configurations supported.
   - **Affected SKU**: `P71964-B21` | **Required Dependency**: `N/A`

2. **[DELTA_DL145_GEN11_4EDSFF_CAGE] DL145_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL145 Gen11 Edge Server`):
   - **Rule**: DL145 Gen11 uses EDSFF E3.S form factor drives only. Standard SFF/LFF drives are incompatible.
   - **Affected SKU**: `P71985-B21` | **Required Dependency**: `P77271-B21`

3. **[DELTA_DL145_GEN11_PSU_PROFILE] DL145_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL145 Gen11 Edge Server`):
   - **Rule**: DL145 Gen11 supports maximum 1000W PSUs. 1600W/2400W PSUs are physically incompatible.
   - **Affected SKU**: `P71964-B21` | **Required Dependency**: `P54290-B21`

4. **[DELTA_DL145_GEN11_EXTENDED_TEMP] DL145_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL145 Gen11 Edge Server`):
   - **Rule**: DL145 Gen11 edge deployments use P73021-B21 for extended -5C to 45C ambient temperature tracking.
   - **Affected SKU**: `P71964-B21` | **Required Dependency**: `P73021-B21`


## 🔒 3b. Physical & Architectural Gating Rules (DOM Unavailable Tables)

*No portal-conditional gating rules detected in default DOM state.*

## ⚠️ 4. Discontinued & Obsolete SKUs Registry

*No discontinued or reinstated SKUs detected for DL145_Gen11. All cataloged SKUs are active.*

### ⏳ Impending Obsolescence & Clearance Hardware (90-Day to 180-Day Window)

*These components remain orderable in live configurators today but have published vendor end dates. They represent high-value clearance opportunities for immediate deployments, but require explicit procurement cutoff remarks before quotation:*

| Product # | Description | Category | List Price (USD) | Discontinued Date | Price Trend | Presales Strategy Guidance |
|---|---|---|---:|---|:---:|---|
| `P61191-B21` | HPE 3.2TB NVMe Gen5 High Performance Mixed Use E3S EC1 EDSFF SPDM CM7 SSD | Drive Enclosures / Drives | $42,682 | 12/31/2026 | 0.00% | ⚠️ Approaching EOL (12/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P69237-B21` | HPE 3.84TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 CD8P SSD | Drive Enclosures / Drives | $30,682 | 11/30/2026 | 0.00% | ⚠️ Approaching EOL (11/30/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P61179-B21` | HPE 3.84TB NVMe Gen5 High Performance Read Intensive E3S EC1 EDSFF SPDM CM7 SSD | Drive Enclosures / Drives | $47,029 | 12/31/2026 | 0.00% | ⚠️ Approaching EOL (12/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P61183-B21` | HPE 7.68TB NVMe Gen5 High Performance Read Intensive E3S EC1 EDSFF SPDM CM7 SSD | Drive Enclosures / Drives | $75,784 | 12/31/2026 | 0.00% | ⚠️ Approaching EOL (12/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P63930-B21` | HPE 3.84TB NVMe Gen4 Mainstream Performance Very Read Optimized E3S EC1 EDSFF P5430 SSD | Drive Enclosures / Drives | $29,188 | 12/31/2026 | 0.00% | ⚠️ Approaching EOL (12/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P63934-B21` | HPE 7.68TB NVMe Gen4 Mainstream Performance Very Read Optimized E3S EC1 EDSFF P5430 SSD | Drive Enclosures / Drives | $49,219 | 12/31/2026 | 0.00% | ⚠️ Approaching EOL (12/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P69234-B21` | HPE 1.92TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 CD8P SSD | Drive Enclosures / Drives | $19,743 | 11/30/2026 | 0.00% | ⚠️ Approaching EOL (11/30/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P69239-B21` | HPE 7.68TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 CD8P SSD | Drive Enclosures / Drives | $44,109 | 11/30/2026 | 0.00% | ⚠️ Approaching EOL (11/30/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P61187-B21` | HPE 15.36TB NVMe Gen5 High Performance Read Intensive E3S EC1 EDSFF SPDM CM7 SSD | Drive Enclosures / Drives | $1,18,842 | 12/31/2026 | 0.00% | ⚠️ Approaching EOL (12/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P61195-B21` | HPE 6.4TB NVMe Gen5 High Performance Mixed Use E3S EC1 EDSFF SPDM CM7 SSD | Drive Enclosures / Drives | $60,093 | 12/31/2026 | 0.00% | ⚠️ Approaching EOL (12/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P63938-B21` | HPE 15.36TB NVMe Gen4 Mainstream Performance Very Read Optimized E3S EC1 EDSFF P5430 SSD | Drive Enclosures / Drives | $96,543 | 12/31/2026 | 0.00% | ⚠️ Approaching EOL (12/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P69241-B21` | HPE 1.6TB NVMe Gen5 Mainstream Performance Mixed Use E3S EC1 CD8P SSD | Drive Enclosures / Drives | $20,109 | 11/30/2026 | 0.00% | ⚠️ Approaching EOL (11/30/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P69243-B21` | HPE 3.2TB NVMe Gen5 Mainstream Performance Mixed Use E3S EC1 CD8P SSD | Drive Enclosures / Drives | $27,452 | 11/30/2026 | 0.00% | ⚠️ Approaching EOL (11/30/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P69245-B21` | HPE 6.4TB NVMe Gen5 Mainstream Performance Mixed Use E3S EC1 CD8P SSD | Drive Enclosures / Drives | $44,109 | 11/30/2026 | 0.00% | ⚠️ Approaching EOL (11/30/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P69546-B21` | HPE 15.36TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 CD8P SSD | Drive Enclosures / Drives | $75,476 | 11/30/2026 | 0.00% | ⚠️ Approaching EOL (11/30/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P79065-B21` | HPE 30.72TB NVMe Gen4 Mainstream Performance Very Read Optimized E3S EC1 EDSFF P5430 SSD | Drive Enclosures / Drives | $1,80,169 | 12/31/2026 | 0.00% | ⚠️ Approaching EOL (12/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P79615-B21` | HPE 30.72TB NVMe Gen5 Mainstream Performance Very Read Optimized E3.S EC1 EDSFF 6550 SSD | Drive Enclosures / Drives | $1,40,919 | 12/31/2026 | 0.00% | ⚠️ Approaching EOL (12/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P79618-B21` | HPE 61.44TB NVMe Gen5 Mainstream Performance Very Read Optimized E3.S EC1 EDSFF 6550 SSD | Drive Enclosures / Drives | $2,84,757 | 12/31/2026 | 0.00% | ⚠️ Approaching EOL (12/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P79620-B21` | HPE 30.72TB NVMe Gen5 Mainstream Performance Very Read Optimized EC1 EDSFF Self-encrypting 6550 SSD | Drive Enclosures / Drives | $1,40,919 | 12/31/2026 | 0.00% | ⚠️ Approaching EOL (12/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P79623-B21` | HPE 61.44TB NVMe Gen5 Mainstream Performance Very Read Optimized EC1 EDSFF Self-encrypting 6550 SSD | Drive Enclosures / Drives | $2,55,131 | 12/31/2026 | 0.00% | ⚠️ Approaching EOL (12/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `R8V76A` | SUSE Linux Enterprise Server 1-2 Sockets Unlimited VM w/Live Patching 1-year 24x7 Flexible LTU | Software & Licenses | $0 | 01/04/2027 | 0.00% | ⚠️ Approaching EOL (01/04/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `R8V74A` | SUSE Linux Enterprise Server 1-2 Sockets Unlimited VM w/Live Patching 1-year 9x5 Flexible LTU | Software & Licenses | $0 | 01/04/2027 | 0.00% | ⚠️ Approaching EOL (01/04/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `R8V77A` | SUSE Linux Enterprise Server 1-2 Sockets Unlimited VM w/Live Patching 3-year 24x7 Flexible LTU | Software & Licenses | $0 | 01/04/2027 | 0.00% | ⚠️ Approaching EOL (01/04/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `R8V75A` | SUSE Linux Enterprise Server 1-2 Sockets Unlimited VM w/Live Patching 3-year 9x5 Flexible LTU | Software & Licenses | $0 | 01/04/2027 | 0.00% | ⚠️ Approaching EOL (01/04/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `R8V78A` | SUSE Linux Enterprise Server 1-2 Sockets Unlimited VM w/Live Patching 5-year 24x7 Flexible LTU | Software & Licenses | $0 | 01/04/2027 | 0.00% | ⚠️ Approaching EOL (01/04/2027). Valid for immediate builds; verify multi-year roadmaps. |
*... [46 additional impending EOL records omitted for brevity]*

## 📊 5b. Category-Level Trends & Significant Price Adjustments

### Category Portfolio Delta & Planning Intelligence

| Category | Total SKUs | Added | Modified | Unchanged | Clearance / Drops | Category Planning Insight |
|---|---:|---:|---:|---:|---:|---|
| **Chassis** | 1 | 0 | 1 | 0 | 0 | 🔄 Attributes/specifications updated (1 SKUs) |
| **Accessories & Infrastructure** | 10 | 0 | 10 | 0 | 0 | 🔄 Attributes/specifications updated (10 SKUs) |
| **Processor** | 19 | 0 | 19 | 0 | 0 | 🔄 Attributes/specifications updated (19 SKUs) |
| **Cooling / Thermal** | 2 | 0 | 2 | 0 | 0 | 🔄 Attributes/specifications updated (2 SKUs) |
| **Memory** | 20 | 0 | 20 | 0 | 0 | 🔄 Attributes/specifications updated (20 SKUs) |
| **Storage Controllers** | 13 | 0 | 13 | 0 | 0 | 🔄 Attributes/specifications updated (13 SKUs) |
| **Cables & Enablement Kits** | 31 | 1 | 30 | 0 | 0 | ✨ Portfolio expanding (+1 new options) |
| **Drive Enclosures / Drives** | 108 | 0 | 108 | 0 | 0 | 🔄 Attributes/specifications updated (108 SKUs) |
| **Factory Configuration Settings** | 1 | 0 | 1 | 0 | 0 | 🔄 Attributes/specifications updated (1 SKUs) |
| **Software & Licenses** | 175 | 51 | 124 | 0 | 0 | ✨ Portfolio expanding (+51 new options) |
| **PCIe Risers** | 2 | 0 | 2 | 0 | 0 | 🔄 Attributes/specifications updated (2 SKUs) |
| **Networking** | 22 | 0 | 22 | 0 | 0 | 🔄 Attributes/specifications updated (22 SKUs) |
| **Graphics & GPU** | 5 | 3 | 2 | 0 | 0 | ✨ Portfolio expanding (+3 new options) |
| **Power Supplies** | 3 | 0 | 3 | 0 | 0 | 🔄 Attributes/specifications updated (3 SKUs) |
| **HPE Compute Ops Management** | 1 | 1 | 0 | 0 | 0 | ✨ Portfolio expanding (+1 new options) |

## 🔄 5. Recent Attribute & Specification Modifications Log

| Timestamp | Source | SKU | Attribute | Old Value | New Value | Detail |
|-----------|--------|-----|-----------|-----------|-----------|--------|
| 2026-09-13 | Services | `S6L39A` | Vendor Attributes | {"Extended Price (USD)":"0"} | **N/A** | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "N/A" |
| 2026-09-13 | Services | `S6L37A` | Description | Microsoft Windows Server 2025 16-core Datacenter Reassignment Reseller Option Kit WW ESD LTU | **N/A** | Description: "Microsoft Windows Server 2025 16-core Datacenter Reassignment Reseller Option Kit WW ESD LTU" → "N/A" |
| 2026-09-13 | Services | `S6L37A` | Option Type | Service | **N/A** | Option Type: "Service" → "N/A" |
| 2026-09-13 | Services | `S6L37A` | Start Date | 09/02/2025 | **N/A** | Start Date: "09/02/2025" → "N/A" |
| 2026-09-13 | Services | `S6L37A` | Discontinued Date | 11/30/2027 | **N/A** | Discontinued Date: "11/30/2027" → "N/A" |
| 2026-09-13 | Services | `S6L37A` | Lifecycle Status | Active | **N/A** | Lifecycle Status: "Active" → "N/A" |
| 2026-09-13 | Services | `S6L37A` | Availability | Available | **N/A** | Availability: "Available" → "N/A" |
| 2026-09-13 | Services | `S6L37A` | Lead Time Source | Not published by OCA | **N/A** | Lead Time Source: "Not published by OCA" → "N/A" |
| 2026-09-13 | Services | `S6L37A` | Vendor Attributes | {"Extended Price (USD)":"0"} | **N/A** | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "N/A" |
| 2026-09-13 | Services | `S6L36A` | Description | Microsoft Windows Server 2025 16-core Datacenter Reseller Option Kit WW ESD LTU | **N/A** | Description: "Microsoft Windows Server 2025 16-core Datacenter Reseller Option Kit WW ESD LTU" → "N/A" |
| 2026-09-13 | Services | `S6L36A` | Option Type | Service | **N/A** | Option Type: "Service" → "N/A" |
| 2026-09-13 | Services | `S6L36A` | Start Date | 09/02/2025 | **N/A** | Start Date: "09/02/2025" → "N/A" |
| 2026-09-13 | Services | `S6L36A` | Discontinued Date | 11/30/2027 | **N/A** | Discontinued Date: "11/30/2027" → "N/A" |
| 2026-09-13 | Services | `S6L36A` | Lifecycle Status | Active | **N/A** | Lifecycle Status: "Active" → "N/A" |
| 2026-09-13 | Services | `S6L36A` | Availability | Available | **N/A** | Availability: "Available" → "N/A" |
| 2026-09-13 | Services | `S6L36A` | Lead Time Source | Not published by OCA | **N/A** | Lead Time Source: "Not published by OCA" → "N/A" |
| 2026-09-13 | Services | `S6L36A` | Vendor Attributes | {"Extended Price (USD)":"0"} | **N/A** | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "N/A" |
| 2026-09-13 | Services | `S6L38A` | Description | Microsoft Windows Server 2025 16-core Standard Reseller Option Kit WW ESD LTU | **N/A** | Description: "Microsoft Windows Server 2025 16-core Standard Reseller Option Kit WW ESD LTU" → "N/A" |
| 2026-09-13 | Services | `S6L38A` | Option Type | Service | **N/A** | Option Type: "Service" → "N/A" |
| 2026-09-13 | Services | `S6L38A` | Start Date | 09/02/2025 | **N/A** | Start Date: "09/02/2025" → "N/A" |
| 2026-09-13 | Services | `S6L38A` | Discontinued Date | 11/30/2027 | **N/A** | Discontinued Date: "11/30/2027" → "N/A" |
| 2026-09-13 | Services | `S6L38A` | Lifecycle Status | Active | **N/A** | Lifecycle Status: "Active" → "N/A" |
| 2026-09-13 | Services | `S6L38A` | Availability | Available | **N/A** | Availability: "Available" → "N/A" |
| 2026-09-13 | Services | `S6L38A` | Lead Time Source | Not published by OCA | **N/A** | Lead Time Source: "Not published by OCA" → "N/A" |
| 2026-09-13 | Services | `S6L38A` | Vendor Attributes | {"Extended Price (USD)":"0"} | **N/A** | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "N/A" |

### Current Scrape SKU Attribute Deltas

| SKU | Source | Diff Status | Attribute Changes (Old → New) |
|-----|--------|-------------|-------------------------------|
| `R8V76A` | Hardware | ADDED | New SKU introduced |
| `R8V74A` | Hardware | ADDED | New SKU introduced |
| `R8V77A` | Hardware | ADDED | New SKU introduced |
| `R8V75A` | Hardware | ADDED | New SKU introduced |
| `R8V78A` | Hardware | ADDED | New SKU introduced |
| `R8V79A` | Hardware | ADDED | New SKU introduced |
| `R8V72A` | Hardware | ADDED | New SKU introduced |
| `R8V73A` | Hardware | ADDED | New SKU introduced |
| `S7N87A` | Hardware | ADDED | New SKU introduced |
| `S7P10A` | Hardware | ADDED | New SKU introduced |
| `S7N88A` | Hardware | ADDED | New SKU introduced |
| `S7P11A` | Hardware | ADDED | New SKU introduced |
| `S2L70C` | Hardware | ADDED | New SKU introduced |
| `S6W30C` | Hardware | ADDED | New SKU introduced |
| `S0K89C` | Hardware | ADDED | New SKU introduced |
| `R1C65A` | Hardware | ADDED | New SKU introduced |
| `S1A05A` | Hardware | ADDED | New SKU introduced |
| `S6K30B` | Hardware | ADDED | New SKU introduced |
| `S6L35B` | Hardware | ADDED | New SKU introduced |
| `S6L28B` | Hardware | ADDED | New SKU introduced |
| `R8V84A` | Hardware | ADDED | New SKU introduced |
| `R8V85A` | Hardware | ADDED | New SKU introduced |
| `S3R49A` | Hardware | ADDED | New SKU introduced |
| `S3R50A` | Hardware | ADDED | New SKU introduced |
| `S3R51A` | Hardware | ADDED | New SKU introduced |
| `S3R52A` | Hardware | ADDED | New SKU introduced |
| `S3R53A` | Hardware | ADDED | New SKU introduced |
| `S3R54A` | Hardware | ADDED | New SKU introduced |
| `S7N85A` | Hardware | ADDED | New SKU introduced |
| `S7N86A` | Hardware | ADDED | New SKU introduced |
| `S7N89A` | Hardware | ADDED | New SKU introduced |
| `S7N90A` | Hardware | ADDED | New SKU introduced |
| `S7N91A` | Hardware | ADDED | New SKU introduced |
| `S7N92A` | Hardware | ADDED | New SKU introduced |
| `S7N93A` | Hardware | ADDED | New SKU introduced |
| `S7N94A` | Hardware | ADDED | New SKU introduced |
| `S7P12A` | Hardware | ADDED | New SKU introduced |
| `S7P13A` | Hardware | ADDED | New SKU introduced |
| `S6L45A` | Hardware | ADDED | New SKU introduced |
| `S6L44A` | Hardware | ADDED | New SKU introduced |
| `S6L41A` | Hardware | ADDED | New SKU introduced |
| `S6L47A` | Hardware | ADDED | New SKU introduced |
| `S6L46A` | Hardware | ADDED | New SKU introduced |
| `S6L48A` | Hardware | ADDED | New SKU introduced |
| `S6L43A` | Hardware | ADDED | New SKU introduced |
| `S4T26A` | Hardware | ADDED | New SKU introduced |
| `S4T27A` | Hardware | ADDED | New SKU introduced |
| `S4T22A` | Hardware | ADDED | New SKU introduced |
| `S4T23A` | Hardware | ADDED | New SKU introduced |
| `S4T24A` | Hardware | ADDED | New SKU introduced |

## 🧩 6. Same-Product CTO Variant Matrix

| Chassis Identifier | Product Family | Generation | Form Factor | CTO Base SKU |
|--------------------|----------------|------------|-------------|--------------|
| **DL145_Gen11** | ProLiant | Gen11 | 4EDSFF | `P71964-B21` |

## ⏱️ 10. Supply Chain & Delivery Lead Time Intelligence

### Confirmed Component Delivery SLAs

| Product # | Description | Category | Lead Time | Channel Status |
|---|---|---|---:|---|
| `P71964-B21` | HPE ProLiant DL145 Gen11 Configure-to-order Server | Chassis | EDT 22 - 28 days | Available in OCA product catalog |

