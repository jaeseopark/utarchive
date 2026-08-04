import { useCallback, useRef, useState } from "react";
import type React from "react";

export interface DragDropHandlers {
  onDragStart: (e: React.DragEvent<HTMLElement>, itemId: string) => void;
  onDragOver: (e: React.DragEvent<HTMLElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLElement>) => void;
  onDrop: (e: React.DragEvent<HTMLElement>, dropAfterItemId: string | null) => void;
}

export interface UseDragAndDropReturn {
  draggedItemId: string | null;
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
export function useDragAndDrop<T extends { id: string }>(
  items: T[],
  getItemId: (item: T) => string,
  onReorder: (reorderedItems: T[]) => void,
  enabled: boolean = true,
): UseDragAndDropReturn {
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const draggedItemIdRef = useRef<string | null>(null);

  const onDragStart = useCallback(
    (e: React.DragEvent<HTMLElement>, itemId: string) => {
      if (!enabled) {
        e.preventDefault();
        return;
      }

      draggedItemIdRef.current = itemId;
      setDraggedItemId(itemId);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", itemId);
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
    (e: React.DragEvent<HTMLElement>, dropAfterItemId: string | null) => {
      if (!enabled) {
        e.preventDefault();
        return;
      }

      e.preventDefault();

      const activeDraggedItemId = draggedItemIdRef.current;
      draggedItemIdRef.current = null;
      setDraggedItemId(null);

      if (!activeDraggedItemId) {
        return;
      }

      // Find indices
      const draggedIndex = items.findIndex((item) => getItemId(item) === activeDraggedItemId);
      let dropIndex = items.findIndex((item) => getItemId(item) === dropAfterItemId);

      if (draggedIndex < 0) {
        return;
      }

      // dropAfterItemId is null means drop at the beginning
      if (dropAfterItemId === null) {
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
    [enabled, items, draggedItemId, getItemId, onReorder],
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
