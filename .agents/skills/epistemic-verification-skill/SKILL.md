---
name: epistemic-verification-skill
description: Execute rigorous Popperian falsification, negative-path counterexample audits, honest nullable data contract validation, fresh-process learning consumption proof, and 9-phase terminal evidence ledger verification across all evaluations and PRs.
---

# Epistemic Verification & Anti-Hallucination Audit Skill

## Purpose & Authority
This skill provides deterministic verification and falsification protocols to ensure that all evaluations, code changes, and agentic workflows are **100% mathematically sound, non-hallucinated, factually grounded, and non-repudiable on disk**.

Invoke this skill whenever:
- Validating a proposed fix or feature before local integration.
- Auditing presales outputs, BOQ pricing, and multi-node cluster scaling.
- Verifying that continuous learning deltas or user preferences are provably consumed in a clean process without prompt priming.
- Ensuring zero manufactured numbers (e.g. unquoted prices turning into \$0).
- Verifying terminal ledger health and cancellation envelopes.

---

## 1. The 5 Core Falsification Gates

Every candidate change or deliverable must pass these five gates:

### Gate 1: The Nullable Price Integrity Gate
- **Invariant**: Missing, unquoted, or unpriced items must evaluate to `null` with `pricingComplete: false`.
- **Check**: Assert that `it.unitPriceUsd === null` and `it.quotedUnitPriceUsd === null` for unpriced rows.
- **Counterexample Test**: Pass `{ sku: "TEST-SKU", unitPriceUsd: null }` through `BOQItemSchema`. It must NOT coerce to `0`.
- **Budget Optimizer Check**: Verify that `budget_optimizer.js` does NOT overwrite `it.quotedUnitPriceUsd` with `catalogListPriceUsd`.

### Gate 2: The Fresh-Process Consumption Gate
- **Invariant**: Persisted learning, user preferences, and knowledge deltas must be consumed by a separate, unprimed Node process.
- **Check**: Execute the candidate query in a fresh subprocess *without injecting any context or hints into the prompt*.
- **Proof**: The subprocess must retrieve the record from disk and execute the stored preference solely through its normalized query lookup.

### Gate 3: The Cascading Aspect Integrity Gate
- **Invariant**: Any slot arbitration, controller move, or SKU substitution must trigger a full 7-aspect checker re-evaluation.
- **Check**: Ensure that moving an OCP controller to a PCIe slot re-evaluates:
  - PCIe riser lane availability and bifurcation.
  - Thermal envelope and high-performance fan requirements.
  - GPU auxiliary power cables and wattage draw.

### Gate 4: The Category Isolation & Anti-Poisoning Gate
- **Invariant**: User session preferences and operational incidents must NEVER be promoted into physical hardware conflict rules.
- **Check**: Verify incident taxonomy:
  - `OPERATIONAL_INCIDENT` (e.g. scraper timeout, network flake) $\rightarrow$ Recorded in operational history; zero hardware rule generation.
  - `WORKFLOW_PREFERENCE` (e.g. user selected 2U chassis) $\rightarrow$ Saved in `user_platform_selection_store.js`; zero hardware rule generation.
  - `HARDWARE_PHYSICAL_RULE` $\rightarrow$ Certified ONLY with official QuickSpecs citation or CLIC error receipt.

### Gate 5: The 9-Phase Terminal Ledger Gate
- **Invariant**: Every presales pipeline run must bring all 9 phases of the `EvidenceLedger` to a terminal status (`PASSED`, `FAILED`, `ACTION_REQUIRED`, `SKIPPED`).
- **Check**: Phase 8 records all deliverables (report, XLSX, JSON). Phase 9 records reflection. No phase may remain `RUNNING` or `undefined`. Run:
  ```powershell
  node scripts/maintenance/audit_evidence_health.js --save
  ```

---

## 2. Reusable Verification Commands

```powershell
# 1. Run isolated fixture tests
npm run test:isolated -- <path_to_test>

# 2. Run affected domain regression
npm run test:domain -- <domain_name>

# 3. Check circular dependencies across entire repository
node scripts/maintenance/analyze_circular_deps.js

# 4. Check cyclomatic complexity (CC <= 135)
node scripts/maintenance/analyze_complexity.js

# 5. Offline targeted linter
npx oxlint <modified_files>
```
