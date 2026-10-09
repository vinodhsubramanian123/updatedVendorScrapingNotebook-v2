# Skill and workflow execution excellence — final consolidated plan

Revision 5.36, 8 October 2026. Latest upstream7a63bc6 preserved. CP8/CP11 combined batch now independently reviewed and INTEGRATED:20runtime files+15tests/fixtures;404hashchecks0mismatches;97candidate controls reused+27main checks passed;0cycles/597files;maxCC130<=135;lint28->22with0newwarnings;430trackedprotected files unchanged. Formal11/35(31.4%) remains full-scope accounting, not a measure of integrated partial delivery. Trace/terminal-owner stay opt-in; long-query budgets/remote recovery, MCP ingress and remaining customer workflows are incomplete. No commits/publication.

Latest user requirements are mandatory acceptance extensions to existing scopes: [long-running NotebookLM, whole-solution validation, live scraping and inbound learning](2026-10-08-notebooklm-whole-solution-continuation.md). Qualify result collection after slow requests, cancellation and ambiguous remote execution, full-manifest source transport without stateless splitting, frame-aware session health during long captures, and cited cloud-to-local learning with separately validated alternate branches. Preserve existing 35-scope completion accounting; these requirements are not yet implemented or live-certified.

This revision consolidates the original Codex audit and the Gemini/Claude revisions, including Appendices C–E. It replaces their conflicting execution-order, role, parity and completion wording. The [checkpoint ledger](2026-10-04-skill-workflow-checkpoint-ledger.md) is the execution progress record. The [original evidence and 28-skill scorecard](2026-10-04-skill-workflow-audit-evidence.md) remains historical audit evidence.

Reviewed source baseline: `823725a214816c972bf1d91a4ec01db7bb76b860`. At this review's start the workspace had three untracked audit Markdown files and no tracked code changes. The apparent main/scratch paths identify one checkout: `C:/Users/latha/antigravityProjects` is a junction to `C:/Users/latha/.gemini/antigravity/scratch/antigravityProjects`. A future executor must capture a full tree fingerprint; this HEAD alone does not identify the complete tree.

Security, authentication, permissions and role hardening are outside scope. Existing delivery integrity, exact scope, transactional exports and vendor-evidence boundaries remain part of result correctness.

## 1. Outcome and scope

Make each customer request select the appropriate capabilities and complete every applicable stage, or return a precise diagnostic/draft with its unresolved requirements and next executable step. Execution must be observable from intake through terminal outcome, and past troubleshooting must improve later runs through a demonstrated consumer.

Cover all **28 repository skills**, their references and charters, customer router, canonical evaluators, dashboard/API/CLI/MCP adapters, supporting production modules, acceptance, telemetry, troubleshooting memory and learning. Personal Adobe/Figma/Airtable and other installed plugins are excluded. Graphify is a discovery dependency, not a customer presales capability.

The original inventory measured 17 router switch branches, 308 JS/TS source files under scripts/dashboard, 64,213 whitespace-delimited words in skill entrypoints, and 18 broken relative link occurrences in seven skills. These are baseline audit measurements to reproduce at CP1, not immutable denominators or proof of behavior. Appendix D's heuristic hardcode counts are also unverified triage measurements until CP2 reproduces and classifies them.

This work will not require every skill for every query, one skill per helper, a fixed number of ranks, or an invented successful outcome when facts are absent. Document grounding, local hardware checks, live vendor acceptance, delivery, learning and synchronization remain distinct evidence states.

Vendor-neutral design is included as an incremental extension. It must preserve current HPE behavior within its evidenced scope, reuse existing adapters, and expose unsupported vendor capabilities honestly. A Dell fixture demonstration does not certify live Dell ordering or a production Dell integration.

## 2. Evidence, roles and scope control

- The user approved CP0–CP2 authoring/preparation, CP3 documentation corrections and CP4 additive/unused registry, schemas and vendor interface. Forwarded Antigravity instructions authorized bounded CP5/CP6 unused contracts. The subsequent explicit approval authorizes Codex to implement and test the full remaining B0–B9 sequence using parallel isolated authors and independent reviewers. Keep this plan and the ledger current with each bounded checkpoint's exact evidence. Readiness gates remain required; commits, pushes, deployments, external messages and live publication are not implied.
- The supplied charter and 2026-09-17 handoff previously assigned testing to Antigravity/Gemini. The latest human instruction explicitly transfers testing and implementation control to **Codex** because Antigravity credits are unavailable, and expressly authorizes parallel Codex agents and independent review. This session-level instruction supersedes that prior assignment; preserve historical Antigravity receipts. Independent review remains a distinct role and is not waived by transferring tests. Single-agent checks are never labeled independent.
- Record author, independent reviewer and test executor separately. Independent review includes scrutiny of receipts, expected outcomes and unresolved scope; merely rerunning the author's assertions is insufficient.
- High-risk behavior activation requires an independent reviewer and executed affected checks. If unavailable, author an unused/shadow-only change where safe, leave it AUTHORED and do other independent work. Never call unrun checks VERIFIED_SINGLE_AGENT.
- Historical pass percentages certify their own revisions and environments only. No later implementation inherits them.
- Preserve original catalogs, receipts, sources, logs and learning histories. Never reconstruct missing historical observations or relabel old runs as production/grounded.
- Existing customer-flow tool segregation remains: Jules and engineering notebook tools are not stages of customer BOQ execution.
- No blind deletion of temporary artifacts, broad git resets, automated source-code self-modification or silent retirement of a prior knowledge source.
- JSON writes use the existing `safeWriteJsonAtomic`; atomic replacement alone does not prevent concurrent read/modify/write lost updates. Reuse appropriate owner-aware leases or serialization.

## 3. Findings and required outcomes

Source details for F01–F18 are in the evidence document. New C/H items originated in review additions and need CP1/CP2 classification; vendor words or heuristic matches alone are not defects.

| ID | Gap / required outcome | Delivery checkpoints |
| :--- | :--- | :--- |
| F01 | Single keyword track loses compound intents; ambiguity/confidence evaluated too late. Separate objective, modality, scope and requested transforms; resolve consequential ambiguity before execution. | CP7 |
| F02 | OCR route returns a descriptor instead of ingestion. Reuse canonical OCR intake once, retain source/page/row evidence and resume the objective. Verify actual media limits and GIF/TIFF support rather than promising by extension alone. | CP9a |
| F03 | Routed RFP stops at local sizing. Sufficient requirements continue into canonical evaluation; incomplete sizing remains an explicit draft. No guarantee of five ranks or cloud grounding. | CP9b |
| F04 | Workload route does not carry application requirements into completed sizing. Preserve workload/load assumptions; compose profiling, sizing and applicable arbitration. | CP9c |
| F05 | Multi route estimates without canonical per-group evaluation; CLI import side effects. Add importable facade, 2–9-node detection and quantity/owner-conserving aggregation. | CP8 |
| F06 | Cross-vendor/mixed handlers stop at partial transformation. Compose supported continuations; preserve unparsed requirements, spares and NOT_EVALUATED domains. | CP9d/CP9e |
| F07 | Uncovered routes reach TRACK_PROFILE: UNKNOWN. Classify every exposed branch and implement response acceptance distinct from candidate delivery authorization. | CP5 |
| F08 | Router trace starts after handler; returned/printed shapes differ. Start at intake; correlate children, actual invocations, ledgers and envelopes including thrown errors. | CP11a |
| F09 | Serializer finalizes ledger before reflection; lifecycle and ledger disagree. One terminal owner; artifacts recorded before phase 8 completion, reflection in phase 9, terminal response after finalization. | CP11b |
| F10 | Fabricated timings/confidence/product defaults and misleading grounding/accuracy/learning metrics. Use observed/unknown data, explicit populations and real denominators. F010 in revision 4 means F10. | CP6/CP11 |
| F11 | Rule presence/any learned delta substitutes for exact behavioral effect. Verify exact ID in exact scope with trigger, non-trigger and wrong-scope cases; preserve corrupt history. | CP12a |
| F12 | Troubleshooting stores exist but scraping reflections lack a production reader in the audited paths. Index and consume scoped lessons in intake/recovery; distinguish retrieved from used. | CP12b |
| F13 | Reflection is incomplete and failures bypass it. Reflect over all terminal outcomes, with bounded failure handling and original errors preserved. | CP12c |
| F14 | Broken paths, contradictory examples/APIs and oversized entrypoints. Validate all 28 skills and progressive references; correct examples against actual exports. | CP1/CP3/CP14 |
| F15 | Self-healing can discard intent; synthetic chaos is confused with candidate scrutiny. Preserve source requirements; separately evaluate explicit alternatives; scrutinize actual candidates. | CP3/CP10b/CP14 |
| F16 | Deal optimizer is wired but uses assumed facts/prices and a conflicting SKU role. Gate baseline, source scoped alternatives/prices and revalidate changes; missing facts mean advisory. | CP10a |
| F17 | No common skill/intents/stages/code/callers/tests mapping; concentrated responsibilities. Registry and reverse inventory, followed by justified extraction with public facades. | CP1/CP4/CP17 |
| F18 | Entrypoint contract drift and missing package.main target. Inventory consumers, make diagnostic/full modes explicit, then select a compatible side-effect-free package facade. Do not blindly replace main with router. | CP4/CP5/CP18 |

The SKU role contradiction in F16 is an **internal inconsistency**, not an independently verified vendor fact. Resolve from exact scoped evidence during implementation; neither skill prose nor absence from one catalog proves a replacement's identity or universal validity.

| Review IDs | Required outcome | Delivery checkpoints |
| :--- | :--- | :--- |
| C1 | Labeled should-trigger/should-not-trigger/near-miss prompts; confusable skills; deterministic router and host skill-loader measurements reported separately. | CP7/CP14 |
| C2 | Invocation evidence records actual capability/module/export and applicable skill fingerprint; never claim an agent read/followed a skill without observable evidence. | CP11a |
| C3 | Resolve numerical/authority drift with a fact-specific maintained source and explicit supersession; no regex-based universal document authority. | CP2/CP3/CP14 |
| C4 | Review size and move substantial conditional manuals to references; retain operational constraints. No arbitrary word cap at the expense of correctness. | CP14 |
| C5 | Label examples and their scope; verify claimed catalog examples; hardcode lint distinguishes facts/fixtures/narrative from generic decision fallbacks. | CP2/CP14 |
| C6 | Minimal clarification response names missing input, consequence, justified default if any, and blocked/allowed stages; does not assume silence authorizes consequential changes. | CP7 |
| C7 | Declarative preconditions, handoffs and completion evidence; validate paths/exports and reachable continuations. | CP1/CP4/CP14 |
| C8 | Skill/implementation fingerprints flag review-needed drift; changes do not automatically prove stale instructions. | CP14 |
| H01/H07 | Generic instructions avoid product remedies as universal rules; legitimate HPE-specific skills/terms remain scoped, readable and discoverable. | CP2/CP14 |
| H02 | Replace generic literal part/price fallbacks with evidenced scoped roles; classify missing mappings and document any intended parity change. | CP10a/CP13b |
| H03 | Vendor-specific default support/portal terminology belongs to declared vendor policy; no implicit vendor/product default. | CP4/CP13a |
| H04/H05 | Adapter grammar/classification and scoped platform data, preserving raw identifiers and compatibility facades. | CP13a/CP13c/CP16 |
| H06 | Classify arithmetic, standards, product thresholds and policy; retain derivations, units, applicability and provenance appropriate to each. | CP2/CP13b |
| H08 | Unknown/conflicting rule protocol supports local diagnosis, cited lookup, pending proposals and governed exact-effect activation. | CP12c |
| H09 | Vendor onboarding/capability conformance with Vendor X then Dell fixtures; unavailable cloud/portal remains pending. | CP4/CP15/CP16 |
| H10 | Report-only classified lint, later reviewed blocking ratchet and runtime scope checks; explicit exceptions. | CP2/CP13/CP15 |

## 4. Architecture and contracts

Keep public router and evaluator adapters. Reuse LifecycleEngine, existing schemas/evidence classes and canonical runEvaluationPipeline. Do not build a second general orchestration engine or scan all source files on each query.

### Capability registry and reverse mapping

Use a small declarative registry at `scripts/config/skill_workflow_registry.js` and existing schema facilities. Fields: capabilityId, skillPath, kind, intents/triggers, applicability, vendor/domain scope, executionMode, entrypoints, input/output schema references, requires/next, completionEvidence, coverageLimits, tests and maintainer.

Inventory every production module and every public entrypoint, including dashboard routes, CLI scripts, services and dynamic loaders. Classify as customer, operational, engineering, shared infrastructure or justified unused/deprecated. For customer modules, record capability ownership, caller chain, reachable export and verification. Multiple helpers may share one capability; shared infrastructure may have no customer skill. Record unresolved dynamic edges explicitly; static no-match is not proof of dead code. Do not import CLI modules during inventory.

Registry/path/schema validation is a dedicated maintenance check. Circular-dependency analysis remains a separate structural check; it cannot certify registry contracts.

### Intake plan and result

Plan fields: traceId, request/parent correlation, primaryObjective, inputModality, secondaryTransforms, explicitRequirements, resolved vendor/product/generation/domain scope, owner/allocation/quantity basis, stage dependencies, expected receipts and pending agent-assisted work.

Keep existing exports, flags, route/tool names, legacy result fields, diagnostic dispositions and process exit behavior compatible through adapters. Add a versioned result envelope with executionStatus, responseDisposition, independent localValidation/documentGrounding/portalAcceptance/delivery/learning/sync states, unresolved requirements and evidence references. Specify mappings to current status/ERROR/ACTION_REQUIRED fields; unknown enums and null values must not crash old consumers.

A shared run correlation does not require every cluster to reuse one evidence-ledger ID. Use one root trace/correlation and unique child execution/ledger identities with parent links, so group records cannot overwrite each other. Output fingerprints distinguish original input, normalized input, requirement set and each candidate manifest.

### Trace and terminal ownership

Initialize evidence before classification/dispatch, including unreadable input and unknown scope. Record planned vs started vs completed vs failed/pending stages, invocation identity, duration measurements and artifact/receipt references. Persist or disclose persistence failure; in-memory success cannot masquerade as durable evidence.

Orchestration owns phase transitions and terminal response. Serializer writes/checks authorized artifacts and returns references; it does not independently finish reflection or emit a premature final envelope. Under INV-144, all required deliverables, including analysis report, are recorded before phase 8 completes; phase 9 handles reflection. Post-terminal telemetry/evidence references are additive sidecars so a terminal record does not require circular self-hashing.

An unbuildable diagnostic is ACTION_REQUIRED with DELIVERY_BLOCKED_UNBUILDABLE, not a fatal engine exception. Failed cloud review, sync or reflection remains visible without destroying valid local diagnosis. Cancellation must be terminal and preserve partially completed evidence.

## 5. Customer workflow composition

All applicable paths have intake tracing, scoped recovery-memory lookup when relevant, response acceptance and terminal reflection. Do not force portal, export or learning activation into an ordinary Q&A.

| Request | Required composition | Honest completion boundary |
| :--- | :--- | :--- |
| Technical Q&A / comparison | Resolve exact or portfolio scope → local/cited retrieval → answer/profile checks | Cited vs unknown distinguished; no fake BOM/export; offline advisory allowed |
| Pricing/history/lifecycle | Resolve requested products/SKUs → dated observations → price/lifecycle response checks | Missing history/price/orderability explicit; no invented Active status |
| Existing BOQ | Ingest → scope/freshness → ownership/quantity normalization → canonical domain/graph/candidate checks → available grounding → applicable portal continuation → response/delivery gate | Useful offline diagnosis; final live acceptance requires exact current manifest receipt |
| Scanned quote / two scans | Validate media → canonical OCR once per source → page/row/confidence preservation → resume intended evaluation/reconciliation | Empty/ambiguous extraction blocks affected stages; unsupported format explicit |
| No-SKU RFP | Capture requirements/units/unknowns → scoped roles/sizing → canonical evaluation when executable | Incomplete draft stays draft; ranks/grounding only when actually evidenced |
| Application sizing | Preserve application/load/SLA assumptions → workload constraints → sizing/arbitration → canonical candidate checks | Hardware checks do not certify application performance |
| Multi-node/multi-sheet | Ingest every group/configuration → scoped split/allocation → canonical evaluation per group → facility constraints → aggregate | Quantity conservation; multiplier once; unknown site limits remain unknown |
| Two-baseline reconciliation | Preserve both baselines → owner/SKU/quantity/price comparison → substitutions/gaps → requested remarks/export | Structural vs financial parity separate; original cells and quantity bridges retained |
| Single-file audit | Audit quote against scoped evidence without inventing a requirement baseline | isTwoBaselineComparison false; no fake missing-customer-items metric |
| Cross-vendor conversion | Explicit source/target scopes → preserve source requirements/unparsed gaps → supported target sizing → target evaluation → parity report | No fabricated equivalent/performance; partial supported conversion stays partial |
| Mixed domains / loose parts | Classify owned roles → conserve source rows → authorized carrier allocations → supported domain/containment checks | Spares not silently installed; unknown domain NOT_EVALUATED |
| Budget/value engineering | Baseline validation → explicit customer constraints → scoped alternatives/price basis → changed manifest evaluation → comparison | Invalid baseline gets diagnosis first; missing price advisory; list-price vs quote savings distinguished |
| Least-delta / candidate scrutiny | Actual conflict roots → requirement-preserving proposals → actual candidate checks/ranks | Synthetic test evidence is never candidate acceptance |
| Remarks/export | Reuse only matching fingerprints → requested row/dialect checks → applicable authorization → transactional generation | Reconciliation vs portal dialect distinct; generation and live acceptance distinct |
| Feedback/recovery/sync | Observe → classify lesson → governed validation → exact applicability/effect → local/cloud sync/readback if requested/applicable | Pending proposals pending; operational incidents separate; no forced new lesson every run |

Registry defines the exact capability sequence and required evidence for each supported variation, including compound requests such as reconcile + remarks + export and workload + budget. Live BOQ selector manipulation remains agent-assisted where the existing runtime procedure says so; no claim of unattended automation from a planned stage.

## 6. Checkpoints, dependencies and concrete exits

**CP0–CP18 are the single execution sequence source.** The earlier 11 phases are retained only as grouping names below. Appendix D/E cannot introduce a competing phase order. IDs are stable for existing ledger references; named subcheckpoints are mandatory for large concerns.

| Group | Checkpoints in dependency order |
| :--- | :--- |
| Baseline and discovery (Phase 0) | CP0, CP1, CP2 |
| Contracts and early docs (Phases 1/8) | CP3, CP4, CP5; additive CP6 |
| Planning and execution evidence (Phases 2/5) | CP7, CP11; activate CP6 after terminal evidence exists |
| Customer composition (Phase 3) | CP8, CP9a–CP9e |
| Factual decisions and learning (Phases 4/7) | CP10a–CP10b, CP12a–CP12c |
| Vendor neutrality and skill contracts (Phases 8/9 plus D) | CP13a–CP13c, CP14, CP15, CP16 |
| Cohesive extraction and release (Phases 9/10) | CP17, CP18 |

### CP0–CP3: freeze, inventory and non-runtime remediation

**CP0 targets:** source/config/fixture revision manifest, characterization fixtures and evidence, protected-tree snapshot. Record HEAD, branch, staged/unstaged diffs, every relevant untracked/ignored input and hash. Account for existing audit documents; do not demand a clean tree by deleting user work. Resolve junctions/aliases before choosing the workspace. These main/scratch paths need no sync. A later genuinely separate checkout must have an explicit handoff/parity check before changes are copied; no automatic bidirectional sync.

Codex captures representative valid/unbuildable BOQ, reconciliation, Q&A, catalog history, multi-cluster and diagnostic/authorized-export scenarios in disposable isolated workspaces under the latest human testing assignment. Missing live environments stay pending. Preserve raw outputs plus semantic goldens and comparison policy. The runner uses `outputs/history`; process isolation alone does not isolate filesystem writes. Audit write/external-call paths before running; copy fixtures/configs and block live publication in characterization. If safe isolation is unavailable, CP0 is incomplete and behavior work waits.

**CP1 targets:** `scripts/maintenance/audit_skill_workflow_coverage.js`, reports and inventory schemas as needed. Enumerate skills/references/frontmatter, production source, entrypoints, exports/callers/tests; resolve links relative to each referring file, including fragments and actual supported path forms. Do not globally prepend three levels: nested references need their own base. Record reachable customer chains, dynamic uncertainties and absent mappings. Reproduce audit claims and denominators.

**CP2 targets:** a reusable maintenance lint/report and classified baseline. Report literals/grammar/price/unit facts with rule IDs and file locations; distinguish legitimate vendor modules, examples, tests, generators, named standards and algorithmic constants. Ratchet by classified violations/new unlisted sites, not raw regex count. No CI blocking or runtime change yet.

**CP3 targets:** affected skill/reference links and fact-specific contradictions. Pure paths/typos separate from semantic self-healing/trigger edits. Fix the fleet power example with units; distinguish installed nameplate, usable redundant capacity and actual/estimated draw. Correct APIs/anchors against source. Exit: reproducible inventory, safe baseline receipt, zero unresolved broken links in changed scope, no unsupported factual repair.

### CP4–CP6: additive contracts before activation

**CP4 targets:** registry, `scripts/lib/system/schemas.js`, adapter interface and public-contract inventory. Reuse `scripts/lib/scraper/vendor_scraper_adapter.js`, `scripts/lib/scraper/vendor_portal_router.js`, `scripts/lib/taxonomy/vendor_agnostic_schema.js`, profiles/configs and LifecycleEngine. Registry remains unused initially. Validate cycles/contracts/entrypoints without executing CLI imports. Inventory package.main consumers and intended package API; choose a side-effect-free compatible facade in a named subcheckpoint, not an arbitrary router switch.

**CP5 targets:** `scripts/lib/boq/bom_verifier.js` response profiles and result adapters. Account for every current router branch, including catalog, OCR intake, workload, multi, conversion, mixed planning, remarks and diagnostics. Initial proposed profiles include CATALOG_INTELLIGENCE, HETEROGENEOUS_PLANNING, CROSS_VENDOR_CONVERSION and DIAGNOSTIC_ADVISORY; finalize names from actual route contract. Draft/diagnostic response validity cannot grant workbook delivery authorization. Unused profiles first, independent checks before activation.

**CP6 targets:** `scripts/lib/system/telemetry.js`, persistence readers and dashboard metric consumers. Add schemaVersion/runKind (PRODUCTION/TEST/FIXTURE/DEMO/UNCLASSIFIED), per-field measurement status, affirmative grounding and terminal evidence references. Historical unknowns remain UNCLASSIFIED. Remove manufactured confidence, timings, product and rule counts on activation. Separate confidence coverage from independently adjudicated accuracy; learned deltas means new deltas this run, not total registry size. Explicit eligible/observed/unknown denominators accompany rates. Concurrent write verification checks lost updates, not only valid JSON. Schema additive first; terminal metric activation follows CP11.

### CP7 and CP11: plan without side effects, then trace reliable execution

**CP7 targets:** `scripts/evaluators/route_query.js`, supporting pure planner and registry. Separate objective/modality/transforms and preserve the actual legacy `context.intent` overrides. `explicitTrack` is not a supported alias and must not be invented. Labeled cases cover confusable pairs, question-style Q&A, 2–9 nodes, portfolio comparison and compounded intent. Confidence is an ambiguity policy signal, not correctness probability; maintain INV-73's consequential-ambiguity requirement and document the 0.80/0.85/0.95 distinctions. A numerical heuristic alone cannot authorize execution. Report-only planner shadow returns the old result and logs plan differences without calling handlers twice.

Execution split: CP7a authors/tests the unused pure planner and expected plans; CP7b integrates only independently verified report-only shadow after CP0/CP6r readiness. Active consequential-ambiguity handling/composed dispatch is a separately named CP7c scope and enabled only for a path whose CP11 and applicable continuation receipts are complete. CP7a/CP7b acceptance does not authorize all new routes. Preserve the 16 actual early `context.intent` overrides and legacy call/result contracts; OCR is a modality hint rather than a new override.

**CP11a targets:** router, canonical evaluator, evidence/logging context and adapters. Create root/child identities at entry, persist failure/cancellation paths, record actual invocations and normalize compatible envelopes.

**CP11b targets:** `scripts/evaluators/eval_boq.js`, `scripts/lib/boq/eval_output_serializer.js`, LifecycleEngine/evidence boundaries and delivery adapters. Keep transactional authorization/export checks unchanged while moving terminal ownership. Artifacts/analysis report complete in phase 8; phase 9 reflection runs next; ledger health and final envelope follow. Test planned delivery blocks vs fatal errors, reflection failure, export failure and cancellation. Before/after trace fingerprints are a registered intended difference; no false phase PASS. Independently verify before any new continuation activation. Then complete CP6's terminal telemetry activation.

CP11 follows CP7's verified planning/shadow foundation before CP8/CP9 continuation work. CP11 initially delegates to existing handlers; it does not require unfinished OCR/sizing/conversion continuations. CP6b is the separately recorded telemetry activation after CP11b, with explicit producer run kinds, measured observations, compatible readers/dashboard and raw-preserving migration. New metrics must not be enabled merely because unused CP6 schemas passed.

### CP8–CP9: close every incomplete customer handoff

**CP8a targets:** `scripts/evaluators/eval_multi_boq.js` and importable multi engine/facade. CLI flags/exit/result fields retained; import has no execution/process.exit. CP8b connects `multi_cluster_splitter.js`, grouped canonical evaluation and facility aggregation. Reuse existing Hamilton/Hare allocation if applicable; do not require it for every already-homogeneous group. Exactly-once quantity scaling, owner conservation and distinct group evidence are mandatory.

**CP9a:** router/canonical ingestion/`scripts/lib/ocr/ocr_service.js`; one OCR invocation, provenance, ambiguous/empty OCR and downstream two-baseline/single-audit semantics. Do not bolt a second OCR path onto already-capable intake.

**CP9b:** RFP synthesis continuation into runEvaluationPipeline when scope/requirements are resolved; no unsupported extra rank or cloud guarantees.

**CP9c:** `scripts/lib/conflict/workload_dna.js`, sizing and resource arbitration; carry application constraints and bounded assumptions into resulting candidates.

**CP9d:** `scripts/lib/boq/cross_vendor_transformer.js` and router; supported source/target conversion plus full target evaluation and explicit parity gaps.

**CP9e:** `scripts/lib/boq/heterogeneous_tender_modernizer.js`, domain/containment validation and router; authorized allocations/ownership, explicit spares and unknown profiles. Each subcheckpoint has its own fixtures, independent receipt and rollback. Binary inputs compose ingestion first. Exit means supported paths execute and unsupported paths explain exactly what remains.

### CP10–CP12: factual alternatives and demonstrable learning

**CP10a targets:** `deal_optimizer.js`, `budget_optimizer.js`, evaluator and scoped price lookup. Enforce clean baseline/workload/spec restrictions before optional deal optimization; invalid baseline receives diagnostic alternatives with no certified-savings claim. Select remedies by evidenced roles/attributes, build complete changed manifests and revalidate. Preserve currency, region, quantity, tax/discount assumptions, observation date and quote-vs-list basis. Historical catalog list price is not automatically a current customer quote. Missing prices yield UNPRICED_OPPORTUNITY.

**CP10b targets:** `adversarial_agent.js`, candidate validators and output/adversarial skills. Actual candidate scrutiny verifies unsupported substitutions, ownership, dependencies, requirements and evidence. Synthetic chaos separately tests engine robustness; retain existing diagnostic helper compatibility and truthful mode labeling.

**CP12a targets:** `continuous_learning_verifier.js`, registry activation/rule consumer. Stages: observed/proposed/validated/active/discoverable/applicable/applied/effect-verified. Exact rule and exact catalog directory; expected rule-specific effect and non-effect controls. Workflow advisory rules require proof at their named planning/recovery consumer, not fabricated hardware graph changes. Corrupt registries/history are preserved/quarantined, never silently replaced with empty success.

**CP12b targets:** existing scraping reflection writer, indexed reader and scoped intake/recovery hooks in navigator/scraper/evaluator as applicable. Incident record includes symptom, attempted actions, root-cause confidence, exact scope, revisions, receipts, resolution/unresolved state and supersession. Record retrieved lesson IDs separately from used IDs and observed recovery outcome. Repeated-incident fixtures prove use changes the appropriate recovery decision without contaminating another scope.

**CP12c targets:** terminal reflection and unknown-rule recovery. Runs may produce a valid no-new-lesson record. Separate OPERATIONAL_INCIDENT, WORKFLOW_ADVISORY and hardware rule proposals. Reflection is bounded/idempotent per run/stage; preserve original failure if reflection also fails. Record terminal observation after actual outcome; do not activate hardware rules or edit source code from repetition alone.

### CP13–CP16: vendor scope without a rewrite of everything

**CP13a:** adapter-backed HPE grammar/policy via public facades; current unspecified-only 3-year Tech Care Basic behavior preserved. Unknown identifiers retained raw. CP13b migrates generic decision fallbacks/mandatory-role mappings/constants using provenance and supported-product parity. CP13c migrates profile data while preserving `scripts/lib/rules/platform_profiles.js` consumer API. Data movement and semantic changes occur separately.

**CP14:** all 28 skill entrypoints/references/charter cross-links. Per-skill contract: trigger and likely exclusion, required inputs/scope, actual entrypoints, preconditions, steps/optional branches, outputs/evidence, failure/recovery, continuation and references needed by mode. Include engineering/Jules/orchestrator/frontend capabilities but keep them outside customer routing where appropriate. Description and body remain host-supported; fingerprints flag review-needed drift. Preserve HPE-specific skills as HPE-specific, rather than removing meaningful portal/model words.

**CP15:** synthetic Vendor X adapter and fixtures, grammar/support/glossary/category mapping and declared capability checks. Assert no leaked HPE remedies/defaults in normalized generic decisions. Provenance and explicit cross-vendor comparisons may legitimately name source vendors. Missing notebook/portal is an honest unavailable state; a fixture end-to-end diagnostic is not a delivered Tier 3 solution. Activate reviewed hardcode/doc ratchets only after false-positive/allowlist validation.

**CP16:** Dell fixture adapter and conformance using existing assets first. Fixture/model/domain scope is explicit. Real scraping, notebook onboarding and vendor receipts are separately identified pending work; they do not block early HPE repair or falsely certify production Dell support.

### CP17–CP18: maintainability and final verification

**CP17 targets:** responsibilities in route_query, eval_boq, boq_evaluator, build_catalog, eval_output_serializer, navigate_oca and strategy_synthesizer. Extract only where cohesion/callers justify it. Preserve facades; do not create one skill per helper. Early small extractions necessary for importable/pure boundaries belong to their checkpoint, not a duplicate late rewrite. No move-plus-logic change in one diff. Measure complexity per function/module, cycles, interface parity and ownership before/after.

**CP18:** execute the scenario matrix and final regression on the actual final working-tree fingerprint; dashboard build, lint/core lint, complexity and circular checks. Refresh graph after significant code changes as required by the charter. Graph-generated files are explicit allowed artifacts, not evidence of runtime correctness. Record all F/C/H dispositions and residual live limits in the ledger/continuation. Separate deterministic engineering release verification from live product/vendor completion.

## 7. Verification and checkpoint release gates

Every subcheckpoint declares inputs/files, dependency receipts, metric, intended differences, allowed writes, tests and rollback **before authoring**. Its receipt includes HEAD plus tracked/untracked tree hashes, command, environment/dependencies, fixture/catalog versions, scenario IDs, suite/test counts, exit code, duration, logs, author, executor and independent reviewer. Adding uncommitted files requires hashes, not a misleading same-HEAD claim.

Authoring may proceed unused while checks are queued; behavior activation/cutover cannot. High-risk changes pass pure/offline shadow or isolated replay, independent affected checks, then cutover; old-path deletion occurs only in a later independently verified subcheckpoint.

### Scenario families

| ID | Cases | Assertions |
| :--- | :--- | :--- |
| S01 | Known/unknown product Q&A; workload question; portfolio/cross-gen comparison | Correct objective/scope; unknown not defaulted to DL380; no accidental BOM |
| S02 | History with/without SKU; absent history; unquoted/zero price | Dated facts, pricing gaps, no invented lifecycle/availability |
| S03 | Valid/unbuildable BOQ; ambiguous text; missing/corrupt file | Canonical diagnosis; ACTION_REQUIRED planned block; evidence for fatal failures |
| S04 | One/two scans; ambiguous/empty OCR; supported/unsupported media | Real OCR once; provenance; resumed objective; precise blocked intake |
| S05 | Sufficient/incomplete RFP; application sizing | Complete handoff or honest draft; workload assumptions retained |
| S06 | 2/9/20 nodes; mixed sheets; configs per sheet | Every group accounted; ownership and multiplier once; facility unknowns visible |
| S07 | Reconcile + remarks/export; workload + budget/export | Requested transforms retained; required prerequisite order |
| S08 | Single audit vs two baselines; substitutions; price gaps | Honest baseline mode; structural/financial distinction; original cells |
| S09 | Cross-vendor/mixed domain/spares/unsupported profile | Supported evaluation; no dropped requirements; no unauthorized installation |
| S10 | Budget on invalid/valid baseline; unknown prices/remedies | Correct gating; advisory vs savings; changed manifest checked |
| S11 | Real candidate scrutiny vs synthetic chaos | No synthetic PASS inherited by customer candidate |
| S12 | Offline/stale/cloud timeout/degraded notebook | Useful local result; no fake cloud/portal success |
| S13 | Conditional SKU; pending agent-assisted validation; stale/changed receipt | Exact restored scope/manifest/selectors; current receipt only |
| S14 | Export/publish/sync/reflection failure; cancellation | Trace/terminal parity; partial artifacts not delivered; original error retained |
| S15 | Repeated incident; exact learned trigger/non-trigger/wrong scope | Scoped memory consumed; exact effect; history continuity |
| S16 | Production/test/demo/unclassified telemetry; concurrent writes | Real denominators; no fabricated accuracy/timing; no lost updates |
| S17 | JS/CLI/dashboard/MCP; diagnostic/full; import only | Compatible fields/options/exits; no side-effectful import; diagnostic mode truthful |
| S18 | Vendor X/Dell fixtures; supported HPE generations; rename/scope mutation | Declared capabilities, limited metamorphic invariants, no silent cross-scope fallback |
| S19 | Session interruption/lease contention; resume; stale ledger | Single writer, accurate tree, owned rollback and explicit pending checks |

Use the canonical runner, not ad hoc customer evaluation scripts:

- `npm run test:isolated -- <actual-test-file>` for targeted suites.
- `npm run test:domain -- <domain>` for affected coverage. Valid current domains: aspects, boq, scraping, sync, catalog, conflict, guardrail, **router**, core, smoke.
- `npm run test:matrix` for the final integrated matrix, with live E2E separately pending if unavailable.
- `npm run build`, `npm run lint`, `npm run lint:core`, `npm run lint:complexity`, `npm run test:circular` for final engineering checks, targeted as relevant earlier.

These commands were checked against source/package configuration, **not executed** in this review. Do not invent a failure-transactions domain: use discovered suite paths or the full runner. Isolated means per-process in the current runner; use a disposable checkout until filesystem/network isolation is verified. Discover and record actual suites; nonempty tests and explicit live skips apply. Domain totals overlap and must not be added as unique-suite counts. Intentional suite reorganizations require an old/new discovery manifest so fewer suites do not silently disappear.

Acceptance combines characterization parity with corrected-behavior scenarios. Goldens preserve existing behavior, including known bugs; registered corrections require new expected outcomes rather than reproducing a bug indefinitely.

## 8. Review disposition and document provenance

The Gemini/Claude additions are retained where useful: trigger tests, invocation records, scoped hardcode inventory, vendor interfaces, unknown-rule handling, independent receipts, progressive skill references and resumable bounded execution.

The following revision-4 proposals were corrected:

| Proposal | Final disposition / reason |
| :--- | :--- |
| Static endorsement implies 100% buildability, all owners clear, or racing behavior already resolved | Withdrawn; these remain implementation outcomes requiring receipts |
| Token availability automatically reassigns testing | Current charter's Antigravity/Gemini assignment retained; authors/reviewers may vary |
| Freeze requires a clean working tree | Accounted manifest includes existing untracked/user files; never remove them for cleanliness |
| Byte-for-byte golden output is universal parity | Raw retained; semantic comparison and allowed volatility specified; artifact contents verified |
| Shadow executes new workflows alongside old | Only pure planning or isolated replay; production/external mutations never duplicated |
| Human-readable lease enforces single writer | It is advisory; actual live-process owner-aware acquisition required |
| Protected files checked only through git status | Hash tracked/untracked/ignored relevant data; git status misses ignored writes and external mutations |
| Revert checkpoint on any failure | Stop, retain evidence, distinguish transient/baseline failure, revert owned mutations safely where indicated |
| Every generic skill/file must omit vendor words/numbers | Classify decision logic; legitimate scoped skills, adapters, examples and standards remain |
| Any renamed SKU/product label must produce byte-identical outcomes | Limited semantics-preserving mutation with reverse mapping; regenerated receipts/fingerprints; grammar/source identity not erased |
| NotebookLM automatically outranks official documents | Authority is claim/evidence-specific; report conflicts and preserve scope/date; notebook is retrieval, not ordering authority |
| package.main must point to router | Consumer/side-effect audit first; compatible safe facade selection |
| CP8/9 before reliable tracing; workload/mixed paths missing | CP11 prerequisite added; CP9c–e explicit; CP10b candidate scrutiny explicit |
| Findings can close from a lint count or static plan review | Only independently verified required scope closes; all runtime findings remain open |

Input document hashes, before consolidation (both path aliases read the same files):
- Plan SHA-256: `7e20e23ffeb7186d0406b1206f3561d42e40d848468b0564f1709bde3d732f6f`.
- Ledger SHA-256: `06cdb88b64ecea4997f96831954929a43b6a12bfa5cb572537375af142309168`.

Read-only graph discovery and focused source inspection checked the invariant threshold/phase-8 contract, actual router exports, runner domains/side-effect paths, package scripts/main, existing vendor adapters, profile location and lease implementation. `scripts/lib/rules/platform_profiles.js` is the actual profile path. Existing vendor scraper adapters advertise row normalization and **portalExtraction: false**; reuse does not imply working vendor extraction. Circular analysis checks imports/cycles, not capability registry semantics.

At revision-5 plan handoff, only this plan and its ledger were revised. Both path aliases expose the same documents; revision 4 was superseded in place. The original evidence document was retained. No implementation or tests ran during that review. Subsequent approved CP0–CP2 authoring is tracked separately below.

### Execution update — CP0–CP2, 4 October 2026

The following is the original Codex authoring record. Its pending-verification status is superseded by the separately attributed Antigravity receipt below; its original protected-tree check still describes that session only.

- Scope: accounted baseline preparation; unused maintenance coverage/link and hardcode auditors; report-only output; meaningful auditor fixtures for the assigned verifier. No business-module changes or CI activation.
- Pre-authoring receipt: `outputs/history/skill_workflow_excellence/2026-10-04/cp0-baseline-pre-authoring.json`, created with `safeWriteJsonAtomic`. Captures HEAD/branch/status/diffs, 3,339 input hashes and 2,630 protected output/config hashes including ignored files. Input fingerprint `c5f9f8fcb65010782dab70173f9711de157825c82d6ad64f9493b52316d20159`; protected fingerprint `454959d62d1d1617f796e51860fab0a5338d8e11d13bd1ed1d8082ca5ea3fd51`.
- Allowed writes: this plan/ledger; new maintenance auditors and their helpers under `scripts/maintenance/`; dedicated auditor fixtures/tests under `tests/`; reports only under `outputs/history/skill_workflow_excellence/2026-10-04/`; owner-aware maintenance lease metadata under `.git/codex-maintenance-locks/`; graph artifacts if significant code additions require refresh. Existing `scripts/config/`, business code and other output records stay unchanged.
- CP0 characterization/golden receipt and independent CP1/CP2 checks remain assigned to Antigravity/Gemini. Until present, CP0 is incomplete. Unused audit tooling may be authored under Section 7; no behavior activation or finding closure is permitted.
- Tool design decisions: parse source statically without importing customer/CLI modules; record unresolved/dynamic edges instead of declaring false orphans; resolve each Markdown target from the referring file; lint classified decision candidates, with explicit exceptions and no blocking behavior.
- Authoring outcome: three maintenance CLIs, four focused helpers and eleven isolated verifier fixture cases authored. Detailed scope, commands, rollback and pending verification are in [the CP0–CP2 handoff](2026-10-04-skill-workflow-cp0-cp2-handoff.md). No customer/business module, package/config, runtime dispatch or CI behavior changed.
- Final CP1 observation: 28 skills / 37 Markdown documents / 64,213 entrypoint words; 315 production modules (308 original + seven additions), all parsed; 208 test modules; 18 missing file links; one dynamic require; one missing package-main target. No unexplained customer no-entrypoint candidate after honoring the existing deprecated declaration. Static mappings remain candidates, not runtime coverage.
- Final CP2 observation: 574 files, 15,139 heuristic hits. Includes 7,295 test/fixture occurrences and 3,978 generic-decision candidates. All require semantic triage or explicit exception review; no blocking ratchet or independently established violation count. Different scan scope means these totals do not replace Appendix D's earlier regex counts as comparable measures.
- Final author static observations: eight files syntax-clean; targeted offline lint zero warnings/errors; zero circular dependencies; repository maximum CC 130. Source fingerprint for the eight additions: `4387cec7027d480cde41f5198f67ea3ae1f31dea1ae369d1dd2a847ce2ecd7fa`. No behavioral tests or goldens ran. Draft warnings and a Markdown-fence false positive were corrected and earlier reports retained.
- Protected-content check: all 2,630 original output/config records unchanged. Fingerprints now use canonical code-point path ordering to match the freeze; prior locale-ordered aggregate differences were serialization differences, not content changes. Code graph refreshed; semantic documentation refresh remains a separate graph workflow.
- CP0 goldens and CP1/CP2 independent receipts remain pending. All 36 F/C/H findings stay open. CP3 and later behavior changes are not started. The first next action is assigned Antigravity/Gemini characterization/fixture execution and independent review, not another planning cycle.

### Assigned verification and CP3 update — 4 October 2026

- Antigravity reported 11/11 auditor fixture tests passing (0.77s), router 4/4 suites (19.74s), aspects 16/16 suites (42.31s), dashboard lint 0 warnings/errors, 0 circular dependencies and maximum complexity 130. Its ledger marks CP1/CP2 `VERIFIED_INDEPENDENT`. The user supplied this handoff and approved CP3 only. Codex rechecked all eight source hashes against the original source receipt: zero mismatches. The reported tests are attributed to Antigravity; Codex did not rerun them or inspect a separate raw test-log bundle.
- CP0 still lacks canonical golden outputs. Independent CP1/CP2 verification does not fill that gap. No customer behavior activation is authorized here.
- CP3 pre-edit freeze: `cp0-baseline-2026-10-04T13-34-32-061Z-22412.json` under the maintenance report directory. Input fingerprint `992262ec62ebca4ed23721839bcdbf7d3a08e7bb2ae54c5573bef99f9429d279`; protected fingerprint `3f3b22ffb04ec2b57f7486a84b338ae4ca50f02353847e72f250554f304262ff`; 3,350 inputs / 2,632 protected files. Its tool-generated CP0 label means baseline preparation, not completed CP0. It includes Antigravity's pre-existing test-ledger update; preserve that update. Original bytes for the nine skill files and plan/ledger are saved in `cp3-pre-edit-documents.json` for bounded rollback.
- CP3a (Low): repaired 18 Markdown link occurrences in seven skills, including the optimizer's incorrect directory. Current static audit: 28 skills / 37 Markdown documents / 185 link occurrences / **0 broken paths or fragments**, versus 18 broken occurrences before. This proves file-relative resolution, not correct dispatch or runtime use.
- CP3b (Medium): clarified raw rack count versus assumed site reserve, installed PSU nameplate versus nominal redundant capacity versus unknown actual draw, and removed unsupported training-load estimates from worked examples. Explained the router's 0.95 charter target / unsupported former 0.85 gate / implemented post-handler < 0.80 indicator. Pre-dispatch ambiguity enforcement remains F01/CP7; runtime facility continuation remains F05/CP8. Vendor examples remain illustrative and unverified.
- Exact allowed writes: nine `SKILL.md` files listed in [the CP3 handoff](2026-10-04-skill-workflow-cp3-handoff.md), this plan/ledger, that handoff and maintenance receipts. No code/test/package/config edits, external actions or commits. Static diff and content checks show no change outside this scope; protected content matches the CP3 freeze. Entry-point words are now 64,536 (clarifications added), not a skill-size reduction claim.
- CP3 is `AUTHORED`, with separate independent link and semantic review pending Antigravity. No full F/C/H finding closes. F15's intent-discarding self-healing and synthetic certification remain for CP10b/CP14, outside this narrow CP3 authorization. Broader hardcode/vendor capability assertions remain open for their mapped checkpoints.
- Next: Antigravity independently reviews the CP3 diff and receipts, records its exact source-bound acceptance, and completes the missing CP0 isolated goldens. Future CP4 unused authoring may follow its declared dependencies and authorization; runtime activation must wait for verified baselines. No new behavior-changing checkpoint has started.

## Appendix D — Final vendor and knowledge contract

### CP3 verification and CP4 execution update — 4 October 2026

- Antigravity's ledger and the user report confirm CP3 independent acceptance: 18 → 0 broken links, CP3b arithmetic/policy reviewed, router/aspects 20/20 suites passing. Original CP3 authoring records above remain historical. CP0 isolated goldens are still missing; CP4 is explicitly authorized as unused code.
- Pre-edit freeze: `cp0-baseline-2026-10-04T14-15-25-209Z-9100.json` under the existing maintenance report subtree; 3,356 input / 2,637 protected files. Input fingerprint `6ea05ebbd5544bd7d608914dd4d34ca3244fba98fdfbc75d542c8cf4940df647`; protected fingerprint `5188ef875933e9a3ca297d56af91cefb352c8ecf986ce4e6c7471c83d2dcda77`. Original schema/plan/ledger bytes saved in `cp4-pre-edit-documents.json`. Preserve all pre-existing CP3 edits and Antigravity's test/history changes.
- CP4 authoring: immutable declarative registry for 28 skills, 17 current route intents, scoped applicability, actual static entrypoints, proposed handoff schema refs, conditional prerequisites/continuations, expected evidence and explicit coverage limits. Six opt-in schemas appended to the canonical module; all original definitions and 23 legacy export names/order preserved. Vendor interface declares identifier, role/category, glossary, unspecified-only support policy and optional portal capabilities; no vendor implementation/policy migration or live support claim.
- Added a maintenance-only registry/schema/path/export/DAG validator plus public/reverse inventory. Static receipt: 31 referenced export files checked; 0 contract issues / 0 runtime registry consumers; 318 production modules inventoried, 196 static capability candidates / 122 without a declared dependency path. Those 122 require classification/review, not blanket orphan labels. Public inventory contains 173 package/CLI entry records, 59 local HTTP bindings, 60 CLI-flag literals, 12 MCP declarations and one unresolved dynamic edge. Local mount/signature semantics and actual invocation remain unverified; the missing package.main is preserved for a named facade checkpoint.
- Source-bound receipt: `cp4-registry-2026-10-04T14-37-24-285Z-24812.json`; five-file fingerprint `9f57e4f2b6ad03cce2c392fed3072f56b1132539b206634911f76f704e0be06f`. Source/schema semantics, import safety and public compatibility require independent scrutiny; static mapping is not an end-to-end execution receipt.
- Static checks: five files syntax-clean, 0 source cycles across 523 files, maximum repository CC 130 across 314 files / 1,349 functions. Targeted lint has 0 new warnings and one unchanged legacy warning at schemas.js:23 (`no-useless-escape`); reproduced against saved original bytes. It is not a new regression and is not silently described as zero total core warnings. Original runtime modules/package/config records are unchanged, except the explicitly authorized addition `scripts/config/skill_workflow_registry.js`.
- Twelve meaningful reviewer fixture cases authored (schema/path/export/dependency failures, unknown scope, adapter method declarations, import side effects, static public bindings and no runtime consumption). **None executed by Codex.** Antigravity/Gemini remains the test executor, including disposable-process imports and affected legacy-schema regression checks. No new registry consumer or package export is activated.
- Allowed writes: registry; additive canonical-schema hunk; `scripts/lib/contracts/vendor_adapter_contract.js`; `scripts/maintenance/validate_skill_workflow_registry.js`; `tests/unit/test_skill_workflow_registry_contracts.js`; this plan/ledger and [CP4 handoff](2026-10-04-skill-workflow-cp4-handoff.md); named maintenance reports and required generated graph artifacts. Protected comparison permits only the named registry addition; existing protected files must match the CP4 freeze. Code graph refreshed; semantic doc labels/review remain separate.
- CP4 remains `AUTHORED`, independent verification pending. No complete F/C/H finding closes. Next is Antigravity's CP4 fixture/import/legacy-contract review with exact-source receipts; no CP5 or behavior-changing implementation started. CP0 goldens remain required before behavior activation.

### D1. Boundaries and locations

1. Generic algorithms/schemas decide by role, attribute, predicate and declared scope. They may name architectural standards or express universal arithmetic where meaningful.
2. Vendor adapter **data/config** lives at `scripts/config/vendors/<vendor>/`. Executable adapter strategies use the existing library structure (for example scraper/catalog/rules subdirectories), with small compatibility facades; do not put substantial behavior into config. Adapter owns grammar, glossary, category mappings, unspecified-only support policy and declared capabilities.
3. Product facts stay under the canonical `outputs/{Family}/{Gen}/{Model}/` resolver with explicit vendor metadata. Audit possible cross-vendor directory collisions before onboarding; define a backward-compatible resolver extension if necessary, never silently share a directory.
4. Universal arithmetic/standards references live in one cited/derived maintained rule resource with units, conditions and provenance. Arithmetic identities need a derivation, not an invented vendor citation; policy heuristics must be labeled configurable assumptions. New substantive rules need an independent review and computed fixture.

Product facts never fall back to another vendor/gen. Existing historical profile observations are classified and retained during migration; they do not become current ordering facts simply by moving to JSON. Applicable conditional runtime evidence may supplement a catalog miss: NOT_IN_CATALOG does not mean unsupported, and hidden visibility alone does not prove mandatory compatibility.

### D2. Unknown/conflicting evidence

Local catalog/rules and exact product scope first; retrieve the product's structured NotebookLM/vendor citations when needed and available; consult official vendor documents for unresolved factual questions. Preserve source date/version/applicability and report conflicts. Scope/date/current authority determines whether information is superseded; never silently treat retrieval order as authority order.

Unavailable cloud must not crash or prevent useful local diagnosis. Unsupported facts yield NOT_EVALUATED/UNVERIFIED with a precise gap. Proposals stay PENDING until existing governance and exact-effect checks complete. Workflow/operational lessons use their own consumer and cannot become physical facts through repetition.

### D3. Conformance limits

Use limited semantics-preserving SKU/option renaming with an adapter that supports the renamed grammar. Rewrite all references/relationships/BOQ identifiers consistently; reverse-map identifiers for comparison and regenerate input hashes/receipts. Numeric decisions, violations, allocations and ranking should remain invariant under that controlled transform. Do not rename externally cited product identity and expect vendor documents/receipts to stay valid.

Vendor X then Dell fixture coverage exercises declared Q&A/BOQ/reconciliation/mixed diagnostic capabilities, different grammar/support and cross-scope isolation. Missing live portal/notebook remains unavailable/pending. Generic decisions must not use HPE literals for Vendor X; explicit source provenance may still name HPE. Lint starts report-only and becomes a reviewed ratchet on classified defects, with exact allowlist reason, owner, scope and review date.

## Appendix E — Final safe and resumable execution protocol

### E1. Baseline and parity

Keep raw golden results and define semantic comparison before refactoring. Normalize only listed volatile fields (timestamps, run/trace IDs, absolute test paths); never normalize quantities, prices, SKU/owner identity, statuses, source attribution or acceptance. Preserve ordering where it carries priority/ownership meaning.

XLSX/ZIP artifacts may contain volatile metadata, so compare sheets, headers, cells, formulas, styles required by contract, quantities and artifact completeness rather than blindly comparing container bytes. Signed/fingerprinted artifacts are reissued for fixture scope and verified with existing routines; never strip integrity checks to obtain parity. Any intended correction has a field-level old/new expectation and independent review before cutover.

### E2. Staged activation

Docs/pure audits → unused registry/schema/adapters → side-effect-free shadow or isolated replay → independent verification → controlled cutover → later retirement. Shadow may compare plans or pure decisions. OCR/cloud calls, learning writes, evidence finalization, exports, portal changes and Drive/NLM mutations cannot run twice against production. Use recorded fixtures/mocks/disposable data where a pure boundary does not exist.

Flags are typed, default to existing behavior initially and have a checkpoint-owned rollback. Unsupported/pending live capability is not solved by enabling a flag. High-risk live activation remains pending without the needed environment/receipt.

### E3. Writes, stops and rollback

Each checkpoint declares exact allowed paths/operations. Certified catalogs/receipts, authorization/ledger behavior, NLM sources, Drive/Sheets and portals are protected unless its scope explicitly covers them. New config files and graph artifacts require explicit path lists, not blanket directory permission.

Check git status **and** content manifests for relevant tracked, untracked and ignored protected files before/after checks. Runner-generated test ledgers are confined to the disposable workspace. External state is read-only by default for engineering checks; where a later checkpoint requires mutation, existing staged promotion, source recovery and Sheets backup/readback contracts apply.

Stop dependent execution on a new regression, unexplained parity difference, lint/complexity/cycle regression, unintended protected write or new scope violation. Preserve receipt/error and compare with the pre-checkpoint baseline; an already-diagnosed unknown-scope result is not a new regression. Roll back only checkpoint-owned edits/new artifacts using recorded preimages/hunks. No hard reset, broad clean or restore over user/other-agent edits. External writes require their declared recovery protocol; a git revert cannot undo them. Investigate transient environmental failures honestly before resuming.

Require CC ≤135 and no regression against actual measured baseline, zero new lint warnings/cycles, no silently empty suites or weaker delivery criteria. Rising honest NOT_EVALUATED counts are reported with scope; they are not suppressed to improve a percentage.

### E4. Roles and writer lease

Assign author/reviewer per checkpoint capability/risk; do not hardcode a future model name or equate cheapness with competence. Current test ownership is Codex under the latest explicit human instruction (revision 5.10); preserve the historical Antigravity assignment/receipts. Low/medium work may be authored with pending checks; high-risk activation waits for independence. Skill-text changes that affect selection, recovery or customer decisions are behavioral changes, even though they are Markdown.

Before implementation edits, acquire a real owner-aware lease using `scripts/lib/system/workflow_lease.js` or a reviewed equivalent at a declared maintenance-lock root. A live helper must hold it for the whole editing session; calling acquire in a short-lived process releases it immediately. Record workspace, process/token, checkpoint, baseline and heartbeat/handoff metadata. Do not add unreviewed time-expiry reclamation: the existing helper is PID/token-based. Invalid/stale acquisition markers require evidence-aware recovery. Markdown holder/expiry is informative only.

Read-only independent review may run alongside authoring. One writer per checkout; reviewers/tests use isolated copies. Before resuming, compare actual manifests to handoff; explain any intervening changes. Update the ledger before ending, with all tests run/not run and next action; release only your own lease.

### E5. Next execution scope

The first execution request should be **CP0–CP2 only**, with no runtime behavior change, no live publication and no commit. CP0 characterization/tests remain assigned to Antigravity/Gemini. If only a reviewer is available, it can complete read-only baseline preparation and authored audit tooling, but must leave missing characterization/checks pending.

The user approved bounded CP0–CP2 authoring/preparation, CP3 documentation corrections, CP4 unused/additive contracts and the forwarded CP5 and CP6 next steps. Their execution records and the ledger preserve scope and verification limits. Later execution must name a bounded checkpoint/subcheckpoint and required dependencies; do not run behavior-changing work as one unbounded migration. Checkpoint closure still requires revision-bound independent evidence, not a claim of universal perfection.

### CP4 independent verification and CP5 authoring update — 4 October 2026

- The earlier CP4 AUTHORED record is historical. Antigravity independently reports 12/12 CP4 fixtures (4.53s), 6/6 legacy schema tests (0.15s), router 4/4 suites (12.18s), 0 cycles, max CC 130 and 0 new lint warnings. Codex checked all five CP4 source hashes against the author receipt: zero mismatches. The user attachment and ledger supply these results; Codex did not inspect a separate raw test-log bundle. CP4 remains VERIFIED_INDEPENDENT.
- CP5 scope is additive and unused: 17 immutable route profiles, explicit RESULT/ROUTER_ENVELOPE adapter, structural response validator, three lazy opt-in exports on `bom_verifier.js`, maintenance static audit and 31 authored verifier cases. The original gate implementation and six exports remain; router, evaluator, schemas and delivery paths are untouched. No new public root result shape is activated.
- `responseValid` means useful response structure only. Diagnostic responses require a reason and a next action; drafts/reports require route-specific content. UNKNOWN execution status may accompany a useful response and stays UNKNOWN. Handler completion, document grounding, portal acceptance, delivery, learning and sync are separate states. Supplied PASSED evidence with references remains explicitly source-declared and unverified; reference integrity, freshness and actual outcomes are not checked here. Every response check returns `deliveryAuthorized: false`.
- Static receipt: 17/17 router branches declared, original gate prefix unchanged (line endings normalized), all six legacy exports retained, 0 unexpected named/static runtime consumers; six source/test files syntax-clean and targeted lint clean; 0 cycles across 528 files; max CC 130 across 318 files / 1,366 functions. New non-legacy functions have CC at most 19. Thirty-one tests and one embedded child program are syntax-inspected, not executed.
- Allowed writes: `bom_verifier.js` additive wrapper/export hunk, three new profile/adapter/validator modules, new maintenance auditor and fixture suite, plan/ledger/[CP5 handoff](2026-10-04-skill-workflow-cp5-handoff.md), named maintenance reports and required generated code-graph artifacts. No protected config/output exception is permitted. CP5 uses a fresh freeze preserving Antigravity's intervening histories; main/scratch aliases remain the same physical checkout.
- CP5 is AUTHORED pending Antigravity's exact-source tests and review. No F/C/H finding closes and no unsupported branch is fixed in active routing yet. CP0 isolated golden capture, later wiring/shadow parity, full response semantics, artifact existence, live grounding and acceptance remain pending. See the ledger and handoff for commands, baselines and rollback.

### CP5 independent verification and CP6 authoring update — 4 October 2026

- The preceding CP5 AUTHORED record is historical. Antigravity independently reports 31/31 contract cases (0.29s), router 4/4 suites (10.65s), BOQ 25/25 suites (196.68s), static audit valid, 0 cycles and max CC 130. Codex rechecked all six source hashes: zero mismatches against fingerprint `ccf595006ea6a200fbecf8a9bcdc1ac21c1d5026d20e6eaae6a5bdf6b0438522`. The user report and ledger supply results; no separate raw test-log bundle was inspected. CP5 remains VERIFIED_INDEPENDENT.
- The current protected tree differs from CP5's author handoff before CP6 starts: 16 added, 103 removed and 21 changed protected files. Antigravity disclosed integration/E2E runtime writes and a notebook timestamp change; the full delta also includes removed temporary staging/run-history files. `cp6-preexisting-protected-deltas.json` binds exact paths against both snapshots. These are pre-existing differences, not CP6 writes. They are preserved/accounted separately; no blanket zero-delta claim or automatic restoration is made. The verifier must account for removal scope in its continuation review.
- CP6 is additive/unused: versioned observation normalization/validation; five explicit run kinds and nine event types; pure legacy projection; explicit population summaries; a separate opt-in store with no default directory; three lazy telemetry facade exports; maintenance static audit and 29 authored verifier cases. All legacy telemetry implementation and 11 exports/order remain unchanged. Dashboard consumers, serializer, legacy file locations and computed legacy metrics are not activated or corrected yet.
- Numeric fields require explicit OBSERVED status, finite valid values and references; unmeasured fields become null/UNKNOWN. Zero is a valid observation. No estimated stage timings, default confidence/product/rule counts or registry-total delta substitution. Grounding requires declared eligibility, a referenced outcome and native citation references for affirmative outcomes. Accuracy requires separate referenced adjudication by a distinct declared reviewer; confidence coverage/mean never become accuracy. References/reviewer identity remain caller declarations, not independently resolved facts.
- Numeric denominators count selected events except explicit NOT_APPLICABLE; outcomes disclose eligible, observed, unknown, unknown eligibility and ineligible counts. Outcome rates divide affirmative by observed eligible events and state that basis; empty observed sets have null rates. Collection/window totals are not mislabeled lifetime totals. Overflow remains null/OVERFLOW. Historical entries in eight known streams remain UNCLASSIFIED and all measurements/terminal evidence UNKNOWN; original snapshot, raw entries and unknown fields are retained.
- The unused store requires an explicit existing absolute root. Populations use separate files; an owner-aware lease covers reads and complete read/append/atomic-write transactions. Identical normalized retries are idempotent; conflicting IDs and corrupt history fail closed without reinitialization or pruning. Contention returns WORKFLOW_BUSY for a bounded caller retry. The 4-worker/48-event fixture checks preservation of every acknowledged ID and count, not only JSON validity. No writer/store behavior was executed by Codex.
- Unverified historical origin cannot be manually relabeled into production or promoted to OBSERVED measurements. Versioned records use validation, not another normalization pass; the store accepts raw observations only. This avoids silently reinterpreting migrated data or dropping versioned outcome metadata.
- Static audit: five kinds / nine event types / four numeric metrics; original telemetry prefix/11 export order preserved; 0 unexpected named/static runtime consumers. Seven source/test files and two embedded child programs syntax-clean. Targeted lint has 0 new warnings; three original telemetry unused-catch warnings are reproduced from its original bytes. Max CC 130 across 323 files / 1,394 functions; 0 cycles across 534 files; new functions at most CC 25. Graph refresh and final protected/source manifests are recorded in receipts.
- CP6 is AUTHORED, independent verification pending. F10 remains open through CP11 terminal ownership and later instrumentation/dashboard activation. CP0 isolated goldens remain pending before behavior changes. See the [CP6 handoff](2026-10-04-skill-workflow-cp6-handoff.md) and ledger for exact-source commands, concurrency fixtures, preserved deltas and rollback. No CP7 or runtime activation starts here.

### Optimized remaining execution order — 4 October 2026

The preceding CP6 AUTHORED record is historical. Antigravity reports 29/29 cases (1.23s), all 48 concurrent events retained, router 4/4 suites (10.67s), valid static audit, 0 cycles and max CC 130. Codex rechecked all seven original source hashes: zero mismatches. The independent receipt covers unused measurement contracts; active telemetry/dashboard fixes remain outstanding. Antigravity also authored a shared `workflow_lease.js` correction during verification. That eighth source file is outside the seven-source fingerprint and needs its own peer-reviewed, source-bound support-correction receipt (CP6r). No separate raw test-log bundle was inspected in this planning turn.

| Order / work unit | Purpose / dependency | Independent exit evidence |
| :--- | :--- | :--- |
| Readiness: CP6r + CP0 | Qualify Windows lease support fix; freeze current accepted tree and characterize existing behavior in an actual disposable filesystem | Lease retry/cleanup/resume receipts including final helper hash; source/config/fixture-bound raw and semantic goldens; shared protected state preserved |
| CP7a → CP7b | Pure unused query plan, then report-only shadow; reused objective/modality/transform contract | Labeled expected plans; no evaluator/import side effects; explicitTrack parity; old handler once and old result returned in shadow |
| CP11a → CP11b → CP6b | Root/child trace and actual invocations, then single terminal owner, then real population-aware measurement activation | Failure/cancel/export/reflection traces; artifacts before phase 8 end, reflection phase 9, terminal afterward; compatible outputs; honest measured/unknown metrics |
| CP8a → CP8b | Importable multi facade, then grouped evaluation/quantity/facility continuation | Import/CLI parity; 2/9/20 nodes; quantities and owners conserved once; per-group evidence and facility unknowns |
| CP9b → CP9c | Establish requirements-to-evaluated-candidate path, then attach workload sizing | Sufficient vs incomplete requirements; real canonical continuation; preserved application constraints/assumptions |
| CP9a → CP9d → CP9e | Attach OCR intake to established objectives; then conversion; then mixed-domain ownership/continuation | OCR exactly once; source provenance and baseline mode; explicit parity gaps; supported-domain evaluation and honest unsupported/spare groups |
| CP10a → CP10b | Evidence-backed economics and changed-candidate revalidation; actual candidate scrutiny separate from synthetic chaos | Price basis/unknowns; no certified savings from invalid baseline; exact changed manifest checks; no synthetic certification |
| CP12 → CP13 → CP14/CP15 → CP16 → CP17/CP18 | Consumed troubleshooting/learning, scoped vendor migration, skill/conformance closure, then final review | Existing checkpoint contracts remain; local docs/mappings updated at each change, final sweep/conformance and combined regression at end |

CP7c activation is attached to each proven path after CP11 and its relevant CP8/CP9/CP10 receipt; it is not a global early switch. Original 19 checkpoint IDs remain; a/b/c/r labels identify scopes within them, not additional checkpoints. CP14 precedes CP15's blocking lint/conformance activation, while its unused harness may be prepared earlier. Pure justified extractions can be scheduled locally before a behavior edit, with separate parity evidence; CP17 still owns the final maintainability disposition.

This order reduces repeated orchestration work: all subsequent paths reuse one execution contract, trace/terminal owner, grouped engine and factual measurement basis. CP11 cannot sensibly wait until after CP10, because CP8/CP9/CP10 already depend on it. RFP/workload are a shared planning bundle; OCR is a modality feeding those objectives rather than a second evaluator. Cross-vendor/mixed planning follow the stable common engine. Every named subcheckpoint retains its own finding mapping, rollback, tests and independent receipt even when reviewed in the same session.

Work may overlap only where ownership permits: Codex can prepare CP7a's unused planner/specification while Antigravity captures CP0 in a separately verified disposable working copy. No concurrent edits/test writes in the same checkout. The copy must include accepted uncommitted/untracked source/config/fixtures and preserve their hashes; a checkout at HEAD alone omits the accepted contracts/lease correction. A golden-output directory under the shared root is only an archive destination, not filesystem isolation. Audit/block external publication calls and record offline/mocked/live limits separately. CP0 may record existing broken/draft behavior honestly; do not invent successful continuations as goldens. Cover the imminent checkpoint's scenario families and retain the complete S01–S19 coverage/pending register; six smoke examples alone do not certify all routes.

Two source-review observations remain in CP6r: claim acquisition omits EBUSY from its retryable handling despite the reported claim; claim-file deletion failures are swallowed, so a leftover `.lock.claim` can leave later acquisitions perpetually WORKFLOW_BUSY without a cleanup/recovery observation. These are static liveness concerns, not reproduced test failures. Resolve or evidence the intended behavior with bounded fault/cleanup/restart fixtures, preserved original errors and an explicit recovery record before shadow/behavior activation. Preserve the original seven-file CP6 independent status without treating self-authored shared support changes as covered by that receipt.

Use one reusable labeled scenario/expected-plan manifest and one disposable verification setup. Per slice: run the changed contract's fixtures and relevant failure controls; select affected domains from actual code dependencies; broader combined regression once at each foundation/workflow wave. Re-run after new changes/failures or unresolved risks, not the entire BOQ/E2E matrix after every docs/unused helper edit. Publish one wave index linking individual exact-tree receipts; never reuse a receipt after its source/dependency change. Log intended differences before activation, keeping meaningful status/quantities/pricing/requirements in golden comparisons and normalizing only declared volatile fields. No time/token savings percentage is claimed without measurement.

Immediate work is CP6r qualification and CP0 characterization by the assigned verifier, plus optional unused CP7a preparation by Codex in its separately scoped author turn. This planning turn changes only plan/ledger and maintenance receipts; CP7–CP18 remain NOT_STARTED. No runtime change, behavioral test, external call, commit or push occurred.

## Execution update — CP7a unused planner (revision 5.7)

The user approved proceeding with the optimized sequence. CP7a adds a standalone pure proposal and declarative rules; the existing router/evaluator, public exports, delivery paths and CP4 registry remain unchanged. The planner owner is explicitly documented in `presales-query-router/SKILL.md`; ownership is distinct from active dispatch. This is bounded unused authoring while the verifier completes CP0/CP6r readiness, not permission to advance into shadow or activation.

`planPresalesQuery(queryText, context)` retains original query/context and separates objective, source modality, requested capabilities, ordered transforms and quantity hints. It keeps compound requests without treating a PDF as an objective, handles 2/9/20-node requests, and leaves incompatible objectives, multiple unbound group quantities, unknown commands, invalid quantities/files and an unconfirmed reconciliation baseline as clarification proposals. Transform ordering is a proposal for future verified consumers, not executed sequencing. Explanatory question-style requests remain Q&A unless catalog intent is explicit; portfolio comparisons do not select a default chassis. No vendor, product, accuracy, elapsed time or calibrated confidence is invented.

Source inspection corrected the earlier shorthand “explicitTrack parity”: the actual router API is `context.intent`, with 16 early-map overrides excluding OCR, across 17 dispatch branches. The new planner preserves that map's objective selection and retains secondary text requests. OCR `context.intent` is explicitly labeled an intake hint, never represented as a legacy override. `context.explicitTrack` is retained only in the original context; it is not a newly invented alias. Existing < 0.80 post-handler indication, retired 0.85 wording and 0.95 charter target are recorded separately; CP7a enforces none of these in customer execution.

New context hints `baselineProvided: true` and `reconciliationMode: 'SINGLE_FILE_AUDIT'` concern proposal disambiguation only; they do not prove baseline contents or change reconciliation code. File extensions, including GIF/TIFF/PDF, request inspection with `formatSupport: NOT_VERIFIED`; none establishes decoding/OCR support. Quantity/group/product/vendor scope and hardware completeness still need canonical consumers and acceptance evidence. Original requirements are retained by reference without mutation; callers must snapshot them when execution tracing is implemented in CP11.

Acceptance remains pending Antigravity/Gemini execution of independently labeled fixture outcomes and import-isolation checks. Static source/declaration/consumer checks are author evidence only. CP7b must invoke the old handler exactly once and return the original result after CP0 goldens and the separate CP6r receipt. CP11 follows verified CP7a/b; CP7c activates each proven continuation afterward. No F01/C1/C6 finding closes from this unused scope.

CP7a is AUTHORED: 49 labeled proposals plus 16 legacy-override and eight invariant/import cases (73 expected verifier tests, none run by Codex). Static audit, lint, syntax, CC/cycles, ownership links and protected-tree/source-bound receipts are recorded in the ledger and [CP7a handoff](2026-10-04-skill-workflow-cp7a-handoff.md). Final receipts preserve all pre-existing protected records and public-router/shared-lease bytes. Generated AST graph is refreshed; semantic labels remain separately pending. CP7 remains IN_PROGRESS through b/c; no later checkpoint starts automatically.

## Execution update — ownership transfer and remaining batches (revision 5.10)

The preceding CP7a AUTHORED text is historical. Antigravity subsequently reported 73/73 focused tests, router 4/4 and source-bound independent verification; all five source hashes still match. Accept CP7a's unused scope as VERIFIED_INDEPENDENT. CP6r's helper/test hashes also match the reported receipt. Its five cases and isolated consumer PASS do not establish every fault/cleanup/reclamation claim: real error injection, claim initialization/cleanup failures, malformed/live owner handling and competing reclaimers need qualification. The failed combined invocation's “pre-existing” attribution has not been established by an equivalent pre-patch reproduction. Preserve the existing CP6r receipt and track these newly identified source/test-review observations within that scope; no new behavioral failure is asserted in this turn.

The user asks first for all remaining work, completion and efficient testing batches, and transfers execution/testing ownership to Codex. The [remaining schedule](2026-10-04-skill-workflow-remaining-batches.md) defines B0–B9: readiness; shared shadow/trace/terminal contract; real measurement; sizing/multi/workload; OCR/conversion/mixed; trustworthy alternatives; consumed memory/learning; vendor boundaries/28 skills; Vendor X/Dell conformance; maintainability/final verification. CP7c remains path-specific across proven continuations. No checkpoint IDs or required findings are removed to improve a progress number.

Reported independent scopes are 9/35 (25.7%); conservative readiness is 8/35 (22.9%) pending newly identified CP6r qualification. Six marked-verified top-level rows out of 19 (31.6%) are an administrative count and overstate whole delivery because unused/activation scopes differ. Whole-finding closure remains 0/36. These are equal-scope measures, not measured effort or time forecasts. Codex will use accepted-tree filesystem isolation, separate serial processes for shared-resource suites, focused affected-consumer/scenario checks per subcheckpoint, receipt reuse where fingerprints permit, and one final deduplicated deterministic matrix. Exact-source independent review remains required for high-risk activation. This turn changes only progress/schedule documents and maintenance receipts; no tests, goldens or runtime implementation are executed.

Execution supplement, 5 October 2026: permanent isolated capture harness independently verified (29 authored fixtures + 10 reviewer control groups), captures config/output bytes and stops on first failed pair. Actual goldens remain pending the runner race correction. CP7b default-disabled proposal is authored only in a separate copy, 95 focused author checks; no shared router behavior change or gate waiver. Latest authoritative scopes and failures are recorded in the ledger.

Execution supplement, ledger revision5.14: CP6r requalification and all affected consumers are complete, source-bound by `2026-10-05/b0-cp6r-final-receipt.json`. CP7b isolated proposal independently accepted103 checks; shared integration remains gated by CP0. First canonical Q&A pair was retained unqualified because Windows script-path separators failed strict receipt binding; fix/review is separate and dependent activation stopped. Ledger JSON and generated Markdown runtime timing will be normalized only by explicit, source-proved, independently reviewed rules; original bytes/statuses/domain facts remain archived. CP11 design preparation may overlap read-only capture in separate copies, but implementation activation still follows verified CP0/CP7b. Current progress remains9/35 verified scopes, not a claim that all customer scenarios pass.

Execution supplement, ledger revision5.15: Windows binding correction independently passed40 checks and is integrated. BOQ and single-file reconciliation each have two qualified canonical captures with source/protected unchanged. Original-policy differences stay REVIEW_REQUIRED; six total runs are archived, no CP0 completion earned. v2 scoped ledger/summary/reconciliation-time and v3 observed BOQ runtime projections require producer proof and independent negative controls before integration; raw artifacts and original hashes remain retained. Transitive report hashes may only be compared through verified raw hash bindings and complete semantic content, never by ignoring manifest/auth/catalog fingerprints. Fresh captures against the final reviewed policy are the closure gate. Record196MB duplicated BOQ receipt as CP17 resource/cohesion debt, without rewriting this baseline. Plan/ledger update continuously; preceding execution notes remain historical.

Execution supplement, ledger revision5.16: scoped v2 tooling is independently accepted64 checks and integrated exactly; fresh Q&A/reconciliation captures follow. v3 BOQ projections and an unused CP11 execution-scope foundation are authored only in isolated copies with separate verification, no customer-path activation. CP6r consumer qualification is complete. Current completion remains9/35 and CP7b shared integration still waits for CP0; no replay-only or unused-helper checkpoint credit.

Execution supplement, ledger revision5.17: fresh Q&A and single-file audit each reproduce across two real isolated canonical runs; source-bound index is `2026-10-05/b0-cp0-fresh-v2-index.json`. Remaining descriptor baseline and aggregate review still gate CP0. BOQ v3 source-proved artifact projections await exact-source independent review and a fresh BOQ pair. The unused CP11 draft failed three independent controls, preserved in isolated evidence; corrected v2 has author passes but independent rerun remains pending. No shared CP11/router activation or additional scope credit is claimed.

Execution supplement, ledger revision5.18: v3 maintenance tooling independently passed106 controls with exact producer/dependency/preimage proof and was integrated without customer-path changes. Fresh final-policy BOQ and remaining descriptor captures now follow against a frozen accepted tree. Historical failed captures remain unchanged. Corrected unused CP11 foundation and importable CP8a facade remain isolated preparation; activation/dependency and independent acceptance requirements still apply. Completion stays9/35, whole findings0/36.

Revision5.18 additive supplement: the corrected CP11 foundation independently passed57 controls and its two unused sources are integrated before the next freeze; zero runtime consumers. Actual CP11a/b execution and terminal integration remains unstarted. CP8a stays isolated preparation; discarded cluster multiplier and mismatched child sheet name are named CP8b correction targets with separate expectations, rather than facade parity claims.

Execution supplement, ledger revision5.19: resume continues the existing ACTIVE goal after a usage interruption. Six complete interrupted CP0 pairs were independently reconciled; thirteen fresh v3 pairs contain ten equal and three preserved comparison failures (reconciliation telemetry, nested sizing evaluation metadata, drift artifact SHA). Existing descriptor coverage does not satisfy CP0's separate valid/corrupt and diagnostic/authorized-export controls; those are being authored in isolation. V4 comparison rules require source-proved binding, independent review and new actual captures; replay alone earns no baseline acceptance. All capture controllers stopped before plan/ledger updates; full frozen input/protected fingerprints remained exact. Isolated CP8a and CP11a runtime candidates are CHANGES_REQUIRED because existing orchestration complexity grew37→49 and77→78 respectively. Passing author/reviewer tests and global CC130 do not waive Appendix E's no-regression gate. Preserve originals, correct cohesively, then independently requalify before integration. Development remains incomplete; current9/35 scope completion includes documentation/unused foundations and is not a coding percentage.

Execution supplement, ledger revision5.20: the four additional CP0 controls are authored in isolation and root independently passed72 checks, including real local positive/corrupt canonical cases and exporter contract/failure/quantity controls. Independent actual-controller tests then reproduced synthetic exporter modes incorrectly relabeled as canonical runtime in aggregate coverage (both cases fail). Preserve the original candidate/72-pass evidence and correct the aggregate seam before new review/integration. Controlled contract cases must remain distinct from actual customer routing and full-family acceptance. Merged V4/controls verification and actual fresh pairs remain required; no checkpoint credit is earned from test scaffolding alone. Progress updates state new implementation/review evidence and remaining concrete action instead of repeating an unchanged percentage.

Execution supplement, ledger revision5.21: CP8a cohesive correction independently passes78 checks; workerCC33/helper17 below original37, exact rendering movement verified, syntax/lint0. Isolated proposal accepted; shared integration still follows CP0/CP7b/CP11. Review only changed seams and new failure controls; reuse unchanged source-bound evidence, then capture three failed+nine absent+four new baseline pairs. Percentage updates are reserved for changed verified scope counts or an explicit user request.

Execution supplement, ledger revision5.22: V4 policy177 and merged controller34 independent checks pass; aggregate export-mode regression corrected. Exactly16 maintenance/test sources integrated with no production/config/protected differences. Fresh characterization runs cover three failed+nine absent+four new descriptors; existing16 accepted pairs remain original evidence with explicit producer/fixture/dependency and new-policy diagnostic checks. CP8b grouped continuation and CP11b terminal ordering are authored concurrently only in isolated copies; actual activation remains gated by completed baseline and independent runtime review.


### CP0 recovery progress — 6 October 2026, after revision5.23

Recovered the interrupted V5 candidate into a new isolated copy, preserving the original. Diagnosed corrupt-workbook comparison as exactly two generated ledger artifact recordedAt fields; the canonical producer overwrites these with its current time. Added exact bound-ledger projection and9 focused preservation tests. Candidate checks:72 passed on initial combined run, with1 suite failing to load a missing disposable-copy dependency; only that suite was rerun with the accepted dependency path and66 passed. Total138 checks pass with zero skips; the original environment failure is retained. Diagnostic replay of the actual corrupt-workbook pair is equal and an artifact-hash mutation remains detectable. This is author evidence and diagnostic replay, not independent acceptance or a fresh capture. No runtime or comparison code integrated. Candidate sources, hashes, raw logs and replay evidence are archived at outputs/history/skill_workflow_excellence/2026-10-06/CP0-v5-recovery/. Next: independent V5 review, including complexity and actual artifact binding, then fresh affected captures and the two remaining controls. CP0 stays IN_PROGRESS; the27/32 baseline count is unchanged.


### Independent quantity correction and comparison cohesion — 6 October 2026

CP8b core ingest-context correction is VERIFIED_INDEPENDENT_ISOLATED, author /root/cp8b_context_finish and reviewer /root.318 input files verified into a separate review copy; exact candidate hashes match. Actual offline canonical1/2/9/20-node cases preserve base/order quantities and pending delivery;5 seams,14 enterprise checks and legacy configuration assertions pass. Existing function complexity has no increase; precheck30, new helper3. Cached oxlint exits0 and an invalid-syntax canary exits1, establishing execution. Two reviewer single-node selections that ran no matching subtest are retained and excluded; the corrected run records actual nodes1. Receipt outputs/history/skill_workflow_excellence/2026-10-06/CP8b-context-independent/independent-receipt.json SHA256 f6d48878dea1ea6a85a9514c69a969ac657fc9bffafca0cd8e4d23540cabe0d9. No main integration or full CP8b closure.

Recovered CP0 V5 candidate initially increased existing complexity. The isolated revision separates baseline selection, runtime binding and quarantine identity/fact validation; existing complexity no longer increases, quarantine45→22, other new helpers≤14.138 focused checks and16 historical ledger checks pass. Policy-version assertion updated4→5 intentionally. Latest evidence:CP0-v5-recovery/cohesion-author-receipt.json and ledger-policy5-receipt.json. Separate independent reviewer cp0_v5_review dispatched after the previous stated quota reset; no review verdict yet. No fresh captures or baseline promotions in this update.


## Antigravity delegation enabled — 7 October 2026

The user authorized agy CLI using Gemini3.8Flash High. Local model listing confirms gemini-3.8-flash-high. The [execution allocation](2026-10-07-codex-antigravity-execution-plan.md) assigns all remaining B0–B9 batches, preserves separate high-risk reviewers and one shared integration writer, and defines compact evidence-based handoffs. A bounded CP0 V5 independent review is running in C:/Users/latha/AppData/Local/Temp/agy-excellence-20261007-review; its verdict is pending. Prior Codex reviewer reported154+19 passing checks before quota interruption but never sealed acceptance. CP11 reviewer similarly reported106 passing checks before interruption; full review remains pending. Do not count either as closure.

Old writer PID15240 was absent. Canonical owner-aware lease reacquired by live helper PID3068, PTY session92497, without age-only stealing. Antigravity cannot edit main or take its lease. No runtime activation or new baseline promotion in this scheduling update.


## Parallel CP11b fixture recovery — 7 October 2026

While the original agy CP0 review remains live, root recovered the interrupted terminal-owner candidate into C:/Users/latha/AppData/Local/Temp/cp11b-fixture-recovery-bwtHll. Corrected only the test fixture:actual LifecycleEngine now uses the same fixed clock as canonical/serializer VM, and planned-block disposition expectation matches the existing clean-math serializer ACTION_REQUIRED branch. Full default-disabled return/event/output parity remains asserted.14/14 focused tests pass,0 skips,0 runtime source edits. Evidence:outputs/history/skill_workflow_excellence/2026-10-07/CP11b-fixture-recovery/author-receipt.json and raw logs. This is author fixture evidence only, not CP11b acceptance; real execution, independent review and implementation quality gates remain.

Main baseline preparation records3336 inputs and zero issues. All2563 protected files retain fingerprint0074ea2c017c3d1106de2c85ed6f3cce5374d2fc286ec960b84f3c22ecbef640; added/removed/changed protected files all0. CP0 V5 exact candidate readback has7 changed/new files plus2 unchanged test dependencies. Review and integration remain pending.


## CP0 V5 independently approved and integrated — 7 October 2026

Antigravity CLI Gemini3.8Flash High completed independent review after one bounded continuation.173/173 checks passed:154 focused and19 independent mutations;0 failed/skipped. Root verified all9 source/test hashes against both frozen candidate and executed copy, inspected mutation checks and reran lint cleanly. Review evidence is archived under2026-10-07/CP0-v5-independent. Root integrated exactly7 changed maintenance/test files;2 test dependencies unchanged. Before/after full manifests show only those7 changes, no protected added/removed/changed files, and no customer runtime producer changes. Integration receipt:2026-10-07/CP0-v5-integration/integration-receipt.json.

Next capture generation will run only3 previously unequal descriptors plus2 uncaptured controls in independent lanes. Retain27 existing reproducible pairs with source-bound reuse/aggregate review. Main source/docs will remain frozen during capture. No CP0 closure until actual fresh outcomes and aggregate review. The agy pilot initially returned partial CLI SUCCESS on timeout; this was not accepted. Same-conversation correction produced the final hash-bound receipt. Future tasks must use smaller briefs and focused final reports to reduce excessive context use.

## Incremental release decision — 8 October 2026

Do not wait for all35 scopes before committing or using accepted improvements. First commit boundary: source-bound, independently accepted MAIN fixes and their required contracts/tests/docs, with a reviewed explicit file list; exclude unrelated/protected generated outputs and isolated candidates. Main already contains accepted NotebookLM terminality and GPU-capacity fixes. No commit is authorized by this scheduling question; existing no-commit-without-instruction remains.

Next usable release boundary: latest-dependency CP8/CP11 combined integration and affected-consumer acceptance. Author reports97 distinct focused checks passed; receipt sealing/root review still pending, not accepted yet. Keep path activation separate from commits and do not wait for vendor migration/final35-scope closure. Activate customer paths individually after their actual acceptance gates; retain CP10 pricing and whole-solution evidence requirements. Uncommitted main fixes already apply when that checkout executes; temporary isolated candidates do not.

Report three measures together: formal scope completion11/35(31.4%); integrated main fixes; customer paths activated. Do not let unchanged formal percentage hide partial delivery or imply development completion.

Parallel execution: Codex root owns semantic decisions, independent acceptance and integration; existing two isolated Codex lanes finish latest composition and typed accessory evidence. Agy Gemini3.8FlashHigh newly dispatched to isolated dashboard cancellation normalization (exact backend envelope, preserved evidence, ordinary-error regression), workspace C:/Users/latha/AppData/Local/Temp/agy-dashboard-cancel-normalizer-20261008, tool88441. Separate final-author-receipt.json required; CLI SUCCESS/print timeout is not acceptance. No broad matrix, duplicate history audit, shared-file writes or commits. Assess efficiency from accepted product changes and rework; past Agy context expenditure does not prove token savings.


## AUTHORITATIVE restart — revision5.36

Revision 5.36, 8 October 2026. Latest upstream7a63bc6 preserved. CP8/CP11 combined batch now independently reviewed and INTEGRATED:20runtime files+15tests/fixtures;404hashchecks0mismatches;97candidate controls reused+27main checks passed;0cycles/597files;maxCC130<=135;lint28->22with0newwarnings;430trackedprotected files unchanged. Formal11/35(31.4%) remains full-scope accounting, not a measure of integrated partial delivery. Trace/terminal-owner stay opt-in; long-query budgets/remote recovery, MCP ingress and remaining customer workflows are incomplete. No commits/publication.

Durable acceptance: outputs/history/skill_workflow_excellence/2026-10-08/latest-composition-integration/integration-receipt.json,154archived files readback verified. Controlledcopy execution1791465753220; source allowlist exact20, no registry/config/maintenanceoverwrite. Eightstaleparentfiles+three currenthelpers reconciled in candidateonly; original failedreadback retained and superseded by404check finalreview. CP8 base/context quantity correction applies in currentmain; newtrace/owner observations require explicitflags. No CP8/CP11 wholecheckpointclosure or CP7c pathactivationclaim. Mainactualchain proof reused from97candidate checks with sameproduction dependencies; main27focuschecks executed without maincatalogwrites.

Graph refreshed successfully9296nodes/16724edges/485communities; graphify-out refreshed, application junctionlinked. Semantic extraction lacksconfiguredkey; graphify skill/package0.9.61/0.9.63 mismatchwarning disclosed, noinstallationchange.

Priority1 customer blocker: groupedchild120000ms currently can kill healthy600000ms NotebookLM query. Activeisolated author /root/cli_cancellation_author implements separate child/query budgets, immutablelogicalquery deadlines and explicitCLIpropagation. Root policy approved: onlinechild30min/offline2min; eachlogicalquery10min total includingretry/backoff, boundedbysharedcaller deadline. AdvisoryQ&A15s and dashboarddefer unchanged. No blankettimeout-to-success or remote-cancelclaim.

User timeout/recovery requirement: localtimeout means NOT_VERIFIED, remoteexecution may remainUNKNOWN. Neverblindlyresubmit possiblysubmitted requests. Installednlm helpverified: --conversation-id sends FOLLOWUPquestions; chatslist/get providestranscriptreadback; no documented remotejobstatuspoll. Persistattempt/notebook/queryhash/sourcebindings/deadline and actualconversationIDwhenreturned; no latestchatmatching, no guessedpollAPI. Ambiguous503/socket/timeout cannot auto-startnewconversation. Knownpre-submit requires actualexecutorproof. Exactabort/erroridentity preserved, diagnosticseparate. This policy is AUTHORING, not yetintegrated. Fullsolution acceptance remains singlemanifest, citations/currentevidencechecked afteranyrecovery.

Accessoryguard candidate18/18 remains staged: exacttypedSKU/target/trustedsourcepath works; actualP48802 sourcebinding notproven. Full-finalpayload fingerprint comparison qualified for self-containingmanagedprojection; corrected preprojectionreproduction daecf090... still differs stored7f171337...; causeunknown, no cloudstalenessclaim. Do notactivateguard that blocks currentlegitimateoptions until explicitproof/controlleddisposition.

Agy task59e9b099-2216-4a14-b5c7-313544a170db: first300s observer and sameconversation120s correction timedout with backendturninprogress; blankSUCCESSresponses are NOTreceipts. No candidateedits orfinal-author-receipt observed. Latestreported cumulativeusage input318474/output23248/cache2284901; no savingsclaim and no categorysum. Observerhandles88441/1248 terminal; backendstateUNKNOWN, don'trestartduplicate. Nativeworker spawning notyetverified: CLI --agent selectsagent; agentslistreturnedempty. Corrected brief backendpath dashboard/routes/evaluation.cjs. Nextreconcile actualcapabilities/output rather thanmore broadprompts. Codex implementation continuesindependently.

## Latest-input execution amendment — 9 October 2026 (revision5.37)

Preserve the35scope plan and original acceptance criteria. Latest upstream7ac4baf includes ten Antigravity commits; author completion claims are inputs to review, not closure. Local commits are explicitly authorized by the human user's latest instruction; use a codex feature branch and explicit source/archive allowlists. Push/publication remains outside current execution.

BatchA must include exact original-request Notebook recovery, no ambiguous automatic resubmission (including restart), consistent query/child/caller deadlines, GPU tally/remedy capacity agreement, and honest up-front disambiguation/learning evidence. Native Agy worker output is accepted only against actual source hashes and assertions. Missing question or prefix matching cannot recover an answer; local async job IDs do not establish vendor-side polling. Synthetic reviewer/source IDs and forced explicit-context confidence cannot establish continuous-learning consumption. Preserve whole-manifest validation and alternate-branch independence.

Then complete BatchB customer continuations/pricing and CP7c path activation; BatchC learning/vendor/28skill conformance; BatchD extraction/final regression. See the rewritten current-status snapshot for assignments/gaps and checkpoint ledger for receipts. Already accepted evidence is reused unless current source changes invalidate its specific dependency. Never substitute receipt generation for required implementation or live acceptance.

Revision5.37 delivery update: CP8a importable facade independently closed10/10 on both current and budgetcandidate;12/35 scopes accepted. Notebook durable attempts, no-resubmit/restart and separate query/childbudgets now integrated and independently checked. Real remote transcript polling, attachment ambiguity, cloud qualification and other BatchA findings remain required; do not treat disabled unsafe recovery as complete provider-side recovery.

Revision5.38: the human explicitly requested saving verified improvements in main for customer work. Verified source/receipts promoted by local fast-forward; no push and no implicit activation of incomplete flags. Unverified Agy candidates are archived separately for recovery, reviewed/fixed/tested before runtime promotion. Next BatchA gate includes correction of the newly reproduced GPUmetadata ownership leak.

Revision5.40: Agy GPU corrections independently qualified and promoted in localmain (24focused/4affected suites). Use bounded customer-impacting integrations as release units; don'thold verified improvements for entireplan completion. Forecast6–8 substantialexecution sessions across existingA–D batches, capacitydependent, not guaranteed3–4quota resets. Current actuallint requalification shows8existingwarnings inGPUcohort,0new; zero-warning finalgate remains pending ratherthan falsely certified.

## Revision5.41 — recoverable execution state

Verified runtime fixes through4d4be2a are committed on local main. See the rewritten current-status snapshot and 2026-10-09-remaining-implementation-handoff.md for exact saved/unfinished boundaries and bounded memory/pricing contracts. The Agy operating skill and CLI lessons are versioned in docs/audits/agy-orchestration/. Formal12/35 remains; no acceptance scope removed. Integrate and commit verified fixes promptly, reuse source-valid evidence, and do not repeat the6–8 session allowance as a new measured forecast. No push requested.

## Revision5.42 — query-choice fix delivered

Actual ambiguous-platform handlers are gated before execution, common trace/acceptance completion preserved, and exact scoped USER_PLATFORM_SELECTION is consumed on the next original query. Fabricated chassis defaults/hardware certification removed. Independently17controls, main39, isolatedrouter4/4, cycles0/614,CC131,lint0new/10existing. Receipt query-choice-main-integration/acceptance-receipt.json; this is partialCP7c/CP12 rather than broadclosure. Next pricing is implemented in an isolated candidate but awaiting Markdown/overflow corrections and22control acceptance; do not promote failures.
