# HPE DL380a_Gen12 — Synchronized Catalog Knowledge

**Target Product**: `DL380a_Gen12`

**Scope Identity**: `HPE/SERVER/ProLiant/Gen12/DL380a_Gen12`

**Sync Timestamp**: 2026-10-03T14:44:09.380Z

**Total Verified SKUs**: `675` (`455` Hardware + `220` Services)

**Total Synced KnowledgeDeltas**: `17`

This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.

---

## 🚀 Executive Delta & Recent Change Summary

| Category | Total SKUs | Added (Last Scrape) | Price Changed | Attribute Changed | Reinstated | Status |
|----------|------------|---------------------|---------------|-------------------|------------|--------|
| **Hardware Components** | 455 | 6 | 0 | 224 | 0 | **CERTIFIED** |
| **Support Services & SLAs** | 220 | 8 | 0 | 1 | 0 | **CERTIFIED** |
| **Total Portfolio** | **675** | **14** | **0** | **225** | **0** | **ACTIVE** |

## 🌐 1. Universal Vendor Rules (HPE)

1. **[DELTA_UNIVERSAL_MULTI_ICON_ERROR_ATTRIBUTION]**: When Rule 81039677 occurs on multi-icon tenders, trace errors to individual child icon containers instead of modifying the root BOM item. *(Type: ERROR_DIAGNOSTIC_ATTRIBUTION)*
2. **[DELTA_UNIVERSAL_SUPPORT_TIER_ISOLATION]**: Configure support services independently per icon container. Never broadcast support attributes across diverse product families. *(Type: ICON_SUPPORT_ISOLATION)*
3. **[DELTA_UNIVERSAL_OCA_SUPPORT_CACHE_FLUSH]**: Historical service-selector workaround only: in an authenticated working OCA configuration with contradictory service selections, reselect services for the owning node and revalidate. It is not an expired-session recovery. If OCA displays encountered-a-problem, refresh/login from Partner Portal and launch One Config Advanced through Quick Links; never reload the failed OCA tab or remove services as a session fix. *(Type: SESSION_RECOVERY_PROTOCOL)*
4. **[OWNER_STANDARD_3Y_BASIC]**: Preserve explicit customer support term and tier in the closest rank; use 3-year Tech Care Basic only when unspecified or explicitly authorized. For this SN3600B BOQ the owner authorized 5-year Essential to 3-year Basic. Compare qualified fixed and flexible service options; disclose retention and preserve parent/suffix pairs. This commercial preference is not vendor qualification. *(Type: SUPPORT_POLICY)*
5. **[OWNER_ICON_SERVICE_ISOLATION]**: Select Services from Components for the owning icon, edit its dropdowns, and leave both apply-to-all icons and apply-to-all nodes off. Different icons retain their own SLA. *(Type: ICON_SUPPORT_ISOLATION)*
6. **[OWNER_OCA_EXPIRED_SESSION]**: When OCA says it encountered a problem, restart from Partner Portal refresh/login and open One Config Advanced through Quick Links. Do not reload the failed OCA session. Keep a Partner Portal tab before closing stale OCA so CDP does not disappear. This supersedes cache-flush advice for encountered-a-problem errors. *(Type: SESSION_RECOVERY_PROTOCOL)*
7. **[OWNER_CLOSEST_REQUIREMENT_RANK]**: Closest rank preserves customer requirements and makes only necessary compatibility/buildability changes. Budget alternatives disclose every deviation; do not silently reduce term, tier, capacity or resilience. Keep explicit owner overrides auditable against the original customer BOQ. *(Type: CUSTOMER_INTENT_POLICY)*
8. **[OWNER_COMPONENT_DOMAIN_ROUTING]**: Route by component role and exact product, never vendor or family alone. Synergy compute, fabric and frame use separate scopes. Resolve ownership before quantities. Validate each component and enclosure/bay, adapter/fabric, optical endpoints, shared power and per-icon SLA relationships; missing profiles remain NOT_EVALUATED and cannot inherit server defaults. Scraping completeness is not buildability certification. *(Type: COMPONENT_DOMAIN_ROUTING)*
9. **[GUARDRAIL_TRANSPORT_RECOVERY]**: Gemini guardrail API sends must retain systemInstruction and function declarations when overriding SDK send config. Enforce scoped local simulation and NotebookLM checks. Retry bounded transient provider errors without exhausting keys, distinguish per-minute from explicit daily quotas, and use configured approved model fallback with preserved tool results and no replay side effects. Empty or unfinished responses are unavailable, not verification. Dashboard status is independent of NotebookLM and vendor acceptance. *(Type: GUARDRAIL_RECOVERY_POLICY)*

## 🏛️ 2. Family & Generation Rules (ProLiant Gen12)

*No verified family/generation rules are registered for this product.*

## 🎯 3. Chassis & Solution-Type Gotchas (DL380a_Gen12)

1. **[DELTA_DL380A_GEN12_DRIVE_CAGE_EXCLUSIVITY] DL380a_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380a Gen12 GPU Server`):
   - **Rule**: DL380a prohibits mixing 4SFF cage P74710-B21 and 4EDSFF cage P74712-B21.
   - **Affected SKU**: `P74710-B21` | **Required Dependency**: `N/A`

2. **[DELTA_DL380A_GEN12_DUAL_CPU_HOMOGENEOUS] DL380a_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380a Gen12 GPU Server`):
   - **Rule**: DL380a Gen12 requires two identical processor models; single-processor and mixed-processor configurations are unsupported.
   - **Affected SKU**: `P76706-B21` | **Required Dependency**: `N/A`

3. **[DELTA_DL380A_GEN12_GPU_PSU_COUNT_MATRIX] DL380a_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380a Gen12 GPU Server`):
   - **Rule**: Use exactly five power supplies for 2DW/4DW GPU configurations and eight for 8DW/10DW; H100/H200 NVL supports 2400W P67252-B21 or 3200W P67248-B21 Titanium supplies, without mixing wattages.
   - **Affected SKU**: `P76706-B21` | **Required Dependency**: `N/A`

4. **[DELTA_DL380A_GEN12_LIVE_OCA_PRICING_ALIGNMENT_5155756524-01] DL380a_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380a Gen12 GPU Server`):
   - **Rule**: Pointnext support on 8-GPU H200 DL380a scales to accelerator tier ($11,306), install scales to 4U GPU tier ($507), NVLink bridge list is $2,170, and GPU cable list is $114.
   - **Affected SKU**: `HU4B2A30C4W` | **Required Dependency**: `N/A`

5. **[DELTA-1789752537004-v9j6p] DL380a_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: Observed price drift on P74700-B21 (memory)
   - **Affected SKU**: `P74700-B21` | **Required Dependency**: `N/A`
   - 💡 **Human Engineer Rationale**: *"Manual price drift reconciliation from phase 15 audit"*

6. **[DELTA-1789752537592-otj9t] DL380a_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: Observed price drift on S4A91C (drive)
   - **Affected SKU**: `S4A91C` | **Required Dependency**: `N/A`
   - 💡 **Human Engineer Rationale**: *"Manual price drift reconciliation from phase 15 audit"*

7. **[DELTA-1789752537783-790yf] DL380a_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: Observed price drift on HA113A1 (support)
   - **Affected SKU**: `HA113A1` | **Required Dependency**: `N/A`
   - 💡 **Human Engineer Rationale**: *"Manual price drift reconciliation from phase 15 audit"*

8. **[DELTA-1789752537975-31r35] DL380a_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: Observed price drift on HU4B2A30C4W (service)
   - **Affected SKU**: `HU4B2A30C4W` | **Required Dependency**: `N/A`
   - 💡 **Human Engineer Rationale**: *"Manual price drift reconciliation from phase 15 audit"*


## 🔒 3b. Physical & Architectural Gating Rules (DOM Unavailable Tables)

### Memory Technology & Density Mixing Constraints

1. **[Memory]**: Mixing of memory is not allowed.
   - **Gated Rule Type**: `MEMORY_MIXING`
   - **Affected SKUs (4)**: `P69727-F21`, `P69729-F21`, `P69730-F21`, `P73447-F21`

### Component Mutual Exclusion Rules

1. **[Storage Devices]**: Mixing of Drive Cage not allowed.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `P74712-B21`

2. **[Storage Devices]**: This Cable (P76700-B21) can be selected only if MR416i-p controller is selected.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `P76700-B21`

3. **[Storage Devices]**: This Cable (P76702-B21) can be selected only if MR416i-o controller is selected.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `P76702-B21`

4. **[Networking]**: If 4NVMe Direct Attach Cable (P74702-B21) is selected, then HPE DL380a Gen12 OCPB Cbl Kit (P74696-B21) cannot be selected.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `P74696-B21`

5. **[Power and Cooling]**: Mixing of Power Supply is not allowed.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (2)**: `P67248-B21`, `P78196-B21`

6. **[Power and Cooling]**: Supports C19/ C19-C20 Power Cords only.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (2)**: `J6X00A`, `S4X23A`

7. **[Accessories]**: Cannot be selected with HPE DL380a Gen12 8DW/16SW CTO Svr (P76706-B21).
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `P74726-B21`

8. **[OS Boot Device]**: Private Product is not valid for current customer account
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `P75693-B21

    PVT`

9. **[Manufacturing Services]**: Power cord cannot be selected if HPE Remove Standard Power Cords (469774-409) is in the configuration.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `469774-409`

10. **[Virtualization]**: Private Product is not valid for current customer account
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (3)**: `S4F94AAE

    PVT`, `S4G00AAE

    PVT`, `S4R76AAE

    PVT`

### CTO vs BTO Factory Integration Rules

1. **[Power and Cooling]**: BTO products are not allowed in CTO Base Model.
   - **Gated Rule Type**: `BTO_DISALLOWED`
   - **Affected SKUs (1)**: `P80098-B21`

## ⚠️ 4. Discontinued & Obsolete SKUs Registry

| SKU | Description | Status | Discontinued Date | Last Known Price | Tracking | Retention |
|-----|-------------|--------|-------------------|------------------|----------|-----------|
| `P69726-B21` | HPE 16GB (1x16GB) Single Rank x8 DDR5-6400 CAS-52-52-52 EC8 Registered Smart Memory Kit | **DISCONTINUED** | 2026-09-30 | $7439.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P69726-F21` | HPE 16GB (1x16GB) Single Rank x8 DDR5-6400 CAS-52-52-52 EC8 Registered Smart FIO Memory Kit | **DISCONTINUED** | 2026-09-30 | $7439.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P69727-B21` | HPE 32GB (1x32GB) Dual Rank x8 DDR5-6400 CAS-52-52-52 EC8 Registered Smart Memory Kit | **DISCONTINUED** | 2026-09-30 | $13909.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P69728-B21` | HPE 64GB (1x64GB) Dual Rank x4 DDR5-6400 CAS-52-52-52 EC8 Registered Smart Memory Kit | **DISCONTINUED** | 2026-09-30 | $28532.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P69729-B21` | HPE 96GB (1x96GB) Dual Rank x4 DDR5-6400 CAS-52-52-52 EC8 Registered Smart Memory Kit | **DISCONTINUED** | 2026-09-30 | $47056.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P69730-B21` | HPE 128GB (1x128GB) Dual Rank x4 DDR5-6400 CAS-52-52-52 EC8 Registered Smart Memory Kit | **DISCONTINUED** | 2026-09-30 | $60190.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P73447-B21` | HPE 256GB (1x256GB) Quad Rank x4 DDR5-6400 CAS-60-52-52 EC8 Registered 3DS Smart Memory Kit | **DISCONTINUED** | 2026-09-30 | $133186.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `389692-B21` | HPE Customer Defined RAID Setting Service | **DISCONTINUED** | 2026-09-30 | $1.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `AC120A` | HPE Pallet Size Customization Service | **DISCONTINUED** | 2026-09-09 | $7.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `AC129A` | HPE Consolidation Logistic Service | **DISCONTINUED** | 2026-09-09 | $26.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P1F69A` | HPE Delivery Site Above Ground Floor Service | **DISCONTINUED** | 2026-09-09 | $289.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P1F70A` | HPE Forklift at Delivery Service | **DISCONTINUED** | 2026-09-09 | $1399.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P1F71A` | HPE Special Delivery Truck Size Service | **DISCONTINUED** | 2026-09-09 | $292.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P1F72A` | HPE Two People at Delivery SVC | **DISCONTINUED** | 2026-09-09 | $466.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P1F73A` | HPE Campus Delivery Service | **DISCONTINUED** | 2026-09-09 | $104.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P1F74A` | HPE Unloading Logistic Service | **DISCONTINUED** | 2026-09-09 | $350.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P1F75A` | HPE Fixed Delivery Appointment Service | **DISCONTINUED** | 2026-09-09 | $466.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P1F76A` | HPE Pre-Delivery Site Survey SVC | **DISCONTINUED** | 2026-09-09 | $758.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `AC123A` | HPE Special Request/ Equipment Logistic Service | **DISCONTINUED** | 2026-09-09 | $816.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `BQ335A` | HPE Expedite Shipment Small Logistic Service | **DISCONTINUED** | 2026-09-09 | $44.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `BQ337A` | HPE Expedite Shipment Large Logistic Service | **DISCONTINUED** | 2026-09-09 | $100.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `P76706-B21` | HPE ProLiant Compute DL380a Gen12 8 Double Wide/16 Single Wide Configure-to-order Server | **REINSTATED** | 2026-09-09 | $21407.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `S2L70C` | NVIDIA L40S 48GB PCIe Accelerator | **DISCONTINUED** | 2026-09-30 | $32212.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `S6W30C` | NVIDIA RTX PRO 4500 Blackwell Server Edition 32GB PCIe Accelerator for HPE | **DISCONTINUED** | 2026-09-30 | $18882.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `S0K89C` | NVIDIA L4 24GB PCIe Accelerator for HPE | **DISCONTINUED** | 2026-09-30 | $10589.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `S2D86C` | NVIDIA H100 NVL 94GB PCIe Accelerator for HPE | **DISCONTINUED** | 2026-09-30 | $112579.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `S5T74C` | NVIDIA RTX A1000 8GB PCIe Accelerator for HPE | **DISCONTINUED** | 2026-09-30 | $1687.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `S3U30C` | NVIDIA H200 NVL 141GB PCIe Accelerator for HPE | **DISCONTINUED** | 2026-09-30 | $112579.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `S6A73C` | NVIDIA RTX PRO 6000 Blackwell Server Edition 96GB PCIe Accelerator for HPE | **DISCONTINUED** | 2026-09-30 | $57002.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `S6W21C` | NVIDIA RTX PRO 6000D 84GB PCIe Accelerator for HPE | **DISCONTINUED** | 2026-09-30 | $37899.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |

## 🔄 5. Recent Attribute & Specification Modifications Log

| Timestamp | SKU | Attribute | Old Value | New Value |
|-----------|-----|-----------|-----------|-----------|
| 2026-09-30 | `S4R34A` | HPE Recommended |  | **No** |
| 2026-09-30 | `S4R35A` | HPE Recommended |  | **No** |
| 2026-09-30 | `S4R36A` | HPE Recommended |  | **No** |
| 2026-09-30 | `S4R37A` | HPE Recommended |  | **No** |
| 2026-09-30 | `S4R38A` | HPE Recommended |  | **No** |
| 2026-09-30 | `S4R39A` | HPE Recommended |  | **No** |
| 2026-09-30 | `S4R40A` | HPE Recommended |  | **No** |
| 2026-09-30 | `S4R41A` | HPE Recommended |  | **No** |
| 2026-09-30 | `S4R42A` | HPE Recommended |  | **No** |
| 2026-09-30 | `S4R43A` | HPE Recommended |  | **No** |
| 2026-09-30 | `S4R44A` | HPE Recommended |  | **No** |
| 2026-09-30 | `S4R45A` | HPE Recommended |  | **No** |
| 2026-09-30 | `S4R46A` | HPE Recommended |  | **No** |
| 2026-09-30 | `S4R47A` | HPE Recommended |  | **No** |
| 2026-09-30 | `S4R48A` | HPE Recommended |  | **No** |

## 🧩 6. Same-Product CTO Variant Matrix

| Chassis Identifier | Product Family | Generation | Form Factor | CTO Base SKU |
|--------------------|----------------|------------|-------------|--------------|
| **DL380a_Gen12** | ProLiant | Gen12 | 8DW/16SW | `P76706-B21` |

## 📦 9. Solution Manifest, EDT & Commercial Baseline

| Hardware (USD) | Support (USD) | Services (USD) | Software (USD) | Total Baseline (USD) |
|---:|---:|---:|---:|---:|
| $1,59,340 | $33,011 | $507 | $1,220 | **$1,94,078** |

### Authoritative Baseline BOM Hierarchy

| Level | Product # | Description | Qty | Unit Price (USD) | Ext. Price (USD) |
|---|---|---|---:|---:|---:|
| (1) | `P76706-B21` | HPE ProLiant Compute DL380a Gen12 8 Double Wide/16 Single Wide Configure-to-order Server | 1 | $21,407 | $21,407 |
| (2) | `P76706-B21 B19` | HPE ProLiant Compute DL380a Gen12 8DW/16SW Configure-to-order Server | 1 | $0 | $0 |
| (2) | `P74568-B21` | Intel Xeon 6520P 2.4GHz 24-core 210W Processor for HPE | 2 | $4,242 | $8,484 |
| (3) | `P74568-B21 0D1` | Factory Integrated | 2 | $0 | $0 |
| (2) | `P69728-F21` | HPE 64GB (1x64GB) Dual Rank x4 DDR5-6400 CAS-52-52-52 EC8 Registered Smart FIO Memory Kit | 4 | $28,532 | $1,14,128 |
| (2) | `P74710-B21` | HPE ProLiant Compute DL380a Gen12 4SFF FIO Drive Cage Kit | 1 | $372 | $372 |
| (2) | `P10097-B21` | Broadcom BCM57416 Ethernet 10Gb 2-port BASE-T OCP3 Adapter for HPE | 1 | $1,105 | $1,105 |
| (3) | `P10097-B21 0D1` | Factory Integrated | 1 | $0 | $0 |
| (2) | `P67252-B21` | HPE 2400W M-CRPS Titanium Hot Plug Power Supply Kit | 5 | $2,509 | $12,545 |
| (3) | `P67252-B21 0D1` | Factory Integrated | 5 | $0 | $0 |
| (2) | `P78384-B21` | HPE C19 - C20 250V 16Amp 2.5m FIO Power Cord | 5 | $20 | $100 |
| (2) | `BD505A` | HPE iLO Advanced 1-server License with 3yr Support on iLO Licensed Features | 1 | $469 | $469 |
| (3) | `BD505A 0D1` | Factory Integrated | 1 | $0 | $0 |
| (2) | `S1A05A` | HPE Compute Cloud Management Server FIO Enablement | 1 | $1 | $1 |
| (2) | `P74694-B21` | HPE ProLiant Compute DL380a Gen12 OCPA Cable Kit | 1 | $75 | $75 |
| (3) | `P74694-B21 0D1` | Factory Integrated | 1 | $0 | $0 |
| (2) | `P74702-B21` | HPE ProLiant Compute DL380a Gen12 4NVMe Direct Attach Cable Kit | 1 | $170 | $170 |
| (3) | `P74702-B21 0D1` | Factory Integrated | 1 | $0 | $0 |
| (2) | `P69770-B21` | HPE ProLiant Compute DL380a Gen12 Ball Bearing Rail Kit | 1 | $950 | $950 |
| (3) | `P69770-B21 0D1` | Factory Integrated | 1 | $0 | $0 |
*... [7 additional baseline items omitted for brevity]*

