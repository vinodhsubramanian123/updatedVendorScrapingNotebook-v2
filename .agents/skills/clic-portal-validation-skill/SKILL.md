---
name: clic-portal-validation-skill
description: >
  Execute live CLIC (HPE One Config Advanced) portal validation transactions, parse
  CLIC Advice modal responses, categorize build-breaking unbuildable errors vs.
  ignorable advisories/warnings (INV-93), synthesize divergent multi-path resolution
  (Rank 1A/1B from conflicting CLIC remediation paths), bind official vendor acceptance
  receipts to SHA-256 manifest fingerprints (INV-107), and map CLIC errors to
  KnowledgeDelta records for continuous learning via `feedback_loop.js`.
  **Call this skill as the FINAL validation gate after local 7-aspect physical
  pre-checks pass and a 100% buildable BOM candidate is ready. NEVER call during
  early BOQ exploration or RFP sizing. NEVER invoke via Jules (INV-72).**
---

# CLIC Portal Validation Skill — Live Vendor Acceptance & Receipt Binding

## 🧭 Quick Navigation

| Section | Link |
| :--- | :--- |
| Trigger Conditions | §1 |
| Pre-Entry Gate | §2 |
| CLIC Advice Ingestion & Parsing | §3 |
| Error vs. Advisory Classification | §4 |
| Divergent Multi-Path Resolution (INV-93) | §5 |
| Official Vendor Acceptance Receipt Binding (INV-107) | §6 |
| CLIC Error → KnowledgeDelta Pipeline | §7 |
| HALT Conditions | §8 |
| Integration Wiring | §9 |

---

## §1 — Trigger Conditions

**Call this skill ONLY when ALL of the following are true:**

| Condition | Verification |
| :--- | :--- |
| Local 7-aspect physical pre-checks have all passed (`PASS`) | `scripts/lib/boq/bom_verifier.js` output |
| A 100% buildable BOM candidate exists (all mandatory components present) | 5-Tier Strategy Matrix shows Rank 1A/1B candidate |
| An active OCA browser session exists (Tab 1 self-healed if needed) | `oca-portal-navigator` completed |
| Customer catalog freshness is NOT in CRITICAL_OUTDATED mode | `degraded-mode-skill` freshness gate |

**DO NOT call this skill for:**
- Early BOQ triage or RFP sizing (use `presales-query-router` → `boq-eval-skill`)
- Competitive/cross-vendor work (use `cross-vendor-transformation-skill`)
- Catalog intelligence queries (use `catalog-intelligence-skill`)
- Any Jules CI/CD flow (INV-72 — excluded)

---

## §2 — Pre-Entry Gate (GATE-CLIC0)

Before entering OCA for CLIC validation, perform this pre-flight:

```
GATE-CLIC0: Pre-Entry Checklist
  ☐ bom_verifier.js 7-aspect result = all PASS
  ☐ At least one buildable BOM rank exists (Rank 1A or Rank 1B)
  ☐ solutionFingerprint SHA-256 computed from final manifest (see §6)
  ☐ No pending SKU substitutions or unresolved CLIC errors from a prior run
  ☐ oca-portal-navigator confirms active OCA session on correct chassis
```

If any gate item is `false`: HALT. Do not enter OCA. Resolve the upstream failure first.

---

## §3 — CLIC Advice Ingestion & Parsing

### 3.1 CLIC Advice Sources

CLIC Advice responses arrive in two forms:
1. **Live modal** — displayed inline in the OCA browser tab (CDP-scraped)
2. **Advice workbook** — downloadable XLSX from CLIC Advice panel (parsed via `ocr-quote-ingestion-skill` or direct XLSX parse)

### 3.2 Modal Parsing via CDP

```javascript
const { extractCLICAdvice } = require('./scripts/lib/scraper/navigate_oca.js');

const advicePayload = await extractCLICAdvice({
  tabId: activeOCATab,
  manifestSHA256: solutionFingerprint
});
// Returns: { errors: [...], warnings: [...], advisories: [...], acceptanceStatus: string }
```

### 3.3 Advice Workbook Parsing

If a CLIC Advice XLSX is provided:
1. Parse via `xlsx` package — read "Advice" sheet
2. Extract columns: `[Row, Part Number, Description, Advice Type, Advice Text, Resolution]`
3. Feed to `classifyAdviceEntries()` (see §4)

### 3.4 CLIC Response Shape

```json
{
  "acceptanceStatus": "UNBUILDABLE | BUILDABLE_WITH_WARNINGS | BUILDABLE",
  "errors": [
    {
      "errorCode": "CLIC_ERROR_E47",
      "affectedSKU": "P48818-B21",
      "adviceText": "Heatsink required for GPU configuration",
      "remediationRequired": true,
      "remediationSKU": "P48818-B21",
      "divergentPaths": null
    }
  ],
  "warnings": [...],
  "advisories": [...],
  "manifestSHA256": "abc123...",
  "receiptId": null
}
```

---

## §4 — Error vs. Advisory Classification

### 4.1 Classification Rules

| CLIC Advice Category | Treatment | Build-Blocking? |
| :--- | :--- | :--- |
| **UNBUILDABLE ERROR** (mandatory component missing, incompatible combination) | Map to remediation action | ✅ YES — must resolve |
| **CONFIGURATION WARNING** (suboptimal but valid, e.g. performance note) | Log only; include in Tier 1 matrix | ❌ NO |
| **INFORMATIONAL ADVISORY** (notes, lifecycle hints, best-practice suggestions) | Log only | ❌ NO |
| **QUANTITY ADVISORY** (non-standard quantity detected) | Verify quantity intent; log | ❌ NO |

### 4.2 Build-Breaking Error → Mandatory Remediation Action Mapping

For each build-breaking `CLIC_ERROR_Exx`:

1. Parse `adviceText` for the missing component or incompatible pair
2. Query catalog for remediation SKU (`catalog_freshness_guard.js` → catalog lookup)
3. If catalog stale (`CRITICAL_OUTDATED`): flag remediation as `UNVERIFIED` — do not hard-code
4. Inject remediation SKU into the BOM as `remediationSource: 'CLIC_MANDATE'`
5. Re-run 7-aspect physical pre-checks after each injection (to catch cascade effects)
6. If multiple valid remediation SKUs exist → trigger divergent path resolution (§5)

### 4.3 CLIC Error Code → Action Table (Known Error Classes)

| Error Class | Example | Typical Resolution |
| :--- | :--- | :--- |
| Missing heatsink | `CLIC_ERROR_E47` | Inject appropriate heatsink SKU for GPU/CPU config |
| PSU wattage mismatch | `CLIC_ERROR_E12` | Upgrade PSU to next wattage tier; check redundancy pair |
| Missing RAID controller | `CLIC_ERROR_E23` | Add MR controller or SAS Expander per Rank 1A/1B split |
| Missing cable kit | `CLIC_ERROR_E31` | Inject drive backplane cable kit |
| Missing riser for PCIe card | `CLIC_ERROR_E55` | Inject correct riser kit per slot assignment |
| GPU aux power cable missing | `CLIC_ERROR_E61` | Inject GPU aux power cable for each GPU |
| Dual-socket requires matched CPUs | `CLIC_ERROR_E08` | Align both socket CPUs to same stepping/TDP |
| Memory channel violation | `CLIC_ERROR_E19` | Rebalance DIMM population per channel rules |

> [!IMPORTANT]
> This table is illustrative, not exhaustive. Always parse the live `adviceText` for exact remediation. Never hard-code a remediation SKU without catalog verification.

---

## §5 — Divergent Multi-Path Resolution (INV-93)

When CLIC returns 2 or more valid remediation paths for the same error:

### 5.1 Path Divergence Detection

```
Divergence triggers when:
  - CLIC advises Component_A OR Component_B as valid alternatives
  - OR the advisory text contains "either ... or ..."
  - OR two distinct SKU sets both clear the same CLIC error
```

### 5.2 Preserve Both Paths as Rank 1A / Rank 1B

```javascript
const divergentPaths = {
  "Rank1A": {
    label: "SAS Expander Path",
    deltaComponents: [{ sku: "P26351-B21", qty: 1, desc: "12Gb SAS Expander" }],
    clicStatus: "BUILDABLE",
    totalDelta: 450.00
  },
  "Rank1B": {
    label: "Second RAID Controller Path",
    deltaComponents: [{ sku: "P26325-B21", qty: 1, desc: "MR408i-o Controller" }],
    clicStatus: "BUILDABLE",
    totalDelta: 720.00
  }
};
```

### 5.3 Surface Both Paths — Never Silently Choose

**HALT-CLIC4**: Never silently select one divergent path over another. ALWAYS present both Rank 1A and Rank 1B to the human with:
- Component delta per path
- CapEx delta per path
- OpEx implications (if any)
- Customer workload recommendation from `workload-dna-skill`

Feed both paths to the 5-Tier Strategy Matrix downstream.

### 5.4 Integration with least-delta-combinator-skill

When Rank 1A/1B paths exist, invoke `least-delta-combinator-skill` to:
- Identify which path has the smaller total component delta (Rank 1L)
- Check cascade dependencies (does SAS Expander require fans, cables, PSU upgrade?)
- Surface Rank 1L as the "minimal mutation" alternative alongside Rank 1A/1B

---

## §6 — Official Vendor Acceptance Receipt Binding (INV-107)

### 6.1 Receipt Cryptographic Binding

Every CLIC acceptance receipt is bound to the exact solution manifest at the moment of acceptance:

```javascript
const crypto = require('crypto');

function computeSolutionFingerprint(manifest) {
  // manifest = sorted array of { sku, qty } — deterministic sort required
  const sorted = [...manifest].sort((a, b) => a.sku.localeCompare(b.sku));
  return crypto.createHash('sha256').update(JSON.stringify(sorted)).digest('hex');
}
```

### 6.2 Receipt Storage Schema

```json
{
  "receiptId": "OCA-RECEIPT-2026-09-29-DL380G12-001",
  "issuedAt": "2026-09-29T10:00:00.000Z",
  "solutionFingerprint": "abc123def456...",
  "productKey": "DL380_Gen12",
  "clicAcceptanceStatus": "BUILDABLE",
  "manifest": [
    { "sku": "P06420-B21", "qty": 1, "desc": "DL380 Gen12 Chassis" },
    ...
  ],
  "warnings": [...],
  "advisories": [...],
  "receiptValid": true,
  "invalidatedReason": null
}
```

Store receipts at: `outputs/{Family}/{Gen}/{Model}/receipts/{receiptId}.json` using `safeWriteJsonAtomic()`.

### 6.3 Receipt Invalidation Rules

**HALT-CLIC1**: A receipt is immediately invalidated (set `receiptValid: false`, `invalidatedReason: "MANIFEST_CHANGED"`) if ANY of the following occur after issuance:

| Change Type | Action |
| :--- | :--- |
| Any SKU added or removed from manifest | Invalidate receipt |
| Any quantity changed | Invalidate receipt |
| Any SKU description corrected (even minor) | Invalidate receipt |
| Catalog resync changes a SKU's availability status | Invalidate receipt |

After invalidation, a new CLIC validation session must be initiated to obtain a fresh receipt.

### 6.4 `PORTAL VALIDATION PENDING` Status

**HALT-CLIC5**: All solutions remain in `PORTAL VALIDATION PENDING` status until:
1. A valid (non-invalidated) receipt exists for the exact current manifest
2. The receipt `issuedAt` is within the session freshness window (same OCA session)
3. `clicAcceptanceStatus === 'BUILDABLE'`

Never remove `PORTAL VALIDATION PENDING` based on local 7-aspect pass alone.

---

## §7 — CLIC Error → KnowledgeDelta Pipeline

Every CLIC error that results in a successful remediation becomes a KnowledgeDelta record for continuous learning:

### 7.1 KnowledgeDelta Record Shape

```json
{
  "deltaId": "KD-CLIC-DL380G12-E47-2026-09-29",
  "productKey": "DL380_Gen12",
  "sourceEvent": "CLIC_VALIDATION",
  "errorCode": "CLIC_ERROR_E47",
  "triggerCondition": "GPU added without heatsink",
  "remediationApplied": { "sku": "P48818-B21", "qty": 1, "desc": "2U Standard Heatsink" },
  "remediationVerified": true,
  "clicReceiptId": "OCA-RECEIPT-2026-09-29-DL380G12-001",
  "learnedAt": "2026-09-29T10:05:00.000Z"
}
```

### 7.2 Persist via Feedback Loop

```javascript
const { processPortalFeedback } = require('./scripts/lib/feedback/feedback_loop.js');

await processPortalFeedback({
  productKey: 'DL380_Gen12',
  eventType: 'CLIC_VALIDATION',
  errors: advicePayload.errors,
  remediations: appliedRemediations,
  receiptId: receipt.receiptId
});
```

### 7.3 Knowledge Delta Sync

After persisting KnowledgeDelta records, invoke `knowledge-sync-skill` to propagate the learnings to the product's NotebookLM notebook, ensuring future evaluations benefit from the CLIC corrections.

---

## §8 — HALT Conditions

```
HALT-CLIC0: Pre-entry gate (GATE-CLIC0) must be fully satisfied. Never enter OCA without
            all 7-aspect checks passing.

HALT-CLIC1: Never reuse a CLIC receipt after manifest changes.
            Any SKU or quantity change requires a new validation session.

HALT-CLIC2: Never invoke this skill from customer BOQ early exploration flows (INV-72).
            Jules is strictly excluded. This is final-gate only.

HALT-CLIC3: Maintain PORTAL VALIDATION PENDING status until an official, non-invalidated
            CLIC receipt exists for the exact current manifest.

HALT-CLIC4: Never silently select one divergent remediation path over another.
            Always surface Rank 1A and Rank 1B to the human.

HALT-CLIC5: Never remove PORTAL VALIDATION PENDING based on local 7-aspect pass alone.
            Only a valid CLIC receipt clears this status.

HALT-CLIC6: Never persist a KnowledgeDelta for an error that was not successfully
            remediated in the same session. Unresolved errors stay as open issues.

HALT-CLIC7: Never inject a remediation SKU from a stale catalog (CRITICAL_OUTDATED).
            Flag as UNVERIFIED and trigger degraded-mode-skill freshness recovery first.
```

---

## §9 — Integration Wiring

### 9.1 Files This Skill Orchestrates

| File | Role |
| :--- | :--- |
| `scripts/lib/scraper/navigate_oca.js` | CDP CLIC session + `extractCLICAdvice()` |
| `scripts/lib/boq/bom_verifier.js` | Pre-entry 7-aspect gate verification |
| `scripts/lib/feedback/feedback_loop.js` | `processPortalFeedback()` for KnowledgeDelta |
| `scripts/lib/system/fs_compat.js` | `safeWriteJsonAtomic()` for receipt storage |
| `outputs/{Family}/{Gen}/{Model}/receipts/` | Receipt persistence directory |
| `scripts/config/notebooks.json` | Notebook ID SSOT for post-validation sync |

### 9.2 Called By

- `boq-eval-skill` — final validation gate after buildable BOM confirmed
- `orchestrator-workflow-skill` — Stage 5 (portal acceptance)
- `output-validation-skill` — B13 check: verifies CLIC receipt exists and is valid

### 9.3 Calls Out To

- `degraded-mode-skill` — freshness check before remediation SKU injection
- `least-delta-combinator-skill` — Rank 1L synthesis from divergent paths
- `workload-dna-skill` — recommend path based on workload profile
- `knowledge-sync-skill` — post-validation notebook sync with KnowledgeDeltas
- `continuous-learning-skill` — full feedback loop closure
