import { describe, it, expect } from 'vitest';
import { identifySubProducts, detectProductFamily, getSubsystemForSku } from '../dashboard/src/services/topologyGraphBuilder.js';

describe('topologyGraphBuilder Unit Tests', () => {
  it('correctly identifies product families', () => {
    // using detectProductFamily with elements that map correctly
    expect(detectProductFamily({ chassis: 'synergy' })).toBe('Synergy');
    expect(detectProductFamily({ chassis: 'alletra' })).toBe('Alletra');
    expect(detectProductFamily({ chassis: 'storeever' })).toBe('StoreEver');
    expect(detectProductFamily({ chassis: 'cray' })).toBe('Cray');
    expect(detectProductFamily({ chassis: 'proliant' })).toBe('ProLiant');
  });

  it('correctly maps to the 6 subsystem branches', () => {
    // 1. COMPUTE
    expect(getSubsystemForSku({ category: 'Processor' })).toBe('COMPUTE');

    // 2. MEMORY
    expect(getSubsystemForSku({ category: 'Memory' })).toBe('MEMORY');

    // 3. STORAGE
    expect(getSubsystemForSku({ category: 'Drive' })).toBe('STORAGE');
    expect(getSubsystemForSku({ category: 'Storage Controllers' })).toBe('STORAGE');

    // 4. PCIE_NETWORK
    expect(getSubsystemForSku({ category: 'Networking' })).toBe('PCIE_NETWORK');

    // 5. POWER_THERMAL
    expect(getSubsystemForSku({ category: 'Power' })).toBe('POWER_THERMAL');
    expect(getSubsystemForSku({ category: 'Thermal' })).toBe('POWER_THERMAL');

    // 6. SERVICES (fallback or specific)
    expect(getSubsystemForSku({ category: 'Support Services' })).toBe('SERVICES');
    expect(getSubsystemForSku({ category: 'service' })).toBe('SERVICES');
  });

  it('correctly decomposes multi-product families in identifySubProducts', () => {
    const items = [
      { sku: 'SKU1', description: 'HPE ProLiant DL380 Gen12 CTO Server', category: 'Chassis', subCategory: 'Variants' },
      { sku: 'SKU2', description: 'HPE Synergy 480 Gen10 Compute Module', category: 'Chassis' }
    ];

    const result = identifySubProducts(items, 'Multi');
    // For Multi, it should find sub products based on chassis
    expect(result.length).toBe(2);
    expect(result[0].sku).toBe('SKU1');
    expect(result[1].sku).toBe('SKU2');
  });
});
