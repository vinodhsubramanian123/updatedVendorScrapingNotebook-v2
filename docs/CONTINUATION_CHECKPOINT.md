# Continuation checkpoint — 2026-09-10

This is a saved implementation/data checkpoint, **not full production certification**. Read this file before repeating scraping or analysis. The user requested check-ins so other models can continue efficiently. Preserve product histories, raw captures, workbooks and source knowledge.

## Implemented and exercised

- Exact-product CTO discovery, hidden option expansion, immutable DOM text capture, table-text fallback, lifecycle/availability/lead-time/vendor attributes, historical deltas, lifecycle warnings and supply-aware ranking.
- Hardware/service partitioning at row level; physical manufacturing kits retain hardware roles. Shared accessories must remain eligible when target-product evidence supports them.
- Canonical Sheet refresh from current XLSX, source-restricted NotebookLM canaries, quarantined source exclusion and a Drive freshness check.
- Four latest local catalogs: DL380 Gen11 584 catalog / 824 service SKUs; DL380 Gen12 472 / 550; DL380a Gen12 359 / 295; DL145 Gen11 357 / 267. Catalog counts include software and licenses; they are not physical-hardware counts.
- All four received successful canonical-source NotebookLM canaries after retries. Dedicated `nlm source stale <notebookId> --json` reported up to date for all four. `source list --drive` inconsistently reported stale for Gen11 and DL380a; this discrepancy remains to investigate. No NotebookLM source was deleted during this checkpoint.

## Actual verification

- Full isolated matrix: **146/149 suites passed** (83/83 unit, 37/38 chaos, 23/25 integration, 3/3 E2E). Do not describe this as 100% certification.
- Lint, frontend build, dependency DAG passed. Complexity advisory: navigator CC 168 and scrape main CC 144 exceed 135; normal complexity command exits zero despite warnings.
- `git diff --check` passed before checkpoint.

## Next work, in priority order

1. Fix and rerun `npm run test:failed`: offline fixture lacks availability/discovery evidence; Excel alignment test reports unknown chassis form factor; portfolio audit rejects older product schemas and compares discovery to current clock rather than scrape time. Inspect causes before weakening gates or rewriting expectations. Update fixtures with realistic evidence. Historical artifact audit should compare capture time to scrape time; pre-promotion should also require freshness now. Preserve strict checks for new scrapes and clearly report legacy products needing migration.
2. Repair anomaly baseline selection: audit output has compared current count against itself (e.g. 584 vs 584). Select a genuinely previous snapshot, exclude current snapshot explicitly, deduplicate SKUs, and fail on unreadable baseline rather than silently skipping.
3. Review pricing certification: explicit portal zero is captured data, **not proof an option is free or correctly priced**. DL380a raw tables returned zero for many network adapters. Separate raw observed price, historical effective price and unresolved price confidence; prevent customer totals treating unresolved zero as free. Current audit counts numeric zero as coverage and is insufficient certification.
4. Replace `sanitizePriceTrail` heuristic deletion with non-destructive anomaly quarantine/provenance. A 10x spike with similar neighbors is suspicion, not proof of corruption. Existing snapshots/Git preserve earlier evidence. Current implementation removes such events from working price history; do not propagate that behavior as an approved business rule.
5. Strengthen shared-accessory trust: payload builder currently labels cross-product descriptions in discontinued history as verified automatically. Require actual target-product raw/catalog evidence and accessory classification; never turn a marker into evidence by itself. Keep unrelated product rules blocked.
6. Distinguish absence from vendor discontinuation and category migration. Hardware-to-services changes caused removal tombstones even while SKUs remained in the product's companion catalog. Reconcile across both catalogs before recording lifecycle removal; retain vendor dates separately.
7. Verify table-text fallback preserves category order/constraints without nested wrapper duplication; it cannot recover non-table notes. Retry stable DOM capture and fail incomplete extraction when required evidence is absent.
8. Current chassis discovery covers all five/five/one/one base variants, but option/rule extraction used one selected configuration per product. This does **not prove every chassis-dependent rule/layout has been exercised**. Document and implement per-variant coverage where needed.
9. Resolve stale portfolio metadata after manual audited promotion of DL380a and cloud-only retries; use normal registry/post-flow synchronization. Review existing unknown taxonomy assignments and false '100% compliant' CLI messages.
10. After fixes: isolated failures first, appropriate full matrix, portfolio audit, graph update, docs and another commit. Keep each useful milestone checked in rather than accumulating another large dirty tree.

## Resume locations and commands

- Main code: `scripts/catalogs/build_catalog.js`, `scripts/lib/catalog/diff_catalog.js`, `scripts/lib/scraper/dom_extract.js`, `scripts/lib/sync/{nlm_sync_client,sync_payload_builder}.js`, `tests/integration/verify_excel_tally.js`.
- `npm run test:failed`; `npm run lint`; `npm run build`; `npm run test:all`; `npm run update:graph`.
- Product data: `outputs/ProLiant/{Gen11,Gen12}/{Model}/`; failed staging diagnostics remain under ignored `outputs/temp/`. They have not been deleted.
- Notebook IDs and stable Google Sheet IDs are in `scripts/config/notebooks.json`. Source quarantine preserves old knowledge for review; do not retire more sources without checking the retirement manifest and consolidation evidence.
- No new scraping is necessary merely to rediscover the above defects: use saved raw captures and isolated staging for fixes first.
