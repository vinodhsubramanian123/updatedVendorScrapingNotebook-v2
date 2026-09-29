---
name: degraded-mode-skill
description: >
  Detect, disclose, and recover from degraded catalog or NotebookLM notebook states.
  Encapsulates per-product-generation metadata freshness checks (monthly 30-day cadence
  and 72-hour fast-track threshold), `assertNotebookHealth()` + `DEGRADED_UNGROUNDED`
  disclosure, BOQ-triggered on-demand resync workflow (via oca-portal-navigator →
  oca-catalog-scraper), atomic post-resync metadata commit (only after staging audit
  passes + catalog promoted), and local RAG dual-layer fallback when cloud is unavailable.
  **Call this skill whenever a BOQ evaluation encounters a stale product catalog, a
  NotebookLM notebook in FAILED/DEGRADED state, or when an agent/user explicitly
  requests a catalog resync for a specific product generation.**
---

# Degraded Mode Skill — Catalog Freshness, Staleness Detection & Atomic Resync

## 🧭 Quick Navigation

| Section | Link |
| :--- | :--- |
| Trigger Conditions | §1 |
| Per-Product Freshness Check Protocol | §2 |
| BOQ-Triggered Resync Decision Flow | §3 |
| Atomic Post-Resync Commit Contract | §4 |
| Degraded Mode Operation (Stale Data Disclosure) | §5 |
| Notebook Health Gate | §6 |
| stale Catalog Warning Codes | §7 |
| HALT Conditions | §8 |
| Local RAG Fallback | §9 |
| Integration Wiring | §10 |

---

## §1 — Trigger Conditions

Activate this skill when ANY of the following is true:

| Trigger | Source Signal | Priority |
| :--- | :--- | :--- |
| Customer BOQ arrives for a product gen whose catalog age > 30 days | `product_metadata_manager.js` → `needsResync: true` | CRITICAL |
| Customer BOQ for product gen with catalog age > 72 hours | `staleWarning72h: true` | HIGH |
| `auditCatalogFreshness()` returns `STALE_WARNING` or `CRITICAL_OUTDATED` | `catalog_freshness_guard.js` | HIGH |
| NotebookLM notebook `cloudSyncState === 'FAILED'` | `notebooks.json` | HIGH |
| `assertNotebookHealth()` returns unhealthy | `nlm_solution_source_validator.js` | HIGH |
| User/agent explicitly requests catalog resync for a specific product gen | User intent or BOQ route | MEDIUM |
| `outputs/history/product_generation_metadata.json` missing or corrupt | `product_metadata_manager.js` | MEDIUM |
| Catalog JSON modified timestamp doesn't match `scrapeTimestamp` in metadata | Integrity check | MEDIUM |

**NEVER activate this skill during Jules CI/CD flows (INV-72).** This is a customer-facing evaluation skill.

---

## §2 — Per-Product-Generation Freshness Check Protocol

### 2.1 Import and Call

```javascript
const { getProductGenerationMetadata, refreshMasterProductMetadata } =
  require('./scripts/lib/catalog/product_metadata_manager.js');

// During BOQ evaluation, call for the specific product key being evaluated:
const meta = await getProductGenerationMetadata('DL380_Gen12');
```

### 2.2 Metadata Shape (returned by `getProductGenerationMetadata`)

```json
{
  "productKey": "DL380_Gen12",
  "catalogPath": "outputs/ProLiant/Gen12/DL380_Gen12/DL380_Gen12_Catalog.json",
  "family": "ProLiant",
  "generation": "Gen12",
  "lastScrapeDate": "2026-08-13T07:26:36.949Z",
  "ageInDays": 47,
  "freshnessStatus": "STALE_WARNING",
  "needsResync": true,
  "staleWarning72h": true,
  "totalUniqueSKUs": 605,
  "sha256": "abc123...",
  "notebookId": "abc-uuid-from-notebooks.json",
  "notebookLastSynced": "2026-08-13T08:00:00.000Z",
  "notebookAgeInDays": 47
}
```

### 2.3 Freshness Status Decision Table

| `freshnessStatus` | `ageInDays` | Agent Action |
| :--- | :--- | :--- |
| `FRESH` | ≤ 72h | Proceed. No disclosure needed. |
| `STALE_WARNING` | 3–30 days | Disclose age. Offer resync. |
| `CRITICAL_OUTDATED` | > 30 days | Block PORTAL_CONDITIONAL claims. Strongly recommend resync. |
| `INVALID_FUTURE_DATE` | negative (clock skew) | Treat as `CRITICAL_OUTDATED`. Emit `[ERR_FUTURE_DATE]`. |
| `UNKNOWN` | N/A | Emit `[ERR_METADATA_MISSING]`. Attempt `refreshMasterProductMetadata()`. |

### 2.4 Surface to User / Agent (Mandatory Disclosure)

When `needsResync === true`, emit this exact disclosure in the BOQ evaluation header:

```
[CATALOG AGE: DL380_Gen12 last scraped {ageInDays} days ago — {freshnessStatus}.
 Monthly 30-day cadence exceeded. Customer BOQ evaluation will proceed in DEGRADED_UNGROUNDED mode
 unless portal resync is performed. Recommend: initiate portal resync before finalizing deliverable.]
```

When `staleWarning72h === true` (catalog between 3–30 days old):

```
[STALE_72H_WARN: DL380_Gen12 catalog is {ageInHours} hours old — exceeds 72h fast-track threshold.
 PORTAL_CONDITIONAL SKU claims are BLOCKED until a fresh scrape is completed.]
```

---

## §3 — BOQ-Triggered Resync Decision Flow

When a customer BOQ arrives and `needsResync === true` for any product gen in the BOQ:

### 3.1 Present Resync Decision to User

```
╔═══════════════════════════════════════════════════════════════════╗
║  CATALOG STALENESS DETECTED                                       ║
║                                                                   ║
║  Product:    DL380_Gen12                                          ║
║  Last Sync:  2026-08-13 (47 days ago) — CRITICAL_OUTDATED        ║
║  SKUs Cached: 605                                                 ║
║                                                                   ║
║  OPTIONS:                                                         ║
║  A) Initiate portal resync now (recommended — ~5–10 min)          ║
║  B) Proceed with stale catalog (DEGRADED_UNGROUNDED mode)         ║
╚═══════════════════════════════════════════════════════════════════╝
```

### 3.2 If User Selects Option A (Portal Resync)

Execute the following sub-skill chain **in strict order**:

```
Step 1 → oca-portal-navigator  (SSO, Tab 1 launch, stale-session self-heal)
Step 2 → oca-catalog-scraper   (full DOM walk including extractHiddenElements)
           ↓ on scrape complete
Step 3 → conditional-sku-discovery-skill  (sweep all macro selectors)
           ↓ on staging files written
Step 4 → Staging Audit (cardinality, formula tally, diff check — see §4)
           ↓ ONLY if staging audit passes
Step 5 → Atomic catalog promotion to outputs/{Family}/{Gen}/{Model}/
Step 6 → commitSuccessfulResyncMetadata()  (see §4 — NEVER before Step 5)
Step 7 → knowledge_sync.js for product NotebookLM notebook
Step 8 → Verify lastSyncedAt + lastContentFingerprints updated in notebooks.json
```

**HALT-RESYNC1**: If any step 1–5 fails, ABORT the entire chain. Do not update metadata. Do not call `commitSuccessfulResyncMetadata()`. Surface exact failure step and error to user.

**HALT-RESYNC2**: If the scraper returns 0 SKUs or fewer than 50% of the previous SKU count, treat as a failed scrape. Emit `[ERR_SCRAPE_CARDINALITY_FAILED]`. Do not promote.

### 3.3 If User Selects Option B (Proceed with Stale Data)

- Tag ALL evaluation outputs with `DEGRADED_UNGROUNDED` badge (see §5)
- Never allow Tier 2 RAG verification badge unless notebook is fresh and verified
- Never allow `PORTAL_CONDITIONAL` SKU assertions (blocked when stale > 72h)
- Disclose stale catalog age in every deliverable header and summary section

---

## §4 — Atomic Post-Resync Commit Contract (CRITICAL)

This is the heart of the metadata lifecycle. The commit contract is unconditional and non-negotiable.

### 4.1 Pre-Commit Checklist (ALL must be `true` before commit)

```
ATOMIC-COMMIT-GATE-1: portal scrape completed without JavaScript exceptions
ATOMIC-COMMIT-GATE-2: scraper wrote staging files to temp directory (not to outputs/)
ATOMIC-COMMIT-GATE-3: staging audit passed:
  - cardinality check: new SKU count >= 50% of previous count
  - formula tally: all pricing formulas resolve without #REF or NaN
  - diff check: sanity-validated against previous catalog (no impossible removals)
ATOMIC-COMMIT-GATE-4: staging files promoted atomically to outputs/{Family}/{Gen}/{Model}/
  via fs.rename() / safeWriteJsonAtomic() (NOT fs.copyFile + fs.unlink — use atomic rename)
```

### 4.2 Commit Call (Only After ALL Gates Pass)

```javascript
const { commitSuccessfulResyncMetadata } =
  require('./scripts/lib/catalog/product_metadata_manager.js');

await commitSuccessfulResyncMetadata({
  productKey: 'DL380_Gen12',
  catalogPath: 'outputs/ProLiant/Gen12/DL380_Gen12/DL380_Gen12_Catalog.json',
  scrapeTimestamp: new Date().toISOString(),
  uniqueSKUs: 612,
  stagingAuditPassed: true   // MUST be explicitly true — never assume
});
```

**HALT-COMMIT1**: `commitSuccessfulResyncMetadata()` throws `ERR_STAGING_AUDIT_NOT_PASSED` if `stagingAuditPassed !== true`. This is non-overridable.

### 4.3 Post-Commit Notebook Sync

Immediately after successful `commitSuccessfulResyncMetadata()`:

```javascript
const { syncProductNotebook } = require('./scripts/lib/sync/knowledge_sync.js');

await syncProductNotebook({
  productKey: 'DL380_Gen12',
  notebookId: meta.notebookId,          // resolved from notebooks.json
  catalogPath: meta.catalogPath,
  forceResync: true
});
```

### 4.4 Post-Sync Verification

After `syncProductNotebook()` completes:

1. Re-read `scripts/config/notebooks.json`
2. Verify `lastSyncedAt` has been updated to within the last 60 seconds
3. Verify `lastContentFingerprints` has changed from its pre-sync value
4. If either check fails: emit `[ERR_NOTEBOOK_SYNC_VERIFICATION_FAILED]` and surface to user

**HALT-COMMIT2**: Never declare the resync "complete" until both catalog metadata and notebook sync are verified. A partial resync (catalog updated but notebook not synced) is treated as `RESYNC_INCOMPLETE`.

---

## §5 — Degraded Mode Operation (Stale Data Disclosure)

When proceeding with a stale catalog (Option B from §3.3):

### 5.1 Mandatory Output Tags

Every evaluation deliverable MUST include:

**Header badge (JSON):**
```json
{
  "catalogFreshnessStatus": "CRITICAL_OUTDATED",
  "catalogAgeInDays": 47,
  "degradedModeActive": true,
  "degradedModeDisclosure": "DEGRADED_UNGROUNDED: Catalog is 47 days old (last scraped 2026-08-13). Tier 2 RAG grounding is unavailable. All SKU claims are unverified against current portal state.",
  "portalValidationStatus": "PORTAL VALIDATION PENDING"
}
```

**Human-readable header (markdown):**
```
> ⚠️ DEGRADED_UNGROUNDED MODE ACTIVE
> Catalog: DL380_Gen12 — last scraped 47 days ago (2026-08-13)
> Tier 2 RAG grounding: UNAVAILABLE
> PORTAL_CONDITIONAL SKU claims: BLOCKED
> All deliverables remain PORTAL VALIDATION PENDING until a fresh portal resync completes.
```

### 5.2 Blocked Operations in Degraded Mode

| Operation | Blocked? | Error Code |
| :--- | :--- | :--- |
| `PORTAL_CONDITIONAL` SKU assertions (catalog > 72h) | ✅ BLOCKED | `ERR_PORTAL_CONDITIONAL_BLOCKED_STALE` |
| Tier 2 RAG grounding badge | ✅ BLOCKED | `ERR_TIER2_RAG_UNAVAILABLE` |
| `FRESH` or `VERIFIED` freshness badge | ✅ BLOCKED | `ERR_FRESHNESS_BADGE_INVALID` |
| Local catalog lookup (read-only) | ✅ ALLOWED | — |
| 7-aspect physical pre-checks | ✅ ALLOWED | — |
| Customer deliverable generation with DEGRADED badge | ✅ ALLOWED | — |

---

## §6 — Notebook Health Gate

### 6.1 Invoke `assertNotebookHealth()`

```javascript
const { assertNotebookHealth } =
  require('./scripts/lib/sync/nlm_solution_source_validator.js');

const health = await assertNotebookHealth('DL380_Gen12');
// Returns: { healthy: boolean, cloudSyncState: string, degradedReason?: string }
```

### 6.2 Health States

| `cloudSyncState` | Action |
| :--- | :--- |
| `SYNCED` | Proceed normally |
| `SYNCING` | Wait up to 120s; retry; if still syncing after 120s → treat as `DEGRADED` |
| `FAILED` | Emit `DEGRADED_UNGROUNDED`. Offer resync or local RAG fallback |
| `DEGRADED` | Same as `FAILED` |
| `UNKNOWN` | Emit `[ERR_NOTEBOOK_STATE_UNKNOWN]`. Attempt notebook re-query. |

### 6.3 Disclosure Contract

When `assertNotebookHealth()` returns `healthy: false`:

```
[NOTEBOOK_DEGRADED: {productKey} NotebookLM notebook (ID: {notebookId}) is in {cloudSyncState} state.
 Grounded RAG verification is unavailable. All {productKey} Tier 2 citations will be marked
 DEGRADED_UNGROUNDED until a successful notebook sync completes.]
```

---

## §7 — Stale Catalog Warning Codes

Exact error codes to emit in all logs and deliverable headers:

| Code | Condition | Severity |
| :--- | :--- | :--- |
| `[STALE_72H_WARN: {productKey} catalog is {hours}h old]` | 3–30 days | WARNING |
| `[STALE_30D_CRITICAL: {productKey} catalog is {days} days old — monthly cadence exceeded]` | > 30 days | CRITICAL |
| `[ERR_FUTURE_DATE: {productKey} scrapeDate is in the future — clock skew suspected]` | Negative age | CRITICAL |
| `[ERR_METADATA_MISSING: {productKey} not found in product_generation_metadata.json]` | No metadata | CRITICAL |
| `[ERR_SCRAPE_CARDINALITY_FAILED: new SKU count {n} < 50% of previous {prev}]` | Bad scrape | CRITICAL |
| `[ERR_STAGING_AUDIT_NOT_PASSED]` | Gate failure | CRITICAL |
| `[ERR_NOTEBOOK_SYNC_VERIFICATION_FAILED]` | Post-sync | CRITICAL |
| `[RESYNC_INCOMPLETE: catalog updated but notebook sync unverified]` | Partial | CRITICAL |
| `[ERR_PORTAL_CONDITIONAL_BLOCKED_STALE]` | Blocked SKU claim | ERROR |
| `[ERR_DOM_WALK_EMPTY]` | Zero elements from DOM walk | ERROR |

---

## §8 — HALT Conditions

```
HALT-DM1: Never call commitSuccessfulResyncMetadata() before stagingAuditPassed === true.
           Throws ERR_STAGING_AUDIT_NOT_PASSED (non-overridable).

HALT-DM2: Never claim Tier 2 RAG grounding when assertNotebookHealth() returns healthy: false.
           Tag as DEGRADED_UNGROUNDED — never silently pass.

HALT-DM3: Never update outputs/{Family}/{Gen}/{Model}/ catalog files directly from a live scrape.
           Always stage first → audit → atomic promote. Never bypass the staging step.

HALT-DM4: Never declare a resync "complete" if notebook sync fails post-commit.
           Resync state = RESYNC_INCOMPLETE until both catalog metadata and notebook are verified.

HALT-DM5: Never suppress staleness warnings for performance or brevity.
           Every deliverable header must carry the freshness badge — even if FRESH.

HALT-DM6: Never activate this skill during Jules CI/CD flows (INV-72).
           This skill is exclusively for customer-facing BOQ evaluation contexts.
```

---

## §9 — Local RAG Fallback (When Cloud Is Unavailable)

When `assertNotebookHealth()` returns `healthy: false` AND user opts to proceed:

```javascript
const { searchLocalRAG } = require('./scripts/lib/rag/local_rag_search.js');

const results = await searchLocalRAG({
  query: 'DL380 Gen12 GPU enablement kit',
  productKey: 'DL380_Gen12',
  maxResults: 5
});
```

**Disclosure when using local RAG:**
```
[LOCAL_RAG_FALLBACK: Gemini NotebookLM is unavailable. Answering from local RAG index.
 Results are NOT grounded against official QuickSpecs. Treat as TIER_1_ONLY.]
```

**Blocks in Local RAG mode** (same as §5.2 degraded blocks) plus:
- No Tier 2 citation badges
- No vendor-acceptance-grounded claims
- No final solution certification

---

## §10 — Integration Wiring

### 10.1 Files This Skill Orchestrates

| File | Role |
| :--- | :--- |
| `scripts/lib/catalog/product_metadata_manager.js` | Per-product-gen metadata SSOT |
| `scripts/lib/catalog/catalog_freshness_guard.js` | `auditCatalogFreshness()` + `normalizeCatalogMetadata()` |
| `scripts/lib/sync/nlm_solution_source_validator.js` | `assertNotebookHealth()`, `resolveProductNotebookId()` |
| `scripts/lib/sync/knowledge_sync.js` | Post-resync notebook sync |
| `scripts/config/notebooks.json` | Notebook ID SSOT — read after commit to verify |
| `scripts/lib/rag/local_rag_search.js` | Local RAG fallback |
| `scripts/lib/system/fs_compat.js` | `safeWriteJsonAtomic()` for all JSON writes |
| `.agents/skills/oca-portal-navigator/SKILL.md` | Step 1 of resync chain |
| `.agents/skills/oca-catalog-scraper/SKILL.md` | Step 2 of resync chain |
| `.agents/skills/conditional-sku-discovery-skill/SKILL.md` | Step 3 of resync chain |

### 10.2 Called By

- `boq-eval-skill` — checks freshness before evaluation begins
- `orchestrator-workflow-skill` — Stage 1 (knowledge discovery) freshness gate
- `knowledge-sync-skill` — pre-sync health gate
- Any skill that reads from `outputs/{Family}/{Gen}/{Model}/` catalogs
