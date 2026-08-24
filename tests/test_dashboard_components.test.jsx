import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import BoqTopologyCanvas from '../dashboard/src/components/topology/BoqTopologyCanvas';
import RankCard from '../dashboard/src/components/matrix/RankCard';
import ResolutionMatrix from '../dashboard/src/components/ResolutionMatrix';
import BoqInputZone from '../dashboard/src/components/uploader/BoqInputZone';
import PreflightPipelineAudit from '../dashboard/src/components/uploader/PreflightPipelineAudit';

describe('Dashboard React Components Unit Tests', () => {
  let consoleErrorSpy;
  let originalError = console.error;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation((...args) => {
      // ignore specific react act warnings if any, but test zero console errors for others
      if (typeof args[0] === 'string' && args[0].includes('Warning: ReactDOM.render is no longer supported')) {
        return;
      }
      originalError(...args);
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('BoqTopologyCanvas (VisualBoqTopology)', () => {
    it('renders without console errors and computes SVG coordinates correctly', async () => {
      const mockGraphData = {
        rootNode: { id: 'node-chassis-root', type: 'CHASSIS_ROOT', label: 'ProLiant Root', sku: 'SKU123' },
        nodes: [
          { id: 'node-sub-COMPUTE', type: 'SUBSYSTEM_HUB', subsystem: 'COMPUTE', label: 'COMPUTE HUB' },
          { id: 'node1', type: 'COMPONENT', subsystem: 'COMPUTE', label: 'CPU1' }
        ],
        edges: []
      };

      await act(async () => {
        render(<BoqTopologyCanvas graphData={mockGraphData} />);
      });

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      const svgElements = document.querySelectorAll('svg');
      expect(svgElements.length).toBeGreaterThan(0);
      expect(screen.getByText('SKU123')).toBeInTheDocument();
      // CPU1 should be rendered
      // We check that the coordinates are calculated via SVG DOM presence
      const circleElements = document.querySelectorAll('circle[r="60"]'); // This is the root circle
      expect(circleElements.length).toBeGreaterThan(0);

      const componentCircles = document.querySelectorAll('circle[r="40"]'); // HUB circle
      expect(componentCircles.length).toBeGreaterThan(0);

      // And edges should be rendered for root-to-hub and hub-to-children
      const paths = document.querySelectorAll('path.topology-animated-link, path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('verifies hook order invariants by re-rendering with new props', async () => {
       const mockGraphData1 = { rootNode: { id: 'root1', type: 'CHASSIS_ROOT', label: 'R1' }, nodes: [], edges: [] };
       const mockGraphData2 = { rootNode: { id: 'root2', type: 'CHASSIS_ROOT', label: 'R2' }, nodes: [], edges: [] };

       let rerenderFunc;
       await act(async () => {
         const { rerender } = render(<BoqTopologyCanvas graphData={mockGraphData1} />);
         rerenderFunc = rerender;
       });
       expect(consoleErrorSpy).not.toHaveBeenCalled();

       await act(async () => {
         rerenderFunc(<BoqTopologyCanvas graphData={mockGraphData2} />);
       });
       expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('RankCard', () => {
    it('renders correctness and zero console errors', async () => {
      const mockTier = {
        rank: 1,
        isOptimal: true,
        badgeClass: 'badge-emerald',
        name: 'Tier 1',
        totalPrice: 1000,
        attributes: { compute: 'High', memory: 'High' },
        gaps: [],
        items: [],
        swaps: []
      };

      await act(async () => {
        render(<RankCard tier={mockTier} isExpanded={false} />);
      });

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(screen.getByText('Rank 1 Solution')).toBeInTheDocument();
      expect(screen.getByText('Optimal Workload Match')).toBeInTheDocument();
    });
  });

  describe('ResolutionMatrix', () => {
    it('renders correctness and zero console errors', async () => {
      const mockEvalResults = {
        matrix: {
          baseline: {
            rank: 'BASELINE',
            totalPrice: 100,
            attributes: {},
            gaps: [],
            items: [],
            swaps: []
          }
        },
        conflictGraph: {
          chassisInfo: {
            sku: 'SKU-CHASSIS',
            name: 'Base Chassis',
            productFamily: 'ProLiant'
          },
          subProducts: []
        }
      };

      await act(async () => {
        render(<ResolutionMatrix evalResults={mockEvalResults} />);
      });

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(screen.getByText(/Side-by-Side Matrix/i)).toBeInTheDocument();
    });
  });

  describe('BoqInputZone', () => {
    it('renders correctness and zero console errors', async () => {
      await act(async () => {
        render(<BoqInputZone rawText="" />);
      });

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('verifies hook order invariants by re-rendering with new props', async () => {
       let rerenderFunc;
       await act(async () => {
         const { rerender } = render(<BoqInputZone rawText="" />);
         rerenderFunc = rerender;
       });
       expect(consoleErrorSpy).not.toHaveBeenCalled();

       await act(async () => {
         rerenderFunc(<BoqInputZone rawText="updated" />);
       });
       expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('PreflightPipelineAudit', () => {
    it('renders correctness and zero console errors for preflight audit', async () => {
      const mockPreflightData = {
        configVariations: [
          { name: 'Config 1' },
          { name: 'Config 2' }
        ],
        masterSkuTally: 10
      };

      await act(async () => {
        render(<PreflightPipelineAudit preflightData={mockPreflightData} />);
      });

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(screen.getByText('Pre-flight Intake Audit')).toBeInTheDocument();
      expect(screen.getByText('2 Configuration Variations Detected')).toBeInTheDocument();
    });
  });
});
