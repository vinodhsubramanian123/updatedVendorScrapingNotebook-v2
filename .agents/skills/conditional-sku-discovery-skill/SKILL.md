---
name: conditional-sku-discovery-skill
description: >
  Perform scraping-time conditional SKU discovery per INV-118: walk full DOM trees via
  `extractHiddenElements()` (never assume rendered DOM is exhaustive), sweep all macro
  selectors (ambient ≤27°C vs ≤35°C, 1P vs 2P CPU, rear backplane variants, power supply
  redundancy modes), persist raw trigger gates to `raw_data/conditional_skus.json`, and
  compile `Catalog_Rules.json` with machine-parseable `thresholdValue`, `conditionOperator`,
  and `conditionKey` fields. Flag conditionally discovered SKUs as `PORTAL_CONDITIONAL` in
  the catalog per INV-119, and emit the 5-step evaluation narrative via
  `generateEvaluationNarrative()` for each gated SKU. **Call this skill ONLY during active
  OCA portal scraping sessions — NEVER during BOQ evaluation flows (INV-72 scope isolation).**
---

# Conditional SKU Discovery Skill — Full DOM Walk & Macro Selector Sweep

## 🧭 Quick Navigation

| Section | Link |
| :--- | :--- |
| Trigger Conditions | §1 |
| Full DOM Tree Walking (INV-118) | §2 |
| Macro Selector Sweep Matrix | §3 |
| Conditional SKU Persistence Schema | §4 |
| Catalog_Rules.json Compilation | §5 |
| PORTAL_CONDITIONAL Flagging (INV-119) | §6 |
| 5-Step Evaluation Narrative | §7 |
| Knowledge Governance & Degraded Mode | §8 |
| HALT Conditions | §9 |
| Integration Wiring | §10 |

---

## §1 — Trigger Conditions

**Call this skill ONLY when:**

| Trigger | Context |
| :--- | :--- |
| Active OCA browser scraping session exists for a product gen | Step 3 of the resync chain in `degraded-mode-skill §3.2` |
| `oca-catalog-scraper` has completed its primary DOM scrape but before catalog promotion | Between scraper completion and staging audit |
| A product catalog resync is requested and the product gen is known to have conditional SKUs | `raw_data/conditional_skus.json` has prior entries for this product |

**NEVER call during:**
- BOQ evaluation flows (INV-72 — scope isolation)
- RFP sizing or BOM reconciliation flows
- Jules CI/CD runs
- Any non-scraping evaluation context

---

## §2 — Full DOM Tree Walking (INV-118)

### 2.1 Core Principle

> The default rendered OCA DOM is NOT exhaustive. Conditional SKUs only appear after user interactions (option changes, environment toggles). Never assume the initial page load contains all available options.

### 2.2 `extractHiddenElements()` Call

```javascript
const { extractHiddenElements } = require('./scripts/lib/scraper/navigate_oca.js');

const hiddenElements = await extractHiddenElements({
  tabId: activeOCATab,
  productKey: 'DL380_Gen12',
  sweepAllMacros: true    // always true — never partial sweep
});
// Returns: { conditionalSKUs: [...], triggerMap: {...}, domNodeCount: number }
```

**HALT-CSD3**: If `domNodeCount === 0` or `conditionalSKUs.length === 0` after a full sweep, emit `[ERR_DOM_WALK_EMPTY: {productKey} — zero elements returned from extractHiddenElements()]` and retry once. If second attempt also returns 0, log as `DOM_WALK_INCONCLUSIVE` (does not fail the scrape — product may genuinely have no conditional SKUs).

### 2.3 DOM Walk Strategy

The DOM walk must cover ALL of the following element types:

| Element Type | CSS/XPath Target | Purpose |
| :--- | :--- | :--- |
| Hidden option groups | `[style*="display:none"]`, `[aria-hidden="true"]` | Reveal conditional option panels |
| Collapsed accordion sections | `.option-group.collapsed`, `[data-state="collapsed"]` | Expand all accordion-collapsed sections |
| Disabled dropdowns | `select[disabled]`, `input[disabled]` | Detect conditionally-enabled fields |
| Tooltip/help text containers | `[data-tooltip]`, `.help-text` | Extract conditional dependency descriptions |
| Dynamic injected DOM nodes | MutationObserver during macro sweeps | Capture runtime-injected SKU rows |

---

## §3 — Macro Selector Sweep Matrix

For each product gen, sweep ALL macro selectors below. Each sweep triggers a DOM state change that may reveal hidden conditional SKUs.

### 3.1 Sweep Sequence (Execute in This Order)

| Sweep # | Macro Selector | Condition Key | Values to Toggle |
| :--- | :--- | :--- | :--- |
| S1 | Ambient Operating Temperature | `ambient_temp` | `≤27°C` → `≤35°C` (capture diff) |
| S2 | CPU Count / Socket Population | `cpu_count` | `1P` (single) → `2P` (dual) |
| S3 | Rear Drive Backplane | `rear_backplane` | `None` → `2-bay SFF` → `4-bay SFF` (all variants) |
| S4 | PSU Redundancy Mode | `psu_redundancy` | `Non-redundant` → `Redundant 1+1` → `2+2` |
| S5 | GPU Count | `gpu_count` | `0` → `1` → `2` → `4` (if supported) |
| S6 | OCP/NIC Slot Population | `ocp_slot` | `Empty` → `OCP NIC` → `OCP Storage` |
| S7 | Drive Backplane Capacity | `backplane_capacity` | All supported bay counts |
| S8 | Fan Policy | `fan_policy` | `Standard` → `High Performance` |

### 3.2 Per-Sweep DOM Diff

After each toggle (e.g., switching from `≤35°C` to `≤27°C`):
1. Capture DOM snapshot (full `innerHTML` of options panel)
2. Diff against baseline snapshot
3. Extract newly appeared SKU rows: `[{ sku, description, category, trigger }]`
4. These are conditional SKUs for that trigger combination

### 3.3 Conditional SKU Identification

A SKU is classified as conditional when:
- It appears in the DOM ONLY after a specific macro toggle
- It does NOT appear in the baseline rendered DOM
- Its presence is gated by a condition (temperature, CPU count, slot population, etc.)

---

## §4 — Conditional SKU Persistence Schema

### 4.1 `raw_data/conditional_skus.json` — Raw Discovery Output

Location: `outputs/{Family}/{Gen}/{Model}/raw_data/conditional_skus.json`

Save using `safeWriteJsonAtomic()` from `scripts/lib/system/fs_compat.js`.

```json
{
  "productKey": "DL380_Gen12",
  "scrapeTimestamp": "2026-09-29T10:00:00.000Z",
  "domWalkComplete": true,
  "sweepsExecuted": ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"],
  "conditionalSKUs": [
    {
      "sku": "P48820-B21",
      "description": "HPE High Performance Fan Kit for GPU Config",
      "category": "Cooling",
      "conditionalStatus": "PORTAL_CONDITIONAL",
      "trigger": {
        "conditionKey": "ambient_temp",
        "thresholdValue": 27,
        "conditionOperator": "<=",
        "humanReadable": "Required when ambient operating temperature is ≤27°C",
        "sweepId": "S1",
        "discoveredAfterToggle": "ambient_temp:27"
      }
    },
    {
      "sku": "P48819-B21",
      "description": "HPE 2P CPU Heatsink Upgrade Kit",
      "category": "Thermal",
      "conditionalStatus": "PORTAL_CONDITIONAL",
      "trigger": {
        "conditionKey": "cpu_count",
        "thresholdValue": 2,
        "conditionOperator": "==",
        "humanReadable": "Required when second CPU socket is populated",
        "sweepId": "S2",
        "discoveredAfterToggle": "cpu_count:2"
      }
    }
  ],
  "unconditionalSKUCount": 598,
  "conditionalSKUCount": 7
}
```

### 4.2 Merge with Existing Records

If `raw_data/conditional_skus.json` already exists for this product gen:
1. Load existing records
2. Merge by `sku` — update `trigger` if changed, preserve unchanged records
3. Mark SKUs that were conditional before but no longer appear as `"conditionalStatus": "PORTAL_CONDITIONAL_REMOVED"` with `removedAt` timestamp
4. Write merged result atomically

---

## §5 — Catalog_Rules.json Compilation

After all sweeps complete, compile machine-parseable rules into `Catalog_Rules.json`:

### 5.1 Location

`outputs/{Family}/{Gen}/{Model}/Catalog_Rules.json`

### 5.2 Schema

```json
{
  "productKey": "DL380_Gen12",
  "compiledAt": "2026-09-29T10:15:00.000Z",
  "schemaVersion": "1.0",
  "rules": [
    {
      "ruleId": "RULE-DL380G12-001",
      "sku": "P48820-B21",
      "description": "HPE High Performance Fan Kit for GPU Config",
      "conditionKey": "ambient_temp",
      "conditionOperator": "<=",
      "thresholdValue": 27,
      "thresholdUnit": "celsius",
      "ruleType": "MANDATORY_IF",
      "humanReadable": "P48820-B21 is mandatory when ambient operating temperature ≤ 27°C",
      "appliesTo": ["DL380_Gen12"],
      "discoveredAt": "2026-09-29T10:00:00.000Z",
      "verifiedByCLIC": false
    },
    {
      "ruleId": "RULE-DL380G12-002",
      "sku": "P48819-B21",
      "description": "HPE 2P CPU Heatsink Upgrade Kit",
      "conditionKey": "cpu_count",
      "conditionOperator": "==",
      "thresholdValue": 2,
      "thresholdUnit": "count",
      "ruleType": "MANDATORY_IF",
      "humanReadable": "P48819-B21 is mandatory when second CPU socket is populated",
      "appliesTo": ["DL380_Gen12"],
      "discoveredAt": "2026-09-29T10:00:00.000Z",
      "verifiedByCLIC": false
    }
  ]
}
```

### 5.3 `conditionOperator` Allowed Values

```
"<="   — condition holds when customer value ≤ threshold
">="   — condition holds when customer value ≥ threshold
"=="   — exact match
"!="   — negation (SKU required when condition does NOT match)
">"    — strictly greater
"<"    — strictly less
"IN"   — value is one of a set (thresholdValue becomes an array)
```

### 5.4 `ruleType` Allowed Values

```
"MANDATORY_IF"    — SKU is required when condition is true
"EXCLUDED_IF"     — SKU is incompatible when condition is true
"RECOMMENDED_IF"  — SKU is strongly suggested (not hard-mandatory)
"QUANTITY_SCALE"  — quantity multiplier changes based on condition
```

---

## §6 — PORTAL_CONDITIONAL Flagging (INV-119)

### 6.1 Catalog JSON Tagging

Every conditionally discovered SKU must be tagged in the main catalog JSON:

```json
{
  "sku": "P48820-B21",
  "description": "HPE High Performance Fan Kit for GPU Config",
  "category": "Cooling",
  "listPrice": 285.00,
  "conditionalStatus": "PORTAL_CONDITIONAL",
  "conditionalTrigger": {
    "conditionKey": "ambient_temp",
    "conditionOperator": "<=",
    "thresholdValue": 27,
    "humanReadable": "Required when ambient ≤27°C"
  },
  "availability": "AVAILABLE"
}
```

**HALT-CSD2**: Never present a `PORTAL_CONDITIONAL` SKU to the customer as unconditional. The `conditionalStatus` field must propagate through the entire evaluation pipeline.

### 6.2 Rank 1L Flagging

When a `PORTAL_CONDITIONAL` SKU appears in a Rank 1L (Least Delta) recommendation:
- Add `"conditionalGate": true` to the Rank 1L line item
- Add gate disclosure: `"gateDisclosure": "Required only when customer ambient ≤ 27°C — confirm with customer before ordering"`
- Mark the overall Rank 1L as `"hasConditionalComponents": true`

### 6.3 Customer Deliverable Disclosure

Any deliverable containing `PORTAL_CONDITIONAL` SKUs must include this header:

```
> ⚠️ CONDITIONAL SKU NOTICE
> This proposal contains {n} conditionally required component(s) marked PORTAL_CONDITIONAL.
> These SKUs are only required under specific environmental or configuration conditions.
> Confirm each condition with the customer before finalizing the purchase order.
```

---

## §7 — 5-Step Evaluation Narrative (INV-119)

For every `PORTAL_CONDITIONAL` SKU discovered, `generateEvaluationNarrative()` must emit a 5-step numbered reasoning trace:

```javascript
const { generateEvaluationNarrative } = require('./scripts/lib/boq/narrative_generator.js');

const narrative = generateEvaluationNarrative({
  sku: 'P48820-B21',
  conditionalTrigger: { conditionKey: 'ambient_temp', conditionOperator: '<=', thresholdValue: 27 },
  productKey: 'DL380_Gen12'
});
```

**Required narrative structure:**

```
1. DISCOVERY: P48820-B21 ("HPE High Performance Fan Kit") was discovered via ambient_temp
   macro sweep (S1) — not present in the default rendered DOM for DL380_Gen12.

2. CONDITION: This SKU appears ONLY when ambient operating temperature is set to ≤27°C
   in the OCA macro selector. Standard 35°C ambient does NOT require this component.

3. IMPLICATION: If the customer's datacenter ambient exceeds 27°C, this SKU is NOT
   required and its inclusion would constitute an over-spec recommendation.

4. CLASSIFICATION: Flagged as PORTAL_CONDITIONAL. Cannot be recommended unconditionally.
   Included in Rank 1L only with explicit gate disclosure.

5. ACTION REQUIRED: Confirm customer datacenter ambient operating temperature before
   finalizing the BOM. If ≤27°C: include P48820-B21. If >27°C: exclude.
```

---

## §8 — Knowledge Governance & Degraded Mode

### 8.1 Notebook Health Pre-Check

Before writing `Catalog_Rules.json`:
1. Check the product's NotebookLM notebook health via `assertNotebookHealth()` (see `degraded-mode-skill §6`)
2. If `cloudSyncState === 'FAILED'`: emit `DEGRADED_UNGROUNDED` but continue the DOM walk and persist locally
3. If health is good: after compilation, trigger `knowledge-sync-skill` to sync conditional rules to the notebook

### 8.2 Stale Catalog Warning Gate

**HALT-CSD4**: If the product catalog is `CRITICAL_OUTDATED` (> 30 days) at the time of DOM walk, emit:
```
[STALE_CATALOG_WARN: Conditional SKU discovery is running against a {ageInDays}-day-old
 catalog baseline. Newly added conditional SKUs may be incomplete. Proceed with caution.]
```

But DO NOT abort the DOM walk — stale catalog age is not a blocker for discovery itself (since discovery reads live portal DOM, not the catalog).

### 8.3 `assertNotebookHealth()` Gate for Sync

Only sync `Catalog_Rules.json` to NotebookLM when:
- `assertNotebookHealth()` returns `healthy: true`
- The catalog has been successfully promoted to `outputs/{Family}/{Gen}/{Model}/`
- `commitSuccessfulResyncMetadata()` has already been called

---

## §9 — HALT Conditions

```
HALT-CSD1: Never call this skill during BOQ evaluation flows (INV-72 scope isolation).
            Conditional SKU discovery is EXCLUSIVELY a scraping-time operation.
            Calling it during evaluation will produce invalid results and violates INV-72.

HALT-CSD2: Never present PORTAL_CONDITIONAL SKUs as unconditional to the customer.
            The conditionalStatus field must propagate through all downstream outputs.

HALT-CSD3: If DOM walk yields 0 elements after 2 attempts, emit [ERR_DOM_WALK_EMPTY]
            and log as DOM_WALK_INCONCLUSIVE. Do not fail the parent scrape operation.
            The main catalog without conditional tagging is still valid.

HALT-CSD4: Stale catalog (CRITICAL_OUTDATED) does not block DOM walk — emit warning
            but continue. The DOM walk reads live portal state, not the local catalog.

HALT-CSD5: Never write to Catalog_Rules.json until ALL 8 macro sweeps (S1–S8) complete
            or are explicitly confirmed inapplicable for this product gen. Partial
            compilation produces a false-negative conditional rule set.

HALT-CSD6: Never mark a SKU as PORTAL_CONDITIONAL based solely on tooltip text or
            help descriptions. Only DOM-visibility changes confirmed by macro toggle diff
            qualify as conditional triggers.

HALT-CSD7: Never call commitSuccessfulResyncMetadata() from this skill.
            That is the exclusive responsibility of degraded-mode-skill §4.
```

---

## §10 — Integration Wiring

### 10.1 Position in Resync Chain

This skill is Step 3 of the resync chain defined in `degraded-mode-skill §3.2`:

```
Step 1: oca-portal-navigator (SSO + Tab 1)
Step 2: oca-catalog-scraper  (primary DOM scrape)
Step 3: conditional-sku-discovery-skill  ← THIS SKILL
Step 4: Staging Audit
Step 5: Atomic Catalog Promotion
Step 6: commitSuccessfulResyncMetadata()
Step 7: knowledge_sync.js
Step 8: Verify notebooks.json
```

### 10.2 Files This Skill Reads / Writes

| File | Operation |
| :--- | :--- |
| `outputs/{Family}/{Gen}/{Model}/raw_data/conditional_skus.json` | Write (atomic) — raw discovery output |
| `outputs/{Family}/{Gen}/{Model}/Catalog_Rules.json` | Write (atomic) — compiled machine-parseable rules |
| `outputs/{Family}/{Gen}/{Model}/{Model}_Catalog.json` | Read then patch — add `conditionalStatus` tags |
| `scripts/lib/scraper/navigate_oca.js` | `extractHiddenElements()` function |
| `scripts/lib/system/fs_compat.js` | `safeWriteJsonAtomic()` for all writes |
| `scripts/config/notebooks.json` | Read — resolve notebookId for post-sync |

### 10.3 Called By

- `degraded-mode-skill` — Step 3 of the on-demand resync chain
- `orchestrator-workflow-skill` — Stage 2 (scraping) after `oca-catalog-scraper`
- `oca-catalog-scraper` — invokes this skill after primary DOM scrape completes

### 10.4 Calls Out To

- `degraded-mode-skill` — freshness check before sync step
- `knowledge-sync-skill` — sync `Catalog_Rules.json` to NotebookLM after compilation
- `continuous-learning-skill` — persist conditional rules as KnowledgeDeltas
- `adversarial-validation-skill` Mode 11 — verify anti-hallucination on conditional claims
