---
name: cross-vendor-transformation-skill
description: Use this skill when transforming competitor server, storage, SAN, and networking tenders/quotes (Dell PowerEdge, Cisco UCS, Lenovo ThinkSystem, Supermicro, Dell PowerVault/Unity) into 100% buildable, portal-accepted target vendor equivalents (HPE ProLiant Gen12/Gen11, Alletra, Aruba, etc.). Enforces a rigorous 12-point physical parity audit, translates proprietary subsystem packaging (risers, boot storage, OCP enablement, drive cages), injects hidden companion enablement kits, calculates true N+1 power envelopes, derates ambient thermal baselines, and generates both 1:1 client-facing technical compliance matrices and 100% buildable configurator upload manifests.
---

# Cross-Vendor Architectural Transpiler & Parity Skill (`cross-vendor-transformation-skill`)

**Purpose**: In enterprise presales, tenders and customer quotes frequently arrive formulated under a competitor's architecture (Dell PowerEdge R760/R770/R660, Cisco UCS C220/C240/X-Series, Lenovo ThinkSystem SR650/SR680, or Supermicro). Competitors express hardware through proprietary subsystem packaging (e.g. Dell `Riser 6-2`, `BOSS-N1`, `PERC H965i Front DC-MHS`, `ReadyRails with CMA`, `2nd OCP x16 G5`). 

A naive 1:1 part swap fails in live configurators (like HPE One Config Advanced / OCA or CLIC) because companion enablement hardware (internal routing cables, secondary riser cages, write-cache batteries, 16-pin CEM 5.0 cables, ambient temperature tracking SKUs, and cable management arms) is silently omitted.

This skill executes an autonomous, end-to-end transformation workflow that:
1. **Deconstructs Competitor Architectures**: Decodes proprietary vendor packaging across 12 physical hardware subsystems.
2. **Executes the 12-Point Parity Audit**: Checks every physical boundary (cores, channels, lane widths, power envelope, and thermal derating).
3. **Bridges Hidden Vendor Enablement Gaps**: Automatically injects mandatory physical companion kits (e.g. OCP Slot B signal cables, 16-pin GPU cables, backplane PCIe cables, and battery extension kits).
4. **Enforces Live Configurator Invariants**: Respects vendor rules (such as rear boot storage occupying Zone 3 and barring tertiary risers, or H200 GPU requiring secondary riser containment with ambient $\le 25^\circ\text{C}$).
5. **Produces Dual-Output Deliverables**:
   - **Client-Facing 1:1 Parity Matrix**: Demonstrates line-by-line technical compliance to the customer with zero portal jargon.
   - **Official Vendor Configurator Upload Manifest**: 100% buildable 7-column upload workbook with zero pricing and 2-line gaps ready for instant CLIC/OCA import.
   - **5-Tier Strategy Matrix**: Delivers Rank 1 (Closest Ask), Rank 1L (Least Delta), Rank 2 (Performance), and Rank 5 (Budget).

---

## 🕒 When to Call This Skill (Trigger Conditions)

Activate this skill whenever:
1. **Competitor Quote or Tender Ingestion**: A customer RFP, bill of materials, quote, or image references competitor platforms:
   - **Dell**: PowerEdge (R770, R760, R660, XE9680), PowerVault (ME5024/ME5084), Dell Unity, BOSS-N1, PERC, ReadyRails.
   - **Cisco**: UCS C220/C240 M6/M7, UCS X-Series, VIC 1467/1477, Cisco FlexStorage.
   - **Lenovo**: ThinkSystem SR650/SR680 V3, ThinkSystem DE Series, ThinkSystem DM Series.
   - **Supermicro**: Hyper, CloudDC, GPU SuperServer, BigTwin.
2. **Competitor-to-HPE Transpilation Request**: Presales queries such as:
   - *"Convert this Dell PowerEdge R770 BOM into an equivalent HPE DL380 Gen12 build."*
   - *"Map this Cisco UCS quote to ProLiant and check if we missed anything."*
   - *"Give me the HPE equivalent for Dell Riser 6-2, BOSS-N1, and PERC H965i."*
3. **Parity & Compliance Verification**: Presales requirements demanding a line-by-line compliance matrix proving the proposed target solution meets or exceeds the competitor's technical specifications.

---

## 📋 The 12-Point Physical Parity Audit Protocol

The engine systematically audits and certifies all 12 physical hardware subsystems:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│               12-POINT PHYSICAL PARITY & HARDWARE AUDIT PROTOCOL               │
├─────┬───────────────────────────┬───────────────────────────────────────────────┤
│  #  │ Physical Subsystem        │ Core Invariants & Parity Criteria             │
├─────┼───────────────────────────┼───────────────────────────────────────────────┤
│  1  │ Compute & Sockets         │ Exact cores, frequency, TDP, stepping parity  │
│  2  │ Memory Topology           │ 1DPC balanced channel interleaving, speed     │
│  3  │ Accelerators & GPU        │ 16-Pin CEM 5.0 vs 8-Pin Aux Cable Matching    │
│  4  │ Thermal & Ambient         │ Fan kit + <=25C / <=20C Ambient Derating      │
│  5  │ Storage Controller        │ RAID tier, Smart Storage Battery & Ext Cable  │
│  6  │ Storage Cabling           │ Controller-to-backplane Box 1/2 PCIe Cables   │
│  7  │ Data Drive Preservation   │ Preserves customer local storage & endurance  │
│  8  │ Dedicated Boot Subsystem  │ Mirrored M.2 Rear/Front & Riser Collision     │
│  9  │ PCIe Expansion Risers     │ Full-Height all-x16 Parity vs Default Riser   │
│ 10  │ OCP 3.0 Networking        │ Primary OCP + Secondary OCP Cable Enablement  │
│ 11  │ Power Envelope & N+1      │ Peak Wattage Math & True N+1 Single-PSU Sust. │
│ 12  │ Infrastructure Mechanics  │ Sliding Rails with CMA + iLO Advanced + SLA   │
└─────┴───────────────────────────┴───────────────────────────────────────────────┘
```

---

## 🔧 Subsystem Translation Reference & Enablement Bridging

### 1. Compute & Processors
- **Parity Rule**: Match or exceed physical socket count, physical core count, base/turbo frequencies, L3 cache, and socket TDP.
- **Dual-Socket Stepping**: Dual-socket deployments strictly require uniform processor stepping and power levels.

### 2. Memory Channels & Bandwidth
- **Parity Rule**: Match total RAM capacity and bus frequency (e.g. DDR5-6400).
- **1DPC Interleaving**: Distribute DIMMs uniformly across memory channels (e.g., 8, 12, or 16 DIMMs per socket) to avoid 2DPC frequency downgrades.

### 3. Accelerators & Power Pinout
- **Physical Invariant**: High-draw accelerators (e.g. NVIDIA H200 NVL 450W, H100 NVL) mandate PCIe Gen5 16-pin (12V-2x6 / CEM 5.0) power cables (`P93055-B21`). Traditional 8-pin cables (`P56072-B21`) trigger hard factory blocks (`CLIC Rule 81392332`).
- **Riser Airflow Zone**: High-wattage GPUs cannot reside in Primary or Tertiary risers; they mandate Secondary Riser containment (`P51083-B21`) with dedicated cooling baffles (`CLIC Rule 81394885`).

### 4. Thermal & Ambient Derating
- **Derating Rule**: Pairing processors $>270\text{W}$ with accelerators $\ge 350\text{W}$ under air cooling mandates derating maximum operating ambient temperature to $\le 25^\circ\text{C}$ (`P79558-B21`) or $\le 20^\circ\text{C}$ to prevent thermal throttling and configurator rejection.

### 5. Storage Controller & Cache Protection
- **Cache Battery**: Dedicated RAID controllers with write-back cache mandate companion Smart Storage Batteries (`P01366-B21`).
- **Extension Cable**: In standard 2U chassis, batteries require an extension cable kit (`P48918-B21`) for proper chassis tray routing.

### 6. Storage Interconnect Cabling
- **Backplane Cabling**: Dedicated storage controllers pairing with front drive cages (e.g. `P75740-B21` 8SFF Cage) mandate high-speed PCIe/SAS data interconnect cables (`P76453-B21`). Omitting cables triggers unbuildable `CLIC Rule 81393803`.

### 7. Data Storage Drive Preservation
- **Preservation Invariant (`INV-121`)**: If customer tenders specify local drives (e.g. 3x 960GB SATA RI SSDs), the translation must preserve the local data tier (`P40498-B21`) rather than defaulting to diskless.

### 8. Dedicated Boot Subsystems & Riser Collision
- **Rear Boot Subsystem**: Dell `BOSS-N1` (mirrored 2x M.2 480GB) translates to HPE `NS204i-u v2` (`P78279-B21`) with Rear Mount Kit (`P74755-B21`).
- **Physical Collision Invariant (`INV-120`)**: In 2U DL380 Gen12, the rear boot kit occupies Zone 3 (the Tertiary Riser bay). Tertiary Risers are physically mutually exclusive.

### 9. PCIe Expansion Risers & Lane Width Parity
- **Lane Width Parity (`INV-119`)**: When competitor quotes specify `Rear 2x16 FH (G5)`, the default primary riser (`standardDL380Gen12Riser`, x8/x16/x8, $0 NA) only provides one x16 slot. Upgrading to all-x16 Gen5 requires `P48803-B21` ($262 list). The engine provides both options in the 5-Tier Strategy Matrix.

### 10. OCP 3.0 Networking & Secondary Slot Enablement
- **Dual OCP Invariant (`INV-118`)**: When competitor quotes request `2nd OCP x16 (G5)`, HPE OCP Slot B is physically unpowered and disconnected by default. It mandates `P72203-B21` (`CPU1 to Rear OCP SlotB x8 Cable Kit`) to route PCIe lanes from CPU 1.

### 11. Power Envelope & True N+1 Redundancy
- **Redundancy Invariant (`INV-122`)**: When peak system power exceeds 1,500W ($2 \times \text{CPU TDP} + \sum \text{GPU TDP} + \text{Base Load} \approx 1,590\text{W}$), dual 1000W PSUs fail N+1 redundancy. Dual 1800W–2200W Titanium PSUs (`P44712-B21`) are mandatory for true single-PSU failover protection.

### 12. Infrastructure & Mechanics
- **CMA Completeness (`INV-123`)**: When competitor quotes specify sliding rails with Cable Management Arms (e.g. Dell ReadyRails with CMA), the sliding rail kit (`P70739-B21`) must be paired with articulating 2U CMA (`P70744-B21`).

---

## 🚀 Execution Workflow

When a competitor tender or transformation query is received:

1. **Ingest & Parse**: Run `parseCompetitorSpecification(input, sourceVendor)` to extract all 12 physical subsystem parameters.
2. **Draft Target BOM**: Synthesize starting target vendor BOM matching base chassis, processors, memory, and storage controllers.
3. **Execute 12-Point Audit**: Run `audit12PointPhysicalParity(competitorSpec, targetBom, targetChassis)` to identify missing companion enablement hardware and physical clashes.
4. **Auto-Inject Enablement Kits**: Inject all required physical kits (cables, risers, batteries, thermal tracking) to achieve 100% buildability.
5. **Synthesize 5-Tier Matrix**: Generate Rank 1 (Closest Ask), Rank 1L (Least Delta), Rank 2 (Performance), and Rank 5 (Budget).
6. **Generate Deliverables**: Output client-facing 1:1 Parity Matrix and official 7-column vendor portal upload workbook.
