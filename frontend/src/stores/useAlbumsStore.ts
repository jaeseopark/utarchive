import { create } from 'zustand';
import { z } from 'zod';
import { api } from '../api/client';
import { withStoreLoadingSilent } from '../api/middleware';
import { AlbumSchema, AlbumDetailSchema, type Album, type AlbumDetail } from '../api/schemas';

const AlbumsResponseSchema = z.array(AlbumSchema);

export interface AlbumsState {
  // Data
  albums: Album[];
  albumDetails: Record<string, AlbumDetail>;

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
  fetchAlbums: (page?: number) => Promise<void>;
  fetchAlbumDetail: (id: string) => Promise<void>;
  getAlbumDetail: (id: string) => AlbumDetail | undefined;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAlbumsStore = create<AlbumsState>((set, get) => ({
  albums: [],
  albumDetails: {},
  isLoading: false,
  error: null,
  pagination: {
    page: 0,
    limit: 50,
    total: 0,
  },

  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error: string | null) => set({ error }),

  fetchAlbums: async (page = 0) => {
    set({ isLoading: true, error: null });
    try {
      const albums = await api.get(
        `/api/albums?limit=50&offset=${page * 50}`,
        AlbumsResponseSchema,
      );
      set({
        albums,
        pagination: {
          page,
          limit: 50,
          total: albums.length,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch albums';
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchAlbumDetail: async (id: string) => {
    const cached = get().albumDetails[id];
    if (cached) {
      return;
    }

    const store = { setLoading: (val: boolean) => set({ isLoading: val }), setError: (err: string | null) => set({ error: err }) };
    const detail = await withStoreLoadingSilent(store, `/api/albums/${id}`, AlbumDetailSchema);

    if (detail) {
      set((state) => ({
        albumDetails: {
          ...state.albumDetails,
          [id]: detail,
        },
      }));
    }
  },

  getAlbumDetail: (id: string) => {
    return get().albumDetails[id];
  },
}));
