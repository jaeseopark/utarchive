import { Fragment, useMemo, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { SongTreeSchema, type SongTree } from "../api/schemas";
import FamilyTree from "../components/FamilyTree";
import { Button } from "../components/ui/Button";
import { EditAlbumModal } from "../components/EditAlbumModal";
import { useSongSelectorModal } from "../components/SongSelector";
import { useAlbumAttributeEditor } from "../components/AlbumAttributeEditor";
import { useAlbumDetail } from "../hooks/useAlbumDetail";
import { useUnlinkSongFromAlbum } from "../hooks/useUnlinkSongFromAlbum";
import { useUpsertAlbumSong } from "../hooks/useUpsertAlbumSong";
import { usePlayerStore } from "../stores/usePlayerStore";
import { useArtistsStore } from "../stores/useArtistsStore";
import { useSongsStore } from "../stores/useSongsStore";
import { buildAlbumQueue } from "../lib/queueBuilder";
import { toBrandId, type AlbumId, type ArtistId, type SongId } from "../types/brands";

const SongTreeResponseSchema = SongTreeSchema;

const AlbumDetailPage = () => {
  const { id } = useParams();
  const { album, isLoading, error } = useAlbumDetail(toBrandId<AlbumId>(id || ""));
  const [expandedSongId, setExpandedSongId] = useState<string | null>(null);
  const [tree, setTree] = useState<SongTree | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [isPlayLoading, setIsPlayLoading] = useState(false);
  const [unlinkingTrackNumber, setUnlinkingTrackNumber] = useState<number | null>(null);
  const [unlinkError, setUnlinkError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [trackNumberForSongSelect, setTrackNumberForSongSelect] = useState<number | null>(null);
  const [linkingTrackNumber, setLinkingTrackNumber] = useState<number | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  const { setQueue, play } = usePlayerStore();
  const artists = useArtistsStore((state) => state.artists);
  const { unlinkSong } = useUnlinkSongFromAlbum();
  const { linkSongToTrack } = useUpsertAlbumSong();
  const getSongDetail = useSongsStore((state) => state.getSongDetail);

  // Album attributes editor hook - always call unconditionally (hook handles null albums internally)
  const albumEditorState = useAlbumAttributeEditor(album ?? null);

  const handleSongSelected = useCallback(
    async (songId: string) => {
      if (!album || trackNumberForSongSelect === null) return;

      setLinkError(null);
      setLinkingTrackNumber(trackNumberForSongSelect);

      try {
        await linkSongToTrack(album.id, toBrandId<SongId>(songId), trackNumberForSongSelect);
        setLinkingTrackNumber(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to link song";
        setLinkError(message);
        console.error("Link error:", message);
        setLinkingTrackNumber(null);
      }
      setTrackNumberForSongSelect(null);
    },
    [album, trackNumberForSongSelect, linkSongToTrack],
  );

  const songSelectorModal = useSongSelectorModal({
    onSongSelected: handleSongSelected,
    onClose: () => setTrackNumberForSongSelect(null),
  });

  const handleSelectExistingSong = useCallback(
    (trackNumber: number) => {
      setTrackNumberForSongSelect(trackNumber);
      songSelectorModal.open();
    },
    [songSelectorModal],
  );

  const toggleTree = (songId: string) => {
    if (expandedSongId === songId) {
      setExpandedSongId(null);
      setTree(null);
      setTreeError(null);
      return;
    }

    setExpandedSongId(songId);
    setTreeLoading(true);
    setTreeError(null);

    api
      .get(`/api/songs/${songId}/tree`, SongTreeResponseSchema)
      .then(setTree)
      .catch((err) => setTreeError(err instanceof Error ? err.message : String(err)))
      .finally(() => setTreeLoading(false));
  };

  const handlePlayAlbum = async () => {
    if (!album || !album.tracks.length) {
      return;
    }

    setIsPlayLoading(true);
    try {
      const songs = await buildAlbumQueue(album.id);
      if (songs.length === 0) {
        console.warn("No playable songs in this album");
        return;
      }

      setQueue(songs, 0);
    } catch (err) {
      console.error("Failed to play album:", err);
    } finally {
      setIsPlayLoading(false);
    }
  };

  const handleUnlinkSong = async (albumId: AlbumId, songId: SongId, trackNumber: number) => {
    setUnlinkingTrackNumber(trackNumber);
    setUnlinkError(null);
    try {
      await unlinkSong(albumId, songId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to unlink song";
      setUnlinkError(message);
      console.error("Unlink error:", message);
    } finally {
      setUnlinkingTrackNumber(null);
    }
  };

  const trackRows = useMemo(() => album?.tracks ?? [], [album]);

  const formatDuration = (seconds: number | undefined): string => {
    if (seconds === undefined || seconds === null) return "—";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}:${String(secs).padStart(2, "0")}`;
  };

  const getTrackDuration = (track: (typeof trackRows)[0]): string => {
    // Try to get duration from registered song first
    if (track.isRegistered && track.song?.id) {
      const fullSong = getSongDetail(toBrandId<SongId>(track.song.id));
      if (fullSong?.duration) {
        return formatDuration(fullSong.duration);
      }
    }
    // Fall back to trackList duration
    const trackListItem = album?.trackList.find((t) => t.number === track.trackNumber);
    if (trackListItem?.duration) {
      return formatDuration(trackListItem.duration);
    }
    // Default fallback
    return "—";
  };

  const getTrackArtistIds = (track: (typeof trackRows)[0]): ArtistId[] => {
    // Try to get artist IDs from registered song first
    if (track.isRegistered && track.song?.id) {
      const fullSong = getSongDetail(toBrandId<SongId>(track.song.id));
      if (fullSong?.artistIds && fullSong.artistIds.length > 0) {
        return fullSong.artistIds;
      }
    }
    // Default fallback
    return [];
  };

  // Check if album has at least one track with a registered song that has an audio file (from store)
  const hasPlayableTracks = useMemo(() => {
    if (!album || !album.tracks.length) return false;
    return album.tracks.some((track) => {
      if (!track.isRegistered || !track.song?.id) return false;
      const fullSong = getSongDetail(toBrandId<SongId>(track.song.id));
      return fullSong?.filePath ? true : false;
    });
  }, [album, getSongDetail]);

  const getContent = () => {
    // Handle loading state
    if (isLoading) {
      return (
        <div className="rounded-3xl border border-slate-300 bg-slate-50/80 p-8 text-center text-slate-600">
          Loading album…
        </div>
      );
    }

    // Handle error state
    if (error) {
      return (
        <div className="rounded-3xl border border-rose-400 bg-rose-100/30 p-6 text-rose-700">
          Error loading album: {error}
        </div>
      );
    }

    // Handle not found state
    if (!album) {
      return <div>Album not found</div>;
    }

    // Render album detail with narrowed type
    return (
      <>
        <div>
          <h2 className="text-2xl font-semibold">Album Detail</h2>
        </div>
        <div className="space-y-6">
          {/* Album Attributes Editor - Single source of truth for album info */}
          {albumEditorState && (
            <section className="rounded-3xl border border-slate-300 bg-slate-50/80 p-6 shadow-xl shadow-slate-200/20">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-slate-900">Album Information</h3>
                  <div className="mt-4">{albumEditorState.Component}</div>
                </div>
                {albumEditorState.mode === "view" && (
                  <Button
                    variant="secondary"
                    onClick={albumEditorState.enterEditMode}
                    className="ml-4 mt-1 flex-shrink-0"
                  >
                    ✎ Edit
                  </Button>
                )}
              </div>
            </section>
          )}

          {/* Play Album button - only shown if there are playable tracks with audio files */}
          {/* Track list section */}
          <section className="rounded-3xl border border-slate-300 bg-slate-50/80 p-6 shadow-xl shadow-slate-200/20">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">Track list</h3>
              <div className="flex gap-3">
                {hasPlayableTracks && (
                  <Button variant="primary" onClick={handlePlayAlbum} disabled={isPlayLoading}>
                    {isPlayLoading ? "Loading…" : "▶ Play Album"}
                  </Button>
                )}
                <Button variant="secondary" onClick={() => setIsEditModalOpen(true)}>
                  ✎ Edit Tracks
                </Button>
              </div>
            </div>
            {trackRows.length === 0 ? (
              <p className="mt-4 text-slate-600">No tracks are available for this album.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm text-slate-700">
                  <thead className="border-b border-slate-300 text-slate-600">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Artists</th>
                      <th className="px-4 py-3">Duration</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trackRows.map((track) => {
                      const song = track.song;
                      const isRegistered = track.isRegistered && Boolean(song?.id);
                      const isExpanded = expandedSongId === song?.id;
                      return (
                        <Fragment key={`${track.trackNumber}-${song?.id ?? "unreg"}`}>
                          <tr className="border-b border-slate-300 last:border-b-0">
                            <td className="px-4 py-4 text-slate-700">{track.trackNumber}</td>
                            <td className="px-4 py-4 text-slate-900 min-w-48">
                              {isRegistered && song ? (
                                <div className="flex items-center gap-2">
                                  {(() => {
                                    const fullSong = getSongDetail(toBrandId<SongId>(song.id));
                                    const hasAudio = fullSong?.filePath;
                                    return (
                                      <button
                                        onClick={() => {
                                          if (fullSong) {
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-restricted-syntax
                                            play(fullSong as any);
                                          }
                                        }}
                                        disabled={!hasAudio}
                                        className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded transition text-emerald-600 hover:bg-emerald-100 disabled:text-slate-400 disabled:hover:bg-transparent"
                                        title={hasAudio ? "Play song" : "No audio file"}
                                        type="button"
                                      >
                                        ▶
                                      </button>
                                    );
                                  })()}
                                  <Link
                                    to={`/songs/${song.id}`}
                                    className="text-sky-500 hover:underline"
                                  >
                                    {song.title}
                                  </Link>
                                </div>
                              ) : (
                                <span className="text-slate-700">
                                  {track.referenceTitle ?? "—"}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-slate-600">
                              {(() => {
                                const artistIds = getTrackArtistIds(track);
                                if (artistIds.length === 0) return "—";
                                const artistMap = new Map(
                                  artists.map((artist) => [artist.id, artist.name]),
                                );
                                return (
                                  <div className="flex flex-wrap gap-1">
                                    {artistIds.map((artistId, index) => {
                                      const artistName = artistMap.get(artistId);
                                      const artistPath: string = `/artists/${String(artistId)}`;
                                      return (
                                        <Fragment key={artistId}>
                                          {index > 0 && <span className="text-slate-400">,</span>}
                                          <Link
                                            to={artistPath}
                                            className="text-sky-500 hover:underline"
                                          >
                                            {artistName || "Unknown"}
                                          </Link>
                                        </Fragment>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="px-4 py-4 text-slate-600 text-center">
                              {getTrackDuration(track)}
                            </td>
                            <td className="px-4 py-4">
                              {isRegistered && song ? (
                                <div className="flex flex-col gap-2">
                                  <div className="flex gap-2">
                                    <Button
                                      variant="secondary"
                                      onClick={() => toggleTree(song.id)}
                                      className="text-xs px-3 py-2"
                                    >
                                      {isExpanded ? "▼ hide tree" : "▶ show tree"}
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      onClick={() =>
                                        handleUnlinkSong(
                                          album.id,
                                          toBrandId<SongId>(song.id),
                                          track.trackNumber,
                                        )
                                      }
                                      disabled={unlinkingTrackNumber === track.trackNumber}
                                      className="text-xs px-3 py-2 bg-rose-100 text-rose-700 hover:bg-rose-200"
                                      title="Unlink song and restore original literal track info"
                                    >
                                      {unlinkingTrackNumber === track.trackNumber
                                        ? "Unlinking…"
                                        : "Unlink"}
                                    </Button>
                                  </div>
                                  {unlinkError && unlinkingTrackNumber === track.trackNumber && (
                                    <div className="text-xs text-rose-600">{unlinkError}</div>
                                  )}
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSelectExistingSong(track.trackNumber)}
                                  disabled={linkingTrackNumber === track.trackNumber}
                                  className="rounded bg-sky-100 px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-200 disabled:opacity-50"
                                  title="Link an existing song to this track"
                                >
                                  {linkingTrackNumber === track.trackNumber
                                    ? "Linking…"
                                    : "Link Song"}
                                </button>
                              )}
                            </td>
                          </tr>
                          {isExpanded ? (
                            <tr>
                              <td colSpan={5} className="bg-slate-100/90 px-4 py-4">
                                {treeLoading ? (
                                  <div className="text-slate-600">Loading tree…</div>
                                ) : treeError ? (
                                  <div className="text-rose-600">
                                    Error loading tree: {treeError}
                                  </div>
                                ) : tree ? (
                                  <FamilyTree masterId={tree.masterId} currentSongId={song.id} />
                                ) : null}
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {linkError && (
              <div className="mt-4 rounded-lg border border-rose-400 bg-rose-100/30 p-3 text-sm text-rose-700">
                {linkError}
              </div>
            )}
          </section>
        </div>
        <EditAlbumModal
          album={{
            id: album.id,
            title: album.title,
            trackList: album.trackList,
            tracks: album.tracks.map((t) => ({
              trackNumber: t.trackNumber,
              song: t.song ? { id: t.song.id, title: t.song.title } : null,
              referenceTitle: t.referenceTitle ?? null,
              isRegistered: t.isRegistered,
            })),
          }}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
        />

        {/* Song Select Modal */}
        {songSelectorModal.Component}
      </>
    );
  };

  return <section className="space-y-6">{getContent()}</section>;
};

export default AlbumDetailPage;
