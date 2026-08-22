/**
 * dashboard/src/services/evalNormalizer.js
 *
 * Pure functions for normalising raw SSE EVAL_RESULT payloads into a
 * flat shape that all UI components consume.
 *
 * Extracted from App.jsx (GAP-L4 + GAP-L1 fix).
 * These functions contain hardware-domain knowledge — they belong in a
 * service layer, NOT in a React component, so they can be tested in isolation.
 */

/**
 * Build the structured aspectChecks display array from raw eval fields.
 * This encapsulates all hardware-domain label logic (fans, batteries, DC lug kits).
 *
 * @param {object} evalData  Inner evalResults object from the evaluator output
 * @returns {Array<{id:number, name:string, status:'PASS'|'FAIL', detail:string}>}
 */
export function buildAspectChecksFromEval(evalData) {
  if (!evalData || Object.keys(evalData).length === 0) return [];
  return [
    {
      id: 1, name: 'Compute & Thermal',
      status: evalData.hasHighPerfFans !== false ? 'PASS' : 'FAIL',
      detail: `${evalData.cpuCount || 0} CPUs (Max TDP: ${evalData.maxCpuTdpWatts || 0}W) | High-Perf Fans: ${evalData.hasHighPerfFans ? '✅' : '❌'}`
    },
    {
      id: 2, name: 'Memory & Channels',
      status: evalData.isBalancedChannel !== false ? 'PASS' : 'FAIL',
      detail: `${evalData.memoryCount || 0} DIMMs (${evalData.totalMemoryGb || 0} GB Total)`
    },
    {
      id: 3, name: 'Storage & Tri-Mode',
      status: evalData.hasSmartBattery !== false ? 'PASS' : 'FAIL',
      detail: `${evalData.driveCount || 0} Drives | Battery: ${evalData.hasSmartBattery ? '✅' : '❌'}`
    },
    {
      id: 4, name: 'PCIe Expansion',
      status: (evalData.requiredPcieCards || 0) <= (evalData.totalPcieSlotsAvailable || 8) ? 'PASS' : 'FAIL',
      detail: `${evalData.requiredPcieCards || 0} Cards / ${evalData.totalPcieSlotsAvailable || 8} Slots`
    },
    {
      id: 5, name: 'Networking & OCP',
      status: 'PASS',
      detail: `OCP Adapter: ${evalData.hasOcpAdapter ? '✅' : '⚠️ Optional'}`
    },
    {
      id: 6, name: 'Power & Ambient',
      status: (!evalData.hasDcPowerSupply || evalData.hasDcLugKit) ? 'PASS' : 'FAIL',
      detail: `DC PSU: ${evalData.hasDcPowerSupply ? 'YES' : 'NO'} | Lug Kit: ${evalData.hasDcLugKit ? '✅' : '❌'}`
    },
    {
      id: 7, name: 'Support Services',
      status: 'PASS',
      detail: `Tech Care: ${evalData.hasSupportService ? '✅' : '⚠️ Optional'}`
    }
  ];
}

/**
 * Flatten a raw EVAL_RESULT SSE payload into the shape that all dashboard
 * components expect. This is the *single* data contract normalisation point —
 * if the backend shape ever changes, only this function needs updating.
 *
 * @param {object} payload  Raw SSE EVAL_RESULT payload { data?, error? }
 * @returns {object}        Normalised evalResults object
 */
export function normalizeEvalResult(payload) {
  if (payload.error) {
    return { status: 'ERROR', error: payload.error?.error || 'Evaluation failed' };
  }

  const data = payload.data || {};
  const inner = data.evalResults || {};

  return {
    ...data,
    // Hoist items and SKU collections
    items: data.items ?? inner.items ?? [],
    bomItems: data.items ?? inner.items ?? data.bomItems ?? [],
    unclassifiedSkus: data.unclassifiedSkus ?? inner.unclassifiedSkus ?? [],
    chassis: data.chassisPrefix || data.chassisDir || inner.chassis || 'DL380_Gen12_SFF',
    targetBudgetUsd: data.targetBudgetUsd ?? inner.targetBudgetUsd ?? 0,
    // Hoist inner eval fields to top level for component backward-compat
    errors: inner.errors ?? data.errors ?? [],
    warnings: inner.warnings ?? data.warnings ?? [],
    missingDependencies: inner.missingDependencies ?? data.missingDependencies ?? [],
    confidence: inner.confidence ?? data.confidence ?? { score: 0, summary: '' },
    cpuCount: inner.cpuCount ?? data.cpuCount,
    maxCpuTdpWatts: inner.maxCpuTdpWatts ?? data.maxCpuTdpWatts,
    memoryCount: inner.memoryCount ?? data.memoryCount,
    totalMemoryGb: inner.totalMemoryGb ?? data.totalMemoryGb,
    driveCount: inner.driveCount ?? data.driveCount,
    hasHighPerfFans: inner.hasHighPerfFans ?? data.hasHighPerfFans,
    hasSmartBattery: inner.hasSmartBattery ?? data.hasSmartBattery,
    hasDcPowerSupply: inner.hasDcPowerSupply ?? data.hasDcPowerSupply,
    hasDcLugKit: inner.hasDcLugKit ?? data.hasDcLugKit,
    hasOcpAdapter: inner.hasOcpAdapter ?? data.hasOcpAdapter,
    hasSupportService: inner.hasSupportService ?? data.hasSupportService,
    agenticExplanation: inner.agenticExplanation ?? data.agenticExplanation,
    conflictGraph: data.conflictGraph ?? inner.conflictGraph ?? {},
    rankedSolutions: data.conflictGraph?.rankedSolutions ?? inner.conflictGraph?.rankedSolutions ?? data.rankedSolutions ?? [],
    workloadDna: data.conflictGraph?.workloadDna ?? data.workloadDna,
    // Aspect checks: use server-provided array or compute from inner fields
    aspectChecks: inner.aspectChecks ?? buildAspectChecksFromEval(inner),
    // RAG fields — populated later by the poller
    ragAnswer: null,
    ragData: null
  };
}
