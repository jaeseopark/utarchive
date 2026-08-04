import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { CollapsibleGroup } from "./CollapsibleGroup";

const meta: Meta<typeof CollapsibleGroup> = {
  title: "UI/CollapsibleGroup",
  component: CollapsibleGroup,
};

export default meta;

type Story = StoryObj<typeof CollapsibleGroup>;

export const Default: Story = {
  args: {
    title: "Playlists",
    defaultOpen: true,
    children: (
      <div>
        <a href="/playlists" className="block rounded-2xl px-3 py-2 text-sm text-slate-700">
          All Playlists
        </a>
        <a href="/playlists/1" className="block rounded-2xl px-3 py-2 text-sm text-slate-700">
          Favorites
        </a>
      </div>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText(/all playlists/i)).toBeInTheDocument();

    await userEvent.click(canvas.getByRole("button", { name: /playlists/i }));
    await expect(canvas.queryByText(/all playlists/i)).not.toBeInTheDocument();

    await userEvent.click(canvas.getByRole("button", { name: /playlists/i }));
    await expect(canvas.getByText(/all playlists/i)).toBeInTheDocument();
  },
};
