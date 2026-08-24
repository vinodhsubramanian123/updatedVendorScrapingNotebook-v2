---
name: oca-catalog-scraper
description: Use this skill to live-scrape HPE OCA portal product catalogs (ProLiant, Synergy, Alletra, Cray, StoreEver) via CDP remote debugging on port 9222.
---

# OCA Catalog Scraper Skill (`oca-catalog-scraper`)

---

## 1. Purpose & Overview (Workflow 1)

This skill represents **Workflow 1 (Intelligence Extraction)** of the dual-workflow paradigm. Its sole purpose is to extract complete product catalog intelligence from vendor portals (HPE OCA, etc.) to build the baseline rules engine. It produces a classified multi-sheet **Catalog Excel workbook** (20 sheets) + companion JSON files stored under `outputs/{Family}/{Gen}/{Model}_{FormFactor}/`. These rules are structurally required by **Workflow 2 (Pre-Flight Evaluation)** to validate quotes.

---

## 2. 10-Stage Scraping Lifecycle Architecture (Mermaid Sequence Visual)

```mermaid
sequenceDiagram
    autonumber
    participant Browser as HPE OCA Browser (Port 9222)
    participant CDP as scripts/lib/scraper/cdp.js
    participant Scraper as scripts/scrapers/scrape_oca_solution.js
    participant Builder as scripts/catalogs/build_catalog.js
    participant Excel as scripts/catalogs/generate_xlsx.js
    participant Audit as tests/integration/verify_excel_tally.js
    participant Sync as scripts/lib/sync/knowledge_sync.js
    participant NLM as Google NotebookLM Cloud

    Scraper->>CDP: Step 1 (10%): Connect WS on port 9222 (CDP Handshake & Setup Dialog Handler)
    CDP->>Browser: Enable Page & Intercept Modals (dismissDOMModals)
    Scraper->>Browser: Step 2 (20%): Navigate Solution Tree to Product Root (PORTAL_NAV)
    Scraper->>Browser: Step 3 (30%): Enter Extended Overview Menu & Profile Chassis (CATEGORY_DISCOVERY)
    Scraper->>Browser: Step 4 (45%): Deep Page Expansion >15000px & Multi-Tab Reveal (PAGE_EXPAND)
    Browser-->>Scraper: Step 5 (60%): Return DOM Tables & Text Payload (DOM_EXTRACTION)
    Scraper->>Builder: Step 6 (75%): Aspect Rules Engine & Constraint Graph (RULES_PARSING)
    Builder->>Excel: Step 7 (85%): Compile TSVs & 20-Sheet Excel in Staging (CATALOG_GEN)
    Scraper->>Audit: Step 8 (90%): 7-Check Post-Flight Tally Audit (STAGING_AUDIT)
    Scraper->>Scraper: Step 9 (95%): Promote Staging Atomically to Live Workspace
    Scraper->>Sync: Step 9.5: Post-Flow Knowledge Sync Hook (autoUploadNLM: true)
    Sync->>NLM: Upsert Canonical Markdown Payload (KNOWLEDGE_SYNC)
    Scraper->>Scraper: Step 10 (100%): Portfolio Registry Sync & Action Ledger Log (REGISTRY_SYNC)
```

---

## 3. The 10 Atomic Scraping Stages & SSE Telemetry

| Step # | Stage ID | Stage Name | Target Action | SSE Emission Payload |
| :---: | :--- | :--- | :--- | :--- |
| **1** | `CDP_CONNECT` | CDP Handshake & Verification | Connects to port 9222 and binds automated modal handlers. | `{ step: 1, percent: 10, stage: 'CDP_CONNECT' }` |
| **2** | `PORTAL_NAV` | Solution Root Discovery | Finds solution title and navigates tree root. | `{ step: 2, percent: 20, stage: 'PORTAL_NAV' }` |
| **3** | `CATEGORY_DISCOVERY` | Menu Traversal & Profiling | Enters menu and loads hardware profile. | `{ step: 3, percent: 30, stage: 'CATEGORY_DISCOVERY' }` |
| **4** | `PAGE_EXPAND` | Section & Multi-Tab Expansion | Scrolls page past threshold, checks Pointnext/Services tabs. | `{ step: 4, percent: 45, stage: 'PAGE_EXPAND' }` |
| **5** | `DOM_EXTRACTION` | Tabular Row & Text Scraping | Extracts chunked text, table row arrays, and landmark headers. | `{ step: 5, percent: 60, stage: 'DOM_EXTRACTION', itemsScraped: N }` |
| **6** | `RULES_PARSING` | Aspect Rules & Constraints | Parses min/max limits, slot caps, dependencies into constraint graph. | `{ step: 6, percent: 75, stage: 'RULES_PARSING' }` |
| **7** | `CATALOG_GEN` | Staging & Master Excel Generation | Compiles TSVs, computes diffs, writes 20-sheet Excel in staging. | `{ step: 7, percent: 85, stage: 'CATALOG_GEN' }` |
| **8** | `STAGING_AUDIT` | 7-Check Post-Flight Tally Audit | Verifies row counts, formulas, 4-level hierarchy paths, numeric Qty. | `{ step: 8, percent: 90, stage: 'STAGING_AUDIT' }` |
| **9** | `KNOWLEDGE_SYNC` | Live Promotion & NotebookLM Grounding | Atomically promotes staging and syncs knowledge payload to NotebookLM. | `{ step: 9, percent: 95, stage: 'KNOWLEDGE_SYNC' }` |
| **10** | `REGISTRY_SYNC` | Portfolio Registry & Ledger Sync | Synchronizes chassis variants across workspace and logs action ledger. | `{ step: 10, percent: 100, stage: 'REGISTRY_SYNC' }` |

---

## 4. Current State & Certified Products (Last Audited: 2026-08-22)

| Product | Family | Output Prefix | Unique SKUs | Sheets | Audit | NotebookLM Sync |
|---------|--------|---------------|-------------|--------|-------|-----------------|
| HPE ProLiant DL380 Gen12 SFF | ProLiant | `DL380_Gen12_SFF` | 262 HW / 518 Svc | 20 Sheets | ✅ 100% PASS | ✅ Verified Cloud RAG |
| HPE ProLiant DL380 Gen11 | ProLiant | `DL380_Gen11` | 4 (Baseline + CTO) | 7 Sheets | ✅ 100% PASS | ✅ Verified Cloud RAG |
| HPE StoreEver MSL3040 Tape Library | StoreEver | `MSL3040_Tape` | 2 (Baseline + CTO) | 7 Sheets | ✅ 100% PASS | ✅ Verified Cloud RAG |
| HPE Cray Supercomputing GX5000 Rack | Cray | `GX5000_General_RACK` | 2 (Baseline + CTO) | 7 Sheets | ✅ 100% PASS | ✅ Verified Cloud RAG |
| HPE Synergy VC 100Gb F32 Module | Synergy | `SY100Gb_F32_Module` | 3 (Baseline + CTO) | 7 Sheets | ✅ 100% PASS | ✅ Verified Cloud RAG |
| HPE Alletra Storage System | Alletra | `Alletra_Storage_System` | 3 (Baseline + CTO) | 7 Sheets | ✅ 100% PASS | ✅ Verified Cloud RAG |

**Total Portfolio Intelligence**: **6/6 Product Lines Certified** across 5 families.

---

## 5. Master Excel Workbook Architecture (20 Validated Sheets)

1. `Category Summary`: 34 subcategories with quantity limits and category roles.
2. `All SKUs`: Full 24-column metadata structure for every hardware component.
3. `Chassis Variants`: 6 CTO Base Chassis Models (`P73282-B21` to `P73287-B21`).
4. `Rules & Constraints`: 44 Aspect & constraint rules across the 5 hierarchy levels.
5. `Hardware Accessories`: Form-factor brackets, blanks, security bezels, cable kits.
6. `Software & Licenses`: Pointnext, Tech Care tiers, iLO Advanced, and OS licenses.
7. `Support Services`: Proactive care & startup services configuration table.
8. `Catalog Diffs`: Differential SKU delta tracking with color-coded diff status badges.
9. `Price History Timeline`: 850 chronological snapshot price data points.
10. `Processor`: All 6th Gen Intel Xeon Scalable processors with thermal constraints.
11. `Memory`: DDR5 Registered Smart Memory modules with memory channel rules.
12. `Networking`: High-speed OCP 3.0 & PCIe adapters (10GbE to 200GbE).
13. `Power Supplies`: Titanium, Platinum & -48VDC Flex Slot PSUs with power budget mappings.
14. `Chassis`: Server chassis configurations and backplane topologies.
15. `Accessories & Infrastructure`: Energy Star presets, rail kits, and cable management arms.
16. `Drive Enclosures & Drives`: SFF cage bundles, NVMe drive enclosures, SAS/SATA backplanes.
17. `Storage Controllers`: Tri-Mode MegaRAID & Smart Array storage controllers.
18. `Cooling & Thermal`: High Performance & Standard Fan Kits and Performance Heat Sinks.
19. `Discontinued SKUs`: 790 tracked historical SKUs with EOL dates and price trails.
20. `Metadata`: Scrape metadata, session timestamps, and SHA-256 catalog checksum.

---

## 6. Execution Commands

```bash
# E2E Server/Solution Scrape (DL380 Gen12 / Synergy / Cray)
npm run scrape

# E2E Storage Solution Wizard Scrape (Alletra / Nimble / StoreOnce)
npm run scrape:storage

# Rebuild all scraped catalogs & regenerate workbooks
npm run rebuild

# Full Portfolio Certification Audit
npm test
```
