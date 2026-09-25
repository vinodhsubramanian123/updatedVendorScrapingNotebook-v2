# Review of three presales skills — 2026-09-25

Scope: cross-vendor-transformation-skill, heterogeneous-tender-modernizer and boq-remarks-reconciliation-skill, their direct implementations and router integration. Discovered through Graphify and the addition commits. This review is not a customer BOM certification.

## Findings and corrections

- Cross-vendor synthesis ignored the requested target and selected a fixed DL380 Gen12 chassis, CPU, memory, GPU and storage. Sparse input acquired invented specifications. The audit accepted component descriptions as parity, and alternative ranks claimed buildability without candidate manifests. Removed the fixed synthesis and unsupported compliance claims. Extraction preserves explicit CPU/memory values, original structured input and unresolved source lines. Supplied per-node candidates remain candidates; target selection, sizing and evaluation are explicit canonical handoffs.
- The modernizer defaulted to one server model, classified unidentified/mixed items as servers, discarded loose-group multipliers, silently left adapters unallocated, and treated adapters as interchangeable PCIe/OCP parts. It now requires an exact profile, retains unresolved domains and quantities, and exposes unallocated items. Memory pools are capacity estimates with source links, not certified minimum fleets or completed BOMs. Explicit spares are not automatically absorbed.
- Profile lookup accepted broad substrings and SKU prefixes misidentified accessories as CPUs/controllers. Lookup now requires exact keys or unique model suffixes; generic detection no longer treats SKU prefixes as product facts. Product data remains scoped historical observations requiring current evidence, not live catalog truth.
- Dependency injection inferred fan, rail and OCP requirements without complete predicates. It now preserves input and hands off to scoped evaluation. Historical replacement mappings no longer overwrite source SKUs or assert current orderability. A prose NotebookLM answer cannot establish grounded validation.
- Upload formatting silently defaulted zero/missing quantities, dropped marked rows, and inserted banner rows into a strict tabular dialect. The formatter now rejects invalid quantities, missing SKUs, implicit omissions and ambiguous multipliers. Four-column batch formatting and seven-column Partner Portal reconciliation are documented separately; formatting success is not vendor acceptance.
- Remarks instructions contradicted dynamic header discovery with fixed Column F/B–F rules, hardcoded pool/table names, a scratch script, and an unsupported 24x7 warranty guarantee. The new reusable helper resolves headers, rejects ambiguity, appends analysis beyond existing customer cells, preserves notes and supports explicit unresolved quantities. Removed hardcoded customer references and guarantees. Reconciliation must establish parity/allocation before formatting; the helper itself does not certify a match or render workbooks.
- Router handlers previously reported transformation success without evidence, discarded draft details and read binary spreadsheets as UTF-8. They now expose draft and missing-input states, preserve complete deliverable data and require prior binary-file ingestion. Mere mention of PowerEdge no longer triggers conversion. Explicit sizing handoffs avoid routing loops.
- Rewrote all three skills, aligned the existing BOM reconciliation skill, repaired the charter implementation path and added router discovery entries. Removed fixed notebook IDs, product substitutions, historical prices/dates, table numbers and unsupported lifecycle/support promises from these skill instructions.

## Current capability boundary

The former automatic cross-vendor output was a hardcoded example, not a general transformation engine. This review removes that unsafe path rather than pretending a universal catalog selector exists. Cross-vendor work requires canonical scoped sizing and evaluation; the helper does not autonomously complete those stages. Heterogeneous planning currently estimates memory capacity and preserves other allocations as unresolved. Complete multi-domain ownership, carrier BOM synthesis, line-level parity and live vendor acceptance still require the documented canonical workflows and appropriate product evidence.

No customer outputs, live portal sessions, notebook sources or Google Sheets were changed. Default unspecified support remains product-qualified 3-year Tech Care Basic; explicit customer support wins.

## Verification and Antigravity/Gemini handoff

Codex performed JavaScript syntax checks and git diff whitespace validation. All three skills passed the skill-creator frontmatter validator (isolated PyYAML runtime; UTF-8 mode for Windows). The semantic code graph was refreshed with npm run update:graph. Regression execution remains assigned to Antigravity/Gemini under the repository charter; no regression pass or historical benchmark is claimed for these changes. The former tests that blessed hardcoded parts/false success were replaced with boundary regressions. The maintenance verification entrypoint runs the updated boundary cases without certification language.

Run:

```powershell
node --test tests/unit/test_cross_vendor_transformer.js tests/unit/test_presales_skill_boundaries.js
node scripts/maintenance/verify_heterogeneous_modernizer.js
```

Then run the applicable canonical router, evaluator and regression checks. Exercise new targets, sparse inputs, reordered columns, ambiguous profiles, loose multipliers, mixed ownership, invalid portal rows, unknown quantities and offline cloud states. Review product-scoped candidates with native NotebookLM citations and a fresh final-manifest vendor receipt before any customer certification. These tests are prepared, not executed by Codex.
