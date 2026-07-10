import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router-dom";
import PlaylistsPage from "./PlaylistsPage";
import { api } from "../api/client";

const meta: Meta<typeof PlaylistsPage> = {
  title: "Pages/PlaylistsPage",
  component: PlaylistsPage,
};

export default meta;

type Story = StoryObj<typeof PlaylistsPage>;

const createMockRouterDecorator = (response: unknown) => {
  return (Story: () => ReactNode) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-restricted-syntax
    api.get = async () => response as any;
    return (
      <MemoryRouter initialEntries={["/playlists"]}>
        <Story />
      </MemoryRouter>
    );
  };
};

export const Default: Story = {
  decorators: [
    createMockRouterDecorator([
      { id: "1", name: "Favorites", createdAt: new Date().toISOString() },
    ]),
  ],
};

export const Empty: Story = {
  decorators: [createMockRouterDecorator([])],
};
