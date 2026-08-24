# Core Library Subsystems (`scripts/lib/`)

## 1. Purpose & Scope
Houses all core business logic, physical hardware aspect checkers, RAG integrations, catalog management, parser pipelines, and system utilities.

## 2. Submodule Directory Map

```
scripts/lib/
├── aspects/       ← 7 Physical hardware aspect checkers (Compute, Memory, Storage, etc.)
├── boq/           ← BOQ preprocessor, parser, math evaluator, budget optimizer & XLSX exporter
├── catalog/       ← Catalog rules, discovery, SKU versioning, diff engine & registry sync
├── conflict/      ← Conflict graph resolution, workload DNA & 5-tier strategy synthesis
├── feedback/      ← HITL feedback capture loop & learning queue
├── notebook/      ← Gemini NotebookLM query utils, knowledge extractor & diagnostics
├── ocr/           ← Gemini Vision OCR service & tabular quote parser
├── rag/           ← Dual-brain local RAG search & agentic MCP guardrails
├── scraper/       ← CDP connection manager, DOM extraction & portal navigation
├── sync/          ← NotebookLM sync client, payload builder & drift inspector
├── system/        ← Telemetry, atomic filesystem operations, key rotators, Zod schemas & logger
└── index.js       ← Master barrel export for all subsystems
```

## 3. Backward Compatibility & Barrel Export
To prevent breaking existing scripts, `scripts/lib/index.js` provides domain-namespaced access:
```javascript
const { system, boq, catalog, rag, scraper, feedback } = require('./lib');
```
Direct imports (e.g. `require('./lib/aspects/compute_thermal')` or `require('./lib/boq_evaluator')`) continue to resolve seamlessly via proxy shims.
