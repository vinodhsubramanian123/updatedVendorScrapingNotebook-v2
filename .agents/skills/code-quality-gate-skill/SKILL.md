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

- **Universal Cyclomatic Complexity $\le 30$ (`INV-229`, `INV-230`)**: Every function across all JavaScript files MUST strictly comply with a maximum cyclomatic complexity ceiling of 30. Zero functions exceeding 30 are permitted.
- **Zero Lint Warnings**: `oxlint` across core scripts and tests MUST return 0 warnings and 0 errors.
- **Clean DAG (0 Circular Dependencies)**: The module graph across 690+ files MUST remain a strict directed acyclic graph.
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
```

---

## 2. Verification Commands & Execution Matrix

Execute the automated verification sequence in order:

```bash
# 1. Fast smoke test suite (8 suites, ~10s)
npm run test:smoke

# 2. Universal cyclomatic complexity audit (<= 30 global ceiling)
npm run test:complexity

# 3. Core code linter (oxlint, 95 rules)
npm run lint:core

# 4. Circular dependency DAG check (690+ files)
npm run test:circular

# 5. Domain-specific regression testing
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

## 4. References & Related Charters
- [Complexity Analyzer Engine](../../../scripts/maintenance/analyze_complexity.js) via `runAnalysis()` and `analyzeFile()`
- [Master Operating Charter (CC <= 30 Benchmark)](../../../AGENTS.md)
- [Epistemic Verification Skill](../epistemic-verification-skill/SKILL.md)
- [System Invariants Directory (INV-229, INV-230)](../../../docs/INVARIANTS.md)
