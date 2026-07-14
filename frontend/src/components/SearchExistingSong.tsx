import { useCallback, useEffect, useState, useMemo } from "react";
import { api } from "../api/client";
import { Button } from "./ui/Button";
import { z } from "zod";
import { useArtistsStore } from "../stores/useArtistsStore";
import { useAlbumsStore } from "../stores/useAlbumsStore";
import { useSongsStore } from "../stores/useSongsStore";
import { getArtistNames } from "../lib/artistNames";
import { formatDate } from "../lib/format";
import {
  SearchResponseSchema,
} from "../stores/useSearchStore";

/**
 * Format duration in seconds to MM:SS format
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || !Number.isFinite(seconds) || seconds < 0) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Enriched song result with all display metadata
 */
export interface EnrichedSongResult {
  id: string;
  title: string;
  artistIds: string[];
  duration: number | null;
  releasedAt: string | null;
  albumIds: string[];
  playbackEnabled: boolean;
}

interface SearchExistingSongResultsProps {
  onSongSelected: (songId: string) => void;
}

interface SearchExistingSongProps {
  isOpen: boolean;
  onClose: () => void;
  onSongSelected: (songId: string) => void;
}

/**
 * Core search results component for displaying and selecting existing songs
 * Handles all search logic, API calls, and store enrichment internally
 */
export function SearchExistingSongResults({
  onSongSelected,
}: SearchExistingSongResultsProps) {
  const [query, setQuery] = useState("");
  const [rawResults, setRawResults] = useState<z.infer<typeof SearchResponseSchema> | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get data from stores
  const artists = useArtistsStore((state) => state.artists);
  const albums = useAlbumsStore((state) => state.albums);
  const songDetails = useSongsStore((state) => state.songDetails);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setRawResults(null);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await api.get(
        `/api/search?q=${encodeURIComponent(searchQuery)}`,
        SearchResponseSchema,
      );
      setRawResults(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Search failed";
      setError(message);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) {
        handleSearch(query);
      } else {
        setRawResults(null);
      }
    }, 300); // Debounce search

    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  // Enrich search results with data from stores
  const enrichedResults = useMemo(() => {
    if (!rawResults) return [];

    const enriched: EnrichedSongResult[] = [];

    for (const songResult of rawResults.songs) {
      const songDetail = songDetails[songResult.id];
      if (songDetail) {
        enriched.push({
          id: songResult.id,
          title: songDetail.title,
          artistIds: songDetail.artistIds || [],
          duration: songDetail.duration ?? null,
          releasedAt: songDetail.releasedAt ?? null,
          albumIds: songDetail.albumIds || [],
          playbackEnabled: songDetail.playbackEnabled,
        });
      }
    }

    return enriched;
  }, [rawResults, songDetails]);

  const noResultsFound = !isSearching && query && enrichedResults.length === 0;

  return (
    <div className="space-y-4">
      {/* Title */}
      <h2 className="text-2xl font-semibold text-slate-900">Search for Song</h2>

      {/* Search Input */}
      <div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search songs by title, artist, etc..."
          className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm transition focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
          autoFocus
        />
      </div>

      {/* Error Message */}
      {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {/* Loading State */}
      {isSearching && <div className="py-8 text-center text-slate-600">Searching...</div>}

      {/* No Results */}
      {noResultsFound && <div className="py-8 text-center text-slate-600">No songs found</div>}

      {/* Search Results */}
      {enrichedResults.length > 0 && (
        <div className="space-y-3">
          {enrichedResults.map((song) => {
            const artistNames = getArtistNames(song.artistIds, artists);
            const albumNames = song.albumIds
              .map((albumId) => albums.find((a) => a.id === albumId)?.title)
              .filter(Boolean);
            const releaseDateFormatted = song.releasedAt ? formatDate(song.releasedAt) : null;

            return (
              <div
                key={song.id}
                className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 p-4 transition hover:bg-slate-50"
              >
                <div className="flex-1 min-w-0">
                  {/* Song Title */}
                  <p className="font-semibold text-slate-900 truncate">{song.title}</p>

                  {/* Metadata Row */}
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-600">
                    {/* Artists */}
                    {artistNames.length > 0 && (
                      <span className="truncate">{artistNames.join(", ")}</span>
                    )}

                    {/* Duration */}
                    {song.duration && <span>{formatDuration(song.duration)}</span>}

                    {/* Albums */}
                    {albumNames.length > 0 && (
                      <span className="truncate">Album: {albumNames.join(", ")}</span>
                    )}

                    {/* Release Date */}
                    {releaseDateFormatted && <span>{releaseDateFormatted}</span>}
                  </div>

                  {/* Playback Status */}
                  <div className="mt-2 flex items-center gap-2">
                    <div
                      className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${
                        song.playbackEnabled
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {song.playbackEnabled ? "✓ Playback available" : "✗ No audio"}
                    </div>
                  </div>
                </div>

                {/* Select Button */}
                <button
                  onClick={() => onSongSelected(song.id)}
                  className="flex-shrink-0 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-600"
                >
                  Select
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Modal wrapper around SearchExistingSongResults component
 * Adds modal UI styling and manages modal visibility
 */
export function SearchExistingSong({
  isOpen,
  onClose,
  onSongSelected,
}: SearchExistingSongProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <SearchExistingSongResults onSongSelected={onSongSelected} />

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 mt-6">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}




