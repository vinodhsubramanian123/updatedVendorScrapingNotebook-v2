# Project Rules — HPE OCA Catalog Intelligence

## Project Overview
This workspace contains tools for scraping, parsing, and organizing HPE server product catalog data from the **OCA (Online Configuration Application)** portal. The primary outputs are classified Excel workbooks + JSON companions for import into Google Notebook LM and the Vendor BOM Comparison Engine.

---

## Pipeline State of Health (Last Updated: 2026-08-11)

### ✅ Certified Products (100% Audit Pass)
| Product | Family | Output Prefix | SKUs | Excel Sheets | QuickSpecs PDF | Status |
|---------|--------|---------------|------|-------------|----------------|--------|
| HPE ProLiant DL380 Gen12 SFF | ProLiant | `DL380_Gen12_SFF` | 951 | 30 | ✅ Verified (2.06 MB) | ✅ 100% PASS |
| HPE Alletra Storage System | Alletra | `Alletra_Storage_System` | 92 | 8 | ✅ Verified (2.06 MB) | ✅ 100% PASS |
| HPE ProLiant DL380 Gen11 | ProLiant | `DL380_Gen11` | 1,253 | 24 | ✅ Verified (2.06 MB) | ✅ 100% PASS |
| HPE StoreEver MSL3040 Tape Library | StoreEver | `MSL3040_Tape` | 85 | 11 | ✅ Verified (2.06 MB) | ✅ 100% PASS |
| HPE Cray Supercomputing GX5000 Rack | Cray | `GX5000_General_RACK` | 46 | 11 | ⚠️ Advisory (No DOM link) | ✅ 100% PASS |
| HPE Synergy VC 100Gb F32 Module | Synergy | `SY100Gb_F32_Module` | 141 | 8 | ✅ Verified (0.89 MB) | ✅ 100% PASS |

**Total Portfolio Intelligence**: **2,568 unique SKUs** across 6 product lines in 5 families. 81/81 Test Assertions 100% Certified.

### ✅ Automated Evaluation Benchmark Suite (`scripts/test_boq_eval_benchmarks.js`)
- **Pass Rate**: 5/5 Scenarios (100.0%)
- **Recall Rate**: 100.0%
- **Precision Rate**: 100.0%
- **Strategy Matrix Tiers**: 5 Tiers Validated (Rank 1 through Rank 5)

---

## Canonical Directory Layout

```
booktoSkill/
├── .agents/
│   ├── AGENTS.md                          ← project rules & state of health
│   ├── DATA_DICTIONARY.md                 ← JSON schemas & contracts
│   └── skills/
│       ├── orchestrator-workflow-skill/   ← macro 6-stage lifecycle orchestration
│       ├── oca-catalog-scraper/           ← step-by-step scraping skill
│       ├── oca-portal-navigator/          ← hands-free partner portal & oca navigator skill
│       ├── boq-eval-skill/                ← BOQ validation & pre-flight skill
│       ├── nlm-skill/                     ← Gemini NotebookLM RAG integration
│       └── knowledge-sync-skill/          ← delta sync & knowledge registry skill
├── scripts/                               ← ALL Node.js scripts live here
│   ├── lib/
│   │   ├── boq_evaluator.js               ← 6-aspect physical math engine
│   │   ├── cdp.js                         ← shared CDP connection & command module
│   │   ├── conflict_graph.js              ← 5-level conflict graph & strategy matrix
│   │   ├── diff_catalog.js                ← catalog diff & price history engine
│   │   ├── dom_extract.js                 ← DOM text & table extraction helpers
│   │   ├── fs_compat.js                   ← safe atomic file operations & backups
│   │   ├── logger.js                      ← standardized console logger
│   │   ├── navigate_oca.js                ← smart partner portal & oca auto-navigator
│   │   ├── notebook_query_utils.js        ← natural language query pre/post-processor
│   │   ├── product_meta.js                ← universal product family & model parser
│   │   ├── registry.js                    ← shared registry table updater (DRY)
│   │   ├── sku.js                         ← centralized HPE SKU regex & normalization
│   │   ├── sync_registry.js               ← master registry auto-synchronizer
│   │   ├── system/
│   │   │   └── telemetry.js               ← pipeline telemetry & action ledger engine
│   │   └── vendor_bom_verifier.js         ← vendor BOM cross-verification & scrape trigger
│   ├── eval_boq.js                        ← primary BOQ evaluator CLI
│   ├── test_boq_eval_benchmarks.js        ← automated BOQ evaluation benchmark suite
│   ├── test_all_aspects.js                ← 34-test aspect math verification suite
│   ├── verify_all.js                      ← portfolio audit suite (npm test)
│   └── rebuild_all.js                     ← rebuild all catalogs from raw_data
├── outputs/                               ← ALL scrape outputs live here
│   ├── SCRAPED_CATALOGS.md                ← master registry of every scrape
│   └── {Family}/{Gen}/{Model}_{FormFactor}/
├── README.md                              ← project documentation & run commands
└── package.json                           ← npm configuration & script targets
```

> **Rule — NO FILES AT PROJECT ROOT**: Output JSON, Excel, TSV, and PDF files MUST NEVER be written to the project root. All outputs go inside `outputs/{Family}/{Gen}/{Model}/`.

> **Rule — ALWAYS REFERENCE DATA DICTIONARY**: Before reading or modifying pipeline JSON schemas (`catalog.json`, `evalResults`, `telemetry`), AI agents MUST read `.agents/DATA_DICTIONARY.md` to understand data contracts.

---

## Key Operational Rules

1. **Authentication via CDP**: Use Chrome DevTools Protocol on port 9222 to piggyback on the active authenticated browser session.
2. **Safe Atomic Writes**: All JSON modifications MUST pass through `safeWriteJsonAtomic` in `scripts/lib/fs_compat.js`.
3. **Dynamic Pathing**: Never hardcode file paths or chassis IDs in scripts. Derive them from CLI arguments or metadata.
4. **Clean SKU Regex**: All SKUs must pass `isValidHpeSKU()` filtering. `Current Qty` must pass `/^\d+$/`.
5. **5-Tier Strategy Matrix**: Always synthesize Rank 1 (Intent Preserved) through Rank 5 (Budget Minimized) without duplicate ranks or hallucinated SKUs.
