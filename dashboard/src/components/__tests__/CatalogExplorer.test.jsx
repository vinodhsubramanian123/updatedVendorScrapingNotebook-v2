import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CatalogExplorer from '../CatalogExplorer';
import { catalogIndexer } from '../../utils/nlpSearch';

// Mock nlpSearch to avoid FlexSearch issues in jsdom
vi.mock('../../utils/nlpSearch', () => ({
  catalogIndexer: {
    indexCatalog: vi.fn(),
    search: vi.fn()
  }
}));

describe('CatalogExplorer', () => {
  const mockCatalog = {
    metadata: { chassisName: 'DL380 Gen12 SFF' },
    entries: [
      {
        parentCategory: 'Processor',
        skus: [
          { sku: 'P49057-B21', description: 'Intel Xeon 8580', listPrice: 3000, optionType: 'CTO' }
        ]
      },
      {
        parentCategory: 'Memory',
        skus: [
          { sku: 'P69728-B21', description: '64GB DDR5 DIMM', listPrice: 500, optionType: 'Option' }
        ]
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state when catalog data is missing', () => {
    render(<CatalogExplorer catalogData={null} isCatalogLoading={false} />);
    expect(screen.getByText('No Catalog Selected')).toBeInTheDocument();
  });

  it('renders categories and SKU table when catalog data is present', () => {
    render(<CatalogExplorer catalogData={mockCatalog} chassisName="DL380_Gen12_SFF" />);
    
    expect(screen.getByText(/Total SKU Category Mappings/i)).toBeInTheDocument();
    
    // Check if SKUs are displayed
    expect(screen.getByText('P49057-B21')).toBeInTheDocument();
    expect(screen.getByText('Intel Xeon 8580')).toBeInTheDocument();
    expect(screen.getByText('P69728-B21')).toBeInTheDocument();
  });

  it('calls search when search input is changed', () => {
    catalogIndexer.search.mockReturnValue([
      { sku: 'P49057-B21', description: 'Intel Xeon 8580', listPrice: 3000, optionType: 'CTO' }
    ]);
    
    render(<CatalogExplorer catalogData={mockCatalog} chassisName="DL380_Gen12_SFF" />);
    
    const searchInput = screen.getByPlaceholderText(/Search SKUs/i);
    fireEvent.change(searchInput, { target: { value: 'Xeon' } });
    
    expect(catalogIndexer.search).toHaveBeenCalledWith('Xeon');
  });
});
