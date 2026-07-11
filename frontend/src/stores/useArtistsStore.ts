import { create } from "zustand";
import { z } from "zod";
import { api } from "../api/client";
import { withStoreLoadingSilent } from "../api/middleware";
import { ArtistSchema, type Artist } from "../api/schemas";
import { type ArtistId } from "../types/brands";

const ArtistsResponseSchema = z.object({
  artists: z.array(ArtistSchema),
});

export type ArtistDetail = Artist;

export interface ArtistsState {
  // Data
  artists: Artist[];
  artistMap: Map<string, Artist>;
  artistDetails: Record<string, ArtistDetail>;
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
  fetchArtists: (page?: number) => Promise<void>;
  fetchAllArtists: () => Promise<void>;
  fetchArtistDetail: (id: ArtistId) => Promise<void>;
  getArtistDetail: (id: ArtistId) => ArtistDetail | undefined;
  addArtist: (artist: Artist) => void;
  updateArtist: (id: ArtistId, updates: Partial<Artist>) => void;
  removeArtist: (id: ArtistId) => void;
  incrementArtistSongCount: (artistId: ArtistId) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useArtistsStore = create<ArtistsState>((set, get) => ({
  artists: [],
  artistMap: new Map(),
  artistDetails: {},
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

  fetchArtists: async (page = 0) => {
    // Check if cache is still fresh (5 minutes TTL)
    const now = Date.now();
    const lastFetch = get().lastFetchedAt;
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    if (get().artists.length > 0 && now - lastFetch < CACHE_TTL) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const { artists } = await api.get(
        `/api/artists?limit=50&offset=${page * 50}`,
        ArtistsResponseSchema,
      );
      set({
        artists,
        artistMap: new Map(artists.map((a) => [a.id, a])),
        lastFetchedAt: now,
        pagination: {
          page,
          limit: 50,
          total: artists.length,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch artists";
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchAllArtists: async () => {
    const now = Date.now();
    const lastFetch = get().lastFetchedAt;
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    if (get().artists.length > 0 && now - lastFetch < CACHE_TTL) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const allArtists: Artist[] = [];
      let offset = 0;
      const limit = 100;

      // Fetch all pages
      while (true) {
        const { artists: batch } = await api.get(
          `/api/artists?limit=${limit}&offset=${offset}`,
          ArtistsResponseSchema,
        );

        if (batch.length === 0) break;
        allArtists.push(...batch);

        if (batch.length < limit) break;
        offset += limit;
      }

      set({
        artists: allArtists,
        artistMap: new Map(allArtists.map((a) => [a.id, a])),
        lastFetchedAt: now,
        pagination: {
          page: 0,
          limit: 100,
          total: allArtists.length,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch artists";
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchArtistDetail: async (id: string) => {
    const cached = get().artistDetails[id];
    if (cached) {
      return;
    }

    const store = {
      setLoading: (val: boolean) => set({ isLoading: val }),
      setError: (err: string | null) => set({ error: err }),
    };
    const detail = await withStoreLoadingSilent(store, `/api/artists/${id}`, ArtistSchema);

    if (detail) {
      set((state) => ({
        artistDetails: {
          ...state.artistDetails,
          [id]: detail,
        },
      }));
    }
  },

  getArtistDetail: (id: string) => {
    return get().artistDetails[id];
  },

  addArtist: (artist: Artist) => {
    set((state) => {
      const newArtists = [artist, ...state.artists];
      return {
        artists: newArtists,
        artistMap: new Map(newArtists.map((a) => [a.id, a])),
        pagination: {
          ...state.pagination,
          total: state.pagination.total + 1,
        },
      };
    });
  },

  updateArtist: (id: string, updates: Partial<Artist>) => {
    set((state) => {
      // Update artist details if cached
      const updatedDetails = { ...state.artistDetails };
      if (updatedDetails[id]) {
        updatedDetails[id] = { ...updatedDetails[id], ...updates };
      }

      // Update artist list item if present
      const updatedArtists = state.artists.map((artist) => {
        if (artist.id === id) {
          return { ...artist, ...updates };
        }
        return artist;
      });

      return {
        artists: updatedArtists,
        artistMap: new Map(updatedArtists.map((a) => [a.id, a])),
        artistDetails: updatedDetails,
      };
    });
  },

  removeArtist: (id: string) => {
    set((state) => {
      const updatedDetails = { ...state.artistDetails };
      delete updatedDetails[id];

      const filteredArtists = state.artists.filter((artist) => artist.id !== id);

      return {
        artists: filteredArtists,
        artistMap: new Map(filteredArtists.map((a) => [a.id, a])),
        artistDetails: updatedDetails,
        pagination: {
          ...state.pagination,
          total: Math.max(0, state.pagination.total - 1),
        },
      };
    });
  },

  incrementArtistSongCount: (artistId: string) => {
    set((state) => {
      const updatedArtists = state.artists.map((artist) =>
        artist.id === artistId ? { ...artist, songCount: (artist.songCount ?? 0) + 1 } : artist,
      );
      return {
        artists: updatedArtists,
        artistMap: new Map(updatedArtists.map((a) => [a.id, a])),
        artistDetails: {
          ...state.artistDetails,
          [artistId]: state.artistDetails[artistId]
            ? {
                ...state.artistDetails[artistId],
                songCount: (state.artistDetails[artistId].songCount ?? 0) + 1,
              }
            : state.artistDetails[artistId],
        },
      };
    });
  },
}));
