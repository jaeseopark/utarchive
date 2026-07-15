import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useArtistsStore } from "../stores/useArtistsStore";

function ArtistsPage() {
  const artists = useArtistsStore((state) => state.artists);
  const isLoaded = useArtistsStore((state) => state.isLoaded);
  const error = useArtistsStore((state) => state.error);

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
        {!isLoaded ? (
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


    </section>
  );
}

export default ArtistsPage;
