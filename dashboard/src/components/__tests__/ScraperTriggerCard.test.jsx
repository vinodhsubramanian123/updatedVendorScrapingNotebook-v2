import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ScraperTriggerCard from '../ScraperTriggerCard';

describe('ScraperTriggerCard', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ status: 'READY', pages: [{ title: 'OCA Configurator' }] })
    });
  });

  it('renders control actions header and mode selectors', async () => {
    render(
      <ScraperTriggerCard
        logStream={[]}
        isTaskRunning={false}
        onTriggerScrape={vi.fn()}
        onTriggerRebuild={vi.fn()}
        onTriggerDownloadPdf={vi.fn()}
        onTriggerSyncKnowledge={vi.fn()}
        onTriggerKillTask={vi.fn()}
        onTriggerNavigate={vi.fn()}
      />
    );
    expect(screen.getByText(/Live CDP Scraper & Pipeline Controls/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Ready on OCA Portal Page/i)).toBeInTheDocument());
  });

  it('renders task running indicator when task is active', async () => {
    render(
      <ScraperTriggerCard
        logStream={['[SCRAPE] Starting execution']}
        isTaskRunning={true}
        onTriggerScrape={vi.fn()}
        onTriggerRebuild={vi.fn()}
        onTriggerDownloadPdf={vi.fn()}
        onTriggerSyncKnowledge={vi.fn()}
        onTriggerKillTask={vi.fn()}
        onTriggerNavigate={vi.fn()}
      />
    );
    expect(screen.getByText(/Cancel Task/i)).toBeInTheDocument();
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/history/runs'));
  });

  it('allows selecting storage mode before E2E scrape when CDP is offline and clears stale manifest messages', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ status: 'DISCONNECTED', error: 'Port 9222 closed' })
    });
    const onTriggerScrapeE2E = vi.fn();
    const onTriggerOnboard = vi.fn()
      .mockResolvedValueOnce({ manifest: { productId: 'Alletra_MP_B10000' } })
      .mockResolvedValueOnce(null);

    render(
      <ScraperTriggerCard
        targetProduct="Alletra_MP_B10000"
        logStream={[]}
        isTaskRunning={false}
        onTriggerScrape={vi.fn()}
        onTriggerScrapeE2E={onTriggerScrapeE2E}
        onTriggerOnboard={onTriggerOnboard}
        onTriggerRebuild={vi.fn()}
        onTriggerDownloadPdf={vi.fn()}
        onTriggerSyncKnowledge={vi.fn()}
        onTriggerKillTask={vi.fn()}
        onTriggerNavigate={vi.fn()}
      />
    );

    const storageRadio = await screen.findByRole('radio', { name: 'Storage Wizard' });
    expect(storageRadio).not.toBeDisabled();
    fireEvent.click(storageRadio);
    fireEvent.click(screen.getByRole('button', { name: /1-Click E2E Scrape & Onboard/i }));
    expect(onTriggerScrapeE2E).toHaveBeenCalledWith('storage');

    const onboardBtn = screen.getByRole('button', { name: /Generate \/ Refresh Manifest/i });
    fireEvent.click(onboardBtn);
    expect(await screen.findByRole('status')).toHaveTextContent('Manifest ready: Alletra_MP_B10000');

    fireEvent.click(onboardBtn);
    expect(await screen.findByRole('alert')).toHaveTextContent(/did not complete/i);
  });
});
