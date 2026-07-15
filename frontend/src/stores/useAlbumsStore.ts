import { create } from "zustand";
import { z } from "zod";
import { api } from "../api/client";
import { AlbumSchema, type Album } from "../api/schemas";
import { type AlbumId } from "../types/brands";

const AlbumsResponseSchema = z.object({
  albums: z.array(AlbumSchema),
});

export interface AlbumsState {
  // Data
  albums: Album[];
  albumsMap: Map<string, Album>;

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
  getAlbum: (id: AlbumId) => Album | undefined;
  addAlbum: (album: Album) => void;
  updateAlbum: (id: AlbumId, updates: Partial<Album>) => void;
  removeAlbum: (id: AlbumId) => void;
  setError: (error: string | null) => void;
  // Internal methods (for detail fetches)
  setLoading: (loading: boolean) => void;
}

export const useAlbumsStore = create<AlbumsState>((set, get) => ({
  albums: [],
  albumsMap: new Map(),
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
        albumsMap: new Map(allAlbums.map((a) => [a.id, a])),
        pagination: {
          page: 0,
          limit: 100,
          hasMore: false,
        },
        isLoaded: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch albums";
      set({ error: message, isLoaded: true });
    }
  },

  getAlbum: (id: AlbumId) => {
    return get().albumsMap.get(id);
  },

  addAlbum: (album: Album) => {
    set((state) => ({
      albums: [album, ...state.albums],
      albumsMap: new Map([...state.albumsMap, [album.id, album]]),
    }));
  },

  updateAlbum: (id: string, updates: Partial<Album>) => {
    set((state) => {
      // Update album in the main array
      const updatedAlbums = state.albums.map((album) => {
        if (album.id === id) {
          // eslint-disable-next-line no-restricted-syntax
          return { ...album, ...updates } as Album;
        }
        return album;
      });

      // Update the map
      const updatedAlbum = updatedAlbums.find((a) => a.id === id);
      const newMap = new Map(state.albumsMap);
      if (updatedAlbum) {
        newMap.set(id, updatedAlbum);
      }

      return {
        albums: updatedAlbums,
        albumsMap: newMap,
      };
    });
  },

  removeAlbum: (id: string) => {
    set((state) => {
      const newMap = new Map(state.albumsMap);
      newMap.delete(id);
      return {
        albums: state.albums.filter((album) => album.id !== id),
        albumsMap: newMap,
      };
    });
  },
}));
