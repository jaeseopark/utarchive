import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { albumArtists, albumSongs, albums, songs } from "../../db/schema";

export type AlbumTrackListItem = {
  number: number;
  title: string;
};

export type AlbumCreateInput = {
  title: string;
  artistIds: string[];
  yearReleased?: number | null;
  coverArtId?: string | null;
  trackList?: AlbumTrackListItem[];
  urls?: Record<string, string>;
};

export type AlbumUpdateInput = Partial<AlbumCreateInput>;

export type AlbumTrack = {
  trackNumber: number;
  song: { id: string; title: string } | null;
  referenceTitle: string | null;
  isRegistered: boolean;
};

export type AlbumWithTracks = {
  id: string;
  title: string;
  artistIds: string[];
  artistNames: string[];
  yearReleased: number | null;
  coverArtId: string | null;
  trackList: AlbumTrackListItem[];
  urls: Record<string, string>;
  createdAt: string;
  tracks: AlbumTrack[];
};

const normalizeTrackList = (value: unknown): AlbumTrackListItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is { number: unknown; title: unknown } =>
        item !== null && typeof item === "object" &&
        // eslint-disable-next-line no-restricted-syntax
        typeof (item as { number: unknown }).number === "number" &&
        // eslint-disable-next-line no-restricted-syntax
        typeof (item as { title: unknown }).title === "string"
    )
    .map((item) => ({
      // eslint-disable-next-line no-restricted-syntax
      number: (item as { number: number }).number,
      // eslint-disable-next-line no-restricted-syntax
      title: (item as { title: string }).title,
    }));
};

const buildTracks = (
  trackList: unknown,
  albumSongRows: Array<{ songId: string; trackNumber: number; title: string | null }>
): AlbumTrack[] => {
  const normalizedTrackList = normalizeTrackList(trackList);
  const songByTrackNumber = new Map<number, { songId: string; title: string | null }>();

  for (const row of albumSongRows) {
    songByTrackNumber.set(row.trackNumber, {
      songId: row.songId,
      title: row.title,
    });
  }

  const seenTrackNumbers = new Set<number>();

  const mergedTracks: AlbumTrack[] = normalizedTrackList.map((track) => {
    const songRow = songByTrackNumber.get(track.number);
    seenTrackNumbers.add(track.number);

    return {
      trackNumber: track.number,
      referenceTitle: track.title,
      song:
        songRow && songRow.title !== null
          ? { id: songRow.songId, title: songRow.title }
          : null,
      isRegistered: Boolean(songRow && songRow.title !== null),
    };
  });

  for (const row of albumSongRows) {
    if (seenTrackNumbers.has(row.trackNumber)) {
      continue;
    }

    mergedTracks.push({
      trackNumber: row.trackNumber,
      referenceTitle: row.title ?? null,
      song:
        row.title !== null ? { id: row.songId, title: row.title } : null,
      isRegistered: row.title !== null,
    });
  }

  return mergedTracks;
};

export const selectAlbums = async (limit: number, offset: number) =>
  db
    .select({
      id: albums.id,
      title: albums.title,
      artistIds: sql`(
        SELECT coalesce(array_agg(aa.artist_id ORDER BY aa.display_order), ARRAY[]::uuid[])
        FROM album_artists aa
        WHERE aa.album_id = ${albums.id}
      )`,
      artistNames: sql`(
        SELECT coalesce(array_agg(a.name ORDER BY aa.display_order), ARRAY[]::text[])
        FROM album_artists aa
        JOIN artists a ON a.id = aa.artist_id
        WHERE aa.album_id = ${albums.id}
      )`,
      yearReleased: albums.yearReleased,
    })
    .from(albums)
    .orderBy(albums.title)
    .limit(limit)
    .offset(offset);

export const selectAlbumById = async (id: string): Promise<AlbumWithTracks | null> => {
  const rows = await db
    .select({
      id: albums.id,
      title: albums.title,
      artistIds: sql`(
        SELECT coalesce(array_agg(aa.artist_id ORDER BY aa.display_order), ARRAY[]::uuid[])
        FROM album_artists aa
        WHERE aa.album_id = ${albums.id}
      )`,
      artistNames: sql`(
        SELECT coalesce(array_agg(a.name ORDER BY aa.display_order), ARRAY[]::text[])
        FROM album_artists aa
        JOIN artists a ON a.id = aa.artist_id
        WHERE aa.album_id = ${albums.id}
      )`,
      yearReleased: albums.yearReleased,
      coverArtId: albums.coverArtId,
      trackList: albums.trackList,
      urls: albums.urls,
      createdAt: albums.createdAt,
    })
    .from(albums)
    .where(eq(albums.id, id))
    .limit(1);
  const album = rows[0];

  if (!album) {
    return null;
  }

  const songRows = await db
    .select({
      songId: albumSongs.songId,
      trackNumber: albumSongs.trackNumber,
      title: songs.title,
    })
    .from(albumSongs)
    .leftJoin(songs, eq(songs.id, albumSongs.songId))
    .where(eq(albumSongs.albumId, id))
    .orderBy(albumSongs.trackNumber);

  return {
    id: album.id,
    title: album.title,
    artistIds: Array.isArray(album.artistIds) ? album.artistIds : [],
    artistNames: Array.isArray(album.artistNames) ? album.artistNames : [],
    yearReleased: album.yearReleased ?? null,
    coverArtId: album.coverArtId ?? null,
    trackList: normalizeTrackList(album.trackList),
    urls: album.urls ?? {},
    createdAt: album.createdAt instanceof Date ? album.createdAt.toISOString() : String(album.createdAt),
    tracks: buildTracks(album.trackList, songRows),
  };
};

export const createAlbum = async (albumData: AlbumCreateInput) => {
  const albumId = crypto.randomUUID();

  return db.transaction(async (tx) => {
    const rows = await tx
      .insert(albums)
      .values({
        id: albumId,
        title: albumData.title,
        yearReleased: albumData.yearReleased ?? null,
        coverArtId: albumData.coverArtId ?? null,
        trackList: albumData.trackList ?? [],
        urls: albumData.urls ?? {},
      })
      .returning();

    if (albumData.artistIds && albumData.artistIds.length > 0) {
      await tx.insert(albumArtists).values(
        albumData.artistIds.map((artistId, index) => ({
          albumId,
          artistId,
          displayOrder: index,
        }))
      );
    }

    return rows[0];
  });
};

export const updateAlbumById = async (
  albumId: string,
  updateData: AlbumUpdateInput
) => {
  const dataToUpdate: Partial<AlbumCreateInput> = {};

  if (updateData.title !== undefined) {
    dataToUpdate.title = updateData.title;
  }

  if (updateData.artistIds !== undefined) {
    // Delete existing album_artists and insert new ones
    await db.delete(albumArtists).where(eq(albumArtists.albumId, albumId));
    if (updateData.artistIds.length > 0) {
      await db.insert(albumArtists).values(
        updateData.artistIds.map((artistId, index) => ({
          albumId: albumId,
          artistId,
          displayOrder: index,
        }))
      );
    }
  }

  if (updateData.yearReleased !== undefined) {
    dataToUpdate.yearReleased = updateData.yearReleased;
  }

  if (updateData.coverArtId !== undefined) {
    dataToUpdate.coverArtId = updateData.coverArtId;
  }

  if (updateData.trackList !== undefined) {
    dataToUpdate.trackList = updateData.trackList;
  }

  if (updateData.urls !== undefined) {
    dataToUpdate.urls = updateData.urls;
  }

  const rows = await db
    .update(albums)
    .set(dataToUpdate)
    .where(eq(albums.id, albumId))
    .returning();

  return rows[0] ?? null;
};

export const upsertAlbumSong = async (
  albumId: string,
  songId: string,
  trackNumber: number
) => {
  const [existingAlbum] = await db.select().from(albums).where(eq(albums.id, albumId)).limit(1);

  if (!existingAlbum) {
    throw new Error("ALBUM_NOT_FOUND");
  }

  const [existingSong] = await db.select().from(songs).where(eq(songs.id, songId)).limit(1);

  if (!existingSong) {
    throw new Error("SONG_NOT_FOUND");
  }

  const [existingAssociation] = await db
    .select()
    .from(albumSongs)
    .where(and(eq(albumSongs.albumId, albumId), eq(albumSongs.songId, songId)))
    .limit(1);

  if (existingAssociation) {
    await db
      .update(albumSongs)
      .set({ trackNumber })
      .where(and(eq(albumSongs.albumId, albumId), eq(albumSongs.songId, songId)));
  } else {
    await db.insert(albumSongs).values({ albumId, songId, trackNumber });
  }

  return { albumId, songId, trackNumber };
};

export const deleteAlbumSong = async (albumId: string, songId: string) => {
  const result = await db
    .delete(albumSongs)
    .where(and(eq(albumSongs.albumId, albumId), eq(albumSongs.songId, songId)));

  return (result.rowCount ?? 0) > 0;
};
