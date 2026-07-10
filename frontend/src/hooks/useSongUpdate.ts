import { useCallback } from "react";
import { api } from "../api/client";
import { SongSchema, type Song } from "../api/schemas";
import { useSongsStore } from "../stores/useSongsStore";
import { type SongId } from "../types/brands";

/**
 * Hook to update a song via API with store integration
 */
export function useSongUpdate() {
  const { updateSong } = useSongsStore();

  const updateSongData = useCallback(
    async (songId: SongId, updates: Partial<Song>) => {
      try {
        // Filter out fields that shouldn't be sent to API
        const fieldsToUpdate = Object.fromEntries(
          Object.entries(updates).filter(
            ([key]) =>
              ![
                "id",
                "createdAt",
                "duration",
                "fileExtension",
                "fileSizeBytes",
                "fileHash",
                "masterId",
                "parentId",
              ].includes(key),
          ),
        );

        // Make the API call
        const updatedSong = await api.patch(`/api/songs/${songId}`, fieldsToUpdate, SongSchema);

        // Update local store
        updateSong(songId, updatedSong);

        return { success: true, data: updatedSong };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update song";
        console.error("Song update error:", message);
        return { success: false, error: message };
      }
    },
    [updateSong],
  );

  return {
    updateSongData,
  };
}
