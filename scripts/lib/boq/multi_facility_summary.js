'use strict';
function sumKnown(values) {
  if (values.some(value => typeof value !== 'number' || !Number.isFinite(value) || value < 0)) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Number.isFinite(total) ? total : null;
}
function groupEvidence(group) {
  return { groupId: group.groupId, sourceFile: group.sourceFile || group.filePath, sourceSha256: group.sourceSha256 || null,
    sourceSheet: group.sourceSheet || group.sheetName, sourceOwner: group.sourceOwner || null, sourceRows: group.sourceRows || [],
    allocationSourceRows: group.allocationSourceRows || [], allocationEvidence: group.allocationEvidence || null,
    inputFile: group.filePath || null, inputSha256: group.inputSha256 || null, inputSheet: group.sheetName || null,
    multiplier: group.multiplier ?? null, quantityBridge: group.quantityBridge || [], inputQuantityBasis: group.inputQuantityBasis || null,
    scope: 'GROUP_INTAKE_AND_QUANTITY_PROVENANCE_NOT_HARDWARE_OR_VENDOR_ACCEPTANCE' };
}
function facilityGroup(group, outcome) {
  const data = outcome.result?.data || outcome.result;
  const sizing = data?.clusterSizing;
  const count = sizing?.serverCount ?? data?.serverCount ?? data?.configurationContext?.multiplier;
  const bound = !group.blocked && outcome.status !== 'ERROR' && count === group.multiplier;
  return { groupId: group.groupId, totalNodes: group.multiplier ?? null, outcome: outcome.status,
    sizing: sizing || null, sizingQuantityBound: bound, totalRackUnits: bound ? sizing?.totalRackUnits ?? null : null,
    railKitCoverage: bound ? sizing?.railKitCoverage || null : null,
    evidenceLogPath: data?.evidenceLogPath || null, evidenceSummaryPath: data?.evidenceSummaryPath || null };
}
function aggregateFacility(groups, outcomes) {
  const records = groups.map((group, index) => facilityGroup(group, outcomes[index]));
  const totalRackUnits = sumKnown(records.map(group => group.totalRackUnits));
  const railProvided = sumKnown(records.map(group => group.railKitCoverage?.providedCount));
  const totalNodes = sumKnown(records.map(group => group.totalNodes));
  return { totalNodes, totalRackUnits, standard42uRacksRequired: totalRackUnits === null ? null : Math.ceil(totalRackUnits / 42),
    usable42uRacksRequired: null, totalFacilityPowerKw: null, peakFacilityFeedKw: null, actualDrawKw: null,
    installedPsuNameplateKw: null, nominalRedundantCapacityKw: null, utilityVoltage: null,
    railKitCoverage: { required: totalNodes, providedCount: railProvided, isCompliant: totalNodes === null || railProvided === null ? null : railProvided >= totalNodes },
    sizingStatus: 'PARTIAL_CANONICAL_SIZING_SITE_VALIDATION_REQUIRED',
    unknowns: ['SITE_RACK_RESERVE', 'ACTUAL_AND_PEAK_LOAD', 'PSU_POPULATION_AND_INPUT_DERATING', 'REDUNDANCY', 'UTILITY_AND_FEED_CAPACITY', 'COOLING'],
    scope: 'Canonical group sizing arithmetic only; component power heuristics are not measured facility draw or electrical approval.', groups: records };
}
function attachGroupEvidence(groups, outcomes) {
  const facilitySummary = aggregateFacility(groups, outcomes);
  return outcomes.map((outcome, index) => ({ ...outcome, group: groupEvidence(groups[index]), facilitySummary }));
}
module.exports = { attachGroupEvidence, aggregateFacility };
