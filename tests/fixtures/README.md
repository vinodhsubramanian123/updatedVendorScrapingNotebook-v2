# Test Fixtures & Samples (`tests/fixtures/`)

## 1. Purpose & Scope
Provides static test data, customer BOM samples, benchmark matrices, and raw DOM fixtures used across automated tests.

## 2. Directory Layout
```
tests/fixtures/
├── benchmarks/    ← Standard benchmark CSVs (BENCH-01 through BENCH-05)
│   ├── BENCH-01-HIGH-TDP-THERMAL.csv
│   ├── BENCH-02-TELCO-DC-LUG-KIT.csv
│   ├── BENCH-03-STORAGE-CACHE-BATTERY.csv
│   ├── BENCH-04-MULTI-CHASSIS-CTO-DIVISION.csv
│   └── BENCH-05-PSU-REDUNDANCY-SINGLE.csv
├── samples/       ← Real-world customer Excel quotes and opportunity BOMs
│   ├── DL380_Gen12_22-server_Vendor_BOM.xlsx
│   ├── DOC-20260821-WA0000_Customer_BOQ.xlsx
│   └── HP Opportunity- DL380_5 Servers.xlsx
└── raw/           ← Sample raw OCA DOM JSON responses and rules
    ├── sample_Catalog_Rules.json
    └── sample_oca_raw_data.json
```

## 3. Usage Guidelines
- Test files in this directory must remain immutable and are used strictly as read-only fixtures.
- New test cases should add dedicated sample files here rather than creating ad-hoc data inside test code.
