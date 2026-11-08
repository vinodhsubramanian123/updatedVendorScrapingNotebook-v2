# HPE DL380_Gen12 — Synchronized Catalog Knowledge

**Target Product**: `DL380_Gen12`

**Scope Identity**: `HPE/SERVER/ProLiant/Gen12/DL380_Gen12`

**Sync Timestamp**: 2026-11-08T11:16:35.931Z

**Total Verified SKUs**: `1128` (`605` Hardware + `523` Services)

**Total Synced KnowledgeDeltas**: `69`

This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.

---

## 🚀 Executive Delta & Recent Change Summary

| Category | Total SKUs | Added (Last Scrape) | Price Changed | Attribute Changed | Reinstated | Status |
|----------|------------|---------------------|---------------|-------------------|------------|--------|
| **Hardware Components** | 605 | 6 | 0 | 376 | 1 | **CERTIFIED** |
| **Support Services & SLAs** | 523 | 5 | 0 | 3 | 0 | **CERTIFIED** |
| **Total Portfolio** | **1128** | **11** | **0** | **379** | **1** | **ACTIVE** |

## 🌐 1. Universal Vendor Rules (HPE)

1. **[DELTA_UNIVERSAL_MULTI_ICON_ERROR_ATTRIBUTION]**: When Rule 81039677 occurs on multi-icon tenders, trace errors to individual child icon containers instead of modifying the root BOM item. *(Type: ERROR_DIAGNOSTIC_ATTRIBUTION)*
2. **[DELTA_UNIVERSAL_SUPPORT_TIER_ISOLATION]**: Configure support services independently per icon container. Never broadcast support attributes across diverse product families. *(Type: ICON_SUPPORT_ISOLATION)*
3. **[DELTA_UNIVERSAL_OCA_SUPPORT_CACHE_FLUSH]**: Historical service-selector workaround only: in an authenticated working OCA configuration with contradictory service selections, reselect services for the owning node and revalidate. It is not an expired-session recovery. If OCA displays encountered-a-problem, refresh/login from Partner Portal and launch One Config Advanced through Quick Links; never reload the failed OCA tab or remove services as a session fix. *(Type: SESSION_RECOVERY_PROTOCOL)*
4. **[OWNER_STANDARD_3Y_BASIC]**: Preserve explicit customer support term and tier in the closest rank; use 3-year Tech Care Basic only when unspecified or explicitly authorized. For this SN3600B BOQ the owner authorized 5-year Essential to 3-year Basic. Compare qualified fixed and flexible service options; disclose retention and preserve parent/suffix pairs. This commercial preference is not vendor qualification. *(Type: SUPPORT_POLICY)*
5. **[OWNER_ICON_SERVICE_ISOLATION]**: Select Services from Components for the owning icon, edit its dropdowns, and leave both apply-to-all icons and apply-to-all nodes off. Different icons retain their own SLA. *(Type: ICON_SUPPORT_ISOLATION)*
6. **[OWNER_OCA_EXPIRED_SESSION]**: When OCA says it encountered a problem, restart from Partner Portal refresh/login and open One Config Advanced through Quick Links. Do not reload the failed OCA session. Keep a Partner Portal tab before closing stale OCA so CDP does not disappear. This supersedes cache-flush advice for encountered-a-problem errors. *(Type: SESSION_RECOVERY_PROTOCOL)*
7. **[OWNER_CLOSEST_REQUIREMENT_RANK]**: Closest rank preserves customer requirements and makes only necessary compatibility/buildability changes. Budget alternatives disclose every deviation; do not silently reduce term, tier, capacity or resilience. Keep explicit owner overrides auditable against the original customer BOQ. *(Type: CUSTOMER_INTENT_POLICY)*
8. **[OWNER_COMPONENT_DOMAIN_ROUTING]**: Route by component role and exact product, never vendor or family alone. Synergy compute, fabric and frame use separate scopes. Resolve ownership before quantities. Validate each component and enclosure/bay, adapter/fabric, optical endpoints, shared power and per-icon SLA relationships; missing profiles remain NOT_EVALUATED and cannot inherit server defaults. Scraping completeness is not buildability certification. *(Type: COMPONENT_DOMAIN_ROUTING)*
9. **[GUARDRAIL_TRANSPORT_RECOVERY]**: Gemini guardrail API sends must retain systemInstruction and function declarations when overriding SDK send config. Enforce scoped local simulation and NotebookLM checks. Retry bounded transient provider errors without exhausting keys, distinguish per-minute from explicit daily quotas, and use configured approved model fallback with preserved tool results and no replay side effects. Empty or unfinished responses are unavailable, not verification. Dashboard status is independent of NotebookLM and vendor acceptance. *(Type: GUARDRAIL_RECOVERY_POLICY)*

## 🏛️ 2. Family & Generation Rules (ProLiant Gen12)

*No verified family/generation rules are registered for this product.*

## 🎯 3. Chassis & Solution-Type Gotchas (DL380_Gen12)

1. **[DELTA_DL380_GEN12_NO_DRIVE_BYPASS] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380 Gen12 CTO Server`):
   - **Rule**: When 873763-B21 is present, bypass physical drive cage, storage controller, and battery minimums.
   - **Affected SKU**: `873763-B21` | **Required Dependency**: `N/A`

2. **[DELTA_DL380_GEN12_LOCALIZATION_GATE] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380 Gen12 CTO Server`):
   - **Rule**: If Gen12 CTO base chassis is selected, P73325-B21 is mandatory for portal buildability.
   - **Affected SKU**: `P73282-B21` | **Required Dependency**: `P73325-B21`

3. **[DELTA_DL380_GEN12_COM_SAAS_MANDATE] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380 Gen12 CTO Server`):
   - **Rule**: Gen12 requires exactly 1 management SaaS license (R7A11AAE). Remove redundant BD505A when R7A11AAE is selected.
   - **Affected SKU**: `P73282-B21` | **Required Dependency**: `R7A11AAE`

4. **[DELTA_DL380_GEN12_LOT9_CE_BYPASS] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380 Gen12 CTO Server`):
   - **Rule**: If Platinum PSUs are selected on Gen12, P35876-B21 clears EU Lot 9 CE prompts.
   - **Affected SKU**: `P38995-B21` | **Required Dependency**: `P35876-B21`

5. **[DELTA_DL380_GEN12_25C_AMBIENT_TRACKING] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380 Gen12 CTO Server`):
   - **Rule**: P79558-B21 tracks 25C ambient baseline for Gen12 chassis.
   - **Affected SKU**: `P73282-B21` | **Required Dependency**: `P79558-B21`

6. **[DELTA_DL380_GEN12_HIGH_TDP_COOLING] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380 Gen12 CTO Server`):
   - **Rule**: CPUs > 185W TDP mandate High-Performance Fan Kit P48820-B21 and High-Performance Heatsink P74792-B21.
   - **Affected SKU**: `P74507-B21` | **Required Dependency**: `P48820-B21`

7. **[DELTA_DL380_MISSING_SUPPORT_CONTRACT] DL380_Gen12** (Taxonomy: `ProLiant/Gen12/DL380_Gen12` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: Every HPE ProLiant DL380 Gen12 server (P73282-B21) requires a hardware maintenance support contract. Common customer error: quoting software licenses (P8B31A OneView) while omitting hardware warranty (HU4B2A30C4V 3Y Tech Care Basic at ,509/unit). The BOQ evaluator must flag any DL380 Gen12 config that has 0 support units against N physical servers.
   - **Affected SKU**: `HU4B2A30C4V` | **Required Dependency**: `P73282-B21`

8. **[DELTA-1787939298644] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: Portal validation flagged restriction on P76453-B21.
   - **Affected SKU**: `P76453-B21` | **Required Dependency**: `N/A`

9. **[DELTA-1787939245188] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: Portal validation flagged restriction on P76450-B21.
   - **Affected SKU**: `P76449-B21` | **Required Dependency**: `P76450-B21`

10. **[PREPROC-DELTA-1786781599909] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: Confirmed configuration variation reason 'WORKLOAD_NODE_PURPOSE' for config_1
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

11. **[DELTA-1786880389958] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: Intel Xeon 6730P 250W CPU requires HPE ProLiant Compute DL380 Gen12 Performance Heat Sink Kit (P74792-B21) due to exceeding the 185W standard thermal envelope.
   - **Affected SKU**: `P74573-B21` | **Required Dependency**: `P74792-B21`
   - 💡 **Human Engineer Rationale**: *"Agentic Guardrail Loop derived from RAG/DB fact-check"*

12. **[DELTA-1786880394092] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: Intel Xeon 6730P 250W CPU requires HPE ProLiant High Performance Fan Kit (P48820-B21) because it exceeds the 240W system limit for standard chassis fans.
   - **Affected SKU**: `P74573-B21` | **Required Dependency**: `P48820-B21`
   - 💡 **Human Engineer Rationale**: *"Agentic Guardrail Loop derived from RAG/DB fact-check"*

13. **[DELTA_RAG_FIO_P69728-B21_P69728-F21_1788145618089] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: | **`P69728-B21`** | HPE 64GB (1x64GB) Dual Rank x4 DDR5-6400 Smart Memory Kit | Memory / RDIMM (BTO) | **❌ BLOCKED in CTO (CLIC Suffix Violation)** | Standalone retail Build-to-Order (BTO) SKU [9, 15, 16]. Factory Configure-to-Order sessions enforce the rule: *"BTO products are not allowed in CTO B
   - **Affected SKU**: `P69728-B21` | **Required Dependency**: `P69728-F21`

14. **[DELTA_RAG_DEP_P75740-B21_873763-B21_1788145618089] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: | **`P75740-B21`** | HPE DL3XX Gen12 8SFF x1 U.3 Tri-Mode Drive Cage Kit | Smart Chassis / Drive Cage | **✅ Valid Front Cage** | Installs an 8-bay SFF x1 U.3 Tri-Mode backplane into Box 1, 2, or 3 [19-23]. Installing this cage **clears the factory unbuildable drive-less chassis block** (which otherw
   - **Affected SKU**: `P75740-B21` | **Required Dependency**: `873763-B21`

15. **[DELTA_RAG_DEP_P28586-B21_P75740-B21_1788145618089] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: | **`P28586-B21`** | HPE 1.2TB SAS 12G 10K SFF BC 3yr Wty HDD | Storage / SFF SAS HDD | **✅ Valid SAS HDD** | 12G SAS 10K RPM Basic Carrier (BC) drive [21, 28]. Supported inside the `P75740-B21` drive cage [21, 22]. Requires a dedicated hardware storage controller (`P47777-B21`) as the system board
   - **Affected SKU**: `P28586-B21` | **Required Dependency**: `P75740-B21`

16. **[DELTA_RAG_DEP_P47777-B21_P01366-B21_1788145618091] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: | **`P47777-B21`** | HPE MR416i-p Gen11 x16 Lanes 8GB Cache PCI SPDM Storage Controller | Storage Controller / Tri-Mode | **⚠️ Conditional Pass (Requires 3 Co-Dependencies)** | Stand-up PCIe card (-p) installed into a PCIe riser slot [30, 36, 39-41]. Requires **`P01366-B21`** (battery), **`P48918-B2
   - **Affected SKU**: `P47777-B21` | **Required Dependency**: `P01366-B21`

17. **[DELTA_RAG_DEP_P76453-B21_P75740-B21_1788145618092] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: 4.  **High-Speed Backplane Data Cable (`P76453-B21`):** Routing SAS/SATA/NVMe data lanes from Box 1 or Box 2 backplanes of the `P75740-B21` drive cage to the stand-up MR416i-p requires the **HPE ProLiant Compute DL380 Gen12 8SFF/2SFF UMB PCIe Cable Kit (`P76453-B21`)** [76, 80–85, 113, 117–122, 145,
   - **Affected SKU**: `P76453-B21` | **Required Dependency**: `P75740-B21`

18. **[DELTA_RAG_FIO_P64707-B21_P69728-F21_1788148383105] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: | **`P64707-B21`** | HPE 64GB 2Rx4 DDR5-5600 Registered Memory | Memory / RDIMM | **❌ Incompatible Gen11 Memory** | Gen12 strictly mandates **DDR5-6400 Smart Memory** [200, 208–209, 240, 270]. DDR5-5600 is blocked. Factory CTO builds also mandate the **`-F21`** suffix (**`P69728-F21`**) [8-12]. |
   - **Affected SKU**: `P64707-B21` | **Required Dependency**: `P69728-F21`

19. **[DELTA_RAG_DEP_P48818-B21_P38995-B21_1788148383108] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: | **`P48818-B21`** | HPE 800W Flex Slot Platinum Hot Plug Power Supply | Power Supplies | **❌ Invalid SKU & Lack of Redundancy** | The valid 800W Platinum SKU is **`P38995-B21`** [23, 24]. A single PSU provides no 1+1 redundancy [25]. (EU ErP Lot 9 requires 96% Titanium `P03178-B21`) [25, 26]. |
   - **Affected SKU**: `P48818-B21` | **Required Dependency**: `P38995-B21`

20. **[DELTA_RAG_CARRYOVER_P47777-B21_1788459469422] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: | **P47777-B21** | HPE MR416i-p Gen11 Storage Controller | **✅ VALID** | This PCIe plug-in controller is fully supported on Gen12 as a carry-forward option [16]. However, it **requires the P48918-B21 enablement cable kit** to bridge SPDM security and sideband power to the Gen12 motherboard [16]. | *
   - **Affected SKU**: `P47777-B21` | **Required Dependency**: `N/A`

21. **[DELTA_RAG_DEP_P01366-B21_P48918-B21_1788459469423] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: | **P01366-B21** | HPE 96W Smart Storage Battery | **✅ VALID** | Fully compatible battery to protect the MR416i-p's volatile write cache [16]. It **requires the P48918-B21 enablement cable** to physically connect to the controller's cache module [16]. | **P01366-B21** *(Keep)* |
   - **Affected SKU**: `P01366-B21` | **Required Dependency**: `P48918-B21`

22. **[DELTA_RAG_DEP_P10180-B21_P72203-B21_1788459469424] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: | **P10180-B21** | Broadcom BCM5719 1Gb 4p BASE-T OCP3 NIC | **❌ OBSOLETE** | Legacy Gen11 part number [8]. It also **requires OCP enablement cable P72203-B21** to route high-speed PCIe lanes from CPU1 to rear OCP Slot B [25]. | **P51181-B21** (BCM5719 OCP3 NIC) and **P72203-B21** (OCP rear cable ki
   - **Affected SKU**: `P10180-B21` | **Required Dependency**: `P72203-B21`

23. **[DELTA_RAG_DEP_P74573-B21_P48820-B21_1788461136463] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: • [DL380_Gen12 Catalog Rule] Category: Learned Feedback Rules > P74573-B21 | Constraint: learned (Intel Xeon 6730P 250W CPU requires HPE ProLiant High Performance Fan Kit (P48820-B21) because it exceeds the 240W system limit for standard chassis fans.)
   - **Affected SKU**: `P74573-B21` | **Required Dependency**: `P48820-B21`

24. **[DELTA_RAG_DEP_P74573-B21_P74792-B21_1788461136464] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: • [DL380_Gen12 Catalog Rule] Category: Learned Feedback Rules > P74573-B21 | Constraint: learned (Intel Xeon 6730P 250W CPU requires HPE ProLiant Compute DL380 Gen12 Performance Heat Sink Kit (P74792-B21) due to exceeding the 185W standard thermal envelope.)
   - **Affected SKU**: `P74573-B21` | **Required Dependency**: `P74792-B21`

25. **[DELTA-1788462981839] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: P10180-B21 is obsolete Gen11 SKU for DL380 Gen12; replaced by P51181-B21 with mandatory OCP rear cable kit P72203-B21.
   - **Affected SKU**: `P10180-B21` | **Required Dependency**: `P51181-B21`
   - 💡 **Human Engineer Rationale**: *"Agentic Guardrail Loop derived from RAG/DB fact-check"*

26. **[DELTA_RAG_DEP_P76453-B21_P48918-B21_1788463665182] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: 3.  **Storage Cable Integration:** The inclusion of `P76453-B21` is correct for routing PCIe lanes from SFF drive cages back to the PCIe slot [16]. However, the configurator will throw an error unless it sees the **Storage Controller Enablement Cable Kit (`P48918-B21`)** which is physically required
   - **Affected SKU**: `P76453-B21` | **Required Dependency**: `P48918-B21`

27. **[DELTA_RAG_DEP_P81130-B21_P74787-B21_1790182000001] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: When HPE ProLiant Compute DL380 Gen12 Cooling Upgrade Enablement Kit (P81130-B21) is selected, the only supported heatsink is HPE ProLiant Compute DL3XX Gen12 High Performance Heat Sink Kit (P74787-B21).
   - **Affected SKU**: `P81130-B21` | **Required Dependency**: `P74787-B21`

28. **[DELTA_RAG_DEP_P81130-B21_P79555-B21_1790182000002] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: HPE ProLiant Compute DL380 Gen12 Cooling Upgrade Enablement Kit (P81130-B21) supports processors up to 270W at 30C or up to 350W at 27C (P79555-B21).
   - **Affected SKU**: `P81130-B21` | **Required Dependency**: `P79555-B21`

29. **[DELTA_RAG_DEP_P10115-B21_P72203-B21_1790182000003] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: Rear OCP Slot B on DL380 Gen12 NC chassis is unpowered and logically disconnected by default; configuring an OCP NIC requires P72203-B21 cable kit to route PCIe lanes from CPU 1.
   - **Affected SKU**: `P10115-B21` | **Required Dependency**: `P72203-B21`

30. **[DELTA_RAG_DEP_P78279-B21_P74755-B21_1790182000004] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: HPE NS204i-u v2 480GB NVMe Hot Plug Boot Storage Device (P78279-B21) requires HPE ProLiant Compute DL380 Gen12 NS204i-u Rear Boot Device Enablement Kit (P74755-B21).
   - **Affected SKU**: `P78279-B21` | **Required Dependency**: `P74755-B21`

31. **[DELTA_CLIC_RULE_81392332_H200_16PIN_P93055-B21] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: Rule 81392332: P56072-B21 requires to be ordered with supported 8-pin GPUs. H200 NVL mandates P93055-B21 HPE GPU 16-pin Power Cable Kit.
   - **Affected SKU**: `S3U30C` | **Required Dependency**: `P93055-B21`

32. **[DELTA_CLIC_RULE_81394885_SECONDARY_RISER_25C_AMBIENT] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: Rule 81394885: 1 qty 8SFF Cage + Processor above 270W + Air Cooled: H200 NVL (S3U30C) is not supported on Primary Riser (20C-30C) or Tertiary Riser (20C-30C). Supported on Secondary Riser only with <= 25C ambient temperature.
   - **Affected SKU**: `S3U30C` | **Required Dependency**: `P51083-B21`

33. **[DELTA_CLIC_RULE_81393803_STORAGE_CABLE_P76453-B21] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: Rule 81393803: P73282-B21 with 8SFF x1 Cage (P75740-B21) and 1 qty MR416i-p (P47777-B21) requires 1 qty of P76453-B21 (2SFF B1/ 8SFF x1 PCIe Cable).
   - **Affected SKU**: `P75740-B21` | **Required Dependency**: `P76453-B21`

34. **[LEARN_DL380_GEN12_OEM_DEFAULT_20260930] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: OCA observed P77819-B21 as OEM DL380 Gen12 CTO. Preserve it in scoped discovery; a generic commercial DL380 Gen12 request must not automatically choose OEM. P73282-B21 was observed as commercial CTO, not certified as a permanent substitute or live-price guarantee.
   - **Affected SKU**: `P77819-B21` | **Required Dependency**: `N/A`

35. **[LEARN_DL380_GEN12_RUNTIME_DISCOVERY_20260930] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: Catalog absence is not proof of unsupported hardware. Investigate missing and conditional BOQ SKUs on the exact base and owning configuration, with the requested quantities and environmental state. Hidden presence establishes observation only. Revalidate each changed manifest in CLIC; a runtime plan does not establish acceptance.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

36. **[LEARN_DL380_GEN12_COVERAGE_BOUNDARY_20260930] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: Chassis discovery does not establish traversal. Current automated conditional capture covers hidden DOM and ambient probes; other selector combinations and all-base coverage remain unverified. Unknown recommendation, price and variant capability stay unknown. Do not retire prior NotebookLM sources before replacement verification.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

37. **[LEARN_DL380_GEN12_H200_OBSERVED_STATES_20261001] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: Live OCA evidence on commercial DL380 Gen12 base P73282-B21: S3U30C NVIDIA H200 NVL 141GB was already present in the DOM at selected 30C tracking SKU P79552-B21, but hidden and marked unavailable. Vendor text says H200 NVL and 30C cannot be selected together. At selected 27C tracking SKU P79555-B21 the unavailable flag and restriction disappeared; the collapsed section still hid the row visually. Original 30C was restored. This is two observed selector states, not proof of every lower temperature or final CLIC build acceptance. Evidence: evidence/scraping_review/h200_at_30c_before.json and h200_at_27c.json. Do not compile the 30C prohibition as an allowed <=30C gate.
   - **Affected SKU**: `S3U30C` | **Required Dependency**: `N/A`

38. **[LEARN_CHASSIS_THREE_TIER_DOMAIN_CLASSIFICATION_20261012] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: Specialty hardware categories (SAN switches like SN3600B, fabric interconnect modules like SY100Gb, and tape libraries like MSL) do not contain server compute components (CPU, Memory, Power). Synergy compute blades (SY480 Gen12) require CPU and Memory, but Power supplies are governed at the Synergy 12000 enclosure frame level. Freshness guards must evaluate compliance using a three-tier domain discriminator rather than enforcing server categories on all products (INV-158).
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

39. **[LEARN_UNIVERSAL_ACCESSORY_SCOPE_ISOLATION_20261012] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: Passive accessories such as DC lug terminal kits (P36877-B21), power cords, and rail kits are architecture-invariant and span multiple product generations. They must be registered in APPROVED_UNIVERSAL_POLICY_SKUS in product_scope.js to prevent false-positive cross-generation isolation quarantines by the drift engine (INV-159).
   - **Affected SKU**: `P36877-B21` | **Required Dependency**: `N/A`

40. **[LEARN_WEBLOGIC_EXPAND_SECTIONS_COST_CAPTURE_20261012] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: WebLogic OCA table expansion in cdp.js must explicitly toggle show_cost alongside show_price and trigger change events on all discovered showmore inputs. Omitting show_cost prevents cost column rendering, leaving tabular price-breakdown structures incomplete (INV-161).
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

41. **[DELTA_DL380_GEN12_CPU_PARITY_AND_SST_CP_LEARNING] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: When modernizing Cascade Lake Xeon Gold 6258R (28c, 2.7GHz, 38.5MB L3, 205W), Xeon 6530P (32c, 2.3GHz, 144MB L3, 225W, $4,830 USD) provides superior per-core IPC (+22%) and total throughput, with Intel Speed Select (SST-CP) supporting 2.8GHz Compute Mode. If customer mandates strict base clock >=2.7GHz without BIOS profile dependencies, Xeon 6738P (32c, 2.9GHz, 144MB L3, 270W, $7,305 USD) provides strict numerical parity (+188.5k USD delta across 9 servers). Evaluator must present both tracks with transparent trade-offs for customer negotiation (INV-184).
   - **Affected SKU**: `P74571-B21` | **Required Dependency**: `P74577-B21`

42. **[DELTA_DL380_GEN12_MEMORY_SYMMETRICAL_CHANNEL_LEARNING] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: On Intel Xeon 6 (8 memory channels per CPU, 16 channels dual socket), legacy 6-channel memory capacities (such as 1,152 GB achieved via 12x 64GB + 12x 32GB on Gen10) cannot be satisfied with 12 DIMMs without leaving 2 channels unpopulated per CPU and suffering a 25% throughput penalty. Symmetrical population mandates 16 DIMMs (1DPC) or 32 DIMMs (2DPC). Present 1,536 GB (16x 96GB P69729-F21 @ 6400 MT/s) for full 1DPC capacity surplus, or 1,024 GB (16x 64GB P69728-F21 @ 6400 MT/s) for CapEx optimization with documented 128GB delta (INV-184).
   - **Affected SKU**: `P69728-F21` | **Required Dependency**: `P69729-F21`

43. **[DELTA_DL380_GEN12_HEATSINK_TIER_RIGHT_SIZING_INV208] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: On HPE ProLiant DL380 Gen12 (P73282-B21), processors with 185W < TDP <= 270W (such as Intel Xeon 6530P 225W P74571-B21) are 100% thermally certified with P74792-B21 (HPE ProLiant Compute DL380 Gen12 2U High Performance Heat Sink Kit, 316.00 USD list per socket, max 2 per 2P server = 632.00 USD/server, 4-day lead time). Do not over-provision P74794-B21 (2U Max Performance Heat Sink Kit, 624.00 USD list per dual-socket server, max 1 per server, 45-day lead time), which is only required for >270W extreme TDP processors (275W-350W+) or dense GPU workloads. Substituting 1x P74794-B21/server (624.00 USD) with 2x P74792-B21/server (632.00 USD) has virtually identical cost (+8.00 USD/server or +72.00 USD across 9 servers) while slashing cooling lead time by 41 days from 45 days down to 4 days (INV-208).
   - **Affected SKU**: `P74794-B21` | **Required Dependency**: `P74792-B21`

44. **[DELTA_DL380_GEN12_COM_R7A11AAE_VS_S1A05A_SEPARATION_INV207] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: On DL380 Gen12 CTO builds (P73282-B21), R7A11AAE (HPE Compute Ops Management Standard 3-year Upfront SaaS, $515.00 USD) satisfies CLIC Rule 81322276 for portal orderability, whereas S1A05A ($0.00 USD FIO cloud pre-claim token) is optional and safe to omit (INV-207).
   - **Affected SKU**: `S1A05A` | **Required Dependency**: `R7A11AAE`

45. **[LEARN_DL380_GEN12_WORKFLOW_DUAL_PUBLICATION_ADVISORY_20261029] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: Publish and read back the human Drive workbook separately from the complete semantic Markdown source in NotebookLM. Google Sheets is not a supported NotebookLM Drive source. A recent upload timestamp does not refresh old vendor observations.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

46. **[LEARN_DL380_GEN12_WORKFLOW_SOURCE_RETIREMENT_ADVISORY_20261029] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: Verify exact-product replacement content, indexing and source-restricted grounded canary, then commit trust metadata before removing only managed stale catalog snapshots. Preserve QuickSpecs, separate learnings, shared enclosure/fabric sources and unrelated documents. Inventory absence is not authority to remove another product source.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

47. **[LEARN_DL380_GEN12_WORKFLOW_CLOUD_LEARNING_REVIEW_ADVISORY_20261029] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: Preserve retrieved cloud learning documents locally with their source IDs. Treat prose claims as candidates pending dated vendor evidence; resolve contradictions before promoting hardware dependencies. Conflicting quantity claims require dated evidence for this exact product and selector state.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

48. **[LEARN_DL380_GEN12_SUPPORT_PRICING_UPDATE_20261102] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: HPE DL380 Gen12 Support (HU4B2A30C4V, under HU4B2A3 3Y Tech Care Basic) list price updated in November 2026 OCA catalog from $5,509.00 to $5,784.00 USD (+$275.00 / +4.99% per server node). 12-node cluster extended price increases from $66,108.00 to $69,408.00 USD (+$3,300.00).
   - **Affected SKU**: `HU4B2A30C4V` | **Required Dependency**: `P73282-B21`

49. **[LEARN_DL380_GEN12_CLIC_STATUS_CLEARANCE_20261102] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: Portal validation warnings on HPE ProLiant DL380 Gen12 SFF NC CTO Server (P73282-B21) and HPE Compute Ops Management Standard 3-year SaaS (R7A11AAE) have cleared to clean/pass in latest OCA engine release.
   - **Affected SKU**: `P73282-B21` | **Required Dependency**: `N/A`

50. **[LEARN_DL380_GEN12_LEAD_TIME_AND_LIFECYCLE_20261102] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: DL380 Gen12 CTO base chassis (P73282-B21) availability lead time improved to 14 days (down from 30 days). Xeon 6787P CPU (P73837-B21) is 10 days; 8SFF drive cage (P75740-B21) is 14 days. 64GB DDR5-6400 Smart FIO memory (P69728-F21) discontinuation date extended to 2030-06-30 (+27 months).
   - **Affected SKU**: `P73282-B21` | **Required Dependency**: `N/A`

51. **[LEARN_DL380_GEN12_WORKFLOW_NORMATIVE_LANGUAGE_PRECISION_20261107] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: All agent skill directives, checklists, and execution handoffs must adhere to strict RFC-2119 normative vocabulary (MUST, MUST NOT, SHALL, SHOULD, MAY). Ambiguous hedge words (appropriate, as needed, etc., consider, typically, usually, generally, if possible, try to) are strictly prohibited in operational procedures to eliminate agent hesitation and non-deterministic loops.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

52. **[LEARN_DL380_GEN12_WORKFLOW_MODULAR_SKILL_TOKEN_OPTIMIZATION_20261107] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: Monolithic skills exceeding 25KB must be modularized into a concise core execution SKILL.md (<=250 lines) plus dedicated references/ documentation files. This preserves agent prompt token budgets, accelerates model reasoning, and prevents guardrail context window exhaustion.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

53. **[LEARN_DL380_GEN12_WORKFLOW_UNIVERSAL_CC30_AND_QUALITY_CEILING_20261107] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: Every function across all repository scripts and test fixtures must strictly comply with the universal cyclomatic complexity ceiling <= 30 (INV-229, INV-230). All modified code must pass oxlint with zero warnings, maintain a clean DAG with zero circular dependencies, and preserve non-empty test discovery.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

54. **[LEARN_DL380_GEN12_WORKFLOW_SPECIALIZED_ARCHITECTURAL_DISPATCH_20261107] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: Incoming presales inquiries must be classified and dispatched by presales-query-router across 34 specialized skill tracks, including code-quality-gate, self-correction-counterfactual, presales-clearance-strategy, and turnkey-racking-cabling, with zero ad-hoc script generation.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

55. **[LEARN_REASONING_COUNTERFACTUAL_HYPOTHESIS_SEMANTICS_20261108] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: Hardware repair proposals generated during counterfactual repair are unvalidated delta hypotheses (PROPOSED_UNVALIDATED), never certifications of 100% buildability prior to whole-candidate re-evaluation across physical, topological, customer-intent, and vendor portal acceptance gates (INV-231).
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

56. **[LEARN_REASONING_ARITHMETIC_PREDICATE_INFEASIBILITY_20261108] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: When physical demand exceeds available catalog capacity (e.g. required wattage exceeds maximum rated PSU candidate, or socket TDP exceeds available heatsink rating), the engine must emit REPAIR_INFEASIBLE with remaining deficits quantitatively disclosed, rather than fabricating out-of-catalog hardware quantities or assuming unevidenced vendor support (INV-231).
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

57. **[LEARN_REASONING_EXACT_CATALOG_SCOPED_DISCOVERY_20261108] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: Repair discovery must select options exclusively from the verified target product catalog snapshot. Input electrical conditions (AC vs -48VDC) and customer SLA/duration requirements must be preserved, defaulting to product-qualified 3-year Basic support only when customer requirements leave support unspecified (INV-231).
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

58. **[LEARN_REASONING_EVIDENCE_VS_HARDWARE_DECOUPLING_20261108] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: Acceptance blockers regarding evidence deficits (missing document grounding, citations, or portal session receipts) must evaluate to ACTION_REQUIRED_EVIDENCE_PROBE with zero hardware deltas, and must never invent fake hardware SKUs or convert evidence failures into hardware additions (INV-231).
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

59. **[LEARN_REASONING_CRYPTOGRAPHIC_TIER3_RECEIPT_VERIFICATION_20261108] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: Tier 3 Official Vendor Acceptance strictly requires an authentic cryptographic session receipt re-verified from disk matching the exact candidate manifest, scope, and fresh timestamp (<24h). Truthy boolean flags or bare IDs evaluate to Tier 0 or Tier 1 (INV-201, Gate B19, INV-231).
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

60. **[LEARN_REASONING_APPEND_ONLY_KNOWLEDGE_RETRACTION_20261108] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: Falsified, erroneous, or superseded learned rules must be deactivated across all registry arrays (chassis deltas, wrapped rules, master registries) with an append-only decision audit trail (active: false, decision: RETRACTED or SUPERSEDED) without deleting historical evidence records (INV-231).
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`


## 🔒 3b. Physical & Architectural Gating Rules (DOM Unavailable Tables)

### Thermal & Ambient Temperature Gates

1. **[Graphics Options]**: RTX Pro 6000/ RTX Pro 6000D/ H200 NVL GPU and 30C Ambient Temperature cannot be selected together.
   - **Gated Rule Type**: `AMBIENT_GATE`
   - **Affected SKUs (3)**: `S3U30C`, `S6A73C`, `S6W21C`

### Memory Technology & Density Mixing Constraints

1. **[Memory]**: Mixing of x4 and x8 memory is not allowed
   - **Gated Rule Type**: `MEMORY_MIXING`
   - **Affected SKUs (1)**: `P69728-F21`

2. **[Memory]**: 96GB Memory cannot be mixed with any other Memory.
   - **Gated Rule Type**: `MEMORY_MIXING`
   - **Affected SKUs (1)**: `P69729-F21`

3. **[Memory]**: 128GB Memory cannot be mixed with any other Memory.
   - **Gated Rule Type**: `MEMORY_MIXING`
   - **Affected SKUs (1)**: `P69730-F21`

4. **[Memory]**: Mixing of 3DS and non 3DS memory is not allowed.
   - **Gated Rule Type**: `MEMORY_MIXING`
   - **Affected SKUs (1)**: `P73447-F21`

### Base Chassis & Form Factor Compatibility Gates

1. **[Smart Chassis]**: Supported with EDSFF CTO Server only.
   - **Gated Rule Type**: `CHASSIS_GATE`
   - **Affected SKUs (1)**: `P74738-B21`

2. **[Smart Chassis]**: Supported with 8LFF and 12LFF CTO Server only.
   - **Gated Rule Type**: `CHASSIS_GATE`
   - **Affected SKUs (4)**: `P74741-B21`, `P74746-B21`, `P75411-B21`, `P76875-B21`

3. **[Smart Chassis]**: Supported with 8LFF CTO Server only.
   - **Gated Rule Type**: `CHASSIS_GATE`
   - **Affected SKUs (1)**: `P74744-B21`

4. **[Smart Chassis]**: Nvme option not available with 8sff smart chassis choice.
   - **Gated Rule Type**: `CHASSIS_GATE`
   - **Affected SKUs (17)**: `cntr8sffx2`, `cntr8sffx4`, `da8sffx2`, `da8sffx4`, `P77955-B21`, `P77958-B21`, `P77931-B21`, `P78064-B21`, `P77934-B21`, `P77937-B21`, `P77940-B21`, `P77961-B21`, `P78070-B21`, `P78047-B21`, `P78058-B21`, `P78061-B21`, `P77943-B21`

5. **[Smart Chassis]**: Supported with EDSFF CTO Server only.
   - **Gated Rule Type**: `CHASSIS_GATE`
   - **Affected SKUs (2)**: `P80997-B21`, `P83356-B21`

6. **[Smart Chassis]**: Selected Smart Chassis Configuration is not valid
   - **Gated Rule Type**: `CHASSIS_GATE`
   - **Affected SKUs (3)**: `dl380smtch_1-0`, `dl380smtch_1-1`, `dl380smtch_1-2`

7. **[Storage Devices]**: Supported with 8LFF and 12LFF CTO Server only.
   - **Gated Rule Type**: `CHASSIS_GATE`
   - **Affected SKUs (6)**: `P76473-B21`, `P77474-B21`, `P77475-B21`, `P77484-B21`, `P77485-B21`, `P76474-B21`

8. **[Storage Devices]**: Supported with 8LFF CTO Server only and requires 2SFF SBS Cage.
   - **Gated Rule Type**: `CHASSIS_GATE`
   - **Affected SKUs (3)**: `P76476-B21`, `P77481-B21`, `P77480-B21`

9. **[Storage Devices]**: Supported with 12EDSFF CTO Server only.
   - **Gated Rule Type**: `CHASSIS_GATE`
   - **Affected SKUs (3)**: `P83798-B21`, `P83799-B21`, `P87968-B21`

10. **[Storage Devices]**: Supported with 8LFF CTO Server only.
   - **Gated Rule Type**: `CHASSIS_GATE`
   - **Affected SKUs (1)**: `P74752-B21`

11. **[Factory Configuration Settings]**: Supported with 12EDSFF CTO Server only.
   - **Gated Rule Type**: `CHASSIS_GATE`
   - **Affected SKUs (2)**: `P87692-B21`, `P92742-B21`

### PCIe Riser & OCP Slot Contention Constraints

1. **[Smart Chassis]**: Tertiary x8x16 Riser and OCPA x16/ CPU1 OCPB x8 cannot be selected together.
   - **Gated Rule Type**: `SLOT_COLLISION`
   - **Affected SKUs (1)**: `P74737-B21`

### Mandatory Paired Enablement Kits & Interconnects

1. **[Power Supplies]**: HPE 1600W -48VDC Pwr Cbl Lug Kit(P36877-B21) Supported only with HPE 1600W FS -48VDC Ht Plg PS Kit (P17023-B21).
   - **Gated Rule Type**: `PAIRED_KIT_REQUIRED`
   - **Affected SKUs (1)**: `P36877-B21`

### Component Mutual Exclusion Rules

1. **[Processor]**: Mixing of Heat sink is not allowed.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (5)**: `P49145-B21`, `P74204-B21`, `P74208-B21`, `P74787-B21`, `P74794-B21`

2. **[Networking]**: Private Product is not valid for current customer account
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `P74383-B21`

3. **[Networking]**: Private Product is not valid for current customer account
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `P89140-B21`

4. **[Networking]**: Private Product is not valid for current customer account
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (2)**: `P74606-B21`, `P97416-B21`

5. **[Graphics Options]**: Private Product is not valid for current customer account
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `S7J51C`

6. **[Power Supplies]**: Mixing of Power supplies are not allowed.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (3)**: `P38995-B21`, `P38997-B21`, `P44712-B21`

7. **[Power Supplies]**: If AC Power Supply is selected then only AC Power Cords should be in the drop-down.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `P17023-B21`

8. **[Power Supplies]**: Max quantity of product limited by space available.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (25)**: `AF556A`, `AF557A`, `AF568A`, `AF573A`, `P78130-B21`, `P78156-B21`, `AF558A`, `AF559A`, `AF560A`, `AF561A`, `AF562A`, `AF564A`, `AF565A`, `AF566A`, `AF567A`, `AF569A`, `AF570A`, `AF572A`, `AF591A`, `P78131-B21`, `P78144-B21`, `P78147-B21`, `P78940-B21`, `P78941-B21`, `R1C65A`

9. **[Power Supplies]**: If AC Power Supply is selected then only AC Power Cords should be in the drop-down.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `P22173-B21`

10. **[Private Cloud Business Edition]**: Not Supported ProStack Server Software
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `S7J52A`

11. **[HPE Compute Ops Management]**: Max 1 per server (This is applicable for both 3year and 5 year license in TOTAL) Total number of licenses within an order cannot exceed the number of servers
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (2)**: `R7A11AAE`, `S2E10AAE`

12. **[HPE Compute Ops Management]**: For Gen11/Gen12 servers ONLY Min 1/Max 1 per server. Total number of licenses within an order cannot exceed the number of servers
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (3)**: `S5E59AAE`, `S5E60AAE`, `S5E61AAE`

13. **[Virtualization]**: Private Product is not valid for current customer account
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (3)**: `S4F94AAE`, `S4G00AAE`, `S4R76AAE`

### CTO vs BTO Factory Integration Rules

1. **[Storage Devices]**: BTO products are not allowed in CTO Base Model.
   - **Gated Rule Type**: `BTO_DISALLOWED`
   - **Affected SKUs (1)**: `701498-B21`

2. **[Storage Devices]**: BTO products are not allowed in CTO Base Model.
   - **Gated Rule Type**: `BTO_DISALLOWED`
   - **Affected SKUs (2)**: `807878-B21`, `666987-B21`

3. **[Networking]**: BTO products are not allowed in CTO Base Model.
   - **Gated Rule Type**: `BTO_DISALLOWED`
   - **Affected SKUs (6)**: `AJ833A`, `AJ836A`, `AJ837A`, `AJ838A`, `AJ839A`, `AJ834A`

4. **[Power Supplies]**: BTO products are not allowed in CTO Base Model.
   - **Gated Rule Type**: `BTO_DISALLOWED`
   - **Affected SKUs (2)**: `A0N33A`, `A0K02A`

## ⚠️ 4. Discontinued & Obsolete SKUs Registry

### Fully Discontinued & Delisted SKUs

| SKU | Description | Status | Discontinued Date | Last Known Price | Successor SKU | Tracking |
|-----|-------------|--------|-------------------|------------------|---------------|----------|
| `P77955-B21` | HPE ProLiant Compute DL380 Gen12 16SFF x2 1P Direct Attach FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 | None | LIFECYCLE_RETAINED |
| `P77958-B21` | HPE ProLiant Compute DL380 Gen12 16SFF x2 1P Direct Attach Universal Media Bay FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 | None | LIFECYCLE_RETAINED |
| `P77931-B21` | HPE ProLiant Compute DL380 Gen12 16SFF x4 Direct Attach Balanced FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 | None | LIFECYCLE_RETAINED |
| `P78064-B21` | HPE ProLiant Compute DL380 Gen12 16SFF x4 Direct Attach Multiple Purpose Cage FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $0.00 | None | LIFECYCLE_RETAINED |
| `P77934-B21` | HPE ProLiant Compute DL380 Gen12 16SFF x4 Direct Attach Universal Media Bay FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 | None | LIFECYCLE_RETAINED |
| `P77937-B21` | HPE ProLiant Compute DL380 Gen12 24SFF x16/x16/x16 OCP Balanced FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 | None | LIFECYCLE_RETAINED |
| `P77940-B21` | HPE ProLiant Compute DL380 Gen12 24SFF x16/x16/x16 OCP Gen4 Retimer Card FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 | None | LIFECYCLE_RETAINED |
| `P77961-B21` | HPE ProLiant Compute DL380 Gen12 24SFF x2 Direct Attach x16/x16/x16 OCP FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 | None | LIFECYCLE_RETAINED |
| `P78070-B21` | HPE ProLiant Compute DL380 Gen12 8SFF x4 1P Direct Attach FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 | None | LIFECYCLE_RETAINED |
| `P78047-B21` | HPE ProLiant Compute DL380 Gen12 8SFF x4 Direct Attach Balanced FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 | None | LIFECYCLE_RETAINED |
| `P78058-B21` | HPE ProLiant Compute DL380 Gen12 8SFF x4 Direct Attach Multiple Purpose Cage FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $0.00 | None | LIFECYCLE_RETAINED |
| `P78061-B21` | HPE ProLiant Compute DL380 Gen12 8SFF x4 Direct Attach UMB Multiple Purpose Cage FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $0.00 | None | LIFECYCLE_RETAINED |
| `P77943-B21` | HPE ProLiant Compute DL380 Gen12 Tertiary Riser 24SFF x16/x16/x16 OCP Balanced FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 | None | LIFECYCLE_RETAINED |
| `P73282-B21` | HPE ProLiant Compute DL380 Gen12 8SFF NC CTO Server | **REINSTATED** | 2026-09-09 | $5584.00 | None | STOPPED_AFTER_REMOVAL |
| `P73283-B21` | HPE ProLiant Compute DL380 Gen12 24SFF NC CTO Server | **REINSTATED** | 2026-09-09 | $5980.00 | None | STOPPED_AFTER_REMOVAL |
| `P73284-B21` | HPE ProLiant Compute DL380 Gen12 12LFF NC CTO Server | **REINSTATED** | 2026-09-09 | $6350.00 | None | STOPPED_AFTER_REMOVAL |
| `P73285-B21` | HPE ProLiant Compute DL380 Gen12 8LFF NC CTO Server | **REINSTATED** | 2026-09-09 | $6890.00 | None | STOPPED_AFTER_REMOVAL |
| `P73286-B21` | HPE ProLiant Compute DL380 Gen12 16EDSFF NC CTO Server | **REINSTATED** | 2026-09-09 | $7120.00 | None | STOPPED_AFTER_REMOVAL |
| `P73287-B21` | HPE ProLiant Compute DL380 Gen12 High Power / Telco CTO Server | **DISCONTINUED** | 2026-09-09 | $7450.00 | None | STOPPED_AFTER_REMOVAL |
| `804398-B21` | HPE Smart Array E208e-p SR Gen10 (8 External Lanes/No Cache) 12G SAS PCIe Plug-in Controller | **REINSTATED** | 2026-09-30 | $1775.00 | None | STOPPED_AFTER_REMOVAL |
| `339781-B21` | HPE RAID FIO Advanced Data Guarding Option | **DISCONTINUED** | 2026-09-30 | $1.00 | None | STOPPED_AFTER_REMOVAL |
| `389692-B21` | HPE Customer Defined RAID Setting Service | **DISCONTINUED** | 2026-09-30 | $1.00 | None | STOPPED_AFTER_REMOVAL |
| `469774-409` | HPE Remove Standard Power Cords | **DISCONTINUED** | 2026-09-10 | $1.00 | None | STOPPED_AFTER_REMOVAL |
| `P60283-B21` | [SHARED_ACCESSORY_VERIFIED target=DL380_Gen12] HPE OEM ProLiant DL380 Gen11 Over Pack FIO Shipping Kit (Class: CABLE; Evidence: CERTIFIED_OCA_CATALOG; Sources: DL380_Gen12_Master_Catalog) | **REINSTATED** | 2026-09-10 | $99.00 | None | STOPPED_AFTER_REMOVAL |
| `P73325-B21` | HPE ProLiant Compute Localization FIO Kit | **REINSTATED** | 2026-09-10 | $4.00 | None | STOPPED_AFTER_REMOVAL |
| `P52341-B21` | [REMOVED SKU] HPE ProLiant DL3XX Gen11 Easy Install Rail 3 Kit | **REINSTATED** | 2026-08-24 | $164.00 | None | LIFECYCLE_RETAINED |
| `P70744-B21` | [REMOVED SKU] HPE ProLiant Compute DL3XX Gen12 2U Cable Management Arm for Rail Kit | **REINSTATED** | 2026-08-24 | $172.00 | None | LIFECYCLE_RETAINED |
| `P74748-B21` | [REMOVED SKU] HPE ProLiant Compute DL380 Gen12 System Insight Display Kit | **REINSTATED** | 2026-08-24 | $117.00 | None | LIFECYCLE_RETAINED |
| `Q9R65A` | Red Hat Enterprise Linux for SAP Solutions for Physical Nodes 3yr Subscription 24x7 Support LTU | **REINSTATED** | 2026-09-09 | $6737.00 | None | STOPPED_AFTER_REMOVAL |
| `Q9R66A` | Red Hat Enterprise Linux for SAP Solutions for Physical Nodes 5yr Subscription 24x7 Support LTU | **REINSTATED** | 2026-09-09 | $11229.00 | None | STOPPED_AFTER_REMOVAL |
| `Q9R67A` | Red Hat Enterprise Linux for SAP Solutions for Virtual DC 3yr Subscription 24x7 Support LTU | **REINSTATED** | 2026-09-09 | $24680.00 | None | STOPPED_AFTER_REMOVAL |
| `Q9R68A` | Red Hat Enterprise Linux for SAP Solutions for Virtual DC 5yr Subscription 24x7 Support LTU | **REINSTATED** | 2026-09-09 | $41134.00 | None | STOPPED_AFTER_REMOVAL |
| `AC120A` | HPE Pallet Size Customization Service | **DISCONTINUED** | 2026-09-09 | $7.00 | None | STOPPED_AFTER_REMOVAL |
| `AC129A` | HPE Consolidation Logistic Service | **DISCONTINUED** | 2026-09-09 | $26.00 | None | STOPPED_AFTER_REMOVAL |
| `P1F69A` | HPE Delivery Site Above Ground Floor Service | **DISCONTINUED** | 2026-09-09 | $289.00 | None | STOPPED_AFTER_REMOVAL |
| `P1F70A` | HPE Forklift at Delivery Service | **DISCONTINUED** | 2026-09-09 | $1399.00 | None | STOPPED_AFTER_REMOVAL |
| `P1F71A` | HPE Special Delivery Truck Size Service | **DISCONTINUED** | 2026-09-09 | $292.00 | None | STOPPED_AFTER_REMOVAL |
| `P1F72A` | HPE Two People at Delivery SVC | **DISCONTINUED** | 2026-09-09 | $466.00 | None | STOPPED_AFTER_REMOVAL |
| `P1F73A` | HPE Campus Delivery Service | **DISCONTINUED** | 2026-09-09 | $104.00 | None | STOPPED_AFTER_REMOVAL |
| `P1F74A` | HPE Unloading Logistic Service | **DISCONTINUED** | 2026-09-09 | $350.00 | None | STOPPED_AFTER_REMOVAL |
| `P1F75A` | HPE Fixed Delivery Appointment Service | **DISCONTINUED** | 2026-09-09 | $466.00 | None | STOPPED_AFTER_REMOVAL |
| `P1F76A` | HPE Pre-Delivery Site Survey SVC | **DISCONTINUED** | 2026-09-09 | $758.00 | None | STOPPED_AFTER_REMOVAL |
| `AC123A` | HPE Special Request/ Equipment Logistic Service | **DISCONTINUED** | 2026-09-09 | $816.00 | None | STOPPED_AFTER_REMOVAL |
| `BQ335A` | HPE Expedite Shipment Small Logistic Service | **DISCONTINUED** | 2026-09-09 | $44.00 | None | STOPPED_AFTER_REMOVAL |
| `BQ337A` | HPE Expedite Shipment Large Logistic Service | **DISCONTINUED** | 2026-09-09 | $100.00 | None | STOPPED_AFTER_REMOVAL |

### ⏳ Impending Obsolescence & Clearance Hardware (90-Day to 180-Day Window)

*These components remain orderable in live configurators today but have published vendor end dates. They represent high-value clearance opportunities for immediate deployments, but require explicit procurement cutoff remarks before quotation:*

| Product # | Description | Category | List Price (USD) | Discontinued Date | Price Trend | Presales Strategy Guidance |
|---|---|---|---:|---|:---:|---|
| `P73282-B21` | HPE ProLiant Compute DL380 Gen12 SFF NC Configure-to-order Server | Chassis | $5,584 | 2026-09-09 | 0.00% | ⚠️ Approaching EOL (2026-09-09). Valid for immediate builds; verify multi-year roadmaps. |
| `P73283-B21` | HPE ProLiant Compute DL380 Gen12 24SFF NC Configure-to-order Server | Chassis | $5,980 | 2026-09-09 | 0.00% | ⚠️ Approaching EOL (2026-09-09). Valid for immediate builds; verify multi-year roadmaps. |
| `P73284-B21` | HPE ProLiant Compute DL380 Gen12 12LFF NC Configure-to-order Server | Chassis | $6,350 | 2026-09-09 | 0.00% | ⚠️ Approaching EOL (2026-09-09). Valid for immediate builds; verify multi-year roadmaps. |
| `P73285-B21` | HPE ProLiant Compute DL380 Gen12 8LFF NC Configure-to-order Server | Chassis | $6,890 | 2026-09-09 | 0.00% | ⚠️ Approaching EOL (2026-09-09). Valid for immediate builds; verify multi-year roadmaps. |
| `P73286-B21` | HPE ProLiant Compute DL380 Gen12 EDSFF NC Configure-to-order Server | Chassis | $7,120 | 2026-09-09 | 0.00% | ⚠️ Approaching EOL (2026-09-09). Valid for immediate builds; verify multi-year roadmaps. |
| `Q9V61A` | HPE Performance Cluster Manager FIO Software | Software & Licenses | $1 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77095-291` | Microsoft Windows Server 2025 16-core Standard FIO Not Pre-installed Japanese SW | Software & Licenses | $0 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77095-B21` | Microsoft Windows Server 2025 16-core Standard FIO Not Pre-installed en/fr/de/es/it/pt/nl SW | Software & Licenses | $1,147 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77096-291` | Microsoft Windows Server 2025 16-core Standard FIO Pre-installed UEFI Japanese SW | Software & Licenses | $0 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77096-B21` | Microsoft Windows Server 2025 16-core Standard FIO Pre-installed UEFI en/fr/de/es/it/pt/nl SW | Software & Licenses | $1,147 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77097-291` | Microsoft Windows Server 2025 16-core Datacenter FIO Not Pre-installed Japanese SW | Software & Licenses | $0 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77097-B21` | Microsoft Windows Server 2025 16-core Datacenter FIO Not Pre-installed en/fr/de/es/it/pt/nl SW | Software & Licenses | $5,712 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45879-B21` | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed English SW | Software & Licenses | $20 | 01/31/2027 | -28.57% | 🔥 **Clearance Opportunity** (-28.57% CapEx savings). Procure before 01/31/2027. |
| `P45879-051` | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed French SW | Software & Licenses | $20 | 01/31/2027 | -28.57% | 🔥 **Clearance Opportunity** (-28.57% CapEx savings). Procure before 01/31/2027. |
| `P45879-041` | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed German SW | Software & Licenses | $20 | 01/31/2027 | -28.57% | 🔥 **Clearance Opportunity** (-28.57% CapEx savings). Procure before 01/31/2027. |
| `P45879-061` | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed Italian SW | Software & Licenses | $20 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45879-291` | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed Japanese SW | Software & Licenses | $99,999 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45879-071` | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed Spanish SW | Software & Licenses | $20 | 01/31/2027 | -28.57% | 🔥 **Clearance Opportunity** (-28.57% CapEx savings). Procure before 01/31/2027. |
| `P45862-B21` | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed English SW | Software & Licenses | $20 | 01/31/2027 | -28.57% | 🔥 **Clearance Opportunity** (-28.57% CapEx savings). Procure before 01/31/2027. |
| `P45862-051` | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed French SW | Software & Licenses | $20 | 01/31/2027 | -28.57% | 🔥 **Clearance Opportunity** (-28.57% CapEx savings). Procure before 01/31/2027. |
| `P45862-041` | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed German SW | Software & Licenses | $20 | 01/31/2027 | -28.57% | 🔥 **Clearance Opportunity** (-28.57% CapEx savings). Procure before 01/31/2027. |
| `P45862-061` | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed Italian SW | Software & Licenses | $20 | 01/31/2027 | -28.57% | 🔥 **Clearance Opportunity** (-28.57% CapEx savings). Procure before 01/31/2027. |
| `P45862-291` | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed Japanese SW | Software & Licenses | $99,999 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45862-071` | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed Spanish SW | Software & Licenses | $20 | 01/31/2027 | -28.57% | 🔥 **Clearance Opportunity** (-28.57% CapEx savings). Procure before 01/31/2027. |
| `P77125-291` | Microsoft Windows Server 2022 Downgrade Datacenter FIO Not Pre-installed Japanese SW | Software & Licenses | $0 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
*... [90 additional impending EOL records omitted for brevity]*

## 📊 5b. Category-Level Trends & Significant Price Adjustments

### Category Portfolio Delta & Planning Intelligence

| Category | Total SKUs | Added | Modified | Unchanged | Clearance / Drops | Category Planning Insight |
|---|---:|---:|---:|---:|---:|---|
| **Chassis** | 5 | 0 | 5 | 0 | 0 | 🔄 Attributes/specifications updated (5 SKUs) |
| **Accessories & Infrastructure** | 34 | 0 | 34 | 0 | 0 | 🔄 Attributes/specifications updated (34 SKUs) |
| **Processor** | 34 | 0 | 34 | 0 | 0 | 🔄 Attributes/specifications updated (34 SKUs) |
| **Cooling / Thermal** | 16 | 0 | 16 | 0 | 0 | 🔄 Attributes/specifications updated (16 SKUs) |
| **Memory** | 11 | 2 | 9 | 0 | 0 | ✨ Portfolio expanding (+2 new options) |
| **Drive Enclosures / Drives** | 28 | 0 | 28 | 0 | 0 | 🔄 Attributes/specifications updated (28 SKUs) |
| **Networking** | 76 | 0 | 76 | 0 | 1 | ⚠️ Active price drops / clearance (1 SKUs discounted) |
| **PCIe Risers** | 10 | 0 | 10 | 0 | 0 | 🔄 Attributes/specifications updated (10 SKUs) |
| **Storage Controllers** | 53 | 1 | 52 | 0 | 0 | ✨ Portfolio expanding (+1 new options) |
| **Cables & Enablement Kits** | 96 | 0 | 96 | 0 | 0 | 🔄 Attributes/specifications updated (96 SKUs) |
| **Software & Licenses** | 773 | 3 | 770 | 0 | 36 | ⚠️ Active price drops / clearance (36 SKUs discounted) |
| **Graphics & GPU** | 31 | 0 | 31 | 0 | 0 | 🔄 Attributes/specifications updated (31 SKUs) |
| **Power Supplies** | 10 | 0 | 10 | 0 | 0 | 🔄 Attributes/specifications updated (10 SKUs) |

### High-Impact Price Adjustments (Drops $\ge 10\%$ and Major Moves)

| Product # | Description | Category | Previous Price | Current Price | Delta (USD) | Change (%) | Movement Type |
|---|---|---|---:|---:|---:|---:|---|
| `P65333-H21` | HPE InfiniBand NDR200/Ethernet 200GbE 2-port QSFP112 PCIe5 x16 MCX755106AC-HEAT Adapter | Networking | $7,331 | $5,425 | $-1,906 | **-26.0%** | 📉 CLEARANCE_DROP |
| `P46218-B21` | Microsoft Windows Server 2022 10 Devices CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | Software & Licenses | $342 | $429 | $87 | **+25.4%** | 📈 PRICE_INCREASE |
| `P46218-B21` | Microsoft Windows Server 2022 10 Devices CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | Software & Licenses | $342 | $429 | $87 | **+25.4%** | 📈 PRICE_INCREASE |
| `P46218-B21` | Microsoft Windows Server 2022 10 Devices CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | Software & Licenses | $342 | $429 | $87 | **+25.4%** | 📈 PRICE_INCREASE |
| `P46222-B21` | Microsoft Windows Server 2022 RDS 5 Devices CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | Software & Licenses | $691 | $880 | $189 | **+27.4%** | 📈 PRICE_INCREASE |
| `P46222-B21` | Microsoft Windows Server 2022 RDS 5 Devices CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | Software & Licenses | $691 | $880 | $189 | **+27.4%** | 📈 PRICE_INCREASE |
| `P46222-B21` | Microsoft Windows Server 2022 RDS 5 Devices CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | Software & Licenses | $691 | $880 | $189 | **+27.4%** | 📈 PRICE_INCREASE |
| `S6L28B` | Microsoft Windows Server 2025 10-core Essentials FIO Not Pre-installed WW ESD LTU | Software & Licenses | New Addition | $445 | $445 | **+100.0%** | ✨ NEW_OPTION |
| `S6L28B` | Microsoft Windows Server 2025 10-core Essentials FIO Not Pre-installed WW ESD LTU | Software & Licenses | New Addition | $445 | $445 | **+100.0%** | ✨ NEW_OPTION |
| `S6L28B` | Microsoft Windows Server 2025 10-core Essentials FIO Not Pre-installed WW ESD LTU | Software & Licenses | New Addition | $445 | $445 | **+100.0%** | ✨ NEW_OPTION |
| `804398-B21` | HPE Smart Array E208e-p SR Gen10 (8 External Lanes/No Cache) 12G SAS PCIe Plug-in Controller | Storage Controllers | New Addition | $1,775 | $1,775 | **+100.0%** | ✨ NEW_OPTION |
| `P69726-B21` | HPE 16GB (1x16GB) Single Rank x8 DDR5-6400 CAS-52-52-52 EC8 Registered Smart Memory Kit | Memory | New Addition | $7,439 | $7,439 | **+100.0%** | ✨ NEW_OPTION |
| `P69726-F21` | HPE 16GB (1x16GB) Single Rank x8 DDR5-6400 CAS-52-52-52 EC8 Registered Smart FIO Memory Kit | Memory | New Addition | $7,439 | $7,439 | **+100.0%** | ✨ NEW_OPTION |

## 🔄 5. Recent Attribute & Specification Modifications Log

| Timestamp | SKU | Attribute | Old Value | New Value |
|-----------|-----|-----------|-----------|-----------|
| 2026-10-29 | `P71118-B21` | Vendor Attributes | {"listPrice":7062} | **{"listPrice":7062,"Vendor Status Badge":"CS"}** |
| 2026-10-29 | `P71119-B21` | Availability | Available | **CS (vendor status; meaning unverified)** |
| 2026-10-29 | `P71119-B21` | Portal Visibility |  | **PORTAL_CONDITIONAL** |
| 2026-10-29 | `P71119-B21` | Condition Type |  | **PORTAL_CONDITIONAL_VIEW** |
| 2026-10-29 | `P71119-B21` | Vendor Attributes | {"listPrice":8459} | **{"listPrice":8459,"Vendor Status Badge":"CS"}** |
| 2026-10-29 | `P71120-B21` | Availability | Available | **CS (vendor status; meaning unverified)** |
| 2026-10-29 | `P71120-B21` | Portal Visibility |  | **PORTAL_CONDITIONAL** |
| 2026-10-29 | `P71120-B21` | Condition Type |  | **PORTAL_CONDITIONAL_VIEW** |
| 2026-10-29 | `P71120-B21` | Vendor Attributes | {"listPrice":8965} | **{"listPrice":8965,"Vendor Status Badge":"CS"}** |
| 2026-10-29 | `P71121-B21` | Availability | Available | **CS (vendor status; meaning unverified)** |
| 2026-10-29 | `P71121-B21` | Portal Visibility |  | **PORTAL_CONDITIONAL** |
| 2026-10-29 | `P71121-B21` | Condition Type |  | **PORTAL_CONDITIONAL_VIEW** |
| 2026-10-29 | `P71121-B21` | Vendor Attributes | {"listPrice":11891} | **{"listPrice":11891,"Vendor Status Badge":"CS"}** |
| 2026-10-29 | `P71122-B21` | Availability | Available | **CS (vendor status; meaning unverified)** |
| 2026-10-29 | `P71122-B21` | Portal Visibility |  | **PORTAL_CONDITIONAL** |
| 2026-10-29 | `P71122-B21` | Condition Type |  | **PORTAL_CONDITIONAL_VIEW** |
| 2026-10-29 | `P71122-B21` | Vendor Attributes | {"listPrice":14473} | **{"listPrice":14473,"Vendor Status Badge":"CS"}** |
| 2026-10-29 | `P73835-B21` | Availability | Available | **CS (vendor status; meaning unverified)** |
| 2026-10-29 | `P73835-B21` | Portal Visibility |  | **PORTAL_CONDITIONAL** |
| 2026-10-29 | `P73835-B21` | Condition Type |  | **PORTAL_CONDITIONAL_VIEW** |
| 2026-10-29 | `P73835-B21` | Vendor Attributes | {"listPrice":48922} | **{"listPrice":48922,"Vendor Status Badge":"CS"}** |
| 2026-10-29 | `P73838-B21` | Availability | Available | **CS (vendor status; meaning unverified)** |
| 2026-10-29 | `P73838-B21` | Portal Visibility |  | **PORTAL_CONDITIONAL** |
| 2026-10-29 | `P73838-B21` | Condition Type |  | **PORTAL_CONDITIONAL_VIEW** |
| 2026-10-29 | `P73838-B21` | Vendor Attributes | {"listPrice":58094} | **{"listPrice":58094,"Vendor Status Badge":"CS"}** |

## 🧩 6. Same-Product CTO Variant Matrix

| Chassis Identifier | Product Family | Generation | Form Factor | CTO Base SKU |
|--------------------|----------------|------------|-------------|--------------|
| **DL380_Gen12** | ProLiant | Gen12 | 8SFF | `P73282-B21` |

## 🛠️ 7. Valid Smart Chassis Combinations & Topological Capacity

| Pattern ID | Description | Base Price | Drive Cages | Total Bays | PCIe Slots | Controller |
|---|---|---:|---:|---:|---:|---|
| `dl380pat001b94fb` | 1 drive cage(s) (8SFF x4 U.3 TM Drive Cage) | $1,567 | 1 | 8 | 3 | DA |
| `dl380pat00267c0e` | 1 drive cage(s) (8SFF x4 U.3 TM Drive Cage) + 1 riser card(s) (x8/x16/x8 Secondary Riser) | $1,832 | 1 | 8 | 6 | DA |
| `dl380pat0030031a` | 1 drive cage(s) (8SFF x4 U.3 TM Drive Cage) + 2 riser card(s) (x16/x16/x16 Primary Riser; x16/x16/x16 Secondary Riser) + 4 riser accessory item(s) (x8 Riser Enablement Cable) | $2,530 | 1 | 8 | 6 | DA |
| `dl380pat0041042d` | 1 drive cage(s) (8SFF x1 U.3 TM Drive Cage) + 1 OCP controller(s) (MR416i-o) | $6,020 | 1 | 8 | 3 | MR416I-O |
| `dl380pat0059c6f3` | 1 drive cage(s) (8SFF x1 U.3 TM Drive Cage) + 1 OCP controller(s) (MR408i-o) | $4,920 | 1 | 8 | 3 | MR408I-O |
| `dl380pat00693560` | 1 drive cage(s) (8SFF x1 U.3 TM Drive Cage) + 1 PCIe controller(s) (MR416i-p) | $6,356 | 1 | 8 | 3 | MR416I-P |
| `dl380pat00772cf8` | 1 drive cage(s) (8SFF x1 U.3 TM Drive Cage) + 1 PCIe controller(s) (MR408i-p) | $5,056 | 1 | 8 | 3 | MR408I-P |
| `dl380pat011166bc` | 1 drive cage(s) (8SFF x1 U.3 TM Drive Cage) + 1 riser card(s) (x8/x16/x8 Secondary Riser) + 1 PCIe controller(s) (MR408i-p) | $5,321 | 1 | 8 | 6 | MR408I-P |
| `dl380pat0089a7e1` | 1 drive cage(s) (8SFF x1 U.3 TM Drive Cage) + 1 riser card(s) (x8/x16/x8 Secondary Riser) + 1 OCP controller(s) (MR416i-o) | $6,285 | 1 | 8 | 6 | MR416I-O |
| `dl380pat0096409d` | 1 drive cage(s) (8SFF x1 U.3 TM Drive Cage) + 1 riser card(s) (x8/x16/x8 Secondary Riser) + 1 PCIe controller(s) (MR416i-p) | $6,621 | 1 | 8 | 6 | MR416I-P |
| `dl380pat01073679` | 1 drive cage(s) (8SFF x1 U.3 TM Drive Cage) + 1 riser card(s) (x8/x16/x8 Secondary Riser) + 1 OCP controller(s) (MR408i-o) | $5,185 | 1 | 8 | 6 | MR408I-O |
| `dl380pat0127a94e` | 3 drive cage(s) (8SFF x4 U.3 TM Drive Cage) + 2 riser card(s) (x16/x16/x16 Primary Riser; x16/x16/x16 Secondary Riser) | $6,870 | 3 | 24 | 6 | DA |
| `dl380pat013e4966` | 3 drive cage(s) (8SFF x4 U.3 TM Drive Cage) + 2 riser card(s) (x16/x16/x16 Primary Riser; x16/x16/x16 Secondary Riser) | $4,360 | 3 | 24 | 6 | DA |
| `dl380smtch_1-0` | Smart Chassis Selection: | $0 | 0 | 0 | 3 | DA |
| `dl380smtch_1-1` | Smart Chassis Selection: | $0 | 0 | 0 | 3 | DA |
| `dl380smtch_1-2` | Smart Chassis Selection: | $0 | 0 | 0 | 3 | DA |

## ⭐ 8. Vendor Recommended & Preferred Hardware Options

| Product # | Description | Category | Recommendation Badge | List Price (USD) | Lead Time |
|---|---|---|:---:|---:|---|
| `P01366-B21` | HPE 96W Smart Storage Lithium-ion Battery with 145mm Cable Kit | Storage Controllers | **Recommended** | $110 | Unpublished |
| `P03178-B21` | HPE 1000W Flex Slot Titanium Hot Plug Power Supply Kit | Power Supplies | **Recommended** | $926 | Unpublished |
| `P03178-B21` | HPE 1000W Flex Slot Titanium Hot Plug Power Supply Kit | Power Supplies | **Recommended** | $926 | Unpublished |

## 📦 9. Solution Manifest, EDT & Commercial Baseline

**Configuration Profile**: `OCA Config 2` | **Icon ID**: `I157947987-01` | **Estimated Delivery Time (EDT)**: `24 - 30 days`

| Hardware (USD) | Support (USD) | Services (USD) | Software (USD) | Total Baseline (USD) |
|---:|---:|---:|---:|---:|
| $46,095 | $35,916 | $1,234 | $1,220 | **$84,465** |

### Authoritative Baseline BOM Hierarchy

| Level | Product # | Description | Qty | Unit Price (USD) | Ext. Price (USD) |
|---|---|---|---:|---:|---:|
| (1) | `P73282-B21` | HPE ProLiant Compute DL380 Gen12 SFF NC Configure-to-order Server | 1 | $5,584 | $5,584 |
| (2) | `P73282-B21 B19` | HPE DL380 Gen12 SFF NC Configure-to-order Server | 1 | $0 | $0 |
| (2) | `P74568-B21` | Intel Xeon 6520P 2.4GHz 24-core 210W Processor for HPE | 2 | $4,242 | $8,484 |
| (3) | `P74568-B21 0D1` | Factory Integrated | 2 | $0 | $0 |
| (2) | `P69727-F21` | HPE 32GB (1x32GB) Dual Rank x8 DDR5-6400 CAS-52-52-52 EC8 Registered Smart FIO Memory Kit | 2 | $13,909 | $27,818 |
| (2) | `P51181-B21` | Broadcom BCM5719 Ethernet 1Gb 4-port BASE-T OCP3 Adapter for HPE | 1 | $485 | $485 |
| (3) | `P51181-B21 0D1` | Factory Integrated | 1 | $0 | $0 |
| (2) | `P03178-B21` | HPE 1000W Flex Slot Titanium Hot Plug Power Supply Kit | 2 | $926 | $1,852 |
| (3) | `P03178-B21 0D1` | Factory Integrated | 2 | $0 | $0 |
| (2) | `P78145-B21` | HPE C13 - C14 250V 10Amp 2m FIO Power Cord | 2 | $11 | $22 |
| (2) | `BD505A` | HPE iLO Advanced 1-server License with 3yr Support on iLO Licensed Features | 1 | $469 | $469 |
| (3) | `BD505A 0D1` | Factory Integrated | 1 | $0 | $0 |
| (2) | `S1A05A` | HPE Compute Cloud Management Server FIO Enablement | 1 | $1 | $1 |
| (2) | `P72203-B21` | HPE ProLiant Compute DL3XX/ML350 Gen12 CPU1 to Rear OCP SlotB x8 Cable Kit | 1 | $77 | $77 |
| (3) | `P72203-B21 0D1` | Factory Integrated | 1 | $0 | $0 |
| (2) | `P48820-B21` | HPE ProLiant DL380/DL560 Gen11 2U High Performance Fan Kit | 1 | $972 | $972 |
| (3) | `P48820-B21 0D1` | Factory Integrated | 1 | $0 | $0 |
| (2) | `P52341-B21` | HPE ProLiant DL3XX Gen11 Easy Install Rail 3 Kit | 1 | $164 | $164 |
| (3) | `P52341-B21 0D1` | Factory Integrated | 1 | $0 | $0 |
| (2) | `P73325-B21` | HPE ProLiant Compute Localization FIO Kit | 1 | $4 | $4 |
*... [12 additional baseline items omitted for brevity]*

## ⏱️ 10. Supply Chain & Delivery Lead Time Intelligence

### ⚠️ Supply Chain Verification Advisory (Unpublished Delivery Lead Times)

*The following high-value active components have unpublished delivery estimates in live OCA. Presales engineers must verify distributor buffer stock before quoting committed deployment timelines:*

| Product # | Description | Category | Lead Time Status | Presales Action |
|---|---|---|:---:|---|
| `P71117-B21` | Intel Xeon 6710E 2.4GHz 64-core 205W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P73834-B21` | Intel Xeon 6767P 2.4GHz 64-core 350W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P74508-B21` | Intel Xeon 6714P 4.0GHz 8-core 165W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P74509-B21` | Intel Xeon 6724P 3.6GHz 16-core 210W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P74570-B21` | Intel Xeon 6527P 3.0GHz 24-core 255W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P74571-B21` | Intel Xeon 6530P 2.3GHz 32-core 225W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P74573-B21` | Intel Xeon 6730P 2.5GHz 32-core 250W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P74576-B21` | Intel Xeon 6737P 2.9GHz 32-core 270W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P71118-B21` | Intel Xeon 6731E 2.2GHz 96-core 250W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P71119-B21` | Intel Xeon 6740E 2.4GHz 96-core 250W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P71120-B21` | Intel Xeon 6746E 2.0GHz 112-core 250W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P71121-B21` | Intel Xeon 6756E 1.8GHz 128-core 225W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P71122-B21` | Intel Xeon 6766E 1.9GHz 144-core 250W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P71124-B21` | Intel Xeon 6780E 2.2GHz 144-core 330W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P73829-B21` | Intel Xeon 6740P 2.1GHz 48-core 270W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
*... [359 additional unpublished items omitted for brevity]*

