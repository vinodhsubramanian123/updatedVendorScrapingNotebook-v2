# HPE DL380a_Gen12 — Synchronized Catalog Knowledge

**Target Product**: `DL380a_Gen12`

**Scope Identity**: `HPE/SERVER/ProLiant/Gen12/DL380a_Gen12`

**Sync Timestamp**: 2026-11-09T11:25:34.307Z

**Total Verified SKUs**: `782` (`460` Hardware + `322` Services)

**Total Synced KnowledgeDeltas**: `33`

This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.

---

## 🚀 Executive Delta & Recent Change Summary

| Category | Total SKUs | Added (Last Scrape) | Price Changed | Attribute Changed | Reinstated | Status |
|----------|------------|---------------------|---------------|-------------------|------------|--------|
| **Hardware Components** | 460 | 8 | 0 | 193 | 0 | **CERTIFIED** |
| **Support Services & SLAs** | 322 | 5 | 0 | 1 | 0 | **CERTIFIED** |
| **Total Portfolio** | **782** | **13** | **0** | **194** | **0** | **ACTIVE** |

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
   - **Rule**: Requires a minimum of five power supplies for 2DW/4DW GPU configurations (up to eight for N+N grid redundancy or pre-populating all 8 bays) and eight power supplies for 8DW/10DW; H100/H200 NVL supports 2400W P67252-B21 or 3200W P67248-B21 Titanium supplies, without mixing wattages.
   - **Affected SKU**: `P76706-B21` | **Required Dependency**: `N/A`

4. **[DELTA_DL380A_GEN12_LIVE_OCA_PRICING_ALIGNMENT_5155756524-01] DL380a_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380a Gen12 GPU Server`):
   - **Rule**: Pointnext support on 8-GPU H200 DL380a scales to accelerator tier ($11,306), install scales to 4U GPU tier ($507), NVLink bridge list is $2,170, and GPU cable list is $114.
   - **Affected SKU**: `HU4B2A30C4W` | **Required Dependency**: `N/A`

5. **[DELTA_UNIVERSAL_CLOUD_MANAGEMENT_OPTIONAL] DL380a_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: Cloud Management FIO Enablement (S1A05A) and Compute Ops Management SaaS (R7A11AAE) are strictly optional services/licenses. They are not required for hardware buildability, power-on, or vendor portal acceptance.
   - **Affected SKU**: `S1A05A` | **Required Dependency**: `N/A`

6. **[DELTA-1789752537004-v9j6p] DL380a_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: Observed price drift on P74700-B21 (memory)
   - **Affected SKU**: `P74700-B21` | **Required Dependency**: `N/A`
   - 💡 **Human Engineer Rationale**: *"Manual price drift reconciliation from phase 15 audit"*

7. **[DELTA-1789752537592-otj9t] DL380a_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: Observed price drift on S4A91C (drive)
   - **Affected SKU**: `S4A91C` | **Required Dependency**: `N/A`
   - 💡 **Human Engineer Rationale**: *"Manual price drift reconciliation from phase 15 audit"*

8. **[DELTA-1789752537783-790yf] DL380a_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: Observed price drift on HA113A1 (support)
   - **Affected SKU**: `HA113A1` | **Required Dependency**: `N/A`
   - 💡 **Human Engineer Rationale**: *"Manual price drift reconciliation from phase 15 audit"*

9. **[DELTA-1789752537975-31r35] DL380a_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: Observed price drift on HU4B2A30C4W (service)
   - **Affected SKU**: `HU4B2A30C4W` | **Required Dependency**: `N/A`
   - 💡 **Human Engineer Rationale**: *"Manual price drift reconciliation from phase 15 audit"*

10. **[DELTA_P70436_DELISTED_REPLACED_BY_P91249] DL380a_Gen12** (Taxonomy: `PRODUCT_GENERATION` | Solution: `Compute/Storage`):
   - **Rule**: When customer quotes specify P70436-B21, substitute with active Multi Vendor SKU P91249-B21 (same High Performance U.3 specification) or value-engineered P84236-B21.
   - **Affected SKU**: `P70436-B21` | **Required Dependency**: `P91249-B21`

11. **[DELTA_VROC_DIRECT_ATTACH_NO_BATTERY] DL380a_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `Compute/Storage`):
   - **Rule**: Exempt Intel VROC and NS204i-u boot devices from Smart Storage Battery P01367-B21 requirement. Battery is exclusively required for hardware MR416i/SR932i storage controllers.
   - **Affected SKU**: `R7J57A` | **Required Dependency**: `N/A`

12. **[LEARN_DL380A_GEN12_WORKFLOW_DUAL_PUBLICATION_ADVISORY_20261029] DL380a_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380a_Gen12 CTO Server`):
   - **Rule**: Publish and read back the human Drive workbook separately from the complete semantic Markdown source in NotebookLM. Google Sheets is not a supported NotebookLM Drive source. A recent upload timestamp does not refresh old vendor observations.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

13. **[LEARN_DL380A_GEN12_WORKFLOW_SOURCE_RETIREMENT_ADVISORY_20261029] DL380a_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380a_Gen12 CTO Server`):
   - **Rule**: Verify exact-product replacement content, indexing and source-restricted grounded canary, then commit trust metadata before removing only managed stale catalog snapshots. Preserve QuickSpecs, separate learnings, shared enclosure/fabric sources and unrelated documents. Inventory absence is not authority to remove another product source.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

14. **[LEARN_DL380A_GEN12_WORKFLOW_CLOUD_LEARNING_REVIEW_ADVISORY_20261029] DL380a_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380a_Gen12 CTO Server`):
   - **Rule**: Preserve retrieved cloud learning documents locally with their source IDs. Treat prose claims as candidates pending dated vendor evidence; resolve contradictions before promoting hardware dependencies. Conflicting quantity claims require dated evidence for this exact product and selector state.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

15. **[LEARN_DL380A_GEN12_SUPPORT_PRICING_UPDATE_20261102] DL380a_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380a_Gen12 CTO Server`):
   - **Rule**: HPE DL380a Gen12 Support (HU4B2A30C4W, under HU4B2A3 3Y Tech Care Basic) list price updated in November 2026 OCA catalog from $11,306.00 to $11,871.00 USD (+$565.00 / +5.00% per node). Total server list price adjusted from $1,656,550.00 to $1,657,115.00 USD.
   - **Affected SKU**: `HU4B2A30C4W` | **Required Dependency**: `P76706-B21`

16. **[LEARN_DL380A_GEN12_H200_LEAD_TIME_BOTTLENECK_20261102] DL380a_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380a_Gen12 CTO Server`):
   - **Rule**: CRITICAL PRESALES CONSTRAINT: NVIDIA H200 NVL 141GB PCIe Accelerator (S3U30C) carries an estimated availability factory lead time of 168 business days (~24 weeks / 5.5 months), establishing it as the primary supply chain gating factor for DL380a Gen12 AI accelerator deployments. FC HBA (R2E09A) is 30 days; Base chassis (P76706-B21) is 14 days; CPU (P74571-B21) and DDR5 memory (P69728-F21) are 10 days.
   - **Affected SKU**: `S3U30C` | **Required Dependency**: `N/A`

17. **[LEARN_DL380A_GEN12_CLIC_STATUS_CLEARANCE_20261102] DL380a_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380a_Gen12 CTO Server`):
   - **Rule**: Portal validation warnings on HPE ProLiant Compute DL380a Gen12 8DW/16SW CTO Server (P76706-B21) and HPE Compute Ops Management Standard 3-year SaaS (R7A11AAE) have cleared to clean/pass in latest OCA release. 64GB DDR5-6400 memory (P69728-F21) discontinuation date extended to 2030-06-30.
   - **Affected SKU**: `P76706-B21` | **Required Dependency**: `N/A`

18. **[LEARN_DL380A_GEN12_RAID1_MULTI_DRIVE_20261104] DL380a_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380a_Gen12 CTO Server`):
   - **Rule**: In HPE OCA / CLIC on DL380a Gen12, 339778-B21 (HPE RAID 1 Drive 1 FIO Setting) strictly enforces Drive Count == 2. When >2 drives (e.g. 4x NVMe SSDs) are configured without a full-cage RAID 5/10 setting, CLIC marks the build as UNBUILDABLE (Action-Required) due to unassigned drive geometry mismatch and mandates 389692-B21 (HPE Customer Defined RAID Setting Service, max 1) or omitting FIO settings when dedicated NS204i-u boot device P78279-B21 is present.
   - **Affected SKU**: `339778-B21` | **Required Dependency**: `N/A`

19. **[LEARN_DL380A_GEN12_BOOT_DATA_DECOUPLING_20261104] DL380a_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380a_Gen12 CTO Server`):
   - **Rule**: HPE NS204i-u v2 480GB Boot Device (P78279-B21) and front boot cage (P75284-B21) have zero hardware, cage, or bus dependency on SFF data drives (P63833-B21 / P50219-B21 / P50216-B21), 4SFF drive cage (P74710-B21), or direct-attach cables (P74702-B21). Boot tier and data tier can be configured independently or together.
   - **Affected SKU**: `P78279-B21` | **Required Dependency**: `N/A`

20. **[LEARN_DL380A_GEN12_TURNKEY_RACKING_CABLING_20261104] DL380a_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380a_Gen12 CTO Server`):
   - **Rule**: DL380a Gen12 base CTO chassis P76706-B21 does not bundle rack rails. When customer tender requests installation, racking, and cabling, P69770-B21 (Ball Bearing Rail Kit) is mandatory to mount the 4U chassis. Furthermore, SFP28 networking adapters (P10115-B21) require 2x 845398-B21 (25Gb SFP28 SR Transceivers) or DAC cables to prevent site cabling failure.
   - **Affected SKU**: `P69770-B21` | **Required Dependency**: `N/A`

21. **[LEARN_DL380A_GEN12_WORKFLOW_NORMATIVE_LANGUAGE_PRECISION_20261107] DL380a_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380a_Gen12 CTO Server`):
   - **Rule**: All agent skill directives, checklists, and execution handoffs must adhere to strict RFC-2119 normative vocabulary (MUST, MUST NOT, SHALL, SHOULD, MAY). Ambiguous hedge words (appropriate, as needed, etc., consider, typically, usually, generally, if possible, try to) are strictly prohibited in operational procedures to eliminate agent hesitation and non-deterministic loops.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

22. **[LEARN_DL380A_GEN12_WORKFLOW_MODULAR_SKILL_TOKEN_OPTIMIZATION_20261107] DL380a_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380a_Gen12 CTO Server`):
   - **Rule**: Monolithic skills exceeding 25KB must be modularized into a concise core execution SKILL.md (<=250 lines) plus dedicated references/ documentation files. This preserves agent prompt token budgets, accelerates model reasoning, and prevents guardrail context window exhaustion.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

23. **[LEARN_DL380A_GEN12_WORKFLOW_UNIVERSAL_CC30_AND_QUALITY_CEILING_20261107] DL380a_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380a_Gen12 CTO Server`):
   - **Rule**: Every function across all repository scripts and test fixtures must strictly comply with the universal cyclomatic complexity ceiling <= 30 (INV-229, INV-230). All modified code must pass oxlint with zero warnings, maintain a clean DAG with zero circular dependencies, and preserve non-empty test discovery.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`

24. **[LEARN_DL380A_GEN12_WORKFLOW_SPECIALIZED_ARCHITECTURAL_DISPATCH_20261107] DL380a_Gen12** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380a_Gen12 CTO Server`):
   - **Rule**: Incoming presales inquiries must be classified and dispatched by presales-query-router across 34 specialized skill tracks, including code-quality-gate, self-correction-counterfactual, presales-clearance-strategy, and turnkey-racking-cabling, with zero ad-hoc script generation.
   - **Affected SKU**: `N/A` | **Required Dependency**: `N/A`


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
   - **Affected SKUs (1)**: `P75693-B21`

9. **[Manufacturing Services]**: Power cord cannot be selected if HPE Remove Standard Power Cords (469774-409) is in the configuration.
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (1)**: `469774-409`

10. **[Virtualization]**: Private Product is not valid for current customer account
   - **Gated Rule Type**: `MUTUAL_EXCLUSION`
   - **Affected SKUs (3)**: `S4F94AAE`, `S4G00AAE`, `S4R76AAE`

### CTO vs BTO Factory Integration Rules

1. **[Power and Cooling]**: BTO products are not allowed in CTO Base Model.
   - **Gated Rule Type**: `BTO_DISALLOWED`
   - **Affected SKUs (1)**: `P80098-B21`

## ⚠️ 4. Discontinued & Obsolete SKUs Registry

### Fully Discontinued & Delisted SKUs

| SKU | Description | Status | Discontinued Date | Last Known Price | Successor SKU | Tracking |
|-----|-------------|--------|-------------------|------------------|---------------|----------|
| `AC120A` | HPE Pallet Size Customization Service | **DISCONTINUED** | 2026-09-09 | $7.00 | None | STOPPED_AFTER_REMOVAL |
| `AC129A` | HPE Consolidation Logistic Service | **DISCONTINUED** | 2026-09-09 | $26.00 | None | STOPPED_AFTER_REMOVAL |
| `P1F69A` | HPE Delivery Site Above Ground Floor Service | **DISCONTINUED** | 2026-09-09 | $289.00 | None | STOPPED_AFTER_REMOVAL |
| `P1F70A` | HPE Forklift at Delivery Service | **DISCONTINUED** | 2026-09-09 | $1399.00 | None | STOPPED_AFTER_REMOVAL |
| `P1F71A` | HPE Special Delivery Truck Size Service | **DISCONTINUED** | 2026-09-09 | $292.00 | None | STOPPED_AFTER_REMOVAL |
| `P1F72A` | HPE Two People at Delivery SVC | **DISCONTINUED** | 2026-09-09 | $466.00 | None | STOPPED_AFTER_REMOVAL |
| `P1F73A` | HPE Campus Delivery Service | **DISCONTINUED** | 2026-09-09 | $104.00 | None | STOPPED_AFTER_REMOVAL |
| `P1F74A` | HPE Unloading Logistic Service | **DISCONTINUED** | 2026-09-09 | $350.00 | None | STOPPED_AFTER_REMOVAL |
| `P1F75A` | HPE Fixed Delivery Appointment Service | **DISCONTINUED** | 2026-09-09 | $466.00 | None | STOPPED_AFTER_REMOVAL |
| `P1F76A` | HPE Pre-Delivery Site Survey SVC | **DISCONTINUED** | 2026-09-09 | $758.00 | None | STOPPED_AFTER_REMOVAL |
| `AC123A` | HPE Special Request/ Equipment Logistic Service | **DISCONTINUED** | 2026-09-09 | $816.00 | None | STOPPED_AFTER_REMOVAL |
| `BQ335A` | HPE Expedite Shipment Small Logistic Service | **DISCONTINUED** | 2026-09-09 | $44.00 | None | STOPPED_AFTER_REMOVAL |
| `BQ337A` | HPE Expedite Shipment Large Logistic Service | **DISCONTINUED** | 2026-09-09 | $100.00 | None | STOPPED_AFTER_REMOVAL |
| `P76706-B21` | HPE ProLiant Compute DL380a Gen12 8 Double Wide/16 Single Wide Configure-to-order Server | **REINSTATED** | 2026-09-09 | $21407.00 | None | STOPPED_AFTER_REMOVAL |
| `S2D86C` | NVIDIA H100 NVL 94GB PCIe Accelerator for HPE | **DISCONTINUED** | 2026-09-30 | $112579.00 | None | STOPPED_AFTER_REMOVAL |
| `P70436-B21` | HPE 15.36TB NVMe Gen4 High Performance Read Intensive SFF BC U.3 PS1010 SSD | **DISCONTINUED** | 2026-10-17 | N/A | `P91249-B21` | LIFECYCLE_RETAINED |

### ⏳ Impending Obsolescence & Clearance Hardware (90-Day to 180-Day Window)

*These components remain orderable in live configurators today but have published vendor end dates. They represent high-value clearance opportunities for immediate deployments, but require explicit procurement cutoff remarks before quotation:*

| Product # | Description | Category | List Price (USD) | Discontinued Date | Price Trend | Presales Strategy Guidance |
|---|---|---|---:|---|:---:|---|
| `P76706-B21` | HPE ProLiant Compute DL380a Gen12 8 Double Wide/16 Single Wide Configure-to-order Server | Chassis | $21,407 | 2026-09-09 | 0.00% | ⚠️ Approaching EOL (2026-09-09). Valid for immediate builds; verify multi-year roadmaps. |
| `P50227-B21` | HPE 1.6TB NVMe Gen4 High Performance Mixed Use SFF BC U.3 PM1735a SSD | Drive Enclosures / Drives | $14,022 | 12/31/2026 | 0.00% | ⚠️ Approaching EOL (12/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P84239-B21` | HPE 15.36TB NVMe Gen4 Mainstream Performance Read Intensive SFF BC U.3 SPDM 7500b SSD | Drive Enclosures / Drives | $83,798 | 02/28/2027 | 0.00% | ⚠️ Approaching EOL (02/28/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P84242-B21` | HPE 7.68TB NVMe Gen4 Mainstream Performance Read Intensive SFF BC U.3 SPDM 7500 SSD | Drive Enclosures / Drives | $48,277 | 02/28/2027 | 0.00% | ⚠️ Approaching EOL (02/28/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P84244-B21` | HPE 3.84TB NVMe Gen4 Mainstream Performance Read Intensive SFF BC U.3 SPDM 7500 SSD | Drive Enclosures / Drives | $27,984 | 02/28/2027 | 0.00% | ⚠️ Approaching EOL (02/28/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P50224-B21` | HPE 15.36TB NVMe Gen4 High Performance Read Intensive SFF BC U.3 PM1733a SSD | Drive Enclosures / Drives | $86,062 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P50216-B21` | HPE 1.92TB NVMe Gen4 High Performance Read Intensive SFF BC U.3 PM1733a SSD | Drive Enclosures / Drives | $25,989 | 12/31/2026 | 0.00% | ⚠️ Approaching EOL (12/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P50230-B21` | HPE 3.2TB NVMe Gen4 High Performance Mixed Use SFF BC U.3 PM1735a SSD | Drive Enclosures / Drives | $49,155 | 12/31/2026 | 0.00% | ⚠️ Approaching EOL (12/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P63845-B21` | HPE 1.6TB NVMe Gen4 High Performance Mixed Use SFF BC U.3 CM7 SSD | Drive Enclosures / Drives | $24,766 | 09/30/2026 | 0.00% | ⚠️ Approaching EOL (09/30/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P63849-B21` | HPE 3.2TB NVMe Gen4 High Performance Mixed Use SFF BC U.3 CM7 SSD | Drive Enclosures / Drives | $38,986 | 09/30/2026 | 0.00% | ⚠️ Approaching EOL (09/30/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P63853-B21` | HPE 6.4TB NVMe Gen4 High Performance Mixed Use SFF BC U.3 CM7 SSD | Drive Enclosures / Drives | $68,034 | 09/30/2026 | 0.00% | ⚠️ Approaching EOL (09/30/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `R6V66A` | NVIDIA Ampere 2-way 2-slot Bridge for HPE | Graphics & GPU | $490 | 09/30/2026 | 0.00% | ⚠️ Approaching EOL (09/30/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P77095-291` | Microsoft Windows Server 2025 16-core Standard FIO Not Pre-installed Japanese SW | Software & Licenses | $0 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77095-B21` | Microsoft Windows Server 2025 16-core Standard FIO Not Pre-installed en/fr/de/es/it/pt/nl SW | Software & Licenses | $1,147 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77096-291` | Microsoft Windows Server 2025 16-core Standard FIO Pre-installed UEFI Japanese SW | Software & Licenses | $0 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77096-B21` | Microsoft Windows Server 2025 16-core Standard FIO Pre-installed UEFI en/fr/de/es/it/pt/nl SW | Software & Licenses | $1,147 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77097-291` | Microsoft Windows Server 2025 16-core Datacenter FIO Not Pre-installed Japanese SW | Software & Licenses | $0 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P77097-B21` | Microsoft Windows Server 2025 16-core Datacenter FIO Not Pre-installed en/fr/de/es/it/pt/nl SW | Software & Licenses | $5,712 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45879-B21` | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed English SW | Software & Licenses | $20 | 01/31/2027 | -28.57% | 🔥 **Clearance Opportunity** (-28.57% CapEx savings). Procure before 01/31/2027. |
| `P45879-051` | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed French SW | Software & Licenses | $20 | 01/31/2027 | -28.57% | 🔥 **Clearance Opportunity** (-28.57% CapEx savings). Procure before 01/31/2027. |
| `P45879-041` | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed German SW | Software & Licenses | $20 | 01/31/2027 | -28.57% | 🔥 **Clearance Opportunity** (-28.57% CapEx savings). Procure before 01/31/2027. |
| `P45879-061` | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed Italian SW | Software & Licenses | $20 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45879-291` | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed Japanese SW | Software & Licenses | $99,999 | 01/31/2027 | 0.00% | ⚠️ Approaching EOL (01/31/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P45879-071` | Microsoft Windows Server 2019 16-core Downgrade Datacenter FIO Not Pre-installed Spanish SW | Software & Licenses | $20 | 01/31/2027 | -28.57% | 🔥 **Clearance Opportunity** (-28.57% CapEx savings). Procure before 01/31/2027. |
| `P45862-B21` | Microsoft Windows Server 2019 16-core Downgrade Standard FIO Not Pre-installed English SW | Software & Licenses | $20 | 01/31/2027 | -28.57% | 🔥 **Clearance Opportunity** (-28.57% CapEx savings). Procure before 01/31/2027. |
*... [23 additional impending EOL records omitted for brevity]*

## 📊 5b. Category-Level Trends & Significant Price Adjustments

### Category Portfolio Delta & Planning Intelligence

| Category | Total SKUs | Added | Modified | Unchanged | Clearance / Drops | Category Planning Insight |
|---|---:|---:|---:|---:|---:|---|
| **Chassis** | 1 | 0 | 1 | 0 | 0 | 🔄 Attributes/specifications updated (1 SKUs) |
| **Processor** | 32 | 0 | 32 | 0 | 0 | 🔄 Attributes/specifications updated (32 SKUs) |
| **Cooling / Thermal** | 11 | 0 | 11 | 0 | 0 | 🔄 Attributes/specifications updated (11 SKUs) |
| **Memory** | 13 | 0 | 13 | 0 | 0 | 🔄 Attributes/specifications updated (13 SKUs) |
| **Graphics & GPU** | 17 | 0 | 17 | 0 | 0 | 🔄 Attributes/specifications updated (17 SKUs) |
| **Storage Controllers** | 20 | 0 | 20 | 0 | 0 | 🔄 Attributes/specifications updated (20 SKUs) |
| **Drive Enclosures / Drives** | 55 | 0 | 55 | 0 | 0 | 🔄 Attributes/specifications updated (55 SKUs) |
| **Software & Licenses** | 219 | 1 | 218 | 0 | 12 | ⚠️ Active price drops / clearance (12 SKUs discounted) |
| **PCIe Risers** | 6 | 0 | 6 | 0 | 0 | 🔄 Attributes/specifications updated (6 SKUs) |
| **Cables & Enablement Kits** | 12 | 0 | 12 | 0 | 0 | 🔄 Attributes/specifications updated (12 SKUs) |
| **Networking** | 60 | 0 | 60 | 0 | 1 | ⚠️ Active price drops / clearance (1 SKUs discounted) |
| **Power Supplies** | 5 | 0 | 5 | 0 | 0 | 🔄 Attributes/specifications updated (5 SKUs) |
| **Accessories & Infrastructure** | 4 | 0 | 4 | 0 | 0 | 🔄 Attributes/specifications updated (4 SKUs) |
| **OS Boot Device** | 5 | 0 | 5 | 0 | 0 | 🔄 Attributes/specifications updated (5 SKUs) |

### High-Impact Price Adjustments (Drops $\ge 10\%$ and Major Moves)

| Product # | Description | Category | Previous Price | Current Price | Delta (USD) | Change (%) | Movement Type |
|---|---|---|---:|---:|---:|---:|---|
| `P65333-H21` | HPE InfiniBand NDR200/Ethernet 200GbE 2-port QSFP112 PCIe5 x16 MCX755106AC-HEAT Adapter | Networking | $7,331 | $5,425 | $-1,906 | **-26.0%** | 📉 CLEARANCE_DROP |
| `P46218-B21` | Microsoft Windows Server 2022 10 Devices CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | Software & Licenses | $342 | $429 | $87 | **+25.4%** | 📈 PRICE_INCREASE |
| `P46222-B21` | Microsoft Windows Server 2022 RDS 5 Devices CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | Software & Licenses | $691 | $880 | $189 | **+27.4%** | 📈 PRICE_INCREASE |
| `S6L28B` | Microsoft Windows Server 2025 10-core Essentials FIO Not Pre-installed WW ESD LTU | Software & Licenses | New Addition | $445 | $445 | **+100.0%** | ✨ NEW_OPTION |
| `S5T74C` | NVIDIA RTX A1000 8GB PCIe Accelerator for HPE | Graphics & GPU | New Addition | $1,687 | $1,687 | **+100.0%** | ✨ NEW_OPTION |
| `P69726-B21` | HPE 16GB (1x16GB) Single Rank x8 DDR5-6400 CAS-52-52-52 EC8 Registered Smart Memory Kit | Memory | New Addition | $7,439 | $7,439 | **+100.0%** | ✨ NEW_OPTION |
| `P69726-F21` | HPE 16GB (1x16GB) Single Rank x8 DDR5-6400 CAS-52-52-52 EC8 Registered Smart FIO Memory Kit | Memory | New Addition | $7,439 | $7,439 | **+100.0%** | ✨ NEW_OPTION |
| `S0K89C` | NVIDIA L4 24GB PCIe Accelerator for HPE | Graphics & GPU | New Addition | $10,589 | $10,589 | **+100.0%** | ✨ NEW_OPTION |
| `P69727-B21` | HPE 32GB (1x32GB) Dual Rank x8 DDR5-6400 CAS-52-52-52 EC8 Registered Smart Memory Kit | Memory | New Addition | $13,909 | $13,909 | **+100.0%** | ✨ NEW_OPTION |
| `S6W30C` | NVIDIA RTX PRO 4500 Blackwell Server Edition 32GB PCIe Accelerator for HPE | Graphics & GPU | New Addition | $18,882 | $18,882 | **+100.0%** | ✨ NEW_OPTION |
| `P69728-B21` | HPE 64GB (1x64GB) Dual Rank x4 DDR5-6400 CAS-52-52-52 EC8 Registered Smart Memory Kit | Memory | New Addition | $28,532 | $28,532 | **+100.0%** | ✨ NEW_OPTION |
| `S2L70C` | NVIDIA L40S 48GB PCIe Accelerator | Graphics & GPU | New Addition | $32,212 | $32,212 | **+100.0%** | ✨ NEW_OPTION |
| `S6W21C` | NVIDIA RTX PRO 6000D 84GB PCIe Accelerator for HPE | Graphics & GPU | New Addition | $37,899 | $37,899 | **+100.0%** | ✨ NEW_OPTION |
| `P69729-B21` | HPE 96GB (1x96GB) Dual Rank x4 DDR5-6400 CAS-52-52-52 EC8 Registered Smart Memory Kit | Memory | New Addition | $47,056 | $47,056 | **+100.0%** | ✨ NEW_OPTION |
| `S6A73C` | NVIDIA RTX PRO 6000 Blackwell Server Edition 96GB PCIe Accelerator for HPE | Graphics & GPU | New Addition | $57,002 | $57,002 | **+100.0%** | ✨ NEW_OPTION |
| `P69730-B21` | HPE 128GB (1x128GB) Dual Rank x4 DDR5-6400 CAS-52-52-52 EC8 Registered Smart Memory Kit | Memory | New Addition | $60,190 | $60,190 | **+100.0%** | ✨ NEW_OPTION |
| `S2D86C` | NVIDIA H100 NVL 94GB PCIe Accelerator for HPE | Graphics & GPU | New Addition | $1,12,579 | $1,12,579 | **+100.0%** | ✨ NEW_OPTION |
| `S3U30C` | NVIDIA H200 NVL 141GB PCIe Accelerator for HPE | Graphics & GPU | New Addition | $1,12,579 | $1,12,579 | **+100.0%** | ✨ NEW_OPTION |
| `P73447-B21` | HPE 256GB (1x256GB) Quad Rank x4 DDR5-6400 CAS-60-52-52 EC8 Registered 3DS Smart Memory Kit | Memory | New Addition | $1,33,186 | $1,33,186 | **+100.0%** | ✨ NEW_OPTION |

## 🔄 5. Recent Attribute & Specification Modifications Log

| Timestamp | SKU | Attribute | Old Value | New Value |
|-----------|-----|-----------|-----------|-----------|
| 2026-10-29 | `P46222-B21` | Vendor Attributes | {"listPrice":691} | **{"listPrice":880}** |
| 2026-10-29 | `P71119-B21` | Availability | Available | **CS (vendor status; meaning unverified)** |
| 2026-10-29 | `P71119-B21` | Portal Visibility |  | **PORTAL_CONDITIONAL** |
| 2026-10-29 | `P71119-B21` | Condition Type |  | **PORTAL_CONDITIONAL_VIEW** |
| 2026-10-29 | `P71119-B21` | Vendor Attributes | {"listPrice":8459} | **{"listPrice":8459,"Vendor Status Badge":"CS"}** |
| 2026-10-29 | `P71120-B21` | Availability | Available | **CS (vendor status; meaning unverified)** |
| 2026-10-29 | `P71120-B21` | Portal Visibility |  | **PORTAL_CONDITIONAL** |
| 2026-10-29 | `P71120-B21` | Condition Type |  | **PORTAL_CONDITIONAL_VIEW** |
| 2026-10-29 | `P71120-B21` | Vendor Attributes | {"listPrice":8965} | **{"listPrice":8965,"Vendor Status Badge":"CS"}** |
| 2026-10-29 | `P71121-B21` | Availability | Available | **CS (vendor status; meaning unverified)** |
| 2026-10-29 | `P71121-B21` | Portal Visibility |  | **PORTAL_CONDITIONAL** |
| 2026-10-29 | `P71121-B21` | Condition Type |  | **PORTAL_CONDITIONAL_VIEW** |
| 2026-10-29 | `P71121-B21` | Vendor Attributes | {"listPrice":11891} | **{"listPrice":11891,"Vendor Status Badge":"CS"}** |
| 2026-10-29 | `P71122-B21` | Availability | Available | **CS (vendor status; meaning unverified)** |
| 2026-10-29 | `P71122-B21` | Portal Visibility |  | **PORTAL_CONDITIONAL** |
| 2026-10-29 | `P71122-B21` | Condition Type |  | **PORTAL_CONDITIONAL_VIEW** |
| 2026-10-29 | `P71122-B21` | Vendor Attributes | {"listPrice":14473} | **{"listPrice":14473,"Vendor Status Badge":"CS"}** |
| 2026-10-29 | `P73835-B21` | Availability | Available | **CS (vendor status; meaning unverified)** |
| 2026-10-29 | `P73835-B21` | Portal Visibility |  | **PORTAL_CONDITIONAL** |
| 2026-10-29 | `P73835-B21` | Condition Type |  | **PORTAL_CONDITIONAL_VIEW** |
| 2026-10-29 | `P73835-B21` | Vendor Attributes | {"listPrice":48922} | **{"listPrice":48922,"Vendor Status Badge":"CS"}** |
| 2026-10-29 | `P73838-B21` | Availability | Available | **CS (vendor status; meaning unverified)** |
| 2026-10-29 | `P73838-B21` | Portal Visibility |  | **PORTAL_CONDITIONAL** |
| 2026-10-29 | `P73838-B21` | Condition Type |  | **PORTAL_CONDITIONAL_VIEW** |
| 2026-10-29 | `P73838-B21` | Vendor Attributes | {"listPrice":58094} | **{"listPrice":58094,"Vendor Status Badge":"CS"}** |

## 🧩 6. Same-Product CTO Variant Matrix

| Chassis Identifier | Product Family | Generation | Form Factor | CTO Base SKU |
|--------------------|----------------|------------|-------------|--------------|
| **DL380a_Gen12** | ProLiant | Gen12 | 8DW/16SW | `P76706-B21` |

## 📦 9. Solution Manifest, EDT & Commercial Baseline

**Configuration Profile**: `OCA Config 2` | **Icon ID**: `I157947739-01` | **Estimated Delivery Time (EDT)**: `24 - 30 days`

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

## ⏱️ 10. Supply Chain & Delivery Lead Time Intelligence

### Confirmed Component Delivery SLAs

| Product # | Description | Category | Lead Time | Channel Status |
|---|---|---|---:|---|
| `389692-B21` | HPE Customer Defined RAID Setting Service | Storage Controllers | 1 | Available in OCA product catalog |

### ⚠️ Supply Chain Verification Advisory (Unpublished Delivery Lead Times)

*The following high-value active components have unpublished delivery estimates in live OCA. Presales engineers must verify distributor buffer stock before quoting committed deployment timelines:*

| Product # | Description | Category | Lead Time Status | Presales Action |
|---|---|---|:---:|---|
| `P71117-B21` | Intel Xeon 6710E 2.4GHz 64-core 205W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P73834-B21` | Intel Xeon 6767P 2.4GHz 64-core 350W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P74508-B21` | Intel Xeon 6714P 4.0GHz 8-core 165W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P74509-B21` | Intel Xeon 6724P 3.6GHz 16-core 210W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P74570-B21` | Intel Xeon 6527P 3.0GHz 24-core 255W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P74571-B21` | Intel Xeon 6530P 2.3GHz 32-core 225W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P74573-B21` | Intel Xeon 6730P 2.5GHz 32-core 250W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P74576-B21` | Intel Xeon 6737P 2.9GHz 32-core 270W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P71119-B21` | Intel Xeon 6740E 2.4GHz 96-core 250W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P71120-B21` | Intel Xeon 6746E 2.0GHz 112-core 250W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P71121-B21` | Intel Xeon 6756E 1.8GHz 128-core 225W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P71122-B21` | Intel Xeon 6766E 1.9GHz 144-core 250W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P71124-B21` | Intel Xeon 6780E 2.2GHz 144-core 330W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P73829-B21` | Intel Xeon 6740P 2.1GHz 48-core 270W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
| `P73831-B21` | Intel Xeon 6747P 2.7GHz 48-core 330W Processor for HPE | Processor | **Unpublished** | Verify distributor inventory prior to SLA commitment |
*... [170 additional unpublished items omitted for brevity]*

