import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PlaylistsPage from "./PlaylistsPage";
import { api } from "../api/client";
import { usePlaylistsStore } from "../stores/usePlaylistsStore";
import { toBrandId, type PlaylistId } from "../types/brands";

vi.mock("../api/client", async () => {
  const actual = await vi.importActual<typeof import("../api/client")>("../api/client");
  return {
    api: {
      ...actual.api,
      get: vi.fn(),
      post: vi.fn(),
    },
  };
});

// eslint-disable-next-line no-restricted-syntax
const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

describe("PlaylistsPage", () => {
  const resetPlaylistsStore = () => {
    act(() => {
      usePlaylistsStore.setState({
        playlists: [],
        songCounts: {},
        isLoading: false,
        error: null,
      });
    });
  };

  beforeEach(() => {
    resetPlaylistsStore();
  });

  it("shows loading and then renders playlist table", async () => {
    act(() => {
      usePlaylistsStore.setState({
        playlists: [],
        songCounts: {},
        isLoading: true,
        error: null,
      });
    });

    render(
      <MemoryRouter initialEntries={["/playlists"]}>
        <Routes>
          <Route path="/playlists" element={<PlaylistsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/loading playlists/i)).toBeInTheDocument();

    act(() => {
      usePlaylistsStore.setState({
        playlists: [
          {
            id: toBrandId<PlaylistId>("11111111-1111-1111-1111-111111111111"),
            name: "Favorites",
            createdAt: new Date().toISOString(),
          },
        ],
        songCounts: { "11111111-1111-1111-1111-111111111111": 0 },
        isLoading: false,
        error: null,
      });
    });

    await waitFor(() => expect(screen.getByText(/favorites/i)).toBeInTheDocument());
  });

  it("opens modal and creates a new playlist", async () => {
    act(() => {
      usePlaylistsStore.setState({
        playlists: [],
        songCounts: {},
        isLoading: false,
        error: null,
      });
    });
    mockedApi.post.mockResolvedValueOnce({
      id: "2",
      name: "New Playlist",
      createdAt: new Date().toISOString(),
    });

    render(
      <MemoryRouter initialEntries={["/playlists"]}>
        <Routes>
          <Route path="/playlists" element={<PlaylistsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /add playlist/i }));
    fireEvent.change(screen.getByPlaceholderText(/my new playlist/i), {
      target: { value: "New Playlist" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create playlist/i }));

    await waitFor(() => expect(mockedApi.post).toHaveBeenCalled());
  });
});
