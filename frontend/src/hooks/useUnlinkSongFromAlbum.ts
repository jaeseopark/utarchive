import { useCallback } from "react";
import { api } from "../api/client";
import { useAlbumsStore } from "../stores/useAlbumsStore";
import { type AlbumId, type SongId } from "../types/brands";
import { AlbumSchema } from "../api/schemas";

/**
 * Hook to unlink a song from an album (delete album-song association)
 * After unlinking, the original literal track info is restored
 */
export function useUnlinkSongFromAlbum() {
  const { updateAlbum } = useAlbumsStore();

  const unlinkSong = useCallback(
    async (albumId: AlbumId, songId: SongId): Promise<void> => {
      try {
        const response = await api.delete(
          `/api/albums/${albumId}/songs/${songId}`,
          AlbumSchema,
        );

        // Update store with the response
        updateAlbum(albumId, response);
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : "Failed to unlink song from album", {
          cause: err,
        });
      }
    },
    [updateAlbum],
  );

  return { unlinkSong };
}
