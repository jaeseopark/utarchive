import { useEffect, useState } from "react";
import { useSongsStore } from "../stores/useSongsStore";
import { type SongId } from "../types/brands";

/**
 * Hook to fetch and manage song detail with caching
 *
 * Fetches song detail from the store. Tree fetching is handled separately by useFamilyTree.
 */
export function useSongDetail(songId: SongId | undefined) {
  const { error, fetchSongDetail, getSongDetail } = useSongsStore();
  const [detailLoading, setDetailLoading] = useState(false);

  /**
   * Fetch song detail - simple, direct fetch
   */
  useEffect(() => {
    if (!songId) return;

    const cached = getSongDetail(songId);
    if (cached) {
      return; // Already have it
    }

    setDetailLoading(true);
    fetchSongDetail(songId).finally(() => {
      setDetailLoading(false);
    });
  }, [songId, fetchSongDetail, getSongDetail]);

  const song = songId ? getSongDetail(songId) : undefined;

  return { song, isLoading: detailLoading, error };
}
