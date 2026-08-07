import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SearchPage from "./SearchPage";
import { api } from "../api/client";

vi.mock("../api/client", async () => {
  const actual = await vi.importActual<typeof import("../api/client")>("../api/client");
  return {
    api: {
      ...actual.api,
      get: vi.fn(),
    },
  };
});

const mockedApi = vi.mocked(api);

describe("SearchPage", () => {
  it("displays message to use header search bar when no query is provided", () => {
    mockedApi.get.mockResolvedValue({ songs: [], artists: [], albums: [] });

    render(
      <MemoryRouter initialEntries={["/search"]}>
        <Routes>
          <Route path="/search" element={<SearchPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByText(/use the search bar in the header to search/i),
    ).toBeInTheDocument();
  });

  it("fetches and displays search results when query is in URL", async () => {
    mockedApi.get.mockResolvedValue({ songs: [], artists: [], albums: [] });

    render(
      <MemoryRouter initialEntries={["/search?q=test"]}>
        <Routes>
          <Route path="/search" element={<SearchPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(mockedApi.get).toHaveBeenCalled());
    expect(screen.getByText(/no results for "test"/i)).toBeInTheDocument();
  });
});
