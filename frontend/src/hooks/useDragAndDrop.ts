import { useCallback, useState } from "react";
import type React from "react";
import type { Song, SongListItem } from "../api/schemas";
import type { SongId } from "../types/brands";

export interface DragDropHandlers {
  onDragStart: (e: React.DragEvent<HTMLElement>, songId: SongId) => void;
  onDragOver: (e: React.DragEvent<HTMLElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLElement>) => void;
  onDrop: (e: React.DragEvent<HTMLElement>, dropAfterSongId: SongId | null) => void;
}

export interface UseDragAndDropReturn {
  draggedItemId: SongId | null;
  handlers: DragDropHandlers;
}

/**
 * Hook to manage drag-and-drop reordering for song tables.
 * Always called unconditionally to maintain React hook order.
 * The `enabled` parameter gates functionality without changing hook call pattern.
 *
 * @param items - Array of songs to reorder
 * @param onReorder - Callback when items are reordered
 * @param enabled - Whether drag-and-drop is enabled (default: true)
 */
export function useDragAndDrop(
  items: (Song | SongListItem)[],
  onReorder: (reorderedItems: (Song | SongListItem)[]) => void,
  enabled: boolean = true,
): UseDragAndDropReturn {
  const [draggedItemId, setDraggedItemId] = useState<SongId | null>(null);

  const onDragStart = useCallback(
    (e: React.DragEvent<HTMLElement>, songId: SongId) => {
      if (!enabled) {
        e.preventDefault();
        return;
      }

      setDraggedItemId(songId);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", songId);
    },
    [enabled],
  );

  const onDragOver = useCallback(
    (e: React.DragEvent<HTMLElement>) => {
      if (!enabled) {
        return;
      }

      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    },
    [enabled],
  );

  const onDragLeave = useCallback(
    (e: React.DragEvent<HTMLElement>) => {
      if (!enabled) {
        return;
      }

      // Only prevent drop if we're leaving the tbody entirely
      if (e.currentTarget === e.target) {
        e.dataTransfer.dropEffect = "none";
      }
    },
    [enabled],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLElement>, dropAfterSongId: SongId | null) => {
      if (!enabled) {
        e.preventDefault();
        return;
      }

      e.preventDefault();
      setDraggedItemId(null);

      // Find indices
      const draggedIndex = items.findIndex((item) => item.id === draggedItemId);
      let dropIndex = items.findIndex((item) => item.id === dropAfterSongId);

      if (draggedIndex < 0) {
        return;
      }

      // dropAfterSongId is null means drop at the beginning
      if (dropAfterSongId === null) {
        dropIndex = -1;
      } else if (dropIndex < 0) {
        return;
      }

      // Don't reorder if dropped in same position
      if (draggedIndex === dropIndex || draggedIndex === dropIndex + 1) {
        return;
      }

      // Reorder array
      const reordered = [...items];
      const [draggedItem] = reordered.splice(draggedIndex, 1);

      // Insert at new position
      const insertIndex = draggedIndex < dropIndex ? dropIndex : dropIndex + 1;
      reordered.splice(insertIndex, 0, draggedItem);

      onReorder(reordered);
    },
    [enabled, items, draggedItemId, onReorder],
  );

  return {
    draggedItemId,
    handlers: {
      onDragStart,
      onDragOver,
      onDragLeave,
      onDrop,
    },
  };
}
