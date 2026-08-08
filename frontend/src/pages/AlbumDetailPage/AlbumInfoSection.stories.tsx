import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { BrowserRouter } from "react-router-dom";
import AlbumInfoSection from "./AlbumInfoSection";
import { toBrandId, type AlbumId } from "types";
import type { Album } from "../../api/schemas";

const meta: Meta<typeof AlbumInfoSection> = {
  title: "Pages/AlbumDetailPage/AlbumInfoSection",
  component: AlbumInfoSection,
  decorators: [
    (Story) => (
      <BrowserRouter>
        <Story />
      </BrowserRouter>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof AlbumInfoSection>;

const sampleAlbum: Album = {
  id: toBrandId<AlbumId>("00000000-0000-0000-0000-000000000001"),
  title: "Test Album",
  artistIds: [],
  coverArtId: null,
  yearReleased: 2024,
  trackList: [],
  urls: [],
  createdAt: "2025-01-01T00:00:00.000Z",
  tracks: [],
};

export const ViewMode: Story = {
  args: {
    album: sampleAlbum,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Title:")).toBeInTheDocument();
    await expect(canvas.getByText("Test Album")).toBeInTheDocument();
    await expect(canvas.getByText("Year Released:")).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: /edit/i })).toBeInTheDocument();
  },
};

export const EnterEditMode: Story = {
  args: {
    album: sampleAlbum,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editButton = canvas.getByRole("button", { name: /edit/i });
    await userEvent.click(editButton);
    await expect(canvas.getByLabelText("Title *")).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
  },
};
