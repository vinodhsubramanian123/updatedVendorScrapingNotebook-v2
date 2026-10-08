# DL380a & DL380 Gen12 Catalog Remediation, Diff Hardening & Notebook Grounding Audit

**Date:** 2026-10-08  
**Scope:** HPE ProLiant Compute DL380a Gen12 & DL380 Gen12  
**Governance:** Dual-Brain Deterministic Physical Pre-Checks & Authoritative Gemini NotebookLM Grounding  
**Author:** Lead Solution Execution Architect (Antigravity)

---

## 1. Executive Summary & Root Cause Analysis

Following customer feedback regarding discrepancies in NotebookLM responses for DL380a Gen12 (GPU SKU `S6A73C` falsely reported as discontinued, 8 PSUs reported non-compliant for 2 GPUs, 4x GPU cable kits rejected, and Cloud Management reported as mandatory), a root-cause investigation revealed the following:

1. **GPU SKU `S6A73C` (NVIDIA RTX PRO 6000 Ada/Blackwell 96GB)**:
   - *Cause*: WebLogic OCA only renders the `GPU Accelerators` sub-table when the GPU Mode radio (`P75008-B21`) is actively toggled. An intermittent scrape missed the unrendered sub-table, causing `diff_catalog.js:diffRemovedCatalogEntries` to falsely tombstone `S6A73C` into `history/discontinued_skus.json`.
   - *Remediation*: Enacted **`INV-141`** in `scripts/lib/catalog/diff_catalog.js`: a SKU is strictly prevented from being marked `DISCONTINUED` or `REMOVED` if its `vendorDiscontinuedDate` is in the future or active in vendor QuickSpecs. Restored active GPU Accelerators in `DL380a_Gen12_Catalog.json`.

2. **Power Supply Selection (8x 3200W PSUs for 2 GPUs)**:
   - *Cause*: Rule `DELTA_DL380A_GEN12_GPU_PSU_COUNT_MATRIX` was interpreted by the LLM as an exact equality requirement (`count == 5`) rather than an operational lower bound.
   - *Remediation*: Clarified rule contract across deltas, charters, and payloads: **5 PSUs is the minimum operational baseline** for 2 GPUs, while populating **8 PSUs is fully valid** for N+N grid redundancy and pre-populating all 8 chassis power bays.

3. **GPU Power Cable Kit (`P74700-B21` / `P83526-B21`) Multiplier**:
   - *Cause*: Physical aspect checker in `scripts/lib/aspects/pcie_riser.js` defaulted to 1 cable kit per GPU (`multiplier = 1`).
   - *Remediation*: Added explicit recognition in `pcie_riser.js` for 16-pin cable kits `P74700-B21` and `P83526-B21`: each kit powers **2 GPUs** (`multiplier = 2`), so **4 kits power 8 GPUs** and is fully sufficient.

4. **Cloud Management Enablement (`S1A05A` / `R7A11AAE`)**:
   - *Cause*: OCA factory CTO ordering rules enforce 1x Compute Ops Management SaaS by default, which was misconstrued as an immutable hardware requirement.
   - *Remediation*: Formulated `DELTA_UNIVERSAL_CLOUD_MANAGEMENT_OPTIONAL`: physical servers operate independently using on-premises iLO; cloud SaaS is optional for hardware operation.

5. **Local Machine Path Leaks & Verification Failure (Line 3393)**:
   - *Cause*: `scripts/catalogs/generate_xlsx.js` wrote absolute local machine paths (`C:\Users\latha\.gemini\...`) into Excel `Metadata`, where CommonMark unescaped `\.` to `.`, breaking byte-for-byte readback verification in `verifySemanticProjectionReadback`.
   - *Remediation*: Implemented `toPosixRelative()` in `generate_xlsx.js` and CommonMark slash normalization in `semantic_workbook_projection.js`.

6. **Cross-Product Contamination Cleanup (`DL380_Gen12`)**:
   - *Cause*: Leaked DL380a CTO chassis `P76706-B21` in DL380 Gen12 history tripped product isolation gates.
   - *Remediation*: Cleaned `P76706-B21` from DL380 Gen12 history and taught `nlm_sync_client.js` to recognize valid cross-generation catalog options (e.g. DL380 Gen11 secondary risers on Gen12).

---

## 2. NotebookLM Cloud Sync & Source Replacement Receipts

Both notebooks were synchronized, candidate-verified with zero warnings, and stale October 1 sources were permanently deleted:

| Product Generation | Notebook ID | Verified Source ID | Promoted Title | Retired Source ID | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`DL380a_Gen12`** | `b233ec88-4682-4164-a801-3ee6ca649dc1` | `5a1a5220-8d09-4627-9a5b-04945f29a9f4` | `DL380a_Gen12_OCA_Catalog_2026-10-08` | `aa51f3c8-e350-4b49-8f55-92b86a01d66d` | `VERIFIED` |
| **`DL380_Gen12`** | `1d190853-4e9c-48df-aa70-eae66c6f2c1f` | `9c5048df-051e-4aee-b491-d3909ff5f6a6` | `DL380_Gen12_OCA_Catalog_2026-10-08` | `20e03410-581e-498a-af46-d1f29c960549` | `VERIFIED` |

---

## 3. Live Grounded Verification Proof

Canary queries executed directly against Gemini NotebookLM confirmed:
- **`S6A73C`**: Confirmed **Active**, list price **$57,002.00**, support through **12/31/2028**, **not discontinued** (citing new source `5a1a5220...`).
- **Power Supplies**: Confirmed **5 PSUs minimum**, **8 PSUs fully supported** for N+N grid redundancy.
- **GPU Cable Kits**: Confirmed **4x `P74700-B21` powers 8 GPUs** ($2\times$ multiplier).
- **Cloud Management**: Confirmed optional for on-premises server operations.
- **DL380 Gen12 Options**: Confirmed `P69728-F21` active ($28,532.00) and Gen11 secondary riser kit `P48802-B21` officially supported ($265.00).

---

## 4. Repository Health & Invariants

- Deterministic Physical Pre-checks: 16/16 Aspect suites passed (100.0%).
- Fast Smoke Regression Matrix: 8/8 suites passed (100.0%).
- Global False Tombstone Scan: 0 false tombstones across all 12 products in `outputs/`.
- Local Machine Path Leak Scan: 0 path leaks across all 25 Markdown sync payloads.
