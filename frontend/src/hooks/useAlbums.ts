import { useEffect } from 'react';
import { useAlbumsStore } from '../stores/useAlbumsStore';

/**
 * Hook to fetch and manage albums list with pagination
 */
export function useAlbums(page = 0) {
  const { albums, isLoading, error, pagination, fetchAlbums } = useAlbumsStore();

  useEffect(() => {
    if (pagination.page !== page) {
      fetchAlbums(page);
    }
  }, [page, pagination.page, fetchAlbums]);

  return { albums, isLoading, error, pagination, refetch: () => fetchAlbums(page) };
}
