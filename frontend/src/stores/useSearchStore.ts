import { create } from 'zustand';
import { z } from 'zod';
import { api } from '../api/client';

const SearchSongSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  artistId: z.string().nullable().optional(),
  playbackEnabled: z.boolean(),
});

const SearchArtistSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  aliases: z.array(z.string()).optional().default([]),
});

const SearchAlbumSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  artistId: z.string().uuid(),
  yearReleased: z.number().int().nullable().optional(),
});

const SearchResponseSchema = z.object({
  songs: z.array(SearchSongSchema),
  artists: z.array(SearchArtistSchema),
  albums: z.array(SearchAlbumSchema),
});

export type SearchResponse = z.infer<typeof SearchResponseSchema>;

export interface SearchState {
  query: string;
  results: SearchResponse | null;
  isLoading: boolean;
  error: string | null;
  recentSearches: string[];

  search: (query: string) => Promise<void>;
  clearResults: () => void;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  setQuery: (query: string) => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  query: '',
  results: null,
  isLoading: false,
  error: null,
  recentSearches: [],

  setQuery: (query: string) => set({ query }),

  search: async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      set({ results: null, error: null, isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const results = await api.get(`/api/search?q=${encodeURIComponent(trimmed)}`, SearchResponseSchema);
      set({ results, query: trimmed });
      get().addRecentSearch(trimmed);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Search failed';
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },

  clearResults: () => {
    set({ results: null, query: '', error: null });
  },

  addRecentSearch: (query: string) => {
    set((state) => {
      const filtered = state.recentSearches.filter((q) => q !== query);
      return {
        recentSearches: [query, ...filtered].slice(0, 10),
      };
    });
  },

  clearRecentSearches: () => {
    set({ recentSearches: [] });
  },
}));
