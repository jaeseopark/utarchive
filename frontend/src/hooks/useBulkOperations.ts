import { useCallback, useState } from "react";
import { usePlaylistsStore } from "../stores/usePlaylistsStore";
import type { PlaylistId, SongId } from "../types/brands";

export interface BulkOperationState {
  isLoading: boolean;
  error: string | null;
  showPlaylistPicker: boolean;
}

export interface UseBulkOperationsReturn {
  state: BulkOperationState;
  canExecute: boolean;
  initiateAddToPlaylist: () => void;
  confirmAddToPlaylist: (playlistId: PlaylistId) => Promise<void>;
  cancelOperation: () => void;
}

/**
 * Hook to manage bulk song operations (currently only "add to playlist" is supported).
 * Receives selected song IDs as input and manages operation workflows.
 */
export function useBulkOperations(selectedSongIds: SongId[]): UseBulkOperationsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);

  const addSongToPlaylist = usePlaylistsStore((state) => state.addSongToPlaylist);

  const canExecute = selectedSongIds.length > 0;

  const initiateAddToPlaylist = useCallback(() => {
    if (!canExecute) {
      return;
    }
    setError(null);
    setShowPlaylistPicker(true);
  }, [canExecute]);

  const confirmAddToPlaylist = useCallback(
    async (playlistId: PlaylistId) => {
      if (!canExecute) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Add all selected songs to the playlist
        // Use Promise.all to add all songs in parallel
        await Promise.all(selectedSongIds.map((songId) => addSongToPlaylist(playlistId, songId)));

        // Success - close modal
        setShowPlaylistPicker(false);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to add songs to playlist";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedSongIds, canExecute, addSongToPlaylist],
  );

  const cancelOperation = useCallback(() => {
    setShowPlaylistPicker(false);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    state: {
      isLoading,
      error,
      showPlaylistPicker,
    },
    canExecute,
    initiateAddToPlaylist,
    confirmAddToPlaylist,
    cancelOperation,
  };
}
