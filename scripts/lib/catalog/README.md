# Catalog Management Subsystem (`scripts/lib/catalog/`)

## 1. Purpose & Scope
Provides utilities for catalog discovery, schema validation, rule extraction, SKU versioning, and price change diff analysis across product lifecycles.

## 2. Key Modules & Functions
| Module | Main Exports | Purpose |
|---|---|---|
| `catalog_discovery.js` | `discoverCatalogs()`, `loadCatalog()` | Locates promoted catalog files and metadata dynamically across `outputs/`. |
| `catalog_rules.js` | `extractCatalogRules()`, `resolveMandatory()` | 5-level rule extractor building dependency maps, exclusions, and min/max limits. |
| `catalog_formatter.js` | `formatCatalogEntry()`, `sanitizeEntry()` | Normalizes OCA DOM table fields into uniform JSON records. |
| `diff_catalog.js` | `diffCatalogs()`, `appendTrailEvent()` | Computes diff snapshots between catalog runs and maintains cumulative price histories. |
| `sku_versioning.js` | `getHistoricalSkuPrice()` | Memoized historical pricing cache with lifecycle resets. |
| `sku.js` | `isValidHpeSKU()`, `normalizeSku()` | Centralized HPE SKU regular expression definitions and sanity filters. |
| `product_meta.js` | `parseProductMeta()` | Universal product family and model parser. |
| `profile_loader.js` | `loadProfile()` | Dynamically loads scraping configuration profiles from `scripts/config/profiles/`. |
| `registry.js` | `updateScrapedRegistry()` | Updates `outputs/SCRAPED_CATALOGS.md` with verified SKU tallies. |
| `sync_registry.js` | `syncMasterRegistry()` | Synchronizes master registry records across multi-chassis deployments. |

## 3. Important Invariants
- **INV-1**: `appendTrailEvent` deduplicates by DATE only.
- **INV-2**: Registry SKU count must come from `liveCatalogJson.metadata.totalUniqueSKUs`.
- **INV-6**: Catalog metadata `scrapeDate` MUST be `YYYY-MM-DD`.
- **INV-9**: SKU lookups utilize `catalogPriceCache` with `_clearCatalogPriceCache()` for memory hygiene.
