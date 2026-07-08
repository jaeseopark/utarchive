import { create } from 'zustand';
import { z } from 'zod';
import { api } from '../api/client';
import { withStoreLoadingSilent } from '../api/middleware';
import { 
  SongSchema, 
  SongTreeSchema, 
  SongsResponseSchema,
  type Song, 
  type SongTree,
  type SongListItem 
} from '../api/schemas';

export interface SongsState {
  // Data
  songs: SongListItem[];
  songDetails: Record<string, Song>;
  songTrees: Record<string, SongTree>;
  lastFetchedAt: number;

  // Loading/Error
  isLoading: boolean;
  error: string | null;

  // Pagination
  pagination: {
    page: number;
    limit: number;
    total: number;
  };

  // Actions
  fetchSongs: (page?: number) => Promise<void>;
  fetchSongDetail: (id: string) => Promise<void>;
  fetchSongTree: (id: string) => Promise<void>;
  getSongDetail: (id: string) => Song | undefined;
  getSongTree: (id: string) => SongTree | undefined;
  addSongDetail: (song: Song) => void;
  addSong: (song: Song) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useSongsStore = create<SongsState>((set, get) => ({
  songs: [],
  songDetails: {},
  songTrees: {},
  lastFetchedAt: 0,
  isLoading: false,
  error: null,
  pagination: {
    page: 0,
    limit: 50,
    total: 0,
  },

  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error: string | null) => set({ error }),

  fetchSongs: async (page = 0) => {
    // Check if cache is still fresh (5 minutes TTL)
    const now = Date.now();
    const lastFetch = get().lastFetchedAt;
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    if (get().songs.length > 0 && (now - lastFetch < CACHE_TTL)) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const songs = await api.get(
        `/api/songs?limit=50&offset=${page * 50}`,
        SongsResponseSchema,
      );
      set({
        songs,
        lastFetchedAt: now,
        pagination: {
          page,
          limit: 50,
          total: songs.length,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch songs';
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },

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

  addSong: (song: Song) => {
    set((state) => {
      // Convert Song to SongListItem
      const songListItem: SongListItem = {
        id: song.id,
        title: song.title,
        platformId: song.platformId,
        releasedAt: song.releasedAt,
        preferred: song.preferred,
        coverArtId: song.coverArtId,
        artistIds: song.artistIds,
        artistNames: song.artistNames,
      };

      return {
        songs: [songListItem, ...state.songs],
        pagination: {
          ...state.pagination,
          total: state.pagination.total + 1,
        },
      };
    });
  },
}));
