# HPE Pre-Flight BOQ Evaluation & Validation Report

**Target BOQ File**: `C:/Users/latha/Downloads/Config2_SN3600B_FC_Switch_EVALUATED_BOQ.xlsx`  
**Target Gemini Notebook**: SN3600B FC Notebook (`d7f84352-1cdb-4842-84ca-39d2a10b91eb`)  
**Evaluation Date**: 2026-09-23T13:30:56.475Z  
**Quantity basis**: Physical validation and category figures describe 1 base configuration; requested configurations: 1. Order-level rows retain their own quantities. The corrected candidate below has an exact live CLIC receipt; the original BOQ is not that accepted manifest.
**Quantitative Confidence Score**: `0.74 / 1.00` (model confidence; not a portal certification)  

---

## Corrected configuration — live vendor receipt

CLIC accepted at **2026-09-22T18:07:43.869Z**: zero unbuildables, errors, warnings and process-control issues. Live OCA list total: **$61,929 USD**. This is list pricing, not a discounted commercial quote.

| SKU | Qty | Unit list USD | Extended USD |
|---|---:|---:|---:|
| R7R97A | 1 | 19,746 | 19,746 |
| R7M09A | 2 | 19,950 | 39,900 |
| QK735A | 8 | 195 | 1,560 |
| HA113A1 | 1 | 0 | 0 |
| HA113A1 5GA | 1 | 537 | 537 |
| HU4B3A3 | 1 | 0 | 0 |
| HU4B3A3 ZTL | 1 | 186 | 186 |

Removed redundant optics: R6W26A. Base and two upgrade kits supply 24 optics for 24 licensed ports.

User-requested support change: HU4A6A5, HU4A6A5 ZTL, HA113A1, HA113A1 5GA replaced by product-qualified 3-year Basic support and the requested installation service. Retention is DMR. Each service remains scoped to its owning icon; both apply-to-all controls were off.

Receipt artifacts: [CLIC response](evidence/clic_corrected_configuration.json), [complete solution BOM](evidence/clic_corrected_bom.json).

## 📋 1. Baseline Items Before Optics Correction (8)

| # | Product # (SKU) | Total Order Qty | Description | Est. Unit Price (USD) | Extended Price (USD) |
|---|---|---|---|---|---|
| 1 | `R7R97A` | 1 | HPE SN3600B 32Gb 24/8 8-port 32Gb Short Wave SFP28 Fibre Channel Switch | $19,746 | $19,746 |
| 2 | `R6W26A` | 1 | HPE B-series 32Gb SFP28 Short Wave 8-pack Secure Transceiver | $19,567 | $19,567 |
| 3 | `R7M09A` | 2 | HPE SN3600B 32Gb 8-port Short Wave SFP28 Fibre Channel Upgrade License with Transceiver Kit | $19,950 | $39,900 |
| 4 | `QK735A` | 8 | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 15m Cable | $195 | $1,560 |
| 5 | `HA113A1` | 1 | HPE Installation Service | $0 | $0 |
| 6 | `HA113A1 5GA` | 1 | HPE LowEnd SAN/Edge Switch/HAFM Inst SVC | $537 | $537 |
| 7 | `HU4B3A3` | 1 | HPE 3Y Tech Care Basic with Defective Media Retention Service | $0 | $0 |
| 8 | `HU4B3A3 ZTL` | 1 | HPE SN3600B 24/8 8p 32G Swch Support | $186 | $186 |

**Current Baseline BOM Total**: `$81,496 USD`

---

## ⚡ 2. Modular 4-Aspect Physical Pre-Checks

Validation domain: **networking**. Scope: **SINGLE_PRODUCT**.

- **Aspect 1: SAN Licensed Port Capacity**: ✅ PASS — 24 licensed ports / 24 physical ports.
- **Aspect 2: Bundled Optics Billing**: WARN — 24 included optics + 8 separately ordered optics; 8 beyond switch port demand. Spares and remote endpoints require separate allocation.
- **Aspect 3: Catalog and Service Coverage**: ✅ PASS — Scoped hardware and product-qualified services verified; corrected candidate matches the complete live CLIC receipt.
- **Aspect 4: Server Component Rules**: NOT_APPLICABLE — Fixed SAN switch: no server CPU, DIMM, diskless kit, PCIe riser or redundant server PSU additions.

## SAN Configuration Scope

Fixed Fibre Channel switch; server CPU, memory, drive and riser rules do not apply. Bundle composition is verified against retained official evidence. The corrected candidate above matches the live CLIC receipt.

---

## 💰 3. Budget-Constrained Optimization & Golden Rule Assurance

ℹ️ No budget constraint provided — showing the baseline cost before optics correction; the accepted corrected total is shown above.

- **Baseline Cost Before Optics Correction**: `$81,496 USD` (Includes the redundant optics pack; exclude it from the corrected order)
---

## 🤖 4. Gemini Notebook RAG Status

**Separate agentic model review:** advisory returned by gemini-3.5-flash-lite; 7 recovery events. This advisory is separate from NotebookLM source validation and vendor acceptance.

### Pre-Flight Grounded Physical Validation Matrix (NOTEBOOK_LM_CLOUD)

> ℹ️ **Knowledge Source**: `NOTEBOOK_LM_CLOUD` (Active Cloud Sources: 41012991-4c8a-48d8-a024-bb6dc33f5037, f8a8d8f1-8f5e-4458-85e9-a6fc89f2ad62)  
> ⏱️ **Synthesis Time Taken**: `0m 51s (51594ms)`

The hardware configuration rules, physical cable requirements, and QuickSpecs specifications for the **HPE SAN3600B Fibre Channel Switch** are outlined below:

---

### **1. Hardware Configuration & Switch Models**

* **Form Factor & Capacity:** The SN3600B is a **1U entry-level switch** featuring a maximum of **24 Fibre Channel SFP+ ports** [1-3].
* **Ports on Demand (PoD) Scaling:** Switches can start with as few as **8 active ports** and scale up in **8-port increments** up to 24 ports using PoD upgrade licenses [1, 4, 5].
  * **16Gb 8-port PoD Upgrade Kit:** `R7M10A` (includes license + 8x 16Gb SW optics) [6].
  * **32Gb 8-port PoD Upgrade Kit:** `R7M09A` (includes license + 8x 32Gb SW optics) [6].
* **Base Configuration Models:**
  * **`R4G55B`:** SN3600B 32Gb 24/8 Switch (8 active ports, 8x 16Gb Short Wave SFP+ transceivers) [7, 8].
  * **`R7R97A`:** SN3600B 32Gb 24/8 Switch (8 active ports, 8x 32Gb Short Wave SFP28 transceivers) [7, 9].
  * **`R8P29A`:** SN3600B 32Gb 24/24 Power Pack+ Switch (24 active ports, 24x 16Gb Short Wave SFP+ transceivers) [7, 10].
  * **`R8P28A`:** SN3600B 32Gb 24/24 Power Pack+ Switch (24 active ports, 24x 32Gb Short Wave SFP28 transceivers) [7, 10].
  * **Warranty Note:** Model numbers ending in "B" include a **Lifetime Warranty**, whereas older "A" models carry a standard 1-1-1 warranty [9, 11].
* **Power Supply & Airflow Constraints:**
  * Contains a **single fixed power supply** with **4 integrated fans** (a minimum of 2 working fans is required for continuous operation) [12, 13].
  * Supports **back-to-front airflow only** (non-port-side intake) [14, 15].
* **OCA Catalog Configuration Validation Rules:**
  * **CTO Base SKU:** `R7R97A` serves as the primary CTO chassis identifier [16].
  * **Error Attribution:** Rule 81039677 multi-icon errors must be resolved by targeting child container icons rather than modifying root BOM items [17].
  * **Session Recovery:** In case of OCA session errors ("encountered a problem"), re-authenticate via the Partner Portal and launch One Config Advanced through Quick Links rather than refreshing the failed tab [17].

---

### **2. Physical Cable & Optical Transceiver Requirements**

* **Connector Standard:** SFP+ ports requiring **LC optical connectors** [18].
* **Auto-Negotiation Capabilities:**
  * **32Gb Transceivers:** Auto-negotiate down to **32Gbps, 16Gbps, or 8Gbps** [3].
  * **16Gb Transceivers:** Auto-negotiate down to **16Gbps, 8Gbps, or 4Gbps** [3].
* **Cable Distance Limits by Speed & Fiber Type:**
  * **At 32 Gbps Speed:**
    * **HPE Standard OM3:** Up to **70 meters** [19].
    * **HPE PremierFlex OM3+:** Up to **70 meters** [19].
    * **HPE PremierFlex OM4:** Up to **100 meters** [19].
  * **At 16 Gbps Speed:**
    * **HPE Standard OM3:** Up to **100 meters** [19].
    * **HPE PremierFlex OM3+:** Up to **100 meters** [19].
    * **HPE PremierFlex OM4:** Up to **125 meters** [19].
* **Supported Cable SKUs:**
  * **PremierFlex OM4 LC/LC 2-Fiber Cables:** 1m (`QK732A`), 2m (`QK733A`), 5m (`QK734A`), 15m (`QK735A`), 30m (`QK736A`), 50m (`QK737A`) [20, 21].
  * **Standard OM3 LC/LC Cables:** 0.5m (`AJ833A`), 1m (`AJ834A`), 2m (`AJ835A`), 5m (`AJ836A`), 15m (`AJ837A`), 30m (`AJ838A`), 50m (`AJ839A`) [22, 23].
  * **MPO Splitter & QSFP Options:** MPO8 to 4xLC OM4 Splitters (`K2Q46A`, `K2Q47A`, `Q1H68A`) and MPO12 cables (`QK729A`, `QK731A`, `H6Z30A`) [21, 22].

---

### **3. QuickSpecs Technical Specifications**

* **Performance & Latency:**
  * **Port Bandwidth:** 32 Gbps Fibre Channel [24, 25].
  * **Aggregate Bandwidth:** **768 Gbps** end-to-end full duplex [1, 24, 25].
  * **Switch Latency:** **<900 nanoseconds** port-to-port cut-through switching at 32 Gbps (including FEC) [14, 25].
  * **ISL Trunking:** Groups up to eight 32 Gbps ports into a single logical trunk providing up to **256 Gbps bandwidth (512 Gbps full duplex)** [14, 25, 26].
* **Port Types & Management Interfaces:**
  * **FC Port Types:** F_Port, E_Port, M_Port, and D_Port (ClearLink Diagnostic Port) [5, 25, 26].
  * **Access Gateway Mode:** Configured by default to 16 F_Ports and 8 N_Ports (NPIV-enabled) [5, 25].
  * **Management Interfaces:** 1x 10/100/1000 Mb Ethernet (RJ-45) out-of-band port, 1x RS232 serial console port (RJ-45), and 1x USB port for firmware/log downloads [18, 27, 28].
* **Physical & Environmental Specifications:**
  * **Dimensions:** Width: 42.88 mm (16.88 in.), Height: 4.29 mm (1.69 in.), Depth: 30.66 mm (12.07 in.) [15].
  * **Weight:** **5.76 kg (12.65 lb)** without transceivers [15].
  * **Power Consumption:** **76.52 W** maximum (all 24 ports populated with 32 Gbps SWL optics) / **55.83 W** idle [13, 29].
  * **Operating Environment:** 0°C to 40°C (32°F to 104°F); 10% to 85% non-condensing humidity [15].

---

💡 Would you like me to compare the SN3600B against other Fibre Channel switch models (such as the SN6600B or SN3000B), or compile a complete bill of materials for a specific port count?

#### Physical Validation Summary (Local Rules Engine)
- **Errors Identified**: 0 critical physical violation(s)
- **Warnings Identified**: 1 physical warning(s)
- **Quantitative Confidence Score**: 0.74 / 1.00

#### Physical Validation Actions:
- ✅ No critical physical violations detected in input BOQ.
- ⚠️ Advisory: Bundle billing review: R7R97A and its upgrade kits already supply 24 optics for 24 licensed ports. Separate optics add 8, leaving 8 beyond switch port demand. Remove redundant packs only when allocated to those same switch ports; retain documented spares, replacements or remote-endpoint optics. Source: 41012991-4c8a-48d8-a024-bb6dc33f5037, Configuration Information: Step 1 Base Configuration; Step 2 Options; Port On Demand Kits; Key Features and Benefits.

---

## 📁 5. Certified Deliverables & Generated Workbooks

> **Direct Access**: Open the deliverables below. Keep the report and its output folders together when moving between computers; a web viewer may download workbooks instead of opening a desktop application:

| Deliverable Type | Clickable Deliverable Link | Format | Purpose |
|---|---|---|---|
| **Executive Evaluation Report** | [customer_evaluation.md](customer_evaluation.md) | `Markdown (.md)` | Pre-flight engineering audit, 7 physical aspect pre-checks & BOM validation |
| **Multi-Rank Strategy Matrix** | [Config2_SN3600B_FC_Switch_EVALUATED_BOQ_Evaluated BOQ_MultiRank_Solutions.xlsx](Config2_SN3600B_FC_Switch_EVALUATED_BOQ_Evaluated%20BOQ_MultiRank_Solutions.xlsx) | `Excel (.xlsx)` | 5-Tier Strategy Matrix (Rank 1A, 1B, 1L, Rank 2, Rank 5) |
| **Token-Dense Solution BOM** | [Config2_SN3600B_FC_Switch_EVALUATED_BOQ_Evaluated BOQ_MultiRank_Solutions.csv](Config2_SN3600B_FC_Switch_EVALUATED_BOQ_Evaluated%20BOQ_MultiRank_Solutions.csv) | `CSV (.csv)` | Dense tabular SKU itemization formatted for rapid LLM reasoning |
| **Customer Sizing Proposal** | [Config2_SN3600B_FC_Switch_EVALUATED_BOQ_Evaluated BOQ_Proposal.xlsx](Config2_SN3600B_FC_Switch_EVALUATED_BOQ_Evaluated%20BOQ_Proposal.xlsx) | `Excel (.xlsx)` | Client-facing presentation workbook with commercial summary |
| **Partner Portal Upload Sheet** | [Config2_SN3600B_FC_Switch_EVALUATED_BOQ_Evaluated BOQ_Partner_Portal.xlsx](Config2_SN3600B_FC_Switch_EVALUATED_BOQ_Evaluated%20BOQ_Partner_Portal.xlsx) | `Excel (.xlsx)` | Standardized 7-column OCA/CLIC format with subtotals and 2-line gaps |
| **Evidence Ledger Summary** | [evidence_summary_TRC-1790169853196-1D9CB0.md](evidence/evidence_summary_TRC-1790169853196-1D9CB0.md) | `Markdown (.md)` | 9-Phase cryptographic non-repudiation audit summary |

---

*Report generated automatically by HPE BOQ Evaluation Engine.*  
