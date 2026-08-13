import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import WorkflowStepper from '../WorkflowStepper';

describe('WorkflowStepper', () => {
  const mockProgress = {
    task: 'EVAL',
    currentStep: 2,
    totalSteps: 4,
    action: 'Validating DL380 rules',
    status: 'running'
  };

  const mockEvalResults = {
    status: 'SUCCESS'
  };

  it('renders stages correctly', async () => {
    render(<WorkflowStepper progress={mockProgress} activeProgress={mockProgress} evalResults={mockEvalResults} isTaskRunning={true} />);
    const expandBtn = screen.getByText(/Expand Pipeline/i);
    fireEvent.click(expandBtn);
    await waitFor(() => {
      expect(screen.getByText('1. Load BOQ')).toBeInTheDocument();
      expect(screen.getByText('2. BOQ Cleaning')).toBeInTheDocument();
    });
  });

  it('shows completed state when progress is null', async () => {
    render(<WorkflowStepper progress={null} activeProgress={null} evalResults={mockEvalResults} isTaskRunning={false} />);
    const expandBtn = screen.getByText(/Expand Pipeline/i);
    fireEvent.click(expandBtn);
    await waitFor(() => {
      expect(screen.getByText('1. Load BOQ')).toBeInTheDocument();
      expect(screen.getByText('2. BOQ Cleaning')).toBeInTheDocument();
    });
  });
});
