import { expect, test, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlaybackEnabledToggle } from "./PlaybackEnabledToggle";

// Mock the API client
vi.mock("../api/client", () => ({
  api: {
    patch: vi.fn(),
  },
}));

import { api } from "../api/client";

beforeEach(() => {
  vi.clearAllMocks();
});

test("PlaybackEnabledToggle - renders as editable when filePath is provided", () => {
  render(
    <PlaybackEnabledToggle songId="song-123" initialEnabled={false} filePath="/path/to/audio.mp3" />,
  );

  const button = screen.getByRole("button");
  expect(button).not.toHaveAttribute("disabled");
  expect(button).toHaveAttribute("title", "Disabled");
});

test("PlaybackEnabledToggle - renders as disabled when filePath is not provided", () => {
  render(<PlaybackEnabledToggle songId="song-123" initialEnabled={false} filePath={undefined} />);

  const button = screen.getByRole("button");
  expect(button).toHaveAttribute("disabled");
  expect(button).toHaveAttribute("title", "No file attached");
});

test("PlaybackEnabledToggle - renders as disabled when filePath is null", () => {
  render(<PlaybackEnabledToggle songId="song-123" initialEnabled={false} filePath={null} />);

  const button = screen.getByRole("button");
  expect(button).toHaveAttribute("disabled");
  expect(button).toHaveAttribute("title", "No file attached");
});

test("PlaybackEnabledToggle - calls API when clicked with filePath", async () => {
  const user = userEvent.setup();
  vi.mocked(api.patch).mockResolvedValue({});

  render(
    <PlaybackEnabledToggle
      songId="song-123"
      initialEnabled={false}
      filePath="/path/to/audio.mp3"
    />,
  );

  const button = screen.getByRole("button");
  await user.click(button);

  expect(api.patch).toHaveBeenCalledWith(
    "/api/songs/song-123",
    { playbackEnabled: true },
    expect.anything(),
  );
});

test("PlaybackEnabledToggle - does not call API when button is disabled (no filePath)", async () => {
  vi.mocked(api.patch).mockResolvedValue({});

  render(
    <PlaybackEnabledToggle
      songId="song-123"
      initialEnabled={false}
      filePath={undefined}
    />,
  );

  const button = screen.getByRole("button");

  // Button should be disabled when no filePath
  expect(button).toHaveAttribute("disabled");
  expect(button).toHaveAttribute("title", "No file attached");

  // API should not have been called
  expect(api.patch).not.toHaveBeenCalled();
});

test("PlaybackEnabledToggle - updates when prop changes", () => {
  const { rerender } = render(
    <PlaybackEnabledToggle songId="song-123" initialEnabled={false} filePath="/path/to/audio.mp3" />,
  );

  let button = screen.getByRole("button");
  expect(button).toHaveAttribute("title", "Disabled");

  // Rerender with enabled state
  rerender(
    <PlaybackEnabledToggle songId="song-123" initialEnabled={true} filePath="/path/to/audio.mp3" />,
  );

  button = screen.getByRole("button");
  expect(button).toHaveAttribute("title", "Enabled");
});
