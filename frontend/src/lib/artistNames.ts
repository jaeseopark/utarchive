import type { ArtistsState } from '../stores/useArtistsStore';

/**
 * Get artist names from artist IDs using the artists store.
 * Returns an array of artist names in the same order as the IDs.
 * If an artist is not found, returns a placeholder name.
 */
export const getArtistNames = (
  artistIds: string[],
  artists: ArtistsState['artists']
): string[] => {
  const artistMap = new Map(artists.map((artist) => [artist.id, artist.name]));
  return artistIds.map((id) => artistMap.get(id) ?? 'Unknown Artist');
};
