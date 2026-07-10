/**
 * Branded types for entity IDs to prevent accidental mixing of different ID types.
 * These are zero-cost abstractions at runtime - they're just TypeScript compile-time checks.
 *
 * Usage:
 *   const songId: SongId = createSongId(uuid());
 *   const artistId: ArtistId = createArtistId(uuid());
 *
 *   // This is a compile error - prevents mixing:
 *   function playSong(id: SongId) { }
 *   playSong(artistId); // ❌ Type error: ArtistId is not assignable to SongId
 */

/**
 * Base brand type - adds a __brand property to the base type
 */
type Brand<T, B> = T & { readonly __brand: B };

// Entity ID types (all UUID format)
export type SongId = Brand<string, 'SongId'>;
export type ArtistId = Brand<string, 'ArtistId'>;
export type AlbumId = Brand<string, 'AlbumId'>;
export type PlaylistId = Brand<string, 'PlaylistId'>;
export type CoverArtId = Brand<string, 'CoverArtId'>;

/**
 * Helper functions to create branded IDs (use at API boundaries where data enters the system)
 */
export function createSongId(value: string): SongId {
  // eslint-disable-next-line no-restricted-syntax
  return value as SongId;
}

export function createArtistId(value: string): ArtistId {
  // eslint-disable-next-line no-restricted-syntax
  return value as ArtistId;
}

export function createAlbumId(value: string): AlbumId {
  // eslint-disable-next-line no-restricted-syntax
  return value as AlbumId;
}

export function createPlaylistId(value: string): PlaylistId {
  // eslint-disable-next-line no-restricted-syntax
  return value as PlaylistId;
}

export function createCoverArtId(value: string): CoverArtId {
  // eslint-disable-next-line no-restricted-syntax
  return value as CoverArtId;
}

/**
 * Type guards for runtime validation (optional, use when you need to validate untrusted data)
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isSongId(value: unknown): value is SongId {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

export function isArtistId(value: unknown): value is ArtistId {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

export function isAlbumId(value: unknown): value is AlbumId {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

export function isPlaylistId(value: unknown): value is PlaylistId {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

export function isCoverArtId(value: unknown): value is CoverArtId {
  return typeof value === 'string' && UUID_REGEX.test(value);
}
