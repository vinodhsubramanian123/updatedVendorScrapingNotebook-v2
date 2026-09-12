# Test Suite Index & Directives (`tests/`)

## 1. Overview & Test Architecture
The test suite ensures 100% mathematical accuracy, chaos resilience, and zero regression across the entire HPE OCA catalog scraping and BOQ evaluation stack. The isolated test matrix spans **158 test suites** across 4 execution tiers:
- **Unit Tier (92 Suites)**: Hardware aspect math, preprocessors, token rotators, schema validators, plus core Phase 7 modules (`test_least_delta_combinator.js`, `test_decision_trace_ledger.js`, `test_deal_optimizer.js`, `test_quickspecs_oca_reconciliation.js`, `test_query_router.js`).
- **Chaos Tier (38 Suites)**: Chaos fault injection, concurrency race conditions, memory fuzzing, async task mutex, offline resilience, and circuit breaker stress tests.
- **Integration Tier (25 Suites)**: Multi-chassis BOM audits, portfolio Excel verifications, API routes, multi-config batch eval, and the 15-scenario evaluation benchmark suite (`test_boq_eval_benchmarks.js`).
- **End-to-End Tier (3 Suites)**: Headless browser UI automation, downloads verification, and live CLIC evaluation workflows.

```
tests/
├── unit/          ← 92 suites: aspect math, rotators, schemas, least-delta, decision traces, deal optimizer, query router
├── chaos/         ← 38 suites: chaos injection, concurrency race conditions, memory fuzzing, task mutex, offline resilience
├── integration/   ← 25 suites: multi-chassis BOM audits, portfolio Excel verifications, API routes, 15-scenario BOQ benchmarks
├── e2e/           ← 3 suites: headless browser UI automation, download flows, and live CLIC verification
├── fixtures/      ← Fixed test data, 15 benchmark CSVs (BENCH-01 to BENCH-15), customer quotes & raw DOM snapshots
└── README.md      ← This index file
```

## 2. Test Execution Commands

| Target | Command | Purpose |
|---|---|---|
| **All Test Suites** | `npm run test:all` | Runs all 158 isolated unit, chaos, integration, and e2e test suites (100% PASS). |
| **Portfolio Audit** | `npm test` | Audits all 10 certified product lines in `outputs/` against 7 guardrail checks. |
| **BOQ Benchmark Suite** | `npm run test:benchmarks` | Executes the 15 enterprise evaluation scenarios (`BENCH-01` to `BENCH-15`). |
| **Aspect Unit Tests** | `npm run test:aspects` | Tests the 7 physical aspect math checkers against positive/negative fixtures. |
| **Chaos & Resilience** | `npm run test:edges` | Runs adversarial failure mode and resilience scenarios. |
| **Key Rotator Suite** | `npm run test:rotator` | Validates smart FIFO key rotation & daily quota demotion. |
| **Fast Sanity Tier** | `npm run test:fast` | Runs fast-tier regression tests for quick feedback loops. |
| **Least-Delta Unit** | `node tests/unit/test_least_delta_combinator.js` | Validates troublesome SKU pruning, dynamic alternatives, and cascade avoidance. |
| **Decision Trace Unit**| `node tests/unit/test_decision_trace_ledger.js` | Validates 4-brain source attribution, reasoning chain, and disk persistence. |
| **Deal Optimizer Unit**| `node tests/unit/test_deal_optimizer.js` | Validates CPU right-sizing, NIC bandwidth alignment, and CapEx savings math. |
| **Query Router Unit**  | `node tests/unit/test_query_router.js` | Validates 5-track presales intent classification and confidence scoring. |
| **QuickSpecs Recon**   | `node tests/unit/test_quickspecs_oca_reconciliation.js` | Validates ingestion parity and scraper DOM expansion guidance. |

## 3. Mandatory 100% Pass Benchmark
Every pull request and modification MUST achieve:
- **100% Pass Rate** across all 158 test suites (`npm run test:all`).
- **Zero Lint Errors & Zero Warnings** (`npm run lint` via `oxlint`).
- **All Functions CC $\le 135$** (`npm run lint:complexity`).
- **No Temporary Test File Leaks** (INV-7 compliance).
- **10/10 Product Lines Certified** (`npm test`).
