import { useEffect, useCallback } from "react";
import { useArtistSongsStore } from "../stores/useArtistSongsStore";
import { useSongsStore } from "../stores/useSongsStore";
import { type ArtistId } from "types";
import { type SongListItem } from "../api/schemas";

/**
 * Hook to fetch and manage songs for an artist
 */
export function useArtistSongs(artistId: ArtistId) {
  const { fetchArtistSongs, updateArtistSong } = useArtistSongsStore();
  const isLoading = useArtistSongsStore((state) => state.isLoading[artistId] ?? false);
  const error = useArtistSongsStore((state) => state.error[artistId] ?? null);
  const songIds = useArtistSongsStore((state) => state.songIdsByArtist[artistId]);
  
  // Subscribe to songs store to get updates when songs change
  const songs = useSongsStore((state) => {
    if (!songIds) {
      return undefined;
    }
    return songIds
      .map((id) => state.songs.find((song) => song.id === id))
      .filter((song) => song !== undefined && song !== null);
  });

  useEffect(() => {
    fetchArtistSongs(artistId).catch(() => {
      // Error is handled by the store
    });
  }, [artistId, fetchArtistSongs]);

  const updateSong = useCallback(
    (songId: string, updates: Partial<SongListItem>) => {
      updateArtistSong(songId, updates);
    },
    [updateArtistSong],
  );

  return { songs, isLoading, error, updateSong };
}
