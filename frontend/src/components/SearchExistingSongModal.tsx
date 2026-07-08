import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { Button } from './ui/Button';
import { z } from 'zod';

const SearchResponseSchema = z.object({
  songs: z.array(z.object({
    id: z.string().uuid(),
    title: z.string(),
    artistId: z.string().nullable().optional(),
    playbackEnabled: z.boolean(),
  })),
  artists: z.array(z.any()),
  albums: z.array(z.any()),
});

interface SearchExistingSongModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSongSelected: (childSongId: string) => void;
  isLinking?: boolean;
}

export function SearchExistingSongModal({
  isOpen,
  onClose,
  onSongSelected,
  isLinking = false,
}: SearchExistingSongModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<z.infer<typeof SearchResponseSchema> | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults(null);
        return;
      }

      setIsSearching(true);
      setError(null);

      try {
        const response = await api.get(
          `/api/search?q=${encodeURIComponent(searchQuery)}`,
          SearchResponseSchema,
        );
        setResults(response);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Search failed';
        setError(message);
      } finally {
        setIsSearching(false);
      }
    },
    [],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) {
        handleSearch(query);
      } else {
        setResults(null);
      }
    }, 300); // Debounce search

    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="mb-4 text-2xl font-semibold text-slate-900">
          {isLinking ? 'Link Existing Song as Child' : 'Search for Song'}
        </h2>

        {/* Search Input */}
        <div className="mb-6">
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
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isSearching && (
          <div className="py-8 text-center text-slate-600">
            Searching...
          </div>
        )}

        {/* No Results */}
        {!isSearching && query && results && results.songs.length === 0 && (
          <div className="py-8 text-center text-slate-600">
            No songs found
          </div>
        )}

        {/* Search Results */}
        {results && results.songs.length > 0 && (
          <div className="space-y-2 mb-6">
            {results.songs.map((song) => (
              <div
                key={song.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 p-3 transition hover:bg-slate-50"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{song.title}</p>
                  {song.artistId && (
                    <p className="text-sm text-slate-600 truncate">
                      Artist ID: {song.artistId}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onSongSelected(song.id)}
                  disabled={isLinking}
                  className="ml-4 flex-shrink-0 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLinking ? 'Linking...' : 'Select'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
