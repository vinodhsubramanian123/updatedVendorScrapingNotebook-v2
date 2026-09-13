---
name: least-delta-combinator-skill
description: Use this skill to eliminate cascading dependency bloat and synthesize Least-Delta / Minimal-Mutation alternative topologies (Rank 1L / Rank 1M). Identifies root-cause "troublesome SKUs" (e.g. an 8-port controller with 16 drives forcing a SAS expander, extra cables, fans, and high-wattage PSUs) and substitutes direct functional alternatives to prune the entire cascading dependency tree.
---

# Least-Delta Solution Combinator & Cascading Pruning Skill (`least-delta-combinator-skill`)

**Purpose**: In enterprise server configuration, a single suboptimal part selection by a customer or presales architect often triggers a massive "ripple effect" of mandatory accessories (e.g. choosing an 8-port RAID controller with 16 drives forces the injection of a $1,200 SAS Expander Card, two extra internal SAS cables, a high-performance fan kit, and a larger power supply). Simply adding all those parts makes the build technically valid, but bloats CapEx and adds physical failure points. This skill identifies the root-cause "troublesome SKU", formulates an alternative topology (Rank 1L / Rank 1M), and prunes the entire cascading dependency tree to deliver 100% buildability with the fewest net mutations.

---

## 🕒 When to Call This Skill (Trigger Conditions)

Activate this skill whenever:
1. **Cascading Addition Bloat**: The local rule engine or conflict graph injects $\ge 2$ mandatory accessory kits (cables, expanders, fan kits) to accommodate a single customer component.
2. **CapEx Disproportion**: The injected fix kits add $>15\%$ to the subtotal of the subsystem they are enabling.
3. **Contested Controller Port Starvation**: An 8-port controller is paired with 16 or 24 drive cages.
4. **Memory Channel Bus Throttling**: A customer requests an odd memory configuration (e.g. 10 or 12 DIMMs on a 16-channel system) that forces bus downclocking.

---

## 📍 Where This Fits in the Presales Process

- **Execution Phase**: **Phase 3 (Strategic Resolution Matrix Synthesis)**.
- **Upstream Trigger**: Receives detected conflicts and missing dependencies from [`boq-eval-skill`](../boq-eval-skill/SKILL.md) and `conflict_graph.js`.
- **Downstream Handoff**: Synthesizes the **Rank 1L** (Least-Delta) or **Rank 1M** (Minimal-Mutation) solution cards alongside Rank 1A/1B and hands off to [`output-validation-skill`](../output-validation-skill/SKILL.md).

---

## ⚙️ Core Algorithmic Workflow (`least_delta_combinator.js`)

The engine operates through 4 sequential steps:

### 1. Root-Cause Troublesome SKU Introspection (`cascading_impact_analyzer.js`)
- Traces dependency edges backwards from injected fix kits to find the common parent SKU.
- Identifies whether the cascade is caused by:
  - `STORAGE_EXPANDER_CASCADE`: 8-port controller driving $>8$ drives.
  - `CONTESTED_OCP_SLOT_COLLISION`: OCP storage controller blocking an OCP NIC.
  - `MEMORY_BUS_SPEED_BOTTLENECK`: Sub-optimal DIMM counts forcing bus downclocking.
  - `THERMAL_POWER_CASCADE`: High-TDP CPU forcing liquid cooling or high-RPM fans.

### 2. Formulating the Clean Functional Alternative
- Queries `catalog.json` for a direct replacement that natively satisfies the customer's requirement without external companion hardware:
  - *Example*: Replaces 8-port controller (`MR408i-o` / `MR216i-p`) with **16-port Tri-Mode controller (`MR416i-o` `P55415-B21` or `MR416i-p` `P47777-B21`)**.

### 3. Cascading Dependency Pruning
- Automatically deletes the root troublesome SKU AND prunes all downstream dependencies from the BOM:
  - ❌ Removes SAS Expander Card (`P48835-B21`) — saved $1,250!
  - ❌ Removes 2x Internal SAS Expander Cables (`P48832-B21`) — saved $180!
  - ❌ Removes redundant fan upgrades if not otherwise required.
- **Net Result**: 1 part replaced, 3 parts eliminated, 100% customer drive capacity preserved, lower latency, fewer physical failure points.

### 4. Ranking & Presentation
- **Rank 1A (Intent Preserved via Expander)**: Strictly keeps customer's requested 8-port controller + adds SAS expander + cables.
- **Rank 1L (Least-Delta Functional Alternative — RECOMMENDED)**: Replaces 8-port controller with 16-port controller, prunes expander and cables, saving ~$800 net and eliminating 3 physical failure points.

---

## 💻 CLI Commands & Direct Execution

### 1. Run Least-Delta Combinator on an Evaluated Solution
```bash
node -e "
const { evaluateBOQMultiAspect } = require('./scripts/lib/boq/boq_evaluator.js');
const res = evaluateBOQMultiAspect('tests/fixtures/test_boq_dl380_gen12.csv');
const rank1L = res.conflictGraph?.rankedSolutions?.find(s => s.rank === 'Rank 1L' || s.rank === '1L');
if (rank1L) {
  console.log('✅ Found Rank 1L Alternative:', rank1L.name);
  console.log('Reasoning:', rank1L.reasoning);
  console.log('Eliminated Parts Count:', rank1L.tradeoffMetrics?.prunedPartsCount || 0);
} else {
  console.log('No troublesome SKU detected; standard Rank 1 is optimal.');
}
"
```

---

## 📋 Standardized Output Contract (What to Report)

When the Least-Delta Combinator produces a Rank 1L alternative, the agent MUST present the comparison explicitly:

```
====================================================================
⚡ LEAST-DELTA STRATEGIC ALTERNATIVE (RANK 1L vs RANK 1A)
====================================================================
• Troublesome SKU Identified: P58335-B21 (HPE MR408i-o 8-port Controller)
• Root Conflict             : 16 Drives requested on an 8-port direct controller.
--------------------------------------------------------------------
[Path 1A: Literal Customer Intent]
  • Adds: 1x SAS Expander Card (P48835-B21) - $1,250.00
  • Adds: 2x SAS Expander Cable Kits (P48832-B21) - $180.00
  • Total Injected Fix Spend: +$1,430.00 (3 extra physical components)

[Path 1L: Least-Delta Alternative — RECOMMENDED]
  • Substitutes: MR416i-o 16-port Controller (P55415-B21) instead of 8-port.
  • Prunes: Completely eliminates SAS Expander & Extra Cables!
  • Net CapEx Impact: Saves $650.00 vs Path 1A.
  • Reliability Benefit: Eliminates 3 potential physical failure points in storage bus.
====================================================================
```
