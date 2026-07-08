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
  fetchAlbums: (page?: number) => Promise<void>;
  fetchAllAlbums: () => Promise<void>;
  fetchAlbumDetail: (id: string) => Promise<void>;
  getAlbumDetail: (id: string) => AlbumDetail | undefined;
  addAlbum: (album: Album) => void;
  updateAlbum: (id: string, updates: Partial<Album>) => void;
  removeAlbum: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAlbumsStore = create<AlbumsState>((set, get) => ({
  albums: [],
  albumDetails: {},
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

  fetchAlbums: async (page = 0) => {
    // Check if cache is still fresh (5 minutes TTL)
    const now = Date.now();
    const lastFetch = get().lastFetchedAt;
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    if (get().albums.length > 0 && (now - lastFetch < CACHE_TTL)) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const albums = await api.get(
        `/api/albums?limit=50&offset=${page * 50}`,
        AlbumsResponseSchema,
      );
      set({
        albums,
        lastFetchedAt: now,
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

  fetchAllAlbums: async () => {
    const now = Date.now();
    const lastFetch = get().lastFetchedAt;
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    if (get().albums.length > 0 && (now - lastFetch < CACHE_TTL)) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const allAlbums: Album[] = [];
      let offset = 0;
      const limit = 100;

      // Fetch all pages
      while (true) {
        const batch = await api.get(
          `/api/albums?limit=${limit}&offset=${offset}`,
          AlbumsResponseSchema,
        );

        if (batch.length === 0) break;
        allAlbums.push(...batch);

        if (batch.length < limit) break;
        offset += limit;
      }

      set({
        albums: allAlbums,
        lastFetchedAt: now,
        pagination: {
          page: 0,
          limit: 100,
          total: allAlbums.length,
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

  addAlbum: (album: Album) => {
    set((state) => ({
      albums: [album, ...state.albums],
      pagination: {
        ...state.pagination,
        total: state.pagination.total + 1,
      },
    }));
  },

  updateAlbum: (id: string, updates: Partial<Album>) => {
    set((state) => {
      // Update album details if cached
      const updatedDetails = { ...state.albumDetails };
      if (updatedDetails[id]) {
        // eslint-disable-next-line no-restricted-syntax
        updatedDetails[id] = { ...updatedDetails[id], ...updates } as AlbumDetail;
      }

      // Update album list item if present
      const updatedAlbums = state.albums.map((album) => {
        if (album.id === id) {
          return { ...album, ...updates };
        }
        return album;
      });

      return {
        albums: updatedAlbums,
        albumDetails: updatedDetails,
      };
    });
  },

  removeAlbum: (id: string) => {
    set((state) => {
      const updatedDetails = { ...state.albumDetails };
      delete updatedDetails[id];

      return {
        albums: state.albums.filter((album) => album.id !== id),
        albumDetails: updatedDetails,
        pagination: {
          ...state.pagination,
          total: Math.max(0, state.pagination.total - 1),
        },
      };
    });
  },
}));
