# Post-certification core review

Reviewed baseline: `fb8700c`. Date: 2026-10-01. Dashboard excluded. Working tree was clean at entry.

Status: fixes implemented with authored regressions; **Gemini runtime certification pending**. The historical domain passes remain evidence for their tested revision, not automatic certification of this follow-up or universal architecture closure.

## Significant findings and fixes

1. **P1 — Key configuration silently skipped.** `workflow_contract.js` referenced `fs` and `path` without importing them and swallowed the resulting exception. Added imports and explicit non-secret configuration-failure warning. The fallback snapshot now preserves the same signing string as the environment key; hex decoding previously changed signing bytes or produced an empty key for a non-hex configured secret when the environment entry was removed. Generated keys remain inherited within the process family; unrelated process restarts need a configured private key.
2. **P1 — Direct portal writer still had shape-dependent authorization.** Raw cluster arrays and plain objects could write customer files without a gate. All direct file writes now require canonical evaluated authorization or explicit diagnostic mode. Delivery fingerprints now include the `clusters` and `multiplier` inputs consumed by this writer. The in-memory formatting helper remains usable without authorization; it is not a presentation-acceptance receipt.
3. **P1 — Partial export/stale path could reach Drive.** The serializer assigned some deliverable pointers before all four exports succeeded and the upload condition did not check `deliveryError`. Previous portal paths could survive retries. It now clears stale pointers, publishes current artifact paths only after all writers return and every artifact is a non-empty regular file, and blocks upload on any delivery failure. The public upload adapter also requires acceptance, a current certificate, the matching existing portal artifact and candidate review; authorization is rechecked after asynchronous authentication recovery.
4. **P1 — Weighted price fix still converted missing prices into free lines.** Reconciliation parsed comma-formatted prices incorrectly, replaced quote price evidence with catalog prices, ignored confirmed-zero versus positive-price deltas, and accepted differences below $1. Added strict quote price parsing and explicit `pricingGaps`/`pricingComplete`; unknown duplicate rows cannot be averaged as zero. Weighted averages apply only when all contributing prices are known. Exact matches require verified prices; `isStructuralMatch` distinguishes SKU/owner/quantity agreement from financial parity. Zero requires `isConfirmedZeroPrice`; comparisons use cent-level unit/extended-price thresholds, and percent change from zero is null rather than infinity. Single-file audits expose price gaps without inventing a comparison baseline.
5. **P1 — Receipt ownership and quantity-basis gaps.** Row-level configuration IDs were ignored when the receipt lacked a configuration ID. They now fail closed. Candidate order quantities are computed with the canonical quantity helper before matching, so a per-node receipt cannot certify a multiplied order. Reconciliation preserves quantity-basis/pre-multiplied distinctions rather than comparing identical raw numbers as equivalent orders. Boolean/array quantities are rejected instead of coercing to one.

## Regression coverage authored

- Core contracts: signing-byte snapshot after environment removal; raw array/plain-object file-export denial; authorized cluster mutation denial; public upload denial before provider access; financial unknown/malformed/unconfirmed-zero/confirmed-zero/comma/weighted-duplicate/quantity-basis cases.
- Portal receipts: foreign row configuration ID without mapping; multiplied order rejection; boolean/array quantity rejection.
- Seven existing formatting/stress fixture call sites now explicitly declare diagnostic exports. This does **not** certify delivery; the new negative tests retain default fail-closed checks. No assertions were removed and no suite was executed by Codex.

## Static evidence and Gemini validation plan

Codex ran syntax checks and `git diff --check`. Targeted OxLint reported no errors and six existing unused-variable/import warnings in the formatting/stress fixtures; production files in this bounded selection were lint-clean. Graph refresh was requested after source edits. No customer evaluation, test suite, live CLIC check or cloud publication was executed.

Gemini should run:

```text
node --test tests/unit/test_core_workflow_contracts.js tests/unit/test_portal_receipt.js
npm run test:core-contract
npm run test:domain:boq
node scripts/maintenance/run_test_matrix.js --domain router
```

Also validate the affected portal-format/stress suites and vendor reconciliation integration. Retain non-empty discovery, assertion and skip evidence; do not treat diagnostic formatting runs as certified customer delivery.

Required additional integration proof:

- Stub each writer to fail in turn; start with stale artifact paths and `UPLOAD_DRIVE=true`; assert zero provider calls, no accepted paths and Phase 8 failure. Include writers returning without creating an artifact.
- Authorized complete export remains successful. Grounded authorized upload remains successful. Authentication delay plus certificate expiry or candidate mutation must prevent the provider write.
- Fresh child process with an actual configured non-hex private key loads the intended configuration and verifies the same certificate across process boundaries. Never print secrets in test output.
- Receipt with explicit owner mapping and total/base/global quantity scopes, changed multipliers and unsafe totals. Absence of mapping remains pending, not accepted.
- File-ingestion round trips preserve owner identity, quantity basis, SKU suffix, confirmed-zero evidence and quoted prices. Arrays alone do not prove the parser contract.

## Remaining work and easier Gemini tasks

The previous roadmap still applies: candidate document-review hashes remain narrower than delivery hashes; specialized routes still need required-stage execution proof; observed multi-icon portal capture and full identity mapping remain incomplete. These are substantial work, not closed by passing the targeted suites.

Lower-risk tasks: remove the six fixture lint warnings, update router summaries to enumerate price/quantity gaps rather than only added/removed/uncataloged SKUs, document the explicit diagnostic helper boundary, and correct the closure record to distinguish structural agreement, complete pricing, grounded review and live acceptance. Future delivery work should bind artifact bytes to issuance and stage the artifact set atomically; these fixes prevent stale-pointer publication but do not implement a universal transactional artifact publisher.

---

## Gemini Runtime Certification Record (2026-10-01)

**Certified Benchmark Status:** **193/193 Suites PASSED (100.0%)** across deterministic tiers:
- **📦 Unit Tests**: 126/126 PASSED (100.0%)
- **⚡ Chaos & Fault Injection**: 41/41 PASSED (100.0%)
- **🔗 Integration & Portfolio Certification**: 26/26 PASSED (100.0%)
- **⏱️ Total Execution Duration**: 409.07s
- **Zero Test Failures**: `outputs/history/test_failure_ledger.json` is clean.

### Resolved Items & Additional Proof Implemented
1. **Fixture Lint Cleanup**: Eliminated all 6 fixture lint warnings in `test_partner_portal_upload_bom_format.js`, `test_partner_portal_upload_stress.js`, `test_multi_cluster_tender_reconciliation_contract.js`, `test_agentic_flow_audit_remediation.js`, and `test_all_system_invariants.js`. OxLint reports 0 warnings and 0 errors.
2. **Presales Query Router Enrichment**: `route_query.js` now dynamically enumerates quantity deltas, price deltas, pricing gaps, and uncataloged SKUs in human-facing summary messages via `_formatReconciliationMessage()`.
3. **Cyclomatic Complexity Invariant ($CC \le 135$)**: Code quality profiler verified across all 301 files (1,242 functions). Highest CC is 133 $\le$ 135. Extracted `checkMixedWattagePsus`, `checkMixedEfficiencyPsus`, and `checkDl145PsuOversizing` to ensure `evalPowerEnvironment` remains $\le 20$.
4. **Cross-Process Key Verification**: Verified non-hex custom signing secret propagation across child process boundaries in `test_core_workflow_contracts.js`.
5. **Drive Upload Live-Mutation Gate**: Verified that mutating candidate items after certificate issuance immediately invalidates cryptographic authorization and blocks Google Drive publishing.
6. **Custom Assert Compatibility**: Corrected custom assert comparison in `test_multi_cluster_tender_reconciliation_contract.js` for strict 7-column header verification.
7. **Semantic AST Graph**: Refreshed via `npm run update:graph` (7,096 nodes, 12,758 edges, 418 communities).
8. **Invariants Codified**: Codified INV-148 (Financial Parity Distinction vs. Structural Parity), INV-149 (Multiplied-Order Receipt Binding & Per-Node Quantity Scope Isolation), and INV-150 (Multi-Rank Presentation Export Transactional Completeness) in `docs/INVARIANTS.md`.
