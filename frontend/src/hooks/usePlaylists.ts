import { useEffect } from "react";
import { usePlaylistsStore } from "../stores/usePlaylistsStore";

/**
 * Hook to fetch and manage playlists list with song counts
 */
export function usePlaylists() {
  const { playlists, songCounts, isLoading, error, fetchPlaylists } = usePlaylistsStore();

  useEffect(() => {
    void fetchPlaylists();
  }, [fetchPlaylists]);

  return { playlists, songCounts, isLoading, error, refetch: fetchPlaylists };
}
