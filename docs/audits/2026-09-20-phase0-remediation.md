# 2026-09-20 Phase 0 + Phase 1.2 Remediation Evidence
**Benchmark at time of fix:** 168/168 suites PASSED (2026-09-17 baseline)
**Fixed by:** Antigravity — session ec962582-2bb4-4b20-beaa-17ef44fb57ee

---

## New Invariants Established

### INV-NEW-1: executeNotebookQuery must use 3-arg signature
- **File:** `scripts/evaluators/agentic_eval.js`
- **Bug:** `executeNotebookQuery(payload)` — single object bypassed notebook routing
- **Fix:** Calls `executeNotebookQuery(notebookId, query, opts)` via `loadNotebookConfig`/`getNotebookIdForChassis`
- **Rule:** Every call to `executeNotebookQuery` MUST use the 3-argument form. Single-object form is forbidden.

### INV-NEW-2: No hardcoded ProLiant/Gen12 delta output path fallback
- **File:** `scripts/evaluators/agentic_eval.js`
- **Bug:** `findCatalogDirectory(id) || path.join(...,'ProLiant','Gen12',id)` — wrong family for Alletra/Cray/Synergy
- **Fix:** Fail loudly with structured error when catalog directory does not exist.

### INV-NEW-3: No fabricated numeric fallbacks in telemetry
- **File:** `scripts/lib/system/telemetry.js`
- **Bug:** `|| 120`, `|| 0.95`, `: 140`, `: 95`, `: 100` hardcoded fallbacks in customer-facing JSON
- **Fix:** All use `null` when not measured. Aggregates skip null entries via `typeof === 'number'` guard.

### INV-NEW-4: Notebook degraded modes surface in all output formats
- **Files:** `knowledge_sync.js`, `eval_boq.js`, `boq_preprocessor.js`, `eval_output_serializer.js`
- **Bug:** `queryEnabled: false` and `cloudSyncState: 'FAILED'` silently ignored
- **Fix:** `getNotebookDegradedMode()` → QUERY_DISABLED / STALE_NOTEBOOK_SYNC / NO_NOTEBOOK_MAPPED. Banner in report header and JSON payload.

### INV-NEW-5: No defaultNotebookId cross-contamination fallback
- **File:** `scripts/lib/boq/boq_preprocessor.js`
- **Bug:** Unmapped chassis fell through to `cfg.defaultNotebookId` (DL380 notebook)
- **Fix:** Removed. `notebookId = null`, `notebookDegradedMode = 'NO_NOTEBOOK_MAPPED'`.

### INV-NEW-6: Conflict graph audit status honesty
- **File:** `scripts/lib/conflict/conflict_graph.js`
- **Bug:** Unknown predicates → auto-PASS; unverified fix SKUs → resolvedFixes; inflated totalRulesEvaluated
- **Fix:** UNEVALUATED status; rulesEvaluated / rulesApplicable / rulesUnevaluated breakdown

### INV-NEW-7: Unevaluated rules reduce confidence score
- **File:** `scripts/lib/feedback/feedback_loop.js`
- **Fix:** -0.05 per unevaluated rule, capped at -0.20

### INV-NEW-8: ragVerified / ragViolationDetected must be written before confidence calculation
- **File:** `scripts/evaluators/eval_boq.js`
- **Bug:** Neither field was ever assigned — +0.05 / -0.15 confidence adjustments were dead code
- **Fix:** RAG reconciliation block assigns both based on citation status and violation language detection

---

## Remaining Gaps (Phase 1-4 Queue)
- B6: Portal rule IR v2 — schemaVersion:2 + unparsed[] backlog (Phase 2, P0)
- C7: Family isolation — DL380 rules running on Alletra/Cray (Phase 2, P0)
- B1: Headless orchestrate.js (Phase 1.1, P1)
- B9: portal_trial.js CLIC auto-delta (Phase 1.5, P1)
- B4: navigate_oca.js fixed sleeps → readiness polling (Phase 1.3, P1)
- C8: Strategy addons template SKU verification (Phase 3, P2)
- C10: Sanitizer regex /g bug (Phase 3, P2)

**Next session start:** B6 — structured rule IR v2.

---

## Test Suite Results (Post-Fix)

| Tier | Count | Result |
|---|---|---|
| Unit Tests | 106/106 | ✅ 100% |
| Chaos & Fault Injection | 40/40 | ✅ 100% |
| Integration & Portfolio Certification | 26/26 | ✅ 100% (1 test updated to enforce INV-NEW-4) |
| **TOTAL** | **172/172** | **✅ 100%** |

**Test updated:** `tests/integration/test_universal_charter_sync.js` — Test 5 now enforces INV-NEW-4:
- Disabled notebooks (`queryEnabled:false`) MUST return `null` and surface `QUERY_DISABLED` degraded mode
- Active notebooks MUST still return a valid notebookId (length > 10)
- This upgrades the test from "every notebook returns an ID" to a richer invariant verification
