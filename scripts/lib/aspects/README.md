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

## 4. Critical Domain Invariants Enforced
- **Gen11 Heatsink Isolation (`INV-61`, `BENCH-08`)**: Strictly distinguishes Gen11 heatsinks (`P74792-B21`) from Gen12 heatsinks (`P48818-B21`), and disambiguates from Gen11 800W Flex Slot Platinum Power Supplies sharing the identical part number.
- **Tri-Mode Expander Port Channel Math (`INV-26`, `BENCH-06`)**: Directly addresses 8-port controller limits; configurations with $>8$ drives mandate SAS Expander (`P48835-B21`) or Tri-Mode Switch Card (`P55806-B21`).
- **GPU Auxiliary Power Envelope (`INV-27`, `BENCH-07`)**: Mandates GPU Aux Power Cable Kits (`P48816-B21`), Max Performance Fans (`P56950-B21`), and $\ge 1600$W PSUs for high-power accelerators (L40S, A100).
- **EU Ecodesign ErP Lot 9 Compliance (`INV-30`, `BENCH-09`)**: Dual-socket servers ordering 94% Platinum PSUs auto-inject CE Mark Removal FIO Enablement Kit (`P35876-B21`) to pass factory CLIC validation.
- **PCIe Riser 5th Slot Power Delivery (`INV-31`, `BENCH-10`)**: Populating $\ge 5$ physical PCIe expansion cards across risers requires dedicated Primary Cable Kit `P56073-B21` to power Slot 1.
- **Physical Core Multiplier Licensing (`INV-28`, `BENCH-15`)**: Calculates total socket cores (`cpuCount * coresPerCpu`) to guarantee core pack compliance for Windows Server and VMware vSphere.
