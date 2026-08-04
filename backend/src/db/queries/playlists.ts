import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { playlists, playlistSongs, songs } from "../../db/schema";

export const mergePlaylistSongIds = (existingSongIds: string[], requestedSongIds: string[]) => {
  const uniqueRequestedSongIds = requestedSongIds.filter(
    (songId, index) => requestedSongIds.indexOf(songId) === index,
  );

  return [...new Set([...existingSongIds, ...uniqueRequestedSongIds])];
};

export const selectPlaylists = (limit: number, offset: number) =>
  db
    .select({ id: playlists.id, name: playlists.name, createdAt: playlists.createdAt })
    .from(playlists)
    .orderBy(playlists.name)
    .limit(limit)
    .offset(offset);

export const selectPlaylistById = async (playlistId: string) => {
  // This query is denormalized, but makes no meaningful difference in performance for the expected use case of a single playlist with a small number of songs.
  const rows = await db
    .select({
      id: playlists.id,
      name: playlists.name,
      createdAt: playlists.createdAt,
      songId: songs.id,
      title: songs.title,
      playbackEnabled: songs.playbackEnabled,
      filePath: songs.filePath,
    })
    .from(playlists)
    .leftJoin(playlistSongs, eq(playlistSongs.playlistId, playlists.id))
    .leftJoin(songs, eq(playlistSongs.songId, songs.id))
    .where(eq(playlists.id, playlistId));

  if (rows.length === 0) {
    return null;
  }

  const firstRow = rows[0];

  return {
    id: firstRow.id,
    name: firstRow.name,
    createdAt: firstRow.createdAt,
    songs: rows
      .filter((row) => row.songId !== null)
      .map((row) => ({
        song: {
          id: row.songId,
          title: row.title,
          playbackEnabled: row.playbackEnabled,
          filePath: row.filePath,
        },
      })),
  };
};

export const insertPlaylist = async (name: string) => {
  const rows = await db.insert(playlists).values({ name }).returning();
  return rows[0];
};

export const updatePlaylistById = async (playlistId: string, name: string) => {
  const rows = await db
    .update(playlists)
    .set({ name })
    .where(eq(playlists.id, playlistId))
    .returning();

  return rows[0] ?? null;
};

export const deletePlaylistById = async (playlistId: string) =>
  db.transaction(async (tx) => {
    await tx.delete(playlistSongs).where(eq(playlistSongs.playlistId, playlistId));

    const result = await tx.delete(playlists).where(eq(playlists.id, playlistId));
    return (result.rowCount ?? 0) > 0;
  });

export const removeSongFromPlaylist = async (playlistId: string, songId: string) =>
  db.transaction(async (tx) => {
    const existingRows = await tx
      .select({ songId: playlistSongs.songId })
      .from(playlistSongs)
      .where(and(eq(playlistSongs.playlistId, playlistId), eq(playlistSongs.songId, songId)));

    if (existingRows.length === 0) {
      return false;
    }

    await tx
      .delete(playlistSongs)
      .where(and(eq(playlistSongs.playlistId, playlistId), eq(playlistSongs.songId, songId)));

    return true;
  });

export const upsertPlaylistSongs = async (playlistId: string, songIds: string[]) =>
  db.transaction(async (tx) => {
    const [playlist] = await tx
      .select()
      .from(playlists)
      .where(eq(playlists.id, playlistId))
      .limit(1);

    if (!playlist) {
      throw new Error("PLAYLIST_NOT_FOUND");
    }

    const existingRows = await tx
      .select({ songId: playlistSongs.songId })
      .from(playlistSongs)
      .where(eq(playlistSongs.playlistId, playlistId));

    const existingSongIds = existingRows.map((row) => row.songId);

    if (songIds.length === 0) {
      throw new Error("INVALID_PLAYLIST_SONG_IDS");
    }

    const nextSongIds = mergePlaylistSongIds(existingSongIds, songIds);

    await tx.delete(playlistSongs).where(eq(playlistSongs.playlistId, playlistId));

    if (nextSongIds.length > 0) {
      const rows = nextSongIds.map((songId) => ({ playlistId, songId }));
      await tx.insert(playlistSongs).values(rows);
    }

    return { playlistId, songIds: nextSongIds };
  });

