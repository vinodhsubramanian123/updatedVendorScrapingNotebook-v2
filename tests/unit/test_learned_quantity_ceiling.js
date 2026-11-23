'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { validateConflictGraph } = require('../../scripts/lib/conflict/conflict_graph.js');

const DL385_DIR = path.resolve(__dirname, '..', '..', 'outputs', 'ProLiant', 'Gen11', 'DL385_Gen11');
const DL380_G12_DIR = path.resolve(__dirname, '..', '..', 'outputs', 'ProLiant', 'Gen12', 'DL380_Gen12');

test('CLIC Rule 81353846 actively blocks 2x P57848-B21 on DL385_Gen11', () => {
  const bom = [
    { sku: 'P53921-B21', qty: 1, description: 'HPE ProLiant DL385 Gen11 8SFF Configure-to-order Server' },
    { sku: 'P55082-B21', qty: 2, description: 'HPE ProLiant DL385 Gen11 8SFF Tri-Mode U.3 x1 BC Backplane Kit' },
    { sku: 'P47777-B21', qty: 1, description: 'HPE MR416i-p Gen11 x16 Lanes 8GB Cache PCI SPDM Plug-in Storage Controller' },
    { sku: 'P57848-B21', qty: 2, description: 'HPE ProLiant DL385 Gen11 8SFF x1 SAS/SATA PCIe Cable Kit' },
    { sku: 'P57886-B21', qty: 1, description: 'HPE ProLiant DL385 Gen11 2U Standard/Performance FIO Air Baffle Kit' },
    { sku: 'R7A11AAE', qty: 1, description: 'HPE Compute Ops Management Standard 3-year Upfront ProLiant SaaS' }
  ];

  const res = validateConflictGraph(bom, [], DL385_DIR, 'DL385_Gen11', { skipSynthesis: true });
  const ceiling = (res.conflicts || []).find(c => c.type === 'QUANTITY_CEILING_EXCEEDED' && c.sku === 'P57848-B21');
  assert.ok(ceiling, 'Expected QUANTITY_CEILING_EXCEEDED conflict for 2x P57848-B21');
  assert.equal(ceiling.observedQty, 2);
  assert.equal(ceiling.maxAllowedQty, 1);
  assert.equal(ceiling.vendorRuleId, '81353846');

  const audit = (res.auditLog || []).find(a => a.ruleId === 'CLIC_81353846_DL385_G11_CABLE_MAX1' && a.skuTarget === 'P57848-B21');
  assert.ok(audit);
  assert.equal(audit.status, 'FAIL');
  assert.equal(audit.applied, true);
});

test('CLIC Rule 81353846 enforces sibling cable SKUs (e.g. 2x P57847-B21) even without P57848-B21', () => {
  const bom = [
    { sku: 'P53921-B21', qty: 1, description: 'HPE ProLiant DL385 Gen11 8SFF Configure-to-order Server' },
    { sku: 'P57847-B21', qty: 2, description: 'HPE ProLiant DL385 Gen11 8SFF OROC x1 SAS/SATA Cable Kit' },
    { sku: 'P57886-B21', qty: 1, description: 'HPE ProLiant DL385 Gen11 2U Standard/Performance FIO Air Baffle Kit' },
    { sku: 'R7A11AAE', qty: 1, description: 'HPE Compute Ops Management Standard 3-year Upfront ProLiant SaaS' }
  ];

  const res = validateConflictGraph(bom, [], DL385_DIR, 'DL385_Gen11', { skipSynthesis: true });
  const ceiling = (res.conflicts || []).find(c => c.type === 'QUANTITY_CEILING_EXCEEDED' && c.sku === 'P57847-B21');
  assert.ok(ceiling, 'Expected QUANTITY_CEILING_EXCEEDED conflict for sibling SKU 2x P57847-B21');
  assert.equal(ceiling.vendorRuleId, '81353846');
});

test('CLIC Rule 81353846 passes cleanly for 1x P57848-B21 and does not leak to DL380_Gen12', () => {
  const validBom = [
    { sku: 'P53921-B21', qty: 1, description: 'HPE ProLiant DL385 Gen11 8SFF Configure-to-order Server' },
    { sku: 'P57848-B21', qty: 1, description: 'HPE ProLiant DL385 Gen11 8SFF x1 SAS/SATA PCIe Cable Kit' },
    { sku: 'P57886-B21', qty: 1, description: 'HPE ProLiant DL385 Gen11 2U Standard/Performance FIO Air Baffle Kit' },
    { sku: 'R7A11AAE', qty: 1, description: 'HPE Compute Ops Management Standard 3-year Upfront ProLiant SaaS' }
  ];

  const okRes = validateConflictGraph(validBom, [], DL385_DIR, 'DL385_Gen11', { skipSynthesis: true });
  assert.equal((okRes.conflicts || []).filter(c => c.type === 'QUANTITY_CEILING_EXCEEDED').length, 0);
  const passAudit = (okRes.auditLog || []).find(a => a.ruleId === 'CLIC_81353846_DL385_G11_CABLE_MAX1' && a.skuTarget === 'P57848-B21');
  assert.ok(passAudit);
  assert.equal(passAudit.status, 'PASS');
  assert.equal(passAudit.applied, true);

  // Negative control: Gen11 DL385 rule must NOT leak into DL380_Gen12
  const gen12Bom = [
    { sku: 'P73282-B21', qty: 1, description: 'HPE ProLiant Compute DL380 Gen12 8SFF NC CTO Server' },
    { sku: 'P57848-B21', qty: 2, description: 'HPE ProLiant DL385 Gen11 8SFF x1 SAS/SATA PCIe Cable Kit' }
  ];
  const g12Res = validateConflictGraph(gen12Bom, [], DL380_G12_DIR, 'DL380_Gen12', { skipSynthesis: true });
  assert.equal((g12Res.conflicts || []).filter(c => c.vendorRuleId === '81353846').length, 0);
});
