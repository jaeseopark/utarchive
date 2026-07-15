import { useEffect, useCallback } from "react";
import { useArtistSongsStore } from "../stores/useArtistSongsStore";
import { type ArtistId } from "../types/brands";
import { type SongListItem } from "../api/schemas";

/**
 * Hook to fetch and manage songs for an artist
 */
export function useArtistSongs(artistId: ArtistId) {
  const { fetchArtistSongs, getArtistSongs, updateArtistSong } = useArtistSongsStore();
  const isLoading = useArtistSongsStore((state) => state.isLoading[artistId] ?? false);
  const error = useArtistSongsStore((state) => state.error[artistId] ?? null);
  const songs = getArtistSongs(artistId);

  useEffect(() => {
    fetchArtistSongs(artistId).catch(() => {
      // Error is handled by the store
    });
  }, [artistId, fetchArtistSongs]);

  const updateSong = useCallback(
    (songId: string, updates: Partial<SongListItem>) => {
      updateArtistSong(artistId, songId, updates);
    },
    [artistId, updateArtistSong]
  );

  return { songs, isLoading, error, updateSong };
}
