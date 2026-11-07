---
name: epistemic-verification-skill
description: >-
  **Popperian Falsification, Epistemic Truth & Negative-Path Counterexample Audits**.
  **DO call for**: Validating proposed fixes before integration, auditing nullable price integrity,
  verifying fresh-process learning consumption, and asserting terminal 9-phase evidence ledger health.
  **DO NOT call for**: Standard customer spreadsheet formatting (use workbook-generator-skill),
  or live portal scraping (use oca-catalog-scraper).
---

# Epistemic Verification & Popperian Falsification Gate (`epistemic-verification-skill`)

## 1. Purpose & Core Authority
This skill establishes deterministic falsification protocols to ensure that all evaluations, code changes, and agentic workflows are **100% mathematically sound, non-hallucinated, factually grounded, and non-repudiable on disk** (`INV-104` to `INV-111`, `INV-191`, `INV-202`, `INV-215`, `INV-229`, `INV-230`).

- **Non-Repudiation on Disk (`INV-104`)**: Truth exists in persistent files on disk verified by SHA-256 fingerprints, never in transient in-memory flags.
- **Zero Default Success (`INV-105`)**: Loose `!== false ? 'PASS' : 'FAIL'` evaluation is strictly prohibited. Missing checks MUST evaluate to `'UNKNOWN'` or `'NOT_EVALUATED'`.
- **Zero Self-Citation (`INV-106`)**: Ephemeral candidate BOMs attached to NotebookLM are query inputs only; self-citations evaluate to `UNKNOWN`.
- **Universal CC $\le 30$ Ceiling (`INV-229`, `INV-230`)**: Whole-repository cyclomatic complexity ceiling strictly $\le 30$.
- **Normative Directives**: Comply with [Normative Language Standard](../../rules/normative_language.md).

---

## ⛔ HALT Conditions

```
HALT-EPI1: If any presales pipeline run terminates with non-terminal ledger phases:
  emit [ERR_NON_TERMINAL_EVIDENCE_PHASES] and HALT.
  No phase may remain RUNNING or undefined. All 9 phases must be terminal (INV-107).

HALT-EPI2: If unquoted/missing prices are coerced to $0 instead of null:
  emit [ERR_MANUFACTURED_PRICE_COERCION] and HALT. Nullable prices must remain null.

HALT-EPI3: If a test suite reports 0 assertions or 0 discovered suites (INV-129):
  emit [ERR_SILENT_EMPTY_TEST_PASS] and fail the test execution run.
```

---

## 2. The 5 Core Falsification Gates

### Gate 1: The Nullable Price Integrity Gate
- Missing, unquoted, or unpriced items MUST evaluate to `null` with `pricingComplete: false`.
- Counterexample Test: Pass `{ sku: "TEST-SKU", unitPriceUsd: null }` through `BOQItemSchema`. It MUST NOT coerce to `0`.
- Verify that `budget_optimizer.js` does NOT overwrite `quotedUnitPriceUsd` with list price.

### Gate 2: The Fresh-Process Consumption Gate
- Persisted learning, user preferences, and knowledge deltas MUST be consumed by a separate, unprimed Node process.
- Execute candidate queries in a fresh subprocess *without injecting any context or hints into the prompt*.
- Proof: The subprocess MUST retrieve the record from disk and apply it through its normalized query lookup.

### Gate 3: The Cascading Aspect Integrity Gate
- Any slot arbitration, controller move, or SKU substitution MUST trigger a full 7-aspect checker re-evaluation.
- Moving an OCP controller to a PCIe slot re-evaluates PCIe riser lanes, thermal fan kits, and aux power cables.

### Gate 4: The Category Isolation & Anti-Poisoning Gate
- User session preferences and operational incidents MUST NEVER be promoted into physical hardware conflict rules.
  - `OPERATIONAL_INCIDENT` $\rightarrow$ Recorded in operational history; zero hardware rule generation.
  - `WORKFLOW_PREFERENCE` $\rightarrow$ Saved in `user_platform_selection_store.js`; zero hardware rule generation.
  - `HARDWARE_PHYSICAL_RULE` $\rightarrow$ Certified ONLY with official QuickSpecs citation or CLIC error receipt.

### Gate 5: The 9-Phase Terminal Ledger Gate
- Every presales pipeline run MUST bring all 9 phases of the `EvidenceLedger` to terminal status (`PASSED`, `FAILED`, `ACTION_REQUIRED`, `SKIPPED`, `NOT_REACHED`).
- Verification: `node scripts/maintenance/audit_evidence_health.js --save`

---

## 3. Reusable Verification Commands

```powershell
# 1. Fast smoke test suite
npm run test:smoke

# 2. Universal cyclomatic complexity audit (CC <= 30 ceiling)
node scripts/maintenance/analyze_complexity.js

# 3. Static circular dependency analysis (clean DAG)
node scripts/maintenance/analyze_circular_deps.js

# 4. Core oxlint verification (0 warnings, 0 errors)
npm run lint:core

# 5. Affected domain regression suite
npm run test:domain <domain_name>
```

---

## 4. References & Related Charters
- [Code Quality Gate Skill](../code-quality-gate-skill/SKILL.md)
- [Self-Correction & Counterfactual Skill](../self-correction-counterfactual-skill/SKILL.md)
- [Evidence Ledger Service](../../../scripts/lib/system/evidence_ledger.js)
- [Master System Invariants Directory (INV-104 to INV-111, INV-229, INV-230)](../../../docs/INVARIANTS.md)
