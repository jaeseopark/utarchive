import { create } from 'zustand';
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
  fetchAllSongs: () => Promise<void>;
  fetchSongDetail: (id: string) => Promise<void>;
  fetchSongTree: (id: string) => Promise<SongTree | null>;
  getSongDetail: (id: string) => Song | undefined;
  addSongDetail: (song: Song) => void;
  addSong: (song: Song) => void;
  updateSong: (id: string, updates: Partial<Song>) => void;
  removeSong: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useSongsStore = create<SongsState>((set, get) => ({
  songs: [],
  songDetails: {},
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

  fetchAllSongs: async () => {
    const now = Date.now();
    const lastFetch = get().lastFetchedAt;
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    if (get().songs.length > 0 && (now - lastFetch < CACHE_TTL)) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const allSongs: SongListItem[] = [];
      let offset = 0;
      const limit = 100;

      // Fetch all pages
      while (true) {
        const batch = await api.get(
          `/api/songs?limit=${limit}&offset=${offset}`,
          SongsResponseSchema,
        );

        if (batch.length === 0) break;
        allSongs.push(...batch);

        if (batch.length < limit) break;
        offset += limit;
      }

      set({
        songs: allSongs,
        lastFetchedAt: now,
        pagination: {
          page: 0,
          limit: 100,
          total: allSongs.length,
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
    // Fetch tree without caching - always returns fresh data
    const store = { setLoading: (val: boolean) => set({ isLoading: val }), setError: (err: string | null) => set({ error: err }) };
    const tree = await withStoreLoadingSilent(store, `/api/songs/${id}/tree`, SongTreeSchema);
    return tree;
  },

  getSongDetail: (id: string) => {
    return get().songDetails[id];
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
        playbackEnabled: song.playbackEnabled,
        coverArtId: song.coverArtId,
        artistIds: song.artistIds,
      };

      return {
        songs: [songListItem, ...state.songs],
        songDetails: {
          ...state.songDetails,
          [song.id]: song,
        },
        pagination: {
          ...state.pagination,
          total: state.pagination.total + 1,
        },
      };
    });
  },

  updateSong: (id: string, updates: Partial<Song>) => {
    set((state) => {
      // Update song details if cached
      const updatedDetails = { ...state.songDetails };
      if (updatedDetails[id]) {
        updatedDetails[id] = { ...updatedDetails[id], ...updates };
      }

      // Update song list item if present
      const updatedSongs = state.songs.map((song) => {
        if (song.id === id) {
          return {
            ...song,
            title: updates.title ?? song.title,
            platformId: updates.platformId ?? song.platformId,
            releasedAt: updates.releasedAt ?? song.releasedAt,
            playbackEnabled: updates.playbackEnabled ?? song.playbackEnabled,
            coverArtId: updates.coverArtId ?? song.coverArtId,
            artistIds: updates.artistIds ?? song.artistIds,
          };
        }
        return song;
      });

      return {
        songs: updatedSongs,
        songDetails: updatedDetails,
      };
    });
  },

  removeSong: (id: string) => {
    set((state) => {
      const updatedDetails = { ...state.songDetails };
      delete updatedDetails[id];

      return {
        songs: state.songs.filter((song) => song.id !== id),
        songDetails: updatedDetails,
        pagination: {
          ...state.pagination,
          total: Math.max(0, state.pagination.total - 1),
        },
      };
    });
  },
}));
