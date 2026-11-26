'use strict';
/**
 * scripts/lib/adapters/adapter_registry.js
 *
 * Contract-validated Vendor Adapter Registry supporting HPE, Dell, Huawei, Cisco,
 * Lenovo, and dynamically registered third-party vendor adapters.
 */

const { validateVendorAdapter } = require('../contracts/vendor_adapter_contract.js');
const { createHpeAdapter } = require('./hpe_adapter.js');
const { createDellAdapter } = require('./dell_adapter.js');
const { createHuaweiAdapter } = require('./huawei_adapter.js');
const { createCiscoAdapter } = require('./cisco_adapter.js');
const { createLenovoAdapter } = require('./lenovo_adapter.js');

const _registry = new Map();

function registerVendorAdapter(vendorId, factory) {
  const key = String(vendorId || '').trim().toUpperCase();
  if (!key) throw new Error('registerVendorAdapter requires a non-empty vendorId.');
  if (typeof factory !== 'function') throw new Error(`registerVendorAdapter(${key}) requires a factory function.`);
  const probe = factory();
  const validation = validateVendorAdapter(probe);
  if (!validation.valid) {
    throw new Error(`Vendor adapter '${key}' failed contract validation: ${validation.errors.join('; ')}`);
  }
  _registry.set(key, {
    vendorId: key,
    factory,
    descriptor: probe.descriptor
  });
  return probe.descriptor;
}

registerVendorAdapter('HPE', createHpeAdapter);
registerVendorAdapter('DELL', createDellAdapter);
registerVendorAdapter('HUAWEI', createHuaweiAdapter);
registerVendorAdapter('CISCO', createCiscoAdapter);
registerVendorAdapter('LENOVO', createLenovoAdapter);

function getVendorAdapter(vendorId = 'HPE') {
  const key = String(vendorId || 'HPE').trim().toUpperCase();
  const entry = _registry.get(key);
  if (!entry) return null;
  return entry.factory();
}

function listVendorAdapters() {
  return Array.from(_registry.values()).map(item => ({
    vendorId: item.vendorId,
    descriptor: item.descriptor
  }));
}

module.exports = {
  registerVendorAdapter,
  getVendorAdapter,
  listVendorAdapters
};
