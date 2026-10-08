# CP7a handoff — unused pure query planner

4 October 2026. Author: Codex. State: **AUTHORED; independent verification pending**. Reviewer/test executor: Antigravity/Gemini. The user approved the dependency-ordered execution plan. This bounded scope prepares CP7a while CP0 characterization and CP6r shared-lease qualification remain pending. Plan/ledger revision 5.7 records progress; CP7b/c and CP8–CP18 remain NOT_STARTED. No runtime activation, customer/cloud workflow, behavioral test, commit or push.

| Path | Change |
| :--- | :--- |
| `scripts/lib/boq/presales_query_plan_rules.js` | 17 capability labels/roles, 16 legacy explicit overrides, unused ambiguity policy |
| `scripts/lib/boq/presales_query_planner.js` | Pure proposal; source requirements, objective, modality, transforms and unresolved choices |
| `scripts/maintenance/audit_presales_query_planner.js` | Static declarations, exact router parity, dependencies, callers and fixture/child syntax |
| `tests/fixtures/presales_query_plan_cases.js` | 49 independently hand-labeled proposal cases |
| `tests/unit/test_presales_query_planner.js` | 73 expected test cases: 49 labels + 16 legacy overrides + 8 invariant/import cases |
| `.agents/skills/presales-query-router/SKILL.md` | Append-only ownership reference, explicitly unused and engineering-only |
| Plan, ledger, this handoff | Scope, evidence, pending verification and readiness boundaries |

Generated graph artifacts and named maintenance reports are allowed. There is no protected outputs/config exception. The existing router, evaluator, lease helper, CP4 registry, interfaces, CLI flags, result fields and delivery gate are unchanged. The new helper has no public-router import/export or execution consumer. The ownership reference maps these unused modules back to the responsible skill without instructing customer execution to call them.

## Proposal contract and intended limits

`planPresalesQuery(queryText, context)` accepts a string and object. The original query/context are retained without mutation, including unknown rows, explicit chassis/vendor hints, requirements, spares and item ownership. Context is retained by reference; this is not an immutable execution receipt. CP11 must snapshot requests for tracing. The helper imports only its rule declarations and uses no filesystem, service, evaluator, clock, randomness or process invocation.

The output is schemaVersion 1, activation UNUSED, dispatchAllowed false, deliveryAuthorized false, confidenceScore null and execution NOT_EXECUTED. `PLANNED` means a proposal has one objective; it does not certify requirements completeness, source extraction, decoded formats, pricing, hardware, unsupported domains, vendor availability or delivery. `CLARIFICATION_REQUIRED` exposes unknown/competing objectives, unbound quantity groups, invalid quantities/files, negated operations and unconfirmed reconciliation baselines. These are returned issues; no live customer clarification or dispatch gate has been installed.

Objective selection preserves the actual `context.intent` early-map overrides (16, excluding OCR). All 17 existing switch tracks have declarations. The former “explicitTrack” plan wording referred to this map; `context.explicitTrack` has no legacy meaning and is not introduced as an alias. OCR intent is an intake hint; image/PDF extensions request inspection, and no file extension promises working OCR support. A tabular file can default to BOQ evaluation, or reconciliation when a second path is supplied; an explicit objective or question is retained. New proposal-only hints `baselineProvided: true` and `reconciliationMode: 'SINGLE_FILE_AUDIT'` resolve intent ambiguity without validating documents or changing existing handlers.

The proposal retains sizing/workload/multi/least-delta/value/remarks/export requests together, supports explicit 2/9/20-node counts, and preserves conversion/mixed requests plus evaluation intent. Its transform order is declarative, pending canonical continuation verification. Independent unrelated objectives require clarification. Question-style explanation stays Q&A; catalog history and portfolio scope remain informational. Detection is transparent heuristic pattern matching, not calibrated understanding; the labels do not certify arbitrary natural-language coverage. Negated execution verbs are conservatively flagged rather than silently authorized. Structured product/group/vendor resolution remains NOT_VALIDATED and belongs to later canonical consumers.

Legacy < 0.80 post-handler indication, retired 0.85 wording and the charter's 0.95 target are documented as different facts. No numeric confidence is fabricated or used as permission. Future CP7c must resolve consequential ambiguity before side effects, using actual scoped requirements; pure planner verification alone does not satisfy F01/C1/C6.

## Baseline and author evidence

Freeze: `outputs/history/skill_workflow_excellence/2026-10-04/cp0-baseline-2026-10-04T16-39-08-961Z-14544.json` (3,293 inputs / 2,557 protected records; HEAD `823725a214816c972bf1d91a4ec01db7bb76b860`, branch main). Original bytes of the plan, ledger, router, lease helper and owning skill are saved in `cp7a-pre-edit-documents.json`. This freeze is not golden characterization.

Final receipts are `cp7a-static-checks.json`, `cp7a-final-workspace.json` and `cp7a-final-author-receipt.json` in the same report directory. The receipt binds the five new source/fixture files separately from changed documents and generated graph artifacts. Recheck exact hashes before verification; a later edit invalidates the source-bound receipt. Static author checks cover syntax (including import-isolation child source), declaration/override coverage, exact router bytes, no named/static runtime consumers, targeted lint, complexity, circular dependencies and document links. Graph update does not refresh semantic labels automatically.

**Not run by Codex:** all 73 behavioral/import cases, legacy router regressions, CP0 goldens, shared-lease contention/fault/restart scenarios, cloud/vendor stages, full matrix or dashboard build. Tests remain assigned to Antigravity/Gemini. No new runtime finding closes, and no unsupported test PASS or behavior parity claim is made.

## Assigned independent verification

1. Read the ledger, acquire the live writer lease before shared edits, verify the five source hashes and document hashes in the final receipt, and inspect only the bounded diff. Confirm unchanged public router/lease bytes and no protected changes against the final author manifest. Review the expected labels independently, including the conservative interpretation of unknowns/negation and retained compound requirements.
2. Run `node --test tests/unit/test_presales_query_planner.js`; expect **73 tests**. This focused invocation imports only unused pure modules. The import-isolation child permits exactly the planner/rule files and requires its completion sentinel; no filesystem fixtures or production outputs are created. If using `npm run test:isolated -- tests/unit/test_presales_query_planner.js`, first account for its runner's own shared failure-ledger writes or run in a disposable filesystem. Process isolation alone does not isolate writes.
3. Reproduce `node scripts/maintenance/audit_presales_query_planner.js --baseline outputs/history/skill_workflow_excellence/2026-10-04/cp7a-pre-edit-documents.json --save`; expect VALID, 17 declarations/dispatch intents, 16 early overrides, exact router bytes unchanged, 49 labeled fixtures and zero unexpected static consumers. This command does not execute the planner or cases. Inspect computed/dynamic consumers separately if necessary.
4. Select any needed legacy router regression after inspecting its write paths; preserve the assigned executor and disposable-copy requirement for suites that mutate outputs/config. Confirm no customer handler is imported by the planner. Do not run the full BOQ/E2E matrix in the shared author checkout merely to verify unused declarations.
5. Record commands, environment, case counts, durations, exit codes, raw logs, exact hashes, protected deltas and not-run checks. Any corrected source needs renewed syntax/lint/CC/cycle checks, receipt and fixture count. Only independent evidence may promote **CP7a unused scope** to VERIFIED_INDEPENDENT; CP7 as a whole remains IN_PROGRESS and F01/C1/C6 open.

## Readiness, rollback and next boundary

CP7b still requires CP0 isolated goldens from an accepted full working-tree copy, including untracked/dirty contracts/config/fixtures, plus CP6r independent support-correction review. A directory named `cp0_goldens` under the shared root is only an archive, not isolation. Preserve S01–S19 scenario coverage and known diagnostic/broken behavior; pure proposal labels are not customer-flow goldens. CP6r-L1/L2 remain static concerns: omitted claim EBUSY retry handling and swallowed claim-cleanup failures/stale-claim recovery. The unchanged helper's original seven-source CP6 receipt does not cover its verification-time support patch.

After verified CP7a and readiness, CP7b is report-only shadow: old handler invoked exactly once, old result returned, proposed differences separately recorded. CP11a/b follows verified planning/shadow before new continuations and telemetry activation. CP7c is path-specific after the relevant CP11/CP8/CP9/CP10 receipts; no global early switch. Do not start CP8–CP10 merely because unused planner tests pass.

Rollback removes only the five new files and this handoff, reverses the appended skill reference and owned plan/ledger edits after checking for intervening changes. Preserve prior contracts, Antigravity's lease correction, history/config deltas, graph/report history and the junction alias. No reset/clean, expiry-only lease reclaim or main/scratch sync. Release the live writer lease and confirm both `.lock` and `.lock.claim` absent at handoff.
