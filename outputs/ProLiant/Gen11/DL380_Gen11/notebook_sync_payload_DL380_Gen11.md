# HPE OCA Catalog Intelligence — Synchronized Knowledge & Rules Charter

**Target Product**: `DL380_Gen11`  
**Sync Timestamp**: 2026-08-29T18:13:10.436Z  
**Total Verified SKUs**: `1541` (`504` Hardware + `1037` Services)  
**Total Synced KnowledgeDeltas**: `28`  

This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.

---

## 🚀 Executive Delta & Recent Change Summary

| Category | Total SKUs | Added (Last Scrape) | Price Changed | Attribute Changed | Reinstated | Status |
|----------|------------|---------------------|---------------|-------------------|------------|--------|
| **Hardware Components** | 504 | 31 | 0 | 22 | 0 | **CERTIFIED** |
| **Support Services & SLAs** | 1037 | 26 | 3 | 0 | 0 | **CERTIFIED** |
| **Total Portfolio** | **1541** | **57** | **3** | **22** | **0** | **ACTIVE** |

### 🔍 Key Configuration & Physical Pre-Check Highlights:
- **Compute & Thermal**: Validates TDP heatsink class (>240W requires high-performance fan kits).
- **Memory Channels**: Enforces 1DPC / 2DPC symmetry and balanced population across memory controllers.
- **Storage Tri-Mode**: Backplane and controller pairing validation (e.g. MR416i-p / SR932i-p require dedicated Box 1/2 Cable Kit `P76453-B21`).
- **Support Services**: Complete lifecycle coverage across HPE Pointnext Complete Care and Tech Care Essential SLAs.

---

## 🌐 1. Universal Vendor Rules (Applies Across All HPE Product Lines)

1. **[DELTA-1787856163549]**: If PORTAL is present, P64707-B21 is mandatory. *(Type: TEMPORARY_SUPPLY_CONSTRAINT)*

## 🏛️ 2. Family & Generation Rules (ProLiant / Alletra / Synergy)

1. **[DELTA-1787856163365] DL380_Gen11**: If PORTAL is present, P52534-B21 is mandatory. *(Affected SKU: PORTAL)*
2. **[DELTA-1787856163672] DL380_Gen11**: Portal validation flagged restriction on PORTAL. *(Affected SKU: PORTAL)*
3. **[DELTA-1787856163759] DL380_Gen11**: If PORTAL is present, P58335-B21 is mandatory. *(Affected SKU: PORTAL)*
4. **[DELTA_CLIC_81354632_DL380_GEN11] DL380_Gen11**: If P48832-B21 (Tri-Mode Splitter Cable) is selected, P48814-B21 (8SFF U.3 Premium Cage) is mandatory. *(Affected SKU: P48832-B21)*
5. **[DELTA_CLIC_81354652_DL380_GEN11] DL380_Gen11**: If P02377-B21 / P01366-B21 (Capacitor/Battery) is selected, P48918-B21 (Storage Controller Enablement Cable Kit) is mandatory. *(Affected SKU: P02377-B21)*
6. **[DELTA_CLIC_81355854_DL380_GEN11] DL380_Gen11**: P51911-B21 and P48830-B21 cannot be selected together. Retain P48830-B21. *(Affected SKU: P51911-B21)*
7. **[DELTA_CLIC_81016755_DL380_GEN11] DL380_Gen11**: When 5+ PCIe cards are installed, P56073-B21 Primary Cable Kit is mandatory for Primary Riser Slot 1. *(Affected SKU: P48803-B21)*
8. **[DELTA_CLIC_EU_LOT9_P35876_DL380_GEN11] DL380_Gen11**: When ordering Platinum PSUs (P38997-B21) on high-draw dual-socket configurations, P35876-B21 (CE Mark Removal Kit) is required for non-EU deployment, or upgrade to Titanium PSUs (P44712-B21). *(Affected SKU: P38997-B21)*
9. **[DELTA_RAG_DEP_P02377-B21_P48918-B21_1787913302880] DL380 Gen11**: undefined *(Affected SKU: P02377-B21)*
10. **[DELTA-1787561844831] DL380_Gen12_SFF**: Portal validation flagged restriction on P76453-B21. *(Affected SKU: P76453-B21)*
11. **[DELTA-1787315096377] DL380_Gen12_SFF**: If P69728-F21 is present, DDR5-6400 is mandatory. *(Affected SKU: P69728-F21)*
12. **[DELTA-1787939245188] DL380_Gen12**: Portal validation flagged restriction on P76450-B21. *(Affected SKU: P76449-B21)*
13. **[DELTA-1787939298644] DL380_Gen12**: Portal validation flagged restriction on P76453-B21. *(Affected SKU: P76453-B21)*

## 🎯 3. Chassis & Solution-Type Gotchas (DL380_Gen11)

*No specific gotchas logged for DL380_Gen11. Baseline chassis layout rules active.*

## ⚠️ 4. Discontinued & Obsolete SKUs Registry

| SKU | Description | Status | Discontinued Date | Last Known Price |
|-----|-------------|--------|-------------------|------------------|
| `P52534-B21` | HPE ProLiant DL380 Gen11 8SFF Configure-to-order Server | **REINSTATED** | 2026-08-28 | $1650.00 |
| `P52535-B21` | HPE ProLiant DL380 Gen11 24SFF Configure-to-order Server | **REINSTATED** | 2026-08-28 | $2100.00 |
| `P52536-B21` | HPE ProLiant DL380 Gen11 24EDSFF Configure-to-order Server | **REINSTATED** | 2026-08-28 | $2250.00 |
| `P52537-B21` | HPE ProLiant DL380 Gen11 8SFF NVMe Configure-to-order Server | **REINSTATED** | 2026-08-28 | $2050.00 |
| `P52532-B21` | HPE ProLiant DL380 Gen11 8LFF Configure-to-order Server | **REINSTATED** | 2026-08-28 | $1750.00 |
| `P52533-B21` | HPE ProLiant DL380 Gen11 12LFF Configure-to-order Server | **REINSTATED** | 2026-08-28 | $1900.00 |
| `P22020-B21` | HPE DL38X Gen10 Plus 2U Cable Management Arm for Rail Kit | **REINSTATED** | 2026-08-28 | $89.00 |
| `P52341-B21` | HPE ProLiant DL3XX Gen11 Easy Install Rail 3 Kit | **REINSTATED** | 2026-08-28 | $164.00 |
| `AC120A` | HPE Pallet Size Customization Service | **REINSTATED** | 2026-08-28 | $7.00 |
| `AC121A` | Non Working Day Delivery SVC | **REINSTATED** | 2026-08-28 | $104.00 |
| `AC129A` | HPE Consolidation Logistic Service | **REINSTATED** | 2026-08-28 | $26.00 |
| `P1F69A` | HPE Delivery Site Above Ground Floor Service | **REINSTATED** | 2026-08-28 | $289.00 |
| `P1F70A` | HPE Forklift at Delivery Service | **REINSTATED** | 2026-08-28 | $1399.00 |
| `P1F71A` | HPE Special Delivery Truck Size Service | **REINSTATED** | 2026-08-28 | $292.00 |
| `P1F72A` | HPE Two People at Delivery SVC | **REINSTATED** | 2026-08-28 | $466.00 |
| `P1F73A` | HPE Campus Delivery Service | **REINSTATED** | 2026-08-28 | $104.00 |
| `P1F74A` | HPE Unloading Logistic Service | **REINSTATED** | 2026-08-28 | $350.00 |
| `P1F75A` | HPE Fixed Delivery Appointment Service | **REINSTATED** | 2026-08-28 | $466.00 |
| `AC123A` | HPE Special Request/ Equipment Logistic Service | **REINSTATED** | 2026-08-28 | $816.00 |
| `BQ335A` | HPE Expedite Shipment Small Logistic Service | **REINSTATED** | 2026-08-28 | $44.00 |
| `BQ337A` | HPE Expedite Shipment Large Logistic Service | **REINSTATED** | 2026-08-28 | $100.00 |
| `P1F77A` | HPE Post-Delivery Waste Removal SVC | **REINSTATED** | 2026-08-28 | $116.00 |
| `P52534-B21` | HPE ProLiant DL380 Gen11 8SFF NC Configure-to-order Server | **DISCONTINUED** | 2026-08-28 | $1.00 |
| `HU4B2A3` | HPE 3Y Tech Care Basic Service | **DISCONTINUED** | 2026-08-28 | $1.00 |
| `HU4B2A300DK` | HPE DL380 Gen11 Support | **DISCONTINUED** | 2026-08-28 | $1.00 |
| `HK033A1` | HPE MCS Deployment Unit of SVC | **DISCONTINUED** | 2026-08-28 | $100.00 |
| `H6B14A1` | HPE Svr OS Patch Analysis 1st Inst SVC | **DISCONTINUED** | 2026-08-28 | $1810.00 |
| `H2S79A1` | HPE Remot NW Conf and IntHr BusHrs SVC | **DISCONTINUED** | 2026-08-28 | $250.00 |
| `H29BRA1` | HPE Cray Team Day SVC | **DISCONTINUED** | 2026-08-28 | $3274.00 |
| `HU7D2A1` | HPE Synergy Ecosystem Health Review SVC | **DISCONTINUED** | 2026-08-28 | $3451.00 |
| `HM0C3A1` | HPE OS Re-Inst for HANA T1-3 AH Rmt1 SVC | **DISCONTINUED** | 2026-08-28 | $8407.00 |
| `H33XSA1` | HPE Education - Learning Credits 1Yr SVC | **DISCONTINUED** | 2026-08-28 | $100.00 |
| `H33XVA3` | HPE Education - Learning Credits 3Yr SVC | **DISCONTINUED** | 2026-08-28 | $100.00 |
| `H33XWA4` | HPE Education - Learning Credits 4Yr SVC | **DISCONTINUED** | 2026-08-28 | $100.00 |
| `H33XXA5` | HPE Education - Learning Credits 5Yr SVC | **DISCONTINUED** | 2026-08-28 | $100.00 |
| `HA0Z0A1` | HPE DL 1Yr Other 1GB Content Hosted SVC | **DISCONTINUED** | 2026-08-28 | $1620.00 |
| `H33XTA2` | HPE Education - Learning Credits 2Yr SVC | **DISCONTINUED** | 2026-08-28 | $100.00 |
| `HR2R4A1` | HPE Digital Learner Bronze 1Yr Subs SVC | **DISCONTINUED** | 2026-08-28 | $4000.00 |
| `HR2R5A1` | HPE Digital Learner Silver 1Yr Subs SVC | **DISCONTINUED** | 2026-08-28 | $5000.00 |
| `HR2R6A1` | HPE Digital Learner Gold 1Yr Subs SVC | **DISCONTINUED** | 2026-08-28 | $8000.00 |
| `HV9V8A1` | HPE Digital Learner SMB 1Yr Subs SVC | **DISCONTINUED** | 2026-08-28 | $1300.00 |
| `H36VWA1` | HPE Storage VM Migration 50 VM SVC | **DISCONTINUED** | 2026-08-28 | $17520.00 |
| `H36VXA1` | HPE Storage VM Migration 150 VM SVC | **DISCONTINUED** | 2026-08-28 | $29760.00 |
| `H36WBA1` | HPE Storage VM Migration 5 VM Zerto SVC | **DISCONTINUED** | 2026-08-28 | $7140.00 |
| `H36WNA1` | HPE AI Soltns and Platfrms 5 Day Rem SVC | **DISCONTINUED** | 2026-08-28 | $13800.00 |
| `H36WMA1` | HPE AI Solns and Pltfrms 5 Day Onste SVC | **DISCONTINUED** | 2026-08-28 | $23400.00 |
| `H36WQA1` | HPE AI Soltns and Platfrms 1 Day Rem SVC | **DISCONTINUED** | 2026-08-28 | $2760.00 |
| `H46RMA1` | HPE Data and AI Security 5 Day Rem SVC | **DISCONTINUED** | 2026-08-28 | $9000.00 |
| `H46RNA1` | HPE Data and AI Security 5 Day Onste SVC | **DISCONTINUED** | 2026-08-28 | $18540.00 |
| `H46RLA1` | HPE Data and AI Security 1 Day Rem SVC | **DISCONTINUED** | 2026-08-28 | $2640.00 |
| `H57FDA1` | HPE Data Sltn and Pltfrms 5 Day Rem SVC | **DISCONTINUED** | 2026-08-28 | $13800.00 |
| `469776-715` | HPE Add Generic Packaging Kit | **DISCONTINUED** | 2026-08-28 | $1.00 |
| `AL583A` | BOM Level ATC-1175-MSN Asset Tag | **DISCONTINUED** | 2026-08-28 | $0.01 |
| `H4F41A1` | HPE Factory Express Standard Unit of SVC | **DISCONTINUED** | 2026-08-28 | $19.00 |
| `H4F42A1` | HPE Factory Express Complex Unit of SVC | **DISCONTINUED** | 2026-08-28 | $1850.00 |
| `H8A03A1-501` | HPE Proliant Base SAP HANA FE Integ SVC | **DISCONTINUED** | 2026-08-28 | $4500.00 |
| `H8A03A1-502` | HPE Proliant Svr SAP HANA FE Integ SVC | **DISCONTINUED** | 2026-08-28 | $3875.00 |
| `H8A03A1-503` | HPE SD Flex Base SAP HANA FE Integ SVC | **DISCONTINUED** | 2026-08-28 | $14625.00 |
| `H8A03A1-504` | HPE SD Flex Exp SAP HANA FE Integ SVC | **DISCONTINUED** | 2026-08-28 | $4875.00 |
| `H8A03A1-505` | HPE Storage or SDF 280 HANA FE Integ SVC | **DISCONTINUED** | 2026-08-28 | $9750.00 |
| `H8A03A1-506` | HPE D3710 SAP HANA FE Integ SVC | **DISCONTINUED** | 2026-08-28 | $4750.00 |
| `H8A03A1-507` | HPE DL3xx HANA COE Routing ID FE SVC | **DISCONTINUED** | 2026-08-28 | $1.00 |
| `HA453A1-001` | HPE FE Proliant Svr Pkg 3 SVC | **DISCONTINUED** | 2026-08-28 | $205.00 |
| `HA453A1-003` | HPE FE Multi-node Svr Pkg 3 SVC | **DISCONTINUED** | 2026-08-28 | $315.00 |
| `HA453A1-012` | HPE FE SUS 32x0 Expansion Package 3 SVC | **DISCONTINUED** | 2026-08-28 | $100.00 |
| `HA453A1-013` | HPE FE SUS 32x0 Package 3 SVC | **DISCONTINUED** | 2026-08-28 | $503.00 |
| `HA838A1` | HPE Hardware Customization Service | **DISCONTINUED** | 2026-08-28 | $29.00 |
| `HA839A1` | HPE System Settings Customization Service | **DISCONTINUED** | 2026-08-28 | $35.00 |
| `HA840A1` | HPE Supplied Asset Tag Service | **DISCONTINUED** | 2026-08-28 | $15.00 |
| `HA841A1` | HPE Customer Supplied Asset Tag Service | **DISCONTINUED** | 2026-08-28 | $26.00 |
| `HA843A1` | HPE Customer Supplied Image Load Service | **DISCONTINUED** | 2026-08-28 | $118.00 |
| `HA844A1` | HPE 3rd Party Hardware Install Service | **DISCONTINUED** | 2026-08-28 | $28.00 |
| `HA846A1` | HPE VPN Access Service | **DISCONTINUED** | 2026-08-28 | $275.00 |
| `HA848A1` | HPE Firmware Revision Service | **DISCONTINUED** | 2026-08-28 | $26.00 |
| `HA849A1` | HPE Product and Package Labeling Service | **DISCONTINUED** | 2026-08-28 | $25.00 |
| `HA851A1` | HPE Customer Furnished Equipment Handling Service | **DISCONTINUED** | 2026-08-28 | $94.00 |
| `HA852A1` | HPE Recovery CD Design Install Service | **DISCONTINUED** | 2026-08-28 | $105.00 |
| `HA854A1` | HPE Fctry Exp Virtualization Enable SVC | **DISCONTINUED** | 2026-08-28 | $2134.00 |
| `HA855A1` | HPE Fctry Exp Addl VM creation SVC | **DISCONTINUED** | 2026-08-28 | $750.00 |
| `HA856A1` | HPE FE MC ServiceGuard or MS Cluster SVC | **DISCONTINUED** | 2026-08-28 | $4152.00 |
| `HA861A1` | HPE FE Personalized Install SVC | **DISCONTINUED** | 2026-08-28 | $2105.00 |
| `HA862A1` | HPE Fcty Exp Control Environmnt Srvr SVC | **DISCONTINUED** | 2026-08-28 | $2200.00 |
| `HA867A1` | HPE Standard Product Reporting Service | **DISCONTINUED** | 2026-08-28 | $13.00 |
| `HA868A1` | HPE Enhanced Product Reporting Service | **DISCONTINUED** | 2026-08-28 | $38.00 |
| `HA875A1` | HPE Special Factory Service | **DISCONTINUED** | 2026-08-28 | $1.00 |
| `HF482A1` | HPE Factory Express Complex Custom SVC | **DISCONTINUED** | 2026-08-28 | $1850.00 |
| `HU7D3A1` | HPE FE OEM Customization UOS SVC | **DISCONTINUED** | 2026-08-28 | $65.00 |
| `ZU706A` | HPE Server Customization Package | **DISCONTINUED** | 2026-08-28 | $149.00 |
| `ZU709A` | HPE Standard Radio Frequency Identification Service | **DISCONTINUED** | 2026-08-28 | $10.00 |
| `ZU710A` | HPE Custom Radio Frequency Identification Service | **DISCONTINUED** | 2026-08-28 | $17.00 |
| `ZU713A` | HPE Volume Server Customization Service | **DISCONTINUED** | 2026-08-28 | $10.00 |
| `ZU716A` | HPE OEM Rebrand Basic Service | **DISCONTINUED** | 2026-08-28 | $65.00 |
| `ZU723A` | HPE Customization Service | **DISCONTINUED** | 2026-08-28 | $110.00 |
| `ZU727A` | HPE OEM Rebrand Advanced Service | **DISCONTINUED** | 2026-08-28 | $65.00 |
| `ZU748A` | HPE Roche GPU Inventory Handling SVC | **DISCONTINUED** | 2026-08-28 | $150.00 |
| `AC068A` | HPE FE Cluster Hig Den-Base HW Intg SVC | **DISCONTINUED** | 2026-08-28 | $4601.00 |
| `AC069A` | HPE FE Cluster Hig Den-Node HW Intg SVC | **DISCONTINUED** | 2026-08-28 | $92.00 |
| `HB480A1` | HPE ClusterPlatform 4-8 Factory SW SVC | **DISCONTINUED** | 2026-08-28 | $1616.00 |
| `HB481A1` | HPE ClusterPlatform 9-17 Factory SW SVC | **DISCONTINUED** | 2026-08-28 | $4074.00 |
| `HB482A1` | HPE ClusterPlatform 18-33 Factory SW SVC | **DISCONTINUED** | 2026-08-28 | $9769.00 |
| `HB483A1` | HPE ClusterPlatform 34-65 Factory SW SVC | **DISCONTINUED** | 2026-08-28 | $18463.00 |
| `HB484A1` | HPE ClustrPlatform 66-129 Factory SW SVC | **DISCONTINUED** | 2026-08-28 | $31831.00 |
| `HB485A1` | HPE ClusterPlatform 130-257 Fact SW SVC | **DISCONTINUED** | 2026-08-28 | $57508.00 |
| `SB000DL` | HPE AMS HPC Rack Config Service | **DISCONTINUED** | 2026-08-28 | $1.00 |

## 🔄 5. Recent Attribute & Specification Modifications Log

| Timestamp | SKU | Attribute | Old Value | New Value |
|-----------|-----|-----------|-----------|-----------|
| 2026-08-28 | `P1F77A` | Component Role |  | **Discontinued Hardware** |
| 2026-08-28 | `P1F77A` | HPE Recommended |  | **No** |
| 2026-08-28 | `P1F77A` | Start Date |  | **2026-08-27** |
| 2026-08-28 | `P22020-B21` | Description | HPE DL38X Gen10 Plus 2U Cable Management Arm for Rail Kit | **[REMOVED SKU] HPE DL38X Gen10 Plus 2U Cable Management Arm for Rail Kit** |
| 2026-08-28 | `P22020-B21` | Constraint |  | **Discontinued** |
| 2026-08-28 | `P22020-B21` | Rule/Note |  | **[DISCONTINUED] SKU removed from latest HPE OCA portal catalog** |
| 2026-08-28 | `P22020-B21` | Max Qty |  | **0** |
| 2026-08-28 | `P22020-B21` | Component Role |  | **Discontinued Hardware** |
| 2026-08-28 | `P22020-B21` | HPE Recommended |  | **No** |
| 2026-08-28 | `P52341-B21` | Description | HPE ProLiant DL3XX Gen11 Easy Install Rail 3 Kit | **[REMOVED SKU] HPE ProLiant DL3XX Gen11 Easy Install Rail 3 Kit** |
| 2026-08-28 | `P52341-B21` | Constraint |  | **Discontinued** |
| 2026-08-28 | `P52341-B21` | Rule/Note |  | **[DISCONTINUED] SKU removed from latest HPE OCA portal catalog** |
| 2026-08-28 | `P52341-B21` | Max Qty |  | **0** |
| 2026-08-28 | `P52341-B21` | Component Role |  | **Discontinued Hardware** |
| 2026-08-28 | `P52341-B21` | HPE Recommended |  | **No** |

## 🧩 6. Cross-Chassis Variant & Platform Benchmark Matrix

| Chassis Identifier | Product Family | Generation | Form Factor | CTO Base SKU |
|--------------------|----------------|------------|-------------|--------------|
| **DL380_Gen12** | ProLiant | Gen12 | 8SFF | `P73282-B21` |
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
| **P52532-B21** | ProLiant | Gen11 | 8LFF | `P52532-B21` |
| **P52533-B21** | ProLiant | Gen11 | 12LFF | `P52533-B21` |
| **P52534-B21** | ProLiant | Gen11 | 8SFF | `P52534-B21` |
| **P52535-B21** | ProLiant | Gen11 | 24SFF | `P52535-B21` |
| **P52536-B21** | ProLiant | Gen11 | 24EDSFF | `P52536-B21` |
| **P52537-B21** | ProLiant | Gen11 | 8SFF NVMe | `P52537-B21` |
| **R0Q35A** | Alletra | Storage | Storage Chassis | `R0Q35A` |
| **R0Q36A** | Alletra | Storage | Storage Chassis | `R0Q36A` |
| **R0Q37A** | Alletra | Storage | Storage Controller | `R0Q37A` |
| **Q2R41A** | StoreEver | Tape | Base Module | `Q2R41A` |
| **Q2R42A** | StoreEver | Tape | Expansion Module | `Q2R42A` |
| **P25902-B21** | Synergy | General | Compute Module | `P25902-B21` |
| **797740-B21** | Synergy | General | Frame Chassis | `797740-B21` |
| **P06584-B21** | Synergy | General | Interconnect Module | `P06584-B21` |
| **P57100-B21** | Cray | General | Rack | `P57100-B21` |
| **P57101-B21** | Cray | General | Blade | `P57101-B21` |
| **controller_cache_map** | ProLiant | Gen12 | SFF | `controller_cache_map` |
| **chassis_included_components** | ProLiant | Gen12 | SFF | `chassis_included_components` |
| **form_factor_duals** | ProLiant | Gen12 | SFF | `form_factor_duals` |

