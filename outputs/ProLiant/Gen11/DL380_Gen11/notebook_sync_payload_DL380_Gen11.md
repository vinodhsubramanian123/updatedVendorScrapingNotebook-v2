# HPE OCA Catalog Intelligence — Synchronized Knowledge & Rules Charter

**Target Product**: `DL380_Gen11`  
**Sync Timestamp**: 2026-08-28T17:29:37.827Z  
**Total Verified SKUs**: `1539` (`502` Hardware + `1037` Services)  
**Total Synced KnowledgeDeltas**: `26`  

This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.

---

## 🚀 Executive Delta & Recent Change Summary

| Category | Total SKUs | Added (Last Scrape) | Price Changed | Attribute Changed | Reinstated | Status |
|----------|------------|---------------------|---------------|-------------------|------------|--------|
| **Hardware Components** | 502 | 31 | 23 | 20 | 20 | **CERTIFIED** |
| **Support Services & SLAs** | 1037 | 0 | 0 | 0 | 0 | **CERTIFIED** |
| **Total Portfolio** | **1539** | **31** | **23** | **20** | **20** | **ACTIVE** |

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
| `P22020-B21` | HPE DL38X Gen10 Plus 2U Cable Management Arm for Rail Kit | **DISCONTINUED** | 2026-08-28 | $89.00 |
| `P52341-B21` | HPE ProLiant DL3XX Gen11 Easy Install Rail 3 Kit | **DISCONTINUED** | 2026-08-28 | $164.00 |
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

## 🔄 5. Recent Attribute & Specification Modifications Log

| Timestamp | SKU | Attribute | Old Value | New Value |
|-----------|-----|-----------|-----------|-----------|
| 2026-08-28 | `BQ335A` | Start Date |  | **2026-08-27** |
| 2026-08-28 | `BQ337A` | Description | HPE Expedite Shipment Large Logistic Service | **[REMOVED SKU] HPE Expedite Shipment Large Logistic Service** |
| 2026-08-28 | `BQ337A` | Constraint |  | **Discontinued** |
| 2026-08-28 | `BQ337A` | Rule/Note |  | **[DISCONTINUED] SKU removed from latest HPE OCA portal catalog** |
| 2026-08-28 | `BQ337A` | Max Qty |  | **0** |
| 2026-08-28 | `BQ337A` | Component Role |  | **Discontinued Hardware** |
| 2026-08-28 | `BQ337A` | HPE Recommended |  | **No** |
| 2026-08-28 | `BQ337A` | Start Date |  | **2026-08-27** |
| 2026-08-28 | `P1F77A` | Description | HPE Post-Delivery Waste Removal SVC | **[REMOVED SKU] HPE Post-Delivery Waste Removal SVC** |
| 2026-08-28 | `P1F77A` | Constraint |  | **Discontinued** |
| 2026-08-28 | `P1F77A` | Rule/Note |  | **[DISCONTINUED] SKU removed from latest HPE OCA portal catalog** |
| 2026-08-28 | `P1F77A` | Max Qty |  | **0** |
| 2026-08-28 | `P1F77A` | Component Role |  | **Discontinued Hardware** |
| 2026-08-28 | `P1F77A` | HPE Recommended |  | **No** |
| 2026-08-28 | `P1F77A` | Start Date |  | **2026-08-27** |

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

