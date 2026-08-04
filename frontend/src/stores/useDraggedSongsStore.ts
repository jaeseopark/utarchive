import { create } from "zustand";
import type { SongId } from "../types/brands";

interface DraggedSongsState {
  draggedSongIds: SongId[];
  setDraggedSongIds: (songIds: SongId[]) => void;
  clearDraggedSongIds: () => void;
}

export const useDraggedSongsStore = create<DraggedSongsState>((set) => ({
  draggedSongIds: [],
  setDraggedSongIds: (songIds: SongId[]) => set({ draggedSongIds: songIds }),
  clearDraggedSongIds: () => set({ draggedSongIds: [] }),
}));
