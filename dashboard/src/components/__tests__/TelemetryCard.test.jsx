import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TelemetryCard from '../TelemetryCard';

global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));

describe('TelemetryCard', () => {
  it('renders correctly with telemetry data', async () => {
    const mockTelemetry = {
      evaluationsCount: 42,
      averageConfidence: 0.95,
      rulesViolationsCount: 2,
      knowledgeDeltasCount: 5,
      averageDurationMs: 1200
    };

    render(<TelemetryCard telemetry={mockTelemetry} />);
    
    await waitFor(() => {
      expect(screen.getByText(/System Telemetry/)).toBeInTheDocument();
      expect(screen.getByText('Total Evaluations')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  it('renders correctly when telemetry data is missing', async () => {
    render(<TelemetryCard telemetry={null} />);
    await waitFor(() => {
      expect(screen.getByText(/Loading Telemetry/)).toBeInTheDocument();
    });
  });
});
