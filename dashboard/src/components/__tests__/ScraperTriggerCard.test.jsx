import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ScraperTriggerCard from '../ScraperTriggerCard';

describe('ScraperTriggerCard', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ status: 'READY', pages: [{ title: 'OCA Configurator' }] })
    });
  });

  it('renders control actions header and mode selectors', () => {
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
  });

  it('renders task running indicator when task is active', () => {
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
  });
});
