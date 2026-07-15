import { useCallback, useState } from "react";
import { useAlbumsStore } from "../stores/useAlbumsStore";
import { api } from "../api/client";
import { AlbumSchema, type AlbumCreateInput } from "../api/schemas";

/**
 * Hook to create a new album and update the store
 * Also updates artist album associations when an album is added with existing artists
 */
export function useAlbumCreation() {
  const { addAlbum } = useAlbumsStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAlbum = useCallback(
    async (data: AlbumCreateInput) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.post("/api/albums", data, AlbumSchema);

        // Add album to store for immediate display
        addAlbum(response);

        setIsLoading(false);
        return response;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create album";
        setError(message);
        setIsLoading(false);
        throw err;
      }
    },
    [addAlbum],
  );

  return {
    createAlbum,
    isLoading,
    error,
  };
}
