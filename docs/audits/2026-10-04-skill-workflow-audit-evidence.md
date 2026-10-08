# Initial skill/workflow audit evidence and coverage scorecard

Date: 4 October 2026 (IST). Baseline: `823725a214816c972bf1d91a4ec01db7bb76b860`.
Status: **REVIEWED WITH CORRECTIONS (static; no tests run) — not a behavioral certification.**

Companion: [execution excellence plan](2026-10-04-skill-workflow-excellence-plan.md).

---

## Audit method and limits

Graphify discovery was performed before focused source inspection. The existing graph reported 7,342 nodes, with a CLI/installed-skill version warning (package 0.9.63; Antigravity skill 0.9.61). The graph guided discovery; it did not certify runtime call coverage. No graph installation or rebuild was performed.

Read-only inventory inspected every repository skill entrypoint for frontmatter, size, headings, local links, and associated resources. Focused semantic inspection covered workflow contracts and relevant sections of larger skills, supported by the router and implementation source. This initial structural/contract audit covers all 28 skills, supported by targeted source inspection of implementation files in `scripts/evaluators/`, `scripts/lib/boq/`, `scripts/lib/catalog/`, `scripts/lib/feedback/`, `scripts/lib/system/`, and `scripts/services/`.

The local skill-creator guidance supplied the rubric: discriminating triggers, preservation of intent, concise essential instructions, progressive disclosure, real callable helpers, maintained references, and outcome-based validation.

Metrics observed across the codebase:

| Measurement | Observed result | Interpretation |
| :--- | ---: | :--- |
| **Repository skill entrypoints** | 28 | All 28 skills under `.agents/skills` included in this scorecard. |
| **Skill entrypoint words** | 64,213 | Whitespace-delimited count; excludes auxiliary reference documents. |
| **Broken relative link occurrences** | **18 in 7 skills** | 2-level `../../` traversal from 3-level `.agents/skills/<name>` directories resolves under `.agents/`, not repo root. |
| **Router switch branches** | 17 | Handler presence is not workflow completion. |
| **Source files in scripts/dashboard** | 308 | `rg --files` JS/CJS/JSX/TS/TSX inventory; ignored dependencies excluded. |
| **Existing history evidence JSON files** | 328 | Historical evaluation and trace files under `outputs/history/`. |
| **Saved scraping reflection JSON files** | 1 | Stored under `outputs/history/scraping_reflections/`; has writer, no production reader. |
| **Saved run JSON files** | 100 | Bounded history; not a total execution denominator. |
| **Telemetry history entries** | 100 | Evaluated entries in `pipeline_telemetry.json`; lacks test vs. production segregation. |

The four largest skill entrypoints are frontend (1,240 lines; 13,136 words), BOQ (504; 7,172), NotebookLM (981; 6,327), and orchestrator (363; 4,948). A navigation table does not make those entrypoints progressively disclosed if the actual skill loader supplies the entire body into model context.

---

## 28-skill contract scorecard

Legend: **primary** selects a customer operation; **support** runs when applicable inside a workflow; **operational** maintains catalog/knowledge; **engineering** belongs outside customer dispatch (`INV-72`). “Wired” means a source caller exists, not that an agent loaded the Markdown skill or all completion requirements are fulfilled.

| Skill | Intended placement / source evidence | Initial quality assessment | Planned correction |
| :--- | :--- | :--- | :--- |
| [presales-query-router](../../.agents/skills/presales-query-router/SKILL.md) | Primary intake; `route_query.js` / dashboard query routes. | Broad routing contract exists, but five-track description/table diverges from 17 branches. Nested actions and pre-execution ambiguity gates are incomplete; Q&A sometimes labels router itself as target. | F01/F17/F18; generated routing contract and objective/modality composition. |
| [boq-eval-skill](../../.agents/skills/boq-eval-skill/SKILL.md) | Primary; `runEvaluationPipeline`. | Substantial evidence-aware instructions coexist with older universal seven-check/five-rank claims. Navigation section names do not match actual sections. **12 broken occurrences (11 distinct targets)**. | F09/F14/F15; concise workflow contract with scoped references, truthful stages, and outputs. |
| [rfp-sizing-synthesizer](../../.agents/skills/rfp-sizing-synthesizer/SKILL.md) | Primary; requirement resolver and routed sizing. | Promises a 100% buildable starting BOM/full pipeline while routed result is intentionally a draft. Table contains 8 roles with conditional applicability. Fixed product examples can be mistaken for general rules. Broken link to intent resolver. | F03/F14; explicit draft/completion modes, requirement/quantity contract, and evaluation continuation. |
| [workload-dna-skill](../../.agents/skills/workload-dna-skill/SKILL.md) | Primary/support; hardware DNA, resource arbitration, and sizing. | Trigger is clear, but inferred hardware traits are presented alongside application sizing/performance claims. Fixed six-profile prescriptions exceed the route's advisory endpoint. | F04; application requirements distinct from traits; scoped sizing/arbitration continuation. |
| [multi-cluster-tender-skill](../../.agents/skills/multi-cluster-tender-skill/SKILL.md) | Primary/support intake; splitter and multi-evaluator. | Important quantity and SLA ownership guidance. Router ends at estimates; regex `\d{2,}` misses 2–9 node clusters; power math example conflates PSU nameplate with draw (60 × 2 × 1600 W = 192 kW, but printed 96 kW). | F05/F14; actual group evaluation via importable `evaluateMultiClusterBOQ`, Hamilton-Hare Diophantine allocation (`INV-42`), and power envelopes (`INV-37`). |
| [ocr-quote-ingestion-skill](../../.agents/skills/ocr-quote-ingestion-skill/SKILL.md) | Intake support/primary extraction; real OCR service and canonical intake. | Useful modality/row extraction workflow, but router supplies a descriptor without calling OCR. GIF in skill triggers but omitted in router extension regex. | F02/F18; real extraction via `ocr_service.js`, modality parity, uncertainty/provenance, and resumed objective. |
| [bom-reconciliation-skill](../../.agents/skills/bom-reconciliation-skill/SKILL.md) | Primary; vendor verifier and single-file audit. | Clear comparison boundary and quantity guidance. Skill says empty second baseline halts; runtime permits a labeled single-file audit (`INV-141`). Weighted average pricing required for merged duplicate rows (`INV-145`). | F07/F14; separate two-baseline and single-file modes; real discrepancy and pricing coverage. |
| [boq-remarks-reconciliation-skill](../../.agents/skills/boq-remarks-reconciliation-skill/SKILL.md) | Requested support after comparison; pure remarks helper. | Good distinction between formatting and workbook editing; preserves source cells. Pre-gate wrongly asks customer baseline SHA-256 to match catalog snapshot. | F01/F14; independent hashes, required reconciliation evidence, and requested artifact handoff. |
| [cross-vendor-transformation-skill](../../.agents/skills/cross-vendor-transformation-skill/SKILL.md) | Primary; transformer with target sizing handoff. | Good disclosure of partial CPU/memory extraction and no autonomous SKU selection. HALT-CV3 says source catalog absent while corrective action scrapes target chassis. | F06; resolve source evidence versus target catalog prerequisites and continue supported workflows. |
| [heterogeneous-tender-modernizer](../../.agents/skills/heterogeneous-tender-modernizer/SKILL.md) | Primary; owned groups/carrier planning. | Strong disclosure: memory estimates, unresolved components, draft data, and separate export dialects. Router accepts parsed JSON rather than binary files; downstream evaluation pending. | F06; real ingestion/owned continuation, quantity bridges, and explicit unsupported domains. |
| [catalog-intelligence-skill](../../.agents/skills/catalog-intelligence-skill/SKILL.md) | Primary; history/lifecycle modules. | Good price-history scope; includes static generation mappings and old Sheets-as-NLM rationale. Broken implementation link to `sku_versioning.js`. | F07/F14/F18; date/source-based response profile and maintained commands. |
| [least-delta-combinator-skill](../../.agents/skills/least-delta-combinator-skill/SKILL.md) | Primary/support candidate synthesis; conflict graph/combinator. | Root-cause pruning intent is useful. No-bloat path conflates absence of a candidate with proof that Rank 1 is optimal; fixed savings and automatic recommendations need qualification. | F14/F15; prove requirement preservation, rank distance, and observed pricing; no duplicate/equivalence shortcuts. |
| [value-engineering-skill](../../.agents/skills/value-engineering-skill/SKILL.md) | Primary/support after baseline checks; deal and budget optimizers. | Clearly requires validated baseline and advisory changes; broken link to `deal_optimizer.js`. Hardcoded prices ($145 memory, $35 savings, $180 PSU) conflict with `INV-33`; `P48818-B21` has conflicting roles (PSU in code, heatsink in skills). | F16; canonical eligibility, dynamic catalog prices, valid PSU SKUs, and revalidation. |
| [workbook-generator-skill](../../.agents/skills/workbook-generator-skill/SKILL.md) | Requested support/export; canonical serializer and generators. | Specifies 7-column schema with 2-line gaps (`INV-37`). Broken link to `DL380_Gen12_OCA_Catalog.xlsx`. Must enforce delivery authorization (`INV-146`, `INV-151`). | F07/F14; current artifact schema, authorization/result distinction, and transactional publication. |
| [nlm-skill](../../.agents/skills/nlm-skill/SKILL.md) | Primary Q&A/support candidate grounding; notebook query utilities and structured ephemeral validator. | Presales fast-path and structured validator correction are useful, but a 981-line general CLI/studio manual dominates the entrypoint. Two-tier data architecture (`INV-132`) and Markdown payload (`INV-134`) must take precedence. | F07/F14/F18; concise presales mode with authoritative-source, native citation, manifest/verdict, and cleanup evidence; studio commands in references. |
| [output-validation-skill](../../.agents/skills/output-validation-skill/SKILL.md) | Cross-cutting response/candidate quality gate. | Necessary role, but universal table has 6 checks while protocol calls U1–U5. Relax/remove/cross-catalog remedies violate `INV-48` (Generation Firewall). | F07/F15; profile-specific checks generated from current contracts; diagnostic and delivery gates separate. |
| [adversarial-validation-skill](../../.agents/skills/adversarial-validation-skill/SKILL.md) | Candidate scrutiny support; synthetic chaos mode is engineering. | Heading says 10 modes while table has 11. Router generates a synthetic BOQ instead of inspecting supplied candidate. Candidate scrutiny must never inherit synthetic test detection PASS. | F07/F15; split candidate scrutiny from synthetic chaos tests. |
| [execution-trace-skill](../../.agents/skills/execution-trace-skill/SKILL.md) | Cross-cutting tracing; ledger and trace context. | Useful handoff/gate concepts. Schema/storage instructions differ from durable production ledger; Q&A table suggests default DL380 despite no-default charter. | F08/F09/F14; one runtime trace contract and profile-specific stages. |
| [continuous-learning-skill](../../.agents/skills/continuous-learning-skill/SKILL.md) | Support after terminal evidence; feedback verifier/router. | Strong intent to avoid write-only memory. Simulation currently checks any `LEARNED_DELTA` audit, not the exact rule ID, and passes an empty catalog directory. | F11/F13/F14; explicit learning states, exact-rule effect simulation against target catalog directory. |
| [knowledge-sync-skill](../../.agents/skills/knowledge-sync-skill/SKILL.md) | Support/operational; registry/payload/post-flow sync. | Important two-tier and source replacement/readback discipline. Historical product tables bloat entrypoint; delta storage text differs from loader's `history/` path. | F12/F14/F18; canonical storage and actual awaited sync receipts per entrypoint. |
| [degraded-mode-skill](../../.agents/skills/degraded-mode-skill/SKILL.md) | Conditional support/operational freshness recovery. | Useful staged promotion/metadata contracts. Requires user stale/resync selection despite standing autonomy; imports `searchLocalRAG` which is not exported by local-RAG module (`queryLocalKnowledgeBaseAsync`). | F14; evidence-driven recovery with real exported functions and bounded supported/agent-assisted modes. |
| [oca-portal-navigator](../../.agents/skills/oca-portal-navigator/SKILL.md) | Support/operational/live-agent continuation. | Detailed navigation, Tab 1 stale-session recovery (`INV-89`), and case-sensitive Smart CTO selection (`INV-136`). Broken link to `oca-catalog-scraper`. | F14/F18; focused entrypoint, consume scraping reflections, and validated navigation adapters. |
| [oca-catalog-scraper](../../.agents/skills/oca-catalog-scraper/SKILL.md) | Operational/support when refresh is required. | 10-stage capture lifecycle (`INV-45`). Broken navigator link (`../../.agents/skills/...`). Staging promotion and owner-leased recovery (`INV-152`). | F14; actual capture coverage, current build/sync outputs, and dynamically observed sheet counts. |
| [conditional-sku-discovery-skill](../../.agents/skills/conditional-sku-discovery-skill/SKILL.md) | Conditional support in capture/BOQ investigation. | Clear automation limits; does not equate hidden visibility with acceptance (`INV-125`). Preserves `PORTAL_CONDITIONAL` status on Rank 1L (`INV-126`). | F06/F17; register conditions, pending evidence, and actual executed/restored observations. |
| [clic-portal-validation-skill](../../.agents/skills/clic-portal-validation-skill/SKILL.md) | Conditional/final vendor-evidence support. | Strong distinction between exploration and final acceptance. Agent-assisted completion must be retained in router plan and resumable evidence state. | F06/F17; mapped live-agent handoff and unchanged-manifest receipt closure. |
| [orchestrator-workflow-skill](../../.agents/skills/orchestrator-workflow-skill/SKILL.md) | Macro workflow description/support. | Six-stage, seven-phase, and multiple routing directories coexist. Broken link to `deal_optimizer.js` under `scripts/lib/conflict/`. Duplicated invariants. | F14/F17; one current composition reference plus focused operational modes. |
| [jules-autonomous-protocol](../../.agents/skills/jules-autonomous-protocol/SKILL.md) | Engineering only; task manager/daemon (`INV-72`, `INV-43`, `INV-44`). | Correctly excluded from customer BOQ evaluation. MCP-first lifecycle order. | F14/F18; supported engineering procedures and explicit scope. |
| [design-taste-frontend](../../.agents/skills/design-taste-frontend/SKILL.md) | Engineering/design only; repository dashboard styling. | Opening excludes dashboards while charter dispatch matrix assigns dashboard styling to it. Largest entrypoint (13,136 words). | F14; correct applicability to include repository dashboard while keeping customer flows excluded. |

---

## Detailed breakdown of the 18 broken relative links

All 18 broken links originate from skills located at `.agents/skills/<skill-name>/SKILL.md`. When authors used `../../scripts/...`, the path resolved to `.agents/scripts/...` (which does not exist), instead of `../../../scripts/...` (which navigates 3 levels up to the repository root).

| Skill | Broken relative link in SKILL.md | Intended target file | Root cause |
| :--- | :--- | :--- | :--- |
| `boq-eval-skill` | `../../scripts/config/chassis_map.json` | `scripts/config/chassis_map.json` | 2-level instead of 3-level traversal |
| `boq-eval-skill` | `../../scripts/lib/boq/boq_evaluator.js` | `scripts/lib/boq/boq_evaluator.js` | 2-level instead of 3-level traversal |
| `boq-eval-skill` | `../../scripts/lib/boq/boq_preprocessor.js` | `scripts/lib/boq/boq_preprocessor.js` | 2-level instead of 3-level traversal |
| `boq-eval-skill` | `../../scripts/lib/boq/boq_parser.js` | `scripts/lib/boq/boq_parser.js` | 2-level instead of 3-level traversal |
| `boq-eval-skill` | `../../scripts/lib/boq/boq_evaluator.js` (dup) | `scripts/lib/boq/boq_evaluator.js` | 2-level instead of 3-level traversal |
| `boq-eval-skill` | `../../scripts/lib/conflict/conflict_graph.js` | `scripts/lib/conflict/conflict_graph.js` | 2-level instead of 3-level traversal |
| `boq-eval-skill` | `../../scripts/lib/catalog/catalog_rules.js` | `scripts/lib/catalog/catalog_rules.js` | 2-level instead of 3-level traversal |
| `boq-eval-skill` | `../../scripts/evaluators/eval_boq.js` | `scripts/evaluators/eval_boq.js` | 2-level instead of 3-level traversal |
| `boq-eval-skill` | `../../scripts/lib/boq/budget_optimizer.js` | `scripts/lib/boq/budget_optimizer.js` | 2-level instead of 3-level traversal |
| `boq-eval-skill` | `../../scripts/lib/system/telemetry.js` | `scripts/lib/system/telemetry.js` | 2-level instead of 3-level traversal |
| `boq-eval-skill` | `../../scripts/lib/feedback/feedback_loop.js` | `scripts/lib/feedback/feedback_loop.js` | 2-level instead of 3-level traversal |
| `boq-eval-skill` | `../../scripts/lib/boq/multi_cluster_splitter.js` | `scripts/lib/boq/multi_cluster_splitter.js` | 2-level instead of 3-level traversal |
| `catalog-intelligence-skill` | `../../scripts/lib/catalog/sku_versioning.js` | `scripts/lib/catalog/sku_versioning.js` | 2-level instead of 3-level traversal |
| `oca-catalog-scraper` | `../../.agents/skills/oca-portal-navigator/SKILL.md` | `.agents/skills/oca-portal-navigator/SKILL.md` | Nested `.agents/.agents` path |
| `orchestrator-workflow-skill` | `../../../scripts/lib/conflict/deal_optimizer.js` | `scripts/lib/boq/deal_optimizer.js` | Incorrect directory (`conflict/` vs `boq/`) |
| `rfp-sizing-synthesizer` | `../../scripts/lib/boq/requirement_intent_resolver.js` | `scripts/lib/boq/requirement_intent_resolver.js` | 2-level instead of 3-level traversal |
| `value-engineering-skill` | `../../scripts/lib/boq/deal_optimizer.js` | `scripts/lib/boq/deal_optimizer.js` | 2-level instead of 3-level traversal |
| `workbook-generator-skill` | `../../outputs/ProLiant/Gen12/DL380_Gen12/DL380_Gen12_OCA_Catalog.xlsx` | `outputs/ProLiant/Gen12/DL380_Gen12/DL380_Gen12_OCA_Catalog.xlsx` | 2-level instead of 3-level traversal |

---

## Detailed implementation evidence for key findings

### F01 — Router intent selection, modality conflation & ambiguity policy
- In `scripts/evaluators/route_query.js`:
  - L202–545: `explicitTracks` has 16 entries; keyword precedence selects one track. If a user asks "Reconcile this quote and add commercial remarks", the router matches reconciliation and completely drops commercial remarks formatting.
  - L1280–1336: `hitlRequired` is calculated with threshold 0.80, while skill documentation cites 0.85. Ambiguity check occurs after evaluation dispatch.
  - Required correction: An upfront planning pass parses `primaryObjective` (`EVAL_BOQ`, `RECONCILE_BOM`, `RFP_SIZING`), `inputModality` (`EXCEL_WORKBOOK`, `SCANNED_IMAGE_PDF`), and `secondaryTransforms` (`ADD_COMMERCIAL_REMARKS`, `VALUE_ENGINEERING_DEAL_OPPORTUNITIES`), enforcing `INV-73` (clarify only consequential ambiguities with $\ge 0.95$ threshold, never trivial defaults).

### F02 — OCR ingestion routing without OCR execution
- In `scripts/evaluators/route_query.js`:
  - L622–636: Handler inspects file extension, sets `status: 'READY_FOR_OCR'`, and exits without calling OCR.
  - Extension detection regex omits `.gif`, though GIF is documented in `ocr-quote-ingestion-skill`.
  - Canonical intake (`boq_preprocessor.js`) has a real OCR service via `ocr_service.js` with automated FIFO key rotation (`gemini_rotator.js`).
  - Required correction: Directly invoke `ocr_service.js`, extract tabular rows with confidence scores, and immediately resume the requested primary objective.

### F05 — Multi-cluster routing & `eval_multi_boq.js` unimportability
- In `scripts/evaluators/route_query.js`:
  - Multi-cluster text matching uses `\d{2,}`, which matches 10+ nodes but completely ignores 2-node to 9-node cluster requests.
  - Handler returns `DRAFT_VALIDATION_REQUIRED` estimates instead of executing canonical evaluations per cluster.
- In `scripts/evaluators/eval_multi_boq.js` (verified): three top-level `process.exit(1)` calls (lines 22, 41, 223), no `require.main` guard and no `module.exports`, so it cannot be imported safely from `route_query.js`.
  - Required correction: Decouple the evaluation engine into an exported `evaluateMultiClusterBOQ(items, options)` function with top-level CLI adapter, implementing Hamilton-Hare Diophantine allocation (`INV-42`), facility power envelopes (`INV-37`), and per-cluster trace aggregation.

### F08 & F09 — Trace ownership & evidence ledger sequence invariants
- In `scripts/evaluators/route_query.js`:
  - L1407–1443: Generates a new `traceId` after handler execution if the returned object lacks one, causing disconnects between router traces and child evaluator traces.
- In `scripts/lib/boq/eval_output_serializer.js` & `scripts/evaluators/eval_boq.js`:
  - Serializer calls `completePhase(8)` and `completePhase(9)` before lifecycle phase 9 reflection runs. Calling Phase 8 out-of-order after Phase 9 violates `INV-144`.
  - Unbuildable candidate BOQs must be reported with `status: 'ACTION_REQUIRED'` and `customerDisposition = 'DELIVERY_BLOCKED_UNBUILDABLE'` (`INV-140`), reserving `status: 'ERROR'` for fatal crashes.
  - Deliverable exports require atomic directory rename (`.generation_${timestamp}_${pid}` $\rightarrow$ final) per `INV-151`.
  - Required correction: Initialize `traceId` once at router intake, pass through `TraceContext`, and have a single orchestrator finalize ledger phases strictly in sequence.

### F10 — Telemetry truth and test pollution
- In `scripts/lib/system/telemetry.js`:
  - Defaults missing stage durations to arbitrary percentage shares (15/25/20/25/15%).
  - Defaults confidence to 1.0, product to DL380 Gen12 SFF, and rule count to 33.
  - Calculates `cloudGroundingRatio` as non-fallback ratio rather than affirmative grounding.
  - There is no run-kind/provenance field or test guard in `telemetry.js`; the telemetry file path is fixed. Whether test suites actually write production entries is **unverified** (Phase 0 task).
  - Required correction: Add `runKind: 'TEST' | 'FIXTURE' | 'PRODUCTION'`, store `measured: false` or null when durations are absent, track verified grounding, and protect concurrent writes via `safeWriteJsonAtomic`.

### F11 — Continuous learning simulation against empty directories
- In `scripts/lib/feedback/continuous_learning_verifier.js`:
  - L27–84: Registry match sets `reachable: true`. Simulation calls `validateConflictGraph(sampleBom, [], '', chassisVariant)` with an empty target directory.
  - Simulation checks if *any* audit has category `LEARNED_DELTA`, rather than verifying that the *exact* `ruleId` triggered and produced the expected violation or alternative.
  - Required correction: Verify the exact `ruleId` against the active product catalog directory (`outputs/{Family}/{Gen}/{Model}/`) with a fixture that activates the rule.

### F16 — Deal optimizer hardcoded pricing & part number bug
- In `scripts/lib/boq/deal_optimizer.js`:
  - Hardcodes memory unit cost ($145), fallback per-DIMM savings ($35), and PSU savings ($180), in direct violation of `INV-33` (Dynamic List Price Resolution).
  - L163: `recommendedAlternative: 'HPE 800W Flex Slot Platinum Power Supply (P48818-B21)'`.
  - Six skills (adversarial-validation, boq-eval, catalog-intelligence, execution-trace, rfp-sizing and others) describe `P48818-B21` as the Gen12 secondary-CPU heatsink (grep-verified in skill text; `catalog_rules.js` was **not** inspected).
  - A catalog search found `P48818-B21` **absent** from `DL380_Gen12_Catalog.json`; `P38995-B21` appears only as a `PORTAL_CONDITIONAL` power-supply entry with no wattage evidence; `865414-B21` is absent. No replacement SKU is therefore verified.
  - Required correction: confirm the SKU role from catalog/QuickSpecs, source prices only from the scoped catalog/`price_history.json`, label unpriced items `UNPRICED_OPPORTUNITY`, and select PSU alternatives by catalog attribute rather than literal SKU. Cause of the inconsistency is not established.

---

## Source fingerprints for key implementation files

| Source | SHA-256 |
| :--- | :--- |
| `scripts/evaluators/route_query.js` | `ac1627df9bfa8ca45c693a0f89d7eb7364763e67fed295cd3f4073ee2730f78e` |
| `scripts/evaluators/eval_boq.js` | `a942aa8387ab6c70cae288c70e9a692c4028358f7b1af16137732de93428dd29` |
| `scripts/evaluators/eval_multi_boq.js` | `2aabacce6c1648a9ee883e0a62b15f8f4bd2f5f76bd529971731b2ff0520529e` |
| `scripts/lib/boq/eval_output_serializer.js` | `df292bb93eca65fdcdcee65711502f53b9e9b79fc5fb104e38facd1f135547dc` |
| `scripts/lib/system/telemetry.js` | `e171bc8c527026e4f30588500cd6a96a5f48682a11443acbfcd616ee179fc312` |
| `scripts/lib/feedback/continuous_learning_verifier.js` | `6cb953bfdaea05a9e5dc8d448d7137603989cfb20232a925802c594cd778fa4c` |
| `scripts/lib/boq/deal_optimizer.js` | `31dab18996739e74719ba6665afa8d600c256362d6e7bf01b9d1566813cff750` |
| `scripts/services/mcp_server.js` | `c730051f8cc7478cb8509fb303f32c36a3bbf2cc6f0eb9259a23e0b88e74b1ef` |

---

## Conclusion (review revision 2)

The initial audit by Codex accurately identified structural friction points across routing, telemetry, and continuous learning. With this review and expansion by Antigravity, the evidence base is deepened with:
1. Exact line-by-line inventory and root cause of all 18 broken relative links.
2. Confirmation of the `deal_optimizer.js` role conflict for `P48818-B21` and hardcoded pricing, with the limits above (no replacement SKU verified).
3. Formal alignment with repository invariants `INV-0`, `INV-33`, `INV-37`, `INV-42`, `INV-46`, `INV-48`, `INV-72`, `INV-73`, `INV-128`, `INV-140`, `INV-144`, and `INV-151`.
4. Decoupling requirements for `eval_multi_boq.js` to enable clean programmatic multi-cluster evaluation.

**STATUS: Evidence corrected and usable to guide Phase 0. Items marked unverified remain Phase 0 tasks; no behavior is certified.** Link-count re-verification: a script resolved every relative link from each skill directory and reproduced 18 broken occurrences in 7 skills.
