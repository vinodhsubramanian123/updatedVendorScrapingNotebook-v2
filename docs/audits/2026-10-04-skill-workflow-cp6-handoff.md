# CP6 handoff — unused measurement and population contracts

4 October 2026. Author: Codex. State: **AUTHORED; independent verification pending**. Test executor/reviewer: Antigravity/Gemini. The user forwarded independent CP5 acceptance and the CP6 next-step scope. CP1–CP5 remain VERIFIED_INDEPENDENT; CP0 isolated goldens remain pending. Plan/ledger updated to revision 5.5. No runtime activation, customer/live workflow, commit or push.

CP6 adds opt-in contracts. The legacy telemetry implementation, 11 exports/order, file locations, serializer and dashboard remain unchanged. This checkpoint does not correct active legacy metrics yet; F10 stays open through CP11 terminal ownership and later activation.

| Path | Change |
| :--- | :--- |
| `scripts/lib/system/telemetry.js` | Three lazy opt-in exports only; no legacy body change |
| `scripts/lib/system/telemetry_measurement.js` | Versioned observation normalization and structural validation |
| `scripts/lib/system/telemetry_populations.js` | Explicit run-kind/event-type summaries with denominators |
| `scripts/lib/system/telemetry_legacy_migration.js` | Pure history projection preserving raw legacy snapshot/entries |
| `scripts/lib/system/telemetry_measurement_store.js` | Explicit-root, population-separated persistence with transactional leases |
| `scripts/maintenance/audit_telemetry_measurement_contracts.js` | Static declarations/legacy-parity/consumer audit; no telemetry execution |
| `tests/unit/test_telemetry_measurement_contracts.js` | 29 verifier cases, including four concurrent writers / 48 events |
| Plan, ledger, this handoff | Scope, receipts, verification expectations and limits |

Generated code graph and named maintenance receipts are also allowed. No protected runtime/config addition or modification is authorized by CP6 authoring. All store fixtures use disposable OS-temporary directories; no production file defaults exist in the new store.

## Contracts and interpretation

`normalizeTelemetryMeasurement(input)` returns schemaVersion 1 / activation UNUSED. Input requires a stable eventId; runKind is explicitly PRODUCTION, TEST, FIXTURE, DEMO or UNCLASSIFIED, defaulting only to UNCLASSIFIED. Event types separate evaluation, learning, notebook consultation, cleansing, OCR, export, reconciliation, guardrail and UNKNOWN. Missing product, trace/observer, timestamp and terminal information stay null/UNKNOWN. No file-name, environment or model inference occurs.

Normalize raw observations only. Versioned records use `validateTelemetryMeasurement(record)`; normalization/store append rejects already-versioned input instead of silently reinterpreting it. LEGACY_UNVERIFIED records must retain unclassified/unknown measurement state and source lineage; manual promotion fails validation.

Numeric inputs are declarations such as `{status: 'OBSERVED', value: 0, evidenceRefs: ['observation-id']}` in `metrics.durationMs`, `confidenceScore`, `rulesEvaluated` or `newDeltasThisRun`. Values must be finite/nonnegative, confidence at most 1, and counts safe integers. Missing data becomes `{status: 'UNKNOWN', value: null, evidenceRefs: []}`. NOT_APPLICABLE is explicit exclusion; valid measured zero remains zero. Stage durations use the same contract; absent stages are not fabricated from percentage allocations. Malformed observations are flagged, not counted.

Grounding/accuracy declarations require explicit `eligible`, `status`, boolean `value` and observation references. Affirmative grounding also requires nativeCitationRefs. Adjudicated correctness additionally requires reviewerId distinct from observerId. These are referenced **source declarations**, not independently resolved references, citations or reviewer identities. The envelope labels that limit. Confidence coverage/mean never becomes accuracy, absence of fallback never becomes grounding, and old registry totals never become new deltas this run. Terminal COMPLETED/FAILED/CANCELLED/ACTION_REQUIRED requires terminalEvidenceRefs; otherwise state stays UNKNOWN, with the claimed state retained separately.

`summarizeTelemetryPopulation(entries, {runKind, eventType})` requires both selectors. It rejects invalid records and duplicate event IDs before counting. Numeric eligible events are selected events except explicit NOT_APPLICABLE; observed/unknown/ineligible counts and coverage accompany sum/mean. Grounding/accuracy expose eligible, observed, unknown, unknownEligibility, ineligible, numerator and denominator; ratePercent divides affirmative outcomes by **observed eligible events only**. Unknown-eligibility events are not silently counted as observed failures or successes. Empty observed populations have null rates/means. Overflow returns null/OVERFLOW. All totals describe the supplied collection, not inferred lifetime totals.

`migrateLegacyTelemetry(snapshot, {sourceRef})` is a pure projection with stable source/stream/index identities. Eight known historical streams are represented. All legacy entries remain UNCLASSIFIED with UNKNOWN metrics/outcomes/terminal states; legacy numeric/default values are not promoted to observations. Original snapshot, raw entries, unknown top-level fields and counters are preserved by reference without mutation. Missing source identity/malformed streams are disclosed. This function does not write, prune, relabel or overwrite history; reviewed reclassification/instrumentation remains future activation work.

`createTelemetryMeasurementStore(existingAbsoluteDirectory)` is an explicit factory; import performs no IO. Reads/appends use separate `<runKind>.json` files under that root, with no default production path. Owner-aware leases cover read and entire read/append/atomic-write transactions. Contention raises WORKFLOW_BUSY; callers choose bounded retries. Identical normalized retries do not duplicate entries; conflicting IDs fail. Corrupt JSON/schema/population/duplicate history fails closed and preserves the file instead of initializing empty success. History is not pruned. This unused store does not migrate or replace legacy files; retention, source reconciliation and terminal instrumentation require a later named checkpoint.

## Baselines, source receipts and pre-existing deltas

Reports are under `outputs/history/skill_workflow_excellence/2026-10-04/`.

- Fresh pre-edit freeze: `cp0-baseline-2026-10-04T15-34-08-383Z-16096.json`; 3,284 inputs / 2,555 protected files; HEAD `823725a214816c972bf1d91a4ec01db7bb76b860`, branch main. Input fingerprint `5f0f3812e889aa0069b330eff49cf307d47bee5fe50babeb5bf7a56ad864eb3d`; protected fingerprint `f466b0c43840ecbf55d005caf403e939061ef2cc061d1cc547d1a004c3f50775`. This is preparation, not golden verification.
- `cp6-preexisting-protected-deltas.json` compares CP5's author handoff to this fresh freeze: **16 added / 103 removed / 21 changed protected files before CP6**. It includes Antigravity's disclosed integration/E2E files and notebook timestamp touch, and removed temporary staging/run-history paths. Attribution of every removed file is not inferred merely from passing tests. Preserve these pre-existing deltas; the verifier should reconcile their scope against test/cleanup logs. CP6's comparison starts from the fresh freeze and claims zero additional protected changes only.
- Original telemetry/plan/ledger bytes: `cp6-pre-edit-documents.json`. The original-byte telemetry copy `cp6-original-telemetry.js` is lint-only evidence; it was not executed.
- Final static contract audit: `cp6-contract-audit-2026-10-04T16-00-17-230Z-12936.json`; five run kinds / nine event types / four numeric metrics, 11 legacy exports/order retained, original implementation prefix unchanged with line-ending normalization, 0 unexpected named/static runtime consumers, 0 issues.
- Seven-source fingerprint: `b04ffeb952d08e49ef0d89485537e5052564ee15b4d82b274b96188d8ef26845`. Final receipts: `cp6-static-checks.json`, `cp6-final-workspace.json`, `cp6-final-author-receipt.json`. They bind source/docs/protected content after final edits, not behavioral or golden certification. Earlier timestamped CP6 audits are draft observations.

## Author verification and not-run checks

Codex ran seven-file syntax checks and parsed both embedded worker/isolation programs. Expected fixture count is **29** (24 direct cases plus five run-kind cases). Targeted offline cached oxlint shows **0 new warnings/errors**; three pre-existing unused-catch warnings at telemetry lines 225/235/238 reproduced from original bytes. Maximum CC is 130 across 323 files / 1,394 functions; new functions at most 25; 0 cycles across 534 files. Static audit and whitespace checks pass. Required code-graph refresh is recorded in the final static receipt; graphify skill/package version warning and separate semantic labeling limits remain disclosed.

**Zero behavioral tests ran under Codex.** All 29 fixtures, concurrent writers, store corruption/idempotency tests, isolated import execution and independent semantic review remain assigned to Antigravity/Gemini. Static source inspection cannot establish concurrency behavior. CP0 goldens, live stages, full legacy regressions and dashboard build were not run. Static consumer checks do not prove absence of arbitrary computed dynamic dispatch. No complete finding closes.

## Assigned independent verification

1. Read ledger, acquire the live owner-aware writer lease before shared-tree writes, verify all seven source hashes against `cp6-final-author-receipt.json`, and inspect the bounded diff. Review the explicit measurement/eligibility/rate semantics and preservation of the legacy prefix/export order. Reconcile pre-CP6 protected removals separately from this checkpoint's author changes.
2. Run `node --test tests/unit/test_telemetry_measurement_contracts.js`; expect **29 cases**. This focused invocation avoids the matrix runner's shared failure-ledger writes; its fixtures only persist to disposable OS-temporary roots. If using `npm run test:isolated -- tests/unit/test_telemetry_measurement_contracts.js`, run in a disposable workspace or explicitly record the runner's own ledger delta. Process isolation alone does not isolate the filesystem.
3. The concurrency case starts four children, each appending 12 unique TEST events with bounded WORKFLOW_BUSY retries. Verify all 48 IDs and sum/observed counts survive. Import isolation must produce the completion sentinel, zero temp-root mutations and no customer/legacy telemetry imports or network/process side effects. Malformed observations/history and conflicting retries must preserve prior contents.
4. Reproduce `node scripts/maintenance/audit_telemetry_measurement_contracts.js --baseline outputs/history/skill_workflow_excellence/2026-10-04/cp6-pre-edit-documents.json --save`; expect VALID, 11 retained legacy exports/order and 0 unexpected runtime consumers. Use targeted lint/CC/cycle checks if verification edits source.
5. Select any needed existing telemetry regression suites after inspecting their write paths; execute shared-output-writing suites only in a disposable filesystem fixture/copy. CP6 does not require repeating the full BOQ/integration/E2E matrix in this shared checkout. Protected comparison against the final author snapshot must show zero new runtime/config deltas for the focused fixtures, with any intentional runner receipts accounted separately.
6. Record exact hashes, environment, commands, counts, durations, exits, logs, not-run checks, protected comparisons and semantic decisions. Stop on new failures or unexplained differences, reversing only owned checkpoint edits where applicable. Only the independent reviewer promotes CP6's **unused-contract scope** to VERIFIED_INDEPENDENT; F10 still depends on CP11 and later activation. No CP7/later activation follows automatically from this handoff.

## Rollback and next boundary

Reverse only the six new source/test files, three lazy telemetry wrappers/export entries and owned plan/ledger/handoff changes after checking for later edits. Original bytes are saved. Preserve CP1–CP5, Antigravity histories/config edits, prior protected additions/deletions, report/graph history and the equivalent junction alias. Do not reset/clean or synchronize the shared checkout. The writer lease is released after final manifest checks.

Next is assigned independent verification of CP6. Isolated CP0 characterization and named CP7/CP11 preparation/approval are separate requirements. Active legacy telemetry inaccuracies, terminal ownership, learning consumers and dashboard metric changes remain outstanding, explicitly tracked rather than claimed fixed by unused contracts.
