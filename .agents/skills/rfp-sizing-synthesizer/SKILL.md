---
name: rfp-sizing-synthesizer
description: Use this skill to translate unstructured customer RFP specifications, sizing requirements, and tender wishlists (cores, RAM, storage, network, power) into a 100% buildable starting BOM with exact HPE part numbers.
---

# Natural Language RFP Sizing-to-BOM Synthesizer (`rfp-sizing-synthesizer`)

When a customer or sales engineer provides a tender wishlist without HPE part numbers (e.g., *"We need a database cluster of 8 servers, each with 64 cores, 512GB RAM, 15TB usable NVMe, dual 25GbE networking, redundant 1600W power, and 3-year 24x7 support"*), this skill directs the agent to translate the requirements into a certified, 100% buildable starting BOM.

---

## 🏗️ 7-Component Sizing & Architectural Mapping Rules

### 1. Base Chassis & Generation Selection
- **Gen12 (Intel Xeon 5th/6th Gen or AMD EPYC 9005)**: Default flagship for all new dual-socket tenders (`DL380_Gen12` or `DL380a_Gen12` for GPU-dense workloads).
- **Gen11 (Intel Xeon 4th/5th Gen or AMD EPYC 9004)**: For backward-compatibility or customer-mandated Gen11 infrastructure (`DL380_Gen11`, `DL145_Gen11` for Edge).
- **Form Factor**:
  - `8SFF`: High IOPS, standard database & virtualization workloads.
  - `12LFF` / `8LFF`: High-capacity backup, file serving, and archival.
  - `EDSFF`: High-density thermal-optimized E3.S NVMe storage.

### 2. Compute & Core Interleaving
- **Core Count Target**: Calculate per-socket core requirements:
  - 64 cores total $\rightarrow$ 2x 32-core processors (e.g., Intel Xeon Gold 6548Y 32-core 280W `P73299-B21` or Gold 6530).
  - 128 cores total $\rightarrow$ 2x 64-core processors (e.g., Intel Xeon Platinum 8580 64-core 350W `P73289-B21`).
- **Secondary CPU Heatsink Rule**: Dual-processor configurations MUST always include the secondary CPU heatsink kit (`P48818-B21` for Gen12, `P74792-B21` for Gen11).
- **High-Performance Fans**: Processors $\ge 240\text{W}$ TDP mandate High-Performance Fan Kit (`P48820-B21`).

### 3. Memory Channel Interleaving (1DPC Symmetrical Populating)
- **DL380 Gen12 (16 Memory Channels — 8 per CPU)**:
  - **256GB Total**: 16x 16GB DDR5-5600 (`P73300-B21` / `P64705-B21`).
  - **512GB Total**: 16x 32GB 2Rx8 DDR5-5600 Smart Memory (`P73300-B21` / `P64707-B21`).
  - **1TB Total**: 16x 64GB 2Rx4 DDR5-5600 Smart Memory (`P73301-B21` / `P64708-B21`).
  - **2TB Total**: 16x 128GB 4Rx4 or 32x 64GB (2DPC with clock speed derating).
- **Golden Rule**: Never populate asymmetrical DIMM counts (e.g. 6 or 10 DIMMs) which disables memory interleaving channels and causes up to 40% memory bandwidth degradation.

### 4. Storage Controller & Drive Sizing Math
- **Usable vs. Raw NVMe/SSD Capacity**:
  - RAID-10 (50% usable): 15TB usable requires $\ge 30\text{TB}$ raw (e.g. 8x 3.84TB NVMe SSDs).
  - RAID-5 (1 parity drive): 15TB usable with 3.84TB drives requires 5x drives ($4 \times 3.84 = 15.36\text{TB}$).
  - RAID-6 (2 parity drives): 15TB usable requires 6x 3.84TB drives.
- **Dedicated Controller vs. Direct-Attach**:
  - High-IOPS transactional DB: Dedicated Tri-Mode RAID controller (`MR416i-p` PCIe standup or `MR408i-o` OCP) + Smart Storage Hybrid Capacitor Battery (`P01366-B21`).
  - NVMe Software vROC: Direct-attach cables to system board SlimSAS ports.
- **SAS Expander Math (`INV-26`)**:
  - If drive count $> 8$ on a single 8-port controller, inject SAS Expander `P48835-B21`.

### 5. Networking & OCP Bus Allocation
- **Primary Interface**: OCP 3.0 Slot 1 (`P10115-B21` 10/25GbE 2-port SFP28 or `P51181-B21` 10GBASE-T).
- **Contested Slot Pivot (`INV-39`)**: If the customer requests dual OCP NICs + an OCP storage controller, pivot the storage controller to PCIe standup (`MR416i-p` `P47777-B21`), freeing OCP Slot 1 so both OCP NICs remain 100% active.

### 6. Power Supply Sizing & Regulatory Compliance
- **Power Envelope Calculation**:
  $$\text{Total System Draw} = 2 \times \text{CPU TDP} + \text{RAM (5W/DIMM)} + \text{Drives (15W/NVMe)} + \text{Fans/Board (150W)} + \text{GPUs}$$
- Dual Redundant ($1+1$) PSUs:
  - Up to 800W total draw $\rightarrow$ 2x 800W / 1000W Flex Slot PSUs.
  - 800W to 1400W total draw $\rightarrow$ 2x 1600W Flex Slot Platinum (`P38997-B21`).
  - $>1400\text{W}$ or high-TDP GPU nodes $\rightarrow$ 2x 1800W–2200W Titanium PSUs.
- **EU ErP Lot 9 Regulatory Kit (`INV-30`)**: For non-EU deployments using 94% Platinum PSUs on high-TDP configurations, inject `P35876-B21` (CE Mark Removal Kit, $1 list) to satisfy configurator software validation.

### 7. Support & OS Core Licensing Multipliers (`INV-28`)
- **Windows Server 2025 Standard / Datacenter**:
  - 16 physical cores minimum per server.
  - Extra cores require 2-core / 4-core / 16-core add-on packs ($(\text{Total Sockets} \times \text{Cores per Socket}) - 16$).
- **Support Care**: Default to standard 3-year Tech Care Basic/Essential without bundling unrequested startup installation services (`INV-32`).

---

## 💻 Autonomous Sizing Workflow

1. **Parse & Tokenize Intent**: Extract requested CPU core targets, RAM capacity, storage IOPS profile, and network bandwidth.
2. **Resolve to Catalog SKUs**: Use [`scripts/lib/boq/requirement_intent_resolver.js`](file:///home/vinodh/vendorNotebookSolution/scripts/lib/boq/requirement_intent_resolver.js) to map the tokenized roles to concrete, certified catalog part numbers from `outputs/{Family}/{Gen}/{Model}/`.
3. **Compile Baseline BOM**: Create a structured CSV/JSON payload.
4. **Validate via 7-Aspect Engine**:
   ```bash
   node scripts/evaluators/eval_boq.js outputs/temp/sized_bom.csv --chassis outputs/ProLiant/Gen12/DL380_Gen12
   ```
5. **Output 5-Tier Strategy Matrix**: Emit Rank 1 (Exact Requirement Match) through Rank 5 (CapEx Minimized Baseline) with full financial itemization.
