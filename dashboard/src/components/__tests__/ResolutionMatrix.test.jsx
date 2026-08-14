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
    
    // Find Expand All buttons
    const expandButtons = screen.getAllByText('Expand All');
    fireEvent.click(expandButtons[0]);
    
    // Now parts should be visible
    expect(screen.getByText('P49057-B21')).toBeInTheDocument();
    expect(screen.getByText('Intel Xeon 8580')).toBeInTheDocument();
  });

  it('renders empty state if no tiers provided', () => {
    render(<ResolutionMatrix evalResults={null} selectedChassis="DL380_Gen12_SFF" />);
    expect(screen.getByText('No Synthesis Available')).toBeInTheDocument();
  });
});
