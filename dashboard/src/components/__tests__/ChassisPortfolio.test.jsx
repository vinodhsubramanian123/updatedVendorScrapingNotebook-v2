import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ChassisHeaderSummary from '../summary/ChassisHeaderSummary';
import ChassisPortfolioTable from '../summary/ChassisPortfolioTable';

describe('ChassisHeaderSummary', () => {
  it('renders summary metrics correctly from normalized schema', () => {
    const summary = {
      totalChassisVariants: 13,
      totalPortfolioSKUs: 4520,
      totalActiveRules: 182,
      healthyVariants: 10,
      partialVariants: 3,
      families: ['ProLiant', 'Synergy', 'Alletra']
    };

    render(
      <ChassisHeaderSummary
        summary={summary}
        onTriggerSyncKnowledge={vi.fn()}
        isTaskRunning={false}
      />
    );

    expect(screen.getByText('13')).toBeInTheDocument();
    expect(screen.getByText('4,520')).toBeInTheDocument();
    expect(screen.getByText('182')).toBeInTheDocument();
    expect(screen.getByText(/Cloud sync requires receipt verification/i)).toBeInTheDocument();
  });

  it('handles unknown or missing counts gracefully', () => {
    render(
      <ChassisHeaderSummary
        summary={{}}
        onTriggerSyncKnowledge={vi.fn()}
        isTaskRunning={false}
      />
    );

    expect(screen.getAllByText('Unknown').length).toBeGreaterThanOrEqual(2);
  });
});

describe('ChassisPortfolioTable', () => {
  const variants = [
    { id: 'DL380_Gen12', chassis: 'HPE ProLiant DL380 Gen12', family: 'ProLiant', syncStatus: 'HEALTHY', totalSKUs: 605, totalRules: 28 },
    { id: 'SY480_Gen12', chassis: 'HPE Synergy 480 Gen12', family: 'Synergy', syncStatus: 'HEALTHY', totalSKUs: 420, totalRules: 15 },
    { id: 'MSL3040', chassis: 'HPE StoreEver MSL3040', family: 'StoreEver', syncStatus: 'PARSED_NO_RULES', totalSKUs: 141, totalRules: 0 }
  ];

  it('renders variants and supports filtering and selection', () => {
    const onSelect = vi.fn();
    const setSelectedStatus = vi.fn();
    const setSelectedFamily = vi.fn();

    render(
      <ChassisPortfolioTable
        variants={variants}
        selectedChassis="DL380_Gen12"
        onSelectChassis={onSelect}
        selectedStatus="ALL"
        setSelectedStatus={setSelectedStatus}
        selectedFamily="ALL"
        setSelectedFamily={setSelectedFamily}
        families={['ProLiant', 'Synergy', 'StoreEver']}
      />
    );

    expect(screen.getByText('HPE ProLiant DL380 Gen12')).toBeInTheDocument();
    expect(screen.getByText('HPE Synergy 480 Gen12')).toBeInTheDocument();
    expect(screen.getByText('HPE StoreEver MSL3040')).toBeInTheDocument();

    // DL380 should be marked active
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();

    // Click on select button for Synergy (second row)
    const selectButtons = screen.getAllByText('Select');
    fireEvent.click(selectButtons[1]);
    expect(onSelect).toHaveBeenCalledWith('SY480_Gen12');

    // Click on status filter button
    fireEvent.click(screen.getByRole('button', { name: 'PARSED_NO_RULES' }));
    expect(setSelectedStatus).toHaveBeenCalledWith('PARSED_NO_RULES');
  });

  it('filters by search term dynamically', () => {
    render(
      <ChassisPortfolioTable
        variants={variants}
        selectedChassis="DL380_Gen12"
        onSelectChassis={vi.fn()}
        selectedStatus="ALL"
        selectedFamily="ALL"
        searchTerm="MSL"
        families={['ProLiant', 'Synergy', 'StoreEver']}
      />
    );

    expect(screen.getByText('HPE StoreEver MSL3040')).toBeInTheDocument();
    expect(screen.queryByText('HPE ProLiant DL380 Gen12')).not.toBeInTheDocument();
  });
});
