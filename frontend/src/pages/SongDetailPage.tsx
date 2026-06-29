import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import {
  AnalyticsListenResponseSchema,
  SongSchema,
  SongTreeSchema,
  type SongTree,
  type SongTreeNode,
} from '../api/schemas';
import { z } from 'zod';
import { Button } from '../components/ui/Button';
import FamilyTree from '../components/FamilyTree';
import { formatDate, formatTrimRange } from '../lib/format';

const SongTreeResponseSchema = SongTreeSchema;

function SongDetailPage() {
  const { id } = useParams<'id'>();
  const [song, setSong] = useState<z.infer<typeof SongSchema> | null>(null);
  const [tree, setTree] = useState<SongTree | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [listenedSeconds, setListenedSeconds] = useState(0);
  const [analyticsMessage, setAnalyticsMessage] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    Promise.all([
      api.get(`/api/songs/${id}`, SongSchema),
      api.get(`/api/songs/${id}/tree`, SongTreeResponseSchema),
    ])
      .then(([songData, songTree]) => {
        setSong(songData);
        setTree(songTree);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setIsLoading(false));
  }, [id]);

  const artists = useMemo(() => {
    if (!song) return [];
    return song.artistIds.map((artistId, index) => ({
      id: artistId,
      name: song.artistNames?.[index] ?? 'Unknown',
    }));
  }, [song]);

  useEffect(() => {
    if (!isListening) {
      return;
    }

    const interval = window.setInterval(() => {
      setListenedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isListening]);

  const sendAnalytics = async (stopReason: 'pause' | 'ended') => {
    if (!song || !startedAt) {
      return;
    }

    const durationSeconds = listenedSeconds;
    const trackDuration = song.duration ?? (durationSeconds || 1);
    const playbackPercent = Math.min(100, (durationSeconds / trackDuration) * 100);

    try {
      await api.post(
        '/api/analytics/listen',
        {
          songId: song.id,
          startedAt: startedAt.toISOString(),
          durationSeconds,
          playbackPercent,
          userAgent: navigator.userAgent,
        },
        AnalyticsListenResponseSchema
      );
      setAnalyticsMessage(
        `Recorded listening session (${stopReason}) — ${durationSeconds}s, ${Math.round(playbackPercent)}%`
      );
    } catch (err) {
      console.error('Analytics error', err);
      setAnalyticsMessage('Failed to record listening analytics.');
    } finally {
      setStartedAt(null);
      setListenedSeconds(0);
      setIsListening(false);
    }
  };

  const handlePlay = async () => {
    if (!song) {
      return;
    }

    if (audioRef.current) {
      await audioRef.current.play().catch(() => {
        setAnalyticsMessage('Unable to start audio playback.');
      });
    }

    setStartedAt(new Date());
    setAnalyticsMessage('Listening started...');
    setIsListening(true);
  };

  const handlePause = () => {
    if (!isListening || audioRef.current?.ended) {
      return;
    }

    void sendAnalytics('pause');
  };

  const handleEnded = () => {
    if (!isListening) {
      return;
    }

    void sendAnalytics('ended');
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Song detail</h2>
        <p className="mt-2 text-slate-400">View metadata and the family tree for this song.</p>
      </div>

      {isLoading ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-8 text-center text-slate-400">Loading song…</div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-600 bg-rose-950/30 p-6 text-rose-100">Error loading song: {error}</div>
      ) : song ? (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-xl shadow-slate-950/20">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-slate-100">{song.title}</h1>
                <div className="mt-3 text-sm text-slate-400">
                  {artists.length > 0 ? (
                    <span>
                      Artists:{' '}
                      {artists.map((artist, index) => (
                        <span key={artist.id}>
                          <Link to={`/artists/${artist.id}`} className="text-sky-300 hover:underline">
                            {artist.name}
                          </Link>
                          {index < artists.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </span>
                  ) : (
                    'Artists: Unknown'
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link to={`/songs/new?parentId=${song.id}`}>
                  <Button variant="secondary">Add child</Button>
                </Link>
                <Button variant="secondary" disabled>
                  Play
                </Button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="text-slate-400">Released</div>
                <div className="mt-2 text-slate-100">{formatDate(song.releasedAt) ?? '—'}</div>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="text-slate-400">Platform ID</div>
                <div className="mt-2 text-slate-100">{song.platformId || '—'}</div>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="text-slate-400">External URL</div>
                <div className="mt-2">
                  {song.url ? (
                    <a href={song.url} target="_blank" rel="noreferrer noopener" className="text-sky-300 hover:underline">
                      {song.url}
                    </a>
                  ) : (
                    <span className="text-slate-100">—</span>
                  )}
                </div>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="text-slate-400">Preferred</div>
                <div className="mt-2">
                  <span className={song.preferred ? 'rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-950' : 'rounded-full bg-slate-700 px-3 py-1 text-xs text-slate-200'}>
                    {song.preferred ? 'Preferred' : 'Skip'}
                  </span>
                </div>
              </div>
              {formatTrimRange(song.trimStart, song.trimEnd) ? (
                <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
                  <div className="text-slate-400">Trim Range</div>
                  <div className="mt-2 text-slate-100">{formatTrimRange(song.trimStart, song.trimEnd)}</div>
                </div>
              ) : null}
            </div>

            {song.description ? (
              <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-4 text-slate-100">
                <pre className="whitespace-pre-wrap text-sm leading-6">{song.description}</pre>
              </div>
            ) : null}

            {song.filePath ? (
              <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-4 text-slate-100">
                <div className="mb-3 text-slate-400">Playback analytics</div>
                <audio
                  ref={audioRef}
                  controls
                  src={song.filePath}
                  className="w-full rounded-3xl bg-slate-950/80"
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onEnded={handleEnded}
                />
                <div className="mt-3 text-sm text-slate-400">
                  {isListening
                    ? `Listening for ${listenedSeconds}s`
                    : analyticsMessage ?? 'Start playback to capture analytics.'}
                </div>
              </div>
            ) : null}
          </div>

          <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-xl shadow-slate-950/20">
            <h3 className="text-xl font-semibold text-slate-100">Family tree</h3>
            {tree?.nodes.length ? (
              <div className="mt-4">
                <FamilyTree nodes={tree.nodes} currentSongId={song.id} />
              </div>
            ) : (
              <p className="mt-4 text-slate-400">No family tree available.</p>
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
}

export default SongDetailPage;
