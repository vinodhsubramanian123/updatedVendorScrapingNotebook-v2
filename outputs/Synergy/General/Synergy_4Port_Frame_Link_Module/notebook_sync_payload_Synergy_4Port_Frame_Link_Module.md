# HPE Synergy_4Port_Frame_Link_Module — Synchronized Catalog Knowledge

**Target Product**: `Synergy_4Port_Frame_Link_Module`

**Scope Identity**: `HPE/NETWORKING/Synergy/General/Synergy_4Port_Frame_Link_Module`

**Sync Timestamp**: 2026-11-12T14:33:13.051Z

**Total Verified SKUs**: `62` (`62` Hardware + `0` Services)

**Total Synced KnowledgeDeltas**: `14`

This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.

---

## 🚀 Executive Delta & Recent Change Summary

| Category | Total SKUs | Added (Last Scrape) | Price Changed | Attribute Changed | Reinstated | Status |
|----------|------------|---------------------|---------------|-------------------|------------|--------|
| **Hardware Components** | 62 | 0 | 0 | 0 | 0 | **CERTIFIED** |
| **Support Services & SLAs** | 0 | 0 | 0 | 0 | 0 | **CERTIFIED** |
| **Total Portfolio** | **62** | **0** | **0** | **0** | **0** | **ACTIVE** |


## Owned component capture scope

Observed 2026-11-12T03:18:03.540Z. Component base SKU: 876852-B21. Owner: 4-port Frame Link Module #1. Parent base SKU: P51174-B21. Coverage is limited to the component menu.

Service scope: OWNER_ABSENT_IN_OBSERVED_SERVICE_TREE. Unexecuted: alternative service types, terms and tiers; parent-level support changes. Missing prices remain unknown.

## 🌐 1. Universal Vendor Rules (HPE)

1. **[DELTA_UNIVERSAL_MULTI_ICON_ERROR_ATTRIBUTION]**: When Rule 81039677 occurs on multi-icon tenders, trace errors to individual child icon containers instead of modifying the root BOM item. *(Type: ERROR_DIAGNOSTIC_ATTRIBUTION)*
2. **[DELTA_UNIVERSAL_SUPPORT_TIER_ISOLATION]**: Configure support services independently per icon container. Never broadcast support attributes across diverse product families. *(Type: ICON_SUPPORT_ISOLATION)*
3. **[DELTA_UNIVERSAL_OCA_SUPPORT_CACHE_FLUSH]**: Historical service-selector workaround only: in an authenticated working OCA configuration with contradictory service selections, reselect services for the owning node and revalidate. It is not an expired-session recovery. If OCA displays encountered-a-problem, refresh/login from Partner Portal and launch One Config Advanced through Quick Links; never reload the failed OCA tab or remove services as a session fix. *(Type: SESSION_RECOVERY_PROTOCOL)*
4. **[LEARN_UNIVERSAL_SMART_CHOICE_BTO_VS_OCA_VALIDATION_20261112]**: HPE Smart Choice (xxxxxx-xx5) and regional BTO SKUs are pre-configured distributor builds, NOT CTO (-B21) configurables: (1) Never infer unstated internal factory SKUs from the short description alone (QuickSpecs notes BTO models ship with a pre-selected primary NIC without naming its exact SKU in the title, and HPE forbids factory integration of extra options into pre-configured models). (2) Never treat an OCA Customize BOM export of a -xx5 SKU as proof of factory-included parts: OCA opens Smart Choice SKUs as blank shells (0 CPU/RAM/PSU errors), auto-selects separately priced CTO menu defaults on top of the base SKU, and fails CLIC with Rule 81016667 (UNBUILDABLE: configure/quote/order via Distributor webstore or iQuote Universal, Warning 81400509). (3) Validation & reasoning steps: verify suffix (-xx5 BTO/Smart Choice vs -B21 CTO in chassis_map.json / *_Catalog.json); if CTO is desired, map to -B21 CTO chassis and run the canonical CTO evaluation/CLIC path; if exact Smart Choice factory contents are needed, consult HPE Smart Choice Supplemental QuickSpecs (e.g. a50009219enw), iQuote Universal, or an authorized distributor. *(Type: WORKFLOW_SMART_CHOICE_CTO_VALIDATION_STEPS)*
5. **[LEARN_UNIVERSAL_CLIC_GLOBAL_CHECK_AND_SEVERITY_TRIAGE_20261112]**: For any full HPE solution in OCA: (1) Run CLIC Check at the Global Solution Level (top breadcrumb #eo_nav_li_0) rather than only at a child frame/node (Partial CLIC Check), and click Download Advice (#_clic_download_excel) to inspect every row of the Advice_Text and BOM sheets alongside Solution Summary Messages/Issues. (2) Triage CLIC severities properly: Unbuildables and Process control (P+ in Advice_Text) MUST be fixed or formally exception-approved before quoting/ordering. Plain Error rows do not automatically break buildability and may sometimes be ignored, but MUST still be read carefully to verify whether a required action/quantity is missing or already met elsewhere in the solution. Warnings (e.g., PSU C13-to-C20 jumper cables for C19 PDUs, redundant VC FC licenses) must also be reviewed for physical deployment completeness. (3) Note that CLIC Advice Information sheet counts may underreport Warning rows compared to Advice_Text and CLIC Advice BOM may omit icon-level service lines outside the hardware container. *(Type: WORKFLOW_CLIC_GLOBAL_AND_SEVERITY_TRIAGE)*
6. **[OWNER_STANDARD_3Y_BASIC]**: Preserve explicit customer support term and tier in the closest rank; use 3-year Tech Care Basic only when unspecified or explicitly authorized. For this SN3600B BOQ the owner authorized 5-year Essential to 3-year Basic. Compare qualified fixed and flexible service options; disclose retention and preserve parent/suffix pairs. This commercial preference is not vendor qualification. *(Type: SUPPORT_POLICY)*
7. **[OWNER_ICON_SERVICE_ISOLATION]**: Select Services from Components for the owning icon, edit its dropdowns, and leave both apply-to-all icons and apply-to-all nodes off. Different icons retain their own SLA. *(Type: ICON_SUPPORT_ISOLATION)*
8. **[OWNER_OCA_EXPIRED_SESSION]**: When OCA says it encountered a problem, restart from Partner Portal refresh/login and open One Config Advanced through Quick Links. Do not reload the failed OCA session. Keep a Partner Portal tab before closing stale OCA so CDP does not disappear. This supersedes cache-flush advice for encountered-a-problem errors. *(Type: SESSION_RECOVERY_PROTOCOL)*
9. **[OWNER_CLOSEST_REQUIREMENT_RANK]**: Closest rank preserves customer requirements and makes only necessary compatibility/buildability changes. Budget alternatives disclose every deviation; do not silently reduce term, tier, capacity or resilience. Keep explicit owner overrides auditable against the original customer BOQ. *(Type: CUSTOMER_INTENT_POLICY)*
10. **[OWNER_COMPONENT_DOMAIN_ROUTING]**: Route by component role and exact product, never vendor or family alone. Synergy compute, fabric and frame use separate scopes. Resolve ownership before quantities. Validate each component and enclosure/bay, adapter/fabric, optical endpoints, shared power and per-icon SLA relationships; missing profiles remain NOT_EVALUATED and cannot inherit server defaults. Scraping completeness is not buildability certification. *(Type: COMPONENT_DOMAIN_ROUTING)*
11. **[GUARDRAIL_TRANSPORT_RECOVERY]**: Gemini guardrail API sends must retain systemInstruction and function declarations when overriding SDK send config. Enforce scoped local simulation and NotebookLM checks. Retry bounded transient provider errors without exhausting keys, distinguish per-minute from explicit daily quotas, and use configured approved model fallback with preserved tool results and no replay side effects. Empty or unfinished responses are unavailable, not verification. Dashboard status is independent of NotebookLM and vendor acceptance. *(Type: GUARDRAIL_RECOVERY_POLICY)*

## 🏛️ 2. Family & Generation Rules (Synergy General)

*No verified family/generation rules are registered for this product.*

## 🎯 3. Chassis & Solution-Type Gotchas (Synergy_4Port_Frame_Link_Module)

1. **[LEARN_SYNERGY_4PORT_FRAME_LINK_MODULE_WORKFLOW_DUAL_PUBLICATION_ADVISORY_20261029] Synergy_4Port_Frame_Link_Module** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `Synergy_4Port_Frame_Link_Module CTO Server`):
   - **Rule**: Publish and read back the human Drive workbook separately from the complete semantic Markdown source in NotebookLM. Google Sheets is not a supported NotebookLM Drive source. A recent upload timestamp does not refresh old vendor observations.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

2. **[LEARN_SYNERGY_4PORT_FRAME_LINK_MODULE_WORKFLOW_SOURCE_RETIREMENT_ADVISORY_20261029] Synergy_4Port_Frame_Link_Module** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `Synergy_4Port_Frame_Link_Module CTO Server`):
   - **Rule**: Verify exact-product replacement content, indexing and source-restricted grounded canary, then commit trust metadata before removing only managed stale catalog snapshots. Preserve QuickSpecs, separate learnings, shared enclosure/fabric sources and unrelated documents. Inventory absence is not authority to remove another product source.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

3. **[LEARN_SYNERGY_4PORT_FRAME_LINK_MODULE_WORKFLOW_CLOUD_LEARNING_REVIEW_ADVISORY_20261029] Synergy_4Port_Frame_Link_Module** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `Synergy_4Port_Frame_Link_Module CTO Server`):
   - **Rule**: Preserve retrieved cloud learning documents locally with their source IDs. Treat prose claims as candidates pending dated vendor evidence; resolve contradictions before promoting hardware dependencies. Conflicting quantity claims require dated evidence for this exact product and selector state.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`


## 🔒 3b. Physical & Architectural Gating Rules (DOM Unavailable Tables)

### Component Mutual Exclusion Rules

1. **[Transceivers]**: Max quantity of product limited by space available.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (30)**: `QK724A`, `R6B10A`, `834972-B21`, `834972-B22`, `834972-B23`, `834972-B24`, `834972-B25`, `834972-B26`, `834972-B27`, `834972-B28`, `834973-B21`, `834973-B22`, `834973-B23`, `834973-B24`, `834973-B25`, `AJ716B`, `AJ717A`, `AP783A`, `AW538A`, `H6Z29A`, `JD093B`, `P9H29A`, `P9H32A`, `Q2R27A`, `Q2R31A`, `QK725A`, `R6B11A`, `R6B12A`, `R6B13A`, `R6B21A`

2. **[Transceivers]**: Max quantity of product limited by space available.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (2)**: `JD095C`, `JD096C`

## ⚠️ 4. Discontinued & Obsolete SKUs Registry

*No discontinued or reinstated SKUs detected for Synergy_4Port_Frame_Link_Module. All cataloged SKUs are active.*

### ⏳ Impending Obsolescence & Clearance Hardware (90-Day to 180-Day Window)

*These components remain orderable in live configurators today but have published vendor end dates. They represent high-value clearance opportunities for immediate deployments, but require explicit procurement cutoff remarks before quotation:*

| Product # | Description | Category | List Price (USD) | Discontinued Date | Price Trend | Presales Strategy Guidance |
|---|---|---|---:|---|:---:|---|
| `R6B10A` | HPE B-series 16Gb SFP+ Short Wave 1-pack Secure Transceiver | Networking | $1,946 | 04/30/2027 | 0.00% | ⚠️ Approaching EOL (04/30/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `AJ716B` | HPE B-series 8Gb Shortwave Fibre Channel 1 Pack SFP+ Transceiver | Networking | $185 | 09/30/2026 | 0.00% | ⚠️ Approaching EOL (09/30/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `AP783A` | HPE C-series 10GbE Short Range SFP+ Transceiver | Networking | $2,428 | 10/23/2026 | 0.00% | ⚠️ Approaching EOL (10/23/2026). Valid for immediate builds; verify multi-year roadmaps. |

## 📊 5b. Category-Level Trends & Significant Price Adjustments

### Category Portfolio Delta & Planning Intelligence

| Category | Total SKUs | Added | Modified | Unchanged | Clearance / Drops | Category Planning Insight |
|---|---:|---:|---:|---:|---:|---|
| **Chassis** | 1 | 0 | 0 | 1 | 0 | Stable portfolio |
| **Networking** | 40 | 0 | 0 | 40 | 0 | Stable portfolio |
| **Cables & Enablement Kits** | 21 | 0 | 0 | 21 | 0 | Stable portfolio |

## 🔄 5. Recent Attribute & Specification Modifications Log

*No attribute or specification changes recorded across catalog snapshots.*

## 🧩 6. Same-Product CTO Variant Matrix

| Chassis Identifier | Product Family | Generation | Form Factor | CTO Base SKU |
|--------------------|----------------|------------|-------------|--------------|
| **Synergy_4Port_Frame_Link_Module** | Synergy | General | Management Module | `876852-B21` |

## ⏱️ 10. Supply Chain & Delivery Lead Time Intelligence

### Confirmed Component Delivery SLAs

| Product # | Description | Category | Lead Time | Channel Status |
|---|---|---|---:|---|
| `455886-B21` | HPE BladeSystem c-Class 10Gb SFP+ LR Transceiver | Networking | 3 | Available |
| `813874-B21` | HPE 10GBase-T SFP+ Transceiver | Networking | 3 | Available |
| `455883-B21` | HPE BladeSystem c-Class 10Gb SFP+ SR Transceiver | Networking | 8 | Available |
| `JD092B` | HPE Networking X130 10G SFP+ LC SR Transceiver | Networking | 13 | Available |
| `JD094B` | HPE Networking X130 10G SFP+ LC LR Transceiver | Networking | 13 | Available |
| `JG234A` | HPE Networking X130 10G SFP+ LC ER 40km Transceiver | Networking | 13 | Available |
| `QK724A` | HPE B-series 16Gb SFP+ Short Wave Transceiver | Networking | 3 | Not published by OCA |
| `R6B10A` | HPE B-series 16Gb SFP+ Short Wave 1-pack Secure Transceiver | Networking | 3 | Not published by OCA |
| `JD093B` | HPE X130 10G SFP+ LC LRM Transceiver | Networking | 5 | Obsolete (OB) |
| `R6B12A` | HPE B-series 32Gb SFP28 Short Wave 1-pack Secure Transceiver | Networking | 4 | Not published by OCA |
| `R6B13A` | HPE B-series 32Gb SFP28 Long Wave 10km 1-pack Secure Transceiver | Networking | 4 | Not published by OCA |
| `487655-B21` | HPE BladeSystem c-Class 10GbE SFP+ to SFP+ 3m Direct Attach Copper Cable | Cables & Enablement Kits | 3 | Available |
| `537963-B21` | HPE BladeSystem c-Class 10GbE SFP+ to SFP+ 5m Direct Attach Copper Cable | Cables & Enablement Kits | 3 | Available |
| `JC784C` | HPE Networking X240 10G SFP+ 7m DAC Cable | Cables & Enablement Kits | 13 | Available |
| `JD097C` | HPE Networking X240 10G SFP+ SFP+ 3m DAC Cable | Cables & Enablement Kits | 13 | Available |
| `JG081C` | HPE Networking X240 10G SFP+ SFP+ 5m DAC Cable | Cables & Enablement Kits | 13 | Available |
| `JD095C` | HPE Networking X240 10G SFP+ SFP+ 0.65m DAC Cable | Networking | 13 | Not published by OCA |
| `JD096C` | HPE Networking X240 10G SFP+ SFP+ 1.2m DAC Cable | Networking | 13 | Not published by OCA |
| `AJ833A` | HPE LC to LC Multi-mode OM3 2-Fiber 0.5m 1-Pack Fiber Optic Cable | Cables & Enablement Kits | 3 | Available |
| `AJ836A` | HPE LC to LC Multi-mode OM3 2-Fiber 5.0m 1-Pack Fiber Optic Cable | Cables & Enablement Kits | 3 | Available |
| `AJ838A` | HPE LC to LC Multi-mode OM3 2-Fiber 30.0m 1-Pack Fiber Optic Cable | Cables & Enablement Kits | 3 | Available |
| `AJ839A` | HPE LC to LC Multi-mode OM3 2-Fiber 50.0m 1-Pack Fiber Optic Cable | Cables & Enablement Kits | 3 | Available |
| `AJ834A` | HPE LC to LC Multi-mode OM3 2-Fiber 1.0m 1-Pack Fiber Optic Cable | Cables & Enablement Kits | 4 | Available |
| `AJ835A` | HPE LC to LC Multi-mode OM3 2-Fiber 2.0m 1-Pack Fiber Optic Cable | Cables & Enablement Kits | 4 | Available |
| `AJ837A` | HPE LC to LC Multi-mode OM3 2-Fiber 15.0m 1-Pack Fiber Optic Cable | Cables & Enablement Kits | 4 | Available |
| `QK732A` | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 1m Cable | Cables & Enablement Kits | 3 | Available |
| `QK737A` | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 50m Cable | Cables & Enablement Kits | 3 | Available |
| `QK733A` | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 2m Cable | Cables & Enablement Kits | 4 | Available |
| `QK734A` | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 5m Cable | Cables & Enablement Kits | 14 | Available |
| `QK735A` | HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 15m Cable | Cables & Enablement Kits | 8 | Available |
*... [5 additional supply chain records omitted for brevity]*

### ⚠️ Supply Chain Verification Advisory (Unpublished Delivery Lead Times)

*The following high-value active components have unpublished delivery estimates in live OCA. Presales engineers must verify distributor buffer stock before quoting committed deployment timelines:*

| Product # | Description | Category | Lead Time Status | Presales Action |
|---|---|---|:---:|---|
| `AW538A` | HPE B-series 8Gb Extended Long Wave 25km Fibre Channel SFP+ Transceiver 1 Pack | Networking | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `H6Z29A` | HPE B-series 16Gb LW 25km FC SFP 1-pack Transceiver | Networking | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P9H29A` | HPE B-Series 32Gb SFP28 Long Wave 1-pack Transceiver | Networking | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `Q2R27A` | HPE B-series 4x32Gb 1-pack Short Wave QSFP Transceiver | Networking | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `Q2R31A` | HPE B-series 4x32Gb 1-pack Long Wave 2km QSFP Transceiver | Networking | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `R6B11A` | HPE B-series 16Gb SFP+ Long Wave 10km 1-pack Secure Transceiver | Networking | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `R6B21A` | HPE B-series 16Gb SFP+ Extended Long Wave 25km 1-pack Secure Transceiver | Networking | **Unpublished** | Verify distributor inventory prior to SLA commitment |

