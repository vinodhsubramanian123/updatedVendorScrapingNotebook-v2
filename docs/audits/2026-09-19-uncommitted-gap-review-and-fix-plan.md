> **Closed 2026-09-19:** Antigravity completed validation and Codex matched the current source hashes to saved execution manifests. See [final review closure](2026-09-19-final-remediation-closure.md). Pending instructions below are historical.

# Uncommitted work: gap review and Antigravity fix plan

> Implementation follow-up: [Codex remediation and Antigravity testing handoff](2026-09-19-codex-remediation-testing-handoff.md). Findings below describe the original reviewed state.

Reviewed 2026-09-19 against HEAD `79e6c12c49bdec7ec4d65e55c7e51f124ea65697`.

**Disposition: changes need remediation before check-in.** This is static source and artifact review, not runtime certification. Codex ran no tests, builds, evaluations, cloud calls, or portal operations and changed no implementation. Antigravity owns implementation and subsequent validation; Codex will re-review its changes and receipts.

## Scope and evidence

The starting worktree contained 40 modified tracked files, seven untracked implementation modules, and six untracked unit files. Reviewed the tracked implementation diffs, all seven new modules, their important callers/contracts, new test assertions relevant to the findings, checkpoint claims, prior remediation notes, catalog structure, registry changes, notebook payload changes, quarantine changes, and selected recent evidence logs. Graph discovery ran first through `graphify query` before focused code tracing. No sub-agents were used.

This is not a claim to have proved every possible defect absent. Binary workbooks, every historical log, live notebook contents, and vendor hardware specifications were not independently revalidated. The final section specifies how Antigravity must close remaining coverage gaps without conflating them with confirmed defects.

Retained evidence matters:

- Semantic comparison of `master_knowledge_registry.json` with HEAD found **73 existing delta IDs preserved unchanged and three added**; much of the large diff is movement rather than lost rules.
- Eleven product notebook payloads add those three universal rules. Local payload regeneration alone does not prove remote upload or source readback.
- The modified DL380 Gen12 quarantine records remain quarantined, with changed observation counters/timestamps; these are not newly certified rules.
- `outputs/history/test_failure_ledger.json` currently describes **3/3** suites at `2026-09-19T10:41:06.069Z`. It does not by itself substantiate the checkpoint's **172/172** claim; preserve/find the corresponding full-run receipt rather than assuming the claim is false or proved.
- Recent saved trace `TRC-1789814290856-245422` reports `SKU_DECISIONS_MISSING` and INCOMPLETE. `TRC-1789814251740-FAF91B` records an unknown-chassis failure. `TRC-1789813966917-A7SCJA` is structurally healthy but INCOMPLETE. Such negative traces must remain intact; structural health is deliberately distinct from workflow success.

## Confirmed findings and corrective work

P1 means repair before enabling the affected path or accepting its results. P2 means incomplete capability, audit weakness, or less immediate regression. “New path” identifies exported functionality that is not yet the main production pipeline.

### F01 — P1: Resolver cannot search the real catalog schema (active path)

**Evidence:** `scripts/lib/taxonomy/sku_resolver.js:70` uses `buildCatalogSkuIndex()` for preferred SKUs, but its search enumerates `catalogData.skus`. Actual catalogs use `entries[].skus[]`; the DL380 Gen12 catalog has no top-level `skus`. Preferred-SKU pricing reads `List Price (USD)` while actual rows expose `listPrice` and `Unit Price (USD)`. Storage and power checkers now call this resolver.

**Fix:** Iterate the existing canonical index for every resolution path. Centralize description, category, price, lifecycle, and provenance extraction. Preserve explicitly resolved zero prices; never convert unreadable/missing pricing into an apparently resolved free part.

**Acceptance:** Resolve battery, no-drive option, DC lug, and FC optics from an actual retained catalog shape, with correct price/provenance and explicit unresolved outcomes. The current resolver unit fixture uses a synthetic top-level `skus` object and misses this integration mismatch.

### F02 — P1: Capability criteria are optional scores, allowing unsafe substitutions

**Evidence:** In the same resolver, any positive score qualifies. A role-only match can satisfy a no-drive keyword request or 32/64Gb optic requirement. The preferred-SKU branch does not check role/specifications at all. Unresolved results still return `preferredSku`; `boq_evaluator.js:196` also retains hardcoded FC fallbacks and ignores `isResolved`.

**Impact:** Once real-schema traversal is repaired, an ordinary drive may become the resolved no-drive option, or an incompatible optic/cable may be proposed. `storage_tri_mode.js:107` treats equality with the resolved no-drive SKU as proof of that option.

**Fix:** Filter candidates by required role, function, protocol, speed, chassis compatibility, and lifecycle before ranking. Validate preferred candidates identically. Return an unresolved requirement without an orderable SKU when mandatory criteria lack evidence; propagate that state through synthesis and exports. Do not repair F01 without F02.

### F03 — P1: Router selects a platform without platform evidence (active path)

**Evidence:** `scripts/evaluators/route_query.js:76` gives Gen12 catalogs one point whenever literal `gen11` is absent. Therefore even unrelated/empty text obtains a positive winner. Token substring scoring also treats generation tokens as positive evidence independent of a model; spaced generation text and ties lack explicit rejection.

**Fix:** Require an actual model/alias match before generation preference. Parse generation separately, reject explicit mismatches, and return ambiguity for equally plausible products. Preserve aliases such as Synergy and tape through declared alias metadata. Never use catalog iteration order to settle uncertainty.

**Acceptance:** Unrelated text stays unknown; explicit model/generation cannot silently select a different generation; absent generation follows a documented policy only after model identification.

### F04 — P1: New canonical normalization breaks existing evaluator contracts

**Evidence:** `evaluation_orchestrator.js:34` parses the file path as raw BOQ text despite reading its contents into an unused variable. `normalizeHardwareItem()` returns `partNumber` and nested pricing, while downstream checkers read `it.sku` and existing pricing/quantity metadata. The orchestrator passes a numeric `serverCount` to `evaluatePhysicalMath`'s fourth parameter, which is an options object. Its synthesis call also differs from `synthesize5TierRankedSolutions(items, evalResults, graphResults, chassisInfo, targetDir, options)`.

**Fix:** Define and adapt one explicit boundary contract, preserving SKU identity, customer row provenance, base/global quantity scope, configuration ownership, confirmed-zero prices, and requirements. Reuse the existing ingestion/configuration pipeline. Audit every imported function's actual signature, including optimizer result fields, instead of creating aliases to conceal incompatible semantics.

**Acceptance:** Equivalent file/text/items requests preserve the same SKU identities, quantities, ownership, and prices through the complete call chain. XLSX must use the workbook parser, not UTF-8 decoding.

### F05 — P1: Canonical path invents grounding and uses the wrong platform

**Evidence:** `evaluation_orchestrator.js` completes RAG with `PASSED`, `CLOUD_GROUNDED`, and “Verified citations” whenever not offline, without querying NotebookLM. Physical checks receive a null catalog and empty target directory. Graph/synthesis/learning use hardcoded `outputs/ProLiant/Gen12/DL380_Gen12` even for other requests.

**Fix:** Resolve and certify the selected catalog once and pass a typed evaluation context throughout. Invoke the existing grounded candidate review and preserve source identities, citations, manifest fingerprint, and cleanup results. An unavailable/unrequested check must remain explicitly unverified. Keep `PORTAL VALIDATION PENDING` until a matching live vendor acceptance receipt exists.

### F06 — P1: Canonical adversarial call violates its async and offline contracts

**Evidence:** `evaluation_orchestrator.js:173` calls async `runAdversarialAgent()` without `await`, passes an options object to a function expecting a chassis string, and reads result fields from the Promise. The agent returns no structured result, generates an unrelated cloud BOQ, and writes telemetry. The surrounding synchronous catch cannot handle asynchronous rejection; its catch also sets success to true.

**Fix:** Do not call the background generator as a candidate acceptance gate. Build a structured, awaited candidate validator with the selected context, explicit offline behavior, actual candidate inputs, bounded work, and fail-closed errors. Keep background synthetic fuzzing separate and never infer candidate correctness from the number of fuzz runs.

### F07 — P1: Active CLI's new adversarial gate has no effect

**Evidence:** `eval_boq.js:789` inspects only the first three candidates and only `errors`, with normal synthesis still enabled. At line 936, `redTeamIssues` is assigned and never used. No phase receipt, candidate rejection, or exporter block is attached to it. Existing later candidate validation remains a separate safeguard; it does not make this new check an adversarial gate.

**Fix:** Attach the result to every candidate eligible for delivery after its final mutation; use synthesis-disabled checks, include dependencies and graph failures, and persist the result/fingerprint. Either implement the claimed boundary mutations or name this accurately as independent deterministic revalidation. Avoid duplicate expensive synthesis.

### F08 — P1: Lifecycle can declare completion despite failed checks

**Evidence:** `lifecycle_engine.js:44` only logs unsatisfied dependencies. `completePhase()` trusts the requested status regardless of FAIL checklist items/errors. `getHealth()` accepts WARNED, ACTION_REQUIRED, NOT_REACHED, or arbitrary terminal strings unless exactly FAILED/RUNNING. Unknown phases receive fallback definitions without joining the registered phase list, so mandatory coverage cannot account for them.

**Fix:** Define allowed statuses/transitions, enforce prerequisite policies, distinguish permitted advisory warnings from blocking outcomes, and derive completion from mandatory work and actual check results. Explicitly register extensions with unique IDs/numbers. Preserve the intentional difference between structural evidence health and workflow success.

### F09 — P1: Canonical evidence/export path is incomplete and misleading

**Evidence:** The orchestrator calls `createEvidenceLedger` with positional arguments although it accepts one options object. It does not record input/catalog artifacts or SKU decisions, never completes ledger phase 10 before export, and never registers the ten-phase mandatory set. Report errors are swallowed and deliverables are marked PASSED even with `reportPath: null`; return `success` uses lifecycle health alone. The standard serializer/workbook/delivery gates are not used.

**Fix:** Reuse the mature evidence and delivery contracts. Register the phase definition, record identities/hashes/decisions, finalize after terminal delivery outcomes, and retain a failure trace on exceptions. A failed report write must fail delivery. Use product-scoped output paths and unique run identity; preserve optional cloud delivery semantics.

### F10 — P1: Aspect registry maps the wrong arguments and result flags

**Evidence:** `aspect_registry.js:213` invokes every checker as `(items, catalogData, mandatorySkus, serverCount)`. Memory actually expects `(items, passedCpuCount, catalogData, isCtoChassis, channelWidth)`, so serverCount becomes a truthy CTO flag and chassis channel width is lost. Thermal normalization checks `hasDualProcessorMismatch` and `hasHighTdpCpu`, whereas the checker returns `hasMixedCpuModels` and `needsHighPerfCooling`. Storage normalization omits returned `needsSmartStorageBattery`. Null/non-object results normalize to PASS.

**Fix:** Add explicit checker adapters with named context and an exhaustive result contract. Missing/unsupported results must be UNKNOWN or failure, never PASS. Compare adapters against the existing evaluator's rule translation so errors are not silently dropped.

### F11 — P1: Memory fallback stops counting after the first CPU row

**Evidence:** `memory_channel.js:73` changed the loop condition from `!passedCpuCount` to `!cpuCount`. With no explicit CPU count, the first processor row makes the condition false for later rows.

**Fix:** Capture a separate `hasExplicitCpuCount` flag and sum all CPU rows when absent. Avoid conflating catalog-argument compatibility with counting behavior.

**Acceptance:** Two separate quantity-one CPU rows and one quantity-two CPU row yield the same memory population result. Explicit CPU counts remain authoritative.

### F12 — P1: Role reordering misclassifies accessories and optics

**Evidence:** `product_meta.js:94` places Storage Controller/Drive/Network Adapter ahead of Cable Kit/Transceiver. “Ethernet optical transceiver” now matches Network Adapter; “storage controller cable kit” matches Storage Controller. Only GPU and network cable exclusions were added, so they do not cover storage, riser, or other accessory collisions.

**Fix:** Prefer trustworthy structured component roles, then resolve accessory/function-specific descriptions before broad parent categories. Build a table of ambiguous retained catalog descriptions and resulting roles. Audit downstream tally functions as well as the shared classifier; they retain independent description heuristics.

### F13 — P2: Unified entry point is not integrated

**Evidence:** Production search found `runCanonicalEvaluation` only defined/exported and imported/re-exported by `eval_boq.js`. CLI still invokes `runEvaluationPipeline`; router, multi-cluster, and dashboard do not call the new function. Phase 17's claim of one shared execution pipeline is not implemented.

**Fix:** Keep the mature production path authoritative while F04–F10 are repaired. Prefer extracting common orchestration from it over maintaining two implementations. Then migrate one entry point at a time with equivalent requests/results and documented options. Do not simply connect the current new implementation everywhere.

### F14 — P2: Freshness/integrity checks exist only as unused helpers

**Evidence:** Production search finds no call sites for `auditCatalogFreshness` or `verifyTabularIntegrity` outside their module; the barrel export is not enforcement. Numeric millisecond timestamps are converted to decimal strings and then parsed as dates. Future dates are clamped to age zero. Integrity accepts all-empty tables as valid, defaults missing prices to zero, and performs no SKU-format validation despite the checkpoint claim.

**Fix:** Wire checks into canonical catalog loading and export/scrape boundaries. Normalize ISO/date/epoch representations explicitly; reject invalid/future timestamps according to policy. Validate finite prices with zero-vs-missing semantics, row identity, duplicate conflicts, expected table coverage, and metadata counts. Define exactly when stale data is advisory versus blocks submission; align documentation with those thresholds.

### F15 — P2: Claimed domain coverage and equations are not implemented

**Evidence:** Networking's new checker merely counts optics/DACs and always returns PASS; it does not compare switch ports, speed, protocol, or airflow. Storage allows zero identified controllers as PASS and ignores appliance multiplicity. `archive` silently falls back to server checks. New equation helpers have no production callers; DC/battery helpers use booleans rather than the documented quantity inequalities, while thermal uses max CPU TDP rather than the documented CPU+GPU envelope.

**Fix:** Publish an explicit supported-domain/check capability matrix. Mark unimplemented checks NOT_EVALUATED. Add product-backed domain checkers with correct per-appliance/node quantities; separate logical descriptions from proven capabilities. Remove completion claims for unavailable checks. Parameter defaults must not substitute for unknown chassis specifications.

### F16 — P2: Vendor normalization has concrete identity/specification errors

**Evidence:** `vendor_agnostic_schema.js`'s broad Dell SKU regex precedes Lenovo and captures bare HPE identifiers without descriptive context. Domain is chosen from the first normalized row, so row order can select networking instead of a server solution. EDSFF matches the earlier `sff` branch. The TDP regex can capture the trailing three digits of a four-digit wattage. Normalization loses quantity-scope metadata and allows non-finite numbers; currency can remain non-USD while pricing fields claim USD.

**Fix:** Use explicit product context before item heuristics, preserve unknown/ambiguous vendor identity, detect solution domain independently of row order, and parse unit-bearing specifications by role with bounded numeric validation. Preserve currency/provenance and do not imply conversion without a conversion record. Coordinate schema changes with F04.

### F17 — P2: Pricing promotion is neither wired nor evidence-complete

**Evidence:** `feedback_loop.js:272` accepts SKU/price/reasoning but supplies no quote receipt/citations and labels an autonomous reviewer as human review. Its only production call passes an empty list. It returns a number, while the orchestrator reads `.promotedCount` and reports SYNCHRONIZED. No live-quote reconciliation producer calls it.

**Fix:** Integrate actual drift records with quote ID, region/currency, source artifact hash, catalog version, and governance disposition. Keep pricing evidence distinct from universal physical rules. Return an explicit structured result and count actual activations, quarantines, and synchronization receipts. Do not weaken quarantine to make the advertised auto-promotion pass.

### F18 — P2: Phase 9 can hide unknown synchronization outcomes

**Evidence:** `eval_output_serializer.js:510` now initializes Phase 9 to PASSED. Requested synchronization with absent/unknown output and statuses not explicitly marked FAILED/success:false can retain PASS.

**Fix:** Use an explicit outcome table: unrequested/offline, verified cloud sync, completed local-only work, requested-but-pending/unknown, and failed. Unknown requested work must remain incomplete. Keep separate upload/readback and running-knowledge results, as required by the prior remediation.

### F19 — P2: Factory-included assertions lack per-claim provenance

**Evidence:** New `chassis_map.json` entries assert exact fan, heatsink, riser, NIC, and board defaults without source IDs, dates, or variant conditions. Catalog option count does not establish that a component is factory included. The existing `collectChassisDefaultAdvisories()` consumes these assertions to tell customers lines are redundant. The checkpoint description for DL360 also omits the embedded NIC assertion present in the configuration.

**Fix:** Attach vendor evidence and precise base-SKU/variant/population conditions to every added default. Distinguish management NICs from host network connectivity and socket boards from installed processors. Until verified, suppress definitive “already included/not required” advice for these entries. This finding is missing evidence, not a claim that each hardware assertion is false.

### F20 — P2: Completion claims exceed retained implementation/evidence

**Evidence:** Phase 17/18 claims include wired unified orchestration, replaced lifecycle loops, capability equations, full domain checks, and SKU corruption validation; F13–F15 contradict these claims. All vendor adapters inherit the unimplemented `extractCatalogTree()` and no production caller selects an adapter. New tests predominantly check module shape/happy outputs; the orchestrator test asserts success without artifact existence, grounded evidence, or ledger health. Working-diff evidence hashes exclude the seven untracked modules.

**Fix:** Label adapters as normalization scaffolding until implemented and integrated. Rewrite checkpoint entries around actual support. Tie validation receipts to the complete worktree, including untracked sources and fixtures, using a content manifest or an eventual commit. Do not rewrite historical logs or count an empty failure ledger as proof of all-suite success.

### F21 — P1: New OCR intake ignores offline mode and extraction failure

**Evidence:** `eval_boq.js:209` invokes `performGeminiOcr()` whenever `isImageFile()` matches, without checking `OFFLINE_MODE`. The OCR service returns structured `KEY_REQUIRED`/`FAILED` outcomes as well as explanatory text, but intake consumes only `.text` and passes the notice/error through BOQ parsing. The interactive triage advertises persisted human reasoning, yet intake phase completion does not explicitly record that reasoning as a decision in the evidence ledger.

**Fix:** Enforce the offline contract before any OCR network operation. Preserve original artifact identity, extraction status, model/provenance, and the extracted text hash. Stop extraction failures with a typed, evidence-recorded ingestion outcome rather than parsing notices as customer hardware. Record an actual human selection as an input decision, without treating it as independent catalog or quantity verification.

### F22 — P2: Observability labels overstate the actual checks

**Evidence:** `eval_boq.js` prints unconditional successes such as rule-count `>= 0`, modernization evaluated, and least-delta initialized. The new evidence markdown section expects `equation`/`formula`, while compute exposes `thermalEquationFormula` and no corresponding propagation is added. Missing formulas become “Deterministic Aspect Assertion.” `PipelineLogger.checklist()` writes directly to stdout, bypassing the logger's usual controls, and gives `checked:true` precedence over a contradictory explicit failure status.

**Fix:** Generate checklist status from the recorded phase result, not independently asserted booleans. Carry actual operands, limits, units, rule identity, and formula fields through the aspect/evidence contract; say NOT_RECORDED when absent. Preserve machine-readable output and logger routing. Treat contradictory checklist inputs as an error. Do not label a description string as a mathematical proof.

## Execution order for Antigravity

1. **Freeze the review baseline.** Preserve the existing dirty work and artifact history. Record a manifest of changed/untracked source files and hashes before fixing. Add each F-ID to a disposition table: confirmed, fixed, explicitly deferred, or rebutted with evidence.
2. **Repair active regressions first:** F01+F02 together, then F03, F11, F12, F18, F21. Correct F07 without adding redundant synthesis. Verify F19 evidence before allowing its defaults to drive customer advice.
3. **Establish contracts before integration:** F04, F08, F10, F16. Choose one orchestration implementation based on the mature pipeline; avoid parallel semantic contracts.
4. **Repair the new path's trust boundaries:** F05, F06, F09; then migrate entry points under F13. Grounding, quantity ownership, customer intent preservation, candidate fingerprinting, delivery gating, and Tier 3 pending status must survive migration.
5. **Complete or explicitly defer new capabilities:** F14, F15, F17 and scraper extraction. Repair observability under F22. A declared unsupported feature is preferable to a fabricated PASS. Update completion claims under F20 only after evidence exists.
6. **Regenerate affected artifacts through canonical producers.** Preserve originals and quarantine. Verify local-to-remote synchronization separately; never treat fresh timestamps as remote acknowledgment. Use `safeWriteJsonAtomic` for JSON writes and existing product output hierarchy. Refresh the graph after significant code edits.

## Coverage still required before calling the work complete

Antigravity should perform the validation; Codex has deliberately not run it. Focus on the failure conditions above, then the repository's required release checks, rather than using a passing suite count to substitute for contract review.

| Boundary | Evidence to return for Codex re-review |
| --- | --- |
| Complete change inventory | Every modified/untracked implementation, test, config, and generated artifact mapped to an F-ID or explained as unrelated preserved work; final hashes/commit and diff |
| Entry points | Actual CLI, router, dashboard, and multi-cluster call paths; equivalent inputs preserve results, options, requirement context, and quantity ownership |
| Catalog/SKU resolution | Real catalog fixtures; incompatible role/spec candidate refused; no-drive never resolves to ordinary drive; unknown price/identity remain unknown |
| Physical aspects | Separate CPU rows, mixed models, cache battery absence, CTO vs BTO, channel width, per-node/global quantities, unsupported domains, and checker exceptions retain correct outcomes |
| Negative lifecycle | Failed/unknown prerequisites, FAIL checklists, invalid statuses, missing mandatory phases, and failed writes cannot produce completed success |
| Offline/cloud boundary | No hidden cloud requests during offline runs; missing/uncited/changed-manifest grounding cannot become verified; async failures are awaited and retained |
| Deliverables | Candidate validation corresponds to the final delivered manifest; workbook/report/portal artifacts and their hashes exist; failed exports and missing receipts remain visible |
| Learning and sync | Actual drift source receipt, proper quarantine/activation, exact remote source readback, and requested-but-unknown sync outcome |
| Factory defaults | Evidence per added assertion, variant applicability, management-vs-host distinction, and no unsupported omission advice |
| Prior findings | Reconcile all still-open items from the September 17 evidence remediation and September 18 quantity/Phase 15 reviews; do not assume newer modules supersede them |

Also inspect binary workbook contents/formulas and current remote notebook state only where affected by the fixes. These were outside this static review. Retain failures as evidence; do not relabel them retrospectively.

## Handoff prompt

> Implement `docs/audits/2026-09-19-uncommitted-gap-review-and-fix-plan.md` in its dependency order. Preserve all existing uncommitted work and historical artifacts. Start with active production regressions; do not wire the current new orchestrator into production until its contracts and evidence gates are repaired. For every F01–F22 return the fix or an evidence-backed disposition, relevant file/line references, and validation receipts tied to the final complete worktree. Keep unimplemented capabilities explicit and all customer deliverables PORTAL VALIDATION PENDING without an actual matching vendor acceptance receipt. Run validation as Antigravity; return the final diff and receipts for Codex re-review before check-in.
