import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "../../db";
import { playlists, playlistSongs, songs } from "../../db/schema";

export const selectPlaylists = (limit: number, offset: number) =>
  db
    .select({ id: playlists.id, name: playlists.name, createdAt: playlists.createdAt })
    .from(playlists)
    .orderBy(playlists.name)
    .limit(limit)
    .offset(offset);

export const selectPlaylistById = async (playlistId: string) => {
  const rows = await db
    .select({
      id: playlists.id,
      name: playlists.name,
      createdAt: playlists.createdAt,
      position: playlistSongs.position,
      songId: songs.id,
      title: songs.title,
      playbackEnabled: songs.playbackEnabled,
      filePath: songs.filePath,
    })
    .from(playlists)
    .leftJoin(playlistSongs, eq(playlistSongs.playlistId, playlists.id))
    .leftJoin(songs, eq(playlistSongs.songId, songs.id))
    .where(eq(playlists.id, playlistId))
    .orderBy(playlistSongs.position);

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
        position: row.position,
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

export const addSongToPlaylist = async (playlistId: string, songId: string, position?: number) =>
  db.transaction(async (tx) => {
    const [playlist] = await tx
      .select()
      .from(playlists)
      .where(eq(playlists.id, playlistId))
      .limit(1);

    if (!playlist) {
      throw new Error("PLAYLIST_NOT_FOUND");
    }

    const [song] = await tx.select().from(songs).where(eq(songs.id, songId)).limit(1);

    if (!song) {
      throw new Error("SONG_NOT_FOUND");
    }

    // Check if song already exists in playlist
    const [existingEntry] = await tx
      .select()
      .from(playlistSongs)
      .where(and(eq(playlistSongs.playlistId, playlistId), eq(playlistSongs.songId, songId)))
      .limit(1);

    if (existingEntry) {
      throw new Error("SONG_ALREADY_IN_PLAYLIST");
    }

    const countRows = await tx
      .select({ count: sql`count(*)` })
      .from(playlistSongs)
      .where(eq(playlistSongs.playlistId, playlistId))
      .limit(1);

    const currentCount = Number(countRows[0]?.count ?? 0);
    const insertPosition = position === undefined ? currentCount : position;

    if (insertPosition < 0 || insertPosition > currentCount) {
      throw new Error("INVALID_POSITION");
    }

    if (insertPosition < currentCount) {
      await tx
        .update(playlistSongs)
        .set({ position: sql`${playlistSongs.position} + 1` })
        .where(
          and(
            eq(playlistSongs.playlistId, playlistId),
            gte(playlistSongs.position, insertPosition),
          ),
        );
    }

    await tx.insert(playlistSongs).values({ playlistId, songId, position: insertPosition });

    return { playlistId, songId, position: insertPosition };
  });

export const removeSongFromPlaylist = async (playlistId: string, songId: string) =>
  db.transaction(async (tx) => {
    const existingRows = await tx
      .select({ songId: playlistSongs.songId })
      .from(playlistSongs)
      .where(and(eq(playlistSongs.playlistId, playlistId), eq(playlistSongs.songId, songId)))
      .orderBy(playlistSongs.position);

    if (existingRows.length === 0) {
      return false;
    }

    const remainingRows = await tx
      .select({ songId: playlistSongs.songId })
      .from(playlistSongs)
      .where(eq(playlistSongs.playlistId, playlistId))
      .orderBy(playlistSongs.position);

    await tx.delete(playlistSongs).where(eq(playlistSongs.playlistId, playlistId));

    const reordered = remainingRows
      .filter((row) => row.songId !== songId)
      .map((row, index) => ({
        playlistId,
        songId: row.songId,
        position: index,
      }));

    if (reordered.length > 0) {
      await tx.insert(playlistSongs).values(reordered);
    }

    return true;
  });

const arrayMultisetEquals = (a: string[], b: string[]) => {
  if (a.length !== b.length) {
    return false;
  }

  const counts = new Map<string, number>();

  for (const item of a) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }

  for (const item of b) {
    const current = counts.get(item);
    if (!current) {
      return false;
    }
    counts.set(item, current - 1);
  }

  return Array.from(counts.values()).every((value) => value === 0);
};

export const replacePlaylistSongs = async (playlistId: string, songIds: string[]) =>
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
      .where(eq(playlistSongs.playlistId, playlistId))
      .orderBy(playlistSongs.position);

    const existingSongIds = existingRows.map((row) => row.songId);

    if (!arrayMultisetEquals(existingSongIds, songIds)) {
      throw new Error("INVALID_PLAYLIST_SONG_IDS");
    }

    await tx.delete(playlistSongs).where(eq(playlistSongs.playlistId, playlistId));

    if (songIds.length > 0) {
      const rows = songIds.map((songId, index) => ({
        playlistId,
        songId,
        position: index,
      }));
      await tx.insert(playlistSongs).values(rows);
    }

    return { playlistId, songIds };
  });
