# Test Fixtures & Samples (`tests/fixtures/`)

## 1. Purpose & Scope
Provides static test data, customer BOM samples, 15 enterprise benchmark matrices, and raw DOM fixtures used across automated tests.

## 2. Benchmark Scenarios (`BENCH-01` to `BENCH-15`)

| Benchmark Fixture | Scenario Focus | Tested Invariants & Rules |
|---|---|---|
| `BENCH-01-HIGH-TDP-THERMAL.csv` | High-TDP dual-processor thermal envelope | Performance heatsinks & high-perf fans (`P56950-B21`) |
| `BENCH-02-TELCO-DC-LUG-KIT.csv` | Telco -48VDC power delivery | Mandatory Telco Lug Enablement Kit injection |
| `BENCH-03-STORAGE-CACHE-BATTERY.csv` | Smart Array write-back cache protection | 96W Smart Storage Megacell Battery (`P01366-B21`) |
| `BENCH-04-MULTI-CHASSIS-CTO-DIVISION.csv` | Multi-node cluster partitioning | CTO chassis option grouping & division (`INV-25`) |
| `BENCH-05-PSU-REDUNDANCY-SINGLE.csv` | Dual power supply redundancy enforcement | Balanced voltage/wattage redundant PSU matching |
| `BENCH-06-TRI-MODE-EXPANDER.csv` | >8 drive direct-attach controller port limit | SAS/NVMe Tri-Mode Expander Card (`P48835-B21`, `INV-26`) |
| `BENCH-07-GPU-AUX-POWER-AND-FANS.csv` | High-draw PCIe GPU accelerators (L40S) | GPU Aux Power Cables (`P48816-B21`) & Max Perf Fans (`INV-27`) |
| `BENCH-08-HEATSINK-GEN11-ISOLATION.csv` | Gen11 heatsink isolation vs PSU SKU collision | Isolation of Gen11 `P74792-B21` vs Gen12 `P48818-B21` (`INV-61`) |
| `BENCH-09-ERP-LOT9-CE-MARK.csv` | EU Ecodesign Lot 9 94% Platinum PSU regulatory | CE Mark Removal FIO Enablement Kit (`P35876-B21`, `INV-30`) |
| `BENCH-10-RISER-SLOT1-POWER-CABLE.csv` | $\ge 5$ PCIe expansion cards across risers | Primary Riser 5th Slot Power Cable (`P56073-B21`, `INV-31`) |
| `BENCH-11-FORM-FACTOR-BUS-PIVOT.csv` | OCP 3.0 slot saturation and lane limits | Form-factor bus pivot (OCP to PCIe NIC migration, `INV-39`) |
| `BENCH-12-UNSOLICITED-SERVICES-STRIP.csv` | Unsolicited services & software bundle injection | Zero unsolicited SaaS/onsite startup services (`INV-32`) |
| `BENCH-13-MULTI-CLUSTER-TENDER-SPLIT.csv` | Enterprise 60-node multi-cluster tender | Datacenter RU/rack sizing, facility power, rail kits (`INV-29`) |
| `BENCH-14-FIO-MEMORY-IN-CTO-BASE.csv` | BTO memory in CTO container CLIC validation | Enforces `#0D1` / `-F21` FIO option tagging (`INV-25`, Rule 81354490) |
| `BENCH-15-OS-CORE-LICENSING.csv` | Microsoft Windows Server 64-core physical licensing | Per-core physical multiplier and base pack sizing (`INV-28`) |

## 3. Directory Layout
```
tests/fixtures/
├── BENCH-01-HIGH-TDP-THERMAL.csv
├── ...
├── BENCH-15-OS-CORE-LICENSING.csv
├── samples/       ← Real-world customer Excel quotes and opportunity BOMs
│   ├── DL380_Gen12_22-server_Vendor_BOM.xlsx
│   ├── DOC-20260821-WA0000_Customer_BOQ.xlsx
│   └── HP Opportunity- DL380_5 Servers.xlsx
└── raw/           ← Sample raw OCA DOM JSON responses and rules
    ├── sample_Catalog_Rules.json
    └── sample_oca_raw_data.json
```

## 4. Usage Guidelines
- Test files in this directory must remain immutable and are used strictly as read-only fixtures.
- New test cases should add dedicated sample files here rather than creating ad-hoc data inside test code.
