'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');

const { classifyPortalError, processPortalFeedback } = require('../../scripts/lib/feedback/feedback_loop.js');
const { loadActiveKnowledgeRules } = require('../../scripts/lib/catalog/active_knowledge_router.js');
const { validateVendorAdapter } = require('../../scripts/lib/contracts/vendor_adapter_contract.js');
const { createHpeAdapter } = require('../../scripts/lib/adapters/hpe_adapter.js');
const { createDellAdapter } = require('../../scripts/lib/adapters/dell_adapter.js');
const { createVendorXAdapter } = require('../../scripts/lib/adapters/vendor_x_adapter.js');
const { getPlatformProfile } = require('../../scripts/lib/rules/platform_profiles.js');

test('CP12b/c — classifyPortalError categorizes OPERATIONAL_INCIDENT and shields knowledge base', () => {
  const networkError = classifyPortalError('ETIMEDOUT: Connection to WebLogic OCA portal timed out on port 9222');
  assert.equal(networkError.category, 'OPERATIONAL_INCIDENT');
  assert.equal(networkError.errorType, 'OPERATIONAL_INCIDENT');

  const ssoError = classifyPortalError('WebLogic SSO session expired; 403 Forbidden redirect');
  assert.equal(ssoError.category, 'OPERATIONAL_INCIDENT');

  const cdpError = classifyPortalError('CDP chrome disconnected during automation');
  assert.equal(cdpError.category, 'OPERATIONAL_INCIDENT');
});

test('CP12b/c — classifyPortalError categorizes WORKFLOW_ADVISORY and shields knowledge base', () => {
  const domError = classifyPortalError('Smart CTO button selector #smartCtoBtn relocated in DOM layout');
  assert.equal(domError.category, 'WORKFLOW_ADVISORY');
  assert.equal(domError.errorType, 'WORKFLOW_ADVISORY');

  const xpathError = classifyPortalError('XPath menu tab shifted to new location');
  assert.equal(xpathError.category, 'WORKFLOW_ADVISORY');
});

test('CP12b/c — processPortalFeedback rejects operational/workflow incidents from creating hardware rules', () => {
  const tmpDir = path.join(os.tmpdir(), `test_feedback_quarantine_${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    const opResult = processPortalFeedback('ETIMEDOUT: Connection refused', tmpDir);
    assert.equal(opResult.status, 'OPERATIONAL_INCIDENT_RECORDED');
    assert.equal(opResult.category, 'OPERATIONAL_INCIDENT');
    assert.equal(opResult.governanceStatus, 'IGNORED_FOR_HARDWARE_RULES');

    const wfResult = processPortalFeedback('CSS selector button relocated', tmpDir);
    assert.equal(wfResult.status, 'WORKFLOW_ADVISORY_RECORDED');
    assert.equal(wfResult.category, 'WORKFLOW_ADVISORY');
    assert.equal(wfResult.governanceStatus, 'WORKFLOW_ADVISORY_ONLY');

    // Assert that no hardware catalog rules or quarantined deltas were created
    const quarantineFile = path.join(tmpDir, 'history', 'quarantined_deltas.json');
    assert.equal(fs.existsSync(quarantineFile), false, 'Must never create quarantined delta for operational incidents');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('CP12a — Demonstrated learning consumption respects Generation & Family Firewall', () => {
  const sampleDelta = {
    deltaId: 'DELTA-TEST-GEN12-ONLY',
    chassis: 'DL380_Gen12',
    affectedSku: 'P73282-B21',
    requiredDependencySku: 'P48820-B21',
    ruleType: 'PERMANENT_PHYSICAL_DEPENDENCY',
    ruleUpdate: 'DL380 Gen12 CTO Server requires High Performance Fan Kit',
    governanceStatus: 'ACTIVE',
    scopeTaxonomy: 'CHASSIS_SPECIFIC'
  };

  // 1. In-scope target: DL380_Gen12 must include the rule
  const gen12Rules = loadActiveKnowledgeRules('DL380_Gen12', '', { rawDeltas: [sampleDelta] });
  assert.ok(gen12Rules.allRules.some(r => r.ruleId === 'DELTA-TEST-GEN12-ONLY'), 'In-scope query must trigger the rule');

  // 2. Out-of-scope target: DL380_Gen11 must NOT include Gen12-specific rule
  const gen11Rules = loadActiveKnowledgeRules('DL380_Gen11', '', { rawDeltas: [sampleDelta] });
  assert.equal(gen11Rules.allRules.some(r => r.ruleId === 'DELTA-TEST-GEN12-ONLY'), false, 'Out-of-scope query must not trigger rule');

  // 3. Different family: Synergy must NOT include ProLiant chassis rule
  const synergyRules = loadActiveKnowledgeRules('Synergy_480_Gen11', '', { rawDeltas: [sampleDelta] });
  assert.equal(synergyRules.allRules.some(r => r.ruleId === 'DELTA-TEST-GEN12-ONLY'), false, 'Different family must not trigger rule');
});

test('CP13a/b/c — Vendor adapters conform strictly to VendorAdapterDescriptorSchema', () => {
  const hpe = createHpeAdapter();
  const dell = createDellAdapter();
  const vendorX = createVendorXAdapter();

  const hpeCheck = validateVendorAdapter(hpe);
  assert.equal(hpeCheck.valid, true, `HPE adapter invalid: ${hpeCheck.issues.join(', ')}`);
  assert.equal(hpe.normalizeIdentifier('P73282-B21'), 'P73282-B21');

  const dellCheck = validateVendorAdapter(dell);
  assert.equal(dellCheck.valid, true, `Dell adapter invalid: ${dellCheck.issues.join(', ')}`);
  assert.equal(dell.normalizeIdentifier('R760-CTO'), 'R760-CTO');

  const vxCheck = validateVendorAdapter(vendorX);
  assert.equal(vxCheck.valid, true, `Vendor-X adapter invalid: ${vxCheck.issues.join(', ')}`);
  assert.equal(vxCheck.issues.length, 0);
  assert.equal(vendorX.normalizeIdentifier('SRV-X1'), 'VX-SRV-X1');
});

test('CP15 / CP16 — Platform profiles resolve Dell and synthetic Vendor-X platforms cleanly', () => {
  const dellProfile = getPlatformProfile('DELL_POWEREDGE_R760');
  assert.ok(dellProfile, 'Dell R760 profile must exist');
  assert.equal(dellProfile.vendor, 'Dell');
  assert.equal(dellProfile.memoryArchitecture.maxDimmsPerChassis, 32);

  const vxProfile = getPlatformProfile('VENDOR_X_SERVER_X1');
  assert.ok(vxProfile, 'Vendor-X profile must exist');
  assert.equal(vxProfile.vendor, 'Vendor-X');
  assert.equal(vxProfile.memoryArchitecture.maxDimmsPerChassis, 16);
});
