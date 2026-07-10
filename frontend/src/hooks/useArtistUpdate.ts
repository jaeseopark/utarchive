import { useCallback } from "react";
import { api } from "../api/client";
import { ArtistSchema, type Artist } from "../api/schemas";
import { useArtistsStore } from "../stores/useArtistsStore";
import { type ArtistId } from "../types/brands";

/**
 * Hook to update an artist via API with store integration
 */
export function useArtistUpdate() {
  const { updateArtist } = useArtistsStore();

  const updateArtistData = useCallback(
    async (artistId: ArtistId, updates: Partial<Artist>) => {
      try {
        // Filter out fields that shouldn't be sent to API
        const fieldsToUpdate = Object.fromEntries(
          Object.entries(updates).filter(
            ([key]) => !["id", "createdAt", "songCount"].includes(key),
          ),
        );

        // Make the API call
        const updatedArtist = await api.patch(
          `/api/artists/${artistId}`,
          fieldsToUpdate,
          ArtistSchema,
        );

        // Update local store
        updateArtist(artistId, updatedArtist);

        return { success: true, data: updatedArtist };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update artist";
        console.error("Artist update error:", message);
        return { success: false, error: message };
      }
    },
    [updateArtist],
  );

  return {
    updateArtistData,
  };
}
