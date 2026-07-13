import { useCallback } from "react";
import { useAlbumsStore } from "../stores/useAlbumsStore";
import { api } from "../api/client";
import { AlbumDetailSchema, type AlbumCreateInput } from "../api/schemas";

/**
 * Hook to create a new album and update the store
 * Also updates artist album associations when an album is added with existing artists
 */
export function useAlbumCreation() {
  const { addAlbum, setLoading, setError, isLoading, error } = useAlbumsStore();

  const createAlbum = useCallback(
    async (data: AlbumCreateInput) => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.post("/api/albums", data, AlbumDetailSchema);

        // Add album to store for immediate display
        addAlbum(response);

        setLoading(false);
        return response;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create album";
        setError(message);
        setLoading(false);
        throw err;
      }
    },
    [addAlbum, setLoading, setError],
  );

  return {
    createAlbum,
    isLoading,
    error,
  };
}
