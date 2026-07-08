import { useEffect, useRef } from 'react';
import { useSession } from '../context/SessionContext';
import { useArtistsStore } from '../stores/useArtistsStore';
import { usePlaylistsStore } from '../stores/usePlaylistsStore';
import { useSongsStore } from '../stores/useSongsStore';
import { useAlbumsStore } from '../stores/useAlbumsStore';

/**
 * Initialize frontend data on app boot.
 * 
 * Hydrates stores in dependency order:
 * - Level 0 (parallel): Artists, Playlists (no dependencies)
 * - Level 1 (parallel): Songs, Albums (depend on Level 0)
 * 
 * Fetches all pages for each entity since the database is small.
 */
export function useAppInitialization() {
  const { user } = useSession();
  const initRef = useRef(false);

  const artistsStore = useArtistsStore();
  const playlistsStore = usePlaylistsStore();
  const songsStore = useSongsStore();
  const albumsStore = useAlbumsStore();

  useEffect(() => {
    // Only initialize once and only when user is authenticated
    if (!user || initRef.current) {
      return;
    }
    initRef.current = true;

    const initializeApp = async () => {
      try {
        // Level 0: Load foundation entities (parallel)
        await Promise.all([
          artistsStore.fetchAllArtists(),
          playlistsStore.fetchPlaylists(),
        ]);

        // Level 1: Load primary entities (parallel, depends on Level 0)
        await Promise.all([
          songsStore.fetchAllSongs(),
          albumsStore.fetchAllAlbums(),
        ]);
      } catch (error) {
        console.error('Failed to initialize app data:', error);
      }
    };

    initializeApp();
  }, [user, artistsStore, playlistsStore, songsStore, albumsStore]);
}
