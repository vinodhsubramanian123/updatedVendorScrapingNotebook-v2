---
name: heterogeneous-tender-modernizer
description: Use this skill when handling complex, messy customer tender BOQ sheets containing mixed hardware domains (Compute, SAN Storage, FC Switches, Tape Libraries) and unbuildable loose/ad-hoc components. Synthesizes an up-front architectural plan, partitions domains, sizes minimal carrier server fleets via Diophantine bin-packing, enforces dual-brain NotebookLM grounding without hallucinations, and delivers both 100% tender-preserving client workbooks (with zero portal jargon) and validated vendor configurator manifests.
---

# Heterogeneous Tender Modernizer & Carrier Fleet Synthesis Skill (`heterogeneous-tender-modernizer`)

**Purpose**: In enterprise presales, customer tenders frequently arrive as complex, disorganized, or "dirty" spreadsheets. They aggregate disparate domains (compute clusters, block storage arrays, SAN switching fabrics, and tape backup libraries) alongside loose, unmounted "Ad-Hoc" or spare parts (DIMMs, NICs, SSDs, HDDs, CPUs, batteries) scattered across multiple tables. Vendor configurators (such as HPE One Config Advanced / OCA or Dell OSC) reject these raw quotes with unbuildable errors because memory cannot be loose, accessory batteries cannot be orphaned, and slot limits are violated.

This skill executes an autonomous, structured, 7-phase modernization workflow that plans first, decouples domains, sizes minimal carrier server fleets to absorb 100% of loose items, grounds every SKU via Gemini NotebookLM / QuickSpecs, and produces two distinct audit-certified deliverables:
1. **Client-Facing Presentation Master**: Preserves 100% of original tender line items, enriches Column F with professional engineering remarks and bidirectional cross-references, and strictly forbids internal vendor portal jargon (`"UCID"`, `"dummy"`, `"hack"`).
2. **Internal Vendor Configurator Manifests**: Clean, segmented import sheets (Production UCID 1 + Carrier Fleet UCID 2) engineered for 100% factory buildability on first pass.

---

## 🕒 When to Call This Skill (Trigger Conditions)

Activate this skill whenever:
1. **Mixed Solution Domains**: The input tender contains $>1$ infrastructure domain (e.g. ProLiant servers + MSA SAN storage + StoreFabric SN3600B switches + StoreEver MSL tape libraries).
2. **Unbuildable Loose / Ad-Hoc Components**: The tender lists standalone memory DIMMs, spare NICs, unmounted disk drives, loose CPUs, or loose cache batteries without host server bindings.
3. **Multi-Table or Multi-Sheet Complexity**: Tender quotes spanning multiple tables (e.g. Tables 1–20) where identical BOMs can be consolidated (e.g. merging Tables 3 & 8) or single-socket minimal-change paths are required (e.g. Table 11).
4. **Client-Facing Presentation Requirements**: The customer requires complete preservation of their original tender rows, whole integer quantities, and zero internal portal mechanics in the presentation sheet.
5. **Configurator Rule Clashes**: The build triggers configurator limits (e.g. OCA `Selection constraint for Ethernet PCIe: max 3`, `Rule 81356113` for orphaned batteries, or `Rule 81354637` for standalone boot cables).

---

## 📍 Where This Fits in the Presales Architecture

- **Upstream Ingestion**: Raw customer Excel (`.xlsx`), CSV, Google Sheet, or scanned quote via [`ocr-quote-ingestion-skill`](../ocr-quote-ingestion-skill/SKILL.md) / [`presales-query-router`](../presales-query-router/SKILL.md).
- **Core Processing**: Runs [`heterogeneous_tender_modernizer.js`](file:///scripts/lib/boq/heterogeneous_tender_modernizer.js) and accesses hardware rules dynamically via [`platform_profiles.js`](file:///scripts/lib/rules/platform_profiles.js).
- **Dual-Brain Grounding**: Interacts with [`nlm-skill`](../nlm-skill/SKILL.md) / `gemini-notebook-mcp` to verify active vs. obsolete SKUs, FIO (`-F21`) vs. BTO (`-B21`) suffixes, and exact capacity descriptions.
- **Downstream Delivery**: Generates formatted workbooks via [`workbook-generator-skill`](../workbook-generator-skill/SKILL.md) and pushes in-place updates to Google Sheets or OCA via [`oca-catalog-scraper`](../oca-catalog-scraper/SKILL.md).

---

## 📋 1. The Official HPE OCA Portal Upload Format Standard

When formatting bills of materials for batch ingestion into HPE One Config Advanced (OCA), the file MUST strictly conform to these rules:

| Column Header | Data Type | Requirement / Rule |
| :--- | :--- | :--- |
| **`Qty`** | Whole Integer | Whole integer quantity per configuration group. Fractions or decimals cause parse failure. |
| **`Product #`** | String SKU | Canonical HPE part number with suffix (e.g. `P52534-B21` or `P64707-F21`). Zero whitespace. |
| **`Description`** | String | Standard vendor catalog description. |
| **`Config Name`** | String | Unified identifier (e.g. `DL380 Gen11 #1`, `Dummy Server Pool A - 64GB`). |

### Critical Configurator Upload Invariants:
1. **STRICTLY NO PRICES**: Never include unit prices, extended prices, or currency columns in the OCA upload sheet. Pricing columns confuse the WebLogic batch import parser.
2. **EXACTLY 2 BLANK SEPARATOR LINES**: Every distinct configuration block (e.g. between Server 1 and Server 2) must be separated by **exactly 2 completely empty rows**. This signals WebLogic OCA to finalize the preceding chassis and initialize a fresh configuration canvas.
3. **ZERO ORPHAN ACCESSORIES**: Every battery (`P01366-B21`), cable (`P52152-B21`), or riser kit must be placed inside an owning server block. Standalone accessory rows outside a host chassis trigger unbuildable errors (`Rule 81356113` & `Rule 81354637`).

---

## 🔧 2. Deep Dependency Resolution Checklist (Missing Enablement Kits)

Raw customer RFPs and tender spreadsheets almost universally omit companion enablement hardware. The engine automatically injects these mandatory physical kits:

| Omitted Requirement | Physical Trigger Condition | Mandatory Injected Enablement Kit | Invariant / Rule Enforced |
| :--- | :--- | :--- | :--- |
| **Secondary Riser Kit** | Server contains $>3$ PCIe cards | **`P48802-B21`** (2U x8/x16/x8 Secondary Riser) | Unlocks physical PCIe Slots 4, 5, 6. |
| **Tertiary Riser Kit** | Server contains $>6$ PCIe cards | **`P48804-B21`** (2U x16/x16 Tertiary Riser) | Unlocks physical PCIe Slots 7, 8. |
| **OCP2 Enablement Kit** | Card placed in OCP Slot 2 (Rear) | **`P48828-B21`** (DL300 Gen11 2U OCP2 x16 Kit) | Routes PCIe Gen5 lanes to 2nd OCP slot (CLIC Rule 81354616). |
| **CPU1 to OCP Cabling** | Single-socket (1P) with OCP2 | **`P51911-B21`** (CPU1 to OCP2 x8 Enablement Cable) | Bridges CPU1 PCIe lanes to OCP Slot 2 when CPU 2 is omitted. |
| **Dual-Socket Heatsink** | Server configured with 2 CPUs | **`P48818-B21`** (High Performance 2U Heatsink) | Thermal protection for CPU 2 socket. |
| **High-Performance Fans** | High TDP CPU ($>205$W) or NVMe | **`P48820-B21`** (2U High Performance Fan Kit) | **1 kit contains all 6 fans**; max 1 kit per chassis (Rule 81354654). |
| **Storage Battery Cable** | Storage controller with cache battery | **`P48918-B21`** (Storage Controller Cable Kit) | Wires `P01366-B21` cache battery to MR408i-o controller. |
| **Centralized Battery Tray** | Redundant controllers requested | **Max 1 `P01366-B21` per 2U chassis** | DL380 Gen11 has 1 battery tray (CLIC Rule 81354647). Extra units pruned. |
| **Tri-Mode Drive Cage** | Drive count $>8$ SFF drives | **`P48813-B21`** (8SFF Tri-Mode U.3 Drive Cage) | Expands base 8SFF chassis to 16SFF or 24SFF. |
| **Controller Retimer Cable** | High-drive count or PCIe controller | **`P54874-B21`** (8SFF to Retimer/-P Cable Kit) | Interconnects SR932i-p controller to 24SFF backplane. |
| **Server Rackmount Rails** | All rack chassis | **`P52341-B21`** (Easy Install Rail 3 Kit) | Standard 2U rack installation rails. |

---

## 🔄 3. Obsolete / Discontinued Products & SKU Alternatives Matrix

Never quote obsolete parts. All legacy Gen10, 15K SAS, and retired components are cross-verified and mapped to active factory equivalents:

| Legacy / Obsolete Tender SKU | Status / Retirement Note | 100% Active Factory Replacement | Verification Grounding Rationale |
| :--- | :--- | :--- | :--- |
| **`P28028-B21`** (300GB 15K SAS BC) | **End-of-Sale 10/31/2024** (Discontinued) | **`P40430-B21`** (*300GB SAS 12G 10K SFF BC HDD*) | 15K SAS drives discontinued across all vendors. Active 10K BC HDD is factory-orderable through 06/30/2028. |
| **`870753-B21`** (300GB 15K SAS SC) | Gen10 Smart Carrier (Incompatible) | **`P40430-B21`** (*300GB SAS 12G 10K SFF BC HDD*) | Gen11 requires Basic Carrier (BC). |
| **`881457-B21`** (2.4TB 10K SAS SC) | Gen10 Smart Carrier (Incompatible) | **`P28352-B21`** (*2.4TB SAS 12G 10K SFF BC HDD*) | Gen11 Basic Carrier equivalent. |
| **`P49052-B21`** (3.2TB SAS 12G SC) | Gen10 Smart Carrier (Incompatible) | **`P49053-B21`** (*3.2TB SAS 24G MU SFF BC SSD*) | Active Gen11 24G SAS Multi Vendor SSD. |
| **`P47846-B21`** (3.84TB NVMe V1) | Discontinued V1 Static NVMe | **`P64846-B21`** (*3.84TB NVMe Gen4 MP RI BC V2*) | Active V2 Multi Vendor NVMe Gen4 SSD. |
| **`P08421-B21`** (10Gb SFP+ BCM57414) | Legacy Gen10 PCIe adapter | **`P26262-B21`** (PCIe) / **`P10115-B21`** (OCP3) | Active 10/25Gb SFP28 BCM57414 dual-port adapters. |
| **`QW938B`** (SN3000B 16Gb Switch) | End-of-Life Brocade 6505 platform | **`R7R97A`** (*SN3600B 32Gb 24/8 FC Switch*) | Modern Gen6 32Gb SAN switch platform. |
| **`P64705-F21`** (**16GB** DDR5-5600) | **CRITICAL CAPACITY TRAP** | **`P64706-F21`** (**32GB** DDR5-5600 Smart FIO Kit) | **`P64705` is 16GB!** `P64706` is the true 32GB Dual Rank x8 DDR5-5600 SmartMemory SKU. |

---

## 🛡️ 4. The 3-Tier Epistemic Fallback Chain (Grounding & Guardrails)

To guarantee zero hallucinations and maintain $\ge 0.95$ confidence across any hardware family:

```
[Target SKU or Chassis Inquiry]
              │
              ▼
   ┌────────────────────────────────────────┐
   │ Tier 1: NotebookLM Grounded RAG Query  │
   │ - Official QuickSpecs PDFs             │
   │ - Live 22-Sheet OCA Catalogs           │
   └──────────────────┬─────────────────────┘
                      │
              Found? ─┴─ Not Found / Ambiguous
              │                 │
              ▼                 ▼
        [Apply Rule]    ┌────────────────────────────────────────┐
                        │ Tier 2: Hands-Free CDP OCA Scraping    │
                        │ - Navigate port 9222 via Puppeteer/CDP │
                        │ - Scrape live active options & prices  │
                        └──────────────────┬─────────────────────┘
                                           │
                                   New Chassis / SSO?
                                           │
                                           ▼
                        ┌────────────────────────────────────────┐
                        │ Tier 3: Human-in-the-Loop Confirmation │
                        │ - Clarify unmapped chassis family      │
                        │ - Confirm scope with architect         │
                        └────────────────────────────────────────┘
```

1. **Tier 1 (NotebookLM QuickSpecs RAG)**: Always check official grounded sources first. Solves 95%+ of SKU lookups, FIO/BTO distinctions, and memory channel configurations with exact document citations.
2. **Tier 2 (Hands-Free CDP Live OCA Scraping)**: If a product or chassis is not yet in NotebookLM sources, autonomously scrape the active catalog from HPE OCA via CDP port 9222 using [`oca-catalog-scraper`](../oca-catalog-scraper/SKILL.md) and [`oca-portal-navigator`](../oca-portal-navigator/SKILL.md).
3. **Tier 3 (Human Confirmation Checkpoint)**: If an entirely new chassis family or unmapped domain arrives, seek confirmation with the human architect before scraping:
   > *"Target chassis [X] is absent in current NotebookLM sources. Ready to hands-free scrape the active catalog from HPE OCA via CDP port 9222. Confirming target product scope."*

---

## 💡 5. Crucial Architectural Learnings & Deep Operational Insights

### A. The Slow Portal Bottleneck: Pre-Flight Containerization vs. WebLogic Spinners
- **The Core Problem**: Vendor portals (especially HPE One Config Advanced built on Oracle WebLogic) execute intensive server-side validation on every single GUI click. Making 1-to-1 SKU modifications inside the portal triggers multi-second recalculation spinners, modal prompt cascades, and short-lived SAML session timeouts (`INV-89`). Correcting 50+ lines manually in OCA takes hours and frequently corrupts canvas state.
- **The Modernizer Strategy**: **Solve 100% of the math before uploading**. By containerizing loose components into certified carrier servers upfront, the batch upload succeeds in a single transaction on first pass.

### B. The "Plan-First-in-Doc" Standard
- Never attempt to write Excel formulas or edit portal canvases before formulating the master plan.
- Lay out the architecture in a structured document first:
  1. Define Strategy A (Production vs Carrier Fleet).
  2. Solve Diophantine bin-packing on paper.
  3. Validate cluster multipliers.
  4. Once certified, compile the plan into code and manifests.

### C. Product Expiry Dates, ETA, & Active Orderability Horizons
- An active SKU today can become obsolete before tender evaluation completes. Always verify the **Active Orderability Horizon**:
  - `P40430-B21` (300GB 10K SAS) is active through **06/30/2028**.
  - `P67095-B21` (Gold 6530) is active through **07/31/2027**.
  - `P52534-B21` (DL380 Gen11 CTO) is active through **04/30/2028**.
- Ensuring $\ge 18-24$ months of active lifecycle guarantees the customer will not face supply-chain cancellations or factory redesigns during deployment.

### D. Service Level Delineation: Hardware Support vs. Cloud SaaS
- **The Pointnext vs. SaaS Confusion**:
  - `HU4B2A3` / `HU4B2A300DK` is **Pointnext Tech Care Basic (3-Year)**: physical hardware break-fix warranty.
  - `R7A11AAE` / `S1A05A` is **HPE Compute Ops Management**: cloud management software-as-a-service.
  - They represent different operational layers and cannot be substituted for one another.
- **The "Apply-to-All" Trap in OCA**: When editing services in OCA, WebLogic defaults to applying the same support level across all components. Turning off "Apply-to-All" ensures each appliance (compute, storage, fabric) receives its exact qualified service contract without inflating deal margins.

### E. Path A (Least-Delta / 1P Baseline) vs. Path B (Full 2P Expandability)
- When a customer tenders an impossible combination (e.g. Table 11 requesting 1 CPU with 4 HBAs and 4 NICs):
  - **Path A (Adopted Baseline)**: Strictly honor 1P CPU budget, utilize SAN storage boot, and integrate 3x 32Gb FC HBAs in Primary Riser.
  - **Path B (Documented Roadmap)**: Detail in Column F remarks the exact additions required (2nd CPU `P67095-B21` + Heatsink `P48818-B21` + Secondary Riser `P48802-B21`) if all 8 stand-up cards must sit internally. Customer can decide without feeling forced into an unbudgeted upgrade.

### F. Identical BOM Cluster Multiplier Consolidation
- When multiple tender tables share identical BOM specifications (e.g. Table 3 Qty 6 and Table 8 Qty 6):
  - Consolidate into a single cluster multiplier in the configurator (e.g. `DL380 Gen11 #3` Multiplier = 12).
  - Keeps the portal canvas clean (11 groups instead of 12) while preserving distinct Table 3 and Table 8 line items in the customer presentation sheet.

---

## ⚙️ The 7-Phase Modernization Lifecycle

```
[Raw Customer Tender BOQ]
          │
          ▼
┌────────────────────────────────────────────────────────┐
│ Phase 1: Strategic Planning & Domain Partitioning      │
│ - Servers vs Storage vs Fabric vs Archive vs Ad-Hoc    │
└────────────────────────────────────────────────────────┘
          │
          ▼
┌────────────────────────────────────────────────────────┐
│ Phase 2: Carrier Fleet Synthesis (Diophantine Solver)  │
│ - Zero mixed-DIMM rule; max 32-DIMM density packing    │
│ - Dual-socket CPU activation for >16 memory channels   │
└────────────────────────────────────────────────────────┘
          │
          ▼
┌────────────────────────────────────────────────────────┐
│ Phase 3: Hardware Slot & Subcategory Arbitration       │
│ - Solves OCA 3 PCIe NIC cap: 3x PCIe + 1x OCP3 hybrid  │
│ - Injects missing deep dependencies (risers, fans)     │
└────────────────────────────────────────────────────────┘
          │
          ▼
┌────────────────────────────────────────────────────────┐
│ Phase 4: Dual-Brain Grounding Gate (NotebookLM / RAG)  │
│ - Obsolete 15K SAS P28028-B21 -> Active 10K P40430-B21 │
│ - SKU Precision: P64705 (16GB) vs P64706 (32GB)        │
│ - Verifies active orderability horizon & lead times    │
└────────────────────────────────────────────────────────┘
          │
          ▼
┌────────────────────────────────────────────────────────┐
│ Phase 5: Client Presentation Generation                │
│ - 100% tender row preservation + intra-sheet references│
│ - Invariant: ZERO "UCID" or portal jargon in remarks   │
└────────────────────────────────────────────────────────┘
          │
          ▼
┌────────────────────────────────────────────────────────┐
│ Phase 6: Internal Configurator Manifest Generation     │
│ - Manifest A (UCID 1): Production 40-node estate       │
│ - Manifest B (UCID 2): 7-node Carrier Fleet            │
│ - Strict 4-column layout, 2-line gaps, NO PRICES       │
└────────────────────────────────────────────────────────┘
          │
          ▼
┌────────────────────────────────────────────────────────┐
│ Phase 7: Closed-Loop Reflection & Continuous Learning  │
│ - Quarantines portal feedback & updates knowledge base │
└────────────────────────────────────────────────────────┘
```

---

## 💻 CLI Commands & Direct Execution Patterns

### 1. Run Complete Modernization & Reconciliation Audit
```powershell
node scripts/maintenance/audit_full_tender_reconciliation.js
```

### 2. Verify Modernizer Engine Unit Tests
```powershell
node scripts/maintenance/verify_heterogeneous_modernizer.js
```

### 3. Synchronize Live Google Sheet In-Place
```powershell
node scripts/services/update_active_google_sheet.js
```

### 4. Query Official Ground Truth via NotebookLM MCP
```javascript
await call_mcp_tool({
  ServerName: 'gemini-notebook-mcp',
  ToolName: 'notebook_query',
  Arguments: {
    notebook_id: 'd37fa851-90cb-45b7-a8e1-78488a0bc6e6',
    query: 'What is the active factory-orderable equivalent for obsolete 15K SAS drive P28028-B21 on DL380 Gen11 and its active lifecycle date?'
  }
});
```

---

## 🛡️ Epistemic Rules & Invariants Summary

1. **`INV-ZERO-JARGON`**: Zero occurrences of `"UCID"`, `"dummy server"`, or `"hack"` in client-facing sheets or remarks. All references must be intra-sheet (e.g. Table 13 pointing to Table 19).
2. **`INV-INTEGER-QUANTITIES`**: Every BOM line must use whole integer numbers for Qty and Set QTY.
3. **`INV-NO-STANDALONE-ACCESSORIES`**: Cache batteries and boot cables must never sit in standalone Ad-Hoc. They must be bound directly inside host server configurations.
4. **`INV-NO-PRICES-IN-OCA-UPLOAD`**: OCA upload sheets must have exactly 4 columns (`Qty`, `Product #`, `Description`, `Config Name`) with zero prices and exactly 2 blank lines between servers.
5. **`INV-CAPACITY-PRECISION`**: Always verify memory part numbers before quoting (`P64705` is 16GB, `P64706` is 32GB, `P64707` is 64GB).
6. **`INV-LIFECYCLE-HORIZON`**: Recommended replacements must have active factory orderability horizons exceeding the customer tender execution window ($\ge 12-24$ months).
