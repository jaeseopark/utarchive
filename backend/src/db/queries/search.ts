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
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return {
      // eslint-disable-next-line no-restricted-syntax
      songs: [] as SearchSongResult[],
      // eslint-disable-next-line no-restricted-syntax
      artists: [] as SearchArtistResult[],
      // eslint-disable-next-line no-restricted-syntax
      albums: [] as SearchAlbumResult[],
    };
  }

  const tsQuery = buildTsQuery(query);
  const ilikePattern = `%${trimmedQuery}%`;

  // Search songs with tsvector first, fallback to ILIKE for edge cases
  const songResult = await db.execute(sql`
    WITH search_query AS (
      SELECT to_tsquery('english', ${tsQuery}) AS query
    ),
    tsvector_results AS (
      SELECT s.id, 
        ts_rank(s.search_vector, search_query.query) AS rank
      FROM songs s,
        search_query
      WHERE s.search_vector @@ search_query.query
      LIMIT 20
    ),
    ilike_results AS (
      SELECT s.id,
        0.0::FLOAT AS rank
      FROM songs s
      WHERE s.id NOT IN (SELECT id FROM tsvector_results)
        AND (
          s.title ILIKE ${ilikePattern}
          OR s.description ILIKE ${ilikePattern}
          OR s.tags::text ILIKE ${ilikePattern}
          OR s.urls::text ILIKE ${ilikePattern}
        )
      LIMIT 20
    )
    SELECT id FROM (
      SELECT id, rank FROM tsvector_results
      UNION ALL
      SELECT id, rank FROM ilike_results
      ORDER BY rank DESC
    ) AS combined
  `);
  // eslint-disable-next-line no-restricted-syntax
  const songRows = (songResult.rows ?? []) as SearchSongResult[];

  // Search artists with tsvector first, fallback to ILIKE
  const artistResult = await db.execute(sql`
    WITH search_query AS (
      SELECT to_tsquery('english', ${tsQuery}) AS query
    ),
    tsvector_results AS (
      SELECT a.id,
        ts_rank(vec, search_query.query) AS rank
      FROM artists a,
        search_query,
        LATERAL (
          SELECT to_tsvector('english',
            coalesce(a.name, '') || ' ' ||
            coalesce(array_to_string(a.aliases, ' '), '') || ' ' ||
            coalesce(array_to_string(a.urls, ' '), '')
          ) AS vec
        ) vec_row
      WHERE vec_row.vec @@ search_query.query
      LIMIT 20
    ),
    ilike_results AS (
      SELECT a.id,
        0.0::FLOAT AS rank
      FROM artists a
      WHERE a.id NOT IN (SELECT id FROM tsvector_results)
        AND (
          a.name ILIKE ${ilikePattern}
          OR array_to_string(a.aliases, ' ') ILIKE ${ilikePattern}
          OR array_to_string(a.urls, ' ') ILIKE ${ilikePattern}
        )
      LIMIT 20
    )
    SELECT id FROM (
      SELECT id, rank FROM tsvector_results
      UNION ALL
      SELECT id, rank FROM ilike_results
      ORDER BY rank DESC
    ) AS combined
  `);
  // eslint-disable-next-line no-restricted-syntax
  const artistRows = (artistResult.rows ?? []) as SearchArtistResult[];

  // Search albums with tsvector first, fallback to ILIKE
  const albumResult = await db.execute(sql`
    WITH search_query AS (
      SELECT to_tsquery('english', ${tsQuery}) AS query
    ),
    tsvector_results AS (
      SELECT al.id,
        ts_rank(vec, search_query.query) AS rank
      FROM albums al,
        search_query,
        LATERAL (
          SELECT to_tsvector('english', al.title) AS vec
        ) vec_row
      WHERE vec_row.vec @@ search_query.query
      LIMIT 20
    ),
    ilike_results AS (
      SELECT al.id,
        0.0::FLOAT AS rank
      FROM albums al
      WHERE al.id NOT IN (SELECT id FROM tsvector_results)
        AND (
          al.title ILIKE ${ilikePattern}
          OR al.urls::text ILIKE ${ilikePattern}
        )
      LIMIT 20
    )
    SELECT id FROM (
      SELECT id, rank FROM tsvector_results
      UNION ALL
      SELECT id, rank FROM ilike_results
      ORDER BY rank DESC
    ) AS combined
  `);
  // eslint-disable-next-line no-restricted-syntax
  const albumRows = (albumResult.rows ?? []) as SearchAlbumResult[];

  return {
    songs: songRows,
    artists: artistRows,
    albums: albumRows,
  };
};
