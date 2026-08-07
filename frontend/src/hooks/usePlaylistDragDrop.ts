import { useCallback, useState } from "react";
import type { DragEvent } from "react";
import { SONG_IDS_DRAG_MIME, parseDraggedSongIds } from "../lib/songDragPayload";
import { usePlaylistsStore } from "../stores/usePlaylistsStore";
import { useDraggedSongsStore } from "../stores/useDraggedSongsStore";
import { useNotifications } from "./useNotifications";
import { type PlaylistId } from "types";

export function usePlaylistDragDrop() {
  const draggedSongIds = useDraggedSongsStore((state) => state.draggedSongIds);
  const clearDraggedSongIds = useDraggedSongsStore((state) => state.clearDraggedSongIds);
  const addSongsToPlaylist = usePlaylistsStore((state) => state.addSongsToPlaylist);
  const { notifySuccess, notifyError } = useNotifications();
  const [hoveredPlaylistId, setHoveredPlaylistId] = useState<PlaylistId | undefined>(undefined);

  const handlePlaylistDragOver = useCallback(
    (event: DragEvent<HTMLElement>, playlistId: PlaylistId) => {
      if (draggedSongIds.length === 0 && !event.dataTransfer.types.includes(SONG_IDS_DRAG_MIME)) {
        return;
      }

      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      setHoveredPlaylistId(playlistId);
    },
    [draggedSongIds.length],
  );

  const handlePlaylistDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    if (event.currentTarget === event.target) {
      setHoveredPlaylistId(undefined);
    }
  }, []);

  const handlePlaylistDrop = useCallback(
    async (event: DragEvent<HTMLElement>, playlistId: PlaylistId, playlistName: string) => {
      event.preventDefault();
      setHoveredPlaylistId(undefined);

      const payload = event.dataTransfer.getData(SONG_IDS_DRAG_MIME);
      const parsedSongIds = payload ? parseDraggedSongIds(payload) : [];
      const songIdsToAdd = parsedSongIds.length > 0 ? parsedSongIds : draggedSongIds;

      if (songIdsToAdd.length === 0) {
        clearDraggedSongIds();
        return;
      }

      let successCount = 0;
      try {
        await addSongsToPlaylist(playlistId, songIdsToAdd);
        successCount = songIdsToAdd.length;
      } catch {
        // The bulk upsert failed; report the attempt as unsuccessful.
      }

      const failedCount = songIdsToAdd.length - successCount;
      if (successCount > 0) {
        const suffix = failedCount > 0 ? `, ${failedCount} failed` : "";
        notifySuccess(`Added ${successCount} song(s) to ${playlistName}${suffix}`);
      } else {
        notifyError(`Failed to add songs to ${playlistName}`);
      }

      clearDraggedSongIds();
    },
    [addSongsToPlaylist, clearDraggedSongIds, draggedSongIds, notifyError, notifySuccess],
  );

  return {
    hoveredPlaylistId,
    handlePlaylistDragOver,
    handlePlaylistDragLeave,
    handlePlaylistDrop,
  };
}
