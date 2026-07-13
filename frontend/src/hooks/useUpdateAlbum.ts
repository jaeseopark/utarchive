import { useCallback } from "react";
import { useAlbumsStore } from "../stores/useAlbumsStore";
import { api } from "../api/client";
import { AlbumDetailSchema, type AlbumCreateInput } from "../api/schemas";
import { type AlbumId } from "../types/brands";

/**
 * Hook to update an existing album and refresh the store
 */
export function useUpdateAlbum() {
  const { updateAlbum, setLoading, setError, isLoading, error } = useAlbumsStore();

  const updateAlbumData = useCallback(
    async (albumId: AlbumId, data: Partial<AlbumCreateInput>) => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.patch(`/api/albums/${albumId}`, data, AlbumDetailSchema);

        // Update album in store with both ID and updated fields
        updateAlbum(albumId, response);

        setLoading(false);
        return response;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update album";
        setError(message);
        setLoading(false);
        throw err;
      }
    },
    [updateAlbum, setLoading, setError],
  );

  return {
    updateAlbumData,
    isLoading,
    error,
  };
}
