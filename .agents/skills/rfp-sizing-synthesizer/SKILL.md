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
  - Entry / Basic Compute: Intel Xeon Silver 4510 / Xeon 6505P 16-core ($2.8\text{GHz}$) for minimal cost where GPU accelerators provide the compute muscle.
  - 64 cores total $\rightarrow$ 2x 32-core processors (e.g., Intel Xeon Gold 6548Y 32-core 280W `P73299-B21` or Gold 6530).
  - 128 cores total $\rightarrow$ 2x 64-core processors (e.g., Intel Xeon Platinum 8580 64-core 350W `P73289-B21`).
- **Secondary CPU Heatsink Rule**: Dual-processor configurations MUST always include the secondary CPU heatsink kit (`P48818-B21` for Gen12, `P74792-B21` for Gen11).
- **High-Performance Fans**: Processors $\ge 240\text{W}$ TDP mandate High-Performance Fan Kit (`P48820-B21`) on standard DL380; DL380a uses factory-integrated high-performance accelerator fan modules.

### 3. Memory Channel Interleaving vs. Minimal Supported Population
- **DL380 Gen12 (16 Memory Channels — 8 per CPU)**:
  - **Optimal Interleaving (1DPC Symmetrical — 16 DIMMs)**:
    - **256GB Total**: 16x 16GB DDR5-5600 (`P73300-B21` / `P64705-B21`).
    - **512GB Total**: 16x 32GB 2Rx8 DDR5-5600 Smart Memory (`P73300-B21` / `P64707-B21`).
    - **1TB Total**: 16x 64GB 2Rx4 DDR5-5600 Smart Memory (`P73301-B21` / `P64708-B21`).
    - **2TB Total**: 16x 128GB 4Rx4 or 32x 64GB (2DPC with clock speed derating).
- **Minimal Entry Population (Supported Hierarchy)**:
  - Per HPE CLIC rules, supported DIMM counts per socket are `[1, 2, 4, 6, 8, 12, 16]`.
  - Minimal supported entry: 2 DIMMs per socket (4 DIMMs total for dual-socket = 128GB; 2 DIMMs total for single-socket = 64GB).
  - Minimal entry configurations are 100% buildable and must not be rejected; the engine passes them with an informative memory interleaving advisory rather than an unbuildable error.

### 4. Storage Controller & Drive Sizing Math
- **Usable vs. Raw NVMe/SSD Capacity**:
  - RAID-10 (50% usable): 15TB usable requires $\ge 30\text{TB}$ raw (e.g. 8x 3.84TB NVMe SSDs).
  - RAID-5 (1 parity drive): 15TB usable with 3.84TB drives requires 5x drives ($4 \times 3.84 = 15.36\text{TB}$).
  - RAID-6 (2 parity drives): 15TB usable requires 6x 3.84TB drives.
- **Diskless / No Local Drive Nodes (`873763-B21`)**:
  - When customer specifies *"No Local Drive"*, *"diskless node"*, or PXE/SAN-booted architecture, inject `873763-B21` (HPE ProLiant No Drive FIO Enablement Kit, $14 list).
  - Satisfies HPE CLIC Rule 81392308, eliminating the need for drive cages, backplanes, and storage controllers.
- **Dedicated Controller vs. Direct-Attach**:
  - High-IOPS transactional DB: Dedicated Tri-Mode RAID controller (`MR416i-p` PCIe standup or `MR408i-o` OCP) + Smart Storage Hybrid Capacitor Battery (`P01366-B21`).
  - NVMe Software vROC: Direct-attach cables to system board SlimSAS ports.
- **SAS Expander Math (`INV-26`)**:
  - If drive count $> 8$ on a single 8-port controller, inject SAS Expander `P48835-B21`.

### 5. GPU Accelerator Density Arbitration & Auxiliary Power (DL380a Gen12) (`INV-84`)
- **H200 NVL Parallel Sub-Path Sizing (8DW vs. 10DW)**:
  - DL380a Gen12 supports both 8DW and 10DW accelerator topologies.
  - When customer requests "max H200s", the synthesizer generates **two valid, buildable sub-paths**:
    - **Rank 1A (Interconnect-Optimized AI Training — 8x H200 NVLink)**:
      - 8x H200 NVL (`S3U30C`) with 8DW Mode (`P75008-B21`) and NVLink Bridges (`S4A90C`/`S4A91C`).
      - 900 GB/s bidirectional GPU interconnect for Megatron-LM tensor parallel training.
      - 1,128 GB HBM3e VRAM per server node.
      - Requires 4x GPU 16-pin cable kits (`P74700-B21`) and dual switchboards (`P74714-B21`).
    - **Rank 1B (Density-Optimized High-Throughput Inference — 10x H200 PCIe Mode)**:
      - 10x H200 NVL (`S3U30C`) with 10DW Mode (`P75005-B21`) and 10DW Captive Riser (`P76929-B21`).
      - Pure PCIe Gen5 x16 communication over dual switchboards (`P74714-B21`).
      - NVLink bridges are omitted because QuickSpecs notes: *"10DW configuration does not support GPU NVL bridges."*
      - 1,410 GB HBM3e VRAM per server node (+282 GB VRAM and +25% raw GPU compute).
      - Mandatory dependencies: 5x GPU 16-pin cable kits (`P74700-B21`), 1x Front Fan Module Kit (`P79656-B21`), and 1x Front Panel Kit (`P79660-B21`).
- **Front-Bay Switchboard Architecture**:
  - Front-bay accelerators sit on dual switchboards (`P74714-B21`) and do NOT consume rear PCIe riser slots.
  - In 8DW mode, 5 rear slots are available. In 10DW mode, 3 rear slots (Slots 1, 3, 6) remain available for networking (`P26262-B21` 25GbE).
- **Power Sizing for 8x and 10x H200**:
  - Both 8DW and 10DW modes mandate exactly 8 power supplies in N+N redundancy.
  - Recommended: 8x 3200W Titanium PSUs (`P67248-B21`) or 8x 2400W Titanium PSUs (`P67252-B21`) paired with 8x C19-C20 16A cords (`P78384-B21`).

### 6. Networking & OCP Bus Allocation
- **Primary Interface**: OCP 3.0 Slot 1 (`P10115-B21` 10/25GbE 2-port SFP28 or `P51181-B21` 10GBASE-T).
- **Contested Slot Pivot (`INV-39`)**: If the customer requests dual OCP NICs + an OCP storage controller, pivot the storage controller to PCIe standup (`MR416i-p` `P47777-B21`), freeing OCP Slot 1 so both OCP NICs remain 100% active.

### 7. Power Supply Sizing & Regulatory Compliance
- **Power Envelope Calculation**:
  $$\text{Total System Draw} = 2 \times \text{CPU TDP} + \text{RAM (5W/DIMM)} + \text{Drives (15W/NVMe)} + \text{Fans/Board (150W)} + \text{GPUs}$$
- Dual Redundant ($1+1$) PSUs:
  - Up to 800W total draw $\rightarrow$ 2x 800W / 1000W Flex Slot PSUs.
  - 800W to 1400W total draw $\rightarrow$ 2x 1600W Flex Slot Platinum (`P38997-B21`).
  - $>1400\text{W}$ or high-TDP GPU nodes $\rightarrow$ 2x 1800W–2200W Titanium PSUs.
  - 8x H200 AI clusters $\rightarrow$ 8x 2400W Titanium PSUs (`P67252-B21`).
- **EU ErP Lot 9 Regulatory Kit (`INV-30`)**: For non-EU deployments using 94% Platinum PSUs (`P38995-B21` / `P38997-B21`) on high-TDP configurations, inject `P35876-B21` (CE Mark Removal Kit, $1 list) to satisfy configurator software validation without altering customer hardware.

### 8. Support & OS Core Licensing Multipliers (`INV-28`)
- **Windows Server 2025 Standard / Datacenter**:
  - 16 physical cores minimum per server.
  - Extra cores require 2-core / 4-core / 16-core add-on packs ($(\text{Total Sockets} \times \text{Cores per Socket}) - 16$).
- **Support Care**: Default to standard 3-year Tech Care Basic/Essential without bundling unrequested startup installation services (`INV-32`).

---

## 💻 Autonomous Sizing Workflow

1. **Parse & Tokenize Intent**: Extract requested CPU core targets, RAM capacity, storage IOPS profile, and network bandwidth.
2. **Resolve to Catalog SKUs**: Use [`scripts/lib/boq/requirement_intent_resolver.js`](file:///home/vinodh/vendorNotebookSolution/scripts/lib/boq/requirement_intent_resolver.js) to map the tokenized roles to concrete, certified catalog part numbers from `outputs/{Family}/{Gen}/{Model}/`.
3. **Compile Baseline BOM**: Create a structured CSV/JSON payload matching the schema below.
4. **Pre-Flight Sizing Verification**: Run the verification checklist below BEFORE piping into eval.
5. **Validate via 7-Aspect Engine**:
   ```bash
   node scripts/evaluators/eval_boq.js outputs/temp/sized_bom.csv --chassis outputs/ProLiant/Gen12/DL380_Gen12
   ```
6. **Output 5-Tier Strategy Matrix**: Emit Rank 1 (Exact Requirement Match) through Rank 5 (CapEx Minimized Baseline) with full financial itemization.

---

## 📋 Synthesized BOM Output Schema

The agent MUST compile the synthesized BOM into this exact structure before piping it into `eval_boq.js`:

```
Part Number,Qty,Description
P55446-B21,1,HPE ProLiant DL380 Gen12 8SFF CTO Base Server
P73289-B21,2,Intel Xeon Platinum 8580 64-core 350W Processor
P48818-B21,1,HPE DL380 Gen12 Secondary CPU Heatsink Kit
P64707-B21,16,HPE 32GB 2Rx8 DDR5-5600 Smart Memory Kit
P47777-B21,1,HPE MR416i-p Gen11 PCIe Standup Tri-Mode Controller
P48835-B21,1,HPE SAS Expander Card (if >8 drives)
P10115-B21,1,HPE Ethernet 10/25Gb 2p SFP28 OCP3 Adapter
P38997-B21,2,HPE 1600W Flex Slot Platinum Power Supply
HU4B2A3,1,HPE 3Y Tech Care Basic Hardware Only Support
```

### Required Columns
| Column | Description | Validation |
|--------|-------------|------------|
| `Part Number` | Full HPE SKU (e.g., `P73289-B21`) | Must pass `isValidHpeSKU()` |
| `Qty` | Integer quantity per atomic server node | Must be ≥1, integer only |
| `Description` | Human-readable component description | Must not be empty |

### 7 Component Roles (ALL Must Be Present)

| Role | Required | Example SKU | Notes |
|------|----------|-------------|-------|
| **CHASSIS** | ✅ Mandatory | `P55446-B21` | Exactly 1 base CTO chassis |
| **PROCESSOR** | ✅ Mandatory | `P73289-B21` | 1 or 2 (matching socket count) |
| **MEMORY** | ✅ Mandatory | `P64707-B21` | Must be symmetrical (multiple of channel count) |
| **STORAGE_CONTROLLER** | ✅ Mandatory | `P47777-B21` | OCP or PCIe standup |
| **DRIVES** | ⚠️ If storage requested | `P36999-B21` | Match RAID level and capacity requirements |
| **NETWORKING** | ✅ Mandatory | `P10115-B21` | At least 1 NIC |
| **POWER** | ✅ Mandatory | `P38997-B21` | 1+1 redundant default |
| **SUPPORT** | ⚠️ Default 3yr basic | `HU4B2A3` | Never inject installation/startup services (`INV-32`) |

---

## ✅ Pre-Flight Sizing Verification Checklist

**BEFORE** piping the synthesized BOM into `eval_boq.js`, the agent MUST verify each of these gates:

| # | Gate | Verification Rule | Fail Action |
|---|------|------------------|-------------|
| S1 | **Chassis Present** | Exactly 1 base chassis CTO SKU in the BOM | HALT — cannot proceed without chassis |
| S2 | **CPU Count Valid** | CPU qty ∈ {1, 2} for dual-socket; {1, 2, 3, 4} for 4-socket servers | HALT — invalid CPU count |
| S3 | **Memory Symmetry** | DIMM count is a multiple of (channels_per_cpu × cpu_count). For DL380 Gen12: 8 channels/CPU × 2 CPUs = 16 channels, so DIMM count ∈ {16, 32} | WARN — asymmetric population degrades bandwidth |
| S4 | **All Roles Resolved** | All 7 mandatory roles (or 5 if storage/support are N/A) have at least 1 SKU | HALT — incomplete BOM |
| S5 | **SKU Validity** | Every SKU passes `isValidHpeSKU()` regex | HALT — invalid part numbers |
| S6 | **SKU Catalog Existence** | Every SKU exists in `catalog.json` for the target chassis directory | WARN — uncertified SKU (may still be valid but unscraped) |
| S7 | **Price Availability** | ≥80% of SKUs have resolved prices via `getHistoricalSkuPrice()` | WARN — financial totals will be incomplete |
| S8 | **Thermal Envelope** | Total CPU TDP does not exceed chassis thermal maximum (e.g., DL380 Gen12 supports up to 2x 350W) | HALT — thermally infeasible |
| S9 | **Power Headroom** | Total system draw ≤ PSU wattage (with 20% headroom for burst) | WARN — consider higher PSU tier |
| S10 | **Secondary Accessories** | Dual-CPU configs include secondary heatsink (`INV-61`); ≥240W TDP includes high-perf fans | WARN — will be auto-injected by eval but better to include proactively |

### Gate Summary Output Format
```
Pre-Flight Sizing Verification:
  ✅ S1: Chassis P55446-B21 present
  ✅ S2: CPU count 2 (dual-socket)
  ✅ S3: Memory 16 DIMMs (16 channels, 1DPC — symmetric)
  ✅ S4: 7/7 roles resolved
  ✅ S5: 9/9 SKUs pass isValidHpeSKU()
  ⚠️ S6: 1/9 SKUs not found in catalog (P99999-B21 — may be newly added)
  ✅ S7: 8/9 SKUs have resolved prices (89%)
  ✅ S8: TDP 700W within 700W chassis max
  ✅ S9: System draw ~920W, PSU capacity 3200W (1+1), headroom OK
  ✅ S10: Secondary heatsink P48818-B21 included

  Result: 9/10 PASSED, 1 WARNING → Proceeding to eval_boq.js
```

