# Scripts & Automation Subsystems

This directory contains the operational pipelines, domain libraries, diagnostic tools, and quality assurance suites for the **HPE ProLiant AI Studio BOQ Evaluator & Catalog Intelligence Engine**.

---

## 📂 Functional Hierarchy

```
scripts/
├── cli/                               ← Core Production Entry Points & Pipelines
│   ├── index.js                       ← Master CLI registry
│   ├── scrape_oca_solution.js         ← 10-Stage Dynamic Live OCA Catalog Scraper
│   ├── build_catalog.js               ← Subcategory & Quantity Constraint Classifier
│   ├── generate_xlsx.js               ← 15-20 Sheet Master Excel Generator
│   ├── eval_boq.js                    ← 6-Aspect BOQ Evaluator & Strategy Matrix Synthesizer
│   ├── mcp_server.js                  ← Universal Agentic MCP Server
│   └── download_quickspecs_pdf.js     ← QuickSpecs PDF Downloader
│
├── lib/                               ← Modular Domain Subsystems (Exported via barrel)
│   ├── index.js                       ← Master Domain Barrel Export (6 Subsystems)
│   ├── system/                        ← Logging, Telemetry, FS Atomic, Key Rotator, Schemas
│   ├── boq/                           ← Preprocessor, Evaluator, Conflict Graph, Optimizer
│   ├── aspects/                       ← 7 Physical Aspect Checkers (Compute, Memory, etc.)
│   ├── catalog/                       ← Catalog Rules, Diffing, Sku Hashing, Discovery
│   ├── rag/                           ← Multimodal OCR, Knowledge Sync, NLM Client, Guardrail
│   ├── scraper/                       ← CDP Protocol, DOM Extractors, Auto-Navigator
│   └── feedback/                      ← HITL Feedback Loop, Queue & Learning
│
├── tools/                             ← Diagnostic, CLIC & Inspection Utilities
│   ├── index.js                       ← Tooling registry
│   ├── inspect_oca_session.js         ← Active CDP tab & WebLogic session inspector
│   ├── visual_clic_inspector.js       ← Live CLIC modal trigger & validation inspector
│   ├── parse_clic_modal.js            ← CLIC error text parser & direct SKU extractor
│   ├── feedback_listener.js           ← Async HITL feedback queue subscriber
│   ├── observability_status.js        ← Action ledger & telemetry KPI summarizer
│   ├── analyze_complexity.js          ← Code complexity & AST circular dependency analyzer
│   └── rebuild_all.js                 ← Full portfolio catalog rebuilder from raw_data
│
├── qa/                                ← Quality Verification, Audits & Benchmarks
│   ├── index.js                       ← QA registry
│   ├── verify_all.js                  ← 7/7 Portfolio Certification Suite (`npm test`)
│   ├── verify_excel_tally.js          ← 7-Check Staging Gate Quality Validator
│   ├── test_all_aspects.js            ← 34 Physical Math Assertions
│   ├── test_boq_eval_benchmarks.js    ← 5-Scenario Matrix Benchmarks (Recall & Precision)
│   └── test_dl380_gen12_combinations.js← Combinatorial Stress Testing Suite
│
└── config/                            ← Configuration Profiles & Dynamic Settings
    ├── notebooks.json                 ← Cloud NotebookLM source IDs & mappings
    └── profiles/                      ← Dynamic scraping JSON profiles (proliant_gen12, etc.)
```

---

## 🚀 Key Operational Commands

| Command | Canonical Script | Description |
|---|---|---|
| `npm test` | `scripts/verify_all.js` | Full audit across all catalog outputs on disk |
| `npm run scrape:live` | `scripts/scrape_oca_solution.js` | Run 10-stage live scraping on active browser session |
| `npm run eval:boq` | `scripts/eval_boq.js` | Run 6-aspect physical pre-flight and 5-tier matrix synthesis |
| `npm run mcp:start` | `scripts/mcp_server.js` | Start the Universal Agentic MCP Server |
| `npm run update:graph` | `graphify update .` | Refresh the semantic dependency graph |
