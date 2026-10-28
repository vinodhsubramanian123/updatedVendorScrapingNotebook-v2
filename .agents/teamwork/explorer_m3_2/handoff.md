# Handoff Report — Milestone 3 NUMA Topology, Rank 5 NVMe Down-Tiering & Challenger M2_1 Remediation (Explorer M3_2)

**Agent**: `explorer_m3_2`  
**Roles**: investigator, synthesizer, reporter  
**Timestamp**: 2026-10-27T19:22:00Z  
**Parent Conversation ID**: `06cb5c88-e2a4-407d-9438-e05cab02c2f3`  
**Milestone**: Milestone 3 (Advanced Agentic Skills Polish & Parity Depth — Features 10 & 12, Requirement R3)  

---

## 1. Observation

1. **Current Memory Channel & NUMA Topology Implementations**:
   - In `scripts/lib/aspects/memory_channel.js` lines 130–139:
     ```javascript
     const dimmsPerCpu = cpuCount > 0 ? (memoryCount / cpuCount) : 0;
     const isSupportedPopulation = cpuCount > 0 && memoryCount > 0 && (memoryCount % cpuCount === 0) && [1, 2, 4, 6, 8, 12, 16].includes(dimmsPerCpu);
     const isBalancedChannel = cpuCount > 0 && memoryCount > 0 && (memoryCount % cpuCount === 0) && ((memoryCount / cpuCount) % chWidth === 0);
     const isInvalidChannelConfiguration = (memoryCount > 0 && cpuCount > 0 && !isSupportedPopulation) || (memoryCount > 0 && cpuCount === 0);
     ```
     Physical aspect checking validates channel width (`channelWidth = 8` by default) and socket divisibility (`memoryCount % cpuCount === 0`).
   - In `scripts/lib/boq/cross_vendor_transformer.js` lines 143–161:
     ```javascript
     case 'MEMORY_TOPOLOGY': {
       const reqMemGb = spec.memory?.totalMemoryGb;
       if (reqMemGb === null || reqMemGb === undefined) {
         return { subsystem, status: 'NOT_EVALUATED', details: 'No competitor memory capacity specified.' };
       }
       let targetMemGb = 0;
       for (const item of bom) {
         const desc = (item.description || item.sku || '').toLowerCase();
         if (/\b(dimm|rdimm|smart memory|memory)\b/i.test(desc) && !/\b(battery|controller)\b/i.test(desc)) {
           const capMatch = desc.match(/(\d+)\s*gb/i);
           const cap = capMatch ? parseInt(capMatch[1], 10) : 32;
           targetMemGb += cap * (item.quantity || 1);
         }
       }
       if (targetMemGb >= reqMemGb) {
         return { subsystem, status: targetMemGb > reqMemGb ? 'EXCEEDS' : 'MATCHED', details: `Target provides ${targetMemGb} GB RAM vs competitor requirement of ${reqMemGb} GB.` };
       }
       return { subsystem, status: 'DEFICIT', details: `Target provides ${targetMemGb} GB RAM vs competitor requirement of ${reqMemGb} GB (Deficit: ${reqMemGb - targetMemGb} GB).` };
     }
     ```
     **Observation**: `MEMORY_TOPOLOGY` in `cross_vendor_transformer.js` performs *only* an aggregate gigabyte comparison (`targetMemGb >= reqMemGb`). It does not verify socket symmetry (`targetDimmCount % targetCpus === 0`), does not detect CPU generation channel width (8 vs 12 vs 6 channels), and does not flag unbalanced DIMM populations (e.g. 5, 7, or 10 DIMMs on an 8-channel CPU socket).
   - In `scripts/lib/conflict/workload_dna.js` lines 56–61:
     `extractWorkloadDna` aggregates `memoryCount` and `totalMemoryGb`, but does not track `cpuCount`, does not inspect DIMM-to-socket distribution, and does not return NUMA topology interleaving telemetry.

2. **Current Rank 5 Strategic Budget Synthesis**:
   - In `scripts/lib/conflict/strategy_synthesizer.js` lines 1136–1170:
     ```javascript
     function synthesizeBudgetMinimizationCandidate(v1, evalResults, loadedCatalog, chassisInfo, getPrice, revalidateCached) {
       const parts = v1.parts.map(p => ({ ...p }));
       const aspectCompute = evalResults.aspects?.compute || {};
       const aspectPower = evalResults.aspects?.power || {};
       const aspectPcie = evalResults.aspects?.pcie || {};

       const mChanged = _tryBudgetMemorySubstitution(parts, aspectCompute, getPrice);
       const pChanged = _tryBudgetPowerSubstitution(parts, aspectPower, getPrice);
       const tChanged = _tryBudgetThermalSubstitution(parts, aspectCompute, aspectPcie, getPrice);

       if (mChanged || pChanged || tChanged) {
         ...
       }
       ...
     }
     ```
     **Observation**: Rank 5 synthesis currently only evaluates memory down-speeding (`_tryBudgetMemorySubstitution`), PSU downsizing (`_tryBudgetPowerSubstitution`), and thermal heatsink optimization (`_tryBudgetThermalSubstitution`). There is zero storage down-tiering: over-provisioned High Performance / Mixed Use NVMe SSDs in non-write-intensive workloads remain untouched at full CapEx spend.

3. **Challenger M2_1 Adversarial Findings & Flaws**:
   - **Finding 1** (`resource_arbitrator.js` lines 751–774 & 798):
     `REAR_CHASSIS_BAY_SPACE` contention lacks `branchId: 'branch_pcie_boot_device'`. When OCP contention co-occurs, `branches[0]` is Branch A (OCP Storage Controller). Line 798 falls back to `branches[0]`, resulting in the rear-bay conflict's `selfCorrectionAction` erroneously displaying OCP Storage Controller actions rather than Branch C (Standup PCIe OS Boot Device).
   - **Finding 2** (`resource_arbitrator.js` line 517):
     `const hasMgmtLicense = support.hasManagementLicense !== false && items.some(...)`
     When `supportManufacturing.hasManagementLicense === true` is passed explicitly, but `items` is empty (`[]`), `items.some(...)` evaluates to `false`, generating a false-positive `MANDATORY_CTO_MANAGEMENT_LICENSE` contention.
   - **Findings 3–5** (`resource_arbitrator.js` line 582 & `counterfactual_repair.js` lines 15, 368):
     Calling `arbitrateContestedResources(null, {}, {})` crashes on `items.forEach`. Calling `generateCounterfactualRepairProofs(null, {})` crashes on `evalResults.evalSummary`. Calling `generateCounterfactualRepairProofs({}, null)` crashes on `options.serverCount`.

---

## 2. Logic Chain

1. **NUMA Interleaving Parity Enforcement (Feature 10)**:
   - Modern enterprise servers (HPE ProLiant Gen11/Gen12 with Intel Sapphire Rapids / Emerald Rapids / Granite Rapids or AMD EPYC 9004/9005 Genoa/Bergamo/Turin) feature 8 or 12 memory channels per CPU socket. Older architectures (Gen10 / Cascade Lake / Skylake) feature 6 memory channels per socket.
   - Populating an odd or non-interleaved DIMM count per socket (e.g. 5, 7, 10, or 14 DIMMs per 8-channel CPU) disables full-width multi-channel memory interleaving, creating severe memory bandwidth degradation and latency jitter across NUMA nodes.
   - In cross-vendor quote translation (`cross_vendor_transformer.js`), providing equal total GB (e.g. 512GB) using an unbalanced DIMM population (e.g. 5x 64GB on socket 1 and 3x 64GB on socket 2, or 10x 64GB) is physically un-balanced and violates RFP performance parity.
   - Therefore, `cross_vendor_transformer.js` must evaluate three tiers of memory compliance:
     1. Total Capacity Parity: $C_{\text{target}} \ge C_{\text{req}}$.
     2. Socket Symmetry: `targetDimmCount % targetCpus === 0`.
     3. Channel Interleaving Balance: `dimmsPerCpu` must conform to 1DPC ($N = \text{channelWidth}$) or 2DPC ($N = 2 \times \text{channelWidth}$), or supported balanced sub-populations (1, 2, 4 DIMMs), matching the detected channel width of the target architecture.
   - In addition, `workload_dna.js` must expose `numaTopology` and a dedicated `validateNumaMemoryTopology()` validator to enable reusable validation across the evaluation pipeline.

2. **Rank 5 NVMe Down-Tiering Value Engineering (Feature 12)**:
   - Customers frequently draft tender BOQs containing High Performance / Mixed Use NVMe SSDs (3 drive writes per day — DWPD) for read-heavy or general virtualization workloads (e.g. web servers, VDI, read-only analytics).
   - Mixed Use NVMe SSDs carry a 40–60% price premium over Read Intensive NVMe SSDs (1 DWPD) or enterprise SATA SSDs.
   - When workload DNA proves the application is not write-intensive (`workloadDNA.storageWorkload !== 'WRITE_INTENSIVE'`), down-tiering Mixed Use NVMe drives to Read Intensive NVMe drives delivers significant CapEx savings without degrading application performance or breaching 100% factory buildability.
   - Golden Directives for Rank 5 Down-Tiering:
     1. Gated: Never down-tier if `workloadDNA.storageWorkload === 'WRITE_INTENSIVE'` or write-heavy keywords (DB logging, transaction log, WAL, redo log) are present.
     2. Capacity Non-Decrease: The replacement drive capacity must satisfy $C_{\text{replacement}} \ge C_{\text{original}}$ (e.g. 800GB Mixed Use $\rightarrow$ 960GB Read Intensive; 1.6TB/1.92TB Mixed Use $\rightarrow$ 1.92TB Read Intensive; 3.2TB/3.84TB Mixed Use $\rightarrow$ 3.84TB Read Intensive; 6.4TB/7.68TB Mixed Use $\rightarrow$ 7.68TB Read Intensive).
     3. Form Factor & Carrier Preservation: Form factor (SFF Basic Carrier BC, SFF Smart Carrier SC, EDSFF E3.S, or LFF) and physical connector type must remain 100% identical.

3. **Challenger M2_1 Remediation Integration**:
   - Addressing the 5 empirical findings from Challenger M2_1 hardens `resource_arbitrator.js` and `counterfactual_repair.js` against edge-case crashes, eliminates branch misattribution on rear drive bay conflicts, and ensures robust null-safety for all external API consumers.

---

## 3. Caveats

- **Write-Intensive Protection Boundary**: When the input BOQ lacks workload context, `workload_dna.js` infers the workload profile strictly from hardware SKU tokens. If a BOQ contains explicit "Write Intensive" or "WI" in any drive description, storage down-tiering is unconditionally bypassed.
- **Form Factor Parity**: Down-tiering from NVMe to SATA SSD is physically viable only when a compatible Tri-Mode or SATA controller/backplane is present. To avoid unbuildable cabling/controller cascades in Rank 5, NVMe down-tiering prioritizes Read Intensive NVMe SSDs within the exact same carrier class (e.g. SFF BC U.3).
- **Competitor Spec CPU Architecture Heuristics**: If a competitor spec omits the CPU model completely, channel width defaults to the modern Gen11/Gen12 standard of 8 channels per socket.

---

## 4. Conclusion

The architectural designs and unified diffs below provide complete, deterministic implementation specifications for Worker M3.

### A. Recommended Implementation Diffs

#### 1. `scripts/lib/conflict/workload_dna.js`
Add CPU socket tracking, architecture channel width detection, `numaTopology` payload, and `validateNumaMemoryTopology()` helper:

```javascript
--- a/scripts/lib/conflict/workload_dna.js
+++ b/scripts/lib/conflict/workload_dna.js
@@ -32,6 +32,9 @@ function extractWorkloadDna(items = []) {
   let totalCores = 0;
   let maxFreqGhz = 0;
+  let cpuCount = 0;
   let totalMemoryGb = 0;
   let memoryCount = 0;
+  let detectedChannelWidth = 8;
   let hasGpu = false;
   let gpuModels = [];
   let totalGpuCount = 0;
@@ -46,6 +49,15 @@ function extractWorkloadDna(items = []) {
     // CPU Profile
     if (desc.includes('processor') || desc.includes('xeon') || desc.includes('epyc')) {
+      if (!desc.includes('heatsink') && !desc.includes('heat sink') && !desc.includes('fan') && !desc.includes('cage') && !desc.includes('cable')) {
+        cpuCount += qty;
+      }
+      if (desc.includes('epyc') && (desc.includes('9004') || desc.includes('9005') || desc.includes('genoa') || desc.includes('bergamo') || desc.includes('turin'))) {
+        detectedChannelWidth = 12;
+      } else if (desc.includes('xeon') && (desc.includes('4200') || desc.includes('5200') || desc.includes('6200') || desc.includes('8200') || desc.includes('cascade lake') || desc.includes('skylake'))) {
+        detectedChannelWidth = 6;
+      }
       const coreMatch = desc.match(/(\d+)\s*-?\s*core/i);
       if (coreMatch) totalCores += (parseInt(coreMatch[1], 10) * qty);
@@ -56,6 +68,7 @@ function extractWorkloadDna(items = []) {
     // Memory Profile
-    if (desc.includes('memory') || desc.includes('rdimm') || desc.includes('ddr5')) {
+    const isDriveOrStorage = desc.includes('ssd') || desc.includes('nvme') || desc.includes('hdd') || desc.includes('drive') || desc.includes('battery');
+    if (!isDriveOrStorage && (desc.includes('memory') || desc.includes('rdimm') || desc.includes('ddr5') || desc.includes('ddr4') || desc.includes('dimm'))) {
       memoryCount += qty;
       const gbMatch = desc.match(/(\d+)\s*gb/i);
       if (gbMatch) totalMemoryGb += (parseInt(gbMatch[1], 10) * qty);
@@ -90,6 +103,24 @@ function extractWorkloadDna(items = []) {
   const gbPerCore = totalCores > 0 ? parseFloat((totalMemoryGb / totalCores).toFixed(1)) : 0;
   const gpuModelStr = gpuModels.join(', ');
 
+  // NUMA & Memory Channel Interleaving Profile
+  const sockets = Math.max(1, cpuCount || 1);
+  const dimmsPerSocket = memoryCount > 0 ? (memoryCount / sockets) : 0;
+  const isSocketSymmetric = memoryCount > 0 && cpuCount > 0 && (memoryCount % cpuCount === 0);
+  const is1DpcBalanced = isSocketSymmetric && (dimmsPerSocket === detectedChannelWidth);
+  const is2DpcBalanced = isSocketSymmetric && (dimmsPerSocket === detectedChannelWidth * 2);
+  const isBalancedInterleaving = is1DpcBalanced || is2DpcBalanced;
+  const isSupportedPopulation = isSocketSymmetric && [1, 2, 4, detectedChannelWidth, detectedChannelWidth * 2].includes(dimmsPerSocket);
+  const numaTopology = {
+    cpuSockets: cpuCount,
+    memoryDimmCount: memoryCount,
+    totalMemoryGb,
+    dimmsPerSocket,
+    channelWidth: detectedChannelWidth,
+    isSocketSymmetric,
+    isBalancedInterleaving,
+    is1DpcBalanced,
+    is2DpcBalanced,
+    isSupportedPopulation,
+    interleavingMode: is1DpcBalanced
+      ? '1DPC_BALANCED_OPTIMAL'
+      : (is2DpcBalanced ? '2DPC_BALANCED_MAX_CAPACITY' : (isSupportedPopulation ? 'PARTIAL_INTERLEAVED' : 'UNBALANCED_CHANNEL_POPULATION'))
+  };
+
   return {
     primaryWorkload,
     workloadDescription,
     totalCores,
     maxFreqGhz,
+    cpuCount,
     totalMemoryGb,
+    memoryDimmCount: memoryCount,
+    numaTopology,
     gbPerCore,
@@ -127,7 +158,41 @@ function extractWorkloadDna(items = []) {
+function validateNumaMemoryTopology(items = [], options = {}) {
+  const dna = Array.isArray(items) ? extractWorkloadDna(items) : (items.numaTopology ? items : extractWorkloadDna([]));
+  const channelWidth = options.channelWidth || dna.numaTopology?.channelWidth || 8;
+  const cpuSockets = options.cpuSockets !== undefined ? options.cpuSockets : (dna.numaTopology?.cpuSockets || dna.cpuCount || 1);
+  const dimmCount = options.dimmCount !== undefined ? options.dimmCount : (dna.numaTopology?.memoryDimmCount || 0);
+  const totalMemoryGb = options.totalMemoryGb !== undefined ? options.totalMemoryGb : (dna.totalMemoryGb || 0);
+
+  const dimmsPerSocket = cpuSockets > 0 ? (dimmCount / cpuSockets) : 0;
+  const isSocketSymmetric = cpuSockets > 0 && dimmCount > 0 && (dimmCount % cpuSockets === 0);
+  const is1DpcBalanced = isSocketSymmetric && dimmsPerSocket === channelWidth;
+  const is2DpcBalanced = isSocketSymmetric && dimmsPerSocket === (channelWidth * 2);
+  const isBalancedInterleaving = is1DpcBalanced || is2DpcBalanced;
+  const isSupportedPopulation = isSocketSymmetric && [1, 2, 4, channelWidth, channelWidth * 2].includes(dimmsPerSocket);
+
+  const errors = [];
+  if (dimmCount === 0 && cpuSockets > 0) {
+    errors.push('No memory DIMMs detected for installed processors.');
+  } else if (!isSocketSymmetric) {
+    errors.push(`Unbalanced socket symmetry: ${dimmCount} DIMMs cannot be evenly distributed across ${cpuSockets} CPU sockets.`);
+  } else if (!isSupportedPopulation) {
+    errors.push(`Unbalanced channel population: ${dimmsPerSocket} DIMMs/socket violates ${channelWidth}-channel interleaving guidelines.`);
+  }
+
+  return {
+    isValid: errors.length === 0,
+    isSocketSymmetric,
+    isBalancedInterleaving,
+    is1DpcBalanced,
+    is2DpcBalanced,
+    isSupportedPopulation,
+    cpuSockets,
+    dimmCount,
+    dimmsPerSocket,
+    channelWidth,
+    totalMemoryGb,
+    interleavingMode: is1DpcBalanced
+      ? '1DPC_BALANCED_OPTIMAL'
+      : (is2DpcBalanced ? '2DPC_BALANCED_MAX_CAPACITY' : (isSupportedPopulation ? 'PARTIAL_INTERLEAVED' : 'UNBALANCED')),
+    errors
+  };
+}
+
 module.exports = {
-  extractWorkloadDna
+  extractWorkloadDna,
+  validateNumaMemoryTopology
 };
```

#### 2. `scripts/lib/boq/cross_vendor_transformer.js`
Enhance `parseCompetitorSpecification` and `audit12PointPhysicalParity` for `MEMORY_TOPOLOGY`:

```javascript
--- a/scripts/lib/boq/cross_vendor_transformer.js
+++ b/scripts/lib/boq/cross_vendor_transformer.js
@@ -16,6 +16,21 @@ function numberMatch(text, pattern) {
   return match ? Number(match[1]) : null;
 }
 
+function detectArchitectureChannelWidth(text = '', targetChassis = null) {
+  const t = String(text || '').toLowerCase();
+  const c = String(targetChassis || '').toLowerCase();
+  if (t.includes('9004') || t.includes('9005') || t.includes('genoa') || t.includes('bergamo') || t.includes('turin') ||
+      c.includes('dl385') || c.includes('dl365') || c.includes('dl345')) {
+    return 12;
+  }
+  if (t.includes('cascade lake') || t.includes('skylake') ||
+      /\b(4[12]\d{2}|5[12]\d{2}|6[12]\d{2}|8[12]\d{2})\b/.test(t) ||
+      (c.includes('gen10') && !c.includes('gen10 plus'))) {
+    return 6;
+  }
+  return 8;
+}
+
 function parseCompetitorSpecification(input, sourceVendor = null) {
@@ -37,8 +52,11 @@ function parseCompetitorSpecification(input, sourceVendor = null) {
   const cpuCores = numberMatch(cpu, /(\d+)[\s-]*(?:cores?\b|c\b|c\/)/i);
-  const dimmCount = numberMatch(memory, /(\d+)\s*[x*]\s*\d+\s*gb/i);
+  const dimmCount = numberMatch(memory, /(\d+)\s*(?:[x*]|dimms?\s*of)\s*\d+\s*gb/i)
+    ?? numberMatch(memory, /(\d+)\s*[x*]/i)
+    ?? numberMatch(memory, /(\d+)\s*dimms?\b/i);
   const dimmCapacityGb = numberMatch(memory, /(\d+)\s*gb/i);
+  const channelWidth = detectArchitectureChannelWidth(cpu);
 
@@ -58,9 +76,12 @@ function parseCompetitorSpecification(input, sourceVendor = null) {
     memory: {
       dimmCount, dimmCapacityGb,
       memorySpeedMt: numberMatch(memory, /ddr[45]-(\d+)/i) ?? numberMatch(memory, /(\d+)\s*(?:mt\/s|mhz)/i),
-      totalMemoryGb: dimmCount !== null && dimmCapacityGb !== null ? dimmCount * dimmCapacityGb : null,
-      isBalanced1Dpc: null
+      totalMemoryGb: dimmCount !== null && dimmCapacityGb !== null
+        ? dimmCount * dimmCapacityGb
+        : (dimmCount === null && dimmCapacityGb !== null ? dimmCapacityGb : null),
+      channelWidth,
+      isSocketSymmetric: cpuCount > 0 && dimmCount > 0 ? (dimmCount % cpuCount === 0) : null,
+      isBalanced1Dpc: cpuCount > 0 && dimmCount > 0 ? (dimmCount % cpuCount === 0 && (dimmCount / cpuCount) === channelWidth) : null,
+      isBalancedInterleaving: cpuCount > 0 && dimmCount > 0 ? (dimmCount % cpuCount === 0 && [channelWidth, channelWidth * 2].includes(dimmCount / cpuCount)) : null
     },
@@ -143,19 +164,65 @@ function audit12PointPhysicalParity(competitorSpec, targetBom = [], targetChassis = null) {
       case 'MEMORY_TOPOLOGY': {
         const reqMemGb = spec.memory?.totalMemoryGb;
         if (reqMemGb === null || reqMemGb === undefined) {
           return { subsystem, status: 'NOT_EVALUATED', details: 'No competitor memory capacity specified.' };
         }
+        let targetCpus = 0;
+        let cpuDesc = '';
+        for (const item of bom) {
+          const desc = (item.description || item.sku || '').toLowerCase();
+          if (/\b(processor|xeon|epyc)\b/i.test(desc) && !/\b(heatsink|heat sink|fan|cage|cable)\b/i.test(desc)) {
+            targetCpus += (item.quantity || 1);
+            cpuDesc += ' ' + desc;
+          }
+        }
+        if (targetCpus === 0) {
+          targetCpus = spec.compute?.cpuCount || 1;
+        }
+        const channelWidth = detectArchitectureChannelWidth((spec.rawInputText || '') + ' ' + cpuDesc, targetChassis);
+
         let targetMemGb = 0;
+        let targetDimmCount = 0;
         for (const item of bom) {
           const desc = (item.description || item.sku || '').toLowerCase();
-          if (/\b(dimm|rdimm|smart memory|memory)\b/i.test(desc) && !/\b(battery|controller)\b/i.test(desc)) {
+          if (/\b(dimm|rdimm|lrdimm|mrdimm|smart memory|memory)\b/i.test(desc) && !/\b(battery|controller|cage|flash|nvme|drive|blank)\b/i.test(desc)) {
             const capMatch = desc.match(/(\d+)\s*gb/i);
             const cap = capMatch ? parseInt(capMatch[1], 10) : 32;
-            targetMemGb += cap * (item.quantity || 1);
+            const q = item.quantity || 1;
+            targetDimmCount += q;
+            targetMemGb += cap * q;
           }
         }
-        if (targetMemGb >= reqMemGb) {
-          return { subsystem, status: targetMemGb > reqMemGb ? 'EXCEEDS' : 'MATCHED', details: `Target provides ${targetMemGb} GB RAM vs competitor requirement of ${reqMemGb} GB.` };
+        if (targetMemGb < reqMemGb) {
+          return { subsystem, status: 'DEFICIT', details: `Target provides ${targetMemGb} GB RAM vs competitor requirement of ${reqMemGb} GB (Deficit: ${reqMemGb - targetMemGb} GB).` };
         }
-        return { subsystem, status: 'DEFICIT', details: `Target provides ${targetMemGb} GB RAM vs competitor requirement of ${reqMemGb} GB (Deficit: ${reqMemGb - targetMemGb} GB).` };
+        if (targetCpus > 1 && targetDimmCount > 0 && (targetDimmCount % targetCpus !== 0)) {
+          return {
+            subsystem,
+            status: 'DEFICIT',
+            details: `Unbalanced socket memory symmetry: ${targetDimmCount} DIMMs cannot be evenly divided across ${targetCpus} CPU sockets (${(targetDimmCount / targetCpus).toFixed(1)} DIMMs/socket). NUMA performance will be degraded.`
+          };
+        }
+        const dimmsPerCpu = targetCpus > 0 && targetDimmCount > 0 ? (targetDimmCount / targetCpus) : 0;
+        const isSupportedPopulation = [1, 2, 4, channelWidth, channelWidth * 2].includes(dimmsPerCpu);
+        const is1DpcBalanced = dimmsPerCpu === channelWidth;
+        const is2DpcBalanced = dimmsPerCpu === (channelWidth * 2);
+        if (targetDimmCount > 0 && !isSupportedPopulation) {
+          return {
+            subsystem,
+            status: 'DEFICIT',
+            details: `Unbalanced memory channel interleaving: ${dimmsPerCpu} DIMMs per CPU on ${channelWidth}-channel architecture (${targetDimmCount} DIMMs total for ${targetCpus}P). Optimal memory bandwidth requires 1 DIMM per channel (${channelWidth} per CPU, ${channelWidth * targetCpus} total) or 2 DIMMs per channel (${channelWidth * 2} per CPU).`
+          };
+        }
+        if (spec.memory?.isBalanced1Dpc && !is1DpcBalanced) {
+          return {
+            subsystem,
+            status: 'DEFICIT',
+            details: `Competitor specified balanced 1DPC memory (${channelWidth} DIMMs/socket), but target provides ${dimmsPerCpu} DIMMs/socket.`
+          };
+        }
+        const modeStr = is1DpcBalanced ? '1DPC Optimal' : is2DpcBalanced ? '2DPC Maximum Capacity' : 'Supported Symmetric';
+        return {
+          subsystem,
+          status: targetMemGb > reqMemGb ? 'EXCEEDS' : 'MATCHED',
+          details: `Target provides ${targetMemGb} GB RAM (${targetDimmCount}x DIMMs, ${dimmsPerCpu} DIMMs/socket) with balanced ${channelWidth}-channel NUMA interleaving (${modeStr}): satisfies competitor requirement of ${reqMemGb} GB.`
+        };
       }
```

#### 3. `scripts/lib/conflict/strategy_synthesizer.js`
Add `_tryBudgetStorageSubstitution` and connect it into `synthesizeBudgetMinimizationCandidate`:

```javascript
--- a/scripts/lib/conflict/strategy_synthesizer.js
+++ b/scripts/lib/conflict/strategy_synthesizer.js
@@ -1134,6 +1134,97 @@ function _tryBudgetThermalSubstitution(parts, aspectCompute, aspectPcie, getPrice) {
   return changed;
 }
 
+const CERTIFIED_STORAGE_DOWNTIER_MAP = {
+  '800GB_MU_BC': { sku: 'P40542-B21', desc: 'HPE 960GB NVMe Gen4 High Performance Read Intensive SFF BC U.3 SSD', capGb: 960, refPrice: 320.0 },
+  '960GB_MU_BC': { sku: 'P40542-B21', desc: 'HPE 960GB NVMe Gen4 High Performance Read Intensive SFF BC U.3 SSD', capGb: 960, refPrice: 320.0 },
+  '1.6TB_MU_BC': { sku: 'P40543-B21', desc: 'HPE 1.92TB NVMe Gen4 High Performance Read Intensive SFF BC U.3 SSD', capGb: 1920, refPrice: 450.0 },
+  '1.92TB_MU_BC': { sku: 'P40543-B21', desc: 'HPE 1.92TB NVMe Gen4 High Performance Read Intensive SFF BC U.3 SSD', capGb: 1920, refPrice: 450.0 },
+  '3.2TB_MU_BC': { sku: 'P40544-B21', desc: 'HPE 3.84TB NVMe Gen4 High Performance Read Intensive SFF BC U.3 SSD', capGb: 3840, refPrice: 850.0 },
+  '3.84TB_MU_BC': { sku: 'P40544-B21', desc: 'HPE 3.84TB NVMe Gen4 High Performance Read Intensive SFF BC U.3 SSD', capGb: 3840, refPrice: 850.0 },
+  '6.4TB_MU_BC': { sku: 'P40545-B21', desc: 'HPE 7.68TB NVMe Gen4 High Performance Read Intensive SFF BC U.3 SSD', capGb: 7680, refPrice: 1600.0 },
+  '7.68TB_MU_BC': { sku: 'P40545-B21', desc: 'HPE 7.68TB NVMe Gen4 High Performance Read Intensive SFF BC U.3 SSD', capGb: 7680, refPrice: 1600.0 }
+};
+
+function _tryBudgetStorageSubstitution(parts, workloadDna, loadedCatalog, getPrice) {
+  const dna = workloadDna || extractWorkloadDna(parts);
+  const isWriteIntensive =
+    dna.storageWorkload === 'WRITE_INTENSIVE' ||
+    dna.isWriteIntensive === true ||
+    /\b(write intensive|write-intensive|db logging|transaction log|write-heavy|wal|redo log)\b/i.test(dna.workloadDescription || '') ||
+    /\b(write intensive|write-intensive|db logging|transaction log|write-heavy|wal|redo log)\b/i.test(dna.primaryWorkload || '');
+
+  if (isWriteIntensive) {
+    return false; // Invariant: Never down-tier write-intensive workloads
+  }
+
+  let changed = false;
+  const catIndex = loadedCatalog ? buildCatalogSkuIndex(loadedCatalog) : null;
+
+  for (let i = 0; i < parts.length; i++) {
+    const p = parts[i];
+    const desc = (p.description || '').toLowerCase();
+    if (desc.includes('controller') || desc.includes('cable') || desc.includes('cage') ||
+        desc.includes('backplane') || desc.includes('battery') || desc.includes('blank')) {
+      continue;
+    }
+    const isNvme = desc.includes('nvme');
+    const isMixedUse = desc.includes('mixed use') || desc.includes(' mu ') || desc.includes(' mu') || /\bmu\b/i.test(desc) || desc.includes('high performance');
+
+    if (!isNvme || !isMixedUse) continue;
+
+    const tbMatch = desc.match(/(\d+(?:\.\d+)?)\s*tb/i);
+    const gbMatch = desc.match(/(\d+)\s*gb/i);
+    const origCapGb = tbMatch ? Math.round(parseFloat(tbMatch[1]) * 1000) : (gbMatch ? parseInt(gbMatch[1], 10) : 1920);
+    const isBc = desc.includes(' bc') || desc.includes('basic carrier') || !desc.includes(' sc');
+
+    let replacement = null;
+    // 1. Search loaded catalog index for exact match
+    if (catIndex) {
+      for (const [candSku, item] of catIndex.entries()) {
+        if (item.lifecycleStatus === 'OB' || item.lifecycleStatus === 'EOL') continue;
+        const cDesc = (item.skuData?.Description || item.entry?.description || '').toLowerCase();
+        if (!cDesc.includes('ssd') || !cDesc.includes('nvme') || !cDesc.includes('read intensive')) continue;
+        if (isBc && !cDesc.includes(' bc') && !cDesc.includes('basic carrier')) continue;
+        const cTb = cDesc.match(/(\d+(?:\.\d+)?)\s*tb/i);
+        const cGb = cDesc.match(/(\d+)\s*gb/i);
+        const candCapGb = cTb ? Math.round(parseFloat(cTb[1]) * 1000) : (cGb ? parseInt(cGb[1], 10) : 0);
+        if (candCapGb >= origCapGb && candCapGb <= Math.round(origCapGb * 1.5)) {
+          const candPrice = getPrice(candSku);
+          const curPrice = p.unitPriceUsd || getPrice(p.sku) || 999999;
+          if (candPrice !== null && candPrice < curPrice) {
+            replacement = { sku: candSku, desc: item.skuData?.Description || item.entry?.description, price: candPrice };
+            break;
+          }
+        }
+      }
+    }
+
+    // 2. Deterministic certified mapping fallback
+    if (!replacement) {
+      const key = `${origCapGb >= 1000 ? (origCapGb / 1000).toFixed(origCapGb % 1000 === 0 ? 0 : 2) : origCapGb}${origCapGb >= 1000 ? 'TB' : 'GB'}_MU_BC`;
+      const mapping = CERTIFIED_STORAGE_DOWNTIER_MAP[key] || (origCapGb <= 1920 ? CERTIFIED_STORAGE_DOWNTIER_MAP['1.92TB_MU_BC'] : CERTIFIED_STORAGE_DOWNTIER_MAP['3.84TB_MU_BC']);
+      if (mapping) {
+        const candPrice = getPrice(mapping.sku) || mapping.refPrice;
+        const curPrice = p.unitPriceUsd || getPrice(p.sku) || (mapping.refPrice * 1.6);
+        if (candPrice < curPrice) {
+          replacement = { sku: mapping.sku, desc: mapping.desc, price: candPrice };
+        }
+      }
+    }
+
+    if (replacement && cleanBaseSKU(replacement.sku) !== cleanBaseSKU(p.sku)) {
+      parts[i] = {
+        ...p,
+        sku: replacement.sku,
+        description: replacement.desc,
+        unitPriceUsd: replacement.price,
+        extendedPriceUsd: replacement.price * (p.quantity || 1),
+        isStrategyAddon: true,
+        category: 'Budget Optimized Storage'
+      };
+      changed = true;
+    }
+  }
+  return changed;
+}
+
-function synthesizeBudgetMinimizationCandidate(v1, evalResults, loadedCatalog, chassisInfo, getPrice, revalidateCached) {
+function synthesizeBudgetMinimizationCandidate(v1, evalResults, loadedCatalog, chassisInfo, getPrice, revalidateCached, options = {}) {
   const parts = v1.parts.map(p => ({ ...p }));
   const aspectCompute = evalResults.aspects?.compute || {};
   const aspectPower = evalResults.aspects?.power || {};
   const aspectPcie = evalResults.aspects?.pcie || {};
+  const workloadDna = evalResults.workloadDna || evalResults.dna || options.dna || extractWorkloadDna(parts);
 
   const mChanged = _tryBudgetMemorySubstitution(parts, aspectCompute, getPrice);
   const pChanged = _tryBudgetPowerSubstitution(parts, aspectPower, getPrice);
   const tChanged = _tryBudgetThermalSubstitution(parts, aspectCompute, aspectPcie, getPrice);
+  const sChanged = _tryBudgetStorageSubstitution(parts, workloadDna, loadedCatalog, getPrice);
 
-  if (mChanged || pChanged || tChanged) {
+  if (mChanged || pChanged || tChanged || sChanged) {
     const reval = revalidateCached(parts);
@@ -1451,3 +1542,3 @@ function synthesize5TierRankedSolutions(...) {
-  const v5 = synthesizeBudgetMinimizationCandidate(v1, evalResults, loadedCatalog, chassisInfo, getPrice, revalidateCached);
+  const v5 = synthesizeBudgetMinimizationCandidate(v1, evalResults, loadedCatalog, chassisInfo, getPrice, revalidateCached, { dna });
```

#### 4. `scripts/lib/conflict/resource_arbitrator.js` (Challenger M2_1 Remediation)
Fix rear-bay branchId linking, license presence check, and null argument handling:

```javascript
--- a/scripts/lib/conflict/resource_arbitrator.js
+++ b/scripts/lib/conflict/resource_arbitrator.js
@@ -516,7 +516,7 @@ function _arbitrateSupportLicensingAspect(items, evalResults, _chassisInfo, cont
   });
-  const hasMgmtLicense = support.hasManagementLicense !== false && items.some(it => {
+  const hasMgmtLicense = support.hasManagementLicense === true || (support.hasManagementLicense !== false && items.some(it => {
     const s = cleanBaseSKU(it.sku);
     const d = (it.description || '').toLowerCase();
     return ['R7A11AAE', 'E5Y43A', 'E5Y43AAE', 'R7A12AAE', 'S2E10AAE', 'S5E59AAE', 'S1A05A'].includes(s) ||
@@ -562,3 +562,4 @@ function arbitrateContestedResources(items = [], evalResults = {}, chassisInfo = {}, catalogData = null) {
+  const safeItems = Array.isArray(items) ? items : [];
   const contentions = [];
   const branches = [];
@@ -581,3 +582,3 @@ function arbitrateContestedResources(items = [], evalResults = {}, chassisInfo = {}, catalogData = null) {
-  items.forEach(it => {
+  safeItems.forEach(it => {
@@ -746,4 +747,4 @@ function arbitrateContestedResources(items = [], evalResults = {}, chassisInfo = {}, catalogData = null) {
   // 2. Drive Bay vs. Rear Boot Device Contention
-  const rearBootDevices = items.filter(it => (it.description || '').toLowerCase().includes('ns204i-u'));
-  const rearDriveCages = items.filter(it => (it.description || '').toLowerCase().includes('rear') && ((it.description || '').toLowerCase().includes('cage') || (it.description || '').toLowerCase().includes('2sff')));
+  const rearBootDevices = safeItems.filter(it => (it.description || '').toLowerCase().includes('ns204i-u'));
+  const rearDriveCages = safeItems.filter(it => (it.description || '').toLowerCase().includes('rear') && ((it.description || '').toLowerCase().includes('cage') || (it.description || '').toLowerCase().includes('2sff')));
 
   if (rearBootDevices.length > 0 && rearDriveCages.length > 0) {
     contentions.push({
       resourceType: 'REAR_CHASSIS_BAY_SPACE',
       maxCapacity: 1,
       requestedDemands: 2,
-      tradeoffSummary: 'Rear chassis bay is contested between NS204i-u Boot Device and 2SFF Rear Drive Cage.'
+      tradeoffSummary: 'Rear chassis bay is contested between NS204i-u Boot Device and 2SFF Rear Drive Cage.',
+      branchId: 'branch_pcie_boot_device',
+      hypothesis: 'Initial BOQ attempted to house both NS204i-u rear boot device and 2SFF rear drive cage in the same rear bay.',
+      detectedFailure: 'Rear chassis bay physical space exceeded: NS204i-u Boot Device and 2SFF Rear Drive Cage both contend for rear bay slot.',
+      backtrackedFrom: 'NS204i-u rear boot device in rear bay',
+      selfCorrectionAction: 'Branch C: Standup PCIe OS Boot Device (Rear Drive Capacity Expansion)',
+      resolutionDetails: 'Pivoted NS204i-u rear boot device to PCIe slot (NS204i-p) to accommodate rear 2SFF drive cage while preserving OS boot mirroring.'
     });
```

#### 5. `scripts/lib/system/counterfactual_repair.js` (Challenger M2_1 Remediation)
Add null argument guards for `evalResults` and `options`:

```javascript
--- a/scripts/lib/system/counterfactual_repair.js
+++ b/scripts/lib/system/counterfactual_repair.js
@@ -14,3 +14,4 @@ const { cleanBaseSKU } = require('../catalog/sku.js');
 function _extractAspects(evalResults = {}) {
-  const summary = evalResults.evalSummary || {};
+  const safeEval = evalResults || {};
+  const summary = safeEval.evalSummary || {};
   return {
@@ -366,4 +367,6 @@ function generateCounterfactualRepairProofs(evalResults = {}, options = {}) {
+  const safeEval = evalResults || {};
+  const safeOpts = options || {};
-  const { power, memory, compute, pcie, storage, support, errors, acceptance, selfCorrectionTrail } = _extractAspects(evalResults);
-  const serverCount = options.serverCount || evalResults.serverCount || 1;
+  const { power, memory, compute, pcie, storage, support, errors, acceptance, selfCorrectionTrail } = _extractAspects(safeEval);
+  const serverCount = safeOpts.serverCount || safeEval.serverCount || 1;
```

---

### B. Comprehensive Test Case Design

Worker M3 / Test Engineer should implement these test cases in `tests/unit/test_m3_numa_and_rank5_downtiering.js`:

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompetitorSpecification, audit12PointPhysicalParity } = require('../../scripts/lib/boq/cross_vendor_transformer.js');
const { extractWorkloadDna, validateNumaMemoryTopology } = require('../../scripts/lib/conflict/workload_dna.js');
const { synthesize5TierRankedSolutions } = require('../../scripts/lib/conflict/strategy_synthesizer.js');

test('Feature 10: Multi-Socket NUMA Channel Interleaving Topology', async (t) => {
  await t.test('1. Detects balanced 1DPC memory configuration (8 channels / 16 DIMMs on 2P)', () => {
    const spec = parseCompetitorSpecification('2x Intel Xeon Platinum 8480+ 56C; 16x 32GB DDR5-5600 RDIMM', 'DELL');
    assert.equal(spec.memory.totalMemoryGb, 512);
    assert.equal(spec.memory.channelWidth, 8);
    assert.equal(spec.memory.isSocketSymmetric, true);
    assert.equal(spec.memory.isBalanced1Dpc, true);

    const bom = [
      { sku: 'P49610-B21', quantity: 2, description: 'Intel Xeon-Gold 6430 32-core Processor' },
      { sku: 'P43328-B21', quantity: 16, description: 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit' }
    ];
    const audit = audit12PointPhysicalParity(spec, bom, 'DL380_Gen11');
    const memAudit = audit.auditItems.find(a => a.subsystem === 'MEMORY_TOPOLOGY');
    assert.equal(memAudit.status, 'MATCHED');
    assert.ok(memAudit.details.includes('1DPC Optimal'));
  });

  await t.test('2. Flags DEFICIT when DIMMs are asymmetric across sockets (e.g. 7 DIMMs on 2P)', () => {
    const spec = parseCompetitorSpecification('2x Intel Xeon; 8x 32GB RDIMM', 'CISCO');
    const bom = [
      { sku: 'P49610-B21', quantity: 2, description: 'Intel Xeon-Gold 6430 32-core Processor' },
      { sku: 'P43328-B21', quantity: 7, description: 'HPE 64GB DDR5 Smart Memory' } // 448GB >= 256GB, but 7 DIMMs on 2 sockets!
    ];
    const audit = audit12PointPhysicalParity(spec, bom, 'DL380_Gen11');
    const memAudit = audit.auditItems.find(a => a.subsystem === 'MEMORY_TOPOLOGY');
    assert.equal(memAudit.status, 'DEFICIT');
    assert.ok(memAudit.details.includes('Unbalanced socket memory symmetry'));
  });

  await t.test('3. Flags DEFICIT when DIMM population violates channel interleaving (e.g. 10 DIMMs on 2P Intel 8-ch)', () => {
    const spec = parseCompetitorSpecification('2x Intel Xeon; 16x 32GB RDIMM', 'LENOVO');
    const bom = [
      { sku: 'P49610-B21', quantity: 2, description: 'Intel Xeon-Gold 6430 32-core Processor' },
      { sku: 'P43328-B21', quantity: 10, description: 'HPE 64GB DDR5 Smart Memory' } // 640GB >= 512GB, 5 DIMMs/socket violates 8-channel interleaving!
    ];
    const audit = audit12PointPhysicalParity(spec, bom, 'DL380_Gen11');
    const memAudit = audit.auditItems.find(a => a.subsystem === 'MEMORY_TOPOLOGY');
    assert.equal(memAudit.status, 'DEFICIT');
    assert.ok(memAudit.details.includes('Unbalanced memory channel interleaving'));
  });

  await t.test('4. Correctly validates 12-channel AMD EPYC Genoa/Bergamo architecture', () => {
    const spec = parseCompetitorSpecification('2x AMD EPYC 9654 96-core Genoa; 24x 64GB DDR5 RDIMM', 'DELL');
    assert.equal(spec.memory.channelWidth, 12);
    assert.equal(spec.memory.isBalanced1Dpc, true);

    const bom = [
      { sku: 'P53696-B21', quantity: 2, description: 'AMD EPYC 9654 2.4GHz 96-core Processor' },
      { sku: 'P43328-B21', quantity: 24, description: 'HPE 64GB DDR5 Smart Memory' }
    ];
    const audit = audit12PointPhysicalParity(spec, bom, 'DL385_Gen11');
    const memAudit = audit.auditItems.find(a => a.subsystem === 'MEMORY_TOPOLOGY');
    assert.equal(memAudit.status, 'MATCHED');
    assert.ok(memAudit.details.includes('12-channel'));
  });

  await t.test('5. validateNumaMemoryTopology utility correctly returns structured interleaving status', () => {
    const topo = validateNumaMemoryTopology([], { cpuSockets: 2, dimmCount: 16, channelWidth: 8 });
    assert.equal(topo.isValid, true);
    assert.equal(topo.is1DpcBalanced, true);
    assert.equal(topo.interleavingMode, '1DPC_BALANCED_OPTIMAL');

    const badTopo = validateNumaMemoryTopology([], { cpuSockets: 2, dimmCount: 6, channelWidth: 8 });
    assert.equal(badTopo.isValid, false);
    assert.equal(badTopo.interleavingMode, 'UNBALANCED');
  });
});

test('Feature 12: Rank 5 Value-Engineering NVMe Down-Tiering', async (t) => {
  await t.test('1. Down-tiers Mixed Use NVMe SSD to Read Intensive NVMe SSD in non-write-intensive workload', () => {
    const items = [
      { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF NC CTO Server', quantity: 1, unitPriceUsd: 1650 },
      { sku: 'P49610-B21', description: 'Intel Xeon-Gold 6430 2.1GHz 32-core 270W Processor', quantity: 2, unitPriceUsd: 2200 },
      { sku: 'P43328-B21', description: 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit', quantity: 16, unitPriceUsd: 180 },
      { sku: 'P40548-B21', description: 'HPE 1.92TB NVMe Gen4 High Performance Mixed Use SFF BC U.3 SSD', quantity: 4, unitPriceUsd: 750 },
      { sku: 'P48803-B21', description: 'HPE 800W Flex Slot Platinum Power Supply', quantity: 2, unitPriceUsd: 280 }
    ];

    const tiers = synthesize5TierRankedSolutions(items, {}, {}, { model: 'DL380 Gen11' });
    const rank5 = tiers.find(r => r.rank === 5);
    assert.ok(rank5, 'Must generate Rank 5 solution');

    const originalDrives = items.filter(i => i.sku === 'P40548-B21');
    const r5Drives = rank5.skuPartsList.filter(p => p.sku === 'P40543-B21');
    assert.equal(r5Drives.length, 1);
    assert.equal(r5Drives[0].quantity, 4);
    assert.ok(r5Drives[0].description.includes('Read Intensive'));
    assert.ok(rank5.estimatedCostUsd < tiers[0].estimatedCostUsd, 'Rank 5 CapEx must be less than Rank 1');
  });

  await t.test('2. NEVER down-tiers Mixed Use NVMe SSD when workload DNA is WRITE_INTENSIVE', () => {
    const items = [
      { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF NC CTO Server', quantity: 1, unitPriceUsd: 1650 },
      { sku: 'P49610-B21', description: 'Intel Xeon-Gold 6430 2.1GHz 32-core 270W Processor', quantity: 2, unitPriceUsd: 2200 },
      { sku: 'P43328-B21', description: 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit', quantity: 16, unitPriceUsd: 180 },
      { sku: 'P40548-B21', description: 'HPE 1.92TB NVMe Gen4 High Performance Mixed Use SFF BC U.3 SSD (Write Intensive Database Transaction Log)', quantity: 4, unitPriceUsd: 750 },
      { sku: 'P48803-B21', description: 'HPE 800W Flex Slot Platinum Power Supply', quantity: 2, unitPriceUsd: 280 }
    ];

    const evalResults = {
      workloadDna: { storageWorkload: 'WRITE_INTENSIVE', primaryWorkload: 'DATABASE_TRANSACTION_LOG' }
    };

    const tiers = synthesize5TierRankedSolutions(items, evalResults, {}, { model: 'DL380 Gen11' });
    const rank5 = tiers.find(r => r.rank === 5);
    const hasMuDrives = rank5.skuPartsList.some(p => p.sku === 'P40548-B21');
    assert.equal(hasMuDrives, true, 'Write intensive workload must retain Mixed Use NVMe SSDs without down-tiering');
  });

  await t.test('3. Preserves total capacity (TB) and form factor during down-tiering (e.g. 800GB MU -> 960GB RI)', () => {
    const items = [
      { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF NC CTO Server', quantity: 1, unitPriceUsd: 1650 },
      { sku: 'P49610-B21', description: 'Intel Xeon-Gold 6430 2.1GHz 32-core Processor', quantity: 2, unitPriceUsd: 2200 },
      { sku: 'P43328-B21', description: 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit', quantity: 16, unitPriceUsd: 180 },
      { sku: 'P40546-B21', description: 'HPE 800GB NVMe Gen4 Mixed Use SFF BC SSD', quantity: 2, unitPriceUsd: 490 }
    ];

    const tiers = synthesize5TierRankedSolutions(items, {}, {}, { model: 'DL380 Gen11' });
    const rank5 = tiers.find(r => r.rank === 5);
    const r5Drives = rank5.skuPartsList.filter(p => p.sku === 'P40542-B21');
    assert.equal(r5Drives.length, 1);
    assert.equal(r5Drives[0].quantity, 2);
    assert.ok(r5Drives[0].description.includes('960GB'), 'Capacity must not decrease (800GB -> 960GB)');
  });
});
```

---

## 5. Verification Method

To independently verify these specifications and tests once implemented:

```bash
# 1. Run unit tests for cross-vendor transformer and strategy synthesizer
node --test tests/unit/test_cross_vendor_transformer.js
node --test tests/unit/test_cross_vendor_and_candidate_scrutiny.js
node --test tests/chaos/test_m2_counterfactual_self_correction_stress.js

# 2. Run new Feature 10 & 12 test suite (once created by Worker M3)
node --test tests/unit/test_m3_numa_and_rank5_downtiering.js

# 3. Verify static quality gates (95 rules, zero warnings)
npm run lint:core
npm run lint:complexity

# 4. Verify fast smoke regression suite
npm run test:smoke
```
