# HPE OCA Catalog Intelligence — Synchronized Knowledge & Rules Charter

**Target Product**: `DL380_Gen12_SFF`  
**Sync Timestamp**: 2026-08-24T14:01:21.386Z  
**Total Verified SKUs**: `945` (`302` Hardware + `643` Services)  
**Total Synced KnowledgeDeltas**: `13`  

This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.

---

## 🚀 Executive Delta & Recent Change Summary

| Category | Total SKUs | Added (Last Scrape) | Price Changed | Attribute Changed | Reinstated | Status |
|----------|------------|---------------------|---------------|-------------------|------------|--------|
| **Hardware Components** | 302 | 40 | 0 | 9 | 6 | **CERTIFIED** |
| **Support Services & SLAs** | 643 | 82 | 0 | 0 | 0 | **CERTIFIED** |
| **Total Portfolio** | **945** | **122** | **0** | **9** | **6** | **ACTIVE** |

### 🔍 Key Configuration & Physical Pre-Check Highlights:
- **Compute & Thermal**: Validates TDP heatsink class (>240W requires high-performance fan kits).
- **Memory Channels**: Enforces 1DPC / 2DPC symmetry and balanced population across memory controllers.
- **Storage Tri-Mode**: Backplane and controller pairing validation (e.g. MR416i-p / SR932i-p require dedicated Box 1/2 Cable Kit `P76453-B21`).
- **Support Services**: Complete lifecycle coverage across HPE Pointnext Complete Care and Tech Care Essential SLAs.

---

## 🌐 1. Universal Vendor Rules (Applies Across All HPE Product Lines)

*No universal vendor restrictions logged yet. Baseline CTO/BTO mode rules active.*

## 🏛️ 2. Family & Generation Rules (ProLiant / Alletra / Synergy)

1. **[DELTA-1787561844831] DL380_Gen12_SFF**: Portal validation flagged restriction on P76453-B21. *(Affected SKU: P76453-B21)*
2. **[DELTA-1787315096377] DL380_Gen12_SFF**: If P69728-F21 is present, DDR5-6400 is mandatory. *(Affected SKU: P69728-F21)*

## 🎯 3. Chassis & Solution-Type Gotchas (DL380_Gen12_SFF)

1. **[DELTA-1786705957681] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If P73282-B21 is present, P73282-B21 is mandatory.
   - **Affected SKU**: `P73282-B21` | **Required Dependency**: `P73282-B21` 

2. **[DELTA-1786705957757] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If P74573-B21 is present, P74573-B21 is mandatory.
   - **Affected SKU**: `P74573-B21` | **Required Dependency**: `P74573-B21` 

3. **[DELTA-1786705957802] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If P48820-B21 is present, P48820-B21 is mandatory.
   - **Affected SKU**: `P48820-B21` | **Required Dependency**: `P48820-B21` 

4. **[DELTA-1786705957846] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If P69728-B21 is present, P69728-B21 is mandatory.
   - **Affected SKU**: `P69728-B21` | **Required Dependency**: `P69728-B21` 

5. **[DELTA-1786705957894] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If P47777-B21 is present, P47777-B21 is mandatory.
   - **Affected SKU**: `P47777-B21` | **Required Dependency**: `P47777-B21` 

6. **[DELTA-1786705957933] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If P01366-B21 is present, P01366-B21 is mandatory.
   - **Affected SKU**: `P01366-B21` | **Required Dependency**: `P01366-B21` 

7. **[DELTA-1786705957977] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If P03178-B21 is present, P03178-B21 is mandatory.
   - **Affected SKU**: `P03178-B21` | **Required Dependency**: `P03178-B21` 

8. **[DELTA-1786706928358] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: Portal validation flagged restriction on P76450-B21.
   - **Affected SKU**: `P76449-B21` | **Required Dependency**: `P76450-B21` 

9. **[PREPROC-DELTA-1786781599909] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12_SFF CTO Server`):
   - **Rule**: Confirmed configuration variation reason 'WORKLOAD_NODE_PURPOSE' for config_1
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A` 

10. **[DELTA-1786880389958] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: Intel Xeon 6730P 250W CPU requires HPE ProLiant Compute DL380 Gen12 Performance Heat Sink Kit (P74792-B21) due to exceeding the 185W standard thermal envelope.
   - **Affected SKU**: `P74573-B21` | **Required Dependency**: `P74792-B21` 
   - 💡 **Human Engineer Rationale**: *"Agentic Guardrail Loop derived from RAG/DB fact-check"*

11. **[DELTA-1786880394092] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: Intel Xeon 6730P 250W CPU requires HPE ProLiant High Performance Fan Kit (P48820-B21) because it exceeds the 240W system limit for standard chassis fans.
   - **Affected SKU**: `P74573-B21` | **Required Dependency**: `P48820-B21` 
   - 💡 **Human Engineer Rationale**: *"Agentic Guardrail Loop derived from RAG/DB fact-check"*


## ⚠️ 4. Discontinued & Obsolete SKUs Registry

| SKU | Description | Status | Discontinued Date | Last Known Price |
|-----|-------------|--------|-------------------|------------------|
| `P77955-B21` | HPE ProLiant Compute DL380 Gen12 16SFF x2 1P Direct Attach FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 |
| `P77958-B21` | HPE ProLiant Compute DL380 Gen12 16SFF x2 1P Direct Attach Universal Media Bay FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 |
| `P77931-B21` | HPE ProLiant Compute DL380 Gen12 16SFF x4 Direct Attach Balanced FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 |
| `P78064-B21` | HPE ProLiant Compute DL380 Gen12 16SFF x4 Direct Attach Multiple Purpose Cage FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $0.00 |
| `P77934-B21` | HPE ProLiant Compute DL380 Gen12 16SFF x4 Direct Attach Universal Media Bay FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 |
| `P77937-B21` | HPE ProLiant Compute DL380 Gen12 24SFF x16/x16/x16 OCP Balanced FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 |
| `P77940-B21` | HPE ProLiant Compute DL380 Gen12 24SFF x16/x16/x16 OCP Gen4 Retimer Card FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 |
| `P77961-B21` | HPE ProLiant Compute DL380 Gen12 24SFF x2 Direct Attach x16/x16/x16 OCP FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 |
| `P78070-B21` | HPE ProLiant Compute DL380 Gen12 8SFF x4 1P Direct Attach FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 |
| `P78047-B21` | HPE ProLiant Compute DL380 Gen12 8SFF x4 Direct Attach Balanced FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 |
| `P78058-B21` | HPE ProLiant Compute DL380 Gen12 8SFF x4 Direct Attach Multiple Purpose Cage FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $0.00 |
| `P78061-B21` | HPE ProLiant Compute DL380 Gen12 8SFF x4 Direct Attach UMB Multiple Purpose Cage FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $0.00 |
| `P77943-B21` | HPE ProLiant Compute DL380 Gen12 Tertiary Riser 24SFF x16/x16/x16 OCP Balanced FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 |
| `P73282-B21` | HPE ProLiant Compute DL380 Gen12 8SFF NC CTO Server | **REINSTATED** | 2026-08-24 | $5584.00 |
| `P73283-B21` | HPE ProLiant Compute DL380 Gen12 24SFF NC CTO Server | **REINSTATED** | 2026-08-24 | $5980.00 |
| `P73284-B21` | HPE ProLiant Compute DL380 Gen12 12LFF NC CTO Server | **REINSTATED** | 2026-08-24 | $6350.00 |
| `P73285-B21` | HPE ProLiant Compute DL380 Gen12 8LFF NC CTO Server | **REINSTATED** | 2026-08-24 | $6890.00 |
| `P73286-B21` | HPE ProLiant Compute DL380 Gen12 16EDSFF NC CTO Server | **REINSTATED** | 2026-08-24 | $7120.00 |
| `P73287-B21` | HPE ProLiant Compute DL380 Gen12 High Power / Telco CTO Server | **REINSTATED** | 2026-08-24 | $7450.00 |
| `P52341-B21` | HPE ProLiant DL3XX Gen11 Easy Install Rail 3 Kit | **REINSTATED** | 2026-08-22 | $164.00 |
| `P70744-B21` | HPE ProLiant Compute DL3XX Gen12 2U Cable Management Arm for Rail Kit | **REINSTATED** | 2026-08-22 | $172.00 |
| `P74748-B21` | HPE ProLiant Compute DL380 Gen12 System Insight Display Kit | **REINSTATED** | 2026-08-22 | $117.00 |
| `Q9R65A` | Red Hat Enterprise Linux for SAP Solutions for Physical Nodes 3yr Subscription 24x7 Support LTU | **DISCONTINUED** | 2026-08-24 | $6737.00 |
| `Q9R66A` | Red Hat Enterprise Linux for SAP Solutions for Physical Nodes 5yr Subscription 24x7 Support LTU | **DISCONTINUED** | 2026-08-24 | $11229.00 |
| `Q9R67A` | Red Hat Enterprise Linux for SAP Solutions for Virtual DC 3yr Subscription 24x7 Support LTU | **DISCONTINUED** | 2026-08-24 | $24680.00 |
| `Q9R68A` | Red Hat Enterprise Linux for SAP Solutions for Virtual DC 5yr Subscription 24x7 Support LTU | **DISCONTINUED** | 2026-08-24 | $41134.00 |
| `512485-B21` | HPE iLO Advanced 1-server License with 1yr Support on iLO Licensed Features | **DISCONTINUED** | 2026-08-24 | $399.00 |
| `BD505A` | HPE iLO Advanced 1-server License with 3yr Support on iLO Licensed Features | **DISCONTINUED** | 2026-08-24 | $469.00 |
| `512487-B21` | HPE iLO Advanced AKA Tracking License with 1yr Support on iLO Licensed Features | **DISCONTINUED** | 2026-08-24 | $399.00 |
| `BD507A` | HPE iLO Advanced AKA Tracking License with 3yr Support on iLO Licensed Features | **DISCONTINUED** | 2026-08-24 | $469.00 |
| `E6U59ABE` | HPE iLO Advanced Electronic License with 1yr Support on iLO Licensed Features | **DISCONTINUED** | 2026-08-24 | $399.00 |
| `E6U64ABE` | HPE iLO Advanced Electronic License with 3yr Support on iLO Licensed Features | **DISCONTINUED** | 2026-08-24 | $467.00 |
| `P77110-B21` | Microsoft Windows Server 2025 1 User CAL WW LTU | **DISCONTINUED** | 2026-08-24 | $72.00 |
| `P77111-B21` | Microsoft Windows Server 2025 1 Device CAL WW LTU | **DISCONTINUED** | 2026-08-24 | $52.00 |
| `P77112-B21` | Microsoft Windows Server 2025 5 Users CAL WW LTU | **DISCONTINUED** | 2026-08-24 | $322.00 |
| `P77113-B21` | Microsoft Windows Server 2025 5 Devices CAL WW LTU | **DISCONTINUED** | 2026-08-24 | $226.00 |
| `P77114-B21` | Microsoft Windows Server 2025 10 Users CAL WW LTU | **DISCONTINUED** | 2026-08-24 | $636.00 |
| `P77115-B21` | Microsoft Windows Server 2025 10 Devices CAL WW LTU | **DISCONTINUED** | 2026-08-24 | $444.00 |
| `P77116-B21` | Microsoft Windows Server 2025 50 Users CAL WW LTU | **DISCONTINUED** | 2026-08-24 | $3143.00 |
| `P77117-B21` | Microsoft Windows Server 2025 50 Devices CAL WW LTU | **DISCONTINUED** | 2026-08-24 | $2184.00 |
| `P77118-B21` | Microsoft Windows Server 2025 Remote Desktop Service 1 User CAL WW LTU | **DISCONTINUED** | 2026-08-24 | $280.00 |
| `P77119-B21` | Microsoft Windows Server 2025 Remote Desktop Service 1 Device CAL WW LTU | **DISCONTINUED** | 2026-08-24 | $201.00 |
| `P77120-B21` | Microsoft Windows Server 2025 Remote Desktop Service 5 Users CAL WW LTU | **DISCONTINUED** | 2026-08-24 | $1364.00 |
| `P77121-B21` | Microsoft Windows Server 2025 Remote Desktop Service 5 Devices CAL WW LTU | **DISCONTINUED** | 2026-08-24 | $974.00 |
| `P77122-B21` | Microsoft Windows Server 2025 Remote Desktop Service 50 Users CAL WW LTU | **DISCONTINUED** | 2026-08-24 | $13566.00 |
| `P77123-B21` | Microsoft Windows Server 2025 Remote Desktop Service 50 Devices CAL WW LTU | **DISCONTINUED** | 2026-08-24 | $9666.00 |

## 🔄 5. Recent Attribute & Specification Modifications Log

| Timestamp | SKU | Attribute | Old Value | New Value |
|-----------|-----|-----------|-----------|-----------|
| 2026-08-24 | `P52341-B21` | Start Date | 11/10/2022 | **** |
| 2026-08-24 | `P70744-B21` | Description | [REMOVED SKU] HPE ProLiant Compute DL3XX Gen12 2U Cable Management Arm for Rail Kit | **HPE ProLiant Compute DL3XX Gen12 2U Cable Management Arm for Rail Kit** |
| 2026-08-24 | `P70744-B21` | Constraint | Discontinued | **** |
| 2026-08-24 | `P70744-B21` | Rule/Note | [DISCONTINUED] SKU removed from latest HPE OCA portal catalog | **** |
| 2026-08-24 | `P70744-B21` | Max Qty | 0 | **** |
| 2026-08-24 | `P70744-B21` | Component Role | Discontinued Hardware | **** |
| 2026-08-24 | `P70744-B21` | HPE Recommended | No | **** |
| 2026-08-24 | `P70744-B21` | Start Date | 02/24/2025 | **** |
| 2026-08-24 | `P74748-B21` | Description | [REMOVED SKU] HPE ProLiant Compute DL380 Gen12 System Insight Display Kit | **HPE ProLiant Compute DL380 Gen12 System Insight Display Kit** |
| 2026-08-24 | `P74748-B21` | Constraint | Discontinued | **** |
| 2026-08-24 | `P74748-B21` | Rule/Note | [DISCONTINUED] SKU removed from latest HPE OCA portal catalog | **** |
| 2026-08-24 | `P74748-B21` | Max Qty | 0 | **** |
| 2026-08-24 | `P74748-B21` | Component Role | Discontinued Hardware | **** |
| 2026-08-24 | `P74748-B21` | HPE Recommended | No | **** |
| 2026-08-24 | `P74748-B21` | Start Date | 02/24/2025 | **** |

## 🧩 6. Cross-Chassis Variant & Platform Benchmark Matrix

| Chassis Identifier | Product Family | Generation | Form Factor | CTO Base SKU |
|--------------------|----------------|------------|-------------|--------------|
| **DL380_Gen12_SFF** | ProLiant | Gen12 | 8SFF | `P73282-B21` |
| **DL380_Gen11** | ProLiant | Gen11 | 8SFF | `P52534-B21` |
| **MSL3040_Tape** | StoreEver | Gen1 | Rack | `Q6Q67A` |
| **GX5000_General_RACK** | Cray | Gen1 | Rack | `P57100-B21` |
| **SY100Gb_F32_Module** | Synergy | Gen1 | Blade | `864273-B21` |
| **Alletra_Storage_System** | Alletra | Gen1 | Array | `R0Q21A` |
| **P73282-B21** | ProLiant | Gen12 | 8SFF | `P73282-B21` |
| **P73283-B21** | ProLiant | Gen12 | 24SFF | `P73283-B21` |
| **P73284-B21** | ProLiant | Gen12 | 12LFF | `P73284-B21` |
| **P73285-B21** | ProLiant | Gen12 | 8LFF | `P73285-B21` |
| **P73286-B21** | ProLiant | Gen12 | 16EDSFF | `P73286-B21` |
| **P73287-B21** | ProLiant | Gen12 | High Power | `P73287-B21` |
| **P52534-B21** | ProLiant | Gen11 | 8SFF | `P52534-B21` |
| **P52535-B21** | ProLiant | Gen11 | 12LFF | `P52535-B21` |
| **P52536-B21** | ProLiant | Gen11 | 24EDSFF | `P52536-B21` |
| **P52537-B21** | ProLiant | Gen11 | 8SFF NVMe | `P52537-B21` |
| **R0Q35A** | Alletra | Storage | Storage Chassis | `R0Q35A` |
| **R0Q36A** | Alletra | Storage | Storage Chassis | `R0Q36A` |
| **R0Q37A** | Alletra | Storage | Storage Controller | `R0Q37A` |
| **P48820-B21** | Cray | General | Blade | `P48820-B21` |
| **P48821-B21** | Cray | General | 4U Rack | `P48821-B21` |
| **Q2R41A** | StoreEver | Tape | Base Module | `Q2R41A` |
| **Q2R42A** | StoreEver | Tape | Expansion Module | `Q2R42A` |
| **P25902-B21** | Synergy | General | Compute Module | `P25902-B21` |
| **797740-B21** | Synergy | General | Frame Chassis | `797740-B21` |
| **P06584-B21** | Synergy | General | Interconnect Module | `P06584-B21` |

