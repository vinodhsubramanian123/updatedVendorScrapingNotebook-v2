# HPE DL380a_Gen12 — Synchronized Catalog Knowledge

**Target Product**: `DL380a_Gen12`

**Scope Identity**: `HPE/SERVER/ProLiant/Gen12/DL380a_Gen12`

**Sync Timestamp**: 2026-09-23T19:29:05.266Z

**Total Verified SKUs**: `662` (`450` Hardware + `212` Services)

**Total Synced KnowledgeDeltas**: `17`

This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.

---

## 🚀 Executive Delta & Recent Change Summary

| Category | Total SKUs | Added (Last Scrape) | Price Changed | Attribute Changed | Reinstated | Status |
|----------|------------|---------------------|---------------|-------------------|------------|--------|
| **Hardware Components** | 450 | 91 | 0 | 0 | 0 | **CERTIFIED** |
| **Support Services & SLAs** | 212 | 0 | 0 | 0 | 0 | **CERTIFIED** |
| **Total Portfolio** | **662** | **91** | **0** | **0** | **0** | **ACTIVE** |

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


## ⚠️ 4. Discontinued & Obsolete SKUs Registry

| SKU | Description | Status | Discontinued Date | Last Known Price | Tracking | Retention |
|-----|-------------|--------|-------------------|------------------|----------|-----------|
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

## 🔄 5. Recent Attribute & Specification Modifications Log

| Timestamp | SKU | Attribute | Old Value | New Value |
|-----------|-----|-----------|-----------|-----------|
| 2026-09-09 | `P76706-B21` | Discontinued Date | 02/29/2028 | **2026-09-09** |
| 2026-09-10 | `P76706-B21` | Lead Time Source | OCA configuration estimate | **OCA selected configuration estimate** |

## 🧩 6. Same-Product CTO Variant Matrix

| Chassis Identifier | Product Family | Generation | Form Factor | CTO Base SKU |
|--------------------|----------------|------------|-------------|--------------|
| **DL380a_Gen12** | ProLiant | Gen12 | 8DW/16SW | `P76706-B21` |

