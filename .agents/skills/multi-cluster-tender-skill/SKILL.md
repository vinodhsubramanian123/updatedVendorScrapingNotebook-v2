---
name: multi-cluster-tender-skill
description: Use this skill to decompose large, aggregated customer tender RFQs (>1 server, multi-node requests, multi-tier Web/App/DB architectures, or multi-sheet workbooks) into homogeneous, 100% buildable server clusters. Computes Diophantine cluster multipliers, datacenter rack layout (42U rack counts), peak facility power envelopes (kW), high-line utility derating, and rail kit coverage.
---

# Multi-Cluster Tender Sizing & Decomposition Skill (`multi-cluster-tender-skill`)

**Purpose**: Real-world enterprise customer RFQs and tenders rarely ask for a single standalone server. They typically aggregate multiple node types (e.g. 40x General Compute nodes + 16x Database nodes + 4x GPU AI nodes) into a single spreadsheet or quote. This skill enables the Antigravity agent to autonomously decompose complex multi-server tenders into distinct, homogeneous, 100% buildable configurations, evaluate each cluster independently, and synthesize total datacenter facility infrastructure (rack units, 42U rack counts, peak power kW, and rail kits).

---

## 🕒 When to Call This Skill (Trigger Conditions)

Activate this skill whenever the customer inquiry matches ANY of these criteria:
1. **Multi-Server Multiplier**: Customer specifies $>1$ server (e.g., *"Provide solution for 60x DL380 Gen12 servers"*, *"We need 12 database nodes and 24 application nodes"*).
2. **Aggregated Multi-Chassis Spreadsheet**: The uploaded BOQ workbook contains multiple server models, multiple chassis types, or multiple distinct CPU SKUs in the same BOM.
3. **Multi-Sheet Tender Workbook**: The workbook contains multiple sheets with different configuration sets (e.g. `Compute Cluster`, `Storage Tier`, `Management Nodes`).
4. **Facility Infrastructure Request**: Customer asks for datacenter footprint metrics: Total Rack Units (RU), 42U Rack Count, Peak Power Draw (kW), Utility derating, or Rail Kit coverage (`INV-20`, `INV-29`).

---

## 📍 Where This Fits in the Presales Process

- **Execution Phase**: **Phase 0 (Intake & Tender Pre-Processing)** and **Phase 6 (Datacenter Facility Sizing)**.
- **Upstream Trigger**: Receives raw multi-server tender from user or [`presales-query-router`](../presales-query-router/SKILL.md).
- **Downstream Handoff**: Passes discrete atomic cluster workbooks to [`boq-eval-skill`](../boq-eval-skill/SKILL.md) for 7-aspect physical math verification, then receives evaluated clusters back to synthesize datacenter rack and power totals.

---

## ⚙️ Core Algorithmic Capabilities & CLI Tools

### 1. Diophantine Multiplier Factorization (`multi_cluster_splitter.js`)
When an aggregated quote arrives without explicit node counts (e.g., a single line item shows 128 CPUs, 1024 DIMMs, and 48 storage controllers):
- The engine solves the integer equation:
  $$\text{Total CPUs} = \sum_{i=1}^{k} N_i \times \text{SocketsPerChassis}_i$$
- Identifies cluster boundaries by grouping distinct processor TDPs and core counts.
- Proportionally distributes memory, storage controllers, and boot devices across the factored clusters.

### 2. Multi-Line Description SKU Unpacking
Vendor quotes often pack companion accessories into the description of a parent chassis or CPU cell (e.g. a single cell reading: *"DL380 Gen12 8SFF with 2x P74573-B21, 16x P69728-B21, 1x P47777-B21"*).
- The splitter scans multi-line cells using regex `\b([A-Z0-9]{3,8}-[A-Z0-9]{3,4})\b`, extracts individual accessory SKUs, and multiplies their quantities by the cluster chassis multiplier.

### 3. Datacenter Facility Infrastructure Sizing Matrix (`INV-29`)
For any cluster where $N > 1$:
1. **Total Rack Units (RU)**:
   $$\text{Total RU} = \sum (\text{ServerCount}_i \times \text{ChassisRU}_i)$$
   *(e.g., 60x DL380 Gen12 2U nodes = 120 RU)*.
2. **Standard 42U Rack Count**:
   $$\text{Rack Count} = \left\lceil \frac{\text{Total RU}}{42 - \text{PDU/Cable Management Headroom (e.g. 4RU)}} \right\rceil = \left\lceil \frac{120}{38} \right\rceil = 4 \text{ Racks}$$
3. **Peak Facility Power Envelope**:
   $$\text{Peak kW} = \frac{\sum (\text{ServerCount}_i \times \text{PSU Wattage} \times \text{PSU Count})}{1000}$$
4. **High-Line 200V–240V Utility Power Derating**:
   If estimated node power draw exceeds $800\text{W}$, alert the customer to derate below 110V/120V circuits and mandate high-line 200V–240V C13/C14 PDUs (`INV-29`).
5. **Rail Kit Coverage**:
   Injects exactly 1x Easy Install Rail Kit (`P52341-B21` or `P73325-B21`) per physical server node.

---

## 💻 CLI Commands & Direct Execution

### 1. Partition an Aggregated Multi-Cluster Workbook into Discrete Workbooks
```bash
# Decomposes an aggregated tender Excel sheet into individual cluster workbooks
node -e "
const { splitAndWriteClusterWorkbooks } = require('./scripts/lib/boq/multi_cluster_splitter.js');
const res = splitAndWriteClusterWorkbooks('path/to/tender.xlsx', 'outputs/temp/');
console.log('Total Servers:', res.totalChassis, 'Clusters:', res.clusterCount);
res.workbooks.forEach(w => console.log('  ->', w.clusterName, w.multiplier + 'x', w.filePath));
"
```

### 2. Parallel Evaluation Across Multiple Clusters / Sheets
```bash
# Evaluates multi-sheet or multi-cluster tender in parallel
npm run eval:multi -- path/to/tender.xlsx --json
```

---

## 📋 Standardized Output Contract (What to Present to the Customer)

When completing a multi-cluster tender evaluation, the agent MUST present:
1. **Cluster Partitioning Summary Table**:
   - Cluster Name (e.g. `Cluster #1: High-Compute DB Nodes`, `Cluster #2: Standard App Nodes`)
   - Node Count ($N$)
   - Processor Model & Core Count per Node
   - RAM per Node & Total Cluster RAM
   - Per-Node CapEx & Extended Cluster CapEx
2. **Datacenter Facility Infrastructure Sizing Box**:
   - **Standard Enterprise Compute Example (60x DL380 Gen12 2U Nodes)**:
   ```
   ====================================================================
   🏢 DATACENTER FACILITY & POWER ENVELOPE SIZING (60x NODES TOTAL)
   ====================================================================
   • Total Rack Space Required : 120 RU
   • Standard 42U Racks Needed : 4 Racks (allowing 30 RU usable per rack)
   • Peak Facility Power Draw  : 96.0 kW (based on dual 1600W PSUs per node)
   • Utility Power Requirement : High-line 200V–240V PDU circuits (C13/C14)
   • Rail Kit Coverage         : 60x HPE Easy Install Rail Kits (P52341-B21)
   • Server Management         : 60x HPE iLO Advanced Licenses included
   ====================================================================
   ```
   - **High-Density AI GPU Cluster Example (20x DL380a Gen12 TensorScale Nodes with 8x H200 NVL)**:
   ```
   ====================================================================
   🤖 AI ACCELERATOR FACILITY & POWER ENVELOPE SIZING (20x DL380a NODES)
   ====================================================================
   • Total Server Count        : 20 Nodes (160x NVIDIA H200 NVL GPUs)
   • Total Rack Space Required : 40 RU (20x 2U Chassis)
   • Physical Rack Footprint   : 1x 42U Rack (Physical) / 2-4 Racks (Power-Distributed)
   • Per-Node Power Capacity   : 19.2 kW (8x 2400W Titanium PSUs in 4+4 Redundancy)
   • Facility Peak Power Draw  : 384 kW Nameplate / ~120 kW Steady-State Training
   • Thermal & PDU Mandate     : High-density 3-phase 415V/480V PDUs (IEC 60309)
   • Interconnect & Cabling    : 80x GPU 16-pin power kits (P74700-B21), 40x Switchboards (P74714-B21)
   • Rail Kit Coverage         : 20x HPE Easy Install Rail Kits (P52341-B21)
   ====================================================================
   ```
3. **Discrete 7-Aspect Certification for EACH Cluster**:
   Confirm that every individual cluster passes 100% buildability with 0 errors before presenting the overall tender solution.
