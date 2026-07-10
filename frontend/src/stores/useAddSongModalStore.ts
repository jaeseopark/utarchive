import { create } from "zustand";

export interface AddSongModalState {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

export const useAddSongModalStore = create<AddSongModalState>((set) => ({
  isOpen: false,
  openModal: () => set({ isOpen: true }),
  closeModal: () => set({ isOpen: false }),
}));
