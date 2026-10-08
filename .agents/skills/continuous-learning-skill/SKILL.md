---
name: continuous-learning-skill
description: Closed-loop continuous learning, evidence log reflection, and automated knowledge reachability verification across product generations. Guarantees that learned rules, past failures, and presales feedback are actively reachable and applied on subsequent runs without human repetition.
---

# Continuous Learning & Knowledge Reachability Skill (`continuous-learning-skill`)

**Purpose**: Solves the "write-only learning" anti-pattern in AI architectures. Storing rules into JSON files or NotebookLM sources is insufficient if evaluation engines cannot dynamically discover, reach, and apply those rules during runtime evaluations. This skill mandates that every learned lesson or feedback delta undergoes automated closed-loop reachability certification.

---

## 🔁 The 6-Stage Continuous Learning Lifecycle

```
[Customer Query / BOQ Run]
       │
       ▼
0. Up-Front Ambiguity Triage (Confidence < 0.95 -> ask_question -> Learned Decision)
       │
       ▼
1. Pipeline Execution & Shared State Logging (EvidenceLedger)
       │
       ▼
2. Post-Run Evidence Reflection (What was checked? What was missed?)
       │
       ▼
3. Structured Delta Extraction & Knowledge Registry Sync
       │
       ▼
4. Active Knowledge Router Discovery (Categorized into dependencies, modernizations, substitutions)
       │
       ▼
5. Automated Reachability Pre-Check & Loop Testing (Verifies next run applies rule autonomously)
```

---

## 🛠️ Core Directives for Autonomous Agents (Codex, Claude, Antigravity)

### 1. The Zero-Repetition Rule
- Human users and presales architects must **NEVER** have to repeat instructions or remind agents about previously explained domain rules (e.g. "DL380 Gen11 4th Gen Sapphire Rapids is superseded by 5th Gen Emerald Rapids + DDR5-5600 Smart FIO").
- When a feedback lesson is provided or a portal rejection is observed, the agent MUST immediately persist the rule via `recordAndCertifyLearnedRule()` in `scripts/lib/feedback/continuous_learning_verifier.js`.

### 2. The Active Reachability Contract
- Do not assume that writing to `catalog_deltas.json` is sufficient.
- The agent must verify that:
  1. The rule passes the **Generation Firewall (`INV-48`)** (e.g. Gen 11 rules are isolated to Gen 11 unless tagged `UNIVERSAL`).
  2. The rule is categorized properly by `active_knowledge_router.js`:
     - `mandatoryDependencies`: Physical enablement kits, heatsinks, cables.
     - `generationalModernizations`: CPU/memory generational upgrades.
     - `substitutions`: BTO-to-FIO replacements or discontinued part supersessions.
     - `advisories`: Mixing rules, isolation gates.
  3. The `strategy_synthesizer.js` and `least_delta_combinator.js` actively apply the rule to produce candidate ranks.

- ⛔ **Reachability Fail-Hard Gate**: If `verifyKnowledgeReachability()` returns `reachableCount === 0` for a product profile that has known KnowledgeDeltas recorded on disk:
  - Emit: `[ERR_KNOWLEDGE_UNREACHABLE: Learned rules exist in catalog_deltas.json but active_knowledge_router found 0 reachable rules for chassis <id>.]`
  - Action: Halt evaluation until reachability is restored via `npm run knowledge:rebuild` or taxonomy fix. Never proceed with evaluation in a degraded state where learned rules are silently dropped.

### 3. Chronological Evidence Logging
- Every production BOQ evaluation must export:
  - `outputs/history/evidence_logs/evidence_log_{traceId}.json` (machine-readable shared state across all 9 phases).
  - `outputs/history/evidence_logs/evidence_summary_{traceId}.md` (human-readable table of phases, active rules reached, and SKU audit decisions).
- When investigating why a rule did or did not apply, the agent MUST inspect the `activeRulesReached` section of the evidence log.

### 4. Ephemeral Scratchpad Isolation vs Sealed Master State (`INV-24`, `INV-128`)
- **Zero Premature Master Writes**: Candidate evaluations, exploratory tests, and draft syntheses MUST execute against in-memory state or temporary scratchpads (`os.tmpdir()`).
- Master files (`master_knowledge_registry.json`, `Catalog_Rules.json`, `notebook_sync_payload_*.md`) may **ONLY** be modified via `safeWriteJsonAtomic` after an evaluation passes the 14-Point Delivery Gate (`DeliveryAuthorization`) or receives explicit human approval. This prevents unverified candidate errors from permanently poisoning ground truth.

### 5. Up-Front Disambiguation to Autonomous Promotion Protocol (`INV-73`, `INV-111`)
- When a customer inquiry exhibits ambiguity (confidence $< 0.95$, multiple matching chassis, or ambiguous cluster counts):
  1. **Triage Gate**: Prompt the user with numbered, structured choices via `ask_question`.
  2. **Ingestion**: Ingest the human decision into `feedback_loop.js` (`processPortalFeedback()`) with explicit scope taxonomy and reasoning.
  3. **Loop Testing**: Automatically run a targeted regression check asserting that the previously ambiguous input now resolves with confidence $\ge 0.95$.
  4. **Autonomous Promotion**: Commit the certified rule to `master_knowledge_registry.json`. Future queries matching this pattern resolve autonomously without human prompts!

---

## 📊 Standard Multi-Rank Excel Observability Architecture

All multi-rank deliverables (`*_MultiRank_Solutions.xlsx`) must feature 12 standardized columns across all individual rank sheets:
1. `Part No`
2. `Per-Node Qty`
3. `Node Multiplier`
4. `Total Qty`
5. `Description`
6. `Component Role`
7. `Unit Price (USD)`
8. `Extended Price (USD)`
9. `Physical Math & Rule Engine Rationale` (deterministic physical checks)
10. `Gemini NotebookLM Badge` (RAG source & QuickSpecs citations)
11. `Agentic Guardrail & Evals Trace` (what was checked, flagged, modernized, or pruned)
12. `CLIC Status / Rule Trace` (CLIC validation code & rule ID)

Sheet 1 (`Executive Summary & Aspects`) must include the **Dual-Brain & NotebookLM Comprehensive Verification Audit Table** verifying 100% buildability and grounding across all 5 strategy ranks.

---

## 🔗 Related Skills & Implementation Engines
- [orchestrator-workflow-skill](../orchestrator-workflow-skill/SKILL.md) — Continuous learning macro lifecycle
- [execution-trace-skill](../execution-trace-skill/SKILL.md) — 9-phase evidence ledger and trace persistence
- [boq-eval-skill](../boq-eval-skill/SKILL.md) — 7-aspect pre-flight evaluator and confidence scoring
- [least-delta-combinator-skill](../least-delta-combinator-skill/SKILL.md) — Troublesome SKU pruning and modernization
- [catalog-intelligence-skill](../catalog-intelligence-skill/SKILL.md) — Price trails and lifecycle state changes
- [workbook-generator-skill](../workbook-generator-skill/SKILL.md) — 12-column multi-rank solution deliverable generator


### Registry and evidence continuity (2026-09-22)

Both knowledge-sync writers must use buildMasterKnowledgeRegistry so product-scope corrections cannot be undone by a later writer. Durable learned rules belong in catalog_deltas.json, not only generated registry files. Record new owner lessons via recordAndCertifyLearnedRule and retain reachability evidence. A fresh complete vendor receipt may contribute dated product-qualified service observations to the product sync payload; a customer BOQ must not be promoted as an authoritative source.


Retain exported evidence beside the product report in its `evidence/` directory; shared history paths may be ignored by Git and must not be the only linked copy. Learn topology coverage gaps and scoped service parent/suffix evidence, not unsupported generic vendor rules.


### Runtime conditional discovery contract (2026-09-30)

Read [the shared catalog and BOQ runtime procedure](../../../docs/RUNTIME_CONDITIONAL_DISCOVERY.md) before scraping or live BOQ validation. This contract supersedes older full-coverage claims and blanket bans on BOQ-time conditional investigation. Catalog capture and BOQ-scoped runtime investigation are separate; exploratory portal checks may run before local PASS, while final acceptance requires the exact restored manifest and current vendor receipt. Never select OEM by default, infer mandatory rules from hidden visibility, or treat a catalog miss as unsupported. The runtime plan is generated/exported by the canonical evaluator and checked at acceptance; applying arbitrary BOQs and non-ambient selector states remains a live-agent procedure. Preserve base/owner/quantity/selector provenance and disclose unexecuted branches. Reachable workflow advisories are seeded via scripts/maintenance/record_scraping_workflow_learnings.js; reachability is not hardware certification or cloud sync.
