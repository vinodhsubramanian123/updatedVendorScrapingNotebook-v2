# Active Learnings Digest

> Auto-updated summary of certified repository rules, active product deltas, and pending reflection queue items (`INV-279`). Run `npm run learn:promote -- --dry-run` to inspect promotable learnings.

- **Portfolio Baseline**: `17` active live-scraped HPE product lines (`CLOUD_VERIFIED`) + `2` quarantined legacy stubs (`Alletra_Storage_System`, `GX5000_General_RACK`).
- **Two-Lane Reflection**: Non-test CLI and Dashboard evaluations emit `PostRunReflectionReceipt` proposals to `outputs/history/learning/instruction_improvement_queue.json` without trusting unverified customer claims (`INV-24`).
- **Promotion Rule**: Only items with `>= 3` independent authoritative observations (`INV-225`) or verified portal/human receipts promote into `Catalog_Rules.json` and `master_knowledge_registry.json`, gated by `validate_skills_integrity.js` and `evaluate_solution_intelligence_quality.js`.

## Reflection Queue Status
- **Pending Proposals**: 0 (0 ready for promotion)
- **Promoted Instructions / Rules**: 0
- **Active Architectural Contracts**: `INV-281`–`INV-286` (physical min/max capability envelopes via `hardware_envelope_solver.js`, 5-level rule IR + buildable constraint-graph closure via `buildable_graph_solver.js`, Prompt `v4` + negation-guarded RAG, 17 schema-validated product manifests via `_mergeSubSection`, dynamic vendor adapters, `< 800` LOC facades).
- **Last Updated**: 2026-11-26T10:30:00.000Z
