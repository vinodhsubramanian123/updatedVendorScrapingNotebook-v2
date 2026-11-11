import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PresalesRequestPanel from '../PresalesRequestPanel.jsx';
import * as api from '../../services/api.js';

vi.mock('../../services/api.js', async () => {
  const actual = await vi.importActual('../../services/api.js');
  return {
    ...actual,
    postJson: vi.fn(),
    requestJson: vi.fn(),
    uploadBoqFile: vi.fn()
  };
});

describe('PresalesRequestPanel presales handoff & scope preservation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  it('preserves originating product, nodeCount, quantityBasis, parentRunId and global/per-node scope across header product change', async () => {
    const onEvaluateBoq = vi.fn().mockResolvedValue({});
    const candidateRef = {
      parentRunId: 'query_4node_dl380',
      product: 'DL380 Gen12',
      chassisDir: 'outputs/ProLiant/Gen12/DL380_Gen12',
      serverCount: 4,
      nodeCount: 4,
      quantityBasis: 'CLUSTER_MULTIPLIED',
      digest: 'deadbeef1234',
      missingRequirements: [],
      requiresHumanClarification: false,
      effectivePolicy: { offline: true, mode: 'OFFLINE_LOCKED' }
    };

    api.postJson
      .mockResolvedValueOnce({ intent: 'RFP_SIZING_TO_BOM', confidence: 0.96, label: 'Natural Language Sizing' })
      .mockResolvedValueOnce({
        runId: 'query_4node_dl380',
        result: {
          intent: 'RFP_SIZING_TO_BOM',
          status: 'SIZING_DRAFT',
          chassis: 'DL380 Gen12',
          chassisDir: 'outputs/ProLiant/Gen12/DL380_Gen12',
          serverCount: 4,
          candidateReference: candidateRef,
          items: [
            { sku: 'P73282-B21', description: 'DL380 Gen12 CTO Server', quantity: 4, perNodeQuantity: 1, configurationMultiplier: 4, quantityScope: 'configuration', unitPriceUsd: 2500 },
            { sku: 'R0R41A', description: 'Spare Cable Kit', quantity: 1, quantityScope: 'global', unitPriceUsd: 500 }
          ]
        }
      });

    const dl380 = { id: 'DL380_Gen12', chassisDir: 'outputs/ProLiant/Gen12/DL380_Gen12', label: 'DL380 Gen12' };
    const dl360 = { id: 'DL360_Gen12', chassisDir: 'outputs/ProLiant/Gen12/DL360_Gen12', label: 'DL360 Gen12' };

    const { rerender } = render(
      <PresalesRequestPanel product={dl380} localOnly={true} onEvaluateBoq={onEvaluateBoq} />
    );

    fireEvent.click(screen.getByRole('button', { name: /Sizing \(4x DL380\)/i }));
    fireEvent.click(screen.getByRole('button', { name: /Identify workflow/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Run workflow/i })).toBeInTheDocument();
    });

    // Switch header product before executing — snapshotted plan product must remain intact
    rerender(<PresalesRequestPanel product={dl360} localOnly={true} onEvaluateBoq={onEvaluateBoq} />);
    const executeBtn = screen.getByRole('button', { name: /Run workflow/i });
    fireEvent.click(executeBtn);

    await waitFor(() => {
      expect(screen.getByTestId('candidate-reference-summary')).toBeInTheDocument();
    });

    expect(screen.getByTestId('candidate-reference-summary')).toHaveTextContent('DL380 Gen12');
    expect(screen.getByTestId('candidate-reference-summary')).toHaveTextContent('CLUSTER_MULTIPLIED');
    expect(screen.getByText('1/node × 4')).toBeInTheDocument();
    expect(screen.getByText('global')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Evaluate in 5-Tier Matrix/i }));

    expect(onEvaluateBoq).toHaveBeenCalledTimes(1);
    const evalArg = onEvaluateBoq.mock.calls[0][0];
    expect(evalArg.chassisDir).toBe('outputs/ProLiant/Gen12/DL380_Gen12');
    expect(evalArg.chassisName).toBe('DL380 Gen12');
    expect(evalArg.serverCount).toBe(4);
    expect(evalArg.nodeCount).toBe(4);
    expect(evalArg.quantityBasis).toBe('CLUSTER_MULTIPLIED');
    expect(evalArg.parentRunId).toBe('query_4node_dl380');
    expect(evalArg.candidateDigest).toBe('deadbeef1234');
    expect(evalArg.offline).toBe(true);
  });

  it('blocks one-click candidate evaluation and names missingRequirements when human clarification is required', async () => {
    const onEvaluateBoq = vi.fn().mockResolvedValue({});
    api.postJson
      .mockResolvedValueOnce({ intent: 'RFP_SIZING_TO_BOM', confidence: 0.9, label: 'Natural Language Sizing' })
      .mockResolvedValueOnce({
        runId: 'query_incomplete',
        result: {
          intent: 'RFP_SIZING_TO_BOM',
          status: 'REQUIRES_HUMAN_CLARIFICATION',
          requiresHumanClarification: true,
          missingRequirements: ['Memory', 'Target Product Catalog'],
          candidateReference: {
            parentRunId: 'query_incomplete',
            product: 'UNKNOWN_PRODUCT',
            nodeCount: 2,
            quantityBasis: 'CLUSTER_MULTIPLIED',
            missingRequirements: ['Memory', 'Target Product Catalog'],
            requiresHumanClarification: true
          },
          items: [
            { sku: 'P74845-B21', description: 'Xeon CPU', quantity: 2 }
          ]
        }
      });

    render(<PresalesRequestPanel product={{ id: 'DL380_Gen12', chassisDir: 'outputs/ProLiant/Gen12/DL380_Gen12' }} localOnly={true} onEvaluateBoq={onEvaluateBoq} />);
    fireEvent.change(screen.getByPlaceholderText(/Size 4 nodes/i), { target: { value: 'Size 2 unknown servers with Xeon CPU' } });
    fireEvent.click(screen.getByRole('button', { name: /Identify workflow/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Run workflow/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Run workflow/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent(/Memory, Target Product Catalog/i);
    expect(screen.queryByRole('button', { name: /Evaluate in 5-Tier Matrix/i })).not.toBeInTheDocument();
  });
});
