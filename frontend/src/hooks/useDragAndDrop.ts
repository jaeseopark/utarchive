import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";

export interface DragDropHandlers {
  onDragStart: (e: React.DragEvent<HTMLElement>, itemId: string) => void;
  onDragOver: (e: React.DragEvent<HTMLElement>, dropAfterItemId: string | null) => void;
  onDragLeave: (e: React.DragEvent<HTMLElement>) => void;
  onDrop: (e: React.DragEvent<HTMLElement>, dropAfterItemId: string | null) => void;
  onDragEnd: (e: React.DragEvent<HTMLElement>) => void;
  onMouseUp: (e: React.MouseEvent<HTMLElement>) => void;
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
  onReorder: (
    reorderedItems: T[],
    draggedItemId: string | null,
    dropAfterItemId: string | null,
  ) => void,
  onPreviewReorder?: (reorderedItems: T[]) => void,
  enabled: boolean = true,
): UseDragAndDropReturn {
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const draggedItemIdRef = useRef<string | null>(null);
  const pendingReorderedItemsRef = useRef<T[] | null>(null);

  const onDragStart = useCallback(
    (e: React.DragEvent<HTMLElement>, itemId: string) => {
      if (!enabled) {
        e.preventDefault();
        return;
      }

      draggedItemIdRef.current = itemId;
      pendingReorderedItemsRef.current = null;
      setDraggedItemId(itemId);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", itemId);
    },
    [enabled],
  );

  const reorderItems = useCallback(
    (activeDraggedItemId: string | null, dropAfterItemId: string | null) => {
      if (!activeDraggedItemId) {
        return null;
      }

      const draggedIndex = items.findIndex((item) => getItemId(item) === activeDraggedItemId);
      let dropIndex = items.findIndex((item) => getItemId(item) === dropAfterItemId);

      if (draggedIndex < 0) {
        return null;
      }

      if (dropAfterItemId === null) {
        dropIndex = -1;
      } else if (dropIndex < 0) {
        return null;
      }

      if (draggedIndex === dropIndex || draggedIndex === dropIndex + 1) {
        return null;
      }

      const reordered = [...items];
      const [draggedItem] = reordered.splice(draggedIndex, 1);
      const insertIndex = draggedIndex < dropIndex ? dropIndex : dropIndex + 1;
      reordered.splice(insertIndex, 0, draggedItem);
      return reordered;
    },
    [getItemId, items],
  );

  const onDragOver = useCallback(
    (e: React.DragEvent<HTMLElement>, dropAfterItemId: string | null) => {
      if (!enabled) {
        return;
      }

      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      const activeDraggedItemId = draggedItemIdRef.current;
      if (!activeDraggedItemId) {
        return;
      }

      const reordered = reorderItems(activeDraggedItemId, dropAfterItemId);
      pendingReorderedItemsRef.current = reordered;
      if (reordered && onPreviewReorder) {
        onPreviewReorder(reordered);
      }
    },
    [enabled, onPreviewReorder, reorderItems],
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

  const commitPendingReorder = useCallback((activeDraggedItemId: string | null) => {
    const reordered = pendingReorderedItemsRef.current;
    pendingReorderedItemsRef.current = null;

    if (!reordered) {
      return;
    }

    onReorder(reordered, activeDraggedItemId, null);
  }, [onReorder]);

  const clearDragState = useCallback(() => {
    draggedItemIdRef.current = null;
    setDraggedItemId(null);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLElement>, dropAfterItemId: string | null) => {
      if (!enabled) {
        e.preventDefault();
        return;
      }

      e.preventDefault();

      const activeDraggedItemId = draggedItemIdRef.current;
      if (!activeDraggedItemId) {
        clearDragState();
        return;
      }

      const reordered = reorderItems(activeDraggedItemId, dropAfterItemId);
      pendingReorderedItemsRef.current = reordered;
      clearDragState();
      if (!reordered) {
        return;
      }

      commitPendingReorder(activeDraggedItemId);
    },
    [clearDragState, commitPendingReorder, enabled, reorderItems],
  );

  const onDragEnd = useCallback(
    (e: React.DragEvent<HTMLElement>) => {
      if (!enabled) {
        return;
      }

      e.preventDefault();
      const activeDraggedItemId = draggedItemIdRef.current;
      clearDragState();
      commitPendingReorder(activeDraggedItemId);
    },
    [clearDragState, commitPendingReorder, enabled],
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleWindowMouseUp = () => {
      const activeDraggedItemId = draggedItemIdRef.current;
      clearDragState();
      commitPendingReorder(activeDraggedItemId);
    };

    window.addEventListener("mouseup", handleWindowMouseUp);

    return () => {
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [clearDragState, commitPendingReorder, enabled]);

  const onMouseUp = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!enabled) {
        return;
      }

      e.preventDefault();
      const activeDraggedItemId = draggedItemIdRef.current;
      clearDragState();
      commitPendingReorder(activeDraggedItemId);
    },
    [clearDragState, commitPendingReorder, enabled],
  );

  return {
    draggedItemId,
    handlers: {
      onDragStart,
      onDragOver,
      onDragLeave,
      onDrop,
      onDragEnd,
      onMouseUp,
    },
  };
}
