# Independent follow-up of Antigravity remediation — 20 October 2026

Reviewed commit: `3ebc3f97b13bfbced5232525bd83590535a9a25b`, following the Codex handoff commit `1d07e9f`. The starting working tree was clean. This report describes additional working-tree fixes; no new check-in is implied.

Antigravity made useful progress on nullable catalog observations, explicit cost subtotals, status read-only behavior, offline ingress and dashboard response validation. The existing budget/schema baseline passed nine tests. Further negative cases nevertheless reproduced defects below. Commit wording that F15–F22 were complete was broader than the available evidence.

## Reproduced defects and corrections

| Boundary | Failure in reviewed commit | Follow-up remedy / regression |
|---|---|---|
| Actual BOM receipt binding | The optimizer validated `evalResults.items` or `evalResults.candidate`, then applied the receipt to a separate `consolidatedItems` array. Adding an option to that array retained a live receipt price on the unchanged base row. | Verify the exact supplied BOM using scope metadata separately. Regression changes supplied items while retaining the old evaluation manifest. |
| Receipt invalidation on repeated calls | Items mutated by a first call retained `receiptPriceSource` and zero-price confirmation after a later scope mismatch. | Clear receipt-derived provenance before each new applicability check; restore it only when the current complete manifest/scope matches. |
| Persistence disabled | `persist: false` suppressed initial payload generation but still invoked drift inspection, cleanup and, if requested, running-knowledge cloud sync. | Return an explicit `SKIPPED` result before those operations. A spy-based regression requires zero registry/payload/drift/cloud invocations. |
| Read-only drift | The drift wrapper rebuilt the master registry with default persistence, then generated a payload with default persistence. | Build a non-persistent registry and an in-memory payload projection. Derive the drift checksum from the projected Markdown instead of requiring a rewritten file. Mutation-denial regression covers the full wrapper. |
| Payload previews | A direct `{persist:false}` options argument could be misclassified as registry data. The builder could create directories or upload an old on-disk payload even though new persistence was disabled. | Recognize persistence options, suppress directory creation and publishing, return no persisted path, and retain only the in-memory preview. A denied-filesystem-write regression also requests auto-upload and requires `PERSISTENCE_DISABLED`. |
| Payload write failure | Failure to write a replacement payload was logged and swallowed, permitting subsequent fingerprint/upload logic to read an older artifact. | Throw `KNOWLEDGE_PAYLOAD_WRITE_FAILED` after cleanup; callers retain the failure rather than reporting current content synchronization. |
| Test isolation environment | `{NODE_ENV:'test', ...process.env}` allowed a production parent to overwrite the intended test setting. | Set `NODE_ENV:'test'` after spreading the inherited environment. A real temporary child suite verifies production-parent isolation. |
| Router trace identity | The router mutated the caller context and created an envelope trace independent of the pipeline's returned/persisted trace. It did not pass its entry trace to the BOQ pipeline. | Clone the context, pass the trace through both file and item BOQ paths, and adopt the pipeline's returned trace as the canonical response identity. Regression uses a frozen caller context and a separately identified persisted pipeline result. |
| Cancellation | Exceptions from specialized handlers were universally relabeled FAILED. | Preserve CANCELLED for an aborted signal's reason or an AbortError. Do not claim that this alone closes all terminal evidence persistence requirements. |
| Offline flag consistency | An environment `OFFLINE_MODE=false` masked `LOCAL_EVAL_ONLY=1`, unlike the dashboard's OR semantics. | Honor either environment request for local-only operation while preserving explicit per-call context overrides. Regression inspects the actual BOQ pipeline options. |
| Invalid-schema UI | The normalizer discarded the outer schema failure and preferred an inner successful result's disposition/authorization. The error could appear as a normal completed evaluation. | Preserve diagnostics but emit the established ERROR UI state with `contractStatus:SCHEMA_INVALID`, clear authorization, block both nested and outer acceptance, and display a dedicated actionable error card. |
| Invalid-schema exports | Selecting nested `evalResults` could discard invalid-contract flags on the containing envelope. | Reject those envelope flags before export. Regression invokes the route with an invalid wrapper containing a successful inner evaluation. |
| Synthetic PASS status | The final browser trace showed blocked presentation, but the SSE data status was PASS: the schema supplied PASS when the data object omitted status, discarding the canonical outer outcome. | Default absent result status to WARN, preserve canonical outcome/cancellation states, and label blocked delivery ACTION_REQUIRED at the SSE boundary. |
| Confirmed free items | The nullable optimizer lookup returned null even for an explicitly confirmed catalog zero. | Keep confirmed-free zero separate from an unconfirmed zero/missing price. Regression covers lookup and the resulting budget assessment. |
| Browser audit evidence | The audit claimed reconciliation had upload controls even when it counted zero. Result-view text alone was its proof of evaluator completion. | Verify the actual pasted-quote textarea retains SKU content, and observe terminal EVAL_RESULT through SSE with run ID, trace ID and evidence path before claiming successful evaluation. |

The baseline failures are retained locally in `outputs/history/2026-10-20-followup-reproductions.log`. They showed failure of changed-BOM receipt invalidation, persistence suppression, and production-parent test-mode enforcement. Later tests cover additional branches above.

## Finding status after this review

| Original finding | Current assessment |
|---|---|
| F15 catalog unknown price/capture time | Schema boundary verified: absent prices remain null and absent capture timestamps are not replaced with now. This is not a new capture/freshness certification. |
| F16 financial propagation | Improved nullable totals and confirmed-free handling are covered by targeted tests. Quote completeness and catalog-estimate completeness remain distinct; this bounded review does not certify every historical exporter or product profile. |
| F17 receipt price scope | Corrected the reproduced supplied-BOM and stale-provenance defects; current binding regressions pass. |
| F18 fixture isolation | Corrected parent environment, skipped-sync callbacks, preview publishing and drift writes. Global output-root isolation across all legacy fixture/CLI/E2E paths remains a separate open task. |
| F19 status reads | Antigravity's `persist:false` status call is retained; drift inspection is now read-only too. |
| F20 invalid output | Backend envelope rejection and frontend blocked diagnostics covered by regressions. |
| F21 router evidence lifecycle | Trace identity, caller immutability and cancellation improved. Handler failure records outside the canonical evaluator can still be correlation-only when ledger persistence is not requested. Full persisted terminal evidence is not certified by this patch. |
| F22 offline semantics | Corrected conflicting environment flags; dispatch regression verifies actual pipeline options. |
| F23–F24 product coverage/live capture | Not closed by either software commit or this review. Require exact per-product profiles, owned relationships and dated live capture/sync/acceptance evidence. |
| F25–F26 UX/skill architecture | Invalid-result UX improved here. Broad evidence-state consolidation, normalizer decomposition and versioned route-by-route skill migration remain open. |

## Browser path

The first current-checkout run of the broader audit completed all ten flows with zero logical gaps, console errors or network errors. It reached the evaluator result, rendered 23 interactive topology nodes, loaded telemetry and opened reconciliation. This independently reproduces improvement over the earlier 60-second timeout; increasing the timeout alone was not accepted as evidence of closure.

The final status-verification run used the rebuilt dashboard and stronger SSE/quote-input assertions. It completed **10/10 flows with zero logical gaps, console errors or network failures**. Its result and identifiers are retained in `outputs/history/2026-10-20-followup-browser-status.log` and `outputs/history/dashboard_flow_audit.json`:

- Run: `run_1792479387210_zjyq`.
- Canonical trace: `TRC-1792479389511-C91DE8`.
- SSE outcome: **ACTION_REQUIRED**, rather than the earlier synthetic PASS.
- The earlier correlated trace `TRC-1792479204228-081FB4` was structurally healthy with no gaps, while honestly recording blocked presentation and skipped cloud synchronization. The browser test proves navigation and diagnostic workflow completion; it does not certify a customer configuration or cloud sync.

## Validation and continuation

- Combined targeted budget/router/schema/evidence/core-contract suite: **58 tests passed**, zero failures/skips.
- Read-only sync, drift and core workflow checks: **32 tests passed**.
- Dashboard components/services: **46 tests passed**.
- Budget/strategy chaos: **8 tests passed**.
- Curated smoke: **8/8 suites passed**.
- Production dashboard build passed; core/dashboard lint passed; complexity check passed within the repository ceiling.
- Source graph refreshed through the canonical `npm.cmd run update:graph` command; final receipt is `outputs/history/2026-10-20-followup-graph-final.log` (9,699 nodes / 17,933 edges / 539 communities).

Logs are local ignored artifacts. The tracked report preserves findings, scope and reproduction commands. To repeat the focused checks:

```powershell
node --test tests/unit/test_antigravity_followup_boundaries.js tests/unit/test_budget_optimizer_boundaries.js tests/unit/test_query_router.js tests/unit/test_schemas.js tests/unit/test_core_workflow_contracts.js tests/unit/test_evidence_workflow_truth.js
node --test tests/unit/test_sync_knowledge.js tests/unit/test_drift_inspector.js
npm.cmd run test --workspace=dashboard
npm.cmd run test:smoke
npm.cmd run lint:core
npm.cmd run lint
npm.cmd run build
```

Continue the remaining original plan with explicit statuses and evidence. In particular, do not relabel F18, F21 or F23–F26 as globally complete from this bounded repair. No live catalog publication, new CLIC acceptance, credential change or unsupported product-profile certification was performed here.

The tracked test failure ledger changed during verification. Its audit-generated diff was preserved locally, then restored to the starting revision; code/tests/reports remain available as the reviewable working-tree patch. No commit or push was performed in this follow-up.
