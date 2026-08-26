# Scripts Master Index & Pipeline Directives

This directory contains the operational execution pipelines, CLI tools, scrapers, catalog generators, evaluation engines, and maintenance daemons for the HPE BOQ Intelligence Engine.

## 1. Directory Structure

```
scripts/
├── scrapers/          ← Web & CDP scraping pipelines (HPE OCA, QuickSpecs)
├── evaluators/        ← BOQ evaluation math, multi-BOM runners & agentic verifiers
├── catalogs/          ← Catalog building, diff engine, XLSX generators
├── maintenance/       ← Portfolio health, Gen12 certification, registry sync
├── services/          ← MCP server, Jules task orchestrator, feedback daemons
├── demos/             ← CDP interactive visual demos & topology captures
├── config/            ← Chassis maps, profiles, category definitions
├── lib/               ← Modular domain library barrels & math kernels
├── cli_tools.js       ← Unified CLI dispatcher for subcommands
└── README.md          ← This file
```

## 2. Core CLI Commands

| Command | Canonical Path | Description |
|---|---|---|
| `npm run scrape` | `scripts/scrapers/scrape_oca_solution.js` | 10-stage solution catalog scraper |
| `npm run eval:boq` | `scripts/evaluators/eval_boq.js` | 7-aspect BOQ physical math evaluator |
| `npm test` | `tests/integration/verify_all.js` | Portfolio health & Excel integrity audit (7/7 certified) |
| `npm run test:all` | Defined in `package.json` | 50+ comprehensive test suites across 4 tiers |
| `npm run build:catalog` | `scripts/catalogs/build_catalog.js` | Raw JSON to catalog.json compiler |
| `npm run generate` | `scripts/catalogs/generate_xlsx.js` | Excel workbook generator |
| `npm run status` | `scripts/maintenance/observability_status.js` | Single-terminal observability overview |
| `npm run status:sync` | `scripts/maintenance/generate_portfolio_status.js` | Re-sync live portfolio documentation |

## 3. Critical Invariants
- **Atomic Operations**: All JSON modifications must use `safeWriteJsonAtomic` from `scripts/lib/system/fs_compat.js`.
- **Zero-Touch SSO**: Never automate SSO credentials; piggyback on authenticated CDP session (port 9222).
- **Error Envelope**: API responses and script exits must conform to `scripts/lib/system/error_envelope.js`.
