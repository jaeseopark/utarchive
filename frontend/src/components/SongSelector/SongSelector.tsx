import { useCallback, useEffect, useState, useMemo } from "react";
import { api } from "../../api/client";
import { Button } from "../ui/Button";
import { z } from "zod";
import { useArtistsStore } from "../../stores/useArtistsStore";
import { useAlbumsStore } from "../../stores/useAlbumsStore";
import { useSongsStore } from "../../stores/useSongsStore";
import { getArtistNames } from "../../lib/artistNames";
import { formatDate } from "../../lib/format";
import {
  SearchResponseSchema,
} from "../../stores/useSearchStore";
import { SongSchema, type Song } from "../../api/schemas";

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

type SongSelectorProps = {
  disabledSongIds?: string[];
  onClose?: () => void;
} & (
  | { onSongSelected: (songId: string) => void }
  | { onSongsSelected: (songIds: string[]) => void }
);

/**
 * Core song selector component for displaying and selecting existing songs
 * Handles all search logic, API calls, and store enrichment internally
 * Supports both single-select (onSongSelected) and multi-select (onSongsSelected) modes
 */
export function SongSelector(props: SongSelectorProps) {
  const [query, setQuery] = useState("");
  const [rawResults, setRawResults] = useState<z.infer<typeof SearchResponseSchema> | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSongs, setSelectedSongs] = useState<Set<string>>(new Set());
  const [isSelectedExpanded, setIsSelectedExpanded] = useState(false);
  const [localSongCache, setLocalSongCache] = useState<Record<string, Song>>({});

  // Extract disabledSongIds from props (safe for both variants)
  const disabledSongIds = props.disabledSongIds ?? [];

  // Determine mode based on which handler is provided
  const isMultiSelect = "onSongsSelected" in props;

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

  // Fetch missing song details when search results change
  useEffect(() => {
    if (!rawResults) return;

    const missingIds = rawResults.songs
      .map((s) => s.id)
      .filter((id) => !songDetails[id] && !localSongCache[id]);

    if (missingIds.length === 0) return;

    // Fetch missing songs in parallel
    Promise.all(
      missingIds.map((id) =>
        api
          .get(`/api/songs/${id}`, SongSchema)
          .then((song) => {
            setLocalSongCache((prev) => ({
              ...prev,
              [id]: song,
            }));
          })
          .catch(() => {
            // Silently ignore fetch failures
          }),
      ),
    );
  }, [rawResults, songDetails, localSongCache]);

  // Enrich search results with data from stores and separate enabled/disabled
  const { enabledResults, disabledResults } = useMemo(() => {
    if (!rawResults) return { enabledResults: [], disabledResults: [] };

    const enabled: EnrichedSongResult[] = [];
    const disabled: EnrichedSongResult[] = [];
    const disabledSet = new Set(disabledSongIds);

    for (const songResult of rawResults.songs) {
      // Try to get song from global store first, then local cache
      const songDetail = songDetails[songResult.id] || localSongCache[songResult.id];
      if (songDetail) {
        const enriched: EnrichedSongResult = {
          id: songResult.id,
          title: songDetail.title,
          artistIds: songDetail.artistIds || [],
          duration: songDetail.duration ?? null,
          releasedAt: songDetail.releasedAt ?? null,
          albumIds: songDetail.albumIds || [],
          playbackEnabled: songDetail.playbackEnabled,
        };

        if (disabledSet.has(songResult.id)) {
          disabled.push(enriched);
        } else {
          enabled.push(enriched);
        }
      }
    }

    return { enabledResults: enabled, disabledResults: disabled };
  }, [rawResults, songDetails, localSongCache, disabledSongIds]);

  // Get enriched data for selected songs (for display in the selected panel)
  const enrichedSelectedSongs = useMemo(() => {
    const songs: EnrichedSongResult[] = [];
    for (const songId of selectedSongs) {
      const songDetail = songDetails[songId];
      if (songDetail) {
        songs.push({
          id: songId,
          title: songDetail.title,
          artistIds: songDetail.artistIds || [],
          duration: songDetail.duration ?? null,
          releasedAt: songDetail.releasedAt ?? null,
          albumIds: songDetail.albumIds || [],
          playbackEnabled: songDetail.playbackEnabled,
        });
      }
    }
    return songs;
  }, [selectedSongs, songDetails]);

  const noResultsFound = !isSearching && query && enabledResults.length === 0 && disabledResults.length === 0;

  const handleToggleSelection = (songId: string, isDisabled: boolean) => {
    // Prevent selection of disabled songs
    if (isDisabled) {
      return;
    }

    const newSelected = new Set(selectedSongs);
    if (newSelected.has(songId)) {
      newSelected.delete(songId);
    } else {
      newSelected.add(songId);
    }
    setSelectedSongs(newSelected);
  };

  const handleConfirm = () => {
    if (isMultiSelect && "onSongsSelected" in props) {
      props.onSongsSelected(Array.from(selectedSongs));
    }
  };

  const renderSongRow = (song: EnrichedSongResult, isDisabled: boolean = false) => {
    const artistNames = getArtistNames(song.artistIds, artists);
    const albumNames = song.albumIds
      .map((albumId) => albums.find((a) => a.id === albumId)?.title)
      .filter(Boolean);
    const releaseDateFormatted = song.releasedAt ? formatDate(song.releasedAt) : null;
    const isSelected = selectedSongs.has(song.id);

    return (
      <div
        key={song.id}
        className={`flex items-start justify-between gap-4 rounded-lg border p-4 transition ${
          isDisabled
            ? "border-slate-200 bg-slate-50 cursor-not-allowed opacity-60"
            : "border-slate-200 hover:bg-slate-50"
        }`}
      >
        <div className="flex gap-3 flex-1 min-w-0">
          {/* Checkbox for multi-select mode */}
          {isMultiSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => handleToggleSelection(song.id, isDisabled)}
              disabled={isDisabled}
              className="mt-1 flex-shrink-0"
            />
          )}

          <div className="flex-1 min-w-0">
            {/* Song Title */}
            <p className={`font-semibold truncate ${isDisabled ? "text-slate-500" : "text-slate-900"}`}>
              {song.title}
            </p>

            {/* Metadata Row */}
            <div className={`mt-2 flex flex-wrap gap-3 text-sm ${isDisabled ? "text-slate-500" : "text-slate-600"}`}>
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

            {/* Disabled Badge */}
            {isDisabled && (
              <div className="mt-2">
                <div className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-slate-200 text-slate-600">
                  ✗ Not available
                </div>
              </div>
            )}

            {/* Playback Status */}
            {!isDisabled && (
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
            )}
          </div>
        </div>

        {/* Single-select button */}
        {!isMultiSelect && "onSongSelected" in props && (
          <button
            onClick={() => {
              if (!isDisabled) {
                props.onSongSelected(song.id);
              }
            }}
            disabled={isDisabled}
            className={`flex-shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition ${
              isDisabled
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-sky-500 text-white hover:bg-sky-600"
            }`}
          >
            Select
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="space-y-4">
        {/* Title */}
        <h2 className="text-2xl font-semibold text-slate-900">
          {isMultiSelect ? "Select Songs" : "Search for Song"}
        </h2>

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

        {/* Selected Songs Panel (multi-select mode only) */}
        {isMultiSelect && enrichedSelectedSongs.length > 0 && (
          <div className="rounded-lg border border-slate-300 bg-slate-50">
            <button
              onClick={() => setIsSelectedExpanded(!isSelectedExpanded)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-100 transition rounded-lg"
            >
              <span className="font-medium text-slate-900">
                Selected ({selectedSongs.size})
              </span>
              <span className={`transition ${isSelectedExpanded ? "rotate-180" : ""}`}>▼</span>
            </button>

            {isSelectedExpanded && (
              <div className="border-t border-slate-300 p-4 space-y-2">
                {enrichedSelectedSongs.map((song) => {
                  const artistNames = getArtistNames(song.artistIds, artists);

                  return (
                    <div
                      key={song.id}
                      className="flex items-start gap-3 p-2 rounded hover:bg-slate-200 transition"
                    >
                      <input
                        type="checkbox"
                        checked={true}
                        onChange={() => handleToggleSelection(song.id, false)}
                        className="mt-1 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{song.title}</p>
                        <div className="text-xs text-slate-600 space-x-2">
                          {artistNames.length > 0 && (
                            <span>{artistNames.join(", ")}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Search Results */}
        {(enabledResults.length > 0 || disabledResults.length > 0) && (
          <div className="space-y-3">
            {/* Enabled results */}
            {enabledResults.map((song) => renderSongRow(song, false))}

            {/* Disabled section */}
            {disabledResults.length > 0 && (
              <div className="space-y-3">
                {enabledResults.length > 0 && (
                  <div className="pt-2 pb-1 border-t border-slate-300">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Not Available
                    </p>
                  </div>
                )}
                {disabledResults.map((song) => renderSongRow(song, true))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* OK Button (multi-select mode only) */}
      <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 mt-6">
        <Button onClick={handleConfirm}>
          OK
        </Button>
      </div>
    </>
  );
}
