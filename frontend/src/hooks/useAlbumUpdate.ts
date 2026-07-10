import { useCallback } from 'react';
import { api } from '../api/client';
import { AlbumDetailSchema, type AlbumDetail } from '../api/schemas';
import { useAlbumsStore } from '../stores/useAlbumsStore';
import { type AlbumId } from '../types/brands';

/**
 * Hook to update an album via API with store integration
 */
export function useAlbumUpdate() {
  const { updateAlbum } = useAlbumsStore();

  const updateAlbumData = useCallback(
    async (albumId: AlbumId, updates: Partial<AlbumDetail>) => {
      try {
        // Filter out fields that shouldn't be sent to API
        const fieldsToUpdate = Object.fromEntries(
          Object.entries(updates).filter(
            ([key]) =>
              ![
                'id',
                'createdAt',
                'trackList',
                'tracks',
                'urls',
              ].includes(key)
          )
        );

        // Make the API call
        const updatedAlbum = await api.patch(
          `/api/albums/${albumId}`,
          fieldsToUpdate,
          AlbumDetailSchema
        );

        // Update local store
        updateAlbum(albumId, updatedAlbum);

        return { success: true, data: updatedAlbum };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update album';
        console.error('Album update error:', message);
        return { success: false, error: message };
      }
    },
    [updateAlbum]
  );

  return {
    updateAlbumData,
  };
}
