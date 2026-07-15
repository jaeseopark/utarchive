import { useEffect } from "react";
import { useArtistsStore } from "../stores/useArtistsStore";
import { type ArtistId } from "../types/brands";

/**
 * Hook to fetch and manage artist detail with caching
 */
export function useArtistDetail(artistId: ArtistId) {
  const { error, fetchArtistDetail, getArtistDetail } = useArtistsStore();

  useEffect(() => {
    if (!artistId) return;
    const cached = getArtistDetail(artistId);
    if (!cached) {
      fetchArtistDetail(artistId);
    }
  }, [artistId]); // Only depend on artistId, not the store functions

  const artist = getArtistDetail(artistId);

  return { artist, isLoading: false, error };
}
