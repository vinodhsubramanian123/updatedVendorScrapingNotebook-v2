# HPE DL380_Gen12_SFF — Synchronized Catalog Knowledge

**Target Product**: `DL380_Gen12_SFF`

**Scope Identity**: `HPE/SERVER/ProLiant/Gen12/DL380_Gen12`

**Sync Timestamp**: 2026-09-06T19:25:36.142Z

**Total Verified SKUs**: `945` (`302` Hardware + `643` Services)

**Total Synced KnowledgeDeltas**: `38`

This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.

---

## 🚀 Executive Delta & Recent Change Summary

| Category | Total SKUs | Added (Last Scrape) | Price Changed | Attribute Changed | Reinstated | Status |
|----------|------------|---------------------|---------------|-------------------|------------|--------|
| **Hardware Components** | 302 | 40 | 0 | 9 | 0 | **CERTIFIED** |
| **Support Services & SLAs** | 643 | 82 | 0 | 0 | 0 | **CERTIFIED** |
| **Total Portfolio** | **945** | **122** | **0** | **9** | **0** | **ACTIVE** |

## 🌐 1. Universal Vendor Rules (HPE)

*No verified universal vendor rules are registered for this product.*

## 🏛️ 2. Family & Generation Rules (ProLiant Gen12)

*No verified family/generation rules are registered for this product.*

## 🎯 3. Chassis & Solution-Type Gotchas (DL380_Gen12_SFF)

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

7. **[DELTA-1787561844831] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: Portal validation flagged restriction on P76453-B21.
   - **Affected SKU**: `P76453-B21` | **Required Dependency**: `N/A`

8. **[DELTA-1786705957681] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If P73282-B21 is present, P73282-B21 is mandatory.
   - **Affected SKU**: `P73282-B21` | **Required Dependency**: `P73282-B21`

9. **[DELTA-1786705957757] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If P74573-B21 is present, P74573-B21 is mandatory.
   - **Affected SKU**: `P74573-B21` | **Required Dependency**: `P74573-B21`

10. **[DELTA-1786705957802] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If P48820-B21 is present, P48820-B21 is mandatory.
   - **Affected SKU**: `P48820-B21` | **Required Dependency**: `P48820-B21`

11. **[DELTA-1786705957846] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If P69728-B21 is present, P69728-B21 is mandatory.
   - **Affected SKU**: `P69728-B21` | **Required Dependency**: `P69728-B21`

12. **[DELTA-1786705957894] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If P47777-B21 is present, P47777-B21 is mandatory.
   - **Affected SKU**: `P47777-B21` | **Required Dependency**: `P47777-B21`

13. **[DELTA-1786705957933] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If P01366-B21 is present, P01366-B21 is mandatory.
   - **Affected SKU**: `P01366-B21` | **Required Dependency**: `P01366-B21`

14. **[DELTA-1786705957977] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If P03178-B21 is present, P03178-B21 is mandatory.
   - **Affected SKU**: `P03178-B21` | **Required Dependency**: `P03178-B21`

15. **[DELTA-1786706928358] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: Portal validation flagged restriction on P76450-B21.
   - **Affected SKU**: `P76449-B21` | **Required Dependency**: `P76450-B21`

16. **[PREPROC-DELTA-1786781599909] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12_SFF CTO Server`):
   - **Rule**: Confirmed configuration variation reason 'WORKLOAD_NODE_PURPOSE' for config_1
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

17. **[DELTA-1786880389958] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: Intel Xeon 6730P 250W CPU requires HPE ProLiant Compute DL380 Gen12 Performance Heat Sink Kit (P74792-B21) due to exceeding the 185W standard thermal envelope.
   - **Affected SKU**: `P74573-B21` | **Required Dependency**: `P74792-B21`
   - 💡 **Human Engineer Rationale**: *"Agentic Guardrail Loop derived from RAG/DB fact-check"*

18. **[DELTA-1786880394092] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: Intel Xeon 6730P 250W CPU requires HPE ProLiant High Performance Fan Kit (P48820-B21) because it exceeds the 240W system limit for standard chassis fans.
   - **Affected SKU**: `P74573-B21` | **Required Dependency**: `P48820-B21`
   - 💡 **Human Engineer Rationale**: *"Agentic Guardrail Loop derived from RAG/DB fact-check"*

19. **[DELTA-1787315096377] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If P69728-F21 is present, DDR5-6400 is mandatory.
   - **Affected SKU**: `P69728-F21` | **Required Dependency**: `DDR5-6400`

20. **[DELTA-1787939245188] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: Portal validation flagged restriction on P76450-B21.
   - **Affected SKU**: `P76449-B21` | **Required Dependency**: `P76450-B21`

21. **[DELTA-1787939298644] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: Portal validation flagged restriction on P76453-B21.
   - **Affected SKU**: `P76453-B21` | **Required Dependency**: `N/A`

22. **[DELTA-1788462981839] DL380_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: P10180-B21 is obsolete Gen11 SKU for DL380 Gen12; replaced by P51181-B21 with mandatory OCP rear cable kit P72203-B21.
   - **Affected SKU**: `P10180-B21` | **Required Dependency**: `P51181-B21`
   - 💡 **Human Engineer Rationale**: *"Agentic Guardrail Loop derived from RAG/DB fact-check"*


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
| `P73282-B21` | HPE ProLiant Compute DL380 Gen12 8SFF NC CTO Server | **REINSTATED** | 2026-08-24 | $5584.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P73283-B21` | HPE ProLiant Compute DL380 Gen12 24SFF NC CTO Server | **REINSTATED** | 2026-08-24 | $5980.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P73284-B21` | HPE ProLiant Compute DL380 Gen12 12LFF NC CTO Server | **REINSTATED** | 2026-08-24 | $6350.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P73285-B21` | HPE ProLiant Compute DL380 Gen12 8LFF NC CTO Server | **REINSTATED** | 2026-08-24 | $6890.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P73286-B21` | HPE ProLiant Compute DL380 Gen12 16EDSFF NC CTO Server | **REINSTATED** | 2026-08-24 | $7120.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P73287-B21` | HPE ProLiant Compute DL380 Gen12 High Power / Telco CTO Server | **REINSTATED** | 2026-08-24 | $7450.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P52341-B21` | [REMOVED SKU] HPE ProLiant DL3XX Gen11 Easy Install Rail 3 Kit | **REINSTATED** | 2026-08-24 | $164.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P70744-B21` | [REMOVED SKU] HPE ProLiant Compute DL3XX Gen12 2U Cable Management Arm for Rail Kit | **REINSTATED** | 2026-08-24 | $172.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P74748-B21` | [REMOVED SKU] HPE ProLiant Compute DL380 Gen12 System Insight Display Kit | **REINSTATED** | 2026-08-24 | $117.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `Q9R65A` | Red Hat Enterprise Linux for SAP Solutions for Physical Nodes 3yr Subscription 24x7 Support LTU | **DISCONTINUED** | 2026-08-24 | $6737.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `Q9R66A` | Red Hat Enterprise Linux for SAP Solutions for Physical Nodes 5yr Subscription 24x7 Support LTU | **DISCONTINUED** | 2026-08-24 | $11229.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `Q9R67A` | Red Hat Enterprise Linux for SAP Solutions for Virtual DC 3yr Subscription 24x7 Support LTU | **DISCONTINUED** | 2026-08-24 | $24680.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `Q9R68A` | Red Hat Enterprise Linux for SAP Solutions for Virtual DC 5yr Subscription 24x7 Support LTU | **DISCONTINUED** | 2026-08-24 | $41134.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `512485-B21` | HPE iLO Advanced 1-server License with 1yr Support on iLO Licensed Features | **DISCONTINUED** | 2026-08-24 | $399.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `BD505A` | HPE iLO Advanced 1-server License with 3yr Support on iLO Licensed Features | **DISCONTINUED** | 2026-08-24 | $469.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `512487-B21` | HPE iLO Advanced AKA Tracking License with 1yr Support on iLO Licensed Features | **DISCONTINUED** | 2026-08-24 | $399.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `BD507A` | HPE iLO Advanced AKA Tracking License with 3yr Support on iLO Licensed Features | **DISCONTINUED** | 2026-08-24 | $469.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `E6U59ABE` | HPE iLO Advanced Electronic License with 1yr Support on iLO Licensed Features | **DISCONTINUED** | 2026-08-24 | $399.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `E6U64ABE` | HPE iLO Advanced Electronic License with 3yr Support on iLO Licensed Features | **DISCONTINUED** | 2026-08-24 | $467.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P77110-B21` | Microsoft Windows Server 2025 1 User CAL WW LTU | **DISCONTINUED** | 2026-08-24 | $72.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P77111-B21` | Microsoft Windows Server 2025 1 Device CAL WW LTU | **DISCONTINUED** | 2026-08-24 | $52.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P77112-B21` | Microsoft Windows Server 2025 5 Users CAL WW LTU | **DISCONTINUED** | 2026-08-24 | $322.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P77113-B21` | Microsoft Windows Server 2025 5 Devices CAL WW LTU | **DISCONTINUED** | 2026-08-24 | $226.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P77114-B21` | Microsoft Windows Server 2025 10 Users CAL WW LTU | **DISCONTINUED** | 2026-08-24 | $636.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P77115-B21` | Microsoft Windows Server 2025 10 Devices CAL WW LTU | **DISCONTINUED** | 2026-08-24 | $444.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P77116-B21` | Microsoft Windows Server 2025 50 Users CAL WW LTU | **DISCONTINUED** | 2026-08-24 | $3143.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P77117-B21` | Microsoft Windows Server 2025 50 Devices CAL WW LTU | **DISCONTINUED** | 2026-08-24 | $2184.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P77118-B21` | Microsoft Windows Server 2025 Remote Desktop Service 1 User CAL WW LTU | **DISCONTINUED** | 2026-08-24 | $280.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P77119-B21` | Microsoft Windows Server 2025 Remote Desktop Service 1 Device CAL WW LTU | **DISCONTINUED** | 2026-08-24 | $201.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P77120-B21` | Microsoft Windows Server 2025 Remote Desktop Service 5 Users CAL WW LTU | **DISCONTINUED** | 2026-08-24 | $1364.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P77121-B21` | Microsoft Windows Server 2025 Remote Desktop Service 5 Devices CAL WW LTU | **DISCONTINUED** | 2026-08-24 | $974.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P77122-B21` | Microsoft Windows Server 2025 Remote Desktop Service 50 Users CAL WW LTU | **DISCONTINUED** | 2026-08-24 | $13566.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P77123-B21` | Microsoft Windows Server 2025 Remote Desktop Service 50 Devices CAL WW LTU | **DISCONTINUED** | 2026-08-24 | $9666.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |

## 🔄 5. Recent Attribute & Specification Modifications Log

| Timestamp | SKU | Attribute | Old Value | New Value |
|-----------|-----|-----------|-----------|-----------|
| 2026-08-24 | `P73285-B21` | Start Date | 2026-08-22 | **2026-08-24** |
| 2026-08-24 | `P73286-B21` | Start Date | 2026-08-22 | **2026-08-24** |
| 2026-08-24 | `P73287-B21` | Start Date | 2026-08-22 | **2026-08-24** |
| 2026-08-24 | `P52341-B21` | Description | [REMOVED SKU] HPE ProLiant DL3XX Gen11 Easy Install Rail 3 Kit | **[REMOVED SKU] [REMOVED SKU] HPE ProLiant DL3XX Gen11 Easy Install Rail 3 Kit** |
| 2026-08-24 | `P70744-B21` | Description | [REMOVED SKU] HPE ProLiant Compute DL3XX Gen12 2U Cable Management Arm for Rail Kit | **[REMOVED SKU] [REMOVED SKU] HPE ProLiant Compute DL3XX Gen12 2U Cable Management Arm for Rail Kit** |
| 2026-08-24 | `P74748-B21` | Description | [REMOVED SKU] HPE ProLiant Compute DL380 Gen12 System Insight Display Kit | **[REMOVED SKU] [REMOVED SKU] HPE ProLiant Compute DL380 Gen12 System Insight Display Kit** |
| 2026-08-24 | `P73282-B21` | Start Date | 2026-08-22 | **2026-08-24** |
| 2026-08-24 | `P73283-B21` | Start Date | 2026-08-22 | **2026-08-24** |
| 2026-08-24 | `P73284-B21` | Start Date | 2026-08-22 | **2026-08-24** |
| 2026-08-24 | `P73285-B21` | Start Date | 2026-08-22 | **2026-08-24** |
| 2026-08-24 | `P73286-B21` | Start Date | 2026-08-22 | **2026-08-24** |
| 2026-08-24 | `P73287-B21` | Start Date | 2026-08-22 | **2026-08-24** |
| 2026-08-24 | `P52341-B21` | Description | [REMOVED SKU] HPE ProLiant DL3XX Gen11 Easy Install Rail 3 Kit | **[REMOVED SKU] [REMOVED SKU] HPE ProLiant DL3XX Gen11 Easy Install Rail 3 Kit** |
| 2026-08-24 | `P70744-B21` | Description | [REMOVED SKU] HPE ProLiant Compute DL3XX Gen12 2U Cable Management Arm for Rail Kit | **[REMOVED SKU] [REMOVED SKU] HPE ProLiant Compute DL3XX Gen12 2U Cable Management Arm for Rail Kit** |
| 2026-08-24 | `P74748-B21` | Description | [REMOVED SKU] HPE ProLiant Compute DL380 Gen12 System Insight Display Kit | **[REMOVED SKU] [REMOVED SKU] HPE ProLiant Compute DL380 Gen12 System Insight Display Kit** |

## 🧩 6. Same-Product CTO Variant Matrix

| Chassis Identifier | Product Family | Generation | Form Factor | CTO Base SKU |
|--------------------|----------------|------------|-------------|--------------|
| **DL380_Gen12** | ProLiant | Gen12 | 8SFF | `P73282-B21` |

