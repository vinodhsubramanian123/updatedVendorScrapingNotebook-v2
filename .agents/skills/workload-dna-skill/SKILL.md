---
name: workload-dna-skill
description: Use this skill to classify enterprise workload DNA (SAP HANA, VMware vSphere/VCF, VDI, Microsoft SQL, High-Frequency Trading, AI/LLM Inference, Big Data) and match hardware architectures to application performance requirements. Optimizes NUMA node balance, memory channel interleaving bandwidth (1DPC vs 2DPC), and arbitrates contested physical slots.
---

# Workload DNA Profiler & Application Sizing Matcher Skill (`workload-dna-skill`)

**Purpose**: High-performance enterprise workloads cannot be properly sized using simple core and RAM tallies alone. Different enterprise applications demand fundamentally different hardware topologies: SAP HANA requires strict 1:1 NUMA memory channel balance and high RAM-per-core ratios; VMware VCF requires high core density and balanced OCP networking; AI/LLM inference requires PCIe lane bandwidth and GPU auxiliary power; while High-Frequency Trading requires max clock frequencies over core counts. This skill profiles the customer's Workload DNA and arbitrates contested hardware resources to ensure optimal application performance.

---

## 🕒 When to Call This Skill (Trigger Conditions)

Activate this skill whenever:
1. **Application-Driven Inquiries**: Customer mentions a specific enterprise software stack: *"Size a server for SAP HANA"*, *"We are deploying VMware Cloud Foundation 5.x"*, *"Hardware recommendation for 500 VDI users"*, *"Cluster for LLM fine-tuning and inference"*.
2. **Performance Optimization Requests**: Customer asks how to maximize memory bandwidth, eliminate NUMA bottlenecks, or choose between 1DPC and 2DPC memory.
3. **Contested Resource Collisions**: Customer BOQ has conflicting hardware selections (e.g. requesting 2x OCP NICs while also selecting an OCP storage controller `MR408i-o` on a chassis with only 1 OCP slot).

---

## 📍 Where This Fits in the Presales Process

- **Execution Phase**: **Phase 1 (Intent & Workload Profiling)** and **Phase 2 (Contested Resource Arbitration)**.
- **Upstream Trigger**: Receives application specs from [`presales-query-router`](../presales-query-router/SKILL.md) or raw item lists from [`boq-eval-skill`](../boq-eval-skill/SKILL.md).
- **Downstream Handoff**: Feeds optimized hardware role constraints to [`rfp-sizing-synthesizer`](../rfp-sizing-synthesizer/SKILL.md) and [`value-engineering-skill`](../value-engineering-skill/SKILL.md).

---

## 🔬 The 6 Enterprise Workload DNA Profiles

The profiling engine (`workload_dna.js`) classifies workloads into 6 distinct profiles:

| Workload Profile | Primary Constraint | Optimal Hardware Topology | Key Rules Enforced |
|:---|:---|:---|:---|
| **SAP HANA / In-Memory DB** | Extreme RAM-per-core ratio ($\ge 16\text{GB/core}$), uniform NUMA memory latency. | 1DPC DDR5-6400 (16 DIMMs populated across 16 channels), identical memory capacity per socket. | Never configure 2DPC or asymmetric memory; enforce 1DPC max bus speed. |
| **Virtualization / VMware VCF** | High vCPU density, 10/25/100GbE networking, core licensing optimization (`INV-28`). | Dual Xeon 6700-series processors (64–128 cores total), redundant OCP 3.0 dual-port NICs, 16-port Tri-Mode RAID controller. | Calculate total physical socket cores for VMware vSphere licensing base minimums. |
| **VDI (Virtual Desktop)** | Predictable RAM allocation per desktop (8–16GB/user), fast NVMe read IOPS, high core counts. | Dual Xeon 32/48-core processors, 512GB–1024GB RAM, NVMe Read-Intensive SSDs. | Size memory to guarantee $8\text{GB}$ dedicated RAM per concurrent user + $20\%$ hypervisor headroom. |
| **AI / ML Inference (LLMs)** | High PCIe lane bandwidth, GPU auxiliary power, high-RPM thermal cooling. | NVIDIA L40S or H100 NVL GPUs, PCIe Gen5 risers, High-Performance Fan Kits (`P48820-B21`), $\ge 1600\text{W}$ Titanium PSUs. | Mandate GPU Aux Power Cable Kits (`P48816-B21`) and enforce 200V–240V high-line utility power. |
| **Microsoft SQL / OLTP** | High single-thread clock speed ($>3.0\text{GHz}$ base/turbo), write-intensive cache-protected storage. | Intel Xeon frequency-optimized processors (e.g. 6730P), Tri-Mode controller with 8GB cache + capacitor backup (`P01366-B21`), Mixed-Use SSDs. | Enforce write-back cache protection on controllers and balance cores for SQL core-pack licensing. |
| **HPC / High-Frequency Trading** | Maximum memory bus bandwidth, low latency, liquid cooling. | Direct Liquid Cooling (DLC) tube kits (`P62038-B21`), 1DPC DDR5 memory, single-rank RDIMMs. | Prevent any thermal throttling; ensure DLC loops are verified. |

---

## ⚖️ Cross-Subsystem Contested Resource Arbitration (`resource_arbitrator.js`)

When disparate subsystem components collide for shared physical slots, the resource arbitrator enforces these dynamic resolutions:

### 1. OCP 3.0 Slot Collision (Storage Controller vs Network Adapter)
- **Problem**: Customer selects both an OCP Storage Controller (`MR408i-o`) and an OCP NIC (`Broadcom 57414 2-port 25GbE OCP3`), but the chassis only has 1 primary OCP slot.
- **Arbitration Action**:
  - Automatically **pivots the storage controller** to PCIe Standup (`MR416i-p` `P47777-B21`), freeing OCP Slot 1 to preserve 100% of requested networking bandwidth.
  - Automatically pivots storage cabling from OCP direct (`P48918-B21`) to PCIe splitter (`P48832-B21`).

### 2. Boot Device vs Standup PCIe Expansion Contention
- **Problem**: Customer selects NS204i-p PCIe boot controller while all PCIe slots are occupied by FC HBAs and NICs.
- **Arbitration Action**:
  - Automatically pivots boot controller to **Internal/Rear-Bay NS204i-u** NVMe Boot Device, freeing the physical PCIe slot for high-bandwidth I/O.

### 3. AI / Accelerator Server GPU Density & NVLink Bridge Arbitration (DL380a Gen12) (`INV-84`)
- **Problem**: Customer requests "max number of GPUs" or "max number of H200s" on the DL380a Gen12 chassis. The general chassis platform datasheet lists up to 10 double-wide (10DW) slots, but NVIDIA H200 NVL can be deployed with or without physical NVLink bridges.
- **Arbitration Action (True Rank 1 Parallel Sub-Paths `INV-84`)**:
  - Rather than making a rigid assumption that H200 *must* always have NVLink bridges, the engine synthesizes **two valid, 100% buildable parallel sub-paths**:
  - **Rank 1A (Interconnect-Optimized AI Training Tier — 8x H200 with NVLink)**:
    - **Architecture**: 8x NVIDIA H200 NVL (`S3U30C`) seated on dual switchboards (`P74714-B21`) under **8DW Mode (`P75008-B21`)**.
    - **Interconnect**: Inter-GPU **NVLink Bridges (`S4A90C`/`S4A91C`)** providing **900 GB/s bidirectional bandwidth**.
    - **Best For**: Distributed model training, 3D tensor parallelism (Megatron-LM), and latency-critical all-reduce operations.
    - **Memory**: 1,128 GB HBM3e VRAM per node ($8 \times 141\text{GB}$).
  - **Rank 1B (Density-Optimized Inference Tier — 10x H200 PCIe Maximum Density)**:
    - **Architecture**: **10x NVIDIA H200 NVL (`S3U30C`)** seated in **10DW Mode (`P75005-B21`)** using the **10DW Captive Riser Kit (`P76929-B21`)** and dual switchboards (`P74714-B21`).
    - **Interconnect**: Pure PCIe Gen5 x16 (64 GB/s) communication over the switchboard backplane. **NVLink bridges are omitted** because QuickSpecs states *"10DW configuration does not support GPU NVL bridges."*
    - **Mandatory Dependencies**: Requires **5x GPU 16-pin cable kits (`P74700-B21`)**, **1x Front Fan Module Kit (`P79656-B21`)**, **1x Front Panel Kit (`P79660-B21`)**, and **8x 3200W/2400W Titanium PSUs**.
    - **Best For**: Maximum throughput LLM inference (vLLM, TensorRT-LLM multi-model serving), decoupled worker pipelines, image/video generation (Flux/Diffusion), and batch token processing.
    - **Memory**: **1,410 GB HBM3e VRAM per node ($10 \times 141\text{GB}$)** — **+282 GB (+25%) VRAM and +25% raw GPU compute** per server.
- **Presales Benefit**: Presenting both Rank 1A and Rank 1B empowers the presales architect to walk the customer through the exact trade-off between **inter-GPU interconnect speed** vs. **raw compute/VRAM capacity**.

---

## 💻 CLI Commands & Direct Execution

### 1. Extract Workload DNA from an Existing BOM
```bash
node -e "
const { extractWorkloadDna } = require('./scripts/lib/conflict/workload_dna.js');
const items = [
  { sku: 'P74573-B21', quantity: 2, description: 'Intel Xeon 6730P 2.5GHz 32-core 250W Processor' },
  { sku: 'P69728-B21', quantity: 16, description: 'HPE 64GB DDR5-6400 Registered Smart Memory' }
];
const dna = extractWorkloadDna(items);
console.log('Workload DNA Profile:', dna.primaryWorkload);
console.log('Total Cores:', dna.totalCores, 'Total RAM:', dna.totalMemoryGb + 'GB', 'GB/Core:', dna.gbPerCore);
"
```

---

## 📋 Standardized Output Contract (What to Report)

When presenting Workload DNA insights, include:
```
====================================================================
🧬 WORKLOAD DNA & APPLICATION SIZING PROFILE
====================================================================
• Classified Workload : SAP HANA / IN-MEMORY DATABASE
• Compute Architecture: Dual Socket (64 Cores Total, 2.5GHz Base / 3.8GHz Turbo)
• Memory Topology     : 1024 GB Total across 16 Channels (1DPC DDR5-6400 MT/s)
• Memory/Core Ratio   : 16.0 GB per Physical Core (Optimal In-Memory Sizing)
• NUMA Node Symmetry  : PASSED (Uniform 512GB per Socket across 8 channels each)
• Storage IO Profile  : MIXED-USE (Write-Back Cache with 96W Smart Capacitor)
• Resource Arbitration: Storage Controller pivoted to PCIe standup (MR416i-p)
                        preserving OCP Slot 1 for Dual-Port 25GbE Networking.
====================================================================
```
