# Maintenance Subsystem (`scripts/maintenance/`)

## 1. Purpose & Scope
Provides utilities for portfolio lifecycle management, Gen12 certification, master registry synchronization, and codebase complexity tracking.

## 2. Key Modules & Scripts
| Script | Entrypoint / Function | Description |
|---|---|---|
| `certify_gen12.js` | `certifyGen12()` | Complete test and audit certification pipeline for DL380 Gen12 SFF. |
| `bootstrap_gen12.js` | `bootstrapGen12()` | Initial directory, profile, and baseline configuration setup for Gen12. |
| `maintain_gen12.js` | `maintainGen12()` | Routine sync, QuickSpecs verification, and NotebookLM updates for Gen12. |
| `maintain_portfolio.js` | `maintainPortfolio()` | Health check across all registered product families in `outputs/`. |
| `generate_portfolio_status.js` | `updatePortfolioStatus()` | Regenerates `.agents/PORTFOLIO_STATUS.md` from live catalog artifacts. |
| `sync_all_registered_catalogs.js` | `syncAllCatalogs()` | Triggers bi-directional NotebookLM sync across all 6 certified product lines. |
| `observability_status.js` | `getObservabilityStatus()` | Inspects pipeline telemetry, daily Gemini quotas, and error rates. |
| `analyze_complexity.js` | `analyzeCodeComplexity()` | Static analysis measuring cyclomatic complexity and God node risks. |
