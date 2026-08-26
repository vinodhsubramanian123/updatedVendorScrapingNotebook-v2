# Test Suite Index & Directives (`tests/`)

## 1. Overview & Test Architecture
The test suite ensures 100% mathematical accuracy, chaos resilience, and zero regression across the entire HPE OCA catalog scraping and BOQ evaluation stack.

```
tests/
├── unit/          ← Aspect math checkers, token rotators, Zod schemas, preprocessors, data validator, error envelope, drift inspector, feedback persister, query sanitizer, jules task manager
├── chaos/         ← Chaos injection, concurrency race conditions, memory fuzzing, task mutex, offline resilience
├── integration/   ← Multi-chassis BOM audits, portfolio Excel verifications, API routes, multi-config eval, DL380 combinations, BOQ benchmarks
├── e2e/           ← Headless browser UI automation & end-to-end customer BOQ journeys
├── fixtures/      ← Fixed test data, benchmark CSVs, sample quotes & raw DOM snapshots
└── README.md      ← This index file
```

## 2. Test Execution Commands

| Target | Command | Purpose |
|---|---|---|
| **All Test Suites** | `npm run test:all` | Runs all 50+ comprehensive unit, chaos, integration, and e2e suites (100% PASS). |
| **Portfolio Audit** | `npm test` | Audits all 7 certified product lines in `outputs/` against 7 guardrail checks. |
| **Aspect Unit Tests** | `npm run test:aspect_units` | Tests the 7 physical aspect math checkers against positive/negative fixtures. |
| **Chaos & Resilience** | `npm run test:resilience` | Runs adversarial failure mode and resilience scenarios. |
| **Key Rotator Suite** | `npm run test:rotator` | Validates smart FIFO key rotation & daily quota demotion. |
| **Dashboard Server** | `npm run test:dashboard_server` | Tests Express backend routes, task mutex, and error handlers. |
| **Data Validator** | `npm run test:data_validator` | Validates catalog data schema integrity, bounds, and price parser. |
| **Error Envelope** | `npm run test:error_envelope` | Validates error envelope standardization and wrapAsync handlers. |
| **Drift Inspector** | `npm run test:drift_inspector` | Validates knowledge drift inspection across chassis taxonomy. |
| **Feedback Persister** | `npm run test:feedback_persister` | Validates atomic preprocessing rule persistence and recovery. |
| **Query Sanitizer** | `npm run test:query_sanitizer` | Validates NLP query sanitization and prompt injection guards. |
| **Multi-Config Eval** | `npm run test:eval_multi` | Validates multi-configuration batch evaluator. |
| **Jules Orchestrator** | `npm run test:jules_task_manager` | Validates Jules task manager and GitHub REST client. |

## 3. Mandatory 100% Pass Benchmark
Every pull request and modification MUST achieve:
- **100% Pass Rate** across all suites (`npm run test:all`).
- **Zero Lint Errors & Zero Warnings** (`npm run lint`).
- **No Temporary Test File Leaks** (INV-7 compliance).
- **7/7 Product Lines Certified** (`npm test`).
