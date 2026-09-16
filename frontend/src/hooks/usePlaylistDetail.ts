import { useEffect } from "react";
import { usePlaylistsStore } from "../stores/usePlaylistsStore";
import { type PlaylistId, type SongId } from "types";

/**
 * Hook to fetch and manage playlist detail with caching
 */
export function usePlaylistDetail(playlistId: PlaylistId) {
  const {
    isLoading,
    error,
    fetchPlaylistDetail,
    getPlaylistDetail,
    updatePlaylist,
    deletePlaylist,
    addSongsToPlaylist,
    removeSongFromPlaylist,
  } = usePlaylistsStore((state) => ({
    isLoading: state.isLoading,
    error: state.error,
    fetchPlaylistDetail: state.fetchPlaylistDetail,
    getPlaylistDetail: state.getPlaylistDetail,
    updatePlaylist: state.updatePlaylist,
    deletePlaylist: state.deletePlaylist,
    addSongsToPlaylist: state.addSongsToPlaylist,
    removeSongFromPlaylist: state.removeSongFromPlaylist,
  }));

  // Subscribe to playlist data changes via store selector
  const playlist = usePlaylistsStore((state) => state.playlistDetails[playlistId]);

  useEffect(() => {
    if (!playlistId) return;
    const cached = getPlaylistDetail(playlistId);
    if (!cached) {
      void fetchPlaylistDetail(playlistId);
    }
  }, [playlistId, fetchPlaylistDetail, getPlaylistDetail]);

  return {
    playlist,
    isLoading,
    error,
    updatePlaylist: (name: string) => updatePlaylist(playlistId, name),
    deletePlaylist: () => deletePlaylist(playlistId),
    addSongs: (songIds: SongId[]) => addSongsToPlaylist(playlistId, songIds),
    addSong: (songId: SongId) => addSongsToPlaylist(playlistId, [songId]),
    removeSong: (songId: SongId) => removeSongFromPlaylist(playlistId, songId),
  };
}
