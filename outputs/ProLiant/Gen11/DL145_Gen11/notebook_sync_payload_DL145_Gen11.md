# HPE DL145_Gen11 — Synchronized Catalog Knowledge

**Target Product**: `DL145_Gen11`

**Scope Identity**: `HPE/SERVER/ProLiant/Gen11/DL145_Gen11`

**Sync Timestamp**: 2026-11-21T13:28:30.535Z

**Total Verified SKUs**: `613` (`487` Hardware + `126` Services)

**Total Synced KnowledgeDeltas**: `22`

This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.

---

## 🚀 Executive Delta & Recent Change Summary

| Category | Total SKUs | Added (Last Scrape) | Price Changed | Attribute Changed | Price & Attr Changed | Reinstated | Status |
|----------|------------|---------------------|---------------|-------------------|----------------------|------------|--------|
| **Hardware Components** | 487 | 96 | 0 | 271 | 171 | 0 | **CERTIFIED** |
| **Support Services & SLAs** | 126 | 7 | 0 | 0 | 119 | 0 | **CERTIFIED** |
| **Total Portfolio** | **613** | **103** | **0** | **271** | **290** | **0** | **ACTIVE** |


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

## 🏛️ 2. Family & Generation Rules (ProLiant Gen11)

*No verified family/generation rules are registered for this product.*

## 🎯 3. Chassis & Solution-Type Gotchas (DL145_Gen11)

*No specific gotchas logged for DL145_Gen11. Baseline chassis layout rules active.*

## 🔒 3b. Physical & Architectural Gating Rules (DOM Unavailable Tables)

### Memory Technology & Density Mixing Constraints

1. **[Memory]**: All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.
   - **Gated Rule Type**: `MEMORY_MIXING`
   - **Affected SKUs (8)**: `P50312-F21`, `P64986-F21`, `P50309-F21`, `P64985-F21`, `P64987-F21`, `P64988-F21`, `P66676-F21`, `P69982-F21`

### Base Chassis & Form Factor Compatibility Gates

1. **[Storage Devices]**: If HPE DL145 Gen11 Opt ACC FIO Config is selected, then these EDSFF drives cannot be selected with direct attach. (Only controller mode).
   - **Gated Rule Type**: `CHASSIS_GATE`
   - **Affected SKUs (4)**: `P79615-B21`, `P79618-B21`, `P79620-B21`, `P79623-B21`

### Component Mutual Exclusion Rules

1. **[Rack Options]**: "HPE DL145 Gen11 Desk/Wall Mount Kit" and "HPE DL145 Gen11 Rack enable kit" cannot be selected together.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `P72006-B21`

2. **[Factory Configuration Settings]**: CE Mark label SKU (P35876-B21) should be visible only when selecting Lot9 SKU's in the configuration
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `P35876-B21`

3. **[Networking]**: Max quantity of product limited by space available.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (7)**: `P10097-B21`, `P10115-B21`, `P42041-B21`, `P08449-B21`, `P10106-B21`, `P26256-B21`, `P26269-B21`

4. **[Power and Cooling]**: Mixing of Power Supplies is not allowed.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (2)**: `P44975-B21`, `P43150-B21`

5. **[Power and Cooling]**: If AC Power Supply is selected then only AC Power Cords should be in the drop-down.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `Q0H80A`

### CTO vs BTO Factory Integration Rules

1. **[Memory]**: BTO Memories are not allowed in CTO Base Model.
   - **Gated Rule Type**: `BTO_DISALLOWED`
   - **Affected SKUs (9)**: `P50309-B21`, `P50311-B21`, `P50312-B21`, `P64984-B21`, `P64985-B21`, `P64986-B21`, `P64987-B21`, `P64988-B21`, `P66676-B21`

2. **[Power and Cooling]**: BTO products are not allowed in CTO Base Model.
   - **Gated Rule Type**: `BTO_DISALLOWED`
   - **Affected SKUs (2)**: `A0K02A`, `A0N33A`

## ⚠️ 4. Discontinued & Obsolete SKUs Registry

### Fully Discontinued & Delisted SKUs

| SKU | Description | Status | Discontinued Date | Last Known Price | Successor SKU | Tracking |
|-----|-------------|--------|-------------------|------------------|---------------|----------|
| `P69234-B21` | HPE 1.92TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 CD8P SSD | **DISCONTINUED** | 2026-11-20 | $19743.00 | None | STOPPED_AFTER_REMOVAL |
| `P69241-B21` | HPE 1.6TB NVMe Gen5 Mainstream Performance Mixed Use E3S EC1 CD8P SSD | **DISCONTINUED** | 2026-11-20 | $20109.00 | None | STOPPED_AFTER_REMOVAL |
| `P69243-B21` | HPE 3.2TB NVMe Gen5 Mainstream Performance Mixed Use E3S EC1 CD8P SSD | **DISCONTINUED** | 2026-11-20 | $27452.00 | None | STOPPED_AFTER_REMOVAL |
| `P69245-B21` | HPE 6.4TB NVMe Gen5 Mainstream Performance Mixed Use E3S EC1 CD8P SSD | **DISCONTINUED** | 2026-11-20 | $44109.00 | None | STOPPED_AFTER_REMOVAL |

### ⏳ Impending Obsolescence & Clearance Hardware (90-Day to 180-Day Window)

*These components remain orderable in live configurators today but have published vendor end dates. They represent high-value clearance opportunities for immediate deployments, but require explicit procurement cutoff remarks before quotation:*

| Product # | Description | Category | List Price (USD) | Discontinued Date | Price Trend | Presales Strategy Guidance |
|---|---|---|---:|---|:---:|---|
| `P63930-B21` | HPE 3.84TB NVMe Gen4 Mainstream Performance Very Read Optimized E3S EC1 EDSFF P5430 SSD | Drive Enclosures / Drives | $7,781 | 01/31/2027 | -73.34% | 🔥 **Clearance Opportunity** (-73.34% CapEx savings). Procure before 01/31/2027. |
| `P69237-B21` | HPE 3.84TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 CD8P SSD | Drive Enclosures / Drives | $30,682 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P61183-B21` | HPE 7.68TB NVMe Gen5 High Performance Read Intensive E3S EC1 EDSFF SPDM CM7 SSD | Drive Enclosures / Drives | $75,784 | 02/28/2027 | 0.00% | ⚠️ Approaching EOL (02/28/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P69239-B21` | HPE 7.68TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 CD8P SSD | Drive Enclosures / Drives | $44,109 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P57799-B21` | HPE 3.84TB NVMe Gen5 High Performance Read Intensive E3S EC1 EDSFF SPDM PM1743 SSD | Drive Enclosures / Drives | $36,705 | 09/30/2026 | 0.00% | ⚠️ Approaching EOL (09/30/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P57807-B21` | HPE 15.36TB NVMe Gen5 High Performance Read Intensive E3S EC1 EDSFF SPDM PM1743 SSD | Drive Enclosures / Drives | $1,27,927 | 10/31/2026 | +100.00% | ⚠️ Approaching EOL (10/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P61179-B21` | HPE 3.84TB NVMe Gen5 High Performance Read Intensive E3S EC1 EDSFF SPDM CM7 SSD | Drive Enclosures / Drives | $47,029 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P61187-B21` | HPE 15.36TB NVMe Gen5 High Performance Read Intensive E3S EC1 EDSFF SPDM CM7 SSD | Drive Enclosures / Drives | $1,18,842 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P61191-B21` | HPE 3.2TB NVMe Gen5 High Performance Mixed Use E3S EC1 EDSFF SPDM CM7 SSD | Drive Enclosures / Drives | $42,682 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P61195-B21` | HPE 6.4TB NVMe Gen5 High Performance Mixed Use E3S EC1 EDSFF SPDM CM7 SSD | Drive Enclosures / Drives | $60,093 | 02/01/2027 | 0.00% | ⚠️ Approaching EOL (02/01/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P63938-B21` | HPE 15.36TB NVMe Gen4 Mainstream Performance Very Read Optimized E3S EC1 EDSFF P5430 SSD | Drive Enclosures / Drives | $96,543 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P69546-B21` | HPE 15.36TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 CD8P SSD | Drive Enclosures / Drives | $75,476 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P79965-B21` | HPE 30.72TB NVMe Gen5 High Performance Read Intensive E3.S EC1 EDSFF SPDM 9550 SSD | Drive Enclosures / Drives | $1,69,476 | 04/30/2027 | 0.00% | ⚠️ Approaching EOL (04/30/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P69234-B21` | [REMOVED SKU] HPE 1.92TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 CD8P SSD | Drive Enclosures / Drives | $19,743 | 2026-11-20 | -100.00% | 🔥 **Clearance Opportunity** (-100.00% CapEx savings). Procure before 2026-11-20. |
| `P69241-B21` | [REMOVED SKU] HPE 1.6TB NVMe Gen5 Mainstream Performance Mixed Use E3S EC1 CD8P SSD | Drive Enclosures / Drives | $20,109 | 2026-11-20 | -100.00% | 🔥 **Clearance Opportunity** (-100.00% CapEx savings). Procure before 2026-11-20. |
| `P69243-B21` | [REMOVED SKU] HPE 3.2TB NVMe Gen5 Mainstream Performance Mixed Use E3S EC1 CD8P SSD | Drive Enclosures / Drives | $27,452 | 2026-11-20 | -100.00% | 🔥 **Clearance Opportunity** (-100.00% CapEx savings). Procure before 2026-11-20. |
| `P69245-B21` | [REMOVED SKU] HPE 6.4TB NVMe Gen5 Mainstream Performance Mixed Use E3S EC1 CD8P SSD | Drive Enclosures / Drives | $44,109 | 2026-11-20 | -100.00% | 🔥 **Clearance Opportunity** (-100.00% CapEx savings). Procure before 2026-11-20. |
| `P79615-B21` | HPE 30.72TB NVMe Gen5 Mainstream Performance Very Read Optimized E3.S EC1 EDSFF 6550 SSD | Drive Enclosures / Drives | $1,40,919 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P79620-B21` | HPE 30.72TB NVMe Gen5 Mainstream Performance Very Read Optimized EC1 EDSFF Self-encrypting 6550 SSD | Drive Enclosures / Drives | $1,40,919 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P79623-B21` | HPE 61.44TB NVMe Gen5 Mainstream Performance Very Read Optimized EC1 EDSFF Self-encrypting 6550 SSD | Drive Enclosures / Drives | $2,55,131 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P69237-B21` | HPE 3.84TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 CD8P SSD | Drive Enclosures / Drives | $30,682 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P69239-B21` | HPE 7.68TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 CD8P SSD | Drive Enclosures / Drives | $44,109 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P69546-B21` | HPE 15.36TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 CD8P SSD | Drive Enclosures / Drives | $75,476 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77095-291` | Microsoft Windows Server 2025 16-core Standard FIO Not Pre-installed Japanese SW | Software & Licenses | $0 | 02/28/2027 | 0.00% | ⚠️ Approaching EOL (02/28/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77095-B21` | Microsoft Windows Server 2025 16-core Standard FIO Not Pre-installed en/fr/de/es/it/pt/nl SW | Software & Licenses | $1,147 | 02/28/2027 | 0.00% | ⚠️ Approaching EOL (02/28/2027). Valid for immediate builds; verify multi-year roadmaps. |
*... [42 additional impending EOL records omitted for brevity]*

## 📊 5b. Category-Level Trends & Significant Price Adjustments

### Category Portfolio Delta & Planning Intelligence

| Category | Total SKUs | Added | Modified | Unchanged | Clearance / Drops | Category Planning Insight |
|---|---:|---:|---:|---:|---:|---|
| **Chassis** | 1 | 0 | 1 | 0 | 0 | 🔄 Attributes/specifications updated (1 SKUs) |
| **Accessories & Infrastructure** | 5 | 0 | 5 | 0 | 0 | 🔄 Attributes/specifications updated (5 SKUs) |
| **Cooling / Thermal** | 6 | 0 | 6 | 0 | 0 | 🔄 Attributes/specifications updated (6 SKUs) |
| **Rack Options** | 1 | 0 | 1 | 0 | 0 | 🔄 Attributes/specifications updated (1 SKUs) |
| **Processor** | 19 | 0 | 19 | 0 | 0 | 🔄 Attributes/specifications updated (19 SKUs) |
| **Memory** | 20 | 0 | 20 | 0 | 0 | 🔄 Attributes/specifications updated (20 SKUs) |
| **Storage Controllers** | 16 | 0 | 16 | 0 | 0 | 🔄 Attributes/specifications updated (16 SKUs) |
| **Drive Enclosures / Drives** | 145 | 1 | 140 | 4 | 15 | ⚠️ Active price drops / clearance (15 SKUs discounted) |
| **Factory Configuration Settings** | 1 | 0 | 1 | 0 | 0 | 🔄 Attributes/specifications updated (1 SKUs) |
| **Software & Licenses** | 268 | 95 | 173 | 0 | 0 | ✨ Portfolio expanding (+95 new options) |
| **PCIe Risers** | 2 | 0 | 2 | 0 | 0 | 🔄 Attributes/specifications updated (2 SKUs) |
| **Networking** | 22 | 0 | 22 | 0 | 0 | 🔄 Attributes/specifications updated (22 SKUs) |
| **Cables & Enablement Kits** | 27 | 0 | 27 | 0 | 0 | 🔄 Attributes/specifications updated (27 SKUs) |
| **Graphics & GPU** | 5 | 0 | 5 | 0 | 0 | 🔄 Attributes/specifications updated (5 SKUs) |
| **Power Supplies** | 1 | 0 | 1 | 0 | 0 | 🔄 Attributes/specifications updated (1 SKUs) |
| **Security Options** | 3 | 0 | 3 | 0 | 0 | 🔄 Attributes/specifications updated (3 SKUs) |

### High-Impact Price Adjustments (Drops $\ge 10\%$ and Major Moves)

| Product # | Description | Category | Previous Price | Current Price | Delta (USD) | Change (%) | Movement Type |
|---|---|---|---:|---:|---:|---:|---|
| `P69245-B21` | [REMOVED SKU] HPE 6.4TB NVMe Gen5 Mainstream Performance Mixed Use E3S EC1 CD8P SSD | Drive Enclosures / Drives | $44,109 | $44,109 | $-44,109 | **-100.0%** | 📉 CLEARANCE_DROP |
| `P57803-B21` | HPE 7.68TB NVMe Gen5 High Performance Read Intensive E3S EC1 EDSFF SPDM PM1743 SSD | Drive Enclosures / Drives | $68,440 | $27,476 | $-40,964 | **-59.9%** | 📉 CLEARANCE_DROP |
| `P63934-B21` | HPE 7.68TB NVMe Gen4 Mainstream Performance Very Read Optimized E3S EC1 EDSFF P5430 SSD | Drive Enclosures / Drives | $49,219 | $9,712 | $-39,507 | **-80.3%** | 📉 CLEARANCE_DROP |
| `P91231-B21` | HPE 7.68TB NVMe Gen5 High Performance Read Intensive E3.S EC1 E3 Thin Multi Vendor SSD | Drive Enclosures / Drives | $62,558 | $30,331 | $-32,227 | **-51.5%** | 📉 CLEARANCE_DROP |
| `P91231-B21` | HPE 7.68TB NVMe Gen5 High Performance Read Intensive E3.S EC1 E3 Thin Multi Vendor SSD | Drive Enclosures / Drives | $62,558 | $30,331 | $-32,227 | **-51.5%** | 📉 CLEARANCE_DROP |
| `P69243-B21` | [REMOVED SKU] HPE 3.2TB NVMe Gen5 Mainstream Performance Mixed Use E3S EC1 CD8P SSD | Drive Enclosures / Drives | $27,452 | $27,452 | $-27,452 | **-100.0%** | 📉 CLEARANCE_DROP |
| `P70669-B21` | HPE 3.2TB NVMe Gen5 High Performance Mixed Use E3S EC1 Self-encrypting FIPS 140-3 CM7 SSD | Drive Enclosures / Drives | $40,759 | $16,870 | $-23,889 | **-58.6%** | 📉 CLEARANCE_DROP |
| `P70669-B21` | HPE 3.2TB NVMe Gen5 High Performance Mixed Use E3S EC1 Self-encrypting FIPS 140-3 CM7 SSD | Drive Enclosures / Drives | $40,759 | $16,870 | $-23,889 | **-58.6%** | 📉 CLEARANCE_DROP |
| `P63930-B21` | HPE 3.84TB NVMe Gen4 Mainstream Performance Very Read Optimized E3S EC1 EDSFF P5430 SSD | Drive Enclosures / Drives | $29,188 | $7,781 | $-21,407 | **-73.3%** | 📉 CLEARANCE_DROP |
| `P91088-B21` | HPE 6.4TB NVMe Gen5 Mainstream Performance Mixed Use E3.S EC1 E3 Thin Multi Vendor SSD | Drive Enclosures / Drives | $43,643 | $23,265 | $-20,378 | **-46.7%** | 📉 CLEARANCE_DROP |
| `P91088-B21` | HPE 6.4TB NVMe Gen5 Mainstream Performance Mixed Use E3.S EC1 E3 Thin Multi Vendor SSD | Drive Enclosures / Drives | $43,643 | $23,265 | $-20,378 | **-46.7%** | 📉 CLEARANCE_DROP |
| `P69241-B21` | [REMOVED SKU] HPE 1.6TB NVMe Gen5 Mainstream Performance Mixed Use E3S EC1 CD8P SSD | Drive Enclosures / Drives | $20,109 | $20,109 | $-20,109 | **-100.0%** | 📉 CLEARANCE_DROP |
| `P69234-B21` | [REMOVED SKU] HPE 1.92TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 CD8P SSD | Drive Enclosures / Drives | $19,743 | $19,743 | $-19,743 | **-100.0%** | 📉 CLEARANCE_DROP |
| `P70674-B21` | HPE 7.68TB NVMe Gen5 High Performance Read Intensive E3S EC1 Self-encrypting FIPS 140-3 CM7 SSD | Drive Enclosures / Drives | $60,093 | $47,438 | $-12,655 | **-21.1%** | 📉 CLEARANCE_DROP |
| `P70674-B21` | HPE 7.68TB NVMe Gen5 High Performance Read Intensive E3S EC1 Self-encrypting FIPS 140-3 CM7 SSD | Drive Enclosures / Drives | $60,093 | $47,438 | $-12,655 | **-21.1%** | 📉 CLEARANCE_DROP |
| `R3R01AAE` | NVIDIA Virtual Applications 1 Concurrent User Perpetual E-LTU | Software & Licenses | New Addition | $51 | $51 | **+100.0%** | ✨ NEW_OPTION |
| `P77111-B21` | Microsoft Windows Server 2025 1 Device CAL WW LTU | Software & Licenses | New Addition | $52 | $52 | **+100.0%** | ✨ NEW_OPTION |
| `P46191-B21` | Microsoft Windows Server 2022 1 User CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | Software & Licenses | New Addition | $55 | $55 | **+100.0%** | ✨ NEW_OPTION |
| `R3Q77AAE` | NVIDIA Virtual Applications SUMS 1 Concurrent User 5-year Subscription E-LTU | Software & Licenses | New Addition | $59 | $59 | **+100.0%** | ✨ NEW_OPTION |
| `R3Q68AAE` | NVIDIA RTX Virtual Workstation SUMS 1 Concurrent User Education 1-year Subscription Renewal E-LTU | Software & Licenses | New Addition | $62 | $62 | **+100.0%** | ✨ NEW_OPTION |
*... [88 additional price movements omitted for brevity]*

## 🔄 5. Recent Attribute & Specification Modifications Log

| Timestamp | Source | SKU | Attribute | Old Value | New Value | Detail |
|-----------|--------|-----|-----------|-----------|-----------|--------|
| 2026-11-20 | Services | `S8M87AAE` | Sub-Category | NVIDIA GPU SW | **Server Management & Operating System Licenses** | Sub-Category: "NVIDIA GPU SW" → "Server Management & Operating System Licenses" |
| 2026-11-20 | Services | `S8M87AAE` | Description | NVIDIA RTX PRO 4500 Blackwell Server Edition per GPU 3-year E-LTU | **N/A** | Description: "NVIDIA RTX PRO 4500 Blackwell Server Edition per GPU 3-year E-LTU" → "N/A" |
| 2026-11-20 | Services | `S8M87AAE` | Constraint | no max | **N/A** | Constraint: "no max" → "N/A" |
| 2026-11-20 | Services | `S8M87AAE` | Rule/Note | Selection constraint for NVIDIA GPU SW: no max | **N/A** | Rule/Note: "Selection constraint for NVIDIA GPU SW: no max" → "N/A" |
| 2026-11-20 | Services | `S8M87AAE` | Option Type | Service | **N/A** | Option Type: "Service" → "N/A" |
| 2026-11-20 | Services | `S8M87AAE` | Start Date | 08/03/2026 | **N/A** | Start Date: "08/03/2026" → "N/A" |
| 2026-11-20 | Services | `S8M87AAE` | Discontinued Date | 10/08/2029 | **N/A** | Discontinued Date: "10/08/2029" → "N/A" |
| 2026-11-20 | Services | `S8M87AAE` | Lifecycle Status | Active | **N/A** | Lifecycle Status: "Active" → "N/A" |
| 2026-11-20 | Services | `S8M87AAE` | CLIC Status | Active | **N/A** | CLIC Status: "Active" → "N/A" |
| 2026-11-20 | Services | `S8M87AAE` | Availability | Available | **N/A** | Availability: "Available" → "N/A" |
| 2026-11-20 | Services | `S8M87AAE` | Lead Time Source | Not published by OCA | **N/A** | Lead Time Source: "Not published by OCA" → "N/A" |
| 2026-11-20 | Services | `S8M87AAE` | Vendor Attributes | {"Extended Price (USD)":"0"} | **N/A** | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "N/A" |
| 2026-11-20 | Services | `S8M88AAE` | Main Category | Graphics & GPU | **Software & Licenses** | Main Category: "Graphics & GPU" → "Software & Licenses" |
| 2026-11-20 | Services | `S8M88AAE` | Sub-Category | NVIDIA GPU SW | **Server Management & Operating System Licenses** | Sub-Category: "NVIDIA GPU SW" → "Server Management & Operating System Licenses" |
| 2026-11-20 | Services | `S8M88AAE` | Description | NVIDIA RTX PRO 4500 Blackwell Server Edition per GPU 5-year E-LTU | **N/A** | Description: "NVIDIA RTX PRO 4500 Blackwell Server Edition per GPU 5-year E-LTU" → "N/A" |
| 2026-11-20 | Services | `S8M88AAE` | Constraint | no max | **N/A** | Constraint: "no max" → "N/A" |
| 2026-11-20 | Services | `S8M88AAE` | Rule/Note | Selection constraint for NVIDIA GPU SW: no max | **N/A** | Rule/Note: "Selection constraint for NVIDIA GPU SW: no max" → "N/A" |
| 2026-11-20 | Services | `S8M88AAE` | Option Type | Service | **N/A** | Option Type: "Service" → "N/A" |
| 2026-11-20 | Services | `S8M88AAE` | Start Date | 08/03/2026 | **N/A** | Start Date: "08/03/2026" → "N/A" |
| 2026-11-20 | Services | `S8M88AAE` | Discontinued Date | 10/08/2029 | **N/A** | Discontinued Date: "10/08/2029" → "N/A" |
| 2026-11-20 | Services | `S8M88AAE` | Lifecycle Status | Active | **N/A** | Lifecycle Status: "Active" → "N/A" |
| 2026-11-20 | Services | `S8M88AAE` | CLIC Status | Active | **N/A** | CLIC Status: "Active" → "N/A" |
| 2026-11-20 | Services | `S8M88AAE` | Availability | Available | **N/A** | Availability: "Available" → "N/A" |
| 2026-11-20 | Services | `S8M88AAE` | Lead Time Source | Not published by OCA | **N/A** | Lead Time Source: "Not published by OCA" → "N/A" |
| 2026-11-20 | Services | `S8M88AAE` | Vendor Attributes | {"Extended Price (USD)":"0"} | **N/A** | Vendor Attributes: "{"Extended Price (USD)":"0"}" → "N/A" |

### Current Scrape SKU Attribute Deltas

| SKU | Source | Diff Status | Attribute Changes (Old → New) |
|-----|--------|-------------|-------------------------------|
| `P71964-B21` | Hardware | ATTRIBUTE_CHANGED | CLIC Status: "Active" → "Valid"; Lead Time: "EDT 22 - 28 days" → "(None)"; Lead Time Source: "OCA selected configuration estimate" → "Not published by OCA"; Speed Tier: "(None)" → "Unpublished" |
| `P22020-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Chassis Infrastructure"; Discontinued Date: "05/31/2028" → "06/30/2028"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "3"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":89,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P52349-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Chassis Infrastructure"; Discontinued Date: "06/30/2028" → "07/31/2028"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "4"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "4"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":373,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P72008-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Chassis Infrastructure"; Discontinued Date: "06/30/2028" → "07/31/2028"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "8"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "8"; Speed Tier: "(None)" → "Standard Delivery (8-30d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":86,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}" |
| `P78764-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Chassis Infrastructure"; Discontinued Date: "06/30/2028" → "07/31/2028"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "8"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "8"; Speed Tier: "(None)" → "Standard Delivery (8-30d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":110,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P72006-B21` | Hardware | ATTRIBUTE_CHANGED | Main Category: "Accessories & Infrastructure" → "Cooling / Thermal"; Sub-Category: "System Options" → "Heatsink Kit"; Constraint: "optional" → "max 1"; Rule/Note: ""HPE DL145 Gen11 Desk/Wall Mount Kit" and "HPE DL145 Gen11 Rack enable kit" cannot be selected together." → "Selection constraint for Heatsink Kit: max 1; P72006-B21 conditional visibility: portal selector activation required ("HPE DL145 Gen11 Desk/Wall Mount Kit" and "HPE DL145 Gen11 Rack enable kit" cannot be selected together.); PORTAL_CONDITIONAL"; Max Qty: "-3" → "1"; Component Role: "(None)" → "Cooling / Thermal"; Discontinued Date: "06/30/2028" → "07/31/2028"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "8"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "8"; Speed Tier: "(None)" → "Standard Delivery (8-30d)"; Portal Visibility: "(None)" → "PORTAL_CONDITIONAL"; Condition Type: "(None)" → "PORTAL_CONDITIONAL_VIEW"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":118,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P73006-B21` | Hardware | ATTRIBUTE_CHANGED | Main Category: "Accessories & Infrastructure" → "Rack Options"; Component Role: "(None)" → "Option Component"; Discontinued Date: "09/30/2099" → "10/31/2099"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "1"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "1"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"leadTime":"1","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":1,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}" |
| `P69259-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Processor"; Discontinued Date: "06/30/2028" → "07/31/2028"; CLIC Status: "Active" → "Unpublished"; Price Delta (USD): "0" → "-901.00"; Lead Time: "(None)" → "4"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "4"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0","Price Delta (USD)":"0"}" → "{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":1744,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P69260-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Processor"; Discontinued Date: "06/30/2028" → "07/31/2028"; CLIC Status: "Active" → "Unpublished"; Price Delta (USD): "0" → "Selected"; Lead Time: "(None)" → "4"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "4"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0","Price Delta (USD)":"0"}" → "{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2645,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P69258-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Processor"; Discontinued Date: "06/30/2028" → "07/31/2028"; CLIC Status: "Active" → "Unpublished"; Price Delta (USD): "0" → "-1,485.00"; Lead Time: "(None)" → "3"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0","Price Delta (USD)":"0"}" → "{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":1160,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P69261-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Processor"; Discontinued Date: "06/30/2028" → "07/31/2028"; CLIC Status: "Active" → "Unpublished"; Price Delta (USD): "0" → "+2,528.00"; Lead Time: "(None)" → "3"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0","Price Delta (USD)":"0"}" → "{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":5173,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P69262-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Processor"; Discontinued Date: "06/30/2028" → "07/31/2028"; CLIC Status: "Active" → "Unpublished"; Price Delta (USD): "0" → "+4,726.00"; Lead Time: "(None)" → "3"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0","Price Delta (USD)":"0"}" → "{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":7371,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P69263-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Processor"; Discontinued Date: "06/30/2028" → "07/31/2028"; CLIC Status: "Active" → "Unpublished"; Price Delta (USD): "0" → "+7,009.00"; Lead Time: "(None)" → "3"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0","Price Delta (USD)":"0"}" → "{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":9654,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P71859-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Processor"; Discontinued Date: "06/30/2028" → "07/31/2028"; CLIC Status: "Active" → "Unpublished"; Price Delta (USD): "0" → "-1,212.00"; Lead Time: "(None)" → "3"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0","Price Delta (USD)":"0"}" → "{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":1433,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P71862-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Processor"; Discontinued Date: "06/30/2028" → "07/31/2028"; CLIC Status: "Active" → "Unpublished"; Price Delta (USD): "0" → "-488.00"; Lead Time: "(None)" → "3"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0","Price Delta (USD)":"0"}" → "{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2157,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P71865-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Processor"; Discontinued Date: "06/30/2028" → "07/31/2028"; CLIC Status: "Active" → "Unpublished"; Price Delta (USD): "0" → "+313.00"; Lead Time: "(None)" → "3"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0","Price Delta (USD)":"0"}" → "{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2958,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P71871-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Processor"; Discontinued Date: "06/30/2028" → "07/31/2028"; CLIC Status: "Active" → "Unpublished"; Price Delta (USD): "0" → "+5,955.00"; Lead Time: "(None)" → "3"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0","Price Delta (USD)":"0"}" → "{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":8600,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P71874-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Processor"; Discontinued Date: "06/30/2028" → "07/31/2028"; CLIC Status: "Active" → "Unpublished"; Price Delta (USD): "0" → "+7,972.00"; Lead Time: "(None)" → "3"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0","Price Delta (USD)":"0"}" → "{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":10617,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P88840-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Processor"; Discontinued Date: "06/30/2028" → "07/31/2028"; CLIC Status: "Active" → "Unpublished"; Price Delta (USD): "0" → "+11,544.00"; Lead Time: "(None)" → "3"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0","Price Delta (USD)":"0"}" → "{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":14189,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P88850-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Processor"; Discontinued Date: "06/30/2028" → "07/31/2028"; CLIC Status: "Active" → "Unpublished"; Price Delta (USD): "0" → "-365.00"; Lead Time: "(None)" → "3"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0","Price Delta (USD)":"0"}" → "{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2280,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P71868-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Processor"; Discontinued Date: "06/30/2028" → "07/31/2028"; CLIC Status: "Active" → "Unpublished"; Price Delta (USD): "0" → "+3,156.00"; Lead Time: "(None)" → "4"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "4"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0","Price Delta (USD)":"0"}" → "{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":5801,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P88842-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Processor"; Discontinued Date: "06/30/2028" → "07/31/2028"; CLIC Status: "Active" → "Unpublished"; Price Delta (USD): "0" → "+9,228.00"; Lead Time: "(None)" → "4"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "4"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0","Price Delta (USD)":"0"}" → "{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":11873,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P88844-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Processor"; Discontinued Date: "06/30/2028" → "07/31/2028"; CLIC Status: "Active" → "Unpublished"; Price Delta (USD): "0" → "+6,346.00"; Lead Time: "(None)" → "21"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "21"; Speed Tier: "(None)" → "Standard Delivery (8-30d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0","Price Delta (USD)":"0"}" → "{"leadTime":"21","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":8991,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P88846-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Processor"; Discontinued Date: "06/30/2028" → "07/31/2028"; CLIC Status: "Active" → "Unpublished"; Price Delta (USD): "0" → "+3,991.00"; Lead Time: "(None)" → "21"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "21"; Speed Tier: "(None)" → "Standard Delivery (8-30d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0","Price Delta (USD)":"0"}" → "{"leadTime":"21","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":6636,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P88848-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Processor"; Discontinued Date: "06/30/2028" → "07/31/2028"; CLIC Status: "Active" → "Unpublished"; Price Delta (USD): "0" → "+617.00"; Lead Time: "(None)" → "4"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "4"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0","Price Delta (USD)":"0"}" → "{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":3262,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P88852-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Processor"; Discontinued Date: "06/30/2028" → "07/31/2028"; CLIC Status: "Active" → "Unpublished"; Price Delta (USD): "0" → "-1,082.00"; Lead Time: "(None)" → "4"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "4"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0","Price Delta (USD)":"0"}" → "{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":1563,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P72580-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Cooling / Thermal"; Discontinued Date: "06/30/2028" → "07/31/2028"; CLIC Status: "Active" → "Unpublished"; Lead Time: "(None)" → "4"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "4"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":202,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P50311-F21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Memory"; Discontinued Date: "11/30/2028" → "12/31/2028"; CLIC Status: "Active" → "Unpublished"; Price per GB (USD): "(None)" → "434.66"; Lead Time: "(None)" → "14"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "14"; Speed Tier: "(None)" → "Standard Delivery (8-30d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":13909,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}" |
| `P64984-F21` | Hardware | ATTRIBUTE_CHANGED | Rule/Note: "These products are hidden due to Supply constraints" → "Selection constraint for Memory: max 6"; Component Role: "(None)" → "Memory"; Discontinued Date: "11/30/2027" → "07/31/2030"; Lifecycle Status: "Active" → "Constrained Supply (CS)"; CLIC Status: "Active" → "Unpublished"; Price per GB (USD): "(None)" → "464.94"; Lifecycle Badge: "(None)" → "CS"; Availability: "These products are hidden due to Supply constraints" → "Constrained Supply (CS)"; Lead Time: "(None)" → "Unpublished"; Lead Time Source: "Not published by OCA" → "Unpublished"; Speed Tier: "(None)" → "Unpublished"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"isSupplyConstrained":true,"leadTime":"Unpublished","lifecycleCanonical":"Constrained Supply","listPrice":7439,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION","supplyConstraintDetails":"This SKU is currently unavailable based on supply constraints. Select equivalent alternative SKU.","Vendor Status Badge":"CS","vendorSupplyStatus":"CONSTRAINED_SUPPLY"}" |
| `P69982-B21` | Hardware | ATTRIBUTE_CHANGED | Rule/Note: "These products are hidden due to Supply constraints" → "Selection constraint for Memory: max 6"; Component Role: "(None)" → "Memory"; Discontinued Date: "11/30/2028" → "12/31/2028"; Lifecycle Status: "Active" → "Constrained Supply (CS)"; CLIC Status: "Active" → "Unpublished"; Price per GB (USD): "(None)" → "470.23"; Lifecycle Badge: "(None)" → "CS"; Availability: "These products are hidden due to Supply constraints" → "Constrained Supply (CS)"; Lead Time: "(None)" → "Unpublished"; Lead Time Source: "Not published by OCA" → "Unpublished"; Speed Tier: "(None)" → "Unpublished"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"isSupplyConstrained":true,"leadTime":"Unpublished","lifecycleCanonical":"Constrained Supply","listPrice":60190,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION","supplyConstraintDetails":"This SKU is currently unavailable based on supply constraints. Select equivalent alternative SKU.","Vendor Status Badge":"CS","vendorSupplyStatus":"CONSTRAINED_SUPPLY"}" |
| `P50312-F21` | Hardware | ATTRIBUTE_CHANGED | Rule/Note: "All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc." → "Selection constraint for Memory: max 6; P50312-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P64986-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P50309-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P64985-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P64987-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P64988-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P66676-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P69982-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL"; Component Role: "(None)" → "Memory"; Discontinued Date: "11/30/2028" → "12/31/2028"; CLIC Status: "Active" → "Unpublished"; Price per GB (USD): "(None)" → "445.81"; Lead Time: "(None)" → "14"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "14"; Speed Tier: "(None)" → "Standard Delivery (8-30d)"; Portal Visibility: "(None)" → "PORTAL_CONDITIONAL"; Condition Type: "(None)" → "PORTAL_CONDITIONAL_VIEW"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":28532,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}" |
| `P64986-F21` | Hardware | ATTRIBUTE_CHANGED | Rule/Note: "All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc." → "Selection constraint for Memory: max 6; P50312-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P64986-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P50309-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P64985-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P64987-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P64988-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P66676-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P69982-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL"; Component Role: "(None)" → "Memory"; Discontinued Date: "11/30/2028" → "07/31/2030"; CLIC Status: "Active" → "Unpublished"; Price per GB (USD): "(None)" → "445.81"; Lead Time: "(None)" → "14"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "14"; Speed Tier: "(None)" → "Standard Delivery (8-30d)"; Portal Visibility: "(None)" → "PORTAL_CONDITIONAL"; Condition Type: "(None)" → "PORTAL_CONDITIONAL_VIEW"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":28532,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}" |
| `P50309-F21` | Hardware | ATTRIBUTE_CHANGED | Rule/Note: "All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc." → "Selection constraint for Memory: max 6; P50312-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P64986-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P50309-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P64985-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P64987-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P64988-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P66676-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P69982-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL"; Component Role: "(None)" → "Memory"; Discontinued Date: "11/30/2028" → "12/31/2028"; CLIC Status: "Active" → "Unpublished"; Price per GB (USD): "(None)" → "464.94"; Lead Time: "(None)" → "14"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "14"; Speed Tier: "(None)" → "Standard Delivery (8-30d)"; Portal Visibility: "(None)" → "PORTAL_CONDITIONAL"; Condition Type: "(None)" → "PORTAL_CONDITIONAL_VIEW"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":7439,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}" |
| `P64985-F21` | Hardware | ATTRIBUTE_CHANGED | Rule/Note: "All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc." → "Selection constraint for Memory: max 6; P50312-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P64986-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P50309-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P64985-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P64987-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P64988-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P66676-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P69982-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL"; Component Role: "(None)" → "Memory"; Discontinued Date: "11/30/2028" → "07/31/2030"; CLIC Status: "Active" → "Unpublished"; Price per GB (USD): "(None)" → "434.66"; Lead Time: "(None)" → "14"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "14"; Speed Tier: "(None)" → "Standard Delivery (8-30d)"; Portal Visibility: "(None)" → "PORTAL_CONDITIONAL"; Condition Type: "(None)" → "PORTAL_CONDITIONAL_VIEW"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":13909,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}" |
| `P64987-F21` | Hardware | ATTRIBUTE_CHANGED | Rule/Note: "All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc." → "Selection constraint for Memory: max 6; P50312-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P64986-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P50309-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P64985-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P64987-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P64988-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P66676-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P69982-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL"; Component Role: "(None)" → "Memory"; Discontinued Date: "11/30/2028" → "07/31/2030"; CLIC Status: "Active" → "Unpublished"; Price per GB (USD): "(None)" → "490.17"; Lead Time: "(None)" → "14"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "14"; Speed Tier: "(None)" → "Standard Delivery (8-30d)"; Portal Visibility: "(None)" → "PORTAL_CONDITIONAL"; Condition Type: "(None)" → "PORTAL_CONDITIONAL_VIEW"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":47056,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}" |
| `P64988-F21` | Hardware | ATTRIBUTE_CHANGED | Rule/Note: "All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc." → "Selection constraint for Memory: max 6; P50312-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P64986-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P50309-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P64985-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P64987-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P64988-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P66676-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P69982-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL"; Component Role: "(None)" → "Memory"; Discontinued Date: "11/30/2028" → "07/31/2030"; CLIC Status: "Active" → "Unpublished"; Price per GB (USD): "(None)" → "470.23"; Lead Time: "(None)" → "14"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "14"; Speed Tier: "(None)" → "Standard Delivery (8-30d)"; Portal Visibility: "(None)" → "PORTAL_CONDITIONAL"; Condition Type: "(None)" → "PORTAL_CONDITIONAL_VIEW"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":60190,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}" |
| `P66676-F21` | Hardware | ATTRIBUTE_CHANGED | Rule/Note: "All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc." → "Selection constraint for Memory: max 6; P50312-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P64986-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P50309-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P64985-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P64987-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P64988-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P66676-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P69982-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL"; Component Role: "(None)" → "Memory"; Discontinued Date: "11/30/2028" → "12/31/2028"; CLIC Status: "Active" → "Unpublished"; Price per GB (USD): "(None)" → "490.17"; Lead Time: "(None)" → "14"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "14"; Speed Tier: "(None)" → "Standard Delivery (8-30d)"; Portal Visibility: "(None)" → "PORTAL_CONDITIONAL"; Condition Type: "(None)" → "PORTAL_CONDITIONAL_VIEW"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":47056,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}" |
| `P69982-F21` | Hardware | ATTRIBUTE_CHANGED | Rule/Note: "All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc." → "Selection constraint for Memory: max 6; P50312-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P64986-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P50309-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P64985-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P64987-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P64988-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P66676-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL; P69982-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL"; Component Role: "(None)" → "Memory"; Discontinued Date: "11/30/2028" → "12/31/2028"; CLIC Status: "Active" → "Unpublished"; Price per GB (USD): "(None)" → "1,880.94"; Lead Time: "(None)" → "14"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "14"; Speed Tier: "(None)" → "Standard Delivery (8-30d)"; Portal Visibility: "(None)" → "PORTAL_CONDITIONAL"; Condition Type: "(None)" → "PORTAL_CONDITIONAL_VIEW"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":60190,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}" |
| `P50309-B21` | Hardware | ATTRIBUTE_CHANGED | Rule/Note: "These products are hidden due to Supply constraints" → "BTO Memories are not allowed in CTO Base Model.; P50309-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P50311-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P50312-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64984-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64985-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64986-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64987-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64988-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P66676-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL"; Component Role: "(None)" → "Memory"; Discontinued Date: "11/30/2028" → "12/31/2028"; CLIC Status: "Active" → "Unpublished"; Price per GB (USD): "(None)" → "464.94"; Availability: "These products are hidden due to Supply constraints" → "Not published by OCA"; Lead Time: "(None)" → "30"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "30"; Speed Tier: "(None)" → "Standard Delivery (8-30d)"; Portal Visibility: "(None)" → "PORTAL_CONDITIONAL"; Condition Type: "(None)" → "PORTAL_CONDITIONAL_VIEW"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"leadTime":"30","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":7439,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P50311-B21` | Hardware | ATTRIBUTE_CHANGED | Rule/Note: "These products are hidden due to Supply constraints" → "BTO Memories are not allowed in CTO Base Model.; P50309-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P50311-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P50312-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64984-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64985-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64986-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64987-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64988-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P66676-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL"; Component Role: "(None)" → "Memory"; Discontinued Date: "11/30/2028" → "12/31/2028"; CLIC Status: "Active" → "Unpublished"; Price per GB (USD): "(None)" → "434.66"; Availability: "These products are hidden due to Supply constraints" → "Not published by OCA"; Lead Time: "(None)" → "30"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "30"; Speed Tier: "(None)" → "Standard Delivery (8-30d)"; Portal Visibility: "(None)" → "PORTAL_CONDITIONAL"; Condition Type: "(None)" → "PORTAL_CONDITIONAL_VIEW"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"leadTime":"30","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":13909,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P50312-B21` | Hardware | ATTRIBUTE_CHANGED | Rule/Note: "These products are hidden due to Supply constraints" → "BTO Memories are not allowed in CTO Base Model.; P50309-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P50311-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P50312-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64984-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64985-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64986-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64987-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64988-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P66676-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL"; Component Role: "(None)" → "Memory"; Discontinued Date: "11/30/2028" → "12/31/2028"; CLIC Status: "Active" → "Unpublished"; Price per GB (USD): "(None)" → "445.81"; Availability: "These products are hidden due to Supply constraints" → "Not published by OCA"; Lead Time: "(None)" → "30"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "30"; Speed Tier: "(None)" → "Standard Delivery (8-30d)"; Portal Visibility: "(None)" → "PORTAL_CONDITIONAL"; Condition Type: "(None)" → "PORTAL_CONDITIONAL_VIEW"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"leadTime":"30","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":28532,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P64984-B21` | Hardware | ATTRIBUTE_CHANGED | Rule/Note: "These products are hidden due to Supply constraints" → "BTO Memories are not allowed in CTO Base Model.; P50309-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P50311-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P50312-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64984-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64985-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64986-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64987-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64988-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P66676-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL"; Component Role: "(None)" → "Memory"; Discontinued Date: "11/30/2027" → "07/31/2030"; CLIC Status: "Active" → "Unpublished"; Price per GB (USD): "(None)" → "464.94"; Availability: "These products are hidden due to Supply constraints" → "Not published by OCA"; Lead Time: "(None)" → "30"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "30"; Speed Tier: "(None)" → "Standard Delivery (8-30d)"; Portal Visibility: "(None)" → "PORTAL_CONDITIONAL"; Condition Type: "(None)" → "PORTAL_CONDITIONAL_VIEW"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"leadTime":"30","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":7439,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P64985-B21` | Hardware | ATTRIBUTE_CHANGED | Rule/Note: "These products are hidden due to Supply constraints" → "BTO Memories are not allowed in CTO Base Model.; P50309-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P50311-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P50312-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64984-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64985-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64986-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64987-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64988-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P66676-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL"; Component Role: "(None)" → "Memory"; Discontinued Date: "11/30/2028" → "07/31/2030"; CLIC Status: "Active" → "Unpublished"; Price per GB (USD): "(None)" → "434.66"; Availability: "These products are hidden due to Supply constraints" → "Not published by OCA"; Lead Time: "(None)" → "30"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "30"; Speed Tier: "(None)" → "Standard Delivery (8-30d)"; Portal Visibility: "(None)" → "PORTAL_CONDITIONAL"; Condition Type: "(None)" → "PORTAL_CONDITIONAL_VIEW"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"leadTime":"30","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":13909,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P64986-B21` | Hardware | ATTRIBUTE_CHANGED | Rule/Note: "These products are hidden due to Supply constraints" → "BTO Memories are not allowed in CTO Base Model.; P50309-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P50311-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P50312-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64984-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64985-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64986-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64987-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64988-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P66676-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL"; Component Role: "(None)" → "Memory"; Discontinued Date: "11/30/2028" → "07/31/2030"; CLIC Status: "Active" → "Unpublished"; Price per GB (USD): "(None)" → "445.81"; Availability: "These products are hidden due to Supply constraints" → "Not published by OCA"; Lead Time: "(None)" → "30"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "30"; Speed Tier: "(None)" → "Standard Delivery (8-30d)"; Portal Visibility: "(None)" → "PORTAL_CONDITIONAL"; Condition Type: "(None)" → "PORTAL_CONDITIONAL_VIEW"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"leadTime":"30","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":28532,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P64987-B21` | Hardware | ATTRIBUTE_CHANGED | Rule/Note: "These products are hidden due to Supply constraints" → "BTO Memories are not allowed in CTO Base Model.; P50309-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P50311-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P50312-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64984-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64985-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64986-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64987-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64988-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P66676-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL"; Component Role: "(None)" → "Memory"; Discontinued Date: "11/30/2028" → "07/31/2030"; CLIC Status: "Active" → "Unpublished"; Price per GB (USD): "(None)" → "490.17"; Availability: "These products are hidden due to Supply constraints" → "Not published by OCA"; Lead Time: "(None)" → "30"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "30"; Speed Tier: "(None)" → "Standard Delivery (8-30d)"; Portal Visibility: "(None)" → "PORTAL_CONDITIONAL"; Condition Type: "(None)" → "PORTAL_CONDITIONAL_VIEW"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"leadTime":"30","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":47056,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P64988-B21` | Hardware | ATTRIBUTE_CHANGED | Rule/Note: "These products are hidden due to Supply constraints" → "BTO Memories are not allowed in CTO Base Model.; P50309-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P50311-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P50312-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64984-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64985-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64986-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64987-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64988-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P66676-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL"; Component Role: "(None)" → "Memory"; Discontinued Date: "11/30/2028" → "07/31/2030"; CLIC Status: "Active" → "Unpublished"; Price per GB (USD): "(None)" → "470.23"; Availability: "These products are hidden due to Supply constraints" → "Not published by OCA"; Lead Time: "(None)" → "30"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "30"; Speed Tier: "(None)" → "Standard Delivery (8-30d)"; Portal Visibility: "(None)" → "PORTAL_CONDITIONAL"; Condition Type: "(None)" → "PORTAL_CONDITIONAL_VIEW"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"leadTime":"30","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":60190,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P66676-B21` | Hardware | ATTRIBUTE_CHANGED | Rule/Note: "These products are hidden due to Supply constraints" → "BTO Memories are not allowed in CTO Base Model.; P50309-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P50311-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P50312-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64984-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64985-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64986-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64987-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P64988-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL; P66676-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL"; Component Role: "(None)" → "Memory"; Discontinued Date: "11/30/2028" → "12/31/2028"; CLIC Status: "Active" → "Unpublished"; Price per GB (USD): "(None)" → "490.17"; Availability: "These products are hidden due to Supply constraints" → "Not published by OCA"; Lead Time: "(None)" → "30"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "30"; Speed Tier: "(None)" → "Standard Delivery (8-30d)"; Portal Visibility: "(None)" → "PORTAL_CONDITIONAL"; Condition Type: "(None)" → "PORTAL_CONDITIONAL_VIEW"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"leadTime":"30","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":47056,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `804398-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Storage Controller"; Discontinued Date: "04/30/2029" → "05/31/2029"; CLIC Status: "Active" → "Unpublished"; Availability: "Available" → "Not published by OCA"; Lead Time: "(None)" → "4"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "4"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":1775,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P47777-B21` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Component Role: "(None)" → "Storage Controller"; Discontinued Date: "04/30/2029" → "05/31/2029"; CLIC Status: "Active" → "Unpublished"; Availability: "Available" → "Not published by OCA"; Lead Time: "(None)" → "4"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "4"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":7649,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |
| `P47785-B21` | Hardware | PRICE_AND_ATTRIBUTE_CHANGED | Component Role: "(None)" → "Storage Controller"; Discontinued Date: "04/30/2029" → "05/31/2029"; CLIC Status: "Active" → "Unpublished"; Availability: "Available" → "Not published by OCA"; Lead Time: "(None)" → "4"; Lead Time Source: "Not published by OCA" → "OCA row attribute"; Lead Time Days: "(None)" → "4"; Speed Tier: "(None)" → "Fast-Ship Certified (<=7d)"; Vendor Recommended: "(None)" → "false"; Vendor Attributes: "{"Extended Price (USD)":"0"}" → "{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":4329,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}" |

## 🧩 6. Same-Product CTO Variant Matrix

| Chassis Identifier | Product Family | Generation | Form Factor | CTO Base SKU |
|--------------------|----------------|------------|-------------|--------------|
| **DL145_Gen11** | ProLiant | Gen11 | 4EDSFF | `P71964-B21` |

### Structural Field & Evidence Coverage

- **Row Types**: BASE_SYSTEM: 1, HARDWARE_OPTION: 399, INTERNAL_CONFIGURATION: 88, SOFTWARE_SUBSCRIPTION: 180
- **Price States**: PRICED: 636, UNPRICED: 21, REGIONAL_NA_UNPRICED: 11
- **Lead-Time Measurement**: Numeric Days: 216, ETA Date Only: 0, Unpublished: 452
- **Visibility Coverage**: VISIBLE: 633, SELECTOR_HIDDEN: 35

## ⏱️ 10. Supply Chain & Delivery Lead Time Intelligence

### Confirmed Component Delivery SLAs

| Product # | Description | Category | Lead Time | Channel Status |
|---|---|---|---:|---|
| `P22020-B21` | HPE DL38X Gen10 Plus 2U Cable Management Arm for Rail Kit | Accessories & Infrastructure | 3 | Available |
| `P52349-B21` | HPE Easy Install Rail 1 Kit | Accessories & Infrastructure | 4 | Available |
| `P72008-B21` | HPE ProLiant DL145 Gen11 Rack Enablement Kit | Accessories & Infrastructure | 8 | Available |
| `P78764-B21` | HPE ProLiant DL145 Gen11 2-post Rail Kit | Accessories & Infrastructure | 8 | Available |
| `P72006-B21` | HPE ProLiant DL145 Gen11 Desk/Wall Mounting Kit | Cooling / Thermal | 8 | Not published by OCA |
| `P73006-B21` | HPE ProLiant DL145 Gen11 Optimised Acoustics FIO Configuration | Rack Options | 1 | Available |
| `P69259-B21` | AMD EPYC 8124P 2.45GHz 16-core 125W Processor for HPE | Processor | 4 | Available |
| `P69260-B21` | AMD EPYC 8224P 2.55GHz 24-core 160W Processor for HPE | Processor | 4 | Available |
| `P69258-B21` | AMD EPYC 8024P 2.4GHz 8-core 90W Processor for HPE | Processor | 3 | Available |
| `P69261-B21` | AMD EPYC 8324P 2.65GHz 32-core 180W Processor for HPE | Processor | 3 | Available |
| `P69262-B21` | AMD EPYC 8434P 2.5GHz 48-core 200W Processor for HPE | Processor | 3 | Available |
| `P69263-B21` | AMD EPYC 8534P 2.3GHz 64-core 200W Processor for HPE | Processor | 3 | Available |
| `P71859-B21` | AMD EPYC 8024PN 2.05GHz 8-core 80W Processor for HPE | Processor | 3 | Available |
| `P71862-B21` | AMD EPYC 8124PN 2.0GHz 16-core 100W Processor for HPE | Processor | 3 | Available |
| `P71865-B21` | AMD EPYC 8224PN 2.0GHz 24-core 120W Processor for HPE | Processor | 3 | Available |
| `P71871-B21` | AMD EPYC 8434PN 2.0GHz 48-core 155W Processor for HPE | Processor | 3 | Available |
| `P71874-B21` | AMD EPYC 8534PN 2.0GHz 64-core 175W Processor for HPE | Processor | 3 | Available |
| `P88840-B21` | AMD EPYC 8635P 1.6GHz 84-core 225W Processor for HPE | Processor | 3 | Available |
| `P88850-B21` | AMD EPYC 8125P 2.65GHz 16-core 125W Processor for HPE | Processor | 3 | Available |
| `P71868-B21` | AMD EPYC 8324PN 2.05GHz 32-core 130W Processor for HPE | Processor | 4 | Available |
| `P88842-B21` | AMD EPYC 8535P 2.0GHz 64-core 210W Processor for HPE | Processor | 4 | Available |
| `P88844-B21` | AMD EPYC 8435P 2.45GHz 48-core 200W Processor for HPE | Processor | 21 | Available |
| `P88846-B21` | AMD EPYC 8325P 2.7GHz 32-core 175W Processor for HPE | Processor | 21 | Available |
| `P88848-B21` | AMD EPYC 8225P 2.95GHz 24-core 160W Processor for HPE | Processor | 4 | Available |
| `P88852-B21` | AMD EPYC 8025P 2.9GHz 8-core 95W Processor for HPE | Processor | 4 | Available |
| `P72580-B21` | HPE ProLiant DL145 Gen11 1U Heat Sink Kit | Cooling / Thermal | 4 | Available |
| `P50311-F21` | HPE 32GB (1x32GB) Dual Rank x8 DDR5-4800 CAS-40-39-39 EC8 Registered Smart FIO Memory Kit | Memory | 14 | Available |
| `P50312-F21` | HPE 64GB (1x64GB) Dual Rank x4 DDR5-4800 CAS-40-39-39 EC8 Registered Smart FIO Memory Kit | Memory | 14 | Not published by OCA |
| `P64986-F21` | HPE 64GB (1x64GB) Dual Rank x4 DDR5-6400 CAS-52-52-52 EC8 Registered Smart FIO Memory Kit | Memory | 14 | Not published by OCA |
| `P50309-F21` | HPE 16GB (1x16GB) Single Rank x8 DDR5-4800 CAS-40-39-39 EC8 Registered Smart FIO Memory Kit | Memory | 14 | Not published by OCA |
*... [184 additional supply chain records omitted for brevity]*

### ⚠️ Supply Chain Verification Advisory (Unpublished Delivery Lead Times)

*The following high-value active components have unpublished delivery estimates in live OCA. Presales engineers must verify distributor buffer stock before quoting committed deployment timelines:*

| Product # | Description | Category | Lead Time Status | Presales Action |
|---|---|---|:---:|---|
| `P64984-F21` | HPE 16GB (1x16GB) Single Rank x8 DDR5-6400 CAS-52-52-52 EC8 Registered Smart FIO Memory Kit | Memory | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P69982-B21` | HPE 128GB (1x128GB) Dual Rank x4 DDR5-4800 CAS-40-39-39 EC8 Registered Smart Memory Kit | Memory | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P91084-B21` | HPE 1.6TB NVMe Gen5 Mainstream Performance Mixed Use E3.S EC1 E3 Thin Multi Vendor SSD | Drive Enclosures / Drives | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P91086-B21` | HPE 3.2TB NVMe Gen5 Mainstream Performance Mixed Use E3.S EC1 E3 Thin Multi Vendor SSD | Drive Enclosures / Drives | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P91088-B21` | HPE 6.4TB NVMe Gen5 Mainstream Performance Mixed Use E3.S EC1 E3 Thin Multi Vendor SSD | Drive Enclosures / Drives | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P91090-B21` | HPE 1.92TB NVMe Gen5 Mainstream Performance Read Intensive E3.S EC1 E3 Thin Multi Vendor SSD | Drive Enclosures / Drives | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P91092-B21` | HPE 3.84TB NVMe Gen5 Mainstream Performance Read Intensive E3.S EC1 E3 Thin Multi Vendor SSD | Drive Enclosures / Drives | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P91094-B21` | HPE 7.68TB NVMe Gen5 Mainstream Performance Read Intensive E3.S EC1 E3 Thin Multi Vendor SSD | Drive Enclosures / Drives | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P91096-B21` | HPE 15.36TB NVMe Gen5 Mainstream Performance Read Intensive E3.S EC1 E3 Thin Multi Vendor SSD | Drive Enclosures / Drives | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P91098-B21` | HPE 3.2TB NVMe Gen5 High Performance Mixed Use E3.S EC1 E3 Thin Multi Vendor SSD | Drive Enclosures / Drives | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P91100-B21` | HPE 6.4TB NVMe Gen5 High Performance Mixed Use E3.S EC1 E3 Thin Multi Vendor SSD | Drive Enclosures / Drives | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P91102-B21` | HPE 12.8TB NVMe Gen5 High Performance Mixed Use E3.S EC1 E3 Thin Multi Vendor SSD | Drive Enclosures / Drives | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P91229-B21` | HPE 3.84TB NVMe Gen5 High Performance Read Intensive E3.S EC1 E3 Thin Multi Vendor SSD | Drive Enclosures / Drives | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P57799-B21` | HPE 3.84TB NVMe Gen5 High Performance Read Intensive E3S EC1 EDSFF SPDM PM1743 SSD | Drive Enclosures / Drives | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P57807-B21` | HPE 15.36TB NVMe Gen5 High Performance Read Intensive E3S EC1 EDSFF SPDM PM1743 SSD | Drive Enclosures / Drives | **Unpublished** | Verify distributor inventory prior to SLA commitment |
*... [116 additional unpublished items omitted for brevity]*


<!-- MANAGED_FULL_CATALOG -->
Content fingerprint: 495fcdb165316147de4c05cfceef1970d284ef820cfa22854855fc654575eeba

## Complete workbook text projection

Displayed cell values follow by sheet and original row. Formatting, charts and formulas remain in the Excel artifact. Repeated rows refer to the first identical row and schema; no content is replaced by a fingerprint.

### Category Summary

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Constraint | Min Qty | Max Qty | Total SKUs | Has Rules | Rule Count |
| 2 | Unknown | SUSE SAP Operating Systems | no max | 0 | Unlimited | 0 | No | 0 |
| 3 | OEM Software | OEM Software | max 999 | 0 | 999 | 0 | No | 0 |
| 4 | Rack Options | Rack Options | max 4 | 0 | 4 | 0 | No | 0 |
| 5 | Rack Options | Acoustics | max 1 | 0 | 1 | 1 | Yes | 1 |
| 6 | Ambient Temperature | Ambient Temperature | max 2 | 0 | 2 | 0 | No | 0 |
| 7 | Processor | Processors | max 1 | 0 | 1 | 19 | Yes | 1 |
| 8 | Processor | Heatsink Kit | max 1 | 0 | 1 | 0 | No | 0 |
| 9 | Memory | Memory | max 6 | 0 | 6 | 20 | Yes | 20 |
| 10 | Storage Devices | SAS Controller | max 2 | 0 | 2 | 0 | No | 0 |
| 11 | Storage Devices | Smart Storage Battery | max 1 | 0 | 1 | 0 | No | 0 |
| 12 | Storage Devices | Storage Controller Cables | max 1 | 0 | 1 | 0 | No | 0 |
| 13 | Storage Devices | RAID Settings | max 1 | 0 | 1 | 0 | No | 0 |
| 14 | Storage Devices | Drive Cage | max 2 | 0 | 2 | 0 | No | 0 |
| 15 | Storage Devices | SSD - EDSFF NVME Read Intensive | max 4 | 0 | 4 | 0 | No | 0 |
| 16 | Storage Devices | SSD - Mixed Use | max 4 | 0 | 4 | 0 | No | 0 |
| 17 | Storage Devices | NVMe - SSD and AIC - Read Intensive | max 4 | 0 | 4 | 0 | No | 0 |
| 18 | Factory Configuration Settings | Factory Configuration Settings | max 2 | 0 | 2 | 1 | Yes | 1 |
| 19 | Factory Configuration Settings | vSAN Tracking SKUs | no max | 0 | Unlimited | 0 | No | 0 |
| 20 | Factory Configuration Settings | iLO Common Password | max 1 | 0 | 1 | 0 | No | 0 |
| 21 | Factory Configuration Settings | Riser Cards | max 3 | 0 | 3 | 0 | No | 0 |
| 22 | Networking | Ethernet PCIe | max 1 | 0 | 1 | 8 | Yes | 1 |
| 23 | Networking | OCP Ethernet | max 1 | 0 | 1 | 8 | Yes | 9 |
| 24 | Networking | Transceivers | max 16 | 0 | 16 | 6 | Yes | 1 |
| 25 | Virtualization | HPE Virtualization | no max | 0 | Unlimited | 0 | No | 0 |
| 26 | Virtualization | VMWare Core Editions | no max | 0 | Unlimited | 0 | No | 0 |
| 27 | OS Boot Device | OS Boot Device | max 2 | 0 | 2 | 0 | No | 0 |
| 28 | Graphics Options | Graphics | max 2 | 0 | 2 | 0 | No | 0 |
| 29 | Graphics Options | Graphics Accessories | max 2 | 0 | 2 | 0 | No | 0 |
| 30 | Graphics Options | Power Cooling Options | max 4 | 0 | 4 | 0 | No | 0 |
| 31 | Graphics Options | Power Supplies | max 2 | 0 | 2 | 0 | No | 0 |
| 32 | Graphics Options | Power Cords | max 2 | 0 | 2 | 0 | No | 0 |
| 33 | Security Options | Security Hardware | no max | 0 | Unlimited | 3 | Yes | 1 |
| 34 | Accessories | Management Hardware | max 2 | 0 | 2 | 0 | No | 0 |
| 35 | HPE Compute Ops Management | Compute Ops Management SKUs (required) | max 1 | 0 | 1 | 0 | No | 0 |
| 36 | HPE Compute Ops Management | Compute Ops Management SKUs | required | 1 | Required | 0 | No | 0 |
| 37 | HPE Compute Ops Management | MS Windows Server Additional License | max 999 | 0 | 999 | 0 | No | 0 |
| 38 | HPE Compute Ops Management | MS Windows Server CALs | no max | 0 | Unlimited | 0 | No | 0 |
| 39 | HPE Compute Ops Management | MS Windows Server Not Preinstalled | no max | 0 | Unlimited | 0 | No | 0 |
| 40 | HPE Compute Ops Management | MS Windows Server Preinstalled | no max | 0 | Unlimited | 0 | No | 0 |
| 41 | HPE Compute Ops Management | Red Hat Operating Systems | no max | 0 | Unlimited | 0 | No | 0 |
| 42 | HPE Compute Ops Management | SUSE Add-ons | no max | 0 | Unlimited | 0 | No | 0 |
| 43 | HPE Compute Ops Management | SUSE containers | no max | 0 | Unlimited | 0 | No | 0 |
| 44 | HPE Compute Ops Management | SUSE Operating Systems | no max | 0 | Unlimited | 0 | No | 0 |
| 45 | HPE Compute Ops Management | OneView Management Software | no max | 0 | Unlimited | 0 | No | 0 |
| 46 | HPE Compute Ops Management | NVIDIA GPU SW | no max | 0 | Unlimited | 0 | No | 0 |
| 47 | HPE Compute Ops Management | Integrated Lights Out Software | no max | 0 | Unlimited | 0 | No | 0 |
| 48 | HPE Compute Ops Management | Proliant Software Media Kits | no max | 0 | Unlimited | 0 | No | 0 |
| 49 | HPE Compute Ops Management | Linux Value Added Software | no max | 0 | Unlimited | 0 | No | 0 |
| 50 | HPE Compute Ops Management | AI-at-Scale | no max | 0 | Unlimited | 0 | No | 0 |
| 51 | HPE Compute Ops Management | HPC Software Products | no max | 0 | Unlimited | 0 | No | 0 |
| 52 | HPE Compute Ops Management | High Availability Computing - Cluster Software | no max | 0 | Unlimited | 0 | No | 0 |
| 53 | HPE Compute Ops Management | Partner Software - Operating System 8pks | max 5994 | 0 | 5,994 | 0 | No | 0 |
| 54 | HPE Compute Ops Management | Reseller Option Kit | no max | 0 | Unlimited | 0 | No | 0 |
| 55 | Chassis | Variants | min 1, max 1 — Active OCA CTO chassis | 1 | 1 | 1 | Yes | 1 |
| 56 | Accessories &amp; Infrastructure | Chassis Infrastructure &amp; Rail Kits | max 4 | 0 | 4 | 4 | Yes | 1 |
| 57 | Cooling / Thermal | Heatsink Kit | max 1 | 0 | 1 | 5 | Yes | 8 |
| 58 | Storage Controllers | SAS Controller | max 2 | 0 | 2 | 4 | Yes | 1 |
| 59 | Storage Controllers | Smart Storage Batteries | max 1 | 0 | 1 | 3 | Yes | 1 |
| 60 | Storage Controllers | Storage Controller Cables | max 1 | 0 | 1 | 3 | Yes | 1 |
| 61 | Storage Controllers | RAID Settings | max 1 | 0 | 1 | 6 | Yes | 1 |
| 62 | Drive Enclosures / Drives | Drive Cage | max 2 | 0 | 2 | 4 | Yes | 1 |
| 63 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | max 4 | 0 | 4 | 141 | Yes | 8 |
| 64 | Accessories &amp; Infrastructure | vSAN Tracking SKUs | no max | 0 | Unlimited | 1 | Yes | 1 |
| 65 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | max 1 | 0 | 1 | 117 | Yes | 8 |
| 66 | PCIe Risers | Riser Cards | max 3 | 0 | 3 | 2 | Yes | 1 |
| 67 | Software &amp; Licenses | VMWare Core Editions | no max | 0 | Unlimited | 34 | Yes | 2 |
| 68 | Cables &amp; Enablement Kits | Solid State Drives (NVMe/SAS/SATA) | max 2 | 0 | 2 | 4 | Yes | 1 |
| 69 | Graphics &amp; GPU | Graphics | max 2 | 0 | 2 | 3 | Yes | 1 |
| 70 | Graphics &amp; GPU | Graphics Accessories | max 2 | 0 | 2 | 2 | Yes | 1 |
| 71 | Cooling / Thermal | Power Cooling Options | max 4 | 0 | 4 | 1 | Yes | 1 |
| 72 | Power Supplies | Power Supplies | max 2 | 0 | 2 | 1 | Yes | 1 |
| 73 | Cables &amp; Enablement Kits | Power Cords | max 2 | 0 | 2 | 18 | Yes | 1 |
| 74 | Cables &amp; Enablement Kits | HPE Virtualization | no max | 0 | Unlimited | 1 | Yes | 2 |
| 75 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | no max | 0 | Unlimited | 2 | Yes | 3 |
| 76 | Cables &amp; Enablement Kits | Management Hardware | max 2 | 0 | 2 | 2 | Yes | 1 |
| 77 | Software &amp; Licenses | Compute Ops Management SKUs | required | 1 | Required | 8 | Yes | 2 |
| 78 | Software &amp; Licenses | MS Windows Server Additional License | max 999 | 0 | 999 | 19 | Yes | 1 |
| 79 | Software &amp; Licenses | MS Windows Server CALs | no max | 0 | Unlimited | 30 | Yes | 1 |
| 80 | Software &amp; Licenses | MS Windows Server Not Preinstalled | no max | 0 | Unlimited | 14 | Yes | 1 |
| 81 | Software &amp; Licenses | MS Windows Server Preinstalled | no max | 0 | Unlimited | 4 | Yes | 1 |
| 82 | Software &amp; Licenses | SUSE Add-ons | no max | 0 | Unlimited | 2 | Yes | 2 |
| 83 | Software &amp; Licenses | SUSE Operating Systems | no max | 0 | Unlimited | 50 | Yes | 2 |
| 84 | Software &amp; Licenses | SUSE SAP Operating Systems | no max | 0 | Unlimited | 4 | Yes | 2 |
| 85 | Software &amp; Licenses | OneView Management Software | no max | 0 | Unlimited | 8 | Yes | 2 |
| 86 | Software &amp; Licenses | Integrated Lights Out Software | no max | 0 | Unlimited | 40 | Yes | 2 |
| 87 | Software &amp; Licenses | Proliant Software Media Kits | no max | 0 | Unlimited | 2 | Yes | 1 |
| 88 | Software &amp; Licenses | Linux Value Added Software | no max | 0 | Unlimited | 6 | Yes | 1 |
| 89 | Software &amp; Licenses | HPC Software Products | no max | 0 | Unlimited | 1 | Yes | 1 |
| 90 | Software &amp; Licenses | High Availability Computing - Cluster Software | no max | 0 | Unlimited | 26 | Yes | 2 |
| 91 | Support Services | Ambient Temperature | max 2 | 0 | 2 | 6 | Yes | 1 |
| 92 | Software &amp; Licenses | Red Hat Operating Systems | no max | 0 | Unlimited | 2 | Yes | 1 |
| 93 | Software &amp; Licenses | SUSE containers | no max | 0 | Unlimited | 15 | Yes | 1 |
| 94 | Software &amp; Licenses | Partner Software - Operating System 8pks | max 5994 | 0 | 5,994 | 6 | Yes | 1 |


### All SKUs

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |
| 2 | Chassis | Variants | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Chassis &gt; Variants | Base Chassis | min 1, max 1 | 1 | 1 | Select exactly one currently discoverable, non-TAA/non-GTA CTO base chassis | P71964-B21 | CTO | HPE ProLiant DL145 Gen11 Configure-to-order Server | 1 | $2,375.00 |  |  |  |  | No | Available in OCA product catalog | Unpublished |  | Unpublished | Not published by OCA | Valid | Active |  |  |  |
| 3 | Accessories &amp; Infrastructure | Chassis Infrastructure &amp; Rail Kits | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Accessories &amp; Infrastructure &gt; Chassis Infrastructure &amp; Rail Kits | Chassis Infrastructure | max 4 | 0 | 4 | Selection constraint for Chassis Infrastructure &amp; Rail Kits: max 4 | P22020-B21 | Standard | HPE DL38X Gen10 Plus 2U Cable Management Arm for Rail Kit | 1 | $89.00 |  |  | $89.00 |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 12/23/2019 | 06/30/2028 | [TEXT_1] |
| 4 | Accessories &amp; Infrastructure | Chassis Infrastructure &amp; Rail Kits | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Accessories &amp; Infrastructure &gt; Chassis Infrastructure &amp; Rail Kits | Chassis Infrastructure | max 4 | 0 | 4 | Selection constraint for Chassis Infrastructure &amp; Rail Kits: max 4 | P52349-B21 | Standard | HPE Easy Install Rail 1 Kit | 1 | $373.00 |  |  | $373.00 |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 01/10/2023 | 07/31/2028 | [TEXT_2] |
| 5 | Accessories &amp; Infrastructure | Chassis Infrastructure &amp; Rail Kits | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Accessories &amp; Infrastructure &gt; Chassis Infrastructure &amp; Rail Kits | Chassis Infrastructure | max 4 | 0 | 4 | Selection constraint for Chassis Infrastructure &amp; Rail Kits: max 4 | P72008-B21 | Standard | HPE ProLiant DL145 Gen11 Rack Enablement Kit | 1 | $86.00 |  |  | $86.00 |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 07/31/2028 | [TEXT_3] |
| 6 | Accessories &amp; Infrastructure | Chassis Infrastructure &amp; Rail Kits | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Accessories &amp; Infrastructure &gt; Chassis Infrastructure &amp; Rail Kits | Chassis Infrastructure | max 4 | 0 | 4 | Selection constraint for Chassis Infrastructure &amp; Rail Kits: max 4 | P78764-B21 | Standard | HPE ProLiant DL145 Gen11 2-post Rail Kit | 0 | $110.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 03/03/2025 | 07/31/2028 | [TEXT_4] |
| 7 | Cooling / Thermal | Heatsink Kit | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Cooling / Thermal &gt; Heatsink Kit | Cooling / Thermal | max 1 | 0 | 1 | [TEXT_5] | P72006-B21 | Standard | HPE ProLiant DL145 Gen11 Desk/Wall Mounting Kit | 0 | $118.00 |  |  | NA |  | No | Not published by OCA | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 07/31/2028 | [TEXT_6] |
| 8 | Rack Options | Acoustics | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Rack Options &gt; Acoustics | Option Component | max 1 | 0 | 1 | Selection constraint for Acoustics: max 1 | P73006-B21 | Standard | HPE ProLiant DL145 Gen11 Optimised Acoustics FIO Configuration | 1 | $1.00 |  |  | $1.00 |  | No | Available | 1 | 1 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 10/31/2099 | [TEXT_7] |
| 9 | Processor | Processors | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Processor &gt; Processors | Processor | max 1 | 0 | 1 | Selection constraint for Processors: max 1 | P69259-B21 | Standard | AMD EPYC 8124P 2.45GHz 16-core 125W Processor for HPE | 0 | $1,744.00 |  | -$901.00 | $1,744.00 |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 07/31/2028 | [TEXT_8] |
| 10 | Processor | Processors | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Processor &gt; Processors | Processor | max 1 | 0 | 1 | Selection constraint for Processors: max 1 | P69260-B21 | Standard | AMD EPYC 8224P 2.55GHz 24-core 160W Processor for HPE | 1 | $2,645.00 |  | Selected | $2,645.00 |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 07/31/2028 | [TEXT_9] |
| 11 | Processor | Processors | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Processor &gt; Processors | Processor | max 1 | 0 | 1 | Selection constraint for Processors: max 1 | P69258-B21 | Standard | AMD EPYC 8024P 2.4GHz 8-core 90W Processor for HPE | 0 | $1,160.00 |  | -$1,485.00 | $1,160.00 |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 07/31/2028 | [TEXT_10] |
| 12 | Processor | Processors | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Processor &gt; Processors | Processor | max 1 | 0 | 1 | Selection constraint for Processors: max 1 | P69261-B21 | Standard | AMD EPYC 8324P 2.65GHz 32-core 180W Processor for HPE | 0 | $5,173.00 |  | $2,528.00 | $5,173.00 |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 07/31/2028 | [TEXT_11] |
| 13 | Processor | Processors | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Processor &gt; Processors | Processor | max 1 | 0 | 1 | Selection constraint for Processors: max 1 | P69262-B21 | Standard | AMD EPYC 8434P 2.5GHz 48-core 200W Processor for HPE | 0 | $7,371.00 |  | $4,726.00 | $7,371.00 |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 07/31/2028 | [TEXT_12] |
| 14 | Processor | Processors | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Processor &gt; Processors | Processor | max 1 | 0 | 1 | Selection constraint for Processors: max 1 | P69263-B21 | Standard | AMD EPYC 8534P 2.3GHz 64-core 200W Processor for HPE | 0 | $9,654.00 |  | $7,009.00 | $9,654.00 |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 07/31/2028 | [TEXT_13] |
| 15 | Processor | Processors | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Processor &gt; Processors | Processor | max 1 | 0 | 1 | Selection constraint for Processors: max 1 | P71859-B21 | Standard | AMD EPYC 8024PN 2.05GHz 8-core 80W Processor for HPE | 0 | $1,433.00 |  | -$1,212.00 | $1,433.00 |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 07/31/2028 | [TEXT_14] |
| 16 | Processor | Processors | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Processor &gt; Processors | Processor | max 1 | 0 | 1 | Selection constraint for Processors: max 1 | P71862-B21 | Standard | AMD EPYC 8124PN 2.0GHz 16-core 100W Processor for HPE | 0 | $2,157.00 |  | -$488.00 | $2,157.00 |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 07/31/2028 | [TEXT_15] |
| 17 | Processor | Processors | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Processor &gt; Processors | Processor | max 1 | 0 | 1 | Selection constraint for Processors: max 1 | P71865-B21 | Standard | AMD EPYC 8224PN 2.0GHz 24-core 120W Processor for HPE | 0 | $2,958.00 |  | $313.00 | $2,958.00 |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 07/31/2028 | [TEXT_16] |
| 18 | Processor | Processors | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Processor &gt; Processors | Processor | max 1 | 0 | 1 | Selection constraint for Processors: max 1 | P71871-B21 | Standard | AMD EPYC 8434PN 2.0GHz 48-core 155W Processor for HPE | 0 | $8,600.00 |  | $5,955.00 | $8,600.00 |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 07/31/2028 | [TEXT_17] |
| 19 | Processor | Processors | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Processor &gt; Processors | Processor | max 1 | 0 | 1 | Selection constraint for Processors: max 1 | P71874-B21 | Standard | AMD EPYC 8534PN 2.0GHz 64-core 175W Processor for HPE | 0 | $10,617.00 |  | $7,972.00 | $10,617.00 |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 07/31/2028 | [TEXT_18] |
| 20 | Processor | Processors | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Processor &gt; Processors | Processor | max 1 | 0 | 1 | Selection constraint for Processors: max 1 | P88840-B21 | Standard | AMD EPYC 8635P 1.6GHz 84-core 225W Processor for HPE | 0 | $14,189.00 |  | $11,544.00 | $14,189.00 |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/19/2026 | 07/31/2028 | [TEXT_19] |
| 21 | Processor | Processors | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Processor &gt; Processors | Processor | max 1 | 0 | 1 | Selection constraint for Processors: max 1 | P88850-B21 | Standard | AMD EPYC 8125P 2.65GHz 16-core 125W Processor for HPE | 0 | $2,280.00 |  | -$365.00 | $2,280.00 |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/19/2026 | 07/31/2028 | [TEXT_20] |
| 22 | Processor | Processors | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Processor &gt; Processors | Processor | max 1 | 0 | 1 | Selection constraint for Processors: max 1 | P71868-B21 | Standard | AMD EPYC 8324PN 2.05GHz 32-core 130W Processor for HPE | 0 | $5,801.00 |  | $3,156.00 | $5,801.00 |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 07/31/2028 | [TEXT_21] |
| 23 | Processor | Processors | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Processor &gt; Processors | Processor | max 1 | 0 | 1 | Selection constraint for Processors: max 1 | P88842-B21 | Standard | AMD EPYC 8535P 2.0GHz 64-core 210W Processor for HPE | 0 | $11,873.00 |  | $9,228.00 | $11,873.00 |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/19/2026 | 07/31/2028 | [TEXT_22] |
| 24 | Processor | Processors | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Processor &gt; Processors | Processor | max 1 | 0 | 1 | Selection constraint for Processors: max 1 | P88844-B21 | Standard | AMD EPYC 8435P 2.45GHz 48-core 200W Processor for HPE | 0 | $8,991.00 |  | $6,346.00 | $8,991.00 |  | No | Available | 21 | 21 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/19/2026 | 07/31/2028 | [TEXT_23] |
| 25 | Processor | Processors | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Processor &gt; Processors | Processor | max 1 | 0 | 1 | Selection constraint for Processors: max 1 | P88846-B21 | Standard | AMD EPYC 8325P 2.7GHz 32-core 175W Processor for HPE | 0 | $6,636.00 |  | $3,991.00 | $6,636.00 |  | No | Available | 21 | 21 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/19/2026 | 07/31/2028 | [TEXT_24] |
| 26 | Processor | Processors | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Processor &gt; Processors | Processor | max 1 | 0 | 1 | Selection constraint for Processors: max 1 | P88848-B21 | Standard | AMD EPYC 8225P 2.95GHz 24-core 160W Processor for HPE | 0 | $3,262.00 |  | $617.00 | $3,262.00 |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/19/2026 | 07/31/2028 | [TEXT_25] |
| 27 | Processor | Processors | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Processor &gt; Processors | Processor | max 1 | 0 | 1 | Selection constraint for Processors: max 1 | P88852-B21 | Standard | AMD EPYC 8025P 2.9GHz 8-core 95W Processor for HPE | 0 | $1,563.00 |  | -$1,082.00 | $1,563.00 |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/19/2026 | 07/31/2028 | [TEXT_26] |
| 28 | Cooling / Thermal | Heatsink Kit | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Cooling / Thermal &gt; Heatsink Kit | Cooling / Thermal | max 1 | 0 | 1 | Selection constraint for Heatsink Kit: max 1 | P72580-B21 | Standard | HPE ProLiant DL145 Gen11 1U Heat Sink Kit | 0 | $202.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/07/2025 | 07/31/2028 | [TEXT_27] |
| 29 | Memory | Memory | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Memory &gt; Memory | Memory | max 6 | 0 | 6 | Selection constraint for Memory: max 6 | P50311-F21 | Standard | HPE 32GB (1x32GB) Dual Rank x8 DDR5-4800 CAS-40-39-39 EC8 Registered Smart FIO Memory Kit | 1 | $13,909.00 |  |  | $13,909.00 | $434.66 | No | Available | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/06/2026 | 12/31/2028 | [TEXT_28] |
| 30 | Memory | Memory | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Memory &gt; Memory | Memory | max 6 | 0 | 6 | Selection constraint for Memory: max 6 | P64984-F21 | Standard | HPE 16GB (1x16GB) Single Rank x8 DDR5-6400 CAS-52-52-52 EC8 Registered Smart FIO Memory Kit | 0 | $7,439.00 |  |  | NA | $464.94 | No | Constrained Supply (CS) | Unpublished |  | Unpublished | Unpublished | Unpublished | Constrained Supply (CS) | 04/06/2026 | 07/31/2030 | [TEXT_29] |
| 31 | Memory | Memory | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Memory &gt; Memory | Memory | max 6 | 0 | 6 | Selection constraint for Memory: max 6 | P69982-B21 | Standard | HPE 128GB (1x128GB) Dual Rank x4 DDR5-4800 CAS-40-39-39 EC8 Registered Smart Memory Kit | 0 | $60,190.00 |  |  | NA | $470.23 | No | Constrained Supply (CS) | Unpublished |  | Unpublished | Unpublished | Unpublished | Constrained Supply (CS) | 05/06/2024 | 12/31/2028 | [TEXT_30] |
| 32 | Memory | Memory | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Memory &gt; Memory | Memory | max 6 | 0 | 6 | [TEXT_31] | P50312-F21 | Standard | HPE 64GB (1x64GB) Dual Rank x4 DDR5-4800 CAS-40-39-39 EC8 Registered Smart FIO Memory Kit | 0 | $28,532.00 |  |  | NA | $445.81 | No | Not published by OCA | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/06/2026 | 12/31/2028 | [TEXT_32] |
| 33 | Memory | Memory | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Memory &gt; Memory | Memory | max 6 | 0 | 6 | [TEXT_33] | P64986-F21 | Standard | HPE 64GB (1x64GB) Dual Rank x4 DDR5-6400 CAS-52-52-52 EC8 Registered Smart FIO Memory Kit | 0 | $28,532.00 |  |  | NA | $445.81 | No | Not published by OCA | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/06/2026 | 07/31/2030 | [TEXT_32] |
| 34 | Memory | Memory | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Memory &gt; Memory | Memory | max 6 | 0 | 6 | [TEXT_34] | P50309-F21 | Standard | HPE 16GB (1x16GB) Single Rank x8 DDR5-4800 CAS-40-39-39 EC8 Registered Smart FIO Memory Kit | 0 | $7,439.00 |  |  | NA | $464.94 | No | Not published by OCA | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/06/2026 | 12/31/2028 | [TEXT_35] |
| 35 | Memory | Memory | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Memory &gt; Memory | Memory | max 6 | 0 | 6 | [TEXT_36] | P64985-F21 | Standard | HPE 32GB (1x32GB) Dual Rank x8 DDR5-6400 CAS-52-52-52 EC8 Registered Smart FIO Memory Kit | 0 | $13,909.00 |  |  | NA | $434.66 | No | Not published by OCA | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/06/2026 | 07/31/2030 | [TEXT_28] |
| 36 | Memory | Memory | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Memory &gt; Memory | Memory | max 6 | 0 | 6 | [TEXT_37] | P64987-F21 | Standard | HPE 96GB (1x96GB) Dual Rank x4 DDR5-6400 CAS-52-52-52 EC8 Registered Smart FIO Memory Kit | 0 | $47,056.00 |  |  | NA | $490.17 | No | Not published by OCA | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/06/2026 | 07/31/2030 | [TEXT_38] |
| 37 | Memory | Memory | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Memory &gt; Memory | Memory | max 6 | 0 | 6 | [TEXT_39] | P64988-F21 | Standard | HPE 128GB (1x128GB) Dual Rank x4 DDR5-6400 CAS-52-52-52 EC8 Registered Smart FIO Memory Kit | 0 | $60,190.00 |  |  | NA | $470.23 | No | Not published by OCA | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/06/2026 | 07/31/2030 | [TEXT_40] |
| 38 | Memory | Memory | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Memory &gt; Memory | Memory | max 6 | 0 | 6 | [TEXT_41] | P66676-F21 | Standard | HPE 96GB (1x96GB) Dual Rank x4 DDR5-4800 CAS-46-45-45 EC8 Registered Smart FIO Memory Kit | 0 | $47,056.00 |  |  | NA | $490.17 | No | Not published by OCA | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/06/2026 | 12/31/2028 | [TEXT_38] |
| 39 | Memory | Memory | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Memory &gt; Memory | Memory | max 6 | 0 | 6 | [TEXT_42] | P69982-F21 | Standard | HPE 128GB (1x128GB) Dual Rank x4 DDR5-4800 CAS-46-45-45 EC8 Registered Smart FIO Memory Kit | 0 | $60,190.00 |  |  | NA | $1,880.94 | No | Not published by OCA | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/06/2026 | 12/31/2028 | [TEXT_40] |
| 40 | Memory | Memory | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Memory &gt; Memory | Memory | max 6 | 0 | 6 | [TEXT_43] | P50309-B21 | Standard | HPE 16GB (1x16GB) Single Rank x8 DDR5-4800 CAS-40-39-39 EC8 Registered Smart Memory Kit | 0 | $7,439.00 |  |  | NA | $464.94 | No | Not published by OCA | 30 | 30 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 11/10/2022 | 12/31/2028 | [TEXT_44] |
| 41 | Memory | Memory | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Memory &gt; Memory | Memory | max 6 | 0 | 6 | [TEXT_45] | P50311-B21 | Standard | HPE 32GB (1x32GB) Dual Rank x8 DDR5-4800 CAS-40-39-39 EC8 Registered Smart Memory Kit | 0 | $13,909.00 |  |  | NA | $434.66 | No | Not published by OCA | 30 | 30 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 11/10/2022 | 12/31/2028 | [TEXT_46] |
| 42 | Memory | Memory | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Memory &gt; Memory | Memory | max 6 | 0 | 6 | [TEXT_47] | P50312-B21 | Standard | HPE 64GB (1x64GB) Dual Rank x4 DDR5-4800 CAS-40-39-39 EC8 Registered Smart Memory Kit | 0 | $28,532.00 |  |  | NA | $445.81 | No | Not published by OCA | 30 | 30 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 11/10/2022 | 12/31/2028 | [TEXT_48] |
| 43 | Memory | Memory | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Memory &gt; Memory | Memory | max 6 | 0 | 6 | [TEXT_49] | P64984-B21 | Standard | HPE 16GB (1x16GB) Single Rank x8 DDR5-6400 CAS-52-52-52 EC8 Registered Smart Memory Kit | 0 | $7,439.00 |  |  | NA | $464.94 | No | Not published by OCA | 30 | 30 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 07/31/2030 | [TEXT_44] |
| 44 | Memory | Memory | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Memory &gt; Memory | Memory | max 6 | 0 | 6 | [TEXT_50] | P64985-B21 | Standard | HPE 32GB (1x32GB) Dual Rank x8 DDR5-6400 CAS-52-52-52 EC8 Registered Smart Memory Kit | 0 | $13,909.00 |  |  | NA | $434.66 | No | Not published by OCA | 30 | 30 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 07/31/2030 | [TEXT_46] |
| 45 | Memory | Memory | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Memory &gt; Memory | Memory | max 6 | 0 | 6 | [TEXT_51] | P64986-B21 | Standard | HPE 64GB (1x64GB) Dual Rank x4 DDR5-6400 CAS-52-52-52 EC8 Registered Smart Memory Kit | 0 | $28,532.00 |  |  | NA | $445.81 | No | Not published by OCA | 30 | 30 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 07/31/2030 | [TEXT_48] |
| 46 | Memory | Memory | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Memory &gt; Memory | Memory | max 6 | 0 | 6 | [TEXT_52] | P64987-B21 | Standard | HPE 96GB (1x96GB) Dual Rank x4 DDR5-6400 CAS-52-52-52 EC8 Registered Smart Memory Kit | 0 | $47,056.00 |  |  | NA | $490.17 | No | Not published by OCA | 30 | 30 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 07/31/2030 | [TEXT_53] |
| 47 | Memory | Memory | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Memory &gt; Memory | Memory | max 6 | 0 | 6 | [TEXT_54] | P64988-B21 | Standard | HPE 128GB (1x128GB) Dual Rank x4 DDR5-6400 CAS-52-52-52 EC8 Registered Smart Memory Kit | 0 | $60,190.00 |  |  | NA | $470.23 | No | Not published by OCA | 30 | 30 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 07/31/2030 | [TEXT_55] |
| 48 | Memory | Memory | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Memory &gt; Memory | Memory | max 6 | 0 | 6 | [TEXT_56] | P66676-B21 | Standard | HPE 96GB (1x96GB) Dual Rank x4 DDR5-4800 CAS-46-45-45 EC8 Registered Smart Memory Kit | 0 | $47,056.00 |  |  | NA | $490.17 | No | Not published by OCA | 30 | 30 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 09/05/2023 | 12/31/2028 | [TEXT_53] |
| 49 | Storage Controllers | SAS Controller | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Storage Controllers &gt; SAS Controller | Storage Controller | max 2 | 0 | 2 | Selection constraint for SAS Controller: max 2 | 804398-B21 | Standard | HPE Smart Array E208e-p SR Gen10 (8 External Lanes/No Cache) 12G SAS PCIe Plug-in Controller | 0 | $1,775.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 07/11/2017 | 05/31/2029 | [TEXT_57] |
| 50 | Storage Controllers | SAS Controller | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Storage Controllers &gt; SAS Controller | Storage Controller | max 2 | 0 | 2 | Selection constraint for SAS Controller: max 2 | P47777-B21 | Standard | HPE MR416i-p Gen11 x16 Lanes 8GB Cache PCI SPDM Plug-in Storage Controller | 0 | $7,649.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 11/10/2022 | 05/31/2029 | [TEXT_58] |
| 51 | Storage Controllers | SAS Controller | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Storage Controllers &gt; SAS Controller | Storage Controller | max 2 | 0 | 2 | Selection constraint for SAS Controller: max 2 | P47785-B21 | Standard | HPE MR216i-p Gen11 x16 Lanes without Cache PCI SPDM Plug-in Storage Controller | 0 | $4,329.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 11/10/2022 | 05/31/2029 | [TEXT_59] |
| 52 | Storage Controllers | SAS Controller | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Storage Controllers &gt; SAS Controller | Storage Controller | max 2 | 0 | 2 | Selection constraint for SAS Controller: max 2 | P58335-B21 | Standard | HPE MR408i-o Gen11 x8 Lanes 4GB Cache OCP SPDM Storage Controller | 0 | $5,679.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 11/10/2022 | 05/31/2029 | [TEXT_60] |
| 53 | Storage Controllers | Smart Storage Batteries | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Storage Controllers &gt; Smart Storage Batteries | Storage Battery | max 1 | 0 | 1 | Selection constraint for Smart Storage Batteries: max 1 | P65038-B21 | Standard | HPE 16W Smart Hybrid Capacitor with 145mm Cable | 0 | $397.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 12/01/2025 | 07/31/2029 | [TEXT_61] |
| 54 | Storage Controllers | Smart Storage Batteries | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Storage Controllers &gt; Smart Storage Batteries | Storage Battery | max 1 | 0 | 1 | Selection constraint for Smart Storage Batteries: max 1 | P01366-B21 | Standard | HPE 96W Smart Storage Lithium-ion Battery with 145mm Cable Kit | 0 | $110.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 12/18/2017 | 05/31/2029 | [TEXT_62] |
| 55 | Storage Controllers | Smart Storage Batteries | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Storage Controllers &gt; Smart Storage Batteries | Storage Battery | max 1 | 0 | 1 | Selection constraint for Smart Storage Batteries: max 1 | P02377-B21 | Standard | HPE Smart Storage Hybrid Capacitor with 145mm Cable Kit | 0 | $397.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/02/2019 | 07/31/2027 | [TEXT_61] |
| 56 | Storage Controllers | Storage Controller Cables | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Storage Controllers &gt; Storage Controller Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Storage Controller Cables: max 1 | P72000-B21 | Standard | HPE ProLiant DL145 Gen11 MR216i-p 2SFF Storage Controller Cable Kit | 0 | $57.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 07/31/2028 | [TEXT_63] |
| 57 | Storage Controllers | Storage Controller Cables | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Storage Controllers &gt; Storage Controller Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Storage Controller Cables: max 1 | P72002-B21 | Standard | HPE ProLiant DL145 Gen11 MR408i-o 4EDSFF Storage Controller Cable Kit | 0 | $69.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 07/31/2028 | [TEXT_64] |
| 58 | Storage Controllers | Storage Controller Cables | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Storage Controllers &gt; Storage Controller Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Storage Controller Cables: max 1 | P73003-B21 | Standard | HPE ProLiant DL145 Gen11 MR216i-p/MR416i-p 4EDSFF Storage Controller Cable Kit | 0 | $160.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 07/31/2028 | [TEXT_65] |
| 59 | Storage Controllers | RAID Settings | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Storage Controllers &gt; RAID Settings | Storage Controller | max 1 | 0 | 1 | Selection constraint for RAID Settings: max 1 | 339777-B21 | Standard | HPE RAID 0 Drive 1 FIO Setting | 0 | $1.00 |  |  | NA |  | No | Available | 1 | 1 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/01/2008 | 10/31/2043 | [TEXT_7] |
| 60 | Storage Controllers | RAID Settings | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Storage Controllers &gt; RAID Settings | Storage Controller | max 1 | 0 | 1 | Selection constraint for RAID Settings: max 1 | 339778-B21 | Standard | HPE RAID 1 Drive 1 FIO Setting | 0 | $1.00 |  |  | NA |  | No | Available | 1 | 1 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/14/2003 | 08/31/2044 | [TEXT_7] |
| 61 | Storage Controllers | RAID Settings | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Storage Controllers &gt; RAID Settings | Storage Controller | max 1 | 0 | 1 | Selection constraint for RAID Settings: max 1 | 339779-B21 | Standard | HPE RAID 5 Drive 1 FIO Setting | 0 | $1.00 |  |  | NA |  | No | Available | 1 | 1 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/07/2016 | 10/31/2043 | [TEXT_7] |
| 62 | Storage Controllers | RAID Settings | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Storage Controllers &gt; RAID Settings | Storage Controller | max 1 | 0 | 1 | Selection constraint for RAID Settings: max 1 | 339780-B21 | Standard | HPE Raid 5 w/SP Drive 1 FIO Setting | 0 | $1.00 |  |  | NA |  | No | Available | 1 | 1 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/01/2008 | 10/31/2043 | [TEXT_7] |
| 63 | Storage Controllers | RAID Settings | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Storage Controllers &gt; RAID Settings | Storage Controller | max 1 | 0 | 1 | Selection constraint for RAID Settings: max 1 | 339781-B21 | Standard | HPE RAID FIO Advanced Data Guarding Option | 0 | $1.00 |  |  | NA |  | No | Available | 1 | 1 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/01/2008 | 10/31/2043 | [TEXT_7] |
| 64 | Storage Controllers | RAID Settings | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Storage Controllers &gt; RAID Settings | Storage Controller | max 1 | 0 | 1 | Selection constraint for RAID Settings: max 1 | 389692-B21 | Standard | HPE Customer Defined RAID Setting Service | 0 | $1.00 |  |  | NA |  | No | Available | 1 | 1 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 02/02/2005 | 01/31/2044 | [TEXT_66] |
| 65 | Drive Enclosures / Drives | Drive Cage | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; Drive Cage | Cable Kit | max 2 | 0 | 2 | Selection constraint for Drive Cage: max 2 | P71977-B21 | Standard | HPE ProLiant DL145 Gen11 2SFF Drive Cage Kit | 0 | $474.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 07/31/2028 | [TEXT_67] |
| 66 | Drive Enclosures / Drives | Drive Cage | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; Drive Cage | Cable Kit | max 2 | 0 | 2 | Selection constraint for Drive Cage: max 2 | P71981-B21 | Standard | HPE ProLiant DL145 Gen11 6EDSFF Cable Kit | 0 | $225.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 07/31/2028 | [TEXT_68] |
| 67 | Drive Enclosures / Drives | Drive Cage | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; Drive Cage | Cable Kit | max 2 | 0 | 2 | Selection constraint for Drive Cage: max 2 | P72004-B21 | Standard | HPE ProLiant DL145 Gen11 MR216i-p/MR416i-p 6EDSFF Storage Controller Cable Kit | 0 | $296.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 07/31/2028 | [TEXT_69] |
| 68 | Drive Enclosures / Drives | Drive Cage | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; Drive Cage | Cable Kit | max 2 | 0 | 2 | Selection constraint for Drive Cage: max 2 | P71985-B21 | Standard | HPE ProLiant DL145 Gen11 4EDSFF Drive Cage Kit | 1 | $380.00 |  |  | $380.00 |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 07/31/2028 | [TEXT_70] |
| 69 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P57803-B21 | Standard | HPE 7.68TB NVMe Gen5 High Performance Read Intensive E3S EC1 EDSFF SPDM PM1743 SSD | 0 | $27,476.00 |  |  | NA | $3.58 | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 01/31/2028 | [TEXT_71] |
| 70 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P63930-B21 | Standard | HPE 3.84TB NVMe Gen4 Mainstream Performance Very Read Optimized E3S EC1 EDSFF P5430 SSD | 0 | $7,781.00 |  |  | NA | $2.03 | No | EOL Warning (90-Day) | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | EOL Warning (90-Day) | 05/06/2024 | 01/31/2027 | [TEXT_72] |
| 71 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P63934-B21 | Standard | HPE 7.68TB NVMe Gen4 Mainstream Performance Very Read Optimized E3S EC1 EDSFF P5430 SSD | 0 | $9,712.00 |  |  | NA | $1.26 | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/06/2024 | 07/31/2027 | [TEXT_73] |
| 72 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P69237-B21 | Standard | HPE 3.84TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 CD8P SSD | 0 | $30,682.00 |  |  | NA | $7.99 | No | EOL Warning (90-Day) | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | EOL Warning (90-Day) | 07/01/2024 | 01/31/2027 | [TEXT_74] |
| 73 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P70669-B21 | Standard | HPE 3.2TB NVMe Gen5 High Performance Mixed Use E3S EC1 Self-encrypting FIPS 140-3 CM7 SSD | 0 | $16,870.00 |  |  | NA | $5.27 | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 12/02/2024 | 08/31/2027 | [TEXT_75] |
| 74 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P70672-B21 | Standard | HPE 6.4TB NVMe Gen5 High Performance Mixed Use E3S EC1 Self-encrypting FIPS 140-3 CM7 SSD | 0 | $68,106.00 |  |  | NA | $10.64 | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 12/02/2024 | 08/31/2027 | [TEXT_76] |
| 75 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P77265-B21 | Standard | HPE 3.2TB NVMe Gen5 Mainstream Performance Mixed Use E3S EC1 EDSFF SPDM PE1030 SSD | 0 | $24,988.00 |  |  | NA | $7.81 | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 02/03/2025 | 01/31/2028 | [TEXT_77] |
| 76 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P78787-B21 | Standard | HPE 6.4TB NVMe Gen5 High Performance Mixed Use E3.S EC1 PM1755 SSD | 0 | $35,088.00 |  |  | NA | $5.48 | No | Available | 60 | 60 | Constrained / Long Lead Time (&gt;45d) | OCA row attribute | Unpublished | Active | 04/06/2026 | 07/31/2028 | [TEXT_78] |
| 77 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P87719-B21 | Standard | HPE 1.92TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 Self-encrypting 7600 SSD | 0 | $17,948.00 |  |  | NA | $9.35 | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/03/2026 | 12/31/2027 | [TEXT_79] |
| 78 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P91084-B21 | Standard | HPE 1.6TB NVMe Gen5 Mainstream Performance Mixed Use E3.S EC1 E3 Thin Multi Vendor SSD | 0 | $19,893.00 |  |  | NA | $12.43 | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2026 | 07/31/2028 | [TEXT_80] |
| 79 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P91086-B21 | Standard | HPE 3.2TB NVMe Gen5 Mainstream Performance Mixed Use E3.S EC1 E3 Thin Multi Vendor SSD | 0 | $28,574.00 |  |  | NA | $8.93 | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2026 | 07/31/2028 | [TEXT_81] |
| 80 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P91088-B21 | Standard | HPE 6.4TB NVMe Gen5 Mainstream Performance Mixed Use E3.S EC1 E3 Thin Multi Vendor SSD | 0 | $23,265.00 |  |  | NA | $3.64 | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2026 | 07/31/2028 | [TEXT_82] |
| 81 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P91090-B21 | Standard | HPE 1.92TB NVMe Gen5 Mainstream Performance Read Intensive E3.S EC1 E3 Thin Multi Vendor SSD | 0 | $17,851.00 |  |  | NA | $9.30 | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2026 | 07/31/2028 | [TEXT_83] |
| 82 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P91092-B21 | Standard | HPE 3.84TB NVMe Gen5 Mainstream Performance Read Intensive E3.S EC1 E3 Thin Multi Vendor SSD | 0 | $28,196.00 |  |  | NA | $7.34 | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2026 | 07/31/2028 | [TEXT_84] |
| 83 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P91094-B21 | Standard | HPE 7.68TB NVMe Gen5 Mainstream Performance Read Intensive E3.S EC1 E3 Thin Multi Vendor SSD | 0 | $47,719.00 |  |  | NA | $6.21 | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2026 | 07/31/2028 | [TEXT_85] |
| 84 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P91096-B21 | Standard | HPE 15.36TB NVMe Gen5 Mainstream Performance Read Intensive E3.S EC1 E3 Thin Multi Vendor SSD | 0 | $85,736.00 |  |  | NA | $5.58 | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2026 | 07/31/2028 | [TEXT_86] |
| 85 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P91098-B21 | Standard | HPE 3.2TB NVMe Gen5 High Performance Mixed Use E3.S EC1 E3 Thin Multi Vendor SSD | 0 | $36,346.00 |  |  | NA | $11.36 | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2026 | 07/31/2028 | [TEXT_87] |
| 86 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P91100-B21 | Standard | HPE 6.4TB NVMe Gen5 High Performance Mixed Use E3.S EC1 E3 Thin Multi Vendor SSD | 0 | $61,895.00 |  |  | NA | $9.67 | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2026 | 07/31/2028 | [TEXT_88] |
| 87 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P91102-B21 | Standard | HPE 12.8TB NVMe Gen5 High Performance Mixed Use E3.S EC1 E3 Thin Multi Vendor SSD | 0 | $111,990.00 |  |  | NA | $8.75 | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2026 | 07/31/2028 | [TEXT_89] |
| 88 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P91229-B21 | Standard | HPE 3.84TB NVMe Gen5 High Performance Read Intensive E3.S EC1 E3 Thin Multi Vendor SSD | 0 | $37,112.00 |  |  | NA | $9.66 | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2026 | 07/31/2028 | [TEXT_90] |
| 89 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P61183-B21 | Standard | HPE 7.68TB NVMe Gen5 High Performance Read Intensive E3S EC1 EDSFF SPDM CM7 SSD | 0 | $75,784.00 |  |  | NA | $9.87 | No | EOL Warning (90-Day) | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | EOL Warning (90-Day) | 12/04/2023 | 02/28/2027 | [TEXT_91] |
| 90 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P69239-B21 | Standard | HPE 7.68TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 CD8P SSD | 0 | $44,109.00 |  |  | NA | $5.74 | No | EOL Warning (90-Day) | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | EOL Warning (90-Day) | 07/01/2024 | 01/31/2027 | [TEXT_92] |
| 91 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P78923-B21 | Standard | HPE 30.72TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 EDSFF SPDM PM9D3a SSD | 0 | $153,423.00 |  |  | NA | $4.99 | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/04/2026 | 07/31/2028 | [TEXT_93] |
| 92 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P85121-B21 | Standard | HPE 1.92TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 SPDM 7600 SSD | 0 | $17,948.00 |  |  | NA | $9.35 | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/03/2026 | 12/31/2027 | [TEXT_94] |
| 93 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P85735-B21 | Standard | HPE 12.8TB NVMe Gen5 High Performance Mixed Use E3.S EC1 E3 Thin PQC27 CM9 SSD | 0 | $114,862.00 |  |  | NA | $8.97 | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 07/06/2026 | 12/31/2027 | [TEXT_95] |
| 94 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P87717-B21 | Standard | HPE 3.2TB NVMe Gen5 Mainstream Performance Mixed Use E3.S EC1 Self-encrypting 7600 SSD | 0 | $27,764.00 |  |  | NA | $8.68 | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 07/06/2026 | 04/30/2028 | [TEXT_96] |
| 95 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P87721-B21 | Standard | HPE 3.84TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 Self-encrypting 7600 SSD | 0 | $27,397.00 |  |  | NA | $7.13 | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/03/2026 | 12/31/2027 | [TEXT_97] |
| 96 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P87723-B21 | Standard | HPE 7.68TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 Self-encrypting 7600 SSD | 0 | $47,241.00 |  |  | NA | $6.15 | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/03/2026 | 12/31/2027 | [TEXT_98] |
| 97 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P57799-B21 | Standard | HPE 3.84TB NVMe Gen5 High Performance Read Intensive E3S EC1 EDSFF SPDM PM1743 SSD | 0 | $36,705.00 |  |  | NA | $9.56 | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 04/03/2023 | 09/30/2026 | [TEXT_99] |
| 98 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P57807-B21 | Standard | HPE 15.36TB NVMe Gen5 High Performance Read Intensive E3S EC1 EDSFF SPDM PM1743 SSD | 0 | $127,927.00 |  |  | NA | $8.33 | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 04/03/2023 | 10/31/2026 | [TEXT_100] |
| 99 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P61179-B21 | Standard | HPE 3.84TB NVMe Gen5 High Performance Read Intensive E3S EC1 EDSFF SPDM CM7 SSD | 0 | $47,029.00 |  |  | NA | $12.25 | No | EOL Warning (90-Day) | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | EOL Warning (90-Day) | 12/04/2023 | 01/31/2027 | [TEXT_101] |
| 100 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P61187-B21 | Standard | HPE 15.36TB NVMe Gen5 High Performance Read Intensive E3S EC1 EDSFF SPDM CM7 SSD | 0 | $118,842.00 |  |  | NA | $7.74 | No | EOL Warning (90-Day) | 60 | 60 | Constrained / Long Lead Time (&gt;45d) | OCA row attribute | Unpublished | EOL Warning (90-Day) | 12/04/2023 | 01/31/2027 | [TEXT_102] |
| 101 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P61191-B21 | Standard | HPE 3.2TB NVMe Gen5 High Performance Mixed Use E3S EC1 EDSFF SPDM CM7 SSD | 0 | $42,682.00 |  |  | NA | $13.34 | No | EOL Warning (90-Day) | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | EOL Warning (90-Day) | 12/04/2023 | 01/31/2027 | [TEXT_103] |
| 102 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P61195-B21 | Standard | HPE 6.4TB NVMe Gen5 High Performance Mixed Use E3S EC1 EDSFF SPDM CM7 SSD | 0 | $60,093.00 |  |  | NA | $9.39 | No | EOL Warning (90-Day) | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | EOL Warning (90-Day) | 12/04/2023 | 02/01/2027 | [TEXT_104] |
| 103 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P63938-B21 | Standard | HPE 15.36TB NVMe Gen4 Mainstream Performance Very Read Optimized E3S EC1 EDSFF P5430 SSD | 0 | $96,543.00 |  |  | NA | $6.29 | No | EOL Warning (90-Day) | 60 | 60 | Constrained / Long Lead Time (&gt;45d) | OCA row attribute | Unpublished | EOL Warning (90-Day) | 05/06/2024 | 01/31/2027 | [TEXT_105] |
| 104 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P69546-B21 | Standard | HPE 15.36TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 CD8P SSD | 0 | $75,476.00 |  |  | NA | $4.91 | No | EOL Warning (90-Day) | 60 | 60 | Constrained / Long Lead Time (&gt;45d) | OCA row attribute | Unpublished | EOL Warning (90-Day) | 07/01/2024 | 01/31/2027 | [TEXT_106] |
| 105 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P70674-B21 | Standard | HPE 7.68TB NVMe Gen5 High Performance Read Intensive E3S EC1 Self-encrypting FIPS 140-3 CM7 SSD | 0 | $47,438.00 |  |  | NA | $6.18 | No | Available | 21 | 21 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 12/02/2024 | 08/31/2027 | [TEXT_107] |
| 106 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P77262-B21 | Standard | HPE 1.6TB NVMe Gen5 Mainstream Performance Mixed Use E3S EC1 EDSFF SPDM PE1030 SSD | 0 | $17,396.00 |  |  | NA | $10.87 | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 02/03/2025 | 01/31/2028 | [TEXT_108] |
| 107 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P77269-B21 | Standard | HPE 1.92TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 EDSFF SPDM PE1010 SSD | 0 | $16,153.00 |  |  | NA | $8.41 | No | Available | 30 | 30 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 02/03/2025 | 01/31/2028 | [TEXT_109] |
| 108 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P77271-B21 | Standard | HPE 3.84TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 EDSFF SPDM PE1010 SSD | 0 | $24,851.00 |  |  | NA | $6.47 | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 02/03/2025 | 01/31/2028 | [TEXT_110] |
| 109 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P78784-B21 | Standard | HPE 3.2TB NVMe Gen5 High Performance Mixed Use E3.S EC1 PM1755 SSD | 0 | $22,771.00 |  |  | NA | $7.12 | No | Available | 30 | 30 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/06/2026 | 07/31/2028 | [TEXT_111] |
| 110 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P78789-B21 | Standard | HPE 3.84TB NVMe Gen5 High Performance Read Intensive E3.S EC1 PM1753 SSD | 0 | $37,546.00 |  |  | NA | $9.78 | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/04/2026 | 07/31/2028 | [TEXT_112] |
| 111 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P78791-B21 | Standard | HPE 7.68TB NVMe Gen5 High Performance Read Intensive E3.S EC1 PM1753 SSD | 0 | $65,439.00 |  |  | NA | $8.52 | No | Available | 60 | 60 | Constrained / Long Lead Time (&gt;45d) | OCA row attribute | Unpublished | Active | 05/04/2026 | 07/31/2028 | [TEXT_113] |
| 112 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P78793-B21 | Standard | HPE 15.36TB NVMe Gen5 High Performance Read Intensive E3.S EC1 PM1753 SSD | 0 | $127,927.00 |  |  | NA | $8.33 | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 05/04/2026 | 07/31/2028 | [TEXT_114] |
| 113 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P79065-B21 | Standard | HPE 30.72TB NVMe Gen4 Mainstream Performance Very Read Optimized E3S EC1 EDSFF P5430 SSD | 0 | $180,169.00 |  |  | NA | $5.86 | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 06/02/2025 | 07/31/2027 | [TEXT_115] |
| 114 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P79122-B21 | Standard | HPE 15.36TB NVMe Gen5 High Performance Read Intensive E3S EC1 Self-encrypting FIPS 140-3 CM7 SSD | 0 | $118,713.00 |  |  | NA | $7.73 | No | Available | 60 | 60 | Constrained / Long Lead Time (&gt;45d) | OCA row attribute | Unpublished | Active | 04/07/2025 | 08/31/2027 | [TEXT_116] |
| 115 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P79147-B21 | Standard | HPE 30.72TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 EDSFF Self-encrypting PM9D3a SSD | 0 | $153,423.00 |  |  | NA | $4.99 | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/04/2026 | 07/31/2028 | [TEXT_117] |
| 116 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P79965-B21 | Standard | HPE 30.72TB NVMe Gen5 High Performance Read Intensive E3.S EC1 EDSFF SPDM 9550 SSD | 0 | $169,476.00 |  |  | NA | $5.52 | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 01/05/2026 | 04/30/2027 | [TEXT_118] |
| 117 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P85114-B21 | Standard | HPE 1.6TB NVMe Gen5 Mainstream Performance Mixed Use E3S EC1 SPDM 7600 SSD | 0 | $19,329.00 |  |  | NA | $12.08 | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/03/2026 | 12/31/2027 | [TEXT_119] |
| 118 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P85117-B21 | Standard | HPE 3.2TB NVMe Gen5 Mainstream Performance Mixed Use E3S EC1 SPDM 7600 SSD | 0 | $27,764.00 |  |  | NA | $8.68 | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/03/2026 | 12/31/2027 | [TEXT_120] |
| 119 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P85119-B21 | Standard | HPE 6.4TB NVMe Gen5 Mainstream Performance Mixed Use E3S EC1 SPDM 7600 SSD | 0 | $44,163.00 |  |  | NA | $6.90 | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/03/2026 | 12/31/2027 | [TEXT_121] |
| 120 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P85124-B21 | Standard | HPE 3.84TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 SPDM 7600 SSD | 0 | $27,397.00 |  |  | NA | $7.13 | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/03/2026 | 12/31/2027 | [TEXT_122] |
| 121 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P85126-B21 | Standard | HPE 7.68TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 SPDM 7600 SSD | 0 | $47,241.00 |  |  | NA | $6.15 | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/03/2026 | 12/31/2027 | [TEXT_123] |
| 122 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P85128-B21 | Standard | HPE 15.36TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 SPDM 7600 SSD | 0 | $83,307.00 |  |  | NA | $5.42 | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/03/2026 | 12/31/2027 | [TEXT_124] |
| 123 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P85731-B21 | Standard | HPE 3.2TB NVMe Gen5 High Performance Mixed Use E3.S EC1 E3 Thin PQC27 CM9 SSD | 0 | $37,278.00 |  |  | NA | $11.65 | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 07/06/2026 | 12/31/2027 | [TEXT_125] |
| 124 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P85733-B21 | Standard | HPE 6.4TB NVMe Gen5 High Performance Mixed Use E3.S EC1 E3 Thin PQC27 CM9 SSD | 0 | $63,483.00 |  |  | NA | $9.92 | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 07/06/2026 | 12/31/2027 | [TEXT_126] |
| 125 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P85739-B21 | Standard | HPE 3.84TB NVMe Gen5 High Performance Read Intensive E3.S EC1 E3 Thin PQC27 CM9 SSD | 0 | $38,063.00 |  |  | NA | $9.91 | No | Available | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 07/06/2026 | 10/31/2027 | [TEXT_127] |
| 126 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P85741-B21 | Standard | HPE 7.68TB NVMe Gen5 High Performance Read Intensive E3.S EC1 E3 Thin PQC27 CM9 SSD | 0 | $48,943.00 |  |  | NA | $6.37 | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 07/06/2026 | 10/31/2027 | [TEXT_128] |
| 127 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P85743-B21 | Standard | HPE 15.36TB NVMe Gen5 High Performance Read Intensive E3.S EC1 E3 Thin PQC27 CM9 SSD | 0 | $126,482.00 |  |  | NA | $8.23 | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 07/06/2026 | 10/31/2027 | [TEXT_129] |
| 128 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P85745-B21 | Standard | HPE 30.72TB NVMe Gen5 High Performance Read Intensive E3.S EC1 E3 Thin PQC27 CM9 SSD | 0 | $181,026.00 |  |  | NA | $5.89 | No | Available | 10 | 10 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 07/06/2026 | 10/31/2027 | [TEXT_130] |
| 129 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P86016-B21 | Standard | HPE 1.6TB NVMe Gen5 Mainstream Performance Mixed Use E3.S EC1 E3 Thin PQC27 CD9P SSD | 0 | $17,161.00 |  |  | NA | $10.73 | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/05/2026 | 02/29/2028 | [TEXT_131] |
| 130 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P86018-B21 | Standard | HPE 3.2TB NVMe Gen5 Mainstream Performance Mixed Use E3.S EC1 E3 Thin PQC27 CD9P SSD | 0 | $23,477.00 |  |  | NA | $7.34 | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/05/2026 | 02/29/2028 | [TEXT_132] |
| 131 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P86020-B21 | Standard | HPE 6.4TB NVMe Gen5 Mainstream Performance Mixed Use E3.S EC1 E3 Thin PQC27 CD9P SSD | 0 | $37,804.00 |  |  | NA | $5.91 | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/05/2026 | 02/29/2028 | [TEXT_133] |
| 132 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P86024-B21 | Standard | HPE 1.92TB NVMe Gen5 Mainstream Performance Read Intensive E3.S EC1 E3 Thin PQC27 CD9P SSD | 0 | $17,161.00 |  |  | NA | $8.94 | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/05/2026 | 02/29/2028 | [TEXT_131] |
| 133 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P86026-B21 | Standard | HPE 3.84TB NVMe Gen5 Mainstream Performance Read Intensive E3.S EC1 E3 Thin PQC27 CD9P SSD | 0 | $23,477.00 |  |  | NA | $6.11 | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/05/2026 | 02/29/2028 | [TEXT_132] |
| 134 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P86028-B21 | Standard | HPE 7.68TB NVMe Gen5 Mainstream Performance Read Intensive E3.S EC1 E3 Thin PQC27 CD9P SSD | 0 | $37,804.00 |  |  | NA | $4.92 | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/05/2026 | 02/29/2028 | [TEXT_133] |
| 135 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P86030-B21 | Standard | HPE 15.36TB NVMe Gen5 Mainstream Performance Read Intensive E3.S EC1 E3 Thin PQC27 CD9P SSD | 0 | $64,477.00 |  |  | NA | $4.20 | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/05/2026 | 02/29/2028 | [TEXT_134] |
| 136 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P86032-B21 | Standard | HPE 30.72TB NVMe Gen5 Mainstream Performance Read Intensive E3.S EC1 E3 Thin PQC27 CD9P SSD | 0 | $128,913.00 |  |  | NA | $4.20 | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/05/2026 | 02/29/2028 | [TEXT_135] |
| 137 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P86746-B21 | Standard | HPE 61.44TB NVMe Gen5 Mainstream Performance Very Read Optimized E3.S EC1 Self-encrypting 6600 SSD | 0 | $210,628.00 |  |  | NA | $3.43 | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/05/2026 | 02/29/2028 | [TEXT_136] |
| 138 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P86748-B21 | Standard | HPE 122.8TB NVMe Gen5 Mainstream Performance Very Read Optimized E3.S EC1 Self-encrypting 6600 SSD | 0 | $400,156.00 |  |  | NA | $3.26 | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/05/2026 | 02/29/2028 | [TEXT_137] |
| 139 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P87715-B21 | Standard | HPE 1.6TB NVMe Gen5 Mainstream Performance Mixed Use E3.S EC1 Self-encrypting 7600 SSD | 0 | $19,329.00 |  |  | NA | $12.08 | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 07/06/2026 | 04/30/2028 | [TEXT_119] |
| 140 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P88535-B21 | Standard | HPE 1.6TB NVMe Gen5 Mainstream Performance Mixed Use E3.S EC1 PQC27 Self-encrypting CD9P SSD | 0 | $17,161.00 |  |  | NA | $10.73 | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/05/2026 | 02/29/2028 | [TEXT_131] |
| 141 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P88537-B21 | Standard | HPE 3.2TB NVMe Gen5 Mainstream Performance Mixed Use E3.S EC1 PQC27 Self-encrypting CD9P SSD | 0 | $23,477.00 |  |  | NA | $7.34 | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/05/2026 | 02/29/2028 | [TEXT_132] |
| 142 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P88539-B21 | Standard | HPE 3.84TB NVMe Gen5 Mainstream Performance Read Intensive E3.S EC1 PQC27 Self-encrypting CD9P SSD | 0 | $23,477.00 |  |  | NA | $6.11 | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/05/2026 | 02/29/2028 | [TEXT_132] |
| 143 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P88541-B21 | Standard | HPE 7.68TB NVMe Gen5 Mainstream Performance Read Intensive E3.S EC1 PQC27 Self-encrypting CD9P SSD | 0 | $37,804.00 |  |  | NA | $4.92 | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/05/2026 | 02/29/2028 | [TEXT_133] |
| 144 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P88543-B21 | Standard | HPE 15.36TB NVMe Gen5 Mainstream Performance Read Intensive E3.S EC1 PQC27 Self-encrypting CD9P SSD | 0 | $64,477.00 |  |  | NA | $4.20 | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/05/2026 | 02/29/2028 | [TEXT_134] |
| 145 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P91231-B21 | Standard | HPE 7.68TB NVMe Gen5 High Performance Read Intensive E3.S EC1 E3 Thin Multi Vendor SSD | 0 | $30,331.00 |  |  | NA | $3.95 | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2026 | 07/31/2028 | [TEXT_138] |
| 146 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P91233-B21 | Standard | HPE 15.36TB NVMe Gen5 High Performance Read Intensive E3.S EC1 E3 Thin Multi Vendor SSD | 0 | $123,319.00 |  |  | NA | $8.03 | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2026 | 07/31/2028 | [TEXT_139] |
| 147 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Discontinued Hardware | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P69234-B21 | Standard | [REMOVED SKU] HPE 1.92TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 CD8P SSD | 0 | $19,743.00 |  | - | $0.00 | - | No | EOL Warning (90-Day) | Not available (Discontinued) |  | Unpublished | Not published by OCA | Unpublished | EOL Warning (90-Day) | 07/01/2024 | 2026-11-20 | {} |
| 148 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Discontinued Hardware | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P69241-B21 | Standard | [REMOVED SKU] HPE 1.6TB NVMe Gen5 Mainstream Performance Mixed Use E3S EC1 CD8P SSD | 0 | $20,109.00 |  | - | $0.00 | - | No | EOL Warning (90-Day) | Not available (Discontinued) |  | Unpublished | Not published by OCA | Unpublished | EOL Warning (90-Day) | 07/01/2024 | 2026-11-20 | {} |
| 149 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Discontinued Hardware | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P69243-B21 | Standard | [REMOVED SKU] HPE 3.2TB NVMe Gen5 Mainstream Performance Mixed Use E3S EC1 CD8P SSD | 0 | $27,452.00 |  | - | $0.00 | - | No | EOL Warning (90-Day) | Not available (Discontinued) |  | Unpublished | Not published by OCA | Unpublished | EOL Warning (90-Day) | 07/01/2024 | 2026-11-20 | {} |
| 150 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Discontinued Hardware | max 4 | 0 | 4 | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 | P69245-B21 | Standard | [REMOVED SKU] HPE 6.4TB NVMe Gen5 Mainstream Performance Mixed Use E3S EC1 CD8P SSD | 0 | $44,109.00 |  | - | $0.00 | - | No | EOL Warning (90-Day) | Not available (Discontinued) |  | Unpublished | Not published by OCA | Unpublished | EOL Warning (90-Day) | 07/01/2024 | 2026-11-20 | {} |
| 151 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | [TEXT_140] | P79615-B21 | Standard | HPE 30.72TB NVMe Gen5 Mainstream Performance Very Read Optimized E3.S EC1 EDSFF 6550 SSD | 0 | $140,919.00 |  |  | NA | $4.59 | No | EOL Warning (90-Day) | 60 | 60 | Constrained / Long Lead Time (&gt;45d) | OCA row attribute | Unpublished | EOL Warning (90-Day) | 04/27/2026 | 01/31/2027 | [TEXT_141] |
| 152 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | [TEXT_142] | P79618-B21 | Standard | HPE 61.44TB NVMe Gen5 Mainstream Performance Very Read Optimized E3.S EC1 EDSFF 6550 SSD | 0 | $284,757.00 |  |  | NA | $4.63 | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/27/2026 | 05/31/2027 | [TEXT_143] |
| 153 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | [TEXT_144] | P79620-B21 | Standard | HPE 30.72TB NVMe Gen5 Mainstream Performance Very Read Optimized EC1 EDSFF Self-encrypting 6550 SSD | 0 | $140,919.00 |  |  | NA | $4.59 | No | EOL Warning (90-Day) | 10 | 10 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | EOL Warning (90-Day) | 04/27/2026 | 01/31/2027 | [TEXT_145] |
| 154 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Drive Enclosures / Drives &gt; SSD - EDSFF NVME Read Intensive | Drive Cage / Drive | max 4 | 0 | 4 | [TEXT_146] | P79623-B21 | Standard | HPE 61.44TB NVMe Gen5 Mainstream Performance Very Read Optimized EC1 EDSFF Self-encrypting 6550 SSD | 0 | $255,131.00 |  |  | NA | $4.15 | No | EOL Warning (90-Day) | 10 | 10 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | EOL Warning (90-Day) | 04/27/2026 | 01/31/2027 | [TEXT_147] |
| 210 | Factory Configuration Settings | Factory Configuration Settings | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Factory Configuration Settings &gt; Factory Configuration Settings | Option Component | max 2 | 0 | 2 | Selection constraint for Factory Configuration Settings: max 2 | P73214-B21 | Standard | HPE ProLiant DL145 Gen11 Disabled External USB Port FIO System Setting | 0 | $1.00 |  |  | NA |  | No | Available | 1 | 1 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 10/31/2099 | [TEXT_7] |
| 211 | Cooling / Thermal | Heatsink Kit | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Cooling / Thermal &gt; Heatsink Kit | Cable Kit | max 1 | 0 | 1 | [TEXT_148] | P35876-B21 | Standard | HPE CE Mark Removal FIO Enablement Kit | 0 | $1.00 |  |  | NA |  | No | Not published by OCA | 1 | 1 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/05/2020 | 08/31/2028 | [TEXT_7] |
| 212 | Accessories &amp; Infrastructure | vSAN Tracking SKUs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Accessories &amp; Infrastructure &gt; vSAN Tracking SKUs | Chassis Infrastructure | Unlimited | 0 | Unlimited | Selection constraint for vSAN Tracking SKUs: no max | P63226-B21 | Standard | HPE ProLiant vSAN ReadyNode Express Storage Architecture FIO Tracking | 0 | $1.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/01/2023 | 06/30/2028 | [TEXT_149] |
| 213 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | max 1 | 0 | 1 | Selection constraint for iLO Common Password: max 1 | P08040-B21 | Standard | HPE iLO Common Password FIO Setting | 0 | $1.00 |  |  | NA |  | No | Available | 1 | 1 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 12/02/2019 | 07/31/2028 | [TEXT_7] |
| 214 | PCIe Risers | Riser Cards | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; PCIe Risers &gt; Riser Cards | PCIe Riser | max 3 | 0 | 3 | Selection constraint for Riser Cards: max 3 | P71989-B21 | Standard | HPE ProLiant DL145 Gen11 x16 FHFL PCIe Gen5 Slot 2 Riser Kit | 0 | $255.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 07/31/2028 | [TEXT_150] |
| 215 | PCIe Risers | Riser Cards | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; PCIe Risers &gt; Riser Cards | PCIe Riser | max 3 | 0 | 3 | Selection constraint for Riser Cards: max 3 | P71991-B21 | Standard | HPE ProLiant DL145 Gen11 x16 FHFL PCIe Gen5 Slot 1 Riser Kit | 0 | $320.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 07/31/2028 | [TEXT_151] |
| 216 | Networking | Ethernet PCIe | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Networking &gt; Ethernet PCIe | Network Adapter | max 1 | 0 | 1 | Selection constraint for Ethernet PCIe: max 1 | P26253-B21 | Standard | Broadcom BCM57416 Ethernet 10Gb 2-port BASE-T Adapter for HPE | 0 | $1,105.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 11/02/2020 | 01/31/2029 | [TEXT_152] |
| 217 | Networking | Ethernet PCIe | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Networking &gt; Ethernet PCIe | Network Adapter | max 1 | 0 | 1 | Selection constraint for Ethernet PCIe: max 1 | P26259-B21 | Standard | Broadcom BCM57412 Ethernet 10Gb 2-port SFP+ Adapter for HPE | 0 | $940.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/05/2020 | 01/31/2029 | [TEXT_153] |
| 218 | Networking | Ethernet PCIe | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Networking &gt; Ethernet PCIe | Network Adapter | max 1 | 0 | 1 | Selection constraint for Ethernet PCIe: max 1 | P26262-B21 | Standard | Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 Adapter for HPE | 0 | $1,184.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/05/2020 | 01/31/2029 | [TEXT_154] |
| 219 | Networking | Ethernet PCIe | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Networking &gt; Ethernet PCIe | Network Adapter | max 1 | 0 | 1 | Selection constraint for Ethernet PCIe: max 1 | P42044-B21 | Standard | Mellanox MCX631102AS-ADAT Ethernet 10/25Gb 2-port SFP28 Adapter for HPE | 0 | $1,500.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 02/07/2022 | 01/31/2029 | [TEXT_155] |
| 220 | Networking | Ethernet PCIe | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Networking &gt; Ethernet PCIe | Network Adapter | max 1 | 0 | 1 | Selection constraint for Ethernet PCIe: max 1 | P51178-B21 | Standard | Broadcom BCM5719 Ethernet 1Gb 4-port BASE-T Adapter for HPE | 0 | $485.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 06/06/2022 | 01/31/2029 | [TEXT_156] |
| 221 | Networking | Ethernet PCIe | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Networking &gt; Ethernet PCIe | Network Adapter | max 1 | 0 | 1 | Selection constraint for Ethernet PCIe: max 1 | P08443-B21 | Standard | Intel E810-XXVDA2 Ethernet 10/25Gb 2-port SFP28 Adapter for HPE | 0 | $1,680.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/06/2021 | 12/31/2027 | [TEXT_157] |
| 222 | Networking | Ethernet PCIe | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Networking &gt; Ethernet PCIe | Network Adapter | max 1 | 0 | 1 | Selection constraint for Ethernet PCIe: max 1 | P08458-B21 | Standard | Intel E810-XXVDA4 Ethernet 10/25Gb 4-port SFP28 Adapter for HPE | 0 | $3,770.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/06/2021 | 06/30/2028 | [TEXT_158] |
| 223 | Networking | Ethernet PCIe | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Networking &gt; Ethernet PCIe | Network Adapter | max 1 | 0 | 1 | Selection constraint for Ethernet PCIe: max 1 | P26264-B21 | Standard | Broadcom BCM57504 Ethernet 10/25Gb 4-port SFP28 Adapter for HPE | 0 | $2,598.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/06/2022 | 01/31/2029 | [TEXT_159] |
| 224 | Networking | OCP Ethernet | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Networking &gt; OCP Ethernet | Network Adapter | max 1 | 0 | 1 | Selection constraint for OCP Ethernet: max 1 | P51181-B21 | Standard | Broadcom BCM5719 Ethernet 1Gb 4-port BASE-T OCP3 Adapter for HPE | 1 | $485.00 |  |  | $485.00 |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 06/06/2022 | 01/31/2029 | [TEXT_156] |
| 225 | Networking | OCP Ethernet | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Networking &gt; OCP Ethernet | Network Adapter | max 1 | 0 | 1 | [TEXT_160] | P10097-B21 | Standard | Broadcom BCM57416 Ethernet 10Gb 2-port BASE-T OCP3 Adapter for HPE | 0 | $1,105.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 11/02/2020 | 01/31/2029 | [TEXT_152] |
| 226 | Networking | OCP Ethernet | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Networking &gt; OCP Ethernet | Network Adapter | max 1 | 0 | 1 | [TEXT_161] | P10115-B21 | Standard | Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter for HPE | 0 | $1,231.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 11/02/2020 | 01/31/2029 | [TEXT_162] |
| 227 | Networking | OCP Ethernet | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Networking &gt; OCP Ethernet | Network Adapter | max 1 | 0 | 1 | [TEXT_163] | P42041-B21 | Standard | Mellanox MCX631432AS-ADAI Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter for HPE | 0 | $1,398.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 02/07/2022 | 01/31/2029 | [TEXT_164] |
| 228 | Networking | OCP Ethernet | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Networking &gt; OCP Ethernet | Network Adapter | max 1 | 0 | 1 | [TEXT_165] | P08449-B21 | Standard | Intel I350-T4 Ethernet 1Gb 4-port BASE-T OCP3 Adapter for HPE | 0 | $830.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 12/16/2019 | 12/31/2028 | [TEXT_166] |
| 229 | Networking | OCP Ethernet | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Networking &gt; OCP Ethernet | Network Adapter | max 1 | 0 | 1 | [TEXT_167] | P10106-B21 | Standard | Intel E810-XXVDA2 Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter for HPE | 0 | $1,680.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/06/2021 | 12/31/2027 | [TEXT_157] |
| 230 | Networking | OCP Ethernet | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Networking &gt; OCP Ethernet | Network Adapter | max 1 | 0 | 1 | [TEXT_168] | P26256-B21 | Standard | Broadcom BCM57412 Ethernet 10Gb 2-port SFP+ OCP3 Adapter for HPE | 0 | $940.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/05/2020 | 01/31/2029 | [TEXT_153] |
| 231 | Networking | OCP Ethernet | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Networking &gt; OCP Ethernet | Network Adapter | max 1 | 0 | 1 | [TEXT_169] | P26269-B21 | Standard | Broadcom BCM57504 Ethernet 10/25Gb 4-port SFP28 OCP3 Adapter for HPE | 0 | $2,598.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/06/2022 | 01/31/2029 | [TEXT_159] |
| 232 | Networking | Transceivers | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Networking &gt; Transceivers | Transceiver | max 16 | 0 | 16 | Selection constraint for Transceivers: max 16 | 455886-B21 | Standard | HPE BladeSystem c-Class 10Gb SFP+ LR Transceiver | 0 | $1,751.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 12/01/2008 | 12/31/2030 | [TEXT_170] |
| 233 | Networking | Transceivers | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Networking &gt; Transceivers | Transceiver | max 16 | 0 | 16 | Selection constraint for Transceivers: max 16 | 453151-B21 | Standard | HPE BladeSystem c-Class Virtual Connect 1G SFP SX Transceiver | 0 | $427.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 10/01/2007 | 08/30/2027 | [TEXT_171] |
| 234 | Networking | Transceivers | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Networking &gt; Transceivers | Transceiver | max 16 | 0 | 16 | Selection constraint for Transceivers: max 16 | 453154-B21 | Standard | HPE BladeSystem CClass Virtual Connect 1G SFP RJ45 Transceiver | 0 | $426.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 11/16/2007 | 08/30/2027 | [TEXT_172] |
| 235 | Networking | Transceivers | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Networking &gt; Transceivers | Transceiver | max 16 | 0 | 16 | Selection constraint for Transceivers: max 16 | 455883-B21 | Standard | HPE BladeSystem c-Class 10Gb SFP+ SR Transceiver | 0 | $842.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 12/01/2008 | 12/31/2030 | [TEXT_173] |
| 236 | Networking | Transceivers | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Networking &gt; Transceivers | Transceiver | max 16 | 0 | 16 | Selection constraint for Transceivers: max 16 | 845398-B21 | Standard | HPE 25Gb SFP28 SR 100m Transceiver | 0 | $2,110.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 06/06/2016 | 07/31/2028 | [TEXT_174] |
| 237 | Networking | Transceivers | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Networking &gt; Transceivers | Transceiver | max 16 | 0 | 16 | Selection constraint for Transceivers: max 16 | JL486A | Standard | HPE Aruba Networking 25G SFP28 LC LR 10km SMF Transceiver | 0 | $5,199.00 |  |  | NA |  | No | Available | 78 | 78 | Constrained / Long Lead Time (&gt;45d) | OCA row attribute | Unpublished | Active | 12/03/2018 | 12/31/2099 | [TEXT_175] |
| 238 | Software &amp; Licenses | VMWare Core Editions | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; VMWare Core Editions | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for VMWare Core Editions: no max | R8V76A | Standard | SUSE Linux Enterprise Server 1-2 Sockets Unlimited VM w/Live Patching 1-year 24x7 Flexible LTU | 0 | $3,980.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/04/2021 | 05/31/2028 | [TEXT_176] |
| 239 | Software &amp; Licenses | VMWare Core Editions | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; VMWare Core Editions | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for VMWare Core Editions: no max | R8V74A | Standard | SUSE Linux Enterprise Server 1-2 Sockets Unlimited VM w/Live Patching 1-year 9x5 Flexible LTU | 0 | $2,260.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/04/2021 | 05/31/2028 | [TEXT_177] |
| 240 | Software &amp; Licenses | VMWare Core Editions | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; VMWare Core Editions | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for VMWare Core Editions: no max | R8V77A | Standard | SUSE Linux Enterprise Server 1-2 Sockets Unlimited VM w/Live Patching 3-year 24x7 Flexible LTU | 0 | $10,800.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/04/2021 | 05/31/2028 | [TEXT_178] |
| 241 | Software &amp; Licenses | VMWare Core Editions | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; VMWare Core Editions | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for VMWare Core Editions: no max | R8V75A | Standard | SUSE Linux Enterprise Server 1-2 Sockets Unlimited VM w/Live Patching 3-year 9x5 Flexible LTU | 0 | $6,110.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/04/2021 | 05/31/2028 | [TEXT_179] |
| 242 | Software &amp; Licenses | VMWare Core Editions | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; VMWare Core Editions | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for VMWare Core Editions: no max | R8V78A | Standard | SUSE Linux Enterprise Server 1-2 Sockets Unlimited VM w/Live Patching 5-year 24x7 Flexible LTU | 0 | $18,000.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/04/2021 | 05/31/2028 | [TEXT_180] |
| 243 | Software &amp; Licenses | VMWare Core Editions | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; VMWare Core Editions | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for VMWare Core Editions: no max | R8V79A | Standard | SUSE Linux Enterprise Server 1-2 Sockets Unlimited VM w/Live Patching 5-year 9x5 Flexible LTU | 0 | $10,200.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/04/2021 | 05/31/2028 | [TEXT_181] |
| 244 | Software &amp; Licenses | VMWare Core Editions | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; VMWare Core Editions | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for VMWare Core Editions: no max | R8V72A | Standard | SUSE Linux Enterprise Server for SAP 1-2 Sockets Unlimited VM w/Live Patching 3yr 24x7 Flexible LTU | 0 | $18,873.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/04/2021 | 03/16/2026 | [TEXT_182] |
| 245 | Software &amp; Licenses | VMWare Core Editions | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; VMWare Core Editions | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for VMWare Core Editions: no max | R8V73A | Standard | SUSE Linux Enterprise Server for SAP 1-2 Sockets Unlimited VM w/Live Patching 5yr 24x7 Flexible LTU | 0 | $31,455.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/04/2021 | 03/16/2026 | [TEXT_183] |
| 246 | Software &amp; Licenses | VMWare Core Editions | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; VMWare Core Editions | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for VMWare Core Editions: no max | S7N87A | Standard | SUSE Linux Enterprise Server for SAP Applications 1-2 Sockets Unlimited VM 3yr Sub 24x7 Sup Flex LTU | 0 | $18,873.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/02/2026 | 05/31/2028 | [TEXT_184] |
| 247 | Software &amp; Licenses | VMWare Core Editions | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; VMWare Core Editions | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for VMWare Core Editions: no max | S7P10A | Standard | SUSE Linux Enterprise Server for SAP Applications 1-2 Sockets Unlimited VM 3yr Sub 24x7 Sup Flex LTU | 0 | $18,873.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/02/2026 | 05/31/2028 | [TEXT_184] |
| 248 | Software &amp; Licenses | VMWare Core Editions | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; VMWare Core Editions | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for VMWare Core Editions: no max | S7N88A | Standard | SUSE Linux Enterprise Server for SAP Applications 1-2 Sockets Unlimited VM 5yr Sub 24x7 Sup Flex LTU | 0 | $31,455.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/02/2026 | 05/31/2028 | [TEXT_185] |
| 249 | Software &amp; Licenses | VMWare Core Editions | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; VMWare Core Editions | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for VMWare Core Editions: no max | S7P11A | Standard | SUSE Linux Enterprise Server for SAP Applications 1-2 Sockets Unlimited VM 5yr Sub 24x7 Sup Flex LTU | 0 | $31,455.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/02/2026 | 05/31/2028 | [TEXT_185] |
| 250 | Cables &amp; Enablement Kits | Solid State Drives (NVMe/SAS/SATA) | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Cables &amp; Enablement Kits &gt; Solid State Drives (NVMe/SAS/SATA) | Cable Kit | max 2 | 0 | 2 | Selection constraint for Solid State Drives (NVMe/SAS/SATA): max 2 | P48183-B21 | Standard | HPE NS204i-u Gen11 NVMe Hot Plug Boot Optimized Storage Device | 0 | $10,399.00 |  |  | NA |  | No | Available | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 11/07/2022 | 07/31/2028 | [TEXT_186] |
| 251 | Cables &amp; Enablement Kits | Solid State Drives (NVMe/SAS/SATA) | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Cables &amp; Enablement Kits &gt; Solid State Drives (NVMe/SAS/SATA) | Cable Kit | max 2 | 0 | 2 | Selection constraint for Solid State Drives (NVMe/SAS/SATA): max 2 | P71992-B21 | Standard | HPE ProLiant DL145 Gen11 NS204i-u Enablement Kit | 0 | $80.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 07/31/2028 | [TEXT_187] |
| 252 | Cables &amp; Enablement Kits | Solid State Drives (NVMe/SAS/SATA) | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Cables &amp; Enablement Kits &gt; Solid State Drives (NVMe/SAS/SATA) | Cable Kit | max 2 | 0 | 2 | Selection constraint for Solid State Drives (NVMe/SAS/SATA): max 2 | P81160-B21 | Standard | HPE NS204i-u v2 960GB NVMe Hot Plug Boot Optimized Storage Device | 0 | $14,999.00 |  |  | NA |  | No | Available | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 07/07/2025 | 05/31/2029 | [TEXT_188] |
| 253 | Cables &amp; Enablement Kits | Solid State Drives (NVMe/SAS/SATA) | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Cables &amp; Enablement Kits &gt; Solid State Drives (NVMe/SAS/SATA) | Cable Kit | max 2 | 0 | 2 | Selection constraint for Solid State Drives (NVMe/SAS/SATA): max 2 | P81162-B21 | Standard | HPE NS204i-u v2 960GB NVMe SED Hot Plug Boot Optimized Storage Device | 0 | $14,999.00 |  |  | NA |  | No | Available | 21 | 21 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 07/07/2025 | 05/31/2029 | [TEXT_189] |
| 254 | Graphics &amp; GPU | Graphics | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Graphics &amp; GPU &gt; Graphics | GPU / Accelerator | max 2 | 0 | 2 | Selection constraint for Graphics: max 2 | S6W30C | Standard | NVIDIA RTX PRO 4500 Blackwell Server Edition 32GB PCIe Accelerator for HPE | 0 | $18,882.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 03/16/2026 | 01/31/2029 | [TEXT_190] |
| 255 | Graphics &amp; GPU | Graphics | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Graphics &amp; GPU &gt; Graphics | GPU / Accelerator | max 2 | 0 | 2 | Selection constraint for Graphics: max 2 | S0K89C | Standard | NVIDIA L4 24GB PCIe Accelerator for HPE | 0 | $10,589.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 05/31/2028 | [TEXT_191] |
| 256 | Graphics &amp; GPU | Graphics | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Graphics &amp; GPU &gt; Graphics | GPU / Accelerator | max 2 | 0 | 2 | Selection constraint for Graphics: max 2 | S2L70C | Standard | NVIDIA L40S 48GB PCIe Accelerator | 0 | $32,212.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 11/06/2023 | 05/31/2027 | [TEXT_192] |
| 257 | Graphics &amp; GPU | Graphics Accessories | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Graphics &amp; GPU &gt; Graphics Accessories | Cable Kit | max 2 | 0 | 2 | Selection constraint for Graphics Accessories: max 2 | P71995-B21 | Standard | HPE ProLiant DL145 Gen11 Double Wide GPU Cable Kit | 0 | $24.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/07/2025 | 07/31/2028 | [TEXT_193] |
| 258 | Graphics &amp; GPU | Graphics Accessories | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Graphics &amp; GPU &gt; Graphics Accessories | Cable Kit | max 2 | 0 | 2 | Selection constraint for Graphics Accessories: max 2 | P73002-B21 | Standard | HPE ProLiant DL145 Gen11 Double Wide GPU Air Baffle Kit | 0 | $44.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/07/2025 | 07/31/2028 | [TEXT_194] |
| 259 | Cooling / Thermal | Power Cooling Options | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Cooling / Thermal &gt; Power Cooling Options | Cooling / Thermal | max 4 | 0 | 4 | Selection constraint for Power Cooling Options: max 4 | P72581-B21 | Standard | HPE ProLiant DL145 Gen11 2U Performance Fan Kit | 4 | $123.00 |  |  | $492.00 |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 07/31/2028 | [TEXT_195] |
| 260 | Power Supplies | Power Supplies | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Power Supplies &gt; Power Supplies | Power Supply | max 2 | 0 | 2 | Selection constraint for Power Supplies: max 2 | P54290-B21 | Standard | HPE ProLiant DL110 900W-1000W Titanium Hot Plug Low Halogen AC Power Supply Kit | 2 | $891.00 |  |  | $1,782.00 |  | No | Available | 6 | 6 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/18/2023 | 07/31/2028 | [TEXT_196] |
| 261 | Cooling / Thermal | Heatsink Kit | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Cooling / Thermal &gt; Heatsink Kit | Cooling / Thermal | max 1 | 0 | 1 | [TEXT_197] | P44975-B21 | Standard | HPE ProLiant DL110 700W Flex Slot Platinum Hot Plug Low Halogen AC Power Supply Kit | 0 | $444.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/17/2021 | 07/31/2028 | [TEXT_198] |
| 262 | Cooling / Thermal | Heatsink Kit | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Cooling / Thermal &gt; Heatsink Kit | Cooling / Thermal | max 1 | 0 | 1 | [TEXT_199] | P43150-B21 | Standard | HPE ProLiant DL110 700W Flex Slot -48VDC Hot Plug Low Halogen Power Supply Kit | 0 | $692.00 |  |  | NA |  | No | Not published by OCA | 6 | 6 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/26/2021 | 07/31/2028 | [TEXT_200] |
| 263 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 2 | 0 | 2 | Selection constraint for Power Cords: max 2 | AF556A | Standard | HPE C13 - Nema 5-15P US/CA 110V 10Amp 1.83m Power Cord | 0 | $55.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 03/26/2007 | 07/31/2029 | [TEXT_201] |
| 264 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 2 | 0 | 2 | Selection constraint for Power Cords: max 2 | AF568A | Standard | HPE C13 - CEE-VII EU 250V 10Amp 1.83m Power Cord | 0 | $71.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 11/13/2006 | 11/30/2031 | [TEXT_202] |
| 265 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 2 | 0 | 2 | Selection constraint for Power Cords: max 2 | AF557A | Standard | HPE C13 - GB-1002 CN 250V 10Amp 1.83m Power Cord | 0 | $156.00 |  |  | NA |  | No | Available | 21 | 21 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/29/2006 | 11/30/2031 | [TEXT_203] |
| 266 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 2 | 0 | 2 | Selection constraint for Power Cords: max 2 | AF558A | Standard | HPE C13 - IRAM -2073 AR 250V 10A 2.5m Power Cord | 0 | $65.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 06/30/2006 | 07/31/2029 | [TEXT_204] |
| 267 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 2 | 0 | 2 | Selection constraint for Power Cords: max 2 | AF559A | Standard | HPE C13 - Nema 5-15P TH/PH 250V 10Amp 1.83m Power Cord | 0 | $55.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/13/2008 | 07/31/2029 | [TEXT_205] |
| 268 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 2 | 0 | 2 | Selection constraint for Power Cords: max 2 | AF560A | Standard | HPE C13 - KSC- 8305 KR 250V 10Amp 1.83m Power Cord | 0 | $55.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/29/2006 | 07/31/2029 | [TEXT_205] |
| 269 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 2 | 0 | 2 | Selection constraint for Power Cords: max 2 | AF561A | Standard | HPE C13 - CNS-690 TW 110V 13Amp 1.83m Power Cord | 0 | $55.00 |  |  | NA |  | No | Available | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/29/2006 | 07/31/2029 | [TEXT_206] |
| 270 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 2 | 0 | 2 | Selection constraint for Power Cords: max 2 | AF562A | Standard | HPE C13 - IS-1293 IN 240V 6Amp LV 2.0m Power Cord | 0 | $194.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/29/2006 | 11/30/2031 | [TEXT_207] |
| 271 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 2 | 0 | 2 | Selection constraint for Power Cords: max 2 | AF564A | Standard | HPE C13 - SI-32 IL 250V 10Amp 1.83m Power Cord | 0 | $55.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 12/15/2006 | 07/31/2029 | [TEXT_205] |
| 272 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 2 | 0 | 2 | Selection constraint for Power Cords: max 2 | AF565A | Standard | HPE C13 - SEV 1011 CH 250V 10Amp 1.83m Power Cord | 0 | $55.00 |  |  | NA |  | No | Available | 11 | 11 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 12/15/2006 | 07/31/2029 | [TEXT_208] |
| 273 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 2 | 0 | 2 | Selection constraint for Power Cords: max 2 | AF566A | Standard | HPE C13 - DK-2.5A DK 250V 10Amp 1.83m Power Cord | 0 | $55.00 |  |  | NA |  | No | Available | 11 | 11 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 11/13/2006 | 07/31/2029 | [TEXT_208] |
| 274 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 2 | 0 | 2 | Selection constraint for Power Cords: max 2 | AF567A | Standard | HPE C13 - SABS-164 ZA 250V 10Amp 2.5m Power Cord | 0 | $65.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 11/14/2006 | 07/31/2029 | [TEXT_204] |
| 275 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 2 | 0 | 2 | Selection constraint for Power Cords: max 2 | AF569A | Standard | HPE C13 - AS3112-3 AU 250V 10Amp 2.5m Power Cord | 0 | $65.00 |  |  | NA |  | No | Available | 11 | 11 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 11/13/2006 | 07/31/2029 | [TEXT_209] |
| 276 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 2 | 0 | 2 | Selection constraint for Power Cords: max 2 | AF570A | Standard | HPE C13 - BS-1363A UK/HK/SG 250V 10Amp 1.83m Power Cord | 0 | $55.00 |  |  | NA |  | No | Available | 13 | 13 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/06/2011 | 07/31/2029 | [TEXT_210] |
| 277 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 2 | 0 | 2 | Selection constraint for Power Cords: max 2 | AF572A | Standard | HPE C13 - JIS C8303 JP 100V 12Amp 2.0m Power Cord | 0 | $60.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/06/2011 | 07/31/2029 | [TEXT_211] |
| 278 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 2 | 0 | 2 | Selection constraint for Power Cords: max 2 | AF573A | Standard | HPE C13 - C14 WW 250V 10Amp Flint Gray 2.0m Jumper Cord | 0 | $38.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 07/09/2007 | 10/31/2031 | [TEXT_212] |
| 279 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 2 | 0 | 2 | Selection constraint for Power Cords: max 2 | AF591A | Standard | HPE C13 - NBR-14136 BR 250V 10Amp 1.83m Power Cord | 0 | $49.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 07/14/2008 | 11/30/2031 | [TEXT_213] |
| 280 | Cables &amp; Enablement Kits | Power Cords | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords | Cable Kit | max 2 | 0 | 2 | Selection constraint for Power Cords: max 2 | R1C65A | Standard | HPE C13-C14 IN 250V 10Amp 2m Black Jumper Cord | 0 | $119.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 12/03/2018 | 11/30/2031 | [TEXT_214] |
| 281 | Cables &amp; Enablement Kits | HPE Virtualization | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Cables &amp; Enablement Kits &gt; HPE Virtualization | Cable Kit | Unlimited | 0 | Unlimited | [TEXT_215] | Q0H80A | Standard | HPE 48VDC 2.85m Power Cable | 0 | $181.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 06/05/2017 | 07/31/2029 | [TEXT_216] |
| 282 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | Unlimited | 0 | Unlimited | [TEXT_217] | A0K02A | Standard | HPE C13 - C14 WW 250V 10Amp 2.0m Jumper Cord | 0 | $34.00 |  |  | NA |  | No | Not published by OCA | 21 | 21 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 08/30/2011 | 10/31/2031 | [TEXT_218] |
| 283 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | Unlimited | 0 | Unlimited | [TEXT_219] | A0N33A | Standard | HPE C13-NEMA 6-15P 10A/250V 3.6m Black Power Cord | 0 | $78.00 |  |  | NA |  | No | Not published by OCA | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 08/30/2011 | 10/31/2031 | [TEXT_220] |
| 284 | Security Options | Security Hardware | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Security Options &gt; Security Hardware | Security &amp; Platform Trust | Unlimited | 0 | Unlimited | Selection constraint for Security Hardware: no max | 875519-B21 | Standard | HPE Bezel Lock Kit | 0 | $89.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 07/11/2017 | 07/31/2029 | [TEXT_221] |
| 285 | Security Options | Security Hardware | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Security Options &gt; Security Hardware | Security &amp; Platform Trust | Unlimited | 0 | Unlimited | Selection constraint for Security Hardware: no max | P72582-B21 | Standard | HPE ProLiant DL145 Gen11 FIO Bezel Filter Kit | 1 | $112.00 |  |  | $112.00 |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 07/31/2028 | [TEXT_222] |
| 286 | Security Options | Security Hardware | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Security Options &gt; Security Hardware | Security &amp; Platform Trust | Unlimited | 0 | Unlimited | Selection constraint for Security Hardware: no max | P72583-B21 | Standard | HPE ProLiant DL145 Gen11 Filter Replacement Kit | 0 | $81.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 07/31/2028 | [TEXT_223] |
| 287 | Cables &amp; Enablement Kits | Management Hardware | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Cables &amp; Enablement Kits &gt; Management Hardware | Cable Kit | max 2 | 0 | 2 | Selection constraint for Management Hardware: max 2 | P71998-B21 | Standard | HPE ProLiant DL145 Gen11 RJ45 Serial Port Cable Kit | 0 | $20.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 07/31/2028 | [TEXT_224] |
| 288 | Cables &amp; Enablement Kits | Management Hardware | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Cables &amp; Enablement Kits &gt; Management Hardware | Cable Kit | max 2 | 0 | 2 | Selection constraint for Management Hardware: max 2 | P87008-B21 | Standard | HPE ProLiant DL145 Gen11 Military Ruggedization FIO Kit | 0 | $200.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 02/02/2026 | 07/31/2028 | [TEXT_225] |
| 289 | Software &amp; Licenses | Compute Ops Management SKUs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Compute Ops Management SKUs | Operating System / License | min 1, Required | 1 | Required | Selection constraint for Compute Ops Management SKUs: required | S1A05A | Standard | HPE Compute Cloud Management Server FIO Enablement | 1 | $1.00 |  |  | $1.00 |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 04/01/2024 | 03/31/2028 | [TEXT_226] |
| 290 | Software &amp; Licenses | MS Windows Server Additional License | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server Additional License | Operating System / License | max 999 | 0 | 999 | Selection constraint for MS Windows Server Additional License: max 999 | P46195-B21 | Standard | Microsoft Windows Server 2022 16-core Std Add Lic en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc SW | 0 | $1,087.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/01/2021 | 08/31/2025 | [TEXT_227] |
| 291 | Software &amp; Licenses | MS Windows Server Additional License | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server Additional License | Operating System / License | max 999 | 0 | 999 | Selection constraint for MS Windows Server Additional License: max 999 | P46196-B21 | Standard | Microsoft Windows Server 2022 4-core Std Add Lic en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc SW | 0 | $272.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/01/2021 | 08/31/2025 | [TEXT_228] |
| 292 | Software &amp; Licenses | MS Windows Server Additional License | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server Additional License | Operating System / License | max 999 | 0 | 999 | Selection constraint for MS Windows Server Additional License: max 999 | P46199-AA1 | Standard | Microsoft Windows Server 2022 2-core Standard Additional License Chinese Simplified SW | 0 | $99,999.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/01/2021 | 08/31/2025 | [TEXT_229] |
| 293 | Software &amp; Licenses | MS Windows Server Additional License | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server Additional License | Operating System / License | max 999 | 0 | 999 | Selection constraint for MS Windows Server Additional License: max 999 | P46199-AB1 | Standard | Microsoft Windows Server 2022 2-core Standard Additional License Chinese Traditional SW | 0 | $99,999.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/01/2021 | 08/31/2025 | [TEXT_229] |
| 294 | Software &amp; Licenses | MS Windows Server Additional License | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server Additional License | Operating System / License | max 999 | 0 | 999 | Selection constraint for MS Windows Server Additional License: max 999 | P46199-B21 | Standard | Microsoft Windows Server 2022 2-core Std Add Lic en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc SW | 0 | $136.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/04/2021 | 08/31/2025 | [TEXT_230] |
| 295 | Software &amp; Licenses | MS Windows Server Additional License | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server Additional License | Operating System / License | max 999 | 0 | 999 | Selection constraint for MS Windows Server Additional License: max 999 | P46212-B21 | Standard | Microsoft Windows Server 2022 16-core DC Add Lic en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc SW | 0 | $4,946.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/01/2021 | 08/31/2025 | [TEXT_231] |
| 296 | Software &amp; Licenses | MS Windows Server Additional License | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server Additional License | Operating System / License | max 999 | 0 | 999 | Selection constraint for MS Windows Server Additional License: max 999 | P46213-B21 | Standard | Microsoft Windows Server 2022 4-core DC Add Lic en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc SW | 0 | $1,238.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/01/2021 | 08/31/2025 | [TEXT_232] |
| 297 | Software &amp; Licenses | MS Windows Server Additional License | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server Additional License | Operating System / License | max 999 | 0 | 999 | Selection constraint for MS Windows Server Additional License: max 999 | P46214-B21 | Standard | Microsoft Windows Server 2022 2-core DC Add Lic en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc SW | 0 | $619.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/04/2021 | 08/31/2025 | [TEXT_233] |
| 298 | Software &amp; Licenses | MS Windows Server Additional License | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server Additional License | Operating System / License | max 999 | 0 | 999 | Selection constraint for MS Windows Server Additional License: max 999 | P77104-B21 | Standard | Microsoft Windows Server 2025 16-core Standard Additional License WW SW | 0 | $1,258.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/02/2024 | 02/29/2028 | [TEXT_234] |
| 299 | Software &amp; Licenses | MS Windows Server Additional License | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server Additional License | Operating System / License | max 999 | 0 | 999 | Selection constraint for MS Windows Server Additional License: max 999 | P77105-B21 | Standard | Microsoft Windows Server 2025 4-core Standard Additional License WW SW | 0 | $320.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/02/2024 | 02/29/2028 | [TEXT_235] |
| 300 | Software &amp; Licenses | MS Windows Server Additional License | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server Additional License | Operating System / License | max 999 | 0 | 999 | Selection constraint for MS Windows Server Additional License: max 999 | P77106-AA1 | Standard | Microsoft Windows Server 2025 2-core Standard Additional License Chinese Simplified SW | 0 |  |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/02/2024 | 02/29/2028 | [TEXT_236] |
| 301 | Software &amp; Licenses | MS Windows Server Additional License | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server Additional License | Operating System / License | max 999 | 0 | 999 | Selection constraint for MS Windows Server Additional License: max 999 | P77106-AB1 | Standard | Microsoft Windows Server 2025 2-core Standard Additional License Chinese Traditional SW | 0 |  |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/02/2024 | 02/29/2028 | [TEXT_236] |
| 302 | Software &amp; Licenses | MS Windows Server Additional License | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server Additional License | Operating System / License | max 999 | 0 | 999 | Selection constraint for MS Windows Server Additional License: max 999 | P77106-B21 | Standard | Microsoft Windows Server 2025 2-core Standard Additional License WW SW | 0 | $164.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/02/2024 | 02/29/2028 | [TEXT_237] |
| 303 | Software &amp; Licenses | MS Windows Server Additional License | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server Additional License | Operating System / License | max 999 | 0 | 999 | Selection constraint for MS Windows Server Additional License: max 999 | P77107-B21 | Standard | Microsoft Windows Server 2025 16-core Datacenter Additional License WW SW | 0 | $5,712.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/02/2024 | 02/29/2028 | [TEXT_238] |
| 304 | Software &amp; Licenses | MS Windows Server Additional License | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server Additional License | Operating System / License | max 999 | 0 | 999 | Selection constraint for MS Windows Server Additional License: max 999 | P77108-B21 | Standard | Microsoft Windows Server 2025 4-core Datacenter Additional License WW SW | 0 | $1,434.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/02/2024 | 02/29/2028 | [TEXT_239] |
| 305 | Software &amp; Licenses | MS Windows Server Additional License | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server Additional License | Operating System / License | max 999 | 0 | 999 | Selection constraint for MS Windows Server Additional License: max 999 | P77109-B21 | Standard | Microsoft Windows Server 2025 2-core Datacenter Additional License WW SW | 0 | $721.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/02/2024 | 02/29/2028 | [TEXT_240] |
| 306 | Software &amp; Licenses | MS Windows Server Additional License | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server Additional License | Operating System / License | max 999 | 0 | 999 | Selection constraint for MS Windows Server Additional License: max 999 | S6K30A | Standard | Microsoft Windows Server 2025 16-core Standard FIO Pre-installed UEFI WW ESD LTU | 0 | $1,147.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 09/02/2025 | 02/29/2028 | [TEXT_241] |
| 307 | Software &amp; Licenses | MS Windows Server Additional License | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server Additional License | Operating System / License | max 999 | 0 | 999 | Selection constraint for MS Windows Server Additional License: max 999 | S6K30B | Standard | Microsoft Windows Server 2025 16-core Standard FIO Not Pre-installed WW ESD LTU | 0 | $1,147.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 09/02/2025 | 02/29/2028 | [TEXT_241] |
| 308 | Software &amp; Licenses | MS Windows Server Additional License | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server Additional License | Operating System / License | max 999 | 0 | 999 | Selection constraint for MS Windows Server Additional License: max 999 | S6L35B | Standard | Microsoft Windows Server 2025 16-core Datacenter FIO Not Pre-installed WW ESD LTU | 0 | $5,712.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 09/02/2025 | 02/29/2028 | [TEXT_242] |
| 309 | Software &amp; Licenses | MS Windows Server CALs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server CALs | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server CALs: no max | P46191-AA1 | Standard | Microsoft Windows Server 2022 1 User CAL Chinese Simplified LTU | 0 | $99,999.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/01/2021 | 08/31/2025 | [TEXT_229] |
| 310 | Software &amp; Licenses | MS Windows Server CALs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server CALs | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server CALs: no max | P46191-B21 | Standard | Microsoft Windows Server 2022 1 User CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | 0 | $55.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/01/2021 | 08/31/2025 | [TEXT_243] |
| 311 | Software &amp; Licenses | MS Windows Server CALs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server CALs | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server CALs: no max | P46194-B21 | Standard | Microsoft Windows Server 2022 1 Device CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | 0 | $44.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/01/2021 | 08/31/2025 | [TEXT_244] |
| 312 | Software &amp; Licenses | MS Windows Server CALs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server CALs | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server CALs: no max | P46215-AA1 | Standard | Microsoft Windows Server 2022 5 Users CAL Chinese Simplified LTU | 0 | $99,999.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/01/2021 | 08/31/2025 | [TEXT_229] |
| 313 | Software &amp; Licenses | MS Windows Server CALs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server CALs | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server CALs: no max | P46215-AB1 | Standard | Microsoft Windows Server 2022 5 Users CAL Chinese Traditional LTU | 0 | $99,999.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/01/2021 | 08/31/2025 | [TEXT_229] |
| 314 | Software &amp; Licenses | MS Windows Server CALs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server CALs | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server CALs: no max | P46215-B21 | Standard | Microsoft Windows Server 2022 5 Users CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | 0 | $271.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/01/2021 | 08/31/2025 | [TEXT_245] |
| 315 | Software &amp; Licenses | MS Windows Server CALs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server CALs | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server CALs: no max | P46216-B21 | Standard | Microsoft Windows Server 2022 5 Devices CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | 0 | $216.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/01/2021 | 08/31/2025 | [TEXT_246] |
| 316 | Software &amp; Licenses | MS Windows Server CALs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server CALs | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server CALs: no max | P46217-B21 | Standard | Microsoft Windows Server 2022 10 Users CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | 0 | $539.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/01/2021 | 08/31/2025 | [TEXT_247] |
| 317 | Software &amp; Licenses | MS Windows Server CALs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server CALs | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server CALs: no max | P46218-B21 | Standard | Microsoft Windows Server 2022 10 Devices CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | 0 | $429.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/01/2021 | 08/31/2025 | [TEXT_248] |
| 318 | Software &amp; Licenses | MS Windows Server CALs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server CALs | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server CALs: no max | P46219-B21 | Standard | Microsoft Windows Server 2022 50 Users CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | 0 | $2,695.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/01/2021 | 08/31/2025 | [TEXT_249] |
| 319 | Software &amp; Licenses | MS Windows Server CALs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server CALs | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server CALs: no max | P46220-B21 | Standard | Microsoft Windows Server 2022 50 Devices CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | 0 | $2,145.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/01/2021 | 08/31/2025 | [TEXT_250] |
| 320 | Software &amp; Licenses | MS Windows Server CALs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server CALs | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server CALs: no max | P46221-B21 | Standard | Microsoft Windows Server 2022 RDS 5 Users CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | 0 | $935.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/01/2021 | 08/31/2025 | [TEXT_251] |
| 321 | Software &amp; Licenses | MS Windows Server CALs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server CALs | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server CALs: no max | P46222-B21 | Standard | Microsoft Windows Server 2022 RDS 5 Devices CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | 0 | $880.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/01/2021 | 08/31/2025 | [TEXT_252] |
| 322 | Software &amp; Licenses | MS Windows Server CALs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server CALs | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server CALs: no max | P77110-AA1 | Standard | Microsoft Windows Server 2025 1 User CAL Chinese Simplified LTU | 0 |  |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/02/2024 | 02/29/2028 | [TEXT_236] |
| 323 | Software &amp; Licenses | MS Windows Server CALs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server CALs | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server CALs: no max | P77110-B21 | Standard | Microsoft Windows Server 2025 1 User CAL WW LTU | 0 | $72.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/02/2024 | 02/29/2028 | [TEXT_253] |
| 324 | Software &amp; Licenses | MS Windows Server CALs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server CALs | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server CALs: no max | P77111-B21 | Standard | Microsoft Windows Server 2025 1 Device CAL WW LTU | 0 | $52.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/02/2024 | 02/29/2028 | [TEXT_254] |
| 325 | Software &amp; Licenses | MS Windows Server CALs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server CALs | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server CALs: no max | P77112-AA1 | Standard | Microsoft Windows Server 2025 5 Users CAL Chinese Simplified LTU | 0 |  |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/02/2024 | 02/29/2028 | [TEXT_236] |
| 326 | Software &amp; Licenses | MS Windows Server CALs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server CALs | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server CALs: no max | P77112-AB1 | Standard | Microsoft Windows Server 2025 5 Users CAL Chinese Traditional LTU | 0 |  |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/02/2024 | 02/29/2028 | [TEXT_236] |
| 327 | Software &amp; Licenses | MS Windows Server CALs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server CALs | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server CALs: no max | P77112-B21 | Standard | Microsoft Windows Server 2025 5 Users CAL WW LTU | 0 | $322.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/02/2024 | 02/29/2028 | [TEXT_255] |
| 328 | Software &amp; Licenses | MS Windows Server CALs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server CALs | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server CALs: no max | P77113-B21 | Standard | Microsoft Windows Server 2025 5 Devices CAL WW LTU | 0 | $226.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/02/2024 | 02/29/2028 | [TEXT_256] |
| 329 | Software &amp; Licenses | MS Windows Server CALs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server CALs | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server CALs: no max | P77114-B21 | Standard | Microsoft Windows Server 2025 10 Users CAL WW LTU | 0 | $636.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/02/2024 | 02/29/2028 | [TEXT_257] |
| 330 | Software &amp; Licenses | MS Windows Server CALs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server CALs | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server CALs: no max | P77115-B21 | Standard | Microsoft Windows Server 2025 10 Devices CAL WW LTU | 0 | $444.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/02/2024 | 02/29/2028 | [TEXT_258] |
| 331 | Software &amp; Licenses | MS Windows Server CALs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server CALs | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server CALs: no max | P77116-B21 | Standard | Microsoft Windows Server 2025 50 Users CAL WW LTU | 0 | $3,143.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/02/2024 | 02/29/2028 | [TEXT_259] |
| 332 | Software &amp; Licenses | MS Windows Server CALs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server CALs | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server CALs: no max | P77117-B21 | Standard | Microsoft Windows Server 2025 50 Devices CAL WW LTU | 0 | $2,184.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/02/2024 | 02/29/2028 | [TEXT_260] |
| 333 | Software &amp; Licenses | MS Windows Server CALs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server CALs | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server CALs: no max | P77118-B21 | Standard | Microsoft Windows Server 2025 Remote Desktop Service 1 User CAL WW LTU | 0 | $280.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/02/2024 | 02/29/2028 | [TEXT_261] |
| 334 | Software &amp; Licenses | MS Windows Server CALs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server CALs | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server CALs: no max | P77119-B21 | Standard | Microsoft Windows Server 2025 Remote Desktop Service 1 Device CAL WW LTU | 0 | $201.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/02/2024 | 02/29/2028 | [TEXT_262] |
| 335 | Software &amp; Licenses | MS Windows Server CALs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server CALs | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server CALs: no max | P77120-B21 | Standard | Microsoft Windows Server 2025 Remote Desktop Service 5 Users CAL WW LTU | 0 | $1,364.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/02/2024 | 02/29/2028 | [TEXT_263] |
| 336 | Software &amp; Licenses | MS Windows Server CALs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server CALs | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server CALs: no max | P77121-B21 | Standard | Microsoft Windows Server 2025 Remote Desktop Service 5 Devices CAL WW LTU | 0 | $974.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/02/2024 | 02/29/2028 | [TEXT_264] |
| 337 | Software &amp; Licenses | MS Windows Server CALs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server CALs | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server CALs: no max | P77122-B21 | Standard | Microsoft Windows Server 2025 Remote Desktop Service 50 Users CAL WW LTU | 0 | $13,566.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/02/2024 | 02/29/2028 | [TEXT_265] |
| 338 | Software &amp; Licenses | MS Windows Server CALs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server CALs | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server CALs: no max | P77123-B21 | Standard | Microsoft Windows Server 2025 Remote Desktop Service 50 Devices CAL WW LTU | 0 | $9,666.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/02/2024 | 02/29/2028 | [TEXT_266] |
| 339 | Software &amp; Licenses | MS Windows Server Not Preinstalled | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server Not Preinstalled | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server Not Preinstalled: no max | P45916-291 | Standard | Microsoft Windows Server 2022 16-core Datacenter FIO Not Pre-installed Japanese SW | 0 | $99,999.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/06/2021 | 08/31/2025 | [TEXT_267] |
| 340 | Software &amp; Licenses | MS Windows Server Not Preinstalled | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server Not Preinstalled | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server Not Preinstalled: no max | P45916-B21 | Standard | Microsoft Windows Server 2022 16-core Datacenter FIO Not Pre-installed en/fr/it/de/es/nl/pt SW | 0 | $4,946.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/06/2021 | 08/31/2025 | [TEXT_268] |
| 341 | Software &amp; Licenses | MS Windows Server Not Preinstalled | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server Not Preinstalled | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server Not Preinstalled: no max | P46005-291 | Standard | Microsoft Windows Server 2022 16-core Standard FIO Not Pre-installed Japanese SW | 0 | $99,999.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/06/2021 | 08/31/2025 | [TEXT_267] |
| 342 | Software &amp; Licenses | MS Windows Server Not Preinstalled | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server Not Preinstalled | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server Not Preinstalled: no max | P46005-B21 | Standard | Microsoft Windows Server 2022 16-core Standard FIO Not Pre-installed en/fr/it/de/es/nl/pt SW | 0 | $988.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/06/2021 | 08/31/2025 | [TEXT_269] |
| 343 | Software &amp; Licenses | MS Windows Server Not Preinstalled | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server Not Preinstalled | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server Not Preinstalled: no max | P46173-291 | Standard | Microsoft Windows Server 2022 10-core Essentials FIO Pre-installed UEFI Japanese SW | 0 | $99,999.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/02/2022 | 08/31/2025 | [TEXT_267] |
| 344 | Software &amp; Licenses | MS Windows Server Not Preinstalled | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server Not Preinstalled | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server Not Preinstalled: no max | P46174-371 | Standard | Microsoft Windows Server 2022 10-core Essentials FIO Not Pre-installed English/Korean/Japanese SW | 0 | $99,999.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/06/2021 | 08/31/2025 | [TEXT_267] |
| 345 | Software &amp; Licenses | MS Windows Server Not Preinstalled | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server Not Preinstalled | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server Not Preinstalled: no max | P46174-B21 | Standard | Microsoft Windows Server 2022 10-core Essentials FIO Not Pre-installed en/fr/it/de/es/nl/pt SW | 0 | $407.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/06/2021 | 08/31/2025 | [TEXT_270] |
| 346 | Software &amp; Licenses | MS Windows Server Not Preinstalled | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server Not Preinstalled | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server Not Preinstalled: no max | P77095-291 | Standard | Microsoft Windows Server 2025 16-core Standard FIO Not Pre-installed Japanese SW | 0 |  |  |  | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/02/2024 | 02/28/2027 | [TEXT_271] |
| 347 | Software &amp; Licenses | MS Windows Server Not Preinstalled | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server Not Preinstalled | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server Not Preinstalled: no max | P77095-B21 | Standard | Microsoft Windows Server 2025 16-core Standard FIO Not Pre-installed en/fr/de/es/it/pt/nl SW | 0 | $1,147.00 |  |  | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/02/2024 | 02/28/2027 | [TEXT_272] |
| 348 | Software &amp; Licenses | MS Windows Server Not Preinstalled | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server Not Preinstalled | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server Not Preinstalled: no max | P77097-291 | Standard | Microsoft Windows Server 2025 16-core Datacenter FIO Not Pre-installed Japanese SW | 0 |  |  |  | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/02/2024 | 02/28/2027 | [TEXT_271] |
| 349 | Software &amp; Licenses | MS Windows Server Not Preinstalled | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server Not Preinstalled | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server Not Preinstalled: no max | P77097-B21 | Standard | Microsoft Windows Server 2025 16-core Datacenter FIO Not Pre-installed en/fr/de/es/it/pt/nl SW | 0 | $5,712.00 |  |  | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/02/2024 | 02/28/2027 | [TEXT_273] |
| 350 | Software &amp; Licenses | MS Windows Server Not Preinstalled | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server Not Preinstalled | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server Not Preinstalled: no max | P77098-291 | Standard | Microsoft Windows Server 2025 10-core Essentials FIO Not Pre-installed Japanese SW | 0 |  |  |  | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/02/2024 | 02/28/2027 | [TEXT_271] |
| 351 | Software &amp; Licenses | MS Windows Server Not Preinstalled | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server Not Preinstalled | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server Not Preinstalled: no max | P77098-B21 | Standard | Microsoft Windows Server 2025 10-core Essentials FIO Not Pre-installed en/fr/de/es/it/pt/nl SW | 0 | $445.00 |  |  | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/02/2024 | 02/28/2027 | [TEXT_274] |
| 352 | Software &amp; Licenses | MS Windows Server Not Preinstalled | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server Not Preinstalled | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server Not Preinstalled: no max | S6L28B | Standard | Microsoft Windows Server 2025 10-core Essentials FIO Not Pre-installed WW ESD LTU | 0 | $445.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 09/02/2025 | 02/29/2028 | [TEXT_275] |
| 353 | Software &amp; Licenses | MS Windows Server Preinstalled | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server Preinstalled | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server Preinstalled: no max | P46155-291 | Standard | Microsoft Windows Server 2022 16-core Standard FIO Pre-installed UEFI Japanese SW | 0 | $99,999.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/02/2022 | 08/31/2025 | [TEXT_267] |
| 354 | Software &amp; Licenses | MS Windows Server Preinstalled | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server Preinstalled | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server Preinstalled: no max | P46155-B21 | Standard | Microsoft Windows Server 2022 16-core Standard FIO Pre-installed UEFI en/fr/it/de/es/nl/pt SW | 0 | $988.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/02/2022 | 08/31/2025 | [TEXT_269] |
| 355 | Software &amp; Licenses | MS Windows Server Preinstalled | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server Preinstalled | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server Preinstalled: no max | P77096-291 | Standard | Microsoft Windows Server 2025 16-core Standard FIO Pre-installed UEFI Japanese SW | 0 |  |  |  | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/02/2024 | 02/28/2027 | [TEXT_271] |
| 356 | Software &amp; Licenses | MS Windows Server Preinstalled | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; MS Windows Server Preinstalled | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for MS Windows Server Preinstalled: no max | P77096-B21 | Standard | Microsoft Windows Server 2025 16-core Standard FIO Pre-installed UEFI en/fr/de/es/it/pt/nl SW | 0 | $1,147.00 |  |  | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/02/2024 | 02/28/2027 | [TEXT_272] |
| 357 | Software &amp; Licenses | SUSE Add-ons | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Add-ons | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for SUSE Add-ons: no max | M6K34A | Standard | SUSE Linux Enterprise High Availability Extension 1-2 Sockets 3 Year Subscription Flx LTU | 0 | $2,040.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2015 | 05/31/2028 | [TEXT_276] |
| 358 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | N0U73A | Standard | SUSE Linux Enterprise Server SAP 1-2 Sockets or 1-2 VM 3-year Subscription 24x7 Support Flexible LTU | 0 | $7,803.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 08/17/2015 | 03/16/2026 | [TEXT_277] |
| 359 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | N0U75A | Standard | SUSE Linux Enterprise Server SAP 1-2 Sockets or 1-2 VM 5-year Subscription 24x7 Support Flexible LTU | 0 | $13,005.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 08/17/2015 | 03/16/2026 | [TEXT_278] |
| 360 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | Q9R65A | Standard | Red Hat Enterprise Linux for SAP Solutions for Physical Nodes 3yr Subscription 24x7 Support LTU | 0 | $6,737.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/05/2018 | 12/01/2027 | [TEXT_279] |
| 361 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | Q9R66A | Standard | Red Hat Enterprise Linux for SAP Solutions for Physical Nodes 5yr Subscription 24x7 Support LTU | 0 | $11,229.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/05/2018 | 12/01/2027 | [TEXT_280] |
| 362 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | Q9R67A | Standard | Red Hat Enterprise Linux for SAP Solutions for Virtual DC 3yr Subscription 24x7 Support LTU | 0 | $24,680.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/05/2018 | 12/01/2027 | [TEXT_281] |
| 363 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | Q9R68A | Standard | Red Hat Enterprise Linux for SAP Solutions for Virtual DC 5yr Subscription 24x7 Support LTU | 0 | $41,134.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/05/2018 | 12/01/2027 | [TEXT_282] |
| 364 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | R8V84A | Standard | SUSE Linux Enterprise Server for SAP 1-2 Sockets Unlimited VM w/Live Patching 3yr 24x7 Flexible LTU | 0 | $18,873.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/04/2021 | 03/16/2026 | [TEXT_182] |
| 365 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | R8V85A | Standard | SUSE Linux Enterprise Server for SAP 1-2 Sockets Unlimited VM w/Live Patching 5yr 24x7 Flexible LTU | 0 | $31,455.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/04/2021 | 03/16/2026 | [TEXT_183] |
| 366 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S3R49A | Standard | SUSE Linux Enterprise Server w/SUSE Manager Lifecycle Management+ 1-2 Sockets/1-2 VM 3yr 24x7 LTU | 0 | $4,399.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2024 | 03/16/2026 | [TEXT_283] |
| 367 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S3R50A | Standard | SUSE Linux Enterprise Server w/SUSE Manager Lifecycle Management+ 1-2 Sockets/1-2 VM 1yr 24x7 LTU | 0 | $1,599.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2024 | 03/16/2026 | [TEXT_284] |
| 368 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S3R51A | Standard | SUSE Linux Enterprise Server w/SUSE Manager Lifecycle Management+ 1-2 Sockets/1-2 VM 1yr 9x5 LTU | 0 | $1,099.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2024 | 03/16/2026 | [TEXT_285] |
| 369 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S3R52A | Standard | SUSE Linux Enterprise Server w/SUSE Manager Lifecycle Management+ 1-2 Sockets/1-2 VM 5yr 24x7 LTU | 0 | $7,196.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2024 | 03/16/2026 | [TEXT_286] |
| 370 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S3R53A | Standard | SUSE Linux Enterprise Server w/SUSE Manager Lifecycle Management+ 1-2 Sockets/1-2 VM 3yr 9x5 LTU | 0 | $2,990.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2024 | 03/16/2026 | [TEXT_287] |
| 371 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S3R54A | Standard | SUSE Linux Enterprise Server w/SUSE Manager Lifecycle Management+ 1-2 Sockets/1-2 VM 5yr 9x5 LTU | 0 | $4,946.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2024 | 03/16/2026 | [TEXT_231] |
| 372 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S7N85A | Standard | SUSE Linux Enterprise Server for SAP Applications 1-2 Sockets or 1-2 VM 3-year Sub 24x7 Support LTU | 0 | $7,803.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/02/2026 | 05/31/2028 | [TEXT_288] |
| 373 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S7N86A | Standard | SUSE Linux Enterprise Server for SAP Applications 1-2 Sockets or 1-2 VM 5-year Sub 24x7 Support LTU | 0 | $13,005.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/02/2026 | 05/31/2028 | [TEXT_289] |
| 374 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S7N89A | Standard | SUSE Linux Enterprise Server w/SUSE Multi-Linux Mgr Lifecycle Mgmt+ 1-2 Skts/1-2 VM 1yr 24x7 LTU | 0 | $1,599.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/02/2026 | 05/31/2028 | [TEXT_290] |
| 375 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S7N90A | Standard | SUSE Linux Enterprise Server w/SUSE Multi-Linux Mgr Lifecycle Mgmt+ 1-2 Skts/1-2 VM 1yr 9x5 LTU | 0 | $1,099.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/02/2026 | 05/31/2028 | [TEXT_291] |
| 376 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S7N91A | Standard | SUSE Linux Enterprise Server w/SUSE Multi-Linux Mgr Lifecycle Mgmt+ 1-2 Skts/1-2 VM 3yr 24x7 LTU | 0 | $4,399.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/02/2026 | 05/31/2028 | [TEXT_292] |
| 377 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S7N92A | Standard | SUSE Linux Enterprise Server w/SUSE Multi-Linux Mgr Lifecycle Mgmt+ 1-2 Skts/1-2 VM 3yr 9x5 LTU | 0 | $2,990.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/02/2026 | 05/31/2028 | [TEXT_293] |
| 378 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S7N93A | Standard | SUSE Linux Enterprise Server w/SUSE Multi-Linux Mgr Lifecycle Mgmt+ 1-2 Skts/1-2 VM 5yr 24x7 LTU | 0 | $7,196.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/02/2026 | 05/31/2028 | [TEXT_294] |
| 379 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S7N94A | Standard | SUSE Linux Enterprise Server w/SUSE Multi-Linux Mgr Lifecycle Mgmt+ 1-2 Skts/1-2 VM 5yr 9x5 LTU | 0 | $4,946.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/02/2026 | 05/31/2028 | [TEXT_295] |
| 380 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S7P12A | Standard | SUSE Linux Enterprise Server for SAP Applications 1-2 Sockets or 1-2 VM 3-year Sub 24x7 Sup Flex LTU | 0 | $7,803.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/02/2026 | 05/31/2028 | [TEXT_288] |
| 381 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S7P13A | Standard | SUSE Linux Enterprise Server for SAP Applications 1-2 Sockets or 1-2 VM 5-year Sub 24x7 Sup Flex LTU | 0 | $13,005.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/02/2026 | 05/31/2028 | [TEXT_289] |
| 382 | Software &amp; Licenses | SUSE SAP Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE SAP Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE SAP Operating Systems: no max | M6K30A | Standard | SUSE Linux Enterprise Server SAP 1-2 Sockets or 1-2 VM 3 Year Subscription 24x7 Support Flx LTU | 0 | $7,803.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/01/2015 | 03/16/2026 | [TEXT_277] |
| 383 | Software &amp; Licenses | SUSE SAP Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE SAP Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE SAP Operating Systems: no max | M6K32A | Standard | SUSE Linux Enterprise Server SAP 1-2 Sockets or 1-2 VM 5 Year Subscription 24x7 Support Flx LTU | 0 | $13,005.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/01/2015 | 03/16/2026 | [TEXT_278] |
| 384 | Software &amp; Licenses | OneView Management Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; OneView Management Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for OneView Management Software: no max | E5Y44A | Standard | HPE OneView for ProLiant DL Server including 3yr 24x7 Support Bundle Track 1-server LTU | 0 | $799.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 11/02/2013 | 08/31/2030 | [TEXT_296] |
| 385 | Software &amp; Licenses | OneView Management Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; OneView Management Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for OneView Management Software: no max | E5Y43A | Standard | HPE OneView for ProLiant DL Server including 3yr 24x7 Support FIO Bundle Physical 1-server LTU | 0 | $849.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 11/02/2013 | 08/31/2030 | [TEXT_297] |
| 386 | Software &amp; Licenses | OneView Management Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; OneView Management Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for OneView Management Software: no max | E5Y36A | Standard | HPE OneView including 3yr 24x7 Support Track 1-server LTU | 0 | $999.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 11/02/2013 | 08/31/2030 | [TEXT_298] |
| 387 | Software &amp; Licenses | OneView Management Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; OneView Management Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for OneView Management Software: no max | P8B31A | Standard | HPE OneView w/o iLO including 3yr 24x7 Support 1-server FIO LTU | 0 | $480.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/09/2015 | 08/31/2030 | [TEXT_299] |
| 388 | Software &amp; Licenses | OneView Management Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; OneView Management Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for OneView Management Software: no max | P8B24A | Standard | HPE OneView w/o iLO including 3yr 24x7 Support 1-server LTU | 0 | $499.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/09/2015 | 04/30/2025 | [TEXT_300] |
| 389 | Software &amp; Licenses | OneView Management Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; OneView Management Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for OneView Management Software: no max | P8B25A | Standard | HPE OneView w/o iLO including 3yr 24x7 Support Track 1-server LTU | 0 | $499.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/09/2015 | 08/31/2030 | [TEXT_301] |
| 390 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | R3Q35AAE | Service | NVIDIA RTX Virtual Workstation 1 Concurrent User 1-year Subscription E-LTU | 0 | $305.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2020 | 11/30/2027 | [TEXT_302] |
| 391 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | R3Q37AAE | Service | NVIDIA RTX Virtual Workstation 1 Concurrent User 3-year Subscription E-LTU | 0 | $867.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2020 | 11/30/2027 | [TEXT_303] |
| 392 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | R3Q38AAE | Service | NVIDIA RTX Virtual Workstation 1 Concurrent User 4-year Subscription E-LTU | 0 | $1,149.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2020 | 11/30/2027 | [TEXT_304] |
| 393 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | R3Q39AAE | Service | NVIDIA RTX Virtual Workstation 1 Concurrent User 5-year Subscription E-LTU | 0 | $1,429.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2020 | 11/30/2027 | [TEXT_305] |
| 394 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | R3Q40AAE | Service | NVIDIA RTX Virtual Workstation 1 Concurrent User Education 1-year Subscription Renewal E-LTU | 0 | $96.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2020 | 11/30/2027 | [TEXT_306] |
| 395 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | R3Q42AAE | Service | NVIDIA RTX Virtual Workstation 1 Concurrent User Education 3-year Subscription Renewal E-LTU | 0 | $241.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2020 | 11/30/2027 | [TEXT_307] |
| 396 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | R3Q44AAE | Service | NVIDIA Virtual Applications 1 Concurrent User 1-year Subscription E-LTU | 0 | $37.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2020 | 11/30/2027 | [TEXT_308] |
| 397 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | R3Q46AAE | Service | NVIDIA Virtual Applications 1 Concurrent User 3-year Subscription E-LTU | 0 | $63.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2020 | 11/30/2027 | [TEXT_309] |
| 398 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | R3Q47AAE | Service | NVIDIA Virtual Applications 1 Concurrent User 4-year Subscription E-LTU | 0 | $75.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2020 | 11/30/2027 | [TEXT_310] |
| 399 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | R3Q48AAE | Service | NVIDIA Virtual Applications 1 Concurrent User 5-year Subscription E-LTU | 0 | $89.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2020 | 11/30/2027 | [TEXT_311] |
| 400 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | R3Q49AAE | Service | NVIDIA Virtual PC 1 Concurrent User 1-year Subscription E-LTU | 0 | $89.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2020 | 11/30/2027 | [TEXT_311] |
| 401 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | R3Q51AAE | Service | NVIDIA Virtual PC 1 Concurrent User 3-year Subscription E-LTU | 0 | $213.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2020 | 11/30/2027 | [TEXT_312] |
| 402 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | R3Q52AAE | Service | NVIDIA Virtual PC 1 Concurrent User 4-year Subscription E-LTU | 0 | $242.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2020 | 11/30/2027 | [TEXT_313] |
| 403 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | R3Q53AAE | Service | NVIDIA Virtual PC 1 Concurrent User 5-year Subscription E-LTU | 0 | $274.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2020 | 11/30/2027 | [TEXT_314] |
| 404 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | R3Q63AAE | Service | NVIDIA RTX Virtual Workstation SUMS 1 Concurrent User 1-year Subscription Renewal E-LTU | 0 | $182.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2020 | 11/30/2027 | [TEXT_315] |
| 405 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | R3Q67AAE | Service | NVIDIA RTX Virtual Workstation SUMS 1 Concurrent User 5-year Subscription E-LTU | 0 | $645.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2020 | 11/30/2027 | [TEXT_316] |
| 406 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | R3Q68AAE | Service | NVIDIA RTX Virtual Workstation SUMS 1 Concurrent User Education 1-year Subscription Renewal E-LTU | 0 | $62.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2020 | 11/30/2027 | [TEXT_317] |
| 407 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | R3Q72AAE | Service | NVIDIA RTX Virtual Workstation SUMS 1 Concurrent User Education 5-year Subscription E-LTU | 0 | $178.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2020 | 11/30/2027 | [TEXT_318] |
| 408 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | R3Q73AAE | Service | NVIDIA Virtual Applications SUMS 1 Concurrent User 1-year Subscription Renewal E-LTU | 0 | $33.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2020 | 11/30/2027 | [TEXT_319] |
| 409 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | R3Q77AAE | Service | NVIDIA Virtual Applications SUMS 1 Concurrent User 5-year Subscription E-LTU | 0 | $59.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2020 | 11/30/2027 | [TEXT_320] |
| 410 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | R3Q79AAE | Service | NVIDIA Virtual PC 1 Concurrent User 1-year Subscription Renewal E-LTU | 0 | $106.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2020 | 11/30/2027 | [TEXT_321] |
| 411 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | R3Q81AAE | Service | NVIDIA Virtual PC 1 Concurrent User 3-year Subscription Renewal E-LTU | 0 | $266.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2020 | 11/30/2027 | [TEXT_322] |
| 412 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | R3Q93AAE | Service | NVIDIA RTX Virtual Workstation 1 Concurrent User Perpetual E-LTU | 0 | $530.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2020 | 11/30/2027 | [TEXT_323] |
| 413 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | R3Q94AAE | Service | NVIDIA RTX Virtual Workstation 1 Concurrent User Education Perpetual E-LTU | 0 | $134.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2020 | 11/30/2027 | [TEXT_324] |
| 414 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | R3Q95AAE | Service | NVIDIA RTX Virtual Workstation 1 Concurrent User 1-year Subscription Renewal E-LTU | 0 | $385.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2020 | 11/30/2027 | [TEXT_325] |
| 415 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | R3R01AAE | Service | NVIDIA Virtual Applications 1 Concurrent User Perpetual E-LTU | 0 | $51.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2020 | 11/30/2027 | [TEXT_326] |
| 416 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | R3R02AAE | Service | NVIDIA Virtual Applications 1 Concurrent User 1-year Subscription Renewal E-LTU | 0 | $41.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2020 | 11/30/2027 | [TEXT_327] |
| 417 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | R3R03AAE | Service | NVIDIA Virtual Applications 1 Concurrent User 3-year Subscription Renewal E-LTU | 0 | $73.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2020 | 11/30/2027 | [TEXT_328] |
| 418 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | R3R06AAE | Service | NVIDIA Virtual PC 1 Concurrent User Perpetual E-LTU | 0 | $150.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2020 | 11/30/2027 | [TEXT_329] |
| 419 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | R3R07AAE | Service | NVIDIA Virtual PC SUMS 1 Concurrent User 1-year Subscription Renewal E-LTU | 0 | $69.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2020 | 11/30/2027 | [TEXT_330] |
| 420 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | R3R12AAE | Service | NVIDIA RTX Virtual Workstation 1 Concurrent User 3-year Subscription Renewal E-LTU | 0 | $1,108.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2020 | 11/30/2027 | [TEXT_331] |
| 421 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | R3R21AAE | Service | NVIDIA Virtual PC SUMS 1 Concurrent User 5-year Subscription E-LTU | 0 | $197.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2020 | 11/30/2027 | [TEXT_332] |
| 422 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | R3R26AAE | Service | NVIDIA RTX Virtual Workstation 1 Concurrent User Education 1-year Subscription E-LTU | 0 | $86.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2020 | 11/30/2027 | [TEXT_333] |
| 423 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | R3R27AAE | Service | NVIDIA RTX Virtual Workstation 1 Concurrent User Education 3-year Subscription E-LTU | 0 | $210.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2020 | 11/30/2027 | [TEXT_334] |
| 424 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | S2S16AAE | Service | NVIDIA AI Enterprise per GPU 1-year Subscription 9x5 Support E-LTU | 0 | $5,252.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/02/2023 | 11/30/2028 | [TEXT_335] |
| 425 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | S2S17AAE | Service | NVIDIA AI Enterprise per GPU 3-year Subscription 9x5 Support E-LTU | 0 | $15,755.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/02/2023 | 11/30/2028 | [TEXT_336] |
| 426 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | S2S18AAE | Service | NVIDIA AI Enterprise per GPU 5-year Subscription 9x5 Support E-LTU | 0 | $21,006.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/02/2023 | 11/30/2028 | [TEXT_337] |
| 427 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | S2S19AAE | Service | NVIDIA AI Enterprise per GPU 1-year Subscription 9x5 Support Renewal E-LTU | 0 | $5,252.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 11/06/2023 | 11/30/2028 | [TEXT_335] |
| 428 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | S2S20AAE | Service | NVIDIA AI Enterprise per GPU 3-year Subscription 9x5 Support Renewal E-LTU | 0 | $15,755.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 11/06/2023 | 11/30/2028 | [TEXT_336] |
| 429 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | S2S21AAE | Service | NVIDIA AI Enterprise per GPU 5-year Subscription 9x5 Support Renewal E-LTU | 0 | $26,258.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 11/06/2023 | 11/30/2028 | [TEXT_338] |
| 430 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | S2S22AAE | Service | NVIDIA AI Enterprise Educational per GPU 1-year Subscription 9x5 Support E-LTU | 0 | $1,313.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/02/2023 | 11/30/2028 | [TEXT_339] |
| 431 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | S2S23AAE | Service | NVIDIA AI Enterprise Educational per GPU 3-year Subscription 9x5 Support E-LTU | 0 | $3,939.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/02/2023 | 11/30/2028 | [TEXT_340] |
| 432 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | S2S24AAE | Service | NVIDIA AI Enterprise Educational per GPU 5-year Subscription 9x5 Support E-LTU | 0 | $5,252.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/02/2023 | 11/30/2028 | [TEXT_335] |
| 433 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | S2S25AAE | Service | NVIDIA AI Enterprise Educational per GPU 1-year Subscription 9x5 Support Renewal E-LTU | 0 | $1,313.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 11/06/2023 | 11/30/2028 | [TEXT_339] |
| 434 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | S2S26AAE | Service | NVIDIA AI Enterprise Educational per GPU 3-year Subscription 9x5 Support Renewal E-LTU | 0 | $3,939.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 11/06/2023 | 11/30/2028 | [TEXT_340] |
| 435 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | S2S27AAE | Service | NVIDIA AI Enterprise Educational per GPU 5-year Subscription 9x5 Support Renewal E-LTU | 0 | $6,564.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 11/06/2023 | 11/30/2028 | [TEXT_341] |
| 436 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | S2S28AAE | Service | NVIDIA AI Enterprise per GPU 1-year 24x7 Support E-LTU | 0 | $1,284.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/02/2023 | 11/30/2028 | [TEXT_342] |
| 437 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | S2S29AAE | Service | NVIDIA AI Enterprise per GPU 3-year 24x7 Support E-LTU | 0 | $3,851.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/02/2023 | 11/30/2028 | [TEXT_343] |
| 438 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | S2S30AAE | Service | NVIDIA AI Enterprise per GPU 5-year 24x7 Support E-LTU | 0 | $6,419.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/02/2023 | 11/30/2028 | [TEXT_344] |
| 439 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | S2S31AAE | Service | NVIDIA AI Enterprise Educational per GPU 1-year 24x7 Support E-LTU | 0 | $899.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/02/2023 | 11/30/2028 | [TEXT_345] |
| 440 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | S2S32AAE | Service | NVIDIA AI Enterprise Educational per GPU 3-year 24x7 Support E-LTU | 0 | $2,696.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/02/2023 | 11/30/2028 | [TEXT_346] |
| 441 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | S2S33AAE | Service | NVIDIA AI Enterprise Educational per GPU 5-year 24x7 Support E-LTU | 0 | $4,494.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/02/2023 | 11/30/2028 | [TEXT_347] |
| 442 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | S2S34AAE | Service | NVIDIA AI Enterprise per GPU 1-year 24x7 Support Renewal E-LTU | 0 | $1,284.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 11/06/2023 | 11/30/2028 | [TEXT_342] |
| 443 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | S2S35AAE | Service | NVIDIA AI Enterprise per GPU 3-year 24x7 Support Renewal E-LTU | 0 | $3,851.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 11/06/2023 | 11/30/2028 | [TEXT_343] |
| 444 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | S2S36AAE | Service | NVIDIA AI Enterprise per GPU 5-year 24x7 Support Renewal E-LTU | 0 | $6,419.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 11/06/2023 | 11/30/2028 | [TEXT_344] |
| 445 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | S2S37AAE | Service | NVIDIA AI Enterprise Educational per GPU 1-year 24x7 Support Renewal E-LTU | 0 | $899.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 11/06/2023 | 11/30/2028 | [TEXT_345] |
| 446 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | S2S38AAE | Service | NVIDIA AI Enterprise Educational per GPU 3-year 24x7 Support Renewal E-LTU | 0 | $2,696.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 11/06/2023 | 11/30/2028 | [TEXT_346] |
| 447 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | S2S39AAE | Service | NVIDIA AI Enterprise Educational per GPU 5-year 24x7 Support Renewal E-LTU | 0 | $4,493.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 11/06/2023 | 11/30/2028 | [TEXT_348] |
| 448 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | S8M87AAE | Service | NVIDIA RTX PRO 4500 Blackwell Server Edition per GPU 3-year E-LTU | 0 | $6,049.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 08/03/2026 | 11/08/2029 | [TEXT_349] |
| 449 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for NVIDIA GPU SW: no max | S8M88AAE | Service | NVIDIA RTX PRO 4500 Blackwell Server Edition per GPU 5-year E-LTU | 0 | $8,765.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 08/03/2026 | 11/08/2029 | [TEXT_350] |
| 450 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | 512485-B21 | Standard | HPE iLO Advanced 1-server License with 1yr Support on iLO Licensed Features | 0 | $399.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 11/18/2008 | 02/25/2036 | [TEXT_351] |
| 451 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | BD505A | Standard | HPE iLO Advanced 1-server License with 3yr Support on iLO Licensed Features | 1 | $469.00 |  |  | $469.00 |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/26/2012 | 02/25/2036 | [TEXT_352] |
| 452 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | 512487-B21 | Standard | HPE iLO Advanced AKA Tracking License with 1yr Support on iLO Licensed Features | 0 | $399.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/04/2015 | 02/25/2036 | [TEXT_353] |
| 453 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | BD507A | Standard | HPE iLO Advanced AKA Tracking License with 3yr Support on iLO Licensed Features | 0 | $469.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/26/2012 | 02/25/2036 | [TEXT_354] |
| 454 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | E6U59ABE | Standard | HPE iLO Advanced Electronic License with 1yr Support on iLO Licensed Features | 0 | $399.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 09/28/2013 | 02/25/2036 | [TEXT_351] |
| 455 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | E6U64ABE | Standard | HPE iLO Advanced Electronic License with 3yr Support on iLO Licensed Features | 0 | $467.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 09/28/2013 | 02/25/2036 | [TEXT_355] |
| 456 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | 512486-B21 | Standard | HPE iLO Advanced Flexible Quantity License with 1yr Support on iLO Licensed Features | 0 | $399.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/18/2008 | 12/01/2024 | [TEXT_356] |
| 457 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | BD506A | Standard | HPE iLO Advanced Flexible Quantity License with 3yr Support on iLO Licensed Features | 0 | $469.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 03/26/2012 | 12/01/2024 | [TEXT_357] |
| 458 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | S6L45A | Standard | Microsoft Windows Server 2019 Downgrade Datacenter Reseller Option Kit Japanese ESD LTU | 0 | $20.00 |  | NA | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 09/02/2025 | 02/29/2028 | [TEXT_358] |
| 459 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | P11086-B21 | Standard | Microsoft Windows Server 2016 Downgrade Datacenter FIO Not Pre-installed English SW | 0 | $28.00 |  | NA | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 04/02/2019 | 08/31/2025 | [TEXT_359] |
| 460 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | P11086-051 | Standard | Microsoft Windows Server 2016 Downgrade Datacenter FIO Not Pre-installed French SW | 0 | $28.00 |  | NA | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 04/02/2019 | 08/31/2025 | [TEXT_359] |
| 461 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | P11086-041 | Standard | Microsoft Windows Server 2016 Downgrade Datacenter FIO Not Pre-installed German SW | 0 | $28.00 |  | NA | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 04/02/2019 | 08/31/2025 | [TEXT_359] |
| 462 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | P11086-061 | Standard | Microsoft Windows Server 2016 Downgrade Datacenter FIO Not Pre-installed Italian SW | 0 | $20.00 |  | NA | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 04/02/2019 | 08/31/2025 | [TEXT_360] |
| 463 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | P11086-291 | Standard | Microsoft Windows Server 2016 Downgrade Datacenter FIO Not Pre-installed Japanese SW | 0 |  |  | NA | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 04/02/2019 | 08/31/2025 | [TEXT_361] |
| 464 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | P11086-071 | Standard | Microsoft Windows Server 2016 Downgrade Datacenter FIO Not Pre-installed Spanish SW | 0 | $20.00 |  | NA | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 04/02/2019 | 08/31/2025 | [TEXT_360] |
| 465 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | P11083-B21 | Standard | Microsoft Windows Server 2016 Downgrade Standard FIO Not Pre-installed English SW | 0 | $28.00 |  | NA | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 04/02/2019 | 08/31/2025 | [TEXT_359] |
| 466 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | P11083-051 | Standard | Microsoft Windows Server 2016 Downgrade Standard FIO Not Pre-installed French SW | 0 | $28.00 |  | NA | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 04/02/2019 | 08/31/2025 | [TEXT_359] |
| 467 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | P11083-041 | Standard | Microsoft Windows Server 2016 Downgrade Standard FIO Not Pre-installed German SW | 0 | $28.00 |  | NA | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 04/02/2019 | 08/31/2025 | [TEXT_359] |
| 468 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | P11083-061 | Standard | Microsoft Windows Server 2016 Downgrade Standard FIO Not Pre-installed Italian SW | 0 | $28.00 |  | NA | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 04/02/2019 | 08/31/2025 | [TEXT_359] |
| 469 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | P11083-291 | Standard | Microsoft Windows Server 2016 Downgrade Standard FIO Not Pre-installed Japanese SW | 0 |  |  | NA | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 04/02/2019 | 08/31/2025 | [TEXT_361] |
| 470 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | P11083-071 | Standard | Microsoft Windows Server 2016 Downgrade Standard FIO Not Pre-installed Spanish SW | 0 | $28.00 |  | NA | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 04/02/2019 | 08/31/2025 | [TEXT_359] |
| 471 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | P45879-B21 | Standard | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed English SW | 0 | $20.00 |  | NA | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/06/2021 | 02/28/2027 | [TEXT_362] |
| 472 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | P45879-051 | Standard | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed French SW | 0 | $20.00 |  | NA | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/06/2021 | 02/28/2027 | [TEXT_362] |
| 473 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | P45879-041 | Standard | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed German SW | 0 | $28.00 |  | NA | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/06/2021 | 02/28/2027 | [TEXT_363] |
| 474 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | P45879-061 | Standard | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed Italian SW | 0 | $20.00 |  | NA | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/06/2021 | 02/28/2027 | [TEXT_362] |
| 475 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | P45879-291 | Standard | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed Japanese SW | 0 | $99,999.00 |  | NA | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/06/2021 | 02/28/2027 | [TEXT_364] |
| 476 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | P45879-071 | Standard | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed Spanish SW | 0 | $28.00 |  | NA | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/06/2021 | 02/28/2027 | [TEXT_363] |
| 477 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | P45862-B21 | Standard | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed English SW | 0 | $20.00 |  | NA | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/06/2021 | 02/28/2027 | [TEXT_362] |
| 478 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | P45862-051 | Standard | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed French SW | 0 | $28.00 |  | NA | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/06/2021 | 02/28/2027 | [TEXT_363] |
| 479 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | P45862-041 | Standard | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed German SW | 0 | $20.00 |  | NA | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/06/2021 | 02/28/2027 | [TEXT_362] |
| 480 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | P45862-061 | Standard | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed Italian SW | 0 | $20.00 |  | NA | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/06/2021 | 02/28/2027 | [TEXT_362] |
| 481 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | P45862-291 | Standard | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed Japanese SW | 0 | $99,999.00 |  | NA | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/06/2021 | 02/28/2027 | [TEXT_364] |
| 482 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | P45862-071 | Standard | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed Spanish SW | 0 | $20.00 |  | NA | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/06/2021 | 02/28/2027 | [TEXT_362] |
| 483 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | S6L47A | Standard | Microsoft Windows Server 2019 Downgrade Datacenter FIO Not Pre-installed WW ESD LTU | 0 | $20.00 |  | NA | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 09/02/2025 | 02/29/2028 | [TEXT_365] |
| 484 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | S6L46A | Standard | Microsoft Windows Server 2019 Downgrade Standard FIO Not Pre-installed WW ESD LTU | 0 | $20.00 |  | NA | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 09/02/2025 | 02/29/2028 | [TEXT_365] |
| 485 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | P77125-291 | Standard | Microsoft Windows Server 2022 Downgrade Datacenter FIO Not Pre-installed Japanese SW | 0 |  |  | NA | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/02/2024 | 02/28/2027 | [TEXT_271] |
| 486 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | S6L48A | Standard | Microsoft Windows Server 2022 Downgrade Datacenter FIO Not Pre-installed WW ESD LTU | 0 | $33.00 |  | NA | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 09/02/2025 | 02/29/2028 | [TEXT_366] |
| 487 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | P77125-B21 | Standard | Microsoft Windows Server 2022 Downgrade Datacenter FIO Not Pre-installed WW SW | 0 | $33.00 |  | NA | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/02/2024 | 02/28/2027 | [TEXT_367] |
| 488 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | P77124-291 | Standard | Microsoft Windows Server 2022 Downgrade Standard FIO Not Pre-installed Japanese SW | 0 |  |  | NA | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/02/2024 | 02/28/2027 | [TEXT_271] |
| 489 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | S6L43A | Standard | Microsoft Windows Server 2022 Downgrade Standard FIO Not Pre-installed WW ESD LTU | 0 | $33.00 |  | NA | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 09/02/2025 | 02/29/2028 | [TEXT_366] |
| 490 | Software &amp; Licenses | Integrated Lights Out Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Integrated Lights Out Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Integrated Lights Out Software: no max | P77124-B21 | Standard | Microsoft Windows Server 2022 Downgrade Standard FIO Not Pre-installed WW SW | 0 | $33.00 |  | NA | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/02/2024 | 02/28/2027 | [TEXT_367] |
| 491 | Software &amp; Licenses | Proliant Software Media Kits | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Proliant Software Media Kits | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Proliant Software Media Kits: no max | Q5T84A | Standard | SUSE Linux Enterprise High Availability Extension 1-2 Sockets 1yr Subscription Flexible LTU | 0 | $752.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/05/2017 | 05/31/2028 | [TEXT_368] |
| 492 | Software &amp; Licenses | Proliant Software Media Kits | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Proliant Software Media Kits | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Proliant Software Media Kits: no max | Q5T85A | Standard | SUSE Linux Enterprise High Availability Extension 1-2 Sockets 5yr Subscription Flexible LTU | 0 | $3,390.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/05/2017 | 05/31/2028 | [TEXT_369] |
| 493 | Software &amp; Licenses | Linux Value Added Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Linux Value Added Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Linux Value Added Software: no max | S4T26A | Standard | Red Hat High Availability 2 Sockets Unlimited Guests 1-year Subscription LTU | 0 | $1,506.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/07/2024 | 12/07/2027 | [TEXT_370] |
| 494 | Software &amp; Licenses | Linux Value Added Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Linux Value Added Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Linux Value Added Software: no max | S4T27A | Standard | Red Hat High Availability 2 Sockets Unlimited Guests 3-year Subscription LTU | 0 | $4,519.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/07/2024 | 12/07/2027 | [TEXT_371] |
| 495 | Software &amp; Licenses | Linux Value Added Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Linux Value Added Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Linux Value Added Software: no max | S4T22A | Standard | Red Hat High Availability 2 Sockets or 2 Guests 1-year Subscription LTU | 0 | $439.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/07/2024 | 12/07/2027 | [TEXT_372] |
| 496 | Software &amp; Licenses | Linux Value Added Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Linux Value Added Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Linux Value Added Software: no max | S4T23A | Standard | Red Hat High Availability 2 Sockets or 2 Guests 3-year Subscription LTU | 0 | $1,251.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/07/2024 | 12/07/2027 | [TEXT_373] |
| 497 | Software &amp; Licenses | Linux Value Added Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Linux Value Added Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Linux Value Added Software: no max | S4T24A | Standard | Red Hat Resilient Storage 2 Sockets or 2 Guests 1-year Subscription LTU | 0 | $879.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/07/2024 | 12/07/2027 | [TEXT_374] |
| 498 | Software &amp; Licenses | Linux Value Added Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Linux Value Added Software | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Linux Value Added Software: no max | S4T25A | Standard | Red Hat Resilient Storage 2 Sockets or 2 Guests 3-year Subscription LTU | 0 | $2,637.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/07/2024 | 12/07/2027 | [TEXT_375] |
| 499 | Software &amp; Licenses | HPC Software Products | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; HPC Software Products | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for HPC Software Products: no max | Q2A48A | Standard | HPE Performance Message Passing Interface for 1 Socket 3yr Support LTU | 0 | $249.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 07/07/2017 | 08/31/2027 | [TEXT_376] |
| 500 | Software &amp; Licenses | High Availability Computing - Cluster Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; High Availability Computing - Cluster Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for High Availability Computing - Cluster Software: no max | R8V48A | Standard | HPE Serviceguard for Linux x86 Flex Storage Add-On Media | 0 | $50.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/04/2021 | 05/01/2025 | [TEXT_377] |
| 501 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | S6L39A | Standard | Microsoft Windows Server 2025 10-core Essentials Reseller Option Kit WW ESD LTU | 0 | $445.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 09/02/2025 | 02/29/2028 | [TEXT_378] |
| 502 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | S6L37A | Standard | Microsoft Windows Server 2025 16-core Datacenter Reassignment Reseller Option Kit WW ESD LTU | 0 | $7,733.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 09/02/2025 | 02/29/2028 | [TEXT_379] |
| 503 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | S6L36A | Standard | Microsoft Windows Server 2025 16-core Datacenter Reseller Option Kit WW ESD LTU | 0 | $5,712.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 09/02/2025 | 02/29/2028 | [TEXT_238] |
| 504 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | S6L38A | Standard | Microsoft Windows Server 2025 16-core Standard Reseller Option Kit WW ESD LTU | 0 | $1,147.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 09/02/2025 | 02/29/2028 | [TEXT_380] |
| 505 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P11085-291 | Standard | Microsoft Windows Server 2016 Downgrade Datacenter Reseller Option Kit Japanese SW | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 04/02/2019 | 08/31/2025 | [TEXT_381] |
| 506 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P11084-291 | Standard | Microsoft Windows Server 2016 Downgrade Standard Reseller Option Kit Japanese SW | 0 |  |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 04/02/2019 | 08/31/2025 | [TEXT_381] |
| 507 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P46172-AA1 | Standard | Microsoft Windows Server 2022 10-core Essentials Reseller Option Kit Chinese Simplified SW | 0 | $99,999.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/01/2021 | 08/31/2025 | [TEXT_229] |
| 508 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P46172-AB1 | Standard | Microsoft Windows Server 2022 10-core Essentials Reseller Option Kit Chinese Traditional SW | 0 | $99,999.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/01/2021 | 08/31/2025 | [TEXT_229] |
| 509 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P46172-371 | Standard | Microsoft Windows Server 2022 10-core Essentials Reseller Option Kit English/Korean/Japanese SW | 0 | $99,999.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/01/2021 | 08/31/2025 | [TEXT_229] |
| 510 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P46172-021 | Standard | Microsoft Windows Server 2022 10-core Essentials Reseller Option Kit en/cs/pl/ru/sv SW | 0 | $394.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/01/2021 | 08/31/2025 | [TEXT_382] |
| 511 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P46172-A21 | Standard | Microsoft Windows Server 2022 10-core Essentials Reseller Option Kit en/fr/it/de/es/nl/pt SW | 0 | $407.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/01/2021 | 08/31/2025 | [TEXT_383] |
| 512 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P46123-AA1 | Standard | Microsoft Windows Server 2022 16-core Datacenter Reseller Option Kit Chinese Simplified SW | 0 | $99,999.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/01/2021 | 08/31/2025 | [TEXT_229] |
| 513 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P46123-AB1 | Standard | Microsoft Windows Server 2022 16-core Datacenter Reseller Option Kit Chinese Traditional SW | 0 | $99,999.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/01/2021 | 08/31/2025 | [TEXT_229] |
| 514 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P46123-371 | Standard | Microsoft Windows Server 2022 16-core Datacenter Reseller Option Kit English/Korean/Japanese SW | 0 | $99,999.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/04/2021 | 08/31/2025 | [TEXT_229] |
| 515 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P46123-021 | Standard | Microsoft Windows Server 2022 16-core Datacenter Reseller Option Kit en/cs/pl/ru/sv SW | 0 | $4,946.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/01/2021 | 08/31/2025 | [TEXT_231] |
| 516 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P46123-A21 | Standard | Microsoft Windows Server 2022 16-core Datacenter Reseller Option Kit en/fr/it/de/es/nl/pt SW | 0 | $4,946.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/04/2021 | 08/31/2025 | [TEXT_231] |
| 517 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P46128-B21 | Standard | Microsoft Windows Server 2022 16-core Datacenter w/Reassignment Reseller Option Kit en/fr/de/es SW | 0 | $6,899.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/01/2021 | 08/31/2025 | [TEXT_384] |
| 518 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P46128-291 | Standard | Microsoft Windows Server 2022 16-core Datacenter with Reassignment Reseller Option Kit Japanese SW | 0 | $99,999.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/01/2021 | 08/31/2025 | [TEXT_229] |
| 519 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P46171-AA1 | Standard | Microsoft Windows Server 2022 16-core Standard Reseller Option Kit Chinese Simplified SW | 0 | $99,999.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/01/2021 | 08/31/2025 | [TEXT_229] |
| 520 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P46171-AB1 | Standard | Microsoft Windows Server 2022 16-core Standard Reseller Option Kit Chinese Traditional SW | 0 | $99,999.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/01/2021 | 08/31/2025 | [TEXT_229] |
| 521 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P46171-371 | Standard | Microsoft Windows Server 2022 16-core Standard Reseller Option Kit English/Korean/Japanese SW | 0 | $99,999.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/04/2021 | 08/31/2025 | [TEXT_229] |
| 522 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P46171-021 | Standard | Microsoft Windows Server 2022 16-core Standard Reseller Option Kit en/cs/pl/ru/sv SW | 0 | $948.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 11/01/2021 | 08/31/2025 | [TEXT_385] |
| 523 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P46171-A21 | Standard | Microsoft Windows Server 2022 16-core Standard Reseller Option Kit en/fr/it/de/es/nl/pt SW | 0 | $948.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/04/2021 | 08/31/2025 | [TEXT_385] |
| 524 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P77103-AA1 | Standard | Microsoft Windows Server 2025 10-core Essentials Reseller Option Kit Chinese Simplified SW | 0 |  |  |  | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/02/2024 | 02/28/2027 | [TEXT_386] |
| 525 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P77103-AB1 | Standard | Microsoft Windows Server 2025 10-core Essentials Reseller Option Kit Chinese Traditional SW | 0 |  |  |  | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/02/2024 | 02/28/2027 | [TEXT_386] |
| 526 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P77103-291 | Standard | Microsoft Windows Server 2025 10-core Essentials Reseller Option Kit Japanese SW | 0 |  |  |  | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/02/2024 | 02/28/2027 | [TEXT_386] |
| 527 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P77103-021 | Standard | Microsoft Windows Server 2025 10-core Essentials Reseller Option Kit en/cs/pl/ru/sv SW | 0 | $445.00 |  |  | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/02/2024 | 02/28/2027 | [TEXT_387] |
| 528 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P77103-A21 | Standard | Microsoft Windows Server 2025 10-core Essentials Reseller Option Kit en/fr/de/es/it/pt/nl SW | 0 | $445.00 |  |  | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/02/2024 | 02/28/2027 | [TEXT_387] |
| 529 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P77103-371 | Standard | Microsoft Windows Server 2025 10-core Essentials Reseller Option Kit en/ko SW | 0 |  |  |  | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/02/2024 | 02/28/2027 | [TEXT_386] |
| 530 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P77102-291 | Standard | Microsoft Windows Server 2025 16-core Datacenter Reassignment Reseller Option Kit Japanese SW | 0 |  |  |  | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/02/2024 | 02/28/2027 | [TEXT_386] |
| 531 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P77102-B21 | Standard | Microsoft Windows Server 2025 16-core Datacenter Reassignment Reseller Option Kit en/fr/de/es SW | 0 | $7,733.00 |  |  | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/02/2024 | 02/28/2027 | [TEXT_388] |
| 532 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P77101-AA1 | Standard | Microsoft Windows Server 2025 16-core Datacenter Reseller Option Kit Chinese Simplified SW | 0 |  |  |  | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/02/2024 | 02/28/2027 | [TEXT_386] |
| 533 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P77101-AB1 | Standard | Microsoft Windows Server 2025 16-core Datacenter Reseller Option Kit Chinese Traditional SW | 0 |  |  |  | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/02/2024 | 02/28/2027 | [TEXT_386] |
| 534 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P77101-291 | Standard | Microsoft Windows Server 2025 16-core Datacenter Reseller Option Kit Japanese SW | 0 |  |  |  | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/02/2024 | 02/28/2027 | [TEXT_386] |
| 535 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P77101-021 | Standard | Microsoft Windows Server 2025 16-core Datacenter Reseller Option Kit en/cs/pl/ru/sv SW | 0 | $5,712.00 |  |  | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/02/2024 | 02/28/2027 | [TEXT_389] |
| 536 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P77101-A21 | Standard | Microsoft Windows Server 2025 16-core Datacenter Reseller Option Kit en/fr/de/es/it/pt/nl SW | 0 | $5,712.00 |  |  | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/02/2024 | 02/28/2027 | [TEXT_389] |
| 537 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P77101-371 | Standard | Microsoft Windows Server 2025 16-core Datacenter Reseller Option Kit en/ko SW | 0 |  |  |  | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/02/2024 | 02/28/2027 | [TEXT_386] |
| 538 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P77100-AA1 | Standard | Microsoft Windows Server 2025 16-core Standard Reseller Option Kit Chinese Simplified SW | 0 |  |  |  | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/02/2024 | 02/28/2027 | [TEXT_386] |
| 539 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P77100-AB1 | Standard | Microsoft Windows Server 2025 16-core Standard Reseller Option Kit Chinese Traditional SW | 0 |  |  |  | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/02/2024 | 02/28/2027 | [TEXT_386] |
| 540 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P77100-291 | Standard | Microsoft Windows Server 2025 16-core Standard Reseller Option Kit Japanese SW | 0 |  |  |  | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/02/2024 | 02/28/2027 | [TEXT_386] |
| 541 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P77100-021 | Standard | Microsoft Windows Server 2025 16-core Standard Reseller Option Kit en/cs/pl/ru/sv SW | 0 | $1,147.00 |  |  | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/02/2024 | 02/28/2027 | [TEXT_390] |
| 542 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P77100-A21 | Standard | Microsoft Windows Server 2025 16-core Standard Reseller Option Kit en/fr/de/es/it/pt/nl SW | 0 | $1,147.00 |  |  | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/02/2024 | 02/28/2027 | [TEXT_390] |
| 543 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | P77100-371 | Standard | Microsoft Windows Server 2025 16-core Standard Reseller Option Kit en/ko SW | 0 |  |  |  | NA |  | No | EOL Warning (90-Day) | Unpublished |  | Unpublished | Unpublished | Unpublished | EOL Warning (90-Day) | 12/02/2024 | 02/28/2027 | [TEXT_386] |

Row 155: identical to sheet All SKUs, row 73.
Row 156: identical to sheet All SKUs, row 74.
Row 157: identical to sheet All SKUs, row 76.
Row 158: identical to sheet All SKUs, row 78.
Row 159: identical to sheet All SKUs, row 79.
Row 160: identical to sheet All SKUs, row 80.
Row 161: identical to sheet All SKUs, row 84.
Row 162: identical to sheet All SKUs, row 85.
Row 163: identical to sheet All SKUs, row 86.
Row 164: identical to sheet All SKUs, row 87.
Row 165: identical to sheet All SKUs, row 93.
Row 166: identical to sheet All SKUs, row 94.
Row 167: identical to sheet All SKUs, row 109.
Row 168: identical to sheet All SKUs, row 117.
Row 169: identical to sheet All SKUs, row 118.
Row 170: identical to sheet All SKUs, row 119.
Row 171: identical to sheet All SKUs, row 123.
Row 172: identical to sheet All SKUs, row 124.
Row 173: identical to sheet All SKUs, row 129.
Row 174: identical to sheet All SKUs, row 130.
Row 175: identical to sheet All SKUs, row 131.
Row 176: identical to sheet All SKUs, row 139.
Row 177: identical to sheet All SKUs, row 140.
Row 178: identical to sheet All SKUs, row 141.
Row 179: identical to sheet All SKUs, row 72.
Row 180: identical to sheet All SKUs, row 77.
Row 181: identical to sheet All SKUs, row 81.
Row 182: identical to sheet All SKUs, row 82.
Row 183: identical to sheet All SKUs, row 83.
Row 184: identical to sheet All SKUs, row 88.
Row 185: identical to sheet All SKUs, row 90.
Row 186: identical to sheet All SKUs, row 92.
Row 187: identical to sheet All SKUs, row 95.
Row 188: identical to sheet All SKUs, row 96.
Row 189: identical to sheet All SKUs, row 104.
Row 190: identical to sheet All SKUs, row 105.
Row 191: identical to sheet All SKUs, row 110.
Row 192: identical to sheet All SKUs, row 111.
Row 193: identical to sheet All SKUs, row 112.
Row 194: identical to sheet All SKUs, row 114.
Row 195: identical to sheet All SKUs, row 120.
Row 196: identical to sheet All SKUs, row 121.
Row 197: identical to sheet All SKUs, row 122.
Row 198: identical to sheet All SKUs, row 125.
Row 199: identical to sheet All SKUs, row 128.
Row 200: identical to sheet All SKUs, row 132.
Row 201: identical to sheet All SKUs, row 133.
Row 202: identical to sheet All SKUs, row 134.
Row 203: identical to sheet All SKUs, row 135.
Row 204: identical to sheet All SKUs, row 136.
Row 205: identical to sheet All SKUs, row 142.
Row 206: identical to sheet All SKUs, row 143.
Row 207: identical to sheet All SKUs, row 144.
Row 208: identical to sheet All SKUs, row 145.
Row 209: identical to sheet All SKUs, row 146.

### Chassis Variants

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Product # | Form Factor | Description | Option Type | HPE Recommended | List Price (USD) | Constraint | Start Date | Discontinued Date | Note |
| 2 | P71964-B21 | Unknown | HPE ProLiant DL145 Gen11 Configure-to-order Server | CTO | No | $2,375.00 | min 1, max 1 |  | Unknown | Select ONE chassis variant as the mandatory CTO base. All component rules, drive bay limits, and power constraints depend on this selection. |


### Chassis Options Matrix

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Base SKU | Form Factor | Option Type | HPE Recommended | List Price (USD) | Drive Media Supported | Base Drive Bays | Max Expandability | Power Envelope | Lifecycle Status | Start Date | Discontinued Date | Architectural Rules |
| 2 | P71964-B21 | Unknown | CTO | No | $2,375.00 | UNVERIFIED — variant-specific evidence required | UNVERIFIED — title is not a bay inventory | UNVERIFIED — variant-specific evidence required | UNVERIFIED — variant-specific evidence required | Active |  | Unknown | NOT VERIFIED: do not transfer compatibility or rules between base SKUs without scoped vendor evidence. |


### Rules &amp; Constraints

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 |
| --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Constraint | Rule Type | Rule Text |
| 2 | Unknown | SUSE SAP Operating Systems | Unlimited | Quantity Constraint | Quantity: Unlimited |
| 3 | OEM Software | OEM Software | max 999 | Quantity Constraint | Quantity: max 999 |
| 4 | Rack Options | Rack Options | max 4 | Quantity Constraint | Quantity: max 4 |
| 5 | Rack Options | Acoustics | max 1 | Quantity Constraint | Quantity: max 1 |
| 6 | Ambient Temperature | Ambient Temperature | max 2 | Quantity Constraint | Quantity: max 2 |
| 7 | Processor | Processors | max 1 | Quantity Constraint | Quantity: max 1 |
| 8 | Processor | Heatsink Kit | max 1 | Quantity Constraint | Quantity: max 1 |
| 9 | Memory | Memory | max 6 | Quantity Constraint | Quantity: max 6 |
| 10 | Storage Devices | SAS Controller | max 2 | Quantity Constraint | Quantity: max 2 |
| 11 | Storage Devices | Smart Storage Battery | max 1 | Quantity Constraint | Quantity: max 1 |
| 12 | Storage Devices | Storage Controller Cables | max 1 | Quantity Constraint | Quantity: max 1 |
| 13 | Storage Devices | RAID Settings | max 1 | Quantity Constraint | Quantity: max 1 |
| 14 | Storage Devices | Drive Cage | max 2 | Quantity Constraint | Quantity: max 2 |
| 15 | Storage Devices | SSD - EDSFF NVME Read Intensive | max 4 | Quantity Constraint | Quantity: max 4 |
| 16 | Storage Devices | SSD - Mixed Use | max 4 | Quantity Constraint | Quantity: max 4 |
| 17 | Storage Devices | NVMe - SSD and AIC - Read Intensive | max 4 | Quantity Constraint | Quantity: max 4 |
| 18 | Factory Configuration Settings | Factory Configuration Settings | max 2 | Quantity Constraint | Quantity: max 2 |
| 19 | Factory Configuration Settings | vSAN Tracking SKUs | Unlimited | Quantity Constraint | Quantity: Unlimited |
| 20 | Factory Configuration Settings | iLO Common Password | max 1 | Quantity Constraint | Quantity: max 1 |
| 21 | Factory Configuration Settings | Riser Cards | max 3 | Quantity Constraint | Quantity: max 3 |
| 22 | Networking | Ethernet PCIe | max 1 | Quantity Constraint | Quantity: max 1 |
| 23 | Networking | OCP Ethernet | max 1 | Quantity Constraint | Quantity: max 1 |
| 24 | Networking | Transceivers | max 16 | Quantity Constraint | Quantity: max 16 |
| 25 | Virtualization | HPE Virtualization | Unlimited | Quantity Constraint | Quantity: Unlimited |
| 26 | Virtualization | VMWare Core Editions | Unlimited | Quantity Constraint | Quantity: Unlimited |
| 27 | OS Boot Device | OS Boot Device | max 2 | Quantity Constraint | Quantity: max 2 |
| 28 | Graphics Options | Graphics | max 2 | Quantity Constraint | Quantity: max 2 |
| 29 | Graphics Options | Graphics Accessories | max 2 | Quantity Constraint | Quantity: max 2 |
| 30 | Graphics Options | Power Cooling Options | max 4 | Quantity Constraint | Quantity: max 4 |
| 31 | Graphics Options | Power Supplies | max 2 | Quantity Constraint | Quantity: max 2 |
| 32 | Graphics Options | Power Cords | max 2 | Quantity Constraint | Quantity: max 2 |
| 33 | Security Options | Security Hardware | Unlimited | Quantity Constraint | Quantity: Unlimited |
| 34 | Accessories | Management Hardware | max 2 | Quantity Constraint | Quantity: max 2 |
| 35 | HPE Compute Ops Management | Compute Ops Management SKUs (required) | max 1 | Quantity Constraint | Quantity: max 1 |
| 36 | HPE Compute Ops Management | Compute Ops Management SKUs | min 1, Required | Quantity Constraint | Quantity: min 1, Required |
| 37 | HPE Compute Ops Management | MS Windows Server Additional License | max 999 | Quantity Constraint | Quantity: max 999 |
| 38 | HPE Compute Ops Management | MS Windows Server CALs | Unlimited | Quantity Constraint | Quantity: Unlimited |
| 39 | HPE Compute Ops Management | MS Windows Server Not Preinstalled | Unlimited | Quantity Constraint | Quantity: Unlimited |
| 40 | HPE Compute Ops Management | MS Windows Server Preinstalled | Unlimited | Quantity Constraint | Quantity: Unlimited |
| 41 | HPE Compute Ops Management | Red Hat Operating Systems | Unlimited | Quantity Constraint | Quantity: Unlimited |
| 42 | HPE Compute Ops Management | SUSE Add-ons | Unlimited | Quantity Constraint | Quantity: Unlimited |
| 43 | HPE Compute Ops Management | SUSE containers | Unlimited | Quantity Constraint | Quantity: Unlimited |
| 44 | HPE Compute Ops Management | SUSE Operating Systems | Unlimited | Quantity Constraint | Quantity: Unlimited |
| 45 | HPE Compute Ops Management | OneView Management Software | Unlimited | Quantity Constraint | Quantity: Unlimited |
| 46 | HPE Compute Ops Management | NVIDIA GPU SW | Unlimited | Quantity Constraint | Quantity: Unlimited |
| 47 | HPE Compute Ops Management | Integrated Lights Out Software | Unlimited | Quantity Constraint | Quantity: Unlimited |
| 48 | HPE Compute Ops Management | Proliant Software Media Kits | Unlimited | Quantity Constraint | Quantity: Unlimited |
| 49 | HPE Compute Ops Management | Linux Value Added Software | Unlimited | Quantity Constraint | Quantity: Unlimited |
| 50 | HPE Compute Ops Management | AI-at-Scale | Unlimited | Quantity Constraint | Quantity: Unlimited |
| 51 | HPE Compute Ops Management | HPC Software Products | Unlimited | Quantity Constraint | Quantity: Unlimited |
| 52 | HPE Compute Ops Management | High Availability Computing - Cluster Software | Unlimited | Quantity Constraint | Quantity: Unlimited |
| 53 | HPE Compute Ops Management | Partner Software - Operating System 8pks | max 5994 | Quantity Constraint | Quantity: max 5994 |
| 54 | HPE Compute Ops Management | Reseller Option Kit | Unlimited | Quantity Constraint | Quantity: Unlimited |
| 55 | Chassis | Variants | min 1, max 1 — Active OCA CTO chassis | Configuration Rule | Select exactly one currently discoverable, non-TAA/non-GTA CTO base chassis |
| 56 | Accessories &amp; Infrastructure | Chassis Infrastructure &amp; Rail Kits | max 4 | Configuration Rule | Selection constraint for Chassis Infrastructure &amp; Rail Kits: max 4 |
| 57 | Cooling / Thermal | Heatsink Kit | max 1 | Configuration Rule | Selection constraint for Heatsink Kit: max 1 |
| 58 | Cooling / Thermal | Heatsink Kit | max 1 | Configuration Rule | P72006-B21 conditional visibility: portal selector activation required ("HPE DL145 Gen11 Desk/Wall Mount Kit" and "HPE DL145 Gen11 Rack enable kit" cannot be selected together.); PORTAL_CONDITIONAL |
| 59 | Rack Options | Acoustics | max 1 | Configuration Rule | Selection constraint for Acoustics: max 1 |
| 60 | Processor | Processors | max 1 | Configuration Rule | Selection constraint for Processors: max 1 |
| 61 | Memory | Memory | max 6 | Configuration Rule | Selection constraint for Memory: max 6 |
| 62 | Memory | Memory | max 6 | Configuration Rule | P50312-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL |
| 63 | Memory | Memory | max 6 | Configuration Rule | P64986-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL |
| 64 | Memory | Memory | max 6 | Configuration Rule | P50309-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL |
| 65 | Memory | Memory | max 6 | Configuration Rule | P64985-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL |
| 66 | Memory | Memory | max 6 | Configuration Rule | P64987-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL |
| 67 | Memory | Memory | max 6 | Configuration Rule | P64988-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL |
| 68 | Memory | Memory | max 6 | Configuration Rule | P66676-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL |
| 69 | Memory | Memory | max 6 | Configuration Rule | P69982-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL |
| 70 | Memory | Memory | max 6 | Configuration Rule | BTO Memories are not allowed in CTO Base Model. |
| 71 | Memory | Memory | max 6 | Configuration Rule | P50309-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL |
| 72 | Memory | Memory | max 6 | Configuration Rule | P50311-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL |
| 73 | Memory | Memory | max 6 | Configuration Rule | P50312-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL |
| 74 | Memory | Memory | max 6 | Configuration Rule | P64984-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL |
| 75 | Memory | Memory | max 6 | Configuration Rule | P64985-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL |
| 76 | Memory | Memory | max 6 | Configuration Rule | P64986-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL |
| 77 | Memory | Memory | max 6 | Configuration Rule | P64987-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL |
| 78 | Memory | Memory | max 6 | Configuration Rule | P64988-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL |
| 79 | Memory | Memory | max 6 | Configuration Rule | P66676-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL |
| 80 | Storage Controllers | SAS Controller | max 2 | Configuration Rule | Selection constraint for SAS Controller: max 2 |
| 81 | Storage Controllers | Smart Storage Batteries | max 1 | Configuration Rule | Selection constraint for Smart Storage Batteries: max 1 |
| 82 | Storage Controllers | Storage Controller Cables | max 1 | Configuration Rule | Selection constraint for Storage Controller Cables: max 1 |
| 83 | Storage Controllers | RAID Settings | max 1 | Configuration Rule | Selection constraint for RAID Settings: max 1 |
| 84 | Drive Enclosures / Drives | Drive Cage | max 2 | Configuration Rule | Selection constraint for Drive Cage: max 2 |
| 85 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | max 4 | Configuration Rule | Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 |
| 86 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | max 4 | Configuration Rule | P79615-B21 conditional visibility: portal selector activation required (If HPE DL145 Gen11 Opt ACC FIO Config is selected, then these EDSFF drives cannot be selected with direct attach. (Only controller mode).); PORTAL_CONDITIONAL |
| 87 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | max 4 | Configuration Rule | P79618-B21 conditional visibility: portal selector activation required (If HPE DL145 Gen11 Opt ACC FIO Config is selected, then these EDSFF drives cannot be selected with direct attach. (Only controller mode).); PORTAL_CONDITIONAL |
| 88 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | max 4 | Configuration Rule | P79620-B21 conditional visibility: portal selector activation required (If HPE DL145 Gen11 Opt ACC FIO Config is selected, then these EDSFF drives cannot be selected with direct attach. (Only controller mode).); PORTAL_CONDITIONAL |
| 89 | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | max 4 | Configuration Rule | P79623-B21 conditional visibility: portal selector activation required (If HPE DL145 Gen11 Opt ACC FIO Config is selected, then these EDSFF drives cannot be selected with direct attach. (Only controller mode).); PORTAL_CONDITIONAL |
| 90 | Factory Configuration Settings | Factory Configuration Settings | max 2 | Configuration Rule | Selection constraint for Factory Configuration Settings: max 2 |
| 91 | Cooling / Thermal | Heatsink Kit | max 1 | Configuration Rule | P35876-B21 conditional visibility: portal selector activation required (CE Mark label SKU (P35876-B21) should be visible only when selecting Lot9 SKU's in the configuration); PORTAL_CONDITIONAL |
| 92 | Accessories &amp; Infrastructure | vSAN Tracking SKUs | no max | Configuration Rule | Selection constraint for vSAN Tracking SKUs: no max |
| 93 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | max 1 | Configuration Rule | Selection constraint for iLO Common Password: max 1 |
| 94 | PCIe Risers | Riser Cards | max 3 | Configuration Rule | Selection constraint for Riser Cards: max 3 |
| 95 | Networking | Ethernet PCIe | max 1 | Configuration Rule | Selection constraint for Ethernet PCIe: max 1 |
| 96 | Networking | OCP Ethernet | max 1 | Configuration Rule | Selection constraint for OCP Ethernet: max 1 |
| 97 | Networking | OCP Ethernet | max 1 | Configuration Rule | Max quantity of product limited by space available. |
| 98 | Networking | OCP Ethernet | max 1 | Configuration Rule | P10097-B21 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 99 | Networking | OCP Ethernet | max 1 | Configuration Rule | P10115-B21 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 100 | Networking | OCP Ethernet | max 1 | Configuration Rule | P42041-B21 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 101 | Networking | OCP Ethernet | max 1 | Configuration Rule | P08449-B21 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 102 | Networking | OCP Ethernet | max 1 | Configuration Rule | P10106-B21 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 103 | Networking | OCP Ethernet | max 1 | Configuration Rule | P26256-B21 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 104 | Networking | OCP Ethernet | max 1 | Configuration Rule | P26269-B21 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 105 | Networking | Transceivers | max 16 | Configuration Rule | Selection constraint for Transceivers: max 16 |
| 106 | Software &amp; Licenses | VMWare Core Editions | no max | Configuration Rule | Selection constraint for VMWare Core Editions: no max |
| 107 | Cables &amp; Enablement Kits | Solid State Drives (NVMe/SAS/SATA) | max 2 | Configuration Rule | Selection constraint for Solid State Drives (NVMe/SAS/SATA): max 2 |
| 108 | Graphics &amp; GPU | Graphics | max 2 | Configuration Rule | Selection constraint for Graphics: max 2 |
| 109 | Graphics &amp; GPU | Graphics Accessories | max 2 | Configuration Rule | Selection constraint for Graphics Accessories: max 2 |
| 110 | Cooling / Thermal | Power Cooling Options | max 4 | Configuration Rule | Selection constraint for Power Cooling Options: max 4 |
| 111 | Power Supplies | Power Supplies | max 2 | Configuration Rule | Selection constraint for Power Supplies: max 2 |
| 112 | Cooling / Thermal | Heatsink Kit | max 1 | Configuration Rule | Mixing of Power Supplies is not allowed. |
| 113 | Cooling / Thermal | Heatsink Kit | max 1 | Configuration Rule | P44975-B21 conditional visibility: portal selector activation required (Mixing of Power Supplies is not allowed.); PORTAL_CONDITIONAL |
| 114 | Cooling / Thermal | Heatsink Kit | max 1 | Configuration Rule | P43150-B21 conditional visibility: portal selector activation required (Mixing of Power Supplies is not allowed.); PORTAL_CONDITIONAL |
| 115 | Cables &amp; Enablement Kits | Power Cords | max 2 | Configuration Rule | Selection constraint for Power Cords: max 2 |
| 116 | Cables &amp; Enablement Kits | HPE Virtualization | no max | Configuration Rule | Selection constraint for HPE Virtualization: no max |
| 117 | Cables &amp; Enablement Kits | HPE Virtualization | no max | Configuration Rule | Q0H80A conditional visibility: portal selector activation required (If AC Power Supply is selected then only AC Power Cords should be in the drop-down.); PORTAL_CONDITIONAL |
| 118 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | no max | Configuration Rule | BTO products are not allowed in CTO Base Model. |
| 119 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | no max | Configuration Rule | A0K02A conditional visibility: portal selector activation required (BTO products are not allowed in CTO Base Model.); PORTAL_CONDITIONAL |
| 120 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | no max | Configuration Rule | A0N33A conditional visibility: portal selector activation required (BTO products are not allowed in CTO Base Model.); PORTAL_CONDITIONAL |
| 121 | Security Options | Security Hardware | no max | Configuration Rule | Selection constraint for Security Hardware: no max |
| 122 | Cables &amp; Enablement Kits | Management Hardware | max 2 | Configuration Rule | Selection constraint for Management Hardware: max 2 |
| 123 | Software &amp; Licenses | Compute Ops Management SKUs | required | Configuration Rule | Selection constraint for Compute Ops Management SKUs: required |
| 124 | Software &amp; Licenses | MS Windows Server Additional License | max 999 | Configuration Rule | Selection constraint for MS Windows Server Additional License: max 999 |
| 125 | Software &amp; Licenses | MS Windows Server CALs | no max | Configuration Rule | Selection constraint for MS Windows Server CALs: no max |
| 126 | Software &amp; Licenses | MS Windows Server Not Preinstalled | no max | Configuration Rule | Selection constraint for MS Windows Server Not Preinstalled: no max |
| 127 | Software &amp; Licenses | MS Windows Server Preinstalled | no max | Configuration Rule | Selection constraint for MS Windows Server Preinstalled: no max |
| 128 | Software &amp; Licenses | SUSE Add-ons | no max | Configuration Rule | Selection constraint for SUSE Add-ons: no max |
| 129 | Software &amp; Licenses | SUSE Operating Systems | no max | Configuration Rule | Selection constraint for SUSE Operating Systems: no max |
| 130 | Software &amp; Licenses | SUSE SAP Operating Systems | no max | Configuration Rule | Selection constraint for SUSE SAP Operating Systems: no max |
| 131 | Software &amp; Licenses | OneView Management Software | no max | Configuration Rule | Selection constraint for OneView Management Software: no max |
| 132 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | no max | Configuration Rule | Selection constraint for NVIDIA GPU SW: no max |
| 133 | Software &amp; Licenses | Integrated Lights Out Software | no max | Configuration Rule | Selection constraint for Integrated Lights Out Software: no max |
| 134 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | no max | Configuration Rule | Selection constraint for Integrated Lights Out Software: no max |
| 135 | Software &amp; Licenses | Proliant Software Media Kits | no max | Configuration Rule | Selection constraint for Proliant Software Media Kits: no max |
| 136 | Software &amp; Licenses | Linux Value Added Software | no max | Configuration Rule | Selection constraint for Linux Value Added Software: no max |
| 137 | Software &amp; Licenses | HPC Software Products | no max | Configuration Rule | Selection constraint for HPC Software Products: no max |
| 138 | Software &amp; Licenses | High Availability Computing - Cluster Software | no max | Configuration Rule | Selection constraint for High Availability Computing - Cluster Software: no max |
| 139 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | no max | Configuration Rule | Selection constraint for Server Management &amp; Operating System Licenses: no max |
| 140 | Support Services | Ambient Temperature | max 2 | Configuration Rule | Selection constraint for Ambient Temperature: max 2 |
| 141 | Software &amp; Licenses | Red Hat Operating Systems | no max | Configuration Rule | Selection constraint for Red Hat Operating Systems: no max |
| 142 | Software &amp; Licenses | SUSE containers | no max | Configuration Rule | Selection constraint for SUSE containers: no max |
| 143 | Software &amp; Licenses | Partner Software - Operating System 8pks | max 5994 | Configuration Rule | Selection constraint for Partner Software - Operating System 8pks: max 5994 |
| 144 | Rack Options | Configuration Rules | "HPE DL145 Gen11 Desk/Wall Mount Kit" and "HPE DL145 Gen11 Rack enable kit" cannot be selected together. | Learned Feedback Rule | [MUTUAL_EXCLUSION] "HPE DL145 Gen11 Desk/Wall Mount Kit" and "HPE DL145 Gen11 Rack enable kit" cannot be selected together. |
| 145 | Memory | Configuration Rules | All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc. | Learned Feedback Rule | [MEMORY_MIXING] All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc. |
| 146 | Memory | Configuration Rules | BTO Memories are not allowed in CTO Base Model. | Learned Feedback Rule | [BTO_DISALLOWED] BTO Memories are not allowed in CTO Base Model. |
| 147 | Storage Devices | Configuration Rules | [TEXT_391] | Learned Feedback Rule | [CHASSIS_GATE] If HPE DL145 Gen11 Opt ACC FIO Config is selected, then these EDSFF drives cannot be selected with direct attach. (Only controller mode). |
| 148 | Factory Configuration Settings | Configuration Rules | CE Mark label SKU (P35876-B21) should be visible only when selecting Lot9 SKU's in the configuration | Learned Feedback Rule | [MUTUAL_EXCLUSION] CE Mark label SKU (P35876-B21) should be visible only when selecting Lot9 SKU's in the configuration |
| 149 | Networking | Configuration Rules | Max quantity of product limited by space available. | Learned Feedback Rule | [MUTUAL_EXCLUSION] Max quantity of product limited by space available. |
| 150 | Power and Cooling | Configuration Rules | Mixing of Power Supplies is not allowed. | Learned Feedback Rule | [MUTUAL_EXCLUSION] Mixing of Power Supplies is not allowed. |
| 151 | Power and Cooling | Configuration Rules | If AC Power Supply is selected then only AC Power Cords should be in the drop-down. | Learned Feedback Rule | [MUTUAL_EXCLUSION] If AC Power Supply is selected then only AC Power Cords should be in the drop-down. |
| 152 | Power and Cooling | Configuration Rules | BTO products are not allowed in CTO Base Model. | Learned Feedback Rule | [BTO_DISALLOWED] BTO products are not allowed in CTO Base Model. |
| 153 | Networking | Ethernet PCIe |  | Reference Link | [TEXT_392] |
| 154 | Networking | OCP Ethernet |  | Reference Link | [TEXT_392] |
| 155 | Networking | Transceivers |  | Reference Link | [TEXT_392] |
| 156 | Virtualization | VMWare Core Editions |  | Minimum Requirement | Minimum 1 of any of the OS SKUs must be selected. |
| 157 | HPE Compute Ops Management | MS Windows Server Not Preinstalled |  | Minimum Requirement | Minimum 1 of any of the OS SKUs must be selected. |
| 158 | HPE Compute Ops Management | MS Windows Server Preinstalled |  | Minimum Requirement | Minimum 1 of any of the OS SKUs must be selected. |
| 159 | HPE Compute Ops Management | Red Hat Operating Systems |  | Minimum Requirement | Minimum 1 of any of the OS SKUs must be selected. |
| 160 | HPE Compute Ops Management | SUSE containers |  | Minimum Requirement | Minimum 1 of any of the OS SKUs must be selected. |
| 161 | HPE Compute Ops Management | SUSE Operating Systems |  | Minimum Requirement | Minimum 1 of any of the OS SKUs must be selected. |
| 162 | HPE Compute Ops Management | Partner Software - Operating System 8pks |  | Minimum Requirement | Minimum 1 of any of the OS SKUs must be selected. |
| 163 | HPE Compute Ops Management | Reseller Option Kit |  | Minimum Requirement | Minimum 1 of any of the OS SKUs must be selected. |
| 164 | Virtualization | VMWare Core Editions |  | Recommendation | [TEXT_393] |
| 165 | HPE Compute Ops Management | MS Windows Server Not Preinstalled |  | Recommendation | [TEXT_393] |
| 166 | HPE Compute Ops Management | MS Windows Server Preinstalled |  | Recommendation | [TEXT_393] |
| 167 | HPE Compute Ops Management | Red Hat Operating Systems |  | Recommendation | [TEXT_393] |
| 168 | HPE Compute Ops Management | SUSE containers |  | Recommendation | [TEXT_393] |
| 169 | HPE Compute Ops Management | SUSE Operating Systems |  | Recommendation | [TEXT_393] |
| 170 | HPE Compute Ops Management | Partner Software - Operating System 8pks |  | Recommendation | [TEXT_393] |
| 171 | HPE Compute Ops Management | Reseller Option Kit |  | Recommendation | [TEXT_393] |
| 172 | Graphics Options | Power Supplies |  | Selection Guide | In order to select the right size power supply for your ProLiant Server it is highly recommended to use 'HPE Power Advisor' located at - https://poweradvisorext.it.hpe.com/?Page=Index . (Power Supplies) |
| 173 | Rack Options | Acoustics |  | Conditional Rule | [TEXT_394] |
| 174 | Rack Options | Acoustics |  | Conditional Rule | If no acoustic mode and no ambient temperature is selected, then system will operate at Standard operating support 5C - 30C (41F - 86F) and Acoustic Mode will be disabled by default. |
| 175 | Ambient Temperature | Ambient Temperature |  | Conditional Rule | [TEXT_394] |
| 176 | Memory | Memory |  | Conditional Rule | [TEXT_394] |
| 177 | Graphics Options | Graphics |  | Conditional Rule | If Double Wide GPU is selected, then Doublewide GPU Cable Kit, Doublewide GPU Air baffle kit and 1U Heat sink kit must be selected. |


### Unavailable Rules &amp; Gates

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Rule ID | Rule Type | Section | Constraint / Reason | Affected SKU Count | Affected SKUs |
| 2 | RULE_1 | CONDITIONAL_VISIBILITY | Rack Options | "HPE DL145 Gen11 Desk/Wall Mount Kit" and "HPE DL145 Gen11 Rack enable kit" cannot be selected together. | 1 | P72006-B21 |
| 3 | RULE_2 | CONDITIONAL_VISIBILITY | Memory | All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc. | 8 | P50312-F21, P64986-F21, P50309-F21, P64985-F21, P64987-F21, P64988-F21, P66676-F21, P69982-F21 |
| 4 | RULE_3 | CONDITIONAL_VISIBILITY | Memory | BTO Memories are not allowed in CTO Base Model. | 9 | P50309-B21, P50311-B21, P50312-B21, P64984-B21, P64985-B21, P64986-B21, P64987-B21, P64988-B21, P66676-B21 |
| 5 | RULE_4 | CONDITIONAL_VISIBILITY | Storage Devices | [TEXT_391] | 4 | P79615-B21, P79618-B21, P79620-B21, P79623-B21 |
| 6 | RULE_5 | CONDITIONAL_VISIBILITY | Factory Configuration Settings | CE Mark label SKU (P35876-B21) should be visible only when selecting Lot9 SKU's in the configuration | 1 | P35876-B21 |
| 7 | RULE_6 | CONDITIONAL_VISIBILITY | Networking | Max quantity of product limited by space available. | 7 | P10097-B21, P10115-B21, P42041-B21, P08449-B21, P10106-B21, P26256-B21, P26269-B21 |
| 8 | RULE_7 | CONDITIONAL_VISIBILITY | Power and Cooling | Mixing of Power Supplies is not allowed. | 2 | P44975-B21, P43150-B21 |
| 9 | RULE_8 | CONDITIONAL_VISIBILITY | Power and Cooling | If AC Power Supply is selected then only AC Power Cords should be in the drop-down. | 1 | Q0H80A |
| 10 | RULE_9 | CONDITIONAL_VISIBILITY | Power and Cooling | BTO products are not allowed in CTO Base Model. | 2 | A0K02A, A0N33A |


### Software &amp; Licenses

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |
| 270 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | S5Q81AAE | Service | HPE Morpheus VM Essentials Software per Socket 1-year E-LTU | 0 | $600.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/02/2024 | 02/28/2028 | [TEXT_395] |
| 271 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | S5Q82AAE | Service | HPE Morpheus VM Essentials Software per Socket 3-year E-LTU | 0 | $1,800.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/02/2024 | 02/28/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":1800,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 272 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | S5Q83AAE | Service | HPE Morpheus VM Essentials Software per Socket 5-year E-LTU | 0 | $3,000.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/02/2024 | 02/28/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":3000,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 273 | Software &amp; Licenses | VMWare Core Editions | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; VMWare Core Editions | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for VMWare Core Editions: no max | R8V76AAE | Service | SUSE Linux Enterprise Server 1-2 Sockets Unlimited VM w/Live Patching 1-year 24x7 E-LTU | 0 | $3,980.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/04/2021 | 05/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":3980,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 274 | Software &amp; Licenses | VMWare Core Editions | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; VMWare Core Editions | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for VMWare Core Editions: no max | R8V74AAE | Service | SUSE Linux Enterprise Server 1-2 Sockets Unlimited VM w/Live Patching 1-year 9x5 E-LTU | 0 | $2,260.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/04/2021 | 05/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":2260,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 275 | Software &amp; Licenses | VMWare Core Editions | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; VMWare Core Editions | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for VMWare Core Editions: no max | R8V77AAE | Service | SUSE Linux Enterprise Server 1-2 Sockets Unlimited VM w/Live Patching 3-year 24x7 E-LTU | 0 | $10,800.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/04/2021 | 05/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":10800,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 276 | Software &amp; Licenses | VMWare Core Editions | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; VMWare Core Editions | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for VMWare Core Editions: no max | R8V75AAE | Service | SUSE Linux Enterprise Server 1-2 Sockets Unlimited VM w/Live Patching 3-year 9x5 E-LTU | 0 | $6,110.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/04/2021 | 05/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":6110,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 277 | Software &amp; Licenses | VMWare Core Editions | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; VMWare Core Editions | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for VMWare Core Editions: no max | R8V78AAE | Service | SUSE Linux Enterprise Server 1-2 Sockets Unlimited VM w/Live Patching 5-year 24x7 E-LTU | 0 | $18,000.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/04/2021 | 05/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":18000,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 278 | Software &amp; Licenses | VMWare Core Editions | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; VMWare Core Editions | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for VMWare Core Editions: no max | S0F24AAE | Service | SUSE Linux Enterprise Server 1-2 Sockets Unlimited VM w/Live Patching 5-year 9x5 E-LTU | 0 | $10,200.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/03/2022 | 05/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":10200,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 279 | Software &amp; Licenses | VMWare Core Editions | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; VMWare Core Editions | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for VMWare Core Editions: no max | R8V72AAE | Service | SUSE Linux Enterprise Server for SAP 1-2 Sockets Unlimited VM w/Live Patching 3-year 24x7 E-LTU | 0 | $18,873.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/04/2021 | 03/16/2026 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":18873,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 280 | Software &amp; Licenses | VMWare Core Editions | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; VMWare Core Editions | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for VMWare Core Editions: no max | R8V73AAE | Service | SUSE Linux Enterprise Server for SAP 1-2 Sockets Unlimited VM w/Live Patching 5-year 24x7 E-LTU | 0 | $31,455.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/04/2021 | 03/16/2026 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":31455,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 281 | Software &amp; Licenses | VMWare Core Editions | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; VMWare Core Editions | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for VMWare Core Editions: no max | S7N77AAE | Service | SUSE Linux Enterprise Server for SAP Applications 1-2 Sockets Unlimited VM 3yr Sub 24x7 Sup E-LTU | 0 | $18,873.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/02/2026 | 05/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":18873,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 282 | Software &amp; Licenses | VMWare Core Editions | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; VMWare Core Editions | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for VMWare Core Editions: no max | S7N78AAE | Service | SUSE Linux Enterprise Server for SAP Applications 1-2 Sockets Unlimited VM 5yr Sub 24x7 Sup E-LTU | 0 | $31,455.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/02/2026 | 05/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":31455,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 283 | Software &amp; Licenses | VMWare Core Editions | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; VMWare Core Editions | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for VMWare Core Editions: no max | S0F26AAE | Service | SUSE Manager Lifecycle Management 1-2 Sockets Unlimited VM 1-year 24x7 E-LTU | 0 | $806.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/03/2022 | 05/31/2028 | [TEXT_396] |
| 284 | Software &amp; Licenses | VMWare Core Editions | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; VMWare Core Editions | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for VMWare Core Editions: no max | R8V87AAE | Service | SUSE Manager Lifecycle Management 1-2 Sockets Unlimited VM 1-year 24x7 E-LTU | 0 | $806.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/04/2021 | 05/31/2028 | [TEXT_396] |
| 285 | Software &amp; Licenses | VMWare Core Editions | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; VMWare Core Editions | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for VMWare Core Editions: no max | S0F28AAE | Service | SUSE Manager Lifecycle Management 1-2 Sockets Unlimited VM 3-year 24x7 E-LTU | 0 | $2,180.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/03/2022 | 05/31/2028 | [TEXT_397] |
| 286 | Software &amp; Licenses | VMWare Core Editions | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; VMWare Core Editions | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for VMWare Core Editions: no max | R8V89AAE | Service | SUSE Manager Lifecycle Management 1-2 Sockets Unlimited VM 3-year 24x7 E-LTU | 0 | $2,180.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/04/2021 | 05/31/2028 | [TEXT_397] |
| 287 | Software &amp; Licenses | VMWare Core Editions | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; VMWare Core Editions | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for VMWare Core Editions: no max | S0F30AAE | Service | SUSE Manager Lifecycle Management 1-2 Sockets Unlimited VM 5-year 24x7 E-LTU | 0 | $3,630.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/03/2022 | 05/31/2028 | [TEXT_398] |
| 288 | Software &amp; Licenses | VMWare Core Editions | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; VMWare Core Editions | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for VMWare Core Editions: no max | S0F22AAE | Service | SUSE Manager Lifecycle Management 1-2 Sockets Unlimited VM 5-year 24x7 E-LTU | 0 | $3,630.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/03/2022 | 05/31/2028 | [TEXT_398] |
| 289 | Software &amp; Licenses | VMWare Core Editions | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; VMWare Core Editions | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for VMWare Core Editions: no max | S0F25AAE | Service | SUSE Manager Lifecycle Management 1-2 Sockets or 1-2 VM 1-year 24x7 E-LTU | 0 | $268.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/03/2022 | 05/31/2028 | [TEXT_399] |
| 290 | Software &amp; Licenses | VMWare Core Editions | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; VMWare Core Editions | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for VMWare Core Editions: no max | R8V86AAE | Service | SUSE Manager Lifecycle Management 1-2 Sockets or 1-2 VM 1-year 24x7 E-LTU | 0 | $268.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/04/2021 | 05/31/2028 | [TEXT_399] |
| 291 | Software &amp; Licenses | VMWare Core Editions | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; VMWare Core Editions | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for VMWare Core Editions: no max | S0F27AAE | Service | SUSE Manager Lifecycle Management 1-2 Sockets or 1-2 VM 3-year 24x7 E-LTU | 0 | $724.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/03/2022 | 05/31/2028 | [TEXT_400] |
| 292 | Software &amp; Licenses | VMWare Core Editions | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; VMWare Core Editions | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for VMWare Core Editions: no max | R8V88AAE | Service | SUSE Manager Lifecycle Management 1-2 Sockets or 1-2 VM 3-year 24x7 E-LTU | 0 | $724.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/04/2021 | 05/31/2028 | [TEXT_400] |
| 293 | Software &amp; Licenses | VMWare Core Editions | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; VMWare Core Editions | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for VMWare Core Editions: no max | S0F21AAE | Service | SUSE Manager Lifecycle Management 1-2 Sockets or 1-2 VM 5-year 24x7 E-LTU | 0 | $1,210.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/03/2022 | 05/31/2028 | [TEXT_401] |
| 294 | Software &amp; Licenses | VMWare Core Editions | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; VMWare Core Editions | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for VMWare Core Editions: no max | S0F29AAE | Service | SUSE Manager Lifecycle Management 1-2 Sockets or 1-2 VM 5-year 24x7 E-LTU | 0 | $1,210.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/03/2022 | 05/31/2028 | [TEXT_401] |
| 295 | Software &amp; Licenses | Compute Ops Management SKUs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Compute Ops Management SKUs | Operating System / License | min 1, Required | 1 | Required | Selection constraint for Compute Ops Management SKUs: required | R7A10AAE | Service | HPE Compute Ops Management Standard 1-year Upfront ProLiant SaaS | 0 | $150.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/06/2022 | 03/31/2028 | [TEXT_329] |
| 296 | Software &amp; Licenses | Compute Ops Management SKUs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Compute Ops Management SKUs | Operating System / License | min 1, Required | 1 | Required | Selection constraint for Compute Ops Management SKUs: required | R7A11AAE | Service | HPE Compute Ops Management Standard 3-year Upfront ProLiant SaaS | 0 | $450.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/06/2022 | 03/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":450,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 297 | Software &amp; Licenses | Compute Ops Management SKUs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Compute Ops Management SKUs | Operating System / License | min 1, Required | 1 | Required | Selection constraint for Compute Ops Management SKUs: required | R7A12AAE | Service | HPE Compute Ops Management Standard 5-year Upfront ProLiant SaaS | 1 | $750.00 |  |  | $750.00 |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/06/2022 | 03/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":750,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 298 | Software &amp; Licenses | Compute Ops Management SKUs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Compute Ops Management SKUs | Operating System / License | min 1, Required | 1 | Required | Selection constraint for Compute Ops Management SKUs: required | S2E10AAE | Service | HPE Compute Ops Management Standard 7-year Upfront ProLiant SaaS | 0 | $1,050.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 09/03/2024 | 03/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":1050,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 299 | Software &amp; Licenses | Compute Ops Management SKUs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Compute Ops Management SKUs | Operating System / License | min 1, Required | 1 | Required | Selection constraint for Compute Ops Management SKUs: required | S5E59AAE | Service | HPE Compute Ops Management Advanced 3-year Upfront ProLiant SaaS | 0 | $919.08 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 04/07/2025 | 03/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":919.08,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 300 | Software &amp; Licenses | Compute Ops Management SKUs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Compute Ops Management SKUs | Operating System / License | min 1, Required | 1 | Required | Selection constraint for Compute Ops Management SKUs: required | S5E60AAE | Service | HPE Compute Ops Management Advanced 5-year Upfront ProLiant SaaS | 0 | $1,531.80 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 04/07/2025 | 03/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":1531.8,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 301 | Software &amp; Licenses | Compute Ops Management SKUs | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Compute Ops Management SKUs | Operating System / License | min 1, Required | 1 | Required | Selection constraint for Compute Ops Management SKUs: required | S5E61AAE | Service | HPE Compute Ops Management Advanced 7-year Upfront ProLiant SaaS | 0 | $2,144.52 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 04/07/2025 | 03/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":2144.52,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 302 | Software &amp; Licenses | Red Hat Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Red Hat Operating Systems | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Red Hat Operating Systems: no max | S3Z85AAE | Service | Red Hat OpenShift Container Platform Bare Metal 1-2 Sockets up to 64 Cores 3yr Sub 24x7 Sup E-LTU | 0 | $51,040.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/03/2024 | 04/01/2025 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":51040,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 303 | Software &amp; Licenses | Red Hat Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Red Hat Operating Systems | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Red Hat Operating Systems: no max | S3Z87AAE | Service | Red Hat OpenShift Container Platform Bare Metal 1-2 Sockets up to 64 Cores 3yr Sub 9x5 Sup E-LTU | 0 | $34,030.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/03/2024 | 04/01/2025 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":34030,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 304 | Software &amp; Licenses | SUSE Add-ons | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Add-ons | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for SUSE Add-ons: no max | M6K34AAE | Service | SUSE Linux Enterprise High Availability Extension 1-2 Sockets 3 Year Subscription E-LTU | 0 | $2,040.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/01/2015 | 05/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":2040,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 305 | Software &amp; Licenses | SUSE containers | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE containers | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE containers: no max | S0E93AAE | Service | SUSE Linux Enterprise Micro 1-16 Cores 1-year Subscription 24x7 Support E-LTU | 0 | $322.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/03/2022 | 05/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":322,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 306 | Software &amp; Licenses | SUSE containers | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE containers | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE containers: no max | S0E94AAE | Service | SUSE Linux Enterprise Micro 1-16 Cores 3-year Subscription 24x7 Support E-LTU | 0 | $870.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/03/2022 | 05/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":870,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 307 | Software &amp; Licenses | SUSE containers | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE containers | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE containers: no max | S0E95AAE | Service | SUSE Linux Enterprise Micro 1-16 Cores 5-year Subscription 24x7 Support E-LTU | 0 | $1,451.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/03/2022 | 05/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":1451,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 308 | Software &amp; Licenses | SUSE containers | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE containers | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE containers: no max | S3B60AAE | Service | SUSE Storage per Node Add-on 5-15 Nodes 1-year Subscription 24x7 Support E-LTU | 0 | $1,980.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 03/04/2024 | 01/31/2025 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1980,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 309 | Software &amp; Licenses | SUSE containers | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE containers | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE containers: no max | S3B61AAE | Service | SUSE Storage per Node Add-on 16-50 Nodes 1-year Subscription 24x7 Support E-LTU | 0 | $1,860.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 03/04/2024 | 01/31/2025 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1860,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 310 | Software &amp; Licenses | SUSE containers | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE containers | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE containers: no max | S3B62AAE | Service | SUSE Storage per Node Add-on 5-15 Nodes 3-year Subscription 24x7 Support E-LTU | 0 | $5,346.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 03/04/2024 | 01/31/2025 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":5346,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 311 | Software &amp; Licenses | SUSE containers | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE containers | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE containers: no max | S3B63AAE | Service | SUSE Storage per Node Add-on 16-50 Nodes 3-year Subscription 24x7 Support E-LTU | 0 | $5,022.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 03/04/2024 | 01/31/2025 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":5022,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 312 | Software &amp; Licenses | SUSE containers | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE containers | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE containers: no max | S3B64AAE | Service | SUSE Storage per Node Add-on 5-15 Nodes 5-year Subscription 24x7 Support E-LTU | 0 | $8,910.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 03/04/2024 | 01/31/2025 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":8910,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 313 | Software &amp; Licenses | SUSE containers | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE containers | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE containers: no max | S3B65AAE | Service | SUSE Storage per Node Add-on 16-50 Nodes 5-year Subscription 24x7 Support E-LTU | 0 | $8,370.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 03/04/2024 | 01/31/2025 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":8370,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 314 | Software &amp; Licenses | SUSE containers | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE containers | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE containers: no max | S3B66AAE | Service | SUSE Rancher Prime with Rancher Prime Management Server per Node 5-15 Nodes 1yr Sub 24x7 Sup E-LTU | 0 | $5,400.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 03/04/2024 | 01/31/2025 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":5400,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 315 | Software &amp; Licenses | SUSE containers | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE containers | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE containers: no max | S3B67AAE | Service | SUSE Rancher Prime w/2x Rancher Prime Management Server per Node 16-50 Nodes 1yr Sub 24x7 Sup E-LTU | 0 | $3,851.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 03/04/2024 | 01/31/2025 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":3851,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 316 | Software &amp; Licenses | SUSE containers | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE containers | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE containers: no max | S3B68AAE | Service | SUSE Rancher Prime with Rancher Prime Management Server per Node 5-15 Nodes 3yr Sub 24x7 Sup E-LTU | 0 | $14,580.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 03/04/2024 | 01/31/2025 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":14580,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 317 | Software &amp; Licenses | SUSE containers | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE containers | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE containers: no max | S3B69AAE | Service | SUSE Rancher Prime w/2x Rancher Prime Management Server per Node 16-50 Nodes 3yr Sub 24x7 Sup E-LTU | 0 | $10,395.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 03/04/2024 | 01/31/2025 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":10395,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 318 | Software &amp; Licenses | SUSE containers | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE containers | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE containers: no max | S3B70AAE | Service | SUSE Rancher Prime with Rancher Prime Management Server per Node 5-15 Nodes 5yr Sub 24x7 Sup E-LTU | 0 | $24,300.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 03/04/2024 | 01/31/2025 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":24300,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 319 | Software &amp; Licenses | SUSE containers | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE containers | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE containers: no max | S3B71AAE | Service | SUSE Rancher Prime w/2x Rancher Prime Management Server per Node 16-50 Nodes 5yr Sub 24x7 Sup E-LTU | 0 | $17,325.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 03/04/2024 | 01/31/2025 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":17325,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 320 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S3R49AAE | Service | SUSE Linux Enterprise Server w/SUSE Manager Lifecycle Management+ 1-2 Sockets/1-2 VM 3yr 24x7 E-LTU | 0 | $4,399.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2024 | 03/16/2026 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":4399,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 321 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S3R50AAE | Service | SUSE Linux Enterprise Server w/SUSE Manager Lifecycle Management+ 1-2 Sockets/1-2 VM 1yr 24x7 E-LTU | 0 | $1,599.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2024 | 03/16/2026 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1599,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 322 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S3R51AAE | Service | SUSE Linux Enterprise Server w/SUSE Manager Lifecycle Management+ 1-2 Sockets/1-2 VM 1yr 9x5 E-LTU | 0 | $1,099.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2024 | 03/16/2026 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1099,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 323 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S3R52AAE | Service | SUSE Linux Enterprise Server w/SUSE Manager Lifecycle Management+ 1-2 Sockets/1-2 VM 5yr 24x7 E-LTU | 0 | $7,196.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2024 | 03/16/2026 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":7196,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 324 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S3R53AAE | Service | SUSE Linux Enterprise Server w/SUSE Manager Lifecycle Management+ 1-2 Sockets/1-2 VM 3yr 9x5 E-LTU | 0 | $2,990.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2024 | 03/16/2026 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":2990,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 325 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S3R54AAE | Service | SUSE Linux Enterprise Server w/SUSE Manager Lifecycle Management+ 1-2 Sockets/1-2 VM 5yr 9x5 E-LTU | 0 | $4,946.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2024 | 03/16/2026 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":4946,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 326 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S3R55AAE | Service | SUSE Linux Enterprise Server 1-2 Sockets 3-year 24x7 E-LTU | 0 | $3,507.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2024 | 03/16/2026 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":3507,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 327 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S3R56AAE | Service | SUSE Linux Enterprise Server 1-2 Sockets 1-year 24x7 E-LTU | 0 | $1,299.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2024 | 03/16/2026 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1299,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 328 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S3R57AAE | Service | SUSE Linux Enterprise Server 1 Virtual Machine 3-year 24x7 E-LTU | 0 | $1,887.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2024 | 03/16/2026 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1887,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 329 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S3R58AAE | Service | SUSE Linux Enterprise Server 1 Virtual Machine 1-year 24x7 E-LTU | 0 | $699.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2024 | 03/16/2026 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":699,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 330 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S3R59AAE | Service | SUSE Linux Enterprise Server 1 Virtual Machine 5-year 24x7 E-LTU | 0 | $3,146.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2024 | 03/16/2026 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":3146,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 331 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S3R60AAE | Service | SUSE Linux Enterprise Server 1-2 Sockets 5-year 24x7 E-LTU | 0 | $5,846.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/06/2024 | 03/16/2026 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":5846,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 332 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S7N75AAE | Service | SUSE Linux Enterprise Server for SAP Applications 1-2 Sockets or 1-2 VM 3-year Sub 24x7 Sup E-LTU | 0 | $7,803.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/02/2026 | 05/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":7803,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 333 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S7N76AAE | Service | SUSE Linux Enterprise Server for SAP Applications 1-2 Sockets or 1-2 VM 5-year Sub 24x7 Sup E-LTU | 0 | $13,005.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/02/2026 | 05/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":13005,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 334 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S7N79AAE | Service | SUSE Linux Enterprise Server w/SUSE Multi-Linux Mgr Lifecycle Mgmt+ 1-2 Skts/1-2 VM 1yr 24x7 E-LTU | 0 | $1,599.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/02/2026 | 05/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":1599,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 335 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S7N80AAE | Service | SUSE Linux Enterprise Server w/SUSE Multi-Linux Mgr Lifecycle Mgmt+ 1-2 Skts/1-2 VM 1yr 9x5 E-LTU | 0 | $1,099.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/02/2026 | 05/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":1099,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 336 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S7N81AAE | Service | SUSE Linux Enterprise Server w/SUSE Multi-Linux Mgr Lifecycle Mgmt+ 1-2 Skts/1-2 VM 3yr 24x7 E-LTU | 0 | $4,399.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/02/2026 | 05/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":4399,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 337 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S7N82AAE | Service | SUSE Linux Enterprise Server w/SUSE Multi-Linux Mgr Lifecycle Mgmt+ 1-2 Skts/1-2 VM 3yr 9x5 E-LTU | 0 | $2,990.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/02/2026 | 05/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":2990,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 338 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S7N83AAE | Service | SUSE Linux Enterprise Server w/SUSE Multi-Linux Mgr Lifecycle Mgmt+ 1-2 Skts/1-2 VM 5yr 24x7 E-LTU | 0 | $7,196.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/02/2026 | 05/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":7196,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 339 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S7N84AAE | Service | SUSE Linux Enterprise Server w/SUSE Multi-Linux Mgr Lifecycle Mgmt+ 1-2 Skts/1-2 VM 5yr 9x5 E-LTU | 0 | $4,946.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/02/2026 | 05/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":4946,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 340 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S7N95AAE | Service | SUSE Linux Enterprise Server 1-2 Sockets 1-year Subscription 24x7 Support E-LTU | 0 | $1,299.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/02/2026 | 05/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":1299,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 341 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S7N96AAE | Service | SUSE Linux Enterprise Server 1-2 Sockets 3-year Subscription 24x7 Support E-LTU | 0 | $3,507.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/02/2026 | 05/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":3507,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 342 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S7N97AAE | Service | SUSE Linux Enterprise Server 1-2 Sockets 5-year Subscription 24x7 Support E-LTU | 0 | $5,846.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/02/2026 | 05/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":5846,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 343 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S7N98AAE | Service | SUSE Linux Enterprise Server 1 VM 1-year Subscription 24x7 Support E-LTU | 0 | $699.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/02/2026 | 05/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":699,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 344 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S7N99AAE | Service | SUSE Linux Enterprise Server 1 VM 3-year Subscription 24x7 Support E-LTU | 0 | $1,887.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/02/2026 | 05/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":1887,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 345 | Software &amp; Licenses | SUSE Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE Operating Systems: no max | S7P00AAE | Service | SUSE Linux Enterprise Server 1 VM 5-year Subscription 24x7 Support E-LTU | 0 | $3,146.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/02/2026 | 05/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":3146,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 346 | Software &amp; Licenses | SUSE SAP Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE SAP Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE SAP Operating Systems: no max | M6K30AAE | Service | SUSE Linux Enterprise Server SAP 1-2 Sockets or 1-2 VM 3 Year Subscription 24x7 Support E-LTU | 0 | $7,803.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/01/2015 | 03/16/2026 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":7803,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 347 | Software &amp; Licenses | SUSE SAP Operating Systems | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; SUSE SAP Operating Systems | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for SUSE SAP Operating Systems: no max | M6K32AAE | Service | SUSE Linux Enterprise Server SAP 1-2 Sockets or 1-2 VM 5 Year Subscription 24x7 Support E-LTU | 0 | $13,005.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/01/2015 | 03/16/2026 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":13005,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 348 | Software &amp; Licenses | OneView Management Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; OneView Management Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for OneView Management Software: no max | E5Y35AAE | Service | HPE OneView including 3yr 24x7 Support Flexible Quantity E-LTU | 0 | $999.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/09/2013 | 08/31/2030 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":999,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 349 | Software &amp; Licenses | OneView Management Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; OneView Management Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for OneView Management Software: no max | P8B26AAE | Service | HPE OneView w/o iLO including 3yr 24x7 Support Flexible Quantity E-LTU | 0 | $499.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/09/2015 | 08/31/2030 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":499,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 350 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | S3R04AAE | Service | HPE Machine Learning Inference Software Base 1-year E-RTU | 0 | $8,316.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/18/2024 | 08/31/2027 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":8316,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 351 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | S3R05AAE | Service | HPE Machine Learning Inference Software Performance 1-year E-RTU | 0 | $2,078.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/18/2024 | 08/31/2027 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":2078,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 352 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | S3R06AAE | Service | HPE Machine Learning Inference Software Base 3-year E-RTU | 0 | $23,700.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/18/2024 | 08/31/2027 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":23700,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 353 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | S3R07AAE | Service | HPE Machine Learning Inference Software Performance 3-year E-RTU | 0 | $5,922.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/18/2024 | 08/31/2027 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":5922,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 354 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | S3W26AAE | Service | HPE Machine Learning Inference Software Base 4-year E-RTU | 0 | $31,602.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/18/2024 | 08/31/2027 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":31602,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 355 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | S3W27AAE | Service | HPE Machine Learning Inference Software Performance 4-year E-RTU | 0 | $7,896.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/18/2024 | 08/31/2027 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":7896,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 356 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | S3W28AAE | Service | HPE Machine Learning Inference Software Base 5-year E-RTU | 0 | $39,501.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/18/2024 | 08/31/2027 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":39501,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 357 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | S3W29AAE | Service | HPE Machine Learning Inference Software Performance 5-year E-RTU | 0 | $9,871.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 06/18/2024 | 08/31/2027 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":9871,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 358 | Software &amp; Licenses | High Availability Computing - Cluster Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; High Availability Computing - Cluster Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for High Availability Computing - Cluster Software: no max | R1T30AAE | Service | HPE Serviceguard for Linux x86 Base 1yr Subscription 24x7 Support PSL E-LTU | 0 | $1,074.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/04/2019 | 10/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":1074,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 359 | Software &amp; Licenses | High Availability Computing - Cluster Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; High Availability Computing - Cluster Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for High Availability Computing - Cluster Software: no max | R1T31AAE | Service | HPE Serviceguard for Linux x86 Advanced 1yr Subscription 24x7 Support PSL E-LTU | 0 | $1,511.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/04/2019 | 10/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":1511,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 360 | Software &amp; Licenses | High Availability Computing - Cluster Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; High Availability Computing - Cluster Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for High Availability Computing - Cluster Software: no max | R1T32AAE | Service | HPE Serviceguard for Linux x86 Enterprise 1yr Subscription 24x7 Support PSL E-LTU | 0 | $1,984.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/04/2019 | 10/31/2028 | [TEXT_402] |
| 361 | Software &amp; Licenses | High Availability Computing - Cluster Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; High Availability Computing - Cluster Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for High Availability Computing - Cluster Software: no max | R1T36AAE | Service | HPE Serviceguard for Linux x86 Enterprise for SAP HANA 1yr Subscription 24x7 Support PSL E-LTU | 0 | $1,984.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 03/04/2019 | 10/31/2028 | [TEXT_402] |
| 362 | Software &amp; Licenses | High Availability Computing - Cluster Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; High Availability Computing - Cluster Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for High Availability Computing - Cluster Software: no max | R7P98AAE | Service | HPE Serviceguard for Linux x86 Premium for SAP HANA 1-year Subscription 24x7 Support PSL E-LTU | 0 | $2,630.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 04/06/2021 | 10/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":2630,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 363 | Software &amp; Licenses | High Availability Computing - Cluster Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; High Availability Computing - Cluster Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for High Availability Computing - Cluster Software: no max | R8V45AAE | Service | HPE Serviceguard for Linux x86 Flex Storage Add-On 1yr Subscription 24x7 Support per Instance E-LTU | 0 | $4,725.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 10/04/2021 | 10/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":4725,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 364 | Software &amp; Licenses | High Availability Computing - Cluster Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; High Availability Computing - Cluster Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for High Availability Computing - Cluster Software: no max | R8V46AAE | Service | HPE Serviceguard for Linux x86 Flex Storage Add-On 3yr Subscription 24x7 Support per Instance E-LTU | 0 | $12,474.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/04/2021 | 10/31/2026 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":12474,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 365 | Software &amp; Licenses | High Availability Computing - Cluster Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; High Availability Computing - Cluster Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for High Availability Computing - Cluster Software: no max | S0W12AAE | Service | HPE Serviceguard for Linux v15 High Availability E5 2 Cores or 4 vCPUs 1yr Subscription 24x7 E-LTU | 0 | $69.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 01/10/2023 | 10/31/2028 | [TEXT_330] |
| 366 | Software &amp; Licenses | High Availability Computing - Cluster Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; High Availability Computing - Cluster Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for High Availability Computing - Cluster Software: no max | S0W13AAE | Service | HPE Serviceguard for Linux v15 High Availability E5 2 Cores or 4 vCPUs 3yr Subscription 24x7 E-LTU | 0 | $182.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 01/10/2023 | 10/31/2026 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":182,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 367 | Software &amp; Licenses | High Availability Computing - Cluster Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; High Availability Computing - Cluster Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for High Availability Computing - Cluster Software: no max | S0W14AAE | Service | HPE Serviceguard for Linux v15 High Availability E5 2 Cores or 4 vCPUs 5yr Subscription 24x7 E-LTU | 0 | $276.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 01/10/2023 | 12/28/2027 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":276,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 368 | Software &amp; Licenses | High Availability Computing - Cluster Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; High Availability Computing - Cluster Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for High Availability Computing - Cluster Software: no max | S0W15AAE | Service | HPE Serviceguard for Linux v15 HA and Disaster Recovery E7 2 Cores or 4 vCPUs 1y Sub 24x7 E-LTU | 0 | $124.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 01/10/2023 | 10/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":124,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 369 | Software &amp; Licenses | High Availability Computing - Cluster Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; High Availability Computing - Cluster Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for High Availability Computing - Cluster Software: no max | S0W16AAE | Service | HPE Serviceguard for Linux v15 HA and Disaster Recovery E7 2 Cores or 4 vCPUs 3y Sub 24x7 E-LTU | 0 | $327.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 01/10/2023 | 10/31/2026 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":327,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 370 | Software &amp; Licenses | High Availability Computing - Cluster Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; High Availability Computing - Cluster Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for High Availability Computing - Cluster Software: no max | S0W17AAE | Service | HPE Serviceguard for Linux v15 HA and Disaster Recovery E7 2 Cores or 4 vCPUs 5y Sub 24x7 E-LTU | 0 | $496.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 01/10/2023 | 12/28/2027 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":496,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 371 | Software &amp; Licenses | High Availability Computing - Cluster Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; High Availability Computing - Cluster Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for High Availability Computing - Cluster Software: no max | S0W18AAE | Service | HPE Serviceguard for Linux v15 SAP Add-on 2 Cores or 4 vCPUs 1-year Subscription 24x7 E-LTU | 0 | $42.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 01/10/2023 | 10/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":42,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 372 | Software &amp; Licenses | High Availability Computing - Cluster Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; High Availability Computing - Cluster Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for High Availability Computing - Cluster Software: no max | S0W19AAE | Service | HPE Serviceguard for Linux v15 SAP Add-on 2 Cores or 4 vCPUs 3-year Subscription 24x7 E-LTU | 0 | $111.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 01/10/2023 | 10/31/2026 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":111,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 373 | Software &amp; Licenses | High Availability Computing - Cluster Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; High Availability Computing - Cluster Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for High Availability Computing - Cluster Software: no max | S0W20AAE | Service | HPE Serviceguard for Linux v15 SAP Add-on 2 Cores or 4 vCPUs 5-year Subscription 24x7 E-LTU | 0 | $168.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 01/10/2023 | 12/28/2027 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":168,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 374 | Software &amp; Licenses | High Availability Computing - Cluster Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; High Availability Computing - Cluster Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for High Availability Computing - Cluster Software: no max | S0W21AAE | Service | HPE Serviceguard for Linux v15 Oracle Add-on 2 Cores or 4 vCPUs 1-year Subscription 24x7 E-LTU | 0 | $150.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 01/10/2023 | 10/31/2028 | [TEXT_329] |
| 375 | Software &amp; Licenses | High Availability Computing - Cluster Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; High Availability Computing - Cluster Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for High Availability Computing - Cluster Software: no max | S0W22AAE | Service | HPE Serviceguard for Linux v15 Oracle Add-on 2 Cores or 4 vCPUs 3-year Subscription 24x7 E-LTU | 0 | $396.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 01/10/2023 | 10/31/2026 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":396,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 376 | Software &amp; Licenses | High Availability Computing - Cluster Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; High Availability Computing - Cluster Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for High Availability Computing - Cluster Software: no max | S0W23AAE | Service | HPE Serviceguard for Linux v15 Oracle Add-on 2 Cores or 4 vCPUs 5-year Subscription 24x7 E-LTU | 0 | $600.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 01/10/2023 | 12/28/2027 | [TEXT_395] |
| 377 | Software &amp; Licenses | High Availability Computing - Cluster Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; High Availability Computing - Cluster Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for High Availability Computing - Cluster Software: no max | S0W24AAE | Service | HPE Serviceguard for Linux v15 Microsoft SQL Server Add-on 2 Cores or 4 vCPUs 1y Sub 24x7 E-LTU | 0 | $57.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 01/10/2023 | 10/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":57,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 378 | Software &amp; Licenses | High Availability Computing - Cluster Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; High Availability Computing - Cluster Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for High Availability Computing - Cluster Software: no max | S0W25AAE | Service | HPE Serviceguard for Linux v15 Microsoft SQL Server Add-on 2 Cores or 4 vCPUs 3y Sub 24x7 E-LTU | 0 | $150.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 01/10/2023 | 10/31/2026 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":150,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 379 | Software &amp; Licenses | High Availability Computing - Cluster Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; High Availability Computing - Cluster Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for High Availability Computing - Cluster Software: no max | S0W26AAE | Service | HPE Serviceguard for Linux v15 Microsoft SQL Server Add-on 2 Cores or 4 vCPUs 5y Sub 24x7 E-LTU | 0 | $228.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 01/10/2023 | 12/28/2027 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":228,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 380 | Software &amp; Licenses | High Availability Computing - Cluster Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; High Availability Computing - Cluster Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for High Availability Computing - Cluster Software: no max | S0W27AAE | Service | HPE Serviceguard for Linux v15 NFS Add-on 2 Cores or 4 vCPUs 1-year Subscription 24x7 E-LTU | 0 | $25.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 01/10/2023 | 10/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":25,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 381 | Software &amp; Licenses | High Availability Computing - Cluster Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; High Availability Computing - Cluster Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for High Availability Computing - Cluster Software: no max | S0W28AAE | Service | HPE Serviceguard for Linux v15 NFS Add-on 2 Cores or 4 vCPUs 3-year Subscription 24x7 E-LTU | 0 | $66.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 01/10/2023 | 10/31/2026 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":66,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 382 | Software &amp; Licenses | High Availability Computing - Cluster Software | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; High Availability Computing - Cluster Software | Service &amp; Support | Unlimited | 0 | Unlimited | Selection constraint for High Availability Computing - Cluster Software: no max | S0W29AAE | Service | HPE Serviceguard for Linux v15 NFS Add-on 2 Cores or 4 vCPUs 5-year Subscription 24x7 E-LTU | 0 | $100.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 01/10/2023 | 12/28/2027 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":100,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 383 | Software &amp; Licenses | Partner Software - Operating System 8pks | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Partner Software - Operating System 8pks | Service &amp; Support | max 5994 | 0 | 5,994 | Selection constraint for Partner Software - Operating System 8pks: max 5994 | Q9S73AAE | Service | SUSE Linux Enterprise Server HPC 1-2 Sockets 1-year Subscription 9x5 Support E-LTU | 0 | $108.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 04/02/2018 | 05/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":108,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 384 | Software &amp; Licenses | Partner Software - Operating System 8pks | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Partner Software - Operating System 8pks | Service &amp; Support | max 5994 | 0 | 5,994 | Selection constraint for Partner Software - Operating System 8pks: max 5994 | Q9S76AAE | Service | SUSE Linux Enterprise Server HPC 1-2 Sockets 1yr Subscription 24x7 Support E-LTU | 0 | $151.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 04/02/2018 | 05/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":151,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 385 | Software &amp; Licenses | Partner Software - Operating System 8pks | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Partner Software - Operating System 8pks | Service &amp; Support | max 5994 | 0 | 5,994 | Selection constraint for Partner Software - Operating System 8pks: max 5994 | Q9S74AAE | Service | SUSE Linux Enterprise Server HPC 1-2 Sockets 3-year Subscription 9x5 Support E-LTU | 0 | $292.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 04/02/2018 | 05/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":292,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 386 | Software &amp; Licenses | Partner Software - Operating System 8pks | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Partner Software - Operating System 8pks | Service &amp; Support | max 5994 | 0 | 5,994 | Selection constraint for Partner Software - Operating System 8pks: max 5994 | Q9S77AAE | Service | SUSE Linux Enterprise Server HPC 1-2 Sockets 3yr Subscription 24x7 Support E-LTU | 0 | $408.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 04/02/2018 | 05/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":408,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 387 | Software &amp; Licenses | Partner Software - Operating System 8pks | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Partner Software - Operating System 8pks | Service &amp; Support | max 5994 | 0 | 5,994 | Selection constraint for Partner Software - Operating System 8pks: max 5994 | Q9S75AAE | Service | SUSE Linux Enterprise Server HPC 1-2 Sockets 5-year Subscription 9x5 Support E-LTU | 0 | $486.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 04/02/2018 | 05/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":486,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 388 | Software &amp; Licenses | Partner Software - Operating System 8pks | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Partner Software - Operating System 8pks | Service &amp; Support | max 5994 | 0 | 5,994 | Selection constraint for Partner Software - Operating System 8pks: max 5994 | Q9S78AAE | Service | SUSE Linux Enterprise Server HPC 1-2 Sockets 5yr Subscription 24x7 Support E-LTU | 0 | $680.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 04/02/2018 | 05/31/2028 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":680,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |
| 389 | Software &amp; Licenses | Server Management &amp; Operating System Licenses | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Software &amp; Licenses &gt; Server Management &amp; Operating System Licenses | Operating System / License | Unlimited | 0 | Unlimited | Selection constraint for Server Management &amp; Operating System Licenses: no max | R2U47AAE | Service | SUSE Linux Enterprise Server Live Patching x86-64 1-2Sockets Inherited Virtualization 5yr 24x7 E-LTU | 0 | $3,390.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/01/2020 | 02/28/2026 | {"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":3390,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"} |

Row 2: identical to sheet All SKUs, row 213.
Row 3: identical to sheet All SKUs, row 238.
Row 4: identical to sheet All SKUs, row 239.
Row 5: identical to sheet All SKUs, row 240.
Row 6: identical to sheet All SKUs, row 241.
Row 7: identical to sheet All SKUs, row 242.
Row 8: identical to sheet All SKUs, row 243.
Row 9: identical to sheet All SKUs, row 244.
Row 10: identical to sheet All SKUs, row 245.
Row 11: identical to sheet All SKUs, row 246.
Row 12: identical to sheet All SKUs, row 247.
Row 13: identical to sheet All SKUs, row 248.
Row 14: identical to sheet All SKUs, row 249.
Row 15: identical to sheet All SKUs, row 289.
Row 16: identical to sheet All SKUs, row 290.
Row 17: identical to sheet All SKUs, row 291.
Row 18: identical to sheet All SKUs, row 292.
Row 19: identical to sheet All SKUs, row 293.
Row 20: identical to sheet All SKUs, row 294.
Row 21: identical to sheet All SKUs, row 295.
Row 22: identical to sheet All SKUs, row 296.
Row 23: identical to sheet All SKUs, row 297.
Row 24: identical to sheet All SKUs, row 298.
Row 25: identical to sheet All SKUs, row 299.
Row 26: identical to sheet All SKUs, row 300.
Row 27: identical to sheet All SKUs, row 301.
Row 28: identical to sheet All SKUs, row 302.
Row 29: identical to sheet All SKUs, row 303.
Row 30: identical to sheet All SKUs, row 304.
Row 31: identical to sheet All SKUs, row 305.
Row 32: identical to sheet All SKUs, row 306.
Row 33: identical to sheet All SKUs, row 307.
Row 34: identical to sheet All SKUs, row 308.
Row 35: identical to sheet All SKUs, row 309.
Row 36: identical to sheet All SKUs, row 310.
Row 37: identical to sheet All SKUs, row 311.
Row 38: identical to sheet All SKUs, row 312.
Row 39: identical to sheet All SKUs, row 313.
Row 40: identical to sheet All SKUs, row 314.
Row 41: identical to sheet All SKUs, row 315.
Row 42: identical to sheet All SKUs, row 316.
Row 43: identical to sheet All SKUs, row 317.
Row 44: identical to sheet All SKUs, row 318.
Row 45: identical to sheet All SKUs, row 319.
Row 46: identical to sheet All SKUs, row 320.
Row 47: identical to sheet All SKUs, row 321.
Row 48: identical to sheet All SKUs, row 322.
Row 49: identical to sheet All SKUs, row 323.
Row 50: identical to sheet All SKUs, row 324.
Row 51: identical to sheet All SKUs, row 325.
Row 52: identical to sheet All SKUs, row 326.
Row 53: identical to sheet All SKUs, row 327.
Row 54: identical to sheet All SKUs, row 328.
Row 55: identical to sheet All SKUs, row 329.
Row 56: identical to sheet All SKUs, row 330.
Row 57: identical to sheet All SKUs, row 331.
Row 58: identical to sheet All SKUs, row 332.
Row 59: identical to sheet All SKUs, row 333.
Row 60: identical to sheet All SKUs, row 334.
Row 61: identical to sheet All SKUs, row 335.
Row 62: identical to sheet All SKUs, row 336.
Row 63: identical to sheet All SKUs, row 337.
Row 64: identical to sheet All SKUs, row 338.
Row 65: identical to sheet All SKUs, row 339.
Row 66: identical to sheet All SKUs, row 340.
Row 67: identical to sheet All SKUs, row 341.
Row 68: identical to sheet All SKUs, row 342.
Row 69: identical to sheet All SKUs, row 343.
Row 70: identical to sheet All SKUs, row 344.
Row 71: identical to sheet All SKUs, row 345.
Row 72: identical to sheet All SKUs, row 346.
Row 73: identical to sheet All SKUs, row 347.
Row 74: identical to sheet All SKUs, row 348.
Row 75: identical to sheet All SKUs, row 349.
Row 76: identical to sheet All SKUs, row 350.
Row 77: identical to sheet All SKUs, row 351.
Row 78: identical to sheet All SKUs, row 352.
Row 79: identical to sheet All SKUs, row 353.
Row 80: identical to sheet All SKUs, row 354.
Row 81: identical to sheet All SKUs, row 355.
Row 82: identical to sheet All SKUs, row 356.
Row 83: identical to sheet All SKUs, row 357.
Row 84: identical to sheet All SKUs, row 358.
Row 85: identical to sheet All SKUs, row 359.
Row 86: identical to sheet All SKUs, row 360.
Row 87: identical to sheet All SKUs, row 361.
Row 88: identical to sheet All SKUs, row 362.
Row 89: identical to sheet All SKUs, row 363.
Row 90: identical to sheet All SKUs, row 364.
Row 91: identical to sheet All SKUs, row 365.
Row 92: identical to sheet All SKUs, row 366.
Row 93: identical to sheet All SKUs, row 367.
Row 94: identical to sheet All SKUs, row 368.
Row 95: identical to sheet All SKUs, row 369.
Row 96: identical to sheet All SKUs, row 370.
Row 97: identical to sheet All SKUs, row 371.
Row 98: identical to sheet All SKUs, row 372.
Row 99: identical to sheet All SKUs, row 373.
Row 100: identical to sheet All SKUs, row 374.
Row 101: identical to sheet All SKUs, row 375.
Row 102: identical to sheet All SKUs, row 376.
Row 103: identical to sheet All SKUs, row 377.
Row 104: identical to sheet All SKUs, row 378.
Row 105: identical to sheet All SKUs, row 379.
Row 106: identical to sheet All SKUs, row 380.
Row 107: identical to sheet All SKUs, row 381.
Row 108: identical to sheet All SKUs, row 382.
Row 109: identical to sheet All SKUs, row 383.
Row 110: identical to sheet All SKUs, row 384.
Row 111: identical to sheet All SKUs, row 385.
Row 112: identical to sheet All SKUs, row 386.
Row 113: identical to sheet All SKUs, row 387.
Row 114: identical to sheet All SKUs, row 388.
Row 115: identical to sheet All SKUs, row 389.
Row 116: identical to sheet All SKUs, row 390.
Row 117: identical to sheet All SKUs, row 391.
Row 118: identical to sheet All SKUs, row 392.
Row 119: identical to sheet All SKUs, row 393.
Row 120: identical to sheet All SKUs, row 394.
Row 121: identical to sheet All SKUs, row 395.
Row 122: identical to sheet All SKUs, row 396.
Row 123: identical to sheet All SKUs, row 397.
Row 124: identical to sheet All SKUs, row 398.
Row 125: identical to sheet All SKUs, row 399.
Row 126: identical to sheet All SKUs, row 400.
Row 127: identical to sheet All SKUs, row 401.
Row 128: identical to sheet All SKUs, row 402.
Row 129: identical to sheet All SKUs, row 403.
Row 130: identical to sheet All SKUs, row 404.
Row 131: identical to sheet All SKUs, row 405.
Row 132: identical to sheet All SKUs, row 406.
Row 133: identical to sheet All SKUs, row 407.
Row 134: identical to sheet All SKUs, row 408.
Row 135: identical to sheet All SKUs, row 409.
Row 136: identical to sheet All SKUs, row 410.
Row 137: identical to sheet All SKUs, row 411.
Row 138: identical to sheet All SKUs, row 412.
Row 139: identical to sheet All SKUs, row 413.
Row 140: identical to sheet All SKUs, row 414.
Row 141: identical to sheet All SKUs, row 415.
Row 142: identical to sheet All SKUs, row 416.
Row 143: identical to sheet All SKUs, row 417.
Row 144: identical to sheet All SKUs, row 418.
Row 145: identical to sheet All SKUs, row 419.
Row 146: identical to sheet All SKUs, row 420.
Row 147: identical to sheet All SKUs, row 421.
Row 148: identical to sheet All SKUs, row 422.
Row 149: identical to sheet All SKUs, row 423.
Row 150: identical to sheet All SKUs, row 424.
Row 151: identical to sheet All SKUs, row 425.
Row 152: identical to sheet All SKUs, row 426.
Row 153: identical to sheet All SKUs, row 427.
Row 154: identical to sheet All SKUs, row 428.
Row 155: identical to sheet All SKUs, row 429.
Row 156: identical to sheet All SKUs, row 430.
Row 157: identical to sheet All SKUs, row 431.
Row 158: identical to sheet All SKUs, row 432.
Row 159: identical to sheet All SKUs, row 433.
Row 160: identical to sheet All SKUs, row 434.
Row 161: identical to sheet All SKUs, row 435.
Row 162: identical to sheet All SKUs, row 436.
Row 163: identical to sheet All SKUs, row 437.
Row 164: identical to sheet All SKUs, row 438.
Row 165: identical to sheet All SKUs, row 439.
Row 166: identical to sheet All SKUs, row 440.
Row 167: identical to sheet All SKUs, row 441.
Row 168: identical to sheet All SKUs, row 442.
Row 169: identical to sheet All SKUs, row 443.
Row 170: identical to sheet All SKUs, row 444.
Row 171: identical to sheet All SKUs, row 445.
Row 172: identical to sheet All SKUs, row 446.
Row 173: identical to sheet All SKUs, row 447.
Row 174: identical to sheet All SKUs, row 448.
Row 175: identical to sheet All SKUs, row 449.
Row 176: identical to sheet All SKUs, row 450.
Row 177: identical to sheet All SKUs, row 451.
Row 178: identical to sheet All SKUs, row 452.
Row 179: identical to sheet All SKUs, row 453.
Row 180: identical to sheet All SKUs, row 454.
Row 181: identical to sheet All SKUs, row 455.
Row 182: identical to sheet All SKUs, row 456.
Row 183: identical to sheet All SKUs, row 457.
Row 184: identical to sheet All SKUs, row 458.
Row 185: identical to sheet All SKUs, row 459.
Row 186: identical to sheet All SKUs, row 460.
Row 187: identical to sheet All SKUs, row 461.
Row 188: identical to sheet All SKUs, row 462.
Row 189: identical to sheet All SKUs, row 463.
Row 190: identical to sheet All SKUs, row 464.
Row 191: identical to sheet All SKUs, row 465.
Row 192: identical to sheet All SKUs, row 466.
Row 193: identical to sheet All SKUs, row 467.
Row 194: identical to sheet All SKUs, row 468.
Row 195: identical to sheet All SKUs, row 469.
Row 196: identical to sheet All SKUs, row 470.
Row 197: identical to sheet All SKUs, row 471.
Row 198: identical to sheet All SKUs, row 472.
Row 199: identical to sheet All SKUs, row 473.
Row 200: identical to sheet All SKUs, row 474.
Row 201: identical to sheet All SKUs, row 475.
Row 202: identical to sheet All SKUs, row 476.
Row 203: identical to sheet All SKUs, row 477.
Row 204: identical to sheet All SKUs, row 478.
Row 205: identical to sheet All SKUs, row 479.
Row 206: identical to sheet All SKUs, row 480.
Row 207: identical to sheet All SKUs, row 481.
Row 208: identical to sheet All SKUs, row 482.
Row 209: identical to sheet All SKUs, row 483.
Row 210: identical to sheet All SKUs, row 484.
Row 211: identical to sheet All SKUs, row 485.
Row 212: identical to sheet All SKUs, row 486.
Row 213: identical to sheet All SKUs, row 487.
Row 214: identical to sheet All SKUs, row 488.
Row 215: identical to sheet All SKUs, row 489.
Row 216: identical to sheet All SKUs, row 490.
Row 217: identical to sheet All SKUs, row 491.
Row 218: identical to sheet All SKUs, row 492.
Row 219: identical to sheet All SKUs, row 493.
Row 220: identical to sheet All SKUs, row 494.
Row 221: identical to sheet All SKUs, row 495.
Row 222: identical to sheet All SKUs, row 496.
Row 223: identical to sheet All SKUs, row 497.
Row 224: identical to sheet All SKUs, row 498.
Row 225: identical to sheet All SKUs, row 499.
Row 226: identical to sheet All SKUs, row 500.
Row 227: identical to sheet All SKUs, row 501.
Row 228: identical to sheet All SKUs, row 502.
Row 229: identical to sheet All SKUs, row 503.
Row 230: identical to sheet All SKUs, row 504.
Row 231: identical to sheet All SKUs, row 505.
Row 232: identical to sheet All SKUs, row 506.
Row 233: identical to sheet All SKUs, row 507.
Row 234: identical to sheet All SKUs, row 508.
Row 235: identical to sheet All SKUs, row 509.
Row 236: identical to sheet All SKUs, row 510.
Row 237: identical to sheet All SKUs, row 511.
Row 238: identical to sheet All SKUs, row 512.
Row 239: identical to sheet All SKUs, row 513.
Row 240: identical to sheet All SKUs, row 514.
Row 241: identical to sheet All SKUs, row 515.
Row 242: identical to sheet All SKUs, row 516.
Row 243: identical to sheet All SKUs, row 517.
Row 244: identical to sheet All SKUs, row 518.
Row 245: identical to sheet All SKUs, row 519.
Row 246: identical to sheet All SKUs, row 520.
Row 247: identical to sheet All SKUs, row 521.
Row 248: identical to sheet All SKUs, row 522.
Row 249: identical to sheet All SKUs, row 523.
Row 250: identical to sheet All SKUs, row 524.
Row 251: identical to sheet All SKUs, row 525.
Row 252: identical to sheet All SKUs, row 526.
Row 253: identical to sheet All SKUs, row 527.
Row 254: identical to sheet All SKUs, row 528.
Row 255: identical to sheet All SKUs, row 529.
Row 256: identical to sheet All SKUs, row 530.
Row 257: identical to sheet All SKUs, row 531.
Row 258: identical to sheet All SKUs, row 532.
Row 259: identical to sheet All SKUs, row 533.
Row 260: identical to sheet All SKUs, row 534.
Row 261: identical to sheet All SKUs, row 535.
Row 262: identical to sheet All SKUs, row 536.
Row 263: identical to sheet All SKUs, row 537.
Row 264: identical to sheet All SKUs, row 538.
Row 265: identical to sheet All SKUs, row 539.
Row 266: identical to sheet All SKUs, row 540.
Row 267: identical to sheet All SKUs, row 541.
Row 268: identical to sheet All SKUs, row 542.
Row 269: identical to sheet All SKUs, row 543.

### Support Services

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |
| 2 | Support Services | Ambient Temperature | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Support Services &gt; Ambient Temperature | Service &amp; Support | max 2 | 0 | 2 | Selection constraint for Ambient Temperature: max 2 | P72891-B21 | Standard | HPE ProLiant DL145 Gen11 High Temperature Support FIO Configuration | 0 | $1.00 |  |  | NA |  | No | Available | 1 | 1 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 10/31/2099 | [TEXT_7] |
| 3 | Support Services | Ambient Temperature | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Support Services &gt; Ambient Temperature | Service &amp; Support | max 2 | 0 | 2 | Selection constraint for Ambient Temperature: max 2 | P73015-B21 | Standard | HPE ProLiant DL145 Gen11 5C-35C/41F-95F Degrees Operational Temperature FIO Configuration | 0 | $1.00 |  |  | NA |  | No | Available | 1 | 1 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/07/2025 | 10/31/2099 | [TEXT_7] |
| 4 | Support Services | Ambient Temperature | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Support Services &gt; Ambient Temperature | Service &amp; Support | max 2 | 0 | 2 | Selection constraint for Ambient Temperature: max 2 | P73018-B21 | Standard | HPE ProLiant DL145 Gen11 -5C-40C/23F-104F Degrees Operational Temperature FIO Configuration | 0 | $1.00 |  |  | NA |  | No | Available | 1 | 1 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 10/31/2099 | [TEXT_7] |
| 5 | Support Services | Ambient Temperature | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Support Services &gt; Ambient Temperature | Service &amp; Support | max 2 | 0 | 2 | Selection constraint for Ambient Temperature: max 2 | P73021-B21 | Standard | HPE ProLiant DL145 Gen11 -5C-45C/23F - 113F Degrees Operational Temperature FIO Configuration | 0 | $1.00 |  |  | NA |  | No | Available | 1 | 1 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 10/31/2099 | [TEXT_7] |
| 6 | Support Services | Ambient Temperature | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Support Services &gt; Ambient Temperature | Service &amp; Support | max 2 | 0 | 2 | Selection constraint for Ambient Temperature: max 2 | P73024-B21 | Standard | HPE ProLiant DL145 Gen11 -5C-50C/23F-122F Degrees Operational Temperature FIO Configuration | 0 | $1.00 |  |  | NA |  | No | Available | 1 | 1 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 10/31/2099 | [TEXT_7] |
| 7 | Support Services | Ambient Temperature | HPE OCA &gt; DL145 Gen11 [P71964-B21] &gt; Support Services &gt; Ambient Temperature | Service &amp; Support | max 2 | 0 | 2 | Selection constraint for Ambient Temperature: max 2 | P73027-B21 | Standard | HPE ProLiant DL145 Gen11 -5C-55C/23F-131F Degrees Operational Temperature FIO Configuration | 0 | $1.00 |  |  | NA |  | No | Available | 1 | 1 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/03/2024 | 10/31/2099 | [TEXT_7] |


### Processor

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

### Memory

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 29.
Row 3: identical to sheet All SKUs, row 30.
Row 4: identical to sheet All SKUs, row 31.
Row 5: identical to sheet All SKUs, row 32.
Row 6: identical to sheet All SKUs, row 33.
Row 7: identical to sheet All SKUs, row 34.
Row 8: identical to sheet All SKUs, row 35.
Row 9: identical to sheet All SKUs, row 36.
Row 10: identical to sheet All SKUs, row 37.
Row 11: identical to sheet All SKUs, row 38.
Row 12: identical to sheet All SKUs, row 39.
Row 13: identical to sheet All SKUs, row 40.
Row 14: identical to sheet All SKUs, row 41.
Row 15: identical to sheet All SKUs, row 42.
Row 16: identical to sheet All SKUs, row 43.
Row 17: identical to sheet All SKUs, row 44.
Row 18: identical to sheet All SKUs, row 45.
Row 19: identical to sheet All SKUs, row 46.
Row 20: identical to sheet All SKUs, row 47.
Row 21: identical to sheet All SKUs, row 48.

### Networking

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 216.
Row 3: identical to sheet All SKUs, row 217.
Row 4: identical to sheet All SKUs, row 218.
Row 5: identical to sheet All SKUs, row 219.
Row 6: identical to sheet All SKUs, row 220.
Row 7: identical to sheet All SKUs, row 221.
Row 8: identical to sheet All SKUs, row 222.
Row 9: identical to sheet All SKUs, row 223.
Row 10: identical to sheet All SKUs, row 224.
Row 11: identical to sheet All SKUs, row 225.
Row 12: identical to sheet All SKUs, row 226.
Row 13: identical to sheet All SKUs, row 227.
Row 14: identical to sheet All SKUs, row 228.
Row 15: identical to sheet All SKUs, row 229.
Row 16: identical to sheet All SKUs, row 230.
Row 17: identical to sheet All SKUs, row 231.
Row 18: identical to sheet All SKUs, row 232.
Row 19: identical to sheet All SKUs, row 233.
Row 20: identical to sheet All SKUs, row 234.
Row 21: identical to sheet All SKUs, row 235.
Row 22: identical to sheet All SKUs, row 236.
Row 23: identical to sheet All SKUs, row 237.

### Power Supplies

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 260.

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
Row 3: identical to sheet All SKUs, row 4.
Row 4: identical to sheet All SKUs, row 5.
Row 5: identical to sheet All SKUs, row 6.
Row 6: identical to sheet All SKUs, row 212.

### Cooling  Thermal

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 7.
Row 3: identical to sheet All SKUs, row 28.
Row 4: identical to sheet All SKUs, row 211.
Row 5: identical to sheet All SKUs, row 259.
Row 6: identical to sheet All SKUs, row 261.
Row 7: identical to sheet All SKUs, row 262.

### Rack Options

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 8.

### Storage Controllers

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 49.
Row 3: identical to sheet All SKUs, row 50.
Row 4: identical to sheet All SKUs, row 51.
Row 5: identical to sheet All SKUs, row 52.
Row 6: identical to sheet All SKUs, row 53.
Row 7: identical to sheet All SKUs, row 54.
Row 8: identical to sheet All SKUs, row 55.
Row 9: identical to sheet All SKUs, row 56.
Row 10: identical to sheet All SKUs, row 57.
Row 11: identical to sheet All SKUs, row 58.
Row 12: identical to sheet All SKUs, row 59.
Row 13: identical to sheet All SKUs, row 60.
Row 14: identical to sheet All SKUs, row 61.
Row 15: identical to sheet All SKUs, row 62.
Row 16: identical to sheet All SKUs, row 63.
Row 17: identical to sheet All SKUs, row 64.

### Drive Enclosures  Drives

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 65.
Row 3: identical to sheet All SKUs, row 66.
Row 4: identical to sheet All SKUs, row 67.
Row 5: identical to sheet All SKUs, row 68.
Row 6: identical to sheet All SKUs, row 69.
Row 7: identical to sheet All SKUs, row 70.
Row 8: identical to sheet All SKUs, row 71.
Row 9: identical to sheet All SKUs, row 72.
Row 10: identical to sheet All SKUs, row 73.
Row 11: identical to sheet All SKUs, row 74.
Row 12: identical to sheet All SKUs, row 75.
Row 13: identical to sheet All SKUs, row 76.
Row 14: identical to sheet All SKUs, row 77.
Row 15: identical to sheet All SKUs, row 78.
Row 16: identical to sheet All SKUs, row 79.
Row 17: identical to sheet All SKUs, row 80.
Row 18: identical to sheet All SKUs, row 81.
Row 19: identical to sheet All SKUs, row 82.
Row 20: identical to sheet All SKUs, row 83.
Row 21: identical to sheet All SKUs, row 84.
Row 22: identical to sheet All SKUs, row 85.
Row 23: identical to sheet All SKUs, row 86.
Row 24: identical to sheet All SKUs, row 87.
Row 25: identical to sheet All SKUs, row 88.
Row 26: identical to sheet All SKUs, row 89.
Row 27: identical to sheet All SKUs, row 90.
Row 28: identical to sheet All SKUs, row 91.
Row 29: identical to sheet All SKUs, row 92.
Row 30: identical to sheet All SKUs, row 93.
Row 31: identical to sheet All SKUs, row 94.
Row 32: identical to sheet All SKUs, row 95.
Row 33: identical to sheet All SKUs, row 96.
Row 34: identical to sheet All SKUs, row 97.
Row 35: identical to sheet All SKUs, row 98.
Row 36: identical to sheet All SKUs, row 99.
Row 37: identical to sheet All SKUs, row 100.
Row 38: identical to sheet All SKUs, row 101.
Row 39: identical to sheet All SKUs, row 102.
Row 40: identical to sheet All SKUs, row 103.
Row 41: identical to sheet All SKUs, row 104.
Row 42: identical to sheet All SKUs, row 105.
Row 43: identical to sheet All SKUs, row 106.
Row 44: identical to sheet All SKUs, row 107.
Row 45: identical to sheet All SKUs, row 108.
Row 46: identical to sheet All SKUs, row 109.
Row 47: identical to sheet All SKUs, row 110.
Row 48: identical to sheet All SKUs, row 111.
Row 49: identical to sheet All SKUs, row 112.
Row 50: identical to sheet All SKUs, row 113.
Row 51: identical to sheet All SKUs, row 114.
Row 52: identical to sheet All SKUs, row 115.
Row 53: identical to sheet All SKUs, row 116.
Row 54: identical to sheet All SKUs, row 117.
Row 55: identical to sheet All SKUs, row 118.
Row 56: identical to sheet All SKUs, row 119.
Row 57: identical to sheet All SKUs, row 120.
Row 58: identical to sheet All SKUs, row 121.
Row 59: identical to sheet All SKUs, row 122.
Row 60: identical to sheet All SKUs, row 123.
Row 61: identical to sheet All SKUs, row 124.
Row 62: identical to sheet All SKUs, row 125.
Row 63: identical to sheet All SKUs, row 126.
Row 64: identical to sheet All SKUs, row 127.
Row 65: identical to sheet All SKUs, row 128.
Row 66: identical to sheet All SKUs, row 129.
Row 67: identical to sheet All SKUs, row 130.
Row 68: identical to sheet All SKUs, row 131.
Row 69: identical to sheet All SKUs, row 132.
Row 70: identical to sheet All SKUs, row 133.
Row 71: identical to sheet All SKUs, row 134.
Row 72: identical to sheet All SKUs, row 135.
Row 73: identical to sheet All SKUs, row 136.
Row 74: identical to sheet All SKUs, row 137.
Row 75: identical to sheet All SKUs, row 138.
Row 76: identical to sheet All SKUs, row 139.
Row 77: identical to sheet All SKUs, row 140.
Row 78: identical to sheet All SKUs, row 141.
Row 79: identical to sheet All SKUs, row 142.
Row 80: identical to sheet All SKUs, row 143.
Row 81: identical to sheet All SKUs, row 144.
Row 82: identical to sheet All SKUs, row 145.
Row 83: identical to sheet All SKUs, row 146.
Row 84: identical to sheet All SKUs, row 147.
Row 85: identical to sheet All SKUs, row 148.
Row 86: identical to sheet All SKUs, row 149.
Row 87: identical to sheet All SKUs, row 150.
Row 88: identical to sheet All SKUs, row 151.
Row 89: identical to sheet All SKUs, row 152.
Row 90: identical to sheet All SKUs, row 153.
Row 91: identical to sheet All SKUs, row 154.
Row 92: identical to sheet All SKUs, row 73.
Row 93: identical to sheet All SKUs, row 74.
Row 94: identical to sheet All SKUs, row 76.
Row 95: identical to sheet All SKUs, row 78.
Row 96: identical to sheet All SKUs, row 79.
Row 97: identical to sheet All SKUs, row 80.
Row 98: identical to sheet All SKUs, row 84.
Row 99: identical to sheet All SKUs, row 85.
Row 100: identical to sheet All SKUs, row 86.
Row 101: identical to sheet All SKUs, row 87.
Row 102: identical to sheet All SKUs, row 93.
Row 103: identical to sheet All SKUs, row 94.
Row 104: identical to sheet All SKUs, row 109.
Row 105: identical to sheet All SKUs, row 117.
Row 106: identical to sheet All SKUs, row 118.
Row 107: identical to sheet All SKUs, row 119.
Row 108: identical to sheet All SKUs, row 123.
Row 109: identical to sheet All SKUs, row 124.
Row 110: identical to sheet All SKUs, row 129.
Row 111: identical to sheet All SKUs, row 130.
Row 112: identical to sheet All SKUs, row 131.
Row 113: identical to sheet All SKUs, row 139.
Row 114: identical to sheet All SKUs, row 140.
Row 115: identical to sheet All SKUs, row 141.
Row 116: identical to sheet All SKUs, row 72.
Row 117: identical to sheet All SKUs, row 77.
Row 118: identical to sheet All SKUs, row 81.
Row 119: identical to sheet All SKUs, row 82.
Row 120: identical to sheet All SKUs, row 83.
Row 121: identical to sheet All SKUs, row 88.
Row 122: identical to sheet All SKUs, row 90.
Row 123: identical to sheet All SKUs, row 92.
Row 124: identical to sheet All SKUs, row 95.
Row 125: identical to sheet All SKUs, row 96.
Row 126: identical to sheet All SKUs, row 104.
Row 127: identical to sheet All SKUs, row 105.
Row 128: identical to sheet All SKUs, row 110.
Row 129: identical to sheet All SKUs, row 111.
Row 130: identical to sheet All SKUs, row 112.
Row 131: identical to sheet All SKUs, row 114.
Row 132: identical to sheet All SKUs, row 120.
Row 133: identical to sheet All SKUs, row 121.
Row 134: identical to sheet All SKUs, row 122.
Row 135: identical to sheet All SKUs, row 125.
Row 136: identical to sheet All SKUs, row 128.
Row 137: identical to sheet All SKUs, row 132.
Row 138: identical to sheet All SKUs, row 133.
Row 139: identical to sheet All SKUs, row 134.
Row 140: identical to sheet All SKUs, row 135.
Row 141: identical to sheet All SKUs, row 136.
Row 142: identical to sheet All SKUs, row 142.
Row 143: identical to sheet All SKUs, row 143.
Row 144: identical to sheet All SKUs, row 144.
Row 145: identical to sheet All SKUs, row 145.
Row 146: identical to sheet All SKUs, row 146.

### Factory Configuration Settings

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 210.

### PCIe Risers

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 214.
Row 3: identical to sheet All SKUs, row 215.

### Cables &amp; Enablement Kits

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 250.
Row 3: identical to sheet All SKUs, row 251.
Row 4: identical to sheet All SKUs, row 252.
Row 5: identical to sheet All SKUs, row 253.
Row 6: identical to sheet All SKUs, row 263.
Row 7: identical to sheet All SKUs, row 264.
Row 8: identical to sheet All SKUs, row 265.
Row 9: identical to sheet All SKUs, row 266.
Row 10: identical to sheet All SKUs, row 267.
Row 11: identical to sheet All SKUs, row 268.
Row 12: identical to sheet All SKUs, row 269.
Row 13: identical to sheet All SKUs, row 270.
Row 14: identical to sheet All SKUs, row 271.
Row 15: identical to sheet All SKUs, row 272.
Row 16: identical to sheet All SKUs, row 273.
Row 17: identical to sheet All SKUs, row 274.
Row 18: identical to sheet All SKUs, row 275.
Row 19: identical to sheet All SKUs, row 276.
Row 20: identical to sheet All SKUs, row 277.
Row 21: identical to sheet All SKUs, row 278.
Row 22: identical to sheet All SKUs, row 279.
Row 23: identical to sheet All SKUs, row 280.
Row 24: identical to sheet All SKUs, row 281.
Row 25: identical to sheet All SKUs, row 282.
Row 26: identical to sheet All SKUs, row 283.
Row 27: identical to sheet All SKUs, row 287.
Row 28: identical to sheet All SKUs, row 288.

### Graphics &amp; GPU

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 254.
Row 3: identical to sheet All SKUs, row 255.
Row 4: identical to sheet All SKUs, row 256.
Row 5: identical to sheet All SKUs, row 257.
Row 6: identical to sheet All SKUs, row 258.

### Security Options

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 284.
Row 3: identical to sheet All SKUs, row 285.
Row 4: identical to sheet All SKUs, row 286.

### Discontinued SKUs

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Product # | Description | Main Category | Sub-Category | Status | First Seen Date | Discontinued Date | Reinstated Date | Days Active | Last Known Price | Full Price Trail | Tracking State | Retention Class | Business Relevant | Reason |
| 2 | P22020-B21 | HPE DL38X Gen10 Plus 2U Cable Management Arm for Rail Kit | Accessories &amp; Infrastructure | Chassis Infrastructure &amp; Rail Kits | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 3 | P52349-B21 | HPE Easy Install Rail 1 Kit | Accessories &amp; Infrastructure | Chassis Infrastructure &amp; Rail Kits | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 4 | P72008-B21 | HPE ProLiant DL145 Gen11 Rack Enablement Kit | Accessories &amp; Infrastructure | Chassis Infrastructure &amp; Rail Kits | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 5 | P78764-B21 | HPE ProLiant DL145 Gen11 2-post Rail Kit | Accessories &amp; Infrastructure | Chassis Infrastructure &amp; Rail Kits | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 6 | P72006-B21 | HPE ProLiant DL145 Gen11 Desk/Wall Mounting Kit | Accessories &amp; Infrastructure | System Options | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 7 | P73006-B21 | HPE ProLiant DL145 Gen11 Optimised Acoustics FIO Configuration | Accessories &amp; Infrastructure | System Options | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 8 | P72891-B21 | HPE ProLiant DL145 Gen11 High Temperature Support FIO Configuration | Accessories &amp; Infrastructure | System Options | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 9 | P73015-B21 | HPE ProLiant DL145 Gen11 5C-35C/41F-95F Degrees Operational Temperature FIO Configuration | Accessories &amp; Infrastructure | System Options | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 10 | P73018-B21 | HPE ProLiant DL145 Gen11 -5C-40C/23F-104F Degrees Operational Temperature FIO Configuration | Accessories &amp; Infrastructure | System Options | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 11 | P73021-B21 | HPE ProLiant DL145 Gen11 -5C-45C/23F - 113F Degrees Operational Temperature FIO Configuration | Accessories &amp; Infrastructure | System Options | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 12 | P73024-B21 | HPE ProLiant DL145 Gen11 -5C-50C/23F-122F Degrees Operational Temperature FIO Configuration | Accessories &amp; Infrastructure | System Options | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 13 | P73027-B21 | HPE ProLiant DL145 Gen11 -5C-55C/23F-131F Degrees Operational Temperature FIO Configuration | Accessories &amp; Infrastructure | System Options | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 14 | P69259-B21 | AMD EPYC 8124P 2.45GHz 16-core 125W Processor for HPE | Processor | Intel Xeon 6th Gen Scalable Processors | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 15 | P69262-B21 | AMD EPYC 8434P 2.5GHz 48-core 200W Processor for HPE | Processor | Intel Xeon 6th Gen Scalable Processors | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 16 | P69263-B21 | AMD EPYC 8534P 2.3GHz 64-core 200W Processor for HPE | Processor | Intel Xeon 6th Gen Scalable Processors | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 17 | P71859-B21 | AMD EPYC 8024PN 2.05GHz 8-core 80W Processor for HPE | Processor | Intel Xeon 6th Gen Scalable Processors | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 18 | P71862-B21 | AMD EPYC 8124PN 2.0GHz 16-core 100W Processor for HPE | Processor | Intel Xeon 6th Gen Scalable Processors | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 19 | P71871-B21 | AMD EPYC 8434PN 2.0GHz 48-core 155W Processor for HPE | Processor | Intel Xeon 6th Gen Scalable Processors | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 20 | P71874-B21 | AMD EPYC 8534PN 2.0GHz 64-core 175W Processor for HPE | Processor | Intel Xeon 6th Gen Scalable Processors | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 21 | P88840-B21 | AMD EPYC 8635P 1.6GHz 84-core 225W Processor for HPE | Processor | Intel Xeon 6th Gen Scalable Processors | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 22 | P88842-B21 | AMD EPYC 8535P 2.0GHz 64-core 210W Processor for HPE | Processor | Intel Xeon 6th Gen Scalable Processors | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 23 | P88850-B21 | AMD EPYC 8125P 2.65GHz 16-core 125W Processor for HPE | Processor | Intel Xeon 6th Gen Scalable Processors | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 24 | P69258-B21 | AMD EPYC 8024P 2.4GHz 8-core 90W Processor for HPE | Processor | Intel Xeon 6th Gen Scalable Processors | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 25 | P69260-B21 | AMD EPYC 8224P 2.55GHz 24-core 160W Processor for HPE | Processor | Intel Xeon 6th Gen Scalable Processors | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 26 | P69261-B21 | AMD EPYC 8324P 2.65GHz 32-core 180W Processor for HPE | Processor | Intel Xeon 6th Gen Scalable Processors | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 27 | P71865-B21 | AMD EPYC 8224PN 2.0GHz 24-core 120W Processor for HPE | Processor | Intel Xeon 6th Gen Scalable Processors | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 28 | P71868-B21 | AMD EPYC 8324PN 2.05GHz 32-core 130W Processor for HPE | Processor | Intel Xeon 6th Gen Scalable Processors | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 29 | P88844-B21 | AMD EPYC 8435P 2.45GHz 48-core 200W Processor for HPE | Processor | Intel Xeon 6th Gen Scalable Processors | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 30 | P88846-B21 | AMD EPYC 8325P 2.7GHz 32-core 175W Processor for HPE | Processor | Intel Xeon 6th Gen Scalable Processors | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 31 | P88848-B21 | AMD EPYC 8225P 2.95GHz 24-core 160W Processor for HPE | Processor | Intel Xeon 6th Gen Scalable Processors | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 32 | P88852-B21 | AMD EPYC 8025P 2.9GHz 8-core 95W Processor for HPE | Processor | Intel Xeon 6th Gen Scalable Processors | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 33 | P72580-B21 | HPE ProLiant DL145 Gen11 1U Heat Sink Kit | Cooling / Thermal | Standard &amp; Performance Heat Sinks | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 34 | P50311-F21 | HPE 32GB (1x32GB) Dual Rank x8 DDR5-4800 CAS-40-39-39 EC8 Registered Smart FIO Memory Kit | Memory | DDR5 Registered Smart Memory | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 35 | P50312-F21 | HPE 64GB (1x64GB) Dual Rank x4 DDR5-4800 CAS-40-39-39 EC8 Registered Smart FIO Memory Kit | Memory | DDR5 Registered Smart Memory | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 36 | P64986-F21 | HPE 64GB (1x64GB) Dual Rank x4 DDR5-6400 CAS-52-52-52 EC8 Registered Smart FIO Memory Kit | Memory | DDR5 Registered Smart Memory | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 37 | P50309-F21 | HPE 16GB (1x16GB) Single Rank x8 DDR5-4800 CAS-40-39-39 EC8 Registered Smart FIO Memory Kit | Memory | DDR5 Registered Smart Memory | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 38 | P64985-F21 | HPE 32GB (1x32GB) Dual Rank x8 DDR5-6400 CAS-52-52-52 EC8 Registered Smart FIO Memory Kit | Memory | DDR5 Registered Smart Memory | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 39 | P64987-F21 | HPE 96GB (1x96GB) Dual Rank x4 DDR5-6400 CAS-52-52-52 EC8 Registered Smart FIO Memory Kit | Memory | DDR5 Registered Smart Memory | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 40 | P64988-F21 | HPE 128GB (1x128GB) Dual Rank x4 DDR5-6400 CAS-52-52-52 EC8 Registered Smart FIO Memory Kit | Memory | DDR5 Registered Smart Memory | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 41 | P66676-F21 | HPE 96GB (1x96GB) Dual Rank x4 DDR5-4800 CAS-46-45-45 EC8 Registered Smart FIO Memory Kit | Memory | DDR5 Registered Smart Memory | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 42 | P69982-F21 | HPE 128GB (1x128GB) Dual Rank x4 DDR5-4800 CAS-46-45-45 EC8 Registered Smart FIO Memory Kit | Memory | DDR5 Registered Smart Memory | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 43 | P50309-B21 | HPE 16GB (1x16GB) Single Rank x8 DDR5-4800 CAS-40-39-39 EC8 Registered Smart Memory Kit | Memory | DDR5 Registered Smart Memory | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 44 | P50311-B21 | HPE 32GB (1x32GB) Dual Rank x8 DDR5-4800 CAS-40-39-39 EC8 Registered Smart Memory Kit | Memory | DDR5 Registered Smart Memory | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 45 | P50312-B21 | HPE 64GB (1x64GB) Dual Rank x4 DDR5-4800 CAS-40-39-39 EC8 Registered Smart Memory Kit | Memory | DDR5 Registered Smart Memory | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 46 | P64984-B21 | HPE 16GB (1x16GB) Single Rank x8 DDR5-6400 CAS-52-52-52 EC8 Registered Smart Memory Kit | Memory | DDR5 Registered Smart Memory | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 47 | P64984-F21 | HPE 16GB (1x16GB) Single Rank x8 DDR5-6400 CAS-52-52-52 EC8 Registered Smart FIO Memory Kit | Memory | DDR5 Registered Smart Memory | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 48 | P64985-B21 | HPE 32GB (1x32GB) Dual Rank x8 DDR5-6400 CAS-52-52-52 EC8 Registered Smart Memory Kit | Memory | DDR5 Registered Smart Memory | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 49 | P64986-B21 | HPE 64GB (1x64GB) Dual Rank x4 DDR5-6400 CAS-52-52-52 EC8 Registered Smart Memory Kit | Memory | DDR5 Registered Smart Memory | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 50 | P64987-B21 | HPE 96GB (1x96GB) Dual Rank x4 DDR5-6400 CAS-52-52-52 EC8 Registered Smart Memory Kit | Memory | DDR5 Registered Smart Memory | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 51 | P64988-B21 | HPE 128GB (1x128GB) Dual Rank x4 DDR5-6400 CAS-52-52-52 EC8 Registered Smart Memory Kit | Memory | DDR5 Registered Smart Memory | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 52 | P66676-B21 | HPE 96GB (1x96GB) Dual Rank x4 DDR5-4800 CAS-46-45-45 EC8 Registered Smart Memory Kit | Memory | DDR5 Registered Smart Memory | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 53 | P69982-B21 | HPE 128GB (1x128GB) Dual Rank x4 DDR5-4800 CAS-40-39-39 EC8 Registered Smart Memory Kit | Memory | DDR5 Registered Smart Memory | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 54 | P47777-B21 | HPE MR416i-p Gen11 x16 Lanes 8GB Cache PCI SPDM Plug-in Storage Controller | Storage Controllers | Tri-Mode MegaRAID Storage Controllers | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 55 | P47785-B21 | HPE MR216i-p Gen11 x16 Lanes without Cache PCI SPDM Plug-in Storage Controller | Storage Controllers | Tri-Mode MegaRAID Storage Controllers | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 56 | 804398-B21 | HPE Smart Array E208e-p SR Gen10 (8 External Lanes/No Cache) 12G SAS PCIe Plug-in Controller | Storage Controllers | Tri-Mode MegaRAID Storage Controllers | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 57 | P58335-B21 | HPE MR408i-o Gen11 x8 Lanes 4GB Cache OCP SPDM Storage Controller | Storage Controllers | Tri-Mode MegaRAID Storage Controllers | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 58 | P01366-B21 | HPE 96W Smart Storage Lithium-ion Battery with 145mm Cable Kit | Cables &amp; Enablement Kits | Smart Storage Batteries | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 59 | P02377-B21 | HPE Smart Storage Hybrid Capacitor with 145mm Cable Kit | Cables &amp; Enablement Kits | Smart Storage Batteries | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 60 | P65038-B21 | HPE 16W Smart Hybrid Capacitor with 145mm Cable | Cables &amp; Enablement Kits | Smart Storage Batteries | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 61 | P72000-B21 | HPE ProLiant DL145 Gen11 MR216i-p 2SFF Storage Controller Cable Kit | Storage Controllers | Tri-Mode MegaRAID Storage Controllers | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 62 | P72002-B21 | HPE ProLiant DL145 Gen11 MR408i-o 4EDSFF Storage Controller Cable Kit | Storage Controllers | Tri-Mode MegaRAID Storage Controllers | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 63 | P73003-B21 | HPE ProLiant DL145 Gen11 MR216i-p/MR416i-p 4EDSFF Storage Controller Cable Kit | Storage Controllers | Tri-Mode MegaRAID Storage Controllers | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 64 | 339777-B21 | HPE RAID 0 Drive 1 FIO Setting | Accessories &amp; Infrastructure | System Options | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 65 | 339778-B21 | HPE RAID 1 Drive 1 FIO Setting | Accessories &amp; Infrastructure | System Options | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 66 | 339779-B21 | HPE RAID 5 Drive 1 FIO Setting | Accessories &amp; Infrastructure | System Options | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 67 | 339780-B21 | HPE Raid 5 w/SP Drive 1 FIO Setting | Accessories &amp; Infrastructure | System Options | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 68 | 339781-B21 | HPE RAID FIO Advanced Data Guarding Option | Accessories &amp; Infrastructure | System Options | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 69 | 389692-B21 | HPE Customer Defined RAID Setting Service | Accessories &amp; Infrastructure | System Options | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 70 | P71981-B21 | HPE ProLiant DL145 Gen11 6EDSFF Cable Kit | Storage Controllers | Tri-Mode MegaRAID Storage Controllers | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 71 | P72004-B21 | HPE ProLiant DL145 Gen11 MR216i-p/MR416i-p 6EDSFF Storage Controller Cable Kit | Storage Controllers | Tri-Mode MegaRAID Storage Controllers | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 72 | P71977-B21 | HPE ProLiant DL145 Gen11 2SFF Drive Cage Kit | Storage Controllers | Tri-Mode MegaRAID Storage Controllers | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 73 | P71985-B21 | HPE ProLiant DL145 Gen11 4EDSFF Drive Cage Kit | Storage Controllers | Tri-Mode MegaRAID Storage Controllers | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 74 | P57803-B21 | HPE 7.68TB NVMe Gen5 High Performance Read Intensive E3S EC1 EDSFF SPDM PM1743 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 75 | P61191-B21 | HPE 3.2TB NVMe Gen5 High Performance Mixed Use E3S EC1 EDSFF SPDM CM7 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 76 | P69237-B21 | HPE 3.84TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 CD8P SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 77 | P70669-B21 | HPE 3.2TB NVMe Gen5 High Performance Mixed Use E3S EC1 Self-encrypting FIPS 140-3 CM7 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 78 | P70672-B21 | HPE 6.4TB NVMe Gen5 High Performance Mixed Use E3S EC1 Self-encrypting FIPS 140-3 CM7 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 79 | P77265-B21 | HPE 3.2TB NVMe Gen5 Mainstream Performance Mixed Use E3S EC1 EDSFF SPDM PE1030 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 80 | P78787-B21 | HPE 6.4TB NVMe Gen5 High Performance Mixed Use E3.S EC1 PM1755 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 81 | P87719-B21 | HPE 1.92TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 Self-encrypting 7600 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 82 | P87721-B21 | HPE 3.84TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 Self-encrypting 7600 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 83 | P91084-B21 | HPE 1.6TB NVMe Gen5 Mainstream Performance Mixed Use E3.S EC1 E3 Thin Multi Vendor SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 84 | P91086-B21 | HPE 3.2TB NVMe Gen5 Mainstream Performance Mixed Use E3.S EC1 E3 Thin Multi Vendor SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 85 | P91088-B21 | HPE 6.4TB NVMe Gen5 Mainstream Performance Mixed Use E3.S EC1 E3 Thin Multi Vendor SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 86 | P91090-B21 | HPE 1.92TB NVMe Gen5 Mainstream Performance Read Intensive E3.S EC1 E3 Thin Multi Vendor SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 87 | P91092-B21 | HPE 3.84TB NVMe Gen5 Mainstream Performance Read Intensive E3.S EC1 E3 Thin Multi Vendor SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 88 | P91094-B21 | HPE 7.68TB NVMe Gen5 Mainstream Performance Read Intensive E3.S EC1 E3 Thin Multi Vendor SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 89 | P91096-B21 | HPE 15.36TB NVMe Gen5 Mainstream Performance Read Intensive E3.S EC1 E3 Thin Multi Vendor SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 90 | P91098-B21 | HPE 3.2TB NVMe Gen5 High Performance Mixed Use E3.S EC1 E3 Thin Multi Vendor SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 91 | P91100-B21 | HPE 6.4TB NVMe Gen5 High Performance Mixed Use E3.S EC1 E3 Thin Multi Vendor SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 92 | P91102-B21 | HPE 12.8TB NVMe Gen5 High Performance Mixed Use E3.S EC1 E3 Thin Multi Vendor SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 93 | P91229-B21 | HPE 3.84TB NVMe Gen5 High Performance Read Intensive E3.S EC1 E3 Thin Multi Vendor SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 94 | P91233-B21 | HPE 15.36TB NVMe Gen5 High Performance Read Intensive E3.S EC1 E3 Thin Multi Vendor SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 95 | P61179-B21 | HPE 3.84TB NVMe Gen5 High Performance Read Intensive E3S EC1 EDSFF SPDM CM7 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 96 | P61183-B21 | HPE 7.68TB NVMe Gen5 High Performance Read Intensive E3S EC1 EDSFF SPDM CM7 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 97 | P63930-B21 | HPE 3.84TB NVMe Gen4 Mainstream Performance Very Read Optimized E3S EC1 EDSFF P5430 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 98 | P63934-B21 | HPE 7.68TB NVMe Gen4 Mainstream Performance Very Read Optimized E3S EC1 EDSFF P5430 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 99 | P69234-B21 | HPE 1.92TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 CD8P SSD | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | DISCONTINUED | 2026-09-09 | 2026-11-20 |  | 72 | $19,743.00 | 2026-09-09: $19743.00 → 2026-09-10: $19743.00 [Δ Attr] → 2026-11-20: $19743.00 (✕ REMOVED) | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE | No | Vendor marked obsolete/EOL in portal |
| 100 | P69239-B21 | HPE 7.68TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 CD8P SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 101 | P70397-B21 | HPE 15.36TB NVMe Gen5 High Performance Read Intensive E3S EC1 PS1010 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 102 | P77053-B21 | HPE 6.4TB NVMe Gen5 High Performance Mixed Use E3S EC1 EDSFF SPDM 9550 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 103 | P77055-B21 | HPE 12.8TB NVMe Gen5 High Performance Mixed Use E3S EC1 EDSFF SPDM 9550 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 104 | P77059-B21 | HPE 7.68TB NVMe Gen5 High Performance Read Intensive E3S EC1 EDSFF SPDM 9550 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 105 | P77061-B21 | HPE 15.36TB NVMe Gen5 High Performance Read Intensive E3S EC1 EDSFF SPDM 9550 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 106 | P78914-B21 | HPE 1.92TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 EDSFF SPDM PM9D3a SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 107 | P78923-B21 | HPE 30.72TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 EDSFF SPDM PM9D3a SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 108 | P79122-B21 | HPE 15.36TB NVMe Gen5 High Performance Read Intensive E3S EC1 Self-encrypting FIPS 140-3 CM7 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 109 | P85128-B21 | HPE 15.36TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 SPDM 7600 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 110 | P85731-B21 | HPE 3.2TB NVMe Gen5 High Performance Mixed Use E3.S EC1 E3 Thin PQC27 CM9 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 111 | P57799-B21 | HPE 3.84TB NVMe Gen5 High Performance Read Intensive E3S EC1 EDSFF SPDM PM1743 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 112 | P61187-B21 | HPE 15.36TB NVMe Gen5 High Performance Read Intensive E3S EC1 EDSFF SPDM CM7 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 113 | P61195-B21 | HPE 6.4TB NVMe Gen5 High Performance Mixed Use E3S EC1 EDSFF SPDM CM7 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 114 | P63938-B21 | HPE 15.36TB NVMe Gen4 Mainstream Performance Very Read Optimized E3S EC1 EDSFF P5430 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 115 | P69241-B21 | HPE 1.6TB NVMe Gen5 Mainstream Performance Mixed Use E3S EC1 CD8P SSD | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | DISCONTINUED | 2026-09-09 | 2026-11-20 |  | 72 | $20,109.00 | 2026-09-09: $20109.00 → 2026-09-10: $20109.00 [Δ Attr] → 2026-11-20: $20109.00 (✕ REMOVED) | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE | No | Vendor marked obsolete/EOL in portal |
| 116 | P69243-B21 | HPE 3.2TB NVMe Gen5 Mainstream Performance Mixed Use E3S EC1 CD8P SSD | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | DISCONTINUED | 2026-09-09 | 2026-11-20 |  | 72 | $27,452.00 | 2026-09-09: $27452.00 → 2026-09-10: $27452.00 [Δ Attr] → 2026-11-20: $27452.00 (✕ REMOVED) | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE | No | Vendor marked obsolete/EOL in portal |
| 117 | P69245-B21 | HPE 6.4TB NVMe Gen5 Mainstream Performance Mixed Use E3S EC1 CD8P SSD | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | DISCONTINUED | 2026-09-09 | 2026-11-20 |  | 72 | $44,109.00 | 2026-09-09: $44109.00 → 2026-09-10: $44109.00 [Δ Attr] → 2026-11-20: $44109.00 (✕ REMOVED) | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE | No | Vendor marked obsolete/EOL in portal |
| 118 | P69546-B21 | HPE 15.36TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 CD8P SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 119 | P70392-B21 | HPE 3.84TB NVMe Gen5 High Performance Read Intensive E3S EC1 PS1010 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 120 | P70395-B21 | HPE 7.68TB NVMe Gen5 High Performance Read Intensive E3S EC1 PS1010 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 121 | P70399-B21 | HPE 3.2TB NVMe Gen5 High Performance Mixed Use E3S EC1 PS1030 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 122 | P70401-B21 | HPE 6.4TB NVMe Gen5 High Performance Mixed Use E3S EC1 PS1030 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 123 | P70403-B21 | HPE 12.8TB NVMe Gen5 High Performance Mixed Use E3S EC1 PS1030 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 124 | P70674-B21 | HPE 7.68TB NVMe Gen5 High Performance Read Intensive E3S EC1 Self-encrypting FIPS 140-3 CM7 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 125 | P77050-B21 | HPE 3.2TB NVMe Gen5 High Performance Mixed Use E3S EC1 EDSFF SPDM 9550 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 126 | P77057-B21 | HPE 3.84TB NVMe Gen5 High Performance Read Intensive E3S EC1 EDSFF SPDM 9550 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 127 | P77262-B21 | HPE 1.6TB NVMe Gen5 Mainstream Performance Mixed Use E3S EC1 EDSFF SPDM PE1030 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 128 | P77267-B21 | HPE 6.4TB NVMe Gen5 Mainstream Performance Mixed Use E3S EC1 EDSFF SPDM PE1030 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 129 | P77269-B21 | HPE 1.92TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 EDSFF SPDM PE1010 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 130 | P77271-B21 | HPE 3.84TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 EDSFF SPDM PE1010 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 131 | P77273-B21 | HPE 7.68TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 EDSFF SPDM PE1010 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 132 | P77275-B21 | HPE 15.36TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 EDSFF SPDM PE1010 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 133 | P78784-B21 | HPE 3.2TB NVMe Gen5 High Performance Mixed Use E3.S EC1 PM1755 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 134 | P78789-B21 | HPE 3.84TB NVMe Gen5 High Performance Read Intensive E3.S EC1 PM1753 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 135 | P78791-B21 | HPE 7.68TB NVMe Gen5 High Performance Read Intensive E3.S EC1 PM1753 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 136 | P78793-B21 | HPE 15.36TB NVMe Gen5 High Performance Read Intensive E3.S EC1 PM1753 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 137 | P78917-B21 | HPE 3.84TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 EDSFF SPDM PM9D3a SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 138 | P78919-B21 | HPE 7.68TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 EDSFF SPDM PM9D3a SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 139 | P78921-B21 | HPE 15.36TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 EDSFF SPDM PM9D3a SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 140 | P79065-B21 | HPE 30.72TB NVMe Gen4 Mainstream Performance Very Read Optimized E3S EC1 EDSFF P5430 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 141 | P79147-B21 | HPE 30.72TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 EDSFF Self-encrypting PM9D3a SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 142 | P79965-B21 | HPE 30.72TB NVMe Gen5 High Performance Read Intensive E3.S EC1 EDSFF SPDM 9550 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 143 | P85114-B21 | HPE 1.6TB NVMe Gen5 Mainstream Performance Mixed Use E3S EC1 SPDM 7600 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 144 | P85117-B21 | HPE 3.2TB NVMe Gen5 Mainstream Performance Mixed Use E3S EC1 SPDM 7600 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 145 | P85119-B21 | HPE 6.4TB NVMe Gen5 Mainstream Performance Mixed Use E3S EC1 SPDM 7600 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 146 | P85121-B21 | HPE 1.92TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 SPDM 7600 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 147 | P85124-B21 | HPE 3.84TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 SPDM 7600 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 148 | P85126-B21 | HPE 7.68TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 SPDM 7600 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 149 | P85733-B21 | HPE 6.4TB NVMe Gen5 High Performance Mixed Use E3.S EC1 E3 Thin PQC27 CM9 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 150 | P85735-B21 | HPE 12.8TB NVMe Gen5 High Performance Mixed Use E3.S EC1 E3 Thin PQC27 CM9 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 151 | P85739-B21 | HPE 3.84TB NVMe Gen5 High Performance Read Intensive E3.S EC1 E3 Thin PQC27 CM9 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 152 | P85741-B21 | HPE 7.68TB NVMe Gen5 High Performance Read Intensive E3.S EC1 E3 Thin PQC27 CM9 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 153 | P85743-B21 | HPE 15.36TB NVMe Gen5 High Performance Read Intensive E3.S EC1 E3 Thin PQC27 CM9 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 154 | P85745-B21 | HPE 30.72TB NVMe Gen5 High Performance Read Intensive E3.S EC1 E3 Thin PQC27 CM9 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 155 | P87715-B21 | HPE 1.6TB NVMe Gen5 Mainstream Performance Mixed Use E3.S EC1 Self-encrypting 7600 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 156 | P87717-B21 | HPE 3.2TB NVMe Gen5 Mainstream Performance Mixed Use E3.S EC1 Self-encrypting 7600 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 157 | P87723-B21 | HPE 7.68TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 Self-encrypting 7600 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 158 | P91231-B21 | HPE 7.68TB NVMe Gen5 High Performance Read Intensive E3.S EC1 E3 Thin Multi Vendor SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 159 | P79615-B21 | HPE 30.72TB NVMe Gen5 Mainstream Performance Very Read Optimized E3.S EC1 EDSFF 6550 SSD | Drive Enclosures / Drives | SFF Drive Cages &amp; Enablement | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 160 | P79618-B21 | HPE 61.44TB NVMe Gen5 Mainstream Performance Very Read Optimized E3.S EC1 EDSFF 6550 SSD | Drive Enclosures / Drives | SFF Drive Cages &amp; Enablement | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 161 | P79620-B21 | HPE 30.72TB NVMe Gen5 Mainstream Performance Very Read Optimized EC1 EDSFF Self-encrypting 6550 SSD | Drive Enclosures / Drives | SFF Drive Cages &amp; Enablement | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 162 | P79623-B21 | HPE 61.44TB NVMe Gen5 Mainstream Performance Very Read Optimized EC1 EDSFF Self-encrypting 6550 SSD | Drive Enclosures / Drives | SFF Drive Cages &amp; Enablement | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 163 | P86016-B21 | HPE 1.6TB NVMe Gen5 Mainstream Performance Mixed Use E3.S EC1 E3 Thin PQC27 CD9P SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 164 | P86018-B21 | HPE 3.2TB NVMe Gen5 Mainstream Performance Mixed Use E3.S EC1 E3 Thin PQC27 CD9P SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 165 | P86020-B21 | HPE 6.4TB NVMe Gen5 Mainstream Performance Mixed Use E3.S EC1 E3 Thin PQC27 CD9P SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 166 | P86024-B21 | HPE 1.92TB NVMe Gen5 Mainstream Performance Read Intensive E3.S EC1 E3 Thin PQC27 CD9P SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 167 | P86026-B21 | HPE ProLiant DL385 Gen11 with iLO GPU 550W Power Capping FIO Enablement Kit | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 168 | P86028-B21 | HPE ProLiant DL385 Gen11 with iLO GPU 450W Power Capping FIO Enablement Kit | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 169 | P86030-B21 | HPE 15.36TB NVMe Gen5 Mainstream Performance Read Intensive E3.S EC1 E3 Thin PQC27 CD9P SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 170 | P86032-B21 | HPE 30.72TB NVMe Gen5 Mainstream Performance Read Intensive E3.S EC1 E3 Thin PQC27 CD9P SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 171 | P86746-B21 | HPE 61.44TB NVMe Gen5 Mainstream Performance Very Read Optimized E3.S EC1 Self-encrypting 6600 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 172 | P86748-B21 | HPE 122.8TB NVMe Gen5 Mainstream Performance Very Read Optimized E3.S EC1 Self-encrypting 6600 SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 173 | P88535-B21 | HPE 1.6TB NVMe Gen5 Mainstream Performance Mixed Use E3.S EC1 PQC27 Self-encrypting CD9P SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 174 | P88537-B21 | HPE 3.2TB NVMe Gen5 Mainstream Performance Mixed Use E3.S EC1 PQC27 Self-encrypting CD9P SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 175 | P88539-B21 | HPE 3.84TB NVMe Gen5 Mainstream Performance Read Intensive E3.S EC1 PQC27 Self-encrypting CD9P SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 176 | P88541-B21 | HPE 7.68TB NVMe Gen5 Mainstream Performance Read Intensive E3.S EC1 PQC27 Self-encrypting CD9P SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 177 | P88543-B21 | HPE 15.36TB NVMe Gen5 Mainstream Performance Read Intensive E3.S EC1 PQC27 Self-encrypting CD9P SSD | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 178 | P73214-B21 | HPE ProLiant DL145 Gen11 Disabled External USB Port FIO System Setting | Accessories &amp; Infrastructure | System Options | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 179 | P35876-B21 | HPE CE Mark Removal FIO Enablement Kit | Accessories &amp; Infrastructure | System Options | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 180 | P63226-B21 | HPE ProLiant vSAN ReadyNode Express Storage Architecture FIO Tracking | Accessories &amp; Infrastructure | System Options | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 181 | P08040-B21 | HPE iLO Common Password FIO Setting | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 182 | P71989-B21 | HPE ProLiant DL145 Gen11 x16 FHFL PCIe Gen5 Slot 2 Riser Kit | PCIe Risers | PCIe Riser Kits | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 183 | P71991-B21 | HPE ProLiant DL145 Gen11 x16 FHFL PCIe Gen5 Slot 1 Riser Kit | PCIe Risers | PCIe Riser Kits | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 184 | P08443-B21 | Intel E810-XXVDA2 Ethernet 10/25Gb 2-port SFP28 Adapter for HPE | Networking | PCIe Networking Adapters | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 185 | P26253-B21 | Broadcom BCM57416 Ethernet 10Gb 2-port BASE-T Adapter for HPE | Networking | PCIe Networking Adapters | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 186 | P26259-B21 | Broadcom BCM57412 Ethernet 10Gb 2-port SFP+ Adapter for HPE | Networking | PCIe Networking Adapters | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 187 | P26262-B21 | Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 Adapter for HPE | Networking | PCIe Networking Adapters | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 188 | P42044-B21 | Mellanox MCX631102AS-ADAT Ethernet 10/25Gb 2-port SFP28 Adapter for HPE | Networking | PCIe Networking Adapters | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 189 | P51178-B21 | Broadcom BCM5719 Ethernet 1Gb 4-port BASE-T Adapter for HPE | Networking | PCIe Networking Adapters | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 190 | P08458-B21 | Intel E810-XXVDA4 Ethernet 10/25Gb 4-port SFP28 Adapter for HPE | Networking | PCIe Networking Adapters | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 191 | P26264-B21 | Broadcom BCM57504 Ethernet 10/25Gb 4-port SFP28 Adapter for HPE | Networking | PCIe Networking Adapters | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 192 | P51181-B21 | Broadcom BCM5719 Ethernet 1Gb 4-port BASE-T OCP3 Adapter for HPE | Networking | OCP3 Networking Adapters | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 193 | P10115-B21 | Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter for HPE | Networking | OCP3 Networking Adapters | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 194 | P42041-B21 | Mellanox MCX631432AS-ADAI Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter for HPE | Networking | OCP3 Networking Adapters | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 195 | P26256-B21 | Broadcom BCM57412 Ethernet 10Gb 2-port SFP+ OCP3 Adapter for HPE | Networking | OCP3 Networking Adapters | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 196 | P08449-B21 | Intel I350-T4 Ethernet 1Gb 4-port BASE-T OCP3 Adapter for HPE | Networking | OCP3 Networking Adapters | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 197 | P10097-B21 | Broadcom BCM57416 Ethernet 10Gb 2-port BASE-T OCP3 Adapter for HPE | Networking | OCP3 Networking Adapters | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 198 | P10106-B21 | Intel E810-XXVDA2 Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter for HPE | Networking | OCP3 Networking Adapters | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 199 | P26269-B21 | Broadcom BCM57504 Ethernet 10/25Gb 4-port SFP28 OCP3 Adapter for HPE | Networking | OCP3 Networking Adapters | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 200 | 453151-B21 | HPE BladeSystem c-Class Virtual Connect 1G SFP SX Transceiver | Drive Enclosures / Drives | Hard Disk Drives (SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 201 | 453154-B21 | HPE BladeSystem CClass Virtual Connect 1G SFP RJ45 Transceiver | Drive Enclosures / Drives | Hard Disk Drives (SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 202 | 455883-B21 | HPE BladeSystem c-Class 10Gb SFP+ SR Transceiver | Drive Enclosures / Drives | Hard Disk Drives (SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 203 | 455886-B21 | HPE BladeSystem c-Class 10Gb SFP+ LR Transceiver | Drive Enclosures / Drives | Hard Disk Drives (SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 204 | 845398-B21 | HPE 25Gb SFP28 SR 100m Transceiver | Drive Enclosures / Drives | Hard Disk Drives (SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 205 | JL486A | HPE Aruba Networking 25G SFP28 LC LR 10km SMF Transceiver | Drive Enclosures / Drives | Hard Disk Drives (SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 206 | P48183-B21 | HPE NS204i-u Gen11 NVMe Hot Plug Boot Optimized Storage Device | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 207 | P81162-B21 | HPE NS204i-u v2 960GB NVMe SED Hot Plug Boot Optimized Storage Device | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 208 | P71992-B21 | HPE ProLiant DL145 Gen11 NS204i-u Enablement Kit | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 209 | P81160-B21 | HPE NS204i-u v2 960GB NVMe Hot Plug Boot Optimized Storage Device | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 210 | P71995-B21 | HPE ProLiant DL145 Gen11 Double Wide GPU Cable Kit | Accessories &amp; Infrastructure | System Options | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 211 | P73002-B21 | HPE ProLiant DL145 Gen11 Double Wide GPU Air Baffle Kit | Accessories &amp; Infrastructure | System Options | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 212 | P72581-B21 | HPE ProLiant DL145 Gen11 2U Performance Fan Kit | Cooling / Thermal | High Performance &amp; Standard Fan Kits | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 213 | P54290-B21 | HPE ProLiant DL110 900W-1000W Titanium Hot Plug Low Halogen AC Power Supply Kit | Power Supplies | Flex Slot Power Supplies | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 214 | P43150-B21 | HPE ProLiant DL110 700W Flex Slot -48VDC Hot Plug Low Halogen Power Supply Kit | Processor | Intel Xeon Scalable Processors | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 215 | P44975-B21 | HPE ProLiant DL110 700W Flex Slot Platinum Hot Plug Low Halogen AC Power Supply Kit | Processor | Intel Xeon Scalable Processors | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 216 | Q0H80A | HPE 48VDC 2.85m Power Cable | Power Supplies | Flex Slot Power Supplies | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 217 | A0K02A | HPE C13 - C14 WW 250V 10Amp 2.0m Jumper Cord | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 218 | A0N33A | HPE C13-NEMA 6-15P 10A/250V 3.6m Black Power Cord | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 219 | 875519-B21 | HPE Bezel Lock Kit | Accessories &amp; Infrastructure | Chassis Infrastructure &amp; Rail Kits | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 220 | P72582-B21 | HPE ProLiant DL145 Gen11 FIO Bezel Filter Kit | Accessories &amp; Infrastructure | Chassis Infrastructure &amp; Rail Kits | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 221 | P72583-B21 | HPE ProLiant DL145 Gen11 Filter Replacement Kit | Accessories &amp; Infrastructure | Chassis Infrastructure &amp; Rail Kits | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 222 | P71998-B21 | HPE ProLiant DL145 Gen11 RJ45 Serial Port Cable Kit | Accessories &amp; Infrastructure | System Options | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 223 | P87008-B21 | HPE ProLiant DL145 Gen11 Military Ruggedization FIO Kit | Accessories &amp; Infrastructure | System Options | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 224 | P46191-AA1 | Microsoft Windows Server 2022 1 User CAL Chinese Simplified LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 225 | P46191-B21 | Microsoft Windows Server 2022 1 User CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 226 | P46194-B21 | Microsoft Windows Server 2022 1 Device CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 227 | P46215-AA1 | Microsoft Windows Server 2022 5 Users CAL Chinese Simplified LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 228 | P46215-AB1 | Microsoft Windows Server 2022 5 Users CAL Chinese Traditional LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 229 | P46215-B21 | Microsoft Windows Server 2022 5 Users CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 230 | P46216-B21 | Microsoft Windows Server 2022 5 Devices CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 231 | P46217-B21 | Microsoft Windows Server 2022 10 Users CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 232 | P46218-B21 | Microsoft Windows Server 2022 10 Devices CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 233 | P46219-B21 | Microsoft Windows Server 2022 50 Users CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 234 | P46220-B21 | Microsoft Windows Server 2022 50 Devices CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 235 | P46221-B21 | Microsoft Windows Server 2022 RDS 5 Users CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 236 | P46222-B21 | Microsoft Windows Server 2022 RDS 5 Devices CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 237 | P77110-AA1 | Microsoft Windows Server 2025 1 User CAL Chinese Simplified LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 238 | P77110-B21 | Microsoft Windows Server 2025 1 User CAL WW LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 239 | P77111-B21 | Microsoft Windows Server 2025 1 Device CAL WW LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 240 | P77112-AA1 | Microsoft Windows Server 2025 5 Users CAL Chinese Simplified LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 241 | P77112-AB1 | Microsoft Windows Server 2025 5 Users CAL Chinese Traditional LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 242 | P77112-B21 | Microsoft Windows Server 2025 5 Users CAL WW LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 243 | P77113-B21 | Microsoft Windows Server 2025 5 Devices CAL WW LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 244 | P77114-B21 | Microsoft Windows Server 2025 10 Users CAL WW LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 245 | P77115-B21 | Microsoft Windows Server 2025 10 Devices CAL WW LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 246 | P77116-B21 | Microsoft Windows Server 2025 50 Users CAL WW LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 247 | P77117-B21 | Microsoft Windows Server 2025 50 Devices CAL WW LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 248 | P77118-B21 | Microsoft Windows Server 2025 Remote Desktop Service 1 User CAL WW LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 249 | P77119-B21 | Microsoft Windows Server 2025 Remote Desktop Service 1 Device CAL WW LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 250 | P77120-B21 | Microsoft Windows Server 2025 Remote Desktop Service 5 Users CAL WW LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 251 | P77121-B21 | Microsoft Windows Server 2025 Remote Desktop Service 5 Devices CAL WW LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 252 | P77122-B21 | Microsoft Windows Server 2025 Remote Desktop Service 50 Users CAL WW LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 253 | P77123-B21 | Microsoft Windows Server 2025 Remote Desktop Service 50 Devices CAL WW LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 254 | P46155-291 | Microsoft Windows Server 2022 16-core Standard FIO Pre-installed UEFI Japanese SW | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 255 | P46155-B21 | Microsoft Windows Server 2022 16-core Standard FIO Pre-installed UEFI en/fr/it/de/es/nl/pt SW | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 256 | P77096-291 | Microsoft Windows Server 2025 16-core Standard FIO Pre-installed UEFI Japanese SW | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 257 | P77096-B21 | Microsoft Windows Server 2025 16-core Standard FIO Pre-installed UEFI en/fr/de/es/it/pt/nl SW | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 258 | P77099-291 | Microsoft Windows Server 2025 10-core Essentials FIO Pre-installed UEFI Japanese SW | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 259 | 512485-B21 | HPE iLO Advanced 1-server License with 1yr Support on iLO Licensed Features | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 260 | BD505A | HPE iLO Advanced 1-server License with 3yr Support on iLO Licensed Features | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 261 | 512487-B21 | HPE iLO Advanced AKA Tracking License with 1yr Support on iLO Licensed Features | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 262 | BD507A | HPE iLO Advanced AKA Tracking License with 3yr Support on iLO Licensed Features | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 263 | E6U59ABE | HPE iLO Advanced Electronic License with 1yr Support on iLO Licensed Features | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 264 | E6U64ABE | HPE iLO Advanced Electronic License with 3yr Support on iLO Licensed Features | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 265 | 512486-B21 | HPE iLO Advanced Flexible Quantity License with 1yr Support on iLO Licensed Features | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 266 | BD506A | HPE iLO Advanced Flexible Quantity License with 3yr Support on iLO Licensed Features | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 267 | Q5T84A | SUSE Linux Enterprise High Availability Extension 1-2 Sockets 1yr Subscription Flexible LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 268 | Q5T85A | SUSE Linux Enterprise High Availability Extension 1-2 Sockets 5yr Subscription Flexible LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 269 | Q2A48A | HPE Performance Message Passing Interface for 1 Socket 3yr Support LTU | Accessories &amp; Infrastructure | System Options | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 270 | P71964-B21 | HPE ProLiant DL145 Gen11 Configure-to-order Server | Chassis | Variants | ACTIVE | 2026-09-09 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 271 | AF556A | HPE C13 - Nema 5-15P US/CA 110V 10Amp 1.83m Power Cord | Cables &amp; Enablement Kits | Power Cords | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 272 | AF557A | HPE C13 - GB-1002 CN 250V 10Amp 1.83m Power Cord | Cables &amp; Enablement Kits | Power Cords | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 273 | AF568A | HPE C13 - CEE-VII EU 250V 10Amp 1.83m Power Cord | Cables &amp; Enablement Kits | Power Cords | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 274 | AF570A | HPE C13 - BS-1363A UK/HK/SG 250V 10Amp 1.83m Power Cord | Cables &amp; Enablement Kits | Power Cords | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 275 | AF573A | HPE C13 - C14 WW 250V 10Amp Flint Gray 2.0m Jumper Cord | Cables &amp; Enablement Kits | Power Cords | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 276 | AF558A | HPE C13 - IRAM -2073 AR 250V 10A 2.5m Power Cord | Cables &amp; Enablement Kits | Power Cords | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 277 | AF559A | HPE C13 - Nema 5-15P TH/PH 250V 10Amp 1.83m Power Cord | Cables &amp; Enablement Kits | Power Cords | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 278 | AF560A | HPE C13 - KSC- 8305 KR 250V 10Amp 1.83m Power Cord | Cables &amp; Enablement Kits | Power Cords | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 279 | AF561A | HPE C13 - CNS-690 TW 110V 13Amp 1.83m Power Cord | Cables &amp; Enablement Kits | Power Cords | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 280 | AF562A | HPE C13 - IS-1293 IN 240V 6Amp LV 2.0m Power Cord | Cables &amp; Enablement Kits | Power Cords | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 281 | AF564A | HPE C13 - SI-32 IL 250V 10Amp 1.83m Power Cord | Cables &amp; Enablement Kits | Power Cords | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 282 | AF565A | HPE C13 - SEV 1011 CH 250V 10Amp 1.83m Power Cord | Cables &amp; Enablement Kits | Power Cords | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 283 | AF566A | HPE C13 - DK-2.5A DK 250V 10Amp 1.83m Power Cord | Cables &amp; Enablement Kits | Power Cords | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 284 | AF567A | HPE C13 - SABS-164 ZA 250V 10Amp 2.5m Power Cord | Cables &amp; Enablement Kits | Power Cords | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 285 | AF569A | HPE C13 - AS3112-3 AU 250V 10Amp 2.5m Power Cord | Cables &amp; Enablement Kits | Power Cords | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 286 | AF572A | HPE C13 - JIS C8303 JP 100V 12Amp 2.0m Power Cord | Cables &amp; Enablement Kits | Power Cords | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 287 | AF591A | HPE C13 - NBR-14136 BR 250V 10Amp 1.83m Power Cord | Cables &amp; Enablement Kits | Power Cords | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 288 | P46195-B21 | Microsoft Windows Server 2022 16-core Std Add Lic en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc SW | Software &amp; Licenses | Compute Ops Management SKUs | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 289 | P46196-B21 | Microsoft Windows Server 2022 4-core Std Add Lic en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc SW | Software &amp; Licenses | Compute Ops Management SKUs | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 290 | P46199-AA1 | Microsoft Windows Server 2022 2-core Standard Additional License Chinese Simplified SW | Software &amp; Licenses | Compute Ops Management SKUs | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 291 | P46199-AB1 | Microsoft Windows Server 2022 2-core Standard Additional License Chinese Traditional SW | Software &amp; Licenses | Compute Ops Management SKUs | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 292 | P46199-B21 | Microsoft Windows Server 2022 2-core Std Add Lic en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc SW | Software &amp; Licenses | Compute Ops Management SKUs | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 293 | P46212-B21 | Microsoft Windows Server 2022 16-core DC Add Lic en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc SW | Software &amp; Licenses | Compute Ops Management SKUs | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 294 | P46213-B21 | Microsoft Windows Server 2022 4-core DC Add Lic en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc SW | Software &amp; Licenses | Compute Ops Management SKUs | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 295 | P46214-B21 | Microsoft Windows Server 2022 2-core DC Add Lic en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc SW | Software &amp; Licenses | Compute Ops Management SKUs | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 296 | P77104-B21 | Microsoft Windows Server 2025 16-core Standard Additional License WW SW | Software &amp; Licenses | Compute Ops Management SKUs | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 297 | P77105-B21 | Microsoft Windows Server 2025 4-core Standard Additional License WW SW | Software &amp; Licenses | Compute Ops Management SKUs | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 298 | P77106-AA1 | Microsoft Windows Server 2025 2-core Standard Additional License Chinese Simplified SW | Software &amp; Licenses | Compute Ops Management SKUs | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 299 | P77106-AB1 | Microsoft Windows Server 2025 2-core Standard Additional License Chinese Traditional SW | Software &amp; Licenses | Compute Ops Management SKUs | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 300 | P77106-B21 | Microsoft Windows Server 2025 2-core Standard Additional License WW SW | Software &amp; Licenses | Compute Ops Management SKUs | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 301 | P77107-B21 | Microsoft Windows Server 2025 16-core Datacenter Additional License WW SW | Software &amp; Licenses | Compute Ops Management SKUs | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 302 | P77108-B21 | Microsoft Windows Server 2025 4-core Datacenter Additional License WW SW | Software &amp; Licenses | Compute Ops Management SKUs | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 303 | P77109-B21 | Microsoft Windows Server 2025 2-core Datacenter Additional License WW SW | Software &amp; Licenses | Compute Ops Management SKUs | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 304 | P45916-291 | Microsoft Windows Server 2022 16-core Datacenter FIO Not Pre-installed Japanese SW | Software &amp; Licenses | Compute Ops Management SKUs | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 305 | P45916-B21 | Microsoft Windows Server 2022 16-core Datacenter FIO Not Pre-installed en/fr/it/de/es/nl/pt SW | Software &amp; Licenses | Compute Ops Management SKUs | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 306 | P46005-291 | Microsoft Windows Server 2022 16-core Standard FIO Not Pre-installed Japanese SW | Software &amp; Licenses | Compute Ops Management SKUs | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 307 | P46005-B21 | Microsoft Windows Server 2022 16-core Standard FIO Not Pre-installed en/fr/it/de/es/nl/pt SW | Software &amp; Licenses | Compute Ops Management SKUs | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 308 | P46173-291 | Microsoft Windows Server 2022 10-core Essentials FIO Pre-installed UEFI Japanese SW | Software &amp; Licenses | Compute Ops Management SKUs | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 309 | P46174-371 | Microsoft Windows Server 2022 10-core Essentials FIO Not Pre-installed English/Korean/Japanese SW | Software &amp; Licenses | Compute Ops Management SKUs | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 310 | P46174-B21 | Microsoft Windows Server 2022 10-core Essentials FIO Not Pre-installed en/fr/it/de/es/nl/pt SW | Software &amp; Licenses | Compute Ops Management SKUs | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 311 | P77095-291 | Microsoft Windows Server 2025 16-core Standard FIO Not Pre-installed Japanese SW | Software &amp; Licenses | Compute Ops Management SKUs | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 312 | P77095-B21 | Microsoft Windows Server 2025 16-core Standard FIO Not Pre-installed en/fr/de/es/it/pt/nl SW | Software &amp; Licenses | Compute Ops Management SKUs | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 313 | P77097-291 | Microsoft Windows Server 2025 16-core Datacenter FIO Not Pre-installed Japanese SW | Software &amp; Licenses | Compute Ops Management SKUs | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 314 | P77097-B21 | Microsoft Windows Server 2025 16-core Datacenter FIO Not Pre-installed en/fr/de/es/it/pt/nl SW | Software &amp; Licenses | Compute Ops Management SKUs | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 315 | P77098-291 | Microsoft Windows Server 2025 10-core Essentials FIO Not Pre-installed Japanese SW | Software &amp; Licenses | Compute Ops Management SKUs | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 316 | P77098-B21 | Microsoft Windows Server 2025 10-core Essentials FIO Not Pre-installed en/fr/de/es/it/pt/nl SW | Software &amp; Licenses | Compute Ops Management SKUs | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 317 | M6K34A | SUSE Linux Enterprise High Availability Extension 1-2 Sockets 3 Year Subscription Flx LTU | Software &amp; Licenses | SUSE Add-ons | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 318 | N0U73A | SUSE Linux Enterprise Server SAP 1-2 Sockets or 1-2 VM 3-year Subscription 24x7 Support Flexible LTU | Software &amp; Licenses | SUSE containers | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 319 | N0U75A | SUSE Linux Enterprise Server SAP 1-2 Sockets or 1-2 VM 5-year Subscription 24x7 Support Flexible LTU | Software &amp; Licenses | SUSE containers | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 320 | M6K30A | SUSE Linux Enterprise Server SAP 1-2 Sockets or 1-2 VM 3 Year Subscription 24x7 Support Flx LTU | Software &amp; Licenses | SUSE SAP Operating Systems | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 321 | M6K32A | SUSE Linux Enterprise Server SAP 1-2 Sockets or 1-2 VM 5 Year Subscription 24x7 Support Flx LTU | Software &amp; Licenses | SUSE SAP Operating Systems | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 322 | E5Y44A | HPE OneView for ProLiant DL Server including 3yr 24x7 Support Bundle Track 1-server LTU | Software &amp; Licenses | OneView Management Software | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 323 | E5Y43A | HPE OneView for ProLiant DL Server including 3yr 24x7 Support FIO Bundle Physical 1-server LTU | Software &amp; Licenses | OneView Management Software | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 324 | E5Y36A | HPE OneView including 3yr 24x7 Support Track 1-server LTU | Software &amp; Licenses | OneView Management Software | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 325 | P8B31A | HPE OneView w/o iLO including 3yr 24x7 Support 1-server FIO LTU | Software &amp; Licenses | OneView Management Software | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 326 | P8B24A | HPE OneView w/o iLO including 3yr 24x7 Support 1-server LTU | Software &amp; Licenses | OneView Management Software | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 327 | P8B25A | HPE OneView w/o iLO including 3yr 24x7 Support Track 1-server LTU | Software &amp; Licenses | OneView Management Software | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 328 | P11086-B21 | Microsoft Windows Server 2016 Downgrade Datacenter FIO Not Pre-installed English SW | Software &amp; Licenses | Integrated Lights Out Software | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 329 | P11086-051 | Microsoft Windows Server 2016 Downgrade Datacenter FIO Not Pre-installed French SW | Software &amp; Licenses | Integrated Lights Out Software | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 330 | P11086-041 | Microsoft Windows Server 2016 Downgrade Datacenter FIO Not Pre-installed German SW | Software &amp; Licenses | Integrated Lights Out Software | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 331 | P11086-061 | Microsoft Windows Server 2016 Downgrade Datacenter FIO Not Pre-installed Italian SW | Software &amp; Licenses | Integrated Lights Out Software | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 332 | P11086-291 | Microsoft Windows Server 2016 Downgrade Datacenter FIO Not Pre-installed Japanese SW | Software &amp; Licenses | Integrated Lights Out Software | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 333 | P11086-071 | Microsoft Windows Server 2016 Downgrade Datacenter FIO Not Pre-installed Spanish SW | Software &amp; Licenses | Integrated Lights Out Software | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 334 | P11083-B21 | Microsoft Windows Server 2016 Downgrade Standard FIO Not Pre-installed English SW | Software &amp; Licenses | Integrated Lights Out Software | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 335 | P11083-051 | Microsoft Windows Server 2016 Downgrade Standard FIO Not Pre-installed French SW | Software &amp; Licenses | Integrated Lights Out Software | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 336 | P11083-041 | Microsoft Windows Server 2016 Downgrade Standard FIO Not Pre-installed German SW | Software &amp; Licenses | Integrated Lights Out Software | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 337 | P11083-061 | Microsoft Windows Server 2016 Downgrade Standard FIO Not Pre-installed Italian SW | Software &amp; Licenses | Integrated Lights Out Software | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 338 | P11083-291 | Microsoft Windows Server 2016 Downgrade Standard FIO Not Pre-installed Japanese SW | Software &amp; Licenses | Integrated Lights Out Software | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 339 | P11083-071 | Microsoft Windows Server 2016 Downgrade Standard FIO Not Pre-installed Spanish SW | Software &amp; Licenses | Integrated Lights Out Software | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 340 | P45879-B21 | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed English SW | Software &amp; Licenses | Integrated Lights Out Software | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 341 | P45879-051 | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed French SW | Software &amp; Licenses | Integrated Lights Out Software | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 342 | P45879-041 | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed German SW | Software &amp; Licenses | Integrated Lights Out Software | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 343 | P45879-061 | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed Italian SW | Software &amp; Licenses | Integrated Lights Out Software | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 344 | P45879-291 | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed Japanese SW | Software &amp; Licenses | Integrated Lights Out Software | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 345 | P45879-071 | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed Spanish SW | Software &amp; Licenses | Integrated Lights Out Software | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 346 | P45862-B21 | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed English SW | Software &amp; Licenses | Integrated Lights Out Software | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 347 | P45862-051 | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed French SW | Software &amp; Licenses | Integrated Lights Out Software | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 348 | P45862-041 | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed German SW | Software &amp; Licenses | Integrated Lights Out Software | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 349 | P45862-061 | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed Italian SW | Software &amp; Licenses | Integrated Lights Out Software | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 350 | P45862-291 | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed Japanese SW | Software &amp; Licenses | Integrated Lights Out Software | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 351 | P45862-071 | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed Spanish SW | Software &amp; Licenses | Integrated Lights Out Software | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 352 | P77125-291 | Microsoft Windows Server 2022 Downgrade Datacenter FIO Not Pre-installed Japanese SW | Software &amp; Licenses | Integrated Lights Out Software | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 353 | P77125-B21 | Microsoft Windows Server 2022 Downgrade Datacenter FIO Not Pre-installed WW SW | Software &amp; Licenses | Integrated Lights Out Software | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 354 | P77124-291 | Microsoft Windows Server 2022 Downgrade Standard FIO Not Pre-installed Japanese SW | Software &amp; Licenses | Integrated Lights Out Software | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 355 | P77124-B21 | Microsoft Windows Server 2022 Downgrade Standard FIO Not Pre-installed WW SW | Software &amp; Licenses | Integrated Lights Out Software | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 356 | P11085-291 | Microsoft Windows Server 2016 Downgrade Datacenter Reseller Option Kit Japanese SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 357 | P11084-291 | Microsoft Windows Server 2016 Downgrade Standard Reseller Option Kit Japanese SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 358 | P46172-AA1 | Microsoft Windows Server 2022 10-core Essentials Reseller Option Kit Chinese Simplified SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 359 | P46172-AB1 | Microsoft Windows Server 2022 10-core Essentials Reseller Option Kit Chinese Traditional SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 360 | P46172-371 | Microsoft Windows Server 2022 10-core Essentials Reseller Option Kit English/Korean/Japanese SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 361 | P46172-021 | Microsoft Windows Server 2022 10-core Essentials Reseller Option Kit en/cs/pl/ru/sv SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 362 | P46172-A21 | Microsoft Windows Server 2022 10-core Essentials Reseller Option Kit en/fr/it/de/es/nl/pt SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 363 | P46123-AA1 | Microsoft Windows Server 2022 16-core Datacenter Reseller Option Kit Chinese Simplified SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 364 | P46123-AB1 | Microsoft Windows Server 2022 16-core Datacenter Reseller Option Kit Chinese Traditional SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 365 | P46123-371 | Microsoft Windows Server 2022 16-core Datacenter Reseller Option Kit English/Korean/Japanese SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 366 | P46123-021 | Microsoft Windows Server 2022 16-core Datacenter Reseller Option Kit en/cs/pl/ru/sv SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 367 | P46123-A21 | Microsoft Windows Server 2022 16-core Datacenter Reseller Option Kit en/fr/it/de/es/nl/pt SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 368 | P46128-B21 | Microsoft Windows Server 2022 16-core Datacenter w/Reassignment Reseller Option Kit en/fr/de/es SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 369 | P46128-291 | Microsoft Windows Server 2022 16-core Datacenter with Reassignment Reseller Option Kit Japanese SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 370 | P46171-AA1 | Microsoft Windows Server 2022 16-core Standard Reseller Option Kit Chinese Simplified SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 371 | P46171-AB1 | Microsoft Windows Server 2022 16-core Standard Reseller Option Kit Chinese Traditional SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 372 | P46171-371 | Microsoft Windows Server 2022 16-core Standard Reseller Option Kit English/Korean/Japanese SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 373 | P46171-021 | Microsoft Windows Server 2022 16-core Standard Reseller Option Kit en/cs/pl/ru/sv SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 374 | P46171-A21 | Microsoft Windows Server 2022 16-core Standard Reseller Option Kit en/fr/it/de/es/nl/pt SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 375 | P77103-AA1 | Microsoft Windows Server 2025 10-core Essentials Reseller Option Kit Chinese Simplified SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 376 | P77103-AB1 | Microsoft Windows Server 2025 10-core Essentials Reseller Option Kit Chinese Traditional SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 377 | P77103-291 | Microsoft Windows Server 2025 10-core Essentials Reseller Option Kit Japanese SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 378 | P77103-021 | Microsoft Windows Server 2025 10-core Essentials Reseller Option Kit en/cs/pl/ru/sv SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 379 | P77103-A21 | Microsoft Windows Server 2025 10-core Essentials Reseller Option Kit en/fr/de/es/it/pt/nl SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 380 | P77103-371 | Microsoft Windows Server 2025 10-core Essentials Reseller Option Kit en/ko SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 381 | P77102-291 | Microsoft Windows Server 2025 16-core Datacenter Reassignment Reseller Option Kit Japanese SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 382 | P77102-B21 | Microsoft Windows Server 2025 16-core Datacenter Reassignment Reseller Option Kit en/fr/de/es SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 383 | P77101-AA1 | Microsoft Windows Server 2025 16-core Datacenter Reseller Option Kit Chinese Simplified SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 384 | P77101-AB1 | Microsoft Windows Server 2025 16-core Datacenter Reseller Option Kit Chinese Traditional SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 385 | P77101-291 | Microsoft Windows Server 2025 16-core Datacenter Reseller Option Kit Japanese SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 386 | P77101-021 | Microsoft Windows Server 2025 16-core Datacenter Reseller Option Kit en/cs/pl/ru/sv SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 387 | P77101-A21 | Microsoft Windows Server 2025 16-core Datacenter Reseller Option Kit en/fr/de/es/it/pt/nl SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 388 | P77101-371 | Microsoft Windows Server 2025 16-core Datacenter Reseller Option Kit en/ko SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 389 | P77100-AA1 | Microsoft Windows Server 2025 16-core Standard Reseller Option Kit Chinese Simplified SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 390 | P77100-AB1 | Microsoft Windows Server 2025 16-core Standard Reseller Option Kit Chinese Traditional SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 391 | P77100-291 | Microsoft Windows Server 2025 16-core Standard Reseller Option Kit Japanese SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 392 | P77100-021 | Microsoft Windows Server 2025 16-core Standard Reseller Option Kit en/cs/pl/ru/sv SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 393 | P77100-A21 | Microsoft Windows Server 2025 16-core Standard Reseller Option Kit en/fr/de/es/it/pt/nl SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 394 | P77100-371 | Microsoft Windows Server 2025 16-core Standard Reseller Option Kit en/ko SW | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-10 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 395 | R8V76A | SUSE Linux Enterprise Server 1-2 Sockets Unlimited VM w/Live Patching 1-year 24x7 Flexible LTU | Software &amp; Licenses | VMWare Core Editions | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 396 | R8V74A | SUSE Linux Enterprise Server 1-2 Sockets Unlimited VM w/Live Patching 1-year 9x5 Flexible LTU | Software &amp; Licenses | VMWare Core Editions | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 397 | R8V77A | SUSE Linux Enterprise Server 1-2 Sockets Unlimited VM w/Live Patching 3-year 24x7 Flexible LTU | Software &amp; Licenses | VMWare Core Editions | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 398 | R8V75A | SUSE Linux Enterprise Server 1-2 Sockets Unlimited VM w/Live Patching 3-year 9x5 Flexible LTU | Software &amp; Licenses | VMWare Core Editions | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 399 | R8V78A | SUSE Linux Enterprise Server 1-2 Sockets Unlimited VM w/Live Patching 5-year 24x7 Flexible LTU | Software &amp; Licenses | VMWare Core Editions | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 400 | R8V79A | SUSE Linux Enterprise Server 1-2 Sockets Unlimited VM w/Live Patching 5-year 9x5 Flexible LTU | Software &amp; Licenses | VMWare Core Editions | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 401 | R8V72A | SUSE Linux Enterprise Server for SAP 1-2 Sockets Unlimited VM w/Live Patching 3yr 24x7 Flexible LTU | Software &amp; Licenses | VMWare Core Editions | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 402 | R8V73A | SUSE Linux Enterprise Server for SAP 1-2 Sockets Unlimited VM w/Live Patching 5yr 24x7 Flexible LTU | Software &amp; Licenses | VMWare Core Editions | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 403 | S7N87A | SUSE Linux Enterprise Server for SAP Applications 1-2 Sockets Unlimited VM 3yr Sub 24x7 Sup Flex LTU | Software &amp; Licenses | VMWare Core Editions | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 404 | S7P10A | SUSE Linux Enterprise Server for SAP Applications 1-2 Sockets Unlimited VM 3yr Sub 24x7 Sup Flex LTU | Software &amp; Licenses | VMWare Core Editions | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 405 | S7N88A | SUSE Linux Enterprise Server for SAP Applications 1-2 Sockets Unlimited VM 5yr Sub 24x7 Sup Flex LTU | Software &amp; Licenses | VMWare Core Editions | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 406 | S7P11A | SUSE Linux Enterprise Server for SAP Applications 1-2 Sockets Unlimited VM 5yr Sub 24x7 Sup Flex LTU | Software &amp; Licenses | VMWare Core Editions | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 407 | S2L70C | NVIDIA L40S 48GB PCIe Accelerator | Graphics &amp; GPU | Graphics | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 408 | S6W30C | NVIDIA RTX PRO 4500 Blackwell Server Edition 32GB PCIe Accelerator for HPE | Graphics &amp; GPU | Graphics | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 409 | S0K89C | NVIDIA L4 24GB PCIe Accelerator for HPE | Graphics &amp; GPU | Graphics | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 410 | R1C65A | HPE C13-C14 IN 250V 10Amp 2m Black Jumper Cord | Cables &amp; Enablement Kits | Power Cords | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 411 | S1A05A | HPE Compute Cloud Management Server FIO Enablement | HPE Compute Ops Management | Compute Ops Management SKUs | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 412 | S6K30B | Microsoft Windows Server 2025 16-core Standard FIO Not Pre-installed WW ESD LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 413 | S6L35B | Microsoft Windows Server 2025 16-core Datacenter FIO Not Pre-installed WW ESD LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 414 | S6L28B | Microsoft Windows Server 2025 10-core Essentials FIO Not Pre-installed WW ESD LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 415 | R8V84A | SUSE Linux Enterprise Server for SAP 1-2 Sockets Unlimited VM w/Live Patching 3yr 24x7 Flexible LTU | Software &amp; Licenses | SUSE containers | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 416 | R8V85A | SUSE Linux Enterprise Server for SAP 1-2 Sockets Unlimited VM w/Live Patching 5yr 24x7 Flexible LTU | Software &amp; Licenses | SUSE containers | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 417 | S3R49A | SUSE Linux Enterprise Server w/SUSE Manager Lifecycle Management+ 1-2 Sockets/1-2 VM 3yr 24x7 LTU | Software &amp; Licenses | SUSE containers | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 418 | S3R50A | SUSE Linux Enterprise Server w/SUSE Manager Lifecycle Management+ 1-2 Sockets/1-2 VM 1yr 24x7 LTU | Software &amp; Licenses | SUSE containers | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 419 | S3R51A | SUSE Linux Enterprise Server w/SUSE Manager Lifecycle Management+ 1-2 Sockets/1-2 VM 1yr 9x5 LTU | Software &amp; Licenses | SUSE containers | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 420 | S3R52A | SUSE Linux Enterprise Server w/SUSE Manager Lifecycle Management+ 1-2 Sockets/1-2 VM 5yr 24x7 LTU | Software &amp; Licenses | SUSE containers | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 421 | S3R53A | SUSE Linux Enterprise Server w/SUSE Manager Lifecycle Management+ 1-2 Sockets/1-2 VM 3yr 9x5 LTU | Software &amp; Licenses | SUSE containers | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 422 | S3R54A | SUSE Linux Enterprise Server w/SUSE Manager Lifecycle Management+ 1-2 Sockets/1-2 VM 5yr 9x5 LTU | Software &amp; Licenses | SUSE containers | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 423 | S7N85A | SUSE Linux Enterprise Server for SAP Applications 1-2 Sockets or 1-2 VM 3-year Sub 24x7 Support LTU | Software &amp; Licenses | SUSE containers | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 424 | S7N86A | SUSE Linux Enterprise Server for SAP Applications 1-2 Sockets or 1-2 VM 5-year Sub 24x7 Support LTU | Software &amp; Licenses | SUSE containers | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 425 | S7N89A | SUSE Linux Enterprise Server w/SUSE Multi-Linux Mgr Lifecycle Mgmt+ 1-2 Skts/1-2 VM 1yr 24x7 LTU | Software &amp; Licenses | SUSE containers | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 426 | S7N90A | SUSE Linux Enterprise Server w/SUSE Multi-Linux Mgr Lifecycle Mgmt+ 1-2 Skts/1-2 VM 1yr 9x5 LTU | Software &amp; Licenses | SUSE containers | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 427 | S7N91A | SUSE Linux Enterprise Server w/SUSE Multi-Linux Mgr Lifecycle Mgmt+ 1-2 Skts/1-2 VM 3yr 24x7 LTU | Software &amp; Licenses | SUSE containers | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 428 | S7N92A | SUSE Linux Enterprise Server w/SUSE Multi-Linux Mgr Lifecycle Mgmt+ 1-2 Skts/1-2 VM 3yr 9x5 LTU | Software &amp; Licenses | SUSE containers | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 429 | S7N93A | SUSE Linux Enterprise Server w/SUSE Multi-Linux Mgr Lifecycle Mgmt+ 1-2 Skts/1-2 VM 5yr 24x7 LTU | Software &amp; Licenses | SUSE containers | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 430 | S7N94A | SUSE Linux Enterprise Server w/SUSE Multi-Linux Mgr Lifecycle Mgmt+ 1-2 Skts/1-2 VM 5yr 9x5 LTU | Software &amp; Licenses | SUSE containers | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 431 | S7P12A | SUSE Linux Enterprise Server for SAP Applications 1-2 Sockets or 1-2 VM 3-year Sub 24x7 Sup Flex LTU | Software &amp; Licenses | SUSE containers | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 432 | S7P13A | SUSE Linux Enterprise Server for SAP Applications 1-2 Sockets or 1-2 VM 5-year Sub 24x7 Sup Flex LTU | Software &amp; Licenses | SUSE containers | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 433 | S6L47A | Microsoft Windows Server 2019 Downgrade Datacenter FIO Not Pre-installed WW ESD LTU | Software &amp; Licenses | Integrated Lights Out Software | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 434 | S6L45A | Microsoft Windows Server 2019 Downgrade Datacenter Reseller Option Kit Japanese ESD LTU | Software &amp; Licenses | Integrated Lights Out Software | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 435 | S6L46A | Microsoft Windows Server 2019 Downgrade Standard FIO Not Pre-installed WW ESD LTU | Software &amp; Licenses | Integrated Lights Out Software | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 436 | S6L44A | Microsoft Windows Server 2019 Downgrade Standard Reseller Option Kit Japanese ESD LTU | Software &amp; Licenses | Integrated Lights Out Software | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 437 | S6L48A | Microsoft Windows Server 2022 Downgrade Datacenter FIO Not Pre-installed WW ESD LTU | Software &amp; Licenses | Integrated Lights Out Software | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 438 | S6L43A | Microsoft Windows Server 2022 Downgrade Standard FIO Not Pre-installed WW ESD LTU | Software &amp; Licenses | Integrated Lights Out Software | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 439 | S6L41A | Microsoft Windows Server 2022 Downgrade Standard Reseller Option Kit Japanese ESD LTU | Software &amp; Licenses | Integrated Lights Out Software | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 440 | S4T26A | Red Hat High Availability 2 Sockets Unlimited Guests 1-year Subscription LTU | Software &amp; Licenses | Linux Value Added Software | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 441 | S4T27A | Red Hat High Availability 2 Sockets Unlimited Guests 3-year Subscription LTU | Software &amp; Licenses | Linux Value Added Software | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 442 | S4T22A | Red Hat High Availability 2 Sockets or 2 Guests 1-year Subscription LTU | Software &amp; Licenses | Linux Value Added Software | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 443 | S4T23A | Red Hat High Availability 2 Sockets or 2 Guests 3-year Subscription LTU | Software &amp; Licenses | Linux Value Added Software | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 444 | S4T24A | Red Hat Resilient Storage 2 Sockets or 2 Guests 1-year Subscription LTU | Software &amp; Licenses | Linux Value Added Software | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 445 | S4T25A | Red Hat Resilient Storage 2 Sockets or 2 Guests 3-year Subscription LTU | Software &amp; Licenses | Linux Value Added Software | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 446 | R8V48A | HPE Serviceguard for Linux x86 Flex Storage Add-On Media | Software &amp; Licenses | High Availability Computing - Cluster Software | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 447 | S6L39A | Microsoft Windows Server 2025 10-core Essentials Reseller Option Kit WW ESD LTU | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 448 | S6L37A | Microsoft Windows Server 2025 16-core Datacenter Reassignment Reseller Option Kit WW ESD LTU | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 449 | S6L36A | Microsoft Windows Server 2025 16-core Datacenter Reseller Option Kit WW ESD LTU | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 450 | S6L38A | Microsoft Windows Server 2025 16-core Standard Reseller Option Kit WW ESD LTU | Software &amp; Licenses | Partner Software - Operating System 8pks | ACTIVE | 2026-09-13 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 451 | P57807-B21 | HPE 15.36TB NVMe Gen5 High Performance Read Intensive E3S EC1 EDSFF SPDM PM1743 SSD | Drive Enclosures / Drives | SSD - EDSFF NVME Read Intensive | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 452 | S6K30A | Microsoft Windows Server 2025 16-core Standard FIO Pre-installed UEFI WW ESD LTU | Software &amp; Licenses | MS Windows Server Additional License | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 453 | Q9R65A | Red Hat Enterprise Linux for SAP Solutions for Physical Nodes 3yr Subscription 24x7 Support LTU | Software &amp; Licenses | SUSE Operating Systems | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 454 | Q9R66A | Red Hat Enterprise Linux for SAP Solutions for Physical Nodes 5yr Subscription 24x7 Support LTU | Software &amp; Licenses | SUSE Operating Systems | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 455 | Q9R67A | Red Hat Enterprise Linux for SAP Solutions for Virtual DC 3yr Subscription 24x7 Support LTU | Software &amp; Licenses | SUSE Operating Systems | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 456 | Q9R68A | Red Hat Enterprise Linux for SAP Solutions for Virtual DC 5yr Subscription 24x7 Support LTU | Software &amp; Licenses | SUSE Operating Systems | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 457 | R3Q35AAE | NVIDIA RTX Virtual Workstation 1 Concurrent User 1-year Subscription E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 458 | R3Q37AAE | NVIDIA RTX Virtual Workstation 1 Concurrent User 3-year Subscription E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 459 | R3Q38AAE | NVIDIA RTX Virtual Workstation 1 Concurrent User 4-year Subscription E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 460 | R3Q39AAE | NVIDIA RTX Virtual Workstation 1 Concurrent User 5-year Subscription E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 461 | R3Q40AAE | NVIDIA RTX Virtual Workstation 1 Concurrent User Education 1-year Subscription Renewal E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 462 | R3Q42AAE | NVIDIA RTX Virtual Workstation 1 Concurrent User Education 3-year Subscription Renewal E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 463 | R3Q44AAE | NVIDIA Virtual Applications 1 Concurrent User 1-year Subscription E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 464 | R3Q46AAE | NVIDIA Virtual Applications 1 Concurrent User 3-year Subscription E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 465 | R3Q47AAE | NVIDIA Virtual Applications 1 Concurrent User 4-year Subscription E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 466 | R3Q48AAE | NVIDIA Virtual Applications 1 Concurrent User 5-year Subscription E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 467 | R3Q49AAE | NVIDIA Virtual PC 1 Concurrent User 1-year Subscription E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 468 | R3Q51AAE | NVIDIA Virtual PC 1 Concurrent User 3-year Subscription E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 469 | R3Q52AAE | NVIDIA Virtual PC 1 Concurrent User 4-year Subscription E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 470 | R3Q53AAE | NVIDIA Virtual PC 1 Concurrent User 5-year Subscription E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 471 | R3Q63AAE | NVIDIA RTX Virtual Workstation SUMS 1 Concurrent User 1-year Subscription Renewal E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 472 | R3Q67AAE | NVIDIA RTX Virtual Workstation SUMS 1 Concurrent User 5-year Subscription E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 473 | R3Q68AAE | NVIDIA RTX Virtual Workstation SUMS 1 Concurrent User Education 1-year Subscription Renewal E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 474 | R3Q72AAE | NVIDIA RTX Virtual Workstation SUMS 1 Concurrent User Education 5-year Subscription E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 475 | R3Q73AAE | NVIDIA Virtual Applications SUMS 1 Concurrent User 1-year Subscription Renewal E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 476 | R3Q77AAE | NVIDIA Virtual Applications SUMS 1 Concurrent User 5-year Subscription E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 477 | R3Q79AAE | NVIDIA Virtual PC 1 Concurrent User 1-year Subscription Renewal E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 478 | R3Q81AAE | NVIDIA Virtual PC 1 Concurrent User 3-year Subscription Renewal E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 479 | R3Q93AAE | NVIDIA RTX Virtual Workstation 1 Concurrent User Perpetual E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 480 | R3Q94AAE | NVIDIA RTX Virtual Workstation 1 Concurrent User Education Perpetual E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 481 | R3Q95AAE | NVIDIA RTX Virtual Workstation 1 Concurrent User 1-year Subscription Renewal E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 482 | R3R01AAE | NVIDIA Virtual Applications 1 Concurrent User Perpetual E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 483 | R3R02AAE | NVIDIA Virtual Applications 1 Concurrent User 1-year Subscription Renewal E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 484 | R3R03AAE | NVIDIA Virtual Applications 1 Concurrent User 3-year Subscription Renewal E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 485 | R3R06AAE | NVIDIA Virtual PC 1 Concurrent User Perpetual E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 486 | R3R07AAE | NVIDIA Virtual PC SUMS 1 Concurrent User 1-year Subscription Renewal E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 487 | R3R12AAE | NVIDIA RTX Virtual Workstation 1 Concurrent User 3-year Subscription Renewal E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 488 | R3R21AAE | NVIDIA Virtual PC SUMS 1 Concurrent User 5-year Subscription E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 489 | R3R26AAE | NVIDIA RTX Virtual Workstation 1 Concurrent User Education 1-year Subscription E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 490 | R3R27AAE | NVIDIA RTX Virtual Workstation 1 Concurrent User Education 3-year Subscription E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 491 | S2S16AAE | NVIDIA AI Enterprise per GPU 1-year Subscription 9x5 Support E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 492 | S2S17AAE | NVIDIA AI Enterprise per GPU 3-year Subscription 9x5 Support E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 493 | S2S18AAE | NVIDIA AI Enterprise per GPU 5-year Subscription 9x5 Support E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 494 | S2S19AAE | NVIDIA AI Enterprise per GPU 1-year Subscription 9x5 Support Renewal E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 495 | S2S20AAE | NVIDIA AI Enterprise per GPU 3-year Subscription 9x5 Support Renewal E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 496 | S2S21AAE | NVIDIA AI Enterprise per GPU 5-year Subscription 9x5 Support Renewal E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 497 | S2S22AAE | NVIDIA AI Enterprise Educational per GPU 1-year Subscription 9x5 Support E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 498 | S2S23AAE | NVIDIA AI Enterprise Educational per GPU 3-year Subscription 9x5 Support E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 499 | S2S24AAE | NVIDIA AI Enterprise Educational per GPU 5-year Subscription 9x5 Support E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 500 | S2S25AAE | NVIDIA AI Enterprise Educational per GPU 1-year Subscription 9x5 Support Renewal E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 501 | S2S26AAE | NVIDIA AI Enterprise Educational per GPU 3-year Subscription 9x5 Support Renewal E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 502 | S2S27AAE | NVIDIA AI Enterprise Educational per GPU 5-year Subscription 9x5 Support Renewal E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 503 | S2S28AAE | NVIDIA AI Enterprise per GPU 1-year 24x7 Support E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 504 | S2S29AAE | NVIDIA AI Enterprise per GPU 3-year 24x7 Support E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 505 | S2S30AAE | NVIDIA AI Enterprise per GPU 5-year 24x7 Support E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 506 | S2S31AAE | NVIDIA AI Enterprise Educational per GPU 1-year 24x7 Support E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 507 | S2S32AAE | NVIDIA AI Enterprise Educational per GPU 3-year 24x7 Support E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 508 | S2S33AAE | NVIDIA AI Enterprise Educational per GPU 5-year 24x7 Support E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 509 | S2S34AAE | NVIDIA AI Enterprise per GPU 1-year 24x7 Support Renewal E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 510 | S2S35AAE | NVIDIA AI Enterprise per GPU 3-year 24x7 Support Renewal E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 511 | S2S36AAE | NVIDIA AI Enterprise per GPU 5-year 24x7 Support Renewal E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 512 | S2S37AAE | NVIDIA AI Enterprise Educational per GPU 1-year 24x7 Support Renewal E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 513 | S2S38AAE | NVIDIA AI Enterprise Educational per GPU 3-year 24x7 Support Renewal E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 514 | S2S39AAE | NVIDIA AI Enterprise Educational per GPU 5-year 24x7 Support Renewal E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 515 | S8M87AAE | NVIDIA RTX PRO 4500 Blackwell Server Edition per GPU 3-year E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |
| 516 | S8M88AAE | NVIDIA RTX PRO 4500 Blackwell Server Edition per GPU 5-year E-LTU | Software &amp; Licenses | Server Management &amp; Operating System Licenses | ACTIVE | 2026-11-20 |  |  |  |  |  | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE | No | [DISCONTINUED] Deprecated from latest HPE OCA portal |


### Metadata

| Original row | Column 1 | Column 2 |
| --- | --- | --- |
| 1 | Field | Value |
| 2 | Chassis | DL145 Gen11 |
| 3 | Scrape Date | 2026-11-20 |
| 4 | Source | OCA (Online Configuration Application) |
| 5 | Total Sub-Categories | 93 |
| 6 | Total Hardware SKUs | 487 |
| 7 | Total Service/Software SKUs | 126 |
| 8 | Total Combined SKUs | 668 |
| 9 | Chassis Variant Options | 1 |
| 10 | Total Rules | 176 |
| 11 | Unavailable DOM Rules | 9 |
| 12 | Total Tables | 58 |
| 13 | Diff Added SKUs | 103 |
| 14 | Diff Removed SKUs | 4 |
| 15 | Diff Price Changed | 0 |
| 16 | Diff Attr Changed | 271 |
| 17 | Diff Price+Attr Changed | 290 |
| 18 | Diff Reinstated SKUs | 0 |
| 19 | Diff Unchanged SKUs | 0 |
| 20 | Discontinued (All-Time) | 4 |
| 21 | Reinstated (All-Time) | 0 |
| 22 | Services JSON | outputs/ProLiant/Gen11/DL145_Gen11/DL145_Gen11_Services.json |
| 23 | Output Folder | outputs/ProLiant/Gen11/DL145_Gen11 |


## Shared cell text

Bracketed TEXT identifiers above refer to these exact repeated values. The surrounding sheet, column and row determine applicability.

### TEXT_1

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":89,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_2

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":373,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_3

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":86,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_4

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":110,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_5

Selection constraint for Heatsink Kit: max 1 &#124; P72006-B21 conditional visibility: portal selector activation required ("HPE DL145 Gen11 Desk/Wall Mount Kit" and "HPE DL145 Gen11 Rack enable kit" cannot be selected together.); PORTAL_CONDITIONAL

### TEXT_6

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":118,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_7

{"leadTime":"1","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":1,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_8

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":1744,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_9

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2645,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_10

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":1160,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_11

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":5173,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_12

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":7371,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_13

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":9654,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_14

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":1433,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_15

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2157,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_16

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2958,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_17

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":8600,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_18

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":10617,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_19

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":14189,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_20

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2280,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_21

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":5801,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_22

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":11873,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_23

{"leadTime":"21","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":8991,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_24

{"leadTime":"21","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":6636,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_25

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":3262,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_26

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":1563,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_27

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":202,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_28

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":13909,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_29

{"Vendor Status Badge":"CS","isSupplyConstrained":true,"vendorSupplyStatus":"CONSTRAINED_SUPPLY","supplyConstraintDetails":"This SKU is currently unavailable based on supply constraints. Select equivalent alternative SKU.","leadTime":"Unpublished","lifecycleCanonical":"Constrained Supply","listPrice":7439,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_30

{"Vendor Status Badge":"CS","isSupplyConstrained":true,"vendorSupplyStatus":"CONSTRAINED_SUPPLY","supplyConstraintDetails":"This SKU is currently unavailable based on supply constraints. Select equivalent alternative SKU.","leadTime":"Unpublished","lifecycleCanonical":"Constrained Supply","listPrice":60190,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_31

Selection constraint for Memory: max 6 &#124; P50312-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL &#124; (+7 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_32

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":28532,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_33

Selection constraint for Memory: max 6 &#124; P64986-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL &#124; (+7 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_34

Selection constraint for Memory: max 6 &#124; P50309-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL &#124; (+7 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_35

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":7439,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_36

Selection constraint for Memory: max 6 &#124; P64985-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL &#124; (+7 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_37

Selection constraint for Memory: max 6 &#124; P64987-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL &#124; (+7 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_38

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":47056,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_39

Selection constraint for Memory: max 6 &#124; P64988-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL &#124; (+7 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_40

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":60190,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_41

Selection constraint for Memory: max 6 &#124; P66676-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL &#124; (+7 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_42

Selection constraint for Memory: max 6 &#124; P69982-F21 conditional visibility: portal selector activation required (All DIMMs selected in a server configuration must be of the same part number, capacity size, rank etc.); PORTAL_CONDITIONAL &#124; (+7 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_43

BTO Memories are not allowed in CTO Base Model. &#124; P50309-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL &#124; (+8 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_44

{"leadTime":"30","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":7439,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_45

BTO Memories are not allowed in CTO Base Model. &#124; P50311-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL &#124; (+8 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_46

{"leadTime":"30","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":13909,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_47

BTO Memories are not allowed in CTO Base Model. &#124; P50312-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL &#124; (+8 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_48

{"leadTime":"30","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":28532,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_49

BTO Memories are not allowed in CTO Base Model. &#124; P64984-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL &#124; (+8 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_50

BTO Memories are not allowed in CTO Base Model. &#124; P64985-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL &#124; (+8 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_51

BTO Memories are not allowed in CTO Base Model. &#124; P64986-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL &#124; (+8 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_52

BTO Memories are not allowed in CTO Base Model. &#124; P64987-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL &#124; (+8 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_53

{"leadTime":"30","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":47056,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_54

BTO Memories are not allowed in CTO Base Model. &#124; P64988-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL &#124; (+8 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_55

{"leadTime":"30","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":60190,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_56

BTO Memories are not allowed in CTO Base Model. &#124; P66676-B21 conditional visibility: portal selector activation required (BTO Memories are not allowed in CTO Base Model.); PORTAL_CONDITIONAL &#124; (+8 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_57

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":1775,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_58

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":7649,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_59

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":4329,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_60

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":5679,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_61

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":397,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_62

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":110,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_63

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":57,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_64

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":69,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_65

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":160,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_66

{"leadTime":"1","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":1,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_67

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":474,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_68

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":225,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_69

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":296,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_70

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":380,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_71

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":27476,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_72

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"90-Day Warning","listPrice":7781,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_73

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":9712,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_74

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"90-Day Warning","listPrice":30682,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_75

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":16870,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_76

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":68106,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_77

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":24988,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_78

{"leadTime":"60","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":35088,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_79

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":17948,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_80

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":19893,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_81

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":28574,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_82

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":23265,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_83

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":17851,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_84

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":28196,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_85

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":47719,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_86

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":85736,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_87

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":36346,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_88

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":61895,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_89

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":111990,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_90

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":37112,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_91

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"90-Day Warning","listPrice":75784,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_92

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"90-Day Warning","listPrice":44109,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_93

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":153423,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_94

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":17948,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_95

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":114862,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_96

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":27764,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_97

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":27397,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_98

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":47241,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_99

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":36705,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_100

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":127927,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_101

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"90-Day Warning","listPrice":47029,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_102

{"leadTime":"60","leadTimeUnit":"DAYS","lifecycleCanonical":"90-Day Warning","listPrice":118842,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_103

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"90-Day Warning","listPrice":42682,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_104

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"90-Day Warning","listPrice":60093,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_105

{"leadTime":"60","leadTimeUnit":"DAYS","lifecycleCanonical":"90-Day Warning","listPrice":96543,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_106

{"leadTime":"60","leadTimeUnit":"DAYS","lifecycleCanonical":"90-Day Warning","listPrice":75476,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_107

{"leadTime":"21","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":47438,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_108

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":17396,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_109

{"leadTime":"30","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":16153,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_110

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":24851,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_111

{"leadTime":"30","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":22771,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_112

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":37546,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_113

{"leadTime":"60","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":65439,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_114

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":127927,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_115

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":180169,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_116

{"leadTime":"60","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":118713,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_117

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":153423,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_118

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":169476,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_119

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":19329,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_120

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":27764,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_121

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":44163,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_122

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":27397,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_123

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":47241,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_124

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":83307,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_125

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":37278,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_126

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":63483,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_127

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":38063,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_128

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":48943,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_129

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":126482,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_130

{"leadTime":"10","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":181026,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_131

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":17161,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_132

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":23477,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_133

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":37804,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_134

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":64477,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_135

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":128913,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_136

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":210628,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_137

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":400156,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_138

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":30331,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_139

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":123319,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_140

Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 &#124; P79615-B21 conditional visibility: portal selector activation required (If HPE DL145 Gen11 Opt ACC FIO Config is selected, then these EDSFF drives cannot be selected with direct attach. (Only controller mode).); PORTAL_CONDITIONAL &#124; (+3 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_141

{"leadTime":"60","leadTimeUnit":"DAYS","lifecycleCanonical":"90-Day Warning","listPrice":140919,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_142

Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 &#124; P79618-B21 conditional visibility: portal selector activation required (If HPE DL145 Gen11 Opt ACC FIO Config is selected, then these EDSFF drives cannot be selected with direct attach. (Only controller mode).); PORTAL_CONDITIONAL &#124; (+3 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_143

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":284757,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_144

Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 &#124; P79620-B21 conditional visibility: portal selector activation required (If HPE DL145 Gen11 Opt ACC FIO Config is selected, then these EDSFF drives cannot be selected with direct attach. (Only controller mode).); PORTAL_CONDITIONAL &#124; (+3 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_145

{"leadTime":"10","leadTimeUnit":"DAYS","lifecycleCanonical":"90-Day Warning","listPrice":140919,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_146

Selection constraint for SSD - EDSFF NVME Read Intensive: max 4 &#124; P79623-B21 conditional visibility: portal selector activation required (If HPE DL145 Gen11 Opt ACC FIO Config is selected, then these EDSFF drives cannot be selected with direct attach. (Only controller mode).); PORTAL_CONDITIONAL &#124; (+3 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_147

{"leadTime":"10","leadTimeUnit":"DAYS","lifecycleCanonical":"90-Day Warning","listPrice":255131,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_148

Selection constraint for Heatsink Kit: max 1 &#124; P35876-B21 conditional visibility: portal selector activation required (CE Mark label SKU (P35876-B21) should be visible only when selecting Lot9 SKU's in the configuration); PORTAL_CONDITIONAL

### TEXT_149

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":1,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_150

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":255,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_151

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":320,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_152

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":1105,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_153

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":940,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_154

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":1184,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_155

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":1500,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_156

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":485,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_157

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":1680,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_158

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":3770,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_159

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2598,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_160

Max quantity of product limited by space available. &#124; P10097-B21 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+6 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_161

Max quantity of product limited by space available. &#124; P10115-B21 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+6 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_162

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":1231,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_163

Max quantity of product limited by space available. &#124; P42041-B21 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+6 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_164

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":1398,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_165

Max quantity of product limited by space available. &#124; P08449-B21 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+6 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_166

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":830,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_167

Max quantity of product limited by space available. &#124; P10106-B21 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+6 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_168

Max quantity of product limited by space available. &#124; P26256-B21 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+6 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_169

Max quantity of product limited by space available. &#124; P26269-B21 conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+6 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_170

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":1751,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_171

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":427,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_172

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":426,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_173

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":842,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_174

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2110,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_175

{"leadTime":"78","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":5199,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_176

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":3980,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_177

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":2260,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_178

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":10800,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_179

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":6110,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_180

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":18000,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_181

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":10200,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_182

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":18873,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_183

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":31455,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_184

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":18873,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_185

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":31455,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_186

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":10399,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_187

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":80,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_188

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":14999,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_189

{"leadTime":"21","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":14999,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_190

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":18882,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_191

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":10589,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_192

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":32212,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_193

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":24,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_194

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":44,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_195

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":123,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_196

{"leadTime":"6","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":891,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_197

Mixing of Power Supplies is not allowed. &#124; P44975-B21 conditional visibility: portal selector activation required (Mixing of Power Supplies is not allowed.); PORTAL_CONDITIONAL &#124; (+1 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_198

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":444,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_199

Mixing of Power Supplies is not allowed. &#124; P43150-B21 conditional visibility: portal selector activation required (Mixing of Power Supplies is not allowed.); PORTAL_CONDITIONAL &#124; (+1 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_200

{"leadTime":"6","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":692,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_201

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":55,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_202

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":71,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_203

{"leadTime":"21","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":156,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_204

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":65,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_205

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":55,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_206

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":55,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_207

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":194,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_208

{"leadTime":"11","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":55,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_209

{"leadTime":"11","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":65,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_210

{"leadTime":"13","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":55,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_211

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":60,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_212

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":38,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_213

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":49,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_214

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":119,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_215

Selection constraint for HPE Virtualization: no max &#124; Q0H80A conditional visibility: portal selector activation required (If AC Power Supply is selected then only AC Power Cords should be in the drop-down.); PORTAL_CONDITIONAL

### TEXT_216

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":181,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_217

BTO products are not allowed in CTO Base Model. &#124; A0K02A conditional visibility: portal selector activation required (BTO products are not allowed in CTO Base Model.); PORTAL_CONDITIONAL &#124; (+1 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_218

{"leadTime":"21","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":34,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_219

BTO products are not allowed in CTO Base Model. &#124; A0N33A conditional visibility: portal selector activation required (BTO products are not allowed in CTO Base Model.); PORTAL_CONDITIONAL &#124; (+1 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_220

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":78,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_221

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":89,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_222

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":112,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_223

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":81,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_224

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":20,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_225

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":200,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_226

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":1,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_227

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1087,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_228

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":272,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_229

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":99999,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_230

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":136,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_231

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":4946,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_232

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1238,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_233

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":619,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_234

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":1258,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_235

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":320,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_236

{"leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"}

### TEXT_237

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":164,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_238

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":5712,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_239

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":1434,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_240

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":721,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_241

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":1147,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_242

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":5712,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_243

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":55,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_244

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":44,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_245

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":271,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_246

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":216,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_247

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":539,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_248

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":429,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_249

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":2695,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_250

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":2145,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_251

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":935,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_252

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":880,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_253

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":72,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_254

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":52,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_255

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":322,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_256

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":226,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_257

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":636,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_258

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":444,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_259

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":3143,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_260

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":2184,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_261

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":280,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_262

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":201,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_263

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":1364,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_264

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":974,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_265

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":13566,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_266

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":9666,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_267

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":99999,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_268

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":4946,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_269

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":988,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_270

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":407,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_271

{"leadTime":"Unpublished","lifecycleCanonical":"90-Day Warning","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_272

{"leadTime":"Unpublished","lifecycleCanonical":"90-Day Warning","listPrice":1147,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_273

{"leadTime":"Unpublished","lifecycleCanonical":"90-Day Warning","listPrice":5712,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_274

{"leadTime":"Unpublished","lifecycleCanonical":"90-Day Warning","listPrice":445,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_275

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":445,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_276

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":2040,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_277

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":7803,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_278

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":13005,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_279

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":6737,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_280

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":11229,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_281

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":24680,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_282

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":41134,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_283

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":4399,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_284

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1599,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_285

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1099,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_286

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":7196,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_287

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":2990,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_288

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":7803,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_289

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":13005,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_290

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":1599,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_291

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":1099,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_292

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":4399,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_293

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":2990,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_294

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":7196,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_295

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":4946,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_296

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":799,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_297

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":849,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_298

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":999,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_299

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":480,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_300

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":499,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_301

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":499,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_302

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":305,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_303

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":867,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_304

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":1149,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_305

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":1429,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_306

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":96,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_307

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":241,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_308

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":37,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_309

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":63,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_310

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":75,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_311

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":89,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_312

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":213,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_313

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":242,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_314

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":274,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_315

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":182,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_316

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":645,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_317

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":62,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_318

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":178,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_319

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":33,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_320

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":59,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_321

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":106,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_322

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":266,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_323

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":530,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_324

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":134,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_325

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":385,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_326

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":51,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_327

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":41,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_328

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":73,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_329

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":150,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_330

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":69,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_331

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":1108,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_332

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":197,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_333

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":86,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_334

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":210,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_335

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":5252,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_336

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":15755,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_337

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":21006,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_338

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":26258,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_339

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":1313,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_340

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":3939,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_341

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":6564,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_342

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":1284,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_343

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":3851,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_344

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":6419,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_345

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":899,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_346

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":2696,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_347

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":4494,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_348

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":4493,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_349

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":6049,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_350

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":8765,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_351

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":399,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_352

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":469,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_353

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":399,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_354

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":469,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_355

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":467,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_356

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":399,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_357

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":469,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_358

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":20,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_359

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":28,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_360

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":20,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_361

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_362

{"leadTime":"Unpublished","lifecycleCanonical":"90-Day Warning","listPrice":20,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_363

{"leadTime":"Unpublished","lifecycleCanonical":"90-Day Warning","listPrice":28,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_364

{"leadTime":"Unpublished","lifecycleCanonical":"90-Day Warning","listPrice":99999,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_365

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":20,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_366

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":33,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_367

{"leadTime":"Unpublished","lifecycleCanonical":"90-Day Warning","listPrice":33,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_368

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":752,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_369

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":3390,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_370

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":1506,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_371

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":4519,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_372

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":439,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_373

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":1251,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_374

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":879,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_375

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":2637,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_376

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":249,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_377

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":50,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_378

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":445,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_379

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":7733,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_380

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":1147,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_381

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"}

### TEXT_382

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":394,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_383

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":407,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_384

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":6899,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_385

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":948,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_386

{"leadTime":"Unpublished","lifecycleCanonical":"90-Day Warning","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"}

### TEXT_387

{"leadTime":"Unpublished","lifecycleCanonical":"90-Day Warning","listPrice":445,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_388

{"leadTime":"Unpublished","lifecycleCanonical":"90-Day Warning","listPrice":7733,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_389

{"leadTime":"Unpublished","lifecycleCanonical":"90-Day Warning","listPrice":5712,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_390

{"leadTime":"Unpublished","lifecycleCanonical":"90-Day Warning","listPrice":1147,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_391

If HPE DL145 Gen11 Opt ACC FIO Config is selected, then these EDSFF drives cannot be selected with direct attach. (Only controller mode).

### TEXT_392

For More details on Adapter - Transceiver support, please refer to: https://www.hpe.com/psnow/doc/A00002507ENW?jumpid=in_lit-psnow-red (Transceivers, Ethernet PCIe, OCP Ethernet, InfiniBand PCIe)

### TEXT_393

It is recommended to select an Operating System (VMWare Core Editions, MS Windows Server Not Preinstalled, MS Windows Server Preinstalled, Red Hat Operating Systems, SUSE containers, SUSE Operating Systems, Partner Software - Operating System 8pks, Reseller Option Kit)

### TEXT_394

If Military Rugged Kit is selected, then only these permitted/Qualified options are allowed to be selected: (Acoustics, Ambient Temperature, Memory)

### TEXT_395

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":600,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_396

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":806,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_397

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":2180,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_398

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":3630,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_399

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":268,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_400

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":724,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_401

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":1210,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

### TEXT_402

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":1984,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

