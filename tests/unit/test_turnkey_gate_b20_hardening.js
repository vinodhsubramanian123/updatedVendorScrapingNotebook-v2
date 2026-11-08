'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { verifyPrePresentationAcceptance } = require('../../scripts/lib/boq/bom_verifier');

test('Gate B20 rejects turnkey tender when rail kit quantity is missing or zero', () => {
  const output = {
    items: [
      { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF NC CTO Server', quantity: 1 },
      { sku: 'P52341-B21', description: 'HPE DL38X Gen10 Plus/Gen11/Gen12 2U SFF Easy Install Rail Kit', quantity: 0 },
      { sku: 'P51178-B21', description: 'Broadcom BCM5719 Ethernet 1Gb 4-port BASE-T OCP3 Adapter', quantity: 1 }
    ]
  };
  const context = {
    tenderText: 'Customer mandates turnkey deployment with rack installation and cabling.'
  };
  const result = verifyPrePresentationAcceptance(output, 'BOQ_EVALUATION', context);

  const b20 = result.checks.find(c => c.id === 'B20');
  assert.ok(b20, 'Gate B20 check must be present');
  assert.strictEqual(b20.status, 'ACTION_REQUIRED');
  assert.ok(b20.detail.includes('Rack Rail Kit'), 'Must flag missing rail kit due to 0 quantity');
});

test('Gate B20 rejects turnkey tender when rail kit quantity is less than node count', () => {
  const output = {
    items: [
      { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF NC CTO Server', quantity: 2 },
      { sku: 'P52341-B21', description: 'HPE DL38X Gen10 Plus/Gen11/Gen12 2U SFF Easy Install Rail Kit', quantity: 1 }
    ]
  };
  const context = {
    tenderText: 'Customer mandates onsite racking, turnkey installation and cabling.'
  };
  const result = verifyPrePresentationAcceptance(output, 'BOQ_EVALUATION', context);

  const b20 = result.checks.find(c => c.id === 'B20');
  assert.ok(b20, 'Gate B20 check must be present');
  assert.strictEqual(b20.status, 'ACTION_REQUIRED');
  assert.ok(b20.detail.includes('Rail kit quantity (1) insufficient for 2 nodes'), 'Must flag rail kit quantity deficit');
});

test('Gate B20 rejects turnkey tender when optical NIC ports exceed optical transceiver count', () => {
  const output = {
    items: [
      { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF NC CTO Server', quantity: 1 },
      { sku: 'P52341-B21', description: 'HPE DL38X Gen10 Plus/Gen11/Gen12 2U SFF Easy Install Rail Kit', quantity: 1 },
      { sku: 'P22708-B21', description: 'Mellanox MCX623106AS-CDAT Ethernet 100Gb 2-port QSFP56 Adapter', quantity: 1 },
      { sku: '845398-B21', description: 'HPE 25Gb SFP28 SR 100m Optical Transceiver', quantity: 1 }
    ]
  };
  const context = {
    tenderText: 'Turnkey cabling and installation required.'
  };
  const result = verifyPrePresentationAcceptance(output, 'BOQ_EVALUATION', context);

  const b20 = result.checks.find(c => c.id === 'B20');
  assert.ok(b20, 'Gate B20 check must be present');
  assert.strictEqual(b20.status, 'ACTION_REQUIRED');
  assert.ok(b20.detail.includes('Optical transceiver quantity (1) insufficient for 2 optical ports'), 'Must flag transceiver port deficit');
});

test('Gate B20 passes when rail kit and optical transceivers meet or exceed node and port counts', () => {
  const output = {
    items: [
      { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF NC CTO Server', quantity: 2 },
      { sku: 'P52341-B21', description: 'HPE DL38X Gen10 Plus/Gen11/Gen12 2U SFF Easy Install Rail Kit', quantity: 2 },
      { sku: 'P22708-B21', description: 'Mellanox MCX623106AS-CDAT Ethernet 100Gb 2-port QSFP56 Adapter', quantity: 2 },
      { sku: '845398-B21', description: 'HPE 25Gb SFP28 SR 100m Optical Transceiver', quantity: 4 }
    ]
  };
  const context = {
    tenderText: 'Turnkey cabling and installation required.'
  };
  const result = verifyPrePresentationAcceptance(output, 'BOQ_EVALUATION', context);

  const b20 = result.checks.find(c => c.id === 'B20');
  assert.ok(b20, 'Gate B20 check must be present');
  assert.strictEqual(b20.status, 'PASSED');
});
