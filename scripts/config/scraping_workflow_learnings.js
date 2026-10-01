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
  }
];
