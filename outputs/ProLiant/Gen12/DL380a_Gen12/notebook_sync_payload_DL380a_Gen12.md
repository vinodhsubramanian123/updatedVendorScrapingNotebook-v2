# HPE DL380a_Gen12 — Synchronized Catalog Knowledge

**Target Product**: `DL380a_Gen12`

**Scope Identity**: `HPE/SERVER/ProLiant/Gen12/DL380a_Gen12`

**Sync Timestamp**: 2026-09-16T19:35:18.466Z

**Total Verified SKUs**: `662` (`450` Hardware + `212` Services)

**Total Synced KnowledgeDeltas**: `3`

This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.

---

## 🚀 Executive Delta & Recent Change Summary

| Category | Total SKUs | Added (Last Scrape) | Price Changed | Attribute Changed | Reinstated | Status |
|----------|------------|---------------------|---------------|-------------------|------------|--------|
| **Hardware Components** | 450 | 91 | 0 | 0 | 0 | **CERTIFIED** |
| **Support Services & SLAs** | 212 | 0 | 0 | 0 | 0 | **CERTIFIED** |
| **Total Portfolio** | **662** | **91** | **0** | **0** | **0** | **ACTIVE** |

## 🌐 1. Universal Vendor Rules (HPE)

*No verified universal vendor rules are registered for this product.*

## 🏛️ 2. Family & Generation Rules (ProLiant Gen12)

*No verified family/generation rules are registered for this product.*

## 🎯 3. Chassis & Solution-Type Gotchas (DL380a_Gen12)

1. **[DELTA_DL380A_GEN12_DRIVE_CAGE_EXCLUSIVITY] DL380a_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380a Gen12 GPU Server`):
   - **Rule**: DL380a prohibits mixing 4SFF cage P74710-B21 and 4EDSFF cage P74712-B21.
   - **Affected SKU**: `P74710-B21` | **Required Dependency**: `N/A`

2. **[DELTA_DL380A_GEN12_DUAL_CPU_HOMOGENEOUS] DL380a_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380a Gen12 GPU Server`):
   - **Rule**: DL380a Gen12 requires two identical processor models; single-processor and mixed-processor configurations are unsupported.
   - **Affected SKU**: `P76706-B21` | **Required Dependency**: `N/A`

3. **[DELTA_DL380A_GEN12_GPU_PSU_COUNT_MATRIX] DL380a_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380a Gen12 GPU Server`):
   - **Rule**: Use exactly five power supplies for 2DW/4DW GPU configurations and eight for 8DW/10DW; H100/H200 NVL supports 2400W P67252-B21 or 3200W P67248-B21 Titanium supplies, without mixing wattages.
   - **Affected SKU**: `P76706-B21` | **Required Dependency**: `N/A`


## ⚠️ 4. Discontinued & Obsolete SKUs Registry

| SKU | Description | Status | Discontinued Date | Last Known Price | Tracking | Retention |
|-----|-------------|--------|-------------------|------------------|----------|-----------|
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
| `P76706-B21` | HPE ProLiant Compute DL380a Gen12 8 Double Wide/16 Single Wide Configure-to-order Server | **REINSTATED** | 2026-09-09 | $21407.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |

## 🔄 5. Recent Attribute & Specification Modifications Log

| Timestamp | SKU | Attribute | Old Value | New Value |
|-----------|-----|-----------|-----------|-----------|
| 2026-09-09 | `P76706-B21` | Discontinued Date | 02/29/2028 | **2026-09-09** |
| 2026-09-10 | `P76706-B21` | Lead Time Source | OCA configuration estimate | **OCA selected configuration estimate** |

## 🧩 6. Same-Product CTO Variant Matrix

| Chassis Identifier | Product Family | Generation | Form Factor | CTO Base SKU |
|--------------------|----------------|------------|-------------|--------------|
| **DL380a_Gen12** | ProLiant | Gen12 | 8DW/16SW | `P76706-B21` |

