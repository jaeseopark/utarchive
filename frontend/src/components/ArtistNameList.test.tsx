import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ArtistNameList from "./ArtistNameList";

describe("ArtistNameList", () => {
  it("renders linked artist names with correct comma spacing", () => {
    render(
      <MemoryRouter>
        <ArtistNameList artistIds={["artist-1", "artist-2"]} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Name One")).toBeInTheDocument();
    expect(screen.getByText("Name Two")).toBeInTheDocument();
    expect(screen.getByText(", ")).toBeInTheDocument();
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
