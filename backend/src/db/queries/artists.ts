import { eq, sql, desc } from "drizzle-orm";
import { db } from "../../db";
import { artists, songArtists, songs } from "../../db/schema";

export type ArtistCreateInput = {
  name: string;
  aliases?: string[];
  description?: string | null;
  urls?: string[];
};

export type ArtistUpdateInput = Partial<ArtistCreateInput>;

export const selectArtists = (limit: number, offset: number) =>
  db
    .select({
      id: artists.id,
      name: artists.name,
      aliases: artists.aliases,
      description: artists.description,
      urls: artists.urls,
      songCount: sql<number>`COALESCE(CAST(count(${songArtists.songId}) AS INTEGER), 0)`,
      createdAt: artists.createdAt,
    })
    .from(artists)
    .leftJoin(songArtists, eq(songArtists.artistId, artists.id))
    .groupBy(
      artists.id,
      artists.name,
      artists.aliases,
      artists.description,
      artists.urls,
      artists.createdAt,
    )
    .orderBy(artists.name)
    .limit(limit)
    .offset(offset);

export const selectArtistById = async (id: string) => {
  const results = await db
    .select({
      id: artists.id,
      name: artists.name,
      aliases: artists.aliases,
      description: artists.description,
      urls: artists.urls,
      songCount: sql<number>`COALESCE(CAST(count(${songArtists.songId}) AS INTEGER), 0)`,
      createdAt: artists.createdAt,
    })
    .from(artists)
    .leftJoin(songArtists, eq(songArtists.artistId, artists.id))
    .where(eq(artists.id, id))
    .groupBy(
      artists.id,
      artists.name,
      artists.aliases,
      artists.description,
      artists.urls,
      artists.createdAt,
    )
    .limit(1);

  return results[0];
};

export const insertArtist = (artist: ArtistCreateInput) =>
  db.insert(artists).values(artist).returning();

export const updateArtistById = (id: string, updateData: ArtistUpdateInput) =>
  db.update(artists).set(updateData).where(eq(artists.id, id)).returning();

export const selectSongsByArtistId = (artistId: string) =>
  db
    .select({
      id: songs.id,
      title: songs.title,
      releasedAt: songs.releasedAt,
      playbackEnabled: songs.playbackEnabled,
    })
    .from(songs)
    .innerJoin(songArtists, eq(songArtists.songId, songs.id))
    .where(eq(songArtists.artistId, artistId))
    .orderBy(desc(songs.releasedAt), songs.title);
