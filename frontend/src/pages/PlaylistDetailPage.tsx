import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { useConfirmDialog } from "../hooks/useConfirmDialog";
import { usePlaylistDetail } from "../hooks/usePlaylistDetail";
import { usePlayerStore } from "../stores/usePlayerStore";
import { usePlaylistsStore } from "../stores/usePlaylistsStore";
import { useSongSelectorModal } from "../components/SongSelector";
import { useSongSelection } from "../hooks/useSongSelection";
import { SongActionsDropdown } from "../components/SongTable";
import { buildPlaylistQueue } from "../lib/queueBuilder";
import { toBrandId, type PlaylistId, type SongId } from "types";

function PlaylistDetailPage() {
  const { id } = useParams<"id">();
  const navigate = useNavigate();
  const playlistId = toBrandId<PlaylistId>(id || "");
  const { playlist, isLoading, error, updatePlaylist, deletePlaylist, addSongs, removeSong } =
    usePlaylistDetail(playlistId);
  const subscribe = usePlaylistsStore((state) => state.subscribe);
  const unsubscribe = usePlaylistsStore((state) => state.unsubscribe);
  const confirmDialog = useConfirmDialog();

  const [draftName, setDraftName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPlayLoading, setIsPlayLoading] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);

  const { setQueue } = usePlayerStore();

  const handleAddSongs = useCallback(
    (songIds: string[]) => {
      void (async () => {
        try {
          await addSongs(songIds.map((songId) => toBrandId<SongId>(songId)));
        } catch {
          // Error is already in store.
        }
      })();
    },
    [addSongs],
  );

  const songSelectorModal = useSongSelectorModal({
    onSongsSelected: handleAddSongs,
  });

  useEffect(() => {
    if (playlist) {
      setDraftName(playlist.name);
    }
  }, [playlist]);

  // Exit rename mode when navigating to a different playlist
  useEffect(() => {
    setIsEditingName(false);
  }, [playlistId]);

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

  const handleDeleteClick = () => {
    confirmDialog.open({
      title: "Delete Playlist",
      message: "Are you sure you want to delete this playlist? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "destructive",
      onConfirm: handleConfirmDelete,
    });
  };

  const handleConfirmDelete = async () => {
    // Close dialog immediately and freeze UI
    confirmDialog.close();
    setIsFrozen(true);
    setDeleteError(null);

    // Subscribe to deletion event - when WebSocket confirms deletion with isOwnOrigin=true, navigate away
    const handleDeleted = (deletedId: string) => {
      if (deletedId === playlistId) {
        navigate("/songs");
      }
    };

    subscribe({
      event: 'deleted',
      callback: handleDeleted,
    });

    try {
      await deletePlaylist();
    } catch {
      setDeleteError("Failed to delete playlist");
      // Unsubscribe on error since we won't navigate away
      unsubscribe({
        event: 'deleted',
        callback: handleDeleted,
      });
      setIsFrozen(false);
    }
  };

  const handleRemoveSong = async (songId: SongId) => {
    try {
      await removeSong(songId);
    } catch {
      // Error is already in store
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
          <p className="mt-2 text-slate-600">Manage playlist details and additions.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="secondary" onClick={() => songSelectorModal.open()} disabled={isFrozen}>
            Add Songs
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handlePlayPlaylist}
            disabled={!playlistSongs.length || isPlayLoading || isFrozen}
          >
            {isPlayLoading ? "Loading…" : "Play All"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDeleteClick}
            disabled={isFrozen}
          >
            {isFrozen ? "⏳" : "Delete Playlist"}
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
          {deleteError && (
            <div className="rounded-3xl border border-rose-400 bg-rose-100/30 p-6 text-rose-700">
              {deleteError}
            </div>
          )}
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
                      disabled={isFrozen}
                      className="w-full rounded-3xl border border-slate-400 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 disabled:bg-slate-100 disabled:text-slate-500"
                    />
                    <div className="flex gap-2">
                      <Button type="button" onClick={handleSaveName} disabled={isSavingName || isFrozen}>
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setDraftName(playlist.name);
                          setIsEditingName(false);
                        }}
                        disabled={isFrozen}
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
                      disabled={isFrozen}
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
                            onClick={() => !isFrozen && toggleSelection(item.song.id, false)}
                            onDoubleClick={() => {
                              // Play the song on double-click if playback is enabled
                              if (item.song.playbackEnabled && !isFrozen) {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-restricted-syntax
                                usePlayerStore().play(item.song as any);
                              }
                            }}
                            className={`border-b border-slate-300 last:border-b-0 cursor-pointer transition ${
                              isSelected ? "bg-blue-50" : "hover:bg-slate-50"
                            } ${isFrozen ? "opacity-50 pointer-events-none" : ""}`}
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
                                  disabled={isFrozen}
                                  // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-restricted-syntax
                                  onClick={() => usePlayerStore().play(item.song as any)}
                                >
                                  ▶ Play
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="secondary"
                                disabled={isFrozen}
                                onClick={() => handleRemoveSong(item.song.id)}
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
      <confirmDialog.Component />
    </section>
  );
}

export default PlaylistDetailPage;
