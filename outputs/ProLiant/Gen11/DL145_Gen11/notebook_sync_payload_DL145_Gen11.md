# HPE DL145_Gen11 — Synchronized Catalog Knowledge

**Target Product**: `DL145_Gen11`

**Scope Identity**: `HPE/SERVER/ProLiant/Gen11/DL145_Gen11`

**Sync Timestamp**: 2026-10-28T09:48:45.393Z

**Total Verified SKUs**: `624` (`413` Hardware + `211` Services)

**Total Synced KnowledgeDeltas**: `13`

This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.

---

## 🚀 Executive Delta & Recent Change Summary

| Category | Total SKUs | Added (Last Scrape) | Price Changed | Attribute Changed | Reinstated | Status |
|----------|------------|---------------------|---------------|-------------------|------------|--------|
| **Hardware Components** | 413 | 56 | 0 | 39 | 0 | **CERTIFIED** |
| **Support Services & SLAs** | 211 | 0 | 0 | 0 | 0 | **CERTIFIED** |
| **Total Portfolio** | **624** | **56** | **0** | **39** | **0** | **ACTIVE** |

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

## 🏛️ 2. Family & Generation Rules (ProLiant Gen11)

*No verified family/generation rules are registered for this product.*

## 🎯 3. Chassis & Solution-Type Gotchas (DL145_Gen11)

1. **[DELTA_DL145_GEN11_AMD_EPYC_8004] DL145_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL145 Gen11 Edge Server`):
   - **Rule**: DL145 Gen11 is single-socket AMD EPYC 8004 only. No dual-socket configurations supported.
   - **Affected SKU**: `P71964-B21` | **Required Dependency**: `N/A`

2. **[DELTA_DL145_GEN11_4EDSFF_CAGE] DL145_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL145 Gen11 Edge Server`):
   - **Rule**: DL145 Gen11 uses EDSFF E3.S form factor drives only. Standard SFF/LFF drives are incompatible.
   - **Affected SKU**: `P71985-B21` | **Required Dependency**: `P77271-B21`

3. **[DELTA_DL145_GEN11_PSU_PROFILE] DL145_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL145 Gen11 Edge Server`):
   - **Rule**: DL145 Gen11 supports maximum 1000W PSUs. 1600W/2400W PSUs are physically incompatible.
   - **Affected SKU**: `P71964-B21` | **Required Dependency**: `P54290-B21`

4. **[DELTA_DL145_GEN11_EXTENDED_TEMP] DL145_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL145 Gen11 Edge Server`):
   - **Rule**: DL145 Gen11 edge deployments use P73021-B21 for extended -5C to 45C ambient temperature tracking.
   - **Affected SKU**: `P71964-B21` | **Required Dependency**: `P73021-B21`


## 🔒 3b. Physical & Architectural Gating Rules (DOM Unavailable Tables)

*No portal-conditional gating rules detected in default DOM state.*

## ⚠️ 4. Discontinued & Obsolete SKUs Registry

*No discontinued or reinstated SKUs detected for DL145_Gen11. All cataloged SKUs are active.*

### ⏳ Impending Obsolescence & Clearance Hardware (90-Day to 180-Day Window)

*These components remain orderable in live configurators today but have published vendor end dates. They represent high-value clearance opportunities for immediate deployments, but require explicit procurement cutoff remarks before quotation:*

| Product # | Description | Category | List Price (USD) | Discontinued Date | Price Trend | Presales Strategy Guidance |
|---|---|---|---:|---|:---:|---|
| `P61191-B21` | HPE 3.2TB NVMe Gen5 High Performance Mixed Use E3S EC1 EDSFF SPDM CM7 SSD | Drive Enclosures / Drives | $42,682 | 12/31/2026 | 0.00% | ⚠️ Approaching EOL (12/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P69237-B21` | HPE 3.84TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 CD8P SSD | Drive Enclosures / Drives | $30,682 | 11/30/2026 | 0.00% | ⚠️ Approaching EOL (11/30/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P61179-B21` | HPE 3.84TB NVMe Gen5 High Performance Read Intensive E3S EC1 EDSFF SPDM CM7 SSD | Drive Enclosures / Drives | $47,029 | 12/31/2026 | 0.00% | ⚠️ Approaching EOL (12/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P61183-B21` | HPE 7.68TB NVMe Gen5 High Performance Read Intensive E3S EC1 EDSFF SPDM CM7 SSD | Drive Enclosures / Drives | $75,784 | 12/31/2026 | 0.00% | ⚠️ Approaching EOL (12/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P63930-B21` | HPE 3.84TB NVMe Gen4 Mainstream Performance Very Read Optimized E3S EC1 EDSFF P5430 SSD | Drive Enclosures / Drives | $29,188 | 12/31/2026 | 0.00% | ⚠️ Approaching EOL (12/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P63934-B21` | HPE 7.68TB NVMe Gen4 Mainstream Performance Very Read Optimized E3S EC1 EDSFF P5430 SSD | Drive Enclosures / Drives | $49,219 | 12/31/2026 | 0.00% | ⚠️ Approaching EOL (12/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P69234-B21` | HPE 1.92TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 CD8P SSD | Drive Enclosures / Drives | $19,743 | 11/30/2026 | 0.00% | ⚠️ Approaching EOL (11/30/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P69239-B21` | HPE 7.68TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 CD8P SSD | Drive Enclosures / Drives | $44,109 | 11/30/2026 | 0.00% | ⚠️ Approaching EOL (11/30/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P61187-B21` | HPE 15.36TB NVMe Gen5 High Performance Read Intensive E3S EC1 EDSFF SPDM CM7 SSD | Drive Enclosures / Drives | $1,18,842 | 12/31/2026 | 0.00% | ⚠️ Approaching EOL (12/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P61195-B21` | HPE 6.4TB NVMe Gen5 High Performance Mixed Use E3S EC1 EDSFF SPDM CM7 SSD | Drive Enclosures / Drives | $60,093 | 12/31/2026 | 0.00% | ⚠️ Approaching EOL (12/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P63938-B21` | HPE 15.36TB NVMe Gen4 Mainstream Performance Very Read Optimized E3S EC1 EDSFF P5430 SSD | Drive Enclosures / Drives | $96,543 | 12/31/2026 | 0.00% | ⚠️ Approaching EOL (12/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P69241-B21` | HPE 1.6TB NVMe Gen5 Mainstream Performance Mixed Use E3S EC1 CD8P SSD | Drive Enclosures / Drives | $20,109 | 11/30/2026 | 0.00% | ⚠️ Approaching EOL (11/30/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P69243-B21` | HPE 3.2TB NVMe Gen5 Mainstream Performance Mixed Use E3S EC1 CD8P SSD | Drive Enclosures / Drives | $27,452 | 11/30/2026 | 0.00% | ⚠️ Approaching EOL (11/30/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P69245-B21` | HPE 6.4TB NVMe Gen5 Mainstream Performance Mixed Use E3S EC1 CD8P SSD | Drive Enclosures / Drives | $44,109 | 11/30/2026 | 0.00% | ⚠️ Approaching EOL (11/30/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P69546-B21` | HPE 15.36TB NVMe Gen5 Mainstream Performance Read Intensive E3S EC1 CD8P SSD | Drive Enclosures / Drives | $75,476 | 11/30/2026 | 0.00% | ⚠️ Approaching EOL (11/30/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P79065-B21` | HPE 30.72TB NVMe Gen4 Mainstream Performance Very Read Optimized E3S EC1 EDSFF P5430 SSD | Drive Enclosures / Drives | $1,80,169 | 12/31/2026 | 0.00% | ⚠️ Approaching EOL (12/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P79615-B21` | HPE 30.72TB NVMe Gen5 Mainstream Performance Very Read Optimized E3.S EC1 EDSFF 6550 SSD | Drive Enclosures / Drives | $1,40,919 | 12/31/2026 | 0.00% | ⚠️ Approaching EOL (12/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P79618-B21` | HPE 61.44TB NVMe Gen5 Mainstream Performance Very Read Optimized E3.S EC1 EDSFF 6550 SSD | Drive Enclosures / Drives | $2,84,757 | 12/31/2026 | 0.00% | ⚠️ Approaching EOL (12/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P79620-B21` | HPE 30.72TB NVMe Gen5 Mainstream Performance Very Read Optimized EC1 EDSFF Self-encrypting 6550 SSD | Drive Enclosures / Drives | $1,40,919 | 12/31/2026 | 0.00% | ⚠️ Approaching EOL (12/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P79623-B21` | HPE 61.44TB NVMe Gen5 Mainstream Performance Very Read Optimized EC1 EDSFF Self-encrypting 6550 SSD | Drive Enclosures / Drives | $2,55,131 | 12/31/2026 | 0.00% | ⚠️ Approaching EOL (12/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `R8V76A` | SUSE Linux Enterprise Server 1-2 Sockets Unlimited VM w/Live Patching 1-year 24x7 Flexible LTU | Software & Licenses | $0 | 01/04/2027 | 0.00% | ⚠️ Approaching EOL (01/04/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `R8V74A` | SUSE Linux Enterprise Server 1-2 Sockets Unlimited VM w/Live Patching 1-year 9x5 Flexible LTU | Software & Licenses | $0 | 01/04/2027 | 0.00% | ⚠️ Approaching EOL (01/04/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `R8V77A` | SUSE Linux Enterprise Server 1-2 Sockets Unlimited VM w/Live Patching 3-year 24x7 Flexible LTU | Software & Licenses | $0 | 01/04/2027 | 0.00% | ⚠️ Approaching EOL (01/04/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `R8V75A` | SUSE Linux Enterprise Server 1-2 Sockets Unlimited VM w/Live Patching 3-year 9x5 Flexible LTU | Software & Licenses | $0 | 01/04/2027 | 0.00% | ⚠️ Approaching EOL (01/04/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `R8V78A` | SUSE Linux Enterprise Server 1-2 Sockets Unlimited VM w/Live Patching 5-year 24x7 Flexible LTU | Software & Licenses | $0 | 01/04/2027 | 0.00% | ⚠️ Approaching EOL (01/04/2027). Valid for immediate builds; verify multi-year roadmaps. |
*... [46 additional impending EOL records omitted for brevity]*

## 📊 5b. Category-Level Trends & Significant Price Adjustments

### Category Portfolio Delta & Planning Intelligence

| Category | Total SKUs | Added | Modified | Unchanged | Clearance / Drops | Category Planning Insight |
|---|---:|---:|---:|---:|---:|---|
| **Chassis** | 1 | 0 | 1 | 0 | 0 | 🔄 Attributes/specifications updated (1 SKUs) |
| **Accessories & Infrastructure** | 10 | 0 | 10 | 0 | 0 | 🔄 Attributes/specifications updated (10 SKUs) |
| **Processor** | 19 | 0 | 19 | 0 | 0 | 🔄 Attributes/specifications updated (19 SKUs) |
| **Cooling / Thermal** | 2 | 0 | 2 | 0 | 0 | 🔄 Attributes/specifications updated (2 SKUs) |
| **Memory** | 20 | 0 | 20 | 0 | 0 | 🔄 Attributes/specifications updated (20 SKUs) |
| **Storage Controllers** | 13 | 0 | 13 | 0 | 0 | 🔄 Attributes/specifications updated (13 SKUs) |
| **Cables & Enablement Kits** | 31 | 1 | 30 | 0 | 0 | ✨ Portfolio expanding (+1 new options) |
| **Drive Enclosures / Drives** | 108 | 0 | 108 | 0 | 0 | 🔄 Attributes/specifications updated (108 SKUs) |
| **Factory Configuration Settings** | 1 | 0 | 1 | 0 | 0 | 🔄 Attributes/specifications updated (1 SKUs) |
| **Software & Licenses** | 175 | 51 | 124 | 0 | 0 | ✨ Portfolio expanding (+51 new options) |
| **PCIe Risers** | 2 | 0 | 2 | 0 | 0 | 🔄 Attributes/specifications updated (2 SKUs) |
| **Networking** | 22 | 0 | 22 | 0 | 0 | 🔄 Attributes/specifications updated (22 SKUs) |
| **Graphics & GPU** | 5 | 3 | 2 | 0 | 0 | ✨ Portfolio expanding (+3 new options) |
| **Power Supplies** | 3 | 0 | 3 | 0 | 0 | 🔄 Attributes/specifications updated (3 SKUs) |
| **HPE Compute Ops Management** | 1 | 1 | 0 | 0 | 0 | ✨ Portfolio expanding (+1 new options) |

## 🔄 5. Recent Attribute & Specification Modifications Log

| Timestamp | SKU | Attribute | Old Value | New Value |
|-----------|-----|-----------|-----------|-----------|
| 2026-09-13 | `P46171-AA1` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P46171-AB1` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P46171-371` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P46171-021` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P46171-A21` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P77103-AA1` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P77103-AB1` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P77103-291` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P77103-021` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P77103-A21` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P77103-371` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P77102-291` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P77102-B21` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P77101-AA1` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P77101-AB1` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P77101-291` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P77101-021` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P77101-A21` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P77101-371` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P77100-AA1` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P77100-AB1` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P77100-291` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P77100-021` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P77100-A21` | Component Role |  | **Operating System / License** |
| 2026-09-13 | `P77100-371` | Component Role |  | **Operating System / License** |

## 🧩 6. Same-Product CTO Variant Matrix

| Chassis Identifier | Product Family | Generation | Form Factor | CTO Base SKU |
|--------------------|----------------|------------|-------------|--------------|
| **DL145_Gen11** | ProLiant | Gen11 | 4EDSFF | `P71964-B21` |

## ⏱️ 10. Supply Chain & Delivery Lead Time Intelligence

### Confirmed Component Delivery SLAs

| Product # | Description | Category | Lead Time | Channel Status |
|---|---|---|---:|---|
| `P71964-B21` | HPE ProLiant DL145 Gen11 Configure-to-order Server | Chassis | EDT 22 - 28 days | Available in OCA product catalog |

