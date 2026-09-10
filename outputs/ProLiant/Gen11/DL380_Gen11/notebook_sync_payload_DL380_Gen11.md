# HPE DL380_Gen11 — Synchronized Catalog Knowledge

**Target Product**: `DL380_Gen11`

**Scope Identity**: `HPE/SERVER/ProLiant/Gen11/DL380_Gen11`

**Sync Timestamp**: 2026-09-10T11:37:21.116Z

**Total Verified SKUs**: `1408` (`584` Hardware + `824` Services)

**Total Synced KnowledgeDeltas**: `13`

This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.

---

## 🚀 Executive Delta & Recent Change Summary

| Category | Total SKUs | Added (Last Scrape) | Price Changed | Attribute Changed | Reinstated | Status |
|----------|------------|---------------------|---------------|-------------------|------------|--------|
| **Hardware Components** | 584 | 233 | 0 | 350 | 1 | **CERTIFIED** |
| **Support Services & SLAs** | 824 | 0 | 0 | 0 | 0 | **CERTIFIED** |
| **Total Portfolio** | **1408** | **233** | **0** | **350** | **1** | **ACTIVE** |

## 🌐 1. Universal Vendor Rules (HPE)

*No verified universal vendor rules are registered for this product.*

## 🏛️ 2. Family & Generation Rules (ProLiant Gen11)

*No verified family/generation rules are registered for this product.*

## 🎯 3. Chassis & Solution-Type Gotchas (DL380_Gen11)

1. **[DELTA-1787856163365] DL380_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If PORTAL is present, P52534-B21 is mandatory.
   - **Affected SKU**: `PORTAL` | **Required Dependency**: `P52534-B21`

2. **[DELTA-1787856163549] DL380_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If PORTAL is present, P64707-B21 is mandatory.
   - **Affected SKU**: `PORTAL` | **Required Dependency**: `P64707-B21`

3. **[DELTA-1787856163672] DL380_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: Portal validation flagged restriction on PORTAL.
   - **Affected SKU**: `PORTAL` | **Required Dependency**: `N/A`

4. **[DELTA-1787856163759] DL380_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If PORTAL is present, P58335-B21 is mandatory.
   - **Affected SKU**: `PORTAL` | **Required Dependency**: `P58335-B21`

5. **[DELTA_RAG_CARRYOVER_P48183-B21_1787856180158] DL380_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen11 CTO Server`):
   - **Rule**: undefined
   - **Affected SKU**: `P48183-B21` | **Required Dependency**: `N/A`

6. **[DELTA_CLIC_81354632_DL380_GEN11] DL380_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen11 CTO Server`):
   - **Rule**: If P48832-B21 (Tri-Mode Splitter Cable) is selected, P48814-B21 (8SFF U.3 Premium Cage) is mandatory.
   - **Affected SKU**: `P48832-B21` | **Required Dependency**: `P48814-B21`

7. **[DELTA_CLIC_81354652_DL380_GEN11] DL380_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen11 CTO Server`):
   - **Rule**: If P02377-B21 / P01366-B21 (Capacitor/Battery) is selected, P48918-B21 (Storage Controller Enablement Cable Kit) is mandatory.
   - **Affected SKU**: `P02377-B21` | **Required Dependency**: `P48918-B21`

8. **[DELTA_CLIC_81355854_DL380_GEN11] DL380_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen11 CTO Server`):
   - **Rule**: P51911-B21 and P48830-B21 cannot be selected together. Retain P48830-B21.
   - **Affected SKU**: `P51911-B21` | **Required Dependency**: `P48830-B21`

9. **[DELTA_CLIC_81016755_DL380_GEN11] DL380_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen11 CTO Server`):
   - **Rule**: When 5+ PCIe cards are installed, P56073-B21 Primary Cable Kit is mandatory for Primary Riser Slot 1.
   - **Affected SKU**: `P48803-B21` | **Required Dependency**: `P56073-B21`

10. **[DELTA_CLIC_EU_LOT9_P35876_DL380_GEN11] DL380_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen11 CTO Server`):
   - **Rule**: When ordering Platinum PSUs (P38997-B21) on high-draw dual-socket configurations, P35876-B21 (CE Mark Removal Kit) is required for non-EU deployment, or upgrade to Titanium PSUs (P44712-B21).
   - **Affected SKU**: `P38997-B21` | **Required Dependency**: `P35876-B21`

11. **[DELTA_RAG_DEP_P02377-B21_P48918-B21_1787913302880] DL380_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen11 CTO Server`):
   - **Rule**: undefined
   - **Affected SKU**: `P02377-B21` | **Required Dependency**: `P48918-B21`

12. **[DELTA_RAG_DEP_P58335-B21_P48918-B21_1787913632019] DL380_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen11 CTO Server`):
   - **Rule**: undefined
   - **Affected SKU**: `P58335-B21` | **Required Dependency**: `P48918-B21`

13. **[DELTA_RAG_DEP_write-cach_P48918-B21_1787915281069] DL380_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen11 CTO Server`):
   - **Rule**: undefined
   - **Affected SKU**: `write-cach` | **Required Dependency**: `P48918-B21`


## ⚠️ 4. Discontinued & Obsolete SKUs Registry

| SKU | Description | Status | Discontinued Date | Last Known Price | Tracking | Retention |
|-----|-------------|--------|-------------------|------------------|----------|-----------|
| `P52534-B21` | HPE ProLiant DL380 Gen11 8SFF Configure-to-order Server | **REINSTATED** | 2026-09-09 | $1650.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P52535-B21` | HPE ProLiant DL380 Gen11 24SFF Configure-to-order Server | **REINSTATED** | 2026-09-09 | $2100.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P52536-B21` | HPE ProLiant DL380 Gen11 24EDSFF Configure-to-order Server | **REINSTATED** | 2026-09-09 | $2250.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P52537-B21` | HPE ProLiant DL380 Gen11 8SFF NVMe Configure-to-order Server | **DISCONTINUED** | 2026-09-09 | $2050.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P52532-B21` | HPE ProLiant DL380 Gen11 8LFF Configure-to-order Server | **REINSTATED** | 2026-09-09 | $1750.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P52533-B21` | HPE ProLiant DL380 Gen11 12LFF Configure-to-order Server | **REINSTATED** | 2026-09-09 | $1900.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `469774-409` | HPE Remove Standard Power Cords | **DISCONTINUED** | 2026-09-10 | $1.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P22020-B21` | HPE DL38X Gen10 Plus 2U Cable Management Arm for Rail Kit | **REINSTATED** | 2026-08-28 | $89.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P48819-B21` | HPE ProLiant DL380 Gen11 System Insight Display Kit | **REINSTATED** | 2026-09-10 | $100.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P52341-B21` | HPE ProLiant DL3XX Gen11 Easy Install Rail 3 Kit | **REINSTATED** | 2026-08-28 | $164.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P77110-B21` | Microsoft Windows Server 2025 1 User CAL WW LTU | **DISCONTINUED** | 2026-09-10 | $72.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P77111-B21` | Microsoft Windows Server 2025 1 Device CAL WW LTU | **DISCONTINUED** | 2026-09-10 | $52.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P77112-B21` | Microsoft Windows Server 2025 5 Users CAL WW LTU | **DISCONTINUED** | 2026-09-10 | $322.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P77113-B21` | Microsoft Windows Server 2025 5 Devices CAL WW LTU | **DISCONTINUED** | 2026-09-10 | $226.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P77114-B21` | Microsoft Windows Server 2025 10 Users CAL WW LTU | **DISCONTINUED** | 2026-09-10 | $636.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P77115-B21` | Microsoft Windows Server 2025 10 Devices CAL WW LTU | **DISCONTINUED** | 2026-09-10 | $444.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P77116-B21` | Microsoft Windows Server 2025 50 Users CAL WW LTU | **DISCONTINUED** | 2026-09-10 | $3143.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P77117-B21` | Microsoft Windows Server 2025 50 Devices CAL WW LTU | **DISCONTINUED** | 2026-09-10 | $2184.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P77118-B21` | Microsoft Windows Server 2025 Remote Desktop Service 1 User CAL WW LTU | **DISCONTINUED** | 2026-09-10 | $280.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P77119-B21` | Microsoft Windows Server 2025 Remote Desktop Service 1 Device CAL WW LTU | **DISCONTINUED** | 2026-09-10 | $201.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P77120-B21` | Microsoft Windows Server 2025 Remote Desktop Service 5 Users CAL WW LTU | **DISCONTINUED** | 2026-09-10 | $1364.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P77121-B21` | Microsoft Windows Server 2025 Remote Desktop Service 5 Devices CAL WW LTU | **DISCONTINUED** | 2026-09-10 | $974.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P77122-B21` | Microsoft Windows Server 2025 Remote Desktop Service 50 Users CAL WW LTU | **DISCONTINUED** | 2026-09-10 | $13566.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P77123-B21` | Microsoft Windows Server 2025 Remote Desktop Service 50 Devices CAL WW LTU | **DISCONTINUED** | 2026-09-10 | $9666.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P46191-AA1` | Microsoft Windows Server 2022 1 User CAL Chinese Simplified LTU | **DISCONTINUED** | 2026-09-10 | $99999.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P46191-B21` | Microsoft Windows Server 2022 1 User CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | **DISCONTINUED** | 2026-09-10 | $55.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P46194-B21` | Microsoft Windows Server 2022 1 Device CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | **DISCONTINUED** | 2026-09-10 | $44.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P46215-AA1` | Microsoft Windows Server 2022 5 Users CAL Chinese Simplified LTU | **DISCONTINUED** | 2026-09-10 | $99999.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P46215-AB1` | Microsoft Windows Server 2022 5 Users CAL Chinese Traditional LTU | **DISCONTINUED** | 2026-09-10 | $99999.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P46215-B21` | Microsoft Windows Server 2022 5 Users CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | **DISCONTINUED** | 2026-09-10 | $271.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P46216-B21` | Microsoft Windows Server 2022 5 Devices CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | **DISCONTINUED** | 2026-09-10 | $216.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P46217-B21` | Microsoft Windows Server 2022 10 Users CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | **DISCONTINUED** | 2026-09-10 | $539.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P46218-B21` | Microsoft Windows Server 2022 10 Devices CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | **DISCONTINUED** | 2026-09-10 | $429.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P46219-B21` | Microsoft Windows Server 2022 50 Users CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | **DISCONTINUED** | 2026-09-10 | $2695.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P46220-B21` | Microsoft Windows Server 2022 50 Devices CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | **DISCONTINUED** | 2026-09-10 | $2145.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P46221-B21` | Microsoft Windows Server 2022 RDS 5 Users CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | **DISCONTINUED** | 2026-09-10 | $935.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P46222-B21` | Microsoft Windows Server 2022 RDS 5 Devices CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | **DISCONTINUED** | 2026-09-10 | $880.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `AC120A` | HPE Pallet Size Customization Service | **REINSTATED** | 2026-08-28 | $7.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `AC121A` | Non Working Day Delivery SVC | **REINSTATED** | 2026-08-28 | $104.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `AC129A` | HPE Consolidation Logistic Service | **REINSTATED** | 2026-08-28 | $26.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P1F69A` | HPE Delivery Site Above Ground Floor Service | **REINSTATED** | 2026-08-28 | $289.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P1F70A` | HPE Forklift at Delivery Service | **REINSTATED** | 2026-08-28 | $1399.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P1F71A` | HPE Special Delivery Truck Size Service | **REINSTATED** | 2026-08-28 | $292.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P1F72A` | HPE Two People at Delivery SVC | **REINSTATED** | 2026-08-28 | $466.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P1F73A` | HPE Campus Delivery Service | **REINSTATED** | 2026-08-28 | $104.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P1F74A` | HPE Unloading Logistic Service | **REINSTATED** | 2026-08-28 | $350.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P1F75A` | HPE Fixed Delivery Appointment Service | **REINSTATED** | 2026-08-28 | $466.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `AC123A` | HPE Special Request/ Equipment Logistic Service | **REINSTATED** | 2026-08-28 | $816.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `BQ335A` | HPE Expedite Shipment Small Logistic Service | **REINSTATED** | 2026-08-28 | $44.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `BQ337A` | HPE Expedite Shipment Large Logistic Service | **REINSTATED** | 2026-08-28 | $100.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |
| `P1F77A` | HPE Post-Delivery Waste Removal SVC | **REINSTATED** | 2026-08-28 | $116.00 | LIFECYCLE_RETAINED | COMPACT_LIFECYCLE_TOMBSTONE |

## 🔄 5. Recent Attribute & Specification Modifications Log

| Timestamp | SKU | Attribute | Old Value | New Value |
|-----------|-----|-----------|-----------|-----------|
| 2026-09-10 | `672097-143` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `672097-223` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `672097-353` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `672097-373` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `672097-B33` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `672097-D63` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `672097-KD3` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `P39103-B21` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `P55209-B21` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `P03178-B21` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `P38995-B21` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `P38997-B21` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `P17023-B21` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `P36877-B21` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `P48819-B21` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |

## 🧩 6. Same-Product CTO Variant Matrix

| Chassis Identifier | Product Family | Generation | Form Factor | CTO Base SKU |
|--------------------|----------------|------------|-------------|--------------|
| **DL380_Gen11** | ProLiant | Gen11 | 8SFF | `P52534-B21` |

