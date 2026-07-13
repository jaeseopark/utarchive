import { and, eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "../../db";
import { albumSongs, albums, artists, songArtists, songHierarchy, songs } from "../../db/schema";

export type SongCreateInput = {
  title: string;
  parentId?: string | null;
  releasedAt?: string;
  urls?: string[];
  filePath?: string | null;
  coverArtId?: string | null;
  description?: string | null;
  playbackEnabled?: boolean;
  trimRange?: string | null;
  fileHash?: string | null;
  tags?: string[];
};

export type SongUpdateInput = {
  title?: string;
  releasedAt?: string;
  urls?: string[];
  filePath?: string | null;
  duration?: number | null;
  fileExtension?: string | null;
  fileSizeBytes?: bigint | null;
  coverArtId?: string | null;
  description?: string | null;
  playbackEnabled?: boolean;
  trimRange?: string | null;
  fileHash?: string | null;
  tags?: string[];
  artistIds?: string[];
};

export type SongListFilters = {
  limit: number;
  offset: number;
  artistId?: string;
  masterId?: string;
  playbackEnabled?: boolean;
};

export type Song = {
  id: string;
  title: string;
  releasedAt: Date | null;
  urls: string[];
  filePath: string | null;
  duration: number | null;
  fileExtension: string | null;
  fileSizeBytes: bigint | null;
  coverArtId: string | null;
  description: string | null;
  playbackEnabled: boolean;
  trimRange: string | null;
  fileHash: string | null;
  tags: string[];
  createdAt: Date;
};

export type SongWithHierarchy = Song & {
  parentId: string | null;
  masterId: string;
  artistIds: string[];
  albumIds: string[];
};

export const selectSongById = async (id: string) => {
  const [song] = await db
    .select({
      id: songs.id,
      title: songs.title,
      parentId: songHierarchy.parentId,
      masterId: sql<string>`coalesce(${songHierarchy.masterId}, ${songs.id})`,
      releasedAt: songs.releasedAt,
      urls: songs.urls,
      filePath: songs.filePath,
      duration: songs.duration,
      fileExtension: songs.fileExtension,
      fileSizeBytes: songs.fileSizeBytes,
      coverArtId: songs.coverArtId,
      description: songs.description,
      playbackEnabled: songs.playbackEnabled,
      trimRange: songs.trimRange,
      fileHash: songs.fileHash,
      tags: songs.tags,
      createdAt: songs.createdAt,
      artistIds: sql<string[]>`
        (SELECT coalesce(array_agg(sa.artist_id ORDER BY sa.display_order), ARRAY[]::uuid[])
         FROM song_artists sa
         WHERE sa.song_id = ${songs.id})
      `,
      albumIds: sql<string[]>`
        (SELECT coalesce(array_agg(DISTINCT als.album_id ORDER BY als.album_id), ARRAY[]::uuid[])
         FROM album_songs als
         WHERE als.song_id = ${songs.id})
      `,
    })
    .from(songs)
    .leftJoin(songHierarchy, eq(songHierarchy.songId, songs.id))
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
export const parseTrimRange = (
  trimRange: string | null,
): { start: number | null; end: number | null } => {
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

export const selectSongArtistIds = async (songId: string) => {
  const rows = await db
    .select({ artistId: songArtists.artistId })
    .from(songArtists)
    .where(eq(songArtists.songId, songId))
    .orderBy(songArtists.displayOrder);

  return rows.map((row) => row.artistId);
};

export const selectSongs = async (filters: SongListFilters) => {
  const selectObj = {
    id: songs.id,
    title: songs.title,
    releasedAt: songs.releasedAt,
    playbackEnabled: songs.playbackEnabled,
    duration: songs.duration,
    filePath: songs.filePath,
    coverArtId: songs.coverArtId,
    artistIds: sql<string[]>`
      coalesce(array_agg("song_artists"."artist_id" ORDER BY "song_artists"."display_order"), ARRAY[]::uuid[])
    `,
  };

  if (filters.artistId && filters.masterId) {
    return db
      .select(selectObj)
      .from(songs)
      .innerJoin(songArtists, eq(songArtists.songId, songs.id))
      .innerJoin(artists, eq(artists.id, songArtists.artistId))
      .innerJoin(songHierarchy, eq(songHierarchy.songId, songs.id))
      .where(
        and(
          eq(songArtists.artistId, filters.artistId),
          eq(songHierarchy.masterId, filters.masterId),
        ),
      )
      .groupBy(songs.id)
      .orderBy(songs.title)
      .limit(filters.limit)
      .offset(filters.offset);
  }

  if (filters.artistId) {
    return db
      .select(selectObj)
      .from(songs)
      .innerJoin(songArtists, eq(songArtists.songId, songs.id))
      .innerJoin(artists, eq(artists.id, songArtists.artistId))
      .where(eq(songArtists.artistId, filters.artistId))
      .groupBy(songs.id)
      .orderBy(songs.title)
      .limit(filters.limit)
      .offset(filters.offset);
  }

  if (filters.masterId) {
    return db
      .select(selectObj)
      .from(songs)
      .leftJoin(songArtists, eq(songArtists.songId, songs.id))
      .leftJoin(artists, eq(artists.id, songArtists.artistId))
      .innerJoin(songHierarchy, eq(songHierarchy.songId, songs.id))
      .where(eq(songHierarchy.masterId, filters.masterId))
      .groupBy(songs.id)
      .orderBy(songs.title)
      .limit(filters.limit)
      .offset(filters.offset);
  }

  // Default: no filters, return all songs with artist info
  return db
    .select(selectObj)
    .from(songs)
    .leftJoin(songArtists, eq(songArtists.songId, songs.id))
    .leftJoin(artists, eq(artists.id, songArtists.artistId))
    .groupBy(songs.id)
    .orderBy(songs.title)
    .limit(filters.limit)
    .offset(filters.offset);
};

export const createSong = async (
  songData: SongCreateInput,
  artistIds: string[],
): Promise<SongWithHierarchy> => {
  const songId = randomUUID();
  let masterId: string | undefined = songData.parentId ? undefined : songId;

  return db.transaction(async (tx) => {
    if (songData.parentId) {
      // Verify parent exists and get its hierarchy info using the same logic as selectSongById
      const [parentResult] = await tx
        .select({
          parentId: songHierarchy.parentId,
          masterId: sql<string>`coalesce(${songHierarchy.masterId}, ${songs.id})`,
        })
        .from(songs)
        .leftJoin(songHierarchy, eq(songHierarchy.songId, songs.id))
        .where(eq(songs.id, songData.parentId))
        .limit(1);

      if (!parentResult) {
        throw new Error("PARENT_NOT_FOUND");
      }

      masterId = parentResult.masterId;
    }

    const insertData = {
      id: songId,
      title: songData.title,
      releasedAt: songData.releasedAt ? new Date(songData.releasedAt) : undefined,
      urls: songData.urls ?? [],
      filePath: songData.filePath ?? null,
      coverArtId: songData.coverArtId ?? null,
      description: songData.description ?? null,
      playbackEnabled: songData.playbackEnabled,
      trimRange: songData.trimRange ?? null,
      fileHash: songData.fileHash ?? null,
      tags: songData.tags ?? [],
      searchVector: sql`
        setweight(to_tsvector('english', ${songData.title}), 'A') ||
        setweight(to_tsvector('english', ${(songData.tags ?? []).join(" ")}), 'B') ||
        setweight(to_tsvector('english', ${songData.description ?? ""}), 'C')
      `,
    };

    await tx.insert(songs).values(insertData);

    // Insert into song_hierarchy table
    await tx.insert(songHierarchy).values({
      songId,
      parentId: songData.parentId ?? null,
      masterId: masterId ?? songId,
    });

    const artistRows = artistIds.map((artistId, index) => ({
      songId: songId,
      artistId,
      displayOrder: index,
    }));

    if (artistRows.length > 0) {
      await tx.insert(songArtists).values(artistRows);
    }

    return {
      id: songId,
      title: songData.title,
      releasedAt: songData.releasedAt ? new Date(songData.releasedAt) : null,
      urls: songData.urls ?? [],
      filePath: songData.filePath ?? null,
      duration: null,
      fileExtension: null,
      fileSizeBytes: null,
      coverArtId: songData.coverArtId ?? null,
      description: songData.description ?? null,
      playbackEnabled: songData.playbackEnabled ?? true,
      trimRange: songData.trimRange ?? null,
      fileHash: songData.fileHash ?? null,
      tags: songData.tags ?? [],
      createdAt: new Date(),
      parentId: songData.parentId ?? null,
      masterId: masterId ?? songId,
      artistIds,
      albumIds: [],
    };
  });
};

export const updateSongById = async (
  songId: string,
  updateData: SongUpdateInput,
): Promise<SongWithHierarchy | null> => {
  // Note: When coverArtId is set to null, this unassigns the image from the song
  // but does NOT delete the underlying cover art entry or image files.
  // This allows the image to be reused by other songs/albums.
  const { artistIds, releasedAt, ...restSongFields } = updateData;

  return db.transaction(async (tx) => {
    const existing = await tx.select().from(songs).where(eq(songs.id, songId)).limit(1);

    if (!existing[0]) {
      return null;
    }

    // Rebuild searchVector if any of these fields change
    const hasSearchableFieldChange = Boolean(
      updateData.title || updateData.description || updateData.tags,
    );

    const searchVectorValue = hasSearchableFieldChange
      ? (() => {
          const titleValue = updateData.title ?? existing[0].title;
          const tagsValue = (updateData.tags ?? existing[0].tags ?? []).join(" ");
          const descriptionValue =
            updateData.description !== undefined ? updateData.description : existing[0].description;

          return sql`
            setweight(to_tsvector('english', ${titleValue}), 'A') ||
            setweight(to_tsvector('english', ${tagsValue}), 'B') ||
            setweight(to_tsvector('english', ${descriptionValue ?? ""}), 'C')
          `;
        })()
      : undefined;

    const songFields = {
      ...restSongFields,
      ...(releasedAt !== undefined && { releasedAt: new Date(releasedAt) }),
      ...(searchVectorValue !== undefined && { searchVector: searchVectorValue }),
    };

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

    const [updatedSong] = await tx.select().from(songs).where(eq(songs.id, songId)).limit(1);

    const hierarchy = await tx
      .select({ parentId: songHierarchy.parentId, masterId: songHierarchy.masterId })
      .from(songHierarchy)
      .where(eq(songHierarchy.songId, songId))
      .limit(1);

    const updatedArtistIds = await tx
      .select({ artistId: songArtists.artistId })
      .from(songArtists)
      .where(eq(songArtists.songId, songId))
      .orderBy(songArtists.displayOrder);

    const updatedAlbumIds = await tx
      .select({ albumId: albumSongs.albumId })
      .from(albumSongs)
      .where(eq(albumSongs.songId, songId))
      .orderBy(albumSongs.albumId);

    return {
      ...updatedSong,
      artistIds: updatedArtistIds.map((row) => row.artistId),
      albumIds: updatedAlbumIds.map((row) => row.albumId),
      parentId: hierarchy[0]?.parentId ?? null,
      masterId: hierarchy[0]?.masterId ?? songId,
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
  playbackEnabled: boolean;
  releasedAt: string | null;
  trimRange: string | null;
};

export const selectSongTree = async (songId: string) => {
  const song = await selectSongById(songId);

  if (!song) {
    return null;
  }

  const rootId = song.masterId ?? song.id;

  const result = await db.execute(sql`
    WITH RECURSIVE tree AS (
      SELECT
        s.id,
        s.title,
        sh.parent_id,
        s.cover_art_id,
        s.playback_enabled,
        s.released_at,
        s.trim_range,
        ARRAY[s.id] AS path,
        0 AS depth
      FROM songs s
      LEFT JOIN song_hierarchy sh ON sh.song_id = s.id
      WHERE s.id = ${rootId}
      UNION ALL
      SELECT
        s.id,
        s.title,
        sh.parent_id,
        s.cover_art_id,
        s.playback_enabled,
        s.released_at,
        s.trim_range,
        tree.path || s.id,
        tree.depth + 1
      FROM songs s
      LEFT JOIN song_hierarchy sh ON sh.song_id = s.id
      JOIN tree ON sh.parent_id = tree.id
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
      tree.playback_enabled AS "playbackEnabled",
      tree.released_at AS "releasedAt",
      tree.trim_range AS "trimRange"
    FROM tree
    ORDER BY tree.path
  `);

  // eslint-disable-next-line no-restricted-syntax
  const nodes = (result.rows ?? result) as SongTreeNode[];

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
  const hierarchy = await db
    .select({ parentId: songHierarchy.parentId })
    .from(songHierarchy)
    .where(eq(songHierarchy.songId, songId))
    .limit(1);

  if (hierarchy[0]?.parentId) {
    return resolveSongCoverArtId(hierarchy[0].parentId);
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

  const existing = await db.select().from(songs).where(eq(songs.id, songId)).limit(1);

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
 * Link an existing child song to a parent song
 * Creates or updates the song_hierarchy relationship
 * Also cascades the masterId update to all descendants
 */
export const linkChildToParent = async (
  childId: string,
  parentId: string,
): Promise<SongWithHierarchy> => {
  return db.transaction(async (tx) => {
    // Verify both songs exist
    const childSong = await tx.select().from(songs).where(eq(songs.id, childId)).limit(1);
    if (!childSong[0]) {
      throw new Error("CHILD_NOT_FOUND");
    }

    const parentSong = await tx.select().from(songs).where(eq(songs.id, parentId)).limit(1);
    if (!parentSong[0]) {
      throw new Error("PARENT_NOT_FOUND");
    }

    // Get parent's hierarchy info to determine master ID using the same logic as selectSongById
    const [parentHierarchy] = await tx
      .select({
        masterId: sql<string>`coalesce(${songHierarchy.masterId}, ${songs.id})`,
      })
      .from(songs)
      .leftJoin(songHierarchy, eq(songHierarchy.songId, songs.id))
      .where(eq(songs.id, parentId))
      .limit(1);

    const newMasterId = parentHierarchy?.masterId ?? parentId;

    // Check if child already has a hierarchy entry
    const existingChildHierarchy = await tx
      .select()
      .from(songHierarchy)
      .where(eq(songHierarchy.songId, childId))
      .limit(1);

    if (existingChildHierarchy[0]) {
      // Update existing hierarchy
      await tx
        .update(songHierarchy)
        .set({ parentId, masterId: newMasterId })
        .where(eq(songHierarchy.songId, childId));
    } else {
      // Insert new hierarchy entry
      await tx.insert(songHierarchy).values({
        songId: childId,
        parentId,
        masterId: newMasterId,
      });
    }

    // Cascade masterId update to all descendants
    // Find all descendants of the child (via recursive parent-child chains)
    const descendantResult = await tx.execute(sql`
      WITH RECURSIVE descendants AS (
        SELECT song_id FROM song_hierarchy WHERE song_id = ${childId}
        UNION ALL
        SELECT sh.song_id
        FROM song_hierarchy sh
        JOIN descendants d ON sh.parent_id = d.song_id
      )
      SELECT song_id FROM descendants WHERE song_id != ${childId}
    `);

    interface DescendantRow {
      song_id: string;
    }

    // eslint-disable-next-line no-restricted-syntax
    const rows = (descendantResult.rows ?? descendantResult) as unknown as DescendantRow[];
    const descendantIds = rows.map((row) => row.song_id);

    // Update all descendants' masterId
    if (descendantIds.length > 0) {
      await tx
        .update(songHierarchy)
        .set({ masterId: newMasterId })
        .where(sql`song_id = ANY(${descendantIds}::uuid[])`);
    }

    // Return updated child song
    const updatedChild = await selectSongById(childId);
    if (!updatedChild) {
      throw new Error("CHILD_NOT_FOUND");
    }

    return updatedChild;
  });
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
