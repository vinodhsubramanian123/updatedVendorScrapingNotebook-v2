# Chrome CDP & DOM Scraping Kernel (`scripts/lib/scraper/`)

## 1. Purpose & Scope
Provides low-level Chrome DevTools Protocol (CDP) connection management, WebLogic navigation routines, and DOM table extractors.

## 2. Key Modules & Functions
| Module | Main Exports | Purpose |
|---|---|---|
| `cdp.js` | `connectCdp()`, `evaluateScript()`, `clickElement()` | Persistent WebSocket connection to Chrome remote debugging port 9222. |
| `dom_extract.js` | `extractTableRows()`, `extractCategoryTree()` | High-performance JS snippets executed inside the browser to extract SKU tables. |
| `navigate_oca.js` | `navigateToOcaChassis()`, `selectConfigMenu()` | Automates navigation through HPE Partner Portal into the target OCA configuration session. |

## 3. Invariants
- Piggybacks on authenticated browser sessions (zero hardcoded passwords).
- All DOM extraction scripts are resilient against dynamic iframe loading and modal overlays.
