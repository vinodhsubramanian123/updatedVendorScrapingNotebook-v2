# HPE SY480_Gen12 — Synchronized Catalog Knowledge

**Target Product**: `SY480_Gen12`

**Scope Identity**: `HPE/SERVER/Synergy/Gen12/SY480_Gen12`

**Sync Timestamp**: 2026-11-08T11:17:11.970Z

**Total Verified SKUs**: `602` (`301` Hardware + `301` Services)

**Total Synced KnowledgeDeltas**: `19`

This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.

---

## 🚀 Executive Delta & Recent Change Summary

| Category | Total SKUs | Added (Last Scrape) | Price Changed | Attribute Changed | Reinstated | Status |
|----------|------------|---------------------|---------------|-------------------|------------|--------|
| **Hardware Components** | 301 | 60 | 0 | 151 | 24 | **CERTIFIED** |
| **Support Services & SLAs** | 301 | 68 | 0 | 17 | 0 | **CERTIFIED** |
| **Total Portfolio** | **602** | **128** | **0** | **168** | **24** | **ACTIVE** |

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

## 🏛️ 2. Family & Generation Rules (Synergy Gen12)

*No verified family/generation rules are registered for this product.*

## 🎯 3. Chassis & Solution-Type Gotchas (SY480_Gen12)

1. **[DELTA_SYNERGY_GEN12_FC_LICENSE_PROHIBITION] SY480_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `SY480_Gen12 CTO Server`):
   - **Rule**: On HPE Synergy 12000 Frames (P51174-B21) populated solely with SY480 Gen12 compute nodes (P68217-B21), selecting Virtual Connect Fibre Channel upgrade licenses (R3P67A FIO LTU or R3P67AAE BTO E-LTU) is strictly forbidden and triggers CLIC Rules 81410905 and 81314323 (UNBUILDABLE CONFIGURATION: OVERRIDE REQUIRES FACTORY APPROVAL). SY480 Gen12 compute nodes route dedicated SAN traffic via Mezzanine 1 (P68131-B21 64Gb FC HBA) directly to Brocade 64Gb FC Switch Modules (P77653-B21) in Bays 1 & 4. Fibre Channel port expansion must be licensed via Brocade 8-port upgrade E-LTU (Q2E58AAE). Virtual Connect SE 100Gb F32 modules (867796-B21) in Bays 3 & 6 are dedicated to 25G/50G/100G Ethernet (via P64724-B21 adapter in Mezzanine 3), with no FCoE path on Gen12.
   - **Affected SKU**: `R3P67A` | **Required Dependency**: `Q2E58AAE`

2. **[DELTA_SYNERGY_FIO_VS_ELTU_STANDALONE_ORDERING] SY480_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `SY480_Gen12 CTO Server`):
   - **Rule**: R3P67A is a Factory Integrated Option (FIO LTU) ending in 'A', which strictly requires sub-iteming under a factory CTO chassis base (P51174-B21), triggering CLIC Rules 81013168 and 81125904 ('must be ordered as a sub-item to the Base') if quoted standalone. If a customer procurement contract mandates this 32Gb FC license, it CANNOT be fulfilled using R3P67A. It must be ordered as R3P67AAE (BTO Electronic License / E-LTU) placed in a completely separate standalone software quote (new UCID) where no P51174-B21 chassis or Gen12 compute nodes exist, bypassing both Rule 81125904 and Rule 81410905.
   - **Affected SKU**: `R3P67A` | **Required Dependency**: `R3P67AAE`

3. **[DELTA_SYNERGY_MULTI_ORDER_ADHOC_CONTAINER_PARTITIONING] SY480_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `SY480_Gen12 CTO Server`):
   - **Rule**: When a multi-frame Synergy deployment (e.g. 2 frames, 24 nodes) is partitioned into separate commercial orders (Option B): (1) Order 2 (Frame 2) is structured as a clean hardware clone with zero loose cables, zero loose transceivers, and zero unpack services; (2) Order 1 (Frame 1) hosts a dedicated Adhoc container carrying 100% of all loose physical connectivity for both frames (DAC cables: 487655-B21 10G, 845406-B21 100G; AOC cables: 845410-B21 100G; fiber: QK734A OM4; transceivers: 455883-B21 10G SFP+ SR, 845398-B21 25G SFP28 SR, 841716-B21 40G QSFP+ BiDi) totaling $96,236.00 list; (3) Embedded switch licenses (Q2E58AAE Brocade 8-port upgrade E-LTU) must NEVER be lumped into Adhoc—they must be split evenly inside the physical switch modules (4 in Frame 1, 4 in Frame 2) to preserve 1:1 hardware module licensing integrity; (4) Tech Care Basic support (HU4B2A3) must be preserved 1:1 on both frames ($46,156 each) to satisfy CLIC Rules 99916598/99916599.
   - **Affected SKU**: `P51174-B21` | **Required Dependency**: `Q2E58AAE`

4. **[DELTA_SYNERGY_MULTI_FRAME_SPLIT_STARTUP_SIZING] SY480_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `SY480_Gen12 CTO Server`):
   - **Rule**: When a multi-frame Synergy deployment (e.g. 2 frames, 24 nodes) is partitioned into separate commercial quotes/orders: (1) Frame 1 carries 1x HA124A1#5ZM (First Frame Onsite Startup, $16,742 USD); (2) Frame 2 carries 1x HA124A1#5ZQ (Additional Frame Onsite Startup, $4,627 USD), saving $12,115 USD vs duplicating First Frame; (3) Order 2 remarks must cross-reference Order 1's UCID (e.g. 5157071497-02) to satisfy automated CLIC Rule 81039677 order acceptance; (4) If frames are deployed as independent standalone islands (separate sites or unlinked OneView domains), both frames require HA124A1#5ZM; (5) Remote Startup (HA124A1#V0F) and Onsite Startup (HA124A1#5ZM) are strictly mutually exclusive and must never be combined.
   - **Affected SKU**: `HA124A1` | **Required Dependency**: `HA124A1#5ZM`

5. **[LEARN_SY480_GEN12_WORKFLOW_DUAL_PUBLICATION_ADVISORY_20261029] SY480_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `SY480_Gen12 CTO Server`):
   - **Rule**: Publish and read back the human Drive workbook separately from the complete semantic Markdown source in NotebookLM. Google Sheets is not a supported NotebookLM Drive source. A recent upload timestamp does not refresh old vendor observations.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

6. **[LEARN_SY480_GEN12_WORKFLOW_SOURCE_RETIREMENT_ADVISORY_20261029] SY480_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `SY480_Gen12 CTO Server`):
   - **Rule**: Verify exact-product replacement content, indexing and source-restricted grounded canary, then commit trust metadata before removing only managed stale catalog snapshots. Preserve QuickSpecs, separate learnings, shared enclosure/fabric sources and unrelated documents. Inventory absence is not authority to remove another product source.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

7. **[LEARN_SY480_GEN12_WORKFLOW_CLOUD_LEARNING_REVIEW_ADVISORY_20261029] SY480_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `SY480_Gen12 CTO Server`):
   - **Rule**: Preserve retrieved cloud learning documents locally with their source IDs. Treat prose claims as candidates pending dated vendor evidence; resolve contradictions before promoting hardware dependencies. Conflicting quantity claims require dated evidence for this exact product and selector state.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

8. **[LEARN_SY480_GEN12_128GB_MEMORY_ERROR_CLEARED_20261102] SY480_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `SY480_Gen12 CTO Server`):
   - **Rule**: CRITICAL BUILDABILITY BREAKTHROUGH: HPE 128GB (1x128GB) Dual Rank x4 DDR5-6400 CAS-52-52-52 Smart FIO Memory Kit (P69730-F21) previously triggered a blocking validation Error in CLIC on SY480 Gen12 compute modules. In November 2026 OCA release, this validation Error is fully resolved and cleared to clean/pass. High-density 128GB memory configurations (up to 384 kits per frame across 12 nodes, 49.15TB total RAM) are now 100% certified buildable. Discontinued date extended to 2030-06-30.
   - **Affected SKU**: `P69730-F21` | **Required Dependency**: `P51174-B21`

9. **[LEARN_SYNERGY_SUPPORT_PRICING_UPDATE_20261102] SY480_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `SY480_Gen12 CTO Server`):
   - **Rule**: Synergy stack 3Y Tech Care Basic support rates adjusted by ~5%: Synergy 12000 Frame Support (HU4B2A3 WJN) updated to $779.00 (+$37.00); VC SE 100Gb F32 Module Support (HU4B2A3 Z1R) updated to $813.00 (+$39.00/unit); SY480 Gen12 Compute Node Support (HU4B2A30BT7) updated to $3,497.00 (+$167.00/node). Overall 12-node solution services list price adjusted from $62,898.00 to $65,017.00 USD (+$2,119.00).
   - **Affected SKU**: `HU4B2A30BT7` | **Required Dependency**: `N/A`

10. **[LEARN_SYNERGY_LEAD_TIME_AND_VALIDATION_20261102] SY480_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `SY480_Gen12 CTO Server`):
   - **Rule**: HPE 960GB NVMe M.2 2280 PE9010 SSD (P80321-B21) factory lead time extended from 11 days to 30 days (+19 days). Synergy 12000 CTO Frame (P51174-B21) lead time is 13 days, and CLIC validation warnings have cleared to clean/pass.
   - **Affected SKU**: `P80321-B21` | **Required Dependency**: `N/A`


## 🔒 3b. Physical & Architectural Gating Rules (DOM Unavailable Tables)

### Base Chassis & Form Factor Compatibility Gates

1. **[Hybrid RAID]**: The VROC SKUs could be selected only if the NVMe drives are selected with either 4SFF Dir Conn Kit (P68219-B21) or 8EDSFF Kit (P68220-B21)
   - **Gated Rule Type**: `CHASSIS_GATE`
   - **Affected SKUs (2)**: `R7J57A`, `S3Q19A`

### Component Mutual Exclusion Rules

1. **[Processors]**: The total qty of heat sink selected should match with the qty of processor selected.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (2)**: `P68225-B21`, `P68226-B21`

2. **[Virtualization]**: Private Product is not valid for current customer account
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (3)**: `S4R76AAE`, `S4F94AAE`, `S4G00AAE`

## ⚠️ 4. Discontinued & Obsolete SKUs Registry

### Fully Discontinued & Delisted SKUs

| SKU | Description | Status | Discontinued Date | Last Known Price | Successor SKU | Tracking |
|-----|-------------|--------|-------------------|------------------|---------------|----------|
| `Q0D22A` | Red Hat Enterprise Linux Server 2 Sockets 4 Guests 5yr Subscription 24x7 Support Flexible LTU | **REINSTATED** | 2026-09-11 | $10183.00 | None | STOPPED_AFTER_REMOVAL |
| `Q0D23A` | Red Hat Enterprise Linux Server 2 Sockets 4 Guests 5yr Subscription 9x5 Support Flexible LTU | **REINSTATED** | 2026-09-11 | $6264.00 | None | STOPPED_AFTER_REMOVAL |
| `Q5W20A` | Red Hat Enterprise Linux for SAP (Physical/Virtual Nodes) 3yr Subscription 24x7 Support Flex LTU | **REINSTATED** | 2026-09-11 | $4072.00 | None | STOPPED_AFTER_REMOVAL |
| `Q5W19A` | Red Hat Enterprise Linux for SAP (Physical/Virtual Nodes) 3yr Subscription 9x5 Support Flex LTU | **REINSTATED** | 2026-09-11 | $2505.00 | None | STOPPED_AFTER_REMOVAL |
| `Q5W22A` | Red Hat Enterprise Linux for SAP (Physical/Virtual Nodes) 5yr Subscription 24x7 Support Flex LTU | **REINSTATED** | 2026-09-11 | $6787.00 | None | STOPPED_AFTER_REMOVAL |
| `Q5W21A` | Red Hat Enterprise Linux for SAP (Physical/Virtual Nodes) 5yr Subscription 9x5 Support Flex LTU | **REINSTATED** | 2026-09-11 | $4175.00 | None | STOPPED_AFTER_REMOVAL |
| `Q8U19A` | Red Hat Enterprise Linux for SAP Solutions for Physical Nodes 3yr Subscription 24x7 Support LTU | **REINSTATED** | 2026-09-11 | $6737.00 | None | STOPPED_AFTER_REMOVAL |
| `Q8U21A` | Red Hat Enterprise Linux for SAP Solutions for Physical Nodes 3yr Subscription 9x5 Support LTU | **REINSTATED** | 2026-09-11 | $5483.00 | None | STOPPED_AFTER_REMOVAL |
| `Q8U20A` | Red Hat Enterprise Linux for SAP Solutions for Physical Nodes 5yr Subscription 24x7 Support LTU | **REINSTATED** | 2026-09-11 | $11229.00 | None | STOPPED_AFTER_REMOVAL |
| `Q8U22A` | Red Hat Enterprise Linux for SAP Solutions for Physical Nodes 5yr Subscription 9x5 Support LTU | **REINSTATED** | 2026-09-11 | $9139.00 | None | STOPPED_AFTER_REMOVAL |
| `Q8U15A` | Red Hat Enterprise Linux for SAP Solutions for Virtual DC 3yr Subscription 24x7 Support LTU | **REINSTATED** | 2026-09-11 | $24680.00 | None | STOPPED_AFTER_REMOVAL |
| `Q8U17A` | Red Hat Enterprise Linux for SAP Solutions for Virtual DC 3yr Subscription 9x5 Support LTU | **REINSTATED** | 2026-09-11 | $20325.00 | None | STOPPED_AFTER_REMOVAL |
| `Q8U16A` | Red Hat Enterprise Linux for SAP Solutions for Virtual DC 5yr Subscription 24x7 Support LTU | **REINSTATED** | 2026-09-11 | $41134.00 | None | STOPPED_AFTER_REMOVAL |
| `Q8U18A` | Red Hat Enterprise Linux for SAP Solutions for Virtual DC 5yr Subscription 9x5 Support LTU | **REINSTATED** | 2026-09-11 | $33874.00 | None | STOPPED_AFTER_REMOVAL |
| `Q5W24A` | Red Hat Enterprise Linux for SAP for Virtual Datacenters 3yr Subscription 24x7 Support Flex LTU | **REINSTATED** | 2026-09-11 | $14516.00 | None | STOPPED_AFTER_REMOVAL |
| `Q5W23A` | Red Hat Enterprise Linux for SAP for Virtual Datacenters 3yr Subscription 9x5 Support Flex LTU | **REINSTATED** | 2026-09-11 | $9072.00 | None | STOPPED_AFTER_REMOVAL |
| `Q5W26A` | Red Hat Enterprise Linux for SAP for Virtual Datacenters 5yr Subscription 24x7 Support Flex LTU | **REINSTATED** | 2026-09-11 | $24194.00 | None | STOPPED_AFTER_REMOVAL |
| `Q5W25A` | Red Hat Enterprise Linux for SAP for Virtual Datacenters 5yr Subscription 9x5 Support Flex LTU | **REINSTATED** | 2026-09-11 | $15119.00 | None | STOPPED_AFTER_REMOVAL |
| `Q0D26A` | Red Hat High Availability 2 Sockets Unlimited Guests 5yr Subscription Flexible LTU | **REINSTATED** | 2026-09-11 | $7532.00 | None | STOPPED_AFTER_REMOVAL |
| `Q0D25A` | Red Hat High Availability 2 Sockets or 2 Guests 5yr Subscription Flexible LTU | **REINSTATED** | 2026-09-11 | $2085.00 | None | STOPPED_AFTER_REMOVAL |
| `Q0D30A` | Red Hat Resilient Storage 2 Sockets Unlimited Guests 5yr Subscription Flexible LTU | **REINSTATED** | 2026-09-11 | $15095.00 | None | STOPPED_AFTER_REMOVAL |
| `Q0D29A` | Red Hat Resilient Storage 2 Sockets or 2 Guests 5yr Subscription Flexible LTU | **REINSTATED** | 2026-09-11 | $4395.00 | None | STOPPED_AFTER_REMOVAL |
| `N0U73A` | SUSE Linux Enterprise Server SAP 1-2 Sockets or 1-2 VM 3-year Subscription 24x7 Support Flexible LTU | **REINSTATED** | 2026-09-11 | $7803.00 | None | STOPPED_AFTER_REMOVAL |
| `N0U75A` | SUSE Linux Enterprise Server SAP 1-2 Sockets or 1-2 VM 5-year Subscription 24x7 Support Flexible LTU | **REINSTATED** | 2026-09-11 | $13005.00 | None | STOPPED_AFTER_REMOVAL |
| `HB242A1` | HPE MCS Relocation Unit of SVC | **DISCONTINUED** | 2026-10-29 | $100.00 | None | STOPPED_AFTER_REMOVAL |
| `HA334A1` | HPE HPC AI Team Day SVC | **DISCONTINUED** | 2026-10-29 | $9398.00 | None | STOPPED_AFTER_REMOVAL |
| `HK033A1` | HPE MCS Deployment Unit of SVC | **DISCONTINUED** | 2026-10-29 | $100.00 | None | STOPPED_AFTER_REMOVAL |
| `HA0Z0A1` | HPE DL 1Yr Other 1GB Content Hosted SVC | **DISCONTINUED** | 2026-10-29 | $1620.00 | None | STOPPED_AFTER_REMOVAL |
| `HR2R4A1` | HPE Digital Learner Bronze 1Yr Subs SVC | **DISCONTINUED** | 2026-10-29 | $4000.00 | None | STOPPED_AFTER_REMOVAL |
| `HR2R5A1` | HPE Digital Learner Silver 1Yr Subs SVC | **DISCONTINUED** | 2026-10-29 | $5000.00 | None | STOPPED_AFTER_REMOVAL |
| `HR2R6A1` | HPE Digital Learner Gold 1Yr Subs SVC | **DISCONTINUED** | 2026-10-29 | $8000.00 | None | STOPPED_AFTER_REMOVAL |
| `HV9V8A1` | HPE Digital Learner SMB 1Yr Subs SVC | **DISCONTINUED** | 2026-10-29 | $1300.00 | None | STOPPED_AFTER_REMOVAL |
| `H36VWA1` | HPE Storage VM Migration 50 VM SVC | **DISCONTINUED** | 2026-10-29 | $17520.00 | None | STOPPED_AFTER_REMOVAL |
| `H36VXA1` | HPE Storage VM Migration 150 VM SVC | **DISCONTINUED** | 2026-10-29 | $29760.00 | None | STOPPED_AFTER_REMOVAL |
| `H36WBA1` | HPE Storage VM Migration 5 VM Zerto SVC | **DISCONTINUED** | 2026-10-29 | $7140.00 | None | STOPPED_AFTER_REMOVAL |
| `H36WNA1` | HPE AI Soltns and Platfrms 5 Day Rem SVC | **DISCONTINUED** | 2026-10-29 | $13800.00 | None | STOPPED_AFTER_REMOVAL |
| `H36WMA1` | HPE AI Solns and Pltfrms 5 Day Onste SVC | **DISCONTINUED** | 2026-10-29 | $23400.00 | None | STOPPED_AFTER_REMOVAL |
| `H36WQA1` | HPE AI Soltns and Platfrms 1 Day Rem SVC | **DISCONTINUED** | 2026-10-29 | $2760.00 | None | STOPPED_AFTER_REMOVAL |
| `H46RMA1` | HPE Data and AI Security 5 Day Rem SVC | **DISCONTINUED** | 2026-10-29 | $9000.00 | None | STOPPED_AFTER_REMOVAL |
| `H46RNA1` | HPE Data and AI Security 5 Day Onste SVC | **DISCONTINUED** | 2026-10-29 | $18540.00 | None | STOPPED_AFTER_REMOVAL |
| `H46RLA1` | HPE Data and AI Security 1 Day Rem SVC | **DISCONTINUED** | 2026-10-29 | $2640.00 | None | STOPPED_AFTER_REMOVAL |
| `H57FDA1` | HPE Data Sltn and Pltfrms 5 Day Rem SVC | **DISCONTINUED** | 2026-10-29 | $13800.00 | None | STOPPED_AFTER_REMOVAL |
| `H4F41A1` | HPE Factory Express Standard Unit of SVC | **DISCONTINUED** | 2026-10-29 | $19.00 | None | STOPPED_AFTER_REMOVAL |
| `H4F42A1` | HPE Factory Express Complex Unit of SVC | **DISCONTINUED** | 2026-10-29 | $1850.00 | None | STOPPED_AFTER_REMOVAL |
| `HA840A1` | HPE Supplied Asset Tag Service | **DISCONTINUED** | 2026-10-29 | $15.00 | None | STOPPED_AFTER_REMOVAL |
| `HA841A1` | HPE Customer Supplied Asset Tag Service | **DISCONTINUED** | 2026-10-29 | $26.00 | None | STOPPED_AFTER_REMOVAL |
| `HA844A1` | HPE 3rd Party Hardware Install Service | **DISCONTINUED** | 2026-10-29 | $28.00 | None | STOPPED_AFTER_REMOVAL |
| `HA854A1` | HPE Fctry Exp Virtualization Enable SVC | **DISCONTINUED** | 2026-10-29 | $2134.00 | None | STOPPED_AFTER_REMOVAL |
| `HA861A1` | HPE FE Personalized Install SVC | **DISCONTINUED** | 2026-10-29 | $2105.00 | None | STOPPED_AFTER_REMOVAL |
| `HA867A1` | HPE Standard Product Reporting Service | **DISCONTINUED** | 2026-10-29 | $13.00 | None | STOPPED_AFTER_REMOVAL |
| `HA868A1` | HPE Enhanced Product Reporting Service | **DISCONTINUED** | 2026-10-29 | $38.00 | None | STOPPED_AFTER_REMOVAL |
| `HA875A1` | HPE Special Factory Service | **DISCONTINUED** | 2026-10-29 | $1.00 | None | STOPPED_AFTER_REMOVAL |
| `HU7D3A1` | HPE FE OEM Customization UOS SVC | **DISCONTINUED** | 2026-10-29 | $65.00 | None | STOPPED_AFTER_REMOVAL |
| `AC120A` | HPE Pallet Size Customization Service | **DISCONTINUED** | 2026-10-29 | $7.00 | None | STOPPED_AFTER_REMOVAL |
| `AC129A` | HPE Consolidation Logistic Service | **DISCONTINUED** | 2026-10-29 | $26.00 | None | STOPPED_AFTER_REMOVAL |
| `P1F69A` | HPE Delivery Site Above Ground Floor Service | **DISCONTINUED** | 2026-10-29 | $289.00 | None | STOPPED_AFTER_REMOVAL |
| `P1F70A` | HPE Forklift at Delivery Service | **DISCONTINUED** | 2026-10-29 | $1399.00 | None | STOPPED_AFTER_REMOVAL |
| `P1F72A` | HPE Two People at Delivery SVC | **DISCONTINUED** | 2026-10-29 | $466.00 | None | STOPPED_AFTER_REMOVAL |
| `P1F73A` | HPE Campus Delivery Service | **DISCONTINUED** | 2026-10-29 | $104.00 | None | STOPPED_AFTER_REMOVAL |
| `P1F75A` | HPE Fixed Delivery Appointment Service | **DISCONTINUED** | 2026-10-29 | $466.00 | None | STOPPED_AFTER_REMOVAL |
| `AC069A` | HPE FE Cluster Hig Den-Node HW Intg SVC | **DISCONTINUED** | 2026-10-29 | $92.00 | None | STOPPED_AFTER_REMOVAL |
| `HB485A1` | HPE ClusterPlatform 130-257 Fact SW SVC | **DISCONTINUED** | 2026-10-29 | $57508.00 | None | STOPPED_AFTER_REMOVAL |
| `SB000DL` | HPE AMS HPC Rack Config Service | **DISCONTINUED** | 2026-10-29 | $1.00 | None | STOPPED_AFTER_REMOVAL |

### ⏳ Impending Obsolescence & Clearance Hardware (90-Day to 180-Day Window)

*These components remain orderable in live configurators today but have published vendor end dates. They represent high-value clearance opportunities for immediate deployments, but require explicit procurement cutoff remarks before quotation:*

| Product # | Description | Category | List Price (USD) | Discontinued Date | Price Trend | Presales Strategy Guidance |
|---|---|---|---:|---|:---:|---|
| `P77096-291` | Microsoft Windows Server 2025 16-core Standard FIO Pre-installed UEFI Japanese SW | Software & Licenses | $0 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77096-B21` | Microsoft Windows Server 2025 16-core Standard FIO Pre-installed UEFI en/fr/de/es/it/pt/nl SW | Software & Licenses | $1,147 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77097-291` | Microsoft Windows Server 2025 16-core Datacenter FIO Not Pre-installed Japanese SW | Software & Licenses | $0 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77097-B21` | Microsoft Windows Server 2025 16-core Datacenter FIO Not Pre-installed en/fr/de/es/it/pt/nl SW | Software & Licenses | $5,712 | 01/31/2027 | +100.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77095-291` | Microsoft Windows Server 2025 16-core Standard FIO Not Pre-installed Japanese SW | Software & Licenses | $0 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77095-B21` | Microsoft Windows Server 2025 16-core Standard FIO Not Pre-installed en/fr/de/es/it/pt/nl SW | Software & Licenses | $1,147 | 01/31/2027 | +100.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45879-B21` | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed English SW | Software & Licenses | $20 | 01/31/2027 | -28.57% | 🔥 **Clearance Opportunity** (-28.57% CapEx savings). Procure before 01/31/2027. |
| `P45879-051` | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed French SW | Software & Licenses | $20 | 01/31/2027 | -28.57% | 🔥 **Clearance Opportunity** (-28.57% CapEx savings). Procure before 01/31/2027. |
| `P45879-041` | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed German SW | Software & Licenses | $20 | 01/31/2027 | -28.57% | 🔥 **Clearance Opportunity** (-28.57% CapEx savings). Procure before 01/31/2027. |
| `P45879-061` | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed Italian SW | Software & Licenses | $20 | 01/31/2027 | -28.57% | 🔥 **Clearance Opportunity** (-28.57% CapEx savings). Procure before 01/31/2027. |
| `P45879-291` | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed Japanese SW | Software & Licenses | $99,999 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45879-071` | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed Spanish SW | Software & Licenses | $20 | 01/31/2027 | -28.57% | 🔥 **Clearance Opportunity** (-28.57% CapEx savings). Procure before 01/31/2027. |
| `P45862-B21` | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed English SW | Software & Licenses | $20 | 01/31/2027 | -28.57% | 🔥 **Clearance Opportunity** (-28.57% CapEx savings). Procure before 01/31/2027. |
| `P45862-051` | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed French SW | Software & Licenses | $20 | 01/31/2027 | -28.57% | 🔥 **Clearance Opportunity** (-28.57% CapEx savings). Procure before 01/31/2027. |
| `P45862-041` | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed German SW | Software & Licenses | $20 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45862-061` | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed Italian SW | Software & Licenses | $20 | 01/31/2027 | -28.57% | 🔥 **Clearance Opportunity** (-28.57% CapEx savings). Procure before 01/31/2027. |
| `P45862-291` | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed Japanese SW | Software & Licenses | $99,999 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45862-071` | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed Spanish SW | Software & Licenses | $20 | 01/31/2027 | -28.57% | 🔥 **Clearance Opportunity** (-28.57% CapEx savings). Procure before 01/31/2027. |
| `P77125-291` | Microsoft Windows Server 2022 Downgrade Datacenter FIO Not Pre-installed Japanese SW | Software & Licenses | $0 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77125-B21` | Microsoft Windows Server 2022 Downgrade Datacenter FIO Not Pre-installed WW SW | Software & Licenses | $33 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77124-291` | Microsoft Windows Server 2022 Downgrade Standard FIO Not Pre-installed Japanese SW | Software & Licenses | $0 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77124-B21` | Microsoft Windows Server 2022 Downgrade Standard FIO Not Pre-installed WW SW | Software & Licenses | $33 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77102-291` | Microsoft Windows Server 2025 16-core Datacenter Reassignment Reseller Option Kit Japanese SW | Software & Licenses | $0 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77102-B21` | Microsoft Windows Server 2025 16-core Datacenter Reassignment Reseller Option Kit en/fr/de/es SW | Software & Licenses | $7,733 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77101-AA1` | Microsoft Windows Server 2025 16-core Datacenter Reseller Option Kit Chinese Simplified SW | Software & Licenses | $0 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
*... [11 additional impending EOL records omitted for brevity]*

## 📊 5b. Category-Level Trends & Significant Price Adjustments

### Category Portfolio Delta & Planning Intelligence

| Category | Total SKUs | Added | Modified | Unchanged | Clearance / Drops | Category Planning Insight |
|---|---:|---:|---:|---:|---:|---|
| **Chassis** | 1 | 0 | 1 | 0 | 0 | 🔄 Attributes/specifications updated (1 SKUs) |
| **PCIe Risers** | 1 | 0 | 1 | 0 | 0 | 🔄 Attributes/specifications updated (1 SKUs) |
| **Drive Enclosures / Drives** | 10 | 0 | 10 | 0 | 0 | 🔄 Attributes/specifications updated (10 SKUs) |
| **Processor** | 17 | 1 | 16 | 0 | 0 | ✨ Portfolio expanding (+1 new options) |
| **Cooling / Thermal** | 2 | 0 | 2 | 0 | 0 | 🔄 Attributes/specifications updated (2 SKUs) |
| **Memory** | 14 | 0 | 14 | 0 | 0 | 🔄 Attributes/specifications updated (14 SKUs) |
| **Accessories & Infrastructure** | 1 | 0 | 1 | 0 | 0 | 🔄 Attributes/specifications updated (1 SKUs) |
| **Software & Licenses** | 244 | 59 | 185 | 0 | 17 | ⚠️ Active price drops / clearance (17 SKUs discounted) |
| **Storage Controllers** | 6 | 0 | 6 | 0 | 0 | 🔄 Attributes/specifications updated (6 SKUs) |
| **Networking** | 3 | 0 | 3 | 0 | 0 | 🔄 Attributes/specifications updated (3 SKUs) |
| **Cables & Enablement Kits** | 2 | 0 | 2 | 0 | 0 | 🔄 Attributes/specifications updated (2 SKUs) |

### High-Impact Price Adjustments (Drops $\ge 10\%$ and Major Moves)

| Product # | Description | Category | Previous Price | Current Price | Delta (USD) | Change (%) | Movement Type |
|---|---|---|---:|---:|---:|---:|---|
| `P77111-B21` | Microsoft Windows Server 2025 1 Device CAL WW LTU | Software & Licenses | New Addition | $52 | $52 | **+100.0%** | ✨ NEW_OPTION |
| `P46191-B21` | Microsoft Windows Server 2022 1 User CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | Software & Licenses | New Addition | $55 | $55 | **+100.0%** | ✨ NEW_OPTION |
| `P77110-B21` | Microsoft Windows Server 2025 1 User CAL WW LTU | Software & Licenses | New Addition | $72 | $72 | **+100.0%** | ✨ NEW_OPTION |
| `P77119-B21` | Microsoft Windows Server 2025 Remote Desktop Service 1 Device CAL WW LTU | Software & Licenses | New Addition | $201 | $201 | **+100.0%** | ✨ NEW_OPTION |
| `P46216-B21` | Microsoft Windows Server 2022 5 Devices CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | Software & Licenses | New Addition | $216 | $216 | **+100.0%** | ✨ NEW_OPTION |
| `P77113-B21` | Microsoft Windows Server 2025 5 Devices CAL WW LTU | Software & Licenses | New Addition | $226 | $226 | **+100.0%** | ✨ NEW_OPTION |
| `P46215-B21` | Microsoft Windows Server 2022 5 Users CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | Software & Licenses | New Addition | $271 | $271 | **+100.0%** | ✨ NEW_OPTION |
| `P77118-B21` | Microsoft Windows Server 2025 Remote Desktop Service 1 User CAL WW LTU | Software & Licenses | New Addition | $280 | $280 | **+100.0%** | ✨ NEW_OPTION |
| `P77112-B21` | Microsoft Windows Server 2025 5 Users CAL WW LTU | Software & Licenses | New Addition | $322 | $322 | **+100.0%** | ✨ NEW_OPTION |
| `P46218-B21` | Microsoft Windows Server 2022 10 Devices CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | Software & Licenses | New Addition | $429 | $429 | **+100.0%** | ✨ NEW_OPTION |
| `P77115-B21` | Microsoft Windows Server 2025 10 Devices CAL WW LTU | Software & Licenses | New Addition | $444 | $444 | **+100.0%** | ✨ NEW_OPTION |
| `S6L28B` | Microsoft Windows Server 2025 10-core Essentials FIO Not Pre-installed WW ESD LTU | Software & Licenses | New Addition | $445 | $445 | **+100.0%** | ✨ NEW_OPTION |
| `P46217-B21` | Microsoft Windows Server 2022 10 Users CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | Software & Licenses | New Addition | $539 | $539 | **+100.0%** | ✨ NEW_OPTION |
| `P77114-B21` | Microsoft Windows Server 2025 10 Users CAL WW LTU | Software & Licenses | New Addition | $636 | $636 | **+100.0%** | ✨ NEW_OPTION |
| `P46222-B21` | Microsoft Windows Server 2022 RDS 5 Devices CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | Software & Licenses | New Addition | $880 | $880 | **+100.0%** | ✨ NEW_OPTION |
| `P46221-B21` | Microsoft Windows Server 2022 RDS 5 Users CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | Software & Licenses | New Addition | $935 | $935 | **+100.0%** | ✨ NEW_OPTION |
| `P77121-B21` | Microsoft Windows Server 2025 Remote Desktop Service 5 Devices CAL WW LTU | Software & Licenses | New Addition | $974 | $974 | **+100.0%** | ✨ NEW_OPTION |
| `P46005-B21` | Microsoft Windows Server 2022 16-core Standard FIO Not Pre-installed en/fr/it/de/es/nl/pt SW | Software & Licenses | New Addition | $988 | $988 | **+100.0%** | ✨ NEW_OPTION |
| `S3R51A` | SUSE Linux Enterprise Server w/SUSE Manager Lifecycle Management+ 1-2 Sockets/1-2 VM 1yr 9x5 LTU | Software & Licenses | New Addition | $1,099 | $1,099 | **+100.0%** | ✨ NEW_OPTION |
| `S7N90A` | SUSE Linux Enterprise Server w/SUSE Multi-Linux Mgr Lifecycle Mgmt+ 1-2 Skts/1-2 VM 1yr 9x5 LTU | Software & Licenses | New Addition | $1,099 | $1,099 | **+100.0%** | ✨ NEW_OPTION |
*... [33 additional price movements omitted for brevity]*

## 🔄 5. Recent Attribute & Specification Modifications Log

| Timestamp | SKU | Attribute | Old Value | New Value |
|-----------|-----|-----------|-----------|-----------|
| 2026-10-29 | `TD377A` | CLIC Status | Obsolete (OB) | **** |
| 2026-10-29 | `TD377A` | Lifecycle Badge | OB | **** |
| 2026-10-29 | `TD377A` | Availability | Obsolete (OB) | **** |
| 2026-10-29 | `TD377A` | Lead Time Source | Not published by OCA | **** |
| 2026-10-29 | `TD377A` | Vendor Attributes | {"Extended Price (USD)":"0"} | **** |
| 2026-10-29 | `BD571A` | Description | Mellanox Unified Fabric Manager Advanced 1yr 24x7 Updates and Technical Support Flex License | **** |
| 2026-10-29 | `BD571A` | Option Type | Standard | **** |
| 2026-10-29 | `BD571A` | Start Date | 08/13/2012 | **** |
| 2026-10-29 | `BD571A` | Discontinued Date | 03/03/2022 | **** |
| 2026-10-29 | `BD571A` | Lifecycle Status | Obsolete (OB) | **** |
| 2026-10-29 | `BD571A` | CLIC Status | Obsolete (OB) | **** |
| 2026-10-29 | `BD571A` | Lifecycle Badge | OB | **** |
| 2026-10-29 | `BD571A` | Availability | Obsolete (OB) | **** |
| 2026-10-29 | `BD571A` | Lead Time Source | Not published by OCA | **** |
| 2026-10-29 | `BD571A` | Vendor Attributes | {"Extended Price (USD)":"0"} | **** |
| 2026-10-29 | `BD572A` | Description | Mellanox Unified Fabric Manager Advanced 3yr 24x7 Updates and Technical Support Flex License | **** |
| 2026-10-29 | `BD572A` | Option Type | Standard | **** |
| 2026-10-29 | `BD572A` | Start Date | 08/13/2012 | **** |
| 2026-10-29 | `BD572A` | Discontinued Date | 03/03/2022 | **** |
| 2026-10-29 | `BD572A` | Lifecycle Status | Obsolete (OB) | **** |
| 2026-10-29 | `BD572A` | CLIC Status | Obsolete (OB) | **** |
| 2026-10-29 | `BD572A` | Lifecycle Badge | OB | **** |
| 2026-10-29 | `BD572A` | Availability | Obsolete (OB) | **** |
| 2026-10-29 | `BD572A` | Lead Time Source | Not published by OCA | **** |
| 2026-10-29 | `BD572A` | Vendor Attributes | {"Extended Price (USD)":"0"} | **** |

## 🧩 6. Same-Product CTO Variant Matrix

| Chassis Identifier | Product Family | Generation | Form Factor | CTO Base SKU |
|--------------------|----------------|------------|-------------|--------------|
| **SY480_Gen12** | Synergy | Gen12 | Compute Module | `P68217-B21` |

## 📦 9. Solution Manifest, EDT & Commercial Baseline

**Configuration Profile**: `OCA Config 2` | **Icon ID**: `I157948070-01` | **Estimated Delivery Time (EDT)**: `14 - 18 days`

| Hardware (USD) | Support (USD) | Services (USD) | Software (USD) | Total Baseline (USD) |
|---:|---:|---:|---:|---:|
| $6,624 | $3,24,486 | $9,129 | $0 | **$3,40,239** |

### Authoritative Baseline BOM Hierarchy

| Level | Product # | Description | Qty | Unit Price (USD) | Ext. Price (USD) |
|---|---|---|---:|---:|---:|
| (1) | `P68217-B21` | HPE Synergy 480 Gen12 Configure-to-order Compute Module | 1 | $4,459 | $4,459 |
| (2) | `P64724-B21` | HPE Synergy 6310C 25/50Gb Ethernet Adapter | 1 | $2,165 | $2,165 |
| (3) | `P64724-B21 0D1` | Factory Integrated | 1 | $0 | $0 |
| (1) | `HG7A4AS` | HPE CC Environment Wide Entitlement SVC | 1 | $0 | $0 |
| (1) | `H54SBA5` | HPE 5Y Complete Care Service | 1 | $0 | $0 |
| (2) | `H54SBA5 Y35` | HPE 5Y Complete Care SVC | 1 | $2,52,630 | $2,52,630 |
| (1) | `HA113A1` | HPE Installation Service | 1 | $0 | $0 |
| (2) | `HA113A1 5ZZ` | HPE Synergy Node Installation Service | 1 | $734 | $734 |
| (1) | `HA124A1` | HPE Technical Installation Startup SVC | 1 | $0 | $0 |
| (2) | `HA124A1 V0F` | HPE Synergy First Frame Rmt Str SVC | 1 | $8,395 | $8,395 |
| (1) | `H1SR4AS` | HPE Service Credit | 1 | $0 | $0 |
| (1) | `HU0R5A5` | HPE 5Y Service Credits 10 Per Yr SVC | 1 | $0 | $0 |
| (2) | `HU0R5A5 Y39` | HPE 5Y Service Credits Qty 50 SVC | 3 | $17,526 | $52,578 |
| (1) | `HU4D5A5` | HPE 5Y Complete Care Addon Essential Service | 1 | $0 | $0 |
| (2) | `HU4D5A50BT7` | HPE SY480 Gen12 Support | 1 | $19,278 | $19,278 |

## ⏱️ 10. Supply Chain & Delivery Lead Time Intelligence

### ⚠️ Supply Chain Verification Advisory (Unpublished Delivery Lead Times)

*The following high-value active components have unpublished delivery estimates in live OCA. Presales engineers must verify distributor buffer stock before quoting committed deployment timelines:*

| Product # | Description | Category | Lead Time Status | Presales Action |
|---|---|---|:---:|---|
| `P80318-B21` | HPE 480GB NVMe Gen4 Mainstream Performance Read Intensive M.2 2280 PE9010 SSD | Drive Enclosures / Drives | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P80321-B21` | HPE 960GB NVMe Gen4 Mainstream Performance Read Intensive M.2 2280 PE9010 SSD | Drive Enclosures / Drives | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P73834-B21` | Intel Xeon 6767P 2.4GHz 64-core 350W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P74570-B21` | Intel Xeon 6527P 3.0GHz 24-core 255W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P74571-B21` | Intel Xeon 6530P 2.3GHz 32-core 225W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P74573-B21` | Intel Xeon 6730P 2.5GHz 32-core 250W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P74576-B21` | Intel Xeon 6737P 2.9GHz 32-core 270W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P73829-B21` | Intel Xeon 6740P 2.1GHz 48-core 270W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P73831-B21` | Intel Xeon 6747P 2.7GHz 48-core 330W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P73832-B21` | Intel Xeon 6760P 2.2GHz 64-core 330W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P73837-B21` | Intel Xeon 6787P 2.0GHz 86-core 350W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P74575-B21` | Intel Xeon 6736P 2.0GHz 36-core 205W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P81591-B21` | Intel Xeon 6745P 3.1GHz 32-core 300W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P69728-F21` | HPE 64GB (1x64GB) Dual Rank x4 DDR5-6400 CAS-52-52-52 EC8 Registered Smart FIO Memory Kit | Memory | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P69726-B21` | HPE 16GB (1x16GB) Single Rank x8 DDR5-6400 CAS-52-52-52 EC8 Registered Smart Memory Kit | Memory | **Unpublished** | Verify distributor inventory prior to SLA commitment |
*... [92 additional unpublished items omitted for brevity]*

