# Physical Hardware Aspect Checkers (`scripts/lib/aspects/`)

## 1. Purpose & Scope
Implements deterministic physical math evaluation across the 7 server hardware dimensions. All checkers strictly adhere to the **Zero-Hardcoding Principle**: rules, limits, and SKU mappings are resolved dynamically from `chassis_map.json` and `catalog.json`.

## 2. Key Checkers & Rules
| File | Main Function | Evaluation Focus |
|---|---|---|
| `compute_thermal.js` | `evalComputeThermal(items, catalog, profile)` | CPU count (1 vs 2 socket), TDP wattage limits, high-performance heatsink requirements, high-performance fan kit triggers. |
| `memory_channel.js` | `evalMemoryChannel(items, catalog, profile)` | 16-channel DDR5 balance, balanced memory population rules, DIMM speed throttling, RDIMM vs 3DS RDIMM mixing. |
| `storage_tri_mode.js` | `evalStorageTriMode(items, catalog, profile)` | Drive cage limits (8SFF vs 24SFF), controller slot allocation, SAS/SATA/NVMe Tri-mode cable kits, 96W Smart Storage Battery backup. |
| `pcie_riser.js` | `evalPcieRiser(items, catalog, profile)` | Primary vs Secondary riser cage slot limits, CPU2 requirement for Riser 2/3, slot electrical lane allocation (x8/x16). |
| `power_environment.js` | `evalPowerEnvironment(items, catalog, profile)` | Dual redundant PSU parity (matching wattage/voltage), Telco -48VDC Lug kit requirements, Titanium/Platinum efficiency compliance. |
| `networking_ocp.js` | `evalNetworkingOcp(items, catalog, profile)` | OCP 3.0 slot limits, dual OCP enablement, secondary riser lane allocation. |
| `support_manufacturing.js` | `evalSupportManufacturing(items, catalog, profile)` | Factory Integrated (FIO) vs Field-installable BTO rules, standard HPE Pointnext support warranty packages. |

## 3. Standard Return Contract
Every aspect checker returns an object conforming to:
```javascript
{
  aspect: "compute_thermal",
  status: "PASS" | "WARN" | "FAIL",
  score: 1.0, // 0.0 to 1.0
  violations: [ { code: "THERMAL_MISSING_FAN", message: "...", severity: "ERROR" } ],
  remediations: [ { sku: "P56950-B21", description: "HPE DL380 Gen12 Max Performance Fan Kit", qty: 1 } ]
}
```
