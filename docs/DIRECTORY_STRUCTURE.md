# Canonical Repository Directory Structure

This document provides the complete, authoritative mapping of the entire `vendorNotebookSolution` workspace.

```
vendorNotebookSolution/
├── .agents/                               ← Agent rules, schemas, and specialized workflow skills
│   ├── AGENTS.md                          ← Core system architecture & agent directives (INV-1 to INV-78)
│   ├── DATA_DICTIONARY.md                 ← JSON schemas & pipeline contracts
│   ├── PORTFOLIO_STATUS.md                ← Live portfolio intelligence state of health (10 canonical products)
│   └── skills/                            ← 15 Specialized workflow skills
│       ├── bom-reconciliation-skill/      ← Customer tender vs partner quote reconciler
│       ├── boq-eval-skill/                ← BOQ validation, pre-flight & Least-Delta Rank 1L/1M
│       ├── catalog-intelligence-skill/    ← Pricing trends & lifecycle state tracking
│       ├── design-taste-frontend/         ← Anti-slop UI design system
│       ├── frontend-design/               ← Frontend motion & interactive standards
│       ├── jules-autonomous-protocol/     ← Google Jules multi-agent protocol & task manager
│       ├── knowledge-sync-skill/          ← Bi-directional RAG knowledge sync skill
│       ├── nlm-skill/                     ← Gemini NotebookLM RAG integration
│       ├── oca-catalog-scraper/           ← CDP remote scraping skill
│       ├── oca-portal-navigator/          ← Partner portal auto-navigator
│       ├── orchestrator-workflow-skill/   ← Macro continuous learning lifecycle
│       ├── presales-query-router/         ← 5-track presales intent query classifier
│       └── rfp-sizing-synthesizer/        ← Unstructured sizing specs to starting BOM
│
├── scripts/                               ← Primary operational scripts & CLI tools
│   ├── scrapers/                          ← 10-stage solution & storage CDP scrapers
│   ├── evaluators/                        ← 7-aspect BOQ math evaluators, route_query.js & strategy synthesizers
│   ├── catalogs/                          ← Catalog compiler, reconcile_quickspecs_oca.js, diff engine & Excel generators
│   ├── maintenance/                       ← Portfolio lifecycle, certification & sync
│   ├── services/                          ← MCP server, Jules orchestrator & feedback listeners
│   ├── demos/                             ← Live CDP visual demos & topology screen capture
│   ├── config/                            ← Chassis maps, JSON profiles, category configs
│   ├── lib/                               ← Domain library subsystems
│   │   ├── aspects/                       ← 7 Physical hardware aspect math checkers
│   │   ├── boq/                           ← Preprocessor, parser, math engine, deal_optimizer.js & Excel exporter
│   │   ├── catalog/                       ← Rules extractor, discovery, diffing & versioning
│   │   ├── conflict/                      ← Conflict graph, least_delta_combinator.js, decision_trace.js & strategy synthesis
│   │   ├── feedback/                      ← HITL feedback capture & learning queue
│   │   ├── notebook/                      ← NotebookLM RAG, knowledge extractor & sanitizer
│   │   ├── ocr/                           ← Gemini Vision OCR service & table parser
│   │   ├── preprocessor/                  ← CTO normalizer, variation clusterer & feedback persister
│   │   ├── prompts/                       ← Guardrail prompt templates for agentic LLM loops
│   │   ├── rag/                           ← Dual-brain local RAG & agentic guardrails
│   │   ├── scraper/                       ← CDP connection kernel & DOM extractors
│   │   ├── sync/                          ← Knowledge payload builder & drift sync hook
│   │   ├── system/                        ← Telemetry, atomic FS, key rotator, Zod schemas & error envelope
│   │   └── index.js                       ← Master barrel re-export
│   └── README.md                          ← Scripts directory guide
│
├── tests/                                 ← 158 isolated test suites across 4 tiers (100% PASS)
│   ├── unit/                              ← 92 suites: aspect math, least-delta, decision traces, deal optimizer, query router
│   ├── chaos/                             ← 38 suites: chaos failure modes, memory fuzz, mutex tests, offline pipeline resilience
│   ├── integration/                       ← 25 suites: multi-chassis BOM audits, portfolio Excel, 15-scenario BOQ benchmarks
│   ├── e2e/                               ← 3 suites: headless browser UI automation, downloads & live CLIC flows
│   ├── fixtures/                          ← 15 Benchmark CSVs (BENCH-01 to BENCH-15), sample quotes & raw DOM snapshots
│   └── README.md                          ← Test execution & benchmark index
│
├── dashboard/                             ← Full-stack React + Vite + Express UI
│   ├── server.cjs                         ← Express backend coordinator
│   ├── routes/                            ← Modular Express route handlers (evaluation, catalogs, notebook)
│   ├── services/                          ← taskManager, pathGuard, errorHandler
│   ├── src/                               ← Modular React frontend application
│   │   ├── App.jsx                        ← Main app shell with custom hooks
│   │   ├── main.jsx                       ← Vite entry point
│   │   ├── assets/                        ← Static images & SVG icons
│   │   ├── config/                        ← Workflow stage definitions
│   │   ├── hooks/                         ← Custom React hooks (useCatalogs, useRagPoller, useSSEStream)
│   │   ├── services/                      ← evalNormalizer, topologyGraphBuilder
│   │   ├── styles/                        ← Supplementary component CSS
│   │   ├── utils/                         ← categoryStyles, logParser, nlpSearch
│   │   └── components/                    ← Modular UI components
│   │       ├── index.js                   ← Master component barrel
│   │       ├── QuarantineManagementDrawer.jsx ← Quarantined deltas review drawer
│   │       ├── header/                    ← ChassisSelector, NavigationTabs, SmartSearchInput
│   │       ├── history/                   ← RunDetailModal, RunHistoryTable
│   │       ├── matrix/                    ← RankCard, ValueEngineeringPanel, MatrixComparisonTable
│   │       ├── reconciliation/            ← ReconciliationActionPanel, VendorMatchTable
│   │       ├── stepper/                   ← StepLogViewer, StepStageCard, WorkflowHeader
│   │       ├── summary/                   ← ChassisActiveModelCard, ChassisHeaderSummary, ChassisPortfolioTable
│   │       ├── telemetry/                 ← Telemetry hooks, modals & sections
│   │       ├── topology/                  ← BoqTopologyCanvas, BoqTopologyModal, BoqTopologyNodeInspector
│   │       ├── uploader/                  ← BoqInputZone, EvaluationProgressSteps, MultiConfigSplitModal
│   │       └── __tests__/                 ← Component unit tests (Vitest)
│   └── README.md                          ← Dashboard architecture & run instructions
│
├── outputs/                               ← All scrape outputs, catalogs & telemetry
│   ├── SCRAPED_CATALOGS.md                ← Master markdown registry of certified catalogs
│   ├── {Family}/{Gen}/{Model}/            ← Promoted catalog artifacts (.xlsx, .json, PDF, all form factor variants)
│   ├── history/                           ← Persistent telemetry, state, sync payloads & reports
│   ├── test_boqs/                         ← Standard test BOQ combinations (combos 1 to 6)
│   ├── temp/                              ← Ephemeral uploads, exports & test sinks (git-ignored)
│   └── README.md                          ← Outputs lifecycle guide
│
├── docs/                                  ← Consolidated project documentation
│   ├── ARCHITECTURE_AND_DESIGN.md         ← Core architecture, Dual-Brain paradigm & diagrams
│   ├── WORKFLOWS_AND_LEARNINGS.md         ← E2E pipelines, agentic guardrails & 80 comprehensive learnings
│   ├── DEVELOPER_GUIDE.md                 ← Local dev, testing tiers, debugging playbook, and API guide
│   ├── DIRECTORY_STRUCTURE.md             ← This canonical directory map
│   ├── CONTINUATION_CHECKPOINT.md         ← Engineering milestones and phase certification record
│   ├── GAP_ANALYSIS_REVIEW.md             ← Comprehensive gap analysis & verification scorecard
│   ├── COMPREHENSIVE_ARCHITECTURE_REVIEW.md
│   ├── NOTEBOOKLM_SOURCE_RETIREMENT_MANIFEST.md
│   └── synergy_analysis.md                ← Synergy 12000 & DL380 hybrid infrastructure case study
│
├── graphify-out/                          ← Semantic dependency graph (auto-generated by graphify)
├── .github/workflows/                     ← CI workflow definitions
├── AGENTS.md                              ← Root agent directives & operational invariants
├── GEMINI.md                              ← Gemini LLM & MCP integration guidelines
├── metadata.json                          ← Project metadata descriptor
├── package.json                           ← NPM scripts, workspaces & dependencies
└── README.md                              ← Project overview & quickstart
```
