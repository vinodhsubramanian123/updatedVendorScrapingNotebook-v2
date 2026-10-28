# HPE DL380_Gen11 — Synchronized Catalog Knowledge

**Target Product**: `DL380_Gen11`

**Scope Identity**: `HPE/SERVER/ProLiant/Gen11/DL380_Gen11`

**Sync Timestamp**: 2026-10-28T09:48:52.160Z

**Total Verified SKUs**: `1408` (`753` Hardware + `655` Services)

**Total Synced KnowledgeDeltas**: `22`

This source file ensures Gemini NotebookLM RAG reasoning stays 100% synchronized with local Antigravity AI physical pre-checks, catalog deltas, historical price trails, support service SLAs, and learned vendor portal feedback.

---

## 🚀 Executive Delta & Recent Change Summary

| Category | Total SKUs | Added (Last Scrape) | Price Changed | Attribute Changed | Reinstated | Status |
|----------|------------|---------------------|---------------|-------------------|------------|--------|
| **Hardware Components** | 753 | 169 | 0 | 0 | 0 | **CERTIFIED** |
| **Support Services & SLAs** | 655 | 0 | 0 | 0 | 0 | **CERTIFIED** |
| **Total Portfolio** | **1408** | **169** | **0** | **0** | **0** | **ACTIVE** |

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

## 🎯 3. Chassis & Solution-Type Gotchas (DL380_Gen11)

1. **[DELTA-1787856163365] DL380_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If PORTAL is present, P52534-B21 is mandatory.
   - **Affected SKU**: `PORTAL` | **Required Dependency**: `P52534-B21`

2. **[DELTA-1787856163549] DL380_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If PORTAL is present, P64707-B21 is mandatory.
   - **Affected SKU**: `PORTAL` | **Required Dependency**: `P64707-B21`

3. **[DELTA-1787856163672] DL380_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: Portal validation flagged restriction on PORTAL.
   - **Affected SKU**: `PORTAL` | **Required Dependency**: `N/A`

4. **[DELTA-1787856163759] DL380_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `General Server`):
   - **Rule**: If PORTAL is present, P58335-B21 is mandatory.
   - **Affected SKU**: `PORTAL` | **Required Dependency**: `P58335-B21`

5. **[DELTA_RAG_CARRYOVER_P48183-B21_1787856180158] DL380_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen11 CTO Server`):
   - **Rule**: undefined
   - **Affected SKU**: `P48183-B21` | **Required Dependency**: `N/A`

6. **[DELTA_CLIC_81354632_DL380_GEN11] DL380_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen11 CTO Server`):
   - **Rule**: If P48832-B21 (Tri-Mode Splitter Cable) is selected, P48814-B21 (8SFF U.3 Premium Cage) is mandatory.
   - **Affected SKU**: `P48832-B21` | **Required Dependency**: `P48814-B21`

7. **[DELTA_CLIC_81354652_DL380_GEN11] DL380_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen11 CTO Server`):
   - **Rule**: If P02377-B21 / P01366-B21 (Capacitor/Battery) is selected, P48918-B21 (Storage Controller Enablement Cable Kit) is mandatory.
   - **Affected SKU**: `P02377-B21` | **Required Dependency**: `P48918-B21`

8. **[DELTA_CLIC_81355854_DL380_GEN11] DL380_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen11 CTO Server`):
   - **Rule**: P51911-B21 and P48830-B21 cannot be selected together. Retain P48830-B21.
   - **Affected SKU**: `P51911-B21` | **Required Dependency**: `P48830-B21`

9. **[DELTA_CLIC_81016755_DL380_GEN11] DL380_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen11 CTO Server`):
   - **Rule**: When 5+ PCIe cards are installed, P56073-B21 Primary Cable Kit is mandatory for Primary Riser Slot 1.
   - **Affected SKU**: `P48803-B21` | **Required Dependency**: `P56073-B21`

10. **[DELTA_CLIC_EU_LOT9_P35876_DL380_GEN11] DL380_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen11 CTO Server`):
   - **Rule**: When ordering Platinum PSUs (P38997-B21) on high-draw dual-socket configurations, P35876-B21 (CE Mark Removal Kit) is required for non-EU deployment, or upgrade to Titanium PSUs (P44712-B21).
   - **Affected SKU**: `P38997-B21` | **Required Dependency**: `P35876-B21`

11. **[DELTA_RAG_DEP_P02377-B21_P48918-B21_1787913302880] DL380_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen11 CTO Server`):
   - **Rule**: undefined
   - **Affected SKU**: `P02377-B21` | **Required Dependency**: `P48918-B21`

12. **[DELTA_RAG_DEP_P58335-B21_P48918-B21_1787913632019] DL380_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen11 CTO Server`):
   - **Rule**: undefined
   - **Affected SKU**: `P58335-B21` | **Required Dependency**: `P48918-B21`

13. **[DELTA_RAG_DEP_write-cach_P48918-B21_1787915281069] DL380_Gen11** (Taxonomy: `CHASSIS_SPECIFIC` | Solution: `DL380_Gen11 CTO Server`):
   - **Rule**: undefined
   - **Affected SKU**: `write-cach` | **Required Dependency**: `P48918-B21`


## 🔒 3b. Physical & Architectural Gating Rules (DOM Unavailable Tables)

*No portal-conditional gating rules detected in default DOM state.*

## ⚠️ 4. Discontinued & Obsolete SKUs Registry

### Fully Discontinued & Delisted SKUs

| SKU | Description | Status | Discontinued Date | Last Known Price | Successor SKU | Tracking |
|-----|-------------|--------|-------------------|------------------|---------------|----------|
| `P52534-B21` | HPE ProLiant DL380 Gen11 8SFF Configure-to-order Server | **REINSTATED** | 2026-09-09 | $1650.00 | None | STOPPED_AFTER_REMOVAL |
| `P52535-B21` | HPE ProLiant DL380 Gen11 24SFF Configure-to-order Server | **REINSTATED** | 2026-09-09 | $2100.00 | None | STOPPED_AFTER_REMOVAL |
| `P52536-B21` | HPE ProLiant DL380 Gen11 24EDSFF Configure-to-order Server | **REINSTATED** | 2026-09-09 | $2250.00 | None | STOPPED_AFTER_REMOVAL |
| `P52537-B21` | HPE ProLiant DL380 Gen11 8SFF NVMe Configure-to-order Server | **DISCONTINUED** | 2026-09-09 | $2050.00 | None | STOPPED_AFTER_REMOVAL |
| `P52532-B21` | HPE ProLiant DL380 Gen11 8LFF Configure-to-order Server | **REINSTATED** | 2026-09-09 | $1750.00 | None | STOPPED_AFTER_REMOVAL |
| `P52533-B21` | HPE ProLiant DL380 Gen11 12LFF Configure-to-order Server | **REINSTATED** | 2026-09-09 | $1900.00 | None | STOPPED_AFTER_REMOVAL |
| `469774-409` | HPE Remove Standard Power Cords | **DISCONTINUED** | 2026-09-10 | $1.00 | None | STOPPED_AFTER_REMOVAL |
| `P22020-B21` | HPE DL38X Gen10 Plus 2U Cable Management Arm for Rail Kit | **REINSTATED** | 2026-08-28 | $89.00 | None | LIFECYCLE_RETAINED |
| `P48819-B21` | HPE ProLiant DL380 Gen11 System Insight Display Kit | **REINSTATED** | 2026-09-10 | $100.00 | None | STOPPED_AFTER_REMOVAL |
| `P52341-B21` | HPE ProLiant DL3XX Gen11 Easy Install Rail 3 Kit | **REINSTATED** | 2026-08-28 | $164.00 | None | LIFECYCLE_RETAINED |
| `P77110-B21` | Microsoft Windows Server 2025 1 User CAL WW LTU | **DISCONTINUED** | 2026-09-10 | $72.00 | None | STOPPED_AFTER_REMOVAL |
| `P77111-B21` | Microsoft Windows Server 2025 1 Device CAL WW LTU | **DISCONTINUED** | 2026-09-10 | $52.00 | None | STOPPED_AFTER_REMOVAL |
| `P77112-B21` | Microsoft Windows Server 2025 5 Users CAL WW LTU | **DISCONTINUED** | 2026-09-10 | $322.00 | None | STOPPED_AFTER_REMOVAL |
| `P77113-B21` | Microsoft Windows Server 2025 5 Devices CAL WW LTU | **DISCONTINUED** | 2026-09-10 | $226.00 | None | STOPPED_AFTER_REMOVAL |
| `P77114-B21` | Microsoft Windows Server 2025 10 Users CAL WW LTU | **DISCONTINUED** | 2026-09-10 | $636.00 | None | STOPPED_AFTER_REMOVAL |
| `P77115-B21` | Microsoft Windows Server 2025 10 Devices CAL WW LTU | **DISCONTINUED** | 2026-09-10 | $444.00 | None | STOPPED_AFTER_REMOVAL |
| `P77116-B21` | Microsoft Windows Server 2025 50 Users CAL WW LTU | **DISCONTINUED** | 2026-09-10 | $3143.00 | None | STOPPED_AFTER_REMOVAL |
| `P77117-B21` | Microsoft Windows Server 2025 50 Devices CAL WW LTU | **DISCONTINUED** | 2026-09-10 | $2184.00 | None | STOPPED_AFTER_REMOVAL |
| `P77118-B21` | Microsoft Windows Server 2025 Remote Desktop Service 1 User CAL WW LTU | **DISCONTINUED** | 2026-09-10 | $280.00 | None | STOPPED_AFTER_REMOVAL |
| `P77119-B21` | Microsoft Windows Server 2025 Remote Desktop Service 1 Device CAL WW LTU | **DISCONTINUED** | 2026-09-10 | $201.00 | None | STOPPED_AFTER_REMOVAL |
| `P77120-B21` | Microsoft Windows Server 2025 Remote Desktop Service 5 Users CAL WW LTU | **DISCONTINUED** | 2026-09-10 | $1364.00 | None | STOPPED_AFTER_REMOVAL |
| `P77121-B21` | Microsoft Windows Server 2025 Remote Desktop Service 5 Devices CAL WW LTU | **DISCONTINUED** | 2026-09-10 | $974.00 | None | STOPPED_AFTER_REMOVAL |
| `P77122-B21` | Microsoft Windows Server 2025 Remote Desktop Service 50 Users CAL WW LTU | **DISCONTINUED** | 2026-09-10 | $13566.00 | None | STOPPED_AFTER_REMOVAL |
| `P77123-B21` | Microsoft Windows Server 2025 Remote Desktop Service 50 Devices CAL WW LTU | **DISCONTINUED** | 2026-09-10 | $9666.00 | None | STOPPED_AFTER_REMOVAL |
| `P46191-AA1` | Microsoft Windows Server 2022 1 User CAL Chinese Simplified LTU | **DISCONTINUED** | 2026-09-10 | $99999.00 | None | STOPPED_AFTER_REMOVAL |
| `P46191-B21` | Microsoft Windows Server 2022 1 User CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | **DISCONTINUED** | 2026-09-10 | $55.00 | None | STOPPED_AFTER_REMOVAL |
| `P46194-B21` | Microsoft Windows Server 2022 1 Device CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | **DISCONTINUED** | 2026-09-10 | $44.00 | None | STOPPED_AFTER_REMOVAL |
| `P46215-AA1` | Microsoft Windows Server 2022 5 Users CAL Chinese Simplified LTU | **DISCONTINUED** | 2026-09-10 | $99999.00 | None | STOPPED_AFTER_REMOVAL |
| `P46215-AB1` | Microsoft Windows Server 2022 5 Users CAL Chinese Traditional LTU | **DISCONTINUED** | 2026-09-10 | $99999.00 | None | STOPPED_AFTER_REMOVAL |
| `P46215-B21` | Microsoft Windows Server 2022 5 Users CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | **DISCONTINUED** | 2026-09-10 | $271.00 | None | STOPPED_AFTER_REMOVAL |
| `P46216-B21` | Microsoft Windows Server 2022 5 Devices CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | **DISCONTINUED** | 2026-09-10 | $216.00 | None | STOPPED_AFTER_REMOVAL |
| `P46217-B21` | Microsoft Windows Server 2022 10 Users CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | **DISCONTINUED** | 2026-09-10 | $539.00 | None | STOPPED_AFTER_REMOVAL |
| `P46218-B21` | Microsoft Windows Server 2022 10 Devices CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | **DISCONTINUED** | 2026-09-10 | $429.00 | None | STOPPED_AFTER_REMOVAL |
| `P46219-B21` | Microsoft Windows Server 2022 50 Users CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | **DISCONTINUED** | 2026-09-10 | $2695.00 | None | STOPPED_AFTER_REMOVAL |
| `P46220-B21` | Microsoft Windows Server 2022 50 Devices CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | **DISCONTINUED** | 2026-09-10 | $2145.00 | None | STOPPED_AFTER_REMOVAL |
| `P46221-B21` | Microsoft Windows Server 2022 RDS 5 Users CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | **DISCONTINUED** | 2026-09-10 | $935.00 | None | STOPPED_AFTER_REMOVAL |
| `P46222-B21` | Microsoft Windows Server 2022 RDS 5 Devices CAL en/cs/de/es/fr/it/nl/pl/pt/ru/sv/ko/ja/xc LTU | **DISCONTINUED** | 2026-09-10 | $880.00 | None | STOPPED_AFTER_REMOVAL |
| `AC120A` | HPE Pallet Size Customization Service | **REINSTATED** | 2026-08-28 | $7.00 | None | LIFECYCLE_RETAINED |
| `AC121A` | Non Working Day Delivery SVC | **REINSTATED** | 2026-08-28 | $104.00 | None | LIFECYCLE_RETAINED |
| `AC129A` | HPE Consolidation Logistic Service | **REINSTATED** | 2026-08-28 | $26.00 | None | LIFECYCLE_RETAINED |
| `P1F69A` | HPE Delivery Site Above Ground Floor Service | **REINSTATED** | 2026-08-28 | $289.00 | None | LIFECYCLE_RETAINED |
| `P1F70A` | HPE Forklift at Delivery Service | **REINSTATED** | 2026-08-28 | $1399.00 | None | LIFECYCLE_RETAINED |
| `P1F71A` | HPE Special Delivery Truck Size Service | **REINSTATED** | 2026-08-28 | $292.00 | None | LIFECYCLE_RETAINED |
| `P1F72A` | HPE Two People at Delivery SVC | **REINSTATED** | 2026-08-28 | $466.00 | None | LIFECYCLE_RETAINED |
| `P1F73A` | HPE Campus Delivery Service | **REINSTATED** | 2026-08-28 | $104.00 | None | LIFECYCLE_RETAINED |
| `P1F74A` | HPE Unloading Logistic Service | **REINSTATED** | 2026-08-28 | $350.00 | None | LIFECYCLE_RETAINED |
| `P1F75A` | HPE Fixed Delivery Appointment Service | **REINSTATED** | 2026-08-28 | $466.00 | None | LIFECYCLE_RETAINED |
| `AC123A` | HPE Special Request/ Equipment Logistic Service | **REINSTATED** | 2026-08-28 | $816.00 | None | LIFECYCLE_RETAINED |
| `BQ335A` | HPE Expedite Shipment Small Logistic Service | **REINSTATED** | 2026-08-28 | $44.00 | None | LIFECYCLE_RETAINED |
| `BQ337A` | HPE Expedite Shipment Large Logistic Service | **REINSTATED** | 2026-08-28 | $100.00 | None | LIFECYCLE_RETAINED |
| `P1F77A` | HPE Post-Delivery Waste Removal SVC | **REINSTATED** | 2026-08-28 | $116.00 | None | LIFECYCLE_RETAINED |

### ⏳ Impending Obsolescence & Clearance Hardware (90-Day to 180-Day Window)

*These components remain orderable in live configurators today but have published vendor end dates. They represent high-value clearance opportunities for immediate deployments, but require explicit procurement cutoff remarks before quotation:*

| Product # | Description | Category | List Price (USD) | Discontinued Date | Price Trend | Presales Strategy Guidance |
|---|---|---|---:|---|:---:|---|
| `P52532-B21` | HPE ProLiant DL380 Gen11 8LFF NC Configure-to-order Server | Chassis | $1,750 | 2026-09-09 | 0.00% | ⚠️ Approaching EOL (2026-09-09). Valid for immediate builds; verify multi-year roadmaps. |
| `P52533-B21` | HPE ProLiant DL380 Gen11 12LFF NC Configure-to-order Server | Chassis | $1,900 | 2026-09-09 | 0.00% | ⚠️ Approaching EOL (2026-09-09). Valid for immediate builds; verify multi-year roadmaps. |
| `P52534-B21` | HPE ProLiant DL380 Gen11 8SFF NC Configure-to-order Server | Chassis | $1,650 | 2026-09-09 | 0.00% | ⚠️ Approaching EOL (2026-09-09). Valid for immediate builds; verify multi-year roadmaps. |
| `P52535-B21` | HPE ProLiant DL380 Gen11 24SFF NC Configure-to-order Server | Chassis | $2,100 | 2026-09-09 | 0.00% | ⚠️ Approaching EOL (2026-09-09). Valid for immediate builds; verify multi-year roadmaps. |
| `P52536-B21` | HPE ProLiant DL380 Gen11 12EDSFF NC Configure-to-order Server | Chassis | $2,250 | 2026-09-09 | 0.00% | ⚠️ Approaching EOL (2026-09-09). Valid for immediate builds; verify multi-year roadmaps. |
| `P49653-B21` | Intel Xeon-Gold 5416S 2.0GHz 16-core 150W Processor for HPE | Processor | $3,017 | 02/28/2027 | 0.00% | ⚠️ Approaching EOL (02/28/2027). Valid for immediate builds; verify multi-year roadmaps. |
| `P49605-B21` | Intel Xeon-Platinum 8468 2.1GHz 48-core 350W Processor for HPE | Processor | $15,149 | 10/31/2026 | 0.00% | ⚠️ Approaching EOL (10/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P49607-B21` | Intel Xeon-Platinum 8480+ 2.0GHz 56-core 350W Processor for HPE | Processor | $20,242 | 10/31/2026 | 0.00% | ⚠️ Approaching EOL (10/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P49615-B21` | Intel Xeon-Gold 6438Y+ 2.0GHz 32-core 205W Processor for HPE | Processor | $11,104 | 10/31/2026 | 0.00% | ⚠️ Approaching EOL (10/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P49616-B21` | Intel Xeon-Platinum 8452Y 2.0GHz 36-core 300W Processor for HPE | Processor | $8,390 | 10/31/2026 | 0.00% | ⚠️ Approaching EOL (10/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P49597-B21` | Intel Xeon-Gold 5415+ 2.9GHz 8-core 150W Processor for HPE | Processor | $4,164 | 10/31/2026 | 0.00% | ⚠️ Approaching EOL (10/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P49598-B21` | Intel Xeon-Gold 6426Y 2.5GHz 16-core 185W Processor for HPE | Processor | $5,789 | 10/31/2026 | 0.00% | ⚠️ Approaching EOL (10/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P49599-B21` | Intel Xeon-Gold 6442Y 2.6GHz 24-core 225W Processor for HPE | Processor | $9,811 | 10/31/2026 | 0.00% | ⚠️ Approaching EOL (10/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P49601-B21` | Intel Xeon-Gold 6434 3.7GHz 8-core 195W Processor for HPE | Processor | $8,463 | 10/31/2026 | 0.00% | ⚠️ Approaching EOL (10/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P49602-B21` | Intel Xeon-Gold 6444Y 3.6GHz 16-core 270W Processor for HPE | Processor | $12,574 | 10/31/2026 | 0.00% | ⚠️ Approaching EOL (10/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P49603-B21` | Intel Xeon-Platinum 8462Y+ 2.8GHz 32-core 300W Processor for HPE | Processor | $12,584 | 10/31/2026 | 0.00% | ⚠️ Approaching EOL (10/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P49611-B21` | Intel Xeon-Silver 4416+ 2.0GHz 20-core 165W Processor for HPE | Processor | $4,593 | 10/31/2026 | 0.00% | ⚠️ Approaching EOL (10/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P49614-B21` | Intel Xeon-Gold 6430 2.1GHz 32-core 270W Processor for HPE | Processor | $4,933 | 12/31/2026 | 0.00% | ⚠️ Approaching EOL (12/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P49639-B21` | Intel Xeon-Gold 5411N 1.9GHz 24-core 165W Processor for HPE | Processor | $4,736 | 10/31/2026 | 0.00% | ⚠️ Approaching EOL (10/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P49641-B21` | Intel Xeon-Gold 6421N 1.8GHz 32-core 185W Processor for HPE | Processor | $7,241 | 10/31/2026 | 0.00% | ⚠️ Approaching EOL (10/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P49645-B21` | Intel Xeon-Platinum 9462 2.7GHz 32-core 350W Processor for HPE | Processor | $24,445 | 10/31/2026 | 0.00% | ⚠️ Approaching EOL (10/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P67102-B21` | Intel Xeon-Platinum 8558U 2.0GHz 48-core 300W Processor for HPE | Processor | $11,375 | 10/31/2026 | 0.00% | ⚠️ Approaching EOL (10/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P74216-B21` | SKH 32G 2Rx8 5600B-R Spl Smart FIO Kit | Accessories & Infrastructure | $20,606 | 10/31/2026 | 0.00% | ⚠️ Approaching EOL (10/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P74346-B21` | SKH 64G 2Rx4 5600B-R Spl Smart FIO Kit | Accessories & Infrastructure | $42,269 | 10/31/2026 | 0.00% | ⚠️ Approaching EOL (10/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
| `P56076-B21` | HPE ProLiant DL380 Gen11 20EDSFF FIO Bundle Kit | Accessories & Infrastructure | $1 | 10/31/2026 | 0.00% | ⚠️ Approaching EOL (10/31/2026). Valid for immediate builds; verify multi-year roadmaps. |
*... [52 additional impending EOL records omitted for brevity]*

## 📊 5b. Category-Level Trends & Significant Price Adjustments

### Category Portfolio Delta & Planning Intelligence

| Category | Total SKUs | Added | Modified | Unchanged | Clearance / Drops | Category Planning Insight |
|---|---:|---:|---:|---:|---:|---|
| **Chassis** | 5 | 0 | 5 | 0 | 0 | 🔄 Attributes/specifications updated (5 SKUs) |
| **Accessories & Infrastructure** | 37 | 0 | 37 | 0 | 0 | 🔄 Attributes/specifications updated (37 SKUs) |
| **Processor** | 70 | 0 | 70 | 0 | 0 | 🔄 Attributes/specifications updated (70 SKUs) |
| **Cooling / Thermal** | 10 | 0 | 10 | 0 | 0 | 🔄 Attributes/specifications updated (10 SKUs) |
| **Memory** | 33 | 0 | 33 | 0 | 0 | 🔄 Attributes/specifications updated (33 SKUs) |
| **Cables & Enablement Kits** | 47 | 1 | 46 | 0 | 0 | ✨ Portfolio expanding (+1 new options) |
| **Drive Enclosures / Drives** | 62 | 0 | 62 | 0 | 0 | 🔄 Attributes/specifications updated (62 SKUs) |
| **Software & Licenses** | 356 | 141 | 215 | 0 | 0 | ✨ Portfolio expanding (+141 new options) |
| **Storage Controllers** | 20 | 3 | 17 | 0 | 0 | ✨ Portfolio expanding (+3 new options) |
| **PCIe Risers** | 14 | 0 | 14 | 0 | 0 | 🔄 Attributes/specifications updated (14 SKUs) |
| **Networking** | 78 | 11 | 67 | 0 | 0 | ✨ Portfolio expanding (+11 new options) |
| **OS Boot Device** | 3 | 0 | 3 | 0 | 0 | 🔄 Attributes/specifications updated (3 SKUs) |
| **Graphics & GPU** | 15 | 12 | 3 | 0 | 0 | ✨ Portfolio expanding (+12 new options) |
| **Power Supplies** | 2 | 0 | 2 | 0 | 0 | 🔄 Attributes/specifications updated (2 SKUs) |
| **HPE Compute Ops Management** | 1 | 1 | 0 | 0 | 0 | ✨ Portfolio expanding (+1 new options) |

### High-Impact Price Adjustments (Drops $\ge 10\%$ and Major Moves)

| Product # | Description | Category | Previous Price | Current Price | Delta (USD) | Change (%) | Movement Type |
|---|---|---|---:|---:|---:|---:|---|
| `R7Q02A` | HPE SGLX Prem Media | Software & Licenses | New Addition | $50 | $50 | **+100.0%** | ✨ NEW_OPTION |
| `R8V48A` | HPE Serviceguard for Linux x86 Flex Storage Add-On Media | Software & Licenses | New Addition | $50 | $50 | **+100.0%** | ✨ NEW_OPTION |
| `S2D02A` | VMware vSAN Standard Term per Core 1-year LTU | Software & Licenses | New Addition | $85 | $85 | **+100.0%** | ✨ NEW_OPTION |
| `R1P40A` | Red Hat Enterprise Linux for HPC Compute Node 1yr Subscription Flexible LTU | Software & Licenses | New Addition | $87 | $87 | **+100.0%** | ✨ NEW_OPTION |
| `S2C92A` | VMware vSphere Standard Term per Core 3-year LTU | Software & Licenses | New Addition | $89 | $89 | **+100.0%** | ✨ NEW_OPTION |
| `R1C65A` | HPE C13-C14 IN 250V 10Amp 2m Black Jumper Cord | Cables & Enablement Kits | New Addition | $119 | $119 | **+100.0%** | ✨ NEW_OPTION |
| `S2C96A` | VMware vSphere Enterprise Plus with Tanzu Kubernetes Grid Term per Core 1-year LTU | Software & Licenses | New Addition | $140 | $140 | **+100.0%** | ✨ NEW_OPTION |
| `S2C94A` | VMware vSphere Standard Term per Core 5-year LTU | Software & Licenses | New Addition | $145 | $145 | **+100.0%** | ✨ NEW_OPTION |
| `S2D04A` | VMware vSAN Standard Term per Core 3-year LTU | Software & Licenses | New Addition | $180 | $180 | **+100.0%** | ✨ NEW_OPTION |
| `S0E37A` | Intel Virtual RAID on CPU Standard FIO Software for HPE | Storage Controllers | New Addition | $229 | $229 | **+100.0%** | ✨ NEW_OPTION |
| `S3Q19A` | Intel Virtual RAID on CPU RAID 1 FIO Software for HPE | Storage Controllers | New Addition | $229 | $229 | **+100.0%** | ✨ NEW_OPTION |
| `R1P41A` | Red Hat Enterprise Linux for HPC Compute Node 3yr Subscription Flexible LTU | Software & Licenses | New Addition | $248 | $248 | **+100.0%** | ✨ NEW_OPTION |
| `S2D09A` | VMware vSAN Advanced Term per Core 3-year LTU | Software & Licenses | New Addition | $285 | $285 | **+100.0%** | ✨ NEW_OPTION |
| `S2D06A` | VMware vSAN Standard Term per Core 5-year LTU | Software & Licenses | New Addition | $300 | $300 | **+100.0%** | ✨ NEW_OPTION |
| `S2C98A` | VMware vSphere Enterprise Plus with Tanzu Kubernetes Grid Term per Core 3-year LTU | Software & Licenses | New Addition | $300 | $300 | **+100.0%** | ✨ NEW_OPTION |
| `R7J57A` | Intel Virtual RAID on CPU Premium FIO Software for HPE | Storage Controllers | New Addition | $371 | $371 | **+100.0%** | ✨ NEW_OPTION |
| `R2A00A` | Red Hat Satellite 2 Sockets or 2 Guests 1yr Subscription Flexible LTU | Software & Licenses | New Addition | $385 | $385 | **+100.0%** | ✨ NEW_OPTION |
| `S2D13A` | VMware vSAN Enterprise Term per Core 3-year LTU | Software & Licenses | New Addition | $405 | $405 | **+100.0%** | ✨ NEW_OPTION |
| `R8R77A` | SUSE Linux Enterprise Server HPC 1-2 Sockets 3-year Subscription 24x7 Support LTU | Software & Licenses | New Addition | $408 | $408 | **+100.0%** | ✨ NEW_OPTION |
| `R1P42A` | Red Hat Enterprise Linux for HPC Compute Node 5yr Subscription Flexible LTU | Software & Licenses | New Addition | $413 | $413 | **+100.0%** | ✨ NEW_OPTION |
*... [130 additional price movements omitted for brevity]*

## 🔄 5. Recent Attribute & Specification Modifications Log

| Timestamp | SKU | Attribute | Old Value | New Value |
|-----------|-----|-----------|-----------|-----------|
| 2026-09-10 | `631348-B21` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `631358-B21` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `631360-B21` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `631362-B21` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `631364-B21` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `638212-B21` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `638214-B21` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `672097-103` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `672097-113` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `672097-133` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `672097-143` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `672097-223` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `672097-353` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `672097-373` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `672097-B33` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `672097-D63` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `672097-KD3` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `P39103-B21` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `P55209-B21` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `P03178-B21` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `P38995-B21` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `P38997-B21` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `P17023-B21` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `P36877-B21` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |
| 2026-09-10 | `P48819-B21` | Vendor Attributes | {"Extended Price (USD)":"0"} | **{"Extended Price (USD)":"NA"}** |

## 🧩 6. Same-Product CTO Variant Matrix

| Chassis Identifier | Product Family | Generation | Form Factor | CTO Base SKU |
|--------------------|----------------|------------|-------------|--------------|
| **DL380_Gen11** | ProLiant | Gen11 | 8SFF | `P52534-B21` |

## ⏱️ 10. Supply Chain & Delivery Lead Time Intelligence

### Confirmed Component Delivery SLAs

| Product # | Description | Category | Lead Time | Channel Status |
|---|---|---|---:|---|
| `P52532-B21` | HPE ProLiant DL380 Gen11 8LFF NC Configure-to-order Server | Chassis | EDT 27 - 34 days | Available in OCA product catalog |

