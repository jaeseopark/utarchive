import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within, waitFor } from "@storybook/test";
import { vi } from "vitest";
import { SongSelector } from "./SongSelector";
import * as useArtistsStoreModule from "../../stores/useArtistsStore";
import * as useAlbumsStoreModule from "../../stores/useAlbumsStore";
import * as useSongsStoreModule from "../../stores/useSongsStore";
import * as apiModule from "../../api/client";

// Test data
const mockArtists = [
  { id: "artist-1", name: "The Beatles", url: "http://example.com" },
  { id: "artist-2", name: "Pink Floyd", url: "http://example.com" },
];

const mockAlbums = [
  { id: "album-1", title: "Abbey Road", url: "http://example.com" },
  { id: "album-2", title: "The Wall", url: "http://example.com" },
];

const mockSongDetails = {
  "song-1": {
    id: "song-1",
    title: "Come Together",
    artistIds: ["artist-1"],
    duration: 259,
    releasedAt: "1969-09-26",
    albumIds: ["album-1"],
    playbackEnabled: true,
  },
  "song-2": {
    id: "song-2",
    title: "Another Brick in the Wall",
    artistIds: ["artist-2"],
    duration: 240,
    releasedAt: "1979-11-30",
    albumIds: ["album-2"],
    playbackEnabled: false,
  },
  "song-3": {
    id: "song-3",
    title: "Something",
    artistIds: ["artist-1"],
    duration: 183,
    releasedAt: "1969-09-26",
    albumIds: ["album-1"],
    playbackEnabled: true,
  },
};

const mockSearchResponse = {
  songs: [
    { id: "song-1" },
    { id: "song-2" },
    { id: "song-3" },
  ],
  artists: [],
  albums: [],
};

// Mock setup helpers
interface MockSetupOptions {
  apiResponse?: typeof mockSearchResponse;
  shouldFail?: boolean;
}

// Mock setup helpers
interface MockSetupOptions {
  apiResponse?: typeof mockSearchResponse;
  shouldFail?: boolean;
}

function setupMocks(overrides?: MockSetupOptions) {
  const apiResponse = overrides?.apiResponse ?? mockSearchResponse;
  const shouldFail = overrides?.shouldFail ?? false;

  // Mock useArtistsStore - returns artists list
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.spyOn(useArtistsStoreModule, "useArtistsStore").mockImplementation((selector: any) => {
    const state = { artists: mockArtists };
    return selector(state);
  });

  // Mock useAlbumsStore - returns albums list
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.spyOn(useAlbumsStoreModule, "useAlbumsStore").mockImplementation((selector: any) => {
    const state = { albums: mockAlbums };
    return selector(state);
  });

  // Mock useSongsStore - returns song details map
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.spyOn(useSongsStoreModule, "useSongsStore").mockImplementation((selector: any) => {
    const state = { songDetails: mockSongDetails };
    return selector(state);
  });

  // Mock API
  // eslint-disable-next-line no-restricted-syntax, @typescript-eslint/no-explicit-any
  const mockApiGet = vi.fn() as any;
  if (shouldFail) {
    mockApiGet.mockRejectedValue(new Error("Search failed"));
  } else {
    mockApiGet.mockResolvedValue(apiResponse);
  }

  vi.spyOn(apiModule.api, "get").mockImplementation(mockApiGet);

  return { mockApiGet };
}

// eslint-disable-next-line no-restricted-syntax
const meta = {
  title: "Components/SongSelector",
  component: SongSelector,
  parameters: {
    layout: "centered",
  },
} as Meta<typeof SongSelector>;

export default meta;
type Story = StoryObj<typeof SongSelector>;

/**
 * Initial render with empty search
 */
export const Initial: Story = {
  args: {
    onSongSelected: fn(),
  },
  beforeEach: () => {
    setupMocks();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Check title is displayed
    await expect(canvas.getByText("Search for Song")).toBeInTheDocument();

    // Check search input is present and focused
    const searchInput = canvas.getByPlaceholderText(/search songs/i);
    await expect(searchInput).toBeInTheDocument();
    await expect(searchInput).toHaveFocus();

    // Should not display any results initially
    await expect(canvas.queryByText(/come together/i)).not.toBeInTheDocument();
  },
};

/**
 * User types in search input and results appear
 */
export const SearchWithResults: Story = {
  args: {
    onSongSelected: fn(),
  },
  beforeEach: () => {
    setupMocks();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const searchInput = canvas.getByPlaceholderText(/search songs/i);

    // Type in search box
    await userEvent.type(searchInput, "come", { delay: 50 });

    // Wait for debounce (300ms) and results to appear
    await waitFor(
      () => {
        expect(canvas.getByText("Come Together")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    // Verify API was called with search query
    const { mockApiGet } = setupMocks();
    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith(
        expect.stringContaining("/api/search?q=come"),
        expect.anything(),
      );
    });

    // Check that results are displayed
    const resultTitle = canvas.getByText("Come Together");
    await expect(resultTitle).toBeInTheDocument();

    // Check metadata is displayed
    await expect(canvas.getByText("The Beatles")).toBeInTheDocument();
    await expect(canvas.getByText(/4:19/)).toBeInTheDocument();
    await expect(canvas.getByText(/playback available/i)).toBeInTheDocument();
  },
};

/**
 * User selects a song from results
 */
export const SelectSong: Story = {
  args: {
    onSongSelected: fn(),
  },
  beforeEach: () => {
    setupMocks();
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const searchInput = canvas.getByPlaceholderText(/search songs/i);

    // Type to trigger search
    await userEvent.type(searchInput, "come", { delay: 50 });

    // Wait for results
    await waitFor(
      () => {
        expect(canvas.getByText("Come Together")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    // Get all Select buttons and click the first one
    const selectButtons = canvas.getAllByRole("button", { name: /select/i });
    await expect(selectButtons.length).toBeGreaterThan(0);

    // Click the first Select button (for "Come Together")
    await userEvent.click(selectButtons[0]);

    // Verify callback was called with song ID
    if ("onSongSelected" in args) {
      await expect(args.onSongSelected).toHaveBeenCalledWith("song-1");
    }
  },
};

/**
 * Multiple results are displayed and can be distinguished
 */
export const MultipleResults: Story = {
  args: {
    onSongSelected: fn(),
  },
  beforeEach: () => {
    setupMocks();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const searchInput = canvas.getByPlaceholderText(/search songs/i);

    // Search with empty query to get all results
    await userEvent.type(searchInput, "a", { delay: 50 });

    // Wait for results
    await waitFor(
      () => {
        expect(canvas.getByText("Come Together")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    // Verify all three results are displayed
    await expect(canvas.getByText("Come Together")).toBeInTheDocument();
    await expect(canvas.getByText("Another Brick in the Wall")).toBeInTheDocument();
    await expect(canvas.getByText("Something")).toBeInTheDocument();

    // Verify they have different metadata
    await expect(canvas.getByText(/The Beatles/)).toBeInTheDocument();
    await expect(canvas.getByText(/Pink Floyd/)).toBeInTheDocument();

    // Verify playback status varies
    const playbackAvailable = canvas.getAllByText(/✓ Playback available/i);
    const noAudio = canvas.getAllByText(/✗ No audio/i);

    await expect(playbackAvailable.length).toBeGreaterThan(0);
    await expect(noAudio.length).toBeGreaterThan(0);
  },
};

/**
 * Search returns no results
 */
export const NoResults: Story = {
  args: {
    onSongSelected: fn(),
  },
  beforeEach: () => {
    setupMocks({ apiResponse: { songs: [], artists: [], albums: [] } });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const searchInput = canvas.getByPlaceholderText(/search songs/i);

    // Type search query
    await userEvent.type(searchInput, "xyz", { delay: 50 });

    // Wait for no results message
    await waitFor(
      () => {
        expect(canvas.getByText("No songs found")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    // Verify no song cards are displayed
    await expect(
      canvas.queryByRole("button", { name: /select/i }),
    ).not.toBeInTheDocument();
  },
};

/**
 * API call fails with error
 */
export const ApiError: Story = {
  args: {
    onSongSelected: fn(),
  },
  beforeEach: () => {
    setupMocks({ shouldFail: true });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const searchInput = canvas.getByPlaceholderText(/search songs/i);

    // Type search query
    await userEvent.type(searchInput, "test", { delay: 50 });

    // Wait for error message
    await waitFor(
      () => {
        expect(canvas.getByText("Search failed")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    // Error should be displayed in red box
    const errorBox = canvas.getByText("Search failed").closest("div");
    await expect(errorBox).toHaveClass("bg-red-50");

    // No results should be displayed
    await expect(
      canvas.queryByRole("button", { name: /select/i }),
    ).not.toBeInTheDocument();
  },
};

/**
 * Clearing search input resets results
 */
export const ClearSearch: Story = {
  args: {
    onSongSelected: fn(),
  },
  beforeEach: () => {
    setupMocks();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const searchInput = canvas.getByPlaceholderText(/search songs/i);

    // Search for something
    await userEvent.type(searchInput, "come", { delay: 50 });

    // Wait for results
    await waitFor(
      () => {
        expect(canvas.getByText("Come Together")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    // Verify results are visible
    await expect(canvas.getByText("Come Together")).toBeInTheDocument();

    // Clear search
    await userEvent.clear(searchInput);

    // Wait for results to disappear
    await waitFor(
      () => {
        expect(canvas.queryByText("Come Together")).not.toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    // No error or "no results" message should appear
    await expect(canvas.queryByText("No songs found")).not.toBeInTheDocument();
    await expect(canvas.queryByText("Search failed")).not.toBeInTheDocument();
  },
};

/**
 * Song metadata is properly formatted and displayed
 */
export const SongMetadataFormatting: Story = {
  args: {
    onSongSelected: fn(),
  },
  beforeEach: () => {
    setupMocks();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const searchInput = canvas.getByPlaceholderText(/search songs/i);

    // Search to get results
    await userEvent.type(searchInput, "something", { delay: 50 });

    // Wait for results
    await waitFor(
      () => {
        expect(canvas.getByText("Something")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    // Verify song title
    await expect(canvas.getByText("Something")).toBeInTheDocument();

    // Verify artist names are displayed
    await expect(canvas.getByText("The Beatles")).toBeInTheDocument();

    // Verify duration is formatted as MM:SS
    const durationElements = canvas.getAllByText(/3:03/);
    await expect(durationElements.length).toBeGreaterThan(0);

    // Verify album name is displayed
    await expect(canvas.getByText(/Album: Abbey Road/)).toBeInTheDocument();

    // Verify release date is displayed
    await expect(canvas.getByText(/Sep 26, 1969/)).toBeInTheDocument();
  },
};

/**
 * Debounce prevents excessive API calls during typing
 */
export const DebounceSearch: Story = {
  args: {
    onSongSelected: fn(),
  },
  beforeEach: () => {
    setupMocks();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const { mockApiGet } = setupMocks();
    const searchInput = canvas.getByPlaceholderText(/search songs/i);

    // Type multiple characters quickly
    await userEvent.type(searchInput, "test", { delay: 30 });

    // API should be called only once after debounce, not for each character
    await waitFor(
      () => {
        // Should be called approximately once (within reasonable range due to debounce)
        const callCount = mockApiGet.mock.calls.length;
        expect(callCount).toBeLessThan(4); // Much less than 4 characters typed
      },
      { timeout: 1000 },
    );
  },
};

/**
 * Only songs with store data are displayed (filters unresolved songs)
 */
export const FiltersUnresolvedSongs: Story = {
  args: {
    onSongSelected: fn(),
  },
  beforeEach: () => {
    // Mock with song IDs that don't have details in store
    setupMocks({
      apiResponse: {
        songs: [
          { id: "song-1" }, // exists in store
          { id: "unknown-song" }, // doesn't exist in store
        ],
        artists: [],
        albums: [],
      },
    });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const searchInput = canvas.getByPlaceholderText(/search songs/i);

    // Search
    await userEvent.type(searchInput, "test", { delay: 50 });

    // Wait for results
    await waitFor(
      () => {
        expect(canvas.getByText("Come Together")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    // Only resolved song should be displayed
    await expect(canvas.getByText("Come Together")).toBeInTheDocument();

    // Verify only one result is shown
    const selectButtons = canvas.queryAllByRole("button", { name: /select/i });
    await expect(selectButtons.length).toBe(1);
  },
};

/**
 * Song with no audio displays appropriate indicator
 */
export const NoAudioIndicator: Story = {
  args: {
    onSongSelected: fn(),
  },
  beforeEach: () => {
    setupMocks();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const searchInput = canvas.getByPlaceholderText(/search songs/i);

    // Search for song without playback
    await userEvent.type(searchInput, "brick", { delay: 50 });

    // Wait for results
    await waitFor(
      () => {
        expect(canvas.getByText("Another Brick in the Wall")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    // Verify no audio indicator is displayed
    const noAudioElements = canvas.getAllByText(/✗ No audio/i);
    await expect(noAudioElements.length).toBeGreaterThan(0);

    // Verify it's displayed in gray color
    const noAudioBadge = canvas.getByText(/✗ No audio/i).closest("div");
    await expect(noAudioBadge).toHaveClass("bg-gray-100");
  },
};
