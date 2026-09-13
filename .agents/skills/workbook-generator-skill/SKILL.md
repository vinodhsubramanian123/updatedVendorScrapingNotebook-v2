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
   `[Download Certified BOQ Workbook (Excel)](file:///home/vinodh/vendorNotebookSolution/outputs/temp/HPE_DL380_Gen12_Certified_BOQ.xlsx)`
2. **Summary of Generated Sheets**:
   - `Summary & Rationale` (Executive strategy & RAG verification)
   - `Certified Hardware BOM` (Cleaned part numbers with `#0D1` tags and formula prices)
   - `7-Aspect Physical Audit` (Detailed physical math checks)
   - `Value Engineering` (Advisory deal optimizations)
3. **CLIC Import Readiness Statement**:
   Confirming that the BOM is formatted for 100% clean, error-free import into HPE OCA / Partner Portal.
