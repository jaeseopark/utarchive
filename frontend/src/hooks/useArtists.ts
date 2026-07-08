import { useEffect } from 'react';
import { useArtistsStore } from '../stores/useArtistsStore';

/**
 * Hook to fetch and manage artists list with pagination
 * Cache is kept fresh for 5 minutes. Navigating back to a cached page
 * shows cached data instantly without refetching.
 */
export function useArtists(page = 0) {
  const { artists, isLoading, error, pagination, fetchArtists } = useArtistsStore();

  useEffect(() => {
    // Fetch if this is first load (no artists loaded yet)
    if (artists.length === 0 && !isLoading) {
      fetchArtists(page);
    }
  }, [page]); // Only depend on page - store handles cache TTL

  return { artists, isLoading, error, pagination, refetch: () => fetchArtists(page) };
}
