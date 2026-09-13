---
name: bom-reconciliation-skill
description: Use this skill for reconciling and comparing customer-requested BOQs against vendor partner quotes, verifying line-by-line part numbers, quantities, prices, substituted components, unrequested extras, and missing mandatory enablement kits.
---

# BOM Reconciliation & Vendor Quote Difference Analyzer (`bom-reconciliation-skill`)

When sales engineers receive both a customer's original specification and an official vendor partner quote (or need to audit a quote before submitting to CLIC/OCA), this skill directs the agent to perform an automated, forensic line-by-line reconciliation.

---

## 🔍 The 4 Reconciliation Audit Dimensions

Every BOM comparison audits 4 distinct categories of variances:

```mermaid
graph TD
    A["Customer Requested BOQ vs Vendor Quote BOM"] --> B["1. Direct Matches (Identical SKUs & Qty)"]
    A --> C["2. Missing Items (Customer Asked, Quote Omitted)"]
    A --> D["3. Unsolicited Extras (Unrequested Services / Software)"]
    A --> E["4. Part Substitutions (Alternative CPU, Storage, Controller)"]
```

### 1. Direct Part Number & Quantity Alignment
- Validates identical part numbers across both documents.
- Checks quantity multipliers ($N$-node tender multiplication vs single-node base configuration).
- Flags fractional anomalies or quantity discrepancies.

### 2. Omitted / Missing Customer Hardware
- Flags critical customer requirements that the vendor omitted from the quote (e.g. customer specified 2x 100GbE NICs, but vendor only quoted 1x 25GbE NIC).
- Explains the operational risk to the customer's intended workload.

### 3. Unsolicited Extras & Gold-Plating (`INV-32`)
- **Strict Invariant Check**: Partner portal quotes frequently bundle unrequested high-margin services:
  - `HA114A1` (Installation and Startup Service)
  - `HA114A1 5A6` (Onsite Startup Service)
  - `S1A05A` (Unsolicited SaaS Software Subscriptions)
- The reconciliation engine flags these as `[UNSOLICITED_EXTRA_COST]` and calculates the exact CapEx savings achieved by stripping them.

### 4. Component Substitutions & Pivots
- Identifies where the vendor swapped a customer part:
  - **Legitimate Technical Pivots (`INV-39`)**: Swapping an OCP controller to PCIe standup (`MR416i-p`) to preserve customer's requested OCP networking.
  - **Supply Chain Substitutions**: Swapping an obsolete or restricted CPU (e.g. Xeon 8480+ to Xeon 8580).
  - **Downgrades**: Swapping NVMe Mixed-Use (MU) SSDs to Read-Intensive (RI) SSDs without customer consent.

---

## 📑 Financial & Contractual Compliance Check

1. **Unit List Price & Historical Drift (`INV-33`, `INV-34`)**:
   - Cross-references quoted unit list prices against certified `catalog.json` and `price_history.json`.
   - Flags quotes rendering unbundled temporary `$0.00` items or artificial markups.
2. **CTO Container Tree Tagging (`INV-25`)**:
   - Verifies that all internal server components (memory, CPU, drives, controllers) include the `#0D1` / `-F21` FIO suffix.
   - BTO parts (`-B21` without `#0D1`) placed inside CTO base chassis containers will fail vendor configurator compile with CLIC Rules 81354490 & 91001655.
3. **Automated Subtotal & Separator Contract (`INV-37`)**:
   - Formats outputs into the standardized 7-column schema:
     `['Part No', 'Qty', 'Set', ' Description', 'Unit List Price (USD)', 'Extended Price (USD)', 'Portal / CLIC Status']`
   - Inserts `CONFIG #N SUBTOTAL:` rows and 2-line separator gaps between distinct server clusters.

---

## 💻 CLI Reconciliation Tools & Commands

```bash
# Reconcile two BOMs (customer request vs vendor quote) — primary entry point
node scripts/lib/boq/vendor_bom_verifier.js --customer customer_boq.xlsx --vendor vendor_quote.xlsx --catalog outputs/ProLiant/Gen12/DL380_Gen12

# Programmatic reconciliation via Node.js
node -e "
  const { verifyVendorBOM } = require('./scripts/lib/boq/vendor_bom_verifier.js');
  const quote = JSON.parse(require('fs').readFileSync('quote_items.json', 'utf-8'));
  const baseline = JSON.parse(require('fs').readFileSync('rank1_items.json', 'utf-8'));
  console.log(JSON.stringify(verifyVendorBOM(quote, baseline, 'outputs/ProLiant/Gen12/DL380_Gen12'), null, 2));
"

# Generate standardized 7-column Partner Upload workbook from reconciliation output
node scripts/catalogs/generate_tender_partner_bom.js
```

> **Note**: The actual verifier module is [`vendor_bom_verifier.js`](file:///home/vinodh/vendorNotebookSolution/scripts/lib/boq/vendor_bom_verifier.js) located in `scripts/lib/boq/`, not `scripts/evaluators/verify_vendor_bom.js`.

---

## 📊 Reconciliation Output Schema

The verifier produces a structured JSON with these 4 audit dimensions:

```json
{
  "reconciliation": {
    "directMatches": [
      { "sku": "P73289-B21", "description": "Xeon Platinum 8580", "customerQty": 2, "vendorQty": 2, "status": "MATCH" }
    ],
    "missingItems": [
      { "sku": "P10115-B21", "description": "25GbE OCP3 NIC", "customerQty": 1, "risk": "CRITICAL — primary network adapter omitted" }
    ],
    "unsolicitedExtras": [
      { "sku": "HA114A1", "description": "Installation and Startup Service", "vendorQty": 1, "unitPrice": 1500.00, "capExImpact": 1500.00, "flag": "UNSOLICITED_EXTRA_COST" }
    ],
    "substitutions": [
      { "customerSku": "P73289-B21", "vendorSku": "P73299-B21", "type": "SUPPLY_CHAIN", "rationale": "Xeon 8580 → Gold 6548Y downgrade without customer consent" }
    ],
    "summary": {
      "totalDirectMatches": 12,
      "totalMissing": 1,
      "totalExtras": 2,
      "totalSubstitutions": 1,
      "customerCapEx": 45230.00,
      "vendorCapEx": 47890.00,
      "netCapExDelta": 2660.00,
      "savingsFromStrippingExtras": 2150.00
    }
  }
}
```

---

## 🔗 Execution Trace Integration

When BOM reconciliation runs through the agent harness, it records these steps in the execution trace (per `execution-trace-skill`):

| Step | Name | Verification Gates |
|------|------|-------------------|
| 1 | Dual Document Ingestion | ✅ Both BOMs loaded · ✅ ≥5 items each · ✅ SKU format valid |
| 2 | Line-by-Line SKU Alignment | ✅ All 4 dimensions populated |
| 3 | Financial & Compliance Audit | ✅ Prices cross-referenced · ✅ FIO tags checked · ✅ Extras flagged |
| 4 | Report Assembly | ✅ Net CapEx delta calculated · ✅ 7-column schema compliance |

