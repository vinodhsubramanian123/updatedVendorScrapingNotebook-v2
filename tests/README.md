# Test Suite Index & Directives (`tests/`)

## 1. Overview & Test Architecture
The test suite ensures 100% mathematical accuracy, chaos resilience, and zero regression across the entire HPE OCA catalog scraping and BOQ evaluation stack.

```
tests/
├── unit/          ← Aspect math checkers, token rotators, Zod schemas & preprocessors
├── chaos/         ← Chaos injection, concurrency race conditions, memory fuzzing & failover
├── integration/   ← Multi-chassis BOM audits, portfolio Excel verifications & API routes
├── e2e/           ← Headless browser UI automation & end-to-end customer BOQ journeys
├── fixtures/      ← Fixed test data, benchmark CSVs, sample quotes & raw DOM snapshots
└── README.md      ← This index file
```

## 2. Test Execution Commands

| Target | Command | Purpose |
|---|---|---|
| **All Test Suites** | `npm run test:all` | Runs all 17+ comprehensive unit, chaos, integration, and aspect suites. |
| **Portfolio Audit** | `npm test` | Audits all 6 certified product lines in `outputs/` against 7 guardrail checks. |
| **Aspect Unit Tests** | `npm run test:aspect_units` | Tests the 7 physical aspect math checkers against positive/negative fixtures. |
| **Chaos & Resilience** | `npm run test:chaos` | Runs 44 adversarial failure mode scenarios. |
| **Key Rotator Suite** | `npm run test:rotator` | Validates smart FIFO key rotation & daily quota demotion. |
| **Dashboard Server** | `npm run test:dashboard_server` | Tests Express backend routes, task mutex, and error handlers. |

## 3. Mandatory 100% Pass Benchmark
Every pull request and modification MUST achieve:
- **100% Pass Rate** across all suites.
- **Zero Lint Errors & Zero Warnings** (`npm run lint`).
- **No Temporary Test File Leaks** (INV-7 compliance).
