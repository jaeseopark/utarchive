import { useEffect, useState } from 'react';
import { useSongsStore } from '../stores/useSongsStore';

/**
 * Hook to fetch and manage song detail with caching
 * 
 * Separates song detail loading from tree loading:
 * - Song detail fetch: [songId]
 * - Tree fetch: [songId, masterId] (only after song is available)
 * 
 * This prevents the "Loading..." state from being stuck due to shared isLoading state
 * between two independent fetches.
 */
export function useSongDetail(songId: string) {
  const { error, fetchSongDetail, getSongDetail, fetchSongTree, getSongTree } = useSongsStore();
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

  /**
   * Fetch tree only after we have the song detail and know the masterId
   */
  useEffect(() => {
    if (!songId) return;

    const song = getSongDetail(songId);
    if (!song) {
      // Song not loaded yet, skip tree fetch
      return;
    }

    const masterId = song.masterId ?? song.id;
    const treeCached = getSongTree(masterId);
    
    if (treeCached) {
      return; // Already have tree
    }

    fetchSongTree(songId);
  }, [songId, fetchSongTree, getSongDetail, getSongTree]);

  const song = getSongDetail(songId);
  const masterId = song?.masterId ?? songId;
  const tree = getSongTree(masterId);

  // Only show loading if song detail is loading; tree loading happens separately
  const isLoadingOverall = detailLoading;

  return { song, tree, isLoading: isLoadingOverall, error };
}
