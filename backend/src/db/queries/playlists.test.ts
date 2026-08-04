import { describe, expect, it } from "vitest";
import { mergePlaylistSongIds } from "./playlists";

describe("mergePlaylistSongIds", () => {
  it("keeps existing songs and adds requested songs without reordering them", () => {
    expect(mergePlaylistSongIds(["song-a", "song-b"], ["song-c", "song-a"])).toEqual([
      "song-a",
      "song-b",
      "song-c",
    ]);
  });

  it("deduplicates requested ids before merging", () => {
    expect(mergePlaylistSongIds(["song-a"], ["song-b", "song-b", "song-a"])).toEqual([
      "song-a",
      "song-b",
    ]);
  });
});
