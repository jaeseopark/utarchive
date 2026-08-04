import { useEffect } from "react";
import { usePlaylistsStore } from "../stores/usePlaylistsStore";
import { type PlaylistId, type SongId } from "../types/brands";

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
  } = usePlaylistsStore();

  useEffect(() => {
    if (!playlistId) return;
    const cached = getPlaylistDetail(playlistId);
    if (!cached) {
      void fetchPlaylistDetail(playlistId);
    }
  }, [playlistId, fetchPlaylistDetail, getPlaylistDetail]);

  const playlist = getPlaylistDetail(playlistId);

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
