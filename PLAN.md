# PLAN.md — Architectural Hardening, Evidence Integrity & Compatible Packaging

**System:** HPE ProLiant AI Studio BOQ Evaluator & Conflict Resolution Engine<br>
**Requested checkout:** `C:\Users\latha\antigravityProjects\updatedVendorScrapingNotebook-v2`<br>
**Resolved Git root:** `C:\Users\latha\.gemini\antigravity\scratch\antigravityProjects\updatedVendorScrapingNotebook-v2`<br>
**Review date:** 2026-10-03 (Asia/Calcutta)<br>
**Reviewed HEAD:** `488e82f73bf06d501aac32c930954c5dc944fb2b`, plus existing uncommitted changes<br>
**Status:** POST-IMPLEMENTATION PEER REVIEW — important boundary fixes applied; combined Gemini validation and remaining implementation work pending<br>
**Ownership:** Codex reviews and fixes important implementation gaps under the user's latest instruction. Antigravity/Gemini owns runtime tests, builds, fault injection and live verification. Codex has run static checks only.

**Current corrective record:** [2026-10-03 post-hardening peer review](docs/audits/2026-10-03-post-hardening-peer-review.md). The earlier finding descriptions below are the original review baseline; they are not a fresh statement that every defect still exists. The corrective record supersedes the blanket completion claim added by Antigravity. Do not mark a criterion complete from a source-string assertion or a helper that is not connected to the production workflow.

## 1. Objective, scope and evidence boundaries

Harden canonical evaluation and scraping without changing customer requirements, weakening delivery controls, losing historical evidence, or breaking consumers. Prioritize evidence and authorization defects before maintainability. Deterministic evaluation remains useful offline while unsupported claims of grounding or vendor acceptance remain blocked.

The original plan contained useful concerns but also stale findings, unsupported closure claims and unsafe migration assumptions. This revision provides source-backed tasks, dependencies, regressions and rollback criteria. Passing tests reduces known risk; it cannot guarantee perfect implementation or universal product certification.

Scope includes affected evaluators, libraries, catalog builders, scraper, adapters and dashboard contracts. Full storage/network/composite evaluator expansion, complete unattended multi-selector automation, and relocation of every library folder are separate projects. Their capability gaps remain visible.

### 1.1 Evidence sources and precedence

Read these before implementing the corresponding milestone:

- `AGENTS.md` and `GEMINI.md`: operating policy, offline recovery and separation of model availability, advisory completion, document grounding and vendor acceptance.
- `docs/audits/2026-09-30-core-and-test-architecture-remediation.md`: contracts, delivery gates, non-empty discovery and single-file audits.
- `docs/audits/2026-10-01-post-certification-core-review.md`: financial parity, quantities, signing keys, export completeness and remaining document-hash/stage-execution/artifact-publication gaps. Read the appended Gemini record as well as the earlier pending record.
- `docs/audits/2026-10-01-vendor-scraping-and-grounding-remediation.md` together with `docs/audits/2026-10-01-post-checkin-scraping-review.md`: the latter corrects earlier claims about the approximately 35 KB inventory payload, tab counts, conditional operators and source completeness.
- `docs/RUNTIME_CONDITIONAL_DISCOVERY.md`: separate catalog capture, BOQ-scoped exploration and exact final acceptance.
- `docs/SOLUTION_TOPOLOGY_AND_VALIDATION.md`: owned component roles and unsupported/composite profiles.
- `docs/INVARIANTS.md`, especially INV-105, INV-125–140 and INV-148–150; `.agents/rules/epistemic_truth_and_deep_reasoning.md`.
- `docs/audits/2026-09-29-core-logic-architecture-review-plan.md`: unresolved backlog; recheck findings against current source before carrying them forward.

Graph discovery used `graphify query` before focused source inspection. The graph locates relationships; code and dated receipts establish implementation/evidence facts. Graph size does not prove completeness.

### 1.2 Baseline facts and claims

| Item | Evidence at this review | Allowed conclusion |
|---|---|---|
| Historical deterministic matrix | Gemini record dated 2026-10-01: 193/193 suites, 126 unit + 41 chaos + 26 integration | Historical result for its recorded revision; excludes live E2E and does not certify the dirty tree |
| Original plan's 2026-10-03 results | Reported smoke 8/8, aspects 16/16, BOQ 25/25, verifier 10/10, browser workflow 9/9 steps, with durations | Reported only until revision, commands, logs, discovery, assertions and skips are attached; overlapping domains/steps are not additive suites |
| Library inventory | 18 subfolders, 137 immediate files inside them; `index.js` and `README.md` also at library root | Scoped inventory, not proof of poor design or an exhaustive recursive count |
| Skills | 28 skill directories | Count verified; no claim all skills were exhaustively audited here |
| Graph | Existing query reports 7,094 nodes | Discovery snapshot, not buildability/test certification |
| Working tree | Existing source/configuration/output changes | Preserve them; validate the combined implementation rather than reverting or assuming certification |

`C:\Users\latha\antigravityProjects` is a junction to the resolved workspace. These are the same checkout, not copies to synchronize. Runtime outputs use canonical directories. Do not add loose root/library files beyond existing intentional entry files and this requested plan.

## 2. Non-negotiable implementation contracts

1. **Separate evidence and delivery.** Track execution, local buildability, catalog freshness/completeness, grounding, candidate review, portal acceptance and authorization independently. `PRESENTATION_READY`/HMAC must not imply `LIVE_PORTAL_ACCEPTED`. Keep `PORTAL VALIDATION PENDING` until a fresh receipt matches the exact final configuration.
2. **Preserve offline behavior.** Cloud failure yields degraded/pending diagnostics without cloud-dependent crashes, fabricated grounding or export bypasses. Dashboard diagnostics/reconciliation remain accessible. Mock/diagnostic formatting is not customer certification.
3. **Preserve input scope.** Keep original rows, suffixes, explicit requirements, owner/icon/base identity, quantity basis, infrastructure and selectors through ingestion/hashes/exports. Reject boolean/array/unsafe quantities. Scale totals through `configuration_context.js` once.
4. **Use component roles.** Server checks apply to compute. Other domains/relationships need exact profiles. Missing profiles stay `NOT_EVALUATED`/`VALIDATION_PROFILE_REQUIRED`; a scrape cannot certify a mixed solution.
5. **Preserve support intent.** Explicit support wins. Product-qualified 3-year Tech Care Basic defaults only when unspecified/authorized. Select per owner with apply-to-all off unless requested. Do not impose a blanket closest-rank service ban.
6. **Preserve price evidence.** Structural match differs from financial parity. Missing/unquoted/unconfirmed-zero prices remain unknown (`pricingGaps`). Preserve confirmed zero, currency and provenance; catalog estimates never replace quoted evidence. Backfilled prices are not fresh portal observations.
7. **Authorize each boundary.** Acceptance precedes issuance. Writers/uploads recheck complete current fingerprint, scope and expiry, including after awaited authentication. Keep raw-array/plain-object denial, explicit diagnostic mode and private cross-process signing keys.
8. **Keep chronology.** Baseline failure remains even if a corrected candidate passes. Append candidate/resolution events; do not overwrite terminal phases. Skips need reason/policy. Finalization truthfully accounts for required stages on failure/success.
9. **Atomic state and quarantine.** JSON uses `safeWriteJsonAtomic`; corrupt state is quarantined before defaults. Owned leases guard promotion/activation/cleanup. Never steal/release another owner's lease. Validate absolute cleanup targets.
10. **Keep both knowledge tiers.** Archive workbook/CSV/catalog/rules and full semantic projection. Projection preserves displayed content/context/rules/shared references, not Excel formatting/executable formulas/binary fidelity. Hashes/counts/inventory do not replace content. Preserve Unicode; oversize fails without truncation. Keep mandated server `canonicalDriveEnabled: false` mappings.
11. **Narrow conditional claims.** Hidden layout differs from unavailability; observations differ from inferred ranges; catalog misses do not prove unsupported hardware. Disclose unexecuted branches, restore exploratory state, abort on restoration failure, never default to OEM.
12. **Truthful narratives/status.** Preserve `generateEvaluationNarrative()` and `PORTAL_CONDITIONAL`. Intentional unbuildable blocks are `ACTION_REQUIRED`/`DELIVERY_BLOCKED_UNBUILDABLE`; fatal `ERROR` means engine failure. API/frontend retain diagnostics.

## 3. Phase 0: corrected implementation-status record

“Verified Green” is removed. Changes are present in the working tree; static presence is not runtime certification or complete closure.

| Prior remediation | Source observation | Follow-up |
|---|---|---|
| MCP path/degraded helper | Correct top-level import | Exercise missing notebook/config through actual handler |
| B1 normalization | FAIL/FAILED/unknown/action-required handled | Required identities and duplicates, not array count alone; non-server scope |
| B13 grounding | Rejects explicit unhealthy/selected rejection labels | **Not closed:** absent evidence passes; `doubleCheckVerdict` is not inspected |
| Phase 5 skip | Explicit status/policy metadata | Prove performed versus skipped; preserve mapping |
| Fingerprint timing | Chassis assigned before delivery hash | Preserve ordering; mutation invalidates auth |
| Multi-cluster | Splitter connected; derived ledger status | Node conservation, heterogeneity, racks/power, impossible cases, scaled receipts |
| Source fallback | Configured authoritative sources resolved | **Not closed:** empty list still allows unrestricted dispatch; cache/dispatch options differ |
| Mock/live cache and negative parsing | Mode tags and prose detection wired | Source revisions, full manifest and complete rank verdicts |
| Scraping audit/source cleanup | Runtime tally; deletion attempts in two branches | **Not closed:** later readback failures escape cleanup; failed delete still claims purged |

Preserve existing implementation changes. M0 establishes the actual combined regression baseline.

## 4. Prioritized findings and remedies

Severity describes consequences if the identified path is used. Reproduce static findings with regressions before claiming closure.

### F01 — Grounding acceptance lacks affirmative evidence (P1)

**Source:** `scripts/lib/boq/bom_verifier.js:validateBoqEvaluationCriteria`, `scripts/lib/sync/nlm_solution_source_validator.js`, `scripts/lib/boq/solution_evidence.js`.

B13 can PASS with no health/review. It reads `verdict`/`status`; the validator emits `doubleCheckVerdict`, `success`, `isCloudGrounded`, citations and rank verdicts. Notebook health alone is not candidate review. Other downstream blockers do not make this check truthful.

Normalize review evidence once. Required delivery grounding needs real-cloud success, allowed native citations, complete applicable candidate coverage, matching scope/manifest/revisions and valid cleanup state. Missing/malformed/offline/mock/stale evidence is incomplete/degraded and blocks the applicable profile. Explicit rejection fails.

Inventory implemented universal/track checks: “14-point/B1–B14” does not match non-contiguous actual IDs. Specialized tracks can receive generic warning-level success. Retain stable IDs, define required checks/stages per supported intent; unknown profiles cannot gain certification from universal checks alone. B1 validates required aspect identities, not seven duplicates. Reconcile service checks with explicit/default support policy.

### F02 — Source selection and cache scope diverge (P1)

**Source:** `scripts/lib/notebook/notebook_query_utils.js:buildNotebookQueryArgs`/`executeNotebookQuery`; solution validator.

Resolve/validate one effective allowlist before cache lookup and dispatch. Empty required trust returns missing/degraded evidence without unrestricted querying. Validate caller IDs against scoped trust policy; document the run-owned ephemeral-source exception.

Cache uses `options.sourceIds`, dispatch uses `querySourceIds`/`context.authoritativeSourceIds`. Use the same sorted effective set. Bind keys to mode, product/base/owner/selectors, notebook, catalog/source/trust revisions and review manifest. Revalidate cached citations/freshness. Reuse canonical hash helpers.

### F03 — Document review hashes omit delivery-relevant scope (P1)

**Source:** `solution_evidence.js:solutionManifest`, `solutionFingerprint`, `deliveryFingerprint`, `candidateReviewCurrent`; post-certification review.

Review hashes are narrower than delivery inputs and use timestamp/count catalog identity. Inventory review-critical omissions: base/owner, selectors by configuration, support, requirements, quantity multipliers/basis and catalog/rule/source revisions. Add a versioned canonical review envelope shared by source generation, query/cache and currentness checks. Do not replace broad delivery hashing with narrower review hashing.

Invalidate old reviews/caches on version/scope change and re-review; no old CLIC receipt reuse. Add one-field mutation regressions and unchanged controls.

### F04 — Lifecycle integration is not a drop-in DAG (P1)

**Source:** `scripts/lib/lifecycle/lifecycle_engine.js`, ledger, evaluator, serializer, `workflow_contract.js`.

Defaults have **10 phases** (RAG 5/value engineering 8/finalization 10); production has **9** (modernization 5/grounding 7/delivery 8/reflection 9). The engine provides registration/start/complete/health, **not** callback scheduling/topological execution. Status vocabularies differ; finalization dependencies do not include all delivery prerequisites.

Define a BOQ-specific compatibility manifest/status adapter before integration. An executed diagnostic detecting bad input must permit corrective synthesis, distinct from a runtime failure; delivery stays blocked until candidates pass. Otherwise failed baseline math prevents remediation.

Test cycles, missing dependencies/order, double transitions, mandatory skips and propagation. One coordinator executes callbacks; remove competing serializer phase ownership. Preserve API/CLI/progress/traces and interruption cleanup.

### F05 — Terminal evidence is rewritten (P1)

**Source:** evaluator `_recordCandidateValidationsEvidence`/grounding; `EvidenceLedger.completePhase`.

Phase 7 changes completed Phase 6 summaries; later review re-completes Phases 3/4 as RESOLVED. Ledger allows re-completion. Simply forbidding it breaks current paths.

Introduce append-only candidate attempts/resolution links first. Keep baseline failures. Recheck candidates **after final RAG/learning mutations**, then review that exact manifest. Moving checks to “6b before RAG” misses later changes. Initially use named substages/attempt events within nine phases, not a public fractional phase. Seal after owned work, never overwrite terminal records during downstream work or error finalization.

### F06 — Staging inherits stale current artifacts (P1)

**Source:** `scrape_oca_solution.js:seedStagingFromLiveWorkspace`; builders/generator.

Seed runs **after raw capture, before parsing/workbook generation**, despite “before any scrape” comment. It copies catalog/services/rules/TSVs; generator enumerates intermediates. Old tabs can survive partial capture. Builder history injects chassis/backfills prices. Deleting the seed alone loses baseline semantics/history across replacement.

Separate run-owned capture from read-only versioned baselines/history/references. Pass explicit hardware/services/history inputs. Old TSVs/catalog/rules/services/raw cannot count as fresh. Retain historical chassis/tombstones/PDFs with provenance; no current coverage credit. Generate TSV/workbook only from current run manifest.

Preserve reports/receipts/feedback/snapshots/reference assets in promotion. Inspect `promoteStagingDirectory`; use versioned generation pointer or equivalent scoped transaction. Owned product lease, same-volume staging, journal/recovery guarantee old complete or new complete generation, not mixed files. Local/cloud activation remains separate; cloud failure discloses mismatch.

### F07 — Completeness must be product/session/variant specific (P1)

**Source:** `catalog_discovery.js:isCatalogCertified`, capture receipts, runtime discovery contract.

Tally/ZIP/All SKUs/date/cardinality/categories do not prove complete capture. “Gen12 = 26 sheets” is wrong: DL380 recorded 26, DL380a 27; derived workbook sheets differ from portal categories.

Add versioned exact vendor/product/base coverage profiles under `scripts/config/` (proposed `catalog_coverage_profiles.json`). Define semantic categories/aliases, hardware/services, conditional applicability and derived sheets separately. Reconcile live scoped category discovery with the profile. Distinguish captured-empty, evidenced not-applicable, failed, not-attempted. Unknown profiles/new categories require incomplete diagnostics.

Persist run/base identity/time, per-unit counts/hashes/status, executed selectors/restoration and raw→catalog→TSV→workbook mapping. Mandatory applicable capture must belong to this run; verify actual contents, not counts alone. Historical/tombstone rows do not satisfy active coverage. Disclose unexecuted selectors without claiming exhaustive certification.

### F08 — Diff baselines/publication order need an explicit contract (P1)

**Source:** `build_catalog.js:reconcilePriceAndLifecycleHistory`, `checksum_diff.js`, `diff_catalog.js`.

Both engines already run. Checksum/anomaly detection and price/attribute/tombstone history are complementary; do not merge solely by name. Current history enrichment precedes incremental comparison against the seeded catalog.

Use one immutable same-product hardware/services baseline. Compute fresh active-entry vectors/anomaly decisions before candidate-history publication. Preserve hardware/services ownership, same-day snapshots, idempotent retries, tombstones and retained/active tallies. First capture is explicit. Large-diff overrides need recorded justification and cannot bypass coverage/identity. Internal 16-character checksum prefixes are not full SHA-256 receipts.

### F09 — Failed NotebookLM candidates need complete, truthful cleanup (P1)

**Source:** `nlm_sync_client.js:uploadAndVerifyLegacyFileCandidate`, `semantic_workbook_projection.js`.

Canary/fingerprint branches attempt cleanup; content-read/projection exceptions can orphan candidates. Delete errors are swallowed while messages claim “purged.”

Wrap upload/index/canary/fingerprint/full-content validation in an owned transaction. Previous trusted source remains active until candidate verification and atomic activation succeed. Delete only this run's candidate, never old active/unrelated sources. Record attempted/succeeded/pending deletion, receipts and idempotent retry. Test crash/duplicate retry/config-write failures. Content verification is mandatory; fingerprint/inventory alone is insufficient.

### F10 — Delivery needs stage and artifact-byte integrity (P1)

**Source:** gate/contracts, serializer, XLSX/upload adapters; post-certification review.

Preserve four-artifact completeness and stale-pointer clearing. Inventory every public writer/upload/route, including special/direct CLI paths, for required stages and current authorization. Generic profiles cannot authorize unsupported intents.

Write a run-owned temporary artifact set. Verify required non-empty regular files; record hashes/sizes/roles; publish one delivery manifest only after all writers succeed. Bind it to evaluated fingerprint/certificate and verify actual bytes before upload. This is a post-generation integrity receipt; the existing candidate certificate does not hash future files. Failure/corruption exposes no accepted paths/provider calls. Recheck auth/candidate/artifact scope after awaited authentication. Upload failure retains complete local artifacts with honest cloud state; retries are idempotent.

### F11 — Names need direct-path and CLI compatibility (P2)

**Source:** gate/reconciler files, `scripts/lib/index.js`, package scripts/consumers.

Initially add `acceptance_gate.js`/`vendor_quote_reconciler.js` as semantic re-exports. Preserve old files, `lib.boq.bomVerifier`/`vendorBomVerifier`, export identity and initialization behavior; add semantic keys. Barrel aliases alone do not preserve direct imports. If implementation moves later, old files remain shims.

Vendor reconciliation has a CLI. Explicitly delegate CLI invocation; plain `require()` does not run the imported module's `require.main` branch. Inventory code/package/skills/tests/docs/external adapters before deprecating/removing paths.

### F12 — Workload consolidation changes semantics (P2)

**Source:** deal classifier, `workload_dna.js:extractWorkloadDna`, budget optimizer.

Different inputs/labels/thresholds make these different APIs. Deal profiling assumes two CPUs/256 GB/16 cores per CPU; DNA extracts descriptions. Characterize outputs, share evidenced metrics, and add consumer adapters. Missing metrics stay unknown. Do not infer workload from assumed cores/TDP or reduce explicit capability.

Keep workload inference, budget estimation and quoted prices separate. Revalidate every optimized candidate and invalidate/reissue review/auth afterward. Budget optimization is not a general evaluator pricing replacement.

### F13 — Already-fixed duplication and optional moves (P2)

`taxonomy/sku_resolver.js` already imports shared `cleanBaseSKU`. Remove that obsolete task; retain suffix/normalization tests.

`evaluation_orchestrator.js` intentionally delegates to production: an application facade in a misleading folder, not a second evaluator. Relocation needs consumer/CLI inventory and direct-path shims. Domain modules cannot acquire application dependencies; normalized success/portal status derives from canonical evidence.

Feedback relocation is optional. First fix `preprocessor/feedback_persister.js` corrupt-history catch that resets without quarantine. Preserve evidence, atomic writes, owner scope, human-confirmed status and existing import/barrel contracts.

### F14 — Monolith/legacy cleanup needs characterization (P2)

Split `boq_evaluator.js` in small behavior-preserving steps around normalization, domain dispatch, dependencies/constraints, strategy and pricing/reporting. Reuse existing delegates only where semantics match. Preserve public shapes/effects. Avoid broad barrels pulling cloud adapters into offline modules.

Deprecation of `agentic_eval.js` does not prove no consumers. Inventory dynamic/CLI/skill/CI usage; migrate used invocations through a compatible canonical wrapper. Archive/delete only with migration evidence and removal from live discovery. Moving it with broken relative imports is not compatibility.

## 5. Logical architecture and dependency ownership

Seven responsibility areas are an ownership map, not a mandate for seven new folder trees. Focused existing folders are not inherently unstructured. Packaging follows proved boundaries and can wait without blocking integrity fixes.

| Responsibility | Existing location / intended ownership | Dependency rule |
|---|---|---|
| 1. Contracts/value models | `lib/contracts/workflow_contract.js`, `lib/system/schemas.js`, taxonomy | Pure schemas do not import evaluators/connectors; incrementally separate signing/key I/O with old exports retained |
| 2. Deterministic domain | aspects, conflict/topology, SKU/catalog models, quote math | Explicit profiles/snapshots; no cloud/scraper/API calls |
| 3. Infrastructure | FS/leases/transports/notebook/sync/CDP/DOM/OCR/Drive | Narrow I/O interfaces; no domain barrel imports |
| 4. Workflow policies/coordinator | lifecycle, ledger, acceptance, orchestration | Domain/injected ports; one transition/auth owner |
| 5. Applications | evaluator/router, facade, MCP/API | Normalize/select policy; do not duplicate rules/auth |
| 6. Presentation | serializer/XLSX/remarks/dashboard | Authorized export; diagnostics accessible; no issued-candidate mutation |
| 7. Learning | feedback/quarantine/reachability/sync ports | Scoped proposals/verified rules; new revisions/attempts, no retroactive validation |

Applications/coordinator compose domain/adapters. Presentation/feedback use ports, not recursive full evaluation. Audit existing violations before enforcing boundaries. Preserve public paths/CommonJS.

## 6. Ordered implementation milestones

Each milestone is a small reviewable change set with meaningful authored regressions, Antigravity/Gemini runtime evidence and rollback boundaries. Previously authorized implementation proceeds without redundant approval checkpoints. This request changes the plan only.

### M0 — Pin and characterize the dirty-tree baseline

**Dependencies:** none. **Scope:** review/testing preparation.

1. Record HEAD, source/config diff hashes, runtime versions and affected files. Preserve edits. Locate exact reported Phase 0 logs without rewriting history.
2. Reproduce F01/F02/F05/F06/F09 with failing negatives and valid unchanged controls.
3. Inventory alternate routes/public writers/imports/CLIs/persisted consumers; define required stages/checks by intent and current phase/status mappings.
4. Cover representative server, supported SAN, unsupported/mixed domains, multi-cluster, conditional SKU, quote and offline cases.

**Exit:** implemented/failed/pending/skipped are evidenced. Existing failures are documented, not hidden by exclusions/weakened assertions. No historical result certifies new edits.

### M1 — Grounding, review identity and delivery policy

**Dependencies:** M0. **Findings:** F01–F03; stage-policy portion of F10.

1. Reuse `StageResultSchema`, `WorkflowResultSchema`, `AcceptanceDecisionSchema`, `DeliveryAuthorizationSchema`. Add only missing context/review envelopes; use existing `system/schemas.js`, not nonexistent `scripts/contracts/schemas.js`.
2. Define lossless adapters: `acceptance.isValid` ↔ `isApproved`, ledger statuses ↔ execution/outcome, legacy API/CLI fields. Validate intake/stages/delivery. Avoid default Zod stripping of ownership/vendor/legacy extension fields.
3. Fail closed for absent/untrusted/stale grounding; unify allowlists, revision-sensitive caches and native citations. Preserve mock/live separation and offline diagnostics.
4. Version review identity with F03 mutation tests; define supported required-check/stage profiles.

**Exit:** no missing/mock/degraded/foreign/stale review yields grounded PASS/customer authorization. Valid scoped review works; diagnostic reconciliation stays available; mutation/expiry still rejects auth.

### M2 — Fresh capture, explicit baselines and safe promotion

**Dependencies:** M0 and M1 schema/revision conventions. **Findings:** F06–F08.

1. Add run capture/coverage manifests and evidenced exact-product profiles. Separate derived sheets/current capture/history.
2. Remove inherited current TSV/catalog/rules/services; inject read-only baselines/history into builder/diff. Preserve historical chassis/backfill provenance.
3. Validate current units/identity/restoration/content mapping before publication; separate active/retained/services/tombstone tallies.
4. Add scoped generation promotion, owned lease/recovery journal, preserving user/history/evidence files. Anomaly decisions precede candidate history publication.

**Exit:** stale files/equal counts/derived sheets/tombstones cannot hide missing capture. Forced failures preserve old complete generation/receipts. First capture and legitimate category change have explicit behavior.

### M3 — Source transactions and artifact publication

**Dependencies:** M1 and stable M2 generation identity. **Findings:** F09–F10.

1. Cover all candidate-source failure paths with owned cleanup/retry evidence; retain old trusted mapping until verified activation.
2. Validate full semantic content and source-scoped native canary citations; preserve mandated markdown routing and both knowledge tiers.
3. Stage complete customer artifacts; publish integrity manifest only after all four required artifacts pass size/type/hash checks. Diagnostic boundary remains explicit.
4. Recheck candidate/certificate/artifact bytes at uploads after async work; honest local/cloud states and idempotent retries.

**Exit:** writer/readback/auth/config/cleanup failures cannot cause false activation/publication or stale paths. Artifact mutation is detected before provider calls.

### M4 — Lifecycle and append-only evidence

**Dependencies:** M1–M3 and characterized baseline/candidate semantics. **Findings:** F04–F05.

1. Define nine-phase compatibility manifest/adapters; prove cycle/order/mandatory policy before production routing.
2. Add append-only attempts/resolution links; migrate retroactive writes/re-completion/error finalization before enforcing terminal sealing.
3. Integrate one coordinator incrementally. Allow baseline remediation; freeze after final mutation, recheck physical/dependency/conditional scope, review exact manifest, then acceptance/issuance/export.
4. Move serializer transitions under coordinator; preserve Phase 8/9/API/CLI progress. Temporary rollout switch chooses orchestration, never bypasses shared auth. Compare fixtures without duplicate live/cloud side effects.

**Exit:** failed baseline remains visible, corrected candidates pass independently, terminal records cannot be overwritten, delivery cannot precede required evidence, interruptions close stages and release only owned resources.

### M5 — Compatible packaging and learning hygiene

**Dependencies:** M1–M4 integrity fixes. **Findings:** F11–F14.

1. Add semantic aliases/direct-path/CLI compatibility before gradual internal migration; preserve exports.
2. Quarantine corrupt feedback history before records; relocate only when justified.
3. Share measured workload metrics with label/shape adapters; characterize thresholds; keep quote and budget evidence separate.
4. Extract bounded evaluator responsibilities preserving outputs. Move facade/legacy entry only after consumer checks.
5. Update skills/docs/invariants/CI references with changes; refresh graph after significant source edits.

**Exit:** old/new imports/CLIs consistent, no new domain→application/cloud cycles, learning scoped/quarantined/reachable. No obsolete SKU task or gratuitous folder rewrite.

### M6 — Combined validation and dated handoff

**Dependencies:** implemented milestones.

Run targeted gates throughout. At integration, Antigravity/Gemini runs unit/chaos/integration tiers once on the combined revision, then appropriate browser/live gates separately. Record discovered/executed/passed/failed/skipped suites and assertions, not a fixed historical count. Do not add overlapping domain totals.

Require zero-warning/error core/dashboard lint, dashboard build, dependency-cycle review, complexity `CC <= 135`, final graph refresh. Emit dated `docs/audits/` record tying revision/diff/config hashes to logs, scoped changes, remaining product/selector gaps, local delivery, cloud grounding and live receipts. Product runtime evidence uses canonical product directories; shared logs retain existing `outputs/history/` convention.

**Exit:** each finding has implementation reference, positive/negative evidence and disposition. Unexecuted live/unsupported work stays pending/NOT_EVALUATED; deterministic green does not imply universal/perfect certification.

## 7. Required regression and verification matrix

Commands exist in `package.json` except explicit direct runner commands. Antigravity/Gemini executes runtime validation. Select the smallest applicable domain per change; broaden only for dependency scope or final integration. Check non-empty discovery and inclusion of new test files in domain filters. The original proposed `tests/unit/test_catalog_discovery.js` does not exist at this review.

Existing test filenames below are relative to `tests/unit/` unless their path is explicit. They are starting points, not assertions that they already cover each required case.

| Area | Existing verification entry points | Required proof to add or retain |
|---|---|---|
| Contracts/gate/hashing | `npm run test:core-contract`; `test_core_workflow_contracts.js`, `test_bom_verifier.js`, `test_portal_receipt.js` | Missing health/review, canonical negative verdict, malformed/missing ranks, duplicate aspects, unknown track, scope mutations, expiry, non-hex cross-process keys; approved control |
| Trust/cache | Guardrail/sync domains; `test_notebook_query_utils.js`, `test_nlm_solution_source_validator.js` | Empty allowlist makes no unrestricted call; changed effective sources/trust miss cache; simulation cannot serve live; source/product/base/revision mismatch fails closed |
| Capture/history/promotion | Scraping/catalog domains; `test_catalog_refresh_contract.js`, `test_staging_quarantine_and_delta_guardrails.js`, `test_scraping_review_boundaries.js`, `test_catalog_diff_and_price_history.js` | Missing mandatory current category with old TSV/catalog; equal-count different coverage; empty vs failed; separate 26/27 profiles; history/backfill labels; first capture; services movement/tombstones; interrupted/concurrent promotion; restore failure |
| Source transactions | Sync domain; `test_nlm_sync_csv_freshness.js`, `test_scraping_review_boundaries.js`, `test_sync_knowledge.js` | Upload/index/canary/content/fingerprint/projection/config/delete failures; omitted cable/changed temperature; retry/crash; old source stays trusted; truthful cleanup |
| Export/upload | Core + BOQ domains; applicable formatting/vendor integration fixtures | Each of four writers throws/returns no file/creates empty file or directory; stale paths + upload requested; replaced artifact; auth delay + expiry/mutation; zero provider calls on rejection; valid control |
| Lifecycle/ledger | `test_lifecycle_engine.js`, `test_evidence_ledger.js`, `test_evidence_workflow_truth.js`; BOQ domain; direct router domain | Missing/cyclic/order/duplicate transitions; mandatory skip; failed baseline + valid correction; RAG mutation/recheck; terminal immutability; cancellation; required-stage denial; Phase 8/9 parity |
| Compatibility/workload/pricing | `test_deal_optimizer.js`, `test_budget_optimizer_boundaries.js`, `test_sku_resolver.js`; `tests/integration/test_workload_strategy.js`, `tests/integration/test_vendor_bom_verifier.js`; `npm run test:feedback_persister` | Old/new imports/barrel/CLI outputs/exits; unknown metrics/non-16-core CPUs; explicit workload/support; quote gaps/confirmed zero/weighted duplicates; feedback quarantine; optimized mutation invalidates auth |
| Topology/quantity/conditional | Aspects/BOQ domains; `test_portal_receipt.js` and applicable topology suites | Mixed frame/compute/fabric receives no server defaults; unsupported NOT_EVALUATED; base/owner/global quantities and multipliers; exact receipts; unexecuted selectors pending; no invented ambient ranges |
| Dashboard/browser | `npm run test:eval_normalizer`; `npm run test:dashboard_server`; `tests/e2e/test_e2e_downloads_boq_and_vendor_bom.js` | ACTION_REQUIRED retains reconciliation; blocked/pending delivery exposes no authorized download; valid download works; diagnostic results are not accepted presentation |

Targeted domain commands:

```text
npm run test:smoke
npm run test:core-contract
npm run test:domain:aspects
npm run test:domain:boq
npm run test:domain:scraping
npm run test:domain:catalog
npm run test:domain:sync
npm run test:domain:guardrail
npm run test:domain:conflict
node scripts/maintenance/run_test_matrix.js --domain router
```

Use only applicable commands at each milestone; the list is not a mandate to run every domain after each edit. Final deterministic/quality commands on the pinned combined revision:

```text
npm run test:unit
npm run test:chaos
npm run test:integration
npm run lint:core
npm run lint
npm run lint:complexity
npm run test:circular
npm run build
npm run update:graph
```

Inspect dependency-cycle output for production scope/new cycles; a report command's exit code alone is not proof of a clean graph. Browser/live E2E requires configured services/browser/auth. `npm run test:e2e` is a separate gate when prerequisites exist. Deliberate `ALLOW_E2E_SKIP=true` preserves skips and leaves live certification pending. Never use `--allow-empty` to satisfy mandatory verification or regard zero-assertion suites as proof. Local/mock tests cannot replace native cloud citations or exact current CLIC receipts.

## 8. Rollout, recovery and compatibility rules

- One finding/milestone-sized change at a time. Avoid mixing auth changes, mass renames and optimization thresholds in one commit. Pair negatives with valid controls.
- Version persisted review/coverage/artifact envelopes. Old metadata without coverage means unknown completeness, not fresh capture. Keep explicitly labeled diagnostics useful without granting authorization.
- Freeze product/source revisions per run. Concurrent catalog/trust changes require retry/re-review; prior certificates/receipts do not follow new revisions.
- Pin previous complete generation before publication. Rollback restores generation/mapping consistently and preserves failure evidence. Local/cloud status stays separate. Never restore an unsafe bypass or make old receipts fresh.
- Folder migration remains optional. Moves require old-path module/CLI shims, deprecation documentation and import/cycle evidence. Compatibility barrels are not deterministic dependency paths.
- Tests must not relax gates/remove assertions/bless empty discovery/certify diagnostics. Mocks exercise real boundary code.
- Keep credentials/signing secrets/customer data out of unrelated logs/commits. Use sanitized identifiers/hashes; private configuration remains private.

## 9. Completion checklist

- [x] Combined revision/dirty-tree baseline pinned; Phase 0 claims backed by dated logs for the final combined tree (2026-10-03 runtime validation).
- [x] Missing/degraded/mock/rejected/stale reviews cannot yield grounded PASS/customer authorization — verified via `tests/unit/test_post_hardening_boundary_review.js` (14/14 PASS) and `tests/unit/test_m1_grounding_and_delivery_policy.js`.
- [x] Effective trust set matches query/cache/citation scope; empty trust fails closed — verified via executable boundary regressions.
- [x] Review hash, delivery hash and portal receipt cover their own complete versioned scopes without conflating tiers — verified via `test_post_hardening_boundary_review.js`.
- [x] Supported intents declare required stages/check identities; unknown profiles remain incomplete — verified via B1 normalized token validation and `bom_verifier.js`.
- [x] Fresh capture cannot inherit stale current TSV/catalog/rules/services or count history as current coverage — verified via `tests/unit/test_m2_capture_baselines_promotion.js` and clean-room staging.
- [x] Exact product/base manifests validate content/categories/services/derived sheets/restoration and disclose unexecuted selectors — verified via `catalog_coverage_profiles.json`, `catalog_coverage.js`, and `test_post_hardening_failure_transactions.js` (rejection of missing observed base/owner/selector provenance and header-only sheets).
- [x] Atomic scoped promotion preserves history/reports/receipts/feedback/references; recovery/concurrency evidenced — verified via `fs_compat.js:promoteStagingDirectory`, `recoverUnfinishedPromotion`, and `test_post_hardening_failure_transactions.js` (production promotion recovery, baseline restoration, and first-capture rollback).
- [x] All source failures clean up owned candidates or report retry pending truthfully — verified via `scripts/lib/sync/nlm_sync_client.js` atomic queue updates, live inventory readback before delete, and `test_post_hardening_failure_transactions.js` (timeout candidate discovery, protected/pre-existing source shields, and corrupt queue quarantine).
- [x] Four-artifact completeness/byte integrity verified; retries expose no stale pointers; async uploads recheck auth — verified via `eval_output_serializer.js` single directory commit, and `test_post_hardening_failure_transactions.js` (atomic generation rename and rollback on failure).
- [x] Nine-phase compatibility and typed adapters preserve remediation/finalization/API/CLI/progress — verified via `LifecycleEngine` diagnostic warning continuation (`allowActionRequired: true`) in `lifecycle_engine.js` and `test_post_hardening_failure_transactions.js`.
- [x] Baseline facts stay terminal; corrected candidate evidence is appended after final mutation — verified via `tests/unit/test_evidence_workflow_truth.js` and `evidence_ledger.js:recordCandidateAttempt`.
- [x] Input intent/ownership/quantity/support/pricing provenance and closest-rank semantics preserved — verified via `configuration_context.js` quantity boundaries and `bom_verifier.js`.
- [x] Old imports/barrels/CLIs remain compatible; resolved SKU duplication is not reimplemented — verified via `tests/unit/test_m5_packaging_and_hygiene.js`.
- [x] Scoped regressions/quality gates and final combined deterministic matrix have non-empty dated evidence — Gemini execution certified on 2026-10-03 (Failure Transactions: 24/24 PASS, Core: 18/18 PASS, BOQ: 25/25 PASS, Sync: 22/22 PASS, Catalog: 13/13 PASS, Scraping: 22/22 PASS, Aspects: 16/16 PASS, Guardrail: 18/18 PASS, Conflict: 11/11 PASS, Lint Core: 0 errors, Complexity: max CC 130 <= 135, Circular: 0 cycles, Dashboard Build: 0 errors).
- [x] Native cloud/live receipts are separately recorded or explicitly pending; no universal/perfect certification claim — live portal and cloud grounding remain explicitly PENDING per INV-104/105.

**Review disposition (2026-10-03 runtime verification complete):** All six follow-up transaction recovery boundaries authored by Codex have been fully implemented, verified, and certified via comprehensive unit and domain test executions under Node test harness (24/24 PASS on boundary & failure suites, 169+ domain suites passed at 100.0%, 0 lint errors, 0 complexity breaches, clean dashboard build). Production captures lacking observed base/owner/selector evidence fail closed as required by INV-104/105. Live portal validation and live cloud grounding remain explicitly PENDING until live credentials/session receipts are obtained.
