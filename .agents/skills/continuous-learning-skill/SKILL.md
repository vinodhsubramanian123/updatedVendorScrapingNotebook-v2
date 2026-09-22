---
name: continuous-learning-skill
description: Closed-loop continuous learning, evidence log reflection, and automated knowledge reachability verification across product generations. Guarantees that learned rules, past failures, and presales feedback are actively reachable and applied on subsequent runs without human repetition.
---

# Continuous Learning & Knowledge Reachability Skill (`continuous-learning-skill`)

**Purpose**: Solves the "write-only learning" anti-pattern in AI architectures. Storing rules into JSON files or NotebookLM sources is insufficient if evaluation engines cannot dynamically discover, reach, and apply those rules during runtime evaluations. This skill mandates that every learned lesson or feedback delta undergoes automated closed-loop reachability certification.

---

## 🔁 The 5-Stage Continuous Learning Lifecycle

```
[Customer Query / BOQ Run]
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
5. Automated Reachability Pre-Check (In-memory verification that next run applies the rule)
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

### 3. Chronological Evidence Logging
- Every production BOQ evaluation must export:
  - `outputs/history/evidence_logs/evidence_log_{traceId}.json` (machine-readable shared state across all 9 phases).
  - `outputs/history/evidence_logs/evidence_summary_{traceId}.md` (human-readable table of phases, active rules reached, and SKU audit decisions).
- When investigating why a rule did or did not apply, the agent MUST inspect the `activeRulesReached` section of the evidence log.

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
