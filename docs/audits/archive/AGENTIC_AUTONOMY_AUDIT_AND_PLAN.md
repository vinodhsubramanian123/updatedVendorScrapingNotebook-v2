# Agentic Solution Intelligence — Skills Review, Gap Audit & Remediation Plan

**Repo:** `vinodhsubramanian123/updatedVendorScrappingNotebook` (branch `main`)
**Scope:** `.agents/skills/`, Workflow 1 (OCA scraping), Workflow 2 (customer BOQ / query evaluation), agentic orchestration layer.
**Explicitly out of scope:** security hardening, React dashboard UI/UX.
**Audit date:** 2026-09-19

---

## 0. Executive summary

The codebase has the *components* of an autonomous vendor-intelligence system — CDP scraper, catalog builder, rule loader, conflict graph, agentic guardrail with tool-calling, RAG bridge, feedback loop, telemetry. What it does not yet have is a closed circuit between them. Four structural facts define the current state:

1. **The scrape produces a SKU list, not a rule engine.** Portal rules are captured as free text and never compiled into evaluable predicates, so the evaluator's real intelligence is hand-coded DL380 logic that cannot generalise to Alletra / Cray / Synergy / StoreEver.
2. **The second brain is disconnected at the decision layer.** RAG output never reaches the confidence score; the guardrail's RAG tool is called with the wrong signature and silently returns generic boilerplate; notebook routing falls through to the DL380 Gen12 notebook for every other product.
3. **The orchestrator is the Express server, not the agent.** Every "autonomous" CLI entry point is an HTTP call to `localhost:3000`, so nothing runs headless — which contradicts what `orchestrator-workflow-skill` tells an agent.
4. **Several success signals are fabricated.** Hardcoded step durations, an unconditional "Agentic Cross-Verification: COMPLETED", a constant `agreementScore: 0.95`, and a conflict graph whose audit loops mostly self-certify. These inflate exactly the numbers a customer would be shown.

Severity legend used throughout: **P0** correctness/trust bug shipping wrong answers · **P1** blocks autonomy · **P2** generalisation / scale · **P3** hygiene.

---

# PART A — Skills Review (`.agents/skills/`)

| Skill | Lines | Verdict |
|---|---|---|
| `oca-catalog-scraper` | 96 (+40 ref) | Good trigger, no failure procedures, stale status table, broken links |
| `oca-portal-navigator` | 60 | Descriptive not procedural; no SSO-expiry recovery steps |
| `boq-eval-skill` | 95 (+52 ref) | Good trigger; documents behaviour the code does not implement |
| `knowledge-sync-skill` | 66 | Embeds a `notebooks.json` snapshot that is already wrong vs. the real file |
| `orchestrator-workflow-skill` | 148 | Over-broad trigger; asserts headless agent orchestration that does not exist |
| `nlm-skill` | 939 (+2,941 ref) | 80% of the skill corpus, for a third-party CLI |

### A1 — Absolute local paths break every skill (P1)
Every skill links `file:///Users/macbookaira1466/Downloads/booktoSkill/...`. On any other machine, in CI, or for any agent that isn't on your laptop, these are dead. They also leak the local filesystem layout into the knowledge base.
**Fix:** replace with repo-relative paths (`scripts/lib/cdp.js`). Add a CI grep that fails on `file:///` or `/Users/` inside `.agents/`.

### A2 — Inverted effort ratio (P2)
`nlm-skill` + references ≈ 3,880 lines; `oca-catalog-scraper` + `boq-eval-skill` ≈ 283 lines. The skills encoding your proprietary domain knowledge — OCA DOM quirks, HPE physical-math rules, chassis taxonomy — are the thinnest.
**Fix:** move `nlm-skill` bulk into `references/` behind a ≤120-line SKILL.md, and expand the two core skills with the procedural content in A3.

### A3 — Skills describe architecture, not procedure (P1)
No skill tells an agent what to do in any failure state. Missing runbooks, all of which are real states the pipeline reaches:

- SSO session expired mid-scrape (`navigate_oca.js` polls 60×3s then throws — no guidance on what the agent does next)
- Rule #19 expansion assertion failed after retry (`scrape_oca_solution.js:154-166`)
- Staging post-flight audit failed; `failed_staging_*` directory preserved (`scrape_oca_solution.js` STEP 7)
- Chassis auto-detect returned `FUZZY` (0.70) or `FALLBACK` (0.0) (`catalog_discovery.js:autoDetectChassisDetailed`)
- `nlm` CLI absent / unauthenticated → silent degradation to local RAG (`notebook_query_utils.js:268-277`)
- `GEMINI_API_KEY` unset → guardrail returns `{error}` and the run continues
- QuickSpecs PDF download failed (warning only)
- Catalog exists but `rulesSource === 'NONE'`

**Fix:** add a `## Failure Modes & Recovery` table to each skill: *symptom → detection signal → agent action → escalation threshold*.

### A4 — Inconsistent trigger descriptions (P2)
`oca-catalog-scraper` and `boq-eval-skill` have proper "Use this skill to/for…" descriptions. The other three describe what they *are*. `orchestrator-workflow-skill`'s "refer to this whenever managing a complex task in this workspace" will either always fire or never fire.
**Fix:** rewrite all five descriptions as trigger conditions; make the orchestrator skill trigger on explicit multi-stage intents only ("run the full pipeline", "rescrape and re-evaluate", "why did this BOQ fail end to end").

### A5 — Stale-by-construction content (P2)
`oca-catalog-scraper` §3 pins a certified-products table "as of 2026-08-06" (2,568 SKUs, 6 products). `knowledge-sync-skill` embeds a `notebooks.json` block that already disagrees with the real file (skill shows `NOTEBOOK_ID_GEN11` placeholders; the real file has empty strings).
**Fix:** delete both tables; point at the machine-readable sources — `outputs/SCRAPED_CATALOGS.md` and `scripts/config/notebooks.json` — with an instruction to read them at runtime.

### A6 — The orchestrator skill promises autonomy the code cannot deliver (P0 for agent trust)
It states: *"For Autonomous AI Triggers: You (The AI Agent reading this document) are the workflow orchestrator."* Then routes the agent to `npm run scrape:auto`, `resolve:ambiguity`, `trace:view` — all of which are HTTP POSTs to `localhost:3000` (`cli_tools.js:14-32`). Without the dashboard running, every one fails with "Is the Dashboard Express backend running?".
**Fix:** either (a) ship the headless runner (task **B1**) and keep the claim, or (b) state plainly that the dashboard must be up and list the direct `node scripts/*.js` equivalents. Do (a).

### A7 — `boq-eval-skill` documents unimplemented behaviour (P0 for agent trust)
It claims "Dynamic Routing: dynamically derives the target Notebook ID via `notebooks.json` to prevent cross-pollination of vendor constraints." `eval_boq.js:30-38` reads only `defaultNotebookId`. It also implies RAG certification feeds the result; it does not (see C3).
**Fix:** correct the skill *after* fixing the code (tasks **C2**, **C3**), not before.

### A8 — No skill for the vendor-agnostic direction (P2)
Every skill is HPE/OCA-shaped, but the stated direction is multi-vendor (Dell, Lenovo, Cisco, Juniper). There is no skill describing the vendor-adapter contract a new portal must satisfy.
**Fix:** add `vendor-adapter-skill` once **B6** defines the interface.

---

# PART B — Workflow 1: Scraping / Intelligence Extraction

### B1 — No headless orchestration (P1)
`cli_tools.js:14-32` wraps `scrape:auto`, `resolve:ambiguity`, `trace:view` as HTTP calls to the Express server. `scrape_oca_solution.js` itself is directly runnable, but the "autonomous" surface is not.
**Fix:** `scripts/orchestrate.js` — a dependency-free runner exposing `scrape`, `build`, `sync`, `eval`, `verify`, `full-cycle`, emitting the same `STRUCTURED_PROGRESS` events, writing the same run-trace ledger, with `--json` and non-zero exit codes. The dashboard becomes one consumer of it, not the owner.

### B2 — One product per invocation (P1)
`scrape_oca_solution.js:76-95` discovers **all** solution-tree nodes into `treeInfo.options` and logs them, then STEP 2 (lines 96-112) clicks a title matching `/Gen12|Gen11|#1/` and selects `option.last()`. There is no iteration, no queue, no resume. Portfolio coverage is therefore a manual, human-paced loop.
**Fix:** persist the discovered node list to `outputs/temp/scrape_queue.json` with per-node status (`PENDING|IN_PROGRESS|DONE|FAILED|SKIPPED`), loop STEP 2→8 per node, resume from the queue on restart, `--node <index|name>` and `--all` flags, and a per-node timeout that marks `FAILED` and continues rather than aborting the run.

### B3 — Hardcoded product identity in the "100% generic" scraper (P1)
- `scrape_oca_solution.js:39` — fallback navigation hardcodes `navigateToOCAChassis('DL380 Gen12')`
- `scrape_oca_solution.js:99-104` — node selector greps titles for `Gen12`, `Gen11`, `#1`
- `navigate_oca.js` — default chassis arg `'DL380 Gen12'` in both the function and the CLI runner

The file header asserts "NO Hardcoded Product IDs, Families, or Absolute Paths."
**Fix:** derive the target from the queue entry (**B2**) or a required `--chassis-query` argument; fail loudly with the discovered node list when no target is given, rather than silently defaulting to DL380.

### B4 — Fixed sleeps instead of readiness polling (P1)
`sleep(2500)`, `sleep(4000)`, `sleep(3000)`, `sleep(2500)`, `sleep(2000)` between STEP 1→3.5, plus `setTimeout(3000/5000/6000)` inside `navigate_oca.js`. On a WebLogic portal under variable load this is the dominant flake source, and it is also pure wall-clock waste across a multi-node run (**B2**).
**Fix:** `waitForStable(ws, {selector|metric, quietMs: 800, timeoutMs: 30000})` — poll `scrollHeight` + table count + row count until two consecutive identical samples, then proceed. Replace every fixed sleep. Log actual wait time (feeds **C5**: real durations).

### B5 — Rule #19 completeness gate is too weak (P1)
`scrape_oca_solution.js:154` / `:161` accept `scrollHeight >= 15000 || totalRows >= 50 || tablesCount >= 10`. A page that expands 40% with 60 rows passes and is promoted to the live workspace as a complete catalog.
**Fix:** derive an expected subcategory count from the solution tree and the `(max N)/(required)` header regex, and assert `capturedSubcategories >= 0.95 × expected` **and** `unclassifiedSubcats === 0` (currently only a warning at `build_catalog.js:202-205`). Record the measured completeness ratio in catalog metadata so downstream eval can see partial catalogs.

### B6 — Portal rules are never compiled into rules (P0 — the central gap)
`build_catalog.js:228-243`: any table row above the header row, between 5 and 300 chars, is pushed into `tableRules` as a raw string. `catalog_rules.js:26 classifyRule()` then keyword-guesses a level and a `ruleType` from that string (`includes('requires')` → SKU/DEPENDENCY_CHAIN, etc.). No operands are ever extracted — no subject SKU, no object SKU, no quantity, no condition. The only structured constraint that survives the pipeline is subcategory `maxQty` from the `(max N)` regex.

Consequence: the evaluator cannot use the scrape. All real dependency logic lives hardcoded in `boq_evaluator.js` / `conflict_graph.js` as DL380 physical math, which is why the system does not generalise across families.

**Fix — structured rule IR.** Emit `<prefix>_Catalog_Rules.json` v2 with typed predicates:

```json
{
  "schemaVersion": 2,
  "rules": [
    { "id": "R-0142", "level": "SKU", "type": "REQUIRES",
      "subject": {"sku": "P47777-B21"},
      "object":  {"sku": "P01366-B21", "qty": 1},
      "condition": null, "strict": true,
      "source": {"table": 37, "row": 2, "rawText": "..."},
      "confidence": 0.92, "extractor": "regex:requires-v1" }
  ],
  "unparsed": [ { "rawText": "...", "table": 37, "reason": "NO_PATTERN_MATCH" } ]
}
```

Types: `REQUIRES`, `EXCLUDES`, `MUTUALLY_EXCLUSIVE`, `MAX_QTY`, `MIN_QTY`, `REQUIRES_ONE_OF`, `CHASSIS_GATE`, `SUPPLY_CONSTRAINT`, `ADVISORY`. Every raw string must land in either `rules[]` or `unparsed[]` — no silent loss — and `unparsed[]` becomes the backlog that drives extractor improvement (and is a legitimate NotebookLM/LLM extraction target, offline and cached, never at eval time).

### B7 — "Incremental differential scraping" is post-hoc (P2)
`computeIncrementalDifferential` is invoked at `build_catalog.js:500`, after the full page has already been scraped and parsed. Nothing is skipped; nothing is saved on the expensive step. The companion log claims `~N API tokens saved` while no LLM exists in the classification path — a fabricated metric (see C5).
**Fix:** move the checksum decision to the front: hash the raw extracted text/tables per node and skip build+xlsx+audit when unchanged (still record the "checked, unchanged" event). Delete the token-savings claim, or make it real once **B6**'s LLM-assisted extractor for `unparsed[]` exists.

### B8 — No staleness model or scheduling (P1)
No cron, no TTL, no scheduler anywhere in `scripts/`. Catalogs never re-verify, and `eval_boq` does not know or care how old its rules are.
**Fix:** `catalogAgeDays` + `lastVerifiedAt` in catalog metadata; a `stale` threshold (suggest 30d) that (a) emits a warning into the BOQ report, (b) applies a small confidence deduction, and (c) enqueues a re-scrape in the **B2** queue. Add `orchestrate.js refresh --older-than 30d` for cron/CI.

### B9 — CLIC is implemented and unused — the largest autonomy win available (P1)
`cdp.js:277 triggerClicCheck(ws, level)` clicks the portal's own Configuration Language & Inspection Check and scrapes `errorText`, `rootCause`, `recommendedSkus`. It is referenced only by `inspect_oca_session.js`, `test_live_clic.js` and an export assertion in `test_all_aspects.js`. Meanwhile the entire closed-loop learning story depends on a human building the config in the portal and pasting the rejection string into a modal.
**Fix:** `scripts/portal_trial.js` — take a ranked solution's `skuPartsList`, drive the OCA configurator via CDP, run `triggerClicCheck`, parse errors, and feed them straight into `processPortalFeedback()` as machine-sourced KnowledgeDeltas (tagged `source: 'CLIC_AUTO'`, distinct from `HUMAN_HITL`, with a lower initial trust weight until corroborated). This converts stage 5-6 of the lifecycle from human-paced to autonomous, and is also the cheapest way to bootstrap **B6**'s rule corpus: the portal will state its own constraints.

### B10 — Duplicate scraper lifecycles (P2)
`scrape_oca_storage_solution.js` (342 lines) is a fork of `scrape_oca_solution.js` (363 lines). Two copies of connect → expand → assert → extract → build → audit → promote, guaranteed to diverge.
**Fix:** extract `lib/scrape_lifecycle.js` with a strategy object per portal surface (`solutionTree`, `storageWizard`), each supplying only its navigation and expansion steps. This is also the seam where the multi-vendor adapter (**A8**) plugs in.

### B11 — Catalog data-quality gate is advisory (P2)
`build_catalog.js` runs `validateCatalogData` and logs warnings/errors, but `unclassifiedSubcats > 0` is only a `console.warn` (`:202-205`), and the promotion gate at STEP 7 is the Excel tally audit alone.
**Fix:** promote validator errors + unclassified-subcategory count + **B5** completeness ratio into the staging gate. Any failure preserves `failed_staging_*` (already implemented) and exits non-zero.

---

# PART C — Workflow 2: Customer Query / BOQ Evaluation

### C1 — 🔴 The guardrail's RAG tool never asks the agent's question (P0)
`agentic_guardrail.js:121-131`:

```js
const payload = { messages: [{ role: 'user', content: args.query }],
                  metadata: { chassisId: args.chassis_id } };
result = await executeNotebookQuery(payload);
```

The signature is `executeNotebookQuery(notebookId, rawQuery, options = {})` (`notebook_query_utils.js:254`). Therefore:

- `notebookId` = the payload **object** → passed into `execFile('nlm', [... notebookId ...])` as `[object Object]`
- `rawQuery` = `undefined` → `sanitizeNotebookQuery` returns its hardcoded default: *"What are the hardware configuration rules and QuickSpecs specifications for this chassis?"*
- `options.context` = `undefined` → chassis defaults to `'HPE ProLiant DL380 Gen12 SFF'` regardless of the actual chassis

Every `query_notebooklm` call in the autonomous loop returns generic DL380 boilerplate (or a local-RAG fallback on the same generic string). The model then treats it as a fact-check, may act on it, and per the system instruction *"YOU MUST call `record_knowledge_delta`"* — so a fabricated rule can be persisted.
**Fix:** `executeNotebookQuery(resolveNotebookId(args.chassis_id), args.query, { context: { chassis: args.chassis_id } })`. Add a runtime assertion that `rawQuery` is a non-empty string and **throw** rather than substituting a default; a silent default is what hid this. Add a unit test asserting the sanitized query contains a distinctive token from the caller's question.

### C2 — Notebook routing does not exist in the headless path, and falls through everywhere (P0)
- `eval_boq.js:30-38 getDefaultNotebookId()` reads only `cfg.defaultNotebookId`. The per-chassis `notebooks` map is read only by `dashboard/server.cjs` (lines 969-975, 1038-1043, 1386-1392) and `knowledge_sync.js`.
- `scripts/config/notebooks.json` has **empty strings** for `DL380_Gen11`, `Alletra_Storage_System`, `MSL3040_Tape`, `GX5000_General_RACK`, `SY100Gb_F32_Module`. Every consumer uses `cfg.notebooks[x] || cfg.defaultNotebookId`, and `"" ` is falsy — so even the dashboard path silently falls back to the DL380 Gen12 notebook.

An Alletra or MSL3040 BOQ is therefore "grounded" against DL380 Gen12 QuickSpecs and reported as verified. This is the exact cross-pollination `boq-eval-skill` and `knowledge-sync-skill` claim to prevent.
**Fix:** single `lib/notebook_registry.js` with `resolveNotebookId(chassisPrefix)` used by *all* callers (eval, guardrail, dashboard, knowledge sync). On missing/empty ID: do **not** fall back — return `{ id: null, reason: 'NO_NOTEBOOK_MAPPED' }`, skip RAG, and mark the report `RAG: SKIPPED (no notebook mapped for <chassis>)`. Treat empty string as missing in schema validation, and add a CI check that every catalog in `SCRAPED_CATALOGS.md` has either a mapped notebook or an explicit `"none"`.

### C3 — RAG never affects the confidence score (P0)
`feedback_loop.js:183-189` branches on `evalResults.ragVerified` (+0.05) and `evalResults.ragViolationDetected` (−0.15). Repo-wide grep: **neither property is ever assigned**. Both branches are dead. The "Dual-Brain" is single-brain wherever a decision is actually made; RAG is a UI badge.
**Fix:** define a RAG reconciliation step that returns `{ agreements[], contradictions[], unsupported[] }` by matching RAG claims against the rule-engine findings, set `ragVerified` / `ragViolationDetected` from it, and recompute confidence **after** reconciliation. Until that step runs, the score must be labelled `PRE_RAG` rather than presented as final.

### C4 — The agentic guardrail is late, unidirectional and mis-scoped (P1)
- Fires only when `confidence.isHitlTriggered` (score < 0.75) — `eval_boq.js:261`. A confidently-wrong BOQ (the dangerous case) never gets a second opinion.
- Its output is stored as prose in `agenticExplanation`; the code comment concedes *"Re-evaluate if we want"*. No re-scoring, no fix injection, no effect on the ranked matrix.
- `record_knowledge_delta` writes to `path.join(..., 'outputs', 'ProLiant', 'Gen12', args.chassis_id)` — hardcoded (`agentic_guardrail.js:135`). Agent-learned Alletra/Cray/Synergy rules land under the ProLiant Gen12 tree and are invisible to the chassis they describe on the next run.
- `MODEL_NAME = 'gemini-3.5-flash'` hardcoded (`:10`), no fallback, no model-availability check.
- Missing `GEMINI_API_KEY` returns `{ error }` which `eval_boq` prints but never surfaces as a degraded-mode flag in the report or JSON payload.

**Fix:** (a) trigger on `isHitlTriggered || contradictions.length > 0 || rulesSource === 'NONE' || catalogStale`; (b) require the loop to return a structured verdict (`{ verdict, proposedFixes[], evidence[] }`) and re-run `evaluatePhysicalMath` with proposed fixes applied, so the loop closes; (c) resolve the delta output directory from `catalog_discovery.listAllCatalogs()` by chassis id, never a hardcoded family path; (d) move the model to `.env` with a documented default and log the resolved model in telemetry; (e) emit `degradedMode: ['NO_GEMINI_KEY']` into the JSON result and the report header.

### C5 — Fabricated telemetry and success signals (P0 for trust)
- `eval_boq.js:405+` — `workflowSteps[].durationMs` are literals `120, 180, 310, 220, 150`.
- Same file — `telemetry: { parsingTimeMs: 120, cleaningTimeMs: 180, rulesTimeMs: 210, rankingTimeMs: 160, ragTimeMs: 340 }` are literals; only `totalEvalTimeMs` is measured.
- Step 4 *"Agentic AI Cross-Verification"* is `status: 'COMPLETED'` **unconditionally**, with narrative detail asserting Gemini "verified zero cable/TDP thermal regressions" — emitted even when the guardrail never ran, or returned an error, or no API key exists.
- Step 3 claims `COMPLETED` for a RAG consultation that was merely *formatted for dispatch*.
- `notebook_query_utils.js` records `agreementScore: 0.95` as a constant on every completed job.
- `build_catalog.js:503` logs `~N API tokens saved` where no LLM is in the path.

`AGENTS.md` §1 states "No Mock Stubs… UI metrics must be derived dynamically from JSON metadata." These violate it, and they are precisely the numbers that would end up in front of a customer.
**Fix:** instrument real timers around each phase (`process.hrtime.bigint()`); derive every step status from actual execution (`COMPLETED | SKIPPED | FAILED | DEGRADED` with a reason string); compute `agreementScore` from the C3 reconciliation or omit it; delete the token-savings log. Add a CI grep denying literal `durationMs:` integers in `eval_boq.js`.

### C6 — The conflict graph self-certifies (P0)
- **CHASSIS level** (`conflict_graph.js:543-562`): the loop's terminal `else` records `PASS — "Chassis gate passed for <formFactor>"` for *any* rule that isn't EDSFF or 8LFF. Unknown rules become evidence of compliance.
- **SKU/SUBCATEGORY level** (`:607+`): the loop iterates `missingDependencies` — the fixes the engine *itself just injected* — and every branch records `PASS`, including the terminal `else`: `"Fix SKU <x> passed graph validation."` Nothing validates the customer's original BOM at SKU level.
- `totalRulesEvaluated = rulesEvaluated.length + auditLog.length` therefore counts self-PASSes, and `isWholeSolutionValid = conflicts.length === 0 && unresolvedConflicts.length === 0` is structurally biased toward `true`.

**Fix:** three statuses only — `PASS` requires a rule that was *applicable and satisfied*; inapplicable rules record `NOT_APPLICABLE` and are excluded from the evaluated count; unrecognised rules record `UNEVALUATED` and **reduce** confidence. Report `rulesEvaluated / rulesApplicable / rulesUnevaluated` separately in the report and JSON.

### C7 — Scraped rules are parsed, then dropped (P0, pairs with B6)
`catalog_rules.js` classifies rules into VENDOR / CHASSIS / CATEGORY / SUBCATEGORY / SKU with types including `DEPENDENCY_CHAIN`, `MUTUAL_EXCLUSION`, `QUANTITY_CONSTRAINT`. `conflict_graph.js` filters `parsedRules` exactly once — `:543`, `level === 'CHASSIS'`. Every VENDOR, CATEGORY, SUBCATEGORY and SKU rule extracted from the portal is discarded.

What *does* execute (`:566-604`) is hardcoded DL380-flavoured logic — x4/x8 bit-width mixing, 96GB capacity mixing, AC/DC PSU mixing — and it runs unconditionally against Alletra, Cray, Synergy and StoreEver BOQs, emitting confident `PASS` audit lines for rules that were never applicable to those products.
**Fix:** build the evaluator against the **B6** IR: a generic predicate interpreter (`REQUIRES`, `EXCLUDES`, `MAX_QTY`, …) that consumes all five levels plus `LEARNED_DELTA`. Demote today's hardcoded checks to a `families/proliant.js` plugin, loaded only when `chassisInfo.family` matches, with `families/<x>.js` stubs for the rest. Assert in tests that an Alletra BOQ produces zero ProLiant-specific audit lines.

### C8 — The 5-tier resolution matrix is a template, not a search (P1)
`conflict_graph.js:175-400 synthesize5TierRankedSolutions()`:

- Rank names and `reasoning` strings are literals; only `fixes.length` varies.
- Scores are arithmetic on fix count (`0.93 - fixes.length*0.02`, floors 0.70/0.65/0.60/0.55/0.50) — not a function of workload fit, price, or buildability.
- Ranks 2-4 append static SKUs from `scripts/config/strategy_addons.json`, keyed by a three-way branch (`:249-256`): `'dl380'`, `'alletra'`, else `'default'`. Cray, Synergy, StoreEver and every future product get `default`.
- Addon SKUs are **never validated against the chassis catalog** — they aren't checked for existence, category fit, or conflict with the base BOM.
- Data contradiction: `P76453-B21` is documented as a *Box 1/2 Cable Kit* in `boq-eval-skill` (and referenced that way in the storage aspect) but as an *"HPE DL380 Gen12 Primary/Secondary Full PCIe x16 Riser Kit"* in `strategy_addons.json`. One is wrong; nothing detects it.
- `budgetBreakdown.strategyAddonCost` is hardcoded `250 / 850 / 1850` while `estimatedCostUsd` sums real per-part prices — the two fields disagree inside the same object.
- `ragSecondOpinion` is the literal string `'⏳ Pending QuickSpecs Verification...'` on every tier and is never updated in the headless path.

**Fix:** (a) validate every addon SKU against the loaded catalog at startup and fail the run on unknown/miscategorised SKUs — this alone catches the `P76453-B21` contradiction; (b) compute `strategyAddonCost` from the mapped parts; (c) replace fixed tiers with candidate generation over catalog-valid options scored on (workload-DNA fit, buildability after re-validation, delta cost), re-running the conflict graph per candidate so no ranked solution can be unbuildable; (d) drop the RAG placeholder string in favour of the C3 reconciliation state.

### C9 — Confidence scoring is arbitrary and uncalibrated (P1)
`feedback_loop.js:149-200`: −0.25 per error, −0.10 per warning, +0.10 if fixes were injected and no errors remain, ±RAG (dead, C3), clamp 0-1, HITL below 0.75. The magnitudes are unjustified, the error/warning classification drives everything, and three warnings cost less than two errors regardless of severity.
**Fix:** score from explicit components — rule coverage (`applicable/evaluated`, feeding C6), unresolved-conflict severity, catalog staleness (B8), chassis-detection confidence, RAG agreement (C3) — each logged with its contribution. Calibrate against the CLIC ground truth from **B9**: a BOQ CLIC accepts should score high; one it rejects should not.

### C10 — Query sanitizer bugs (P2)
- `notebook_query_utils.js:132` — `SCRIPTING_PATTERNS.some(p => p.test(clean))` calls `.test()` on `/g` regexes. `lastIndex` persists across calls, so identical inputs classify differently depending on call order. Same pattern in `getSanitizationBreakdown`.
- `SCRIPTING_PATTERNS` includes `/\{\s*[\s\S]*?\}/g`, which strips any brace-delimited span — including legitimate BOQ notation — and is a primary reason real questions degrade into the generic fallback string.
- When code *is* detected, the original question is **discarded entirely** and replaced by a template sentence plus extracted SKUs. Combined with C1, this is how a specific dependency question becomes generic boilerplate.

**Fix:** use `new RegExp(source)` without `/g` for detection (or reset `lastIndex`); narrow the brace pattern to fenced code and `require(`/`=>` constructs; preserve and *append* the user's question rather than replacing it; unit-test that a question survives sanitisation with its distinctive tokens intact.

### C11 — Async RAG job ledger is ephemeral and single-consumer (P2)
`notebook_query_utils.js`: `activeQueryJobs` is an in-process `Map`; `getAsyncNotebookQueryJobStatus` **deletes** the job on the first read after completion, so a second poller gets `null`. Nothing survives a restart, and a headless run has no consumer at all.
**Fix:** persist jobs to `outputs/history/rag_jobs/<jobId>.json`, keep completed jobs for a TTL instead of deleting on read, and have the headless orchestrator (**B1**) await/poll them so CLI runs get the same RAG enrichment the dashboard does.

### C12 — Chassis auto-detection has no learning and no memory (P2)
`catalog_discovery.js:autoDetectChassisDetailed` returns EXACT 0.95 / EXACT 0.90 / FUZZY 0.70 / FALLBACK 0.0; `eval_boq.js:98-131` hard-fails below 0.75 with `ERR_UNKNOWN_CHASSIS`. Correct behaviour, but the resolution is never remembered — the same ambiguous BOQ shape fails identically forever.
**Fix:** on human/agent confirmation, persist a `boqSignature → chassisDir` mapping (base SKU set, description fingerprint) and consult it first on subsequent runs, with provenance so a bad mapping can be revoked.

### C13 — Test suite does not test what matters (P1)
- `npm test` → `verify_all.js`, essentially a require-smoke-test; it reported **success with 0 catalogs found** in a clean checkout.
- `npm run lint` → `echo 'No lint errors'`, while `lint.txt` holds 46 KB of findings and `lint.json` is empty.
- All 19 E2E scenarios are DL380-shaped. Assertions like *"Synthesized exactly 5 ranked solution tiers"* test template shape, not correctness.
- Nothing asserts cross-chassis isolation, notebook routing, RAG→score wiring, or audit-status honesty.

**Fix:** real `eslint` in `npm run lint` with a zero-error gate on `scripts/` (baseline the existing 46 KB, ratchet down). Add: a golden-file test per family; a cross-contamination test (Alletra BOQ → no ProLiant audit lines); a routing test (Alletra → no notebook mapped → `RAG: SKIPPED`, never DL380); a telemetry-honesty test (no literal durations; step status matches execution); a C6 audit-status test (a catalog with one applicable rule yields `rulesApplicable === 1`, not 18).

---

# PART D — Prioritised Remediation Plan

### Phase 0 — Stop shipping wrong answers (1-2 days)
| # | Task | Files | Done when |
|---|---|---|---|
| 0.1 | Fix guardrail RAG call signature + assert non-empty query | `agentic_guardrail.js:127`, `notebook_query_utils.js:254` | Unit test proves the agent's question reaches `nlm`; `undefined` query throws |
| 0.2 | Central `resolveNotebookId`; no fallback on missing/empty | new `lib/notebook_registry.js`, `eval_boq.js:30`, `agentic_guardrail.js`, `server.cjs`, `knowledge_sync.js` | Alletra BOQ reports `RAG: SKIPPED`, never DL380 |
| 0.3 | Fix agentic delta output path (family-resolved) | `agentic_guardrail.js:135` | Cray delta lands under `outputs/Cray/...` and is read on next eval |
| 0.4 | Delete fabricated metrics; derive real timings + step status | `eval_boq.js:405+`, `notebook_query_utils.js`, `build_catalog.js:503` | No literal `durationMs`; step 4 shows `SKIPPED` when guardrail didn't run |
| 0.5 | Audit-status honesty: `PASS / NOT_APPLICABLE / UNEVALUATED` | `conflict_graph.js:543,607` | `rulesApplicable` ≠ `rulesEvaluated` on a real BOQ; unevaluated rules cut confidence |
| 0.6 | Validate `strategy_addons.json` SKUs against catalog at load | `conflict_graph.js:249-256`, `config/strategy_addons.json` | `P76453-B21` description conflict fails the run; `strategyAddonCost` computed |
| 0.7 | Surface degraded modes (`NO_GEMINI_KEY`, `NO_NLM`, `NO_RULES`, `STALE_CATALOG`) | `eval_boq.js`, report header, JSON payload | Report header lists active degradations |

### Phase 1 — Close the loops (3-5 days)
| # | Task | Depends on | Done when |
|---|---|---|---|
| 1.1 | Headless `scripts/orchestrate.js`; dashboard becomes a consumer | — | Full cycle runs with Express stopped; `cli_tools.js` delegates locally |
| 1.2 | RAG reconciliation → `ragVerified` / `ragViolationDetected` → re-score | 0.1, 0.2 | Contradiction demonstrably moves the score; `PRE_RAG` label until reconciled |
| 1.3 | Guardrail returns structured verdict + proposed fixes; re-evaluate; widen trigger | 1.2 | A high-score-but-contradicted BOQ triggers the loop and the score changes |
| 1.4 | Persist async RAG jobs; TTL instead of delete-on-read | — | Headless run receives RAG output; second poll still returns the job |
| 1.5 | `portal_trial.js` — CDP build + CLIC → auto KnowledgeDelta (`source: CLIC_AUTO`) | 1.1 | A known-bad BOQ produces a CLIC-sourced delta with no human paste |
| 1.6 | Sanitizer regex-state + brace fixes; preserve original question | — | Question tokens survive sanitisation; repeated calls classify identically |

### Phase 2 — Make it generalise (1-2 weeks)
| # | Task | Depends on | Done when |
|---|---|---|---|
| 2.1 | Structured rule IR v2 + `unparsed[]` backlog | — | Every raw rule string lands in `rules[]` or `unparsed[]`; coverage % reported |
| 2.2 | Generic predicate interpreter consuming all 5 levels + `LEARNED_DELTA` | 2.1, 0.5 | Scraped `REQUIRES` rules produce real findings on a real BOQ |
| 2.3 | Move DL380 physical math to `families/proliant.js`; stub other families | 2.2 | Alletra BOQ emits zero ProLiant audit lines (test) |
| 2.4 | Multi-node scrape queue + resume + per-node timeout | 1.1 | One command scrapes all discovered nodes; kill -9 mid-run resumes cleanly |
| 2.5 | Readiness polling replaces every fixed sleep | — | Median scrape wall-time down; expansion failures fall to near-zero across 10 runs |
| 2.6 | Strengthen Rule #19: subcategory-count completeness + validator gate | 2.5 | A deliberately half-expanded page fails staging and preserves `failed_staging_*` |
| 2.7 | Remove hardcoded `DL380 Gen12` defaults; require explicit target | 2.4 | No product identifier remains in `scrape_oca_solution.js` / `navigate_oca.js` |
| 2.8 | Candidate-generated ranked solutions, each re-validated | 2.2 | No ranked tier can be unbuildable; scores vary with workload fit, not fix count |

### Phase 3 — Keep it honest and current (ongoing)
| # | Task | Done when |
|---|---|---|
| 3.1 | Catalog staleness metadata + `refresh --older-than` + confidence penalty | Stale catalog warns in report and enqueues re-scrape |
| 3.2 | Front-load incremental checksum; delete token-savings claim | Unchanged node skips build/xlsx/audit |
| 3.3 | Unify scraper lifecycle behind strategies; define vendor-adapter contract | Storage + solution share one lifecycle; adapter interface documented |
| 3.4 | Confidence recalibration against CLIC ground truth | Score correlates with CLIC accept/reject across a labelled set |
| 3.5 | Real eslint gate; cross-chassis, routing, telemetry-honesty, audit-status tests in CI | `npm test` fails on a seeded regression for each Phase-0 bug |
| 3.6 | Chassis-detection memory (`boqSignature → chassisDir`) | A previously-confirmed ambiguous BOQ resolves without prompting |

### Phase 4 — Skills rewrite (after Phases 0-2 land)
| # | Task | Done when |
|---|---|---|
| 4.1 | Repo-relative paths everywhere; CI grep denies `file:///` and `/Users/` in `.agents/` | CI green on a clean clone |
| 4.2 | `## Failure Modes & Recovery` table in all five core skills (the 8 states in A3) | Each state has detection signal → action → escalation |
| 4.3 | Rewrite descriptions as trigger conditions; narrow the orchestrator trigger | Orchestrator fires only on explicit multi-stage intents |
| 4.4 | Delete embedded status tables/config snapshots; point at `SCRAPED_CATALOGS.md` + `notebooks.json` | No "as of <date>" claims remain |
| 4.5 | Compress `nlm-skill` to ≤120 lines + references; expand scraper/eval skills with real procedure | Core-skill line count exceeds third-party-skill line count |
| 4.6 | Correct `boq-eval-skill` routing/RAG claims to match post-fix behaviour | Skill statements verifiable against code |
| 4.7 | Add `vendor-adapter-skill` defining the contract for a new vendor portal | A new portal can be onboarded from the skill alone |

---

## E. Gap register — every finding mapped to a task

| ID | Finding | Sev | Task |
|---|---|---|---|
| A1 | Absolute `file:///Users/...` paths in all skills | P1 | 4.1 |
| A2 | Skill effort ratio inverted toward `nlm-skill` | P2 | 4.5 |
| A3 | No failure/recovery procedures in any skill | P1 | 4.2 |
| A4 | Inconsistent / over-broad skill triggers | P2 | 4.3 |
| A5 | Stale embedded status + config tables | P2 | 4.4 |
| A6 | Orchestrator skill promises headless autonomy | P0 | 1.1 + 4.3 |
| A7 | `boq-eval-skill` documents unimplemented routing/RAG | P0 | 4.6 |
| A8 | No vendor-adapter skill for multi-vendor direction | P2 | 3.3 + 4.7 |
| B1 | CLI entry points require the Express server | P1 | 1.1 |
| B2 | One product per scrape invocation; no queue/resume | P1 | 2.4 |
| B3 | Hardcoded `DL380 Gen12` / `Gen11` / `#1` in generic scraper | P1 | 2.7 |
| B4 | Fixed sleeps instead of readiness polling | P1 | 2.5 |
| B5 | Rule #19 completeness gate too weak | P1 | 2.6 |
| B6 | Portal rules never compiled into predicates | P0 | 2.1 |
| B7 | Incremental diff is post-hoc; fake token savings | P2 | 3.2 + 0.4 |
| B8 | No staleness model or scheduling | P1 | 3.1 |
| B9 | CLIC implemented but unused | P1 | 1.5 |
| B10 | Duplicate storage/solution scraper lifecycles | P2 | 3.3 |
| B11 | Catalog validator findings are advisory only | P2 | 2.6 |
| C1 | Guardrail RAG call uses wrong signature → generic boilerplate | P0 | 0.1 |
| C2 | Notebook routing absent in CLI; empty IDs fall through to DL380 | P0 | 0.2 |
| C3 | `ragVerified` / `ragViolationDetected` never assigned | P0 | 1.2 |
| C4 | Guardrail late, unidirectional, wrong delta path, hardcoded model, silent no-key | P1 | 0.3, 0.7, 1.3 |
| C5 | Fabricated durations, unconditional step status, constant agreement score | P0 | 0.4 |
| C6 | Conflict graph self-certifies; inflated rule counts | P0 | 0.5 |
| C7 | Scraped non-CHASSIS rules dropped; DL380 logic runs on all families | P0 | 2.2, 2.3 |
| C8 | Ranked matrix is a template; unvalidated addons; cost fields disagree | P1 | 0.6, 2.8 |
| C9 | Confidence weights arbitrary and uncalibrated | P1 | 3.4 |
| C10 | Sanitizer `/g` `.test()` state + brace pattern + question discarded | P2 | 1.6 |
| C11 | RAG job ledger in-memory, delete-on-read | P2 | 1.4 |
| C12 | Chassis detection has no memory of confirmations | P2 | 3.6 |
| C13 | `npm test` is a smoke test; `npm run lint` is an echo; DL380-only scenarios | P1 | 3.5 |

---

## F. Definition of "fully autonomous" — acceptance criteria

The system can be called autonomous when all of the following hold with the dashboard stopped:

1. `node scripts/orchestrate.js full-cycle --all` discovers every solution-tree node, scrapes each, and resumes correctly after a mid-run kill.
2. Each catalog emits structured rule predicates with a reported extraction-coverage percentage, and `unparsed[]` is visible and shrinking.
3. A BOQ for **any** scraped family is evaluated using that family's scraped rules, with zero audit lines from another family's hardcoded logic.
4. RAG is routed to the correct notebook or explicitly skipped — never silently redirected — and its agreement/contradiction with the rule engine is what moves the confidence score.
5. The top-ranked solution is auto-built in the portal, CLIC-checked, and any rejection becomes a KnowledgeDelta without human typing; the next identical BOQ scores higher for a traceable reason.
6. Every number in the report and telemetry is measured, and every step status reflects what actually executed, including `SKIPPED` and `DEGRADED`.
7. Catalogs older than the staleness threshold self-enqueue for re-scrape.
8. CI fails on a seeded regression for each Phase-0 bug, and on any reintroduction of hardcoded product identifiers, literal durations, or `file:///` paths in skills.

---

*Audit performed against `main` as cloned on 2026-09-19. Line references are to that revision.*
