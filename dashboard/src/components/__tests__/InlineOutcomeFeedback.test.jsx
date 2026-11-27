import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InlineOutcomeFeedback from '../presales/InlineOutcomeFeedback';
import { postJson } from '../../services/api';

vi.mock('../../services/api.js', () => ({ postJson: vi.fn() }));

const envelope = { runId: 'run1', query: 'Compare platforms' };
function openFeedback(localOnly = false) {
  render(<InlineOutcomeFeedback envelope={envelope} localOnly={localOnly} />);
  fireEvent.click(screen.getByRole('button', { name: 'Correct / Teach Studio' }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Review the memory limits' } });
}

describe('outcome feedback', () => {
  beforeEach(() => postJson.mockReset());

  it('saves unscoped feedback locally and retains the draft after a failed submission', async () => {
    openFeedback(true);
    expect(screen.getByRole('button', { name: 'Analyze with Antigravity' })).toBeDisabled();
    postJson.mockRejectedValueOnce(new Error('Storage unavailable')).mockResolvedValueOnce({});
    const submit = screen.getByRole('button', { name: 'Submit Feedback Only' });
    fireEvent.click(submit);
    expect(await screen.findByRole('alert')).toHaveTextContent('Storage unavailable');
    expect(screen.getByRole('textbox')).toHaveValue('Review the memory limits');
    fireEvent.click(submit);
    expect(await screen.findByRole('status')).toHaveTextContent('Feedback saved for review');
    expect(postJson.mock.calls.map(([url]) => url)).toEqual(['/api/feedback-submit', '/api/feedback-submit']);
    expect(postJson.mock.calls[1][1].context).toEqual({ runId: 'run1', chassis: '' });
  });

  it('only queues the structured proposal on confirmation', async () => {
    openFeedback();
    const proposedDelta = { chassis: 'DL360_Gen12', ruleUpdate: 'Check memory symmetry', affectedSku: 'A', requiredDependencySku: 'B' };
    postJson.mockResolvedValueOnce({ disposition: 'RULE_DELTA_PROPOSAL', proposedDelta });
    fireEvent.click(screen.getByRole('button', { name: 'Analyze with Antigravity' }));
    const confirm = await screen.findByRole('button', { name: 'Confirm & Queue Rule Delta' });
    expect(postJson).toHaveBeenCalledTimes(1);
    fireEvent.click(confirm);
    expect(await screen.findByRole('status')).toHaveTextContent('Quarantined Deltas');
    expect(postJson).toHaveBeenLastCalledWith('/api/feedback/rule-proposal', { ...proposedDelta, runId: 'run1' });
  });
});
