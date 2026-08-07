import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import PlaylistDetailPage from "./PlaylistDetailPage";
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

const meta: Meta<typeof PlaylistDetailPage> = {
  title: "Pages/PlaylistDetailPage",
  component: PlaylistDetailPage,
};

export default meta;

type Story = StoryObj<typeof PlaylistDetailPage>;

const playlistDetail = {
  id: "1",
  name: "Favorites",
  createdAt: new Date().toISOString(),
  songs: [
    {
      song: { id: "song-1", title: "Space Anthem", playbackEnabled: true, filePath: null },
    },
    {
      song: { id: "song-2", title: "Moonlight Drive", playbackEnabled: false, filePath: null },
    },
  ],
};

const createMockRouterDecorator = (response: unknown) => {
  return (Story: () => ReactNode) => {
    vi.mocked(api.get).mockResolvedValue(response);
    return (
      <MemoryRouter initialEntries={["/playlists/1"]}>
        <Story />
      </MemoryRouter>
    );
  };
};

export const Default: Story = {
  decorators: [createMockRouterDecorator(playlistDetail)],
};

export const EmptyPlaylist: Story = {
  decorators: [createMockRouterDecorator({ ...playlistDetail, songs: [] })],
};
