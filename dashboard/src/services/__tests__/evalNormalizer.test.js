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

    it('hoists requirement resolution and PCIe topology for HITL/dashboard use', () => {
      const requirementResolution = { requiresHumanClarification: true, learningEligible: false, resolutions: [{ expectedRole: 'Processor' }] };
      const slotLayout = { totalMechanicalSlots: 6, electricallyActiveSlots: 5, requiresNotebookVerification: true };
      const result = normalizeEvalResult({ data: { evalResults: { requirementResolution, evalSummary: { pcie: { slotLayout } } } } });

      expect(result.requirementResolution).toEqual(requirementResolution);
      expect(result.pcieTopology).toEqual(slotLayout);
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
      expect(result.chassis).toBe('UNKNOWN_PRODUCT');
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
        hasDcPowerSupply: true,
        hasDcLugKit: false,
        hasSupportService: false
      };

      const result = buildAspectChecksFromEval(evalData);

      expect(result[0].status).toBe('FAIL');
      expect(result[1].status).toBe('FAIL');
      expect(result[2].status).toBe('FAIL');
      expect(result[3].status).toBe('FAIL');
      expect(result[5].status).toBe('FAIL');

      expect(result[4].status).toBe('PASS');
      expect(result[4].detail).toBe('OCP Adapter: ⚠️ Optional');
      expect(result[6].status).toBe('PASS');
      expect(result[6].detail).toBe('Tech Care: ⚠️ Optional');
    });

    it('defaults correctly when values are absent (undefined)', () => {
      const evalData = {
        dummy: true
      };

      const result = buildAspectChecksFromEval(evalData);

      expect(result[0].status).toBe('UNKNOWN');
      expect(result[0].detail).toContain('High-Perf Fans: ⚠️ Unknown');
      expect(result[5].status).toBe('UNKNOWN');
      expect(result[5].detail).toBe('DC PSU: UNKNOWN | Lug Kit: N/A');
    });
  });
});

describe('canonical cancellation envelopes', () => {
  it('preserves exact terminal status, canonical evidence and reason from backend error envelope', () => {
    const reason = { code: 'USER_CANCELLED', detail: 'requested' };
    const data = { traceId: 'TRC-actual', evidenceLogPath: '/actual/evidence.json', evidenceHealth: { status: 'FAILED' } };
    const cancellation = { status: 'CANCELLED', error: 'Evaluation cancelled', reason, data };
    const result = normalizeEvalResult({ error: cancellation });
    expect(result.status).toBe('CANCELLED');
    expect(result.error).toBe('Evaluation cancelled');
    expect(result.data).toBe(data);
    expect(result.reason).toBe(reason);
    expect(result.traceId).toBe(data.traceId);
    expect(result.evidenceLogPath).toBe(data.evidenceLogPath);
    expect(result.evidenceHealth).toBe(data.evidenceHealth);
    expect(result.isMathClean).toBeNull();
    expect(result.portalValidationStatus).toBe('PENDING');
  });
  it('outer cancellation stays terminal even when inner snapshot was successful', () => {
    const result = normalizeEvalResult({ error: { status: 'CANCELLED', data: { status: 'SUCCESS', items: [{ sku: 'A', quantity: 2 }] } } });
    expect(result.status).toBe('CANCELLED'); expect(result.items[0].quantity).toBe(2);
  });
  it('ordinary error, unknown and lowercase statuses remain fatal errors', () => {
    for (const status of ['ERROR', 'UNKNOWN', 'cancelled', undefined]) {
      expect(normalizeEvalResult({ error: { status, error: 'backend failure' } })).toEqual({ status: 'ERROR', error: 'backend failure' });
    }
  });
  it('malformed cancellation data retains cancellation without inventing verification', () => {
    for (const data of [null, 'bad', [], false]) {
      const result = normalizeEvalResult({ error: { status: 'CANCELLED', data } });
      expect(result.status).toBe('CANCELLED'); expect(result.error).toBe('Evaluation cancelled');
      expect(result.isMathClean).toBeNull(); expect(result.portalValidationStatus).toBe('PENDING');
    }
  });
  it('normal data envelope remains authoritative with accompanying cancellation error', () => {
    const result = normalizeEvalResult({ data: { status: 'ACTION_REQUIRED', traceId: 'TRC-current' }, error: { status: 'CANCELLED', data: { traceId: 'TRC-old' } } });
    expect(result.status).toBe('ACTION_REQUIRED'); expect(result.traceId).toBe('TRC-current');
  });
  it('retains falsy explicit error values rather than inventing an engine failure', () => {
    for (const error of ['', false, 0]) expect(normalizeEvalResult({ error: { status: 'CANCELLED', error } }).error).toBe(error);
  });
});
