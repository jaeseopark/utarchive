import { useEffect, useState, useCallback } from 'react';
import { useSongsStore } from '../stores/useSongsStore';
import type { SongTree } from '../api/schemas';

/**
 * Hook to fetch and manage a family tree by masterId.
 * Caches trees by masterId, so all songs in a family share the same cache entry.
 * 
 * @param masterId - The master ID of the family tree (required)
 * @param songIdForTree - A song ID from within the family tree to use for fetching the tree
 * @returns Object containing tree, isLoading, error, and refetch function
 */
export function useFamilyTree(masterId: string, songIdForTree?: string) {
  const [tree, setTree] = useState<SongTree | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    fetchSongTree,
    getSongTree,
    songDetails,
    songTrees,
  } = useSongsStore();

  /**
   * Fetch the tree for a given songId
   * Only depends on explicit songId and store APIs - no transitive dependencies
   */
  const fetchTreeForSongId = useCallback(async (songId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await fetchSongTree(songId);
      const fetchedTree = getSongTree(masterId);
      setTree(fetchedTree || null);
      
      if (!fetchedTree) {
        setError('Failed to fetch family tree');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch family tree';
      setError(message);
      setTree(null);
    } finally {
      setIsLoading(false);
    }
  }, [fetchSongTree, getSongTree, masterId]);

  /**
   * Main fetch effect: Determines which song ID to use and fetches the tree
   * 
   * Architectural improvement: The effect directly determines the song ID inline
   * instead of calling a memoized function. This breaks the circular dependency:
   * - Old: refetch → findSongIdForMasterId → songDetails → recreates → effect fires
   * - New: effect determines songId once, calls fetchTreeForSongId with explicit input
   * 
   * Dependencies are only the external inputs (masterId, songIdForTree)
   * The lookup of an alternate song ID happens inside the effect with songDetails at that moment
   */
  useEffect(() => {
    // Determine which song ID to fetch for this family tree
    let songId = songIdForTree;
    
    if (!songId) {
      // Look for a song in songDetails with matching masterId
      const detailsEntry = Object.entries(songDetails).find(
        ([, song]) => song.masterId === masterId
      );
      songId = detailsEntry?.[0];
    }
    
    if (!songId) {
      setError('No song found for this family tree');
      setTree(null);
      return;
    }

    fetchTreeForSongId(songId);
  }, [masterId, songIdForTree, fetchTreeForSongId]);

  /**
   * Helper to find a song ID for manual refetches
   */
  const findSongIdForMasterId = useCallback((): string | undefined => {
    if (songIdForTree) {
      return songIdForTree;
    }
    const detailsEntry = Object.entries(songDetails).find(
      ([, song]) => song.masterId === masterId
    );
    return detailsEntry?.[0];
  }, [songIdForTree, songDetails, masterId]);

  /**
   * Expose refetch for manual refetches
   */
  const refetch = useCallback(async () => {
    const songId = findSongIdForMasterId();
    if (songId) {
      await fetchTreeForSongId(songId);
    } else {
      setError('No song found for this family tree');
      setTree(null);
    }
  }, [findSongIdForMasterId, fetchTreeForSongId]);

  /**
   * Watch for store updates to songTrees[masterId] and update the local tree state
   * This ensures the tree updates immediately when refreshSongTree is called
   */
  useEffect(() => {
    const cachedTree = songTrees[masterId];
    if (cachedTree) {
      setTree(cachedTree);
    }
  }, [masterId, songTrees]);

  return {
    tree,
    isLoading,
    error,
    refetch,
  };
}
