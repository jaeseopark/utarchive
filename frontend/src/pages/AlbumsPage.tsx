import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAlbums } from "../hooks/useAlbums";
import { useArtistsStore } from "../stores/useArtistsStore";
import { getArtistNames } from "../lib/artistNames";

const PAGE_SIZE = 50;

function AlbumsPage() {
  const [page, setPage] = useState(0);
  const { albums, isLoading, error } = useAlbums(page);
  const artists = useArtistsStore((state) => state.artists);

  const albumsWithArtistNames = useMemo(() => {
    const artistMap = new Map(artists.map((artist) => [artist.id, artist.name]));
    return albums.map((album) => ({
      ...album,
      artistNames: getArtistNames(album.artistIds ?? [], artistMap),
    }));
  }, [albums, artists]);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Albums</h2>
        <p className="mt-2 text-slate-600">Browse albums in the archive.</p>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-300 bg-slate-50/80 p-4 shadow-xl shadow-slate-200/20">
        {isLoading ? (
          <div className="min-h-[240px] flex items-center justify-center text-slate-600">
            Loading albums…
          </div>
        ) : error ? (
          <div className="min-h-[240px] rounded-2xl border border-rose-400 bg-rose-100/30 p-4 text-rose-700">
            Error loading albums: {error}
          </div>
        ) : albums.length === 0 ? (
          <div className="min-h-[240px] flex items-center justify-center text-slate-600">
            No albums found.
          </div>
        ) : (
          <table className="min-w-full text-left text-sm text-slate-700">
            <thead className="border-b border-slate-300 text-slate-600">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Artist</th>
                <th className="px-4 py-3">Year</th>
              </tr>
            </thead>
            <tbody>
              {albumsWithArtistNames.map((album) => (
                <tr key={album.id} className="border-b border-slate-300 last:border-b-0">
                  <td className="px-4 py-4">
                    <Link
                      to={`/albums/${album.id}`}
                      className="text-slate-900 transition hover:text-sky-500"
                    >
                      {album.title}
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-slate-700">
                    {album.artistNames.length > 0
                      ? album.artistNames.map((name, index) => (
                          <span key={index}>
                            {index > 0 && ", "}
                            <Link
                              to={`/artists/${album.artistIds[index]}`}
                              className="text-sky-500 hover:underline"
                            >
                              {name}
                            </Link>
                          </span>
                        ))
                      : "Unknown"}
                  </td>
                  <td className="px-4 py-4 text-slate-700">{album.yearReleased ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-slate-700">
        <button
          type="button"
          className="rounded-2xl border border-slate-400 bg-slate-200 px-4 py-2 transition hover:border-slate-500 hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={page === 0}
          onClick={() => setPage((current) => Math.max(current - 1, 0))}
        >
          Previous
        </button>
        <span>Page {page + 1}</span>
        <button
          type="button"
          className="rounded-2xl border border-slate-400 bg-slate-200 px-4 py-2 transition hover:border-slate-500 hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={albumsWithArtistNames.length < PAGE_SIZE}
          onClick={() => setPage((current) => current + 1)}
        >
          Next
        </button>
      </div>
    </section>
  );
}

export default AlbumsPage;
