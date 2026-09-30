# 2026-10-01 Vendor Scraping & Dual-Brain Knowledge Grounding Remediation

**Status**: Certified, Grounded & Operational  
**Execution Date**: 2026-10-01  
**Lead Architect**: Antigravity / Lead Solution Execution Architect  
**Validation Benchmark**: 21/21 Scraping Domain Test Suites PASSED (100.0%), 0 Lint Warnings/Errors, $CC \le 135$  
**Products Grounded & Certified**: `DL380_Gen12` (2U Enterprise Compute) & `DL380a_Gen12` (4U AI Accelerator Server)  

---

## 1. Executive Summary & Epistemic Separation of Concerns

This remediation establishes complete clarity regarding how vendor catalog data is processed, structured, and presented across human engineering and AI reasoning layers. It permanently resolves past confusion surrounding Google Sheets cell synchronization versus Google NotebookLM grounding.

### The Two-Tier Data Architecture:
```
                                  OCA Live Portal Scrape
                                             │
                     ┌───────────────────────┴───────────────────────┐
                     ▼                                               ▼
         [ Deterministic Physical Core ]                 [ Semantic AI Grounding ]
                     │                                               │
     • Full 26-sheet Master Excel (.xlsx)            • Curated Markdown Payload (.md)
       (DL380_Gen12: 14.4 MB | DL380a: 10.2 MB)        (Active SKUs, rules, price deltas)
     • Master Flat CSV (1.5 MB)                      • Synced to Google NotebookLM
     • Catalog.json & Catalog_Rules.json               (Cited by Gemini LLM & Guardrail)
     • Offline retention on disk & Google Drive      • Zero cell-offset / formula ambiguity
```

---

## 2. Deep Technical Rationales & Architectural Decisions

### 2.1 The Grounding Dilemma: Markdown (.md) vs. Excel (.xlsx) / CSV in NotebookLM
1. **Google NotebookLM Drive Sync Constraints**:
   - Google NotebookLM's backend Drive synchronization RPC (`RPC_SYNC_DRIVE`) only supports Google Docs (`application/vnd.google-apps.document`).
   - Attempting to attach or sync Google Sheets (`application/vnd.google-apps.spreadsheet`) via Drive sync causes Google's backend to throw `INVALID_ARGUMENT (code 3)`.
   - By setting `"canonicalDriveEnabled": false` for server products, the engine routes knowledge synchronization through the deterministic, fingerprint-verified Markdown payload pipeline (`uploadAndVerifyLegacyFileCandidate`), which completes reliably in seconds.
2. **Multi-Table Dimensionality vs. Flat CSV Limitations**:
   - A CSV is fundamentally a single 2D flat table.
   - An enterprise server catalog contains 26 distinct categories/worksheets (Processors, Memory, Storage Controllers, NVMe/SAS Drives, Networking, Power Supplies, Accelerators/GPUs, Services, etc.).
   - Flattening 26 heterogeneous tables into one CSV destroys schema consistency: processor rows have `Cores`, `Frequency`, `TDP`, and `L3 Cache`; memory rows have `Speed`, `Rank`, and `CAS Latency`; power supplies have `Wattage`, `Efficiency`, and `Voltage`; services have `Duration` and `Response Level`.
3. **Semantic Invariant & Rule Grounding**:
   - Spreadsheets and CSVs cannot hold rich, machine-parseable prerequisite rules and architectural gotchas (e.g., *"Requires 1x Cable Kit P52410-B21 when installed in Box 1-3, mutually exclusive with OCP NIC slot 1"*).
   - In Markdown, active hardware inventories and architectural gotchas are formatted as semantic sections (`#`, `##`), structured markdown tables, and explicit narrative rule blocks.
   - When NotebookLM's RAG indexes the Markdown payload, it can cite exact lines, paragraphs, and sections word-for-word (`[Source: Section 3.2 Storage Controllers, SKU P53255-B21]`), eliminating LLM hallucinations and cell coordinate offsets (`!C42:F99`).
4. **Zero Information Loss**:
   - The complete, uncompressed 26-sheet `.xlsx` workbook (with full formatting, cell colors, and formulas) and the complete `.csv` catalog remain permanently archived on disk in `outputs/ProLiant/Gen12/{Chassis}/` and uploaded to Google Drive.
   - The `.md` payload is an optimized projection specifically designed for AI retrieval.

### 2.2 10.4 MB Markdown Bloat & Word Limit Resolution
- **Issue**: In `scripts/lib/sync/nlm_sync_client.js` line 506, `buildKnowledgeWorkbookDatasets` was dumping all 26 sheets as stringified raw JSON inside `notebook_sync_payload_*.md`, inflating the payload to 10.4 MB and exceeding NotebookLM's 500,000-word limit.
- **Fix**: Replaced the raw JSON string dump with a high-density, structured category inventory table + SHA-256 combined fingerprint (`35 KB`). NotebookLM ingests the payload instantaneously without truncation.

### 2.3 `isGroundedCanary` Underscore Normalization
- **Issue**: `uploadAndVerifyLegacyFileCandidate` executes a canary verification query: `Canary verification: Summarize base chassis model and SKUs for ${chassisName}`. When queried with `DL380_Gen12`, the LLM replies in natural English (`DL380 Gen12`). The old strict check `answer.toLowerCase().includes(chassisName.toLowerCase())` failed strictly due to the underscore.
- **Fix**: Updated canary matcher in `nlm_sync_client.js` to normalize both raw (`dl380_gen12`) and spaced (`dl380 gen12`) tokens.

### 2.4 Autonomous Scraping Navigation & Selection Intelligence
- **Intelligent CTO Discovery**: Dynamic candidate discovery in `navigate_oca.js` inspects WebLogic OCA CTO options, prioritizing standard commercial CTO models over TAA/GTA or special solution variants.
- **Smart CTO Fallback**: If standard CTO is not rendered directly in the DOM, the scraper dynamically identifies Smart CTO options or disables default pre-selections rather than failing.
- **No Blind Grep on Search Box**: Scraper navigation avoids blindly typing raw substring filters into search inputs that break chassis selection when OCA renders dynamic tree views.
- **Chrome Prompt Resilience**: CDP navigation handles modal leave dialogs, form submissions, and SSO reconnects without hanging or stalling.
- **Sanitized Logging**: Removed hardcoded `°C` formatting artifacts in ambient temperature logs, ensuring conditional rules reflect the actual conditional gate without spurious characters.

---

## 3. Product Generation Verification Matrix

### 3.1 HPE ProLiant DL380 Gen12 (Enterprise 2U Compute)
* **Workspace**: `outputs/ProLiant/Gen12/DL380_Gen12/`
* **Catalog XLSX**: `DL380_Gen12_OCA_Catalog.xlsx` (14.4 MB, 26 tabs)
* **Master CSV**: `DL380_Gen12_Master_Catalog.csv` (1.5 MB)
* **NotebookLM Sync**: Notebook ID `1d190853-4e9c-48df-aa70-eae66c6f2c1f` (`cloudSyncState: VERIFIED`)
* **Certified Source ID**: `93d78ae2-e20e-4485-8750-7948369ba18b`
* **Running Knowledge Google Doc**: `1TNdR_1A-IH7UQo8gAqQ2c3HEN7f8FTgPizozvolpf6M`

### 3.2 HPE ProLiant DL380a Gen12 (AI Accelerator Server)
* **Workspace**: `outputs/ProLiant/Gen12/DL380a_Gen12/`
* **Catalog XLSX**: `DL380a_Gen12_OCA_Catalog.xlsx` (10.2 MB, 24 tabs, 440 HW SKUs + 220 Service SKUs)
* **Master CSV**: `DL380a_Gen12_Master_Catalog.csv` (1.1 MB)
* **NotebookLM Sync**: Notebook ID `b233ec88-4682-4164-a801-3ee6ca649dc1` (`cloudSyncState: VERIFIED`)
* **Certified Source ID**: `d271a1ea-80dd-49bf-bff2-ea484e1ac24e`
* **Live Grounding Query Verification**:
  - Live query: *"What are the primary base chassis and GPU options supported on DL380a Gen12?"*
  - **Verdict**: 100% grounded response with 19 exact citations verifying base chassis `P76706-B21` (iLO 7 mandate for Intel Xeon 6 P-Cores), `P74461-B21` (iLO 6 constraint), NVIDIA H200 NVL (`S3U30C`), NVIDIA RTX PRO 6000 Blackwell (`S6A73C`), and the exact 5-PSU/8-PSU Titanium power redundancy matrix.

---

## 4. Test Suite Certification & Linter Discipline
* **Scraping Domain Test Matrix**: **21/21 suites PASSED (100.0%)** across Unit (10/10), Chaos (9/9), Integration (1/1), and E2E (1/1).
* **Linter Status**: **0 warnings, 0 errors** (`npx oxlint dashboard/src` across 111 files).
* **Cyclomatic Complexity**: All 1,210 functions strictly conform to $CC \le 135$.
