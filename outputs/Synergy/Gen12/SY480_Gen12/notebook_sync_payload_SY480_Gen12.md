# HPE SY480_Gen12 — Synchronized Catalog Knowledge

**Target Product**: `SY480_Gen12`

**Scope Identity**: `HPE/SERVER/Synergy/Gen12/SY480_Gen12`

**Sync Timestamp**: 2026-11-16T21:08:55.827Z

**Total Verified SKUs**: `601` (`308` Hardware + `293` Services)

**Total Synced KnowledgeDeltas**: `31`

This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.

---

## 🚀 Executive Delta & Recent Change Summary

| Category | Total SKUs | Added (Last Scrape) | Price Changed | Attribute Changed | Price & Attr Changed | Reinstated | Status |
|----------|------------|---------------------|---------------|-------------------|----------------------|------------|--------|
| **Hardware Components** | 308 | 7 | 0 | 278 | 22 | 0 | **CERTIFIED** |
| **Support Services & SLAs** | 293 | 32 | 0 | 254 | 7 | 0 | **CERTIFIED** |
| **Total Portfolio** | **601** | **39** | **0** | **532** | **29** | **0** | **ACTIVE** |

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

## 🏛️ 2. Family & Generation Rules (Synergy Gen12)

*No verified family/generation rules are registered for this product.*

## 🎯 3. Chassis & Solution-Type Gotchas (SY480_Gen12)

1. **[DELTA_SYNERGY_GEN12_FC_LICENSE_PROHIBITION] SY480_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `SY480_Gen12 CTO Server`):
   - **Rule**: On HPE parent configuration P51174-B21 populated solely with SY480 Gen12 compute nodes (P68217-B21), selecting Virtual Connect Fibre Channel upgrade licenses (R3P67A FIO LTU or R3P67AAE BTO E-LTU) is strictly forbidden and triggers CLIC Rules 81410905 and 81314323 (UNBUILDABLE CONFIGURATION: OVERRIDE REQUIRES FACTORY APPROVAL). SY480 Gen12 compute nodes route dedicated SAN traffic via Mezzanine 1 (P68131-B21 64Gb FC HBA) directly to Brocade 64Gb FC Switch Modules (P77653-B21) in Bays 1 & 4. Fibre Channel port expansion must be licensed via Brocade 8-port upgrade E-LTU (Q2E58AAE). Virtual Connect SE 100Gb F32 modules (867796-B21) in Bays 3 & 6 are dedicated to 25G/50G/100G Ethernet (via P64724-B21 adapter in Mezzanine 3), with no FCoE path on Gen12.
   - **Affected SKU**: `R3P67A` | **Required Dependency**: `Q2E58AAE`

2. **[DELTA_SYNERGY_FIO_VS_ELTU_STANDALONE_ORDERING] SY480_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `SY480_Gen12 CTO Server`):
   - **Rule**: R3P67A is a Factory Integrated Option (FIO LTU) ending in 'A', which strictly requires sub-iteming under a factory CTO chassis base (P51174-B21), triggering CLIC Rules 81013168 and 81125904 ('must be ordered as a sub-item to the Base') if quoted standalone. If a customer procurement contract mandates this 32Gb FC license, it CANNOT be fulfilled using R3P67A. It must be ordered as R3P67AAE (BTO Electronic License / E-LTU) placed in a completely separate standalone software quote (new UCID) where no P51174-B21 chassis or Gen12 compute nodes exist, bypassing both Rule 81125904 and Rule 81410905.
   - **Affected SKU**: `R3P67A` | **Required Dependency**: `R3P67AAE`

3. **[DELTA_SYNERGY_MULTI_ORDER_ADHOC_CONTAINER_PARTITIONING] SY480_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `SY480_Gen12 CTO Server`):
   - **Rule**: When a multi-frame Synergy deployment (e.g. 2 frames, 24 nodes) is partitioned into separate commercial orders (Option B): (1) Order 2 (Frame 2) is structured as a clean hardware clone with zero loose cables, zero loose transceivers, and zero unpack services; (2) Order 1 (Frame 1) hosts a dedicated Adhoc container carrying 100% of all loose physical connectivity for both frames (DAC cables: 487655-B21 10G, 845406-B21 100G; AOC cables: 845410-B21 100G; fiber: QK734A OM4; transceivers: 455883-B21 10G SFP+ SR, 845398-B21 25G SFP28 SR, 841716-B21 40G QSFP+ BiDi) totaling $96,236.00 list; (3) Embedded switch licenses (Q2E58AAE Brocade 8-port upgrade E-LTU) must NEVER be lumped into Adhoc—they must be split evenly inside the physical switch modules (4 in Frame 1, 4 in Frame 2) to preserve 1:1 hardware module licensing integrity; (4) Tech Care Basic support (HU4B2A3) must be preserved 1:1 on both frames ($46,156 each) to satisfy CLIC Rules 99916598/99916599.
   - **Affected SKU**: `P51174-B21` | **Required Dependency**: `Q2E58AAE`

4. **[DELTA_SYNERGY_MULTI_FRAME_SPLIT_STARTUP_SIZING] SY480_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `SY480_Gen12 CTO Server`):
   - **Rule**: When a multi-frame Synergy deployment (e.g. 2 frames, 24 nodes) is partitioned into separate commercial quotes/orders: (1) Frame 1 carries 1x HA124A1#5ZM (First Frame Onsite Startup, $16,742 USD); (2) Frame 2 carries 1x HA124A1#5ZQ (Additional Frame Onsite Startup, $4,627 USD), saving $12,115 USD vs duplicating First Frame; (3) Order 2 remarks must cross-reference Order 1's UCID (e.g. 5157071497-02) to satisfy automated CLIC Rule 81039677 order acceptance; (4) If frames are deployed as independent standalone islands (separate sites or unlinked OneView domains), both frames require HA124A1#5ZM; (5) Remote Startup (HA124A1#V0F) and Onsite Startup (HA124A1#5ZM) are strictly mutually exclusive and must never be combined.
   - **Affected SKU**: `HA124A1` | **Required Dependency**: `HA124A1#5ZM`

5. **[LEARN_SY480_GEN12_WORKFLOW_DUAL_PUBLICATION_ADVISORY_20261029] SY480_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `SY480_Gen12 CTO Server`):
   - **Rule**: Publish and read back the human Drive workbook separately from the complete semantic Markdown source in NotebookLM. Google Sheets is not a supported NotebookLM Drive source. A recent upload timestamp does not refresh old vendor observations.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

6. **[LEARN_SY480_GEN12_WORKFLOW_SOURCE_RETIREMENT_ADVISORY_20261029] SY480_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `SY480_Gen12 CTO Server`):
   - **Rule**: Verify exact-product replacement content, indexing and source-restricted grounded canary, then commit trust metadata before removing only managed stale catalog snapshots. Preserve QuickSpecs, separate learnings, shared enclosure/fabric sources and unrelated documents. Inventory absence is not authority to remove another product source.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

7. **[LEARN_SY480_GEN12_WORKFLOW_CLOUD_LEARNING_REVIEW_ADVISORY_20261029] SY480_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `SY480_Gen12 CTO Server`):
   - **Rule**: Preserve retrieved cloud learning documents locally with their source IDs. Treat prose claims as candidates pending dated vendor evidence; resolve contradictions before promoting hardware dependencies. Conflicting quantity claims require dated evidence for this exact product and selector state.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

8. **[LEARN_SY480_GEN12_128GB_MEMORY_ERROR_CLEARED_20261102] SY480_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `SY480_Gen12 CTO Server`):
   - **Rule**: CRITICAL BUILDABILITY BREAKTHROUGH: HPE 128GB (1x128GB) Dual Rank x4 DDR5-6400 CAS-52-52-52 Smart FIO Memory Kit (P69730-F21) previously triggered a blocking validation Error in CLIC on SY480 Gen12 compute modules. In November 2026 OCA release, this validation Error is fully resolved and cleared to clean/pass. High-density 128GB memory configurations (up to 384 kits per frame across 12 nodes, 49.15TB total RAM) are now 100% certified buildable. Discontinued date extended to 2030-06-30.
   - **Affected SKU**: `P69730-F21` | **Required Dependency**: `P51174-B21`

9. **[LEARN_SYNERGY_SUPPORT_PRICING_UPDATE_20261102] SY480_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `SY480_Gen12 CTO Server`):
   - **Rule**: SY480 Gen12 Compute Node 3Y Tech Care Basic Support (HU4B2A30BT7) updated to $3,497.00 (+$167.00/node).
   - **Affected SKU**: `HU4B2A30BT7` | **Required Dependency**: `N/A`

10. **[LEARN_SYNERGY_LEAD_TIME_AND_VALIDATION_20261102] SY480_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `SY480_Gen12 CTO Server`):
   - **Rule**: HPE 960GB NVMe M.2 2280 PE9010 SSD (P80321-B21) factory lead time extended from 11 days to 30 days (+19 days).
   - **Affected SKU**: `P80321-B21` | **Required Dependency**: `N/A`


## 🔒 3b. Physical & Architectural Gating Rules (DOM Unavailable Tables)

### Base Chassis & Form Factor Compatibility Gates

1. **[Hybrid RAID]**: The VROC SKUs could be selected only if the NVMe drives are selected with either 4SFF Dir Conn Kit (P68219-B21) or 8EDSFF Kit (P68220-B21)
   - **Gated Rule Type**: `CHASSIS_GATE`
   - **Affected SKUs (2)**: `R7J57A`, `S3Q19A`

### Component Mutual Exclusion Rules

1. **[Processors]**: The total qty of heat sink selected should match with the qty of processor selected.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (2)**: `P68225-B21`, `P68226-B21`

2. **[Virtualization]**: Private Product is not valid for current customer account
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (3)**: `S4R76AAE`, `S4F94AAE`, `S4G00AAE`

### CTO vs BTO Factory Integration Rules

1. **[Memory]**: BTO Memories are not allowed in CTO Base Model.
   - **Gated Rule Type**: `BTO_DISALLOWED`
   - **Affected SKUs (3)**: `P83865-B21`, `P83867-B21`, `P83869-B21`

## ⚠️ 4. Discontinued & Obsolete SKUs Registry

### Fully Discontinued & Delisted SKUs

| SKU | Description | Status | Discontinued Date | Last Known Price | Successor SKU | Tracking |
|-----|-------------|--------|-------------------|------------------|---------------|----------|
| `Q0D22A` | Red Hat Enterprise Linux Server 2 Sockets 4 Guests 5yr Subscription 24x7 Support Flexible LTU | **REINSTATED** | 2026-09-11 | $10183.00 | None | STOPPED_AFTER_REMOVAL |
| `Q0D23A` | Red Hat Enterprise Linux Server 2 Sockets 4 Guests 5yr Subscription 9x5 Support Flexible LTU | **REINSTATED** | 2026-09-11 | $6264.00 | None | STOPPED_AFTER_REMOVAL |
| `Q5W20A` | Red Hat Enterprise Linux for SAP (Physical/Virtual Nodes) 3yr Subscription 24x7 Support Flex LTU | **REINSTATED** | 2026-09-11 | $4072.00 | None | STOPPED_AFTER_REMOVAL |
| `Q5W19A` | Red Hat Enterprise Linux for SAP (Physical/Virtual Nodes) 3yr Subscription 9x5 Support Flex LTU | **REINSTATED** | 2026-09-11 | $2505.00 | None | STOPPED_AFTER_REMOVAL |
| `Q5W22A` | Red Hat Enterprise Linux for SAP (Physical/Virtual Nodes) 5yr Subscription 24x7 Support Flex LTU | **REINSTATED** | 2026-09-11 | $6787.00 | None | STOPPED_AFTER_REMOVAL |
| `Q5W21A` | Red Hat Enterprise Linux for SAP (Physical/Virtual Nodes) 5yr Subscription 9x5 Support Flex LTU | **REINSTATED** | 2026-09-11 | $4175.00 | None | STOPPED_AFTER_REMOVAL |
| `Q8U19A` | Red Hat Enterprise Linux for SAP Solutions for Physical Nodes 3yr Subscription 24x7 Support LTU | **REINSTATED** | 2026-09-11 | $6737.00 | None | STOPPED_AFTER_REMOVAL |
| `Q8U21A` | Red Hat Enterprise Linux for SAP Solutions for Physical Nodes 3yr Subscription 9x5 Support LTU | **REINSTATED** | 2026-09-11 | $5483.00 | None | STOPPED_AFTER_REMOVAL |
| `Q8U20A` | Red Hat Enterprise Linux for SAP Solutions for Physical Nodes 5yr Subscription 24x7 Support LTU | **REINSTATED** | 2026-09-11 | $11229.00 | None | STOPPED_AFTER_REMOVAL |
| `Q8U22A` | Red Hat Enterprise Linux for SAP Solutions for Physical Nodes 5yr Subscription 9x5 Support LTU | **REINSTATED** | 2026-09-11 | $9139.00 | None | STOPPED_AFTER_REMOVAL |
| `Q8U15A` | Red Hat Enterprise Linux for SAP Solutions for Virtual DC 3yr Subscription 24x7 Support LTU | **REINSTATED** | 2026-09-11 | $24680.00 | None | STOPPED_AFTER_REMOVAL |
| `Q8U17A` | Red Hat Enterprise Linux for SAP Solutions for Virtual DC 3yr Subscription 9x5 Support LTU | **REINSTATED** | 2026-09-11 | $20325.00 | None | STOPPED_AFTER_REMOVAL |
| `Q8U16A` | Red Hat Enterprise Linux for SAP Solutions for Virtual DC 5yr Subscription 24x7 Support LTU | **REINSTATED** | 2026-09-11 | $41134.00 | None | STOPPED_AFTER_REMOVAL |
| `Q8U18A` | Red Hat Enterprise Linux for SAP Solutions for Virtual DC 5yr Subscription 9x5 Support LTU | **REINSTATED** | 2026-09-11 | $33874.00 | None | STOPPED_AFTER_REMOVAL |
| `Q5W24A` | Red Hat Enterprise Linux for SAP for Virtual Datacenters 3yr Subscription 24x7 Support Flex LTU | **REINSTATED** | 2026-09-11 | $14516.00 | None | STOPPED_AFTER_REMOVAL |
| `Q5W23A` | Red Hat Enterprise Linux for SAP for Virtual Datacenters 3yr Subscription 9x5 Support Flex LTU | **REINSTATED** | 2026-09-11 | $9072.00 | None | STOPPED_AFTER_REMOVAL |
| `Q5W26A` | Red Hat Enterprise Linux for SAP for Virtual Datacenters 5yr Subscription 24x7 Support Flex LTU | **REINSTATED** | 2026-09-11 | $24194.00 | None | STOPPED_AFTER_REMOVAL |
| `Q5W25A` | Red Hat Enterprise Linux for SAP for Virtual Datacenters 5yr Subscription 9x5 Support Flex LTU | **REINSTATED** | 2026-09-11 | $15119.00 | None | STOPPED_AFTER_REMOVAL |
| `Q0D26A` | Red Hat High Availability 2 Sockets Unlimited Guests 5yr Subscription Flexible LTU | **REINSTATED** | 2026-09-11 | $7532.00 | None | STOPPED_AFTER_REMOVAL |
| `Q0D25A` | Red Hat High Availability 2 Sockets or 2 Guests 5yr Subscription Flexible LTU | **REINSTATED** | 2026-09-11 | $2085.00 | None | STOPPED_AFTER_REMOVAL |
| `Q0D30A` | Red Hat Resilient Storage 2 Sockets Unlimited Guests 5yr Subscription Flexible LTU | **REINSTATED** | 2026-09-11 | $15095.00 | None | STOPPED_AFTER_REMOVAL |
| `Q0D29A` | Red Hat Resilient Storage 2 Sockets or 2 Guests 5yr Subscription Flexible LTU | **REINSTATED** | 2026-09-11 | $4395.00 | None | STOPPED_AFTER_REMOVAL |
| `N0U73A` | SUSE Linux Enterprise Server SAP 1-2 Sockets or 1-2 VM 3-year Subscription 24x7 Support Flexible LTU | **REINSTATED** | 2026-09-11 | $7803.00 | None | STOPPED_AFTER_REMOVAL |
| `N0U75A` | SUSE Linux Enterprise Server SAP 1-2 Sockets or 1-2 VM 5-year Subscription 24x7 Support Flexible LTU | **REINSTATED** | 2026-09-11 | $13005.00 | None | STOPPED_AFTER_REMOVAL |
| `HB242A1` | HPE MCS Relocation Unit of SVC | **DISCONTINUED** | 2026-10-29 | $100.00 | None | STOPPED_AFTER_REMOVAL |
| `HA334A1` | HPE HPC AI Team Day SVC | **DISCONTINUED** | 2026-10-29 | $9398.00 | None | STOPPED_AFTER_REMOVAL |
| `HK033A1` | HPE MCS Deployment Unit of SVC | **DISCONTINUED** | 2026-10-29 | $100.00 | None | STOPPED_AFTER_REMOVAL |
| `HA0Z0A1` | HPE DL 1Yr Other 1GB Content Hosted SVC | **DISCONTINUED** | 2026-10-29 | $1620.00 | None | STOPPED_AFTER_REMOVAL |
| `HR2R4A1` | HPE Digital Learner Bronze 1Yr Subs SVC | **DISCONTINUED** | 2026-10-29 | $4000.00 | None | STOPPED_AFTER_REMOVAL |
| `HR2R5A1` | HPE Digital Learner Silver 1Yr Subs SVC | **DISCONTINUED** | 2026-10-29 | $5000.00 | None | STOPPED_AFTER_REMOVAL |
| `HR2R6A1` | HPE Digital Learner Gold 1Yr Subs SVC | **DISCONTINUED** | 2026-10-29 | $8000.00 | None | STOPPED_AFTER_REMOVAL |
| `HV9V8A1` | HPE Digital Learner SMB 1Yr Subs SVC | **DISCONTINUED** | 2026-10-29 | $1300.00 | None | STOPPED_AFTER_REMOVAL |
| `H36VWA1` | HPE Storage VM Migration 50 VM SVC | **DISCONTINUED** | 2026-10-29 | $17520.00 | None | STOPPED_AFTER_REMOVAL |
| `H36VXA1` | HPE Storage VM Migration 150 VM SVC | **DISCONTINUED** | 2026-10-29 | $29760.00 | None | STOPPED_AFTER_REMOVAL |
| `H36WBA1` | HPE Storage VM Migration 5 VM Zerto SVC | **DISCONTINUED** | 2026-10-29 | $7140.00 | None | STOPPED_AFTER_REMOVAL |
| `H36WNA1` | HPE AI Soltns and Platfrms 5 Day Rem SVC | **DISCONTINUED** | 2026-10-29 | $13800.00 | None | STOPPED_AFTER_REMOVAL |
| `H36WMA1` | HPE AI Solns and Pltfrms 5 Day Onste SVC | **DISCONTINUED** | 2026-10-29 | $23400.00 | None | STOPPED_AFTER_REMOVAL |
| `H36WQA1` | HPE AI Soltns and Platfrms 1 Day Rem SVC | **DISCONTINUED** | 2026-10-29 | $2760.00 | None | STOPPED_AFTER_REMOVAL |
| `H46RMA1` | HPE Data and AI Security 5 Day Rem SVC | **DISCONTINUED** | 2026-10-29 | $9000.00 | None | STOPPED_AFTER_REMOVAL |
| `H46RNA1` | HPE Data and AI Security 5 Day Onste SVC | **DISCONTINUED** | 2026-10-29 | $18540.00 | None | STOPPED_AFTER_REMOVAL |
| `H46RLA1` | HPE Data and AI Security 1 Day Rem SVC | **DISCONTINUED** | 2026-10-29 | $2640.00 | None | STOPPED_AFTER_REMOVAL |
| `H57FDA1` | HPE Data Sltn and Pltfrms 5 Day Rem SVC | **DISCONTINUED** | 2026-10-29 | $13800.00 | None | STOPPED_AFTER_REMOVAL |
| `H4F41A1` | HPE Factory Express Standard Unit of SVC | **DISCONTINUED** | 2026-10-29 | $19.00 | None | STOPPED_AFTER_REMOVAL |
| `H4F42A1` | HPE Factory Express Complex Unit of SVC | **DISCONTINUED** | 2026-10-29 | $1850.00 | None | STOPPED_AFTER_REMOVAL |
| `HA840A1` | HPE Supplied Asset Tag Service | **DISCONTINUED** | 2026-10-29 | $15.00 | None | STOPPED_AFTER_REMOVAL |
| `HA841A1` | HPE Customer Supplied Asset Tag Service | **DISCONTINUED** | 2026-10-29 | $26.00 | None | STOPPED_AFTER_REMOVAL |
| `HA844A1` | HPE 3rd Party Hardware Install Service | **DISCONTINUED** | 2026-10-29 | $28.00 | None | STOPPED_AFTER_REMOVAL |
| `HA854A1` | HPE Fctry Exp Virtualization Enable SVC | **DISCONTINUED** | 2026-10-29 | $2134.00 | None | STOPPED_AFTER_REMOVAL |
| `HA861A1` | HPE FE Personalized Install SVC | **DISCONTINUED** | 2026-10-29 | $2105.00 | None | STOPPED_AFTER_REMOVAL |
| `HA867A1` | HPE Standard Product Reporting Service | **DISCONTINUED** | 2026-10-29 | $13.00 | None | STOPPED_AFTER_REMOVAL |
| `HA868A1` | HPE Enhanced Product Reporting Service | **DISCONTINUED** | 2026-10-29 | $38.00 | None | STOPPED_AFTER_REMOVAL |
| `HA875A1` | HPE Special Factory Service | **DISCONTINUED** | 2026-10-29 | $1.00 | None | STOPPED_AFTER_REMOVAL |
| `HU7D3A1` | HPE FE OEM Customization UOS SVC | **DISCONTINUED** | 2026-10-29 | $65.00 | None | STOPPED_AFTER_REMOVAL |
| `AC120A` | HPE Pallet Size Customization Service | **DISCONTINUED** | 2026-10-29 | $7.00 | None | STOPPED_AFTER_REMOVAL |
| `AC129A` | HPE Consolidation Logistic Service | **DISCONTINUED** | 2026-10-29 | $26.00 | None | STOPPED_AFTER_REMOVAL |
| `P1F69A` | HPE Delivery Site Above Ground Floor Service | **DISCONTINUED** | 2026-10-29 | $289.00 | None | STOPPED_AFTER_REMOVAL |
| `P1F70A` | HPE Forklift at Delivery Service | **DISCONTINUED** | 2026-10-29 | $1399.00 | None | STOPPED_AFTER_REMOVAL |
| `P1F72A` | HPE Two People at Delivery SVC | **DISCONTINUED** | 2026-10-29 | $466.00 | None | STOPPED_AFTER_REMOVAL |
| `P1F73A` | HPE Campus Delivery Service | **DISCONTINUED** | 2026-10-29 | $104.00 | None | STOPPED_AFTER_REMOVAL |
| `P1F75A` | HPE Fixed Delivery Appointment Service | **DISCONTINUED** | 2026-10-29 | $466.00 | None | STOPPED_AFTER_REMOVAL |
| `AC069A` | HPE FE Cluster Hig Den-Node HW Intg SVC | **DISCONTINUED** | 2026-10-29 | $92.00 | None | STOPPED_AFTER_REMOVAL |
| `HB485A1` | HPE ClusterPlatform 130-257 Fact SW SVC | **DISCONTINUED** | 2026-10-29 | $57508.00 | None | STOPPED_AFTER_REMOVAL |
| `SB000DL` | HPE AMS HPC Rack Config Service | **DISCONTINUED** | 2026-10-29 | $1.00 | None | STOPPED_AFTER_REMOVAL |

### ⏳ Impending Obsolescence & Clearance Hardware (90-Day to 180-Day Window)

*These components remain orderable in live configurators today but have published vendor end dates. They represent high-value clearance opportunities for immediate deployments, but require explicit procurement cutoff remarks before quotation:*

| Product # | Description | Category | List Price (USD) | Discontinued Date | Price Trend | Presales Strategy Guidance |
|---|---|---|---:|---|:---:|---|
| `P77096-291` | Microsoft Windows Server 2025 16-core Standard FIO Pre-installed UEFI Japanese SW | Software & Licenses | $0 | 02/28/2027 | 0.00% | ⚠️ Approaching EOL (02/28/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77096-B21` | Microsoft Windows Server 2025 16-core Standard FIO Pre-installed UEFI en/fr/de/es/it/pt/nl SW | Software & Licenses | $1,147 | 02/28/2027 | 0.00% | ⚠️ Approaching EOL (02/28/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77097-291` | Microsoft Windows Server 2025 16-core Datacenter FIO Not Pre-installed Japanese SW | Software & Licenses | $0 | 02/28/2027 | 0.00% | ⚠️ Approaching EOL (02/28/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77097-B21` | Microsoft Windows Server 2025 16-core Datacenter FIO Not Pre-installed en/fr/de/es/it/pt/nl SW | Software & Licenses | $5,712 | 02/28/2027 | 0.00% | ⚠️ Approaching EOL (02/28/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77095-291` | Microsoft Windows Server 2025 16-core Standard FIO Not Pre-installed Japanese SW | Software & Licenses | $0 | 02/28/2027 | 0.00% | ⚠️ Approaching EOL (02/28/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77095-B21` | Microsoft Windows Server 2025 16-core Standard FIO Not Pre-installed en/fr/de/es/it/pt/nl SW | Software & Licenses | $1,147 | 02/28/2027 | 0.00% | ⚠️ Approaching EOL (02/28/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45879-B21` | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed English SW | Software & Licenses | $28 | 02/28/2027 | +40.00% | ⚠️ Approaching EOL (02/28/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45879-051` | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed French SW | Software & Licenses | $20 | 02/28/2027 | 0.00% | ⚠️ Approaching EOL (02/28/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45879-041` | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed German SW | Software & Licenses | $28 | 02/28/2027 | +40.00% | ⚠️ Approaching EOL (02/28/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45879-061` | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed Italian SW | Software & Licenses | $20 | 02/28/2027 | 0.00% | ⚠️ Approaching EOL (02/28/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45879-291` | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed Japanese SW | Software & Licenses | $99,999 | 02/28/2027 | 0.00% | ⚠️ Approaching EOL (02/28/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45879-071` | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed Spanish SW | Software & Licenses | $28 | 02/28/2027 | +40.00% | ⚠️ Approaching EOL (02/28/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45862-B21` | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed English SW | Software & Licenses | $28 | 02/28/2027 | +40.00% | ⚠️ Approaching EOL (02/28/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45862-051` | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed French SW | Software & Licenses | $28 | 02/28/2027 | +40.00% | ⚠️ Approaching EOL (02/28/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45862-041` | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed German SW | Software & Licenses | $20 | 02/28/2027 | 0.00% | ⚠️ Approaching EOL (02/28/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45862-061` | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed Italian SW | Software & Licenses | $20 | 02/28/2027 | 0.00% | ⚠️ Approaching EOL (02/28/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45862-291` | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed Japanese SW | Software & Licenses | $99,999 | 02/28/2027 | 0.00% | ⚠️ Approaching EOL (02/28/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45862-071` | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed Spanish SW | Software & Licenses | $28 | 02/28/2027 | +40.00% | ⚠️ Approaching EOL (02/28/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77125-291` | Microsoft Windows Server 2022 Downgrade Datacenter FIO Not Pre-installed Japanese SW | Software & Licenses | $0 | 02/28/2027 | 0.00% | ⚠️ Approaching EOL (02/28/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77125-B21` | Microsoft Windows Server 2022 Downgrade Datacenter FIO Not Pre-installed WW SW | Software & Licenses | $33 | 02/28/2027 | 0.00% | ⚠️ Approaching EOL (02/28/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77124-291` | Microsoft Windows Server 2022 Downgrade Standard FIO Not Pre-installed Japanese SW | Software & Licenses | $0 | 02/28/2027 | 0.00% | ⚠️ Approaching EOL (02/28/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77124-B21` | Microsoft Windows Server 2022 Downgrade Standard FIO Not Pre-installed WW SW | Software & Licenses | $33 | 02/28/2027 | 0.00% | ⚠️ Approaching EOL (02/28/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77102-291` | Microsoft Windows Server 2025 16-core Datacenter Reassignment Reseller Option Kit Japanese SW | Software & Licenses | $0 | 02/28/2027 | 0.00% | ⚠️ Approaching EOL (02/28/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77102-B21` | Microsoft Windows Server 2025 16-core Datacenter Reassignment Reseller Option Kit en/fr/de/es SW | Software & Licenses | $7,733 | 02/28/2027 | 0.00% | ⚠️ Approaching EOL (02/28/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77101-AA1` | Microsoft Windows Server 2025 16-core Datacenter Reseller Option Kit Chinese Simplified SW | Software & Licenses | $0 | 02/28/2027 | 0.00% | ⚠️ Approaching EOL (02/28/2027). Valid for immediate builds; verify multi-year roadmaps. |
*... [11 additional impending EOL records omitted for brevity]*

## 📊 5b. Category-Level Trends & Significant Price Adjustments

### Category Portfolio Delta & Planning Intelligence

| Category | Total SKUs | Added | Modified | Unchanged | Clearance / Drops | Category Planning Insight |
|---|---:|---:|---:|---:|---:|---|
| **Chassis** | 1 | 0 | 1 | 0 | 0 | 🔄 Attributes/specifications updated (1 SKUs) |
| **PCIe Risers** | 1 | 0 | 1 | 0 | 0 | 🔄 Attributes/specifications updated (1 SKUs) |
| **Drive Enclosures / Drives** | 10 | 0 | 10 | 0 | 0 | 🔄 Attributes/specifications updated (10 SKUs) |
| **Processor** | 17 | 0 | 17 | 0 | 0 | 🔄 Attributes/specifications updated (17 SKUs) |
| **Cooling / Thermal** | 2 | 0 | 2 | 0 | 0 | 🔄 Attributes/specifications updated (2 SKUs) |
| **Memory** | 20 | 6 | 14 | 0 | 0 | ✨ Portfolio expanding (+6 new options) |
| **Accessories & Infrastructure** | 1 | 0 | 1 | 0 | 0 | 🔄 Attributes/specifications updated (1 SKUs) |
| **Software & Licenses** | 244 | 0 | 244 | 0 | 1 | ⚠️ Active price drops / clearance (1 SKUs discounted) |
| **Support Services** | 1 | 1 | 0 | 0 | 0 | ✨ Portfolio expanding (+1 new options) |
| **Storage Controllers** | 6 | 0 | 6 | 0 | 0 | 🔄 Attributes/specifications updated (6 SKUs) |
| **Networking** | 3 | 0 | 3 | 0 | 0 | 🔄 Attributes/specifications updated (3 SKUs) |
| **Cables & Enablement Kits** | 2 | 0 | 2 | 0 | 0 | 🔄 Attributes/specifications updated (2 SKUs) |

### High-Impact Price Adjustments (Drops $\ge 10\%$ and Major Moves)

| Product # | Description | Category | Previous Price | Current Price | Delta (USD) | Change (%) | Movement Type |
|---|---|---|---:|---:|---:|---:|---|
| `P83865-F21` | HPE 64GB (1x64GB) Dual Rank x4 DDR5-8000 CAS-64-64-64 EC8 Registered Smart FIO Memory Kit | Memory | New Addition | $32,811 | $32,811 | **+100.0%** | ✨ NEW_OPTION |
| `P83865-B21` | HPE 64GB (1x64GB) Dual Rank x4 DDR5-8000 CAS-64-64-64 EC8 Registered Smart Memory Kit | Memory | New Addition | $32,811 | $32,811 | **+100.0%** | ✨ NEW_OPTION |
| `P83867-F21` | HPE 96GB (1x96GB) Dual Rank x4 DDR5-8000 CAS-64-64-64 EC8 Registered Smart FIO Memory Kit | Memory | New Addition | $54,115 | $54,115 | **+100.0%** | ✨ NEW_OPTION |
| `P83867-B21` | HPE 96GB (1x96GB) Dual Rank x4 DDR5-8000 CAS-64-64-64 EC8 Registered Smart Memory Kit | Memory | New Addition | $54,115 | $54,115 | **+100.0%** | ✨ NEW_OPTION |
| `P83869-F21` | HPE 128GB (1x128GB) Dual Rank x4 DDR5-8000 CAS-64-64-64 EC8 Registered Smart FIO Memory Kit | Memory | New Addition | $69,219 | $69,219 | **+100.0%** | ✨ NEW_OPTION |
| `P83869-B21` | HPE 128GB (1x128GB) Dual Rank x4 DDR5-8000 CAS-64-64-64 EC8 Registered Smart Memory Kit | Memory | New Addition | $69,219 | $69,219 | **+100.0%** | ✨ NEW_OPTION |

## 🔄 5. Recent Attribute & Specification Modifications Log

| Timestamp | Source | SKU | Attribute | Old Value | New Value | Detail |
|-----------|--------|-----|-----------|-----------|-----------|--------|
| 2026-11-12 | Services | `H30SNA1` | Vendor Attributes | {"listPrice":0,"Product Number":"H30SNA1"} | **{"Product Number":"H30SNA1"}** | Vendor Attributes: "{"listPrice":0,"Product Number":"H30SNA1"}" → "{"Product Number":"H30SNA1"}" |
| 2026-11-12 | Services | `H36NRA3` | Vendor Attributes | {"listPrice":0,"Product Number":"H36NRA3"} | **{"Product Number":"H36NRA3"}** | Vendor Attributes: "{"listPrice":0,"Product Number":"H36NRA3"}" → "{"Product Number":"H36NRA3"}" |
| 2026-11-12 | Services | `H36PBA1` | Vendor Attributes | {"listPrice":0,"Product Number":"H36PBA1"} | **{"Product Number":"H36PBA1"}** | Vendor Attributes: "{"listPrice":0,"Product Number":"H36PBA1"}" → "{"Product Number":"H36PBA1"}" |
| 2026-11-12 | Services | `H36PCA1` | Vendor Attributes | {"listPrice":0,"Product Number":"H36PCA1"} | **{"Product Number":"H36PCA1"}** | Vendor Attributes: "{"listPrice":0,"Product Number":"H36PCA1"}" → "{"Product Number":"H36PCA1"}" |
| 2026-11-12 | Services | `H36PDA1` | Vendor Attributes | {"listPrice":0,"Product Number":"H36PDA1"} | **{"Product Number":"H36PDA1"}** | Vendor Attributes: "{"listPrice":0,"Product Number":"H36PDA1"}" → "{"Product Number":"H36PDA1"}" |
| 2026-11-12 | Services | `H42ZQA1` | Vendor Attributes | {"listPrice":0,"Product Number":"H42ZQA1"} | **{"Product Number":"H42ZQA1"}** | Vendor Attributes: "{"listPrice":0,"Product Number":"H42ZQA1"}" → "{"Product Number":"H42ZQA1"}" |
| 2026-11-12 | Services | `H42ZRA1` | Vendor Attributes | {"listPrice":0,"Product Number":"H42ZRA1"} | **{"Product Number":"H42ZRA1"}** | Vendor Attributes: "{"listPrice":0,"Product Number":"H42ZRA1"}" → "{"Product Number":"H42ZRA1"}" |
| 2026-11-12 | Services | `H43BCA1` | Vendor Attributes | {"listPrice":0,"Product Number":"H43BCA1"} | **{"Product Number":"H43BCA1"}** | Vendor Attributes: "{"listPrice":0,"Product Number":"H43BCA1"}" → "{"Product Number":"H43BCA1"}" |
| 2026-11-12 | Services | `H44MDA1` | Vendor Attributes | {"listPrice":0,"Product Number":"H44MDA1"} | **{"Product Number":"H44MDA1"}** | Vendor Attributes: "{"listPrice":0,"Product Number":"H44MDA1"}" → "{"Product Number":"H44MDA1"}" |
| 2026-11-12 | Services | `H44NJA1` | Vendor Attributes | {"listPrice":0,"Product Number":"H44NJA1"} | **{"Product Number":"H44NJA1"}** | Vendor Attributes: "{"listPrice":0,"Product Number":"H44NJA1"}" → "{"Product Number":"H44NJA1"}" |
| 2026-11-12 | Services | `HU7D2A1` | Vendor Attributes | {"listPrice":0,"Product Number":"HU7D2A1"} | **{"Product Number":"HU7D2A1"}** | Vendor Attributes: "{"listPrice":0,"Product Number":"HU7D2A1"}" → "{"Product Number":"HU7D2A1"}" |
| 2026-11-12 | Services | `H0JD4A1008E` | Vendor Attributes | {"listPrice":0,"Product Number":"H0JD4A1008E"} | **{"Product Number":"H0JD4A1008E"}** | Vendor Attributes: "{"listPrice":0,"Product Number":"H0JD4A1008E"}" → "{"Product Number":"H0JD4A1008E"}" |
| 2026-11-12 | Services | `H0JD4A10BK5` | Vendor Attributes | {"listPrice":0,"Product Number":"H0JD4A10BK5"} | **{"Product Number":"H0JD4A10BK5"}** | Vendor Attributes: "{"listPrice":0,"Product Number":"H0JD4A10BK5"}" → "{"Product Number":"H0JD4A10BK5"}" |
| 2026-11-12 | Services | `389692-B21` | Description | HPE Customer Defined RAID Setting Service | **N/A** | Description: "HPE Customer Defined RAID Setting Service" → "N/A" |
| 2026-11-12 | Services | `389692-B21` | Option Type | Standard | **N/A** | Option Type: "Standard" → "N/A" |
| 2026-11-12 | Services | `389692-B21` | Start Date | 02/02/2005 | **N/A** | Start Date: "02/02/2005" → "N/A" |
| 2026-11-12 | Services | `389692-B21` | Discontinued Date | 12/31/2043 | **N/A** | Discontinued Date: "12/31/2043" → "N/A" |
| 2026-11-12 | Services | `389692-B21` | Lifecycle Status | Active | **N/A** | Lifecycle Status: "Active" → "N/A" |
| 2026-11-12 | Services | `389692-B21` | CLIC Status | Unpublished | **N/A** | CLIC Status: "Unpublished" → "N/A" |
| 2026-11-12 | Services | `389692-B21` | Availability | Available | **N/A** | Availability: "Available" → "N/A" |
| 2026-11-12 | Services | `389692-B21` | Lead Time | Unpublished | **N/A** | Lead Time: "Unpublished" → "N/A" |
| 2026-11-12 | Services | `389692-B21` | Lead Time Source | Unpublished | **N/A** | Lead Time Source: "Unpublished" → "N/A" |
| 2026-11-12 | Services | `389692-B21` | Speed Tier | Unpublished | **N/A** | Speed Tier: "Unpublished" → "N/A" |
| 2026-11-12 | Services | `389692-B21` | Vendor Recommended | false | **N/A** | Vendor Recommended: "false" → "N/A" |
| 2026-11-12 | Services | `389692-B21` | Vendor Attributes | {"Est. Lead Time":"1","listPrice":1} | **N/A** | Vendor Attributes: "{"Est. Lead Time":"1","listPrice":1}" → "N/A" |

### Current Scrape SKU Attribute Deltas

| SKU | Source | Diff Status | Attribute Changes (Old → New) |
|-----|--------|-------------|-------------------------------|
| `P68340-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2029" → "07/31/2029"; Lead Time: "Unpublished" → "3"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"3","listPrice":332}" → "{"listPrice":332}" |
| `P40513-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "02/28/2026" → "03/31/2026" |
| `P69543-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "03/13/2026" → "04/30/2026" |
| `P80318-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "09/30/2027" → "10/31/2027"; Lead Time: "Unpublished" → "5"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "5"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"10","listPrice":9130}" → "{"listPrice":9130}" |
| `P80321-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "09/30/2027" → "10/31/2027"; Lead Time: "Unpublished" → "5"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "5"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"30","listPrice":11350}" → "{"listPrice":11350}" |
| `P73831-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2029" → "07/31/2029"; Lead Time: "Unpublished" → "120"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "120"; Speed Tier: "Unpublished" → "Constrained / Long Lead Time (>45d)"; Vendor Attributes: "{"Est. Lead Time":"120","listPrice":16595}" → "{"listPrice":16595}" |
| `P74503-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2029" → "07/31/2029"; Lead Time: "Unpublished" → "14"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "14"; Speed Tier: "Unpublished" → "Standard Delivery (8-30d)"; Vendor Attributes: "{"Est. Lead Time":"3","listPrice":1756}" → "{"listPrice":1756}" |
| `P74504-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2029" → "07/31/2029"; Lead Time: "Unpublished" → "14"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "14"; Speed Tier: "Unpublished" → "Standard Delivery (8-30d)"; Vendor Attributes: "{"Est. Lead Time":"10","listPrice":2293}" → "{"listPrice":2293}" |
| `P74506-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2029" → "07/31/2029"; Lead Time: "Unpublished" → "14"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "14"; Speed Tier: "Unpublished" → "Standard Delivery (8-30d)"; Vendor Attributes: "{"Est. Lead Time":"10","listPrice":2457}" → "{"listPrice":2457}" |
| `P74507-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2029" → "07/31/2029"; Lead Time: "Unpublished" → "14"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "14"; Speed Tier: "Unpublished" → "Standard Delivery (8-30d)"; Vendor Attributes: "{"Est. Lead Time":"10","listPrice":3734}" → "{"listPrice":3734}" |
| `P74568-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2029" → "07/31/2029"; Lead Time: "Unpublished" → "14"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "14"; Speed Tier: "Unpublished" → "Standard Delivery (8-30d)"; Vendor Attributes: "{"Est. Lead Time":"3","listPrice":4242}" → "{"listPrice":4242}" |
| `P74570-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2029" → "07/31/2029"; Lead Time: "Unpublished" → "14"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "14"; Speed Tier: "Unpublished" → "Standard Delivery (8-30d)"; Vendor Attributes: "{"Est. Lead Time":"10","listPrice":8123}" → "{"listPrice":8123}" |
| `P74571-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2029" → "07/31/2029"; Lead Time: "Unpublished" → "14"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "14"; Speed Tier: "Unpublished" → "Standard Delivery (8-30d)"; Vendor Attributes: "{"Est. Lead Time":"10","listPrice":6830}" → "{"listPrice":6830}" |
| `P74573-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2029" → "07/31/2029"; Lead Time: "Unpublished" → "5"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "5"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"3","listPrice":10516}" → "{"listPrice":10516}" |
| `P74576-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2029" → "07/31/2029"; Lead Time: "Unpublished" → "14"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "14"; Speed Tier: "Unpublished" → "Standard Delivery (8-30d)"; Vendor Attributes: "{"Est. Lead Time":"3","listPrice":14682}" → "{"listPrice":14682}" |
| `P73829-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2029" → "07/31/2029"; Lead Time: "Unpublished" → "5"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "5"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"10","listPrice":13124}" → "{"listPrice":13124}" |
| `P73832-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2029" → "07/31/2029"; Lead Time: "Unpublished" → "120"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "120"; Speed Tier: "Unpublished" → "Constrained / Long Lead Time (>45d)"; Vendor Attributes: "{"Est. Lead Time":"120","listPrice":16517}" → "{"listPrice":16517}" |
| `P73834-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2029" → "07/31/2029"; Lead Time: "Unpublished" → "5"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "5"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"10","listPrice":22485}" → "{"listPrice":22485}" |
| `P73837-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2029" → "07/31/2029"; Lead Time: "Unpublished" → "5"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "5"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"10","listPrice":23285}" → "{"listPrice":23285}" |
| `P74575-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2029" → "07/31/2029"; Lead Time: "Unpublished" → "14"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "14"; Speed Tier: "Unpublished" → "Standard Delivery (8-30d)"; Vendor Attributes: "{"Est. Lead Time":"10","listPrice":10247}" → "{"listPrice":10247}" |
| `P81591-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2029" → "07/31/2029"; Lead Time: "Unpublished" → "60"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "60"; Speed Tier: "Unpublished" → "Constrained / Long Lead Time (>45d)"; Vendor Attributes: "{"Est. Lead Time":"60","listPrice":14818}" → "{"listPrice":14818}" |
| `P94926-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2029" → "07/31/2029" |
| `P68225-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2029" → "07/31/2029"; Lead Time: "Unpublished" → "14"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "14"; Speed Tier: "Unpublished" → "Standard Delivery (8-30d)"; Vendor Attributes: "{"Est. Lead Time":"4","listPrice":399}" → "{"listPrice":399}" |
| `P68226-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2029" → "07/31/2029"; Lead Time: "Unpublished" → "14"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "14"; Speed Tier: "Unpublished" → "Standard Delivery (8-30d)"; Vendor Attributes: "{"Est. Lead Time":"4","listPrice":399}" → "{"listPrice":399}" |
| `P69728-F21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2030" → "07/31/2030"; Lead Time: "Unpublished" → "14"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "14"; Speed Tier: "Unpublished" → "Standard Delivery (8-30d)"; Vendor Attributes: "{"Est. Lead Time":"10","listPrice":28532}" → "{"listPrice":28532}" |
| `P69726-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "11/30/2027" → "12/31/2027" |
| `P69726-F21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "11/30/2027" → "12/31/2027" |
| `P69727-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2030" → "07/31/2030" |
| `P69727-F21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2030" → "07/31/2030"; Lead Time: "Unpublished" → "14"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "14"; Speed Tier: "Unpublished" → "Standard Delivery (8-30d)"; Vendor Attributes: "{"Est. Lead Time":"10","listPrice":13909}" → "{"listPrice":13909}" |
| `P69728-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2030" → "07/31/2030" |
| `P69729-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2030" → "07/31/2030" |
| `P69729-F21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2030" → "07/31/2030"; Lead Time: "Unpublished" → "14"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "14"; Speed Tier: "Unpublished" → "Standard Delivery (8-30d)"; Vendor Attributes: "{"Est. Lead Time":"10","listPrice":47056}" → "{"listPrice":47056}" |
| `P69730-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2030" → "07/31/2030" |
| `P69730-F21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2030" → "07/31/2030"; Lead Time: "Unpublished" → "14"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "14"; Speed Tier: "Unpublished" → "Standard Delivery (8-30d)"; Vendor Attributes: "{"Est. Lead Time":"10","listPrice":60190}" → "{"listPrice":60190}" |
| `P73447-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2030" → "07/31/2030" |
| `P73447-F21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2030" → "07/31/2030"; Lead Time: "Unpublished" → "14"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "14"; Speed Tier: "Unpublished" → "Standard Delivery (8-30d)"; Vendor Attributes: "{"Est. Lead Time":"10","listPrice":133186}" → "{"listPrice":133186}" |
| `P83865-F21` | Hardware | ADDED | New SKU introduced |
| `P83867-F21` | Hardware | ADDED | New SKU introduced |
| `P83869-F21` | Hardware | ADDED | New SKU introduced |
| `P83865-B21` | Hardware | ADDED | New SKU introduced |
| `P83867-B21` | Hardware | ADDED | New SKU introduced |
| `P83869-B21` | Hardware | ADDED | New SKU introduced |
| `P07818-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2029" → "07/31/2029"; Lead Time: "Unpublished" → "8"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "8"; Speed Tier: "Unpublished" → "Standard Delivery (8-30d)"; Vendor Attributes: "{"Est. Lead Time":"8","listPrice":129}" → "{"listPrice":129}" |
| `P68218-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2029" → "07/31/2029"; Lead Time: "Unpublished" → "3"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"3","listPrice":549}" → "{"listPrice":549}" |
| `P68219-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2029" → "07/31/2029"; Lead Time: "Unpublished" → "3"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"3","listPrice":0}" → "{}" |
| `P68220-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2029" → "07/31/2029"; Lead Time: "Unpublished" → "3"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"3","listPrice":0}" → "{}" |
| `P68221-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2029" → "07/31/2029"; Lead Time: "Unpublished" → "3"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "3"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"3","listPrice":0}" → "{}" |
| `P68222-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "06/30/2029" → "07/31/2029"; Lead Time: "Unpublished" → "4"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "4"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"4","listPrice":249}" → "{"listPrice":249}" |
| `P68503-B21` | Hardware | ATTRIBUTE_CHANGED | Discontinued Date: "05/31/2028" → "06/30/2028"; Lead Time: "Unpublished" → "1"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "1"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"1","listPrice":1}" → "{"listPrice":1}" |
| `P08040-B21` | Hardware | ATTRIBUTE_CHANGED | Component Role: "(None)" → "Operating System / License"; Discontinued Date: "06/30/2028" → "07/31/2028"; Lead Time: "Unpublished" → "1"; Lead Time Source: "Unpublished" → "OCA row attribute"; Lead Time Days: "(None)" → "1"; Speed Tier: "Unpublished" → "Fast-Ship Certified (<=7d)"; Vendor Attributes: "{"Est. Lead Time":"1","listPrice":1}" → "{"listPrice":1}" |

## 🧩 6. Same-Product CTO Variant Matrix

| Chassis Identifier | Product Family | Generation | Form Factor | CTO Base SKU |
|--------------------|----------------|------------|-------------|--------------|
| **SY480_Gen12** | Synergy | Gen12 | Compute Module | `P68217-B21` |

## 📦 9. Solution Manifest, EDT & Commercial Baseline

**Configuration Profile**: `OCA Config 2` | **Icon ID**: `I158316730-01` | **Estimated Delivery Time (EDT)**: `14 - 18 days`

| Hardware (USD) | Support (USD) | Services (USD) | Software (USD) | Total Baseline (USD) |
|---:|---:|---:|---:|---:|
| $6,624 | $3,25,450 | $9,129 | $0 | **$3,41,203** |

### Authoritative Baseline BOM Hierarchy

| Level | Product # | Description | Qty | Unit Price (USD) | Ext. Price (USD) |
|---|---|---|---:|---:|---:|
| (1) | `P68217-B21` | HPE Synergy 480 Gen12 Configure-to-order Compute Module | 1 | $4,459 | $4,459 |
| (2) | `P64724-B21` | HPE Synergy 6310C 25/50Gb Ethernet Adapter | 1 | $2,165 | $2,165 |
| (3) | `P64724-B21 0D1` | Factory Integrated | 1 | $0 | $0 |
| (1) | `HG7A4AS` | HPE CC Environment Wide Entitlement SVC | 1 | $0 | $0 |
| (1) | `H54SBA5` | HPE 5Y Complete Care Service | 1 | $0 | $0 |
| (2) | `H54SBA5 Y35` | HPE 5Y Complete Care SVC | 1 | $2,52,630 | $2,52,630 |
| (1) | `HA113A1` | HPE Installation Service | 1 | $0 | $0 |
| (2) | `HA113A1 5ZZ` | HPE Synergy Node Installation Service | 1 | $734 | $734 |
| (1) | `HA124A1` | HPE Technical Installation Startup SVC | 1 | $0 | $0 |
| (2) | `HA124A1 V0F` | HPE Synergy First Frame Rmt Str SVC | 1 | $8,395 | $8,395 |
| (1) | `H1SR4AS` | HPE Service Credit | 1 | $0 | $0 |
| (1) | `HU0R5A5` | HPE 5Y Service Credits 10 Per Yr SVC | 1 | $0 | $0 |
| (2) | `HU0R5A5 Y39` | HPE 5Y Service Credits Qty 50 SVC | 3 | $17,526 | $52,578 |
| (1) | `HU4D5A5` | HPE 5Y Complete Care Addon Essential Service | 1 | $0 | $0 |
| (2) | `HU4D5A50BT7` | HPE SY480 Gen12 Support | 1 | $20,242 | $20,242 |

## ⏱️ 10. Supply Chain & Delivery Lead Time Intelligence

### Confirmed Component Delivery SLAs

| Product # | Description | Category | Lead Time | Channel Status |
|---|---|---|---:|---|
| `P68340-B21` | HPE Synergy NS204i-d v2 M.2 Boot Storage Device | PCIe Risers | 3 | Available |
| `P80318-B21` | HPE 480GB NVMe Gen4 Mainstream Performance Read Intensive M.2 2280 PE9010 SSD | Drive Enclosures / Drives | 5 | Not published by OCA |
| `P80321-B21` | HPE 960GB NVMe Gen4 Mainstream Performance Read Intensive M.2 2280 PE9010 SSD | Drive Enclosures / Drives | 5 | Not published by OCA |
| `P73831-B21` | Intel Xeon 6747P 2.7GHz 48-core 330W Processor for HPE | Processor | 120 | Available |
| `P74503-B21` | Intel Xeon 6505P 2.2GHz 12-core 150W Processor for HPE | Processor | 14 | Available |
| `P74504-B21` | Intel Xeon 6507P 3.5GHz 8-core 150W Processor for HPE | Processor | 14 | Available |
| `P74506-B21` | Intel Xeon 6515P 2.3GHz 16-core 150W Processor for HPE | Processor | 14 | Available |
| `P74507-B21` | Intel Xeon 6517P 3.2GHz 16-core 190W Processor for HPE | Processor | 14 | Available |
| `P74568-B21` | Intel Xeon 6520P 2.4GHz 24-core 210W Processor for HPE | Processor | 14 | Available |
| `P74570-B21` | Intel Xeon 6527P 3.0GHz 24-core 255W Processor for HPE | Processor | 14 | Available |
| `P74571-B21` | Intel Xeon 6530P 2.3GHz 32-core 225W Processor for HPE | Processor | 14 | Available |
| `P74573-B21` | Intel Xeon 6730P 2.5GHz 32-core 250W Processor for HPE | Processor | 5 | Available |
| `P74576-B21` | Intel Xeon 6737P 2.9GHz 32-core 270W Processor for HPE | Processor | 14 | Available |
| `P73829-B21` | Intel Xeon 6740P 2.1GHz 48-core 270W Processor for HPE | Processor | 5 | Available |
| `P73832-B21` | Intel Xeon 6760P 2.2GHz 64-core 330W Processor for HPE | Processor | 120 | Available |
| `P73834-B21` | Intel Xeon 6767P 2.4GHz 64-core 350W Processor for HPE | Processor | 5 | Available |
| `P73837-B21` | Intel Xeon 6787P 2.0GHz 86-core 350W Processor for HPE | Processor | 5 | Available |
| `P74575-B21` | Intel Xeon 6736P 2.0GHz 36-core 205W Processor for HPE | Processor | 14 | Available |
| `P81591-B21` | Intel Xeon 6745P 3.1GHz 32-core 300W Processor for HPE | Processor | 60 | Available |
| `P68225-B21` | HPE Synergy 480 Gen12 CPU Front Heat Sink Kit | Cooling / Thermal | 14 | Not published by OCA |
| `P68226-B21` | HPE Synergy 480 Gen12 CPU Rear Heat Sink Kit | Cooling / Thermal | 14 | Not published by OCA |
| `P69728-F21` | HPE 64GB (1x64GB) Dual Rank x4 DDR5-6400 CAS-52-52-52 EC8 Registered Smart FIO Memory Kit | Memory | 14 | Available |
| `P69727-F21` | HPE 32GB (1x32GB) Dual Rank x8 DDR5-6400 CAS-52-52-52 EC8 Registered Smart FIO Memory Kit | Memory | 14 | Available |
| `P69729-F21` | HPE 96GB (1x96GB) Dual Rank x4 DDR5-6400 CAS-52-52-52 EC8 Registered Smart FIO Memory Kit | Memory | 14 | Available |
| `P69730-F21` | HPE 128GB (1x128GB) Dual Rank x4 DDR5-6400 CAS-52-52-52 EC8 Registered Smart FIO Memory Kit | Memory | 14 | Available |
| `P73447-F21` | HPE 256GB (1x256GB) Quad Rank x4 DDR5-6400 CAS-60-52-52 EC8 Registered 3DS Smart FIO Memory Kit | Memory | 14 | Available |
| `P07818-B21` | HPE DDR4 DIMM Blank Kit | Memory | 8 | Available |
| `P68218-B21` | HPE Synergy 480 Gen12 4SFF SAS/SATA/NVMe OCP Drive Cage Kit | Drive Enclosures / Drives | 3 | Available |
| `P68219-B21` | HPE Synergy 480 Gen12 4SFF NVMe Direct Connect Drive Cage Kit | Drive Enclosures / Drives | 3 | Available |
| `P68220-B21` | HPE Synergy 480 Gen12 8EDSFF NVMe E3.S Direct Connect Drive Cage Kit | Drive Enclosures / Drives | 3 | Available |
*... [18 additional supply chain records omitted for brevity]*

### ⚠️ Supply Chain Verification Advisory (Unpublished Delivery Lead Times)

*The following high-value active components have unpublished delivery estimates in live OCA. Presales engineers must verify distributor buffer stock before quoting committed deployment timelines:*

| Product # | Description | Category | Lead Time Status | Presales Action |
|---|---|---|:---:|---|
| `P69726-B21` | HPE 16GB (1x16GB) Single Rank x8 DDR5-6400 CAS-52-52-52 EC8 Registered Smart Memory Kit | Memory | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P69726-F21` | HPE 16GB (1x16GB) Single Rank x8 DDR5-6400 CAS-52-52-52 EC8 Registered Smart FIO Memory Kit | Memory | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P69727-B21` | HPE 32GB (1x32GB) Dual Rank x8 DDR5-6400 CAS-52-52-52 EC8 Registered Smart Memory Kit | Memory | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P69728-B21` | HPE 64GB (1x64GB) Dual Rank x4 DDR5-6400 CAS-52-52-52 EC8 Registered Smart Memory Kit | Memory | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P69729-B21` | HPE 96GB (1x96GB) Dual Rank x4 DDR5-6400 CAS-52-52-52 EC8 Registered Smart Memory Kit | Memory | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P69730-B21` | HPE 128GB (1x128GB) Dual Rank x4 DDR5-6400 CAS-52-52-52 EC8 Registered Smart Memory Kit | Memory | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P73447-B21` | HPE 256GB (1x256GB) Quad Rank x4 DDR5-6400 CAS-60-52-52 EC8 Registered 3DS Smart Memory Kit | Memory | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P83865-F21` | HPE 64GB (1x64GB) Dual Rank x4 DDR5-8000 CAS-64-64-64 EC8 Registered Smart FIO Memory Kit | Memory | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P83867-F21` | HPE 96GB (1x96GB) Dual Rank x4 DDR5-8000 CAS-64-64-64 EC8 Registered Smart FIO Memory Kit | Memory | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P83869-F21` | HPE 128GB (1x128GB) Dual Rank x4 DDR5-8000 CAS-64-64-64 EC8 Registered Smart FIO Memory Kit | Memory | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P83865-B21` | HPE 64GB (1x64GB) Dual Rank x4 DDR5-8000 CAS-64-64-64 EC8 Registered Smart Memory Kit | Memory | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P83867-B21` | HPE 96GB (1x96GB) Dual Rank x4 DDR5-8000 CAS-64-64-64 EC8 Registered Smart Memory Kit | Memory | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P83869-B21` | HPE 128GB (1x128GB) Dual Rank x4 DDR5-8000 CAS-64-64-64 EC8 Registered Smart Memory Kit | Memory | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P46199-AA1` | Microsoft Windows Server 2022 2-core Standard Additional License Chinese Simplified SW | Software & Licenses | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P46199-AB1` | Microsoft Windows Server 2022 2-core Standard Additional License Chinese Traditional SW | Software & Licenses | **Unpublished** | Verify distributor inventory prior to SLA commitment |
*... [80 additional unpublished items omitted for brevity]*

