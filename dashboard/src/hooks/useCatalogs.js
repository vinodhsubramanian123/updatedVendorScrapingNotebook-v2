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
import { useState, useEffect, useCallback, useRef } from 'react';
import { requestJson } from '../services/api.js';

export function useCatalogs(initialChassis = 'DL380_Gen12') {
  const [catalogs, setCatalogs] = useState([]);
  const [selectedChassis, setSelectedChassis] = useState(initialChassis);
  const [catalogData, setCatalogData] = useState(null);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState(null);
  const registryRequest = useRef(0);

  // Fetch the catalog registry. Called on mount and after task completion.
  const refreshCatalogs = useCallback(async () => {
    const requestId = ++registryRequest.current;
    try {
      const data = await requestJson('/api/available-catalogs');
      if (requestId !== registryRequest.current) return;
      if (!Array.isArray(data.catalogs)) throw new Error('Invalid catalog registry response');
      const list = data.catalogs || [];
      setCatalogError(null);
      setCatalogs(list);
      // Auto-select first or matching catalog if current selection is invalid
      if (list.length > 0) {
        setSelectedChassis(prev => {
          if (prev && list.some(c => c.id === prev)) return prev;
          const defaultMatch = list.find(c => c.id === 'DL380_Gen12') || list[0];
          return defaultMatch.id;
        });
      } else setSelectedChassis(null);
    } catch (err) {
      if (requestId === registryRequest.current) setCatalogError(err.message);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial load
  useEffect(() => {
    refreshCatalogs();
  }, [refreshCatalogs]);

  // Load catalog data whenever the selected chassis changes.
  // Also clears stale data immediately to avoid cross-chassis data leaks.
  useEffect(() => {
    setCatalogData(null);
    setIsCatalogLoading(false);
    if (!selectedChassis) return;
    const cat = catalogs.find(c => c.id === selectedChassis);
    if (!cat?.jsonPath) return;
    const controller = new AbortController();
    let current = true;
    setCatalogError(null);
    setIsCatalogLoading(true);

    requestJson(`/api/catalog-data?path=${encodeURIComponent(cat.jsonPath)}`, { signal: controller.signal })
      .then(data => {
        if (!current) return;
        setCatalogData(data);
        setIsCatalogLoading(false);
      })
      .catch(err => {
        if (!current || err.name === 'AbortError' || err.message?.includes('aborted')) return;
        setCatalogError(err.message);
        setIsCatalogLoading(false);
      });
    return () => { current = false; controller.abort(); };
  }, [selectedChassis, catalogs]);

  return {
    catalogs,
    catalogData,
    isCatalogLoading,
    catalogError,
    selectedChassis,
    setSelectedChassis,
    refreshCatalogs
  };
}
