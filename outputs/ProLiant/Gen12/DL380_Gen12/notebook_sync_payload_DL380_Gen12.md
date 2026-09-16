# HPE DL380_Gen12 — Synchronized Catalog Knowledge

**Target Product**: `DL380_Gen12`

**Scope Identity**: `HPE/SERVER/ProLiant/Gen12/DL380_Gen12`

**Sync Timestamp**: 2026-09-16T19:35:16.587Z

**Total Verified SKUs**: `1022` (`605` Hardware + `417` Services)

**Total Synced KnowledgeDeltas**: `37`

This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.

---

## 🚀 Executive Delta & Recent Change Summary

| Category | Total SKUs | Added (Last Scrape) | Price Changed | Attribute Changed | Reinstated | Status |
|----------|------------|---------------------|---------------|-------------------|------------|--------|
| **Hardware Components** | 605 | 133 | 0 | 29 | 0 | **CERTIFIED** |
| **Support Services & SLAs** | 417 | 0 | 0 | 0 | 0 | **CERTIFIED** |
| **Total Portfolio** | **1022** | **133** | **0** | **29** | **0** | **ACTIVE** |

## 🌐 1. Universal Vendor Rules (HPE)

*No verified universal vendor rules are registered for this product.*

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
| 2026-09-13 | `P46171-A21` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P77102-291` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P77102-B21` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P77101-AA1` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P77101-AB1` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P77101-291` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P77101-021` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P77101-A21` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P77101-371` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P77100-AA1` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P77100-AB1` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P77100-291` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P77100-021` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P77100-A21` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P77100-371` | Component Role |  | **Operating System / License** |

## 🧩 6. Same-Product CTO Variant Matrix

| Chassis Identifier | Product Family | Generation | Form Factor | CTO Base SKU |
|--------------------|----------------|------------|-------------|--------------|
| **DL380_Gen12** | ProLiant | Gen12 | 8SFF | `P73282-B21` |

