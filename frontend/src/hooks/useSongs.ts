import { useEffect } from "react";
import { useSongsStore } from "../stores/useSongsStore";

/**
 * Hook to fetch and manage songs list with pagination
 * Cache is kept fresh for 5 minutes. Navigating back to a cached page
 * shows cached data instantly without refetching.
 */
export function useSongs(page = 0) {
  const { songs, isLoading, error, pagination, fetchSongs } = useSongsStore();

  useEffect(() => {
    // Fetch if this is first load (no songs loaded yet)
    if (songs.length === 0 && !isLoading) {
      fetchSongs(page);
    }
  }, [page]); // Only depend on page - store handles cache TTL

  return { songs, isLoading, error, pagination, refetch: () => fetchSongs(page) };
}
