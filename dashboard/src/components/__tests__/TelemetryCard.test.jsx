import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TelemetryCard from '../TelemetryCard';

global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));

describe('TelemetryCard', () => {
  it('aborts in-flight telemetry when the view closes', () => {
    let signal;
    global.fetch.mockImplementationOnce((_url, options) => {
      signal = options.signal;
      return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
    });
    const view = render(<TelemetryCard />);
    expect(signal?.aborted).toBe(false);
    view.unmount();
    expect(signal?.aborted).toBe(true);
  });

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

  it('shows recorded causes and next actions in all six KPI dialogs', () => {
    render(<TelemetryCard telemetry={{
      evaluationsCount: 1,
      avgConfidenceScore: 0.62,
      history: [{ id: 'run-a', confidenceScore: 0.62, rootCauseAttribution: 'INPUT_AMBIGUITY', criticalViolationsCount: 1, stageBreakdown: { stage3RAGConsultationMs: 640 } }],
      pendingRuleObservations: [{ errorType: 'DEPENDENCY', chassis: 'DL380_Gen12', governanceStatus: 'QUARANTINED' }],
      exportHistory: [{ filename: 'verified.xlsx', rank: 2 }]
    }} />);
    const expected = {
      'Total Evaluations': 'Unresolved customer requirements',
      'Avg Confidence': 'Unresolved customer requirements',
      'Learned Rules': 'DL380_Gen12',
      'Failed Evals': 'Unresolved customer requirements',
      'Avg Duration': '640 ms',
      'Workflow Exports': 'verified.xlsx'
    };
    for (const [label, reason] of Object.entries(expected)) {
      fireEvent.click(screen.getByText(label));
      const dialog = within(screen.getByRole('dialog'));
      expect(dialog.getByText('Root cause and recommended action')).toBeInTheDocument();
      expect(dialog.getAllByText(new RegExp(reason, 'i')).length).toBeGreaterThan(0);
      fireEvent.click(dialog.getByRole('button', { name: 'Close modal' }));
    }
  });

  it('renders correctly when telemetry data is missing', async () => {
    render(<TelemetryCard telemetry={null} />);
    await waitFor(() => {
      expect(screen.getByText(/Loading Telemetry/)).toBeInTheDocument();
    });
  });
});
