import { useEffect } from 'react';
import { useSongsStore } from '../stores/useSongsStore';

/**
 * Hook to fetch and manage song detail with caching
 */
export function useSongDetail(songId: string) {
  const { songDetails, isLoading, error, fetchSongDetail, getSongDetail, songTrees, fetchSongTree, getSongTree } = useSongsStore();

  useEffect(() => {
    if (!songId) return;
    const cached = getSongDetail(songId);
    if (!cached) {
      fetchSongDetail(songId);
    }
    const treeCached = getSongTree(songId);
    if (!treeCached) {
      fetchSongTree(songId);
    }
  }, [songId, fetchSongDetail, getSongDetail, fetchSongTree, getSongTree]);

  const song = getSongDetail(songId);
  const tree = getSongTree(songId);

  return { song, tree, isLoading, error };
}
