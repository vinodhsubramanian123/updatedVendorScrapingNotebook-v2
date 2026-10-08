# CP0–CP2 authoring handoff

4 October 2026. Scope approved by the user: CP0–CP2 only, with the plan updated during execution. **Authoring/static observations only; no finding is independently closed.** Read the [plan](2026-10-04-skill-workflow-excellence-plan.md) and [ledger](2026-10-04-skill-workflow-checkpoint-ledger.md).

## Scope and actual changes

Three unused maintenance CLIs, four focused helper modules and one verifier fixture suite were added. Existing evaluator, router, scraper, catalog, authorization, ledger, config, dashboard and package behavior was not changed. The eight new files are:

- `scripts/maintenance/capture_skill_workflow_baseline.js`: accounted source/protected-file manifest and comparison; no golden evaluation.
- `scripts/maintenance/audit_skill_workflow_coverage.js`: 28-skill/reference/link inventory, source AST imports/exports/calls, entrypoints, reverse mapping candidates and tests.
- `scripts/maintenance/audit_skill_hardcodes.js`: classified literal candidates, exact exceptions and prior-report comparison; always report-only.
- `scripts/maintenance/skill_workflow/io.js`: ignore-aware inventory, content fingerprints and bounded atomic report writes.
- `scripts/maintenance/skill_workflow/markdown.js`: common Markdown links, references, fences and heading fragments.
- `scripts/maintenance/skill_workflow/source.js`: static AST analysis without importing evaluated modules.
- `scripts/maintenance/skill_workflow/hardcode.js`: literal triage and report-only ratchet logic.
- `tests/unit/test_presales_skill_workflow_auditors.js`: 11 meaningful isolated fixture cases, **not executed by Codex**.

All JSON reports use `safeWriteJsonAtomic`. No package scripts or blocking CI changes were added. `@babel/parser` 7.29.8 was already installed; it is an optional tooling dependency here, not a newly installed/declared package. A missing parser must remain a reported coverage gap; full AST acceptance needs it available. Future dependency formalization is a separate reviewed decision, not an implied package mutation.

## Observed results and limits

Reports are retained under `outputs/history/skill_workflow_excellence/2026-10-04/`. Unique filenames preserve earlier draft observations; use the final filenames recorded in the ledger.

- CP0 pre-authoring baseline: HEAD `823725a214816c972bf1d91a4ec01db7bb76b860`, branch `main`, 3,339 inputs and 2,630 protected output/config files. Includes tracked/visible-untracked inputs, ignored protected files and environment-file hashes without content disclosure. Existing untracked audit documents were accounted for.
- CP1: 28 skills, 37 skill Markdown documents, 64,213 entrypoint words, 315 production modules (308 prior + 7 maintenance additions), 208 test modules. All production modules parsed. These are **source modules**, not counts of test suites or asserted tests.
- Exactly 18 missing file-link occurrences remain across seven skills, matching the original audit. They are not fixed in CP0–CP2. One is an incorrect module directory, not merely a traversal-depth issue. The initially flagged NotebookLM fragment was an auditor fence-handling false positive, corrected before final observation.
- One computed require in `dashboard/routes/catalogs.cjs` remains explicitly unresolved statically. The package main target is missing. The only initial no-entrypoint customer candidate, `agentic_eval.js`, is source-declared deprecated and documented as superseded; it is classified accordingly, not newly wired or removed.
- Module/path classifications, document mentions, inherited dependency mappings, named-import reviews and test imports are **review candidates**, not runtime skill execution or full behavioral coverage. Aliases/computed exports/host-specific skill selection need later verification.
- CP2: 574 scanned files, 15,139 heuristic occurrences, including 7,295 test/fixture occurrences and 3,978 generic-decision candidates. All are triage candidates; no independent semantic violation count or approved exception set is claimed. The old Appendix D numbers used a different scan scope/pattern and are not directly comparable.
- Draft lint found ten warnings; authoring corrected them. Final new-file lint reports zero warnings/errors. Eight files pass syntax-only checks. Static circular analysis reports zero cycles; maximum repository CC remains 130, below 135. These are author checks, not independently executed behavioral tests.

The baseline fingerprint serialization uses sorted forward-slash paths, NUL separators and SHA-256 values. Canonical code-point order was aligned with the pre-authoring manifest; an earlier locale-sorted aggregate differed despite identical per-file content. Retained draft records do not supersede the final protected-content comparison.

## Assigned verification and completion prerequisites

Antigravity/Gemini remains test executor. Use a disposable checkout for checks that can write. The canonical test runner itself writes a test ledger under `outputs/history`; process isolation alone does not confine writes. Preserve the authored source/fixture/config fingerprint in each receipt.

1. Run the new fixture suite in isolation:

   `npm run test:isolated -- tests/unit/test_presales_skill_workflow_auditors.js`

   Verify nonempty discovery and all 11 fixture cases. Cases cover nested file-relative links, balanced destinations, fenced/inline-code headings, undefined references, non-imported throwing CLIs, dynamic edges, deprecated mappings, numeric decision literals, exact/stale allowlists, copied/moved sites, protected ignored records and report-only CLI exit behavior.

2. Independently inspect the auditors and report classifications. Confirm missing parser/error cases remain explicit, no customer module import occurs, and reports cannot overwrite protected customer artifacts. Review named-import candidates rather than treating static nonmatches as missing APIs.

3. Complete CP0 characterization in a **disposable isolated checkout**, using canonical routes/evaluators and representative valid/unbuildable BOQ, reconciliation, Q&A, catalog history, multi-cluster and diagnostic/authorized-export cases. Resolve side-effect interception/output isolation before running, especially OCR/cloud/sync/export paths. Retain raw outputs plus semantic goldens and registered volatile fields. Missing live receipts remain pending; do not manufacture customer delivery success.

4. Run appropriate affected-domain checks after fixture verification, recording actual unique suite/test counts and protected before/after hashes. Independently review the semantic classifications/allowlist before asserting CP2's acceptance. Do not activate blocking lint or fix skill links in this scope.

Maintenance observations can be reproduced without customer execution:

```powershell
node scripts/maintenance/audit_skill_workflow_coverage.js --save --report-dir outputs/history/skill_workflow_excellence/2026-10-04
node scripts/maintenance/audit_skill_hardcodes.js --save --report-dir outputs/history/skill_workflow_excellence/2026-10-04
node scripts/maintenance/capture_skill_workflow_baseline.js --compare outputs/history/skill_workflow_excellence/2026-10-04/cp0-baseline-pre-authoring.json --save --report-dir outputs/history/skill_workflow_excellence/2026-10-04
```

CP0 is not complete without goldens; CP1/CP2 remain AUTHORED until assigned behavioral checks and independent review. CP3 and every behavior activation remain pending. All 36 finding IDs (18 F + 8 C + 10 H) stay open.

## Allowed writes and rollback

Allowed source writes are only the eight named additions and this handoff/plan/ledger. Allowed data writes are timestamped maintenance reports in the named history subtree; `.git/codex-maintenance-locks/` holds the owner-aware live-process lease. Graph refresh artifacts are allowed by the charter. Existing business/config/protected files are checked against the pre-authoring manifest.

Rollback concerns only these owned additions and the plan/ledger's authored update hunks. Compare current files with the handoff fingerprint before any removal; do not delete subsequent edits. Retain baseline/report evidence. No commit, push, hard reset, broad clean, source retirement or external publication occurred. A later independent reviewer must resolve the current workspace alias before copying or creating a separate checkout.
