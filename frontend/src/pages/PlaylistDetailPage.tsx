import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Button } from '../components/ui/Button';
import { z } from 'zod';

const PlaylistSongSchema = z.object({
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
  songs: z.array(PlaylistSongSchema),
});

const PlaylistRenameSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdAt: z.string(),
});

const PlaylistUpdateOrderSchema = z.object({
  playlistId: z.string().uuid(),
  songIds: z.array(z.string().uuid()),
});

const SearchSongSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  artistId: z.string().nullable().optional(),
  preferred: z.boolean(),
  playCount: z.number().int(),
});

const SearchArtistSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  aliases: z.array(z.string()).optional().default([]),
});

const SearchAlbumSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  artistId: z.string().uuid(),
  yearReleased: z.number().int().nullable().optional(),
});

const SearchResponseSchema = z.object({
  songs: z.array(SearchSongSchema),
  artists: z.array(SearchArtistSchema),
  albums: z.array(SearchAlbumSchema),
});

type PlaylistDetail = z.infer<typeof PlaylistDetailSchema>;

type SearchResponse = z.infer<typeof SearchResponseSchema>;

function PlaylistDetailPage() {
  const { id } = useParams<'id'>();
  const navigate = useNavigate();

  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const fetchPlaylist = useCallback(async () => {
    if (!id) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const playlistDetail = await api.get(`/api/playlists/${id}`, PlaylistDetailSchema);
      setPlaylist(playlistDetail);
      setDraftName(playlistDetail.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchPlaylist();
  }, [fetchPlaylist]);

  const songIds = useMemo(() => new Set(playlist?.songs.map((item) => item.song.id) ?? []), [playlist]);

  const handleSaveName = async () => {
    if (!id || !playlist) {
      return;
    }

    const nextName = draftName.trim();
    if (!nextName || nextName === playlist.name) {
      setIsEditingName(false);
      return;
    }

    setIsSavingName(true);

    try {
      const updatedPlaylist = await api.put(`/api/playlists/${id}`, { name: nextName }, PlaylistRenameSchema);
      setPlaylist((current) => (current ? { ...current, name: updatedPlaylist.name } : current));
      setIsEditingName(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSavingName(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !window.confirm('Delete this playlist? This cannot be undone.')) {
      return;
    }

    setIsDeleteLoading(true);
    try {
      await api.delete(`/api/playlists/${id}`, z.object({ ok: z.literal(true) }));
      navigate('/playlists');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const handleRemoveSong = async (songId: string) => {
    if (!id || !playlist) {
      return;
    }

    try {
      await api.delete(`/api/playlists/${id}/songs/${songId}`, z.object({ ok: z.literal(true) }));
      setPlaylist({
        ...playlist,
        songs: playlist.songs
          .filter((item) => item.song.id !== songId)
          .map((item, index) => ({ ...item, position: index })),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleReorder = async (currentIndex: number, nextIndex: number) => {
    if (!playlist || !id) {
      return;
    }

    const nextSongs = [...playlist.songs];
    const [moved] = nextSongs.splice(currentIndex, 1);
    nextSongs.splice(nextIndex, 0, moved);

    const songIds = nextSongs.map((item) => item.song.id);

    try {
      await api.put(`/api/playlists/${id}/songs`, { songIds }, PlaylistUpdateOrderSchema);
      setPlaylist({
        ...playlist,
        songs: nextSongs.map((item, index) => ({ ...item, position: index })),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    if (!isModalOpen) {
      setSearchQuery('');
      setSearchResults(null);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      const trimmed = searchQuery.trim();
      if (!trimmed) {
        setSearchResults(null);
        setSearchError(null);
        setSearchLoading(false);
        return;
      }

      setSearchLoading(true);
      setSearchError(null);

      api
        .get(`/api/search?q=${encodeURIComponent(trimmed)}`, SearchResponseSchema)
        .then(setSearchResults)
        .catch((err) => setSearchError(err instanceof Error ? err.message : String(err)))
        .finally(() => setSearchLoading(false));
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isModalOpen, searchQuery]);

  const handleAddSong = async (songId: string) => {
    if (!id || !playlist) {
      return;
    }

    try {
      await api.post(`/api/playlists/${id}/songs`, { songId }, z.object({ playlistId: z.string().uuid(), songId: z.string().uuid(), position: z.number().int() }));
      setPlaylist((current) =>
        current
          ? {
              ...current,
              songs: [
                ...current.songs,
                {
                  position: current.songs.length,
                  song: {
                    id: songId,
                    title: searchResults?.songs.find((song) => song.id === songId)?.title ?? 'Unknown song',
                    preferred: searchResults?.songs.find((song) => song.id === songId)?.preferred ?? false,
                    filePath: null,
                  },
                },
              ],
            }
          : current,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const searchSongResults = searchResults?.songs ?? [];
  const playlistSongs = playlist?.songs ?? [];

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Playlist detail</h2>
          <p className="mt-2 text-slate-400">Manage playlist details, song order, and additions.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="secondary" onClick={() => setIsModalOpen(true)}>
            Add Songs
          </Button>
          <Button type="button" variant="secondary" onClick={() => alert('Play all is not yet connected to playback.') } disabled={!playlistSongs.length}>
            Play All
          </Button>
          <Button type="button" variant="secondary" onClick={handleDelete} disabled={isDeleteLoading}>
            {isDeleteLoading ? 'Deleting…' : 'Delete Playlist'}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-8 text-center text-slate-400">Loading playlist…</div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-600 bg-rose-950/30 p-6 text-rose-100">Error loading playlist: {error}</div>
      ) : playlist ? (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-xl shadow-slate-950/20">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                {isEditingName ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <label htmlFor="playlist-name-edit" className="sr-only">
                      Playlist name
                    </label>
                    <input
                      id="playlist-name-edit"
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      className="w-full rounded-3xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
                    />
                    <div className="flex gap-2">
                      <Button type="button" onClick={handleSaveName} disabled={isSavingName}>
                        Save
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => { setDraftName(playlist.name); setIsEditingName(false); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-semibold text-slate-100">{playlist.name}</h1>
                    <Button type="button" variant="secondary" onClick={() => setIsEditingName(true)}>
                      Rename
                    </Button>
                  </div>
                )}
                <p className="text-sm text-slate-400">Created on {new Date(playlist.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-xl shadow-slate-950/20">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-100">Songs</h3>
              <span className="text-sm text-slate-400">{playlistSongs.length} track{playlistSongs.length === 1 ? '' : 's'}</span>
            </div>

            {playlistSongs.length === 0 ? (
              <p className="mt-4 text-slate-400">No songs added to this playlist yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm text-slate-200">
                  <thead className="border-b border-slate-700 text-slate-400">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Preferred</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playlistSongs.map((item, index) => (
                      <tr key={item.song.id} className="border-b border-slate-800 last:border-b-0">
                        <td className="px-4 py-4 text-slate-300">{index + 1}</td>
                        <td className="px-4 py-4">
                          <Link to={`/songs/${item.song.id}`} className="text-slate-100 transition hover:text-sky-300">
                            {item.song.title}
                          </Link>
                        </td>
                        <td className="px-4 py-4 text-slate-300">{item.song.preferred ? 'Yes' : 'No'}</td>
                        <td className="px-4 py-4 space-x-2">
                          <Button type="button" variant="secondary" disabled={index === 0} onClick={() => handleReorder(index, index - 1)}>
                            Up
                          </Button>
                          <Button type="button" variant="secondary" disabled={index === playlistSongs.length - 1} onClick={() => handleReorder(index, index + 1)}>
                            Down
                          </Button>
                          <Button type="button" variant="secondary" onClick={() => handleRemoveSong(item.song.id)}>
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-8 text-center text-slate-400">Playlist not found.</div>
      )}

      {isModalOpen ? (
        <div className="fixed inset-0 z-20 flex items-start justify-center overflow-y-auto bg-slate-950/70 p-4">
          <div
            className="min-h-full w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl shadow-slate-950/40"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-100">Add Songs</h3>
                <p className="mt-1 text-sm text-slate-400">Search for songs and add them to the playlist.</p>
              </div>
              <button
                type="button"
                className="rounded-full border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-600 hover:bg-slate-700"
                onClick={() => setIsModalOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <label htmlFor="playlist-add-search" className="sr-only">
                  Search songs to add
                </label>
                <input
                  id="playlist-add-search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by song title or artist"
                  className="min-w-0 rounded-3xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              {searchLoading ? (
                <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 text-slate-400">Searching for songs…</div>
              ) : searchError ? (
                <div className="rounded-3xl border border-rose-600 bg-rose-950/30 p-6 text-rose-100">Search error: {searchError}</div>
              ) : !searchQuery.trim() ? (
                <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 text-slate-400">Enter a search term to find songs.</div>
              ) : searchSongResults.length === 0 ? (
                <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 text-slate-400">No song results found.</div>
              ) : (
                <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                  <table className="min-w-full text-left text-sm text-slate-200">
                    <thead className="border-b border-slate-700 text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Title</th>
                        <th className="px-4 py-3">Preferred</th>
                        <th className="px-4 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchSongResults.map((song) => (
                        <tr key={song.id} className="border-b border-slate-800 last:border-b-0">
                          <td className="px-4 py-4 text-slate-100">{song.title}</td>
                          <td className="px-4 py-4 text-slate-300">{song.preferred ? 'Yes' : 'No'}</td>
                          <td className="px-4 py-4">
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={songIds.has(song.id)}
                              onClick={() => handleAddSong(song.id)}
                            >
                              {songIds.has(song.id) ? 'Added' : 'Add'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default PlaylistDetailPage;
