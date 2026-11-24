# .agents/AGENTS.md — Customizations Root Reference

> 🧭 **Canonical Charter Notice**: The master operating charter, universal MCP pre-authorizations, and 39-Skill Dynamic Dispatch Matrix are maintained in root [`AGENTS.md`](file:///AGENTS.md).

## Subsystem Navigation & Directory Rules
- **Dynamic Skills Registry**: All 39 specialized presales, evaluation, and review workflows live in [`.agents/skills/`](file:///.agents/skills/). Consult the Dispatch Matrix in root [`AGENTS.md`](file:///AGENTS.md) to load the right `SKILL.md`.
- **Active Learnings & Forensics**: Read [`.agents/ACTIVE_LEARNINGS_DIGEST.md`](file:///.agents/ACTIVE_LEARNINGS_DIGEST.md) for current certified deltas/traps and [`.agents/FORENSIC_LEARNINGS.md`](file:///.agents/FORENSIC_LEARNINGS.md) for codebase-specific pitfalls.
- **Normative Language Standard**: RFC-2119 terminology, banned hedge words, and `HALT-*` rules are codified in [`.agents/rules/normative_language.md`](file:///.agents/rules/normative_language.md).
- **Epistemic Truth & Cognitive Rules**: Anti-pattern prevention rules (Anti-Patterns 1–22) are codified in [`.agents/rules/epistemic_truth_and_deep_reasoning.md`](file:///.agents/rules/epistemic_truth_and_deep_reasoning.md).
- **Graphify Knowledge Graph**: Graph discovery rules live in [`.agents/rules/graphify.md`](file:///.agents/rules/graphify.md). Use `graphify query "<question>"` or `graphify-out/wiki/index.md` first.
- **Data Dictionary**: Canonical schemas live in [`.agents/DATA_DICTIONARY.md`](file:///.agents/DATA_DICTIONARY.md).
- **Complete Invariant Catalog**: All technical invariants (`INV-0` through `INV-280`) are cataloged in [`docs/INVARIANTS.md`](file:///docs/INVARIANTS.md) and searchable via `npm run docs:lookup -- INV-<n>`.

### Runtime Conditional Discovery & Catalog Evidence Contracts
- Follow [`docs/RUNTIME_CONDITIONAL_DISCOVERY.md`](../docs/RUNTIME_CONDITIONAL_DISCOVERY.md) for scraping-time vs BOQ-time selector discovery.
- Follow [`docs/CATALOG_EVIDENCE_AND_LEARNING.md`](../docs/CATALOG_EVIDENCE_AND_LEARNING.md) for scoped catalog queries, promotion, learning provenance, and saved-run export.
