import { FormEvent, useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { Button } from "../components/ui/Button";
import { z } from "zod";
import { useArtistsStore } from "../stores/useArtistsStore";
import { useAlbumsStore } from "../stores/useAlbumsStore";
import { useSongsStore } from "../stores/useSongsStore";
import { getArtistNames } from "../lib/artistNames";

const SearchSongSchema = z.object({
  id: z.string().uuid(),
});

const SearchArtistSchema = z.object({
  id: z.string().uuid(),
});

const SearchAlbumSchema = z.object({
  id: z.string().uuid(),
});

const SearchResponseSchema = z.object({
  songs: z.array(SearchSongSchema),
  artists: z.array(SearchArtistSchema),
  albums: z.array(SearchAlbumSchema),
});

type SearchResponse = z.infer<typeof SearchResponseSchema>;

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(queryParam);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const artists = useArtistsStore((state) => state.artists);
  const albums = useAlbumsStore((state) => state.albums);
  const songDetails = useSongsStore((state) => state.songDetails);

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

  const noResults =
    !isLoading &&
    !error &&
    hasQuery &&
    results &&
    results.songs.length === 0 &&
    results.artists.length === 0 &&
    results.albums.length === 0;

  // Enrich search results with data from stores
  const enrichedResults = useMemo(() => {
    if (!results) return null;

    return {
      songs: results.songs
        .map((songResult) => {
          const song = songDetails[songResult.id];
          return song
            ? {
                id: songResult.id,
                title: song.title,
                artistIds: song.artistIds || [],
                playbackEnabled: song.playbackEnabled,
              }
            : null;
        })
        .filter((song) => song !== null),
      artists: results.artists
        .map((artistResult) => {
          const artist = artists.find((a) => a.id === artistResult.id);
          return artist ? { id: artistResult.id, name: artist.name } : null;
        })
        .filter((artist) => artist !== null),
      albums: results.albums
        .map((albumResult) => {
          const album = albums.find((a) => a.id === albumResult.id);
          return album ? { id: albumResult.id, title: album.title } : null;
        })
        .filter((album) => album !== null),
    };
  }, [results, songDetails, artists, albums]);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Search</h2>
        <p className="mt-2 text-slate-600">Search songs, artists, and albums across the archive.</p>
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
          className="min-w-0 rounded-3xl border border-slate-400 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
        />
        <Button type="submit">Search</Button>
      </form>

      {isLoading ? (
        <div className="rounded-3xl border border-slate-300 bg-slate-50/80 p-8 text-center text-slate-600">
          Loading results…
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-400 bg-rose-100/30 p-6 text-rose-700">
          Error loading search results: {error}
        </div>
      ) : !hasQuery ? (
        <div className="rounded-3xl border border-slate-300 bg-slate-50/80 p-8 text-slate-600">
          Enter a search query to see songs, artists, and albums.
        </div>
      ) : noResults ? (
        <div className="rounded-3xl border border-slate-300 bg-slate-50/80 p-8 text-slate-600">
          No results for "{trimmedQuery}".
        </div>
      ) : (
        enrichedResults && (
          <div className="space-y-8">
            {enrichedResults.songs.length > 0 ? (
              <section className="rounded-3xl border border-slate-300 bg-slate-50/80 p-6 shadow-xl shadow-slate-200/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-slate-900">Songs</h3>
                  <span className="text-sm text-slate-600">{enrichedResults.songs.length} results</span>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm text-slate-700">
                    <thead className="border-b border-slate-300 text-slate-600\">
                      <tr>
                        <th className="px-4 py-3">Title</th>
                        <th className="px-4 py-3">Artist</th>
                        <th className="px-4 py-3">Playback Enabled</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enrichedResults.songs.map((song) => {
                        const artistNames = getArtistNames(song.artistIds, artists);
                        return (
                          <tr key={song.id} className="border-b border-slate-300 last:border-b-0">
                            <td className="px-4 py-4">
                              <Link
                                to={`/songs/${song.id}`}
                                className="text-slate-900 transition hover:text-sky-500"
                              >
                                {song.title}
                              </Link>
                            </td>
                            <td className="px-4 py-4 text-slate-700">
                              {artistNames.length > 0 ? (
                                artistNames.map((name, idx) => (
                                  <span key={idx}>
                                    {idx > 0 && ", "}
                                    {name}
                                  </span>
                                ))
                              ) : (
                                "Unknown"
                              )}
                            </td>
                            <td className="px-4 py-4 text-slate-700">
                              {song.playbackEnabled ? "Yes" : "No"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

            {enrichedResults.artists.length > 0 ? (
              <section className="rounded-3xl border border-slate-300 bg-slate-50/80 p-6 shadow-xl shadow-slate-200/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-slate-900">Artists</h3>
                  <span className="text-sm text-slate-600">{enrichedResults.artists.length} results</span>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm text-slate-700">
                    <thead className="border-b border-slate-300 text-slate-600">
                      <tr>
                        <th className="px-4 py-3">Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enrichedResults.artists.map((artist) => (
                        <tr key={artist.id} className="border-b border-slate-300 last:border-b-0">
                          <td className="px-4 py-4">
                            <Link
                              to={`/artists/${artist.id}`}
                              className="text-slate-900 transition hover:text-sky-500"
                            >
                              {artist.name}
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

            {enrichedResults.albums.length > 0 ? (
              <section className="rounded-3xl border border-slate-300 bg-slate-50/80 p-6 shadow-xl shadow-slate-200/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-slate-900">Albums</h3>
                  <span className="text-sm text-slate-600">{enrichedResults.albums.length} results</span>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm text-slate-700">
                    <thead className="border-b border-slate-300 text-slate-600">
                      <tr>
                        <th className="px-4 py-3">Title</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enrichedResults.albums.map((album) => (
                        <tr key={album.id} className="border-b border-slate-300 last:border-b-0">
                          <td className="px-4 py-4">
                            <Link
                              to={`/albums/${album.id}`}
                              className="text-slate-900 transition hover:text-sky-500"
                            >
                              {album.title}
                            </Link>
                          </td>
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
