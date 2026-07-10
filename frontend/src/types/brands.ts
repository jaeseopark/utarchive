/**
 * Branded types for entity IDs to prevent accidental mixing of different ID types.
 * These are zero-cost abstractions at runtime - they're just TypeScript compile-time checks.
 *
 * Usage:
 *   const songId: SongId = toBrandId<SongId>(uuid());
 *   const artistId: ArtistId = toBrandId<ArtistId>(uuid());
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
export type SongId = Brand<string, "SongId">;
export type ArtistId = Brand<string, "ArtistId">;
export type AlbumId = Brand<string, "AlbumId">;
export type PlaylistId = Brand<string, "PlaylistId">;
export type CoverArtId = Brand<string, "CoverArtId">;

/**
 * Generic helper to create branded IDs (use at API boundaries where data enters the system)
 * Overloads:
 * - With required string: returns T (non-optional)
 * - With optional string: returns T | undefined
 */
export function toBrandId<T extends Brand<string, string>>(value: string): T;
export function toBrandId<T extends Brand<string, string>>(value?: string): T | undefined;
export function toBrandId<T extends Brand<string, string>>(value?: string): T | undefined {
  if (value === undefined) {
    return undefined;
  }
  // eslint-disable-next-line no-restricted-syntax
  return value as T;
}
