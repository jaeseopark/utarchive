import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Button } from '../components/ui/Button';
import { z } from 'zod';

const PlaylistSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdAt: z.string(),
});

const PlaylistDetailSongSchema = z.object({
  position: z.number().int(),
  song: z.object({
    id: z.string().uuid(),
    title: z.string(),
    preferred: z.boolean(),
    filePath: z.string().nullable().optional(),
  }),
});

const PlaylistDetailSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdAt: z.string(),
  songs: z.array(PlaylistDetailSongSchema),
});

const PlaylistsResponseSchema = z.array(PlaylistSchema);

type Playlist = z.infer<typeof PlaylistSchema>;

function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [songCounts, setSongCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const navigate = useNavigate();

  const fetchPlaylists = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const playlistRows = await api.get('/api/playlists?limit=100&offset=0', PlaylistsResponseSchema);
      setPlaylists(playlistRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  useEffect(() => {
    if (playlists.length === 0) {
      setSongCounts({});
      return;
    }

    let active = true;
    Promise.all(
      playlists.map(async (playlist) => {
        const playlistDetail = await api.get(`/api/playlists/${playlist.id}`, PlaylistDetailSchema);
        return { id: playlist.id, count: playlistDetail.songs.length };
      }),
    )
      .then((counts) => {
        if (!active) {
          return;
        }

        setSongCounts(Object.fromEntries(counts.map((item) => [item.id, item.count])));
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setSongCounts({});
      });

    return () => {
      active = false;
    };
  }, [playlists]);

  const hasPlaylists = playlists.length > 0;

  const handleCreatePlaylist = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = playlistName.trim();
    if (!trimmedName) {
      return;
    }

    try {
      const playlist = await api.post('/api/playlists', { name: trimmedName }, PlaylistSchema);
      setPlaylistName('');
      setIsModalOpen(false);
      navigate(`/playlists/${playlist.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const formattedPlaylists = useMemo(
    () =>
      playlists.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [playlists],
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Playlists</h2>
          <p className="mt-2 text-slate-400">Create and browse playlists in the archive.</p>
        </div>

        <Button type="button" onClick={() => setIsModalOpen(true)}>
          New Playlist
        </Button>
      </div>

      {isLoading ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-8 text-center text-slate-400">Loading playlists…</div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-600 bg-rose-950/30 p-6 text-rose-100">Error loading playlists: {error}</div>
      ) : !hasPlaylists ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-8 text-slate-400">No playlists found. Create one to get started.</div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-950/80 p-4 shadow-xl shadow-slate-950/20">
          <table className="min-w-full text-left text-sm text-slate-200">
            <thead className="border-b border-slate-700 text-slate-400">
              <tr>
                <th className="px-4 py-3">Playlist</th>
                <th className="px-4 py-3">Song count</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {formattedPlaylists.map((playlist) => (
                <tr key={playlist.id} className="border-b border-slate-800 last:border-b-0">
                  <td className="px-4 py-4">
                    <Link to={`/playlists/${playlist.id}`} className="text-slate-100 transition hover:text-sky-300">
                      {playlist.name}
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-slate-300">{songCounts[playlist.id] ?? '—'}</td>
                  <td className="px-4 py-4 text-slate-300">{new Date(playlist.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl shadow-slate-950/40">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-100">New Playlist</h3>
              <button
                type="button"
                className="rounded-full border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-600 hover:bg-slate-700"
                onClick={() => setIsModalOpen(false)}
              >
                Close
              </button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleCreatePlaylist}>
              <label className="block text-sm font-medium text-slate-300" htmlFor="playlist-name">
                Playlist name
              </label>
              <input
                id="playlist-name"
                value={playlistName}
                onChange={(event) => setPlaylistName(event.target.value)}
                className="w-full rounded-3xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
                placeholder="My new playlist"
              />

              <div className="flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Playlist</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default PlaylistsPage;
