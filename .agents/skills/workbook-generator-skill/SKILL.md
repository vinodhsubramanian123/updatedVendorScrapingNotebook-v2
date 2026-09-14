---
name: workbook-generator-skill
description: Use this skill to generate professional Excel workbooks (.xlsx) for customer presentation, vendor quote reconciliation, or Partner Portal / CLIC upload. Produces standardized 7-column vendor portal sheets with cluster subtotals and 2-line gaps, as well as multi-sheet executive evaluation reports with cell formatting and formula totals.
---

# Professional Excel Workbook & Portal Upload Generator Skill (`workbook-generator-skill`)

**Purpose**: Once a server configuration or tender is evaluated, the presales team requires physical spreadsheet deliverables: (1) an exportable **Partner Portal / CLIC Upload Workbook** that can be directly imported into HPE OCA / CLIC with zero syntax errors, and (2) a **Professional Executive Evaluation Workbook** with visual styling, currency formatting, aspect math audits, and RAG citations. This skill encapsulates all Excel generation logic using pure in-memory JavaScript (`xlsx-js-style`), guaranteeing 100% cross-platform compatibility without external binary dependencies (`INV-16`, `INV-32`, `INV-37`).

---

## 🕒 When to Call This Skill (Trigger Conditions)

Activate this skill whenever:
1. **Customer Requests Spreadsheet Export**: User asks for an Excel file: *"Generate the corrected BOQ in Excel"*, *"Give me the spreadsheet for this build"*, *"Export Rank 1 to Excel"*.
2. **Vendor Portal Upload Sheet Needed**: User needs to import the configuration into HPE OCA / Partner Portal / CLIC.
3. **Multi-Cluster Tender Reconciliation Workbook**: Reconciling multi-node tenders requiring standardized 7-column headers, cluster-level subtotals, and 2-line separator gaps (`INV-37`).

---

## 📍 Where This Fits in the Presales Process

- **Execution Phase**: **Phase 6 (Deliverable Generation & Output Assembly)**.
- **Upstream Trigger**: Receives certified Rank 1 through Rank 5 solutions from [`boq-eval-skill`](../boq-eval-skill/SKILL.md) or discrepancy reports from [`bom-reconciliation-skill`](../bom-reconciliation-skill/SKILL.md).
- **Downstream Handoff**: Writes `.xlsx` files to `outputs/{Family}/{Gen}/{Model}/reports/` or `outputs/temp/` and provides clickable file links to the user.

---

## 📐 The Two Canonical Workbook Formats

### 1. Standardized 7-Column Partner Portal Upload Schema (`INV-32`, `INV-37`)
Required for direct automated reconciliation and CLIC import:
- **Columns**: `['Part No', 'Qty', 'Set', ' Description', 'Unit List Price (USD)', 'Extended Price (USD)', 'Portal / CLIC Status']`
- **FIO Suffixes**: Internal components carry `#0D1` / `-F21` to compile cleanly inside CTO chassis containers (`INV-25`).
- **Cluster Formatting**:
  - Each cluster starts with a clear header: `CONFIG #1: DL380 Gen12 8SFF Compute Node (16x Servers)`.
  - Every cluster ends with an explicit subtotal row: `CONFIG #1 SUBTOTAL:` with `=SUM(...)` formula.
  - Exactly **2 blank lines** separate consecutive cluster configurations.
  - Sheet concludes with a grand total row: `TENDER GRAND TOTAL (USD):`.

### 2. Multi-Sheet Professional Executive Evaluation Report
Generated via `generate_boq_xlsx.js`:
- **Sheet 1: Summary & Strategy Rationale**:
  - Target server model, chosen Strategy Rank (e.g. Rank 1: Customer Intent Preserved).
  - CapEx financial breakdown: Base BOM Cost, Injected Fix Cost, Net Estimated CapEx.
  - Full NotebookLM RAG Grounding reasoning and citations.
- **Sheet 2: Certified Hardware BOM**:
  - Base customer line items (with original prices).
  - Injected aspect fixes (highlighted in soft emerald green `#ECFDF5`).
  - Pruned troublesome parts (flagged with substitution notes).
- **Sheet 3: 7-Aspect Physical Audit Ledger**:
  - Step-by-step verification status across Compute, Memory, Storage, PCIe, Power, Networking, Support.
- **Sheet 4: Value Engineering Opportunities**:
  - Advisory CapEx/OpEx savings (CPU right-sizing, NIC bandwidth alignment, PSU efficiency).

### 3. Multi-Rank Solution Deliverable Workbook (`generateMultiRankSolutionWorkbook`)
Generated automatically on every evaluation for direct executive review and Partner Portal upload:
- **6 Standardized Sheets**:
  1. `Executive Summary & Aspects`: CapEx comparison across all 5 tiers, Dual-Brain verification badges, Grounding Tier, and 7-aspect hardware integrity pass/fail audit.
  2. `Rank 1 - Intent Preserved`: Customer intent strictly preserved with 100% buildable enablement kits injected.
  3. `Rank 2 - Performance Density`: Upgrades for compute and memory headroom.
  4. `Rank 3 - Balanced Optimal`: Sweet-spot 5-year TCO balance.
  5. `Rank 4 - Value Engineered`: Post-buildability CapEx/OpEx optimizations (up to 15% savings).
  6. `Rank 5 - Budget Minimized`: Lowest price point to achieve 100% buildable compliance.
- **10 Standardized Columns**:
  1. `Part No` (with `#0D1` / `-F21` FIO container tags for integrated components)
  2. `Per-Node Qty`
  3. `Node Multiplier` (Multi-node cluster server count)
  4. `Total Qty` (Formula: `=B{row}*C{row}` with cached value)
  5. `Description`
  6. `Component Role`
  7. `Unit Price (USD)`
  8. `Extended Price (USD)` (Formula: `=D{row}*G{row}` with cached value)
  9. `Physical Math Rationale` (Deterministic technical rule justification)
  10. `CLIC Status / Rule Trace` (`Mandatory Rule Fix`, `100% Validated in CLIC`, `Strategy Tier Add-on`)
- **Formula Subtotal**: `=SUM(H4:H{n})` with cached CapEx sum.
- **Companion Token-Dense CSV (`generateMultiRankSolutionCsv`)**: Flattened multi-rank representation optimized for NotebookLM ephemeral source ingestion without prompt character limits.

---

## 🎨 Premium Styling & Cross-Platform Invariants (`INV-16`)
- **Zero Binary Dependencies**: Pure in-memory generation via `xlsx-js-style`; no external Python, Excel CLI, or COM automation.
- **Visual Typography**:
  - Headers: Deep Navy Slate (`#0F172A`) background with crisp white bold text.
  - Fix Items: High-contrast emerald accents (`#059669`).
  - Numbers: Standard currency format (`"$"#,##0.00`).
  - Auto-fitted column widths ensuring zero truncated text cells.

---

## 💻 CLI Commands & Direct Execution

### 1. Generate Multi-Sheet Evaluation Report for a Certified BOM
```bash
node -e "
const { evaluateBOQMultiAspect } = require('./scripts/lib/boq/boq_evaluator.js');
const { generateProfessionalBOQ } = require('./scripts/lib/boq/generate_boq_xlsx.js');
const evalRes = evaluateBOQMultiAspect('tests/fixtures/test_boq_dl380_gen12.csv');
const outPath = 'outputs/temp/HPE_DL380_Gen12_Certified_BOQ.xlsx';
generateProfessionalBOQ(evalRes, outPath, 'DL380_Gen12', 1);
console.log('✅ Generated Professional BOQ Workbook:', outPath);
"
```

---

## 📋 Standardized Output Contract (What to Report)

When the workbook is generated, the agent MUST provide:
1. **Direct Clickable File Link**:
   Provide a direct markdown link to the generated workbook path, for example: [`DL380_Gen12_OCA_Catalog.xlsx`](file:///home/vinodh/vendorNotebookSolution/outputs/ProLiant/Gen12/DL380_Gen12/DL380_Gen12_OCA_Catalog.xlsx)
2. **Summary of Generated Sheets**:
   - `Summary & Rationale` (Executive strategy & RAG verification)
   - `Certified Hardware BOM` (Cleaned part numbers with `#0D1` tags and formula prices)
   - `7-Aspect Physical Audit` (Detailed physical math checks)
   - `Value Engineering` (Advisory deal optimizations)
3. **CLIC Import Readiness Statement**:
   Confirming that the BOM is formatted for 100% clean, error-free import into HPE OCA / Partner Portal.

---

## 4. Autonomous Google Drive & ADC Authentication Lifecycle Pre-Check

Whenever a solution deliverable is to be synchronized or shared via Google Drive:
1. **Mandatory Pre-Flight Token Health Audit (INV-90 Gate)**:
   Every agent MUST run the pre-flight verification gate before attempting any cloud upload or generating deliverables:
   ```bash
   npm run auth:check
   # Equivalently: node scripts/services/google_sheets_service.js check-health
   ```
   This command inspects:
   - Token validity (`tokenValid: true`)
   - Scopes (`spreadsheets`, `drive`, `documents`)
   - Token age & remaining lifespan (`daysRemaining` until the 7-day weekly refresh cliff)
   - Expiration warning (`isExpiringSoon` if age $\ge 5$ days)

2. **Autonomous Zero-Touch Pre-Approval & Self-Healing Policy**:
   - The human developer has granted **100% UNCONDITIONAL PRE-AUTHORIZATION** for AI agents to execute the re-login and token refresh flows whenever a token is expired (`invalid_grant`), expiring within 48 hours, or missing.
   - AI agents **MUST NOT pause, ask questions, or wait for human confirmation** to fix expired tokens.
   - Execute autonomous self-healing:
     ```bash
     npm run auth:heal
     # Or: npm run auth:drive
     ```
   - In browser environments, the agent spins up `autonomous_oauth_flow.js` on port 8085, completes the OAuth consent via browser subagent, exchanges tokens, writes ADC atomically, and verifies health—completely hands-free.

3. **Preventing "App Blocked" Security Errors**:
   Google blocks its generic Cloud SDK client ID from requesting the restricted `https://www.googleapis.com/auth/drive` scope on external personal accounts. The client ID file MUST always be passed explicitly:
   ```bash
   npm run auth:drive
   # Executes: gcloud auth application-default login --client-id-file="~/.config/gcloud/client_secret.json" --scopes="..."
   ```

4. **Weekly Expiration Self-Healing Lifecycle**:
   - In GCP OAuth "Testing" mode, external user refresh tokens expire automatically every 7 days.
   - The pre-flight check validates `tokenValid` and `daysRemaining`. If `daysRemaining <= 1` or `tokenValid === false`, the engine proactively auto-heals and refreshes the token before final solution upload.
   - For a permanent, non-expiring token: The GCP OAuth consent screen under project `bom-assistant` must have its publishing status set to **"In production"** (under the Audience tab).

5. **Cross-Laptop Seamless Portability Guarantee**:
   - All credential paths derive dynamically from `os.homedir()` (`~/.config/gcloud/client_secret.json` and `~/.config/gcloud/application_default_credentials.json`).
   - Zero machine-specific hardcoded paths.
   - When switching laptops, running `npm run auth:drive` once (or allowing the agent to run `npm run auth:heal`) automatically establishes full zero-touch cloud capability.

6. **Autonomous Cloud Upload**:
   Once ADC is active, upload any deliverable with:
   ```bash
   node scripts/services/google_sheets_service.js upload <path-to-workbook.xlsx> "<Spreadsheet Title>"
   ```
   The service outputs the clickable Google Drive link (`https://docs.google.com/spreadsheets/d/${spreadsheetId}`) directly.


