# Bill of Quantities (BOQ) Reconciliation & Verification Report

**Configuration Name:** `HPE_Hybrid_3xFrm_36xSY480G12_15xDL380G12_100GbE_64GFC`  
**Solution UCID:** `5155640958-01`  
**Configuration Type:** Hybrid Enterprise Infrastructure (3× Synergy 12000 Frames + 15× ProLiant DL380 Gen12)  
**CLIC Validation Status:** **PASSED** (0 Blocking Errors, 0 Unbuildable Conditions)  

---

## 1. Executive Summary & Financial Overview

A line-by-line verification between the **Original Customer Request BOQ** (`HPE 15 3.1.xlsx`) and the **Validated OCA Configuration** (`HPE_Hybrid_3xFrm_36xSY480G12_15xDL380G12_100GbE_64GFC_5155640958-01 (3).xlsx`) confirms:

* **Hardware Bill of Materials:** **100% Identical**. All 94 physical SKUs—including processors, memory kits, drive cages, NVMe/SAS drives, Smart Array/Boot controllers, mezzanine cards, network adapters, transceivers, and DAC/fiber cabling—match the customer's intended physical BOM.
* **Services & Support Contract:** Fully restructured and corrected. The original BOQ contained severe over-billing for deployment services and under-licensing of fabric interconnect support, triggering factory CLIC rule violations.
* **Financial Summary (List Price):**
  * **Compute & Fabric Hardware:** $5,297,472.00 USD
  * **Support & Deployment Services:** $254,299.00 USD
  * **Total Solution List Price:** **$5,551,771.00 USD**

---

## 2. Customer Mistakes & Discrepancies Resolved

| Product # | Description | Orig BOQ Qty | Validated Qty | Delta | Root Cause & Resolution |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **`HA124A1#V0F`** | Synergy First Frame Remote Startup | 3 | 0 | -3 | **Customer Error (Over-billing / Delivery Conflict):** SOW conflict. Quoting remote startup alongside onsite startup creates duplicate charges for the same scope. Removed. |
| **`HA124A1#5ZM`** | Synergy First Frame Onsite Startup | 3 | 1 | -2 | **Customer Error (Over-billing):** A multi-frame cluster has exactly **one** primary management domain / first frame. Reduced from 3 to 1. |
| **`HA124A1#5ZQ`** | Synergy Additional Frame Onsite Startup | 3 | 2 | -1 | **Customer Error (Over-billing):** In a 3-frame fabric, exactly 2 expansion frames link to the initial frame. Adjusted to 2 to properly balance 1 First + 2 Additional = 3 Frames. |
| **`HU4B2A3#Z1Q`** | Synergy Composer2 3Y Tech Care Basic | 3 | 6 | +3 | **Customer Error (Under-licensing / Rule 99916599):** The physical BOM orders 6× Composer2 appliances (`872957-B21`), but only 3 support units were quoted. Sized to 6 for 1:1 entitlement. |
| **`HU4B2A3#Z1R`** | Synergy VC SE 100Gb F32 Module 3Y Support | 3 | 6 | +3 | **Customer Error (Under-licensing / Rule 99916598):** The physical BOM orders 6× VC 100Gb modules (`867796-B21`), but only 3 support units were quoted. Sized to 6 for 1:1 entitlement. |
| **`HU4B2A30BU5`** | Brocade 64G FC Switch Module 3Y Support | 3 | 6 | +3 | **Customer Error (Under-licensing):** Sized from 3 to 6 to provide 1:1 hardware warranty coverage for all 6 physical Brocade SAN fabric switches (`P77653-B21`). |
| **`HU4B2A30C4V`** | HPE DL380 Gen12 3Y Tech Care Basic | 0 | 15 | +15 | **Customer Error (Missing Contract):** The original request omitted ongoing hardware warranty support on the 15 rack servers entirely. Added 15× 3Y Tech Care Basic. |

---

## 3. Physical Hardware Baseline (Verified 100% Match)

### Architecture Tier 1: 15× HPE ProLiant DL380 Gen12 Rack Servers
* **Base CTO Server:** 15× `P73282-B21` (HPE DL380 Gen12 SFF NC CTO Server)
* **Compute:** 30× `P74571-B21` (Intel Xeon 6530P 2.3GHz 32C 225W) + 30× High Performance Heatsinks (`P74792-B21`) + 15× High Performance Fan Kits (`P48820-B21`)
* **Memory:** 30× `P69726-F21` (16GB 1Rx8 DDR5-6400 Smart FIO Kit — 32GB RAM per node)
* **Storage & Controller:**
  * 15× `P75740-B21` (8SFF x1 U.3 Tri-Mode Drive Cage Kit)
  * 60× `P28352-B21` (2.4TB SAS 12G 10K SFF BC HDD — 4 drives per server)
  * 15× `P58335-B21` (HPE MR408i-o Gen11 SPDM Storage Controller) + 15× 96W Smart Storage Battery (`P01366-B21`)
  * 15× `P78279-B21` (HPE NS204i-u V2 Hot Plug NVMe Boot Option Device)
* **Networking & SAN:**
  * 15× `P26259-B21` (Broadcom BCM57412 10Gb 2-port SFP+ Adapter) + 30× 10G SFP+ SR Transceivers (`455883-B21`)
  * 15× `P51181-B21` (Broadcom BCM5719 1Gb 4-port BASE-T OCP3 Adapter)
  * 15× `R2E09A` (HPE SN1610Q 32Gb 2-port Fibre Channel HBA)
* **Chassis Infrastructure:** 30× 1000W Titanium Hot Plug PSUs (`P03178-B21`), Rail Kits (`P52341-B21`), Security Bezels (`P50400-B21`)
* **Software:** 15× `P8B31A` (HPE OneView w/o iLO 3yr 24x7 LTU)

### Architecture Tier 2: HPE Synergy Composable Fabric (3× Frames, 36× Nodes)
* **Chassis & Management Infrastructure:**
  * 3× `P51174-B21` (HPE Synergy 12000 CTO Frames)
  * 6× `876852-B21` (Synergy 4-port Frame Link Modules)
  * 6× `872957-B21` (Synergy Composer2 Management Appliances)
  * 30× `P51175-B21` (Synergy High Capacity Fans)
  * 36× `P44712-B21` (1800W–2200W Titanium Hot Plug PSUs) + 18× Dual Slot PS Adapters (`P44074-B21`)
* **Compute Modules (36× HPE SY480 Gen12):**
  * 36× `P68217-B21` (HPE SY480 Gen12 CTO Compute Module)
  * 72× `P73837-B21` (Intel Xeon 6787P Processors) + Heatsink Kits (`P68225-B21` / `P68226-B21`)
  * 72× `P69726-F21` (16GB 1Rx8 DDR5-6400 Smart FIO Kit — 32GB RAM per node)
  * 36× `P68222-B21` (Drive-less Front Cage Kit)
  * 36× `P68340-B21` (Synergy NS204i-d v2 NVMe Boot Device) + 72× 960GB M.2 NVMe SSDs (`P80321-B21`)
  * 36× `P64724-B21` (Synergy 6310C 25/50Gb Ethernet Adapter)
  * 36× `P68131-B21` (Synergy 7330C 64Gb FC Mezzanine HBA)
* **Interconnect Modules & Optics:**
  * 6× `867796-B21` (HPE Virtual Connect SE 100Gb F32 Module)
  * 6× `P77653-B21` (Brocade 64Gb FC Switch Module)
  * Optics: 18× 100Gb QSFP28 SR1.2 BiDi (`P90358-B21`), 6× 100GE/4x25GE/4x32GFC Transceivers (`882251-B21`), 6× 10G SFP+ SR (`455883-B21`)
  * Cabling: 9× 100Gb QSFP28 3m DACs (`845406-B21`), 18× MPO8/4xLC 5m cables (`K2Q46A`), 30× LC/LC OM4 5m cables (`QK734A`)

---

## 4. Final Validated Services Breakdown

| SKU / Product | Description | Qty | Unit Price (USD) | Extended Price (USD) |
| :--- | :--- | :---: | :---: | :---: |
| **`HU4B2A3`** | HPE 3Y Tech Care Basic Service (Base) | 2 | $0.00 | $0.00 |
| **`HU4B2A30C4V`** | HPE DL380 Gen12 Support | 15 | $5,509.00 | $82,635.00 |
| **`HU4B2A3#WJN`** | HPE Synergy 1200 Frame Support | 3 | $742.00 | $2,226.00 |
| **`HU4B2A3#Z1Q`** | HPE Synergy Composer2 Support | 6 | $297.00 | $1,782.00 |
| **`HU4B2A3#Z1R`** | HPE Synergy VC SE 100Gb F32 Module Support | 6 | $774.00 | $4,644.00 |
| **`HU4B2A30BT7`** | HPE SY480 Gen12 Support | 36 | $3,330.00 | $119,880.00 |
| **`HU4B2A30BU5`** | HPE Brocade 64G Switch Module Support | 6 | $1,656.00 | $9,936.00 |
| **`HA124A1`** | HPE Technical Installation Startup SVC (Base) | 1 | $0.00 | $0.00 |
| **`HA124A1#5ZM`** | HPE Synergy First Frame Onsite Startup | 1 | $16,742.00 | $16,742.00 |
| **`HA124A1#5ZQ`** | HPE Synergy Additional Frame Onsite Startup | 2 | $4,627.00 | $9,254.00 |
| **`P8B31A`** | HPE OneView w/o iLO 3Y 24x7 LTU (Rack) | 15 | $480.00 | $7,200.00 |
| **Total Services & Licenses** | | | | **$254,299.00** |
"""

filename = "BOQ_Reconciliation_and_Verification_Report.md"
with open(filename, "w") as f:
    f.write(md_content.strip())

print(f"File created successfully: {filename} ({len(md_content)} bytes)")


```

```text
File created successfully: BOQ_Reconciliation_and_Verification_Report.md (7142 bytes)


```

The Markdown report has been compiled and saved. You can download the complete document here:

**Download File:** [BOQ_Reconciliation_and_Verification_Report.md](https://www.google.com/search?q=code-generated-file-85f77441-443c-4997-8f30-080449d8e7a2)

Below is the full content rendered for immediate scannability:

---

# Bill of Quantities (BOQ) Reconciliation & Verification Report

**Configuration Name:** `HPE_Hybrid_3xFrm_36xSY480G12_15xDL380G12_100GbE_64GFC`

**Solution UCID:** `5155640958-01`

**Configuration Type:** Hybrid Enterprise Infrastructure (3× Synergy 12000 Frames + 15× ProLiant DL380 Gen12)

**CLIC Validation Status:** **PASSED** (0 Blocking Errors, 0 Unbuildable Conditions)

---

### 1. Executive Summary & Financial Overview

A line-by-line verification between the **Original Customer Request BOQ** (`HPE 15 3.1.xlsx`) and the **Validated OCA Configuration** (`HPE_Hybrid_3xFrm_36xSY480G12_15xDL380G12_100GbE_64GFC_5155640958-01 (3).xlsx`) confirms:

* **Hardware Bill of Materials:** **100% Identical**. All 94 physical SKUs—including processors, memory kits, drive cages, NVMe/SAS drives, Smart Array/Boot controllers, mezzanine cards, network adapters, transceivers, and DAC/fiber cabling—match the customer's intended physical BOM.
* **Services & Support Contract:** Fully restructured and corrected. The original BOQ contained severe over-billing for deployment services and under-licensing of fabric interconnect support, triggering factory CLIC rule violations.
* **Financial Summary (List Price):**
* **Compute & Fabric Hardware:** $5,297,472.00 USD
* **Support & Deployment Services:** $254,299.00 USD
* **Total Solution List Price:** **$5,551,771.00 USD**



---

### 2. Customer Mistakes & Discrepancies Resolved

| Product # | Description | Orig BOQ Qty | Validated Qty | Delta | Root Cause & Resolution |
| --- | --- | --- | --- | --- | --- |
| **`HA124A1#V0F`** | Synergy First Frame Remote Startup | 3 | 0 | -3 | **Customer Error (Over-billing / SOW Conflict):** Quoting remote startup alongside onsite startup created duplicate charges for the same initial configuration scope. Removed. |
| **`HA124A1#5ZM`** | Synergy First Frame Onsite Startup | 3 | 1 | -2 | **Customer Error (Over-billing):** A multi-frame cluster has exactly **one** primary management domain / first frame. Reduced from 3 to 1. |
| **`HA124A1#5ZQ`** | Synergy Additional Frame Onsite Startup | 3 | 2 | -1 | **Customer Error (Over-billing):** In a 3-frame fabric, exactly 2 expansion frames link to the initial frame. Adjusted to 2 to properly balance 1 First + 2 Additional = 3 Frames. |
| **`HU4B2A3#Z1Q`** | Synergy Composer2 3Y Tech Care Basic | 3 | 6 | +3 | **Customer Error (Under-licensing / Rule 99916599):** The physical BOM orders 6× Composer2 appliances (`872957-B21`), but only 3 support units were quoted. Sized to 6 for 1:1 entitlement. |
| **`HU4B2A3#Z1R`** | Synergy VC SE 100Gb F32 Module 3Y Support | 3 | 6 | +3 | **Customer Error (Under-licensing / Rule 99916598):** The physical BOM orders 6× VC 100Gb modules (`867796-B21`), but only 3 support units were quoted. Sized to 6 for 1:1 entitlement. |
| **`HU4B2A30BU5`** | Brocade 64G FC Switch Module 3Y Support | 3 | 6 | +3 | **Customer Error (Under-licensing):** Sized from 3 to 6 to provide 1:1 hardware warranty coverage for all 6 physical Brocade SAN fabric switches (`P77653-B21`). |
| **`HU4B2A30C4V`** | HPE DL380 Gen12 3Y Tech Care Basic | 0 | 15 | +15 | **Customer Error (Missing Contract):** The original request omitted ongoing hardware warranty support on the 15 rack servers entirely. Added 15× 3Y Tech Care Basic. |

---

### 3. Physical Hardware Baseline (Verified 100% Match)

**Architecture Tier 1: 15× HPE ProLiant DL380 Gen12 Rack Servers**

* **Base Chassis:** 15× `P73282-B21` (HPE DL380 Gen12 SFF NC CTO Server)
* **Compute:** 30× `P74571-B21` (Intel Xeon 6530P 2.3GHz 32C 225W) + 30× High Performance Heatsinks (`P74792-B21`) + 15× High Performance Fan Kits (`P48820-B21`)
* **Memory:** 30× `P69726-F21` (16GB 1Rx8 DDR5-6400 Smart FIO Kit — 32GB RAM per node)
* **Storage & Controller:**
* 15× `P75740-B21` (8SFF x1 U.3 Tri-Mode Drive Cage Kit)
* 60× `P28352-B21` (2.4TB SAS 12G 10K SFF BC HDD — 4 drives per server)
* 15× `P58335-B21` (HPE MR408i-o Gen11 SPDM Storage Controller) + 15× 96W Smart Storage Battery (`P01366-B21`)
* 15× `P78279-B21` (HPE NS204i-u V2 Hot Plug NVMe Boot Option Device)


* **Networking & SAN:**
* 15× `P26259-B21` (Broadcom BCM57412 10Gb 2-port SFP+ Adapter) + 30× 10G SFP+ SR Transceivers (`455883-B21`)
* 15× `P51181-B21` (Broadcom BCM5719 1Gb 4-port BASE-T OCP3 Adapter)
* 15× `R2E09A` (HPE SN1610Q 32Gb 2-port Fibre Channel HBA)


* **Chassis Infrastructure:** 30× 1000W Titanium Hot Plug PSUs (`P03178-B21`), Rail Kits (`P52341-B21`), Security Bezels (`P50400-B21`)
* **Software:** 15× `P8B31A` (HPE OneView w/o iLO 3yr 24x7 LTU)

**Architecture Tier 2: HPE Synergy Composable Fabric (3× Frames, 36× Nodes)**

* **Chassis & Management Infrastructure:**
* 3× `P51174-B21` (HPE Synergy 12000 CTO Frames)
* 6× `876852-B21` (Synergy 4-port Frame Link Modules)
* 6× `872957-B21` (Synergy Composer2 Management Appliances)
* 30× `P51175-B21` (Synergy High Capacity Fans)
* 36× `P44712-B21` (1800W–2200W Titanium Hot Plug PSUs) + 18× Dual Slot PS Adapters (`P44074-B21`)


* **Compute Modules (36× HPE SY480 Gen12):**
* 36× `P68217-B21` (HPE SY480 Gen12 CTO Compute Module)
* 72× `P73837-B21` (Intel Xeon 6787P Processors) + Heatsink Kits (`P68225-B21` / `P68226-B21`)
* 72× `P69726-F21` (16GB 1Rx8 DDR5-6400 Smart FIO Kit — 32GB RAM per node)
* 36× `P68222-B21` (Drive-less Front Cage Kit)
* 36× `P68340-B21` (Synergy NS204i-d v2 NVMe Boot Device) + 72× 960GB M.2 NVMe SSDs (`P80321-B21`)
* 36× `P64724-B21` (Synergy 6310C 25/50Gb Ethernet Adapter)
* 36× `P68131-B21` (Synergy 7330C 64Gb FC Mezzanine HBA)


* **Interconnect Modules & Optics:**
* 6× `867796-B21` (HPE Virtual Connect SE 100Gb F32 Module)
* 6× `P77653-B21` (Brocade 64Gb FC Switch Module)
* Optics: 18× 100Gb QSFP28 SR1.2 BiDi (`P90358-B21`), 6× 100GE/4x25GE/4x32GFC Transceivers (`882251-B21`), 6× 10G SFP+ SR (`455883-B21`)
* Cabling: 9× 100Gb QSFP28 3m DACs (`845406-B21`), 18× MPO8/4xLC 5m cables (`K2Q46A`), 30× LC/LC OM4 5m cables (`QK734A`)



---

### 4. Final Validated Services Breakdown

| SKU / Product | Description | Qty | Unit Price (USD) | Extended Price (USD) |
| --- | --- | --- | --- | --- |
| **`HU4B2A3`** | HPE 3Y Tech Care Basic Service (Base) | 2 | $0.00 | $0.00 |
| **`HU4B2A30C4V`** | HPE DL380 Gen12 Support | 15 | $5,509.00 | $82,635.00 |
| **`HU4B2A3#WJN`** | HPE Synergy 1200 Frame Support | 3 | $742.00 | $2,226.00 |
| **`HU4B2A3#Z1Q`** | HPE Synergy Composer2 Support | 6 | $297.00 | $1,782.00 |
| **`HU4B2A3#Z1R`** | HPE Synergy VC SE 100Gb F32 Module Support | 6 | $774.00 | $4,644.00 |
| **`HU4B2A30BT7`** | HPE SY480 Gen12 Support | 36 | $3,330.00 | $119,880.00 |
| **`HU4B2A30BU5`** | HPE Brocade 64G Switch Module Support | 6 | $1,656.00 | $9,936.00 |
| **`HA124A1`** | HPE Technical Installation Startup SVC (Base) | 1 | $0.00 | $0.00 |
| **`HA124A1#5ZM`** | HPE Synergy First Frame Onsite Startup | 1 | $16,742.00 | $16,742.00 |
| **`HA124A1#5ZQ`** | HPE Synergy Additional Frame Onsite Startup | 2 | $4,627.00 | $9,254.00 |
| **`P8B31A`** | HPE OneView w/o iLO 3Y 24x7 LTU (Rack) | 15 | $480.00 | $7,200.00 |
| **Total Services & Licenses** |  |  |  | **$254,299.00** |





```python
# Prepare a comprehensive, highly technical engineering document / runbook / knowledge base article
# formatted cleanly in Markdown (suitable for pasting or importing into Google Docs).
# Save it as a markdown file so the user can download it or copy-paste it directly into Antigravity / Google Docs.

doc_content = """# HPE OCA Troubleshooting & Services Configuration Runbook
**Target Audience:** Solution Architects, Presales Engineers, Autonomous Config Agents (Google Antigravity)  
**Domain:** HPE One Config Advanced (OCA) — Hybrid Solution Architecture (Synergy 12000 Composable + ProLiant DL380 Gen12)  
**Version:** 1.0 (September 2026)  
**Status:** Validated / Production-Ready  

---

## 1. Context & Architecture Overview

The target configuration is a high-density, hybrid enterprise infrastructure solution:
* **Icon #1 — Rack Compute Tier:** 15× HPE ProLiant DL380 Gen12 SFF NC Servers (Dual Intel Xeon 6530P, 32GB DDR5-6400, 4× 2.4TB SAS 10K, MR408i-o Gen11 SPDM RAID, NS204i-u V2 NVMe boot, BCM57412 10GbE SFP+, SN1610Q 32Gb FC HBA, OneView w/o iLO LTUs).
* **Icon #2 — Composable Blade Tier:** 3× HPE Synergy 12000 CTO Frames housing 36× SY480 Gen12 Compute Modules (Dual Intel Xeon 6787P, 32GB DDR5-6400, diskless cages, NS204i-d v2 NVMe boot with dual 960GB M.2 SSDs, Synergy 6310C 25/50GbE, Synergy 7330C 64Gb FC HBAs), redundant Composer2 appliances, 4-port FLMs, 6× Virtual Connect SE 100Gb F32 modules, and 6× Brocade 64Gb FC SAN modules.

---

## 2. Core Operational Learnings & Rule Mechanics

### Learning 1: Decoupling Point-of-Sale (POS) Warranty (`HU4B2A3`) vs. Professional Deployment Services (`HA124A1`)
A fundamental failure pattern in multi-tier BOQ quoting is conflating ongoing hardware break-fix warranty with one-time installation and startup services:
* **Hardware Maintenance Support (`HU4B2A3`):** HPE Pointnext Tech Care Basic (3-Year). Operates on an ongoing SLA (9×5 Next Business Day). In modular architectures like Synergy, support is decomposed into child option codes covering each discrete subsystem (`#WJN` Frame, `#Z1Q` Composer2, `#Z1R` Virtual Connect, `0BT7` Compute, `0BU5` Brocade FC).
* **Implementation / Startup Services (`HA124A1`):** One-time Statement of Work (SOW) deployment SKU executed by HPE Pointnext specialists to physically unpack, rack, cable, initialize, and integrate the frames into an HPE OneView management ring.

---

### Learning 2: Resolving CLIC Support Mismatch Rules (Rules `99916598`, `99916599`, `HU4B2A3`)
#### The Problem:
* CLIC Check threw persistent errors:
  * `Rule 99916598`: Option `#Z1R` (VC SE 100Gb) missing or quantity mismatch against physical goods.
  * `Rule 99916599`: Option `#Z1Q` (Composer2) missing or quantity mismatch against physical goods.
* **Root Cause:** The physical BOM contained 6× VC 100Gb modules (`867796-B21`) and 6× Composer2 appliances (`872957-B21`) across the 3 frames. However, the service attachment only registered 3 support entitlements each (a 1:2 under-licensing defect). Furthermore, child components under individual frames had their support state set to `"None"` while parent frames declared `HU4B2A3`.

#### The Fix Methodology:
1. **Never attempt to configure interconnect support at the child blade or child interconnect level:** Clicking an individual VC module or Composer row shows `Support: N/A` with the warning: *"Other services have been added to the Icon level. Please go to Icon level other service tab for detail."*
2. **Purge Corrupted Support Cache via "No Support" Reset:**
   * In multi-frame imports, OCA frequently locks stale sub-item quantities in the backend rules cache.
   * *Procedure:* Navigate to `Icon #2` &rarr; `Services` &rarr; set Support to **"No Support"** (with `TS5 - No support needed` and `"Apply to all nodes inside Current Icon"` checked) &rarr; **Save**.
   * *Note on Advisory Warnings:* OCA throws an Information Message: *"P51174-B21... The Support Service Level selected is below the Minimum Service requirement."* This is expected behavior—Synergy cannot be sold without support. Dismiss this alert.
3. **Re-Apply Support via "Select Your Own":**
   * Do not click the preset "Standard" radio button if it defaults to 5-Year Complete Care (`HU4D5A5`) or mismatched terms.
   * Select **"Select Your Own"** &rarr; filter Duration to **3 Years** &rarr; select **`HU4B2A3` (HPE 3Y Tech Care Basic Service)**.
   * Leave **Install Level** set to **No Installation** (preventing redundant rack installation SKUs).
   * Ensure **"Apply the displayed Install level and Support level to all nodes inside the Current Icon where available"** is checked &rarr; click **OK** &rarr; click **Save**.
   * Verify individual rows for VC (`#Z1R`), Composer2 (`#Z1Q`), and Brocade (`0BU5`) reflect an exact 1:1 match of 6 units each.

---

### Learning 3: Solution-Wide Frame Startup Rule Attributed to DL380 (Rule `81039677`)
#### The Problem:
* In the BOM tab, row `P73282-B21` (DL380 Gen12 CTO Server) displayed a red **CLIC Status: Error**.
* Clicking the error displayed:  
  `Product Number: P73282-B21 | Rule Number: 81039677 | Item/Subitem: 0100/01`  
  `"Installation and Startup must be quoted for ALL frames in the order for a valid quote."`
* The engineer was confused why a standalone 2U rack server required a "frame".

#### The Root Cause & OCA Architectural Behavior:
* In multi-icon solutions (Icon Separation mode), **Item 0100/01 is the first physical entry in the entire solution BOM**, which happens to be the DL380 chassis.
* When a **Solution-Level / Order-Wide validation rule** fails, OCA defaults to tagging the error against Item `0100/01`, even if the violation stems from an entirely different icon.
* The actual failure was caused by misconfigured Synergy startup services in `Icon #2`:
  1. Startup services were duplicated across the Icon container and the child frame (`Synergy 12000 Frame #1`).
  2. Conflicting delivery methods were quoted simultaneously: `#5ZM` (First Frame Onsite) AND `#V0F` (First Frame Remote).
  3. The customer's input BOQ contained a raw dump of quantity 3 for all three options (`#5ZM` Qty 3, `#5ZQ` Qty 3, `#V0F` Qty 3).

#### The Fix Methodology:
1. **Eliminate Delivery Scope Conflicts:** Remote (`#V0F`) and Onsite (`#5ZM`) startup cannot coexist on the same frame cluster. Purge `#V0F` completely when delivering onsite.
2. **Standard Synergy Multi-Frame Mathematical Sizing:**
   * A multi-frame Synergy fabric contains exactly **ONE** First Frame (Primary Management Domain).
   * All other frames are expansion frames.
   * **Formula for N Frames:**
     $$\\text{First Frame Onsite (\\#5ZM)} = 1$$
     $$\\text{Additional Frame Onsite (\\#5ZQ)} = N - 1$$
   * For $N = 3$ Frames: **1× `#5ZM` + 2× `#5ZQ`**.
3. **Placement Hierarchy:**
   * Delete startup lines residing locally under `Synergy 12000 Frame #1`.
   * Add the startup service exclusively at the **`Icon #2` container level** under `Services` &rarr; `Deployment Services` &rarr; `Install-Install and Start Up` (or `Add Lifecycle Services`).
   * This immediately satisfies Rule `81039677` across the order, clearing the red error from the DL380 line.

---

### Learning 4: Missing Rack Server Support Discrepancy (`HU4B2A30C4V`)
* **Customer BOQ Flaw:** The customer's initial spreadsheet included 15× OneView licenses (`P8B31A`) for the DL380 servers but zero hardware maintenance contracts for the DL380 chassis.
* **Resolution:** When configuring Icon #1, Tech Care Basic was established at the icon level, auto-generating **15× `HU4B2A30C4V`** ($82,635 list price).
* **Isolation Rule:** Never check *"Apply displayed install/support to all icons inside the solution"* when working inside Icon #1 or Icon #2. Keep scope confined to *"inside the Current Icon"* to prevent Synergy frame attributes from leaking into ProLiant rack server trees.

---

## 3. Step-by-Step Autonomous Troubleshooting Protocol (Agent Workflow)

When an autonomous agent (Antigravity) encounters OCA service and validation faults, execute the following state machine:


```

[Start CLIC Diagnostic]
│
▼
Is CLIC Status == "Error" or "Unbuildable"?
├── NO  ──► Check Warnings. If lead-time/EDT only, mark VALID.
└── YES ──► Click red Error / Inspect Rule Number.
│
┌─────────────┴──────────────────────────────┐
▼                                            ▼
[Rule 99916598 / 99916599]                 [Rule 81039677]
Support Qty Mismatch (Z1Q / Z1R)           "Startup must be quoted for ALL frames"
│                                            │

1. Go to Icon Container Level (Synergy)    1. Do NOT touch DL380 server lines.
2. Set Support to "No Support" & Save      2. Go to Synergy Icon -> Services -> Lifecycle
3. Select "Select Your Own" -> 3Y Basic    3. Delete duplicate child-frame startup SKUs
4. Check "Apply to Current Icon"           4. Purge all Remote Startup (#V0F) lines
5. Leave Install Level == "No Install"     5. Set #5ZM = 1 (First Frame Onsite)
6. Save & Run CLIC Check                   6. Set #5ZQ = Total Frames - 1
7. Save & Run CLIC Check

```

---

## 4. Final Solution Metrics Reference

* **Total Solution List Price:** $5,551,771.00 USD
  * Compute & Enclosure Hardware: $5,297,472.00 USD
  * Pointnext Support & Deployment: $254,299.00 USD
* **Key SKUs & Rationalized Quantities:**
  * `P73282-B21`: 15 (DL380 Gen12 CTO)
  * `P51174-B21`: 3 (Synergy 12000 CTO Frames)
  * `P68217-B21`: 36 (SY480 Gen12 Compute Modules)
  * `872957-B21`: 6 (Composer2) &larr;&rarr; `HU4B2A3#Z1Q`: 6 (Composer Support)
  * `867796-B21`: 6 (VC 100Gb) &larr;&rarr; `HU4B2A3#Z1R`: 6 (VC Support)
  * `P77653-B21`: 6 (Brocade FC) &larr;&rarr; `HU4B2A30BU5`: 6 (Brocade Support)
  * `HA124A1#5ZM`: 1 (Synergy First Frame Onsite Startup)
  * `HA124A1#5ZQ`: 2 (Synergy Additional Frame Onsite Startup)
"""

with open("HPE_OCA_Services_Troubleshooting_and_Resolution_Runbook.md", "w") as f:
    f.write(doc_content.strip())

print("Created runbook markdown file successfully!")


```

```text
Created runbook markdown file successfully!


```

Here is the comprehensive engineering runbook and root-cause analysis compiled as a structured document. You can download the complete Markdown file directly to import into Google Docs or feed straight into your Antigravity agent knowledge base:

**Download Document:** [HPE_OCA_Services_Troubleshooting_and_Resolution_Runbook.md](https://www.google.com/search?q=code-generated-file-bb9728ec-b316-4e9f-9deb-40a9071129f2)

---

# HPE OCA Troubleshooting & Services Configuration Runbook

**Target Systems:** Autonomous Config Agents (Google Antigravity), Presales Solution Architects

**Scope:** HPE One Config Advanced (OCA) — Multi-Tier Hybrid Solution (Synergy 12000 Composable + ProLiant DL380 Gen12)

**Configuration UCID:** `5155640958-01`

**Validation Outcome:** Clean Pass (0 Blocking Errors, 0 Unbuildable Flags)

---

### 1. Architecture Overview & Context

The target BOM is a hybrid enterprise infrastructure deployment:

* **Icon #1 (Rack Compute Tier):** 15× HPE ProLiant DL380 Gen12 2U Rack Servers (Dual Intel Xeon 6530P, 32GB RAM, 4× 2.4TB SAS 10K, MR408i-o Gen11 RAID, NS204i-u V2 NVMe boot, BCM57412 10GbE SFP+, SN1610Q 32Gb FC HBA, OneView LTUs).
* **Icon #2 (Composable Blade Tier):** 3× HPE Synergy 12000 Frames housing 36× SY480 Gen12 Compute Modules (Dual Intel Xeon 6787P, diskless cages, NS204i-d v2 boot with dual 960GB NVMe SSDs, Synergy 6310C 25/50GbE, Synergy 7330C 64Gb FC HBAs), redundant Composer2 appliances, 4-port FLMs, 6× Virtual Connect SE 100Gb F32 modules, and 6× Brocade 64Gb FC SAN modules.

---

### 2. Core Technical Learnings & Rule Mechanics

#### Learning 1: Decoupling Hardware Support (`HU4B2A3`) vs. Professional Startup Services (`HA124A1`)

A primary failure pattern in enterprise quoting is conflating ongoing maintenance with physical deployment:

* **Point-of-Sale Hardware Support (`HU4B2A3`):** HPE Pointnext Tech Care Basic (3-Year, 9×5 NBD). In Synergy, this must be decomposed across every distinct subsystem (`#WJN` Frame, `#Z1Q` Composer2, `#Z1R` Virtual Connect, `0BT7` Compute, `0BU5` Brocade FC).
* **Implementation / Startup Services (`HA124A1`):** A one-time Statement of Work (SOW) deployment SKU executed by HPE Pointnext specialists to physically rack, cable, initialize, and integrate the frames into an HPE OneView management ring.

---

#### Learning 2: Fixing CLIC Support Mismatch Rules (Rules `99916598` & `99916599`)

* **The Symptom:** CLIC Check blocked quoting with:
* `Rule 99916598`: Option `#Z1R` (VC SE 100Gb Module Support) missing or quantity mismatch against physical goods.
* `Rule 99916599`: Option `#Z1Q` (Composer2 Support) missing or quantity mismatch against physical goods.


* **Root Cause:**
1. The physical BOM ordered 6× VC 100Gb switches (`867796-B21`) and 6× Composer2 appliances (`872957-B21`), but the imported support contract only carried 3 entitlements each (a 1:2 under-licensing defect).
2. Inside the child frame, interconnect support was set to `"None"`, while the parent frame had `HU4B2A3` active.
3. Clicking individual interconnects showed `Support: N/A` with the warning: *"Other services have been added to the Icon level. Please go to Icon level other service tab for detail."*


* **Resolution Strategy:**
1. **Flush Corrupted Rules Cache:** Navigate to `Icon #2` → `Services` → toggle support to **"No Support"** (with `TS5 - No support needed` and *"Apply to all nodes inside Current Icon"* checked) → **Save**. *(Ignore the advisory warning that Synergy cannot be sold without support; this clears the stale child options).*
2. **Re-Apply via "Select Your Own":** Do not use preset standard buttons (which default to 5-Year Complete Care `HU4D5A5`). Select **"Select Your Own"** → filter Duration to **3 Years** → select **`HU4B2A3` (Tech Care Basic)**.
3. Set **Install Level** to **No Installation** (preventing redundant rack install SKUs).
4. Ensure *"Apply displayed Install/Support level to all nodes inside Current Icon"* is **checked** → click **OK** → **Save**. This forces OCA to auto-generate exact 1:1 matching quantities of **6 each** for `#Z1R`, `#Z1Q`, and `0BU5`.



---

#### Learning 3: Resolving Solution-Wide Frame Startup Attributed to DL380 (Rule `81039677`)

* **The Symptom:** In the BOM, row `P73282-B21` (DL380 Gen12 CTO Server) showed a red **CLIC Status: Error**:
`Product Number: P73282-B21 | Rule Number: 81039677 | Item/Subitem: 0100/01`
`"Installation and Startup must be quoted for ALL frames in the order for a valid quote."`
* **Root Cause:**
1. In multi-icon solutions (Icon Separation mode), **Item 0100/01 is the first line of the solution BOM**, which happens to be the DL380 server. When a solution-wide validation rule fails, OCA attaches the error to Item `0100/01` by default.
2. The actual defect was in `Icon #2`: startup services were duplicated between the Icon container and the child frame, and conflicting delivery models were quoted simultaneously (`#5ZM` Onsite First Frame AND `#V0F` Remote First Frame).
3. The customer's input BOQ contained a raw dump of quantity 3 for all options (`#5ZM` Qty 3, `#5ZQ` Qty 3, `#V0F` Qty 3).


* **Resolution Strategy:**
1. **Purge Remote Startup:** Remote (`#V0F`) and Onsite (`#5ZM`) startup cannot coexist on the same frame cluster. Delete `#V0F` completely.
2. **Mathematical Sizing for Multi-Frame Synergy:**
* A multi-frame Synergy fabric has exactly **ONE** First Frame (Primary Management Ring).
* All subsequent frames are expansion frames:

$$\text{First Frame Onsite (\#5ZM)} = 1$$


$$\text{Additional Frame Onsite (\#5ZQ)} = N - 1$$


* For $N = 3$ Frames: **1× `#5ZM` + 2× `#5ZQ**`.


3. **Placement Hierarchy:** Delete startup lines trapped inside `Synergy 12000 Frame #1`. Add the startup service exclusively at the **`Icon #2` parent container level** under `Services` → `Deployment Services` → `Install-Install and Start Up`.
4. Saving this configuration satisfies Rule `81039677` across the order, clearing the red error from the DL380 line.



---

#### Learning 4: Missing Rack Server Support Discrepancy (`HU4B2A30C4V`)

* **Customer BOQ Flaw:** The customer's initial spreadsheet included 15× OneView licenses (`P8B31A`) for the DL380 servers but omitted ongoing hardware warranty support entirely.
* **Resolution:** When configuring Icon #1, Tech Care Basic was established at the icon level, auto-generating **15× `HU4B2A30C4V**` ($82,635 list price).
* **Isolation Guardrail:** Never check *"Apply displayed install/support to all icons inside the solution"* when working inside Icon #1 or Icon #2. Keep scope strictly confined to *"inside the Current Icon"* to prevent Synergy frame attributes from polluting rack server trees.

---

### 3. Autonomous Agent Decision Matrix (State Machine)

Feed this decision flow to your Antigravity agent when evaluating and auto-remediating OCA quotes:

```
[Start CLIC Validation]
       │
       ▼
Is CLIC Status == "Error" or "Unbuildable"?
       ├── NO  ──► Check Warnings. If lead-time/EDT notices only, mark VALID.
       └── YES ──► Interrogate Rule ID & Affected Line:
                     │
       ┌─────────────┴────────────────────────────────┐
       ▼                                              ▼
[Rule 99916598 / 99916599]                   [Rule 81039677]
Support Qty Mismatch (Z1Q / Z1R)             "Startup must be quoted for ALL frames"
       │                                              │
1. Navigate to Synergy Icon Level (Icon #2)   1. DO NOT modify DL380 server lines.
2. Services -> Toggle to "No Support" & Save  2. Navigate to Synergy Icon -> Services -> Lifecycle
3. Select "Select Your Own" -> 3Y Basic       3. Delete child-frame duplicate startup SKUs
4. Check "Apply to Current Icon"              4. Purge all Remote Startup (#V0F) lines
5. Ensure Install Level == "No Install"       5. Set #5ZM = 1 (First Frame Onsite)
6. Save & Execute CLIC Check                  6. Set #5ZQ = (Total Frames - 1)
                                              7. Save & Execute CLIC Check

```

---

### 4. Final Validated Financial Baseline

* **Hardware Extended List Price:** $5,297,472.00 USD
* **Services & Support Extended List Price:** $254,299.00 USD
* **Total Solution Extended List Price:** **$5,551,771.00 USD**
* **Clean Services BOM:**
* `HU4B2A30C4V` (DL380 Gen12 3Y Tech Care Basic): Qty 15
* `HU4B2A3#WJN` (Synergy 12000 Frame Support): Qty 3
* `HU4B2A3#Z1Q` (Composer2 Support): Qty 6
* `HU4B2A3#Z1R` (VC 100Gb F32 Module Support): Qty 6
* `HU4B2A30BT7` (SY480 Gen12 Support): Qty 36
* `HU4B2A30BU5` (Brocade 64G Switch Module Support): Qty 6
* `HA124A1#5ZM` (Synergy First Frame Onsite Startup): Qty 1
* `HA124A1#5ZQ` (Synergy Addl Frame Onsite Startup): Qty 2
* `P8B31A` (HPE OneView w/o iLO 3Y 24x7 LTU): Qty 15