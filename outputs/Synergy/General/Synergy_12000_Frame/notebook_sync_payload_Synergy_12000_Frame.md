# HPE Synergy_12000_Frame — Synchronized Catalog Knowledge

**Target Product**: `Synergy_12000_Frame`

**Scope Identity**: `HPE/COMPOSITE/Synergy/General/Synergy_12000_Frame`

**Sync Timestamp**: 2026-11-12T14:33:10.031Z

**Total Verified SKUs**: `444` (`228` Hardware + `216` Services)

**Total Synced KnowledgeDeltas**: `14`

This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.

---

## 🚀 Executive Delta & Recent Change Summary

| Category | Total SKUs | Added (Last Scrape) | Price Changed | Attribute Changed | Reinstated | Status |
|----------|------------|---------------------|---------------|-------------------|------------|--------|
| **Hardware Components** | 228 | 0 | 0 | 0 | 0 | **CERTIFIED** |
| **Support Services & SLAs** | 216 | 1 | 0 | 0 | 0 | **CERTIFIED** |
| **Total Portfolio** | **444** | **1** | **0** | **0** | **0** | **ACTIVE** |


## Configured child menus

OBSERVED_CONFIGURED_CHILD_MENUS. Observed child base SKUs 876852-B21, 867796-B21.  Other selector states require separate observation.

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

## 🎯 3. Chassis & Solution-Type Gotchas (Synergy_12000_Frame)

1. **[LEARN_SYNERGY_12000_FRAME_WORKFLOW_DUAL_PUBLICATION_ADVISORY_20261029] Synergy_12000_Frame** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `Synergy_12000_Frame CTO Server`):
   - **Rule**: Publish and read back the human Drive workbook separately from the complete semantic Markdown source in NotebookLM. Google Sheets is not a supported NotebookLM Drive source. A recent upload timestamp does not refresh old vendor observations.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

2. **[LEARN_SYNERGY_12000_FRAME_WORKFLOW_SOURCE_RETIREMENT_ADVISORY_20261029] Synergy_12000_Frame** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `Synergy_12000_Frame CTO Server`):
   - **Rule**: Verify exact-product replacement content, indexing and source-restricted grounded canary, then commit trust metadata before removing only managed stale catalog snapshots. Preserve QuickSpecs, separate learnings, shared enclosure/fabric sources and unrelated documents. Inventory absence is not authority to remove another product source.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

3. **[LEARN_SYNERGY_12000_FRAME_WORKFLOW_CLOUD_LEARNING_REVIEW_ADVISORY_20261029] Synergy_12000_Frame** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `Synergy_12000_Frame CTO Server`):
   - **Rule**: Preserve retrieved cloud learning documents locally with their source IDs. Treat prose claims as candidates pending dated vendor evidence; resolve contradictions before promoting hardware dependencies. Conflicting quantity claims require dated evidence for this exact product and selector state.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`


## 🔒 3b. Physical & Architectural Gating Rules (DOM Unavailable Tables)

### Component Mutual Exclusion Rules

1. **[Compute and Storage]**: Non-TAA Model cannot support TAA products.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (11)**: `871940-B22`, `871941-B22`, `871942-B22`, `P22139-B22`, `P39531-B22`, `P83805-B21#GTA`, `P68217-B21#GTA`, `P83806-B21#GTA`, `871929-B22`, `871930-B22`, `871931-B22`

2. **[Compute and Storage]**: CTO Compute and Storage Modules can only be configured in a CTO Frame.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (18)**: `871943-B21`, `871945-B21`, `871946-B21`, `826950-B21`, `826951-B21`, `826952-B21`, `826953-B21`, `826954-B21`, `834483-B21`, `834484-B21`, `871932-B21`, `871933-B21`, `871934-B21`, `826956-B21`, `826957-B21`, `826958-B21`, `834480-B21`, `834481-B21`

3. **[Compute and Storage]**: CTO Compute and Storage Modules can only be configured in a CTO Frame.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `755984-B21`

4. **[Management Hardware]**: Mixing Composer and Composer 2 is not allowed
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `804353-B21`

5. **[Management Hardware]**: Non-TAA Model cannot support TAA products.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (4)**: `804353-B22`, `804937-B22`, `872957-B22`, `P73869-B22`

6. **[Management Hardware]**: If HPE Synergy 4-port Frame Link Module is included in the 12000 Frame, Synergy Image Streamer on Synergy Composer cannot be selected.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `804937-B21`

7. **[Management Hardware]**: Max quantity of product limited by space available.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `P54624-B21`

8. **[Management Hardware]**: Mixing of Composer 2 and Composer 2 Plus modules is not allowed.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `P73869-B21`

9. **[Management Hardware]**: Either Frame link Module or 4p Frame Link Module can be selected. Mixing is not allowed.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `804942-B21`

10. **[Management Hardware]**: Non-TAA Model cannot support TAA products.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `804942-B22`

11. **[Interconnects]**: Non-TAA Model cannot support TAA products.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (5)**: `867793-B22`, `867796-B22`, `779215-B22`, `779218-B22`, `799330-B22`

12. **[Interconnects]**: Product is obsolete
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `489184-B21`

13. **[Interconnects]**: Product not supported
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (14)**: `648312-B21`, `658247-B21`, `674280-B21`, `674281-B21`, `674282-B21`, `674283-B21`, `674284-B21`, `829914-B21`, `829915-B21`, `829916-B21`, `843191-B21`, `843192-B21`, `843193-B21`, `846041-B21`

14. **[Interconnects]**: Cannot mix together in the same Synergy 12000 Frame
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `794502-B23`

15. **[Power]**: Model X - No Mixing of Power Supplies is allowed. All selected Power Supplies must be of the same part number. Minimum should be determined based on the Power Advisor Program. (Minimum is always at least 2 - Power Advisor Program will indicate scenarios in which more than 2 is required)
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (11)**: `798095-B21`, `798096-B21`, `876929-B21`, `P27749-B21`, `P27750-B21`, `798099-B21`, `798100-B21`, `798101-B21`, `798102-B21`, `798342-B21`, `798349-B21`

16. **[Power]**: This cable kit support with only the following power supplies
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (8)**: `J6X00A`, `P9B75A`, `J6W98A`, `J6W99A`, `J6X01A`, `J6X02A`, `J6X03A`, `P9B77A`

17. **[Power]**: This option cable kit contains 6 six power cords and support only with the following power supplies
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `872035-B21`

## ⚠️ 4. Discontinued & Obsolete SKUs Registry

*No discontinued or reinstated SKUs detected for Synergy_12000_Frame. All cataloged SKUs are active.*

### ⏳ Impending Obsolescence & Clearance Hardware (90-Day to 180-Day Window)

*These components remain orderable in live configurators today but have published vendor end dates. They represent high-value clearance opportunities for immediate deployments, but require explicit procurement cutoff remarks before quotation:*

| Product # | Description | Category | List Price (USD) | Discontinued Date | Price Trend | Presales Strategy Guidance |
|---|---|---|---:|---|:---:|---|
| `P39531-B21` | HPE Synergy 480 Gen11 Configure-to-order Compute Module | Frame Options | $3,463 | 09/08/2026 | 0.00% | ⚠️ Approaching EOL (09/08/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P83805-B21` | HPE Synergy 480 Gen11 Solution Compute Node | Frame Options | $3,463 | 09/10/2026 | 0.00% | ⚠️ Approaching EOL (09/10/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P83805-B21` | HPE Synergy 480 Gen11 for SAP HANA Compute Node | Accessories & Infrastructure | $0 | 09/10/2026 | 0.00% | ⚠️ Approaching EOL (09/10/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `835386-B21` | HPE Synergy D3940 12Gb SAS CTO Drive Enclosure with 40 SFF (2.5in) Drive Bays | Accessories & Infrastructure | $4,411 | 11/30/2026 | 0.00% | ⚠️ Approaching EOL (11/30/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `872957-B21` | HPE Synergy Composer2 Management Appliance | Management Hardware | $10,400 | 03/31/2027 | 0.00% | ⚠️ Approaching EOL (03/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P54624-B21` | HPE Synergy Composer2 Management Appliance Kit | Management Hardware | $10,400 | 03/31/2027 | 0.00% | ⚠️ Approaching EOL (03/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `755985-B21` | HPE Synergy 12Gb SAS Connection Module with 12 Internal Ports | Interconnects | $2,099 | 11/30/2026 | 0.00% | ⚠️ Approaching EOL (11/30/2026). Valid for immediate builds; verify multi-year roadmaps. |

## 📊 5b. Category-Level Trends & Significant Price Adjustments

### Category Portfolio Delta & Planning Intelligence

| Category | Total SKUs | Added | Modified | Unchanged | Clearance / Drops | Category Planning Insight |
|---|---:|---:|---:|---:|---:|---|
| **Chassis** | 1 | 0 | 1 | 0 | 0 | 🔄 Attributes/specifications updated (1 SKUs) |
| **Frame Options** | 39 | 0 | 39 | 0 | 0 | 🔄 Attributes/specifications updated (39 SKUs) |
| **Accessories & Infrastructure** | 33 | 0 | 33 | 0 | 0 | 🔄 Attributes/specifications updated (33 SKUs) |
| **Drive Enclosures / Drives** | 13 | 0 | 13 | 0 | 0 | 🔄 Attributes/specifications updated (13 SKUs) |
| **Management Hardware** | 6 | 0 | 6 | 0 | 0 | 🔄 Attributes/specifications updated (6 SKUs) |
| **Interconnects** | 21 | 0 | 21 | 0 | 0 | 🔄 Attributes/specifications updated (21 SKUs) |
| **Networking** | 19 | 0 | 19 | 0 | 0 | 🔄 Attributes/specifications updated (19 SKUs) |
| **Cables & Enablement Kits** | 81 | 0 | 81 | 0 | 0 | 🔄 Attributes/specifications updated (81 SKUs) |
| **Software & Licenses** | 2 | 0 | 2 | 0 | 0 | 🔄 Attributes/specifications updated (2 SKUs) |
| **Cooling / Thermal** | 1 | 0 | 1 | 0 | 0 | 🔄 Attributes/specifications updated (1 SKUs) |
| **Power Supplies** | 13 | 0 | 13 | 0 | 0 | 🔄 Attributes/specifications updated (13 SKUs) |

## 🔄 5. Recent Attribute & Specification Modifications Log

| Timestamp | SKU | Attribute | Old Value | New Value |
|-----------|-----|-----------|-----------|-----------|
| 2026-11-12 | `P83805-B21` | Description | HPE Synergy 480 Gen11 for SAP HANA Compute Node | **HPE Synergy 480 Gen11 Solution Compute Node** |
| 2026-11-12 | `P83805-B21` | Option Type | Standard | **CTO** |
| 2026-11-12 | `P83805-B21` | Vendor Attributes | {"listPrice":0} | **{"listPrice":3463}** |
| 2026-11-12 | `H36XCA1#006` | Description | HPE GPU on RHOCP Integrat SVC | **** |
| 2026-11-12 | `H36XCA1#006` | Option Type | Standard | **** |
| 2026-11-12 | `H36XCA1#006` | Lifecycle Status | Active | **** |
| 2026-11-12 | `H36XCA1#006` | CLIC Status | Unpublished | **** |
| 2026-11-12 | `H36XCA1#006` | Availability | Not published by OCA | **** |
| 2026-11-12 | `H36XCA1#006` | Lead Time | Unpublished | **** |
| 2026-11-12 | `H36XCA1#006` | Lead Time Source | Unpublished | **** |
| 2026-11-12 | `H36XCA1#006` | Speed Tier | Unpublished | **** |
| 2026-11-12 | `H36XCA1#006` | Vendor Recommended | false | **** |
| 2026-11-12 | `H36XCA1#006` | Vendor Attributes | {"Product Number":"H36XCA1#006"} | **** |

## 🧩 6. Same-Product CTO Variant Matrix

| Chassis Identifier | Product Family | Generation | Form Factor | CTO Base SKU |
|--------------------|----------------|------------|-------------|--------------|
| **Synergy_12000_Frame** | Synergy | General | Frame | `P51174-B21` |

## 📦 9. Solution Manifest, EDT & Commercial Baseline

**Configuration Profile**: `OCA Config 2` | **Icon ID**: `I158326811-01` | **Estimated Delivery Time (EDT)**: `24 - 30 days`

## ⏱️ 10. Supply Chain & Delivery Lead Time Intelligence

### Confirmed Component Delivery SLAs

| Product # | Description | Category | Lead Time | Channel Status |
|---|---|---|---:|---|
| `P68217-B21` | HPE Synergy 480 Gen12 Configure-to-order Compute Module | Frame Options | 4 | Available |
| `P83806-B21` | HPE Synergy 480 Gen12 Solution Compute Node | Frame Options | 4 | Available |
| `835386-B21` | HPE Synergy D3940 12Gb SAS CTO Drive Enclosure with 40 SFF (2.5in) Drive Bays | Accessories & Infrastructure | 4 | Direct Ship (DS) |
| `872957-B21` | HPE Synergy Composer2 Management Appliance | Management Hardware | 4 | Available |
| `P54624-B21` | HPE Synergy Composer2 Management Appliance Kit | Management Hardware | 4 | Not published by OCA |
| `876852-B21` | HPE Synergy 4-port Frame Link Module | Management Hardware | 3 | Available |
| `P06458-B21` | HPE Synergy 4-port Frame Link Module USB Adapter | Management Hardware | 3 | Available |
| `867793-B21` | HPE Synergy 50Gb Interconnect Link Module | Interconnects | 3 | Available |
| `867796-B21` | HPE Virtual Connect SE 100Gb F32 Module for Synergy | Interconnects | 3 | Available |
| `P77653-B21` | Brocade 64Gb Fibre Channel Module for HPE Synergy | Interconnects | 3 | Available |
| `755985-B21` | HPE Synergy 12Gb SAS Connection Module with 12 Internal Ports | Interconnects | 4 | Direct Ship (DS) |
| `799330-B21` | HE Synergy 10Gb Pass-Thru Module | Interconnects | 4 | Obsolete (OB) |
| `876259-B21` | HPE Virtual Connect SE 32Gb Fibre Channel Module for Synergy | Interconnects | 4 | Available |
| `Q2E57A` | Brocade 32Gb/20 4SFP+ Power Pack+ Fibre Channel SAN Switch Module for HPE Synergy | Interconnects | 4 | Available |
| `487655-B21` | HPE BladeSystem c-Class 10GbE SFP+ to SFP+ 3m Direct Attach Copper Cable | Cables & Enablement Kits | 3 | Available |
| `537963-B21` | HPE BladeSystem c-Class 10GbE SFP+ to SFP+ 5m Direct Attach Copper Cable | Cables & Enablement Kits | 3 | Available |
| `720211-B21` | HPE BladeSystem c-Class 40G QSFP+ to QSFP+ 15m Active Optical Cable | Cables & Enablement Kits | 3 | Available |
| `721064-B21` | HPE BladeSystem c-Class 40G QSFP+ to 4x10G SFP+ 3m Direct Attach Copper Splitter Cable | Cables & Enablement Kits | 3 | Available |
| `721076-B21` | HPE BladeSystem c-Class QSFP+ to 4x10G SFP+ 15m Active Optical Cable | Cables & Enablement Kits | 3 | Available |
| `845406-B21` | HPE 100Gb QSFP28 to QSFP28 3m Direct Attach Copper Cable | Cables & Enablement Kits | 3 | Available |
| `845408-B21` | HPE 100Gb QSFP28 to QSFP28 5m Direct Attach Copper Cable | Cables & Enablement Kits | 3 | Available |
| `845410-B21` | HPE 100Gb QSFP28 to QSFP28 7m Active Optical Cable | Cables & Enablement Kits | 3 | Available |
| `845414-B21` | HPE 100Gb QSFP28 to QSFP28 15m Active Optical Cable | Cables & Enablement Kits | 3 | Available |
| `845416-B21` | HPE 100Gb QSFP28 to 4x25Gb SFP28 3m Direct Attach Copper Cable | Cables & Enablement Kits | 3 | Available |
| `845420-B21` | HPE QSFP28 to 4x25Gb SFP28 7m Active Optical Cable | Cables & Enablement Kits | 3 | Available |
| `845424-B21` | HPE QSFP28 to 4x25Gb SFP28 15m Active Optical Cable | Cables & Enablement Kits | 4 | Available |
| `J9283B` | HPE X242 10G SFP+ to SFP+ 3m Direct Attach Copper Cable | Cables & Enablement Kits | 5 | Obsolete (OB) |
| `JD097C` | HPE Networking X240 10G SFP+ SFP+ 3m DAC Cable | Cables & Enablement Kits | 13 | Available |
| `JG081C` | HPE Networking X240 10G SFP+ SFP+ 5m DAC Cable | Cables & Enablement Kits | 13 | Available |
| `G9Q68A` | HPE NonStop Category 6A 21 Foot Cable | Networking | 3 | Available |
*... [45 additional supply chain records omitted for brevity]*

### ⚠️ Supply Chain Verification Advisory (Unpublished Delivery Lead Times)

*The following high-value active components have unpublished delivery estimates in live OCA. Presales engineers must verify distributor buffer stock before quoting committed deployment timelines:*

| Product # | Description | Category | Lead Time Status | Presales Action |
|---|---|---|:---:|---|
| `871929-B21` | HPE Synergy 660 Gen10 Configure-to-order Compute Module | Frame Options | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `871930-B21` | HPE Synergy 660 Gen10 Configure-to-order without Drive Bays Compute Module | Frame Options | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `871931-B21` | HPE Synergy 660 Gen10 Configure-to-order Premium Backplane Compute Module | Frame Options | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `Q9Q89A` | HPE Synergy 660 Gen10 for SAP HANA Tailored Datacenter Integration Compute Block | Frame Options | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `R1R49A` | HPE Synergy 660 Gen10 for SAP HANA Compute Block | Frame Options | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `834482-B21` | HPE Synergy 680 Gen9 4S-EX Configure-to-order Compute Module | Frame Options | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `871943-B21` | HPE Synergy 480 Gen10 6130 2P 64GB-R P204i-c SAS Performance Compute Module | Frame Options | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `871945-B21` | HPE Synergy 480 Gen10 5118 1P 32GB-R E208i-c Base Compute Module | Frame Options | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `834480-B21` | HPE Synergy 680 Gen9 4S-EX Performance Compute Module | Frame Options | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `834481-B21` | HPE Synergy 680 Gen9 4S-EX Base Compute Module | Frame Options | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `804937-B21` | HPE Synergy Image Streamer | Accessories & Infrastructure | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P73869-B21` | HPE Composer2 Plus Management Appliance | Management Hardware | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P68134-B21` | HPE Virtual Connect 64Gb Fibre Channel Module for HPE Synergy | Interconnects | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `779224-B23` | HPE Synergy 40Gb F8 Switch Module | Interconnects | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `K2Q83A` | Brocade 16Gb/12 Fibre Channel SAN Switch Module for HPE Synergy | Interconnects | **Unpublished** | Verify distributor inventory prior to SLA commitment |
*... [24 additional unpublished items omitted for brevity]*

