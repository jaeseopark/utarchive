import { create } from "zustand";
import { z } from "zod";
import { api } from "../api/client";
import { withStoreLoadingSilent } from "../api/middleware";
import { AlbumSchema, AlbumDetailSchema, type Album, type AlbumDetail } from "../api/schemas";
import { type AlbumId } from "../types/brands";

const AlbumsResponseSchema = z.object({
  albums: z.array(AlbumSchema),
});

export interface AlbumsState {
  // Data
  albums: Album[];
  albumDetailsMap: Map<string, AlbumDetail>;
  albumDetails: Record<string, AlbumDetail>;

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
  fetchAllAlbums: () => Promise<void>;
  fetchAlbumDetail: (id: AlbumId) => Promise<void>;
  getAlbumDetail: (id: AlbumId) => AlbumDetail | undefined;
  addAlbum: (album: Album) => void;
  updateAlbum: (id: AlbumId, updates: Partial<Album>) => void;
  removeAlbum: (id: AlbumId) => void;
  setError: (error: string | null) => void;
  // Internal methods (for detail fetches)
  setLoading: (loading: boolean) => void;
}

export const useAlbumsStore = create<AlbumsState>((set, get) => ({
  albums: [],
  albumDetailsMap: new Map(),
  albumDetails: {},
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
    // isLoaded only reflects the state of fetchAllAlbums
  },
  setError: (error: string | null) => set({ error }),

  fetchAllAlbums: async () => {
    set({ error: null });
    try {
      const allAlbums: Album[] = [];
      let offset = 0;
      const limit = 100;

      // Fetch all pages
      while (true) {
        const { albums: batch } = await api.get(
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
        pagination: {
          page: 0,
          limit: 100,
          hasMore: false,
        },
        isLoaded: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch albums";
      set({ error: message });
    }
  },

  fetchAlbumDetail: async (id: string) => {
    const cached = get().albumDetails[id];
    if (cached) {
      return;
    }

    const detail = await withStoreLoadingSilent(
      { 
        setError: (err: string | null) => set({ error: err }),
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        setLoading: (_loading: boolean) => {}, // No-op: detail fetches are silent
      },
      `/api/albums/${id}`,
      AlbumDetailSchema,
    );

    if (detail) {
      set((state) => {
        const newDetails = {
          ...state.albumDetails,
          [id]: detail,
        };
        return {
          albumDetails: newDetails,
          albumDetailsMap: new Map(Object.entries(newDetails)),
        };
      });
    }
  },

  getAlbumDetail: (id: AlbumId) => {
    return get().albumDetails[id];
  },

  addAlbum: (album: Album) => {
    set((state) => {
      const newAlbums = [album, ...state.albums];
      return {
        albums: newAlbums,
      };
    });
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
        albumDetailsMap: new Map(Object.entries(updatedDetails)),
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
        albumDetailsMap: new Map(Object.entries(updatedDetails)),
      };
    });
  },
}));
