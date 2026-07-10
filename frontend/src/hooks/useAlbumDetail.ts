import { useEffect } from 'react';
import { useAlbumsStore } from '../stores/useAlbumsStore';
import { type AlbumId } from '../types/brands';

/**
 * Hook to fetch and manage album detail with caching
 */
export function useAlbumDetail(albumId: AlbumId | undefined) {
  const { isLoading, error, fetchAlbumDetail, getAlbumDetail } = useAlbumsStore();

  useEffect(() => {
    if (!albumId) return;
    const cached = getAlbumDetail(albumId);
    if (!cached) {
      fetchAlbumDetail(albumId);
    }
  }, [albumId]); // Only depend on albumId, not the store functions

  const album = albumId ? getAlbumDetail(albumId) : undefined;

  return { album, isLoading, error };
}
