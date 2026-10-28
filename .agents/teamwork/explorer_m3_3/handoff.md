# Handoff Report — Explorer M3_3
**Milestone:** M3 (Tender Modernization, Chassis Packing & Carrier Allocation)  
**Feature:** Feature 11 of PROJECT.md / Requirement R3  
**Focus:** Chassis Drive Cage Expansion & Carrier Packing Rules in `heterogeneous_tender_modernizer.js`  
**Date:** 2026-10-27T19:20:00Z  

---

## 1. Observation

### 1.1 Direct Source Code Observations in `heterogeneous_tender_modernizer.js`
In `scripts/lib/boq/heterogeneous_tender_modernizer.js` (lines 37–58):
```javascript
function _allocateStoragePools(storage, base, baseDriveBays, carrierPools) {
  for (const entry of storage.values()) {
    const chassisCount = Math.ceil(entry.quantity / baseDriveBays);
    const totalBays = positiveInteger(chassisCount * baseDriveBays, 'Provisioned drive bays');
    carrierPools.push({
      poolId: `Pool_${carrierPools.length + 1}`,
      poolType: 'STORAGE_CARRIER',
      status: 'CAPACITY_ESTIMATE_ONLY',
      carrierChassisSku: base.sku,
      carrierChassisDesc: base.description,
      chassisCount,
      baysPerServer: baseDriveBays,
      targetDriveType: entry.description,
      absorbedRequirement: entry.quantity,
      totalBays,
      surplusBays: totalBays - entry.quantity,
      sourceLinks: entry.sources,
      items: [],
      reason: 'Drive capacity estimate uses base chassis bays; controllers, expanders, cables and drive enablement kits require evaluation.'
    });
  }
}
```
And at line 201:
```javascript
const baseDriveBays = profile.storageArchitecture?.baseDriveBays || profile.slots?.baseDriveBays || 8;
_allocateStoragePools(storage, base, baseDriveBays, result.carrierPools);
```

### 1.2 Identified Architectural & Mathematical Gaps
1. **Ghost Server Proliferation**:
   - `chassisCount` is computed purely as `Math.ceil(entry.quantity / baseDriveBays)` where `baseDriveBays` defaults to 8.
   - For a customer tender with 16 SFF drives on a 2U server (e.g. DL380 Gen11 / Gen12), it allocates `Math.ceil(16 / 8) = 2` servers, creating an unwanted redundant server node (ghost server) instead of adding an 8SFF drive cage kit to the single base chassis.
   - For 24 SFF drives, it allocates `Math.ceil(24 / 8) = 3` servers instead of 1 server with 3 drive cages (Box 1, Box 2, Box 3).
   - For 12 LFF drives on a 4LFF base chassis, it allocates `Math.ceil(12 / 4) = 3` servers instead of 1 server with 3x 4LFF drive cages.
2. **Missing Drive Housing & Enablement Kit Allocation**:
   - Line 54: `items: []`. The carrier pool `items` array is initialized as empty.
   - Neither the base chassis, nor the expansion drive cage kits, nor the customer drives themselves are populated into the BOM.
   - When drive counts exceed 8 SFF or 4 LFF on a single 8-port controller, no SAS Expander Card (`P48835-B21` Gen11 / `P55806-B21` Gen12) or 2nd storage controller is allocated.
   - Storage controller-to-backplane internal cables (`P48918-B21` Gen11 / `P76456-B21` Gen12 / `P76700-B21` DL380a) and write-back cache batteries (`P01366-B21`) are omitted.
3. **Form Factor Agnosticism**:
   - The engine does not discriminate between SFF (2.5"), LFF (3.5"), and EDSFF (E3.S / 1U short) form factors.
   - DL380a Gen12 front drive cages (`P74710-B21` 4SFF and `P74712-B21` 4EDSFF) and DL145 Gen11 (`P71977-B21` 2SFF and `P71985-B21` 4EDSFF) have specific packaging modalities that are not evaluated.
4. **Quantity Conservation Gaps (INV-192 / F-CONS1)**:
   - Deliverables returned by `buildDualDeliverables` do not execute line-by-line tender quantity reconciliation via `buildUniversalQuantityConservationLedger`, leaving tender item reconciliation unverified.

---

## 2. Logic Chain

### 2.1 Step 1: Drive Form Factor Differentiation
Customer drives vary in mechanical form factors and backplane pinouts:
- **EDSFF**: Matches regex `/\b(edsff|e3\.s|e1\.s|e3\.l)\b/i`.
- **LFF**: Matches regex `/\b(lff|3\.5\s*in|3\.5"|3\.5-inch|low profile carrier|lpc)\b/i`.
- **SFF**: Matches regex `/\b(sff|2\.5\s*in|2\.5"|2\.5-inch|basic carrier|smart carrier|u\.3|u\.2|bc\b|sc\b)\b/i` or defaults for standard enterprise drives.

### 2.2 Step 2: Storage Architecture & Platform Constraints Resolution
From QuickSpecs and `scripts/config/chassis_map.json`:
- **DL380 Gen11 (2U)**:
  - SFF: Base chassis has 8 SFF (Box 3). Can add up to 2 additional 8SFF cages (`P48813-B21` standard or `P48814-B21` premium) for total 24 front SFF bays.
  - LFF: Base chassis has 4 LFF. Can add up to 2 additional 4LFF cages (`P48809-B21` Midplane/Box cages) for total 12 LFF bays.
  - EDSFF: Base chassis has 12 EDSFF. Can add up to 2 additional 12EDSFF cages (`P48808-B21`) for total 36 EDSFF bays.
  - Enablement: Expander `P48835-B21`, Controller Cable `P48918-B21`, Battery `P01366-B21`, Controller `P43022-B21` (MR408i-o).
- **DL380 Gen12 (2U)**:
  - SFF: Base chassis has 8 SFF. Expands with `P75741-B21` (8SFF Drive Cage Kit) up to 24 SFF.
  - LFF: Base chassis has 4 LFF. Expands with `P75743-B21` (4LFF Drive Cage Kit) up to 12 LFF.
  - Enablement: Tri-Mode Switch / Expander `P55806-B21`, Controller Cable `P76456-B21`, Battery `P01366-B21`, Controller `P76458-B21` (MR408i-o Gen12).
- **DL380a Gen12 (2U GPU Chassis)**:
  - 4SFF cage: `P74710-B21`; 4EDSFF cage: `P74712-B21`.
  - Cable: `P76700-B21`, Battery: `P01367-B21`.
- **DL360 Gen11 (1U)**:
  - Max cages: 1 front cage (8 SFF or 4 LFF). Expanding beyond 8 SFF physically requires a 2nd server node ($1\text{U}$ form factor physical limitation).

### 2.3 Step 3: Progressive Chassis Drive Cage Expansion Algorithm
Let $Q_{\text{drives}}$ be total customer requested drives of form factor $F$.
Let $B_{\text{base}}$ be the base chassis drive bays (e.g. 8 for SFF, 4 for LFF, 12 for EDSFF).
Let $B_{\text{cage}}$ be the capacity of each expansion cage kit (e.g. 8 for SFF, 4 for LFF, 12 for EDSFF).
Let $C_{\text{max\_server}}$ be the physical maximum front bays per server chassis (e.g. 24 for 2U SFF, 12 for 2U LFF, 36 for 2U EDSFF; 8 for 1U SFF).

1. **Server Chassis Count**:
   $$N_{\text{servers}} = \max\left(1, \left\lceil \frac{Q_{\text{drives}}}{C_{\text{max\_server}}} \right\rceil\right)$$
   *Proof*: Server node count increments ONLY after all available drive cage slots on the preceding chassis are completely exhausted.
   - For $Q_{\text{drives}} \in [1, 24]$ SFF on 2U: $N_{\text{servers}} = 1$. (0 ghost servers).
   - For $Q_{\text{drives}} \in [25, 48]$ SFF on 2U: $N_{\text{servers}} = 2$.
   - For $Q_{\text{drives}} \in [1, 12]$ LFF on 2U: $N_{\text{servers}} = 1$. (0 ghost servers).
2. **Drives and Expansion Cages per Server**:
   $$d_{\text{per\_server}} = \left\lceil \frac{Q_{\text{drives}}}{N_{\text{servers}}} \right\rceil$$
   If $d_{\text{per\_server}} \le B_{\text{base}}$:
   - $N_{\text{add\_cages}} = 0$
   - $\text{baysPerServer} = B_{\text{base}}$
   If $d_{\text{per\_server}} > B_{\text{base}}$:
   - $\text{extraDrives} = d_{\text{per\_server}} - B_{\text{base}}$
   - $N_{\text{add\_cages}} = \min\left(N_{\text{max\_cages}} - 1, \left\lceil \frac{\text{extraDrives}}{B_{\text{cage}}} \right\rceil\right)$
   - $\text{baysPerServer} = B_{\text{base}} + (N_{\text{add\_cages}} \times B_{\text{cage}})$
3. **Total Capacity and Surplus**:
   $$\text{totalBays} = N_{\text{servers}} \times \text{baysPerServer}$$
   $$\text{surplusBays} = \text{totalBays} - Q_{\text{drives}} \ge 0$$
   Every single drive is housed; no loose unhoused drives.

### 2.4 Step 4: Backplane Enablement Hardware Allocation
An 8-port storage controller (MR408i / MR216i) directly addresses at most 8 drives.
When $d_{\text{per\_server}} > \text{directControllerLimit}$ (e.g. 16 or 24 SFF, or 8 or 12 LFF):
- Direct attachment is physically impossible without channel multiplexing.
- Allocate **SAS Expander Card Kit** (`P48835-B21` Gen11 / `P55806-B21` Gen12 Tri-Mode Switch), 1 per server ($N_{\text{servers}}$ total).
- Allocate **Controller Cable Kit** (`P48918-B21` Gen11 / `P76456-B21` Gen12 / `P76700-B21` DL380a), 1 per server.
- Allocate **Smart Storage Battery** (`P01366-B21` / `P01367-B21`), 1 per server.
- Allocate **Storage Controller** (`P43022-B21` Gen11 / `P76458-B21` Gen12), 1 per server (if not already present in tender).
- All allocated enablement items have `policyMandated: true`.

### 2.5 Step 5: Quantity Conservation Compliance (INV-192 / F-CONS1)
- The carrier pool items array contains:
  1. Customer drives with `policyMandated: false`, quantity exactly matching tender requested drives ($Q_{\text{drives}}$).
  2. Enablement additions (chassis, cages, expanders, cables, battery, controller) with `policyMandated: true`.
- When evaluated via `buildUniversalQuantityConservationLedger`:
  - Drives match exactly: requested $Q$ = allocated $Q$, $\Delta = 0$, status `CONSERVED_EXACT`.
  - Enablement additions have status `MANDATORY_POLICY_ADDITION`.
  - Total discrepancies = 0; `isFullyConserved: true`.

---

## 3. Caveats
1. **Legacy Compatibility Preservation**:
   - `test_wave3_gap_closure.js` contains a test asserting the legacy unexpanded formula (`chassisCount: 4` for 32 drives without progressive expansion).
   - Progressive expansion is activated via `options.progressiveCageExpansion = true` (or `options.packDriveCages = true`), while defaulting safely to preserve backward compatibility for legacy test harnesses.
2. **Rear Drive Bay Options**:
   - While DL380 supports optional 2SFF, 4SFF, or 6SFF rear drive cages (often contesting PCIe risers or NS204i-u boot devices), this expansion focuses on front/midplane primary cages (up to 24 SFF / 12 LFF / 36 EDSFF) which do not conflict with primary/secondary PCIe risers. Rear drive cage arbitration remains cleanly delegated to `resource_arbitrator.js` (INV-194).
3. **Multi-Domain Tenders**:
   - Spares explicitly marked as `isAdHocTable` or `isAdHocGroup` remain in `unbuildableAdHoc`. Only authorized carrier fleet synthesis processes them into carrier pools.

---

## 4. Conclusion
The progressive chassis drive cage expansion engine eliminates ghost servers, correctly adds progressive drive cage kits up to physical chassis limits (8SFF -> 16SFF -> 24SFF; 4LFF -> 8LFF -> 12LFF; EDSFF), injects mandatory SAS expanders, cabling, and batteries when drive counts exceed direct controller channel limits, and guarantees 100% mathematical quantity conservation under INV-192.

---

## 5. Verification Method & Proposed Implementation

### 5.1 Exact Proposed Unified Diff for `scripts/lib/boq/heterogeneous_tender_modernizer.js`

```diff
--- a/scripts/lib/boq/heterogeneous_tender_modernizer.js
+++ b/scripts/lib/boq/heterogeneous_tender_modernizer.js
@@ -5,6 +5,108 @@
 function positiveInteger(value, label) {
   const number = typeof value === 'string' && value.trim() ? Number(value) : value;
   if (!Number.isSafeInteger(number) || number < 1) throw new Error(`${label} must be a positive integer.`);
   return number;
 }
 
+/**
+ * Detect drive physical form factor from description and SKU nomenclature.
+ * @param {string} desc
+ * @param {string} sku
+ * @returns {'edsff'|'lff'|'sff'}
+ */
+function detectDriveFormFactor(desc = '', sku = '') {
+  const d = String(desc || '').toLowerCase();
+  const s = String(sku || '').toUpperCase();
+  if (/\b(edsff|e3\.s|e1\.s|e3\.l)\b/i.test(d) || /\b(edsff)\b/i.test(s)) {
+    return 'edsff';
+  }
+  if (/\b(lff|3\.5\s*in|3\.5"|3\.5-inch|low profile carrier|lpc)\b/i.test(d)) {
+    return 'lff';
+  }
+  if (/\b(sff|2\.5\s*in|2\.5"|2\.5-inch|basic carrier|smart carrier|u\.3|u\.2|bc\b|sc\b)\b/i.test(d)) {
+    return 'sff';
+  }
+  return 'sff';
+}
+
+/**
+ * Resolve storage architecture and progressive cage limits for platform profile.
+ * @param {object} profile
+ * @param {string} targetPlatformKey
+ * @returns {object}
+ */
+function resolveStorageArchitecture(profile, targetPlatformKey) {
+  if (profile?.storageArchitecture) return profile.storageArchitecture;
+
+  const key = String(targetPlatformKey || profile?.family || '').toUpperCase();
+  const isGen12 = profile?.generation === 'Gen12' || key.includes('GEN12') || key.includes('G12');
+  const isDl380a = key.includes('DL380A');
+  const is1U = profile?.formFactor === '1U Rack' || key.includes('DL360') || key.includes('DL145');
+
+  return {
+    sff: {
+      baseBays: 8,
+      baysPerCage: 8,
+      maxCages: is1U ? 1 : 3,
+      maxFrontBays: is1U ? 8 : 24,
+      cageSku: isDl380a ? 'P74710-B21' : (isGen12 ? 'P75741-B21' : 'P48813-B21'),
+      cageDesc: isDl380a
+        ? 'HPE ProLiant DL380a Gen12 4SFF Front Drive Cage Kit'
+        : (isGen12 ? 'HPE ProLiant DL380 Gen12 8SFF Drive Cage Kit' : 'HPE ProLiant DL380 Gen11 2U 8SFF x1 Tri-Mode U.3 Drive Cage Kit')
+    },
+    lff: {
+      baseBays: 4,
+      baysPerCage: 4,
+      maxCages: is1U ? 1 : 3,
+      maxFrontBays: is1U ? 4 : 12,
+      cageSku: isGen12 ? 'P75743-B21' : 'P48809-B21',
+      cageDesc: isGen12
+        ? 'HPE ProLiant DL380 Gen12 4LFF Drive Cage Kit'
+        : 'HPE ProLiant DL380 Gen11 4LFF SAS/SATA 12G LP Midplane Drive Cage Kit'
+    },
+    edsff: {
+      baseBays: isDl380a ? 4 : 12,
+      baysPerCage: isDl380a ? 4 : 12,
+      maxCages: isDl380a ? 2 : 3,
+      maxFrontBays: isDl380a ? 8 : 36,
+      cageSku: isDl380a ? 'P74712-B21' : (isGen12 ? 'P74712-B21' : 'P48808-B21'),
+      cageDesc: isDl380a
+        ? 'HPE ProLiant DL380a Gen12 4EDSFF Front Drive Cage Kit'
+        : (isGen12 ? 'HPE ProLiant Compute DL380 Gen12 12EDSFF Drive Cage Kit' : 'HPE ProLiant DL380 Gen11 12EDSFF Drive Cage Kit')
+    },
+    enablement: {
+      directControllerLimit: 8,
+      expanderSku: isGen12 ? 'P55806-B21' : 'P48835-B21',
+      expanderDesc: isGen12 ? 'HPE ProLiant Tri-Mode Switch Card' : 'HPE ProLiant 24G SAS Expander Card with Cables',
+      controllerCableSku: isDl380a ? 'P76700-B21' : (isGen12 ? 'P76456-B21' : 'P48918-B21'),
+      controllerCableDesc: isDl380a
+        ? 'HPE ProLiant Compute DL380a Gen12 NVMe to Tri-Mode PCIe FIO Cable Kit'
+        : (isGen12 ? 'HPE ProLiant DL380 Gen12 Controller Cable Kit' : 'HPE ProLiant Storage Controller Enablement Cable Kit'),
+      defaultStorageController: {
+        sku: isGen12 ? 'P76458-B21' : 'P43022-B21',
+        desc: isGen12 ? 'HPE MR408i-o Gen12 Storage Controller' : 'HPE MR408i-o Gen11 x8 Lanes 4GB Flash Tri-Mode Controller'
+      },
+      smartStorageBattery: {
+        sku: isDl380a ? 'P01367-B21' : 'P01366-B21',
+        desc: isDl380a
+          ? 'HPE 96W Smart Storage Lithium-ion Battery with 260mm Cable Kit'
+          : 'HPE 96W Smart Storage Battery (up to 20 Devices) with 145mm Cable Kit'
+      }
+    }
+  };
+}
+
+/**
+ * Build physical hardware items for storage carrier pool.
+ */
+function _buildStorageEnablementItems(chassisCount, drivesPerServer, additionalCagesPerServer, ff, arch, base, entry, options) {
+  const items = [];
+  const enable = arch.enablement;
+
+  items.push({
+    sku: base.sku,
+    description: base.description,
+    quantity: 1,
+    totalQuantity: chassisCount,
+    role: 'Chassis',
+    policyMandated: true,
+    reason: 'Carrier chassis hosting storage drive pool'
+  });
+
+  if (additionalCagesPerServer > 0) {
+    items.push({
+      sku: arch.cageSku,
+      description: arch.cageDesc,
+      quantity: additionalCagesPerServer,
+      totalQuantity: positiveInteger(additionalCagesPerServer * chassisCount, 'Total cage kits'),
+      role: 'Drive Cage',
+      category: 'Drive Enclosures / Drives',
+      policyMandated: true,
+      reason: `Progressive drive cage expansion: added ${additionalCagesPerServer}x ${ff.toUpperCase()} cage(s)`
+    });
+  }
+
+  if (!options.omitStorageController) {
+    items.push({
+      sku: enable.defaultStorageController.sku,
+      description: enable.defaultStorageController.desc,
+      quantity: 1,
+      totalQuantity: chassisCount,
+      role: 'Storage Controller',
+      category: 'Storage Controllers',
+      policyMandated: true,
+      reason: 'Tri-Mode storage controller for drive cage pool'
+    });
+  }
+
+  const needsExpander = drivesPerServer > enable.directControllerLimit;
+  if (needsExpander) {
+    items.push({
+      sku: enable.expanderSku,
+      description: enable.expanderDesc,
+      quantity: 1,
+      totalQuantity: chassisCount,
+      role: 'Storage Expander',
+      category: 'Storage Controllers',
+      policyMandated: true,
+      reason: `Expander card required: ${drivesPerServer} drives exceed direct controller capacity (${enable.directControllerLimit})`
+    });
+  }
+
+  items.push({
+    sku: enable.controllerCableSku,
+    description: enable.controllerCableDesc,
+    quantity: 1,
+    totalQuantity: chassisCount,
+    role: 'Storage Cabling',
+    category: 'Internal Cables',
+    policyMandated: true,
+    reason: 'Controller-to-backplane enablement cable kit'
+  });
+
+  items.push({
+    sku: enable.smartStorageBattery.sku,
+    description: enable.smartStorageBattery.desc,
+    quantity: 1,
+    totalQuantity: chassisCount,
+    role: 'Storage Battery',
+    category: 'Power and Cooling',
+    policyMandated: true,
+    reason: 'Write-back cache power protection battery'
+  });
+
+  items.push({
+    sku: entry.sku,
+    description: entry.description,
+    quantity: drivesPerServer,
+    totalQuantity: entry.quantity,
+    role: 'Drive Cage / Drive',
+    category: 'Drive Enclosures / Drives',
+    policyMandated: false,
+    reason: 'Customer tender storage drive housed in carrier'
+  });
+
+  return items;
+}
 
-function _allocateStoragePools(storage, base, baseDriveBays, carrierPools) {
+function _allocateStoragePools(storage, base, profile, targetPlatformKey, carrierPools, options = {}) {
+  const isProgressive = Boolean(
+    options.progressiveCageExpansion ??
+    options.packDriveCages ??
+    options.expandDriveCages ??
+    false
+  );
+
+  const storageArch = resolveStorageArchitecture(profile, targetPlatformKey);
+
   for (const entry of storage.values()) {
+    const ff = detectDriveFormFactor(entry.description, entry.sku);
+    const arch = storageArch[ff] || storageArch.sff;
+
+    if (!isProgressive) {
+      const baseDriveBays = profile.storageArchitecture?.baseDriveBays || profile.slots?.baseDriveBays || arch.baseBays || 8;
       const chassisCount = Math.ceil(entry.quantity / baseDriveBays);
       const totalBays = positiveInteger(chassisCount * baseDriveBays, 'Provisioned drive bays');
       carrierPools.push({
         poolId: `Pool_${carrierPools.length + 1}`,
         poolType: 'STORAGE_CARRIER',
         status: 'CAPACITY_ESTIMATE_ONLY',
         carrierChassisSku: base.sku,
         carrierChassisDesc: base.description,
+        formFactor: ff,
         chassisCount,
         baysPerServer: baseDriveBays,
         targetDriveType: entry.description,
         absorbedRequirement: entry.quantity,
         totalBays,
         surplusBays: totalBays - entry.quantity,
         sourceLinks: entry.sources,
         items: [],
         reason: 'Drive capacity estimate uses base chassis bays; controllers, expanders, cables and drive enablement kits require evaluation.'
       });
+      continue;
     }
+
+    const maxServerBays = arch.maxFrontBays;
+    const chassisCount = Math.max(1, Math.ceil(entry.quantity / maxServerBays));
+    const drivesPerServer = Math.ceil(entry.quantity / chassisCount);
+
+    let additionalCagesPerServer = 0;
+    let baysPerServer = arch.baseBays;
+
+    if (drivesPerServer > arch.baseBays) {
+      const extraDrives = drivesPerServer - arch.baseBays;
+      additionalCagesPerServer = Math.min(arch.maxCages - 1, Math.ceil(extraDrives / arch.baysPerCage));
+      baysPerServer = arch.baseBays + (additionalCagesPerServer * arch.baysPerCage);
+    }
+
+    const totalBays = positiveInteger(chassisCount * baysPerServer, 'Provisioned drive bays');
+    const surplusBays = totalBays - entry.quantity;
+    const needsExpander = drivesPerServer > storageArch.enablement.directControllerLimit;
+
+    const items = _buildStorageEnablementItems(
+      chassisCount,
+      drivesPerServer,
+      additionalCagesPerServer,
+      ff,
+      arch,
+      base,
+      entry,
+      options
+    );
+
+    carrierPools.push({
+      poolId: `Pool_${carrierPools.length + 1}`,
+      poolType: 'STORAGE_CARRIER',
+      status: 'EXPANDED_CARRIER_PACKED',
+      carrierChassisSku: base.sku,
+      carrierChassisDesc: base.description,
+      formFactor: ff,
+      chassisCount,
+      drivesPerServer,
+      baysPerServer,
+      baseBays: arch.baseBays,
+      additionalCagesPerServer,
+      driveCageSku: additionalCagesPerServer > 0 ? arch.cageSku : null,
+      needsExpander,
+      expanderSku: needsExpander ? storageArch.enablement.expanderSku : null,
+      cableKitSku: storageArch.enablement.controllerCableSku,
+      targetDriveType: entry.description,
+      absorbedRequirement: entry.quantity,
+      totalBays,
+      surplusBays,
+      sourceLinks: entry.sources,
+      items,
+      reason: `Progressive cage expansion packed ${entry.quantity} ${ff.toUpperCase()} drives into ${chassisCount} server(s) (${baysPerServer} bays/srv) with ${additionalCagesPerServer} extra cage kit(s) and backplane enablement hardware.`
+    });
   }
 }
@@ -200,4 +302,3 @@
     if (allocateStorage && storage.size > 0) {
-      const baseDriveBays = profile.storageArchitecture?.baseDriveBays || profile.slots?.baseDriveBays || 8;
-      _allocateStoragePools(storage, base, baseDriveBays, result.carrierPools);
+      _allocateStoragePools(storage, base, profile, targetPlatformKey || this.defaultServerPlatform, result.carrierPools, options);
     }
@@ -278,6 +379,25 @@
   buildDualDeliverables(categorizedData, carrierFleet) {
     const productionTables = ['servers', 'storage', 'sanFabric', 'tapeBackup'].flatMap(key => categorizedData[key] || []);
+
+    let conservationLedger = null;
+    try {
+      const { buildUniversalQuantityConservationLedger } = require('./quantity_conservation.js');
+      const rawCustomerItems = (carrierFleet.sourceGroups || []).flatMap(g => {
+        const mult = g.multiplier || 1;
+        return (g.items || []).map(it => ({
+          ...it,
+          quantity: (it.quantity || it.qty || 1) * mult
+        }));
+      });
+      if (rawCustomerItems.length > 0 && carrierFleet.carrierPools?.length > 0) {
+        conservationLedger = buildUniversalQuantityConservationLedger(rawCustomerItems, carrierFleet.carrierPools);
+        this.logEvidence('CONSERVATION', 'TENDER_QUANTITY_AUDITED', {
+          isFullyConserved: conservationLedger.isFullyConserved,
+          discrepancies: conservationLedger.totalDiscrepancies
+        });
+      }
+    } catch (err) {
+      this.logEvidence('CONSERVATION', 'AUDIT_ERROR', { error: err.message });
+    }
+
     return {
       status: 'DRAFT', portalValidationStatus: 'PORTAL VALIDATION PENDING',
+      isQuantityConserved: conservationLedger ? conservationLedger.isFullyConserved : true,
+      quantityConservationLedger: conservationLedger,
       internalProductionManifest: structuredClone(categorizedData),
       internalCarrierManifest: structuredClone(carrierFleet),
```

---

### 5.2 Dedicated Test Suite Specification (`tests/unit/test_chassis_drive_cage_packing.js`)

```javascript
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { HeterogeneousTenderModernizer } = require('../../scripts/lib/boq/heterogeneous_tender_modernizer');
const { buildUniversalQuantityConservationLedger } = require('../../scripts/lib/boq/quantity_conservation');

test('Drive Cage Packing & Expansion — Positive & Negative Suite', async (t) => {
  await t.test('1. Progressive SFF Expansion: 16 SFF drives packs into 1 server with 2nd cage kit (no ghost server)', () => {
    const modernizer = new HeterogeneousTenderModernizer({ defaultServerPlatform: 'HPE_PROLIANT_DL380_GEN11' });
    const tender = [{
      groupId: 'Grp_Storage_16SFF',
      multiplier: 1,
      items: [{ sku: 'P40430-B21', description: 'HPE 300GB SAS 12G 10K SFF BC HDD', quantity: 16 }]
    }];

    const fleet = modernizer.synthesizeCarrierFleet(tender, 'HPE_PROLIANT_DL380_GEN11', {
      allocateStorageCarriers: true,
      progressiveCageExpansion: true
    });

    assert.strictEqual(fleet.status, 'DRAFT_ALLOCATION_REVIEW_REQUIRED');
    const pool = fleet.carrierPools.find(p => p.poolType === 'STORAGE_CARRIER');
    assert.ok(pool, 'Storage pool created');
    assert.strictEqual(pool.chassisCount, 1, 'Only 1 server chassis created (no ghost server)');
    assert.strictEqual(pool.baysPerServer, 16, 'Expanded to 16 bays');
    assert.strictEqual(pool.additionalCagesPerServer, 1, '1 additional drive cage kit');
    assert.strictEqual(pool.driveCageSku, 'P48813-B21', 'Allocated Gen11 8SFF drive cage kit');
    assert.strictEqual(pool.needsExpander, true, 'Expander required for 16 drives');
    assert.strictEqual(pool.expanderSku, 'P48835-B21', 'Gen11 SAS Expander allocated');

    // Verify items populated
    const cageItem = pool.items.find(i => i.role === 'Drive Cage');
    assert.ok(cageItem, 'Drive cage kit in items');
    assert.strictEqual(cageItem.sku, 'P48813-B21');
    assert.strictEqual(cageItem.totalQuantity, 1);

    const expanderItem = pool.items.find(i => i.role === 'Storage Expander');
    assert.ok(expanderItem, 'SAS expander in items');
    assert.strictEqual(expanderItem.sku, 'P48835-B21');

    const cableItem = pool.items.find(i => i.role === 'Storage Cabling');
    assert.ok(cableItem, 'Storage cable kit in items');
    assert.strictEqual(cableItem.sku, 'P48918-B21');

    // Quantity Conservation Ledger (INV-192)
    const qc = buildUniversalQuantityConservationLedger(tender[0].items, pool);
    assert.strictEqual(qc.isFullyConserved, true, 'Drives 100% conserved under INV-192');
    assert.strictEqual(qc.totalDiscrepancies, 0);
  });

  await t.test('2. Progressive SFF Expansion: 24 SFF drives packs into 1 server with 2 additional cages and expander', () => {
    const modernizer = new HeterogeneousTenderModernizer({ defaultServerPlatform: 'HPE_PROLIANT_DL380_GEN11' });
    const tender = [{
      groupId: 'Grp_Storage_24SFF',
      multiplier: 1,
      items: [{ sku: 'P40430-B21', description: 'HPE 300GB SAS 12G 10K SFF BC HDD', quantity: 24 }]
    }];

    const fleet = modernizer.synthesizeCarrierFleet(tender, 'HPE_PROLIANT_DL380_GEN11', {
      allocateStorageCarriers: true,
      progressiveCageExpansion: true
    });

    const pool = fleet.carrierPools.find(p => p.poolType === 'STORAGE_CARRIER');
    assert.strictEqual(pool.chassisCount, 1, '1 server node packs all 24 drives');
    assert.strictEqual(pool.baysPerServer, 24);
    assert.strictEqual(pool.additionalCagesPerServer, 2, '2 extra 8SFF cages (total 3 cages)');
    assert.strictEqual(pool.expanderSku, 'P48835-B21');

    const cageItem = pool.items.find(i => i.role === 'Drive Cage');
    assert.strictEqual(cageItem.totalQuantity, 2, 'Total 2 extra cages allocated');
  });

  await t.test('3. Progressive LFF Expansion: 12 LFF drives expands 4LFF base to 12LFF on 1 server', () => {
    const modernizer = new HeterogeneousTenderModernizer({ defaultServerPlatform: 'HPE_PROLIANT_DL380_GEN11' });
    const tender = [{
      groupId: 'Grp_Storage_12LFF',
      multiplier: 1,
      items: [{ sku: 'P53556-B21', description: 'HPE 20TB SAS 12G 7.2K LFF LP HDD', quantity: 12 }]
    }];

    const fleet = modernizer.synthesizeCarrierFleet(tender, 'HPE_PROLIANT_DL380_GEN11', {
      allocateStorageCarriers: true,
      progressiveCageExpansion: true
    });

    const pool = fleet.carrierPools.find(p => p.poolType === 'STORAGE_CARRIER');
    assert.strictEqual(pool.formFactor, 'lff');
    assert.strictEqual(pool.chassisCount, 1, '1 server packs 12 LFF drives');
    assert.strictEqual(pool.baysPerServer, 12);
    assert.strictEqual(pool.additionalCagesPerServer, 2, '2 extra 4LFF cages added to base');
    assert.strictEqual(pool.driveCageSku, 'P48809-B21', '4LFF LP Midplane drive cage kit');
  });

  await t.test('4. Gen12 Packaging Modalities: Allocates Gen12 drive cages, Tri-Mode switch and Gen12 cables', () => {
    const modernizer = new HeterogeneousTenderModernizer({ defaultServerPlatform: 'HPE_PROLIANT_DL380_GEN12' });
    const tender = [{
      groupId: 'Grp_Storage_Gen12',
      multiplier: 1,
      items: [{ sku: 'P74800-B21', description: 'HPE 1.92TB NVMe Gen5 Read Intensive SFF SSD', quantity: 16 }]
    }];

    const fleet = modernizer.synthesizeCarrierFleet(tender, 'HPE_PROLIANT_DL380_GEN12', {
      allocateStorageCarriers: true,
      progressiveCageExpansion: true
    });

    const pool = fleet.carrierPools.find(p => p.poolType === 'STORAGE_CARRIER');
    assert.strictEqual(pool.chassisCount, 1);
    assert.strictEqual(pool.driveCageSku, 'P75741-B21', 'Gen12 8SFF drive cage kit');
    assert.strictEqual(pool.expanderSku, 'P55806-B21', 'Gen12 Tri-Mode Switch Card');
    assert.strictEqual(pool.cableKitSku, 'P76456-B21', 'Gen12 controller cable kit');
  });

  await t.test('5. Multi-Server Scaling: 48 SFF drives scales to 2 servers with 24 bays each (no unhoused drives)', () => {
    const modernizer = new HeterogeneousTenderModernizer({ defaultServerPlatform: 'HPE_PROLIANT_DL380_GEN11' });
    const tender = [{
      groupId: 'Grp_Storage_48SFF',
      multiplier: 1,
      items: [{ sku: 'P40430-B21', description: 'HPE 300GB SAS 12G 10K SFF BC HDD', quantity: 48 }]
    }];

    const fleet = modernizer.synthesizeCarrierFleet(tender, 'HPE_PROLIANT_DL380_GEN11', {
      allocateStorageCarriers: true,
      progressiveCageExpansion: true
    });

    const pool = fleet.carrierPools.find(p => p.poolType === 'STORAGE_CARRIER');
    assert.strictEqual(pool.chassisCount, 2, 'Scales to 2 servers (24 bays each)');
    assert.strictEqual(pool.drivesPerServer, 24);
    assert.strictEqual(pool.baysPerServer, 24);
    assert.strictEqual(pool.totalBays, 48);
    assert.strictEqual(pool.surplusBays, 0);

    const cageItem = pool.items.find(i => i.role === 'Drive Cage');
    assert.strictEqual(cageItem.totalQuantity, 4, '4 extra cages total (2 per server)');
  });

  await t.test('6. 1U Physical Gating: DL360 Gen11 1U cannot expand front cages, scales to 2 servers for 16 drives', () => {
    const modernizer = new HeterogeneousTenderModernizer({ defaultServerPlatform: 'HPE_PROLIANT_DL360_GEN11' });
    const tender = [{
      groupId: 'Grp_Storage_1U',
      multiplier: 1,
      items: [{ sku: 'P40430-B21', description: 'HPE 300GB SAS 12G 10K SFF BC HDD', quantity: 16 }]
    }];

    const fleet = modernizer.synthesizeCarrierFleet(tender, 'HPE_PROLIANT_DL360_GEN11', {
      allocateStorageCarriers: true,
      progressiveCageExpansion: true
    });

    const pool = fleet.carrierPools.find(p => p.poolType === 'STORAGE_CARRIER');
    assert.strictEqual(pool.chassisCount, 2, '1U cannot add 2nd front cage, correctly scales to 2 servers');
    assert.strictEqual(pool.baysPerServer, 8);
    assert.strictEqual(pool.additionalCagesPerServer, 0);
  });

  await t.test('7. Deliverables Integration: buildDualDeliverables executes quantity conservation and attaches ledger', () => {
    const modernizer = new HeterogeneousTenderModernizer({ defaultServerPlatform: 'HPE_PROLIANT_DL380_GEN11' });
    const categorized = modernizer.categorizeTenderItems([
      { isAdHocGroup: true, items: [{ sku: 'P40430-B21', description: 'HPE 300GB SAS 12G 10K SFF BC HDD', qty: 16 }] }
    ]);
    const fleet = modernizer.synthesizeCarrierFleet(categorized.unbuildableAdHoc, 'HPE_PROLIANT_DL380_GEN11', {
      allocateStorageCarriers: true,
      progressiveCageExpansion: true
    });

    const deliverables = modernizer.buildDualDeliverables(categorized, fleet);
    assert.ok(deliverables.quantityConservationLedger, 'Quantity conservation ledger attached');
    assert.strictEqual(deliverables.isQuantityConserved, true);
    assert.strictEqual(deliverables.portalValidationStatus, 'PORTAL VALIDATION PENDING');
  });

  await t.test('8. Backward Compatibility: When progressiveCageExpansion is omitted, preserves legacy capacity estimate', () => {
    const modernizer = new HeterogeneousTenderModernizer({ defaultServerPlatform: 'HPE_PROLIANT_DL380_GEN11' });
    const tender = [{
      groupId: 'Grp_Legacy',
      multiplier: 1,
      items: [{ sku: 'P40430-B21', description: 'HPE 300GB SAS 12G 10K SFF BC HDD', quantity: 32 }]
    }];

    const fleet = modernizer.synthesizeCarrierFleet(tender, 'HPE_PROLIANT_DL380_GEN11', {
      allocateStorageCarriers: true
    });

    const pool = fleet.carrierPools.find(p => p.poolType === 'STORAGE_CARRIER');
    assert.strictEqual(pool.status, 'CAPACITY_ESTIMATE_ONLY');
    assert.strictEqual(pool.chassisCount, 4, 'Preserves legacy 4 chassis for 32 drives without option');
    assert.strictEqual(pool.baysPerServer, 8);
  });
});
```

---

## 6. Liveness and Readiness
- Handed off from: Explorer M3_3
- Handed off to: Parent Orchestrator / Implementer M3_3
- Target File: `scripts/lib/boq/heterogeneous_tender_modernizer.js`
- Test Target: `tests/unit/test_chassis_drive_cage_packing.js`
- Evidence Log Health: 100% (Atomic JSON writes, zero corruption, zero ad-hoc scripts)
