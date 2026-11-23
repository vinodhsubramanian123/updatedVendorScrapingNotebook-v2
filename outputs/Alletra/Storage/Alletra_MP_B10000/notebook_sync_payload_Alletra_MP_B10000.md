# HPE Alletra_MP_B10000 — Synchronized Catalog Knowledge

**Target Product**: `Alletra_MP_B10000`

**Scope Identity**: `HPE/STORAGE/Alletra/Storage/Alletra_MP_B10000`

**Sync Timestamp**: 2026-11-23T14:07:47.234Z

**Total Verified SKUs**: `301` (`201` Hardware + `100` Services)

**Total Synced KnowledgeDeltas**: `22`

This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.

---

## 🚀 Executive Delta & Recent Change Summary

| Category | Total SKUs | Added (Last Scrape) | Price Changed | Attribute Changed | Price & Attr Changed | Reinstated | Status |
|----------|------------|---------------------|---------------|-------------------|----------------------|------------|--------|
| **Hardware Components** | 201 | 0 | 0 | 0 | 0 | 0 | **CERTIFIED** |
| **Support Services & SLAs** | 100 | 0 | 0 | 0 | 0 | 0 | **CERTIFIED** |
| **Total Portfolio** | **301** | **0** | **0** | **0** | **0** | **0** | **ACTIVE** |


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

## 🎯 3. Chassis & Solution-Type Gotchas (Alletra_MP_B10000)

*No specific gotchas logged for Alletra_MP_B10000. Baseline chassis layout rules active.*

## 🔒 3b. Physical & Architectural Gating Rules (DOM Unavailable Tables)

### Base Chassis & Form Factor Compatibility Gates

1. **[Controller Node Models]**: Max 2 Chassis
   - **Gated Rule Type**: `CHASSIS_GATE`
   - **Affected SKUs (1)**: `S0U32A`

### Component Mutual Exclusion Rules

1. **[Storage Preferences]**: R7C77A is only supported on rack-less solutions for S0R21A, S0S41A, S0S38A, S0S40A, S0S39A, S0S43A, S4V66A, S4V67A, S0R21B, S0S41B, S4V66B, S4V67B nodes
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `Arcus_ACPower_LowLine_WW_Intl`

2. **[Installation Options]**: Not applicable for S1R06A, S5S40A, R7D02A, R7D03A, S0S42A and S0R20A
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `No_Installation_Services`

3. **[Controller Node Models]**: B series nodes only supported for upgrades
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (8)**: `R7D02B`, `R7D03B`, `S0R20B`, `S0R21B`, `S0S41B`, `S0S42B`, `S4V66B`, `S4V67B`

4. **[Controller Node Models]**: Max quantity of product limited by space available.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (4)**: `S4V66A`, `R7D03A`, `S0R21A`, `S0S38A`

5. **[Controller Node Models]**: TAA isSelected
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (5)**: `S4V67A`, `S0R20A`, `S0S40A`, `S0S41A`, `S0S42A`

6. **[Controller Node Models]**: Hide B10140
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (2)**: `S0S39A`, `S0S43A`

7. **[Power Supplies]**: No Mix PowerSupply
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (3)**: `R7C77A`, `R7C78A`, `R9Z97A`

8. **[Power Supplies]**: If single Phase or threePhase is selected then DC Power Cables not supported 2
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (39)**: `295633-B22`, `AF556A`, `AF568A`, `AF593A`, `P22173-B21`, `P36877-B21`, `P78148-B21`, `P78155-B21`, `P78164-B21`, `R1C66A`, `A0K02A`, `A0N33A`, `AF557A`, `AF558A`, `AF559A`, `AF560A`, `AF561A`, `AF562A`, `AF564A`, `AF565A`, `AF566A`, `AF567A`, `AF569A`, `AF570A`, `AF572A`, `AF573A`, `AF591A`, `P08315-B21`, `P78130-B21`, `P78131-B21`, `P78144-B21`, `P78145-B21`, `P78147-B21`, `P78156-B21`, `P78157-B21`, `P78384-B21`, `P78940-B21`, `P78941-B21`, `R1C65A`

9. **[Power Supplies]**: Breaker Panel can be selected only if R7C78A is selected
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (2)**: `G2H95A`, `Q9N54A`

10. **[Drive Enclosure]**: TAA isSelected
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `S0S46A`

11. **[Drive Enclosure]**: When S1J10A/S0S46A is selected, do not allow R8M59A to be selected
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `R8M59A`

12. **[Drive Enclosure]**: Max quantity of product limited by space available.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (6)**: `S2T35A`, `JL271A`, `Q2F19A`, `R0Z25A`, `R0Z27A`, `R8M61A`

13. **[Drive Enclosure]**: When R7D02A or R7D03A or S0S42A or S0R20A or R7D02B or R7D03B or S0S42B or S0R20B is selected, do not allow R8M59A or R9F77A to be selected (for new configurations and upgrades)
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `R9F77A`

14. **[Capacity]**: Mixing is not allowed for initial configuration.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (4)**: `S1Z68A`, `R9H66A`, `R9H69A`, `R9H68A`

15. **[Capacity]**: Mixing is not allowed for initial configuration.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (2)**: `S3L74A`, `S3L73A`

16. **[Back-End Switches]**: If “dcPowerFlag” is selected then S1S69A not supported
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `S1S69A`

17. **[Back-End Switches]**: S0A95A cannot be ordered with S3V78A/S4Q37A
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (2)**: `S4Q37A`, `S3V78A`

18. **[Software]**: The S0A99AAE / S0A98AAE applicable for the drives configured as Add-ons/upgrades only
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (2)**: `S0A98AAE`, `S0A99AAE`

19. **[Software]**: Max quantity of product limited by space available.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `S0A99A`

20. **[Software]**: This SKU can be selected only when HPE GreenLake = Yes
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `S1S85AAE`

## ⚠️ 4. Discontinued & Obsolete SKUs Registry

*No discontinued or reinstated SKUs detected for Alletra_MP_B10000. All cataloged SKUs are active.*

### ⏳ Impending Obsolescence & Clearance Hardware (90-Day to 180-Day Window)

*These components remain orderable in live configurators today but have published vendor end dates. They represent high-value clearance opportunities for immediate deployments, but require explicit procurement cutoff remarks before quotation:*

| Product # | Description | Category | List Price (USD) | Discontinued Date | Price Trend | Presales Strategy Guidance |
|---|---|---|---:|---|:---:|---|
| `Q9V95C` | HPE SN6650B 32Gb 128/48 48-port 32Gb Short Wave SFP+ Integrated Fibre Channel Switch | Software & Licenses | $2,50,004 | 11/20/2026 | 0.00% | ⚠️ Approaching EOL (11/20/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `R4G55B` | HPE SN3600B 32Gb 24/8 8-port 16Gb Short Wave SFP+ Fibre Channel Switch | Software & Licenses | $13,899 | 02/28/2027 | 0.00% | ⚠️ Approaching EOL (02/28/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `S1R84B` | HPE SN6610C 32Gb 32/24 32Gb Short Wave SFP+ Fibre Channel v2 Switch | Software & Licenses | $37,640 | 10/23/2026 | 0.00% | ⚠️ Approaching EOL (10/23/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `Q9D36A` | HPE SN6610C 32Gb 24-port 16Gb Short Wave SFP+ Fibre Channel Enterprise Switch | Software & Licenses | $29,440 | 10/23/2026 | 0.00% | ⚠️ Approaching EOL (10/23/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `Q9D34A` | HPE SN6610C 32Gb 8-port 16Gb Short Wave SFP+ Fibre Channel Switch | Software & Licenses | $9,530 | 10/23/2026 | 0.00% | ⚠️ Approaching EOL (10/23/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `R4D91A` | HPE SN6630C 32Gb 96-port/48-port 32Gb SFP+ Fibre Channel Switch | Software & Licenses | $1,50,490 | 10/23/2026 | 0.00% | ⚠️ Approaching EOL (10/23/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `S1V09A` | HPE SN6710C 64Gb 24/8 32Gb Short Wave SFP+ Fibre Channel Switch | Software & Licenses | $18,010 | 10/23/2026 | 0.00% | ⚠️ Approaching EOL (10/23/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `S1V09B` | HPE SN6710C 64Gb 24/8 32Gb Short Wave SFP+ Fibre Channel v2 Switch | Software & Licenses | $18,170 | 10/23/2026 | 0.00% | ⚠️ Approaching EOL (10/23/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `S0W94B` | HPE SN6720C 64Gb 48/48 32Gb Short Wave SFP+ Fibre Channel v2 Switch | Software & Licenses | $76,890 | 10/23/2026 | 0.00% | ⚠️ Approaching EOL (10/23/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `S0W94A` | HPE SN6720C 64Gb 48/48 32Gb Short Wave SFP+ Fibre Channel Switch | Software & Licenses | $1,12,910 | 10/23/2026 | 0.00% | ⚠️ Approaching EOL (10/23/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `S1V11B` | HPE SN6720C 64Gb 48/24 32Gb Short Wave SFP+ Fibre Channel v2 Switch | Software & Licenses | $43,010 | 10/23/2026 | 0.00% | ⚠️ Approaching EOL (10/23/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `R0P12A` | HPE SN6620C 32Gb 48/24 Fibre Channel Switch | Software & Licenses | $29,020 | 10/23/2026 | 0.00% | ⚠️ Approaching EOL (10/23/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `S2T79A` | HPE 200GbE 32QSFP56 Power to Connector Airflow Switch SN3700M with NVIDIA Cumulus | Software & Licenses | $56,100 | 04/30/2027 | 0.00% | ⚠️ Approaching EOL (04/30/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `S2T80A` | HPE 100GbE 64QSFP28 Power to Connector Airflow Switch SN4600cM with NVIDIA Cumulus | Software & Licenses | $76,500 | 02/28/2027 | 0.00% | ⚠️ Approaching EOL (02/28/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `K2Q21A` | HPE C-series 3M Passive Copper SFP+ Cable | Cables & Enablement Kits | $467 | 10/23/2026 | 0.00% | ⚠️ Approaching EOL (10/23/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `K2Q22A` | HPE C-series 5M Passive Copper SFP+ Cable | Cables & Enablement Kits | $535 | 10/23/2026 | 0.00% | ⚠️ Approaching EOL (10/23/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `QK701A` | HPE C-series SFP+ to SFP+ Active Copper 7.0m Direct Attach Cable | Cables & Enablement Kits | $1,216 | 10/23/2026 | 0.00% | ⚠️ Approaching EOL (10/23/2026). Valid for immediate builds; verify multi-year roadmaps. |

## 📊 5b. Category-Level Trends & Significant Price Adjustments

### Category Portfolio Delta & Planning Intelligence

| Category | Total SKUs | Added | Modified | Unchanged | Clearance / Drops | Category Planning Insight |
|---|---:|---:|---:|---:|---:|---|
| **Accessories & Infrastructure** | 4 | 0 | 0 | 4 | 0 | Stable portfolio |
| **Storage Controllers** | 10 | 0 | 0 | 10 | 0 | Stable portfolio |
| **Power Supplies** | 4 | 0 | 0 | 4 | 0 | Stable portfolio |
| **Cables & Enablement Kits** | 91 | 0 | 0 | 91 | 0 | Stable portfolio |
| **Software & Licenses** | 48 | 0 | 0 | 48 | 0 | Stable portfolio |
| **Networking** | 31 | 0 | 0 | 31 | 0 | Stable portfolio |
| **Drive Enclosures / Drives** | 12 | 0 | 0 | 12 | 0 | Stable portfolio |
| **Support Services** | 1 | 0 | 0 | 1 | 0 | Stable portfolio |

## 🔄 5. Recent Attribute & Specification Modifications Log

*No attribute or specification changes recorded across catalog snapshots.*

## 🧩 6. Same-Product CTO Variant Matrix

| Chassis Identifier | Product Family | Generation | Form Factor | CTO Base SKU |
|--------------------|----------------|------------|-------------|--------------|
| **Alletra_MP_B10000** | Alletra | Storage | Array | `S0B84A` |

## 📦 9. Solution Manifest, EDT & Commercial Baseline

**Configuration Profile**: `OCA Config 2Icon ID: I158544799-01C2BEDT: 24 - 30 days` | **Icon ID**: `I158544799-01C2B` | **Estimated Delivery Time (EDT)**: `24 - 30 days`

### Structural Field & Evidence Coverage

- **Row Types**: HARDWARE_OPTION: 190, INTERNAL_CONFIGURATION: 14, SUPPORT_SERVICE: 95, SOFTWARE_SUBSCRIPTION: 2
- **Price States**: PRICED: 203, UNPRICED: 98
- **Lead-Time Measurement**: Numeric Days: 166, ETA Date Only: 0, Unpublished: 135
- **Visibility Coverage**: VISIBLE: 227, SELECTOR_HIDDEN: 74

## ⏱️ 10. Supply Chain & Delivery Lead Time Intelligence

### Confirmed Component Delivery SLAs

| Product # | Description | Category | Lead Time | Channel Status |
|---|---|---|---:|---|
| `R7C75A` | HPE Alletra Storage MP 10000 2U Chassis | Accessories & Infrastructure | 3 | Available |
| `R7D02A` | HPE Alletra Storage MP B10230 Controller Node | Storage Controllers | 14 | Available |
| `R7D02B` | HPE Alletra Storage MP B10230 Controller Node Field Upgrade | Storage Controllers | 3 | Not published by OCA |
| `R7D03B` | HPE Alletra Storage MP B10240 Controller Node Field Upgrade | Storage Controllers | 3 | Not published by OCA |
| `S0R21B` | HPE Alletra Storage MP B10130 Controller Node Field Upgrade | Storage Controllers | 3 | Not published by OCA |
| `S4V66B` | HPE Alletra Storage MP B10140 Controller Node Field Upgrade | Storage Controllers | 3 | Not published by OCA |
| `S4V66A` | HPE Alletra Storage MP B10140 Controller Node | Storage Controllers | 3 | Not published by OCA |
| `R7D03A` | HPE Alletra Storage MP B10240 Controller Node | Storage Controllers | 14 | Not published by OCA |
| `S0R21A` | HPE Alletra Storage MP B10130 Controller Node | Storage Controllers | 14 | Not published by OCA |
| `S0S38A` | HPE Alletra Storage MP B10120 Controller Node | Storage Controllers | 14 | Not published by OCA |
| `R7C76A` | HPE Alletra Storage MP C14 1600W AC Power Supply | Power Supplies | 4 | Available |
| `R7C77A` | HPE Alletra Storage MP C20 1500W/1800W AC Power Supply | Power Supplies | 4 | Not published by OCA |
| `R9Z97A` | HPE Alletra Storage MP C14 2200W AC Power Supply | Power Supplies | 14 | Not published by OCA |
| `R7C78A` | HPE Alletra Storage MP 1600W -48VDC Power Supply | Power Supplies | 4 | Not published by OCA |
| `R9R55A` | HPE C13 - Schuko 250V 10Amp EU Power Cord | Cables & Enablement Kits | 3 | Available |
| `R9R66A` | HPE C19 - C20 250V 16Amp Gray 2m WW Power Cord | Cables & Enablement Kits | 3 | Available |
| `R9R67A` | HPE C19 - C20 250V 16Amp Gray 2m IN Power Cord | Cables & Enablement Kits | 3 | Available |
| `R9R68A` | HPE C19 - AS3112 250V 15Amp AU Power Cord | Cables & Enablement Kits | 3 | Available |
| `R9R69A` | HPE C19 - Schuko 250V 16Amp EU Power Cord | Cables & Enablement Kits | 3 | Available |
| `R9R71A` | HPE C19 - NEMA 5-15P 125V 15Amp US Power Cord | Cables & Enablement Kits | 3 | Available |
| `R9R73A` | HPE C19 - JIS8303 125V 16Amp TW/JP Power Cord | Cables & Enablement Kits | 3 | Available |
| `R9R74A` | HPE NEMA L6-30P - C19 250V 20Amp 4.5m US/JP Power Cord | Cables & Enablement Kits | 3 | Available |
| `R9R76A` | HPE C19 - SANS164-1 250V 16Amp ZA Power Cord | Cables & Enablement Kits | 3 | Available |
| `R9R77A` | HPE C19 - SI32 250V 16Amp IL Power Cord | Cables & Enablement Kits | 3 | Available |
| `R9R79A` | HPE C19 - WS-010A 250V 16Amp KR Power Cord | Cables & Enablement Kits | 3 | Available |
| `R9S00A` | HPE C13 - C14 250V 10Amp Gray 1.4m WW Power Cord | Cables & Enablement Kits | 3 | Available |
| `R9S03A` | HPE C19 - C20 250V 16Amp Black 2.5m IN Power Cord | Cables & Enablement Kits | 3 | Available |
| `R9R52A` | HPE C13 - C14 250V 10Amp Black 1.4m WW Power Cord | Cables & Enablement Kits | 8 | Available |
| `R9R53A` | HPE C13 - C14 250V 10Amp Black 1.37m IN Power Cord | Cables & Enablement Kits | 8 | Available |
| `R9R54A` | HPE C13 - AS3112 250V 10Amp AU Power Cord | Cables & Enablement Kits | 8 | Available |
*... [136 additional supply chain records omitted for brevity]*

### ⚠️ Supply Chain Verification Advisory (Unpublished Delivery Lead Times)

*The following high-value active components have unpublished delivery estimates in live OCA. Presales engineers must verify distributor buffer stock before quoting committed deployment timelines:*

| Product # | Description | Category | Lead Time Status | Presales Action |
|---|---|---|:---:|---|
| `S0S39A` | HPE Alletra Storage MP B10140 100GbE Controller Node | Storage Controllers | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `K2Q17A` | HPE SN6010C 48-port 16Gb Fibre Channel Switch | Software & Licenses | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `R0Q97A` | HPE SN6010C 16Gb 12-port 16Gb Short Wave SFP+ Fibre Channel Switch | Software & Licenses | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `K2Q16A` | HPE SN6010C 12-port 16Gb Fibre Channel Switch | Software & Licenses | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `S1R84B` | HPE SN6610C 32Gb 32/24 32Gb Short Wave SFP+ Fibre Channel v2 Switch | Software & Licenses | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `Q9D36A` | HPE SN6610C 32Gb 24-port 16Gb Short Wave SFP+ Fibre Channel Enterprise Switch | Software & Licenses | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `Q9D34A` | HPE SN6610C 32Gb 8-port 16Gb Short Wave SFP+ Fibre Channel Switch | Software & Licenses | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `R4D91A` | HPE SN6630C 32Gb 96-port/48-port 32Gb SFP+ Fibre Channel Switch | Software & Licenses | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `S1V09A` | HPE SN6710C 64Gb 24/8 32Gb Short Wave SFP+ Fibre Channel Switch | Software & Licenses | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `S1V09B` | HPE SN6710C 64Gb 24/8 32Gb Short Wave SFP+ Fibre Channel v2 Switch | Software & Licenses | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `S0W94B` | HPE SN6720C 64Gb 48/48 32Gb Short Wave SFP+ Fibre Channel v2 Switch | Software & Licenses | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `S0W94A` | HPE SN6720C 64Gb 48/48 32Gb Short Wave SFP+ Fibre Channel Switch | Software & Licenses | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `S1V11B` | HPE SN6720C 64Gb 48/24 32Gb Short Wave SFP+ Fibre Channel v2 Switch | Software & Licenses | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `R0P12A` | HPE SN6620C 32Gb 48/24 Fibre Channel Switch | Software & Licenses | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `R9F64A` | HPE Networking CX8325-48Y8C Port-to-Power Airflow 6xFan 2xPSU Switch Bundle | Software & Licenses | **Unpublished** | Verify distributor inventory prior to SLA commitment |
*... [3 additional unpublished items omitted for brevity]*


<!-- MANAGED_FULL_CATALOG -->
Content fingerprint: 94e2d4b7640351b2f2639b68a10647b7100c79f7171a2814f69cd5f1b721e0ee

## Complete workbook text projection

Displayed cell values follow by sheet and original row. Formatting, charts and formulas remain in the Excel artifact. Repeated rows refer to the first identical row and schema; no content is replaced by a fingerprint.

### Category Summary

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Constraint | Min Qty | Max Qty | Total SKUs | Has Rules | Rule Count |
| 2 | Unknown | Connectivity | required | 1 | Required | 0 | No | 0 |
| 3 | Unknown | Change Rack | required | 1 | Required | 0 | No | 0 |
| 4 | Unknown | Power Level Options | required | 1 | Required | 0 | No | 0 |
| 5 | Unknown | Power Watt Options | required | 1 | Required | 0 | No | 0 |
| 6 | Power Cords | PDU Power Cords Options | required | 1 | Required | 0 | No | 0 |
| 7 | Power Cords | Power Cords Length | required | 1 | Required | 0 | No | 0 |
| 8 | Unknown | Installation Options | required | 1 | Required | 0 | No | 0 |
| 9 | Unknown | Shipment Options | required | 1 | Required | 0 | No | 0 |
| 10 | Unknown | Node Chassis | max 3 | 0 | 3 | 0 | No | 0 |
| 11 | Unknown | Node | max 2 | 0 | 2 | 0 | No | 0 |
| 12 | Power Supplies | Power Supplies | max 18 | 0 | 18 | 0 | No | 0 |
| 13 | Power Supplies | Power Cord | max 36 | 0 | 36 | 0 | No | 0 |
| 14 | Power Supplies | Drive Enclosure Options | required | 1 | Required | 0 | No | 0 |
| 15 | Power Supplies | Drive Enclosure | max 8 | 0 | 8 | 0 | No | 0 |
| 16 | Power Supplies | Back-End Connectivity Cables | max 40 | 0 | 40 | 0 | No | 0 |
| 17 | Power Supplies | NVMe SFF FE SSDs | max 192 | 0 | 192 | 0 | No | 0 |
| 18 | Power Supplies | NVMe FE TAA Compliant SSDs | max 192 | 0 | 192 | 0 | No | 0 |
| 19 | Power Supplies | NVMe SFF SED SSDs | max 192 | 0 | 192 | 0 | No | 0 |
| 20 | Power Supplies | NVMe QLC SSDs | max 192 | 0 | 192 | 0 | No | 0 |
| 21 | Power Supplies | BlueTooth Connectivity Kit | max 1 | 0 | 1 | 0 | No | 0 |
| 22 | Rack Options | Rack Accessories | max 1 | 0 | 1 | 0 | No | 0 |
| 23 | Rack Options | D Rack Accessories | max 1 | 0 | 1 | 0 | No | 0 |
| 24 | Rack Options | B-Series Fibre Channel Switches | max 2 | 0 | 2 | 0 | No | 0 |
| 25 | Rack Options | C-Series Fibre Channel Switches | max 2 | 0 | 2 | 0 | No | 0 |
| 26 | Rack Options | M-Series Ethernet Channel Switches | max 2 | 0 | 2 | 0 | No | 0 |
| 27 | Rack Options | Aruba Ethernet Switches | max 2 | 0 | 2 | 0 | No | 0 |
| 28 | Rack Options | Back-End Switches | max 2 | 0 | 2 | 0 | No | 0 |
| 29 | Rack Options | Back-End Switch Rail Kits | max 8 | 0 | 8 | 0 | No | 0 |
| 30 | Cables | Host Cables | no max | 0 | Unlimited | 0 | No | 0 |
| 31 | Cables | Management Cables | no max | 0 | Unlimited | 0 | No | 0 |
| 32 | Cables | DAC Cables | no max | 0 | Unlimited | 0 | No | 0 |
| 33 | Cables | Transceivers | no max | 0 | Unlimited | 0 | No | 0 |
| 34 | Cables | Configuration Indicators | max 2 | 0 | 2 | 0 | No | 0 |
| 35 | Software | Software LTU | max 1 | 0 | 1 | 0 | No | 0 |
| 36 | Accessories &amp; Infrastructure | Accessories &amp; Infrastructure Options | max 1 | 0 | 1 | 3 | Yes | 3 |
| 37 | Storage Controllers | Storage Controllers Options | max 1 | 0 | 1 | 10 | Yes | 13 |
| 38 | Power Supplies | Flex Slot Power Supplies | max 1 | 0 | 1 | 3 | Yes | 4 |
| 39 | Power Supplies | -48VDC Power Supplies &amp; Cable Kits | max 1 | 0 | 1 | 1 | Yes | 2 |
| 40 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | max 1 | 0 | 1 | 36 | Yes | 1 |
| 41 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | 0 | 1 | 39 | Yes | 40 |
| 42 | Software &amp; Licenses | Software LTU | max 1 | 0 | 1 | 148 | Yes | 33 |
| 43 | Networking | Optical Transceivers &amp; DAC Cables | max 1 | 0 | 1 | 31 | Yes | 14 |
| 44 | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | max 1 | 0 | 1 | 6 | Yes | 2 |
| 45 | Drive Enclosures / Drives | SFF Drive Cages &amp; Enablement | max 1 | 0 | 1 | 6 | Yes | 8 |
| 46 | Accessories &amp; Infrastructure | Chassis Infrastructure &amp; Rail Kits | max 1 | 0 | 1 | 1 | Yes | 1 |
| 47 | Cables &amp; Enablement Kits | Cables &amp; Enablement Kits Options | max 1 | 0 | 1 | 13 | Yes | 6 |
| 48 | Support Services | Support Services Options | max 1 | 0 | 1 | 1 | Yes | 2 |
| 49 | Cables &amp; Enablement Kits | PCIe Networking Adapters | max 1 | 0 | 1 | 3 | Yes | 1 |


### All SKUs

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |
| 2 | Accessories &amp; Infrastructure | Accessories &amp; Infrastructure Options | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Accessories &amp; Infrastructure &gt; Accessories &amp; Infrastructure Options | Option Component | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R7C75A | Standard | HPE Alletra Storage MP 10000 2U Chassis | 1 | $13,749.00 |  |  | $13,749.00 |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2029 | [TEXT_1] |
| 3 | Storage Controllers | Storage Controllers Options | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Storage Controllers &gt; Storage Controllers Options | Storage Controller | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R7D02A | Standard | HPE Alletra Storage MP B10230 Controller Node | 2 | $161,269.00 |  |  | $322,538.00 |  | No | Available | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 02/05/2024 | 10/31/2028 | [TEXT_2] |
| 4 | Storage Controllers | Storage Controllers Options | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Storage Controllers &gt; Storage Controllers Options | Storage Controller | max 1 | 0 | 1 | [TEXT_3] | R7D02B | Standard | HPE Alletra Storage MP B10230 Controller Node Field Upgrade | 0 | $209,658.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/04/2025 | 10/31/2031 | [TEXT_4] |
| 5 | Storage Controllers | Storage Controllers Options | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Storage Controllers &gt; Storage Controllers Options | Storage Controller | max 1 | 0 | 1 | [TEXT_5] | R7D03B | Standard | HPE Alletra Storage MP B10240 Controller Node Field Upgrade | 0 | $513,103.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/04/2025 | 10/31/2031 | [TEXT_6] |
| 6 | Storage Controllers | Storage Controllers Options | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Storage Controllers &gt; Storage Controllers Options | Storage Controller | max 1 | 0 | 1 | [TEXT_7] | S0R21B | Standard | HPE Alletra Storage MP B10130 Controller Node Field Upgrade | 0 | $216,051.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/04/2025 | 10/31/2031 | [TEXT_8] |
| 7 | Storage Controllers | Storage Controllers Options | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Storage Controllers &gt; Storage Controllers Options | Storage Controller | max 1 | 0 | 1 | [TEXT_9] | S4V66B | Standard | HPE Alletra Storage MP B10140 Controller Node Field Upgrade | 0 | $495,663.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/04/2025 | 10/31/2031 | [TEXT_10] |
| 8 | Storage Controllers | Storage Controllers Options | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Storage Controllers &gt; Storage Controllers Options | Storage Controller | max 1 | 0 | 1 | [TEXT_11] | S4V66A | Standard | HPE Alletra Storage MP B10140 Controller Node | 0 | $382,014.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 07/07/2025 | 10/31/2028 | [TEXT_12] |
| 9 | Storage Controllers | Storage Controllers Options | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Storage Controllers &gt; Storage Controllers Options | Storage Controller | max 1 | 0 | 1 | [TEXT_13] | R7D03A | Standard | HPE Alletra Storage MP B10240 Controller Node | 0 | $394,684.00 |  |  | NA |  | No | Not published by OCA | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 02/05/2024 | 10/31/2028 | [TEXT_14] |
| 10 | Storage Controllers | Storage Controllers Options | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Storage Controllers &gt; Storage Controllers Options | Storage Controller | max 1 | 0 | 1 | [TEXT_15] | S0R21A | Standard | HPE Alletra Storage MP B10130 Controller Node | 0 | $166,193.00 |  |  | NA |  | No | Not published by OCA | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 10/31/2028 | [TEXT_16] |
| 11 | Storage Controllers | Storage Controllers Options | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Storage Controllers &gt; Storage Controllers Options | Storage Controller | max 1 | 0 | 1 | [TEXT_17] | S0S38A | Standard | HPE Alletra Storage MP B10120 Controller Node | 0 | $72,092.00 |  |  | NA |  | No | Not published by OCA | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 10/31/2028 | [TEXT_18] |
| 12 | Storage Controllers | Storage Controllers Options | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Storage Controllers &gt; Storage Controllers Options | Storage Controller | max 1 | 0 | 1 | Hide B10140 &#124; S0S39A conditional visibility: portal selector activation required (Hide B10140); PORTAL_CONDITIONAL | S0S39A | Standard | HPE Alletra Storage MP B10140 100GbE Controller Node | 0 | $162,410.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 10/02/2023 | 09/30/2025 | [TEXT_19] |
| 13 | Power Supplies | Flex Slot Power Supplies | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Power Supplies &gt; Flex Slot Power Supplies | Power Supply | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R7C76A | Standard | HPE Alletra Storage MP C14 1600W AC Power Supply | 18 | $2,327.00 |  |  | $41,886.00 |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_20] |
| 14 | Power Supplies | Flex Slot Power Supplies | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Power Supplies &gt; Flex Slot Power Supplies | Power Supply | max 1 | 0 | 1 | [TEXT_21] | R7C77A | Standard | HPE Alletra Storage MP C20 1500W/1800W AC Power Supply | 0 | $9,869.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_22] |
| 15 | Power Supplies | Flex Slot Power Supplies | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Power Supplies &gt; Flex Slot Power Supplies | Power Supply | max 1 | 0 | 1 | [TEXT_23] | R9Z97A | Standard | HPE Alletra Storage MP C14 2200W AC Power Supply | 0 | $3,332.00 |  |  | NA |  | No | Not published by OCA | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 10/02/2023 | 12/31/2032 | [TEXT_24] |
| 16 | Power Supplies | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Power Supplies &gt; -48VDC Power Supplies &amp; Cable Kits | Power Supply | max 1 | 0 | 1 | [TEXT_25] | R7C78A | Standard | HPE Alletra Storage MP 1600W -48VDC Power Supply | 0 | $11,842.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/02/2023 | 12/31/2032 | [TEXT_26] |
| 17 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9R55A | Standard | HPE C13 - Schuko 250V 10Amp EU Power Cord | 0 | $64.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_27] |
| 18 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9R66A | Standard | HPE C19 - C20 250V 16Amp Gray 2m WW Power Cord | 0 | $17.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_28] |
| 19 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9R67A | Standard | HPE C19 - C20 250V 16Amp Gray 2m IN Power Cord | 0 | $109.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_29] |
| 20 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9R68A | Standard | HPE C19 - AS3112 250V 15Amp AU Power Cord | 0 | $67.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_30] |
| 21 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9R69A | Standard | HPE C19 - Schuko 250V 16Amp EU Power Cord | 0 | $82.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_31] |
| 22 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9R71A | Standard | HPE C19 - NEMA 5-15P 125V 15Amp US Power Cord | 0 | $90.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_32] |
| 23 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9R73A | Standard | HPE C19 - JIS8303 125V 16Amp TW/JP Power Cord | 0 | $72.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_33] |
| 24 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9R74A | Standard | HPE NEMA L6-30P - C19 250V 20Amp 4.5m US/JP Power Cord | 0 | $230.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_34] |
| 25 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9R76A | Standard | HPE C19 - SANS164-1 250V 16Amp ZA Power Cord | 0 | $119.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_35] |
| 26 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9R77A | Standard | HPE C19 - SI32 250V 16Amp IL Power Cord | 0 | $54.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_36] |
| 27 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9R79A | Standard | HPE C19 - WS-010A 250V 16Amp KR Power Cord | 0 | $82.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_31] |
| 28 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9S00A | Standard | HPE C13 - C14 250V 10Amp Gray 1.4m WW Power Cord | 9 | $23.00 |  |  | $207.00 |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_37] |
| 29 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9S03A | Standard | HPE C19 - C20 250V 16Amp Black 2.5m IN Power Cord | 0 | $92.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_38] |
| 30 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9R52A | Standard | HPE C13 - C14 250V 10Amp Black 1.4m WW Power Cord | 9 | $83.00 |  |  | $747.00 |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_39] |
| 31 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9R53A | Standard | HPE C13 - C14 250V 10Amp Black 1.37m IN Power Cord | 0 | $59.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_40] |
| 32 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9R54A | Standard | HPE C13 - AS3112 250V 10Amp AU Power Cord | 0 | $196.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_41] |
| 33 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9R56A | Standard | HPE C13 - BS1363 250V 10Amp UK Power Cord | 0 | $36.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_42] |
| 34 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9R57A | Standard | HPE C13 - NEMA 5-15P 250V 10Amp US Power Cord | 0 | $21.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_43] |
| 35 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9R58A | Standard | HPE C13 - GB2099 250V 10Amp CN Power Cord | 0 | $26.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_44] |
| 36 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9R59A | Standard | HPE C13 - JIS8303 125V 11Amp TW/JP Power Cord | 0 | $148.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_45] |
| 37 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9R60A | Standard | HPE C13 - JIS8303 6-15P 250V 12Amp JP Power Cord | 0 | $43.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_46] |
| 38 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9R61A | Standard | HPE C13 - IN1293 250V 16Amp IN Power Cord | 0 | $61.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_47] |
| 39 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9R62A | Standard | HPE C13 - SANS164-1 250V 16Amp ZA Power Cord | 0 | $21.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_48] |
| 40 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9R63A | Standard | HPE C13 - SI32 250V 16Amp IL Power Cord | 0 | $24.00 |  |  | NA |  | No | Available | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_49] |
| 41 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9R64A | Standard | HPE C13 - CEI23-16 250V 10Amp IT Power Cord | 0 | $29.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_50] |
| 42 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9R65A | Standard | HPE C13 - WS-010A 250V 10Amp KR Power Cord | 0 | $31.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_51] |
| 43 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9R70A | Standard | HPE C19 - BS1363 250V 13Amp UK Power Cord | 0 | $90.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_52] |
| 44 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9R72A | Standard | HPE C19 - GB2099 250V 16Amp CN Power Cord | 0 | $53.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_53] |
| 45 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9R75A | Standard | HPE C19 - IN1293 250V 16Amp IN Power Cord | 0 | $60.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_54] |
| 46 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9R78A | Standard | HPE C19 - CEI23-16 250V 16Amp IT Power Cord | 0 | $113.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_55] |
| 47 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9S01A | Standard | HPE C13 - C14 250V 10Amp Gray 1.37m IN Power Cord | 0 | $59.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_40] |
| 48 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9S02A | Standard | HPE C19 - C20 250V 16Amp Black 2.5m WW Power Cord | 0 | $17.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_56] |
| 49 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | S3L68A | Standard | HPE C13 - C14 250V 10Amp Black 2m WW Power Cord | 0 | $23.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 02/05/2024 | 12/31/2032 | [TEXT_57] |
| 50 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | S3L69A | Standard | HPE C13 - C14 250V 10Amp Gray 2m WW Power Cord | 0 | $123.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 02/05/2024 | 12/31/2032 | [TEXT_58] |
| 51 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | S3L70A | Standard | HPE C13 - C14 250V 10Amp Black 2m IN Power Cord | 0 | $76.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 02/05/2024 | 12/31/2032 | [TEXT_59] |
| 52 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Power Cords &amp; Jumper Cables | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | S3L71A | Standard | HPE C13 - C14 250V 10Amp Gray 2m IN Power Cord | 0 | $72.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 02/05/2024 | 12/31/2032 | [TEXT_60] |
| 53 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_61] | 295633-B22 | Standard | [TEXT_62] | 0 | $102.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 01/12/2004 | 08/31/2028 | [TEXT_63] |
| 54 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_64] | AF556A | Standard | [TEXT_65] | 0 | $55.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 03/26/2007 | 07/31/2029 | [TEXT_66] |
| 55 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_67] | AF568A | Standard | [TEXT_68] | 0 | $71.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 11/13/2006 | 11/30/2031 | [TEXT_69] |
| 56 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_70] | AF593A | Standard | [TEXT_71] | 0 | $97.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/30/2009 | 08/31/2028 | [TEXT_72] |
| 57 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_73] | P22173-B21 | Standard | [TEXT_74] | 0 | $818.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 12/07/2020 | 07/31/2028 | [TEXT_75] |
| 58 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_76] | P36877-B21 | Standard | [TEXT_77] | 0 | $135.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 12/07/2020 | 07/31/2029 | [TEXT_78] |
| 59 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_79] | P78148-B21 | Standard | [TEXT_80] | 0 | $135.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 02/03/2025 | 08/31/2028 | [TEXT_81] |
| 60 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_82] | P78155-B21 | Standard | [TEXT_83] | 0 | $114.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 02/03/2025 | 08/31/2028 | [TEXT_84] |
| 61 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_85] | P78164-B21 | Standard | [TEXT_86] | 0 | $174.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 02/03/2025 | 08/31/2028 | [TEXT_87] |
| 62 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_88] | R1C66A | Standard | [TEXT_89] | 0 | $88.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 12/03/2018 | 11/30/2031 | [TEXT_90] |
| 63 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_91] | A0K02A | Standard | [TEXT_92] | 0 | $34.00 |  |  | NA |  | No | Not published by OCA | 21 | 21 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 08/30/2011 | 10/31/2031 | [TEXT_93] |
| 64 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_94] | A0N33A | Standard | [TEXT_95] | 0 | $78.00 |  |  | NA |  | No | Not published by OCA | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 08/30/2011 | 10/31/2031 | [TEXT_96] |
| 65 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_97] | AF557A | Standard | [TEXT_98] | 0 | $156.00 |  |  | NA |  | No | Not published by OCA | 21 | 21 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/29/2006 | 11/30/2031 | [TEXT_99] |
| 66 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_100] | AF558A | Standard | [TEXT_101] | 0 | $65.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 06/30/2006 | 07/31/2029 | [TEXT_102] |
| 67 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_103] | AF559A | Standard | [TEXT_104] | 0 | $55.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/13/2008 | 07/31/2029 | [TEXT_105] |
| 68 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_106] | AF560A | Standard | [TEXT_107] | 0 | $55.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/29/2006 | 07/31/2029 | [TEXT_105] |
| 69 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_108] | AF561A | Standard | [TEXT_109] | 0 | $55.00 |  |  | NA |  | No | Not published by OCA | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/29/2006 | 07/31/2029 | [TEXT_110] |
| 70 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_111] | AF562A | Standard | [TEXT_112] | 0 | $194.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 05/29/2006 | 11/30/2031 | [TEXT_113] |
| 71 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_114] | AF564A | Standard | [TEXT_115] | 0 | $55.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 12/15/2006 | 07/31/2029 | [TEXT_105] |
| 72 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_116] | AF565A | Standard | [TEXT_117] | 0 | $55.00 |  |  | NA |  | No | Not published by OCA | 11 | 11 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 12/15/2006 | 07/31/2029 | [TEXT_118] |
| 73 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_119] | AF566A | Standard | [TEXT_120] | 0 | $55.00 |  |  | NA |  | No | Not published by OCA | 11 | 11 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 11/13/2006 | 07/31/2029 | [TEXT_118] |
| 74 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_121] | AF567A | Standard | [TEXT_122] | 0 | $65.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 11/14/2006 | 07/31/2029 | [TEXT_102] |
| 75 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_123] | AF569A | Standard | [TEXT_124] | 0 | $65.00 |  |  | NA |  | No | Not published by OCA | 11 | 11 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 11/13/2006 | 07/31/2029 | [TEXT_125] |
| 76 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_126] | AF570A | Standard | [TEXT_127] | 0 | $55.00 |  |  | NA |  | No | Not published by OCA | 13 | 13 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/06/2011 | 07/31/2029 | [TEXT_128] |
| 77 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_129] | AF572A | Standard | [TEXT_130] | 0 | $60.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/06/2011 | 07/31/2029 | [TEXT_131] |
| 78 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_132] | AF573A | Standard | [TEXT_133] | 0 | $38.00 |  |  | NA |  | No | Not published by OCA | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 07/09/2007 | 10/31/2031 | [TEXT_134] |
| 79 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_135] | AF591A | Standard | [TEXT_136] | 0 | $49.00 |  |  | NA |  | No | Not published by OCA | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 07/14/2008 | 11/30/2031 | [TEXT_137] |
| 80 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_138] | P08315-B21 | Standard | [TEXT_139] | 0 | $17.00 |  |  | NA |  | No | Not published by OCA | 21 | 21 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/22/2018 | 07/31/2029 | [TEXT_140] |
| 81 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_141] | P78130-B21 | Standard | [TEXT_142] | 0 | $10.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 02/03/2025 | 08/31/2028 | [TEXT_143] |
| 82 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_144] | P78131-B21 | Standard | [TEXT_145] | 0 | $10.00 |  |  | NA |  | No | Not published by OCA | 21 | 21 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 02/03/2025 | 08/31/2028 | [TEXT_146] |
| 83 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_147] | P78144-B21 | Standard | [TEXT_148] | 0 | $46.00 |  |  | NA |  | No | Not published by OCA | 21 | 21 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 02/03/2025 | 08/31/2028 | [TEXT_149] |
| 84 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_150] | P78145-B21 | Standard | [TEXT_151] | 0 | $11.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 02/03/2025 | 07/31/2029 | [TEXT_152] |
| 85 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_153] | P78147-B21 | Standard | [TEXT_154] | 0 | $77.00 |  |  | NA |  | No | Not published by OCA | 21 | 21 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 02/03/2025 | 08/31/2028 | [TEXT_155] |
| 86 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_156] | P78156-B21 | Standard | [TEXT_157] | 0 | $14.00 |  |  | NA |  | No | Not published by OCA | 21 | 21 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 02/03/2025 | 08/31/2028 | [TEXT_158] |
| 87 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_159] | P78157-B21 | Standard | [TEXT_160] | 0 | $72.00 |  |  | NA |  | No | Not published by OCA | 21 | 21 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 02/03/2025 | 08/31/2028 | [TEXT_161] |
| 88 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_162] | P78384-B21 | Standard | [TEXT_163] | 0 | $20.00 |  |  | NA |  | No | Not published by OCA | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 02/03/2025 | 08/31/2028 | [TEXT_164] |
| 89 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_165] | P78940-B21 | Standard | [TEXT_166] | 0 | $130.00 |  |  | NA |  | No | Not published by OCA | 21 | 21 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 02/03/2025 | 08/31/2028 | [TEXT_167] |
| 90 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_168] | P78941-B21 | Standard | [TEXT_169] | 0 | $110.00 |  |  | NA |  | No | Not published by OCA | 21 | 21 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 02/03/2025 | 08/31/2028 | [TEXT_170] |
| 91 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; -48VDC Power Supplies &amp; Cable Kits | Cable Kit | max 1 | 0 | 1 | [TEXT_171] | R1C65A | Standard | [TEXT_172] | 0 | $119.00 |  |  | NA |  | No | Not published by OCA | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 12/03/2018 | 11/30/2031 | [TEXT_173] |
| 92 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Operating System / License | max 1 | 0 | 1 | [TEXT_174] | G2H95A | Standard | E-T-A S541 2x16 Output DC Breaker Panels | 0 | $5,682.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 12/12/2013 | 11/30/2031 | [TEXT_175] |
| 93 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Operating System / License | max 1 | 0 | 1 | [TEXT_176] | Q9N54A | Standard | E-T-A 6401 Two Grounding Bars w/ Screws | 0 | $196.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 12/01/2017 | 11/30/2031 | [TEXT_177] |
| 94 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Drive Cage / Drive | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | S1J10A | CTO | HPE Alletra Storage MP 10001 NVMe Configure-to-order Expansion Shelf | 8 | $19,654.00 |  |  | $157,232.00 |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/02/2023 | 12/31/2032 | [TEXT_178] |
| 95 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | S2T38A | Standard | HPE Storage 100GbE QSFP28 to QSFP28 5m Extended Temperature Active Optical Cable | 0 | $2,999.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 02/05/2024 | 07/31/2029 | [TEXT_179] |
| 96 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | S2T39A | Standard | HPE Storage 100GbE QSFP28 to QSFP28 10m Extended Temperature Active Optical Cable | 0 | $3,099.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 02/05/2024 | 07/31/2029 | [TEXT_180] |
| 97 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | S2T40A | Standard | HPE Storage 100GbE QSFP28 to QSFP28 15m Extended Temperature Active Optical Cable | 0 | $3,199.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 02/05/2024 | 07/31/2029 | [TEXT_181] |
| 98 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | S2T41A | Standard | HPE Storage 100GbE QSFP28 to QSFP28 25m Extended Temperature Active Optical Cable | 0 | $3,399.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 02/05/2024 | 07/31/2029 | [TEXT_182] |
| 99 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9F76A | Standard | HPE Aruba Networking 100G QSFP28 to QSFP28 2m Active Optical Cable | 36 | $2,649.00 |  |  | $95,364.00 |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/06/2021 | 12/31/2029 | [TEXT_183] |
| 100 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9F79A | Standard | HPE Aruba Networking 100G QSFP28 to QSFP28 7m Active Optical Cable | 0 | $2,739.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/06/2021 | 12/31/2029 | [TEXT_184] |
| 101 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9F80A | Standard | HPE Aruba Networking 100G QSFP28 to QSFP28 15m Active Optical Cable | 0 | $2,959.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/06/2021 | 12/31/2029 | [TEXT_185] |
| 102 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9F81A | Standard | HPE Aruba Networking 100G QSFP28 to QSFP28 30m Active Optical Cable | 0 | $2,959.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/06/2021 | 12/31/2029 | [TEXT_185] |
| 103 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | S6B63A | Standard | HPE 100GbE QSFP28 2m Extended Temperature Active Optical Cable | 0 | $2,914.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/06/2025 | 03/31/2031 | [TEXT_186] |
| 104 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 1 | 0 | 1 | [TEXT_187] | R8M59A | Standard | HPE 100Gb QSFP28 to QSFP28 0.5m Direct Attach Copper Cable | 0 | $250.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 02/07/2022 | 12/31/2028 | [TEXT_188] |
| 105 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 1 | 0 | 1 | [TEXT_189] | S2T35A | Standard | HPE Storage 100GbE QSFP28 SR4 Extended Temperature Pull Tab Transceiver | 0 | $3,299.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 02/05/2024 | 07/31/2029 | [TEXT_190] |
| 106 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 1 | 0 | 1 | [TEXT_191] | JL271A | Standard | HPE Networking X240 100G QSFP28 1m DAC Cable | 0 | $578.00 |  |  | NA |  | No | Not published by OCA | 12 | 12 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 08/01/2016 | 12/31/2099 | [TEXT_192] |
| 107 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 1 | 0 | 1 | [TEXT_193] | Q2F19A | Standard | HPE 100GbE QSFP28 SR4 100m Transceiver | 0 | $2,425.00 |  |  | NA |  | No | Not published by OCA | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 09/25/2017 | 12/31/2028 | [TEXT_194] |
| 108 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 1 | 0 | 1 | [TEXT_195] | R0Z25A | Standard | HPE Aruba Networking 100G QSFP28 to QSFP28 1m Direct Attach Copper Cable | 0 | $515.00 |  |  | NA |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 05/06/2019 | 12/31/2099 | [TEXT_196] |
| 109 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 1 | 0 | 1 | [TEXT_197] | R0Z27A | Standard | HPE Aruba Networking 100G QSFP28 to QSFP28 7m Active Optical Cable | 0 | $2,739.00 |  |  | NA |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 09/08/2020 | 12/31/2099 | [TEXT_184] |
| 110 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 1 | 0 | 1 | [TEXT_198] | R8M61A | Standard | HPE 100GbE QSFP28 LC DR1 500m 1-pack Transceiver | 0 | $2,650.00 |  |  | NA |  | No | Not published by OCA | 56 | 56 | Constrained / Long Lead Time (&gt;45d) | OCA row attribute | Unpublished | Active | 02/07/2022 | 12/31/2028 | [TEXT_199] |
| 111 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 1 | 0 | 1 | [TEXT_200] | R9F77A | Standard | HPE Aruba Networking 100G QSFP28 to QSFP28 1m Direct Attach Copper Cable | 0 | $515.00 |  |  | NA |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/06/2021 | 12/31/2029 | [TEXT_196] |
| 112 | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Drive Enclosures / Drives &gt; Solid State Drives (NVMe/SAS/SATA) | Drive Cage / Drive | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9H71B | Standard | HPE Alletra Storage MP 3.84TB NVMe Read Intensive FIPS 140-3 Encrypted SSD | 0 | $58,713.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/04/2025 | 12/31/2029 | [TEXT_201] |
| 113 | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Drive Enclosures / Drives &gt; Solid State Drives (NVMe/SAS/SATA) | Drive Cage / Drive | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9H70B | Standard | HPE Alletra Storage MP 1.92TB NVMe Read Intensive FIPS 140-3 Encrypted SSD | 0 | $39,720.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/04/2025 | 12/31/2029 | [TEXT_202] |
| 114 | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Drive Enclosures / Drives &gt; Solid State Drives (NVMe/SAS/SATA) | Drive Cage / Drive | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9H73B | Standard | HPE Alletra Storage MP 15.36TB NVMe Read Intensive FIPS 140-3 Encrypted SSD | 0 | $235,872.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/04/2025 | 12/31/2029 | [TEXT_203] |
| 115 | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Drive Enclosures / Drives &gt; Solid State Drives (NVMe/SAS/SATA) | Drive Cage / Drive | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9H72B | Standard | HPE Alletra Storage MP 7.68TB NVMe Read Intensive FIPS 140-3 Encrypted SSD | 0 | $131,890.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/04/2025 | 12/31/2029 | [TEXT_204] |
| 116 | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Drive Enclosures / Drives &gt; Solid State Drives (NVMe/SAS/SATA) | Drive Cage / Drive | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | S4P49A | Standard | HPE Alletra Storage MP 30.72TB NVMe SFF FIPS Encrypted SSD | 0 | $376,435.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 06/02/2025 | 01/31/2028 | [TEXT_205] |
| 117 | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Drive Enclosures / Drives &gt; Solid State Drives (NVMe/SAS/SATA) | Drive Cage / Drive | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9H67A | Standard | HPE Alletra Storage MP 3.84TB NVMe SFF Self-encrypting SSD | 192 | $53,373.00 |  |  | $10,247,616.00 |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 01/08/2024 | 12/31/2029 | [TEXT_206] |
| 118 | Drive Enclosures / Drives | SFF Drive Cages &amp; Enablement | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Drive Enclosures / Drives &gt; SFF Drive Cages &amp; Enablement | Drive Cage / Drive | max 1 | 0 | 1 | [TEXT_207] | S1Z68A | Standard | HPE Alletra Storage MP 30.72TB NVMe SFF Self-encrypting SSD                       Max 192 drive supported | 0 | $342,214.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 11/30/2023 | 01/31/2028 | [TEXT_208] |
| 119 | Drive Enclosures / Drives | SFF Drive Cages &amp; Enablement | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Drive Enclosures / Drives &gt; SFF Drive Cages &amp; Enablement | Drive Cage / Drive | max 1 | 0 | 1 | [TEXT_209] | R9H66A | Standard | HPE Alletra Storage MP 1.92TB NVMe SFF Self-encrypting SSD                       Max 192 drive supported | 0 | $36,109.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 01/08/2024 | 12/31/2029 | [TEXT_210] |
| 120 | Drive Enclosures / Drives | SFF Drive Cages &amp; Enablement | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Drive Enclosures / Drives &gt; SFF Drive Cages &amp; Enablement | Drive Cage / Drive | max 1 | 0 | 1 | [TEXT_211] | R9H69A | Standard | HPE Alletra Storage MP 15.36TB NVMe SFF Self-encrypting SSD                       Max 192 drive supported | 0 | $214,426.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 01/08/2024 | 12/31/2029 | [TEXT_212] |
| 121 | Drive Enclosures / Drives | SFF Drive Cages &amp; Enablement | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Drive Enclosures / Drives &gt; SFF Drive Cages &amp; Enablement | Drive Cage / Drive | max 1 | 0 | 1 | [TEXT_213] | R9H68A | Standard | HPE Alletra Storage MP 7.68TB NVMe SFF Self-encrypting SSD                       Max 192 drive supported | 0 | $119,901.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 01/08/2024 | 12/31/2029 | [TEXT_214] |
| 122 | Drive Enclosures / Drives | SFF Drive Cages &amp; Enablement | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Drive Enclosures / Drives &gt; SFF Drive Cages &amp; Enablement | Drive Cage / Drive | max 1 | 0 | 1 | [TEXT_215] | S3L74A | Standard | HPE Alletra Storage MP 30.72TB NVMe SFF QLC SSD                       Max 192 drive supported | 0 | $241,214.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/07/2024 | 09/30/2027 | [TEXT_216] |
| 123 | Drive Enclosures / Drives | SFF Drive Cages &amp; Enablement | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Drive Enclosures / Drives &gt; SFF Drive Cages &amp; Enablement | Drive Cage / Drive | max 1 | 0 | 1 | [TEXT_217] | S3L73A | Standard | HPE Alletra Storage MP 15.36TB NVMe SFF QLC SSD                       Max 192 drive supported | 0 | $126,796.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 10/07/2024 | 09/30/2027 | [TEXT_218] |
| 124 | Accessories &amp; Infrastructure | Accessories &amp; Infrastructure Options | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Accessories &amp; Infrastructure &gt; Accessories &amp; Infrastructure Options | Option Component | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | S0U79A | Standard | HPE Alletra Storage MP CDM Bluetooth Connect Kit | 1 | $197.00 |  |  | $197.00 |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_219] |
| 125 | Accessories &amp; Infrastructure | Accessories &amp; Infrastructure Options | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Accessories &amp; Infrastructure &gt; Accessories &amp; Infrastructure Options | Option Component | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | Q1H95A | Standard | HPE Storage 1U Rack Accessories Kit | 0 | $166.00 |  |  | NA |  | No | Available | 9 | 9 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 06/05/2017 | 12/31/2029 | [TEXT_220] |
| 126 | Accessories &amp; Infrastructure | Chassis Infrastructure &amp; Rail Kits | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Accessories &amp; Infrastructure &gt; Chassis Infrastructure &amp; Rail Kits | Chassis Infrastructure | max 1 | 0 | 1 | Selection constraint for Chassis Infrastructure &amp; Rail Kits: max 1 | S3L59A | Standard | HPE Alletra Storage MP Destination Rack 2U Rail Kit | 0 | $1,995.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/05/2024 | 12/31/2032 | [TEXT_221] |
| 127 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | SAN Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | S5A95A | Standard | HPE Storage 64Gb 24/8 8-port 64Gb Short Wave SFP56 Switch B-series SN3700B | 0 | $28,797.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 02/03/2025 | 03/31/2029 | [TEXT_222] |
| 128 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | SAN Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R8P28A | Standard | HPE SN3600B 32Gb 24/24 Power Pack+ 24-port 32Gb Short Wave SFP28 Fibre Channel Switch | 0 | $54,376.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/07/2021 | 07/31/2027 | [TEXT_223] |
| 129 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | SAN Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | S5A94A | Standard | HPE Storage 64Gb 24/8 8-port 32Gb Short Wave SFP28 Switch B-series SN3700B | 0 | $23,835.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 02/03/2025 | 03/31/2029 | [TEXT_224] |
| 130 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | SAN Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R7M13A | Standard | HPE SN6700B 64Gb 56/24 24-port 64Gb Short Wave SFP56 Fibre Channel Switch | 0 | $85,981.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 06/07/2021 | 11/30/2029 | [TEXT_225] |
| 131 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | SAN Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R8P29A | Standard | HPE SN3600B 32Gb 24/24 Power Pack+ 24-port 16Gb Short Wave SFP+ Fibre Channel Switch | 0 | $43,250.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/07/2021 | 07/31/2027 | [TEXT_226] |
| 132 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | SAN Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R6B06A | Standard | HPE SN6700B 64Gb 56/24 24-port 32Gb Short Wave SFP28 Port Side Intake Integrated FC Switch | 0 | $76,563.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 12/07/2020 | 11/30/2029 | [TEXT_227] |
| 133 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | SAN Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | Q9V95C | Standard | HPE SN6650B 32Gb 128/48 48-port 32Gb Short Wave SFP+ Integrated Fibre Channel Switch | 0 | $250,004.00 |  |  | NA |  | No | Obsolete (OB) | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Obsolete (OB) | 12/07/2020 | 11/20/2026 | [TEXT_228] |
| 134 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | SAN Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R8U62A | Standard | HPE SN6750B 64Gb 48/128 48-port 64Gb Short Wave SFP56 Port Side Intake Integrated FC Switch | 0 | $365,694.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 07/05/2022 | 04/30/2028 | [TEXT_229] |
| 135 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | SAN Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R7R97A | Standard | HPE SN3600B 32Gb 24/8 8-port 32Gb Short Wave SFP28 Fibre Channel Switch | 0 | $19,746.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 06/07/2021 | 07/31/2027 | [TEXT_230] |
| 136 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | SAN Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R7M14A | Standard | HPE SN6700B 64Gb 56/24 24-port 64Gb Short Wave SFP56 Port Side Intake Integrated FC Switch | 0 | $85,981.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 06/07/2021 | 11/30/2029 | [TEXT_225] |
| 137 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | SAN Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R4G55B | Standard | HPE SN3600B 32Gb 24/8 8-port 16Gb Short Wave SFP+ Fibre Channel Switch | 0 | $13,899.00 |  |  | NA |  | No | EOL Warning (90-Day) | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | EOL Warning (90-Day) | 09/07/2021 | 02/28/2027 | [TEXT_231] |
| 138 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | SAN Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R6B05A | Standard | HPE SN6700B 64Gb 56/24 24-port 32Gb Short Wave SFP28 Integrated Fibre Channel Switch | 0 | $76,563.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 12/07/2020 | 11/30/2029 | [TEXT_227] |
| 139 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | SAN Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R8U61A | Standard | HPE SN6750B 64Gb 48/128 48-port 64Gb Short Wave SFP56 Integrated Fibre Channel Switch | 0 | $367,245.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 07/05/2022 | 04/30/2028 | [TEXT_232] |
| 140 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | SAN Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | K2Q17A | Standard | HPE SN6010C 48-port 16Gb Fibre Channel Switch | 0 | $25,339.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/01/2014 | 08/31/2025 | [TEXT_233] |
| 141 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | SAN Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R0Q97A | Standard | HPE SN6010C 16Gb 12-port 16Gb Short Wave SFP+ Fibre Channel Switch | 0 | $13,300.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/03/2019 | 08/31/2025 | [TEXT_234] |
| 142 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | SAN Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | K2Q16A | Standard | HPE SN6010C 12-port 16Gb Fibre Channel Switch | 0 | $6,278.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/01/2014 | 08/31/2025 | [TEXT_235] |
| 143 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | SAN Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | S1R84B | Standard | HPE SN6610C 32Gb 32/24 32Gb Short Wave SFP+ Fibre Channel v2 Switch | 0 | $37,640.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/05/2023 | 10/23/2026 | [TEXT_236] |
| 144 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | SAN Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | Q9D36A | Standard | HPE SN6610C 32Gb 24-port 16Gb Short Wave SFP+ Fibre Channel Enterprise Switch | 0 | $29,440.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 07/02/2018 | 10/23/2026 | [TEXT_237] |
| 145 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | SAN Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | Q9D34A | Standard | HPE SN6610C 32Gb 8-port 16Gb Short Wave SFP+ Fibre Channel Switch | 0 | $9,530.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 07/02/2018 | 10/23/2026 | [TEXT_238] |
| 146 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | SAN Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R4D91A | Standard | HPE SN6630C 32Gb 96-port/48-port 32Gb SFP+ Fibre Channel Switch | 0 | $150,490.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 03/02/2020 | 10/23/2026 | [TEXT_239] |
| 147 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | SAN Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | S1V09A | Standard | HPE SN6710C 64Gb 24/8 32Gb Short Wave SFP+ Fibre Channel Switch | 0 | $18,010.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 08/07/2023 | 10/23/2026 | [TEXT_240] |
| 148 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | SAN Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | S1V09B | Standard | HPE SN6710C 64Gb 24/8 32Gb Short Wave SFP+ Fibre Channel v2 Switch | 0 | $18,170.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 08/07/2023 | 10/23/2026 | [TEXT_241] |
| 149 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | SAN Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | S0W94B | Standard | HPE SN6720C 64Gb 48/48 32Gb Short Wave SFP+ Fibre Channel v2 Switch | 0 | $76,890.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/05/2023 | 10/23/2026 | [TEXT_242] |
| 150 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | SAN Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | S0W94A | Standard | HPE SN6720C 64Gb 48/48 32Gb Short Wave SFP+ Fibre Channel Switch | 0 | $112,910.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 03/06/2023 | 10/23/2026 | [TEXT_243] |
| 151 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | SAN Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | S1V11B | Standard | HPE SN6720C 64Gb 48/24 32Gb Short Wave SFP+ Fibre Channel v2 Switch | 0 | $43,010.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 08/07/2023 | 10/23/2026 | [TEXT_244] |
| 152 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | SAN Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R0P12A | Standard | HPE SN6620C 32Gb 48/24 Fibre Channel Switch | 0 | $29,020.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/03/2018 | 10/23/2026 | [TEXT_245] |
| 153 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Network Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | S2T79A | Standard | HPE 200GbE 32QSFP56 Power to Connector Airflow Switch SN3700M with NVIDIA Cumulus | 0 | $56,100.00 |  |  | NA |  | No | Available | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/06/2024 | 04/30/2027 | [TEXT_246] |
| 154 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Network Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | S2T80A | Standard | HPE 100GbE 64QSFP28 Power to Connector Airflow Switch SN4600cM with NVIDIA Cumulus | 0 | $76,500.00 |  |  | NA |  | No | Direct Ship (DS) | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Direct Ship (DS) | 03/04/2024 | 02/28/2027 | [TEXT_247] |
| 155 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Network Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | S2T81A | Standard | HPE 400GbE 32QSFPDD Power to Connector Airflow Switch SN4700M with NVIDIA Cumulus | 0 | $100,500.00 |  |  | NA |  | No | Available | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/06/2024 | 07/31/2029 | [TEXT_248] |
| 156 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Network Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9F64A | Standard | HPE Networking CX8325-48Y8C Port-to-Power Airflow 6xFan 2xPSU Switch Bundle | 0 | $50,377.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/06/2021 | 12/31/2029 | [TEXT_249] |
| 157 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Network Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9F65A | Standard | HPE Networking CX8325-48Y8C Power-to-Port Airflow 6xFan 2xPSU Switch Bundle | 0 | $50,377.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/06/2021 | 12/31/2029 | [TEXT_249] |
| 158 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Network Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9F66A | Standard | HPE Networking CX8325-32C Port-to-Power Airflow 6xFan 2xPSU Switch Bundle | 0 | $52,688.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/06/2021 | 12/31/2029 | [TEXT_250] |
| 159 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Network Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | R9F67A | Standard | HPE Networking CX8325-32C Power-to-Port Airflow 6xFan 2xPSU Switch Bundle | 0 | $52,688.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 12/06/2021 | 12/31/2029 | [TEXT_250] |
| 160 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Network Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | S4Q65A | Standard | HPE Storage DCN 18p SFP28 25GbE 4p QSFP28 100GbE Power to Connector Half Width Sw H-series SN8325H | 0 | $33,920.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 06/02/2025 | 10/31/2030 | [TEXT_251] |
| 161 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Network Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | S4Q66A | Standard | HPE Storage DCN 18p SFP28 25GbE 4p QSFP28 100GbE Connector to Power Half Width Sw H-series SN8325H | 0 | $33,920.00 |  |  | NA |  | No | Available | 8 | 8 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 06/02/2025 | 10/31/2030 | [TEXT_252] |
| 162 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Network Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | S4Q67A | Standard | HPE Storage DCN 16p QSFP28 100GbE Power to Connector Half Width Switch H-series SN8325H | 0 | $37,282.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 06/02/2025 | 10/31/2030 | [TEXT_253] |
| 163 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Network Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | S4Q68A | Standard | HPE Storage DCN 16p QSFP28 100GbE Connector to Power Half Width Switch H-series SN8325H | 0 | $37,282.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 06/02/2025 | 10/31/2030 | [TEXT_253] |
| 164 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Network Switch | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | S1R08A | Standard | HPE Alletra Storage MP 32-port 100GbE Switch Bundle | 2 | $43,467.00 |  |  | $86,934.00 |  | No | Available | 5 | 5 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 03/31/2040 | [TEXT_254] |
| 165 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Network Switch | max 1 | 0 | 1 | [TEXT_255] | S1S69A | Standard | HPE Alletra Storage MP 32-port 100GbE -48VDC Switch Bundle | 0 | $49,176.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 02/05/2024 | 03/31/2040 | [TEXT_256] |
| 166 | Cables &amp; Enablement Kits | Cables &amp; Enablement Kits Options | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Cables &amp; Enablement Kits Options | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | S0A95A | Standard | HPE Switch Pair Installation Kit with 4U Cable Tray | 1 | $3,075.00 |  |  | $3,075.00 |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_257] |
| 167 | Cables &amp; Enablement Kits | Cables &amp; Enablement Kits Options | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Cables &amp; Enablement Kits Options | Cable Kit | max 1 | 0 | 1 | [TEXT_258] | S4Q37A | Standard | HPE Alletra Storage 2U Cable Tray | 0 | $683.00 |  |  | NA |  | No | Not published by OCA | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/07/2025 | 12/31/2032 | [TEXT_259] |
| 168 | Support Services | Support Services Options | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Support Services &gt; Support Services Options | Service &amp; Support | max 1 | 0 | 1 | [TEXT_260] | S3V78A | Standard | HPE Switch Pair Installation Kit without Tray | 0 | $3,075.00 |  |  | NA |  | No | Not published by OCA | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/05/2024 | 12/31/2032 | [TEXT_261] |
| 169 | Cables &amp; Enablement Kits | Cables &amp; Enablement Kits Options | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Cables &amp; Enablement Kits Options | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | QK732A | Standard | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 1m Cable | 0 | $115.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 06/20/2011 | 12/31/2028 | [TEXT_262] |
| 170 | Cables &amp; Enablement Kits | Cables &amp; Enablement Kits Options | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Cables &amp; Enablement Kits Options | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | QK737A | Standard | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 50m Cable | 0 | $415.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 06/20/2011 | 12/31/2028 | [TEXT_263] |
| 171 | Cables &amp; Enablement Kits | Cables &amp; Enablement Kits Options | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Cables &amp; Enablement Kits Options | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | QK733A | Standard | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 2m Cable | 0 | $130.00 |  |  | NA |  | No | Available | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 06/20/2011 | 12/31/2028 | [TEXT_264] |
| 172 | Cables &amp; Enablement Kits | Cables &amp; Enablement Kits Options | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Cables &amp; Enablement Kits Options | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | QK734A | Standard | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 5m Cable | 0 | $147.00 |  |  | NA |  | No | Available | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 06/20/2011 | 12/31/2028 | [TEXT_265] |
| 173 | Cables &amp; Enablement Kits | Cables &amp; Enablement Kits Options | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Cables &amp; Enablement Kits Options | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | QK735A | Standard | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 15m Cable | 0 | $195.00 |  |  | NA |  | No | Available | 14 | 14 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 06/20/2011 | 12/31/2028 | [TEXT_266] |
| 174 | Cables &amp; Enablement Kits | Cables &amp; Enablement Kits Options | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Cables &amp; Enablement Kits Options | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | QK736A | Standard | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 30m Cable | 0 | $239.00 |  |  | NA |  | No | Available | 4 | 4 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 06/20/2011 | 12/31/2028 | [TEXT_267] |
| 175 | Cables &amp; Enablement Kits | Cables &amp; Enablement Kits Options | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Cables &amp; Enablement Kits Options | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | C7535A | Standard | HPE RJ45 to RJ45 Cat5e Black M/M 7.6ft 1-pack Data Cable | 0 | $20.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/01/2001 | 08/31/2027 | [TEXT_268] |
| 176 | Cables &amp; Enablement Kits | PCIe Networking Adapters | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; PCIe Networking Adapters | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | C7536A | Standard | HPE 4.3m/14ft CAT5 RJ45 M/M Ethernet Cable | 0 | $21.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 03/01/2001 | 08/31/2027 | [TEXT_269] |
| 177 | Cables &amp; Enablement Kits | PCIe Networking Adapters | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; PCIe Networking Adapters | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | C7537A | Standard | HPE 7.6m/25ft CAT5 RJ45 M/M Ethernet Cable | 0 | $46.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/01/2001 | 08/31/2027 | [TEXT_270] |
| 178 | Cables &amp; Enablement Kits | PCIe Networking Adapters | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; PCIe Networking Adapters | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | C7542A | Standard | HPE 15.2m/50ft CAT5 RJ45 M/M Ethernet Cable | 0 | $86.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 04/01/2001 | 08/31/2027 | [TEXT_271] |
| 179 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | 487655-B21 | Standard | HPE BladeSystem c-Class 10GbE SFP+ to SFP+ 3m Direct Attach Copper Cable | 0 | $285.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 12/01/2008 | 08/30/2027 | [TEXT_272] |
| 180 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | 537963-B21 | Standard | HPE BladeSystem c-Class 10GbE SFP+ to SFP+ 5m Direct Attach Copper Cable | 0 | $327.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 09/14/2009 | 08/30/2027 | [TEXT_273] |
| 181 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | 844477-B21 | Standard | HPE 25Gb SFP28 to SFP28 3m Direct Attach Copper Cable | 0 | $392.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 06/06/2016 | 08/31/2027 | [TEXT_274] |
| 182 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | 844483-B21 | Standard | HPE 25Gb SFP28 to SFP28 7m Active Optical Cable | 0 | $2,451.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 12/03/2018 | 08/30/2027 | [TEXT_275] |
| 183 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | 845416-B21 | Standard | HPE 100Gb QSFP28 to 4x25Gb SFP28 3m Direct Attach Copper Cable | 0 | $916.00 |  |  | NA |  | No | Available | 3 | 3 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 06/06/2016 | 08/31/2028 | [TEXT_276] |
| 184 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | J9283D | Standard | HPE Aruba Networking 10G SFP+ to SFP+ 3m Direct Attach Copper Cable | 0 | $315.00 |  |  | NA |  | No | Available | 13 | 13 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 12/04/2017 | 12/31/2099 | [TEXT_277] |
| 185 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | J9285D | Standard | HPE Aruba Networking 10G SFP+ to SFP+ 7m Direct Attach Copper Cable | 0 | $430.00 |  |  | NA |  | No | Available | 13 | 13 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 12/04/2017 | 12/31/2099 | [TEXT_278] |
| 186 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | JD097C | Standard | HPE Networking X240 10G SFP+ SFP+ 3m DAC Cable | 0 | $314.00 |  |  | NA |  | No | Available | 13 | 13 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/14/2012 | 12/31/2099 | [TEXT_279] |
| 187 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | JG081C | Standard | HPE Networking X240 10G SFP+ SFP+ 5m DAC Cable | 0 | $346.00 |  |  | NA |  | No | Available | 13 | 13 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 05/14/2012 | 12/31/2099 | [TEXT_280] |
| 188 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | JG330A | Standard | HPE Networking Comware X240 40G QSFP+ to 4x10G SFP+ 3m Direct Attach Copper Splitter Cable | 0 | $850.00 |  |  | NA |  | No | Available | 13 | 13 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 02/13/2012 | 12/31/2099 | [TEXT_281] |
| 189 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | JG331A | Standard | HPE Networking Comware X240 40G QSFP+ to 4x10G SFP+ 5m Direct Attach Copper Splitter Cable | 0 | $986.00 |  |  | NA |  | No | Available | 13 | 13 | Standard Delivery (8-30d) | OCA row attribute | Unpublished | Active | 02/13/2012 | 12/31/2099 | [TEXT_282] |
| 190 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | Q9S67A | Standard | HPE 25GbE SFP28 to SFP28 3m Smart Active Optical Cable | 0 | $975.00 |  |  | NA |  | No | Available | 49 | 49 | Constrained / Long Lead Time (&gt;45d) | OCA row attribute | Unpublished | Active | 09/04/2018 | 12/31/2028 | [TEXT_283] |
| 191 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | Q9S68A | Standard | HPE 25GbE SFP28 to SFP28 5m Smart Active Optical Cable | 0 | $1,075.00 |  |  | NA |  | No | Available | 35 | 35 | Extended Schedule (31-45d) | OCA row attribute | Unpublished | Active | 09/04/2018 | 12/31/2028 | [TEXT_284] |
| 192 | Cables &amp; Enablement Kits | Cables &amp; Enablement Kits Options | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Cables &amp; Enablement Kits Options | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | AP820A | Standard | HPE B-series SFP+ to SFP+ Active Copper 5.0m Direct Attach Cable | 0 | $347.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 06/02/2009 | 06/16/2022 | [TEXT_285] |
| 193 | Cables &amp; Enablement Kits | Cables &amp; Enablement Kits Options | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Cables &amp; Enablement Kits Options | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | K2Q21A | Standard | HPE C-series 3M Passive Copper SFP+ Cable | 0 | $467.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/01/2014 | 10/23/2026 | [TEXT_286] |
| 194 | Cables &amp; Enablement Kits | Cables &amp; Enablement Kits Options | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Cables &amp; Enablement Kits Options | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | K2Q22A | Standard | HPE C-series 5M Passive Copper SFP+ Cable | 0 | $535.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 12/01/2014 | 10/23/2026 | [TEXT_287] |
| 195 | Cables &amp; Enablement Kits | Cables &amp; Enablement Kits Options | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Cables &amp; Enablement Kits &gt; Cables &amp; Enablement Kits Options | Cable Kit | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | QK701A | Standard | HPE C-series SFP+ to SFP+ Active Copper 7.0m Direct Attach Cable | 0 | $1,216.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/09/2011 | 10/23/2026 | [TEXT_288] |
| 196 | Networking | Optical Transceivers &amp; DAC Cables | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Networking &gt; Optical Transceivers &amp; DAC Cables | Transceiver | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | JL563B | Standard | HPE Aruba Networking 10GBASE-T SFP+ RJ45 30m Cat6A Transceiver | 0 | $1,781.00 |  |  | NA |  | No | Obsolete (OB) | Unpublished |  | Unpublished | Unpublished | Unpublished | Obsolete (OB) | 05/02/2022 | 11/30/2024 | [TEXT_289] |
| 197 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | 581817-B21 | Standard | HPE Configurator Defined Build Instruction Option | 1 | $1.00 |  |  | $1.00 |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 11/01/2009 | 12/31/2098 | [TEXT_290] |
| 198 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | N9Z52A | Standard | HPE Storage Field Integration Configuration | 0 | $1.00 |  |  | NA |  | No | Available | 1 | 1 | Fast-Ship Certified (&lt;=7d) | OCA row attribute | Unpublished | Active | 08/05/2019 | 05/31/2028 | [TEXT_291] |
| 199 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | S3L72A | Standard | HPE Alletra Storage MP B10000 Factory Activation | 0 | $1.00 |  |  | NA |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 02/05/2024 | 08/31/2030 | [TEXT_290] |
| 200 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Operating System / License | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | S0A98A | Standard | HPE Storage Data Encryption LTU | 1 | $1.00 |  |  | $1.00 |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 01/08/2024 | 05/01/2030 | [TEXT_290] |
| 201 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Operating System / License | max 1 | 0 | 1 | [TEXT_292] | S0A99A | Standard | HPE Storage FIPS Data Encryption LTU | 0 | $1.00 |  |  | NA |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 04/03/2023 | 11/30/2030 | [TEXT_290] |
| 202 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | G1H98A1 | Standard | HPE Account Management Support - EG 3 | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | [TEXT_293] |


### Rules &amp; Constraints

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 |
| --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Constraint | Rule Type | Rule Text |
| 2 | Unknown | Connectivity | min 1, Required | Quantity Constraint | Quantity: min 1, Required |
| 3 | Unknown | Change Rack | min 1, Required | Quantity Constraint | Quantity: min 1, Required |
| 4 | Unknown | Power Level Options | min 1, Required | Quantity Constraint | Quantity: min 1, Required |
| 5 | Unknown | Power Watt Options | min 1, Required | Quantity Constraint | Quantity: min 1, Required |
| 6 | Power Cords | PDU Power Cords Options | min 1, Required | Quantity Constraint | Quantity: min 1, Required |
| 7 | Power Cords | Power Cords Length | min 1, Required | Quantity Constraint | Quantity: min 1, Required |
| 8 | Unknown | Installation Options | min 1, Required | Quantity Constraint | Quantity: min 1, Required |
| 9 | Unknown | Shipment Options | min 1, Required | Quantity Constraint | Quantity: min 1, Required |
| 10 | Unknown | Node Chassis | max 3 | Quantity Constraint | Quantity: max 3 |
| 11 | Unknown | Node | max 2 | Quantity Constraint | Quantity: max 2 |
| 12 | Power Supplies | Power Supplies | max 18 | Quantity Constraint | Quantity: max 18 |
| 13 | Power Supplies | Power Cord | max 36 | Quantity Constraint | Quantity: max 36 |
| 14 | Power Supplies | Drive Enclosure Options | min 1, Required | Quantity Constraint | Quantity: min 1, Required |
| 15 | Power Supplies | Drive Enclosure | max 8 | Quantity Constraint | Quantity: max 8 |
| 16 | Power Supplies | Back-End Connectivity Cables | max 40 | Quantity Constraint | Quantity: max 40 |
| 17 | Power Supplies | NVMe SFF FE SSDs | max 192 | Quantity Constraint | Quantity: max 192 |
| 18 | Power Supplies | NVMe FE TAA Compliant SSDs | max 192 | Quantity Constraint | Quantity: max 192 |
| 19 | Power Supplies | NVMe SFF SED SSDs | max 192 | Quantity Constraint | Quantity: max 192 |
| 20 | Power Supplies | NVMe QLC SSDs | max 192 | Quantity Constraint | Quantity: max 192 |
| 21 | Power Supplies | BlueTooth Connectivity Kit | max 1 | Quantity Constraint | Quantity: max 1 |
| 22 | Rack Options | Rack Accessories | max 1 | Quantity Constraint | Quantity: max 1 |
| 23 | Rack Options | D Rack Accessories | max 1 | Quantity Constraint | Quantity: max 1 |
| 24 | Rack Options | B-Series Fibre Channel Switches | max 2 | Quantity Constraint | Quantity: max 2 |
| 25 | Rack Options | C-Series Fibre Channel Switches | max 2 | Quantity Constraint | Quantity: max 2 |
| 26 | Rack Options | M-Series Ethernet Channel Switches | max 2 | Quantity Constraint | Quantity: max 2 |
| 27 | Rack Options | Aruba Ethernet Switches | max 2 | Quantity Constraint | Quantity: max 2 |
| 28 | Rack Options | Back-End Switches | max 2 | Quantity Constraint | Quantity: max 2 |
| 29 | Rack Options | Back-End Switch Rail Kits | max 8 | Quantity Constraint | Quantity: max 8 |
| 30 | Cables | Host Cables | Unlimited | Quantity Constraint | Quantity: Unlimited |
| 31 | Cables | Management Cables | Unlimited | Quantity Constraint | Quantity: Unlimited |
| 32 | Cables | DAC Cables | Unlimited | Quantity Constraint | Quantity: Unlimited |
| 33 | Cables | Transceivers | Unlimited | Quantity Constraint | Quantity: Unlimited |
| 34 | Cables | Configuration Indicators | max 2 | Quantity Constraint | Quantity: max 2 |
| 35 | Software | Software LTU | max 1 | Quantity Constraint | Quantity: max 1 |
| 36 | Accessories &amp; Infrastructure | Accessories &amp; Infrastructure Options | max 1 | Configuration Rule | Selection constraint for Software LTU: max 1 |
| 37 | Storage Controllers | Storage Controllers Options | max 1 | Configuration Rule | Selection constraint for Software LTU: max 1 |
| 38 | Storage Controllers | Storage Controllers Options | max 1 | Configuration Rule | B series nodes only supported for upgrades |
| 39 | Storage Controllers | Storage Controllers Options | max 1 | Configuration Rule | R7D02B conditional visibility: portal selector activation required (B series nodes only supported for upgrades); PORTAL_CONDITIONAL |
| 40 | Storage Controllers | Storage Controllers Options | max 1 | Configuration Rule | R7D03B conditional visibility: portal selector activation required (B series nodes only supported for upgrades); PORTAL_CONDITIONAL |
| 41 | Storage Controllers | Storage Controllers Options | max 1 | Configuration Rule | S0R21B conditional visibility: portal selector activation required (B series nodes only supported for upgrades); PORTAL_CONDITIONAL |
| 42 | Storage Controllers | Storage Controllers Options | max 1 | Configuration Rule | S4V66B conditional visibility: portal selector activation required (B series nodes only supported for upgrades); PORTAL_CONDITIONAL |
| 43 | Storage Controllers | Storage Controllers Options | max 1 | Configuration Rule | Max quantity of product limited by space available. |
| 44 | Storage Controllers | Storage Controllers Options | max 1 | Configuration Rule | S4V66A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 45 | Storage Controllers | Storage Controllers Options | max 1 | Configuration Rule | R7D03A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 46 | Storage Controllers | Storage Controllers Options | max 1 | Configuration Rule | S0R21A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 47 | Storage Controllers | Storage Controllers Options | max 1 | Configuration Rule | S0S38A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 48 | Storage Controllers | Storage Controllers Options | max 1 | Configuration Rule | Hide B10140 |
| 49 | Storage Controllers | Storage Controllers Options | max 1 | Configuration Rule | S0S39A conditional visibility: portal selector activation required (Hide B10140); PORTAL_CONDITIONAL |
| 50 | Power Supplies | Flex Slot Power Supplies | max 1 | Configuration Rule | Selection constraint for Software LTU: max 1 |
| 51 | Power Supplies | Flex Slot Power Supplies | max 1 | Configuration Rule | No Mix PowerSupply |
| 52 | Power Supplies | Flex Slot Power Supplies | max 1 | Configuration Rule | R7C77A conditional visibility: portal selector activation required (No Mix PowerSupply); PORTAL_CONDITIONAL |
| 53 | Power Supplies | Flex Slot Power Supplies | max 1 | Configuration Rule | R9Z97A conditional visibility: portal selector activation required (No Mix PowerSupply); PORTAL_CONDITIONAL |
| 54 | Power Supplies | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | No Mix PowerSupply |
| 55 | Power Supplies | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | R7C78A conditional visibility: portal selector activation required (No Mix PowerSupply); PORTAL_CONDITIONAL |
| 56 | Cables &amp; Enablement Kits | Power Cords &amp; Jumper Cables | max 1 | Configuration Rule | Selection constraint for Software LTU: max 1 |
| 57 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | If single Phase or threePhase is selected then DC Power Cables not supported 2 |
| 58 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | 295633-B22 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 59 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | AF556A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 60 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | AF568A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 61 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | AF593A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 62 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | P22173-B21 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 63 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | P36877-B21 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 64 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | P78148-B21 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 65 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | P78155-B21 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 66 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | P78164-B21 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 67 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | R1C66A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 68 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | A0K02A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 69 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | A0N33A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 70 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | AF557A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 71 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | AF558A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 72 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | AF559A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 73 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | AF560A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 74 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | AF561A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 75 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | AF562A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 76 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | AF564A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 77 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | AF565A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 78 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | AF566A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 79 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | AF567A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 80 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | AF569A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 81 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | AF570A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 82 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | AF572A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 83 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | AF573A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 84 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | AF591A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 85 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | P08315-B21 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 86 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | P78130-B21 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 87 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | P78131-B21 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 88 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | P78144-B21 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 89 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | P78145-B21 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 90 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | P78147-B21 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 91 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | P78156-B21 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 92 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | P78157-B21 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 93 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | P78384-B21 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 94 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | P78940-B21 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 95 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | P78941-B21 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 96 | Cables &amp; Enablement Kits | -48VDC Power Supplies &amp; Cable Kits | max 1 | Configuration Rule | R1C65A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL |
| 97 | Software &amp; Licenses | Software LTU | max 1 | Configuration Rule | Breaker Panel can be selected only if R7C78A is selected |
| 98 | Software &amp; Licenses | Software LTU | max 1 | Configuration Rule | G2H95A conditional visibility: portal selector activation required (Breaker Panel can be selected only if R7C78A is selected); PORTAL_CONDITIONAL |
| 99 | Software &amp; Licenses | Software LTU | max 1 | Configuration Rule | Q9N54A conditional visibility: portal selector activation required (Breaker Panel can be selected only if R7C78A is selected); PORTAL_CONDITIONAL |
| 100 | Software &amp; Licenses | Software LTU | max 1 | Configuration Rule | Selection constraint for Software LTU: max 1 |
| 101 | Networking | Optical Transceivers &amp; DAC Cables | max 1 | Configuration Rule | Selection constraint for Software LTU: max 1 |
| 102 | Networking | Optical Transceivers &amp; DAC Cables | max 1 | Configuration Rule | When S1J10A/S0S46A is selected, do not allow R8M59A to be selected |
| 103 | Networking | Optical Transceivers &amp; DAC Cables | max 1 | Configuration Rule | R8M59A conditional visibility: portal selector activation required (When S1J10A/S0S46A is selected, do not allow R8M59A to be selected); PORTAL_CONDITIONAL |
| 104 | Networking | Optical Transceivers &amp; DAC Cables | max 1 | Configuration Rule | Max quantity of product limited by space available. |
| 105 | Networking | Optical Transceivers &amp; DAC Cables | max 1 | Configuration Rule | S2T35A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 106 | Networking | Optical Transceivers &amp; DAC Cables | max 1 | Configuration Rule | JL271A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 107 | Networking | Optical Transceivers &amp; DAC Cables | max 1 | Configuration Rule | Q2F19A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 108 | Networking | Optical Transceivers &amp; DAC Cables | max 1 | Configuration Rule | R0Z25A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 109 | Networking | Optical Transceivers &amp; DAC Cables | max 1 | Configuration Rule | R0Z27A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 110 | Networking | Optical Transceivers &amp; DAC Cables | max 1 | Configuration Rule | R8M61A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 111 | Networking | Optical Transceivers &amp; DAC Cables | max 1 | Configuration Rule | R9F77A conditional visibility: portal selector activation required (When R7D02A or R7D03A or S0S42A or S0R20A or R7D02B or R7D03B or S0S42B or S0R20B is selected, do not allow R8M59A or R9F77A to be selected (for new configurations and upgrades)); PORTAL_CONDITIONAL |
| 112 | Drive Enclosures / Drives | Solid State Drives (NVMe/SAS/SATA) | max 1 | Configuration Rule | Selection constraint for Software LTU: max 1 |
| 113 | Drive Enclosures / Drives | SFF Drive Cages &amp; Enablement | max 1 | Configuration Rule | Mixing is not allowed for initial configuration. |
| 114 | Drive Enclosures / Drives | SFF Drive Cages &amp; Enablement | max 1 | Configuration Rule | S1Z68A conditional visibility: portal selector activation required (Mixing is not allowed for initial configuration.); PORTAL_CONDITIONAL |
| 115 | Drive Enclosures / Drives | SFF Drive Cages &amp; Enablement | max 1 | Configuration Rule | R9H66A conditional visibility: portal selector activation required (Mixing is not allowed for initial configuration.); PORTAL_CONDITIONAL |
| 116 | Drive Enclosures / Drives | SFF Drive Cages &amp; Enablement | max 1 | Configuration Rule | R9H69A conditional visibility: portal selector activation required (Mixing is not allowed for initial configuration.); PORTAL_CONDITIONAL |
| 117 | Drive Enclosures / Drives | SFF Drive Cages &amp; Enablement | max 1 | Configuration Rule | R9H68A conditional visibility: portal selector activation required (Mixing is not allowed for initial configuration.); PORTAL_CONDITIONAL |
| 118 | Drive Enclosures / Drives | SFF Drive Cages &amp; Enablement | max 1 | Configuration Rule | S3L74A conditional visibility: portal selector activation required (Mixing is not allowed for initial configuration.); PORTAL_CONDITIONAL |
| 119 | Drive Enclosures / Drives | SFF Drive Cages &amp; Enablement | max 1 | Configuration Rule | S3L73A conditional visibility: portal selector activation required (Mixing is not allowed for initial configuration.); PORTAL_CONDITIONAL |
| 120 | Accessories &amp; Infrastructure | Chassis Infrastructure &amp; Rail Kits | max 1 | Configuration Rule | Selection constraint for Chassis Infrastructure &amp; Rail Kits: max 1 |
| 121 | Software &amp; Licenses | Software LTU | max 1 | Configuration Rule | If “dcPowerFlag” is selected then S1S69A not supported |
| 122 | Software &amp; Licenses | Software LTU | max 1 | Configuration Rule | S1S69A conditional visibility: portal selector activation required (If “dcPowerFlag” is selected then S1S69A not supported); PORTAL_CONDITIONAL |
| 123 | Cables &amp; Enablement Kits | Cables &amp; Enablement Kits Options | max 1 | Configuration Rule | Selection constraint for Software LTU: max 1 |
| 124 | Cables &amp; Enablement Kits | Cables &amp; Enablement Kits Options | max 1 | Configuration Rule | S0A95A cannot be ordered with S3V78A/S4Q37A |
| 125 | Cables &amp; Enablement Kits | Cables &amp; Enablement Kits Options | max 1 | Configuration Rule | S4Q37A conditional visibility: portal selector activation required (S0A95A cannot be ordered with S3V78A/S4Q37A); PORTAL_CONDITIONAL |
| 126 | Support Services | Support Services Options | max 1 | Configuration Rule | S0A95A cannot be ordered with S3V78A/S4Q37A |
| 127 | Support Services | Support Services Options | max 1 | Configuration Rule | S3V78A conditional visibility: portal selector activation required (S0A95A cannot be ordered with S3V78A/S4Q37A); PORTAL_CONDITIONAL |
| 128 | Cables &amp; Enablement Kits | PCIe Networking Adapters | max 1 | Configuration Rule | Selection constraint for Software LTU: max 1 |
| 129 | Software &amp; Licenses | Software LTU | max 1 | Configuration Rule | Max quantity of product limited by space available. |
| 130 | Software &amp; Licenses | Software LTU | max 1 | Configuration Rule | S0A99A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL |
| 131 | Software &amp; Licenses | Software LTU | max 1 | Configuration Rule | S0A98AAE conditional visibility: portal selector activation required (The S0A99AAE / S0A98AAE applicable for the drives configured as Add-ons/upgrades only); PORTAL_CONDITIONAL |
| 132 | Software &amp; Licenses | Software LTU | max 1 | Configuration Rule | S0A99AAE conditional visibility: portal selector activation required (The S0A99AAE / S0A98AAE applicable for the drives configured as Add-ons/upgrades only); PORTAL_CONDITIONAL |
| 133 | Software &amp; Licenses | Software LTU | max 1 | Configuration Rule | This SKU can be selected only when HPE GreenLake = Yes |
| 134 | Software &amp; Licenses | Software LTU | max 1 | Configuration Rule | S1S85AAE conditional visibility: portal selector activation required (This SKU can be selected only when HPE GreenLake = Yes); PORTAL_CONDITIONAL |
| 135 | Storage Preferences | Configuration Rules | [TEXT_294] | Learned Feedback Rule | [MUTUAL_EXCLUSION] R7C77A is only supported on rack-less solutions for S0R21A, S0S41A, S0S38A, S0S40A, S0S39A, S0S43A, S4V66A, S4V67A, S0R21B, S0S41B, S4V66B, S4V67B nodes |
| 136 | Installation Options | Configuration Rules | Not applicable for S1R06A, S5S40A, R7D02A, R7D03A, S0S42A and S0R20A | Learned Feedback Rule | [MUTUAL_EXCLUSION] Not applicable for S1R06A, S5S40A, R7D02A, R7D03A, S0S42A and S0R20A |
| 137 | Controller Node Models | Configuration Rules | Max 2 Chassis | Learned Feedback Rule | [CHASSIS_GATE] Max 2 Chassis |
| 138 | Controller Node Models | Configuration Rules | B series nodes only supported for upgrades | Learned Feedback Rule | [MUTUAL_EXCLUSION] B series nodes only supported for upgrades |
| 139 | Controller Node Models | Configuration Rules | Max quantity of product limited by space available. | Learned Feedback Rule | [MUTUAL_EXCLUSION] Max quantity of product limited by space available. |
| 140 | Controller Node Models | Configuration Rules | TAA isSelected | Learned Feedback Rule | [MUTUAL_EXCLUSION] TAA isSelected |
| 141 | Controller Node Models | Configuration Rules | Hide B10140 | Learned Feedback Rule | [MUTUAL_EXCLUSION] Hide B10140 |
| 142 | Power Supplies | Configuration Rules | No Mix PowerSupply | Learned Feedback Rule | [MUTUAL_EXCLUSION] No Mix PowerSupply |
| 143 | Power Supplies | Configuration Rules | If single Phase or threePhase is selected then DC Power Cables not supported 2 | Learned Feedback Rule | [MUTUAL_EXCLUSION] If single Phase or threePhase is selected then DC Power Cables not supported 2 |
| 144 | Power Supplies | Configuration Rules | Breaker Panel can be selected only if R7C78A is selected | Learned Feedback Rule | [MUTUAL_EXCLUSION] Breaker Panel can be selected only if R7C78A is selected |
| 145 | Drive Enclosure | Configuration Rules | TAA isSelected | Learned Feedback Rule | [MUTUAL_EXCLUSION] TAA isSelected |
| 146 | Drive Enclosure | Configuration Rules | When S1J10A/S0S46A is selected, do not allow R8M59A to be selected | Learned Feedback Rule | [MUTUAL_EXCLUSION] When S1J10A/S0S46A is selected, do not allow R8M59A to be selected |
| 147 | Drive Enclosure | Configuration Rules | Max quantity of product limited by space available. | Learned Feedback Rule | [MUTUAL_EXCLUSION] Max quantity of product limited by space available. |
| 148 | Drive Enclosure | Configuration Rules | [TEXT_295] | Learned Feedback Rule | [MUTUAL_EXCLUSION] When R7D02A or R7D03A or S0S42A or S0R20A or R7D02B or R7D03B or S0S42B or S0R20B is selected, do not allow R8M59A or R9F77A to be selected (for new configurations and upgrades) |
| 149 | Capacity | Configuration Rules | Mixing is not allowed for initial configuration. | Learned Feedback Rule | [MUTUAL_EXCLUSION] Mixing is not allowed for initial configuration. |
| 150 | Back-End Switches | Configuration Rules | If “dcPowerFlag” is selected then S1S69A not supported | Learned Feedback Rule | [MUTUAL_EXCLUSION] If “dcPowerFlag” is selected then S1S69A not supported |
| 151 | Back-End Switches | Configuration Rules | S0A95A cannot be ordered with S3V78A/S4Q37A | Learned Feedback Rule | [MUTUAL_EXCLUSION] S0A95A cannot be ordered with S3V78A/S4Q37A |
| 152 | Software | Configuration Rules | The S0A99AAE / S0A98AAE applicable for the drives configured as Add-ons/upgrades only | Learned Feedback Rule | [MUTUAL_EXCLUSION] The S0A99AAE / S0A98AAE applicable for the drives configured as Add-ons/upgrades only |
| 153 | Software | Configuration Rules | Max quantity of product limited by space available. | Learned Feedback Rule | [MUTUAL_EXCLUSION] Max quantity of product limited by space available. |
| 154 | Software | Configuration Rules | This SKU can be selected only when HPE GreenLake = Yes | Learned Feedback Rule | [MUTUAL_EXCLUSION] This SKU can be selected only when HPE GreenLake = Yes |
| 155 | Software | Software LTU |  | Conditional Rule | If single Phase or threePhase is selected then DC Power Cables not supported 2 |
| 156 | Software | Software LTU |  | Conditional Rule | [TEXT_296] |
| 195 | Software | Software LTU |  | Conditional Rule | If “dcPowerFlag” is selected then S1S69A not supported |

Row 157: identical to sheet Rules &amp; Constraints, row 156.
Row 158: identical to sheet Rules &amp; Constraints, row 156.
Row 159: identical to sheet Rules &amp; Constraints, row 156.
Row 160: identical to sheet Rules &amp; Constraints, row 156.
Row 161: identical to sheet Rules &amp; Constraints, row 156.
Row 162: identical to sheet Rules &amp; Constraints, row 156.
Row 163: identical to sheet Rules &amp; Constraints, row 156.
Row 164: identical to sheet Rules &amp; Constraints, row 156.
Row 165: identical to sheet Rules &amp; Constraints, row 156.
Row 166: identical to sheet Rules &amp; Constraints, row 156.
Row 167: identical to sheet Rules &amp; Constraints, row 156.
Row 168: identical to sheet Rules &amp; Constraints, row 156.
Row 169: identical to sheet Rules &amp; Constraints, row 156.
Row 170: identical to sheet Rules &amp; Constraints, row 156.
Row 171: identical to sheet Rules &amp; Constraints, row 156.
Row 172: identical to sheet Rules &amp; Constraints, row 156.
Row 173: identical to sheet Rules &amp; Constraints, row 156.
Row 174: identical to sheet Rules &amp; Constraints, row 156.
Row 175: identical to sheet Rules &amp; Constraints, row 156.
Row 176: identical to sheet Rules &amp; Constraints, row 156.
Row 177: identical to sheet Rules &amp; Constraints, row 156.
Row 178: identical to sheet Rules &amp; Constraints, row 156.
Row 179: identical to sheet Rules &amp; Constraints, row 156.
Row 180: identical to sheet Rules &amp; Constraints, row 156.
Row 181: identical to sheet Rules &amp; Constraints, row 156.
Row 182: identical to sheet Rules &amp; Constraints, row 156.
Row 183: identical to sheet Rules &amp; Constraints, row 156.
Row 184: identical to sheet Rules &amp; Constraints, row 156.
Row 185: identical to sheet Rules &amp; Constraints, row 156.
Row 186: identical to sheet Rules &amp; Constraints, row 156.
Row 187: identical to sheet Rules &amp; Constraints, row 156.
Row 188: identical to sheet Rules &amp; Constraints, row 156.
Row 189: identical to sheet Rules &amp; Constraints, row 156.
Row 190: identical to sheet Rules &amp; Constraints, row 156.
Row 191: identical to sheet Rules &amp; Constraints, row 156.
Row 192: identical to sheet Rules &amp; Constraints, row 156.
Row 193: identical to sheet Rules &amp; Constraints, row 156.
Row 194: identical to sheet Rules &amp; Constraints, row 156.

### Unavailable Rules &amp; Gates

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Rule ID | Rule Type | Section | Constraint / Reason | Affected SKU Count | Affected SKUs |
| 2 | RULE_1 | CONDITIONAL_VISIBILITY | Storage Preferences | [TEXT_294] | 1 | Arcus_ACPower_LowLine_WW_Intl |
| 3 | RULE_2 | CONDITIONAL_VISIBILITY | Installation Options | Not applicable for S1R06A, S5S40A, R7D02A, R7D03A, S0S42A and S0R20A | 1 | No_Installation_Services |
| 4 | RULE_3 | CONDITIONAL_VISIBILITY | Controller Node Models | Max 2 Chassis | 1 | S0U32A |
| 5 | RULE_4 | CONDITIONAL_VISIBILITY | Controller Node Models | B series nodes only supported for upgrades | 8 | R7D02B, R7D03B, S0R20B, S0R21B, S0S41B, S0S42B, S4V66B, S4V67B |
| 6 | RULE_5 | CONDITIONAL_VISIBILITY | Controller Node Models | Max quantity of product limited by space available. | 4 | S4V66A, R7D03A, S0R21A, S0S38A |
| 7 | RULE_6 | CONDITIONAL_VISIBILITY | Controller Node Models | TAA isSelected | 5 | S4V67A, S0R20A, S0S40A, S0S41A, S0S42A |
| 8 | RULE_7 | CONDITIONAL_VISIBILITY | Controller Node Models | Hide B10140 | 2 | S0S39A, S0S43A |
| 9 | RULE_8 | CONDITIONAL_VISIBILITY | Power Supplies | No Mix PowerSupply | 3 | R7C77A, R7C78A, R9Z97A |
| 10 | RULE_9 | CONDITIONAL_VISIBILITY | Power Supplies | If single Phase or threePhase is selected then DC Power Cables not supported 2 | 39 | 295633-B22, AF556A, AF568A, AF593A, P22173-B21, P36877-B21, P78148-B21, P78155-B21, P78164-B21, R1C66A, A0K02A, A0N33A, AF557A, AF558A, AF559A, AF560A, AF561A, AF562A, AF564A, AF565A, AF566A, AF567A, AF569A, AF570A, AF572A, AF573A, AF591A, P08315-B21, P78130-B21, P78131-B21, P78144-B21, P78145-B21, P78147-B21, P78156-B21, P78157-B21, P78384-B21, P78940-B21, P78941-B21, R1C65A |
| 11 | RULE_10 | CONDITIONAL_VISIBILITY | Power Supplies | Breaker Panel can be selected only if R7C78A is selected | 2 | G2H95A, Q9N54A |
| 12 | RULE_11 | CONDITIONAL_VISIBILITY | Drive Enclosure | TAA isSelected | 1 | S0S46A |
| 13 | RULE_12 | CONDITIONAL_VISIBILITY | Drive Enclosure | When S1J10A/S0S46A is selected, do not allow R8M59A to be selected | 1 | R8M59A |
| 14 | RULE_13 | CONDITIONAL_VISIBILITY | Drive Enclosure | Max quantity of product limited by space available. | 6 | S2T35A, JL271A, Q2F19A, R0Z25A, R0Z27A, R8M61A |
| 15 | RULE_14 | CONDITIONAL_VISIBILITY | Drive Enclosure | [TEXT_295] | 1 | R9F77A |
| 16 | RULE_15 | CONDITIONAL_VISIBILITY | Capacity | Mixing is not allowed for initial configuration. | 4 | S1Z68A, R9H66A, R9H69A, R9H68A |
| 17 | RULE_16 | CONDITIONAL_VISIBILITY | Capacity | Mixing is not allowed for initial configuration. | 2 | S3L74A, S3L73A |
| 18 | RULE_17 | CONDITIONAL_VISIBILITY | Back-End Switches | If “dcPowerFlag” is selected then S1S69A not supported | 1 | S1S69A |
| 19 | RULE_18 | CONDITIONAL_VISIBILITY | Back-End Switches | S0A95A cannot be ordered with S3V78A/S4Q37A | 2 | S4Q37A, S3V78A |
| 20 | RULE_19 | CONDITIONAL_VISIBILITY | Software | The S0A99AAE / S0A98AAE applicable for the drives configured as Add-ons/upgrades only | 2 | S0A98AAE, S0A99AAE |
| 21 | RULE_20 | CONDITIONAL_VISIBILITY | Software | Max quantity of product limited by space available. | 1 | S0A99A |
| 22 | RULE_21 | CONDITIONAL_VISIBILITY | Software | This SKU can be selected only when HPE GreenLake = Yes | 1 | S1S85AAE |


### Software &amp; Licenses

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |
| 50 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H38NHAS | Service | HPE Alletra Storage MP B10000 SVC | 1 |  |  |  | $0.00 |  | No | Available | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 11/28/2022 | 12/31/2099 | {"leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 51 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Operating System / License | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 &#124; S0A98AAE conditional visibility: portal selector activation required (The S0A99AAE / S0A98AAE applicable for the drives configured as Add-ons/upgrades only); PORTAL_CONDITIONAL &#124; (+1 sibling conditional visibility rules in Rules &amp; Constraints) | S0A98AAE | Service | HPE Storage Data Encryption E-LTU | 0 | $1.00 |  |  | NA |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 01/08/2024 | 05/01/2030 | [TEXT_297] |
| 52 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Operating System / License | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 &#124; S0A99AAE conditional visibility: portal selector activation required (The S0A99AAE / S0A98AAE applicable for the drives configured as Add-ons/upgrades only); PORTAL_CONDITIONAL &#124; (+1 sibling conditional visibility rules in Rules &amp; Constraints) | S0A99AAE | Service | HPE Storage FIPS Data Encryption E-LTU | 0 | $1.00 |  |  | NA |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 04/03/2023 | 11/30/2030 | [TEXT_297] |
| 53 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Operating System / License | max 1 | 0 | 1 | This SKU can be selected only when HPE GreenLake = Yes &#124; S1S85AAE conditional visibility: portal selector activation required (This SKU can be selected only when HPE GreenLake = Yes); PORTAL_CONDITIONAL | S1S85AAE | Service | HPE GreenLake for Block Storage Fulfillment LTU | 0 | $1.00 |  |  | NA |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active | 04/03/2023 | 12/31/2032 | [TEXT_290] |
| 54 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H0JD0A1 | Service | HPE 3PAR Onl Imp QuickStartup Rmt1 Svc | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD0A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 55 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H0JT1A1 | Service | HPE NSS Improvement Unit of Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JT1A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"} |
| 56 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H36NRA4 | Service | HPE Zerto Virtual TAM 4yr 8x5 Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NRA4","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 57 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H36NRA5 | Service | HPE Zerto Virtual TAM 5yr 8x5 Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NRA5","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 58 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H36NSA1 | Service | HPE Zerto Health Check per Site SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NSA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 59 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H36NTA1 | Service | HPE Zerto Custom UoS SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NTA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 60 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H39VQA1#V0F | Service | HPE Synergy First Frame Rmt Str SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H39VQA1#V0F","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 61 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H42ZHA1 | Service | HPE Perf Analysis Comp Option1 Rmt1 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H42ZHA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 62 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H42ZJA1 | Service | HPE Perf Analysis Comp Option2 Rmt1 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H42ZJA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 63 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H42ZKA1 | Service | HPE Perf Analysis Comp Option3 Rmt1 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H42ZKA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 64 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H0JT2A1 | Service | HPE NSS Implementation Unit of Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JT2A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"} |
| 65 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H29BRA1 | Service | HPE Cray Team Day SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H29BRA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 66 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H29BSA1 | Service | HPE Storage Servers Install Hourly SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H29BSA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 67 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H36NLA1 | Service | HPE Zerto Quick Cloud Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NLA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 68 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H36NMA1 | Service | HPE Zerto Quick Start Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NMA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 69 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H36NNA1 | Service | HPE Zerto Quick Migration Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NNA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 70 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H36NPA1 | Service | HPE Zerto Quick Advisor Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NPA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 71 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H36NQA1 | Service | HPE Zerto Strutd TAM 1yr 12x5 Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NQA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 72 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H36NQA3 | Service | HPE Zerto Strutd TAM 3yr 12x5 Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NQA3","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 73 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H36NQA4 | Service | HPE Zerto Strutd TAM 4yr 12x5 Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NQA4","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 74 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | G1H96A1 | Standard | HPE Account Management Support - EG 1 Svc | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"G1H96A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 75 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | G1H97A1 | Standard | HPE Account Management Support - EG 2 Svc | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"G1H97A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 76 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | G1H99A1 | Standard | HPE Account Management Support - EG 4 Svc | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"G1H99A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 77 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H0JD1A1 | Service | HPE Data Migration Readiness Assess Svc | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD1A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 78 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H0JD7A1 | Service | HPE Quickstart File Data Mig10TB SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD7A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 79 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H1Y26A1#002 | Service | HPE Energy Efficiency Analysis SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H1Y26A1#002","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 80 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H1Y26A1#003 | Service | HPE Infra Condition and Cap Analysis SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H1Y26A1#003","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 81 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H30RYA1 | Service | HPE Container Adopt Ph2 Redht Onsite SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H30RYA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 82 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H30SDA1 | Service | HPE Container Adopt Ph1 Anths Onsite SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H30SDA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 83 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H33XSA1 | Service | HPE Education - Learning Credits 1Yr SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H33XSA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 84 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H33XTA2 | Service | HPE Education - Learning Credits 2Yr SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H33XTA2","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 85 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H33XVA3 | Service | HPE Education - Learning Credits 3Yr SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H33XVA3","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 86 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H33XWA4 | Service | HPE Education - Learning Credits 4Yr SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H33XWA4","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 87 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H33XXA5 | Service | HPE Education - Learning Credits 5Yr SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H33XXA5","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 88 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H36NVA1 | Service | HPE Zerto Quick Upgrade Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NVA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 89 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H36XCA1#006 | Service | HPE GPU on RHOCP Integrat SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36XCA1#006","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 90 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H57GHA1 | Service | HPE Education 5 Day Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H57GHA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 91 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H57GJA1 | Service | HPE Education 5 Day Onsite SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H57GJA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 92 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H57GKA1 | Service | HPE Education 1 Day Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H57GKA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 93 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H0JD9A1 | Service | HPE File Data Migration 100TB SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD9A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 94 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H1WU9A1 | Service | HPE Scality Integration Basic SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H1WU9A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 95 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H1WV0A1 | Service | HPE Scality Integration Advanced SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H1WV0A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 96 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H1XF9A1 | Service | HPE Risk Assessment 10 Functions SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H1XF9A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 97 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H1XG0A1 | Service | HPE Business Imp Anlys 15 Process SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H1XG0A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 98 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H1XG7A1 | Service | HPE AI Video Analytics Assessment SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H1XG7A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 99 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H1Y25A1#002 | Service | HPE Energy Efficiency Analysis SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H1Y25A1#002","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 100 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H1Y25A1#003 | Service | HPE Infra Condition and Cap Analysis SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H1Y25A1#003","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 101 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H2S79A1 | Service | HPE Remot NW Conf and IntHr BusHrs SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H2S79A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 102 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H2S81A1 | Service | HPE Onsite NW Conf and Int Bus Hrs SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H2S81A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 103 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H29BQA1 | Service | HPE Cray Custom Operations SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H29BQA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 104 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H30SBA1 | Service | HPE Container Adopt Ph3 Redht Onsite SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H30SBA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 105 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H30SCA1 | Service | HPE Container Adopt Ph1 Anths Rem SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H30SCA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 106 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H30SLA1 | Service | HPE Container Adopt Ph1 Rnchr Onsite SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H30SLA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 107 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H30SMA1 | Service | HPE Container Adopt Ph2 Rnchr Rem SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H30SMA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 108 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H30SNA1 | Service | HPE Container Adopt Ph2 Rnchr Onsite SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H30SNA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 109 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H36NRA3 | Service | HPE Zerto Virtual TAM 3yr 8x5 Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36NRA3","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 110 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H36PBA1 | Service | HPE Zerto Virtual TAM 1mo 8x5 Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36PBA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 111 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H36PCA1 | Service | HPE Zerto Virtual TAM 3mo 8x5 Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36PCA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 112 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H36PDA1 | Service | HPE Zerto Virtual TAM 6mo 8x5 Remote SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H36PDA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 113 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | HA124A1#V5K | Service | HPE Private Cloud AI with X10000 St SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"HA124A1#V5K","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 114 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H42ZQA1 | Service | HPE Perf Analysis SAP Option2 Rmt1 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H42ZQA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 115 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H42ZRA1 | Service | HPE Perf Analysis SAP Option3 Rmt1 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H42ZRA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 116 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H43BCA1 | Service | HPE Priv Cloud AI Deployment SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H43BCA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 117 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H44MDA1 | Service | HPE Data Sanitization HPC T1 NSH SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H44MDA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 118 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H44NJA1 | Service | HPE Compute Firmware Onsite SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H44NJA1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 119 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | HU7D2A1 | Service | HPE Synergy Ecosystem Health Review SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"HU7D2A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 120 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H0JD4A1#WFH | Service | HPE 1Y Service Credits Qty 10 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD4A1#WFH","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 121 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H0JD4A1#WFK | Service | HPE 1Y Service Credits Qty 10 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD4A1#WFK","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 122 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H0JD4A1#WFM | Service | HPE 1Y Service Credits Qty 10 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD4A1#WFM","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 123 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H0JD4A1#Y65 | Service | HPE 1Y Service Credits Qty 10 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD4A1#Y65","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 124 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H0JD4A1#Y6B | Service | HPE 1Y Service Credits Qty 10 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD4A1#Y6B","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 125 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H0JD4A1008E | Service | HPE 1Y Service Credits Qty 10 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD4A1008E","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 126 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H0JD4A10BK5 | Service | HPE 1Y Service Credits Qty 10 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD4A10BK5","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 127 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H0JD4A3#WFH | Service | HPE 3Y Service Credits Qty 30 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD4A3#WFH","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 128 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H0JD4A3#WFK | Service | HPE 3Y Service Credits Qty 30 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD4A3#WFK","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 129 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H0JD4A3#WFM | Service | HPE 3Y Service Credits Qty 30 SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H0JD4A3#WFM","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 130 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H39DJA3#Y35 | Service | HPE 3Y CC SB ATS Compute Base SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H39DJA3#Y35","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 131 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H39DJA4#Y35 | Service | HPE 4Y CC SB ATS Compute Base SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H39DJA4#Y35","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 132 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H39DJA5#Y35 | Service | HPE 5Y CC SB ATS Compute Base SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H39DJA5#Y35","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 133 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H39DKA3#Y35 | Service | HPE 3Y CC SB ATS Compute Ext SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H39DKA3#Y35","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 134 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H39DKA4#Y35 | Service | HPE 4Y CC SB ATS Compute Ext SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H39DKA4#Y35","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 135 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H39DKA5#Y35 | Service | HPE 5Y CC SB ATS Compute Ext SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H39DKA5#Y35","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 136 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H39DLA3#Y36 | Service | HPE 3Y CC SB ATS Storage Base SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H39DLA3#Y36","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 137 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H39DLA4#Y36 | Service | HPE 4Y CC SB ATS Storage Base SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H39DLA4#Y36","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 138 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H39DLA5#Y36 | Service | HPE 5Y CC SB ATS Storage Base SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H39DLA5#Y36","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 139 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H39DMA3#Y36 | Service | HPE 3Y CC SB ATS Storage Ext SVC | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H39DMA3#Y36","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 140 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H46SGA3 | Service | HPE 3Y AL STG Block Pro-SAM T1 Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H46SGA3","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 141 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H46SGA4 | Service | HPE 4Y AL STG Block Pro-SAM T1 Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H46SGA4","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 142 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H46SGA5 | Service | HPE 5Y AL STG Block Pro-SAM T1 Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H46SGA5","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 143 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H46SHA3 | Service | HPE 3Y AL STG Block Pro-SAM T2 Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H46SHA3","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 144 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H46SHA4 | Service | HPE 4Y AL STG Block Pro-SAM T2 Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H46SHA4","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 145 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H46SHA5 | Service | HPE 5Y AL STG Block Pro-SAM T2 Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H46SHA5","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 146 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H46SJA3 | Service | HPE 3Y AL STG File/Object Pro-SAM T1 Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H46SJA3","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 147 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H46SJA4 | Service | HPE 4Y AL STG File/Object Pro-SAM T1 Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H46SJA4","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 148 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H46SJA5 | Service | HPE 5Y AL STG File/Object Pro-SAM T1 Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H46SJA5","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |
| 149 | Software &amp; Licenses | Software LTU | HPE OCA &gt; Alletra MP B10000 [B10000] &gt; Software &amp; Licenses &gt; Software LTU | Service &amp; Support | max 1 | 0 | 1 | Selection constraint for Software LTU: max 1 | H46SKA3 | Service | HPE 3Y AL STG File/Object Pro-SAM T2 Service | 0 |  |  |  |  |  | No | Not published by OCA | Unpublished |  | Unpublished | Unpublished | Unpublished | Active |  |  | {"Product Number":"H46SKA3","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"SUPPORT_SERVICE"} |

Row 2: identical to sheet All SKUs, row 92.
Row 3: identical to sheet All SKUs, row 93.
Row 4: identical to sheet All SKUs, row 94.
Row 5: identical to sheet All SKUs, row 127.
Row 6: identical to sheet All SKUs, row 128.
Row 7: identical to sheet All SKUs, row 129.
Row 8: identical to sheet All SKUs, row 130.
Row 9: identical to sheet All SKUs, row 131.
Row 10: identical to sheet All SKUs, row 132.
Row 11: identical to sheet All SKUs, row 133.
Row 12: identical to sheet All SKUs, row 134.
Row 13: identical to sheet All SKUs, row 135.
Row 14: identical to sheet All SKUs, row 136.
Row 15: identical to sheet All SKUs, row 137.
Row 16: identical to sheet All SKUs, row 138.
Row 17: identical to sheet All SKUs, row 139.
Row 18: identical to sheet All SKUs, row 140.
Row 19: identical to sheet All SKUs, row 141.
Row 20: identical to sheet All SKUs, row 142.
Row 21: identical to sheet All SKUs, row 143.
Row 22: identical to sheet All SKUs, row 144.
Row 23: identical to sheet All SKUs, row 145.
Row 24: identical to sheet All SKUs, row 146.
Row 25: identical to sheet All SKUs, row 147.
Row 26: identical to sheet All SKUs, row 148.
Row 27: identical to sheet All SKUs, row 149.
Row 28: identical to sheet All SKUs, row 150.
Row 29: identical to sheet All SKUs, row 151.
Row 30: identical to sheet All SKUs, row 152.
Row 31: identical to sheet All SKUs, row 153.
Row 32: identical to sheet All SKUs, row 154.
Row 33: identical to sheet All SKUs, row 155.
Row 34: identical to sheet All SKUs, row 156.
Row 35: identical to sheet All SKUs, row 157.
Row 36: identical to sheet All SKUs, row 158.
Row 37: identical to sheet All SKUs, row 159.
Row 38: identical to sheet All SKUs, row 160.
Row 39: identical to sheet All SKUs, row 161.
Row 40: identical to sheet All SKUs, row 162.
Row 41: identical to sheet All SKUs, row 163.
Row 42: identical to sheet All SKUs, row 164.
Row 43: identical to sheet All SKUs, row 165.
Row 44: identical to sheet All SKUs, row 197.
Row 45: identical to sheet All SKUs, row 198.
Row 46: identical to sheet All SKUs, row 199.
Row 47: identical to sheet All SKUs, row 200.
Row 48: identical to sheet All SKUs, row 201.
Row 49: identical to sheet All SKUs, row 202.

### Networking

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 95.
Row 3: identical to sheet All SKUs, row 96.
Row 4: identical to sheet All SKUs, row 97.
Row 5: identical to sheet All SKUs, row 98.
Row 6: identical to sheet All SKUs, row 99.
Row 7: identical to sheet All SKUs, row 100.
Row 8: identical to sheet All SKUs, row 101.
Row 9: identical to sheet All SKUs, row 102.
Row 10: identical to sheet All SKUs, row 103.
Row 11: identical to sheet All SKUs, row 104.
Row 12: identical to sheet All SKUs, row 105.
Row 13: identical to sheet All SKUs, row 106.
Row 14: identical to sheet All SKUs, row 107.
Row 15: identical to sheet All SKUs, row 108.
Row 16: identical to sheet All SKUs, row 109.
Row 17: identical to sheet All SKUs, row 110.
Row 18: identical to sheet All SKUs, row 111.
Row 19: identical to sheet All SKUs, row 179.
Row 20: identical to sheet All SKUs, row 180.
Row 21: identical to sheet All SKUs, row 181.
Row 22: identical to sheet All SKUs, row 182.
Row 23: identical to sheet All SKUs, row 183.
Row 24: identical to sheet All SKUs, row 184.
Row 25: identical to sheet All SKUs, row 185.
Row 26: identical to sheet All SKUs, row 186.
Row 27: identical to sheet All SKUs, row 187.
Row 28: identical to sheet All SKUs, row 188.
Row 29: identical to sheet All SKUs, row 189.
Row 30: identical to sheet All SKUs, row 190.
Row 31: identical to sheet All SKUs, row 191.
Row 32: identical to sheet All SKUs, row 196.

### Power Supplies

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 13.
Row 3: identical to sheet All SKUs, row 14.
Row 4: identical to sheet All SKUs, row 15.
Row 5: identical to sheet All SKUs, row 16.

### Accessories &amp; Infrastructure

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 2.
Row 3: identical to sheet All SKUs, row 124.
Row 4: identical to sheet All SKUs, row 125.
Row 5: identical to sheet All SKUs, row 126.

### Storage Controllers

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

### Cables &amp; Enablement Kits

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 17.
Row 3: identical to sheet All SKUs, row 18.
Row 4: identical to sheet All SKUs, row 19.
Row 5: identical to sheet All SKUs, row 20.
Row 6: identical to sheet All SKUs, row 21.
Row 7: identical to sheet All SKUs, row 22.
Row 8: identical to sheet All SKUs, row 23.
Row 9: identical to sheet All SKUs, row 24.
Row 10: identical to sheet All SKUs, row 25.
Row 11: identical to sheet All SKUs, row 26.
Row 12: identical to sheet All SKUs, row 27.
Row 13: identical to sheet All SKUs, row 28.
Row 14: identical to sheet All SKUs, row 29.
Row 15: identical to sheet All SKUs, row 30.
Row 16: identical to sheet All SKUs, row 31.
Row 17: identical to sheet All SKUs, row 32.
Row 18: identical to sheet All SKUs, row 33.
Row 19: identical to sheet All SKUs, row 34.
Row 20: identical to sheet All SKUs, row 35.
Row 21: identical to sheet All SKUs, row 36.
Row 22: identical to sheet All SKUs, row 37.
Row 23: identical to sheet All SKUs, row 38.
Row 24: identical to sheet All SKUs, row 39.
Row 25: identical to sheet All SKUs, row 40.
Row 26: identical to sheet All SKUs, row 41.
Row 27: identical to sheet All SKUs, row 42.
Row 28: identical to sheet All SKUs, row 43.
Row 29: identical to sheet All SKUs, row 44.
Row 30: identical to sheet All SKUs, row 45.
Row 31: identical to sheet All SKUs, row 46.
Row 32: identical to sheet All SKUs, row 47.
Row 33: identical to sheet All SKUs, row 48.
Row 34: identical to sheet All SKUs, row 49.
Row 35: identical to sheet All SKUs, row 50.
Row 36: identical to sheet All SKUs, row 51.
Row 37: identical to sheet All SKUs, row 52.
Row 38: identical to sheet All SKUs, row 53.
Row 39: identical to sheet All SKUs, row 54.
Row 40: identical to sheet All SKUs, row 55.
Row 41: identical to sheet All SKUs, row 56.
Row 42: identical to sheet All SKUs, row 57.
Row 43: identical to sheet All SKUs, row 58.
Row 44: identical to sheet All SKUs, row 59.
Row 45: identical to sheet All SKUs, row 60.
Row 46: identical to sheet All SKUs, row 61.
Row 47: identical to sheet All SKUs, row 62.
Row 48: identical to sheet All SKUs, row 63.
Row 49: identical to sheet All SKUs, row 64.
Row 50: identical to sheet All SKUs, row 65.
Row 51: identical to sheet All SKUs, row 66.
Row 52: identical to sheet All SKUs, row 67.
Row 53: identical to sheet All SKUs, row 68.
Row 54: identical to sheet All SKUs, row 69.
Row 55: identical to sheet All SKUs, row 70.
Row 56: identical to sheet All SKUs, row 71.
Row 57: identical to sheet All SKUs, row 72.
Row 58: identical to sheet All SKUs, row 73.
Row 59: identical to sheet All SKUs, row 74.
Row 60: identical to sheet All SKUs, row 75.
Row 61: identical to sheet All SKUs, row 76.
Row 62: identical to sheet All SKUs, row 77.
Row 63: identical to sheet All SKUs, row 78.
Row 64: identical to sheet All SKUs, row 79.
Row 65: identical to sheet All SKUs, row 80.
Row 66: identical to sheet All SKUs, row 81.
Row 67: identical to sheet All SKUs, row 82.
Row 68: identical to sheet All SKUs, row 83.
Row 69: identical to sheet All SKUs, row 84.
Row 70: identical to sheet All SKUs, row 85.
Row 71: identical to sheet All SKUs, row 86.
Row 72: identical to sheet All SKUs, row 87.
Row 73: identical to sheet All SKUs, row 88.
Row 74: identical to sheet All SKUs, row 89.
Row 75: identical to sheet All SKUs, row 90.
Row 76: identical to sheet All SKUs, row 91.
Row 77: identical to sheet All SKUs, row 166.
Row 78: identical to sheet All SKUs, row 167.
Row 79: identical to sheet All SKUs, row 169.
Row 80: identical to sheet All SKUs, row 170.
Row 81: identical to sheet All SKUs, row 171.
Row 82: identical to sheet All SKUs, row 172.
Row 83: identical to sheet All SKUs, row 173.
Row 84: identical to sheet All SKUs, row 174.
Row 85: identical to sheet All SKUs, row 175.
Row 86: identical to sheet All SKUs, row 176.
Row 87: identical to sheet All SKUs, row 177.
Row 88: identical to sheet All SKUs, row 178.
Row 89: identical to sheet All SKUs, row 192.
Row 90: identical to sheet All SKUs, row 193.
Row 91: identical to sheet All SKUs, row 194.
Row 92: identical to sheet All SKUs, row 195.

### Drive Enclosures  Drives

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 112.
Row 3: identical to sheet All SKUs, row 113.
Row 4: identical to sheet All SKUs, row 114.
Row 5: identical to sheet All SKUs, row 115.
Row 6: identical to sheet All SKUs, row 116.
Row 7: identical to sheet All SKUs, row 117.
Row 8: identical to sheet All SKUs, row 118.
Row 9: identical to sheet All SKUs, row 119.
Row 10: identical to sheet All SKUs, row 120.
Row 11: identical to sheet All SKUs, row 121.
Row 12: identical to sheet All SKUs, row 122.
Row 13: identical to sheet All SKUs, row 123.

### Support Services

| Original row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 | Column 21 | Column 22 | Column 23 | Column 24 | Column 25 | Column 26 | Column 27 | Column 28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Category | Sub-Category | Hierarchy Path | Component Role | Constraint Text | Subcategory Min Qty | Subcategory Max Qty | Table Rule/Note | Product # | Option Type | Description | Current Qty | Unit Price (USD) | Cost (USD) | Price Delta (USD) | Extended Price (USD) | Price per GB (USD) | HPE Recommended | Availability | Lead Time | Lead Time Days | Speed Tier | Lead Time Source | CLIC Status | Lifecycle Status | Start Date | Discontinued Date | Vendor Attributes (JSON) |

Row 2: identical to sheet All SKUs, row 168.

### Metadata

| Original row | Column 1 | Column 2 |
| --- | --- | --- |
| 1 | Field | Value |
| 2 | Chassis | Alletra MP B10000 |
| 3 | Scrape Date | 2026-11-21 |
| 4 | Source | OCA (Online Configuration Application) |
| 5 | Total Sub-Categories | 48 |
| 6 | Total Hardware SKUs | 201 |
| 7 | Total Service/Software SKUs | 100 |
| 8 | Total Combined SKUs | 301 |
| 9 | Chassis Variant Options | 0 |
| 10 | Total Rules | 194 |
| 11 | Unavailable DOM Rules | 21 |
| 12 | Total Tables | 42 |
| 13 | Diff Added SKUs | 0 |
| 14 | Diff Removed SKUs | 0 |
| 15 | Diff Price Changed | 0 |
| 16 | Diff Attr Changed | 0 |
| 17 | Diff Price+Attr Changed | 0 |
| 18 | Diff Reinstated SKUs | 0 |
| 19 | Diff Unchanged SKUs | 301 |
| 20 | Discontinued (All-Time) | 0 |
| 21 | Reinstated (All-Time) | 0 |
| 22 | Services JSON | outputs/Alletra/Storage/Alletra_MP_B10000/Alletra_MP_B10000_Services.json |
| 23 | Output Folder | outputs/Alletra/Storage/Alletra_MP_B10000 |


## Shared cell text

Bracketed TEXT identifiers above refer to these exact repeated values. The surrounding sheet, column and row determine applicability.

### TEXT_1

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":13749,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_2

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":161269,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_3

B series nodes only supported for upgrades &#124; R7D02B conditional visibility: portal selector activation required (B series nodes only supported for upgrades); PORTAL_CONDITIONAL &#124; (+3 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_4

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":209658,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_5

B series nodes only supported for upgrades &#124; R7D03B conditional visibility: portal selector activation required (B series nodes only supported for upgrades); PORTAL_CONDITIONAL &#124; (+3 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_6

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":513103,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_7

B series nodes only supported for upgrades &#124; S0R21B conditional visibility: portal selector activation required (B series nodes only supported for upgrades); PORTAL_CONDITIONAL &#124; (+3 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_8

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":216051,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_9

B series nodes only supported for upgrades &#124; S4V66B conditional visibility: portal selector activation required (B series nodes only supported for upgrades); PORTAL_CONDITIONAL &#124; (+3 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_10

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":495663,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_11

Max quantity of product limited by space available. &#124; S4V66A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+3 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_12

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":382014,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_13

Max quantity of product limited by space available. &#124; R7D03A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+3 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_14

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":394684,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_15

Max quantity of product limited by space available. &#124; S0R21A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+3 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_16

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":166193,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_17

Max quantity of product limited by space available. &#124; S0S38A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+3 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_18

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":72092,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_19

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":162410,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_20

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2327,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_21

No Mix PowerSupply &#124; R7C77A conditional visibility: portal selector activation required (No Mix PowerSupply); PORTAL_CONDITIONAL &#124; (+1 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_22

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":9869,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_23

No Mix PowerSupply &#124; R9Z97A conditional visibility: portal selector activation required (No Mix PowerSupply); PORTAL_CONDITIONAL &#124; (+1 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_24

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":3332,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_25

No Mix PowerSupply &#124; R7C78A conditional visibility: portal selector activation required (No Mix PowerSupply); PORTAL_CONDITIONAL

### TEXT_26

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":11842,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_27

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":64,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_28

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":17,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_29

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":109,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_30

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":67,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_31

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":82,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_32

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":90,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_33

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":72,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_34

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":230,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_35

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":119,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_36

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":54,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_37

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":23,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_38

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":92,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_39

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":83,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_40

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":59,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_41

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":196,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_42

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":36,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_43

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":21,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_44

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":26,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_45

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":148,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_46

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":43,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_47

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":61,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_48

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":21,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_49

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":24,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_50

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":29,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_51

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":31,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_52

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":90,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_53

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":53,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_54

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":60,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_55

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":113,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_56

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":17,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_57

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":23,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_58

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":123,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_59

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":76,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_60

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":72,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_61

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; 295633-B22 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_62

HPE C19 - C20 WW 250V 16Amp 2.5m Jumper Cord                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_63

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":102,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_64

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; AF556A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_65

HPE C13 - Nema 5-15P US/CA 110V 10Amp 1.83m Power Cord                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_66

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":55,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_67

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; AF568A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_68

HPE C13 - CEE-VII EU 250V 10Amp 1.83m Power Cord                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_69

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":71,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_70

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; AF593A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_71

HPE C19 - Nema L6-20P NA/JP 250V 20Amp High Voltage 3.6m Power Cord                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_72

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":97,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_73

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; P22173-B21 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_74

HPE 1600W -48VDC 600V 3.5m Power Cable Kit                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_75

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":818,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_76

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; P36877-B21 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_77

HPE 1600W -48VDC Power Cable Lug Kit                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_78

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":135,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_79

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; P78148-B21 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_80

HPE C19 - NEMA L6-20P 250V 20Amp 3.6m FIO Power Cord                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_81

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":135,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_82

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; P78155-B21 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_83

HPE C19 - C20 250V 16Amp 2.5m IN FIO Power Cord                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_84

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":114,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_85

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; P78164-B21 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_86

HPE C19 - JIS C8303 110V 15Amp 3.6m FIO Power Cord                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_87

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":174,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_88

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; R1C66A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_89

HPE C19-C20 IN 250V 16Amp 2.5m Black Jumper Cord                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_90

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":88,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_91

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; A0K02A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_92

HPE C13 - C14 WW 250V 10Amp 2.0m Jumper Cord                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_93

{"leadTime":"21","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":34,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_94

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; A0N33A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_95

HPE C13-NEMA 6-15P 10A/250V 3.6m Black Power Cord                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_96

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":78,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_97

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; AF557A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_98

HPE C13 - GB-1002 CN 250V 10Amp 1.83m Power Cord                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_99

{"leadTime":"21","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":156,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_100

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; AF558A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_101

HPE C13 - IRAM -2073 AR 250V 10A 2.5m Power Cord                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_102

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":65,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_103

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; AF559A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_104

HPE C13 - Nema 5-15P TH/PH 250V 10Amp 1.83m Power Cord                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_105

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":55,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_106

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; AF560A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_107

HPE C13 - KSC- 8305 KR 250V 10Amp 1.83m Power Cord                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_108

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; AF561A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_109

HPE C13 - CNS-690 TW 110V 13Amp 1.83m Power Cord                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_110

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":55,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_111

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; AF562A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_112

HPE C13 - IS-1293 IN 240V 6Amp LV 2.0m Power Cord                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_113

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":194,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_114

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; AF564A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_115

HPE C13 - SI-32 IL 250V 10Amp 1.83m Power Cord                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_116

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; AF565A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_117

HPE C13 - SEV 1011 CH 250V 10Amp 1.83m Power Cord                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_118

{"leadTime":"11","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":55,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_119

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; AF566A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_120

HPE C13 - DK-2.5A DK 250V 10Amp 1.83m Power Cord                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_121

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; AF567A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_122

HPE C13 - SABS-164 ZA 250V 10Amp 2.5m Power Cord                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_123

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; AF569A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_124

HPE C13 - AS3112-3 AU 250V 10Amp 2.5m Power Cord                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_125

{"leadTime":"11","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":65,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_126

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; AF570A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_127

HPE C13 - BS-1363A UK/HK/SG 250V 10Amp 1.83m Power Cord                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_128

{"leadTime":"13","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":55,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_129

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; AF572A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_130

HPE C13 - JIS C8303 JP 100V 12Amp 2.0m Power Cord                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_131

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":60,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_132

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; AF573A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_133

HPE C13 - C14 WW 250V 10Amp Flint Gray 2.0m Jumper Cord                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_134

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":38,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_135

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; AF591A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_136

HPE C13 - NBR-14136 BR 250V 10Amp 1.83m Power Cord                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_137

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":49,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_138

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; P08315-B21 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_139

HPE ATT C13-C14 1.4M FIO Power Cord                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_140

{"leadTime":"21","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":17,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_141

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; P78130-B21 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_142

HPE C13 - NEMA 5-15P 125V 10Amp 1.83m FIO Power Cord                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_143

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":10,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_144

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; P78131-B21 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_145

HPE C13 - GB1002 250V 10Amp 1.83m FIO Power Cord                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_146

{"leadTime":"21","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":10,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_147

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; P78144-B21 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_148

HPE C13 - JIS C8303 100V 12Amp 2m FIO Power Cord                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_149

{"leadTime":"21","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":46,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_150

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; P78145-B21 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_151

HPE C13 - C14 250V 10Amp 2m FIO Power Cord                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_152

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":11,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_153

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; P78147-B21 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_154

HPE C13 - C14 250V 10Amp 2m IN FIO Power Cord                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_155

{"leadTime":"21","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":77,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_156

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; P78156-B21 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_157

HPE C13 - C14 250V 10Amp 3m FIO Power Cord                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_158

{"leadTime":"21","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":14,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_159

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; P78157-B21 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_160

HPE C19 - GB1002 250V 16Amp 2.5m FIO Power Cord                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_161

{"leadTime":"21","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":72,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_162

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; P78384-B21 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_163

HPE C19 - C20 250V 16Amp 2.5m FIO Power Cord                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_164

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":20,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_165

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; P78940-B21 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_166

HPE C13 - C14 250V 10Amp 3m IN FIO Power Cord                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_167

{"leadTime":"21","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":130,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_168

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; P78941-B21 conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_169

HPE C13 - C14 250V 10Amp 0.7m IN FIO Power Cord                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_170

{"leadTime":"21","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":110,"priceState":"PRICED","priceStatus":"PRICED","rowType":"INTERNAL_CONFIGURATION"}

### TEXT_171

If single Phase or threePhase is selected then DC Power Cables not supported 2 &#124; R1C65A conditional visibility: portal selector activation required (If single Phase or threePhase is selected then DC Power Cables not supported 2); PORTAL_CONDITIONAL &#124; (+38 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_172

HPE C13-C14 IN 250V 10Amp 2m Black Jumper Cord                       If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_173

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":119,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_174

Breaker Panel can be selected only if R7C78A is selected &#124; G2H95A conditional visibility: portal selector activation required (Breaker Panel can be selected only if R7C78A is selected); PORTAL_CONDITIONAL &#124; (+1 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_175

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":5682,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_176

Breaker Panel can be selected only if R7C78A is selected &#124; Q9N54A conditional visibility: portal selector activation required (Breaker Panel can be selected only if R7C78A is selected); PORTAL_CONDITIONAL &#124; (+1 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_177

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":196,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_178

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":19654,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_179

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2999,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_180

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":3099,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_181

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":3199,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_182

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":3399,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_183

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":2649,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_184

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":2739,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_185

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":2959,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_186

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2914,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_187

When S1J10A/S0S46A is selected, do not allow R8M59A to be selected &#124; R8M59A conditional visibility: portal selector activation required (When S1J10A/S0S46A is selected, do not allow R8M59A to be selected); PORTAL_CONDITIONAL

### TEXT_188

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":250,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_189

Max quantity of product limited by space available. &#124; S2T35A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+5 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_190

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":3299,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_191

Max quantity of product limited by space available. &#124; JL271A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+5 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_192

{"leadTime":"12","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":578,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_193

Max quantity of product limited by space available. &#124; Q2F19A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+5 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_194

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2425,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_195

Max quantity of product limited by space available. &#124; R0Z25A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+5 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_196

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":515,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_197

Max quantity of product limited by space available. &#124; R0Z27A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+5 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_198

Max quantity of product limited by space available. &#124; R8M61A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL &#124; (+5 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_199

{"leadTime":"56","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2650,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_200

Selection constraint for Software LTU: max 1 &#124; R9F77A conditional visibility: portal selector activation required (When R7D02A or R7D03A or S0S42A or S0R20A or R7D02B or R7D03B or S0S42B or S0R20B is selected, do not allow R8M59A or R9F77A to be selected (for new configurations and upgrades)); PORTAL_CONDITIONAL

### TEXT_201

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":58713,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_202

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":39720,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_203

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":235872,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_204

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":131890,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_205

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":376435,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_206

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":53373,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_207

Mixing is not allowed for initial configuration. &#124; S1Z68A conditional visibility: portal selector activation required (Mixing is not allowed for initial configuration.); PORTAL_CONDITIONAL &#124; (+3 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_208

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":342214,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_209

Mixing is not allowed for initial configuration. &#124; R9H66A conditional visibility: portal selector activation required (Mixing is not allowed for initial configuration.); PORTAL_CONDITIONAL &#124; (+3 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_210

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":36109,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_211

Mixing is not allowed for initial configuration. &#124; R9H69A conditional visibility: portal selector activation required (Mixing is not allowed for initial configuration.); PORTAL_CONDITIONAL &#124; (+3 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_212

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":214426,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_213

Mixing is not allowed for initial configuration. &#124; R9H68A conditional visibility: portal selector activation required (Mixing is not allowed for initial configuration.); PORTAL_CONDITIONAL &#124; (+3 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_214

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":119901,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_215

Mixing is not allowed for initial configuration. &#124; S3L74A conditional visibility: portal selector activation required (Mixing is not allowed for initial configuration.); PORTAL_CONDITIONAL &#124; (+1 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_216

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":241214,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_217

Mixing is not allowed for initial configuration. &#124; S3L73A conditional visibility: portal selector activation required (Mixing is not allowed for initial configuration.); PORTAL_CONDITIONAL &#124; (+1 sibling conditional visibility rules in Rules &amp; Constraints)

### TEXT_218

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":126796,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_219

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":197,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_220

{"leadTime":"9","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":166,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_221

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":1995,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_222

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":28797,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_223

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":54376,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_224

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":23835,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_225

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":85981,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_226

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":43250,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_227

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":76563,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_228

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Obsolete","listPrice":250004,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_229

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":365694,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_230

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":19746,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_231

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"90-Day Warning","listPrice":13899,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_232

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":367245,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_233

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":25339,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_234

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":13300,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_235

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":6278,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_236

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":37640,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_237

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":29440,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_238

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":9530,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_239

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":150490,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_240

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":18010,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_241

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":18170,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_242

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":76890,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_243

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":112910,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_244

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":43010,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_245

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":29020,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_246

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":56100,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_247

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Direct Ship","listPrice":76500,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_248

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":100500,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_249

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":50377,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_250

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":52688,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_251

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":33920,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_252

{"leadTime":"8","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":33920,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_253

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":37282,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_254

{"leadTime":"5","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":43467,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_255

If “dcPowerFlag” is selected then S1S69A not supported &#124; S1S69A conditional visibility: portal selector activation required (If “dcPowerFlag” is selected then S1S69A not supported); PORTAL_CONDITIONAL

### TEXT_256

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":49176,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_257

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":3075,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_258

S0A95A cannot be ordered with S3V78A/S4Q37A &#124; S4Q37A conditional visibility: portal selector activation required (S0A95A cannot be ordered with S3V78A/S4Q37A); PORTAL_CONDITIONAL

### TEXT_259

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":683,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_260

S0A95A cannot be ordered with S3V78A/S4Q37A &#124; S3V78A conditional visibility: portal selector activation required (S0A95A cannot be ordered with S3V78A/S4Q37A); PORTAL_CONDITIONAL

### TEXT_261

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":3075,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_262

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":115,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_263

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":415,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_264

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":130,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_265

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":147,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_266

{"leadTime":"14","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":195,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_267

{"leadTime":"4","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":239,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_268

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":20,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_269

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":21,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_270

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":46,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_271

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":86,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_272

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":285,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_273

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":327,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_274

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":392,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_275

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":2451,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_276

{"leadTime":"3","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":916,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_277

{"leadTime":"13","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":315,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_278

{"leadTime":"13","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":430,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_279

{"leadTime":"13","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":314,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_280

{"leadTime":"13","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":346,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_281

{"leadTime":"13","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":850,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_282

{"leadTime":"13","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":986,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_283

{"leadTime":"49","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":975,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_284

{"leadTime":"35","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":1075,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_285

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":347,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_286

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":467,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_287

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":535,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_288

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1216,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_289

{"leadTime":"Unpublished","lifecycleCanonical":"Obsolete","listPrice":1781,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_290

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":1,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_291

{"leadTime":"1","leadTimeUnit":"DAYS","lifecycleCanonical":"Active","listPrice":1,"priceState":"PRICED","priceStatus":"PRICED","rowType":"HARDWARE_OPTION"}

### TEXT_292

Max quantity of product limited by space available. &#124; S0A99A conditional visibility: portal selector activation required (Max quantity of product limited by space available.); PORTAL_CONDITIONAL

### TEXT_293

{"Product Number":"G1H98A1","leadTime":"Unpublished","lifecycleCanonical":"Active","priceState":"UNPRICED","priceStatus":"UNPRICED","rowType":"HARDWARE_OPTION"}

### TEXT_294

R7C77A is only supported on rack-less solutions for S0R21A, S0S41A, S0S38A, S0S40A, S0S39A, S0S43A, S4V66A, S4V67A, S0R21B, S0S41B, S4V66B, S4V67B nodes

### TEXT_295

When R7D02A or R7D03A or S0S42A or S0R20A or R7D02B or R7D03B or S0S42B or S0R20B is selected, do not allow R8M59A or R9F77A to be selected (for new configurations and upgrades)

### TEXT_296

If single Phase or threePhase is selected then DC Power Cables not supported 1If single Phase or threePhase is selected then DC Power Cables not supported 3

### TEXT_297

{"leadTime":"Unpublished","lifecycleCanonical":"Active","listPrice":1,"priceState":"PRICED","priceStatus":"PRICED","rowType":"SOFTWARE_SUBSCRIPTION"}

