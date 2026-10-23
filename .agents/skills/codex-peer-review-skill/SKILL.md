---
name: codex-peer-review-skill
description: >-
  **OpenAI Codex Autonomous Peer Review & Verification Protocol** — Guides when and how
  to invoke Codex CLI for independent static peer reviews, gap analysis, and architectural judgements.
  Governs model selection (gpt-6.1-sol default for reviews/gap analysis vs gpt-6-astra for highest complexity
  intelligence), ChatGPT Plus token conservation, non-interactive execution, parallel execution,
  and fail-open rate limit recovery.
---

# OpenAI Codex Autonomous Peer Review & Verification Protocol

## 0. Master Directive & Operating Context
- **Purpose**: Independent static peer-review and red-teaming layer providing objective gap analysis on refactored code, architectural invariants, and cross-vendor integrations.
- **User Subscription**: ChatGPT Plus plan. Tokens and hourly quota must be used purposefully with zero waste.
- **Zero-Help Invariant**: AI agents MUST NEVER run `codex --help`, `codex review --help`, or exploratory CLI tests. All flags and execution patterns are strictly codified in this skill.
- **Universal Pre-Approval**: Blanket authorization is granted. Execute all commands non-interactively without prompting the user.
- **Tool Segregation (`INV-72`)**: Codex is strictly an independent peer review / audit layer. It is NEVER part of live customer BOQ generation pipelines.

---

## 1. Model Routing & Capability Matrix

| Complexity Tier | Model Identifier | CLI Flag | Token Footprint | Canonical Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **Default Review & Gap Analysis** | `gpt-6.1-sol` (sol 6.1) | `-m gpt-6.1-sol` (default) | Optimized / Moderate | **Primary model for all standard workflows**: Branch reviews (`codex review --base origin/main`), uncommitted diff checks, refactoring gap analysis, and regression checks. |
| **Focused Subsystem Audit** | `gpt-6.1-sol` (sol 6.1) | `-m gpt-6.1-sol` | Low / Scoped | Targeted non-interactive checks on specific files or functions (`codex exec -m gpt-6.1-sol`). |
| **Highest Intelligence & Architectural Dilemmas** | `gpt-6-astra` (astra) | `-m gpt-6-astra` | Deep Reasoning / High | **Reserved exclusively for the most critical, complex tasks**: Deep topological conflict resolution, multi-tier Diophantine sizing proofs, or ambiguous cross-vendor schema transformations where standard models lack clarity. Use sparingly to conserve Plus quota. |

---

## 2. Canonical Execution Commands

### A. Full Branch Review Against Origin/Main
Review all local commits on the active branch against remote `origin/main`:
```powershell
codex review --base origin/main
```

### B. Uncommitted Working Tree Review
Pre-commit sanity check to audit dirty or staged files before committing:
```powershell
codex review --uncommitted
```

### C. Specific Commit Audit
Review only the changes introduced in a single git commit (highly token-conservative):
```powershell
codex review --commit <SHA>
```

### D. Scoped Non-Interactive Architectural Query (Sol 6.1)
Run a fast, non-interactive review of a specific subsystem:
```powershell
codex exec -m gpt-6.1-sol "Inspect scripts/lib/boq/boq_parser.js for cross-vendor Option-ID handling. Identify any regression risk or missing edge cases."
```

### E. Deep Architectural Proof Query (Astra)
Run deep reasoning on a high-complexity topological question:
```powershell
codex exec -m gpt-6-astra "Evaluate Diophantine cluster multiplier derivation across heterogeneous 42U rack envelopes. Ensure zero silent passes."
```

---

## 3. Plus Plan Token Optimization & Quota Governance

1. **Targeted Diffs Over Monolithic Sweeps**:
   - If only 1-2 files were edited, review the specific commit (`codex review --commit <SHA>`) or uncommitted diff (`--uncommitted`) instead of sweeping the entire branch history.
2. **Background Execution Discipline**:
   - Launch Codex as a background command with adequate synchronous timeout (e.g. `WaitMsBeforeAsync: 10000`).
   - Never poll in a tight loop. Let the system reactive wakeup deliver the finished review.
3. **Fail-Open Non-Blocking Protocol**:
   - If Codex returns a rate limit error (e.g., `ERROR: You’ve hit your usage limit... try again at X:XX PM`):
     - Log the quota reset timestamp in telemetry / review notes.
     - **DO NOT halt the pipeline**: The local engine (Antigravity / Gemini 3.8 / 7-aspect checkers) is the primary deterministic builder. Evaluations and tests continue without blocking.
     - Resume Codex reviews automatically once the quota window resets.

---

## 4. Gap Analysis Triage & Continuous Learning Protocol

When a Codex review returns:
1. **Analyze Findings**:
   - Separate **Actionable Defects** (regressions, off-by-one errors, unhandled nulls, missing vendor headers) from **Advisory/Stylistic Notes**.
2. **Backtrack & Root Cause Analysis**:
   - Identify the exact code path and root cause for each actionable defect.
3. **Deterministic Fix & Verification**:
   - Implement the fix using atomic operations (`safeWriteJsonAtomic` or `replace_file_content`).
   - Run verification gates: `npm run lint:core` (0 warnings/errors) and `npm run test:smoke` (100% pass).
4. **Pattern Observation**:
   - Check if the same pattern or blindspot exists in sibling subsystems (e.g. if Option-ID was missed in `boq_parser.js`, check `boq_evaluator.js` and `vendor_bom_verifier.js`).
5. **Feed Closed-Loop Learning**:
   - Register any new rule or invariant in the feedback loop (`feedback_loop.js`) and AST graph (`npm run update:graph`).

---

## 5. Peer Skills & Orchestration Matrix

- **Macro Orchestration**: Consult [`orchestrator-workflow-skill`](../orchestrator-workflow-skill/SKILL.md) to integrate review results into the macro continuous learning lifecycle.
- **Output Validation Gate**: Feeds into [`output-validation-skill`](../output-validation-skill/SKILL.md) prior to customer deliverable generation.
- **Epistemic Falsification**: Complements [`epistemic-verification-skill`](../epistemic-verification-skill/SKILL.md) by providing human-level static peer review alongside Popperian automated fuzzing.
- **Codebase Integrity**: Audits pipeline dispatching in [`route_query.js`](../../../scripts/evaluators/route_query.js) via `classifyQueryIntent()` and graph health in [`verify_graph_integrity.js`](../../../scripts/maintenance/verify_graph_integrity.js).
