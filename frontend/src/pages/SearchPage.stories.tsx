import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
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

const meta: Meta<typeof SearchPage> = {
  title: "Pages/SearchPage",
  component: SearchPage,
};

export default meta;

type Story = StoryObj<typeof SearchPage>;

const searchResults = {
  songs: [
    { id: "550e8400-e29b-41d4-a716-446655440001" },
    { id: "550e8400-e29b-41d4-a716-446655440002" },
  ],
  artists: [{ id: "550e8400-e29b-41d4-a716-446655440003" }],
  albums: [{ id: "550e8400-e29b-41d4-a716-446655440004" }],
};

const createMockRouterDecorator = (initialEntries: string[], response: unknown) => {
  return (Story: () => ReactNode) => {
    vi.mocked(api.get).mockResolvedValue(response);
    return (
      <MemoryRouter initialEntries={initialEntries}>
        <Story />
      </MemoryRouter>
    );
  };
};

export const WithResults: Story = {
  decorators: [createMockRouterDecorator(["/search?q=space"], searchResults)],
};

export const NoResults: Story = {
  decorators: [
    createMockRouterDecorator(["/search?q=missing"], { songs: [], artists: [], albums: [] }),
  ],
};
