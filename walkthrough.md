# Walkthrough: Google Cloud CLI, Zero-Human-in-the-Loop Google Sheets & Docs Automation

We installed `gcloud`, configured Application Default Credentials, corrected scoped Chrome downloads, and verified programmatic creation of Google Sheets and Google Docs.

---

## What Was Completed

### 1. Google Cloud CLI (`gcloud`) Installation & System Setup
- Installed `google-cloud-cli` 583.0.0 directly with `bq` and `gsutil` at `/usr/local/bin/gcloud`.
- Enabled `drive.googleapis.com`, `sheets.googleapis.com`, and `docs.googleapis.com` in project `bom-assistant`.
- Generated and configured Application Default Credentials (ADC) at `~/.config/gcloud/application_default_credentials.json`.

### 2. Resolution of Google OAuth "This App is Blocked" & Test User Approval
- **Problem**: Google Cloud's security policy strictly prohibits the default generic `gcloud` developer client ID (`32555940559...`) from requesting sensitive Workspace scopes (`spreadsheets`, `documents`, `drive`) on personal `@gmail.com` accounts.
- **Resolution**:
  - Configured OAuth Branding for `BOM Assistant` (`bom-assistant`).
  - Added the operator account as an approved **Test User** in Google Auth Platform Audience.
  - Created an owned **Desktop App OAuth Client ID**:
    - **Secret File**: stored outside the repository in the operator's gcloud configuration directory.
  - Authenticated via `--client-id-file` with long-lived refresh tokens in ADC.

### 3. Chrome & CDP Download Fix (`INV-65` & `INV-66`)
- **Problem**: Downloads triggered in browser automation sessions could be saved under temporary or GUID names.
- **Resolution**:
  - Upgraded [`scripts/lib/scraper/cdp.js`](file:///home/vinodh/vendorNotebookSolution/scripts/lib/scraper/cdp.js) and [`scripts/scrapers/download_quickspecs_pdf.js`](file:///home/vinodh/vendorNotebookSolution/scripts/scrapers/download_quickspecs_pdf.js) to `Browser.setDownloadBehavior` with `behavior: 'allow'`, a dynamically resolved Downloads directory, and download events.
  - `allowAndName` is deliberately avoided because Chromium assigns GUID filenames in that mode.
  - No Safe Browsing or persistent browser security control is disabled.

### 4. Hands-Free Automation Service & CLI Tooling
Created [`scripts/services/google_sheets_service.js`](file:///home/vinodh/vendorNotebookSolution/scripts/services/google_sheets_service.js) supporting:
- `checkGoogleAuth()`: Inspects ADC availability and token scopes without shelling out to `gcloud`.
- `createGoogleSheet(title, options)`: Creates Google Sheets directly, handles multi-tab data and folder placement.
- `uploadFileToGoogleSheet(filePath, customTitle)`: Converts local Excel/CSV files directly into Google Sheets.
- `createGoogleDoc(title, content, options)`: Creates Google Docs and inserts rich text via Google Docs API.

---

## Live Verification Results

### Google Sheets Creation (Hands-Free)
- **Command**: `npm run sheets:create -- "Antigravity Autonomous Sheet Verified"`
- **Created Sheet ID**: `14auB3l8UcagR00UZHUD6y8-vex-acFaeSYSpL1FJqzo`
- **Live URL**: [https://docs.google.com/spreadsheets/d/14auB3l8UcagR00UZHUD6y8-vex-acFaeSYSpL1FJqzo/edit](https://docs.google.com/spreadsheets/d/14auB3l8UcagR00UZHUD6y8-vex-acFaeSYSpL1FJqzo/edit)

### Excel File Upload to Google Sheets (Hands-Free)
- **Command**: `npm run sheets:upload -- /home/vinodh/Downloads/GID-RFQS-HPE-2026-006.xlsx "GID RFQS HPE Verified BOM"`
- **Uploaded Sheet ID**: `15dhWVrpsFc3Q5w_S_HDfQ526JijVvbctpYfvifIkB3A`
- **Live URL**: [https://docs.google.com/spreadsheets/d/15dhWVrpsFc3Q5w_S_HDfQ526JijVvbctpYfvifIkB3A/edit](https://docs.google.com/spreadsheets/d/15dhWVrpsFc3Q5w_S_HDfQ526JijVvbctpYfvifIkB3A/edit)

This is a Drive-only customer evaluation artifact. It is explicitly ineligible for attachment to NotebookLM; only official vendor sources, certified product catalogs, and verified KnowledgeDeltas may become notebook sources.

### Google Docs Creation (Hands-Free)
- **Command**: `npm run docs:create -- "Antigravity Autonomous BOM Document" "Executive Summary: All 7 physical checkers passed 100%."`
- **Created Doc ID**: `1F2jnDn3On5SJqQ7SGKSgrSSyBdj9WG-mu8n3OXWk3EA`
- **Live URL**: [https://docs.google.com/document/d/1F2jnDn3On5SJqQ7SGKSgrSSyBdj9WG-mu8n3OXWk3EA/edit](https://docs.google.com/document/d/1F2jnDn3On5SJqQ7SGKSgrSSyBdj9WG-mu8n3OXWk3EA/edit)

### Unit Tests
- **Suite**: [`tests/unit/test_google_sheets_service.js`](file:///home/vinodh/vendorNotebookSolution/tests/unit/test_google_sheets_service.js)
- **Result**: Covered by the repository test matrix, including customer-source rejection checks.

### DL380a Gen12 Certified Scrape and Continuous Knowledge Sync

- Authenticated OCA search selected the exact standard CTO chassis `P76706-B21`; BTO, TAA/GTA, and neighboring `DL380 Gen12` results were excluded.
- The promoted 24-sheet workbook contains 227 hardware SKUs and 529 service/software SKUs (756 total). The staging audit passed SKU validity, hierarchy, category cardinality, lifecycle, history, and zero-TAA/GTA checks.
- The canonical Google Sheet is `1ileDbsJXAFo59rRG9hsTuTNrjOFTnCXSiGyTLFGXb54`; NotebookLM source `cd20f359-db6d-427a-8570-b54970b2fddd` passed an exact-source canary and product-isolation read-back.
- Six historical architecture-guide claims were checked against the official QuickSpecs. Five unsupported or contradicted claims were quarantined; the supported drive-cage rule was retained. Two verified rules were added: identical dual CPUs and the 4DW/8DW/10DW PSU cardinality matrix.
- The deterministic local evaluator now mirrors the verified PSU matrix and never injects optional Compute Ops Management software. This preserves correct behavior when NotebookLM or another LLM is unavailable.
- Two obsolete DL380a staging copies were removed only after the promoted workbook re-passed the complete audit. Product history and certified live artifacts remain intact.

### Final Regression Certification

- `npm run test:all`: 144/144 suites passed (79 unit, 38 chaos, 24 integration/portfolio, and 3 browser E2E).
- `npm run lint`: zero dashboard lint errors or warnings.
- Static dependency/complexity audit: zero circular dependencies; all enforced complexity thresholds passed.

---

## Architectural Invariants Inscribed
- **`INV-65`**: Modern CDP Download Behavioral Protocol & Clean Filename Preservation.
- **`INV-66`**: Chrome Security & Automatic Download Whitelisting Protocol.
- **`INV-67`**: Zero-Human-in-the-Loop Google Sheets & Docs Workspace Automation Protocol.
- **`INV-68`**: Evidence-Gated Shared Accessory Compatibility Protocol. Common rails, cable-management arms, storage enablement kits, cables, power cords, and transceivers are retained when certified in the target product catalog; cross-product reuse requires exact product membership and verified evidence in both the local and NotebookLM knowledge paths.
- **`INV-69`**: Delta-Only SKU Lifecycle & Business Retention Protocol. Meaningful price, SKU, status, and date transitions are preserved; unchanged runs do not inflate history; removed SKUs stop active tracking after one event but retain compact evidence for deal audits, substitution intelligence, and possible reinstatement.
