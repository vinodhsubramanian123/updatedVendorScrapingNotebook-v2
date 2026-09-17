# Evidence and workflow remediation — 17 September 2026

Reviewed baseline: `b6cf3f8`, including the claimed F01–F13 remediation in `2b12f25`.

The check-ins did not close all of the audit findings. In particular, the evidence ledger still exported before the delivery phase, candidate sources became authoritative sources, some workbook cells still asserted unconditional certification, and cloud Sheets writes cleared live content before replacement. This follow-up changes the production boundaries and tests the negative cases.

## Customer policy

Buildability is mandatory. Preserve every customer requirement and quantity. Rank eligible, distinct candidates by the fewest changed SKU lines and then the fewest changed units. Functional equivalence of substitutions and whether additions are mandatory require independent, cited candidate review; the numeric distance alone does not establish equivalence. The original strategy identifier is retained separately from the customer-facing recommendation rank.

## Stage contracts

| Boundary | Recorded evidence | Failure or uncertainty behavior |
|---|---|---|
| Intake | Input path and SHA-256, actual product identity, normalized quantities | Unknown identity and missing/corrupt catalog stop evaluation; thrown errors reach failure logging |
| Catalog | Catalog SHA-256; actual SKU count checked against metadata; readable XLSX with All SKUs | Existence of a dummy workbook and an inflated metadata count cannot certify a catalog |
| Knowledge discovery | Available rule IDs and counts | Available rules are not falsely logged as applied rules |
| Physical checks | Actual aspect results, errors and dependencies | Missing checks cannot become seven passing checks |
| Candidate synthesis | Full candidate manifest, quantities, rationale, before/after SKU deltas | Zero candidates cannot become a fabricated count of five |
| Final local validation | Fresh aspect, lifecycle and whole-solution graph results for each candidate | Unbuildable candidates are removed from recommendations; synthesis is disabled during this independent graph pass to avoid recursion |
| QuickSpecs | Product notebook/source identity audit and local PDF fingerprint | Missing or unmapped source prevents cloud candidate validation; uploads are checked again against source inventory |
| NotebookLM | Full prompt, answer, citations, attached source ID, per-rank verdict and manifest SHA-256 | Candidate source is query input, never an authoritative source. Uncited, missing, duplicated or ambiguous verdicts remain UNKNOWN |
| Customer intent | Cited per-rank assertions that requirements are preserved and changes are mandatory | Compatibility alone is insufficient for a PASS |
| Source cleanup | Detach result and source-list absence check | Cleanup uncertainty prevents overall candidate-review success |
| Deliverable | Separate analysis workbook and seven-column portal workbook; local file hashes and optional cloud receipt | Final Google Sheet publication requires a successful review of the current manifest; changing a SKU/quantity invalidates it |
| Learning | Local inferences persist as PENDING proposals | Local inference does not certify itself as a vendor rule |
| Synchronization | Awaited sync result, running-knowledge result, cloud/local status | Online completed evaluations request cloud sync; offline/deferred evaluations remain explicitly local |
| Master Google Sheet | Atomic value replacement across tabs, subsequent value readback and hashes | No separate destructive clear; readback mismatch fails synchronization |
| Final evidence | One trace ID, terminal phases, events, complete prompts, SKU decisions, artifact hashes, Git revision and tracked working-diff hash | Saved after delivery and sync outcomes. Structural evidence health and workflow success are separate fields |

The Sheets implementation uses `spreadsheets.batchUpdate` with `updateCells` and a subsequent values readback. API contract: [Google Sheets UpdateCellsRequest](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/request#UpdateCellsRequest).

## Evidence health findings

The initial audit inspected **51 historical JSON evidence logs; none had a complete verifiable trace**. Common gaps were unidentified input/chassis, missing SKU decisions, missing input fingerprints, and phase 9 left RUNNING. Some records also asserted cloud verification without corresponding grounded response evidence.

Historical records are preserved. They must not be relabelled as healthy or reconstructed as if evidence had been captured at execution time. The reusable audit is:

```powershell
node scripts/maintenance/audit_evidence_health.js --save
```

Its report is `outputs/history/evidence_logs/evidence_health_audit.json`; a nonzero exit signals missing/unhealthy evidence. A structurally healthy record may correctly describe a failed or incomplete workflow.

Release smoke trace: `TRC-1789649067008-348E0C`, produced by the canonical evaluator against `tests/fixtures/DL380_Gen12_E2E_Quote.csv` in offline mode. All nine phases are terminal, input/artifact hashes and candidate decisions are present, and health has no structural gaps. Its workflow status is **INCOMPLETE**, correctly reflecting unavailable cloud candidate verification and cloud synchronization. This is a negative-path engineering test, not certification of a customer BOM.

## Verification and operational limits

### Final combined review and Antigravity handoff

The user directed Codex to stop testing and spend its remaining work on logic gaps. No tests were run after that instruction. Earlier receipts do not certify the final combined changes from Codex, Gemini, and Claude.

The final review removed the router's silent downgrade from a failed full pipeline to a basic evaluator, corrected unsupported PASS claims in sizing traces, preserved recommended rankings in the serialized API response, and prevented an unknown chassis from displaying as DL380 Gen12. Explicit generation mismatches and partial notebook-name matches now fail closed. Missing CLI inputs pass through the evidence-producing failure handler.

Review fingerprints now include chassis, the customer baseline, requirements, and candidate manifests. Empty manifests and invalid quantities cannot satisfy the delivery gate. Shared knowledge synchronization publishes only the universal charter and requires each enabled notebook's source content to contain the current revision marker; updating Drive alone is insufficient. Product-specific knowledge remains scoped locally and to its product notebook.

Antigravity/Gemini owns validation of this final commit: exercise routed failures and sizing drafts, changed customer baselines and manifests, exact notebook routing, shared-document replacement and source readback, and final Google Sheet readback. Then run the canonical regression/build/lint checks and record receipts against the commit hash. Do not inherit historical benchmark claims for this revision.

Operational follow-up remains: refresh actual notebook health and shared sources, establish MEA catalog/QuickSpecs freshness, run the real customer candidates through NotebookLM, and retain any subsequent OCA/CLIC receipt separately. Historical incomplete evidence and quarantined observations remain preserved, not retrospectively certified. Sizing output is explicitly provisional until the full evaluation workflow runs.

Regression evidence is retained in `outputs/temp/evidence_certification_test_matrix.log` and `outputs/temp/evidence_boundary_tests.log`. Boundary tests cover saved failure evidence, missing phases, anonymous/candidate citations, missing/duplicate rank verdicts, changed manifest invalidation, exact portal headers and quantities, failed atomic writes, and mismatched readback.

Do not interpret test success, source presence, local aspect success, or a NotebookLM document review as actual HPE OCA/CLIC acceptance. A live vendor configurator receipt remains a separate external verification. This work did not run a new live customer configuration, a fresh MEA portal scrape, or a live round-trip publication test of the revised Sheets writer.

The dashboard's deferred-RAG recomputation remains provisional until final candidate review is completed. QuickSpecs identity checks do not independently establish current regional ordering availability. These boundaries must remain visible; neither an offline result nor a deferred result may be promoted to a completed customer delivery merely because an exporter ran.

The evidence health auditor checks trace structure and unsupported cloud claims. It is not a proof of hardware correctness, cryptographic tamper-proof storage, or a reconstruction of old missing evidence. Git working-diff hashes cover tracked `scripts` and `dashboard` changes; untracked new source files require inclusion in a subsequent commit for fully reproducible revision provenance.
