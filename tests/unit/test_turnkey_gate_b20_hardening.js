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
      { sku: '866529-B21', description: 'HPE 100Gb QSFP28 MPO SR4 100m Optical Transceiver', quantity: 1 }
    ]
  };
  const context = {
    tenderText: 'Turnkey cabling and installation required.'
  };
  const result = verifyPrePresentationAcceptance(output, 'BOQ_EVALUATION', context);

  const b20 = result.checks.find(c => c.id === 'B20');
  assert.ok(b20, 'Gate B20 check must be present');
  assert.strictEqual(b20.status, 'ACTION_REQUIRED');
  assert.ok(b20.detail.includes('Optical transceiver quantity (1) insufficient for 2 100G ports'), 'Must flag transceiver port deficit');
});

test('Gate B20 rejects incompatible optics even when aggregate counts match port count', () => {
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
  assert.strictEqual(b20.status, 'ACTION_REQUIRED');
  assert.match(b20.detail, /mismatch/i);
});

test('Gate B20 passes turnkey tender when 100Gb optical NIC ports match 100Gb optical transceivers', () => {
  const output = {
    items: [
      { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF NC CTO Server', quantity: 2 },
      { sku: 'P52341-B21', description: 'HPE DL38X Gen10 Plus/Gen11/Gen12 2U SFF Easy Install Rail Kit', quantity: 2 },
      { sku: 'P22708-B21', description: 'Mellanox MCX623106AS-CDAT Ethernet 100Gb 2-port QSFP56 Adapter', quantity: 2 },
      { sku: '866529-B21', description: 'HPE 100Gb QSFP28 MPO SR4 100m Optical Transceiver', quantity: 4 }
    ]
  };
  const context = {
    tenderText: 'Turnkey cabling and installation required.'
  };
  const result = verifyPrePresentationAcceptance(output, 'BOQ_EVALUATION', context);

  const b20 = result.checks.find(c => c.id === 'B20');
  assert.ok(b20, 'Gate B20 check must be present');
  assert.strictEqual(b20.status, 'PASSED');
  assert.match(b20.detail, /speed-matched/);
});

test('Gate B20 passes turnkey tender when 25Gb optical NIC ports match 25Gb optical transceivers', () => {
  const output = {
    items: [
      { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF NC CTO Server', quantity: 1 },
      { sku: 'P52341-B21', description: 'HPE DL38X Gen10 Plus/Gen11/Gen12 2U SFF Easy Install Rail Kit', quantity: 1 },
      { sku: 'P10180-B21', description: 'Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter', quantity: 1 },
      { sku: '845398-B21', description: 'HPE 25Gb SFP28 SR 100m Optical Transceiver', quantity: 2 }
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

test('Gate B20 rejects turnkey tender when 1U chassis is configured with 2U rail kit', () => {
  const output = {
    items: [
      { sku: 'P56998-B21', description: 'HPE ProLiant DL360 Gen11 8SFF CTO Server', quantity: 1 },
      { sku: 'P52341-B21', description: 'HPE DL38X Gen10 Plus/Gen11/Gen12 2U SFF Easy Install Rail Kit', quantity: 1 },
      { sku: 'P51178-B21', description: 'Broadcom BCM5719 Ethernet 1Gb 4-port BASE-T OCP3 Adapter', quantity: 1 }
    ]
  };
  const context = {
    tenderText: 'Turnkey cabling and installation required.'
  };
  const result = verifyPrePresentationAcceptance(output, 'BOQ_EVALUATION', context);

  const b20 = result.checks.find(c => c.id === 'B20');
  assert.ok(b20, 'Gate B20 check must be present');
  assert.strictEqual(b20.status, 'ACTION_REQUIRED');
  assert.match(b20.detail, /1U-qualified Rack Rail Kit/);
});

test('Gate B20 passes turnkey tender when 1U chassis is configured with 1U rail kit', () => {
  const output = {
    items: [
      { sku: 'P56998-B21', description: 'HPE ProLiant DL360 Gen11 8SFF CTO Server', quantity: 1 },
      { sku: 'P52343-B21', description: 'HPE ProLiant DL360 Gen10 Plus/Gen11 1U Easy Install Rail Kit', quantity: 1 },
      { sku: 'P51178-B21', description: 'Broadcom BCM5719 Ethernet 1Gb 4-port BASE-T OCP3 Adapter', quantity: 1 }
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

test('Gate B20 rejects missing and malformed quantities even when rails are sufficient', () => {
  for (const quantity of [undefined, null, true, [], -1, 0, 1.5, 'invalid']) {
    const output = { items: [
      { description: 'CTO Server', quantity: 1 },
      { description: 'Rail Kit', quantity: 1 },
      { description: '100Gb 2-port Adapter', quantity }
    ] };
    const check = verifyPrePresentationAcceptance(output, 'BOQ_EVALUATION', { tenderText: 'turnkey' }).checks.find(c => c.id === 'B20');
    assert.equal(check.status, 'ACTION_REQUIRED');
    assert.match(check.detail, /quantities/);
  }
});

test('Gate B20 rejects explicit invalid server counts rather than hiding them with a fallback', () => {
  for (const serverCount of [0, -2, 1.5, NaN]) {
    const output = { items: [{ description: 'Rail Kit', quantity: 2 }] };
    const check = verifyPrePresentationAcceptance(output, 'BOQ_EVALUATION', { tenderText: 'turnkey', serverCount }).checks.find(c => c.id === 'B20');
    assert.equal(check.status, 'ACTION_REQUIRED');
    assert.match(check.detail, /server count/);
  }
});

test('Gate B20 retains positive rail and copper-only quantity verification', () => {
  const output = { items: [
    { description: 'CTO Server', quantity: 1 },
    { description: 'Rail Kit', quantity: '1' },
    { description: '10Gb 2-port BASE-T Adapter', quantity: 1 }
  ] };
  const check = verifyPrePresentationAcceptance(output, 'BOQ_EVALUATION', { tenderText: 'turnkey' }).checks.find(c => c.id === 'B20');
  assert.equal(check.status, 'PASSED');
});
