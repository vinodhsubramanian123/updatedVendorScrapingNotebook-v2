import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BoqUploader from '../BoqUploader';

describe('BoqUploader', () => {
  it('renders upload area and text area', () => {
    render(<BoqUploader onEvaluateBoq={vi.fn()} evalResults={null} logStream={[]} chassisDir="DL380_Gen12_SFF" />);
    
    expect(screen.getByText(/Click to select or drag and drop BOQ quote file/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e.g. 1x P49057-B21/i)).toBeInTheDocument();
  });

  it('populates textarea when preset button is clicked', () => {
    render(<BoqUploader onEvaluateBoq={vi.fn()} evalResults={null} logStream={[]} chassisDir="DL380_Gen12_SFF" />);
    
    const presetBtn = screen.getByText('DL380 Gen12');
    fireEvent.click(presetBtn);
    
    const textarea = screen.getByPlaceholderText(/e.g. 1x P49057-B21/i);
    expect(textarea.value).toContain('P49057-B21');
  });

  it('calls onEvaluateBoq with raw text when submit button is clicked', async () => {
    const mockOnEvaluateBoq = vi.fn().mockResolvedValue({ status: 'SUCCESS' });
    render(<BoqUploader onEvaluateBoq={mockOnEvaluateBoq} evalResults={null} logStream={[]} chassisDir="DL380_Gen12_SFF" />);
    
    // Set raw text via preset
    fireEvent.click(screen.getByText('DL380 Gen12'));
    
    // Submit
    const submitBtn = screen.getByText(/Run Aspect Math/i);
    fireEvent.click(submitBtn);
    
    expect(mockOnEvaluateBoq).toHaveBeenCalledWith({
      filepath: null,
      rawText: expect.stringContaining('P49057-B21')
    });
  });
});
