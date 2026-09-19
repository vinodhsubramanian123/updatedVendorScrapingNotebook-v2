'use strict';

const test = require('node:test');
const assert = require('node:assert');
const {
  getRegisteredAspectsForDomain,
  registerCustomAspect,
  evaluateDomainAspects
} = require('../../scripts/lib/aspects/aspect_registry.js');

test('AspectRegistry — Retrieves aspect checkers per domain', () => {
  const serverAspects = getRegisteredAspectsForDomain('server');
  assert.strictEqual(serverAspects.length, 8);
  assert.ok(serverAspects.some(a => a.id === 'COMPUTE_THERMAL'));

  const storageAspects = getRegisteredAspectsForDomain('storage');
  assert.strictEqual(storageAspects.length, 4);
  assert.ok(storageAspects.some(a => a.id === 'STORAGE_CONTROLLER_PAIR'));

  const netAspects = getRegisteredAspectsForDomain('networking');
  assert.strictEqual(netAspects.length, 3);
  assert.ok(netAspects.some(a => a.id === 'SWITCH_FABRIC_PORTS'));

  const aiAspects = getRegisteredAspectsForDomain('ai_cluster');
  assert.strictEqual(aiAspects.length, 7);
});

test('AspectRegistry — Registers custom aspect cleanly', () => {
  registerCustomAspect('storage', {
    id: 'CUSTOM_REPLICATION_CHECK',
    name: 'Storage Replication Sync Aspect',
    checker: () => ({ status: 'PASS' })
  });

  const storageAspects = getRegisteredAspectsForDomain('storage');
  assert.ok(storageAspects.some(a => a.id === 'CUSTOM_REPLICATION_CHECK'));
});

test('AspectRegistry — Evaluates domain aspects for Server and Storage', () => {
  const sampleServerBOM = [
    { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 1 },
    { sku: 'P73299-B21', description: 'Intel Xeon Gold 6548Y 2.8GHz 32C 280W Processor', quantity: 2 },
    { sku: 'P73300-B21', description: 'HPE 64GB 2Rx8 DDR5-5600 Smart Memory FIO Kit', quantity: 16 },
    { sku: 'P48820-B21', description: 'HPE DL380 Gen11 High Performance Fan Kit', quantity: 1 },
    { sku: 'P48809-B21', description: 'HPE ProLiant DL380 2U High Performance Heat Sink', quantity: 2 }
  ];

  // Without explicit chassis channel width profile, memory channel is NOT_EVALUATED (no invented 16-channel fallback)
  const serverEvalNoProfile = evaluateDomainAspects('server', sampleServerBOM, null, {}, 1);
  assert.strictEqual(serverEvalNoProfile.domain, 'server');
  assert.ok(serverEvalNoProfile.aspectCount >= 8);
  assert.strictEqual(serverEvalNoProfile.isAllPassed, false);
  const memCheck = serverEvalNoProfile.checks.find(c => c.id === 'MEMORY_CHANNEL');
  assert.strictEqual(memCheck.status, 'NOT_EVALUATED');

  // With explicit chassis profile, all server aspects pass
  const serverEval = evaluateDomainAspects('server', sampleServerBOM, { chassisMetadata: { memoryChannelsPerSocket: 8 } }, { channelWidth: 8 }, 1);
  assert.strictEqual(serverEval.domain, 'server');
  assert.strictEqual(serverEval.isAllPassed, true);

  const sampleStorageBOM = [
    { sku: 'R0P87A', description: 'HPE Alletra 9000 4-way Storage Controller Node Pair', quantity: 2 },
    { sku: 'R0P90A', description: 'HPE Alletra 9000 NVMe Drive Enclosure', quantity: 2 },
    { sku: 'P01366-B21', description: 'HPE 96W Smart Storage Battery (up to 20 Devices) with 145mm Cable Kit', quantity: 1 }
  ];

  const storageEval = evaluateDomainAspects('storage', sampleStorageBOM, null, {}, 1);
  assert.strictEqual(storageEval.domain, 'storage');
  assert.strictEqual(storageEval.isAllPassed, true);
});

test('AspectRegistry — Accurately catches real hardware conflicts and sets status to FAIL', () => {
  const conflictedServerBOM = [
    { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 1 },
    { sku: 'P73299-B21', description: 'Intel Xeon Gold 6548Y 2.8GHz 32C 280W Processor', quantity: 2 },
    { sku: 'P03178-B21', description: 'HPE 800W FS Plat Hot Plug Power Supply Kit', quantity: 1 },
    { sku: 'P03180-B21', description: 'HPE 1600W FS Titanium Hot Plug Power Supply Kit', quantity: 1 }
  ];

  const conflictEval = evaluateDomainAspects('server', conflictedServerBOM, null, {}, 1);
  assert.strictEqual(conflictEval.isAllPassed, false);
  const powerAspect = conflictEval.checks.find(c => c.id === 'POWER_ENVIRONMENT');
  assert.ok(powerAspect);
  assert.strictEqual(powerAspect.status, 'FAIL');
  assert.ok(powerAspect.errors.length > 0);
});

test('AspectRegistry — F10: Null/non-object normalization returns UNKNOWN, never PASS', () => {
  const { normalizeAspectResult } = require('../../scripts/lib/aspects/aspect_registry.js');
  const nullRes = normalizeAspectResult('COMPUTE_THERMAL', null);
  assert.strictEqual(nullRes.status, 'UNKNOWN');
  assert.ok(nullRes.errors.length > 0);

  const undefinedRes = normalizeAspectResult('STORAGE_TRI_MODE', undefined);
  assert.strictEqual(undefinedRes.status, 'UNKNOWN');

  const nonObjRes = normalizeAspectResult('MEMORY_CHANNEL', 'not an object');
  assert.strictEqual(nonObjRes.status, 'UNKNOWN');
});

test('AspectRegistry — F10: Normalizes needsSmartStorageBattery and hasMixedCpuModels correctly', () => {
  const { normalizeAspectResult } = require('../../scripts/lib/aspects/aspect_registry.js');

  const storageRes = normalizeAspectResult('STORAGE_TRI_MODE', {
    needsSmartStorageBattery: true
  });
  assert.strictEqual(storageRes.status, 'FAIL');
  assert.ok(storageRes.errors.some(e => e.includes('Smart Storage Battery')));

  const computeRes = normalizeAspectResult('COMPUTE_THERMAL', {
    hasMixedCpuModels: true
  });
  assert.strictEqual(computeRes.status, 'FAIL');
  assert.ok(computeRes.errors.some(e => e.includes('mixed CPU models')));
});

test('AspectRegistry — F15: Archive domain does not fall back to server checks', () => {
  const archiveEval = evaluateDomainAspects('archive', [], null, {}, 1);
  assert.strictEqual(archiveEval.domain, 'archive');
  assert.strictEqual(archiveEval.capability.status, 'NOT_EVALUATED');
  assert.strictEqual(archiveEval.isAllPassed, false);
  assert.strictEqual(archiveEval.checks[0].status, 'NOT_EVALUATED');
  assert.strictEqual(archiveEval.checks[0].id, 'ARCHIVE_COLD_STORAGE');
});

test('AspectRegistry — F15: Networking domain marks switch fabric NOT_EVALUATED', () => {
  const netEval = evaluateDomainAspects('networking', [
    { sku: 'JL661A', description: 'Aruba CX 6300M 48G Switch', quantity: 1 }
  ], null, {}, 1);

  assert.strictEqual(netEval.domain, 'networking');
  const switchFabric = netEval.checks.find(c => c.id === 'SWITCH_FABRIC_PORTS');
  assert.ok(switchFabric);
  assert.strictEqual(switchFabric.status, 'NOT_EVALUATED');
  assert.strictEqual(netEval.isAllPassed, false);
});
