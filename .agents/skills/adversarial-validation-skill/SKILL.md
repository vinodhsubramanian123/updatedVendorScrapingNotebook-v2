---
name: adversarial-validation-skill
description: Use this skill to execute automated adversarial red-teaming, boundary fuzzing, and stress-testing on ANY generated BOQ, sized BOM, or tender recommendation before presenting it to the customer. Catches subtle enterprise failure modes across thermal limits, Tri-Mode SAS expanders, GPU aux power, high-performance fans, ErP Lot 9 PSUs, and riser power cables.
---

# Adversarial Red-Teaming & Boundary Validation Skill (`adversarial-validation-skill`)

**Purpose**: A configuration can look clean on paper or in simple checks, but fail catastrophic physical deployment constraints in enterprise datacenter environments. This skill enforces a mandatory adversarial stress-testing pass against the 10 most treacherous enterprise hardware failure modes discovered in real-world deployments. It acts as an automated "devil's advocate" to challenge the candidate BOM and guarantee that Rank 1 is truly 100% buildable with zero surprises.

---

## 🕒 When to Call This Skill (Trigger Conditions)

Activate this skill:
1. **Mandatory Pre-Presentation Quality Gate**: Run on EVERY customer BOQ evaluation, RFP synthesized BOM, or tender recommendation before final presentation (user rule: *"Zero compromise on quality"*).
2. **High-TDP / Multi-Socket Deployments**: Whenever configurations feature dual processors with $>205\text{W}$ TDP.
3. **High-Density Storage Deployments**: Whenever configurations have $>8$ drives on Tri-Mode controllers.
4. **Accelerator / GPU Deployments**: Whenever NVIDIA L40S, A100, H100, or multiple double-wide GPUs are included.
5. **Telco / DC Power Deployments**: Whenever -48VDC power supplies are selected.

---

## 📍 Where This Fits in the Presales Process

- **Execution Phase**: **Phase 5 (Pre-Presentation Sanity Gate)**.
- **Upstream Trigger**: Receives candidate Rank 1 / 5-Tier Strategy solutions from [`boq-eval-skill`](../boq-eval-skill/SKILL.md).
- **Downstream Handoff**: If adversarial checks find violations, triggers automated remediation in the BOM before certifying the build for [`output-validation-skill`](../output-validation-skill/SKILL.md).

---

## 🛡️ The 10 Enterprise Chaos Failure Modes Checked

Every candidate BOM is audited against these 10 failure injection patterns:

| # | Failure Mode | Physical Constraint | Mandatory Remediation Kit |
|:---|:---|:---|:---|
| **1** | **Missing 2nd CPU Heatsink** | Dual-socket servers require a physical heatsink on Socket 2 (`INV-61`, `BENCH-08`). | Inject Gen12 Heatsink `P48818-B21` (or Gen11 `P74792-B21`). |
| **2** | **Tri-Mode Direct-Attach Saturation** | Dedicated 8-port controllers (`MR408i-o`, `MR216i-p`) directly address only 8 drives. $>8$ drives causes silent port starvation (`INV-26`). | Inject SAS Expander Card `P48835-B21` or Tri-Mode Switch `P55806-B21`. |
| **3** | **Controller Enablement Cabling Mismatch** | Standard 8SFF cages with OCP controllers require direct enablement cables; Premium cages on risers require Y-splitters (`INV-26`). | Inject OCP Enablement Cable `P48918-B21` or PCIe Riser Splitter `P48832-B21`. |
| **4** | **GPU Auxiliary Power Starvation** | High-wattage PCIe GPUs draw $>75\text{W}$ and cannot be powered solely by the PCIe slot (`INV-27`). | Inject GPU Aux Power Cable Kit `P48816-B21` or `P76450-B21`. |
| **5** | **Thermal Envelope & High-Perf Fans** | High-TDP processors ($>240\text{W}$) or accelerators mandate high-RPM redundant cooling (`INV-27`). | Inject High-Performance Fan Kit `P48820-B21` (or `P56950-B21`). |
| **6** | **EU Ecodesign ErP Lot 9 Platinum PSU Trap** | Dual-socket servers with 94% Platinum PSUs default to EU Ecodesign Regulation 2019/424 blocks in CLIC/OCA (`INV-30`). | Auto-inject HPE CE Mark Removal FIO Enablement Kit `P35876-B21` ($1 list). |
| **7** | **PCIe Riser 5th Slot Power Starvation** | Populating $\ge 5$ physical PCIe cards across risers leaves Slot 1 on Primary Riser unpowered (`INV-31`). | Inject Primary Cable Kit `P56073-B21`. |
| **8** | **Memory Channel Speed Throttling & Mixing** | Mixing RDIMM with 3DS RDIMM, or mixing x4 and x8 bit-widths, degrades memory bus from 6400 MT/s to 4400 MT/s or causes boot failure. | Normalize to uniform capacity and bit-width (all x4). |
| **9** | **-48VDC Telco Power Lug Kit Omission** | Ordering DC power supplies (`P17023-B21`) without terminal lug kits prevents physical connection to DC power distribution frames. | Inject DC Lug Kit `P36877-B21`. |
| **10** | **OS Physical Core Multiplier License Deficit** | Windows Server and VMware vSphere are licensed per physical socket core (Windows: $\ge 16$ cores/server; VMware: $\ge 16$ cores/socket) (`INV-28`). | Calculate total socket cores (`cpuCount * coresPerCpu`) and ensure base + add-on packs cover 100% of cores. |

---

## 💻 CLI Commands & Direct Execution

### 1. Run Automated Chaos & Adversarial Sanity Suite
```bash
# Runs full failure modes chaos test suite
node tests/chaos/test_failure_modes_and_chaos.js
```

### 2. Run Adversarial Red-Teaming Agent on Target Chassis
```bash
# Generates subtly flawed BOQs and stress-tests evaluator detection recall
node scripts/evaluators/adversarial_agent.js --chassis DL380_Gen12 --iterations 1
```

### 3. Programmatic BOM Stress-Check via Node.js
```javascript
const { evaluateBOQMultiAspect } = require('./scripts/lib/boq/boq_evaluator.js');

function runAdversarialSanityCheck(bomItems, chassisId) {
  const result = evaluateBOQMultiAspect(bomItems, { chassis: chassisId });
  const criticalFailures = (result.errors || []).filter(e => 
    e.includes('Thermal') || e.includes('Heatsink') || e.includes('Expander') || e.includes('Cabling')
  );
  return {
    passed: criticalFailures.length === 0,
    criticalFailures,
    recommendedFixes: result.conflictGraph?.resolvedFixes || []
  };
}
```

---

## 📋 Standardized Verification Output (What to Report)

When the adversarial sanity check completes, include the badge and summary in the execution trace:
```
[🛡️ Adversarial Stress-Testing: 10/10 Enterprise Failure Modes AUDITED & PASSED]
• Heatsink Isolation : PASSED (Dual-socket heatsink P48818-B21 verified)
• Storage Port Math  : PASSED (Expander P48835-B21 paired with 16 drives)
• Auxiliary Cabling  : PASSED (Riser power cable P56073-B21 present)
• Thermal Cooling    : PASSED (High-Performance Fan Kit P48820-B21 verified)
• ErP Lot 9 / PSU    : PASSED (CE Mark Kit P35876-B21 injected)
```
