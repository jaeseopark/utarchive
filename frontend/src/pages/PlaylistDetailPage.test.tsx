import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PlaylistDetailPage from "./PlaylistDetailPage";
import { usePlaylistDetail } from "../hooks/usePlaylistDetail";
import { toBrandId, type PlaylistId, type SongId } from "../types/brands";

vi.mock("../hooks/usePlaylistDetail", () => ({
  usePlaylistDetail: vi.fn(),
}));

vi.mock("../components/SongSelector", () => ({
  useSongSelectorModal: ({ onSongsSelected }: { onSongsSelected: (songIds: string[]) => void }) => ({
    open: () => onSongsSelected(["song-1", "song-2"]),
    Component: null,
  }),
}));

const mockedUsePlaylistDetail = vi.mocked(usePlaylistDetail);

describe("PlaylistDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders playlist detail and handles rename UI", async () => {
    const playlistId = toBrandId<PlaylistId>("11111111-1111-1111-1111-111111111111");

    mockedUsePlaylistDetail.mockReturnValue({
      playlist: {
        id: playlistId,
        name: "Favorites",
        createdAt: new Date().toISOString(),
        songs: [],
      },
      isLoading: false,
      error: null,
      updatePlaylist: vi.fn(),
      deletePlaylist: vi.fn(),
      addSong: vi.fn(),
      removeSong: vi.fn(),
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
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("adds songs in a single bulk request when the selector confirms selections", async () => {
    const playlistId = toBrandId<PlaylistId>("11111111-1111-1111-1111-111111111111");
    const addSongs = vi.fn();

    mockedUsePlaylistDetail.mockReturnValue({
      playlist: {
        id: playlistId,
        name: "Favorites",
        createdAt: new Date().toISOString(),
        songs: [],
      },
      isLoading: false,
      error: null,
      updatePlaylist: vi.fn(),
      deletePlaylist: vi.fn(),
      addSongs,
      addSong: vi.fn(),
      removeSong: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/playlists/1"]}>
        <Routes>
          <Route path="/playlists/:id" element={<PlaylistDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /add songs/i }));

    expect(addSongs).toHaveBeenCalledWith([
      toBrandId<SongId>("song-1"),
      toBrandId<SongId>("song-2"),
    ]);
  });

  it("renders songs and removes them with the current song identifier", async () => {
    const playlistId = toBrandId<PlaylistId>("11111111-1111-1111-1111-111111111111");
    const songId = toBrandId<SongId>("22222222-2222-2222-2222-222222222222");
    const removeSong = vi.fn();

    mockedUsePlaylistDetail.mockReturnValue({
      playlist: {
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
      },
      isLoading: false,
      error: null,
      updatePlaylist: vi.fn(),
      deletePlaylist: vi.fn(),
      addSongs: vi.fn(),
      addSong: vi.fn(),
      removeSong,
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

    expect(removeSong).toHaveBeenCalledWith(songId);
  });
});
