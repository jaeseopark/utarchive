import { useCallback } from "react";
import { api } from "../api/client";
import { useAlbumsStore } from "../stores/useAlbumsStore";
import { type AlbumId, type SongId } from "../types/brands";
import { AlbumSchema } from "../api/schemas";

/**
 * Hook to link a song to a track number in an album
 * Updates the album detail with the new association
 */
export function useUpsertAlbumSong() {
  const { updateAlbum } = useAlbumsStore();

  const linkSongToTrack = useCallback(
    async (albumId: AlbumId, songId: SongId, trackNumber: number): Promise<void> => {
      try {
        const response = await api.put(
          `/api/albums/${albumId}/songs/${songId}`,
          { trackNumber },
          AlbumSchema,
        );

        // Update store with the response
        updateAlbum(albumId, response);
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : "Failed to link song to track", {
          cause: err,
        });
      }
    },
    [updateAlbum],
  );

  return { linkSongToTrack };
}
