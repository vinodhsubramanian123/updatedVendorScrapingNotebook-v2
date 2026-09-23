# SN3600B completion handoff

Checkpoint: 2026-09-23, branch `codex/sn3600b-workflow-remediation`. Continue existing work; do not repeat catalog scraping or redesign architecture. Read `docs/SOLUTION_TOPOLOGY_AND_VALIDATION.md` and the audit ledger before changing routing.

## Completed and verified

- Live seven-line corrected BOM: R7R97A ×1, R7M09A ×2, QK735A ×8, HA113A1 parent + 5GA installation, HU4B3A3 parent + ZTL support. Total **$61,929**, $707 below the earlier fixed-support configuration. CLIC OK with zero issues, captured 2026-09-22T18:07:43.869Z. Receipt expires after 24 hours; archived fixed receipts remain separate.
- Support policy preserves explicit customer requirements in the closest rank. Use qualified 3Y Basic only when unspecified or explicitly authorized (authorized for this BOQ). Flexible DMR support $186 is the selected evidenced alternative, not a claim of globally cheapest support. Installation is $537. Keep both zero-price family parents.
- Portable report links, zero-price exports, scoped guardrail tools, role-based routing boundaries, explicit unavailable dashboard status and persisted owner lessons implemented. Focused checks and dashboard build passed; results in `outputs/SAN/FC/SN3600B_FC/evidence/followup_focused_checks.json`.
- Actual run `TRC-1790141188160-A53898` recovered from provider 503/504 failures across configured 3.6 Flash and 3.7 Flash to 3.5 Flash Lite. Both `simulate_build` and `query_notebooklm` completed; advisory returned. Model inventory confirmed those models available. Environment configuration remains flexible; do not hardcode a global model replacement or expose keys.
- `scripts/lib/sync/nlm_solution_source_validator.js::parseRankVerdicts` now accepts an object containing ranks or a top-level array, enforcing exact coverage and existing PASS conditions. Retained actual response and malformed/missing/duplicate/extra-rank negative checks passed. Native grounding and source-detachment gates remain separate.

## Current state — not final customer certification

Latest trace A53898 remains **INCOMPLETE**: its native-cited NotebookLM answer used an array rejected by the old parser. The temporary source detached successfully. Parser repair was verified locally afterward; do not rewrite the historical trace as PASS. Current generated report/workbooks reflect that incomplete run. Late accessory/unknown-server routing guards passed focused checks but still need combined regression validation.

## Pending work, in order

1. **Learning false positive:** `scripts/lib/notebook/knowledge_extractor.js` around line 183 treats any paragraph containing “unverified” as an opinion discrepancy. The phrase “unverified baseline was correctly omitted” in A53898 incorrectly triggers HUMAN_REVIEW_REQUIRED. Fix narrowly with positive/negative regression cases; do not auto-promote unsupported learning. Proposed deltas were deferred, not persisted.
2. **Combined validation:** run relevant routing, support, source-validation, guardrail and output tests. Check existing server/storage behavior at the new boundary in `scripts/lib/boq/solution_topology.js` and `boq_evaluator.js::evaluatePhysicalMath`. Missing profiles must stay NOT_EVALUATED; Synergy compute, fabric and enclosure ownership must not be conflated. Broad suites were deliberately not repeated by Codex.
3. **Final canonical run:** after fixes, execute the command below once. Refresh expired CLIC evidence first if needed; receipt must match the seven-line manifest. Accept only native vendor grounding, complete rank verdicts, detached temporary source, truthful advisory state and fresh vendor receipt. If cloud fails, retain incomplete status rather than manufacture certification.
4. **Output QA:** exact seven-line $61,929 totals in CSV and all three workbooks; numeric-zero parents; every Markdown link resolves. In `scripts/lib/boq/generate_boq_xlsx.js`, remove misleading SAN “Server Nodes” / generic role labels only where appropriate. Check dashboard returned/unavailable states interactively. Windows/POSIX/UNC URI construction passed; actual macOS/Linux application opening remains untested.
5. **Finish checkpoint:** update audits with the new trace and actual outcomes, refresh graph, review diffs and commit verified final artifacts. Preserve the original customer workbook and two untracked root user copies. Refresh the root customer report only after final output is accepted, rebasing links via `scripts/maintenance/repair_report_links.js`; do not add loose user copies to Git. No remote push is needed for this handoff.

```powershell
node scripts/evaluators/eval_boq.js 'C:/Users/latha/Downloads/Config2_SN3600B_FC_Switch_EVALUATED_BOQ.xlsx' --sheet 'Evaluated BOQ' --chassis outputs/SAN/FC/SN3600B_FC --notebook-id d7f84352-1cdb-4842-84ca-39d2a10b91eb --support-default --output outputs/SAN/FC/SN3600B_FC/customer_evaluation.md
```

## Operational decisions and limits

- OCA expired-session recovery: refresh Partner Portal, authenticate, open One Config Advanced through Quick Links. CDP 9222 uses its own Chrome profile. Edit support from Components → owning icon → Services → Edit with both apply-to-all controls off.
- Gemini: `scripts/lib/rag/guardrail_transport.js` bounds retries/deadlines and separates transient throttling from daily quota. Every SDK send must include tools/system instructions because send config replaces chat defaults. Before selecting a newer Flash/Pro model, check actual availability and function-call compatibility. Keep Graphify integration; its update currently warns installed skill 0.9.61 differs from package 0.9.63 (maintenance, not a reason to redesign).
- Preserve separate local math, model advisory, native document grounding and vendor acceptance states. Successful scraping does not certify arbitrary vendors or complex Synergy/storage topologies.
- Use atomic JSON writes and canonical pipelines. Existing diagnostic traces document real failed attempts and must not be presented as final certification.

## Working-tree state at checkpoint

The five generated customer artifacts (customer_evaluation.md, MultiRank CSV/XLSX, Partner_Portal.xlsx and Proposal.xlsx under the product directory) remain modified locally and deliberately excluded from the commit until final validation. The two root user copies remain untracked. Committed receipts and diagnostic traces preserve the actual evidence, including incomplete runs. Graph update completed successfully (6,000 nodes); 22 changed JS files passed syntax checks and 18 changed JSON files parsed.
