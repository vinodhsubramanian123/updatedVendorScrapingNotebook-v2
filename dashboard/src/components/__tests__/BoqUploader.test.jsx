import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BoqUploader from '../BoqUploader';

describe('BoqUploader', () => {
  it('shows invalid-contract diagnostics without candidate action buttons', () => {
    render(<BoqUploader onEvaluateBoq={vi.fn()} evalResults={{ status: 'ERROR', isContractInvalid: true, error: 'Invalid quantity' }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid quantity');
    expect(screen.queryByText('Visual BOQ Topology')).not.toBeInTheDocument();
    expect(screen.queryByText('Corrected Candidate Verified')).not.toBeInTheDocument();
  });
  it('renders upload area and text area', () => {
    render(<BoqUploader onEvaluateBoq={vi.fn()} evalResults={null} logStream={[]} chassisDir="DL380_Gen12_SFF" />);
    
    expect(screen.getByText(/Drop your Excel/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Paste quote lines/i)).toBeInTheDocument();
  });

  it('populates textarea when preset button is clicked', () => {
    render(<BoqUploader onEvaluateBoq={vi.fn()} evalResults={null} logStream={[]} chassisDir="DL380_Gen12_SFF" />);
    
    const presetBtn = screen.getByText(/Sample Standard BOM/i);
    fireEvent.click(presetBtn);
    
    const textarea = screen.getByPlaceholderText(/Paste quote lines/i);
    expect(textarea.value).toContain('P73282-B21');
  });

  it('calls onEvaluateBoq with raw text when submit button is clicked', async () => {
    const mockOnEvaluateBoq = vi.fn().mockResolvedValue({ status: 'SUCCESS' });
    render(<BoqUploader onEvaluateBoq={mockOnEvaluateBoq} evalResults={null} logStream={[]} chassisDir="DL380_Gen12_SFF" />);
    
    // Set raw text via preset
    fireEvent.click(screen.getByText(/Sample Standard BOM/i));
    
    // Submit
    const submitBtn = screen.getByText(/Run 7-Aspect Evaluation/i);
    fireEvent.click(submitBtn);
    
    expect(mockOnEvaluateBoq).toHaveBeenCalledWith(
      null,
      expect.stringContaining('P73282-B21')
    );
  });
});
