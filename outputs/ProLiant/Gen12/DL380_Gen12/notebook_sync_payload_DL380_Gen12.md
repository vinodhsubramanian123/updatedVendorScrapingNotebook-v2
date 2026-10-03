# HPE DL380_Gen12 — Synchronized Catalog Knowledge

**Target Product**: `DL380_Gen12`

**Scope Identity**: `HPE/SERVER/ProLiant/Gen12/DL380_Gen12`

**Sync Timestamp**: 2026-10-03T16:48:30.935Z

**Total Verified SKUs**: `1128` (`606` Hardware + `522` Services)

**Total Synced KnowledgeDeltas**: `57`

This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.

---

## 🚀 Executive Delta & Recent Change Summary

| Category | Total SKUs | Added (Last Scrape) | Price Changed | Attribute Changed | Reinstated | Status |
|----------|------------|---------------------|---------------|-------------------|------------|--------|
| **Hardware Components** | 606 | 5 | 0 | 582 | 0 | **CERTIFIED** |
| **Support Services & SLAs** | 522 | 108 | 0 | 408 | 0 | **CERTIFIED** |
| **Total Portfolio** | **1128** | **113** | **0** | **990** | **0** | **ACTIVE** |

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

9. **[DELTA-1786705957681] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If P73282-B21 is present, P73282-B21 is mandatory.
   - **Affected SKU**: `P73282-B21` | **Required Dependency**: `P73282-B21`

10. **[DELTA-1786705957757] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If P74573-B21 is present, P74573-B21 is mandatory.
   - **Affected SKU**: `P74573-B21` | **Required Dependency**: `P74573-B21`

11. **[DELTA-1786705957802] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If P48820-B21 is present, P48820-B21 is mandatory.
   - **Affected SKU**: `P48820-B21` | **Required Dependency**: `P48820-B21`

12. **[DELTA-1786705957846] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If P69728-B21 is present, P69728-B21 is mandatory.
   - **Affected SKU**: `P69728-B21` | **Required Dependency**: `P69728-B21`

13. **[DELTA-1786705957894] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If P47777-B21 is present, P47777-B21 is mandatory.
   - **Affected SKU**: `P47777-B21` | **Required Dependency**: `P47777-B21`

14. **[DELTA-1786705957933] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If P01366-B21 is present, P01366-B21 is mandatory.
   - **Affected SKU**: `P01366-B21` | **Required Dependency**: `P01366-B21`

15. **[DELTA-1786705957977] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If P03178-B21 is present, P03178-B21 is mandatory.
   - **Affected SKU**: `P03178-B21` | **Required Dependency**: `P03178-B21`

16. **[DELTA-1787939245188] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: Portal validation flagged restriction on P76450-B21.
   - **Affected SKU**: `P76449-B21` | **Required Dependency**: `P76450-B21`

17. **[PREPROC-DELTA-1786781599909] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: Confirmed configuration variation reason 'WORKLOAD_NODE_PURPOSE' for config_1
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

18. **[DELTA-1786880389958] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: Intel Xeon 6730P 250W CPU requires HPE ProLiant Compute DL380 Gen12 Performance Heat Sink Kit (P74792-B21) due to exceeding the 185W standard thermal envelope.
   - **Affected SKU**: `P74573-B21` | **Required Dependency**: `P74792-B21`
   - 💡 **Human Engineer Rationale**: *"Agentic Guardrail Loop derived from RAG/DB fact-check"*

19. **[DELTA-1786880394092] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: Intel Xeon 6730P 250W CPU requires HPE ProLiant High Performance Fan Kit (P48820-B21) because it exceeds the 240W system limit for standard chassis fans.
   - **Affected SKU**: `P74573-B21` | **Required Dependency**: `P48820-B21`
   - 💡 **Human Engineer Rationale**: *"Agentic Guardrail Loop derived from RAG/DB fact-check"*

20. **[DELTA-1787315096377] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If P69728-F21 is present, DDR5-6400 is mandatory.
   - **Affected SKU**: `P69728-F21` | **Required Dependency**: `DDR5-6400`

21. **[DELTA_RAG_FIO_P69728-B21_P69728-F21_1788145618089] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: undefined
   - **Affected SKU**: `P69728-B21` | **Required Dependency**: `P69728-F21`

22. **[DELTA_RAG_DEP_P75740-B21_873763-B21_1788145618089] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: undefined
   - **Affected SKU**: `P75740-B21` | **Required Dependency**: `873763-B21`

23. **[DELTA_RAG_DEP_P28586-B21_P75740-B21_1788145618089] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: undefined
   - **Affected SKU**: `P28586-B21` | **Required Dependency**: `P75740-B21`

24. **[DELTA_RAG_DEP_P51083-B21_P74573-B21_1788145618091] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: undefined
   - **Affected SKU**: `P51083-B21` | **Required Dependency**: `P74573-B21`

25. **[DELTA_RAG_DEP_P47777-B21_P01366-B21_1788145618091] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: undefined
   - **Affected SKU**: `P47777-B21` | **Required Dependency**: `P01366-B21`

26. **[DELTA_RAG_DEP_P28586-B21_P40430-B21_1788145618092] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: undefined
   - **Affected SKU**: `P28586-B21` | **Required Dependency**: `P40430-B21`

27. **[DELTA_RAG_DEP_P76453-B21_P75740-B21_1788145618092] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: undefined
   - **Affected SKU**: `P76453-B21` | **Required Dependency**: `P75740-B21`

28. **[DELTA_RAG_FIO_P64707-B21_P69728-F21_1788148383105] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: undefined
   - **Affected SKU**: `P64707-B21` | **Required Dependency**: `P69728-F21`

29. **[DELTA_RAG_DEP_P48818-B21_P38995-B21_1788148383108] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: undefined
   - **Affected SKU**: `P48818-B21` | **Required Dependency**: `P38995-B21`

30. **[DELTA_RAG_DEP_P75740-B21_P75741-B21_1788148383112] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: undefined
   - **Affected SKU**: `P75740-B21` | **Required Dependency**: `P75741-B21`

31. **[DELTA_RAG_CARRYOVER_P47777-B21_1788459469422] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: undefined
   - **Affected SKU**: `P47777-B21` | **Required Dependency**: `N/A`

32. **[DELTA_RAG_DEP_P01366-B21_P48918-B21_1788459469423] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: undefined
   - **Affected SKU**: `P01366-B21` | **Required Dependency**: `P48918-B21`

33. **[DELTA_RAG_DEP_P10180-B21_P72203-B21_1788459469424] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: undefined
   - **Affected SKU**: `P10180-B21` | **Required Dependency**: `P72203-B21`

34. **[DELTA_RAG_DEP_P74573-B21_P48820-B21_1788461136463] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: undefined
   - **Affected SKU**: `P74573-B21` | **Required Dependency**: `P48820-B21`

35. **[DELTA_RAG_DEP_P74573-B21_P74792-B21_1788461136464] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: undefined
   - **Affected SKU**: `P74573-B21` | **Required Dependency**: `P74792-B21`

36. **[DELTA-1788462981839] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: P10180-B21 is obsolete Gen11 SKU for DL380 Gen12; replaced by P51181-B21 with mandatory OCP rear cable kit P72203-B21.
   - **Affected SKU**: `P10180-B21` | **Required Dependency**: `P51181-B21`
   - 💡 **Human Engineer Rationale**: *"Agentic Guardrail Loop derived from RAG/DB fact-check"*

37. **[DELTA_RAG_DEP_P76453-B21_P48918-B21_1788463665182] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: undefined
   - **Affected SKU**: `P76453-B21` | **Required Dependency**: `P48918-B21`

38. **[DELTA_RAG_DEP_P81130-B21_P74787-B21_1790182000001] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: undefined
   - **Affected SKU**: `P81130-B21` | **Required Dependency**: `P74787-B21`

39. **[DELTA_RAG_DEP_P81130-B21_P79555-B21_1790182000002] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: undefined
   - **Affected SKU**: `P81130-B21` | **Required Dependency**: `P79555-B21`

40. **[DELTA_RAG_DEP_P10115-B21_P72203-B21_1790182000003] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: undefined
   - **Affected SKU**: `P10115-B21` | **Required Dependency**: `P72203-B21`

41. **[DELTA_RAG_DEP_P78279-B21_P74755-B21_1790182000004] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: undefined
   - **Affected SKU**: `P78279-B21` | **Required Dependency**: `P74755-B21`

42. **[DELTA_CLIC_RULE_81392332_H200_16PIN_P93055-B21] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: undefined
   - **Affected SKU**: `S3U30C` | **Required Dependency**: `P93055-B21`

43. **[DELTA_CLIC_RULE_81394885_SECONDARY_RISER_25C_AMBIENT] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: undefined
   - **Affected SKU**: `S3U30C` | **Required Dependency**: `P51083-B21`

44. **[DELTA_CLIC_RULE_81393803_STORAGE_CABLE_P76453-B21] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: undefined
   - **Affected SKU**: `P75740-B21` | **Required Dependency**: `P76453-B21`

45. **[LEARN_DL380_GEN12_OEM_DEFAULT_20260930] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: undefined
   - **Affected SKU**: `P77819-B21` | **Required Dependency**: `N/A`

46. **[LEARN_DL380_GEN12_RUNTIME_DISCOVERY_20260930] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: undefined
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

47. **[LEARN_DL380_GEN12_COVERAGE_BOUNDARY_20260930] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: undefined
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

48. **[LEARN_DL380_GEN12_H200_OBSERVED_STATES_20261001] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12 CTO Server`):
   - **Rule**: undefined
   - **Affected SKU**: `S3U30C` | **Required Dependency**: `N/A`


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

4. **[Smart Chassis]**: Supported with EDSFF CTO Server only.
   - **Gated Rule Type**: `CHASSIS_GATE`
   - **Affected SKUs (2)**: `P80997-B21`, `P83356-B21`

5. **[Smart Chassis]**: Selected Smart Chassis Configuration is not valid
   - **Gated Rule Type**: `CHASSIS_GATE`
   - **Affected SKUs (3)**: `dl380smtch_1-0`, `dl380smtch_1-1`, `dl380smtch_1-2`

6. **[Storage Devices]**: Supported with 8LFF and 12LFF CTO Server only.
   - **Gated Rule Type**: `CHASSIS_GATE`
   - **Affected SKUs (6)**: `P76473-B21`, `P76474-B21`, `P77474-B21`, `P77475-B21`, `P77484-B21`, `P77485-B21`

7. **[Storage Devices]**: Supported with 8LFF CTO Server only and requires 2SFF SBS Cage.
   - **Gated Rule Type**: `CHASSIS_GATE`
   - **Affected SKUs (3)**: `P77481-B21`, `P76476-B21`, `P77480-B21`

8. **[Storage Devices]**: Supported with 12EDSFF CTO Server only.
   - **Gated Rule Type**: `CHASSIS_GATE`
   - **Affected SKUs (3)**: `P83798-B21`, `P87968-B21`, `P83799-B21`

9. **[Storage Devices]**: Supported with 8LFF CTO Server only.
   - **Gated Rule Type**: `CHASSIS_GATE`
   - **Affected SKUs (1)**: `P74752-B21`

10. **[Factory Configuration Settings]**: Supported with 12EDSFF CTO Server only.
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

2. **[Smart Chassis]**: Define connection for 8SFF x4 Cage only needed if cage is selected.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (17)**: `cntr8sffx2`, `cntr8sffx4`, `da8sffx2`, `da8sffx4`, `P77955-B21`, `P77958-B21`, `P77931-B21`, `P78064-B21`, `P77934-B21`, `P77937-B21`, `P77940-B21`, `P77961-B21`, `P78070-B21`, `P78047-B21`, `P78058-B21`, `P78061-B21`, `P77943-B21`

3. **[Networking]**: Private Product is not valid for current customer account
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `P74383-B21

    PVT`

4. **[Networking]**: Private Product is not valid for current customer account
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `P89140-B21

    PVT`

5. **[Networking]**: Private Product is not valid for current customer account
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (2)**: `P74606-B21

    PVT`, `P97416-B21

    PVT`

6. **[Graphics Options]**: Private Product is not valid for current customer account
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `S7J51C

    PVT`

7. **[Power Supplies]**: Mixing of Power supplies are not allowed.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (3)**: `P38995-B21`, `P38997-B21`, `P44712-B21`

8. **[Power Supplies]**: If AC Power Supply is selected then only AC Power Cords should be in the drop-down.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `P17023-B21`

9. **[Power Supplies]**: Max quantity of product limited by space available.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (25)**: `AF556A`, `AF557A`, `AF568A`, `AF570A`, `AF573A`, `P78130-B21`, `AF558A`, `AF559A`, `AF560A`, `AF561A`, `AF562A`, `AF564A`, `AF565A`, `AF566A`, `AF567A`, `AF569A`, `AF572A`, `AF591A`, `P78131-B21`, `P78144-B21`, `P78147-B21`, `P78156-B21`, `P78940-B21`, `P78941-B21`, `R1C65A`

10. **[Power Supplies]**: If AC Power Supply is selected then only AC Power Cords should be in the drop-down.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `P22173-B21`

11. **[Private Cloud Business Edition]**: Not Supported ProStack Server Software
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `S7J52A`

12. **[Virtualization]**: Private Product is not valid for current customer account
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (3)**: `S4F94AAE

    PVT`, `S4G00AAE

    PVT`, `S4R76AAE

    PVT`

### CTO vs BTO Factory Integration Rules

1. **[Storage Devices]**: BTO products are not allowed in CTO Base Model.
   - **Gated Rule Type**: `BTO_DISALLOWED`
   - **Affected SKUs (1)**: `701498-B21`

2. **[Storage Devices]**: BTO products are not allowed in CTO Base Model.
   - **Gated Rule Type**: `BTO_DISALLOWED`
   - **Affected SKUs (2)**: `807878-B21`, `666987-B21`

3. **[Networking]**: BTO products are not allowed in CTO Base Model.
   - **Gated Rule Type**: `BTO_DISALLOWED`
   - **Affected SKUs (6)**: `AJ833A`, `AJ836A`, `AJ838A`, `AJ839A`, `AJ834A`, `AJ837A`

4. **[Power Supplies]**: BTO products are not allowed in CTO Base Model.
   - **Gated Rule Type**: `BTO_DISALLOWED`
   - **Affected SKUs (2)**: `A0K02A`, `A0N33A`

## ⚠️ 4. Discontinued & Obsolete SKUs Registry

| SKU | Description | Status | Discontinued Date | Last Known Price | Tracking | Retention |
|-----|-------------|--------|-------------------|------------------|----------|-----------|
| `P77955-B21` | HPE ProLiant Compute DL380 Gen12 16SFF x2 1P Direct Attach FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P77958-B21` | HPE ProLiant Compute DL380 Gen12 16SFF x2 1P Direct Attach Universal Media Bay FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P77931-B21` | HPE ProLiant Compute DL380 Gen12 16SFF x4 Direct Attach Balanced FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P78064-B21` | HPE ProLiant Compute DL380 Gen12 16SFF x4 Direct Attach Multiple Purpose Cage FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $0.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P77934-B21` | HPE ProLiant Compute DL380 Gen12 16SFF x4 Direct Attach Universal Media Bay FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P77937-B21` | HPE ProLiant Compute DL380 Gen12 24SFF x16/x16/x16 OCP Balanced FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P77940-B21` | HPE ProLiant Compute DL380 Gen12 24SFF x16/x16/x16 OCP Gen4 Retimer Card FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P77961-B21` | HPE ProLiant Compute DL380 Gen12 24SFF x2 Direct Attach x16/x16/x16 OCP FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P78070-B21` | HPE ProLiant Compute DL380 Gen12 8SFF x4 1P Direct Attach FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P78047-B21` | HPE ProLiant Compute DL380 Gen12 8SFF x4 Direct Attach Balanced FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P78058-B21` | HPE ProLiant Compute DL380 Gen12 8SFF x4 Direct Attach Multiple Purpose Cage FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $0.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P78061-B21` | HPE ProLiant Compute DL380 Gen12 8SFF x4 Direct Attach UMB Multiple Purpose Cage FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $0.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P77943-B21` | HPE ProLiant Compute DL380 Gen12 Tertiary Riser 24SFF x16/x16/x16 OCP Balanced FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P73282-B21` | HPE ProLiant Compute DL380 Gen12 8SFF NC CTO Server | **REINSTATED** | 2026-09-09 | $5584.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P73283-B21` | HPE ProLiant Compute DL380 Gen12 24SFF NC CTO Server | **REINSTATED** | 2026-09-09 | $5980.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P73284-B21` | HPE ProLiant Compute DL380 Gen12 12LFF NC CTO Server | **REINSTATED** | 2026-09-09 | $6350.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P73285-B21` | HPE ProLiant Compute DL380 Gen12 8LFF NC CTO Server | **REINSTATED** | 2026-09-09 | $6890.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P73286-B21` | HPE ProLiant Compute DL380 Gen12 16EDSFF NC CTO Server | **REINSTATED** | 2026-09-09 | $7120.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P73287-B21` | HPE ProLiant Compute DL380 Gen12 High Power / Telco CTO Server | **DISCONTINUED** | 2026-09-09 | $7450.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P69726-B21` | HPE 16GB (1x16GB) Single Rank x8 DDR5-6400 CAS-52-52-52 EC8 Registered Smart Memory Kit | **DISCONTINUED** | 2026-09-30 | $7439.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P69726-F21` | HPE 16GB (1x16GB) Single Rank x8 DDR5-6400 CAS-52-52-52 EC8 Registered Smart FIO Memory Kit | **DISCONTINUED** | 2026-09-30 | $7439.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `804398-B21` | HPE Smart Array E208e-p SR Gen10 (8 External Lanes/No Cache) 12G SAS PCIe Plug-in Controller | **DISCONTINUED** | 2026-09-30 | $1775.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `339781-B21` | HPE RAID FIO Advanced Data Guarding Option | **DISCONTINUED** | 2026-09-30 | $1.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `389692-B21` | HPE Customer Defined RAID Setting Service | **DISCONTINUED** | 2026-09-30 | $1.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `469774-409` | HPE Remove Standard Power Cords | **DISCONTINUED** | 2026-09-10 | $1.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P60283-B21` | [SHARED_ACCESSORY_VERIFIED target=DL380_Gen12] HPE OEM ProLiant DL380 Gen11 Over Pack FIO Shipping Kit (Class: CABLE; Evidence: CERTIFIED_OCA_CATALOG; Sources: DL380_Gen12_Master_Catalog) | **REINSTATED** | 2026-09-10 | $99.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P73325-B21` | HPE ProLiant Compute Localization FIO Kit | **REINSTATED** | 2026-09-10 | $4.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P52341-B21` | [REMOVED SKU] HPE ProLiant DL3XX Gen11 Easy Install Rail 3 Kit | **REINSTATED** | 2026-08-24 | $164.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P70744-B21` | [REMOVED SKU] HPE ProLiant Compute DL3XX Gen12 2U Cable Management Arm for Rail Kit | **REINSTATED** | 2026-08-24 | $172.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P74748-B21` | [REMOVED SKU] HPE ProLiant Compute DL380 Gen12 System Insight Display Kit | **REINSTATED** | 2026-08-24 | $117.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `Q9R65A` | Red Hat Enterprise Linux for SAP Solutions for Physical Nodes 3yr Subscription 24x7 Support LTU | **REINSTATED** | 2026-09-09 | $6737.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `Q9R66A` | Red Hat Enterprise Linux for SAP Solutions for Physical Nodes 5yr Subscription 24x7 Support LTU | **REINSTATED** | 2026-09-09 | $11229.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `Q9R67A` | Red Hat Enterprise Linux for SAP Solutions for Virtual DC 3yr Subscription 24x7 Support LTU | **REINSTATED** | 2026-09-09 | $24680.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `Q9R68A` | Red Hat Enterprise Linux for SAP Solutions for Virtual DC 5yr Subscription 24x7 Support LTU | **REINSTATED** | 2026-09-09 | $41134.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `AC120A` | HPE Pallet Size Customization Service | **DISCONTINUED** | 2026-09-09 | $7.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `AC129A` | HPE Consolidation Logistic Service | **DISCONTINUED** | 2026-09-09 | $26.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P1F69A` | HPE Delivery Site Above Ground Floor Service | **DISCONTINUED** | 2026-09-09 | $289.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P1F70A` | HPE Forklift at Delivery Service | **DISCONTINUED** | 2026-09-09 | $1399.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P1F71A` | HPE Special Delivery Truck Size Service | **DISCONTINUED** | 2026-09-09 | $292.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P1F72A` | HPE Two People at Delivery SVC | **DISCONTINUED** | 2026-09-09 | $466.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P1F73A` | HPE Campus Delivery Service | **DISCONTINUED** | 2026-09-09 | $104.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P1F74A` | HPE Unloading Logistic Service | **DISCONTINUED** | 2026-09-09 | $350.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P1F75A` | HPE Fixed Delivery Appointment Service | **DISCONTINUED** | 2026-09-09 | $466.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P1F76A` | HPE Pre-Delivery Site Survey SVC | **DISCONTINUED** | 2026-09-09 | $758.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `AC123A` | HPE Special Request/ Equipment Logistic Service | **DISCONTINUED** | 2026-09-09 | $816.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `BQ335A` | HPE Expedite Shipment Small Logistic Service | **DISCONTINUED** | 2026-09-09 | $44.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `BQ337A` | HPE Expedite Shipment Large Logistic Service | **DISCONTINUED** | 2026-09-09 | $100.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |

## 🔄 5. Recent Attribute & Specification Modifications Log

| Timestamp | SKU | Attribute | Old Value | New Value |
|-----------|-----|-----------|-----------|-----------|
| 2026-09-30 | `S4R34A` | HPE Recommended |  | **No** |
| 2026-09-30 | `S4R35A` | HPE Recommended |  | **No** |
| 2026-09-30 | `S4R36A` | HPE Recommended |  | **No** |
| 2026-09-30 | `S4R37A` | HPE Recommended |  | **No** |
| 2026-09-30 | `S4R38A` | HPE Recommended |  | **No** |
| 2026-09-30 | `S4R39A` | HPE Recommended |  | **No** |
| 2026-09-30 | `S4R40A` | HPE Recommended |  | **No** |
| 2026-09-30 | `S4R41A` | HPE Recommended |  | **No** |
| 2026-09-30 | `S4R42A` | HPE Recommended |  | **No** |
| 2026-09-30 | `S4R43A` | HPE Recommended |  | **No** |
| 2026-09-30 | `S4R44A` | HPE Recommended |  | **No** |
| 2026-09-30 | `S4R45A` | HPE Recommended |  | **No** |
| 2026-09-30 | `S4R46A` | HPE Recommended |  | **No** |
| 2026-09-30 | `S4R47A` | HPE Recommended |  | **No** |
| 2026-09-30 | `S4R48A` | HPE Recommended |  | **No** |

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

| Product # | Description | Category | List Price (USD) | Lead Time |
|---|---|---|---:|---|
| `P01366-B21` | HPE 96W Smart Storage Lithium-ion Battery with 145mm Cable Kit | Storage Controllers | $110 | Standard |
| `P03178-B21` | HPE 1000W Flex Slot Titanium Hot Plug Power Supply Kit | Power Supplies | $926 | Standard |

## 📦 9. Solution Manifest, EDT & Commercial Baseline

**Configuration Profile**: `OCA Config 2` | **Icon ID**: `I156472454-01` | **Estimated Delivery Time (EDT)**: `18 - 23 days`

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

