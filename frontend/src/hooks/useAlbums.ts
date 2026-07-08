import { useEffect } from 'react';
import { useAlbumsStore } from '../stores/useAlbumsStore';

/**
 * Hook to fetch and manage albums list with pagination
 * Cache is kept fresh for 5 minutes. Navigating back to a cached page
 * shows cached data instantly without refetching.
 */
export function useAlbums(page = 0) {
  const { albums, isLoading, error, pagination, fetchAlbums } = useAlbumsStore();

  useEffect(() => {
    // Fetch if this is first load (no albums loaded yet)
    if (albums.length === 0 && !isLoading) {
      fetchAlbums(page);
    }
  }, [page]); // Only depend on page - store handles cache TTL

  return { albums, isLoading, error, pagination, refetch: () => fetchAlbums(page) };
}
