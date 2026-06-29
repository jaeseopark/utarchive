import { eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "../../db";
import { albums, albumSongs, artists, coverArt, songArtists, songs } from "../../db/schema";

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
  trimRange?: string | null;
  fileHash?: string | null;
  tags?: string[];
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
  const [song] = await db
    .select({
      id: songs.id,
      title: songs.title,
      parentId: songs.parentId,
      masterId: songs.masterId,
      platformId: songs.platformId,
      releasedAt: songs.releasedAt,
      url: songs.url,
      filePath: songs.filePath,
      duration: songs.duration,
      fileExtension: songs.fileExtension,
      fileSizeBytes: songs.fileSizeBytes,
      coverArtId: songs.coverArtId,
      description: songs.description,
      preferred: songs.preferred,
      trimRange: songs.trimRange,
      fileHash: songs.fileHash,
      tags: songs.tags,
      createdAt: songs.createdAt,
      artistIds: sql`
        (SELECT coalesce(array_agg(sa.artist_id ORDER BY sa.display_order), ARRAY[]::uuid[])
         FROM song_artists sa
         WHERE sa.song_id = ${songs.id})
      `,
      artistNames: sql`
        (SELECT coalesce(array_agg(a.name ORDER BY sa.display_order), ARRAY[]::text[])
         FROM song_artists sa
         JOIN artists a ON a.id = sa.artist_id
         WHERE sa.song_id = ${songs.id})
      `,
    })
    .from(songs)
    .where(eq(songs.id, id))
    .limit(1);

  return song ?? null;
};

/**
 * Parse trimRange string into start and end values.
 * Format: "start,end" where either can be omitted.
 * Examples: "30," -> { start: 30, end: null }
 *           ",45" -> { start: null, end: 45 }
 *           "30,45" -> { start: 30, end: 45 }
 */
export const parseTrimRange = (trimRange: string | null): { start: number | null; end: number | null } => {
  if (!trimRange || trimRange.trim() === "") {
    return { start: null, end: null };
  }

  const parts = trimRange.split(",");
  const start = parts[0]?.trim() ? Number(parts[0].trim()) : null;
  const end = parts[1]?.trim() ? Number(parts[1].trim()) : null;

  if (start !== null && Number.isNaN(start)) {
    return { start: null, end: null };
  }
  if (end !== null && Number.isNaN(end)) {
    return { start: null, end: null };
  }

  return { start, end };
};

const calculateEffectiveDuration = (
  duration: number | null,
  trimRange: string | null
): number | null => {
  if (duration === null || Number.isNaN(duration)) {
    return null;
  }

  const { start, end } = parseTrimRange(trimRange);

  if (start === null || end === null) {
    return duration;
  }

  if (start >= end) {
    return duration;
  }

  return Math.min(Math.max(end - start, 0), duration);
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
      trimRange: songData.trimRange ?? null,
      fileHash: songData.fileHash ?? null,
      tags: songData.tags ?? [],
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
  releasedAt: string | null;
  trimRange: string | null;
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
        released_at,
        trim_range,
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
        s.released_at,
        s.trim_range,
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
      COALESCE(
        (
          SELECT array_agg(a.name ORDER BY sa.display_order)
          FROM song_artists sa
          JOIN artists a ON a.id = sa.artist_id
          WHERE sa.song_id = tree.id
        ),
        ARRAY[]::text[]
      ) AS "artistNames",
      tree.cover_art_id AS "coverArtId",
      tree.preferred,
      tree.released_at AS "releasedAt",
      tree.trim_range AS "trimRange"
    FROM tree
    ORDER BY tree.path
  `)) as unknown) as SongTreeNode[];

  return {
    masterId: rootId,
    nodes,
  };
};

/**
 * Resolve the effective cover art ID for a song by walking the family tree.
 * 1. Use the song's own coverArtId
 * 2. If absent, use the album cover art of any associated album(s)
 * 3. If still absent, check the parent song recursively until a cover art is found
 */
export const resolveSongCoverArtId = async (songId: string): Promise<string | null> => {
  // First, try to get the song's own cover art
  const song = await db
    .select({ coverArtId: songs.coverArtId })
    .from(songs)
    .where(eq(songs.id, songId))
    .limit(1);

  if (song[0]?.coverArtId) {
    return song[0].coverArtId;
  }

  // Try to find cover art from associated albums
  const albumCoverArt = await db
    .select({ coverArtId: albums.coverArtId })
    .from(albumSongs)
    .innerJoin(albums, eq(albums.id, albumSongs.albumId))
    .where(eq(albumSongs.songId, songId))
    .limit(1);

  if (albumCoverArt[0]?.coverArtId) {
    return albumCoverArt[0].coverArtId;
  }

  // Walk up the parent chain
  const parentSong = await db
    .select({ parentId: songs.parentId })
    .from(songs)
    .where(eq(songs.id, songId))
    .limit(1);

  if (parentSong[0]?.parentId) {
    return resolveSongCoverArtId(parentSong[0].parentId);
  }

  return null;
};

/**
 * Update tags for a specific song
 */
export const updateSongTags = async (songId: string, tags: string[]) => {
  const normalizedTags = tags
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length > 0);

  const existing = await db
    .select()
    .from(songs)
    .where(eq(songs.id, songId))
    .limit(1);

  if (!existing[0]) {
    return null;
  }

  const [updated] = await db
    .update(songs)
    .set({ tags: normalizedTags })
    .where(eq(songs.id, songId))
    .returning();

  return updated;
};

/**
 * Get all unique tags used across the library
 */
export const selectUniqueTags = async (): Promise<string[]> => {
  const rows = await db
    .select({ tag: sql<string>`unnest(tags)` })
    .from(songs)
    .where(sql`tags IS NOT NULL AND array_length(tags, 1) > 0`);

  const tagSet = new Set<string>();
  for (const row of rows) {
    if (row.tag) {
      tagSet.add(row.tag);
    }
  }

  return Array.from(tagSet).sort();
};
