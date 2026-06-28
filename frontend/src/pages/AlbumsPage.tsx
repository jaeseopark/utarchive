import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { AlbumSchema, type Album } from '../api/schemas';
import { z } from 'zod';

const AlbumsResponseSchema = z.array(AlbumSchema);
const PAGE_SIZE = 50;

function AlbumsPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    api
      .get(`/api/albums?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`, AlbumsResponseSchema)
      .then(setAlbums)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setIsLoading(false));
  }, [page]);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Albums</h2>
        <p className="mt-2 text-slate-400">Browse albums in the archive.</p>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-950/80 p-4 shadow-xl shadow-slate-950/20">
        {isLoading ? (
          <div className="min-h-[240px] flex items-center justify-center text-slate-400">Loading albums…</div>
        ) : error ? (
          <div className="min-h-[240px] rounded-2xl border border-rose-600 bg-rose-950/30 p-4 text-rose-100">Error loading albums: {error}</div>
        ) : albums.length === 0 ? (
          <div className="min-h-[240px] flex items-center justify-center text-slate-400">No albums found.</div>
        ) : (
          <table className="min-w-full text-left text-sm text-slate-200">
            <thead className="border-b border-slate-700 text-slate-400">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Artist</th>
                <th className="px-4 py-3">Year</th>
              </tr>
            </thead>
            <tbody>
              {albums.map((album) => (
                <tr key={album.id} className="border-b border-slate-800 last:border-b-0">
                  <td className="px-4 py-4">
                    <Link to={`/albums/${album.id}`} className="text-slate-100 transition hover:text-sky-300">
                      {album.title}
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-slate-300">{album.artistName ?? 'Unknown'}</td>
                  <td className="px-4 py-4 text-slate-300">{album.yearReleased ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-slate-300">
        <button
          type="button"
          className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 transition hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={page === 0}
          onClick={() => setPage((current) => Math.max(current - 1, 0))}
        >
          Previous
        </button>
        <span>Page {page + 1}</span>
        <button
          type="button"
          className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 transition hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={albums.length < PAGE_SIZE}
          onClick={() => setPage((current) => current + 1)}
        >
          Next
        </button>
      </div>
    </section>
  );
}

export default AlbumsPage;
