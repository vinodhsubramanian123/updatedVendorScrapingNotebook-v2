# HPE Knowledge Registry — Local Audit Index

**Document Version**: `2.0.0` | **Generated**: `2026-09-17T17:52:24.125Z`  
**Scope**: Local governance index. This file is not a NotebookLM source; product notebooks receive independently scoped projections.  
**Total Verified Knowledge Deltas**: `68` (`0` Universal + `0` Family/Gen + `68` Chassis Specific)  

---

## Scoped Knowledge Delta Inventory

### 1. [DELTA_DL145_GEN11_AMD_EPYC_8004] DL145_Gen11 — PROCESSOR_FAMILY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: DL145 Gen11 is single-socket AMD EPYC 8004 only. No dual-socket configurations supported.
- **Affected SKU**: `P71964-B21`

### 2. [DELTA_DL145_GEN11_4EDSFF_CAGE] DL145_Gen11 — DRIVE_CAGE_FORMAT
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: DL145 Gen11 uses EDSFF E3.S form factor drives only. Standard SFF/LFF drives are incompatible.
- **Affected SKU**: `P71985-B21`
- **Required Dependency**: `P77271-B21`

### 3. [DELTA_DL145_GEN11_PSU_PROFILE] DL145_Gen11 — PSU_WATTAGE_LIMIT
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: DL145 Gen11 supports maximum 1000W PSUs. 1600W/2400W PSUs are physically incompatible.
- **Affected SKU**: `P71964-B21`
- **Required Dependency**: `P54290-B21`

### 4. [DELTA_DL145_GEN11_EXTENDED_TEMP] DL145_Gen11 — EXTENDED_AMBIENT_TRACKING
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: DL145 Gen11 edge deployments use P73021-B21 for extended -5C to 45C ambient temperature tracking.
- **Affected SKU**: `P71964-B21`
- **Required Dependency**: `P73021-B21`

### 5. [DELTA-1787856163365] DL380_Gen11 — RULE
- **Scope**: `FAMILY_GEN`
- **Rule**: If PORTAL is present, P52534-B21 is mandatory.
- **Affected SKU**: `PORTAL`
- **Required Dependency**: `P52534-B21`

### 6. [DELTA-1787856163549] DL380_Gen11 — RULE
- **Scope**: `UNIVERSAL_VENDOR`
- **Rule**: If PORTAL is present, P64707-B21 is mandatory.
- **Affected SKU**: `PORTAL`
- **Required Dependency**: `P64707-B21`

### 7. [DELTA-1787856163672] DL380_Gen11 — RULE
- **Scope**: `FAMILY_GEN`
- **Rule**: Portal validation flagged restriction on PORTAL.
- **Affected SKU**: `PORTAL`

### 8. [DELTA-1787856163759] DL380_Gen11 — RULE
- **Scope**: `FAMILY_GEN`
- **Rule**: If PORTAL is present, P58335-B21 is mandatory.
- **Affected SKU**: `PORTAL`
- **Required Dependency**: `P58335-B21`

### 9. [DELTA_RAG_CARRYOVER_P48183-B21_1787856180158] DL380_Gen11 — CARRY_OVER_VALIDATED
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: P48183-B21`)** [cite: 250] is fully supported
- **Affected SKU**: `P48183-B21`

### 10. [DELTA_CLIC_81354632_DL380_GEN11] DL380_Gen11 — PHYSICAL_ATTACH_REQUIREMENT
- **Scope**: `FAMILY_GEN`
- **Rule**: If P48832-B21 (Tri-Mode Splitter Cable) is selected, P48814-B21 (8SFF U.3 Premium Cage) is mandatory.
- **Affected SKU**: `P48832-B21`
- **Required Dependency**: `P48814-B21`

### 11. [DELTA_CLIC_81354652_DL380_GEN11] DL380_Gen11 — PHYSICAL_POWER_ENABLEMENT
- **Scope**: `FAMILY_GEN`
- **Rule**: If P02377-B21 / P01366-B21 (Capacitor/Battery) is selected, P48918-B21 (Storage Controller Enablement Cable Kit) is mandatory.
- **Affected SKU**: `P02377-B21`
- **Required Dependency**: `P48918-B21`

### 12. [DELTA_CLIC_81355854_DL380_GEN11] DL380_Gen11 — MUTUAL_EXCLUSIVITY
- **Scope**: `FAMILY_GEN`
- **Rule**: P51911-B21 and P48830-B21 cannot be selected together. Retain P48830-B21.
- **Affected SKU**: `P51911-B21`
- **Required Dependency**: `P48830-B21`

### 13. [DELTA_CLIC_81016755_DL380_GEN11] DL380_Gen11 — RISER_SLOT_ENABLEMENT
- **Scope**: `FAMILY_GEN`
- **Rule**: When 5+ PCIe cards are installed, P56073-B21 Primary Cable Kit is mandatory for Primary Riser Slot 1.
- **Affected SKU**: `P48803-B21`
- **Required Dependency**: `P56073-B21`

### 14. [DELTA_CLIC_EU_LOT9_P35876_DL380_GEN11] DL380_Gen11 — REGULATORY_ENABLEMENT
- **Scope**: `FAMILY_GEN`
- **Rule**: When ordering Platinum PSUs (P38997-B21) on high-draw dual-socket configurations, P35876-B21 (CE Mark Removal Kit) is required for non-EU deployment, or upgrade to Titanium PSUs (P44712-B21).
- **Affected SKU**: `P38997-B21`
- **Required Dependency**: `P35876-B21`

### 15. [DELTA_RAG_DEP_P02377-B21_P48918-B21_1787913302880] DL380_Gen11 — DEPENDENCY_CHAIN
- **Scope**: `FAMILY_GEN`
- **Rule**: P02377-B21` or `P01366-B21` **mandates the inclusion of `P48918-B21
- **Affected SKU**: `P02377-B21`
- **Required Dependency**: `P48918-B21`

### 16. [DELTA_RAG_DEP_P58335-B21_P48918-B21_1787913632019] DL380_Gen11 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: P58335-B21`)** with the **Smart Storage Hybrid Capacitor (`P02377-B21`)** strictly requires `P48918-B21
- **Affected SKU**: `P58335-B21`
- **Required Dependency**: `P48918-B21`

### 17. [DELTA_RAG_DEP_write-cach_P48918-B21_1787915281069] DL380_Gen11 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: write-cache backup for `P58335-B21`; requires enablement cable **`P48918-B21
- **Affected SKU**: `write-cach`
- **Required Dependency**: `P48918-B21`

### 18. [DELTA_DL380A_GEN12_DRIVE_CAGE_EXCLUSIVITY] DL380a_Gen12 — STORAGE_COLLISION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: DL380a prohibits mixing 4SFF cage P74710-B21 and 4EDSFF cage P74712-B21.
- **Affected SKU**: `P74710-B21`

### 19. [DELTA_DL380A_GEN12_DUAL_CPU_HOMOGENEOUS] DL380a_Gen12 — PROCESSOR_POPULATION
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: DL380a Gen12 requires two identical processor models; single-processor and mixed-processor configurations are unsupported.
- **Affected SKU**: `P76706-B21`

### 20. [DELTA_DL380A_GEN12_GPU_PSU_COUNT_MATRIX] DL380a_Gen12 — POWER_REDUNDANCY
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Use exactly five power supplies for 2DW/4DW GPU configurations and eight for 8DW/10DW; H100/H200 NVL supports 2400W P67252-B21 or 3200W P67248-B21 Titanium supplies, without mixing wattages.
- **Affected SKU**: `P76706-B21`

### 21. [DELTA_DL380_GEN12_NO_DRIVE_BYPASS] DL380_Gen12 — STORAGE_OVERRIDE
- **Scope**: `FAMILY_GEN`
- **Rule**: When 873763-B21 is present, bypass physical drive cage, storage controller, and battery minimums.
- **Affected SKU**: `873763-B21`

### 22. [DELTA_DL380_GEN12_LOCALIZATION_GATE] DL380_Gen12 — LOCALIZATION_GATE
- **Scope**: `FAMILY_GEN`
- **Rule**: If Gen12 CTO base chassis is selected, P73325-B21 is mandatory for portal buildability.
- **Affected SKU**: `P73282-B21`
- **Required Dependency**: `P73325-B21`

### 23. [DELTA_DL380_GEN12_COM_SAAS_MANDATE] DL380_Gen12 — MANAGEMENT_LICENSING
- **Scope**: `FAMILY_GEN`
- **Rule**: Gen12 requires exactly 1 management SaaS license (R7A11AAE). Remove redundant BD505A when R7A11AAE is selected.
- **Affected SKU**: `P73282-B21`
- **Required Dependency**: `R7A11AAE`

### 24. [DELTA_DL380_GEN12_LOT9_CE_BYPASS] DL380_Gen12 — POWER_BYPASS
- **Scope**: `FAMILY_GEN`
- **Rule**: If Platinum PSUs are selected on Gen12, P35876-B21 clears EU Lot 9 CE prompts.
- **Affected SKU**: `P38995-B21`
- **Required Dependency**: `P35876-B21`

### 25. [DELTA_DL380_GEN12_25C_AMBIENT_TRACKING] DL380_Gen12 — THERMAL_TRACKING
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: P79558-B21 tracks 25C ambient baseline for Gen12 chassis.
- **Affected SKU**: `P73282-B21`
- **Required Dependency**: `P79558-B21`

### 26. [DELTA_DL380_GEN12_HIGH_TDP_COOLING] DL380_Gen12 — COOLING_MANDATE
- **Scope**: `FAMILY_GEN`
- **Rule**: CPUs > 185W TDP mandate High-Performance Fan Kit P48820-B21 and High-Performance Heatsink P74792-B21.
- **Affected SKU**: `P74507-B21`
- **Required Dependency**: `P48820-B21`

### 27. [DELTA_DL380_MISSING_SUPPORT_CONTRACT] DL380_Gen12 — DEPENDENCY
- **Scope**: `ProLiant/Gen12/DL380_Gen12`
- **Rule**: Every HPE ProLiant DL380 Gen12 server (P73282-B21) requires a hardware maintenance support contract. Common customer error: quoting software licenses (P8B31A OneView) while omitting hardware warranty (HU4B2A30C4V 3Y Tech Care Basic at ,509/unit). The BOQ evaluator must flag any DL380 Gen12 config that has 0 support units against N physical servers.
- **Affected SKU**: `HU4B2A30C4V`
- **Required Dependency**: `P73282-B21`

### 28. [DELTA-1787939298644] DL380_Gen12 — RULE
- **Scope**: `FAMILY_GEN`
- **Rule**: Portal validation flagged restriction on P76453-B21.
- **Affected SKU**: `P76453-B21`

### 29. [DELTA-1786705957681] DL380_Gen12 — RULE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: If P73282-B21 is present, P73282-B21 is mandatory.
- **Affected SKU**: `P73282-B21`
- **Required Dependency**: `P73282-B21`

### 30. [DELTA-1786705957757] DL380_Gen12 — RULE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: If P74573-B21 is present, P74573-B21 is mandatory.
- **Affected SKU**: `P74573-B21`
- **Required Dependency**: `P74573-B21`

### 31. [DELTA-1786705957802] DL380_Gen12 — RULE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: If P48820-B21 is present, P48820-B21 is mandatory.
- **Affected SKU**: `P48820-B21`
- **Required Dependency**: `P48820-B21`

### 32. [DELTA-1786705957846] DL380_Gen12 — RULE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: If P69728-B21 is present, P69728-B21 is mandatory.
- **Affected SKU**: `P69728-B21`
- **Required Dependency**: `P69728-B21`

### 33. [DELTA-1786705957894] DL380_Gen12 — RULE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: If P47777-B21 is present, P47777-B21 is mandatory.
- **Affected SKU**: `P47777-B21`
- **Required Dependency**: `P47777-B21`

### 34. [DELTA-1786705957933] DL380_Gen12 — RULE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: If P01366-B21 is present, P01366-B21 is mandatory.
- **Affected SKU**: `P01366-B21`
- **Required Dependency**: `P01366-B21`

### 35. [DELTA-1786705957977] DL380_Gen12 — RULE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: If P03178-B21 is present, P03178-B21 is mandatory.
- **Affected SKU**: `P03178-B21`
- **Required Dependency**: `P03178-B21`

### 36. [DELTA-1787939245188] DL380_Gen12 — RULE
- **Scope**: `FAMILY_GEN`
- **Rule**: Portal validation flagged restriction on P76450-B21.
- **Affected SKU**: `P76449-B21`
- **Required Dependency**: `P76450-B21`

### 37. [PREPROC-DELTA-1786781599909] DL380_Gen12 — PREPROCESSING_SPLIT_CONFIRMED
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Confirmed configuration variation reason 'WORKLOAD_NODE_PURPOSE' for config_1

### 38. [DELTA-1786880389958] DL380_Gen12 — RULE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Intel Xeon 6730P 250W CPU requires HPE ProLiant Compute DL380 Gen12 Performance Heat Sink Kit (P74792-B21) due to exceeding the 185W standard thermal envelope.
- **Affected SKU**: `P74573-B21`
- **Required Dependency**: `P74792-B21`
- **Engineering Rationale**: *Agentic Guardrail Loop derived from RAG/DB fact-check*

### 39. [DELTA-1786880394092] DL380_Gen12 — RULE
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: Intel Xeon 6730P 250W CPU requires HPE ProLiant High Performance Fan Kit (P48820-B21) because it exceeds the 240W system limit for standard chassis fans.
- **Affected SKU**: `P74573-B21`
- **Required Dependency**: `P48820-B21`
- **Engineering Rationale**: *Agentic Guardrail Loop derived from RAG/DB fact-check*

### 40. [DELTA-1787315096377] DL380_Gen12 — RULE
- **Scope**: `FAMILY_GEN`
- **Rule**: If P69728-F21 is present, DDR5-6400 is mandatory.
- **Affected SKU**: `P69728-F21`
- **Required Dependency**: `DDR5-6400`

### 41. [DELTA_RAG_FIO_P69728-B21_P69728-F21_1788145618089] DL380_Gen12 — OPTION_TYPE_SUBSTITUTION
- **Scope**: `FAMILY_GEN`
- **Rule**: | **`P69728-B21`** | HPE 64GB (1x64GB) Dual Rank x4 DDR5-6400 Smart Memory Kit | Memory / RDIMM (BTO) | **❌ BLOCKED in CTO (CLIC Suffix Violation)** | Standalone retail Build-to-Order (BTO) SKU [9, 15, 16]. Factory Configure-to-Order sessions enforce the rule: *"BTO products are not allowed in CTO B
- **Affected SKU**: `P69728-B21`
- **Required Dependency**: `P69728-F21`

### 42. [DELTA_RAG_DEP_P75740-B21_873763-B21_1788145618089] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `FAMILY_GEN`
- **Rule**: | **`P75740-B21`** | HPE DL3XX Gen12 8SFF x1 U.3 Tri-Mode Drive Cage Kit | Smart Chassis / Drive Cage | **✅ Valid Front Cage** | Installs an 8-bay SFF x1 U.3 Tri-Mode backplane into Box 1, 2, or 3 [19-23]. Installing this cage **clears the factory unbuildable drive-less chassis block** (which otherw
- **Affected SKU**: `P75740-B21`
- **Required Dependency**: `873763-B21`

### 43. [DELTA_RAG_DEP_P28586-B21_P75740-B21_1788145618089] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: | **`P28586-B21`** | HPE 1.2TB SAS 12G 10K SFF BC 3yr Wty HDD | Storage / SFF SAS HDD | **✅ Valid SAS HDD** | 12G SAS 10K RPM Basic Carrier (BC) drive [21, 28]. Supported inside the `P75740-B21` drive cage [21, 22]. Requires a dedicated hardware storage controller (`P47777-B21`) as the system board
- **Affected SKU**: `P28586-B21`
- **Required Dependency**: `P75740-B21`

### 44. [DELTA_RAG_DEP_P51083-B21_P74573-B21_1788145618091] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: | **`P51083-B21`** | HPE ProLiant DL380 Gen11 2U x16/x16/x16 Secondary Riser Kit | PCIe Expansion / Secondary Riser | **⚠️ BLOCKED if Single CPU (CPU 2 Dependency)** | Adds Slots 4, 5, and 6 (PCIe Gen5 x16) [35-37]. **QuickSpecs Mandate:** *"If Secondary OR Tertiary Riser is selected, then Second Pr
- **Affected SKU**: `P51083-B21`
- **Required Dependency**: `P74573-B21`

### 45. [DELTA_RAG_DEP_P47777-B21_P01366-B21_1788145618091] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `FAMILY_GEN`
- **Rule**: | **`P47777-B21`** | HPE MR416i-p Gen11 x16 Lanes 8GB Cache PCI SPDM Storage Controller | Storage Controller / Tri-Mode | **⚠️ Conditional Pass (Requires 3 Co-Dependencies)** | Stand-up PCIe card (-p) installed into a PCIe riser slot [30, 36, 39-41]. Requires **`P01366-B21`** (battery), **`P48918-B2
- **Affected SKU**: `P47777-B21`
- **Required Dependency**: `P01366-B21`

### 46. [DELTA_RAG_DEP_P28586-B21_P40430-B21_1788145618092] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `FAMILY_GEN`
- **Rule**: Connecting SAS hard drives (`P28586-B21` and `P40430-B21`) in the 8SFF drive cage (`P75740-B21`) to the MR416i-p storage controller (`P47777-B21`) requires the following physical and logical connections [60–65, 97–102, 129–134]:
- **Affected SKU**: `P28586-B21`
- **Required Dependency**: `P40430-B21`

### 47. [DELTA_RAG_DEP_P76453-B21_P75740-B21_1788145618092] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `FAMILY_GEN`
- **Rule**: 4.  **High-Speed Backplane Data Cable (`P76453-B21`):** Routing SAS/SATA/NVMe data lanes from Box 1 or Box 2 backplanes of the `P75740-B21` drive cage to the stand-up MR416i-p requires the **HPE ProLiant Compute DL380 Gen12 8SFF/2SFF UMB PCIe Cable Kit (`P76453-B21`)** [76, 80–85, 113, 117–122, 145,
- **Affected SKU**: `P76453-B21`
- **Required Dependency**: `P75740-B21`

### 48. [DELTA_RAG_FIO_P64707-B21_P69728-F21_1788148383105] DL380_Gen12 — OPTION_TYPE_SUBSTITUTION
- **Scope**: `FAMILY_GEN`
- **Rule**: | **`P64707-B21`** | HPE 64GB 2Rx4 DDR5-5600 Registered Memory | Memory / RDIMM | **❌ Incompatible Gen11 Memory** | Gen12 strictly mandates **DDR5-6400 Smart Memory** [200, 208–209, 240, 270]. DDR5-5600 is blocked. Factory CTO builds also mandate the **`-F21`** suffix (**`P69728-F21`**) [8-12]. |
- **Affected SKU**: `P64707-B21`
- **Required Dependency**: `P69728-F21`

### 49. [DELTA_RAG_DEP_P48818-B21_P38995-B21_1788148383108] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: | **`P48818-B21`** | HPE 800W Flex Slot Platinum Hot Plug Power Supply | Power Supplies | **❌ Invalid SKU & Lack of Redundancy** | The valid 800W Platinum SKU is **`P38995-B21`** [23, 24]. A single PSU provides no 1+1 redundancy [25]. (EU ErP Lot 9 requires 96% Titanium `P03178-B21`) [25, 26]. |
- **Affected SKU**: `P48818-B21`
- **Required Dependency**: `P38995-B21`

### 50. [DELTA_RAG_DEP_P75740-B21_P75741-B21_1788148383112] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `FAMILY_GEN`
- **Rule**: 2.  **Drive Cage Required:** You must add an **8SFF x1 U.3 Tri-Mode Drive Cage Kit (`P75740-B21`)** or an **8SFF x4 U.3 Drive Cage Kit (`P75741-B21`)** to Box 3 to physically mount the SSD [245–246, 256].
- **Affected SKU**: `P75740-B21`
- **Required Dependency**: `P75741-B21`

### 51. [DELTA_RAG_CARRYOVER_P47777-B21_1788459469422] DL380_Gen12 — CARRY_OVER_VALIDATED
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: | **P47777-B21** | HPE MR416i-p Gen11 Storage Controller | **✅ VALID** | This PCIe plug-in controller is fully supported on Gen12 as a carry-forward option [16]. However, it **requires the P48918-B21 enablement cable kit** to bridge SPDM security and sideband power to the Gen12 motherboard [16]. | *
- **Affected SKU**: `P47777-B21`

### 52. [DELTA_RAG_DEP_P01366-B21_P48918-B21_1788459469423] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `FAMILY_GEN`
- **Rule**: | **P01366-B21** | HPE 96W Smart Storage Battery | **✅ VALID** | Fully compatible battery to protect the MR416i-p's volatile write cache [16]. It **requires the P48918-B21 enablement cable** to physically connect to the controller's cache module [16]. | **P01366-B21** *(Keep)* |
- **Affected SKU**: `P01366-B21`
- **Required Dependency**: `P48918-B21`

### 53. [DELTA_RAG_DEP_P10180-B21_P72203-B21_1788459469424] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: | **P10180-B21** | Broadcom BCM5719 1Gb 4p BASE-T OCP3 NIC | **❌ OBSOLETE** | Legacy Gen11 part number [8]. It also **requires OCP enablement cable P72203-B21** to route high-speed PCIe lanes from CPU1 to rear OCP Slot B [25]. | **P51181-B21** (BCM5719 OCP3 NIC) and **P72203-B21** (OCP rear cable ki
- **Affected SKU**: `P10180-B21`
- **Required Dependency**: `P72203-B21`

### 54. [DELTA_RAG_DEP_P74573-B21_P48820-B21_1788461136463] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `FAMILY_GEN`
- **Rule**: • [DL380_Gen12 Catalog Rule] Category: Learned Feedback Rules > P74573-B21 | Constraint: learned (Intel Xeon 6730P 250W CPU requires HPE ProLiant High Performance Fan Kit (P48820-B21) because it exceeds the 240W system limit for standard chassis fans.)
- **Affected SKU**: `P74573-B21`
- **Required Dependency**: `P48820-B21`

### 55. [DELTA_RAG_DEP_P74573-B21_P74792-B21_1788461136464] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: • [DL380_Gen12 Catalog Rule] Category: Learned Feedback Rules > P74573-B21 | Constraint: learned (Intel Xeon 6730P 250W CPU requires HPE ProLiant Compute DL380 Gen12 Performance Heat Sink Kit (P74792-B21) due to exceeding the 185W standard thermal envelope.)
- **Affected SKU**: `P74573-B21`
- **Required Dependency**: `P74792-B21`

### 56. [DELTA-1788462981839] DL380_Gen12 — RULE
- **Scope**: `FAMILY_GEN`
- **Rule**: P10180-B21 is obsolete Gen11 SKU for DL380 Gen12; replaced by P51181-B21 with mandatory OCP rear cable kit P72203-B21.
- **Affected SKU**: `P10180-B21`
- **Required Dependency**: `P51181-B21`
- **Engineering Rationale**: *Agentic Guardrail Loop derived from RAG/DB fact-check*

### 57. [DELTA_RAG_DEP_P76453-B21_P48918-B21_1788463665182] DL380_Gen12 — DEPENDENCY_CHAIN
- **Scope**: `CHASSIS_SPECIFIC`
- **Rule**: 3.  **Storage Cable Integration:** The inclusion of `P76453-B21` is correct for routing PCIe lanes from SFF drive cages back to the PCIe slot [16]. However, the configurator will throw an error unless it sees the **Storage Controller Enablement Cable Kit (`P48918-B21`)** which is physically required
- **Affected SKU**: `P76453-B21`
- **Required Dependency**: `P48918-B21`

### 58. [DELTA_SYNERGY_FRAME_STARTUP_MATH] SY480_Gen12 — STARTUP_SERVICE_FORMULA
- **Scope**: `FAMILY_GEN`
- **Rule**: Onsite Frame Startup requires exactly 1x HA124A1#5ZM + (TotalFrames - 1)x HA124A1#5ZQ. Purge all HA124A1#V0F lines when onsite startup is selected.
- **Affected SKU**: `HA124A1`
- **Required Dependency**: `HA124A1#5ZM`

### 59. [DELTA_SYNERGY_VC_100GB_SUPPORT_ENTITLEMENT] SY480_Gen12 — HARDWARE_SUPPORT_1TO1
- **Scope**: `FAMILY_GEN`
- **Rule**: Qty of HU4B2A3#Z1R must exactly equal qty of 867796-B21 (VC SE 100Gb F32 Module).
- **Affected SKU**: `867796-B21`
- **Required Dependency**: `HU4B2A3#Z1R`

### 60. [DELTA_SYNERGY_COMPOSER2_SUPPORT_ENTITLEMENT] SY480_Gen12 — HARDWARE_SUPPORT_1TO1
- **Scope**: `FAMILY_GEN`
- **Rule**: Qty of HU4B2A3#Z1Q must exactly equal qty of 872957-B21 (Synergy Composer2 Management Appliance).
- **Affected SKU**: `872957-B21`
- **Required Dependency**: `HU4B2A3#Z1Q`

### 61. [DELTA_SYNERGY_BROCADE_FC_SUPPORT_ENTITLEMENT] SY480_Gen12 — HARDWARE_SUPPORT_1TO1
- **Scope**: `FAMILY_GEN`
- **Rule**: Qty of HU4B2A30BU5 must exactly equal qty of P77653-B21 (Brocade 64Gb FC Switch Module).
- **Affected SKU**: `P77653-B21`
- **Required Dependency**: `HU4B2A30BU5`

### 62. [DELTA_SYNERGY_COMPUTE_MODULE_SUPPORT_ENTITLEMENT] SY480_Gen12 — HARDWARE_SUPPORT_1TO1
- **Scope**: `FAMILY_GEN`
- **Rule**: Qty of HU4B2A30BT7 must exactly equal qty of P68217-B21 (HPE SY480 Gen12 Compute Module).
- **Affected SKU**: `P68217-B21`
- **Required Dependency**: `HU4B2A30BT7`

### 63. [DELTA_SYNERGY_WARRANTY_VS_STARTUP_DECOUPLING] SY480_Gen12 — DECOUPLING
- **Scope**: `Synergy/Gen12/SY480_Gen12`
- **Rule**: HPE Synergy quoting requires strict decoupling of two independent service domains: (1) HU4B2A3 — ongoing Point-of-Sale hardware maintenance (3Y Tech Care Basic, 9x5 NBD), decomposed per-subsystem (#WJN Frame, #Z1Q Composer2, #Z1R VC, 0BT7 Compute, 0BU5 Brocade); and (2) HA124A1 — one-time professional deployment/startup services (SOW-scoped). These are NOT interchangeable and must never be conflated in BOQ assembly.
- **Affected SKU**: `HA124A1`
- **Required Dependency**: `HU4B2A3`

### 64. [DELTA_SYNERGY_REMOTE_ONSITE_CONFLICT] SY480_Gen12 — EXCLUSION
- **Scope**: `Synergy/Gen12/SY480_Gen12`
- **Rule**: Remote startup (HA124A1#V0F) and Onsite startup (HA124A1#5ZM) are mutually exclusive delivery models for Synergy frame deployment. When Onsite is selected, all Remote startup lines MUST be purged to zero. Quoting both simultaneously creates SOW delivery scope conflicts that trigger CLIC Rule 81039677.
- **Affected SKU**: `HA124A1#V0F`
- **Required Dependency**: `HA124A1#5ZM`

### 65. [DELTA_OCA_RULE_81039677_CROSS_ICON_ATTRIBUTION] GLOBAL — DIAGNOSTIC
- **Scope**: `Universal`
- **Rule**: In multi-icon OCA solutions (Icon Separation mode), CLIC Rule 81039677 ("Installation and Startup must be quoted for ALL frames") attaches its error to Item 0100/01 — the first physical line of the entire solution BOM — even when the root cause is in a completely different icon container (e.g. Synergy Icon #2). Engineers must NEVER modify DL380 server lines to fix this error. Instead, trace to the Synergy icon Services → Lifecycle and fix startup placement and quantities there.
- **Affected SKU**: `P73282-B21`
- **Required Dependency**: `HA124A1#5ZM`

### 66. [DELTA_SYNERGY_ICON_ISOLATION_GUARDRAIL] SY480_Gen12 — ISOLATION
- **Scope**: `Synergy/Gen12/SY480_Gen12`
- **Rule**: When applying support services in OCA multi-icon solutions, NEVER check "Apply displayed install/support to all icons inside the solution". Always scope to "inside the Current Icon" only. This prevents Synergy frame support attributes from leaking into ProLiant rack server trees (or vice versa), which corrupts per-icon support decomposition and generates phantom entitlement mismatches.
- **Affected SKU**: `HU4B2A3`

### 67. [DELTA_OCA_SUPPORT_CACHE_FLUSH_PROTOCOL] GLOBAL — PROCEDURE
- **Scope**: `Universal`
- **Rule**: When OCA CLIC Rules 99916598/99916599 persist after correcting support quantities, the stale rules cache must be flushed: (1) Navigate to Icon container level → Services → set Support to "No Support" with TS5 and "Apply to all nodes inside Current Icon" checked → Save; (2) Dismiss advisory warning about minimum service requirement; (3) Re-apply via "Select Your Own" → filter 3 Years → select HU4B2A3 Tech Care Basic; (4) Set Install Level to "No Installation"; (5) Check "Apply displayed Install/Support level to all nodes inside Current Icon" → OK → Save. This forces OCA to regenerate all child support entitlements from scratch.
- **Affected SKU**: `HU4B2A3`

### 68. [DELTA_SYNERGY_STARTUP_PLACEMENT_HIERARCHY] SY480_Gen12 — PLACEMENT
- **Scope**: `Synergy/Gen12/SY480_Gen12`
- **Rule**: Synergy startup services (HA124A1#5ZM First Frame Onsite, HA124A1#5ZQ Additional Frame Onsite) must be placed ONLY at the Icon #2 container level under Services → Deployment Services → Install-Install and Start Up. They must NEVER be placed locally under individual "Synergy 12000 Frame #N" child items. Duplicate placement between icon container and child frames causes CLIC Rule 81039677 to fire against the first line item (typically DL380) in the solution BOM.
- **Affected SKU**: `HA124A1#5ZM`
- **Required Dependency**: `HA124A1#5ZQ`

