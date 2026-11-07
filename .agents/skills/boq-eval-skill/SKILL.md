---
name: boq-eval-skill
description: >-
  **HPE-ONLY evaluation** of customer BOQs, hardware lists, and Excel quotes (.xlsx/.xls/.csv) against
  HPE ProLiant/Synergy/Alletra/Cray/StoreEver catalogs using 7-aspect physical pre-checks. For
  Cisco/Dell/cross-vendor work, use cross-vendor-transformation-skill. For freeform Q&A or sizing
  without SKUs, use presales-query-router. ALWAYS called via presales-query-router first for intent
  classification — do NOT invoke directly from raw user input without routing. **DO call for**:
  concrete part numbers or tabular tender files that need the 7-aspect physical evaluation and 5-tier
  strategy matrix. **DO NOT call for**: freeform Q&A or sizing without SKUs (presales-query-router),
  or non-HPE tenders (cross-vendor-transformation-skill).
---

# BOQ Evaluation & Strategic Buildability Engine (`boq-eval-skill`)

## 1. Scope & Execution Contract
This skill directs the deterministic evaluation of customer hardware configurations, BOM spreadsheets (`.xlsx`/`.xls`), and text quotes against live HPE OCA catalogs and QuickSpecs rules.

- **Dual-Brain Pipeline**: Deterministic local physical rule engine (7 aspects) + Agentic Grounding (Gemini NotebookLM RAG via `gemini-notebook-mcp`).
- **Tool Segregation (`INV-72`)**: Customer BOQ flow MUST use ONLY [`eval_boq.js`](../../../scripts/evaluators/eval_boq.js) via `runEvaluationPipeline()` and `evaluateBOQMultiAspect()`, the 7-aspect checkers, and `gemini-notebook-mcp`. Never invoke `jules` (CI/CD only) or `data-agent-kit`.
- **Zero-Ad-Hoc Invariant**: Never write one-off evaluation scripts. Always route through canonical [`eval_boq.js`](../../../scripts/evaluators/eval_boq.js) or [`route_query.js`](../../../scripts/evaluators/route_query.js).
- **Normative Directives**: Comply with [Normative Language Standard](../../rules/normative_language.md).

---

## ⛔ HALT Conditions

```
HALT-BOQ1: If candidate BOM has 0 items or filePath cannot be read:
  emit [ERR_EMPTY_BOQ_INPUT] and HALT execution immediately.
  Remediation: Provide a valid file path or paste tabular SKU quantities.

HALT-BOQ2: If target platform cannot be resolved and query is ambiguous:
  emit [ERR_AMBIGUOUS_PLATFORM] and request exact platform (e.g., 'DL380 Gen12').
  Do NOT guess, loop infinitely, or silently default to OEM models.

HALT-BOQ3: If catalog data is missing, or older than the 72-hour freshness threshold (INV-96) without a degraded-mode disclosure:
  emit [ERR_STALE_CATALOG_DATA] and initiate degraded mode disclosure.
  Remediation: Follow degraded-mode-skill or refresh catalog via oca-catalog-scraper.

HALT-BOQ4: If any customer SKU is unmatched in the catalog (customer unmatched SKU gating, Gate B16 / FP-1):
  emit [ERR_UNRESOLVED_CUSTOMER_SKUS] and HALT the pre-presentation gate.
  Remediation: Ground unrecognized SKUs via local RAG or NotebookLM before deliverable export.
```

---

## 2. The 8 Atomic Steps of the BOQ Evaluation Journey

1. **Scraped Catalog Grounding & Freshness Gate (`INV-96`, `INV-118`)**:
   - Asserts catalog exists and is certified under `outputs/{Family}/{Gen}/{Model}/catalog.json`.
   - Rejects uncertified loose files at repository root.
2. **Deterministic 7-Aspect Physical Math Pre-Checks**:
   - Executes offline checkers: Compute/Thermal, Memory Channel, Storage/Tri-Mode, PCIe/Riser, Power/Environment, Networking/OCP, Support/Manufacturing.
3. **5-Level Dependency Conflict Graph & Delta Auto-Injection**:
   - Detects missing mandatory kits (riser boards, heatsinks, power cables, SAS expanders, fan modules).
   - Injects enablement kits with exact `#0D1` / `-F21` FIO tags (`INV-25`).
4. **Alternate Parts & Form-Factor Bus Pivoting (Path B Principle)**:
   - Arbitrates contested slots (e.g., pivoting OCP storage controller to PCIe standup to preserve OCP networking).
5. **Gemini NotebookLM Grounding & Ephemeral Solution Validation (`INV-24`)**:
   - Grounded RAG against official QuickSpecs PDFs and master 22-sheet catalogs.
   - Ephemeral solution validation: temporarily attaches candidate sheet, extracts citations, and detaches immediately (`INV-24`).
6. **5-Tier Strategic Resolution Matrix Ranking (`INV-74`, `INV-193`)**:
   - **Rank 1**: Customer intent preserved with minimum changes to achieve 100% buildability.
   - **Rank 1A / 1B**: Parallel valid topological paths (e.g., SAS Expander vs. 2nd Controller).
   - **Rank 1L**: Least-Delta functional alternative pruning cascading dependencies (`least-delta-combinator-skill`).
   - **The Zero-Rank Invariant**: Unbuildable configurations receive ZERO rank and are excluded from customer deliverables.
7. **Value Engineering & CapEx/OpEx Optimization (`INV-75`, `INV-76`)**:
   - Evaluated strictly AFTER 100% buildability is confirmed (`value-engineering-skill`).
8. **18-Point Pre-Presentation Gate & Dual Deliverable Generation (`INV-99`, `INV-128`)**:
   - Emits Analytical Engineering Workbook (`.xlsx`) and standardized 7-Column Partner Portal upload sheet.
   - Cryptographic `DeliveryAuthorization` certificate required for export. Deliverables remain `PORTAL VALIDATION PENDING` until live CLIC receipt is recorded (`INV-201`, Gate B19).

---

## 3. Canonical CLI Execution

```bash
# Evaluate customer BOQ with automatic platform detection
node scripts/evaluators/eval_boq.js --file path/to/customer_boq.xlsx

# Evaluate with explicit platform override
node scripts/evaluators/eval_boq.js --file path/to/quote.xlsx --chassis DL380_Gen12

# Multi-cluster tender decomposition & parallel evaluation
node scripts/lib/boq/multi_cluster_splitter.js --file path/to/tender.xlsx
```

---

## 4. References & Detailed Documentation
- [Full original BOQ skill text (Phases 1-6, guardrails, Path B pivoting, INV-24..41, CLIC INV-25..31, cognitive mandates, support/SLA learnings)](references/boq_eval_full_original_reference.md)
- [Modular Physical Math & 5-Level Conflict Graph Formulas](references/physical_math_rules.md)
- [Workbook Intake & Spec Neutralization Rules](references/workbook_intake_rules.md)

### Section map (original headings, all preserved in the reference above)
| Topic | Original section |
| :--- | :--- |
| Entry points, dashboard gaps, 8 atomic steps, badges, zero-repetition protocol | 0 |
| Lifecycle and Phase 1-6 engine | 1-2 |
| Anti-hallucination guardrails | 3 |
| Minimum edit distance, Path B bus pivoting | 4 |
| INV-24..38 physical rules | 5 |
| CLI examples, multi-cluster partitioning, portal BOM format | CLI / 3 / 4 |
| CLIC invariants INV-25..31 | 5 (second) |
| Cognitive mandates, support default, SLA, domain routing, runtime discovery | 6 |
- [Shared Runtime Conditional Discovery Contract](../../../docs/RUNTIME_CONDITIONAL_DISCOVERY.md)
- [Master System Invariants Directory](../../../docs/INVARIANTS.md)
