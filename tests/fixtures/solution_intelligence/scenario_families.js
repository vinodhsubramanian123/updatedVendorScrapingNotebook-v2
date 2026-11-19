'use strict';
/**
 * tests/fixtures/solution_intelligence/scenario_families.js
 *
 * SI-10 Independently Adjudicated Scenario Families (24 families x 2 splits = 48 scenarios).
 * Separates `dev` vs `held_out` variants per family, covers all 5 Solution Intelligence
 * dimensions cleanly in offline isolated mode, and encodes hand-adjudicated ground truth
 * (never generator-produced prose or writable customer files).
 */

const SCENARIO_SCHEMA_VERSION = '1.0';

const REQUIRED_DIMENSIONS = Object.freeze([
  'CUSTOMER_TRACKS',
  'REQUIREMENTS',
  'EVIDENCE',
  'REASONING',
  'LIFECYCLE_INTERFACES'
]);

const SCENARIO_FAMILIES = Object.freeze([
  // Dimension 1: Customer Tracks (F01-F06)
  { familyId: 'F01', dimension: 'CUSTOMER_TRACKS', name: 'Freeform Q&A Scope & Non-Certification Boundary' },
  { familyId: 'F02', dimension: 'CUSTOMER_TRACKS', name: 'Single-Node BOQ Requirement & Physical Alignment' },
  { familyId: 'F03', dimension: 'CUSTOMER_TRACKS', name: 'RFP / Workload Demand Sizing & Extrapolation Guard' },
  { familyId: 'F04', dimension: 'CUSTOMER_TRACKS', name: 'One vs Two-Baseline Reconciliation & Prerequisites' },
  { familyId: 'F05', dimension: 'CUSTOMER_TRACKS', name: 'OCR Intake-to-Objective Compound Resumption' },
  { familyId: 'F06', dimension: 'CUSTOMER_TRACKS', name: 'Cross-Vendor & Mixed-Domain Modernization' },
  // Dimension 2: Requirements (F07-F11)
  { familyId: 'F07', dimension: 'REQUIREMENTS', name: 'Numeric, Unit & Currency-Qualified Budget Parsing' },
  { familyId: 'F08', dimension: 'REQUIREMENTS', name: 'Negation & Explicit Operation/Hardware Exclusions' },
  { familyId: 'F09', dimension: 'REQUIREMENTS', name: 'Explicit Service SLA & Usable RAID Capacity' },
  { familyId: 'F10', dimension: 'REQUIREMENTS', name: 'Per-Node, Global & Spare Ownership Conservation' },
  { familyId: 'F11', dimension: 'REQUIREMENTS', name: 'Omitted/Unparseable Clauses & Conflicting Bounds Ambiguity' },
  // Dimension 3: Evidence (F12-F16)
  { familyId: 'F12', dimension: 'EVIDENCE', name: 'Wrong-Generation / Wrong-Product Evidence Rejection' },
  { familyId: 'F13', dimension: 'EVIDENCE', name: 'Candidate Self-Citation & Untrusted Input Rejection' },
  { familyId: 'F14', dimension: 'EVIDENCE', name: 'Contradictory Authoritative Sources Preservation' },
  { familyId: 'F15', dimension: 'EVIDENCE', name: 'Stale & Retracted Learned Rule Dependency Invalidation' },
  { familyId: 'F16', dimension: 'EVIDENCE', name: 'Unavailable Inventory & Changed Manifest Receipt Invalidation' },
  // Dimension 4: Reasoning (F17-F20)
  { familyId: 'F17', dimension: 'REASONING', name: 'Infeasible Constraint Diagnosis & Minimal Subset Ablation' },
  { familyId: 'F18', dimension: 'REASONING', name: 'Bounded Feasibility Search & Exhaustion Preservation' },
  { familyId: 'F19', dimension: 'REASONING', name: 'Repair Regression Rollback & Cyclic Evidence Rejection' },
  { familyId: 'F20', dimension: 'REASONING', name: 'Permutation Determinism, Null Cost/EDT & Hard Qualification' },
  // Dimension 5: Lifecycle & Interfaces (F21-F24)
  { familyId: 'F21', dimension: 'LIFECYCLE_INTERFACES', name: 'Offline Air-Gap & Error-Preserving Reflection' },
  { familyId: 'F22', dimension: 'LIFECYCLE_INTERFACES', name: 'Cancellation Discipline & Segregated Learning Consumption' },
  { familyId: 'F23', dimension: 'LIFECYCLE_INTERFACES', name: 'JSON/Markdown/XLSX/MCP Projection Parity & Portal Layout' },
  { familyId: 'F24', dimension: 'LIFECYCLE_INTERFACES', name: 'Direct Export Gate, Fingerprint & Partial Review Rejection' }
]);

const BASE_SERVER_ITEMS = [
  { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', qty: 1, unitPriceUsd: 4200 },
  { sku: 'P49610-B21', description: 'Intel Xeon-Gold 6430 32-core 270W Processor', qty: 2, unitPriceUsd: 2400 },
  { sku: 'P43328-B21', description: 'HPE 64GB 2Rx4 DDR5-5600 Smart Memory Kit', qty: 8, unitPriceUsd: 950 },
  { sku: 'P48820-B21', description: 'HPE DL380 Gen12 High Performance Fan Kit', qty: 1, unitPriceUsd: 260 },
  { sku: 'P38995-B21', description: 'HPE 1600W Flex Slot Titanium Hot Plug Power Supply', qty: 2, unitPriceUsd: 420 },
  { sku: 'HU4A6A5', description: 'HPE 5Y Tech Care Critical Service', qty: 1, unitPriceUsd: 3800 }
];

const SCENARIO_CASES = Object.freeze([
  // ── F01: Freeform Q&A Scope ──
  {
    id: 'SI10-F01-DEV',
    familyId: 'F01',
    dimension: 'CUSTOMER_TRACKS',
    split: 'dev',
    origin: 'synthetic',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'ROUTER_TRACK',
    criticalSafetyGate: false,
    title: 'Freeform Q&A stays distinct from BOM evaluation and offline-safe',
    input: {
      query: 'What is the maximum ambient temperature supported for 280W processors on DL380 Gen12?',
      context: { offline: true },
      expectIntent: 'FREEFORM_QA'
    },
    expected: { intent: 'FREEFORM_QA', allowBuildabilityClaimOnEmpty: false }
  },
  {
    id: 'SI10-F01-HELD',
    familyId: 'F01',
    dimension: 'CUSTOMER_TRACKS',
    split: 'held_out',
    origin: 'anonymized_customer_derived',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'ROUTER_TRACK',
    criticalSafetyGate: true,
    title: 'Freeform Q&A comparison never triggers cross-vendor BOM conversion or false portal acceptance',
    input: {
      query: 'Compare DL380 Gen11 vs DL380 Gen12 PCIe slot lanes for dual GPUs',
      context: { offline: true },
      expectIntent: 'FREEFORM_QA',
      emptyProjectionCheck: true
    },
    expected: { intent: 'FREEFORM_QA', emptyDisposition: 'NOT_EVALUATED', portalStatus: 'PORTAL_VALIDATION_PENDING' }
  },

  // ── F02: Single-Node BOQ Evaluation & Hard Requirement Coverage ──
  {
    id: 'SI10-F02-DEV',
    familyId: 'F02',
    dimension: 'CUSTOMER_TRACKS',
    split: 'dev',
    origin: 'synthetic',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'REQUIREMENT_COVERAGE',
    criticalSafetyGate: true,
    title: 'Single-node Gen12 BOQ satisfies explicit RAM, CPU and SLA requirements',
    input: {
      requirementsText: '1 server node; min 512GB RAM; 5-year Tech Care Critical',
      candidate: { rank: 1, physicalMathClean: true, nodeCount: 1, serverCount: 1, items: BASE_SERVER_ITEMS }
    },
    expected: { totalClauses: 3, accountedClauses: 3, omittedClauses: 0, violatedHard: 0, unresolvedHard: 0, blocksPositive: false }
  },
  {
    id: 'SI10-F02-HELD',
    familyId: 'F02',
    dimension: 'CUSTOMER_TRACKS',
    split: 'held_out',
    origin: 'anonymized_customer_derived',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'REQUIREMENT_COVERAGE',
    criticalSafetyGate: true,
    title: 'Single-node Gen12 BOQ under-provisioned on RAM is blocked from positive certification',
    input: {
      requirementsText: '1 server node; min 1024GB RAM; 5-year Tech Care Critical',
      candidate: { rank: 1, physicalMathClean: true, nodeCount: 1, serverCount: 1, items: BASE_SERVER_ITEMS }
    },
    expected: { totalClauses: 3, accountedClauses: 3, omittedClauses: 0, minViolatedHard: 1, blocksPositive: true }
  },

  // ── F03: RFP / Workload Sizing ──
  {
    id: 'SI10-F03-DEV',
    familyId: 'F03',
    dimension: 'CUSTOMER_TRACKS',
    split: 'dev',
    origin: 'synthetic',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'WORKLOAD_SIZING',
    criticalSafetyGate: false,
    title: 'Supported VMWARE_VCF pilot with explicit working set, cores and N+1 qualifies candidate cluster',
    input: {
      demand: {
        workloadFamily: 'VMWARE_VCF',
        throughputOrConcurrency: { value: 120, unit: 'VMs' },
        workingSetGb: 1024,
        requiredCores: 128,
        resilienceMode: 'N+1',
        provenance: { workingSetGb: 'USER_FACT', requiredCores: 'USER_FACT', resilienceMode: 'USER_FACT' }
      },
      candidate: { totalNodes: 4, perNodeMemoryGb: 512, perNodeCores: 64, numaInterleavingBalanced: true }
    },
    expected: { sizingStatus: 'SIZED_QUALIFIED', isQualified: true, extrapolationRefused: false, nPlus1Verified: true }
  },
  {
    id: 'SI10-F03-HELD',
    familyId: 'F03',
    dimension: 'CUSTOMER_TRACKS',
    split: 'held_out',
    origin: 'anonymized_customer_derived',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'WORKLOAD_SIZING',
    criticalSafetyGate: true,
    title: 'Unprofiled SAP HANA / missing critical demand refuses silent extrapolation',
    input: {
      demand: { workloadFamily: 'SAP_HANA', throughputOrConcurrency: { value: 500, unit: 'users' } },
      candidate: { totalNodes: 2, perNodeMemoryGb: 512, perNodeCores: 64 }
    },
    expected: { isQualified: false, extrapolationRefused: true, hasMissingInputOrUnprofiled: true }
  },

  // ── F04: One vs Two-Baseline Reconciliation ──
  {
    id: 'SI10-F04-DEV',
    familyId: 'F04',
    dimension: 'CUSTOMER_TRACKS',
    split: 'dev',
    origin: 'synthetic',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'COMPOUND_WORKFLOW',
    criticalSafetyGate: false,
    title: 'Two-baseline BOM reconciliation executes with distinct comparison baseline',
    input: {
      query: 'Reconcile customer tender against partner quote BOM and export workbook',
      context: {
        items: [{ sku: 'P73282-B21', quantity: 1 }],
        comparisonItems: [{ sku: 'P73282-B21', quantity: 2 }],
        baselineItems: [{ sku: 'P73282-B21', quantity: 1 }],
        chassisName: 'DL380_Gen12'
      },
      handlers: {
        BOM_RECONCILIATION: async () => ({ auditReport: { is100PercentMatch: false } }),
        WORKBOOK_GENERATION: async () => ({ exported: true })
      }
    },
    expected: { status: 'COMPLETED', singleInvocationEnforced: true, expectedSteps: ['BOM_RECONCILIATION', 'WORKBOOK_GENERATION'] }
  },
  {
    id: 'SI10-F04-HELD',
    familyId: 'F04',
    dimension: 'CUSTOMER_TRACKS',
    split: 'held_out',
    origin: 'anonymized_customer_derived',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'COMPOUND_WORKFLOW',
    criticalSafetyGate: true,
    title: 'Two-baseline reconciliation missing second baseline is blocked instead of fabricated',
    input: {
      query: 'Reconcile customer tender against vendor quote',
      context: { items: [{ sku: 'P73282-B21', quantity: 1 }], chassisName: 'DL380_Gen12' },
      handlers: {}
    },
    expected: { status: 'BLOCKED', blockerCodePresent: true }
  },

  // ── F05: OCR Intake-to-Objective Compound Resumption ──
  {
    id: 'SI10-F05-DEV',
    familyId: 'F05',
    dimension: 'CUSTOMER_TRACKS',
    split: 'dev',
    origin: 'synthetic',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'COMPOUND_WORKFLOW',
    criticalSafetyGate: false,
    title: 'Scanned PDF OCR ingestion resumes into ordered BOQ evaluation and workbook export once per step',
    input: {
      query: 'Ingest scanned PDF quote, evaluate BOQ, and generate workbook',
      context: { inputFile: 'quote_scan.pdf', filePath: 'quote_scan.pdf', chassisName: 'DL380_Gen12', items: [{ sku: 'P73282-B21', quantity: 1 }] },
      handlers: {
        OCR_QUOTE_INGESTION: async () => ({ items: [{ sku: 'P73282-B21', quantity: 1 }] }),
        BOQ_EVALUATION: async () => ({ evaluation: { isMathClean: true } }),
        WORKBOOK_GENERATION: async () => ({ path: 'out.xlsx' })
      }
    },
    expected: { status: 'COMPLETED', singleInvocationEnforced: true, expectedSteps: ['OCR_QUOTE_INGESTION', 'BOQ_EVALUATION', 'WORKBOOK_GENERATION'] }
  },
  {
    id: 'SI10-F05-HELD',
    familyId: 'F05',
    dimension: 'CUSTOMER_TRACKS',
    split: 'held_out',
    origin: 'anonymized_customer_derived',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'COMPOUND_WORKFLOW',
    criticalSafetyGate: true,
    title: 'OCR request without readable file artifact halts with blocked prerequisite',
    input: {
      query: 'Read scanned image quote and evaluate BOM',
      context: { inputModality: { requestedOcr: true }, chassisName: 'DL380_Gen12' },
      handlers: {}
    },
    expected: { status: 'BLOCKED', blockerCodePresent: true }
  },

  // ── F06: Cross-Vendor & Mixed-Domain Modernization ──
  {
    id: 'SI10-F06-DEV',
    familyId: 'F06',
    dimension: 'CUSTOMER_TRACKS',
    split: 'dev',
    origin: 'synthetic',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'COMPOUND_WORKFLOW',
    criticalSafetyGate: true,
    title: 'Cross-vendor conversion without competitor spec or source BOM blocks instead of hallucinating BOM',
    input: {
      query: 'Convert competitor server quote to HPE alternative',
      context: { chassisName: 'DL380_Gen12' },
      handlers: {}
    },
    expected: { status: 'BLOCKED', blockerCodePresent: true }
  },
  {
    id: 'SI10-F06-HELD',
    familyId: 'F06',
    dimension: 'CUSTOMER_TRACKS',
    split: 'held_out',
    origin: 'anonymized_customer_derived',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'INFEASIBILITY_DIAGNOSIS',
    criticalSafetyGate: true,
    title: 'Mixed-domain candidate with missing SAN/switch domain leaves unsupported domain NOT_EVALUATED',
    input: {
      product: 'COMPOSITE_HETEROGENEOUS',
      constraints: [
        { constraintId: 'CONSTR-SERVER-THERMAL', domain: 'compute', status: 'PASS', hardness: 'HARD' },
        { constraintId: 'CONSTR-SWITCH-FABRIC', domain: 'networking', status: 'NOT_EVALUATED', hardness: 'HARD', missingInputs: ['domainProfile'] }
      ]
    },
    expected: { outcome: 'UNKNOWN', notEvaluatedDomains: ['networking'], universalImpossibilityClaimed: false }
  },

  // ── F07: Numeric, Unit & Currency-Qualified Budget Parsing ──
  {
    id: 'SI10-F07-DEV',
    familyId: 'F07',
    dimension: 'REQUIREMENTS',
    split: 'dev',
    origin: 'synthetic',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'REQUIREMENT_ACCOUNTING_PARSE',
    criticalSafetyGate: true,
    title: 'max 64 cores does not trigger budget parsing failure',
    input: {
      requirementsText: '1 server node; min 32 cores; max 64 cores; min 512 GB RAM'
    },
    expected: {
      mustContainMetrics: ['nodeCount', 'cores', 'ramCapacityGb'],
      mustNotContainMetrics: ['budgetUsd'],
      uninterpretedCount: 0,
      hasBlockingAmbiguity: false
    }
  },
  {
    id: 'SI10-F07-HELD',
    familyId: 'F07',
    dimension: 'REQUIREMENTS',
    split: 'held_out',
    origin: 'anonymized_customer_derived',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'REQUIREMENT_COVERAGE',
    criticalSafetyGate: true,
    title: 'Currency-qualified budget $15,000 USD enforces cost violation when candidate costs $16,740',
    input: {
      requirementsText: 'Budget under $15,000',
      candidate: { rank: 1, physicalMathClean: true, nodeCount: 1, serverCount: 1, items: BASE_SERVER_ITEMS, totalCostUsd: 16740, pricingComplete: true }
    },
    expected: { totalClauses: 1, accountedClauses: 1, omittedClauses: 0, minViolatedHard: 1, blocksPositive: true }
  },

  // ── F08: Negation & Explicit Exclusions ──
  {
    id: 'SI10-F08-DEV',
    familyId: 'F08',
    dimension: 'REQUIREMENTS',
    split: 'dev',
    origin: 'synthetic',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'COMPOUND_WORKFLOW',
    criticalSafetyGate: false,
    title: 'Explicit negative instruction "exclude workbook export" prevents export execution',
    input: {
      query: 'Evaluate BOQ and do not generate workbook export',
      context: { items: [{ sku: 'P73282-B21', quantity: 1 }], chassisName: 'DL380_Gen12' },
      handlers: {
        BOQ_EVALUATION: async () => ({ evaluation: { isMathClean: true } }),
        WORKBOOK_GENERATION: async () => { throw new Error('Must not execute excluded export'); }
      }
    },
    expected: { status: 'COMPLETED', mustExcludeOp: 'WORKBOOK_GENERATION', expectedSteps: ['BOQ_EVALUATION'] }
  },
  {
    id: 'SI10-F08-HELD',
    familyId: 'F08',
    dimension: 'REQUIREMENTS',
    split: 'held_out',
    origin: 'anonymized_customer_derived',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'REQUIREMENT_COVERAGE',
    criticalSafetyGate: true,
    title: 'Explicit exclusion of installation service flags candidate containing HA114A1',
    input: {
      requirementsText: 'exclude HA114A1',
      candidate: {
        rank: 1,
        physicalMathClean: true,
        items: [
          ...BASE_SERVER_ITEMS,
          { sku: 'HA114A1', description: 'HPE Hardware Onsite Installation Service', qty: 1, unitPriceUsd: 650 }
        ]
      }
    },
    expected: { totalClauses: 1, accountedClauses: 1, omittedClauses: 0, minViolatedHard: 1, blocksPositive: true }
  },

  // ── F09: Explicit Service SLA & Usable RAID Storage ──
  {
    id: 'SI10-F09-DEV',
    familyId: 'F09',
    dimension: 'REQUIREMENTS',
    split: 'dev',
    origin: 'synthetic',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'REQUIREMENT_COVERAGE',
    criticalSafetyGate: true,
    title: 'RAID 6 5x 3.84TB (19.2TB raw, 11.52TB usable) fails >= 15 TB usable requirement',
    input: {
      requirementsText: '>= 15 TB usable RAID 6',
      candidate: {
        raidLevel: 'RAID 6',
        rank: 1,
        physicalMathClean: true,
        items: [
          ...BASE_SERVER_ITEMS,
          { sku: 'P40500-B21', description: 'HPE 3.84TB NVMe Read Intensive SSD', qty: 5, unitPriceUsd: 1200 }
        ]
      }
    },
    expected: { totalClauses: 1, accountedClauses: 1, omittedClauses: 0, minViolatedHard: 1, blocksPositive: true }
  },
  {
    id: 'SI10-F09-HELD',
    familyId: 'F09',
    dimension: 'REQUIREMENTS',
    split: 'held_out',
    origin: 'anonymized_customer_derived',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'REQUIREMENT_COVERAGE',
    criticalSafetyGate: true,
    title: 'Explicit 5Y Tech Care Critical SLA flags 3Y Basic default substitution as VIOLATED',
    input: {
      requirementsText: '5-year Tech Care Critical with CDMR',
      candidate: {
        rank: 1,
        physicalMathClean: true,
        items: [
          ...BASE_SERVER_ITEMS.slice(0, 5),
          { sku: 'HU4B2A3', description: 'HPE 3Y Tech Care Basic Service', qty: 1, unitPriceUsd: 900 }
        ]
      }
    },
    expected: { totalClauses: 1, accountedClauses: 1, omittedClauses: 0, minViolatedHard: 1, blocksPositive: true }
  },

  // ── F10: Per-Node / Global / Spare Ownership Conservation ──
  {
    id: 'SI10-F10-DEV',
    familyId: 'F10',
    dimension: 'REQUIREMENTS',
    split: 'dev',
    origin: 'synthetic',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'REQUIREMENT_COVERAGE',
    criticalSafetyGate: false,
    title: '2-node cluster with per-node items + 2 spare global optics satisfies conservation without inflation',
    input: {
      requirementsText: '2 server nodes; 512 GB per node; 2 spare 25GbE SFP28 optics shared across cluster',
      baselineItems: [
        { sku: 'P73282-B21', description: 'CTO Server', quantity: 2, quantityBasis: 'total' },
        { sku: 'P43328-B21', description: 'HPE 64GB DDR5-5600 Memory', quantity: 16, quantityBasis: 'total' },
        { sku: '845398-B21', description: 'HPE 25Gb SFP28 SR Optic Transceiver', quantity: 2, quantityScope: 'global', quantityBasis: 'total' }
      ],
      candidate: {
        rank: 1,
        nodeCount: 2,
        serverCount: 2,
        physicalMathClean: true,
        items: [
          { sku: 'P73282-B21', description: 'CTO Server', quantity: 2, perNodeQuantity: 1, quantityBasis: 'total' },
          { sku: 'P43328-B21', description: 'HPE 64GB DDR5-5600 Memory', quantity: 16, perNodeQuantity: 8, quantityBasis: 'total' }
        ],
        sharedInfrastructure: [
          { sku: '845398-B21', description: 'HPE 25Gb SFP28 SR Optic Transceiver', quantity: 2, quantityScope: 'global', quantityBasis: 'total' }
        ]
      }
    },
    expected: { totalClauses: 3, accountedClauses: 3, omittedClauses: 0, violatedHard: 0, blocksPositive: false }
  },
  {
    id: 'SI10-F10-HELD',
    familyId: 'F10',
    dimension: 'REQUIREMENTS',
    split: 'held_out',
    origin: 'anonymized_customer_derived',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'REQUIREMENT_COVERAGE',
    criticalSafetyGate: true,
    title: 'Missing requested global spare optics violates ownership-scoped requirement',
    input: {
      requirementsText: '2 server nodes; 4 spare 25GbE SFP28 optics shared across cluster',
      candidate: {
        rank: 1,
        nodeCount: 2,
        serverCount: 2,
        physicalMathClean: true,
        items: [{ sku: 'P73282-B21', description: 'CTO Server', quantity: 2, perNodeQuantity: 1, quantityBasis: 'total' }],
        sharedInfrastructure: []
      }
    },
    expected: { totalClauses: 2, accountedClauses: 2, omittedClauses: 0, minViolatedHard: 1, blocksPositive: true }
  },

  // ── F11: Omitted / Unparseable Clauses & Ambiguity ──
  {
    id: 'SI10-F11-DEV',
    familyId: 'F11',
    dimension: 'REQUIREMENTS',
    split: 'dev',
    origin: 'synthetic',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'REQUIREMENT_COVERAGE',
    criticalSafetyGate: true,
    title: 'Uninterpretable bespoke clause is accounted with blocking clarification and blocks positive certification',
    input: {
      requirementsText: 'Customer bespoke airflow baffling must meet zone-7 acoustic class',
      candidate: { rank: 1, physicalMathClean: true, serverCount: 1, items: BASE_SERVER_ITEMS }
    },
    expected: { totalClauses: 1, accountedClauses: 1, uninterpretedCount: 1, blocksPositive: true, unresolvedHardMin: 1 }
  },
  {
    id: 'SI10-F11-HELD',
    familyId: 'F11',
    dimension: 'REQUIREMENTS',
    split: 'held_out',
    origin: 'anonymized_customer_derived',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'REQUIREMENT_ACCOUNTING_PARSE',
    criticalSafetyGate: true,
    title: 'Contradictory numeric bounds (min 256GB RAM vs max 128GB RAM) trigger blocking ambiguity',
    input: {
      requirementsText: 'min 256GB RAM per node; max 128GB RAM per node'
    },
    expected: { hasBlockingAmbiguity: true, minAmbiguities: 1, minClarificationQuestions: 1 }
  },

  // ── F12: Wrong-Generation / Wrong-Product Evidence ──
  {
    id: 'SI10-F12-DEV',
    familyId: 'F12',
    dimension: 'EVIDENCE',
    split: 'dev',
    origin: 'synthetic',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'CLAIM_ADJUDICATION',
    criticalSafetyGate: true,
    title: 'Gen11 catalog observation cannot support a DL380 Gen12 material claim',
    input: {
      product: 'DL380_Gen12',
      generation: 'Gen12',
      claim: { assertion: 'Supports 16-pin GPU cable on Gen12', materiality: 'MATERIAL', scope: { product: 'DL380_Gen12', generation: 'Gen12' } },
      evidence: [{ kind: 'CATALOG', sourceId: 'cat-g11', scope: { product: 'DL380_Gen11', generation: 'Gen11' }, passageText: 'Gen11 rule', contentSha256: 'sha-g11' }]
    },
    expected: { overallStatus: 'UNKNOWN', rejectedEvidenceMin: 1, blocksPositive: true }
  },
  {
    id: 'SI10-F12-HELD',
    familyId: 'F12',
    dimension: 'EVIDENCE',
    split: 'held_out',
    origin: 'anonymized_customer_derived',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'CLAIM_ADJUDICATION',
    criticalSafetyGate: true,
    title: 'Synergy 480 Gen11 documentation cannot certify ProLiant DL380 Gen12 claim & B23 blocks approval',
    input: {
      product: 'DL380_Gen12',
      generation: 'Gen12',
      claim: { assertion: 'Synergy frame power covers DL380 Gen12', materiality: 'MATERIAL', scope: { product: 'DL380_Gen12', generation: 'Gen12' } },
      evidence: [{ kind: 'OFFICIAL_DOC', sourceId: 'qs-sy480', scope: { product: 'Synergy_480_Gen11', generation: 'Gen11' }, passageText: 'Synergy 480 frame spec', contentSha256: 'sha-sy' }]
    },
    expected: { overallStatus: 'UNKNOWN', rejectedEvidenceMin: 1, blocksPositive: true, bomVerifierBlocked: true }
  },

  // ── F13: Self-Citation & Untrusted Input Rejection ──
  {
    id: 'SI10-F13-DEV',
    familyId: 'F13',
    dimension: 'EVIDENCE',
    split: 'dev',
    origin: 'synthetic',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'CLAIM_ADJUDICATION',
    criticalSafetyGate: true,
    title: 'Ephemeral candidate self-citation is rejected for material claim support',
    input: {
      product: 'DL380_Gen12',
      generation: 'Gen12',
      ephemeralSourceId: 'ephemeral-cand-01',
      claim: { assertion: 'Candidate is clean', materiality: 'MATERIAL', scope: { product: 'DL380_Gen12', generation: 'Gen12' } },
      evidence: [{ kind: 'UNTRUSTED', sourceId: 'ephemeral-cand-01', scope: { product: 'DL380_Gen12', generation: 'Gen12' }, passageText: 'Candidate CSV row', contentSha256: 'sha-eph', isEphemeral: true }]
    },
    expected: { overallStatus: 'UNKNOWN', rejectedEvidenceMin: 1, blocksPositive: true }
  },
  {
    id: 'SI10-F13-HELD',
    familyId: 'F13',
    dimension: 'EVIDENCE',
    split: 'held_out',
    origin: 'anonymized_customer_derived',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'CLAIM_ADJUDICATION',
    criticalSafetyGate: true,
    title: 'LLM MODEL_PROPOSAL cannot self-certify material claim without authoritative backing',
    input: {
      product: 'DL380_Gen12',
      generation: 'Gen12',
      claim: { assertion: 'PSU wattage sufficient per model proposal', materiality: 'MATERIAL', scope: { product: 'DL380_Gen12', generation: 'Gen12' } },
      evidence: [{ kind: 'MODEL_PROPOSAL', sourceId: 'llm-guess-1', scope: { product: 'DL380_Gen12', generation: 'Gen12' }, passageText: 'Probably compatible', contentSha256: 'sha-mod' }]
    },
    expected: { overallStatus: 'UNKNOWN', rejectedEvidenceMin: 1, blocksPositive: true }
  },

  // ── F14: Contradictory Sources Preservation ──
  {
    id: 'SI10-F14-DEV',
    familyId: 'F14',
    dimension: 'EVIDENCE',
    split: 'dev',
    origin: 'synthetic',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'CLAIM_ADJUDICATION',
    criticalSafetyGate: true,
    title: 'Conflicting authoritative QuickSpecs vs Catalog observations yield CONTRADICTED and preserve both',
    input: {
      product: 'DL380_Gen12',
      generation: 'Gen12',
      claim: { assertion: '280W CPU requires standard heatsink only', materiality: 'MATERIAL', scope: { product: 'DL380_Gen12', generation: 'Gen12' } },
      evidence: [
        { kind: 'CATALOG', sourceId: 'cat-g12', scope: { product: 'DL380_Gen12', generation: 'Gen12' }, passageText: 'Standard heatsink kit sufficient', contentSha256: 'sha-cat', stance: 'SUPPORTING' },
        { kind: 'OFFICIAL_DOC', sourceId: 'qs-g12', scope: { product: 'DL380_Gen12', generation: 'Gen12' }, passageText: 'Requires High Performance Heat Sink Kit above 240W', contentSha256: 'sha-qs', stance: 'OPPOSING' }
      ]
    },
    expected: { overallStatus: 'CONTRADICTED', contradictionCountMin: 1, blocksPositive: true }
  },
  {
    id: 'SI10-F14-HELD',
    familyId: 'F14',
    dimension: 'EVIDENCE',
    split: 'held_out',
    origin: 'anonymized_customer_derived',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'CLAIM_ADJUDICATION',
    criticalSafetyGate: true,
    title: 'Contradicted claim on storage controller cable causes bom_verifier B23 BLOCK',
    input: {
      product: 'DL380_Gen12',
      generation: 'Gen12',
      claim: { assertion: 'Direct attach cable works with 16 SFF SAS drives', materiality: 'MATERIAL', scope: { product: 'DL380_Gen12', generation: 'Gen12' } },
      evidence: [
        { kind: 'DETERMINISTIC', sourceId: 'calc-1', scope: { product: 'DL380_Gen12', generation: 'Gen12' }, passageText: 'Port math requires expander', contentSha256: 'sha-c1', stance: 'OPPOSING' },
        { kind: 'CATALOG', sourceId: 'cat-1', scope: { product: 'DL380_Gen12', generation: 'Gen12' }, passageText: '8-port cable listed', contentSha256: 'sha-c2', stance: 'SUPPORTING' }
      ]
    },
    expected: { overallStatus: 'CONTRADICTED', contradictionCountMin: 1, blocksPositive: true, bomVerifierBlocked: true }
  },

  // ── F15: Stale / Retracted Learned Rule Invalidation ──
  {
    id: 'SI10-F15-DEV',
    familyId: 'F15',
    dimension: 'EVIDENCE',
    split: 'dev',
    origin: 'synthetic',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'DEPENDENCY_INVALIDATION',
    criticalSafetyGate: true,
    title: 'Retracting promoted rule invalidates dependent claim/review/auth while leaving unrelated product VALID',
    input: {
      mode: 'RULE_RETRACTION',
      targetProduct: 'DL380_Gen12',
      unrelatedProduct: 'DL360_Gen12'
    },
    expected: {
      invalidatedAfterRetract: true,
      canGrantAcceptanceAfterRetract: false,
      unrelatedStaysValid: true,
      retractedStopsAffectingCandidates: true
    }
  },
  {
    id: 'SI10-F15-HELD',
    familyId: 'F15',
    dimension: 'EVIDENCE',
    split: 'held_out',
    origin: 'anonymized_customer_derived',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'DEPENDENCY_INVALIDATION',
    criticalSafetyGate: true,
    title: 'Changed source revision + requirement change queue reevaluation & preserve immutable receipt across restart',
    input: {
      mode: 'SOURCE_AND_REQ_CHANGE',
      targetProduct: 'DL380_Gen12',
      unrelatedProduct: 'DL360_Gen12',
      testRestartReload: true
    },
    expected: {
      invalidatedAfterChange: true,
      canGrantAcceptanceAfterChange: false,
      unrelatedStaysValid: true,
      receiptsPreserved: true,
      reloadPreservesStaleState: true
    }
  },

  // ── F16: Unavailable Inventory & Changed Manifest Receipt Invalidation ──
  {
    id: 'SI10-F16-DEV',
    familyId: 'F16',
    dimension: 'EVIDENCE',
    split: 'dev',
    origin: 'synthetic',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'CLAIM_ADJUDICATION',
    criticalSafetyGate: true,
    title: 'Inaccessible inventory prevents material claim support when inventoryStatus is INACCESSIBLE',
    input: {
      product: 'DL380_Gen12',
      generation: 'Gen12',
      inventoryStatus: 'INACCESSIBLE',
      claim: { assertion: 'SKU P73282-B21 orderable inventory verified', materiality: 'MATERIAL', scope: { product: 'DL380_Gen12', generation: 'Gen12' }, claimType: 'INVENTORY_AVAILABILITY' },
      evidence: [{ kind: 'CATALOG', sourceId: 'cat-g12', scope: { product: 'DL380_Gen12', generation: 'Gen12' }, passageText: 'Catalog row', contentSha256: 'sha-g12', stance: 'SUPPORTS' }]
    },
    expected: { overallStatus: 'UNKNOWN', rejectedEvidenceMin: 0, blocksPositive: true }
  },
  {
    id: 'SI10-F16-HELD',
    familyId: 'F16',
    dimension: 'EVIDENCE',
    split: 'held_out',
    origin: 'anonymized_customer_derived',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'REPAIR_TRANSACTION',
    criticalSafetyGate: true,
    title: 'Manifest mutation invalidates ephemeralSourceValidation, portalReceipt, deliveryAuthorization, evidenceStates and acceptanceGate',
    input: {
      mode: 'MANIFEST_INVALIDATION',
      candidateValidation: { errors: [], isValid: true },
      baseline: {
        chassis: 'DL380_Gen12',
        items: [{ sku: 'P73282-B21', quantity: 1 }],
        ephemeralSourceValidation: { success: true },
        portalReceipt: { manifestSha256: 'abc' },
        deliveryAuthorization: { token: 'DELIV-AUTH-old' },
        evidenceStates: { liveVendorAcceptance: 'ACCEPTED_BY_VENDOR' },
        acceptanceGate: { isValid: true }
      },
      delta: [{ action: 'ADD', sku: 'P48820-B21', quantity: 1 }]
    },
    expected: { outcome: 'ACCEPTED', manifestChanged: true, receiptInvalidated: true, expectedClearedFieldsCount: 5 }
  },

  // ── F17: Infeasible Constraints & Minimal Conflicting Set Ablation ──
  {
    id: 'SI10-F17-DEV',
    familyId: 'F17',
    dimension: 'REASONING',
    split: 'dev',
    origin: 'synthetic',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'INFEASIBILITY_DIAGNOSIS',
    criticalSafetyGate: true,
    title: 'Ablation isolates irreducible hard conflict subset without universal impossibility claim',
    input: {
      product: 'DL380_Gen12',
      constraints: [
        { constraintId: 'C-HARD-PSU', domain: 'power', status: 'FAIL', hardness: 'HARD' },
        { constraintId: 'C-HARD-FAN', domain: 'thermal', status: 'PASS', hardness: 'HARD' },
        { constraintId: 'C-PREF-OPTIC', domain: 'networking', status: 'FAIL', hardness: 'PREFERENCE' }
      ],
      incompatibleIds: ['C-HARD-PSU']
    },
    expected: {
      outcome: 'INFEASIBLE_IN_EVALUATED_SCOPE',
      isIrreducible: true,
      minimalSubset: ['C-HARD-PSU'],
      universalImpossibilityClaimed: false
    }
  },
  {
    id: 'SI10-F17-HELD',
    familyId: 'F17',
    dimension: 'REASONING',
    split: 'held_out',
    origin: 'anonymized_customer_derived',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'INFEASIBILITY_DIAGNOSIS',
    criticalSafetyGate: true,
    title: 'Missing ambient input yields UNKNOWN constraint instead of default PASS',
    input: {
      product: 'DL380_Gen12',
      constraints: [
        { constraintId: 'C-HARD-THERMAL', domain: 'thermal', status: 'UNKNOWN', hardness: 'HARD', missingInputs: ['ambientTempC'] }
      ]
    },
    expected: { outcome: 'UNKNOWN', missingInputs: ['ambientTempC'], universalImpossibilityClaimed: false }
  },

  // ── F18: Bounded Search & Exhaustion Preservation ──
  {
    id: 'SI10-F18-DEV',
    familyId: 'F18',
    dimension: 'REASONING',
    split: 'dev',
    origin: 'synthetic',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'BOUNDED_SEARCH',
    criticalSafetyGate: false,
    title: 'Candidate search stops at maxCandidates budget and retains highest-scoring validated candidate',
    input: {
      budget: { maxCandidates: 2, maxIterations: 5, maxElapsedMs: 5000 },
      candidates: [
        { id: 'CAND-1', valid: true, score: 80 },
        { id: 'CAND-2', valid: true, score: 95 },
        { id: 'CAND-3', valid: true, score: 99 }
      ]
    },
    expected: { exhausted: true, candidatesEvaluated: 2, bestCandidateId: 'CAND-2', universalImpossibilityClaimed: false }
  },
  {
    id: 'SI10-F18-HELD',
    familyId: 'F18',
    dimension: 'REASONING',
    split: 'held_out',
    origin: 'anonymized_customer_derived',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'BOUNDED_SEARCH',
    criticalSafetyGate: true,
    title: 'Budget exhaustion across infeasible/unknown candidates never claims universal impossibility',
    input: {
      budget: { maxCandidates: 2, maxIterations: 2, maxElapsedMs: 5000 },
      candidates: [
        { id: 'CAND-A', valid: false, hasUnknown: false, score: 10 },
        { id: 'CAND-B', valid: false, hasUnknown: true, score: 20 },
        { id: 'CAND-C', valid: true, score: 100 }
      ]
    },
    expected: { exhausted: true, candidatesEvaluated: 2, bestCandidateId: null, universalImpossibilityClaimed: false }
  },

  // ── F19: Repair Regression Rollback & Cycle Rejection ──
  {
    id: 'SI10-F19-DEV',
    familyId: 'F19',
    dimension: 'REASONING',
    split: 'dev',
    origin: 'synthetic',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'REPAIR_TRANSACTION',
    criticalSafetyGate: true,
    title: 'Repair introducing new hard violation rolls back atomically and preserves valid baseline',
    input: {
      mode: 'REGRESSION_ROLLBACK',
      baseline: { chassis: 'DL380_Gen12', items: [{ sku: 'P73282-B21', quantity: 1 }, { sku: 'P48820-B21', quantity: 1 }] },
      baselineValidation: { errors: [], violatedHardRequirements: [], isValid: true },
      candidateValidation: { errors: ['CPU > 240W without High Perf Fans'], violatedHardRequirements: ['REQ-THERMAL'], isValid: false },
      delta: [{ action: 'REMOVE', sku: 'P48820-B21', quantity: 1 }]
    },
    expected: { outcome: 'ROLLED_BACK', regressionDetected: true, baselinePreserved: true }
  },
  {
    id: 'SI10-F19-HELD',
    familyId: 'F19',
    dimension: 'REASONING',
    split: 'held_out',
    origin: 'anonymized_customer_derived',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'DEPENDENCY_INVALIDATION',
    criticalSafetyGate: true,
    title: 'Cyclic evidence graph edges (A -> B -> A) are mechanically rejected and cannot grant authority',
    input: {
      mode: 'CYCLE_REJECTION',
      targetProduct: 'DL380_Gen12'
    },
    expected: { cyclicEvidenceRejected: true, canGrantAcceptanceOnCycle: false }
  },

  // ── F20: Deterministic Permutation, Null Cost/Lead Time & Hard Pre-Qualification ──
  {
    id: 'SI10-F20-DEV',
    familyId: 'F20',
    dimension: 'REASONING',
    split: 'dev',
    origin: 'synthetic',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'PARETO_RANKING',
    criticalSafetyGate: true,
    title: 'Cheaper hard-requirement violator is disqualified pre-ranking and input permutation yields identical order',
    input: {
      baselineItems: [{ sku: 'P73282-B21', qty: 1 }, { sku: 'P49610-B21', qty: 2 }],
      candidates: [
        {
          name: 'Cheap Violator',
          costUsd: 6000,
          pricingComplete: true,
          leadTimeDays: 5,
          physicalMathClean: true,
          requirementCoverage: { blocksPositiveRecommendation: true, summary: { violatedHard: 1 } },
          skuPartsList: [{ sku: 'P73282-B21', qty: 1, unitPriceUsd: 6000 }]
        },
        {
          name: 'Qualified Balanced',
          costUsd: 9500,
          pricingComplete: true,
          leadTimeDays: 10,
          physicalMathClean: true,
          requirementCoverage: { blocksPositiveRecommendation: false, summary: { violatedHard: 0 } },
          skuPartsList: [{ sku: 'P73282-B21', qty: 1, unitPriceUsd: 4200 }, { sku: 'P49610-B21', qty: 2, unitPriceUsd: 2650 }]
        },
        {
          name: 'Qualified Fast Ship',
          costUsd: 11200,
          pricingComplete: true,
          leadTimeDays: 3,
          physicalMathClean: true,
          requirementCoverage: { blocksPositiveRecommendation: false, summary: { violatedHard: 0 } },
          skuPartsList: [{ sku: 'P73282-B21', qty: 1, unitPriceUsd: 4200 }, { sku: 'P49611-B21', qty: 2, unitPriceUsd: 3500 }]
        }
      ],
      searchSpaceComplete: false
    },
    expected: {
      qualifiedCount: 2,
      disqualifiedCount: 1,
      topQualifiedName: 'Qualified Balanced',
      permutationDeterministic: true,
      isGlobalMinimum: false
    }
  },
  {
    id: 'SI10-F20-HELD',
    familyId: 'F20',
    dimension: 'REASONING',
    split: 'held_out',
    origin: 'anonymized_customer_derived',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'PARETO_RANKING',
    criticalSafetyGate: true,
    title: 'Candidates with priceKnown:false or stale lead times preserve null values and refuse global minimum',
    input: {
      baselineItems: [{ sku: 'P73282-B21', qty: 1 }],
      candidates: [
        {
          name: 'Unpriced Partial',
          physicalMathClean: true,
          leadTimeStale: true,
          leadTimeDays: 7,
          skuPartsList: [
            { sku: 'P73282-B21', qty: 1, unitPriceUsd: 4200, priceKnown: true },
            { sku: 'P48820-B21', qty: 1, priceKnown: false }
          ]
        }
      ],
      searchSpaceComplete: true
    },
    expected: {
      qualifiedCount: 1,
      disqualifiedCount: 0,
      mustPreserveNullCost: true,
      mustPreserveNullComparableLeadTime: true,
      isGlobalMinimum: false
    }
  },

  // ── F21: Offline Air-Gap & Error-Preserving Reflection ──
  {
    id: 'SI10-F21-DEV',
    familyId: 'F21',
    dimension: 'LIFECYCLE_INTERFACES',
    split: 'dev',
    origin: 'synthetic',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'PROJECTION_PARITY',
    criticalSafetyGate: true,
    title: 'Offline evaluation discloses NOT_RUN_LOCAL_ONLY grounding and PORTAL_VALIDATION_PENDING honestly',
    input: {
      evalResults: {
        chassis: 'DL380_Gen12',
        offlineMode: true,
        isMathClean: true,
        aspectChecks: [{ id: 1, name: 'Thermal', status: 'PASS', detail: 'OK' }],
        conflictGraph: { recommendedSolutions: [{ rank: 1, name: 'Base', skuList: BASE_SERVER_ITEMS, totalCostUsd: null, pricingComplete: false }] }
      }
    },
    expected: {
      documentGrounding: 'NOT_RUN_LOCAL_ONLY',
      liveVendorAcceptance: 'PORTAL_VALIDATION_PENDING',
      mustMatchAcrossPresenters: true,
      mustKeepPortal7Columns: true
    }
  },
  {
    id: 'SI10-F21-HELD',
    familyId: 'F21',
    dimension: 'LIFECYCLE_INTERFACES',
    split: 'held_out',
    origin: 'anonymized_customer_derived',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'ERROR_PRESERVATION',
    criticalSafetyGate: true,
    title: 'Reflection/observer failure preserves primary evaluation error cleanly without masking it',
    input: {
      primaryErrorCode: 'PRIMARY_EVAL_FAILURE',
      primaryErrorMessage: 'Primary hardware evaluation failed',
      reflectionErrorMessage: 'Reflection disk hook error'
    },
    expected: {
      preservesPrimaryError: true,
      recordsReflectionErrorSeparately: true
    }
  },

  // ── F22: Cancellation Discipline & Segregated Learning Consumption ──
  {
    id: 'SI10-F22-DEV',
    familyId: 'F22',
    dimension: 'LIFECYCLE_INTERFACES',
    split: 'dev',
    origin: 'synthetic',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'COMPOUND_WORKFLOW',
    criticalSafetyGate: true,
    title: 'Pre-aborted workflow cancels cleanly with zero step invocations',
    input: {
      query: 'Evaluate BOQ and export workbook',
      context: { items: [{ sku: 'P73282-B21', quantity: 1 }], chassisName: 'DL380_Gen12' },
      preAbortSignal: true,
      handlers: {
        BOQ_EVALUATION: async () => { throw new Error('Should not execute after abort'); },
        WORKBOOK_GENERATION: async () => { throw new Error('Should not execute after abort'); }
      }
    },
    expected: { status: 'CANCELLED', cancelled: true, maxStepInvocations: 0 }
  },
  {
    id: 'SI10-F22-HELD',
    familyId: 'F22',
    dimension: 'LIFECYCLE_INTERFACES',
    split: 'held_out',
    origin: 'anonymized_customer_derived',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'LEARNING_SEGREGATION',
    criticalSafetyGate: true,
    title: 'Operational incidents, user preferences and agent self-explanations never enter physical hardware rules',
    input: {
      chassis: 'DL380_Gen12',
      rawDeltas: [
        { deltaId: 'PHYS-RULE-01', chassis: 'DL380_Gen12', affectedSku: 'P49610-B21', requiredDependencySku: 'P48820-B21', ruleType: 'PERMANENT_PHYSICAL_DEPENDENCY', governanceStatus: 'ACTIVE', scopeTaxonomy: 'CHASSIS_SPECIFIC', reasoning: 'CPU > 240W requires High Perf Fan Kit' },
        { deltaId: 'OP-INC-01', chassis: 'DL380_Gen12', ruleType: 'OPERATIONAL_INCIDENT', governanceStatus: 'ACTIVE', scopeTaxonomy: 'CHASSIS_SPECIFIC', reasoning: 'Transient SSO timeout' },
        { deltaId: 'USER-PREF-01', chassis: 'DL380_Gen12', ruleType: 'USER_PREFERENCE', governanceStatus: 'ACTIVE', scopeTaxonomy: 'CHASSIS_SPECIFIC', reasoning: 'Prefer titanium PSUs' },
        { deltaId: 'SELF-EXP-01', chassis: 'DL380_Gen12', ruleType: 'DEPENDENCY_CHAIN', affectedSku: 'P49610-B21', sourceType: 'AGENT_SELF_EXPLANATION', governanceStatus: 'ACTIVE', scopeTaxonomy: 'CHASSIS_SPECIFIC', reasoning: 'Self-generated guess' }
      ],
      appliedRuleId: 'PHYS-RULE-01'
    },
    expected: {
      activePhysicalCount: 1,
      segregatedCount: 3,
      appliedRuleIds: ['PHYS-RULE-01'],
      cloudSyncSeparate: true
    }
  },

  // ── F23: Projection Parity & Portal Layout ──
  {
    id: 'SI10-F23-DEV',
    familyId: 'F23',
    dimension: 'LIFECYCLE_INTERFACES',
    split: 'dev',
    origin: 'synthetic',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'PROJECTION_PARITY',
    criticalSafetyGate: true,
    title: 'Buildable evaluation projects identical outcome, requirement coverage and evidence across JSON, MD, XLSX & MCP while keeping 7-col Portal XLSX intact',
    input: {
      evalResults: {
        chassis: 'DL380_Gen12',
        isMathClean: true,
        aspectChecks: [{ id: 1, name: 'Compute & Thermal', status: 'PASS', detail: 'OK' }],
        requirementAccounting: {
          schemaVersion: '1.0',
          inputRevisionSha256: 'rev-parity-dev',
          totalClauses: 1,
          parsedCount: 1,
          uninterpretedCount: 0,
          ambiguityCount: 0,
          records: [{ id: 'REQ-1', rawText: 'min 512GB RAM', hardness: 'HARD', parseStatus: 'PARSED' }]
        },
        conflictGraph: {
          recommendedSolutions: [{
            rank: 1,
            name: 'Valid Baseline',
            physicalMathClean: true,
            totalCostUsd: 16740,
            pricingComplete: true,
            skuList: BASE_SERVER_ITEMS,
            requirementCoverage: {
              blocksPositiveRecommendation: false,
              dispositions: [{ requirementId: 'REQ-1', hardness: 'HARD_CONSTRAINT', disposition: 'SATISFIED', rawText: 'min 512GB RAM' }],
              summary: { total: 1, satisfied: 1, violated: 0, unresolved: 0, violatedHard: 0, unresolvedHard: 0 }
            }
          }]
        },
        ephemeralSourceValidation: {
          success: true,
          isCloudGrounded: true,
          sourceDetached: true,
          doubleCheckVerdict: 'DOUBLE_CHECK_PASSED',
          citations: [{ sourceId: 'qs-g12', index: 1, title: 'DL380 Gen12 QuickSpecs' }],
          authoritativeSourceIds: ['qs-g12']
        },
        acceptanceGate: { isValid: true, status: 'PASSED', blockersCount: 0, blockers: [], checks: [] }
      }
    },
    expected: {
      documentGrounding: 'DOUBLE_CHECK_PASSED',
      liveVendorAcceptance: 'PORTAL_VALIDATION_PENDING',
      mustMatchAcrossPresenters: true,
      mustKeepPortal7Columns: true,
      isBuildable: true
    }
  },
  {
    id: 'SI10-F23-HELD',
    familyId: 'F23',
    dimension: 'LIFECYCLE_INTERFACES',
    split: 'held_out',
    origin: 'anonymized_customer_derived',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'PROJECTION_PARITY',
    criticalSafetyGate: true,
    title: 'Empty/unrun evaluation yields NOT_EVALUATED and NO_CLAIMS_RECORDED across all presenters',
    input: {
      evalResults: null
    },
    expected: {
      disposition: 'NOT_EVALUATED',
      summary: 'NO_CLAIMS_RECORDED',
      isBuildable: false,
      mustMatchAcrossPresenters: true,
      mustKeepPortal7Columns: false
    }
  },

  // ── F24: Direct Export Gate, Fingerprint & Partial Review Rejection ──
  {
    id: 'SI10-F24-DEV',
    familyId: 'F24',
    dimension: 'LIFECYCLE_INTERFACES',
    split: 'dev',
    origin: 'synthetic',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'EXPORT_GATE',
    criticalSafetyGate: true,
    title: 'Partial { success: true } document review is rejected and bom_verifier blocks stale dependency & violated requirement',
    input: {
      partialReview: { success: true },
      evalArtifact: {
        chassis: 'DL380_Gen12',
        status: 'PASSED',
        aspectChecksCompleted: true,
        aspectChecks: Array.from({ length: 7 }, (_, i) => ({ id: i + 1, name: `Aspect ${i + 1}`, status: 'PASS', detail: 'OK' })),
        catalogData: { entries: [{ skus: BASE_SERVER_ITEMS.map(item => ({ sku: item.sku, description: item.description })) }] },
        items: BASE_SERVER_ITEMS,
        requirementAccounting: { totalClauses: 1, uninterpretedCount: 0, ambiguityCount: 0, records: [{ id: 'REQ-1', hardness: 'HARD' }] },
        conflictGraph: {
          recommendedSolutions: [{
            rank: 1,
            physicalMathClean: true,
            skuPartsList: BASE_SERVER_ITEMS,
            requirementCoverage: { blocksPositiveRecommendation: true, summary: { violatedHard: 1, unresolvedHard: 0 } }
          }]
        },
        dependencyInvalidation: { isStale: true, reason: 'RULE_RETRACTED' }
      }
    },
    expected: {
      partialReviewAccepted: false,
      verifierValid: false,
      blockedByRequirementGate: true,
      blockedByDependencyGate: true
    }
  },
  {
    id: 'SI10-F24-HELD',
    familyId: 'F24',
    dimension: 'LIFECYCLE_INTERFACES',
    split: 'held_out',
    origin: 'anonymized_customer_derived',
    environment: 'offline',
    adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
    evaluatorKind: 'EXPORT_GATE',
    criticalSafetyGate: true,
    title: 'DeliveryAuthorization cryptographic token issued for prior dependency state fails when dependencyInvalidation flips stale',
    input: {
      mode: 'FINGERPRINT_STALE_TOKEN',
      evaluation: {
        chassis: 'DL380_Gen12',
        items: [{ sku: 'P73282-B21', quantity: 1 }],
        conflictGraph: { rankedSolutions: [{ rank: 1, skuList: [{ sku: 'P73282-B21', quantity: 1 }] }] },
        dependencyInvalidation: { isStale: false, indexRevisionSha256: 'rev-1' }
      }
    },
    expected: {
      tokenValidBeforeStale: true,
      tokenValidAfterStale: false,
      fingerprintChanged: true
    }
  }
]);

module.exports = {
  SCENARIO_SCHEMA_VERSION,
  REQUIRED_DIMENSIONS,
  SCENARIO_FAMILIES,
  SCENARIO_CASES
};
