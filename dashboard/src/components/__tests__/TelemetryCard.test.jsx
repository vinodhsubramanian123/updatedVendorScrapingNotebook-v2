import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TelemetryCard from '../TelemetryCard';

global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));

describe('TelemetryCard', () => {
  it('renders correctly with telemetry data', async () => {
    const mockTelemetry = {
      pipelineVersion: '1.5.0',
      totalRuns: 42,
      lastRunDurationMs: 1500,
      totalExceptions: 2
    };

    render(<TelemetryCard telemetry={mockTelemetry} />);
    
    await waitFor(() => {
      expect(screen.getByText(/System Telemetry/)).toBeInTheDocument();
      expect(screen.getByText(/v1.5.0/)).toBeInTheDocument();
    });
  });

  it('renders correctly when telemetry data is missing', async () => {
    render(<TelemetryCard telemetry={null} />);
    await waitFor(() => {
      expect(screen.getByText(/System Telemetry/)).toBeInTheDocument();
    });
  });
});
