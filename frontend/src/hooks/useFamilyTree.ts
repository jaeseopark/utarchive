import { useEffect, useState, useCallback } from 'react';
import { useSongsStore } from '../stores/useSongsStore';
import type { SongTree } from '../api/schemas';
import { type SongId } from '../types/brands';

/**
 * Hook to fetch and manage a family tree by masterId.
 * Caches trees by masterId, so all songs in a family share the same cache entry.
 * 
 * @param masterId - The master ID of the family tree (required)
 * @param songIdForTree - A song ID from within the family tree to use for fetching the tree
 * @returns Object containing tree, isLoading, error, and refetch function
 */
export function useFamilyTree(masterId: SongId, songIdForTree?: SongId) {
  const [tree, setTree] = useState<SongTree | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { fetchSongTree, songDetails } = useSongsStore();

  /**
   * Fetch the tree for a given songId
   * Always fetches fresh data from the API
   */
  const fetchTreeForSongId = useCallback(async (songId: SongId) => {
    setIsLoading(true);
    setError(null);

    try {
      const fetchedTree = await fetchSongTree(songId);
      setTree(fetchedTree ?? null);
      
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
  }, [fetchSongTree]);

  /**
   * Main fetch effect: Determines which song ID to use and fetches the tree
   * 
   * Dependencies: only the external inputs (masterId, songIdForTree) and the fetch function
   * Looks up an alternate song ID from songDetails only if songIdForTree is not provided
   */
  useEffect(() => {
    // Determine which song ID to fetch for this family tree
    let songId = songIdForTree;
    
    if (!songId) {
      // Look for a song in songDetails with matching masterId
      const detailsEntry = Object.entries(songDetails).find(
        ([, song]) => song.masterId === masterId
      );
      // The key is stored as a string, convert it to SongId type
      songId = detailsEntry?.[0] as SongId | undefined;
    }
    
    if (!songId) {
      setError('No song found for this family tree');
      setTree(null);
      return;
    }

    fetchTreeForSongId(songId);
  }, [masterId, songIdForTree, fetchTreeForSongId, songDetails]);

  /**
   * Helper to find a song ID for manual refetches
   */
  const findSongIdForMasterId = useCallback((): SongId | undefined => {
    if (songIdForTree) {
      return songIdForTree;
    }
    const detailsEntry = Object.entries(songDetails).find(
      ([, song]) => song.masterId === masterId
    );
    // The key is already a SongId (string representation), so we can cast it
    return detailsEntry?.[0] as SongId;
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

  return {
    tree,
    isLoading,
    error,
    refetch,
  };
}
