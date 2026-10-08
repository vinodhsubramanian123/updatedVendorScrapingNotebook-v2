'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { EXPORT_FIXTURE, exporterCandidate } = require('../../../tests/fixtures/skill_workflow_characterization.js');
const EXPORT_IDS = Object.freeze(['S17-diagnostic-export-contract', 'S17-authorized-export-contract']);

function scopedOutput(root, id) {
  if (!EXPORT_IDS.includes(id)) throw new Error('Unknown controlled export scenario');
  const realRoot = fs.realpathSync(root);
  if (realRoot !== path.resolve(process.env.SKILL_ISOLATION_ROOT || '') || !process.env.SKILL_ISOLATION_CONTROL) throw new Error('Controlled export requires qualified isolated worker');
  const output = path.join(realRoot, 'outputs/history/skill_workflow_excellence/export_contract', id);
  fs.mkdirSync(output, { recursive: true });
  return output;
}
function exporters(service, candidate, output, diagnostic = false) {
  const options = diagnostic ? { diagnostic: true } : {};
  return [
    ['portalWorkbookPath', 'portal.xlsx', file => service.generateRankedPortalWorkbook(candidate, file, options)],
    ['proposalWorkbookPath', 'proposal.xlsx', file => service.generateProfessionalBOQ(candidate, file, 'DL380_Gen12', 1, options)],
    ['multiRankWorkbookPath', 'multi.xlsx', file => service.generateMultiRankSolutionWorkbook(candidate, file, 'DL380_Gen12', options)],
    ['multiRankCsvPath', 'multi.csv', file => service.generateMultiRankSolutionCsv(candidate, file, options)]
  ].map(([field, name, invoke]) => ({ field, path: path.join(output, name), invoke }));
}
function requireRejectedAll(service, candidate, output, pattern) {
  let blocked = 0;
  for (const control of exporters(service, candidate, output)) {
    assert.throws(() => control.invoke(control.path), pattern); blocked++;
    assert.equal(fs.existsSync(control.path), false, 'Rejected export must not create artifact');
  }
  return blocked;
}
function executeContract(id, output) {
  const service = require('../../lib/boq/generate_boq_xlsx.js');
  const { deliveryFingerprint } = require('../../lib/boq/solution_evidence.js');
  const { issueDeliveryAuthorization, verifyDeliveryAuthorization } = require('../../lib/contracts/workflow_contract.js');
  const candidate = exporterCandidate();
  candidate.manifestFingerprint = deliveryFingerprint(candidate);
  const controls = { missingAuthorizationBlocked: requireRejectedAll(service, candidate, path.join(output, 'negative-missing'), /DeliveryAuthorization is missing/i) };
  const authorization = issueDeliveryAuthorization({ manifestFingerprint: candidate.manifestFingerprint, chassisKey: candidate.chassis,
    acceptanceDecision: { isApproved: true, profile: 'BOQ_EVALUATION' }, secret: EXPORT_FIXTURE.signingKey });
  assert.equal(verifyDeliveryAuthorization(authorization, deliveryFingerprint(candidate), { secret: EXPORT_FIXTURE.signingKey,
    chassisKey: candidate.chassis, profile: 'BOQ_EVALUATION' }), true);
  const authorized = { ...candidate, deliveryAuthorization: authorization };
  const tampered = structuredClone(authorized);
  tampered.deliveryAuthorization.signature = '0'.repeat(64);
  tampered.deliveryAuthorization.token = 'DELIV-AUTH-' + tampered.deliveryAuthorization.signature;
  controls.tamperedSignatureBlocked = requireRejectedAll(service, tampered, path.join(output, 'negative-signature'), /cryptographic verification/i);
  const changedQuantity = structuredClone(authorized); changedQuantity.items[0].quantity = 3;
  controls.changedQuantityBlocked = requireRejectedAll(service, changedQuantity, path.join(output, 'negative-quantity'), /cryptographic verification/i);
  const diagnostic = id === EXPORT_IDS[0], deliveredCandidate = diagnostic ? candidate : authorized;
  const artifacts = {};
  for (const control of exporters(service, deliveredCandidate, output, diagnostic)) {
    control.invoke(control.path); const stat = fs.statSync(control.path);
    assert.equal(stat.isFile() && stat.size > 0, true); artifacts[control.field] = control.path;
  }
  return { status: 'CONTROLLED_EXPORT_CONTRACT_COMPLETED', exportMode: diagnostic ? 'DIAGNOSTIC' : 'AUTHORIZED_FIXTURE',
    fixtureMeaning: EXPORT_FIXTURE.meaning, fixtureSource: EXPORT_FIXTURE.source,
    hardwareAccepted: false, vendorAccepted: false, fixtureClock: EXPORT_FIXTURE.clock,
    authorization, authorizationVerified: true, controls, candidate: deliveredCandidate, ...artifacts };
}
function runExportContract(scenario, root) {
  if (scenario.mode !== 'CONTROLLED_EXPORT_CONTRACT' || !EXPORT_IDS.includes(scenario.id)) throw new Error('Invalid controlled export descriptor');
  const output = scopedOutput(root, scenario.id), RealDate = Date;
  const hadKey = Object.hasOwn(process.env, 'DELIVERY_AUTH_SECRET'), originalKey = process.env.DELIVERY_AUTH_SECRET;
  class FixtureDate extends RealDate { constructor(...args) { super(...(args.length ? args : [EXPORT_FIXTURE.clock])); } static now() { return RealDate.parse(EXPORT_FIXTURE.clock); } }
  try { globalThis.Date = FixtureDate; process.env.DELIVERY_AUTH_SECRET = EXPORT_FIXTURE.signingKey; return executeContract(scenario.id, output); }
  finally { globalThis.Date = RealDate; if (hadKey) process.env.DELIVERY_AUTH_SECRET = originalKey; else delete process.env.DELIVERY_AUTH_SECRET; }
}
module.exports = { EXPORT_IDS, runExportContract };
