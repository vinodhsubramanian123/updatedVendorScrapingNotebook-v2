# HPE OCA Catalog Intelligence — Synchronized Knowledge & Rules Charter

**Target Product**: `DL380_Gen12_SFF`  
**Sync Timestamp**: 2026-08-21T12:15:57.872Z  
**Total Verified SKUs**: `861` (`261` Hardware + `600` Services)  
**Total Synced KnowledgeDeltas**: `12`  

This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.

---

## 🚀 Executive Delta & Recent Change Summary

| Category | Total SKUs | Added (Last Scrape) | Price Changed | Attribute Changed | Reinstated | Status |
|----------|------------|---------------------|---------------|-------------------|------------|--------|
| **Hardware Components** | 261 | 261 | 0 | 0 | 0 | **CERTIFIED** |
| **Support Services & SLAs** | 600 | 0 | 0 | 2 | 0 | **CERTIFIED** |
| **Total Portfolio** | **861** | **261** | **0** | **2** | **0** | **ACTIVE** |

### 🔍 Key Configuration & Physical Pre-Check Highlights:
- **Compute & Thermal**: Validates TDP heatsink class (>240W requires high-performance fan kits).
- **Memory Channels**: Enforces 1DPC / 2DPC symmetry and balanced population across memory controllers.
- **Storage Tri-Mode**: Backplane and controller pairing validation (e.g. MR416i-p / SR932i-p require dedicated Box 1/2 Cable Kit `P76453-B21`).
- **Support Services**: Complete lifecycle coverage across HPE Pointnext Complete Care and Tech Care Essential SLAs.

---

## 🌐 1. Universal Vendor Rules (Applies Across All HPE Product Lines)

*No universal vendor restrictions logged yet. Baseline CTO/BTO mode rules active.*

## 🏛️ 2. Family & Generation Rules (ProLiant / Alletra / Synergy)

*No family/generation-level rules logged yet. Symmetric memory & power supply mixing rules active.*

## 🎯 3. Chassis & Solution-Type Gotchas (DL380_Gen12_SFF)

1. **[DELTA-1786548092663] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: Portal validation flagged restriction on P76453-B21.
   - **Affected SKU**: `P76453-B21` | **Required Dependency**: `N/A` 

2. **[DELTA-1786705957681] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If P73282-B21 is present, P73282-B21 is mandatory.
   - **Affected SKU**: `P73282-B21` | **Required Dependency**: `P73282-B21` 

3. **[DELTA-1786705957757] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If P74573-B21 is present, P74573-B21 is mandatory.
   - **Affected SKU**: `P74573-B21` | **Required Dependency**: `P74573-B21` 

4. **[DELTA-1786705957802] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If P48820-B21 is present, P48820-B21 is mandatory.
   - **Affected SKU**: `P48820-B21` | **Required Dependency**: `P48820-B21` 

5. **[DELTA-1786705957846] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If P69728-B21 is present, P69728-B21 is mandatory.
   - **Affected SKU**: `P69728-B21` | **Required Dependency**: `P69728-B21` 

6. **[DELTA-1786705957894] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If P47777-B21 is present, P47777-B21 is mandatory.
   - **Affected SKU**: `P47777-B21` | **Required Dependency**: `P47777-B21` 

7. **[DELTA-1786705957933] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If P01366-B21 is present, P01366-B21 is mandatory.
   - **Affected SKU**: `P01366-B21` | **Required Dependency**: `P01366-B21` 

8. **[DELTA-1786705957977] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If P03178-B21 is present, P03178-B21 is mandatory.
   - **Affected SKU**: `P03178-B21` | **Required Dependency**: `P03178-B21` 

9. **[DELTA-1786706928358] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: Portal validation flagged restriction on P76450-B21.
   - **Affected SKU**: `P76449-B21` | **Required Dependency**: `P76450-B21` 

10. **[PREPROC-DELTA-1786781599909] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12_SFF CTO Server`):
   - **Rule**: Confirmed configuration variation reason 'WORKLOAD_NODE_PURPOSE' for config_1
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A` 

11. **[DELTA-1786880389958] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: Intel Xeon 6730P 250W CPU requires HPE ProLiant Compute DL380 Gen12 Performance Heat Sink Kit (P74792-B21) due to exceeding the 185W standard thermal envelope.
   - **Affected SKU**: `P74573-B21` | **Required Dependency**: `P74792-B21` 
   - 💡 **Human Engineer Rationale**: *"Agentic Guardrail Loop derived from RAG/DB fact-check"*

12. **[DELTA-1786880394092] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: Intel Xeon 6730P 250W CPU requires HPE ProLiant High Performance Fan Kit (P48820-B21) because it exceeds the 240W system limit for standard chassis fans.
   - **Affected SKU**: `P74573-B21` | **Required Dependency**: `P48820-B21` 
   - 💡 **Human Engineer Rationale**: *"Agentic Guardrail Loop derived from RAG/DB fact-check"*


## ⚠️ 4. Discontinued & Obsolete SKUs Registry

| SKU | Description | Status | Discontinued Date | Last Known Price |
|-----|-------------|--------|-------------------|------------------|
| `undefined` | HPE ProLiant Compute DL380 Gen12 16SFF x2 1P Direct Attach FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 |
| `undefined` | HPE ProLiant Compute DL380 Gen12 16SFF x2 1P Direct Attach Universal Media Bay FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 |
| `undefined` | HPE ProLiant Compute DL380 Gen12 16SFF x4 Direct Attach Balanced FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 |
| `undefined` | HPE ProLiant Compute DL380 Gen12 16SFF x4 Direct Attach Multiple Purpose Cage FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $0.00 |
| `undefined` | HPE ProLiant Compute DL380 Gen12 16SFF x4 Direct Attach Universal Media Bay FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 |
| `undefined` | HPE ProLiant Compute DL380 Gen12 24SFF x16/x16/x16 OCP Balanced FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 |
| `undefined` | HPE ProLiant Compute DL380 Gen12 24SFF x16/x16/x16 OCP Gen4 Retimer Card FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 |
| `undefined` | HPE ProLiant Compute DL380 Gen12 24SFF x2 Direct Attach x16/x16/x16 OCP FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 |
| `undefined` | HPE ProLiant Compute DL380 Gen12 8SFF x4 1P Direct Attach FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 |
| `undefined` | HPE ProLiant Compute DL380 Gen12 8SFF x4 Direct Attach Balanced FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 |
| `undefined` | HPE ProLiant Compute DL380 Gen12 8SFF x4 Direct Attach Multiple Purpose Cage FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $0.00 |
| `undefined` | HPE ProLiant Compute DL380 Gen12 8SFF x4 Direct Attach UMB Multiple Purpose Cage FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $0.00 |
| `undefined` | HPE ProLiant Compute DL380 Gen12 Tertiary Riser 24SFF x16/x16/x16 OCP Balanced FIO Bundle Kit                       Define connection for 8SFF x4 Cage only needed if cage is selected. | **REINSTATED** | 2026-08-12 | $1.00 |

## 🔄 5. Recent Attribute & Specification Modifications Log

| Timestamp | SKU | Attribute | Old Value | New Value |
|-----------|-----|-----------|-----------|-----------|
| N/A | `undefined` | undefined |  | **2026-08-12** |
| N/A | `undefined` | undefined | HPE ProLiant Server Option (P74568-B21) | **Intel Xeon 6520P 2.4GHz 24-core 210W Processor for HPE** |
| N/A | `undefined` | undefined | HPE ProLiant Server Option (P74792-B21) | **HPE ProLiant Compute DL380 Gen12 Performance Heat Sink Kit** |
| N/A | `undefined` | undefined | HPE ProLiant Server Option (P69727-F21) | **HPE 32GB (1x32GB) Dual Rank x8 DDR5-6400 CAS-52-52-52 EC8 Registered Smart FIO Memory Kit** |
| N/A | `undefined` | undefined | HPE ProLiant Server Option (P79552-B21) | **HPE ProLiant Compute 30C Maximum Recommended Ambient Temperature Configuration Tracking** |
| N/A | `undefined` | undefined | HPE ProLiant Server Option (P51181-B21) | **Broadcom BCM5719 Ethernet 1Gb 4-port BASE-T OCP3 Adapter for HPE** |
| N/A | `undefined` | undefined | HPE ProLiant Server Option (P72203-B21) | **HPE ProLiant Compute DL3XX/ML350 Gen12 CPU1 to Rear OCP SlotB x8 Cable Kit** |
| N/A | `undefined` | undefined | HPE ProLiant Server Option (P73325-B21) | **HPE ProLiant Compute Localization FIO Kit** |
| N/A | `undefined` | undefined | HPE ProLiant Server Option (P52341-B21) | **HPE ProLiant DL3XX Gen11 Easy Install Rail 3 Kit** |
| N/A | `undefined` | undefined | HPE ProLiant Server Option (P03178-B21) | **HPE 1000W Flex Slot Titanium Hot Plug Power Supply Kit** |
| N/A | `undefined` | undefined | HPE ProLiant Server Option (P48820-B21) | **HPE ProLiant DL380/DL560 Gen11 2U High Performance Fan Kit** |
| N/A | `undefined` | undefined | HPE ProLiant Server Option (P78145-B21) | **HPE C13 - C14 250V 10Amp 2m FIO Power Cord** |
| N/A | `undefined` | undefined | HPE ProLiant Server Option (R7A12AAE) | **HPE Compute Ops Management Standard 5-year Upfront ProLiant SaaS** |
| N/A | `undefined` | undefined | HPE ProLiant Server Option (S1A05A) | **HPE Compute Cloud Management Server FIO Enablement** |
| N/A | `undefined` | undefined | HPE ProLiant Server Option (BD505A) | **HPE iLO Advanced 1-server License with 3yr Support on iLO Licensed Features** |

## 🧩 6. Cross-Chassis Variant & Platform Benchmark Matrix

| Chassis Identifier | Product Family | Generation | Form Factor | CTO Base SKU |
|--------------------|----------------|------------|-------------|--------------|
| **DL380_Gen12_SFF** | ProLiant | Gen12 | 8SFF | `P73282-B21` |
| **DL380_Gen11** | ProLiant | Gen11 | 8SFF | `P52534-B21` |
| **MSL3040_Tape** | StoreEver | Gen1 | Rack | `Q6Q67A` |
| **GX5000_General_RACK** | Cray | Gen1 | Rack | `P57100-B21` |
| **SY100Gb_F32_Module** | Synergy | Gen1 | Blade | `864273-B21` |
| **Alletra_Storage_System** | Alletra | Gen1 | Array | `R0Q21A` |
| **P73282-B21** | ProLiant | Gen12 | 8SFF | `P73282-B21` |
| **P73283-B21** | ProLiant | Gen12 | 24SFF | `P73283-B21` |
| **P73284-B21** | ProLiant | Gen12 | 12LFF | `P73284-B21` |
| **P73285-B21** | ProLiant | Gen12 | 8LFF | `P73285-B21` |
| **P73286-B21** | ProLiant | Gen12 | 16EDSFF | `P73286-B21` |
| **P73287-B21** | ProLiant | Gen12 | High Power | `P73287-B21` |
| **P52534-B21** | ProLiant | Gen11 | 8SFF | `P52534-B21` |
| **P52535-B21** | ProLiant | Gen11 | 12LFF | `P52535-B21` |
| **P52536-B21** | ProLiant | Gen11 | 24EDSFF | `P52536-B21` |
| **P52537-B21** | ProLiant | Gen11 | 8SFF NVMe | `P52537-B21` |
| **R0Q35A** | Alletra | Storage | Storage Chassis | `R0Q35A` |
| **R0Q36A** | Alletra | Storage | Storage Chassis | `R0Q36A` |
| **R0Q37A** | Alletra | Storage | Storage Controller | `R0Q37A` |
| **P48820-B21** | Cray | General | Blade | `P48820-B21` |
| **P48821-B21** | Cray | General | 4U Rack | `P48821-B21` |
| **Q2R41A** | StoreEver | Tape | Base Module | `Q2R41A` |
| **Q2R42A** | StoreEver | Tape | Expansion Module | `Q2R42A` |
| **P25902-B21** | Synergy | General | Compute Module | `P25902-B21` |
| **797740-B21** | Synergy | General | Frame Chassis | `797740-B21` |
| **P06584-B21** | Synergy | General | Interconnect Module | `P06584-B21` |

