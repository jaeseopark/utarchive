import { useCallback } from 'react';
import { api } from '../api/client';
import { ArtistSchema, type ArtistCreateInput, type Artist } from '../api/schemas';
import { useArtistsStore } from '../stores/useArtistsStore';

/**
 * Hook to create a new artist
 */
export function useCreateArtist() {
  const createArtist = useCallback(
    async (data: ArtistCreateInput): Promise<Artist> => {
      try {
        const response = await api.post('/api/artists', data, ArtistSchema);
        // Update the store with the new artist
        useArtistsStore.getState().addArtist(response);
        return response;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create artist';
        throw new Error(message);
      }
    },
    [],
  );

  return { createArtist };
}
