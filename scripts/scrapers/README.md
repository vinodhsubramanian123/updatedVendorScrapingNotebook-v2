# Scraper Subsystem (`scripts/scrapers/`)

## 1. Purpose & Scope
Contains all automated web and CDP (Chrome DevTools Protocol) scrapers that connect to HPE OCA (Online Configuration Application) and partner portals to extract hardware, service SKUs, and QuickSpecs PDFs.

## 2. Key Modules & Scripts
| Script | Entrypoint / Function | Description |
|---|---|---|
| `scrape_oca_solution.js` | `scrapeSolution()` | Primary 10-stage solution scraper with staging directory audit & promotion. |
| `scrape_oca_storage_solution.js` | `scrapeStorage()` | Dedicated scraper for HPE Alletra and StoreEver modular storage units. |
| `scrape_oca.js` | `scrapeRaw()` | Raw DOM table and field dump pipeline. |
| `download_quickspecs_pdf.js` | `downloadQuickSpecsPdf()` | Fetches official HPE QuickSpecs PDF by chassis model name. |
| `expand_and_rescrape.js` | `expandSections()` | Expands collapsed DOM accordion trees in OCA. |
| `parse_clic_modal.js` | `parseClicModal()` | Inspects and parses CLIC configuration rule modals. |
| `visual_clic_inspector.js` | `inspectClic()` | Visual selector inspector for CLIC interface trees. |

## 3. Operational Invariants
- **INV-1 & INV-2**: SKU counts must come from `liveCatalogJson.metadata.totalUniqueSKUs`, NEVER DOM table group lengths (`tables.length`).
- **INV-5**: Step 10 failure in `scrape_oca_solution.js` MUST rethrow errors, never silently warn.
- **Port 9222**: Scrapers attach to the local authenticated Chrome instance on `127.0.0.1:9222`.
- **Staging Directory**: Raw scrapes write to `outputs/{Family}/{Gen}/{Model}/staging/` before passing audit guardrails and being promoted to live catalog.
