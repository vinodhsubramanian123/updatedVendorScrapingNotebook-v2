'use strict';
// CP0 characterization requests. Expected intent is a label, not expected success.
// These remain diagnostic baselines until their continuation checkpoints pass.
const scope = 'DL380_Gen12';
const boq = 'tests/fixtures/test_boq_dl380_gen12.csv';
const scenarios = [
  { id: 'S01-scoped-qa', family: 'S01', intent: 'FREEFORM_QA', query: 'What is the maximum memory capacity on DL380 Gen12?', scope },
  { id: 'S01-unknown-qa', family: 'S01', intent: 'FREEFORM_QA', query: 'What is the maximum memory capacity of Vendor X Model Z?' },
  { id: 'S01-portfolio-qa', family: 'S01', intent: 'FREEFORM_QA', query: 'Can I compare DL380 Gen11 and DL380 Gen12?' },
  { id: 'S02-sku-history', family: 'S02', intent: 'CATALOG_INTELLIGENCE', query: 'Show price trend for P73282-B21 on DL380 Gen12', scope },
  { id: 'S02-missing-sku', family: 'S02', intent: 'CATALOG_INTELLIGENCE', query: 'Show pricing history for DL380 Gen12', scope },
  { id: 'S03-file-boq', family: 'S03', intent: 'BOQ_EVALUATION', query: 'Evaluate BOQ for DL380 Gen12', scope, files: { filePath: boq }, limits: ['Existing fixture contains physical/accessory gaps; not a certified valid candidate.'] },
  { id: 'S03-locally-valid-boq', family: 'S03', intent: 'BOQ_EVALUATION', query: 'Evaluate BOQ for DL380 Gen12', scope, files: { filePath: 'tests/fixtures/cp0_locally_valid_dl380_gen12.csv' }, limits: ['Catalog-derived single-node compute-only local physical control; offline grounding and portal acceptance remain pending.'] },
  { id: 'S03-corrupt-workbook', family: 'S03', intent: 'BOQ_EVALUATION', query: 'Evaluate BOQ for DL380 Gen12', scope, files: { filePath: 'tests/fixtures/cp0_corrupt_workbook.xlsx' }, limits: ['Deliberately truncated ZIP workbook bytes; characterization requires actual canonical failure.'] },
  { id: 'S03-missing-input', family: 'S03', intent: 'BOQ_EVALUATION', query: 'Evaluate BOQ for DL380 Gen12', scope },
  { id: 'S03-missing-file', family: 'S03', intent: 'BOQ_EVALUATION', query: 'Evaluate BOQ for DL380 Gen12', scope, files: { filePath: 'tests/fixtures/cp0-missing-input.csv' } },
  { id: 'S04-image-descriptor', family: 'S04', intent: 'OCR_QUOTE_INGESTION', query: 'Ingest and extract quote image', files: { filePath: 'tests/fixtures/cp0-unexecuted-image.png' }, limits: ['Placeholder does not exist; old handler returns descriptor without OCR.'] },
  { id: 'S04-pdf-descriptor', family: 'S04', intent: 'OCR_QUOTE_INGESTION', query: 'Ingest scanned quote', files: { filePath: 'tests/fixtures/cp0-unexecuted-scan.pdf' }, limits: ['No PDF decoding or OCR occurs in old handler.'] },
  { id: 'S05-sized-draft', family: 'S05', intent: 'RFP_SIZING_TO_BOM', query: 'Need a DL380 Gen12 server with 32 cores, 256GB RAM, 10TB storage', scope },
  { id: 'S05-incomplete-draft', family: 'S05', intent: 'RFP_SIZING_TO_BOM', query: 'Sizing for a DL380 Gen12 server', scope },
  ...[2, 9, 20].map(count => ({ id: `S06-${count}-nodes`, family: 'S06', intent: 'MULTI_CLUSTER_TENDER', query: `Plan cluster with ${count} nodes on DL380 Gen12`, scope,
    context: { intent: 'MULTI_CLUSTER_TENDER', serverCount: count, usableRackUnits: 42, nodePowerWatts: 600 }, limits: ['Facility estimate only; no canonical per-group evaluation.'] })),
  { id: 'S08-single-audit', family: 'S08', intent: 'BOM_RECONCILIATION', query: 'Reconcile this vendor quote', scope, files: { filePath: boq } },
  { id: 'S08-two-baselines', family: 'S08', intent: 'BOM_RECONCILIATION', query: 'Reconcile tender and vendor quote', scope, files: { filePath: boq, secondaryFilePath: boq }, limits: ['Same fixture verifies mode selection; not a real customer/vendor difference.'] },
  { id: 'S08-real-workbooks', family: 'S08', intent: 'BOM_RECONCILIATION', query: 'Reconcile customer tender with vendor quote', scope,
    files: { filePath: 'tests/fixtures/samples/GID-RFQS-HPE-2026-006_Customer_Tender.xlsx', secondaryFilePath: 'tests/fixtures/samples/DL380_Gen12_22-server_Vendor_BOM.xlsx' } },
  { id: 'S09-conversion-draft', family: 'S09', intent: 'CROSS_VENDOR_TRANSFORMATION', query: 'Convert Cisco UCS server with 32 cores and 256GB RAM to HPE', scope,
    context: { intent: 'CROSS_VENDOR_TRANSFORMATION', sourceVendor: 'CISCO', targetHpeChassis: scope, competitorSpec: 'Cisco UCS server with 32 cores and 256GB RAM' } },
  { id: 'S09-mixed-input-required', family: 'S09', intent: 'HETEROGENEOUS_TENDER_MODERNIZATION', query: 'Modernize heterogeneous tender', scope,
    context: { intent: 'HETEROGENEOUS_TENDER_MODERNIZATION' } },
  { id: 'S05-workload-input-required', family: 'S05', intent: 'WORKLOAD_DNA', query: 'Profile VMware workload DNA', scope, context: { intent: 'WORKLOAD_DNA' } },
  { id: 'S10-value-missing-input', family: 'S10', intent: 'VALUE_ENGINEERING', query: 'Optimize budget for DL380 Gen12', scope, context: { intent: 'VALUE_ENGINEERING', budget: 10000 } },
  { id: 'S10-least-delta-missing-input', family: 'S10', intent: 'LEAST_DELTA_SYNTHESIS', query: 'Find least-delta alternatives', scope, context: { intent: 'LEAST_DELTA_SYNTHESIS' } },
  { id: 'S17-workbook-missing-input', family: 'S17', intent: 'WORKBOOK_GENERATION', query: 'Generate Excel workbook', scope, context: { intent: 'WORKBOOK_GENERATION' } },
  ...['diagnostic', 'authorized'].map(mode => ({ id: `S17-${mode}-export-contract`, family: 'S17', intent: 'WORKBOOK_GENERATION', query: 'Characterize four public exporters', scope,
    mode: 'CONTROLLED_EXPORT_CONTRACT', limits: ['Synthetic fixture acceptance/signing key/fixed clock verify only exporter contract, never hardware/cloud/vendor acceptance.'] })),
  { id: 'S07-remarks-preserve-row', family: 'S07', intent: 'REMARKS_RECONCILIATION', query: 'Append commercial remarks', scope,
    context: { intent: 'REMARKS_RECONCILIATION', rows: [['Notes', 'Quantity', 'SKU'], ['Keep as spare', 2, 'X', 'extra customer cell']], remarksByRow: { 1: { action: 'MATCHED', exactMatch: true, configuredQty: 2, proposedSku: 'X' } } } },
  { id: 'S15-learning-noop', family: 'S15', intent: 'CONTINUOUS_LEARNING', query: 'Record continuous learning feedback', scope, context: { intent: 'CONTINUOUS_LEARNING' }, limits: ['No feedback supplied; does not demonstrate consumed learning.'] },
  { id: 'S12-drift-inspection', family: 'S12', intent: 'KNOWLEDGE_SYNC', query: 'Inspect DL380 Gen12 knowledge drift', scope, context: { intent: 'KNOWLEDGE_SYNC' }, limits: ['Read-only route characterization; no upload, synchronization or S16 population measurement.'] },
  { id: 'S11-adversarial-classification', family: 'S11', intent: 'ADVERSARIAL_VALIDATION', query: 'Run adversarial validation', scope,
    context: { intent: 'ADVERSARIAL_VALIDATION' }, execute: false, limits: ['Old handler calls Gemini even offline; runtime execution pending explicit mock/live qualification.'] }
];
const families = [
  ['S01', 'Q&A/product/portfolio', ['CP7', 'CP11', 'CP14']], ['S02', 'Catalog history/prices', ['CP6', 'CP10']],
  ['S03', 'BOQ/input/buildability', ['CP7', 'CP11']], ['S04', 'OCR/media/provenance', ['CP9a']],
  ['S05', 'RFP/workload sizing', ['CP9b', 'CP9c']], ['S06', 'Grouped nodes/facility/ownership', ['CP8']],
  ['S07', 'Compound transforms', ['CP7c', 'CP9', 'CP10']], ['S08', 'Reconciliation/baseline/pricing', ['CP5', 'CP10']],
  ['S09', 'Conversion/mixed/spares', ['CP9d', 'CP9e']], ['S10', 'Budget/remedies/changed candidates', ['CP10a']],
  ['S11', 'Candidate scrutiny versus chaos', ['CP10b']], ['S12', 'Offline/stale/degraded/cloud failure', ['CP11', 'CP12']],
  ['S13', 'Conditional/vendor receipts', ['CP14', 'CP18']], ['S14', 'Export/reflection/failure/cancel', ['CP11', 'CP12c']],
  ['S15', 'Consumed learning/incident scope', ['CP12a', 'CP12b']], ['S16', 'Measured populations/concurrent writes', ['CP6b']],
  ['S17', 'Public facades/import/CLI/dashboard/MCP', ['CP8a', 'CP11', 'CP18']],
  ['S18', 'Vendor X/Dell/scope invariants', ['CP13', 'CP15', 'CP16']], ['S19', 'Lease/interruption/recovery', ['CP0', 'CP6r']]
].map(([id, scopeName, checkpoints]) => ({ id, scope: scopeName, checkpoints, acceptance: 'PENDING_CORRECTED_BEHAVIOR_VERIFICATION' }));
module.exports = { scenarios, families };
