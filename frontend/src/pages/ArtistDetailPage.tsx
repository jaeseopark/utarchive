import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { SongListItemSchema, type SongListItem } from '../api/schemas';
import { z } from 'zod';
import UrlMap from '../components/UrlMap';
import { combineAliases, formatDate } from '../lib/format';
import { useArtistDetail } from '../hooks/useArtistDetail';
import { PlaybackEnabledToggle } from '../components/PlaybackEnabledToggle';

const ArtistSongsSchema = z.array(SongListItemSchema);

function ArtistDetailPage() {
  const { id } = useParams<'id'>();
  const { artist, isLoading: artistLoading, error: artistError } = useArtistDetail(id || '');
  const [songs, setSongs] = useState<SongListItem[]>([]);
  const [songsLoading, setSongsLoading] = useState(false);
  const [songsError, setSongsError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    setSongsLoading(true);
    setSongsError(null);

    api.get(`/api/artists/${id}/songs`, ArtistSongsSchema)
      .then((artistSongs) => {
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
      .catch((err) => setSongsError(err instanceof Error ? err.message : String(err)))
      .finally(() => setSongsLoading(false));
  }, [id]);

  const handlePlaybackEnabledChange = (songId: string, newPlaybackEnabled: boolean) => {
    setSongs((prev) =>
      prev.map((song) => (song.id === songId ? { ...song, playbackEnabled: newPlaybackEnabled } : song))
    );
  };

  const isLoading = artistLoading || songsLoading;
  const error = artistError || songsError;
  const aliasText = useMemo(() => combineAliases(artist?.aliases), [artist?.aliases]);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Artist detail</h2>
        <p className="mt-2 text-slate-600">View metadata and songs for this artist.</p>
      </div>

      {isLoading ? (
        <div className="rounded-3xl border border-slate-300 bg-slate-50/80 p-8 text-center text-slate-600">Loading artist…</div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-400 bg-rose-100/30 p-6 text-rose-700">Error loading artist: {error}</div>
      ) : artist ? (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-300 bg-slate-50/80 p-6 shadow-xl shadow-slate-200/20">
            <h1 className="text-3xl font-semibold text-slate-900">{artist.name}</h1>
            {aliasText ? <p className="mt-2 text-slate-700">Aliases: {aliasText}</p> : null}
            {artist.description ? <p className="mt-4 whitespace-pre-wrap text-slate-600">{artist.description}</p> : null}
            <div className="mt-6">
              <UrlMap urls={artist.urls} />
            </div>
          </div>

          <section className="rounded-3xl border border-slate-300 bg-slate-50/80 p-6 shadow-xl shadow-slate-200/20">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">Songs</h3>
              <span className="text-sm text-slate-600">Sorted by released date</span>
            </div>

            {songs.length === 0 ? (
              <p className="mt-4 text-slate-600">No songs found for this artist.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm text-slate-700">
                  <thead className="border-b border-slate-300 text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Released</th>
                      <th className="px-4 py-3">Playback Enabled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {songs.map((song) => (
                      <tr key={song.id} className="border-b border-slate-300 last:border-b-0">
                        <td className="px-4 py-4">
                          <Link to={`/songs/${song.id}`} className="text-slate-900 transition hover:text-sky-500">
                            {song.title}
                          </Link>
                        </td>
                        <td className="px-4 py-4 text-slate-700">{formatDate(song.releasedAt) ?? '—'}</td>
                        <td className="px-4 py-4 align-middle">
                          <div className="h-6">
                            <PlaybackEnabledToggle
                              songId={song.id}
                              isEnabled={song.playbackEnabled}
                              onPlaybackEnabledChange={handlePlaybackEnabledChange}
                            />
                          </div>
                        </td>
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
