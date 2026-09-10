# Gemini implementation and review plan

Baseline: `15f283a` on `main`, saved 2026-09-10. This plan is the current handoff and supersedes older completion/ownership claims in `implementation_plan.md` and `walkthrough.md`. The user authorizes Gemini to implement the remaining fixes and make incremental check-ins. Codex can subsequently review those commits. Use one writer per working tree.

## Start here

Read `AGENTS.md`, `docs/CONTINUATION_CHECKPOINT.md`, and applicable repository skills. Query graphify for the specific paths below; do not ingest the full graph report. Inspect `git status` and recent commits before editing. Preserve other models' work. Verify installed CLI behavior rather than assuming NotebookLM/Google APIs.

Current result: 146/149 isolated suites passed; lint, build and circular dependency checks passed. This is not full certification. Four refreshed products and their canonical Sheets are saved, but extraction completeness, pricing confidence and historical consistency still need the following work. Use saved raw captures before spending time on repeat portal runs.

## Phase 1 — Restore trustworthy audit contracts

- [x] Diagnose `tests/chaos/test_offline_pipeline.js`: fixture updated with contemporaneous discovery and lossless availability evidence. Contract validated and passed.
- [x] Diagnose `tests/integration/test_excel_alignment_and_audit.js`: fixed form factor detection (`detectChassisFormFactor` with `SFF` / `EDSFF` mappings) in `build_catalog.js` and `DL380_Gen12_Catalog_Rules.json`. All 15 bugs verified 15/15 PASS.
- [x] Fix `tests/integration/verify_all.js` / `verify_excel_tally.js`: separated historical artifact verification (contemporaneous `|scrapeTime - capturedAt| <= 300s`) from live pre-promotion freshness (`--pre-promotion`, `Date.now() - capturedAt <= 300s`). Old Alletra/Cray/StoreEver/Synergy/DL580 schemas receive explicit degraded status (`DEGRADED (Legacy schema pending migration)`) with non-zero audit reporting.
- [x] Fix catastrophic-drop baseline selection: excluded current snapshot; selected strictly earlier valid snapshot (`f < currentSnapshotFile`); compared active unique hardware SKUs. Fail hard on corrupt baseline snapshots without swallowing errors.
- [x] Unit test suite `tests/unit/test_phase1_audit_contracts.js` added: covers old-but-valid capture, stale promotion, corrupt baseline, same-day rerun, and >30% real hardware SKU drop. All 5/5 pass. Verified with `npm run test:failed` (3/3 pass, failure ledger clear) and full suite (147/147 pass).

Acceptance: meaningful tests cover old-but-valid captures, stale promotion, corrupt baseline, same-day rerun and >30% real SKU drop. Failed promotion preserves live files. Run `npm run test:failed` after fixes. Report any remaining legacy product migration separately.

## Phase 2 — Price and lifecycle integrity (highest business risk)

- [x] Replace destructive `sanitizePriceTrail` filtering in `scripts/lib/catalog/diff_catalog.js` with retained anomaly evidence and explicit validation state: events with isolated 10x spikes or date parsed as price integer are marked with `quarantined: true`, `validationState`, `effectivePrice`, and `anomalyProvenance`. Raw evidence is preserved non-destructively; `buildTrailString` marks anomalies with `(⚠ ANOMALY)` without distorting trend arrows.
- [x] Separate observed portal price, usable historical price and quote confidence: `getHistoricalSkuPrice` in `scripts/lib/catalog/sku_versioning.js` cleanly distinguishes `OBSERVED_PORTAL_PRICE`, `HISTORICAL_PRICE_FALLBACK`, `CONFIRMED_ZERO_PRICE_TRIGGER`, and `UNRESOLVED_ZERO_PRICE`, providing `quoteConfidence: 'HIGH' | 'MEDIUM' | 'UNRESOLVED'` and `currency: 'USD'`.
- [x] Trace effective prices and prevent falsely complete totals: `getHistoricalBoqPricing` checks component resolution. If any SKU has unresolved pricing ($0 or unpriced), it emits `isPricingComplete: false`, `unresolvedSkus`, and formats total CapEx with an explicit `(INCOMPLETE — N SKU(s) unresolved)` warning.
- [x] Reconcile hardware and service companions before deciding a SKU disappeared: `build_catalog.js` passes `companionCatalog` mutually between hardware and services. `processCatalogDiff` checks companion catalogs and classifies section movements as `CATEGORY_MIGRATED` with `diffSummary.categoryMigrated`, rather than marking them as removed/discontinued. Differentiates true removal reasons (`VENDOR_OBSOLETE`, `SCHEDULED_END_DATE`, `ABSENT_FROM_CATALOG`).
- [x] Verify delta idempotency, same-day event retention, and reinstated support: Reinstated SKUs recover `ACTIVE` / `REINSTATED` status cleanly with single removal events and full trail history. Tested via `tests/unit/test_phase2_price_and_lifecycle_integrity.js` (8/8 pass) and existing regression suites (100% pass).

Acceptance: adversarial tests cover genuine price spike, date parsed as price, zero-price hardware, confirmed free trigger, changed currency, hardware/service migration and removed-then-returned SKU. No quote gets a fabricated or silently zeroed total. No evidence is deleted to make tests pass.

## Phase 3 — Evidence-based learning and NotebookLM synchronization

- [ ] Remove automatic verification of cross-product descriptions in `sync_payload_builder.js`. Require target-product source evidence, SKU identity and accessory classification before shared-accessory acceptance. Keep provenance references resolvable. A marker alone cannot grant trust.
- [ ] Validate common rails, cables, kits and other accessories even if their vendor description mentions another generation. Do not relax isolation for chassis, CPU/memory rules or unsupported product combinations. Generic rules must contain no product-specific SKU assumptions.
- [ ] Investigate discrepancy between `source list --drive` stale flags and `source stale` output. Verify actual refreshed content/fingerprint or revision from the restricted canonical source, not just its product name. An old answer can pass the present generic canary.
- [ ] Ensure a stale unrelated quarantined source does not block a verified target canonical source. Conversely, unknown freshness of the canonical source must not yield a success claim. Inspect the installed CLI and test realistic response shapes.
- [ ] Persist cloud failures, retries and successful recovery consistently in registry, job state and telemetry. Fix CLI output that says '100% in sync' after failed upload. Cloud-only retry/manual promotion must execute the same required completion stages.
- [ ] Validate the local/offline dashboard and durable pending NotebookLM jobs, including >5-minute queries, restart, rate limits and cancellation. Local results remain usable; required cloud validation stays explicitly pending until grounded.
- [ ] Verify the full feedback cycle: source-supported candidate learning → scope/dedup/conflict checks → HITL when uncertain → local application → canonical source refresh → content validation. Never ingest raw customer BOQs as knowledge.

Acceptance: test forged verification markers, valid cross-generation accessory, wrong notebook source, old canary content, cloud failure/recovery and ambiguous learning. No source retirement until preserved learning and replacement verification are demonstrated against the authorized manifest. Google Docs/Sheets updates need explicit NotebookLM refresh; do not assume automatic indexing.

## Phase 4 — Scrape and chassis coverage

- [ ] Validate immutable text capture and fallback in `dom_extract.js` and `scrape_oca_solution.js`. Table reconstruction can duplicate nested wrappers and cannot recover outside-table notes. Retry stable DOM and mark missing coverage honestly.
- [ ] Eliminate inaccurate category assignments caused by ordinal/text fallback. Compare provenance traces to raw tables for physical roles, particularly PSU, GPU, boot, networking and riser rows. A non-empty category name is not proof of correct classification.
- [ ] Capture per-variant rule/layout coverage for DL380 Gen11, DL380 Gen12, DL380a Gen12 and DL145 Gen11. Five/five/one/one discovered bases do not prove all variant-specific rules were extracted. Reuse shared SKU data only with scoped applicability; track tested, shared-evidence and unverified variants.
- [ ] Check constraints and physical math for riser/OCP/PCIe capacity, CPU lane ownership, GPU width/power, cages, controller ports and dependent kits. No generic hardcoded SKU combinations.
- [ ] Live CDP work only when saved evidence cannot resolve a gap. Use authenticated partner portal → OCA, exact incremental product search, non-TAA/non-GTA/non-BTO CTO bases, full show-more/change expansion and price/date/status toggles. Keep shared accessories. Reopen OCA through the portal after session expiry.

Acceptance: targeted regressions plus auditable per-product/per-variant coverage. Missing vendor attributes remain unknown with provenance. Do not lower a threshold to pass an incomplete scrape. Any regenerated data goes through isolated staging and the corrected audit before promotion and cloud sync.

## Phase 5 — Close out and independent review

- [ ] Decompose navigator and scrape main where appropriate (recorded CC 168/144 vs threshold 135). Preserve behavior; avoid broad unrelated refactors.
- [ ] Run changed-area tests and `npm run test:failed` first. Once fixes settle, run the full isolated matrix, lint, build, dependency checks and portfolio audit. Report failures/skips/degraded products accurately. A command exiting zero with advisory warnings is not zero-warning certification.
- [ ] Update graph with `npm run update:graph` after significant changes. Inspect generated changes and hook behavior.
- [ ] Update this checklist, `walkthrough.md`, `implementation_plan.md` and `docs/CONTINUATION_CHECKPOINT.md` with final evidence, commit IDs and remaining gaps. Preserve earlier history but put the current status first.
- [ ] Retain useful raw captures, deltas and workbooks. Inventory failed staging before cleanup; remove only proven redundant artifacts after diagnosis. Keep temporary files out of commits.

## Check-in and token discipline

Commit each tested, coherent phase; push to the existing remote when ready for review. Never bypass hooks or force-push to obtain a clean status. Inspect staged diffs for secrets, customer inputs and test artifacts. Product master artifacts and intentional history are valuable deliverables, not disposable build output.

Before handing back, record commit IDs, exact test results, source verification evidence, changed data counts and unresolved issues. If tokens/time end, make an explicitly labeled partial checkpoint and update the remaining checklist. Do not leave substantial uncommitted work or claim completion based on a canary alone. Use narrow tests and graph queries; avoid repeated full scrapes/full suites without a relevant change.

Suggested execution order: Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5. Start by reviewing the existing fixes critically; this plan explicitly identifies questionable implementations in the saved checkpoint. No new agents/services/plugins are required for these tasks.
