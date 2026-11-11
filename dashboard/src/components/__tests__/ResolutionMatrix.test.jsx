import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ResolutionMatrix from '../ResolutionMatrix';

describe('ResolutionMatrix', () => {
  const mockEvalResults = {
    conflictGraph: {
      rankedSolutions: [
        {
          rank: 1,
          name: 'Intent-Preserving',
          workloadDnaMatch: 'HPC/AI Match',
          score: 0.95,
          estimatedCostUsd: 15000,
          tradeoffMetrics: { intentAlignment: '95%' },
          reasoning: 'Best performance for AI workloads.',
          skuPartsList: [
            { sku: 'P49057-B21', quantity: 1, category: 'Processor', unitPriceUsd: 3000, description: 'Intel Xeon 8580' }
          ]
        },
        {
          rank: 5,
          name: 'Budget Minimized',
          workloadDnaMatch: 'Cost Optimized',
          score: 0.70,
          estimatedCostUsd: 10000,
          tradeoffMetrics: { intentAlignment: '70%' },
          reasoning: 'Cheapest available.',
          skuPartsList: [
            { sku: 'P52560-B21', quantity: 1, category: 'Processor', unitPriceUsd: 2000, description: 'Intel Xeon 6430' }
          ]
        }
      ],
      resolvedFixes: []
    },
    chassis: 'DL380_Gen12_SFF',
    confidence: { score: 0.92, deductions: [], isHitlTriggered: false }
  };

  it('renders tiers correctly', () => {
    render(<ResolutionMatrix evalResults={mockEvalResults} selectedChassis="DL380_Gen12_SFF" />);
    
    // Should see Rank 1 and Rank 5 titles
    expect(screen.getByText('Intent-Preserving')).toBeInTheDocument();
    expect(screen.getByText('Budget Minimized')).toBeInTheDocument();
    
    // Check pricing formatting
    expect(screen.getByText('$15,000')).toBeInTheDocument();
    expect(screen.getByText('$10,000')).toBeInTheDocument();
  });

  it('allows expanding SKU parts list for a tier', () => {
    render(<ResolutionMatrix evalResults={mockEvalResults} selectedChassis="DL380_Gen12_SFF" />);
    
    // Initially, parts are not expanded
    expect(screen.queryByText('P49057-B21')).not.toBeInTheDocument();
    
    // Find Expand buttons
    const expandButtons = screen.getAllByText('Expand');
    fireEvent.click(expandButtons[0]);
    
    // Now parts should be visible
    expect(screen.getByText('P49057-B21')).toBeInTheDocument();
  });

  it('fails closed with no synthesized candidates if evalResults is null', () => {
    render(<ResolutionMatrix evalResults={null} selectedChassis="DL380_Gen12_SFF" />);
    expect(screen.getByText(/Multi-Tier Strategic Resolution Matrix/i)).toBeInTheDocument();
    expect(screen.getByText(/No candidate passed the buildability/i)).toBeInTheDocument();
  });

  it('blocks customer export with explicit reason when authorization is absent or blocked, and enables export when authorized', () => {
    const blockedEval = {
      ...mockEvalResults,
      runId: 'run_blocked_ui',
      customerDisposition: 'VALIDATION_REQUIRED',
      portalValidationStatus: 'PORTAL_VALIDATION_PENDING',
      acceptanceGate: { isValid: false, blockersCount: 1, blockers: [{ id: 'B13', detail: 'Grounding unverified in OFFLINE_MODE' }] }
    };
    const { rerender } = render(<ResolutionMatrix evalResults={blockedEval} selectedChassis="DL380_Gen12_SFF" />);
    const exportBtnsBlocked = screen.getAllByRole('button', { name: /Export XLSX/i });
    expect(exportBtnsBlocked[0]).toBeDisabled();
    expect(screen.getByTestId('delivery-auth-banner')).toHaveTextContent(/EXPORT_BLOCKED/i);
    expect(screen.getByTestId('rank-1-export-blocked')).toHaveTextContent(/Grounding unverified/i);
    expect(screen.getByText(/Vendor acceptance:/i)).toBeInTheDocument();
    expect(screen.getByText(/Delivery Authorization:/i)).toBeInTheDocument();

    const authorizedEval = {
      ...mockEvalResults,
      runId: 'run_auth_ui',
      parentRunId: 'query_parent_1234',
      serverCount: 4,
      clusterSizing: {
        totalServers: 4,
        totalRackUnits: 8,
        standard42uRacksRequired: 1,
        totalFacilityPowerKw: 6.4,
        needsHighLine220v: true,
        railKitCoverage: { isCompliant: true }
      },
      conflictGraph: {
        ...mockEvalResults.conflictGraph,
        rankedSolutions: [
          {
            ...mockEvalResults.conflictGraph.rankedSolutions[0],
            skuPartsList: [
              { sku: 'P49057-B21', quantity: 2, configurationMultiplier: 4, totalQuantity: 8, category: 'Processor', unitPriceUsd: 3000, description: 'Intel Xeon 8580' },
              { sku: 'R0R41A', quantity: 1, quantityScope: 'global', category: 'Accessory', unitPriceUsd: 500, description: 'Spare Cable Kit' }
            ]
          },
          mockEvalResults.conflictGraph.rankedSolutions[1]
        ]
      },
      portalValidationStatus: 'PORTAL_VALIDATION_PENDING',
      manifestFingerprint: 'f'.repeat(64),
      acceptanceGate: { isValid: true, blockersCount: 0 },
      deliveryAuthorization: {
        token: `DELIV-AUTH-${'a'.repeat(64)}`,
        signature: 'a'.repeat(64),
        manifestFingerprint: 'f'.repeat(64)
      }
    };
    rerender(<ResolutionMatrix evalResults={authorizedEval} selectedChassis="DL380_Gen12_SFF" />);
    const exportBtnsAuth = screen.getAllByRole('button', { name: /Export XLSX/i });
    expect(exportBtnsAuth[0]).not.toBeDisabled();
    expect(screen.getByTestId('delivery-auth-banner')).toHaveTextContent(/DELIVERY_AUTHORIZED/i);
    const clusterBanner = screen.getByTestId('cluster-sizing-banner');
    expect(clusterBanner).toHaveTextContent('8 RU');
    expect(clusterBanner).toHaveTextContent('1 standard 42U racks');
    expect(clusterBanner).toHaveTextContent('6.4 kW');
    expect(clusterBanner).toHaveTextContent(/High-Line 200-240V Mandated/i);
    expect(clusterBanner).toHaveTextContent(/100% Covered/i);
    expect(clusterBanner).toHaveTextContent(/query_parent_1234/i);
  });
});
