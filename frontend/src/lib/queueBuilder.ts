import { api } from "../api/client";
import { type Song, AlbumDetailSchema } from "../api/schemas";
import { PlaylistDetailSchema } from "../stores/usePlaylistsStore";

/**
 * Build a queue from an album, filtering by playbackEnabled
 * Returns songs in track order
 * Note: Album tracks only return partial song info (id, title)
 * so we can't filter by playbackEnabled here. Instead, we return
 * all registered songs and the player will handle the filtering.
 */
export async function buildAlbumQueue(
  albumId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  try {
    const album = await api.get(`/api/albums/${albumId}`, AlbumDetailSchema);

    // Extract songs from tracks - only return registered songs
    const songs = (album.tracks || [])
      .filter((track) => track.isRegistered && track.song)
      // eslint-disable-next-line no-restricted-syntax
      .map((track) => track.song as Song);

    return songs;
  } catch (err) {
    console.error(`Failed to build album queue for ${albumId}:`, err);
    return [];
  }
}

/**
 * Build a queue from a playlist, filtering by playbackEnabled
 * Returns songs in playlist order
 */
export async function buildPlaylistQueue(playlistId: string): Promise<Song[]> {
  try {
    const playlist = await api.get(`/api/playlists/${playlistId}`, PlaylistDetailSchema);

    // Filter by playbackEnabled, preserve playlist order
    const playableSongs = (playlist.songs || [])
      // eslint-disable-next-line no-restricted-syntax
      .map((item) => item.song as Song)
      .filter((song: Song) => song.playbackEnabled === true);

    return playableSongs;
  } catch (err) {
    console.error(`Failed to build playlist queue for ${playlistId}:`, err);
    return [];
  }
}
