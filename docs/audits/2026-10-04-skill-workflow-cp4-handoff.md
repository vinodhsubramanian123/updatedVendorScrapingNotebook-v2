# CP4 additive capability contracts — review handoff

4 October 2026. **AUTHORED; independent verification pending.** Author: Codex. Independent reviewer/test executor: Antigravity/Gemini. User cleared CP4 after independently verified CP3 (18 → 0 links, arithmetic/policy reviewed, 20/20 domain suites). [Plan revision 5.3](2026-10-04-skill-workflow-excellence-plan.md) and [checkpoint ledger](2026-10-04-skill-workflow-checkpoint-ledger.md) updated during authoring.

## Changes and boundaries

| File | Purpose |
| :--- | :--- |
| `scripts/config/skill_workflow_registry.js` | Immutable, import-safe declarations for all 28 skills, actual entrypoints, 17 existing route intents, applicability/scope, conditional handoffs, expected evidence and coverage limits |
| `scripts/lib/system/schemas.js` | Six opt-in Zod schemas for scope, handoff, entrypoint, capability, registry and adapter descriptor; original definitions and 23 exports preserved |
| `scripts/lib/contracts/vendor_adapter_contract.js` | Structural adapter interface: identifier, classification, scoped roles, unspecified-only support policy, glossary and optional portal extraction/acceptance |
| `scripts/maintenance/validate_skill_workflow_registry.js` | Static registry/path/export/schema/DAG checks, reverse/public inventory and assertion that runtime code does not consume registry |
| `tests/unit/test_skill_workflow_registry_contracts.js` | Twelve meaningful verifier cases, including negative contracts and disposable-process import checks; authored, not executed by Codex |

All customer router/evaluator, CLI flags, dashboard routes, MCP tool names, package configuration and result fields retain their prior source. The shared schema module adds declarations/exports only; no legacy parser/default/coercion changed. Registry activation is `UNUSED`. Only the maintenance validator and verifier suite import it. No package facade, runtime adapter, dispatcher, feature flag or shadow execution was enabled. No customer/live workflow, vendor portal, Drive/NotebookLM operation, commit or push occurred.

Scope/schema references describe **proposed capability handoffs, not legacy function signatures or outputs**. Conditional `next`/`requires` declarations are expectations for later composition, not evidence it runs today. Existing adapter/portal/taxonomy scaffolding is referenced; it does not implement the new interface automatically. HPE's current support default remains in its existing implementation until CP13 migration. Vendor X in the suite is a structural fixture descriptor, not CP15 conformance or a working vendor adapter.

## Evidence and known gaps

Reports are under `outputs/history/skill_workflow_excellence/2026-10-04/`:

- Pre-edit freeze: `cp0-baseline-2026-10-04T14-15-25-209Z-9100.json` (tool labels baseline preparation CP0; this is CP4's starting tree). 3,356 inputs / 2,637 protected; input fingerprint `6ea05ebbd5544bd7d608914dd4d34ca3244fba98fdfbc75d542c8cf4940df647`; protected fingerprint `5188ef875933e9a3ca297d56af91cefb352c8ecf986ce4e6c7471c83d2dcda77`.
- Original bytes: `cp4-pre-edit-documents.json` (schemas/plan/ledger); `cp4-original-schemas.js` is an exact old-source copy used for lint comparison only, never executed.
- Final contract/public/reverse report: `cp4-registry-2026-10-04T14-37-24-285Z-24812.json`. Five-source fingerprint `9f57e4f2b6ad03cce2c392fed3072f56b1132539b206634911f76f704e0be06f` includes the reviewer test file.
- `cp4-static-checks.json`: commands, exit codes/output and static-only classification.
- `cp4-final-workspace.json`: complete final tree, hashes and protected comparison. `cp4-final-author-receipt.json`: exact reviewed source/document hashes, diff scope, preserved schema definitions/exports and authorized protected exception.

Static results: 28/28 skills declared; 17/17 existing route intents represented; 31 referenced export files checked; 0 contract issues / 0 runtime registry consumers. Inventory contains 318 production modules: 196 have static declared-entrypoint dependency candidates; 122 lack such a candidate and need classification, **not presumed dead or unwired**. Every module remains in the reverse inventory with callers/export candidates. Public inventory has 173 package/CLI entries, 59 local HTTP bindings, 60 flag literals and 12 MCP declarations. Mounted URL/signature/result semantics and actual invocation are not proven by these records.

One dynamic import edge in `dashboard/routes/catalogs.cjs` and the missing `package.main` target `scripts/scrape_oca_solution.js` remain disclosed. No arbitrary replacement facade was chosen. Learned-memory consumption, complete router continuation, candidate checks, vendor policies and runtime traces remain their later checkpoints. No full F/C/H finding closes.

Syntax passed for five touched source/test files, including a static parse of the embedded isolated-import fixture. Source dependency cycles: 0 across 523 files. Maximum repository CC remains 130 across 314 files / 1,349 functions. Draft validation was split into declaration/dependency checks to avoid adding a CC 28 function.

Targeted offline lint reports **0 new warnings**, with one pre-existing `no-useless-escape` warning at `schemas.js:23`. The same warning was reproduced against exact original bytes. Dashboard-only historical clean lint cannot certify this broader source scope. An initial missing project-local executable was resolved by using the existing cached linter; no dependencies were installed. No legacy warning was suppressed or repaired outside scope.

Protected comparison allows exactly the new `scripts/config/skill_workflow_registry.js`. All 2,637 pre-existing protected files, including Antigravity's test/history updates, retain their content. A plain baseline-comparison command will flag the authorized addition; use the explicit exception in the final receipt, not a blanket bypass.

**CP0 isolated goldens remain pending.** CP4 unused authoring does not fill that requirement. Twelve fixture tests, isolated import execution, existing schema/affected-domain behavioral checks, independent contract/semantic review and live verification were not run by Codex. Dashboard build was not run; no dashboard source changed. Testing remains assigned to Antigravity/Gemini.

## Independent verification steps

1. Check final source hashes against the five-file fingerprint and final receipt; inspect that existing schema definitions and exports are intact and the authorized registry is the only protected addition. Review applicability/continuation/evidence declarations against actual skills and function semantics, not only matching names.
2. Run the authored isolated suite. It checks paths/exports, dangling/self/cyclic and duplicate declarations, true schema refs, unknown scope, adapter method presence, static binding discovery, registry immutability and no runtime consumers. Its import case uses a disposable working directory and rejects writes, child processes, network/timers, customer module imports and early process exit; a completion sentinel prevents a silent zero-exit pass.

```powershell
npm run test:isolated -- tests/unit/test_skill_workflow_registry_contracts.js
node scripts/maintenance/validate_skill_workflow_registry.js --save --report-dir outputs/history/skill_workflow_excellence/2026-10-04
```

3. Execute existing schema regression in the assigned isolated runner, and relevant core/router checks selected by actual consumers. Capture commands, counts, durations, source hashes, all not-run checks and resulting protected diffs. Do not indiscriminately run the full matrix. Keep ordinary runner history writes distinguished from customer/catalog/config changes.

```powershell
npm run test:isolated -- tests/unit/test_schemas.js
```

4. Reproduce targeted syntax/lint, source cycles and CC as needed. Expect the documented existing schema lint warning until a separately scoped correction. Review public inventory's unresolved mounts/dynamic edge/package facade without activating a fix here.
5. Mark CP4 `VERIFIED_INDEPENDENT` only after executed import/contract/legacy checks and independent semantic review. Preserve residual finding scope and missing CP0 goldens. No CP5 or behavior-changing checkpoint has started.

## Graph, rollback and lease

Code graph refreshed after final code changes through `npm run update:graph`; generated graph artifacts are explicitly allowed. Graphify warns about skill 0.9.61 versus package 0.9.63 and changed semantic community labels. No skill installation, LLM relabeling or semantic document refresh was attempted; structural graph refresh is not runtime verification.

Live owner-aware lease helper PID 23192 held the single writer lease throughout authoring and releases after final checks. For rollback, compare original snapshots and final hashes before reversing only the four new source/test files, appended schema hunk and owned documentation changes. Preserve CP3/Antigravity edits and report/graph history; do not reset/clean the shared checkout.
