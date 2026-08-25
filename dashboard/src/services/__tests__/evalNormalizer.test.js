import { describe, it, expect } from 'vitest';
import { normalizeEvalResult, buildAspectChecksFromEval } from '../evalNormalizer.js';

describe('evalNormalizer', () => {
  describe('normalizeEvalResult', () => {
    it('handles error payloads', () => {
      const payload = {
        error: {
          error: 'Something went wrong'
        }
      };

      const result = normalizeEvalResult(payload);

      expect(result).toEqual({
        status: 'ERROR',
        error: 'Something went wrong'
      });
    });

    it('handles error payload without nested error string', () => {
      const payload = {
        error: {}
      };

      const result = normalizeEvalResult(payload);

      expect(result).toEqual({
        status: 'ERROR',
        error: 'Evaluation failed'
      });
    });

    it('handles basic payload with no nested inner evalResults', () => {
      const payload = {
        data: {
          items: [{ id: 1, name: 'Test' }],
          chassisPrefix: 'TestChassis',
          targetBudgetUsd: 1000,
          errors: ['error 1'],
          warnings: ['warning 1'],
          cpuCount: 2
        }
      };

      const result = normalizeEvalResult(payload);

      expect(result.items).toEqual([{ id: 1, name: 'Test' }]);
      expect(result.bomItems).toEqual([{ id: 1, name: 'Test' }]);
      expect(result.unclassifiedSkus).toEqual([]);
      expect(result.chassis).toBe('TestChassis');
      expect(result.targetBudgetUsd).toBe(1000);
      expect(result.errors).toEqual(['error 1']);
      expect(result.warnings).toEqual(['warning 1']);
      expect(result.cpuCount).toBe(2);
      expect(result.aspectChecks).toBeDefined();
    });

    it('hoists properties from data.evalResults', () => {
      const payload = {
        data: {
          evalResults: {
            items: [{ id: 2, name: 'InnerTest' }],
            chassis: 'InnerChassis',
            targetBudgetUsd: 2000,
            cpuCount: 4,
            hasHighPerfFans: true
          }
        }
      };

      const result = normalizeEvalResult(payload);

      expect(result.items).toEqual([{ id: 2, name: 'InnerTest' }]);
      expect(result.bomItems).toEqual([{ id: 2, name: 'InnerTest' }]);
      expect(result.chassis).toBe('InnerChassis');
      expect(result.targetBudgetUsd).toBe(2000);
      expect(result.cpuCount).toBe(4);
      expect(result.hasHighPerfFans).toBe(true);
    });

    it('favors data over data.evalResults for properties like items, chassis', () => {
      const payload = {
        data: {
          items: [{ id: 'outer' }],
          chassisPrefix: 'OuterChassis',
          evalResults: {
            items: [{ id: 'inner' }],
            chassis: 'InnerChassis'
          }
        }
      };

      const result = normalizeEvalResult(payload);

      expect(result.items).toEqual([{ id: 'outer' }]);
      expect(result.chassis).toBe('OuterChassis');
    });

    it('favors evalResults over data for properties like errors, warnings', () => {
      const payload = {
        data: {
          errors: ['outer error'],
          cpuCount: 2,
          evalResults: {
            errors: ['inner error'],
            cpuCount: 4
          }
        }
      };

      const result = normalizeEvalResult(payload);

      expect(result.errors).toEqual(['inner error']);
      expect(result.cpuCount).toBe(4);
    });

    it('handles empty payload gracefully with fallback values', () => {
      const payload = {};
      const result = normalizeEvalResult(payload);

      expect(result.items).toEqual([]);
      expect(result.bomItems).toEqual([]);
      expect(result.unclassifiedSkus).toEqual([]);
      expect(result.chassis).toBe('DL380_Gen12_SFF');
      expect(result.targetBudgetUsd).toBe(0);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.missingDependencies).toEqual([]);
      expect(result.aspectChecks).toEqual([]);
      expect(result.ragAnswer).toBeNull();
      expect(result.ragData).toBeNull();
    });

    it('handles deeply nested fallback for rankedSolutions', () => {
      const payload = {
        data: {
          conflictGraph: {
            rankedSolutions: [{ id: 1 }]
          }
        }
      };

      const result = normalizeEvalResult(payload);

      expect(result.rankedSolutions).toEqual([{ id: 1 }]);
    });
  });

  describe('buildAspectChecksFromEval', () => {
    it('returns empty array if evalData is undefined or empty', () => {
      expect(buildAspectChecksFromEval()).toEqual([]);
      expect(buildAspectChecksFromEval({})).toEqual([]);
      expect(buildAspectChecksFromEval(null)).toEqual([]);
    });

    it('correctly maps successful aspect checks based on data', () => {
      const evalData = {
        cpuCount: 2,
        maxCpuTdpWatts: 250,
        hasHighPerfFans: true,
        isBalancedChannel: true,
        memoryCount: 16,
        totalMemoryGb: 512,
        hasSmartBattery: true,
        driveCount: 8,
        requiredPcieCards: 2,
        totalPcieSlotsAvailable: 8,
        hasOcpAdapter: true,
        hasDcPowerSupply: true,
        hasDcLugKit: true,
        hasSupportService: true
      };

      const result = buildAspectChecksFromEval(evalData);

      expect(result).toHaveLength(7);
      expect(result[0]).toEqual({
        id: 1, name: 'Compute & Thermal', status: 'PASS',
        detail: '2 CPUs (Max TDP: 250W) | High-Perf Fans: ✅'
      });
      expect(result[1]).toEqual({
        id: 2, name: 'Memory & Channels', status: 'PASS',
        detail: '16 DIMMs (512 GB Total)'
      });
      expect(result[2]).toEqual({
        id: 3, name: 'Storage & Tri-Mode', status: 'PASS',
        detail: '8 Drives | Battery: ✅'
      });
      expect(result[3]).toEqual({
        id: 4, name: 'PCIe Expansion', status: 'PASS',
        detail: '2 Cards / 8 Slots'
      });
      expect(result[4]).toEqual({
        id: 5, name: 'Networking & OCP', status: 'PASS',
        detail: 'OCP Adapter: ✅'
      });
      expect(result[5]).toEqual({
        id: 6, name: 'Power & Ambient', status: 'PASS',
        detail: 'DC PSU: YES | Lug Kit: ✅'
      });
      expect(result[6]).toEqual({
        id: 7, name: 'Support Services', status: 'PASS',
        detail: 'Tech Care: ✅'
      });
    });

    it('correctly maps failing aspect checks for missing requirements', () => {
      const evalData = {
        hasHighPerfFans: false,
        isBalancedChannel: false,
        hasSmartBattery: false,
        requiredPcieCards: 10,
        totalPcieSlotsAvailable: 8,
        hasOcpAdapter: false,
        hasDcPowerSupply: true, // Needs lug kit
        hasDcLugKit: false,
        hasSupportService: false
      };

      const result = buildAspectChecksFromEval(evalData);

      expect(result[0].status).toBe('FAIL');
      expect(result[1].status).toBe('FAIL');
      expect(result[2].status).toBe('FAIL');
      expect(result[3].status).toBe('FAIL');
      expect(result[5].status).toBe('FAIL'); // Power & Ambient fails due to missing lug kit for DC PSU

      // Some are always PASS but change details
      expect(result[4].status).toBe('PASS');
      expect(result[4].detail).toBe('OCP Adapter: ⚠️ Optional');
      expect(result[6].status).toBe('PASS');
      expect(result[6].detail).toBe('Tech Care: ⚠️ Optional');
    });

    it('defaults correctly when values are absent (undefined)', () => {
      const evalData = {
        dummy: true // To pass the empty check
      };

      const result = buildAspectChecksFromEval(evalData);

      // When boolean flags are missing entirely, they evaluate as !== false which is PASS,
      // though depending on the domain logic, they may show as false/no in details.
      expect(result[0].status).toBe('PASS');
      expect(result[0].detail).toContain('High-Perf Fans: ❌'); // boolean cast

      expect(result[5].status).toBe('PASS');
      expect(result[5].detail).toBe('DC PSU: NO | Lug Kit: ❌'); // No DC PSU = PASSes without lug kit
    });
  });
});
