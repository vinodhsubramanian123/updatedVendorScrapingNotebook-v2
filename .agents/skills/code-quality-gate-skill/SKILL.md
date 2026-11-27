---
name: code-quality-gate-skill
description: >-
  **Whole-Repository Code Quality, Complexity Ceiling & Epistemic Verification Gate**.
  **DO call for**: Enforcing the universal cyclomatic complexity ceiling (CC <= 30),
  zero oxlint warnings, clean DAG dependency analysis, clean failure ledgers, and non-empty test matrix discovery.
  **DO NOT call for**: Customer hardware BOQ evaluation (use boq-eval-skill), Google Jules CI/CD (use jules-autonomous-protocol),
  or general text formatting.
---

# Code Quality Gate & Epistemic Verification Skill (`code-quality-gate-skill`)

## 1. Scope & Quality Invariants
This skill establishes non-negotiable code quality, cyclomatic complexity, static analysis, and verification boundaries for all automated agents, subagents, and human contributors operating on this codebase.

- **3-Dimensional Maintainability Ratchet (`CC <= 15` target / `<= 20` cap, `LOC <= 80`, `maxNesting <= 4`) (`INV-229`, `INV-230`, `INV-233`, `INV-234`, `INV-235`)**: Every new and edited function MUST comply with `CC <= 20` (target `<= 15`), `LOC <= 80`, and `maxNesting <= 4` via `scripts/maintenance/analyze_complexity.js --ratchet` and `scripts/config/complexity_ratchet_baseline.json` (which freezes legacy `21–30` functions strictly at or below baseline, never above `CC 30`). Note: `analyze_complexity.js` uses a brace-depth heuristic rather than a full AST parser, so literal brace characters inside regex literals or template strings (`String.fromCharCode(123, 125)`) can desynchronize block tracking.
- **Zero Lint Warnings**: `oxlint` across both core scripts (`npm run lint:core`) and `dashboard/` (`npm run lint`) MUST return 0 warnings and 0 errors.
- **Clean DAG (0 Circular Dependencies)**: The module graph across 710+ files MUST remain a strict directed acyclic graph (`npm run test:circular`), alongside Vitest (`npm --workspace dashboard test -- --run`) and the offline Playwright CI release gate ([`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml), `test_dashboard_browser_e2e.js`, `test_dashboard_full_portfolio_e2e.js`).
- **Non-Empty Isolated Test Discovery (`INV-129`, `INV-218`)**: Every domain test suite MUST discover and execute $>0$ tests; silent passes with 0 assertions or 0 suites are strictly failed.
- **Zero Unverified Check-Ins (`INV-111`)**: Agents MUST NEVER execute `git commit` or `git push` without explicit, unambiguous human user instruction.
- **Documentation Integrity**: Existing docstrings, JSDoc headers, and architectural comments MUST be preserved during refactoring.
- **Normative Directives**: Comply with [Normative Language Standard](../../rules/normative_language.md).

---

## ⛔ HALT Conditions

```
HALT-CQG1: If any function exceeds cyclomatic complexity >30:
  emit [ERR_COMPLEXITY_EXCEEDED] and HALT. Refactor function into smaller sub-helpers.
  Verification: npm run test:complexity

HALT-CQG2: If oxlint detects any lint warnings or errors in scripts/ or tests/:
  emit [ERR_LINT_VIOLATIONS] and HALT. Fix all warnings before completing task.
  Verification: npm run lint:core

HALT-CQG3: If analyze_circular_deps.js detects any cyclic module dependencies:
  emit [ERR_CIRCULAR_DEPENDENCY] and HALT. Break cycles using dependency injection or utility extraction.
  Verification: npm run test:circular

HALT-CQG4: If run_test_matrix.js discovers 0 suites or a suite executes 0 tests:
  emit [ERR_SILENT_EMPTY_TESTS] and HALT. Verify test glob patterns and file discovery.

HALT-CQG5: If failure_ledger.json contains unhandled crash or failure entries:
  emit [ERR_FAILURE_LEDGER_NOT_CLEAN] and HALT. Investigate root cause before release.

HALT-CQG6: If analyze_unreachable_modules.js reports a library module unreachable from every production root
  and absent from ORPHAN_ALLOWLIST, or reports a stale allowlist entry:
  emit [ERR_UNREACHABLE_MODULE] and HALT. Wire the module to a skill, npm script or caller, or delete it with its tests and docs.
  Verification: npm run test:deadcode
```

---

## 2. Verification Commands & Execution Matrix

Execute the automated verification sequence in order:

```bash
# 1. Fast smoke test suite
npm run test:smoke

# 2. 3D maintainability ratchet (CC <= 20, LOC <= 80, maxNesting <= 4; frozen baseline, INV-287)
npm run lint:complexity

# 3. Full oxlint verification across scripts/, tests/, and dashboard/ (0-warning gate)
npm run lint:all

# 4. Circular dependency DAG check & unreachable-module orphan gate
npm run test:circular
npm run test:deadcode

# 5. Skills integrity, Knowledge Graph verification, and Dashboard frontend tests
npm run test:skills
npm run update:graph
npm run verify:graph
npm --workspace dashboard test -- --run

# 6. Domain-specific regression testing
npm run test:domain aspects
npm run test:domain boq
npm run test:domain sync
npm run test:domain conflict
```

---

## 3. Autonomous Refactoring Guidelines
When refactoring functions approaching the CC $\le 30$ threshold:
1. **Extract Predicates**: Move composite boolean conditions (`if (a && b || c && d)`) into well-named private helper functions (`_isEligibleCandidate()`).
2. **Table-Driven Dispatch**: Replace multi-branch `switch` or `if/else` ladders with lookup dictionaries or Map structures.
3. **Guard Clauses**: Invert conditions to return early (`if (!item) return;`), eliminating nested indentation blocks.
4. **Preserve Signatures**: Do not break external caller contracts or exported API signatures.

---

## 4. Offline Playwright CI Gate & Disconnect Guard Discipline (`INV-235`)
- **Scoped Restart Disconnect Windows**: Any `allowRestartDisconnect` tolerance in Playwright release tests (`scripts/maintenance/test_dashboard_browser_e2e.js`) MUST stay scoped strictly inside the intentional server restart window (`[plannedRestartStart, plannedRestartEnd]`). Network errors outside that window FAIL the release check.
- **Non-Hardcoded Topology Fidelity**: Product-scoped evaluation assertions in CI MUST verify dynamic product metadata and live workbook SKU binding rather than hardcoding legacy catalog expectations across unrelated hardware generations.

## 5. References & Related Charters
- [Complexity Analyzer Engine](../../../scripts/maintenance/analyze_complexity.js) via `runAnalysis()` and `analyzeFile()`
- [Skills Integrity Gate](../../../scripts/maintenance/validate_skills_integrity.js) via `runValidation()` (`npm run test:skills`)
- [Knowledge Graph Integrity Gate](../../../scripts/maintenance/verify_graph_integrity.js) via `verifyGraphIntegrity()` (`npm run verify:graph`)
- [Master Operating Charter (CC <= 30 Benchmark)](../../../AGENTS.md)
- [Epistemic Verification Skill](../epistemic-verification-skill/SKILL.md)
- [Enterprise Dashboard UX Skill](../enterprise-dashboard-ux-skill/SKILL.md)
- [System Invariants Directory (INV-229, INV-230, INV-235, INV-287)](../../../docs/INVARIANTS.md)

### Catalog release verification

Use [the catalog evidence contract](../../../docs/CATALOG_EVIDENCE_AND_LEARNING.md) for staged and portfolio replays, held-out benchmarks, and negative tests for stale exports and incomplete pricing. Verify staged artifacts and durable learning alongside the code.
