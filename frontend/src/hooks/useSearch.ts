import { useCallback, useEffect, useState } from 'react';
import { useSearchStore } from '../stores/useSearchStore';

/**
 * Hook to manage search with debounce
 */
export function useSearch(initialQuery = '') {
  const { query, results, isLoading, error, recentSearches, search, clearResults, setQuery } = useSearchStore();
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(debouncedQuery);
      if (debouncedQuery.trim()) {
        search(debouncedQuery);
      } else {
        clearResults();
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [debouncedQuery, search, clearResults]);

  const handleQueryChange = useCallback((q: string) => {
    setQuery(q);
    setDebouncedQuery(q);
  }, [setQuery]);

  return {
    query,
    results,
    isLoading,
    error,
    recentSearches,
    setQuery: handleQueryChange,
    clearResults,
  };
}
