# HPE Knowledge Registry — Local Audit Index

**Document Version**: `2.0.0` | **Generated**: `2026-11-24T15:09:45.872Z`
**Scope**: Local governance index. This file is not a NotebookLM source; product notebooks receive independently scoped projections.
**Total Verified Knowledge Deltas**: `194` (`23` Universal + `0` Family/Gen + `171` Chassis Specific)

---

## Scoped Knowledge Delta Inventory

### 🌐 1. Universal Vendor Rules (Zero Product-Specific SKUs)

#### U1. [DELTA_UNIVERSAL_MULTI_ICON_ERROR_ATTRIBUTION] ERROR_DIAGNOSTIC_ATTRIBUTION
- **Scope**: `UNIVERSAL_VENDOR`
- **Rule**: When Rule 81039677 occurs on multi-icon tenders, trace errors to individual child icon containers instead of modifying the root BOM item.
- **Affected Policy Token**: `SOLUTION_TREE_ITEM_0100_01`

#### U2. [DELTA_UNIVERSAL_SUPPORT_TIER_ISOLATION] ICON_SUPPORT_ISOLATION
- **Scope**: `UNIVERSAL_VENDOR`
- **Rule**: Configure support services independently per icon container. Never broadcast support attributes across diverse product families.
- **Affected Policy Token**: `HU4B2A3`

#### U3. [DELTA_UNIVERSAL_OCA_SUPPORT_CACHE_FLUSH] SESSION_RECOVERY_PROTOCOL
- **Scope**: `UNIVERSAL_VENDOR`
- **Rule**: Historical service-selector workaround only: in an authenticated working OCA configuration with contradictory service selections, reselect services for the owning node and revalidate. It is not an expired-session recovery. If OCA displays encountered-a-problem, refresh/login from Partner Portal and launch One Config Advanced through Quick Links; never reload the failed OCA tab or remove services as a session fix.
- **Affected Policy Token**: `HU4B2A3`

#### U4. [LEARN_UNIVERSAL_SMART_CHOICE_BTO_VS_OCA_VALIDATION_20261112] WORKFLOW_SMART_CHOICE_CTO_VALIDATION_STEPS
- **Scope**: `UNIVERSAL_VENDOR`
- **Rule**: HPE Smart Choice (xxxxxx-xx5) and regional BTO SKUs are pre-configured distributor builds, NOT CTO (-B21) configurables: (1) Never infer unstated internal factory SKUs from the short description alone (QuickSpecs notes BTO models ship with a pre-selected primary NIC without naming its exact SKU in the title, and HPE forbids factory integration of extra options into pre-configured models). (2) Never treat an OCA Customize BOM export of a -xx5 SKU as proof of factory-included parts: OCA opens Smart Choice SKUs as blank shells (0 CPU/RAM/PSU errors), auto-selects separately priced CTO menu defaults on top of the base SKU, and fails CLIC with Rule 81016667 (UNBUILDABLE: configure/quote/order via Distributor webstore or iQuote Universal, Warning 81400509). (3) Validation & reasoning steps: verify suffix (-xx5 BTO/Smart Choice vs -B21 CTO in chassis_map.json / *_Catalog.json); if CTO is desired, map to -B21 CTO chassis and run the canonical CTO evaluation/CLIC path; if exact Smart Choice factory contents are needed, consult HPE Smart Choice Supplemental QuickSpecs (e.g. a50009219enw), iQuote Universal, or an authorized distributor.

#### U5. [LEARN_UNIVERSAL_CLIC_GLOBAL_CHECK_AND_SEVERITY_TRIAGE_20261112] WORKFLOW_CLIC_GLOBAL_AND_SEVERITY_TRIAGE
- **Scope**: `UNIVERSAL_VENDOR`
- **Rule**: For any full HPE solution in OCA: (1) Run CLIC Check at the Global Solution Level (top breadcrumb #eo_nav_li_0) rather than only at a child frame/node (Partial CLIC Check), and click Download Advice (#_clic_download_excel) to inspect every row of the Advice_Text and BOM sheets alongside Solution Summary Messages/Issues. (2) Triage CLIC severities properly: Unbuildables and Process control (P+ in Advice_Text) MUST be fixed or formally exception-approved before quoting/ordering. Plain Error rows do not automatically break buildability and may sometimes be ignored, but MUST still be read carefully to verify whether a required action/quantity is missing or already met elsewhere in the solution. Warnings (e.g., PSU C13-to-C20 jumper cables for C19 PDUs, redundant VC FC licenses) must also be reviewed for physical deployment completeness. (3) Note that CLIC Advice Information sheet counts may underreport Warning rows compared to Advice_Text and CLIC Advice BOM may omit icon-level service lines outside the hardware container.

#### U6. [LEARN_UNIVERSAL_LIFECYCLE_CLOSENESS_LEADTIME_RANKING_20261115] WORKFLOW_CLOSENESS_LIFECYCLE_AND_LEADTIME
- **Scope**: `UNIVERSAL_VENDOR`
- **Rule**: Strategy synthesis and least-delta replacement (INV-237): (1) Filter out DISCONTINUED / OBSOLETE SKUs across both hardware options and support services (allowing ACTIVE/REINSTATED SKUs and routing 90-day EOL warnings via dual-track PRESALES_CLEARANCE_STRATEGY). (2) Rank buildable alternatives using weighted component attribute fidelity (CPU cores/GHz, memory capacity/MTs/rank, GPU compute, drive capacity/protocol) and protect GPU downgrades rather than counting raw SKU deltas equally. (3) Surface lead-time optimization advisories when a functionally close active match reduces delivery wait significantly (>= 14 days faster on parts with >= 21-day lead time). (4) Attribute cascading troublemaker SKUs from the rule/error graph and honor defaultOffline: true on automatic RFP-to-BOQ continuation unless cloud validation is explicitly requested.

#### U7. [LEARN_UNIVERSAL_CATEGORY_TOPOLOGY_AND_ESCALATION_20261115] WORKFLOW_CATEGORY_DEPENDENCY_AND_ESCALATION
- **Scope**: `UNIVERSAL_VENDOR`
- **Rule**: SKU category prerequisite intelligence & runtime escalation (INV-238): (1) Drive Cage / Backplane topology — NOT bare drives alone — dictates Storage Controller requirements: NO_DRIVE_KIT and DIRECT_CONNECT_CAGE (direct-attach NVMe) exempt hardware controllers, whereas CONTROLLER_ROUTED_CAGE (Tri-Mode U.3/SAS/SATA front cages) without a controller or VROC trigger STORAGE_CONTROLLER_FOR_CAGE. Unspecified front cages log explicit ambiguity for verification rather than guessing. (2) Enforce full cross-category matrix across 11 component categories via analyzeCategoryDependencies(). (3) Expose inspect_category_dependencies (MCP & guardrail) and query_codebase_graph (local Graphify lookup) alongside query_notebooklm, escalating unresolved ambiguities via [TRUSTED_WEB_VERIFICATION_REQUIRED] with site:hpe.com QuickSpecs hints.

#### U8. [LEARN_UNIVERSAL_ATTRIBUTE_DELTA_AND_SYNC_CONFIRMATION_20261115] WORKFLOW_ATTRIBUTE_DELTAS_AND_SYNC_RECEIPTS
- **Scope**: `UNIVERSAL_VENDOR`
- **Rule**: End-to-end catalog diff & sync confirmation protocol (INV-239): (1) Preserve Attribute Deltas ("field: oldValue -> newValue") across TSVs (34 columns), Excel sheets (All SKUs, Catalog Diffs, Price History Timeline), XLSX->JSON round-trips, price_history.json [Delta Attr] trails, and checksum_diff.js incremental modifiedSkus. (2) Match duplicate-PN rows against closest prior candidate rows (Description / Option Type / Sub-Category) before falling back to prevSkuMap. (3) Tally ATTRIBUTE_CHANGED and PRICE_AND_ATTRIBUTE_CHANGED alongside sibling *_Services.json in *_Catalog_Diff_Summary.md and NLM sync payloads. (4) Await quickSpecsSyncPromise in triggerPostFlowSyncAsync, persist qualityAuditPassed + NLM confirmation fields in scraping_verification_receipt.json, and enforce execNlmRead (cdp->httpx failover) on read RPCs.

#### U9. [LEARN_UNIVERSAL_MULTIVENDOR_PORTAL_CDP_AND_DOMAIN_RULES_20261115] WORKFLOW_MULTIVENDOR_PORTAL_AND_CDP_GUARD
- **Scope**: `UNIVERSAL_VENDOR`
- **Rule**: Multi-vendor portal, domain rules & CDP readiness protocol (INV-240): (1) Use registerCustomVendorPortalPolicy, registerVendorScraperAdapter (ConfigurablePortalDomAdapter / LenovoDcscAdapter), normalizeSolutionPillar (Server/Storage/Networking/Composite), and --vendor/--portal-url CLI flags to onboard new vendor portals cleanly without hardcoded credentials. (2) Expose inspect_catalog_deltas and check_portal_and_sync_readiness via mcp_server.js (14 tools). (3) Enforce preflight/postflight, diff summary, capture receipt, and NLM sync parity in scrape_oca_storage_solution.js and normalize alternate rule schemas (ruleId/description/type) in catalog_rules.js before classifyRule. (4) Use probeCdpPort(9222) so non-CDP HTTP listeners (e.g. background msedge HTTP 404) surface portConflict: true / occupiedByNonCdp: true and return HTTP 503 on POST /api/tasks/launch-browser instead of masking as SUCCESS.

#### U10. [LEARN_UNIVERSAL_CDP_FATAL_EVAL_AND_RETRY_GUARD_20261117] WORKFLOW_CDP_FATAL_EVAL_AND_RETRY_GUARD
- **Scope**: `UNIVERSAL_VENDOR`
- **Rule**: CDP polling helpers must classify SyntaxError and ReferenceError exceptions as immediate fatal errors instead of retrying silently to false, DOM evaluation builders must serialize inputs safely via JSON.stringify, OCA navigation timeouts must surface OCA_RESPONSE_TIMEOUT without closing active OCA workspaces (keeping Partner Portal tabs alive), and QuickSpecs downloads must try vendor HTTPS first with isolated browser-context fallback so active configuration tabs remain untouched (INV-241).

#### U11. [LEARN_UNIVERSAL_BACKPLANE_SELECTOR_STATE_DISCOVERY_20261117] WORKFLOW_SELECTOR_STATE_BACKPLANE_DISCOVERY
- **Scope**: `UNIVERSAL_VENDOR`
- **Rule**: Runtime discovery plans must forward exact selector trigger SKUs into bounded inactive backplane selector probes when hot-plug drive tables are collapsed, record a completed sweep only after verified quantity 1 readback and confirmed return to quantity 0 in try/finally (throwing loudly if restore fails or readback drops), materialize portal-observed conditional rows into hardwareEntries, and render selector tables with explicit scope disclosure into NotebookLM payloads (INV-241).

#### U12. [LEARN_UNIVERSAL_PARSER_PRICE_AND_HEADER_OWNERSHIP_20261117] WORKFLOW_PARSER_PRICE_AND_HEADER_OWNERSHIP
- **Scope**: `UNIVERSAL_VENDOR`
- **Rule**: Workbook parsers must enforce strict header precedence so Extended List Price columns never overwrite Unit Price values, consolidate zero-dollar factory modifier or country-suffix companion lines without inflating quantities, tag quantity-1 installation and support wrapper headers as order-level global scope across multi-node tenders, and exempt non-fix customer-originated service lines in pre-presentation checks (INV-241).

#### U13. [LEARN_UNIVERSAL_RECONCILIATION_UNSPLIT_AND_SERVICES_20261117] WORKFLOW_RECONCILIATION_UNSPLIT_AND_SERVICES_LOOKUP
- **Scope**: `UNIVERSAL_VENDOR`
- **Rule**: Two-baseline BOM reconciliation must resolve unsplit customer baseline items directly from parsed workbook lines scaled across per-node multipliers (preserving global wrapper items at quantity 1), check sibling services JSON catalogs alongside hardware catalog entries so valid SaaS and care SKUs are not misclassified as uncataloged, and support explicit no-quarantine flags in verification runs (INV-241).

#### U14. [LEARN_UNIVERSAL_SEPARATED_CABLE_PATHS_AND_CATEGORY_MATCHING_20261117] WORKFLOW_TOPOLOGY_CATEGORY_AND_CABLE_ENFORCEMENT
- **Scope**: `UNIVERSAL_VENDOR`
- **Rule**: Physical validation must distinguish backplane-to-controller storage signal cables, CPU-to-slot OCP enablement cables, and controller sideband telemetry paths separately without miscounting storage cables as adapters or passing disconnected backplanes, enforce product-specific thermal kit lookup before falling back, and reject cross-category hardware mismatches plus non-hardware OS/management tokens in replacement scoring (INV-241).

#### U15. [LEARN_UNIVERSAL_FAST_SHIP_TOPOLOGY_AND_CLIC_CARRYFORWARD_20261117] WORKFLOW_FAST_SHIP_TOPOLOGY_AND_CLIC_CARRYFORWARD
- **Scope**: `UNIVERSAL_VENDOR`
- **Rule**: Fast-ship candidate synthesis must resolve coupled cabling and enablement paths and pass full multi-aspect physical revalidation before ranking, spare non-bottleneck compute/power parts when another hardware option sets the >=21-day lead-time bottleneck, report configurator solution Estimated Delivery Time separately from single-part component lead times, and classify BOM CLIC Status or live configurator results with 0 unbuildables, 0 errors, and 0 process-control blocks (even with warning advisories) as PORTAL_VALIDATED_WITH_WARNINGS while failing closed on any unbuildable/error row or unbacked validation claim (INV-241).

#### U16. [LEARN_UNIVERSAL_BLINDSPOT_SUPPORT_PARITY_AND_MULTIVENDOR_BOM_20261118] WORKFLOW_BLINDSPOT_SUPPORT_PARITY_AND_MULTIVENDOR_BOM
- **Scope**: `UNIVERSAL_VENDOR`
- **Rule**: Universal portfolio intelligence, support governance & multi-vendor attribute mapping rules (INV-242, INV-243): (1) Index companion *_Services.json entries non-destructively onto catalogData via non-enumerable _servicesEntries (preserving catalogData.entries and snapshotFingerprint), normalize -2/-1 max-qty sentinels to null, and recover or flag SHIFTED_COLUMN_CORRUPTION rows where SKU/badge tokens leak into Unit Price columns. (2) Enforce per-node quantity parity (Qty >= serverCount) for COM, iLO, and child support SKUs, flag COM-vs-hardware term mismatches and discontinued iLO licenses, fail Gate B14 as ACTION_REQUIRED when multi-node Gen11/Gen12 servers have qualifyingComQty < chassisQty without an approved SmartForm override, and separate Gate B19 PORTAL_VALIDATED_WITH_PC_OVERRIDE from unresolved P+ Process Control blocks. (3) Keep cross-solution price/lead-time backfill scoped strictly to same-generation matches while preserving nullable unpriced SKUs. (4) Map competitor Dell/Huawei/Cisco/Lenovo BOM lines using canonical attribute vectors without silent write-endurance or InfiniBand-to-Ethernet downgrades, and keep deadcode/orphan and scope-aware delta deduplication gates green.

#### U17. [LEARN_UNIVERSAL_OCA_UPLOAD_CONFIG_NAME_AND_DIVISIBILITY_20261124] WORKFLOW_OCA_UPLOAD_CONFIG_CONTAINER_CONTRACT
- **Scope**: `UNIVERSAL_VENDOR`
- **Rule**: 4-column HPE OCA BOM upload workbooks (Product #, Product Description, Qty, Config Name starting at A1 with zero trailing blank rows and preserved HPE modifier whitespace) must satisfy: (1) Use exact built-in keyword Ad-Hoc #1 in pre-upload Excel sheets for loose non-0D1 cables and transceivers — NEVER post-import display labels like AdHoc - SFP + Cables or AdHoc - Cables + Trans (verified in UCID 5158592304-01 vs UCID 5158590124-02: uploading AdHoc - SFP + Cables caused OCA to absorb K2Q47A x6, QK729A x6, and R6B12A x16 into 32Gb/20 4SFP+ FC #2 and scatter the remaining 7 loose cables across separate Ad-Hoc buckets, whereas Ad-Hoc #1 imports all 10 into one container that can be renamed in the UI afterward); (2) Parent-child integer divisibility (childQty % parentQty === 0) inside every non-AdHoc CTO Config Name, because OCA builds one template per Config Name scaled by parentQty and ejects non-divisible children (e.g. 1x 453154-B21 under 2x 876852-B21 = 0.5/unit) into extra Ad-Hoc containers; (3) Keep factory-integrated 0D1 transceivers inside parent modules only when divisible, and place indivisible loose parts in Ad-Hoc #1 without 0D1; (4) Number frame and FLM Config Names sequentially (#1, #2, #3), never role-named #1 duplicates or skipped indices, and anchor aggregated HU4B2A3* services to each owning product class #1 Config Name.

#### U18. [OWNER_STANDARD_3Y_BASIC] SUPPORT_POLICY
- **Scope**: `UNIVERSAL_VENDOR`
- **Rule**: Preserve explicit customer support term and tier in the closest rank; use 3-year Tech Care Basic only when unspecified or explicitly authorized. For this SN3600B BOQ the owner authorized 5-year Essential to 3-year Basic. Compare qualified fixed and flexible service options; disclose retention and preserve parent/suffix pairs. This commercial preference is not vendor qualification.

#### U19. [OWNER_ICON_SERVICE_ISOLATION] ICON_SUPPORT_ISOLATION
- **Scope**: `UNIVERSAL_VENDOR`
- **Rule**: Select Services from Components for the owning icon, edit its dropdowns, and leave both apply-to-all icons and apply-to-all nodes off. Different icons retain their own SLA.

#### U20. [OWNER_OCA_EXPIRED_SESSION] SESSION_RECOVERY_PROTOCOL
- **Scope**: `UNIVERSAL_VENDOR`
- **Rule**: When OCA says it encountered a problem, restart from Partner Portal refresh/login and open One Config Advanced through Quick Links. Do not reload the failed OCA session. Keep a Partner Portal tab before closing stale OCA so CDP does not disappear. This supersedes cache-flush advice for encountered-a-problem errors.

#### U21. [OWNER_CLOSEST_REQUIREMENT_RANK] CUSTOMER_INTENT_POLICY
- **Scope**: `UNIVERSAL_VENDOR`
- **Rule**: Closest rank preserves customer requirements and makes only necessary compatibility/buildability changes. Budget alternatives disclose every deviation; do not silently reduce term, tier, capacity or resilience. Keep explicit owner overrides auditable against the original customer BOQ.

#### U22. [OWNER_COMPONENT_DOMAIN_ROUTING] COMPONENT_DOMAIN_ROUTING
- **Scope**: `UNIVERSAL_VENDOR`
- **Rule**: Route by component role and exact product, never vendor or family alone. Synergy compute, fabric and frame use separate scopes. Resolve ownership before quantities. Validate each component and enclosure/bay, adapter/fabric, optical endpoints, shared power and per-icon SLA relationships; missing profiles remain NOT_EVALUATED and cannot inherit server defaults. Scraping completeness is not buildability certification.

#### U23. [GUARDRAIL_TRANSPORT_RECOVERY] GUARDRAIL_RECOVERY_POLICY
- **Scope**: `UNIVERSAL_VENDOR`
- **Rule**: Gemini guardrail API sends must retain systemInstruction and function declarations when overriding SDK send config. Enforce scoped local simulation and NotebookLM checks. Retry bounded transient provider errors without exhausting keys, distinguish per-minute from explicit daily quotas, and use configured approved model fallback with preserved tool results and no replay side effects. Empty or unfinished responses are unavailable, not verification. Dashboard status is independent of NotebookLM and vendor acceptance.

### 🏛️ 2. Family & Generation Rules

*No verified family/generation rules logged.*

### 🎯 3. Chassis & Solution Gotchas (Grouped by Product)

#### C1. [LEARN_ALLETRA_MP_B10000_DUAL_NODE_CHASSIS_20261102] Alletra_Storage_System — STORAGE_CHASSIS_SPECIFIC
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: HPE Alletra Storage MP B10000 base storage controller chassis is R0Q37A (HPE Alletra MP Dual-Node Storage Controller Base System CTO Chassis at $15,200.00 list price). Storage pillar architecture operates in disaggregated dual-node active-active controllers with NVMe-oF and dedicated high-availability interconnects.
- **Affected SKU**: `R0Q37A`

#### C2. [LEARN_ALLETRA_STORAGE_DOMAIN_ISOLATION_20261102] Alletra_Storage_System — STORAGE_DOMAIN_FIREWALL
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Storage domain separation (INV-194): Alletra storage controller bays, expansion JBOFs, FC/iSCSI target adapters, and storage OS software licenses must remain strictly partitioned from compute server racks and cannot inherit ProLiant server rules or Tech Care server defaults.
- **Affected SKU**: `R0Q37A`

#### C3. [LEARN_ALLETRA_QUARANTINE_UNVERIFIED_BOQS_20261102] Alletra_Storage_System — NOTEBOOK_PURITY_GOVERNANCE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Per Invariant INV-24, customer BOQ spreadsheets and unverified tender documents (including Latest Alletra Requirement BOQ - Sheet1 and OCA BOM) are strictly quarantined and detached from the cloud NotebookLM knowledge base to prevent RAG reasoning pollution.

#### C4. [DELTA_NLM_HEADLESS_CHROME_ORPHAN_RECLAMATION] GLOBAL — ENVIRONMENT_HEALING_PROTOCOL
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Headless Chrome instances (--headless=new) spawned during background pre-flights can become orphaned zombies on port 9222, locking ~/.notebooklm-mcp-cli/chrome-profiles/default/lockfile and blocking interactive nlm login from opening visible UI windows. check_nlm_auth.js:cleanStaleNlmChromeAndLocks pre-emptively kills orphaned headless Chrome processes on port 9222 and unlinks lockfiles. Wired via npm run auth:nlm:heal and scraping_preflight_gate.js auto-healing.
- **Affected SKU**: `NLM_MCP_AUTH`

#### C5. [DELTA_DL380A_GEN12_DRIVE_CAGE_EXCLUSIVITY] DL380a_Gen12 — STORAGE_COLLISION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: DL380a prohibits mixing 4SFF cage P74710-B21 and 4EDSFF cage P74712-B21.
- **Affected SKU**: `P74710-B21`

#### C6. [DELTA_DL380A_GEN12_DUAL_CPU_HOMOGENEOUS] DL380a_Gen12 — PROCESSOR_POPULATION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: DL380a Gen12 requires two identical processor models; single-processor and mixed-processor configurations are unsupported.
- **Affected SKU**: `P76706-B21`

#### C7. [DELTA_DL380A_GEN12_GPU_PSU_COUNT_MATRIX] DL380a_Gen12 — POWER_REDUNDANCY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Requires a minimum of five power supplies for 2DW/4DW GPU configurations (up to eight for N+N grid redundancy or pre-populating all 8 bays) and eight power supplies for 8DW/10DW; H100/H200 NVL supports 2400W P67252-B21 or 3200W P67248-B21 Titanium supplies, without mixing wattages.
- **Affected SKU**: `P76706-B21`

#### C8. [DELTA_DL380A_GEN12_LIVE_OCA_PRICING_ALIGNMENT_5155756524-01] DL380a_Gen12 — LIVE_QUOTE_RECONCILIATION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Pointnext support on 8-GPU H200 DL380a scales to accelerator tier ($11,306), install scales to 4U GPU tier ($507), NVLink bridge list is $2,170, and GPU cable list is $114.
- **Affected SKU**: `HU4B2A30C4W`

#### C9. [DELTA_UNIVERSAL_CLOUD_MANAGEMENT_OPTIONAL] DL380a_Gen12 — SOFTWARE_OPTIONALITY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Cloud Management FIO Enablement (S1A05A) and Compute Ops Management SaaS (R7A11AAE) are strictly optional services/licenses. They are not required for hardware buildability, power-on, or vendor portal acceptance.
- **Affected SKU**: `S1A05A`

#### C10. [DELTA_DL380_GEN12_NO_DRIVE_BYPASS] DL380_Gen12 — STORAGE_OVERRIDE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: When 873763-B21 is present, bypass physical drive cage, storage controller, and battery minimums.
- **Affected SKU**: `873763-B21`

#### C11. [DELTA_DL380_GEN12_LOCALIZATION_GATE] DL380_Gen12 — LOCALIZATION_GATE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: If Gen12 CTO base chassis is selected, P73325-B21 is mandatory for portal buildability.
- **Affected SKU**: `P73282-B21`
- **Required Dependency**: `P73325-B21`

#### C12. [DELTA_DL380_GEN12_COM_SAAS_MANDATE] DL380_Gen12 — MANAGEMENT_LICENSING
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Gen12 requires exactly 1 management SaaS license (R7A11AAE). Remove redundant BD505A when R7A11AAE is selected.
- **Affected SKU**: `P73282-B21`
- **Required Dependency**: `R7A11AAE`

#### C13. [DELTA_DL380_GEN12_LOT9_CE_BYPASS] DL380_Gen12 — POWER_BYPASS
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: If Platinum PSUs are selected on Gen12, P35876-B21 clears EU Lot 9 CE prompts.
- **Affected SKU**: `P38995-B21`
- **Required Dependency**: `P35876-B21`

#### C14. [DELTA_DL380_GEN12_25C_AMBIENT_TRACKING] DL380_Gen12 — THERMAL_TRACKING
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: P79558-B21 tracks 25C ambient baseline for Gen12 chassis.
- **Affected SKU**: `P73282-B21`
- **Required Dependency**: `P79558-B21`

#### C15. [DELTA_DL380_GEN12_HIGH_TDP_COOLING] DL380_Gen12 — COOLING_MANDATE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: CPUs > 185W TDP mandate High-Performance Fan Kit P48820-B21 and High-Performance Heatsink P74792-B21.
- **Affected SKU**: `P74507-B21`
- **Required Dependency**: `P48820-B21`

#### C16. [DELTA_DL380_MISSING_SUPPORT_CONTRACT] DL380_Gen12 — DEPENDENCY
- **Scope**: `ProLiant/Gen12/DL380_Gen12`
- **Rule**: Every HPE ProLiant DL380 Gen12 server (P73282-B21) requires a hardware maintenance support contract. Common customer error: quoting software licenses (P8B31A OneView) while omitting hardware warranty (HU4B2A30C4V 3Y Tech Care Basic at ,509/unit). The BOQ evaluator must flag any DL380 Gen12 config that has 0 support units against N physical servers.
- **Affected SKU**: `HU4B2A30C4V`
- **Required Dependency**: `P73282-B21`

#### C17. [DELTA-1787856163365] DL380_Gen11 — MEMORY_POPULATION_CONSTRAINT
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: When ordering P52534-B21 (DL380 Gen11 8SFF NC CTO), minimum 1 and maximum 16 memory DIMMs must be ordered per processor.
- **Affected SKU**: `P52534-B21`
- **Required Dependency**: `MEMORY_KIT_MIN1_MAX16`

#### C18. [DELTA-1787856163549] DL380_Gen11 — SUPPLY_CONSTRAINT_FIO_SUBSTITUTION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Standalone SKU P64707-B21 constrained; must substitute factory-integrated P64707-F21 for CTO factory build.
- **Affected SKU**: `P64707-B21`
- **Required Dependency**: `P64707-F21`

#### C19. [DELTA-1787856163672] DL380_Gen11 — OPERATING_SYSTEM_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Advisory: Selection of an Operating System is recommended for factory deployment.
- **Affected SKU**: `P52534-B21`

#### C20. [DELTA-1787856163759] DL380_Gen11 — MANAGEMENT_UTILITY_COMPATIBILITY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: When ordering MegaRAID controller P58335-B21, MegaRAID Tools cannot be used to configure legacy SmartRAID arrays.
- **Affected SKU**: `P58335-B21`
- **Required Dependency**: `P58335-B21`

#### C21. [DELTA_CLIC_81354632_DL380_GEN11] DL380_Gen11 — PHYSICAL_ATTACH_REQUIREMENT
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: If P48832-B21 (Tri-Mode Splitter Cable) is selected, P48814-B21 (8SFF U.3 Premium Cage) is mandatory.
- **Affected SKU**: `P48832-B21`
- **Required Dependency**: `P48814-B21`

#### C22. [DELTA_CLIC_81354652_DL380_GEN11] DL380_Gen11 — PHYSICAL_POWER_ENABLEMENT
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: If P02377-B21 / P01366-B21 (Capacitor/Battery) is selected, P48918-B21 (Storage Controller Enablement Cable Kit) is mandatory.
- **Affected SKU**: `P02377-B21`
- **Required Dependency**: `P48918-B21`

#### C23. [DELTA_CLIC_81355854_DL380_GEN11] DL380_Gen11 — MUTUAL_EXCLUSIVITY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: P51911-B21 and P48830-B21 cannot be selected together. Retain P48830-B21.
- **Affected SKU**: `P51911-B21`
- **Required Dependency**: `P48830-B21`

#### C24. [DELTA_CLIC_81016755_DL380_GEN11] DL380_Gen11 — RISER_SLOT_ENABLEMENT
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: When 5+ PCIe cards are installed, P56073-B21 Primary Cable Kit is mandatory for Primary Riser Slot 1.
- **Affected SKU**: `P48803-B21`
- **Required Dependency**: `P56073-B21`

#### C25. [DELTA_CLIC_EU_LOT9_P35876_DL380_GEN11] DL380_Gen11 — REGULATORY_ENABLEMENT
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: When ordering Platinum PSUs (P38997-B21) on high-draw dual-socket configurations, P35876-B21 (CE Mark Removal Kit) is required for non-EU deployment, or upgrade to Titanium PSUs (P44712-B21).
- **Affected SKU**: `P38997-B21`
- **Required Dependency**: `P35876-B21`

#### C26. [DELTA_RAG_DEP_P02377-B21_P48918-B21_1787913302880] DL380_Gen11 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: P02377-B21` or `P01366-B21` **mandates the inclusion of `P48918-B21
- **Affected SKU**: `P02377-B21`
- **Required Dependency**: `P48918-B21`

#### C27. [DELTA_RAG_DEP_P58335-B21_P48918-B21_1787913632019] DL380_Gen11 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: P58335-B21`)** with the **Smart Storage Hybrid Capacitor (`P02377-B21`)** strictly requires `P48918-B21
- **Affected SKU**: `P58335-B21`
- **Required Dependency**: `P48918-B21`

#### C28. [DELTA_RAG_DEP_write-cach_P48918-B21_1787915281069] DL380_Gen11 — STORAGE_CACHE_CABLE_DEPENDENCY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Selecting storage controller P58335-B21 write-cache backup requires enablement cable P48918-B21.
- **Affected SKU**: `P58335-B21`
- **Required Dependency**: `P48918-B21`

#### C29. [LEARN_DL380_GEN11_P71674_425_SMART_CHOICE_20261112] DL380_Gen11 — WORKFLOW_SMART_CHOICE_OBSERVATION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: P71674-425 (EMEA DL380 Gen11 Smart Choice 4510 12c 1P 64GB-R 8SFF MR408i-o 2x960GB SSD 2x1000W PS) is absent from DL380_Gen11_Catalog.json and DL380 Gen11 CTO QuickSpecs (deferred to Smart Choice Supplemental QuickSpecs a50009219enw). Baseline fixed by title + chassis spec: Silver 4510 1P, 64GB-R, 8SFF, MR408i-o, 2x960GB SSD, 2x1000W PSU, 1Gb dedicated rear iLO 6 port, and a pre-selected primary NIC (distributor listings cite BCM5719 1Gb 4p OCP3 P51181-B21). In live OCA Customize, P71674-425 loads as 0 CPU/0GB with PSU error, auto-adds separately priced P47777-B21 ($5,999 MR416i-p despite built-in MR408i-o), P01366-B21 ($110), P48918-B21 ($38), P51181-B21 ($485), S7P77AAE ($750), AC114A ($210) totaling $19,425 vs $11,833 base, and fails CLIC with Rule 81016667 (use iQuote Universal / distributor). Use CTO -B21 bases for customizable DL380 Gen11 configurations.
- **Affected SKU**: `P71674-425`

#### C30. [LEARN_UNIVERSAL_NLM_READ_FAILOVER_AND_SYNC_PRESERVATION_20261114] DL380_Gen11 — WORKFLOW_NLM_SYNC_RESILIENCE_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Idempotent NotebookLM read RPCs (source list, source content, canary notebook query) MUST fail over from CDP to httpx via execNlmReadWithFallback() when CdpTransportError occurs. Transient CLI read/transport errors MUST NOT downgrade cloudSyncState from VERIFIED to FAILED when an active certifiedCatalogSourceIds publication already matches the current on-disk Catalog.json SHA-256.

#### C31. [LEARN_UNIVERSAL_CAPTURE_RECEIPT_REBUILD_RECONCILIATION_20261114] DL380_Gen11 — WORKFLOW_CAPTURE_RECEIPT_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Local catalog rebuild scripts (build_catalog.js, generate_xlsx.js) MUST invoke reconcileRebuiltCaptureReceipt() to refresh capture_receipt.json artifact hashes and counts only when raw_data/oca_raw_data_full.json SHA-256 matches the verified receipt rawSha256. Rebuilt receipts MUST fail closed when rawSha256 differs.

#### C32. [LEARN_UNIVERSAL_QUARANTINE_SEMANTIC_REVALIDATION_20261114] DL380_Gen11 — WORKFLOW_QUARANTINE_GOVERNANCE_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Quarantined knowledge deltas MUST pass _checkSemanticExtractionIntegrity() (rejecting inverted discontinued-SKU dependencies, slash/disjunctive pairs misparsed as dependencies, and corrupted 6-digit SKU-prefix quantities) before promotion eligibility. Legacy quarantined deltas failing INV-230 re-validation MUST be pruned with append-only AUTO_REJECTED_BY_INV230_REVALIDATION records in knowledge_decisions.json.

#### C33. [DELTA-DL385-GEN11-COM-MANDATE-81322276] DL385_Gen11 — MANDATORY_SOFTWARE_ATTACH
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: All compatible NPI CTO base models for Gen11 DL and ML platforms (such as DL385 Gen11 P53921-B21) strictly mandate at least 1 Compute Ops Management (COM) license to be quoted. Base SKU is R7A11AAE (HPE COM Standard 3-year Upfront ProLiant SaaS, $450.00 USD). Submitting without triggers CLIC Rule 81322276 PROCESS CONTROL CONFIGURATION: OVERRIDE REQUIRES APPROVAL and blocks quote export.
- **Affected SKU**: `P53921-B21`
- **Required Dependency**: `R7A11AAE`

#### C34. [DELTA-DL385-GEN11-FAN-GRANULARITY-INV183] DL385_Gen11 — THERMAL_COOLING_PACKAGING_RULE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: On AMD DL3X5 Gen11 platforms, Standard Fan Kit (P58464-B21, $157) is ordered as individual fan modules (4 for 1P = $628, 6 for 2P = $942). In contrast, Performance Fan Kit (P58465-B21, $160) is packaged as a complete chassis kit (max 1 per server = $160 total). OCA enforces mutual exclusion between Standard and Performance fan kits (RULE_25/TEXT_63). In standard 8SFF with Performance Heatsinks (P58459-B21) and Air Baffle (P57886-B21), OCA accepts 6x P58464-B21. However, P58465-B21 (Performance Fan Kit, Qty 1) is the recommended presales best practice whenever customer drive types (BYOD NVMe SSDs) or drive cage expansions are unspecified, providing superior CFM airflow, static pressure, and thermal headroom at lower total list price ($160 vs $942 in OCA).
- **Affected SKU**: `P58464-B21`
- **Required Dependency**: `P58465-B21`

#### C35. [DELTA-DL385-GEN11-AIR-BAFFLE-MANDATE] DL385_Gen11 — MANDATORY_THERMAL_AIR_BAFFLE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: P57886-B21 (HPE ProLiant DL385 Gen11 2U Standard/Performance FIO Air Baffle Kit, $41.00 USD, Qty 1) is physically and logically mandatory for all air-cooled CTO builds to seal the compartment over CPU heatsinks and memory DIMMs. Directs cooling airflow from fan cage across processors; omitting it causes thermal throttling and CLIC buildability rejection.
- **Affected SKU**: `P53921-B21`
- **Required Dependency**: `P57886-B21`

#### C36. [DELTA_DL385_GEN11_L3_CACHE_TRADE_OFF_STRATEGY] DL385_Gen11 — PROCESSOR_CACHE_TRADE_OFF_STRATEGY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: When modernizing AMD EPYC 7543 (32c, 2.8GHz, 256MB L3, 225W), EPYC 9334 (32c, 2.7GHz, 128MB L3, 210W, ,170 USD) saves CapEx but halves L3 cache from 256MB to 128MB due to 4-CCD topology. For memory-latency and database workloads, EPYC 9354 (32c, 3.25GHz, 256MB L3, 280W, ,861 USD) restores full 256MB L3 cache and exceeds base clock (+0.45GHz) for +,820 USD list price across 10 servers. Chassis cooling (60x P58465-B21 performance fans + 20x P58459-B21 performance heatsinks) is already 100% qualified for 280W. Dual-track options must be presented to facilitate commercial negotiations (INV-184).
- **Affected SKU**: `P53712-B21`
- **Required Dependency**: `P53701-B21`

#### C37. [DELTA_DL385_GEN11_MODULAR_FAN_PACKAGING_MODALITY_INV206] DL385_Gen11 — FAN_PACKAGING_MODALITY_RULE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: On HPE ProLiant DL385 Gen11 (and DL3X5 AMD platforms), P58465-B21 (HPE ProLiant DL3X5 Gen11 2U Performance Fan Kit, .00 USD list) is packaged as 1 individual fan rotor per kit (MODULAR_PER_ROTOR), with discrete OCA dropdown options [0, 4, 6] per server (4 kits for 1-CPU, 6 kits for 2-CPU; 60 kits for 10 dual-socket servers). Never apply the Intel DL380 bundled 6-fan kit rule (1 kit/server) to DL385 Gen11 (INV-206).
- **Affected SKU**: `P58465-B21`
- **Required Dependency**: `P53921-B21`

#### C38. [DELTA_DL385_GEN11_COM_R7A11AAE_VS_S1A05A_SEPARATION_INV207] DL385_Gen11 — MANAGEMENT_LICENSE_VS_FIO_TOKEN_SEPARATION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: On DL385 Gen11 CTO builds (P53921-B21), R7A11AAE (HPE Compute Ops Management Standard 3-year Upfront SaaS, .00 USD) satisfies CLIC Rule 81322276 for portal orderability. Its companion FIO SKU S1A05A (HPE Compute Cloud Management Server FIO Enablement, .00 USD) is an optional factory GreenLake pre-claiming token that is NOT required to pass CLIC Rule 81322276 even though OCA scrapes its subcategory as constraint=required. Remove S1A05A unless the customer explicitly requests factory GreenLake workspace binding (INV-207).
- **Affected SKU**: `S1A05A`
- **Required Dependency**: `R7A11AAE`

#### C39. [CLIC_81353846_DL385_G11_CABLE_MAX1] DL385_Gen11 — QUANTITY_CEILING
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Product#: P53921-B21 Rule#: 81353846 UNBUILDABLE CONFIGURATION: Maximum 1 quantity of each DL385 Gen11 storage cable kit can be ordered per base model.
- **Affected SKU**: `P57848-B21`

#### C40. [LEARN_DL360_GEN12_P72223_P40497_SELECTOR_20261117] DL360_Gen12 — SELECTOR_STATE_CONDITIONAL
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: P40497-B21 on DL360 Gen12 hybrid base P72176-B21 is conditionally revealed behind backplane stacking kit P72223-B21 (= 1) and must be captured with P72223-B21 trigger provenance and restored to 0.
- **Affected SKU**: `P40497-B21`
- **Required Dependency**: `P72223-B21`

#### C41. [LEARN_DL360_GEN12_MR408IO_TOPOLOGY_PATH_20261117] DL360_Gen12 — STORAGE_OCP_TOPOLOGY_CABLE_PATH
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: MR408i-o OCP Slot A (P58335-B21) with Slot B OCP3 NIC (P26256-B21) requires Slot A storage cable P72600-B21, Slot B enablement cable P72203-B21, sideband cable P48918-B21, and battery P01366-B21; P72604-B21 PCIe cable does not satisfy Slot A OCP storage.
- **Affected SKU**: `P58335-B21`
- **Required Dependency**: `P72600-B21`

#### C42. [LEARN_DL360_GEN12_KIT_DEFAULTS_20261117] DL360_Gen12 — CHASSIS_THERMAL_AND_OCP_SLOT_RULES
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Use DL360 Gen12 thermal kits P48908-B21 and P74787-B21, classify P72600-B21/P72203-B21 as cables rather than OCP adapters, and preserve HA113A1 / HU4A6A5 quantity-1 global headers for multi-node solutions.
- **Affected SKU**: `P72176-B21`
- **Required Dependency**: `P48908-B21`

#### C43. [LEARN_DL360_GEN12_CLIC_ADVISORIES_20261117] DL360_Gen12 — WORKFLOW_CLIC_ADVISORY_DISPOSITION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Carry forward live CLIC warning count so 0-error configurations with 10 advisories stay PORTAL VALIDATION PENDING until R7A12AAE/81302926, iLO 81031845, factory RAID 1, OS, 20C inlet, and AKM/B19 suffix are dispositioned.
- **Affected SKU**: `P72176-B21`

#### C44. [DELTA-1789752537004-v9j6p] DL380a_Gen12 — RULE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Observed price drift on P74700-B21 (memory)
- **Affected SKU**: `P74700-B21`
- **Engineering Rationale**: *Manual price drift reconciliation from phase 15 audit*

#### C45. [DELTA-1789752537592-otj9t] DL380a_Gen12 — RULE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Observed price drift on S4A91C (drive)
- **Affected SKU**: `S4A91C`
- **Engineering Rationale**: *Manual price drift reconciliation from phase 15 audit*

#### C46. [DELTA-1789752537783-790yf] DL380a_Gen12 — RULE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Observed price drift on HA113A1 (support)
- **Affected SKU**: `HA113A1`
- **Engineering Rationale**: *Manual price drift reconciliation from phase 15 audit*

#### C47. [DELTA-1789752537975-31r35] DL380a_Gen12 — RULE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Observed price drift on HU4B2A30C4W (service)
- **Affected SKU**: `HU4B2A30C4W`
- **Engineering Rationale**: *Manual price drift reconciliation from phase 15 audit*

#### C48. [DELTA_P70436_DELISTED_REPLACED_BY_P91249] DL380a_Gen12 — SKU_SUBSTITUTION
- **Scope**: `PRODUCT_GENERATION`
- **Rule**: When customer quotes specify P70436-B21, substitute with active Multi Vendor SKU P91249-B21 (same High Performance U.3 specification) or value-engineered P84236-B21.
- **Affected SKU**: `P70436-B21`
- **Required Dependency**: `P91249-B21`

#### C49. [DELTA_VROC_DIRECT_ATTACH_NO_BATTERY] DL380a_Gen12 — BATTERY_EXEMPTION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Exempt Intel VROC and NS204i-u boot devices from Smart Storage Battery P01367-B21 requirement. Battery is exclusively required for hardware MR416i/SR932i storage controllers.
- **Affected SKU**: `R7J57A`

#### C50. [LEARN_DL380A_GEN12_WORKFLOW_DUAL_PUBLICATION_ADVISORY_20261029] DL380a_Gen12 — WORKFLOW_DUAL_PUBLICATION_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Publish and read back the human Drive workbook separately from the complete semantic Markdown source in NotebookLM. Google Sheets is not a supported NotebookLM Drive source. A recent upload timestamp does not refresh old vendor observations.

#### C51. [LEARN_DL380A_GEN12_WORKFLOW_SOURCE_RETIREMENT_ADVISORY_20261029] DL380a_Gen12 — WORKFLOW_SOURCE_RETIREMENT_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Verify exact-product replacement content, indexing and source-restricted grounded canary, then commit trust metadata before removing only managed stale catalog snapshots. Preserve QuickSpecs, separate learnings, shared enclosure/fabric sources and unrelated documents. Inventory absence is not authority to remove another product source.

#### C52. [LEARN_DL380A_GEN12_WORKFLOW_CLOUD_LEARNING_REVIEW_ADVISORY_20261029] DL380a_Gen12 — WORKFLOW_CLOUD_LEARNING_REVIEW_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Preserve retrieved cloud learning documents locally with their source IDs. Treat prose claims as candidates pending dated vendor evidence; resolve contradictions before promoting hardware dependencies. Conflicting quantity claims require dated evidence for this exact product and selector state.

#### C53. [LEARN_DL380A_GEN12_SUPPORT_PRICING_UPDATE_20261102] DL380a_Gen12 — SUPPORT_PRICING_UPDATE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: HPE DL380a Gen12 Support (HU4B2A30C4W, under HU4B2A3 3Y Tech Care Basic) list price updated in November 2026 OCA catalog from $11,306.00 to $11,871.00 USD (+$565.00 / +5.00% per node). Total server list price adjusted from $1,656,550.00 to $1,657,115.00 USD.
- **Affected SKU**: `HU4B2A30C4W`
- **Required Dependency**: `P76706-B21`

#### C54. [LEARN_DL380A_GEN12_H200_LEAD_TIME_BOTTLENECK_20261102] DL380a_Gen12 — SUPPLY_CHAIN_LEAD_TIME_BOTTLENECK
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: CRITICAL PRESALES CONSTRAINT: NVIDIA H200 NVL 141GB PCIe Accelerator (S3U30C) carries an estimated availability factory lead time of 168 business days (~24 weeks / 5.5 months), establishing it as the primary supply chain gating factor for DL380a Gen12 AI accelerator deployments. FC HBA (R2E09A) is 30 days; Base chassis (P76706-B21) is 14 days; CPU (P74571-B21) and DDR5 memory (P69728-F21) are 10 days.
- **Affected SKU**: `S3U30C`

#### C55. [LEARN_DL380A_GEN12_CLIC_STATUS_CLEARANCE_20261102] DL380a_Gen12 — CLIC_STATUS_CLEARANCE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Portal validation warnings on HPE ProLiant Compute DL380a Gen12 8DW/16SW CTO Server (P76706-B21) and HPE Compute Ops Management Standard 3-year SaaS (R7A11AAE) have cleared to clean/pass in latest OCA release. 64GB DDR5-6400 memory (P69728-F21) discontinuation date extended to 2030-06-30.
- **Affected SKU**: `P76706-B21`

#### C56. [LEARN_DL380A_GEN12_RAID1_MULTI_DRIVE_20261104] DL380a_Gen12 — ARRAY_GEOMETRY_BUILD_BLOCKER
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: In HPE OCA / CLIC on DL380a Gen12, 339778-B21 (HPE RAID 1 Drive 1 FIO Setting) strictly enforces Drive Count == 2. When >2 drives (e.g. 4x NVMe SSDs) are configured without a full-cage RAID 5/10 setting, CLIC marks the build as UNBUILDABLE (Action-Required) due to unassigned drive geometry mismatch and mandates 389692-B21 (HPE Customer Defined RAID Setting Service, max 1) or omitting FIO settings when dedicated NS204i-u boot device P78279-B21 is present.
- **Affected SKU**: `339778-B21`

#### C57. [LEARN_DL380A_GEN12_BOOT_DATA_DECOUPLING_20261104] DL380a_Gen12 — WORKFLOW_VENDOR_OBSERVATION_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: HPE NS204i-u v2 480GB Boot Device (P78279-B21) and front boot cage (P75284-B21) have zero hardware, cage, or bus dependency on SFF data drives (P63833-B21 / P50219-B21 / P50216-B21), 4SFF drive cage (P74710-B21), or direct-attach cables (P74702-B21). Boot tier and data tier can be configured independently or together.
- **Affected SKU**: `P78279-B21`

#### C58. [LEARN_DL380A_GEN12_TURNKEY_RACKING_CABLING_20261104] DL380a_Gen12 — WORKFLOW_VENDOR_OBSERVATION_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: DL380a Gen12 base CTO chassis P76706-B21 does not bundle rack rails. When customer tender requests installation, racking, and cabling, P69770-B21 (Ball Bearing Rail Kit) is mandatory to mount the 4U chassis. Furthermore, SFP28 networking adapters (P10115-B21) require 2x 845398-B21 (25Gb SFP28 SR Transceivers) or DAC cables to prevent site cabling failure.
- **Affected SKU**: `P69770-B21`

#### C59. [LEARN_DL380A_GEN12_WORKFLOW_NORMATIVE_LANGUAGE_PRECISION_20261107] DL380a_Gen12 — WORKFLOW_NORMATIVE_LANGUAGE_PRECISION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: All agent skill directives, checklists, and execution handoffs must adhere to strict RFC-2119 normative vocabulary (MUST, MUST NOT, SHALL, SHOULD, MAY). Ambiguous hedge words (appropriate, as needed, etc., consider, typically, usually, generally, if possible, try to) are strictly prohibited in operational procedures to eliminate agent hesitation and non-deterministic loops.

#### C60. [LEARN_DL380A_GEN12_WORKFLOW_MODULAR_SKILL_TOKEN_OPTIMIZATION_20261107] DL380a_Gen12 — WORKFLOW_MODULAR_SKILL_TOKEN_OPTIMIZATION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Monolithic skills exceeding 25KB must be modularized into a concise core execution SKILL.md (<=250 lines) plus dedicated references/ documentation files. This preserves agent prompt token budgets, accelerates model reasoning, and prevents guardrail context window exhaustion.

#### C61. [LEARN_DL380A_GEN12_WORKFLOW_UNIVERSAL_CC30_AND_QUALITY_CEILING_20261107] DL380a_Gen12 — WORKFLOW_UNIVERSAL_CC30_AND_QUALITY_CEILING
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Every function across all repository scripts and test fixtures must strictly comply with the universal cyclomatic complexity ceiling <= 30 (INV-229, INV-230). All modified code must pass oxlint with zero warnings, maintain a clean DAG with zero circular dependencies, and preserve non-empty test discovery.

#### C62. [LEARN_DL380A_GEN12_WORKFLOW_SPECIALIZED_ARCHITECTURAL_DISPATCH_20261107] DL380a_Gen12 — WORKFLOW_SPECIALIZED_ARCHITECTURAL_DISPATCH
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Incoming presales inquiries must be classified and dispatched by presales-query-router across 34 specialized skill tracks, including code-quality-gate, self-correction-counterfactual, presales-clearance-strategy, and turnkey-racking-cabling, with zero ad-hoc script generation.

#### C63. [LEARN_DL380A_GEN12_WORKFLOW_SI_NO_SILENT_DEFAULT_CONVERSION_20261119] DL380a_Gen12 — WORKFLOW_SI_NO_SILENT_DEFAULT_CONVERSION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Evaluators, sizing calculators, and serializers MUST preserve null or UNKNOWN for missing node capacity, unpriced items, stale lead times, and unassessed metrics rather than substituting default server capacities, zero prices, or PASS fallbacks (INV-244, INV-248, INV-252).

#### C64. [LEARN_DL380A_GEN12_WORKFLOW_SI_STRICT_DOCUMENT_REVIEW_GATE_20261119] DL380a_Gen12 — WORKFLOW_SI_STRICT_DOCUMENT_REVIEW_GATE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Bare { success: true } on ephemeralSourceValidation MUST NOT be promoted to VERIFIED or DOUBLE_CHECK_PASSED. Customer presentation and DeliveryAuthorization require grounded, detached, double-checked, cited, non-mock review plus unsatisfied/unomitted hard requirement and claim gates B22-B24 (INV-245, INV-249).

#### C65. [LEARN_DL380A_GEN12_WORKFLOW_SI_INDEPENDENT_WAVE_VERIFICATION_20261119] DL380a_Gen12 — WORKFLOW_SI_INDEPENDENT_WAVE_VERIFICATION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Parallel implementation waves with disjoint file ownership MUST pass independent counterexample verification before seam integration, confirming cross-package interoperability, cycle rejection, and zero regression leakage (INV-246, INV-247).

#### C66. [LEARN_DL380A_GEN12_WORKFLOW_SI_NON_PHYSICAL_SEGREGATION_20261119] DL380a_Gen12 — WORKFLOW_SI_NON_PHYSICAL_SEGREGATION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Active knowledge routing MUST segregate operational incidents, user preferences, and agent self-explanations into segregatedEntries[] outside physical hardware rules, while preserving WORKFLOW_REVIEW advisories in advisories/workflowAdvisories for audit reachability (INV-250).

#### C67. [LEARN_DL380A_GEN12_WORKFLOW_SI_PORTAL_SEVEN_COLUMN_PRESERVATION_20261119] DL380a_Gen12 — WORKFLOW_SI_PORTAL_SEVEN_COLUMN_PRESERVATION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Analytical SolutionIntelligenceEnvelope views (Decision & Evidence sheet, Markdown sections, dashboard banners, and MCP tools) MUST leave the 7-column Partner Portal upload sheet strictly unmodified (INV-249).

#### C68. [LEARN_DL380A_GEN12_WORKFLOW_SI_CHECKPOINT_AND_ISOLATION_20261119] DL380a_Gen12 — WORKFLOW_SI_CHECKPOINT_AND_ISOLATION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Long multi-milestone engineering plans run with disjoint worker file ownership on inherit workspaces, persist disk checkpoints and SI-00/SI-10 receipts cleanly without mutating protected benchmarks or notebooks config, and keep offline certification separate from unrun live portal acceptance (INV-251, INV-252).

#### C69. [DELTA-1787939298644] DL380_Gen12 — RULE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Portal validation flagged restriction on P76453-B21.
- **Affected SKU**: `P76453-B21`

#### C70. [DELTA-1787939245188] DL380_Gen12 — RULE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Portal validation flagged restriction on P76450-B21.
- **Affected SKU**: `P76449-B21`
- **Required Dependency**: `P76450-B21`

#### C71. [PREPROC-DELTA-1786781599909] DL380_Gen12 — PREPROCESSING_SPLIT_CONFIRMED
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Confirmed configuration variation reason 'WORKLOAD_NODE_PURPOSE' for config_1

#### C72. [DELTA-1786880389958] DL380_Gen12 — RULE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Intel Xeon 6730P 250W CPU requires HPE ProLiant Compute DL380 Gen12 Performance Heat Sink Kit (P74792-B21) due to exceeding the 185W standard thermal envelope.
- **Affected SKU**: `P74573-B21`
- **Required Dependency**: `P74792-B21`
- **Engineering Rationale**: *Agentic Guardrail Loop derived from RAG/DB fact-check*

#### C73. [DELTA-1786880394092] DL380_Gen12 — RULE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Intel Xeon 6730P 250W CPU requires HPE ProLiant High Performance Fan Kit (P48820-B21) because it exceeds the 240W system limit for standard chassis fans.
- **Affected SKU**: `P74573-B21`
- **Required Dependency**: `P48820-B21`
- **Engineering Rationale**: *Agentic Guardrail Loop derived from RAG/DB fact-check*

#### C74. [DELTA_RAG_FIO_P69728-B21_P69728-F21_1788145618089] DL380_Gen12 — OPTION_TYPE_SUBSTITUTION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: | **`P69728-B21`** | HPE 64GB (1x64GB) Dual Rank x4 DDR5-6400 Smart Memory Kit | Memory / RDIMM (BTO) | **❌ BLOCKED in CTO (CLIC Suffix Violation)** | Standalone retail Build-to-Order (BTO) SKU [9, 15, 16]. Factory Configure-to-Order sessions enforce the rule: *"BTO products are not allowed in CTO B
- **Affected SKU**: `P69728-B21`
- **Required Dependency**: `P69728-F21`

#### C75. [DELTA_RAG_DEP_P75740-B21_873763-B21_1788145618089] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: | **`P75740-B21`** | HPE DL3XX Gen12 8SFF x1 U.3 Tri-Mode Drive Cage Kit | Smart Chassis / Drive Cage | **✅ Valid Front Cage** | Installs an 8-bay SFF x1 U.3 Tri-Mode backplane into Box 1, 2, or 3 [19-23]. Installing this cage **clears the factory unbuildable drive-less chassis block** (which otherw
- **Affected SKU**: `P75740-B21`
- **Required Dependency**: `873763-B21`

#### C76. [DELTA_RAG_DEP_P28586-B21_P75740-B21_1788145618089] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: | **`P28586-B21`** | HPE 1.2TB SAS 12G 10K SFF BC 3yr Wty HDD | Storage / SFF SAS HDD | **✅ Valid SAS HDD** | 12G SAS 10K RPM Basic Carrier (BC) drive [21, 28]. Supported inside the `P75740-B21` drive cage [21, 22]. Requires a dedicated hardware storage controller (`P47777-B21`) as the system board
- **Affected SKU**: `P28586-B21`
- **Required Dependency**: `P75740-B21`

#### C77. [DELTA_RAG_DEP_P47777-B21_P01366-B21_1788145618091] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: | **`P47777-B21`** | HPE MR416i-p Gen11 x16 Lanes 8GB Cache PCI SPDM Storage Controller | Storage Controller / Tri-Mode | **⚠️ Conditional Pass (Requires 3 Co-Dependencies)** | Stand-up PCIe card (-p) installed into a PCIe riser slot [30, 36, 39-41]. Requires **`P01366-B21`** (battery), **`P48918-B2
- **Affected SKU**: `P47777-B21`
- **Required Dependency**: `P01366-B21`

#### C78. [DELTA_RAG_DEP_P76453-B21_P75740-B21_1788145618092] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: 4.  **High-Speed Backplane Data Cable (`P76453-B21`):** Routing SAS/SATA/NVMe data lanes from Box 1 or Box 2 backplanes of the `P75740-B21` drive cage to the stand-up MR416i-p requires the **HPE ProLiant Compute DL380 Gen12 8SFF/2SFF UMB PCIe Cable Kit (`P76453-B21`)** [76, 80–85, 113, 117–122, 145,
- **Affected SKU**: `P76453-B21`
- **Required Dependency**: `P75740-B21`

#### C79. [DELTA_RAG_FIO_P64707-B21_P69728-F21_1788148383105] DL380_Gen12 — OPTION_TYPE_SUBSTITUTION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: | **`P64707-B21`** | HPE 64GB 2Rx4 DDR5-5600 Registered Memory | Memory / RDIMM | **❌ Incompatible Gen11 Memory** | Gen12 strictly mandates **DDR5-6400 Smart Memory** [200, 208–209, 240, 270]. DDR5-5600 is blocked. Factory CTO builds also mandate the **`-F21`** suffix (**`P69728-F21`**) [8-12]. |
- **Affected SKU**: `P64707-B21`
- **Required Dependency**: `P69728-F21`

#### C80. [DELTA_RAG_DEP_P48818-B21_P38995-B21_1788148383108] DL380_Gen12 — SKU_SUBSTITUTION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: | **`P48818-B21`** | HPE 800W Flex Slot Platinum Hot Plug Power Supply | Power Supplies | **❌ Invalid SKU & Lack of Redundancy** | The valid 800W Platinum SKU is **`P38995-B21`** [23, 24]. A single PSU provides no 1+1 redundancy [25]. (EU ErP Lot 9 requires 96% Titanium `P03178-B21`) [25, 26]. |
- **Affected SKU**: `P48818-B21`
- **Required Dependency**: `P38995-B21`

#### C81. [DELTA_RAG_CARRYOVER_P47777-B21_1788459469422] DL380_Gen12 — CARRY_OVER_VALIDATED
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: | **P47777-B21** | HPE MR416i-p Gen11 Storage Controller | **✅ VALID** | This PCIe plug-in controller is fully supported on Gen12 as a carry-forward option [16]. However, it **requires the P48918-B21 enablement cable kit** to bridge SPDM security and sideband power to the Gen12 motherboard [16]. | *
- **Affected SKU**: `P47777-B21`

#### C82. [DELTA_RAG_DEP_P01366-B21_P48918-B21_1788459469423] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: | **P01366-B21** | HPE 96W Smart Storage Battery | **✅ VALID** | Fully compatible battery to protect the MR416i-p's volatile write cache [16]. It **requires the P48918-B21 enablement cable** to physically connect to the controller's cache module [16]. | **P01366-B21** *(Keep)* |
- **Affected SKU**: `P01366-B21`
- **Required Dependency**: `P48918-B21`

#### C83. [DELTA_RAG_DEP_P10180-B21_P72203-B21_1788459469424] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: | **P10180-B21** | Broadcom BCM5719 1Gb 4p BASE-T OCP3 NIC | **❌ OBSOLETE** | Legacy Gen11 part number [8]. It also **requires OCP enablement cable P72203-B21** to route high-speed PCIe lanes from CPU1 to rear OCP Slot B [25]. | **P51181-B21** (BCM5719 OCP3 NIC) and **P72203-B21** (OCP rear cable ki
- **Affected SKU**: `P10180-B21`
- **Required Dependency**: `P72203-B21`

#### C84. [DELTA_RAG_DEP_P74573-B21_P48820-B21_1788461136463] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: • [DL380_Gen12 Catalog Rule] Category: Learned Feedback Rules > P74573-B21 | Constraint: learned (Intel Xeon 6730P 250W CPU requires HPE ProLiant High Performance Fan Kit (P48820-B21) because it exceeds the 240W system limit for standard chassis fans.)
- **Affected SKU**: `P74573-B21`
- **Required Dependency**: `P48820-B21`

#### C85. [DELTA_RAG_DEP_P74573-B21_P74792-B21_1788461136464] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: • [DL380_Gen12 Catalog Rule] Category: Learned Feedback Rules > P74573-B21 | Constraint: learned (Intel Xeon 6730P 250W CPU requires HPE ProLiant Compute DL380 Gen12 Performance Heat Sink Kit (P74792-B21) due to exceeding the 185W standard thermal envelope.)
- **Affected SKU**: `P74573-B21`
- **Required Dependency**: `P74792-B21`

#### C86. [DELTA-1788462981839] DL380_Gen12 — RULE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: P10180-B21 is obsolete Gen11 SKU for DL380 Gen12; replaced by P51181-B21 with mandatory OCP rear cable kit P72203-B21.
- **Affected SKU**: `P10180-B21`
- **Required Dependency**: `P51181-B21`
- **Engineering Rationale**: *Agentic Guardrail Loop derived from RAG/DB fact-check*

#### C87. [DELTA_RAG_DEP_P76453-B21_P48918-B21_1788463665182] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: 3.  **Storage Cable Integration:** The inclusion of `P76453-B21` is correct for routing PCIe lanes from SFF drive cages back to the PCIe slot [16]. However, the configurator will throw an error unless it sees the **Storage Controller Enablement Cable Kit (`P48918-B21`)** which is physically required
- **Affected SKU**: `P76453-B21`
- **Required Dependency**: `P48918-B21`

#### C88. [DELTA_RAG_DEP_P81130-B21_P74787-B21_1790182000001] DL380_Gen12 — OPTION_TYPE_SUBSTITUTION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: When HPE ProLiant Compute DL380 Gen12 Cooling Upgrade Enablement Kit (P81130-B21) is selected, the only supported heatsink is HPE ProLiant Compute DL3XX Gen12 High Performance Heat Sink Kit (P74787-B21).
- **Affected SKU**: `P81130-B21`
- **Required Dependency**: `P74787-B21`

#### C89. [DELTA_RAG_DEP_P81130-B21_P79555-B21_1790182000002] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: HPE ProLiant Compute DL380 Gen12 Cooling Upgrade Enablement Kit (P81130-B21) supports processors up to 270W at 30C or up to 350W at 27C (P79555-B21).
- **Affected SKU**: `P81130-B21`
- **Required Dependency**: `P79555-B21`

#### C90. [DELTA_RAG_DEP_P10115-B21_P72203-B21_1790182000003] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Rear OCP Slot B on DL380 Gen12 NC chassis is unpowered and logically disconnected by default; configuring an OCP NIC requires P72203-B21 cable kit to route PCIe lanes from CPU 1.
- **Affected SKU**: `P10115-B21`
- **Required Dependency**: `P72203-B21`

#### C91. [DELTA_RAG_DEP_P78279-B21_P74755-B21_1790182000004] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: HPE NS204i-u v2 480GB NVMe Hot Plug Boot Storage Device (P78279-B21) requires HPE ProLiant Compute DL380 Gen12 NS204i-u Rear Boot Device Enablement Kit (P74755-B21).
- **Affected SKU**: `P78279-B21`
- **Required Dependency**: `P74755-B21`

#### C92. [DELTA_CLIC_RULE_81392332_H200_16PIN_P93055-B21] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Rule 81392332: P56072-B21 requires to be ordered with supported 8-pin GPUs. H200 NVL mandates P93055-B21 HPE GPU 16-pin Power Cable Kit.
- **Affected SKU**: `S3U30C`
- **Required Dependency**: `P93055-B21`

#### C93. [DELTA_CLIC_RULE_81394885_SECONDARY_RISER_25C_AMBIENT] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Rule 81394885: 1 qty 8SFF Cage + Processor above 270W + Air Cooled: H200 NVL (S3U30C) is not supported on Primary Riser (20C-30C) or Tertiary Riser (20C-30C). Supported on Secondary Riser only with <= 25C ambient temperature.
- **Affected SKU**: `S3U30C`
- **Required Dependency**: `P51083-B21`

#### C94. [DELTA_CLIC_RULE_81393803_STORAGE_CABLE_P76453-B21] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Rule 81393803: P73282-B21 with 8SFF x1 Cage (P75740-B21) and 1 qty MR416i-p (P47777-B21) requires 1 qty of P76453-B21 (2SFF B1/ 8SFF x1 PCIe Cable).
- **Affected SKU**: `P75740-B21`
- **Required Dependency**: `P76453-B21`

#### C95. [LEARN_DL380_GEN12_OEM_DEFAULT_20260930] DL380_Gen12 — WORKFLOW_OEM_SELECTION_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: OCA observed P77819-B21 as OEM DL380 Gen12 CTO. Preserve it in scoped discovery; a generic commercial DL380 Gen12 request must not automatically choose OEM. P73282-B21 was observed as commercial CTO, not certified as a permanent substitute or live-price guarantee.
- **Affected SKU**: `P77819-B21`

#### C96. [LEARN_DL380_GEN12_RUNTIME_DISCOVERY_20260930] DL380_Gen12 — WORKFLOW_RUNTIME_DISCOVERY_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Catalog absence is not proof of unsupported hardware. Investigate missing and conditional BOQ SKUs on the exact base and owning configuration, with the requested quantities and environmental state. Hidden presence establishes observation only. Revalidate each changed manifest in CLIC; a runtime plan does not establish acceptance.

#### C97. [LEARN_DL380_GEN12_COVERAGE_BOUNDARY_20260930] DL380_Gen12 — WORKFLOW_CAPTURE_COVERAGE_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Chassis discovery does not establish traversal. Current automated conditional capture covers hidden DOM and ambient probes; other selector combinations and all-base coverage remain unverified. Unknown recommendation, price and variant capability stay unknown. Do not retire prior NotebookLM sources before replacement verification.

#### C98. [LEARN_DL380_GEN12_H200_OBSERVED_STATES_20261001] DL380_Gen12 — WORKFLOW_VENDOR_OBSERVATION_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Live OCA evidence on commercial DL380 Gen12 base P73282-B21: S3U30C NVIDIA H200 NVL 141GB was already present in the DOM at selected 30C tracking SKU P79552-B21, but hidden and marked unavailable. Vendor text says H200 NVL and 30C cannot be selected together. At selected 27C tracking SKU P79555-B21 the unavailable flag and restriction disappeared; the collapsed section still hid the row visually. Original 30C was restored. This is two observed selector states, not proof of every lower temperature or final CLIC build acceptance. Evidence: evidence/scraping_review/h200_at_30c_before.json and h200_at_27c.json. Do not compile the 30C prohibition as an allowed <=30C gate.
- **Affected SKU**: `S3U30C`

#### C99. [LEARN_CHASSIS_THREE_TIER_DOMAIN_CLASSIFICATION_20261012] DL380_Gen12 — WORKFLOW_CHASSIS_CLASSIFICATION_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Use the registered product and its component role for catalog coverage. Server and compute-module catalogs require processor and memory options where specified by their profile. Shared-enclosure power belongs to the owning frame. Validate switch, fabric and tape catalogs against their own profile rather than server categories (INV-158).

#### C100. [LEARN_UNIVERSAL_ACCESSORY_SCOPE_ISOLATION_20261012] DL380_Gen12 — WORKFLOW_SCOPE_ISOLATION_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Passive accessories such as DC lug terminal kits (P36877-B21), power cords, and rail kits are architecture-invariant and span multiple product generations. They must be registered in APPROVED_UNIVERSAL_POLICY_SKUS in product_scope.js to prevent false-positive cross-generation isolation quarantines by the drift engine (INV-159).
- **Affected SKU**: `P36877-B21`

#### C101. [LEARN_SMART_CTO_WAKEUP_PROTOCOL_20261121] DL380_Gen12 — WORKFLOW_DOM_EXTRACTION_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: When HPE OCA renders only a Smart CTO card with _CTOLITE options and no standard CTO card is returned, allowCtolite fallback mode ensures non-empty candidate extraction. If the Select Product dropdown is unselected, auto-selecting the first non-placeholder option triggers the jQuery change event and wakes WebLogic XHR, unlocking the disabled Customize button and preventing unhandled navigation timeouts (INV-258).

#### C102. [DELTA_DL380_GEN12_CPU_PARITY_AND_SST_CP_LEARNING] DL380_Gen12 — PROCESSOR_ARCHITECTURAL_MATCH_STRATEGY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: When modernizing Cascade Lake Xeon Gold 6258R (28c, 2.7GHz, 38.5MB L3, 205W), Xeon 6530P (32c, 2.3GHz, 144MB L3, 225W, $4,830 USD) provides superior per-core IPC (+22%) and total throughput, with Intel Speed Select (SST-CP) supporting 2.8GHz Compute Mode. If customer mandates strict base clock >=2.7GHz without BIOS profile dependencies, Xeon 6738P (32c, 2.9GHz, 144MB L3, 270W, $7,305 USD) provides strict numerical parity (+188.5k USD delta across 9 servers). Evaluator must present both tracks with transparent trade-offs for customer negotiation (INV-184).
- **Affected SKU**: `P74571-B21`
- **Required Dependency**: `P74577-B21`

#### C103. [DELTA_DL380_GEN12_MEMORY_SYMMETRICAL_CHANNEL_LEARNING] DL380_Gen12 — MEMORY_CHANNEL_POPULATION_STRATEGY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: On Intel Xeon 6 (8 memory channels per CPU, 16 channels dual socket), legacy 6-channel memory capacities (such as 1,152 GB achieved via 12x 64GB + 12x 32GB on Gen10) cannot be satisfied with 12 DIMMs without leaving 2 channels unpopulated per CPU and suffering a 25% throughput penalty. Symmetrical population mandates 16 DIMMs (1DPC) or 32 DIMMs (2DPC). Present 1,536 GB (16x 96GB P69729-F21 @ 6400 MT/s) for full 1DPC capacity surplus, or 1,024 GB (16x 64GB P69728-F21 @ 6400 MT/s) for CapEx optimization with documented 128GB delta (INV-184).
- **Affected SKU**: `P69728-F21`
- **Required Dependency**: `P69729-F21`

#### C104. [DELTA_DL380_GEN12_HEATSINK_TIER_RIGHT_SIZING_INV208] DL380_Gen12 — THERMAL_HEATSINK_RIGHT_SIZING_RULE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: On HPE ProLiant DL380 Gen12 (P73282-B21), processors with 185W < TDP <= 270W (such as Intel Xeon 6530P 225W P74571-B21) are 100% thermally certified with P74792-B21 (HPE ProLiant Compute DL380 Gen12 2U High Performance Heat Sink Kit, 316.00 USD list per socket, max 2 per 2P server = 632.00 USD/server, 4-day lead time). Do not over-provision P74794-B21 (2U Max Performance Heat Sink Kit, 624.00 USD list per dual-socket server, max 1 per server, 45-day lead time), which is only required for >270W extreme TDP processors (275W-350W+) or dense GPU workloads. Substituting 1x P74794-B21/server (624.00 USD) with 2x P74792-B21/server (632.00 USD) has virtually identical cost (+8.00 USD/server or +72.00 USD across 9 servers) while slashing cooling lead time by 41 days from 45 days down to 4 days (INV-208).
- **Affected SKU**: `P74794-B21`
- **Required Dependency**: `P74792-B21`

#### C105. [DELTA_DL380_GEN12_COM_R7A11AAE_VS_S1A05A_SEPARATION_INV207] DL380_Gen12 — MANAGEMENT_LICENSE_VS_FIO_TOKEN_SEPARATION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: On DL380 Gen12 CTO builds (P73282-B21), R7A11AAE (HPE Compute Ops Management Standard 3-year Upfront SaaS, $515.00 USD) satisfies CLIC Rule 81322276 for portal orderability, whereas S1A05A ($0.00 USD FIO cloud pre-claim token) is optional and safe to omit (INV-207).
- **Affected SKU**: `S1A05A`
- **Required Dependency**: `R7A11AAE`

#### C106. [LEARN_DL380_GEN12_WORKFLOW_DUAL_PUBLICATION_ADVISORY_20261029] DL380_Gen12 — WORKFLOW_DUAL_PUBLICATION_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Publish and read back the human Drive workbook separately from the complete semantic Markdown source in NotebookLM. Google Sheets is not a supported NotebookLM Drive source. A recent upload timestamp does not refresh old vendor observations.

#### C107. [LEARN_DL380_GEN12_WORKFLOW_SOURCE_RETIREMENT_ADVISORY_20261029] DL380_Gen12 — WORKFLOW_SOURCE_RETIREMENT_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Verify exact-product replacement content, indexing and source-restricted grounded canary, then commit trust metadata before removing only managed stale catalog snapshots. Preserve QuickSpecs, separate learnings, shared enclosure/fabric sources and unrelated documents. Inventory absence is not authority to remove another product source.

#### C108. [LEARN_DL380_GEN12_WORKFLOW_CLOUD_LEARNING_REVIEW_ADVISORY_20261029] DL380_Gen12 — WORKFLOW_CLOUD_LEARNING_REVIEW_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Preserve retrieved cloud learning documents locally with their source IDs. Treat prose claims as candidates pending dated vendor evidence; resolve contradictions before promoting hardware dependencies. Conflicting quantity claims require dated evidence for this exact product and selector state.

#### C109. [LEARN_DL380_GEN12_SUPPORT_PRICING_UPDATE_20261102] DL380_Gen12 — SUPPORT_PRICING_UPDATE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: HPE DL380 Gen12 Support (HU4B2A30C4V, under HU4B2A3 3Y Tech Care Basic) list price updated in November 2026 OCA catalog from $5,509.00 to $5,784.00 USD (+$275.00 / +4.99% per server node). 12-node cluster extended price increases from $66,108.00 to $69,408.00 USD (+$3,300.00).
- **Affected SKU**: `HU4B2A30C4V`
- **Required Dependency**: `P73282-B21`

#### C110. [LEARN_DL380_GEN12_CLIC_STATUS_CLEARANCE_20261102] DL380_Gen12 — CLIC_STATUS_CLEARANCE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Portal validation warnings on HPE ProLiant DL380 Gen12 SFF NC CTO Server (P73282-B21) and HPE Compute Ops Management Standard 3-year SaaS (R7A11AAE) have cleared to clean/pass in latest OCA engine release.
- **Affected SKU**: `P73282-B21`

#### C111. [LEARN_DL380_GEN12_LEAD_TIME_AND_LIFECYCLE_20261102] DL380_Gen12 — LEAD_TIME_AND_LIFECYCLE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: DL380 Gen12 CTO base chassis (P73282-B21) availability lead time improved to 14 days (down from 30 days). Xeon 6787P CPU (P73837-B21) is 10 days; 8SFF drive cage (P75740-B21) is 14 days. 64GB DDR5-6400 Smart FIO memory (P69728-F21) discontinuation date extended to 2030-06-30 (+27 months).
- **Affected SKU**: `P73282-B21`

#### C112. [LEARN_DL380_GEN12_WORKFLOW_NORMATIVE_LANGUAGE_PRECISION_20261107] DL380_Gen12 — WORKFLOW_NORMATIVE_LANGUAGE_PRECISION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: All agent skill directives, checklists, and execution handoffs must adhere to strict RFC-2119 normative vocabulary (MUST, MUST NOT, SHALL, SHOULD, MAY). Ambiguous hedge words (appropriate, as needed, etc., consider, typically, usually, generally, if possible, try to) are strictly prohibited in operational procedures to eliminate agent hesitation and non-deterministic loops.

#### C113. [LEARN_DL380_GEN12_WORKFLOW_MODULAR_SKILL_TOKEN_OPTIMIZATION_20261107] DL380_Gen12 — WORKFLOW_MODULAR_SKILL_TOKEN_OPTIMIZATION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Monolithic skills exceeding 25KB must be modularized into a concise core execution SKILL.md (<=250 lines) plus dedicated references/ documentation files. This preserves agent prompt token budgets, accelerates model reasoning, and prevents guardrail context window exhaustion.

#### C114. [LEARN_DL380_GEN12_WORKFLOW_UNIVERSAL_CC30_AND_QUALITY_CEILING_20261107] DL380_Gen12 — WORKFLOW_UNIVERSAL_CC30_AND_QUALITY_CEILING
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Every function across all repository scripts and test fixtures must strictly comply with the universal cyclomatic complexity ceiling <= 30 (INV-229, INV-230). All modified code must pass oxlint with zero warnings, maintain a clean DAG with zero circular dependencies, and preserve non-empty test discovery.

#### C115. [LEARN_DL380_GEN12_WORKFLOW_SPECIALIZED_ARCHITECTURAL_DISPATCH_20261107] DL380_Gen12 — WORKFLOW_SPECIALIZED_ARCHITECTURAL_DISPATCH
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Incoming presales inquiries must be classified and dispatched by presales-query-router across 34 specialized skill tracks, including code-quality-gate, self-correction-counterfactual, presales-clearance-strategy, and turnkey-racking-cabling, with zero ad-hoc script generation.

#### C116. [LEARN_REASONING_COUNTERFACTUAL_HYPOTHESIS_SEMANTICS_20261108] DL380_Gen12 — WORKFLOW_HYPOTHESIS_SEMANTICS_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Hardware repair proposals generated during counterfactual repair are unvalidated delta hypotheses (PROPOSED_UNVALIDATED), never certifications of 100% buildability prior to whole-candidate re-evaluation across physical, topological, customer-intent, and vendor portal acceptance gates (INV-231).

#### C117. [LEARN_REASONING_ARITHMETIC_PREDICATE_INFEASIBILITY_20261108] DL380_Gen12 — WORKFLOW_PREDICATE_INFEASIBILITY_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: When physical demand exceeds available catalog capacity (e.g. required wattage exceeds maximum rated PSU candidate, or socket TDP exceeds available heatsink rating), the engine must emit REPAIR_INFEASIBLE with remaining deficits quantitatively disclosed, rather than fabricating out-of-catalog hardware quantities or assuming unevidenced vendor support (INV-231).

#### C118. [LEARN_REASONING_EXACT_CATALOG_SCOPED_DISCOVERY_20261108] DL380_Gen12 — WORKFLOW_CATALOG_SCOPED_DISCOVERY_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Repair discovery must select options exclusively from the verified target product catalog snapshot. Input electrical conditions (AC vs -48VDC) and customer SLA/duration requirements must be preserved, defaulting to product-qualified 3-year Basic support only when customer requirements leave support unspecified (INV-231).

#### C119. [LEARN_REASONING_EVIDENCE_VS_HARDWARE_DECOUPLING_20261108] DL380_Gen12 — WORKFLOW_EVIDENCE_DECOUPLING_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Acceptance blockers regarding evidence deficits (missing document grounding, citations, or portal session receipts) must evaluate to ACTION_REQUIRED_EVIDENCE_PROBE with zero hardware deltas, and must never invent fake hardware SKUs or convert evidence failures into hardware additions (INV-231).

#### C120. [LEARN_REASONING_CRYPTOGRAPHIC_TIER3_RECEIPT_VERIFICATION_20261108] DL380_Gen12 — WORKFLOW_TIER3_RECEIPT_VERIFICATION_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Tier 3 Official Vendor Acceptance strictly requires an authentic cryptographic session receipt re-verified from disk matching the exact candidate manifest, scope, and fresh timestamp (<24h). Truthy boolean flags or bare IDs evaluate to Tier 0 or Tier 1 (INV-201, Gate B19, INV-231).

#### C121. [LEARN_REASONING_APPEND_ONLY_KNOWLEDGE_RETRACTION_20261108] DL380_Gen12 — WORKFLOW_APPEND_ONLY_RETRACTION_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Falsified, erroneous, or superseded learned rules must be deactivated across all registry arrays (chassis deltas, wrapped rules, master registries) with an append-only decision audit trail (active: false, decision: RETRACTED or SUPERSEDED) without deleting historical evidence records (INV-231).

#### C122. [LEARN_UNIVERSAL_NLM_READ_FAILOVER_AND_SYNC_PRESERVATION_20261114] DL380_Gen12 — WORKFLOW_NLM_SYNC_RESILIENCE_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Idempotent NotebookLM read RPCs (source list, source content, canary notebook query) MUST fail over from CDP to httpx via execNlmReadWithFallback() when CdpTransportError occurs. Transient CLI read/transport errors MUST NOT downgrade cloudSyncState from VERIFIED to FAILED when an active certifiedCatalogSourceIds publication already matches the current on-disk Catalog.json SHA-256.

#### C123. [LEARN_UNIVERSAL_CAPTURE_RECEIPT_REBUILD_RECONCILIATION_20261114] DL380_Gen12 — WORKFLOW_CAPTURE_RECEIPT_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Local catalog rebuild scripts (build_catalog.js, generate_xlsx.js) MUST invoke reconcileRebuiltCaptureReceipt() to refresh capture_receipt.json artifact hashes and counts only when raw_data/oca_raw_data_full.json SHA-256 matches the verified receipt rawSha256. Rebuilt receipts MUST fail closed when rawSha256 differs.

#### C124. [LEARN_UNIVERSAL_QUARANTINE_SEMANTIC_REVALIDATION_20261114] DL380_Gen12 — WORKFLOW_QUARANTINE_GOVERNANCE_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Quarantined knowledge deltas MUST pass _checkSemanticExtractionIntegrity() (rejecting inverted discontinued-SKU dependencies, slash/disjunctive pairs misparsed as dependencies, and corrupted 6-digit SKU-prefix quantities) before promotion eligibility. Legacy quarantined deltas failing INV-230 re-validation MUST be pruned with append-only AUTO_REJECTED_BY_INV230_REVALIDATION records in knowledge_decisions.json.

#### C125. [LEARN_DL380_GEN12_WORKFLOW_SI_NO_SILENT_DEFAULT_CONVERSION_20261119] DL380_Gen12 — WORKFLOW_SI_NO_SILENT_DEFAULT_CONVERSION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Evaluators, sizing calculators, and serializers MUST preserve null or UNKNOWN for missing node capacity, unpriced items, stale lead times, and unassessed metrics rather than substituting default server capacities, zero prices, or PASS fallbacks (INV-244, INV-248, INV-252).

#### C126. [LEARN_DL380_GEN12_WORKFLOW_SI_STRICT_DOCUMENT_REVIEW_GATE_20261119] DL380_Gen12 — WORKFLOW_SI_STRICT_DOCUMENT_REVIEW_GATE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Bare { success: true } on ephemeralSourceValidation MUST NOT be promoted to VERIFIED or DOUBLE_CHECK_PASSED. Customer presentation and DeliveryAuthorization require grounded, detached, double-checked, cited, non-mock review plus unsatisfied/unomitted hard requirement and claim gates B22-B24 (INV-245, INV-249).

#### C127. [LEARN_DL380_GEN12_WORKFLOW_SI_INDEPENDENT_WAVE_VERIFICATION_20261119] DL380_Gen12 — WORKFLOW_SI_INDEPENDENT_WAVE_VERIFICATION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Parallel implementation waves with disjoint file ownership MUST pass independent counterexample verification before seam integration, confirming cross-package interoperability, cycle rejection, and zero regression leakage (INV-246, INV-247).

#### C128. [LEARN_DL380_GEN12_WORKFLOW_SI_NON_PHYSICAL_SEGREGATION_20261119] DL380_Gen12 — WORKFLOW_SI_NON_PHYSICAL_SEGREGATION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Active knowledge routing MUST segregate operational incidents, user preferences, and agent self-explanations into segregatedEntries[] outside physical hardware rules, while preserving WORKFLOW_REVIEW advisories in advisories/workflowAdvisories for audit reachability (INV-250).

#### C129. [LEARN_DL380_GEN12_WORKFLOW_SI_PORTAL_SEVEN_COLUMN_PRESERVATION_20261119] DL380_Gen12 — WORKFLOW_SI_PORTAL_SEVEN_COLUMN_PRESERVATION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Analytical SolutionIntelligenceEnvelope views (Decision & Evidence sheet, Markdown sections, dashboard banners, and MCP tools) MUST leave the 7-column Partner Portal upload sheet strictly unmodified (INV-249).

#### C130. [LEARN_DL380_GEN12_WORKFLOW_SI_CHECKPOINT_AND_ISOLATION_20261119] DL380_Gen12 — WORKFLOW_SI_CHECKPOINT_AND_ISOLATION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Long multi-milestone engineering plans run with disjoint worker file ownership on inherit workspaces, persist disk checkpoints and SI-00/SI-10 receipts cleanly without mutating protected benchmarks or notebooks config, and keep offline certification separate from unrun live portal acceptance (INV-251, INV-252).

#### C131. [LEARN_4SOCKET_ENTERPRISE_WORKSPACE_TIMEOUT_20261120] DL380_Gen12 — WORKFLOW_TIMING_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: 4-socket enterprise servers have significantly more configuration options than 2-socket servers (73+ category tables vs ~40). WebLogic takes 30-90 seconds to initialize the configuration workspace after clicking Customize, compared to 5-15 seconds for 2-socket servers. _pollForActiveOcaReadiness must allow at least 45 seconds (not 15s) with 10-second inner wait (not 3s), and _verifyConfigWorkspaceReady must allow 120 seconds (not 60s). These timeouts are universal and safe for all server classes (INV-255).

#### C132. [LEARN_CS_SUPPLY_CONSTRAINT_BADGE_20261120] DL380_Gen12 — WORKFLOW_LIFECYCLE_BADGE_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: HPE OCA marks supply-constrained SKUs with [CS] badge (red background, class supply_restricted, tooltip "This SKU is currently unavailable based on supply constraints"). The CS badge must be recognized alongside OB (Obsolete), DS (Direct Ship), EOL, and 90 (90-Day Warning) in field_parsers.js, sku.js, and build_catalog.js. When a customer BOQ contains a CS-badged SKU, the presales advisory must recommend functionally equivalent alternatives with active availability (e.g. green lead-time items). CS maps to lifecycleCanonical "Constrained Supply", vendorSupplyStatus "CONSTRAINED_SUPPLY", and isClearanceOrRestricted true (INV-256).
- **Affected SKU**: `P73835-B21`

#### C133. [LEARN_WEBLOGIC_EXPAND_SECTIONS_COST_CAPTURE_20261012] DL380_Gen12 — WORKFLOW_DOM_EXTRACTION_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: WebLogic OCA table expansion in cdp.js must explicitly toggle show_cost alongside show_price and trigger change events on all discovered showmore inputs. Omitting show_cost prevents cost column rendering, leaving tabular price-breakdown structures incomplete (INV-161).

#### C134. [LEARN_NORMAL_CTO_CARD_PRIORITY_ASYNC_XHR_20261121] DL380_Gen12 — WORKFLOW_DOM_EXTRACTION_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Commercial CTO cards (data-type="cto" without "Smart CTO") must be sorted and prioritized first over Smart CTO cards. OCA change handler executes an async XHR before removing dqe-disabled from the Customize button; a flat timeout causes race conditions. Polling up to 15s with a jQuery change retry at attempt 20 ensures reliable button unlock. In addition, cosmetic .maui-loading-div elements inside .blockMsg or .blockUI overlays must be filtered out during search input wait to prevent artificial timeouts (INV-257).

#### C135. [LEARN_BLOCKUI_OPACITY_ZERO_FALSE_POSITIVE_20261120] DL380_Gen12 — WORKFLOW_DOM_EXTRACTION_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: WebLogic OCA injects 100+ .blockUI.blockOverlay DIVs with opacity:0 and display:block across all accordion containers, sub-tabs, and panels. These are transparent residual overlays with no visual or functional blocking effect. The globalBusy check in catalog_tab_capture.js MUST NOT match these; only .blockOverlay elements with opacity > 0.1 are truly blocking. Matching by class .blockUI alone causes permanent false-positive busy detection, blocking all tab switching (INV-254). The same applies to .maui-loading-div elements inside .blockMsg containers — they are cosmetic spinners for the blockUI modal, not content loading indicators, and must be excluded from workspace readiness predicates in CONFIG_WORKSPACE_READY_PREDICATE via .closest(".blockMsg, .blockUI") filter.

#### C136. [LEARN_CS_ANTI_OVERWRITE_AND_OPTION_SUFFIX_20261121] DL380_Gen12 — WORKFLOW_LIFECYCLE_BADGE_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: build_catalog.js must preserve extracted [CS], [OB], [DS], [90], and [EOL] lifecycle badges against column-default Active overwrites, partition SOFTWARE_SUBSCRIPTION and SUPPORT_SERVICE rows out of hardware GPU/Transceiver tables, and preserve 6-character hardware localization suffixes such as R7R97A#AC3 ($0.00 No Localization) distinct from the base chassis SKU R7R97A ($19,746.00) while stripping factory FIO tags (#0D1/#OD1/#B19/#B21) (INV-265).

#### C137. [LEARN_ALLETRA_MP_NINJA_CORE_OCA_ADAPTATION_20261121] DL380_Gen12 — WORKFLOW_STORAGE_SIZING_HANDOFF_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: For flagship HPE Alletra Storage MP B10000 and X10000, size core storage architecture (controller nodes, Switchless B10100 S0B84A [up to 24 internal drives, 0-3 JBOFs, max 24/72 drives, no backend switches] vs. Switched B10200 S1R06A [0 internal drives, 1-8 mandatory JBOFs, max 384 drives, mandatory backend NVMe-oF switches], NVMe drives, DRR capacity, performance, and power) in HPE Ninja Online (capture_ninja_online_sizing.js) and export OCA JSON. After importing the JSON back into HPE OCA, adapt optical transceivers (SFPs/QSFPs), cabling, and Pointnext/Tech Care support services (Services -> Edit) and run final CLIC validation in OCA. Never mix B101xx switchless and B102xx switched controller nodes (INV-266).

#### C138. [LEARN_COLD_OCA_STEP1_DEFERRED_CLICK_20261121] DL380_Gen12 — WORKFLOW_TIMING_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: In navigate_oca.js, _sortAndFilterEligibleCandidates ranks global commercial CTO and Wizard cards ahead of KSA/Disconnected/Add-on variants. To prevent first-time cold WebLogic Step 1 timeouts, _clientSelectDropdownControls checks alreadyReady before re-firing change, buildSelectAndClickExpression defers button.click() via setTimeout(..., 50) so page navigation cannot destroy the CDP evaluation context before returning, and searchAndConfigureChassis uses a 120000ms selection timeout (INV-266).

#### C139. [LEARN_CANONICAL_SPECS_REPLAY_AND_NLM_FAILOVER_20261121] DL380_Gen12 — WORKFLOW_CAPTURE_COVERAGE_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: attribute_vectors.js loads multi-vendor matchers from scripts/config/vendors/*/policy.json and materializes compact canonicalSpecs on all active catalog rows for catalog_query_engine.js (Alletra 10k/B10000/X10000, DDR<N>, TDP/core bounds, hardware-only GPU filtering). portfolio_blindspots.js distinguishes PORTAL_COST_COLUMN_UNENTITLED and PRIVATE_UNPRICED/REGIONAL_NA_UNPRICED from zero-price anomalies, and nlm_transport.js fails over from cdp to httpx when headless CDP profile cookies expire after port 18801 disk-token healing (INV-267, INV-268).

#### C140. [LEARN_NLM_UNIFIED_PROFILE_WMI_PORT_MAP_20261121] DL380_Gen12 — WORKFLOW_NLM_AUTH_PERSISTENCE_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: To prevent daily NotebookLM AuthenticationError expiration of rotating Google cookies (__Secure-1PSIDRTS, SIDCC, SNlM0e), nlm_interactive_auth.js (port 18801) and notebooklm-mcp-cli / gemini-notebook-mcp (run_headless_auth) MUST share the unified profile directory ~/.notebooklm-mcp-cli/chrome-profiles/<profile> (with one-time Local State + Default/Network/Cookies migration from %LOCALAPPDATA%\NlmInteractiveChrome via syncLegacyInteractiveProfile). On Windows, spawnChromeDetached MUST launch Chrome via WMI Win32_Process.Create (without detached:true when windowsHide:true is set on the PowerShell launcher) to escape KILL_ON_JOB_CLOSE, and registerPortMapEntry MUST use netstat.exe -ano -p tcp to write {"18801":{"profile":"default","pid":<pid>}} to ~/.notebooklm-mcp-cli/chrome-port-map.json so find_existing_nlm_chrome and run_headless_auth reuse port 18801 directly without spawning conflicting port 9223 browsers (INV-269).

#### C141. [LEARN_GEN12_CONSOLIDATED_WORKBOOK_VIEWS_20261121] DL380_Gen12 — WORKFLOW_CAPTURE_COVERAGE_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: For refreshed DL380 Gen12 workbooks, compare active catalog and services SKU coverage and require populated core views. Duplicate or empty accessory and support tabs can disappear when their rows consolidate. Extra tabs cannot substitute for a missing or header-only required view. Verify evaluation preflight against the promoted workbook.

#### C142. [LEARN_DL380A_GPU_MODE_AND_DRIVE_CAGE_SELECTOR_GATES_20261122] DL380_Gen12 — WORKFLOW_CAPTURE_COVERAGE_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Live OCA audit (2026-11-22) proved that skipped non-empty raw tables were benign UI chrome/summary tables (0 lost hardware SKUs), while missing GPUs on accelerator servers and missing SSD/HDD drives on rack servers were caused by OCA selector-gating. Selecting GPU Mode FIO + GPU Riser unlocks hidden GPU accelerator tables, and selecting a Drive Cage/Backplane option unlocks hidden SSD/HDD drive tables. Per-pillar floors in catalog_coverage_profiles.json enforce drive/GPU presence and surface missing categories as CATALOG_COVERAGE_GAP (INV-270).

#### C143. [LEARN_CANONICAL_SPECS_AND_TEMPLATE_SKUS_PARITY_20261122] DL380_Gen12 — WORKFLOW_DOM_EXTRACTION_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Real *_Catalog.json files store rows under entry.skus (not entry.options); generic_domain_templates.js:resolveCapabilityToSku must read entry.skus || entry.options || []. attribute_vectors.js must never default socketCount:2 on non-servers/accessories, must enrich GPU TDP/VRAM via gpu_specs_lookup.js, extract optical transceiver reach/fiberMode, classify LTO tape drives as Tape Drives (not Storage Controllers), route storage Back-End Switches to Networking, and exclude [OB] Frame Options from enclosure base-variant matrices (INV-270).

#### C144. [LEARN_PROPOSED_BRANCH_AND_REASONING_OBSERVATION_HONESTY_20261122] DL380_Gen12 — WORKFLOW_EPISTEMIC_GUARDRAIL_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Unverified arbitration branches in resource_arbitrator.js must remain status PROPOSED and verifiedBuildable false until evaluateWorkloadBranch verifies every substitution via cleanBaseSKU and runs scoped physical evaluation. reasoning_post_analyzer.js must never infer acceptanceGate PASS from routing status PASSED, never upgrade Tier 0 to Tier 1 on NOT_APPLICABLE aspect arrays, and must compare cluster-scoped PCIe demand against cluster-scoped active slots while keeping memory distribution math distinct from validator flags (INV-273).

#### C145. [LEARN_BOM_BASE_PRICE_AND_DIRECT_TOGGLE_DRIVE_CAGE_PROBE_20261122] DL380_Gen12 — WORKFLOW_DOM_EXTRACTION_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: HPE OCA Product Search dropdowns omit CTO base list prices; bom_base_price.js must extract exact official Unit List Price, lead time, and 90/OB/CS/DS badges from #extended_overview_bom (table[id^="bom_grid"]) into chassisDiscovery.candidates, and build_catalog.js must exclude regional KSA/Saudi/Disconnected/Add-on wrappers from global CTO base variants. For drive-cage selector probing in drive_cage_selector_probe.js, use zero-reflow textContent (never innerText over 1,500+ rows), detect binary 0<->1 direct-toggle drive cages (NOT_EDITING without ul.popup-menu-body), expand only storage/drive showmore checkboxes, and allow 90000ms CDP timeout for WebLogic AJAX DOM recalculation (~46s observed live) before restoring qty=0 (INV-274).

#### C146. [DELTA_SYNERGY_GEN12_FC_LICENSE_PROHIBITION] SY480_Gen12 — EXCLUSION_UNBUILDABLE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: On HPE Synergy 12000 Frames (P51174-B21) populated solely with SY480 Gen12 compute nodes (P68217-B21), selecting Virtual Connect Fibre Channel upgrade licenses (R3P67A FIO LTU or R3P67AAE BTO E-LTU) is strictly forbidden and triggers CLIC Rules 81410905 and 81314323 (UNBUILDABLE CONFIGURATION: OVERRIDE REQUIRES FACTORY APPROVAL). SY480 Gen12 compute nodes route dedicated SAN traffic via Mezzanine 1 (P68131-B21 64Gb FC HBA) directly to Brocade 64Gb FC Switch Modules (P77653-B21) in Bays 1 & 4. Fibre Channel port expansion must be licensed via Brocade 8-port upgrade E-LTU (Q2E58AAE). Virtual Connect SE 100Gb F32 modules (867796-B21) in Bays 3 & 6 are dedicated to 25G/50G/100G Ethernet (via P64724-B21 adapter in Mezzanine 3), with no FCoE path on Gen12.
- **Affected SKU**: `R3P67A`
- **Required Dependency**: `Q2E58AAE`

#### C147. [DELTA_SYNERGY_FIO_VS_ELTU_STANDALONE_ORDERING] SY480_Gen12 — STANDALONE_ORDERING_TAXONOMY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: R3P67A is a Factory Integrated Option (FIO LTU) ending in 'A', which strictly requires sub-iteming under a factory CTO chassis base (P51174-B21), triggering CLIC Rules 81013168 and 81125904 ('must be ordered as a sub-item to the Base') if quoted standalone. If a customer procurement contract mandates this 32Gb FC license, it CANNOT be fulfilled using R3P67A. It must be ordered as R3P67AAE (BTO Electronic License / E-LTU) placed in a completely separate standalone software quote (new UCID) where no P51174-B21 chassis or Gen12 compute nodes exist, bypassing both Rule 81125904 and Rule 81410905.
- **Affected SKU**: `R3P67A`
- **Required Dependency**: `R3P67AAE`

#### C148. [DELTA_SYNERGY_MULTI_ORDER_ADHOC_CONTAINER_PARTITIONING] SY480_Gen12 — MULTI_ORDER_PARTITIONING_PATTERN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: When a multi-frame Synergy deployment (e.g. 2 frames, 24 nodes) is partitioned into separate commercial orders (Option B): (1) Order 2 (Frame 2) is structured as a clean hardware clone with zero loose cables, zero loose transceivers, and zero unpack services; (2) Order 1 (Frame 1) hosts a dedicated Adhoc container carrying 100% of all loose physical connectivity for both frames (DAC cables: 487655-B21 10G, 845406-B21 100G; AOC cables: 845410-B21 100G; fiber: QK734A OM4; transceivers: 455883-B21 10G SFP+ SR, 845398-B21 25G SFP28 SR, 841716-B21 40G QSFP+ BiDi) totaling $96,236.00 list; (3) Embedded switch licenses (Q2E58AAE Brocade 8-port upgrade E-LTU) must NEVER be lumped into Adhoc—they must be split evenly inside the physical switch modules (4 in Frame 1, 4 in Frame 2) to preserve 1:1 hardware module licensing integrity; (4) Tech Care Basic support (HU4B2A3) must be preserved 1:1 on both frames ($46,156 each) to satisfy CLIC Rules 99916598/99916599.
- **Affected SKU**: `P51174-B21`
- **Required Dependency**: `Q2E58AAE`

#### C149. [DELTA_SYNERGY_MULTI_FRAME_SPLIT_STARTUP_SIZING] SY480_Gen12 — MULTI_FRAME_SPLIT_STARTUP_FORMULA
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: When a multi-frame Synergy deployment (e.g. 2 frames, 24 nodes) is partitioned into separate commercial quotes/orders: (1) Frame 1 carries 1x HA124A1#5ZM (First Frame Onsite Startup, $16,742 USD); (2) Frame 2 carries 1x HA124A1#5ZQ (Additional Frame Onsite Startup, $4,627 USD), saving $12,115 USD vs duplicating First Frame; (3) Order 2 remarks must cross-reference Order 1's UCID (e.g. 5157071497-02) to satisfy automated CLIC Rule 81039677 order acceptance; (4) If frames are deployed as independent standalone islands (separate sites or unlinked OneView domains), both frames require HA124A1#5ZM; (5) Remote Startup (HA124A1#V0F) and Onsite Startup (HA124A1#5ZM) are strictly mutually exclusive and must never be combined.
- **Affected SKU**: `HA124A1`
- **Required Dependency**: `HA124A1#5ZM`

#### C150. [LEARN_SY480_GEN12_WORKFLOW_DUAL_PUBLICATION_ADVISORY_20261029] SY480_Gen12 — WORKFLOW_DUAL_PUBLICATION_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Publish and read back the human Drive workbook separately from the complete semantic Markdown source in NotebookLM. Google Sheets is not a supported NotebookLM Drive source. A recent upload timestamp does not refresh old vendor observations.

#### C151. [LEARN_SY480_GEN12_WORKFLOW_SOURCE_RETIREMENT_ADVISORY_20261029] SY480_Gen12 — WORKFLOW_SOURCE_RETIREMENT_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Verify exact-product replacement content, indexing and source-restricted grounded canary, then commit trust metadata before removing only managed stale catalog snapshots. Preserve QuickSpecs, separate learnings, shared enclosure/fabric sources and unrelated documents. Inventory absence is not authority to remove another product source.

#### C152. [LEARN_SY480_GEN12_WORKFLOW_CLOUD_LEARNING_REVIEW_ADVISORY_20261029] SY480_Gen12 — WORKFLOW_CLOUD_LEARNING_REVIEW_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Preserve retrieved cloud learning documents locally with their source IDs. Treat prose claims as candidates pending dated vendor evidence; resolve contradictions before promoting hardware dependencies. Conflicting quantity claims require dated evidence for this exact product and selector state.

#### C153. [LEARN_SY480_GEN12_128GB_MEMORY_ERROR_CLEARED_20261102] SY480_Gen12 — CLIC_ERROR_RESOLUTION_CERTIFIED
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: CRITICAL BUILDABILITY BREAKTHROUGH: HPE 128GB (1x128GB) Dual Rank x4 DDR5-6400 CAS-52-52-52 Smart FIO Memory Kit (P69730-F21) previously triggered a blocking validation Error in CLIC on SY480 Gen12 compute modules. In November 2026 OCA release, this validation Error is fully resolved and cleared to clean/pass. High-density 128GB memory configurations (up to 384 kits per frame across 12 nodes, 49.15TB total RAM) are now 100% certified buildable. Discontinued date extended to 2030-06-30.
- **Affected SKU**: `P69730-F21`
- **Required Dependency**: `P51174-B21`

#### C154. [LEARN_SYNERGY_SUPPORT_PRICING_UPDATE_20261102] SY480_Gen12 — SUPPORT_PRICING_UPDATE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: SY480 Gen12 Compute Node 3Y Tech Care Basic Support (HU4B2A30BT7) updated to $3,497.00 (+$167.00/node).
- **Affected SKU**: `HU4B2A30BT7`

#### C155. [LEARN_SYNERGY_LEAD_TIME_AND_VALIDATION_20261102] SY480_Gen12 — LEAD_TIME_AND_VALIDATION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: HPE 960GB NVMe M.2 2280 PE9010 SSD (P80321-B21) factory lead time extended from 11 days to 30 days (+19 days).
- **Affected SKU**: `P80321-B21`

#### C156. [LEARN_SY480_GEN12_MULTIFRAME_OCA_UPLOAD_AND_CLIC_20261124] SY480_Gen12 — MULTIFRAME_OCA_UPLOAD_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Verified 2-frame (24-node, UCID 5158592304-01, ,861,784.00) & 3-frame (36-node, UCID 5158590124-02, ,239,327.00) SY480 Gen12 single-solution OCA upload layout: (1) Per-frame Synergy 480 Gen12 #i containers with 12x P68217-B21, P68340-B21 NS204i-d v2 + 24x P80318-B21 480GB M.2 SSD; (2) 0D1 882251-B21 transceivers inside 100Gb Virtual #i up to OCA max 8 per 867796-B21, while all loose non-0D1 cables/transceivers MUST upload under Config Name Ad-Hoc #1 (renameable after import; using AdHoc - SFP + Cables caused OCA in UCID 5158592304-01 to absorb K2Q47A x6, QK729A x6, and R6B12A x16 into 32Gb/20 4SFP+ FC #2 and scatter other loose cables) and HU4B2A3* 3Y Tech Care Basic services anchor to #1 containers; (3) P68131-B21 (64Gb FC HBA) negotiates backward cleanly with Q2E57A (Brocade 32Gb/20 FC switch) in OCA; (4) Live CLIC baseline shows Error on P80318-B21 and Warning on P51174-B21 / 867793-B21 when interconnect cables reside in Ad-Hoc.
- **Affected SKU**: `P80318-B21`
- **Required Dependency**: `P68340-B21`

#### C157. [LEARN_SY100GB_F32_MODULE_WORKFLOW_DUAL_PUBLICATION_ADVISORY_20261029] SY100Gb_F32_Module — WORKFLOW_DUAL_PUBLICATION_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Publish and read back the human Drive workbook separately from the complete semantic Markdown source in NotebookLM. Google Sheets is not a supported NotebookLM Drive source. A recent upload timestamp does not refresh old vendor observations.

#### C158. [LEARN_SY100GB_F32_MODULE_WORKFLOW_SOURCE_RETIREMENT_ADVISORY_20261029] SY100Gb_F32_Module — WORKFLOW_SOURCE_RETIREMENT_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Verify exact-product replacement content, indexing and source-restricted grounded canary, then commit trust metadata before removing only managed stale catalog snapshots. Preserve QuickSpecs, separate learnings, shared enclosure/fabric sources and unrelated documents. Inventory absence is not authority to remove another product source.

#### C159. [LEARN_SY100GB_F32_MODULE_WORKFLOW_CLOUD_LEARNING_REVIEW_ADVISORY_20261029] SY100Gb_F32_Module — WORKFLOW_CLOUD_LEARNING_REVIEW_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Preserve retrieved cloud learning documents locally with their source IDs. Treat prose claims as candidates pending dated vendor evidence; resolve contradictions before promoting hardware dependencies. Conflicting quantity claims require dated evidence for this exact product and selector state.

#### C160. [LEARN_SY100GB_F32_MODULE_SUPPORT_PRICING_UPDATE_20261102] SY100Gb_F32_Module — SUPPORT_PRICING_UPDATE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: HPE Virtual Connect SE 100Gb F32 Module for Synergy Support (HU4B2A3 Z1R, under HU4B2A3 3Y Tech Care Basic) list price updated in November 2026 OCA catalog from .00 to .00 USD (+.00 / +5.04% per module).
- **Affected SKU**: `HU4B2A3 Z1R`

#### C161. [LEARN_SYNERGY_12000_FRAME_WORKFLOW_DUAL_PUBLICATION_ADVISORY_20261029] Synergy_12000_Frame — WORKFLOW_DUAL_PUBLICATION_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Publish and read back the human Drive workbook separately from the complete semantic Markdown source in NotebookLM. Google Sheets is not a supported NotebookLM Drive source. A recent upload timestamp does not refresh old vendor observations.

#### C162. [LEARN_SYNERGY_12000_FRAME_WORKFLOW_SOURCE_RETIREMENT_ADVISORY_20261029] Synergy_12000_Frame — WORKFLOW_SOURCE_RETIREMENT_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Verify exact-product replacement content, indexing and source-restricted grounded canary, then commit trust metadata before removing only managed stale catalog snapshots. Preserve QuickSpecs, separate learnings, shared enclosure/fabric sources and unrelated documents. Inventory absence is not authority to remove another product source.

#### C163. [LEARN_SYNERGY_12000_FRAME_WORKFLOW_CLOUD_LEARNING_REVIEW_ADVISORY_20261029] Synergy_12000_Frame — WORKFLOW_CLOUD_LEARNING_REVIEW_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Preserve retrieved cloud learning documents locally with their source IDs. Treat prose claims as candidates pending dated vendor evidence; resolve contradictions before promoting hardware dependencies. Conflicting quantity claims require dated evidence for this exact product and selector state.

#### C164. [LEARN_SYNERGY_12000_DUAL_SLOT_PSU_ADAPTER_12PSU_20261124] Synergy_12000_Frame — POWER_ENVELOPE_ARCHITECTURE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: 6x HPE Synergy Dual Slot Power Supply Adapters (P44074-B21) expand a Synergy 12000 Frame (P51174-B21) from 6 physical PSU bays to 12x HPE 1800W-2200W Flex Slot Titanium PSUs (P44712-B21) per frame (verified across 2-frame 24-PSU UCID 5158592304-01 and 3-frame 36-PSU UCID 5158590124-02 OCA builds). Multi-frame roles are encoded inside sequential frames Synergy 12000 Frame #1/#2/#3 via 859493-B21 (Master1 FIO + Composer2 872957-B21), 859494-B22 (Master2 FIO + Composer2), and Satellite frames (no Master FIO / no Composer2).
- **Affected SKU**: `P44074-B21`
- **Required Dependency**: `P44712-B21`

#### C165. [LEARN_SYNERGY_4PORT_FRAME_LINK_MODULE_WORKFLOW_DUAL_PUBLICATION_ADVISORY_20261029] Synergy_4Port_Frame_Link_Module — WORKFLOW_DUAL_PUBLICATION_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Publish and read back the human Drive workbook separately from the complete semantic Markdown source in NotebookLM. Google Sheets is not a supported NotebookLM Drive source. A recent upload timestamp does not refresh old vendor observations.

#### C166. [LEARN_SYNERGY_4PORT_FRAME_LINK_MODULE_WORKFLOW_SOURCE_RETIREMENT_ADVISORY_20261029] Synergy_4Port_Frame_Link_Module — WORKFLOW_SOURCE_RETIREMENT_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Verify exact-product replacement content, indexing and source-restricted grounded canary, then commit trust metadata before removing only managed stale catalog snapshots. Preserve QuickSpecs, separate learnings, shared enclosure/fabric sources and unrelated documents. Inventory absence is not authority to remove another product source.

#### C167. [LEARN_SYNERGY_4PORT_FRAME_LINK_MODULE_WORKFLOW_CLOUD_LEARNING_REVIEW_ADVISORY_20261029] Synergy_4Port_Frame_Link_Module — WORKFLOW_CLOUD_LEARNING_REVIEW_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Preserve retrieved cloud learning documents locally with their source IDs. Treat prose claims as candidates pending dated vendor evidence; resolve contradictions before promoting hardware dependencies. Conflicting quantity claims require dated evidence for this exact product and selector state.

#### C168. [LEARN_SYNERGY_FLM_453154_DIVISIBILITY_ADHOC_20261124] Synergy_4Port_Frame_Link_Module — OCA_IMPORT_DIVISIBILITY_RULE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: 453154-B21 (1G SFP RJ45 Transceiver, 0D1) placed inside 4-port Frame Link Module #i (876852-B21 Qty 2) requires qty(453154-B21) % qty(876852-B21) === 0 during OCA BOM import. In 3-frame UCID 5158590124-02, Frame #2 had 2x 453154-B21 under 2x 876852-B21 (ratio 1.0) and stayed factory-integrated; in 2-frame UCID 5158592304-01, 1x 453154-B21 under 2x 876852-B21 (ratio 0.5) per frame caused OCA to eject 453154-B21 into 2 extra Ad-Hoc containers (final export stripped both 453154-B21 0D1 rows and merged 1+1 -> 2 in Ad-Hoc). For 2 total 453154-B21 across 2 frames, consolidate 2x under one FLM container or place 2x 453154-B21 (without 0D1) directly in Ad-Hoc #1 for upload. Always number FLM Config Names sequentially (#1, #2, #3).
- **Affected SKU**: `453154-B21`
- **Required Dependency**: `876852-B21`

#### C169. [LEARN_SYNERGY_BROCADE_64GB_FC_MODULE_WORKFLOW_DUAL_PUBLICATION_ADVISORY_20261029] Synergy_Brocade_64Gb_FC_Module — WORKFLOW_DUAL_PUBLICATION_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Publish and read back the human Drive workbook separately from the complete semantic Markdown source in NotebookLM. Google Sheets is not a supported NotebookLM Drive source. A recent upload timestamp does not refresh old vendor observations.

#### C170. [LEARN_SYNERGY_BROCADE_64GB_FC_MODULE_WORKFLOW_SOURCE_RETIREMENT_ADVISORY_20261029] Synergy_Brocade_64Gb_FC_Module — WORKFLOW_SOURCE_RETIREMENT_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Verify exact-product replacement content, indexing and source-restricted grounded canary, then commit trust metadata before removing only managed stale catalog snapshots. Preserve QuickSpecs, separate learnings, shared enclosure/fabric sources and unrelated documents. Inventory absence is not authority to remove another product source.

#### C171. [LEARN_SYNERGY_BROCADE_64GB_FC_MODULE_WORKFLOW_CLOUD_LEARNING_REVIEW_ADVISORY_20261029] Synergy_Brocade_64Gb_FC_Module — WORKFLOW_CLOUD_LEARNING_REVIEW_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Preserve retrieved cloud learning documents locally with their source IDs. Treat prose claims as candidates pending dated vendor evidence; resolve contradictions before promoting hardware dependencies. Conflicting quantity claims require dated evidence for this exact product and selector state.
