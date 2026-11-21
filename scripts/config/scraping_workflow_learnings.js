'use strict';
// Workflow advisories only. These must never become inferred hardware dependencies.
module.exports = [
  {
    deltaId: 'LEARN_DL380_GEN12_H200_OBSERVED_STATES_20261001',
    ruleType: 'WORKFLOW_VENDOR_OBSERVATION_ADVISORY', affectedSku: 'S3U30C',
    rawMessage: 'Live OCA evidence on commercial DL380 Gen12 base P73282-B21: S3U30C NVIDIA H200 NVL 141GB was already present in the DOM at selected 30C tracking SKU P79552-B21, but hidden and marked unavailable. Vendor text says H200 NVL and 30C cannot be selected together. At selected 27C tracking SKU P79555-B21 the unavailable flag and restriction disappeared; the collapsed section still hid the row visually. Original 30C was restored. This is two observed selector states, not proof of every lower temperature or final CLIC build acceptance. Evidence: evidence/scraping_review/h200_at_30c_before.json and h200_at_27c.json. Do not compile the 30C prohibition as an allowed <=30C gate.'
  },
  {
    deltaId: 'LEARN_DL380_GEN12_OEM_DEFAULT_20260930',
    ruleType: 'WORKFLOW_OEM_SELECTION_ADVISORY', affectedSku: 'P77819-B21',
    rawMessage: 'OCA observed P77819-B21 as OEM DL380 Gen12 CTO. Preserve it in scoped discovery; a generic commercial DL380 Gen12 request must not automatically choose OEM. P73282-B21 was observed as commercial CTO, not certified as a permanent substitute or live-price guarantee.'
  },
  {
    deltaId: 'LEARN_DL380_GEN12_RUNTIME_DISCOVERY_20260930',
    ruleType: 'WORKFLOW_RUNTIME_DISCOVERY_ADVISORY',
    rawMessage: 'Catalog absence is not proof of unsupported hardware. Investigate missing and conditional BOQ SKUs on the exact base and owning configuration, with the requested quantities and environmental state. Hidden presence establishes observation only. Revalidate each changed manifest in CLIC; a runtime plan does not establish acceptance.'
  },
  {
    deltaId: 'LEARN_DL380_GEN12_COVERAGE_BOUNDARY_20260930',
    ruleType: 'WORKFLOW_CAPTURE_COVERAGE_ADVISORY',
    rawMessage: 'Chassis discovery does not establish traversal. Current automated conditional capture covers hidden DOM and ambient probes; other selector combinations and all-base coverage remain unverified. Unknown recommendation, price and variant capability stay unknown. Do not retire prior NotebookLM sources before replacement verification.'
  },
  {
    deltaId: 'LEARN_CHASSIS_THREE_TIER_DOMAIN_CLASSIFICATION_20261012',
    ruleType: 'WORKFLOW_CHASSIS_CLASSIFICATION_ADVISORY',
    rawMessage: 'Use the registered product and its component role for catalog coverage. Server and compute-module catalogs require processor and memory options where specified by their profile. Shared-enclosure power belongs to the owning frame. Validate switch, fabric and tape catalogs against their own profile rather than server categories (INV-158).'
  },
  {
    deltaId: 'LEARN_UNIVERSAL_ACCESSORY_SCOPE_ISOLATION_20261012',
    ruleType: 'WORKFLOW_SCOPE_ISOLATION_ADVISORY', affectedSku: 'P36877-B21',
    rawMessage: 'Passive accessories such as DC lug terminal kits (P36877-B21), power cords, and rail kits are architecture-invariant and span multiple product generations. They must be registered in APPROVED_UNIVERSAL_POLICY_SKUS in product_scope.js to prevent false-positive cross-generation isolation quarantines by the drift engine (INV-159).'
  },
  {
    deltaId: 'LEARN_WEBLOGIC_EXPAND_SECTIONS_COST_CAPTURE_20261012',
    source: 'docs/INVARIANTS.md#inv-161',
    ruleType: 'WORKFLOW_DOM_EXTRACTION_ADVISORY',
    rawMessage: 'WebLogic OCA table expansion in cdp.js must explicitly toggle show_cost alongside show_price and trigger change events on all discovered showmore inputs. Omitting show_cost prevents cost column rendering, leaving tabular price-breakdown structures incomplete (INV-161).'
  },
  {
    deltaId: 'LEARN_BLOCKUI_OPACITY_ZERO_FALSE_POSITIVE_20261120',
    source: 'docs/INVARIANTS.md#inv-254',
    ruleType: 'WORKFLOW_DOM_EXTRACTION_ADVISORY',
    rawMessage: 'WebLogic OCA injects 100+ .blockUI.blockOverlay DIVs with opacity:0 and display:block across all accordion containers, sub-tabs, and panels. These are transparent residual overlays with no visual or functional blocking effect. The globalBusy check in catalog_tab_capture.js MUST NOT match these; only .blockOverlay elements with opacity > 0.1 are truly blocking. Matching by class .blockUI alone causes permanent false-positive busy detection, blocking all tab switching (INV-254). The same applies to .maui-loading-div elements inside .blockMsg containers — they are cosmetic spinners for the blockUI modal, not content loading indicators, and must be excluded from workspace readiness predicates in CONFIG_WORKSPACE_READY_PREDICATE via .closest(".blockMsg, .blockUI") filter.'
  },
  {
    deltaId: 'LEARN_4SOCKET_ENTERPRISE_WORKSPACE_TIMEOUT_20261120',
    source: 'docs/INVARIANTS.md#inv-255',
    ruleType: 'WORKFLOW_TIMING_ADVISORY',
    rawMessage: '4-socket enterprise servers have significantly more configuration options than 2-socket servers (73+ category tables vs ~40). WebLogic takes 30-90 seconds to initialize the configuration workspace after clicking Customize, compared to 5-15 seconds for 2-socket servers. _pollForActiveOcaReadiness must allow at least 45 seconds (not 15s) with 10-second inner wait (not 3s), and _verifyConfigWorkspaceReady must allow 120 seconds (not 60s). These timeouts are universal and safe for all server classes (INV-255).'
  },
  {
    deltaId: 'LEARN_CS_SUPPLY_CONSTRAINT_BADGE_20261120',
    source: 'docs/INVARIANTS.md#inv-256',
    ruleType: 'WORKFLOW_LIFECYCLE_BADGE_ADVISORY', affectedSku: 'P73835-B21',
    rawMessage: 'HPE OCA marks supply-constrained SKUs with [CS] badge (red background, class supply_restricted, tooltip "This SKU is currently unavailable based on supply constraints"). The CS badge must be recognized alongside OB (Obsolete), DS (Direct Ship), EOL, and 90 (90-Day Warning) in field_parsers.js, sku.js, and build_catalog.js. When a customer BOQ contains a CS-badged SKU, the presales advisory must recommend functionally equivalent alternatives with active availability (e.g. green lead-time items). CS maps to lifecycleCanonical "Constrained Supply", vendorSupplyStatus "CONSTRAINED_SUPPLY", and isClearanceOrRestricted true (INV-256).'
  },
  {
    deltaId: 'LEARN_NORMAL_CTO_CARD_PRIORITY_ASYNC_XHR_20261121',
    source: 'docs/INVARIANTS.md#inv-257',
    ruleType: 'WORKFLOW_DOM_EXTRACTION_ADVISORY',
    rawMessage: 'Commercial CTO cards (data-type="cto" without "Smart CTO") must be sorted and prioritized first over Smart CTO cards. OCA change handler executes an async XHR before removing dqe-disabled from the Customize button; a flat timeout causes race conditions. Polling up to 15s with a jQuery change retry at attempt 20 ensures reliable button unlock. In addition, cosmetic .maui-loading-div elements inside .blockMsg or .blockUI overlays must be filtered out during search input wait to prevent artificial timeouts (INV-257).'
  },
  {
    deltaId: 'LEARN_SMART_CTO_WAKEUP_PROTOCOL_20261121',
    source: 'docs/INVARIANTS.md#inv-258',
    ruleType: 'WORKFLOW_DOM_EXTRACTION_ADVISORY',
    rawMessage: 'When HPE OCA renders only a Smart CTO card with _CTOLITE options and no standard CTO card is returned, allowCtolite fallback mode ensures non-empty candidate extraction. If the Select Product dropdown is unselected, auto-selecting the first non-placeholder option triggers the jQuery change event and wakes WebLogic XHR, unlocking the disabled Customize button and preventing unhandled navigation timeouts (INV-258).'
  },
  {
    deltaId: 'LEARN_CS_ANTI_OVERWRITE_AND_OPTION_SUFFIX_20261121',
    source: 'docs/INVARIANTS.md#inv-265',
    ruleType: 'WORKFLOW_LIFECYCLE_BADGE_ADVISORY',
    rawMessage: 'build_catalog.js must preserve extracted [CS], [OB], [DS], [90], and [EOL] lifecycle badges against column-default Active overwrites, partition SOFTWARE_SUBSCRIPTION and SUPPORT_SERVICE rows out of hardware GPU/Transceiver tables, and preserve 6-character hardware localization suffixes such as R7R97A#AC3 ($0.00 No Localization) distinct from the base chassis SKU R7R97A ($19,746.00) while stripping factory FIO tags (#0D1/#OD1/#B19/#B21) (INV-265).'
  },
  {
    deltaId: 'LEARN_ALLETRA_MP_NINJA_CORE_OCA_ADAPTATION_20261121',
    source: 'docs/INVARIANTS.md#inv-266',
    ruleType: 'WORKFLOW_STORAGE_SIZING_HANDOFF_ADVISORY',
    rawMessage: 'For flagship HPE Alletra Storage MP B10000 and X10000, size core storage architecture (controller nodes, Switchless B10100 S0B84A [up to 24 internal drives, 0-3 JBOFs, max 24/72 drives, no backend switches] vs. Switched B10200 S1R06A [0 internal drives, 1-8 mandatory JBOFs, max 384 drives, mandatory backend NVMe-oF switches], NVMe drives, DRR capacity, performance, and power) in HPE Ninja Online (capture_ninja_online_sizing.js) and export OCA JSON. After importing the JSON back into HPE OCA, adapt optical transceivers (SFPs/QSFPs), cabling, and Pointnext/Tech Care support services (Services -> Edit) and run final CLIC validation in OCA. Never mix B101xx switchless and B102xx switched controller nodes (INV-266).'
  },
  {
    deltaId: 'LEARN_COLD_OCA_STEP1_DEFERRED_CLICK_20261121',
    source: 'docs/INVARIANTS.md#inv-266',
    ruleType: 'WORKFLOW_TIMING_ADVISORY',
    rawMessage: 'In navigate_oca.js, _sortAndFilterEligibleCandidates ranks global commercial CTO and Wizard cards ahead of KSA/Disconnected/Add-on variants. To prevent first-time cold WebLogic Step 1 timeouts, _clientSelectDropdownControls checks alreadyReady before re-firing change, buildSelectAndClickExpression defers button.click() via setTimeout(..., 50) so page navigation cannot destroy the CDP evaluation context before returning, and searchAndConfigureChassis uses a 120000ms selection timeout (INV-266).'
  },
  {
    deltaId: 'LEARN_CANONICAL_SPECS_REPLAY_AND_NLM_FAILOVER_20261121',
    source: 'docs/INVARIANTS.md#inv-267',
    ruleType: 'WORKFLOW_CAPTURE_COVERAGE_ADVISORY',
    rawMessage: 'attribute_vectors.js loads multi-vendor matchers from scripts/config/vendors/*/policy.json and materializes compact canonicalSpecs on all active catalog rows for catalog_query_engine.js (Alletra 10k/B10000/X10000, DDR<N>, TDP/core bounds, hardware-only GPU filtering). portfolio_blindspots.js distinguishes PORTAL_COST_COLUMN_UNENTITLED and PRIVATE_UNPRICED/REGIONAL_NA_UNPRICED from zero-price anomalies, and nlm_transport.js fails over from cdp to httpx when headless CDP profile cookies expire after port 18801 disk-token healing (INV-267, INV-268).'
  },
  {
    deltaId: 'LEARN_GEN12_CONSOLIDATED_WORKBOOK_VIEWS_20261121',
    source: 'docs/CATALOG_EVIDENCE_AND_LEARNING.md#release-evidence',
    ruleType: 'WORKFLOW_CAPTURE_COVERAGE_ADVISORY',
    rawMessage: 'For refreshed DL380 Gen12 workbooks, compare active catalog and services SKU coverage and require populated core views. Duplicate or empty accessory and support tabs can disappear when their rows consolidate. Extra tabs cannot substitute for a missing or header-only required view. Verify evaluation preflight against the promoted workbook.'
  },
  {
    deltaId: 'LEARN_NLM_UNIFIED_PROFILE_WMI_PORT_MAP_20261121',
    source: 'docs/INVARIANTS.md#inv-269',
    ruleType: 'WORKFLOW_NLM_AUTH_PERSISTENCE_ADVISORY',
    rawMessage: 'To prevent daily NotebookLM AuthenticationError expiration of rotating Google cookies (__Secure-1PSIDRTS, SIDCC, SNlM0e), nlm_interactive_auth.js (port 18801) and notebooklm-mcp-cli / gemini-notebook-mcp (run_headless_auth) MUST share the unified profile directory ~/.notebooklm-mcp-cli/chrome-profiles/<profile> (with one-time Local State + Default/Network/Cookies migration from %LOCALAPPDATA%\\NlmInteractiveChrome via syncLegacyInteractiveProfile). On Windows, spawnChromeDetached MUST launch Chrome via WMI Win32_Process.Create (without detached:true when windowsHide:true is set on the PowerShell launcher) to escape KILL_ON_JOB_CLOSE, and registerPortMapEntry MUST use netstat.exe -ano -p tcp to write {"18801":{"profile":"default","pid":<pid>}} to ~/.notebooklm-mcp-cli/chrome-port-map.json so find_existing_nlm_chrome and run_headless_auth reuse port 18801 directly without spawning conflicting port 9223 browsers (INV-269).'
  }
];

