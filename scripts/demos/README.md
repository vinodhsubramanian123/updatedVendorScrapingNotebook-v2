# Interactive Demos & Visual Tools (`scripts/demos/`)

## 1. Purpose & Scope
Contains developer utilities for interactive browser audits, CDP visual demonstrations, topology screenshot captures, and end-to-end user experience validations.

## 2. Key Modules & Scripts
| Script | Command | Description |
|---|---|---|
| `live_visual_demo_cdp.js` | `npm run demo:live` | Live interactive demonstration highlighting OCA DOM navigation in real-time. |
| `demo_qs_vs_menu_cdp.js` | `npm run demo:qs` | Comparative demo showing QuickSpecs rules vs live OCA menu options. |
| `capture_topology_screenshot.js` | `node scripts/demos/capture_topology_screenshot.js` | Captures headless PNG render of the hardware topology graph. |
| `deep_e2e_browser_audit.js` | `node scripts/demos/deep_e2e_browser_audit.js` | Full browser automation audit verifying UI rendering and button actions. |
| `interactive_browser_eval_suite.js` | `node scripts/demos/interactive_browser_eval_suite.js` | Comprehensive browser test runner for dashboard workflows. |
