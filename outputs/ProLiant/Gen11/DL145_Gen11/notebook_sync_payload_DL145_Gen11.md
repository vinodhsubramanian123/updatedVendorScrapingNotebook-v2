# HPE DL145_Gen11 — Synchronized Catalog Knowledge

**Target Product**: `DL145_Gen11`

**Scope Identity**: `HPE/SERVER/ProLiant/Gen11/DL145_Gen11`

**Sync Timestamp**: 2026-09-23T19:28:54.795Z

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


## ⚠️ 4. Discontinued & Obsolete SKUs Registry

*No discontinued or reinstated SKUs detected for DL145_Gen11. All cataloged SKUs are active.*

## 🔄 5. Recent Attribute & Specification Modifications Log

| Timestamp | SKU | Attribute | Old Value | New Value |
|-----------|-----|-----------|-----------|-----------|
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

