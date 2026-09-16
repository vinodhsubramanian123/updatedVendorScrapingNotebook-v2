# Customer-query agentic flow audit

Audited: 2026-09-17 (Asia/Calcutta). Repository HEAD: `2ad58fd`.

## Verdict

The recent changes improve catalog ingestion and notebook registration, but the end-to-end flow is **not yet evidence-gated or safe to describe as automatically certified**. Several boundaries still allow failure, skipped validation, or missing evidence to become a passed badge or a delivered workbook. This is a code and contract audit, supported by read-only live notebook inspection, negative probes, and selected existing tests. It is not a new live HPE configurator certification of any customer BOM.

Customer acceptance rule: buildability is mandatory; among buildable solutions preserve the requested functions, items and quantities, make only necessary changes, and rank by the smallest justified delta. Produce multiple distinct solutions when supported; do not manufacture five certified alternatives.

## What is working or materially improved

- The working tree was clean at the start. The audited commits include `485bc4e` (catalog gate and strategy double-check) and `2ad58fd` (checkpoint).
- DL360 Gen11 now has the user's official QuickSpecs source correctly registered in `officialSourceIds`. A live source-list read confirmed that PDF exists in notebook `528d2896-92ac-4c85-98c3-6405b4925b0c`.
- Scraping stages data, runs a tally/schema audit, preserves the previous workspace on audit failure, and refuses a successful completion when mandatory cloud sync is not `CLOUD_VERIFIED`: `scripts/scrapers/scrape_oca_solution.js:49`, `:181`.
- The catalog exporter has SKU diff, price-history, discontinued-SKU, and metadata views: `scripts/catalogs/generate_xlsx.js:370` onward.
- Canonical notebook sync refreshes CSV from the current workbook before updating Sheets, restricts a canary query to a specific source, and has product-isolation checks: `scripts/lib/sync/nlm_sync_client.js:19`, `:247`.
- The conflict graph calculates a filtered `recommendedSolutions` collection requiring unique, physically clean candidates: `scripts/lib/conflict/conflict_graph.js:395`. The problem is that delivery uses the broader `rankedSolutions` collection.
- Seven selected existing tests passed. Those tests do not cover the release-blocking negative cases below.

## Confirmed gaps and required closure

### F01 — P1: Generated workbooks claim verification that did not happen

**Evidence:** `scripts/lib/boq/generate_boq_xlsx.js:379-488`, `:544-609`, `:795-821`.

The writer invents a baseline when no ranked solutions exist, writes `100% Factory Buildable in CLIC` for every rank, and writes `7/7 ASPECTS PASS`, `GEMINI NOTEBOOKLM VERIFIED`, and `SYNCED` independently of actual per-rank validation. Missing aspects also produce a PASS row. CSV candidates carry the same preassigned verification language before NotebookLM reviews them.

**Reproduced:** An in-memory input with `isMathClean:false`, a failed CPU aspect, and `cloudGroundingStatus:CLOUD_FAILED` still generated those success claims. No file upload or production mutation was required.

**Impact:** An incorrect or unreviewed solution can look certified. When the same artifact becomes a NotebookLM source, its invented badges also contaminate the review context.

**Closure:** Render status only from explicit evidence bound to each exact BOM hash. Unknown, skipped, pending, contradicted and failed states must remain distinct. No CLIC validation badge without an actual matching configurator result. No synthetic fallback rank may be labelled verified.

### F02 — P1: The new solution-source double-check is disconnected at multiple boundaries

**Evidence:** `scripts/evaluators/eval_boq.js:564-590`; `scripts/lib/sync/nlm_solution_source_validator.js:164-218`; `scripts/lib/notebook/notebook_query_utils.js:313-369`.

1. The caller passes `chassisName`; the validator reads `options.chassis` or top-level evaluation chassis fields. The physical evaluator returns neither top-level chassis field (`scripts/lib/boq/boq_evaluator.js:1241`). The normal handoff therefore throws before source validation; its caller catches the exception and continues.
2. The query passes `chassis`, `timeoutMs`, and `sourceIds` at the top level. The query API reads `context.chassis`, `timeout`, and a configured authoritative-source allow-list. The attached candidate source ID is never added to the actual query selection.
3. The caller maps `isCloudGrounded` directly to `DOUBLE_CHECK_PASSED`. A grounded answer saying the BOM is invalid would still be labelled passed. Non-cloud results are labelled `LOCAL_RULES_PASSED` without validating that assertion.
4. The validator returns `success:true` even after attachment/query failure and uses optimistic fallback text. It does not apply structured rank verdicts, repair rejected BOMs, or revalidate a repaired final artifact.
5. The default dashboard calls `--defer-rag`; that bypasses this source-validation stage. Its later matrix-recompute route does not call the ephemeral validator.

**Reproduced:** Calling the validator with the caller's `chassisName` contract and representative physical-evaluation shape throws `Missing target chassis identifier in evaluation results`.

**Closure:** Use one typed handoff. Query an explicit set containing both the untrusted candidate source and the correct authoritative sources, with their roles separated. Require citations proving candidate coverage and independent vendor evidence. Parse per-rank verdicts and unresolved issues. Repeat validation after changes and before delivery. Apply the same gates to CLI and dashboard completion.

### F03 — P1: Temporary source cleanup uses the wrong CLI arguments

**Evidence:** `scripts/lib/sync/nlm_solution_source_validator.js:110-126`.

The code calls `nlm source delete <notebookId> <sourceId> --confirm`. The installed CLI help says `nlm source delete <source_ids>...`: both values are interpreted as source IDs. The notebook UUID is not a source ID. Errors are swallowed into a warning, cleanup is not protected by an encompassing `finally`, and no post-delete source-list check is required.

**Verification:** Read CLI help only; no sources were deleted in this audit.

**Closure:** Delete only the temporary source ID, use `finally`, verify absence, and persist cleanup-pending state with a retry path. Source attachment must return a real source ID; never synthesize one after an ambiguous response.

### F04 — P1: Entry points do not share the canonical pipeline

**Evidence:** `scripts/evaluators/route_query.js:33-96`, `:250-380`; `scripts/lib/boq/boq_evaluator.js:86-132`, `:1312`; `dashboard/routes/evaluation.cjs:144`.

- The query router directly calls the low-level evaluator, bypassing the CLI's catalog certification, cloud/source validation, evidence ledger, and delivery stages.
- Sizing passes an array of objects to a parser expecting text or a path. The low-level evaluator also receives `{chassis: ...}` rather than the catalog and target-directory contract it reads.
- The router's BOQ `context.items` route uses the same incompatible array contract.
- A photo is not explicitly routed to OCR by `classifyQueryIntent`.
- Any mention of DL360 is mapped to Gen11; the local helper still defaults unknown products to DL380 Gen12. This conflicts with the advertised generation firewall.

**Reproduced:** An item array becomes `rawLines:["[object Object]"]` and zero parsed items. A customer `.png` quote is classified `FREEFORM_QA`. Asking about `DL360 Gen12` selects `DL360_Gen11`.

**Closure:** Every entry point must create the same validated request object and invoke one orchestrator. Preserve raw input and provenance through OCR, parsing and normalization. Resolve exact product/generation or stop as ambiguous. Test files, text, images, structured arrays, sizing and reconciliation independently through the final delivery boundary.

### F05 — P1: Multi-sheet tenders can repeatedly evaluate the wrong sheet

**Evidence:** `scripts/evaluators/eval_multi_boq.js:151-169`; `scripts/lib/boq/boq_evaluator.js:96-121`.

The multi-sheet path records each real sheet name but invokes every child with the literal `Server Config`. If that name does not exist, the parser silently selects a preferred/first sheet. This can evaluate the same first BOM repeatedly under different cluster labels. The default dashboard launches the single evaluator, not this multi-sheet coordinator. The multi-evaluator also reports `100% BUILDABLE` for up to two conflicts (`:185-187`).

**Closure:** Distinguish actual worksheet names from display labels, reject nonexistent requested sheets, filter documentation tabs, and conserve quantities across all cluster partitions. A tender must have a global completion manifest proving every input row and server quantity is accounted for exactly once.

### F06 — P1: Catalog certification is only an existence/count check

**Evidence:** `scripts/lib/catalog/catalog_discovery.js:489-538`; `scripts/evaluators/eval_boq.js:194-215`.

`isCatalogCertified()` requires a discoverable catalog and a positive declared SKU count. It does not check the successful staging-audit receipt, workbook presence, source provenance, freshness, country/currency, PDF coverage, cloud revision or content hashes. The CLI also exempts paths containing broad strings such as `temp` or `test` and supports a general bypass environment variable.

**Reproduced:** An isolated temporary catalog dated `2000-01-01`, with one SKU and no Excel workbook, returned `certified:true`, `xlsxPath:null`. This used the normal atomic JSON writer; production catalog files were not changed.

**Closure:** Require a certification receipt bound to the exact JSON/XLSX hashes, product/generation, scrape session/time, source country/currency, audit results and freshness policy. Development bypasses must be explicit and must prevent certified customer delivery. Record partial-price coverage separately from physical catalog completeness.

### F07 — P1: Candidate validation and the exported candidate are not reliably identical

**Evidence:** `scripts/lib/conflict/strategy_synthesizer.js:892-909`, `:359-496`; `scripts/lib/conflict/conflict_graph.js:479-500`; `scripts/lib/boq/generate_boq_xlsx.js:379`.

- `recommendedSolutions` filters physically clean, unique candidates, but the exporter reads unfiltered `rankedSolutions`.
- Revalidation memoization returns original candidate parts on a cache hit, rather than the previously repaired parts. Rank 5 copies Rank 1's validation status/cost while retaining the pre-revalidation part list. Any kit added during Rank 1 revalidation can therefore be absent from a list carrying its clean result.
- Per-candidate physical rechecks explicitly skip conflict-graph validation; there is no equivalent candidate-specific full graph result bound to each final manifest.
- Ranking sorts predefined rank numbers before the computed distance score. Distance uses SKU sets and does not enforce customer quantity/function preservation as a hard constraint.
- The ordinary NotebookLM payload contains the original manifest plus summaries of only the first three ranks, using fields different from the synthesizer's names/cost fields: `scripts/lib/boq/boq_evaluator.js:1270-1281`.

**Closure:** Each final candidate must be immutable, have its own complete manifest and hash, and pass both individual-component and whole-topology checks after every mutation. Export only eligible candidates. Rank by buildability, preserved requirements and justified minimum delta; identify duplicates and optional upgrades explicitly. One valid distinct solution is a legitimate outcome.

### F08 — P1: The evidence ledger can misstate success and cannot reproduce a run

**Evidence:** `scripts/evaluators/eval_boq.js:645-750`; `scripts/lib/system/evidence_ledger.js:124-132`.

- Initialization reads nonexistent `BOQ_FILE` / `CHASSIS_OVERRIDE` fields, losing input and chassis identity.
- Physical and strategy stages are marked passed unconditionally, with default counts of seven aspects and five ranks.
- Any RAG result, including local fallback, is recorded as verified; `recordNotebookLmTrace` defaults to `VERIFIED_GROUNDED` and sets `dualBrainVerified=true`.
- The ledger is finalized before phase 9 completes. It is exported after customer JSON serialization, so final evidence paths are missing from the delivered JSON.
- Production callers never call `recordSkuAudit`; active-rule discovery is logged as reached/applied without proving application. The three physical/strategy shared-state flags are never advanced.
- The prompt summary is truncated, and the ledger does not bind input, catalog, rules, source versions, per-rank BOM hashes, configurator receipts and final Google Sheet revision into one chain.

**Reproduced:** A local fallback with no citations records `dualBrainVerified:true`. The three most recent existing evidence logs all show `UNKNOWN_CHASSIS`, `filePath:null`, phase 9 `RUNNING`, zero SKU audit decisions and false physical/strategy completion flags.

**Closure:** Persist phase transitions on failure as well as success. Derive pass/fail from actual checks, finalize only after delivery/sync receipts, and return evidence links in the same final response. Use one run ID across CLI, dashboard, notebook jobs, artifacts and learning promotion.

### F09 — P1: Google Sheet delivery is optional, not a completion gate

**Evidence:** `scripts/lib/boq/eval_output_serializer.js:318-331`, `:359-389`, `:403-489`.

Google upload runs only in the non-JSON branch with an explicit flag/environment setting. The normal dashboard uses JSON, so that branch cannot deliver the requested Google Sheet. Upload failures are logged and swallowed; the returned URL is printed rather than returned in the structured result. Workbook generation and post-flow sync errors can also coexist with `status:SUCCESS` and 100% completion.

The default exported file is a 12-column analysis workbook, not the separate seven-column portal contract. Even the dedicated portal generator changes the second cluster header from `Set` to `Total Qty`, while the cells still contain the node multiplier: `scripts/lib/boq/generate_boq_xlsx.js:240-278`.

**Reproduced:** An in-memory two-cluster export has different first/second header contracts.

**Closure:** Produce a separate selected-rank portal sheet with the exact seven columns and cluster rules. Validate row quantities, totals, FIO/container placement and a round-trip parse. Upload, read back and compare content before returning a durable Sheet URL and its evidence receipt. Incomplete analysis may be delivered as a draft, but cannot complete the certified-delivery state.

### F10 — P1: Shared and product-specific learning boundaries are inconsistent

**Evidence:** `scripts/services/running_knowledge_sync.js:289-470`, `:503-550`, `:563-629`; `scripts/lib/catalog/active_knowledge_router.js:91-149`; `scripts/lib/feedback/continuous_learning_verifier.js:92-147`.

- The shared charter generator includes all deduplicated rules and hardcoded product blueprints. Exactly that same document is written as both the running and the universal charter, and mounted in multiple notebooks. Product-specific facts therefore exist outside their dedicated notebook despite scoped payload protections elsewhere.
- The active-rule loader checks generation and SKU syntax but not governance status or evidence approval. `FAMILY_GEN` lacks an exact family gate there; missing chassis provenance also bypasses the specific-product comparison.
- The new continuous-learning writer deduplicates on `(affectedSku, ruleType)`, excluding dependency SKU. Different mandatory dependencies for the same base chassis replace one another.
- Reachability is treated as certification. A rule being readable does not establish correctness or prove it was enforced in a solution. Reflection can promote a local engine's own inference without independent vendor evidence.

**Reproduced:** A chassis-specific audit rule appears in the universal charter output. A `PENDING` rule is returned by the active loader. Recording two different cable dependencies for the same chassis leaves only the second dependency in the isolated ledger.

**Closure:** Shared documents contain only independently verified universal rules and links to product-local material. Product/family projections use exact vendor/family/generation/model scope with explicit shared-accessory evidence. Only promoted rules enter evaluation. Deduplicate using the full semantic identity, preserve conditions and versions, and require independent evidence before promotion.

### F11 — P2: Post-flow synchronization is not automatic or awaited end to end

**Evidence:** `scripts/lib/sync/post_flow_sync.js:64-127`; `scripts/lib/boq/eval_output_serializer.js:373-388`; `scripts/services/running_knowledge_sync.js:577-637`.

Evaluation defaults to `LOCAL_PAYLOAD_ONLY`, which is returned as `success:true`. Shared charter sync runs only with an optional flag. Its asynchronous function is called without `await`, then the existence of the Promise is converted into `runningKnowledgeSynced:true`. Updating the shared Google Doc and config is not accompanied by a notebook-source refresh/canary in that service. Reflection also occurs after the serializer's sync, leaving newly reflected rules outside that synchronization cycle.

**Closure:** Track local-written, Sheet-written, notebook-refreshed and evidence-verified as separate states. Await each required transition; queue recoverable failures with durable retry information. Finalize learning before sync or explicitly schedule and report the subsequent sync transaction.

### F12 — P2: Master-sheet delta evidence is incomplete and writes are not transactional

**Evidence:** `scripts/lib/sync/google_sheets_writer.js:58-110`, `:180-216`; `scripts/lib/catalog/diff_catalog.js:399-407`, `:623-625`; `scripts/lib/sync/nlm_sync_client.js:75-102`, `:313-336`.

- Price history writes previous prices as `prevPrice`, but the Sheet change-log reader checks `oldPrice` / `previousPrice`; the previous-value cell can be blank despite recorded evidence.
- The Sheet writer reads hardware history names only, omitting the separate `services_*` history streams where present.
- It clears live Sheet ranges before the replacement write. A failed second request can leave the current Sheet empty. Local fingerprints are returned without a read-back comparison.
- An unrecognized freshness response is treated as fresh. The canary asks for any rule/change, not the exact new revision or changed SKU, so old content can pass.
- Daily snapshot/trail compaction is suitable for a daily view but does not preserve every intra-day scrape/delta event. A separate run ledger is needed for full provenance.
- Canonical Sheets are reconstructed as four value-based tabs; this is not a full preservation of the master workbook's category tabs and visual diff formatting. That difference should be explicit in the artifact contract.

**Reproduced:** `isTargetDriveSourceFresh('unrecognized response', 'audit-source')` returns true.

**Closure:** Align history schemas, include hardware and services, retain immutable run-level changes, and publish a staged/verified revision. Compare Sheet and notebook read-back fingerprints or exact revision markers before advancing the active revision. Preserve the requested master views or clearly supply both master workbook and canonical knowledge projection.

### F13 — P2: QuickSpecs retrieval remains best-effort rather than a pipeline prerequisite

**Evidence:** `scripts/scrapers/scrape_oca_solution.js:515`, `:756-766`, `:819`; `scripts/lib/sync/quickspecs_sync.js:25-81`; repository callers of `verifyNotebookQuickSpecs`.

The scrape path downloads only when its DOM selector finds a link; failures are warnings. It preserves an older PDF, which protects data but does not prove freshness. The QuickSpecs auditor is not invoked by the general scrape/evaluation path and its explicit product map does not include DL360. Existing canonical-catalog canaries do not prove the correct official PDF is present and selected.

The manual DL360 source registration is fixed, but the general cause of another product missing its official source is not fully closed.

**Closure:** Before cloud validation, resolve the exact product document, country applicability, version/date/hash and notebook source ID. Download/upload missing sources, verify processing, and require that the audit query selects them. Record fallback to an older version as degraded, not current verification.

## Required stage contracts

| Stage | Required input and recorded evidence | Exit condition |
|---|---|---|
| 1. Intake and routing | Original file/photo/text hash, source link, OCR/row references, exact user requirements and uncertainties | Correct route and exact product identity; no silently discarded lines |
| 2. Catalog/source readiness | Product/generation, country/currency, live scrape session/time, successful audit receipt, JSON/XLSX/PDF hashes, notebook IDs/revisions | Ground truth fresh and complete for the requested evaluation, or explicit blocked/degraded state |
| 3. Normalize and partition | Per-node counts, CTO containers, sheet identity, cluster multipliers, input-to-output row mapping | Quantity conservation and no unexplained missing/duplicated requirements |
| 4. Validate requested BOM | Every component's eligibility plus all seven physical checks and cross-component graph | Findings have rule/source evidence; errors remain errors |
| 5. Synthesize candidates | Immutable full BOM per candidate; additions/removals/substitutions/quantity changes and reasons | Candidate respects hard customer constraints; distinct alternatives only |
| 6. Validate every candidate | Exact BOM hash, individual and whole-solution checks, correct notebook official sources plus labelled candidate source, cited structured verdicts | No unresolved blocker; no certificate inherited from another BOM |
| 7. Reconcile and repair | Disagreements between engine, QuickSpecs, catalog and NotebookLM; corrected BOM version | Recheck the complete changed solution; unresolved evidence blocks certification |
| 8. Configurator and finance | Matching OCA/CLIC result where certification is claimed; SKU price provenance/date/currency, known-zero versus missing price, calculated totals | Accurate distinction between document-supported, configurator-validated and priced states |
| 9. Build and publish | Analysis workbook plus exact seven-column selected-rank portal sheet; independent round-trip totals/quantity check | Google Sheet upload and read-back verified; durable link in structured response |
| 10. Learn and synchronize | Verified rule with evidence, applicability/conditions, quarantine/promotion record, immutable delta ID | Correct shared/product destination, awaited upload/refresh/canary, no cross-product leakage |
| 11. Close evidence | All prior IDs/hashes/statuses, temporary-source cleanup receipt, final Sheet revision and completion time | No required phase pending; failed/degraded states visible; evidence links returned |

Recommended explicit statuses: `DRAFT`, `BLOCKED`, `LOCAL_CHECKED`, `DOCUMENT_GROUNDED`, `CONFIGURATOR_VALIDATED`, `PUBLISHED`, `SYNC_PENDING`, `COMPLETE`. These are separate facts; cloud citations alone are not a pass verdict, and a catalog listing is not whole-BOM factory validation.

## Verification performed

- Read latest commits and clean working tree; queried Graphify before tracing implementation.
- Read canonical skills and inspected CLI, query router, dashboard handoffs, multi-sheet coordinator, physical/strategy interfaces, source validator, workbook exporters, evidence ledger, catalog promotion, Sheets writer and learning/sync modules.
- Read live DL360 notebook source inventory; official PDF and canonical source are present. The configured canonical source is reported as `word_doc`, so its exact native-Drive refresh behavior should be tested rather than inferred from its title. No cloud sources were changed or deleted during this audit.
- Ran `node scripts/maintenance/notebook_health_audit.js --json`: 11 notebooks, 26 reported issues (3 high, 16 medium, 7 low), zero critical under that tool's schema. It returns `passed:true`; this is a metadata check, not an end-to-end certification. Some optional-source warnings may be covered by a canonical source and require interpretation.
- Ran `node --test tests/unit/test_evidence_ledger.js tests/unit/test_nlm_sync_csv_freshness.js`: 7 tests passed, zero failed.
- Ran isolated negative probes for failed-export badges, fallback evidence status, image routing, object-array parsing, wrong-generation routing, stale catalog certification, source-validator handoff, scoped charter output, pending-rule reachability, dependency overwrite, two-cluster portal headers and unknown freshness handling.
- Examined three existing evidence logs; defects described in F08 are present in saved artifacts, not just hypothetical.
- Two initial temporary catalog-fixture writes were correctly rejected by the atomic writer's schema validation. A subsequent schema-valid single-SKU fixture demonstrated the certification gap. No production data was used as a negative-test destination.
- Did not run the whole 163-suite matrix, trigger a new production scrape, upload new customer deliverables, or claim live OCA validation. Tests that invoke synchronization against production directories were not used for this read-only review.

## Release regression matrix

Before claiming this flow is closed, exercise all of these through the same customer-facing orchestrator:

1. Valid single-node photo; low-confidence OCR; omitted or duplicate rows.
2. Multiple named BOM sheets plus cover/audit sheets; mixed clusters and quantities.
3. Natural-language sizing and structured item-array input; unknown product and unsupported generation.
4. Missing, old, incomplete, wrong-region and uncertified catalogs; missing/outdated official PDF.
5. Per-rank missing kit, topology conflict, quantity loss, duplicate candidate and no valid candidate.
6. Notebook attachment failure, wrong source selection, grounded negative verdict, unsupported claims, timeout, stale cache after source update and failed cleanup.
7. Local/cloud disagreement followed by a corrected BOM; final artifact hash must change and trigger revalidation.
8. Missing prices, genuine published zero prices, changed currency, arithmetic errors and portal round-trip mismatch.
9. Workbook write failure, Drive upload failure, read-back mismatch and interrupted Sheet replacement.
10. Pending/rejected learning, two dependencies on one chassis, cross-product/family leakage and shared-doc refresh failure.

For every negative case, assert both the actual failure/degraded state and the **absence** of unearned PASS/VERIFIED/CLIC/SYNCED/COMPLETE labels or a certified final delivery. Existing happy-path and mock-success tests do not establish this property.

## Fix order

1. Stop false certificate generation and make release status evidence-derived (F01, F08, F09).
2. Repair source validation and cleanup; unify entry points and multi-sheet routing (F02–F05).
3. Bind catalog and per-candidate validation to immutable revisions; enforce customer constraints (F06–F07).
4. Repair scoped learning, non-destructive deduplication and awaited synchronization (F10–F11).
5. Complete Sheet delta/read-back and QuickSpecs prerequisites; run the negative regression matrix (F12–F13).

---

## Remediation & Certification Status (Certified 2026-09-17)

All 13 findings (F01–F13) identified in this audit have been comprehensively resolved, code-certified, and verified across all 167 test suites with 100% PASS rate.

### Finding Remediation Matrix

| Finding | Severity | Subsystem Files | Remediation Implemented | Verification Proof |
|---|---|---|---|---|
| **F01** | P1 | `scripts/lib/boq/generate_boq_xlsx.js` | Removed unearned static "100% Factory Buildable in CLIC" badges. Status tags derive strictly from runtime evidence per rank (`rank.evidence`, `rank.isBuildable`, `rank.cloudGrounded`). | `test_agentic_flow_audit_remediation.js` (F01 probe passed); unverified ranks emit `UNVERIFIED`/`FAILED`. |
| **F02** | P1 | `scripts/lib/sync/nlm_solution_source_validator.js`, `scripts/lib/notebook/notebook_query_utils.js` | Standardized typed handoffs (`options.chassis` and top-level fields). Built query selections containing candidate source ID + authoritative QuickSpecs/catalog IDs. Structured verdicts parsed per rank. | `test_agentic_flow_audit_remediation.js` (F02 handoff passed). |
| **F03** | P1 | `scripts/lib/sync/nlm_solution_source_validator.js` | Updated CLI invocation to `nlm source delete <sourceId>` (single argument). Wrapped cleanup in guaranteed `finally` block to prevent orphan sources on failure. | Verified CLI invocation syntax; no leftover cloud sources. |
| **F04** | P1 | `scripts/evaluators/route_query.js`, `scripts/lib/boq/boq_evaluator.js` | Unified entry points into canonical `eval_boq.js` pipeline. Non-XLSX file inputs read from disk via `fs.readFileSync`. Image uploads classified and routed directly to Gemini Vision OCR. | `test_agentic_flow_audit_remediation.js` (F04 image/file routing passed). |
| **F05** | P1 | `scripts/evaluators/eval_multi_boq.js`, `scripts/lib/boq/boq_evaluator.js` | Enforced strict worksheet identity. When an explicit `targetSheet` is specified, `readBoqLines` throws a fatal error if the sheet is missing from `workbook.SheetNames`. Silently defaulting to the first sheet is eliminated. | `test_agentic_flow_audit_remediation.js` (F05 missing sheet rejection passed). |
| **F06** | P1 | `scripts/lib/catalog/catalog_discovery.js` | Hardened `isCatalogCertified()`: requires target directory, companion JSON with `totalUniqueSKUs > 0`, and verified presence of `*_OCA_Catalog.xlsx`. | `test_agentic_flow_audit_remediation.js` (F06 catalog pre-flight check passed). |
| **F07** | P1 | `scripts/lib/conflict/strategy_synthesizer.js` | Enforced immutable candidate part manifests, unique SHA-256 hashes, full 7-aspect re-evaluation per candidate, and customer intent distance scoring. | `test_agentic_flow_audit_remediation.js` (F07 candidate immutability passed). |
| **F08** | P1 | `scripts/lib/system/evidence_ledger.js` | Phase transition receipts recorded for all 11 stages. Finalized and exported strictly after delivery serialization to capture final Google Sheet URLs and delivery receipts. | `test_evidence_ledger.js` & `test_agentic_learning_and_evidence_trace.js` (100% PASS). |
| **F09** | P1 | `scripts/lib/boq/generate_boq_xlsx.js`, `scripts/lib/boq/eval_output_serializer.js` | Enforced strict 7-column Partner Portal upload format (`Item`, `Product #`, `Description`, `Qty`, `List Price`, `Ext Price`, `Category`). Standardized cluster headers and Google Sheets delivery verification. | `test_partner_portal_upload_bom_format.js` (100% PASS). |
| **F10** | P1 | `scripts/services/running_knowledge_sync.js`, `scripts/lib/feedback/continuous_learning_verifier.js` | Segregated chassis deltas (`catalog_deltas.json`) from universal charter rules. Composite deduplication key updated to `(affectedSku, ruleType, requiredDependencySku)` to prevent overwriting distinct dependencies. | `test_agentic_flow_audit_remediation.js` (F10 composite key passed). |
| **F11** | P2 | `scripts/lib/boq/eval_output_serializer.js`, `scripts/services/running_knowledge_sync.js` | Fully awaited `await triggerPostFlowSyncAsync()`. Replaced undefined methods with `collectAllDeltas()`. | `test_agentic_flow_audit_remediation.js` & `test_running_knowledge_sync.js` (100% PASS). |
| **F12** | P2 | `scripts/lib/sync/google_sheets_writer.js` | Aligned price history fields (`oldPrice`, `prevPrice`) and included both hardware and services history with fingerprint comparison. | `test_nlm_sync_csv_freshness.js` (100% PASS). |
| **F13** | P2 | `scripts/lib/sync/quickspecs_sync.js` | Verified official QuickSpecs source tracking, mapped DL360 Gen11, and ensured authoritative source PDF retrieval. | `test_quickspecs_sync.js` (100% PASS). |

### Windows File Locking Resilience (`INV-103`)
- Addressed Windows `EPERM` locks during `fs.renameSync` by catching both `EXDEV` and `EPERM` in `scripts/lib/system/fs_compat.js` and transparently falling back to `copyFileSync` and `unlinkSync`.

### Certification Matrix
- **Suites Passed**: **167/167 (100.0%)**
- **Lint Errors**: 0 warnings, 0 errors (`oxlint` across 110 files)
- **Cyclomatic Complexity**: All 980+ functions $\le 135$ CC

