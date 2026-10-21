# HPE DL385_Gen11 — Synchronized Catalog Knowledge

**Target Product**: `DL385_Gen11`

**Scope Identity**: `HPE/SERVER/ProLiant/Gen11/DL385_Gen11`

**Sync Timestamp**: 2026-10-21T16:07:27.773Z

**Total Verified SKUs**: `1401` (`667` Hardware + `734` Services)

**Total Synced KnowledgeDeltas**: `13`

This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.

---

## 🚀 Executive Delta & Recent Change Summary

| Category | Total SKUs | Added (Last Scrape) | Price Changed | Attribute Changed | Reinstated | Status |
|----------|------------|---------------------|---------------|-------------------|------------|--------|
| **Hardware Components** | 667 | 0 | 0 | 0 | 0 | **CERTIFIED** |
| **Support Services & SLAs** | 734 | 0 | 0 | 0 | 0 | **CERTIFIED** |
| **Total Portfolio** | **1401** | **0** | **0** | **0** | **0** | **ACTIVE** |

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

## 🎯 3. Chassis & Solution-Type Gotchas (DL385_Gen11)

1. **[DELTA-DL385-GEN11-COM-MANDATE-81322276] DL385_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL385_Gen11 CTO Server`):
   - **Rule**: All compatible NPI CTO base models for Gen11 DL and ML platforms (such as DL385 Gen11 P53921-B21) strictly mandate at least 1 Compute Ops Management (COM) license to be quoted. Base SKU is R7A11AAE (HPE COM Standard 3-year Upfront ProLiant SaaS, $450.00 USD). Submitting without triggers CLIC Rule 81322276 PROCESS CONTROL CONFIGURATION: OVERRIDE REQUIRES APPROVAL and blocks quote export.
   - **Affected SKU**: `P53921-B21` | **Required Dependency**: `R7A11AAE`

2. **[DELTA-DL385-GEN11-FAN-GRANULARITY-INV183] DL385_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL385_Gen11 CTO Server`):
   - **Rule**: On AMD DL3X5 Gen11 platforms, Standard Fan Kit (P58464-B21, $157) is ordered as individual fan modules (4 for 1P = $628, 6 for 2P = $942). In contrast, Performance Fan Kit (P58465-B21, $160) is packaged as a complete chassis kit (max 1 per server = $160 total). OCA enforces mutual exclusion between Standard and Performance fan kits (RULE_25/TEXT_63). In standard 8SFF with Performance Heatsinks (P58459-B21) and Air Baffle (P57886-B21), OCA accepts 6x P58464-B21. However, P58465-B21 (Performance Fan Kit, Qty 1) is the recommended presales best practice whenever customer drive types (BYOD NVMe SSDs) or drive cage expansions are unspecified, providing superior CFM airflow, static pressure, and thermal headroom at lower total list price ($160 vs $942 in OCA).
   - **Affected SKU**: `P58464-B21` | **Required Dependency**: `P58465-B21`

3. **[DELTA-DL385-GEN11-AIR-BAFFLE-MANDATE] DL385_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL385_Gen11 CTO Server`):
   - **Rule**: P57886-B21 (HPE ProLiant DL385 Gen11 2U Standard/Performance FIO Air Baffle Kit, $41.00 USD, Qty 1) is physically and logically mandatory for all air-cooled CTO builds to seal the compartment over CPU heatsinks and memory DIMMs. Directs cooling airflow from fan cage across processors; omitting it causes thermal throttling and CLIC buildability rejection.
   - **Affected SKU**: `P53921-B21` | **Required Dependency**: `P57886-B21`

4. **[DELTA_DL385_GEN11_L3_CACHE_TRADE_OFF_STRATEGY] DL385_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL385_Gen11 CTO Server`):
   - **Rule**: When modernizing AMD EPYC 7543 (32c, 2.8GHz, 256MB L3, 225W), EPYC 9334 (32c, 2.7GHz, 128MB L3, 210W, ,170 USD) saves CapEx but halves L3 cache from 256MB to 128MB due to 4-CCD topology. For memory-latency and database workloads, EPYC 9354 (32c, 3.25GHz, 256MB L3, 280W, ,861 USD) restores full 256MB L3 cache and exceeds base clock (+0.45GHz) for +,820 USD list price across 10 servers. Chassis cooling (60x P58465-B21 performance fans + 20x P58459-B21 performance heatsinks) is already 100% qualified for 280W. Dual-track options must be presented to facilitate commercial negotiations (INV-184).
   - **Affected SKU**: `P53712-B21` | **Required Dependency**: `P53701-B21`


## 🔒 3b. Physical & Architectural Gating Rules (DOM Unavailable Tables)

### Memory Technology & Density Mixing Constraints

1. **[Memory]**: Mixing of x4 and x8 memory is not allowed
   - **Gated Rule Type**: `MEMORY_MIXING`
   - **Affected SKUs (3)**: `P50311-F21`, `P50309-F21`, `P50310-B21`

2. **[Memory]**: 3DS memory and non 3DS memory cannot be mixed
   - **Gated Rule Type**: `MEMORY_MIXING`
   - **Affected SKUs (2)**: `P50314-F21`, `P90552-F21`

3. **[Memory]**: 96GB memory cannot be mixed with any other memory
   - **Gated Rule Type**: `MEMORY_MIXING`
   - **Affected SKUs (1)**: `P66676-F21`

### Base Chassis & Form Factor Compatibility Gates

1. **[Storage Devices]**: This Cable is supported with LFF CTO Server Only.
   - **Gated Rule Type**: `CHASSIS_GATE`
   - **Affected SKUs (1)**: `P57870-B21`

2. **[Storage Devices]**: Supported only EDSFF server only
   - **Gated Rule Type**: `CHASSIS_GATE`
   - **Affected SKUs (1)**: `P57877-B21`

3. **[Storage Devices]**: This EDSFF Drive cage bundle kit can be selected only with EDSFF CTO Server.
   - **Gated Rule Type**: `CHASSIS_GATE`
   - **Affected SKUs (1)**: `P57878-B21`

### Mandatory Paired Enablement Kits & Interconnects

1. **[Power and Cooling]**: HPE 1600W -48VDC Pwr Cbl Lug Kit(P36877-B21) Supported only with HPE 1600W FS -48VDC Ht Plg PS Kit (P17023-B21).
   - **Gated Rule Type**: `PAIRED_KIT_REQUIRED`
   - **Affected SKUs (1)**: `P36877-B21`

### Component Mutual Exclusion Rules

1. **[Processor]**: Only one type of heat sink kit can be selected from Standard, Performance and Maximum Performance Heat sink kits.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (2)**: `P58459-B21`, `P58460-B21`

2. **[Processor]**: WM DLC Module can be selected only with LFF CTO Server
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `P62032-B21`

3. **[Memory]**: 9xx4 Processor supports only PC5-4800B Memory.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (5)**: `P64986-F21`, `P64985-F21`, `P64987-F21`, `P64988-F21`, `P73446-F21`

4. **[Storage Devices]**: Private Product is not valid for current customer account
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `P73471-B21`

5. **[Storage Devices]**: This drive cage can be selected only with 8LFF model
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (4)**: `P55085-B21`, `P55088-B21`, `P55089-B21`, `P55093-B21`

6. **[OS Boot Device]**: HPE DL3X5 G11 NS204i-u NVMe Boot Cbl Kit can be selected only with 8LFF CTO Server
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `P57013-B21`

7. **[OS Boot Device]**: Private Product is not valid for current customer account
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `P61852-B21`

8. **[Graphics Options]**: Doublewide GPU can be selected only with GPU CTO Server
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (3)**: `S6W30C`, `S6W21C`, `S8A40C`

9. **[Graphics Options]**: This GPU option can be selected only with GPU CTO Server
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (7)**: `P73574-B21`, `P80743-B21`, `P85893-B21`, `P94841-B21`, `P82106-B21`, `P82523-B21`, `S4A90C`

10. **[Riser Cards]**: Cannot be selected with SFF CTO Server
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (3)**: `P55098-B21`, `P57892-B21`, `P59260-B21`

11. **[Networking]**: Max quantity of product limited by space available.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `P66386-H21`

12. **[Networking]**: Private Product is not valid for current customer account
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (3)**: `P66104-B21`, `30 P71815-B21`, `P80855-B21`

13. **[Networking]**: Private Product is not valid for current customer account
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `30 P71812-B21`

14. **[Networking]**: Private Product is not valid for current customer account
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `S3K57A`

15. **[Power and Cooling]**: Maximum 1 quantity can be ordered per base model.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `P57887-B21`

16. **[Power and Cooling]**: One Fan kit can be selected from below Fan Kits DL3X5 Gen11 2U Stnd Fan Kit DL3X5 Gen11 2U Perf Fan Kit DL385 Gen11 2U Max Perf Fan Kit
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `P58465-B21`

17. **[Power and Cooling]**: Mixing of different Power supply SKU is not allowed.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (4)**: `P38995-B21`, `P38997-B21`, `P44712-B21`, `P17023-B21`

18. **[Virtualization]**: Private Product is not valid for current customer account
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (12)**: `S4F93AAE`, `S4F95AAE`, `S4F99AAE`, `S4G01AAE`, `S4R66AAE`, `S4R67AAE`, `S4R68AAE`, `S4R69AAE`, `S4R70AAE`, `S4R71AAE`, `S4R75AAE`, `S4R77AAE`

19. **[Virtualization]**: Private Product is not valid for current customer account
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (3)**: `S4R76AAE`, `S4F94AAE`, `S4G00AAE`

20. **[Virtualization]**: Private Product is not valid for current customer account
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (6)**: `S4R78AAE`, `S4F96AAE`, `S4G02AAE`, `S4R79AAE`, `S4F97AAE`, `S4G03AAE`

21. **[3PO]**: Private Product is not valid for current customer account
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `R6Q42A`

22. **[Private Cloud Business Edition]**: Not Supported ProStack Server Software
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (7)**: `S1T84A`, `S1T85A`, `S3V79A`, `S3V80A`, `S3V87A`, `S4V16A`, `S6F19A`

### CTO vs BTO Factory Integration Rules

1. **[Memory]**: BTO products are not allowed in CTO Base Model.
   - **Gated Rule Type**: `BTO_DISALLOWED`
   - **Affected SKUs (1)**: `P07818-B21`

2. **[Storage Devices]**: BTO products are not allowed in CTO Base Model.
   - **Gated Rule Type**: `BTO_DISALLOWED`
   - **Affected SKUs (1)**: `701498-B21`

3. **[Accessories]**: BTO products are not allowed in CTO Base Model.
   - **Gated Rule Type**: `BTO_DISALLOWED`
   - **Affected SKUs (6)**: `631341-B21`, `631344-B21`, `631346-B21`, `631358-B21`, `631360-B21`, `672097-B33`

4. **[Power and Cooling]**: BTO products are not allowed in CTO Base Model.
   - **Gated Rule Type**: `BTO_DISALLOWED`
   - **Affected SKUs (1)**: `A0K02A`

## ⚠️ 4. Discontinued & Obsolete SKUs Registry

*No discontinued or reinstated SKUs detected for DL385_Gen11. All cataloged SKUs are active.*

### ⏳ Impending Obsolescence & Clearance Hardware (90-Day to 180-Day Window)

*These components remain orderable in live configurators today but have published vendor end dates. They represent high-value clearance opportunities for immediate deployments, but require explicit procurement cutoff remarks before quotation:*

| Product # | Description | Category | List Price (USD) | Discontinued Date | Price Trend | Presales Strategy Guidance |
|---|---|---|---:|---|:---:|---|
| `P53698-B21` | AMD EPYC 9174F 4.1GHz 16-core 320W Processor for HPE | Processor | $7,345 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P53700-B21` | AMD EPYC 9554 3.1GHz 64-core 360W Processor for HPE | Processor | $21,729 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P53708-B21` | AMD EPYC 9454 2.75GHz 48-core 290W Processor for HPE | Processor | $12,832 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P53711-B21` | AMD EPYC 9274F 4.05GHz 24-core 320W Processor for HPE | Processor | $8,102 | 11/30/2026 | 0.00% | ⚠️ Approaching EOL (11/30/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P63491-B21` | AMD EPYC 9184X 3.55GHz 16-core 320W Processor for HPE | Processor | $12,936 | 11/30/2026 | 0.00% | ⚠️ Approaching EOL (11/30/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P63493-B21` | AMD EPYC 9684X 2.55GHz 96-core 400W Processor for HPE | Processor | $31,495 | 11/30/2026 | 0.00% | ⚠️ Approaching EOL (11/30/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P53707-B21` | AMD EPYC 9254 2.9GHz 24-core 200W Processor for HPE | Processor | $5,312 | 11/30/2026 | 0.00% | ⚠️ Approaching EOL (11/30/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P53710-B21` | AMD EPYC 9374F 3.85GHz 32-core 320W Processor for HPE | Processor | $9,797 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P60463-B21` | AMD EPYC 9754 2.25GHz 128-core 360W Processor for HPE | Processor | $26,016 | 11/30/2026 | 0.00% | ⚠️ Approaching EOL (11/30/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P63492-B21` | AMD EPYC 9384X 3.1GHz 32-core 320W Processor for HPE | Processor | $14,514 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `R8M41A` | NVIDIA Ethernet 100Gb 2-port NVMe-oF Offload Adapter for HPE | Networking | $3,999 | 02/28/2027 | 0.00% | ⚠️ Approaching EOL (02/28/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77095-291` | Microsoft Windows Server 2025 16-core Standard FIO Not Pre-installed Japanese SW | Software & Licenses | $0 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77095-B21` | Microsoft Windows Server 2025 16-core Standard FIO Not Pre-installed en/fr/de/es/it/pt/nl SW | Software & Licenses | $1,147 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77097-291` | Microsoft Windows Server 2025 16-core Datacenter FIO Not Pre-installed Japanese SW | Software & Licenses | $0 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77097-B21` | Microsoft Windows Server 2025 16-core Datacenter FIO Not Pre-installed en/fr/de/es/it/pt/nl SW | Software & Licenses | $5,712 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77096-291` | Microsoft Windows Server 2025 16-core Standard FIO Pre-installed UEFI Japanese SW | Software & Licenses | $0 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77096-B21` | Microsoft Windows Server 2025 16-core Standard FIO Pre-installed UEFI en/fr/de/es/it/pt/nl SW | Software & Licenses | $1,147 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45879-B21` | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed English SW | Software & Licenses | $28 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45879-051` | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed French SW | Software & Licenses | $28 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45879-041` | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed German SW | Software & Licenses | $20 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45879-061` | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed Italian SW | Software & Licenses | $20 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45879-291` | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed Japanese SW | Software & Licenses | $99,999 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45879-071` | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed Spanish SW | Software & Licenses | $28 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45862-B21` | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed English SW | Software & Licenses | $20 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45862-051` | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed French SW | Software & Licenses | $28 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
*... [23 additional impending EOL records omitted for brevity]*

## 📊 5b. Category-Level Trends & Significant Price Adjustments

### Category Portfolio Delta & Planning Intelligence

| Category | Total SKUs | Added | Modified | Unchanged | Clearance / Drops | Category Planning Insight |
|---|---:|---:|---:|---:|---:|---|
| **Chassis** | 5 | 0 | 0 | 5 | 0 | Stable portfolio |
| **Accessories & Infrastructure** | 31 | 0 | 0 | 31 | 0 | Stable portfolio |
| **Processor** | 48 | 0 | 0 | 48 | 0 | Stable portfolio |
| **Cooling / Thermal** | 10 | 0 | 0 | 10 | 0 | Stable portfolio |
| **OS Boot Device** | 2 | 0 | 0 | 2 | 0 | Stable portfolio |
| **Memory** | 13 | 0 | 0 | 13 | 0 | Stable portfolio |
| **Cables & Enablement Kits** | 34 | 0 | 0 | 34 | 0 | Stable portfolio |
| **Drive Enclosures / Drives** | 21 | 0 | 0 | 21 | 0 | Stable portfolio |
| **Software & Licenses** | 384 | 0 | 0 | 384 | 0 | Stable portfolio |
| **Storage Controllers** | 31 | 0 | 0 | 31 | 0 | Stable portfolio |
| **Graphics & GPU** | 4 | 0 | 0 | 4 | 0 | Stable portfolio |
| **PCIe Risers** | 7 | 0 | 0 | 7 | 0 | Stable portfolio |
| **Networking** | 71 | 0 | 0 | 71 | 0 | Stable portfolio |
| **Power Supplies** | 5 | 0 | 0 | 5 | 0 | Stable portfolio |
| **Support Services** | 1 | 0 | 0 | 1 | 0 | Stable portfolio |

## 🔄 5. Recent Attribute & Specification Modifications Log

*No attribute or specification changes recorded across catalog snapshots.*

## 🧩 6. Same-Product CTO Variant Matrix

| Chassis Identifier | Product Family | Generation | Form Factor | CTO Base SKU |
|--------------------|----------------|------------|-------------|--------------|
| **DL385_Gen11** | ProLiant | Gen11 | 8SFF | `P53921-B21` |

## ⭐ 8. Vendor Recommended & Preferred Hardware Options

| Product # | Description | Category | Recommendation Badge | List Price (USD) | Lead Time |
|---|---|---|:---:|---:|---|
| `P03178-B21` | HPE 1000W Flex Slot Titanium Hot Plug Power Supply Kit | Power Supplies | **Recommended** | $926 | Unpublished |

## 📦 9. Solution Manifest, EDT & Commercial Baseline

**Configuration Profile**: `OCA Config 2` | **Icon ID**: `I157487292-01` | **Estimated Delivery Time (EDT)**: `24 - 30 days`

| Hardware (USD) | Support (USD) | Services (USD) | Software (USD) | Total Baseline (USD) |
|---:|---:|---:|---:|---:|
| $67,886 | $31,870 | $1,444 | $1,220 | **$1,02,420** |

### Authoritative Baseline BOM Hierarchy

| Level | Product # | Description | Qty | Unit Price (USD) | Ext. Price (USD) |
|---|---|---|---:|---:|---:|
| (1) | `P53921-B21` | HPE ProLiant DL385 Gen11 8SFF Configure-to-order Server | 1 | $4,403 | $4,403 |
| (2) | `P53921-B21 B19` | HPE ProLiant DL385 Gen11 8SFF Configure-to-order Server Europe Multilingual | 1 | $0 | $0 |
| (2) | `P58540-B21` | AMD EPYC 9224 2.5GHz 24-core 200W Processor for HPE | 1 | $3,985 | $3,985 |
| (3) | `P58540-B21 0D1` | Factory Integrated | 1 | $0 | $0 |
| (2) | `P50312-F21` | HPE 64GB (1x64GB) Dual Rank x4 DDR5-4800 CAS-40-39-39 EC8 Registered Smart FIO Memory Kit | 2 | $28,532 | $57,064 |
| (2) | `P51181-B21` | Broadcom BCM5719 Ethernet 1Gb 4-port BASE-T OCP3 Adapter for HPE | 1 | $485 | $485 |
| (3) | `P51181-B21 0D1` | Factory Integrated | 1 | $0 | $0 |
| (2) | `P03178-B21` | HPE 1000W Flex Slot Titanium Hot Plug Power Supply Kit | 1 | $926 | $926 |
| (3) | `P03178-B21 0D1` | Factory Integrated | 1 | $0 | $0 |
| (2) | `BD505A` | HPE iLO Advanced 1-server License with 3yr Support on iLO Licensed Features | 1 | $469 | $469 |
| (3) | `BD505A 0D1` | Factory Integrated | 1 | $0 | $0 |
| (2) | `S1A05A` | HPE Compute Cloud Management Server FIO Enablement | 1 | $1 | $1 |
| (2) | `P57886-B21` | HPE ProLiant DL385 Gen11 2U Standard/Performance FIO Air Baffle Kit | 1 | $41 | $41 |
| (2) | `P58464-B21` | HPE ProLiant DL3X5 Gen11 2U Standard Fan Kit | 4 | $157 | $628 |
| (3) | `P58464-B21 0D1` | Factory Integrated | 4 | $0 | $0 |
| (2) | `P50400-B21` | HPE Gen11 2U Bezel Kit | 1 | $88 | $88 |
| (3) | `P50400-B21 0D1` | Factory Integrated | 1 | $0 | $0 |
| (2) | `P52351-B21` | HPE DL3XX Gen11 Easy Install Rail 2 Kit | 1 | $141 | $141 |
| (3) | `P52351-B21 0D1` | Factory Integrated | 1 | $0 | $0 |
| (2) | `P58458-B21` | HPE ProLiant DL3X5 Gen11 2U Standard Heat Sink Kit | 1 | $125 | $125 |
*... [11 additional baseline items omitted for brevity]*

## ⏱️ 10. Supply Chain & Delivery Lead Time Intelligence

### ⚠️ Supply Chain Verification Advisory (Unpublished Delivery Lead Times)

*The following high-value active components have unpublished delivery estimates in live OCA. Presales engineers must verify distributor buffer stock before quoting committed deployment timelines:*

| Product # | Description | Category | Lead Time Status | Presales Action |
|---|---|---|:---:|---|
| `P53699-B21` | AMD EPYC 9534 2.45GHz 64-core 280W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P53712-B21` | AMD EPYC 9334 2.7GHz 32-core 210W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P72646-B21` | AMD EPYC 9845 2.1GHz 160-core 390W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P72648-B21` | AMD EPYC 9745 2.4GHz 128-core 400W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P72650-B21` | AMD EPYC 9655 2.6GHz 96-core 400W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P72651-B21` | AMD EPYC 9565 3.15GHz 72-core 400W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P72652-B21` | AMD EPYC 9535 2.4GHz 64-core 300W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P72653-B21` | AMD EPYC 9555 3.2GHz 64-core 360W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P72654-B21` | AMD EPYC 9455 3.15GHz 48-core 300W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P72656-B21` | AMD EPYC 9335 3.0GHz 32-core 210W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P72657-B21` | AMD EPYC 9355 3.55GHz 32-core 280W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P72658-B21` | AMD EPYC 9255 3.20GHz 24-core 200W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P72666-B21` | AMD EPYC 9475F 3.65GHz 48-core 400W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P72667-B21` | AMD EPYC 9375F 3.80GHz 32-core 320W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P72668-B21` | AMD EPYC 9275F 4.1GHz 24-core 320W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
*... [210 additional unpublished items omitted for brevity]*

