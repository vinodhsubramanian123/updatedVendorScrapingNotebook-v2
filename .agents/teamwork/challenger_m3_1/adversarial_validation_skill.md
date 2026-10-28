# Adversarial Red-Teaming & Boundary Validation Skill (`adversarial-validation-skill`)

**Purpose**: A configuration can look clean on paper or in simple checks, but fail catastrophic physical deployment constraints in enterprise datacenter environments. This skill enforces a mandatory adversarial stress-testing pass against the 11 most treacherous enterprise hardware failure modes discovered in real-world deployments. It acts as an automated "devil's advocate" to challenge the candidate BOM and guarantee that Rank 1 is truly 100% buildable with zero surprises. Real candidate scrutiny is strictly separated from synthetic chaos stress testing.

---

## 🕒 When to Call This Skill (Trigger Conditions)

Activate this skill:
1. **Mandatory Pre-Presentation Quality Gate**: Run on EVERY customer BOQ evaluation, RFP synthesized BOM, or tender recommendation before final presentation (user rule: *"Zero compromise on quality"*).
2. **High-TDP / Multi-Socket Deployments**: Whenever configurations feature dual processors with $>205\text{W}$ TDP.
3. **High-Density Storage Deployments**: Whenever configurations have $>8$ drives on Tri-Mode controllers.
4. **Accelerator / GPU Deployments**: Whenever NVIDIA L40S, A100, H100, or multiple double-wide GPUs are included.
5. **Telco / DC Power Deployments**: Whenever -48VDC power supplies are selected.

---

## 🛡️ The 11 Enterprise Chaos Failure Modes Checked

Every candidate BOM is audited against these 11 failure injection patterns:

| # | Failure Mode | Physical Constraint | Mandatory Remediation Kit |
|:---|:---|:---|:---|
| **1** | **Missing 2nd CPU Heatsink** | Dual-socket servers require a physical heatsink on Socket 2 (`INV-61`, `BENCH-08`). | Inject platform-scoped heatsink: Gen12 High-Perf `P74792-B21` / Gen12 Standard `P49145-B21` (or Gen11 High-Perf `P48818-B21`). |
| **2** | **Tri-Mode Direct-Attach Saturation** | Dedicated 8-port controllers (`MR408i-o`, `MR216i-p`) directly address only 8 drives. $>8$ drives causes silent port starvation (`INV-26`). | Inject SAS Expander Card `P48835-B21` or Tri-Mode Switch `P55806-B21`. |
| **3** | **Controller Enablement Cabling Mismatch** | Standard 8SFF cages with OCP controllers require direct enablement cables; Premium cages on risers require Y-splitters (`INV-26`). | Inject OCP Enablement Cable `P48918-B21` or PCIe Riser Splitter `P48832-B21`. |
| **4** | **GPU Auxiliary Power Starvation** | High-wattage PCIe GPUs draw $>75\text{W}$ and cannot be powered solely by the PCIe slot (`INV-27`). | Inject GPU Aux Power Cable Kit `P48816-B21` or `P76450-B21`. |
| **5** | **Thermal Envelope & High-Perf Fans** | High-TDP processors ($>240\text{W}$) or accelerators mandate high-RPM redundant cooling (`INV-27`). | Inject High-Performance Fan Kit `P48820-B21` (or `P56950-B21`). |
| **6** | **EU Ecodesign ErP Lot 9 Platinum PSU Trap** | Dual-socket servers with 94% Platinum PSUs default to EU Ecodesign Regulation 2019/424 blocks in CLIC/OCA (`INV-30`). | Auto-inject HPE CE Mark Removal FIO Enablement Kit `P35876-B21` ($1 list). |
| **7** | **PCIe Riser 5th Slot Power Starvation** | Populating $\ge 5$ physical PCIe cards across risers leaves Slot 1 on Primary Riser unpowered (`INV-31`). | Inject Primary Cable Kit `P56073-B21`. |
| **8** | **Memory Channel Speed Throttling & Mixing** | Mixing RDIMM with 3DS RDIMM, or mixing x4 and x8 bit-widths, degrades memory bus from 6400 MT/s to 4400 MT/s or causes boot failure. | Normalize to uniform capacity and bit-width (all x4). |
| **9** | **-48VDC Telco Power Lug Kit Omission** | Ordering DC power supplies (`P17023-B21`) without terminal lug kits prevents physical connection to DC power distribution frames. | Inject DC Lug Kit `P36877-B21`. |
| **10** | **OS Physical Core Multiplier License Deficit** | Windows Server and VMware vSphere are licensed per physical socket core (Windows: $\ge 16$ cores/server; VMware: $\ge 16$ cores/socket) (`INV-28`). | Calculate total socket cores (`cpuCount * coresPerCpu`) and ensure base + add-on packs cover 100% of cores. |
| **11** | **Anti-Hallucination & Gated SKU Audit** | Conditional options (H200 GPU, ambient $\le 27^\circ\text{C}$, 2P backplane) presented without gate disclosure, or missing reasoning narrative (`INV-118`, `INV-119`). | Assert 5-step numbered reasoning (`generateEvaluationNarrative()`); flag gated SKUs explicitly as `PORTAL_CONDITIONAL` on Rank 1L. |
