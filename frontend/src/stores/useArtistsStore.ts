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
  fetchArtistDetail: (id: string) => Promise<void>;
  getArtistDetail: (id: string) => ArtistDetail | undefined;
  addArtist: (artist: Artist) => void;
  incrementArtistSongCount: (artistId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useArtistsStore = create<ArtistsState>((set, get) => ({
  artists: [],
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
    if (get().artists.length > 0 && (now - lastFetch < CACHE_TTL)) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const artists = await api.get(
        `/api/artists?limit=50&offset=${page * 50}`,
        ArtistsResponseSchema,
      );
      set({
        artists,
        lastFetchedAt: now,
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

  addArtist: (artist: Artist) => {
    set((state) => ({
      artists: [artist, ...state.artists],
      pagination: {
        ...state.pagination,
        total: state.pagination.total + 1,
      },
    }));
  },

  incrementArtistSongCount: (artistId: string) => {
    set((state) => ({
      artists: state.artists.map((artist) =>
        artist.id === artistId
          ? { ...artist, songCount: (artist.songCount ?? 0) + 1 }
          : artist
      ),
      artistDetails: {
        ...state.artistDetails,
        [artistId]: state.artistDetails[artistId]
          ? { ...state.artistDetails[artistId], songCount: (state.artistDetails[artistId].songCount ?? 0) + 1 }
          : state.artistDetails[artistId],
      },
    }));
  },
}));
