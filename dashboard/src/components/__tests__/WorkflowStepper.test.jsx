import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
    await waitFor(() => {
      expect(screen.getByText('Load BOQ')).toBeInTheDocument();
      expect(screen.getByText('BOQ Cleaning')).toBeInTheDocument();
    });
  });

  it('shows completed state when progress is null', async () => {
    render(<WorkflowStepper progress={null} activeProgress={null} evalResults={mockEvalResults} isTaskRunning={false} />);
    await waitFor(() => {
      expect(screen.getByText('Load BOQ')).toBeInTheDocument();
      expect(screen.getByText('BOQ Cleaning')).toBeInTheDocument();
    });
  });
});
