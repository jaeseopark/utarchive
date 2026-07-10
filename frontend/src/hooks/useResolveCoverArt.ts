import { useEffect, useState, useCallback } from 'react';
import { useSongDetail } from './useSongDetail';
import { useAlbumDetail } from './useAlbumDetail';
import { type SongId, type AlbumId } from '../types/brands';

interface CoverArtOwner {
  songId?: SongId;
  albumId?: AlbumId;
}

/**
 * Hook to resolve cover art with automatic tree traversal
 * For songs: checks song itself → associated albums → parent recursively
 * For albums: uses album's cover art directly
 * Returns the resolved coverArtId for display
 */
export function useResolveCoverArt(owner: CoverArtOwner) {
  const { songId, albumId } = owner;
  const { song } = useSongDetail(songId!);
  const { album } = useAlbumDetail(albumId!);
  const [resolvedCoverArtId, setResolvedCoverArtId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Recursive function to walk up the parent chain
  const resolveFromParent = useCallback(
    async (parentId: string): Promise<string | null> => {
      try {
        const response = await fetch(`/api/songs/${parentId}`, {
          credentials: 'include',
        });
        if (!response.ok) return null;
        const parentSong = await response.json();

        // Check parent's own cover art
        if (parentSong.coverArtId) {
          return parentSong.coverArtId;
        }

        // Check parent's albums (if any)
        // For now, we'll skip this as it requires additional API calls
        // The backend's resolveSongCoverArtId does this automatically

        // Continue up the chain if parent has a parent
        if (parentSong.parentId) {
          return resolveFromParent(parentSong.parentId);
        }

        return null;
      } catch {
        return null;
      }
    },
    [],
  );

  useEffect(() => {
    if (albumId && album) {
      // For albums, use the album's cover art directly
      setResolvedCoverArtId(album.coverArtId ?? null);
    } else if (songId && song) {
      // For songs, start resolution process
      const resolve = async () => {
        setIsLoading(true);

        try {
          // Check song's own cover art
          if (song.coverArtId) {
            setResolvedCoverArtId(song.coverArtId);
            setIsLoading(false);
            return;
          }

          // If song doesn't have cover art, try to use backend's resolution
          // This handles album traversal and parent chain automatically
          try {
            const response = await fetch(`/api/songs/${songId}`, {
              credentials: 'include',
            });
            if (response.ok) {
              const freshSong = await response.json();
              if (freshSong.coverArtId) {
                setResolvedCoverArtId(freshSong.coverArtId);
                setIsLoading(false);
                return;
              }
            }
          } catch {
            // Continue to manual resolution
          }

          // Manual resolution: walk up parent chain
          if (song.parentId) {
            const resolved = await resolveFromParent(song.parentId);
            setResolvedCoverArtId(resolved);
          } else {
            setResolvedCoverArtId(null);
          }
        } finally {
          setIsLoading(false);
        }
      };

      resolve();
    } else {
      setResolvedCoverArtId(null);
      setIsLoading(false);
    }
  }, [songId, albumId, song, album, resolveFromParent]);

  return {
    resolvedCoverArtId,
    isLoading,
  };
}
