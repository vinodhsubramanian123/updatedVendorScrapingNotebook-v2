# Interactive Demos & Visual Tools (`scripts/demos/`)

## 1. Purpose & Scope
Contains developer utilities for interactive browser audits, CDP visual demonstrations, topology screenshot captures, and end-to-end user experience validations.

## 2. Key Modules & Scripts
| Script | Command | Description |
|---|---|---|
| `live_visual_demo_cdp.js` | `npm run demo:live` | Live interactive demonstration highlighting OCA DOM navigation in real-time. |
| `demo_qs_vs_menu_cdp.js` | `npm run demo:qs` | Comparative demo showing QuickSpecs rules vs live OCA menu options. |

Browser E2E UI audits live in [`scripts/maintenance/test_dashboard_browser_e2e.js`](../maintenance/test_dashboard_browser_e2e.js) and [`tests/e2e/test_dashboard_full_portfolio_e2e.js`](../../tests/e2e/test_dashboard_full_portfolio_e2e.js).
