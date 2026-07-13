import { create } from "zustand";

export interface AddAlbumModalState {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

export const useAddAlbumModalStore = create<AddAlbumModalState>((set) => ({
  isOpen: false,
  openModal: () => set({ isOpen: true }),
  closeModal: () => set({ isOpen: false }),
}));
