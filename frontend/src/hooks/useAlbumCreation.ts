import { useCallback, useState } from "react";
import { api } from "../api/client";
import { AlbumSchema, type AlbumCreateInput } from "../api/schemas";

/**
 * Hook to create a new album
 * Album creation is handled by WebSocket (no optimistic update)
 */
export function useAlbumCreation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAlbum = useCallback(
    async (data: AlbumCreateInput) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.post("/api/albums", data, AlbumSchema);

        // Album will be added to store via WebSocket handler
        // The store callback will handle navigation on isOwnOrigin

        setIsLoading(false);
        return response;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create album";
        setError(message);
        setIsLoading(false);
        throw err;
      }
    },
    [],
  );

  return {
    createAlbum,
    isLoading,
    error,
  };
}
