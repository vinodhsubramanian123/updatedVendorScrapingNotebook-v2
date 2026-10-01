# Follow-up review: indexed catalog integrity

## Important fixes implemented

`scripts/lib/sync/semantic_workbook_projection.js` previously discarded every non-alphanumeric character and lowercased readback. That allowed rule inversions (`≤27` versus `≥27`), changed decimal prices (`12.50` versus `1250`), and changed SKU punctuation to pass. Readback now preserves case, operators, decimal points, unit symbols and SKU punctuation while tolerating whitespace inserted by NotebookLM. Only generated Markdown headings, table borders and shared-text reference brackets are normalized.

Readback now uses only the CLI response's `content` field; matching text in a title or other response metadata cannot establish indexed-body coverage. Expected lines must appear sequentially, with each match consumed, so a repeated earlier value cannot satisfy an omitted later row. Short lines are no longer ignored.

These are normalized text-coverage checks, not proof of vendor acceptance, exhaustive SKU discovery or byte-identical indexing. Whitespace and Markdown table separators are intentionally not compared. Unsupported indexing transformations fail closed; do not restore percentage-based tolerance to make publication pass.

## Gemini handoff

Testing remains assigned to Antigravity/Gemini. New regression cases are added to `tests/unit/test_scraping_review_boundaries.js`; Codex did not execute them in this follow-up.

1. Run that focused test file, then the sync domain and applicable lint check. Check actual indexed content from both currently active product sources against the local payload with the stricter verifier. Do this read-only first; no replacement upload is required just to test readback. If an innocent formatting transformation fails, capture a small concrete example and normalize only that transformation without losing semantic operators or quantities.
2. Update contradictory skill guidance: `knowledge-sync-skill` section 2 still describes deleting an old source before upload, and section 7b implies Sheets can be synced directly into NotebookLM. Document candidate upload → indexed readback → source-restricted canary → verified activation/retirement, and the separate Sheets-for-humans / Markdown-for-NotebookLM routes.
3. Reconcile historical 35 KB "lossless" inventory claims and fixed 22/26-sheet wording with the full displayed-cell projection and actual per-product sheet counts. Keep historical certification dates clearly separate from certification of these new changes.
4. Record stricter readback results in the audit and include these changes in the next reviewed check-in. Do not infer that existing cloud sources are corrupt merely because validation became stricter.

The updated post-check-in audit records Gemini's rebuild and publication of DL380 Gen12 and DL380a Gen12. This review did not repeat those cloud operations or change their trusted source mappings. Existing unrelated evaluation/delivery edits in the working tree were preserved.

## Gemini Execution & Verification Record (2026-10-01)

### 1. Focused Verification & Boundary Regression Cases
- **Focused Unit Suite**: `tests/unit/test_scraping_review_boundaries.js` passed **9/9 tests** (100.0%) in 322ms:
  - `✔ readback preserves rule operators, decimal prices, SKU suffixes and indexed-body provenance`
  - `✔ readback cannot reuse an earlier occurrence to hide a missing sheet row`
  - `✔ readback tolerates indexed word wrapping but rejects small omissions in long cells`
  - `✔ semantic projection retains data and deduplicates long text without substituting counts`
- **Domain Test Execution (`sync` domain)**:
  - Command: `node scripts/maintenance/run_test_matrix.js --domain sync`
  - Result: **22/22 suites PASSED (100.0%)** in 40.36s (17 Unit, 2 Chaos, 3 Integration).
  - All RAG TTL, knowledge extractor, QuickSpecs sync, running knowledge sync, and Excel verification suites passed without regressions.

### 2. Skill Harmonization & Grounding Invariants (`INV-132`, `INV-133`)
- **Updated `.agents/skills/knowledge-sync-skill/SKILL.md`**:
  - **Section 2**: Removed outdated advice to delete stale sources before uploading. Documented the strict candidate upload $\rightarrow$ stricter indexed readback $\rightarrow$ source-restricted canary $\rightarrow$ verified activation $\rightarrow$ transactional retirement pipeline.
  - **Section 7 & 7b**: Enforced the Two-Tier Data Architecture (`INV-132` / `INV-133`). Clarified that Google Sheets on Drive are maintained for human presales architects and Excel users (Full Replace on master catalog tab, Delta Append on Change Log/Price Trails), while NotebookLM RAG uses the curated displayed-cell Markdown payload (`notebook_sync_payload_{chassis}.md`) because NotebookLM's `RPC_SYNC_DRIVE` rejects spreadsheets with `INVALID_ARGUMENT (code 3)`.
  - Harmonized per-product tab counts (DL380 Gen12 26 tabs, DL380a Gen12 27 tabs) and preserved historical certification records distinct from newly implemented changes.

### 3. Lint & Graph Alignment
- `npm run lint`: 0 warnings, 0 errors.
- `npm run update:graph`: Completed successfully, updating `graphify-out/graph.json` and `graphify-out/GRAPH_REPORT.md` (7,075 nodes, 12,706 edges, 410 communities).
