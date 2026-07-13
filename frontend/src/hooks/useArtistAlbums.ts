import { useEffect, useState } from "react";
import { z } from "zod";
import { api } from "../api/client";
import { type ArtistId } from "../types/brands";

const AlbumPreviewSchema = z.object({
  id: z.string(),
  title: z.string(),
  yearReleased: z.number().nullable(),
  coverArtId: z.string().nullable(),
  createdAt: z.string(),
});

type AlbumPreview = z.infer<typeof AlbumPreviewSchema>;

const ArtistAlbumsResponseSchema = z.object({
  albums: z.array(AlbumPreviewSchema),
});

/**
 * Hook to fetch and manage albums for an artist
 */
export function useArtistAlbums(artistId: ArtistId) {
  const [albums, setAlbums] = useState<AlbumPreview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!artistId) return;

    const fetchAlbums = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await api.get(`/api/artists/${artistId}/albums`, ArtistAlbumsResponseSchema);
        setAlbums(data.albums);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch albums";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlbums();
  }, [artistId]);

  return { albums, isLoading, error };
}
