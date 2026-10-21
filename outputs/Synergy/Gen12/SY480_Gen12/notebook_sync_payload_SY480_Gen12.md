# HPE SY480_Gen12 — Synchronized Catalog Knowledge

**Target Product**: `SY480_Gen12`

**Scope Identity**: `HPE/SERVER/Synergy/Gen12/SY480_Gen12`

**Sync Timestamp**: 2026-10-21T11:15:51.184Z

**Total Verified SKUs**: `581` (`178` Hardware + `403` Services)

**Total Synced KnowledgeDeltas**: `22`

This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.

---

## 🚀 Executive Delta & Recent Change Summary

| Category | Total SKUs | Added (Last Scrape) | Price Changed | Attribute Changed | Reinstated | Status |
|----------|------------|---------------------|---------------|-------------------|------------|--------|
| **Hardware Components** | 178 | 0 | 0 | 6 | 0 | **CERTIFIED** |
| **Support Services & SLAs** | 403 | 0 | 0 | 0 | 0 | **CERTIFIED** |
| **Total Portfolio** | **581** | **0** | **0** | **6** | **0** | **ACTIVE** |

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

1. **[DELTA_SYNERGY_FRAME_STARTUP_MATH] SY480_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `Synergy Composable Fabric Solution`):
   - **Rule**: Onsite Frame Startup requires exactly 1x HA124A1#5ZM + (TotalFrames - 1)x HA124A1#5ZQ. Purge all HA124A1#V0F lines when onsite startup is selected.
   - **Affected SKU**: `HA124A1` | **Required Dependency**: `HA124A1#5ZM`

2. **[DELTA_SYNERGY_VC_100GB_SUPPORT_ENTITLEMENT] SY480_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `Synergy Composable Fabric Solution`):
   - **Rule**: Qty of HU4B2A3#Z1R must exactly equal qty of 867796-B21 (VC SE 100Gb F32 Module).
   - **Affected SKU**: `867796-B21` | **Required Dependency**: `HU4B2A3#Z1R`

3. **[DELTA_SYNERGY_COMPOSER2_SUPPORT_ENTITLEMENT] SY480_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `Synergy Composable Fabric Solution`):
   - **Rule**: Qty of HU4B2A3#Z1Q must exactly equal qty of 872957-B21 (Synergy Composer2 Management Appliance).
   - **Affected SKU**: `872957-B21` | **Required Dependency**: `HU4B2A3#Z1Q`

4. **[DELTA_SYNERGY_BROCADE_FC_SUPPORT_ENTITLEMENT] SY480_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `Synergy Composable Fabric Solution`):
   - **Rule**: Qty of HU4B2A30BU5 must exactly equal qty of P77653-B21 (Brocade 64Gb FC Switch Module).
   - **Affected SKU**: `P77653-B21` | **Required Dependency**: `HU4B2A30BU5`

5. **[DELTA_SYNERGY_COMPUTE_MODULE_SUPPORT_ENTITLEMENT] SY480_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `Synergy Composable Fabric Solution`):
   - **Rule**: Qty of HU4B2A30BT7 must exactly equal qty of P68217-B21 (HPE SY480 Gen12 Compute Module).
   - **Affected SKU**: `P68217-B21` | **Required Dependency**: `HU4B2A30BT7`

6. **[DELTA_SYNERGY_WARRANTY_VS_STARTUP_DECOUPLING] SY480_Gen12** (Taxonomy: `Synergy/Gen12/SY480_Gen12` | Solution: `SY480_Gen12 CTO Server`):
   - **Rule**: HPE Synergy quoting requires strict decoupling of two independent service domains: (1) HU4B2A3 — ongoing Point-of-Sale hardware maintenance (3Y Tech Care Basic, 9x5 NBD), decomposed per-subsystem (#WJN Frame, #Z1Q Composer2, #Z1R VC, 0BT7 Compute, 0BU5 Brocade); and (2) HA124A1 — one-time professional deployment/startup services (SOW-scoped). These are NOT interchangeable and must never be conflated in BOQ assembly.
   - **Affected SKU**: `HA124A1` | **Required Dependency**: `HU4B2A3`

7. **[DELTA_SYNERGY_REMOTE_ONSITE_CONFLICT] SY480_Gen12** (Taxonomy: `Synergy/Gen12/SY480_Gen12` | Solution: `SY480_Gen12 CTO Server`):
   - **Rule**: Remote startup (HA124A1#V0F) and Onsite startup (HA124A1#5ZM) are mutually exclusive delivery models for Synergy frame deployment. When Onsite is selected, all Remote startup lines MUST be purged to zero. Quoting both simultaneously creates SOW delivery scope conflicts that trigger CLIC Rule 81039677.
   - **Affected SKU**: `HA124A1#V0F` | **Required Dependency**: `HA124A1#5ZM`

8. **[DELTA_SYNERGY_ICON_ISOLATION_GUARDRAIL] SY480_Gen12** (Taxonomy: `Synergy/Gen12/SY480_Gen12` | Solution: `SY480_Gen12 CTO Server`):
   - **Rule**: When applying support services in OCA multi-icon solutions, NEVER check "Apply displayed install/support to all icons inside the solution". Always scope to "inside the Current Icon" only. This prevents Synergy frame support attributes from leaking into ProLiant rack server trees (or vice versa), which corrupts per-icon support decomposition and generates phantom entitlement mismatches.
   - **Affected SKU**: `HU4B2A3` | **Required Dependency**: `N/A`

9. **[DELTA_SYNERGY_STARTUP_PLACEMENT_HIERARCHY] SY480_Gen12** (Taxonomy: `Synergy/Gen12/SY480_Gen12` | Solution: `SY480_Gen12 CTO Server`):
   - **Rule**: Synergy startup services (HA124A1#5ZM First Frame Onsite, HA124A1#5ZQ Additional Frame Onsite) must be placed ONLY at the Icon #2 container level under Services → Deployment Services → Install-Install and Start Up. They must NEVER be placed locally under individual "Synergy 12000 Frame #N" child items. Duplicate placement between icon container and child frames causes CLIC Rule 81039677 to fire against the first line item (typically DL380) in the solution BOM.
   - **Affected SKU**: `HA124A1#5ZM` | **Required Dependency**: `HA124A1#5ZQ`

10. **[DELTA_SYNERGY_GEN12_FC_LICENSE_PROHIBITION] SY480_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `SY480_Gen12 CTO Server`):
   - **Rule**: On HPE Synergy 12000 Frames (P51174-B21) populated solely with SY480 Gen12 compute nodes (P68217-B21), selecting Virtual Connect Fibre Channel upgrade licenses (R3P67A FIO LTU or R3P67AAE BTO E-LTU) is strictly forbidden and triggers CLIC Rules 81410905 and 81314323 (UNBUILDABLE CONFIGURATION: OVERRIDE REQUIRES FACTORY APPROVAL). SY480 Gen12 compute nodes route dedicated SAN traffic via Mezzanine 1 (P68131-B21 64Gb FC HBA) directly to Brocade 64Gb FC Switch Modules (P77653-B21) in Bays 1 & 4. Fibre Channel port expansion must be licensed via Brocade 8-port upgrade E-LTU (Q2E58AAE). Virtual Connect SE 100Gb F32 modules (867796-B21) in Bays 3 & 6 are dedicated to 25G/50G/100G Ethernet (via P64724-B21 adapter in Mezzanine 3), with no FCoE path on Gen12.
   - **Affected SKU**: `R3P67A` | **Required Dependency**: `Q2E58AAE`

11. **[DELTA_SYNERGY_FIO_VS_ELTU_STANDALONE_ORDERING] SY480_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `SY480_Gen12 CTO Server`):
   - **Rule**: R3P67A is a Factory Integrated Option (FIO LTU) ending in 'A', which strictly requires sub-iteming under a factory CTO chassis base (P51174-B21), triggering CLIC Rules 81013168 and 81125904 ('must be ordered as a sub-item to the Base') if quoted standalone. If a customer procurement contract mandates this 32Gb FC license, it CANNOT be fulfilled using R3P67A. It must be ordered as R3P67AAE (BTO Electronic License / E-LTU) placed in a completely separate standalone software quote (new UCID) where no P51174-B21 chassis or Gen12 compute nodes exist, bypassing both Rule 81125904 and Rule 81410905.
   - **Affected SKU**: `R3P67A` | **Required Dependency**: `R3P67AAE`

12. **[DELTA_SYNERGY_MULTI_ORDER_ADHOC_CONTAINER_PARTITIONING] SY480_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `SY480_Gen12 CTO Server`):
   - **Rule**: When a multi-frame Synergy deployment (e.g. 2 frames, 24 nodes) is partitioned into separate commercial orders (Option B): (1) Order 2 (Frame 2) is structured as a clean hardware clone with zero loose cables, zero loose transceivers, and zero unpack services; (2) Order 1 (Frame 1) hosts a dedicated Adhoc container carrying 100% of all loose physical connectivity for both frames (DAC cables: 487655-B21 10G, 845406-B21 100G; AOC cables: 845410-B21 100G; fiber: QK734A OM4; transceivers: 455883-B21 10G SFP+ SR, 845398-B21 25G SFP28 SR, 841716-B21 40G QSFP+ BiDi) totaling $96,236.00 list; (3) Embedded switch licenses (Q2E58AAE Brocade 8-port upgrade E-LTU) must NEVER be lumped into Adhoc—they must be split evenly inside the physical switch modules (4 in Frame 1, 4 in Frame 2) to preserve 1:1 hardware module licensing integrity; (4) Tech Care Basic support (HU4B2A3) must be preserved 1:1 on both frames ($46,156 each) to satisfy CLIC Rules 99916598/99916599.
   - **Affected SKU**: `P51174-B21` | **Required Dependency**: `Q2E58AAE`

13. **[DELTA_SYNERGY_MULTI_FRAME_SPLIT_STARTUP_SIZING] SY480_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `SY480_Gen12 CTO Server`):
   - **Rule**: When a multi-frame Synergy deployment (e.g. 2 frames, 24 nodes) is partitioned into separate commercial quotes/orders: (1) Frame 1 carries 1x HA124A1#5ZM (First Frame Onsite Startup, $16,742 USD); (2) Frame 2 carries 1x HA124A1#5ZQ (Additional Frame Onsite Startup, $4,627 USD), saving $12,115 USD vs duplicating First Frame; (3) Order 2 remarks must cross-reference Order 1's UCID (e.g. 5157071497-02) to satisfy automated CLIC Rule 81039677 order acceptance; (4) If frames are deployed as independent standalone islands (separate sites or unlinked OneView domains), both frames require HA124A1#5ZM; (5) Remote Startup (HA124A1#V0F) and Onsite Startup (HA124A1#5ZM) are strictly mutually exclusive and must never be combined.
   - **Affected SKU**: `HA124A1` | **Required Dependency**: `HA124A1#5ZM`


## 🔒 3b. Physical & Architectural Gating Rules (DOM Unavailable Tables)

*No portal-conditional gating rules detected in default DOM state.*

## ⚠️ 4. Discontinued & Obsolete SKUs Registry

### Fully Discontinued & Delisted SKUs

| SKU | Description | Status | Discontinued Date | Last Known Price | Successor SKU | Tracking |
|-----|-------------|--------|-------------------|------------------|---------------|----------|
| `Q0D22A` | Red Hat Enterprise Linux Server 2 Sockets 4 Guests 5yr Subscription 24x7 Support Flexible LTU | **DISCONTINUED** | 2026-09-11 | $10183.00 | None | STOPPED_AFTER_REMOVAL |
| `Q0D23A` | Red Hat Enterprise Linux Server 2 Sockets 4 Guests 5yr Subscription 9x5 Support Flexible LTU | **DISCONTINUED** | 2026-09-11 | $6264.00 | None | STOPPED_AFTER_REMOVAL |
| `Q5W20A` | Red Hat Enterprise Linux for SAP (Physical/Virtual Nodes) 3yr Subscription 24x7 Support Flex LTU | **DISCONTINUED** | 2026-09-11 | $4072.00 | None | STOPPED_AFTER_REMOVAL |
| `Q5W19A` | Red Hat Enterprise Linux for SAP (Physical/Virtual Nodes) 3yr Subscription 9x5 Support Flex LTU | **DISCONTINUED** | 2026-09-11 | $2505.00 | None | STOPPED_AFTER_REMOVAL |
| `Q5W22A` | Red Hat Enterprise Linux for SAP (Physical/Virtual Nodes) 5yr Subscription 24x7 Support Flex LTU | **DISCONTINUED** | 2026-09-11 | $6787.00 | None | STOPPED_AFTER_REMOVAL |
| `Q5W21A` | Red Hat Enterprise Linux for SAP (Physical/Virtual Nodes) 5yr Subscription 9x5 Support Flex LTU | **DISCONTINUED** | 2026-09-11 | $4175.00 | None | STOPPED_AFTER_REMOVAL |
| `Q8U19A` | Red Hat Enterprise Linux for SAP Solutions for Physical Nodes 3yr Subscription 24x7 Support LTU | **DISCONTINUED** | 2026-09-11 | $6737.00 | None | STOPPED_AFTER_REMOVAL |
| `Q8U21A` | Red Hat Enterprise Linux for SAP Solutions for Physical Nodes 3yr Subscription 9x5 Support LTU | **DISCONTINUED** | 2026-09-11 | $5483.00 | None | STOPPED_AFTER_REMOVAL |
| `Q8U20A` | Red Hat Enterprise Linux for SAP Solutions for Physical Nodes 5yr Subscription 24x7 Support LTU | **DISCONTINUED** | 2026-09-11 | $11229.00 | None | STOPPED_AFTER_REMOVAL |
| `Q8U22A` | Red Hat Enterprise Linux for SAP Solutions for Physical Nodes 5yr Subscription 9x5 Support LTU | **DISCONTINUED** | 2026-09-11 | $9139.00 | None | STOPPED_AFTER_REMOVAL |
| `Q8U15A` | Red Hat Enterprise Linux for SAP Solutions for Virtual DC 3yr Subscription 24x7 Support LTU | **DISCONTINUED** | 2026-09-11 | $24680.00 | None | STOPPED_AFTER_REMOVAL |
| `Q8U17A` | Red Hat Enterprise Linux for SAP Solutions for Virtual DC 3yr Subscription 9x5 Support LTU | **DISCONTINUED** | 2026-09-11 | $20325.00 | None | STOPPED_AFTER_REMOVAL |
| `Q8U16A` | Red Hat Enterprise Linux for SAP Solutions for Virtual DC 5yr Subscription 24x7 Support LTU | **DISCONTINUED** | 2026-09-11 | $41134.00 | None | STOPPED_AFTER_REMOVAL |
| `Q8U18A` | Red Hat Enterprise Linux for SAP Solutions for Virtual DC 5yr Subscription 9x5 Support LTU | **DISCONTINUED** | 2026-09-11 | $33874.00 | None | STOPPED_AFTER_REMOVAL |
| `Q5W24A` | Red Hat Enterprise Linux for SAP for Virtual Datacenters 3yr Subscription 24x7 Support Flex LTU | **DISCONTINUED** | 2026-09-11 | $14516.00 | None | STOPPED_AFTER_REMOVAL |
| `Q5W23A` | Red Hat Enterprise Linux for SAP for Virtual Datacenters 3yr Subscription 9x5 Support Flex LTU | **DISCONTINUED** | 2026-09-11 | $9072.00 | None | STOPPED_AFTER_REMOVAL |
| `Q5W26A` | Red Hat Enterprise Linux for SAP for Virtual Datacenters 5yr Subscription 24x7 Support Flex LTU | **DISCONTINUED** | 2026-09-11 | $24194.00 | None | STOPPED_AFTER_REMOVAL |
| `Q5W25A` | Red Hat Enterprise Linux for SAP for Virtual Datacenters 5yr Subscription 9x5 Support Flex LTU | **DISCONTINUED** | 2026-09-11 | $15119.00 | None | STOPPED_AFTER_REMOVAL |
| `Q0D26A` | Red Hat High Availability 2 Sockets Unlimited Guests 5yr Subscription Flexible LTU | **DISCONTINUED** | 2026-09-11 | $7532.00 | None | STOPPED_AFTER_REMOVAL |
| `Q0D25A` | Red Hat High Availability 2 Sockets or 2 Guests 5yr Subscription Flexible LTU | **DISCONTINUED** | 2026-09-11 | $2085.00 | None | STOPPED_AFTER_REMOVAL |
| `Q0D30A` | Red Hat Resilient Storage 2 Sockets Unlimited Guests 5yr Subscription Flexible LTU | **DISCONTINUED** | 2026-09-11 | $15095.00 | None | STOPPED_AFTER_REMOVAL |
| `Q0D29A` | Red Hat Resilient Storage 2 Sockets or 2 Guests 5yr Subscription Flexible LTU | **DISCONTINUED** | 2026-09-11 | $4395.00 | None | STOPPED_AFTER_REMOVAL |
| `N0U73A` | SUSE Linux Enterprise Server SAP 1-2 Sockets or 1-2 VM 3-year Subscription 24x7 Support Flexible LTU | **DISCONTINUED** | 2026-09-11 | $7803.00 | None | STOPPED_AFTER_REMOVAL |
| `N0U75A` | SUSE Linux Enterprise Server SAP 1-2 Sockets or 1-2 VM 5-year Subscription 24x7 Support Flexible LTU | **DISCONTINUED** | 2026-09-11 | $13005.00 | None | STOPPED_AFTER_REMOVAL |

### ⏳ Impending Obsolescence & Clearance Hardware (90-Day to 180-Day Window)

*These components remain orderable in live configurators today but have published vendor end dates. They represent high-value clearance opportunities for immediate deployments, but require explicit procurement cutoff remarks before quotation:*

| Product # | Description | Category | List Price (USD) | Discontinued Date | Price Trend | Presales Strategy Guidance |
|---|---|---|---:|---|:---:|---|
| `P77096-291` | Microsoft Windows Server 2025 16-core Standard FIO Pre-installed UEFI Japanese SW | Software & Licenses | $0 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77096-B21` | Microsoft Windows Server 2025 16-core Standard FIO Pre-installed UEFI en/fr/de/es/it/pt/nl SW | Software & Licenses | $1,147 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45879-B21` | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed English SW | Software & Licenses | $28 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45879-051` | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed French SW | Software & Licenses | $28 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45879-041` | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed German SW | Software & Licenses | $28 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45879-061` | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed Italian SW | Software & Licenses | $28 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45879-291` | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed Japanese SW | Software & Licenses | $99,999 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45879-071` | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed Spanish SW | Software & Licenses | $28 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45862-B21` | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed English SW | Software & Licenses | $28 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45862-051` | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed French SW | Software & Licenses | $28 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45862-041` | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed German SW | Software & Licenses | $20 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45862-061` | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed Italian SW | Software & Licenses | $28 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45862-291` | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed Japanese SW | Software & Licenses | $99,999 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45862-071` | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed Spanish SW | Software & Licenses | $28 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77125-291` | Microsoft Windows Server 2022 Downgrade Datacenter FIO Not Pre-installed Japanese SW | Software & Licenses | $0 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77125-B21` | Microsoft Windows Server 2022 Downgrade Datacenter FIO Not Pre-installed WW SW | Software & Licenses | $33 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77124-291` | Microsoft Windows Server 2022 Downgrade Standard FIO Not Pre-installed Japanese SW | Software & Licenses | $0 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77124-B21` | Microsoft Windows Server 2022 Downgrade Standard FIO Not Pre-installed WW SW | Software & Licenses | $33 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77102-291` | Microsoft Windows Server 2025 16-core Datacenter Reassignment Reseller Option Kit Japanese SW | Software & Licenses | $0 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77102-B21` | Microsoft Windows Server 2025 16-core Datacenter Reassignment Reseller Option Kit en/fr/de/es SW | Software & Licenses | $7,733 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77101-AA1` | Microsoft Windows Server 2025 16-core Datacenter Reseller Option Kit Chinese Simplified SW | Software & Licenses | $0 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77101-AB1` | Microsoft Windows Server 2025 16-core Datacenter Reseller Option Kit Chinese Traditional SW | Software & Licenses | $0 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77101-291` | Microsoft Windows Server 2025 16-core Datacenter Reseller Option Kit Japanese SW | Software & Licenses | $0 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77101-021` | Microsoft Windows Server 2025 16-core Datacenter Reseller Option Kit en/cs/pl/ru/sv SW | Software & Licenses | $5,712 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77101-A21` | Microsoft Windows Server 2025 16-core Datacenter Reseller Option Kit en/fr/de/es/it/pt/nl SW | Software & Licenses | $5,712 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
*... [31 additional impending EOL records omitted for brevity]*

## 📊 5b. Category-Level Trends & Significant Price Adjustments

### Category Portfolio Delta & Planning Intelligence

| Category | Total SKUs | Added | Modified | Unchanged | Clearance / Drops | Category Planning Insight |
|---|---:|---:|---:|---:|---:|---|
| **Chassis** | 1 | 0 | 1 | 0 | 0 | 🔄 Attributes/specifications updated (1 SKUs) |
| **OS Boot Device** | 1 | 0 | 1 | 0 | 0 | 🔄 Attributes/specifications updated (1 SKUs) |
| **PCIe Risers** | 4 | 0 | 4 | 0 | 0 | 🔄 Attributes/specifications updated (4 SKUs) |
| **Processor** | 20 | 0 | 20 | 0 | 0 | 🔄 Attributes/specifications updated (20 SKUs) |
| **Cooling / Thermal** | 2 | 0 | 2 | 0 | 0 | 🔄 Attributes/specifications updated (2 SKUs) |
| **Memory** | 14 | 0 | 14 | 0 | 0 | 🔄 Attributes/specifications updated (14 SKUs) |
| **Drive Enclosures / Drives** | 5 | 0 | 5 | 0 | 0 | 🔄 Attributes/specifications updated (5 SKUs) |
| **Accessories & Infrastructure** | 7 | 0 | 7 | 0 | 0 | 🔄 Attributes/specifications updated (7 SKUs) |
| **Software & Licenses** | 110 | 0 | 86 | 24 | 24 | ⚠️ Active price drops / clearance (24 SKUs discounted) |
| **Storage Controllers** | 9 | 0 | 9 | 0 | 0 | 🔄 Attributes/specifications updated (9 SKUs) |
| **Networking** | 3 | 0 | 3 | 0 | 0 | 🔄 Attributes/specifications updated (3 SKUs) |
| **Cables & Enablement Kits** | 2 | 0 | 2 | 0 | 0 | 🔄 Attributes/specifications updated (2 SKUs) |

### High-Impact Price Adjustments (Drops $\ge 10\%$ and Major Moves)

| Product # | Description | Category | Previous Price | Current Price | Delta (USD) | Change (%) | Movement Type |
|---|---|---|---:|---:|---:|---:|---|
| `Q8U16A` | [REMOVED SKU] Red Hat Enterprise Linux for SAP Solutions for Virtual DC 5yr Subscription 24x7 Support LTU | Software & Licenses | $41,134 | $41,134 | $-41,134 | **-100.0%** | 📉 CLEARANCE_DROP |
| `Q8U18A` | [REMOVED SKU] Red Hat Enterprise Linux for SAP Solutions for Virtual DC 5yr Subscription 9x5 Support LTU | Software & Licenses | $33,874 | $33,874 | $-33,874 | **-100.0%** | 📉 CLEARANCE_DROP |
| `Q8U15A` | [REMOVED SKU] Red Hat Enterprise Linux for SAP Solutions for Virtual DC 3yr Subscription 24x7 Support LTU | Software & Licenses | $24,680 | $24,680 | $-24,680 | **-100.0%** | 📉 CLEARANCE_DROP |
| `Q5W26A` | [REMOVED SKU] Red Hat Enterprise Linux for SAP for Virtual Datacenters 5yr Subscription 24x7 Support Flex LTU | Software & Licenses | $24,194 | $24,194 | $-24,194 | **-100.0%** | 📉 CLEARANCE_DROP |
| `Q8U17A` | [REMOVED SKU] Red Hat Enterprise Linux for SAP Solutions for Virtual DC 3yr Subscription 9x5 Support LTU | Software & Licenses | $20,325 | $20,325 | $-20,325 | **-100.0%** | 📉 CLEARANCE_DROP |
| `Q5W25A` | [REMOVED SKU] Red Hat Enterprise Linux for SAP for Virtual Datacenters 5yr Subscription 9x5 Support Flex LTU | Software & Licenses | $15,119 | $15,119 | $-15,119 | **-100.0%** | 📉 CLEARANCE_DROP |
| `Q0D30A` | [REMOVED SKU] Red Hat Resilient Storage 2 Sockets Unlimited Guests 5yr Subscription Flexible LTU | Software & Licenses | $15,095 | $15,095 | $-15,095 | **-100.0%** | 📉 CLEARANCE_DROP |
| `Q5W24A` | [REMOVED SKU] Red Hat Enterprise Linux for SAP for Virtual Datacenters 3yr Subscription 24x7 Support Flex LTU | Software & Licenses | $14,516 | $14,516 | $-14,516 | **-100.0%** | 📉 CLEARANCE_DROP |
| `N0U75A` | [REMOVED SKU] SUSE Linux Enterprise Server SAP 1-2 Sockets or 1-2 VM 5-year Subscription 24x7 Support Flexible LTU | Software & Licenses | $13,005 | $13,005 | $-13,005 | **-100.0%** | 📉 CLEARANCE_DROP |
| `Q8U20A` | [REMOVED SKU] Red Hat Enterprise Linux for SAP Solutions for Physical Nodes 5yr Subscription 24x7 Support LTU | Software & Licenses | $11,229 | $11,229 | $-11,229 | **-100.0%** | 📉 CLEARANCE_DROP |
| `Q0D22A` | [REMOVED SKU] Red Hat Enterprise Linux Server 2 Sockets 4 Guests 5yr Subscription 24x7 Support Flexible LTU | Software & Licenses | $10,183 | $10,183 | $-10,183 | **-100.0%** | 📉 CLEARANCE_DROP |
| `Q8U22A` | [REMOVED SKU] Red Hat Enterprise Linux for SAP Solutions for Physical Nodes 5yr Subscription 9x5 Support LTU | Software & Licenses | $9,139 | $9,139 | $-9,139 | **-100.0%** | 📉 CLEARANCE_DROP |
| `Q5W23A` | [REMOVED SKU] Red Hat Enterprise Linux for SAP for Virtual Datacenters 3yr Subscription 9x5 Support Flex LTU | Software & Licenses | $9,072 | $9,072 | $-9,072 | **-100.0%** | 📉 CLEARANCE_DROP |
| `N0U73A` | [REMOVED SKU] SUSE Linux Enterprise Server SAP 1-2 Sockets or 1-2 VM 3-year Subscription 24x7 Support Flexible LTU | Software & Licenses | $7,803 | $7,803 | $-7,803 | **-100.0%** | 📉 CLEARANCE_DROP |
| `Q0D26A` | [REMOVED SKU] Red Hat High Availability 2 Sockets Unlimited Guests 5yr Subscription Flexible LTU | Software & Licenses | $7,532 | $7,532 | $-7,532 | **-100.0%** | 📉 CLEARANCE_DROP |
| `Q5W22A` | [REMOVED SKU] Red Hat Enterprise Linux for SAP (Physical/Virtual Nodes) 5yr Subscription 24x7 Support Flex LTU | Software & Licenses | $6,787 | $6,787 | $-6,787 | **-100.0%** | 📉 CLEARANCE_DROP |
| `Q8U19A` | [REMOVED SKU] Red Hat Enterprise Linux for SAP Solutions for Physical Nodes 3yr Subscription 24x7 Support LTU | Software & Licenses | $6,737 | $6,737 | $-6,737 | **-100.0%** | 📉 CLEARANCE_DROP |
| `Q0D23A` | [REMOVED SKU] Red Hat Enterprise Linux Server 2 Sockets 4 Guests 5yr Subscription 9x5 Support Flexible LTU | Software & Licenses | $6,264 | $6,264 | $-6,264 | **-100.0%** | 📉 CLEARANCE_DROP |
| `Q8U21A` | [REMOVED SKU] Red Hat Enterprise Linux for SAP Solutions for Physical Nodes 3yr Subscription 9x5 Support LTU | Software & Licenses | $5,483 | $5,483 | $-5,483 | **-100.0%** | 📉 CLEARANCE_DROP |
| `Q0D29A` | [REMOVED SKU] Red Hat Resilient Storage 2 Sockets or 2 Guests 5yr Subscription Flexible LTU | Software & Licenses | $4,395 | $4,395 | $-4,395 | **-100.0%** | 📉 CLEARANCE_DROP |
*... [4 additional price movements omitted for brevity]*

## 🔄 5. Recent Attribute & Specification Modifications Log

| Timestamp | SKU | Attribute | Old Value | New Value |
|-----------|-----|-----------|-----------|-----------|
| 2026-09-11 | `469776-715` | Option Type | CTO | **Standard** |
| 2026-09-11 | `HA453A1-001` | Option Type | CTO | **Standard** |
| 2026-09-11 | `HA453A1-003` | Option Type | CTO | **Standard** |
| 2026-09-11 | `ZU706A` | Option Type | CTO | **Standard** |
| 2026-09-11 | `ZU721A` | Option Type | CTO | **Standard** |
| 2026-09-11 | `ZU723A` | Option Type | CTO | **Standard** |

## 🧩 6. Same-Product CTO Variant Matrix

| Chassis Identifier | Product Family | Generation | Form Factor | CTO Base SKU |
|--------------------|----------------|------------|-------------|--------------|
| **SY480_Gen12** | Synergy | Gen12 | Compute Module | `P68217-B21` |

## ⏱️ 10. Supply Chain & Delivery Lead Time Intelligence

### Confirmed Component Delivery SLAs

| Product # | Description | Category | Lead Time | Channel Status |
|---|---|---|---:|---|
| `P68217-B21` | HPE Synergy 480 Gen12 Configure-to-order Compute Module | Chassis | EDT 17 - 21 days | Available in OCA product catalog |

