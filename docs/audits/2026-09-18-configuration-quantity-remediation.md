# Configuration quantity remediation — 2026-09-18

## Result and reproduction

Preserved the existing uncommitted Antigravity/Claude changes and fixed the quantity boundary and its downstream consumers. The real input is `C:/Users/latha/BOQ/HPE_DL380a_H200_Server_Configuration.csv`.

Run the canonical pipeline:

```powershell
node scripts/evaluators/eval_boq.js 'C:/Users/latha/BOQ/HPE_DL380a_H200_Server_Configuration.csv' --chassis outputs/ProLiant/Gen12/DL380a_Gen12 --offline --output outputs/ProLiant/Gen12/DL380a_Gen12/reports/quantity20/BOQ_Evaluation.md
```

The generated report, Proposal XLSX, MultiRank XLSX/CSV, and Partner Portal XLSX are in that `reports/quantity20` directory. These are local engineering deliverables, **PORTAL VALIDATION PENDING**, with incomplete catalog pricing. The verified run contains 35 item rows and one published candidate. All seven local physical checks pass. The known-price candidate subtotal is USD 29,881,860; 12 rows have unavailable/unconfirmed zero prices. This is not a complete quotation or a vendor acceptance receipt.

## Concrete trace

| Source row | Customer total | Validation/base quantity | Output multiplier | Final total |
|---|---:|---:|---:|---:|
| P76706-B21 chassis | 20 | 1 | 20 | 20 |
| P76706-B21 B19 | 20 | FIO annotation on base; not another chassis | — | — |
| P74571-B21 CPU | 40 | 2 | 20 | 40 |
| P69728-F21 DIMM | 160 | 8 | 20 | 160 |
| S3U30C H200 | 160 | 8 | 20 | 160 |
| P67252-B21 PSU | 160 | 8 | 20 | 160 |
| P74700-B21 GPU cable | 80 | 4 | 20 | 80 |
| HA113A1 order installation | 1 | Outside hardware validation | 1 | 1 |
| HA113A1 5A6 server installation | 20 | 1 | 20 | 20 |
| HU4B2A3 service parent | 1 | Outside hardware validation | 1 | 1 |

## Bugs fixed

- The canonical intake never invoked the existing CTO normalizer. Batch quantities reached physical math and synthesis.
- The old normalizer used divisibility as evidence of ownership and treated descriptive configuration options as chassis anchors.
- Structured service suffixes were discarded: `HA113A1` and `HA113A1 5A6` merged into quantity 21.
- Parser SKU consolidation crossed configuration boundaries and did not retain ownership columns.
- Exporters independently guessed base versus total quantities. Service exceptions could disagree with formula results. CSV data had fewer columns than its header.
- Candidate revalidation could normalize newly injected base parts again.
- Final pipeline publication overrode the earlier Pareto/closeness gates, reintroducing optional rail/storage add-ons.
- Ranking prioritized fixed tier number over physical validity and quantity distance.
- Workload GPU classification counted GPU cables and NVLink bridges as accelerators.
- Proposal generation was not wired into the canonical export stage; budgets and report rows could represent a single server while presenting an order total.

## Ownership and quantity contract

`scripts/lib/boq/configuration_context.js` is the preprocessing boundary. A single CTO anchor establishes the configuration count. Configuration ID, parent ID, sub-parent ID, quantity scope, and quantity basis survive structured intake. Repeated SKUs in different branches stay separate.

For a single flat CTO configuration, unscoped child rows belong to that configuration. Explicit global scope and recognized order-service/spare descriptions are exempt, including before an explicit section multiplier is applied. Explicit configuration scope overrides description classification. Quantities must divide into positive integer base quantities; inconsistent counts stop evaluation with `CONFIGURATION_OWNERSHIP_AMBIGUOUS` rather than produce fractional parts.

Normalized rows carry `quantityBasis: base`, `quantityScope`, `configurationId`, `configurationMultiplier`, `quantity`, `atomicQuantity`, `perNodeQuantity`, and `totalQuantity`. Validation and synthesis use `quantity` at base scope. Globals are excluded from physical validation and appended once to each candidate. Candidate additions are base quantities. A single export helper computes base × owned multiplier. No exporter infers quantity basis from divisibility.

**Synergy limitation:** multiple anchors, parent/sub-parent IDs, or Synergy frame/enclosure input are deliberately blocked in this single-configuration path. This protects against frame/server multiplier leakage; it does not implement automatic nested Synergy decomposition. A future hierarchy classifier must partition and explicitly bind each branch before evaluation. The legacy preview normalizer returns the ambiguity and original rows without partial normalization. Optional NotebookLM assistance can plug in before this boundary; no new cloud integration was built.

## Files changed by this task

- `scripts/lib/boq/configuration_context.js` — new shared ownership, normalization, scaling boundary.
- `scripts/lib/boq/boq_parser.js` — preserve service options, scope and hierarchy; isolate deduplication by owner.
- `scripts/lib/preprocessor/cto_normalizer.js` — reuse the shared boundary; stop guessing from divisibility.
- `scripts/lib/boq/boq_evaluator.js` — normalize before all physical math; explicit base-only candidate validation; preserve structured object metadata.
- `scripts/evaluators/eval_boq.js` — normalized intake, consistent pricing context, final candidate publication gates.
- `scripts/lib/boq/budget_optimizer.js` — order-level budget arithmetic.
- `scripts/lib/boq/generate_boq_xlsx.js` — shared quantity semantics, recommended-only exports, formula/CSV fixes, price and validation labels.
- `scripts/lib/boq/eval_output_serializer.js` — total-order report rows and Proposal generation.
- `scripts/lib/boq/solution_evidence.js` — scope and multiplier affect review fingerprints.
- `scripts/lib/conflict/strategy_synthesizer.js` — validity and quantity proximity before fixed tier preference.
- `scripts/lib/conflict/workload_dna.js` — exclude GPU accessories from GPU counts.
- `tests/unit/test_configuration_quantity_context.js` — focused regression coverage.
- `tests/unit/test_cto_normalizer.js`, `tests/unit/test_cto_normalizer_boundaries.js` — explicit total/base semantics and non-destructive ambiguity expectations.
- This audit and `docs/WORKFLOWS_AND_LEARNINGS.md` — durable handoff.

Canonical offline evaluation also refreshes local evidence, decision logs, notebook-sync payloads and knowledge charter timestamps. These generated updates are not cloud/vendor verification. Graphify AST graph was refreshed. No commits or uploads were made.

## Verification and next-agent checklist

Passed: new quantity/export regression; existing CTO normalizer and boundary tests; evidence-workflow truth tests (8 tests); canonical real-file offline evaluation; artifact readback of Proposal, MultiRank and Partner Portal. Verified one published candidate, 35 item rows, global rows unchanged, CPU/DIMM/GPU/PSU/cable totals and CSV column counts. MultiRank formula cached values agree with base × multiplier in focused tests.

Targeted oxlint reported no errors but existing unused-variable/style warnings in touched legacy files; this run does not claim a zero-warning whole-repository lint certificate. An initial ESLint invocation was inapplicable because the project uses oxlint. Broader regression was intentionally not run.

Gemini/Antigravity should next run:

1. `test_boq_preprocessor.js`, `test_multi_boq_preprocessor_clustering.js`, and UI opportunity ingestion, including structured object and Excel paths.
2. `test_workload_strategy.js`, `test_strategy_synthesizer_fuzzing.js`, and `test_strategy_matrix_soundness_and_capex.js`; ensure later cloud recomputation cannot republish dominated/add-on candidates.
3. Evidence manifest/source-review tests with equal quantities but different owners/multipliers; quantity-basis or scope changes must invalidate receipts.
4. Multi-frame Synergy fixtures with identical SKUs under distinct parents, global services, nested node counts, and missing owner IDs. Assert explicit ambiguity until branch decomposition is implemented.
5. Full product-generation regression, dashboard build/lint, and the Excel add-in/Google Sheets export consumers. Check they read base quantities or total quantities deliberately.
6. Obtain current catalog prices for all unresolved rows, perform grounded QuickSpecs review, then authenticated OCA/CLIC validation before claiming buildability or complete pricing.

Remaining risks: single-flat-configuration inference cannot recover hierarchy absent from a document; arbitrary natural-language global services may require explicit scope; nested configuration evaluation is blocked rather than automatically solved; facility power remains the pre-existing estimator; complete cloud/portal verification and broad regressions remain outstanding.
