import { create } from 'zustand';
import { z } from 'zod';
import { api } from '../api/client';
import { withStoreLoadingSilent } from '../api/middleware';
import { SongSchema, SongTreeSchema, type Song, type SongTree } from '../api/schemas';

export interface SongsState {
  // Data
  songDetails: Record<string, Song>;
  songTrees: Record<string, SongTree>;

  // Loading/Error
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchSongDetail: (id: string) => Promise<void>;
  fetchSongTree: (id: string) => Promise<void>;
  getSongDetail: (id: string) => Song | undefined;
  getSongTree: (id: string) => SongTree | undefined;
  addSongDetail: (song: Song) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useSongsStore = create<SongsState>((set, get) => ({
  songDetails: {},
  songTrees: {},
  isLoading: false,
  error: null,

  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error: string | null) => set({ error }),

  fetchSongDetail: async (id: string) => {
    const cached = get().songDetails[id];
    if (cached) {
      return;
    }

    const store = { setLoading: (val: boolean) => set({ isLoading: val }), setError: (err: string | null) => set({ error: err }) };
    const detail = await withStoreLoadingSilent(store, `/api/songs/${id}`, SongSchema);

    if (detail) {
      set((state) => ({
        songDetails: {
          ...state.songDetails,
          [id]: detail,
        },
      }));
    }
  },

  fetchSongTree: async (id: string) => {
    const cached = get().songTrees[id];
    if (cached) {
      return;
    }

    const store = { setLoading: (val: boolean) => set({ isLoading: val }), setError: (err: string | null) => set({ error: err }) };
    const tree = await withStoreLoadingSilent(store, `/api/songs/${id}/tree`, SongTreeSchema);

    if (tree) {
      set((state) => ({
        songTrees: {
          ...state.songTrees,
          [id]: tree,
        },
      }));
    }
  },

  getSongDetail: (id: string) => {
    return get().songDetails[id];
  },

  getSongTree: (id: string) => {
    return get().songTrees[id];
  },

  addSongDetail: (song: Song) => {
    set((state) => ({
      songDetails: {
        ...state.songDetails,
        [song.id]: song,
      },
    }));
  },
}));
