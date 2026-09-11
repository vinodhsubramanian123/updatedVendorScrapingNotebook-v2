# HPE DL145_Gen11 — Synchronized Catalog Knowledge

**Target Product**: `DL145_Gen11`

**Scope Identity**: `HPE/SERVER/ProLiant/Gen11/DL145_Gen11`

**Sync Timestamp**: 2026-09-11T15:46:45.334Z

**Total Verified SKUs**: `624` (`357` Hardware + `267` Services)

**Total Synced KnowledgeDeltas**: `4`

This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.

---

## 🚀 Executive Delta & Recent Change Summary

| Category | Total SKUs | Added (Last Scrape) | Price Changed | Attribute Changed | Reinstated | Status |
|----------|------------|---------------------|---------------|-------------------|------------|--------|
| **Hardware Components** | 357 | 124 | 0 | 233 | 0 | **CERTIFIED** |
| **Support Services & SLAs** | 267 | 0 | 0 | 0 | 0 | **CERTIFIED** |
| **Total Portfolio** | **624** | **124** | **0** | **233** | **0** | **ACTIVE** |

## 🌐 1. Universal Vendor Rules (HPE)

*No verified universal vendor rules are registered for this product.*

## 🏛️ 2. Family & Generation Rules (ProLiant Gen11)

*No verified family/generation rules are registered for this product.*

## 🎯 3. Chassis & Solution-Type Gotchas (DL145_Gen11)

1. **[DELTA_DL145_GEN11_AMD_EPYC_8004] DL145_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL145 Gen11 Edge Server`):
   - **Rule**: DL145 Gen11 is single-socket AMD EPYC 8004 only. No dual-socket configurations supported.
   - **Affected SKU**: `P71964-B21` | **Required Dependency**: `N/A`

2. **[DELTA_DL145_GEN11_4EDSFF_CAGE] DL145_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL145 Gen11 Edge Server`):
   - **Rule**: DL145 Gen11 uses EDSFF E3.S form factor drives only. Standard SFF/LFF drives are incompatible.
   - **Affected SKU**: `P71985-B21` | **Required Dependency**: `P77271-B21`

3. **[DELTA_DL145_GEN11_PSU_PROFILE] DL145_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL145 Gen11 Edge Server`):
   - **Rule**: DL145 Gen11 supports maximum 1000W PSUs. 1600W/2400W PSUs are physically incompatible.
   - **Affected SKU**: `P71964-B21` | **Required Dependency**: `P54290-B21`

4. **[DELTA_DL145_GEN11_EXTENDED_TEMP] DL145_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL145 Gen11 Edge Server`):
   - **Rule**: DL145 Gen11 edge deployments use P73021-B21 for extended -5C to 45C ambient temperature tracking.
   - **Affected SKU**: `P71964-B21` | **Required Dependency**: `P73021-B21`


## ⚠️ 4. Discontinued & Obsolete SKUs Registry

*No discontinued or reinstated SKUs detected for DL145_Gen11. All cataloged SKUs are active.*

## 🔄 5. Recent Attribute & Specification Modifications Log

| Timestamp | SKU | Attribute | Old Value | New Value |
|-----------|-----|-----------|-----------|-----------|
| 2026-09-10 | `P46155-B21` | Vendor Attributes | {"Extended Price (USD)":"NA"} | **{"Extended Price (USD)":"0"}** |
| 2026-09-10 | `P77096-291` | Vendor Attributes | {"Extended Price (USD)":"NA"} | **{"Extended Price (USD)":"0"}** |
| 2026-09-10 | `P77096-B21` | Vendor Attributes | {"Extended Price (USD)":"NA"} | **{"Extended Price (USD)":"0"}** |
| 2026-09-10 | `P77099-291` | Vendor Attributes | {"Extended Price (USD)":"NA"} | **{"Extended Price (USD)":"0"}** |
| 2026-09-10 | `512485-B21` | Vendor Attributes | {"Extended Price (USD)":"NA"} | **{"Extended Price (USD)":"0"}** |
| 2026-09-10 | `BD505A` | Vendor Attributes | {"Extended Price (USD)":"469.00"} | **{"Extended Price (USD)":"0"}** |
| 2026-09-10 | `512487-B21` | Vendor Attributes | {"Extended Price (USD)":"NA"} | **{"Extended Price (USD)":"0"}** |
| 2026-09-10 | `BD507A` | Vendor Attributes | {"Extended Price (USD)":"NA"} | **{"Extended Price (USD)":"0"}** |
| 2026-09-10 | `E6U59ABE` | Vendor Attributes | {"Extended Price (USD)":"NA"} | **{"Extended Price (USD)":"0"}** |
| 2026-09-10 | `E6U64ABE` | Vendor Attributes | {"Extended Price (USD)":"NA"} | **{"Extended Price (USD)":"0"}** |
| 2026-09-10 | `512486-B21` | Vendor Attributes | {"Extended Price (USD)":"NA"} | **{"Extended Price (USD)":"0"}** |
| 2026-09-10 | `BD506A` | Vendor Attributes | {"Extended Price (USD)":"NA"} | **{"Extended Price (USD)":"0"}** |
| 2026-09-10 | `Q5T84A` | Vendor Attributes | {"Extended Price (USD)":"NA"} | **{"Extended Price (USD)":"0"}** |
| 2026-09-10 | `Q5T85A` | Vendor Attributes | {"Extended Price (USD)":"NA"} | **{"Extended Price (USD)":"0"}** |
| 2026-09-10 | `Q2A48A` | Vendor Attributes | {"Extended Price (USD)":"NA"} | **{"Extended Price (USD)":"0"}** |

## 🧩 6. Same-Product CTO Variant Matrix

| Chassis Identifier | Product Family | Generation | Form Factor | CTO Base SKU |
|--------------------|----------------|------------|-------------|--------------|
| **DL145_Gen11** | ProLiant | Gen11 | 4EDSFF | `P71964-B21` |

