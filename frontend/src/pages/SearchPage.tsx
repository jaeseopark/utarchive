import { FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Button } from '../components/ui/Button';
import { z } from 'zod';

const SearchSongSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  artistId: z.string().nullable().optional(),
  preferred: z.boolean(),
});

const SearchArtistSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  aliases: z.array(z.string()).optional().default([]),
});

const SearchAlbumSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  artistIds: z.array(z.string().uuid()).optional().default([]),
  artistNames: z.array(z.string()).optional().default([]),
  yearReleased: z.number().int().nullable().optional(),
});

const SearchResponseSchema = z.object({
  songs: z.array(SearchSongSchema),
  artists: z.array(SearchArtistSchema),
  albums: z.array(SearchAlbumSchema),
});

type SearchResponse = z.infer<typeof SearchResponseSchema>;

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(queryParam);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedQuery = queryParam.trim();
  const hasQuery = trimmedQuery.length > 0;

  useEffect(() => {
    setQuery(queryParam);
    const searchTerm = queryParam.trim();

    if (!searchTerm) {
      setResults(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    api
      .get(`/api/search?q=${encodeURIComponent(searchTerm)}`, SearchResponseSchema)
      .then(setResults)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setIsLoading(false));
  }, [queryParam]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuery = query.trim();
    setSearchParams(nextQuery ? { q: nextQuery } : {});
  };

  const noResults = !isLoading && !error && hasQuery && results && results.songs.length === 0 && results.artists.length === 0 && results.albums.length === 0;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Search</h2>
        <p className="mt-2 text-slate-400">Search songs, artists, and albums across the archive.</p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label htmlFor="search-query" className="sr-only">
          Search query
        </label>
        <input
          id="search-query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search songs, artists, albums"
          className="min-w-0 rounded-3xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
        />
        <Button type="submit">Search</Button>
      </form>

      {isLoading ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-8 text-center text-slate-400">Loading results…</div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-600 bg-rose-950/30 p-6 text-rose-100">Error loading search results: {error}</div>
      ) : !hasQuery ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-8 text-slate-400">Enter a search query to see songs, artists, and albums.</div>
      ) : noResults ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-8 text-slate-400">No results for &ldquo;{trimmedQuery}&rdquo;.</div>
      ) : (
        results && (
          <div className="space-y-8">
            {results.songs.length > 0 ? (
              <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-xl shadow-slate-950/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-slate-100">Songs</h3>
                  <span className="text-sm text-slate-400">{results.songs.length} results</span>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm text-slate-200">
                    <thead className="border-b border-slate-700 text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Title</th>
                        <th className="px-4 py-3">Artist</th>
                        <th className="px-4 py-3">Preferred</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.songs.map((song) => (
                        <tr key={song.id} className="border-b border-slate-800 last:border-b-0">
                          <td className="px-4 py-4">
                            <Link to={`/songs/${song.id}`} className="text-slate-100 transition hover:text-sky-300">
                              {song.title}
                            </Link>
                          </td>
                          <td className="px-4 py-4 text-slate-300">
                            {song.artistId ? (
                              <Link to={`/artists/${song.artistId}`} className="text-sky-300 hover:underline">
                                Artist
                              </Link>
                            ) : (
                              'Unknown'
                            )}
                          </td>
                          <td className="px-4 py-4 text-slate-300">{song.preferred ? 'Yes' : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

            {results.artists.length > 0 ? (
              <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-xl shadow-slate-950/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-slate-100">Artists</h3>
                  <span className="text-sm text-slate-400">{results.artists.length} results</span>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm text-slate-200">
                    <thead className="border-b border-slate-700 text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Aliases</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.artists.map((artist) => (
                        <tr key={artist.id} className="border-b border-slate-800 last:border-b-0">
                          <td className="px-4 py-4">
                            <Link to={`/artists/${artist.id}`} className="text-slate-100 transition hover:text-sky-300">
                              {artist.name}
                            </Link>
                          </td>
                          <td className="px-4 py-4 text-slate-300">{artist.aliases.join(', ') || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

            {results.albums.length > 0 ? (
              <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-xl shadow-slate-950/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-slate-100">Albums</h3>
                  <span className="text-sm text-slate-400">{results.albums.length} results</span>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm text-slate-200">
                    <thead className="border-b border-slate-700 text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Title</th>
                        <th className="px-4 py-3">Artist</th>
                        <th className="px-4 py-3">Year</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.albums.map((album) => (
                        <tr key={album.id} className="border-b border-slate-800 last:border-b-0">
                          <td className="px-4 py-4">
                            <Link to={`/albums/${album.id}`} className="text-slate-100 transition hover:text-sky-300">
                              {album.title}
                            </Link>
                          </td>
                          <td className="px-4 py-4 text-slate-300">
                            {album.artistNames.length > 0 ? (
                              album.artistNames.map((name, index) => (
                                <span key={index}>
                                  {index > 0 && ', '}
                                  <Link to={`/artists/${album.artistIds[index]}`} className="text-sky-300 hover:underline">
                                    {name}
                                  </Link>
                                </span>
                              ))
                            ) : (
                              'Unknown'
                            )}
                          </td>
                          <td className="px-4 py-4 text-slate-300">{album.yearReleased ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}
          </div>
        )
      )}
    </section>
  );
}

export default SearchPage;
