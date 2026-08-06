import { useCallback, useState } from "react";
import { api } from "../api/client";
import { SongSchema, type SongCreateInput } from "../api/schemas";

/**
 * Hook to create a new song
 * Song creation is handled by WebSocket (no optimistic update)
 */
export function useSongCreation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSong = useCallback(
    async (data: SongCreateInput) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.post("/api/songs", data, SongSchema);

        // Song will be added to store via WebSocket handler
        // The store callback will handle any side effects on isOwnOrigin

        setIsLoading(false);
        return response;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create song";
        setError(message);
        setIsLoading(false);
        throw err;
      }
    },
    [],
  );

  return {
    createSong,
    isLoading,
    error,
  };
}
