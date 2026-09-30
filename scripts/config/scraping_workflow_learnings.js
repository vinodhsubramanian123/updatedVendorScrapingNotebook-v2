'use strict';
// Workflow advisories only. These must never become inferred hardware dependencies.
module.exports = [
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
