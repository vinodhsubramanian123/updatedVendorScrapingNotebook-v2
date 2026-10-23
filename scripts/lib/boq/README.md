# BOQ Engine Subsystem (`scripts/lib/boq/`)

## 1. Purpose & Scope
Handles parsing, preprocessing, validation, physical evaluation, budget optimization, commercial value engineering, tender quantity conservation, and Excel export for customer Bills of Materials (BOQs) and Vendor Quotes.

## 2. Key Modules by Operational Domain

### Core Parsing & Preprocessing
| Module | Main Exports | Purpose |
|---|---|---|
| `boq_parser.js` | `extractSkus()`, `parseBoqLine()` | Shared regex extraction and token normalization (Single Source of Truth). |
| `boq_preprocessor.js` | `preprocessBoq()` | Ingests CSV, XLSX, and text BOQs; groups lines, normalizes quantities, filters noise. |
| `configuration_context.js` | `outputQuantities()`, `normalizeConfigQuantities()` | Context-aware per-node vs aggregate quantity projection (`INV-29`). |
| `requirement_intent_resolver.js` | `resolveRequirementIntents()` | Translates natural language customer requests into structured component intents. |

### Physical & Domain Evaluation
| Module | Main Exports | Purpose |
|---|---|---|
| `boq_evaluator.js` | `evaluateBoqAgainstCatalog()` | Coordinates physical aspect checkers against catalog rules, circuit breakers, and telemetry. |
| `san_switch_evaluator.js` | `evaluateSanSwitch()` | Specialized evaluator for Fibre Channel SAN switches (SN3600B) verifying licensed ports & optics. |
| `solution_topology.js` | `classifySolutionTopology()` | Maps product families to owned roles (compute, storage, fabric, frame) before quantity math. |
| `bundle_composition.js` | `evaluateBundleComposition()` | Evaluates bundled appliance chassis compositions and CTO factory inclusions. |
| `multi_child_evaluation.js` | `evaluateMultiChildHierarchy()` | Validates complex parent-child enclosure hierarchies and option dependencies. |

### Verification, Acceptance Gates & Quantity Conservation
| Module | Main Exports | Purpose |
|---|---|---|
| `bom_verifier.js` | `validateBoqEvaluationCriteria()` | 18-point pre-presentation acceptance gate (B1–B18) and universal criteria (U1–U6). |
| `acceptance_gate.js` | `evaluateAcceptanceGate()`, `issueDeliveryAuthorization()` | Cryptographic pre-presentation delivery authorization (`INV-128`). |
| `quantity_conservation.js` | `buildUniversalQuantityConservationLedger()` | Line-by-line tender quantity conservation engine and deficit delivery gate (`INV-192`, `INV-196`). |
| `solution_evidence.js` | `solutionFingerprint()`, `candidateReviewCurrent()` | Binds canonical manifest fingerprints and verifies NotebookLM double-check freshness. |
| `vendor_bom_verifier.js` | `verifyVendorBom()` | Cross-verifies vendor quote SKUs against promoted catalog rules and detects missing base options. |
| `pricing_presence.js` | `auditPricingPresence()` | Verifies list price and quoted price integrity without coercing nulls to zero (`INV-33`). |
| `portal_receipt.js` | `readPortalReceipt()`, `receiptMatches()` | Ingests and binds authenticated live HPE OCA/CLIC receipts. |

### Multi-Cluster Sizing & Decomposition
| Module | Main Exports | Purpose |
|---|---|---|
| `multi_cluster_splitter.js` | `analyzeAndPartitionClusters()`, `splitAndWriteClusterWorkbooks()` | Decomposes multi-node tenders into buildable clusters with rack RU and power sizing (`INV-29`). |
| `multi_group_plan.js` | `planMultiGroupClusters()` | Generates multi-group node allocation plans. |
| `multi_facility_summary.js` | `summarizeFacilityInfrastructure()` | Computes peak facility power envelopes (kW), utility derating, and rack counts. |

### Presales Planning, Disambiguation & Rules
| Module | Main Exports | Purpose |
|---|---|---|
| `presales_query_planner.js` | `planPresalesQuery()` | Classifies presales intent and constructs optimal execution plans. |
| `presales_query_plan_rules.js` | `QUERY_PLAN_RULES` | Declarative classification heuristics and tool selection rules. |
| `presales_disambiguation.js` | `disambiguatePresalesContext()` | Surfaces up-front clarifying questions when confidence $< 0.95$. |
| `presales_response_profiles.js` | `PRESALES_RESPONSE_PROFILES` | Structured presentation templates for presales personas. |
| `presales_response_validator.js` | `validatePresalesResponse()` | Validates response completeness against presales contract. |
| `presales_query_shadow.js` | `runShadowEvaluation()` | Executes shadow validation runs for quality assurance. |
| `platform_disambiguation_prompt.js`| `generateDisambiguationPrompt()` | Generates user prompts for ambiguous chassis/generation selections. |
| `user_platform_selection_store.js` | `recordUserSelection()` | Persists user workflow preferences across sessions (`INV-111`). |

### Commercial Value Engineering & Transformation
| Module | Main Exports | Purpose |
|---|---|---|
| `budget_optimizer.js` | `synthesizeRank5Budget()` | Cost-optimized alternative configs (Rank 5) via component down-binning. |
| `deal_optimizer.js` | `optimizeDealValueEngineering()` | Commercial value engineering evaluating CPU sizing, NIC alignment, and PSU efficiency (`INV-76`). |
| `commercial_remarks.js` | `applyCommercialRemarks()` | Annotates completed reconciliations with auditable commercial remark columns. |
| `delivery_pacing_analyzer.js` | `analyzeDeliveryPacing()` | Identifies component GA wave gaps and factory lead-time pacing bottlenecks (`INV-177`, `INV-180`). |
| `cross_vendor_transformer.js` | `transformCompetitorBom()` | Transpiles Cisco/Dell competitor quotes to evidence-backed HPE equivalents (`INV-190`). |
| `heterogeneous_tender_modernizer.js`| `modernizeHeterogeneousTender()` | Plans mixed-domain hardware tenders and loose-component carrier allocations. |
| `vendor_quote_reconciler.js` | `reconcileVendorQuote()` | Compares customer tender requirements against partner quotes across 4 dimensions. |
| `support_policy.js` | `resolveSupportPolicy()` | Resolves product-specific HPE Tech Care tiers and retention options. |

### Deliverable Generation, Serialization & Discovery Plans
| Module | Main Exports | Purpose |
|---|---|---|
| `generate_boq_xlsx.js` | `exportBoqEvaluationToXlsx()` | Generates standardized 7-column and 12-column customer Excel workbooks. |
| `eval_output_serializer.js` | `serializeEvaluationOutput()` | Serializes evaluation outputs into markdown summaries and JSON evidence traces. |
| `export_tender_to_downloads.js`| `exportTenderToDownloads()` | Safely exports deliverables to user Downloads folder. |
| `runtime_discovery_plan.js` | `buildRuntimeDiscoveryPlan()` | Constructs scoped conditional SKU investigation plans for live portal exploration. |

## 3. Invariants & Data Contracts
- Always uses `isValidHpeSKU()` from `scripts/lib/catalog/sku.js` to eliminate DOM noise.
- Quantity fields must pass safe integer validation (`Number.isSafeInteger(qty) && qty >= 0`).
- Mathematical quantity conservation is strictly enforced via Gate B18 (`INV-192`, `INV-196`).
- Uncertified deliverables lacking `DeliveryAuthorization` are strictly blocked (`INV-128`).
