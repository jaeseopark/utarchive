import { useCallback, useEffect, useRef, useState } from "react";
import type { Song, SongListItem } from "../api/schemas";
import type { SongId } from "../types/brands";

export interface SongSelectionState {
  selectedIds: Set<SongId>;
  lastClickedId: SongId | null;
  selectedCount: number;
}

export interface UseSongSelectionReturn {
  state: SongSelectionState;
  isSelected: (songId: SongId) => boolean;
  toggleSelection: (songId: SongId, isMulti?: boolean) => void;
  toggleRange: (fromId: SongId, toId: SongId) => void;
  selectAll: () => void;
  clearSelection: () => void;
}

/**
 * Hook to manage song selection state and keyboard shortcuts.
 *
 * Keyboard shortcuts:
 * - Ctrl+A / Cmd+A: Select all
 * - Ctrl+D / Cmd+D: Clear selection
 *
 * Click behaviors:
 * - Single click: Select/deselect one
 * - Shift+click: Select range from last clicked to current
 * - Ctrl/Cmd+click: Toggle individual song
 */
export function useSongSelection(songs: (Song | SongListItem)[]): UseSongSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<SongId>>(new Set());
  const [lastClickedId, setLastClickedId] = useState<SongId | null>(null);

  // Map songs by ID for quick lookup during range selection
  const songMap = useRef<Map<SongId, number>>(new Map());
  useEffect(() => {
    songMap.current.clear();
    songs.forEach((song, index) => {
      songMap.current.set(song.id, index);
    });
  }, [songs]);

  const isSelected = useCallback((songId: SongId) => selectedIds.has(songId), [selectedIds]);

  const toggleSelection = useCallback((songId: SongId, isMulti?: boolean) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);

      if (isMulti) {
        // Ctrl/Cmd+click: Toggle individual
        if (newSet.has(songId)) {
          newSet.delete(songId);
        } else {
          newSet.add(songId);
        }
      } else {
        // Single click: Replace selection
        newSet.clear();
        newSet.add(songId);
      }

      return newSet;
    });
    setLastClickedId(songId);
  }, []);

  const toggleRange = useCallback(
    (fromId: SongId, toId: SongId) => {
      const fromIndex = songMap.current.get(fromId);
      const toIndex = songMap.current.get(toId);

      if (fromIndex === undefined || toIndex === undefined) {
        return;
      }

      const startIndex = Math.min(fromIndex, toIndex);
      const endIndex = Math.max(fromIndex, toIndex);

      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        // Range-select all songs between fromIndex and toIndex (inclusive)
        songs.forEach((song, index) => {
          if (index >= startIndex && index <= endIndex) {
            // eslint-disable-next-line no-restricted-syntax
            newSet.add(song.id as SongId);
          }
        });
        return newSet;
      });
    },
    [songs],
  );

  const selectAll = useCallback(() => {
    // eslint-disable-next-line no-restricted-syntax
    const allIds = new Set(songs.map((song) => song.id as SongId));
    setSelectedIds(allIds);
    if (songs.length > 0) {
      // eslint-disable-next-line no-restricted-syntax
      setLastClickedId(songs[songs.length - 1].id as SongId);
    }
  }, [songs]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastClickedId(null);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const isCtrlOrCmd = isMac ? event.metaKey : event.ctrlKey;

      // Ctrl+A / Cmd+A: Select all
      if (isCtrlOrCmd && event.key === "a") {
        event.preventDefault();
        selectAll();
      }

      // Ctrl+D / Cmd+D: Clear selection
      if (isCtrlOrCmd && event.key === "d") {
        event.preventDefault();
        clearSelection();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectAll, clearSelection]);

  return {
    state: {
      selectedIds,
      lastClickedId,
      selectedCount: selectedIds.size,
    },
    isSelected,
    toggleSelection,
    toggleRange,
    selectAll,
    clearSelection,
  };
}
