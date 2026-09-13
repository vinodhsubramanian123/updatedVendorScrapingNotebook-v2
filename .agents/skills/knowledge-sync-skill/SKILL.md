---
name: knowledge-sync-skill
description: Bi-directional knowledge synchronization skill between Antigravity AI evaluation engine and Gemini NotebookLM RAG notebooks across multi-product generations (DL380 Gen12, Gen11, Alletra, Synergy, Cray).
---

# Knowledge Sync Skill — Bi-Directional Agent & Gemini NotebookLM Alignment Protocol

## 1. Overview
This skill ensures that the **Antigravity AI local evaluation engines** and **Gemini NotebookLM RAG notebooks** maintain 100% synchronization regarding HPE server configuration rules, physical constraints, chassis variants, pricing, and vendor portal rejection feedback.

> **New Architectural Mandates (Phase 3 & 4):**
> - **Chain-of-Responsibility NLP Extractor:** The NLP Extraction pipeline now utilizes a Chain of Responsibility pattern (`RuleExtractor`, `HeuristicExtractor`, `AnomalyExtractor` inside `feedback_loop.js`). All new `KnowledgeDeltas` must pass through these explicit classifiers.
> - **Strict Error Boundaries:** The sync payload builder MUST throw a `SyncPayloadBuilderError` if it fails to read `catalogData` instead of silently ignoring the issue and syncing an incomplete/hollow catalog to NotebookLM.

## 2. Multi-Environment Stability & Fallback Architecture

To prevent build or test failures in automated CI/CD pipelines (such as GitHub Actions) or offline development environments, the sync engine operates on a deterministic 3-tier fallback model:

```
                  [Trigger Knowledge Sync]
                             │
                             ▼
         [Check Environment: process.env.CI / GITHUB_ACTIONS]
                 /                                \
           (Yes: In CI)                      (No: Local / Dev)
               │                                      │
               ▼                                      ▼
     [Validate Markdown Payload            [Verify nlm CLI & Auth]
      & Assert Local Registry]                   /         \
               │                           (Valid)        (Unavailable)
               ▼                              │                 │
    [Mark CI_OFFLINE_VERIFIED]                ▼                 ▼
                                    [Execute nlm sync]   [Fallback to MCP / Local RAG]
```

1. **Tier 1: Cloud `nlm` CLI Synchronization**:
   - Executes when `nlm` CLI is installed and authenticated.
   - Deletes stale source by ID and uploads the newly generated Markdown payload under the canonical source name `{chassis}_OCA_Catalog_{YYYY-MM-DD}`.
2. **Tier 2: Universal MCP Tool Synchronization (`gemini-notebook-mcp:source_add`)**:
   - Executes autonomously when CLI is unavailable.
3. **Tier 3: CI/CD & Offline Safety Net (`CI_OFFLINE_VERIFIED`)**:
   - Validates generated Markdown payloads, updates `notebooks.json`, and records sync timestamps without throwing unhandled process exceptions.

---

## 3. Scope Taxonomy Rules
Learnings captured from HPE OCA portal rejections (`KnowledgeDeltas`) are automatically categorized into a 3-tier scope taxonomy:

1. **`UNIVERSAL_VENDOR`**: Applies across ALL HPE product lines (e.g. BTO/CTO mode exclusions, TAA/GTA regional exclusions, -48VDC lug kit mandatory pairings).
2. **`FAMILY_GEN`**: Applies to a specific product family + generation (e.g. ProLiant Gen12 DDR5-6400 memory bit-width rules, Alletra 9000 storage controller write-cache protection).
3. **`CHASSIS_SPECIFIC`**: Applies to an exact chassis model (e.g. DL380 Gen12 SFF drive-less FIO kit `873763-B21`).

---

## 4. Synchronization Execution Commands

```bash
# Run Master Knowledge Sync Across All Registered Portfolios
npm run sync:knowledge

# Auto-upload payloads to Google NotebookLM for a specific chassis
node scripts/lib/sync/knowledge_sync.js --chassis DL380_Gen12_SFF --auto-upload-nlm

# Full portfolio knowledge sync with auto-upload
node scripts/lib/sync/knowledge_sync.js --auto-upload-nlm

# Output JSON payload for Dashboard SSE stream
node scripts/lib/sync/knowledge_sync.js --json
```

---

## 5. Active Target Notebook Registry (`scripts/config/notebooks.json`)

| Product Identifier | Product Family | Generation | Target Cloud Notebook ID | Notebook Title |
| :--- | :--- | :--- | :--- | :--- |
| `DL380_Gen12` / `DL380_Gen12_SFF` | ProLiant | Gen12 | `1d190853-4e9c-48df-aa70-eae66c6f2c1f` | *Dl 380 Spec Gen 12* |
| `DL380_Gen11` | ProLiant | Gen11 | `d37fa851-90cb-45b7-a8e1-78488a0bc6e6` | *DL380 Gen 11* |
| `DL380a_Gen12` | ProLiant | Gen12 | `b233ec88-4682-4164-a801-3ee6ca649dc1` | *DL380a* (Dedicated AI GPU Server) |
| `DL145_Gen11` | ProLiant | Gen11 | `7a48061a-331a-429b-8477-7e0473491714` | *Dl145* (Edge Compute) |
| `DL580_Gen12` | ProLiant | Gen12 | `3f5344ce-da79-4f6d-a131-f303d1e43dc3` | *DL580 Gen 12* (4-Socket Mission Critical) |
| `SY480_Gen12` / `SY100Gb_F32_Module` | Synergy | Gen12/Gen | `49a3c69e-115f-4332-9454-c5d4f2941327` | *Synergy 12000 Frame* |
| `Alletra_Storage_System` | Alletra | Storage | `a67629ba-3434-42ab-b465-bd6d71852198` | *HPE Alletra Storage MP QuickSpecs* |
| `MSL3040_Tape` | StoreEver | Tape | `644020e5-42f9-4c4b-95cc-fcf82122685c` | *HPE StoreEver MSL3040 Tape Library* |
| `GX5000_General_RACK` | Cray | General | `86c93203-6b76-439a-b7ab-33ad782e3178` | *GX5000 Supercomputing Rack* |
| **Default Fallback** | Universal | All | `1d190853-4e9c-48df-aa70-eae66c6f2c1f` | *Default Knowledge Hub* |

> [!NOTE]
> **Strict Product Firewall (`INV-79` & `INV-72`)**: `DL380a_Gen12` is a distinct AI GPU architecture with its own dedicated notebook (`b233ec88-4682-4164-a801-3ee6ca649dc1`). Inquiries, catalogs, or knowledge sync operations for "DL380a" or "DL 380a" MUST NEVER route to standard `DL380_Gen12` (`1d190853-4e9c-48df-aa70-eae66c6f2c1f`).

---

## 6. Ground-Truth Invariant: Customer BOQ Isolation (`INV-24`)

> [!IMPORTANT]
> **CUSTOMER BOQ / BOM FILES MUST NEVER BE ADDED OR SYNCED TO NOTEBOOKLM SOURCES.**

1. **Isolation Rationale**: Customer spreadsheets, quotes, and tender RFQs (e.g. `GID-RFQS-HPE-2026-006.xlsx`) inherently contain human typos, mismatched processor pairs, invalid power supply quantities, or missing enablement kits. Uploading unverified customer BOQs directly into NotebookLM would poison the RAG intent brain with customer-side errors.
2. **Approved Ground-Truth Sources**: Cloud NotebookLM sources are strictly reserved for:
   - Official vendor QuickSpecs PDFs (manufacturer ground-truth specifications)
   - Live scraped OCA master catalogs (22-sheet Excel companions, master CSVs, and classified markdown rules)
   - Verified, deduplicated `KnowledgeDelta` learning payloads emitted by the closed-loop feedback engine
3. **Runtime Handling**: Customer BOQs are treated exclusively as transient runtime inputs evaluated against the ground-truth baseline.

---

## 7. Master SKU Reconciliation & RAG Verification Protocol

Before certifying any product line, agents MUST verify that the local master 22-sheet workbook, master CSV, Google Sheet, and NotebookLM sources are in 100% agreement:

1. **Verify Exact SKU Tallies per Category**:
   - Processors, Memory, Networking, Drive Enclosures/Drives, Cooling & Thermal, Storage Controllers, PCIe Risers, Power Supplies, Chassis Variants, Accessories, and Pointnext Services.
2. **Execute Live Grounding RAG Queries**:
   - Run `nlm notebook query <notebookId> "<test query>" --json` to verify that answers cite the QuickSpecs PDF and classified OCA markdown/CSV payloads with zero hallucinated part numbers.
3. **Obsolete SKU Tracking**:
   - Ensure legacy QuickSpecs SKUs flagged as `OB` (Obsolete) or `90` (90-Day Warning) are preserved in `discontinued_skus.json` and the 22-sheet workbook's *Discontinued SKUs* tab.

---

## 7b. Google Sheets & Drive Source Synchronization: Full Replace vs. Delta Append

When synchronizing catalog intelligence with Google Drive / Google Sheets linked to NotebookLM:

1. **Certified Master Catalog Tab (`All SKUs`) — FULL REPLACE IN-PLACE**:
   - **Protocol**: The entire sheet/tab must be overwritten with the latest audited `{chassisName}_Master_Catalog.csv`.
   - **Why Full Replace**: NotebookLM creates semantic embeddings across table rows. If rows are appended repeatedly across scrapes, duplicate SKUs with contradictory prices, obsolete statuses, or mismatched options accumulate. This degrades RAG precision, causing NotebookLM to retrieve multiple colliding prices or cite retired parts. Overwriting ensures each SKU has exactly ONE canonical, verified ground-truth record.
   - **Mechanism**: Use Drive sync / Google Sheets API to update the sheet in-place without altering the file URL or Drive File ID. Then trigger `source_sync_drive` or `nlm source sync` to refresh NotebookLM's index.

2. **Audit Trail & Delta Ledger (`Change Log` / `Price Trails` / `Knowledge Deltas`) — DELTA APPEND**:
   - **Protocol**: Timestamped events (`BASELINE`, `PRICE_CHANGED`, `ATTRIBUTE_CHANGED`, `DISCONTINUED`, `RULE_LEARNED`) must be appended chronologically.
   - **Why Delta Append**: Historical drift tracking, pricing trend lines, and lifecycle transitions (`Active` $\rightarrow$ `90-Day Warning` $\rightarrow$ `Obsolete`) require an immutable chronological log. Appending with composite date deduplication (`INV-1` & `INV-13`) preserves full auditability for human architects and presales engineers.

---

## 8. Continuous Lifecycle Milestone Auto-Sync (`INV-40`)

The sync engine (`scripts/lib/sync/post_flow_sync.js`) automatically synchronizes verified learnings between the local rule engine and Gemini NotebookLM without requiring human intervention:

1. **Scraping Promotion (Step 9/10)**: Automatically uploads the newly scraped master catalog markdown payload upon successful staging verification.
2. **BOQ Evaluation Completion**: Emits structured `KnowledgeDelta` records into `catalog_deltas.json` and updates `master_knowledge_registry.json`.
3. **Partner Quote Reconciliation (`/api/verify-vendor-bom`)**: Automatically triggers `triggerPostFlowSync` when vendor BOM differences or new CLIC rules are discovered.
4. **HITL Feedback Submission (`/api/feedback-submit`)**: Re-synchronizes verified engineer approvals to cloud sources.

---

## 9. Global vs. Product-Specific Learning Synchronization Architecture (`INV-83`, `INV-85`, `INV-86`)

To prevent cross-product knowledge contamination while ensuring universal lessons benefit all systems, the synchronization architecture strictly enforces dual-track scoping:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                        DUAL-TRACK KNOWLEDGE & LEARNING SYNCHRONIZATION ARCHITECTURE                     │
├──────────────────────────────────────────────────┬─────────────────────────────────────────────────────┤
│ 🌐 TRACK A: GLOBAL / UNIVERSAL LEARNINGS         │ 🎯 TRACK B: PRODUCT-GEN SPECIFIC LEARNINGS          │
├──────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤
│ 1. Storage Location:                             │ 1. Storage Location:                                │
│    - outputs/history/master_knowledge_registry.json│    - outputs/{Family}/{Gen}/{Model}/catalog_deltas.json│
│    - outputs/history/running_knowledge_charter.md │    - outputs/{Family}/{Gen}/{Model}/notebook_sync_      │
│    - outputs/history/master_universal_knowledge_ │      payload_{chassis}.md                           │
│      charter.md                                  │                                                     │
│                                                  │                                                     │
│ 2. Cloud Destination:                            │ 2. Cloud Destination:                               │
│    - Shared Google Doc (ID: 1TNdR_1A-IH7UQo8g...)│    - Dedicated Google Sheet per product generation  │
│    - Mounted as runningKnowledgeDocId across ALL │      (driveSheetId in scripts/config/notebooks.json)│
│      10 product notebooks in NotebookLM          │    - Dedicated Notebook ID per product generation    │
│                                                  │      (e.g., DL380a: b233ec88-4682-4164...)          │
│                                                  │                                                     │
│ 3. Update Mechanism:                             │ 3. Update Mechanism:                                │
│    - Non-destructive deduplication (INV-13)      │    - Master Catalog Tab ('All SKUs'): FULL REPLACE  │
│    - Incremental append of new cross-cutting     │      IN PLACE (INV-83) to prevent embedding clashes │
│      rules via running_knowledge_sync.js         │    - Change Log ('Price Trails' / 'Deltas'):        │
│                                                  │      DELTA APPEND (INV-1, INV-69) for audit trail    │
│                                                  │                                                     │
│ 4. Scope Taxonomies:                             │ 4. Scope Taxonomies:                                │
│    - UNIVERSAL_VENDOR (e.g. TAA/GTA, -48VDC lugs,│    - CHASSIS_SPECIFIC (e.g. DL380a 10DW captive  │
│      FIO container rules INV-25)                 │      riser, DL380 drive-less FIO kit 873763-B21)    │
│    - Process Architecture Design (INV-85, INV-86)│    - FAMILY_GEN (e.g. ProLiant Gen12 DDR5-6400)    │
└──────────────────────────────────────────────────┴─────────────────────────────────────────────────────┘
```

### Verification & Audit Commands:
```bash
# 1. Rebuild and synchronize all registered catalogs and master Excel workbooks
node scripts/catalogs/sync_all_registered_catalogs.js

# 2. Compile, deduplicate, and generate master running knowledge charters
node scripts/services/running_knowledge_sync.js

# 3. Audit post-flow sync and inspect knowledge drift across all 10 product generations
node -e "
const { triggerPostFlowSync } = require('./scripts/lib/sync/post_flow_sync.js');
const products = ['DL380_Gen12', 'DL380_Gen11', 'DL380a_Gen12', 'DL145_Gen11', 'DL580_Gen12', 'SY480_Gen12', 'MSL3040_Tape', 'GX5000_General_RACK', 'SY100Gb_F32_Module', 'Alletra_Storage_System'];
for (const p of products) {
  const res = triggerPostFlowSync(p, 'AUDIT');
  console.log(p, 'Drift:', res.driftStatus, 'Unsynced:', res.unSyncedDeltasCount);
}
"
```


