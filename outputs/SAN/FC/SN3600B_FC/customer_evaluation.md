# HPE Pre-Flight BOQ Evaluation & Validation Report

**Target BOQ File**: `C:/Users/latha/Downloads/Config2_SN3600B_FC_Switch_EVALUATED_BOQ.xlsx`  
**Target Gemini Notebook**: SN3600B FC Notebook (`d7f84352-1cdb-4842-84ca-39d2a10b91eb`)  
**Evaluation Date**: 2026-09-22T13:06:25.686Z  
**Quantity basis**: Physical validation and category figures describe 1 base configuration; requested configurations: 1. Order-level rows retain their own quantities. The corrected candidate below has an exact live CLIC receipt; the original BOQ is not that accepted manifest.
**Quantitative Confidence Score**: `0.74 / 1.00` (model confidence; not a portal certification)  

---

## Corrected configuration — live vendor receipt

CLIC accepted at **2026-09-22T07:58:17.037Z**: zero unbuildables, errors, warnings and process-control issues. Live OCA list total: **$62,636 USD**. This is list pricing, not a discounted commercial quote.

| SKU | Qty | Unit list USD | Extended USD |
|---|---:|---:|---:|
| R7R97A | 1 | 19,746 | 19,746 |
| R7M09A | 2 | 19,950 | 39,900 |
| QK735A | 8 | 195 | 1,560 |
| HX2M2E | 1 | 950 | 950 |
| U5988E | 1 | 480 | 480 |

Removed redundant optics: R6W26A. Base and two upgrade kits supply 24 optics for 24 licensed ports.

User-requested support change: HU4A6A5, HU4A6A5 ZTL, HA113A1, HA113A1 5GA replaced by product-qualified 3-year Basic support and the requested installation service. Retention is CDMR as labelled by OCA. Each service remains scoped to its owning icon; both apply-to-all controls were off.

Receipt artifacts: [CLIC response](evidence/clic_corrected_configuration.json), [complete solution BOM](evidence/clic_corrected_bom.json).

## 📋 1. Baseline Items Before Optics Correction (6)

| # | Product # (SKU) | Total Order Qty | Description | Est. Unit Price (USD) | Extended Price (USD) |
|---|---|---|---|---|---|
| 1 | `R7R97A` | 1 | HPE SN3600B 32Gb 24/8 8-port 32Gb Short Wave SFP28 Fibre Channel Switch | $19,746 | $19,746 |
| 2 | `R6W26A` | 1 | HPE B-series 32Gb SFP28 Short Wave 8-pack Secure Transceiver | $19,567 | $19,567 |
| 3 | `R7M09A` | 2 | HPE SN3600B 32Gb 8-port Short Wave SFP28 Fibre Channel Upgrade License with Transceiver Kit | $19,950 | $39,900 |
| 4 | `QK735A` | 8 | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 15m Cable | $195 | $1,560 |
| 5 | `HX2M2E` | 1 | HPE 3 Year Tech Care Basic wCDMR SN3600B 24/8 8p 32Gb SW SFP Switch Service | $950 | $950 |
| 6 | `U5988E` | 1 | HPE Installation Storage Switches Service | $480 | $480 |

**Current Baseline BOM Total**: `$82,203 USD`

---

## ⚡ 2. Modular 4-Aspect Physical Pre-Checks

- **Aspect 1: SAN Licensed Port Capacity**: ✅ PASS — 24 licensed ports / 24 physical ports.
- **Aspect 2: Bundled Optics Billing**: WARN — 24 included optics + 8 separately ordered optics; 8 beyond switch port demand. Spares and remote endpoints require separate allocation.
- **Aspect 3: Catalog and Service Coverage**: ✅ PASS — Scoped hardware and product-qualified services verified; corrected candidate matches the complete live CLIC receipt.
- **Aspect 4: Server Component Rules**: NOT_APPLICABLE — Fixed SAN switch: no server CPU, DIMM, diskless kit, PCIe riser or redundant server PSU additions.

## SAN Configuration Scope

Fixed Fibre Channel switch; server CPU, memory, drive and riser rules do not apply. Bundle composition is verified against retained official evidence. The corrected candidate above matches the live CLIC receipt.

---

## 💰 3. Budget-Constrained Optimization & Golden Rule Assurance

ℹ️ No budget constraint provided — showing the baseline cost before optics correction; the accepted corrected total is shown above.

- **Baseline Cost Before Optics Correction**: `$82,203 USD` (Includes the redundant optics pack; exclude it from the corrected order)
---

## 🤖 4. Gemini Notebook RAG Status

**Separate agentic model review:** unavailable (provider error). This is not a successful independent model review; NotebookLM document grounding and live CLIC acceptance are reported separately.

### Pre-Flight Grounded Physical Validation Matrix (NOTEBOOK_LM_CLOUD)

> ℹ️ **Knowledge Source**: `NOTEBOOK_LM_CLOUD` (Active Cloud Sources: 9014856e-796e-4f66-bbe0-5937254826dc, 41012991-4c8a-48d8-a024-bb6dc33f5037)  
> ⏱️ **Synthesis Time Taken**: `0m 39s (39350ms)`

### Hardware Configuration & Licensing Rules

* **Chassis & Scalability**: The HPE SN3600B FC is an entry-level **1U rack-mount switch** (CTO Base SKU: **R7R97A**) offering up to 24 Fibre Channel ports [1-3].
* **Ports on Demand (PoD) Licensing**: The base switch ships enabled with **8 active ports** and scales to 16 or 24 ports via **8-port upgrade kits** [2, 4, 5]. Upgrade kits (e.g., SKU **R7M09A** for 32Gb, **R7M10A** for 16Gb) include both the software PoD license and 8 physical secure optics under a single part number [6, 7].
* **Inter-Switch Link (ISL) Trunking**: Supports combining up to **8 Fibre Channel ports** into a single logical trunk delivering up to **256 Gbps bandwidth (512 Gbps full-duplex)** [8-10]. Physical ports are organized into three dedicated trunk groups: **Group 0** (ports 0–7), **Group 1** (ports 8–15), and **Group 2** (ports 16–23) [11].
* **Supported Port Types**: Operates as **F_Port, E_Port, M_Port, and D_Port** (ClearLink Diagnostic Port) in standard switch mode, and supports **F_Port / NPIV-enabled N_Port** in Access Gateway mode [5, 8, 10].
* **Power & Cooling Rules**:
  * Utilizes a single, **integrated fixed power supply** with four built-in cooling fans [12, 13]. A **minimum of 2 functional fans** is required for continuous system operation [12].
  * Strictly supports **Back-to-front airflow** (non-port-side intake) [3, 9].
* **HPE Catalog & Ordering Rules**:
  * Multi-icon validation errors (e.g., Rule 81039677) must trace directly to individual child containers rather than altering root BOM items [14].
  * Support services must be isolated per icon container (no cross-broadcasting) [14].
  * Default solutions use a **3-Year HPE Tech Care Basic** agreement (SKU **HX2M2E** with CDMR) [1, 14].

---

### Physical Cable & Optic Requirements

* **Optics & Connectors**: Requires hot-pluggable **SFP+ (16Gb) or SFP28 (32Gb)** transceivers utilizing standard **LC optical connectors** [15, 16]. Both Short Wave (SWL) and Long Wave (LWL / ELWL) secure optics are supported [15, 16].
* **Speed Auto-Negotiation**:
  * **32 Gbps optical transceivers** autonegotiate to **32 Gbps, 16 Gbps, or 8 Gbps** [17].
  * **16 Gbps optical transceivers** autonegotiate to **16 Gbps, 8 Gbps, or 4 Gbps** [17].
* **Cabling & Maximum Distance Matrix**:
  * **32 Gbps Performance**:
    * **HPE Standard OM3 Cable**: Up to **70 meters** [18].
    * **HPE PremierFlex OM3+ Cable**: Up to **70 meters** [18].
    * **HPE PremierFlex OM4 Cable**: Up to **100 meters** [18].
  * **16 Gbps Performance**:
    * **HPE Standard OM3 Cable**: Up to **100 meters** [18].
    * **HPE PremierFlex OM3+ Cable**: Up to **100 meters** [18].
    * **HPE PremierFlex OM4 Cable**: Up to **125 meters** [18].
* **Supported Cable Options**: Compatible with LC-to-LC Multi-mode OM3 cables (SKUs AJ833A–AJ839A), LC-to-LC Multi-mode OM4 PremierFlex cables (SKUs QK732A–QK736A), MPO/QSFP PremierFlex cables, and MPO to 4xLC splitter cables [19-22].

---

### QuickSpecs Hardware & Technical Specifications

* **Switch Base Models**:
  * **R4G55B**: SN3600B 32Gb 24/8 8-port 16Gb Short Wave SFP+ Switch (Includes Lifetime Warranty) [4, 23, 24].
  * **R7R97A**: SN3600B 32Gb 24/8 8-port 32Gb Short Wave SFP28 Switch (Includes Lifetime Warranty) [23, 24].
  * **R8P29A**: SN3600B 32Gb 24/24 Power Pack+ 24-port 16Gb Short Wave SFP+ Switch (Includes Lifetime Warranty) [23, 25].
  * **R8P28A**: SN3600B 32Gb 24/24 Power Pack+ 24-port 32Gb Short Wave SFP28 Switch (Includes Lifetime Warranty) [23, 25].
* **Performance & Fabric Capacity**:
  * **Aggregate Bandwidth**: **768 Gbps** end-to-end full duplex [9, 10, 26].
  * **Latency**: **<900 nanoseconds** local port-to-port cut-through latency at 32 Gbps [9, 10].
  * **Frame Buffers**: **2,000** dynamically allocated frame buffers [10].
* **Physical Dimensions & Weight**:
  * **Form Factor**: **1U** height [2, 3, 27].
  * **Dimensions**: Height: 4.29 cm (1.69 in.) × Width: 42.88 cm (16.88 in.) × Depth: 30.66 cm (12.07 in.) [3].
  * **Weight**: **5.76 kg (12.65 lb)** with single integrated power supply (without transceivers) [3].
* **Power & Thermal Specifications**:
  * **AC Input**: 90 V to 264 V AC (Nominal 100–240 VAC, 50/60 Hz), Maximum input current **2.2 A** [13].
  * **Power Consumption**: **76.52 W** max (all 24 ports populated with 32 Gbps SWL optics); **55.83 W** idle [13].
  * **Heat Dissipation**: **215 BTU/hr** @ 100 VAC typical (209.56 BTU/hr @ 200 VAC typical) [13].
* **Management & External Interfaces**:
  * **Network Management**: 1× 10/100/1000 Mbps Ethernet port (RJ-45) [11, 28].
  * **Console / Maintenance**: 1× RS232 Serial console port (RJ-45) and 1× USB port for system log downloads or firmware upgrades [11, 16, 28].
  * **Front Panel Indicators**: Switch ID pull-out tab, System status LED, System power LED, and individual SFP+ port status LEDs [11].
* **Software Capabilities**:
  * **Standard Software**: Advanced Fabric OS, Advanced Web Tools, Advanced Zoning, Access Gateway mode, Smart SAN for 3PAR/Primera support, VM Insight (VMID), and NVMe over Fabrics support [2, 4, 6, 8, 29, 30].
  * **Power Pack+ Bundle** (Optional or included on select models): Adds Fabric Vision software, ISL Trunking, and Extended Fabric [31, 32].

💡 *Would you like me to generate a tailored report or compare these SN3600B specifications directly against other HPE B-series switches (like the SN3000B or SN6600B)?*

#### Physical Validation Summary (Local Rules Engine)
- **Errors Identified**: 0 critical physical violation(s)
- **Warnings Identified**: 1 physical warning(s)
- **Quantitative Confidence Score**: 0.74 / 1.00

#### Physical Validation Actions:
- ✅ No critical physical violations detected in input BOQ.
- ⚠️ Advisory: Bundle billing review: R7R97A and its upgrade kits already supply 24 optics for 24 licensed ports. Separate optics add 8, leaving 8 beyond switch port demand. Remove redundant packs only when allocated to those same switch ports; retain documented spares, replacements or remote-endpoint optics. Source: 41012991-4c8a-48d8-a024-bb6dc33f5037, Configuration Information: Step 1 Base Configuration; Step 2 Options; Port On Demand Kits; Key Features and Benefits.

---

## 📁 5. Certified Deliverables & Generated Workbooks

> **Direct Access**: Click any local deliverable link below to open directly in your native viewer without navigating nested directories:

| Deliverable Type | Clickable Deliverable Link | Format | Purpose |
|---|---|---|---|
| **Executive Evaluation Report** | [customer_evaluation.md](file:///C:/Users/latha/.gemini/antigravity/scratch/antigravityProjects/updatedVendorScrapingNotebook-v2/outputs/SAN/FC/SN3600B_FC/customer_evaluation.md) | `Markdown (.md)` | Pre-flight engineering audit, 7 physical aspect pre-checks & BOM validation |
| **Multi-Rank Strategy Matrix** | [Config2_SN3600B_FC_Switch_EVALUATED_BOQ_Evaluated BOQ_MultiRank_Solutions.xlsx](file:///C:/Users/latha/.gemini/antigravity/scratch/antigravityProjects/updatedVendorScrapingNotebook-v2/outputs/SAN/FC/SN3600B_FC/Config2_SN3600B_FC_Switch_EVALUATED_BOQ_Evaluated BOQ_MultiRank_Solutions.xlsx) | `Excel (.xlsx)` | 5-Tier Strategy Matrix (Rank 1A, 1B, 1L, Rank 2, Rank 5) |
| **Token-Dense Solution BOM** | [Config2_SN3600B_FC_Switch_EVALUATED_BOQ_Evaluated BOQ_MultiRank_Solutions.csv](file:///C:/Users/latha/.gemini/antigravity/scratch/antigravityProjects/updatedVendorScrapingNotebook-v2/outputs/SAN/FC/SN3600B_FC/Config2_SN3600B_FC_Switch_EVALUATED_BOQ_Evaluated BOQ_MultiRank_Solutions.csv) | `CSV (.csv)` | Dense tabular SKU itemization formatted for rapid LLM reasoning |
| **Customer Sizing Proposal** | [Config2_SN3600B_FC_Switch_EVALUATED_BOQ_Evaluated BOQ_Proposal.xlsx](file:///C:/Users/latha/.gemini/antigravity/scratch/antigravityProjects/updatedVendorScrapingNotebook-v2/outputs/SAN/FC/SN3600B_FC/Config2_SN3600B_FC_Switch_EVALUATED_BOQ_Evaluated BOQ_Proposal.xlsx) | `Excel (.xlsx)` | Client-facing presentation workbook with commercial summary |
| **Partner Portal Upload Sheet** | [Config2_SN3600B_FC_Switch_EVALUATED_BOQ_Evaluated BOQ_Partner_Portal.xlsx](file:///C:/Users/latha/.gemini/antigravity/scratch/antigravityProjects/updatedVendorScrapingNotebook-v2/outputs/SAN/FC/SN3600B_FC/Config2_SN3600B_FC_Switch_EVALUATED_BOQ_Evaluated BOQ_Partner_Portal.xlsx) | `Excel (.xlsx)` | Standardized 7-column OCA/CLIC format with subtotals and 2-line gaps |
| **Evidence Ledger Summary** | [evidence_summary_TRC-1790082194547-FF7ABF.md](file:///C:/Users/latha/.gemini/antigravity/scratch/antigravityProjects/updatedVendorScrapingNotebook-v2/outputs/history/evidence_logs/evidence_summary_TRC-1790082194547-FF7ABF.md) | `Markdown (.md)` | 9-Phase cryptographic non-repudiation audit summary |

---

*Report generated automatically by HPE BOQ Evaluation Engine.*  
