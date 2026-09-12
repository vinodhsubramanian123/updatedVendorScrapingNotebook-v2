# HPE AI Studio — Master Running Knowledge & Learnings Charter

**Document Classification:** Canonical Ground-Truth Architecture & Validation Charter  
**Maintained By:** HPE ProLiant AI Studio Autonomous Knowledge Engine (Antigravity AI)  
**Last Synchronized:** 2026-09-12T12:32:53.576Z  
**Total Deduplicated Learned Rules:** 165  
**Universal Invariant Compliance:** INV-1 through INV-38 Certified  
**Google Drive Destination:** `shared_folder_id: 1YR0lBh-gg00amKHRxuOqp5Aea3iL5O7-`

---

## Table of Contents
1. [Executive Summary & Architectural Philosophy](#1-executive-summary--architectural-philosophy)
2. [Universal Cross-Platform Hardware Laws & Invariants](#2-universal-cross-platform-hardware-laws--invariants)
3. [Chassis-by-Chassis Deep-Dive Knowledge Matrix & Blueprints](#3-chassis-by-chassis-deep-dive-knowledge-matrix--blueprints)
   - [HPE ProLiant Compute DL380 Gen12](#31-hpe-proliant-compute-dl380-gen12)
   - [HPE ProLiant Compute DL380a Gen12 (AI Accelerator Server)](#32-hpe-proliant-compute-dl380a-gen12-ai-accelerator-server)
   - [HPE ProLiant DL380 Gen11](#33-hpe-proliant-dl380-gen11)
   - [HPE ProLiant DL145 Gen11 (Edge Server)](#34-hpe-proliant-dl145-gen11-edge-server)
   - [HPE ProLiant DL580 Gen12 (Mission-Critical 4P Server)](#35-hpe-proliant-dl580-gen12-mission-critical-4p-server)
   - [HPE StoreEver MSL3040 Tape Library](#36-hpe-storeever-msl3040-tape-library)
   - [HPE Alletra Storage MP, Synergy 12000 & Cray Supercomputing](#37-hpe-alletra-storage-mp-synergy-12000--cray-supercomputing)
4. [Catalog Vendor Solution Architecture Blueprint (v6 Core & v7 Foundations)](#4-catalog-vendor-solution-architecture-blueprint-v6-core--v7-foundations)
5. [Deduplicated Learned Rule Ledger & Verification Provenance](#5-deduplicated-learned-rule-ledger--verification-provenance)

---

## 1. Executive Summary & Architectural Philosophy

The **HPE AI Studio BOQ Evaluator & Conflict Resolution Engine** maintains a dual-brain paradigm combining a deterministic local Rule Engine with an Agentic RAG guardrail grounded in live vendor configuration data.

### 1.1 Non-Destructive Continuous Learning Contract (INV-13)
- **Zero Blind Deletions**: Historical rules and domain insights are never pruned or lost when updating.
- **Composite Key Matching**: Learned rules match on `(scope, chassis, category, affectedSku, dependencySku, summary)`.
- **Bidirectional Grounding**: Any newly added notes, validation guides, or customer trial discoveries in Google NotebookLM notebooks are automatically ingested into this running document and synchronized back to Google Drive and NotebookLM.

### 1.2 Core Sourcing Paradigm: Stateless Compute vs. Local Boot
- **Stateless Compute (Bare-Minimum Budget)**: Eliminates front drive cages, RAID controllers, and Smart Storage Batteries. Boots over SAN (Fibre Channel/iSCSI) or PXE fabric, achieving minimal procurement footprint.
- **Local Boot (Operational Resilience)**: Integrates dedicated rear-facing NS204i-u hardware RAID1 boot devices, preserving front drive bays for high-density storage backplanes and Tri-Mode RAID controllers with battery protection.

---

## 2. Universal Cross-Platform Hardware Laws & Invariants

| Category | Law / Invariant | Enforcement & Technical Rationale |
| :--- | :--- | :--- |
| **Option Placement** | **INV-25: Multi-Chassis Container Tree** | Components inside Configure-to-Order (CTO) base chassis must carry Factory-Integrated Option tags (`#0D1` / `-F21`). Standalone BTO (`-B21`) components placed in CTO containers fail factory CLIC validation (Rules 81354490 & 91001655). |
| **Processors & Thermal** | **TDP Redline & Heatsink Selection** | Single processors with TDP ≤ 185W run on standard heatsinks. Single processors with TDP > 185W up to 350W strictly mandate Performance Heatsinks. |
| **Cooling & Fans** | **High-Performance Fan Threshold** | Standard 4-fan cooling is capped at 240W system-wide. High-Performance Fan Kits are strictly required when: CPU TDP ≥ 240W, cabled NVMe storage is configured, or dual-processor (2P) configurations are deployed. |
| **Memory Channels** | **8-Channel Symmetrical Interleaving** | Intel Xeon 6 memory controllers mandate population in balanced blocks of 8 or 16 DIMMs per CPU (1DPC at 6400 MT/s, 2DPC throttled to 6000 MT/s). Asymmetrical quantities disable interleaving and incur severe throughput degradation. |
| **Memory Restrictions** | **Zero Rank & Monolithic Mixing** | Mixing of x4 and x8 memory is prohibited. Mixing standard planar RDIMMs with 3DS RDIMMs is prohibited. 96GB/128GB densities are mutually exclusive. 16GB RDIMMs are restricted strictly to 1DPC. |
| **Power Infrastructure** | **INV-30: EU ErP Lot 9 & Platinum PSUs** | European Union ErP Lot 9 mandates 96% Titanium power supplies. Platinum PSUs (94%) deployed outside Europe require the `P35876-B21` CE Mark Removal FIO Enablement Kit ($1.00 list) to bypass regulatory blocks cleanly. |
| **Power Redundancy** | **Zero PSU Model Mixing** | Mixing different PSU wattages, efficiencies, or part numbers in a single chassis is strictly prohibited. |
| **Storage Controllers** | **INV-26: Tri-Mode Port Channel Math** | 8-port controllers (MR408i / MR216i) address maximum 8 physical drives directly. Configurations exceeding 8 drives on a single controller require SAS Expander (`P48835-B21`) or Tri-Mode Switch (`P55806-B21`). |
| **Storage Enablement** | **Motherboard Telemetry Bridge & Battery** | Tri-Mode RAID controllers (MR416i-p) carry-over to Gen12 require Storage Controller Enablement Cables (`P48918-B21`) for sideband telemetry and 96W Smart Storage Batteries (`P01366-B21`) for write-cache protection. |
| **GPU Power & Cabling** | **INV-27: 16-Pin Auxiliary Power Envelope** | High-wattage PCIe GPUs require dedicated 16-pin (12VHPWR / CEM 5.0) power cables and mandate redundant power supplies (≥1600W/2400W) with high-performance cooling. |
| **OS Core Licensing** | **INV-28: Physical Core Multiplier** | Microsoft Windows Server (16 cores/server min) and VMware vSphere (16 cores/socket min) require base licenses plus add-on packs to equal or exceed total server cores. |
| **Facility Infrastructure**| **INV-29: Multi-Node Sizing Matrix** | Synthesizes Rack Units, 42U rack counts, facility kW load, rail kit coverage (`P52341-B21`), and 200V-240V utility power derating protection. |
| **Support Contract** | **INV-32: Split Care Pack Parenthood** | Support contracts must be split into Parent Contract SKU (`HU4B2A3` Tech Care Basic) and Child Serial Mapping SKU (`HU4B2A30C4V` for DL380 Gen12), both matching server node quantity. |
| **Cloud SaaS Gate** | **Gen12 Cloud Management Mandate** | Gen12 orders require valid management software. Standard commercial 3-Year Upfront SaaS (`R7A11AAE`, $450.00) is the optimal compliant selection; discontinued iLO Advanced standalone (`512485-B21`) is barred. |

---

## 3. Chassis-by-Chassis Deep-Dive Knowledge Matrix & Blueprints

### 3.1 HPE ProLiant Compute DL380 Gen12
- **Architecture**: 2U dual-socket enterprise server powered by Intel Xeon 6 Series (P-Cores and E-Cores) with 8-channel DDR5-6400 memory.
- **Base Models**: 8SFF NC (`P73282-B21`, lowest-cost entry), 24SFF (`P73283-B21`), 12LFF (`P73284-B21`), 8LFF (`P73285-B21`), EDSFF (`P73286-B21`).
- **The 6 Sourcing FIO Overrides & Bypasses**:
  1. **Storage Bypass**: `873763-B21` No Drive FIO Kit ($14.00) clears the unbuildable bare-chassis block and strips redundant drive cage and storage controller requirements.
  2. **ErP Lot 9 Regulatory Bypass**: `P35876-B21` CE Mark Removal FIO Kit ($1.00) disables the Lot 9 Titanium efficiency block outside the EU, enabling economical 800W Platinum PSUs (`P38995-B21`).
  3. **Thermal Tracking Bypass**: `P79558-B21` 25C Max Ambient Temp Tracking ($1.00) establishes standard baseline, clearing smart chassis errors without forcing $972 High-Performance Fan Kits (`P48820-B21`).
  4. **Localization Gate**: `P73325-B21` Localization FIO Kit ($4.00) defines regional defaults to clear baseline physical gates.
  5. **Cloud Management Gate**: `R7A11AAE` COM Standard 3-Year Upfront SaaS ($450.00) satisfies software mandate.
  6. **Cabling Optimization**: Stand-up PCIe NIC (`P51178-B21`, $485.00) slots directly into primary riser, bypassing rear OCP3 enablement cables (`P72203-B21`, $77.00).
- **Intel Xeon 6 Channel Lead Times**:
  - **Immediate Availability (Excellent)**: 6505P (12C/150W), 6507P (8C/150W), 6515P (16C/150W), 6520P (24C/210W), 6530P (32C/225W), 6710E (64C/205W), 6740E (96C/250W), 6730P (32C/250W).
  - **Standard Channel (Good)**: 6517P, 6728P, 6527P, 6731E, 6714P, 6746E, 6736P, 6724P, 6740P, 6732P, 6737P, 6745P, 6760P, 6747P, 6738P, 6767P, 6787P.
  - **Special Order (45+ Days)**: 6766E, 6748P, 6768P, 6788P.

### 3.2 HPE ProLiant Compute DL380a Gen12 (AI Accelerator Server)
- **Architecture**: 4U specialized dual-socket platform housing front-loading accelerator bays supporting up to 10 Double-Wide (DW) or 16 Single-Wide (SW) GPUs.
- **iLO 7 Base Chassis Mandate**: Base chassis `P76706-B21` (with iLO 7) is strictly mandatory for Intel Xeon 6 P-Core processors. Base chassis `P74461-B21` (with iLO 6) blocks all P-Core processors.
- **Dual-Socket Mandate**: Motherboard architecture strictly enforces 2 CPUs. Single-socket configurations fail factory build.
- **GPU Mode Flag (Rule 81016813)**: Requires exactly 1 GPU Mode SKU. Selecting `P75002-B21` defines 4 Double-Wide captive cabling.
- **Front Riser Envelope (Rule 81016845)**: Selecting `P75002-B21` mandates Quantity: 2 of `P74685-B21` (2DW Captive Riser) to complete physical framing. This does **not** force ordering 4 GPUs.
- **GPU Auxiliary Power Optimization**: Standalone GPU 16-pin cable kit `P83526-B21` (Quantity: 1) powers 2x DW GPUs cleanly, bypassing the FIO cable trap (`P74700-B21`, which forces Qty: 2 at $228 list) and saving $195.
- **5-PSU Power Rule**: Configurations with 2 or 4 DW GPUs mandate minimum 5x 2400W Titanium PSUs (`P67252-B21`) with 5x C19 power cords (`P78384-B21`) — bays 1-2 for system board, bays 3-5 dedicated to GPUs.
- **OCPA Cable Trap**: Deselecting `P74694-B21` ($75) when using stand-up PCIe NIC (`P26262-B21`) saves budget without error.

### 3.3 HPE ProLiant DL380 Gen11
- **Architecture & Compute**: 2U dual-socket platform powered by 4th and 5th Gen Intel Xeon Scalable Processors (Sapphire Rapids / Emerald Rapids).
- **Processor Generation Memory Gating**: QuickSpecs and platform rules enforce that DDR5-4800 memory kits (`P50311-B21` / `P50312-B21`) are supported strictly with 4th Gen Intel Xeon processors. 5th Gen Intel Xeon processors strictly require DDR5-5600 memory (`P64707-B21`). Incompatible with Gen12 DDR5-6400 memory controllers.
- **Enablement Cable Naming Ambiguity Resolved**: `P48918-B21` is officially titled "HPE ProLiant DL360 Gen11 Storage Controller Enablement Cable Kit" in QuickSpecs, but is the exact mandatory cable required on DL380 Gen11 to connect write-cache battery/capacitor (`P01366-B21` / `P02377-B21`) to Tri-Mode storage controllers (`P47777-B21` / `P58335-B21`). The engine preserves this mapping and does not reject it as a DL360-only part.
- **Dynamic Pricing Baseline (INV-34)**: While unbundled active catalog scrapes showed $0.00 across 489/509 SKUs, the engine dynamically resolves Global List Prices (GPL) via `getHistoricalSkuPrice()` and `price_history.json`, preserving commercial truth.
- **Obsolete Badge & Description Sanitization (INV-35)**: Vendor description concatenations (e.g. `Product is obsolete: P74218-B21...`) are stripped via regex, isolating obsolete components cleanly into the Discontinued SKU registry.
- **EU ErP Lot 9 & Platinum PSUs**: Dual-socket high TDP configurations mandate 96% Titanium power supplies (`P44712-B21` / `P03178-B21`). When deploying 94% Platinum PSUs (`P38997-B21` / `P38995-B21`) globally/non-EU, the `P35876-B21` CE Mark Removal Kit must be selected.
- **Thermal & Environmental Redlines**: High-Performance Heatsink `P48818-B21` mandated for CPU TDP > 150W; High-Performance Fan Kit `P48820-B21` mandated for CPU TDP > 205W, all 2P dual-processor builds, and 100Gb/400Gb NICs at 25°C ambient.

### 3.4 HPE ProLiant DL145 Gen11 (Edge Server)
- **Architecture**: 1U compact edge server powered exclusively by single-socket AMD EPYC 8004 Series processors (`P69258-B21` through `P69263-B21`, 8C to 64C, 80W-200W).
- **CTO Memory Suffix Translation**: Base CTO chassis `P71964-B21` rejects standalone BTO memory `P503xx-B21` (triggering Rule 81212137 CLIC blocks). The engine translates to Factory-Integrated Option (FIO) `P503xx-F21` automatically.
- **5 Verified Hardware Co-Dependencies**:
  1. **PCIe Riser Mandate**: Selecting Slot 1 FHFL Riser (`P71991-B21`) strictly requires Slot 2 FHFL Riser (`P71989-B21`).
  2. **Fan Kit Mandate**: Selecting 4EDSFF Drive Cage (`P71985-B21`) or 6EDSFF Cable Kit (`P71981-B21`) strictly mandates Quantity: 4 of 2U Performance Fan Kit (`P72581-B21`).
  3. **Boot Device Enablement**: Selecting NS204i-u boot device (`P48183-B21` / `P81160-B21`) strictly mandates NS204i-u Enablement Kit (`P71992-B21`).
  4. **Storage Controller Enablement**: Selecting MR408i-o controller (`P58335-B21`) strictly requires 4EDSFF controller cable kit (`P72002-B21`) and Smart Storage capacitor (`P65038-B21`).
  5. **GPU Accelerator Enablement**: Double-wide GPUs (L40S `S2L70C`, RTX Pro 4500 `S6W30C`) strictly require 1U Heatsink Kit (`P72580-B21`), GPU Cable Kit (`P71995-B21`), and GPU Air Baffle Kit (`P73002-B21`).
- **Support Contract Structure**: Parent contract `HU4B3A3` ($0.00 wrapper line at Qty: 1) and child hardware service `HU4B3A3011M` (matches total server node quantity).
- **Slot Capacity & Saturation**: Exactly 3 PCIe slots + 1 OCP slot; validates against over-subscription.
- **vSAN ReadyNode ESA**: Tracking SKU `P63226-B21` mandates direct-attached NVMe storage and prohibits hardware RAID controllers (`P58335-B21`).

### 3.5 HPE ProLiant DL580 Gen12 (Mission-Critical 4P Server)
- **Architecture**: 4U enterprise mission-critical scale-up platform supporting 4 Intel Xeon 6 Scalable processors (`P74508-B21`, `P74509-B21`, `P73835-B21`, `P73838-B21`, up to 86C/350W per socket) connected via UPI cross-fabric links.
- **Power Grid Redundancy**: Quad-power supply redundant grid (N+N or N+2 redundancy) with mandatory high-line 200V-240V AC feeds. Raw catalog table notes stating "max 2" apply to single electrical zones; production 4P configurations require 4 PSUs.
- **CPU & Riser Exclusivity**: 4P Mezzanine Enablement Kit (`P80445-B21`) is mutually exclusive with UPI 2P Cable Kit (`P80383-B21`) and 2P Air Baffle Kit (`P80441-B21`).
- **Memory Riser Scaling**: Supports up to 64 physical DIMM slots across 4 memory riser boards. Mandates symmetrical 8-channel interleaving and prohibits mixing RDIMM capacities (`P69728-F21` 64GB, `P69729-F21` 96GB, `P69730-F21` 128GB, `P73447-F21` 256GB 3DS).
- **Storage Cabling & Gen5 Controllers**:
  - Direct-attach backplane cable kits: `P80384-B21` (2P 8SFF), `P80396-B21` (4P 8SFF), `P80397-B21` (4P 16SFF).
  - Tri-Mode backplane cable kits: `P80387-B21` (2P/4P 8SFF Tri-Mode), `P80411-B21` (4P 24EDSFF Tri-Mode), `P80749-B21` (4P 32SFF Tri-Mode 32i).
  - Gen5 SPDM controller `P75697-B21` (MR932i-p x32 Lanes) and MR416 data retention cable `P80426-B21`.
- **Cloud Management SaaS Gate**: Mandates `R7A11AAE` (Compute Ops Management 3-Year Upfront SaaS, $450.00); standalone iLO Advanced (`BD505A`, `512485-B21`) is barred.

### 3.6 HPE StoreEver MSL3040 Tape Library
- **Architecture**: 3U modular tape automation system scaling from 32 slots (base module `Q2R41A`) up to 280 slots across 15 expansion modules (`Q6Q63A`).
- **Drive Line Items & Connectors**: Half-height LTO-9 SAS drive (`R6Q75A`), LTO-8 SAS (`Q6Q68A`), LTO-9 FC (`R6Q76A`), and LTO-8 FC (`Q6Q69A`).
- **Power Redundancy**: Base module includes 1 internal power supply; redundant operation or >2 drive modules requires Upgrade Power Supply Kit `Q6Q64A`.
- **Host-to-Drive Interconnect**:
  - SAS: External Mini-SAS HD (SFF-8644) to Mini-SAS (SFF-8088) cables (`716191-B21` 2m, `716193-B21` 4m) or 4-lane fanout cables (`K2R10A` / `P35176-B21`) to connect external host HBAs (e.g. `804398-B21` E208e-p or `P95072-B21` E208e-p Gen12).
  - Fibre Channel: Premier Flex LC-LC OM4 cables (`QK732A` 1m to `QK737A` 50m) and 8Gb/16Gb FC transceivers (`AJ716B`).
- **CTO Base SKU Clarification**: Base CTO Chassis SKU is `Q2R41A` (HPE StoreEver MSL3040 Base Module CTO Chassis).
- **Encryption**: MSL Tape Library Encryption Kit (`AM495A`) provides library-managed hardware encryption.

### 3.7 HPE Alletra Storage MP, Synergy 12000 & Cray Supercomputing
- **Alletra Storage MP (Disaggregated Array Architecture)**:
  - **Internal Configurator SKUs**: `581817-B21` (Configurator Defined Build Instruction Option), `ZU715A` (Virtual Rack Service), `AC114A` (Medium Logistic Service), and factory `#B01` cable rack-sequencing instruction.
  - **Disaggregated Tree Parentage**: Virtual Rack (`ZU715A`) -> Base Config (`S1R06A`) -> Chassis Enclosures (`R7C75A`) -> Controller Nodes (`R7D03A`) -> Host HBAs (`S2S64A` 32Gb FC / `R7C82A` 10/25GbE) -> SFPs/Transceivers (`S3N85A` FC / `Q2P65A` SFP+) -> NVMe Expansion Shelves (`S1J10A`) -> SSDs (`R9H68A` 7.68TB Self-Encrypting FIPS NVMe).
  - **Backend Cabling Math (Rule 81129529)**:
    - Performance Optimized (1-8 JBOFs): `(4 * controllerNodes) + (4 * expansionShelves)`.
    - Capacity Optimized (9-16 JBOFs / ArcusOS 10.4.0+): `(4 * controllerNodes) + (2 * expansionShelves)`.
  - **HBA Transceiver Port Saturation (Rule 81128935)**: Hard block requiring Min: 2 / Max: 4 transceivers per HBA (zero empty host ports).
  - **License Synchronization**: ArcusOS LTUs (`S3Q02A`) and Cloud SaaS (`S3Q02AAE`) must match in term (3, 4, or 5 years) and raw TB capacity.
- **Synergy 12000 Frame & VC 100Gb F32 Module**:
  - **Fan Kit Mandate**: 10x High-Capacity Fan Kit (`P51175-B21`) mandatory for Gen11/Gen12 compute modules in Frame `P51174-B21`.
  - **Dual Slot PSU Adapter**: `P44074-B21` required for 1800W-2200W Flex Slot Titanium PSUs (`P44712-B21`), installed in pairs.
  - **Mezzanine to Interconnect Bay Mapping**: Mezz 1 -> Bays 1 & 4; Mezz 2 -> Bays 2 & 5; Mezz 3 -> Bays 3 & 6.
  - **100Gb VC Module `867796-B21` Transceiver Breakout**: Supports 100GbE, 4x25GbE, or 4x32GbFC via QSFP28 transceiver `882251-B21`.
- **Cray GX5000 Rack**: Liquid-cooled high-density exascale supercomputing infrastructure.

---

## 4. Catalog Vendor Solution Architecture Blueprint (v6 Core & v7 Foundations)

The Catalog Vendor Solution provides modular, AI-assisted catalog ingestion, normalization, indexing, and comparison:
- **Core Pipeline**: Ingest → Normalize → Semantic → Assemble → Index → Search → Catalog Comparison → Explain → Promotion.
- **Typed IPC Contracts**: Governed by strict Zod schemas (`CATALOG_INGEST`, `CATALOG_ASSEMBLE`, `CATALOG_INDEX`, `CATALOG_SEARCH`, `CATALOG_COMPARE`).
- **Hybrid Search Engine**: Query-aware blending: `score = α * BM25F + β * cosine_similarity`, dynamically adjusting weights based on SKU-like vs descriptive query features.
- **Human-in-the-Loop Rule Mining**: Captures validation alerts and API signals during harvest flows, proposing candidate rules for analyst review.
- **Streaming UX Envelopes**: Consistent `UxEnvelope<T>` state streaming (`pending`, `running`, `partial`, `success`, `error`) with progress reporting and cache provenance.

---

## 5. Deduplicated Learned Rule Ledger & Verification Provenance

Total verified rules indexed in this build: **165**.

| Scope | Target Chassis | Category | Affected SKU | Dependency SKU | Rule Summary / Validation Directive | Verifications |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| 📦 CHASSIS | `DL145_Gen11` | `PROCESSOR_FAMILY` | `P71964-B21` | `—` | DL145 Gen11 is single-socket AMD EPYC 8004 only. No dual-socket configurations supported. | 1x |
| 📦 CHASSIS | `DL145_Gen11` | `DRIVE_CAGE_FORMAT` | `P71985-B21` | `P77271-B21` | DL145 Gen11 uses EDSFF E3.S form factor drives only. Standard SFF/LFF drives are incompatible. | 1x |
| 📦 CHASSIS | `DL145_Gen11` | `PSU_WATTAGE_LIMIT` | `P71964-B21` | `P54290-B21` | DL145 Gen11 supports maximum 1000W PSUs. 1600W/2400W PSUs are physically incompatible. | 1x |
| 📦 CHASSIS | `DL145_Gen11` | `EXTENDED_AMBIENT_TRACKING` | `P71964-B21` | `P73021-B21` | DL145 Gen11 edge deployments use P73021-B21 for extended -5C to 45C ambient temperature tracking. | 1x |
| 🏛️ FAMILY | `DL380_Gen11` | `ARCHITECTURE_BASELINE` | `PORTAL` | `P52534-B21` | If PORTAL is present, P52534-B21 is mandatory. | 1x |
| 🌐 UNIVERSAL | `DL380_Gen11` | `ARCHITECTURE_BASELINE` | `PORTAL` | `P64707-B21` | If PORTAL is present, P64707-B21 is mandatory. | 1x |
| 🏛️ FAMILY | `DL380_Gen11` | `ARCHITECTURE_BASELINE` | `PORTAL` | `—` | Portal validation flagged restriction on PORTAL. | 1x |
| 🏛️ FAMILY | `DL380_Gen11` | `ARCHITECTURE_BASELINE` | `PORTAL` | `P58335-B21` | If PORTAL is present, P58335-B21 is mandatory. | 1x |
| 📦 CHASSIS | `DL380_Gen11` | `CARRY_OVER_VALIDATED` | `P48183-B21` | `—` | P48183-B21`)** [cite: 250] is fully supported | 1x |
| 🏛️ FAMILY | `DL380_Gen11` | `PHYSICAL_ATTACH_REQUIREMENT` | `P48832-B21` | `P48814-B21` | If P48832-B21 (Tri-Mode Splitter Cable) is selected, P48814-B21 (8SFF U.3 Premium Cage) is mandatory. | 1x |
| 🏛️ FAMILY | `DL380_Gen11` | `PHYSICAL_POWER_ENABLEMENT` | `P02377-B21` | `P48918-B21` | If P02377-B21 / P01366-B21 (Capacitor/Battery) is selected, P48918-B21 (Storage Controller Enablement Cable Kit) is mand | 1x |
| 🏛️ FAMILY | `DL380_Gen11` | `MUTUAL_EXCLUSIVITY` | `P51911-B21` | `P48830-B21` | P51911-B21 and P48830-B21 cannot be selected together. Retain P48830-B21. | 1x |
| 🏛️ FAMILY | `DL380_Gen11` | `RISER_SLOT_ENABLEMENT` | `P48803-B21` | `P56073-B21` | When 5+ PCIe cards are installed, P56073-B21 Primary Cable Kit is mandatory for Primary Riser Slot 1. | 1x |
| 🏛️ FAMILY | `DL380_Gen11` | `REGULATORY_ENABLEMENT` | `P38997-B21` | `P35876-B21` | When ordering Platinum PSUs (P38997-B21) on high-draw dual-socket configurations, P35876-B21 (CE Mark Removal Kit) is re | 1x |
| 🏛️ FAMILY | `DL380_Gen11` | `DEPENDENCY_CHAIN` | `P02377-B21` | `P48918-B21` | P02377-B21` or `P01366-B21` **mandates the inclusion of `P48918-B21 | 1x |
| 📦 CHASSIS | `DL380_Gen11` | `DEPENDENCY_CHAIN` | `P58335-B21` | `P48918-B21` | P58335-B21`)** with the **Smart Storage Hybrid Capacitor (`P02377-B21`)** strictly requires `P48918-B21 | 1x |
| 📦 CHASSIS | `DL380_Gen11` | `DEPENDENCY_CHAIN` | `write-cach` | `P48918-B21` | write-cache backup for `P58335-B21`; requires enablement cable **`P48918-B21 | 1x |
| 🏛️ FAMILY | `DL380_Gen12` | `STORAGE_OVERRIDE` | `873763-B21` | `—` | When 873763-B21 is present, bypass physical drive cage, storage controller, and battery minimums. | 1x |
| 🏛️ FAMILY | `DL380_Gen12` | `LOCALIZATION_GATE` | `P73282-B21` | `P73325-B21` | If Gen12 CTO base chassis is selected, P73325-B21 is mandatory for portal buildability. | 1x |
| 🏛️ FAMILY | `DL380_Gen12` | `MANAGEMENT_LICENSING` | `P73282-B21` | `R7A11AAE` | Gen12 requires exactly 1 management SaaS license (R7A11AAE). Remove redundant BD505A when R7A11AAE is selected. | 1x |
| 🏛️ FAMILY | `DL380_Gen12` | `POWER_BYPASS` | `P38995-B21` | `P35876-B21` | If Platinum PSUs are selected on Gen12, P35876-B21 clears EU Lot 9 CE prompts. | 1x |
| 📦 CHASSIS | `DL380_Gen12` | `THERMAL_TRACKING` | `P73282-B21` | `P79558-B21` | P79558-B21 tracks 25C ambient baseline for Gen12 chassis. | 1x |
| 🏛️ FAMILY | `DL380_Gen12` | `COOLING_MANDATE` | `P74507-B21` | `P48820-B21` | CPUs > 185W TDP mandate High-Performance Fan Kit P48820-B21 and High-Performance Heatsink P74792-B21. | 1x |
| 📦 CHASSIS | `DL380_Gen12` | `DEPENDENCY` | `HU4B2A30C4V` | `P73282-B21` | Every HPE ProLiant DL380 Gen12 server (P73282-B21) requires a hardware maintenance support contract. Common customer err | 1x |
| 🏛️ FAMILY | `DL380_Gen12` | `ARCHITECTURE_BASELINE` | `P76453-B21` | `—` | Portal validation flagged restriction on P76453-B21. | 1x |
| 📦 CHASSIS | `DL380_Gen12` | `ARCHITECTURE_BASELINE` | `P73282-B21` | `P73282-B21` | If P73282-B21 is present, P73282-B21 is mandatory. | 1x |
| 📦 CHASSIS | `DL380_Gen12` | `ARCHITECTURE_BASELINE` | `P74573-B21` | `P74573-B21` | If P74573-B21 is present, P74573-B21 is mandatory. | 1x |
| 📦 CHASSIS | `DL380_Gen12` | `ARCHITECTURE_BASELINE` | `P48820-B21` | `P48820-B21` | If P48820-B21 is present, P48820-B21 is mandatory. | 1x |
| 📦 CHASSIS | `DL380_Gen12` | `ARCHITECTURE_BASELINE` | `P69728-B21` | `P69728-B21` | If P69728-B21 is present, P69728-B21 is mandatory. | 1x |
| 📦 CHASSIS | `DL380_Gen12` | `ARCHITECTURE_BASELINE` | `P47777-B21` | `P47777-B21` | If P47777-B21 is present, P47777-B21 is mandatory. | 1x |
| 📦 CHASSIS | `DL380_Gen12` | `ARCHITECTURE_BASELINE` | `P01366-B21` | `P01366-B21` | If P01366-B21 is present, P01366-B21 is mandatory. | 1x |
| 📦 CHASSIS | `DL380_Gen12` | `ARCHITECTURE_BASELINE` | `P03178-B21` | `P03178-B21` | If P03178-B21 is present, P03178-B21 is mandatory. | 1x |
| 🏛️ FAMILY | `DL380_Gen12` | `ARCHITECTURE_BASELINE` | `P76449-B21` | `P76450-B21` | Portal validation flagged restriction on P76450-B21. | 1x |
| 📦 CHASSIS | `DL380_Gen12` | `PREPROCESSING_SPLIT_CONFIRMED` | `NONE` | `—` | Confirmed configuration variation reason 'WORKLOAD_NODE_PURPOSE' for config_1 | 1x |
| 📦 CHASSIS | `DL380_Gen12` | `ARCHITECTURE_BASELINE` | `P74573-B21` | `P74792-B21` | Intel Xeon 6730P 250W CPU requires HPE ProLiant Compute DL380 Gen12 Performance Heat Sink Kit (P74792-B21) due to exceed | 1x |
| 📦 CHASSIS | `DL380_Gen12` | `ARCHITECTURE_BASELINE` | `P74573-B21` | `P48820-B21` | Intel Xeon 6730P 250W CPU requires HPE ProLiant High Performance Fan Kit (P48820-B21) because it exceeds the 240W system | 1x |
| 🏛️ FAMILY | `DL380_Gen12` | `ARCHITECTURE_BASELINE` | `P69728-F21` | `DDR5-6400` | If P69728-F21 is present, DDR5-6400 is mandatory. | 1x |
| 🏛️ FAMILY | `DL380_Gen12` | `OPTION_TYPE_SUBSTITUTION` | `P69728-B21` | `P69728-F21` | / **`P69728-B21`** / HPE 64GB (1x64GB) Dual Rank x4 DDR5-6400 Smart Memory Kit / Memory / RDIMM (BTO) / **❌ BLOCKED in C | 1x |
| 🏛️ FAMILY | `DL380_Gen12` | `DEPENDENCY_CHAIN` | `P75740-B21` | `873763-B21` | / **`P75740-B21`** / HPE DL3XX Gen12 8SFF x1 U.3 Tri-Mode Drive Cage Kit / Smart Chassis / Drive Cage / **✅ Valid Front  | 1x |
| 📦 CHASSIS | `DL380_Gen12` | `DEPENDENCY_CHAIN` | `P28586-B21` | `P75740-B21` | / **`P28586-B21`** / HPE 1.2TB SAS 12G 10K SFF BC 3yr Wty HDD / Storage / SFF SAS HDD / **✅ Valid SAS HDD** / 12G SAS 10 | 1x |
| 📦 CHASSIS | `DL380_Gen12` | `DEPENDENCY_CHAIN` | `P51083-B21` | `P74573-B21` | / **`P51083-B21`** / HPE ProLiant DL380 Gen11 2U x16/x16/x16 Secondary Riser Kit / PCIe Expansion / Secondary Riser / ** | 1x |
| 🏛️ FAMILY | `DL380_Gen12` | `DEPENDENCY_CHAIN` | `P47777-B21` | `P01366-B21` | / **`P47777-B21`** / HPE MR416i-p Gen11 x16 Lanes 8GB Cache PCI SPDM Storage Controller / Storage Controller / Tri-Mode  | 1x |
| 🏛️ FAMILY | `DL380_Gen12` | `DEPENDENCY_CHAIN` | `P28586-B21` | `P40430-B21` | Connecting SAS hard drives (`P28586-B21` and `P40430-B21`) in the 8SFF drive cage (`P75740-B21`) to the MR416i-p storage | 1x |
| 🏛️ FAMILY | `DL380_Gen12` | `DEPENDENCY_CHAIN` | `P76453-B21` | `P75740-B21` | 4.  **High-Speed Backplane Data Cable (`P76453-B21`):** Routing SAS/SATA/NVMe data lanes from Box 1 or Box 2 backplanes  | 1x |
| 🏛️ FAMILY | `DL380_Gen12` | `OPTION_TYPE_SUBSTITUTION` | `P64707-B21` | `P69728-F21` | / **`P64707-B21`** / HPE 64GB 2Rx4 DDR5-5600 Registered Memory / Memory / RDIMM / **❌ Incompatible Gen11 Memory** / Gen1 | 1x |
| 📦 CHASSIS | `DL380_Gen12` | `DEPENDENCY_CHAIN` | `P48818-B21` | `P38995-B21` | / **`P48818-B21`** / HPE 800W Flex Slot Platinum Hot Plug Power Supply / Power Supplies / **❌ Invalid SKU & Lack of Redu | 1x |
| 🏛️ FAMILY | `DL380_Gen12` | `DEPENDENCY_CHAIN` | `P75740-B21` | `P75741-B21` | 2.  **Drive Cage Required:** You must add an **8SFF x1 U.3 Tri-Mode Drive Cage Kit (`P75740-B21`)** or an **8SFF x4 U.3  | 1x |
| 📦 CHASSIS | `DL380_Gen12` | `CARRY_OVER_VALIDATED` | `P47777-B21` | `—` | / **P47777-B21** / HPE MR416i-p Gen11 Storage Controller / **✅ VALID** / This PCIe plug-in controller is fully supported | 1x |
| 🏛️ FAMILY | `DL380_Gen12` | `DEPENDENCY_CHAIN` | `P01366-B21` | `P48918-B21` | / **P01366-B21** / HPE 96W Smart Storage Battery / **✅ VALID** / Fully compatible battery to protect the MR416i-p's vola | 1x |
| 📦 CHASSIS | `DL380_Gen12` | `DEPENDENCY_CHAIN` | `P10180-B21` | `P72203-B21` | / **P10180-B21** / Broadcom BCM5719 1Gb 4p BASE-T OCP3 NIC / **❌ OBSOLETE** / Legacy Gen11 part number [8]. It also **re | 1x |
| 🏛️ FAMILY | `DL380_Gen12` | `DEPENDENCY_CHAIN` | `P74573-B21` | `P48820-B21` | • [DL380_Gen12 Catalog Rule] Category: Learned Feedback Rules > P74573-B21 / Constraint: learned (Intel Xeon 6730P 250W  | 1x |
| 📦 CHASSIS | `DL380_Gen12` | `DEPENDENCY_CHAIN` | `P74573-B21` | `P74792-B21` | • [DL380_Gen12 Catalog Rule] Category: Learned Feedback Rules > P74573-B21 / Constraint: learned (Intel Xeon 6730P 250W  | 1x |
| 🏛️ FAMILY | `DL380_Gen12` | `ARCHITECTURE_BASELINE` | `P10180-B21` | `P51181-B21` | P10180-B21 is obsolete Gen11 SKU for DL380 Gen12; replaced by P51181-B21 with mandatory OCP rear cable kit P72203-B21. | 1x |
| 📦 CHASSIS | `DL380_Gen12` | `DEPENDENCY_CHAIN` | `P76453-B21` | `P48918-B21` | 3.  **Storage Cable Integration:** The inclusion of `P76453-B21` is correct for routing PCIe lanes from SFF drive cages  | 1x |
| 📦 CHASSIS | `DL380a_Gen12` | `STORAGE_COLLISION` | `P74710-B21` | `—` | DL380a prohibits mixing 4SFF cage P74710-B21 and 4EDSFF cage P74712-B21. | 1x |
| 📦 CHASSIS | `DL380a_Gen12` | `PROCESSOR_POPULATION` | `P76706-B21` | `—` | DL380a Gen12 requires two identical processor models; single-processor and mixed-processor configurations are unsupporte | 1x |
| 📦 CHASSIS | `DL380a_Gen12` | `POWER_REDUNDANCY` | `P76706-B21` | `—` | Use exactly five power supplies for 2DW/4DW GPU configurations and eight for 8DW/10DW; H100/H200 NVL supports 2400W P672 | 1x |
| 🏛️ FAMILY | `SY480_Gen12` | `STARTUP_SERVICE_FORMULA` | `HA124A1` | `HA124A1#5ZM` | Onsite Frame Startup requires exactly 1x HA124A1#5ZM + (TotalFrames - 1)x HA124A1#5ZQ. Purge all HA124A1#V0F lines when  | 1x |
| 🏛️ FAMILY | `SY480_Gen12` | `HARDWARE_SUPPORT_1TO1` | `867796-B21` | `HU4B2A3#Z1R` | Qty of HU4B2A3#Z1R must exactly equal qty of 867796-B21 (VC SE 100Gb F32 Module). | 1x |
| 🏛️ FAMILY | `SY480_Gen12` | `HARDWARE_SUPPORT_1TO1` | `872957-B21` | `HU4B2A3#Z1Q` | Qty of HU4B2A3#Z1Q must exactly equal qty of 872957-B21 (Synergy Composer2 Management Appliance). | 1x |
| 🏛️ FAMILY | `SY480_Gen12` | `HARDWARE_SUPPORT_1TO1` | `P77653-B21` | `HU4B2A30BU5` | Qty of HU4B2A30BU5 must exactly equal qty of P77653-B21 (Brocade 64Gb FC Switch Module). | 1x |
| 🏛️ FAMILY | `SY480_Gen12` | `HARDWARE_SUPPORT_1TO1` | `P68217-B21` | `HU4B2A30BT7` | Qty of HU4B2A30BT7 must exactly equal qty of P68217-B21 (HPE SY480 Gen12 Compute Module). | 1x |
| 📦 CHASSIS | `SY480_Gen12` | `DECOUPLING` | `HA124A1` | `HU4B2A3` | HPE Synergy quoting requires strict decoupling of two independent service domains: (1) HU4B2A3 — ongoing Point-of-Sale h | 1x |
| 📦 CHASSIS | `SY480_Gen12` | `EXCLUSION` | `HA124A1#V0F` | `HA124A1#5ZM` | Remote startup (HA124A1#V0F) and Onsite startup (HA124A1#5ZM) are mutually exclusive delivery models for Synergy frame d | 1x |
| 📦 CHASSIS | `GLOBAL` | `DIAGNOSTIC` | `P73282-B21` | `HA124A1#5ZM` | In multi-icon OCA solutions (Icon Separation mode), CLIC Rule 81039677 ("Installation and Startup must be quoted for ALL | 1x |
| 📦 CHASSIS | `SY480_Gen12` | `ISOLATION` | `HU4B2A3` | `—` | When applying support services in OCA multi-icon solutions, NEVER check "Apply displayed install/support to all icons in | 1x |
| 📦 CHASSIS | `GLOBAL` | `PROCEDURE` | `HU4B2A3` | `—` | When OCA CLIC Rules 99916598/99916599 persist after correcting support quantities, the stale rules cache must be flushed | 1x |
| 📦 CHASSIS | `SY480_Gen12` | `PLACEMENT` | `HA124A1#5ZM` | `HA124A1#5ZQ` | Synergy startup services (HA124A1#5ZM First Frame Onsite, HA124A1#5ZQ Additional Frame Onsite) must be placed ONLY at th | 1x |
| 🌐 UNIVERSAL | `GLOBAL` | `ERROR_DIAGNOSTIC_ATTRIBUTION` | `SOLUTION_TREE_ITEM_0100_01` | `—` | When Rule 81039677 occurs on multi-icon tenders, trace errors to individual child icon containers instead of modifying t | 1x |
| 🌐 UNIVERSAL | `GLOBAL` | `ICON_SUPPORT_ISOLATION` | `HU4B2A3` | `—` | Configure support services independently per icon container. Never broadcast support attributes across diverse product f | 1x |
| 🌐 UNIVERSAL | `GLOBAL` | `SESSION_RECOVERY_PROTOCOL` | `HU4B2A3` | `—` | Flush corrupted OCA support session state by toggling to 'No Support' before reapplying 3Y Tech Care Basic. | 1x |
| 📦 CHASSIS | `DL380_Gen12` | `POWER_ENVIRONMENT` | `P73282-B21` | `P74503-B21` | 2. Certified Bare-Minimum Bill of Materials (BOM) This BOM contains the absolute minimal hardware, licensing, and 3-Year | 1x |
| 📦 CHASSIS | `DL380_Gen12` | `STORAGE_TOPOLOGY` | `873763-B21` | `P01366-B21` | 1. Storage Bypass: No Drive FIO Kit ( 873763-B21 ) — $14.00 Physical Logic: The DL380 Gen12 SFF NC chassis ships with co | 1x |
| 📦 CHASSIS | `DL380_Gen12` | `POWER_ENVIRONMENT` | `P35876-B21` | `P38995-B21` | 2. EU ErP Lot 9 Compliance: CE Mark Removal Kit ( P35876-B21 ) — $1.00 Physical Logic: Under European Union ErP Lot 9 po | 1x |
| 📦 CHASSIS | `DL380_Gen12` | `MEMORY_CHANNEL` | `P79558-B21` | `P48820-B21` | 3. Thermal Tracking: 25C Max Ambient Temp tracking ( P79558-B21 ) — $1.00 Physical Logic: Gen12 "Smart Chassis" rules ma | 1x |
| 📦 CHASSIS | `DL380_Gen12` | `POWER_ENVIRONMENT` | `P73325-B21` | `—` | 4. Localization Gate: Localization FIO Kit ( P73325-B21 ) — $4.00 Physical Logic: The OCA portal throws an unbuildable h | 1x |
| 📦 CHASSIS | `DL380_Gen12` | `STORAGE_TOPOLOGY` | `S1A05A` | `512485-B21` | 5. Cloud Management Gate: 3-Year Upfront Standard SaaS ( R7A11AAE ) — $450.00 Physical Logic: The partner portal enforce | 1x |
| 📦 CHASSIS | `DL380_Gen12` | `SUPPORT_SERVICES` | `HU4B2A3` | `HU4B2A30C4V` | 4. Support Contract Realignment (Basic Care Split) To ensure smooth partner-led deal registrations and regional quoting  | 1x |
| 📦 CHASSIS | `DL380_Gen12` | `POWER_ENVIRONMENT` | `P49145-B21` | `873763-B21` | -B21 ) are prohibited. [ ] TDP Redline: The single processor TDP remains at or below 240W to utilize standard standard h | 1x |
| 📦 CHASSIS | `DL380_Gen12` | `POWER_ENVIRONMENT` | `P73282-B21` | `P74503-B21` | 2. Expanded Local Boot & RAID Expansion BOM (v3.0) This cabled configuration expands the minimal stateless host to inclu | 1x |
| 🌐 UNIVERSAL | `GLOBAL` | `POWER_ENVIRONMENT` | `879543-B21` | `—` | Catalog Functionality Solution Design Catalog Vendor Solution — Unified Blueprint v6 (Catalog-only) Part 01 — Executive  | 1x |
| 🌐 UNIVERSAL | `GLOBAL` | `STORAGE_TOPOLOGY` | `879543-B21` | `—` | 10.3 Artifacts (written under the run) comparison.items.json Roboto Mono — one row per requested pair (compact result fo | 1x |
| 🌐 UNIVERSAL | `GLOBAL` | `PHYSICAL_ARCHITECTURE` | `879543-B21` | `—` | 10.4 Left/Right input examples (what UI sends) // Example request the UI sends when user hits "Compare" in the table { " | 1x |
| 🌐 UNIVERSAL | `GLOBAL` | `STORAGE_TOPOLOGY` | `879543-B21` | `—` | 10.5 Logs & diagnostics [CC] request left="part:HPE:879543-B21" right="part:Dell:HBA330" compReq=true tol=0.10 [CC] guar | 1x |
| 🌐 UNIVERSAL | `GLOBAL` | `PCIE_ACCELERATOR` | `879543-B21` | `—` | 14.3 Substitute curation & suggestion Curated links From vendor statements (“Replaced by 879543-B21”) → create substitut | 1x |
| 🌐 UNIVERSAL | `GLOBAL` | `PCIE_ACCELERATOR` | `879543-B21` | `870549-B21` | - saveJson: "harvest/prices.jsonl" Appendix E — JSON Artifact Examples // E.1 raw.tables.jsonl (one line) { "page": 7, " | 1x |
| 🌐 UNIVERSAL | `GLOBAL` | `MEMORY_CHANNEL` | `R8W51A` | `—` | Catalog Tab Functionality Catalog Vendor Solution v6 & v7 Unified Blueprint Executive Summary The Catalog Vendor Solutio | 1x |
| 🌐 UNIVERSAL | `GLOBAL` | `MEMORY_CHANNEL` | `P07623-B21` | `R8W51A` | - harvest: preferNetwork: true tableSelectorRef: "grid.root" columns: sku: "td:nth-child(1)" title: "td:nth-child(2)" pr | 1x |
| 🌐 UNIVERSAL | `GLOBAL` | `POWER_ENVIRONMENT` | `R8W51A` | `P07623-B21` | 0.5 Balanced hybrid (default) α/β are configurable in tunables.json Roboto Mono or via UI sliders. The system now uses D | 1x |
| 🏛️ FAMILY | `GLOBAL` | `MEMORY_CHANNEL` | `P07623-B21` | `R8W51A` | 6.1 Output Example { "leftSku": "P07623-B21", "rightSku": "R8W51A", "label": "Qty Mismatch", "qtyL": 2, "qtyR": 4, "simi | 1x |
| 🌐 UNIVERSAL | `GLOBAL` | `POWER_ENVIRONMENT` | `P07623-B21` | `R8W51A` | 0.97 UI renders sparkline charts and a “Perf Timeline”. 9️⃣ Key Performance Indicators (KPIs) The system actively tracks | 1x |
| 🌐 UNIVERSAL | `GLOBAL` | `POWER_ENVIRONMENT` | `R8W51A` | `P07623-B21` | 0.9 – 1.0 Auto Apply Execute instantly; log confirmation Confidence = weighted blend of model probability, historical ac | 1x |
| 🌐 UNIVERSAL | `GLOBAL` | `MEMORY_CHANNEL` | `P07623-B21` | `—` | - promote 13️⃣ Playbook Validation Schema enforced via Zod before execution: const PlaybookSchema = z.object({ meta: z.o | 1x |
| 🌐 UNIVERSAL | `GLOBAL` | `POWER_ENVIRONMENT` | `P07623-B21` | `—` | - step: crud operation: "update" entity: "part" data: vendor: "HPE" sku: "P07623-B21" changes: { price: 320 } Executed m | 1x |
| 🌐 UNIVERSAL | `GLOBAL` | `POWER_ENVIRONMENT` | `P07623-B21` | `—` | 0.7–0.9 Ask user confirmation Log Only <0.7 No action; store for analysis Clarification UX AI: “Detected Smart Array P84 | 1x |
| 📦 CHASSIS | `DL380a_Gen12` | `SUPPORT_SERVICES` | `P74461-B21` | `P76706-B21` | 1.2 Base CTO Chassis Selection: The iLO 6 vs. iLO 7 P-Core Mandate HPE offers two primary Configure-To-Order (CTO) base  | 1x |
| 📦 CHASSIS | `DL380a_Gen12` | `SUPPORT_SERVICES` | `P74507-B21` | `—` | 2.1 "Xeon Gold" Equivalence & Sizing In the Intel® Xeon® 6 generation, the traditional multi-tier nomenclature (Bronze,  | 1x |
| 📦 CHASSIS | `DL380a_Gen12` | `PCIE_ACCELERATOR` | `P76706-B21` | `P79656-B21` | 2.2 Thermal & Fan Subsystem Constraints Baseline Cooling Infrastructure: Base CTO chassis P76706-B21 ships standard with | 1x |
| 📦 CHASSIS | `DL380a_Gen12` | `STORAGE_TOPOLOGY` | `P74685-B21` | `P74710-B21` | 4. Front Cage Mechanical & Riser Architecture: The 2DW vs. 4DW Framework Understanding the mechanical framing of the DL3 | 1x |
| 📦 CHASSIS | `DL380a_Gen12` | `STORAGE_TOPOLOGY` | `P75002-B21` | `P75008-B21` | Rule 81016813: The base chassis requires at least Minimum 1 and Maximum 1 GPU Mode SKU per server. The Mode SKU: P75002- | 1x |
| 📦 CHASSIS | `DL380a_Gen12` | `STORAGE_TOPOLOGY` | `P74685-B21` | `P75002-B21` | 4.2 The Front Riser Dependency: P74685-B21 Part Number: P74685-B21 (HPE ProLiant DL380a Gen12 2DW Captive Riser FIO Kit) | 1x |
| 📦 CHASSIS | `DL380a_Gen12` | `POWER_ENVIRONMENT` | `P74700-B21` | `P83526-B21` | 5.3 The Configurator Trap & The Optimization The FIO Trap ( P74700-B21 ): In OCA, because P74700-B21 is an FIO-only kit  | 1x |
| 📦 CHASSIS | `DL380a_Gen12` | `POWER_ENVIRONMENT` | `P67252-B21` | `P76706-B21` | 6.1 The 5-PSU Mandatory Threshold The DL380a Gen12 power backplane features 6 power supply bays. +---------------------- | 1x |
| 📦 CHASSIS | `DL380a_Gen12` | `STORAGE_TOPOLOGY` | `P74710-B21` | `P74702-B21` | 7.1 Front Storage Cages & Mandatory Data Cabling Default Cage: The base chassis requires a primary storage cage, default | 1x |
| 📦 CHASSIS | `DL380a_Gen12` | `STORAGE_TOPOLOGY` | `P76706-B21` | `P50216-B21` | 7.2 The "Zero Physical Drives" Advisory Warning Configurator Behavior: When zero physical SSDs are in the order, CLIC/OC | 1x |
| 📦 CHASSIS | `DL380a_Gen12` | `PCIE_ACCELERATOR` | `P74694-B21` | `—` | 8.1 The OCPA Cable Kit ( P74694-B21 ) Trap The Phenomenon: When building a CTO server, OCA automatically populates P7469 | 1x |
| 📦 CHASSIS | `DL380a_Gen12` | `POWER_ENVIRONMENT` | `S3U30C` | `S2L70C` | 10. Accelerator Technical Comparison: NVIDIA H200 NVL vs. NVIDIA L40S Architectural Attribute NVIDIA H200 NVL ( S3U30C ) | 1x |
| 📦 CHASSIS | `DL380a_Gen12` | `POWER_ENVIRONMENT` | `P76706-B21` | `P75002-B21` | 11. End-to-End Bill of Materials (BOM) Comparison Matrix The table below reflects the final, verified, conflict-free Bil | 1x |
| 📦 CHASSIS | `DL380a_Gen12` | `PCIE_ACCELERATOR` | `P76706-B21` | `P75002-B21` | Rule 81016813 Unbuildable Error Base chassis P76706-B21 ordered without a GPU Mode SKU. Add P75002-B21 (HPE DL380a Gen12 | 1x |
| 📦 CHASSIS | `DL380a_Gen12` | `POWER_ENVIRONMENT` | `P74685-B21` | `P75002-B21` | Rule 81016845 Unbuildable Error Selecting P74685-B21 (2DW Captive Riser) requires P75002-B21 . Add P75002-B21 as a line  | 1x |
| 📦 CHASSIS | `Alletra_Storage_System` | `PHYSICAL_ARCHITECTURE` | `581817-B21` | `—` | - **Rule:** If Virtual Rack `ZU715A` is configured, `581817-B21` is mandatory. | 1x |
| 📦 CHASSIS | `Alletra_Storage_System` | `PHYSICAL_ARCHITECTURE` | `S1R06A` | `R9F76A` | - **Rule:** If `S1R06A` is present, `R9F76A` count must equal the calculated formula. | 1x |
| 📦 CHASSIS | `Alletra_Storage_System` | `PHYSICAL_ARCHITECTURE` | `R7C82A` | `S2S64A` | - **Hard Block:** Every host-facing HBA (`R7C82A` 10/25GbE or `S2S64A` 32Gb FC) mandates a **Minimum of 2 and Maximum of | 1x |
| 📦 CHASSIS | `Alletra_Storage_System` | `PHYSICAL_ARCHITECTURE` | `R7C82A` | `Q2P65A` | - **Rule:** If `R7C82A` is present, `Q2P65A` must be between 2 and 4 per HBA. | 1x |
| 📦 CHASSIS | `Alletra_Storage_System` | `SOFTWARE_LICENSING` | `S3Q02A` | `—` | - **Term & Capacity Lock:** ArcusOS LTUs (`S3Q02A`) and Software SaaS (`S3Q02AAE`) must match in term (3, 4, or 5 years) | 1x |
| 📦 CHASSIS | `DL145_Gen11` | `MEMORY_CHANNEL` | `P50311-B21` | `P50312-B21` | - **Rule:** Standalone BTO memory `P50311-B21` (32GB) or `P50312-B21` (64GB) inside CTO chassis `P71964-B21` triggers Ru | 1x |
| 📦 CHASSIS | `DL145_Gen11` | `PHYSICAL_ARCHITECTURE` | `P71964-B21` | `P50311-F21` | - **Rule:** If `P71964-B21` is present, `P50311-F21` is mandatory for factory integration. | 1x |
| 📦 CHASSIS | `DL145_Gen11` | `PHYSICAL_ARCHITECTURE` | `P71991-B21` | `P71989-B21` | - Selecting Slot 1 FHFL Riser (`P71991-B21`) strictly requires Slot 2 FHFL Riser (`P71989-B21`). | 1x |
| 📦 CHASSIS | `DL145_Gen11` | `PHYSICAL_ARCHITECTURE` | `P71991-B21` | `P71989-B21` | - **Rule:** If `P71991-B21` is present, `P71989-B21` is mandatory. | 1x |
| 📦 CHASSIS | `DL145_Gen11` | `STORAGE_TOPOLOGY` | `P71985-B21` | `P71981-B21` | - Selecting 4EDSFF Drive Cage (`P71985-B21`) or 6EDSFF Cable Kit (`P71981-B21`) strictly mandates Quantity: 4 of 2U Perf | 1x |
| 📦 CHASSIS | `DL145_Gen11` | `PHYSICAL_ARCHITECTURE` | `P71985-B21` | `P72581-B21` | - **Rule:** If `P71985-B21` is present, `P72581-B21` is mandatory. | 1x |
| 📦 CHASSIS | `DL145_Gen11` | `PHYSICAL_ARCHITECTURE` | `P48183-B21` | `P81160-B21` | - Selecting NS204i-u boot device (`P48183-B21` / `P81160-B21`) strictly mandates NS204i-u Enablement Kit (`P71992-B21`). | 1x |
| 📦 CHASSIS | `DL145_Gen11` | `PHYSICAL_ARCHITECTURE` | `P48183-B21` | `P71992-B21` | - **Rule:** If `P48183-B21` is present, `P71992-B21` is mandatory. | 1x |
| 📦 CHASSIS | `DL145_Gen11` | `PHYSICAL_ARCHITECTURE` | `P58335-B21` | `P72002-B21` | - Selecting MR408i-o storage controller (`P58335-B21`) strictly requires 4EDSFF controller cable kit (`P72002-B21`) and  | 1x |
| 📦 CHASSIS | `DL145_Gen11` | `PHYSICAL_ARCHITECTURE` | `P58335-B21` | `P72002-B21` | - **Rule:** If `P58335-B21` is present, `P72002-B21` is mandatory. | 1x |
| 📦 CHASSIS | `DL145_Gen11` | `PCIE_ACCELERATOR` | `S2L70C` | `S6W30C` | - Double-wide GPUs (NVIDIA L40S `S2L70C` or RTX Pro 4500 `S6W30C`) strictly require 1U Heatsink Kit (`P72580-B21`), GPU  | 1x |
| 📦 CHASSIS | `DL145_Gen11` | `PHYSICAL_ARCHITECTURE` | `S2L70C` | `P72580-B21` | - **Rule:** If `S2L70C` is present, `P72580-B21` is mandatory. | 1x |
| 📦 CHASSIS | `DL145_Gen11` | `SUPPORT_SERVICES` | `P73015-B21` | `P73027-B21` | - **Extended Temperature Operation:** Standard operating envelope is 5°C-35°C (`P73015-B21`). Rugged edge operation up t | 1x |
| 📦 CHASSIS | `DL145_Gen11` | `SUPPORT_SERVICES` | `HU4B3A3` | `HU4B3A3011M` | - **Care Pack Split:** Parent contract `HU4B3A3` ($0.00 wrapper line at Qty: 1) and child hardware service `HU4B3A3011M` | 1x |
| 📦 CHASSIS | `DL145_Gen11` | `PHYSICAL_ARCHITECTURE` | `HU4B3A3` | `HU4B3A3011M` | - **Rule:** If `HU4B3A3` is present, `HU4B3A3011M` is mandatory. | 1x |
| 📦 CHASSIS | `DL380_Gen11` | `MEMORY_CHANNEL` | `P50311-B21` | `P50312-B21` | - **DDR5-4800 vs. DDR5-5600 Gating:** QuickSpecs and platform memory controllers enforce that DDR5-4800 memory kits (`P5 | 1x |
| 📦 CHASSIS | `DL380_Gen11` | `MEMORY_CHANNEL` | `P64707-B21` | `—` | - **Rule:** If 5th Gen Intel Xeon is present, `P64707-B21` is mandatory. Mixing DDR5-4800 and DDR5-5600 memory in the sa | 1x |
| 📦 CHASSIS | `DL380_Gen11` | `MEMORY_CHANNEL` | `P64707-B21` | `P52534-B21` | - **CTO FIO Translation:** Standalone BTO memory `P64707-B21` inside CTO chassis (`P52534-B21`) requires translation to  | 1x |
| 📦 CHASSIS | `DL380_Gen11` | `PHYSICAL_ARCHITECTURE` | `P48918-B21` | `P01366-B21` | - **Resolution of Title Ambiguity:** `P48918-B21` is titled "HPE ProLiant DL360 Gen11 Storage Controller Enablement Cabl | 1x |
| 📦 CHASSIS | `DL380_Gen11` | `PHYSICAL_ARCHITECTURE` | `P47777-B21` | `P58335-B21` | - **Rule:** If `P47777-B21` or `P58335-B21` is present with battery `P01366-B21`, `P48918-B21` is mandatory. | 1x |
| 📦 CHASSIS | `DL380_Gen11` | `STORAGE_TOPOLOGY` | `P48835-B21` | `P55806-B21` | - **Direct-Attach Drive Capacity Limits (INV-26):** 8-port controllers directly attach up to 8 drives. Configurations ex | 1x |
| 📦 CHASSIS | `DL380_Gen11` | `POWER_ENVIRONMENT` | `P44712-B21` | `P03178-B21` | - **EU ErP Lot 9 Gate (INV-30):** High TDP configurations default to EU Lot 9 compliance, mandating 96% Titanium power s | 1x |
| 📦 CHASSIS | `DL380_Gen11` | `POWER_ENVIRONMENT` | `P38997-B21` | `P38995-B21` | - **Regulatory Bypass for Non-EU:** When ordering 94% Platinum power supplies (`P38997-B21` 1600W / `P38995-B21` 800W) f | 1x |
| 📦 CHASSIS | `DL380_Gen11` | `POWER_ENVIRONMENT` | `P38997-B21` | `P35876-B21` | - **Rule:** If Platinum PSU `P38997-B21` is configured, `P35876-B21` is mandatory for non-EU compliance. | 1x |
| 📦 CHASSIS | `DL380_Gen11` | `THERMAL_COOLING` | `P48818-B21` | `—` | - **Heatsink Redline:** High-Performance Heatsink `P48818-B21` is mandated for any CPU with TDP > 150W. | 1x |
| 📦 CHASSIS | `DL380_Gen11` | `THERMAL_COOLING` | `P48820-B21` | `—` | - **Fan Kit Redline:** High-Performance Fan Kit `P48820-B21` is mandated when: | 1x |
| 📦 CHASSIS | `DL380_Gen11` | `PHYSICAL_ARCHITECTURE` | `P48820-B21` | `—` | - **Rule:** If CPU TDP > 205W, `P48820-B21` is mandatory. | 1x |
| 🌐 UNIVERSAL | `DL380_Gen12` | `POWER_ENVIRONMENT` | `P64707-B21` | `P73300-B21` | SECTION 2: GEN11 VS. GEN12 COMPONENT ARCHITECTURE CONSTRAINTS Mixing components across server generations is a primary c | 1x |
| 📦 CHASSIS | `DL380_Gen12` | `POWER_ENVIRONMENT` | `P73282-B21` | `P73283-B21` | SECTION 3: SYSTEM COGNIZANCE & BASELINE CONFIGURATIONS HPE ProLiant Compute DL380 Gen12 servers are offered in five dist | 1x |
| 📦 CHASSIS | `DL380_Gen12` | `STORAGE_TOPOLOGY` | `P49145-B21` | `P74792-B21` | 2.0 GHz 350W $58,094.00 Special Order (45+ Days) Heatsink Thermal Selection Boundaries Standard Heatsink Kit ( P49145-B2 | 1x |
| 📦 CHASSIS | `DL380_Gen12` | `PHYSICAL_ARCHITECTURE` | `P69726-B21` | `—` | -B21 suffix, such as P69726-B21 ) are physically blocked . You must select the exact factory-integrated FIO (Factory-Int | 1x |
| 📦 CHASSIS | `DL380_Gen12` | `POWER_ENVIRONMENT` | `P38995-B21` | `P03178-B21` | SECTION 6: POWER REDUNDANCY & LOT 9 REGULATORY BYPASSES HPE ProLiant Gen12 servers support standard hot-plug Flex Slot p | 1x |
| 📦 CHASSIS | `DL380_Gen12` | `POWER_ENVIRONMENT` | `873763-B21` | `P47777-B21` | SECTION 7: STORAGE CABLE TOPOLOGY, RAID CONSTRAINTS, & OS BOOT The Core Conflict: 873763-B21 (No Drive) vs. MR416i-p Con | 1x |
| 📦 CHASSIS | `DL380_Gen12` | `SUPPORT_SERVICES` | `HU4B2A3` | `HU4B2A30C4V` | SECTION 8: SUPPORT SERVICES & CONTRACT REALIGNMENT To ensure partner portal pre-checks pass cleanly and local support SL | 1x |
| 📦 CHASSIS | `DL380_Gen12` | `STORAGE_TOPOLOGY` | `S1A05A` | `512485-B21` | SECTION 9: BASELINE CLOUD MANAGEMENT LICENSING MANDATE The HPE ProLiant Gen12 platform enforces a software-defined valid | 1x |
| 📦 CHASSIS | `DL380_Gen12` | `POWER_ENVIRONMENT` | `P49145-B21` | `P74792-B21` | -B21 suffix) are not populated. [ ] 8-Channel Symmetrical Interleaving: Registered memory modules are populated in balan | 1x |
| 📦 CHASSIS | `DL580_Gen12` | `POWER_ENVIRONMENT` | `P67252-B21` | `P44712-B21` | - **Resolution of Catalog Table Ambiguity:** Raw catalog table notes stating "max 2" apply only to single electrical sub | 1x |
| 📦 CHASSIS | `DL580_Gen12` | `PHYSICAL_ARCHITECTURE` | `P80445-B21` | `—` | - `P80445-B21` (HPE DL580 Gen12 4P Mezzanine Enablement Kit) is required for 4-socket configurations to link CPU mezzani | 1x |
| 📦 CHASSIS | `DL580_Gen12` | `PHYSICAL_ARCHITECTURE` | `P80445-B21` | `P80383-B21` | - **Rule:** If `P80445-B21` is present, `P80383-B21` is blocked. | 1x |
| 📦 CHASSIS | `DL580_Gen12` | `MEMORY_CHANNEL` | `P69728-F21` | `P69729-F21` | - **Rule:** RDIMM mixing across capacities is prohibited (`P69728-F21` 64GB, `P69729-F21` 96GB, `P69730-F21` 128GB, `P73 | 1x |
| 📦 CHASSIS | `DL580_Gen12` | `POWER_ENVIRONMENT` | `P80426-B21` | `—` | - `P80426-B21` (DL580 Gen12 MR416 Controller Data Retention Power Cable Kit) is mandatory when configuring MR416i contro | 1x |
| 📦 CHASSIS | `DL580_Gen12` | `PHYSICAL_ARCHITECTURE` | `P47777-B21` | `P80426-B21` | - **Rule:** If `P47777-B21` is present on DL580 Gen12, `P80426-B21` is mandatory. | 1x |
| 📦 CHASSIS | `MSL3040_Tape` | `STORAGE_TOPOLOGY` | `R6Q75A` | `Q6Q68A` | - **Rule:** If SAS tape drive `R6Q75A` or `Q6Q68A` is selected, host SAS cabling is mandatory. | 1x |
| 📦 CHASSIS | `MSL3040_Tape` | `POWER_ENVIRONMENT` | `Q6Q64A` | `Q2R41A` | - **Power Supply Kit `Q6Q64A`:** Base module `Q2R41A` includes 1 standard power supply. Redundant operation or configura | 1x |
| 📦 CHASSIS | `MSL3040_Tape` | `POWER_ENVIRONMENT` | `Q6Q64A` | `—` | - **Rule:** If redundant power is requested or drive count > 2, `Q6Q64A` is mandatory. | 1x |
| 📦 CHASSIS | `SY100Gb_F32_Module` | `THERMAL_COOLING` | `P51174-B21` | `P51175-B21` | - **High-Capacity Fan Mandate:** Installing Synergy Gen11 or Gen12 compute modules inside Synergy Frame `P51174-B21` str | 1x |
| 📦 CHASSIS | `SY100Gb_F32_Module` | `PHYSICAL_ARCHITECTURE` | `P51174-B21` | `P51175-B21` | - **Rule:** If `P51174-B21` is present with Gen11/Gen12 compute, `P51175-B21` at Quantity: 10 is mandatory. | 1x |
| 📦 CHASSIS | `SY100Gb_F32_Module` | `POWER_ENVIRONMENT` | `P44712-B21` | `—` | - Mandatory when ordering 1800W-2200W Flex Slot Titanium Hot Plug Power Supplies (`P44712-B21`). | 1x |
| 📦 CHASSIS | `SY100Gb_F32_Module` | `PHYSICAL_ARCHITECTURE` | `P44712-B21` | `P44074-B21` | - **Rule:** If `P44712-B21` is present, `P44074-B21` is mandatory. | 1x |
| 📦 CHASSIS | `SY100Gb_F32_Module` | `PHYSICAL_ARCHITECTURE` | `867796-B21` | `—` | - **Rule:** If VC 100Gb F32 Module `867796-B21` is placed in Bay 1/4, compute nodes must populate Mezzanine 1 with a com | 1x |

---
*End of Master Running Knowledge & Learnings Charter. Auto-generated and synchronized by Antigravity AI.*
