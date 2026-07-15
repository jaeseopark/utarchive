import { useCallback, useState } from "react";
import { useSongsStore } from "../stores/useSongsStore";
import { useArtistsStore } from "../stores/useArtistsStore";
import { api } from "../api/client";
import { SongSchema, type SongCreateInput } from "../api/schemas";

/**
 * Hook to create a new song and update the store
 * Also updates artist song counts when a song is added with existing artists
 */
export function useSongCreation() {
  const { addSongDetail, addSong } = useSongsStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSong = useCallback(
    async (data: SongCreateInput) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.post("/api/songs", data, SongSchema);
        addSongDetail(response);
        addSong(response); // Add to songs list for immediate display

        // Update song count for each artist associated with this song
        if (response.artistIds && response.artistIds.length > 0) {
          const { incrementArtistSongCount } = useArtistsStore.getState();
          response.artistIds.forEach((artistId) => incrementArtistSongCount(artistId));
        }

        setIsLoading(false);
        return response;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create song";
        setError(message);
        setIsLoading(false);
        throw err;
      }
    },
    [addSongDetail, addSong],
  );

  return {
    createSong,
    isLoading,
    error,
  };
}
