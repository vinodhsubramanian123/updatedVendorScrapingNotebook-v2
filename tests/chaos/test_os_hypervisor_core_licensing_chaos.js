'use strict';
/**
 * tests/chaos/test_os_hypervisor_core_licensing_chaos.js
 * Chaos / boundary testing for OS & Hypervisor Physical Core Multiplier Licensing subsystem.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const { evalSupportManufacturing } = require('../../scripts/lib/aspects/support_manufacturing.js');

test('OS & Hypervisor Core Licensing Chaos Boundaries', async (t) => {

  await t.test('Windows Server - Minimum 16 cores per server boundary', () => {
    // 8-core CPU requires minimum 16 core licenses
    const items = [
      { sku: 'P12345-B21', description: 'Intel Xeon Silver 4309Y 8-core Processor', quantity: 1 },
      { sku: 'P12346-B21', description: 'Windows Server 2022 16-Core Base License', quantity: 1 }
    ];
    const res = evalSupportManufacturing(items);
    assert.strictEqual(res.hasWindowsServer, true);
    assert.strictEqual(res.detectedCpuCores, 16, 'Detected cores should hit minimum 16');
    assert.strictEqual(res.totalWindowsLicensedCores, 16);
    assert.strictEqual(res.needsAdditionalWindowsCores, false);
    assert.strictEqual(res.missingCoreLicenses, 0);
  });

  await t.test('Windows Server - High core count demanding add-ons', () => {
    // 2x 32-core CPUs = 64 cores total. Base provides 16. Needs 48 more.
    const items = [
      { sku: 'P12345-B21', description: 'Intel Xeon Gold 6430 32-core Processor', quantity: 2 },
      { sku: 'P12346-B21', description: 'Windows Server 2022 16-Core Base License', quantity: 1 },
      { sku: 'P12347-B21', description: 'Windows Server 2022 16-Core Additional License', quantity: 1 },
      { sku: 'P12348-B21', description: 'Windows Server 2022 4-core Additional License', quantity: 4 },
      { sku: 'P12349-B21', description: 'Windows Server 2022 2-core Additional License', quantity: 8 }
    ];
    const res = evalSupportManufacturing(items);
    assert.strictEqual(res.detectedCpuCores, 64);
    // 16(base) + 16(add) + 16(4*4) + 16(8*2) = 64
    assert.strictEqual(res.totalWindowsLicensedCores, 64);
    assert.strictEqual(res.needsAdditionalWindowsCores, false);
    assert.strictEqual(res.missingCoreLicenses, 0);
  });

  await t.test('Windows Server - Under-licensed scenario', () => {
    // 2x 24-core CPUs = 48 cores total.
    const items = [
      { sku: 'P12345-B21', description: 'Intel Xeon Gold 5418Y 24-core Processor', quantity: 2 },
      { sku: 'P12346-B21', description: 'Windows Server 2022 16-Core Base License', quantity: 1 }
    ];
    const res = evalSupportManufacturing(items);
    assert.strictEqual(res.detectedCpuCores, 48);
    assert.strictEqual(res.totalWindowsLicensedCores, 16);
    assert.strictEqual(res.needsAdditionalWindowsCores, true);
    assert.strictEqual(res.missingCoreLicenses, 32);
  });

  await t.test('VMware vSphere/Cloud Foundation - 16 cores per socket minimum (Single Socket 8-core)', () => {
    // 1x 8-core CPU requires 16-core minimum
    const items = [
      { sku: 'P12345-B21', description: 'Intel Xeon Silver 4309Y 8-core Processor', quantity: 1 },
      { sku: 'VMW-VVF-1C', description: 'VMware vSphere Foundation 1-core', quantity: 8 }
    ];
    const res = evalSupportManufacturing(items);
    assert.strictEqual(res.hasVmware, true);
    assert.strictEqual(res.detectedCpuSockets, 1);
    assert.strictEqual(res.targetVmwareCores, 16); // 1 socket * max(16, 8) = 16
    assert.strictEqual(res.vmwareLicensedCores, 8);
    assert.strictEqual(res.needsAdditionalVmwareCores, true);
    assert.strictEqual(res.missingVmwareCores, 8);
  });

  await t.test('VMware vSphere/Cloud Foundation - Exact math (Dual Socket 32-core)', () => {
    // 2x 32-core CPU = 64 cores needed
    const items = [
      { sku: 'P12345-B21', description: 'Intel Xeon Gold 6430 32-core Processor', quantity: 2 },
      { sku: 'VMW-VVF-16C', description: 'VMware vSphere Foundation 16-core', quantity: 4 }
    ];
    const res = evalSupportManufacturing(items);
    assert.strictEqual(res.hasVmware, true);
    assert.strictEqual(res.detectedCpuSockets, 2);
    assert.strictEqual(res.targetVmwareCores, 64);
    assert.strictEqual(res.vmwareLicensedCores, 64); // 4 * 16 = 64
    assert.strictEqual(res.needsAdditionalVmwareCores, false);
    assert.strictEqual(res.missingVmwareCores, 0);
  });

  await t.test('RHEL / SLES - 1-2 Socket Subscriptions (Dual Socket)', () => {
    // 2 Sockets requires 1 subscription (covers 2 sockets)
    const items = [
      { sku: 'P12345-B21', description: 'Intel Xeon Gold 6430 32-core Processor', quantity: 2 },
      { sku: 'RHEL-1', description: 'Red Hat Enterprise Linux Server', quantity: 1 }
    ];
    const res = evalSupportManufacturing(items);
    assert.strictEqual(res.hasLinux, true);
    assert.strictEqual(res.detectedCpuSockets, 2);
    assert.strictEqual(res.targetLinuxSubscriptions, 1);
    assert.strictEqual(res.linuxSubscriptions, 1);
    assert.strictEqual(res.needsAdditionalLinuxSubscriptions, false);
    assert.strictEqual(res.missingLinuxSubscriptions, 0);
  });

  await t.test('RHEL / SLES - 1-2 Socket Subscriptions (Quad Socket Under-licensed)', () => {
    // 4 Sockets requires 2 subscriptions
    const items = [
      { sku: 'P12345-B21', description: 'Intel Xeon Gold 6430 32-core Processor', quantity: 4 },
      { sku: 'SLES-1', description: 'SUSE Linux Enterprise Server', quantity: 1 }
    ];
    const res = evalSupportManufacturing(items);
    assert.strictEqual(res.hasLinux, true);
    assert.strictEqual(res.detectedCpuSockets, 4);
    assert.strictEqual(res.targetLinuxSubscriptions, 2);
    assert.strictEqual(res.linuxSubscriptions, 1);
    assert.strictEqual(res.needsAdditionalLinuxSubscriptions, true);
    assert.strictEqual(res.missingLinuxSubscriptions, 1);
  });

});
