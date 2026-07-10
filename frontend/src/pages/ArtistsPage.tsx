import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useArtists } from "../hooks/useArtists";

const PAGE_SIZE = 50;

function ArtistsPage() {
  const [page, setPage] = useState(0);
  const { artists, isLoading, error } = useArtists(page);

  const canPrevious = page > 0;

  const rows = useMemo(
    () =>
      artists.map((artist) => ({
        ...artist,
        aliasText: artist.aliases?.length ? artist.aliases.join(", ") : "—",
        songCount: artist.songCount ?? 0,
      })),
    [artists],
  );

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Artists</h2>
        <p className="mt-2 text-slate-600">Browse all artists in the archive.</p>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-300 bg-slate-50/80 p-4 shadow-xl shadow-slate-200/20">
        {isLoading ? (
          <div className="min-h-[240px] flex items-center justify-center text-slate-600">
            Loading artists…
          </div>
        ) : error ? (
          <div className="min-h-[240px] rounded-2xl border border-rose-400 bg-rose-100/30 p-4 text-rose-700">
            Error loading artists: {error}
          </div>
        ) : rows.length === 0 ? (
          <div className="min-h-[240px] flex items-center justify-center text-slate-600">
            No artists found.
          </div>
        ) : (
          <table className="min-w-full text-left text-sm text-slate-700">
            <thead className="border-b border-slate-300 text-slate-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Aliases</th>
                <th className="px-4 py-3">Song Count</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((artist) => (
                <tr key={artist.id} className="border-b border-slate-300 last:border-b-0">
                  <td className="px-4 py-4">
                    <Link
                      to={`/artists/${artist.id}`}
                      className="font-medium text-slate-900 transition hover:text-sky-500"
                    >
                      {artist.name}
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-slate-700">{artist.aliasText}</td>
                  <td className="px-4 py-4 text-slate-700">{artist.songCount}</td>
                </tr>
              ))}
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
          disabled={artists.length < PAGE_SIZE}
          onClick={() => setPage((current) => current + 1)}
        >
          Next
        </button>
      </div>
    </section>
  );
}

export default ArtistsPage;
