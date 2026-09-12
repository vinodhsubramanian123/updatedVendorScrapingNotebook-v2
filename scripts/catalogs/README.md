# Catalog Subsystem (`scripts/catalogs/`)

## 1. Purpose & Scope
Manages catalog aggregation, price history diff tracking, JSON-to-Excel conversion, bulk rebuilds from raw DOM scrapes, and QuickSpecs-to-OCA reconciliation.

## 2. Key Modules & Scripts
| Script | Entrypoint / Function | Description |
|---|---|---|
| `build_catalog.js` | `buildCatalogObject()` | Compiles scraped raw JSON into canonical `catalog.json` with historical diffs. |
| `reconcile_quickspecs_oca.js` | `reconcileQuickSpecsWithOca(chassis)` | Compares extracted QuickSpecs hardware options against scraped live OCA catalogs, identifying DOM expansion gaps and emitting `expansion_guidance.json` (`INV-77`). |
| `rebuild_all.js` | `rebuildAllCatalogs()` | Iterates across all registered products in `chassis_map.json` and rebuilds artifacts. |
| `generate_xlsx.js` | `generateWorkbook()` | Generates multi-sheet styled Excel workbooks matching HPE OCA specifications. |
| `csv_to_catalog.js` | `convertCsv()` | Converts flat CSV price lists into hierarchical catalog JSON. |
| `xlsx_to_catalog.js` | `convertXlsx()` | Ingests existing Excel catalogs into JSON companions. |

## 3. Important Invariants
- **INV-1**: Price Trail `appendTrailEvent` deduplicates by DATE only (never date + status).
- **INV-6**: `scrapeDate` in `build_catalog.js` metadata MUST be `YYYY-MM-DD` only (no full ISO timestamps in snapshot filenames).
- **INV-77**: Scraper expansion guidance must be generated dynamically from QuickSpecs reconciliation to ensure zero missing hardware options.
- **Sheet Standards**: Generated Excel files must contain core sheets: `Category Summary`, `All SKUs`, `Chassis Variants`, `Rules & Constraints`, `Price History Timeline`, `Metadata`.
