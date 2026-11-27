import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UserFeedbackDrawer from '../UserFeedbackDrawer';
import { postJson, requestJson } from '../../services/api';

vi.mock('../../services/api.js', () => ({
  requestJson: vi.fn(),
  postJson: vi.fn()
}));

describe('UserFeedbackDrawer', () => {
  beforeEach(() => {
    requestJson.mockReset();
    postJson.mockReset();
  });

  it('disables online analysis in localOnly mode and surfaces submission errors', async () => {
    requestJson.mockResolvedValueOnce([
      { id: 'fb-1', status: 'PENDING', category: 'bug_report', text: 'Check memory rule', context: { chassis: 'DL380_Gen12' } }
    ]);
    postJson.mockRejectedValueOnce(new Error('Queue storage locked'));

    render(<UserFeedbackDrawer isOpen onClose={vi.fn()} localOnly />);
    const analyzeBtn = await screen.findByRole('button', { name: 'Analyze with Antigravity' });
    expect(analyzeBtn).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/Type your dashboard feedback/i), { target: { value: 'New bug report' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit to Feedback Queue/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Queue storage locked');
  });

  it('queues structured rule proposals from agent analysis into quarantine', async () => {
    requestJson.mockResolvedValueOnce([
      {
        id: 'fb-2',
        status: 'PENDING',
        category: 'outcome_correction',
        text: 'Require enablement kit for OCP2',
        context: { runId: 'run-99', chassis: 'DL380_Gen12' }
      }
    ]);
    const proposedDelta = {
      chassis: 'DL380_Gen12',
      ruleUpdate: 'Require OCP2 enablement kit for 2nd OCP slot',
      affectedSku: 'P48828-B21',
      requiredDependencySku: 'P51911-B21'
    };
    postJson
      .mockResolvedValueOnce({
        disposition: 'RULE_DELTA_PROPOSAL',
        summary: 'Verified OCP2 dependency.',
        proposedDelta
      })
      .mockResolvedValueOnce({ governanceStatus: 'QUARANTINED', quarantineId: 'QD-1' });

    render(<UserFeedbackDrawer isOpen onClose={vi.fn()} localOnly={false} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Analyze with Antigravity' }));

    const confirmBtn = await screen.findByRole('button', { name: 'Confirm & Queue Rule Delta' });
    fireEvent.click(confirmBtn);

    await waitFor(() => expect(postJson).toHaveBeenLastCalledWith('/api/feedback/rule-proposal', {
      runId: 'run-99',
      ...proposedDelta
    }));
    expect(await screen.findByRole('status')).toHaveTextContent('Quarantined Deltas');
  });
});
