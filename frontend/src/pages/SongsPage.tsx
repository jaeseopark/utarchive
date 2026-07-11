import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSongs } from "../hooks/useSongs";
import { usePlayerStore } from "../stores/usePlayerStore";
import { useArtistsStore } from "../stores/useArtistsStore";
import { getArtistNames } from "../lib/artistNames";

const PAGE_SIZE = 50;

function SongsPage() {
  const [page, setPage] = useState(0);
  const { songs, isLoading, error } = useSongs(page);
  const artists = useArtistsStore((state) => state.artists);
  const { play } = usePlayerStore();

  const canPrevious = page > 0;

  const rows = useMemo(() => {
    const artistMap = new Map(artists.map((artist) => [artist.id, artist.name]));
    return songs.map((song) => {
      const artistNames = getArtistNames(song.artistIds ?? [], artistMap);
      return {
        ...song,
        artistText: artistNames.length ? artistNames.join(", ") : "Unknown",
        artistNames,
        releasedYear: song.releasedAt ? new Date(song.releasedAt).getFullYear() : null,
      };
    });
  }, [songs, artists]);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Songs</h2>
        <p className="mt-2 text-slate-600">Browse all songs in the archive.</p>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-300 bg-slate-50/80 p-4 shadow-xl shadow-slate-200/20">
        {isLoading ? (
          <div className="min-h-[240px] flex items-center justify-center text-slate-600">
            Loading songs…
          </div>
        ) : error ? (
          <div className="min-h-[240px] rounded-2xl border border-rose-400 bg-rose-100/30 p-4 text-rose-700">
            Error loading songs: {error}
          </div>
        ) : rows.length === 0 ? (
          <div className="min-h-[240px] flex items-center justify-center text-slate-600">
            No songs found.
          </div>
        ) : (
          <table className="min-w-full text-left text-sm text-slate-700">
            <thead className="border-b border-slate-300 text-slate-600">
              <tr>
                <th className="px-4 py-3 w-12"></th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Artist(s)</th>
                <th className="px-4 py-3">Released</th>
                <th className="px-4 py-3">Platform</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((song) => {
                const handlePlay = () => {
                  if (song.playbackEnabled) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-restricted-syntax
                    play(song as any);
                  }
                };

                return (
                  <tr key={song.id} className="border-b border-slate-300 last:border-b-0">
                    <td className="px-4 py-4">
                      {song.playbackEnabled ? (
                        <button
                          type="button"
                          onClick={handlePlay}
                          className="flex items-center justify-center w-6 h-6 rounded transition text-emerald-600 hover:bg-emerald-100"
                          title="Play song"
                        >
                          ▶
                        </button>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        to={`/songs/${song.id}`}
                        className="font-medium text-slate-900 transition hover:text-sky-500"
                      >
                        {song.title}
                        {song.playbackEnabled && (
                          <span className="ml-2 text-xs font-semibold text-emerald-600">★</span>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {song.artistNames && song.artistNames.length > 0
                        ? song.artistNames.map((name, index) => (
                            <span key={index}>
                              {index > 0 && ", "}
                              <Link
                                to={`/artists/${song.artistIds?.[index]}`}
                                className="text-sky-500 hover:underline"
                              >
                                {name}
                              </Link>
                            </span>
                          ))
                        : "Unknown"}
                    </td>
                    <td className="px-4 py-4 text-slate-700">{song.releasedYear ?? "—"}</td>
                    <td className="px-4 py-4 text-slate-700">{song.platformId ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-slate-700">
        <button
          type="button"
          className="rounded-2xl border border-slate-400 bg-slate-100 px-4 py-2 transition hover:border-slate-500 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canPrevious}
          onClick={() => setPage((current) => Math.max(current - 1, 0))}
        >
          Previous
        </button>
        <span>Page {page + 1}</span>
        <button
          type="button"
          className="rounded-2xl border border-slate-400 bg-slate-100 px-4 py-2 transition hover:border-slate-500 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={songs.length < PAGE_SIZE}
          onClick={() => setPage((current) => current + 1)}
        >
          Next
        </button>
      </div>
    </section>
  );
}

export default SongsPage;
