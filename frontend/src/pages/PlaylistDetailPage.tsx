import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Button } from "../components/ui/Button";
import { z } from "zod";
import { usePlaylistDetail } from "../hooks/usePlaylistDetail";
import { usePlayerStore } from "../stores/usePlayerStore";
import { useSongSelectorModal } from "../components/SongSelector";
import { useSongSelection } from "../hooks/useSongSelection";
import { SongActionsDropdown } from "../components/SongTable";
import { buildPlaylistQueue } from "../lib/queueBuilder";
import { toBrandId, type PlaylistId, type SongId } from "../types/brands";

function PlaylistDetailPage() {
  const { id } = useParams<"id">();
  const navigate = useNavigate();
  const { playlist, isLoading, error, updatePlaylist, deletePlaylist, addSong, removeSong } =
    usePlaylistDetail(toBrandId<PlaylistId>(id || ""));

  const [draftName, setDraftName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [isPlayLoading, setIsPlayLoading] = useState(false);

  const { setQueue } = usePlayerStore();

  const handleAddSongs = useCallback(
    (songIds: string[]) => {
      // Add songs sequentially to avoid race conditions
      // Send them one at a time so the position counter increments properly
      (async () => {
        for (const songId of songIds) {
          try {
            await addSong(toBrandId<SongId>(songId));
          } catch {
            // Error is already in store, continue with next song
          }
        }
      })();
    },
    [addSong],
  );

  const songSelectorModal = useSongSelectorModal({
    onSongsSelected: handleAddSongs,
  });

  useEffect(() => {
    if (playlist) {
      setDraftName(playlist.name);
    }
  }, [playlist]);

  const handleSaveName = async () => {
    if (!playlist) {
      return;
    }

    const nextName = draftName.trim();
    if (!nextName || nextName === playlist.name) {
      setIsEditingName(false);
      return;
    }

    setIsSavingName(true);
    try {
      await updatePlaylist(nextName);
      setIsEditingName(false);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this playlist? This cannot be undone.")) {
      return;
    }

    setIsDeleteLoading(true);
    try {
      await deletePlaylist();
      navigate("/playlists");
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const handleRemoveSong = async (position: number) => {
    try {
      await removeSong(position);
    } catch {
      // Error is already in store
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
      await api.put(
        `/api/playlists/${id}/songs`,
        { songIds },
        z.object({
          playlistId: z.string().uuid(),
          songIds: z.array(z.string().uuid()),
        }),
      );
    } catch {
      // Handle error
    }
  };

  const handlePlayPlaylist = async () => {
    if (!playlist || !playlist.songs.length) {
      return;
    }

    setIsPlayLoading(true);
    try {
      const songs = await buildPlaylistQueue(playlist.id);
      if (songs.length === 0) {
        // No playable songs found - show toast notification
        console.warn("No playable songs in this playlist");
        return;
      }

      setQueue(songs, 0);
    } catch (err) {
      console.error("Failed to play playlist:", err);
    } finally {
      setIsPlayLoading(false);
    }
  };

  const playlistSongs = playlist?.songs ?? [];

  // Selection and bulk operations - convert to minimal song-like objects for selection
  const {
    state: selectionState,
    toggleSelection,
    clearSelection,
  } = useSongSelection(
    playlistSongs.map((item) => {
      // eslint-disable-next-line no-restricted-syntax
      return { id: item.song.id } as { id: SongId };
    }),
  );
  // Note: useBulkOperations is used internally by SongActionsDropdown

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Playlist detail</h2>
          <p className="mt-2 text-slate-600">Manage playlist details, song order, and additions.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="secondary" onClick={() => songSelectorModal.open()}>
            Add Songs
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handlePlayPlaylist}
            disabled={!playlistSongs.length || isPlayLoading}
          >
            {isPlayLoading ? "Loading…" : "Play All"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleDelete}
            disabled={isDeleteLoading}
          >
            {isDeleteLoading ? "Deleting…" : "Delete Playlist"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-3xl border border-slate-300 bg-slate-50/80 p-8 text-center text-slate-600">
          Loading playlist…
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-400 bg-rose-100/30 p-6 text-rose-700">
          Error loading playlist: {error}
        </div>
      ) : playlist ? (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-300 bg-slate-50/80 p-6 shadow-xl shadow-slate-200/20">
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
                      className="w-full rounded-3xl border border-slate-400 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
                    />
                    <div className="flex gap-2">
                      <Button type="button" onClick={handleSaveName} disabled={isSavingName}>
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setDraftName(playlist.name);
                          setIsEditingName(false);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-semibold text-slate-900">{playlist.name}</h1>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setIsEditingName(true)}
                    >
                      Rename
                    </Button>
                  </div>
                )}
                <p className="text-sm text-slate-600">
                  Created on {new Date(playlist.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <section className="rounded-3xl border border-slate-300 bg-slate-50/80 p-6 shadow-xl shadow-slate-200/20">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">Songs</h3>
              <span className="text-sm text-slate-600">
                {playlistSongs.length} track{playlistSongs.length === 1 ? "" : "s"}
              </span>
            </div>

            {playlistSongs.length === 0 ? (
              <p className="mt-4 text-slate-600">No songs added to this playlist yet.</p>
            ) : (
              <>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm text-slate-700">
                    <thead className="border-b border-slate-300 text-slate-600">
                      <tr>
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Title</th>
                        <th className="px-4 py-3">Playback Enabled</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {playlistSongs.map((item, index) => {
                        const isSelected = selectionState.selectedIds.has(item.song.id);
                        return (
                          <tr
                            key={item.song.id}
                            onClick={() => toggleSelection(item.song.id, false)}
                            className={`border-b border-slate-300 last:border-b-0 cursor-pointer transition ${
                              isSelected ? "bg-blue-50" : "hover:bg-slate-50"
                            }`}
                          >
                            <td className="px-4 py-4 text-slate-700">{index + 1}</td>
                            <td className="px-4 py-4">
                              <Link
                                to={`/songs/${item.song.id}`}
                                className="text-slate-900 transition hover:text-sky-500"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {item.song.title}
                              </Link>
                            </td>
                            <td className="px-4 py-4 text-slate-700">
                              {item.song.playbackEnabled ? "Yes" : "No"}
                            </td>
                            <td
                              className="px-4 py-4 space-x-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {item.song.playbackEnabled && (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-restricted-syntax
                                  onClick={() => usePlayerStore().play(item.song as any)}
                                >
                                  ▶ Play
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="secondary"
                                disabled={index === 0}
                                onClick={() => handleReorder(index, index - 1)}
                              >
                                Up
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                disabled={index === playlistSongs.length - 1}
                                onClick={() => handleReorder(index, index + 1)}
                              >
                                Down
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => handleRemoveSong(item.position)}
                              >
                                Remove
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <SongActionsDropdown
                  selectedSongIds={Array.from(selectionState.selectedIds)}
                  onClose={clearSelection}
                />
              </>
            )}
          </section>
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-300 bg-slate-50/80 p-8 text-center text-slate-600">
          Playlist not found.
        </div>
      )}

      {songSelectorModal.Component}
    </section>
  );
}

export default PlaylistDetailPage;
