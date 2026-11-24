# Portfolio State of Health (Auto-Generated: 2026-11-24)

This document is dynamically generated from on-disk catalog metadata and `scripts/config/catalog_coverage_profiles.json` by `scripts/maintenance/generate_portfolio_status.js`.

### 📊 Active Scraped Catalogs (17 Product Lines)

| Product Chassis | Relative Directory | SKUs on Disk | Excel Workbook | QuickSpecs PDF | Diff History | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Alletra MP B10000` | `outputs\Alletra\Storage\Alletra_MP_B10000` | **201** | ✅ Present | ✅ 0.58 MB | ✅ Active | Active catalog discovered; coverage and solution validation require separate evidence |
| `Alletra MP X10000` | `outputs\Alletra\Storage\Alletra_MP_X10000` | **80** | ✅ Present | ✅ 0.5 MB | ✅ Active | Active catalog discovered; coverage and solution validation require separate evidence |
| `DL145 Gen11` | `outputs\ProLiant\Gen11\DL145_Gen11` | **487** | ✅ Present | ✅ 1.59 MB | ✅ Active | Active catalog discovered; coverage and solution validation require separate evidence |
| `DL360 Gen11` | `outputs\ProLiant\Gen11\DL360_Gen11` | **803** | ✅ Present | ✅ 1.87 MB | ✅ Active | Active catalog discovered; coverage and solution validation require separate evidence |
| `DL380 Gen11` | `outputs\ProLiant\Gen11\DL380_Gen11` | **980** | ✅ Present | ✅ 2.08 MB | ✅ Active | Active catalog discovered; coverage and solution validation require separate evidence |
| `DL385 Gen11` | `outputs\ProLiant\Gen11\DL385_Gen11` | **794** | ✅ Present | ✅ 2.87 MB | ✅ Active | Active catalog discovered; coverage and solution validation require separate evidence |
| `DL360 Gen12` | `outputs\ProLiant\Gen12\DL360_Gen12` | **770** | ✅ Present | ✅ 2.5 MB | ✅ Active | Active catalog discovered; coverage and solution validation require separate evidence |
| `DL380 Gen12` | `outputs\ProLiant\Gen12\DL380_Gen12` | **781** | ✅ Present | ✅ 2.22 MB | ✅ Active | Active catalog discovered; coverage and solution validation require separate evidence |
| `DL380a Gen12` | `outputs\ProLiant\Gen12\DL380a_Gen12` | **531** | ✅ Present | ✅ 1.12 MB | ✅ Active | Active catalog discovered; coverage and solution validation require separate evidence |
| `DL580 Gen12` | `outputs\ProLiant\Gen12\DL580_Gen12` | **594** | ✅ Present | ✅ 1.22 MB | ✅ Active | Active catalog discovered; coverage and solution validation require separate evidence |
| `SN3600B FC` | `outputs\SAN\FC\SN3600B_FC` | **82** | ✅ Present | ✅ 0.52 MB | ✅ Active | Active catalog discovered; coverage and solution validation require separate evidence |
| `MSL3040 Tape` | `outputs\StoreEver\Tape\MSL3040_Tape` | **124** | ✅ Present | ✅ 0.52 MB | ✅ Active | Active catalog discovered; coverage and solution validation require separate evidence |
| `SY480 Gen12` | `outputs\Synergy\Gen12\SY480_Gen12` | **313** | ✅ Present | ✅ 2.58 MB | ✅ Active | Active catalog discovered; coverage and solution validation require separate evidence |
| `SY100Gb F32 Module` | `outputs\Synergy\General\SY100Gb_F32_Module` | **141** | ✅ Present | ✅ 0.52 MB | ✅ Active | Active catalog discovered; coverage and solution validation require separate evidence |
| `Synergy 12000 Frame` | `outputs\Synergy\General\Synergy_12000_Frame` | **257** | ✅ Present | ✅ 0.89 MB | ✅ Active | Active catalog discovered; coverage and solution validation require separate evidence |
| `Synergy 4Port Frame Link Module` | `outputs\Synergy\General\Synergy_4Port_Frame_Link_Module` | **62** | ✅ Present | ✅ 0.51 MB | ✅ Active | Active catalog discovered; coverage and solution validation require separate evidence |
| `Synergy Brocade 64Gb FC Module` | `outputs\Synergy\General\Synergy_Brocade_64Gb_FC_Module` | **24** | ✅ Present | ✅ 0.29 MB | ✅ Active | Active catalog discovered; coverage and solution validation require separate evidence |

**Active Catalog SKU Count (summed per product)**: **7024** across **17 active product lines** (2 quarantined legacy stub(s) excluded). Shared SKUs may occur across products.

### 🗄️ Quarantined Legacy Stubs (Excluded from Active Grounding — 2)

| Product Chassis | Relative Directory | SKUs on Disk | Excel Workbook | QuickSpecs PDF | Diff History | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `HPE Alletra Storage System` | `outputs\Alletra\Storage\Alletra_Storage_System` | **3** | ✅ Present | ⚠️ Advisory (No PDF) | ✅ Active | QUARANTINED_ARCHIVED_STUB (excluded from active grounding) |
| `GX5000 General RACK` | `outputs\Cray\General\GX5000_General_RACK` | **2** | ✅ Present | ⚠️ Advisory (No PDF) | ✅ Active | QUARANTINED_ARCHIVED_STUB (excluded from active grounding) |

### 🧠 Learned KnowledgeDeltas

- Total Closed-Loop Knowledge Deltas on Disk: **182**

### 🚀 Quick Commands

- Re-sync portfolio & generate this document: `npm run status:sync`
- Promote verified learnings (`>= 3` observations): `npm run learn:promote`
- Lookup invariants quickly: `npm run docs:lookup -- INV-276`
- Certify DL380 Gen12: `npm run certify:gen12`
- Single-command Gen12 maintenance: `npm run maintain:gen12`
- Portfolio maintenance: `npm run maintain:portfolio`
