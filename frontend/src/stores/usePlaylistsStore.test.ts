import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client";
import { usePlaylistsStore } from "./usePlaylistsStore";
import { toBrandId, type PlaylistId, type SongId } from "types";

vi.mock("../api/client", async () => {
  const actual = await vi.importActual<typeof import("../api/client")>("../api/client");
  return {
    api: {
      ...actual.api,
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  };
});

// eslint-disable-next-line no-restricted-syntax
const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe("usePlaylistsStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePlaylistsStore.setState({
      playlists: [],
      playlistDetailsMap: new Map(),
      playlistDetails: {},
      songCounts: {},
      isLoading: false,
      error: null,
    });
  });

  it("uses the bulk patch upsert endpoint when adding songs to a playlist", async () => {
    const playlistId = toBrandId<PlaylistId>("11111111-1111-1111-1111-111111111111");
    const songIds = [
      toBrandId<SongId>("22222222-2222-2222-2222-222222222222"),
      toBrandId<SongId>("33333333-3333-3333-3333-333333333333"),
    ];

    mockedApi.patch.mockResolvedValueOnce({ playlistId, songIds });

    await usePlaylistsStore.getState().addSongsToPlaylist(playlistId, songIds);

    expect(mockedApi.patch).toHaveBeenCalledWith(
      `/api/playlists/${playlistId}/songs`,
      { songIds },
      expect.anything(),
    );
  });

  it("creates playlists without mutating the store directly", async () => {
    const playlistId = toBrandId<PlaylistId>("44444444-4444-4444-4444-444444444444");

    mockedApi.post.mockResolvedValueOnce({
      id: playlistId,
      name: "New Playlist",
      createdAt: new Date().toISOString(),
    });

    await usePlaylistsStore.getState().createPlaylist("New Playlist");

    // Verify the API was called with the correct data
    expect(mockedApi.post).toHaveBeenCalledWith(
      "/api/playlists",
      { name: "New Playlist" },
      expect.anything(),
    );
    // Store should not be mutated directly - updates come from WebSocket
    expect(usePlaylistsStore.getState().playlists).toEqual([]);
  });

  it("fires the remove request without mutating the cached detail directly", async () => {
    const playlistId = toBrandId<PlaylistId>("11111111-1111-1111-1111-111111111111");
    const songId = toBrandId<SongId>("22222222-2222-2222-2222-222222222222");

    mockedApi.delete.mockResolvedValueOnce({ ok: true });

    await usePlaylistsStore.getState().removeSongFromPlaylist(playlistId, songId);

    expect(mockedApi.delete).toHaveBeenCalledWith(
      `/api/playlists/${playlistId}/songs/${songId}`,
      expect.anything(),
    );
  });
});
