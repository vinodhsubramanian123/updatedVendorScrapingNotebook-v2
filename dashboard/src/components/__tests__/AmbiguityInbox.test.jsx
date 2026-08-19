import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AmbiguityInbox from '../AmbiguityInbox';

describe('AmbiguityInbox', () => {
  it('renders nothing when confidence score is high and no errors exist', () => {
    const evalResults = {
      confidenceScore: 0.95,
      errors: [],
      missingDependencies: []
    };
    const { container } = render(<AmbiguityInbox evalResults={evalResults} chassisContext="DL380_Gen12_SFF" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders ambiguity alert when confidence score is below 0.85', () => {
    const evalResults = {
      confidenceScore: 0.60,
      errors: ['Missing high-performance heatsink for 250W processor'],
      missingDependencies: [{ sku: 'P48820-B21', role: 'Cooling / Thermal' }]
    };
    render(<AmbiguityInbox evalResults={evalResults} chassisContext="DL380_Gen12_SFF" />);
    expect(screen.getByText(/Ambiguity & Anomaly Resolution Inbox/i)).toBeInTheDocument();
    expect(screen.getByText(/Low Confidence Guardrail/i)).toBeInTheDocument();
  });

  it('allows expanding and viewing resolution actions', () => {
    const evalResults = {
      confidenceScore: 0.50,
      errors: ['Direct SKU dependency violated: Telco DC Lug Kit required'],
      requiresUserChassisConfirmation: false
    };
    render(<AmbiguityInbox evalResults={evalResults} chassisContext="DL380_Gen12_SFF" />);
    expect(screen.getByText(/Auto-Query NotebookLM/i)).toBeInTheDocument();
    expect(screen.getByText(/Step 1: Consult NotebookLM MCP/i)).toBeInTheDocument();
  });
});
