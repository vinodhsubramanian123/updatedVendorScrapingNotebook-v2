# DL380a Gen12 Multi-Drive Factory RAID Transpilation, NS204i-u Boot Decoupling & Turnkey Racking Closure

**Document ID:** `AUDIT-2026-11-04-DL380A-GEN12-RAID1-STORAGE-TURNKEY-CLOSURE`  
**Execution Date:** `2026-11-04`  
**Governing Invariant:** [`INV-228`](../INVARIANTS.md#inv-228)  
**Target Platform:** HPE ProLiant Compute DL380a Gen12 (`P76706-B21`)  
**Lead Solution Architect:** Antigravity (Gemini Dual-Brain Engine)

---

## 1. Executive Summary & Problem Context

During live presales order entry for a customer RFP requesting 4x NVIDIA H200 GPUs, 64 vCPUs, 1 TB RAM, 3 TB SSD storage, 3 years support, and professional installation/racking/cabling:
1. **Multi-Drive Factory RAID Error:** Loading an order containing 4x NVMe SSDs (`P50216-B21` / `P50219-B21`) with `339778-B21` (*HPE RAID 1 Drive 1 FIO Setting*) triggered an unbuildable rejection in HPE OCA / CLIC configurators.
2. **Boot Storage vs Data Storage Ambiguity:** Confusion arose regarding whether the dedicated OS boot device `P78279-B21` (HPE NS204i-u v2 NVMe Boot Optimized Storage Device) has a dependency on standard SFF NVMe data drives (`P63833-B21` / `P50219-B21`).
3. **Turnkey Deployment Completeness:** Partner exports in OCA achieved hardware buildability but omitted mandatory physical deployment infrastructure (Rack Rails `P69770-B21` and 25GbE Optical Transceivers `845398-B21`).

This audit certifies the permanent closed-loop resolution codified across the continuous learning registry (`catalog_deltas.json`), `docs/INVARIANTS.md`, and the dual-brain evaluation engine.

---

## 2. Certified Knowledge Deltas & Continuous Learning Entries

The following candidate knowledge deltas have been certified and persisted in [`outputs/ProLiant/Gen12/DL380a_Gen12/history/catalog_deltas.json`](../../outputs/ProLiant/Gen12/DL380a_Gen12/history/catalog_deltas.json):

### A. Multi-Drive Factory RAID Transpilation (`LEARN_DL380A_GEN12_RAID1_MULTI_DRIVE_20261104`)
* **Affected SKU:** `339778-B21` (HPE RAID 1 Drive 1 FIO Setting)
* **Root Cause:** In HPE OCA/CLIC rules engine, `339778-B21` hardcodes an array geometry constraint of `Drive Count == 2`. When $>2$ drives (e.g. 4x NVMe SSDs) are present, CLIC rejects the build because Drives 3 & 4 remain unallocated.
* **Resolution Rule:**
  * If dedicated NS204i-u boot controller (`P78279-B21`) is present, `339778-B21` is automatically pruned as redundant (OS boot is already hardware-mirrored).
  * If factory RAID pre-configuration across the drive cage is explicitly requested in the tender, the engine automatically transpiles `339778-B21` to **`389692-B21`** (*HPE Customer Defined RAID Setting Service*, max 1) with zero CapEx delta, instructing HPE manufacturing to configure custom array groupings without triggering automated geometric rejections.

### B. Boot Tier vs Workload Tier Storage Decoupling (`LEARN_DL380A_GEN12_BOOT_DATA_DECOUPLING_20261104`)
* **Affected SKU:** `P78279-B21` (HPE NS204i-u v2 480GB Boot Device)
* **Root Cause:** Presales ambiguity regarding whether NS204i-u requires data drives or vice versa.
* **Resolution Rule:**
  * `P78279-B21` and its front boot cage (`P75284-B21`) operate over dedicated PCIe/USB interfaces and have **zero dependency** on standard SFF drive cages (`P74710-B21`), direct-attach cables (`P74702-B21`), or data SSDs (`P63833-B21` / `P50219-B21`).
  * Sizing pipelines maintain strict tier isolation:
    * **Tier A (OS Boot):** Hardware RAID 1 via NS204i-u (optional, enterprise best practice).
    * **Tier B (Workload Storage):** 1–4x SFF NVMe SSDs direct-attached to Xeon PCIe lanes for maximum GPUDirect Storage throughput.

### C. Turnkey Racking & Cabling Completeness Gate (`LEARN_DL380A_GEN12_TURNKEY_RACKING_CABLING_20261104`)
* **Affected SKU:** `P69770-B21` (DL380a Gen12 Ball Bearing Rail Kit) & `845398-B21` (25Gb SFP28 SR Transceiver)
* **Root Cause:** Base CTO chassis `P76706-B21` does NOT bundle rack rails, and SFP28 adapters (`P10115-B21`) do not bundle optical optics. Turnkey customer RFPs specifying "racking and cabling" fail at customer site deployment if these are omitted.
* **Resolution Rule:**
  * When customer tender text includes "installation", "racking", or "cabling", the 18-point pre-presentation acceptance gate verifies:
    1. `P69770-B21` is present.
    2. Optical transceivers (or DAC cables) matching the network adapter port count are present.
    3. Installation labor scope (`HA113A1` vs partner internal delivery) is explicitly reconciled.

---

## 3. Invariant Codification (`INV-228`)

The master invariant `INV-228` is codified in [`docs/INVARIANTS.md`](../INVARIANTS.md) and linked in root [`AGENTS.md`](../../AGENTS.md).

All automated test suites, presales query routers, and BOQ evaluation pipelines enforce these invariants in subsequent runs.
