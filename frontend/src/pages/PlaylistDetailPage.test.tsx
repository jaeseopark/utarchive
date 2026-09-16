import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PlaylistDetailPage from "./PlaylistDetailPage";
import { usePlaylistsStore, type PlaylistsState, type PlaylistDetail } from "../stores/usePlaylistsStore";
import { toBrandId, type PlaylistId, type SongId } from "types";

vi.mock("../stores/usePlaylistsStore", () => ({
  usePlaylistsStore: vi.fn(),
}));

vi.mock("../components/SongSelector", () => ({
  useSongSelectorModal: ({
    onSongsSelected,
  }: {
    onSongsSelected: (songIds: string[]) => void;
  }) => ({
    open: () => onSongsSelected(["song-1", "song-2"]),
    Component: null,
  }),
}));

const mockedUsePlaylistsStore = vi.mocked(usePlaylistsStore);

describe("PlaylistDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders playlist detail and handles rename UI", async () => {
    const playlistId = toBrandId<PlaylistId>("1");
    const updatePlaylist = vi.fn();

    const mockPlaylist: PlaylistDetail = {
      id: playlistId,
      name: "Favorites",
      createdAt: new Date().toISOString(),
      songs: [],
    };

    mockedUsePlaylistsStore.mockImplementation((selector) => {
      const playlistDetailsRecord: Record<string, PlaylistDetail> = {
        "1": mockPlaylist,
      };

      const state: PlaylistsState = {
        playlistDetails: playlistDetailsRecord,
        playlists: [],
        playlistDetailsMap: new Map(),
        songCounts: {},
        isLoading: false,
        error: null,
        fetchPlaylistDetail: vi.fn(),
        fetchPlaylists: vi.fn(),
        createPlaylist: vi.fn(),
        updatePlaylist,
        deletePlaylist: vi.fn(),
        addSongsToPlaylist: vi.fn(),
        removeSongFromPlaylist: vi.fn(),
        addPlaylist: vi.fn(),
        updatePlaylistFromRemote: vi.fn(),
        removePlaylistFromRemote: vi.fn(),
        getPlaylistDetail: vi.fn(() => mockPlaylist),
        setLoading: vi.fn(),
        setError: vi.fn(),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        getListeners: vi.fn(),
      };
      return selector(state);
    });

    render(
      <MemoryRouter initialEntries={["/playlists/1"]}>
        <Routes>
          <Route path="/playlists/:id" element={<PlaylistDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText(/favorites/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /rename/i }));
    await waitFor(() => expect(screen.getByRole("textbox")).toBeInTheDocument());
  });

  it("adds songs in a single bulk request when the selector confirms selections", async () => {
    const playlistId = toBrandId<PlaylistId>("1");
    const addSongsToPlaylist = vi.fn();

    const mockPlaylist: PlaylistDetail = {
      id: playlistId,
      name: "Favorites",
      createdAt: new Date().toISOString(),
      songs: [],
    };

    mockedUsePlaylistsStore.mockImplementation((selector) => {
      const playlistDetailsRecord: Record<string, PlaylistDetail> = {
        "1": mockPlaylist,
      };

      const state: PlaylistsState = {
        playlistDetails: playlistDetailsRecord,
        playlists: [],
        playlistDetailsMap: new Map(),
        songCounts: {},
        isLoading: false,
        error: null,
        fetchPlaylistDetail: vi.fn(),
        fetchPlaylists: vi.fn(),
        createPlaylist: vi.fn(),
        updatePlaylist: vi.fn(),
        deletePlaylist: vi.fn(),
        addSongsToPlaylist,
        removeSongFromPlaylist: vi.fn(),
        addPlaylist: vi.fn(),
        updatePlaylistFromRemote: vi.fn(),
        removePlaylistFromRemote: vi.fn(),
        getPlaylistDetail: vi.fn(() => mockPlaylist),
        setLoading: vi.fn(),
        setError: vi.fn(),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        getListeners: vi.fn(),
      };
      return selector(state);
    });

    render(
      <MemoryRouter initialEntries={["/playlists/1"]}>
        <Routes>
          <Route path="/playlists/:id" element={<PlaylistDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /add songs/i }));

    expect(addSongsToPlaylist).toHaveBeenCalledWith(
      toBrandId<PlaylistId>("1"),
      [
        toBrandId<SongId>("song-1"),
        toBrandId<SongId>("song-2"),
      ],
    );
  });

  it("renders songs and removes them with the current song identifier", async () => {
    const playlistId = toBrandId<PlaylistId>("1");
    const songId = toBrandId<SongId>("22222222-2222-2222-2222-222222222222");
    const removeSongFromPlaylist = vi.fn();

    const mockPlaylist: PlaylistDetail = {
      id: playlistId,
      name: "Favorites",
      createdAt: new Date().toISOString(),
      songs: [
        {
          song: {
            id: songId,
            title: "Second Song",
            playbackEnabled: true,
          },
        },
      ],
    };

    mockedUsePlaylistsStore.mockImplementation((selector) => {
      const playlistDetailsRecord: Record<string, PlaylistDetail> = {
        "1": mockPlaylist,
      };

      const state: PlaylistsState = {
        playlistDetails: playlistDetailsRecord,
        playlists: [],
        playlistDetailsMap: new Map(),
        songCounts: {},
        isLoading: false,
        error: null,
        fetchPlaylistDetail: vi.fn(),
        fetchPlaylists: vi.fn(),
        createPlaylist: vi.fn(),
        updatePlaylist: vi.fn(),
        deletePlaylist: vi.fn(),
        addSongsToPlaylist: vi.fn(),
        removeSongFromPlaylist,
        addPlaylist: vi.fn(),
        updatePlaylistFromRemote: vi.fn(),
        removePlaylistFromRemote: vi.fn(),
        getPlaylistDetail: vi.fn(() => mockPlaylist),
        setLoading: vi.fn(),
        setError: vi.fn(),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        getListeners: vi.fn(),
      };
      return selector(state);
    });

    render(
      <MemoryRouter initialEntries={["/playlists/1"]}>
        <Routes>
          <Route path="/playlists/:id" element={<PlaylistDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("Second Song")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /remove/i }));

    expect(removeSongFromPlaylist).toHaveBeenCalledWith(
      toBrandId<PlaylistId>("1"),
      songId,
    );
  });
});
