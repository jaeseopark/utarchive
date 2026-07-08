import { useEffect } from 'react';
import { useAlbumsStore } from '../stores/useAlbumsStore';

/**
 * Hook to fetch and manage album detail with caching
 */
export function useAlbumDetail(albumId: string) {
  const { isLoading, error, fetchAlbumDetail, getAlbumDetail } = useAlbumsStore();

  useEffect(() => {
    if (!albumId) return;
    const cached = getAlbumDetail(albumId);
    if (!cached) {
      fetchAlbumDetail(albumId);
    }
  }, [albumId]); // Only depend on albumId, not the store functions

  const album = getAlbumDetail(albumId);

  return { album, isLoading, error };
}
