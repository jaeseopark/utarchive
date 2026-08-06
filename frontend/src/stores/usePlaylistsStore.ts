import { create } from "zustand";
import { z } from "zod";
import type { EntityListener, EntityEventType } from "../types/entityStore";
import { api } from "../api/client";
import { withStoreLoadingSilent } from "../api/middleware";
import { toBrandId, type PlaylistId, type SongId } from "types";

// Schemas
export const PlaylistSchema = z.object({
  id: z
    .string()
    .uuid()
    .transform((val) => toBrandId<PlaylistId>(val)),
  name: z.string(),
  createdAt: z.string(),
});

export const PlaylistSongSchema = z.object({
  song: z.object({
    id: z
      .string()
      .uuid()
      .transform((val) => toBrandId<SongId>(val)),
    title: z.string(),
    playbackEnabled: z.boolean(),
    filePath: z.string().nullable().optional(),
  }),
});

export const PlaylistDetailSchema = PlaylistSchema.extend({
  songs: z.array(PlaylistSongSchema),
});

const PlaylistsResponseSchema = z.object({
  playlists: z.array(PlaylistSchema),
});

export type Playlist = z.infer<typeof PlaylistSchema>;
export type PlaylistSong = z.infer<typeof PlaylistSongSchema>;
export type PlaylistDetail = z.infer<typeof PlaylistDetailSchema>;

type PlaylistListener = EntityListener<PlaylistId>;

export interface PlaylistsState {
  // Data
  playlists: Playlist[];
  playlistDetailsMap: Map<string, PlaylistDetail>;
  playlistDetails: Record<string, PlaylistDetail>;
  songCounts: Record<string, number>;

  // Loading/Error
  isLoading: boolean;
  error: string | null;

  // Actions - Queries
  fetchPlaylists: () => Promise<void>;
  fetchPlaylistDetail: (id: PlaylistId) => Promise<void>;
  getPlaylistDetail: (id: PlaylistId) => PlaylistDetail | undefined;

  // Actions - Mutations
  createPlaylist: (name: string) => Promise<void>;
  updatePlaylist: (id: PlaylistId, name: string) => Promise<void>;
  deletePlaylist: (id: PlaylistId) => Promise<void>;
  addSongsToPlaylist: (playlistId: PlaylistId, songIds: SongId[]) => Promise<void>;
  removeSongFromPlaylist: (playlistId: PlaylistId, songId: SongId) => Promise<void>;

  // Actions - Remote Updates (WebSocket)
  addPlaylist: (params: { item: Playlist }) => void;
  updatePlaylistFromRemote: (params: { id: PlaylistId; updates: Partial<Playlist> & Partial<PlaylistDetail> }) => void;
  removePlaylistFromRemote: (params: { id: PlaylistId }) => void;

  // Actions - State
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  subscribe: (options: { event: EntityEventType; callback: EntityListener<PlaylistId> }) => void;
  unsubscribe: (options: { event: EntityEventType; callback: EntityListener<PlaylistId> }) => void;
  getListeners: (event: EntityEventType) => Set<EntityListener<PlaylistId>>;
}

const _usePlaylistsStoreBase = create<PlaylistsState>((set, get) => {
  const listeners: Record<EntityEventType, Set<PlaylistListener>> = {
    created: new Set(),
    updated: new Set(),
    deleted: new Set(),
  };

  return {
    playlists: [],
    playlistDetailsMap: new Map(),
    playlistDetails: {},
    songCounts: {},
    isLoading: false,
    error: null,

    setLoading: (loading: boolean) => set({ isLoading: loading }),
    setError: (error: string | null) => set({ error }),

    subscribe: (options: { event: EntityEventType; callback: EntityListener<PlaylistId> }) => {
      listeners[options.event].add(options.callback);
    },

    unsubscribe: (options: { event: EntityEventType; callback: EntityListener<PlaylistId> }) => {
      // Remove callback from the specified event type
      listeners[options.event].delete(options.callback);
    },

    getListeners: (event: EntityEventType) => listeners[event],

  // Fetch all playlists
  fetchPlaylists: async () => {
    set({ isLoading: true, error: null });
    try {
      const allPlaylists: Playlist[] = [];
      let offset = 0;
      const limit = 100;

      // Fetch all pages
      while (true) {
        const { playlists: batch } = await api.get(
          `/api/playlists?limit=${limit}&offset=${offset}`,
          PlaylistsResponseSchema,
        );
        if (batch.length === 0) break;
        allPlaylists.push(...batch);
        if (batch.length < limit) break;
        offset += limit;
      }

      set({ playlists: allPlaylists });

      // Fetch song counts for each playlist
      const counts: Record<string, number> = {};
      await Promise.all(
        allPlaylists.map(async (playlist) => {
          try {
            const detail = await api.get(`/api/playlists/${playlist.id}`, PlaylistDetailSchema);
            counts[playlist.id] = detail.songs.length;
            // Cache the detail while we're at it
            set((state) => ({
              playlistDetails: {
                ...state.playlistDetails,
                [playlist.id]: detail,
              },
            }));
          } catch {
            counts[playlist.id] = 0;
          }
        }),
      );
      set({ songCounts: counts });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch playlists";
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },

  // Fetch playlist detail
  fetchPlaylistDetail: async (id: PlaylistId) => {
    const cached = get().playlistDetails[id];
    if (cached) {
      return;
    }

    const store = {
      setLoading: (val: boolean) => set({ isLoading: val }),
      setError: (err: string | null) => set({ error: err }),
    };
    const detail = await withStoreLoadingSilent(
      store,
      `/api/playlists/${id}`,
      PlaylistDetailSchema,
    );

    if (detail) {
      set((state) => {
        const newDetails = {
          ...state.playlistDetails,
          [id]: detail,
        };
        return {
          playlistDetails: newDetails,
          playlistDetailsMap: new Map(Object.entries(newDetails)),
          songCounts: {
            ...state.songCounts,
            [id]: detail.songs.length,
          },
        };
      });
    }
  },

  getPlaylistDetail: (id: PlaylistId) => {
    return get().playlistDetails[id];
  },

  createPlaylist: async (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      set({ error: "Playlist name cannot be empty" });
      return;
    }

    try {
      await api.post("/api/playlists", { name: trimmedName }, PlaylistSchema);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create playlist";
      set({ error: message });
      throw error;
    }
  },

  // Update playlist
  updatePlaylist: async (id: PlaylistId, name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      set({ error: "Playlist name cannot be empty" });
      return;
    }

    try {
      await api.patch(`/api/playlists/${id}`, { name: trimmedName }, PlaylistSchema);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update playlist";
      set({ error: message });
      throw error;
    }
  },

  // Delete playlist
  deletePlaylist: async (id: PlaylistId) => {
    try {
      await api.delete(`/api/playlists/${id}`, PlaylistSchema);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete playlist";
      set({ error: message });
      throw error;
    }
  },

  // Add one or more songs to a playlist via the bulk PATCH upsert endpoint.
  addSongsToPlaylist: async (playlistId: PlaylistId, songIds: SongId[]) => {
    if (songIds.length === 0) {
      return;
    }

    try {
      await api.patch(
        `/api/playlists/${playlistId}/songs`,
        { songIds },
        z.object({
          playlistId: z.string().uuid(),
          songIds: z.array(z.string().uuid()),
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add song to playlist";
      set({ error: message });
      throw error;
    }
  },

  // Remove song from playlist.
  // The local detail cache is updated from the WebSocket DATA_CHANGED payload.
  removeSongFromPlaylist: async (playlistId: PlaylistId, songId: SongId) => {
    void api.delete(
      `/api/playlists/${playlistId}/songs/${songId}`,
      z.object({ ok: z.literal(true) }),
    );
  },

    // Remote update handlers (for WebSocket)
    addPlaylist: ({ item: playlist }) => {
      set((state) => ({
        playlists: [...state.playlists, playlist],
        songCounts: {
          ...state.songCounts,
          [playlist.id]: 0,
        },
      }));
    },

    updatePlaylistFromRemote: ({ id, updates }) => {
      set((state) => {
        const newDetails = {
          ...state.playlistDetails,
          ...(state.playlistDetails[id] && {
            [id]: { ...state.playlistDetails[id], ...updates },
          }),
        };
        return {
          playlists: state.playlists.map((p) => (p.id === id ? { ...p, ...updates } : p)),
          playlistDetails: newDetails,
          playlistDetailsMap: new Map(Object.entries(newDetails)),
        };
      });
    },

    removePlaylistFromRemote: ({ id }) => {
      set((state) => {
        const playlistDetailsRest = Object.fromEntries(
          Object.entries(state.playlistDetails).filter(([key]) => key !== id),
        );
        const songCountsRest = Object.fromEntries(
          Object.entries(state.songCounts).filter(([key]) => key !== id),
        );
        return {
          playlists: state.playlists.filter((p) => p.id !== id),
          playlistDetails: playlistDetailsRest,
          playlistDetailsMap: new Map(Object.entries(playlistDetailsRest)),
          songCounts: songCountsRest,
        };
      });
    },

    // EntityStore interface methods (required by WebSocket handler)
    add: ({ item }: { item: Playlist }) => get().addPlaylist({ item }),
    update: ({ id, updates }: { id: PlaylistId; updates: Partial<Playlist> & Partial<PlaylistDetail> }) => get().updatePlaylistFromRemote({ id, updates }),
    remove: ({ id }: { id: PlaylistId }) => get().removePlaylistFromRemote({ id }),
  };
});

/**
 * Direct export of the playlists store hook for use in components
 */
export { _usePlaylistsStoreBase as usePlaylistsStore };
