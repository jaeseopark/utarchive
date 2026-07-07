import { useEffect } from 'react';
import { useArtistsStore } from '../stores/useArtistsStore';

/**
 * Hook to fetch and manage artists list with pagination
 */
export function useArtists(page = 0) {
  const { artists, isLoading, error, pagination, fetchArtists } = useArtistsStore();

  useEffect(() => {
    if (pagination.page !== page) {
      fetchArtists(page);
    }
  }, [page, pagination.page, fetchArtists]);

  return { artists, isLoading, error, pagination, refetch: () => fetchArtists(page) };
}
