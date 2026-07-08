import { useEffect } from 'react';
import { useSongsStore } from '../stores/useSongsStore';

/**
 * Hook to fetch and manage song detail with caching
 */
export function useSongDetail(songId: string) {
  const { isLoading, error, fetchSongDetail, getSongDetail, fetchSongTree, getSongTree } = useSongsStore();

  useEffect(() => {
    if (!songId) return;
    
    // Check cache and fetch if needed
    const cached = getSongDetail(songId);
    if (!cached) {
      fetchSongDetail(songId);
    }
    
    const treeCached = getSongTree(songId);
    if (!treeCached) {
      fetchSongTree(songId);
    }
  }, [songId]); // Only depend on songId, not the store functions

  const song = getSongDetail(songId);
  const tree = getSongTree(songId);

  return { song, tree, isLoading, error };
}
