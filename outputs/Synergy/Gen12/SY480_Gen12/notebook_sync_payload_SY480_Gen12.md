# HPE SY480_Gen12 — Synchronized Catalog Knowledge

**Target Product**: `SY480_Gen12`

**Scope Identity**: `HPE/SERVER/Synergy/Gen12/SY480_Gen12`

**Sync Timestamp**: 2026-09-19T14:58:43.514Z

**Total Verified SKUs**: `557` (`154` Hardware + `403` Services)

**Total Synced KnowledgeDeltas**: `12`

This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.

---

## 🚀 Executive Delta & Recent Change Summary

| Category | Total SKUs | Added (Last Scrape) | Price Changed | Attribute Changed | Reinstated | Status |
|----------|------------|---------------------|---------------|-------------------|------------|--------|
| **Hardware Components** | 154 | 0 | 0 | 6 | 0 | **CERTIFIED** |
| **Support Services & SLAs** | 403 | 0 | 0 | 0 | 0 | **CERTIFIED** |
| **Total Portfolio** | **557** | **0** | **0** | **6** | **0** | **ACTIVE** |

## 🌐 1. Universal Vendor Rules (HPE)

1. **[DELTA_UNIVERSAL_MULTI_ICON_ERROR_ATTRIBUTION]**: When Rule 81039677 occurs on multi-icon tenders, trace errors to individual child icon containers instead of modifying the root BOM item. *(Type: PORTAL_VALIDATION_ATTRIBUTION)*
2. **[DELTA_UNIVERSAL_SUPPORT_TIER_ISOLATION]**: Configure support services independently per icon container. Never broadcast support attributes across diverse product families. *(Type: CROSS_CHASSIS_SUPPORT_POLLUTION)*
3. **[DELTA_UNIVERSAL_OCA_SUPPORT_CACHE_FLUSH]**: Flush corrupted OCA support session state by toggling to 'No Support' before reapplying 3Y Tech Care Basic. *(Type: PORTAL_CACHE_STALENESS)*

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


## ⚠️ 4. Discontinued & Obsolete SKUs Registry

| SKU | Description | Status | Discontinued Date | Last Known Price | Tracking | Retention |
|-----|-------------|--------|-------------------|------------------|----------|-----------|
| `Q0D22A` | Red Hat Enterprise Linux Server 2 Sockets 4 Guests 5yr Subscription 24x7 Support Flexible LTU | **DISCONTINUED** | 2026-09-11 | $10183.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `Q0D23A` | Red Hat Enterprise Linux Server 2 Sockets 4 Guests 5yr Subscription 9x5 Support Flexible LTU | **DISCONTINUED** | 2026-09-11 | $6264.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `Q5W20A` | Red Hat Enterprise Linux for SAP (Physical/Virtual Nodes) 3yr Subscription 24x7 Support Flex LTU | **DISCONTINUED** | 2026-09-11 | $4072.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `Q5W19A` | Red Hat Enterprise Linux for SAP (Physical/Virtual Nodes) 3yr Subscription 9x5 Support Flex LTU | **DISCONTINUED** | 2026-09-11 | $2505.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `Q5W22A` | Red Hat Enterprise Linux for SAP (Physical/Virtual Nodes) 5yr Subscription 24x7 Support Flex LTU | **DISCONTINUED** | 2026-09-11 | $6787.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `Q5W21A` | Red Hat Enterprise Linux for SAP (Physical/Virtual Nodes) 5yr Subscription 9x5 Support Flex LTU | **DISCONTINUED** | 2026-09-11 | $4175.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `Q8U19A` | Red Hat Enterprise Linux for SAP Solutions for Physical Nodes 3yr Subscription 24x7 Support LTU | **DISCONTINUED** | 2026-09-11 | $6737.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `Q8U21A` | Red Hat Enterprise Linux for SAP Solutions for Physical Nodes 3yr Subscription 9x5 Support LTU | **DISCONTINUED** | 2026-09-11 | $5483.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `Q8U20A` | Red Hat Enterprise Linux for SAP Solutions for Physical Nodes 5yr Subscription 24x7 Support LTU | **DISCONTINUED** | 2026-09-11 | $11229.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `Q8U22A` | Red Hat Enterprise Linux for SAP Solutions for Physical Nodes 5yr Subscription 9x5 Support LTU | **DISCONTINUED** | 2026-09-11 | $9139.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `Q8U15A` | Red Hat Enterprise Linux for SAP Solutions for Virtual DC 3yr Subscription 24x7 Support LTU | **DISCONTINUED** | 2026-09-11 | $24680.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `Q8U17A` | Red Hat Enterprise Linux for SAP Solutions for Virtual DC 3yr Subscription 9x5 Support LTU | **DISCONTINUED** | 2026-09-11 | $20325.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `Q8U16A` | Red Hat Enterprise Linux for SAP Solutions for Virtual DC 5yr Subscription 24x7 Support LTU | **DISCONTINUED** | 2026-09-11 | $41134.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `Q8U18A` | Red Hat Enterprise Linux for SAP Solutions for Virtual DC 5yr Subscription 9x5 Support LTU | **DISCONTINUED** | 2026-09-11 | $33874.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `Q5W24A` | Red Hat Enterprise Linux for SAP for Virtual Datacenters 3yr Subscription 24x7 Support Flex LTU | **DISCONTINUED** | 2026-09-11 | $14516.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `Q5W23A` | Red Hat Enterprise Linux for SAP for Virtual Datacenters 3yr Subscription 9x5 Support Flex LTU | **DISCONTINUED** | 2026-09-11 | $9072.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `Q5W26A` | Red Hat Enterprise Linux for SAP for Virtual Datacenters 5yr Subscription 24x7 Support Flex LTU | **DISCONTINUED** | 2026-09-11 | $24194.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `Q5W25A` | Red Hat Enterprise Linux for SAP for Virtual Datacenters 5yr Subscription 9x5 Support Flex LTU | **DISCONTINUED** | 2026-09-11 | $15119.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `Q0D26A` | Red Hat High Availability 2 Sockets Unlimited Guests 5yr Subscription Flexible LTU | **DISCONTINUED** | 2026-09-11 | $7532.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `Q0D25A` | Red Hat High Availability 2 Sockets or 2 Guests 5yr Subscription Flexible LTU | **DISCONTINUED** | 2026-09-11 | $2085.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `Q0D30A` | Red Hat Resilient Storage 2 Sockets Unlimited Guests 5yr Subscription Flexible LTU | **DISCONTINUED** | 2026-09-11 | $15095.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `Q0D29A` | Red Hat Resilient Storage 2 Sockets or 2 Guests 5yr Subscription Flexible LTU | **DISCONTINUED** | 2026-09-11 | $4395.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `N0U73A` | SUSE Linux Enterprise Server SAP 1-2 Sockets or 1-2 VM 3-year Subscription 24x7 Support Flexible LTU | **DISCONTINUED** | 2026-09-11 | $7803.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |
| `N0U75A` | SUSE Linux Enterprise Server SAP 1-2 Sockets or 1-2 VM 5-year Subscription 24x7 Support Flexible LTU | **DISCONTINUED** | 2026-09-11 | $13005.00 | STOPPED_AFTER_REMOVAL | COMPACT_LIFECYCLE_TOMBSTONE |

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
| SY480_Gen12 | Synergy | Gen12 | N/A | `N/A` |

