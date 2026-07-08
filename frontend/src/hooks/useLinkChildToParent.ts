import { useCallback } from 'react';
import { api } from '../api/client';
import { SongSchema, type Song } from '../api/schemas';
import { useSongsStore } from '../stores/useSongsStore';

/**
 * Hook to link an existing child song to a parent song
 * Updates the song and refreshes the tree for both parent and child
 */
export function useLinkChildToParent() {
  const { addSongDetail } = useSongsStore();

  const linkChild = useCallback(
    async (parentId: string, childId: string): Promise<Song> => {
      try {
        const response = await api.post(`/api/songs/${parentId}/children`, { childId }, SongSchema);
        addSongDetail(response);
        return response;
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'Failed to link child song', { cause: err });
      }
    },
    [addSongDetail],
  );

  return { linkChild };
}
