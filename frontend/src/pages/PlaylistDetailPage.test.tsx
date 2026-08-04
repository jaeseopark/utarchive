import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import PlaylistDetailPage from "./PlaylistDetailPage";
import { api } from "../api/client";
import { usePlaylistDetail } from "../hooks/usePlaylistDetail";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("../api/client", async () => {
  const actual = await vi.importActual<typeof import("../api/client")>("../api/client");
  return {
    api: {
      ...actual.api,
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      post: vi.fn(),
    },
  };
});

vi.mock("../hooks/usePlaylistDetail", () => ({
  usePlaylistDetail: vi.fn(),
}));

// eslint-disable-next-line no-restricted-syntax
const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

const mockedUsePlaylistDetail = vi.mocked(usePlaylistDetail);

describe("PlaylistDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("renders playlist detail and handles rename UI", async () => {
    mockedUsePlaylistDetail.mockReturnValue({
      playlist: {
        id: "1",
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

  it("reorders songs via drag and drop", async () => {
    const playlist = {
      id: "1",
      name: "Favorites",
      createdAt: new Date().toISOString(),
      songs: [
        {
          position: 0,
          song: {
            id: "11111111-1111-1111-1111-111111111111",
            title: "First Song",
            playbackEnabled: true,
          },
        },
        {
          position: 1,
          song: {
            id: "22222222-2222-2222-2222-222222222222",
            title: "Second Song",
            playbackEnabled: true,
          },
        },
      ],
    };

    mockedUsePlaylistDetail.mockReturnValue({
      playlist,
      isLoading: false,
      error: null,
      updatePlaylist: vi.fn(),
      deletePlaylist: vi.fn(),
      addSong: vi.fn(),
      removeSong: vi.fn(),
    });

    mockedApi.put.mockResolvedValueOnce({ playlistId: "1", songIds: [] });

    render(
      <MemoryRouter initialEntries={["/playlists/1"]}>
        <Routes>
          <Route path="/playlists/:id" element={<PlaylistDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("First Song")).toBeInTheDocument());

    const firstRow = screen.getByText("First Song").closest("tr");
    const secondRow = screen.getByText("Second Song").closest("tr");

    expect(firstRow).not.toBeNull();
    expect(secondRow).not.toBeNull();

    const dataTransfer = {
      effectAllowed: "",
      dropEffect: "",
      setData: vi.fn(),
      getData: vi.fn(),
      types: ["text/plain"],
    };

    fireEvent.dragStart(firstRow!, { dataTransfer });
    fireEvent.drop(secondRow!, { dataTransfer });

    await waitFor(() => {
      expect(mockedApi.put).toHaveBeenCalledWith(
        "/api/playlists/1/songs",
        {
          songIds: [
            "22222222-2222-2222-2222-222222222222",
            "11111111-1111-1111-1111-111111111111",
          ],
        },
        expect.anything(),
      );
    });
  });
});
