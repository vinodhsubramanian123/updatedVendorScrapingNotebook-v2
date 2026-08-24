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

| Command | Path | Description |
|---|---|---|
| `npm run scrape` | `scripts/scrape_oca_solution.js` | 10-stage solution catalog scraper |
| `npm run eval:boq` | `scripts/eval_boq.js` | 6-aspect BOQ physical math evaluator |
| `npm test` | `scripts/verify_all.js` | Portfolio health & Excel integrity audit |
| `npm run test:all` | `scripts/test_pipeline_evals.js` | 17 comprehensive test suites |
| `npm run build:catalog` | `scripts/build_catalog.js` | Raw JSON to catalog.json compiler |
| `npm run generate` | `scripts/generate_xlsx.js` | Excel workbook generator |

## 3. Critical Invariants
- **Atomic Operations**: All JSON modifications must use `safeWriteJsonAtomic` from `scripts/lib/fs_compat.js`.
- **Zero-Touch SSO**: Never automate SSO credentials; piggyback on authenticated CDP session (port 9222).
- **Error Envelope**: API responses and script exits must conform to `error_envelope.js`.
