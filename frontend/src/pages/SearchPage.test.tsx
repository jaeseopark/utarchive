import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

// eslint-disable-next-line no-restricted-syntax
const mockedApi = api as unknown as { get: ReturnType<typeof vi.fn> };

describe("SearchPage", () => {
  it("renders search input and responds to form submission", async () => {
    mockedApi.get.mockResolvedValue({ songs: [], artists: [], albums: [] });

    render(
      <MemoryRouter initialEntries={["/search"]}>
        <Routes>
          <Route path="/search" element={<SearchPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText(/search songs, artists, albums/i);
    fireEvent.change(input, { target: { value: "test" } });
    fireEvent.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => expect(mockedApi.get).toHaveBeenCalled());
    expect(screen.getByText(/no results for/i)).toBeInTheDocument();
  });
});
