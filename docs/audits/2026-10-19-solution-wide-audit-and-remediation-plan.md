# Solution-wide audit and remediation plan — 19 October 2026

Baseline: `2fdf1ab3b05afd8468865156ea95ee6b58f6f9e4`, plus the working-tree changes described below. No commit or push was performed.

This is a bounded engineering audit, not a claim of perfection or complete portfolio certification. Findings below distinguish reproduced defects, static implementation gaps, and unfinished external verification. Historical benchmarks are not acceptance receipts for these edits. The user's current request authorized targeted tests and end-to-end checks, superseding the old September testing handoff for this task.

## Scope and observed state

Graphify was queried first. The audit then traced skill declarations, presales classification and handlers, quantity/pricing contracts, notebook selection, presentation gates, dashboard upload/evaluation/export paths, catalog inventory, evidence health, and verification tools.

The static inventory found **30 skills, 39 skill documents, 376 production modules and 17 routed intents**. All production modules in that inventory parsed. There were **zero broken skill links and zero unresolved local imports**. The skill entrypoints contain approximately **67,034 words**. These are inventory measurements, not proof that each workflow executes correctly. The declaration registry deliberately remains `UNUSED` by runtime code.

The initial smoke run passed 8/8 suites. The initial router run passed 3/4 suites and timed out at 120 seconds in `test_query_router.js`, which called live NotebookLM. After making that unit suite offline, the router domain passed 4/4 in about 13 seconds.

The local browser E2E passed all five navigation tabs, sample BOQ evaluation, SSE result hydration, topology rendering with 23 nodes, and node interaction. This proves that local path only; it does not prove successful customer delivery or live vendor acceptance.

The first evidence-health scan found **214/214 retained logs structurally healthy**, with no structural gaps. Structural health does not establish hardware correctness, source authenticity, customer-intent preservation, or live vendor acceptance.

Drive/Sheets authorization and NotebookLM CLI authentication passed live preflight. CDP was reachable, but **there was no active HPE OCA page**. Authentication is not a cloud content readback receipt. No live customer BOM, new OCA capture, or cloud publication was performed by this audit.

## Confirmed defects remedied in this working tree

| ID | Priority | Trigger, defect and consequence | Change and acceptance evidence |
|---|---|---|---|
| F01 | P1 | `getNotebookConfigEntry(null, {chassis: 'DL380a Gen11'})` and `Gen13` both returned the Gen12 notebook. The fallback discarded explicit generation. | Removed the forced Gen12 branch, constrained fallback generation, and required a unique fallback. Added regressions in `test_evidence_workflow_truth.js`. Exact Gen12 still resolves; unsupported Gen11/Gen13 return null. |
| F02 | P1 | `BOQItemSchema` used `parseInt` and clamping: fractions, trailing text and negative quantities silently changed the request. | Require positive safe integers, preserving numeric-string support. Regressions cover fractions, zero, negative, blank, trailing text, overflow, infinity, boolean and array inputs. |
| F03 | P1 | The schema accepted `0x10`, `1,2`, and `1 2` as prices 16, 12 and 12 while the canonical observed-price parser rejected them. | Reuse `parseObservedUnitPrice` for nullable schema prices. Added malformed-currency regressions. |
| F04 | P1 | `optimizeForBudget` computed a buildability flag but did not use it before generating upgrades. | Gate upgrade generation on both mathematical and graph success. Diagnostic cost analysis remains available for an invalid baseline. |
| F05 | P1 | Missing component prices produced an apparent surplus and budget-compliance message. An empty BOM could appear affordable. | Added `budgetAssessmentComplete`; incomplete/empty baselines have unknown surplus and no upgrade suggestions. Known subtotal exceeding budget still establishes a lower-bound overrun. Markdown now handles unknown surplus. |
| F06 | P1 | Upgrade selection compared a template threshold with surplus, even when actual upgrade cost exceeded the remaining budget. It omitted order multipliers. | Compare actual template cost × quantity × order multiplier with surplus; show order quantity/cost. Candidate upgrades remain advisory and require compatibility revalidation. |
| F07 | P1 | Optimizer price parsing stripped signs and arbitrary prose: a negative catalog price could become positive. Unconfirmed quoted zero could count as complete pricing. | Use strict observed-price parsing; unconfirmed zero and conflicting quote rows no longer satisfy the quote-price branch. Added regressions. |
| F08 | P2 | `package.json.main` pointed at nonexistent `scripts/scrape_oca_solution.js`. | Corrected to the existing scraper entrypoint under `scripts/scrapers/`. This repairs path existence; it does not make importing a scraper a safe library API. |
| F09 | P2 | Registry validation reported `valid: true` while reporting one missing package entrypoint. Its test explicitly expected the broken main path. | Missing package entrypoints now fail validation; the test requires an existing main. Post-fix registry audit reports zero missing entrypoints. |
| F10 | P2 | A router unit test attempted live cloud queries and exceeded the isolated runner timeout. | Set offline mode before importing the router in that unit suite. Live cloud integration needs a separate explicit test. Router domain passed 4/4 after the change. |
| F11 | P2 | `audit_dashboard_browser_flows.js` logged logical/network/console failures but normally exited zero; it wrote JSON non-atomically. | Fail the process when any reported failure exists or no flows ran; use `safeWriteJsonAtomic`. A failed browser audit must remain a failing receipt. |
| F12 | P2 | The UI E2E called `process.exit(1)` inside its catch, bypassing its `finally` cleanup. | Set `process.exitCode` so browser and owned server cleanup run. Broader E2E harness lifecycle cleanup remains a follow-up. |
| F13 | P1 | Portfolio generator inferred “100% Certified (Full Scrape)” from SKU count >50; dashboard header and registry status displayed unconditional certification. Shared SKUs were described as portfolio-unique. | Replace certification with discovered/stored catalog and unverified-health language. Distinguish row matching from certification. Label portfolio totals as summed per-product counts. |
| F14 | P2 | Main evaluator button, progress description and loading state called the seven-aspect engine a six-aspect engine; the progress description omitted Networking/OCP. | Corrected active upload/progress labels and corresponding component/E2E selectors. Some secondary explanatory strings still need consolidation under F25. |

## Remaining defects and coverage gaps

These remain open; the fixes above do not close them implicitly.

### F15 — P1: catalog schemas still manufacture absent price and freshness data

Evidence: `scripts/lib/system/schemas.js`, `CatalogSkuItemSchema` defaults `Unit Price (USD)` to zero through `CoercedNumber`; `CatalogMetadataSchema.scrapedAt` defaults to the current time. Missing source observations can therefore become apparent price/freshness observations after schema normalization. Customer BOQ price parsing was corrected; this catalog contract was not migrated in this pass.

Remedy: make observed catalog price and capture timestamps nullable; preserve raw fields and provenance; derive freshness from a validated capture receipt. Migrate catalog builders, diffing, workbook/RAG projections and historical fixtures together. Do not change a catalog's real capture time while migrating it.

Acceptance: missing/blank/malformed price stays unknown; unknown capture time stays stale/unknown; schema re-parsing never refreshes a capture; all consumers render incomplete data without treating it as free/current.

### F16 — P1: partial optimizer costs still use total-shaped legacy fields

Evidence: `budget_optimizer.js` still returns zero from `getSkuListPrice` on a miss and retains partial numeric `currentBomCostUsd` / `mandatoryBomCostUsd`. `generate_boq_xlsx.js` has `budgetOptimization?.currentBomCostUsd || 0` fallbacks. F05 prevents false surplus but does not migrate every financial export.

Remedy: introduce explicit known subtotal, nullable complete total, unavailable SKUs and price provenance at each layer. Deprecate the zero sentinel. Keep customer quote, catalog estimate, historical estimate and current vendor quote distinct. Include mandatory additions and zero-confirmation evidence in completeness.

Acceptance: one unknown row makes the complete order total null through API, Markdown, Excel and dashboard. Known subtotal remains visible. No `|| 0` substitutes for an unknown complete amount. Order quantities scale once.

### F17 — P1: optimizer reuses receipt rows without full receipt binding

Evidence: `budget_optimizer.js` reads a current receipt then matches individual rows by SKU/quantity. It does not call `receiptMatches` before assigning `receiptPriceSource` and zero-price confirmation. Matching one line does not bind product base, owner, selectors and full manifest. This finding concerns pricing provenance; it does not assert a bypass of the separate delivery gate.

Remedy: verify complete manifest/scope before using receipt-derived prices as current configuration prices. Otherwise retain them only as dated historical observations with explicit non-applicability. Never label a customer quote price as the live receipt price merely because a row exists.

Acceptance: same SKU/quantity under another owner, base or selector does not inherit current receipt provenance; manifest mutation invalidates applicability; confirmed-free status is bound to the same scope.

### F18 — P1: test execution mutates retained operational knowledge

Observed: starting from a clean tree, the E2E/router runs changed the tracked quarantine, master registry, universal charter and product notebook payload. The new quarantine entries were marked deterministic post-analysis proposals, not vendor-certified rules. Even quarantined test data must not alter the operational baseline.

Remedy: run canonical evaluations with an isolated output root and scoped registry/cache/feedback/lease paths. Extend the existing `scripts/maintenance/skill_workflow/` isolation facilities instead of adding evaluation scripts. Fixture-driven tests must never publish or persist into production knowledge by default.

Acceptance: take tracked/untracked file inventories before and after every fixture suite; only its dedicated test artifact directory changes. A fresh production process cannot retrieve fixture lessons. Preserve test-generated evidence separately before restoring audit-owned operational changes.

### F19 — P2: a status command persists knowledge by default

Evidence: `observability_status.js` calls `buildMasterKnowledgeRegistry()` with no options; that builder defaults `persist` to true and writes the registry and charter. Reading status should not be an implicit sync operation.

Remedy: pass `{persist: false}` for status views and reserve persistence for explicit refresh/sync operations. Audit other status/GET/import paths for the same behavior.

Acceptance: `status --json` and dashboard status reads leave hashes and modification times unchanged; explicit sync still records a receipt.

### F20 — P1: dashboard falls back to unvalidated evaluator data

Evidence: `dashboard/routes/evaluation.cjs` broadcasts `validated.success ? validated.data : parsedData.data`. Schema failure is invisible to the consumer. Useful diagnostic data should survive, but not silently acquire the same status as validated data.

Remedy: return a structured invalid-contract result with schema issues, trace ID and diagnostic payload; disable presentation actions for invalid payloads. Align this with `evalNormalizer.js` and preserve `ACTION_REQUIRED` / `CANCELLED` states.

Acceptance: malformed quantities, rank structure or acceptance data cannot become a normal success view; the diagnostic remains visible and export stays blocked.

### F21 — P1: router exception lifecycle is inconsistent across handlers

Evidence: `_executeLegacyRoutedQuery` awaits `_dispatchIntentHandler` before its common trace/acceptance attachment. Several specialized handlers throw on missing inputs. The BOQ handler catches pipeline failures, but that protection is not a universal router boundary.

Remedy: establish entry trace before dispatch; normalize handler exceptions/cancellation once; finalize an evidence record appropriate to the track. A correlation ID alone is not a complete nine-phase evaluation ledger.

Acceptance: missing input/catalog, corrupt file, unknown product, cancellation and dependency failure each return a machine-readable terminal outcome with reproducible evidence, without invented successful phases.

### F22 — P2: offline environment flags differ by entrypoint

Evidence: `route_query.js` checks `OFFLINE_MODE === 'true'`, while the dashboard route accepts `'1'` and several E2E launchers set `'1'`. The same environment does not have consistent meaning.

Remedy: normalize explicit boolean flags once at process/context ingress and reuse them. Keep online integration explicit; do not silently use an offline fallback as live verification.

Acceptance: boolean true, environment `true` and `1` disable cloud consistently; false/0 do not; tests assert no network spawn in offline mode.

### F23 — P1 coverage gap: mixed-domain validation is deliberately incomplete

Evidence: `docs/SOLUTION_TOPOLOGY_AND_VALIDATION.md` documents server checks and a bounded SAN evaluator. Other storage/networking products, frames and unowned mixed assemblies can require `VALIDATION_PROFILE_REQUIRED` / `NOT_EVALUATED`. The portfolio includes very small catalogs, which are not full coverage evidence.

Remedy: onboard product-specific profiles and owned component relationships. Preserve server, storage, networking and Synergy roles separately. Verify enclosure bays, adapter/fabric mapping, optics at both endpoints, licenses, shared power/cooling and per-icon services. Keep unsupported scope explicitly incomplete.

Acceptance: a profile coverage matrix names every supported and unsupported check for each exact product. Passing compute diagnostics never certifies a frame or fabric assembly.

### F24 — P1 operational gap: portfolio freshness and live acceptance

Observed inventory: DL380/DL380a Gen12 catalogs date to October 17; several other models date to August/September; one Alletra entry has no readable scrape date. Current CDP has no active OCA page. The dates are inventory fields, not a new capture audit.

Remedy: recover OCA from Partner Portal through the canonical navigator; run per-product preflight, complete category/conditional-selector capture, staging coverage audit, promotion, delta check, Drive/Sheets readback and NotebookLM canary verification. Then validate the exact final customer manifest separately in CLIC. Follow `docs/RUNTIME_CONDITIONAL_DISCOVERY.md`; do not reload `OCAInternalLogin`.

Acceptance: dated, product-scoped receipts prove every gate. Authentication, source presence, scrape success, local PASS and vendor acceptance remain separate states. No stale receipt is reused after hardware/services/quantity edits.

### F25 — P2 design/workflow gap: evidence state lacks one presentation contract

Evidence: static certification wording occurred in multiple components and a documentation generator; six-aspect wording appeared across additional descriptions. `evalNormalizer.js` has measured CC 96, indicating a large compatibility/normalization boundary.

Remedy: define shared presentation states for input required, local diagnostic, draft, grounding unavailable, review pending, delivery blocked, authorized export, vendor accepted and sync verified. Derive banners, buttons and next actions from those states. Decompose normalization by documented input version rather than broad truthiness fallbacks.

Acceptance: screenshot/component/browser checks for empty, loading, offline, ambiguity, invalid input, blocked delivery, cancellation, stale receipt and sync failure; keyboard/focus handling; narrow viewport; actionable error recovery; no green certification label without its receipt.

### F26 — P2 architecture gap: declarations are not runtime skill completion

Evidence: static registry activation is `UNUSED`; no runtime registry consumers are present. OCR can return `READY_FOR_OCR`; sizing/tender paths can return drafts; workload analysis can be advisory. These are valid bounded states, but the whole skill portfolio cannot be called executable end-to-end from inventory alone.

Remedy: choose and document the authoritative dispatcher; version typed handoffs and terminal response contracts; migrate one route at a time under shadow/parity checks. Keep discovery and operational skills outside customer evaluation when appropriate. Remove duplicated hardware assertions from long skills in favor of evidence-scoped references.

Acceptance: each route has a positive and negative customer-path case proving classification, exact handler invocation, downstream handoff, evidence persistence, acceptance disposition and next action. No draft or `READY` response is reported as completed execution.

## Remediation order and ownership

| Wave | Work | Dependencies | Owner and completion gate |
|---|---|---|---|
| 0 — current patch | F01–F14 and their regressions | None | Codex engineering audit; targeted tests, lint, build, browser evidence and Graphify refresh. Review working-tree diff. |
| 1 — financial/data boundary | F15–F17, F20–F22 | Versioned nullable pricing/response contracts | Implementation owner plus independent review; malformed/null/conflicting price, owner, multiplier and cancellation counterexamples pass through the entire path. |
| 2 — isolation and observable operation | F18–F19; finish E2E cleanup and audit failure-injection coverage | Isolated output/config/cache roots | Fixture tests leave operational files unchanged; status reads are mutation-free; intentional failing audits exit nonzero and retain receipts. |
| 3 — product coverage | F23–F24 | Authenticated portal, exact catalogs and official sources | Live Antigravity/Gemini workflow under product skills; local checks, citations, promotion/sync and final vendor receipts retained separately. |
| 4 — workflow and UX consolidation | F25–F26 | Stable contracts from waves 1–2 | Small route migrations and UI state work; route parity, accessibility, failure recovery and evidence-state browser checks. |

No large rewrite is required before fixing data boundaries. Do not enable the unused declaration registry globally until parity is demonstrated. Do not refactor a high-complexity function and change its behavioral contract in the same unbounded patch.

## Required end-to-end acceptance matrix

| Path | Required assertions |
|---|---|
| Freeform Q&A | Exact product/generation; official source scope; cloud/local disclosure; no unsupported compatibility claim. |
| OCR → BOQ | Failed/empty extraction stops; original document hash survives; explicit item/quantity review; canonical evaluator handoff. |
| RFP → BOM | Requirements preserved; candidate remains draft until independent local/source/vendor checks; no synthetic PASS. |
| Quote reconciliation | Single-file audit distinguished from two baselines; quantity deltas and pricing gaps separate; no unquoted-zero coercion. |
| Multi-node/mixed tender | Quantity ownership before scaling; global spares counted once; per-product profiles and relationships explicit. |
| Candidate review → delivery | Manifest/base/owner/selectors/customer requirements bound; mutation invalidates review; unsigned/expired/missing-artifact export blocked. |
| Scrape → promotion → cloud | Product coverage and conditional branches; restoration receipt; rollback; atomic publication/readback; source canary. |
| Failure/cancellation | Terminal evidence; useful diagnostics; no orphan processes/leases; no fake completion; fixture data isolated. |
| Continuous learning | Observations/proposals quarantined; official evidence needed for rule promotion; fresh unprimed process proves scoped consumption. |

Run only relevant test domains for each patch. A release-wide regression belongs after the migration waves, with explicit live prerequisites and recorded skips. Do not substitute the historic full-suite percentages for execution against the final revision.

## Evidence and verification receipts

Logs are under `outputs/history/2026-10-19-audit-*.log`. Static JSON inventory/registry/hardcode reports are under `outputs/history/skill_workflow_excellence/2026-10-19/`.

- `smoke.log` / `smoke-final.log`: initial and final curated smoke checks.
- `router.log`: initial 120-second timeout; `router-fixed.log`: 4/4 after offline unit isolation.
- `boundaries-final.log`: schema, budget, evidence/source and registry regressions.
- `aspect-integration.log`: initial legacy assertions exposed false surplus assumptions; `aspect-integration-fixed.log`: corrected incomplete-price contract, 34 checks passed.
- `dashboard-tests.log`: 9 files / 44 component and service tests passed before the last wording-only adjustments; final receipts below supersede where applicable.
- `ui-e2e.log`: five tabs, evaluation/SSE, 23 topology nodes, interaction, owned server cleanup.
- `browser-flows.log`: broader live local dashboard audit; inspect its terminal result, not just printed successes.
- `build-final.log`, `lint-core-final.log`, `lint-dashboard-final.log`, `cycles.log`, `complexity.log`, `graph.log`: build/static/graph receipts.
- `drive-auth.log`, `nlm-auth.log`, `portfolio.log`: read-only live readiness and local inventory; no content-sync or vendor-acceptance claims.
- `evidence.log`: initial 214 healthy evidence structures; subsequent runs may increase the count.
- `price-parser-disagreement.log`: pre-fix reproduction of malformed schema price acceptance.

Hardcode scanning reported **16,668 triage candidates**, including fixtures, product names and legitimate scoped values. That number is not a defect count. Review production decision literals and skill hardware claims against scoped evidence; do not delete legitimate vendor rules simply because the scanner matched them.

The cycle scan found no cycles across 646 scanned files. The measured maximum complexity was 130 at `synthesize5TierRankedSolutions`, within the repository ceiling of 135, with 309 functions above CC 25. Meeting the ceiling is not proof of maintainability or correctness; prioritize the router, normalizer, strategy synthesizer and catalog builder using actual change/failure frequency.

## Completion record

**Subsequent OCA follow-up:** The user's next request authorized live session recovery. Startup, exact P73282-B21 discovery, configuration entry, forced portal recovery and repeat reuse have since succeeded. Read `2026-10-19-oca-session-startup-remediation.md` for the actual authentication/reuse defects, fixes and dated receipts. The earlier “no active OCA page” observation below describes the initial audit snapshot; it is no longer the current session state. Navigation readiness still does not close product capture, cloud synchronization or exact customer-manifest acceptance.

The following checks completed on the working-tree patch:

| Check | Result |
|---|---|
| Curated smoke | 8/8 suites passed after core/schema changes |
| Router domain | 4/4 suites passed after removing the unit test's live cloud dependency |
| Focused schema/budget/evidence/registry regressions | 28 tests passed, zero failures/skips |
| Budget/strategy chaos | 8 tests passed |
| Aspect integration | 34 checks passed with the honest incomplete-price assertions |
| Final dashboard tests | 9 files / 44 tests passed |
| Production dashboard build | Passed, 20.82 seconds |
| Core and dashboard lint | Exit 0, no reported warnings/errors; last browser-auditor edit separately linted successfully |
| Working-tree whitespace check | Passed |
| Initial direct browser E2E | Passed: five navigation tabs, sample evaluation/SSE, 23 topology nodes and node interaction |
| Broader browser audit after selector correction | **FAILED / INCOMPLETE**: preflight-to-result view timed out at 60 seconds |
| Graph refresh | Initial refresh completed: 9,735 nodes / 17,915 edges / 542 communities; final refresh receipt is `graph-final.log` |

The first broader audit skipped evaluation after the seven-aspect label correction because its selector still searched for the old label. It then reported a disabled reconciliation button, although that button correctly requires an evaluated baseline. The auditor now uses the correct action and reports a missing required action explicitly instead of silently continuing. A 15-second wait was also added before diagnosing the telemetry view as absent. **The first run's telemetry/reconciliation messages are not confirmed application bugs.**

The corrected run reached preflight but did not observe its expected completion view within 60 seconds. That is a reproduced audit-path failure with an unresolved root cause. It does not by itself distinguish a slow evaluator, blocked/failed evaluation, or stale completion locator. Add this to **wave 2**: correlate server `runId`, terminal SSE events, canonical evaluator trace and browser state; test both direct evaluation and “preflight → proceed” separately. Use a bounded timeout and report the actual terminal result rather than merely increasing waits. Acceptance requires correct completion or actionable terminal failure, successful baseline handoff to reconciliation when eligible, and cleanup on either outcome.

Audit-generated changes to five tracked operational files (quarantine, product notebook payload, master registry, charter and test failure ledger) were preserved in `outputs/history/2026-10-19-audit-operational-side-effects.patch`, then restored to the starting Git baseline. Test logs and evidence receipts remain under outputs. This does not certify global test isolation or remove all ignored runtime artifacts; F18 remains open.

The user subsequently authorized checking in the report, source fixes, skills and tests for independent Antigravity review. See `2026-10-19-antigravity-review-and-execution-handoff.md` for the current continuation checklist. The remaining waves are an open implementation backlog. No claim is made that every code path, skill instruction, portal branch, product profile or customer workflow has been exhaustively audited or repaired.
