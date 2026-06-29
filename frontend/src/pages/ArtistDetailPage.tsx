import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { ArtistSchema, SongListItemSchema, type Artist, type SongListItem } from '../api/schemas';
import { z } from 'zod';
import UrlMap from '../components/UrlMap';
import { combineAliases, formatDate } from '../lib/format';

const ArtistSongsSchema = z.array(SongListItemSchema);

function ArtistDetailPage() {
  const { id } = useParams<'id'>();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [songs, setSongs] = useState<SongListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    Promise.all([
      api.get(`/api/artists/${id}`, ArtistSchema),
      api.get(`/api/artists/${id}/songs`, ArtistSongsSchema),
    ])
      .then(([artistData, artistSongs]) => {
        setArtist(artistData);
        setSongs(
          [...artistSongs].sort((a, b) => {
            if (a.releasedAt === b.releasedAt) {
              return a.title.localeCompare(b.title);
            }
            if (!a.releasedAt) return 1;
            if (!b.releasedAt) return -1;
            return b.releasedAt.localeCompare(a.releasedAt);
          }),
        );
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setIsLoading(false));
  }, [id]);

  const aliasText = useMemo(() => combineAliases(artist?.aliases), [artist?.aliases]);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Artist detail</h2>
        <p className="mt-2 text-slate-400">View metadata and songs for this artist.</p>
      </div>

      {isLoading ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-8 text-center text-slate-400">Loading artist…</div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-600 bg-rose-950/30 p-6 text-rose-100">Error loading artist: {error}</div>
      ) : artist ? (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-xl shadow-slate-950/20">
            <h1 className="text-3xl font-semibold text-slate-100">{artist.name}</h1>
            {aliasText ? <p className="mt-2 text-slate-300">Aliases: {aliasText}</p> : null}
            {artist.description ? <p className="mt-4 whitespace-pre-wrap text-slate-200">{artist.description}</p> : null}
            <div className="mt-6">
              <UrlMap urls={artist.urls} />
            </div>
          </div>

          <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-xl shadow-slate-950/20">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-100">Songs</h3>
              <span className="text-sm text-slate-400">Sorted by released date</span>
            </div>

            {songs.length === 0 ? (
              <p className="mt-4 text-slate-400">No songs found for this artist.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm text-slate-200">
                  <thead className="border-b border-slate-700 text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Released</th>
                      <th className="px-4 py-3">Preferred</th>
                      <th className="px-4 py-3">Play Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {songs.map((song) => (
                      <tr key={song.id} className="border-b border-slate-800 last:border-b-0">
                        <td className="px-4 py-4">
                          <Link to={`/songs/${song.id}`} className="text-slate-100 transition hover:text-sky-300">
                            {song.title}
                          </Link>
                        </td>
                        <td className="px-4 py-4 text-slate-300">{formatDate(song.releasedAt) ?? '—'}</td>
                        <td className="px-4 py-4 text-slate-300">{song.preferred ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
}

export default ArtistDetailPage;
