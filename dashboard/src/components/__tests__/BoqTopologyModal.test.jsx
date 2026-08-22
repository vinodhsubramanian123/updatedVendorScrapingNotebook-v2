import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BoqTopologyModal from '../topology/BoqTopologyModal';
import { buildTopologyGraph } from '../../services/topologyGraphBuilder';

const mockEvalResults = {
  chassis: 'P73282-B21',
  cpuCount: 2,
  maxCpuTdpWatts: 350,
  memoryCount: 12,
  totalMemoryGb: 768,
  isBalancedChannel: false,
  hasHighPerfFans: false,
  hasSmartBattery: false,
  hasStorageController: true,
  hasDcPowerSupply: true,
  hasDcLugKit: false,
  totalPcieSlotsAvailable: 8,
  items: [
    { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', category: 'Base Chassis', quantity: 1, unitPriceUsd: 2500 },
    { sku: 'P67000-B21', description: 'Intel Xeon Platinum 8592+ 64-Core Processor', category: 'Processors', quantity: 2, unitPriceUsd: 11000 },
    { sku: 'P69728-F21', description: 'HPE 64GB DDR5 Smart Memory Kit', category: 'Memory', quantity: 12, unitPriceUsd: 1200 },
    { sku: 'MR416i-p', description: 'HPE Smart Array MR416i-p Gen11 Controller', category: 'Storage Controllers', quantity: 1, unitPriceUsd: 900 }
  ],
  rankedSolutions: [
    {
      rank: 1,
      title: 'Intent Preserved',
      capex: '$45,000',
      items: [
        { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', category: 'Base Chassis', quantity: 1 },
        { sku: 'P67000-B21', description: 'Intel Xeon Platinum 8592+ 64-Core Processor', category: 'Processors', quantity: 2 },
        { sku: 'P69728-F21', description: 'HPE 64GB DDR5 Smart Memory Kit', category: 'Memory', quantity: 16, isFixInjected: true }
      ]
    }
  ],
  conflictGraph: {
    chassisInfo: {
      chassisSku: 'P73282-B21',
      formFactor: '8SFF',
      maxSockets: 2,
      maxDimms: 32
    }
  }
};

describe('topologyGraphBuilder', () => {
  it('builds topology graph with root, hubs, items, and gaps for baseline', () => {
    const graph = buildTopologyGraph(mockEvalResults, 'BASELINE');
    
    expect(graph.rootNode).toBeDefined();
    expect(graph.rootNode.sku).toBe('P73282-B21');
    expect(graph.stats.totalNodes).toBeGreaterThan(5);
    expect(graph.stats.gapCount).toBeGreaterThan(0);
    expect(graph.gaps.some(g => g.id.includes('thermal-fans'))).toBe(true);
    expect(graph.gaps.some(g => g.id.includes('storage-battery'))).toBe(true);
  });

  it('builds resolved topology graph for Rank 1', () => {
    const graph = buildTopologyGraph(mockEvalResults, 1);
    
    expect(graph.stats.gapCount).toBe(0);
    expect(graph.stats.fixCount).toBeGreaterThan(0);
    expect(graph.diagnostics.productFamily).toBe('ProLiant');
    expect(graph.diagnostics.completenessScore).toBe(100);
  });

  it('detects and structures Synergy composable infrastructure with sub-products', () => {
    const synergyEval = {
      chassis: 'SY100Gb_F32_Module',
      items: [
        { sku: 'SY100Gb_F32', description: 'HPE Synergy Virtual Connect 100Gb F32 Module', category: 'Interconnect' },
        { sku: '817040-B21', description: 'HPE Synergy 480 Gen10 Compute Module', category: 'Base Chassis' }
      ]
    };
    const graph = buildTopologyGraph(synergyEval, 'BASELINE');
    expect(graph.diagnostics.productFamily).toBe('Synergy');
    expect(graph.subProducts.length).toBeGreaterThan(0);
  });

  it('detects and structures Alletra storage product family', () => {
    const alletraEval = {
      chassis: 'Alletra_Storage_System',
      items: [
        { sku: 'R0Q21A', description: 'HPE Alletra 9000 4-way Storage Array Base Enclosure', category: 'Storage Enclosure' }
      ]
    };
    const graph = buildTopologyGraph(alletraEval, 'BASELINE');
    expect(graph.diagnostics.productFamily).toBe('Alletra');
  });
});

describe('BoqTopologyModal', () => {
  it('renders modal with rank switcher, stats badges, and canvas', () => {
    render(
      <BoqTopologyModal
        isOpen={true}
        onClose={vi.fn()}
        evalResults={mockEvalResults}
        onOpenRag={vi.fn()}
        onOpenMatrix={vi.fn()}
      />
    );

    expect(screen.getByText(/Customer Baseline \(with Gaps\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Rank 1 Resolved/i)).toBeInTheDocument();
    expect(screen.getByText(/All Subsystems/i)).toBeInTheDocument();
    expect(screen.getByText(/Compute & Sockets/i)).toBeInTheDocument();
  });

  it('switches between baseline and rank 1 view', () => {
    render(
      <BoqTopologyModal
        isOpen={true}
        onClose={vi.fn()}
        evalResults={mockEvalResults}
        onOpenRag={vi.fn()}
        onOpenMatrix={vi.fn()}
        onOpenAmbiguity={vi.fn()}
      />
    );

    const rank1Btn = screen.getByText(/Rank 1 Resolved/i);
    fireEvent.click(rank1Btn);

    expect(screen.getByText(/1 Fixes/i)).toBeInTheDocument();
  });

  it('detects unclassified ambiguous SKUs and displays HITL review alert banner', () => {
    const ambiguousEval = {
      ...mockEvalResults,
      unclassifiedSkus: ['CUSTOM-UNLISTED-SKU'],
      items: [
        ...mockEvalResults.items,
        { sku: 'CUSTOM-UNLISTED-SKU', description: 'Unlisted Special Custom Option Card', category: 'Unknown', isAmbiguous: true }
      ]
    };

    const graph = buildTopologyGraph(ambiguousEval, 'BASELINE');
    expect(graph.stats.ambiguityCount).toBeGreaterThan(0);
    expect(graph.ambiguities.length).toBeGreaterThan(0);

    const onOpenAmbiguityMock = vi.fn();
    render(
      <BoqTopologyModal
        isOpen={true}
        onClose={vi.fn()}
        evalResults={ambiguousEval}
        onOpenRag={vi.fn()}
        onOpenMatrix={vi.fn()}
        onOpenAmbiguity={onOpenAmbiguityMock}
      />
    );

    expect(screen.getByText(/require Human-in-the-Loop clarification/i)).toBeInTheDocument();
    const ambiguityInboxBtn = screen.getByText(/Open Ambiguity Inbox/i);
    fireEvent.click(ambiguityInboxBtn);
    expect(onOpenAmbiguityMock).toHaveBeenCalled();
  });
});
