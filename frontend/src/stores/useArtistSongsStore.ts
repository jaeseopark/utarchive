import { create } from "zustand";
import { z } from "zod";
import { api } from "../api/client";
import { SongListItemSchema, type SongListItem } from "../api/schemas";
import { type ArtistId } from "../types/brands";

const ArtistSongsSchema = z.array(SongListItemSchema);

export interface ArtistSongsState {
  // Data
  songsByArtist: Record<string, SongListItem[]>;
  lastFetchedAt: Record<string, number>;

  // Loading/Error
  isLoading: Record<string, boolean>;
  error: Record<string, string | null>;

  // Actions
  fetchArtistSongs: (artistId: ArtistId) => Promise<SongListItem[]>;
  getArtistSongs: (artistId: ArtistId) => SongListItem[] | undefined;
  updateArtistSong: (artistId: ArtistId, songId: string, updates: Partial<SongListItem>) => void;
  setLoading: (artistId: ArtistId, loading: boolean) => void;
  setError: (artistId: ArtistId, error: string | null) => void;
}

export const useArtistSongsStore = create<ArtistSongsState>((set, get) => ({
  songsByArtist: {},
  lastFetchedAt: {},
  isLoading: {},
  error: {},

  setLoading: (artistId: ArtistId, loading: boolean) =>
    set((state) => ({
      isLoading: {
        ...state.isLoading,
        [artistId]: loading,
      },
    })),

  setError: (artistId: ArtistId, error: string | null) =>
    set((state) => ({
      error: {
        ...state.error,
        [artistId]: error,
      },
    })),

  fetchArtistSongs: async (artistId: ArtistId) => {
    const state = get();

    // Check if cache is still fresh (15 seconds TTL)
    const now = Date.now();
    const lastFetch = state.lastFetchedAt[artistId] ?? 0;
    const CACHE_TTL = 15 * 1000; // 15 seconds

    if (state.songsByArtist[artistId] && now - lastFetch < CACHE_TTL) {
      return state.songsByArtist[artistId];
    }

    set((s) => ({
      isLoading: { ...s.isLoading, [artistId]: true },
      error: { ...s.error, [artistId]: null },
    }));

    try {
      const songs = await api.get(`/api/artists/${artistId}/songs`, ArtistSongsSchema);

      // Sort songs by released date (descending) then by title
      const sortedSongs = [...songs].sort((a, b) => {
        if (a.releasedAt === b.releasedAt) {
          return a.title.localeCompare(b.title);
        }
        if (!a.releasedAt) return 1;
        if (!b.releasedAt) return -1;
        return b.releasedAt.localeCompare(a.releasedAt);
      });

      set((s) => ({
        songsByArtist: {
          ...s.songsByArtist,
          [artistId]: sortedSongs,
        },
        lastFetchedAt: {
          ...s.lastFetchedAt,
          [artistId]: now,
        },
      }));

      return sortedSongs;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch artist songs";
      set((s) => ({
        error: { ...s.error, [artistId]: message },
      }));
      throw err;
    } finally {
      set((s) => ({
        isLoading: { ...s.isLoading, [artistId]: false },
      }));
    }
  },

  getArtistSongs: (artistId: ArtistId) => {
    return get().songsByArtist[artistId];
  },

  updateArtistSong: (artistId: ArtistId, songId: string, updates: Partial<SongListItem>) => {
    set((state) => ({
      songsByArtist: {
        ...state.songsByArtist,
        [artistId]:
          state.songsByArtist[artistId]?.map((song) =>
            song.id === songId ? { ...song, ...updates } : song,
          ) ?? [],
      },
    }));
  },
}));
