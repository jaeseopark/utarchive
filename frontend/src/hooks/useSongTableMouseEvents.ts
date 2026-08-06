import { useState, useCallback } from "react";
import type React from "react";
import type { SongId } from "types";

interface SelectionState {
  lastClickedId: SongId | null;
}

interface MouseEventHandlers {
  handleRowClick: (e: React.MouseEvent, songId: SongId) => void;
  handleContextMenu: (e: React.MouseEvent, songId: SongId) => void;
  handleCloseContextMenu: () => void;
  contextMenuPos: { x: number; y: number } | null;
}

/**
 * Hook for managing mouse event interactions on song table rows.
 * Handles row selection, context menu positioning, and related state.
 */
export function useSongTableMouseEvents(
  selectionState: SelectionState,
  isSelected: (songId: SongId) => boolean,
  toggleSelection: (songId: SongId, isMulti: boolean) => void,
  toggleRange: (startId: SongId, endId: SongId) => void,
): MouseEventHandlers {
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  const handleRowClick = useCallback(
    (e: React.MouseEvent, songId: SongId) => {
      // Prevent selection if clicking on action buttons
      const target = e.target;
      if (target instanceof HTMLElement && target.closest("button")) {
        return;
      }

      const isMulti = e.ctrlKey || e.metaKey;
      const isRange = e.shiftKey;

      if (isRange && selectionState.lastClickedId) {
        toggleRange(selectionState.lastClickedId, songId);
      } else {
        toggleSelection(songId, isMulti);
      }
    },
    [selectionState.lastClickedId, toggleRange, toggleSelection],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, songId: SongId) => {
      e.preventDefault();

      // Select the song if not already selected
      if (!isSelected(songId)) {
        toggleSelection(songId, false);
      }

      // Show context menu at mouse position with small offset
      setContextMenuPos({
        x: e.clientX + 5,
        y: e.clientY + 5,
      });
    },
    [isSelected, toggleSelection],
  );

  const handleCloseContextMenu = useCallback(() => {
    setContextMenuPos(null);
  }, []);

  return {
    handleRowClick,
    handleContextMenu,
    handleCloseContextMenu,
    contextMenuPos,
  };
}
