import { create } from "zustand";
import { z } from "zod";
import { api } from "../api/client";
import { type SongListItem } from "../api/schemas";
import { type ArtistId, type SongId, toBrandId } from "../types/brands";
import { useSongsStore } from "./useSongsStore";

const ArtistSongIdsSchema = z.object({
  songIds: z.array(z.string()),
});

// Type guard to ensure song is defined and properly typed
function isSongDefined(song?: SongListItem | null): song is SongListItem {
  return song !== undefined && song !== null;
}

export interface ArtistSongsState {
  // Data
  songIdsByArtist: Record<string, string[]>;
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
  songIdsByArtist: {},
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

    if (state.songIdsByArtist[artistId] && now - lastFetch < CACHE_TTL) {
      // Return songs from global store using cached IDs
      const songIds = state.songIdsByArtist[artistId];
      const songsStore = useSongsStore.getState();
      return songIds.map((id) => songsStore.songDetails[id]).filter(isSongDefined);
    }

    set((s) => ({
      isLoading: { ...s.isLoading, [artistId]: true },
      error: { ...s.error, [artistId]: null },
    }));

    try {
      const { songIds } = await api.get(`/api/artists/${artistId}/songs`, ArtistSongIdsSchema);

      // Store song IDs and fetch all songs from global store to ensure we have them
      const songsStore = useSongsStore.getState();

      // Get the full song details from the global store
      // The full song list is populated during the app startup, so the lookups should work.
      const songs = songIds.map((id) => songsStore.songDetails[id]).filter(isSongDefined);

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
        songIdsByArtist: {
          ...s.songIdsByArtist,
          [artistId]: songIds,
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
    const state = get();
    const songIds = state.songIdsByArtist[artistId];
    if (!songIds) {
      return undefined;
    }

    const songsStore = useSongsStore.getState();
    const songs = songIds.map((id) => songsStore.songDetails[id]).filter(isSongDefined);

    // Sort songs by released date (descending) then by title
    return songs.sort((a, b) => {
      if (a.releasedAt === b.releasedAt) {
        return a.title.localeCompare(b.title);
      }
      if (!a.releasedAt) return 1;
      if (!b.releasedAt) return -1;
      return b.releasedAt.localeCompare(a.releasedAt);
    });
  },

  updateArtistSong: (artistId: ArtistId, songId: string, updates: Partial<SongListItem>) => {
    const songsStore = useSongsStore.getState();
    songsStore.updateSong(toBrandId<SongId>(songId), updates);
  },
}));
