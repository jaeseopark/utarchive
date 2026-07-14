import { create } from "zustand";
import { z } from "zod";
import { api } from "../api/client";
import { withStoreLoadingSilent } from "../api/middleware";
import { toBrandId, type PlaylistId, type SongId } from "../types/brands";

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
  position: z.number().int(),
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
  createPlaylist: (name: string) => Promise<PlaylistId | null>;
  updatePlaylist: (id: PlaylistId, name: string) => Promise<void>;
  deletePlaylist: (id: PlaylistId) => Promise<void>;
  addSongToPlaylist: (playlistId: PlaylistId, songId: SongId) => Promise<void>;
  removeSongFromPlaylist: (playlistId: PlaylistId, position: number) => Promise<void>;

  // Actions - Remote Updates (WebSocket)
  addPlaylist: (playlist: Playlist) => void;
  updatePlaylistFromRemote: (id: PlaylistId, updates: Partial<Playlist>) => void;
  removePlaylistFromRemote: (id: PlaylistId) => void;

  // Actions - State
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const usePlaylistsStore = create<PlaylistsState>((set, get) => ({
  playlists: [],
  playlistDetailsMap: new Map(),
  playlistDetails: {},
  songCounts: {},
  isLoading: false,
  error: null,

  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error: string | null) => set({ error }),

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

  // Create playlist with optimistic update
  createPlaylist: async (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      set({ error: "Playlist name cannot be empty" });
      return null;
    }

    try {
      const newPlaylist = await api.post("/api/playlists", { name: trimmedName }, PlaylistSchema);

      // Optimistic update
      set((state) => ({
        playlists: [...state.playlists, newPlaylist],
        songCounts: {
          ...state.songCounts,
          [newPlaylist.id]: 0,
        },
      }));

      return newPlaylist.id;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create playlist";
      set({ error: message });
      return null;
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

      // Update both list and detail
      set((state) => {
        const newDetails = {
          ...state.playlistDetails,
          ...(state.playlistDetails[id] && {
            [id]: { ...state.playlistDetails[id], name: trimmedName },
          }),
        };
        return {
          playlists: state.playlists.map((p) => (p.id === id ? { ...p, name: trimmedName } : p)),
          playlistDetails: newDetails,
          playlistDetailsMap: new Map(Object.entries(newDetails)),
        };
      });
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

      // Remove from state
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
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete playlist";
      set({ error: message });
      throw error;
    }
  },

  // Add song to playlist
  addSongToPlaylist: async (playlistId: PlaylistId, songId: SongId) => {
    const detail = get().playlistDetails[playlistId];
    if (!detail) {
      set({ error: "Playlist not found" });
      return;
    }

    try {
      await api.post(`/api/playlists/${playlistId}/songs`, { songId }, z.any());

      // Optimistic: refetch detail to get new position
      // TODO below line is not necessary.
      await get().fetchPlaylistDetail(playlistId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add song to playlist";
      set({ error: message });
      throw error;
    }
  },

  // Remove song from playlist
  removeSongFromPlaylist: async (playlistId: PlaylistId, position: number) => {
    try {
      await api.delete(
        `/api/playlists/${playlistId}/songs/${position}`,
        z.object({ ok: z.literal(true) }),
      );

      // Update detail
      set((state) => ({
        playlistDetails: {
          ...state.playlistDetails,
          ...(state.playlistDetails[playlistId] && {
            [playlistId]: {
              ...state.playlistDetails[playlistId],
              songs: state.playlistDetails[playlistId]!.songs.filter(
                (s) => s.position !== position,
              ),
            },
          }),
        },
        songCounts: {
          ...state.songCounts,
          [playlistId]: (state.songCounts[playlistId] ?? 0) - 1,
        },
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to remove song from playlist";
      set({ error: message });
      throw error;
    }
  },

  // Remote update handlers (for WebSocket)
  addPlaylist: (playlist: Playlist) => {
    set((state) => ({
      playlists: [...state.playlists, playlist],
      songCounts: {
        ...state.songCounts,
        [playlist.id]: 0,
      },
    }));
  },

  updatePlaylistFromRemote: (id: PlaylistId, updates: Partial<Playlist>) => {
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

  removePlaylistFromRemote: (id: PlaylistId) => {
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
}));
