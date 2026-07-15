import { create } from "zustand";
import { api } from "../api/client";
import { withStoreLoadingSilent } from "../api/middleware";
import {
  SongSchema,
  SongTreeSchema,
  SongsResponseSchema,
  type Song,
  type SongTree,
  type SongListItem,
} from "../api/schemas";
import { type SongId } from "../types/brands";

export interface SongsState {
  // Data
  songs: SongListItem[];
  songDetailsMap: Map<string, Song>;
  songDetails: Record<string, Song>;

  // Loading/Error
  isLoaded: boolean;
  error: string | null;

  // Pagination
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean; // Track if there are more pages
  };

  // Actions
  fetchAllSongs: () => Promise<void>;
  fetchSongDetail: (id: SongId) => Promise<void>;
  fetchSongTree: (id: SongId) => Promise<SongTree | null>;
  getSongDetail: (id: SongId) => Song | undefined;
  addSongDetail: (song: Song) => void;
  addSong: (song: Song) => void;
  updateSong: (id: SongId, updates: Partial<Song>) => void;
  removeSong: (id: SongId) => void;
  setError: (error: string | null) => void;
  // Internal methods (for detail fetches)
  setLoading: (loading: boolean) => void;
}

export const useSongsStore = create<SongsState>((set, get) => ({
  songs: [],
  songDetailsMap: new Map(),
  songDetails: {},
  isLoaded: false,
  error: null,
  pagination: {
    page: 0,
    limit: 50,
    hasMore: false,
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setLoading: (_loading: boolean) => {
    // No-op: detail fetches are silent and don't affect isLoaded
    // isLoaded only reflects the state of fetchAllSongs
  },
  setError: (error: string | null) => set({ error }),

  fetchAllSongs: async () => {
    set({ error: null });
    try {
      const allSongs: SongListItem[] = [];
      let offset = 0;
      const limit = 100;

      // Fetch all pages
      while (true) {
        const { songs: batch } = await api.get(
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
        pagination: {
          page: 0,
          limit: 100,
          hasMore: false, // All songs are loaded
        },
        isLoaded: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch songs";
      set({ error: message, isLoaded: true });
    }
  },

  fetchSongDetail: async (id: string) => {
    const cached = get().songDetails[id];
    if (cached) {
      return;
    }

    const detail = await withStoreLoadingSilent(
      { 
        setError: (err: string | null) => set({ error: err }),
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        setLoading: (_loading: boolean) => {}, // No-op: detail fetches are silent
      },
      `/api/songs/${id}`,
      SongSchema,
    );

    if (detail) {
      set((state) => {
        const newDetails = {
          ...state.songDetails,
          [id]: detail,
        };
        return {
          songDetails: newDetails,
          songDetailsMap: new Map(Object.entries(newDetails)),
        };
      });
    }
  },

  fetchSongTree: async (id: string) => {
    // Fetch tree without caching - always returns fresh data
    const tree = await withStoreLoadingSilent(
      { 
        setError: (err: string | null) => set({ error: err }),
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        setLoading: (_loading: boolean) => {}, // No-op: detail fetches are silent
      },
      `/api/songs/${id}/tree`,
      SongTreeSchema,
    );
    return tree;
  },

  getSongDetail: (id: SongId) => {
    return get().songDetails[id];
  },

  addSongDetail: (song: Song) => {
    set((state) => {
      const newDetails = {
        ...state.songDetails,
        [song.id]: song,
      };
      return {
        songDetails: newDetails,
        songDetailsMap: new Map(Object.entries(newDetails)),
      };
    });
  },

  addSong: (song: Song) => {
    set((state) => {
      // Convert Song to SongListItem
      const songListItem: SongListItem = {
        id: song.id,
        title: song.title,
        releasedAt: song.releasedAt,
        playbackEnabled: song.playbackEnabled,
        coverArtId: song.coverArtId,
        artistIds: song.artistIds,
      };

      const newDetails = {
        ...state.songDetails,
        [song.id]: song,
      };

      return {
        songs: [songListItem, ...state.songs],
        songDetails: newDetails,
        songDetailsMap: new Map(Object.entries(newDetails)),
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
        songDetailsMap: new Map(Object.entries(updatedDetails)),
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
        songDetailsMap: new Map(Object.entries(updatedDetails)),
      };
    });
  },
}));
