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

  it('shows consolidated SKU prices and carries the pricing run into follow-up requests', async () => {
    const classification = { intent: 'CATALOG_INTELLIGENCE', confidence: 0.95 };
    api.postJson
      .mockResolvedValueOnce(classification)
      .mockImplementationOnce(async (_url, input) => ({
        runId: input.runId,
        classification,
        result: {
          status: 'SUCCESS',
          priceDrifts: {
            coverage: { catalogsScanned: ['DL360_Gen12', 'DL380_Gen12'], snapshotsRead: 4, trailConflictCount: 0, issues: [] },
            groups: [{ category: 'Memory', totalChanges: 1, changes: [{
              sku: 'P69727-B21', description: '32 GB DIMM', previousPriceUsd: 100, currentPriceUsd: 120,
              lastOldPriceDate: '2026-09-01', firstNewPriceDate: '2026-09-06', changeUsd: 20, changePct: 20,
              sources: [
                { catalog: 'DL360_Gen12', previousDate: '2026-09-01', currentDate: '2026-09-06' },
                { catalog: 'DL380_Gen12', previousDate: '2026-09-01', currentDate: '2026-09-07' }
              ]
            }] }]
          }
        }
      }))
      .mockResolvedValueOnce(classification);

    render(<PresalesRequestPanel localOnly={true} />);
    fireEvent.click(screen.getByRole('button', { name: 'Catalog Price Drifts' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview route' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Run query' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Run query' }));
    const sku = await screen.findByText('P69727-B21');
    expect(sku.closest('tr')).toHaveTextContent('DL360_Gen12');
    expect(sku.closest('tr')).toHaveTextContent('DL380_Gen12');
    expect(sku.closest('tr')).toHaveTextContent('$100');
    expect(sku.closest('tr')).toHaveTextContent('$120');
    const firstRunId = api.postJson.mock.calls[1][1].runId;
    fireEvent.change(screen.getByLabelText('Requirements or presales question'), { target: { value: 'Last 3 price drifts of above' } });
    fireEvent.click(screen.getByRole('button', { name: 'Preview route' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Run query' })).toBeEnabled());
    expect(api.postJson.mock.calls[2][1].context.priorPriceDriftRunId).toBe(firstRunId);
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
    fireEvent.click(screen.getByRole('button', { name: /Preview route/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Run query/i })).toBeEnabled();
    });

    // Switch header product before executing — snapshotted plan product must remain intact
    rerender(<PresalesRequestPanel product={dl360} localOnly={true} onEvaluateBoq={onEvaluateBoq} />);
    const executeBtn = screen.getByRole('button', { name: /Run query/i });
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
    fireEvent.click(screen.getByRole('button', { name: /Preview route/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Run query/i })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: /Run query/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent(/Memory, Target Product Catalog/i);
    expect(screen.queryByRole('button', { name: /Evaluate in 5-Tier Matrix/i })).not.toBeInTheDocument();
  });

  it('renders structured catalog search results and discloses excluded unmeasured lead-time items', async () => {
    const classification = { intent: 'CATALOG_INTELLIGENCE', confidence: 0.95 };
    api.postJson
      .mockResolvedValueOnce(classification)
      .mockResolvedValueOnce({
        runId: 'query_catalog_search',
        classification,
        result: {
          intent: 'CATALOG_INTELLIGENCE',
          status: 'SUCCESS',
          catalogSearch: {
            results: [
              {
                product: 'DL360_Gen12',
                sku: 'P64707-B21',
                description: 'HPE 64GB 2Rx4 PC5-5600B-R Smart Kit',
                componentRole: 'Memory',
                listPriceUsd: 1850,
                priceState: 'PRICED',
                leadTimeDays: 7,
                leadTimeText: '1 week',
                lifecycleCanonical: 'Active',
                visibility: 'VISIBLE'
              }
            ],
            excludedUnmeasured: [
              { sku: 'P99999-B21', product: 'DL360_Gen12', reason: 'LEAD_TIME_UNPUBLISHED', leadTimeText: 'Unpublished' }
            ],
            excludedConflicts: [],
            summary: {
              productsSearched: ['DL360_Gen12'],
              returnedCount: 1,
              excludedUnmeasuredCount: 1,
              excludedConflictCount: 0,
              incompleteCatalogCoverage: false
            }
          }
        }
      });

    render(<PresalesRequestPanel localOnly={true} />);
    fireEvent.change(screen.getByLabelText('Requirements or presales question'), {
      target: { value: 'List all 64 GB DDR5 DIMMs for DL360 Gen12 and sort by lead time' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Preview route' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Run query' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Run query' }));

    const view = await screen.findByTestId('catalog-search-view');
    expect(view).toHaveTextContent('P64707-B21');
    expect(view).toHaveTextContent('$1,850');
    expect(view).toHaveTextContent('1 week');
    expect(view).toHaveTextContent('Excluded unverified fields: 1');
    expect(view).toHaveTextContent('P99999-B21');
  });

  it('submits once from the keyboard and locks the execution mode to deterministic offline', async () => {
    const classification = { intent: 'CATALOG_INTELLIGENCE' };
    api.postJson.mockResolvedValueOnce(classification).mockResolvedValueOnce({ classification, result: { status: 'SUCCESS', message: 'Evidence returned' } });
    render(<PresalesRequestPanel serverOffline={true} />);
    const field = screen.getByLabelText('Requirements or presales question');
    fireEvent.change(field, { target: { value: 'Search for P73282-B21' } });
    fireEvent.keyDown(field, { key: 'Enter', shiftKey: true });
    expect(api.postJson).not.toHaveBeenCalled();
    fireEvent.keyDown(field, { key: 'Enter', ctrlKey: true });
    fireEvent.keyDown(field, { key: 'Enter', ctrlKey: true });
    expect(await screen.findByText('Evidence returned')).toBeInTheDocument();
    expect(api.postJson).toHaveBeenCalledTimes(2);
    expect(api.postJson.mock.calls[1][0]).toBe('/api/agent/query');
    expect(api.postJson.mock.calls[1][1]).toMatchObject({ mode: 'DETERMINISTIC', context: { offline: true } });
    expect(screen.getByLabelText('Execution mode')).toBeDisabled();
  });

  it('previews an omnibox request without executing and blocks conflicting scopes', async () => {
    api.postJson.mockResolvedValueOnce({ intent: 'SOLUTION_COMPARISON', scope: { conflict: 'Pinned product conflicts with request' } });
    const request = { id: 'omnibox-1', query: 'Compare servers', preview: true };
    const { rerender } = render(<PresalesRequestPanel omniboxRequest={request} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Pinned product conflicts');
    rerender(<PresalesRequestPanel omniboxRequest={request} />);
    expect(api.postJson).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Run query' })).toBeDisabled();
  });
});
