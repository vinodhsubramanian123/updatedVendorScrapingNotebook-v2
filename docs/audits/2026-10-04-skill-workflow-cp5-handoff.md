# CP5 handoff — unused response contracts

4 October 2026. Author: Codex. State: **AUTHORED; independent verification pending**. Test executor/reviewer: Antigravity/Gemini. The forwarded CP4 feedback authorizes this bounded next step. CP1–CP4 retain VERIFIED_INDEPENDENT status; CP0 isolated goldens remain pending before behavior activation. Plan and ledger are updated to revision 5.4.

CP5 supplies declarations and opt-in APIs for every current router branch. It does not activate them. The legacy acceptance implementation, original six exports, router/evaluator call paths, result fields and delivery authorization continue unchanged. The new APIs are lazy exports on the existing verifier; implementation resides in separate cohesive modules.

| Path | Change |
| :--- | :--- |
| `scripts/lib/boq/bom_verifier.js` | Three opt-in lazy wrappers/exports only |
| `scripts/lib/boq/presales_response_profiles.js` | Frozen declarations for 17 current route intents |
| `scripts/lib/contracts/presales_response_adapter.js` | Pure explicit RESULT or ROUTER_ENVELOPE adaptation |
| `scripts/lib/boq/presales_response_validator.js` | Structural response criteria; no hardware or delivery checks |
| `scripts/maintenance/audit_presales_response_contracts.js` | Static route/profile/export/consumer/prefix audit; imports declarations only |
| `tests/unit/test_presales_response_contracts.js` | 17 route fixtures plus 14 boundary/import/compatibility cases; assigned verifier executes |
| Plan, ledger, this handoff | Current status, receipts, review expectations and limits |

Generated code-graph artifacts and named maintenance receipts are also allowed. No `scripts/config/` or protected runtime output change is authorized in this checkpoint. No customer, portal, cloud or external workflow ran; no commit/push.

## Contract and interpretation

`getPresalesResponseProfile(intent)` returns a frozen declared profile or null; unknown routes do not default to BOQ. `adaptPresalesResponse(legacy, options)` defaults to RESULT. A router envelope requires `inputKind: 'ROUTER_ENVELOPE'`; classification/payload are not guessed. The original `legacy` and selected `payload` are retained by reference without mutation/freezing, so unrelated legacy fields are preserved. This is an opt-in versioned wrapper, not an active public result replacement.

`verifyPresalesResponseAcceptance(response)` returns `responseValid`, `responseStatus`, `issues` and `deliveryAuthorized: false`. It never returns legacy `isValid`/`isApproved` or issues a delivery certificate. Ordinary profiles require meaningful route-specific content. Diagnostic responses require a reason and executable next step. A planned unbuildable-candidate block maps to ACTION_REQUIRED; explicit fatal ERROR/FAILED takes precedence even when a block disposition is also present. Draft/report statuses retain their profile disposition; missing or unknown statuses stay UNKNOWN.

Profiles cover Q&A, BOQ, sizing, reconciliation, catalog intelligence, OCR, mixed planning, conversion, workload, value engineering, least-delta, multi-cluster, synthetic adversarial reporting, workbook reference, remarks, learning and sync. Diagnostics are a separate response form of any known route. A synthetic test report never certifies a customer candidate; workbook path presence never proves file existence. Single-file reconciliation must explicitly declare its baseline mode.

Evidence domains are localValidation, documentGrounding, portalAcceptance, delivery, learning and sync. All start UNKNOWN. Legacy badges, approval flags, citations and artifact paths do not infer affirmative evidence. Explicit caller declarations with supported status/reference arrays are retained as source declarations; PASSED requires references and stays `SOURCE_DECLARATION_NOT_INDEPENDENTLY_VERIFIED`. Actual reference integrity, freshness and outcome are not verified. Malformed declarations are flagged. A useful response may be structurally valid while execution remains UNKNOWN, or may be a useful failed diagnostic; response validity does not mean successful end-to-end execution.

## Static author checks and receipts

Reports are under `outputs/history/skill_workflow_excellence/2026-10-04/`.

- Fresh freeze: `cp0-baseline-2026-10-04T14-56-10-902Z-1864.json`; 3,365 inputs / 2,642 protected files; HEAD `823725a214816c972bf1d91a4ec01db7bb76b860`, branch main. Input fingerprint `ccfd571841d5856b912772d9115840e1a90635da370421f421e2577d94195990`; protected fingerprint `d0d181422ad9db89dd664bd45a8628abcfe703b4c6ed6a794904c489f12806cc`. This is preparation, not golden verification. It preserves Antigravity's intervening histories.
- Original bytes/hash rollback record: `cp5-pre-edit-documents.json` (original verifier, plan and ledger).
- Final static audit: `cp5-profile-audit-2026-10-04T15-15-56-265Z-2900.json`; 17/17 actual dispatch cases declared; six legacy exports retained; pre-existing verifier implementation prefix unchanged with LF/CRLF normalization; 0 unexpected named/static runtime consumers; 0 issues.
- Six source/test files syntax-clean; embedded child fixture syntax-clean; 0 targeted lint warnings/errors using the installed offline cached oxlint. No dependency installation.
- Maximum repo CC 130 across 318 files / 1,366 functions; new functions at most CC 19; 0 static cycles across 528 files. Legacy complexity unchanged. Code graph refresh is required and recorded in final static receipt; semantic documentation labeling remains separate. Installed graphify 0.9.63 versus skill 0.9.61 warning is preserved without installation.
- Exact-source and workspace receipts: `cp5-static-checks.json`, `cp5-final-workspace.json`, `cp5-final-author-receipt.json`. The six-source fingerprint is `ccf595006ea6a200fbecf8a9bcdc1ac21c1d5026d20e6eaae6a5bdf6b0438522`. Final workspace receipt binds plan/ledger/handoff after edits; reports themselves are outside the frozen runtime input denominator.

Codex ran **zero behavioral tests**. The 31-case suite, isolated import execution and legacy/domain regression remain assigned to Antigravity/Gemini. Syntax/static inventories cannot substitute for those results. Dashboard build, live stages and CP0 golden scenarios were not run. Static consumer checks cover named references and resolvable imports, not arbitrary computed dynamic dispatch. No full F/C/H finding closes.

## Assigned independent verification

1. Acquire the live owner-aware writer lease before any shared-tree edits or test-generated writes. Read ledger first; verify all six source hashes against `cp5-final-author-receipt.json` and inspect bounded diff. Review the legacy prefix/export check and all new result semantics; do not infer acceptance from matching HEAD alone.
2. Run `npm run test:isolated -- tests/unit/test_presales_response_contracts.js`; expect **31 cases**, including explicit envelope preservation, fatal versus planned block, unknown status, draft/single-file modes, malformed evidence, false delivery authority and isolated no-IO/network/process/customer-import child execution. The child completion sentinel prevents a premature exit from passing silently.
3. Run affected legacy/router regression with `npm run test:domain -- router`; inspect existing verifier tests applicable to BOQ/guardrail criteria and select targeted suites under domain guidance. Preserve the historical CP4/schema receipt; do not claim new test results until executed against final sources. Do not run live customer evaluations in this shared tree to produce goldens.
4. Reproduce `node scripts/maintenance/audit_presales_response_contracts.js --baseline outputs/history/skill_workflow_excellence/2026-10-04/cp5-pre-edit-documents.json --save`; expect 17 profiles, 0 unexpected consumers, unchanged legacy prefix and 6 retained legacy exports. Re-run targeted lint, CC and cycle checks only if verification changes sources.
5. Compare protected files against the final author workspace snapshot before/after verification. Expected runtime/config content writes are zero. If the test runner writes history, record its exact path/content delta separately and stop on unaccounted writes; do not report a protected match from a partial comparison. Any failure or unexplained difference requires stopping and reverting only owned checkpoint changes as applicable.
6. Record environment, exact hashes, commands, suite/case counts, elapsed times, exits, logs, not-run checks, protected deltas and semantic review. Only the independent verifier updates CP5 to VERIFIED_INDEPENDENT. Isolated CP0 goldens and future activation remain separate prerequisites. No later checkpoint starts under this handoff's authorization.

## Rollback and next boundary

Only the five new source/test files, three lazy wrappers/new export entries, and owned plan/ledger/handoff changes belong to CP5. Verify later edits before restoring original bytes. Preserve CP1–CP4, nine existing skill edits, Antigravity's histories/test ledger, protected catalogs, reports and graph history. Do not reset/clean the shared checkout or synchronize its junction alias. The live writer lease is released after final manifests are checked.

F07/F18 remain open: active uncovered routes still use the legacy gate, and package facade/consumer compatibility is not resolved here. Runtime wiring requires a named authorized checkpoint, independent CP5 acceptance, isolated CP0 golden evidence, and the plan's shadow/parity gates. CP6 measurement scaffolding and CP7/CP11 behavior are not started by CP5.
