import { eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "../../db";
import { songArtists, songs } from "../../db/schema";

export type SongCreateInput = {
  title: string;
  parentId?: string | null;
  platformId?: string | null;
  releasedAt?: string;
  url?: string | null;
  filePath?: string | null;
  coverArtId?: string | null;
  description?: string | null;
  preferred?: boolean;
  trimStart?: number | null;
  trimEnd?: number | null;
};

export type SongUpdateInput = Partial<SongCreateInput> & {
  artistIds?: string[];
};

export type SongListFilters = {
  limit: number;
  offset: number;
  artistId?: string;
  masterId?: string;
  preferred?: boolean;
};

export const selectSongById = async (id: string) => {
  const results = await db
    .select()
    .from(songs)
    .where(eq(songs.id, id))
    .limit(1);

  return results[0] ?? null;
};

const calculateEffectiveDuration = (
  duration: number | null,
  trimStart: number | null,
  trimEnd: number | null
): number | null => {
  if (duration === null || Number.isNaN(duration)) {
    return null;
  }

  if (trimStart === null || trimEnd === null) {
    return duration;
  }

  const effectiveTrimStart = Number(trimStart);
  const effectiveTrimEnd = Number(trimEnd);

  if (
    Number.isNaN(effectiveTrimStart) ||
    Number.isNaN(effectiveTrimEnd) ||
    effectiveTrimStart >= effectiveTrimEnd
  ) {
    return duration;
  }

  return Math.min(Math.max(effectiveTrimEnd - effectiveTrimStart, 0), duration);
};

export const incrementSongPlayCountIfQualified = async (
  songId: string,
  listenedSeconds: number,
  trimStart: number | null | undefined,
  trimEnd: number | null | undefined
) => {
  const song = await selectSongById(songId);

  if (!song) {
    return null;
  }

  const effectiveDuration = calculateEffectiveDuration(
    song.duration ?? null,
    trimStart ?? null,
    trimEnd ?? null
  );

  const listened = Number(listenedSeconds ?? 0);

  const shouldIncrement =
    effectiveDuration !== null &&
    effectiveDuration > 0 &&
    listened / effectiveDuration >= 0.5;

  if (!shouldIncrement) {
    return song.playCount;
  }

  const updatedRows = await db
    .update(songs)
    .set({ playCount: sql`${songs.playCount} + 1` })
    .where(eq(songs.id, songId))
    .returning();

  return updatedRows[0]?.playCount ?? song.playCount;
};

export const selectSongArtistIds = async (songId: string) => {
  const rows = await db
    .select({ artistId: songArtists.artistId })
    .from(songArtists)
    .where(eq(songArtists.songId, songId))
    .orderBy(songArtists.displayOrder);

  return rows.map((row) => row.artistId);
};

export const selectSongs = async (filters: SongListFilters) => {
  let query: any = db.select().from(songs);

  if (filters.artistId) {
    query = (query as any)
      .innerJoin(songArtists, eq(songArtists.songId, songs.id))
      .where(eq(songArtists.artistId, filters.artistId));
  }

  if (filters.masterId) {
    query = (query as any).where(eq(songs.masterId, filters.masterId));
  }

  if (filters.preferred !== undefined) {
    query = (query as any).where(eq(songs.preferred, filters.preferred));
  }

  return (query as any).orderBy(songs.title).limit(filters.limit).offset(filters.offset);
};

export const createSong = async (
  songData: SongCreateInput,
  artistIds: string[]
) => {
  const songId = randomUUID();
  let masterId = songData.parentId ? undefined : songId;

  return db.transaction(async (tx) => {
    if (songData.parentId) {
      const parentSong = await tx
        .select({ id: songs.id, masterId: songs.masterId })
        .from(songs)
        .where(eq(songs.id, songData.parentId))
        .limit(1);

      const parent = parentSong[0];

      if (!parent) {
        throw new Error("PARENT_NOT_FOUND");
      }

      masterId = parent.masterId ?? parent.id;
    }

    const insertData = {
      id: songId,
      title: songData.title,
      parentId: songData.parentId ?? null,
      masterId,
      platformId: songData.platformId ?? null,
      releasedAt: songData.releasedAt,
      url: songData.url ?? null,
      filePath: songData.filePath ?? null,
      coverArtId: songData.coverArtId ?? null,
      description: songData.description ?? null,
      preferred: songData.preferred,
      trimStart: songData.trimStart ?? null,
      trimEnd: songData.trimEnd ?? null,
    } as const;

    await tx.insert(songs).values(insertData);

    const createdRows = await tx
      .select()
      .from(songs)
      .where(eq(songs.id, songId))
      .limit(1);

    const createdSong = createdRows[0] as any;

    const artistRows = artistIds.map((artistId, index) => ({
      songId: songId,
      artistId,
      displayOrder: index,
    }));

    if (artistRows.length > 0) {
      await tx.insert(songArtists).values(artistRows);
    }

    return {
      ...createdSong,
      artistIds,
    };
  });
};

export const updateSongById = async (
  songId: string,
  updateData: SongUpdateInput
) => {
  const { artistIds, ...songFields } = updateData;

  return db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(songs)
      .where(eq(songs.id, songId))
      .limit(1);

    if (!existing[0]) {
      return null;
    }

    if (Object.keys(songFields).length > 0) {
      await tx.update(songs).set(songFields).where(eq(songs.id, songId));
    }

    if (artistIds) {
      await tx.delete(songArtists).where(eq(songArtists.songId, songId));

      const artistRows = artistIds.map((artistId, index) => ({
        songId,
        artistId,
        displayOrder: index,
      }));

      if (artistRows.length > 0) {
        await tx.insert(songArtists).values(artistRows);
      }
    }

    const [updatedSong] = await tx
      .select()
      .from(songs)
      .where(eq(songs.id, songId))
      .limit(1);

    const updatedArtistIds = await tx
      .select({ artistId: songArtists.artistId })
      .from(songArtists)
      .where(eq(songArtists.songId, songId))
      .orderBy(songArtists.displayOrder);

    return {
      ...updatedSong,
      artistIds: updatedArtistIds.map((row) => row.artistId),
    };
  });
};

export type SongTreeNode = {
  id: string;
  title: string;
  parentId: string | null;
  depth: number;
  artistIds: string[];
  coverArtId: string | null;
  preferred: boolean;
  playCount: number;
  releasedAt: string | null;
  trimStart: number | null;
  trimEnd: number | null;
};

export const selectSongTree = async (songId: string) => {
  const song = await selectSongById(songId);

  if (!song) {
    return null;
  }

  const rootId = song.masterId ?? song.id;

  const nodes = ((await db.execute(sql`
    WITH RECURSIVE tree AS (
      SELECT
        id,
        title,
        parent_id,
        cover_art_id,
        preferred,
        play_count,
        released_at,
        trim_start,
        trim_end,
        ARRAY[id] AS path,
        0 AS depth
      FROM songs
      WHERE id = ${rootId}
      UNION ALL
      SELECT
        s.id,
        s.title,
        s.parent_id,
        s.cover_art_id,
        s.preferred,
        s.play_count,
        s.released_at,
        s.trim_start,
        s.trim_end,
        tree.path || s.id,
        tree.depth + 1
      FROM songs s
      JOIN tree ON s.parent_id = tree.id
    )
    SELECT
      tree.id,
      tree.title,
      tree.parent_id AS "parentId",
      tree.depth,
      COALESCE(
        (
          SELECT array_agg(sa.artist_id ORDER BY sa.display_order)
          FROM song_artists sa
          WHERE sa.song_id = tree.id
        ),
        ARRAY[]::uuid[]
      ) AS "artistIds",
      tree.cover_art_id AS "coverArtId",
      tree.preferred,
      tree.play_count AS "playCount",
      tree.released_at AS "releasedAt",
      tree.trim_start AS "trimStart",
      tree.trim_end AS "trimEnd"
    FROM tree
    ORDER BY tree.path
  `)) as unknown) as SongTreeNode[];

  return {
    masterId: rootId,
    nodes,
  };
};
