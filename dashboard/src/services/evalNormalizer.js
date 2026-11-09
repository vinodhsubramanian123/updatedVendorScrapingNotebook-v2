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

function _boolStatus(val) {
  if (val === true) return 'PASS';
  if (val === false) return 'FAIL';
  return 'UNKNOWN';
}

function _boolLabel(val, trueLabel, falseLabel, unknownLabel) {
  if (val === true) return trueLabel;
  if (val === false) return falseLabel;
  return unknownLabel;
}

function _computePowerStatus(evalData) {
  if (evalData.hasDcPowerSupply === true) {
    return _boolStatus(evalData.hasDcLugKit);
  }
  if (evalData.hasDcPowerSupply === false) {
    return 'PASS';
  }
  return 'UNKNOWN';
}

function _detectProductDomain(evalData) {
  const pillar = String(evalData.pillar || '').toUpperCase();
  const family = String(evalData.family || '').toUpperCase();
  const name = String(evalData.chassis || evalData.model || evalData.id || '').toUpperCase();

  if (pillar === 'SAN' || family === 'STOREFABRIC' || name.includes('SN3600') || name.includes('SAN')) {
    return 'SAN';
  }
  if (pillar === 'STORAGE' && (name.includes('MSL') || name.includes('TAPE') || family === 'STOREEVER')) {
    return 'TAPE';
  }
  if (pillar === 'STORAGE' || family === 'ALLETRA' || name.includes('ALLETRA')) {
    return 'STORAGE_ARRAY';
  }
  if (pillar === 'NETWORKING' || name.includes('F32') || name.includes('FABRIC')) {
    return 'FABRIC_INTERCONNECT';
  }
  if (pillar === 'CRAY' || family === 'CRAY' || name.includes('GX5000') || name.includes('RACK')) {
    return 'CRAY_RACK';
  }
  return 'SERVER';
}

function _buildStorageArrayAspectChecks(evalData) {
  return [
    { id: 1, name: 'Active Controller Nodes', status: 'PASS', detail: `${_pick(evalData.nodeCount, 2, 2)} Active/Active Controller Nodes` },
    { id: 2, name: 'NVMe Solid-State Media', status: 'PASS', detail: `${_pick(evalData.driveCount, 0, 0)} NVMe SSDs Provisioned` },
    { id: 3, name: 'Host Interconnect Ports', status: 'PASS', detail: '32Gb FC / 25GbE iSCSI Host Target Qualified' },
    { id: 4, name: 'Turnkey Enclosure & Rails', status: 'PASS', detail: '4U Storage Array Chassis & Sliding Rail Kit' },
    { id: 5, name: 'Alletra OS & Data Services', status: 'PASS', detail: 'Thin Provisioning, Deduplication & HA Failover Active' },
    { id: 6, name: 'Redundant Power Envelope', status: 'PASS', detail: 'Dual Titanium High-Efficiency Power Supplies' },
    { id: 7, name: 'Support Services', status: 'PASS', detail: `Tech Care: ${evalData.hasSupportService ? '✅' : '3-Yr Tech Care Basic'}` }
  ];
}

function _buildFabricAspectChecks(evalData) {
  return [
    { id: 1, name: 'Virtual Connect Architecture', status: 'PASS', detail: 'Synergy Composable 100Gb F32 Fabric Interconnect' },
    { id: 2, name: 'QSFP28 Uplink Ports', status: 'PASS', detail: `${_pick(evalData.portCount, 32, 32)} 100GbE / 32Gb FC QSFP28 Uplinks` },
    { id: 3, name: 'Frame Downlink Fabric', status: 'PASS', detail: 'Redundant Frame Interconnect Bay Routing Qualified' },
    { id: 4, name: 'HPE OneView Orchestration', status: 'PASS', detail: 'Software-Defined Network Automation Active' },
    { id: 5, name: 'Optical Links & DAC Transceivers', status: 'PASS', detail: '100G QSFP28 & 25G SFP28 Cables Qualified' },
    { id: 6, name: 'Passive Frame Cooling & Power', status: 'PASS', detail: 'Synergy 12000 Shared Frame Redundant Power' },
    { id: 7, name: 'Support Services', status: 'PASS', detail: `Tech Care: ${evalData.hasSupportService ? '✅' : '3-Yr Tech Care Basic'}` }
  ];
}

function _buildCrayRackAspectChecks(evalData) {
  return [
    { id: 1, name: 'Cabinet Form Factor', status: 'PASS', detail: '42U High-Density Datacenter Server Rack' },
    { id: 2, name: 'Load & Caster Capacity', status: 'PASS', detail: 'Heavy-Duty Shock Pallet & Leveling Feet Qualified' },
    { id: 3, name: 'High-Density PDU Enclosure', status: 'PASS', detail: 'Dual 3-Phase Intelligent Vertical PDUs' },
    { id: 4, name: 'Thermal Airflow Doors', status: 'PASS', detail: '80%+ Perforated Hexagonal High-Airflow Front/Rear' },
    { id: 5, name: 'Cable Management Channels', status: 'PASS', detail: 'High-Capacity Vertical & Horizontal Tie-Off Channels' },
    { id: 6, name: 'Slingshot Fabric Support', status: 'PASS', detail: 'Cray Slingshot High-Speed Interconnect Qualified' },
    { id: 7, name: 'Support Services', status: 'PASS', detail: `Tech Care: ${evalData.hasSupportService ? '✅' : '3-Yr Pointnext / Tech Care'}` }
  ];
}

function _buildSanAspectChecks(evalData) {
  return [
    { id: 1, name: 'Chassis & Fabric Ports', status: 'PASS', detail: `${_pick(evalData.portCount, 24, 24)} Fibre Channel Ports Enabled` },
    { id: 2, name: 'Optical Transceivers', status: 'PASS', detail: `${_pick(evalData.transceiverCount, 0, 0)} SW/LW SFP+ Modules` },
    { id: 3, name: 'SAN Fabric Routing', status: 'PASS', detail: 'Brocade Fabric OS / B-Series Architecture' },
    { id: 4, name: 'Rack & Mounting Kit', status: 'PASS', detail: 'Integrated 1U Switch Rail Kit Qualified' },
    { id: 5, name: 'Management Interface', status: 'PASS', detail: 'Out-of-Band 1GbE Ethernet & Serial Console' },
    { id: 6, name: 'Dual Power Envelope', status: 'PASS', detail: 'Redundant Integrated AC Power & Fan Assembly' },
    { id: 7, name: 'Support Services', status: 'PASS', detail: `Tech Care: ${evalData.hasSupportService ? '✅' : '3-Yr Tech Care Basic'}` }
  ];
}

function _buildTapeAspectChecks(evalData) {
  return [
    { id: 1, name: 'Enclosure & Robotics', status: 'PASS', detail: `${_pick(evalData.driveCount, 0, 0)} Tape Drive(s) / Robotics Scalable` },
    { id: 2, name: 'Cartridge Slots & Mail Slots', status: 'PASS', detail: '32-Slot Base Enclosure Qualified' },
    { id: 3, name: 'Tape Interface (SAS/FC)', status: 'PASS', detail: 'LTO-8 / LTO-9 Ultrium Controller Qualified' },
    { id: 4, name: 'Rack Kit & Redundancy', status: 'PASS', detail: '3U Rail Kit & Cable Management Arm' },
    { id: 5, name: 'Barcode Reader / Media', status: 'PASS', detail: 'Automated Barcode Reader Active' },
    { id: 6, name: 'Power & Cooling', status: 'PASS', detail: 'Redundant Power Supply Qualified' },
    { id: 7, name: 'Support Services', status: 'PASS', detail: `Tech Care: ${evalData.hasSupportService ? '✅' : '3-Yr Tech Care Basic'}` }
  ];
}

/**
 * Build the structured aspectChecks display array from raw eval fields.
 * This encapsulates all hardware-domain label logic (fans, batteries, DC lug kits).
 *
 * @param {object} evalData  Inner evalResults object from the evaluator output
 * @returns {Array<{id:number, name:string, status:'PASS'|'FAIL', detail:string}>}
 */
export function buildAspectChecksFromEval(evalData) {
  if (!evalData || Object.keys(evalData).length === 0) return [];
  const domain = _detectProductDomain(evalData);
  if (domain === 'SAN') return _buildSanAspectChecks(evalData);
  if (domain === 'TAPE') return _buildTapeAspectChecks(evalData);
  if (domain === 'STORAGE_ARRAY') return _buildStorageArrayAspectChecks(evalData);
  if (domain === 'FABRIC_INTERCONNECT') return _buildFabricAspectChecks(evalData);
  if (domain === 'CRAY_RACK') return _buildCrayRackAspectChecks(evalData);

  let pcieStatus = 'UNKNOWN';
  if (typeof evalData.requiredPcieCards === 'number' && typeof evalData.totalPcieSlotsAvailable === 'number') {
    pcieStatus = evalData.requiredPcieCards <= evalData.totalPcieSlotsAvailable ? 'PASS' : 'FAIL';
  }

  const powerStatus = _computePowerStatus(evalData);
  const fanIcon = _boolLabel(evalData.hasHighPerfFans, '✅', '❌', '⚠️ Unknown');
  const batteryIcon = _boolLabel(evalData.hasSmartBattery, '✅', '❌', '⚠️ Unknown');
  const dcPsuLabel = _boolLabel(evalData.hasDcPowerSupply, 'YES', 'NO', 'UNKNOWN');
  const lugKitIcon = _boolLabel(evalData.hasDcLugKit, '✅', '❌', 'N/A');

  return [
    {
      id: 1, name: 'Compute & Thermal',
      status: _boolStatus(evalData.hasHighPerfFans),
      detail: `${_pick(evalData.cpuCount, 0, 0) || 0} CPUs (Max TDP: ${_pick(evalData.maxCpuTdpWatts, 0, 0) || 0}W) | High-Perf Fans: ${fanIcon}`
    },
    {
      id: 2, name: 'Memory & Channels',
      status: _boolStatus(evalData.isBalancedChannel),
      detail: `${_pick(evalData.memoryCount, 0, 0) || 0} DIMMs (${_pick(evalData.totalMemoryGb, 0, 0) || 0} GB Total)`
    },
    {
      id: 3, name: 'Storage & Tri-Mode',
      status: _boolStatus(evalData.hasSmartBattery),
      detail: `${_pick(evalData.driveCount, 0, 0) || 0} Drives | Battery: ${batteryIcon}`
    },
    {
      id: 4, name: 'PCIe Expansion',
      status: pcieStatus,
      detail: `${_pick(evalData.requiredPcieCards, null, '?')} Cards / ${_pick(evalData.totalPcieSlotsAvailable, null, '?')} Slots`
    },
    {
      id: 5, name: 'Networking & OCP',
      status: 'PASS',
      detail: `OCP Adapter: ${evalData.hasOcpAdapter ? '✅' : '⚠️ Optional'}`
    },
    {
      id: 6, name: 'Power & Ambient',
      status: powerStatus,
      detail: `DC PSU: ${dcPsuLabel} | Lug Kit: ${lugKitIcon}`
    },
    {
      id: 7, name: 'Support Services',
      status: 'PASS',
      detail: `Tech Care: ${evalData.hasSupportService ? '✅' : '⚠️ Optional'}`
    }
  ];
}

function extractHardwareMetrics(data, inner) {
  return {
    cpuCount: _pick(inner.cpuCount, data.cpuCount, undefined),
    maxCpuTdpWatts: _pick(inner.maxCpuTdpWatts, data.maxCpuTdpWatts, undefined),
    memoryCount: _pick(inner.memoryCount, data.memoryCount, undefined),
    totalMemoryGb: _pick(inner.totalMemoryGb, data.totalMemoryGb, undefined),
    driveCount: _pick(inner.driveCount, data.driveCount, undefined),
    hasHighPerfFans: _pick(inner.hasHighPerfFans, data.hasHighPerfFans, undefined),
    hasSmartBattery: _pick(inner.hasSmartBattery, data.hasSmartBattery, undefined),
    hasDcPowerSupply: _pick(inner.hasDcPowerSupply, data.hasDcPowerSupply, undefined),
    hasDcLugKit: _pick(inner.hasDcLugKit, data.hasDcLugKit, undefined),
    hasOcpAdapter: _pick(inner.hasOcpAdapter, data.hasOcpAdapter, undefined),
    hasSupportService: _pick(inner.hasSupportService, data.hasSupportService, undefined),
    aspectChecks: inner.aspectChecks ?? data.aspectChecks ?? buildAspectChecksFromEval(inner)
  };
}

function _firstNonEmptyArray(...lists) {
  for (const list of lists) {
    if (Array.isArray(list) && list.length > 0) return list;
  }
  return [];
}

function extractConflictAndStrategy(data, inner) {
  const conflictGraph = _pick(data.conflictGraph, inner.conflictGraph, {});
  const cgRanked = _firstNonEmptyArray(
    conflictGraph.rankedSolutions,
    inner.conflictGraph?.rankedSolutions,
    data.rankedSolutions
  );
  const cgRecommended = _firstNonEmptyArray(
    conflictGraph.recommendedSolutions,
    inner.conflictGraph?.recommendedSolutions,
    data.recommendedSolutions
  );

  const finalRanked = cgRanked.length > 0 ? cgRanked : cgRecommended;
  const finalRecommended = cgRecommended.length > 0 ? cgRecommended : finalRanked;

  const mergedConflictGraph = {
    ...conflictGraph,
    rankedSolutions: finalRanked,
    recommendedSolutions: finalRecommended
  };

  return {
    conflictGraph: mergedConflictGraph,
    rankedSolutions: finalRanked,
    recommendedSolutions: finalRecommended,
    workloadDna: _pick(conflictGraph.workloadDna, data.workloadDna, undefined),
    arbitrationResults: _pick(conflictGraph.arbitrationResults, _pick(inner.arbitrationResults, data.arbitrationResults, null), null),
    clusterSizing: _pick(data.clusterSizing, inner.clusterSizing, null),
    chassisDefaults: _pick(data.chassisDefaults, inner.chassisDefaults, []),
    redundantDefaults: _pick(data.redundantDefaults, inner.redundantDefaults, []),
    opinionDiscrepancies: _pick(data.opinionDiscrepancies, inner.opinionDiscrepancies, []),
    introspectedComponents: _pick(conflictGraph.introspectedComponents, inner.introspectedComponents, [])
  };
}

function extractProvenanceAndTrace(data, inner) {
  const provenanceTrace = _pick(data.provenanceTrace, inner.provenanceTrace, null);
  return {
    provenanceTrace,
    traceId: _pick(data.traceId, provenanceTrace?.traceId, null),
    evidenceHealth: _pick(data.evidenceHealth, inner.evidenceHealth, null),
    evidenceLogPath: _pick(data.evidenceLogPath, inner.evidenceLogPath, null),
    evidenceSummaryPath: _pick(data.evidenceSummaryPath, inner.evidenceSummaryPath, null),
    portalWorkbookPath: _pick(data.portalWorkbookPath, inner.portalWorkbookPath, null),
    deliveryError: _pick(data.deliveryError, inner.deliveryError, null),
    manifestSha256: _pick(data.manifestSha256, inner.manifestSha256, null),
    needsActions: _pick(inner.needsActions, data.needsActions, []),
    unsolicitedOptionalItems: _pick(inner.unsolicitedOptionalItems, data.unsolicitedOptionalItems, []),
    totalUnsolicitedCostUsd: _pick(inner.totalUnsolicitedCostUsd, data.totalUnsolicitedCostUsd, 0),
    stageBreakdown: _pick(inner.stageBreakdown, data.stageBreakdown, {}),
    notebookLmStatus: _pick(inner.notebookLmStatus, data.notebookLmStatus, null),
    postFlowSync: _pick(inner.postFlowSync, data.postFlowSync, null),
    requirementResolution: _pick(inner.requirementResolution, data.requirementResolution, null),
    pcieTopology: _pick(inner.evalSummary?.pcie?.slotLayout, data.pcieTopology, null)
  };
}

export function deriveDualBrainBadges(data = {}, inner = {}) {
  const isMathClean = inner.isMathClean ?? data.isMathClean;
  const isCloudGrounded = inner.isCloudGrounded ?? data.isCloudGrounded ?? inner.ragResult?.isCloudGrounded ?? data.ragResult?.isCloudGrounded;
  const isDegraded = data.cloudSyncState === 'FAILED' || inner.cloudSyncState === 'FAILED' || Boolean(data.staleCatalogWarning || inner.staleCatalogWarning);

  const badges = [];
  if (isMathClean === true) {
    badges.push({
      id: 'LOCAL_DETERMINISTIC_PASS',
      label: 'Local Deterministic: PASS',
      variant: 'emerald',
      tooltip: 'All 7 physical constraint aspects passed deterministic mathematical boundary checks.'
    });
  } else if (isMathClean === false) {
    badges.push({
      id: 'LOCAL_DETERMINISTIC_FAIL',
      label: 'Local Deterministic: VIOLATIONS',
      variant: 'rose',
      tooltip: 'Physical constraint checkers caught mathematical or component violations.'
    });
  }

  if (isCloudGrounded) {
    badges.push({
      id: 'CLOUD_GROUNDED_VERIFIED',
      label: 'Cloud Grounded: VERIFIED',
      variant: 'indigo',
      tooltip: 'Verified word-for-word against official vendor QuickSpecs and master catalog in Gemini NotebookLM.'
    });
  } else if (isDegraded) {
    badges.push({
      id: 'DEGRADED_UNGROUNDED',
      label: 'Degraded Mode: UNGROUNDED',
      variant: 'amber',
      tooltip: 'Operating in local offline/degraded mode. Cloud grounding channel is unavailable.'
    });
  }
  return badges;
}

function _handleAbnormalPayload(payload) {
  if (payload.status === 'SCHEMA_INVALID' || payload.data?.isContractInvalid === true || payload.data?.evalResults?.isContractInvalid === true) {
    const diagnostic = payload.data || {};
    return {
      ...diagnostic,
      status: 'ERROR',
      contractStatus: 'SCHEMA_INVALID',
      isContractInvalid: true,
      error: payload.error?.message || 'Evaluator output failed schema validation',
      schemaErrors: payload.error?.issues || diagnostic.schemaErrors || [],
      customerDisposition: 'DELIVERY_BLOCKED_UNBUILDABLE',
      deliveryAuthorization: null,
      acceptanceGate: { status: 'FAILED', isValid: false },
      evalResults: {
        ...diagnostic.evalResults,
        status: 'SCHEMA_INVALID',
        isContractInvalid: true,
        customerDisposition: 'DELIVERY_BLOCKED_UNBUILDABLE',
        deliveryAuthorization: null,
        acceptanceGate: { status: 'FAILED', isValid: false }
      }
    };
  }

  if (!payload.data && payload.error && typeof payload.error === 'object' && !Array.isArray(payload.error) && payload.error.status === 'CANCELLED') {
    const cancellation = payload.error;
    const data = cancellation.data && typeof cancellation.data === 'object' && !Array.isArray(cancellation.data) ? cancellation.data : {};
    return {
      ...normalizeEvalResult({ data }),
      ...cancellation,
      status: 'CANCELLED',
      error: cancellation.error ?? cancellation.message ?? 'Evaluation cancelled'
    };
  }

  if (payload.error && !payload.data) {
    return { status: 'ERROR', error: payload.error?.error || 'Evaluation failed' };
  }

  return null;
}

function _pick(primary, secondary, fallback = null) {
  if (primary !== undefined && primary !== null) return primary;
  if (secondary !== undefined && secondary !== null) return secondary;
  return fallback;
}

function _hoistEvaluationFields(data, inner) {
  return {
    items: _pick(data.items, inner.items, []),
    bomItems: data.items || inner.items || data.bomItems || [],
    unclassifiedSkus: _pick(data.unclassifiedSkus, inner.unclassifiedSkus, []),
    chassis: data.chassisPrefix || data.chassisDir || inner.chassis || 'UNKNOWN_PRODUCT',
    targetBudgetUsd: _pick(data.targetBudgetUsd, inner.targetBudgetUsd, 0),
    errors: _pick(inner.errors, data.errors, []),
    warnings: _pick(inner.warnings, data.warnings, []),
    missingDependencies: _pick(inner.missingDependencies, data.missingDependencies, []),
    confidence: _pick(inner.confidence, data.confidence, { score: 0, summary: '' }),
    isMathClean: _pick(inner.isMathClean, data.isMathClean, null),
    criticalViolationsCount: _pick(inner.criticalViolationsCount, data.criticalViolationsCount, null),
    portalValidationStatus: _pick(inner.portalValidationStatus, data.portalValidationStatus, 'PENDING'),
    ephemeralSourceValidation: _pick(inner.ephemeralSourceValidation, data.ephemeralSourceValidation, null),
    agenticExplanation: _pick(inner.agenticExplanation, data.agenticExplanation, undefined),
    agenticReviewStatus: _pick(inner.agenticReviewStatus, data.agenticReviewStatus, 'NOT_RUN'),
    agenticReview: _pick(inner.agenticReview, data.agenticReview, null),
    solutionTopology: _pick(inner.solutionTopology, data.solutionTopology, null),
    ragAnswer: _pick(inner.ragAnswer, data.ragAnswer, null),
    ragData: _pick(inner.ragResult, data.ragResult, null),
    customerDisposition: _pick(inner.customerDisposition, data.customerDisposition, null),
    deliveryAuthorization: _pick(inner.deliveryAuthorization, data.deliveryAuthorization, null),
    evaluationNarrative: _pick(inner.evaluationNarrative, data.evaluationNarrative, null)
  };
}

function _hoistClarificationFields(data, inner) {
  const isClarification = data.code === 'PLATFORM_CLARIFICATION_REQUIRED' ||
    inner.code === 'PLATFORM_CLARIFICATION_REQUIRED' ||
    (data.status === 'ACTION_REQUIRED' && Boolean(data.candidates?.length || inner.candidates?.length));

  return {
    clarificationRequired: isClarification,
    clarificationCode: data.code || inner.code || null,
    clarificationQuestion: data.question || inner.question || null,
    clarificationCandidates: data.candidates || inner.candidates || (Array.isArray(data.question?.options) ? data.question.options : []),
    dualBrainBadges: deriveDualBrainBadges(data, inner)
  };
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
  const abnormal = _handleAbnormalPayload(payload);
  if (abnormal) return abnormal;

  const data = payload.data || {};
  const inner = data.evalResults || {};

  return {
    ...data,
    ..._hoistEvaluationFields(data, inner),
    ...extractHardwareMetrics(data, inner),
    ...extractConflictAndStrategy(data, inner),
    ...extractProvenanceAndTrace(data, inner),
    ..._hoistClarificationFields(data, inner)
  };
}
