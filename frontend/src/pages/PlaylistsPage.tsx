import { useMemo, useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { usePlaylists } from '../hooks/usePlaylists';
import { usePlaylistsStore } from '../stores/usePlaylistsStore';

function PlaylistsPage() {
  const { playlists, songCounts, isLoading, error } = usePlaylists();
  const { createPlaylist } = usePlaylistsStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const navigate = useNavigate();

  const hasPlaylists = playlists.length > 0;

  const handleCreatePlaylist = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const id = await createPlaylist(playlistName);
    if (id) {
      setPlaylistName('');
      setIsModalOpen(false);
      navigate(`/playlists/${id}`);
    }
  };

  const formattedPlaylists = useMemo(
    () => playlists.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [playlists],
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Playlists</h2>
          <p className="mt-2 text-slate-600">Create and browse playlists in the archive.</p>
        </div>

        <Button type="button" onClick={() => setIsModalOpen(true)}>
          New Playlist
        </Button>
      </div>

      {isLoading ? (
        <div className="rounded-3xl border border-slate-300 bg-slate-50/80 p-8 text-center text-slate-600">Loading playlists…</div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-400 bg-rose-100/30 p-6 text-rose-700">Error loading playlists: {error}</div>
      ) : !hasPlaylists ? (
        <div className="rounded-3xl border border-slate-300 bg-slate-50/80 p-8 text-slate-600">No playlists found. Create one to get started.</div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-slate-300 bg-slate-50/80 p-4 shadow-xl shadow-slate-200/20">
          <table className="min-w-full text-left text-sm text-slate-700">
            <thead className="border-b border-slate-300 text-slate-600">
              <tr>
                <th className="px-4 py-3">Playlist</th>
                <th className="px-4 py-3">Song count</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {formattedPlaylists.map((playlist) => (
                <tr key={playlist.id} className="border-b border-slate-300 last:border-b-0">
                  <td className="px-4 py-4">
                    <Link to={`/playlists/${playlist.id}`} className="text-slate-900 transition hover:text-sky-500">
                      {playlist.name}
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-slate-700">{songCounts[playlist.id] ?? '—'}</td>
                  <td className="px-4 py-4 text-slate-700">{new Date(playlist.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-white/70 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-300 bg-slate-50 p-6 shadow-xl shadow-slate-200/40">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">New Playlist</h3>
              <button
                type="button"
                className="rounded-full border border-slate-400 bg-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:border-slate-500 hover:bg-slate-300"
                onClick={() => setIsModalOpen(false)}
              >
                Close
              </button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleCreatePlaylist}>
              <label className="block text-sm font-medium text-slate-700" htmlFor="playlist-name">
                Playlist name
              </label>
              <input
                id="playlist-name"
                value={playlistName}
                onChange={(event) => setPlaylistName(event.target.value)}
                className="w-full rounded-3xl border border-slate-400 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
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
