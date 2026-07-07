import { create } from 'zustand';
import { z } from 'zod';
import { api } from '../api/client';
import { withStoreLoadingSilent } from '../api/middleware';
import { ArtistSchema, type Artist } from '../api/schemas';

const ArtistsResponseSchema = z.array(ArtistSchema);

export type ArtistDetail = Artist;

export interface ArtistsState {
  // Data
  artists: Artist[];
  artistDetails: Record<string, ArtistDetail>;

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
  fetchArtistDetail: (id: string) => Promise<void>;
  getArtistDetail: (id: string) => ArtistDetail | undefined;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useArtistsStore = create<ArtistsState>((set, get) => ({
  artists: [],
  artistDetails: {},
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
    set({ isLoading: true, error: null });
    try {
      const artists = await api.get(
        `/api/artists?limit=50&offset=${page * 50}`,
        ArtistsResponseSchema,
      );
      set({
        artists,
        pagination: {
          page,
          limit: 50,
          total: artists.length,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch artists';
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

    const store = { setLoading: (val: boolean) => set({ isLoading: val }), setError: (err: string | null) => set({ error: err }) };
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
}));
