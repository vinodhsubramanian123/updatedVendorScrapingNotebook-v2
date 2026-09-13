---
name: value-engineering-skill
description: Use this skill to evaluate post-buildability CapEx/OpEx optimizations on certified BOQ solutions, including CPU right-sizing, NIC bandwidth alignment, PSU efficiency tuning, and memory tier selection. Always runs AFTER 100% buildability is confirmed, never before.
---

# Value Engineering & Deal Optimization Skill (`value-engineering-skill`)

**Purpose**: After the 7-aspect physical math engine confirms a configuration is 100% buildable, this skill guides the agent through advisory CapEx/OpEx optimizations that preserve buildability while reducing cost or improving performance-per-dollar.

> **Critical Ordering Invariant**: Value engineering MUST run AFTER buildability is confirmed. Never optimize a configuration that hasn't passed the 7-aspect pre-flight checks — you'd be optimizing something that can't be built.

---

## ⚡ Trigger Conditions

The agent SHOULD invoke value engineering when:

| Condition | Action |
|-----------|--------|
| BOQ evaluation produces a certified Rank 1 solution | Run VE analysis on Rank 1 output |
| Customer explicitly asks for cost optimization | Run VE analysis on their base configuration |
| Total CapEx exceeds customer's stated budget | Run VE to identify savings while preserving workload intent |
| Multiple solution ranks differ by >15% in CapEx | Highlight the value engineering opportunities in the delta |

The agent MUST NOT invoke value engineering when:
- The configuration is unbuildable (no valid ranks)
- The query is a freeform Q&A (no configuration to optimize)
- The customer explicitly states "do not change any parts"

---

## 🔧 5 Optimization Dimensions

### 1. CPU Right-Sizing
- **Engine**: [`deal_optimizer.js`](file:///home/vinodh/vendorNotebookSolution/scripts/lib/boq/deal_optimizer.js) → `analyzeCpuRightSizing()`
- **Logic**: Compare customer's selected CPU against the workload DNA profile:
  - If workload is `VIRTUALIZATION_DENSE` (many VMs, low per-VM compute) and customer selected 64-core 350W Platinum, suggest 32-core 270W Gold (same socket count, lower TDP, lower cost, sufficient compute density)
  - If workload is `DATABASE_IN_MEMORY` (high per-core frequency critical) and customer selected many-core low-frequency, suggest fewer-core higher-GHz alternative
- **Output**: Advisory savings with exact CapEx delta and TDP reduction
- **Never**: Force a CPU change — always present as advisory

### 2. NIC Bandwidth Alignment
- **Logic**: Compare customer's NIC bandwidth against actual data throughput requirements:
  - If customer selected 100GbE NICs but workload profile shows <10Gbps sustained throughput, suggest 25GbE alternative
  - If customer selected 10GbE but workload shows high east-west traffic (HPC/AI), suggest 25GbE or 100GbE
- **Output**: Bandwidth utilization ratio and cost delta

### 3. PSU Efficiency Tuning
- **Logic**: Match PSU tier to actual power envelope:
  - If total system draw is <800W but customer selected 1800W Titanium PSUs, suggest 1000W Platinum (lower cost, still 1+1 redundant)
  - If total system draw is >1400W and customer selected 1600W Platinum, suggest 1800W Titanium (prevents thermal throttling under peak load)
- **Output**: Power headroom analysis and annual OpEx electricity savings estimate
- **INV-30 Awareness**: If suggesting Platinum PSUs on high-TDP configs, ensure CE Mark Removal Kit `P35876-B21` is included

### 4. Memory Tier Selection
- **Logic**: Evaluate customer's memory speed tier against workload bandwidth requirements:
  - DDR5-5600 vs DDR5-6400: if 2DPC population (which auto-derates speed), the premium for higher-rated DIMMs provides no benefit
  - If 1DPC population on Gen12, DDR5-6400 provides ~15% bandwidth uplift for memory-intensive workloads
- **Output**: Effective memory bandwidth comparison and cost-per-GB analysis

### 5. Storage Media Right-Sizing
- **Logic**: Match SSD write endurance tier to workload I/O profile:
  - Write-Intensive (WI) SSDs for databases with >70% write ratio
  - Mixed-Use (MU) SSDs for general virtualization (50/50 read/write)
  - Read-Intensive (RI) SSDs for read-heavy analytics, caching, CDN
  - Customer paying for WI but workload is read-heavy → suggest RI with 40-60% savings per drive
- **Output**: DWPD (Drive Writes Per Day) requirement analysis and cost delta

---

## 📊 Output Schema

```json
{
  "valueEngineering": {
    "appliedToRank": "1A",
    "originalCapEx": 52340.00,
    "optimizedCapEx": 45890.00,
    "totalAdvisorySavings": 6450.00,
    "savingsPercent": 12.3,
    "optimizations": [
      {
        "dimension": "CPU_RIGHT_SIZING",
        "currentSku": "P73289-B21",
        "currentDescription": "Xeon Platinum 8580 64-core 350W",
        "suggestedSku": "P73299-B21",
        "suggestedDescription": "Xeon Gold 6548Y 32-core 280W",
        "unitPriceDelta": -2100.00,
        "totalSavings": -4200.00,
        "rationale": "Workload DNA is VIRTUALIZATION_DENSE — 32 cores/socket provides sufficient density for 40 VMs with lower TDP",
        "tradeoff": "Peak single-threaded performance reduced by ~8%",
        "severity": "ADVISORY"
      }
    ],
    "preservedBuildability": true,
    "source": "VALUE_ENGINEERING"
  }
}
```

---

## 🛡️ Guardrails

1. **Never Compromise Buildability**: Every suggested optimization must itself be 100% buildable. If swapping a CPU changes the TDP envelope, recalculate fans, PSUs, and heatsinks
2. **Always Show Trade-offs**: Every optimization has a trade-off. Present it honestly (e.g., "saves $4,200 but reduces peak single-thread by ~8%")
3. **Advisory Only**: Value engineering suggestions are always advisory (`severity: "ADVISORY"`). They never replace the Rank 1 intent-preserved solution — they augment it
4. **No Unsolicited Downgrades to Core Spec**: If the customer specified exact CPU/memory requirements for compliance or licensing reasons, do not suggest alternatives that reduce the spec
5. **Decision Trace Attribution**: All VE recommendations are tagged with `source: "VALUE_ENGINEERING"` in the decision trace ledger (`INV-75`)

---

## 💻 CLI Usage

```bash
# Value engineering runs automatically as part of eval_boq.js output
# The deal_optimizer.js module is invoked internally after buildability is confirmed

# To view VE recommendations in the dashboard:
# Navigate to the ValueEngineeringPanel in the Resolution Matrix view
```

---

## 🔗 Integration with Execution Trace

When value engineering runs, it adds entries to the execution trace:

```json
{
  "stepNumber": 8,
  "stepName": "Value Engineering & Deal Optimization",
  "status": "PASSED",
  "durationMs": 230,
  "input": { "rank1Solution": "..." },
  "output": { "optimizationsFound": 3, "totalAdvisorySavings": 6450.00 },
  "verificationChecks": [
    { "check": "All optimized configs re-validated for buildability", "result": true },
    { "check": "Trade-offs documented for each suggestion", "result": true }
  ]
}
```
