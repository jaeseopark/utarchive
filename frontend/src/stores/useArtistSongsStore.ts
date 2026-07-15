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
    set((s) => ({
      isLoading: { ...s.isLoading, [artistId]: true },
      error: { ...s.error, [artistId]: null },
    }));

    try {
      const { songIds } = await api.get(`/api/artists/${artistId}/songs`, ArtistSongIdsSchema);

      // Ensure songs store is fully loaded before looking up song details
      const songsStore = useSongsStore.getState();
      if (!songsStore.isLoaded) {
        console.warn(
          `Songs store not loaded when fetching artist ${artistId} songs. Waiting for songs to load...`
        );
        // In production, we should wait for the store to be ready or fetch the details ourselves
        // For now, return empty array if songs aren't loaded yet
      }

      // Get the song list items from the global store
      const songsArray = songsStore.songs;
      const songs = songIds
        .map((id) => songsArray.find((song) => song.id === id))
        .filter(isSongDefined);

      set((s) => ({
        songIdsByArtist: {
          ...s.songIdsByArtist,
          [artistId]: songIds,
        },
      }));

      return songs;
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
    // Look up songs from the main songs array (which contains SongListItem)
    const songs = songIds
      .map((id) => songsStore.songs.find((song) => song.id === id))
      .filter(isSongDefined);
    
    return songs;
  },

  updateArtistSong: (songId: string, updates: Partial<SongListItem>) => {
    const songsStore = useSongsStore.getState();
    songsStore.updateSong(toBrandId<SongId>(songId), updates);
  },
}));
