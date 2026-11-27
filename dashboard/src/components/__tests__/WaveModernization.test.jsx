import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTheme } from '../../hooks/useTheme.js';
import HardwareEnvelopeView from '../presales/HardwareEnvelopeView.jsx';
import SolutionComparisonView from '../presales/SolutionComparisonView.jsx';
import AgentConversationThread from '../presales/AgentConversationThread.jsx';
import ClarificationPromptCard from '../presales/ClarificationPromptCard.jsx';
import MultiNotebookPanel from '../rag/MultiNotebookPanel.jsx';
import Sidebar from '../layout/Sidebar.jsx';
import CommandOmnibox from '../CommandOmnibox.jsx';
import { deriveDualBrainBadges, normalizeEvalResult } from '../../services/evalNormalizer.js';
import * as api from '../../services/api.js';

vi.mock('../../services/api.js', async () => {
  const actual = await vi.importActual('../../services/api.js');
  return { ...actual, requestJson: vi.fn(), postJson: vi.fn() };
});

function ThemeHarness() {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-val">{theme}</span>
      <button type="button" onClick={toggleTheme}>Toggle</button>
    </div>
  );
}

describe('Wave B-F Modernization UI & Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it('toggles and persists Light/Dark theme via useTheme', () => {
    render(<ThemeHarness />);
    expect(screen.getByTestId('theme-val')).toHaveTextContent('light');
    expect(document.documentElement.dataset.theme).toBe('light');

    fireEvent.click(screen.getByRole('button', { name: 'Toggle' }));
    expect(screen.getByTestId('theme-val')).toHaveTextContent('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem('dashboard.theme')).toBe('dark');
  });

  it('renders all 8 HardwareEnvelopeView sections using real solver schema keys', () => {
    const envelope = {
      platformId: 'DL380_Gen12',
      formFactor: '2U',
      cpu: { minSockets: 1, maxSockets: 2, maxAirCooledTdpWatts: 350 },
      ocp: { minSlots: 0, maxSlots: 2 },
      pcie: { baseMechanicalSlots: 3, maxMechanicalSlots: 8, maxElectricallyActiveSlots: 8, maxX16Slots: 4, riserCombinations: [{}, {}] },
      gpu: { maxDoubleWideGpus: 2, maxSingleWideGpus: 6, maxRecommendedForTarget: 2, catalogReportedMaxQty: 6, requiresAuxiliaryPowerCables: true, minPsuCountForMaxGpu: 2, requiresHighLine220vAboveTdpWatts: 1000, thermalAmbientGatesCount: 1 },
      memory: { generation: 'DDR5', cpuCountConsidered: 2, channelsPerSocket: 12, minDimmsPerSocket: 1, maxDimmsPerSocket: 16, maxDimmsPerChannel: 2, maxDimmsChassis: 32, maxDimmsForCurrentCpus: 32, validBalancedTotalDimms: [16, 24, 32], maxDimmCapacityGb: 256, maxMemoryCapacityTb: 8, speedDeratingNotice: '2DPC drops MT/s' },
      storage: { minDrives: 0, maxSffDrives: 24, maxLffDrives: 12, maxEdsffDrives: 36, requiresExpanderAboveDirectPorts: true },
      power: { minPsusPerNode: 1, recommendedRedundantPsus: 2, maxPsusPerNode: 2, validPsuCounts: [1, 2], supportsDc48V: true },
      catalogRuleMetrics: { totalRules: 42, conditionalAndThermalGates: 5 },
      catalogSubcategoryBounds: { categoryKey: 'Drives', subcategories: [{ category: 'NVMe SFF', minQty: 0, maxQty: 24 }] }
    };

    render(<HardwareEnvelopeView envelope={envelope} />);
    expect(screen.getByText(/Hardware Capability Envelope/i)).toBeInTheDocument();
    expect(screen.getByText(/COMPUTED CAPABILITY ENVELOPE/i)).toBeInTheDocument();
    expect(screen.getByText(/2 risers|2 riser topologies/i)).toBeInTheDocument();
    expect(screen.getByText(/Aux GPU power cable kit required/i)).toBeInTheDocument();
    expect(screen.getByText(/2DPC drops MT\/s/i)).toBeInTheDocument();
    expect(screen.getByText(/SAS Expander required/i)).toBeInTheDocument();
    expect(screen.getByText(/NVMe SFF/i)).toBeInTheDocument();
  });

  it('renders canonical comparison rows with structured growth limits', () => {
    render(<SolutionComparisonView comparison={{
      comparedPlatforms: ['DL380_Gen12'],
      comparisonMatrix: [{
        platform: 'DL380_Gen12', capexListUsd: 5584, buildabilityStatus: 'NOT_EVALUATED',
        day2Runway: { maxDimmsChassis: 32, maxActivePcieSlots: 8 }
      }]
    }} />);
    expect(screen.getByText('DL380_Gen12')).toBeInTheDocument();
    expect(screen.getByText('$5,584')).toBeInTheDocument();
    expect(screen.getByText(/32 DIMM slots · 8 active PCIe slots/)).toBeInTheDocument();
    expect(screen.getByText('NOT_EVALUATED')).toBeInTheDocument();
  });

  it('renders SolutionComparisonView candidates, trade-offs, grounding, and parity gaps', () => {
    render(
      <SolutionComparisonView
        comparison={{
          multiNotebookGrounding: { allGrounded: true, verifiedCount: 2, totalDomains: 2 },
          tradeOffVsBaseline: '+12% CapEx for Gen12 PCIe5 bandwidth',
          day2Runway: '24->36 EDSFF expansion available',
          comparedPlatforms: [
            { platformId: 'DL380_Gen12', buildable: true, totalPriceUsd: 14500, day2Runway: 'Full 8 PCIe', tradeOffVsBaseline: 'Recommended baseline' }
          ]
        }}
        parityGaps={[
          { id: 'g1', sourceItem: 'Cisco VIC 15428', status: 'UNMAPPED', reason: 'Substitute HPE NS204i + E810-XXVDA2 OCP3' },
          { id: 'g2', sourceItem: 'Third-party SFP28 optic', status: 'NOT_EVALUATED', reason: 'Vendor portal optics lock pending' }
        ]}
      />
    );
    expect(screen.getByText(/Grounded: 2\/2 notebooks/i)).toBeInTheDocument();
    expect(screen.getByText(/\+12% CapEx/i)).toBeInTheDocument();
    expect(screen.getByText('DL380_Gen12')).toBeInTheDocument();
    expect(screen.getByText('UNMAPPED')).toBeInTheDocument();
    expect(screen.getByText('NOT_EVALUATED')).toBeInTheDocument();
  });

  it('sends the local-only preference on a multi-notebook request', async () => {
    api.postJson.mockResolvedValueOnce({ verifiedCount: 0, totalDomains: 2, results: [] });
    render(<MultiNotebookPanel localOnly />);
    fireEvent.click(screen.getByRole('button', { name: 'Fan-Out Query' }));
    await waitFor(() => expect(api.postJson).toHaveBeenCalledWith(
      '/api/multi-notebook-query', expect.objectContaining({ offline: true }), expect.any(Object)
    ));
  });

  it('renders Sidebar tabs with single unique [data-tab] markers and switches views', () => {
    const onTabChange = vi.fn();
    render(<Sidebar activeTab="catalog" onTabChange={onTabChange} mobileOpen={false} badges={{ portfolio: 17 }} />);
    const catalogBtns = document.querySelectorAll('[data-tab="catalog"]');
    expect(catalogBtns.length).toBe(1);
    expect(catalogBtns[0]).toHaveAttribute('aria-current', 'page');
    fireEvent.click(document.querySelector('[data-tab="portfolio"]'));
    expect(onTabChange).toHaveBeenCalledWith('portfolio');
  });

  it('dispatches global search and Enter presales query from CommandOmnibox', async () => {
    api.requestJson.mockResolvedValue({
      status: 'SUCCESS',
      results: {
        actions: [],
        platforms: [{ productId: 'DL380_Gen12', domain: 'server' }],
        skus: [{ sku: 'P73282-B21', description: 'DL380 Gen12 CTO', platformId: 'DL380_Gen12', listPriceUsd: 4200 }]
      }
    });
    const onRunPresalesQuery = vi.fn();
    render(<CommandOmnibox onRunPresalesQuery={onRunPresalesQuery} />);
    const input = screen.getByLabelText('Search catalog SKUs or ask NotebookLM');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'DL380 Gen12' } });
    await waitFor(() => expect(screen.getByText('P73282-B21')).toBeInTheDocument());
    fireEvent.submit(input.closest('form'));
    expect(onRunPresalesQuery).toHaveBeenCalledWith('DL380 Gen12');
  });

  it('emits closure and portal validation badges in evalNormalizer', () => {
    const verified = deriveDualBrainBadges({ isMathClean: true, closureVerified: true, portalValidationStatus: 'PENDING' });
    expect(verified.map(b => b.id)).toContain('CLOSURE_VERIFIED');
    expect(verified.map(b => b.id)).toContain('PORTAL_VALIDATION_PENDING');

    const normalized = normalizeEvalResult({
      data: {
        closureVerified: false,
        planDigest: 'sha256-abc123',
        guardrailMeta: { promptVersion: 'v4' },
        items: []
      }
    });
    expect(normalized.closureVerified).toBe(false);
    expect(normalized.closurePlanDigest).toBe('sha256-abc123');
    expect(normalized.guardrailMeta.promptVersion).toBe('v4');
    expect(normalized.dualBrainBadges.map(b => b.id)).toContain('CLOSURE_BLOCKED');
  });

  it('renders BUILDABLE · PORTAL PENDING distinctly and handles multi-turn clarification cards', () => {
    render(
      <div>
        <SolutionComparisonView comparison={{
          comparisonMatrix: [
            {
              platform: 'DL380_Gen12',
              buildable: true,
              buildabilityStatus: 'PORTAL_VALIDATION_PENDING',
              capexListUsd: 131685
            },
            {
              platform: 'DL360_Gen12',
              isBuildable: true,
              buildabilityStatus: 'BUILDABLE',
              portalValidationStatus: 'PORTAL_VALIDATION_PENDING',
              capexListUsd: 131115
            }
          ]
        }} />
        <AgentConversationThread turns={[
          { id: 't1', query: 'Turn 1', modeUsed: 'DETERMINISTIC' },
          { id: 't2', query: 'Turn 2', modeUsed: 'GEMINI_AGENT', summary: 'Checked OCP rules.' }
        ]} />
      </div>
    );
    expect(screen.getAllByText('BUILDABLE · PORTAL PENDING')).toHaveLength(2);
    expect(screen.getByText('Autonomous Execution Summary (2)')).toBeInTheDocument();

    const onRespond = vi.fn();
    render(
      <ClarificationPromptCard
        prompt={{ question: 'Confirm target platform:', options: ['DL380 Gen12', 'DL360 Gen12'] }}
        onRespond={onRespond}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'DL380 Gen12' }));
    expect(onRespond).toHaveBeenCalledWith('DL380 Gen12');
  });
});
