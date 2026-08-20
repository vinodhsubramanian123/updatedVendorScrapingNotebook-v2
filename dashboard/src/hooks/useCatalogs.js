/**
 * dashboard/src/hooks/useCatalogs.js
 *
 * Manages catalog list fetching and chassis-specific catalog data loading.
 * Extracted from App.jsx (GAP-L1c).
 *
 * Usage:
 *   const {
 *     catalogs, catalogData, isCatalogLoading,
 *     selectedChassis, setSelectedChassis,
 *     refreshCatalogs
 *   } = useCatalogs();
 */
import { useState, useEffect, useCallback } from 'react';

export function useCatalogs(initialChassis = 'DL380_Gen12_SFF') {
  const [catalogs, setCatalogs] = useState([]);
  const [selectedChassis, setSelectedChassis] = useState(initialChassis);
  const [catalogData, setCatalogData] = useState(null);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);

  // Fetch the catalog registry. Called on mount and after task completion.
  const refreshCatalogs = useCallback(async () => {
    try {
      const res = await fetch('/api/available-catalogs');
      const data = await res.json();
      const list = data.catalogs || [];
      setCatalogs(list);
      // Auto-select first catalog if none chosen yet
      if (list.length > 0 && !initialChassis) {
        setSelectedChassis(list[0].id);
      }
    } catch (err) {
      console.error('[useCatalogs] Failed to fetch catalogs:', err);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial load
  useEffect(() => {
    refreshCatalogs();
  }, [refreshCatalogs]);

  // Load catalog data whenever the selected chassis changes.
  // Also clears stale data immediately to avoid cross-chassis data leaks.
  useEffect(() => {
    if (!selectedChassis) return;
    const cat = catalogs.find(c => c.id === selectedChassis);
    if (!cat?.jsonPath) return;

    setCatalogData(null); // clear stale data immediately
    setIsCatalogLoading(true);

    fetch(`/api/catalog-data?path=${encodeURIComponent(cat.jsonPath)}`)
      .then(res => {
        if (!res.ok) throw new Error('Catalog data fetch failed');
        return res.json();
      })
      .then(data => {
        setCatalogData(data);
        setIsCatalogLoading(false);
      })
      .catch(err => {
        console.error('[useCatalogs] Catalog data load error:', err);
        setIsCatalogLoading(false);
      });
  }, [selectedChassis, catalogs]);

  return {
    catalogs,
    catalogData,
    isCatalogLoading,
    selectedChassis,
    setSelectedChassis,
    refreshCatalogs
  };
}
