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
    <PlaybackEnabledToggle
      songId="song-123"
      isEnabled={false}
      filePath="/path/to/audio.mp3"
    />
  );

  const button = screen.getByRole("button");
  expect(button).not.toHaveAttribute("disabled");
  expect(button).toHaveAttribute("title", "Disabled");
});

test("PlaybackEnabledToggle - renders as disabled when filePath is not provided", () => {
  render(
    <PlaybackEnabledToggle
      songId="song-123"
      isEnabled={false}
      filePath={undefined}
    />
  );

  const button = screen.getByRole("button");
  expect(button).toHaveAttribute("disabled");
  expect(button).toHaveAttribute("title", "No file attached");
});

test("PlaybackEnabledToggle - renders as disabled when filePath is null", () => {
  render(
    <PlaybackEnabledToggle
      songId="song-123"
      isEnabled={false}
      filePath={null}
    />
  );

  const button = screen.getByRole("button");
  expect(button).toHaveAttribute("disabled");
  expect(button).toHaveAttribute("title", "No file attached");
});

test("PlaybackEnabledToggle - calls API when clicked with filePath", async () => {
  const user = userEvent.setup();
  const onPlaybackEnabledChange = vi.fn();
  vi.mocked(api.patch).mockResolvedValue({} as never);

  render(
    <PlaybackEnabledToggle
      songId="song-123"
      isEnabled={false}
      filePath="/path/to/audio.mp3"
      onPlaybackEnabledChange={onPlaybackEnabledChange}
    />
  );

  const button = screen.getByRole("button");
  await user.click(button);

  expect(api.patch).toHaveBeenCalledWith(
    "/api/songs/song-123",
    { playbackEnabled: true },
    expect.anything()
  );
  expect(onPlaybackEnabledChange).toHaveBeenCalledWith("song-123", true);
});

test("PlaybackEnabledToggle - does not call API when button is disabled (no filePath)", () => {
  const onPlaybackEnabledChange = vi.fn();

  render(
    <PlaybackEnabledToggle
      songId="song-123"
      isEnabled={false}
      filePath={undefined}
      onPlaybackEnabledChange={onPlaybackEnabledChange}
    />
  );

  const button = screen.getByRole("button");
  
  // Button should be disabled when no filePath
  expect(button).toHaveAttribute("disabled");
  expect(button).toHaveAttribute("title", "No file attached");
  
  // API should not have been called
  expect(api.patch).not.toHaveBeenCalled();
});

test("PlaybackEnabledToggle - shows title changes based on state", () => {
  const { rerender } = render(
    <PlaybackEnabledToggle
      songId="song-123"
      isEnabled={false}
      filePath="/path/to/audio.mp3"
    />
  );

  let button = screen.getByRole("button");
  expect(button).toHaveAttribute("title", "Disabled");

  rerender(
    <PlaybackEnabledToggle
      songId="song-123"
      isEnabled={true}
      filePath="/path/to/audio.mp3"
    />
  );

  button = screen.getByRole("button");
  expect(button).toHaveAttribute("title", "Enabled");
});
