import { useEffect, useState } from "react";
import { useSongsStore } from "../stores/useSongsStore";
import { type SongId } from "../types/brands";

/**
 * Hook to fetch and manage song detail with caching
 *
 * Fetches song detail from the store. Tree fetching is handled separately by useFamilyTree.
 */
export function useSongDetail(songId: SongId | undefined) {
  // Use selectors to properly subscribe to store changes
  const song = useSongsStore((state) => (songId ? state.songDetails[songId] : undefined));
  const error = useSongsStore((state) => state.error);
  const fetchSongDetail = useSongsStore((state) => state.fetchSongDetail);
  const [detailLoading, setDetailLoading] = useState(false);

  /**
   * Fetch song detail - simple, direct fetch
   */
  useEffect(() => {
    if (!songId) return;

    if (song) {
      return; // Already have it
    }

    setDetailLoading(true);
    fetchSongDetail(songId).finally(() => {
      setDetailLoading(false);
    });
  }, [songId, song, fetchSongDetail]);

  return { song, isLoading: detailLoading, error };
}
