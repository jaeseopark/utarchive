import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { composeStory } from "@storybook/react";
import meta, { ViewMode } from "./AlbumInfoSection.stories";

const ViewModeStory = composeStory(ViewMode, meta);

test("AlbumInfoSection renders album information and edit button", () => {
  render(<ViewModeStory />);

  expect(screen.getByText("Title:")).toBeInTheDocument();
  expect(screen.getByText("Test Album")).toBeInTheDocument();
  expect(screen.getByText("Year Released:")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
});

test("AlbumInfoSection edit button enters edit mode", async () => {
  const user = userEvent.setup();
  render(<ViewModeStory />);

  const editButton = screen.getByRole("button", { name: /edit/i });
  await user.click(editButton);

  expect(screen.getByDisplayValue("Test Album")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
});
