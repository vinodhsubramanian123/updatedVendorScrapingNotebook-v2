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

### 1. Direct Part Number & Quantity Alignment (`INV-117`)
- **Quantity as Physical Anchor (Rule 6)**: The CTO base chassis quantity serves as the cluster node multiplier anchor ($N = \text{serverCount}$).
- **Pre-Multiplied BOQ Normalization (Rule 38)**: Decomposes pre-multiplied cluster tenders into single-node base configurations ($Q_{\text{node}} = Q_{\text{total}} / N$) to enable 1-to-1 reconciliation against vendor per-node quotes.
- **Hardware Spec Neutralization (Rules 5 & 43)**: Neutralizes embedded hardware specification strings (`x8`, `x16`, `4x`, `#`, `Gen5`) so regex extractors do not misinterpret them as quantity multipliers.
- **Service Quarantining (Rule 44)**: Filters out service SKUs and install descriptions (e.g. `HA113A1 5A6` "HPE Proliant DL/ML Install SVC") to prevent false detection as server chassis.
- **Spares & Services Immunity (Rules 4 & 36)**: Protects order-level services (`HA113A1`), warranties (`HU4B2A3`), spares, and bulk accessories (`804943-B21` lift handles) from division/multiplication (`nodeMult = 1`).
- **Section Breakdown Pricing Invariant (Rules 15 & 33)**: Extended totals are derived strictly formulaically ($\sum Q_{\text{node}} \times N \times \text{UnitPrice}$) rather than copied from raw text.
- Flags fractional anomalies, missing multipliers, or quantity discrepancies.

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

---

## 🛡️ Dynamic Header Discovery & Pristine Customer Baseline (`INV-123`)

### 1. Dynamic Column Header Discovery (Zero Hardcoding)
Customer tender sheets arrive in unpredictable tabular layouts. Agents and scripts **MUST NEVER hardcode column letters (`B, C, D, E, F`) or static column indices (`0, 1, 2`)**. Always resolve column locations dynamically using semantic regex dictionaries:

```javascript
function resolveTenderColumns(headerRow) {
  const map = { pn: -1, desc: -1, qty: -1, setQty: -1, remarks: -1, price: -1 };
  headerRow.forEach((val, idx) => {
    const s = String(val || '').trim();
    if (/^(p\/?n|part\s*no|part\s*number|sku|product\s*#|item\s*code|material)/i.test(s)) map.pn = idx;
    else if (/^(desc|description|item\s*desc|specification|details)/i.test(s)) map.desc = idx;
    else if (/^(qty|quantity|units?|count|qty\s*per\s*(node|set|server|system))/i.test(s)) map.qty = idx;
    else if (/^(set\s*qty|system\s*qty|cluster\s*qty|node\s*multiplier|servers?|system\s*count)/i.test(s)) map.setQty = idx;
    else if (/^(remarks?|comments?|notes?|actions?|proposed)/i.test(s)) map.remarks = idx;
    else if (/^(unit\s*price|list\s*price|price)/i.test(s)) map.price = idx;
  });
  // If Remarks column is absent, append it dynamically as next available column
  if (map.remarks === -1) map.remarks = headerRow.length;
  return map;
}
```

### 2. Sacred Customer Baseline Invariant
- **Zero In-Place Overwriting**: The customer's original part numbers, descriptions, unit quantities, and multiplier quantities MUST NEVER be altered or replaced in their original columns.
- **Auditability**: Preserving the customer's raw RFP text side-by-side with proposed modifications enables instant diffing and dispute-free tender defense.

### 3. The Golden Remarks Contract & Action-First Principle
- **Identical Row (`MATCHED (1:1)`)**: Explicitly tagged `MATCHED (1:1)` with soft green fill (`#E6F4EA`) to provide immediate, unambiguous positive confirmation without visual clutter.
- **Variance / Delta Row (Action-First Format)**: Mandatory whenever any variance exists. Must strictly lead with the **primary action verb first** before technical descriptions:
  `[ACTION: ADDED / REMOVED / SUBSTITUTED / REDUCED / INCREASED / UPDATED] [Proposed Active SKU: ...] [Configured Qty: ...] [Plain-English Reasoning & Customer Options: ...]`.
  - `[SUBSTITUTED / MODERNIZED]`: Replaced obsolete/discontinued SKU with active functional equivalent (e.g. 4th Gen to 5th Gen CPU, DDR5-4800 to DDR5-5600 Smart FIO).
  - `[REMOVED FROM SERVER BUILD]`: Component omitted from chassis build (e.g. internal drives omitted in SAN-boot compute node where boot is NS204i-u and storage is centralized on SAN; unbuildable duplicate controllers/risers). Must explain customer choice: add back if local storage needed, order as field spare, or deduct to save budget.
  - `[QTY REDUCED]`: Normalizing fan kits, duplicate PSUs, or single-device slots to meet physical chassis boundaries.
  - `[QTY BUFFERED / INCREASED]`: Buffered for memory channel balance (e.g. 10 to 12 DIMMs) or RAID1 NVMe boot mirror.
  - `[ADDED / FACTORY INCLUSION]`: Mandatory enablement kits, brackets, cables, or licenses required for buildability.
  - `[ABSORBED INTO FLEET]`: Loose tender ad-hoc parts packaged into dedicated carrier servers in Section 2.
  - `[SYSTEM ARCHITECTURE]`: Chassis base models, cluster sizing, and management profiles.

### 4. Automated Programmatic Parity Assertion
Before exporting or presenting any tender evaluation workbook, run an automated assertion:
```javascript
// Programmatic assertion: Every difference MUST have an action-first remark, and exact match has MATCHED (1:1)
if (configuredTotal !== tenderTotal && (!remark.trim().startsWith('[') || remark.includes('MATCHED'))) {
  throw new Error(`Tender Discrepancy Violation at Row ${r}: Configured (${configuredTotal}) != Tender (${tenderTotal}) but Remarks does not lead with an Action tag!`);
}
```



