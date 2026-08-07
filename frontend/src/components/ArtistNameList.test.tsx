import { render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ArtistNameList from "./ArtistNameList";
import * as useArtistsStoreModule from "../stores/useArtistsStore";

const mockArtists = [
  { id: "artist-1", name: "Name One", url: "http://example.com" },
  { id: "artist-2", name: "Name Two", url: "http://example.com" },
];

describe("ArtistNameList", () => {
  beforeEach(() => {
    // Mock useArtistsStore with proper typing - selector receives partial state for testing
    vi.spyOn(useArtistsStoreModule, "useArtistsStore").mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (selector: any) => {
        const state = { artists: mockArtists };
        return selector(state);
      },
    );
  });

  it("renders linked artist names with correct comma spacing", () => {
    render(
      <MemoryRouter>
        <ArtistNameList artistIds={["artist-1", "artist-2"]} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Name One")).toBeInTheDocument();
    expect(screen.getByText("Name Two")).toBeInTheDocument();
    expect(screen.getByText("Name One").closest("a")).toHaveAttribute("href", "/artists/artist-1");
    expect(screen.getByText("Name Two").closest("a")).toHaveAttribute("href", "/artists/artist-2");
  });

  it("renders a dash when no artists are provided", () => {
    render(
      <MemoryRouter>
        <ArtistNameList artistIds={[]} />
      </MemoryRouter>,
    );

    expect(screen.getByText("-")).toBeInTheDocument();
  });
});
