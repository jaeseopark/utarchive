import { useEffect } from 'react';
import { usePlaylistsStore } from '../stores/usePlaylistsStore';

/**
 * Hook to fetch and manage playlist detail with caching
 */
export function usePlaylistDetail(playlistId: string) {
  const { isLoading, error, fetchPlaylistDetail, getPlaylistDetail, updatePlaylist, deletePlaylist, addSongToPlaylist, removeSongFromPlaylist } = usePlaylistsStore();

  useEffect(() => {
    if (!playlistId) return;
    const cached = getPlaylistDetail(playlistId);
    if (!cached) {
      fetchPlaylistDetail(playlistId);
    }
  }, [playlistId, fetchPlaylistDetail, getPlaylistDetail]);

  const playlist = getPlaylistDetail(playlistId);

  return {
    playlist,
    isLoading,
    error,
    updatePlaylist: (name: string) => updatePlaylist(playlistId, name),
    deletePlaylist: () => deletePlaylist(playlistId),
    addSong: (songId: string) => addSongToPlaylist(playlistId, songId),
    removeSong: (position: number) => removeSongFromPlaylist(playlistId, position),
  };
}
