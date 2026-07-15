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

  // Loading/Error
  isLoaded: boolean;
  error: string | null;

  // Pagination
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };

  // Actions
  fetchAllArtists: () => Promise<void>;
  fetchArtistDetail: (id: ArtistId) => Promise<void>;
  getArtistDetail: (id: ArtistId) => ArtistDetail | undefined;
  addArtist: (artist: Artist) => void;
  updateArtist: (id: ArtistId, updates: Partial<Artist>) => void;
  removeArtist: (id: ArtistId) => void;
  incrementArtistSongCount: (artistId: ArtistId) => void;
  setError: (error: string | null) => void;
  // Internal methods (for detail fetches)
  setLoading: (loading: boolean) => void;
}

export const useArtistsStore = create<ArtistsState>((set, get) => ({
  artists: [],
  artistMap: new Map(),
  artistDetails: {},
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
    // isLoaded only reflects the state of fetchAllArtists
  },
  setError: (error: string | null) => set({ error }),

  fetchAllArtists: async () => {
    set({ error: null });
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
        pagination: {
          page: 0,
          limit: 100,
          hasMore: false,
        },
        isLoaded: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch artists";
      set({ error: message, isLoaded: true });
    }
  },

  fetchArtistDetail: async (id: string) => {
    const cached = get().artistDetails[id];
    if (cached) {
      return;
    }

    const detail = await withStoreLoadingSilent(
      { 
        setError: (err: string | null) => set({ error: err }),
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        setLoading: (_loading: boolean) => {}, // No-op: detail fetches are silent
      },
      `/api/artists/${id}`,
      ArtistSchema,
    );

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
