# HPE OCA Catalog Intelligence — Synchronized Knowledge & Rules Charter

**Target Product**: `DL380_Gen12_SFF`  
**Sync Timestamp**: 2026-08-29T21:16:54.556Z  
**Total Verified SKUs**: `0` (`0` Hardware + `0` Services)  
**Total Synced KnowledgeDeltas**: `28`  

This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.

---

## 🚀 Executive Delta & Recent Change Summary

| Category | Total SKUs | Added (Last Scrape) | Price Changed | Attribute Changed | Reinstated | Status |
|----------|------------|---------------------|---------------|-------------------|------------|--------|
| **Hardware Components** | 0 | 0 | 0 | 0 | 0 | **CERTIFIED** |
| **Support Services & SLAs** | 0 | 0 | 0 | 0 | 0 | **CERTIFIED** |
| **Total Portfolio** | **0** | **0** | **0** | **0** | **0** | **ACTIVE** |

### 🔍 Key Configuration & Physical Pre-Check Highlights:
- **Compute & Thermal**: Validates TDP heatsink class (>240W requires high-performance fan kits).
- **Memory Channels**: Enforces 1DPC / 2DPC symmetry and balanced population across memory controllers.
- **Storage Tri-Mode**: Backplane and controller pairing validation (e.g. MR416i-p / SR932i-p require dedicated Box 1/2 Cable Kit `P76453-B21`).
- **Support Services**: Complete lifecycle coverage across HPE Pointnext Complete Care and Tech Care Essential SLAs.

---

## 🌐 1. Universal Vendor Rules (Applies Across All HPE Product Lines)

1. **[DELTA-1787856163549]**: If PORTAL is present, P64707-B21 is mandatory. *(Type: TEMPORARY_SUPPLY_CONSTRAINT)*

## 🏛️ 2. Family & Generation Rules (ProLiant / Alletra / Synergy)

1. **[DELTA-1787856163365] DL380_Gen11**: If PORTAL is present, P52534-B21 is mandatory. *(Affected SKU: PORTAL)*
2. **[DELTA-1787856163672] DL380_Gen11**: Portal validation flagged restriction on PORTAL. *(Affected SKU: PORTAL)*
3. **[DELTA-1787856163759] DL380_Gen11**: If PORTAL is present, P58335-B21 is mandatory. *(Affected SKU: PORTAL)*
4. **[DELTA_CLIC_81354632_DL380_GEN11] DL380_Gen11**: If P48832-B21 (Tri-Mode Splitter Cable) is selected, P48814-B21 (8SFF U.3 Premium Cage) is mandatory. *(Affected SKU: P48832-B21)*
5. **[DELTA_CLIC_81354652_DL380_GEN11] DL380_Gen11**: If P02377-B21 / P01366-B21 (Capacitor/Battery) is selected, P48918-B21 (Storage Controller Enablement Cable Kit) is mandatory. *(Affected SKU: P02377-B21)*
6. **[DELTA_CLIC_81355854_DL380_GEN11] DL380_Gen11**: P51911-B21 and P48830-B21 cannot be selected together. Retain P48830-B21. *(Affected SKU: P51911-B21)*
7. **[DELTA_CLIC_81016755_DL380_GEN11] DL380_Gen11**: When 5+ PCIe cards are installed, P56073-B21 Primary Cable Kit is mandatory for Primary Riser Slot 1. *(Affected SKU: P48803-B21)*
8. **[DELTA_CLIC_EU_LOT9_P35876_DL380_GEN11] DL380_Gen11**: When ordering Platinum PSUs (P38997-B21) on high-draw dual-socket configurations, P35876-B21 (CE Mark Removal Kit) is required for non-EU deployment, or upgrade to Titanium PSUs (P44712-B21). *(Affected SKU: P38997-B21)*
9. **[DELTA_RAG_DEP_P02377-B21_P48918-B21_1787913302880] DL380 Gen11**: undefined *(Affected SKU: P02377-B21)*
10. **[DELTA-1787561844831] DL380_Gen12_SFF**: Portal validation flagged restriction on P76453-B21. *(Affected SKU: P76453-B21)*
11. **[DELTA-1787315096377] DL380_Gen12_SFF**: If P69728-F21 is present, DDR5-6400 is mandatory. *(Affected SKU: P69728-F21)*
12. **[DELTA-1787939245188] DL380_Gen12**: Portal validation flagged restriction on P76450-B21. *(Affected SKU: P76449-B21)*
13. **[DELTA-1787939298644] DL380_Gen12**: Portal validation flagged restriction on P76453-B21. *(Affected SKU: P76453-B21)*

## 🎯 3. Chassis & Solution-Type Gotchas (DL380_Gen12_SFF)

1. **[DELTA-1786705957681] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If P73282-B21 is present, P73282-B21 is mandatory.
   - **Affected SKU**: `P73282-B21` | **Required Dependency**: `P73282-B21` 

2. **[DELTA-1786705957757] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If P74573-B21 is present, P74573-B21 is mandatory.
   - **Affected SKU**: `P74573-B21` | **Required Dependency**: `P74573-B21` 

3. **[DELTA-1786705957802] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If P48820-B21 is present, P48820-B21 is mandatory.
   - **Affected SKU**: `P48820-B21` | **Required Dependency**: `P48820-B21` 

4. **[DELTA-1786705957846] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If P69728-B21 is present, P69728-B21 is mandatory.
   - **Affected SKU**: `P69728-B21` | **Required Dependency**: `P69728-B21` 

5. **[DELTA-1786705957894] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If P47777-B21 is present, P47777-B21 is mandatory.
   - **Affected SKU**: `P47777-B21` | **Required Dependency**: `P47777-B21` 

6. **[DELTA-1786705957933] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If P01366-B21 is present, P01366-B21 is mandatory.
   - **Affected SKU**: `P01366-B21` | **Required Dependency**: `P01366-B21` 

7. **[DELTA-1786705957977] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If P03178-B21 is present, P03178-B21 is mandatory.
   - **Affected SKU**: `P03178-B21` | **Required Dependency**: `P03178-B21` 

8. **[DELTA-1786706928358] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: Portal validation flagged restriction on P76450-B21.
   - **Affected SKU**: `P76449-B21` | **Required Dependency**: `P76450-B21` 

9. **[PREPROC-DELTA-1786781599909] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen12_SFF CTO Server`):
   - **Rule**: Confirmed configuration variation reason 'WORKLOAD_NODE_PURPOSE' for config_1
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A` 

10. **[DELTA-1786880389958] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: Intel Xeon 6730P 250W CPU requires HPE ProLiant Compute DL380 Gen12 Performance Heat Sink Kit (P74792-B21) due to exceeding the 185W standard thermal envelope.
   - **Affected SKU**: `P74573-B21` | **Required Dependency**: `P74792-B21` 
   - 💡 **Human Engineer Rationale**: *"Agentic Guardrail Loop derived from RAG/DB fact-check"*

11. **[DELTA-1786880394092] DL380_Gen12_SFF** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: Intel Xeon 6730P 250W CPU requires HPE ProLiant High Performance Fan Kit (P48820-B21) because it exceeds the 240W system limit for standard chassis fans.
   - **Affected SKU**: `P74573-B21` | **Required Dependency**: `P48820-B21` 
   - 💡 **Human Engineer Rationale**: *"Agentic Guardrail Loop derived from RAG/DB fact-check"*


## ⚠️ 4. Discontinued & Obsolete SKUs Registry

*No discontinued or reinstated SKUs detected for DL380_Gen12_SFF. All cataloged SKUs are active.*

## 🔄 5. Recent Attribute & Specification Modifications Log

*No attribute or specification changes recorded across catalog snapshots.*

## 🧩 6. Cross-Chassis Variant & Platform Benchmark Matrix

| Chassis Identifier | Product Family | Generation | Form Factor | CTO Base SKU |
|--------------------|----------------|------------|-------------|--------------|
| **DL380_Gen12** | ProLiant | Gen12 | 8SFF | `P73282-B21` |
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
| **P52532-B21** | ProLiant | Gen11 | 8LFF | `P52532-B21` |
| **P52533-B21** | ProLiant | Gen11 | 12LFF | `P52533-B21` |
| **P52534-B21** | ProLiant | Gen11 | 8SFF | `P52534-B21` |
| **P52535-B21** | ProLiant | Gen11 | 24SFF | `P52535-B21` |
| **P52536-B21** | ProLiant | Gen11 | 24EDSFF | `P52536-B21` |
| **P52537-B21** | ProLiant | Gen11 | 8SFF NVMe | `P52537-B21` |
| **R0Q35A** | Alletra | Storage | Storage Chassis | `R0Q35A` |
| **R0Q36A** | Alletra | Storage | Storage Chassis | `R0Q36A` |
| **R0Q37A** | Alletra | Storage | Storage Controller | `R0Q37A` |
| **Q2R41A** | StoreEver | Tape | Base Module | `Q2R41A` |
| **Q2R42A** | StoreEver | Tape | Expansion Module | `Q2R42A` |
| **P25902-B21** | Synergy | General | Compute Module | `P25902-B21` |
| **797740-B21** | Synergy | General | Frame Chassis | `797740-B21` |
| **P06584-B21** | Synergy | General | Interconnect Module | `P06584-B21` |
| **P57100-B21** | Cray | General | Rack | `P57100-B21` |
| **P57101-B21** | Cray | General | Blade | `P57101-B21` |
| **controller_cache_map** | ProLiant | Gen12 | SFF | `controller_cache_map` |
| **chassis_included_components** | ProLiant | Gen12 | SFF | `chassis_included_components` |
| **form_factor_duals** | ProLiant | Gen12 | SFF | `form_factor_duals` |

