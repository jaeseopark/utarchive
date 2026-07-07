import { useEffect } from 'react';
import { useArtistsStore } from '../stores/useArtistsStore';

/**
 * Hook to fetch and manage artist detail with caching
 */
export function useArtistDetail(artistId: string) {
  const { artistDetails, isLoading, error, fetchArtistDetail, getArtistDetail } = useArtistsStore();

  useEffect(() => {
    const cached = getArtistDetail(artistId);
    if (!cached) {
      fetchArtistDetail(artistId);
    }
  }, [artistId, fetchArtistDetail, getArtistDetail]);

  const artist = getArtistDetail(artistId);

  return { artist, isLoading, error };
}
