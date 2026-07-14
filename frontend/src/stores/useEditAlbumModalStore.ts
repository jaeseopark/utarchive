import { create } from "zustand";

export interface EditAlbumModalState {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

export const useEditAlbumModalStore = create<EditAlbumModalState>((set) => ({
  isOpen: false,
  openModal: () => set({ isOpen: true }),
  closeModal: () => set({ isOpen: false }),
}));
