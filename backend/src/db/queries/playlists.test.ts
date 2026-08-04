import { describe, expect, it } from "vitest";
import { buildPlaylistSongRows, reorderPlaylistSongIds } from "./playlists";

describe("reorderPlaylistSongIds", () => {
  it("moves the requested songs to the target position and reindexes them", () => {
    expect(reorderPlaylistSongIds(["song-a", "song-b", "song-c", "song-d"], ["song-c"], 1)).toEqual([
      "song-a",
      "song-c",
      "song-b",
      "song-d",
    ]);
  });

  it("clamps the target position to the end when it exceeds the playlist length", () => {
    expect(reorderPlaylistSongIds(["song-a", "song-b", "song-c", "song-d"], ["song-a"], 10)).toEqual([
      "song-b",
      "song-c",
      "song-d",
      "song-a",
    ]);
  });

  it("deduplicates requested song ids before reinserting them", () => {
    expect(reorderPlaylistSongIds(["song-a", "song-b", "song-c", "song-d"], ["song-b", "song-b"], 1)).toEqual([
      "song-a",
      "song-b",
      "song-c",
      "song-d",
    ]);
  });

  it("inserts new song ids at the specified index", () => {
    expect(reorderPlaylistSongIds(["song-a", "song-b", "song-c"], ["song-d"], 1)).toEqual([
      "song-a",
      "song-d",
      "song-b",
      "song-c",
    ]);
  });

  it("moves existing song ids without duplicating them", () => {
    expect(reorderPlaylistSongIds(["song-a", "song-b", "song-c", "song-d"], ["song-d", "song-b", "song-b"], 2)).toEqual([
      "song-a",
      "song-c",
      "song-d",
      "song-b",
    ]);
  });

  it("builds database rows with contiguous position indexes", () => {
    const rows = buildPlaylistSongRows("playlist-1", ["song-a", "song-b", "song-c"]);

    expect(rows).toEqual([
      { playlistId: "playlist-1", songId: "song-a", position: 0 },
      { playlistId: "playlist-1", songId: "song-b", position: 1 },
      { playlistId: "playlist-1", songId: "song-c", position: 2 },
    ]);
    expect(rows.map((row) => row.position)).toEqual([0, 1, 2]);
  });
});
