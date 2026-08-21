import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BoqUploader from '../BoqUploader';

describe('BoqUploader', () => {
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
    const submitBtn = screen.getByText(/Run 6-Aspect Evaluation/i);
    fireEvent.click(submitBtn);
    
    expect(mockOnEvaluateBoq).toHaveBeenCalledWith(
      null,
      expect.stringContaining('P73282-B21')
    );
  });
});
