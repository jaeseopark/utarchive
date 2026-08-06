import { create } from "zustand";
import { z } from "zod";
import { api } from "../api/client";
import { withStoreLoadingSilent } from "../api/middleware";
import { ArtistSchema, type Artist } from "../api/schemas";
import { type ArtistId } from "../types/brands";
import { ApiError } from "../api/client";
import type { EntityEventType, EntityListener } from "../types/entityStore";

const ArtistsResponseSchema = z.object({
  artists: z.array(ArtistSchema),
});

// Helper to safely get nested object properties
function getNestedProperty(obj: unknown, path: string[]): unknown {
  let current = obj;
  for (const key of path) {
    if (typeof current !== "object" || current === null || !(key in current)) {
      return undefined;
    }
    // eslint-disable-next-line no-restricted-syntax
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

// Type guard for conflict error response
function isConflictError(body: unknown): boolean {
  if (typeof body !== "object" || body === null) {
    return false;
  }

  const songIds = getNestedProperty(body, ["error", "data", "songIds"]);
  const albumIds = getNestedProperty(body, ["error", "data", "albumIds"]);

  return Array.isArray(songIds) && Array.isArray(albumIds);
}

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

  // Event listeners
  listeners: Map<EntityEventType, Set<EntityListener<ArtistId>>>;

  // Actions
  fetchAllArtists: () => Promise<void>;
  fetchArtistDetail: (id: ArtistId) => Promise<void>;
  getArtistDetail: (id: ArtistId) => ArtistDetail | undefined;
  addArtist: (params: { item: Artist }) => void;
  updateArtist: (params: { id: ArtistId; updates: Partial<Artist> }) => void;
  removeArtist: (params: { id: ArtistId }) => void;
  deleteArtist: (id: ArtistId) => Promise<void>;
  incrementArtistSongCount: (artistId: ArtistId) => void;
  setError: (error: string | null) => void;
  // Internal methods (for detail fetches)
  setLoading: (loading: boolean) => void;
  subscribe: (options: { event: EntityEventType; callback: EntityListener<ArtistId> }) => void;
  unsubscribe: (options: { event: EntityEventType; callback: EntityListener<ArtistId> }) => void;
  getListeners: (event: EntityEventType) => Set<EntityListener<ArtistId>>;
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
  listeners: new Map<EntityEventType, Set<EntityListener<ArtistId>>>([
    ['created', new Set()],
    ['updated', new Set()],
    ['deleted', new Set()],
  ]),

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

  addArtist: ({ item: artist }) => {
    set((state) => {
      const newArtists = [artist, ...state.artists];
      return {
        artists: newArtists,
        artistMap: new Map(newArtists.map((a) => [a.id, a])),
      };
    });
    // Emit 'created' event to listeners
    const listeners = get().listeners.get('created');
    if (listeners) {
      listeners.forEach((callback) => callback(artist.id as ArtistId));
    }
  },

  updateArtist: ({ id, updates }) => {
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

  removeArtist: ({ id }) => {
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

  deleteArtist: async (id: ArtistId) => {
    try {
      const emptyResponseSchema = z.object({ ok: z.boolean() });
      await api.delete(`/api/artists/${id}`, emptyResponseSchema);
      // Store update will happen via WebSocket DATA_CHANGED message
    } catch (error) {
      let message = "Failed to delete artist";

      if (error instanceof ApiError) {
        if (error.status === 409 && isConflictError(error.body)) {
          const songIds = getNestedProperty(error.body, ["error", "data", "songIds"]);
          const albumIds = getNestedProperty(error.body, ["error", "data", "albumIds"]);

          const parts: string[] = [];
          if (Array.isArray(songIds) && songIds.length > 0) {
            parts.push(`${songIds.length} associated song(s)`);
          }
          if (Array.isArray(albumIds) && albumIds.length > 0) {
            parts.push(`${albumIds.length} associated album(s)`);
          }

          message = `Cannot delete artist: ${parts.join(" and ")}`;
        } else {
          message = error.message;
        }
      }

      set({ error: message });
      throw error;
    }
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

  subscribe: ({ event, callback }) => {
    set((state) => {
      const eventListeners = state.listeners.get(event);
      if (eventListeners) {
        eventListeners.add(callback);
      }
      return state;
    });
  },

  unsubscribe: ({ event, callback }) => {
    set((state) => {
      const eventListeners = state.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(callback);
      }
      return state;
    });
  },

  getListeners: (event) => {
    return get().listeners.get(event) || new Set();
  },

  // EntityStore interface methods (required by WebSocket handler)
  add: ({ item }: { item: Artist }) => get().addArtist({ item }),
  update: ({ id, updates }: { id: ArtistId; updates: Partial<Artist> }) => get().updateArtist({ id, updates }),
  remove: ({ id }: { id: ArtistId }) => get().removeArtist({ id }),
}));
