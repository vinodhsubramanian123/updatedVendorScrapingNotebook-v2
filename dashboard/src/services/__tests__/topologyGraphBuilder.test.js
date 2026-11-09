import { describe, it, expect } from 'vitest';
import {
  detectProductFamily,
  getSubsystemForSku,
  buildTopologyGraph,
  SUBSYSTEM_DEFS
} from '../topologyGraphBuilder.js';

describe('topologyGraphBuilder', () => {
  describe('SUBSYSTEM_DEFS', () => {
    it('defines exactly 6 canonical subsystems', () => {
      expect(SUBSYSTEM_DEFS).toHaveLength(6);
      const ids = SUBSYSTEM_DEFS.map(s => s.id);
      expect(ids).toEqual(['COMPUTE', 'MEMORY', 'STORAGE', 'PCIE_NETWORK', 'POWER_THERMAL', 'SERVICES']);
    });
  });

  describe('detectProductFamily', () => {
    it('detects ProLiant by default for DL380 / DL360', () => {
      expect(detectProductFamily({ chassis: 'DL380 Gen12' }, [])).toBe('ProLiant');
      expect(detectProductFamily({ chassis: 'DL360 Gen11' }, [{ sku: 'P50309-B21', description: 'Intel Xeon Gold 6430' }])).toBe('ProLiant');
    });

    it('detects Synergy for composable frames and modules', () => {
      expect(detectProductFamily({ chassis: 'Synergy 12000 Frame' }, [])).toBe('Synergy');
      expect(detectProductFamily({}, [{ sku: '874532-B21', description: 'HPE Synergy 480 Gen11 Compute Module' }])).toBe('Synergy');
      expect(detectProductFamily({}, [{ sku: '874533-B21', description: 'HPE Virtual Connect SE 100Gb F32 Module' }])).toBe('Synergy');
    });

    it('detects Alletra for storage systems', () => {
      expect(detectProductFamily({ chassis: 'Alletra Storage System' }, [])).toBe('Alletra');
      expect(detectProductFamily({}, [{ sku: 'R4Z28A', description: 'HPE Alletra 9000 4-way Storage Base' }])).toBe('Alletra');
      expect(detectProductFamily({}, [{ sku: 'Q8B27B', description: 'HPE Nimble Storage HF20 Adaptive Dual Controller' }])).toBe('Alletra');
    });

    it('detects StoreEver for tape libraries', () => {
      expect(detectProductFamily({ chassis: 'StoreEver MSL3040 Tape Library' }, [])).toBe('StoreEver');
      expect(detectProductFamily({}, [{ sku: 'Q6Q68B', description: 'HPE StoreEver MSL3040 Scalable Base Module' }])).toBe('StoreEver');
    });

    it('detects Cray for supercomputing platforms', () => {
      expect(detectProductFamily({ chassis: 'Cray GX5000' }, [])).toBe('Cray');
      expect(detectProductFamily({}, [{ sku: 'R0X43A', description: 'HPE Slingshot 200Gb Fabric Adapter' }])).toBe('Cray');
    });
  });

  describe('getSubsystemForSku', () => {
    it('classifies processors and heatsinks under COMPUTE', () => {
      expect(getSubsystemForSku({ description: 'Intel Xeon Platinum 8480+ Processor' })).toBe('COMPUTE');
      expect(getSubsystemForSku({ description: 'HPE DL380 Gen11 2U High Performance Heatsink' })).toBe('COMPUTE');
    });

    it('classifies memory and DIMMs under MEMORY', () => {
      expect(getSubsystemForSku({ description: 'HPE 64GB (1x64GB) Dual Rank x4 DDR5-4800 Registered Smart Memory' })).toBe('MEMORY');
      expect(getSubsystemForSku({ description: 'HPE 32GB 2Rx8 PC4-3200AA-R Smart Kit' })).toBe('MEMORY');
    });

    it('classifies drives, NVMe, controllers, cages under STORAGE', () => {
      expect(getSubsystemForSku({ description: 'HPE 1.92TB NVMe Gen4 High Performance Read Intensive SFF SSD' })).toBe('STORAGE');
      expect(getSubsystemForSku({ description: 'HPE MR416i-p Gen11 SPDM Storage Controller' })).toBe('STORAGE');
      expect(getSubsystemForSku({ description: 'HPE DL380 Gen11 8SFF x1 Tri-Mode Drive Cage Kit' })).toBe('STORAGE');
      expect(getSubsystemForSku({ description: 'HPE StoreEver LTO-9 Ultrium SAS Internal Drive' })).toBe('STORAGE');
    });

    it('classifies network adapters, risers, GPUs under PCIE_NETWORK', () => {
      expect(getSubsystemForSku({ description: 'Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter' })).toBe('PCIE_NETWORK');
      expect(getSubsystemForSku({ description: 'HPE DL380 Gen11 2U Primary Riser Cage Kit' })).toBe('PCIE_NETWORK');
      expect(getSubsystemForSku({ description: 'NVIDIA L40S 48GB PCIe Accelerator' })).toBe('PCIE_NETWORK');
      expect(getSubsystemForSku({ description: 'HPE BladeSystem c-Class 10Gb SFP+ SR Transceiver' })).toBe('PCIE_NETWORK');
    });

    it('classifies PSUs, power cables, fans under POWER_THERMAL', () => {
      expect(getSubsystemForSku({ description: 'HPE 1600W Flex Slot Platinum Hot Plug Low Halogen Power Supply' })).toBe('POWER_THERMAL');
      expect(getSubsystemForSku({ description: 'HPE DL380 Gen11 High Performance Fan Kit' })).toBe('POWER_THERMAL');
      expect(getSubsystemForSku({ description: 'HPE -48VDC Power Supply Lug Kit' })).toBe('POWER_THERMAL');
    });

    it('classifies support services under SERVICES', () => {
      expect(getSubsystemForSku({ description: 'HPE 3 Year Tech Care Basic DL380 Gen11 Service' })).toBe('SERVICES');
      expect(getSubsystemForSku({ description: 'HPE Pointnext Installation and Startup Service' })).toBe('SERVICES');
    });
  });

  describe('buildTopologyGraph', () => {
    const mockEvalResults = {
      chassis: 'DL380 Gen12',
      items: [
        { sku: 'P50309-B21', description: 'Intel Xeon Gold 6430 Processor', quantity: 2, category: 'Processors' },
        { sku: 'P43328-B21', description: 'HPE 64GB DDR5-4800 RDIMM', quantity: 16, category: 'Memory' },
        { sku: 'P40506-B21', description: 'HPE 960GB NVMe RI SSD', quantity: 8, category: 'Storage' },
        { sku: 'P10113-B21', description: 'Broadcom 10/25Gb 2p SFP28 OCP Adapter', quantity: 1, category: 'Networking' },
        { sku: 'P38995-B21', description: 'HPE 1000W Flex Slot Titanium Hot Plug PSU', quantity: 2, category: 'Power' },
        { sku: 'HU4B2A3', description: 'HPE 3Y Tech Care Basic Service', quantity: 1, category: 'Support Services' }
      ],
      rankedSolutions: [
        {
          tier: 'Rank 1',
          name: 'Rank 1: Preserved Intent (Build Certified)',
          items: [
            { sku: 'P50309-B21', description: 'Intel Xeon Gold 6430 Processor', quantity: 2, category: 'Processors' },
            { sku: 'P43328-B21', description: 'HPE 64GB DDR5-4800 RDIMM', quantity: 16, category: 'Memory' }
          ]
        }
      ]
    };

    it('constructs hierarchical mindmap with root, subsystems, and item nodes', () => {
      const graph = buildTopologyGraph(mockEvalResults, 'Rank 1');

      expect(graph).toBeDefined();
      expect(graph.nodes).toBeInstanceOf(Array);
      expect(graph.edges).toBeInstanceOf(Array);

      // Root node check
      expect(graph.rootNode).toBeDefined();
      expect(graph.rootNode.label).toContain('DL380 Gen12');

      // Subsystem nodes check
      const subsystemNodes = graph.nodes.filter(n => n.type === 'SUBSYSTEM_HUB');
      expect(subsystemNodes.length).toBe(6);

      // Edges check
      expect(graph.edges.length).toBeGreaterThan(0);
      graph.edges.forEach(edge => {
        expect(edge.source).toBeDefined();
        expect(edge.target).toBeDefined();
      });

      // Stats check
      expect(graph.stats).toBeDefined();
      expect(graph.stats.totalNodes).toBeGreaterThan(0);
    });

    it('handles empty or missing evalResults gracefully without crashing', () => {
      const emptyGraph = buildTopologyGraph(null);
      expect(emptyGraph).toBeDefined();
      expect(emptyGraph.nodes).toEqual([]);
      expect(emptyGraph.edges).toEqual([]);
      expect(emptyGraph.stats.totalNodes).toBe(0);
    });
  });
});
