# Canonical Repository Directory Structure

This document provides the complete, authoritative mapping of the entire `vendorNotebookSolution` workspace.

```
vendorNotebookSolution/
├── .agents/                               ← Agent rules, schemas, and specialized workflow skills
│   ├── AGENTS.md                          ← Core system architecture & agent directives
│   ├── DATA_DICTIONARY.md                 ← JSON schemas & pipeline contracts
│   ├── PORTFOLIO_STATUS.md                ← Live portfolio intelligence state of health
│   └── skills/                            ← Specialized workflow skills
│       ├── boq-eval-skill/                ← BOQ validation & pre-flight skill
│       ├── design-taste-frontend/         ← Anti-slop UI design system
│       ├── frontend-design/               ← Frontend motion & interactive standards
│       ├── knowledge-sync-skill/          ← Bi-directional RAG knowledge sync skill
│       ├── nlm-skill/                     ← Gemini NotebookLM RAG integration
│       ├── oca-catalog-scraper/           ← CDP remote scraping skill
│       ├── oca-portal-navigator/          ← Partner portal auto-navigator
│       └── orchestrator-workflow-skill/   ← Macro 6-stage lifecycle orchestration
│
├── scripts/                               ← Primary operational scripts & CLI tools
│   ├── scrapers/                          ← 10-stage solution & storage CDP scrapers
│   ├── evaluators/                        ← 6-aspect BOQ math evaluators & strategy synthesizers
│   ├── catalogs/                          ← Catalog compiler, diff engine & Excel generators
│   ├── maintenance/                       ← Portfolio lifecycle, certification & sync
│   ├── services/                          ← MCP server, Jules orchestrator & feedback listeners
│   ├── demos/                             ← Live CDP visual demos & topology screen capture
│   ├── config/                            ← Chassis maps, JSON profiles, category configs
│   ├── lib/                               ← Domain library subsystems
│   │   ├── aspects/                       ← 7 Physical hardware aspect math checkers
│   │   ├── boq/                           ← Preprocessor, parser, math engine & Excel exporter
│   │   ├── catalog/                       ← Rules extractor, discovery, diffing & versioning
│   │   ├── conflict/                      ← Conflict graph DAG & 5-tier strategy synthesis
│   │   ├── feedback/                      ← HITL feedback capture & learning queue
│   │   ├── notebook/                      ← NotebookLM RAG, knowledge extractor & sanitizer
│   │   ├── ocr/                           ← Gemini Vision OCR service & table parser
│   │   ├── rag/                           ← Dual-brain local RAG & agentic guardrails
│   │   ├── scraper/                       ← CDP connection kernel & DOM extractors
│   │   ├── sync/                          ← Knowledge payload builder & drift sync hook
│   │   ├── system/                        ← Telemetry, atomic FS, key rotator & Zod schemas
│   │   └── index.js                       ← Master barrel re-export
│   └── README.md                          ← Scripts directory guide
│
├── tests/                                 ← 17+ comprehensive test suites (100% PASS)
│   ├── unit/                              ← Aspect math, token rotators, Zod schemas
│   ├── chaos/                             ← Chaos failure modes, memory fuzz, mutex tests
│   ├── integration/                       ← BOM audits, pricing history, pipeline evals
│   ├── e2e/                               ← Headless browser UI automation & download flows
│   ├── fixtures/                          ← Benchmark CSVs, customer quotes & raw JSON
│   └── README.md                          ← Test execution & benchmark index
│
├── dashboard/                             ← Full-stack React + Vite + Express UI
│   ├── server.cjs                         ← Express backend coordinator
│   ├── routes/                            ← Modular Express route handlers
│   ├── services/                          ← taskManager, pathGuard, errorHandler
│   ├── src/                               ← Modular React UI components
│   └── README.md                          ← Dashboard architecture & run instructions
│
├── outputs/                               ← All scrape outputs, catalogs & telemetry
│   ├── SCRAPED_CATALOGS.md                ← Master markdown registry of certified catalogs
│   ├── {Family}/{Gen}/{Model}_{FormFactor}/  ← Promoted catalog artifacts (.xlsx, .json, PDF)
│   ├── history/                           ← Persistent telemetry, state, sync payloads & reports
│   ├── test_boqs/                         ← Standard test BOQ combinations (combos 1 to 6)
│   ├── temp/                              ← Ephemeral uploads, exports & test sinks (git-ignored)
│   └── README.md                          ← Outputs lifecycle guide
│
├── docs/                                  ← Consolidated project documentation
│   ├── ARCHITECTURE_AND_DESIGN.md         ← Core architecture, Dual-Brain paradigm & diagrams
│   ├── WORKFLOWS_AND_LEARNINGS.md         ← E2E pipelines, agentic guardrails & learnings
│   ├── DEVELOPER_GUIDE.md                 ← Local dev, testing, and API guide
│   ├── DIRECTORY_STRUCTURE.md             ← This canonical directory map
│   └── COMPREHENSIVE_ARCHITECTURE_REVIEW.md
│
├── diagrams/                              ← 22 Mermaid architecture diagrams + interactive viewer.html
├── AGENTS.md                              ← Root agent directives & operational invariants
├── GEMINI.md                              ← Gemini LLM & MCP integration guidelines
├── package.json                           ← NPM scripts, workspaces & dependencies
└── README.md                              ← Project overview & quickstart
```
