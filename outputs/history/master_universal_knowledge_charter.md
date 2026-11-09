# HPE Knowledge Registry — Local Audit Index

**Document Version**: `2.0.0` | **Generated**: `2026-11-09T11:25:11.893Z`
**Scope**: Local governance index. This file is not a NotebookLM source; product notebooks receive independently scoped projections.
**Total Verified Knowledge Deltas**: `133` (`9` Universal + `0` Family/Gen + `124` Chassis Specific)

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

#### U4. [OWNER_STANDARD_3Y_BASIC] SUPPORT_POLICY
- **Scope**: `UNIVERSAL_VENDOR`
- **Rule**: Preserve explicit customer support term and tier in the closest rank; use 3-year Tech Care Basic only when unspecified or explicitly authorized. For this SN3600B BOQ the owner authorized 5-year Essential to 3-year Basic. Compare qualified fixed and flexible service options; disclose retention and preserve parent/suffix pairs. This commercial preference is not vendor qualification.

#### U5. [OWNER_ICON_SERVICE_ISOLATION] ICON_SUPPORT_ISOLATION
- **Scope**: `UNIVERSAL_VENDOR`
- **Rule**: Select Services from Components for the owning icon, edit its dropdowns, and leave both apply-to-all icons and apply-to-all nodes off. Different icons retain their own SLA.

#### U6. [OWNER_OCA_EXPIRED_SESSION] SESSION_RECOVERY_PROTOCOL
- **Scope**: `UNIVERSAL_VENDOR`
- **Rule**: When OCA says it encountered a problem, restart from Partner Portal refresh/login and open One Config Advanced through Quick Links. Do not reload the failed OCA session. Keep a Partner Portal tab before closing stale OCA so CDP does not disappear. This supersedes cache-flush advice for encountered-a-problem errors.

#### U7. [OWNER_CLOSEST_REQUIREMENT_RANK] CUSTOMER_INTENT_POLICY
- **Scope**: `UNIVERSAL_VENDOR`
- **Rule**: Closest rank preserves customer requirements and makes only necessary compatibility/buildability changes. Budget alternatives disclose every deviation; do not silently reduce term, tier, capacity or resilience. Keep explicit owner overrides auditable against the original customer BOQ.

#### U8. [OWNER_COMPONENT_DOMAIN_ROUTING] COMPONENT_DOMAIN_ROUTING
- **Scope**: `UNIVERSAL_VENDOR`
- **Rule**: Route by component role and exact product, never vendor or family alone. Synergy compute, fabric and frame use separate scopes. Resolve ownership before quantities. Validate each component and enclosure/bay, adapter/fabric, optical endpoints, shared power and per-icon SLA relationships; missing profiles remain NOT_EVALUATED and cannot inherit server defaults. Scraping completeness is not buildability certification.

#### U9. [GUARDRAIL_TRANSPORT_RECOVERY] GUARDRAIL_RECOVERY_POLICY
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

#### C17. [DELTA_DL145_GEN11_AMD_EPYC_8004] DL145_Gen11 — PROCESSOR_FAMILY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: DL145 Gen11 is single-socket AMD EPYC 8004 only. No dual-socket configurations supported.
- **Affected SKU**: `P71964-B21`

#### C18. [DELTA_DL145_GEN11_4EDSFF_CAGE] DL145_Gen11 — DRIVE_CAGE_FORMAT
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: DL145 Gen11 uses EDSFF E3.S form factor drives only. Standard SFF/LFF drives are incompatible.
- **Affected SKU**: `P71985-B21`
- **Required Dependency**: `P77271-B21`

#### C19. [DELTA_DL145_GEN11_PSU_PROFILE] DL145_Gen11 — PSU_WATTAGE_LIMIT
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: DL145 Gen11 supports maximum 1000W PSUs. 1600W/2400W PSUs are physically incompatible.
- **Affected SKU**: `P71964-B21`
- **Required Dependency**: `P54290-B21`

#### C20. [DELTA_DL145_GEN11_EXTENDED_TEMP] DL145_Gen11 — EXTENDED_AMBIENT_TRACKING
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: DL145 Gen11 edge deployments use P73021-B21 for extended -5C to 45C ambient temperature tracking.
- **Affected SKU**: `P71964-B21`
- **Required Dependency**: `P73021-B21`

#### C21. [DELTA-1787856163365] DL380_Gen11 — MEMORY_POPULATION_CONSTRAINT
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: When ordering P52534-B21 (DL380 Gen11 8SFF NC CTO), minimum 1 and maximum 16 memory DIMMs must be ordered per processor.
- **Affected SKU**: `P52534-B21`
- **Required Dependency**: `MEMORY_KIT_MIN1_MAX16`

#### C22. [DELTA-1787856163549] DL380_Gen11 — SUPPLY_CONSTRAINT_FIO_SUBSTITUTION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Standalone SKU P64707-B21 constrained; must substitute factory-integrated P64707-F21 for CTO factory build.
- **Affected SKU**: `P64707-B21`
- **Required Dependency**: `P64707-F21`

#### C23. [DELTA-1787856163672] DL380_Gen11 — OPERATING_SYSTEM_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Advisory: Selection of an Operating System is recommended for factory deployment.
- **Affected SKU**: `P52534-B21`

#### C24. [DELTA-1787856163759] DL380_Gen11 — MANAGEMENT_UTILITY_COMPATIBILITY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: When ordering MegaRAID controller P58335-B21, MegaRAID Tools cannot be used to configure legacy SmartRAID arrays.
- **Affected SKU**: `P58335-B21`
- **Required Dependency**: `P58335-B21`

#### C25. [DELTA_CLIC_81354632_DL380_GEN11] DL380_Gen11 — PHYSICAL_ATTACH_REQUIREMENT
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: If P48832-B21 (Tri-Mode Splitter Cable) is selected, P48814-B21 (8SFF U.3 Premium Cage) is mandatory.
- **Affected SKU**: `P48832-B21`
- **Required Dependency**: `P48814-B21`

#### C26. [DELTA_CLIC_81354652_DL380_GEN11] DL380_Gen11 — PHYSICAL_POWER_ENABLEMENT
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: If P02377-B21 / P01366-B21 (Capacitor/Battery) is selected, P48918-B21 (Storage Controller Enablement Cable Kit) is mandatory.
- **Affected SKU**: `P02377-B21`
- **Required Dependency**: `P48918-B21`

#### C27. [DELTA_CLIC_81355854_DL380_GEN11] DL380_Gen11 — MUTUAL_EXCLUSIVITY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: P51911-B21 and P48830-B21 cannot be selected together. Retain P48830-B21.
- **Affected SKU**: `P51911-B21`
- **Required Dependency**: `P48830-B21`

#### C28. [DELTA_CLIC_81016755_DL380_GEN11] DL380_Gen11 — RISER_SLOT_ENABLEMENT
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: When 5+ PCIe cards are installed, P56073-B21 Primary Cable Kit is mandatory for Primary Riser Slot 1.
- **Affected SKU**: `P48803-B21`
- **Required Dependency**: `P56073-B21`

#### C29. [DELTA_CLIC_EU_LOT9_P35876_DL380_GEN11] DL380_Gen11 — REGULATORY_ENABLEMENT
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: When ordering Platinum PSUs (P38997-B21) on high-draw dual-socket configurations, P35876-B21 (CE Mark Removal Kit) is required for non-EU deployment, or upgrade to Titanium PSUs (P44712-B21).
- **Affected SKU**: `P38997-B21`
- **Required Dependency**: `P35876-B21`

#### C30. [DELTA_RAG_DEP_P02377-B21_P48918-B21_1787913302880] DL380_Gen11 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: P02377-B21` or `P01366-B21` **mandates the inclusion of `P48918-B21
- **Affected SKU**: `P02377-B21`
- **Required Dependency**: `P48918-B21`

#### C31. [DELTA_RAG_DEP_P58335-B21_P48918-B21_1787913632019] DL380_Gen11 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: P58335-B21`)** with the **Smart Storage Hybrid Capacitor (`P02377-B21`)** strictly requires `P48918-B21
- **Affected SKU**: `P58335-B21`
- **Required Dependency**: `P48918-B21`

#### C32. [DELTA_RAG_DEP_write-cach_P48918-B21_1787915281069] DL380_Gen11 — STORAGE_CACHE_CABLE_DEPENDENCY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Selecting storage controller P58335-B21 write-cache backup requires enablement cable P48918-B21.
- **Affected SKU**: `P58335-B21`
- **Required Dependency**: `P48918-B21`

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

#### C39. [DELTA-1789752537004-v9j6p] DL380a_Gen12 — RULE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Observed price drift on P74700-B21 (memory)
- **Affected SKU**: `P74700-B21`
- **Engineering Rationale**: *Manual price drift reconciliation from phase 15 audit*

#### C40. [DELTA-1789752537592-otj9t] DL380a_Gen12 — RULE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Observed price drift on S4A91C (drive)
- **Affected SKU**: `S4A91C`
- **Engineering Rationale**: *Manual price drift reconciliation from phase 15 audit*

#### C41. [DELTA-1789752537783-790yf] DL380a_Gen12 — RULE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Observed price drift on HA113A1 (support)
- **Affected SKU**: `HA113A1`
- **Engineering Rationale**: *Manual price drift reconciliation from phase 15 audit*

#### C42. [DELTA-1789752537975-31r35] DL380a_Gen12 — RULE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Observed price drift on HU4B2A30C4W (service)
- **Affected SKU**: `HU4B2A30C4W`
- **Engineering Rationale**: *Manual price drift reconciliation from phase 15 audit*

#### C43. [DELTA_P70436_DELISTED_REPLACED_BY_P91249] DL380a_Gen12 — SKU_SUBSTITUTION
- **Scope**: `PRODUCT_GENERATION`
- **Rule**: When customer quotes specify P70436-B21, substitute with active Multi Vendor SKU P91249-B21 (same High Performance U.3 specification) or value-engineered P84236-B21.
- **Affected SKU**: `P70436-B21`
- **Required Dependency**: `P91249-B21`

#### C44. [DELTA_VROC_DIRECT_ATTACH_NO_BATTERY] DL380a_Gen12 — BATTERY_EXEMPTION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Exempt Intel VROC and NS204i-u boot devices from Smart Storage Battery P01367-B21 requirement. Battery is exclusively required for hardware MR416i/SR932i storage controllers.
- **Affected SKU**: `R7J57A`

#### C45. [LEARN_DL380A_GEN12_WORKFLOW_DUAL_PUBLICATION_ADVISORY_20261029] DL380a_Gen12 — WORKFLOW_DUAL_PUBLICATION_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Publish and read back the human Drive workbook separately from the complete semantic Markdown source in NotebookLM. Google Sheets is not a supported NotebookLM Drive source. A recent upload timestamp does not refresh old vendor observations.

#### C46. [LEARN_DL380A_GEN12_WORKFLOW_SOURCE_RETIREMENT_ADVISORY_20261029] DL380a_Gen12 — WORKFLOW_SOURCE_RETIREMENT_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Verify exact-product replacement content, indexing and source-restricted grounded canary, then commit trust metadata before removing only managed stale catalog snapshots. Preserve QuickSpecs, separate learnings, shared enclosure/fabric sources and unrelated documents. Inventory absence is not authority to remove another product source.

#### C47. [LEARN_DL380A_GEN12_WORKFLOW_CLOUD_LEARNING_REVIEW_ADVISORY_20261029] DL380a_Gen12 — WORKFLOW_CLOUD_LEARNING_REVIEW_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Preserve retrieved cloud learning documents locally with their source IDs. Treat prose claims as candidates pending dated vendor evidence; resolve contradictions before promoting hardware dependencies. Conflicting quantity claims require dated evidence for this exact product and selector state.

#### C48. [LEARN_DL380A_GEN12_SUPPORT_PRICING_UPDATE_20261102] DL380a_Gen12 — SUPPORT_PRICING_UPDATE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: HPE DL380a Gen12 Support (HU4B2A30C4W, under HU4B2A3 3Y Tech Care Basic) list price updated in November 2026 OCA catalog from $11,306.00 to $11,871.00 USD (+$565.00 / +5.00% per node). Total server list price adjusted from $1,656,550.00 to $1,657,115.00 USD.
- **Affected SKU**: `HU4B2A30C4W`
- **Required Dependency**: `P76706-B21`

#### C49. [LEARN_DL380A_GEN12_H200_LEAD_TIME_BOTTLENECK_20261102] DL380a_Gen12 — SUPPLY_CHAIN_LEAD_TIME_BOTTLENECK
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: CRITICAL PRESALES CONSTRAINT: NVIDIA H200 NVL 141GB PCIe Accelerator (S3U30C) carries an estimated availability factory lead time of 168 business days (~24 weeks / 5.5 months), establishing it as the primary supply chain gating factor for DL380a Gen12 AI accelerator deployments. FC HBA (R2E09A) is 30 days; Base chassis (P76706-B21) is 14 days; CPU (P74571-B21) and DDR5 memory (P69728-F21) are 10 days.
- **Affected SKU**: `S3U30C`

#### C50. [LEARN_DL380A_GEN12_CLIC_STATUS_CLEARANCE_20261102] DL380a_Gen12 — CLIC_STATUS_CLEARANCE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Portal validation warnings on HPE ProLiant Compute DL380a Gen12 8DW/16SW CTO Server (P76706-B21) and HPE Compute Ops Management Standard 3-year SaaS (R7A11AAE) have cleared to clean/pass in latest OCA release. 64GB DDR5-6400 memory (P69728-F21) discontinuation date extended to 2030-06-30.
- **Affected SKU**: `P76706-B21`

#### C51. [LEARN_DL380A_GEN12_RAID1_MULTI_DRIVE_20261104] DL380a_Gen12 — ARRAY_GEOMETRY_BUILD_BLOCKER
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: In HPE OCA / CLIC on DL380a Gen12, 339778-B21 (HPE RAID 1 Drive 1 FIO Setting) strictly enforces Drive Count == 2. When >2 drives (e.g. 4x NVMe SSDs) are configured without a full-cage RAID 5/10 setting, CLIC marks the build as UNBUILDABLE (Action-Required) due to unassigned drive geometry mismatch and mandates 389692-B21 (HPE Customer Defined RAID Setting Service, max 1) or omitting FIO settings when dedicated NS204i-u boot device P78279-B21 is present.
- **Affected SKU**: `339778-B21`

#### C52. [LEARN_DL380A_GEN12_BOOT_DATA_DECOUPLING_20261104] DL380a_Gen12 — WORKFLOW_VENDOR_OBSERVATION_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: HPE NS204i-u v2 480GB Boot Device (P78279-B21) and front boot cage (P75284-B21) have zero hardware, cage, or bus dependency on SFF data drives (P63833-B21 / P50219-B21 / P50216-B21), 4SFF drive cage (P74710-B21), or direct-attach cables (P74702-B21). Boot tier and data tier can be configured independently or together.
- **Affected SKU**: `P78279-B21`

#### C53. [LEARN_DL380A_GEN12_TURNKEY_RACKING_CABLING_20261104] DL380a_Gen12 — WORKFLOW_VENDOR_OBSERVATION_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: DL380a Gen12 base CTO chassis P76706-B21 does not bundle rack rails. When customer tender requests installation, racking, and cabling, P69770-B21 (Ball Bearing Rail Kit) is mandatory to mount the 4U chassis. Furthermore, SFP28 networking adapters (P10115-B21) require 2x 845398-B21 (25Gb SFP28 SR Transceivers) or DAC cables to prevent site cabling failure.
- **Affected SKU**: `P69770-B21`

#### C54. [LEARN_DL380A_GEN12_WORKFLOW_NORMATIVE_LANGUAGE_PRECISION_20261107] DL380a_Gen12 — WORKFLOW_NORMATIVE_LANGUAGE_PRECISION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: All agent skill directives, checklists, and execution handoffs must adhere to strict RFC-2119 normative vocabulary (MUST, MUST NOT, SHALL, SHOULD, MAY). Ambiguous hedge words (appropriate, as needed, etc., consider, typically, usually, generally, if possible, try to) are strictly prohibited in operational procedures to eliminate agent hesitation and non-deterministic loops.

#### C55. [LEARN_DL380A_GEN12_WORKFLOW_MODULAR_SKILL_TOKEN_OPTIMIZATION_20261107] DL380a_Gen12 — WORKFLOW_MODULAR_SKILL_TOKEN_OPTIMIZATION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Monolithic skills exceeding 25KB must be modularized into a concise core execution SKILL.md (<=250 lines) plus dedicated references/ documentation files. This preserves agent prompt token budgets, accelerates model reasoning, and prevents guardrail context window exhaustion.

#### C56. [LEARN_DL380A_GEN12_WORKFLOW_UNIVERSAL_CC30_AND_QUALITY_CEILING_20261107] DL380a_Gen12 — WORKFLOW_UNIVERSAL_CC30_AND_QUALITY_CEILING
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Every function across all repository scripts and test fixtures must strictly comply with the universal cyclomatic complexity ceiling <= 30 (INV-229, INV-230). All modified code must pass oxlint with zero warnings, maintain a clean DAG with zero circular dependencies, and preserve non-empty test discovery.

#### C57. [LEARN_DL380A_GEN12_WORKFLOW_SPECIALIZED_ARCHITECTURAL_DISPATCH_20261107] DL380a_Gen12 — WORKFLOW_SPECIALIZED_ARCHITECTURAL_DISPATCH
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Incoming presales inquiries must be classified and dispatched by presales-query-router across 34 specialized skill tracks, including code-quality-gate, self-correction-counterfactual, presales-clearance-strategy, and turnkey-racking-cabling, with zero ad-hoc script generation.

#### C58. [DELTA-1787939298644] DL380_Gen12 — RULE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Portal validation flagged restriction on P76453-B21.
- **Affected SKU**: `P76453-B21`

#### C59. [DELTA-1787939245188] DL380_Gen12 — RULE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Portal validation flagged restriction on P76450-B21.
- **Affected SKU**: `P76449-B21`
- **Required Dependency**: `P76450-B21`

#### C60. [PREPROC-DELTA-1786781599909] DL380_Gen12 — PREPROCESSING_SPLIT_CONFIRMED
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Confirmed configuration variation reason 'WORKLOAD_NODE_PURPOSE' for config_1

#### C61. [DELTA-1786880389958] DL380_Gen12 — RULE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Intel Xeon 6730P 250W CPU requires HPE ProLiant Compute DL380 Gen12 Performance Heat Sink Kit (P74792-B21) due to exceeding the 185W standard thermal envelope.
- **Affected SKU**: `P74573-B21`
- **Required Dependency**: `P74792-B21`
- **Engineering Rationale**: *Agentic Guardrail Loop derived from RAG/DB fact-check*

#### C62. [DELTA-1786880394092] DL380_Gen12 — RULE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Intel Xeon 6730P 250W CPU requires HPE ProLiant High Performance Fan Kit (P48820-B21) because it exceeds the 240W system limit for standard chassis fans.
- **Affected SKU**: `P74573-B21`
- **Required Dependency**: `P48820-B21`
- **Engineering Rationale**: *Agentic Guardrail Loop derived from RAG/DB fact-check*

#### C63. [DELTA_RAG_FIO_P69728-B21_P69728-F21_1788145618089] DL380_Gen12 — OPTION_TYPE_SUBSTITUTION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: | **`P69728-B21`** | HPE 64GB (1x64GB) Dual Rank x4 DDR5-6400 Smart Memory Kit | Memory / RDIMM (BTO) | **❌ BLOCKED in CTO (CLIC Suffix Violation)** | Standalone retail Build-to-Order (BTO) SKU [9, 15, 16]. Factory Configure-to-Order sessions enforce the rule: *"BTO products are not allowed in CTO B
- **Affected SKU**: `P69728-B21`
- **Required Dependency**: `P69728-F21`

#### C64. [DELTA_RAG_DEP_P75740-B21_873763-B21_1788145618089] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: | **`P75740-B21`** | HPE DL3XX Gen12 8SFF x1 U.3 Tri-Mode Drive Cage Kit | Smart Chassis / Drive Cage | **✅ Valid Front Cage** | Installs an 8-bay SFF x1 U.3 Tri-Mode backplane into Box 1, 2, or 3 [19-23]. Installing this cage **clears the factory unbuildable drive-less chassis block** (which otherw
- **Affected SKU**: `P75740-B21`
- **Required Dependency**: `873763-B21`

#### C65. [DELTA_RAG_DEP_P28586-B21_P75740-B21_1788145618089] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: | **`P28586-B21`** | HPE 1.2TB SAS 12G 10K SFF BC 3yr Wty HDD | Storage / SFF SAS HDD | **✅ Valid SAS HDD** | 12G SAS 10K RPM Basic Carrier (BC) drive [21, 28]. Supported inside the `P75740-B21` drive cage [21, 22]. Requires a dedicated hardware storage controller (`P47777-B21`) as the system board
- **Affected SKU**: `P28586-B21`
- **Required Dependency**: `P75740-B21`

#### C66. [DELTA_RAG_DEP_P47777-B21_P01366-B21_1788145618091] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: | **`P47777-B21`** | HPE MR416i-p Gen11 x16 Lanes 8GB Cache PCI SPDM Storage Controller | Storage Controller / Tri-Mode | **⚠️ Conditional Pass (Requires 3 Co-Dependencies)** | Stand-up PCIe card (-p) installed into a PCIe riser slot [30, 36, 39-41]. Requires **`P01366-B21`** (battery), **`P48918-B2
- **Affected SKU**: `P47777-B21`
- **Required Dependency**: `P01366-B21`

#### C67. [DELTA_RAG_DEP_P76453-B21_P75740-B21_1788145618092] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: 4.  **High-Speed Backplane Data Cable (`P76453-B21`):** Routing SAS/SATA/NVMe data lanes from Box 1 or Box 2 backplanes of the `P75740-B21` drive cage to the stand-up MR416i-p requires the **HPE ProLiant Compute DL380 Gen12 8SFF/2SFF UMB PCIe Cable Kit (`P76453-B21`)** [76, 80–85, 113, 117–122, 145,
- **Affected SKU**: `P76453-B21`
- **Required Dependency**: `P75740-B21`

#### C68. [DELTA_RAG_FIO_P64707-B21_P69728-F21_1788148383105] DL380_Gen12 — OPTION_TYPE_SUBSTITUTION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: | **`P64707-B21`** | HPE 64GB 2Rx4 DDR5-5600 Registered Memory | Memory / RDIMM | **❌ Incompatible Gen11 Memory** | Gen12 strictly mandates **DDR5-6400 Smart Memory** [200, 208–209, 240, 270]. DDR5-5600 is blocked. Factory CTO builds also mandate the **`-F21`** suffix (**`P69728-F21`**) [8-12]. |
- **Affected SKU**: `P64707-B21`
- **Required Dependency**: `P69728-F21`

#### C69. [DELTA_RAG_DEP_P48818-B21_P38995-B21_1788148383108] DL380_Gen12 — SKU_SUBSTITUTION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: | **`P48818-B21`** | HPE 800W Flex Slot Platinum Hot Plug Power Supply | Power Supplies | **❌ Invalid SKU & Lack of Redundancy** | The valid 800W Platinum SKU is **`P38995-B21`** [23, 24]. A single PSU provides no 1+1 redundancy [25]. (EU ErP Lot 9 requires 96% Titanium `P03178-B21`) [25, 26]. |
- **Affected SKU**: `P48818-B21`
- **Required Dependency**: `P38995-B21`

#### C70. [DELTA_RAG_CARRYOVER_P47777-B21_1788459469422] DL380_Gen12 — CARRY_OVER_VALIDATED
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: | **P47777-B21** | HPE MR416i-p Gen11 Storage Controller | **✅ VALID** | This PCIe plug-in controller is fully supported on Gen12 as a carry-forward option [16]. However, it **requires the P48918-B21 enablement cable kit** to bridge SPDM security and sideband power to the Gen12 motherboard [16]. | *
- **Affected SKU**: `P47777-B21`

#### C71. [DELTA_RAG_DEP_P01366-B21_P48918-B21_1788459469423] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: | **P01366-B21** | HPE 96W Smart Storage Battery | **✅ VALID** | Fully compatible battery to protect the MR416i-p's volatile write cache [16]. It **requires the P48918-B21 enablement cable** to physically connect to the controller's cache module [16]. | **P01366-B21** *(Keep)* |
- **Affected SKU**: `P01366-B21`
- **Required Dependency**: `P48918-B21`

#### C72. [DELTA_RAG_DEP_P10180-B21_P72203-B21_1788459469424] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: | **P10180-B21** | Broadcom BCM5719 1Gb 4p BASE-T OCP3 NIC | **❌ OBSOLETE** | Legacy Gen11 part number [8]. It also **requires OCP enablement cable P72203-B21** to route high-speed PCIe lanes from CPU1 to rear OCP Slot B [25]. | **P51181-B21** (BCM5719 OCP3 NIC) and **P72203-B21** (OCP rear cable ki
- **Affected SKU**: `P10180-B21`
- **Required Dependency**: `P72203-B21`

#### C73. [DELTA_RAG_DEP_P74573-B21_P48820-B21_1788461136463] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: • [DL380_Gen12 Catalog Rule] Category: Learned Feedback Rules > P74573-B21 | Constraint: learned (Intel Xeon 6730P 250W CPU requires HPE ProLiant High Performance Fan Kit (P48820-B21) because it exceeds the 240W system limit for standard chassis fans.)
- **Affected SKU**: `P74573-B21`
- **Required Dependency**: `P48820-B21`

#### C74. [DELTA_RAG_DEP_P74573-B21_P74792-B21_1788461136464] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: • [DL380_Gen12 Catalog Rule] Category: Learned Feedback Rules > P74573-B21 | Constraint: learned (Intel Xeon 6730P 250W CPU requires HPE ProLiant Compute DL380 Gen12 Performance Heat Sink Kit (P74792-B21) due to exceeding the 185W standard thermal envelope.)
- **Affected SKU**: `P74573-B21`
- **Required Dependency**: `P74792-B21`

#### C75. [DELTA-1788462981839] DL380_Gen12 — RULE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: P10180-B21 is obsolete Gen11 SKU for DL380 Gen12; replaced by P51181-B21 with mandatory OCP rear cable kit P72203-B21.
- **Affected SKU**: `P10180-B21`
- **Required Dependency**: `P51181-B21`
- **Engineering Rationale**: *Agentic Guardrail Loop derived from RAG/DB fact-check*

#### C76. [DELTA_RAG_DEP_P76453-B21_P48918-B21_1788463665182] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: 3.  **Storage Cable Integration:** The inclusion of `P76453-B21` is correct for routing PCIe lanes from SFF drive cages back to the PCIe slot [16]. However, the configurator will throw an error unless it sees the **Storage Controller Enablement Cable Kit (`P48918-B21`)** which is physically required
- **Affected SKU**: `P76453-B21`
- **Required Dependency**: `P48918-B21`

#### C77. [DELTA_RAG_DEP_P81130-B21_P74787-B21_1790182000001] DL380_Gen12 — OPTION_TYPE_SUBSTITUTION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: When HPE ProLiant Compute DL380 Gen12 Cooling Upgrade Enablement Kit (P81130-B21) is selected, the only supported heatsink is HPE ProLiant Compute DL3XX Gen12 High Performance Heat Sink Kit (P74787-B21).
- **Affected SKU**: `P81130-B21`
- **Required Dependency**: `P74787-B21`

#### C78. [DELTA_RAG_DEP_P81130-B21_P79555-B21_1790182000002] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: HPE ProLiant Compute DL380 Gen12 Cooling Upgrade Enablement Kit (P81130-B21) supports processors up to 270W at 30C or up to 350W at 27C (P79555-B21).
- **Affected SKU**: `P81130-B21`
- **Required Dependency**: `P79555-B21`

#### C79. [DELTA_RAG_DEP_P10115-B21_P72203-B21_1790182000003] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Rear OCP Slot B on DL380 Gen12 NC chassis is unpowered and logically disconnected by default; configuring an OCP NIC requires P72203-B21 cable kit to route PCIe lanes from CPU 1.
- **Affected SKU**: `P10115-B21`
- **Required Dependency**: `P72203-B21`

#### C80. [DELTA_RAG_DEP_P78279-B21_P74755-B21_1790182000004] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: HPE NS204i-u v2 480GB NVMe Hot Plug Boot Storage Device (P78279-B21) requires HPE ProLiant Compute DL380 Gen12 NS204i-u Rear Boot Device Enablement Kit (P74755-B21).
- **Affected SKU**: `P78279-B21`
- **Required Dependency**: `P74755-B21`

#### C81. [DELTA_CLIC_RULE_81392332_H200_16PIN_P93055-B21] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Rule 81392332: P56072-B21 requires to be ordered with supported 8-pin GPUs. H200 NVL mandates P93055-B21 HPE GPU 16-pin Power Cable Kit.
- **Affected SKU**: `S3U30C`
- **Required Dependency**: `P93055-B21`

#### C82. [DELTA_CLIC_RULE_81394885_SECONDARY_RISER_25C_AMBIENT] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Rule 81394885: 1 qty 8SFF Cage + Processor above 270W + Air Cooled: H200 NVL (S3U30C) is not supported on Primary Riser (20C-30C) or Tertiary Riser (20C-30C). Supported on Secondary Riser only with <= 25C ambient temperature.
- **Affected SKU**: `S3U30C`
- **Required Dependency**: `P51083-B21`

#### C83. [DELTA_CLIC_RULE_81393803_STORAGE_CABLE_P76453-B21] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Rule 81393803: P73282-B21 with 8SFF x1 Cage (P75740-B21) and 1 qty MR416i-p (P47777-B21) requires 1 qty of P76453-B21 (2SFF B1/ 8SFF x1 PCIe Cable).
- **Affected SKU**: `P75740-B21`
- **Required Dependency**: `P76453-B21`

#### C84. [LEARN_DL380_GEN12_OEM_DEFAULT_20260930] DL380_Gen12 — WORKFLOW_OEM_SELECTION_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: OCA observed P77819-B21 as OEM DL380 Gen12 CTO. Preserve it in scoped discovery; a generic commercial DL380 Gen12 request must not automatically choose OEM. P73282-B21 was observed as commercial CTO, not certified as a permanent substitute or live-price guarantee.
- **Affected SKU**: `P77819-B21`

#### C85. [LEARN_DL380_GEN12_RUNTIME_DISCOVERY_20260930] DL380_Gen12 — WORKFLOW_RUNTIME_DISCOVERY_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Catalog absence is not proof of unsupported hardware. Investigate missing and conditional BOQ SKUs on the exact base and owning configuration, with the requested quantities and environmental state. Hidden presence establishes observation only. Revalidate each changed manifest in CLIC; a runtime plan does not establish acceptance.

#### C86. [LEARN_DL380_GEN12_COVERAGE_BOUNDARY_20260930] DL380_Gen12 — WORKFLOW_CAPTURE_COVERAGE_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Chassis discovery does not establish traversal. Current automated conditional capture covers hidden DOM and ambient probes; other selector combinations and all-base coverage remain unverified. Unknown recommendation, price and variant capability stay unknown. Do not retire prior NotebookLM sources before replacement verification.

#### C87. [LEARN_DL380_GEN12_H200_OBSERVED_STATES_20261001] DL380_Gen12 — WORKFLOW_VENDOR_OBSERVATION_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Live OCA evidence on commercial DL380 Gen12 base P73282-B21: S3U30C NVIDIA H200 NVL 141GB was already present in the DOM at selected 30C tracking SKU P79552-B21, but hidden and marked unavailable. Vendor text says H200 NVL and 30C cannot be selected together. At selected 27C tracking SKU P79555-B21 the unavailable flag and restriction disappeared; the collapsed section still hid the row visually. Original 30C was restored. This is two observed selector states, not proof of every lower temperature or final CLIC build acceptance. Evidence: evidence/scraping_review/h200_at_30c_before.json and h200_at_27c.json. Do not compile the 30C prohibition as an allowed <=30C gate.
- **Affected SKU**: `S3U30C`

#### C88. [LEARN_CHASSIS_THREE_TIER_DOMAIN_CLASSIFICATION_20261012] DL380_Gen12 — WORKFLOW_CHASSIS_CLASSIFICATION_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Specialty hardware categories (SAN switches like SN3600B, fabric interconnect modules like SY100Gb, and tape libraries like MSL) do not contain server compute components (CPU, Memory, Power). Synergy compute blades (SY480 Gen12) require CPU and Memory, but Power supplies are governed at the Synergy 12000 enclosure frame level. Freshness guards must evaluate compliance using a three-tier domain discriminator rather than enforcing server categories on all products (INV-158).

#### C89. [LEARN_UNIVERSAL_ACCESSORY_SCOPE_ISOLATION_20261012] DL380_Gen12 — WORKFLOW_SCOPE_ISOLATION_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Passive accessories such as DC lug terminal kits (P36877-B21), power cords, and rail kits are architecture-invariant and span multiple product generations. They must be registered in APPROVED_UNIVERSAL_POLICY_SKUS in product_scope.js to prevent false-positive cross-generation isolation quarantines by the drift engine (INV-159).
- **Affected SKU**: `P36877-B21`

#### C90. [LEARN_WEBLOGIC_EXPAND_SECTIONS_COST_CAPTURE_20261012] DL380_Gen12 — WORKFLOW_DOM_EXTRACTION_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: WebLogic OCA table expansion in cdp.js must explicitly toggle show_cost alongside show_price and trigger change events on all discovered showmore inputs. Omitting show_cost prevents cost column rendering, leaving tabular price-breakdown structures incomplete (INV-161).

#### C91. [DELTA_DL380_GEN12_CPU_PARITY_AND_SST_CP_LEARNING] DL380_Gen12 — PROCESSOR_ARCHITECTURAL_MATCH_STRATEGY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: When modernizing Cascade Lake Xeon Gold 6258R (28c, 2.7GHz, 38.5MB L3, 205W), Xeon 6530P (32c, 2.3GHz, 144MB L3, 225W, $4,830 USD) provides superior per-core IPC (+22%) and total throughput, with Intel Speed Select (SST-CP) supporting 2.8GHz Compute Mode. If customer mandates strict base clock >=2.7GHz without BIOS profile dependencies, Xeon 6738P (32c, 2.9GHz, 144MB L3, 270W, $7,305 USD) provides strict numerical parity (+188.5k USD delta across 9 servers). Evaluator must present both tracks with transparent trade-offs for customer negotiation (INV-184).
- **Affected SKU**: `P74571-B21`
- **Required Dependency**: `P74577-B21`

#### C92. [DELTA_DL380_GEN12_MEMORY_SYMMETRICAL_CHANNEL_LEARNING] DL380_Gen12 — MEMORY_CHANNEL_POPULATION_STRATEGY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: On Intel Xeon 6 (8 memory channels per CPU, 16 channels dual socket), legacy 6-channel memory capacities (such as 1,152 GB achieved via 12x 64GB + 12x 32GB on Gen10) cannot be satisfied with 12 DIMMs without leaving 2 channels unpopulated per CPU and suffering a 25% throughput penalty. Symmetrical population mandates 16 DIMMs (1DPC) or 32 DIMMs (2DPC). Present 1,536 GB (16x 96GB P69729-F21 @ 6400 MT/s) for full 1DPC capacity surplus, or 1,024 GB (16x 64GB P69728-F21 @ 6400 MT/s) for CapEx optimization with documented 128GB delta (INV-184).
- **Affected SKU**: `P69728-F21`
- **Required Dependency**: `P69729-F21`

#### C93. [DELTA_DL380_GEN12_HEATSINK_TIER_RIGHT_SIZING_INV208] DL380_Gen12 — THERMAL_HEATSINK_RIGHT_SIZING_RULE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: On HPE ProLiant DL380 Gen12 (P73282-B21), processors with 185W < TDP <= 270W (such as Intel Xeon 6530P 225W P74571-B21) are 100% thermally certified with P74792-B21 (HPE ProLiant Compute DL380 Gen12 2U High Performance Heat Sink Kit, 316.00 USD list per socket, max 2 per 2P server = 632.00 USD/server, 4-day lead time). Do not over-provision P74794-B21 (2U Max Performance Heat Sink Kit, 624.00 USD list per dual-socket server, max 1 per server, 45-day lead time), which is only required for >270W extreme TDP processors (275W-350W+) or dense GPU workloads. Substituting 1x P74794-B21/server (624.00 USD) with 2x P74792-B21/server (632.00 USD) has virtually identical cost (+8.00 USD/server or +72.00 USD across 9 servers) while slashing cooling lead time by 41 days from 45 days down to 4 days (INV-208).
- **Affected SKU**: `P74794-B21`
- **Required Dependency**: `P74792-B21`

#### C94. [DELTA_DL380_GEN12_COM_R7A11AAE_VS_S1A05A_SEPARATION_INV207] DL380_Gen12 — MANAGEMENT_LICENSE_VS_FIO_TOKEN_SEPARATION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: On DL380 Gen12 CTO builds (P73282-B21), R7A11AAE (HPE Compute Ops Management Standard 3-year Upfront SaaS, $515.00 USD) satisfies CLIC Rule 81322276 for portal orderability, whereas S1A05A ($0.00 USD FIO cloud pre-claim token) is optional and safe to omit (INV-207).
- **Affected SKU**: `S1A05A`
- **Required Dependency**: `R7A11AAE`

#### C95. [LEARN_DL380_GEN12_WORKFLOW_DUAL_PUBLICATION_ADVISORY_20261029] DL380_Gen12 — WORKFLOW_DUAL_PUBLICATION_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Publish and read back the human Drive workbook separately from the complete semantic Markdown source in NotebookLM. Google Sheets is not a supported NotebookLM Drive source. A recent upload timestamp does not refresh old vendor observations.

#### C96. [LEARN_DL380_GEN12_WORKFLOW_SOURCE_RETIREMENT_ADVISORY_20261029] DL380_Gen12 — WORKFLOW_SOURCE_RETIREMENT_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Verify exact-product replacement content, indexing and source-restricted grounded canary, then commit trust metadata before removing only managed stale catalog snapshots. Preserve QuickSpecs, separate learnings, shared enclosure/fabric sources and unrelated documents. Inventory absence is not authority to remove another product source.

#### C97. [LEARN_DL380_GEN12_WORKFLOW_CLOUD_LEARNING_REVIEW_ADVISORY_20261029] DL380_Gen12 — WORKFLOW_CLOUD_LEARNING_REVIEW_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Preserve retrieved cloud learning documents locally with their source IDs. Treat prose claims as candidates pending dated vendor evidence; resolve contradictions before promoting hardware dependencies. Conflicting quantity claims require dated evidence for this exact product and selector state.

#### C98. [LEARN_DL380_GEN12_SUPPORT_PRICING_UPDATE_20261102] DL380_Gen12 — SUPPORT_PRICING_UPDATE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: HPE DL380 Gen12 Support (HU4B2A30C4V, under HU4B2A3 3Y Tech Care Basic) list price updated in November 2026 OCA catalog from $5,509.00 to $5,784.00 USD (+$275.00 / +4.99% per server node). 12-node cluster extended price increases from $66,108.00 to $69,408.00 USD (+$3,300.00).
- **Affected SKU**: `HU4B2A30C4V`
- **Required Dependency**: `P73282-B21`

#### C99. [LEARN_DL380_GEN12_CLIC_STATUS_CLEARANCE_20261102] DL380_Gen12 — CLIC_STATUS_CLEARANCE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Portal validation warnings on HPE ProLiant DL380 Gen12 SFF NC CTO Server (P73282-B21) and HPE Compute Ops Management Standard 3-year SaaS (R7A11AAE) have cleared to clean/pass in latest OCA engine release.
- **Affected SKU**: `P73282-B21`

#### C100. [LEARN_DL380_GEN12_LEAD_TIME_AND_LIFECYCLE_20261102] DL380_Gen12 — LEAD_TIME_AND_LIFECYCLE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: DL380 Gen12 CTO base chassis (P73282-B21) availability lead time improved to 14 days (down from 30 days). Xeon 6787P CPU (P73837-B21) is 10 days; 8SFF drive cage (P75740-B21) is 14 days. 64GB DDR5-6400 Smart FIO memory (P69728-F21) discontinuation date extended to 2030-06-30 (+27 months).
- **Affected SKU**: `P73282-B21`

#### C101. [LEARN_DL380_GEN12_WORKFLOW_NORMATIVE_LANGUAGE_PRECISION_20261107] DL380_Gen12 — WORKFLOW_NORMATIVE_LANGUAGE_PRECISION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: All agent skill directives, checklists, and execution handoffs must adhere to strict RFC-2119 normative vocabulary (MUST, MUST NOT, SHALL, SHOULD, MAY). Ambiguous hedge words (appropriate, as needed, etc., consider, typically, usually, generally, if possible, try to) are strictly prohibited in operational procedures to eliminate agent hesitation and non-deterministic loops.

#### C102. [LEARN_DL380_GEN12_WORKFLOW_MODULAR_SKILL_TOKEN_OPTIMIZATION_20261107] DL380_Gen12 — WORKFLOW_MODULAR_SKILL_TOKEN_OPTIMIZATION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Monolithic skills exceeding 25KB must be modularized into a concise core execution SKILL.md (<=250 lines) plus dedicated references/ documentation files. This preserves agent prompt token budgets, accelerates model reasoning, and prevents guardrail context window exhaustion.

#### C103. [LEARN_DL380_GEN12_WORKFLOW_UNIVERSAL_CC30_AND_QUALITY_CEILING_20261107] DL380_Gen12 — WORKFLOW_UNIVERSAL_CC30_AND_QUALITY_CEILING
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Every function across all repository scripts and test fixtures must strictly comply with the universal cyclomatic complexity ceiling <= 30 (INV-229, INV-230). All modified code must pass oxlint with zero warnings, maintain a clean DAG with zero circular dependencies, and preserve non-empty test discovery.

#### C104. [LEARN_DL380_GEN12_WORKFLOW_SPECIALIZED_ARCHITECTURAL_DISPATCH_20261107] DL380_Gen12 — WORKFLOW_SPECIALIZED_ARCHITECTURAL_DISPATCH
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Incoming presales inquiries must be classified and dispatched by presales-query-router across 34 specialized skill tracks, including code-quality-gate, self-correction-counterfactual, presales-clearance-strategy, and turnkey-racking-cabling, with zero ad-hoc script generation.

#### C105. [LEARN_REASONING_COUNTERFACTUAL_HYPOTHESIS_SEMANTICS_20261108] DL380_Gen12 — WORKFLOW_HYPOTHESIS_SEMANTICS_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Hardware repair proposals generated during counterfactual repair are unvalidated delta hypotheses (PROPOSED_UNVALIDATED), never certifications of 100% buildability prior to whole-candidate re-evaluation across physical, topological, customer-intent, and vendor portal acceptance gates (INV-231).

#### C106. [LEARN_REASONING_ARITHMETIC_PREDICATE_INFEASIBILITY_20261108] DL380_Gen12 — WORKFLOW_PREDICATE_INFEASIBILITY_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: When physical demand exceeds available catalog capacity (e.g. required wattage exceeds maximum rated PSU candidate, or socket TDP exceeds available heatsink rating), the engine must emit REPAIR_INFEASIBLE with remaining deficits quantitatively disclosed, rather than fabricating out-of-catalog hardware quantities or assuming unevidenced vendor support (INV-231).

#### C107. [LEARN_REASONING_EXACT_CATALOG_SCOPED_DISCOVERY_20261108] DL380_Gen12 — WORKFLOW_CATALOG_SCOPED_DISCOVERY_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Repair discovery must select options exclusively from the verified target product catalog snapshot. Input electrical conditions (AC vs -48VDC) and customer SLA/duration requirements must be preserved, defaulting to product-qualified 3-year Basic support only when customer requirements leave support unspecified (INV-231).

#### C108. [LEARN_REASONING_EVIDENCE_VS_HARDWARE_DECOUPLING_20261108] DL380_Gen12 — WORKFLOW_EVIDENCE_DECOUPLING_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Acceptance blockers regarding evidence deficits (missing document grounding, citations, or portal session receipts) must evaluate to ACTION_REQUIRED_EVIDENCE_PROBE with zero hardware deltas, and must never invent fake hardware SKUs or convert evidence failures into hardware additions (INV-231).

#### C109. [LEARN_REASONING_CRYPTOGRAPHIC_TIER3_RECEIPT_VERIFICATION_20261108] DL380_Gen12 — WORKFLOW_TIER3_RECEIPT_VERIFICATION_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Tier 3 Official Vendor Acceptance strictly requires an authentic cryptographic session receipt re-verified from disk matching the exact candidate manifest, scope, and fresh timestamp (<24h). Truthy boolean flags or bare IDs evaluate to Tier 0 or Tier 1 (INV-201, Gate B19, INV-231).

#### C110. [LEARN_REASONING_APPEND_ONLY_KNOWLEDGE_RETRACTION_20261108] DL380_Gen12 — WORKFLOW_APPEND_ONLY_RETRACTION_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Falsified, erroneous, or superseded learned rules must be deactivated across all registry arrays (chassis deltas, wrapped rules, master registries) with an append-only decision audit trail (active: false, decision: RETRACTED or SUPERSEDED) without deleting historical evidence records (INV-231).

#### C111. [DELTA_SYNERGY_GEN12_FC_LICENSE_PROHIBITION] SY480_Gen12 — EXCLUSION_UNBUILDABLE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: On HPE Synergy 12000 Frames (P51174-B21) populated solely with SY480 Gen12 compute nodes (P68217-B21), selecting Virtual Connect Fibre Channel upgrade licenses (R3P67A FIO LTU or R3P67AAE BTO E-LTU) is strictly forbidden and triggers CLIC Rules 81410905 and 81314323 (UNBUILDABLE CONFIGURATION: OVERRIDE REQUIRES FACTORY APPROVAL). SY480 Gen12 compute nodes route dedicated SAN traffic via Mezzanine 1 (P68131-B21 64Gb FC HBA) directly to Brocade 64Gb FC Switch Modules (P77653-B21) in Bays 1 & 4. Fibre Channel port expansion must be licensed via Brocade 8-port upgrade E-LTU (Q2E58AAE). Virtual Connect SE 100Gb F32 modules (867796-B21) in Bays 3 & 6 are dedicated to 25G/50G/100G Ethernet (via P64724-B21 adapter in Mezzanine 3), with no FCoE path on Gen12.
- **Affected SKU**: `R3P67A`
- **Required Dependency**: `Q2E58AAE`

#### C112. [DELTA_SYNERGY_FIO_VS_ELTU_STANDALONE_ORDERING] SY480_Gen12 — STANDALONE_ORDERING_TAXONOMY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: R3P67A is a Factory Integrated Option (FIO LTU) ending in 'A', which strictly requires sub-iteming under a factory CTO chassis base (P51174-B21), triggering CLIC Rules 81013168 and 81125904 ('must be ordered as a sub-item to the Base') if quoted standalone. If a customer procurement contract mandates this 32Gb FC license, it CANNOT be fulfilled using R3P67A. It must be ordered as R3P67AAE (BTO Electronic License / E-LTU) placed in a completely separate standalone software quote (new UCID) where no P51174-B21 chassis or Gen12 compute nodes exist, bypassing both Rule 81125904 and Rule 81410905.
- **Affected SKU**: `R3P67A`
- **Required Dependency**: `R3P67AAE`

#### C113. [DELTA_SYNERGY_MULTI_ORDER_ADHOC_CONTAINER_PARTITIONING] SY480_Gen12 — MULTI_ORDER_PARTITIONING_PATTERN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: When a multi-frame Synergy deployment (e.g. 2 frames, 24 nodes) is partitioned into separate commercial orders (Option B): (1) Order 2 (Frame 2) is structured as a clean hardware clone with zero loose cables, zero loose transceivers, and zero unpack services; (2) Order 1 (Frame 1) hosts a dedicated Adhoc container carrying 100% of all loose physical connectivity for both frames (DAC cables: 487655-B21 10G, 845406-B21 100G; AOC cables: 845410-B21 100G; fiber: QK734A OM4; transceivers: 455883-B21 10G SFP+ SR, 845398-B21 25G SFP28 SR, 841716-B21 40G QSFP+ BiDi) totaling $96,236.00 list; (3) Embedded switch licenses (Q2E58AAE Brocade 8-port upgrade E-LTU) must NEVER be lumped into Adhoc—they must be split evenly inside the physical switch modules (4 in Frame 1, 4 in Frame 2) to preserve 1:1 hardware module licensing integrity; (4) Tech Care Basic support (HU4B2A3) must be preserved 1:1 on both frames ($46,156 each) to satisfy CLIC Rules 99916598/99916599.
- **Affected SKU**: `P51174-B21`
- **Required Dependency**: `Q2E58AAE`

#### C114. [DELTA_SYNERGY_MULTI_FRAME_SPLIT_STARTUP_SIZING] SY480_Gen12 — MULTI_FRAME_SPLIT_STARTUP_FORMULA
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: When a multi-frame Synergy deployment (e.g. 2 frames, 24 nodes) is partitioned into separate commercial quotes/orders: (1) Frame 1 carries 1x HA124A1#5ZM (First Frame Onsite Startup, $16,742 USD); (2) Frame 2 carries 1x HA124A1#5ZQ (Additional Frame Onsite Startup, $4,627 USD), saving $12,115 USD vs duplicating First Frame; (3) Order 2 remarks must cross-reference Order 1's UCID (e.g. 5157071497-02) to satisfy automated CLIC Rule 81039677 order acceptance; (4) If frames are deployed as independent standalone islands (separate sites or unlinked OneView domains), both frames require HA124A1#5ZM; (5) Remote Startup (HA124A1#V0F) and Onsite Startup (HA124A1#5ZM) are strictly mutually exclusive and must never be combined.
- **Affected SKU**: `HA124A1`
- **Required Dependency**: `HA124A1#5ZM`

#### C115. [LEARN_SY480_GEN12_WORKFLOW_DUAL_PUBLICATION_ADVISORY_20261029] SY480_Gen12 — WORKFLOW_DUAL_PUBLICATION_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Publish and read back the human Drive workbook separately from the complete semantic Markdown source in NotebookLM. Google Sheets is not a supported NotebookLM Drive source. A recent upload timestamp does not refresh old vendor observations.

#### C116. [LEARN_SY480_GEN12_WORKFLOW_SOURCE_RETIREMENT_ADVISORY_20261029] SY480_Gen12 — WORKFLOW_SOURCE_RETIREMENT_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Verify exact-product replacement content, indexing and source-restricted grounded canary, then commit trust metadata before removing only managed stale catalog snapshots. Preserve QuickSpecs, separate learnings, shared enclosure/fabric sources and unrelated documents. Inventory absence is not authority to remove another product source.

#### C117. [LEARN_SY480_GEN12_WORKFLOW_CLOUD_LEARNING_REVIEW_ADVISORY_20261029] SY480_Gen12 — WORKFLOW_CLOUD_LEARNING_REVIEW_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Preserve retrieved cloud learning documents locally with their source IDs. Treat prose claims as candidates pending dated vendor evidence; resolve contradictions before promoting hardware dependencies. Conflicting quantity claims require dated evidence for this exact product and selector state.

#### C118. [LEARN_SY480_GEN12_128GB_MEMORY_ERROR_CLEARED_20261102] SY480_Gen12 — CLIC_ERROR_RESOLUTION_CERTIFIED
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: CRITICAL BUILDABILITY BREAKTHROUGH: HPE 128GB (1x128GB) Dual Rank x4 DDR5-6400 CAS-52-52-52 Smart FIO Memory Kit (P69730-F21) previously triggered a blocking validation Error in CLIC on SY480 Gen12 compute modules. In November 2026 OCA release, this validation Error is fully resolved and cleared to clean/pass. High-density 128GB memory configurations (up to 384 kits per frame across 12 nodes, 49.15TB total RAM) are now 100% certified buildable. Discontinued date extended to 2030-06-30.
- **Affected SKU**: `P69730-F21`
- **Required Dependency**: `P51174-B21`

#### C119. [LEARN_SYNERGY_SUPPORT_PRICING_UPDATE_20261102] SY480_Gen12 — SUPPORT_PRICING_UPDATE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Synergy stack 3Y Tech Care Basic support rates adjusted by ~5%: Synergy 12000 Frame Support (HU4B2A3 WJN) updated to $779.00 (+$37.00); VC SE 100Gb F32 Module Support (HU4B2A3 Z1R) updated to $813.00 (+$39.00/unit); SY480 Gen12 Compute Node Support (HU4B2A30BT7) updated to $3,497.00 (+$167.00/node). Overall 12-node solution services list price adjusted from $62,898.00 to $65,017.00 USD (+$2,119.00).
- **Affected SKU**: `HU4B2A30BT7`

#### C120. [LEARN_SYNERGY_LEAD_TIME_AND_VALIDATION_20261102] SY480_Gen12 — LEAD_TIME_AND_VALIDATION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: HPE 960GB NVMe M.2 2280 PE9010 SSD (P80321-B21) factory lead time extended from 11 days to 30 days (+19 days). Synergy 12000 CTO Frame (P51174-B21) lead time is 13 days, and CLIC validation warnings have cleared to clean/pass.
- **Affected SKU**: `P80321-B21`

#### C121. [LEARN_SY100GB_F32_MODULE_WORKFLOW_DUAL_PUBLICATION_ADVISORY_20261029] SY100Gb_F32_Module — WORKFLOW_DUAL_PUBLICATION_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Publish and read back the human Drive workbook separately from the complete semantic Markdown source in NotebookLM. Google Sheets is not a supported NotebookLM Drive source. A recent upload timestamp does not refresh old vendor observations.

#### C122. [LEARN_SY100GB_F32_MODULE_WORKFLOW_SOURCE_RETIREMENT_ADVISORY_20261029] SY100Gb_F32_Module — WORKFLOW_SOURCE_RETIREMENT_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Verify exact-product replacement content, indexing and source-restricted grounded canary, then commit trust metadata before removing only managed stale catalog snapshots. Preserve QuickSpecs, separate learnings, shared enclosure/fabric sources and unrelated documents. Inventory absence is not authority to remove another product source.

#### C123. [LEARN_SY100GB_F32_MODULE_WORKFLOW_CLOUD_LEARNING_REVIEW_ADVISORY_20261029] SY100Gb_F32_Module — WORKFLOW_CLOUD_LEARNING_REVIEW_ADVISORY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Preserve retrieved cloud learning documents locally with their source IDs. Treat prose claims as candidates pending dated vendor evidence; resolve contradictions before promoting hardware dependencies. Conflicting quantity claims require dated evidence for this exact product and selector state.

#### C124. [LEARN_SY100GB_F32_MODULE_SUPPORT_PRICING_UPDATE_20261102] SY100Gb_F32_Module — SUPPORT_PRICING_UPDATE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: HPE Virtual Connect SE 100Gb F32 Module for Synergy Support (HU4B2A3 Z1R, under HU4B2A3 3Y Tech Care Basic) list price updated in November 2026 OCA catalog from .00 to .00 USD (+.00 / +5.04% per module).
- **Affected SKU**: `HU4B2A3 Z1R`
