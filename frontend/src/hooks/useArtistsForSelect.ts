import { useEffect, useState } from "react";
import { api } from "../api/client";
import { ArtistSchema, type Artist } from "../api/schemas";
import { z } from "zod";

const ArtistsResponseSchema = z.object({
  artists: z.array(ArtistSchema),
});

/**
 * Hook to fetch artists for dropdown selection in the Add Song Modal
 * Fetches a large number of artists for the dropdown
 *
 * why can't this be derived from local state? a refactor opportunity?
 */
export function useArtistsForSelect() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArtists = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch a large limit of artists for the dropdown (up to 200, backend max)
        const { artists } = await api.get("/api/artists?limit=200&offset=0", ArtistsResponseSchema);
        setArtists(artists);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch artists";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArtists();
  }, []);

  return { artists, isLoading, error };
}
