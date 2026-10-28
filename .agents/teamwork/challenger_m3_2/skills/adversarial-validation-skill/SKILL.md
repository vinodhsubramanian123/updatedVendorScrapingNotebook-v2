---
name: adversarial-validation-skill
description: Use this skill to execute automated adversarial red-teaming, boundary fuzzing, and stress-testing on ANY generated BOQ, sized BOM, or tender recommendation before presenting it to the customer. Catches subtle enterprise failure modes across thermal limits, Tri-Mode SAS expanders, GPU aux power, high-performance fans, ErP Lot 9 PSUs, and riser power cables.
---

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

## 📍 Where This Fits in the Presales Process

- **Execution Phase**: **Phase 5 (Pre-Presentation Sanity Gate)**.
- **Upstream Trigger**: Receives candidate Rank 1 / 5-Tier Strategy solutions from [`boq-eval-skill`](../boq-eval-skill/SKILL.md).
- **Downstream Handoff**: If adversarial checks find violations, triggers automated remediation in the BOM before certifying the build for [`output-validation-skill`](../output-validation-skill/SKILL.md).
- **Dual-Mode Operation**:
  - `CANDIDATE_SCRUTINY`: Audits a real customer quote or sized BOM against the 11 physical failure modes.
  - `SYNTHETIC_CHAOS`: Injects subtle flaws into synthetic configurations to benchmark engine recall; synthetic passes never certify customer deliverables.
