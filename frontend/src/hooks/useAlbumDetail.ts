import { useEffect } from 'react';
import { useAlbumsStore } from '../stores/useAlbumsStore';

/**
 * Hook to fetch and manage album detail with caching
 */
export function useAlbumDetail(albumId: string) {
  const { albumDetails, isLoading, error, fetchAlbumDetail, getAlbumDetail } = useAlbumsStore();

  useEffect(() => {
    const cached = getAlbumDetail(albumId);
    if (!cached) {
      fetchAlbumDetail(albumId);
    }
  }, [albumId, fetchAlbumDetail, getAlbumDetail]);

  const album = getAlbumDetail(albumId);

  return { album, isLoading, error };
}
