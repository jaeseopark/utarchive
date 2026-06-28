import { sql } from "drizzle-orm";
import { db } from "../../db";
import { songArtists } from "../../db/schema";

export type SearchSongResult = {
  id: string;
  title: string;
  artistId: string | null;
  preferred: boolean;
  playCount: number;
};

export type SearchArtistResult = {
  id: string;
  name: string;
  aliases: string[];
};

export type SearchAlbumResult = {
  id: string;
  title: string;
  artistId: string;
  yearReleased: number | null;
};

const buildTsQuery = (query: string) => {
  const cleanedTokens = query
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/[\W_]+/g, ""))
    .filter(Boolean)
    .map((token) => `${token}:*`);

  return cleanedTokens.join(" & ");
};

export const searchEntities = async (query: string) => {
  const tsQuery = buildTsQuery(query);

  if (!tsQuery) {
    return {
      songs: [] as SearchSongResult[],
      artists: [] as SearchArtistResult[],
      albums: [] as SearchAlbumResult[],
    };
  }

  const songRows = (await db.execute(sql`
    WITH search_query AS (
      SELECT to_tsquery('english', ${tsQuery}) AS query
    )
    SELECT
      s.id,
      s.title,
      (
        SELECT sa.artist_id
        FROM song_artists sa
        WHERE sa.song_id = s.id
        ORDER BY sa.display_order
        LIMIT 1
      ) AS "artistId",
      s.preferred,
      s.play_count AS "playCount"
    FROM songs s,
      search_query
    WHERE s.search_vector @@ search_query.query
    ORDER BY ts_rank(s.search_vector, search_query.query) DESC
    LIMIT 20
  `)) as unknown as SearchSongResult[];

  const artistRows = (await db.execute(sql`
    WITH search_query AS (
      SELECT to_tsquery('english', ${tsQuery}) AS query
    )
    SELECT
      a.id,
      a.name,
      a.aliases
    FROM artists a,
      search_query
    WHERE to_tsvector('english', a.name) @@ search_query.query
    ORDER BY ts_rank(to_tsvector('english', a.name), search_query.query) DESC
    LIMIT 20
  `)) as unknown as SearchArtistResult[];

  const albumRows = (await db.execute(sql`
    WITH search_query AS (
      SELECT to_tsquery('english', ${tsQuery}) AS query
    )
    SELECT
      al.id,
      al.title,
      al.artist_id AS "artistId",
      al.year_released AS "yearReleased"
    FROM albums al,
      search_query
    WHERE to_tsvector('english', al.title) @@ search_query.query
    ORDER BY ts_rank(to_tsvector('english', al.title), search_query.query) DESC
    LIMIT 20
  `)) as unknown as SearchAlbumResult[];

  return {
    songs: songRows,
    artists: artistRows,
    albums: albumRows,
  };
};
