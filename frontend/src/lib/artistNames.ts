import type { ArtistsState } from "../stores/useArtistsStore";

/**
 * Get artist names from artist IDs.
 * Returns an array of artist names in the same order as the IDs.
 * If an artist is not found, returns a placeholder name.
 *
 * Overloads:
 * - getArtistNames(artistIds, artists) - creates map internally
 * - getArtistNames(artistIds, artistMap) - uses pre-built map for performance
 */

export function getArtistNames(artistIds: string[], artists: ArtistsState["artists"]): string[];

export function getArtistNames(artistIds: string[], artistMap: Map<string, string>): string[];

export function getArtistNames(
  artistIds: string[],
  artistsOrMap: ArtistsState["artists"] | Map<string, string>,
): string[] {
  const artistMap =
    artistsOrMap instanceof Map
      ? artistsOrMap
      : new Map(artistsOrMap.map((artist) => [artist.id, artist.name]));

  return artistIds.map((id) => artistMap.get(id) ?? "Unknown Artist");
}
