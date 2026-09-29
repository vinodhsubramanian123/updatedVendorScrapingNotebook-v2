# Core Logic Architecture Review and Remediation Plan

**Date:** 2026-09-29  
**Scope:** Production customer-query logic, workflow orchestration, helpers, integrations, evidence, validation, learning, portability, and production folder structure.  
**Explicit exclusions:** `dashboard/**`, `tests/**`, test implementation, UI behavior, and historical output certification.  
**Change status:** Planning only. No production code was changed by this review.

## 1. Executive conclusion

The repository contains strong individual controls, but they are not enforced through one production execution boundary. The canonical nine-phase evaluator exists, yet several customer-query handlers, the MCP server, workbook flow, adversarial flow, and legacy agentic entry point call lower-level evaluators directly. As a result, the same BOM can receive different ingestion, evidence, grounding, candidate revalidation, output validation, learning, synchronization, and delivery treatment depending on its entry point or input representation.

The first remediation goal is therefore not another checker. It is a single, declarative workflow kernel that makes stage order, prerequisites, outcomes, evidence, and failure behavior impossible to bypass accidentally.

The target invariant is:

> Every customer-facing result is produced from one normalized request envelope, one scoped product/domain identity, one stage state machine, one result envelope, and one acceptance decision. Entry points may adapt inputs, but they may not reimplement or skip the workflow.

## 2. Review method and evidence boundary

- Queried `graphify-out/graph.json` (6,282 nodes) for customer-query dispatch, evaluation, grounding, evidence, validation, and learning paths.
- Inspected production sources under `scripts/evaluators`, `scripts/lib`, `scripts/services`, `scripts/scrapers`, and `scripts/catalogs`.
- Compared the runtime paths with the skill contracts in `.agents/skills` and recent remediation/audit documents.
- Searched for direct evaluator calls, swallowed exceptions, default-success behavior, non-atomic JSON writes, absolute paths, process/platform assumptions, duplicated responsibility, stale subsystem manifests, and unreferenced orchestration.
- Did not review or change dashboard or test code and did not execute the test matrix.

Graph discovery itself exposed a portability/documentation mismatch: `/graphify query ...` is not a valid PowerShell command although `graphify.exe query ...` is installed and works. The graph also admits dashboard/test nodes into broad semantic searches, so path-scoped queries or graph extraction exclusions are needed for reliable production-only audits.

## 3. Current execution topology

```text
CLI / Router / MCP / helper CLIs
          |
          +--> route_query.js -------------------------------+
          |       | file BOM -> runEvaluationPipeline()      |
          |       | item BOM -> evaluateBOQMultiAspect()     |
          |       | sizing/value/workbook/etc. -> local calls|
          |                                                (divergent)
          +--> eval_boq.js -> canonical 9-phase pipeline -----+
          |
          +--> mcp_server.js -> evaluateBOQMultiAspect()
          +--> agentic_eval.js -> separate agent loop
          +--> adversarial_agent.js -> evaluateBOQMultiAspect()
          +--> vendor_bom_verifier.js -> separate reconciliation CLI

Low-level deterministic core:
  boq_evaluator.js -> aspect helpers -> conflict graph -> strategy synthesis

Cross-cutting controls (not universally enforced):
  evidence ledger, NotebookLM, agentic guardrail, candidate revalidation,
  acceptance gate, adversarial validation, deliverables, learning, sync
```

## 4. Confirmed findings

### P0 — correctness and silent-pass risks

#### F-01: The canonical evaluator is not the canonical entry point

- `scripts/lib/orchestrator/evaluation_orchestrator.js` wraps `runEvaluationPipeline()`, but production callers do not use it as their required boundary.
- `route_query.js` sends file-backed BOQs through `runEvaluationPipeline()` but sends in-memory items directly to `evaluateBOQMultiAspect()`.
- RFP sizing, value engineering, least-delta, workbook generation, adversarial validation, MCP evaluation, the standalone adversarial agent, and the legacy agentic evaluator also call the low-level evaluator directly.
- `generate_boq_xlsx.js` has another evaluation fallback.

**Impact:** evidence, NotebookLM source checks, candidate revalidation, ephemeral-source validation, learning, sync, delivery, and final workflow status vary by entry point. Input transport changes semantics.

**Required fix:** make one application service the only customer-facing evaluation boundary. Keep `evaluatePhysicalMath()` and `evaluateBOQMultiAspect()` internal/domain APIs with explicit names that do not imply a completed workflow.

#### F-02: Acceptance is attached after delivery and does not block the result

- The canonical pipeline generates reports and workbooks in `serializeAndExportResults()`.
- `route_query.js` invokes `verifyPrePresentationAcceptance()` only after the handler returns.
- The returned result is not changed to a blocked delivery state when acceptance fails; acceptance is metadata.
- Specialized tracks get only universal checks plus a synthetic `TRACK_PROFILE` PASS.

**Impact:** an artifact can be generated before the pre-presentation gate decides it is invalid. A caller that ignores `acceptanceGate` can present it.

**Required fix:** acceptance must be a mandatory pre-delivery stage inside the workflow kernel. Exporters accept only an `AcceptedArtifact`/`DeliveryAuthorized` token, not arbitrary evaluation data.

#### F-03: Skill contracts are descriptive, not enforceable runtime contracts

`skillTarget` is normally a label in the classification response. It does not load or enforce the skill's prerequisites, handoffs, halt conditions, or postconditions.

Examples:

- Freeform questions can return `skillTarget: presales-query-router` while executing the NLM handler.
- OCR returns `READY_FOR_OCR`; it does not invoke `ocr_service.js` or hand the normalized result into the next workflow.
- Multi-cluster routing performs basic RU/power arithmetic and does not invoke `multi_cluster_splitter.js`.
- Remarks reconciliation calls a pure formatting helper without enforcing the new baseline-freshness or prior-reconciliation gates.
- BOQ reconciliation allows an empty customer baseline although the skill now mandates both non-empty inputs.
- Cross-vendor transformation does not enforce a certified target catalog before producing its draft.
- Execution trace, output validation, NotebookLM grounding, adversarial validation, continuous learning, and sync are modeled partly as user-selectable intents instead of mandatory workflow middleware where applicable.

**Required fix:** create a machine-readable workflow/skill registry containing input schema, required capabilities, stage DAG, halt policy, evidence requirements, handler, acceptance profile, delivery policy, and next-stage handoff. Generate or validate documentation against this registry; do not rely on prose as executable wiring.

#### F-04: Reconciliation fails open and corrupts discrepancy shape

- Missing customer input becomes `skuList: []`; a one-file reconciliation is allowed and every vendor item can be interpreted as vendor-added.
- `verifyVendorBOM()` treats valid HPE syntax as catalog membership when no catalog SKUs load.
- Empty vendor/customer row gates from the skill are not implemented.
- `route_query.js` remaps `uncatalogedSkus` as if each entry were a string, but the verifier returns objects. It wraps the object in `sku` and sends the object to `isValidHpeSKU()`.
- The standalone reconciliation CLI still calls `evaluateBOQMultiAspect(customerFile)` and derives a baseline through a separate path.

**Impact:** false reconciliation reports, false catalog confidence, and malformed output.

**Required fix:** define and validate `ReconciliationRequest`, `NormalizedBom`, and `ReconciliationResult` schemas; require two non-empty baselines for comparison mode; create a separately named one-file catalog audit mode; never infer catalog presence from SKU syntax.

#### F-05: Catalog freshness is fail-open and its warning is lost

- `isCatalogFresh()` returns `true` for a missing directory, missing catalog, or any exception.
- `evaluateBOQMultiAspect()` catches freshness errors, mutates `options.context.staleCatalogWarning`, and does not copy that state into the returned result.

**Impact:** missing/unreadable evidence can be reported as fresh, and stale warnings can disappear.

**Required fix:** replace the boolean with a typed result: `FRESH | STALE | MISSING | UNREADABLE | UNKNOWN`, including timestamp, age, path, and reason. `MISSING`, `UNREADABLE`, and `UNKNOWN` are never success. Carry the result through evidence, acceptance, narrative, and delivery policy.

#### F-06: Evidence phases sometimes record execution claims rather than proven work

- Phase 5 is always marked PASSED from the count of available modernization rules and prints that least-delta synthesis was initialized; that does not prove the combinator ran or produced a result.
- Router fallback ledgers can mark dispatch PASSED using `responseData.status || 'COMPLETED'`, even when the response is an error-shaped object or an incomplete draft.
- Ledger persistence is optional for many routed tracks (`context.persistLedger`).
- `getHealth()` treats `SKIPPED` as terminal and potentially complete without validating a reason/policy for the skip.
- `completePhase()` defaults to `PASSED`, which is unsafe for missing caller arguments.

**Impact:** structurally complete evidence can overstate which controls actually executed.

**Required fix:** use separate `executionState` and `outcome` enums. Remove default PASS. Every skip requires a policy code and evidence. Stage completion must be derived from a stage-specific result schema, not caller-selected strings.

#### F-07: The domain aspect registry is not the production execution path

- `aspect_registry.js` declares domain-aware checker sets and capability status.
- `boq_evaluator.js` manually invokes server checkers and then runs additional legacy validation functions.
- The registry is exported through the barrel but has no production caller.
- Server execution effectively contains eight named checks while comments and acceptance rules still say seven; the acceptance gate passes any count `>= 7`.
- Non-server routing is split between early topology exits, a SAN special case, generic templates, and the unused registry.

**Impact:** new domain/checker registration does not change real evaluations, duplicated rules can drift, and check completeness is count-based rather than capability-based.

**Required fix:** make the registry the sole dispatcher. Validate required checker IDs for the resolved domain/profile. Remove legacy duplicate validators only after equivalence review. Version each profile and expose unsupported capabilities explicitly.

#### F-08: Result status and delivery status are not one authoritative contract

- Low-level evaluation fields, evidence workflow status, acceptance status, grounding status, portal status, sync status, delivery errors, and router confidence are calculated independently.
- `runCanonicalEvaluation().success` uses evidence workflow completion and delivery error only; it does not use acceptance, portal status, or all unresolved evidence states.
- The serializer can produce `SUCCESS` from evidence workflow completion even though portal validation remains pending (portal pending is correctly disclosed elsewhere but not incorporated into a unified authority model).

**Impact:** callers can select the most optimistic boolean/status.

**Required fix:** one `WorkflowResult` with independent, non-collapsible fields (`execution`, `localBuildability`, `documentGrounding`, `candidateReview`, `acceptance`, `delivery`, `sync`, `portalAcceptance`) plus a derived `customerDisposition`. No generic `success` field without a precisely defined scope.

### P1 — maintainability, duplication, and extensibility

#### F-09: Duplicate orchestration and agentic implementations

- `agentic_eval.js` duplicates the tool loop now implemented more safely in `agentic_guardrail.js` and is not a package entry point.
- `adversarial_agent.js` and the router adversarial handler partially duplicate evaluation behavior.
- `evaluation_orchestrator.js` is the intended canonical adapter but is effectively unused outside exports/tests.
- Router handlers duplicate ingestion, scoping, evaluation, evidence, and status assembly.
- Budget/value behavior is split across `budget_optimizer.js` and `deal_optimizer.js` with overlapping naming and different call sites.
- Strategy responsibility is spread across `conflict_graph.js`, `strategy_synthesizer.js`, `least_delta_combinator.js`, `resolution_matrix.js`, and route-level selection.

**Required fix:** assign one owner per responsibility and mark APIs as domain, application, or adapter layers. Deprecate first, verify callers, then delete.

#### F-10: Swallowed exceptions remain in decision-critical code

Empty catch blocks exist in product/catalog resolution, router cloud grounding, price history loading, catalog parsing, learned-delta persistence, evaluator freshness, and other production paths.

**Impact:** missing evidence is converted into absence/default behavior without a traceable reason.

**Required fix:** adopt a failure taxonomy (`INPUT_INVALID`, `SCOPE_UNRESOLVED`, `EVIDENCE_MISSING`, `DEPENDENCY_UNAVAILABLE`, `INTEGRATION_FAILED`, `INTERNAL_ERROR`). Every caught error must be propagated, converted to a typed degraded state, or logged into the trace with stage and policy. Cleanup-only catches are the limited exception.

#### F-11: Adversarial behavior can be misleading and non-reproducible

- Generation failure falls back to a hardcoded DL380 Gen12 BOM even when another target chassis was requested.
- Random catalog selection and model-generated anomalies are not seeded or accompanied by an expected-violation manifest.
- “Caught at least one issue” is treated as success even if the intended injected faults were missed.
- The canonical pipeline's `adversarialGateResult` is deterministic candidate revalidation, not the ten-mode adversarial skill; the naming conflates two different controls.

**Required fix:** separate deterministic candidate revalidation from adversarial validation. Adversarial cases require an explicit injection manifest, expected detector IDs, target-scoped fixtures/generators, seed/model provenance, and per-injection recall.

#### F-12: Hardcoded product details remain in generic core logic

Examples include rail SKU/description, fallback wattage, form-factor regexes, CTO patterns, service SKU families, and fallback chassis choices embedded in evaluators and agents.

**Impact:** onboarding a new product still requires code edits and can leak server assumptions across domains.

**Required fix:** move product facts to versioned product/domain profiles. Code may contain algorithms and schema defaults, not catalog facts. Missing profile data becomes `NOT_EVALUATED`, not a generic server default.

#### F-13: Subsystem manifests and directory ownership have drifted

- `boq/manifest.json` omits many active BOQ modules.
- `rag/manifest.json` lists OCR as if it were in the RAG folder although OCR has its own directory.
- The barrel groups conflict modules under `boq`, mixing domains.
- Root contains historical plans/handoffs and a Windows `.cmd` helper despite the documented strict hierarchy.
- Customer-specific maintenance scripts contain absolute `/home/vinodh/Downloads/...` paths and behave like retained one-off scripts.

**Required fix:** make manifests generated/validated from actual module ownership, move historical root documents into `docs/audits` or `docs/archive`, move reusable commands behind portable Node CLIs, and quarantine/delete customer-specific one-offs after reference and retention review.

#### F-14: Portability is inconsistent

Good cross-platform helpers exist (`path`, `fs_compat`, browser launch branching), but gaps remain:

- Documentation requires slash commands that do not execute in PowerShell.
- Customer-specific maintenance tools hardcode Linux download paths.
- `decision_trace.js` uses `process.cwd()` while most modules derive repository root from `__dirname`; invoking from another directory changes output location.
- `notebooks.json` persists absolute historical command/error paths, leaking machine-specific state into shared config.
- Root `open_deliverables.cmd` is Windows-only duplication of the Node command.

**Required fix:** introduce a single runtime-path provider and injected workspace/output roots; keep machine state out of committed config; use `execFile/spawn` argument arrays; document platform-neutral commands first.

### P2 — governance and clarity

#### F-15: “14-point” and track coverage claims do not match implemented checks

The acceptance module describes U1–U5, B1–B16, R1–R6, C1–C4, and Q1–Q4, but only subsets are implemented. Specialized tracks receive no real track profile.

**Required fix:** define acceptance profiles declaratively by exact check IDs and fail startup/build-time validation when required IDs are missing. Rename claims until coverage is real.

#### F-16: Structural graph/audit tooling needs production-only scopes

Broad graph queries start from tests, dashboard, outputs, and docs even when the question requests exclusions. Complexity and circular-dependency scripts also scan broad trees by default.

**Required fix:** add supported include/exclude arguments and a production architecture audit profile. This is tooling, not test code.

## 5. Skill-to-code coverage matrix

| Skill/capability | Current runtime state | Required disposition |
|---|---|---|
| Presales query router | Implemented, monolithic switch/regex classifier | Split classification from declarative dispatch; no self-referential skill target |
| BOQ evaluation | File input uses full pipeline; item input bypasses it | All transports use canonical workflow |
| OCR ingestion | Stops at `READY_FOR_OCR` | Execute OCR adapter, validate normalized rows, then re-enter router with provenance |
| RFP sizing | Produces explicit draft and partial ledger | Formal `DRAFT -> CANONICAL_EVALUATION` handoff; never deliver draft as evaluated BOM |
| BOM reconciliation | Core verifier exists; empty/fail-open gates missing | Two-input schema, strict catalog evidence, typed one-file audit mode |
| Cross-vendor transformation | Transformer returns safe draft statuses | Require target catalog/profile and canonical evaluation of target candidate |
| Heterogeneous modernization | Produces draft/carrier plan | Partition -> scoped evaluators -> relationship validation -> acceptance |
| Workload DNA | Extracts hardware profile only | Keep as enrichment stage; do not claim application suitability without evidence |
| Value engineering | Checks low-level buildability then optimizes | Run only on accepted local candidate; revalidate every optimized candidate |
| Least-delta | Selects a rank from low-level conflict graph | Make a synthesis strategy inside canonical candidate stage |
| Catalog intelligence | Reads local history/catalog | Add freshness/lifecycle evidence state and citation/provenance contract |
| Workbook generator | Uses low-level evaluation and partial gate | Export only an accepted artifact through delivery port |
| Remarks reconciliation | Pure formatting only | Require completed reconciliation, fresh baseline fingerprint, immutable original cells |
| Multi-cluster tender | Basic arithmetic only | Invoke canonical splitter and validate each cluster plus shared facility relationships |
| NotebookLM grounding | Present in canonical pipeline | Mandatory policy-driven stage; distinguish offline/degraded/pending/verified |
| Execution trace | Full only in canonical evaluation | Universal middleware for every customer workflow |
| Output validation | Post-hoc router metadata | Mandatory pre-delivery stage with exact track profiles |
| Adversarial validation | Standalone/random and naming conflation | Deterministic candidate gate plus separate reproducible red-team workflow |
| Continuous learning | Feedback path exists | Post-acceptance proposal only; promotion remains independently evidenced |
| Knowledge sync | Implemented with local/cloud states | Terminal stage with explicit policy; no success collapse |

## 6. Target architecture

```text
Adapters
  CLI | MCP | API | file | memory | OCR
        |
        v
RequestEnvelope + provenance
        |
Classifier (pure) -> WorkflowDefinition
        |
ScopeResolver -> ProductIdentity + DomainProfile + EvidenceSnapshot
        |
Ingestion -> NormalizedRequirements + NormalizedBom + ownership/quantity model
        |
Workflow Kernel (stage DAG + typed transitions)
  1 Intake/validation
  2 Scope/catalog/freshness
  3 Deterministic domain checks
  4 Cross-component/conflict checks
  5 Candidate synthesis (including least-delta)
  6 Independent candidate revalidation
  7 Document grounding / agentic advisory
  8 Acceptance gate
  9 Delivery authorization + artifact generation
 10 Learning proposal + synchronization
        |
        v
WorkflowResult (no ambiguous generic success)
```

### Layering rules

1. **Domain layer:** pure SKU/quantity/topology rules; no filesystem, network, process, clock, or UI calls.
2. **Application layer:** workflow stages and policies; depends on ports/interfaces, not concrete integrations.
3. **Infrastructure adapters:** catalog filesystem, NotebookLM, Gemini, OCA/CLIC, workbook, Google Sheets, telemetry.
4. **Entry adapters:** CLI, MCP, router, future API. They only translate inputs/outputs.
5. **Config/profiles:** product facts, capability declarations, support defaults, thresholds, and routing matchers.

### Required core contracts

- `RequestEnvelope`
- `ProductIdentity` / `DomainProfile`
- `NormalizedBom` and immutable `CustomerBaseline`
- `EvidenceState<T>` (`VERIFIED`, `MISSING`, `STALE`, `UNREADABLE`, `DEGRADED`, `NOT_APPLICABLE`)
- `StageResult<T>` with separate execution and outcome fields
- `CandidateManifest` with fingerprint and customer-distance delta
- `AcceptanceProfile` and `AcceptanceDecision`
- `DeliveryAuthorization`
- `WorkflowResult`
- `DomainError` taxonomy and stable error codes

## 7. Remediation sequence

### Phase 0 — Freeze contracts and inventory callers

1. Record every production caller of `evaluatePhysicalMath`, `evaluateBOQMultiAspect`, `runEvaluationPipeline`, exporters, verifier, guardrail, sync, and evidence APIs.
2. Classify each API as domain-internal, application, or adapter-facing.
3. Define the result/status/error schemas and stage transition rules before moving code.
4. Add deprecation annotations to bypass APIs; do not delete yet.
5. Define the exact list of customer-facing entry points and expected workflow definition for each.

**Exit criteria:** every production call site has an owner and migration destination; no ambiguous `success` semantics remain in the proposed contracts.

### Phase 1 — Build the workflow kernel and declarative registry

1. Replace the router switch with a registry of `WorkflowDefinition` records.
2. Implement stage prerequisites, mandatory/optional policy, typed skip reasons, and terminal-state validation.
3. Make evidence tracing middleware automatic from request creation through finalization.
4. Move trace ID, clock, fingerprint, runtime path, and ID generation behind injected services.
5. Convert skill categories:
   - ingestion adapters;
   - primary workflows;
   - enrichers;
   - universal gates.

**Exit criteria:** a workflow cannot call delivery unless every required predecessor emitted a valid terminal result.

### Phase 2 — Unify all BOQ evaluation entry points

1. Promote `runCanonicalEvaluation` (renamed to the application workflow service) as the sole public BOQ path.
2. Route file, text, and in-memory items through the same ingestion and pipeline.
3. Migrate MCP, router, multi-BOQ runner, workbook flow, reconciliation candidate evaluation, and future API callers.
4. Rename low-level APIs to make their limited scope explicit.
5. Remove serializer-side hidden evaluation fallbacks.

**Exit criteria:** input transport does not alter stages, evidence, or result schema.

### Phase 3 — Make domain evaluation registry-driven

1. Use `aspect_registry.js` from the production evaluator.
2. Replace count-based “7 aspect” completeness with required checker IDs from the selected versioned domain profile.
3. Reconcile and remove duplicated legacy `validate*Rules()` logic after rule-by-rule ownership mapping.
4. Move hardcoded product facts to profiles/catalog rules.
5. Make unsupported domain capabilities explicit `NOT_EVALUATED` blockers for certification.

**Exit criteria:** registering a domain/profile changes the real evaluator without editing the orchestrator; missing capability never becomes PASS.

### Phase 4 — Repair reconciliation and transformation workflows

1. Introduce strict two-BOM reconciliation contracts and separately named catalog-audit mode.
2. Enforce non-empty rows, quantity validity, immutable baseline fingerprint, exact product scope, and catalog availability.
3. Preserve discrepancy objects without shape-changing remaps.
4. Route cross-vendor, heterogeneous, multi-cluster, and RFP outputs into scoped canonical candidate evaluation.
5. Make remarks a post-reconciliation enrichment with baseline/catalog fingerprint verification.

**Exit criteria:** no empty baseline, syntax-only catalog proof, or unevaluated transformed candidate can produce a customer-ready disposition.

### Phase 5 — Put acceptance before delivery

1. Replace the claimed “14-point” gate with explicit, complete acceptance profiles per workflow.
2. Validate profile coverage at startup/build time.
3. Run acceptance after candidate/document checks and before any customer artifact export.
4. Require `DeliveryAuthorization` in workbook/report/Sheets adapters.
5. Keep OCA/CLIC acceptance independent and always visible.

**Exit criteria:** rejected/incomplete workflows can emit diagnostic evidence but cannot emit presentation-authorized artifacts.

### Phase 6 — Harden evidence, agentic, and learning semantics

1. Remove default PASS and require stage-specific result derivation.
2. Record every degraded path and caught error with stable code, source, stage, and policy.
3. Separate deterministic candidate revalidation from adversarial red-team validation.
4. Require expected fault manifests and reproducible seeds for adversarial runs.
5. Prevent agentic/advisory text from setting verification state.
6. Permit learning proposals only from retained evidence; keep promotion independent.
7. Make sync policy explicit for online/offline/deferred modes.

**Exit criteria:** evidence says exactly what executed, what was proven, what was skipped, and why; no prose model output can certify itself.

### Phase 7 — Remove duplication and dead code safely

Candidates for deprecation/removal after caller migration:

- `scripts/evaluators/agentic_eval.js` (superseded agent loop)
- duplicate route-level evaluation/evidence assembly
- evaluator fallbacks inside exporters
- overlapping budget/value entry semantics
- unused registry/barrel exports
- customer-specific maintenance scripts with absolute paths
- Windows-only root helper if the Node helper is feature-equivalent

For each candidate: prove no production caller, preserve required behavior in the owner module, document migration, then delete. Do not delete historical evidence or customer outputs.

**Exit criteria:** one owner per responsibility, no parallel legacy path, updated imports/manifests/docs.

### Phase 8 — Normalize folders and portability

Proposed production layout:

```text
scripts/
  app/
    workflows/        # workflow definitions and application services
    stages/           # reusable stage handlers
    contracts/        # schemas, status/error types
    policies/         # skip/degraded/delivery/acceptance policies
  domain/
    boq/
    topology/
    aspects/
    conflict/
    catalog/
    learning/
  adapters/
    cli/
    mcp/
    filesystem/
    notebooklm/
    gemini/
    portal/
    spreadsheet/
  config/
    products/
    domains/
    workflows/
  maintenance/
```

This move should be incremental and performed only after contract boundaries exist. Avoid a big-bang rename that mixes behavior changes with file moves.

Portability work:

- central `runtime_paths` provider;
- no `process.cwd()` for repository-owned outputs;
- no committed machine-specific absolute paths/errors;
- platform-neutral Node commands as canonical commands;
- shell-specific wrappers optional and outside core behavior;
- atomic writes for all mutable JSON state;
- explicit locking/concurrency policy for registries and telemetry.

**Exit criteria:** the same commands and output layout work from Windows, Linux, and macOS regardless of invocation directory.

### Phase 9 — Documentation and graph convergence

1. Generate subsystem manifests and workflow/skill coverage tables from the runtime registry.
2. Update architecture docs only after the code boundary is real.
3. Add production-only graph/complexity/cycle audit scopes.
4. Run `npm run update:graph` after significant code changes.
5. Record superseded modules and migration notes.

**Exit criteria:** skills, docs, manifests, graph, and code describe the same paths and stage policies.

## 8. Implementation batches and review checkpoints

To minimize regression risk, implement as small reviewable batches:

1. **Contracts only** — schemas/enums/error taxonomy, no behavior change.
2. **Workflow kernel** — stage DAG and trace middleware behind existing evaluator.
3. **BOQ item/file convergence** — router and MCP migrations.
4. **Pre-delivery acceptance** — block exporters without authorization.
5. **Reconciliation repair** — strict input and catalog evidence.
6. **Registry-driven aspects** — checker ownership migration.
7. **Skill workflow migrations** — OCR, RFP, cross-vendor, heterogeneous, multi-cluster, enrichers.
8. **Agentic/adversarial cleanup** — remove duplicate loop and split semantics.
9. **Dead code/folder cleanup** — only after graph/caller proof.
10. **Portability/config cleanup** — runtime paths and machine-state separation.

Each batch must include:

- changed contract and compatibility note;
- old and new call paths;
- failure/degraded behavior;
- evidence/status implications;
- rollback boundary;
- graph update when code topology changes.

Per repository policy, Antigravity/Gemini owns subsequent test execution and certification. This plan does not inherit the historical 168/168 benchmark and does not claim validation of future changes.

## 9. Definition of done

The remediation is complete only when all of the following are true:

1. Every customer-facing entry point uses the same workflow kernel.
2. File, text, OCR, and in-memory inputs produce equivalent stage semantics.
3. Every mandatory stage is present, terminal, and evidence-backed; skips are policy-coded.
4. Missing/stale/unreadable catalogs and sources never become PASS.
5. Acceptance runs before export and blocks presentation authorization.
6. Portal acceptance remains a distinct Tier 3 state tied to the exact manifest fingerprint.
7. Domain check completeness is ID/profile-based, not a numeric count.
8. Transformed/sized/optimized candidates are independently revalidated.
9. Agentic prose cannot set verification or learning promotion state.
10. Reconciliation requires valid non-empty inputs and exact scoped evidence.
11. There is one implementation owner for orchestration, agentic loop, value optimization, strategy synthesis, and evidence.
12. No decision-critical empty catches or implicit defaults remain.
13. All mutable JSON writes are atomic and concurrency-safe.
14. Runtime behavior is independent of OS and current working directory.
15. Skills, workflow registry, subsystem manifests, docs, and graph agree.
16. Dead code is removed only after caller proof; historical evidence remains preserved.

## 10. Recommended starting point

Begin with Phases 0–2, not folder moves. The highest-value first implementation is:

1. define `WorkflowResult`, `StageResult`, `EvidenceState`, and error contracts;
2. make `runCanonicalEvaluation` the required BOQ application boundary;
3. migrate router item input and MCP input to that boundary;
4. move acceptance before export;
5. remove the router's optional synthetic ledger for evaluation paths.

That sequence closes the largest silent-skip surface while preserving the current deterministic rule engine for later registry refactoring.
