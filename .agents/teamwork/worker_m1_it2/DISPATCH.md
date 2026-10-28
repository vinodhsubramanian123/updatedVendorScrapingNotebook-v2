## 2026-10-27T14:43:29Z
You are Worker M1_It2 (archetype: teamwork_preview_worker).
Your assigned working directory is:
c:\Users\latha\antigravityProjects\updatedVendorScrapingNotebook-v2\.agents\teamwork\worker_m1_it2

MANDATORY FIRST STEP: Read the authoritative user request at:
c:\Users\latha\antigravityProjects\updatedVendorScrapingNotebook-v2\.agents\teamwork\ORIGINAL_REQUEST.md

Read the project specification at:
c:\Users\latha\antigravityProjects\updatedVendorScrapingNotebook-v2\.agents\teamwork\orchestrator_1\PROJECT.md

Read the exact unified diffs and blueprints from all three Iteration 2 Explorers:
- Explorer M1_It2_1 Handoff (Thermal & Memory): c:\Users\latha\antigravityProjects\updatedVendorScrapingNotebook-v2\.agents\teamwork\explorer_m1_it2_1\handoff.md
- Explorer M1_It2_2 Handoff (Power & Licensing): c:\Users\latha\antigravityProjects\updatedVendorScrapingNotebook-v2\.agents\teamwork\explorer_m1_it2_2\handoff.md
- Explorer M1_It2_3 Handoff (PCIe & Storage): c:\Users\latha\antigravityProjects\updatedVendorScrapingNotebook-v2\.agents\teamwork\explorer_m1_it2_3\handoff.md

FILE WRITE OWNERSHIP:
You have exclusive write ownership of:
- `scripts/lib/aspects/compute_thermal.js`
- `scripts/lib/aspects/memory_channel.js`
- `scripts/lib/aspects/power_environment.js`
- `scripts/lib/aspects/support_manufacturing.js`
- `scripts/lib/aspects/aspect_registry.js`
- `scripts/lib/aspects/pcie_riser.js`
- `scripts/lib/aspects/storage_tri_mode.js`
- `tests/unit/test_aspect_*.js`
- `tests/chaos/test_m1_aspect_adversarial_stress.js`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

TASK IMPLEMENTATION REQUIREMENTS:
1. `compute_thermal.js`:
   - Harmonize DLC cold plate modules with heatsinks: `needsHeatsink = cpuCount > 0 && !hasHeatsinks && !hasDirectLiquidCooling`.
   - In `isHeatsinkItem`: add negative guard for plastic air baffles, brackets, ducts, cable guides (`baffle`, `guide`, `blank`, `bracket`, `duct`, `cable`, `cbl`).
2. `memory_channel.js`:
   - Add word-boundary JEDEC token recognition (`/\bpc4\b/i` and `/\bpc5\b/i`) to `isDdr4` and `isDdr5`.
   - Add `isDriveOrStorageItem` guard to exclude NVMe SSDs, flash storage drives, and batteries from RAM DIMM counting.
3. `power_environment.js`:
   - Multi-node cluster power: Calculate `effectiveServerCount = Math.max(1, effectiveNodes || 1)` and `estimatedHardwareWattsPerNode = Math.round(totalHardwareWatts / effectiveServerCount)`, then `estimatedNodeWattage = estimatedHardwareWattsPerNode + 150`.
4. `support_manufacturing.js` & `aspect_registry.js`:
   - Add `isCtoServerItem` helper in `support_manufacturing.js` and return `hasCtoServer`.
   - In `aspect_registry.js` `normalizeSupportManufacturingResult`: Scope CLIC Rule 81322276 strictly to `if (result.hasCtoServer && result.hasManagementLicense === false)`.
5. `pcie_riser.js`:
   - Add `isRiserCableOrAccessory` helper to prevent cable kits (`P56073-B21`/`P56074-B21` or items containing 'cable' in description) from being tallied as physical riser cards in `tallyRiserCards`.
6. `storage_tri_mode.js`:
   - Decouple battery cables (`P01366-B21`/`P01367-B21`/`145mm cable`/`260mm cable`) from `hasOcpCable`.
   - Add `P48918-B21` to `hasOcpCable`.
   - In `isHardwareStorageController`: Exclude `'controller node'`, `'node pair'`, and `'alletra'`.
   - In `evalStorageTriMode`: Scope `needsSmartStorageBattery` to `Boolean(cabling.isServerChassis && t.hasStorageController && !t.hasSmartBattery)`.
7. `tests/chaos/test_m1_aspect_adversarial_stress.js`:
   - Update tests Adversarial 6B and 7d from bug reproduction assertions to remediation verification assertions per Explorer M1_It2_3 handoff Section 4.3.
8. Verification:
   - Run: `npm run test:domain:aspects` (All 18 suites must pass).
   - Run: `npm run lint:core` (0 warnings, 0 errors).
   - Run: `npm run lint:complexity` (All functions <= 135 CC).
   - Document all changes and verification outputs in `handoff.md`.
   - Update `progress.md` and notify caller via `send_message`.
