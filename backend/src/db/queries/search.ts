import { sql } from "drizzle-orm";
import { db } from "../../db";

/**
 * Search results return only entity IDs.
 * Frontend is responsible for enriching these IDs with full entity data from Zustand stores.
 */
export type SearchSongResult = {
  id: string;
};

export type SearchArtistResult = {
  id: string;
};

export type SearchAlbumResult = {
  id: string;
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
      // eslint-disable-next-line no-restricted-syntax
      songs: [] as SearchSongResult[],
      // eslint-disable-next-line no-restricted-syntax
      artists: [] as SearchArtistResult[],
      // eslint-disable-next-line no-restricted-syntax
      albums: [] as SearchAlbumResult[],
    };
  }

  const songResult = await db.execute(sql`
    WITH search_query AS (
      SELECT to_tsquery('english', ${tsQuery}) AS query
    )
    SELECT s.id
    FROM songs s
      LEFT JOIN song_artists sa ON sa.song_id = s.id,
      search_query
    WHERE s.search_vector @@ search_query.query
    ORDER BY ts_rank(s.search_vector, search_query.query) DESC
    LIMIT 20
  `);
  // eslint-disable-next-line no-restricted-syntax
  const songRows = (songResult.rows ?? []) as SearchSongResult[];

  const artistResult = await db.execute(sql`
    WITH search_query AS (
      SELECT to_tsquery('english', ${tsQuery}) AS query
    )
    SELECT a.id
    FROM artists a,
      search_query
    WHERE to_tsvector('english', 
      coalesce(a.name, '') || ' ' || 
      coalesce(array_to_string(a.aliases, ' '), '') || ' ' || 
      coalesce(array_to_string(a.urls, ' '), '')
    ) @@ search_query.query
    ORDER BY ts_rank(to_tsvector('english', 
      coalesce(a.name, '') || ' ' || 
      coalesce(array_to_string(a.aliases, ' '), '') || ' ' || 
      coalesce(array_to_string(a.urls, ' '), '')
    ), search_query.query) DESC
    LIMIT 20
  `);
  // eslint-disable-next-line no-restricted-syntax
  const artistRows = (artistResult.rows ?? []) as SearchArtistResult[];

  const albumResult = await db.execute(sql`
    SELECT al.id
    FROM albums al
    WHERE to_tsvector('english', al.title) @@ to_tsquery('english', ${tsQuery})
    ORDER BY ts_rank(to_tsvector('english', al.title), to_tsquery('english', ${tsQuery})) DESC
    LIMIT 20
  `);
  // eslint-disable-next-line no-restricted-syntax
  const albumRows = (albumResult.rows ?? []) as SearchAlbumResult[];

  return {
    songs: songRows,
    artists: artistRows,
    albums: albumRows,
  };
};
